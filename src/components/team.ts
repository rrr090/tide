import { h, safeUrl } from '../lib/dom';
import type { Team } from '../lib/teams';
import { tagList } from './ui';

const STATUS_LABEL: Record<string, string> = {
  building: 'Building',
  shipped: 'Shipped',
  recruiting: 'Looking for members',
};

const MAX_ORBIT = 6;

/** Logarithmic spiral as an SVG path, centered in a 200x200 box. */
function spiral(offsetDeg: number, turns = 2.2, from = 6, to = 92): string {
  const end = turns * Math.PI * 2;
  const b = Math.log(to / from) / end;
  const pts: string[] = [];
  for (let t = 0; t <= end; t += 0.12) {
    const r = from * Math.exp(b * t);
    const a = t + (offsetDeg * Math.PI) / 180;
    pts.push(`${(100 + r * Math.cos(a)).toFixed(1)} ${(100 + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join(' L')}`;
}

const arms = (offsets: number[], stroke: string, width: number, opacity: number, cls = ''): string =>
  `<svg ${cls ? `class="${cls}" ` : ''}viewBox="0 0 200 200" fill="none" stroke-linecap="round" aria-hidden="true">` +
  offsets
    .map((o) => `<path d="${spiral(o)}" stroke="${stroke}" stroke-width="${width}" opacity="${opacity}"/>`)
    .join('') +
  `</svg>`;

// Built once, reused by every card.
const ARMS_MAIN = arms([0, 120, 240], 'var(--sky)', 7, 0.28) + arms([0, 120, 240], '#fff', 2.5, 0.85, 'over');
const ARMS_BACK = arms([60, 240], 'var(--sky)', 2, 0.7);

const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

function layer(className: string, svg: string): HTMLElement {
  const el = h('span', { class: className, 'aria-hidden': 'true' });
  el.innerHTML = svg;
  return el;
}

/** The whirlpool: spinning spiral arms, a deep core and members orbiting it. */
function vortex(t: Team): HTMLElement {
  const shown = t.members.slice(0, MAX_ORBIT);
  const extra = t.members.length - shown.length;

  const items = shown.map((m) => ({ text: initials(m.name), title: `${m.name}, ${m.role}` }));
  if (extra > 0) items.push({ text: `+${extra}`, title: `${extra} more` });

  const orbit = h(
    'div',
    { class: 'vortex__orbit' },
    items.map((it, i) => {
      const angle = (360 / items.length) * i - 90;
      const avatar = h('span', { class: 'orbit__avatar', title: it.title }, it.text);
      const item = h('div', { class: 'orbit__item' }, avatar);
      item.style.setProperty('--a', `${angle}deg`);
      avatar.style.setProperty('--a', `${angle}deg`);
      return item;
    }),
  );

  return h(
    'div',
    { class: 'vortex', 'aria-hidden': 'true' },
    layer('vortex__arms vortex__arms--back', ARMS_BACK),
    layer('vortex__arms', ARMS_MAIN),
    h('span', { class: 'vortex__core' }, (t.title.trim()[0] ?? '?').toUpperCase()),
    orbit,
  );
}

export function teamCard(t: Team): HTMLElement {
  const links: Array<[string, string]> = [];
  const repo = safeUrl(t.repo_url);
  if (repo) links.push(['Repository', repo]);
  const demo = safeUrl(t.demo_url);
  if (demo) links.push(['Live demo', demo]);

  const status = t.status || 'building';

  return h(
    'li',
    { class: 'team', 'data-status': status },
    vortex(t),
    h(
      'div',
      { class: 'team__body' },
      h(
        'div',
        { class: 'team__head' },
        h('h3', { class: 'team__title' }, t.title),
        h('span', { class: 'badge team__status' }, STATUS_LABEL[status] ?? status),
      ),
      t.summary ? h('p', { class: 'team__summary' }, t.summary) : null,
      t.description ? h('p', { class: 'team__desc' }, t.description) : null,
      t.members.length
        ? h(
            'ul',
            { class: 'team__members', role: 'list', 'aria-label': `${t.title} members` },
            t.members.map((m) =>
              h('li', null, h('strong', null, m.name), m.role ? h('span', null, m.role) : null),
            ),
          )
        : null,
      tagList(t.tags),
      links.length
        ? h(
            'div',
            { class: 'team__links' },
            links.map(([label, href]) =>
              h(
                'a',
                { class: 'btn btn--ghost btn--small', href, target: '_blank', rel: 'noopener noreferrer' },
                label,
              ),
            ),
          )
        : null,
    ),
  );
}