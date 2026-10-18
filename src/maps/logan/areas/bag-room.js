// The Bag Room: under the gates, where the bags go (docs/levels/logan.md).
// The belt from the counters comes through the flaps and jams at the merge,
// where a supervisor whacks it with a rubber mallet; the rest ride the
// sorting loop, under a tag reader and round an island where a handler reads
// tags through a magnifying glass. Handlers load the carts that the bag
// trains take out along the service road; one throws every bag marked
// FRAGILE the hardest, over his colleague's head, onto the dolly marked
// HANDLE WITH CARE. The lost-and-found cage holds everything nobody came back
// for since 1987 (the goose is behind its door, its head over the sign), the
// pets wait in their crates, the bag hospital tapes up what the belts burst.
//
// Running gags: the pink bag rides the loop all day, collecting notes, its
// laps counted on a board; nobody claims it, and at midnight it goes round
// once more. In the ground stop a handler rides the loop behind it. And the
// thrower: every six seconds, FRAGILE goes over.
//
// World units (plan.js AREAS: x 0 to 30, y 30 to 48). Indoors and lit: no
// snow and no night veil. The area is drawn in chunks with seams at x 16 and
// y 32, so long things are cut there and big ones kept clear of them.
import { C, Q, P, box, rect, face, poly, paint, paintText, cylinder, table, tiles, alpha, tint, shade, mix, person, goose } from '../../../engine/art.js';
import { pulse } from '../../../engine/actors.js';
import { INK, PINK, BRAND, SIGN, RAMP, TONE, LIT, RUBBER } from '../style.js';
import { bag, cart, look, vest, inHand, sign, hangSign, lettering, nightGlow } from '../kit.js';
import { AIR, FRONT, CHECK, SHORE } from '../plan.js';
import { LOOP, hour, stopped } from '../clock.js';

// ---------- Inks ----------
const FLOOR = mix(INK.concrete, C.grey, 0.38); // sealed concrete, back of house
const SKIRT = mix(C.grey, C.greyLight, 0.35); // the belts' steel sides
const STEEL = mix(C.greyLight, C.white, 0.3);
// (The belts' tops: the style sheet's RUBBER, as at check-in and security.)
const WALL = mix(INK.concrete, C.white, 0.3);
const GRANITE = mix(C.grey, INK.concrete, 0.4);
const PLATE = mix(C.grey, C.greyLight, 0.55); // the island's deck
const MACHINE = mix(INK.harbor, C.white, 0.4);
const WIRE = alpha(C.ink, 0.3);
const BRASS = INK.signal;
const FUR = mix(C.mustard, C.wood, 0.45);

// ---------- The sorting loop ----------
// A rectangle of belt, gone round at a walking pace (onLoop: where something
// riding it is at t). The pink bag, the tuba and the decoy keep their places.
const LOOPBOX = [6, 33.6, 24, 39.4];
const PERIM = 2 * (LOOPBOX[2] - LOOPBOX[0] + LOOPBOX[3] - LOOPBOX[1]);
function onLoop(t, offset, speed = 1.1) {
  const [x0, y0, x1, y1] = LOOPBOX, a = x1 - x0, b = y1 - y0;
  let s = (((t * speed + offset) % PERIM) + PERIM) % PERIM;
  if (s < a) return [x0 + s, y0];
  s -= a; if (s < b) return [x1, y0 + s];
  s -= b; if (s < a) return [x1 - s, y1];
  s -= a; return [x0, y1 - s];
}
// Which way the loop runs where something is: along x (the back and front
// runs) or y (the ends); and which way a rider on it faces on screen.
const onRun = (y) => Math.abs(y - LOOPBOX[1]) < 1e-6 || Math.abs(y - LOOPBOX[3]) < 1e-6;
const sideOf = (x, y) => (onRun(y) ? 'x' : 'y');
const headOf = (x, y) => (Math.abs(y - LOOPBOX[1]) < 1e-6 ? 'r' : Math.abs(y - LOOPBOX[3]) < 1e-6 ? 'l' : Math.abs(x - LOOPBOX[2]) < 1e-6 ? 'l' : 'r');

// The FRAGILE bag's flight, from the handler to the dolly, every six seconds.
function thrown(t) {
  const k = ((t % 6) + 6) % 6 / 6;
  const u = Math.min(1, k * 1.6);
  return [12 + u * 6, 42.4 + u * 2.6, 0.9 + Math.sin(u * Math.PI) * 2.6];
}

// The belts: in pieces, so whoever stands by one sorts right, cut at the
// chunk seam (x 16). Each piece has steel lips along its edges; its slats
// move (drawn over it, live).
const BW = 0.6, BZ = 0.5, LIP = 0.09;
const XS = [5.4, 7.6, 9.8, 12, 14, 16, 18.2, 20.4, 22.6, 24.6];
const YS = [34.2, 36.5, 38.8];
const PIECES = (() => {
  const [x0, y0, x1, y1] = LOOPBOX, list = [];
  const inA = x0 + BW, inB = x1 - BW;
  for (let i = 0; i < XS.length - 1; i++) {
    const a = XS[i], b = XS[i + 1], ia = Math.max(a, inA), ib = Math.min(b, inB);
    const back = { b: [a, y0 - BW, b, y0 + BW], along: 'x', dir: 1, lips: [[a, y0 - BW, b - a, LIP]] };
    const front = { b: [a, y1 - BW, b, y1 + BW], along: 'x', dir: -1, lips: [[a, y1 + BW - LIP, b - a, LIP]] };
    if (ib > ia) { back.lips.push([ia, y0 + BW - LIP, ib - ia, LIP]); front.lips.push([ia, y1 - BW, ib - ia, LIP]); }
    if (i === 0) { back.lips.push([a, y0 - BW, LIP, 2 * BW]); front.lips.push([a, y1 - BW, LIP, 2 * BW]); }
    if (i === XS.length - 2) front.lips.push([b - LIP, y1 - BW, LIP, 2 * BW]);
    list.push(back, front);
  }
  for (let i = 0; i < YS.length - 1; i++) {
    const a = YS[i], b = YS[i + 1];
    list.push({ b: [x0 - BW, a, x0 + BW, b], along: 'y', dir: -1, lips: [[x0 - BW, a, LIP, b - a], [x0 + BW - LIP, a, LIP, b - a]] });
    list.push({ b: [x1 - BW, a, x1 + BW, b], along: 'y', dir: 1, lips: [[x1 - BW, a, LIP, b - a], [x1 + BW - LIP, a, LIP, b - a]] });
  }
  // In from the counters: through the flaps, down to the merge, and along
  // into the loop's corner, head on (which is why it jams).
  list.push({ b: [25.9, AIR, 27, 32], along: 'y', dir: 1, lips: [[25.9, AIR, LIP, 32 - AIR], [27 - LIP, AIR, LIP, 32 - AIR]] });
  list.push({ b: [25.9, 32, 27, 34.2], along: 'y', dir: 1, lips: [[25.9, 32, LIP, 1], [27 - LIP, 32, LIP, 2.2], [25.9, 34.2 - LIP, 1.1, LIP]] });
  list.push({ b: [24.6, 33, 25.9, 34.2], along: 'x', dir: -1, lips: [[24.6, 33, 1.3, LIP], [24.6, 34.2 - LIP, 1.3, LIP]] });
  return list;
})();

function beltPiece(ctx, pc) {
  const [x0, y0, x1, y1] = pc.b;
  box(ctx, x0, y0, 0, x1 - x0, y1 - y0, BZ, SKIRT, { top: RUBBER, dens: 0.14, lw: 0.045 });
  for (const [x, y, w, d] of pc.lips) box(ctx, x, y, BZ, w, d, 0.1, STEEL, { flat: true, lw: 0.02 });
}
function slats(ctx, pc, t) {
  if (!Q.detail) return;
  const [x0, y0, x1, y1] = pc.b, step = 0.4;
  const ph = (((t * 1.1 * pc.dir) % step) + step) % step;
  ctx.beginPath();
  if (pc.along === 'x') {
    for (let x = Math.ceil((x0 - ph) / step) * step + ph; x < x1 - 0.02; x += step) {
      const a = P(x, y0 + LIP, BZ), b = P(x, y1 - LIP, BZ);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    }
  } else {
    for (let y = Math.ceil((y0 - ph) / step) * step + ph; y < y1 - 0.02; y += step) {
      const a = P(x0 + LIP, y, BZ), b = P(x1 - LIP, y, BZ);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    }
  }
  ctx.strokeStyle = alpha(C.white, 0.16);
  ctx.lineWidth = 0.035;
  ctx.stroke();
}

// What rides the loop, by its place on it (the pink bag is at 13, a handler
// rides at 15.4 in the ground stop, the decoy is at 30 and the tuba at 46).
const LOOPBAGS = [
  [0.6, { kind: 'case', color: C.ink, lie: true }],
  [3.4, { kind: 'duffel', color: C.navy }],
  [6.6, { kind: 'pumpkin' }],
  [9.6, { kind: 'case', color: C.teal }],
  [18, { kind: 'case', color: C.black, lie: true }],
  [20.8, { kind: 'pack', color: C.mustard }],
  [23.6, { kind: 'case', color: C.red, lie: true }],
  [26.6, { kind: 'pie' }],
  [33.4, { kind: 'duffel', color: C.green }],
  [36.4, { kind: 'case', color: C.navy, lie: true }],
  [39.6, { kind: 'cooler' }],
  [42.6, { kind: 'case', color: C.ink }],
];
const PINKAT = 13, RIDERAT = 15.4, DECOYAT = 30, TUBAAT = 46;
// The bag train's lanes (day.js): out at y 47.2, back at 45.9, from x 13.4
// to the door in the right wall; kept clear, the front kerb behind them.
const LANES = [45.2, 47.8];

// ---------- Small helpers ----------
const line2 = (ctx, a, b) => { const p = P(...a), q = P(...b); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); };
// Words that pop up over something (a whack, a hiss, a beep), outlined in
// white so they read on anything.
function pop(ctx, x, y, z, text, size, color, a = 1) {
  const [X, Y] = P(x, y, z), k = 40;
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(1 / k, 1 / k);
  ctx.globalAlpha *= a;
  ctx.font = `${size * k}px "Bagel Fat One", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * k * 0.3;
  ctx.strokeStyle = C.white;
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
// A luggage tag on a string, hung at a screen point.
function tagAt(ctx, X, Y, color = C.white) {
  if (!Q.detail) return;
  ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + 0.05, Y + 0.08);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.015; ctx.stroke();
  ctx.beginPath(); ctx.rect(X + 0.02, Y + 0.08, 0.13, 0.09);
  paint(ctx, color, { lw: 0.015 });
}
// A wire panel standing between two floor points: a grid of wire in a
// tubular frame. o: { frame (line width), wire: false }
function wirePanel(ctx, ax, ay, bx, by, z0, z1, o = {}) {
  const len = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(len / 0.24));
  if (Q.detail && o.wire !== false) {
    ctx.beginPath();
    for (let i = 1; i < n; i++) {
      const k = i / n, x = ax + (bx - ax) * k, y = ay + (by - ay) * k;
      line2(ctx, [x, y, z0], [x, y, z1]);
    }
    for (let z = z0 + 0.24; z < z1 - 0.06; z += 0.24) line2(ctx, [ax, ay, z], [bx, by, z]);
    ctx.strokeStyle = WIRE;
    ctx.lineWidth = 0.02;
    ctx.stroke();
  }
  ctx.beginPath();
  line2(ctx, [ax, ay, z0], [bx, by, z0]);
  line2(ctx, [ax, ay, z1], [bx, by, z1]);
  line2(ctx, [ax, ay, z0], [ax, ay, z1]);
  line2(ctx, [bx, by, z0], [bx, by, z1]);
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = (o.frame || 0.08) + 0.03;
  ctx.stroke();
  ctx.strokeStyle = STEEL;
  ctx.lineWidth = o.frame || 0.08;
  ctx.stroke();
}
// A wire lid: the grid across the top of a crate.
function wireTop(ctx, x0, y0, x1, y1, z) {
  if (!Q.detail) return;
  ctx.beginPath();
  for (let x = x0 + 0.25; x < x1 - 0.05; x += 0.25) line2(ctx, [x, y0, z], [x, y1, z]);
  for (let y = y0 + 0.25; y < y1 - 0.05; y += 0.25) line2(ctx, [x0, y, z], [x1, y, z]);
  ctx.strokeStyle = WIRE;
  ctx.lineWidth = 0.02;
  ctx.stroke();
}
// Diagonal hazard hatching in a box on the floor, with a border.
function hatch(ctx, x0, y0, x1, y1, color, step = 0.55) {
  const z = 0.006, d = y1 - y0;
  ctx.save();
  poly(ctx, [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]]);
  ctx.clip();
  for (let x = x0 - d; x < x1; x += step) face(ctx, [[x, y0, z], [x + step / 2, y0, z], [x + step / 2 + d, y1, z], [x + d, y1, z]], color, { stroke: false });
  ctx.restore();
  face(ctx, [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], null, { stroke: color, lw: 0.08 });
}

// ---------- People ----------
// The handlers dress from the kit (look(seed, 'ramp'): the airport's one
// hi-vis, ear defenders on half of them), the supervisor in the kit's vest.
// Reading glasses.
function specs(c, hy, back) {
  if (back || !Q.detail) return;
  c.beginPath();
  c.arc(0.1, hy + 0.02, 0.07, 0, Math.PI * 2);
  c.moveTo(0.31, hy + 0.02);
  c.arc(0.24, hy + 0.02, 0.07, 0, Math.PI * 2);
  c.strokeStyle = C.ink; c.lineWidth = 0.03; c.stroke();
}
const RAMPLK = (seed, extra = {}) => look(seed, 'ramp', extra);
const SUPER = look(204, 'ramp', { top: C.white, hat: 'helmet', wear: vest() });
const THROWER = RAMPLK(211, { hat: 'beanie', scale: 1.08 });
const DUCKER = RAMPLK(215, { hat: 'helmet' });
const CARRIER = RAMPLK(216);
const PULLER = RAMPLK(218, { hat: 'beanie' });
const SCANNER = RAMPLK(219);
const READER = look(222, 'ramp', { hat: 'beanie', face: specs });
const TAPER = RAMPLK(224, { hat: 'helmet' });
const RIDER = RAMPLK(226, { hat: 'beanie' });
const KEEPER = { ...look(228, 'agent', { hair: C.greyLight, style: 'bald', top: C.navy }), face: specs };

// Something held in the near hand, turned down the arm (kit.js, inHand).
const held = (a, draw) => inHand(a, draw, { turn: true });
function mallet(c) {
  c.beginPath(); c.moveTo(0, -0.05); c.lineTo(0, 0.82);
  c.lineCap = 'round';
  c.strokeStyle = C.ink; c.lineWidth = 0.11; c.stroke();
  c.strokeStyle = C.wood; c.lineWidth = 0.06; c.stroke();
  c.beginPath(); c.roundRect(-0.22, 0.78, 0.44, 0.24, 0.08);
  paint(c, C.black, { lw: 0.04 });
}
function lens(c) {
  c.beginPath(); c.moveTo(0, -0.04); c.lineTo(0, 0.24);
  c.strokeStyle = C.ink; c.lineWidth = 0.07; c.lineCap = 'round'; c.stroke();
  c.beginPath(); c.arc(0, 0.4, 0.16, 0, Math.PI * 2);
  paint(c, alpha(C.sky, 0.55), { lw: 0.04 });
}
function gun(c) {
  c.beginPath(); c.roundRect(-0.06, -0.08, 0.12, 0.38, 0.04);
  paint(c, C.ink, { lw: 0.025 });
  c.beginPath(); c.rect(-0.05, 0.27, 0.1, 0.05);
  c.fillStyle = C.red; c.fill();
}
function tapeRoll(c) {
  c.beginPath(); c.arc(0, 0.06, 0.11, 0, Math.PI * 2);
  paint(c, STEEL, { lw: 0.03 });
  c.beginPath(); c.arc(0, 0.06, 0.05, 0, Math.PI * 2);
  c.fillStyle = C.woodLight; c.fill();
}
// A newspaper held up in both hands (read arms), or over the face (asleep).
const paper = (asleep) => (c) => {
  c.beginPath();
  if (asleep) c.rect(-0.42, -1.08, 0.64, 0.72);
  else c.rect(-0.12, -0.36, 0.6, 0.66);
  paint(c, C.white, { lw: 0.03 });
  if (!Q.detail) return;
  c.fillStyle = alpha(C.ink, 0.45);
  const [x, y] = asleep ? [-0.36, -1.0] : [-0.06, -0.28];
  c.fillRect(x, y, 0.5, 0.08);
  for (let i = 0; i < 4; i++) c.fillRect(x, y + 0.16 + i * 0.1, i % 2 ? 0.34 : 0.5, 0.03);
};
// Someone who holds still (drawn once, cached), with whatever they hold or
// wear. o: person()'s, plus z, on (when they're there), depth.
function still(R, x, y, lk, o = {}) {
  const { z = 0, on, depth, ...rest } = o;
  R.thing(x, y, (ctx) => person(ctx, x, y, z, { ...lk, pose: 'stand', dir: 'r', ...rest }, 0), { ...(on ? { on } : {}), ...(depth != null ? { depth } : {}) });
}

// ---------- Luggage on the loop ----------
function pumpkin(ctx, x, y, z) {
  const [X, Y] = P(x, y, z + 0.24);
  ctx.beginPath(); ctx.ellipse(X, Y, 0.4, 0.27, 0, 0, Math.PI * 2);
  paint(ctx, INK.safety, { dots: shade(INK.safety, 0.4), density: 0.14, lw: 0.04 });
  if (Q.detail) {
    ctx.beginPath();
    for (const d of [-0.22, 0, 0.22]) { ctx.moveTo(X + d * 0.5, Y - 0.26); ctx.quadraticCurveTo(X + d * 1.6, Y, X + d * 0.5, Y + 0.26); }
    ctx.strokeStyle = shade(INK.safety, 0.3); ctx.lineWidth = 0.025; ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(X - 0.04, Y - 0.24); ctx.lineTo(X + 0.02, Y - 0.38); ctx.lineTo(X + 0.08, Y - 0.36); ctx.lineTo(X + 0.04, Y - 0.24);
  paint(ctx, C.green, { lw: 0.025 });
  tagAt(ctx, X + 0.05, Y - 0.33);
}
function cooler(ctx, x, y, z, along) {
  const X = along === 'x', w = X ? 0.78 : 0.5, d = X ? 0.5 : 0.78;
  box(ctx, x - w / 2, y - d / 2, z, w, d, 0.36, C.white, { lw: 0.035, dens: 0.12 });
  box(ctx, x - w / 2 - 0.02, y - d / 2 - 0.02, z + 0.36, w + 0.04, d + 0.04, 0.1, C.red, { flat: true, lw: 0.03 });
  if (X) lettering(ctx, 'x', x, y + d / 2 + 0.005, z + 0.18, 'LOBSTER', 0.11, C.red);
  else lettering(ctx, 'y', x + w / 2 + 0.005, y, z + 0.18, 'LOBSTER', 0.11, C.red);
}
function loopBag(ctx, x, y, along, o) {
  if (o.kind === 'pumpkin') return pumpkin(ctx, x, y, BZ);
  if (o.kind === 'cooler') return cooler(ctx, x, y, BZ, along);
  if (o.kind === 'pie') {
    bag(ctx, x, y, BZ, { kind: 'box', s: 1.2 });
    lettering(ctx, 'x', x, y + 0.28, BZ + 0.24, 'PIE', 0.17, C.ink, 'Bagel Fat One');
    return;
  }
  bag(ctx, x, y, BZ, { s: 1.2, along, ...o });
}
// The pink bag: a hard case on its wheels, nobody's. Notes collect on it
// through the day; in the stuck night somebody gives it a party hat.
function pinkBag(ctx, x, y, along, t) {
  const s = 1.25, X = along === 'x';
  bag(ctx, x, y, BZ, { kind: 'case', color: PINK, along, s, tag: INK.signal });
  if (!Q.detail) return;
  let h = hour(t);
  if (h < 4) h += 24;
  const notes = h >= 20 ? 4 : h >= 16 ? 3 : h >= 12 ? 2 : h >= 8 ? 1 : 0;
  const W = (X ? 0.46 : 0.28) * s, D = (X ? 0.28 : 0.46) * s, H = 0.68 * s, zb = BZ + 0.06;
  const cols = [C.butter, C.mint, C.white, C.butter];
  for (let i = 0; i < notes; i++) {
    const u = -0.17 + (i % 2) * 0.17, v = zb + H * 0.7 - Math.floor(i / 2) * 0.2, q = 0.13;
    const pts = X
      ? [[x + u, y + D / 2 + 0.004, v], [x + u + q, y + D / 2 + 0.004, v], [x + u + q, y + D / 2 + 0.004, v - q], [x + u, y + D / 2 + 0.004, v - q]]
      : [[x + W / 2 + 0.004, y + u, v], [x + W / 2 + 0.004, y + u + q, v], [x + W / 2 + 0.004, y + u + q, v - q], [x + W / 2 + 0.004, y + u, v - q]];
    face(ctx, pts, cols[i], { lw: 0.015 });
  }
  if (h >= 18) {
    const [hx, hy] = P(x, y, zb + H + 0.04);
    ctx.beginPath(); ctx.moveTo(hx - 0.13, hy); ctx.lineTo(hx + 0.02, hy - 0.4); ctx.lineTo(hx + 0.14, hy); ctx.closePath();
    paint(ctx, C.mustard, { dots: C.coral, density: 0.4, lw: 0.025 });
    ctx.beginPath(); ctx.arc(hx + 0.02, hy - 0.42, 0.05, 0, Math.PI * 2);
    paint(ctx, C.coral, { lw: 0.02 });
  }
}
// The tuba, in its case with the lid up: the big brass bell of it rising
// out of the red plush, the coil and the valves beside it, a tag on it.
function tuba(ctx, x, y, z, along) {
  const X = along === 'x', L = 1.5, Wd = 0.72, H = 0.32;
  const w = X ? L : Wd, d = X ? Wd : L;
  // the lid, propped up along the back
  if (X) face(ctx, [[x - w / 2, y - d / 2, z + H], [x + w / 2, y - d / 2, z + H], [x + w / 2, y - d / 2 - 0.14, z + H + 0.45], [x - w / 2, y - d / 2 - 0.14, z + H + 0.45]], C.black, { lw: 0.035 });
  else face(ctx, [[x - w / 2, y - d / 2, z + H], [x - w / 2, y + d / 2, z + H], [x - w / 2 - 0.14, y + d / 2, z + H + 0.45], [x - w / 2 - 0.14, y - d / 2, z + H + 0.45]], C.black, { lw: 0.035 });
  box(ctx, x - w / 2, y - d / 2, z, w, d, H, C.black, { top: INK.cranberry, dens: 0.2, lw: 0.035 });
  const u = (k) => (X ? [x + k * L, y, z + H] : [x, y + k * L, z + H]);
  // the coil and the valves
  const [cx, cy] = P(...u(-0.2));
  ctx.beginPath(); ctx.ellipse(cx, cy - 0.1, 0.38, 0.19, 0, 0, Math.PI * 2);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.17; ctx.stroke();
  ctx.strokeStyle = BRASS; ctx.lineWidth = 0.11; ctx.stroke();
  for (const k of [-0.1, 0.01, 0.12]) {
    ctx.beginPath(); ctx.rect(cx + k - 0.035, cy - 0.46, 0.07, 0.28);
    paint(ctx, tint(BRASS, 0.25), { lw: 0.025 });
  }
  // the bell, big and flared, rising out of the case
  const [bx, by] = P(...u(0.2));
  const tx = bx + 0.1, ty = by - 0.95, R0 = 0.5;
  ctx.beginPath();
  ctx.moveTo(bx - 0.13, by - 0.02); ctx.quadraticCurveTo(bx - 0.12, ty + 0.3, tx - R0, ty);
  ctx.lineTo(tx + R0, ty); ctx.quadraticCurveTo(bx + 0.2, ty + 0.3, bx + 0.13, by - 0.02); ctx.closePath();
  paint(ctx, BRASS, { dots: shade(BRASS, 0.35), density: 0.14, lw: 0.045 });
  ctx.beginPath(); ctx.ellipse(tx, ty, R0, 0.18, 0, 0, Math.PI * 2);
  paint(ctx, tint(BRASS, 0.3), { lw: 0.045 });
  ctx.beginPath(); ctx.ellipse(tx, ty + 0.03, R0 * 0.68, 0.11, 0, 0, Math.PI * 2);
  ctx.fillStyle = shade(BRASS, 0.55); ctx.fill();
  if (Q.detail) { ctx.beginPath(); ctx.moveTo(tx - R0 * 0.75, ty + 0.12); ctx.quadraticCurveTo(tx - R0 * 0.55, ty + 0.4, bx - 0.06, by - 0.2); ctx.strokeStyle = alpha(C.white, 0.6); ctx.lineWidth = 0.035; ctx.stroke(); }
  tagAt(ctx, cx - 0.38, cy - 0.14, INK.cranberry);
}
// Where the tuba rode, once it's gone home: its claim tag, going round.
function claimTag(ctx, x, y, z) {
  rect(ctx, x - 0.26, y - 0.17, 0.52, 0.34, z + 0.01, C.white, { lw: 0.025 });
  rect(ctx, x - 0.18, y - 0.05, 0.36, 0.1, z + 0.015, C.red, { stroke: false });
  if (!Q.detail) return;
  const a = P(x - 0.26, y, z + 0.02);
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(a[0] - 0.2, a[1] - 0.1, a[0] - 0.3, a[1] + 0.06);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02; ctx.stroke();
}
// The decoy someone checked: a carved wooden goose on its keel. Painted
// white, it passes for the real thing at a glance; close up there's the
// keel, the chisel marks, paint chipped to the wood and a tag round its neck.
function huntingDecoy(ctx, x, y, z, dir) {
  box(ctx, x - 0.34, y - 0.1, z, 0.68, 0.2, 0.1, C.brown, { flat: true, lw: 0.025 });
  goose(ctx, x, y, z + 0.1, 0, { pose: 'sit', dir });
  if (!Q.detail) return;
  const [X, Y] = P(x, y, z + 0.1), f = dir === 'l' ? -1 : 1;
  ctx.strokeStyle = alpha(C.brown, 0.7);
  ctx.lineWidth = 0.022;
  for (const d of [-0.22, -0.08, 0.06]) {
    ctx.beginPath(); ctx.moveTo(X + f * d - 0.04, Y - 0.36); ctx.quadraticCurveTo(X + f * (d + 0.06), Y - 0.24, X + f * d, Y - 0.08); ctx.stroke();
  }
  ctx.fillStyle = C.wood;
  for (const [dx, dy] of [[-0.26, -0.18], [0.1, -0.33], [0.24, -0.14], [0.33, -0.9]]) { ctx.beginPath(); ctx.ellipse(X + f * dx, Y + dy, 0.045, 0.028, 0, 0, Math.PI * 2); ctx.fill(); }
  tagAt(ctx, X + f * 0.27, Y - 0.55, C.butter);
}
// The FRAGILE bag: tumbling over, end over end, its sticker on every side.
function fragileBag(ctx, x, y, z, spin) {
  const [X, Y] = P(x, y, z + 0.3);
  ctx.save();
  ctx.translate(X, Y); ctx.rotate(spin); ctx.translate(-X, -Y);
  box(ctx, x - 0.36, y - 0.2, z, 0.72, 0.4, 0.58, C.mustard, { lw: 0.035, dens: 0.16 });
  face(ctx, [[x - 0.31, y + 0.204, z + 0.16], [x + 0.31, y + 0.204, z + 0.16], [x + 0.31, y + 0.204, z + 0.42], [x - 0.31, y + 0.204, z + 0.42]], C.white, { lw: 0.02 });
  lettering(ctx, 'x', x, y + 0.21, z + 0.29, 'FRAGILE', 0.12, C.red, 'Bagel Fat One');
  rect(ctx, x - 0.22, y - 0.12, 0.44, 0.24, z + 0.585, C.white, { lw: 0.02 });
  if (Q.detail) {
    // the cracked glass on the sticker
    const g = P(x + 0.18, y + 0.2, z + 0.5);
    ctx.beginPath(); ctx.moveTo(g[0] - 0.05, g[1] - 0.06); ctx.lineTo(g[0], g[1]); ctx.lineTo(g[0] - 0.03, g[1] + 0.05); ctx.moveTo(g[0], g[1]); ctx.lineTo(g[0] + 0.06, g[1] - 0.02);
    ctx.strokeStyle = C.red; ctx.lineWidth = 0.02; ctx.stroke();
    box(ctx, x - 0.12, y - 0.03, z + 0.59, 0.24, 0.06, 0.05, C.ink, { flat: true, stroke: false });
  }
  ctx.restore();
}

// ---------- The jam ----------
// The supervisor's round: three whacks, then a rest. The heap shakes as
// each lands.
const WHACK = 5;
const whackS = (t) => ((t % WHACK) + WHACK) % WHACK;
function jolt(t) {
  const s = whackS(t);
  if (s < 0.79 || s > 2.6) return 0;
  const q = s % 0.8;
  return q < 0.2 ? 1 - q / 0.2 : 0;
}
// A folded stroller, wedged across the top of the heap, wheels in the air.
function stroller(ctx, x, y, z) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y); ctx.rotate(-0.5);
  ctx.beginPath(); ctx.moveTo(-0.5, 0); ctx.lineTo(0.5, -0.05); ctx.moveTo(-0.45, 0.1); ctx.lineTo(0.5, 0.05);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.08; ctx.lineCap = 'round'; ctx.stroke();
  ctx.strokeStyle = STEEL; ctx.lineWidth = 0.04; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-0.55, 0.02); ctx.quadraticCurveTo(-0.7, -0.05, -0.62, -0.18);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.06; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-0.2, -0.04); ctx.quadraticCurveTo(-0.05, -0.32, 0.18, -0.06); ctx.closePath();
  paint(ctx, C.teal, { lw: 0.03 });
  for (const [wx, wy] of [[0.48, -0.12], [0.56, 0.1], [0.36, 0.14]]) { ctx.beginPath(); ctx.arc(wx, wy, 0.08, 0, Math.PI * 2); paint(ctx, C.ink, { lw: 0.02 }); }
  ctx.restore();
}
// The heap at the merge. k: 0 jammed, 1 cleared (it slides off and goes).
function heap(ctx, t, k) {
  if (k > 0.98) return;
  const j = k > 0.02 ? 0 : jolt(t);
  ctx.save();
  if (k > 0.02) { ctx.globalAlpha *= 1 - k; ctx.translate(-k * 0.9, -k * 0.25); }
  if (j) {
    const [X, Y] = P(25.4, 33.7, BZ);
    ctx.translate(X, Y); ctx.rotate(Math.sin(t * 70) * 0.05 * j); ctx.translate(-X, -Y - j * 0.08);
  }
  bag(ctx, 25.2, 33.6, BZ, { kind: 'duffel', color: C.navy, along: 'y', s: 1.3 });
  const [rx, ry] = P(26.05, 33.4, BZ);
  ctx.save(); ctx.translate(rx, ry); ctx.rotate(0.38); ctx.translate(-rx, -ry);
  bag(ctx, 26.05, 33.4, BZ, { kind: 'case', color: C.red, along: 'x', s: 1.15 });
  ctx.restore();
  bag(ctx, 24.95, 33.35, BZ + 0.45, { kind: 'box', s: 1.05 });
  lettering(ctx, 'x', 24.95, 33.6, BZ + 0.66, 'THIS SIDE UP', 0.06, C.ink);
  stroller(ctx, 25.6, 33.75, BZ + 0.85);
  ctx.restore();
}
// The beacon on the jam board: amber, going round, while it's jammed;
// green while it isn't.
function beacon(ctx, x, y, z, t, k) {
  const on = k < 0.5;
  box(ctx, x - 0.13, y - 0.13, z, 0.26, 0.26, 0.08, C.ink, { flat: true, lw: 0.02 });
  const [X, Y] = P(x, y, z + 0.22);
  if (on && Q.detail) {
    const a = t * 5;
    ctx.beginPath(); ctx.moveTo(X, Y);
    ctx.lineTo(X + Math.cos(a - 0.3) * 1.5, Y + Math.sin(a - 0.3) * 0.75);
    ctx.lineTo(X + Math.cos(a + 0.3) * 1.5, Y + Math.sin(a + 0.3) * 0.75);
    ctx.closePath();
    ctx.fillStyle = alpha(INK.signal, 0.32);
    ctx.fill();
  }
  ctx.beginPath(); ctx.ellipse(X, Y, 0.15, 0.18, 0, 0, Math.PI * 2);
  paint(ctx, on ? INK.signal : C.green, { lw: 0.03 });
  if (on && Math.cos(t * 5) > 0) { ctx.beginPath(); ctx.ellipse(X + Math.sin(t * 5) * 0.07, Y - 0.04, 0.05, 0.08, 0, 0, Math.PI * 2); ctx.fillStyle = C.white; ctx.fill(); }
}

// ---------- The lost and found ----------
// The cage: x 1 to 7.6, y 40.6 to 46.4, 2.6 high, its door in the front
// (x 4 to 5.2, hinged at 4), with KEEP SHUT on a plate across it.
const CG = { x0: 1, y0: 40.6, x1: 7.6, y1: 46.4, h: 2.4, d0: 4.0, d1: 5.2 };
// The goose sits just behind the door, and stands up when it opens.
const GOOSE = [3.8, 45.5];
// The shelves along the back, with the decades on them, and the canoe on top.
function shelves(ctx) {
  const x0 = 1.3, x1 = 6.3, y0 = 40.75, y1 = 41.45;
  for (const x of [x0, x1 - 0.06]) box(ctx, x, y0, 0, 0.06, 0.06, 2.1, STEEL, { flat: true, lw: 0.02 });
  for (const z of [0.7, 1.4, 2.1]) box(ctx, x0, y0, z - 0.05, x1 - x0, y1 - y0, 0.05, STEEL, { flat: true, lw: 0.025 });
  // the bottom shelf: hat boxes, a boombox, a stack of videotapes
  cylinder(ctx, 1.9, 41.1, 0.7, 0.26, 0.26, C.lilac, { top: tint(C.lilac, 0.3) });
  cylinder(ctx, 1.9, 41.1, 0.96, 0.2, 0.2, C.mint, { top: tint(C.mint, 0.3) });
  box(ctx, 2.6, 40.85, 0.7, 1.0, 0.45, 0.4, C.ink, { dens: 0.2, lw: 0.03 });
  if (Q.detail) for (const sx of [2.85, 3.35]) { const [X, Y] = P(sx, 41.31, 0.88); ctx.beginPath(); ctx.ellipse(X, Y, 0.13, 0.13, 0, 0, Math.PI * 2); paint(ctx, C.grey, { lw: 0.02 }); }
  for (let i = 0; i < 4; i++) box(ctx, 4.1, 40.9, 0.7 + i * 0.09, 0.6, 0.38, 0.09, C.black, { flat: true, lw: 0.015 });
  // the middle: a lava lamp, a trophy, a bear
  box(ctx, 2.0, 40.95, 1.4, 0.3, 0.3, 0.12, C.grey, { flat: true, lw: 0.02 });
  const [lx, ly] = P(2.15, 41.1, 1.75);
  ctx.beginPath(); ctx.ellipse(lx, ly, 0.13, 0.26, 0, 0, Math.PI * 2); paint(ctx, C.purple, { lw: 0.03 });
  ctx.beginPath(); ctx.arc(lx - 0.02, ly - 0.08, 0.06, 0, Math.PI * 2); ctx.arc(lx + 0.03, ly + 0.1, 0.045, 0, Math.PI * 2); ctx.fillStyle = C.coral; ctx.fill();
  const [tx, ty] = P(3.4, 41.1, 1.4);
  ctx.beginPath(); ctx.moveTo(tx - 0.12, ty); ctx.lineTo(tx + 0.12, ty); ctx.lineTo(tx + 0.05, ty - 0.12); ctx.lineTo(tx + 0.16, ty - 0.4); ctx.lineTo(tx - 0.16, ty - 0.4); ctx.lineTo(tx - 0.05, ty - 0.12); ctx.closePath();
  paint(ctx, BRASS, { lw: 0.03 });
  const [bx, by] = P(4.9, 41.1, 1.4);
  for (const [dx, dy, r] of [[0, -0.2, 0.2], [0, -0.48, 0.14], [-0.12, -0.6, 0.06], [0.12, -0.6, 0.06]]) { ctx.beginPath(); ctx.arc(bx + dx, by + dy, r, 0, Math.PI * 2); paint(ctx, C.brown, { lw: 0.025 }); }
  // the canoe, on top
  const w = (x) => 0.38 * Math.sin((Math.PI * (x - 1.3)) / 5);
  const rise = (x) => 0.14 * (1 - Math.sin((Math.PI * (x - 1.3)) / 5));
  const xs = [];
  for (let x = 1.3; x <= 6.31; x += 0.25) xs.push(x);
  const gun = xs.map((x) => [x, 41.1 + w(x), 2.42 + rise(x)]);
  const keel = xs.map((x) => [x, 41.1 + w(x) * 0.35, 2.12 + rise(x) * 0.8]).reverse();
  poly(ctx, [...xs.map((x) => [x, 41.1 - w(x), 2.42 + rise(x)]), ...gun.slice().reverse()]);
  paint(ctx, C.woodLight, { lw: 0.03 });
  poly(ctx, [...gun, ...keel]);
  paint(ctx, C.red, { dots: shade(C.red, 0.4), density: 0.15, lw: 0.035 });
  if (Q.detail) {
    ctx.beginPath();
    for (const x of [2.8, 4.8]) line2(ctx, [x, 41.1 - w(x), 2.42], [x, 41.1 + w(x), 2.42]);
    ctx.strokeStyle = C.wood; ctx.lineWidth = 0.05; ctx.stroke();
  }
  for (const x of [x0, x1 - 0.06]) box(ctx, x, y1 - 0.06, 0, 0.06, 0.06, 2.1, STEEL, { flat: true, lw: 0.02 });
}
// A cello, leaning on the cage's side.
function cello(ctx, x, y, z) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y); ctx.rotate(-0.12);
  ctx.beginPath();
  ctx.moveTo(0, -0.02);
  ctx.bezierCurveTo(0.38, -0.02, 0.38, -0.48, 0.17, -0.56);
  ctx.bezierCurveTo(0.3, -0.64, 0.3, -1.04, 0, -1.04);
  ctx.bezierCurveTo(-0.3, -1.04, -0.3, -0.64, -0.17, -0.56);
  ctx.bezierCurveTo(-0.38, -0.48, -0.38, -0.02, 0, -0.02);
  paint(ctx, C.brown, { dots: shade(C.brown, 0.4), density: 0.15, lw: 0.035 });
  ctx.beginPath(); ctx.rect(-0.045, -1.75, 0.09, 0.85);
  paint(ctx, C.black, { lw: 0.02 });
  ctx.beginPath(); ctx.arc(0, -1.8, 0.07, 0, Math.PI * 2); paint(ctx, C.black, { lw: 0.02 });
  if (Q.detail) {
    ctx.beginPath();
    for (const s of [-0.1, 0.1]) { ctx.moveTo(s, -0.5); ctx.quadraticCurveTo(s * 1.4, -0.42, s, -0.32); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.stroke();
    ctx.beginPath(); for (const s of [-0.03, 0, 0.03]) { ctx.moveTo(s, -0.2); ctx.lineTo(s, -1.7); }
    ctx.strokeStyle = alpha(C.white, 0.6); ctx.lineWidth = 0.008; ctx.stroke();
  }
  ctx.restore();
}
// The wedding cake: three tiers, the couple on top, older than some of the staff.
function cake(ctx, x, y, z) {
  box(ctx, x - 0.42, y - 0.32, z, 0.84, 0.64, 0.5, C.woodLight, { dens: 0.14, lw: 0.03 });
  let zz = z + 0.5;
  for (const [r, h] of [[0.38, 0.22], [0.28, 0.2], [0.18, 0.18]]) {
    cylinder(ctx, x, y, zz, r, h, C.white, { side: mix(C.white, C.blush, 0.3), flat: true });
    if (Q.detail) {
      ctx.fillStyle = C.pink;
      for (let i = 0; i < 6; i++) { const a = (i / 5) * Math.PI; const [px, py] = P(x + Math.cos(a) * r, y + Math.sin(a) * r, zz + h); ctx.beginPath(); ctx.arc(px, py, 0.03, 0, Math.PI * 2); ctx.fill(); }
    }
    zz += h;
  }
  const [X, Y] = P(x, y, zz);
  ctx.fillStyle = C.ink; ctx.fillRect(X - 0.09, Y - 0.2, 0.06, 0.18);
  ctx.fillStyle = C.white; ctx.fillRect(X + 0.02, Y - 0.2, 0.07, 0.18);
  ctx.beginPath(); ctx.arc(X - 0.06, Y - 0.24, 0.04, 0, Math.PI * 2); ctx.arc(X + 0.055, Y - 0.24, 0.04, 0, Math.PI * 2); ctx.fillStyle = C.blush; ctx.fill();
}
// Old suitcases with straps and labels from places that have changed names.
function oldCases(ctx, x, y) {
  box(ctx, x - 0.5, y - 0.35, 0, 1.0, 0.7, 0.32, C.brown, { dens: 0.2, lw: 0.03 });
  box(ctx, x - 0.42, y - 0.3, 0.32, 0.86, 0.6, 0.28, C.wood, { dens: 0.18, lw: 0.03 });
  box(ctx, x - 0.36, y - 0.25, 0.6, 0.72, 0.5, 0.26, INK.cranberry, { dens: 0.18, lw: 0.03 });
  if (!Q.detail) return;
  for (const [u, z0, z1, yy] of [[-0.2, 0, 0.32, y + 0.351], [0.2, 0, 0.32, y + 0.351], [-0.15, 0.32, 0.6, y + 0.301], [0.15, 0.6, 0.86, y + 0.251]]) {
    face(ctx, [[x + u, yy, z0], [x + u + 0.05, yy, z0], [x + u + 0.05, yy, z1], [x + u, yy, z1]], C.ink, { stroke: false });
  }
  face(ctx, [[x + 0.05, y + 0.303, 0.38], [x + 0.3, y + 0.303, 0.38], [x + 0.3, y + 0.303, 0.54], [x + 0.05, y + 0.303, 0.54]], C.butter, { lw: 0.015 });
}
function bowlingBall(ctx, x, y) {
  const [X, Y] = P(x, y, 0.24);
  ctx.beginPath(); ctx.arc(X, Y, 0.27, 0, Math.PI * 2);
  paint(ctx, C.purple, { dots: shade(C.purple, 0.5), density: 0.2, lw: 0.035 });
  ctx.fillStyle = C.ink;
  for (const [dx, dy] of [[-0.07, -0.1], [0.04, -0.13], [-0.01, -0.01]]) { ctx.beginPath(); ctx.arc(X + dx, Y + dy, 0.035, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(X - 0.12, Y - 0.12, 0.05, 0.03, -0.6, 0, Math.PI * 2); ctx.fillStyle = alpha(C.white, 0.6); ctx.fill();
}
function umbrellas(ctx, x, y) {
  cylinder(ctx, x, y, 0, 0.26, 0.6, C.grey, { top: shade(C.grey, 0.3) });
  ctx.lineCap = 'round';
  for (const [dx, dy, h, col] of [[-0.08, 0, 1.25, C.coral], [0.06, -0.06, 1.35, C.navy], [0.05, 0.08, 1.15, C.green], [-0.04, -0.1, 1.45, C.black]]) {
    const a = P(x + dx, y + dy, 0.55), b = P(x + dx * 1.6, y + dy * 1.6, h);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.quadraticCurveTo(b[0] + 0.12, b[1] - 0.12, b[0] + 0.14, b[1] + 0.02);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.08; ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 0.045; ctx.stroke();
  }
}
function gnome(ctx, x, y) {
  const [X, Y] = P(x, y, 0);
  ctx.beginPath(); ctx.moveTo(X - 0.18, Y); ctx.lineTo(X + 0.18, Y); ctx.lineTo(X + 0.12, Y - 0.32); ctx.lineTo(X - 0.12, Y - 0.32); ctx.closePath();
  paint(ctx, C.navy, { lw: 0.03 });
  ctx.beginPath(); ctx.moveTo(X - 0.12, Y - 0.3); ctx.quadraticCurveTo(X, Y - 0.1, X + 0.12, Y - 0.3); ctx.lineTo(X + 0.08, Y - 0.42); ctx.lineTo(X - 0.08, Y - 0.42); ctx.closePath();
  paint(ctx, C.white, { lw: 0.02 });
  ctx.beginPath(); ctx.arc(X, Y - 0.44, 0.08, 0, Math.PI * 2); paint(ctx, C.blush, { lw: 0.02 });
  ctx.beginPath(); ctx.moveTo(X - 0.11, Y - 0.47); ctx.lineTo(X + 0.04, Y - 0.82); ctx.lineTo(X + 0.11, Y - 0.47); ctx.closePath();
  paint(ctx, C.red, { lw: 0.025 });
}
// A television with rabbit ears, and a box of odd socks.
function telly(ctx, x, y) {
  box(ctx, x - 0.4, y - 0.35, 0, 0.8, 0.7, 0.62, C.wood, { dens: 0.16, lw: 0.03 });
  face(ctx, [[x - 0.3, y + 0.354, 0.1], [x + 0.18, y + 0.354, 0.1], [x + 0.18, y + 0.354, 0.52], [x - 0.3, y + 0.354, 0.52]], mix(C.teal, C.ink, 0.5), { lw: 0.025 });
  const [X, Y] = P(x, y, 0.62);
  ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X - 0.25, Y - 0.45); ctx.moveTo(X, Y); ctx.lineTo(X + 0.2, Y - 0.48);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
}
function sockBox(ctx, x, y) {
  box(ctx, x - 0.35, y - 0.3, 0, 0.7, 0.6, 0.42, C.woodLight, { dens: 0.14, lw: 0.03 });
  lettering(ctx, 'x', x, y + 0.305, 0.22, 'ODD SOCKS', 0.08, C.ink);
  if (!Q.detail) return;
  for (const [dx, c] of [[-0.15, C.coral], [0.05, C.teal], [0.18, C.mustard]]) {
    const [X, Y] = P(x + dx, y, 0.42);
    ctx.beginPath(); ctx.moveTo(X, Y); ctx.quadraticCurveTo(X + 0.04, Y - 0.2, X + 0.12, Y - 0.22);
    ctx.lineCap = 'round'; ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.stroke(); ctx.strokeStyle = c; ctx.lineWidth = 0.065; ctx.stroke();
  }
}
// The goose's head over the door's plate, through the wire: its beak out
// through the mesh, now and then a silent honk. (While the door's shut.)
function gooseTell(ctx, t) {
  const [X, Y] = P(GOOSE[0], GOOSE[1], 0);
  const bob = Math.sin(t * 1.7) * 0.02;
  const hx = X - 0.28, hy = Y - 0.82 + bob;
  ctx.beginPath(); ctx.moveTo(X - 0.22, Y - 0.55); ctx.quadraticCurveTo(X - 0.3, Y - 0.68, hx, hy);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.2; ctx.lineCap = 'round'; ctx.stroke();
  ctx.strokeStyle = C.white; ctx.lineWidth = 0.13; ctx.stroke();
  ctx.beginPath(); ctx.arc(hx, hy, 0.12, 0, Math.PI * 2); paint(ctx, C.white);
  ctx.beginPath(); ctx.arc(hx - 0.03, hy - 0.03, 0.03, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
}
function gooseBeak(ctx, t) {
  const [X, Y] = P(GOOSE[0], GOOSE[1], 0);
  const bob = Math.sin(t * 1.7) * 0.02, honk = pulse(t, 7) > 0.88;
  const hx = X - 0.28, hy = Y - 0.82 + bob;
  ctx.beginPath();
  if (honk) {
    ctx.moveTo(hx - 0.08, hy - 0.04); ctx.lineTo(hx - 0.36, hy - 0.14); ctx.lineTo(hx - 0.1, hy);
    ctx.moveTo(hx - 0.08, hy + 0.03); ctx.lineTo(hx - 0.34, hy + 0.1); ctx.lineTo(hx - 0.08, hy + 0.06);
  } else {
    ctx.moveTo(hx - 0.08, hy - 0.05); ctx.lineTo(hx - 0.34, hy + 0.01); ctx.lineTo(hx - 0.08, hy + 0.06);
  }
  paint(ctx, C.coral, { lw: 0.04 });
}
// The door: a wire gate with its plate, swung out k of the way.
function cageDoor(ctx, t, k) {
  const { y1, h, d0, d1 } = CG, W = d1 - d0, a = k * Math.PI * 0.48;
  const ex = d0 + W * Math.cos(a), ey = y1 + W * Math.sin(a);
  if (k < 0.5) gooseTell(ctx, t);
  wirePanel(ctx, d0, y1, ex, ey, 0.05, h - 0.05, { frame: 0.06 });
  // the plate, KEEP SHUT on the front of it
  const p = (u, z) => [d0 + (ex - d0) * u, y1 + (ey - y1) * u + 0.005, z];
  face(ctx, [p(0.05, 0.38), p(0.95, 0.38), p(0.95, 1.28), p(0.05, 1.28)], k < 0.5 ? C.white : STEEL, { lw: 0.03 });
  if (k < 0.05) {
    lettering(ctx, 'x', (d0 + d1) / 2, y1 + 0.01, 1.0, 'KEEP', 0.24, C.red, 'Bagel Fat One');
    lettering(ctx, 'x', (d0 + d1) / 2, y1 + 0.01, 0.68, 'SHUT', 0.24, C.red, 'Bagel Fat One');
  }
  if (k < 0.5) gooseBeak(ctx, t);
}

// ---------- The pets ----------
function dog(ctx, x, y, z) {
  const [X, Y] = P(x, y, z);
  ctx.beginPath(); ctx.ellipse(X + 0.12, Y - 0.22, 0.5, 0.22, 0, 0, Math.PI * 2);
  paint(ctx, FUR, { dots: shade(FUR, 0.3), density: 0.12, lw: 0.035 });
  ctx.beginPath(); ctx.ellipse(X - 0.5, Y - 0.06, 0.16, 0.06, 0, 0, Math.PI * 2); paint(ctx, tint(FUR, 0.15), { lw: 0.03 });
  ctx.beginPath(); ctx.arc(X - 0.4, Y - 0.27, 0.18, 0, Math.PI * 2); paint(ctx, FUR, { lw: 0.035 });
  ctx.beginPath(); ctx.ellipse(X - 0.58, Y - 0.19, 0.1, 0.07, 0, 0, Math.PI * 2); paint(ctx, tint(FUR, 0.25), { lw: 0.03 });
  ctx.beginPath(); ctx.ellipse(X - 0.31, Y - 0.25, 0.07, 0.13, 0.4, 0, Math.PI * 2); paint(ctx, shade(FUR, 0.25), { lw: 0.025 });
  ctx.fillStyle = C.ink;
  ctx.beginPath(); ctx.arc(X - 0.67, Y - 0.21, 0.035, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(X - 0.47, Y - 0.32, 0.025, 0, Math.PI * 2); ctx.fill();
}
const DOG = [1.85, 36.15, 0.13], DOGS = 1.3;
function dogCrate(ctx) {
  const x0 = 0.7, y0 = 35.0, x1 = 2.9, y1 = 36.9, h = 1.25;
  box(ctx, x0, y0, 0, x1 - x0, y1 - y0, 0.12, mix(C.grey, C.ink, 0.25), { flat: true, lw: 0.03 });
  wirePanel(ctx, x0, y0, x0, y1, 0.12, h, { frame: 0.05 });
  wirePanel(ctx, x0, y0, x1, y0, 0.12, h, { frame: 0.05 });
  rect(ctx, x0 + 0.15, y0 + 0.15, x1 - x0 - 0.3, y1 - y0 - 0.3, 0.125, C.sky, { dots: tint(C.sky, 0.5), density: 0.3, lw: 0.02 });
  const [X, Y] = P(...DOG);
  ctx.save(); ctx.translate(X, Y); ctx.scale(DOGS, DOGS); ctx.translate(-X, -Y);
  dog(ctx, ...DOG);
  ctx.restore();
  wireTop(ctx, x0, y0, x1, y1, h);
  wirePanel(ctx, x0, y1, x1, y1, 0.12, h, { frame: 0.05 });
  wirePanel(ctx, x1, y0, x1, y1, 0.12, h, { frame: 0.05 });
  face(ctx, [[x1 + 0.01, y0 + 0.15, 0.85], [x1 + 0.01, y0 + 0.75, 0.85], [x1 + 0.01, y0 + 0.75, 1.05], [x1 + 0.01, y0 + 0.15, 1.05]], C.red, { lw: 0.015 });
  lettering(ctx, 'y', x1 + 0.015, y0 + 0.45, 0.95, 'LIVE ANIMAL', 0.07, C.white);
}
function wag(ctx, t) {
  const [X, Y] = P(...DOG);
  const w = Math.sin(t * 10) * 0.45;
  const ax = X + 0.6 * DOGS, ay = Y - 0.26 * DOGS, l = 0.34 * DOGS;
  ctx.beginPath(); ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo(ax + 0.2, ay - 0.05, ax + l * Math.cos(w - 0.7), ay + l * Math.sin(w - 0.7));
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.15; ctx.stroke();
  ctx.strokeStyle = FUR; ctx.lineWidth = 0.09; ctx.stroke();
}
// A ginger tom, back up, on top of his crate.
function cat(ctx, x, y, z, t) {
  const [X, Y] = P(x, y, z);
  const fur = INK.safety, puff = 1 + Math.sin(t * 9) * 0.03;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const lx of [-0.24, -0.14, 0.14, 0.24]) { ctx.moveTo(X + lx, Y - 0.22); ctx.lineTo(X + lx * 1.05, Y); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.stroke();
  ctx.strokeStyle = fur; ctx.lineWidth = 0.06; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(X - 0.26, Y - 0.12); ctx.quadraticCurveTo(X - 0.42, Y - 0.5, X - 0.5, Y - 0.78);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.17; ctx.stroke();
  ctx.strokeStyle = fur; ctx.lineWidth = 0.12; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(X - 0.3, Y - 0.16);
  ctx.bezierCurveTo(X - 0.3, Y - 0.6 * puff, X + 0.26, Y - 0.6 * puff, X + 0.3, Y - 0.16);
  ctx.quadraticCurveTo(X, Y - 0.3, X - 0.3, Y - 0.16);
  paint(ctx, fur, { lw: 0.035 });
  if (Q.detail) {
    ctx.beginPath();
    for (const d of [-0.14, 0, 0.14]) { ctx.moveTo(X + d - 0.03, Y - 0.5); ctx.lineTo(X + d + 0.02, Y - 0.36); }
    ctx.strokeStyle = shade(fur, 0.4); ctx.lineWidth = 0.035; ctx.stroke();
  }
  const hx = X + 0.36, hy = Y - 0.36;
  ctx.beginPath(); ctx.moveTo(hx - 0.12, hy - 0.06); ctx.lineTo(hx - 0.1, hy - 0.24); ctx.lineTo(hx - 0.01, hy - 0.11);
  ctx.lineTo(hx + 0.05, hy - 0.24); ctx.lineTo(hx + 0.1, hy - 0.05); ctx.closePath();
  paint(ctx, fur, { lw: 0.025 });
  ctx.beginPath(); ctx.arc(hx, hy, 0.13, 0, Math.PI * 2); paint(ctx, fur, { lw: 0.03 });
  ctx.fillStyle = C.ink;
  for (const ex of [-0.05, 0.05]) { ctx.beginPath(); ctx.ellipse(hx + ex, hy - 0.02, 0.02, 0.035, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(hx, hy + 0.06, 0.04, 0.03, 0, 0, Math.PI * 2); ctx.fillStyle = C.pink; ctx.fill();
}
// The cat's carrier: hissing, rocking, two eyes in the dark behind its door,
// until the door's opened and the cat's on top of it. k: the door.
function catCrate(ctx, t, k) {
  const x0 = 3.8, y0 = 35.8, x1 = 5.4, y1 = 37.0;
  const s = ((t % 5) + 5) % 5, rock = k < 0.3 && s < 0.7 ? Math.sin(s * 28) * 0.035 * (1 - s / 0.7) : 0;
  const [cx, cy] = P((x0 + x1) / 2, y1, 0);
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(rock); ctx.translate(-cx, -cy);
  box(ctx, x0, y0, 0, x1 - x0, y1 - y0, 0.48, C.grey, { dens: 0.18, lw: 0.035 });
  box(ctx, x0 + 0.03, y0 + 0.03, 0.48, x1 - x0 - 0.06, y1 - y0 - 0.06, 0.42, INK.cranberry, { top: tint(INK.cranberry, 0.12), dens: 0.16, lw: 0.035 });
  const [hx, hy] = P((x0 + x1) / 2, (y0 + y1) / 2, 0.9);
  ctx.beginPath(); ctx.moveTo(hx - 0.3, hy); ctx.quadraticCurveTo(hx, hy - 0.3, hx + 0.3, hy);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.09; ctx.stroke();
  ctx.strokeStyle = C.grey; ctx.lineWidth = 0.05; ctx.stroke();
  // the doorway, dark inside, and two eyes in it
  const dx0 = x0 + 0.3, dx1 = x1 - 0.3, z0 = 0.12, z1 = 0.78;
  face(ctx, [[dx0, y1 + 0.004, z0], [dx1, y1 + 0.004, z0], [dx1, y1 + 0.004, z1], [dx0, y1 + 0.004, z1]], C.night, { lw: 0.03 });
  if (k < 0.5 && pulse(t, 3.1) < 0.94) {
    ctx.fillStyle = INK.signal;
    for (const ex of [4.48, 4.72]) { const [X, Y] = P(ex, y1, 0.48); ctx.beginPath(); ctx.ellipse(X, Y, 0.05, 0.04, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = C.ink;
    for (const ex of [4.48, 4.72]) { const [X, Y] = P(ex, y1, 0.48); ctx.fillRect(X - 0.008, Y - 0.035, 0.016, 0.07); }
  }
  // the grille, swung open on its hinge (the left side)
  const W = dx1 - dx0, a = k * Math.PI * 0.45, ex = dx0 + W * Math.cos(a), ey = y1 + W * Math.sin(a);
  wirePanel(ctx, dx0, y1 + 0.01, ex, ey + 0.01, z0, z1, { frame: 0.04 });
  if (Q.detail && k < 0.05) lettering(ctx, 'y', x1 + 0.005, (y0 + y1) / 2, 0.3, 'LIVE ANIMAL', 0.07, C.white);
  ctx.restore();
  if (k > 0.5) cat(ctx, 4.6, 36.4, 0.9, t);
}
function parrotCage(ctx) {
  box(ctx, 1.05, 30.45, 0, 1.1, 1.1, 0.75, C.woodLight, { dens: 0.14, lw: 0.03 });
  const x = 1.6, y = 31.0, z0 = 0.75, r = 0.42;
  const bars = (front) => {
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      if ((c + s > 0) !== front) continue;
      const b = P(x + c * r, y + s * r, z0), m = P(x + c * r, y + s * r, z0 + 0.7), top = P(x, y, z0 + 1.05);
      ctx.moveTo(b[0], b[1]); ctx.lineTo(m[0], m[1]); ctx.quadraticCurveTo(m[0], top[1], top[0], top[1]);
    }
    ctx.strokeStyle = shade(BRASS, 0.2); ctx.lineWidth = 0.025; ctx.stroke();
  };
  rect(ctx, x - r, y - r, 2 * r, 2 * r, z0 + 0.005, shade(BRASS, 0.1), { lw: 0.025 });
  bars(false);
  const [X, Y] = P(x, y, z0 + 0.32);
  ctx.beginPath(); ctx.moveTo(X - 0.26, Y + 0.02); ctx.lineTo(X + 0.26, Y + 0.02); ctx.strokeStyle = C.brown; ctx.lineWidth = 0.04; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(X, Y - 0.17, 0.12, 0.19, 0.15, 0, Math.PI * 2); paint(ctx, C.green, { lw: 0.03 });
  ctx.beginPath(); ctx.moveTo(X - 0.06, Y - 0.02); ctx.lineTo(X - 0.13, Y + 0.2); ctx.lineTo(X - 0.01, Y + 0.02); paint(ctx, C.teal, { lw: 0.02 });
  ctx.beginPath(); ctx.arc(X + 0.04, Y - 0.4, 0.1, 0, Math.PI * 2); paint(ctx, C.red, { lw: 0.03 });
  ctx.beginPath(); ctx.moveTo(X + 0.12, Y - 0.44); ctx.quadraticCurveTo(X + 0.22, Y - 0.41, X + 0.13, Y - 0.34); paint(ctx, C.butter, { lw: 0.02 });
  ctx.beginPath(); ctx.arc(X + 0.06, Y - 0.43, 0.022, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
  bars(true);
  const ring = P(x, y, z0 + 1.05);
  ctx.beginPath(); ctx.arc(ring[0], ring[1] - 0.07, 0.07, 0, Math.PI * 2); ctx.strokeStyle = shade(BRASS, 0.2); ctx.lineWidth = 0.03; ctx.stroke();
}

// ---------- The rest of the room ----------
// The FRAGILE dolly: no roof (so the bags can come in by air), a heap of
// what's landed so far, and its sign.
function dolly(ctx, x, y) {
  for (const u of [-0.75, 0.75]) for (const v of [-0.48, 0.48]) box(ctx, x + u - 0.12, y + v - 0.07, 0, 0.24, 0.14, 0.24, C.ink, { flat: true, lw: 0.02 });
  box(ctx, x - 1.05, y - 0.58, 0.2, 2.1, 1.16, 0.14, RAMP.cart, { flat: true, lw: 0.035 });
  box(ctx, x + 1.05, y - 0.04, 0.22, 0.3, 0.08, 0.05, C.grey, { flat: true, stroke: false });
  box(ctx, x - 1.05, y - 0.6, 0.34, 2.1, 0.06, 0.3, shade(RAMP.cart, 0.1), { flat: true, lw: 0.025 });
  box(ctx, x - 1.05, y - 0.6, 0.34, 0.06, 1.2, 0.3, shade(RAMP.cart, 0.1), { flat: true, lw: 0.025 });
  // the heap: everything that came over before this one, a little flatter than it went in
  bag(ctx, x - 0.55, y - 0.22, 0.34, { kind: 'case', color: C.navy, lie: true, along: 'x' });
  bag(ctx, x + 0.45, y - 0.18, 0.34, { kind: 'duffel', color: C.ink });
  bag(ctx, x - 0.1, y + 0.2, 0.34, { kind: 'case', color: C.grey, lie: true, along: 'x' });
  bag(ctx, x + 0.62, y + 0.24, 0.34, { kind: 'box' });
  bag(ctx, x - 0.62, y + 0.26, 0.34, { kind: 'case', color: C.teal, lie: true, along: 'y' });
  if (Q.detail) {
    // a sleeve out of a burst one
    const [sx, sy] = P(x - 0.15, y + 0.44, 0.5);
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + 0.05, sy + 0.2, sx - 0.06, sy + 0.32);
    ctx.lineCap = 'round'; ctx.strokeStyle = C.ink; ctx.lineWidth = 0.11; ctx.stroke(); ctx.strokeStyle = C.coral; ctx.lineWidth = 0.07; ctx.stroke();
  }
  // its sign, on the far end
  box(ctx, x + 1.0, y - 0.04, 0.34, 0.06, 0.06, 0.8, C.ink, { flat: true, stroke: false });
  sign(ctx, 'y', x + 1.03, y, 1.32, 1.1, 0.5, null, { board: C.white, edge: 0.03 });
  lettering(ctx, 'y', x + 1.04, y, 1.42, 'HANDLE', 0.14, C.red, 'Bagel Fat One');
  lettering(ctx, 'y', x + 1.04, y, 1.22, 'WITH CARE', 0.12, C.red, 'Bagel Fat One');
}
// A sandwich board: NO THROWING, with a bag-shaped dent in it.
function noThrowing(ctx, x, y) {
  const w = 0.95, h = 1.0, s = 0.2;
  face(ctx, [[x - w / 2, y - s, 0], [x + w / 2, y - s, 0], [x + w / 2, y, h], [x - w / 2, y, h]], shade(C.white, 0.12), { lw: 0.03 });
  face(ctx, [[x - w / 2, y + s, 0], [x + w / 2, y + s, 0], [x + w / 2, y, h], [x - w / 2, y, h]], C.white, { lw: 0.035 });
  face(ctx, [[x - w / 2 + 0.06, y + s - 0.012, 0.05], [x + w / 2 - 0.06, y + s - 0.012, 0.05], [x + w / 2 - 0.06, y + 0.006, h - 0.06], [x - w / 2 + 0.06, y + 0.006, h - 0.06]], null, { stroke: C.red, lw: 0.035 });
  lettering(ctx, 'x', x, y + 0.11, 0.68, 'NO', 0.22, C.red, 'Bagel Fat One');
  lettering(ctx, 'x', x, y + 0.14, 0.44, 'THROWING', 0.12, C.red, 'Bagel Fat One');
  if (Q.detail) {
    const [X, Y] = P(x + 0.2, y + 0.16, 0.26);
    ctx.beginPath(); ctx.roundRect(X - 0.12, Y - 0.1, 0.24, 0.16, 0.04);
    ctx.strokeStyle = alpha(C.ink, 0.5); ctx.lineWidth = 0.02; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X - 0.12, Y - 0.1); ctx.lineTo(X - 0.06, Y - 0.04); ctx.moveTo(X + 0.12, Y + 0.06); ctx.lineTo(X + 0.05, Y + 0.01); ctx.stroke();
  }
}
// The claims desk by the cage.
function claimsDesk(ctx) {
  box(ctx, 8.0, 43.3, 0, 1.8, 0.8, 1.0, C.wood, { top: C.woodLight, dens: 0.16 });
  lettering(ctx, 'x', 8.9, 44.11, 0.6, 'CLAIMS', 0.24, C.white, 'Bagel Fat One');
  box(ctx, 8.25, 43.45, 1.0, 0.55, 0.42, 0.06, INK.cranberry, { flat: true, lw: 0.02 });
  const [X, Y] = P(9.4, 43.65, 1.0);
  ctx.beginPath(); ctx.ellipse(X, Y, 0.12, 0.05, 0, 0, Math.PI * 2); paint(ctx, shade(BRASS, 0.2), { lw: 0.02 });
  ctx.beginPath(); ctx.arc(X, Y - 0.02, 0.09, Math.PI, 0); ctx.closePath(); paint(ctx, BRASS, { lw: 0.025 });
  ctx.beginPath(); ctx.arc(X, Y - 0.13, 0.025, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
}
// The sorting bench on the island, its terminal saying what it always says.
function sortBench(ctx) {
  table(ctx, 7.4, 35.0, 2.4, 0.8, 1.0, STEEL);
  box(ctx, 7.7, 35.15, 1.0, 0.6, 0.12, 0.45, C.ink, { flat: true, lw: 0.025 });
  face(ctx, [[7.74, 35.276, 1.05], [8.26, 35.276, 1.05], [8.26, 35.276, 1.41], [7.74, 35.276, 1.41]], C.navy, { lw: 0.015 });
  lettering(ctx, 'x', 8.0, 35.28, 1.23, 'ERR', 0.13, C.red);
  box(ctx, 8.7, 35.25, 1.0, 0.5, 0.35, 0.12, C.white, { flat: true, lw: 0.02 });
  for (let i = 0; i < 3; i++) box(ctx, 9.35 + i * 0.05, 35.3, 1.0 + i * 0.02, 0.3, 0.2, 0.02, INK.safety, { flat: true, lw: 0.012 });
}
// The RUSH bin: a big wheeled bin of bags tagged RUSH, going nowhere.
function rushBin(ctx) {
  const x0 = 11.3, y0 = 36.5, w = 1.3, d = 0.9;
  for (const [u, v] of [[0.15, 0.15], [w - 0.15, 0.15], [0.15, d - 0.15], [w - 0.15, d - 0.15]]) box(ctx, x0 + u - 0.07, y0 + v - 0.07, 0, 0.14, 0.14, 0.15, C.ink, { flat: true, stroke: false });
  box(ctx, x0, y0, 0.15, w, d, 0.75, C.grey, { top: shade(C.grey, 0.35), dens: 0.18, lw: 0.035 });
  bag(ctx, x0 + 0.4, y0 + 0.4, 0.75, { kind: 'duffel', color: C.purple, tag: INK.safety });
  bag(ctx, x0 + 0.9, y0 + 0.45, 0.72, { kind: 'case', color: C.navy, lie: true, tag: INK.safety });
  lettering(ctx, 'x', x0 + w / 2, y0 + d + 0.005, 0.52, 'RUSH', 0.26, C.red, 'Bagel Fat One');
}
// The bag hospital: a bench where what the belts burst gets taped up.
function hospital(ctx) {
  const x0 = 26.2, y0 = 39.6, w = 3.0, d = 0.8;
  box(ctx, x0, y0, 0, w, d, 0.95, C.white, { top: STEEL, dens: 0.12 });
  face(ctx, [[x0 + 0.2, y0 + d + 0.005, 0.35], [x0 + 0.5, y0 + d + 0.005, 0.35], [x0 + 0.5, y0 + d + 0.005, 0.65], [x0 + 0.2, y0 + d + 0.005, 0.65]], C.red, { stroke: false });
  face(ctx, [[x0 + 0.08, y0 + d + 0.006, 0.45], [x0 + 0.62, y0 + d + 0.006, 0.45], [x0 + 0.62, y0 + d + 0.006, 0.55], [x0 + 0.08, y0 + d + 0.006, 0.55]], C.red, { stroke: false });
  lettering(ctx, 'x', x0 + 1.75, y0 + d + 0.005, 0.5, 'BAG HOSPITAL', 0.2, C.red, 'Bagel Fat One');
  // a burst case taped round three times, its shirt still out
  bag(ctx, x0 + 0.85, y0 + 0.4, 0.95, { kind: 'case', color: C.teal, lie: true, along: 'x', s: 1.25, tag: false });
  if (Q.detail) {
    for (const u of [-0.22, 0, 0.22]) box(ctx, x0 + 0.85 + u - 0.04, y0 + 0.1, 0.95, 0.08, 0.6, 0.34, alpha(STEEL, 0.95), { flat: true, lw: 0.012 });
    const [sx, sy] = P(x0 + 1.2, y0 + 0.75, 1.1);
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + 0.15, sy + 0.25, sx + 0.05, sy + 0.42);
    ctx.lineCap = 'round'; ctx.strokeStyle = C.ink; ctx.lineWidth = 0.13; ctx.stroke(); ctx.strokeStyle = C.mustard; ctx.lineWidth = 0.09; ctx.stroke();
  }
  // a duffel with a plaster on it, and the tape
  bag(ctx, x0 + 2.2, y0 + 0.4, 0.95, { kind: 'duffel', color: C.purple, tag: false });
  if (Q.detail) {
    face(ctx, [[x0 + 2.0, y0 + 0.596, 1.08], [x0 + 2.4, y0 + 0.596, 1.18], [x0 + 2.4, y0 + 0.596, 1.08], [x0 + 2.0, y0 + 0.596, 0.98]], C.blush, { lw: 0.015 });
    face(ctx, [[x0 + 2.0, y0 + 0.597, 1.18], [x0 + 2.4, y0 + 0.597, 1.08], [x0 + 2.4, y0 + 0.597, 0.98], [x0 + 2.0, y0 + 0.597, 1.08]], C.blush, { lw: 0.015 });
  }
  const [rx, ry] = P(x0 + 1.6, y0 + 0.3, 0.95);
  for (const [dx, dy] of [[0, 0], [0.1, -0.08]]) { ctx.beginPath(); ctx.ellipse(rx + dx, ry + dy - 0.05, 0.1, 0.06, 0, 0, Math.PI * 2); paint(ctx, STEEL, { lw: 0.025 }); }
}
// The kitchenette at the back: a microwave, the coffee, a box of donuts.
function kitchenette(ctx) {
  box(ctx, 3.0, 30.3, 0, 3.4, 0.8, 0.95, C.white, { top: C.woodLight, dens: 0.12 });
  box(ctx, 3.15, 30.4, 0.95, 0.8, 0.55, 0.45, C.white, { lw: 0.03 });
  face(ctx, [[3.22, 30.951, 1.02], [3.7, 30.951, 1.02], [3.7, 30.951, 1.33], [3.22, 30.951, 1.33]], C.ink, { lw: 0.015 });
  box(ctx, 4.2, 30.45, 0.95, 0.42, 0.42, 0.55, C.ink, { lw: 0.03 });
  cylinder(ctx, 4.41, 30.75, 0.98, 0.13, 0.22, alpha(C.brown, 0.85), { flat: true });
  box(ctx, 4.95, 30.4, 0.95, 1.1, 0.6, 0.18, C.blush, { top: C.white, lw: 0.03 });
  if (Q.detail) for (const [dx, dy, c] of [[0.25, 0.2, C.pink], [0.55, 0.2, C.brown], [0.85, 0.22, C.butter], [0.4, 0.42, C.brown]]) {
    const [X, Y] = P(4.95 + dx, 30.4 + dy, 1.14);
    ctx.beginPath(); ctx.ellipse(X, Y, 0.11, 0.06, 0, 0, Math.PI * 2); paint(ctx, c, { lw: 0.02 });
    ctx.beginPath(); ctx.ellipse(X, Y, 0.035, 0.02, 0, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
  }
}
// The cola machine.
function colaMachine(ctx) {
  const x0 = 18.0, y0 = 30.3, w = 1.0, d = 0.8, h = 2.1;
  box(ctx, x0, y0, 0, w, d, h, BRAND.can, { dens: 0.16 });
  face(ctx, [[x0 + 0.1, y0 + d + 0.004, 0.9], [x0 + 0.62, y0 + d + 0.004, 0.9], [x0 + 0.62, y0 + d + 0.004, 1.85], [x0 + 0.1, y0 + d + 0.004, 1.85]], alpha(C.sky, 0.85), { lw: 0.025 });
  if (Q.detail) for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) face(ctx, [[x0 + 0.16 + c * 0.15, y0 + d + 0.006, 1.0 + r * 0.22], [x0 + 0.24 + c * 0.15, y0 + d + 0.006, 1.0 + r * 0.22], [x0 + 0.24 + c * 0.15, y0 + d + 0.006, 1.14 + r * 0.22], [x0 + 0.16 + c * 0.15, y0 + d + 0.006, 1.14 + r * 0.22]], (r + c) % 2 ? C.red : C.white, { stroke: false });
  face(ctx, [[x0 + 0.7, y0 + d + 0.004, 1.2], [x0 + 0.9, y0 + d + 0.004, 1.2], [x0 + 0.9, y0 + d + 0.004, 1.6], [x0 + 0.7, y0 + d + 0.004, 1.6]], C.ink, { lw: 0.015 });
  face(ctx, [[x0 + 0.15, y0 + d + 0.004, 0.25], [x0 + 0.85, y0 + d + 0.004, 0.25], [x0 + 0.85, y0 + d + 0.004, 0.5], [x0 + 0.15, y0 + d + 0.004, 0.5]], C.ink, { lw: 0.015 });
  lettering(ctx, 'x', x0 + w / 2, y0 + d + 0.006, 0.68, 'GANDER', 0.15, BRAND.ink, 'Bagel Fat One');
  lettering(ctx, 'y', x0 + w + 0.006, y0 + d / 2, 1.5, 'COLA', 0.2, BRAND.ink, 'Bagel Fat One');
}
function lockers(ctx) {
  const x0 = 20.2, y0 = 30.3, d = 0.6, h = 1.7, col = mix(C.teal, C.grey, 0.45);
  box(ctx, x0, y0, 0, 3.2, d, h, col, { dens: 0.14 });
  if (!Q.detail) return;
  ctx.beginPath();
  for (let i = 1; i < 4; i++) line2(ctx, [x0 + i * 0.8, y0 + d + 0.004, 0.05], [x0 + i * 0.8, y0 + d + 0.004, h - 0.05]);
  for (let i = 0; i < 4; i++) for (const z of [1.35, 1.45]) line2(ctx, [x0 + 0.2 + i * 0.8, y0 + d + 0.004, z], [x0 + 0.6 + i * 0.8, y0 + d + 0.004, z]);
  ctx.strokeStyle = shade(col, 0.45); ctx.lineWidth = 0.025; ctx.stroke();
  face(ctx, [[x0 + 1.75, y0 + d + 0.005, 0.95], [x0 + 2.05, y0 + d + 0.005, 0.95], [x0 + 2.05, y0 + d + 0.005, 1.15], [x0 + 1.75, y0 + d + 0.005, 1.15]], C.butter, { lw: 0.012 });
}
// The station clock on the island, telling the airport's time.
function clockFace(ctx, x, y, z, t) {
  const r = 0.42, pts = [];
  for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; pts.push([x + Math.cos(a) * r, y, z + Math.sin(a) * r]); }
  poly(ctx, pts);
  paint(ctx, C.white, { lw: 0.06 });
  const h = hour(t), hand = (a, len, lw) => { line2(ctx, [x, y + 0.01, z], [x + Math.sin(a) * len, y + 0.01, z + Math.cos(a) * len]); ctx.lineWidth = lw; ctx.stroke(); };
  ctx.strokeStyle = C.ink; ctx.lineCap = 'round';
  if (Q.detail) {
    ctx.beginPath();
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; line2(ctx, [x + Math.sin(a) * r * 0.78, y + 0.01, z + Math.cos(a) * r * 0.78], [x + Math.sin(a) * r * 0.9, y + 0.01, z + Math.cos(a) * r * 0.9]); }
    ctx.lineWidth = 0.025; ctx.stroke();
  }
  ctx.beginPath(); hand(((h % 12) / 12) * Math.PI * 2, r * 0.5, 0.06);
  ctx.beginPath(); hand((h % 1) * Math.PI * 2, r * 0.78, 0.04);
}
// The pink bag's laps, counted from 4am; at midnight, one more.
const lapsAt = (t) => Math.floor((t * 1.1 + PINKAT - (LOOPBOX[2] - LOOPBOX[0])) / PERIM);
function lapBoard(ctx, t) {
  const x = 15, y = 35.7, z = 1.62;
  sign(ctx, 'x', x, y, z, 2.9, 0.72, null);
  const t0 = t - (((t % LOOP) + LOOP) % LOOP), h = hour(t);
  const late = h >= 23.8 || h < 0.7;
  lettering(ctx, 'x', x, y + 0.005, z + 0.17, 'PINK BAG', 0.17, PINK, 'Bagel Fat One');
  lettering(ctx, 'x', x, y + 0.005, z - 0.13, late ? 'ONE MORE LAP' : `LAP ${lapsAt(t) - lapsAt(t0) + 1}`, late ? 0.19 : 0.25, SIGN.ink, 'Bagel Fat One');
}

export default {
  id: 'bag-room',
  name: 'The Bag Room',
  blurb: 'Where your bag goes when you hand it over. One pink bag has been round the loop since breakfast.',
  describe: 'A room of belts under the terminal: bags come through flaps, jam at the merge and ride a loop while handlers sort and load them onto carts. A wire cage holds the lost and found. One pink bag circles all day; in the night\'s ground stop, so does a handler.',

  build(R) {
    // ---------- The floor, the seawall, the paint ----------
    R.floor((ctx) => {
      rect(ctx, 0, AIR, CHECK, FRONT - AIR, 0, FLOOR, { stroke: false });
      tiles(ctx, 4, alpha(C.ink, 0.08), 0.03, 0, AIR, CHECK, FRONT - AIR);
      // The seawall's face, where the light pier's water is in front: granite
      // blocks in two courses, their joints staggered.
      face(ctx, [[0, FRONT, 0], [SHORE, FRONT, 0], [SHORE, FRONT, -0.6], [0, FRONT, -0.6]], GRANITE, { dots: shade(GRANITE, 0.45), density: 0.22 });
      if (!Q.detail) return;
      ctx.beginPath();
      line2(ctx, [0, FRONT, -0.3], [SHORE, FRONT, -0.3]);
      for (let i = 0, x = 0.9; x < SHORE - 0.2; i++, x += 1.25) { const top = i % 2 ? -0.3 : 0; line2(ctx, [x, FRONT, top], [x, FRONT, top - 0.3]); }
      ctx.strokeStyle = alpha(C.ink, 0.5); ctx.lineWidth = 0.025; ctx.stroke();
    });
    R.rug((ctx) => {
      const [x0, y0, x1, y1] = LOOPBOX;
      // The island inside the loop: a steel deck, edged in yellow.
      rect(ctx, x0 + BW, y0 + BW, x1 - x0 - 2 * BW, y1 - y0 - 2 * BW, 0.004, PLATE, { stroke: false, dots: shade(PLATE, 0.25), density: 0.1 });
      face(ctx, [[x0 + BW + 0.1, y0 + BW + 0.1, 0.005], [x1 - BW - 0.1, y0 + BW + 0.1, 0.005], [x1 - BW - 0.1, y1 - BW - 0.1, 0.005], [x0 + BW + 0.1, y1 - BW - 0.1, 0.005]], null, { stroke: INK.signal, lw: 0.12 });
      // The walkway round the loop.
      face(ctx, [[4.65, 32.25, 0.005], [25.35, 32.25, 0.005], [25.35, 40.75, 0.005], [4.65, 40.75, 0.005]], null, { stroke: INK.signal, lw: 0.1 });
      // KEEP CLEAR at the merge (the supervisor stands in it).
      hatch(ctx, 27.1, 33.3, 29.3, 35.2, INK.signal);
      // The service road: two lanes, out (y 47.2) and back (y 45.9), round
      // the end at x 14 and out through the door onto the apron. The bag
      // train parks on it overnight, its tug at x 24.
      rect(ctx, 12.8, LANES[0], CHECK - 12.8, LANES[1] - LANES[0], 0.004, TONE.road, { stroke: false });
      for (let x = 13.0; x < CHECK - 0.3; x += 1.2) for (const y of [LANES[0] + 0.04, LANES[1] - 0.12]) rect(ctx, x, y, 0.6, 0.08, 0.006, INK.signal, { stroke: false });
      for (let x = 15.4; x < CHECK - 0.3; x += 1.2) rect(ctx, x, 46.51, 0.5, 0.07, 0.006, alpha(C.white, 0.7), { stroke: false });
      for (const x of [25.6, 28.6]) face(ctx, [[x, 47.2 - 0.3, 0.006], [x + 0.7, 47.2, 0.006], [x, 47.2 + 0.3, 0.006]], alpha(C.white, 0.8), { stroke: false });
      for (const x of [20.2, 26.2]) face(ctx, [[x + 0.7, 45.9 - 0.3, 0.006], [x, 45.9, 0.006], [x + 0.7, 45.9 + 0.3, 0.006]], alpha(C.white, 0.8), { stroke: false });
      if (Q.detail) paintText(ctx, 'floor', 27.4, 47.2, 'TO PLANES', 0.36, alpha(C.white, 0.75));
      // The pets' mat, with paw prints walking off it.
      rect(ctx, 0.5, 34.6, 5.2, 3.0, 0.004, alpha(C.teal, 0.22), { stroke: false });
      if (!Q.detail) return;
      ctx.fillStyle = alpha(C.ink, 0.18);
      for (let i = 0; i < 5; i++) { const [X, Y] = P(1.2 + i * 0.5, 37.9 + (i % 2) * 0.25, 0.006); for (const [dx, dy, r] of [[0, 0, 0.07], [-0.08, -0.08, 0.03], [0, -0.11, 0.03], [0.08, -0.08, 0.03]]) { ctx.beginPath(); ctx.arc(X + dx, Y + dy, r, 0, Math.PI * 2); ctx.fill(); } }
      // Oil, scuffs.
      for (const [x, y, rx] of [[17.5, 47.2, 0.6], [22.5, 45.9, 0.5], [24, 47.3, 0.7], [22, 43.2, 0.4], [16.2, 41.6, 0.35]]) {
        const [X, Y] = P(x, y, 0.005); ctx.beginPath(); ctx.ellipse(X, Y, rx, rx * 0.45, 0, 0, Math.PI * 2); ctx.fillStyle = alpha(C.ink, 0.07); ctx.fill();
      }
      // What falls off a belt: a boarding pass, a sock, a tag, a sweet.
      rect(ctx, 19.25, 41.35, 0.36, 0.18, 0.008, C.white, { lw: 0.015 });
      rect(ctx, 19.25, 41.35, 0.1, 0.18, 0.009, C.navy, { stroke: false });
      face(ctx, [[17.1, 41.2, 0.008], [17.45, 41.25, 0.008], [17.5, 41.45, 0.008], [17.3, 41.5, 0.008], [17.15, 41.4, 0.008]], C.coral, { lw: 0.015 });
      rect(ctx, 21.55, 41.85, 0.2, 0.12, 0.008, INK.safety, { lw: 0.012 });
      rect(ctx, 18.6, 42.3, 0.16, 0.08, 0.008, C.purple, { lw: 0.012 });
      // Two white feathers by the cage door.
      for (const [x, y, a] of [[5.2, 46.95, 0.4], [5.75, 47.3, -0.3]]) {
        const [X, Y] = P(x, y, 0.01);
        ctx.save(); ctx.translate(X, Y); ctx.rotate(a);
        ctx.beginPath(); ctx.ellipse(0, 0, 0.16, 0.05, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.015 });
        ctx.beginPath(); ctx.moveTo(-0.18, 0); ctx.lineTo(0.14, 0); ctx.strokeStyle = C.grey; ctx.lineWidth = 0.015; ctx.stroke();
        ctx.restore();
      }
    });

    // ---------- Walls ----------
    // Low, like the terminal's. The front and the apron side stand in front
    // of everything in the room, so they're drawn after it (and the front is
    // a kerb, low enough that the bag trains behind it show).
    const wall = (x, y, w, d, h, cap) => (ctx) => box(ctx, x, y, 0, w, d, h, WALL, { top: cap, dens: 0.12 });
    for (const [a, b] of [[AIR, 32], [32, LANES[1]]]) R.thing(0.2, (a + b) / 2, wall(0, a, 0.35, b - a, 1.1, C.white), { depth: -100 });
    for (const [a, b] of [[AIR, 32], [32, LANES[0]]]) R.thing(29.8, (a + b) / 2, wall(29.6, a, 0.4, b - a, 1.1, C.white), { depth: 999 });
    for (const [a, b] of [[0, SHORE], [SHORE, CHECK]]) {
      R.thing((a + b) / 2, 47.9, (ctx) => {
        box(ctx, a, LANES[1], 0, b - a, FRONT - LANES[1], 0.45, INK.signal, { top: WALL, flat: true, lw: 0.04 });
        if (!Q.detail) return;
        for (let x = a + 0.1; x < b - 0.4; x += 0.7) face(ctx, [[x, FRONT + 0.004, 0], [x + 0.3, FRONT + 0.004, 0], [x + 0.55, FRONT + 0.004, 0.45], [x + 0.25, FRONT + 0.004, 0.45]], C.ink, { stroke: false });
      }, { depth: 999 });
    }
    // The way out to the apron: a bollard, and a sign that's honest.
    R.thing(29.75, 44.95, (ctx) => {
      cylinder(ctx, 29.75, 44.95, 0, 0.17, 1.15, INK.signal, { top: C.ink });
      for (const z of [0.3, 0.75]) cylinder(ctx, 29.75, 44.95, z, 0.172, 0.15, C.ink, { flat: true, stroke: false });
    });
    R.thing(27.8, 44.75, (ctx) => {
      hangSign(ctx, 'x', 27.8, 44.75, 1.75, 2.1, 0.64, null, { post: true });
      lettering(ctx, 'x', 27.8, 44.755, 1.88, 'TO THE PLANES', 0.19, SIGN.ink);
      lettering(ctx, 'x', 27.8, 44.755, 1.62, '(MOSTLY)', 0.14, SIGN.ink);
    });

    // ---------- The belts ----------
    for (const pc of PIECES) {
      const [x0, y0, x1, y1] = pc.b, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      R.thing(cx, cy, (ctx) => beltPiece(ctx, pc));
      R.thing(cx, cy, (ctx, t) => slats(ctx, pc, t), { anim: true, depth: cx + cy + 0.01 });
    }

    // What rides the loop.
    for (const [off, o] of LOOPBAGS) {
      R.mover((t) => { const [x, y] = onLoop(t, off); return { x, y }; }, (ctx, t, p) => loopBag(ctx, p.x, p.y, sideOf(p.x, p.y), o), { bias: 1.4 });
    }
    R.mover((t) => { const [x, y] = onLoop(t, PINKAT); return { x, y }; }, (ctx, t, p) => pinkBag(ctx, p.x, p.y, sideOf(p.x, p.y), t), { bias: 1.4 });
    // The decoy someone checked.
    R.mover((t) => { const [x, y] = onLoop(t, DECOYAT); return { x, y }; }, (ctx, t, p) => huntingDecoy(ctx, p.x, p.y, BZ, headOf(p.x, p.y)), { bias: 1.4 });
    R.decoy({ id: 'hunting-decoy', at: (t) => { const [x, y] = onLoop(t, DECOYAT); return [x, y, 1.1]; }, r: 0.8, say: 'A hunting decoy. Literally a decoy.' });
    // The tuba, riding the loop in its case; once its player's found, it's
    // gone home, and its claim tag goes round instead.
    R.mover((t) => { const [x, y] = onLoop(t, TUBAAT); return { x, y }; }, (ctx, t, p) => {
      if (R.found('gates:tuba-player')) claimTag(ctx, p.x, p.y, BZ);
      else tuba(ctx, p.x, p.y, BZ, sideOf(p.x, p.y));
    }, { bias: 1.4 });
    R.find({ id: 'tuba', label: 'A tuba', at: (t) => { const [x, y] = onLoop(t, TUBAAT); return [x, y, 1.1]; }, r: 0.9 });
    // In the ground stop, nothing's going anywhere, so a handler rides the
    // loop behind the pink bag, waving at everyone.
    R.mover((t) => { const [x, y] = onLoop(t, RIDERAT); return { x, y }; }, (ctx, t, p) => {
      const [x0, y0, x1] = LOOPBOX;
      const front = Math.abs(p.y - LOOPBOX[3]) < 1e-6, back = Math.abs(p.y - y0) < 1e-6, right = Math.abs(p.x - x1) < 1e-6;
      const dir = front || right ? (front ? 'l' : 'r') : back ? 'r' : 'l';
      const away = back || (!front && !right && Math.abs(p.x - x0) < 1e-6);
      person(ctx, p.x, p.y, BZ - 0.8, { ...RIDER, pose: 'sit', dir, back: away, arms: [Math.PI - 0.6 + Math.sin(t * 5) * 0.35, 0.5] }, t);
    }, { bias: 1.4, on: stopped });

    // In through the flaps: bags down the belt from the counters, into the
    // heap at the merge (or, while it's clear, on round into the loop).
    const jam = R.poke({ id: 'jam', at: [25.4, 33.7, 1.4], r: 0.9, say: 'WHACK. That did it.', teach: true, hold: 6, sound: 'clunk' });
    const INCOL = [C.navy, C.green, C.ink];
    for (let i = 0; i < 3; i++) {
      R.mover((t) => {
        const s = (((t * 1.1 + i * 2.02) % 6.06) + 6.06) % 6.06;
        const open = jam.k() > 0.5;
        if ((!open && s > 2.75) || s > 5.65) return { x: 26.45, y: 31, hide: true };
        if (s < 3.4) return { x: 26.45, y: AIR + 0.2 + s, a: Math.min(1, s / 0.3), along: 'y' };
        return { x: 26.45 - (s - 3.4), y: 33.6, a: 1, along: 'x' };
      }, (ctx, t, p) => {
        if (p.hide) return;
        ctx.save();
        ctx.globalAlpha *= p.a;
        bag(ctx, p.x, p.y, BZ, { kind: i === 1 ? 'duffel' : 'case', color: INCOL[i], lie: true, along: p.along, s: 1.15 });
        ctx.restore();
      }, { bias: 1.4 });
    }

    // ---------- The jam ----------
    // The heap at the merge (tap it: WHACK, it clears, for six seconds).
    R.thing(25.6, 34.3, (ctx, t) => heap(ctx, t, jam.k()), { anim: true, depth: 60.2 });
    // The supervisor, a rubber mallet in both hands, standing in the KEEP
    // CLEAR box: three whacks at the top of the heap, then a rest, leaning on it.
    const SUP = [27.3, 33.9];
    R.thing(SUP[0], SUP[1], (ctx, t) => {
      if (jam.k() > 0.5) { person(ctx, SUP[0], SUP[1], 0, { ...SUPER, pose: 'cheer', dir: 'l', arms: [Math.PI - 0.3, -(Math.PI - 0.3)], hold: held(Math.PI - 0.3, mallet) }, t); return; }
      const s = whackS(t);
      let a = 0.5, b = -0.55;
      if (s < 2.4) { const q = (s % 0.8) / 0.8; a = q < 0.65 ? 2.1 + (q / 0.65) * 1.4 : 3.5 - ((q - 0.65) / 0.35) * 1.4; b = a - 0.12; }
      person(ctx, SUP[0], SUP[1], 0, { ...SUPER, pose: 'stand', dir: 'l', arms: [a, b], hold: held(a, mallet) }, t);
    }, { anim: true });
    // The merge's sign, and its beacon. (Security already counts the days
    // without a snow globe: here the bags merge like Boston drives.)
    R.thing(28.2, 32.9, (ctx) => {
      hangSign(ctx, 'x', 28.2, 32.9, 1.85, 2.2, 0.8, null, { post: true });
      lettering(ctx, 'x', 28.2, 32.905, 2.05, 'MERGE AHEAD', 0.15, SIGN.ink);
      lettering(ctx, 'x', 28.2, 32.905, 1.72, 'BOSTON RULES', 0.22, C.white, 'Bagel Fat One');
    });
    R.thing(28.2, 32.95, (ctx, t) => beacon(ctx, 28.2, 32.9, 2.25, t, jam.k()), { anim: true, depth: 28.2 + 32.9 + 0.05 });

    // ---------- The tag reader ----------
    // An arch over the back run. It reads every tag that goes under it, and
    // when the pink bag goes under, its lamp goes red: no owner.
    R.thing(14, 32.8, (ctx) => box(ctx, 13.6, 32.7, 0, 0.8, 0.25, 1.85, MACHINE, { dens: 0.16 }), { depth: 46.8 });
    R.thing(14, 34.5, (ctx) => {
      box(ctx, 13.6, 34.25, 0, 0.8, 0.25, 1.85, MACHINE, { dens: 0.16 });
      box(ctx, 13.55, 32.65, 1.85, 0.9, 1.9, 0.32, MACHINE, { top: tint(MACHINE, 0.25), dens: 0.16 });
      lettering(ctx, 'x', 14, 34.555, 2.01, 'TAG READER', 0.11, C.white);
    }, { depth: 50 });
    const under = (t) => {
      let any = false, pink = false;
      for (const off of [...LOOPBAGS.map((b) => b[0]), PINKAT, DECOYAT, TUBAAT]) {
        const [x, y] = onLoop(t, off);
        if (Math.abs(y - LOOPBOX[1]) < 1e-6 && Math.abs(x - 14) < 0.45) { any = true; if (off === PINKAT) pink = true; }
      }
      return { any, pink };
    };
    R.thing(14, 34.4, (ctx, t) => {
      const u = under(t);
      if (u.any) face(ctx, [[14, 32.95, BZ + 0.05], [14, 34.25, BZ + 0.05], [14, 34.25, 1.8], [14, 32.95, 1.8]], alpha(u.pink ? C.red : C.coral, 0.28), { stroke: false });
      const [X, Y] = P(14, 33.6, 2.2);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.12, 0.07, 0, 0, Math.PI * 2);
      paint(ctx, u.pink ? C.red : C.green, { lw: 0.025 });
    }, { anim: true, depth: 49.95 });

    // ---------- The island ----------
    R.thing(8.6, 35.8, (ctx) => sortBench(ctx));
    // A handler reading a tag through a magnifying glass; in the ground stop,
    // asleep against the bench.
    still(R, 8.7, 36.75, READER, { pose: 'stand', dir: 'l', arms: [2.35, 1.15], hold: held(2.35, lens), on: (t) => !stopped(t) });
    still(R, 8.4, 36.3, READER, { z: -0.38, pose: 'sit', dir: 'l', arms: [0.4, 0.2], on: stopped });
    R.thing(11.95, 37.4, (ctx) => rushBin(ctx));
    // The lap board, on two posts.
    for (const x of [13.75, 16.25]) R.thing(x, 35.7, (ctx) => box(ctx, x - 0.05, 35.65, 0, 0.1, 0.1, 1.3, C.ink, { flat: true, stroke: false }));
    R.thing(15, 35.72, (ctx, t) => lapBoard(ctx, t), { anim: true });
    // The scanner: a beep at the belt every couple of seconds.
    R.thing(18.9, 37.6, (ctx, t) => {
      const s = ((t % 2.2) + 2.2) % 2.2;
      person(ctx, 18.9, 37.6, 0, { ...SCANNER, pose: 'point', dir: 'l', hold: held(1.5, gun) }, t);
      if (s < 0.3 && Q.detail) {
        const [X, Y] = P(18.9, 37.6, 0), b = P(18.0, 39.4, BZ + 0.3);
        ctx.beginPath(); ctx.moveTo(X - 1.24, Y - 1.46); ctx.lineTo(b[0], b[1]);
        ctx.strokeStyle = alpha(C.red, 0.7); ctx.lineWidth = 0.04; ctx.stroke();
      }
    }, { anim: true });
    // The station clock.
    // (At the island's front corner, so it's never in front of the back run.)
    R.thing(21.7, 38.1, (ctx) => box(ctx, 21.66, 38.06, 0, 0.08, 0.08, 2.25, C.ink, { flat: true, stroke: false }));
    R.thing(21.7, 38.12, (ctx, t) => clockFace(ctx, 21.7, 38.12, 2.6, t), { anim: true });

    // ---------- Along the back ----------
    R.thing(2.15, 31.55, (ctx) => parrotCage(ctx));
    R.thing(4.7, 31.1, (ctx) => kitchenette(ctx));
    // Two handlers on a break that started some time ago, cards in hand.
    const cards = (c) => {
      c.save(); c.translate(0.05, 0.05);
      for (let i = 0; i < 4; i++) { c.save(); c.rotate(-0.4 + i * 0.25); c.beginPath(); c.rect(-0.05, -0.26, 0.11, 0.18); paint(c, C.white, { lw: 0.015 }); c.restore(); }
      c.restore();
    };
    for (const [x, dir, seed] of [[7.75, 'r', 230], [11.45, 'l', 231]]) {
      R.thing(x, 30.9, (ctx) => {
        box(ctx, x - 0.27, 30.63, 0, 0.54, 0.54, 0.75, C.grey, { top: shade(C.grey, 0.3), dens: 0.16, lw: 0.03 });
        person(ctx, x, 30.9, 0, { ...RAMPLK(seed), pose: 'sit', dir, arms: [1.15, 0.85], hold: cards }, 0);
      });
    }
    R.thing(9.6, 31.0, (ctx) => {
      table(ctx, 8.45, 30.5, 2.3, 0.8, 0.8, C.wood);
      if (!Q.detail) return;
      for (const [dx, dy] of [[0.7, 0.3], [0.95, 0.42], [1.5, 0.35]]) rect(ctx, 8.45 + dx, 30.5 + dy, 0.18, 0.12, 0.81, C.white, { lw: 0.012 });
      const [X, Y] = P(9.6, 30.9, 0.82);
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(X + (i % 3) * 0.07 - 0.07, Y - i * 0.03, 0.06, 0.03, 0, 0, Math.PI * 2); paint(ctx, BRASS, { lw: 0.012 }); }
    });
    // A mop in its bucket.
    R.thing(12.9, 31.2, (ctx) => {
      cylinder(ctx, 12.9, 31.0, 0, 0.3, 0.45, INK.signal, { top: shade(C.sky, 0.3) });
      const a = P(12.85, 30.95, 0.4), b = P(12.65, 30.8, 1.9);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.08; ctx.stroke(); ctx.strokeStyle = C.wood; ctx.lineWidth = 0.045; ctx.stroke();
    });
    R.thing(18.5, 31.1, (ctx) => colaMachine(ctx));
    R.thing(21.8, 30.9, (ctx) => lockers(ctx));

    // ---------- The pets ----------
    R.thing(2.9, 36.9, (ctx) => dogCrate(ctx));
    R.thing(2.95, 36.9, (ctx, t) => wag(ctx, t), { anim: true, depth: 2.9 + 36.9 + 0.02 });
    R.poke({ id: 'dog', at: [1.85, 36.15, 0.7], r: 0.8, say: 'Woof! Is this Orlando?' });
    const crate = R.poke({ id: 'crate', at: [4.6, 36.4, 0.8], r: 0.8, say: 'Hsssss.', sound: 'nope' });
    R.thing(5.4, 37.0, (ctx, t) => catCrate(ctx, t, crate.k()), { anim: true });
    R.find({ id: 'cat', label: 'A cat', kind: 'poke', inside: crate, at: [4.6, 36.4, 1.3], r: 0.8, hint: 'Something in a crate by the loop is not happy about flying.' });
    // A handler crouched by the dog, with a biscuit.
    still(R, 2.3, 38.5, RAMPLK(233, { hat: 'beanie' }), { z: -0.38, pose: 'sit', dir: 'r', back: true, arms: [1.3, 0.4] });

    // ---------- The lost and found ----------
    const cage = R.poke({ id: 'cage', at: [4.6, 46.3, 1.1], r: 1.0, say: 'Unclaimed since 1987.', sound: 'clunk' });
    const { x0, y0, x1, y1, h } = CG;
    // the back, then what's in it, then the front
    R.thing(1.2, 40.8, (ctx) => { wirePanel(ctx, x0, y0, x0, y1, 0.05, h); wirePanel(ctx, x0, y0, x1, y0, 0.05, h); }, { depth: 41.6 });
    R.thing(3.8, 41.45, (ctx) => shelves(ctx));
    R.thing(1.6, 42.8, (ctx) => cello(ctx, 1.65, 42.8, 0.02), { depth: 46 });
    R.thing(1.9, 44.3, (ctx) => oldCases(ctx, 1.9, 44.3));
    R.thing(6.8, 42.0, (ctx) => umbrellas(ctx, 6.8, 42.0));
    R.thing(4.6, 42.7, (ctx) => telly(ctx, 4.6, 42.7));
    R.thing(3.2, 43.0, (ctx) => sockBox(ctx, 3.2, 43.0));
    R.thing(6.1, 43.7, (ctx) => gnome(ctx, 6.1, 43.7));
    R.thing(2.7, 45.6, (ctx) => cake(ctx, 2.7, 45.6, 0));
    R.thing(6.45, 45.75, (ctx) => bowlingBall(ctx, 6.45, 45.75));
    // The goose, behind the door: it stands up when the door opens.
    R.goose((t) => {
      const open = cage.k() > 0.5;
      return { x: GOOSE[0], y: GOOSE[1], z: 0, dir: 'l', pose: open ? (pulse(t, 4) > 0.7 ? 'honk' : 'stand') : 'sit', hidden: !open };
    }, { kind: 'poke', inside: cage, hint: 'Unclaimed, and quite happy about it.' });
    // The front and the side, in pieces so each sorts with what's behind it.
    for (const [a, b] of [[x0, 2.5], [2.5, CG.d0], [CG.d1, 6.4], [6.4, x1]]) R.thing((a + b) / 2, y1, (ctx) => wirePanel(ctx, a, y1, b, y1, 0.05, h), { depth: (a + b) / 2 + y1 + 0.5 });
    for (const [a, b] of [[y0, 42.5], [42.5, 44.4], [44.4, y1]]) {
      R.thing(x1, (a + b) / 2, (ctx) => {
        wirePanel(ctx, x1, a, x1, b, 0.05, h);
        if (a !== 42.5) return;
        // the calendar, still on November 1987
        face(ctx, [[x1 + 0.01, 43.1, 1.95], [x1 + 0.01, 43.9, 1.95], [x1 + 0.01, 43.9, 1.0], [x1 + 0.01, 43.1, 1.0]], C.white, { lw: 0.025 });
        face(ctx, [[x1 + 0.012, 43.1, 1.95], [x1 + 0.012, 43.9, 1.95], [x1 + 0.012, 43.9, 1.7], [x1 + 0.012, 43.1, 1.7]], C.red, { stroke: false });
        lettering(ctx, 'y', x1 + 0.015, 43.5, 1.82, 'NOV', 0.13, C.white, 'Bagel Fat One');
        lettering(ctx, 'y', x1 + 0.015, 43.5, 1.52, '1987', 0.15, C.ink, 'Bagel Fat One');
        if (!Q.detail) return;
        ctx.fillStyle = alpha(C.ink, 0.5);
        for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) { const [X, Y] = P(x1 + 0.015, 43.2 + c * 0.15, 1.32 - r * 0.12); ctx.fillRect(X - 0.02, Y - 0.015, 0.04, 0.03); }
      }, { depth: x1 + (a + b) / 2 + 0.5 });
    }
    R.thing(4.6, y1, (ctx, t) => cageDoor(ctx, t, cage.k()), { anim: true, depth: CG.d0 + y1 + 1.2 });
    R.thing(4.3, 46.45, (ctx) => {
      for (const x of [2.3, 6.3]) box(ctx, x - 0.03, y1 - 0.03, h, 0.06, 0.06, 0.3, C.ink, { flat: true, stroke: false });
      sign(ctx, 'x', 4.3, y1 + 0.05, h + 0.55, 4.4, 0.56, 'LOST + FOUND · SINCE 1987', { size: 0.24 });
    }, { depth: 54 });
    // The claims desk, and the man who's run it since then: reading the
    // paper all day, asleep under it at night.
    R.thing(8.9, 44.1, (ctx) => claimsDesk(ctx));
    const asleep = (t) => { const hh = hour(t); return hh >= 21 || hh < 6; };
    still(R, 8.9, 42.75, KEEPER, { pose: 'sit', dir: 'l', arms: [1.0, 1.0], hold: paper(false), on: (t) => !asleep(t) });
    still(R, 8.9, 42.75, KEEPER, { pose: 'sit', dir: 'l', arms: [2.1, 1.9], hold: paper(true), on: asleep });

    // ---------- Loading the carts ----------
    // The thrower: pulls the next FRAGILE off the loop, winds up, heaves it
    // over, and cheers when it lands.
    R.thing(11.6, 42.2, (ctx, t) => {
      const k = (((t % 6) + 6) % 6) / 6;
      let arms = [0.2, -0.2], pose = 'stand', dir = 'r', back = false;
      if (k < 0.08) { const q = k / 0.08; arms = [-0.9 + q * 3.4, -0.7 + q * 3.1]; }
      else if (k < 0.3) { const q = (k - 0.08) / 0.22; arms = [2.5 - q * 2.2, 2.4 - q * 2.5]; }
      else if (k > 0.6 && k < 0.72) pose = 'cheer';
      else if (k >= 0.72 && k < 0.86) { dir = 'l'; back = true; arms = [1.3, 1.2]; }
      else if (k >= 0.86) { const q = (k - 0.86) / 0.14; arms = [1.0 - q * 1.9, 0.9 - q * 1.6]; }
      person(ctx, 11.6, 42.2, 0, { ...THROWER, pose, dir, back, arms: pose === 'cheer' ? undefined : arms }, t);
    }, { anim: true });
    R.mover((t) => { const [x, y, z] = thrown(t); return { x, y, z }; }, (ctx, t, p) => {
      const k = (((t % 6) + 6) % 6) / 6, u = Math.min(1, k * 1.6);
      // (Landed, it settles into the heap before the next one goes over.)
      const sink = k > 0.86 ? (k - 0.86) / 0.14 : 0;
      ctx.save();
      ctx.globalAlpha *= 1 - sink;
      fragileBag(ctx, p.x, p.y, p.z - 0.3 - sink * 0.3, u * Math.PI * 2);
      ctx.restore();
    }, { bias: 0.6 });
    R.find({ id: 'fragile', label: 'A bag marked fragile', at: (t) => { const [x, y, z] = thrown(t); return [x, y, z + 0.4]; }, r: 0.9 });
    R.thing(10.3, 40.95, (ctx) => noThrowing(ctx, 10.3, 40.95));
    // His colleague, under the flight path, with a clipboard: he ducks.
    const clip = (c) => { c.beginPath(); c.rect(-0.05, -0.2, 0.36, 0.46); paint(c, C.wood, { lw: 0.025 }); c.beginPath(); c.rect(0, -0.14, 0.26, 0.36); c.fillStyle = C.white; c.fill(); };
    R.thing(15.3, 43.6, (ctx, t) => {
      const s = ((t % 6) + 6) % 6;
      if (s > 1.3 && s < 2.9) person(ctx, 15.3, 43.6, -0.38, { ...DUCKER, pose: 'sit', dir: 'l', arms: [Math.PI - 0.5, -(Math.PI - 0.5)] }, t);
      else person(ctx, 15.3, 43.6, 0, { ...DUCKER, pose: 'stand', dir: 'l', arms: [1.0, 1.0], hold: clip }, t);
    }, { anim: true });
    // (The carts stand just off the bag train's lanes.)
    R.thing(18, 44.6, (ctx) => dolly(ctx, 18, 44.6));
    R.thing(21.4, 44.6, (ctx) => cart(ctx, 21.4, 44.6, 0, 'x', 1, { bags: 3 }));
    R.thing(24.8, 44.6, (ctx) => cart(ctx, 24.8, 44.6, 0, 'x', 1, { bags: 7 }));
    // Off the loop and onto the cart, and back for the next.
    R.mover((t) => {
      const s = ((t % 7) + 7) % 7, Y0 = 40.9, Y1 = 43.4;
      if (s < 1.2) return { x: 22.4, y: Y0, dir: 'r', back: true, reach: true };
      if (s < 3.2) return { x: 22.4, y: Y0 + (Y1 - Y0) * ((s - 1.2) / 2), dir: 'l', moving: true, load: true };
      if (s < 4.4) return { x: 22.4, y: Y1, dir: 'l', load: s < 3.8 };
      if (s < 6.4) return { x: 22.4, y: Y1 - (Y1 - Y0) * ((s - 4.4) / 2), dir: 'r', back: true, moving: true };
      return { x: 22.4, y: Y0, dir: 'r', back: true };
    }, (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, { ...CARRIER, pose: p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back, arms: p.load ? [1.25, 1.15] : p.reach ? [1.4, 1.3] : undefined }, t);
      if (p.load) bag(ctx, p.x - 0.42, p.y + 0.42, 0.95, { kind: 'case', color: C.red, lie: true, along: 'x' });
    });
    // His partner at the corner of the loop, swinging bags up for the cart.
    R.thing(25.3, 41.3, (ctx, t) => {
      const s = ((t % 4) + 4) % 4;
      if (s < 2) person(ctx, 25.3, 41.3, 0, { ...PULLER, dir: 'r', back: true, arms: [1.4 + Math.sin(s * 3) * 0.2, 1.3] }, t);
      else {
        person(ctx, 25.3, 41.3, 0, { ...PULLER, dir: 'l', arms: [1.25, 1.15] }, t);
        bag(ctx, 24.88, 41.72, 0.95, { kind: 'duffel', color: C.teal, along: 'x' });
      }
    }, { anim: true });
    // False teeth, fallen out of somebody's bag: they chatter now and then.
    R.rug((ctx, t) => {
      const [X, Y] = P(20.4, 40.8, 0.02);
      const s = ((t % 4.5) + 4.5) % 4.5, j = s < 0.8 ? Math.abs(Math.sin(s * 20)) : 0;
      const open = j * 0.07, hop = j * 0.03;
      ctx.save();
      ctx.translate(X, Y - hop);
      ctx.beginPath(); ctx.ellipse(0, -0.03, 0.17, 0.07, 0, 0, Math.PI * 2); paint(ctx, C.coralLight, { lw: 0.025 });
      ctx.beginPath(); ctx.rect(-0.13, -0.11, 0.26, 0.06); paint(ctx, C.white, { lw: 0.02 });
      ctx.beginPath(); ctx.rect(-0.13, -0.17 - open, 0.26, 0.06); paint(ctx, C.white, { lw: 0.02 });
      ctx.beginPath(); ctx.ellipse(0, -0.22 - open, 0.17, 0.07, 0, Math.PI, Math.PI * 2); ctx.closePath(); paint(ctx, C.coralLight, { lw: 0.025 });
      if (Q.detail) {
        ctx.beginPath();
        for (const d of [-0.065, 0, 0.065]) { ctx.moveTo(d, -0.11); ctx.lineTo(d, -0.05); ctx.moveTo(d, -0.17 - open); ctx.lineTo(d, -0.11 - open); }
        ctx.strokeStyle = alpha(C.ink, 0.5); ctx.lineWidth = 0.012; ctx.stroke();
      }
      ctx.restore();
    }, { anim: true });
    R.find({ id: 'teeth', label: 'A set of false teeth', kind: 'hard', at: [20.4, 40.8, 0.1], r: 0.75, riddle: 'Somebody\'s Thanksgiving is going to be quiet.', hint: 'Look on the floor just in front of the loop.' });

    // ---------- The bag hospital ----------
    R.thing(27.6, 39.0, (ctx, t) => {
      const w = Math.sin(t * 3);
      person(ctx, 27.6, 39.0, 0, { ...TAPER, dir: 'l', arms: [1.35 + w * 0.35, 1.05 - w * 0.35], hold: held(1.35 + w * 0.35, tapeRoll) }, t);
    }, { anim: true });
    R.thing(27.7, 40.4, (ctx) => hospital(ctx));

    // ---------- Words in the air ----------
    // The whacks, the hiss, the beeps, the parrot (who has learned the
    // announcements), the tag reader's verdict on the pink bag, and the
    // keeper's snores.
    R.air((ctx, t) => {
      if (!Q.detail) return;
      if (jam.k() < 0.5) {
        const s = whackS(t);
        for (const w of [0.8, 1.6, 2.4]) if (s >= w && s < w + 0.4) pop(ctx, 25.1, 33.3, 1.95 + (s - w) * 0.8, 'WHACK', 0.4, INK.safety, 1 - (s - w) / 0.4);
      }
      const hs = ((t % 5) + 5) % 5;
      if (crate.k() < 0.3 && hs < 0.9) pop(ctx, 5.6, 37.2, 1.5 + hs * 0.3, 'HSSS', 0.3, INK.cranberry, 1 - hs / 0.9);
      const bs = ((t % 2.2) + 2.2) % 2.2;
      if (bs < 0.4) pop(ctx, 18.2, 38.6, 1.9 + bs * 0.5, 'BEEP', 0.24, C.red, 1 - bs / 0.4);
      const ps = ((t % 11) + 11) % 11;
      if (ps < 1.8) pop(ctx, 2.0, 31.0, 2.3, ps < 0.9 ? 'NOW BOARDING!' : 'SQUAWK!', 0.26, C.green);
      if (under(t).pink) pop(ctx, 14, 33.6, 2.85, 'NO OWNER', 0.24, C.red);
      if (Q.detail) {
        const hh = hour(t);
        if (hh >= 21 || hh < 6) for (let i = 0; i < 2; i++) { const q = ((t * 0.6 + i * 0.5) % 1); pop(ctx, 8.6 - q * 0.3, 42.4 - q * 0.3, 2.7 + q * 1.0, 'z', 0.3 + q * 0.2, C.navy, 1 - q); }
        if (stopped(t) && (((t % 9) + 9) % 9) < 1.5) {
          const [x, y] = onLoop(t, RIDERAT);
          pop(ctx, x, y, 3.0, 'WHEEE', 0.26, INK.safety);
        }
      }
    });

    // ---------- The night ----------
    // The room stays lit in its day inks; a warm glow over it after dark.
    nightGlow(R, 15, 37, 1.5, 9, LIT, 0.3);
    nightGlow(R, 5, 43.5, 1.5, 5, LIT, 0.28);
    nightGlow(R, 23, 43, 1.5, 6, LIT, 0.25);
  },
};
