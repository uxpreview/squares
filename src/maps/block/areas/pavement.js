// The pavement: along the two front edges of the block, the closest thing to
// you, so its kerb is the picture's front edge. From noon a queue forms where
// Main Street's front arm meets it, and by evening it reaches round the corner
// and up the right-hand front, in loose clumps: people chatting, a camping
// stool, a flask, a dog, a kid asleep on a parent, a cone holding someone's
// place. Whoever's at the back asks what it's for. Nobody knows. After the
// party starts it drains away from the front, and by 10pm it's gone.
//
// Also: a hot dog cart (a queue of two at lunch), a newsstand whose vendor is
// asleep (and tomorrow's paper on the rack), a busker who'll stop for coins,
// a bus stop with no buses, a hopscotch, the lamp posts.
//
// The walking lane is the middle (x or y = 83), so the queue keeps to the
// outer half and the stalls to the inner half. The seams (every 16) cross the
// strips at 16, 32, 48, 64 and 80: the big props keep a unit or two clear.
import {
  C, Q, P, box, rect, disc, cylinder, face, paint, person, folk, speech, note, paintText, label, shade, tint, mix, alpha, rng, goose,
} from '../../../engine/art.js';
import { particles } from '../../../engine/actors.js';
import { SLAB } from '../../../engine/iso.js';
import { PAVEMENT, EDGE, SIZE } from '../plan.js';
import { STREET_NIGHT, printed, board, words, onFloor, cone, streetLamp, litter } from '../style.js';
import { hour } from '../clock.js';

const readable = () => Q.detail && Q.pxPerUnit >= 12;
const KERB = SIZE - 0.6; // where the kerb stones start, 84.4

// Text in the floor's plane (inside onFloor), centred at (u, v).
function floorText(ctx, u, v, text, size, color) {
  const k = 40;
  ctx.save();
  ctx.translate(u, v);
  ctx.scale(1 / k, 1 / k);
  ctx.font = `${size * k}px "Bagel Fat One", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
const pole = (ctx, x, y, h, color = C.ink) => box(ctx, x - 0.05, y - 0.05, 0, 0.1, 0.1, h, color, { flat: true, stroke: false });

// ---------- The ground ----------
// Slabs in two rows, staggered, and a row of kerb stones along the front
// edge, which drops to the slab: the picture's front edge.
function paving(ctx, ink) {
  const kerbTop = 0.28;
  // The kerb's face and the slab under it, along both front edges.
  face(ctx, [[0, SIZE, 0], [SIZE, SIZE, 0], [SIZE, SIZE, -kerbTop], [0, SIZE, -kerbTop]], shade(ink.kerb, 0.18), { lw: 0.05 });
  face(ctx, [[0, SIZE, -kerbTop], [SIZE, SIZE, -kerbTop], [SIZE, SIZE, -SLAB], [0, SIZE, -SLAB]], shade(ink.slab, 0.3), { dots: shade(ink.slab, 0.6), density: 0.25 });
  face(ctx, [[SIZE, 0, 0], [SIZE, SIZE, 0], [SIZE, SIZE, -kerbTop], [SIZE, 0, -kerbTop]], shade(ink.kerb, 0.08), { lw: 0.05 });
  face(ctx, [[SIZE, 0, -kerbTop], [SIZE, SIZE, -kerbTop], [SIZE, SIZE, -SLAB], [SIZE, 0, -SLAB]], shade(ink.slab, 0.12));
  for (const [x0, y0, x1, y1] of PAVEMENT) rect(ctx, x0, y0, x1 - x0, y1 - y0, 0, ink.pavement, { stroke: false });
  // The kerb stones.
  rect(ctx, 0, KERB, KERB, 0.6, 0, ink.kerb, { stroke: false });
  rect(ctx, KERB, 0, 0.6, SIZE, 0, ink.kerb, { stroke: false });
  if (!Q.detail) return;
  ctx.beginPath();
  const line = (a, b) => {
    const [ax, ay] = P(...a), [bx, by] = P(...b);
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
  };
  const slab = 1.7, row = (KERB - EDGE) / 2; // 1.7 each way
  // Along the left-hand front (x runs), the corner included.
  line([0, EDGE + row], [KERB, EDGE + row]);
  line([0, KERB], [KERB, KERB]);
  for (let x = slab; x < KERB; x += slab) {
    line([x, EDGE], [x, EDGE + row]);
    if (x + slab / 2 < KERB) line([x + slab / 2, EDGE + row], [x + slab / 2, KERB]);
  }
  // Down the right-hand front (y runs), to the corner.
  line([EDGE + row, 0], [EDGE + row, EDGE]);
  line([KERB, 0], [KERB, SIZE]);
  for (let y = slab; y <= EDGE; y += slab) {
    line([EDGE, y], [EDGE + row, y]);
    if (y + slab / 2 < EDGE) line([EDGE + row, y + slab / 2], [KERB, y + slab / 2]);
  }
  ctx.strokeStyle = ink.paving;
  ctx.lineWidth = 0.04;
  ctx.stroke();
  // The kerb stones' joints.
  ctx.beginPath();
  for (let x = 1; x < KERB; x += 1) line([x, KERB], [x, SIZE]);
  for (let y = 1; y < SIZE; y += 1) line([KERB, y], [SIZE, y]);
  ctx.strokeStyle = ink.paving;
  ctx.lineWidth = 0.035;
  ctx.stroke();
}

// Drains in the slabs by the kerb, [x, y].
const DRAINS = [[12, 83.9], [34.2, 83.9], [67, 83.9], [83.9, 18.5], [83.9, 47], [83.9, 76.5]];
function drain(ctx, x, y, ink) {
  rect(ctx, x - 0.3, y - 0.3, 0.6, 0.6, 0.006, ink.drain, { lw: 0.03, stroke: ink.paving });
  if (!Q.detail) return;
  const along = y > EDGE; // bars across the run
  for (let i = 1; i < 5; i++) {
    const u = -0.3 + i * 0.12;
    face(ctx, along ? [[x + u, y - 0.26, 0.008], [x + u, y + 0.26, 0.008]] : [[x - 0.26, y + u, 0.008], [x + 0.26, y + u, 0.008]], null, { stroke: ink.pavement, lw: 0.04 });
  }
}

// Chewing gum, trodden flat: everywhere, except round the finds.
const GUM = (() => {
  const r = rng(85), out = [];
  const clear = [[82.65, 39.45], [30, 84], [61.2, 82.1]];
  while (out.length < 70) {
    const left = r() < 0.5, run = r() * 84, across = EDGE + 0.2 + r() * 3.6;
    const [x, y] = left ? [run, across] : [across, run];
    if (clear.some(([cx, cy]) => Math.hypot(x - cx, y - cy) < 1.6)) continue;
    if (x > 81.8 && x < 84.2 && y > 22 && y < 28.6) continue; // the hopscotch
    out.push([x, y, 0.05 + r() * 0.06]);
  }
  return out;
})();

// A hopscotch, in chalk, up the right-hand front: rows of one or two squares
// from 1 to 10, and home.
const HOP = { x: 83, y: 28.2, cell: 0.6 };
const HOP_ROWS = [[1], [2], [3], [4, 5], [6], [7, 8], [9], [10]];
function hopscotch(ctx, night) {
  const chalk = night ? alpha(mix(C.lilac, C.white, 0.5), 0.8) : alpha(C.white, 0.95);
  const c = HOP.cell;
  HOP_ROWS.forEach((nums, r) => {
    const y = HOP.y - (r + 1) * c;
    nums.forEach((n, i) => {
      const x = HOP.x - (nums.length * c) / 2 + i * c;
      rect(ctx, x, y, c, c, 0.004, null, { stroke: chalk, lw: 0.05 });
      if (Q.detail) paintText(ctx, 'floor', x + c / 2, y + c / 2, String(n), 0.26, chalk);
    });
  });
  // Home: a half circle at the top.
  const y = HOP.y - HOP_ROWS.length * c;
  ctx.beginPath();
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI * (i / 16);
    const [X, Y] = P(HOP.x + Math.cos(a) * c * 0.9, y - Math.sin(a) * c * 0.9, 0.004);
    i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
  }
  ctx.strokeStyle = chalk;
  ctx.lineWidth = 0.05;
  ctx.stroke();
  // The stone, on 3.
  disc(ctx, HOP.x, HOP.y - 2.5 * c, 0.01, 0.1, night ? C.lilac : C.grey, { lw: 0.025 });
}

// ---------- Props ----------
// A dog, standing, tail going. f: 1 facing screen right, -1 left.
function dog(ctx, t, x, y, f, coat = C.woodLight) {
  const [X, Y] = P(x, y, 0);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(f, 1);
  if (Q.detail) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.4, 0.13, 0, 0, Math.PI * 2);
    ctx.fillStyle = alpha(C.ink, 0.16);
    ctx.fill();
  }
  ctx.strokeStyle = C.ink;
  ctx.lineCap = 'round';
  // Legs.
  ctx.lineWidth = 0.08;
  ctx.beginPath();
  for (const lx of [-0.24, -0.12, 0.14, 0.26]) { ctx.moveTo(lx, -0.3); ctx.lineTo(lx, 0); }
  ctx.stroke();
  // The tail, wagging.
  const wag = Math.sin(t * 12) * 0.12;
  ctx.beginPath();
  ctx.moveTo(-0.3, -0.42);
  ctx.quadraticCurveTo(-0.45, -0.55, -0.48 + wag, -0.72);
  ctx.lineWidth = 0.09;
  ctx.stroke();
  ctx.strokeStyle = coat;
  ctx.lineWidth = 0.05;
  ctx.stroke();
  // Body and head.
  ctx.beginPath();
  ctx.ellipse(0, -0.4, 0.36, 0.17, 0, 0, Math.PI * 2);
  paint(ctx, coat, { lw: 0.035 });
  const sniff = Math.max(0, Math.sin(t * 0.7)) * 0.12;
  ctx.beginPath();
  ctx.ellipse(0.38, -0.62 + sniff, 0.17, 0.14, 0.2, 0, Math.PI * 2);
  paint(ctx, coat, { lw: 0.035 });
  ctx.beginPath();
  ctx.ellipse(0.53, -0.58 + sniff, 0.09, 0.06, 0.2, 0, Math.PI * 2);
  paint(ctx, coat, { lw: 0.03 });
  ctx.beginPath();
  ctx.ellipse(0.3, -0.62 + sniff, 0.06, 0.13, 0.3, 0, Math.PI * 2);
  ctx.fillStyle = C.brown;
  ctx.fill();
  if (Q.detail) {
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(0.43, -0.66 + sniff, 0.028, 0, Math.PI * 2);
    ctx.arc(0.61, -0.6 + sniff, 0.035, 0, Math.PI * 2);
    ctx.fill();
    // The collar.
    ctx.strokeStyle = C.red;
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    ctx.moveTo(0.25, -0.62); ctx.lineTo(0.3, -0.45);
    ctx.stroke();
  }
  ctx.restore();
}

// A camping stool: crossed legs and a canvas seat, h high.
function campStool(ctx, x, y, h = 0.5) {
  ctx.lineCap = 'round';
  face(ctx, [[x - 0.2, y + 0.18, 0], [x + 0.2, y + 0.18, h]], null, { lw: 0.05 });
  face(ctx, [[x + 0.2, y + 0.18, 0], [x - 0.2, y + 0.18, h]], null, { lw: 0.05 });
  face(ctx, [[x - 0.22, y - 0.2, h], [x + 0.22, y - 0.2, h], [x + 0.22, y + 0.2, h], [x - 0.22, y + 0.2, h]], C.green, { lw: 0.035 });
}

// A traffic cone (the streets' own) with a note taped on it: SAVED.
function savedCone(ctx, x, y) {
  cone(ctx, x, y, 0.95);
  const [X, T] = P(x, y, 0.95);
  ctx.save();
  ctx.translate(X + 0.02, T + 0.28);
  ctx.rotate(-0.12);
  ctx.beginPath();
  ctx.rect(-0.2, -0.12, 0.4, 0.24);
  paint(ctx, C.butter, { lw: 0.025 });
  ctx.restore();
  if (Q.detail) label(ctx, x + 0.012, y - 0.012, 0.72, 'SAVED', 0.1, C.ink);
}

// ---------- The queue ----------
// Where a spot along the queue is: s from its front (by Main Street) back,
// along the left-hand front to the corner, then up the right-hand front;
// n from the lane side (0) out to the kerb (1.2).
const TURN = 38; // the corner
function spot(s, n) {
  return s <= TURN ? [46 + s, 83.6 + n] : [83.6 + n, 84.2 - (s - TURN)];
}
// Which way someone faces: f the front of the queue, b the back, o out
// toward you, i in toward the lane. Returns person options { dir, back }.
function facing(s, w) {
  const left = s <= TURN;
  const m = left
    ? { f: ['l', true], b: ['r', false], o: ['l', false], i: ['r', true] }
    : { f: ['l', false], b: ['r', true], o: ['r', false], i: ['l', true] };
  const [dir, back] = m[w];
  return { dir, back };
}

// The clumps, front to back: [s, [[ds, n, faces, extra], ...]]. Thickest by
// Main Street, thinning round the corner, with gaps.
const CLUMPS = [
  [0, [[0, 0.5, 'b', { kind: 'stool' }], [1.1, 0.25, 'f', { kind: 'flask' }]]], // here since noon
  [2.6, [[0, 0.2, 'b'], [0.9, 0.9, 'f'], [1.7, 0.3, 'o'], [2.5, 0.8, 'f', { pose: 'read' }]]],
  [6.4, [[0, 0.6, 'o', { kind: 'carry' }], [1.0, 0.2, 'f'], [1.8, 0.9, 'i', { kid: true }]]],
  [10.2, [[0, 0.3, 'f'], [0.8, 1.0, 'b', { pose: 'point' }], [1.6, 0.4, 'f'], [2.4, 0.9, 'o'], [3.2, 0.3, 'b', { kind: 'dog' }]]],
  [15.2, [[0, 0.5, 'f'], [0.9, 0.2, 'b'], [1.6, 0.9, 'f']]],
  [18.9, [[0, 0.4, 'f'], [0.8, 0.9, 'b']]],
  [21.9, [[0, 0.3, 'o'], [0.9, 0.8, 'f'], [1.7, 0.4, 'b', { pose: 'read' }]]],
  [25.6, [[0, 0.6, 'f'], [0.9, 0.2, 'f']]],
  [28.4, [[0, 0.55, 'f', { kind: 'cone' }]]], // holding somebody's place
  [30.6, [[0, 0.4, 'f'], [0.9, 0.9, 'b'], [1.7, 0.3, 'f', { kid: true }]]],
  [34.4, [[0, 0.6, 'f'], [1.0, 0.3, 'o']]],
  [38.3, [[0, 0.5, 'f'], [0.9, 0.9, 'b'], [1.7, 0.4, 'f']]], // round the corner
  [43.5, [[0, 0.4, 'f'], [0.9, 0.8, 'b']]],
  [49.5, [[0, 0.6, 'f', { pose: 'read' }]]],
  [53.2, [[0, 0.3, 'f'], [0.8, 0.9, 'o']]],
  [60, [[0, 0.5, 'f'], [0.9, 0.4, 'b']]],
  [69.5, [[0, 0.6, 'f']]],
  [74.2, [[0, 0.3, 'f'], [0.8, 0.9, 'b']]],
  [79, [[0, 0.5, 'f']]],
  [86, [[0, 0.4, 'f']]],
];
const LAST = 86;
// Everyone in it, with when they join (from noon to 6:20pm, front first) and
// when they go (in to the party from 7:10pm, front first; the last by 10).
const QUEUE = [];
CLUMPS.forEach(([s0, members], c) => members.forEach(([ds, n, w, extra = {}], i) => {
  const s = s0 + ds;
  QUEUE.push({
    s, n, w, ...extra,
    join: 12 + 6.3 * (s0 / LAST) + i * 0.06,
    leave: 19.2 + 2.6 * (s0 / LAST),
    look: folk(300 + QUEUE.length * 7, extra.kid ? { style: 'short' } : {}),
    seed: c * 5 + i,
  });
}));
const inQueue = (q, h) => h >= q.join && h < q.leave;

// One of them, drawn: walking up from behind for their first moments.
function queuer(ctx, t, q) {
  const h = hour(t);
  if (!inQueue(q, h)) return;
  const walk = Math.min(1, (h - q.join) * 15 / 1.6); // 1.6 seconds walking in
  const s = q.s + (1 - walk) * 2.6;
  const [x, y] = spot(s, q.n);
  if (q.kind === 'cone') { savedCone(ctx, x, y); return; }
  const arriving = walk < 1;
  const face = facing(q.s, arriving ? 'f' : q.w);
  const look = { ...q.look, ...face, phase: q.seed * 1.7 };
  if (arriving) {
    person(ctx, x, y, 0, { ...look, pose: 'walk', scale: q.kid ? 0.7 : 1 }, t);
    return;
  }
  if (q.kind === 'stool') {
    campStool(ctx, x, y, 0.5);
    person(ctx, x, y, (0.5 * 1.12 - 0.8) / 1.12, { ...look, pose: 'sit', hat: 'sun' }, t);
    return;
  }
  if (q.kind === 'flask') {
    // A tartan flask at their feet, and a cup of something hot.
    cylinder(ctx, x + 0.25, y + 0.35, 0, 0.11, 0.5, C.red, { flat: true });
    cylinder(ctx, x + 0.25, y + 0.35, 0.5, 0.09, 0.1, C.grey, { flat: true });
    person(ctx, x, y, 0, {
      ...look, pose: 'stand', arms: [1.3, 0.1], hat: 'beanie',
      hold: (c, tt) => {
        c.beginPath();
        c.rect(0.02, -0.14, 0.16, 0.18);
        paint(c, C.white, { lw: 0.03 });
        if (!Q.detail) return;
        c.strokeStyle = alpha(C.white, 0.8);
        c.lineWidth = 0.035;
        c.beginPath();
        for (const dx of [0.06, 0.14]) {
          const k = (tt * 0.8 + dx * 5) % 1;
          c.moveTo(dx, -0.2 - k * 0.4);
          c.quadraticCurveTo(dx + 0.08, -0.3 - k * 0.4, dx, -0.4 - k * 0.4);
        }
        c.stroke();
      },
    }, t);
    return;
  }
  if (q.kind === 'carry') {
    // A kid asleep on a parent's hip, face in their shoulder, out cold.
    person(ctx, x, y, 0, { ...look, pose: 'carry', style: 'bun' }, t);
    const f = face.dir === 'l' ? -1 : 1;
    const [X, Y] = P(x, y, 0);
    ctx.save();
    ctx.translate(X + f * 0.22, Y - 0.72);
    ctx.rotate(-f * 0.25);
    person(ctx, 0, 0, 0, { ...folk(q.seed + 900), pose: 'stand', scale: 0.5, dir: f > 0 ? 'l' : 'r', back: true, arms: [0.9, 0.6] }, t);
    ctx.restore();
    if (Q.detail) {
      const k = (t * 0.5 + q.seed * 0.3) % 1;
      label(ctx, x - 0.3 * k, y - 0.3 * k, 2.2 + k * 0.9, 'z', 0.28 + k * 0.2, alpha(C.ink, 1 - k));
    }
    return;
  }
  person(ctx, x, y, 0, { ...look, pose: q.pose || 'stand', scale: q.kid ? 0.7 : 1 }, t);
  if (q.kind === 'dog') {
    const [dx, dy] = q.s <= TURN ? [0.5, 0.45] : [0.45, -0.5];
    dog(ctx, t, x + dx, y + dy, face.dir === 'l' ? -1 : 1);
  }
}

// Who's at the back right now (and who's in front of them): they ask what
// it's for; the one in front never knows.
function tail(h) {
  let last = null, prev = null;
  for (const q of QUEUE) {
    if (q.kind === 'cone' || !inQueue(q, h) || (h - q.join) * 15 < 1.6) continue;
    if (!last || q.s > last.s) { prev = last; last = q; } else if (!prev || q.s > prev.s) prev = q;
  }
  return { last, prev };
}
const ANSWERS = ['No idea.', 'Dunno. Worth it though.', 'Shh. It\'s moving.', 'Something good, I heard.'];

// ---------- The hot dog cart ----------
// Near the back of the right-hand front, in front of the arcade.
const CART = { x: 81.75, y: 11.2, w: 1.0, d: 1.8, z: 0.35, h: 0.85 };
function cart(ctx) {
  const { x, y, w, d, z, h } = CART;
  // The legs at the back end, the handle at the front.
  for (const yy of [y + 0.1, y + 0.1]) box(ctx, x + 0.1, yy, 0, 0.08, 0.08, z, C.grey, { flat: true, lw: 0.03 });
  box(ctx, x, y, z, w, d, h, C.white, { top: C.greyLight, right: tint(C.coral, 0.1), left: shade(C.white, 0.12) });
  // A coral stripe round it.
  face(ctx, [[x, y + d, z + 0.12], [x + w, y + d, z + 0.12], [x + w, y + d, z + 0.3], [x, y + d, z + 0.3]], C.coral, { lw: 0.03 });
  face(ctx, [[x + w, y, z + h - 0.12], [x + w, y + d, z + h - 0.12], [x + w, y + d, z + h], [x + w, y, z + h]], C.coral, { lw: 0.03 });
  board(ctx, 'y', x + w + 0.01, y + d / 2, z + 0.42, 1.5, 0.42, 'HOT DOGS', { board: C.butter, ink: C.red, size: 0.24 });
  // The handle.
  face(ctx, [[x + 0.2, y + d, z + h - 0.1], [x + 0.2, y + d + 0.35, z + h], [x + w - 0.2, y + d + 0.35, z + h], [x + w - 0.2, y + d, z + h - 0.1]], null, { lw: 0.06 });
  // Two wheels on the near side.
  for (const wy of [y + 0.45, y + 1.35]) {
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const [X, Y] = P(x + w + 0.03, wy + Math.cos(a) * 0.34, 0.34 + Math.sin(a) * 0.34);
      i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
    ctx.closePath();
    paint(ctx, C.ink, { lw: 0.03 });
    const [X, Y] = P(x + w + 0.04, wy, 0.34);
    ctx.beginPath();
    ctx.arc(X, Y, 0.1, 0, Math.PI * 2);
    paint(ctx, C.grey, { lw: 0.025 });
  }
  if (!Q.detail) return;
  // On top: the grill with sausages, the buns, ketchup and mustard.
  const top = z + h;
  rect(ctx, x + 0.12, y + 0.2, 0.7, 0.75, top + 0.005, C.ink, { lw: 0.02 });
  for (let i = 0; i < 4; i++) {
    const [X, Y] = P(x + 0.25 + i * 0.15, y + 0.58, top + 0.03);
    ctx.beginPath();
    ctx.ellipse(X, Y, 0.28, 0.06, 0.46, 0, Math.PI * 2);
    paint(ctx, C.red, { lw: 0.02 });
  }
  box(ctx, x + 0.15, y + 1.05, top, 0.65, 0.4, 0.1, C.woodLight, { flat: true, lw: 0.025 });
  cylinder(ctx, x + 0.3, y + 1.65, top, 0.07, 0.3, C.red, { flat: true });
  cylinder(ctx, x + 0.55, y + 1.65, top, 0.07, 0.3, C.mustard, { flat: true });
}
// The umbrella over it: a striped cone on a pole.
function brolly(ctx) {
  const cx = 82.25, cy = 12.1, rim = 2.3, apex = 2.8, r = 1.05, n = 8;
  box(ctx, cx - 0.04, cy - 0.04, CART.z + CART.h, 0.08, 0.08, apex - CART.z - CART.h, C.ink, { flat: true, stroke: false });
  const segs = [];
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    const p0 = [cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, rim], p1 = [cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, rim];
    segs.push({ pts: [[cx, cy, apex], p0, p1], depth: p0[0] + p0[1] + p1[0] + p1[1], color: i % 2 ? C.white : C.coral });
  }
  segs.sort((a, b) => a.depth - b.depth);
  for (const s of segs) face(ctx, s.pts, s.color, { lw: 0.035 });
  const [X, Y] = P(cx, cy, apex);
  ctx.beginPath();
  ctx.arc(X, Y - 0.06, 0.08, 0, Math.PI * 2);
  paint(ctx, C.coral, { lw: 0.025 });
}

// ---------- The newsstand ----------
// A green kiosk in front of the band's room. Today's papers on the counter,
// magazines on the rack, and tomorrow's paper clipped at the top of it.
const KIOSK = { x: 59.0, y: 81.35, w: 2.95, d: 1.1, h: 1.1 };
const RACK = { x: 60.45, y: 81.5, w: 1.5, d: 0.65, z: 1.1, h: 1.75 };
function kiosk(ctx) {
  const { x, y, w, d, h } = KIOSK;
  box(ctx, x, y, 0, w, d, h, C.green, { top: tint(C.green, 0.15) });
  board(ctx, 'x', x + 0.75, y + d + 0.01, 0.7, 1.2, 0.42, 'NEWS', { board: C.butter, ink: C.green, size: 0.3 });
  if (!Q.detail) return;
  // Today's papers, in stacks: grey print, nothing to see.
  for (const [px, py] of [[x + 0.1, y + 0.15], [x + 0.72, y + 0.2]]) {
    box(ctx, px, py, h, 0.55, 0.5, 0.14, C.greyLight, { flat: true, lw: 0.025, top: C.white });
    const [X, Y] = P(px + 0.27, py + 0.25, h + 0.14);
    ctx.fillStyle = alpha(C.ink, 0.45);
    for (let i = 0; i < 3; i++) ctx.fillRect(X - 0.2, Y - 0.12 + i * 0.09, 0.4 - i * 0.08, 0.04);
  }
  // A card: DO NOT WAKE. (He isn't going to.)
  face(ctx, [[x + 1.4, y + 0.6, h], [x + 1.4 + 0.02, y + 0.6, h + 0.3], [x + 1.4 + 0.42, y + 0.6, h + 0.3], [x + 1.4 + 0.4, y + 0.6, h]], C.white, { lw: 0.025 });
  words(ctx, 'x', x + 1.61, y + 0.6, h + 0.15, 'DO NOT WAKE', 0.06, C.ink);
}
function rack(ctx) {
  const { x, y, w, d, z, h } = RACK;
  box(ctx, x, y, z, w, d, h, C.green, { top: tint(C.green, 0.15) });
  // Magazines, in a row under the paper.
  const mags = [C.pink, C.teal, C.mustard];
  mags.forEach((m, i) => {
    const mx = x + 0.08 + i * 0.47, my = y + d + 0.01;
    face(ctx, [[mx, my, z + 0.12], [mx + 0.4, my, z + 0.12], [mx + 0.4, my, z + 0.7], [mx, my, z + 0.7]], m, { lw: 0.025 });
    face(ctx, [[mx + 0.05, my, z + 0.55], [mx + 0.35, my, z + 0.55], [mx + 0.35, my, z + 0.64], [mx + 0.05, my, z + 0.64]], C.white, { stroke: false });
  });
}
// The find: tomorrow's paper, big and white, a red date band, the headline in
// ink. Faces you from the top of the rack.
function tomorrow(ctx) {
  const cx = 61.2, y = RACK.y + RACK.d + 0.02, z0 = 1.9, z1 = 2.72, w = 0.92;
  const x0 = cx - w / 2, x1 = cx + w / 2;
  face(ctx, [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], C.white, { lw: 0.04 });
  // The masthead, the date band (tomorrow's), the headline, a photo.
  face(ctx, [[x0 + 0.04, y, z1 - 0.2], [x1 - 0.04, y, z1 - 0.2], [x1 - 0.04, y, z1 - 0.06], [x0 + 0.04, y, z1 - 0.06]], C.red, { stroke: false });
  words(ctx, 'x', cx, y, z1 - 0.13, 'SUNDAY. TOMORROW', 0.075, C.white);
  words(ctx, 'x', cx, y, z1 - 0.3, 'GOOSE HELD', 0.15, C.ink);
  words(ctx, 'x', cx, y, z1 - 0.45, 'IN MANOR CASE', 0.12, C.ink);
  face(ctx, [[x0 + 0.08, y, z0 + 0.06], [x0 + 0.38, y, z0 + 0.06], [x0 + 0.38, y, z0 + 0.25], [x0 + 0.08, y, z0 + 0.25]], C.greyLight, { lw: 0.02 });
  if (Q.detail) {
    // A goose in the photo, in a monocle.
    const [X, Y] = P(x0 + 0.23, y, z0 + 0.14);
    ctx.beginPath();
    ctx.ellipse(X, Y + 0.03, 0.08, 0.05, 0, 0, Math.PI * 2);
    ctx.fillStyle = C.white;
    ctx.fill();
    ctx.fillStyle = C.coral;
    ctx.fillRect(X - 0.1, Y - 0.06, 0.04, 0.02);
    ctx.fillStyle = alpha(C.ink, 0.5);
    for (let i = 0; i < 3; i++) {
      const [lx, ly] = P(x0 + 0.45, y, z0 + 0.22 - i * 0.06);
      ctx.fillRect(lx, ly, 0.42, 0.025);
    }
  }
  // A peg, clipping it to the rack.
  box(ctx, cx - 0.05, y - 0.02, z1 - 0.05, 0.1, 0.06, 0.18, C.mustard, { flat: true, lw: 0.025 });
}
// The blind over the rack's top, pulled down over tomorrow's paper (k: 0
// down, 1 rolled up). A corner of the paper pokes out crooked at its side.
function blind(ctx, k) {
  const cx = 61.2, y = RACK.y + RACK.d + 0.05, x0 = cx - 0.52, x1 = cx + 0.52, top = 2.82;
  const zb = 1.84 + (top - 0.1 - 1.84) * k;
  if (k < 0.5) {
    face(ctx, [[x1 - 0.05, y, 2.5], [x1 + 0.16, y, 2.44], [x1 + 0.12, y, 2.66], [x1 - 0.05, y, 2.7]], C.white, { lw: 0.025 });
    face(ctx, [[x1, y, 2.58], [x1 + 0.13, y, 2.55], [x1 + 0.12, y, 2.62], [x1, y, 2.65]], C.red, { stroke: false });
  }
  face(ctx, [[x0, y, zb], [x1, y, zb], [x1, y, top], [x0, y, top]], shade(C.green, 0.12), { lw: 0.035, dots: shade(C.green, 0.45), density: 0.18 });
  // The roller, and the pull cord.
  face(ctx, [[x0 - 0.04, y, top - 0.1], [x1 + 0.04, y, top - 0.1], [x1 + 0.04, y, top + 0.02], [x0 - 0.04, y, top + 0.02]], C.green, { lw: 0.03 });
  face(ctx, [[cx, y, zb], [cx, y, zb - 0.14]], null, { lw: 0.025 });
  disc(ctx, cx, y, zb - 0.16, 0.035, C.mustard, { lw: 0.02 });
  if (k < 0.3) {
    words(ctx, 'x', cx, y, 2.42, 'NOT TILL', 0.1, C.butter);
    words(ctx, 'x', cx, y, 2.22, 'SUNDAY', 0.17, C.butter);
  }
}

// A red phone box on the corner. It rings now and then; answer it.
const PB = { x: 81.3, y: 81.3, w: 0.95, d: 0.95, h: 2.55 };
function phoneBox(ctx) {
  const { x, y, w, d, h } = PB, x1 = x + w, y1 = y + d;
  box(ctx, x, y, 0, w, d, h, C.red, { right: shade(C.red, 0.12), dotsL: shade(C.red, 0.4) });
  box(ctx, x - 0.06, y - 0.06, h, w + 0.12, d + 0.12, 0.14, shade(C.red, 0.1), { lw: 0.035 });
  box(ctx, x + 0.1, y + 0.1, h + 0.14, w - 0.2, d - 0.2, 0.1, C.red, { lw: 0.03 });
  // TELEPHONE over the door and round the side.
  face(ctx, [[x + 0.1, y1, h - 0.3], [x1 - 0.1, y1, h - 0.3], [x1 - 0.1, y1, h - 0.1], [x + 0.1, y1, h - 0.1]], C.white, { lw: 0.02 });
  face(ctx, [[x1, y + 0.1, h - 0.3], [x1, y1 - 0.1, h - 0.3], [x1, y1 - 0.1, h - 0.1], [x1, y + 0.1, h - 0.1]], C.white, { lw: 0.02 });
  words(ctx, 'x', x + w / 2, y1, h - 0.2, 'TELEPHONE', 0.1, C.ink);
  words(ctx, 'y', x1, y + d / 2, h - 0.2, 'TELEPHONE', 0.1, C.ink);
  // Panes down the side.
  for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) {
    const z = 0.75 + r * 0.38, u = y + 0.14 + c * 0.35;
    face(ctx, [[x1, u, z], [x1, u + 0.3, z], [x1, u + 0.3, z + 0.32], [x1, u, z + 0.32]], tint(C.sky, 0.3), { lw: 0.02 });
  }
}
// Its door (the side facing the queue), open by k, and the phone inside.
function phoneDoor(ctx, k) {
  const { x, y, w, h } = PB, y1 = y + PB.d, hx = x + 0.06, W = w - 0.12, top = h - 0.36;
  if (k > 0.02) {
    // Inside: dark, a phone on the back wall, the handset off its hook.
    face(ctx, [[hx, y1, 0.05], [hx + W, y1, 0.05], [hx + W, y1, top], [hx, y1, top]], shade(C.red, 0.65), { lw: 0.025 });
    box(ctx, x + 0.32, y + 0.12, 1.35, 0.3, 0.12, 0.4, C.ink, { flat: true, lw: 0.02 });
    face(ctx, [[x + 0.47, y + 0.3, 1.4], [x + 0.55, y + 0.6, 0.95]], null, { lw: 0.03 });
    box(ctx, x + 0.45, y + 0.55, 0.82, 0.16, 0.1, 0.16, C.ink, { flat: true, stroke: false });
  }
  const a = k * 1.35, ex = hx + W * Math.cos(a), ey = y1 + W * Math.sin(a);
  face(ctx, [[hx, y1, 0.05], [ex, ey, 0.05], [ex, ey, top], [hx, y1, top]], k > 0.02 ? shade(C.red, 0.05) : C.red, { lw: 0.03 });
  for (let r = 0; r < 4; r++) {
    const z = 0.75 + r * 0.38;
    const p = (f, zz) => [hx + (ex - hx) * f, y1 + (ey - y1) * f, zz];
    face(ctx, [p(0.15, z), p(0.85, z), p(0.85, z + 0.32), p(0.15, z + 0.32)], tint(C.sky, 0.3), { lw: 0.02 });
  }
}
// Ringing, every so often: lines off the crown.
function ring(ctx, t) {
  if ((t % 13) > 1.8 || !Q.detail) return;
  const [X, Y] = P(PB.x + PB.w / 2, PB.y + PB.d / 2, PB.h + 0.35);
  const j = Math.sin(t * 40) * 0.03;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.05;
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    for (const r of [0.55, 0.75]) {
      ctx.beginPath();
      ctx.arc(X + j, Y, r, s > 0 ? -0.5 : Math.PI - 0.5, s > 0 ? 0.5 : Math.PI + 0.5);
      ctx.stroke();
    }
  }
  label(ctx, PB.x + PB.w / 2 - 0.2, PB.y + PB.d / 2 + 0.2, PB.h + 0.75, 'RING!', 0.32, C.red);
}

// "Have you seen this goose?", big, on the corner's lamp post, with the
// goose drawn the size of the real one.
function bigPoster(ctx, x, y) {
  const [X, Y] = P(x, y, 1.4);
  ctx.beginPath();
  ctx.rect(X - 0.75, Y - 1.0, 1.5, 1.9);
  paint(ctx, mix(C.butter, C.white, 0.55), { lw: 0.04 });
  ctx.fillStyle = alpha(C.white, 0.75);
  ctx.fillRect(X - 0.83, Y - 1.06, 0.26, 0.1);
  ctx.fillRect(X + 0.57, Y - 1.06, 0.26, 0.1);
  label(ctx, x, y, 2.18, 'HAVE YOU SEEN', 0.14, C.ink);
  label(ctx, x, y, 1.98, 'THIS GOOSE?', 0.18, C.red);
  goose(ctx, x, y, 0.75, 0, { pose: 'stand', dir: 'r' });
  if (Q.detail) label(ctx, x, y, 0.64, 'answers to Geraldine', 0.1, C.ink, 'Rethink Sans');
}

// Today's headline, on a board on the pavement.
function aboard(ctx) {
  const x0 = 62.15, x1 = 62.85, y = 82.05;
  face(ctx, [[x0, y - 0.3, 0], [x1, y - 0.3, 0], [x1, y, 1.0], [x0, y, 1.0]], C.ink, { lw: 0.03 });
  face(ctx, [[x0, y + 0.3, 0], [x1, y + 0.3, 0], [x1, y, 1.0], [x0, y, 1.0]], C.white, { lw: 0.035 });
  if (!Q.detail) return;
  words(ctx, 'x', (x0 + x1) / 2, y + 0.12, 0.62, 'PARTY', 0.15, C.navy);
  words(ctx, 'x', (x0 + x1) / 2, y + 0.2, 0.4, 'TODAY!', 0.13, C.coral);
}
const SNOOZER = { x: 58.4, y: 81.95, look: { ...folk(47), top: C.green, bottom: C.brown, hat: 'cap' } };

// ---------- The busker ----------
// In front of the ball pit, facing the lane, his case open in front of him:
// WILL STOP FOR COINS. When someone drops one in, he does, for a bit.
const BUSK = { x: 81.55, y: 56.0 };
const CASE = { x: 82.3, y: 57.1 };
const PASS = 24, PASS_AT = 4.2; // a passer-by every 24 seconds; the coin goes in at 4.2 + 0.6
const BUSKER = { ...folk(88), top: C.mustard, bottom: C.navy, hat: 'beanie', style: 'long' };
function guitarCase(ctx) {
  onFloor(ctx, CASE.x, CASE.y, Math.PI / 2, () => {
    // The shell: the body end wide, the neck end narrow.
    const shell = () => {
      ctx.beginPath();
      ctx.moveTo(-0.85, -0.2);
      ctx.lineTo(0.05, -0.22);
      ctx.quadraticCurveTo(0.2, -0.4, 0.55, -0.38);
      ctx.quadraticCurveTo(0.9, -0.35, 0.9, 0);
      ctx.quadraticCurveTo(0.9, 0.35, 0.55, 0.38);
      ctx.quadraticCurveTo(0.2, 0.4, 0.05, 0.22);
      ctx.lineTo(-0.85, 0.2);
      ctx.closePath();
    };
    shell();
    paint(ctx, C.ink, { lw: 0.03 });
    ctx.save();
    ctx.translate(0.02, 0);
    ctx.scale(0.88, 0.8);
    shell();
    ctx.fillStyle = C.red;
    ctx.fill();
    ctx.restore();
    if (!Q.detail) return;
    // Coins, and a button.
    ctx.fillStyle = C.mustard;
    ctx.strokeStyle = shade(C.mustard, 0.4);
    ctx.lineWidth = 0.02;
    for (const [u, v] of [[0.5, 0.05], [0.62, -0.14], [0.35, 0.16], [0.7, 0.12], [0.42, -0.1]]) {
      ctx.beginPath();
      ctx.arc(u, v, 0.055, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(-0.3, 0.02, 0.05, 0, Math.PI * 2);
    ctx.fillStyle = C.teal;
    ctx.fill();
  });
  // The sign, propped in the neck end.
  const x0 = CASE.x - 0.38, x1 = CASE.x + 0.38, y = CASE.y - 0.6;
  face(ctx, [[x0, y + 0.1, 0.02], [x1, y + 0.1, 0.02], [x1, y, 0.5], [x0, y, 0.5]], C.woodLight, { lw: 0.03 });
  words(ctx, 'x', CASE.x, y + 0.03, 0.37, 'WILL STOP', 0.1, C.ink);
  words(ctx, 'x', CASE.x, y + 0.07, 0.2, 'FOR COINS', 0.1, C.ink);
}
// Is the busker stopped (paid) at t? For three seconds after a coin lands.
function paid(t) {
  const h = hour(t);
  if (h < 8 || h > 21.5) return false;
  const c = ((t % PASS) + PASS) % PASS;
  return c >= PASS_AT + 0.6 && c < PASS_AT + 3.8;
}
const onDuty = (h) => h >= 7.5 && h < 22.5;

// ---------- Where the other things go ----------
const LAMPS = [[EDGE + 0.6, 8], [EDGE + 0.6, 24], [EDGE + 0.6, 52], [EDGE + 0.6, 72], [8, EDGE + 0.6], [24, EDGE + 0.6], [52, EDGE + 0.6], [72, EDGE + 0.6]];
const POSTERS = [[EDGE + 0.6, 24], [52, EDGE + 0.6]]; // and a big one at 72 (the decoy)

export default {
  id: 'pavement',
  name: 'The Pavement',
  blurb: 'The queue for the party goes right round the block. Nobody in it knows what it\'s for.',
  shape: PAVEMENT,
  home: [EDGE + 2, EDGE - 8], // the front corner
  build(R) {
    // The ground, printed by day and again in night inks.
    // (One call: the day everywhere first, then the night over it.)
    printed(R, [paving, (ctx, ink) => {
      const night = ink === STREET_NIGHT;
      for (const [x, y] of DRAINS) drain(ctx, x, y, ink);
      hopscotch(ctx, night);
      if (!Q.detail) return;
      const gum = night ? mix(ink.pavement, C.night, 0.35) : mix(ink.pavement, C.ink, 0.22);
      for (const [x, y, r] of GUM) disc(ctx, x, y, 0.004, r, gum, { stroke: false });
      // Chalk, by the start of the queue: someone has a theory.
      paintText(ctx, 'floor', 41.6, 83.6, 'QUEUE STARTS HERE', 0.26, night ? alpha(C.lilac, 0.8) : alpha(C.white, 0.95));
    }]);

    // ---------- Lamp posts ----------
    for (const [x, y] of LAMPS) streetLamp(R, x, y, POSTERS.some(([px, py]) => px === x && py === y));
    R.thing(EDGE + 0.78, 72.18, (ctx) => bigPoster(ctx, EDGE + 0.76, 72.16));
    R.decoy({ id: 'poster', at: [EDGE + 0.76, 72.16, 1.3], r: 0.8, say: ["A poster. She's still at large.", 'Answers to Geraldine. Not to you.', 'Reward: bread. Stale.'] });

    // ---------- The phone box ----------
    R.thing(PB.x + PB.w, PB.y + PB.d, (ctx) => phoneBox(ctx));
    const phone = R.poke({ id: 'phone', at: [PB.x + PB.w / 2, PB.y + PB.d / 2, 1.4], r: 1.0, hold: 3, sound: 'tick', teach: true, say: ["It's for you.", 'Hello? No, no goose here.', 'Wrong number. Again.'] });
    R.thing(PB.x + PB.w, PB.y + PB.d + 0.02, (ctx, t) => { phoneDoor(ctx, phone.k()); ring(ctx, t); }, { anim: true, depth: PB.x + PB.y + PB.w + PB.d + 0.05 });

    // ---------- The queue ----------
    // A sign where it starts, with a ticket machine (empty) on the pole.
    R.thing(45.5, 84.35, (ctx) => {
      pole(ctx, 45.4, 84.25, 2.2);
      box(ctx, 45.2, 84.3, 0.95, 0.4, 0.25, 0.4, C.red, { flat: true, lw: 0.03 });
      words(ctx, 'x', 45.4, 84.56, 1.15, 'TAKE A', 0.07, C.white);
      words(ctx, 'x', 45.4, 84.56, 1.05, 'NUMBER', 0.07, C.white);
      board(ctx, 'x', 45.4, 84.33, 1.9, 1.15, 0.45, 'QUEUE HERE', { board: C.white, ink: C.coral, size: 0.2 });
    });
    for (const q of QUEUE) {
      const [x, y] = spot(q.s, q.n);
      R.thing(x, y, (ctx, t) => queuer(ctx, t, q), { anim: true, on: (t) => inQueue(q, hour(t)) });
    }
    // The back asks; the one in front answers.
    R.mover((t) => {
      const { last, prev } = tail(hour(t));
      if (!last) return { x: EDGE + 2, y: EDGE + 2, on: false };
      const [x, y] = spot(last.s, last.n);
      return { x, y, on: true, prev: prev && spot(prev.s, prev.n) };
    }, (ctx, t, p) => {
      if (!p.on || !readable()) return;
      const c = t % 11, round = Math.floor(t / 11);
      if (c < 3.5) speech(ctx, p.x, p.y, 2.75, 'WHAT\'S THIS QUEUE FOR?', { size: 0.42 });
      else if (p.prev && c > 4 && c < 6.6) speech(ctx, p.prev[0], p.prev[1], 2.75, ANSWERS[round % ANSWERS.length], { size: 0.42 });
    }, { bias: 4 });

    // ---------- The hot dog cart ----------
    const VENDOR = { ...folk(33), top: C.white, bottom: C.red, hat: 'cap' };
    // He stands at the handle end, out from under the umbrella (so you can
    // see him), turning the sausages.
    R.thing(82.2, 13.65, (ctx, t) => {
      if (!onDuty(hour(t))) return;
      const turn = Math.sin(t * 2.2);
      person(ctx, 82.2, 13.65, 0, { ...VENDOR, dir: 'r', back: true, arms: [1.3 + turn * 0.25, 1.0] }, t);
    }, { anim: true, depth: 96.5 });
    R.thing(CART.x + CART.w, CART.y + CART.d + 0.2, (ctx) => cart(ctx));
    R.thing(CART.x + CART.w + 0.05, CART.y + CART.d + 0.25, (ctx) => brolly(ctx));
    R.thing(82.3, 11.8, (ctx, t) => {
      if (!Q.detail || !onDuty(hour(t))) return;
      particles(t, 5, 2.2, (k, r) => {
        const [X, Y] = P(82.2 + r() * 0.3, 11.5 + r() * 0.4, 1.25 + k * 0.9);
        ctx.beginPath();
        ctx.arc(X + Math.sin(k * 5 + r() * 6) * 0.06, Y, 0.08 + k * 0.16, 0, Math.PI * 2);
        ctx.fillStyle = alpha(C.white, 0.7 * (1 - k));
        ctx.fill();
      }, 11);
    }, { anim: true });
    R.poke({ id: 'cart', at: [82.3, 12.1, 1.3], r: 1.0, say: ['One with everything?', 'Ketchup is extra.', 'No. It is not goose.'] });
    // The lunchtime queue: two.
    const LUNCH = [[83.7, 12.2, folk(71)], [84.55, 11.5, folk(72, { pose: 'read' })]];
    LUNCH.forEach(([x, y, look], i) => R.thing(x, y, (ctx, t) => {
      const h = hour(t);
      if (h < 11.5 || h >= 14) return;
      person(ctx, x, y, 0, { ...look, dir: 'l', back: true }, t);
      if (i === 0 && t % 9 < 2.5 && readable()) speech(ctx, x, y, 2.75, 'ONE WITH EVERYTHING.', { size: 0.42 });
    }, { anim: true }));

    // ---------- The newsstand ----------
    R.thing(KIOSK.x + KIOSK.w, KIOSK.y + KIOSK.d, (ctx) => kiosk(ctx));
    R.thing(RACK.x + RACK.w, RACK.y + RACK.d + 0.05, (ctx) => rack(ctx));
    // Tomorrow's paper, behind the blind: a tap rolls it up.
    const shade1 = R.poke({ id: 'rack', at: [61.2, 82.17, 2.3], r: 0.8 });
    R.thing(RACK.x + RACK.w, RACK.y + RACK.d + 0.07, (ctx) => { tomorrow(ctx); blind(ctx, shade1.k()); }, { anim: true });
    R.find({ id: 'newspaper', label: 'Tomorrow\'s newspaper', kind: 'poke', inside: shade1, at: [61.2, 82.17, 2.3], r: 0.75, hint: 'Somebody has the news before it happens. The newsstand has a blind down.' });
    // Today's papers answer back.
    R.poke({ id: 'papers', at: [59.7, 81.85, 1.3], r: 0.6, sound: 'tick', say: ["Today's. Already old news.", 'Still today.'] });
    R.thing(62.85, 82.35, (ctx) => aboard(ctx));
    // The vendor, asleep on a stool, all day.
    R.thing(SNOOZER.x, SNOOZER.y - 0.05, (ctx) => cylinder(ctx, SNOOZER.x, SNOOZER.y, 0, 0.22, 0.55, C.grey));
    R.thing(SNOOZER.x, SNOOZER.y, (ctx, t) => {
      const { x, y, look } = SNOOZER;
      person(ctx, x, y, (0.55 * 1.12 - 0.8) / 1.12, {
        ...look, pose: 'sit', dir: 'r', arms: [0.3, 0.2],
        face: (c, hy) => {
          if (!Q.detail) return;
          // Eyes shut, mouth open.
          c.fillStyle = look.skin;
          c.beginPath();
          c.arc(0.1, hy + 0.02, 0.05, 0, Math.PI * 2);
          c.arc(0.24, hy + 0.02, 0.05, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = C.ink;
          c.lineWidth = 0.03;
          c.beginPath();
          c.moveTo(0.06, hy + 0.03); c.lineTo(0.14, hy + 0.03);
          c.moveTo(0.2, hy + 0.03); c.lineTo(0.28, hy + 0.03);
          c.stroke();
          c.beginPath();
          c.arc(0.22, hy + 0.15, 0.03 + Math.abs(Math.sin(t * 0.9)) * 0.02, 0, Math.PI * 2);
          c.fillStyle = C.ink;
          c.fill();
        },
      }, t);
      if (!Q.detail) return;
      for (let i = 0; i < 2; i++) {
        const k = (t * 0.45 + i * 0.5) % 1;
        label(ctx, x + 0.3 + k * 0.5, y - 0.3 - k * 0.5, 2.3 + k * 1.1, 'z', 0.3 + k * 0.25, alpha(C.ink, 1 - k));
      }
    }, { anim: true });

    // ---------- The busker ----------
    R.thing(CASE.x + 0.4, CASE.y + 0.9, (ctx) => guitarCase(ctx));
    R.thing(BUSK.x, BUSK.y, (ctx, t) => {
      if (!onDuty(hour(t))) return;
      const stop = paid(t);
      const strum = stop ? 0 : Math.sin(t * 11) * 0.3;
      person(ctx, BUSK.x, BUSK.y, 0, {
        ...BUSKER, dir: 'r', arms: [stop ? 0.2 : 1.1 + strum, 0.9],
        hold: (c) => {
          // A guitar across the body, neck up and out.
          c.save();
          c.rotate(-0.45);
          c.beginPath();
          c.rect(-0.05, -0.08, 0.85, 0.1);
          paint(c, C.brown, { lw: 0.025 });
          c.beginPath();
          c.rect(0.76, -0.12, 0.16, 0.18);
          paint(c, C.brown, { lw: 0.025 });
          c.restore();
          c.beginPath();
          c.ellipse(-0.25, 0.28, 0.3, 0.24, -0.45, 0, Math.PI * 2);
          paint(c, C.wood, { lw: 0.035 });
          c.beginPath();
          c.arc(-0.2, 0.25, 0.07, 0, Math.PI * 2);
          c.fillStyle = C.ink;
          c.fill();
        },
      }, t);
      if (!Q.detail) return;
      if (stop) {
        if (readable() && ((t % PASS) + PASS) % PASS < PASS_AT + 3) speech(ctx, BUSK.x, BUSK.y, 2.75, 'A DEAL\'S A DEAL.', { size: 0.42 });
        return;
      }
      // Notes: some go up, some go wrong and drop.
      particles(t, 3, 2.4, (k, r) => {
        const sour = r() < 0.35, drift = r() * 0.8;
        const z = sour ? 2.0 - k * 1.2 : 1.8 + k * 1.6;
        ctx.save();
        const [X, Y] = P(BUSK.x + 0.4 + drift * 0.3, BUSK.y - 0.2 - drift, z);
        ctx.translate(X, Y);
        ctx.rotate(sour ? 2.6 + Math.sin(k * 9) * 0.4 : Math.sin(k * 6) * 0.3);
        ctx.globalAlpha = 1 - k * 0.8;
        note(ctx, 0, 0, 0, sour ? C.coral : C.ink, 0.8);
        ctx.restore();
      }, 23);
    }, { anim: true });
    R.poke({ id: 'busker', at: [BUSK.x, BUSK.y, 1.4], r: 0.9, sound: 'tick', say: ['Coins in the case, ta.', 'Stopping costs extra.', 'That note was on purpose.'] });
    // A passer-by with a coin, every so often, one way or the other.
    R.mover((t) => {
      const h = hour(t);
      const c = ((t % PASS) + PASS) % PASS, n = Math.floor(t / PASS);
      if (h < 8 || h > 21.5 || c > 9.6) return { x: 83, y: 40, on: false };
      const back = n % 2, from = back ? 65 : 49, to = back ? 49 : 65;
      let y, moving = true;
      if (c < 4) y = from + (57 - from) * (c / 4);
      else if (c < 5.6) { y = 57; moving = false; } else y = 57 + (to - 57) * ((c - 5.6) / 4);
      return { x: 83, y, on: true, c, moving, dir: back ? 'r' : 'l', seed: 120 + (n % 7) };
    }, (ctx, t, p) => {
      if (!p.on) return;
      person(ctx, p.x, p.y, 0, { ...folk(p.seed), pose: p.moving ? 'walk' : 'point', dir: p.moving ? p.dir : 'l', back: p.moving && p.dir === 'r' }, t);
      const k = (p.c - PASS_AT) / 0.6;
      if (k < 0 || k > 1) return;
      // The coin, flipping into the case.
      const [X, Y] = P(83 - 0.7 * k, 57 + 0.1 * k, 1.4 * (1 - k) + Math.sin(k * Math.PI) * 0.7 + 0.1);
      ctx.beginPath();
      ctx.ellipse(X, Y, 0.09 * Math.abs(Math.cos(k * 14)) + 0.02, 0.09, 0, 0, Math.PI * 2);
      paint(ctx, C.mustard, { lw: 0.025 });
    });

    // ---------- The hopscotch ----------
    // A kid, hopping up it and back, through the day.
    const HOPPER = folk(64, { top: C.pink, bottom: C.teal, style: 'pony' });
    R.mover((t) => {
      const h = hour(t);
      if (h < 9 || h >= 16.5) return { x: HOP.x, y: HOP.y, on: false };
      const n = HOP_ROWS.length, hop = 0.55, cyc = n * hop * 2 + 2.8;
      const c = ((t % cyc) + cyc) % cyc;
      let row, k, up = true;
      if (c < n * hop) { row = Math.floor(c / hop); k = (c % hop) / hop; }
      else if (c < n * hop + 0.8) { row = n - 1; k = 0; up = false; }
      else if (c < 2 * n * hop + 0.8) { const cc = c - n * hop - 0.8; row = n - 1 - Math.floor(cc / hop); k = (cc % hop) / hop; up = false; }
      else { row = 0; k = 0; up = false; }
      return { x: HOP.x, y: HOP.y - (row + 0.5) * HOP.cell, z: Math.sin(k * Math.PI) * 0.35, on: true, up };
    }, (ctx, t, p) => {
      if (!p.on) return;
      person(ctx, p.x, p.y, p.z, { ...HOPPER, scale: 0.68, dir: p.up ? 'r' : 'l', back: p.up, arms: [2.4, -2.4] }, t);
    });

    // ---------- The bus stop ----------
    // No buses today (the party). Someone waits anyway.
    R.thing(11.2, 81.35, (ctx) => {
      const x0 = 9.2, x1 = 11.2, y = 81.3;
      for (const x of [x0 + 0.15, x1 - 0.15]) box(ctx, x - 0.05, y, 0, 0.1, 0.5, 0.45, C.ink, { flat: true, stroke: false });
      box(ctx, x0, y - 0.05, 0.55, x1 - x0, 0.08, 0.5, C.teal, { flat: true, lw: 0.03 });
      box(ctx, x0, y, 0.45, x1 - x0, 0.5, 0.1, C.teal, { flat: true, lw: 0.03 });
    });
    const WAITER = { ...folk(58), top: C.purple, hat: 'none', style: 'bald' };
    R.thing(10.3, 81.6, (ctx) => person(ctx, 10.3, 81.6, (0.55 * 1.12 - 0.8) / 1.12, { ...WAITER, pose: 'read', dir: 'l', hold: (c) => {
      c.beginPath();
      c.rect(-0.05, -0.35, 0.5, 0.4);
      paint(c, C.greyLight, { lw: 0.025 });
    } }), { depth: 93 }); // over the bench he sits on
    R.thing(12.3, 81.6, (ctx) => {
      pole(ctx, 12.2, 81.5, 2.4);
      board(ctx, 'x', 12.2, 81.56, 2.15, 0.9, 0.4, 'BUS STOP', { board: C.white, ink: C.navy, size: 0.16 });
      face(ctx, [[11.95, 81.56, 1.2], [12.45, 81.56, 1.2], [12.45, 81.56, 1.6], [11.95, 81.56, 1.6]], C.butter, { lw: 0.025 });
      words(ctx, 'x', 12.2, 81.56, 1.47, 'NO BUSES', 0.08, C.red);
      words(ctx, 'x', 12.2, 81.56, 1.33, 'TODAY', 0.08, C.red);
    });

    // ---------- Street furniture ----------
    // A post box, and a bin.
    R.thing(82.15, 34.9, (ctx) => {
      cylinder(ctx, 81.85, 34.6, 0, 0.32, 1.35, C.red);
      const [X, Y] = P(81.85, 34.6, 1.35);
      ctx.beginPath();
      ctx.ellipse(X, Y, 0.47, 0.3, 0, Math.PI, 0);
      paint(ctx, C.red, { lw: 0.04 });
      face(ctx, [[82.1, 34.4, 1.12], [82.1, 34.8, 1.12]], null, { lw: 0.07 });
      words(ctx, 'y', 82.14, 34.6, 0.8, 'POST', 0.13, C.butter);
    });
    R.thing(35.1, 82.05, (ctx) => {
      cylinder(ctx, 34.8, 81.75, 0, 0.3, 0.9, C.green);
      box(ctx, 34.95, 81.3, 0, 0.1, 0.1, 0.9, C.ink, { flat: true, stroke: false });
    });

    // ---------- The other finds ----------
    // The Courier's card, the only one anywhere: SORRY WE MISSED YOU.
    // (Smaller than a flyer, one corner under the flattened box.)
    R.thing(82.1, 40.3, (ctx) => onFloor(ctx, 82.65, 39.45, -0.35, () => {
      ctx.scale(0.8, 0.8);
      ctx.beginPath();
      ctx.rect(-0.34, -0.22, 0.68, 0.44);
      paint(ctx, C.white, { lw: 0.035 });
      ctx.fillStyle = C.brown;
      ctx.fillRect(-0.34, -0.22, 0.68, 0.12);
      if (!Q.detail) return;
      floorText(ctx, 0, -0.16, 'SORRY', 0.08, C.white);
      floorText(ctx, 0, -0.01, 'WE MISSED', 0.1, C.ink);
      floorText(ctx, 0, 0.11, 'YOU', 0.1, C.ink);
      // A parcel, doodled, and a tick box.
      ctx.strokeStyle = C.brown;
      ctx.lineWidth = 0.02;
      ctx.strokeRect(0.18, 0.08, 0.1, 0.08);
    }));
    R.find({ id: 'sorry-card', label: 'A "Sorry we missed you" card', kind: 'hard', at: [82.65, 39.45, 0.05], r: 0.75, riddle: 'Blown in with the junk mail.', hint: 'Litter by the post box. One of the flyers has a brown stripe.' });
    // Round it, what the wind brings down the pavement: party flyers, a box
    // flattened for the recycling, a crisp packet, old gum. The card is the
    // only one with the Courier's brown band.
    R.thing(82.4, 40.6, (ctx) => {
      litter(ctx, 'box', 83.4, 38.9, 0.25);
      litter(ctx, 'flyer', 82.7, 41.2, 0.7);
      litter(ctx, 'flyer', 81.0, 38.7, -0.5);
      litter(ctx, 'flyer', 83.6, 40.6, 1.9);
      litter(ctx, 'wrapper', 82.95, 39.95, 0.4);
      litter(ctx, 'napkin', 81.3, 41.3, 0.3);
      litter(ctx, 'gum', 82.3, 40.4, 0);
      litter(ctx, 'flyer', 81.7, 40.0, -0.3);
      litter(ctx, 'flyer', 81.9, 37.6, 0.4);
    });

    // A queue ticket, like a deli counter's: number 99, torn off.
    R.thing(30.4, 84.3, (ctx) => onFloor(ctx, 30, 84, 0.5, () => {
      ctx.beginPath();
      ctx.moveTo(-0.32, -0.19);
      ctx.lineTo(0.32, -0.19);
      for (let i = 0; i <= 6; i++) ctx.lineTo(0.32 + (i % 2 ? 0.04 : 0), -0.19 + i * (0.38 / 6)); // the torn end
      ctx.lineTo(-0.32, 0.19);
      ctx.closePath();
      paint(ctx, C.coralLight, { lw: 0.035 });
      if (!Q.detail) return;
      ctx.beginPath();
      ctx.arc(0.05, 0, 0.15, 0, Math.PI * 2);
      ctx.fillStyle = C.white;
      ctx.fill();
      floorText(ctx, 0.05, 0.01, '99', 0.16, C.red);
      floorText(ctx, -0.22, 0, 'No.', 0.08, C.ink);
    }));
    R.find({ id: 'queue-ticket', label: 'A queue ticket', at: [30, 84, 0.05], r: 0.8 });
    // What the queue leaves behind: chips, a glove, a receipt, a crisp packet,
    // a bottle cap.
    R.thing(30.4, 84.4, (ctx) => {
      litter(ctx, 'chips', 28.8, 83.4, 0.5);
      litter(ctx, 'glove', 31.3, 84.7, 0.9);
      litter(ctx, 'receipt', 30.9, 83.1, 1.25);
      litter(ctx, 'wrapper', 28.9, 84.8, -0.6);
      litter(ctx, 'cap', 31.6, 83.7, 0);
      litter(ctx, 'napkin', 29.4, 84.7, 1.1);
      litter(ctx, 'gum', 30.3, 84.6, 0.5);
    });
  },
};
