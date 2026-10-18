// Check-in: the ticketing hall of Terminal C, roof off, walls low
// (docs/levels/logan.md). The landside glass along the back with its two
// sliding doors; the rope maze, where the queue snakes from the doors to the
// counters; five counters under the airlines' signs, a scale at each; behind
// them the belt carrying bags along and down through the rubber flaps into the
// bag room; kiosks nobody can work, the oversize drop, and Our Lady of the
// Airways, the chapel, in the front corner.
//
// Running gags: the man at the scale is two pounds over and puts on a layer an
// hour (a sphere by seven, with three hats and a snorkel). The queue grows all
// morning until it's out of the door, which then can't shut (the snow blows in
// from three), and after the ground stop at six it lies down. Grandma's back in
// it for the third time with an empty roasting pan.
//
// World units (plan.js): x 0..30 along the hall, y 12 (the landside glass) to
// 30 (the wall to the bag room). Speed: the crowd is still pictures switched on
// by the hour; only what moves is drawn live.
import { C, Q, P, box, rect, disc, face, poly, paint, person, label, alpha, tint, shade, mix, SKIN, HAIR } from '../../../engine/art.js';
import { orbit, clamp } from '../../../engine/actors.js';
import { INK, LIVERY, BAGS, SIGN, BRAND } from '../style.js';
import { look, bag, sign, lettering, solid, hexa, roller } from '../kit.js';
import { LAND, AIR, CHECK } from '../plan.js';
import { LOOP, hour, at, snowK, settle } from '../clock.js';

// ---------- The clock ----------
const lt = (t) => (((t % LOOP) + LOOP) % LOOP);
// The hour, 4 (the loop's start) to 28 (4am the next day).
const H = (t) => { const h = hour(t); return h < 4 ? h + 24 : h; };
// From the ground stop at six the hall settles down for the night (the queue
// lies down, the agents sleep at their desks) until the loop starts again.
const NIGHT = at(18);
const night = (t) => lt(t) >= NIGHT;
const daytime = (t) => lt(t) < NIGHT;
const hours = (a, b) => (t) => { const h = H(t); return h >= a && h < b; };

// ---------- The plan ----------
const WALL_H = 1.1;
const DOORS = [[3, 6], [17, 20]];
// The counters: five stations, 4 wide, from x 4. A desk, then the scale and
// its short belt back to the main belt (station 0, priority, has no scale).
const ST = [4, 8, 12, 16, 20];
const DESK_Y0 = 19.4, DESK_Y1 = 20.4;
const AGENT_Y = 21.3, PAX_Y = 18.1;
const SCALE_Y0 = 18.4;
// The main belt behind the agents, and its leg down to the flaps.
const BELT_X0 = 8.2, BELT_X1 = 27, BELT_Y0 = 22.3, BELT_Y1 = 23.3, BELT_H = 0.45;
const LEG_X0 = 25.9, LEG_X1 = 27;
const BACK_Y = 29.55; // the hall's front wall, toward the bag room
const FLAP_X0 = 25.6, FLAP_X1 = 27.3;
// The chapel, in the front corner.
const CH = { x0: 0.4, x1: 7, y0: 23.55, wall: 1.2, door: [25.9, 27.5] };
// Kiosks along x 27, between the Courier's two walks past them.
const KIOSK = [14.8, 15.65, 16.5];

// ---------- Inks ----------
const FLOOR = tint(INK.concrete, 0.36);
const CHIPS = shade(INK.concrete, 0.28);
const BRASS = mix(C.mustard, INK.concrete, 0.45);
const SILL = tint(INK.concrete, 0.12);
const FRAME = shade(C.grey, 0.18);
const GLASS = alpha(C.sky, 0.3);
const DESK = INK.snow;
const STEEL = C.greyLight;
const BELT_SIDE = mix(C.grey, INK.tarmac, 0.35);
const RUBBER = shade(INK.tarmac, 0.45);
const PLASTER = mix(INK.snow, C.woodLight, 0.28);
const TAPE = INK.cranberry;

// ---------- Small drawing helpers ----------
// A line through world points.
function line3(ctx, pts, color, lw = 0.05) {
  ctx.beginPath();
  pts.forEach((p, i) => { const [X, Y] = P(...p); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.stroke();
}
// Edges of a solid, inked.
function inkEdges(ctx, edges, lw = 0.04) {
  if (!Q.lines) return;
  ctx.beginPath();
  for (const [a, b] of edges) { const [ax, ay] = P(...a), [bx, by] = P(...b); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();
}
// A box from u0 to u1 along x (y0..y1 deep, z0 up h), drawn as one piece of a
// longer one: the seams with its neighbors aren't inked. o.a / o.b: its start
// or end is a real end.
function barX(ctx, u0, u1, y0, y1, z0, h, col, o = {}) {
  const z1 = z0 + h;
  face(ctx, [[u0, y1, z0], [u1, y1, z0], [u1, y1, z1], [u0, y1, z1]], o.front || shade(col, 0.22), { stroke: false, dots: o.dots ? shade(col, 0.55) : null, density: 0.2 });
  face(ctx, [[u0, y0, z1], [u1, y0, z1], [u1, y1, z1], [u0, y1, z1]], o.top || col, { stroke: false });
  if (o.b) face(ctx, [[u1, y0, z0], [u1, y1, z0], [u1, y1, z1], [u1, y0, z1]], o.side || shade(col, 0.1), { stroke: false });
  const e = [[[u0, y0, z1], [u1, y0, z1]], [[u0, y1, z1], [u1, y1, z1]], [[u0, y1, z0], [u1, y1, z0]]];
  if (o.a) e.push([[u0, y1, z0], [u0, y1, z1]], [[u0, y0, z1], [u0, y1, z1]]);
  if (o.b) e.push([[u1, y0, z0], [u1, y0, z1]], [[u1, y1, z0], [u1, y1, z1]], [[u1, y0, z0], [u1, y1, z0]], [[u1, y0, z1], [u1, y1, z1]]);
  inkEdges(ctx, e, o.lw);
}
// The same along y (x0..x1 wide).
function barY(ctx, u0, u1, x0, x1, z0, h, col, o = {}) {
  const z1 = z0 + h;
  face(ctx, [[x1, u0, z0], [x1, u1, z0], [x1, u1, z1], [x1, u0, z1]], o.front || shade(col, 0.1), { stroke: false, dots: o.dots ? shade(col, 0.5) : null, density: 0.16 });
  face(ctx, [[x0, u0, z1], [x1, u0, z1], [x1, u1, z1], [x0, u1, z1]], o.top || col, { stroke: false });
  if (o.b) face(ctx, [[x0, u1, z0], [x1, u1, z0], [x1, u1, z1], [x0, u1, z1]], o.side || shade(col, 0.22), { stroke: false });
  const e = [[[x0, u0, z1], [x0, u1, z1]], [[x1, u0, z1], [x1, u1, z1]], [[x1, u0, z0], [x1, u1, z0]]];
  if (o.a) e.push([[x1, u0, z0], [x1, u0, z1]], [[x0, u0, z1], [x1, u0, z1]]);
  if (o.b) e.push([[x0, u1, z0], [x0, u1, z1]], [[x1, u1, z0], [x1, u1, z1]], [[x0, u1, z0], [x1, u1, z0]], [[x0, u1, z1], [x1, u1, z1]]);
  inkEdges(ctx, e, o.lw);
}
// A long still thing in short pieces (about a unit each), each sorted at its
// front corner (or its back one, o.back: for a belt things ride on), so people
// beside it sort right. draw(ctx, u0, u1, first, last).
function pieces(R, along, a, b, c0, c1, draw, o = {}) {
  const n = Math.max(1, Math.ceil((b - a) / (o.step || 1) - 1e-6));
  for (let i = 0; i < n; i++) {
    const u0 = a + ((b - a) * i) / n, u1 = a + ((b - a) * (i + 1)) / n;
    const depth = (o.back ? u0 + c0 : u1 + c1) + (o.bias || 0);
    const x = along === 'x' ? (u0 + u1) / 2 : (c0 + c1) / 2, y = along === 'x' ? (c0 + c1) / 2 : (u0 + u1) / 2;
    R.thing(x, y, (ctx) => draw(ctx, u0, u1, i === 0, i === n - 1), { depth, ...(o.on ? { on: o.on } : {}) });
  }
}
// A board with lines of lettering on it, upright, facing the lower left
// (along 'x') or the lower right ('y'). lines: [text, size, ink?, font?].
function board(ctx, along, x, y, z, w, h, lines, o = {}) {
  sign(ctx, along, x, y, z, w, h, null, { board: o.board || SIGN.board, edge: o.edge ?? 0.035 });
  if (!Q.detail) return;
  const gap = o.gap || 1.2;
  const total = lines.reduce((s, l) => s + l[1] * gap, 0);
  let v = z + total / 2;
  for (const [text, size, ink, font] of lines) {
    v -= (size * gap) / 2;
    lettering(ctx, along, x, y, v - size * 0.04, text, size, ink || o.ink || SIGN.ink, font || o.font || 'Rethink Sans');
    v -= (size * gap) / 2;
  }
}
// A thought bubble (a cloud with two little puffs under it), over someone.
function thought(ctx, x, y, z, text, size = 0.26) {
  const X = x - y, Y = (x + y) / 2 - z * 1.12;
  const k = 40;
  ctx.save();
  ctx.translate(X, Y);
  ctx.font = `${size * k}px "Bagel Fat One", "Arial Black", sans-serif`;
  const w = ctx.measureText(text).width / k + size * 1.1, h = size * 1.7;
  ctx.beginPath();
  ctx.ellipse(0, -h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  paint(ctx, C.white, { lw: 0.035 });
  for (const [px, py, r] of [[-0.12, 0.18, 0.07], [-0.2, 0.33, 0.045]]) { ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.03 }); }
  ctx.restore();
  label(ctx, x, y, z + (h / 2) / 1.12 + 0.01, text, size, C.ink);
}
// A seeded random stream.
function rnd(seed) {
  let r = (seed * 9301 + 49297) % 233280;
  return () => ((r = (r * 9301 + 49297) % 233280) / 233280);
}

// ---------- The rope maze ----------
// Retractable tape between posts: four runs along the hall with a gap at
// alternate ends (the snake), closed at the sides. Drawn flat under everyone
// (cheap); each person standing behind a tape draws the bit of it that
// crosses them again on top (tapeBit), so the tape passes in front of them.
const TAPES = [
  { y: 13.9, a: 6.3, b: 24 },
  { y: 14.85, a: 5, b: 22.7 },
  { y: 15.8, a: 6.3, b: 24 },
  { y: 16.75, a: 5, b: 22.7 },
];
const SIDES = [{ x: 5, a: 13.9, b: 16.75 }, { x: 24, a: 13.9, b: 16.75 }];
const TAPE_Z = 0.86;
const along = (a, b, step = 1.9) => { const n = Math.max(1, Math.round((b - a) / step)); return Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n); };
const POSTS = [];
for (const tp of TAPES) for (const x of along(tp.a, tp.b)) POSTS.push([x, tp.y]);
for (const s of SIDES) for (const y of along(s.a, s.b, 1.5)) if (!POSTS.some(([px, py]) => Math.abs(px - s.x) < 0.05 && Math.abs(py - y) < 0.05)) POSTS.push([s.x, y]);
function post(ctx, x, y) {
  disc(ctx, x, y, 0.01, 0.15, C.ink, { lw: 0.02 });
  box(ctx, x - 0.035, y - 0.035, 0, 0.07, 0.07, 0.9, STEEL, { flat: true, lw: 0.015 });
  box(ctx, x - 0.07, y - 0.07, 0.84, 0.14, 0.14, 0.1, C.ink, { flat: true, stroke: false });
}
function tapeLine(ctx, a, b) {
  ctx.beginPath();
  const [ax, ay] = P(...a), [bx, by] = P(...b);
  ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
  ctx.lineCap = 'butt';
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.stroke(); }
  ctx.strokeStyle = TAPE; ctx.lineWidth = 0.06; ctx.stroke();
}
// The tape along y = ty from x a to b (clipped to the runs there), and its
// posts, drawn over whatever came before.
function tapeBit(ctx, ty, a, b) {
  const tp = TAPES.find((q) => Math.abs(q.y - ty) < 0.01);
  if (!tp) return;
  const x0 = Math.max(a, tp.a), x1 = Math.min(b, tp.b);
  if (x1 <= x0) return;
  tapeLine(ctx, [x0, ty, TAPE_Z], [x1, ty, TAPE_Z]);
  for (const [px, py] of POSTS) if (Math.abs(py - ty) < 0.01 && px >= x0 - 0.1 && px <= x1 + 0.1) post(ctx, px, py);
}
// The side tape at x 24, from y a to b.
function sideBit(ctx, a, b) {
  const s = SIDES[1], y0 = Math.max(a, s.a), y1 = Math.min(b, s.b);
  if (y1 <= y0) return;
  tapeLine(ctx, [s.x, y0, TAPE_Z], [s.x, y1, TAPE_Z]);
  for (const [px, py] of POSTS) if (Math.abs(px - s.x) < 0.01 && py >= y0 - 0.1 && py <= y1 + 0.1) post(ctx, px, py);
}

// ---------- The queue ----------
// Lanes, head first. The snake: in at the left of the back lane (14.4), right
// along it, back along 15.35, right along 16.3 to the head, then out through
// the gap to the call area in front of the counters. Behind the maze, along
// the glass, the overflow line runs back to the door (13.15), and by mid
// morning stands in the doorway. Gaps where the Courier cuts through at 6am.
const LANES = [
  { y: 16.3, dir: 'r', back: false, tape: 16.75, xs: [23.2, 20.8, 19.5, 18.3, 16.4, 13.8, 12.6, 11.4, 10.2, 9.0, 7.8, 6.6, 5.7] },
  { y: 15.35, dir: 'l', back: true, tape: 15.8, xs: [5.8, 7.0, 8.2, 9.4, 10.6, 11.8, 13.0, 14.2, 15.4, 16.6, 18.6, 19.8, 21.0, 22.2, 23.4] },
  { y: 14.4, dir: 'r', back: false, tape: 14.85, xs: [23.4, 22.3, 21.2, 20.1, 19.0, 17.0, 15.8, 14.6, 13.4, 12.2, 11.0, 9.8, 8.6, 7.4, 6.2] },
  { y: 13.15, dir: 'l', back: true, tape: 13.9, xs: [5.7, 6.9, 8.1, 9.3, 10.5, 11.7, 12.9, 14.1, 15.3, 16.5] },
];
const KNITS = [C.navy, C.red, C.teal, INK.cranberry, C.green, C.white, C.purple, C.coral];
// A knitted hat with a bobble, over the head (in the person's units).
function knit(ctx, hy, col) {
  ctx.beginPath(); ctx.arc(0.02, hy - 0.05, 0.345, Math.PI, 0); ctx.closePath();
  paint(ctx, col, { lw: 0.035, dots: shade(col, 0.4), density: 0.15 });
  ctx.beginPath(); ctx.rect(-0.33, hy - 0.09, 0.7, 0.08); paint(ctx, shade(col, 0.15), { lw: 0.025 });
  ctx.beginPath(); ctx.arc(0.02, hy - 0.42, 0.085, 0, Math.PI * 2); paint(ctx, col === C.white ? C.red : C.white, { lw: 0.025 });
}
const SLOTS = [];
for (const ln of LANES) for (const x of ln.xs) SLOTS.push({ x, y: ln.y, dir: ln.dir, back: ln.back, tape: ln.tape });
// Out of the door: two in the doorway, holding it open.
SLOTS.push({ x: 17.6, y: 12.85, dir: 'l', back: true, tape: null }, { x: 18.5, y: 12.4, dir: 'l', back: true, tape: null });
const PILLOW = SLOTS.findIndex((s) => s.y === 14.4 && s.x === 11.0);
// Everyone up to the neck pillow is here at 4am (it's the busiest day of the
// year); the rest join one at a time until the line's in the doorway at
// about a quarter past ten.
const BASE = PILLOW + 1;
const JOIN0 = 16, JOIN_EVERY = 4.6;
const joins = (n) => JOIN0 + (n - BASE) * JOIN_EVERY;
const slotOn = (n) => (n < BASE ? daytime : (t) => daytime(t) && lt(t) >= joins(n));
// The door's held open from the moment someone stands in it.
const STUCK = joins(SLOTS.length - 1);

// Who's in each slot: a look, a bag, and now and then something more.
const SPECIAL = {
  0: 'phone', 1: 'cat', 2: 'ride', 3: 'dozer', 5: 'turkey', 6: 'pie', 8: 'laundry', 11: 'coffee',
  15: 'baby', 16: 'fam', 17: 'famkid', 18: 'famkid', 19: 'fam', 21: 'parka', 23: 'cooler', 25: 'guitar',
  30: 'coffee', 33: 'phone', 36: 'phone', [PILLOW]: 'pillow', 40: 'kid', 44: 'flowers', 47: 'phone', 50: 'box', 53: 'snowy', 54: 'snowy',
};
SLOTS.forEach((s, i) => {
  const r = rnd(i * 13 + 5);
  s.kind = SPECIAL[i] || null;
  s.lk = look(200 + i * 7, 'traveler');
  // Hats: a knitted one in any color, a cap now and then, or none.
  const hr = r();
  s.lk.hat = hr > 0.86 ? 'cap' : null;
  s.knit = hr < 0.36 ? KNITS[i % KNITS.length] : null;
  if (s.kind === 'fam' || s.kind === 'famkid') { s.lk = { ...s.lk, top: C.coral, hat: null, dress: false }; s.knit = C.white; }
  if (s.kind === 'parka') { s.lk = { ...s.lk, top: C.white, hat: null }; s.knit = C.red; }
  if (s.kind === 'snowy') { s.lk = { ...s.lk, hat: null }; s.knit = C.navy; }
  if (s.kind === 'turkey') s.knit = null;
  s.scale = s.kind === 'famkid' || s.kind === 'kid' ? 0.68 : 0.95 + r() * 0.1;
  s.bag = { kind: r() < 0.72 ? 'case' : r() < 0.6 ? 'duffel' : 'pack', color: BAGS[Math.floor(r() * BAGS.length)] };
});

// Things people hold (drawn in their own units, facing right, at the hands).
const HOLD = {
  phone: (ctx) => { ctx.beginPath(); ctx.roundRect(0.1, -0.16, 0.13, 0.22, 0.03); paint(ctx, C.ink, { lw: 0.02 }); ctx.fillStyle = C.sky; ctx.fillRect(0.12, -0.14, 0.09, 0.15); },
  coffee: (ctx) => { ctx.beginPath(); ctx.roundRect(0.1, -0.1, 0.15, 0.22, 0.03); paint(ctx, C.white, { lw: 0.025 }); ctx.fillStyle = C.brown; ctx.fillRect(0.1, -0.02, 0.15, 0.07); },
  pie: (ctx) => {
    ctx.beginPath(); ctx.rect(-0.05, -0.02, 0.6, 0.2); paint(ctx, C.white, { lw: 0.025 });
    ctx.beginPath(); ctx.rect(0.08, 0.02, 0.32, 0.08); paint(ctx, C.woodLight, { lw: 0.015 });
  },
  cat: (ctx) => {
    ctx.beginPath(); ctx.roundRect(-0.05, -0.05, 0.62, 0.42, 0.1); paint(ctx, C.teal, { lw: 0.03 });
    ctx.beginPath(); ctx.arc(0.42, 0.15, 0.12, 0, Math.PI * 2); paint(ctx, C.ink, { lw: 0.02 });
    // Two eyes in the dark of the grille.
    ctx.fillStyle = C.mustard;
    ctx.beginPath(); ctx.arc(0.38, 0.13, 0.025, 0, Math.PI * 2); ctx.arc(0.46, 0.13, 0.025, 0, Math.PI * 2); ctx.fill();
  },
  laundry: (ctx) => {
    ctx.beginPath(); ctx.ellipse(0.1, -0.35, 0.36, 0.42, 0.2, 0, Math.PI * 2); paint(ctx, C.greyLight, { lw: 0.03, dots: C.grey, density: 0.15 });
    ctx.beginPath(); ctx.moveTo(-0.05, -0.75); ctx.lineTo(0.2, -0.62); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
    ctx.fillStyle = C.red; ctx.fillRect(0.12, -0.3, 0.14, 0.08); // a sock, escaping
  },
  cooler: (ctx) => {
    ctx.beginPath(); ctx.rect(-0.02, -0.02, 0.6, 0.36); paint(ctx, C.white, { lw: 0.03 });
    ctx.beginPath(); ctx.rect(-0.02, -0.08, 0.6, 0.08); paint(ctx, C.red, { lw: 0.02 });
    ctx.save(); ctx.translate(0.28, 0.16); ctx.scale(1 / 40, 1 / 40); ctx.font = '7px "Rethink Sans", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = C.red; ctx.fillText('LOBSTER', 0, 2); ctx.restore();
  },
  guitar: (ctx) => {
    ctx.save(); ctx.rotate(-0.5);
    ctx.beginPath(); ctx.ellipse(0.1, 0.25, 0.2, 0.26, 0, 0, Math.PI * 2); ctx.rect(0.04, -0.6, 0.12, 0.7); paint(ctx, C.black, { lw: 0.025 });
    ctx.restore();
  },
  flowers: (ctx) => {
    ctx.beginPath(); ctx.moveTo(0.05, 0.1); ctx.lineTo(0.2, -0.25); ctx.lineTo(0.35, 0.1); paint(ctx, C.white, { lw: 0.02 });
    for (const [x, y, c] of [[0.12, -0.32, C.pink], [0.24, -0.38, C.mustard], [0.32, -0.28, C.red]]) { ctx.beginPath(); ctx.arc(x, y, 0.07, 0, Math.PI * 2); paint(ctx, c, { lw: 0.015 }); }
  },
  box: (ctx) => {
    ctx.beginPath(); ctx.rect(-0.08, -0.15, 0.62, 0.48); paint(ctx, C.woodLight, { lw: 0.03 });
    ctx.fillStyle = alpha(C.butter, 0.9); ctx.fillRect(-0.08, 0.04, 0.62, 0.06);
    ctx.save(); ctx.translate(0.23, 0.22); ctx.scale(1 / 40, 1 / 40); ctx.font = '6px "Rethink Sans", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = C.red; ctx.fillText('FRAGILE: CHINA', 0, 2); ctx.restore();
  },
  baby: (ctx) => {
    ctx.beginPath(); ctx.ellipse(0.0, 0.05, 0.2, 0.26, 0, 0, Math.PI * 2); paint(ctx, C.pink, { lw: 0.025 });
    ctx.beginPath(); ctx.arc(0.02, -0.25, 0.13, 0, Math.PI * 2); paint(ctx, SKIN[0], { lw: 0.02 });
  },
};
// Eyes shut (over the ones the person was drawn with).
function eyesShut(ctx, hy) {
  ctx.fillStyle = SKIN[0];
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025;
  ctx.beginPath(); ctx.moveTo(0.06, hy + 0.03); ctx.lineTo(0.14, hy + 0.03); ctx.moveTo(0.2, hy + 0.03); ctx.lineTo(0.28, hy + 0.03); ctx.stroke();
}

// The neck pillow (the decoy): a white U round the neck, and at its front end
// a goose's neck and head, beak and eye and all. In the person's own units.
function neckPillow(ctx, hy) {
  const ny = hy + 0.36;
  ctx.beginPath();
  ctx.ellipse(0.02, ny, 0.34, 0.13, 0, 0, Math.PI * 2);
  paint(ctx, C.white, { lw: 0.035, dots: C.grey, density: 0.12 });
  // The neck curving up beside the cheek, and the head.
  ctx.beginPath();
  ctx.moveTo(0.3, ny - 0.02);
  ctx.quadraticCurveTo(0.5, ny - 0.18, 0.44, hy - 0.2);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.15; ctx.lineCap = 'round'; ctx.stroke();
  ctx.strokeStyle = C.white; ctx.lineWidth = 0.09; ctx.stroke();
  ctx.beginPath(); ctx.arc(0.45, hy - 0.24, 0.09, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.03 });
  ctx.beginPath(); ctx.moveTo(0.52, hy - 0.27); ctx.lineTo(0.7, hy - 0.22); ctx.lineTo(0.52, hy - 0.19); paint(ctx, C.coral, { lw: 0.02 });
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0.47, hy - 0.27, 0.022, 0, Math.PI * 2); ctx.fill();
  // A seam, so a close look gives it away.
  ctx.strokeStyle = alpha(C.grey, 0.9); ctx.lineWidth = 0.02;
  ctx.beginPath(); ctx.ellipse(0.02, ny, 0.26, 0.07, 0, 0.2, Math.PI - 0.2); ctx.stroke();
}

// The man in the inflatable turkey: a fan of tail feathers behind, a round
// brown body round him with his face out of the front, a small turkey head on
// top. In his own units.
function turkeyTail(ctx) {
  const cols = [C.brown, C.mustard, C.coral, INK.cranberry, C.brown, C.mustard, C.coral];
  for (let i = 0; i < cols.length; i++) {
    const a0 = Math.PI * (1.05 + (i / cols.length) * 0.9), a1 = Math.PI * (1.05 + ((i + 1) / cols.length) * 0.9);
    ctx.beginPath(); ctx.moveTo(-0.15, -1.25); ctx.arc(-0.15, -1.25, 1.0, a0, a1); ctx.closePath();
    paint(ctx, cols[i], { lw: 0.03 });
  }
}
function turkeyBody(ctx, b) {
  const cy = (b.top + b.hipY) / 2 - 0.05;
  ctx.beginPath(); ctx.ellipse(0, cy, 0.62, 0.62, 0, 0, Math.PI * 2);
  paint(ctx, C.brown, { lw: 0.04, dots: shade(C.brown, 0.4), density: 0.18 });
  // A wing, and the belly's lighter patch.
  ctx.beginPath(); ctx.ellipse(-0.18, cy + 0.05, 0.3, 0.2, 0.4, 0, Math.PI * 2); paint(ctx, shade(C.brown, 0.15), { lw: 0.025 });
}
function turkeyHead(ctx, hy) {
  ctx.beginPath(); ctx.arc(0.08, hy - 0.5, 0.13, 0, Math.PI * 2); paint(ctx, tint(C.brown, 0.2), { lw: 0.03 });
  ctx.beginPath(); ctx.moveTo(0.19, hy - 0.52); ctx.lineTo(0.32, hy - 0.48); ctx.lineTo(0.19, hy - 0.45); paint(ctx, C.mustard, { lw: 0.02 });
  ctx.beginPath(); ctx.ellipse(0.2, hy - 0.37, 0.04, 0.09, 0, 0, Math.PI * 2); paint(ctx, C.red, { lw: 0.02 });
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0.11, hy - 0.53, 0.022, 0, Math.PI * 2); ctx.fill();
}

// Someone in the queue, still (cached): their bag, them, and the tape in
// front of them, drawn again over them.
function queuer(ctx, s) {
  const { x, y, dir, back, lk, kind } = s;
  const f = dir === 'l' ? 1 : -1; // which side their bag stands (behind them, along the lane)
  const bx = x + f * 0.5, by = y + 0.12;
  const holds = ['cat', 'pie', 'laundry', 'cooler', 'flowers', 'box', 'baby'].includes(kind);
  const o = { ...lk, pose: 'stand', dir, back, scale: s.scale };
  if (kind === 'phone') Object.assign(o, { pose: 'read', hold: HOLD.phone });
  if (kind === 'coffee') Object.assign(o, { arms: [1.2, 0.1], hold: HOLD.coffee });
  if (holds) Object.assign(o, { pose: 'carry', hold: HOLD[kind] });
  if (kind === 'guitar') Object.assign(o, { hold: HOLD.guitar });
  if (kind === 'dozer') Object.assign(o, { face: (c, hy, bk) => { if (!bk) eyesShut(c, hy); } });
  if (kind === 'dodge') Object.assign(o, { pose: 'cheer', hold: null });
  if (s.knit) { const f0 = o.face; o.face = (c, hy, bk, t) => { knit(c, hy, s.knit); if (f0) f0(c, hy, bk, t); }; }
  if (kind === 'snowy') o.wear = (c, b) => { c.fillStyle = alpha(C.white, 0.9); c.beginPath(); c.ellipse(-0.1, b.top + 0.02, 0.2, 0.06, 0, 0, Math.PI * 2); c.ellipse(0.16, b.top + 0.03, 0.14, 0.05, 0, 0, Math.PI * 2); c.fill(); };
  if (kind === 'pillow') Object.assign(o, { face: (c, hy, bk) => { if (!bk) eyesShut(c, hy); neckPillow(c, hy); } });
  if (kind === 'turkey') Object.assign(o, { wear: (c, b) => turkeyBody(c, b), face: (c, hy) => turkeyHead(c, hy), hat: null });
  const bagFirst = f < 0;
  const drawBag = () => { if (!holds && kind !== 'ride') bag(ctx, bx, by, 0, { ...s.bag, handle: s.bag.kind === 'case', along: 'x' }); };
  if (bagFirst) drawBag();
  if (kind === 'ride') {
    // A kid riding their suitcase like a pony.
    bag(ctx, x, y, 0, { kind: 'case', color: C.mustard, lie: true, along: 'x' });
    person(ctx, x - 0.05, y, 0.0, { ...o, pose: 'sit', scale: 0.62, arms: [1.0, 0.8] }, 0);
  } else if (kind === 'turkey') {
    const X = x - y, Y = (x + y) / 2;
    ctx.save(); ctx.translate(X, Y); ctx.scale(dir === 'l' ? -1 : 1, 1); turkeyTail(ctx); ctx.restore();
    person(ctx, x, y, 0, o, 0);
  } else person(ctx, x, y, 0, o, 0);
  if (!bagFirst) drawBag();
  if (s.tape) tapeBit(ctx, s.tape, x + (s.tape - y) - 0.9, x + (s.tape - y) + 0.9);
  if (x > 22.5 && y > 14) sideBit(ctx, y + (24 - x) - 0.7, y + (24 - x) + 0.7);
}

// After the ground stop the queue lies down where it stood, heads on bags.
const SLEEPERS = [
  [19.4, 16.3, 'r'], [10.6, 16.3, 'l'], [8.0, 16.3, 'r'],
  [7.0, 15.35, 'l'], [9.6, 15.35, 'r'], [12.2, 15.35, 'l'], [14.8, 15.35, 'r'], [17.4, 15.35, 'l'], [20.0, 15.35, 'r'], [22.6, 15.35, 'l'],
  [22.6, 14.4, 'r'], [20.0, 14.4, 'l'], [17.4, 14.4, 'r'], [14.6, 14.4, 'l'], [8.4, 14.4, 'r'], [6.2, 14.4, 'l'],
  [7.0, 13.15, 'r'], [9.6, 13.15, 'l'], [12.2, 13.15, 'r'], [14.8, 13.15, 'l'],
];
function sleeper(ctx, x, y, dir, lk, bagColor, tapeY) {
  // (The billboard lies along the screen: its middle on the spot.)
  const f = dir === 'l' ? -1 : 1;
  const ox = x + 0.38 * f, oy = y - 0.38 * f;
  const hx = f > 0 ? ox - 1.0 : ox + 0.6, hy = f > 0 ? oy + 0.6 : oy - 1.0;
  bag(ctx, hx, hy, 0, { kind: 'duffel', color: bagColor, along: 'x', tag: false });
  person(ctx, ox, oy, 0.12, { ...lk, pose: 'sleep', dir }, 0);
  if (tapeY) tapeBit(ctx, tapeY, x + (tapeY - y) - 1.6, x + (tapeY - y) + 1.6);
}

export default {
  id: 'check-in',
  name: 'Check-in',
  blurb: 'The queue goes out the door and the kiosks can\'t help. One man is two pounds over and wearing the difference.',
  describe: 'A ticketing hall with its roof off: a queue snaking through a rope maze to the airline counters, a belt carrying bags behind them, kiosks and a little chapel. The queue grows all morning and lies down after the storm; a man at a scale wears more clothes every hour.',

  build(R) {
    // ---------- The floor ----------
    R.floor((ctx) => {
      rect(ctx, 0, LAND, CHECK, AIR - LAND, 0, FLOOR, { stroke: false, dots: CHIPS, density: 0.05 });
      if (!Q.detail) return;
      // Brass strips between the terrazzo's panels.
      ctx.beginPath();
      for (let x = 3; x < CHECK; x += 3) { const [ax, ay] = P(x, LAND), [bx, by] = P(x, AIR); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); }
      for (let y = LAND + 3; y < AIR; y += 3) { const [ax, ay] = P(0, y), [bx, by] = P(CHECK, y); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); }
      ctx.strokeStyle = BRASS; ctx.lineWidth = 0.035; ctx.stroke();
    });
    R.rug((ctx) => {
      // The chapel's carpet.
      rect(ctx, CH.x0, CH.y0 + 0.3, CH.x1 - 0.3 - CH.x0, BACK_Y - CH.y0 - 0.3, 0.004, INK.cranberry, { stroke: false, dots: shade(INK.cranberry, 0.35), density: 0.14 });
      rect(ctx, CH.x0 + 0.25, CH.y0 + 0.55, CH.x1 - 0.8 - CH.x0, BACK_Y - CH.y0 - 0.8, 0.006, null, { lw: 0.03, stroke: C.mustard });
      // Door mats.
      for (const [a, b] of DOORS) {
        rect(ctx, a + 0.1, LAND + 0.42, b - a - 0.2, 0.95, 0.005, C.ink, { lw: 0.02 });
        if (Q.detail) for (let i = 1; i < 6; i++) line3(ctx, [[a + 0.1, LAND + 0.42 + i * 0.16, 0.006], [b - 0.1, LAND + 0.42 + i * 0.16, 0.006]], shade(C.grey, 0.4), 0.02);
      }
      // The priority lane's red carpet, from the first door to the gold desk.
      const red = C.red, gold = C.mustard;
      rect(ctx, 3.55, LAND + 1.4, 1.0, 18.8 - LAND - 1.4, 0.007, red, { stroke: false, dots: shade(red, 0.3), density: 0.1 });
      rect(ctx, 4.55, 17.75, 3.0, 1.05, 0.007, red, { stroke: false, dots: shade(red, 0.3), density: 0.1 });
      line3(ctx, [[3.55, LAND + 1.4, 0.009], [3.55, 18.8, 0.009], [7.55, 18.8, 0.009]], gold, 0.04);
      line3(ctx, [[4.55, LAND + 1.4, 0.009], [4.55, 17.75, 0.009], [7.55, 17.75, 0.009]], gold, 0.04);
      // "Please wait to be called" at the head of the snake.
      if (Q.detail) {
        line3(ctx, [[22.8, 17.15, 0.008], [24.2, 17.15, 0.008]], INK.signal, 0.07);
      }
    });
    // The rope maze: every tape, then every post.
    R.rug((ctx) => {
      for (const tp of TAPES) {
        const xs = along(tp.a, tp.b);
        for (let i = 0; i < xs.length - 1; i++) tapeLine(ctx, [xs[i], tp.y, TAPE_Z], [xs[i + 1], tp.y, TAPE_Z]);
      }
      for (const s of SIDES) tapeLine(ctx, [s.x, s.a, TAPE_Z], [s.x, s.b, TAPE_Z]);
      for (const [x, y] of POSTS) post(ctx, x, y);
    });

    // ---------- The glass along the curb, and the end wall ----------
    // Waist high (the terminal's cut), drawn under everything in the hall:
    // all of it stands in front of them.
    R.wall((ctx) => {
      for (const [a, b] of [[0, DOORS[0][0]], [DOORS[0][1], DOORS[1][0]], [DOORS[1][1], CHECK]]) glassX(ctx, a, b, LAND);
      glassY(ctx, LAND, AIR, 0);
    });

    // ---------- The counters ----------
    ST.forEach((x0, k) => desk(R, x0, k));
    // The scales and their belts back to the main belt (not at priority).
    for (let k = 1; k < ST.length; k++) {
      const sx0 = ST[k] + 2.6, sx1 = ST[k] + 3.8;
      pieces(R, 'y', SCALE_Y0, BELT_Y0, sx0, sx1, (ctx, u0, u1, a) => {
        if (u0 < DESK_Y0 - 0.01) {
          // The scale: a steel plate, a step lower.
          barY(ctx, u0, u1, sx0, sx1, 0, 0.38, STEEL, { a, front: shade(STEEL, 0.15), top: tint(STEEL, 0.3) });
          if (a && Q.detail) lettering(ctx, 'x', (sx0 + sx1) / 2, u0, 0.2, 'MAX 50 LB', 0.11, C.ink);
        } else barY(ctx, u0, u1, sx0, sx1, 0, 0.42, BELT_SIDE, { top: RUBBER });
      }, { back: true });
    }
    // The main belt behind the agents, and its leg down to the flaps.
    pieces(R, 'x', BELT_X0, BELT_X1, BELT_Y0, BELT_Y1, (ctx, u0, u1, a, b) => belt(ctx, 'x', u0, u1, a, b), { back: true });
    pieces(R, 'y', BELT_Y1, BACK_Y, LEG_X0, LEG_X1, (ctx, u0, u1) => belt(ctx, 'y', u0, u1, false, false), { back: true });

    // ---------- The front wall, to the bag room, and the flaps ----------
    // Glass above a low sill, like the landside, so nothing behind it hides.
    for (const [a, b] of [[CH.x0, FLAP_X0], [FLAP_X1, CHECK]]) {
      pieces(R, 'x', a, b, BACK_Y, AIR, (ctx, u0, u1, first, last) => {
        barX(ctx, u0, u1, BACK_Y, AIR, 0, 0.3, SILL, { a: first, b: last, top: tint(SILL, 0.25), lw: 0.035 });
        face(ctx, [[u0, BACK_Y + 0.22, 0.3], [u1, BACK_Y + 0.22, 0.3], [u1, BACK_Y + 0.22, WALL_H], [u0, BACK_Y + 0.22, WALL_H]], GLASS, { stroke: false });
        const n = Math.max(1, Math.round((u1 - u0) / 1.5));
        for (let i = first ? 0 : 1; i <= n; i++) {
          const x = u0 + ((u1 - u0) * i) / n;
          if (i === n && !last) continue;
          box(ctx, Math.min(x, u1 - 0.08), BACK_Y + 0.16, 0.3, 0.08, 0.12, WALL_H - 0.3, FRAME, { flat: true, lw: 0.015 });
        }
        box(ctx, u0, BACK_Y + 0.14, WALL_H, u1 - u0, 0.16, 0.05, C.ink, { flat: true, stroke: false });
      }, { step: 1.5 });
    }

    // ---------- The queue ----------
    // The family running late (day.js) bursts in at the first door at half
    // past eight and runs the length of the hall along the glass: the line
    // there leaps out of their way (toward the maze), arms up, and back.
    const late = R.walkers.find((w) => w.id === 'family');
    let famT = null, famP = null;
    const famAt = (t) => { if (t !== famT) { famT = t; famP = late ? late.at(t) : null; } return famP; };
    const dodging = (x, t) => {
      const p = famAt(t);
      return !!(p && !p.hide && p.y > 12.2 && p.y < 13.8 && x > p.x - 1.8 && x < p.x + 2.4);
    };
    SLOTS.forEach((s, n) => {
      if (n === PILLOW) return; // (drawn live with the decoy, below)
      if (s.y !== 13.15) { R.thing(s.x, s.y, (ctx) => queuer(ctx, s), { on: slotOn(n) }); return; }
      R.thing(s.x, s.y, (ctx) => queuer(ctx, s), { on: (t) => slotOn(n)(t) && !dodging(s.x, t) });
      const out = { ...s, y: 13.62, kind: 'dodge' };
      R.thing(s.x, out.y, (ctx) => queuer(ctx, out), { on: (t) => slotOn(n)(t) && dodging(s.x, t) });
    });
    // (And anyone walking along to the end of the line steps aside too.)
    const comers = NEWCOMERS.map((m) => (t) => { const p = m(t); return p && p.y > 12.6 && p.y < 13.5 && dodging(p.x, t) ? { ...p, y: 13.62, moving: false } : p; });
    SLEEPERS.forEach(([x, y, dir], i) => {
      const lane = LANES.find((ln) => ln.y === y);
      R.thing(x, y, (ctx) => sleeper(ctx, x, y, dir, look(400 + i * 11, 'traveler'), BAGS[i % BAGS.length], lane ? lane.tape : null), { on: night });
    });
    // The neck pillow: someone asleep on their feet, with a goose round their
    // neck. Not the goose.
    {
      const s = SLOTS[PILLOW];
      R.thing(s.x, s.y, (ctx) => queuer(ctx, s));
      R.decoy({ id: 'pillow', at: [11, 14.4, 2.3], r: 0.7, say: 'A neck pillow. Goose-shaped, sadly.' });
    }

    // The goose, in line since five like everyone else, with a little case of
    // its own. It shuffles up now and then and looks round; after six it sits.
    const GX = 15.0, GY = 16.3;
    R.thing(GX - 0.55, GY + 0.1, (ctx) => {
      bag(ctx, GX - 0.55, GY + 0.1, 0, { kind: 'case', color: INK.cranberry, s: 0.55, handle: true, along: 'x' });
    });
    R.goose((t) => {
      const s = lt(t);
      if (night(t)) return { x: GX, y: GY, z: 0, dir: 'r', pose: 'sit' };
      const k = (s % 9) / 9;
      const step = k > 0.6 && k < 0.7 ? (k - 0.6) / 0.1 : k >= 0.7 && k < 0.92 ? 1 : k >= 0.92 ? 1 - (k - 0.92) / 0.08 : 0;
      const look = ((s % 13) / 13) > 0.78;
      return { x: GX + step * 0.12, y: GY, z: 0, dir: look ? 'l' : 'r', pose: (k > 0.6 && k < 0.7) || k > 0.92 ? 'walk' : 'stand', moving: (k > 0.6 && k < 0.7) || k > 0.92 };
    }, { kind: 'hard', hint: 'It\'s been in line since five, like everyone else.' });

    // Grandma, back in line for the third time with an empty roasting pan.
    // Once her turkey's found she's got it, and she's beaming.
    R.thing(22, 16.3, (ctx, t) => grandma(ctx, 22, 16.3, t, R.found('grandma')), { anim: true });
    R.find({ id: 'grandma', label: 'The turkey\'s owner', after: 'security:turkey', at: [22, 16.3, 1.6], r: 0.9, riddle: 'On the X-ray: a 22-pound turkey, basted.' });

    // ---------- The man at the scale ----------
    // Two pounds over. He takes something out of his bag and puts it on, a
    // layer an hour.
    R.thing(9.6, 18.6, (ctx, t) => scaleMan(ctx, 9.6, 18.6, t), { anim: true });
    const scaleBag = R.poke({ id: 'scale-bag', at: [11.2, 18.9, 0.9], r: 0.8, say: 'Two pounds over.' });
    R.thing(11.2, 18.95, (ctx, t) => overstuffed(ctx, 11.2, 18.9, scaleBag.k(), t), { anim: true });
    R.find({ id: 'underpants', label: 'A pair of lucky underpants', kind: 'poke', inside: scaleBag, at: [11.2, 18.95, 1.0], r: 0.8, hint: 'The bag on the scale has one more thing he could wear.' });
    R.thing(11.95, 18.5, (ctx, t) => scaleDisplay(ctx, 11.95, 18.45, t), { anim: true });

    // ---------- The agents ----------
    ST.forEach((x0, k) => R.thing(x0 + 1.3, AGENT_Y, (ctx, t) => agent(ctx, x0 + 1.3, AGENT_Y, k, t, vip), { anim: true }));
    // Passengers at the desks, a different one every few hours (still).
    const SHIFTS = [[4, 8], [8, 12], [12, 15], [15, 18]];
    for (let k = 2; k < ST.length; k++) {
      SHIFTS.forEach(([a, b], i) => {
        const px = ST[k] + 2.0, lk = look(600 + k * 17 + i * 5, 'traveler');
        R.thing(px, PAX_Y, (ctx) => {
          person(ctx, px, PAX_Y, 0, { ...lk, hat: i % 2 ? lk.hat : null, pose: i === 1 ? 'read' : 'stand', dir: 'l', ...(i === 1 ? { hold: HOLD.phone } : {}), arms: i === 2 ? [0.9, 0.2] : undefined }, 0);
        }, { on: (t) => daytime(t) && hours(a, b)(t) });
      });
    }

    // ---------- The bags on the belts ----------
    for (const st of STREAMS) for (let j = 0; j < 3; j++) {
      R.mover((t) => streamBag(st, j, t) || { x: st.xs, y: 20, hidden: true }, (ctx, t, p) => {
        if (p.hidden) return;
        bag(ctx, p.x, p.y, p.z, p.look);
      });
    }
    // The rubber flaps where the belt goes through to the bag room, swinging
    // as a bag pushes through.
    R.thing(FLAP_X1, AIR, (ctx, t) => flaps(ctx, t), { anim: true, depth: FLAP_X1 + AIR + 0.2 });

    // ---------- The doors ----------
    const courier = R.walkers.find((w) => w.id === 'courier');
    const near = (p, a, b) => (p ? clamp(1.25 - Math.max(Math.abs(p.y - LAND - 0.2), Math.max(a - p.x, p.x - b, 0)) * 0.9, 0, 1) : 0);
    const doorK = [
      (t) => { const f = famAt(t); return Math.max(near(vip(t), ...DOORS[0]), near(nope(t), ...DOORS[0]), f && !f.hide ? near(f, ...DOORS[0]) : 0); },
      (t) => {
        if (lt(t) >= STUCK) return 1;
        let k = courier ? near(courier.at(t), ...DOORS[1]) : 0;
        for (const m of comers) k = Math.max(k, near(m(t), ...DOORS[1]));
        return k;
      },
    ];
    // (Sorted at the wall's back corner: everyone in the hall stands in front of them.)
    DOORS.forEach(([a, b], i) => R.thing((a + b) / 2, LAND + 0.4, (ctx, t) => slidingDoor(ctx, a, b, doorK[i](t)), { anim: true, depth: a - 1.4 + LAND }));
    // A doormat's worth of slush by the door that won't shut, from three, and
    // a WET FLOOR sign.
    R.thing(16.4, 12.75, (ctx) => wetFloor(ctx, 16.4, 12.72), { on: (t) => H(t) >= 15 || H(t) < 4.5 });

    // People coming in to join the end of the queue, one at a time.
    comers.forEach((m) => R.mover((t) => m(t) || { x: 18.6, y: 11.6, hidden: true }, (ctx, t, p) => {
      if (p.hidden) return;
      ctx.save();
      ctx.globalAlpha *= clamp((p.y - 11.6) / 0.5);
      roll(ctx, p, p.s, t);
      ctx.restore();
    }));
    // A man who walks in at the first door, sees the queue, and walks out.
    R.mover((t) => nope(t) || { x: 4.9, y: 11.6, hidden: true }, (ctx, t, p) => {
      if (p.hidden) return;
      ctx.save();
      ctx.globalAlpha *= clamp((p.y - 11.6) / 0.5);
      person(ctx, p.x, p.y, 0, { ...look(77, 'traveler', { hat: null }), pose: p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back }, t);
      ctx.restore();
      if (!p.moving && Q.detail) label(ctx, p.x, p.y, 2.75, 'NOPE.', 0.3, C.ink, 'Bagel Fat One');
    });
    // The priority passenger: in at the first door, straight down the red
    // carpet past everyone, served on the spot, off to security. A tiny dog.
    R.mover((t) => vip(t) || { x: 4.1, y: 11.6, hidden: true }, (ctx, t, p) => {
      if (p.hidden) return;
      ctx.save();
      ctx.globalAlpha *= clamp((p.y - 11.6) / 0.5) * clamp((29.6 - p.x) / 1.2);
      vipDraw(ctx, p, t);
      ctx.restore();
    });

    // ---------- The left end ----------
    // The terminal's sign, and a clock on a post with a kid flying round it.
    R.thing(1.0, 18.6, (ctx) => {
      for (const y of [15.6, 18.4]) box(ctx, 0.96, y - 0.05, 0, 0.1, 0.1, 2.5, C.ink, { flat: true, stroke: false });
      board(ctx, 'y', 1.0, 17.0, 2.85, 3.4, 1.0, [['TERMINAL C', 0.36, SIGN.ink, 'Bagel Fat One'], ['CHECK-IN · TICKETING', 0.17]], { board: SIGN.board });
    });
    // (Its post stands clear of the priority sign, so the kid never runs
    // under it from where we look.)
    const CX = 1.8, CY = 20.9;
    R.thing(CX, CY, (ctx) => {
      disc(ctx, CX, CY, 0.01, 0.3, C.ink, { lw: 0.02 });
      box(ctx, CX - 0.05, CY - 0.05, 0, 0.1, 0.1, 3.4, C.ink, { flat: true, stroke: false });
    });
    R.thing(CX, CY + 0.01, (ctx, t) => clock(ctx, CX, CY, 3.85, t), { anim: true });
    const kid = orbit(CX, CY, 0.85, 0.7, 6.5, 0);
    R.mover((t) => (daytime(t) ? kid(t) : { x: CX, y: CY, hidden: true }), (ctx, t, p) => {
      if (p.hidden) return;
      person(ctx, p.x, p.y, 0, { ...look(91, 'traveler', { hat: null, top: C.sky }), pose: 'run', dir: p.dir, back: p.back, scale: 0.6, arms: [1.57, -1.57] }, t);
    });
    // After six he's asleep on his dad's coat by the post.
    R.thing(2.9, 21.6, (ctx) => {
      rect(ctx, 2.0, 21.2, 1.7, 0.9, 0.01, C.navy, { lw: 0.02 });
      person(ctx, 2.52, 21.98, 0.05, { ...look(91, 'traveler', { hat: null, top: C.sky }), pose: 'sleep', dir: 'l', scale: 0.6 }, 0);
    }, { on: night });
    // The line starts here (it doesn't, by ten).
    R.thing(4.85, 13.62, (ctx) => {
      box(ctx, 4.82, 13.59, 0, 0.06, 0.06, 1.05, STEEL, { flat: true, lw: 0.015 });
      board(ctx, 'x', 4.85, 13.62, 1.25, 0.95, 0.36, [['LINE STARTS', 0.12], ['HERE ›', 0.12]], { board: SIGN.board, gap: 1.1 });
    });
    R.thing(16.6, 12.62, (ctx) => {
      // A cardboard sign taped to the glass by the door.
      face(ctx, [[16.15, 12.62, 0.45], [16.95, 12.62, 0.45], [16.95, 12.62, 0.95], [16.15, 12.62, 0.95]], C.woodLight, { lw: 0.025 });
      lettering(ctx, 'x', 16.55, 12.62, 0.8, 'NO, IT', 0.11, C.ink, 'Bagel Fat One');
      lettering(ctx, 'x', 16.55, 12.62, 0.62, 'STARTS HERE', 0.1, C.ink, 'Bagel Fat One');
    }, { on: (t) => lt(t) >= joins(48) });

    // ---------- Kiosks nobody can work ----------
    KIOSK.forEach((yc, i) => R.thing(27.78, yc + 0.38, (ctx) => kiosk(ctx, yc, i)));
    R.thing(27.8, 16.95, (ctx, t) => kioskScreens(ctx, t, kioskPoke.k()), { anim: true });
    const kioskPoke = R.poke({ id: 'kiosk', at: [27.4, 15.65, 1.3], r: 0.9, say: 'Please see an agent.', teach: true });
    // An old couple reading the screen, and a man losing a fight with his.
    R.thing(28.6, 14.85, (ctx) => {
      person(ctx, 29.15, 14.3, 0, { ...look(81, 'traveler', { hat: null, hair: C.greyLight, top: C.teal, style: 'curly' }), pose: 'point', dir: 'l', back: true }, 0);
      person(ctx, 28.55, 14.85, 0, { ...look(82, 'traveler', { hat: 'cap', hair: C.greyLight, top: C.mustard }), pose: 'stand', dir: 'l', back: true, arms: [1.3, 0.4] }, 0);
    }, { on: daytime });
    R.thing(28.65, 15.75, (ctx, t) => kioskFighter(ctx, 28.65, 15.75, t), { anim: true, on: daytime });
    R.thing(25.4, 16.2, (ctx) => sleeper(ctx, 25.4, 16.2, 'r', look(83, 'traveler', { hat: null }), C.ink, null), { on: night });
    // The passport, dropped among the receipts nobody wanted.
    R.rug((ctx) => passportAndLitter(ctx));
    R.find({ id: 'passport', label: 'A lost passport', kind: 'hard', at: [28.4, 17.6, 0.1], r: 0.75, riddle: 'Dropped where the machines aren\'t helping.', hint: 'Look down by the kiosks.' });

    // ---------- The oversize drop ----------
    R.thing(26.5, 21.6, (ctx) => oversizeBox(ctx));
    const over = R.poke({ id: 'oversize', at: [26.45, 20.6, 0.8], r: 0.85, sound: 'clunk', say: ['Oversize: a cello. And a canoe.', 'A deep fryer. For the turkey.', 'Somebody\'s whole drum kit.'] });
    R.thing(26.6, 21.65, (ctx, t) => shutter(ctx, over.k(), t), { anim: true });
    // A man with a canoe, measuring it again.
    R.thing(27.85, 22.7, (ctx) => canoe(ctx, 27.45, 19.65, 22.75), { depth: 27.85 + 21.2 });
    R.thing(28.5, 20.7, (ctx) => {
      person(ctx, 28.5, 20.7, 0, { ...look(85, 'traveler', { hat: 'beanie', top: C.green }), pose: 'stand', dir: 'l', arms: [1.6, 0.2], hold: (c) => { c.beginPath(); c.rect(0.0, -0.05, 0.08, 1.3); paint(c, C.wood, { lw: 0.02 }); c.beginPath(); c.ellipse(0.04, 1.35, 0.1, 0.22, 0, 0, Math.PI * 2); paint(c, C.wood, { lw: 0.02 }); } }, 0);
    }, { on: daytime });
    // How long security is, by the hour.
    SECURITY_WAIT.forEach(([a, b, text]) => R.thing(29.25, 23.05, (ctx) => {
      // An easel on the floor.
      line3(ctx, [[28.75, 23.25, 0], [28.8, 23.05, 1.4]], C.ink, 0.06);
      line3(ctx, [[29.75, 23.25, 0], [29.7, 23.05, 1.4]], C.ink, 0.06);
      line3(ctx, [[29.25, 22.6, 0], [29.25, 23.0, 1.3]], C.ink, 0.05);
      board(ctx, 'x', 29.25, 23.1, 0.98, 1.3, 0.72, [['SECURITY ›', 0.2, SIGN.ink, 'Bagel Fat One'], [`WAIT: ${text}`, 0.13, text === 'YES' || text === 'TOMORROW' ? C.red : C.white]], { board: SIGN.board });
    }, { on: hours(a, b) }));
    // Gander Cola, and a kid with his nose on the glass.
    R.thing(29.5, 25.4, (ctx) => vending(ctx, 28.3, 24.6));
    R.thing(28.85, 26.05, (ctx) => person(ctx, 28.85, 26.05, 0, { ...look(87, 'traveler', { hat: null, top: C.red }), dir: 'r', back: true, scale: 0.66, arms: [2.4, 2.2] }, 0), { on: daytime });
    // The luggage carts, nested, seven dollars each.
    R.thing(29.7, 28.8, (ctx) => cartRack(ctx));

    // ---------- The chapel ----------
    chapel(R);
    const chapelDoor = R.poke({ id: 'chapel', at: [6.85, 26.7, 1.2], r: 0.8, say: 'Quiet, please. Someone wants row one.' });
    R.thing(CH.x1, CH.door[1], (ctx) => chapelDoor_(ctx, chapelDoor.k()), { anim: true, depth: CH.x1 + CH.door[1] + 0.1 });
    R.thing(5.0, 27.35, (ctx, t) => prayer(ctx, 5.0, 27.35, t), { anim: true, depth: 5.0 + 27.35 });
    R.find({ id: 'praying', label: 'Someone praying for an upgrade', at: [5.1, 27.3, 2.5], r: 0.9 });
    R.thing(1.15, 24.95, (ctx, t) => candleLighter(ctx, 1.15, 24.95, t), { anim: true });
    for (const [x, y, z, r] of [[2.95, 24.4, 1.3, 1.6], [4.25, 24.4, 1.3, 1.6], [1.0, 24.35, 0.95, 1.2]]) {
      R.light({ at: [x, y, z], r, color: C.butter, k: (t) => 0.75 + Math.sin(t * 11 + x * 3) * 0.12 + Math.sin(t * 17 + y) * 0.08, draw: (ctx, t) => flame(ctx, x, y, z - 0.08, t) });
    }

    // ---------- The front of the hall ----------
    wrapMachine(R);
    family(R);
    thanksgiving(R);
    bench(R);
    trolley(R);
    const scrub = scrubber();
    R.mover(scrub, (ctx, t, p) => drawScrubber(ctx, p, t));

    // ---------- The snow, through the door that won't shut ----------
    R.air((ctx, t) => {
      const s = snowK(t), k = doorK[1](t);
      if (s < 0.02 || k < 0.5 || !Q.detail) return;
      ctx.fillStyle = alpha(C.white, 0.9);
      const n = Math.round(16 * s);
      for (let i = 0; i < n; i++) {
        const q = ((t * 0.35 + i * 0.137) % 1), a = (i * 0.618) % 1;
        const [X, Y] = P(17.4 + a * 2.2 + Math.sin(t * 2 + i) * 0.15, 11.8 + q * 2.2, 1.5 - q * 1.45);
        ctx.fillRect(X - 0.05, Y - 0.05, 0.1, 0.1);
      }
    });
    // Slush on the mat and past it (laid last: it fades in with the snow).
    R.rug((ctx) => {
      for (const [x, y, w, d] of [[17.3, 12.6, 2.4, 1.0], [17.8, 13.5, 1.6, 0.7], [18.4, 14.1, 0.8, 0.4]]) rect(ctx, x, y, w, d, 0.012, alpha(C.white, 0.75), { stroke: false });
      for (const [x, y] of [[18.2, 13.9], [19.1, 13.7], [17.6, 14.2]]) disc(ctx, x, y, 0.013, 0.22, alpha(C.sky, 0.5), { stroke: false });
    }, { fade: (t) => settle(t) });
  },
};

// ---------- Walls ----------
// The landside glass from x a to b along y 12: a sill, the glass, its frames,
// and the cut along the top.
function glassX(ctx, a, b, y) {
  box(ctx, a, y, 0, b - a, 0.4, 0.3, SILL, { flat: true, top: tint(SILL, 0.25), lw: 0.035 });
  face(ctx, [[a, y + 0.2, 0.3], [b, y + 0.2, 0.3], [b, y + 0.2, WALL_H], [a, y + 0.2, WALL_H]], GLASS, { stroke: false });
  const n = Math.max(1, Math.round((b - a) / 1.5));
  for (let i = 0; i <= n; i++) {
    const x = a + ((b - a) * i) / n;
    box(ctx, Math.min(x, b - 0.08), y + 0.14, 0.3, 0.08, 0.12, WALL_H - 0.3, FRAME, { flat: true, lw: 0.015 });
  }
  box(ctx, a, y + 0.12, WALL_H, b - a, 0.16, 0.05, C.ink, { flat: true, stroke: false });
}
// The end wall, along y at x.
function glassY(ctx, a, b, x) {
  box(ctx, x, a, 0, 0.4, b - a, 0.3, SILL, { flat: true, top: tint(SILL, 0.25), lw: 0.035 });
  face(ctx, [[x + 0.2, a, 0.3], [x + 0.2, b, 0.3], [x + 0.2, b, WALL_H], [x + 0.2, a, WALL_H]], GLASS, { stroke: false });
  const n = Math.max(1, Math.round((b - a) / 1.5));
  for (let i = 0; i <= n; i++) {
    const y = a + ((b - a) * i) / n;
    box(ctx, x + 0.14, Math.min(y, b - 0.08), 0.3, 0.12, 0.08, WALL_H - 0.3, FRAME, { flat: true, lw: 0.015 });
  }
  box(ctx, x + 0.12, a, WALL_H, 0.16, b - a, 0.05, C.ink, { flat: true, stroke: false });
}

// ---------- Counters ----------
// The airlines (lookalikes, style.js LIVERY) over each station: [title, the
// small print by day, after the ground stop, board, ink].
const AIRLINE = [
  ['SPITE GOLD', 'PRIORITY · NO WAITING', 'PRIORITY · NO WAITING', C.ink, INK.signal],
  ['SPITE', 'ORLANDO · ON TIME', 'ORLANDO · ON TIME', LIVERY.spite.tail, C.ink],
  ['JETBLEW', 'BAGS FLY FREE*', 'CANCELED', LIVERY.jetblew.tail, C.white],
  ['NORTHEAST', 'ALL FLIGHTS · EVENTUALLY', 'CANCELED', LIVERY.northeast.tail, C.white],
  ['BAG DROP', 'NOT THAT BAG', 'CLOSED', SIGN.board, SIGN.ink],
];
function desk(R, x0, k) {
  const w = k === 0 ? 3.8 : 2.6, x1 = x0 + w;
  const [title, , , boardCol] = AIRLINE[k];
  R.thing(x0 + w / 2, (DESK_Y0 + DESK_Y1) / 2, (ctx) => {
    box(ctx, x0, DESK_Y0, 0, w, DESK_Y1 - DESK_Y0, 1.08, DESK, { top: STEEL, flat: true, lw: 0.04 });
    // The agent's side: the knee space, a shelf of tags, the airline's band.
    face(ctx, [[x0 + 0.25, DESK_Y1, 0.05], [x1 - 0.25, DESK_Y1, 0.05], [x1 - 0.25, DESK_Y1, 0.8], [x0 + 0.25, DESK_Y1, 0.8]], shade(DESK, 0.45), { lw: 0.025 });
    face(ctx, [[x0, DESK_Y1, 0.86], [x1, DESK_Y1, 0.86], [x1, DESK_Y1, 1.0], [x0, DESK_Y1, 1.0]], boardCol, { stroke: false });
    if (!Q.detail) return;
    // A screen facing the agent (and us), a tag printer, a pot of pens.
    box(ctx, x0 + 0.55, DESK_Y0 + 0.25, 1.08, 0.08, 0.12, 0.08, C.ink, { flat: true, stroke: false });
    box(ctx, x0 + 0.3, DESK_Y0 + 0.3, 1.16, 0.7, 0.07, 0.48, C.ink, { flat: true, lw: 0.02 });
    face(ctx, [[x0 + 0.34, DESK_Y0 + 0.375, 1.2], [x0 + 0.96, DESK_Y0 + 0.375, 1.2], [x0 + 0.96, DESK_Y0 + 0.375, 1.6], [x0 + 0.34, DESK_Y0 + 0.375, 1.6]], k === 1 ? C.red : C.teal, { stroke: false });
    for (let i = 0; i < 3; i++) face(ctx, [[x0 + 0.4, DESK_Y0 + 0.376, 1.5 - i * 0.1], [x0 + 0.8 - i * 0.1, DESK_Y0 + 0.376, 1.5 - i * 0.1]], null, { lw: 0.025, stroke: alpha(C.white, 0.7) });
    box(ctx, x0 + 1.5, DESK_Y0 + 0.3, 1.08, 0.45, 0.4, 0.22, C.grey, { flat: true, lw: 0.02 });
    face(ctx, [[x0 + 1.62, DESK_Y0 + 0.7, 1.1], [x0 + 1.84, DESK_Y0 + 0.7, 1.1], [x0 + 1.84, DESK_Y0 + 1.0, 1.0], [x0 + 1.62, DESK_Y0 + 1.0, 1.0]], C.white, { lw: 0.015 });
    if (k === 0) {
      // Priority has a vase of lilies and a bowl of mints.
      box(ctx, x0 + 2.6, DESK_Y0 + 0.3, 1.08, 0.18, 0.18, 0.32, C.white, { flat: true, lw: 0.02 });
      for (const [dx, dz, c] of [[0, 0.5, C.white], [0.12, 0.6, C.pink], [-0.1, 0.62, C.white]]) disc(ctx, x0 + 2.69 + dx, DESK_Y0 + 0.39, 1.08 + dz, 0.09, c, { lw: 0.015 });
      disc(ctx, x0 + 3.2, DESK_Y0 + 0.55, 1.1, 0.16, C.white, { lw: 0.02 });
    }
    void title;
  });
  // The airline's sign, hung over the desk's far end, just left of the agent
  // (so from where we look it never stands over a scale or a passenger's head).
  const [, byDay, byNight, bc, ink] = AIRLINE[k];
  const sx = x0 + 0.6, sy = 21.75, sz = 3.3, sw = 1.5;
  R.thing(sx, sy, (ctx) => {
    for (const e of [-sw / 2 + 0.15, sw / 2 - 0.15]) box(ctx, sx + e - 0.02, sy - 0.02, sz + 0.3, 0.04, 0.04, 1.4, C.ink, { flat: true, stroke: false });
    board(ctx, 'x', sx, sy, sz + 0.06, sw, 0.5, [[title, title.length > 8 ? 0.22 : 0.27, ink, 'Bagel Fat One']], { board: bc });
  });
  for (const [text, when] of [[byDay, daytime], [byNight, night]]) {
    R.thing(sx, sy + 0.01, (ctx) => {
      const canceled = text === 'CANCELED' || text === 'CLOSED';
      board(ctx, 'x', sx, sy + 0.01, sz - 0.32, sw, 0.2, [[text, 0.11, canceled ? C.red : C.ink]], { board: canceled ? C.white : tint(bc, 0.75), edge: 0.02 });
    }, { on: when });
  }
}

// One piece of a belt: its frame, the black rubber running on top, and a
// rail along each side.
function belt(ctx, axis, u0, u1, a, b) {
  if (axis === 'x') {
    barX(ctx, u0, u1, BELT_Y0, BELT_Y1, 0, BELT_H, BELT_SIDE, { a, b, top: RUBBER });
    if (Q.detail) for (const yy of [BELT_Y0 + 0.06, BELT_Y1 - 0.06]) line3(ctx, [[u0, yy, BELT_H + 0.07], [u1, yy, BELT_H + 0.07]], STEEL, 0.05);
  } else {
    barY(ctx, u0, u1, LEG_X0, LEG_X1, 0, BELT_H, BELT_SIDE, { a, b, top: RUBBER });
    if (Q.detail) for (const xx of [LEG_X0 + 0.06, LEG_X1 - 0.06]) line3(ctx, [[xx, u0, BELT_H + 0.07], [xx, u1, BELT_H + 0.07]], STEEL, 0.05);
  }
}

// ---------- Grandma ----------
function grandma(ctx, x, y, t, happy) {
  const sleepy = night(t) && !happy;
  person(ctx, x, y, 0, {
    skin: SKIN[5], hair: C.greyLight, style: 'bun', top: C.purple, bottom: C.grey, dress: true, scale: 0.9,
    pose: happy ? 'stand' : 'carry', dir: 'r', arms: happy ? [Math.PI - 0.45, -Math.PI + 0.45] : [1.2, 1.2],
    hold: (c) => roastingPan(c, happy),
    face: (c, hy, bk) => {
      // Glasses, and her mouth: set firm, or beaming.
      c.strokeStyle = C.ink; c.lineWidth = 0.025;
      c.beginPath(); c.arc(0.1, hy + 0.02, 0.07, 0, Math.PI * 2); c.arc(0.25, hy + 0.02, 0.07, 0, Math.PI * 2); c.stroke();
      c.beginPath();
      if (happy) c.arc(0.17, hy + 0.1, 0.08, 0.2, Math.PI - 0.2);
      else { c.moveTo(0.11, hy + 0.17); c.lineTo(0.23, hy + 0.16); }
      c.stroke();
      if (sleepy && !bk) eyesShut(c, hy);
    },
  }, t);
  if (happy && Q.detail) {
    // Little sparks of joy.
    for (let i = 0; i < 3; i++) {
      const k = ((t * 0.7 + i / 3) % 1), [X, Y] = P(x - 0.6 + i * 0.6, y + 0.2, 2.4 + k * 0.8), r = 0.14 * (1 - k * 0.5);
      ctx.fillStyle = alpha(C.mustard, 1 - k);
      ctx.beginPath();
      for (let j = 0; j < 8; j++) { const a = (j / 8) * Math.PI * 2, rr = j % 2 ? r * 0.35 : r; ctx.lineTo(X + Math.cos(a) * rr, Y + Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill();
    }
  }
}
// The roasting pan (in her hands, her units): empty, held out in front; or
// with the turkey in it, held up over her head in triumph.
function roastingPan(ctx, full) {
  ctx.save();
  if (full) { ctx.translate(-0.33, -0.97); ctx.scale(1.15, 1.15); } else ctx.translate(0.3, 0);
  ctx.beginPath(); ctx.moveTo(-0.45, -0.05); ctx.lineTo(0.45, -0.05); ctx.lineTo(0.36, 0.13); ctx.lineTo(-0.36, 0.13); ctx.closePath();
  paint(ctx, C.grey, { lw: 0.03, dots: shade(C.grey, 0.4), density: 0.2 });
  for (const hx of [-0.5, 0.5]) { ctx.beginPath(); ctx.ellipse(hx, -0.02, 0.07, 0.04, 0, 0, Math.PI * 2); paint(ctx, C.grey, { lw: 0.02 }); }
  if (full) {
    // Twenty-two pounds, roasted gold, two drumsticks with paper frills.
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(s * 0.3, -0.3, 0.1, 0.15, s * 0.7, 0, Math.PI * 2); paint(ctx, C.wood, { lw: 0.025 });
      ctx.beginPath(); ctx.arc(s * 0.4, -0.44, 0.05, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.015 });
    }
    ctx.beginPath(); ctx.ellipse(0, -0.2, 0.38, 0.24, 0, Math.PI, 0); ctx.closePath();
    paint(ctx, C.wood, { lw: 0.03, dots: C.brown, density: 0.22 });
    ctx.beginPath(); ctx.ellipse(-0.06, -0.3, 0.14, 0.06, -0.2, 0, Math.PI * 2); ctx.fillStyle = alpha(C.white, 0.45); ctx.fill();
  }
  ctx.restore();
}

// ---------- The man at the scale ----------
// What he takes out of his bag and puts on, an hour at a time from 6am.
const GARB = [
  { c: INK.cranberry }, { c: C.green }, { c: C.mustard }, { scarf: C.red }, { hat: 'beanie' }, { c: C.navy }, { c: C.teal },
  { goggles: true }, { c: INK.signal }, { hat: 'cap' }, { c: C.coral }, { hat: 'sun' }, { c: C.white }, { snorkel: true },
];
const layersAt = (t) => clamp(Math.floor(H(t) - 5), 0, GARB.length);
function scaleMan(ctx, x, y, t) {
  const n = layersAt(t), h = H(t), f = h - Math.floor(h);
  const worn = GARB.slice(0, n);
  const coats = worn.filter((g) => g.c).map((g) => g.c);
  const has = (key) => worn.some((g) => g[key]);
  const done = n >= GARB.length, asleep = night(t);
  // The hour's business: argue, rummage, then pull the next thing on.
  let arms = [0.15, -0.15], pulling = null;
  if (!done && !asleep) {
    if (f > 0.55 && f < 0.75) arms = [1.0 + Math.sin(t * 9) * 0.15, 0.7];
    else if (f >= 0.75) { arms = [Math.PI - 0.35, -Math.PI + 0.35]; pulling = { g: GARB[n], k: (f - 0.75) / 0.25 }; }
    else arms = Math.sin(t * 1.3) > 0.4 ? [1.4, 0.2] : [0.25, -0.25];
  }
  const r = Math.min(0.85, 0.3 + coats.length * 0.065);
  person(ctx, x, y, 0, {
    skin: SKIN[1], hair: HAIR[2], style: 'short', top: coats[coats.length - 1] || C.sky, bottom: C.ink, dir: 'r', pose: 'stand', arms,
    wear: (c, b) => {
      if (!coats.length && !has('scarf')) return;
      const cy = (b.top + b.hipY) / 2 + 0.02;
      // Every layer, outermost first, each inner one peeking out higher up:
      // a striped ball of everything he owns.
      for (let i = coats.length - 1; i >= 0; i--) {
        const rr = 0.3 + (i + 1) * 0.065 * (r / Math.max(0.3, 0.3 + coats.length * 0.065));
        c.beginPath(); c.ellipse(0, cy - (coats.length - 1 - i) * 0.05, Math.min(r, rr), Math.min(r, rr) * 0.98, 0, 0, Math.PI * 2);
        paint(c, coats[i], { lw: 0.035, dots: i === coats.length - 1 ? shade(coats[i], 0.4) : null, density: 0.12 });
      }
      if (has('scarf')) {
        c.beginPath(); c.ellipse(0.02, b.top + 0.02, 0.26, 0.09, 0, 0, Math.PI * 2); paint(c, C.red, { lw: 0.025 });
        c.beginPath(); c.rect(0.1, b.top + 0.05, 0.1, 0.45); paint(c, C.red, { lw: 0.02 });
      }
    },
    face: (c, hy, bk) => {
      if (asleep && !bk) eyesShut(c, hy);
      if (has('goggles')) {
        c.beginPath(); c.rect(-0.3, hy - 0.2, 0.64, 0.07); paint(c, C.ink, { stroke: false });
        for (const gx of [0.08, 0.26]) { c.beginPath(); c.ellipse(gx, hy - 0.18, 0.09, 0.06, 0, 0, Math.PI * 2); paint(c, INK.safety, { lw: 0.02 }); }
      }
      if (has('snorkel')) {
        c.beginPath(); c.roundRect(0.0, hy - 0.08, 0.36, 0.18, 0.07); paint(c, alpha(C.sky, 0.75), { lw: 0.03 });
        c.beginPath(); c.moveTo(0.3, hy + 0.16); c.quadraticCurveTo(0.42, hy + 0.1, 0.4, hy - 0.2); c.lineTo(0.4, hy - 0.62);
        c.strokeStyle = C.ink; c.lineWidth = 0.09; c.lineCap = 'round'; c.stroke();
        c.strokeStyle = INK.signal; c.lineWidth = 0.05; c.stroke();
      }
      // Hats, stacked as they come.
      let top = hy - 0.06;
      if (has('hat') && worn.some((g) => g.hat === 'beanie')) { c.beginPath(); c.arc(0.02, top, 0.34, Math.PI, 0); paint(c, C.mustard); c.beginPath(); c.arc(0.02, top - 0.36, 0.08, 0, Math.PI * 2); paint(c, C.coral); top -= 0.36; }
      if (worn.some((g) => g.hat === 'cap')) { c.beginPath(); c.arc(0.02, top - 0.02, 0.26, Math.PI, 0); c.closePath(); paint(c, C.teal); c.beginPath(); c.rect(0.1, top - 0.06, 0.32, 0.06); paint(c, C.teal, { lw: 0.025 }); top -= 0.28; }
      if (worn.some((g) => g.hat === 'sun')) { c.beginPath(); c.ellipse(0.02, top - 0.02, 0.48, 0.1, 0, 0, Math.PI * 2); paint(c, C.butter); c.beginPath(); c.arc(0.02, top - 0.04, 0.22, Math.PI, 0); paint(c, C.butter); }
      // The next thing, coming down over his head.
      if (pulling && Q.detail) {
        const { g, k } = pulling;
        const col = g.c || g.scarf || (g.hat === 'beanie' ? C.mustard : g.hat === 'cap' ? C.teal : g.hat === 'sun' ? C.butter : g.goggles ? INK.safety : INK.signal);
        c.beginPath(); c.ellipse(0.02, hy - 0.9 + k * 0.5, 0.3 + (g.c ? 0.12 : 0), 0.2, 0, 0, Math.PI * 2); paint(c, col, { lw: 0.03 });
      }
    },
  }, asleep ? 0 : t);
  if (asleep && Q.detail) { const k = (t * 0.6) % 1; label(ctx, x - 0.3 - 0.3 * k, y - 0.3 - 0.3 * k, 2.8 + k, 'z', 0.4 + k * 0.3, alpha(C.ink, 1 - k)); }
}
// The scale's display: two pounds over, and after fourteen layers a tenth.
function scaleDisplay(ctx, x, y, t) {
  const n = layersAt(t);
  const kg = (52 - n * 0.135).toFixed(1);
  box(ctx, x - 0.03, y - 0.03, 0, 0.06, 0.06, 1.0, C.ink, { flat: true, stroke: false });
  board(ctx, 'x', x, y, 1.12, 0.62, 0.3, [[`${kg}`, 0.18, Math.sin(t * 6) > -0.2 ? C.red : shade(C.red, 0.5), 'Bagel Fat One']], { board: C.black, edge: 0.03 });
}
// His bag on the scale: an overstuffed case, a sleeve out of the zip, the lid
// straining. Open, the lid's up on a heap of clothes and the lucky pants.
function overstuffed(ctx, x, y, k, t) {
  const w = 0.95, d = 0.66, h = 0.3, z = 0.38;
  const x0 = x - w / 2, y0 = y - d / 2;
  const bulge = 0.04 + Math.max(0, Math.sin(t * 2.4)) * 0.025 * (1 - k);
  box(ctx, x0, y0, z, w, d, h, C.navy, { lw: 0.035 });
  if (k > 0.05) {
    // Inside: a heap of clothes, and on top the underpants.
    rect(ctx, x0 + 0.05, y0 + 0.05, w - 0.1, d - 0.1, z + h - 0.01, shade(C.navy, 0.4), { stroke: false });
    for (const [dx, dy, c] of [[-0.22, -0.1, C.mustard], [0.18, -0.12, C.teal], [-0.05, 0.12, C.red], [0.25, 0.14, C.white]]) disc(ctx, x + dx, y + dy, z + h + 0.03, 0.17, c, { lw: 0.02 });
    underpants(ctx, x + 0.02, y + 0.05, z + h + 0.1);
  }
  // The lid, hinged at the back, up to nearly upright.
  const a = k * 1.45, c = Math.cos(a), s = Math.sin(a);
  const hz = z + h;
  const lid = [[x0, y0, hz], [x0 + w, y0, hz], [x0 + w, y0 + d * c, hz + d * s + bulge * c], [x0, y0 + d * c, hz + d * s + bulge * c]];
  face(ctx, lid, tint(C.navy, 0.12), { lw: 0.035, dots: k < 0.5 ? null : shade(C.navy, 0.5), density: 0.15 });
  if (k < 0.3 && Q.detail) {
    // A sleeve escaping the zip, and a HEAVY tag.
    const [X, Y] = P(x0 + w * 0.6, y0 + d, hz);
    ctx.beginPath(); ctx.moveTo(X - 0.08, Y - 0.02); ctx.quadraticCurveTo(X + 0.05, Y + 0.18, X + 0.2, Y + 0.12);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.lineCap = 'round'; ctx.stroke();
    ctx.strokeStyle = C.green; ctx.lineWidth = 0.06; ctx.stroke();
    const [TX, TY] = P(x0 + w, y0 + d * 0.5, hz - 0.05);
    ctx.beginPath(); ctx.rect(TX - 0.02, TY, 0.22, 0.12); paint(ctx, INK.safety, { lw: 0.02 });
  }
}
function underpants(ctx, x, y, z) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.beginPath();
  ctx.moveTo(-0.28, -0.12); ctx.lineTo(0.28, -0.12); ctx.lineTo(0.24, 0.02); ctx.quadraticCurveTo(0.08, 0.04, 0.05, 0.16);
  ctx.lineTo(-0.05, 0.16); ctx.quadraticCurveTo(-0.08, 0.04, -0.24, 0.02); ctx.closePath();
  paint(ctx, C.green, { lw: 0.03 });
  ctx.fillStyle = C.white; ctx.fillRect(-0.28, -0.12, 0.56, 0.04);
  // Shamrocks.
  ctx.fillStyle = C.leaf;
  for (const [sx, sy] of [[-0.15, -0.03], [0.13, -0.04], [0.0, 0.06]]) {
    for (const [dx, dy] of [[-0.022, 0], [0.022, 0], [0, -0.024]]) { ctx.beginPath(); ctx.arc(sx + dx, sy + dy, 0.02, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}

// ---------- Walks ----------
// A walk through points [x, y, pause?] at speed (units a second): (s) => where
// they are s seconds in ({ x, y, dir, back, moving }), or null outside it.
function path(pts, speed = 1.5) {
  const segs = [];
  let T = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const d = Math.hypot(bx - ax, by - ay) / speed;
    segs.push({ t0: T, d, ax, ay, bx, by, dx: bx - ax, dy: by - ay });
    T += d;
    if (pts[i + 1][2]) { segs.push({ t0: T, d: pts[i + 1][2], ax: bx, ay: by, bx, by, dx: bx - ax, dy: by - ay, still: true }); T += pts[i + 1][2]; }
  }
  const f = (s) => {
    if (!(s >= 0 && s <= T)) return null;
    const g = segs.find((q) => s <= q.t0 + q.d) || segs[segs.length - 1];
    const k = g.d ? clamp((s - g.t0) / g.d) : 1;
    return { x: g.ax + (g.bx - g.ax) * k, y: g.ay + (g.by - g.ay) * k, dir: g.dx - g.dy >= 0 ? 'r' : 'l', back: g.dx + g.dy < -0.01, moving: !g.still, phase: s * 7 };
  };
  f.T = T;
  return f;
}

// People joining the end of the queue: each walks in at the second door and
// along to their place, arriving just as their still picture takes over.
const ARRIVALS = [];
for (let n = BASE; n < SLOTS.length; n++) {
  const s = SLOTS[n];
  let pts;
  if (s.y === 14.4) pts = [[18.7, 11.6], [18.6, 12.95], [5.75, 13.1], [5.75, 14.4], [s.x, 14.4]];
  else if (s.y === 13.15) pts = [[18.7, 11.6], [18.6, 12.95], [s.x, 13.15]];
  else pts = [[18.7, 11.6], [s.x, s.y]];
  const f = path(pts, 1.5);
  ARRIVALS.push({ n, s, f, start: joins(n) - f.T });
}
const NEWCOMERS = [0, 1, 2].map((m) => (t) => {
  const tt = lt(t);
  if (tt >= NIGHT) return null;
  for (const a of ARRIVALS) {
    if ((a.n - BASE) % 3 !== m || tt < a.start || tt >= a.start + a.f.T) continue;
    const p = a.f(tt - a.start);
    return p && { ...p, s: a.s };
  }
  return null;
});
function roll(ctx, p, s, t) {
  roller(ctx, p, { ...s.lk, scale: s.scale }, t, { color: s.bag.color, kind: 'case' });
}

// The priority passenger, three times a day.
const VIP_WALK = path([[4.1, 11.6], [4.1, 17.5], [5.6, 18.05, 3.5], [8.4, 17.4], [29.6, 17.65]], 1.7);
const VIP_AT = [at(9.6), at(12.5), at(16)];
function vip(t) {
  const tt = lt(t);
  for (const t0 of VIP_AT) if (tt >= t0 && tt < t0 + VIP_WALK.T) return VIP_WALK(tt - t0);
  return null;
}
function vipDraw(ctx, p, t) {
  person(ctx, p.x, p.y, 0, {
    skin: SKIN[0], hair: C.mustard, style: 'long', top: C.white, bottom: C.ink, dress: true, pose: p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back,
    arms: p.moving ? undefined : [1.3, 0.2],
    hold: (c) => {
      // A very small dog.
      c.beginPath(); c.ellipse(0.1, 0.0, 0.17, 0.11, 0, 0, Math.PI * 2); paint(c, C.white, { lw: 0.025 });
      c.beginPath(); c.arc(0.27, -0.08, 0.08, 0, Math.PI * 2); paint(c, C.white, { lw: 0.02 });
      c.fillStyle = C.ink; c.beginPath(); c.arc(0.3, -0.09, 0.018, 0, Math.PI * 2); c.fill();
    },
    face: (c, hy, bk) => {
      if (bk) return;
      c.fillStyle = C.ink;
      c.beginPath(); c.roundRect(0.03, hy - 0.04, 0.13, 0.08, 0.03); c.roundRect(0.19, hy - 0.04, 0.13, 0.08, 0.03); c.fill();
    },
  }, t);
}

// The man who comes in at the first door, sees the queue, and leaves.
const NOPE_WALK = path([[4.9, 11.6], [4.9, 12.9, 1.8], [4.9, 11.6]], 1.3);
function nope(t) {
  const tt = lt(t);
  if (tt >= NIGHT) return null;
  const s = (tt % 31) - 5;
  return s >= 0 && s < NOPE_WALK.T ? NOPE_WALK(s) : null;
}

// ---------- The belts' bags ----------
// A bag from each counter every ten seconds: four seconds on the scale while
// it's tagged, then back along its little belt, along the main belt, and down
// to the flaps. The three counters' bags fall in between each other on the
// main belt (their phases are worked out so they never meet). None after six.
const V = 0.9, EVERY = 10, SIT = 4;
const STREAMS = [{ k: 2, xs: 15.2, phase: 0 }, { k: 3, xs: 19.2, phase: 1.11 }, { k: 4, xs: 23.2, phase: 2.22 }];
const LEG_A = 22.8 - 18.9;
const runOf = (xs) => LEG_A + (26.45 - xs) + (30.1 - 22.8);
function streamBag(st, j, t) {
  const tt = lt(t);
  const n = Math.floor((tt + SIT - st.phase) / EVERY) - j;
  const tau = st.phase + n * EVERY;
  if (tau - SIT < 0 || tau - SIT >= NIGHT) return null;
  const s = (tt - tau) * V;
  if (tt < tau - SIT || s > runOf(st.xs)) return null;
  let x, y, ax;
  if (s <= 0) { x = st.xs; y = 18.9; ax = 'y'; }
  else if (s < LEG_A) { x = st.xs; y = 18.9 + s; ax = 'y'; }
  else if (s < LEG_A + 26.45 - st.xs) { x = st.xs + s - LEG_A; y = 22.8; ax = 'x'; }
  else { x = 26.45; y = 22.8 + (s - LEG_A - (26.45 - st.xs)); ax = 'y'; }
  const z = y < DESK_Y0 ? 0.38 : y < BELT_Y0 ? 0.42 : BELT_H;
  return { x, y, z, n, look: bagLook(st.k, n, ax) };
}
function bagLook(k, n, ax) {
  const r = rnd(k * 101 + n * 7 + 3);
  const a = r(), kind = a < 0.66 ? 'case' : a < 0.88 ? 'duffel' : 'box';
  const color = kind === 'box' ? undefined : BAGS[Math.floor(r() * BAGS.length)];
  return { kind, color, along: ax, lie: true, fragile: r() < 0.18, tag: r() < 0.5 ? INK.safety : C.white };
}
const onScale = (k, t) => { const st = STREAMS.find((s) => s.k === k); const p = st && streamBag(st, 0, t); return !!(p && p.y <= 18.95 && lt(t) < NIGHT); };
function flaps(ctx, t) {
  let push = 0;
  for (const st of STREAMS) for (let j = 0; j < 3; j++) {
    const p = streamBag(st, j, t);
    if (p && p.x > 26 && Math.abs(p.y - 29.75) < 0.7) push = Math.max(push, 1 - Math.abs(p.y - 29.75) / 0.7);
  }
  const y = 29.78, x0 = 25.75, x1 = 27.15;
  for (const x of [x0, x1]) box(ctx, x - 0.07, y - 0.07, 0, 0.14, 0.14, 1.3, FRAME, { flat: true, lw: 0.025 });
  box(ctx, x0 - 0.07, y - 0.08, 1.22, x1 - x0 + 0.14, 0.16, 0.14, INK.signal, { flat: true, lw: 0.025 });
  const n = 7, w = (x1 - x0 - 0.1) / n;
  for (let i = 0; i < n; i++) {
    const a = x0 + 0.05 + i * w, sw = push * (0.32 + 0.06 * Math.sin(i * 2.1 + t * 9)), lift = push * 0.1;
    face(ctx, [[a, y, 1.22], [a + w * 0.92, y, 1.22], [a + w * 0.92, y + sw, 0.5 + lift], [a, y + sw, 0.5 + lift]], alpha(C.black, 0.88), { lw: 0.015 });
  }
}

// ---------- The doors ----------
function slidingDoor(ctx, a, b, k) {
  const w = (b - a) / 2, s = k * (w - 0.2), y = LAND + 0.2;
  for (const [x0, d] of [[a, -1], [a + w, 1]]) {
    const x = x0 + d * s;
    face(ctx, [[x, y, 0.04], [x + w, y, 0.04], [x + w, y, WALL_H], [x, y, WALL_H]], alpha(C.sky, 0.4), { lw: 0.03, stroke: FRAME });
    face(ctx, [[x, y, 0.04], [x + w, y, 0.04], [x + w, y, 0.16], [x, y, 0.16]], FRAME, { stroke: false });
    if (Q.detail) line3(ctx, [[x + (d < 0 ? w - 0.12 : 0.12), y + 0.01, 0.45], [x + (d < 0 ? w - 0.12 : 0.12), y + 0.01, 0.85]], C.ink, 0.04);
    box(ctx, x, y - 0.06, WALL_H, w, 0.12, 0.04, C.ink, { flat: true, stroke: false });
  }
}
function wetFloor(ctx, x, y) {
  const c = INK.signal;
  face(ctx, [[x - 0.25, y - 0.15, 0], [x + 0.25, y - 0.15, 0], [x + 0.2, y, 0.75], [x - 0.2, y, 0.75]], shade(c, 0.12), { lw: 0.025 });
  face(ctx, [[x - 0.25, y + 0.15, 0], [x + 0.25, y + 0.15, 0], [x + 0.2, y, 0.75], [x - 0.2, y, 0.75]], c, { lw: 0.025 });
  if (Q.detail) {
    lettering(ctx, 'x', x, y + 0.09, 0.48, 'WET', 0.1, C.ink, 'Bagel Fat One');
    lettering(ctx, 'x', x, y + 0.12, 0.3, 'FLOOR', 0.08, C.ink, 'Bagel Fat One');
  }
}

// ---------- The clock ----------
function clock(ctx, x, y, z, t) {
  const h = H(t) % 12, m = H(t) % 1;
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.beginPath(); ctx.arc(0, 0, 0.5, 0, Math.PI * 2); paint(ctx, C.ink, { lw: 0.04 });
  ctx.beginPath(); ctx.arc(0, 0, 0.42, 0, Math.PI * 2); paint(ctx, C.white, { stroke: false });
  if (Q.detail) {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ctx.moveTo(Math.sin(a) * 0.34, -Math.cos(a) * 0.34); ctx.lineTo(Math.sin(a) * 0.4, -Math.cos(a) * 0.4); }
    ctx.stroke();
  }
  ctx.lineCap = 'round';
  const ha = (h / 12) * Math.PI * 2, ma = m * Math.PI * 2;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.06; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(ha) * 0.22, -Math.cos(ha) * 0.22); ctx.stroke();
  ctx.lineWidth = 0.04; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(ma) * 0.34, -Math.cos(ma) * 0.34); ctx.stroke();
  ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(0, 0, 0.04, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ---------- The agents ----------
const AGENTS = ST.map((_, k) => look(500 + k * 13, 'agent', { hat: null, style: ['bun', 'short', 'pony', 'curly', 'bun'][k] }));
const scarf = (c, b) => { c.beginPath(); c.ellipse(0.02, b.top + 0.04, 0.24, 0.08, 0, 0, Math.PI * 2); paint(c, INK.cranberry, { lw: 0.02 }); };
function agent(ctx, x, y, k, t, vipFn) {
  const lk = { ...AGENTS[k], wear: scarf };
  if (night(t)) {
    // Asleep on a stool, arms folded on the desk.
    box(ctx, x - 0.18, y - 0.1, 0, 0.36, 0.36, 0.72, C.ink, { flat: true, lw: 0.02 });
    person(ctx, x, y, -0.06, { ...lk, pose: 'sit', dir: 'r', back: true, arms: [1.7, 1.6] }, 0);
    if (Q.detail) { const q = (t * 0.6 + k * 0.3) % 1; label(ctx, x + 0.3 + 0.3 * q, y - 0.3 - 0.3 * q, 2.3 + q, 'z', 0.35 + q * 0.25, alpha(C.ink, 1 - q)); }
    return;
  }
  let o = { arms: [1.05 + Math.sin(t * 13 + k) * 0.12, 0.95 + Math.sin(t * 11 + k * 2) * 0.12] }; // typing
  if (k === 0) {
    const v = vipFn(t);
    o = v && !v.moving && v.x > 5 ? { pose: 'wave' } : { arms: [1.45, 1.2 + Math.sin(t * 14) * 0.12] }; // her nails, or a welcome
  } else if (k === 1) {
    o = (t % 7) > 4.6 ? { pose: 'point' } : { arms: [0.95, 0.95] }; // arms folded; then the display, again
  } else if (onScale(k, t)) o = { arms: [1.6 + Math.sin(t * 7) * 0.1, 0.5] }; // tagging the bag on the scale
  person(ctx, x, y, 0, { ...lk, ...o, dir: 'r', back: true }, t);
}

// ---------- Kiosks ----------
const KIOSK_COL = tint(INK.harbor, 0.55);
function kiosk(ctx, yc, i) {
  {
    const y0 = yc - 0.4, y1 = yc + 0.38;
    box(ctx, 27.0, y0, 0, 0.75, y1 - y0, 1.0, C.white, { flat: true, lw: 0.03 });
    solid(ctx, hexa([[27.0, y0, 1.0], [27.78, y0, 1.0], [27.78, y1, 1.0], [27.0, y1, 1.0]], [[27.0, y0, 1.62], [27.38, y0, 1.62], [27.38, y1, 1.62], [27.0, y1, 1.62]], KIOSK_COL));
    if (!Q.detail) return;
    // The card reader and the printer's slot.
    face(ctx, [[27.76, yc - 0.25, 0.75], [27.76, yc - 0.05, 0.75], [27.76, yc - 0.05, 0.88], [27.76, yc - 0.25, 0.88]], C.ink, { lw: 0.015 });
    face(ctx, [[27.76, yc + 0.02, 0.55], [27.76, yc + 0.3, 0.55], [27.76, yc + 0.3, 0.6], [27.76, yc + 0.02, 0.6]], C.ink, { stroke: false });
    face(ctx, [[27.0, y1, 0.86], [27.75, y1, 0.86], [27.75, y1, 0.96], [27.0, y1, 0.96]], INK.signal, { stroke: false });
  }
  if (i < 2) return;
  // The third's out of order.
  face(ctx, [[27.77, 16.25, 0.3], [27.77, 16.75, 0.3], [27.77, 16.75, 0.68], [27.77, 16.25, 0.68]], C.white, { lw: 0.02 });
  lettering(ctx, 'y', 27.78, 16.5, 0.56, 'OUT OF', 0.085, C.red, 'Bagel Fat One');
  lettering(ctx, 'y', 27.78, 16.5, 0.42, 'ORDER', 0.085, C.red, 'Bagel Fat One');
}
// A spot on a kiosk's slanted screen: u up the slope, v across (0..1).
const onScreen = (yc, u, v) => [27.74 - u * 0.33, yc - 0.3 + v * 0.6, 1.06 + u * 0.5];
function kioskScreens(ctx, t, k) {
  KIOSK.forEach((yc, i) => {
    const quad = [onScreen(yc, 0, 0), onScreen(yc, 0, 1), onScreen(yc, 1, 1), onScreen(yc, 1, 0)];
    const red = i === 1 && (k > 0.4 || Math.sin(t * 5) > 0.3);
    face(ctx, quad, i === 2 ? C.ink : red ? C.red : C.navy, { lw: 0.02 });
    if (!Q.detail) return;
    if (i === 0) {
      // Loading. Forever.
      for (let j = 0; j < 6; j++) {
        const a = j * 1.05 - t * 5, [px, py, pz] = onScreen(yc, 0.5 + Math.cos(a) * 0.22, 0.5 + Math.sin(a) * 0.2);
        const [X, Y] = P(px, py, pz);
        ctx.fillStyle = alpha(C.white, 0.25 + 0.75 * (j / 6)); ctx.beginPath(); ctx.arc(X, Y, 0.035, 0, Math.PI * 2); ctx.fill();
      }
    } else if (i === 1) {
      // SEE AN AGENT, flashing: a white bar of words and an exclamation.
      face(ctx, [onScreen(yc, 0.55, 0.15), onScreen(yc, 0.55, 0.85), onScreen(yc, 0.75, 0.85), onScreen(yc, 0.75, 0.15)], C.white, { stroke: false });
      face(ctx, [onScreen(yc, 0.22, 0.25), onScreen(yc, 0.22, 0.75), onScreen(yc, 0.38, 0.75), onScreen(yc, 0.38, 0.25)], alpha(C.white, 0.6), { stroke: false });
    }
  });
}
function kioskFighter(ctx, x, y, t) {
  const k = (t % 3.2) / 3.2;
  const o = k < 0.45 ? { pose: 'point', arms: [1.5 + Math.sin(t * 18) * 0.15, 0.3] } : k < 0.75 ? { pose: 'cheer' } : { pose: 'run', speed: 3 };
  person(ctx, x, y, 0, { ...look(84, 'traveler', { hat: null, top: C.red }), ...o, dir: 'l', back: true }, t);
}
function passportAndLitter(ctx) {
  // Receipts and stubs nobody wanted.
  for (const [x, y, w, d] of [[28.9, 17.0, 0.3, 0.16], [27.95, 18.15, 0.22, 0.14], [29.2, 18.3, 0.34, 0.12], [28.0, 17.25, 0.18, 0.26]]) rect(ctx, x, y, w, d, 0.006, C.white, { lw: 0.015 });
  if (Q.detail) for (let i = 0; i < 5; i++) line3(ctx, [[29.25 + i * 0.05, 18.32, 0.008], [29.25 + i * 0.05, 18.4, 0.008]], C.ink, 0.02);
  disc(ctx, 29.5, 17.5, 0.006, 0.09, C.grey, { lw: 0.015 });
  // The passport: navy, a little open, its gold seal.
  face(ctx, [[28.22, 17.5, 0.012], [28.56, 17.44, 0.012], [28.6, 17.7, 0.012], [28.26, 17.76, 0.012]], C.navy, { lw: 0.02 });
  face(ctx, [[28.56, 17.44, 0.012], [28.66, 17.45, 0.06], [28.7, 17.71, 0.06], [28.6, 17.7, 0.012]], C.white, { lw: 0.015 });
  disc(ctx, 28.41, 17.6, 0.016, 0.06, C.mustard, { stroke: false });
}

// ---------- The oversize drop ----------
const OV = { x0: 24.3, x1: 26.4, y0: 19.6, y1: 21.6, h: 1.9, a: 19.95, b: 21.25, top: 1.35 };
function oversizeBox(ctx) {
  const col = tint(INK.tarmac, 0.5);
  box(ctx, OV.x0, OV.y0, 0, OV.x1 - OV.x0, OV.y1 - OV.y0, OV.h, col, { dotsL: shade(col, 0.5), lw: 0.04 });
  // Its mouth, in a frame of hazard stripes.
  const x = OV.x1 + 0.005;
  face(ctx, [[x, OV.a - 0.12, 0], [x, OV.b + 0.12, 0], [x, OV.b + 0.12, OV.top + 0.12], [x, OV.a - 0.12, OV.top + 0.12]], INK.signal, { lw: 0.025 });
  if (Q.detail) for (let i = 0; i < 9; i++) { const u = OV.a - 0.12 + i * 0.22; face(ctx, [[x + 0.002, u, OV.top + 0.02], [x + 0.002, u + 0.1, OV.top + 0.02], [x + 0.002, u + 0.16, OV.top + 0.12], [x + 0.002, u + 0.06, OV.top + 0.12]], C.ink, { stroke: false }); }
  lettering(ctx, 'y', x, (OV.a + OV.b) / 2, 1.68, 'OVERSIZE', 0.22, C.white, 'Bagel Fat One');
  lettering(ctx, 'x', OV.x0 + 1.1, OV.y1 + 0.01, 1.5, 'NO CANOES', 0.14, INK.signal, 'Bagel Fat One');
}
function shutter(ctx, k, t) {
  const x = OV.x1 + 0.01, bottom = 0.06 + (OV.top - 0.15) * k;
  // Inside (when it's up): the dark, a cello case leaning, and a drum.
  if (k > 0.03) {
    face(ctx, [[x, OV.a, 0.02], [x, OV.b, 0.02], [x, OV.b, OV.top], [x, OV.a, OV.top]], C.ink, { stroke: false });
    if (Q.detail) {
      const [X, Y] = P(x - 0.05, OV.a + 0.55, 0.65);
      ctx.save(); ctx.translate(X, Y); ctx.rotate(0.2);
      ctx.beginPath(); ctx.ellipse(0, 0.12, 0.2, 0.3, 0, 0, Math.PI * 2); ctx.ellipse(0, -0.32, 0.14, 0.2, 0, 0, Math.PI * 2); paint(ctx, C.brown, { lw: 0.025 });
      ctx.restore();
      disc(ctx, x - 0.3, OV.b - 0.45, 0.4, 0.25, C.red, { lw: 0.025 });
    }
  }
  face(ctx, [[x, OV.a, bottom], [x, OV.b, bottom], [x, OV.b, OV.top], [x, OV.a, OV.top]], C.greyLight, { lw: 0.025 });
  if (Q.detail) for (let z = bottom + 0.1; z < OV.top - 0.02; z += 0.1) line3(ctx, [[x + 0.003, OV.a, z], [x + 0.003, OV.b, z]], C.grey, 0.02);
  void t;
}
function canoe(ctx, x, y0, y1) {
  const n = 12, right = [], left = [], keel = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, y = y0 + (y1 - y0) * u, sn = Math.sin(Math.PI * u), w = 0.38 * Math.pow(sn, 0.55);
    right.push([x + w, y, 0.42 + (1 - sn) * 0.12]);
    left.push([x - w, y, 0.42 + (1 - sn) * 0.12]);
    keel.push([x + w * 0.45, y, 0.03 + (1 - sn) * 0.3]);
  }
  face(ctx, [...right, ...keel.slice().reverse()], C.red, { lw: 0.035, dots: shade(C.red, 0.4), density: 0.15 });
  face(ctx, [...right, ...left.slice().reverse()], shade(C.red, 0.45), { lw: 0.035 });
  for (const yy of [y0 + (y1 - y0) * 0.35, y0 + (y1 - y0) * 0.65]) line3(ctx, [[x - 0.32, yy, 0.4], [x + 0.32, yy, 0.4]], C.woodLight, 0.06);
}
const SECURITY_WAIT = [[4, 6, '10 MIN'], [6, 8, '45 MIN'], [8, 11, '2 HRS'], [11, 15, '3 HRS'], [15, 18, 'YES'], [18, 29, 'TOMORROW']];
function vending(ctx, x0, y0) {
  const w = 1.2, d = 0.8, h = 2.0;
  box(ctx, x0, y0, 0, w, d, h, BRAND.can, { lw: 0.04, dotsL: shade(BRAND.can, 0.5) });
  const y = y0 + d + 0.005;
  face(ctx, [[x0 + 0.1, y, 0.75], [x0 + 0.85, y, 0.75], [x0 + 0.85, y, 1.75], [x0 + 0.1, y, 1.75]], alpha(C.sky, 0.55), { lw: 0.025 });
  if (Q.detail) for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    const cx = x0 + 0.2 + c * 0.17, cz = 0.85 + r * 0.24;
    face(ctx, [[cx, y + 0.003, cz], [cx + 0.1, y + 0.003, cz], [cx + 0.1, y + 0.003, cz + 0.17], [cx, y + 0.003, cz + 0.17]], r % 2 ? BRAND.can : C.white, { lw: 0.01 });
  }
  face(ctx, [[x0 + 0.92, y, 1.0], [x0 + 1.1, y, 1.0], [x0 + 1.1, y, 1.5], [x0 + 0.92, y, 1.5]], C.ink, { lw: 0.015 });
  face(ctx, [[x0 + 0.1, y, 0.2], [x0 + 0.85, y, 0.2], [x0 + 0.85, y, 0.42], [x0 + 0.1, y, 0.42]], C.ink, { stroke: false });
  lettering(ctx, 'x', x0 + w / 2, y, 1.88, BRAND.name, 0.12, BRAND.ink, 'Bagel Fat One');
  lettering(ctx, 'x', x0 + 0.48, y, 0.6, BRAND.line, 0.07, BRAND.ink);
}
function cartRack(ctx) {
  for (let i = 4; i >= 0; i--) {
    const y = 26.6 + i * 0.46, x0 = 27.7, x1 = 29.5;
    for (const [wx, wy] of [[x0 + 0.1, y + 0.05], [x1 - 0.1, y + 0.05], [x0 + 0.1, y + 0.8], [x1 - 0.1, y + 0.8]]) disc(ctx, wx, wy, 0.06, 0.06, C.ink, { stroke: false });
    face(ctx, [[x0, y, 0.18], [x1, y, 0.18], [x1, y + 0.9, 0.18], [x0, y + 0.9, 0.18]], alpha(C.grey, 0.5), { lw: 0.025, stroke: shade(C.grey, 0.3) });
    line3(ctx, [[x0, y, 0.18], [x0, y, 1.05], [x1, y, 1.05], [x1, y, 0.18]], shade(C.grey, 0.3), 0.05);
    line3(ctx, [[x0 + 0.1, y, 1.05], [x1 - 0.1, y, 1.05]], INK.signal, 0.07);
  }
  box(ctx, 27.25, 26.75, 0, 0.35, 0.35, 1.5, INK.signal, { flat: true, lw: 0.025 });
  lettering(ctx, 'x', 27.42, 27.11, 1.25, '$7', 0.16, C.ink, 'Bagel Fat One');
}

// ---------- The chapel ----------
// Our Lady of the Airways (1951, the first airport chapel in the country): low
// plaster walls, the altar at the back under a little stained-glass window of
// a plane with a halo, a rack of candles, two pews, a cranberry door.
function chapel(R) {
  const H_ = CH.wall;
  const cap = { top: tint(PLASTER, 0.3) };
  pieces(R, 'x', CH.x0, CH.x1, CH.y0, CH.y0 + 0.3, (ctx, u0, u1, a, b) => barX(ctx, u0, u1, CH.y0, CH.y0 + 0.3, 0, H_, PLASTER, { a, b, ...cap }));
  for (const [a, b] of [[CH.y0 + 0.3, CH.door[0]], [CH.door[1], BACK_Y]]) {
    pieces(R, 'y', a, b, CH.x1 - 0.3, CH.x1, (ctx, u0, u1, first, last) => {
      barY(ctx, u0, u1, CH.x1 - 0.3, CH.x1, 0, H_, PLASTER, { a: first, b: last, ...cap });
    });
  }
  // Its name on the hall side (over the wall's pieces).
  R.thing(CH.x1, BACK_Y, (ctx) => {
    if (!Q.detail) return;
    lettering(ctx, 'y', CH.x1 + 0.005, 28.5, 0.86, 'OUR LADY OF', 0.13, INK.cranberry, 'Bagel Fat One');
    lettering(ctx, 'y', CH.x1 + 0.005, 28.5, 0.64, 'THE AIRWAYS', 0.13, INK.cranberry, 'Bagel Fat One');
    lettering(ctx, 'y', CH.x1 + 0.005, 28.5, 0.42, 'SINCE 1951', 0.09, C.ink);
  }, { depth: CH.x1 + BACK_Y + 0.05 });
  // The door's frame, taller than the walls, and its little plaque.
  R.thing(CH.x1, CH.door[1] + 0.05, (ctx) => {
    for (const y of [CH.door[0] - 0.08, CH.door[1] - 0.04]) box(ctx, CH.x1 - 0.3, y, 0, 0.3, 0.12, 2.35, C.wood, { flat: true, lw: 0.03 });
    box(ctx, CH.x1 - 0.3, CH.door[0] - 0.08, 2.25, 0.3, CH.door[1] - CH.door[0] + 0.16, 0.18, C.wood, { flat: true, lw: 0.03 });
    face(ctx, [[CH.x1 + 0.005, 26.25, 2.05], [CH.x1 + 0.005, 27.15, 2.05], [CH.x1 + 0.005, 27.15, 2.22], [CH.x1 + 0.005, 26.25, 2.22]], C.mustard, { lw: 0.015 });
    lettering(ctx, 'y', CH.x1 + 0.01, 26.7, 2.13, 'CHAPEL', 0.1, C.ink, 'Bagel Fat One');
  });
  // The altar: a white cloth, two candlesticks, and the window over it.
  R.thing(3.6, 24.75, (ctx) => {
    box(ctx, 2.55, 24.05, 0, 2.1, 0.7, 1.0, C.white, { flat: true, lw: 0.035 });
    face(ctx, [[2.75, 24.751, 0.2], [4.45, 24.751, 0.2], [4.45, 24.751, 0.92], [2.75, 24.751, 0.92]], INK.cranberry, { lw: 0.02 });
    if (Q.detail) { face(ctx, [[3.55, 24.752, 0.35], [3.65, 24.752, 0.35], [3.65, 24.752, 0.8], [3.55, 24.752, 0.8]], C.mustard, { stroke: false }); face(ctx, [[3.4, 24.752, 0.62], [3.8, 24.752, 0.62], [3.8, 24.752, 0.7], [3.4, 24.752, 0.7]], C.mustard, { stroke: false }); }
    for (const x of [2.95, 4.25]) { box(ctx, x - 0.04, 24.36, 1.0, 0.08, 0.08, 0.3, C.mustard, { flat: true, lw: 0.015 }); box(ctx, x - 0.03, 24.37, 1.25, 0.06, 0.06, 0.06, C.white, { flat: true, stroke: false }); }
    stainedGlass(ctx, 3.6, 24.1, 1.0);
  });
  // The rack of candles by the end wall.
  R.thing(1.05, 24.55, (ctx) => {
    box(ctx, 0.55, 24.05, 0, 1.0, 0.5, 0.55, C.wood, { flat: true, lw: 0.025 });
    box(ctx, 0.55, 24.05, 0.55, 1.0, 0.25, 0.2, C.wood, { flat: true, lw: 0.025 });
    if (Q.detail) for (let i = 0; i < 5; i++) for (const [yy, zz] of [[24.42, 0.55], [24.17, 0.75]]) disc(ctx, 0.68 + i * 0.19, yy, zz + 0.04, 0.06, (i + zz * 10) % 3 ? INK.cranberry : C.red, { lw: 0.012 });
  });
  // The prayer board: notes pinned up all day.
  R.thing(6.1, 24.35, (ctx) => {
    box(ctx, 5.95, 24.2, 0, 0.06, 0.06, 0.9, C.wood, { flat: true, stroke: false });
    face(ctx, [[5.45, 24.3, 0.9], [6.45, 24.3, 0.9], [6.45, 24.3, 1.6], [5.45, 24.3, 1.6]], C.woodLight, { lw: 0.025, dots: C.wood, density: 0.2 });
    if (Q.detail) for (const [u, v, c] of [[5.6, 1.4, C.white], [5.85, 1.28, C.butter], [6.15, 1.42, C.white], [5.7, 1.08, C.pink], [6.05, 1.06, C.white], [6.3, 1.2, C.butter]]) face(ctx, [[u - 0.1, 24.31, v - 0.08], [u + 0.1, 24.31, v - 0.08], [u + 0.1, 24.31, v + 0.08], [u - 0.1, 24.31, v + 0.08]], c, { lw: 0.01 });
  });
  // Two pews, facing the altar: the seat sorts behind whoever sits on it, the
  // back in front of them.
  for (const y of [25.5, 27.1]) {
    pieces(R, 'x', 1.0, 6.2, y, y + 0.5, (ctx, u0, u1, a, b) => {
      barX(ctx, u0, u1, y, y + 0.5, 0.42, 0.1, C.wood, { a, b, top: C.woodLight });
      if (a || b) box(ctx, a ? u0 : u1 - 0.1, y, 0, 0.1, 0.5, 0.52, C.brown, { flat: true, lw: 0.02 });
    }, { back: true });
    pieces(R, 'x', 1.0, 6.2, y + 0.5, y + 0.65, (ctx, u0, u1, a, b) => barX(ctx, u0, u1, y + 0.5, y + 0.65, 0, 0.88, C.wood, { a, b, top: C.woodLight }));
  }
  // Someone on the first pew, head down, all day and all night.
  R.thing(2.6, 25.75, (ctx) => person(ctx, 2.6, 25.75, -0.3, { ...look(95, 'traveler', { hat: null, top: C.purple, style: 'long' }), pose: 'sit', dir: 'r', back: true, arms: [1.9, 1.8] }, 0), { depth: 2.6 + 25.75 });
}
function stainedGlass(ctx, x, y, z) {
  // Three arched panes on a little frame, the middle one a plane with a halo.
  const panes = [[-0.55, 0.3, 0.75, C.teal], [-0.22, 0.44, 1.05, C.navy], [0.25, 0.3, 0.75, C.teal]];
  for (const [dx, w, h, col] of panes) {
    const x0 = x + dx, pts = [[x0, y, z + 0.08], [x0 + w, y, z + 0.08], [x0 + w, y, z + h], [x0 + w / 2, y, z + h + w * 0.45], [x0, y, z + h]];
    face(ctx, pts, C.wood, { lw: 0.03 });
    const inset = [[x0 + 0.05, y + 0.005, z + 0.13], [x0 + w - 0.05, y + 0.005, z + 0.13], [x0 + w - 0.05, y + 0.005, z + h - 0.03], [x0 + w / 2, y + 0.005, z + h + w * 0.45 - 0.07], [x0 + 0.05, y + 0.005, z + h - 0.03]];
    face(ctx, inset, col, { stroke: false, dots: shade(col, 0.4), density: 0.18 });
  }
  if (!Q.detail) return;
  const [X, Y] = P(x, y + 0.01, z + 0.65);
  ctx.save(); ctx.translate(X, Y);
  ctx.beginPath(); ctx.ellipse(0, -0.28, 0.17, 0.05, 0, 0, Math.PI * 2); ctx.strokeStyle = C.mustard; ctx.lineWidth = 0.04; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, 0, 0.2, 0.06, 0, 0, Math.PI * 2); ctx.moveTo(-0.04, 0); ctx.lineTo(0.04, -0.2); ctx.lineTo(0.08, 0.0); ctx.moveTo(-0.04, 0); ctx.lineTo(0.04, 0.2); ctx.lineTo(0.08, 0);
  paint(ctx, C.white, { lw: 0.02 });
  ctx.restore();
}
function chapelDoor_(ctx, k) {
  const a = k * 1.25, len = CH.door[1] - CH.door[0] - 0.05, hx = CH.x1 - 0.15, hy = CH.door[0];
  const ex = hx - Math.sin(a) * len, ey = hy + Math.cos(a) * len;
  const pts = [[hx, hy, 0.02], [ex, ey, 0.02], [ex, ey, 2.2], [hx, hy, 2.2]];
  face(ctx, pts, INK.cranberry, { lw: 0.035, dots: shade(INK.cranberry, 0.4), density: 0.15 });
  if (!Q.detail) return;
  const at3 = (u, z) => [hx + (ex - hx) * u, hy + (ey - hy) * u, z];
  for (const [u0, u1, z0, z1] of [[0.12, 0.88, 1.25, 2.0], [0.12, 0.88, 0.2, 1.05]]) face(ctx, [at3(u0, z0), at3(u1, z0), at3(u1, z1), at3(u0, z1)], null, { lw: 0.02, stroke: shade(INK.cranberry, 0.45) });
  const [kx, ky, kz] = at3(0.85, 1.08);
  disc(ctx, kx + 0.03, ky, kz, 0.05, C.mustard, { lw: 0.015 });
}
function prayer(ctx, x, y, t) {
  const bob = Math.sin(t * 2.2) * 0.07;
  person(ctx, x, y, -0.16, {
    ...look(97, 'traveler', { hat: null, top: C.teal, hair: HAIR[1], style: 'short' }), pose: 'sit', dir: 'r', back: true,
    arms: [Math.PI - 0.12 + bob, -Math.PI + 0.22 - bob],
    face: (c, hy) => {
      // A boarding pass, held up to the heavens.
      c.save(); c.translate(0.18, hy - 0.62 - bob * 0.5); c.rotate(-0.15);
      c.beginPath(); c.rect(-0.18, -0.1, 0.36, 0.2); paint(c, C.white, { lw: 0.02 });
      c.fillStyle = C.ink; for (let i = 0; i < 5; i++) c.fillRect(0.04 + i * 0.025, -0.06, 0.012, 0.12);
      c.fillStyle = INK.signal; c.fillRect(-0.18, -0.1, 0.08, 0.2);
      c.restore();
    },
  }, t);
  if (Q.detail) thought(ctx, x + 0.25, y - 0.25, 2.55, night(t) ? 'ANY FLIGHT?' : 'ROW 1?', 0.2);
}
function candleLighter(ctx, x, y, t) {
  const reach = Math.sin(t * 0.9) > 0;
  person(ctx, x, y, 0, { ...look(98, 'traveler', { hat: null, top: C.navy, hair: C.greyLight, style: 'bun' }), dir: 'l', back: true, arms: reach ? [1.6 + Math.sin(t * 3) * 0.05, 0.2] : [0.3, 0.1] }, t);
}
function flame(ctx, x, y, z, t) {
  const f = 1 + Math.sin(t * 13 + x * 7) * 0.15;
  const [X, Y] = P(x, y, z);
  ctx.beginPath(); ctx.moveTo(X, Y - 0.16 * f); ctx.quadraticCurveTo(X + 0.06, Y - 0.04, X, Y); ctx.quadraticCurveTo(X - 0.06, Y - 0.04, X, Y - 0.16 * f);
  ctx.fillStyle = C.mustard; ctx.fill();
  if (x < 1.5) for (let i = 0; i < 5; i++) for (const [yy, zz] of [[24.42, 0.6], [24.17, 0.8]]) {
    if ((i + zz * 10) % 2) continue;
    const [fx, fy] = P(0.68 + i * 0.19, yy, zz + 0.07);
    ctx.beginPath(); ctx.ellipse(fx, fy - 0.04, 0.02, 0.05 * (1 + Math.sin(t * 15 + i) * 0.2), 0, 0, Math.PI * 2); ctx.fill();
  }
}

// ---------- The front of the hall ----------
// The bag-wrapping machine: a suitcase spinning in cling film.
function wrapMachine(R) {
  const cx = 11.3, cy = 25.15;
  R.thing(cx, cy, (ctx) => {
    disc(ctx, cx, cy, 0.01, 0.78, C.grey, { lw: 0.03 });
    box(ctx, cx - 0.7, cy - 0.7, 0, 1.4, 1.4, 0.22, C.grey, { flat: true, lw: 0.03 });
    disc(ctx, cx, cy, 0.23, 0.6, STEEL, { lw: 0.025 });
    box(ctx, cx + 0.75, cy - 0.85, 0, 0.12, 0.12, 1.5, C.ink, { flat: true, stroke: false });
  }, { depth: cx + cy - 0.4 });
  R.thing(cx, cy + 0.01, (ctx, t) => {
    const a = night(t) ? 0.6 : t * 3.2, hw = 0.24, hd = 0.4;
    const corner = (u, v) => [cx + u * Math.cos(a) - v * Math.sin(a), cy + u * Math.sin(a) + v * Math.cos(a)];
    const base = [corner(-hw, -hd), corner(hw, -hd), corner(hw, hd), corner(-hw, hd)];
    const z0 = 0.24, z1 = 0.95;
    solid(ctx, hexa(base.map(([x, y]) => [x, y, z0]), base.map(([x, y]) => [x, y, z1]), C.purple));
    // Film, wound round it.
    if (!night(t)) {
      const grow = base.map(([x, y]) => [x + (x - cx) * 0.06, y + (y - cy) * 0.06]);
      solid(ctx, hexa(grow.map(([x, y]) => [x, y, 0.35]), grow.map(([x, y]) => [x, y, 0.85]), alpha(C.white, 0.5)).map((f) => ({ ...f, flat: true })), { lw: 0.015 });
      const rz = 0.5 + Math.sin(t * 0.8) * 0.3;
      box(ctx, cx + 0.7, cy - 0.9, rz, 0.22, 0.22, 0.3, C.white, { flat: true, lw: 0.02 });
    }
  }, { anim: true, depth: cx + cy });
  R.thing(9.4, 24.3, (ctx) => {
    box(ctx, 9.37, 24.27, 0, 0.06, 0.06, 1.0, C.ink, { flat: true, stroke: false });
    board(ctx, 'x', 9.4, 24.3, 1.35, 1.2, 0.55, [['WRAP $19.99', 0.13, C.white, 'Bagel Fat One'], ['UNWRAP $29.99', 0.11, INK.signal]], { board: C.purple });
  });
  // The attendant, and the man watching his suitcase go round.
  R.thing(9.5, 25.8, (ctx) => person(ctx, 9.5, 25.8, 0, { ...look(110, 'agent', { hat: 'cap', top: C.purple }), dir: 'r', arms: [1.2, 0.4] }, 0), { on: daytime });
  R.thing(12.3, 26.5, (ctx) => person(ctx, 12.3, 26.5, 0, { ...look(111, 'traveler', { hat: null }), dir: 'l', back: true, arms: [0.4, -0.2] }, 0), { on: daytime });
  R.thing(9.6, 26.0, (ctx) => sleeper(ctx, 9.6, 26.0, 'r', look(110, 'agent', { hat: 'cap', top: C.purple }), C.purple, null), { on: night });
}
// A family repacking on the floor to get under the limit: Mom bouncing on the
// case to shut it, Dad hauling on the zip, a kid in the other one.
function family(R) {
  R.rug((ctx) => {
    for (const [x, y, w, d, c] of [[13.7, 26.6, 0.7, 0.4, C.mustard], [16.2, 26.9, 0.5, 0.5, C.teal], [17.0, 24.3, 0.6, 0.35, C.red], [14.3, 24.3, 0.45, 0.3, C.white], [18.4, 25.9, 0.5, 0.3, C.pink], [15.3, 27.3, 0.4, 0.4, C.green]]) {
      face(ctx, [[x, y, 0.01], [x + w, y + 0.05, 0.01], [x + w - 0.08, y + d, 0.01], [x + 0.05, y + d - 0.06, 0.01]], c, { lw: 0.02 });
    }
  });
  R.thing(14.8, 25.85, (ctx, t) => {
    const k = daytime(t) ? Math.abs(Math.sin(t * 4.2)) : 0;
    // The case, bulging less as she lands on it.
    box(ctx, 14.3, 25.5, 0, 1.0, 0.7, 0.32 + (1 - k) * 0.06, C.navy, { lw: 0.035 });
    if (Q.detail) line3(ctx, [[14.3, 26.2, 0.2], [15.3, 26.2, 0.2]], C.mustard, 0.03);
    if (daytime(t)) person(ctx, 14.8, 25.85, 0.12 + k * 0.3, { ...look(120, 'traveler', { hat: null, top: C.coral, style: 'pony' }), pose: 'sit', dir: 'l', arms: [Math.PI - 0.6 - k * 0.3, -Math.PI + 0.6 + k * 0.3] }, t);
  }, { anim: true });
  R.thing(15.9, 26.3, (ctx, t) => person(ctx, 15.9, 26.3, 0, { ...look(121, 'traveler', { hat: 'beanie', top: C.green }), dir: 'l', back: true, arms: [1.3 + Math.sin(t * 6) * 0.2, 1.1 + Math.sin(t * 6) * 0.2] }, t), { anim: true, on: daytime });
  // The other case open, a kid sitting in it.
  R.thing(17.4, 25.55, (ctx) => {
    box(ctx, 16.9, 25.2, 0, 1.0, 0.7, 0.28, C.red, { lw: 0.035 });
    rect(ctx, 16.96, 25.26, 0.88, 0.58, 0.281, shade(C.red, 0.45), { stroke: false });
    face(ctx, [[16.9, 25.2, 0.28], [17.9, 25.2, 0.28], [17.9, 25.05, 0.98], [16.9, 25.05, 0.98]], tint(C.red, 0.15), { lw: 0.03 });
    for (const [dx, dy, c] of [[-0.2, 0.0, C.white], [0.25, 0.1, C.mustard]]) disc(ctx, 17.4 + dx, 25.55 + dy, 0.3, 0.16, c, { lw: 0.015 });
  });
  R.thing(17.45, 25.6, (ctx) => person(ctx, 17.45, 25.6, -0.05, { ...look(122, 'traveler', { hat: null, top: C.sky }), pose: 'sit', dir: 'l', scale: 0.62, hold: HOLD.phone, arms: [1.0, 1.0] }, 0), { on: daytime });
  // Grandpa, asleep on a duffel through all of it.
  R.thing(17.9, 27.0, (ctx) => sleeper(ctx, 17.9, 27.0, 'r', look(123, 'traveler', { hat: 'cap', hair: C.greyLight, top: C.brown }), C.green, null));
  R.thing(15.2, 26.1, (ctx) => {
    sleeper(ctx, 15.4, 26.4, 'r', look(121, 'traveler', { hat: 'beanie', top: C.green }), C.navy, null);
    person(ctx, 14.8, 25.85, 0.32, { ...look(120, 'traveler', { hat: null, top: C.coral, style: 'pony' }), pose: 'sleep', dir: 'r' }, 0);
  }, { on: night, depth: 15.2 + 26.6 });
}
// Happy Thanksgiving from Logan: hay bales, pumpkins, and a turkey to put your
// face in for a photo.
function thanksgiving(R) {
  const HAY = C.butter;
  R.thing(22.9, 24.9, (ctx) => {
    for (const [x, y, z] of [[20.3, 24.05, 0], [21.7, 24.05, 0], [21.0, 24.1, 0.55]]) {
      box(ctx, x, y, z, 1.35, 0.8, 0.55, HAY, { lw: 0.03, dotsL: shade(HAY, 0.3) });
      if (Q.detail) for (const zz of [0.18, 0.37]) line3(ctx, [[x, y + 0.8, z + zz], [x + 1.35, y + 0.8, z + zz]], C.mustard, 0.025);
    }
    board(ctx, 'x', 21.7, 24.95, 1.45, 2.3, 0.5, [['HAPPY THANKSGIVING', 0.16, C.white, 'Bagel Fat One'], ['FROM EVERYONE AT LOGAN', 0.08, INK.signal]], { board: INK.cranberry });
  });
  for (const [x, y, z, r] of [[20.6, 25.35, 0, 0.32], [23.3, 25.0, 0, 0.26], [22.75, 25.45, 0, 0.22], [21.5, 24.5, 1.1, 0.2], [20.3, 24.85, 0.55, 0.18]]) {
    R.thing(x, y + r, (ctx) => pumpkin(ctx, x, y, z, r));
  }
  // The face-in-the-hole turkey, with a kid's face in the hole.
  const bx = 24.5, by = 24.7;
  R.thing(bx, by, (ctx) => {
    person(ctx, 24.25, 24.35, 0, { ...look(130, 'traveler', { hat: null, top: C.mustard }), scale: 0.7, dir: 'r' }, 0);
    turkeyBoard(ctx, bx, by, 24.25, 24.35);
  }, { on: daytime });
  R.thing(bx, by + 0.01, (ctx) => turkeyBoard(ctx, bx, by, null), { on: night });
  // Dad, taking the photo; the flash.
  R.thing(24.0, 26.6, (ctx) => person(ctx, 24.0, 26.6, 0, { ...look(131, 'traveler', { hat: 'cap', top: C.navy }), pose: 'read', dir: 'r', back: true, arms: [1.9, 1.8] }, 0), { on: daytime });
  R.thing(23.95, 26.55, (ctx, t) => {
    const k = (t % 4.3) / 4.3;
    if (k > 0.06) return;
    const [X, Y] = P(24.2, 26.3, 2.1);
    ctx.fillStyle = alpha(C.white, 0.95);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, r = i % 2 ? 0.1 : 0.32; ctx.lineTo(X + Math.cos(a) * r, Y + Math.sin(a) * r); }
    ctx.closePath(); ctx.fill();
  }, { anim: true, on: daytime });
}
function pumpkin(ctx, x, y, z, r) {
  const [X, Y] = P(x, y, z);
  ctx.save(); ctx.translate(X, Y - r * 0.8);
  for (const dx of [-0.45, 0.45, 0]) { ctx.beginPath(); ctx.ellipse(dx * r, 0, r * 0.65, r * 0.75, 0, 0, Math.PI * 2); paint(ctx, INK.safety, { lw: 0.025, dots: dx ? shade(INK.safety, 0.35) : null, density: 0.15 }); }
  ctx.beginPath(); ctx.rect(-0.03, -r * 0.95, 0.06, r * 0.3); paint(ctx, C.green, { lw: 0.015 });
  ctx.restore();
}
// The painted board (along x, facing us): a cartoon turkey in a pilgrim hat
// with a hole where its face goes, lined up with the head of whoever stands
// behind it at (kx, ky).
function turkeyBoard(ctx, bx, by, kx, ky) {
  const w = 1.5, h = 2.0, x0 = bx - w / 2;
  // Where a kid's head behind it lands on the board: the same spot on screen.
  let HX, HY;
  if (kx != null) [HX, HY] = P(kx, ky, 1.2);
  else [HX, HY] = P(bx, by, 1.55);
  ctx.save();
  poly(ctx, [[x0, by, 0], [x0 + w, by, 0], [x0 + w, by, h], [x0, by, h]]);
  ctx.moveTo(HX + 0.2, HY); ctx.arc(HX, HY, 0.2, 0, Math.PI * 2, true);
  ctx.fillStyle = C.woodLight; ctx.fill('evenodd');
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.035; ctx.stroke(); }
  ctx.restore();
  if (!Q.detail) return;
  // The painting: a fan of feathers, a round brown body, a pilgrim's hat.
  const [CX, CY] = P(x0 + w / 2, by, 0.8);
  ctx.save(); ctx.translate(CX, CY);
  const cols = [C.brown, C.mustard, C.coral, INK.cranberry, C.mustard];
  cols.forEach((c, i) => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 0.62, Math.PI * (1.1 + i * 0.16), Math.PI * (1.26 + i * 0.16)); ctx.closePath(); ctx.fillStyle = c; ctx.fill(); });
  ctx.beginPath(); ctx.ellipse(0, 0.1, 0.35, 0.42, 0, 0, Math.PI * 2); ctx.fillStyle = C.brown; ctx.fill();
  ctx.restore();
  ctx.save(); ctx.translate(HX, HY);
  ctx.beginPath(); ctx.arc(0, 0, 0.27, Math.PI * 1.05, Math.PI * 1.95); ctx.lineWidth = 0.08; ctx.strokeStyle = tint(C.brown, 0.2); ctx.stroke();
  ctx.fillStyle = C.ink; ctx.fillRect(-0.2, -0.5, 0.4, 0.22); ctx.fillRect(-0.3, -0.3, 0.6, 0.06);
  ctx.fillStyle = C.mustard; ctx.fillRect(-0.06, -0.36, 0.12, 0.07);
  ctx.restore();
}
// The floor scrubber: up and down the front of the hall all day and all
// night, a shine behind it.
function scrubber() {
  const walk = path([[9.4, 28.75], [24.4, 28.75], [9.4, 28.75]], 0.55);
  return (t) => walk(lt(t) % walk.T);
}
function drawScrubber(ctx, p, t) {
  const d = p.dir === 'r' ? 1 : -1, x = p.x, y = p.y;
  // The shine.
  rect(ctx, d > 0 ? x - 2.8 : x + 0.6, y - 0.4, 2.2, 0.8, 0.006, alpha(C.white, 0.4), { stroke: false });
  // Brushes, spinning.
  if (Q.detail) for (const s of [-1, 1]) {
    const [X, Y] = P(x + d * 0.6, y + s * 0.22, 0.05);
    ctx.save(); ctx.translate(X, Y); ctx.rotate(t * 9 * s);
    ctx.beginPath(); ctx.ellipse(0, 0, 0.22, 0.11, 0, 0, Math.PI * 2); paint(ctx, C.ink, { lw: 0.015 });
    ctx.strokeStyle = C.grey; ctx.lineWidth = 0.02; ctx.beginPath(); ctx.moveTo(-0.18, 0); ctx.lineTo(0.18, 0); ctx.stroke();
    ctx.restore();
  }
  box(ctx, x - 0.65, y - 0.4, 0.12, 1.3, 0.8, 0.5, C.teal, { lw: 0.035, dotsL: shade(C.teal, 0.45) });
  box(ctx, x - 0.55 * d - 0.15, y - 0.3, 0.62, 0.3, 0.6, 0.25, C.ink, { flat: true, lw: 0.02 });
  person(ctx, x - 0.25 * d, y, 0.1, { ...look(140, 'crew', { top: C.grey, hat: 'cap' }), pose: 'sit', dir: p.dir, arms: [1.3, 1.2], scale: 0.85 }, t);
  // The beacon on top, turning.
  const on = Math.sin(t * 8) > 0;
  box(ctx, x + d * 0.45 - 0.06, y - 0.06, 0.62, 0.12, 0.12, 0.12, on ? INK.safety : shade(INK.safety, 0.4), { flat: true, lw: 0.015 });
}

// A bench along the front, facing us: someone knitting a scarf that's longer
// than the queue, a man asleep with his mouth open, a teenager on her phone.
// After six it's two people lying across it.
const BENCH = { x0: 8.3, x1: 11.9, y0: 27.2, y1: 27.75 };
function bench(R) {
  const { x0, x1, y0, y1 } = BENCH;
  R.thing(x0, y0, (ctx) => {
    for (const x of [x0 + 0.15, x1 - 0.25]) box(ctx, x, y0 + 0.05, 0, 0.1, y1 - y0 - 0.1, 0.42, C.ink, { flat: true, stroke: false });
    box(ctx, x0, y0, 0.42, x1 - x0, y1 - y0, 0.08, INK.cranberry, { flat: true, lw: 0.03 });
    box(ctx, x0, y0 - 0.08, 0.42, x1 - x0, 0.1, 0.62, INK.cranberry, { flat: true, lw: 0.03 });
    if (Q.detail) for (let x = x0 + 0.9; x < x1 - 0.1; x += 0.9) line3(ctx, [[x, y0 + 0.02, 0.51], [x, y1, 0.51]], shade(INK.cranberry, 0.4), 0.025);
  }, { depth: x0 + y0 - 0.2 });
  // The knitter, the sleeper, the teenager.
  R.thing(8.75, 27.5, (ctx, t) => {
    person(ctx, 8.75, 27.5, -0.32, { ...look(150, 'traveler', { hat: null, hair: C.greyLight, style: 'bun', top: C.green }), pose: 'sit', dir: 'l', arms: [1.2 + Math.sin(t * 8) * 0.12, 1.1 - Math.sin(t * 8) * 0.12] }, t);
    // The scarf, down off her knee and along the floor.
    if (Q.detail) {
      const pts = [[8.55, 27.75, 0.75], [8.5, 28.05, 0.3], [8.6, 28.25, 0.02], [9.3, 28.35, 0.02], [10.2, 28.3, 0.02], [10.9, 28.4, 0.02]];
      line3(ctx, pts, C.ink, 0.14);
      line3(ctx, pts, C.red, 0.1);
      for (let i = 1; i < 6; i++) line3(ctx, [[8.6 + i * 0.4, 28.28, 0.025], [8.6 + i * 0.4, 28.42, 0.025]], C.white, 0.035);
    }
  }, { anim: true, on: daytime });
  R.thing(10.4, 27.5, (ctx) => person(ctx, 10.4, 27.5, -0.32, { ...look(151, 'traveler', { hat: 'cap', top: C.navy }), pose: 'sit', dir: 'l', arms: [0.3, -0.1], face: (c, hy, bk) => { if (bk) return; eyesShut(c, hy); c.beginPath(); c.ellipse(0.2, hy + 0.15, 0.05, 0.06, 0, 0, Math.PI * 2); c.fillStyle = C.ink; c.fill(); } }, 0), { on: daytime });
  R.thing(10.4, 27.51, (ctx, t) => { if (Q.detail) { const k = (t * 0.6) % 1; label(ctx, 10.1 - 0.3 * k, 27.2 - 0.3 * k, 2.15 + k, 'z', 0.32 + k * 0.25, alpha(C.ink, 1 - k)); } }, { anim: true, on: daytime });
  R.thing(11.4, 27.5, (ctx) => person(ctx, 11.4, 27.5, -0.32, { ...look(152, 'traveler', { hat: null, style: 'pony', top: C.pink }), pose: 'sit', dir: 'l', hold: HOLD.phone, arms: [1.0, 1.0] }, 0), { on: daytime });
  R.thing(9.6, 27.5, (ctx) => {
    person(ctx, 9.9, 27.15, 0.5, { ...look(151, 'traveler', { hat: 'cap', top: C.navy }), pose: 'sleep', dir: 'r' }, 0);
    person(ctx, 11.6, 26.85, 0.5, { ...look(150, 'traveler', { hat: null, hair: C.greyLight, style: 'bun', top: C.green }), pose: 'sleep', dir: 'l' }, 0);
  }, { on: night });
}
// A trolley piled with nine bags, the top one wobbling, and its owner on the
// phone telling someone it's fine.
function trolley(R) {
  const x = 19.9, y = 27.4;
  R.thing(x, y, (ctx) => {
    for (const [wx, wy] of [[x - 0.5, y - 0.3], [x + 0.5, y - 0.3], [x - 0.5, y + 0.3], [x + 0.5, y + 0.3]]) disc(ctx, wx, wy, 0.06, 0.07, C.ink, { stroke: false });
    face(ctx, [[x - 0.6, y - 0.35, 0.15], [x + 0.6, y - 0.35, 0.15], [x + 0.6, y + 0.35, 0.15], [x - 0.6, y + 0.35, 0.15]], C.grey, { lw: 0.025 });
    line3(ctx, [[x - 0.6, y - 0.35, 0.15], [x - 0.65, y - 0.35, 1.2], [x - 0.65, y + 0.35, 1.2], [x - 0.6, y + 0.35, 0.15]], shade(C.grey, 0.3), 0.06);
    let z = 0.17;
    for (const [kind, col, h] of [['case', C.ink, 0.26], ['case', C.teal, 0.26], ['duffel', C.red, 0.4], ['case', C.navy, 0.26], ['box', null, 0.4], ['duffel', C.mustard, 0.4], ['case', C.purple, 0.26], ['case', C.green, 0.26]]) {
      bag(ctx, x + 0.05, y, z, { kind, color: col, along: 'x', lie: true, tag: false });
      z += h;
    }
  });
  R.thing(x + 0.01, y + 0.01, (ctx, t) => {
    const a = Math.sin(t * 2.6) * 0.06;
    bag(ctx, x + 0.05 + a, y - a * 0.5, 2.87, { kind: 'case', color: C.coral, along: 'x', lie: true, tag: false });
  }, { anim: true });
  R.thing(x + 0.9, y + 0.5, (ctx) => person(ctx, x + 0.9, y + 0.5, 0, { ...look(155, 'traveler', { hat: 'cap', top: C.mustard }), pose: 'read', dir: 'l', hold: HOLD.phone }, 0), { on: daytime });
}
