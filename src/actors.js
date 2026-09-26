// Motion helpers. Everything is a pure function of time t (seconds), so nothing
// needs per-frame state and every room keeps moving even when off screen.

import { hash } from './art.js';

// Walk a route of waypoints. Each point is [x, y] or [x, y, pauseSeconds].
// Returns (t) => { x, y, dir, back, moving, phase }.
// o: { speed (units/s), offset (s), loop: true closes the route back to the start }
export function route(points, o = {}) {
  const speed = o.speed || 1.2;
  const loop = o.loop !== false;
  const pts = loop ? [...points, points[0]] : points;
  const segs = [];
  let T = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const pause = points[i][2] || 0;
    if (pause) {
      segs.push({ t0: T, dur: pause, ax, ay, bx: ax, by: ay, still: true, from: segs[segs.length - 1] });
      T += pause;
    }
    const len = Math.hypot(bx - ax, by - ay);
    const dur = len / speed;
    segs.push({ t0: T, dur, ax, ay, bx, by });
    T += dur;
  }
  if (!loop) {
    // ping-pong: walk back along the same route
    const back = segs.filter((s) => !s.still).slice().reverse();
    for (const s of back) {
      segs.push({ t0: T, dur: s.dur, ax: s.bx, ay: s.by, bx: s.ax, by: s.ay });
      T += s.dur;
    }
  }
  let last = segs[0];
  return (t) => {
    const tt = (((t + (o.offset || 0)) % T) + T) % T;
    let s = last;
    if (!(tt >= s.t0 && tt < s.t0 + s.dur)) {
      s = segs.find((g) => tt >= g.t0 && tt < g.t0 + g.dur) || segs[segs.length - 1];
      last = s;
    }
    const k = s.dur ? (tt - s.t0) / s.dur : 0;
    const x = s.ax + (s.bx - s.ax) * k;
    const y = s.ay + (s.by - s.ay) * k;
    const ref = s.still ? segs[(segs.indexOf(s) + segs.length - 1) % segs.length] : s;
    const dX = (ref.bx - ref.ax) - (ref.by - ref.ay); // screen horizontal
    const dY = (ref.bx - ref.ax) + (ref.by - ref.ay); // screen vertical
    return {
      x,
      y,
      dir: dX >= 0 ? 'r' : 'l',
      back: dY < -0.01,
      moving: !s.still,
      phase: tt * (speed * 5),
    };
  };
}

// Point on a loop around an ellipse centred at (cx, cy).
export function orbit(cx, cy, rx, ry, period, offset = 0, clockwise = false) {
  return (t) => {
    const a = ((t + offset) / period) * Math.PI * 2 * (clockwise ? -1 : 1);
    const x = cx + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    const vx = -Math.sin(a) * rx * (clockwise ? -1 : 1);
    const vy = Math.cos(a) * ry * (clockwise ? -1 : 1);
    return { x, y, dir: vx - vy >= 0 ? 'r' : 'l', back: vx + vy < 0, moving: true, angle: a };
  };
}

export const wave = (t, speed = 1, amp = 1, offset = 0) => Math.sin(t * speed + offset) * amp;
export const pulse = (t, period, offset = 0) => ((((t + offset) % period) + period) % period) / period;
export const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

// Stateless particles: n particles, each living `life` seconds, staggered.
// draw(k, r, i) is called with k = age 0..1 and r = a per-particle random fn
// that stays stable for the particle's whole life.
export function particles(t, n, life, draw, seed = 1) {
  for (let i = 0; i < n; i++) {
    const phase = (i / n) * life;
    const tt = t + phase;
    const cycle = Math.floor(tt / life);
    const k = (tt % life) / life;
    let c = 0;
    const r = () => hash(seed * 1000 + i, cycle * 17 + c++);
    draw(k, r, i);
  }
}
