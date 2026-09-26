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

// Someone's evening on a clock, for people who walk between zones (a map's
// walkers; see src/engine/world.js). Steps, in order, in world units:
//   [x, y] or [x, y, z]     walk there at the current speed (z changes on stairs)
//   { until: t, ...extra }  stand still until t seconds into the loop
//   { wait: s, ...extra }   stand still for s seconds
//   { speed: v }            units per second from here on (1.3 walks, 3 runs)
// extra (pose, dir, say, anything) is returned while they stand at that stop.
// The first step is where they start; after the last they walk back to it, and
// the whole walk has to fit in o.loop seconds. Returns at(t) =>
// { x, y, z, dir, back, moving, speed, pose, ...extra }, a pure function of t.
export function schedule(steps, o = {}) {
  const loop = o.loop || 180;
  const start = o.start || 0;
  let speed = o.speed || 1.3;
  let [x, y, z] = [steps[0][0], steps[0][1], steps[0][2] ?? 0];
  let t = start;
  const segs = [];
  const walk = (nx, ny, nz) => {
    const dist = Math.hypot(nx - x, ny - y, (nz - z) * 0.7);
    if (dist < 1e-6) return;
    const dur = dist / speed;
    segs.push({ t0: t, t1: t + dur, x0: x, y0: y, z0: z, x1: nx, y1: ny, z1: nz, moving: true, speed, extra: null });
    t += dur;
    x = nx; y = ny; z = nz;
  };
  const stand = (until, extra) => {
    if (until < t - 1e-6) throw new Error(`schedule: ${o.name || 'someone'} can't stand until ${until}s, they only get there at ${t.toFixed(1)}s`);
    if (until > t) segs.push({ t0: t, t1: until, x0: x, y0: y, z0: z, x1: x, y1: y, z1: z, moving: false, speed: 0, extra });
    t = Math.max(t, until);
  };
  for (const s of steps.slice(1)) {
    if (Array.isArray(s)) { walk(s[0], s[1], s[2] ?? z); continue; }
    const { until, wait, speed: v, ...extra } = s;
    if (v) speed = v;
    if (until != null) stand(until, extra);
    else if (wait != null) stand(t + wait, extra);
  }
  walk(steps[0][0], steps[0][1], steps[0][2] ?? 0);
  stand(start + loop, {});
  if (t > start + loop + 1e-6) throw new Error(`schedule: ${o.name || 'someone'}'s walk takes ${(t - start).toFixed(1)}s, longer than the ${loop}s loop`);
  // Which way they face: the way they last walked (standing keeps it).
  let dir = 'r', back = false;
  for (let pass = 0; pass < 2; pass++) {
    for (const s of segs) {
      if (s.moving) {
        const dX = (s.x1 - s.x0) - (s.y1 - s.y0), dY = (s.x1 - s.x0) + (s.y1 - s.y0);
        s.dir = dX >= 0 ? 'r' : 'l';
        s.back = dY < -0.01;
        dir = s.dir; back = s.back;
      } else {
        s.dir = (s.extra && s.extra.dir) || dir;
        s.back = s.extra && s.extra.back != null ? s.extra.back : back;
      }
    }
  }
  let lastT = NaN, last = null, seg = segs[0];
  return (tq) => {
    if (tq === lastT) return last;
    const tt = ((((tq - start) % loop) + loop) % loop) + start;
    if (!(tt >= seg.t0 && tt < seg.t1)) seg = segs.find((g) => tt >= g.t0 && tt < g.t1) || segs[segs.length - 1];
    const k = seg.t1 > seg.t0 ? (tt - seg.t0) / (seg.t1 - seg.t0) : 0;
    last = {
      x: seg.x0 + (seg.x1 - seg.x0) * k,
      y: seg.y0 + (seg.y1 - seg.y0) * k,
      z: seg.z0 + (seg.z1 - seg.z0) * k,
      dir: seg.dir,
      back: seg.back,
      moving: seg.moving,
      speed: seg.speed,
      pose: seg.moving ? (seg.speed > 2.2 ? 'run' : 'walk') : 'stand',
      ...(seg.extra || {}),
    };
    lastT = tq;
    return last;
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
