// The Curb: the departures curb and the roads behind it, along the back of
// the whole airport (docs/levels/logan.md). From the left: the water taxi's
// dock on the inner harbor and the tunnel mouth beside it, the drop-off lane
// (a family unloading eleven bags from one hatchback, forever), the smokers'
// corner and its bin, the Central Garage and the control tower (the hero) on
// their island with the road bowing round them, the taxi stand (the second
// cab has a goose in the back, meter running, so the line never moves), the
// Silver Line stop and arrivals pick-up, where Ray's family waits.
//
// Running gag: one minivan circles the airport all day. Out of the tunnel at
// the right end, along the curb, it pulls in by the tower, the trooper waves
// it on, and it's into the tunnel at the dock and round again, the kid in the
// back window a little sadder each lap; at night it's still going, lights on,
// snow on its roof.
//
// World units (plan.js AREAS: the curb is 0..104 x 0..12, y from the back).
// Traffic runs one way, right to left on the screen.
import { C, Q, P, box, rect, face, paint, cylinder, person, speech, label, alpha, tint, shade, mix, glow } from '../../../engine/art.js';
import { particles } from '../../../engine/actors.js';
import { INK, LIT, SIGN, BAGS, BRAND, LIVERY, dusk, nightPrint } from '../style.js';
import { solid, hexa, bag, look, stay, sign, hangSign, lettering, snowCover, nightGround, nightGlow } from '../kit.js';
import { W } from '../plan.js';
import { hour, nightK, lightsOn, settle, stopped, LOOP } from '../clock.js';

// ---------- Small helpers ----------
const ID = (c) => c;
const mod = (t, p) => ((t % p) + p) % p;
const clamp01 = (k) => Math.max(0, Math.min(1, k));
const smooth = (k) => { const q = clamp01(k); return q * q * (3 - 2 * q); };
const lerp = (a, b, k) => a + (b - a) * k;
const TAU = Math.PI * 2;
// A line through world points.
function line3(ctx, pts, color, lw = 0.05) {
  ctx.beginPath();
  pts.forEach((p, i) => { const [X, Y] = P(p[0], p[1], p[2] || 0); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}
// A dot that faces you (a bulb, a head, a bobber).
function dot(ctx, x, y, z, r, fill, lw = 0.025) {
  const [X, Y] = P(x, y, z);
  ctx.beginPath();
  ctx.arc(X, Y, r, 0, TAU);
  paint(ctx, fill, lw ? { lw } : { stroke: false });
}
// Words at a point on the screen (a tag, a card), size in units.
function txt(ctx, X, Y, text, size, color, font = 'Rethink Sans') {
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(1 / 40, 1 / 40);
  ctx.font = `700 ${size * 40}px "${font}", sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
// A little heart.
function heart(ctx, X, Y, r, fill) {
  ctx.beginPath();
  ctx.moveTo(X, Y + r * 0.9);
  ctx.bezierCurveTo(X - r * 1.4, Y - r * 0.2, X - r * 0.6, Y - r * 1.2, X, Y - r * 0.4);
  ctx.bezierCurveTo(X + r * 0.6, Y - r * 1.2, X + r * 1.4, Y - r * 0.2, X, Y + r * 0.9);
  paint(ctx, fill, { lw: 0.02 });
}
const post = (ctx, x, y, z, h, color = C.ink, r = 0.05) => box(ctx, x - r, y - r, z, r * 2, r * 2, h, color, { flat: true, lw: 0.025 });
// Lettering in Bagel Fat One, for the painted signs.
const big = (ctx, along, x, y, z, text, size, ink) => lettering(ctx, along, x, y, z, text, size, ink, 'Bagel Fat One');
// Something long along x (a barrier, a billboard), in pieces that never cross
// one of the area's 16-unit seams (each piece is drawn by the picture of the
// stretch it stands in).
function pieces(x0, x1, step) {
  const out = [];
  let a = x0;
  while (a < x1 - 1e-6) {
    const seam = (Math.floor(a / 16 + 1e-9) + 1) * 16;
    const b = Math.min(x1, a + step, seam);
    out.push([a, b]);
    a = b;
  }
  return out;
}

// ---------- Inks ----------
const WALK = tint(INK.concrete, 0.32); // the sidewalks
const ISLE = tint(INK.concrete, 0.08); // the garage's island and the verge
const TAR = INK.tarmac;
const GRANITE = mix(INK.concrete, C.grey, 0.5);
const CONC = tint(INK.concrete, 0.18); // the garage, the tower, the tunnels
const DECK = tint(C.wood, 0.25);
const PILE = shade(C.wood, 0.3);
const GLASS = mix(C.sky, C.navy, 0.3);
const INSIDE = mix(C.ink, C.navy, 0.35);
const SILVER = mix(C.grey, C.white, 0.45);
const STEEL = mix(C.grey, C.navy, 0.3);
const TAXI = INK.signal;
const PAINT = C.white; // on the road
const WZ = -0.6; // the harbor's surface, under the land's edge

// ---------- The road ----------
// Two lanes along the curb at both ends (the far one through, the near one
// for stopping); in the middle the road bows forward round the island the
// garage and the tower stand on, one lane wide. mid(x): 0 at the ends, 1 in
// the middle.
const CURB = 6.8;
const mid = (x) => (x <= 27 || x >= 61.5 ? 0 : x < 33.5 ? smooth((x - 27) / 6.5) : x > 55.5 ? smooth((61.5 - x) / 6) : 1);
const laneY = (x) => 2.4 + 4.35 * mid(x); // where traffic drives
const backY = (x) => 1.0 + 4.6 * mid(x); // the road's back edge
// The road's front edge (the curb), and its ends: it narrows into the
// tunnel at the dock, and stops short of the tunnel at arrivals.
const frontY = (x) => (x > 99.5 ? 4.4 : x > 98 ? lerp(CURB, 4.4, (x - 98) / 1.5) : x < 12.6 ? 4.0 : x < 14 ? lerp(4.0, CURB, (x - 12.6) / 1.4) : CURB + 1.1 * mid(x));
const ROAD_L = 11.5; // the dock's tunnel mouth

// ---------- Traffic ----------
// One route for everything: out of the tunnel under arrivals (x 107), along
// the far lane, round the island, and into the tunnel by the dock (x 6.5).
// s is the distance along it.
const RX0 = 107, RX1 = 6.5;
const ROUTE = [];
{
  let s = 0, px = RX0, py = laneY(RX0);
  for (let x = RX0; x >= RX1 - 1e-9; x -= 0.25) { const y = laneY(x); s += Math.hypot(x - px, y - py); ROUTE.push([s, x, y]); px = x; py = y; }
}
const LEN = ROUTE[ROUTE.length - 1][0];
function onRoute(s) {
  const q = Math.max(0, Math.min(LEN, s));
  let lo = 0, hi = ROUTE.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ROUTE[m][0] <= q) lo = m; else hi = m; }
  const a = ROUTE[lo], b = ROUTE[hi], k = (q - a[0]) / ((b[0] - a[0]) || 1);
  return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}
// Where something half long is at s, and which way it's pointing.
function pose(s, half) {
  const [x, y] = onRoute(s), [ax, ay] = onRoute(s - half), [bx, by] = onRoute(s + half);
  return { x, y, ang: Math.atan2(by - ay, bx - ax) };
}
// The s where the route passes x.
function sAt(x) {
  let lo = 0, hi = ROUTE.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ROUTE[m][1] >= x) lo = m; else hi = m; }
  const a = ROUTE[lo], b = ROUTE[hi], k = (a[1] - x) / ((a[1] - b[1]) || 1);
  return a[0] + (b[0] - a[0]) * k;
}
// A drive down the route from its start at time 0: cruising at v, slowing to
// a stop at each [s, wait] and pulling away again, on to the end. at(t) gives
// { s, stop, k (how far through the stop, while stopped) }, or null before
// it's started or once it's gone.
function drive(v, stops = [], a = 2.2) {
  const ph = [];
  let t = 0, s = 0;
  const go = (s1) => { if (s1 > s + 1e-9) { const d = (s1 - s) / v; ph.push({ t0: t, t1: t + d, s0: s, v0: v, a: 0 }); t += d; s = s1; } };
  const halts = [];
  for (const [at, wait] of stops) {
    const d = (v * v) / (2 * a), dt = v / a;
    go(at - d);
    ph.push({ t0: t, t1: t + dt, s0: s, v0: v, a: -a }); t += dt; s = at;
    halts.push([t - dt, t, t + wait]);
    ph.push({ t0: t, t1: t + wait, s0: s, v0: 0, a: 0, stop: true }); t += wait;
    ph.push({ t0: t, t1: t + dt, s0: s, v0: 0, a }); t += dt; s += d;
  }
  go(LEN);
  const end = t;
  return {
    end, halts,
    at(tt) {
      if (!(tt >= 0 && tt <= end)) return null;
      let p = ph[ph.length - 1];
      for (const q of ph) if (tt <= q.t1) { p = q; break; }
      const k = tt - p.t0;
      return { s: p.s0 + p.v0 * k + 0.5 * p.a * k * k, stop: !!p.stop, k: p.stop ? k / (p.t1 - p.t0) : -1 };
    },
  };
}
// The Silver Line every 90 seconds, stopping 12 at its stop; the minivan
// every 45 (eight laps a day), stopping by the tower; a car or two in the
// gaps (a plow, once the snow's lying). Spaced so nobody runs into anybody.
const BUS_CYCLE = 90, BUS_X = 92.5;
const BUS = drive(4.2, [[sAt(BUS_X), 12]], 2.0);
const VAN_LAP = 45, VAN_T0 = 28, VAN_X = 54.8;
const VAN = drive(5, [[sAt(VAN_X), 5]]);
const CAR = drive(5.5), PLOW = drive(3.4);
const plowing = (t) => settle(t) > 0.3;
const busNow = (t) => { const tt = mod(t, BUS_CYCLE), st = BUS.at(tt); return st && { ...st, tt, n: Math.floor(t / BUS_CYCLE) }; };
const vanNow = (t) => { const tt = mod(t - VAN_T0, VAN_LAP), st = VAN.at(tt); return st && { ...st, tt }; };
// Which lap the minivan's on (0 to 7): its first is at half past six (before
// that, the night's last lap is still going).
const lapOf = (t) => mod(Math.floor((t - VAN_T0) / VAN_LAP), LOOP / VAN_LAP);
// The cars in the gaps: one 46s into every bus cycle (a plow once
// the snow's lying), one at 55 (not while the plows are out). Timed with a
// check that nothing ever comes within 40 units of anything else.
function carNow(t, t0, plowed) {
  const tt = mod(t - t0, BUS_CYCLE), start = t - tt, plow = plowing(start);
  if (plowed === false && plow) return null;
  const st = (plowed && plow ? PLOW : CAR).at(tt);
  return st && { ...st, plow: plowed && plow, n: Math.floor((t - t0) / BUS_CYCLE) };
}
const HIDE = { x: -60, y: -60, hide: true };
// Vehicles show only between the tunnels' mouths: past one, they're inside
// it (or out over the harbor). Cut on the screen at the lane they're in.
const MOUTH_L = 11.5, MOUTH_R = 100.8;
function inTunnels(ctx, x, y, draw) {
  if (x > MOUTH_L + 4.5 && x < MOUTH_R - 4.5) { draw(); return; }
  ctx.save();
  ctx.beginPath();
  ctx.rect(MOUTH_L - y, -1000, MOUTH_R - MOUTH_L, 2000);
  ctx.clip();
  draw();
  ctx.restore();
}

// ---------- A frame at any heading ----------
// u along it (+ toward its front), v across it, h up; ang is its heading in
// the map (0 points along +x). near: the v of the side you see; end: the u of
// the end you see.
function heading(x, y, z, ang) {
  const c = Math.cos(ang), s = Math.sin(ang);
  const at = (u, v) => [x + u * c - v * s, y + u * s + v * c];
  const pt = (u, v, h) => { const [a, b] = at(u, v); return [a, b, z + h]; };
  return { at, pt, near: c - s >= 0 ? 1 : -1, end: c + s >= 0 ? 1 : -1, ax: Math.abs(s) < 0.03 ? 'x' : Math.abs(c) < 0.03 ? 'y' : null };
}
// A box in the frame, as a solid (only the faces toward you, outlined once).
function tbox(ctx, F, u0, u1, v0, v1, h0, h1, fill, o = {}) {
  const lo = [F.pt(u0, v0, h0), F.pt(u1, v0, h0), F.pt(u1, v1, h0), F.pt(u0, v1, h0)];
  const hi = [F.pt(u0, v0, h1), F.pt(u1, v0, h1), F.pt(u1, v1, h1), F.pt(u0, v1, h1)];
  solid(ctx, hexa(lo, hi, fill, o.top ? { top: o.top } : {}), { ink: o.ink, lw: o.lw ?? 0.035 });
}
// A flat shape in the frame.
const tq = (ctx, F, pts, fill, o) => face(ctx, pts.map(([u, v, h]) => F.pt(u, v, h)), fill, o);
// A disc upright on a side (a wheel), in the u-h plane at v.
function tdisc(ctx, F, u, v, h, r, fill, o) {
  const pts = [];
  for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; pts.push([u + Math.cos(a) * r, v, h + Math.sin(a) * r]); }
  tq(ctx, F, pts, fill, o);
}

// ---------- Cars ----------
// Sizes: length, width, the body's top, the cabin's foot (cb) and roof (rf)
// along it, the roof's height.
const BODY = {
  car: { L: 3.1, W: 1.5, hb: 0.72, cb: [-0.95, 0.62], rf: [-0.72, 0.22], ht: 1.26 },
  hatch: { L: 2.9, W: 1.5, hb: 0.72, cb: [-1.32, 0.55], rf: [-1.22, 0.16], ht: 1.32 },
  van: { L: 3.5, W: 1.6, hb: 0.78, cb: [-1.62, 1.0], rf: [-1.58, 0.52], ht: 1.62 },
};
// A car at (x, y) heading ang. o: { kind ('car', 'taxi', 'hatch', 'van',
// 'cruiser'), color, ink, riders: [{ u, v, look, face(ctx, X, Y) }], lit
// (lamps on), moving (its headlights on the road ahead), snow (0..1 on its
// tops), hatch (its hatch up, bags inside), roofbox, after(ctx, F) }
function car(ctx, x, y, ang, o = {}) {
  const kind = o.kind || 'car';
  const B = BODY[kind] || BODY.car, L = B.L, hw = B.W / 2, L2 = L / 2;
  const F = heading(x, y, o.z || 0, ang), n = F.near, e = F.end;
  const ink = o.ink || ID, col = o.color || C.red, lw = 0.035;
  // Wheels, the far side's first.
  for (const sv of [-n, n]) for (const u of [-L * 0.29, L * 0.29]) tbox(ctx, F, u - 0.25, u + 0.25, sv * (hw - 0.22), sv * (hw + 0.01), 0, 0.4, C.ink, { lw: 0.02 });
  tbox(ctx, F, -L2, L2, -hw, hw, 0.2, B.hb, col, { ink, lw, top: tint(col, 0.06) });
  const side = n * (hw + 0.006), endU = e * (L2 + 0.006);
  const [cb0, cb1] = B.cb, [rf0, rf1] = B.rf, hb = B.hb, ht = B.ht, cw = hw - 0.07, cw2 = hw - 0.17;
  if (!Q.detail) {
    tbox(ctx, F, cb0, cb1, -cw, cw, hb, ht, GLASS, { ink, lw, top: tint(col, 0.08) });
    return F;
  }
  // The near side: a dark sill, the arches and wheels, the door seams.
  tq(ctx, F, [[-L2, side, 0.2], [L2, side, 0.2], [L2, side, 0.29], [-L2, side, 0.29]], ink(shade(col, 0.4)), { stroke: false });
  for (const u of [-L * 0.29, L * 0.29]) {
    const arch = [];
    for (let k = 0; k <= 8; k++) { const a = (k / 8) * Math.PI; arch.push([u + Math.cos(a) * 0.34, side, 0.2 + Math.sin(a) * 0.28]); }
    tq(ctx, F, arch, ink(shade(col, 0.6)), { stroke: false });
    tdisc(ctx, F, u, side + n * 0.004, 0.22, 0.22, C.ink, { lw: 0.015 });
    tdisc(ctx, F, u, side + n * 0.008, 0.22, 0.08, ink(C.greyLight), { stroke: false });
  }
  const seams = kind === 'van' ? [0.6, -0.55] : kind === 'hatch' ? [0.12] : [0.18, -0.6];
  for (const u of seams) line3(ctx, [F.pt(u, side, 0.3), F.pt(u, side, hb - 0.02)], ink(shade(col, 0.45)), 0.02);
  if (kind === 'van') line3(ctx, [F.pt(-1.3, side, 0.55), F.pt(0.55, side, 0.55)], ink(shade(col, 0.3)), 0.025);
  if (kind === 'taxi') {
    // The checker band along its side.
    for (let i = 0; i < 12; i++) {
      const u0 = -L2 + 0.2 + i * 0.225;
      tq(ctx, F, [[u0, side + n * 0.002, 0.5], [u0 + 0.225, side + n * 0.002, 0.5], [u0 + 0.225, side + n * 0.002, 0.6], [u0, side + n * 0.002, 0.6]], i % 2 ? C.ink : C.white, { stroke: false });
    }
  }
  if (kind === 'cruiser') {
    tq(ctx, F, [[-L2, side + n * 0.002, 0.42], [L2, side + n * 0.002, 0.42], [L2, side + n * 0.002, 0.52], [-L2, side + n * 0.002, 0.52]], ink(INK.signal), { stroke: false });
    if (F.ax) lettering(ctx, F.ax, ...F.at(-0.1, side + n * 0.01), 0.34, 'STATE POLICE', 0.17, ink(C.ink));
  }
  // The end you see: its lamps (red at the back, headlights at the front), a
  // plate, the bumper.
  const front = e > 0, lamp = front ? (o.lit ? LIT : ink(tint(C.butter, 0.4))) : (o.lit ? tint(C.red, 0.25) : ink(C.red));
  for (const sv of [-1, 1]) tq(ctx, F, [[endU, sv * (hw - 0.07), 0.5], [endU, sv * (hw - 0.4), 0.5], [endU, sv * (hw - 0.4), 0.63], [endU, sv * (hw - 0.07), 0.63]], lamp, { lw: 0.015 });
  tq(ctx, F, [[endU, -0.22, 0.29], [endU, 0.22, 0.29], [endU, 0.22, 0.41], [endU, -0.22, 0.41]], ink(C.white), { lw: 0.015 });
  tq(ctx, F, [[endU, -hw, 0.2], [endU, hw, 0.2], [endU, hw, 0.27], [endU, -hw, 0.27]], ink(shade(C.grey, 0.2)), { stroke: false });
  // The cabin, inside out: its far side, far end and floor dark, whoever's
  // in it, then the glass on the side and the end you see, the pillars, the
  // roof.
  const dark = ink(INSIDE);
  const uFarB = e > 0 ? cb0 : cb1, uFarT = e > 0 ? rf0 : rf1, uNearB = e > 0 ? cb1 : cb0, uNearT = e > 0 ? rf1 : rf0;
  tq(ctx, F, [[cb0, -n * cw, hb], [cb1, -n * cw, hb], [rf1, -n * cw2, ht], [rf0, -n * cw2, ht]], dark, { lw: 0.025 });
  tq(ctx, F, [[uFarB, -cw, hb], [uFarB, cw, hb], [uFarT, cw2, ht], [uFarT, -cw2, ht]], dark, { lw: 0.025 });
  tq(ctx, F, [[cb0, -cw, hb], [cb1, -cw, hb], [cb1, cw, hb], [cb0, cw, hb]], dark, { stroke: false });
  for (const r of o.riders || []) {
    if (r.face) continue;
    const lk = r.look || {};
    const [bx, by] = P(...F.pt(r.u, r.v, hb + 0.1));
    const [hx, hy] = P(...F.pt(r.u, r.v, hb + 0.34 + (r.lift || 0)));
    ctx.beginPath(); ctx.ellipse(bx, by, 0.2, 0.15, 0, 0, TAU); paint(ctx, lk.top || C.navy, { lw: 0.02 });
    ctx.beginPath(); ctx.arc(hx, hy, 0.135, 0, TAU); paint(ctx, lk.skin || C.blush, { lw: 0.02 });
    ctx.beginPath(); ctx.arc(hx, hy - 0.02, 0.145, Math.PI * 1.05, Math.PI * 1.95); paint(ctx, lk.hair || C.ink, { stroke: false });
    if (r.hat) { ctx.beginPath(); ctx.arc(hx, hy - 0.05, 0.15, Math.PI, 0); paint(ctx, r.hat, { lw: 0.02 }); }
  }
  const pane = alpha(ink(GLASS), 0.42);
  tq(ctx, F, [[cb0, n * cw, hb], [cb1, n * cw, hb], [rf1, n * cw2, ht], [rf0, n * cw2, ht]], pane, { lw: 0.03 });
  tq(ctx, F, [[uNearB, -cw, hb], [uNearB, cw, hb], [uNearT, cw2, ht], [uNearT, -cw2, ht]], pane, { lw: 0.03 });
  for (const r of o.riders || []) if (r.face) r.face(ctx, ...P(...F.pt(r.u, r.v, hb + 0.34)));
  if (o.after) o.after(ctx, F);
  // A glint across the side glass.
  ctx.save(); ctx.globalAlpha *= 0.45;
  tq(ctx, F, [[lerp(cb0, cb1, 0.3), n * (cw + 0.003), hb + 0.05], [lerp(cb0, cb1, 0.42), n * (cw + 0.003), hb + 0.05], [lerp(rf0, rf1, 0.4), n * (cw2 + 0.003), ht - 0.05], [lerp(rf0, rf1, 0.28), n * (cw2 + 0.003), ht - 0.05]], C.white, { stroke: false });
  ctx.restore();
  line3(ctx, [F.pt(lerp(cb0, cb1, 0.55), n * cw, hb), F.pt(lerp(rf0, rf1, 0.55), n * cw2, ht)], ink(col), 0.07);
  tq(ctx, F, [[rf0, -cw2, ht], [rf1, -cw2, ht], [rf1, cw2, ht], [rf0, cw2, ht]], ink(tint(col, 0.08)), { lw });
  if (o.hatch) {
    // The hatch up: the back of it open, bags to the roof, the lid lifted.
    const ub = e > 0 ? L2 : -L2;
    tq(ctx, F, [[ub - e * 0.02, -cw, 0.42], [ub - e * 0.02, cw, 0.42], [uNearT, cw2, ht - 0.03], [uNearT, -cw2, ht - 0.03]], dark, { lw: 0.025 });
    [[-0.38, 0.45, 0.42, C.coral], [0.0, 0.42, 0.4, C.navy], [0.36, 0.44, 0.42, INK.cranberry], [-0.2, 0.86, 0.3, C.mustard], [0.22, 0.83, 0.32, C.teal]].forEach(([v, h, s, c]) => {
      tq(ctx, F, [[ub - e * 0.05, v - s / 2, h], [ub - e * 0.05, v + s / 2, h], [ub - e * 0.05, v + s / 2, h + s * 0.85], [ub - e * 0.05, v - s / 2, h + s * 0.85]], ink(c), { lw: 0.02 });
    });
    tq(ctx, F, [[uNearT, -cw2, ht], [uNearT, cw2, ht], [uNearT - e * 0.35, cw2, ht + 0.82], [uNearT - e * 0.35, -cw2, ht + 0.82]], ink(col), { lw: 0.03 });
    tq(ctx, F, [[uNearT - e * 0.05, -cw2 + 0.12, ht + 0.12], [uNearT - e * 0.05, cw2 - 0.12, ht + 0.12], [uNearT - e * 0.3, cw2 - 0.12, ht + 0.7], [uNearT - e * 0.3, -cw2 + 0.12, ht + 0.7]], pane, { lw: 0.02 });
  }
  // On the roof: a taxi's light, a cargo box, the cruiser's bar.
  if (kind === 'taxi') tbox(ctx, F, -0.42, 0.02, -0.3, 0.3, ht, ht + 0.2, o.lit ? tint(LIT, 0.3) : C.white, { ink: o.lit ? null : ink, lw: 0.025 });
  if (o.roofbox) tbox(ctx, F, -1.3, 0.1, -0.5, 0.5, ht, ht + 0.3, o.roofbox, { ink, lw: 0.03 });
  if (kind === 'cruiser') {
    tbox(ctx, F, -0.32, -0.12, -0.6, 0, ht, ht + 0.12, ink(C.red), { lw: 0.02 });
    tbox(ctx, F, -0.32, -0.12, 0, 0.6, ht, ht + 0.12, ink(C.navy), { lw: 0.02 });
  }
  // Snow on its tops.
  if (o.snow > 0.01) {
    ctx.save(); ctx.globalAlpha *= Math.min(1, o.snow);
    const sn = ink(C.white);
    tq(ctx, F, [[rf0 + 0.05, -cw2 + 0.05, ht + 0.012], [rf1 - 0.05, -cw2 + 0.05, ht + 0.012], [rf1 - 0.05, cw2 - 0.05, ht + 0.012], [rf0 + 0.05, cw2 - 0.05, ht + 0.012]], sn, { lw: 0.02 });
    tq(ctx, F, [[cb1 + 0.12, -hw + 0.08, hb + 0.012], [L2 - 0.1, -hw + 0.08, hb + 0.012], [L2 - 0.1, hw - 0.08, hb + 0.012], [cb1 + 0.12, hw - 0.08, hb + 0.012]], sn, { stroke: false });
    if (!o.hatch) tq(ctx, F, [[-L2 + 0.1, -hw + 0.08, hb + 0.012], [cb0 - 0.1, -hw + 0.08, hb + 0.012], [cb0 - 0.1, hw - 0.08, hb + 0.012], [-L2 + 0.1, hw - 0.08, hb + 0.012]], sn, { stroke: false });
    ctx.restore();
  }
  // Lamps on: the tail lights glow, and the headlights light the road ahead.
  if (o.lit) {
    for (const sv of [-0.5, 0.5]) glow(ctx, ...F.pt(-L2, sv, 0.56), 0.45, C.red, 0.85);
    if (o.moving) glow(ctx, ...F.pt(L2 + 1.3, 0, 0.05), 1.5, LIT, 0.5);
  }
  return F;
}

// One section of the Silver Line's articulated bus, 4.4 long and 2 wide.
// o: { ink, tail: its back is the bus's back (lamps, the route sign),
// doors: [u, ...], open, lit, snow, seed (who's in the windows) }
const BUS_L = 4.4;
function busPart(ctx, x, y, ang, o = {}) {
  const F = heading(x, y, 0, ang), n = F.near, e = F.end, ink = o.ink || ID;
  const L2 = BUS_L / 2, hw = 1.0, H = 2.2, side = n * (hw + 0.006);
  for (const sv of [-n, n]) for (const u of [-1.25, 1.25]) tbox(ctx, F, u - 0.3, u + 0.3, sv * (hw - 0.25), sv * (hw + 0.01), 0, 0.5, C.ink, { lw: 0.02 });
  tbox(ctx, F, -L2, L2, -hw, hw, 0.26, H, SILVER, { ink, top: tint(SILVER, 0.2) });
  tbox(ctx, F, -0.9, 0.7, -0.55, 0.55, H, H + 0.22, C.grey, { ink, lw: 0.025 });
  if (!Q.detail) return;
  // The windows down the side, lit after dark, with heads in them.
  const glass = o.lit ? tint(LIT, 0.15) : ink(shade(GLASS, 0.2));
  tq(ctx, F, [[-L2 + 0.2, side, 1.12], [L2 - 0.2, side, 1.12], [L2 - 0.2, side, 1.85], [-L2 + 0.2, side, 1.85]], glass, { lw: 0.03 });
  let r = (o.seed || 1) * 9301 + 49297;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  for (let u = -L2 + 0.55; u < L2 - 0.4; u += 0.62) {
    if (rnd() < 0.35) continue;
    const [hx, hy] = P(...F.pt(u, side * 0.9, 1.48));
    ctx.beginPath(); ctx.arc(hx, hy, 0.13, 0, TAU); paint(ctx, [C.blush, mix(C.woodLight, C.brown, 0.4), C.wood][Math.floor(rnd() * 3)], { lw: 0.015 });
    ctx.beginPath(); ctx.arc(hx, hy - 0.02, 0.14, Math.PI, 0); paint(ctx, [C.ink, C.brown, C.mustard, C.grey][Math.floor(rnd() * 4)], { stroke: false });
  }
  for (let u = -L2 + 0.2; u <= L2 - 0.19; u += 0.62) line3(ctx, [F.pt(u, side, 1.12), F.pt(u, side, 1.85)], ink(SILVER), 0.05);
  // The band under the windows, and the skirt.
  tq(ctx, F, [[-L2, side, 0.86], [L2, side, 0.86], [L2, side, 1.0], [-L2, side, 1.0]], ink(C.purple), { stroke: false });
  tq(ctx, F, [[-L2, side, 0.26], [L2, side, 0.26], [L2, side, 0.42], [-L2, side, 0.42]], ink(shade(SILVER, 0.35)), { stroke: false });
  for (const u of [-1.25, 1.25]) {
    tdisc(ctx, F, u, side + n * 0.004, 0.28, 0.27, C.ink, { lw: 0.015 });
    tdisc(ctx, F, u, side + n * 0.008, 0.28, 0.1, ink(C.greyLight), { stroke: false });
  }
  for (const d of o.doors || []) {
    tq(ctx, F, [[d - 0.36, side + n * 0.003, 0.3], [d + 0.36, side + n * 0.003, 0.3], [d + 0.36, side + n * 0.003, 1.95], [d - 0.36, side + n * 0.003, 1.95]], o.open ? ink(INSIDE) : alpha(ink(GLASS), 0.85), { lw: 0.03 });
    if (!o.open) line3(ctx, [F.pt(d, side + n * 0.006, 0.3), F.pt(d, side + n * 0.006, 1.95)], ink(C.ink), 0.025);
  }
  if (F.ax && o.name) big(ctx, F.ax, ...F.at(o.nameU || 0, side + n * 0.01), 0.62, 'SILVER LINE', 0.26, ink(C.purple));
  if (o.tail) {
    // The back of the bus: its window, the route's sign, the lamps.
    const eu = e * (L2 + 0.006);
    tq(ctx, F, [[eu, -0.8, 1.2], [eu, 0.8, 1.2], [eu, 0.8, 1.86], [eu, -0.8, 1.86]], o.lit ? tint(LIT, 0.2) : ink(shade(GLASS, 0.2)), { lw: 0.03 });
    tq(ctx, F, [[eu, -0.6, 1.92], [eu, 0.6, 1.92], [eu, 0.6, 2.12], [eu, -0.6, 2.12]], C.ink, { lw: 0.02 });
    if (F.ax) lettering(ctx, F.ax === 'x' ? 'y' : 'x', ...F.at(e * (L2 + 0.01), 0), 2.02, 'SL1', 0.15, INK.signal);
    for (const sv of [-0.78, 0.78]) tq(ctx, F, [[eu, sv - 0.12, 0.45], [eu, sv + 0.12, 0.45], [eu, sv + 0.12, 0.75], [eu, sv - 0.12, 0.75]], o.lit ? tint(C.red, 0.2) : ink(C.red), { lw: 0.015 });
    if (o.lit) for (const sv of [-0.78, 0.78]) glow(ctx, ...F.pt(-L2, sv, 0.6), 0.5, C.red, 0.8);
  }
  if (o.snow > 0.01) {
    ctx.save(); ctx.globalAlpha *= Math.min(1, o.snow);
    tq(ctx, F, [[-L2 + 0.08, -hw + 0.08, H + 0.01], [L2 - 0.08, -hw + 0.08, H + 0.01], [L2 - 0.08, hw - 0.08, H + 0.01], [-L2 + 0.08, hw - 0.08, H + 0.01]], ink(C.white), { lw: 0.02 });
    ctx.restore();
  }
}

// The water taxi: a little yellow and white ferry, 5.4 long, its bow toward
// +u. Floats at the harbor's surface. o: { ink, lit, a (how much shows) }
const HULL = [[-2.6, -0.82], [1.4, -0.85], [2.8, 0], [1.4, 0.85], [-2.6, 0.82]];
function ferry(ctx, x, y, ang, t, o = {}) {
  const F = heading(x, y, WZ + 0.03 * Math.sin(t * 1.6), ang), n = F.near, ink = o.ink || ID;
  // The hull's sides that face you, the far ones first.
  // (Each side's outward normal, from the middle of the hull; it shows if
  // it looks your way.)
  const [ox, oy] = F.at(0, 0);
  const segs = HULL.map((p, i) => [p, HULL[(i + 1) % HULL.length]]).map(([a, b]) => {
    const [ax, ay] = F.at(a[0], a[1]), [bx, by] = F.at(b[0], b[1]);
    let nx = by - ay, ny = -(bx - ax);
    if (nx * ((ax + bx) / 2 - ox) + ny * ((ay + by) / 2 - oy) < 0) { nx = -nx; ny = -ny; }
    return { a, b, show: nx + ny > 0, k: ax + ay + bx + by };
  });
  for (const sg of segs.sort((p, q) => p.k - q.k)) {
    if (!sg.show) continue;
    tq(ctx, F, [[...sg.a, 0], [...sg.b, 0], [...sg.b, 0.62], [...sg.a, 0.62]], ink(HULL_C), { lw: 0.035 });
    if (Q.detail) {
      tq(ctx, F, [[...sg.a, 0.4], [...sg.b, 0.4], [...sg.b, 0.5], [...sg.a, 0.5]], ink(C.white), { stroke: false });
      tq(ctx, F, [[...sg.a, 0], [...sg.b, 0], [...sg.b, 0.1], [...sg.a, 0.1]], ink(shade(INK.harbor, 0.4)), { stroke: false });
    }
  }
  tq(ctx, F, HULL.map(([u, v]) => [u * 0.97, v * 0.92, 0.62]), ink(tint(C.woodLight, 0.3)), { lw: 0.03 });
  // The cabin and the wheelhouse.
  tbox(ctx, F, -2.2, 0.4, -0.62, 0.62, 0.62, 1.42, C.white, { ink, lw: 0.035 });
  tbox(ctx, F, 0.4, 1.25, -0.5, 0.5, 0.62, 1.72, C.white, { ink, lw: 0.035 });
  if (Q.detail) {
    const win = o.lit ? LIT : ink(shade(GLASS, 0.15)), sd = n * 0.625;
    for (let u = -2.0; u < 0.3; u += 0.55) tq(ctx, F, [[u, sd, 0.92], [u + 0.38, sd, 0.92], [u + 0.38, sd, 1.25], [u, sd, 1.25]], win, { lw: 0.02 });
    tq(ctx, F, [[0.5, n * 0.505, 1.25], [1.15, n * 0.505, 1.25], [1.15, n * 0.505, 1.58], [0.5, n * 0.505, 1.58]], win, { lw: 0.02 });
    // The skipper at the wheel, and two passengers.
    const [hx, hy] = P(...F.pt(0.85, n * 0.3, 1.38));
    ctx.beginPath(); ctx.arc(hx, hy, 0.12, 0, TAU); paint(ctx, C.blush, { lw: 0.015 });
    ctx.beginPath(); ctx.arc(hx, hy - 0.04, 0.13, Math.PI, 0); paint(ctx, C.navy, { lw: 0.015 });
    for (const u of [-1.6, -0.5]) { const [px, py] = P(...F.pt(u, n * 0.35, 1.1)); ctx.beginPath(); ctx.arc(px, py, 0.11, 0, TAU); paint(ctx, C.woodLight, { lw: 0.015 }); }
    tbox(ctx, F, -2.3, 0.5, -0.7, 0.7, 1.42, 1.5, ink(INK.signal), { lw: 0.025 });
    tbox(ctx, F, 0.32, 1.33, -0.58, 0.58, 1.72, 1.8, ink(INK.signal), { lw: 0.025 });
    // A mast and its flag.
    line3(ctx, [F.pt(0.8, 0, 1.8), F.pt(0.8, 0, 2.55)], ink(C.ink), 0.035);
    const fl = Math.sin(t * 5) * 0.05;
    tq(ctx, F, [[0.8, 0, 2.55], [0.25, fl, 2.48], [0.8, 0, 2.3]], ink(INK.cranberry), { lw: 0.015 });
    if (F.ax) big(ctx, F.ax, ...F.at(-0.6, n * 0.86), WZ + 0.3, 'WATER TAXI', 0.22, ink(C.ink));
    if (o.lit) glow(ctx, ...F.pt(0.8, 0, 2.6), 0.6, C.white, 0.7);
  }
}
const HULL_C = INK.signal;

// ---------- Up close: the people and creatures ----------
// The gull on the lamppost: as carefully drawn as any goose. Grey back, black
// wingtips with white spots, a yellow beak with its red spot, pink legs, a
// pale eye and a very flat brow. It turns its head now and then.
function gull(ctx, x, y, z, t) {
  const [X, Y] = P(x, y, z);
  const f = Math.sin(t * 0.45) + Math.sin(t * 1.3) * 0.3 > 0.55 ? -1 : 1;
  ctx.save();
  ctx.translate(X, Y);
  if (Q.detail) { ctx.beginPath(); ctx.ellipse(0, 0, 0.3, 0.1, 0, 0, TAU); ctx.fillStyle = alpha(C.ink, 0.15); ctx.fill(); }
  ctx.strokeStyle = C.pink; ctx.lineWidth = 0.06; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-0.06, -0.3); ctx.lineTo(-0.08, 0); ctx.moveTo(0.07, -0.3); ctx.lineTo(0.08, 0); ctx.stroke();
  // Body and tail.
  ctx.beginPath();
  ctx.ellipse(0, -0.44, 0.36, 0.2, -0.08, 0, TAU);
  paint(ctx, C.white, { lw: 0.04 });
  // The folded wing, grey, its tip black with white spots, over the tail.
  ctx.beginPath();
  ctx.moveTo(0.22, -0.56); ctx.quadraticCurveTo(-0.1, -0.66, -0.36, -0.5); ctx.lineTo(-0.6, -0.5); ctx.lineTo(-0.36, -0.36); ctx.quadraticCurveTo(-0.05, -0.32, 0.22, -0.42); ctx.closePath();
  paint(ctx, C.grey, { lw: 0.035 });
  ctx.beginPath(); ctx.moveTo(-0.3, -0.52); ctx.lineTo(-0.6, -0.5); ctx.lineTo(-0.34, -0.4); ctx.closePath(); paint(ctx, C.black, { lw: 0.03 });
  if (Q.detail) { ctx.fillStyle = C.white; for (const sx of [-0.42, -0.5]) { ctx.beginPath(); ctx.arc(sx, -0.48, 0.022, 0, TAU); ctx.fill(); } }
  // Head, turned which way it's looking.
  ctx.scale(f, 1);
  ctx.beginPath(); ctx.arc(0.27, -0.68, 0.14, 0, TAU); paint(ctx, C.white, { lw: 0.035 });
  ctx.beginPath(); ctx.moveTo(0.38, -0.7); ctx.lineTo(0.62, -0.69); ctx.quadraticCurveTo(0.6, -0.62, 0.52, -0.63); ctx.lineTo(0.38, -0.63); ctx.closePath(); paint(ctx, C.mustard, { lw: 0.025 });
  if (Q.detail) {
    ctx.beginPath(); ctx.arc(0.53, -0.64, 0.022, 0, TAU); ctx.fillStyle = C.red; ctx.fill();
    // A pale eye, half shut, under a flat brow: unimpressed.
    ctx.beginPath(); ctx.arc(0.31, -0.71, 0.035, 0, TAU); ctx.fillStyle = C.butter; ctx.fill();
    ctx.beginPath(); ctx.arc(0.315, -0.705, 0.016, 0, TAU); ctx.fillStyle = C.ink; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0.26, -0.735); ctx.lineTo(0.37, -0.735); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.stroke();
  }
  ctx.restore();
}

// The raccoon in the bin, eating somebody's pretzel. out: how far it's up.
function raccoon(ctx, x, y, z, t, out) {
  const [X, Y] = P(x, y, z);
  const chew = Math.sin(t * 9) * 0.02 * out;
  ctx.save();
  ctx.translate(X, Y - out * 0.62);
  // Body, grey, its paws on the rim.
  ctx.beginPath(); ctx.ellipse(0, 0.02, 0.3, 0.26, 0, 0, TAU); paint(ctx, C.grey, { lw: 0.035, dots: shade(C.grey, 0.4), density: 0.15 });
  // The head: grey, white muzzle, the black mask, round ears.
  for (const ex of [-0.17, 0.17]) { ctx.beginPath(); ctx.arc(ex, -0.37, 0.08, 0, TAU); paint(ctx, shade(C.grey, 0.2), { lw: 0.025 }); }
  ctx.beginPath(); ctx.ellipse(0, -0.24 + chew, 0.23, 0.18, 0, 0, TAU); paint(ctx, C.grey, { lw: 0.03 });
  ctx.beginPath(); ctx.ellipse(0, -0.26 + chew, 0.2, 0.07, 0, 0, TAU); paint(ctx, C.ink, { stroke: false });
  ctx.beginPath(); ctx.ellipse(0, -0.15 + chew, 0.11, 0.07, 0, 0, TAU); paint(ctx, C.white, { stroke: false });
  ctx.fillStyle = C.white;
  for (const ex of [-0.08, 0.08]) { ctx.beginPath(); ctx.arc(ex, -0.265 + chew, 0.03, 0, TAU); ctx.fill(); }
  ctx.fillStyle = C.ink;
  ctx.beginPath(); ctx.arc(0, -0.17 + chew, 0.025, 0, TAU); ctx.fill();
  // The pretzel, in both paws.
  ctx.beginPath(); ctx.arc(0.02, -0.02, 0.12, 0, TAU); ctx.moveTo(0.02 + 0.06, -0.02); ctx.arc(0.02, -0.02, 0.05, 0, TAU);
  ctx.strokeStyle = C.brown; ctx.lineWidth = 0.05; ctx.stroke();
  for (const px of [-0.12, 0.15]) { ctx.beginPath(); ctx.arc(px, 0.0, 0.05, 0, TAU); paint(ctx, C.ink, { stroke: false }); }
  ctx.restore();
}
// Its ringed tail, hanging out under the lid while it's shut (the tell).
function tail(ctx, x, y, z, t) {
  const sw = Math.sin(t * 2.2) * 0.12;
  const base = P(x, y, z), tip = P(x + 0.05 + sw * 0.4, y + 0.2, z - 0.55);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(base[0], base[1]); ctx.quadraticCurveTo(base[0] + 0.2 + sw, (base[1] + tip[1]) / 2, tip[0], tip[1]);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.2; ctx.stroke();
  ctx.strokeStyle = C.grey; ctx.lineWidth = 0.13; ctx.stroke();
  ctx.setLineDash([0.07, 0.08]);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.13; ctx.stroke();
  ctx.restore();
}

// The lost glove, pulled down over a bollard's top, fingers up: put out for
// its owner, as you do here. Red wool, a cuff.
function glove(ctx, x, y, z) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.beginPath(); ctx.roundRect(-0.15, -0.12, 0.3, 0.14, 0.04); paint(ctx, C.white, { lw: 0.025 });
  ctx.beginPath();
  ctx.moveTo(-0.15, -0.12);
  ctx.lineTo(-0.16, -0.3);
  for (let i = 0; i < 4; i++) {
    const fx = -0.13 + i * 0.075, h = [0.18, 0.24, 0.22, 0.16][i];
    ctx.lineTo(fx, -0.3 - h); ctx.arc(fx + 0.035, -0.3 - h, 0.035, Math.PI, 0); ctx.lineTo(fx + 0.07, -0.3);
  }
  ctx.lineTo(0.16, -0.12);
  ctx.closePath();
  paint(ctx, C.red, { lw: 0.025, dots: shade(C.red, 0.4), density: 0.18 });
  // The thumb, sticking out.
  ctx.beginPath(); ctx.ellipse(0.2, -0.27, 0.05, 0.1, 0.6, 0, TAU); paint(ctx, C.red, { lw: 0.022 });
  ctx.restore();
}

// The skis, leaning on the family's pile: red with a white stripe (as the
// skier holds them at security, once they're his again), and a tag.
function skis(ctx, x, y) {
  for (const [dx, col] of [[-0.09, C.red], [0.09, shade(C.red, 0.15)]]) {
    const a = [x + dx - 0.07, y, 0.02], b = [x + dx + 0.07, y, 0.02], c = [x + dx - 0.28, y, 2.18], d = [x + dx - 0.42, y, 2.18];
    face(ctx, [a, b, c, d], col, { lw: 0.025 });
    face(ctx, [[x + dx - 0.02, y + 0.005, 0.06], [x + dx + 0.02, y + 0.005, 0.06], [x + dx - 0.33, y + 0.005, 2.14], [x + dx - 0.37, y + 0.005, 2.14]], C.white, { stroke: false });
    box(ctx, x + dx - 0.2, y - 0.05, 0.85, 0.14, 0.1, 0.12, C.ink, { flat: true, stroke: false });
  }
  // The tag: Salt Lake City.
  const [tx, ty] = P(x + 0.12, y + 0.02, 1.2);
  line3(ctx, [[x - 0.05, y + 0.02, 1.32], [x + 0.12, y + 0.02, 1.2]], C.ink, 0.015);
  ctx.beginPath(); ctx.rect(tx, ty - 0.02, 0.28, 0.16); paint(ctx, C.white, { lw: 0.015 });
  if (Q.detail) txt(ctx, tx + 0.14, ty + 0.06, 'SLC', 0.1, C.ink);
}

// The kid in the minivan's back window, pressed to the glass: a little
// sadder every lap. lap: 0 to 7.
const KID = { skin: C.blush, hair: C.mustard };
function kidFace(ctx, X, Y, lap, t) {
  ctx.save();
  ctx.translate(X, Y);
  const r = 0.16, asleep = lap >= 6;
  if (asleep) ctx.rotate(0.35);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); paint(ctx, KID.skin, { lw: 0.02 });
  ctx.beginPath(); ctx.arc(0, -0.03, r + 0.01, Math.PI * 1.05, Math.PI * 1.95); paint(ctx, KID.hair, { stroke: false });
  ctx.fillStyle = C.ink; ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.lineCap = 'round';
  if (asleep) {
    for (const ex of [-0.06, 0.06]) { ctx.beginPath(); ctx.arc(ex, 0.0, 0.03, 0.2, Math.PI - 0.2); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(0, 0.08, 0.025, 0, TAU); ctx.fill();
  } else {
    for (const ex of [-0.06, 0.06]) { ctx.beginPath(); ctx.arc(ex, -0.01, 0.022, 0, TAU); ctx.fill(); }
    ctx.beginPath();
    if (lap === 0) { ctx.arc(0, 0.05, 0.07, 0, Math.PI); ctx.closePath(); ctx.fill(); }
    else if (lap === 1) { ctx.arc(0, 0.04, 0.06, 0.2, Math.PI - 0.2); ctx.stroke(); }
    else if (lap === 2) { ctx.moveTo(-0.05, 0.08); ctx.lineTo(0.05, 0.08); ctx.stroke(); }
    else if (lap === 5) { ctx.ellipse(0, 0.09, 0.04, 0.05, 0, 0, TAU); ctx.fill(); }
    else { ctx.arc(0, 0.13, 0.06, Math.PI + 0.3, -0.3); ctx.stroke(); }
    if (lap >= 4) {
      ctx.fillStyle = C.sky;
      const k = (t * 0.8) % 1;
      for (const ex of lap === 5 ? [-0.07, 0.07] : [0.07]) { ctx.beginPath(); ctx.arc(ex, 0.03 + k * 0.1, 0.022, 0, TAU); ctx.fill(); }
    }
  }
  ctx.restore();
  // Hands: waving at first, then flat on the glass.
  if (!asleep) {
    const wv = lap === 0 ? Math.sin(t * 9) * 0.05 : 0;
    for (const hx of [-0.24, 0.24]) {
      ctx.beginPath(); ctx.arc(X + hx + (hx > 0 ? wv : -wv), Y + (lap <= 1 ? -0.12 : 0.06), 0.06, 0, TAU);
      paint(ctx, KID.skin, { lw: 0.015 });
    }
  }
  // Later, a sign: HELP.
  if (lap === 4 || lap === 5) {
    ctx.beginPath(); ctx.rect(X - 0.16, Y + 0.17, 0.32, 0.12); paint(ctx, C.white, { lw: 0.015 });
    txt(ctx, X, Y + 0.235, 'HELP', 0.09, C.red);
  }
}

// The goose in the taxi's back window: a white head turned to look out, its
// beak just touching the glass, bobbing (the tell, all day).
function gooseHead(ctx, X, Y, t) {
  const b = Math.sin(t * 1.4) * 0.012;
  ctx.save();
  ctx.translate(X, Y + b);
  ctx.beginPath(); ctx.moveTo(-0.02, 0.22); ctx.quadraticCurveTo(-0.06, 0.08, 0, -0.02);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.15; ctx.lineCap = 'round'; ctx.stroke();
  ctx.strokeStyle = C.white; ctx.lineWidth = 0.09; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -0.04, 0.1, 0, TAU); paint(ctx, C.white, { lw: 0.025 });
  ctx.beginPath(); ctx.moveTo(0.07, -0.08); ctx.lineTo(0.25, -0.04); ctx.lineTo(0.07, 0.0); ctx.closePath(); paint(ctx, C.coral, { lw: 0.02 });
  ctx.beginPath(); ctx.arc(0.03, -0.07, 0.022, 0, TAU); ctx.fillStyle = C.ink; ctx.fill();
  ctx.restore();
}
// The lady in the first cab's back window: a white fur hat (the other
// one of the two).
function hatLady(ctx, X, Y) {
  ctx.beginPath(); ctx.arc(X, Y + 0.02, 0.12, 0, TAU); paint(ctx, C.blush, { lw: 0.02 });
  ctx.beginPath(); ctx.ellipse(X, Y - 0.09, 0.17, 0.11, 0, 0, TAU); paint(ctx, C.white, { lw: 0.02, dots: C.grey, density: 0.12 });
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.018;
  for (const ex of [-0.05, 0.05]) { ctx.beginPath(); ctx.arc(X + ex, Y + 0.03, 0.035, 0, TAU); ctx.stroke(); }
}

// A man in an inflatable turkey costume: the fan of tail feathers behind
// him, the round brown body, a turkey's head on top.
const TURKEY = {
  ...look(77), top: C.brown, bottom: C.brown, hat: 'none', style: 'bald',
  wear: (ctx, b) => {
    ctx.beginPath(); ctx.ellipse(0, b.hipY - 0.38, 0.5, 0.55, 0, 0, TAU);
    paint(ctx, C.brown, { lw: 0.04, dots: shade(C.brown, 0.4), density: 0.18 });
    ctx.beginPath(); ctx.ellipse(0.22, b.hipY - 0.4, 0.2, 0.32, 0, 0, TAU); paint(ctx, C.woodLight, { lw: 0.03 });
  },
  face: (ctx, hy) => {
    ctx.beginPath(); ctx.ellipse(0.32, hy + 0.14, 0.06, 0.12, 0.2, 0, TAU); paint(ctx, C.red, { lw: 0.02 });
    ctx.beginPath(); ctx.moveTo(0.3, hy - 0.02); ctx.lineTo(0.45, hy + 0.03); ctx.lineTo(0.3, hy + 0.06); ctx.closePath(); paint(ctx, C.mustard, { lw: 0.015 });
  },
};
function fan(ctx, x, y, z) {
  const [X, Y] = P(x, y, z + 1.45);
  const cols = [C.brown, C.mustard, C.coral, C.brown, C.red, C.mustard, C.brown];
  for (let i = 0; i < 7; i++) {
    const a = Math.PI + 0.25 + (i / 6) * (Math.PI - 0.5);
    ctx.beginPath(); ctx.ellipse(X + Math.cos(a) * 0.55, Y + Math.sin(a) * 0.55, 0.16, 0.42, a + Math.PI / 2, 0, TAU);
    paint(ctx, cols[i], { lw: 0.025 });
  }
}

// ---------- The big still things ----------
// A tunnel's portal: a concrete headwall over the road with grass on top
// (snow, later). mouth: the dark arch on its +x face (the dock's end).
function portal(ctx, ink, night, x0, x1, mouth, words, y1) {
  box(ctx, x0, 0.4, 0, x1 - x0, y1 - 0.4, 2.35, ink(CONC), { dotsL: ink(shade(CONC, 0.45)), top: ink(C.green) });
  if (mouth) {
    const arch = [[x1 + 0.005, 1.05, 0]];
    for (let k = 0; k <= 10; k++) { const a = Math.PI - (k / 10) * Math.PI; arch.push([x1 + 0.005, 2.45 + Math.cos(a) * 1.4, 1.2 + Math.sin(a) * 0.75]); }
    arch.push([x1 + 0.005, 3.85, 0]);
    face(ctx, arch, ink(C.ink), { lw: 0.04 });
    if (night) for (const v of [1.7, 2.45, 3.2]) dot(ctx, x1 + 0.01, v, 1.75, 0.05, LIT, 0);
    lettering(ctx, 'y', x1 + 0.01, 2.45, 2.1, 'TUNNEL', 0.34, ink(C.white), 'Bagel Fat One');
  }
  if (Q.detail) {
    // The headwall's panels.
    for (let x = x0 + 0.8; x < x1 - 0.1; x += 0.8) line3(ctx, [[x, y1 + 0.005, 0.1], [x, y1 + 0.005, 2.3]], ink(shade(CONC, 0.25)), 0.02);
    lettering(ctx, 'x', (x0 + x1) / 2, y1 + 0.01, 1.5, words, 0.26, ink(C.ink), 'Bagel Fat One');
  }
}

// The Central Garage: three decks, open sided, cars inside and on the roof,
// FULL (and also full). Printed day and night: its decks lit after dark.
const GX0 = 34, GX1 = 48, GY0 = 0.4, GY1 = 4.6, GH = 4.8;
const PARKED_IN = [C.red, C.navy, C.white, C.teal, C.mustard, C.grey, INK.cranberry, C.black, C.sky, C.green];
function roofCars(ctx, ink, snow = 0) {
  let i = 0;
  for (const yy of [1.55, 3.45]) {
    for (let x = 36.6; x < 47.2; x += 1.75) {
      i++;
      if ((i * 7) % 5 === 3) continue;
      car(ctx, x, yy, yy < 2 ? -Math.PI / 2 : Math.PI / 2, { color: PARKED_IN[(i * 3) % PARKED_IN.length], ink, z: GH, snow });
    }
  }
}
function garage(ctx, ink, night) {
  const lit = night ? mix(INSIDE, LIT, 0.35) : INSIDE;
  box(ctx, GX0, GY0, 0, GX1 - GX0, GY1 - GY0, GH, ink(lit), { flat: true, top: ink(ISLE), left: night ? lit : undefined, right: night ? shade(lit, 0.1) : undefined });
  if (Q.detail) {
    // Cars parked inside, seen through the open sides.
    let k = 0;
    for (const z of [0, 1.65, 3.25]) {
      for (let x = GX0 + 0.5; x < GX1 - 2; x += 2.25) {
        k++;
        if (z === 0 && x > 43.5) continue;
        const c = ink(mix(PARKED_IN[k % PARKED_IN.length], lit, 0.45));
        face(ctx, [[x, GY1 - 0.3, z + 0.15], [x + 1.8, GY1 - 0.3, z + 0.15], [x + 1.8, GY1 - 0.3, z + 0.6], [x, GY1 - 0.3, z + 0.6]], c, { lw: 0.025 });
        face(ctx, [[x + 0.4, GY1 - 0.3, z + 0.6], [x + 1.4, GY1 - 0.3, z + 0.6], [x + 1.25, GY1 - 0.3, z + 0.95], [x + 0.55, GY1 - 0.3, z + 0.95]], c, { lw: 0.025 });
      }
      for (let y = GY0 + 0.6; y < GY1 - 0.8; y += 2.1) {
        k++;
        const c = ink(mix(PARKED_IN[k % PARKED_IN.length], lit, 0.45));
        face(ctx, [[GX1 - 0.3, y, z + 0.15], [GX1 - 0.3, y + 1.1, z + 0.15], [GX1 - 0.3, y + 1.1, z + 0.62], [GX1 - 0.3, y, z + 0.62]], c, { lw: 0.025 });
      }
    }
  }
  // The decks' edges, and the columns between the openings.
  const band = ink(CONC), bandR = ink(shade(CONC, 0.12));
  for (const [z0, z1] of [[1.2, 1.65], [2.8, 3.25], [4.38, GH]]) {
    face(ctx, [[GX0, GY1, z0], [GX1, GY1, z0], [GX1, GY1, z1], [GX0, GY1, z1]], band, { lw: 0.035, dots: Q.detail ? ink(shade(CONC, 0.4)) : null, density: 0.12 });
    face(ctx, [[GX1, GY0, z0], [GX1, GY1, z0], [GX1, GY1, z1], [GX1, GY0, z1]], bandR, { lw: 0.035 });
  }
  for (let x = GX0; x <= GX1 + 1e-6; x += 2.8) {
    const a = Math.max(GX0, x - 0.17), b = Math.min(GX1, x + 0.17);
    face(ctx, [[a, GY1, 0], [b, GY1, 0], [b, GY1, GH], [a, GY1, GH]], band, { lw: 0.03 });
  }
  for (let y = GY0; y <= GY1 + 1e-6; y += 2.1) {
    const a = Math.max(GY0, y - 0.17), b = Math.min(GY1, y + 0.17);
    face(ctx, [[GX1, a, 0], [GX1, b, 0], [GX1, b, GH], [GX1, a, GH]], bandR, { lw: 0.03 });
  }
  // The entrance, its barrier arm down, and the sign over it: FULL.
  face(ctx, [[44.7, GY1 + 0.01, 0.75], [47.0, GY1 + 0.01, 0.75], [47.0, GY1 + 0.01, 0.85], [44.7, GY1 + 0.01, 0.85]], C.white, { lw: 0.02 });
  for (let x = 45.0; x < 47; x += 0.45) face(ctx, [[x, GY1 + 0.012, 0.75], [x + 0.2, GY1 + 0.012, 0.75], [x + 0.2, GY1 + 0.012, 0.85], [x, GY1 + 0.012, 0.85]], C.red, { stroke: false });
  face(ctx, [[44.9, GY1 + 0.012, 1.24], [46.9, GY1 + 0.012, 1.24], [46.9, GY1 + 0.012, 1.61], [44.9, GY1 + 0.012, 1.61]], C.black, { lw: 0.02 });
  big(ctx, 'x', 45.9, GY1 + 0.02, 1.425, 'FULL', 0.26, night ? tint(C.red, 0.2) : C.red);
  face(ctx, [[40.3, GY1 + 0.012, 1.24], [42.3, GY1 + 0.012, 1.24], [42.3, GY1 + 0.012, 1.61], [40.3, GY1 + 0.012, 1.61]], C.black, { lw: 0.02 });
  big(ctx, 'x', 41.3, GY1 + 0.02, 1.425, 'ALSO FULL', 0.17, night ? tint(C.red, 0.2) : C.red);
  // The roof's back parapets and its bays (the rest is roof(), below).
  box(ctx, GX0, GY0, GH, GX1 - GX0, 0.2, 0.42, ink(CONC), { flat: true, lw: 0.03 });
  box(ctx, GX0, GY0, GH, 0.2, GY1 - GY0, 0.42, ink(CONC), { flat: true, lw: 0.03 });
  if (Q.detail) for (let x = 35.75; x < 47.5; x += 1.75) for (const [y0, y1] of [[0.6, 2.4], [2.6, 4.4]]) line3(ctx, [[x, y0, GH + 0.005], [x, y1, GH + 0.005]], ink(PAINT), 0.03);
  garageRoof(ctx, ink, night, 0);
  // The pay station by the entrance's island (the poke draws its screen).
  box(ctx, 47.25, 4.75, 0, 0.7, 0.5, 1.55, ink(STEEL), { lw: 0.035 });
  box(ctx, 47.2, 4.7, 1.55, 0.8, 0.6, 0.1, ink(C.navy), { flat: true, lw: 0.025 });
  face(ctx, [[47.35, 5.255, 0.55], [47.85, 5.255, 0.55], [47.85, 5.255, 0.62], [47.35, 5.255, 0.62]], C.ink, { stroke: false });
}
// The garage's roof: the stair tower, the cars, the lamps, the front
// parapets and the name. Drawn again over the snow (snow: 1), white.
function garageRoof(ctx, ink, night, snow) {
  const sn = ink(C.white);
  if (snow) face(ctx, [[GX0 + 0.2, GY0 + 0.2, GH + 0.01], [GX1 - 0.2, GY0 + 0.2, GH + 0.01], [GX1 - 0.2, GY1 - 0.2, GH + 0.01], [GX0 + 0.2, GY1 - 0.2, GH + 0.01]], sn, { stroke: false });
  box(ctx, 34.3, 0.7, GH, 2.0, 1.8, 1.7, ink(CONC), { dotsL: ink(shade(CONC, 0.4)), lw: 0.035 });
  face(ctx, [[34.8, 2.505, GH], [35.5, 2.505, GH], [35.5, 2.505, GH + 1.15], [34.8, 2.505, GH + 1.15]], night ? LIT : ink(GLASS), { lw: 0.025 });
  face(ctx, [[35.65, 2.51, GH + 0.8], [36.15, 2.51, GH + 0.8], [36.15, 2.51, GH + 1.3], [35.65, 2.51, GH + 1.3]], ink(C.navy), { lw: 0.02 });
  big(ctx, 'x', 35.9, 2.52, GH + 1.05, 'P', 0.34, ink(C.white));
  if (snow) rect(ctx, 34.27, 0.67, 2.06, 1.86, GH + 1.71, sn, { lw: 0.02 });
  roofCars(ctx, ink, snow);
  for (const x of [40.2, 45.4]) {
    post(ctx, x, 2.5, GH, 1.7, ink(STEEL), 0.05);
    box(ctx, x - 0.25, 2.3, GH + 1.7, 0.5, 0.4, 0.14, night ? LIT : ink(STEEL), { flat: true, lw: 0.025 });
    if (snow) rect(ctx, x - 0.27, 2.28, 0.54, 0.44, GH + 1.85, sn, { lw: 0.015 });
  }
  box(ctx, GX1 - 0.2, GY0, GH, 0.2, GY1 - GY0, 0.42, ink(shade(CONC, 0.05)), { flat: true, lw: 0.03 });
  box(ctx, GX0, GY1 - 0.2, GH, GX1 - GX0, 0.2, 0.42, ink(CONC), { flat: true, lw: 0.03 });
  if (snow) {
    rect(ctx, GX1 - 0.23, GY0 - 0.03, 0.26, GY1 - GY0 + 0.06, GH + 0.43, sn, { lw: 0.02 });
    rect(ctx, GX0 - 0.03, GY1 - 0.23, GX1 - GX0 + 0.06, 0.26, GH + 0.43, sn, { lw: 0.02 });
  }
  big(ctx, 'x', 41, GY1 + 0.01, GH + 0.2, 'CENTRAL GARAGE', 0.3, ink(C.navy));
}

// The control tower, the hero: Logan's own, two tall segmented elliptical
// pylons with a glazed bridge between them partway up, a collar, and the
// glass cab on top, its windows leaning out. Printed day and night (the cab
// lit). About 15 to its beacon (the map gives the Curb's picture room for
// it: map.js, h).
const TX = 54, TY = 2.0;
// Its heights: the pylons' tops, the cab's foot and top, the roof, the beacon.
const TZ = { pyl: 11.72, cab0: 12.22, cab1: 13.82, roof: 13.98, beacon: 14.92 };
const ellipse = (cx, cy, ax, ay, z, n = 16) => Array.from({ length: n }, (_, i) => { const a = (i / n) * TAU; return [cx + Math.cos(a) * ax, cy + Math.sin(a) * ay, z]; });
const ring = (cx, cy, r, z, n = 8, rot = Math.PI / 8) => Array.from({ length: n }, (_, i) => { const a = (i / n) * TAU + rot; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, z]; });
function prism(ctx, lo, hi, fill, o = {}) {
  const faces = [];
  for (let i = 0; i < lo.length; i++) faces.push({ pts: [lo[i], lo[(i + 1) % lo.length], hi[(i + 1) % lo.length], hi[i]], fill, dots: o.dots, density: 0.14 });
  faces.push({ pts: hi, fill: o.top || fill });
  faces.push({ pts: [...lo].reverse(), fill });
  solid(ctx, faces, { ink: o.ink, lw: o.lw ?? 0.045 });
}
function pylon(ctx, cx, ink) {
  const col = CONC, joint = shade(CONC, 0.35);
  let z = 1.7;
  for (let i = 0; i < 6; i++) {
    const k = 1 - i * 0.025, z1 = z + 1.55;
    prism(ctx, ellipse(cx, TY, 0.6 * k, 0.92 * k, z), ellipse(cx, TY, 0.6 * k, 0.92 * k, z1), col, { ink, dots: Q.detail ? shade(col, 0.45) : null, lw: 0.04 });
    if (i < 5) prism(ctx, ellipse(cx, TY, 0.52 * k, 0.82 * k, z1), ellipse(cx, TY, 0.52 * k, 0.82 * k, z1 + 0.12), joint, { ink, lw: 0.03 });
    z = z1 + 0.12;
  }
  return z;
}
function tower(ctx, ink, night) {
  // The base: a low concrete building with its door and its name.
  box(ctx, 51.3, 0.5, 0, 5.5, 3.0, 1.7, ink(CONC), { dotsL: ink(shade(CONC, 0.4)), lw: 0.04 });
  if (Q.detail) {
    face(ctx, [[51.5, 3.505, 0.95], [56.6, 3.505, 0.95], [56.6, 3.505, 1.4], [51.5, 3.505, 1.4]], night ? LIT : ink(GLASS), { lw: 0.025 });
    for (let x = 52.2; x < 56.6; x += 0.7) line3(ctx, [[x, 3.51, 0.95], [x, 3.51, 1.4]], ink(CONC), 0.04);
    face(ctx, [[53.5, 3.508, 0], [54.5, 3.508, 0], [54.5, 3.508, 0.85], [53.5, 3.508, 0.85]], night ? LIT : ink(shade(GLASS, 0.2)), { lw: 0.025 });
    line3(ctx, [[54, 3.512, 0], [54, 3.512, 0.85]], ink(C.ink), 0.02);
    lettering(ctx, 'x', 52.45, 3.512, 0.55, 'CONTROL TOWER', 0.17, ink(C.ink), 'Bagel Fat One');
    face(ctx, [[55.0, 3.508, 0.22], [56.5, 3.508, 0.22], [56.5, 3.508, 0.72], [55.0, 3.508, 0.72]], ink(C.white), { lw: 0.02 });
    lettering(ctx, 'x', 55.75, 3.512, 0.56, 'PLEASE DO', 0.12, ink(C.red));
    lettering(ctx, 'x', 55.75, 3.512, 0.38, 'NOT HONK', 0.12, ink(C.red));
  }
  // The two pylons, the far one first, and the glazed bridge between them.
  pylon(ctx, 52.65, ink);
  tbox(ctx, heading(TX, TY, 0, 0), -0.8, 0.8, -0.6, 0.6, 6.3, 7.45, night ? mix(INSIDE, LIT, 0.5) : GLASS, { ink: night ? null : ink, top: ink(CONC) });
  if (Q.detail) {
    for (let x = 53.4; x < 54.7; x += 0.4) line3(ctx, [[x, TY + 0.605, 6.3], [x, TY + 0.605, 7.45]], ink(CONC), 0.04);
    box(ctx, 53.1, TY - 0.7, 7.45, 1.8, 1.4, 0.12, ink(CONC), { flat: true, lw: 0.03 });
    for (let x = 53.2; x < 54.95; x += 0.35) line3(ctx, [[x, TY + 0.68, 7.57], [x, TY + 0.68, 8.0]], ink(C.ink), 0.025);
    line3(ctx, [[53.15, TY + 0.68, 8.0], [54.85, TY + 0.68, 8.0]], ink(C.ink), 0.03);
  }
  const top = pylon(ctx, 55.35, ink);
  // The collar that gathers them, the catwalk, the cab.
  prism(ctx, ellipse(TX, TY, 2.1, 1.05, top, 20), ellipse(TX, TY, 2.2, 1.12, top + 0.5, 20), CONC, { ink, lw: 0.04, dots: Q.detail ? shade(CONC, 0.45) : null });
  const z0 = top + 0.5, z1 = z0 + 1.6;
  prism(ctx, ring(TX, TY, 2.05, z0), ring(TX, TY, 2.05, z0 + 0.14), C.ink, { ink, lw: 0.03 });
  const lo = ring(TX, TY, 1.8, z0 + 0.14), hi = ring(TX, TY, 2.25, z1);
  // Which of the cab's eight windows face you (the rest show from inside).
  const sides = lo.map((p, i) => {
    const j = (i + 1) % 8, a = ((i + 0.5) / 8) * TAU + Math.PI / 8;
    // (Its outward normal leans down, as the glass leans out.)
    const h = z1 - z0 - 0.14, dr = 2.25 - 1.8;
    return { q: [lo[i], lo[j], hi[j], hi[i]], show: h * (Math.cos(a) + Math.sin(a)) - dr / 1.12 > 0 };
  });
  const inside = night ? mix(INSIDE, LIT, 0.55) : mix(INSIDE, C.sky, 0.3);
  for (const s of sides) if (!s.show) face(ctx, s.q, ink(inside), { lw: 0.025 });
  face(ctx, [...lo], ink(shade(inside, 0.2)), { stroke: false });
  if (Q.detail) {
    // The controllers: one with binoculars, on the runway (and the goose).
    for (const [dx, dy, hat] of [[-0.5, 0.2, C.navy], [0.5, -0.2, null]]) {
      const [hx, hy] = P(TX + dx, TY + dy, z0 + 0.95);
      ctx.beginPath(); ctx.ellipse(hx, hy + 0.2, 0.2, 0.14, 0, 0, TAU); paint(ctx, C.white, { lw: 0.02 });
      ctx.beginPath(); ctx.arc(hx, hy, 0.14, 0, TAU); paint(ctx, C.woodLight, { lw: 0.02 });
      ctx.beginPath(); ctx.arc(hx, hy - 0.03, 0.15, Math.PI, 0); paint(ctx, hat || C.brown, { stroke: false });
      if (!hat) { ctx.beginPath(); ctx.rect(hx + 0.02, hy - 0.04, 0.2, 0.1); paint(ctx, C.ink, { stroke: false }); }
    }
  }
  const glass = night ? alpha(LIT, 0.3) : alpha(ink(tint(GLASS, 0.25)), 0.5);
  for (const s of sides) if (s.show) {
    face(ctx, s.q, glass, { lw: 0.035 });
    if (Q.detail && !night) { ctx.save(); ctx.globalAlpha *= 0.4; const [a, b, c, d] = s.q; face(ctx, [a, [lerp(a[0], b[0], 0.25), lerp(a[1], b[1], 0.25), a[2]], [lerp(d[0], c[0], 0.45), lerp(d[1], c[1], 0.45), d[2]], [lerp(d[0], c[0], 0.2), lerp(d[1], c[1], 0.2), d[2]]], C.white, { stroke: false }); ctx.restore(); }
  }
  // The roof, its cap, the mast, the antenna.
  prism(ctx, ring(TX, TY, 2.32, z1), ring(TX, TY, 2.32, z1 + 0.16), C.navy, { ink, lw: 0.035, top: tint(CONC, 0.2) });
  prism(ctx, ring(TX, TY, 1.0, z1 + 0.16), ring(TX, TY, 0.85, z1 + 0.38), CONC, { ink, lw: 0.03 });
  post(ctx, TX, TY, z1 + 0.38, 0.7, ink(C.ink), 0.045);
  line3(ctx, [[TX - 0.6, TY + 0.6, z1 + 0.16], [TX - 0.6, TY + 0.6, z1 + 0.8]], ink(C.ink), 0.03);
  dot(ctx, TX, TY, z1 + 1.1, 0.07, C.red, 0.015);
  for (const p of ring(TX, TY, 2.2, z1 + 0.17, 4, Math.PI / 4)) dot(ctx, p[0], p[1], p[2], 0.05, night ? C.red : shade(C.red, 0.2), 0);
}

// A streetlamp at the curb: a pole, its arm out over the road, its head.
function lamppost(ctx, x, y, ink, lit) {
  box(ctx, x - 0.15, y - 0.15, 0, 0.3, 0.3, 0.25, ink(STEEL), { flat: true, lw: 0.03 });
  box(ctx, x - 0.06, y - 0.06, 0.25, 0.12, 0.12, 3.85, ink(STEEL), { flat: true, lw: 0.025 });
  box(ctx, x - 0.04, y - 1.05, 3.85, 0.08, 1.0, 0.08, ink(STEEL), { flat: true, lw: 0.02 });
  box(ctx, x - 0.2, y - 1.35, 3.72, 0.4, 0.42, 0.18, ink(STEEL), { flat: true, lw: 0.025 });
  face(ctx, [[x + 0.205, y - 1.33, 3.72], [x + 0.205, y - 0.95, 3.72], [x + 0.205, y - 0.95, 3.78], [x + 0.205, y - 1.33, 3.78]], lit ? LIT : ink(C.greyLight), { stroke: false });
  box(ctx, x - 0.09, y - 0.09, 4.1, 0.18, 0.18, 0.05, ink(STEEL), { flat: true, lw: 0.02 });
}
const LAMPS = [[14.5, 7.05], [25.8, 7.2], [38.5, 8.15], [51.2, 8.15], [64.1, 7.05], [77.5, 7.05], [88.2, 7.05], [98.5, 7.05]];

// A billboard at the back, on two legs.
function billboard(ctx, ink, x0, x1, draw) {
  for (const x of [x0 + 0.8, x1 - 0.8]) post(ctx, x, 0.35, 0, 2.0, ink(STEEL), 0.07);
  face(ctx, [[x0, 0.4, 2.0], [x1, 0.4, 2.0], [x1, 0.4, 4.0], [x0, 0.4, 4.0]], ink(C.white), { lw: 0.05 });
  draw(ctx);
}

// A Jersey barrier along the back, in a piece from a to b.
function barrier(ctx, ink, a, b) {
  const lo = [[a, 0.15, 0], [b, 0.15, 0], [b, 0.65, 0], [a, 0.65, 0]], hi = [[a, 0.3, 0.6], [b, 0.3, 0.6], [b, 0.5, 0.6], [a, 0.5, 0.6]];
  solid(ctx, hexa(lo, hi, CONC), { ink, lw: 0.035 });
  if (Q.detail) for (let x = a + 1.5; x < b - 0.2; x += 1.5) line3(ctx, [[x, 0.66, 0.02], [x, 0.51, 0.58]], ink(shade(CONC, 0.3)), 0.02);
}

// ---------- The area ----------
export default {
  id: 'curb',
  name: 'The Curb',
  blurb: 'Departures, where every car stops and a trooper says it can\'t. One minivan has been round all day, and the kid in the back has stopped waving.',
  describe: 'A long departures curb along the back of the airport, a control tower over it: taxis waiting, a garage, a bus stop, a family unloading a hatchback, a couple hugging goodbye, a water taxi dock at one end. A minivan circles all day; snow and night come later.',

  build(R) {
    // ---------- The ground ----------
    // The land from the dock's edge (x 9) on; to the left of it the harbor,
    // which is the paper, so the dock stands in it.
    const back = [];
    for (let x = W; x >= 9 - 1e-9; x -= 0.5) back.push([x, backY(x), 0]);
    const road = [];
    for (let x = ROAD_L; x <= W + 1e-9; x += 0.5) road.push([x, backY(x), 0]);
    for (let x = W; x >= ROAD_L - 1e-9; x -= 0.5) road.push([x, frontY(x), 0]);
    R.floor((ctx) => {
      rect(ctx, 9, 0, W - 9, 12, 0, WALK, { stroke: false });
      face(ctx, [[9, 0, 0], [W, 0, 0], ...back], ISLE, { stroke: false });
      face(ctx, road, TAR, { stroke: false, dots: shade(TAR, 0.35), density: 0.06 });
      // The seawall where the land ends at the right, facing you: granite.
      face(ctx, [[W, 0, 0], [W, 12, 0], [W, 12, WZ], [W, 0, WZ]], GRANITE, { lw: 0.04, dots: shade(GRANITE, 0.4), density: 0.15 });
      if (!Q.detail) return;
      line3(ctx, [[W + 0.005, 0, WZ / 2], [W + 0.005, 12, WZ / 2]], shade(GRANITE, 0.35), 0.025);
      for (let y = 0.6; y < 12; y += 1.2) line3(ctx, [[W + 0.005, y + ((y * 5) % 2 ? 0.6 : 0), 0], [W + 0.005, y + ((y * 5) % 2 ? 0.6 : 0), WZ / 2]], shade(GRANITE, 0.35), 0.02);
      for (let y = 0; y < 12; y += 1.2) line3(ctx, [[W + 0.005, y, WZ / 2], [W + 0.005, y, WZ]], shade(GRANITE, 0.35), 0.02);
    });
    R.rug((ctx) => {
      // The sidewalks' paving, the curbs, the lanes and what's painted on them.
      if (Q.detail) {
        const joint = shade(WALK, 0.12);
        for (let x = 10; x < W; x += 2) line3(ctx, [[x, frontY(x) + 0.2, 0.003], [x, 12, 0.003]], joint, 0.03);
        for (const y of [9.4, 10.9]) line3(ctx, [[9, y, 0.003], [W, y, 0.003]], joint, 0.03);
        for (const y of [5.6, 7.1]) line3(ctx, [[99.8, y, 0.003], [W, y, 0.003]], joint, 0.03);
      }
      const kerb = [], verge = [];
      for (let x = 12.6; x <= W + 1e-9; x += 0.5) kerb.push([x, frontY(x), 0.004]);
      for (let x = W; x >= 12.6 - 1e-9; x -= 0.5) kerb.push([x, frontY(x) + 0.2, 0.004]);
      for (let x = ROAD_L; x <= W + 1e-9; x += 0.5) verge.push([x, backY(x) - 0.2, 0.004]);
      for (let x = W; x >= ROAD_L - 1e-9; x -= 0.5) verge.push([x, backY(x), 0.004]);
      face(ctx, kerb, GRANITE, { stroke: false });
      face(ctx, verge, GRANITE, { stroke: false });
      const dash = (x0, x1, y) => { for (let x = x0; x < x1; x += 2.2) rect(ctx, x, y - 0.06, 1.2, 0.12, 0.005, PAINT, { stroke: false }); };
      dash(14.5, 26, 3.9);
      dash(62.5, 97.5, 3.9);
      // The yellow edge along the island, round its ends.
      const edge = [];
      for (let x = 24; x <= 64.5; x += 0.5) edge.push([x, backY(x) + 0.12, 0.006]);
      line3(ctx, edge, INK.signal, 0.07);
      // A zebra from the garage to the terminal.
      for (let y = 5.75; y < 7.75; y += 0.42) rect(ctx, 35.4, y, 1.5, 0.22, 0.006, PAINT, { stroke: false });
      const words = [['DEPARTURES', 21, 2.45, 0.78], ['NO STOPPING', 42.4, 6.75, 0.6], ['NOT EVEN TO HUG', 50.3, 6.75, 0.42], ['SLOW', 72, 2.45, 0.7], ['TAXI', 77.9, 5.25, 0.6], ['NO STANDING', 85.4, 5.25, 0.42], ['BUS STOP', 95.4, 5.25, 0.42]];
      for (const [text, x, y, s] of words) paintText(ctx, x, y, text, s);
    });

    // ---------- The dock ----------
    // On piles over the harbor: a pier out from the land, the water taxi
    // tied up along its back (the Courier steps off at 6.4, 4.4 and walks it
    // to the land), a walk from it to the terminal's little door, and a
    // harborwalk along the terminal's front (the family running late comes
    // that way at 8:30). The water between is the paper.
    const PIERS = [[2.2, 3.9, 9, 5.5], [4.4, 5.5, 6.4, 10.6], [1.5, 10.6, 9, 12]];
    const fronts = (ctx, ink) => {
      // The fascia along the faces you see, and the piles under them.
      const fas = ink(shade(DECK, 0.25)), side = ink(shade(DECK, 0.15)), pile = ink(PILE);
      for (const [a, b] of [[2.2, 4.4], [6.4, 9]]) face(ctx, [[a, 5.5, 0], [b, 5.5, 0], [b, 5.5, -0.24], [a, 5.5, -0.24]], fas, { lw: 0.03 });
      face(ctx, [[6.4, 5.5, 0], [6.4, 10.6, 0], [6.4, 10.6, -0.24], [6.4, 5.5, -0.24]], side, { lw: 0.03 });
      for (const x of [2.6, 3.9, 7.0, 8.5]) box(ctx, x - 0.12, 5.38, WZ, 0.24, 0.24, -WZ - 0.24, pile, { flat: true, lw: 0.025 });
      for (const y of [7.0, 8.8, 10.3]) box(ctx, 6.28, y - 0.12, WZ, 0.24, 0.24, -WZ - 0.24, pile, { flat: true, lw: 0.025 });
    };
    R.rug((ctx) => {
      for (const [x0, y0, x1, y1] of PIERS) {
        rect(ctx, x0, y0, x1 - x0, y1 - y0, 0, DECK, { stroke: false });
        if (!Q.detail) continue;
        // Planks across each piece.
        const alongX = x1 - x0 > y1 - y0;
        if (alongX) for (let x = x0 + 0.35; x < x1; x += 0.35) line3(ctx, [[x, y0, 0.002], [x, y1, 0.002]], shade(DECK, 0.22), 0.02);
        else for (let y = y0 + 0.35; y < y1; y += 0.35) line3(ctx, [[x0, y, 0.002], [x1, y, 0.002]], shade(DECK, 0.22), 0.02);
      }
      fronts(ctx, ID);
      // Ripples round the piles, and glints on the water.
      if (Q.detail) {
        ctx.strokeStyle = alpha(C.white, 0.5); ctx.lineWidth = 0.035;
        for (const [x, y] of [[2.6, 5.5], [3.9, 5.5], [7.0, 5.5], [8.5, 5.5], [6.4, 7.0], [6.4, 8.8], [6.4, 10.3], [2.45, 3.9], [5.0, 3.9], [8.2, 3.9]]) {
          const [X, Y] = P(x + 0.05, y + 0.05, WZ);
          ctx.beginPath(); ctx.ellipse(X, Y, 0.34, 0.12, 0, 0.1, Math.PI - 0.1); ctx.stroke();
        }
        for (const [x, y, w] of [[0.6, 1.0, 1.2], [3.4, 0.5, 0.9], [7.2, 9.6, 0.9], [2.0, 8.2, 0.8], [7.8, 6.6, 0.7], [0.4, 6.8, 1.0]]) line3(ctx, [[x, y, WZ], [x + w, y, WZ]], alpha(C.white, 0.45), 0.04);
      }
    });
    // The pier's faces printed again at night (the deck's in the night's veil).
    R.rug((ctx) => fronts(ctx, dusk), { fade: (t) => nightK(t) });

    // ---------- Snow and night on the ground ----------
    const LANDS = [[9, 0, W, 12], ...PIERS];
    snowCover(R, LANDS, { clear: [[ROAD_L, 1.5, W, 3.4], [33, 6.0, 56, 7.5], [27, 3.0, 33.5, 6.6], [55.5, 3.0, 61.5, 6.6]] });
    nightGround(R, LANDS);
    // The terminal's light on the snow by its front, and the doors.
    for (const x of [4.5, 18.5, 32, 46, 60, 74, 88]) nightGlow(R, x, 11.7, 1.4, x === 18.5 ? 3.6 : 2.6, LIT, x === 18.5 ? 0.85 : 0.5);

    // ---------- Printed things (day inks, and dusk inks after dark) ----------
    // A still thing printed twice, as kit.js printed(), with its own depth.
    const print = (x, y, draw, o = {}) => {
      const on = o.on || (() => true), dp = o.depth != null ? { depth: o.depth } : {};
      R.thing(x, y, (ctx) => draw(ctx, ID, false), { on: (t) => on(t) && !nightPrint(t), ...dp });
      R.thing(x, y, (ctx) => draw(ctx, dusk, true), { on: (t) => on(t) && nightPrint(t), ...dp });
    };
    // Snow lying on top of something, printed the same way, as it settles.
    const snowy = (x, y, draw, depth) => {
      R.thing(x, y, (ctx) => draw(ctx, ID), { fade: settle, on: (t) => !nightPrint(t), depth });
      R.thing(x, y, (ctx) => draw(ctx, dusk), { fade: settle, on: nightPrint, depth });
    };
    const cap = (x, y, z, w, d) => snowy(x + w, y + d, (ctx, ink) => rect(ctx, x - 0.04, y - 0.04, w + 0.08, d + 0.08, z + 0.012, ink(C.white), { lw: 0.02 }), x + w + y + d + 0.01);

    // The tunnels: under the harbor by the dock, and under arrivals.
    print(11.5, 4.0, (ctx, ink, night) => portal(ctx, ink, night, 9, 11.5, true, 'TO BOSTON', 4.0), { depth: 11.9 });
    print(W, 4.4, (ctx, ink, night) => portal(ctx, ink, night, 100.8, W, false, 'ALL POINTS', 4.4), { depth: 108.4 });
    cap(9, 0.4, 2.35, 2.5, 3.6);
    cap(100.8, 0.4, 2.35, W - 100.8, 4.0);

    // The barriers along the back, and pigeons on them.
    for (const [x0, x1] of [[12, 27], [62, 100.5]]) for (const [a, b] of pieces(x0, x1, 5)) {
      print(a, 0.65, (ctx, ink) => barrier(ctx, ink, a, b), { depth: a + 0.15 });
      cap(a, 0.3, 0.6, b - a, 0.2);
    }
    for (const [x, d] of [[18.2, 'r'], [19, 'l'], [86.4, 'r']]) {
      R.thing(x, 0.4, (ctx) => {
        const [X, Y] = P(x, 0.4, 0.62);
        ctx.save(); ctx.translate(X, Y); ctx.scale(d === 'l' ? -1 : 1, 1);
        ctx.beginPath(); ctx.ellipse(0, -0.14, 0.18, 0.11, 0, 0, TAU); paint(ctx, C.grey, { lw: 0.025 });
        ctx.beginPath(); ctx.arc(0.13, -0.27, 0.07, 0, TAU); paint(ctx, shade(C.grey, 0.15), { lw: 0.02 });
        ctx.beginPath(); ctx.moveTo(0.19, -0.28); ctx.lineTo(0.26, -0.26); ctx.lineTo(0.19, -0.24); ctx.fillStyle = C.ink; ctx.fill();
        ctx.restore();
      }, { depth: x + 0.8 });
    }

    // Two billboards at the back: Flight 1's airline, and the drink.
    print(15, 0.4, (ctx, ink) => billboard(ctx, ink, 15, 21.6, () => {
      face(ctx, [[15.1, 0.405, 2.1], [21.5, 0.405, 2.1], [21.5, 0.405, 3.9], [15.1, 0.405, 3.9]], ink(LIVERY.spite.tail), { stroke: false });
      big(ctx, 'x', 18.3, 0.41, 3.35, 'SPITE', 0.62, ink(C.ink));
      lettering(ctx, 'x', 18.3, 0.41, 2.55, 'ALWAYS ON TIME. TECHNICALLY.', 0.22, ink(C.ink));
    }), { depth: 15.2 });
    print(65, 0.4, (ctx, ink) => billboard(ctx, ink, 65, 71.6, () => {
      face(ctx, [[65.1, 0.405, 2.1], [71.5, 0.405, 2.1], [71.5, 0.405, 3.9], [65.1, 0.405, 3.9]], ink(BRAND.can), { stroke: false });
      big(ctx, 'x', 68.8, 0.41, 3.3, BRAND.name, 0.48, ink(BRAND.ink));
      lettering(ctx, 'x', 68.8, 0.41, 2.6, BRAND.line, 0.26, ink(BRAND.ink));
      // A can, sweating.
      face(ctx, [[65.5, 0.41, 2.25], [66.3, 0.41, 2.25], [66.3, 0.41, 3.7], [65.5, 0.41, 3.7]], ink(C.white), { lw: 0.03 });
      face(ctx, [[65.6, 0.415, 2.6], [66.2, 0.415, 2.6], [66.2, 0.415, 3.3], [65.6, 0.415, 3.3]], ink(BRAND.can), { stroke: false });
    }), { depth: 65.2 });

    // ---------- The water taxi ----------
    // Tied up along the pier's back when the Courier steps off at 5am and
    // from 12:30am (he runs for it, and goes home on it), and in and out a
    // couple of times between; no boats in the storm.
    const BD = [5.0, 2.95], BR = [0.4, 2.95], BE = [-7.5, -7.5], CTRL = [-3.4, 2.95];
    const DOCKED = [[0, 13], [78, 100], [150, 168], [328, LOOP + 1]];
    const docked = (t) => { const s = mod(t, LOOP); return DOCKED.some(([a, b]) => s >= a && s < b); };
    const boatAt = (t) => {
      const s = mod(t, LOOP);
      if (docked(t)) return { x: BD[0], y: BD[1], ang: 0, a: 1 };
      for (const [, b] of DOCKED) {
        const k = s - b;
        if (k >= 0 && k < 14) {
          if (k < 3) { const q = smooth(k / 3); return { x: lerp(BD[0], BR[0], q), y: BD[1], ang: 0, a: 1, moving: true }; }
          const angE = Math.atan2(BE[1] - BR[1], BE[0] - BR[0]);
          if (k < 5) return { x: BR[0], y: BR[1], ang: lerp(0, angE, smooth((k - 3) / 2)), a: 1, moving: true };
          const q = (k - 5) / 9;
          return { x: lerp(BR[0], BE[0], q * q), y: lerp(BR[1], BE[1], q * q), ang: angE, a: 1 - smooth((q - 0.35) / 0.6), moving: true };
        }
      }
      for (const [a] of DOCKED) {
        const k = a - s;
        if (a > 0 && k > 0 && k <= 12) {
          const q = smooth((12 - k) / 12), u = 1 - q;
          const x = u * u * BE[0] + 2 * u * q * CTRL[0] + q * q * BD[0], y = u * u * BE[1] + 2 * u * q * CTRL[1] + q * q * BD[1];
          const dx = 2 * u * (CTRL[0] - BE[0]) + 2 * q * (BD[0] - CTRL[0]), dy = 2 * u * (CTRL[1] - BE[1]) + 2 * q * (BD[1] - CTRL[1]);
          return { x, y, ang: Math.atan2(dy, dx), a: smooth((12 - k) / 5), moving: true };
        }
      }
      return null;
    };
    // The pier's deck (and its front edge), on the screen: the boat behind
    // it is drawn round it, not over it.
    const DECK_CLIP = [[2.2, 3.9, 0], [9, 3.9, 0], [9, 5.5, 0], [9, 5.5, -0.25], [2.2, 5.5, -0.25], [2.2, 5.5, 0]];
    R.mover((t) => { const b = boatAt(t); return b || HIDE; }, (ctx, t, b) => {
      if (b.hide) return;
      ctx.save();
      const clip = new Path2D();
      clip.rect(-500, -500, 1000, 1000);
      DECK_CLIP.forEach((p, i) => { const [X, Y] = P(...p); i ? clip.lineTo(X, Y) : clip.moveTo(X, Y); });
      clip.closePath();
      ctx.clip(clip, 'evenodd');
      if (b.a < 1) ctx.globalAlpha *= b.a;
      const ang = b.ang;
      const night = nightPrint(t);
      ferry(ctx, b.x, b.y, ang, t, { ink: night ? dusk : null, lit: lightsOn(t) });
      if (b.moving && Q.detail) {
        // A wake.
        const F = heading(b.x, b.y, WZ, ang);
        ctx.strokeStyle = alpha(C.white, 0.7); ctx.lineWidth = 0.05;
        for (let i = 1; i <= 3; i++) {
          const k = (t * 1.5 + i / 3) % 1;
          ctx.beginPath();
          const [ax, ay] = P(...F.pt(-2.6 - k * 2, -0.9 - k * 0.8, 0)), [bx, by] = P(...F.pt(-2.6 - k * 2, 0.9 + k * 0.8, 0));
          ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
          ctx.globalAlpha *= 1 - k * 0.6; ctx.stroke(); ctx.globalAlpha /= 1 - k * 0.6;
        }
      } else if (Q.detail) {
        // Tied up: its lines to the piles.
        line3(ctx, [[7.4, 3.4, 0.0], [8.2, 3.95, 0.6]], C.woodLight, 0.035);
        line3(ctx, [[2.8, 3.4, 0.0], [2.45, 3.95, 0.6]], C.woodLight, 0.035);
      }
      ctx.restore();
    });
    // The piles it ties to, standing up through the pier's back edge.
    for (const x of [2.45, 5.0, 8.2]) {
      R.thing(x, 4.08, (ctx) => {
        box(ctx, x - 0.13, 3.82, WZ, 0.26, 0.26, 0.6 - WZ, PILE, { flat: true, lw: 0.03 });
        box(ctx, x - 0.15, 3.8, 0.6, 0.3, 0.3, 0.06, C.ink, { flat: true, lw: 0.02 });
      });
      cap(x - 0.13, 3.82, 0.66, 0.26, 0.26);
    }
    // Rails round the water, with a life ring.
    const rail = (x0, y0, x1, y1) => {
      R.thing(Math.max(x0, x1), Math.max(y0, y1), (ctx) => {
        const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(len / 1.1));
        for (let i = 0; i <= n; i++) { const k = i / n; post(ctx, lerp(x0, x1, k), lerp(y0, y1, k), 0, 1.0, C.white, 0.045); }
        line3(ctx, [[x0, y0, 1.0], [x1, y1, 1.0]], C.ink, 0.07);
        line3(ctx, [[x0, y0, 1.0], [x1, y1, 1.0]], C.white, 0.04);
        line3(ctx, [[x0, y0, 0.5], [x1, y1, 0.5]], C.white, 0.035);
      });
    };
    rail(2.4, 5.45, 4.35, 5.45); rail(6.45, 5.45, 8.9, 5.45);
    rail(4.42, 5.6, 4.42, 10.5); rail(6.38, 5.6, 6.38, 8.0); rail(6.38, 8.0, 6.38, 10.5);
    rail(1.6, 10.65, 4.35, 10.65); rail(6.45, 10.65, 8.9, 10.65);
    R.thing(7.75, 5.5, (ctx) => {
      const [X, Y] = P(7.75, 5.47, 0.7);
      ctx.beginPath(); ctx.arc(X, Y, 0.26, 0, TAU); ctx.arc(X, Y, 0.13, 0, TAU, true); paint(ctx, INK.safety, { lw: 0.025 });
      if (Q.detail) { ctx.strokeStyle = C.white; ctx.lineWidth = 0.13; for (const a of [0.5, 2.1, 3.7, 5.3]) { ctx.beginPath(); ctx.arc(X, Y, 0.195, a, a + 0.35); ctx.stroke(); } }
    });
    // The ticket booth at the pier's end: WATER TAXI, and when the next is.
    print(3.4, 5.3, (ctx, ink, night) => {
      box(ctx, 2.3, 4.1, 0, 1.1, 1.2, 1.9, ink(C.white), { lw: 0.035 });
      face(ctx, [[2.45, 5.305, 0.9], [3.25, 5.305, 0.9], [3.25, 5.305, 1.55], [2.45, 5.305, 1.55]], night ? LIT : ink(GLASS), { lw: 0.025 });
      box(ctx, 2.15, 3.95, 1.9, 1.4, 1.5, 0.14, ink(INK.signal), { flat: true, lw: 0.03 });
      face(ctx, [[3.405, 4.25, 1.05], [3.405, 5.15, 1.05], [3.405, 5.15, 1.65], [3.405, 4.25, 1.65]], ink(C.ink), { lw: 0.02 });
      lettering(ctx, 'y', 3.41, 4.7, 1.47, 'NEXT BOAT', 0.1, ink(INK.signal));
      lettering(ctx, 'y', 3.41, 4.7, 1.25, 'SOON-ISH', 0.13, ink(C.white));
      face(ctx, [[2.2, 5.455, 2.08], [3.5, 5.455, 2.08], [3.5, 5.455, 2.42], [2.2, 5.455, 2.42]], ink(INK.signal), { lw: 0.025 });
      big(ctx, 'x', 2.85, 5.46, 2.25, 'WATER TAXI', 0.19, ink(C.ink));
    });
    cap(2.15, 3.95, 2.04, 1.4, 1.5);
    // Waiting for the next boat (not in the storm), and a man fishing off
    // the harborwalk all day: the fish aren't biting either.
    const boats = (t) => { const h = hour(t); return h >= 6 && h < 17.5; };
    stay(R, 3.95, 5.0, look(31), { dir: 'l', bag: { color: C.navy }, on: boats });
    stay(R, 7.6, 5.05, look(36, 'traveler', { hat: 'beanie' }), { dir: 'l', back: true, on: boats });
    R.thing(7.6, 11.0, (ctx, t) => {
      const lk = look(44, 'traveler', { top: C.green, hat: 'cap' });
      bag(ctx, 8.35, 11.2, 0, { kind: 'box', color: C.white, tag: false });
      person(ctx, 7.6, 11.0, 0, { ...lk, pose: 'point', dir: 'r', back: true }, 0);
      const bob = WZ + 0.04 * Math.sin(t * 2.3) - (Math.sin(t * 0.37) > 0.92 ? 0.12 : 0);
      line3(ctx, [[7.4, 10.7, 1.5], [7.7, 9.4, 2.6]], C.brown, 0.035);
      line3(ctx, [[7.7, 9.4, 2.6], [7.7, 9.2, bob + 0.1]], alpha(C.ink, 0.6), 0.015);
      dot(ctx, 7.7, 9.2, bob + 0.08, 0.07, C.red, 0.015);
      if (lightsOn(t)) glow(ctx, 8.35, 11.2, 0.6, 1.2, LIT, 0.7);
    }, { anim: true, depth: 19.7 });
    // A lobster buoy, bobbing off the end.
    R.thing(0.7, 1.6, (ctx, t) => {
      const z = WZ + 0.05 * Math.sin(t * 1.8 + 1);
      const [X, Y] = P(0.7, 1.6, z);
      ctx.beginPath(); ctx.ellipse(X, Y - 0.18, 0.13, 0.22, 0.1 * Math.sin(t * 1.3), 0, TAU); paint(ctx, C.white, { lw: 0.025 });
      ctx.beginPath(); ctx.ellipse(X, Y - 0.12, 0.125, 0.07, 0, 0, TAU); paint(ctx, C.red, { stroke: false });
    }, { anim: true });

    // ---------- The left end: the drop-off lane ----------
    // The hatchback, its hatch up, and the family unloading eleven bags.
    // Dad lifts one out and puts it on the pile; the kid takes one off the
    // pile and puts it back in the car. Eleven, all day.
    const HATCH = { x: 17, y: 5.4 };
    print(HATCH.x, HATCH.y + 0.8, (ctx, ink) => car(ctx, HATCH.x, HATCH.y, Math.PI, { kind: 'hatch', color: C.teal, ink, hatch: true, roofbox: C.ink }));
    snowy(HATCH.x, HATCH.y + 0.82, (ctx, ink) => {
      const F = heading(HATCH.x, HATCH.y, 0, Math.PI);
      tq(ctx, F, [[-1.25, -0.6, 1.64], [0.15, -0.6, 1.64], [0.15, 0.6, 1.64], [-1.25, 0.6, 1.64]], ink(C.white), { lw: 0.02 });
      tq(ctx, F, [[0.6, -0.65, 0.73], [1.4, -0.65, 0.73], [1.4, 0.65, 0.73], [0.6, 0.65, 0.73]], ink(C.white), { stroke: false });
    }, HATCH.x + HATCH.y + 0.83);
    const PILE_BAGS = [
      [14.8, 7.55, 0, { kind: 'case', color: C.black, along: 'x' }],
      [15.5, 7.7, 0, { kind: 'case', color: C.navy, along: 'x' }],
      [15.15, 7.6, 0.74, { kind: 'duffel', color: C.red, along: 'x' }],
      [16.45, 7.8, 0, { kind: 'case', color: INK.cranberry, along: 'x', handle: true }],
      [17.3, 7.7, 0, { kind: 'box', color: C.woodLight }],
      [17.3, 7.7, 0.4, { kind: 'box', color: C.white }],
      [18.1, 7.65, 0, { kind: 'duffel', color: C.teal, along: 'y' }],
      [18.85, 7.9, 0, { kind: 'case', color: C.grey, along: 'x' }],
      [16.3, 8.45, 0, { kind: 'garment', color: C.purple, along: 'x' }],
      [19.6, 7.75, 0, { kind: 'pack', color: C.mustard }],
      [14.9, 8.45, 0, { kind: 'case', color: C.coral, along: 'y', handle: true }],
    ];
    for (const [a, b] of [[14, 16], [16, 17.9], [17.9, 20]]) {
      const mine = PILE_BAGS.filter(([x]) => x >= a && x < b);
      R.thing(b, 8.6, (ctx) => { for (const [x, y, z, o] of mine) bag(ctx, x, y, z, { tag: C.white, ...o }); });
    }
    R.thing(20.95, 8.0, (ctx) => {
      // The dog in its crate, the twelfth thing nobody counts.
      box(ctx, 20.05, 7.3, 0, 0.9, 0.7, 0.7, C.greyLight, { lw: 0.03 });
      if (Q.detail) {
        face(ctx, [[20.95, 7.38, 0.08], [20.95, 7.92, 0.08], [20.95, 7.92, 0.62], [20.95, 7.38, 0.62]], C.ink, { lw: 0.02 });
        for (let y = 7.45; y < 7.9; y += 0.1) line3(ctx, [[20.955, y, 0.1], [20.955, y, 0.6]], C.greyLight, 0.025);
        dot(ctx, 20.9, 7.65, 0.38, 0.13, C.brown, 0.015);
      }
    });
    // The skis, propped by the pile, till their owner's found at security;
    // then just their claim tag, left on the ground.
    R.thing(21.55, 7.45, (ctx) => {
      if (!R.found('security:skier')) { skis(ctx, 21.55, 7.42); return; }
      const [X, Y] = P(21.5, 7.42, 0.02);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.3, 0.09, 0, 0, TAU); ctx.fillStyle = alpha(C.ink, 0.12); ctx.fill();
      ctx.beginPath(); ctx.moveTo(X - 0.14, Y - 0.02); ctx.lineTo(X + 0.12, Y - 0.08); ctx.lineTo(X + 0.18, Y + 0.02); ctx.lineTo(X - 0.08, Y + 0.08); ctx.closePath(); paint(ctx, C.white, { lw: 0.02 });
      if (Q.detail) label(ctx, 21.5, 7.42, 0.03, 'CLAIMED', 0.07, C.red, 'Rethink Sans');
    }, { anim: true });
    R.find({ id: 'skis', label: 'A pair of skis', at: [21.5, 7.4, 1.2], r: 0.8 });
    // Dad, at the hatch.
    const DAD = look(12, 'traveler', { top: C.red, hat: 'cap', style: 'short' });
    R.mover((t) => {
      const k = mod(t, 5), n = Math.floor(t / 5);
      const A = [19.3, 5.65], B = [19.3, 6.95];
      if (k < 1) return { x: A[0], y: A[1], dir: 'l', back: true, pose: 'carry', bag: k > 0.6, n };
      if (k < 2.2) { const q = (k - 1) / 1.2; return { x: lerp(A[0], B[0], q), y: lerp(A[1], B[1], q), dir: 'l', pose: 'walk', bag: true, n }; }
      if (k < 2.8) return { x: B[0], y: B[1], dir: 'l', pose: 'carry', bag: k < 2.55, n };
      if (k < 4) { const q = (k - 2.8) / 1.2; return { x: lerp(B[0], A[0], q), y: lerp(B[1], A[1], q), dir: 'r', back: true, pose: 'walk', n }; }
      return { x: A[0], y: A[1], dir: 'l', back: true, pose: 'carry', n };
    }, (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, { ...DAD, pose: p.pose, dir: p.dir, back: p.back }, t);
      if (p.bag) bag(ctx, p.x - 0.35, p.y + 0.1, 1.0, { kind: p.n % 3 ? 'case' : 'duffel', color: BAGS[p.n % BAGS.length], lie: true, along: 'x', tag: false });
    });
    // The kid, putting them back.
    const KIDLK = look(9, 'traveler', { top: C.pink, hat: 'beanie' });
    R.mover((t) => {
      const k = mod(t - 2.5, 5), n = Math.floor((t - 2.5) / 5);
      const A = [17.9, 7.15], B = [16.5, 6.45];
      if (k < 1.6) { const q = k / 1.6; return { x: lerp(A[0], B[0], q), y: lerp(A[1], B[1], q), dir: 'l', back: true, pose: 'walk', bag: true, n }; }
      if (k < 2.4) return { x: B[0], y: B[1], dir: 'l', back: true, pose: 'carry', bag: k < 2.1, n };
      if (k < 4) { const q = (k - 2.4) / 1.6; return { x: lerp(B[0], A[0], q), y: lerp(B[1], A[1], q), dir: 'r', pose: 'walk', n }; }
      return { x: A[0], y: A[1], dir: 'l', pose: 'carry', bag: k > 4.6, n };
    }, (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, { ...KIDLK, scale: 0.66, pose: p.pose, dir: p.dir, back: p.back }, t);
      if (p.bag) bag(ctx, p.x - 0.18, p.y + 0.05, 0.62, { kind: 'pack', color: BAGS[(p.n + 4) % BAGS.length], s: 0.8 });
    });
    // Mom, with the list. Eleven.
    const MOM = look(16, 'traveler', { top: C.purple, style: 'long', hat: 'none' });
    R.thing(13.5, 8.05, (ctx, t) => {
      person(ctx, 13.5, 8.05, 0, { ...MOM, pose: 'read', dir: 'r' }, t);
      if (!Q.detail) return;
      const [X, Y] = P(13.85, 8.05, 1.25);
      ctx.beginPath(); ctx.rect(X - 0.05, Y - 0.22, 0.24, 0.3); paint(ctx, C.white, { lw: 0.02 });
      const k = mod(t, 30), line = k < 2.6 ? 'Eleven.' : k > 10 && k < 12.6 ? 'Still eleven.' : k > 20 && k < 22.8 ? 'Gary. It\'s eleven.' : null;
      if (line) speech(ctx, 13.5, 8.05, 2.7, line, { size: 0.36 });
    }, { anim: true });
    // Grandpa, asleep on the cooler.
    R.thing(21.6, 9.45, (ctx, t) => {
      bag(ctx, 21.6, 9.4, 0, { kind: 'box', color: C.white, tag: false });
      person(ctx, 21.6, 9.45, 0.42, { ...look(19, 'traveler', { hair: C.greyLight, top: C.green, style: 'bald' }), pose: 'sit', dir: 'l' }, 0);
      if (Q.detail) { const k = (t * 0.5) % 1; label(ctx, 21.2 - k * 0.3, 9.2 - k * 0.3, 2.2 + k, 'z', 0.32 + k * 0.2, alpha(C.ink, 1 - k)); }
    }, { anim: true });
    // Curbside check-in, its skycap holding out a hand.
    R.thing(23.2, 10.6, (ctx) => {
      box(ctx, 22.4, 9.9, 0, 1.2, 0.6, 1.15, INK.cranberry, { lw: 0.035 });
      box(ctx, 22.3, 9.8, 1.15, 1.4, 0.8, 0.08, C.ink, { flat: true, lw: 0.025 });
      if (Q.detail) lettering(ctx, 'x', 23.0, 10.505, 0.75, 'CURBSIDE', 0.15, C.white);
      person(ctx, 24.2, 10.3, 0, { ...look(23, 'agent', { hat: 'cap' }), pose: 'point', dir: 'l' }, 0);
    });
    // DEPARTURES, over the doors.
    R.thing(20.7, 11.8, (ctx) => hangSign(ctx, 'x', 18.6, 11.75, 2.85, 4.6, 0.62, 'DEPARTURES · TERMINAL C', { post: true, size: 0.3 }));

    // The gull on the lamppost: not the goose.
    R.decoy({ id: 'gull', at: [25.8, 7.2, 4.5], r: 0.8, say: 'A gull. Unimpressed.' });

    // ---------- The streetlamps (one wears a gull) ----------
    for (const [x, y] of LAMPS) {
      print(x, y, (ctx, ink, night) => lamppost(ctx, x, y, ink, night));
      nightGlow(R, x, y - 1.15, 3.55, 3.2, LIT, 0.85);
      cap(x - 0.09, y - 0.09, 4.15, 0.18, 0.18);
    }
    R.thing(25.85, 7.25, (ctx, t) => gull(ctx, 25.8, 7.2, 4.15, t), { anim: true, depth: 25.8 + 7.2 + 0.05 });

    // ---------- The smokers' corner, and the bin ----------
    R.thing(27.9, 11.9, (ctx) => {
      post(ctx, 27.9, 11.85, 0, 2.2, STEEL, 0.05);
      sign(ctx, 'x', 27.9, 11.87, 2.45, 2.5, 0.62, 'NO SMOKING', { board: C.white, ink: C.red, size: 0.26 });
      if (Q.detail) lettering(ctx, 'x', 27.9, 11.88, 2.24, 'WITHIN 25 FEET', 0.13, C.ink);
    });
    const SMOKERS = [[28.7, 10.6, 'r', look(51, 'traveler', { top: C.ink })], [30.1, 11.05, 'l', look(54, 'traveler', { hat: 'beanie' })]];
    for (const [x, y, dir, lk] of SMOKERS) {
      R.thing(x, y, (ctx, t) => {
        const up = mod(t + x, 6) < 1.2;
        person(ctx, x, y, 0, { ...lk, pose: 'stand', dir, arms: up ? [2.4, -0.15] : [0.9, -0.15] }, t);
        if (!Q.detail) return;
        const hx = x + (dir === 'r' ? 0.25 : -0.25) * (up ? 0.6 : 1), hz = up ? 2.05 : 1.45;
        dot(ctx, hx, y - (dir === 'r' ? 0.25 : -0.25), hz, 0.03, C.coral, 0);
        particles(t + x, 4, 3, (k, r) => {
          const [X, Y] = P(hx + (r() - 0.5) * 0.3 + k * 0.3, y - 0.2 - k * 0.3, hz + 0.1 + k * 1.4);
          ctx.beginPath(); ctx.arc(X, Y, 0.06 + k * 0.16, 0, TAU);
          ctx.fillStyle = alpha(C.greyLight, 0.7 * (1 - k)); ctx.fill();
        }, Math.round(x * 3));
      }, { anim: true });
    }
    // The bin: its lid lifts on the raccoon, eating somebody's pretzel. Its
    // ringed tail hangs out under the lid all day.
    const bin = R.poke({ id: 'bin', at: [32.2, 10.4, 0.8], r: 0.8, say: 'Hey. Get your own pretzel.' });
    R.thing(32.2, 10.4, (ctx) => {
      cylinder(ctx, 32.2, 10.4, 0, 0.42, 1.0, C.green);
      if (Q.detail) lettering(ctx, 'x', 32.2, 10.83, 0.55, 'TRASH', 0.13, C.white);
    });
    R.thing(32.21, 10.41, (ctx, t) => {
      const k = bin.k();
      // The lid: a dome, lifted and tipped back as it opens.
      const [X, Y] = P(32.2, 10.4, 1.0 + k * 0.25);
      ctx.save(); ctx.translate(X - k * 0.62, Y - k * 0.1); ctx.rotate(-k * 1.05);
      ctx.beginPath(); ctx.ellipse(0, 0, 0.62, 0.3, 0, 0, TAU); paint(ctx, shade(C.green, 0.15), { lw: 0.035 });
      ctx.beginPath(); ctx.ellipse(0, -0.05, 0.5, 0.22, 0, Math.PI, 0); paint(ctx, C.green, { lw: 0.03 });
      ctx.restore();
      if (k > 0.05) raccoon(ctx, 32.2, 10.4, 1.0, t, k);
      if (k < 0.3) tail(ctx, 32.45, 10.75, 1.0, t);
    }, { anim: true });
    snowy(32.6, 10.8, (ctx, ink) => { const [X, Y] = P(32.2, 10.4, 1.08); ctx.beginPath(); ctx.ellipse(X, Y - 0.04, 0.5, 0.22, 0, Math.PI, 0); ctx.closePath(); paint(ctx, ink(C.white), { lw: 0.02 }); }, 32.2 + 10.4 + 0.03);
    R.find({ id: 'raccoon', label: 'A raccoon', kind: 'poke', inside: bin, at: [32.2, 10.4, 1.4], r: 0.8, hint: 'The bin by the smokers is eating somebody\'s pretzel.' });

    // ---------- The garage and the tower, on their island ----------
    print(41, GY1, (ctx, ink, night) => garage(ctx, ink, night), { depth: 31 });
    snowy(41, GY1 + 0.01, (ctx, ink) => garageRoof(ctx, ink, ink !== ID, 1), 31.01);
    nightGlow(R, 41, GY1, 2.4, 6, LIT, 0.45);
    print(TX, 3.6, (ctx, ink, night) => tower(ctx, ink, night), { depth: 47 });
    snowy(TX, 3.61, (ctx, ink) => {
      rect(ctx, 51.28, 0.48, 5.54, 3.04, 1.71, ink(C.white), { lw: 0.02 });
      face(ctx, ring(TX, TY, 2.28, TZ.roof + 0.012), ink(C.white), { lw: 0.02 });
      prism(ctx, ring(TX, TY, 1.0, TZ.roof), ring(TX, TY, 0.85, TZ.roof + 0.22), CONC, { ink, lw: 0.03 });
      face(ctx, ring(TX, TY, 0.83, TZ.roof + 0.232), ink(C.white), { lw: 0.02 });
      post(ctx, TX, TY, TZ.roof + 0.22, 0.7, ink(C.ink), 0.045);
    }, 47.01);
    // The cab glows at night, and the beacon on its mast flashes all day.
    R.light({ at: [TX, TY, (TZ.cab0 + TZ.cab1) / 2], r: 4.2, color: LIT, k: (t) => nightK(t) * 0.7 });
    R.light({ at: [TX, TY, TZ.beacon], r: 1.2, color: C.red, k: (t) => (mod(t, 2.2) < 0.25 ? 0.4 + 0.6 * nightK(t) : 0) });
    // The trooper's cruiser, parked on the island between them, its lights
    // going round.
    const CRUISER = { x: 48.95, y: 3.55 };
    print(CRUISER.x, CRUISER.y + 1.6, (ctx, ink) => car(ctx, CRUISER.x, CRUISER.y, Math.PI / 2, { kind: 'cruiser', color: C.white, ink }));
    snowy(CRUISER.x + 0.75, CRUISER.y + 1.6, (ctx, ink) => car(ctx, CRUISER.x, CRUISER.y, Math.PI / 2, { kind: 'cruiser', color: C.white, ink, snow: 1 }), CRUISER.x + CRUISER.y + 1.62);
    R.thing(CRUISER.x + 0.76, CRUISER.y + 1.61, (ctx, t) => {
      const F = heading(CRUISER.x, CRUISER.y, 0, Math.PI / 2), on = mod(t, 0.8) < 0.4;
      tbox(ctx, F, -0.32, -0.12, -0.6, 0, 1.26, 1.38, on ? tint(C.red, 0.3) : shade(C.red, 0.3), { lw: 0.02 });
      tbox(ctx, F, -0.32, -0.12, 0, 0.6, 1.26, 1.38, on ? shade(C.navy, 0.3) : tint(C.sky, 0.1), { lw: 0.02 });
      if (lightsOn(t)) glow(ctx, ...F.pt(-0.22, on ? -0.3 : 0.3, 1.32), 1.2, on ? C.red : C.sky, 0.7);
    }, { anim: true });
    // The pay station, and the man at it who's lost his ticket.
    const payer = look(28, 'traveler', { top: C.mustard, hat: 'none', style: 'bald' });
    R.thing(46.6, 5.4, (ctx, t) => {
      const k = mod(t, 3);
      const arms = k < 1 ? [0.35 + Math.sin(t * 10) * 0.12, -0.3] : k < 2 ? [-0.2, 0.35 + Math.sin(t * 10) * 0.12] : [2.6, -2.6];
      person(ctx, 46.6, 5.4, 0, { ...payer, pose: 'stand', dir: 'r', arms }, t);
    }, { anim: true });
    const ticket = R.poke({ id: 'ticket', at: [47.6, 5.3, 1.2], r: 0.8, say: 'Insert ticket. Weep.', teach: true });
    R.thing(47.62, 5.3, (ctx, t) => {
      // Its screen: a hand putting in a ticket; tapped, the price of a lost one.
      const k = ticket.k();
      face(ctx, [[47.35, 5.256, 0.85], [47.85, 5.256, 0.85], [47.85, 5.256, 1.35], [47.35, 5.256, 1.35]], k > 0.5 ? C.red : mix(C.sky, C.navy, 0.15), { lw: 0.02 });
      if (!Q.detail) return;
      if (k > 0.5) { lettering(ctx, 'x', 47.6, 5.26, 1.2, 'LOST?', 0.1, C.white); lettering(ctx, 'x', 47.6, 5.26, 1.02, '$84', 0.13, C.white); }
      else lettering(ctx, 'x', 47.6, 5.26, 1.1, mod(t, 2) < 1 ? 'INSERT' : 'TICKET', 0.09, C.white);
    }, { anim: true });

    // The goodbye that's been going forty minutes: hugging under the sign
    // that says two; asleep on the bench together after the ground stop.
    print(44.2, 11.85, (ctx, ink) => {
      box(ctx, 41.4, 11.3, 0.45, 2.8, 0.5, 0.1, ink(C.wood), { lw: 0.03 });
      for (const x of [41.6, 43.9]) box(ctx, x - 0.05, 11.35, 0, 0.1, 0.4, 0.45, ink(C.ink), { flat: true, stroke: false });
      box(ctx, 41.4, 11.72, 0.55, 2.8, 0.08, 0.55, ink(C.wood), { lw: 0.025 });
    });
    R.thing(44.6, 8.3, (ctx) => {
      post(ctx, 44.6, 8.25, 0, 2.6, STEEL, 0.05);
      sign(ctx, 'x', 44.6, 8.27, 2.85, 2.4, 0.66, 'KISS & FLY', { size: 0.24 });
      if (Q.detail) lettering(ctx, 'x', 44.6, 8.28, 2.65, '2 MINUTES MAX', 0.12, SIGN.ink);
    });
    const HUG = [look(60, 'traveler', { top: C.coral, style: 'long', hat: 'none' }), look(63, 'traveler', { top: C.navy, hat: 'beanie' })];
    R.thing(42.6, 9.6, (ctx, t) => {
      if (stopped(t)) {
        for (const [i, x] of [[0, 42.2], [1, 43.1]]) person(ctx, x, 11.5, 0.55, { ...HUG[i], pose: 'sit', dir: i ? 'l' : 'r', back: true, arms: [0.4, 0.2] }, 0);
        if (Q.detail) { const k = (t * 0.5) % 1; label(ctx, 42.4 - k * 0.3, 11.2 - k * 0.3, 2.3 + k, 'z', 0.32 + k * 0.2, alpha(C.ink, 1 - k)); }
        return;
      }
      const sway = Math.sin(t * 1.1) * 0.05;
      person(ctx, 42.4 + sway, 9.4, 0, { ...HUG[0], pose: 'stand', dir: 'r', arms: [1.9, 1.6] }, t);
      person(ctx, 42.72 + sway, 9.55, 0, { ...HUG[1], pose: 'stand', dir: 'l', arms: [1.9, 1.6] }, t);
      if (Q.detail && mod(t, 24) < 2.4) speech(ctx, 42.5, 9.45, 2.85, 'One more.', { size: 0.34 });
    }, { anim: true, depth: 42.6 + 9.6 });
    // A chauffeur with a name on a card: he's waiting for a goose too.
    R.thing(49.4, 9.7, (ctx) => {
      person(ctx, 49.4, 9.7, 0, { ...look(70, 'agent', { top: C.black, bottom: C.black, hat: 'cap' }), pose: 'carry', dir: 'r' }, 0);
      face(ctx, [[49.55, 9.95, 1.15], [50.35, 9.95, 1.15], [50.35, 9.95, 1.65], [49.55, 9.95, 1.65]], C.white, { lw: 0.025 });
      if (Q.detail) lettering(ctx, 'x', 49.95, 9.96, 1.4, 'G. GOOSE', 0.13, C.ink, 'Bagel Fat One');
    });

    // ---------- The trooper ----------
    // He waves everyone on, and when the minivan stops he walks up to the
    // driver's window and waves it on personally.
    const TROOPER = look(5, 'trooper');
    const HOME = [57.4, 7.75], WINDOW = [54.5, 8.15];
    const [, halt0, halt1] = VAN.halts[0];
    const T_IN = halt0 - 2.3; // when the minivan starts slowing
    const trooperAt = (t) => {
      const tt = mod(t - VAN_T0, VAN_LAP);
      if (tt > T_IN && tt < halt1 + 2.8) {
        if (tt < T_IN + 2) { const q = (tt - T_IN) / 2; return { x: lerp(HOME[0], WINDOW[0], q), y: lerp(HOME[1], WINDOW[1], q), dir: 'l', pose: 'walk' }; }
        if (tt < halt1 + 0.6) return { x: WINDOW[0], y: WINDOW[1], dir: 'l', back: true, pose: 'wave', say: tt > halt0 + 0.4 && tt < halt1 - 0.6 };
        const q = clamp01((tt - halt1 - 0.6) / 2.2);
        return { x: lerp(WINDOW[0], HOME[0], q), y: lerp(WINDOW[1], HOME[1], q), dir: 'r', pose: q < 1 ? 'walk' : 'point' };
      }
      return { x: HOME[0], y: HOME[1], dir: 'l', pose: mod(t, 5) < 2.5 ? 'point' : 'wave' };
    };
    R.mover(trooperAt, (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, { ...TROOPER, pose: p.pose, dir: p.dir, back: p.back }, t);
      if (p.say && Q.detail) speech(ctx, p.x, p.y, 2.75, 'Keep it moving!', { size: 0.36 });
    });

    // ---------- The taxi stand ----------
    // Four cabs at the curb. The second has a goose in the back, meter
    // running: it isn't going anywhere, so neither is anyone else, and the
    // line grows all day. The first is taken (a lady in a white fur hat).
    const TAXIS = [62.6, 66.2, 69.8, 73.4], TY0 = 5.1;
    const driver = (seed) => ({ u: 0.25, v: -0.32, look: look(seed, 'traveler', { top: C.navy }) });
    for (const x of TAXIS) {
      const riders = x === 73.4 ? [{ ...driver(81), lift: -0.12 }] : [driver(Math.round(x))];
      print(x, TY0 + 0.76, (ctx, ink, night) => car(ctx, x, TY0, Math.PI, { kind: 'taxi', color: TAXI, ink, riders, lit: night }));
      snowy(x + 0.8, TY0 + 0.77, (ctx, ink) => {
        const F = heading(x, TY0, 0, Math.PI);
        tq(ctx, F, [[-0.68, -0.55, 1.275], [0.18, -0.55, 1.275], [0.18, 0.55, 1.275], [-0.68, 0.55, 1.275]], ink(C.white), { lw: 0.02 });
        tq(ctx, F, [[0.74, -0.66, 0.732], [1.45, -0.66, 0.732], [1.45, 0.66, 0.732], [0.74, 0.66, 0.732]], ink(C.white), { stroke: false });
        tq(ctx, F, [[-1.45, -0.66, 0.732], [-1.05, -0.66, 0.732], [-1.05, 0.66, 0.732], [-1.45, 0.66, 0.732]], ink(C.white), { stroke: false });
      }, x + TY0 + 0.78);
    }
    // A cab's back door, opened by a tap: the doorway dark, the door swung
    // out toward you. Drawn over the still cab.
    const door = (ctx, F, k, ink) => {
      const n = F.near, hw = 0.75, s = n * (hw + 0.008), th = k * 1.15;
      tq(ctx, F, [[-0.98, s, 0.26], [-0.08, s, 0.26], [-0.08, n * 0.68, 0.72], [-0.12, n * 0.58, 1.2], [-0.72, n * 0.58, 1.2], [-0.95, n * 0.68, 0.72]], ink(INSIDE), { lw: 0.025 });
      const fu = -0.08 - 0.9 * Math.cos(th), fv = n * (hw + 0.9 * Math.sin(th));
      tq(ctx, F, [[-0.08, s, 0.26], [fu, fv, 0.26], [fu, fv, 0.72], [-0.08, s, 0.72]], ink(TAXI), { lw: 0.03 });
      tq(ctx, F, [[-0.08, s, 0.72], [fu, fv, 0.72], [lerp(fu, -0.08, 0.2), lerp(fv, s, 0.2), 1.18], [-0.1, n * 0.6, 1.18]], alpha(ink(GLASS), 0.5), { lw: 0.025 });
    };
    // The first cab: taken.
    const cab = R.poke({ id: 'cab', at: [62.6, 5.1, 1.1], r: 0.9, say: 'Do you mind? This one\'s taken.' });
    R.thing(62.6 + 0.8, TY0 + 0.77, (ctx, t) => {
      const F = heading(62.6, TY0, 0, Math.PI), k = cab.k(), ink = nightPrint(t) ? dusk : ID;
      if (k < 0.05) {
        const [X, Y] = P(...F.pt(-0.88, F.near * 0.25, 1.05));
        hatLady(ctx, X, Y);
        tq(ctx, F, [[-0.95, -0.68, 0.72], [-0.95, 0.68, 0.72], [-0.72, 0.58, 1.26], [-0.72, -0.58, 1.26]], alpha(ink(GLASS), 0.25), { lw: 0.03 });
        return;
      }
      door(ctx, F, k, ink);
      person(ctx, ...F.at(-0.5, F.near * 0.45), 0.36, { ...look(88, 'traveler', { top: C.purple, hat: 'none' }), pose: 'sit', dir: 'r', scale: 0.7, face: (c, hy) => { c.beginPath(); c.ellipse(0.02, hy - 0.22, 0.36, 0.2, 0, 0, TAU); paint(c, C.white, { lw: 0.02, dots: C.grey, density: 0.12 }); } }, 0);
    }, { anim: true });
    // The second: the goose's. Its beak in the back window all day.
    const taxi = R.poke({ id: 'taxi', at: [66.2, 5.1, 1.1], r: 1, say: 'Meter\'s running.' });
    R.thing(66.2 + 0.8, TY0 + 0.77, (ctx, t) => {
      const F = heading(66.2, TY0, 0, Math.PI), k = taxi.k(), ink = nightPrint(t) ? dusk : ID;
      if (k < 0.05) {
        const [X, Y] = P(...F.pt(-0.86, F.near * 0.22, 0.98));
        gooseHead(ctx, X, Y, t);
        tq(ctx, F, [[-0.95, -0.68, 0.72], [-0.95, 0.68, 0.72], [-0.72, 0.58, 1.26], [-0.72, -0.58, 1.26]], alpha(ink(GLASS), 0.25), { lw: 0.03 });
      } else door(ctx, F, k, ink);
      // The meter, on the roof light: the fare, climbing.
      if (Q.detail) {
        const fare = (12 + mod(t, LOOP) * 0.85).toFixed(2);
        tq(ctx, F, [[0.03, -0.32, 1.47], [0.03, 0.32, 1.47], [0.03, 0.32, 1.6], [0.03, -0.32, 1.6]], C.ink, { lw: 0.015 });
        lettering(ctx, 'y', ...F.at(0.035, 0), 1.535, '$' + fare, 0.08, C.red);
      }
    }, { anim: true });
    R.goose((t) => ({ x: 66.75, y: 5.5, z: 0.42, dir: 'r', pose: 'sit', hidden: taxi.k() < 0.5 }),
      { kind: 'poke', inside: taxi, hint: 'One of the taxis has a very quiet passenger.', bias: 0.4 });
    // The TAXI sign, the dispatcher with her whistle, and the line.
    R.thing(61.6, 7.6, (ctx) => {
      post(ctx, 61.4, 7.45, 0, 2.3, STEEL, 0.05);
      sign(ctx, 'x', 61.4, 7.47, 2.55, 1.5, 0.6, 'TAXI', { board: TAXI, ink: C.ink, size: 0.32 });
    });
    R.thing(61.9, 8.3, (ctx, t) => {
      const lk = look(66, 'ramp', { hat: 'beanie' });
      const blow = mod(t, 7) < 1.2;
      person(ctx, 61.9, 8.3, 0, { ...lk, pose: blow ? 'point' : 'wave', dir: 'l' }, t);
      if (blow && Q.detail) speech(ctx, 61.9, 8.3, 2.75, mod(t, 14) < 7 ? 'Next!' : 'Anyone?', { size: 0.34 });
    }, { anim: true });
    for (const [y, x0] of [[7.95, 62.6], [9.25, 62.6]]) {
      R.thing(77.2, y + 0.05, (ctx) => {
        for (let x = x0; x <= 77.1; x += 2.42) { post(ctx, x, y, 0, 0.95, C.ink, 0.04); box(ctx, x - 0.13, y - 0.13, 0, 0.26, 0.26, 0.05, C.ink, { flat: true, stroke: false }); }
        line3(ctx, [[x0, y, 0.85], [77.1, y, 0.85]], INK.cranberry, 0.06);
      }, { depth: x0 + y + 0.4 });
    }
    // The line: three at 4am, more every hour, everyone stranded by the
    // night; it eases after the stop lifts.
    for (let i = 0; i < 14; i++) {
      const x = 63.1 + i * 1.02, from = 4 + i * 1.05, to = 24 + 1 + (13 - i) * 0.05;
      const on = (t) => { let h = hour(t); if (h < 4) h += 24; return h >= from && h < to; };
      const kind = i === 6 ? 'band' : 'traveler';
      stay(R, x, 8.62 + (i % 2) * 0.08, look(120 + i, kind), { dir: 'l', on, bag: i % 3 === 1 ? null : { color: BAGS[(i * 5) % BAGS.length], kind: i % 4 === 0 ? 'duffel' : 'case' } });
    }

    // ---------- Bollards, and the lost glove ----------
    const BOLLARDS = [74.2, 76.6, 79.0, 81.4, 83.8, 86.2];
    for (const x of BOLLARDS) {
      R.thing(x, 7.3, (ctx) => {
        cylinder(ctx, x, 7.3, 0, 0.17, 0.9, C.navy);
        if (Q.detail) { const [X, Y] = P(x, 7.3, 0.62); ctx.beginPath(); ctx.ellipse(X, Y + 0.09, 0.24, 0.12, 0, 0, Math.PI); ctx.lineTo(X - 0.24, Y - 0.03); ctx.ellipse(X, Y - 0.03, 0.24, 0.12, 0, Math.PI, 0, true); ctx.closePath(); paint(ctx, INK.signal, { stroke: false }); }
        if (x === 79.0) { box(ctx, x - 0.09, 7.21, 0.9, 0.18, 0.18, 0.24, C.white, { lw: 0.02 }); box(ctx, x - 0.1, 7.2, 1.0, 0.2, 0.2, 0.06, C.brown, { flat: true, stroke: false }); }
      });
      cap(x - 0.17, 7.13, 0.9, 0.34, 0.34);
    }
    R.thing(83.82, 7.32, (ctx) => glove(ctx, 83.8, 7.3, 0.88));
    R.find({ id: 'glove', label: 'A lost glove', kind: 'hard', at: [83.8, 7.3, 1.1], r: 0.6, riddle: 'Put up where its owner might see it.', hint: 'Somebody found it and left it on a post, as you do here.' });

    // ---------- Rideshares ----------
    // One loading at the curb, one parked in the bus stop with its hazards
    // going (so the bus stops in the other lane).
    const RYDE = (x, color, seed) => {
      print(x, 5.15 + 0.76, (ctx, ink) => car(ctx, x, 5.15, Math.PI, { color, ink, riders: [driver(seed)] }));
      snowy(x + 0.8, 5.15 + 0.77, (ctx, ink) => car(ctx, x, 5.15, Math.PI, { color, ink, snow: 1, riders: [driver(seed)] }), x + 5.15 + 0.78);
    };
    RYDE(80.6, C.navy, 90);
    RYDE(90.2, C.black, 92);
    R.thing(90.2 + 0.8, 5.15 + 0.78, (ctx, t) => {
      const F = heading(90.2, 5.15, 0, Math.PI);
      // The pink sign in its back window, and its hazards.
      tq(ctx, F, [[-0.9, -0.3, 0.8], [-0.9, 0.3, 0.8], [-0.86, 0.3, 0.98], [-0.86, -0.3, 0.98]], C.pink, { lw: 0.015 });
      if (Q.detail) lettering(ctx, 'y', ...F.at(-0.9, 0), 0.89, 'RYDE', 0.09, C.white);
      if (mod(t, 1) < 0.5) {
        for (const sv of [-0.55, 0.55]) tq(ctx, F, [[-1.556, sv - 0.12, 0.5], [-1.556, sv + 0.12, 0.5], [-1.556, sv + 0.12, 0.63], [-1.556, sv - 0.12, 0.63]], C.mustard, { lw: 0.015 });
        if (lightsOn(t)) glow(ctx, ...F.pt(-1.55, 0, 0.56), 0.7, C.mustard, 0.8);
      }
    }, { anim: true });
    // Her bags into the first one's trunk, one at a time; and a man waving
    // his phone at every car that isn't his.
    R.thing(82.6, 6.6, (ctx, t) => {
      const k = mod(t, 4), up = k < 2 ? k / 2 : 1 - (k - 2) / 2;
      person(ctx, 82.6, 6.6, 0, { ...look(95, 'traveler', { top: C.lilac, style: 'pony' }), pose: 'carry', dir: 'l', back: true }, 0);
      bag(ctx, 82.25, 6.45, 0.6 + up * 0.5, { kind: 'case', color: C.pink, lie: true, along: 'y', tag: false });
    }, { anim: true });
    R.thing(86.6, 8.4, (ctx, t) => {
      person(ctx, 86.6, 8.4, 0, { ...look(97, 'traveler', { top: C.teal, hat: 'beanie' }), pose: 'wave', dir: 'l' }, t);
      if (Q.detail) { const [X, Y] = P(86.3, 8.4, 2.45); ctx.beginPath(); ctx.roundRect(X - 0.06, Y - 0.1, 0.12, 0.2, 0.03); paint(ctx, C.ink, { lw: 0.015 }); }
    }, { anim: true });

    // ---------- The Silver Line ----------
    // The stop's shelter (open toward the terminal, its people facing you),
    // the SL sign, a man who always just misses the bus, and someone in a
    // turkey costume who rides it in every time.
    print(95.6, 8.55, (ctx, ink) => {
      face(ctx, [[89, 8.45, 0.15], [95.5, 8.45, 0.15], [95.5, 8.45, 2.85], [89, 8.45, 2.85]], alpha(ink(tint(C.sky, 0.3)), 0.55), { lw: 0.04 });
      for (const x of [89, 91.15, 93.3, 95.5]) post(ctx, x, 8.45, 0, 2.98, ink(STEEL), 0.05);
      face(ctx, [[95.5, 8.45, 0.3], [95.5, 9.7, 0.3], [95.5, 9.7, 2.3], [95.5, 8.45, 2.3]], ink(BRAND.can), { lw: 0.04 });
      lettering(ctx, 'y', 95.51, 9.08, 1.6, 'GANDER', 0.2, ink(BRAND.ink), 'Bagel Fat One');
      lettering(ctx, 'y', 95.51, 9.08, 1.3, 'COLA', 0.2, ink(BRAND.ink), 'Bagel Fat One');
    }, { depth: 89 + 8.45 });
    for (let i = 0; i < 4; i++) {
      const x0 = 89.4 + i * 1.5;
      R.thing(x0 + 1.5, 9.0, (ctx) => {
        box(ctx, x0, 8.55, 0.5, 1.5, 0.45, 0.08, C.wood, { lw: 0.025 });
        for (const x of [x0 + 0.2, x0 + 1.3]) box(ctx, x - 0.04, 8.65, 0, 0.08, 0.25, 0.5, C.ink, { flat: true, stroke: false });
      }, { depth: x0 + 1.5 + 9.0 });
    }
    const WAITERS = [[90.1, 'r', 140, 0], [92.9, 'l', 143, 1], [93.9, 'r', 146, 2]];
    for (const [x, dir, seed, i] of WAITERS) {
      const seat = 89.4 + Math.floor((x - 89.4) / 1.5) * 1.5 + 1.5 + 9.0 + 0.02;
      R.thing(x, 9.05, (ctx, t) => {
        const asleep = stopped(t);
        person(ctx, x, 9.05, 0.5, { ...look(seed, i === 1 ? 'band' : 'traveler'), pose: 'sit', dir, arms: i === 2 ? [1.0, 1.0] : undefined }, 0);
        if (i === 2 && Q.detail) { const [X, Y] = P(x + 0.2, 9.05, 1.45); ctx.beginPath(); ctx.rect(X - 0.05, Y - 0.2, 0.35, 0.26); paint(ctx, C.white, { lw: 0.015 }); }
        if (asleep && Q.detail) { const k = (t * 0.5 + i * 0.3) % 1; label(ctx, x - 0.4 - k * 0.3, 8.8 - k * 0.3, 2.0 + k, 'z', 0.3 + k * 0.2, alpha(C.ink, 1 - k)); }
      }, { anim: true, depth: seat });
    }
    R.thing(95.7, 9.8, (ctx) => {
      box(ctx, 88.8, 8.3, 2.98, 6.9, 1.12, 0.14, STEEL, { lw: 0.035 });
      if (Q.detail) lettering(ctx, 'x', 92.25, 9.43, 3.05, 'SILVER LINE SL1 · SOUTH STATION', 0.1, C.white);
    }, { depth: 95.7 + 9.86 });
    snowy(95.8, 9.9, (ctx, ink) => rect(ctx, 88.78, 8.28, 6.94, 1.16, 3.135, ink(C.white), { lw: 0.02 }), 95.8 + 9.9);
    R.thing(90.05, 8.05, (ctx) => {
      post(ctx, 90.0, 8.0, 0, 2.6, STEEL, 0.045);
      const [X, Y] = P(90.0, 8.0, 2.85);
      ctx.beginPath(); ctx.arc(X, Y, 0.34, 0, TAU); paint(ctx, C.purple, { lw: 0.035 });
      if (Q.detail) label(ctx, 90.0, 8.0, 2.85, 'SL1', 0.24, C.white);
      sign(ctx, 'x', 90.0, 8.02, 2.2, 1.0, 0.36, 'NEXT: 4 MIN', { board: C.ink, ink: C.white, size: 0.11 });
    });
    // The bus: two sections and the bellows, on the route.
    const BUS_HALF = 2.45;
    const busPos = (t, which) => {
      const b = busNow(t);
      if (!b) return HIDE;
      const s = b.s + which * BUS_HALF, p = pose(s, 1.6);
      return { ...p, b, which };
    };
    for (const which of [1, -1]) {
      R.mover((t) => busPos(t, which), (ctx, t, p) => {
        if (p.hide) return;
        const night = nightPrint(t), ink = night ? dusk : null, lit = lightsOn(t);
        const open = p.b.stop && p.b.k > 0.06 && p.b.k < 0.94;
        inTunnels(ctx, p.x, p.y, () => {
          busPart(ctx, p.x, p.y, p.ang, { ink, lit, snow: settle(t), seed: p.b.n * 2 + which, doors: which > 0 ? [1.55] : [0.75], open, tail: which < 0, name: which < 0, nameU: 0.2 });
          if (which > 0) {
            // The bellows, toward the back section.
            const q = pose(p.b.s, 0.3), F = heading(q.x, q.y, 0, q.ang);
            tbox(ctx, F, -0.28, 0.28, -0.9, 0.9, 0.38, 2.12, shade(C.grey, 0.45), { ink, lw: 0.03 });
          }
        });
      });
    }
    // The man who just misses it, every time: from arrivals, running, too
    // late; he waits at the shelter for the next one, and gets on that.
    const RUN = [[103.4, 9.6], [87.2, 8.75]], SHELTER = [92.6, 10.0];
    R.mover((t) => {
      const tt = mod(t, BUS_CYCLE), n = Math.floor(t / BUS_CYCLE);
      if (tt < 5) return { x: SHELTER[0], y: SHELTER[1], dir: 'l', pose: 'stand', n: n - 1 };
      if (tt < 11.7) {
        const legs = [[SHELTER, [92.4, 6.4]], [[92.4, 6.4], [87.9, 6.4]], [[87.9, 6.4], [88.4, 3.9]]];
        const q = (tt - 5) / 6.7 * 3, i = Math.min(2, Math.floor(q)), k = q - i, [a, b] = legs[i];
        return { x: lerp(a[0], b[0], k), y: lerp(a[1], b[1], k), dir: i === 1 ? 'l' : i === 0 ? 'r' : 'r', back: i !== 1, pose: 'walk', n: n - 1 };
      }
      if (tt < 14) return HIDE;
      if (tt < 19.6) { const q = (tt - 14) / 5.6; return { x: lerp(RUN[0][0], RUN[1][0], q), y: lerp(RUN[0][1], RUN[1][1], q), dir: 'l', pose: 'run', n }; }
      if (tt < 24) return { x: RUN[1][0], y: RUN[1][1], dir: 'l', pose: 'stand', sigh: true, n };
      if (tt < 28) { const q = (tt - 24) / 4; return { x: lerp(RUN[1][0], SHELTER[0], q), y: lerp(RUN[1][1], SHELTER[1], q), dir: 'r', pose: 'walk', n }; }
      return { x: SHELTER[0], y: SHELTER[1], dir: 'l', pose: 'stand', n };
    }, (ctx, t, p) => {
      if (p.hide) return;
      const lk = look(200 + mod(p.n, 9), 'traveler');
      if (p.pose === 'run' || p.pose === 'walk') {
        bag(ctx, p.x + (p.dir === 'l' ? 0.45 : -0.45), p.y - (p.dir === 'l' ? -0.1 : 0.1), 0, { handle: true, color: BAGS[mod(p.n, BAGS.length)] });
        person(ctx, p.x, p.y, 0, { ...lk, pose: p.pose, dir: p.dir, back: p.back }, t);
      } else {
        bag(ctx, p.x + 0.45, p.y + 0.15, 0, { handle: true, color: BAGS[mod(p.n, BAGS.length)] });
        person(ctx, p.x, p.y, 0, { ...lk, pose: 'stand', dir: p.dir, arms: p.sigh ? [0.05, -0.05] : undefined }, t);
        if (p.sigh && Q.detail) speech(ctx, p.x, p.y, 2.7, 'Wait!', { size: 0.34 });
      }
    });
    // The turkey: off the bus, and the long walk down the curb to the doors.
    const TK = [[94.0, 3.7], [96.4, 10.4], [34, 10.8], [32.9, 11.5], [19.8, 11.5], [19.3, 11.9]];
    const TK_LEN = TK.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - TK[i][0], p[1] - TK[i][1]), 0);
    R.mover((t) => {
      const tt = mod(t, BUS_CYCLE) - 5.6;
      let d = tt * 1.25;
      if (tt < 0 || d > TK_LEN) return HIDE;
      for (let i = 1; i < TK.length; i++) {
        const [ax, ay] = TK[i - 1], [bx, by] = TK[i], l = Math.hypot(bx - ax, by - ay);
        if (d <= l) { const k = d / l, dX = (bx - ax) - (by - ay), dY = (bx - ax) + (by - ay); return { x: lerp(ax, bx, k), y: lerp(ay, by, k), dir: dX >= 0 ? 'r' : 'l', back: dY < 0 }; }
        d -= l;
      }
      return HIDE;
    }, (ctx, t, p) => {
      if (p.hide) return;
      if (!p.back) fan(ctx, p.x, p.y, 0);
      person(ctx, p.x, p.y, 0, { ...TURKEY, pose: 'walk', dir: p.dir, back: p.back, speed: 5 }, t);
      if (p.back) fan(ctx, p.x, p.y, 0);
    });
    // Somebody late, with a case, off the curb and running for the doors.
    const LATE = [[80.1, 6.4], [80.1, 10.15], [34.5, 10.15], [33.4, 11.45], [19.7, 11.45]];
    const LATE_LEN = LATE.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - LATE[i][0], p[1] - LATE[i][1]), 0);
    R.mover((t) => {
      const tt = mod(t, BUS_CYCLE) - 40;
      let d = tt * 2.7;
      if (tt < 0 || d > LATE_LEN) return HIDE;
      for (let i = 1; i < LATE.length; i++) {
        const [ax, ay] = LATE[i - 1], [bx, by] = LATE[i], l = Math.hypot(bx - ax, by - ay);
        if (d <= l) { const k = d / l, dX = (bx - ax) - (by - ay), dY = (bx - ax) + (by - ay); return { x: lerp(ax, bx, k), y: lerp(ay, by, k), dir: dX >= 0 ? 'r' : 'l', back: dY < 0, moving: true, n: Math.floor(t / BUS_CYCLE) }; }
        d -= l;
      }
      return HIDE;
    }, (ctx, t, p) => {
      if (p.hide) return;
      const lk = look(230 + mod(p.n, 7), 'traveler');
      const bx = p.x + (p.dir === 'l' ? 0.5 : -0.5) * (p.back ? 0 : 1), by = p.y + (p.back ? -0.5 : p.dir === 'l' ? 0.2 : -0.2);
      if (!p.back) bag(ctx, bx, by, 0, { handle: true, color: C.coral });
      person(ctx, p.x, p.y, 0, { ...lk, pose: 'run', dir: p.dir, back: p.back }, t);
      if (p.back) bag(ctx, bx, by, 0, { handle: true, color: C.coral });
    });

    // ---------- Arrivals: Ray's family ----------
    R.thing(97.0, 7.3, (ctx) => {
      post(ctx, 97.0, 7.25, 0, 2.6, STEEL, 0.05);
      sign(ctx, 'x', 97.0, 7.27, 2.85, 2.5, 0.55, 'ARRIVALS · PICK-UP', { size: 0.17 });
    });
    const FAM = [look(160, 'traveler', { top: C.coral, style: 'curly', hat: 'none' }), look(163, 'traveler', { top: C.navy, hat: 'cap' }), look(166, 'traveler', { top: C.mustard, hat: 'beanie' })];
    R.thing(100.2, 10.0, (ctx, t) => {
      const home = R.found('family');
      const bob = Math.sin(t * 1.3) * 0.08, sway = Math.sin(t * 0.9) * 0.15;
      // The balloon, tied to the kid (or to Ray's box), bobbing.
      const [kx, ky] = home ? [100.0, 10.25] : [101.25, 9.25];
      const hz = home ? 1.6 : 1.0;
      const [BX, BY] = P(kx + 0.3 + sway * 0.4, ky - 0.2, 4.2 + bob);
      const [SX, SY] = P(kx + 0.1, ky, hz);
      ctx.beginPath(); ctx.moveTo(SX, SY); ctx.quadraticCurveTo(SX + 0.2, (SY + BY) / 2, BX, BY + 0.38);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(BX, BY, 0.34, 0.4, 0, 0, TAU); paint(ctx, C.red, { lw: 0.035 });
      ctx.beginPath(); ctx.moveTo(BX - 0.06, BY + 0.38); ctx.lineTo(BX + 0.06, BY + 0.38); ctx.lineTo(BX, BY + 0.46); ctx.closePath(); paint(ctx, C.red, { lw: 0.02 });
      if (Q.detail) { ctx.beginPath(); ctx.ellipse(BX - 0.12, BY - 0.15, 0.06, 0.1, -0.4, 0, TAU); ctx.fillStyle = alpha(C.white, 0.6); ctx.fill(); label(ctx, ...[kx + 0.3 + sway * 0.4, ky - 0.2], 4.2 + bob, 'RAY!', 0.16, C.white); }
      if (!home) {
        person(ctx, 101.25, 9.25, 0, { ...FAM[2], scale: 0.7, pose: 'point', dir: 'l', arms: [2.6, -0.2] }, t);
        person(ctx, 98.6, 9.45, 0, { ...FAM[0], pose: 'carry', dir: 'r' }, t);
        person(ctx, 100.0, 9.8, 0, { ...FAM[1], pose: 'carry', dir: 'l' }, t);
        // WELCOME HOME RAY, held up between them.
        face(ctx, [[98.4, 10.0, 1.2], [100.4, 10.0, 1.2], [100.4, 10.0, 2.0], [98.4, 10.0, 2.0]], C.white, { lw: 0.035 });
        if (Q.detail) {
          lettering(ctx, 'x', 99.4, 10.01, 1.78, 'WELCOME HOME', 0.18, C.coral, 'Bagel Fat One');
          lettering(ctx, 'x', 99.4, 10.01, 1.42, 'RAY', 0.3, INK.cranberry, 'Bagel Fat One');
        }
        return;
      }
      // Home: Ray's box held up in the middle, everyone's arms round it.
      person(ctx, 100.0, 9.75, 0, { ...FAM[1], pose: 'carry', dir: 'r' }, t);
      person(ctx, 99.25, 9.85, 0, { ...FAM[0], pose: 'stand', dir: 'r', arms: [1.75, 1.45] }, t);
      person(ctx, 100.75, 10.05, 0, { ...FAM[2], scale: 0.7, pose: 'stand', dir: 'l', arms: [2.1, 1.8] }, t);
      bag(ctx, 100.0, 10.2, 1.15, { kind: 'box', color: C.woodLight, s: 1.1 });
      if (Q.detail) {
        lettering(ctx, 'x', 100.0, 10.46, 1.36, 'RAY', 0.16, C.ink, 'Bagel Fat One');
        // A bow on top.
        dot(ctx, 99.92, 10.2, 1.62, 0.06, C.red, 0.015);
        dot(ctx, 100.08, 10.2, 1.62, 0.06, C.red, 0.015);
        const k = (t * 0.4) % 1, [X, Y] = P(100.1 - k * 0.2, 9.9 - k * 0.2, 2.9 + k * 1.2);
        ctx.save(); ctx.globalAlpha *= 1 - k; heart(ctx, X, Y, 0.16, C.red); ctx.restore();
      }
    }, { anim: true });
    R.find({ id: 'family', label: 'Uncle Ray\'s family', after: 'runway:ray', at: [100, 9.8, 2.8], r: 1, riddle: 'Ray\'s box says: meet me at the curb.' });

    // ---------- Traffic ----------
    // The minivan: eight laps a day, waved on at the tower every time.
    const VANLK = { dad: look(41, 'traveler', { top: C.green }), mom: look(44, 'traveler', { top: C.coral, style: 'long' }) };
    const vanPos = (t) => {
      const v = vanNow(t);
      if (!v) return HIDE;
      const p = pose(v.s, 1.2);
      return { ...p, v, lap: lapOf(t) };
    };
    R.mover(vanPos, (ctx, t, p) => {
      if (p.hide) return;
      const night = nightPrint(t), lap = p.lap;
      const riders = [
        { u: 0.45, v: -0.38, look: VANLK.dad },
        { u: 0.45, v: 0.38, look: VANLK.mom, lift: lap >= 6 ? -0.08 : 0 },
        { u: -1.3, v: -0.32, look: { top: C.pink }, face: (c, X, Y) => kidFace(c, X, Y, lap, t) },
      ];
      inTunnels(ctx, p.x, p.y, () => car(ctx, p.x, p.y, p.ang, { kind: 'van', color: C.purple, ink: night ? dusk : null, riders, roofbox: C.ink, snow: settle(t), lit: lightsOn(t), moving: !p.v.stop }));
    });
    const VAN_LINES = ['Two seconds! Just dropping off!', 'Round again. Wave to the trooper!', 'Lap three. Mom says we\'re fine.', 'Lap four. Are we there yet?', 'Lap five. Dad\'s not talking.', 'Lap six. The kid made a sign.', 'Lap seven. Everyone\'s asleep.', 'Lap eight. Happy Thanksgiving?'];
    R.poke({
      id: 'minivan', r: 1.1,
      at: (t) => { const p = vanPos(t); return p.hide ? [-60, -60, 0] : [p.x, p.y, 1.0]; },
      when: (t) => { const p = vanPos(t); return !p.hide && p.x > 13 && p.x < 100; },
      say: (t) => VAN_LINES[lapOf(t)],
      sound: 'horn',
    });
    // The cars in the gaps: a rideshare and a car by day, a plow at night.
    const CAR_COLORS = [C.red, C.white, C.navy, C.green, C.grey, C.mustard, C.teal];
    for (const [t0, plowed] of [[46, true], [55, false]]) {
      R.mover((t) => {
        const c = carNow(t, t0, plowed);
        if (!c) return HIDE;
        return { ...pose(c.s, c.plow ? 1.4 : 1.1), c };
      }, (ctx, t, p) => {
        if (p.hide) return;
        const night = nightPrint(t), ink = night ? dusk : null, lit = lightsOn(t);
        if (p.c.plow) inTunnels(ctx, p.x, p.y, () => {
          // The plow: an orange truck with its blade down, throwing snow.
          const F = car(ctx, p.x, p.y, p.ang, { kind: 'van', color: INK.safety, ink, lit, moving: true, snow: 0.6, riders: [{ u: 0.5, v: -0.35, look: look(33, 'crew') }] });
          tbox(ctx, F, 1.85, 2.0, -1.0, 1.0, 0.05, 0.6, C.grey, { ink, lw: 0.03 });
          const on = mod(t, 0.6) < 0.3;
          dot(ctx, ...F.pt(0.2, 0, 1.75), 0.09, on ? INK.signal : shade(INK.signal, 0.4), 0.015);
          if (on && lit) glow(ctx, ...F.pt(0.2, 0, 1.75), 1.0, INK.signal, 0.8);
          if (Q.detail) particles(t, 8, 0.8, (k, r) => {
            const [X, Y] = P(...F.pt(2.0 + k * 0.6, (r() < 0.5 ? -1 : 1) * (1.0 + k * 1.2), 0.3 + Math.sin(k * Math.PI) * 0.8));
            ctx.beginPath(); ctx.arc(X, Y, 0.08, 0, TAU); ctx.fillStyle = alpha(C.white, 1 - k); ctx.fill();
          }, t0);
        });
        if (p.c.plow) return;
        const n = p.c.n, color = t0 === 47 ? C.black : CAR_COLORS[mod(n, CAR_COLORS.length)];
        inTunnels(ctx, p.x, p.y, () => {
          car(ctx, p.x, p.y, p.ang, { color, ink, lit, moving: true, snow: settle(t) * 0.8, riders: [{ u: 0.25, v: -0.32, look: look(300 + mod(n, 11)) }, ...(mod(n, 2) ? [{ u: -0.55, v: 0.3, look: look(310 + mod(n, 5)) }] : [])] });
          if (t0 === 55 && Q.detail) {
            const F = heading(p.x, p.y, 0, p.ang);
            tq(ctx, F, [[-0.9, -0.3, 0.8], [-0.9, 0.3, 0.8], [-0.86, 0.3, 0.98], [-0.86, -0.3, 0.98]], C.pink, { lw: 0.015 });
          }
        });
      });
    }
  },
};

// Words painted flat on the road, reading along it (with Bagel Fat One).
function paintText(ctx, x, y, text, size) {
  ctx.save();
  ctx.transform(1, 0.5, -1, 0.5, x - y, (x + y) / 2);
  const k = 40;
  ctx.scale(1 / k, 1 / k);
  ctx.font = `${size * k}px "Bagel Fat One", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = alpha(PAINT, 0.85);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
