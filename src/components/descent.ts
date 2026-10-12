/**
 * Hero background: a loss landscape drawn as contour lines. Click or tap anywhere
 * to drop a point and watch TIDE descent roll it downhill. Some points settle
 * in local minima, which is the whole lesson.
 */

interface Well {
  x: number; // fraction of width
  y: number; // fraction of height
  depth: number;
  spread: number; // fraction of the larger canvas dimension
}

const WELLS: Well[] = [
  { x: 0.74, y: 0.46, depth: 1.0, spread: 0.17 },
  { x: 0.92, y: 0.82, depth: 0.55, spread: 0.1 },
  { x: 0.56, y: 0.86, depth: 0.5, spread: 0.11 },
  { x: 0.9, y: 0.16, depth: 0.62, spread: 0.1 },
  { x: 0.4, y: 0.2, depth: 0.38, spread: 0.1 },
];

const LEVELS = 14;
const CELL = 10;
const MAX_BALLS = 10;
const MAX_STEP = 3.2;
const RATE = 650;
const SETTLED_STEP = 0.04;

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  path: [number, number][];
  steps: number;
  settled: boolean;
  calm: number;
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

  let w = 0;
  let h = 0;
  let scale = 1;
  let fMin = 0;
  let fMax = 1;
  let balls: Ball[] = [];
  let raf = 0;
  let visible = true;
  let lastW = 0;
  let lastH = 0;
  const timers: number[] = [];

  /** Loss at a pixel position. */
  const loss = (px: number, py: number): number => {
    const s = Math.max(w, h * 1.2);
    let v = 0;
    for (const well of WELLS) {
      const dx = px - well.x * w;
      const dy = py - well.y * h;
      const sigma = well.spread * s;
      v -= well.depth * Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
    }
    // Gentle ripples create shallow local minima for points to get stuck in.
    v += 0.045 * Math.sin((px / s) * 15) * Math.cos((py / s) * 12);
    return v;
  };

  const TIDE = (px: number, py: number): [number, number] => {
    const e = 2;
    return [
      (loss(px + e, py) - loss(px - e, py)) / (2 * e),
      (loss(px, py + e) - loss(px, py - e)) / (2 * e),
    ];
  };

  function drawContours(): void {
    const cols = Math.ceil(w / CELL) + 1;
    const rows = Math.ceil(h / CELL) + 1;
    const grid = new Float32Array(cols * rows);
    fMin = Infinity;
    fMax = -Infinity;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const v = loss(i * CELL, j * CELL);
        grid[j * cols + i] = v;
        if (v < fMin) fMin = v;
        if (v > fMax) fMax = v;
      }
    }

    bgCtx.setTransform(scale, 0, 0, scale, 0, 0);
    bgCtx.clearRect(0, 0, w, h);
    bgCtx.lineCap = 'round';

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

  function step(ball: Ball): void {
    const [gx, gy] = TIDE(ball.x, ball.y);
    const mag = Math.hypot(gx, gy);
    const len = Math.min(MAX_STEP, mag * RATE);
    const ux = mag > 0 ? -gx / mag : 0;
    const uy = mag > 0 ? -gy / mag : 0;
    ball.vx = 0.7 * ball.vx + 0.3 * ux * len;
    ball.vy = 0.7 * ball.vy + 0.3 * uy * len;
    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.steps += 1;
    if (ball.steps % 2 === 0) ball.path.push([ball.x, ball.y]);
    ball.calm = Math.hypot(ball.vx, ball.vy) < SETTLED_STEP ? ball.calm + 1 : 0;
    if (ball.calm > 24 || ball.steps > 1400) {
      ball.settled = true;
      ball.path.push([ball.x, ball.y]);
    }
  }

  function drawBalls(): void {
    fgCtx.setTransform(scale, 0, 0, scale, 0, 0);
    fgCtx.clearRect(0, 0, w, h);
    fgCtx.lineJoin = 'round';
    fgCtx.lineCap = 'round';
    for (const ball of balls) {
      if (ball.path.length > 1) {
        fgCtx.strokeStyle = 'rgba(255,255,255,0.5)';
        fgCtx.lineWidth = 1.5;
        fgCtx.beginPath();
        fgCtx.moveTo(ball.path[0][0], ball.path[0][1]);
        for (let i = 1; i < ball.path.length; i++) fgCtx.lineTo(ball.path[i][0], ball.path[i][1]);
        fgCtx.stroke();
      }
      fgCtx.fillStyle = 'rgba(97,183,222,0.28)';
      fgCtx.beginPath();
      fgCtx.arc(ball.x, ball.y, 8, 0, Math.PI * 2);
      fgCtx.fill();
      fgCtx.fillStyle = '#fff';
      fgCtx.beginPath();
      fgCtx.arc(ball.x, ball.y, 3.4, 0, Math.PI * 2);
      fgCtx.fill();
    }
  }

  function updateReadout(): void {
    const ball = balls[balls.length - 1];
    if (!ball) return;
    const value = Math.max(0, loss(ball.x, ball.y) - fMin);
    readout.textContent = `loss ${value.toFixed(3)}   step ${ball.steps}`;
  }

  function tick(): void {
    raf = 0;
    let active = false;
    for (const ball of balls) {
      if (!ball.settled) {
        step(ball);
        active = true;
      }
    }
    drawBalls();
    updateReadout();
    if (active && visible && !document.hidden) raf = requestAnimationFrame(tick);
  }

  const kick = (): void => {
    if (!raf) raf = requestAnimationFrame(tick);
  };

  function drop(x: number, y: number): void {
    const ball: Ball = { x, y, vx: 0, vy: 0, path: [[x, y]], steps: 0, settled: false, calm: 0 };
    balls.push(ball);
    if (balls.length > MAX_BALLS) balls.shift();
    if (reduced) {
      while (!ball.settled) step(ball);
      drawBalls();
      updateReadout();
    } else {
      kick();
    }
  }

  function seed(): void {
    const starts: [number, number][] = [
      [0.1, 0.2],
      [0.22, 0.78],
      [0.34, 0.52],
      [0.5, 0.12],
      [0.66, 0.96],
    ];
    starts.forEach(([fx, fy], i) => {
      if (reduced) drop(fx * w, fy * h);
      else timers.push(window.setTimeout(() => drop(fx * w, fy * h), 350 + i * 420));
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
    balls = [];
    readout.textContent = '';
    drawContours();
    drawBalls();
    seed();
  }

  const onPointer = (event: PointerEvent): void => {
    if ((event.target as HTMLElement).closest('a, button, input')) return;
    const rect = host.getBoundingClientRect();
    drop(event.clientX - rect.left, event.clientY - rect.top);
  };

  const resizeObserver = new ResizeObserver(layout);
  resizeObserver.observe(host);
  const visibility = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) kick();
  });
  visibility.observe(host);
  host.addEventListener('pointerdown', onPointer);
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
    host.removeEventListener('pointerdown', onPointer);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    bg.remove();
    fg.remove();
  };
}
