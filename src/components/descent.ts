/**
 * Hero background: a loss landscape drawn as contour lines.
 *
 * Click or tap anywhere to drop a starting point. Three optimizers (SGD,
 * Momentum and Adam) start from it and roll downhill on the same surface.
 * Their paths differ: SGD walks steadily and slowly, Momentum overshoots and
 * swings back, Adam cuts straight across. Where they end up is mostly decided
 * by the starting point, so some starts reach the global minimum and others
 * settle in a local one. Each run reports its result.
 */

interface Well {
  x: number; // fraction of width
  y: number; // fraction of height
  depth: number;
  spread: number; // fraction of the larger canvas dimension
}

// WELLS[0] is the global minimum. The others are deep local minima.
const WELLS: Well[] = [
  { x: 0.74, y: 0.46, depth: 1.0, spread: 0.17 },
  { x: 0.92, y: 0.82, depth: 0.55, spread: 0.1 },
  { x: 0.56, y: 0.86, depth: 0.5, spread: 0.11 },
  { x: 0.9, y: 0.16, depth: 0.62, spread: 0.1 },
  { x: 0.4, y: 0.2, depth: 0.38, spread: 0.1 },
];

interface Optimizer {
  kind: 'sgd' | 'momentum' | 'adam';
  label: string;
  /** "r,g,b" so alpha can be applied per draw call. */
  rgb: string;
}

const OPTIMIZERS: Optimizer[] = [
  { kind: 'sgd', label: 'SGD', rgb: '255,255,255' },
  { kind: 'momentum', label: 'Momentum', rgb: '97,183,222' },
  { kind: 'adam', label: 'Adam', rgb: '179,157,240' },
];

// Surface
const LEVELS = 14;
const CELL = 10;
const RIPPLE = 0.045;
/** A run counts as global when it ends near the lowest point, in pixels or in loss. */
const GLOBAL_RADIUS = 70;
const GLOBAL_TOLERANCE = 0.04;

// Simulation. Steps run on a fixed clock so speed does not depend on refresh rate.
const STEP_MS = 1000 / 120;
const MAX_STEPS_PER_FRAME = 6;
const MAX_RUNS = 4;
const MAX_STEP_PX = 4;
const SGD_LR = 900;
const MOMENTUM_LR = 130;
const MOMENTUM_BETA = 0.9;
const ADAM_ALPHA = 1.7;
const ADAM_DECAY = 0.9992;
const SETTLE_SPEED = 0.05;
const SETTLE_STEPS = 50;
const GIVE_UP_STEPS = 1300;
const PATH_EVERY = 3;
const TAIL_POINTS = 26;
const RING_MS = 1000;

interface Ball {
  spec: Optimizer;
  x: number;
  y: number;
  vx: number;
  vy: number;
  m1x: number;
  m1y: number;
  m2x: number;
  m2y: number;
  alpha: number;
  t: number;
  loss: number;
  /** Flat list: x0, y0, x1, y1, ... */
  path: number[];
  calm: number;
  settled: boolean;
  outcome: 'global' | 'local' | null;
}

interface Ring {
  x: number;
  y: number;
  born: number;
  rgb: string;
  big: boolean;
}

export function mountDescent(host: HTMLElement, readout: HTMLElement): () => void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const bg = document.createElement('canvas');
  const fg = document.createElement('canvas');
  for (const c of [bg, fg]) {
    c.className = 'hero__canvas';
    c.setAttribute('aria-hidden', 'true');
  }
  host.prepend(bg, fg);
  const bgCtx = bg.getContext('2d')!;
  const fgCtx = fg.getContext('2d')!;

  // Readout: one line per optimizer plus a hint that appears when everything has settled.
  const hint = document.createElement('span');
  hint.className = 'readout__hint';
  hint.textContent = 'Click anywhere to drop a new start';
  const items = OPTIMIZERS.map((spec) => {
    const el = document.createElement('span');
    el.className = 'readout__item';
    const dot = document.createElement('i');
    dot.className = 'readout__dot';
    dot.style.setProperty('--dot', `rgb(${spec.rgb})`);
    const text = document.createElement('span');
    el.append(dot, text);
    el.hidden = true;
    return { el, text, shown: '' };
  });
  readout.replaceChildren(hint, ...items.map((i) => i.el));
  hint.hidden = true;

  let w = 0;
  let h = 0;
  let scale = 1;
  let fMin = 0;
  let minX = 0;
  let minY = 0;
  let runs: Ball[][] = [];
  let rings: Ring[] = [];
  let hover: { x: number; y: number } | null = null;
  let raf = 0;
  let last = 0;
  let acc = 0;
  let visible = true;
  let lastW = 0;
  let lastH = 0;
  const timers: number[] = [];

  // Well geometry in pixels, rebuilt on layout.
  const n = WELLS.length;
  const wx = new Float64Array(n);
  const wy = new Float64Array(n);
  const wDepth = new Float64Array(n);
  const wSigma = new Float64Array(n);
  let kx = 0;
  let ky = 0;

  // Scratch gradient written by field().
  let gx = 0;
  let gy = 0;

  /** Loss at a pixel position. Also stores the analytic gradient in gx, gy. */
  function field(px: number, py: number): number {
    let v = 0;
    let dvx = 0;
    let dvy = 0;
    for (let i = 0; i < n; i++) {
      const dx = px - wx[i];
      const dy = py - wy[i];
      const s2 = wSigma[i] * wSigma[i];
      const e = wDepth[i] * Math.exp(-(dx * dx + dy * dy) / (2 * s2));
      v -= e;
      dvx += (e * dx) / s2;
      dvy += (e * dy) / s2;
    }
    // Gentle ripples create shallow pits for points to get stuck in.
    const a = px * kx;
    const b = py * ky;
    v += RIPPLE * Math.sin(a) * Math.cos(b);
    dvx += RIPPLE * kx * Math.cos(a) * Math.cos(b);
    dvy -= RIPPLE * ky * Math.sin(a) * Math.sin(b);
    gx = dvx;
    gy = dvy;
    return v;
  }

  function buildField(): void {
    const s = Math.max(w, h * 1.2);
    WELLS.forEach((well, i) => {
      wx[i] = well.x * w;
      wy[i] = well.y * h;
      wDepth[i] = well.depth;
      wSigma[i] = well.spread * s;
    });
    kx = 15 / s;
    ky = 12 / s;
  }

  function drawContours(): void {
    const cols = Math.ceil(w / CELL) + 1;
    const rows = Math.ceil(h / CELL) + 1;
    const grid = new Float32Array(cols * rows);
    let fMax = -Infinity;
    fMin = Infinity;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const v = field(i * CELL, j * CELL);
        grid[j * cols + i] = v;
        if (v < fMin) {
          fMin = v;
          minX = i * CELL;
          minY = j * CELL;
        }
        if (v > fMax) fMax = v;
      }
    }

    bgCtx.setTransform(scale, 0, 0, scale, 0, 0);
    bgCtx.clearRect(0, 0, w, h);
    bgCtx.lineCap = 'round';

    // A faint glow under the global minimum, so the destination is felt before it is found.
    const glow = bgCtx.createRadialGradient(wx[0], wy[0], 0, wx[0], wy[0], wSigma[0] * 1.3);
    glow.addColorStop(0, 'rgba(97,183,222,0.16)');
    glow.addColorStop(1, 'rgba(97,183,222,0)');
    bgCtx.fillStyle = glow;
    bgCtx.fillRect(0, 0, w, h);

    for (let k = 1; k <= LEVELS; k++) {
      const level = fMin + ((fMax - fMin) * k) / (LEVELS + 1);
      const major = k % 4 === 0;
      bgCtx.strokeStyle = major ? 'rgba(97,183,222,0.34)' : 'rgba(97,183,222,0.16)';
      bgCtx.lineWidth = major ? 1.2 : 1;
      bgCtx.beginPath();
      for (let j = 0; j < rows - 1; j++) {
        for (let i = 0; i < cols - 1; i++) {
          const a = grid[j * cols + i];
          const b = grid[j * cols + i + 1];
          const c = grid[(j + 1) * cols + i + 1];
          const d = grid[(j + 1) * cols + i];
          const idx =
            (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
          if (idx === 0 || idx === 15) continue;

          const x0 = i * CELL;
          const y0 = j * CELL;
          const t = (p: number, q: number): number => (level - p) / (q - p);
          const top: [number, number] = [x0 + t(a, b) * CELL, y0];
          const right: [number, number] = [x0 + CELL, y0 + t(b, c) * CELL];
          const bottom: [number, number] = [x0 + t(d, c) * CELL, y0 + CELL];
          const left: [number, number] = [x0, y0 + t(a, d) * CELL];

          const seg = (p: [number, number], q: [number, number]): void => {
            bgCtx.moveTo(p[0], p[1]);
            bgCtx.lineTo(q[0], q[1]);
          };
          switch (idx) {
            case 1:
            case 14:
              seg(left, bottom);
              break;
            case 2:
            case 13:
              seg(bottom, right);
              break;
            case 3:
            case 12:
              seg(left, right);
              break;
            case 4:
            case 11:
              seg(top, right);
              break;
            case 5:
              seg(top, left);
              seg(bottom, right);
              break;
            case 6:
            case 9:
              seg(top, bottom);
              break;
            case 7:
            case 8:
              seg(top, left);
              break;
            case 10:
              seg(top, right);
              seg(left, bottom);
              break;
          }
        }
      }
      bgCtx.stroke();
    }
  }

  function makeBall(spec: Optimizer, x: number, y: number): Ball {
    return {
      spec,
      x,
      y,
      vx: 0,
      vy: 0,
      m1x: 0,
      m1y: 0,
      m2x: 0,
      m2y: 0,
      alpha: ADAM_ALPHA,
      t: 0,
      loss: field(x, y),
      path: [x, y],
      calm: 0,
      settled: false,
      outcome: null,
    };
  }

  function settle(ball: Ball, animate: boolean): void {
    ball.settled = true;
    ball.path.push(ball.x, ball.y);
    // Overlapping wells shift the true minimum away from any well's centre, so compare
    // with the lowest point of the grid. A slow run can stop just short of it.
    ball.loss = field(ball.x, ball.y);
    const global =
      Math.hypot(ball.x - minX, ball.y - minY) < GLOBAL_RADIUS ||
      ball.loss - fMin < GLOBAL_TOLERANCE;
    ball.outcome = global ? 'global' : 'local';
    if (animate) {
      rings.push({
        x: ball.x,
        y: ball.y,
        born: performance.now(),
        rgb: ball.spec.rgb,
        big: global,
      });
    }
  }

  function stepBall(ball: Ball, animate: boolean): void {
    ball.loss = field(ball.x, ball.y);
    ball.t += 1;
    let dx = 0;
    let dy = 0;

    switch (ball.spec.kind) {
      case 'sgd':
        dx = -SGD_LR * gx;
        dy = -SGD_LR * gy;
        break;
      case 'momentum':
        ball.vx = MOMENTUM_BETA * ball.vx - MOMENTUM_LR * gx;
        ball.vy = MOMENTUM_BETA * ball.vy - MOMENTUM_LR * gy;
        dx = ball.vx;
        dy = ball.vy;
        break;
      case 'adam': {
        ball.m1x = 0.9 * ball.m1x + 0.1 * gx;
        ball.m1y = 0.9 * ball.m1y + 0.1 * gy;
        ball.m2x = 0.999 * ball.m2x + 0.001 * gx * gx;
        ball.m2y = 0.999 * ball.m2y + 0.001 * gy * gy;
        const c1 = 1 - Math.pow(0.9, ball.t);
        const c2 = 1 - Math.pow(0.999, ball.t);
        ball.alpha *= ADAM_DECAY;
        dx = (-ball.alpha * (ball.m1x / c1)) / (Math.sqrt(ball.m2x / c2) + 1e-12);
        dy = (-ball.alpha * (ball.m1y / c1)) / (Math.sqrt(ball.m2y / c2) + 1e-12);
        break;
      }
    }

    const len = Math.hypot(dx, dy);
    if (len > MAX_STEP_PX) {
      dx = (dx / len) * MAX_STEP_PX;
      dy = (dy / len) * MAX_STEP_PX;
    }
    ball.x = Math.min(w + 40, Math.max(-40, ball.x + dx));
    ball.y = Math.min(h + 40, Math.max(-40, ball.y + dy));

    if (ball.t % PATH_EVERY === 0) ball.path.push(ball.x, ball.y);
    ball.calm = Math.min(len, MAX_STEP_PX) < SETTLE_SPEED ? ball.calm + 1 : 0;
    if (ball.calm >= SETTLE_STEPS || ball.t >= GIVE_UP_STEPS) settle(ball, animate);
  }

  const rgba = (rgb: string, a: number): string => `rgba(${rgb},${a.toFixed(3)})`;

  function drawHover(): void {
    if (!hover) return;
    field(hover.x, hover.y);
    const len = Math.hypot(gx, gy);
    if (len === 0) return;
    const ux = -gx / len;
    const uy = -gy / len;
    const { x, y } = hover;
    const tipX = x + ux * 34;
    const tipY = y + uy * 34;
    fgCtx.strokeStyle = 'rgba(255,255,255,0.55)';
    fgCtx.lineWidth = 1.25;
    fgCtx.beginPath();
    fgCtx.arc(x, y, 4.5, 0, Math.PI * 2);
    fgCtx.moveTo(x + ux * 4.5, y + uy * 4.5);
    fgCtx.lineTo(tipX, tipY);
    fgCtx.moveTo(tipX - ux * 7 - uy * 4, tipY - uy * 7 + ux * 4);
    fgCtx.lineTo(tipX, tipY);
    fgCtx.lineTo(tipX - ux * 7 + uy * 4, tipY - uy * 7 - ux * 4);
    fgCtx.stroke();
  }

  function draw(now: number): void {
    fgCtx.setTransform(scale, 0, 0, scale, 0, 0);
    fgCtx.clearRect(0, 0, w, h);
    fgCtx.lineJoin = 'round';
    fgCtx.lineCap = 'round';

    runs.forEach((run, ri) => {
      // Older runs fade back so the newest one reads first.
      const age = runs.length - 1 - ri;
      const fade = 1 - age * 0.18;

      for (const ball of run) {
        const p = ball.path;
        const points = p.length / 2;
        if (points > 1) {
          // Full history, faint.
          fgCtx.strokeStyle = rgba(ball.spec.rgb, 0.17 * fade);
          fgCtx.lineWidth = 1.25;
          fgCtx.beginPath();
          fgCtx.moveTo(p[0], p[1]);
          for (let i = 1; i < points; i++) fgCtx.lineTo(p[i * 2], p[i * 2 + 1]);
          fgCtx.stroke();

          // Recent tail, brighter toward the head.
          const from = Math.max(1, points - TAIL_POINTS);
          for (let i = from; i < points; i++) {
            const k = (i - from + 1) / (points - from);
            fgCtx.strokeStyle = rgba(ball.spec.rgb, 0.7 * k * fade);
            fgCtx.lineWidth = 1 + k;
            fgCtx.beginPath();
            fgCtx.moveTo(p[(i - 1) * 2], p[(i - 1) * 2 + 1]);
            fgCtx.lineTo(p[i * 2], p[i * 2 + 1]);
            fgCtx.stroke();
          }
        }

        fgCtx.fillStyle = rgba(ball.spec.rgb, 0.2 * fade);
        fgCtx.beginPath();
        fgCtx.arc(ball.x, ball.y, 9, 0, Math.PI * 2);
        fgCtx.fill();
        fgCtx.fillStyle = rgba(ball.spec.rgb, fade);
        fgCtx.beginPath();
        fgCtx.arc(ball.x, ball.y, 3.2, 0, Math.PI * 2);
        fgCtx.fill();

        if (ball.settled) {
          fgCtx.strokeStyle = rgba(ball.spec.rgb, 0.55 * fade);
          fgCtx.lineWidth = 1.25;
          fgCtx.beginPath();
          fgCtx.arc(ball.x, ball.y, 7, 0, Math.PI * 2);
          fgCtx.stroke();
        }
      }
    });

    rings = rings.filter((r) => now - r.born < RING_MS);
    for (const r of rings) {
      const p = (now - r.born) / RING_MS;
      const eased = 1 - Math.pow(1 - p, 3);
      fgCtx.strokeStyle = rgba(r.rgb, 0.75 * (1 - p));
      fgCtx.lineWidth = r.big ? 2 : 1.5;
      fgCtx.beginPath();
      fgCtx.arc(r.x, r.y, 8 + (r.big ? 52 : 28) * eased, 0, Math.PI * 2);
      fgCtx.stroke();
    }

    drawHover();
  }

  const anyActive = (): boolean => runs.some((run) => run.some((b) => !b.settled));

  function updateReadout(): void {
    const run = runs[runs.length - 1];
    const active = anyActive();
    hint.hidden = active || runs.length === 0;
    items.forEach((item, i) => {
      const ball = run?.[i];
      if (!ball) {
        item.el.hidden = true;
        return;
      }
      item.el.hidden = false;
      const value = Math.max(0, ball.loss - fMin).toFixed(3);
      const text = `${ball.spec.label} ${value}${ball.outcome ? ` ${ball.outcome}` : ''}`;
      if (text !== item.shown) {
        item.shown = text;
        item.text.textContent = text;
      }
    });
  }

  function frame(now: number): void {
    raf = 0;
    if (!last) last = now;
    acc += Math.min(now - last, 50);
    last = now;

    let steps = 0;
    while (acc >= STEP_MS && steps < MAX_STEPS_PER_FRAME) {
      acc -= STEP_MS;
      steps += 1;
      for (const run of runs) for (const ball of run) if (!ball.settled) stepBall(ball, true);
    }
    if (acc > STEP_MS) acc = 0;

    draw(now);
    updateReadout();

    if ((anyActive() || rings.length > 0) && visible && !document.hidden) {
      raf = requestAnimationFrame(frame);
    } else {
      last = 0;
      acc = 0;
    }
  }

  const kick = (): void => {
    if (!raf) raf = requestAnimationFrame(frame);
  };

  function drop(px: number, py: number): void {
    const x = Math.min(w, Math.max(0, px));
    const y = Math.min(h, Math.max(0, py));
    const run = OPTIMIZERS.map((spec) => makeBall(spec, x, y));
    runs.push(run);
    if (runs.length > MAX_RUNS) runs.shift();
    if (reduced) {
      for (const ball of run) while (!ball.settled) stepBall(ball, false);
    }
    kick();
  }

  // The first run arrives, the second gets stuck on the left, the third shows SGD lagging behind.
  const SEEDS: [number, number][] = [
    [0.5, 0.88],
    [0.1, 0.32],
    [0.3, 0.9],
  ];

  function seed(): void {
    SEEDS.forEach(([fx, fy], i) => {
      if (reduced) drop(fx * w, fy * h);
      else timers.push(window.setTimeout(() => drop(fx * w, fy * h), 450 + i * 1100));
    });
  }

  function layout(): void {
    const rect = host.getBoundingClientRect();
    const nextW = Math.round(rect.width);
    const nextH = Math.round(rect.height);
    if (nextW === 0 || nextH === 0) return;
    // Mobile browsers resize the viewport while scrolling; ignore small height changes.
    if (lastW === nextW && Math.abs(lastH - nextH) < 80) return;
    lastW = nextW;
    lastH = nextH;
    w = nextW;
    h = nextH;
    scale = Math.min(window.devicePixelRatio || 1, 2);
    for (const c of [bg, fg]) {
      c.width = Math.round(w * scale);
      c.height = Math.round(h * scale);
    }
    timers.splice(0).forEach((t) => window.clearTimeout(t));
    runs = [];
    rings = [];
    hover = null;
    buildField();
    drawContours();
    updateReadout();
    draw(performance.now());
    seed();
  }

  const interactive = (target: EventTarget | null): boolean =>
    target instanceof Element && target.closest('a, button, input, textarea, select') !== null;

  const dropAt = (event: PointerEvent): void => {
    const rect = host.getBoundingClientRect();
    drop(event.clientX - rect.left, event.clientY - rect.top);
  };

  // Mouse drops on press. Touch drops on a short tap, so scrolling the page never drops points.
  let press: { x: number; y: number; at: number } | null = null;

  const onDown = (event: PointerEvent): void => {
    if (event.button !== 0 || interactive(event.target)) return;
    if (event.pointerType === 'mouse') dropAt(event);
    else press = { x: event.clientX, y: event.clientY, at: performance.now() };
  };
  const onUp = (event: PointerEvent): void => {
    const start = press;
    press = null;
    if (!start || interactive(event.target)) return;
    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (moved < 10 && performance.now() - start.at < 600) dropAt(event);
  };
  const onCancel = (): void => {
    press = null;
  };
  const onMove = (event: PointerEvent): void => {
    if (event.pointerType !== 'mouse') return;
    if (interactive(event.target)) {
      if (hover) {
        hover = null;
        kick();
      }
      return;
    }
    const rect = host.getBoundingClientRect();
    hover = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    kick();
  };
  const onLeave = (): void => {
    if (!hover) return;
    hover = null;
    kick();
  };

  const resizeObserver = new ResizeObserver(layout);
  resizeObserver.observe(host);
  const visibility = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) kick();
  });
  visibility.observe(host);
  host.addEventListener('pointerdown', onDown);
  host.addEventListener('pointerup', onUp);
  host.addEventListener('pointercancel', onCancel);
  host.addEventListener('pointermove', onMove);
  host.addEventListener('pointerleave', onLeave);
  const onVisibilityChange = (): void => {
    if (!document.hidden) kick();
  };
  document.addEventListener('visibilitychange', onVisibilityChange);
  layout();

  return () => {
    cancelAnimationFrame(raf);
    timers.forEach((t) => window.clearTimeout(t));
    resizeObserver.disconnect();
    visibility.disconnect();
    host.removeEventListener('pointerdown', onDown);
    host.removeEventListener('pointerup', onUp);
    host.removeEventListener('pointercancel', onCancel);
    host.removeEventListener('pointermove', onMove);
    host.removeEventListener('pointerleave', onLeave);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    readout.replaceChildren();
    bg.remove();
    fg.remove();
  };
}