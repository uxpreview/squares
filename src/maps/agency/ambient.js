// Around Pitch Day: what's drawn under and over its areas.
//
// Under (backdrop): a New England wood at the end of October, behind the
// building and at its left end: maples gone red, orange and gold, pines,
// birches, a few trees already bare, and past it a ridge with two radio
// masts, their lights blinking. A path runs back from the top of the
// drive to the fire pit in its clearing, where everyone goes at five: lit
// from five, little figures round it in the evening, a glow in the night.
// A little mist at dawn, an owl after dark, print marks and the caption.
//
// Over (sky): the woods in front of the lot, across the road and past the
// drive. They stand in front of the lot, so they're drawn over it, and
// they're short where they meet it (taller further off), so a tree never
// hides a find. Under them, the geese of the ending going into the trees
// (finale.js). Over everything, a few leaves falling, birds by day, stars
// at night, and the geese's victory lap.
//
// The still woods are a lot of trees, so each lot (behind, in front) is
// painted once into a picture at the camera's scale and stamped every frame
// (as Departures' far shore): painted again when the night deepens a step,
// the zoom settles somewhere new, or a pan runs past the margin.
import { C, Q, box, paint, alpha, tint, shade, mix, hash, glowAt } from '../../engine/art.js';
import { reg, birds, geeseV, P3 } from '../shared.js';
import { W, D } from './plan.js';
import { INK, WOODS } from './style.js';
import { H, nightK } from './clock.js';
import { follow, beyond } from './finale.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ramp = (a, b, v) => clamp((v - a) / (b - a));

// ---------- Where things are ----------
// The fire pit, in a clearing behind the front of house and Creative, and
// the path to it from the top of the drive (it runs behind the building's
// right end, where the floor above hides some of it).
const PIT = [53, -19];
const PATH = [[110.5, -0.4], [106, -4.6], [97, -8.8], [84, -11.6], [70, -14.6], [58.6, -17.4]];
// The owl's snag, at the edge of the wood beside the lot's left end.
const OWL = [-2.6, 30.8];
// The ridge across the swamp, past the far edge of the wood, and its two
// radio masts: what the real office's back windows look out on (the photos
// people post from there are of them, in rainbows and snow). [x, y, s]
const RIDGE = [48, -48];
const MASTS = [[45.5, -47.2, 1], [50.2, -48.6, 0.82]];

const dSeg = (px, py, [ax, ay], [bx, by]) => {
  const dx = bx - ax, dy = by - ay, u = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy));
  return Math.hypot(px - ax - u * dx, py - ay - u * dy);
};
const nearPath = (x, y) => { let m = 1e9; for (let i = 1; i < PATH.length; i++) m = Math.min(m, dSeg(x, y, PATH[i - 1], PATH[i])); return m; };

// ---------- The trees ----------
// [x, y, kind, s]: on a jittered grid all round, denser near the building
// and thinning out toward the edges of the page, so the wood frays into
// the leaf-strewn paper rather than stopping in a line. How tall a tree
// looks on the page is about 3.9 x s for every kind.
const HK = 3.9;
const KINDS = ['pine', 'pine', 'pine', 'red', 'red', 'red', 'orange', 'orange', 'gold', 'gold', 'birch', 'bare'];
const BACK = [], FRONT = [];
// A screen box that has to stay clear of trees drawn in front of it: the
// clearing, so the fire shows, and the owl.
const KEEP = [
  { X: PIT[0] - PIT[1], Y: (PIT[0] + PIT[1]) / 2, w: 7, up: 4, down: 3, depth: PIT[0] + PIT[1] - 3 },
  { X: OWL[0] - OWL[1], Y: (OWL[0] + OWL[1]) / 2, w: 1.6, up: 3.8, down: 0.6, depth: OWL[0] + OWL[1] - 0.6 },
];
(function grow() {
  const step = 3.7;
  for (let i = -20; i <= 50; i++) for (let j = -26; j <= 34; j++) {
    const r = (k) => hash(i * 92821 + j * 68917, k);
    const x = i * step + (r(1) - 0.5) * step * 0.9, y = j * step + (r(2) - 0.5) * step * 0.9;
    const X = x - y, Y = (x + y) / 2;
    if (X < -64 || X > 138 || Y < -30 || Y > 94) continue;
    const out = Math.max(-y, -x, y - D, x - W);
    if (out < 2.6) continue;
    const front = y > D || (x > W && y >= 0);
    const [a, b] = y < 0 ? [24, 46] : front ? (y > D ? [7, 17] : [8, 20]) : [12, 30];
    if (r(3) > 1 - ramp(a, b, out)) continue;
    if (Math.hypot(x - PIT[0], y - PIT[1]) < 5 || nearPath(x, y) < 1.7 || Math.hypot(x - OWL[0], y - OWL[1]) < 1.8) continue;
    const kind = KINDS[Math.floor(r(4) * KINDS.length)];
    let s = 1.15 + r(5) * 0.6;
    // In front, short where they meet the lot: how far a tree reaches up the
    // page is how far back across the ground it hides, and that has to stop
    // short of the lot (and the road's far curb).
    if (front) s = Math.min(s, (Math.max(x - W, y - D) - 0.6) / HK);
    if (s < 0.42) continue;
    if (!front && KEEP.some((k) => Math.abs(X - k.X) < k.w + 1.3 * s && Y > k.Y - k.up && Y - HK * s < k.Y + k.down && x + y > k.depth)) continue;
    (front ? FRONT : BACK).push([x, y, kind, s, r(6)]);
  }
  const byDepth = (p, q) => p[0] + p[1] - q[0] - q[1] || p[0] - q[0];
  BACK.push([PIT[0], PIT[1], 'pit', 1, 0], [OWL[0], OWL[1], 'snag', 1, 0], [RIDGE[0], RIDGE[1] - 3, 'ridge', 1, 0]);
  for (const [x, y, s] of MASTS) BACK.push([x, y, 'mast', s, 0]);
  BACK.sort(byDepth);
  FRONT.sort(byDepth);
})();

// The leaves' inks, and the night: every ink sinks toward the night's
// blue-green as it gets dark (in eight steps, so the pictures repaint
// seldom), staying a shade lighter than the paper so the wood still reads.
const LEAF = {
  red: INK.maple,
  orange: mix(INK.maple, C.mustard, 0.5),
  gold: C.mustard,
  pine: INK.pine,
  birch: mix(C.mustard, C.butter, 0.4),
};
const nightStep = (t) => Math.round(nightK(t) * 8) / 8;
const sink = (c, n) => (n > 0 ? mix(c, WOODS.night, n * 0.58) : c);

function maple(ctx, x, y, s, leaf, n, v) {
  box(ctx, x - 0.12 * s, y - 0.12 * s, 0, 0.24 * s, 0.24 * s, 1.6 * s, sink(C.brown, n), { flat: true, lw: 0.03 });
  const [X, Y] = P3(x, y, 1.6 * s);
  const c = sink(v > 0.5 ? leaf : mix(leaf, INK.maple, 0.18), n);
  const blobs = [[0, -0.9, 0.95], [-0.6, -0.45, 0.6], [0.6, -0.5, 0.65], [-0.3, -1.4, 0.6], [0.35, -1.35, 0.55]];
  ctx.beginPath();
  for (const [bx, by, r] of blobs) { ctx.moveTo(X + (bx + r) * s, Y + by * s); ctx.arc(X + bx * s, Y + by * s, r * s, 0, Math.PI * 2); }
  paint(ctx, c, { lw: 0.04, dots: shade(c, 0.35), density: 0.18 });
}
function pine(ctx, x, y, s, n, v) {
  box(ctx, x - 0.1 * s, y - 0.1 * s, 0, 0.2 * s, 0.2 * s, 0.8 * s, sink(C.brown, n), { flat: true, lw: 0.03 });
  const [X, Y] = P3(x, y, 0.6 * s);
  const base = sink(v > 0.6 ? tint(INK.pine, 0.1) : INK.pine, n);
  for (let i = 0; i < 3; i++) {
    const w = (1 - i * 0.25) * s, yb = Y - i * 0.85 * s, c = i ? tint(base, i * 0.06) : base;
    ctx.beginPath(); ctx.moveTo(X - w, yb); ctx.lineTo(X + w, yb); ctx.lineTo(X, yb - 1.5 * s); ctx.closePath();
    paint(ctx, c, { lw: 0.04, dots: shade(c, 0.4), density: 0.15 });
  }
}
// A birch: a thin white trunk with its black marks, a little gold at the top.
function birch(ctx, x, y, s, n) {
  const bark = sink(C.white, n);
  box(ctx, x - 0.08 * s, y - 0.08 * s, 0, 0.16 * s, 0.16 * s, 2.7 * s, bark, { flat: true, lw: 0.03 });
  if (Q.detail) {
    ctx.fillStyle = C.ink;
    for (let k = 0; k < 4; k++) { const [X, Y] = P3(x + 0.08 * s, y + 0.08 * s, (0.5 + k * 0.55) * s); ctx.fillRect(X - 0.09 * s, Y - 0.03 * s, 0.09 * s, 0.05 * s); }
  }
  const [X, Y] = P3(x, y, 2.6 * s), c = sink(LEAF.birch, n);
  ctx.beginPath();
  for (const [bx, by, r] of [[0, -0.55, 0.55], [-0.4, -0.15, 0.36], [0.38, -0.2, 0.38]]) { ctx.moveTo(X + (bx + r) * s, Y + by * s); ctx.arc(X + bx * s, Y + by * s, r * s, 0, Math.PI * 2); }
  paint(ctx, c, { lw: 0.035, dots: shade(c, 0.3), density: 0.15 });
}
// One already bare: a grey trunk, its branches, a last few leaves.
function bare(ctx, x, y, s, n, v) {
  const bark = sink(mix(C.brown, C.grey, 0.45), n);
  box(ctx, x - 0.12 * s, y - 0.12 * s, 0, 0.24 * s, 0.24 * s, 2.2 * s, bark, { flat: true, lw: 0.03 });
  const [X, Y] = P3(x, y, 2.2 * s);
  ctx.beginPath();
  for (const [dx, dy, ox] of [[-0.9, -0.9, 0], [0.8, -1.0, 0], [-0.3, -1.4, 0], [0.5, -0.5, 0.6], [-0.6, -0.4, 0.9]]) {
    ctx.moveTo(X, Y + ox * s); ctx.lineTo(X + dx * s, Y + dy * s + ox * s);
  }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.13 * s; ctx.lineCap = 'round'; ctx.stroke();
  ctx.strokeStyle = bark; ctx.lineWidth = 0.07 * s; ctx.stroke();
  ctx.fillStyle = sink(v > 0.5 ? LEAF.orange : LEAF.red, n);
  for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(X + (hash(k, 7) - 0.5) * 1.4 * s, Y - (0.4 + hash(k, 9) * 0.9) * s, 0.08 * s, 0, Math.PI * 2); ctx.fill(); }
}
// The clearing: worn ground, a ring of stones round the pit, three logs
// to sit on. (The fire itself is live: fire().)
function pit(ctx, n) {
  const [px, py] = PIT;
  const [X, Y] = P3(px, py, 0);
  ctx.beginPath(); ctx.ellipse(X, Y, 6.4, 3.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = alpha(C.brown, 0.14); ctx.fill();
  const log = (x, y, w, d) => box(ctx, x, y, 0, w, d, 0.42, sink(C.wood, n), { flat: true, lw: 0.03, top: sink(C.woodLight, n) });
  log(px - 1.4, py - 3.3, 2.8, 0.5);
  log(px - 3.3, py - 1.2, 0.5, 2.4);
  ctx.beginPath(); ctx.ellipse(X, Y, 1.25, 0.62, 0, 0, Math.PI * 2);
  ctx.fillStyle = sink(shade(C.grey, 0.5), n); ctx.fill();
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2, [SX, SY] = P3(px + Math.cos(a) * 1.05, py + Math.sin(a) * 1.05, 0);
    ctx.beginPath(); ctx.ellipse(SX, SY - 0.08, 0.26, 0.17, 0, 0, Math.PI * 2);
    paint(ctx, sink(C.grey, n), { lw: 0.025 });
  }
  log(px + 2.7, py - 1, 0.5, 2.2);
}
// The owl's perch: a broken birch.
function snag(ctx, n) {
  box(ctx, OWL[0] - 0.12, OWL[1] - 0.12, 0, 0.24, 0.24, 2.5, sink(C.white, n), { flat: true, lw: 0.03, top: sink(C.wood, n) });
  if (Q.detail) { ctx.fillStyle = C.ink; for (let k = 0; k < 3; k++) { const [X, Y] = P3(OWL[0] + 0.12, OWL[1] + 0.12, 0.5 + k * 0.7); ctx.fillRect(X - 0.12, Y, 0.12, 0.05); } }
}

// The ridge: a long low hump of far woods, a shade deeper than the paper.
function ridge(ctx, n) {
  const [X, Y] = P3(RIDGE[0], RIDGE[1], 0);
  // By night a shade under the dark wood, so it stays a far hill.
  const c = mix(mix(INK.leaves, INK.maple, 0.22), shade(WOODS.night, 0.2), n);
  ctx.beginPath();
  ctx.moveTo(X - 26, Y + 1);
  ctx.bezierCurveTo(X - 16, Y - 2.4, X - 6, Y - 4.2, X + 2, Y - 3.6);
  ctx.bezierCurveTo(X + 10, Y - 3, X + 18, Y - 1.4, X + 26, Y + 1);
  ctx.closePath();
  ctx.save(); ctx.globalAlpha *= 0.55;
  paint(ctx, c, { stroke: false, dots: shade(c, 0.3), density: 0.12 });
  ctx.restore();
}
// A radio mast: a thin lattice in red and white bands, tapering to a point,
// held by guy wires. Its lights are live (mastLights).
const MAST_H = 22;
function mast(ctx, x, y, s, n) {
  const [X, Y] = P3(x, y, 0), h = MAST_H * s, w0 = 0.5 * s, w1 = 0.08 * s;
  ctx.save();
  ctx.strokeStyle = alpha(C.ink, 0.35); ctx.lineWidth = 0.03;
  ctx.beginPath();
  for (const k of [0.4, 0.7]) for (const dx of [-6, 6, -3.5, 3.5]) { ctx.moveTo(X, Y - h * k); ctx.lineTo(X + dx * s, Y + Math.abs(dx) * 0.18 * s); }
  ctx.stroke();
  const bands = 7;
  for (let i = 0; i < bands; i++) {
    const a = i / bands, b = (i + 1) / bands, wa = w0 + (w1 - w0) * a, wb = w0 + (w1 - w0) * b;
    ctx.beginPath();
    ctx.moveTo(X - wa, Y - h * a); ctx.lineTo(X + wa, Y - h * a); ctx.lineTo(X + wb, Y - h * b); ctx.lineTo(X - wb, Y - h * b); ctx.closePath();
    ctx.fillStyle = sink(i % 2 ? C.white : INK.maple, n); ctx.fill();
  }
  if (Q.detail) {
    // The lattice: a zigzag up the middle.
    ctx.beginPath();
    for (let i = 0; i <= 28; i++) { const a = i / 28, w = w0 + (w1 - w0) * a; ctx.lineTo(X + (i % 2 ? w : -w), Y - h * a); }
    ctx.strokeStyle = alpha(C.ink, 0.5); ctx.lineWidth = 0.025; ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(X - w0, Y); ctx.lineTo(X - w1, Y - h); ctx.lineTo(X + w1, Y - h); ctx.lineTo(X + w0, Y);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.04; ctx.stroke();
  ctx.restore();
}
// The masts' lights: red, slow, all day; brighter and glowing after dark.
function mastLights(ctx, t, n) {
  for (const [x, y, s] of MASTS) {
    const [X, Y] = P3(x, y, 0), h = MAST_H * s;
    const on = (t + s * 0.7) % 2 < 1;
    for (const k of [1, 0.5]) {
      if (n > 0.3 && on) glowAt(ctx, X, Y - h * k, 1.6, C.red, n * 0.8);
      ctx.beginPath(); ctx.arc(X, Y - h * k, 0.13, 0, Math.PI * 2);
      ctx.fillStyle = on ? C.red : shade(C.red, 0.45); ctx.fill();
    }
  }
}

function drawTree(ctx, tr, n, view) {
  const [x, y, kind, s, v] = tr;
  if (view) {
    const X = x - y, Y = (x + y) / 2;
    const mx = kind === 'pit' ? 7 : kind === 'ridge' ? 27 : kind === 'mast' ? 7 : 2;
    const up = kind === 'mast' ? MAST_H * s : HK * s;
    if (X < view[0] - mx || X > view[2] + mx || Y < view[1] - 0.5 || Y - up > view[3] + 0.5) return;
  }
  if (kind === 'pine') pine(ctx, x, y, s, n, v);
  else if (kind === 'birch') birch(ctx, x, y, s, n);
  else if (kind === 'bare') bare(ctx, x, y, s, n, v);
  else if (kind === 'pit') pit(ctx, n);
  else if (kind === 'snag') snag(ctx, n);
  else if (kind === 'ridge') ridge(ctx, n);
  else if (kind === 'mast') mast(ctx, x, y, s, n);
  else maple(ctx, x, y, s, LEAF[kind], n, v);
}
// The path's worn earth, under the trees.
function path(ctx) {
  ctx.beginPath();
  PATH.forEach(([x, y], i) => { const [X, Y] = P3(x, y, 0); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = alpha(C.brown, 0.16); ctx.lineWidth = 1.5; ctx.stroke();
  ctx.strokeStyle = alpha(C.brown, 0.12); ctx.lineWidth = 0.7; ctx.stroke();
  ctx.lineCap = 'butt';
}
const paintBack = (ctx, n, view) => { path(ctx); for (const tr of BACK) drawTree(ctx, tr, n, view); };
const paintFront = (ctx, n, view) => { for (const tr of FRONT) drawTree(ctx, tr, n, view); };

// ---------- The pictures ----------
// A picture of some trees at the camera's scale, with a margin round the
// view, stamped every frame. While the zoom is changing it stamps the last
// picture scaled (soft for a moment), and paints a sharp one once the zoom
// has held still for a beat, so a pinch doesn't repaint the wood every
// frame. A thumbnail, a turned or tiny view, draws the trees straight.
const clip = (a, b) => { const r = [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])]; return r[2] > r[0] && r[3] > r[1] ? r : null; };
const now = () => (typeof performance !== 'undefined' ? performance.now() : 0);
function picture(slot, ctx, fx, BOX, key, draw) {
  const m = ctx.getTransform(), k = m.a, view = fx && fx.view;
  if (!view || fx.thumb || Math.abs(m.b) > 1e-6 || Math.abs(m.d - k) > 1e-6 || k < 0.5) return draw(ctx, view);
  const need = clip(BOX, view);
  if (!need) return;
  const shot = slot.shot;
  const covers = shot && need[0] >= shot.box[0] && need[1] >= shot.box[1] && need[2] <= shot.box[2] && need[3] <= shot.box[3];
  if (Math.abs(k - (slot.k || 0)) > 1e-6) { slot.k = k; slot.moved = now(); }
  const zooming = now() - (slot.moved || 0) < 260;
  const same = shot && shot.key === key && covers;
  if (!(same && Math.abs(shot.k - k) < 1e-6) && !(same && zooming && Math.abs(shot.k / k - 1) < 0.5)) {
    const w = view[2] - view[0], h = view[3] - view[1], mg = covers && shot.key !== key ? 0.15 : 0.5;
    let b = clip(BOX, [view[0] - w * mg, view[1] - h * mg, view[2] + w * mg, view[3] + h * mg]);
    b = [Math.floor(b[0] * k) / k, Math.floor(b[1] * k) / k, Math.ceil(b[2] * k) / k, Math.ceil(b[3] * k) / k];
    const PW = Math.round((b[2] - b[0]) * k), PH = Math.round((b[3] - b[1]) * k);
    if (PW * PH > 24e6 || PW < 1 || PH < 1) return draw(ctx, view);
    const cv = (shot && shot.cv) || document.createElement('canvas');
    if (cv.width < PW || cv.height < PH) { cv.width = Math.max(cv.width, PW); cv.height = Math.max(cv.height, PH); }
    const g = cv.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, PW, PH);
    g.save();
    g.beginPath(); g.rect(0, 0, PW, PH); g.clip();
    g.setTransform(k, 0, 0, k, -b[0] * k, -b[1] * k);
    g.lineJoin = 'round';
    draw(g, b);
    g.restore();
    slot.shot = { cv, key, box: b, W: PW, H: PH, k };
  }
  const s = slot.shot;
  ctx.drawImage(s.cv, 0, 0, s.W, s.H, s.box[0], s.box[1], s.W / s.k, s.H / s.k);
}
// The page boxes the two woods can reach, iso units.
const BACK_BOX = [-70, -40, 142, 74], FRONT_BOX = [-75, 8, 142, 100];
const backShot = {}, frontShot = {};

// ---------- Alive ----------
// The fire, lit at five, roaring by dark, embers after eleven, out by one.
function fireK(t) {
  const h = H(t);
  return ramp(16.95, 17.3, h) * (1 - ramp(23, 25, h));
}
function fire(ctx, t, n) {
  const k = fireK(t);
  if (k <= 0) return;
  const [X, Y] = P3(PIT[0], PIT[1], 0.1);
  const h = H(t), roar = 1 - ramp(22.6, 23.4, h); // flames, then just embers
  if (n > 0.2) glowAt(ctx, X, Y - 0.6, 7 + Math.sin(t * 7) * 0.4, C.mustard, n * k * 0.75);
  ctx.beginPath(); ctx.ellipse(X, Y, 0.85, 0.42, 0, 0, Math.PI * 2);
  ctx.fillStyle = mix(C.coral, C.butter, 0.25 + 0.2 * Math.sin(t * 9)); ctx.fill();
  if (roar <= 0) return;
  const f = k * roar;
  const flame = (dx, hgt, w, c, ph) => {
    const sway = Math.sin(t * 8 + ph) * 0.12, top = hgt * (0.85 + 0.15 * Math.sin(t * 11 + ph * 2)) * f;
    ctx.beginPath();
    ctx.moveTo(X + dx - w, Y);
    ctx.quadraticCurveTo(X + dx - w * 0.6, Y - top * 0.6, X + dx + sway, Y - top);
    ctx.quadraticCurveTo(X + dx + w * 0.6, Y - top * 0.6, X + dx + w, Y);
    ctx.closePath();
    paint(ctx, c, { lw: 0.03 });
  };
  flame(-0.35, 1.0, 0.3, C.coral, 0);
  flame(0.35, 1.1, 0.32, C.coral, 2);
  flame(0, 1.6, 0.4, INK.maple, 1);
  flame(0, 0.95, 0.24, C.mustard, 3);
  flame(0.1, 0.5, 0.12, C.butter, 4);
  // Sparks going up.
  if (Q.detail) for (let i = 0; i < 4; i++) {
    const u = (t * 0.6 + i * 0.27) % 1;
    ctx.fillStyle = alpha(C.butter, 1 - u);
    ctx.fillRect(X + Math.sin(t * 2 + i * 3) * 0.5 * u, Y - 1.2 - u * 3, 0.07, 0.07);
  }
}
// Everyone at the fire pit: they come down from five, one by one, and drift
// home after nine. Small and simple, a few shapes each.
const CROWD = Array.from({ length: 10 }, (_, i) => {
  const a = -0.2 + (i / 10) * Math.PI * 2 + (hash(i, 31) - 0.5) * 0.3, r = 2.2 + hash(i, 33) * 0.5;
  return {
    x: PIT[0] + Math.cos(a) * r, y: PIT[1] + Math.sin(a) * r,
    top: [C.coral, C.teal, C.purple, C.mustard, C.navy, C.pink, C.green, C.white, C.red, C.sky][i],
    come: 17.05 + i * 0.09, go: 21.2 + hash(i, 35) * 1.1, stick: i % 4 === 1,
    sit: i % 3 === 0,
  };
}).sort((p, q) => p.x + p.y - q.x - q.y);
function crowd(ctx, t, n) {
  const h = H(t);
  if (h < 17 || h > 22.5) return;
  for (const c of CROWD) {
    const a = ramp(c.come, c.come + 0.15, h) * (1 - ramp(c.go, c.go + 0.15, h));
    if (a <= 0.01) continue;
    const [X, Y] = P3(c.x, c.y, 0);
    const a0 = ctx.globalAlpha;
    ctx.globalAlpha = a0 * a;
    const lift = c.sit ? 0.35 : 0, bob = Math.sin(t * 2 + c.x) * 0.03;
    const body = sink(c.top, n * 0.6), skin = sink(C.blush, n * 0.5);
    if (!c.sit) { ctx.fillStyle = C.ink; ctx.fillRect(X - 0.17, Y - 0.62, 0.11, 0.62); ctx.fillRect(X + 0.06, Y - 0.62, 0.11, 0.62); }
    ctx.beginPath(); ctx.roundRect(X - 0.27, Y - 1.45 + lift + bob, 0.54, 0.86, 0.2); paint(ctx, body, { lw: 0.035 });
    ctx.beginPath(); ctx.arc(X, Y - 1.72 + lift + bob, 0.24, 0, Math.PI * 2); paint(ctx, skin, { lw: 0.035 });
    if (c.stick) {
      // A marshmallow on a stick, held out over the fire.
      const [FX, FY] = P3(PIT[0], PIT[1], 1.1);
      const ex = X + (FX - X) * 0.55, ey = Y - 1.1 + lift + (FY - Y + 1.1) * 0.3;
      ctx.beginPath(); ctx.moveTo(X, Y - 1.05 + lift); ctx.lineTo(ex, ey);
      ctx.strokeStyle = C.brown; ctx.lineWidth = 0.05; ctx.stroke();
      ctx.beginPath(); ctx.arc(ex, ey, 0.09, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.02 });
    }
    ctx.globalAlpha = a0;
  }
}
// A little mist in the wood at dawn, lifting by half past eight (and coming
// back in the small hours).
const MIST = [[18, -12, 16], [58, -16, 20], [96, -11, 15], [-9, 8, 12], [-11, 32, 12], [34, -26, 18], [120, -5, 12], [76, -30, 18]];
function mist(ctx, t) {
  const h = H(t), k = Math.max(1 - ramp(7.2, 8.6, h), ramp(29.6, 31, h));
  if (k <= 0.01) return;
  ctx.save();
  for (const [x, y, r] of MIST) {
    const [X, Y] = P3(x, y, 1.2);
    const dx = Math.sin(t * 0.05 + x) * 1.5;
    for (let j = 0; j < 3; j++) {
      ctx.beginPath();
      ctx.ellipse(X + dx, Y - j * 0.4, r * (1 - j * 0.25), r * 0.22 * (1 - j * 0.2), 0, 0, Math.PI * 2);
      ctx.fillStyle = alpha(C.white, 0.16 * k);
      ctx.fill();
    }
  }
  ctx.restore();
}
// The owl, on its snag after dark: two big eyes that blink now and then.
function owl(ctx, t, n) {
  if (n < 0.5) return;
  const [X, Y] = P3(OWL[0], OWL[1], 2.5);
  const body = sink(mix(C.brown, C.grey, 0.3), 0.3);
  ctx.beginPath(); ctx.ellipse(X, Y - 0.45, 0.32, 0.45, 0, 0, Math.PI * 2); paint(ctx, body, { lw: 0.035 });
  ctx.beginPath(); ctx.moveTo(X - 0.28, Y - 0.78); ctx.lineTo(X - 0.2, Y - 1.02); ctx.lineTo(X - 0.06, Y - 0.84);
  ctx.moveTo(X + 0.28, Y - 0.78); ctx.lineTo(X + 0.2, Y - 1.02); ctx.lineTo(X + 0.06, Y - 0.84);
  ctx.fillStyle = body; ctx.fill();
  const blink = (t % 7) < 0.18;
  for (const ex of [-0.12, 0.12]) {
    ctx.beginPath();
    if (blink) ctx.rect(X + ex - 0.09, Y - 0.66, 0.18, 0.03);
    else ctx.arc(X + ex, Y - 0.65, 0.09, 0, Math.PI * 2);
    ctx.fillStyle = C.butter; ctx.fill();
    if (!blink) { ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(X + ex, Y - 0.65, 0.04, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.fillStyle = C.mustard; ctx.beginPath(); ctx.moveTo(X - 0.04, Y - 0.58); ctx.lineTo(X + 0.04, Y - 0.58); ctx.lineTo(X, Y - 0.5); ctx.fill();
}

// ---------- Under ----------
export function backdrop(ctx, t, world, fx) {
  const n = nightStep(t);
  picture(backShot, ctx, fx, BACK_BOX, 'b' + n + Q.detail + Q.lines, (g, view) => paintBack(g, n, view));
  mastLights(ctx, t, n);
  fire(ctx, t, n);
  crowd(ctx, t, n);
  owl(ctx, t, n);
  mist(ctx, t);
  const ink = n > 0.5 ? alpha(C.white, 0.4) : alpha(C.ink, 0.5);
  reg(ctx, (W - D) / 2, -24, ink);
  reg(ctx, (W - D) / 2, (W + D) / 2 + 12, ink);
  const k = 40;
  ctx.save();
  ctx.translate(-D + 6, (W + D) / 2 + 4);
  ctx.scale(1 / k, 1 / k);
  ctx.font = `${0.9 * k}px "Rethink Sans", system-ui, sans-serif`;
  ctx.fillStyle = ink;
  ctx.textBaseline = 'middle';
  ctx.fillText('GOOSE AT LARGE  ·  PITCH DAY  ·  PRIMAL, A DIGITAL AGENCY', 0, 0);
  ctx.restore();
}

// ---------- Over ----------
// Leaves coming down, a few at a time, over the edges of the wood and the
// lot (a leaf takes eight seconds from the branches to the ground).
const LEAVES = Array.from({ length: 14 }, (_, i) => {
  const side = i % 3;
  const u = hash(i, 51);
  const [x, y] = side === 0 ? [u * W, -1.5 - hash(i, 52) * 3] : side === 1 ? [u * W, D + 1 + hash(i, 52) * 3] : [-1.5 - hash(i, 52) * 2.5, u * D];
  return { x, y, ph: hash(i, 53) * 8, c: [INK.maple, C.mustard, LEAF.orange][i % 3] };
});
function leaves(ctx, t, fx) {
  if (!Q.detail || H(t) > 18.6) return;
  const view = fx && fx.view;
  for (const l of LEAVES) {
    const u = ((t + l.ph) % 8) / 8;
    const x = l.x + u * 2.5 + Math.sin(t * 1.3 + l.ph) * 0.5, z = 6.5 * (1 - u);
    const [X, Y] = P3(x, l.y + u * 1.2, z);
    if (view && (X < view[0] || X > view[2] || Y < view[1] || Y > view[3])) continue;
    ctx.save();
    ctx.translate(X, Y);
    ctx.rotate(t * 2.2 + l.ph);
    ctx.globalAlpha *= Math.min(1, u * 6, (1 - u) * 6);
    ctx.beginPath(); ctx.ellipse(0, 0, 0.17, 0.08, 0, 0, Math.PI * 2);
    ctx.fillStyle = l.c; ctx.fill();
    ctx.restore();
  }
}
// A few stars over the far wood in the night.
const STARS = Array.from({ length: 18 }, (_, i) => [hash(i, 61) * 150 - 20, -12 - hash(i, 62) * 40, hash(i, 63) * 9]);
function stars(ctx, t, fx, n) {
  if (n < 0.6 || !Q.detail) return;
  const view = fx && fx.view;
  ctx.fillStyle = alpha(C.butter, 0.9 * (n - 0.5) * 2);
  for (const [x, y, ph] of STARS) {
    const [X, Y] = P3(x, y, 26);
    if (view && (X < view[0] || X > view[2] || Y < view[1] || Y > view[3])) continue;
    const r = 0.1 + 0.08 * Math.sin(t * 2.3 + ph);
    ctx.fillRect(X - r * 2.5, Y - r * 0.4, r * 5, r * 0.8);
    ctx.fillRect(X - r * 0.4, Y - r * 2.5, r * 0.8, r * 5);
  }
}

export function sky(ctx, t, world, fx) {
  follow(fx);
  const n = nightStep(t);
  beyond(ctx, t);
  picture(frontShot, ctx, fx, FRONT_BOX, 'f' + n + Q.detail + Q.lines, (g, view) => paintFront(g, n, view));
  leaves(ctx, t, fx);
  stars(ctx, t, fx, n);
  const [X0, X1] = world.overviewBox(false);
  if (H(t) < 18) birds(ctx, t, 0, (X1 - X0) / 2);
  if (fx.parade) geeseV(ctx, t, fx.parade, world.totalGeese, (X1 - X0) / 2);
}
