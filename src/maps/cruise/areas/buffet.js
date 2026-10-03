// The Buffet: the crime scene, in the middle of the Promenade. The queue at
// the doors from the Theater, the hot trays along the hull, the salad bar
// under its sneeze guard, the butter swan, the shrimp tower, the chocolate
// fountain and Chef Gaston's carvery. Through the day the plates get bigger,
// the faces get greener, the swan slumps, and at 1pm the doctor tapes off
// the salad bar (and people reach under the tape for croutons).
//
// Units are the area's own: x from the stern end (0) to the bow end (32), y
// from the hull (0) to the cut side (16). The engine cuts a 32-long area into
// two chunks at x 16, so long counters are drawn in short pieces that never
// cross it (and that sort properly with people in front and behind).
import {
  C, Q, box, rect, disc, cylinder, face, paint, person, folk, shade, tint, mix, alpha,
  label, paintText, onLeft, onRight, glow, plant, P,
} from '../../../engine/art.js';
import { particles, clamp, pulse } from '../../../engine/actors.js';
import { deck } from '../ship.js';
import { INK, MAT, at, wrap, hourOf, green, queasy, iguana, chase, chaseOpen } from '../style.js';
import { porthole, lettering, board, bucket, lifebuoy, CREW_LOOK, shape, sighting } from '../kit.js';

const SEAM = 16; // where the engine cuts the area in two
const STEEL = MAT.steel, CHROME = MAT.chrome;
const GLASS = alpha(MAT.glass, 0.32);
const TAPE_ON = at(13) + 8.5; // Dr. Swabb gets to the salad bar just after 1pm and tapes it
const TAPE_DONE = TAPE_ON + 10;

// How far through the day it is, 0 at 7am to 1 at 7pm.
const dayK = (t) => clamp((hourOf(t) - 7) / 12);
// The same, in whole hours (the swan slumps an hour at a time).
const hourStep = (t) => Math.floor(hourOf(t) - 7) / 12;

// ---------- Counters ----------
// A counter from x0 to x1, y0 to y1, h tall, in pieces about 1.3 long and
// never across the seam. top(ctx, a, b) draws what sits on the piece a to b.
function counter(R, x0, x1, y0, y1, h, o, top) {
  const n = Math.max(1, Math.round((x1 - x0) / 1.3));
  let cuts = [];
  for (let i = 0; i <= n; i++) cuts.push(x0 + ((x1 - x0) * i) / n);
  if (x0 < SEAM && x1 > SEAM) {
    cuts = cuts.filter((c) => Math.abs(c - SEAM) > 0.35 || c === x0 || c === x1);
    cuts.push(SEAM);
    cuts.sort((a, b) => a - b);
  }
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i], b = cuts[i + 1];
    R.thing(a, y1, (ctx) => {
      box(ctx, a, y0, 0, b - a, y1 - y0, h - 0.1, o.body, { dotsL: shade(o.body, 0.5), dens: 0.16 });
      box(ctx, a, y0 - 0.05, h - 0.1, b - a, y1 - y0 + 0.1, 0.1, o.top, { flat: true, lw: 0.04 });
      if (o.kick !== false) box(ctx, a, y1 - 0.02, 0, b - a, 0.04, 0.16, shade(o.body, 0.45), { flat: true, stroke: false });
      if (top) top(ctx, a, b, i);
    });
  }
}

// A sneeze guard over a counter piece: two posts at the back and a sloped
// pane of glass out over the food.
function sneezeGuard(ctx, a, b, yBack, yFront, z0, z1) {
  for (const x of [a + 0.08, b - 0.08]) {
    face(ctx, [[x, yBack, z0], [x, yBack, z1]], null, { lw: 0.05, stroke: CHROME });
  }
  face(ctx, [[a + 0.02, yBack, z1], [b - 0.02, yBack, z1], [b - 0.02, yFront, z1 - 0.25], [a + 0.02, yFront, z1 - 0.25]], GLASS, { lw: 0.03, stroke: alpha(C.ink, 0.5) });
  if (Q.detail) face(ctx, [[a + 0.2, yBack + 0.2, z1 - 0.03], [a + 0.5, yFront - 0.2, z1 - 0.22]], null, { lw: 0.04, stroke: alpha(C.white, 0.7) });
}

// A pair of serving tongs lying across a bowl or a tray, handle up to the
// right. scrunchie: Doreen's, a pink one round the handle.
function tongs(ctx, x, y, z, o = {}) {
  const lift = o.lift ?? 0.3;
  for (const dy of [-0.05, 0.05]) {
    face(ctx, [[x - 0.32, y + dy * 1.6, z - lift / 2], [x + 0.3, y + dy, z + lift / 2]], null, { lw: 0.075, stroke: C.ink });
    face(ctx, [[x - 0.32, y + dy * 1.6, z - lift / 2], [x + 0.3, y + dy, z + lift / 2]], null, { lw: 0.04, stroke: CHROME });
  }
  // the hinge loop at the handle end
  const [X, Y] = P(x + 0.32, y, z + lift / 2 + 0.01);
  ctx.beginPath();
  ctx.arc(X, Y, 0.06, 0, Math.PI * 2);
  paint(ctx, STEEL, { lw: 0.025 });
  if (o.scrunchie) {
    const [SX, SY] = P(x + 0.17, y, z + lift * 0.3);
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      ctx.moveTo(SX + Math.cos(a) * 0.12 + 0.07, SY + Math.sin(a) * 0.08);
      ctx.arc(SX + Math.cos(a) * 0.12, SY + Math.sin(a) * 0.08, 0.07, 0, Math.PI * 2);
    }
    paint(ctx, INK.flamingo, { lw: 0.02, dots: shade(INK.flamingo, 0.35), density: 0.3 });
  }
}

// A bowl sunk into a counter top, full of something.
function bowl(ctx, x, y, z, r, food, bits) {
  disc(ctx, x, y, z + 0.01, r + 0.05, CHROME, { lw: 0.03 });
  disc(ctx, x, y, z + 0.03, r, food, { lw: 0.02, dots: shade(food, 0.35), density: 0.25 });
  if (bits && Q.detail) {
    ctx.fillStyle = bits;
    for (let i = 0; i < 5; i++) {
      const a = i * 2.4 + x;
      const [X, Y] = P(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, z + 0.05);
      ctx.beginPath();
      ctx.arc(X, Y, 0.05, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ---------- The hot trays ----------
// Eight chafing dishes along the hull, one to a piece of counter.
const TRAYS = [
  { name: 'EGGS', food: C.butter, bits: tint(C.mustard, 0.3), tongs: true },
  { name: 'BACON', food: C.coralLight, bits: C.red, tongs: true, lid: true },
  { name: 'SAUSAGE', food: C.brown, bits: shade(C.brown, 0.3), tongs: true },
  { name: 'PANCAKES', food: C.woodLight, stack: true },
  { name: 'HASH', food: C.mustard, bits: C.wood, rolltop: true }, // shut, Doreen's tongs inside (hashDish)
  { name: 'BEANS', food: C.coral, bits: C.red },
  { name: 'CLUBS', food: C.white, clubs: true },
  { name: 'MUFFINS', food: C.wood, muffins: true },
];
function hotTray(ctx, a, b, i) {
  const tr = TRAYS[i];
  if (!tr) return;
  const cx = (a + b) / 2, y0 = 2.15, y1 = 2.95, z = 1.0;
  box(ctx, a + 0.12, y0, z - 0.02, b - a - 0.24, y1 - y0, 0.1, CHROME, { flat: true, lw: 0.03 });
  rect(ctx, a + 0.2, y0 + 0.08, b - a - 0.4, y1 - y0 - 0.16, z + 0.09, tr.food, { lw: 0.02, dots: shade(tr.food, 0.35), density: 0.25 });
  if (Q.detail && tr.bits) {
    ctx.fillStyle = tr.bits;
    for (let k = 0; k < 6; k++) {
      const [X, Y] = P(a + 0.35 + ((k * 0.37) % (b - a - 0.6)), y0 + 0.2 + (k % 3) * 0.2, z + 0.1);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.08, 0.04, 0.3, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (tr.stack) for (let k = 0; k < 4; k++) disc(ctx, cx, 2.55, z + 0.1 + k * 0.06, 0.3, k === 3 ? C.butter : C.woodLight, { lw: 0.02 });
  if (tr.clubs) {
    // club sandwiches, each on a frilly pick with a paper flag (like the shrimp's)
    for (let k = 0; k < 3; k++) {
      const sx = a + 0.35 + k * 0.28, sy = 2.45 + (k % 2) * 0.2;
      box(ctx, sx - 0.1, sy - 0.1, z + 0.1, 0.2, 0.2, 0.18, C.woodLight, { flat: true, lw: 0.02, top: C.butter });
      face(ctx, [[sx, sy, z + 0.28], [sx, sy, z + 0.55]], null, { lw: 0.025, stroke: C.woodLight });
      if (Q.detail) shape(ctx, [[sx, sy, z + 0.55], [sx + 0.12, sy, z + 0.5], [sx, sy, z + 0.45]], k % 2 ? C.white : INK.funnelRed, { lw: 0.012 });
    }
  }
  if (tr.muffins) {
    for (let k = 0; k < 5; k++) {
      const [X, Y] = P(a + 0.32 + (k % 3) * 0.3, 2.4 + Math.floor(k / 3) * 0.3, z + 0.18);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.14, 0.1, 0, Math.PI, 0); paint(ctx, C.brown, { lw: 0.02 });
      ctx.beginPath(); ctx.rect(X - 0.11, Y, 0.22, 0.1); paint(ctx, C.white, { lw: 0.02 });
    }
  }
  if (tr.lid) {
    // a lid tipped open at the back
    const [X, Y] = P(cx, y0 + 0.05, z + 0.35);
    ctx.beginPath(); ctx.ellipse(X, Y, 0.5, 0.3, 0, Math.PI, 0); ctx.closePath();
    paint(ctx, CHROME, { lw: 0.03, dots: STEEL, density: 0.2 });
  }
  if (tr.tongs) tongs(ctx, cx - 0.05, 2.6, z + 0.25, { lift: 0.25 });
  lettering(ctx, 'x', cx, 3.12, 0.62, tr.name, 0.2, C.ink);
}

// The hash, shut under a roll-top lid. Doreen's tongs went in with it: the
// handle sticks out of the front, pink scrunchie and all (the tell). A tap
// tips the lid back on its hinge. k: 0 shut, 1 open.
const HASH = { x0: 9.12, x1: 10.13, yc: 2.55, zc: 1.09, r: 0.4 };
const TONGS = [9.72, 2.86, 1.2]; // the middle of Doreen's tongs, handle to the front
// Doreen's tongs lying along y, tips in the hash, handle out over the lip.
// from: only draw what's in front of this y (the bit the lid can't cover).
function tongsY(ctx, from = -1) {
  const [x, y, z] = TONGS, lift = 0.22;
  const at = (u) => [x, y - 0.32 + u * 0.62, z - lift / 2 + u * lift];
  const u0 = Math.max(0, (from - (y - 0.32)) / 0.62);
  for (const dx of [-0.05, 0.05]) {
    const a = at(u0), b = at(1);
    face(ctx, [[a[0] + dx * (1.6 - u0 * 0.6), a[1], a[2]], [b[0] + dx, b[1], b[2]]], null, { lw: 0.075, stroke: C.ink });
    face(ctx, [[a[0] + dx * (1.6 - u0 * 0.6), a[1], a[2]], [b[0] + dx, b[1], b[2]]], null, { lw: 0.04, stroke: CHROME });
  }
  const [hx, hy, hz] = at(1.03);
  const [X, Y] = P(hx, hy, hz);
  ctx.beginPath(); ctx.arc(X, Y, 0.06, 0, Math.PI * 2); paint(ctx, STEEL, { lw: 0.025 });
  // the scrunchie, round the handle
  const [sx, sy, sz] = at(0.8);
  const [SX, SY] = P(sx, sy, sz);
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    ctx.moveTo(SX + Math.cos(a) * 0.12 + 0.07, SY + Math.sin(a) * 0.08);
    ctx.arc(SX + Math.cos(a) * 0.12, SY + Math.sin(a) * 0.08, 0.07, 0, Math.PI * 2);
  }
  paint(ctx, INK.flamingo, { lw: 0.02, dots: shade(INK.flamingo, 0.35), density: 0.3 });
}
// The roll-top lid: a half dome along x, hinged along its back edge.
function rollTop(ctx, k) {
  const { x0, x1, yc, zc, r } = HASH;
  const b = k * 1.95; // tipped back to just past upright
  const N = 8, arc = [];
  for (let i = 0; i <= N; i++) {
    const th = (Math.PI * i) / N;
    const vy = r * Math.cos(th) + r, vz = r * 0.78 * Math.sin(th);
    arc.push([yc - r + vy * Math.cos(b) - vz * Math.sin(b), zc + vy * Math.sin(b) + vz * Math.cos(b)]);
  }
  // Strips of the dome, back to front, then the end facing us.
  const strips = [];
  for (let i = 0; i < N; i++) strips.push([arc[i], arc[i + 1], arc[i][0] + arc[i + 1][0] + (arc[i][1] + arc[i + 1][1]) * 0.6]);
  strips.sort((a, c) => a[2] - c[2]);
  for (const [p, q] of strips) {
    const up = (p[1] + q[1]) / 2 - zc;
    face(ctx, [[x0, p[0], p[1]], [x1, p[0], p[1]], [x1, q[0], q[1]], [x0, q[0], q[1]]], up > 0.22 ? tint(CHROME, 0.25) : CHROME, { lw: 0.025 });
  }
  face(ctx, arc.map(([y, z]) => [x1, y, z]), shade(CHROME, 0.12), { lw: 0.03, dots: STEEL, density: 0.2 });
  // the knob
  const top = arc[N / 2];
  const [X, Y] = P((x0 + x1) / 2, top[0], top[1] + 0.06);
  ctx.beginPath(); ctx.ellipse(X, Y, 0.09, 0.05, 0, 0, Math.PI * 2); paint(ctx, C.black, { lw: 0.02 });
}

// ---------- The salad bar ----------
// Bowls under a sneeze guard. Two big heaps of lettuce side by side: the
// iguana's breakfast spot (and, 7 to 9am, its hiding place) is the left one.
// The far end has Chef Gaston's garnish: a cucumber carved into a lizard.
const LETTUCE = [[13.1, 8.0], [14.5, 8.0]]; // the iguana's heap, then the other
const BAR = [
  [[C.red, shade(C.red, 0.3)], [C.woodLight, C.mustard]], // tomatoes, croutons
  null, null, // the lettuce
  [[C.coral, C.coralLight]], // salmon
  [[C.purple, shade(C.purple, 0.3)]], // beets
  [[C.white, C.butter]], // eggs (and the garnish beside them)
];
function saladPiece(ctx, a, b, idx) {
  const row = BAR[idx];
  if (!row) {
    // a big bowl for a heap of lettuce (the heap, and this guard, are drawn after it)
    const cx = (a + b) / 2;
    disc(ctx, cx, 8.0, 1.01, 0.56, CHROME, { lw: 0.03 });
    disc(ctx, cx, 8.0, 1.03, 0.5, shade(C.leaf, 0.25), { lw: 0.02 });
    return;
  }
  const n = row.length, end = idx === BAR.length - 1;
  for (let k = 0; k < n; k++) {
    const x = end ? a + 0.35 : a + ((k + 0.5) * (b - a)) / n;
    bowl(ctx, x, 8.0, 1.0, 0.28, row[k][0], row[k][1]);
  }
  if (idx === 3) tongs(ctx, 15.6, 7.95, 1.25);
  if (end) cucumberLizard(ctx, 17.4, 8.05, 1.03);
  sneezeGuard(ctx, a, b, 7.35, 8.85, 1.0, 2.15);
}

// A heap of lettuce, in two halves that part when tapped (k: 0 shut, 1 open).
// Leaves in screen units round the bowl's middle: [dx, dy, rx, ry, turn, tone].
const LEAVES = [
  [-0.12, -0.5, 0.24, 0.15, -0.3, 1], [0.14, -0.5, 0.24, 0.15, 0.3, 2],
  [-0.38, -0.34, 0.26, 0.16, -0.5, 0], [0.36, -0.36, 0.26, 0.16, 0.5, 1], [-0.02, -0.3, 0.2, 0.14, 0.1, 0],
  [-0.55, -0.12, 0.2, 0.13, -0.6, 2], [0.55, -0.14, 0.2, 0.13, 0.6, 0],
  [-0.24, -0.12, 0.26, 0.15, 0.2, 1], [0.24, -0.12, 0.26, 0.15, -0.2, 2],
];
const LEAF_TONES = [C.leaf, tint(C.leaf, 0.3), shade(C.leaf, 0.12)];
function leaf(ctx, dx, dy, rx, ry, rot, color) {
  ctx.save();
  ctx.translate(dx, dy);
  ctx.rotate(rot);
  // a ruffled edge: the ellipse with a wavy rim
  ctx.beginPath();
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI * 2, w = 1 + (i % 2 ? 0.08 : -0.04);
    ctx.lineTo(Math.cos(a) * rx * w, Math.sin(a) * ry * w);
  }
  ctx.closePath();
  paint(ctx, color, { lw: 0.022 });
  if (Q.detail) {
    ctx.beginPath(); ctx.moveTo(-rx * 0.7, 0); ctx.lineTo(rx * 0.7, 0);
    ctx.moveTo(-rx * 0.2, 0); ctx.lineTo(-rx * 0.4, -ry * 0.5); ctx.moveTo(rx * 0.2, 0); ctx.lineTo(rx * 0.05, -ry * 0.55);
    ctx.strokeStyle = tint(C.leaf, 0.55); ctx.lineWidth = 0.018; ctx.stroke();
  }
  ctx.restore();
}
function lettuceHeap(ctx, x, y, k) {
  const [X, Y] = P(x, y, 1.05);
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(X + side * 0.85 * k, Y - 0.06 * k);
    ctx.rotate(side * 0.3 * k);
    // the heap's body, so nothing shows between the leaves
    ctx.beginPath();
    ctx.moveTo(0, 0.1);
    ctx.lineTo(0, -0.62);
    ctx.ellipse(0, 0, 0.72, 0.62, 0, -Math.PI / 2, side < 0 ? -Math.PI : 0, side < 0);
    ctx.lineTo(side * 0.66, 0.08);
    ctx.closePath();
    paint(ctx, shade(C.leaf, 0.2), { lw: 0.03, dots: shade(C.leaf, 0.45), density: 0.2 });
    for (const [dx, dy, rx, ry, rot, tone] of LEAVES) if (Math.sign(dx) === side || (dx === 0 && side > 0)) leaf(ctx, dx, dy, rx, ry, rot, LEAF_TONES[tone]);
    ctx.restore();
  }
  // The bed of leaves along the bowl's front lip.
  ctx.save();
  ctx.translate(X, Y);
  for (const [dx, dy, tone] of [[-0.46, 0.06, 2], [-0.16, 0.12, 0], [0.16, 0.12, 1], [0.46, 0.06, 0]]) leaf(ctx, dx, dy, 0.2, 0.08, dx * 0.4, LEAF_TONES[tone]);
  ctx.restore();
}

// The iguana's tail, from under the lettuce, over the bowl's rim and the
// counter's front edge and down its face, the tip curled and twitching. In
// screen units from the iguana's feet (X, Y). Drawn as short pieces that
// taper, banded like the real one (style.js's iguana).
function hangingTail(ctx, X, Y, t) {
  const sw = Math.sin(t * 1.3) * 0.03 + (Math.sin(t * 7) > 0.97 ? 0.04 : 0);
  const segs = [
    [[-0.33, -0.2], [-0.55, -0.22], [-0.78, -0.06], [-0.82, 0.13]],
    [[-0.82, 0.13], [-0.86, 0.32], [-0.9 + sw, 0.56], [-0.79 + sw, 0.62]],
    [[-0.79 + sw, 0.62], [-0.71 + sw, 0.66], [-0.66 + sw, 0.56], [-0.72 + sw, 0.51]],
  ];
  const pts = [];
  for (const [a, b, c, d] of segs) for (let i = pts.length ? 1 : 0; i <= 8; i++) {
    const u = i / 8, v = 1 - u;
    pts.push([X + v * v * v * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u * u * u * d[0],
      Y + v * v * v * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u * u * u * d[1]]);
  }
  const w = (i) => 0.15 - (0.13 * i) / (pts.length - 1);
  ctx.lineCap = 'round';
  for (const pass of [0, 1]) {
    if (!pass && !Q.lines) continue;
    ctx.strokeStyle = pass ? INK.queasyGreen : C.ink;
    for (let i = 0; i < pts.length - 1; i++) {
      ctx.lineWidth = w(i) + (pass ? 0 : 0.05);
      ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i + 1][0], pts[i + 1][1]); ctx.stroke();
    }
  }
  if (!Q.detail) return;
  // dark bands across it
  ctx.strokeStyle = shade(INK.queasyGreen, 0.35);
  ctx.lineWidth = 0.035;
  ctx.beginPath();
  for (const i of [5, 9, 12, 15, 18]) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, r = w(i) / 2;
    ctx.moveTo(x0 - (dy / l) * r, y0 + (dx / l) * r); ctx.lineTo(x0 + (dy / l) * r, y0 - (dx / l) * r);
  }
  ctx.stroke();
}

// Chef Gaston's garnish: a cucumber carved into a lizard, on a doily. Its
// legs are slices, its crest is skin, its eyes are olives. (The decoy.)
function cucumberLizard(ctx, x, y, z) {
  const skin = mix(C.green, INK.queasyGreen, 0.55), flesh = tint(INK.queasyGreen, 0.6);
  disc(ctx, x, y, z, 0.4, C.white, { lw: 0.02 });
  if (Q.detail) disc(ctx, x, y, z + 0.005, 0.34, alpha(C.greyLight, 0.6), { stroke: false });
  const [X, Y] = P(x, y, z + 0.02);
  ctx.save();
  ctx.translate(X, Y);
  // the tail: a curl of peel
  ctx.beginPath();
  ctx.moveTo(-0.28, -0.1);
  ctx.bezierCurveTo(-0.55, -0.05, -0.62, -0.28, -0.48, -0.32);
  ctx.bezierCurveTo(-0.38, -0.35, -0.38, -0.22, -0.46, -0.22);
  ctx.lineCap = 'round';
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.08; ctx.stroke(); }
  ctx.strokeStyle = skin; ctx.lineWidth = 0.045; ctx.stroke();
  // legs: four slices, seeds and all
  for (const [lx, ly] of [[-0.2, 0.0], [0.16, 0.0], [-0.12, -0.2], [0.22, -0.18]]) {
    ctx.beginPath(); ctx.ellipse(lx, ly, 0.08, 0.05, 0, 0, Math.PI * 2); paint(ctx, flesh, { lw: 0.02, stroke: skin });
    if (Q.detail) { ctx.fillStyle = tint(flesh, 0.5); ctx.beginPath(); ctx.arc(lx, ly, 0.02, 0, Math.PI * 2); ctx.fill(); }
  }
  // the body: half a cucumber, cut side down, scored like scales
  ctx.beginPath();
  ctx.ellipse(0, -0.13, 0.32, 0.11, -0.05, 0, Math.PI * 2);
  paint(ctx, skin, { lw: 0.03, dots: shade(skin, 0.4), density: 0.2 });
  if (Q.detail) {
    ctx.strokeStyle = flesh; ctx.lineWidth = 0.018;
    ctx.beginPath();
    for (const bx of [-0.16, -0.05, 0.06, 0.16]) { ctx.moveTo(bx, -0.21); ctx.lineTo(bx + 0.03, -0.07); }
    ctx.stroke();
  }
  // the crest: little triangles of skin pinned along its back
  ctx.beginPath();
  for (let i = 0; i < 6; i++) { const bx = -0.2 + i * 0.08; ctx.moveTo(bx - 0.03, -0.22); ctx.lineTo(bx, -0.3 + i * 0.006); ctx.lineTo(bx + 0.03, -0.22); }
  paint(ctx, shade(skin, 0.25), { lw: 0.015 });
  // the head: the cucumber's end, carved to a snout, and olive eyes
  ctx.beginPath();
  ctx.moveTo(0.26, -0.2); ctx.quadraticCurveTo(0.46, -0.24, 0.5, -0.15); ctx.quadraticCurveTo(0.44, -0.07, 0.27, -0.07); ctx.closePath();
  paint(ctx, skin, { lw: 0.025 });
  ctx.beginPath(); ctx.arc(0.36, -0.2, 0.04, 0, Math.PI * 2); paint(ctx, C.black, { lw: 0.015 });
  ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(0.365, -0.2, 0.015, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // its card
  board(ctx, 'x', x + 0.2, y + 0.42, 1.08, 0.5, 0.17, 'GARNISH', { size: 0.08, edge: 0.015 });
}

// ---------- The butter swan ----------
// Slumping an hour at a time. Across its base and one wing, tiny four-toed
// prints with a wavy tail line between them. A pat nearby has knife marks.
function toePrint(ctx, X, Y, s, flip) {
  ctx.beginPath();
  ctx.ellipse(X, Y, 0.035 * s, 0.025 * s, 0, 0, Math.PI * 2);
  for (let i = 0; i < 4; i++) {
    const a = -Math.PI / 2 + (i - 1.5) * 0.45 * flip;
    const tx = X + Math.cos(a) * 0.07 * s, ty = Y + Math.sin(a) * 0.055 * s;
    ctx.moveTo(tx + 0.017 * s, ty);
    ctx.arc(tx, ty, 0.017 * s, 0, Math.PI * 2);
  }
  ctx.fill();
}
function butterSwan(ctx, t) {
  const m = hourStep(t); // 0 at 7am, 11/12 by 6pm
  const cx = 8.5, cy = 9.25, z = 1.02;
  // the melt, pooling on the platter
  disc(ctx, cx, cy, z + 0.01, 0.55 + 0.35 * m, alpha(C.butter, 0.85), { lw: 0.02, stroke: shade(C.butter, 0.25) });
  // the swan's plinth of butter
  cylinder(ctx, cx, cy, z, 0.4, 0.14 - 0.05 * m, shade(C.butter, 0.06), { lw: 0.03 });
  const [X, Y] = P(cx, cy, z + 0.14 - 0.05 * m);
  const sq = 1 - 0.28 * m; // squash
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(1.3, 1.3);
  // tail feathers
  ctx.beginPath();
  ctx.moveTo(0.25, -0.18 * sq); ctx.quadraticCurveTo(0.6, -0.5 * sq, 0.55, -0.62 * sq); ctx.quadraticCurveTo(0.48, -0.35 * sq, 0.3, -0.08);
  paint(ctx, tint(C.butter, 0.2), { lw: 0.03 });
  // body
  ctx.beginPath();
  ctx.ellipse(0, -0.24 * sq, 0.5 + 0.08 * m, 0.26 * sq, 0, 0, Math.PI * 2);
  paint(ctx, tint(C.butter, 0.15), { lw: 0.035, dots: shade(C.butter, 0.2), density: 0.1 });
  // the raised wing (the far one), then the near one
  ctx.beginPath();
  ctx.moveTo(-0.2, -0.35 * sq);
  ctx.quadraticCurveTo(0.05, -0.95 * sq, 0.5, -0.78 * sq - 0.1 * m);
  ctx.quadraticCurveTo(0.35, -0.45 * sq, 0.3, -0.3 * sq);
  ctx.closePath();
  paint(ctx, tint(C.butter, 0.25), { lw: 0.03 });
  ctx.beginPath();
  ctx.moveTo(-0.25, -0.22 * sq);
  ctx.quadraticCurveTo(0.0, -0.62 * sq, 0.42, -0.45 * sq);
  ctx.quadraticCurveTo(0.3, -0.15 * sq, -0.1, -0.1 * sq);
  ctx.closePath();
  paint(ctx, tint(C.butter, 0.1), { lw: 0.03 });
  // neck and head: upright at seven, drooping more each hour
  const hx = -0.62 - 0.2 * m, hy = -1.25 + 0.95 * m;
  ctx.beginPath();
  ctx.moveTo(-0.38, -0.3 * sq);
  ctx.bezierCurveTo(-0.7, -0.5, -0.3 - 0.4 * m, hy + 0.1, hx, hy);
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.19; ctx.stroke();
  ctx.strokeStyle = C.butter; ctx.lineWidth = 0.12; ctx.stroke();
  ctx.beginPath(); ctx.arc(hx, hy, 0.1, 0, Math.PI * 2); paint(ctx, C.butter, { lw: 0.03 });
  ctx.beginPath();
  ctx.moveTo(hx - 0.06, hy - 0.02); ctx.lineTo(hx - 0.24, hy + 0.05 + 0.1 * m); ctx.lineTo(hx - 0.05, hy + 0.06);
  paint(ctx, C.mustard, { lw: 0.02 });
  if (Q.detail) {
    ctx.fillStyle = C.ink;
    ctx.beginPath(); ctx.arc(hx - 0.02, hy - 0.02, 0.018, 0, Math.PI * 2); ctx.fill();
    // drips down the breast after the first hours
    if (m > 0.15) {
      ctx.fillStyle = shade(C.butter, 0.12);
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(-0.3 + i * 0.12, -0.08 + (i % 2) * 0.03, 0.03, 0.05 + 0.08 * m, 0, 0, Math.PI * 2); ctx.fill(); }
    }
    // The prints: up the plinth's front, over the near wing, and off the back,
    // four toes each, the tail's wavy line between them.
    const trail = [[-0.5, 0.12, 1], [-0.32, 0.05, -1], [-0.15, -0.04, 1], [0.0, -0.3 * sq, -1], [0.16, -0.38 * sq, 1], [0.32, -0.3 * sq, -1]];
    ctx.strokeStyle = shade(C.butter, 0.45);
    ctx.lineWidth = 0.018;
    ctx.beginPath();
    trail.forEach(([px, py], i) => {
      const tx = px + 0.02, ty = py + 0.05;
      i ? ctx.quadraticCurveTo(tx - 0.06, ty + (i % 2 ? 0.05 : -0.05), tx, ty) : ctx.moveTo(tx, ty);
    });
    ctx.stroke();
    ctx.fillStyle = shade(C.butter, 0.5);
    for (const [px, py, f] of trail) toePrint(ctx, px, py + f * 0.03, 1, f);
  }
  ctx.restore();
}
// The swan's plinth and platter, with butter pats and curls round it. One
// pat has a butter knife's marks in it: the near miss.
function swanPlinth(ctx) {
  box(ctx, 7.5, 8.5, 0, 2, 1.5, 0.92, C.white, { dotsL: C.greyLight, dens: 0.3 });
  // the cloth's scallops along the front
  if (Q.detail) {
    ctx.strokeStyle = shade(C.white, 0.25);
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const [X0, Y0] = P(7.5 + i * 0.4, 10, 0.75), [X1, Y1] = P(7.9 + i * 0.4, 10, 0.75);
      ctx.moveTo(X0, Y0); ctx.quadraticCurveTo((X0 + X1) / 2, (Y0 + Y1) / 2 + 0.15, X1, Y1);
    }
    ctx.stroke();
  }
  box(ctx, 7.45, 8.45, 0.92, 2.1, 1.6, 0.08, C.white, { flat: true, lw: 0.04 });
  disc(ctx, 8.5, 9.25, 1.01, 0.95, CHROME, { lw: 0.04, dots: STEEL, density: 0.12 });
  disc(ctx, 8.5, 9.25, 1.015, 0.82, tint(CHROME, 0.3), { stroke: false });
  // pats and curls
  for (const [px, py] of [[7.75, 9.6], [7.8, 8.95], [9.25, 8.85], [9.3, 9.45]]) box(ctx, px - 0.1, py - 0.1, 1.02, 0.2, 0.2, 0.08, C.butter, { flat: true, lw: 0.02 });
  for (const [px, py] of [[8.05, 9.95], [8.95, 9.95], [9.4, 9.8]]) {
    const [X, Y] = P(px, py, 1.08);
    ctx.beginPath(); ctx.ellipse(X, Y, 0.1, 0.06, 0, 0, Math.PI * 2); paint(ctx, tint(C.butter, 0.2), { lw: 0.02 });
    ctx.beginPath(); ctx.ellipse(X, Y, 0.05, 0.03, 0, 0, Math.PI * 2); ctx.strokeStyle = shade(C.butter, 0.3); ctx.lineWidth = 0.015; ctx.stroke();
  }
  // the knife's pat: three straight grooves, and the knife lying by it
  box(ctx, 8.95, 9.55, 1.02, 0.28, 0.28, 0.09, C.butter, { flat: true, lw: 0.02 });
  if (Q.detail) for (let i = 0; i < 3; i++) face(ctx, [[8.99 + i * 0.08, 9.6, 1.115], [9.03 + i * 0.08, 9.8, 1.115]], null, { lw: 0.015, stroke: shade(C.butter, 0.4) });
  face(ctx, [[9.2, 9.85, 1.04], [9.75, 9.7, 1.04]], null, { lw: 0.06, stroke: C.ink });
  face(ctx, [[9.2, 9.85, 1.04], [9.75, 9.7, 1.04]], null, { lw: 0.035, stroke: CHROME });
  lettering(ctx, 'x', 8.5, 10.02, 0.45, 'PLEASE DO NOT TOUCH THE SWAN', 0.13, shade(C.white, 0.6));
}

// ---------- The shrimp tower ----------
// A cone of shrimp in rings on a round table. Only the top one is speared on
// a toothpick with a little paper flag.
function shrimpAt(ctx, x, y, z, a, s = 1) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.rotate(a);
  ctx.beginPath();
  ctx.arc(0, 0, 0.1 * s, Math.PI * 0.1, Math.PI * 1.3);
  ctx.lineCap = 'round';
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.12 * s; ctx.stroke(); }
  ctx.strokeStyle = mix(INK.flamingo, C.coral, 0.35); ctx.lineWidth = 0.075 * s; ctx.stroke();
  if (Q.detail && s >= 1) {
    ctx.strokeStyle = C.white; ctx.lineWidth = 0.012;
    for (const a of [0.5, 0.9]) { ctx.beginPath(); ctx.moveTo(Math.cos(Math.PI * a) * 0.065 * s, Math.sin(Math.PI * a) * 0.065 * s); ctx.lineTo(Math.cos(Math.PI * a) * 0.135 * s, Math.sin(Math.PI * a) * 0.135 * s); ctx.stroke(); }
  }
  if (Q.detail) {
    ctx.beginPath(); ctx.moveTo(0.09 * s, 0.05 * s); ctx.lineTo(0.18 * s, 0.1 * s); ctx.lineTo(0.12 * s, 0.14 * s); ctx.closePath();
    paint(ctx, C.coral, { lw: 0.015 });
  }
  ctx.restore();
}
function shrimpTower(ctx) {
  const cx = 20, cy = 10;
  cylinder(ctx, cx, cy, 0, 1.0, 0.92, C.white, { flat: true });
  if (Q.detail) {
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (0.05 + i * 0.13);
      face(ctx, [[cx + Math.cos(a) * 1.0, cy + Math.sin(a) * 1.0, 0.1], [cx + Math.cos(a) * 1.0, cy + Math.sin(a) * 1.0, 0.85]], null, { lw: 0.02, stroke: shade(C.white, 0.2) });
    }
  }
  disc(ctx, cx, cy, 0.93, 0.98, CHROME, { lw: 0.04 });
  // the cone underneath, so there are no gaps
  const [BX, BY] = P(cx, cy, 1.0), [TX, TY] = P(cx, cy, 3.05);
  ctx.beginPath();
  ctx.moveTo(BX - 0.85 * Math.SQRT2, BY);
  ctx.lineTo(TX, TY);
  ctx.lineTo(BX + 0.85 * Math.SQRT2, BY);
  ctx.ellipse(BX, BY, 0.85 * Math.SQRT2, 0.425 * Math.SQRT2, 0, 0, Math.PI);
  paint(ctx, tint(MAT.glass, 0.4), { dots: MAT.glass, density: 0.4 });
  // rings of shrimp hung on the ice, back to front
  for (let i = 0; i < 7; i++) {
    const z = 1.1 + i * 0.28, r = 0.8 - i * 0.11;
    const n = Math.max(3, Math.round(r * 8));
    const list = [];
    for (let k = 0; k < n; k++) list.push(((k + (i % 2) * 0.5) / n) * Math.PI * 2);
    list.sort((a, b) => Math.sin(a + Math.PI / 4) - Math.sin(b + Math.PI / 4));
    for (const a of list) shrimpAt(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r, z, 0.5 + Math.sin(a + i) * 0.3, 1.15);
  }
  // shrimp cocktails round the foot of the tower
  for (const [gx, gy] of [[19.2, 10.75], [20.8, 10.7], [20.9, 9.6]]) {
    const [X, Y] = P(gx, gy, 0.95);
    ctx.beginPath(); ctx.moveTo(X - 0.12, Y - 0.3); ctx.lineTo(X + 0.12, Y - 0.3); ctx.lineTo(X + 0.03, Y - 0.12); ctx.lineTo(X + 0.03, Y); ctx.lineTo(X - 0.03, Y); ctx.lineTo(X - 0.03, Y - 0.12); ctx.closePath();
    paint(ctx, alpha(MAT.glass, 0.7), { lw: 0.02 });
    shrimpAt(ctx, gx + 0.08, gy - 0.08, 1.25, 0.4, 0.8);
  }
  // the one on a toothpick
  face(ctx, [[cx, cy, 2.95], [cx, cy, 3.72]], null, { lw: 0.06, stroke: C.ink });
  face(ctx, [[cx, cy, 2.95], [cx, cy, 3.72]], null, { lw: 0.035, stroke: C.woodLight });
  shrimpAt(ctx, cx + 0.03, cy, 3.22, 0.3, 1.25);
  shape(ctx, [[cx, cy, 3.72], [cx + 0.26, cy - 0.05, 3.66], [cx, cy, 3.56]], C.white, { lw: 0.02 });
  if (Q.detail) face(ctx, [[cx + 0.05, cy - 0.01, 3.68], [cx + 0.05, cy - 0.01, 3.6]], null, { lw: 0.04, stroke: INK.funnelRed });
  // its card
  board(ctx, 'x', 20.7, 11.15, 1.15, 0.9, 0.3, "CHEF'S CENTERPIECE", { size: 0.1, edge: 0.02 });
}

// ---------- The chocolate fountain ----------
function fountainTable(ctx) {
  const cx = 26.8, cy = 11.3;
  cylinder(ctx, cx, cy, 0, 0.8, 0.9, C.white, { flat: true });
  disc(ctx, cx, cy, 0.91, 0.8, CHROME, { lw: 0.04 });
  // skewers of strawberries and marshmallows round the rim
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (0.1 + i * 0.2);
    const x = cx + Math.cos(a) * 0.62, y = cy + Math.sin(a) * 0.62;
    const [X, Y] = P(x, y, 0.97);
    ctx.beginPath(); ctx.arc(X, Y, 0.07, 0, Math.PI * 2); paint(ctx, i % 2 ? C.white : C.red, { lw: 0.02 });
  }
  board(ctx, 'x', 26.4, 12.15, 1.1, 0.95, 0.28, 'DO NOT DIP FINGERS', { size: 0.1, edge: 0.02 });
}
function fountain(ctx, t, k = 0) {
  const cx = 26.8, cy = 11.3;
  const choc = C.brown;
  disc(ctx, cx, cy, 0.93, 0.5, choc, { lw: 0.03, dots: shade(choc, 0.4), density: 0.2 });
  const tiers = [[0.93, 0.48], [1.35, 0.4], [1.75, 0.3], [2.1, 0.2]];
  // the column
  cylinder(ctx, cx, cy, 0.93, 0.08, 1.45, CHROME, { flat: true });
  for (let i = tiers.length - 1; i > 0; i--) {
    const [z, r] = tiers[i], [zl] = tiers[i - 1];
    // the curtain of chocolate from this tier down to the one below
    cylinder(ctx, cx, cy, zl + 0.02, r, z - zl - 0.02, choc, { flat: true, top: shade(choc, 0.1) });
    if (Q.detail) {
      ctx.strokeStyle = alpha(C.white, 0.45);
      ctx.lineWidth = 0.025;
      for (let k = 0; k < 3; k++) {
        const kz = z - ((t * 0.8 + k / 3 + i * 0.2) % 1) * (z - zl);
        const [X, Y] = P(cx, cy, kz);
        ctx.beginPath();
        ctx.ellipse(X, Y, r * Math.SQRT2 * 0.98, r * Math.SQRT2 * 0.49, 0, 0.3 + k * 0.4, 0.8 + k * 0.4);
        ctx.stroke();
      }
    }
    // the tier's dish rim
    const [X, Y] = P(cx, cy, z);
    ctx.beginPath();
    ctx.ellipse(X, Y, r * Math.SQRT2 + 0.04, (r * Math.SQRT2) / 2 + 0.02, 0, 0, Math.PI);
    ctx.strokeStyle = CHROME; ctx.lineWidth = 0.05; ctx.stroke();
  }
  // the crown, bubbling
  const [X, Y] = P(cx, cy, 2.2 + Math.sin(t * 6) * 0.02);
  ctx.beginPath(); ctx.ellipse(X, Y, 0.14, 0.08, 0, 0, Math.PI * 2); paint(ctx, choc, { lw: 0.03 });
  if (k <= 0) return;
  // Tapped: a gush out of the top, and chocolate everywhere.
  const h = (0.7 + Math.sin(t * 18) * 0.06) * k;
  ctx.beginPath();
  ctx.moveTo(X - 0.08, Y); ctx.quadraticCurveTo(X - 0.05, Y - h * 0.6, X - 0.16, Y - h);
  ctx.quadraticCurveTo(X, Y - h - 0.22, X + 0.16, Y - h);
  ctx.quadraticCurveTo(X + 0.05, Y - h * 0.6, X + 0.08, Y);
  ctx.closePath();
  paint(ctx, choc, { lw: 0.03, dots: shade(choc, 0.4), density: 0.2 });
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9 + 0.4, d = 0.25 + 0.55 * k;
    const [DX, DY] = P(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 2.2 + 0.4 * k - 0.6 * k * k * ((i % 3) / 2));
    ctx.beginPath(); ctx.ellipse(DX, DY, 0.06, 0.08, 0, 0, Math.PI * 2); paint(ctx, choc, { lw: 0.015 });
  }
}

// ---------- The carvery ----------
function carveryTop(ctx, a, b) {
  if (a < 24) {
    // the roast, a slice falling off it
    rect(ctx, 23.7, 5.6, 1.0, 0.8, 1.0, C.woodLight, { lw: 0.03 });
    const [X, Y] = P(24.2, 6.0, 1.02);
    ctx.beginPath(); ctx.ellipse(X, Y - 0.2, 0.42, 0.3, 0, Math.PI, 0); ctx.lineTo(X + 0.42, Y - 0.1); ctx.ellipse(X, Y - 0.1, 0.42, 0.18, 0, 0, Math.PI); ctx.closePath();
    paint(ctx, C.brown, { lw: 0.03, dots: shade(C.brown, 0.4), density: 0.3 });
    ctx.beginPath(); ctx.ellipse(X + 0.36, Y - 0.14, 0.1, 0.16, 0, 0, Math.PI * 2); paint(ctx, C.pink, { lw: 0.02 });
  } else if (a < 26) {
    // the ham, studded with cloves
    const [X, Y] = P(25.5, 6.0, 1.02);
    ctx.beginPath(); ctx.ellipse(X, Y - 0.25, 0.45, 0.33, 0, 0, Math.PI * 2);
    paint(ctx, INK.flamingo, { lw: 0.03, dots: shade(INK.flamingo, 0.3), density: 0.2 });
    if (Q.detail) {
      ctx.fillStyle = C.brown;
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(X - 0.28 + (i % 3) * 0.26, Y - 0.38 + Math.floor(i / 3) * 0.2, 0.03, 0, Math.PI * 2); ctx.fill(); }
    }
    // the bone
    ctx.beginPath(); ctx.roundRect(X + 0.3, Y - 0.5, 0.3, 0.1, 0.05); paint(ctx, C.white, { lw: 0.02 });
  } else {
    // the carving knife and fork
    face(ctx, [[26.3, 6.2, 1.02], [27.1, 5.9, 1.02]], null, { lw: 0.06, stroke: CHROME });
    face(ctx, [[26.3, 6.2, 1.02], [26.55, 6.1, 1.02]], null, { lw: 0.08, stroke: C.black });
    face(ctx, [[26.5, 5.65, 1.02], [27.2, 5.6, 1.02]], null, { lw: 0.04, stroke: STEEL });
    // The heat lamps' gantry, low over the meat: at chest height on Chef
    // Gaston behind it, so nothing crosses his face. (Its sign is on the hull.)
    for (const x of [23.65, 27.35]) face(ctx, [[x, 5.55, 1.0], [x, 5.55, 2.15]], null, { lw: 0.08, stroke: STEEL });
    face(ctx, [[23.65, 5.55, 2.15], [27.35, 5.55, 2.15]], null, { lw: 0.1, stroke: STEEL });
    for (const x of [24.3, 25.5]) {
      const [X, Y] = P(x, 5.9, 2.05);
      glow(ctx, x, 5.9, 1.25, 0.9, INK.funnelRed, 0.45);
      ctx.beginPath(); ctx.moveTo(X - 0.1, Y - 0.16); ctx.lineTo(X + 0.1, Y - 0.16); ctx.lineTo(X + 0.24, Y + 0.08); ctx.lineTo(X - 0.24, Y + 0.08); ctx.closePath();
      paint(ctx, INK.funnelRed, { lw: 0.03 });
      ctx.beginPath(); ctx.ellipse(X, Y + 0.08, 0.2, 0.05, 0, 0, Math.PI * 2); paint(ctx, C.butter, { lw: 0.02 });
    }
  }
}

// ---------- Tables and chairs ----------
function chairAt(ctx, x, y, color, backAt) {
  box(ctx, x - 0.32, y - 0.32, 0.55, 0.64, 0.64, 0.12, color, { flat: true, lw: 0.03 });
  for (const [lx, ly] of [[x - 0.28, y + 0.22], [x + 0.22, y + 0.22], [x + 0.22, y - 0.28]]) box(ctx, lx, ly, 0, 0.06, 0.06, 0.55, C.ink, { flat: true, stroke: false });
  if (backAt === 'far') box(ctx, x - 0.32, y - 0.36, 0.55, 0.64, 0.1, 0.95, color, { flat: true, lw: 0.03 });
}
function chairBack(ctx, x, y, color) {
  box(ctx, x - 0.32, y + 0.26, 0.55, 0.64, 0.1, 0.95, color, { flat: true, lw: 0.03 });
}
function diningTable(ctx, x, y, w, d, stuff) {
  box(ctx, x + w / 2 - 0.12, y + d / 2 - 0.12, 0, 0.24, 0.24, 0.8, C.ink, { flat: true, stroke: false });
  box(ctx, x + w / 2 - 0.45, y + d / 2 - 0.3, 0, 0.9, 0.6, 0.06, C.ink, { flat: true, stroke: false });
  // the cloth hangs down over the edges
  box(ctx, x, y, 0.55, w, d, 0.35, C.white, { dotsL: C.greyLight, dens: 0.25 });
  if (stuff) stuff(ctx);
}
function plate(ctx, x, y, z, size, heap) {
  disc(ctx, x, y, z, 0.22 * size, C.white, { lw: 0.02 });
  if (heap > 0) {
    const [X, Y] = P(x, y, z);
    ctx.beginPath();
    ctx.ellipse(X, Y - 0.02, 0.2 * size, heap, 0, Math.PI, 0);
    paint(ctx, C.woodLight, { lw: 0.02, dots: C.brown, density: 0.3 });
    if (Q.detail) {
      ctx.fillStyle = C.coral; ctx.fillRect(X - 0.1 * size, Y - heap * 0.6, 0.12, 0.05);
      ctx.fillStyle = C.butter; ctx.beginPath(); ctx.arc(X + 0.06 * size, Y - heap * 0.8, 0.05, 0, Math.PI * 2); ctx.fill();
    }
  }
}
function can(ctx, x, y, z) {
  cylinder(ctx, x, y, z, 0.07, 0.2, INK.funnelRed, { flat: true, lw: 0.02 });
  if (Q.detail) {
    const [X, Y] = P(x, y, z + 0.1);
    ctx.fillStyle = C.white;
    ctx.fillRect(X - 0.07, Y - 0.015, 0.14, 0.03);
  }
}

// ---------- People who stay ----------
// A plate held out: the heap grows through the day, and so does the plate.
function plateHold(scale = 1) {
  return (ctx, t) => {
    const k = dayK(t);
    const r = (0.24 + 0.22 * k) * scale, h = (0.06 + 0.5 * k) * scale;
    ctx.beginPath(); ctx.ellipse(0.08, 0, r, r * 0.32, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.03 });
    ctx.beginPath(); ctx.ellipse(0.08, -0.02, r * 0.75, h, 0, Math.PI, 0); ctx.closePath();
    paint(ctx, C.woodLight, { lw: 0.025, dots: C.brown, density: 0.3 });
    if (Q.detail && h > 0.12) {
      ctx.fillStyle = C.coral; ctx.fillRect(0.0, -h * 0.6, 0.14, 0.05);
      ctx.fillStyle = C.butter; ctx.beginPath(); ctx.arc(0.18, -h * 0.75, 0.05, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.leaf; ctx.beginPath(); ctx.arc(-0.05, -h * 0.35, 0.04, 0, Math.PI * 2); ctx.fill();
    }
  };
}

// Someone who stays in the buffet all day, from stop to stop. stops:
// [t0, t1, x, y, extra]: standing at (x, y) from t0 to t1 (seconds into the
// day), walking between. The first starts at 0 and the last ends at 240 where
// the first began, so the day loops.
function daily(stops, walkPose = 'walk') {
  return (t) => {
    const s = wrap(t);
    for (let i = 0; i < stops.length; i++) {
      const [t0, t1, x, y, o] = stops[i];
      if (s < t0 && i > 0) {
        const [, pt1, px, py] = stops[i - 1];
        const k = clamp((s - pt1) / (t0 - pt1));
        const dx = x - px, dy = y - py;
        return { x: px + dx * k, y: py + dy * k, pose: walkPose, dir: dx - dy >= 0 ? 'r' : 'l', back: dx + dy < 0, moving: true };
      }
      if (s <= t1) return { x, y, ...(o || {}) };
    }
    const [, , x, y, o] = stops[stops.length - 1];
    return { x, y, ...(o || {}) };
  };
}
function extra(R, seed, pos, o = {}) {
  const look = { ...folk(seed), ...(o.look || {}) };
  if (o.sick != null) look.dress = false; // a dress shows the legs, and legs don't go green
  R.mover(pos, (ctx, t, p) => {
    if (p.hide) return;
    const k = green(t, o.sick);
    person(ctx, p.x, p.y, p.z || 0, {
      ...look, skin: queasy(look.skin, k), pose: p.pose || 'stand', dir: p.dir || 'r', back: p.back,
      scale: o.scale, arms: typeof p.arms === 'function' ? p.arms(t) : p.arms, hold: p.hold, face: o.face, speed: o.speed,
    }, t);
    if (o.after) o.after(ctx, t, p);
  }, { bias: o.bias || 0 });
}

export default {
  id: 'buffet',
  name: 'The Buffet',
  blurb: 'All you can eat, 7am to midnight. When the doors opened at seven, something had already been at the salad bar.',

  build(R) {
    deck(R, 'buffet', 'promenade', { grid: false, name: false });

    // ---------- The floor ----------
    R.floor((ctx) => {
      // tiles round the food, a carpet under the tables
      if (Q.detail) {
        for (let x = 0; x < 32; x++) for (let y = 0; y < 11; y++) {
          if ((x + y) % 2) rect(ctx, x, y, 1, 1, 0.002, alpha(C.white, 0.14), { stroke: false });
        }
      }
      rect(ctx, 0.2, 11.6, 31.6, 4.2, 0.004, MAT.carpetRed, { stroke: false, dots: shade(MAT.carpetRed, 0.4), density: 0.18 });
      rect(ctx, 0.2, 11.6, 31.6, 0.18, 0.005, MAT.carpetGold, { stroke: false });
      if (Q.detail) {
        ctx.fillStyle = MAT.carpetGold;
        for (let x = 1; x < 31.5; x += 1.4) for (let y = 12.5; y < 15.7; y += 1.1) {
          const ox = (Math.round((y - 12.5) / 1.1) % 2) * 0.7;
          const [X, Y] = P(x + ox, y, 0.006);
          ctx.beginPath(); ctx.moveTo(X, Y - 0.18); ctx.lineTo(X + 0.25, Y); ctx.lineTo(X, Y + 0.18); ctx.lineTo(X - 0.25, Y); ctx.closePath(); ctx.fill();
        }
      }
    });

    // Litter by the door: napkins, a straw wrapper, a sugar sachet, a
    // receipt, a pink sweetener sachet, and the queue ticket, number 2.
    R.rug((ctx) => {
      const napkin = (x, y, a) => shape(ctx, [[x - 0.2, y - 0.15, 0.02], [x + 0.18 + a, y - 0.2, 0.02], [x + 0.22, y + 0.17, 0.02], [x - 0.15, y + 0.2 - a, 0.02]], C.white, { lw: 0.025 });
      napkin(2.3, 14.9, 0.05);
      napkin(4.5, 12.9, -0.04);
      napkin(1.6, 13.9, 0.02);
      face(ctx, [[3.9, 13.75, 0.02], [4.6, 13.95, 0.02]], null, { lw: 0.07, stroke: C.ink });
      face(ctx, [[3.9, 13.75, 0.02], [4.6, 13.95, 0.02]], null, { lw: 0.045, stroke: C.white });
      face(ctx, [[4.0, 13.78, 0.02], [4.15, 13.83, 0.02]], null, { lw: 0.045, stroke: INK.funnelRed });
      rect(ctx, 3.95, 14.8, 0.3, 0.2, 0.02, C.white, { lw: 0.02 });
      rect(ctx, 4.4, 14.3, 0.28, 0.2, 0.02, C.sky, { lw: 0.02 }); // (blue: the only pink paper on the floor is the ticket)
      shape(ctx, [[2.6, 13.4, 0.02], [2.75, 13.35, 0.02], [3.05, 14.0, 0.02], [2.9, 14.05, 0.02]], C.white, { lw: 0.02 });
      if (Q.detail) for (let i = 0; i < 4; i++) face(ctx, [[2.7 + i * 0.07, 13.5 + i * 0.13, 0.021], [2.78 + i * 0.07, 13.48 + i * 0.13, 0.021]], null, { lw: 0.012, stroke: C.grey });
      // the ticket: a little pink deli ticket, a torn edge, a big 2
      shape(ctx, [[3.2, 14.25, 0.03], [3.62, 14.25, 0.03], [3.62, 14.55, 0.03], [3.2, 14.55, 0.03]], INK.flamingo, { lw: 0.025 });
      if (Q.detail) {
        for (let i = 0; i < 4; i++) face(ctx, [[3.2, 14.27 + i * 0.075, 0.031], [3.23, 14.3 + i * 0.075, 0.031]], null, { lw: 0.015, stroke: C.white });
        paintText(ctx, 'floor', 3.43, 14.4, '2', 0.3, C.ink);
      }
    });

    // ---------- The walls ----------
    R.decor((ctx) => {
      // the hull: portholes in a row, the big lettering over them
      for (const x of [2.2, 5.2, 8.2, 11.2, 14.2, 17.2, 20.2, 23.2, 26.2]) porthole(ctx, x, 3.4, 0.42);
      paintText(ctx, 'right', 14.08, 4.88, 'ALL YOU CAN EAT', 1.45, INK.sunYellow);
      paintText(ctx, 'right', 14, 4.95, 'ALL YOU CAN EAT', 1.45, INK.funnelRed);
      lifebuoy(ctx, 22.2, 1.8, 0.4);
      // the hand sanitizer nobody uses
      onRight(ctx, 0.9, 1.2, 0.5, 0.8, C.white, { lw: 0.03 });
      onRight(ctx, 1.02, 1.3, 0.26, 0.2, C.sky, { lw: 0.02 });
      onRight(ctx, 0.55, 2.2, 1.2, 0.7, INK.hullWhite, { lw: 0.03 });
      paintText(ctx, 'right', 1.15, 2.7, 'WASH HANDS', 0.2, C.ink, 'Rethink Sans');
      paintText(ctx, 'right', 1.15, 2.4, 'used today: 0', 0.15, INK.funnelRed, 'Rethink Sans');
      // the specials, over the Gander Cola
      onRight(ctx, 27.9, 3.9, 3.6, 1.5, C.ink, { lw: 0.05 });
      onRight(ctx, 28.0, 4.0, 3.4, 1.3, shade(C.navy, 0.3));
      paintText(ctx, 'right', 29.7, 5.0, "TODAY'S SPECIAL", 0.26, C.white, 'Rethink Sans');
      paintText(ctx, 'right', 29.7, 4.55, 'MORE', 0.5, INK.sunYellow);
      // the carvery's sign, on the hull over Chef Gaston's head
      onRight(ctx, 23.85, 4.25, 1.75, 0.5, INK.sunYellow, { lw: 0.04 });
      paintText(ctx, 'right', 24.72, 4.5, 'CARVERY', 0.3, C.ink, 'Rethink Sans');
      // the bulkhead: the ticket counter's big display between the doors
      onLeft(ctx, 5.3, 3.4, 4.4, 1.7, C.ink, { lw: 0.05 });
      onLeft(ctx, 5.45, 3.5, 4.1, 1.5, C.black);
      paintText(ctx, 'left', 7.5, 4.72, 'NOW SERVING', 0.3, INK.sunYellow, 'Rethink Sans');
      onLeft(ctx, 13.8, 2.6, 2.0, 1.4, INK.hullWhite, { lw: 0.04 });
      paintText(ctx, 'left', 14.8, 3.6, 'PLEASE WAIT', 0.26, C.ink, 'Rethink Sans');
      paintText(ctx, 'left', 14.8, 3.28, 'TO BE SEATED', 0.26, C.ink, 'Rethink Sans');
      paintText(ctx, 'left', 14.8, 2.9, '(nobody will seat you)', 0.16, INK.funnelRed, 'Rethink Sans');
      onLeft(ctx, 1.0, 4.6, 2.0, 0.9, INK.sunYellow, { lw: 0.04 });
      paintText(ctx, 'left', 2.0, 5.2, 'OPEN 7AM', 0.26, C.ink, 'Rethink Sans');
      paintText(ctx, 'left', 2.0, 4.85, 'TO MIDNIGHT', 0.22, C.ink, 'Rethink Sans');
    });
    // The display's number: 2 when the doors open, then everybody, then
    // everybody again (it's all you can eat). It never stops on the ship's
    // head count: the gangway clicker is the one place that number is told.
    R.decor((ctx, t) => {
      if (!Q.detail) return;
      const s = wrap(t);
      const n = s < 4 ? 2 : 2 + Math.floor((s - 4) * 23.7);
      paintText(ctx, 'left', 7.5, 3.98, n.toLocaleString('en-US'), 0.7, INK.funnelRed);
    }, { anim: true });
    // A gull at a porthole, looking in at the food now and then.
    R.decor((ctx, t) => {
      const k = pulse(t, 17, 3) * 17;
      if (k > 6 || !Q.detail) return;
      const peek = k < 1 ? k : k > 5 ? 6 - k : 1;
      const [X, Y] = P(17.2, 0, 3.4);
      ctx.save();
      ctx.translate(X, Y);
      ctx.transform(1, 0.5, 0, 1, 0, 0);
      ctx.beginPath(); ctx.arc(0, 0, 0.42, 0, Math.PI * 2); ctx.clip();
      const tap = k > 2 && k < 3.5 ? Math.abs(Math.sin(k * 12)) * 0.08 : 0;
      ctx.translate(0.55 - peek * 0.5 - tap, 0.12);
      ctx.beginPath(); ctx.arc(0, 0, 0.26, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.03 });
      ctx.beginPath(); ctx.moveTo(-0.22, -0.02); ctx.lineTo(-0.48, 0.04); ctx.lineTo(-0.22, 0.08); ctx.closePath(); paint(ctx, C.mustard, { lw: 0.02 });
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(-0.1, -0.07, 0.035, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }, { anim: true });

    // ---------- By the doors ----------
    // The ticket machine on its post, and the free buckets (fewer by the hour).
    R.thing(1.0, 9.5, (ctx) => {
      box(ctx, 0.92, 9.42, 0, 0.16, 0.16, 2.6, STEEL, { flat: true, lw: 0.03 });
      box(ctx, 0.7, 9.2, 2.6, 0.6, 0.5, 0.55, INK.funnelRed);
      shape(ctx, [[1.3, 9.35, 2.75], [1.3, 9.55, 2.75], [1.55, 9.55, 2.55], [1.55, 9.35, 2.55]], C.white, { lw: 0.02 });
      lettering(ctx, 'x', 1.0, 9.71, 2.9, 'TAKE A NUMBER', 0.1, C.white);
    });
    R.thing(1.4, 15.3, (ctx, t) => {
      const n = Math.max(1, 6 - Math.floor(dayK(t) * 6));
      for (let i = 0; i < n; i++) bucket(ctx, 1.2, 15.1, i * 0.16, { color: i === n - 1 ? C.grey : shade(C.grey, 0.1) });
      board(ctx, 'y', 1.75, 14.4, 1.2, 1.2, 0.5, 'HELP YOURSELF', { size: 0.17, board: INK.sunYellow });
      face(ctx, [[1.75, 14.4, 0], [1.75, 14.4, 0.95]], null, { lw: 0.05, stroke: C.ink });
    }, { anim: true });
    R.thing(0.9, 7.6, (ctx) => plant(ctx, 0.9, 7.6, 0, 0, { kind: 'palm', leaf: C.leaf, potColor: INK.teak, scale: 1.1 }));
    R.thing(31.0, 15.3, (ctx) => plant(ctx, 31.0, 15.3, 0, 0, { kind: 'fern', leaf: C.leaf, potColor: INK.teak }));

    // ---------- The hot trays and the eggs ----------
    counter(R, 4, 14, 2, 3.1, 1.05, { body: STEEL, top: CHROME }, (ctx, a, b, i) => {
      hotTray(ctx, a, b, i);
      // (The hash's guard goes on after its lid: see below.)
      if (!TRAYS[i]?.rolltop) sneezeGuard(ctx, a, b, 2.05, 3.0, 1.0, 2.0);
    });
    // The hash, shut, Doreen's tongs caught under the lid. Tap: it tips open.
    const hash = R.poke({ id: 'hash', at: [9.62, 2.6, 1.35], r: 0.9, sound: 'clunk', say: ['Hash browns!', 'Still hash browns.'] });
    R.thing(10.25, 3.1, (ctx) => {
      const k = hash.k();
      tongsY(ctx);
      rollTop(ctx, k);
      tongsY(ctx, 2.98); // the handle, out in front of the lid
      sneezeGuard(ctx, 9, 10.25, 2.05, 3.0, 1.0, 2.0);
    }, { anim: true, depth: 10.25 + 3.1 + 0.05 });
    // Steam off the trays.
    R.air((ctx, t) => {
      if (!Q.detail) return;
      particles(t, 14, 2.6, (k, r) => {
        const x = 4.4 + r() * 9.2, y = 2.3 + r() * 0.6;
        const [X, Y] = P(x + k * 0.3, y, 1.25 + k * 1.6);
        ctx.beginPath();
        ctx.arc(X, Y, 0.08 + k * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = alpha(C.white, 0.4 * (1 - k));
        ctx.fill();
      }, 11);
    });
    // The omelette station: Gloria's eggs.
    counter(R, 14.8, 18.4, 2, 3.1, 1.05, { body: INK.teak, top: CHROME }, (ctx, a, b) => {
      if (a < 15.5) {
        // a crate of eggs
        box(ctx, 15.0, 2.2, 1.0, 0.7, 0.6, 0.12, C.woodLight, { flat: true, lw: 0.02 });
        for (let i = 0; i < 6; i++) {
          const [X, Y] = P(15.15 + (i % 3) * 0.2, 2.35 + Math.floor(i / 3) * 0.25, 1.17);
          ctx.beginPath(); ctx.ellipse(X, Y - 0.05, 0.07, 0.09, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.015 });
        }
      } else if (a < 17) {
        // the burner
        box(ctx, 16.15, 2.2, 1.0, 0.8, 0.7, 0.12, C.ink, { flat: true, lw: 0.02 });
      } else {
        board(ctx, 'x', 17.8, 2.9, 1.5, 1.0, 0.45, 'EGGS YOUR WAY', { size: 0.15, board: INK.hullWhite });
      }
      lettering(ctx, 'x', (a + b) / 2, 3.12, 0.62, a < 15.5 ? 'OMELETTES' : '', 0.2, INK.hullWhite);
    });
    // The cook flips an omelette every few seconds.
    R.thing(16.55, 3.05, (ctx, t) => {
      const k = pulse(t, 3.4);
      const up = k < 0.35 ? Math.sin((k / 0.35) * Math.PI) * 0.7 : 0;
      disc(ctx, 16.55, 2.55, 1.13, 0.3, C.black, { lw: 0.03 });
      face(ctx, [[16.8, 2.8, 1.14], [17.3, 3.1, 1.14]], null, { lw: 0.06, stroke: C.black });
      const [X, Y] = P(16.55, 2.55, 1.18 + up);
      ctx.beginPath();
      ctx.ellipse(X, Y, 0.26, 0.12 * Math.abs(Math.cos(k * Math.PI * 5.7)) + 0.02, 0, 0, Math.PI * 2);
      paint(ctx, C.butter, { lw: 0.02 });
    }, { anim: true });
    extra(R, 97, () => ({ x: 16.6, y: 1.2, dir: 'l', arms: [1.2, 0.6] }), { look: { ...CREW_LOOK, hat: 'chef' } });

    // ---------- Juice and coffee ----------
    counter(R, 19.2, 22.6, 2, 3.1, 1.05, { body: STEEL, top: CHROME }, (ctx, a, b, i) => {
      const cx = (a + b) / 2;
      if (i < 2) {
        // a juice dispenser: a clear tank, orange or pink grapefruit
        const juice = i ? C.pink : C.mustard;
        box(ctx, cx - 0.35, 2.2, 1.0, 0.7, 0.6, 0.12, STEEL, { flat: true, lw: 0.02 });
        box(ctx, cx - 0.3, 2.25, 1.12, 0.6, 0.5, 0.75, juice, { flat: true, lw: 0.03, top: tint(juice, 0.4) });
        box(ctx, cx - 0.3, 2.25, 1.87, 0.6, 0.5, 0.08, STEEL, { flat: true, lw: 0.02 });
        box(ctx, cx - 0.05, 2.75, 1.25, 0.1, 0.12, 0.1, C.ink, { flat: true, stroke: false });
        lettering(ctx, 'x', cx, 3.12, 0.62, i ? 'GRAPEFRUIT' : 'JUICE', i ? 0.13 : 0.18, C.ink);
      } else {
        cylinder(ctx, cx, 2.55, 1.0, 0.3, 0.9, CHROME, { dots: STEEL });
        box(ctx, cx - 0.04, 2.85, 1.2, 0.08, 0.12, 0.1, C.ink, { flat: true, stroke: false });
        for (let k = 0; k < 4; k++) cylinder(ctx, cx + 0.45, 2.7, 1.0 + k * 0.1, 0.1, 0.1, C.white, { flat: true, lw: 0.02 });
        lettering(ctx, 'x', cx, 3.12, 0.62, 'COFFEE', 0.18, C.ink);
      }
    });
    // A sign where the gravy went.
    R.thing(21.6, 7.8, (ctx) => {
      const x = 21.6, y = 7.6;
      shape(ctx, [[x - 0.35, y + 0.2, 0], [x + 0.35, y + 0.2, 0], [x + 0.08, y, 1.1], [x - 0.08, y, 1.1]], INK.sunYellow, { lw: 0.03 });
      lettering(ctx, 'x', x, y + 0.12, 0.62, 'CAUTION', 0.12, C.ink);
      lettering(ctx, 'x', x, y + 0.1, 0.42, 'GRAVY', 0.12, C.ink);
      disc(ctx, x + 0.9, y + 0.6, 0.004, 0.55, alpha(C.brown, 0.55), { stroke: false });
    });

    // ---------- The Gander Cola fridge ----------
    R.thing(28.6, 1.55, (ctx) => {
      box(ctx, 28.6, 0.3, 0, 2.8, 1.25, 3.4, INK.funnelRed, { dotsL: shade(INK.funnelRed, 0.5) });
      face(ctx, [[28.75, 1.56, 0.4], [31.25, 1.56, 0.4], [31.25, 1.56, 2.7], [28.75, 1.56, 2.7]], alpha(MAT.glass, 0.85), { lw: 0.04 });
      for (let s = 0; s < 4; s++) for (let i = 0; i < 9; i++) can(ctx, 28.95 + i * 0.27, 1.4, 0.5 + s * 0.55);
      lettering(ctx, 'x', 30.0, 1.56, 3.08, 'GANDER COLA', 0.34, C.white);
      lettering(ctx, 'x', 30.0, 1.56, 0.2, 'Take a gander.', 0.18, C.white);
    });

    // ---------- The salad bar ----------
    counter(R, 11, 18, 7.3, 8.7, 1.05, { body: INK.teak, top: CHROME }, (ctx, a, b, i) => {
      saladPiece(ctx, a, b, i);
      if (a < 11.2) lettering(ctx, 'x', 12.9, 8.72, 0.62, 'SALAD BAR: FRESH SINCE 6AM', 0.2, INK.hullWhite);
    });
    R.decoy({ id: 'cucumber', at: [17.4, 8.05, 1.25], r: 0.75, say: ['A cucumber. Not an iguana.', 'Carved by Chef Gaston.', 'Still a cucumber.'] });
    // The two heaps of lettuce. Sighting 1 (7 to 9am): the iguana is under the
    // left one, its tail out of the leaves. Tap a heap and the leaves part.
    const IG_AT = [LETTUCE[0][0] - 0.1, LETTUCE[0][1] + 0.1, 1.0]; // a little left of the middle, so its tail is out
    const igHere = (t) => chase.step === 0 && chaseOpen(0, t);
    const heaps = LETTUCE.map(([x, y], i) => {
      const heap = R.poke({ id: i ? 'lettuce' : 'lettuce-heap', at: [x, y, 1.4], r: 0.75, say: ['Just lettuce.', 'Still lettuce.'] });
      R.thing(x, y, (ctx, t) => {
        // (It says what's under it: an iguana answers back.)
        if (!i) heap.say = igHere(t) ? ['Hiss!', 'HISS.'] : ['Just lettuce.', 'Still lettuce.'];
        lettuceHeap(ctx, x, y, heap.k());
        sneezeGuard(ctx, x - 0.7, x + 0.7, 7.35, 8.85, 1.0, 2.15);
      }, { anim: true, depth: x + 0.7 + 8.7 + 0.15 });
      return heap;
    });
    // 1pm: Dr. Swabb tapes it off. The tape unrolls along the front, and
    // stays until the day starts again. Each stretch sorts with its piece.
    const TX0 = 10.7, TX1 = 18.3, TY = 9.05, TZ = 1.28;
    const tapeLen = (t) => {
      const s = wrap(t);
      return s < TAPE_ON ? 0 : clamp((s - TAPE_ON) / (TAPE_DONE - TAPE_ON)) * (TX1 - TX0);
    };
    const stretches = [[TX0, 12.25], [12.25, 13.5], [13.5, 14.75], [14.75, SEAM], [SEAM, 17], [17, TX1]];
    for (const [a, b] of stretches) {
      R.thing(a, TY, (ctx, t) => {
        const L = tapeLen(t);
        if (L <= 0) return;
        const end = Math.min(b, TX0 + L);
        if (end <= a) return;
        if (a === TX0) {
          box(ctx, TX0 - 0.08, TY - 0.08, 0, 0.16, 0.16, TZ + 0.12, CHROME, { flat: true, lw: 0.02 });
        }
        if (b === TX1 && end >= TX1) box(ctx, TX1 - 0.08, TY - 0.08, 0, 0.16, 0.16, TZ + 0.12, CHROME, { flat: true, lw: 0.02 });
        const sag = (x) => Math.sin(((x - TX0) / (TX1 - TX0)) * Math.PI) * 0.12;
        const steps = Math.max(1, Math.round((end - a) / 0.3));
        for (let i = 0; i < steps; i++) {
          const x0 = a + ((end - a) * i) / steps, x1 = a + ((end - a) * (i + 1)) / steps;
          face(ctx, [[x0, TY, TZ - sag(x0)], [x1, TY, TZ - sag(x1)], [x1, TY, TZ - sag(x1) + 0.16], [x0, TY, TZ - sag(x0) + 0.16]],
            Math.floor(x0 / 0.3) % 2 ? INK.sunYellow : C.ink, { stroke: false });
        }
        face(ctx, [[a, TY, TZ - sag(a)], [end, TY, TZ - sag(end)]], null, { lw: 0.02 });
        // the sign hung off the middle
        if (a === 13.5 && end > 14.4) {
          board(ctx, 'x', 14.1, TY + 0.02, TZ - 0.32, 1.1, 0.4, 'CLOSED. DR. S', { size: 0.13, board: INK.hullWhite, edge: 0.03 });
        }
      }, { anim: true, depth: b + TY + 0.05 });
    }

    // ---------- The butter swan ----------
    R.thing(8.5, 10, (ctx) => swanPlinth(ctx), { depth: 8.5 + 9.25 });
    R.thing(8.5, 9.3, (ctx, t) => butterSwan(ctx, t), { anim: true, depth: 8.5 + 9.3 });

    // ---------- The shrimp tower ----------
    R.thing(20, 10.2, (ctx) => shrimpTower(ctx));
    // The flies go round everything but the shrimp.
    R.air((ctx, t) => {
      if (!Q.detail) return;
      ctx.fillStyle = C.ink;
      const spots = [[9, 2.6, 1.6], [12.5, 8, 1.6], [29.6, 13.2, 1.6], [24.2, 6, 1.7], [6.8, 12.9, 1.4]];
      spots.forEach(([x, y, z], i) => {
        for (let j = 0; j < 2; j++) {
          const a = t * (3 + j + i * 0.3) + i * 2 + j * 3;
          const [X, Y] = P(x + Math.cos(a) * 0.35, y + Math.sin(a * 1.3) * 0.35, z + Math.sin(a * 2) * 0.15);
          ctx.beginPath(); ctx.arc(X, Y, 0.035, 0, Math.PI * 2); ctx.fill();
        }
      });
    });

    // ---------- The chocolate fountain ----------
    R.thing(26.8, 12.1, (ctx) => fountainTable(ctx), { depth: 26.8 + 11.3 - 0.4 });
    // Tap it and it gushes. (The one a first visit is nudged to try.)
    const gush = R.poke({ id: 'fountain', at: [26.8, 11.3, 1.8], r: 1.0, hold: 1.6, teach: true, say: ['Do not dip fingers.', 'Fingers: dipped.', 'Chef saw that.'] });
    R.thing(26.8, 11.3, (ctx, t) => fountain(ctx, t, gush.k()), { anim: true, depth: 26.8 + 11.3 });

    // ---------- The carvery ----------
    counter(R, 23.5, 27.5, 5.4, 6.6, 1.05, { body: INK.teak, top: MAT.teakDark }, carveryTop);
    // Chef Gaston's card while he's down at the stores for more shrimp.
    R.thing(25, 6.7, (ctx, t) => {
      const s = wrap(t);
      if (s < 137 || s > 196) return;
      board(ctx, 'x', 24.9, 6.45, 1.3, 1.0, 0.45, 'BACK IN 5', { size: 0.2, board: INK.hullWhite });
    }, { anim: true });

    // ---------- Soft serve ----------
    counter(R, 28.8, 31.6, 7, 8.3, 1.05, { body: INK.flamingo, top: CHROME }, (ctx, a) => {
      if (a < 30) {
        box(ctx, 29.0, 7.2, 1.0, 0.8, 0.7, 1.0, CHROME, { dotsL: STEEL });
        box(ctx, 29.3, 7.85, 1.5, 0.2, 0.2, 0.2, STEEL, { flat: true, lw: 0.02 });
        lettering(ctx, 'x', 29.4, 7.92, 1.75, 'SOFT SERVE', 0.1, C.ink);
      } else {
        for (let i = 0; i < 4; i++) {
          const [X, Y] = P(30.4 + i * 0.25, 7.8, 1.05);
          ctx.beginPath(); ctx.moveTo(X - 0.07, Y - 0.25); ctx.lineTo(X + 0.07, Y - 0.25); ctx.lineTo(X, Y); ctx.closePath(); paint(ctx, C.woodLight, { lw: 0.02 });
        }
        board(ctx, 'x', 30.9, 8.32, 1.55, 1.0, 0.4, 'NO THIRDS', { size: 0.16, board: C.white });
      }
    });
    // The swirl coming out of the machine, again and again.
    // Tap the machine and it won't stop.
    const serve = R.poke({ id: 'soft-serve', at: [29.4, 7.55, 1.6], r: 0.8, hold: 2.2, say: ['NO THIRDS.', 'That was fourths.'] });
    R.thing(29.4, 8.4, (ctx, t) => {
      const k = pulse(t, 5), more = serve.k();
      const n = more > 0 ? 4 + Math.round(more * 6) : Math.floor(k * 5);
      const [X, Y] = P(29.4, 7.95, 1.05);
      ctx.beginPath(); ctx.moveTo(X - 0.08, Y - 0.3); ctx.lineTo(X + 0.08, Y - 0.3); ctx.lineTo(X, Y); ctx.closePath(); paint(ctx, C.woodLight, { lw: 0.02 });
      for (let i = 0; i < n; i++) {
        // (past four it leans, the way a tower of soft serve does)
        const lean = i > 3 ? (i - 3) * (i - 3) * 0.012 : 0;
        ctx.beginPath(); ctx.ellipse(X + lean, Y - 0.33 - i * 0.07, Math.max(0.05, 0.1 - Math.min(i, 3) * 0.015), 0.05, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.02 });
      }
    }, { anim: true });

    // ---------- The dish cart ----------
    R.thing(29.6, 13.8, (ctx, t) => {
      box(ctx, 28.9, 12.8, 0.25, 1.4, 1.0, 0.1, STEEL, { flat: true, lw: 0.03 });
      box(ctx, 28.9, 12.8, 0.9, 1.4, 1.0, 0.1, STEEL, { flat: true, lw: 0.03 });
      for (const [x, y] of [[28.95, 13.7], [30.2, 13.7], [30.2, 12.85]]) box(ctx, x, y, 0, 0.06, 0.06, 1.0, C.ink, { flat: true, stroke: false });
      const n = 2 + Math.floor(dayK(t) * 10);
      for (let i = 0; i < n; i++) disc(ctx, 29.35, 13.3, 1.0 + i * 0.07, 0.3, i % 3 ? C.white : C.greyLight, { lw: 0.02 });
      for (let i = 0; i < Math.floor(n / 2); i++) disc(ctx, 29.85, 13.25, 1.0 + i * 0.07, 0.25, C.white, { lw: 0.02 });
    }, { anim: true });

    // ---------- The tables ----------
    const TABLES = [6, 11.5, 17, 22.5];
    const CH = [MAT.carpetGold, INK.teak, MAT.carpetGold, INK.teak];
    TABLES.forEach((x, i) => {
      // far chairs (people sit on them facing us) and near ones
      for (const cx of [x + 0.6, x + 1.8]) {
        if (i === 1 && cx < x + 1) continue; // Doreen's chair is pushed back
        R.thing(cx, 11.85, (ctx) => chairAt(ctx, cx, 12.2, CH[i], 'far'), { depth: cx + 11.85 });
      }
      for (const cx of [x + 0.6, x + 1.8]) {
        R.thing(cx, 15.0, (ctx) => chairAt(ctx, cx, 15.15, CH[i]), { depth: cx + 14.9 });
        R.thing(cx, 15.55, (ctx) => chairBack(ctx, cx, 15.15, CH[i]), { depth: cx + 15.6 });
      }
      R.thing(x, 14.4, (ctx) => diningTable(ctx, x, 12.8, 2.4, 1.6, (c) => {
        const big = [0.9, 1.2, 1.5, 2.1][i];
        plate(c, x + 0.6, 13.3, 0.91, big, 0.05 + 0.1 * big);
        plate(c, x + 1.8, 13.3, 0.91, big * 0.9, 0.08 * big);
        plate(c, x + 1.2, 14.0, 0.91, 0.8, 0);
        can(c, x + 0.3, 14.1, 0.91);
        if (i === 3) {
          // a pyramid of Gander Cola
          for (const [dx, dz, dy] of [[0, 0, 0], [0.16, 0, 0], [0.32, 0, 0], [0.08, 0.2, 0], [0.24, 0.2, 0], [0.16, 0.4, 0]]) can(c, x + 1.7 + dx, 14.0 + dy, 0.91 + dz);
        }
        if (i === 2 && Q.detail) {
          // salt, pepper and a folded newspaper
          rect(c, x + 1.6, 13.8, 0.6, 0.4, 0.915, C.white, { lw: 0.02 });
          // (flat text is printed at floor level, so lift it to the table top)
          c.save();
          c.translate(0, P(0, 0, 0.92)[1]);
          paintText(c, 'floor', x + 1.9, 13.95, 'SHIP FINE', 0.09, C.ink, 'Rethink Sans');
          paintText(c, 'floor', x + 1.9, 14.08, 'says ship', 0.07, C.ink, 'Rethink Sans');
          c.restore();
        }
      }), { depth: x + 14.4 + 0.6 });
    });
    // Doreen's chair, pushed back from the table.
    R.thing(12, 10.7, (ctx) => chairAt(ctx, 12, 11.0, INK.teak, 'far'), { depth: 12 + 10.7 });

    // Diners. Faces go green from half past nine; some never do.
    const DINE = { pose: 'sit', dir: 'l' };
    passenger(R, 6.6, 12.25, 91, { ...DINE, sick: at(9.6) });
    passenger(R, 7.8, 12.25, 92, DINE);
    passenger(R, 13.3, 12.25, 93, { ...DINE, sick: at(10.8) });
    passenger(R, 17.6, 12.25, 94, DINE);
    passenger(R, 18.8, 15.3, 95, { pose: 'sit', dir: 'r', back: true, sick: at(10.1) }); // back against her chair's back
    passenger(R, 23.1, 12.25, 96, { ...DINE, sick: at(10.4) });
    passenger(R, 24.3, 12.25, 99, { ...DINE, scale: 0.72 });
    // The bucket that turns up by a green diner, and the food coma at table 3.
    R.thing(5.2, 12.2, (ctx, t) => {
      if (green(t, at(9.6)) < 0.5) return;
      bucket(ctx, 5.2, 12.0, 0);
    }, { anim: true });
    R.thing(21.2, 13.9, (ctx, t) => {
      if (green(t, at(10.4)) < 0.5) return;
      bucket(ctx, 21.2, 13.7, 0, { color: shade(C.grey, 0.1) });
    }, { anim: true });
    R.air((ctx, t) => {
      if (!Q.detail || hourOf(t) < 13) return;
      const k = (t * 0.6) % 1;
      label(ctx, 17.6 - 0.4 * k, 12.25 - 0.4 * k, 2.2 + k * 1.1, 'z', 0.4 + k * 0.25, alpha(C.ink, 1 - k));
    });

    // ---------- The breakfast rush ----------
    // At seven they're all bunched at the doors behind Doreen; by ten past,
    // spread over the food. Everyone heads back to the doors by seven at night.
    const PLATE = plateHold(1);
    // The plate man: trays all morning, then the chocolate fountain.
    extra(R, 81, daily([
      [0, 3, 3.6, 10.6, { dir: 'r' }],
      [10, 70, 5.4, 4.2, { dir: 'r', back: true, hold: PLATE }],
      [73, 100, 8.9, 4.2, { dir: 'r', back: true, hold: PLATE }],
      [108, 108, 21.6, 6.3],
      [112, 112, 28.2, 9.4],
      [115, 222, 27.3, 12.95, { dir: 'r', back: true, hold: PLATE, arms: [1.3, 1.2] }],
      [224, 224, 25.0, 11.5],
      [233, 233, 9.8, 11.5],
      [238, 240, 3.6, 10.6, { dir: 'r' }],
    ]), { sick: at(9.8), look: { top: C.sky, bottom: C.teal } });
    // Muffins into the handbag, one at a time, all day.
    const bagHold = (ctx, t) => {
      const n = Math.min(5, Math.floor(wrap(t) / 25));
      ctx.beginPath(); ctx.roundRect(-0.55, 0.15, 0.42, 0.34, 0.08); paint(ctx, C.purple, { lw: 0.03 });
      ctx.beginPath(); ctx.arc(-0.34, 0.15, 0.14, Math.PI, 0); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
      for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(-0.5 + i * 0.08, 0.14, 0.07, Math.PI, 0); paint(ctx, C.brown, { lw: 0.02 }); }
    };
    extra(R, 82, daily([
      [0, 3, 1.7, 11.5, { dir: 'r' }],
      [12, 150, 12.4, 4.2, { dir: 'r', back: true, hold: bagHold, arms: (t) => (pulse(t, 3.2) < 0.55 ? [1.35, 0.1] : [0.25, -0.5]) }],
      [156, 212, 18.9, 4.2, { dir: 'l', back: true, hold: bagHold }],
      [220, 220, 6, 6.4],
      [230, 240, 1.7, 11.5, { dir: 'r', hold: bagHold }],
    ]), {
      sick: at(10.3), look: { top: C.lilac, bottom: C.purple, style: 'curly', hair: C.greyLight },
    });
    // The salad man: at the bar till it shuts, then under the tape for croutons.
    extra(R, 83, daily([
      [0, 3, 0.9, 13.1, { dir: 'r' }],
      [8, 8, 6, 11.3],
      [12, 142, 11.6, 9.65, { dir: 'r', back: true, hold: PLATE }],
      [143, 228, 12.6, 9.75, { pose: 'lie', dir: 'l', arms: [Math.PI - 0.15, 2.6], z: 0.15 }],
      [232, 232, 6, 11.3],
      [236, 240, 0.9, 13.1, { dir: 'r' }],
    ]), { sick: at(9.6), look: { top: C.mustard, bottom: C.navy, style: 'bald' } });
    // A kid at the chocolate fountain, getting browner.
    const chocFace = (ctx, hy, back, t) => {
      if (back) return;
      const s = wrap(t);
      if (s < 16) return;
      const k = clamp((s - 16) / 80);
      ctx.beginPath(); ctx.ellipse(0.2, hy + 0.14, 0.08 + 0.1 * k, 0.05 + 0.06 * k, 0, 0, Math.PI * 2);
      ctx.fillStyle = C.brown; ctx.fill();
    };
    extra(R, 84, daily([
      [0, 3, 2.3, 11.8, { dir: 'r' }],
      [5, 5, 7, 11.55],
      [14, 200, 25.3, 11.6, { dir: 'r', arms: (t) => [1.2 + Math.sin(t * 2.5) * 0.35, 0.2] }],
      [210, 210, 7, 11.55],
      [214, 240, 2.3, 11.8, { dir: 'r' }],
    ], 'run'), { scale: 0.68, face: chocFace, look: { top: C.pink, style: 'pony', hat: 'none' } });
    // A selfie with the shrimp tower, flash and all, every few seconds.
    extra(R, 85, daily([
      [0, 3, 4.6, 10.3, { dir: 'r' }],
      [8, 8, 10.5, 11.55],
      [13, 13, 20.6, 11.6],
      [15, 205, 21.6, 12.2, { dir: 'l', arms: [Math.PI - 0.35, 0.2], selfie: true }],
      [207, 207, 20.6, 11.6],
      [212, 212, 10.5, 11.55],
      [217, 240, 4.6, 10.3, { dir: 'r' }],
    ]), {
      sick: at(10.9), look: { top: INK.sunYellow, bottom: C.coral, hat: 'sun' },
      after(ctx, t, p) {
        if (!p.selfie) return;
        const [X, Y] = P(p.x, p.y, 0);
        ctx.fillStyle = C.ink;
        ctx.fillRect(X - 0.62, Y - 2.42, 0.16, 0.26);
        const k = pulse(t, 6);
        if (k < 0.06 && Q.detail) {
          // a small burst at the phone, kept off her face
          ctx.beginPath(); ctx.arc(X - 0.62, Y - 2.36, 0.26 * (1 - k * 10), 0, Math.PI * 2);
          ctx.fillStyle = alpha(C.white, 0.85); ctx.fill();
        }
      },
    });

    // ---------- The crew ----------
    // A waiter up and down the aisle: orange juice in the morning, buckets
    // after eleven. The aisle runs behind the diners' chairs and in front of
    // Doreen's, and he turns at the shrimp tower (past it, a kid and the
    // chocolate fountain are in the way).
    const trayHold = (ctx, t) => {
      ctx.beginPath(); ctx.ellipse(0.1, -0.4, 0.4, 0.1, 0, 0, Math.PI * 2); paint(ctx, CHROME, { lw: 0.03 });
      if (hourOf(t) < 11) {
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.rect(-0.15 + i * 0.2, -0.68, 0.12, 0.26); paint(ctx, C.mustard, { lw: 0.02 }); }
      } else {
        for (let i = 0; i < 3; i++) {
          ctx.beginPath(); ctx.moveTo(-0.12, -0.45 - i * 0.12); ctx.lineTo(0.32, -0.45 - i * 0.12); ctx.lineTo(0.27, -0.72 - i * 0.12); ctx.lineTo(-0.07, -0.72 - i * 0.12); ctx.closePath();
          paint(ctx, C.grey, { lw: 0.02 });
        }
      }
    };
    R.mover((t) => {
      const s = pulse(t, 44) * 44;
      const x0 = 3.5, x1 = 20.6, y = 11.55;
      if (s < 19) return { x: x0 + ((x1 - x0) * s) / 19, y, pose: 'walk', dir: 'r' };
      if (s < 22) return { x: x1, y, dir: 'l' };
      if (s < 41) return { x: x1 - ((x1 - x0) * (s - 22)) / 19, y, pose: 'walk', dir: 'l', back: true };
      return { x: x0, y, dir: 'r' };
    }, (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, { ...folk(90), ...CREW_LOOK, pose: p.pose || 'stand', dir: p.dir, back: p.back, arms: [2.6, p.pose ? Math.sin(t * 7) * 0.4 : -0.1], hold: trayHold }, t);
    });
    // Restocking the Gander Cola, a crate at a time.
    const crate = (ctx) => {
      ctx.beginPath(); ctx.rect(-0.05, -0.5, 0.6, 0.32); paint(ctx, INK.funnelRed, { lw: 0.03 });
      if (Q.detail) { ctx.fillStyle = C.white; ctx.fillRect(0.02, -0.38, 0.46, 0.06); }
    };
    crew(R, 27.9, 2.3, 87, { dir: 'r', arms: [1.3, 1.1], hold: crate });
    R.thing(31.3, 5.4, (ctx) => plant(ctx, 31.3, 5.4, 0, 0, { kind: 'palm', leaf: C.leaf, potColor: INK.teak }));
    crew(R, 30.2, 6.2, 98, { dir: 'l', arms: [1.1, 0.3] });
    crew(R, 31.0, 13.3, 88, { dir: 'l', back: true, arms: [1.2, 1.0] });

    // ---------- The finds ----------
    // The chase: sighting 1, 7 to 9am. Under the left heap of lettuce, having
    // breakfast; its tail hangs out of the leaves the whole time. Found, it
    // hops off the back of the bar and out of the door to the Theater and the lift.
    sighting(R, 0, {
      at: IG_AT, kind: 'poke', inside: heaps[0], dir: 'r', bias: 0.3,
      hint: 'Two heaps of lettuce, and one of them has a tail.',
      draw(ctx, t, p) {
        // Its own tail is clipped off and a longer one hangs out of the
        // leaves, over the counter's edge and down the front.
        const [AX, AY] = P(p.x, p.y, p.z);
        ctx.save();
        ctx.beginPath(); ctx.rect(AX - 0.36, AY - 2, 3, 3); ctx.clip();
        iguana(ctx, p.x, p.y, p.z, 'r', t);
        ctx.restore();
        hangingTail(ctx, AX, AY, t);
        // munching, once it's been caught at it
        if (heaps[0].k() < 0.3) return;
        const [X, Y] = P(p.x, p.y, p.z);
        leaf(ctx, X + 0.7, Y - 0.24 + Math.sin(t * 9) * 0.015, 0.12, 0.07, 0.6, LEAF_TONES[1]);
      },
      run: [[12.8, 6.6, 0], [3, 5.4, 0], [0.1, 3.3, 0]],
    });
    R.find({
      id: 'tongs', label: 'Tongs with a pink scrunchie', kind: 'poke', inside: hash, at: [TONGS[0], TONGS[1] + 0.1, 1.3], r: 0.8,
      hint: 'One of the hot dishes is shut, and something pink is caught in its lid.',
    });
    R.find({
      id: 'queue-ticket', label: 'A queue ticket', kind: 'hard', at: [3.4, 14.4, 0.05], r: 0.8,
      riddle: 'Dropped in the rush at seven.', hint: 'Doreen was number 2. Look at the litter by the doors.',
    });
    R.find({ id: 'butter-prints', label: 'Claw prints in the butter', kind: 'spot', at: [8.5, 9.2, 1.5], r: 0.75 });
    R.find({ id: 'shrimp', label: 'A shrimp on a toothpick', kind: 'spot', at: [20, 10, 3.3], r: 0.8 });
  },
};

// A passenger or crew who stays put, with arms (kit.js's passenger has no
// arms, so these are local).
function passenger(R, x, y, seed, o = {}) {
  const look = { ...folk(seed), ...(o.look || {}) };
  if (o.sick != null) look.dress = false;
  R.thing(x, y, (ctx, t) => {
    const k = green(t, o.sick);
    person(ctx, x, y, o.z || 0, { ...look, skin: queasy(look.skin, k), pose: o.pose || 'stand', dir: o.dir || 'r', back: o.back, scale: o.scale, arms: o.arms, hold: o.hold }, t);
  }, { anim: true });
}
function crew(R, x, y, seed, o = {}) {
  passenger(R, x, y, seed, { ...o, sick: null, look: { ...CREW_LOOK, ...(o.look || {}) } });
}
