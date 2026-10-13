import { animate } from 'motion';

/**
 * Water-wave page transitions for the hash router.
 *
 * Click on any in-app link (#/events, #/workshops, ...): three layers of water
 * (sky, blue, navy) sweep across the screen with a wavy edge and cover the page.
 * While the screen is covered the router swaps the page, then the wave
 * continues and uncovers the new one. Going "backwards" in the nav order
 * sweeps the other way. Browser back/forward only plays a short fade.
 *
 * Usage: call once, anywhere:
 *   initPageTransitions();
 * Colors come from your CSS variables (--sky, --blue, --navy).
 */

const ORDER = ['/', '/events', '/workshops', '/teams'];
const COVER = 0.5; // s, wave comes in
const REVEAL = 0.6; // s, wave leaves
const EASE = [0.5, 0, 0.2, 1] as const; // slow swell, fast crest

// Bottom layer first. Delay makes the layers trail each other like a real wave.
const LAYERS = [
  { color: 'var(--navy)', delay: 0.14, flipY: false },
  { color: 'var(--blue)', delay: 0.07, flipY: true },
  { color: 'var(--sky)', delay: 0, flipY: false },
] as const;

// A band 200 units wide, wavy on both edges (so the wave has a crest going in
// AND a wavy trailing edge going out). Q/T make the edge bulge left and right.
const BAND =
  'M30 0 H170 Q195 12.5 170 25 T170 50 T170 75 T170 100 H30 Q5 87.5 30 75 T30 50 T30 25 T30 0Z';

const pathOf = (hash: string): string => hash.replace(/^#/, '') || '/';

function rank(path: string): number {
  const i = ORDER.findIndex((r) => (r === '/' ? path === '/' : path.startsWith(r)));
  return i === -1 ? ORDER.length : i;
}

/** 1 = wave moves left to right (forward), -1 = right to left (back). */
const directionBetween = (from: string, to: string): 1 | -1 => (rank(to) >= rank(from) ? 1 : -1);

interface Layer {
  box: HTMLElement;
  svg: SVGElement;
}

function buildOverlay(): { root: HTMLElement; layers: Layer[] } {
  const root = document.createElement('div');
  root.setAttribute('aria-hidden', 'true');
  Object.assign(root.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '200',
    overflow: 'hidden',
    pointerEvents: 'none',
    visibility: 'hidden',
  });

  const layers = LAYERS.map((cfg): Layer => {
    const box = document.createElement('div');
    Object.assign(box.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '200vw',
      height: '100%',
      willChange: 'transform',
    });
    box.innerHTML =
      `<svg viewBox="0 0 200 100" preserveAspectRatio="none" width="100%" height="100%" ` +
      `style="display:block"><path d="${BAND}" fill="${cfg.color}"/></svg>`;
    root.append(box);
    return { box, svg: box.firstElementChild as SVGElement };
  });

  document.body.append(root);
  return { root, layers };
}

let installed = false;

export function initPageTransitions(selectorArg?: string | null | Element): void {
  if (installed) return;
  installed = true;

  const selector = typeof selectorArg === 'string' ? selectorArg : '.main, main, #main';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  let overlay: ReturnType<typeof buildOverlay> | null = null;
  let prev = pathOf(location.hash);
  let pending: 1 | -1 | null = null;
  let guard = 0;

  const vw = (): number => window.innerWidth;
  // Layer positions are written for dir = 1. For dir = -1 the whole picture is
  // mirrored around the screen center: left' = -vw - left (and the svg is flipped).
  const place = (dir: 1 | -1, left: number): number => (dir === 1 ? left : -vw() - left);

  const run = (dir: 1 | -1, from: number, to: number, duration: number): Promise<unknown[]> => {
    overlay ??= buildOverlay();
    overlay.root.style.visibility = 'visible';
    return Promise.all(
      overlay.layers.map((layer, i) => {
        layer.svg.style.transform = `scaleX(${dir}) scaleY(${LAYERS[i].flipY ? -1 : 1})`;
        return animate(
          layer.box,
          { x: [place(dir, from * vw()), place(dir, to * vw())] },
          { duration, delay: LAYERS[i].delay, ease: EASE },
        ).finished;
      }),
    );
  };

  const cover = (dir: 1 | -1): Promise<unknown[]> => run(dir, -2, -0.5, COVER);

  const reveal = (dir: 1 | -1): void => {
    // wait a frame so the router has rendered the new page under the water
    requestAnimationFrame(() => {
      run(dir, -0.5, 1, REVEAL).then(() => {
        if (overlay) overlay.root.style.visibility = 'hidden';
      });
    });
  };

  window.addEventListener('hashchange', () => {
    window.clearTimeout(guard);
    const current = pathOf(location.hash);
    if (pending !== null) {
      reveal(pending);
    } else if (!reduce.matches) {
      // browser back/forward: no wave, just a soft fade
      const main = document.querySelector<HTMLElement>(selector);
      if (main) requestAnimationFrame(() => animate(main, { opacity: [0, 1] }, { duration: 0.3 }));
    }
    prev = current;
    pending = null;
  });

  document.addEventListener('click', async (event) => {
    if (reduce.matches) return;
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#/"]');
    if (!link || link.target === '_blank' || pending !== null) return;

    const next = link.getAttribute('href')!;
    const from = pathOf(location.hash);
    if (from === pathOf(next)) return;

    event.preventDefault();
    const dir = directionBetween(from, pathOf(next));
    pending = dir; // also blocks double clicks while the wave is moving

    await cover(dir);

    // safety net: if the router never reports a change, uncover the page anyway
    guard = window.setTimeout(() => {
      pending = null;
      reveal(dir);
    }, 1000);
    location.hash = next;
  });
}