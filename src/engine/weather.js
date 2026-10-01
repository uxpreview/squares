// Weather for a whole map, as pure functions of time, so every zone and the
// map's sky agree on when the lightning strikes. Nothing here knows about any
// one place: a map makes a storm, hands it to its zones (through its style
// sheet), and draws the rain and bolts in its backdrop and sky.

import { ZK } from './iso.js';
import { C, Q, alpha, hash } from './art.js';

// A storm on a loop, with lightning every `every` seconds (a [min, max] range).
//   flash(t):  how bright the lightning is right now, 0..1
//   strike(t): the strike happening now, { i, t, age, x, y, big }, or null
//   strikes:   every strike in the loop (x, y are 0..1, for placing the bolt)
export function storm(o = {}) {
  const loop = o.loop || 180;
  const [lo, hi] = o.every || [15, 25];
  const seed = o.seed || 7;
  const strikes = [];
  let t = o.first ?? 3;
  for (let i = 0; t < loop - lo * 0.5; i++) {
    strikes.push({ i, t, x: hash(seed, i * 3), y: hash(seed, i * 3 + 1), big: hash(seed, i * 3 + 2) > 0.45 });
    t += lo + (hi - lo) * hash(seed + 11, i);
  }
  const LIFE = 1.4;
  function strike(tq) {
    const tt = ((tq % loop) + loop) % loop;
    for (const s of strikes) {
      const age = tt - s.t;
      if (age >= 0 && age < LIFE) return { ...s, age };
    }
    return null;
  }
  // Two quick strobes, then a fade: the way lightning looks.
  function flash(tq) {
    const s = strike(tq);
    if (!s) return 0;
    const a = s.age;
    if (a < 0.07) return 1;
    if (a < 0.13) return 0.2;
    if (a < 0.22) return s.big ? 0.95 : 0.55;
    return (s.big ? 0.8 : 0.45) * Math.exp(-(a - 0.22) * 7);
  }
  return { loop, strikes, strike, flash };
}

// A lightning bolt from one world iso point to another (a cloud to a rooftop),
// jagged the same way every time for the same seed. k: 0..1 brightness.
export function bolt(ctx, from, to, seed = 1, k = 1) {
  if (!(k > 0.03)) return;
  const [X0, Y0] = from, [X1, Y1] = to;
  const n = 10;
  const pts = [[X0, Y0]];
  for (let i = 1; i < n; i++) {
    const f = i / n;
    pts.push([X0 + (X1 - X0) * f + (hash(seed, i) - 0.5) * 3.4 * (1 - f * 0.5), Y0 + (Y1 - Y0) * f + (hash(seed + 5, i) - 0.5) * 0.9]);
  }
  pts.push([X1, Y1]);
  const b = Math.floor(n * (0.3 + 0.3 * hash(seed, 99)));
  const branch = [pts[b], [pts[b][0] + (hash(seed, 98) > 0.5 ? 1 : -1) * 4, pts[b][1] + 5]];
  const line = (p) => {
    ctx.beginPath();
    p.forEach(([X, Y], i) => (i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y)));
  };
  ctx.save();
  ctx.globalAlpha *= Math.min(1, k);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const p of [pts, branch]) {
    line(p);
    ctx.strokeStyle = alpha(C.white, 0.3);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.strokeStyle = C.white;
    ctx.lineWidth = p === pts ? 0.38 : 0.2;
    ctx.stroke();
  }
  ctx.restore();
}

// Rain on the ground in a world box, area [x0, y0, x1, y1], falling from `top`
// units up. skip(x, y) leaves drops out (under a roof, behind a wall). Drops
// land with a small splash. It's drawn every frame: keep n to a few hundred.
// o: { area, n, top, speed, len, wind, color, lw, seed, skip }
export function rain(ctx, t, o) {
  const [x0, y0, x1, y1] = o.area;
  const n = o.n || 160, top = o.top || 18, v = o.speed || 26, seed = o.seed || 3;
  // o.px: a drop's longest on screen, in CSS pixels. Without it a drop is a
  // fixed length on the ground, so zoomed in it grows into a long scratch.
  const css = (Q.pxPerUnit || 20) / Math.min(3, globalThis.devicePixelRatio || 1);
  const shrink = o.px ? Math.min(1, o.px / ((o.len || 1.6) * css)) : 1;
  const len = (o.len || 1.6) * shrink, wind = o.wind ?? 0.35;
  // o.ground(x, y): the ground's height, so drops end and splash on it.
  const gnd = o.ground || (() => 0);
  const fall = top / v;
  const splash = [];
  ctx.save();
  ctx.strokeStyle = o.color || alpha(C.sky, 0.55);
  ctx.lineWidth = (o.lw || 0.07) * Math.max(0.4, shrink);
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const ph = t / fall + hash(seed, i);
    const cyc = Math.floor(ph), k = ph - cyc;
    const x = x0 + (x1 - x0) * hash(i + seed * 997, cyc), y = y0 + (y1 - y0) * hash(i + seed * 991, cyc + 7);
    if (o.skip && o.skip(x, y)) continue;
    const g = gnd(x, y), z = g + top * (1 - k);
    const X = x - y, Y = (x + y) / 2 - z * ZK;
    ctx.moveTo(X + wind * len, Y - len);
    ctx.lineTo(X, Y);
    if (k > 0.88) splash.push(X, (x + y) / 2 - g * ZK, (k - 0.88) / 0.12);
  }
  ctx.stroke();
  if (Q.detail && splash.length) {
    ctx.beginPath();
    for (let j = 0; j < splash.length; j += 3) {
      const r = (0.15 + splash[j + 2] * 0.35) * Math.max(0.35, shrink);
      ctx.moveTo(splash[j] + r, splash[j + 1]);
      ctx.ellipse(splash[j], splash[j + 1], r, r * 0.4, 0, 0, Math.PI * 2);
    }
    ctx.lineWidth = 0.05 * Math.max(0.4, shrink);
    ctx.stroke();
  }
  ctx.restore();
}
