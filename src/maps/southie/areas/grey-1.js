// The Open House: the Grey One's first floor. A gut-renovated condo, staged
// for a showing: fake lemons in a bowl nobody's allowed to use, a staged
// sofa with one throw pillow placed just so, a realtor with a clipboard and
// a tablet, a basket of shoe booties at the door. Twenty people at the 1pm
// showing, all measuring. Everyone must wear the booties; the landlady
// from the Green House walks through in her slippers (she's out of her own
// flat then: day.js, OPEN_HOUSE).
import {
  C, Q, SKIN, HAIR, box, rect, disc, face, paint, person, folk, speech, glow, chair, plant,
  shade, tint, mix, alpha, P, onLeft, onRight, paintText,
} from '../../../engine/art.js';
import { pulse } from '../../../engine/actors.js';
import { ZK } from '../../../engine/iso.js';
import { apartment, lettering } from '../kit.js';
import { SIDING, TRIM, ROOM } from '../style.js';
import { at, rainK, nightK } from '../clock.js';
import { ladyLook, OPEN_HOUSE } from '../day.js';
import { H, during, track, boards, edison, kitchenL, sagaOn, saga, porchDepth, onPorch, rails } from './grey-2.js';

const BOOTIE = tint(C.sky, 0.25);
const LEMON = mix(C.mustard, C.butter, 0.35); // a lemon yellow, brighter than the badge's gold

// ---------- The showing ----------
// Eighteen visitors: each comes up onto the porch, in the door, puts on
// booties at the basket, goes to a spot to do their thing, and leaves.
// [x, y, what they do, facing, what they say]
const SPOTS = [
  [1.5, 5.3, 'peek', 'l', 'Soft-close drawers!'],
  [2.3, 2.5, 'tape', 'r', 'Is the island load-bearing?'],
  [4.7, 3.4, 'phone', 'l'],
  [2.0, 6.9, 'knock', 'l', 'Could we knock this out?'],
  [3.0, 8.3, 'talk', 'r', 'Where do we park?'],
  [4.6, 6.1, 'reach', 'r', 'Is that a real lemon?'],
  [5.5, 7.7, 'tape', 'r'],
  [6.7, 8.3, 'talk', 'l', 'It felt bigger online.'],
  [7.6, 4.6, 'phone', 'r'],
  [7.5, 7.0, 'tape', 'l'],
  [8.6, 5.9, 'talk', 'r', 'What are the fees?'],
  [9.4, 6.7, 'tape', 'r'],
  [10.3, 7.5, 'phone', 'r'],
  [11.9, 5.7, 'look', 'r', 'Is that the ocean?'],
  [12.0, 8.4, 'tape', 'l'],
  [9.1, 8.4, 'talk', 'r', 'Offer over asking?'],
  [6.3, 4.4, 'tape', 'l'],
  [11.3, 6.1, 'look', 'l'],
];
const QUEUE = [[13.3, 2.6], [13.8, 3.4], [14.2, 4.0]];
const DOOR_IN = [[14.2, 4.0], [13.4, 1.4], [12.1, 1.0], [11.9, 2.4]];
const SPEED = 1.7;
function pathLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
function alongPath(pts, d) {
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], L = Math.hypot(x1 - x0, y1 - y0);
    if (d <= L) { const k = L ? d / L : 0; return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k, dir: (x1 - x0) - (y1 - y0) >= 0 ? 'r' : 'l' }; }
    d -= L;
  }
  const [x, y] = pts[pts.length - 1];
  return { x, y, dir: 'r' };
}
const VISITORS = SPOTS.map(([x, y, act, dir, line], i) => {
  const hIn = 13.02 + i * 0.036, hOut = 14.5 + ((i * 7) % 18) * 0.028;
  const path = [...DOOR_IN, [x, y]];
  return {
    i, x, y, act, dir, line, path, L: pathLen(path),
    tIn: at(hIn), tOut: at(hOut), queue: i < 3 ? QUEUE[i] : null,
    look: folk(300 + i * 13, { shoes: BOOTIE, dress: i % 5 === 2, ...(i === 16 ? { scale: 0.72 } : {}) }),
    umb: [C.coral, C.teal, C.mustard, C.purple, C.pink][i % 5],
  };
});
function visitorAt(v, t) {
  const h = H(t);
  if (v.queue && h >= 12.7 && t < v.tIn) return { x: v.queue[0], y: v.queue[1], dir: 'l', moving: false, wait: true };
  const walkT = v.L / SPEED;
  if (t < v.tIn || t > v.tOut + walkT) return null;
  if (t < v.tIn + walkT) return { ...alongPath(v.path, (t - v.tIn) * SPEED), moving: true };
  if (t < v.tOut) return { x: v.x, y: v.y, dir: v.dir, moving: false, there: true };
  const p = alongPath([...v.path].reverse(), (t - v.tOut) * SPEED);
  return { ...p, moving: true };
}

// What each visitor is doing with their hands.
const tape = (ctx, t) => {
  const reach = 1.1 + Math.sin(t * 0.9) * 0.25;
  ctx.fillStyle = C.mustard; ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03;
  ctx.fillRect(0.3, -0.12, 0.2, 0.18); ctx.strokeRect(0.3, -0.12, 0.2, 0.18);
  ctx.fillStyle = tint(C.butter, 0.2); ctx.fillRect(0.5, -0.06, reach, 0.05);
  ctx.fillStyle = C.ink; ctx.fillRect(0.5 + reach, -0.09, 0.04, 0.1);
};
const phone = (ctx) => { ctx.fillStyle = C.ink; ctx.fillRect(0.25, -0.95, 0.18, 0.3); ctx.fillStyle = C.sky; ctx.fillRect(0.28, -0.92, 0.12, 0.22); };
const umbrella = (color) => (ctx) => {
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05;
  ctx.beginPath(); ctx.moveTo(0.1, 0.1); ctx.lineTo(0.1, -1.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-0.65, -1.3); ctx.quadraticCurveTo(0.1, -2.1, 0.85, -1.3); ctx.closePath();
  paint(ctx, color, { lw: 0.04 });
};

// ---------- The realtor ----------
// Staging in the morning, pitching at the showing, mopping the footprints,
// counting offers, and asleep on the staged sofa by night.
const REALTOR = track([
  [7.9, 12.1, 1.0], [8.0, 11.8, 2.8], [8.25, 6.6, 4.6, { dir: 'r', pose: 'point', say: 'One, two, three lemons.' }], [8.9, 6.6, 4.6, { dir: 'r', pose: 'point' }],
  [9.05, 11.5, 2.9, { dir: 'l' }], [9.4, 11.5, 2.9, { dir: 'l', say: 'Booties go here.' }],
  [9.6, 11.4, 7.4, { dir: 'l' }], [15.3, 11.4, 7.4, { dir: 'l' }],
  [15.4, 7.6, 5.4, { mop: true }], [15.7, 4.4, 4.9, { mop: true }], [15.95, 10.8, 3.0, { mop: true }],
  [16.1, 2.6, 4.7, { dir: 'l', say: 'Nineteen offers.' }], [19.3, 2.6, 4.7, { dir: 'l' }],
  [19.45, 10.2, 5.0], [19.5, 10.2, 5.0],
]);
const REALTOR_LOOK = folk(81, { top: C.navy, bottom: C.ink, style: 'bun', hair: C.brown, dress: false, shoes: BOOTIE });
const PITCH = ['Tons of natural light!', 'Parking? Ha.', 'Offers by Tuesday.', 'Booties, please!', "Please don't eat the lemons."];
const clipTab = (ctx) => {
  ctx.fillStyle = C.ink; ctx.fillRect(0.2, -0.28, 0.36, 0.26);
  ctx.fillStyle = C.tealLight; ctx.fillRect(0.24, -0.25, 0.28, 0.2);
};

// ---------- The landlady ----------
// In her housecoat, curlers and rain bonnet, keys jingling, in her own
// slippers, straight through (day.js hides her at home meanwhile).
const LADY = track([
  [13.45, 14.2, 4.0], [13.49, 13.4, 1.4], [13.52, 12.1, 1.0], [13.56, 12.2, 2.5], [13.7, 7.4, 5.0, { dir: 'l', say: 'Plastic lemons. Classy.' }],
  [13.8, 7.4, 5.0, { dir: 'l', say: 'Plastic lemons. Classy.' }], [13.87, 4.4, 5.1, { dir: 'l', say: 'In my day, this was a wall.' }],
  [14.0, 4.4, 5.1, { dir: 'l', say: 'In my day, this was a wall.' }], [14.22, 12.2, 2.5], [14.26, 12.1, 1.0], [14.3, 13.4, 1.4], [14.34, 14.2, 4.0],
]);
// Her muddy prints, laid as she goes and mopped up at half past three.
const PRINTS = [];
for (let h = 13.53; h < 14.24; h += 0.007) {
  const p = LADY(h);
  if (p.moving && p.x < 12.3) PRINTS.push([h, p.x, p.y, PRINTS.length % 2]);
}

// ---------- Things ----------
function lemon(ctx, x, y, z, s = 1) {
  const [X, Y] = P(x, y, z);
  ctx.save(); ctx.translate(X, Y); ctx.scale(s, s); ctx.rotate(-0.3);
  ctx.beginPath(); ctx.ellipse(0, -0.12, 0.22, 0.15, 0, 0, Math.PI * 2);
  ctx.moveTo(0.2, -0.14); ctx.lineTo(0.29, -0.12); ctx.lineTo(0.2, -0.09);
  paint(ctx, LEMON, { lw: 0.03 });
  ctx.fillStyle = alpha(C.white, 0.8); ctx.beginPath(); ctx.ellipse(-0.07, -0.19, 0.07, 0.03, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function bootie(ctx, x, y, a = 0) {
  const [X, Y] = P(x, y, 0.08);
  ctx.save(); ctx.translate(X, Y); ctx.rotate(a);
  ctx.beginPath(); ctx.ellipse(0, 0, 0.34, 0.17, 0, 0, Math.PI * 2);
  paint(ctx, BOOTIE, { lw: 0.035, dots: shade(BOOTIE, 0.3), density: 0.25 });
  ctx.beginPath(); ctx.ellipse(-0.04, -0.03, 0.2, 0.08, 0, 0, Math.PI * 2);
  paint(ctx, tint(C.white, 0.2), { lw: 0.025 });
  ctx.restore();
}

export default {
  id: 'grey-1',
  name: 'The Open House',
  blurb: 'Luxury living, parking not included. Booties on, please (not you, apparently).',
  size: [15, 9],
  build(R) {
    apartment(R, { floor: 0, walls: ROOM['grey-1'], floorInk: ROOM['grey-1'].floor, siding: SIDING.grey, trim: TRIM.grey, modern: true });
    boards(R);

    // ---------- The walls ----------
    kitchenL(R, 2.4, 6.2);
    R.decor((ctx) => {
      // The range hood over the cooktop, and open shelves with three objects on them.
      box(ctx, 0, 3.9, 2.65, 0.75, 1.0, 1.75, tint(C.greyLight, 0.3), { flat: true, lw: 0.03 });
      // A big canvas: a grey circle on white, called Untitled (Grey).
      onRight(ctx, 2.7, 1.9, 3.6, 2.1, C.ink);
      onRight(ctx, 2.8, 2.0, 3.4, 1.9, C.white);
      const [cx, cy] = [4.5, 2.95];
      ctx.save(); ctx.transform(1, 0.5, 0, ZK, cx, cx / 2 - cy * ZK);
      ctx.beginPath(); ctx.arc(0, 0, 0.7, 0, Math.PI * 2); ctx.fillStyle = C.grey; ctx.fill();
      ctx.restore();
      onRight(ctx, 6.4, 2.3, 0.4, 0.18, C.white, { lw: 0.015 });
      // Art over the panel fridge's end: two blocks of color, called Untitled (Calm).
      onLeft(ctx, 7.5, 2.4, 1.3, 1.5, C.ink);
      onLeft(ctx, 7.6, 2.5, 1.1, 1.3, C.white);
      onLeft(ctx, 7.75, 2.65, 0.55, 0.75, tint(C.teal, 0.3), { stroke: false });
      onLeft(ctx, 8.1, 3.1, 0.45, 0.55, C.lilac, { stroke: false });
    });
    // The panel fridge you'd never find, and a stool row at the island.
    R.thing(0.95, 7.3, (ctx) => {
      box(ctx, 0, 6.3, 0, 0.95, 1.0, 3.3, C.white, { flat: true, lw: 0.04 });
      if (Q.detail) box(ctx, 0.95, 6.4, 1.3, 0.05, 0.04, 1.0, C.grey, { flat: true, stroke: false });
    });
    R.thing(0.8, 4.9, (ctx) => {
      box(ctx, 0.1, 4.0, 1.25, 0.7, 0.8, 0.04, C.ink, { flat: true, lw: 0.02 }); // the cooktop
      box(ctx, 0.2, 5.5, 1.25, 0.25, 0.25, 0.45, C.white, { flat: true, lw: 0.025 }); // a vase
      if (Q.detail) for (const dz of [0.1, 0.25, 0.4]) disc(ctx, 0.32, 5.62, 1.7 + dz, 0.06, C.leaf, { stroke: false });
    });

    // ---------- The kitchen: the quartz island ----------
    R.thing(4.0, 4.0, (ctx) => {
      const x0 = 1, y0 = 3, w = 3, d = 1, hh = 1.3, q = tint(C.white, 0.3);
      box(ctx, x0, y0, 0, w, d, hh, q, { flat: true, lw: 0.04, left: tint(C.greyLight, 0.3), right: tint(C.greyLight, 0.5) });
      if (Q.detail) {
        ctx.save(); ctx.globalAlpha *= 0.35;
        for (const [a, b] of [[[1.3, 3.1], [2.6, 3.9]], [[2.9, 3.2], [3.8, 3.7]]]) face(ctx, [[a[0], a[1], hh + 0.001], [b[0], b[1], hh + 0.001]], null, { lw: 0.02, stroke: C.grey });
        face(ctx, [[1.4, y0 + d, 0.2], [2.3, y0 + d, 1.1]], null, { lw: 0.02, stroke: C.grey });
        ctx.restore();
      }
    });
    for (const x of [1.6, 2.5, 3.4]) R.thing(x + 0.3, 4.65, (ctx) => {
      box(ctx, x - 0.02, 4.35, 0, 0.08, 0.08, 0.95, C.black, { flat: true, stroke: false });
      box(ctx, x - 0.25, 4.1, 0.95, 0.5, 0.5, 0.1, C.black, { flat: true, lw: 0.02 });
    });
    // The realtor's name tag, left on the island.
    // A big gold badge, alone on the island's bare quartz: a white strip
    // with REALTOR on it, a shine. Sorted in front of the island (one
    // thing, sorted at its far corner), or the island paints over it.
    R.thing(2.6, 3.6, (ctx) => {
      const z = 1.31, x0 = 1.95, y0 = 3.12, w = 1.0, d = 0.56;
      rect(ctx, x0 + 0.03, y0 + 0.03, w, d, z - 0.005, shade(C.mustard, 0.35), { stroke: false });
      rect(ctx, x0, y0, w, d, z, tint(C.mustard, 0.1), { lw: 0.035 });
      rect(ctx, x0 + 0.08, y0 + 0.16, w - 0.16, 0.26, z + 0.005, C.white, { lw: 0.02 });
      if (Q.detail) {
        rect(ctx, x0 + 0.08, y0 + 0.05, 0.3, 0.06, z + 0.004, tint(C.butter, 0.4), { stroke: false });
        ctx.save(); ctx.translate(0, -z * ZK); paintText(ctx, 'floor', x0 + w / 2, y0 + 0.29, 'REALTOR', 0.17, C.ink, 'Rethink Sans'); ctx.restore();
      }
    }, { depth: 8.05 });
    R.thing(3.8, 3.8, (ctx) => {
      for (let i = 0; i < 6; i++) rect(ctx, 3.15 + (i % 2) * 0.05, 3.25 - (i % 3) * 0.04, 0.6, 0.45, 1.31 + i * 0.03, C.white, { lw: 0.02 });
      if (Q.detail) { ctx.save(); ctx.translate(0, -1.5 * ZK); paintText(ctx, 'floor', 3.45, 3.45, 'OFFER', 0.1, C.ink, 'Rethink Sans'); ctx.restore(); }
    }, { on: during(16.1, 29), depth: 8.06 });
    R.find({ id: 'tag', label: "A realtor's name tag", at: [2.45, 3.4, 1.4], r: 1.0 });
    for (const [x, y] of [[1.7, 3.5], [2.6, 3.5], [3.5, 3.5]]) edison(R, x, y, 1.2);

    // ---------- The middle: the table and the lemons ----------
    R.thing(6.8, 6.6, (ctx) => {
      const x0 = 5.2, y0 = 5.0, w = 1.6, d = 1.6;
      for (const [lx, ly] of [[x0 + 0.1, y0 + d - 0.2], [x0 + w - 0.2, y0 + d - 0.2], [x0 + w - 0.2, y0 + 0.1]]) box(ctx, lx, ly, 0, 0.1, 0.1, 1.05, C.black, { flat: true, stroke: false });
      box(ctx, x0, y0, 1.05, w, d, 0.15, tint(C.wood, 0.25), { lw: 0.035 });
    });
    R.thing(5.0, 5.8, (ctx) => chair(ctx, 4.3, 5.4, 0, C.woodLight, 'r'));
    R.thing(6.4, 4.8, (ctx) => chair(ctx, 5.6, 4.0, 0, C.woodLight, 'l'));
    // The bowl nobody's allowed to use: four fake lemons, a card.
    // (Both sorted in front of the table, or its top paints over them.)
    R.thing(6.5, 6.2, (ctx) => {
      disc(ctx, 6.25, 5.9, 1.2, 0.42, C.white, { lw: 0.035 });
      disc(ctx, 6.25, 5.9, 1.36, 0.46, tint(C.white, 0.2), { lw: 0.035 });
      for (const [dx, dy] of [[-0.12, -0.1], [0.15, -0.05], [0, 0.14], [0.06, -0.2]]) lemon(ctx, 6.25 + dx, 5.9 + dy, 1.36, 0.85);
      face(ctx, [[6.25, 5.15, 1.2], [6.65, 5.15, 1.2], [6.65, 5.2, 1.45], [6.25, 5.2, 1.45]], C.white, { lw: 0.02 });
      lettering(ctx, 'x', 6.45, 5.21, 1.33, 'DO NOT EAT', 0.07, C.red);
    }, { depth: 13.45 });
    // One got away: the find. A big bright lemon rolled off to the table's
    // far corner, its produce sticker still on.
    const LX = 5.5, LY = 5.3;
    R.thing(LX, LY, (ctx) => {
      lemon(ctx, LX, LY, 1.2, 1.6);
      if (Q.detail) {
        const [X, Y] = P(LX, LY, 1.2);
        ctx.save(); ctx.translate(X, Y); ctx.scale(1.6, 1.6); ctx.rotate(-0.3);
        ctx.beginPath(); ctx.ellipse(0.06, -0.1, 0.07, 0.05, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.015 });
        ctx.fillStyle = C.teal; ctx.fillRect(0.02, -0.11, 0.08, 0.02);
        ctx.restore();
      }
    }, { depth: 13.46 });
    // (Centered on the lemon itself, clear of the bowl beside it.)
    R.find({ id: 'lemon', label: 'A plastic lemon', at: [LX - 0.35, LY - 0.05, 1.5], r: 0.9 });
    R.thing(1.2, 8.5, (ctx) => plant(ctx, 1.1, 8.3, 0, 0, { scale: 1.3, kind: 'leafy', potColor: C.white, leaf: C.green }));

    // ---------- The front room: the staged sofa ----------
    R.rug((ctx) => {
      rect(ctx, 8.7, 4.6, 3.5, 3.9, 0.01, tint(C.greyLight, 0.5), { lw: 0.025 });
      rect(ctx, 8.95, 4.85, 3.0, 3.4, 0.012, null, { lw: 0.02, stroke: C.grey });
    });
    R.thing(11.4, 4.4, (ctx) => {
      const c = mix(C.greyLight, C.white, 0.2);
      box(ctx, 9.0, 3.2, 0.15, 2.4, 1.2, 0.55, c, { lw: 0.035 });
      box(ctx, 9.0, 3.2, 0.7, 2.4, 0.35, 0.75, shade(c, 0.05), { lw: 0.035 });
      box(ctx, 9.0, 3.55, 0.7, 0.28, 0.85, 0.3, shade(c, 0.05), { lw: 0.03 });
      box(ctx, 11.32, 3.55, 0.7, 0.28, 0.85, 0.3, shade(c, 0.05), { lw: 0.03 });
      for (const [lx, ly] of [[9.1, 4.25], [11.4, 4.25], [11.4, 3.3]]) box(ctx, lx, ly, 0, 0.08, 0.08, 0.15, C.black, { flat: true, stroke: false });
    });
    // The one throw pillow, placed just so (a chop in the top), by day.
    const day = (t) => { const h = H(t); return h < 19.4; };
    R.thing(9.9, 4.0, (ctx) => {
      const [X, Y] = P(9.75, 3.75, 1.2);
      ctx.save(); ctx.translate(X, Y); ctx.rotate(0.78);
      ctx.beginPath(); ctx.moveTo(-0.3, -0.3); ctx.lineTo(-0.02, -0.26); ctx.lineTo(0, -0.12); ctx.lineTo(0.02, -0.26); ctx.lineTo(0.3, -0.3); ctx.lineTo(0.3, 0.3); ctx.lineTo(-0.3, 0.3); ctx.closePath();
      paint(ctx, C.mustard, { lw: 0.035, dots: shade(C.mustard, 0.3), density: 0.2 });
      ctx.restore();
    }, { on: day });
    // A coffee table with one book on it, and an arc lamp.
    R.thing(11.0, 5.7, (ctx) => {
      box(ctx, 9.5, 4.95, 0, 1.5, 0.75, 0.55, tint(C.white, 0.3), { lw: 0.035, left: tint(C.greyLight, 0.4) });
      box(ctx, 9.9, 5.1, 0.55, 0.6, 0.45, 0.12, C.coral, { flat: true, lw: 0.025 });
      box(ctx, 9.95, 5.12, 0.67, 0.5, 0.4, 0.06, C.teal, { flat: true, lw: 0.02 });
      disc(ctx, 10.7, 5.3, 0.56, 0.15, C.ink, { lw: 0.02 });
    });
    R.thing(12.0, 3.6, (ctx) => {
      disc(ctx, 11.95, 3.4, 0.02, 0.28, C.black, { lw: 0.02 });
      const pts = []; for (let i = 0; i <= 10; i++) { const k = i / 10; pts.push(P(11.95 - 1.5 * k, 3.4 + 0.3 * k, 0.05 + Math.sin(k * Math.PI * 0.8) * 3.0 + k * 0.2)); }
      ctx.beginPath(); pts.forEach(([X, Y], i) => (i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y)));
      ctx.strokeStyle = C.black; ctx.lineWidth = 0.07; ctx.stroke();
      const [X, Y] = pts[10];
      ctx.beginPath(); ctx.arc(X, Y + 0.05, 0.3, Math.PI, 0); ctx.closePath(); paint(ctx, C.black, { lw: 0.03 });
    });
    R.light({ at: [10.45, 3.7, 1.9], r: 2.4, color: C.butter, k: (t) => nightK(t) * 0.7 });

    // ---------- The door: the booties ----------
    R.thing(10.8, 2.95, (ctx) => {
      box(ctx, 9.95, 2.25, 0, 0.8, 0.7, 0.45, C.woodLight, { lw: 0.035, dots: C.wood, dens: 0.35 });
      if (Q.detail) for (const [dx, dy] of [[0.15, 0.2], [0.45, 0.25], [0.3, 0.45], [0.6, 0.5], [0.2, 0.55]]) {
        const [X, Y] = P(9.95 + dx, 2.25 + dy, 0.5);
        ctx.beginPath(); ctx.ellipse(X, Y, 0.16, 0.09, 0, 0, Math.PI * 2); paint(ctx, BOOTIE, { lw: 0.02 });
      }
      // Its sign on a little stand.
      box(ctx, 10.3, 2.95, 0, 0.05, 0.05, 0.9, C.black, { flat: true, stroke: false });
      face(ctx, [[9.95, 3.0, 0.9], [10.8, 3.0, 0.9], [10.8, 3.0, 1.35], [9.95, 3.0, 1.35]], C.white, { lw: 0.025 });
      lettering(ctx, 'x', 10.37, 3.01, 1.2, 'BOOTIES ON', 0.1, C.ink);
      lettering(ctx, 'x', 10.37, 3.01, 1.04, 'PLEASE', 0.08, C.ink);
    });
    R.thing(11.9, 3.0, (ctx) => { bootie(ctx, 11.45, 2.7, -0.2); bootie(ctx, 11.8, 2.95, 0.25); });
    R.find({ id: 'booties', label: 'A pair of shoe booties', at: [11.62, 2.82, 0.15], r: 0.88 });

    // ---------- The porch: the sign ----------
    const signDay = (t) => H(t) < 19.4;
    const board = (lines) => (ctx) => {
      for (const y of [3.0, 4.0]) box(ctx, 14.0, y, 0, 0.06, 0.06, 1.7, C.black, { flat: true, stroke: false });
      box(ctx, 14.02, 2.8, 0.45, 0.06, 1.4, 1.25, C.black, { flat: true, lw: 0.03 });
      face(ctx, [[14.09, 2.86, 0.52], [14.09, 4.14, 0.52], [14.09, 4.14, 1.63], [14.09, 2.86, 1.63]], C.white, { lw: 0.02 });
      for (const [txt, z, s, ink] of lines) lettering(ctx, 'y', 14.1, 3.5, z, txt, s, ink);
    };
    onPorch(R, 14.1, 3.5, board([['OPEN HOUSE', 1.44, 0.2, C.black], ['TODAY 1 TO 3', 1.22, 0.12, C.red], ['LUXURY LIVING.', 0.95, 0.12, C.ink], ['PARKING NOT', 0.78, 0.1, C.ink], ['INCLUDED.', 0.64, 0.1, C.ink]]), { on: signDay });
    onPorch(R, 14.1, 3.5, board([['UNDER', 1.3, 0.2, C.red], ['AGREEMENT', 1.02, 0.2, C.red], ['(19 OFFERS)', 0.72, 0.1, C.ink]]), { on: (t) => !signDay(t) });

    // ---------- The goose, in booties ----------
    const GOOSE = (t) => {
      const k = pulse(t, 14);
      const f = k < 0.35 ? k / 0.35 : k < 0.5 ? 1 : k < 0.85 ? 1 - (k - 0.5) / 0.35 : 0;
      return { x: 2.9 + f * 1.4, y: 7.3 + f * 0.7, z: 0, dir: k < 0.5 ? 'r' : 'l', moving: (k < 0.35) || (k > 0.5 && k < 0.85) };
    };
    R.goose(GOOSE);
    R.mover(GOOSE, (ctx, t, p) => {
      const [X, Y] = P(p.x, p.y, 0);
      const f = p.dir === 'l' ? -1 : 1, sw = p.moving ? Math.sin(t * 9) * 0.12 : 0;
      for (const dx of [-0.05 + sw, 0.08 - sw]) {
        ctx.beginPath(); ctx.ellipse(X + dx * f, Y - 0.02, 0.13, 0.08, 0, 0, Math.PI * 2);
        paint(ctx, BOOTIE, { lw: 0.025 });
      }
    }, { bias: 0.02 });

    // ---------- The people ----------
    // The realtor, all day (booties on, of course).
    R.mover((t) => REALTOR(H(t)), (ctx, t, p) => {
      const h = H(t);
      if (h >= 19.4) {
        person(ctx, 11.2, 3.95, 0.72, { ...REALTOR_LOOK, pose: 'sleep' }, t);
        const [X, Y] = P(9.35, 3.9, 1.05);
        ctx.save(); ctx.translate(X, Y); ctx.rotate(0.3); ctx.beginPath(); ctx.rect(-0.28, -0.22, 0.56, 0.44); paint(ctx, C.mustard, { lw: 0.03 }); ctx.restore();
        return;
      }
      const showing = h >= 12.9 && h < 15.3;
      let arms, hold = clipTab;
      if (p.mop) { arms = [0.9 + Math.sin(t * 5) * 0.3, 0.8]; hold = (c) => { c.strokeStyle = C.brown; c.lineWidth = 0.06; c.beginPath(); c.moveTo(0.2, -0.4); c.lineTo(0.8, 1.1); c.stroke(); c.fillStyle = C.white; c.fillRect(0.6, 1.05, 0.45, 0.12); }; }
      else if (showing) arms = [1.4, 0.2];
      person(ctx, p.x, p.y, 0, { ...REALTOR_LOOK, pose: p.pose, dir: p.dir, back: p.back, arms, hold }, t);
      let say = p.say;
      const lady = LADY(h);
      if (h > 13.5 && h < 13.62) say = 'Booties, ma’am!';
      else if (!say && showing && !lady.moving && t % 11 < 3.2) say = PITCH[Math.floor(t / 11) % PITCH.length];
      const sg = saga(t);
      if (sg && sg.stop === 0 && sg.movers) { const e = (h - sg.since) * 16.875; if (e % 9 > 6 && e % 9 < 8.8) say = 'The bike is not included.'; }
      if (say && Q.detail) speech(ctx, p.x, p.y, 2.7, say, { size: 0.42 });
    }, { on: during(7.9, 29), depth: (t) => { const p = REALTOR(H(t)); return H(t) >= 19.4 ? 16.2 : p.x + p.y; } });

    // The morning: a photographer (flash) and a stager (chopping the pillow).
    R.mover(() => ({ x: 8.6, y: 8.0 }), (ctx, t, p) => {
      for (const [dx, dy] of [[-0.3, -0.2], [0.2, -0.3], [0, 0.25]]) { const [a, b] = P(7.9, 7.4, 1.5), [c, d] = P(7.9 + dx, 7.4 + dy, 0); ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.04; ctx.stroke(); }
      box(ctx, 7.7, 7.25, 1.5, 0.4, 0.3, 0.3, C.black, { flat: true, lw: 0.025 });
      person(ctx, p.x, p.y, 0, { ...folk(861, { top: C.black, hat: 'beanie', dress: false }), dir: 'l', arms: [1.5, 1.4] }, t);
      const k = t % 4.5;
      if (k < 0.18 && Q.detail) glow(ctx, 7.7, 7.3, 1.7, 2.6, C.white, 1);
      if (Q.detail && t % 17 < 3) speech(ctx, p.x, p.y, 2.7, 'Can we lose the stairs?', { size: 0.42 });
    }, { on: during(9.1, 11.8) });
    R.mover(() => ({ x: 10.2, y: 5.05 }), (ctx, t, p) => {
      const k = t % 3;
      person(ctx, p.x, p.y, 0, { ...folk(871, { top: C.pink, style: 'long', dress: false }), dir: 'l', arms: [k < 0.3 ? 2.2 : 1.3 - Math.min(1, (k - 0.3) * 3) * 0.3, 0.2] }, t);
      if (Q.detail && t % 13 < 2.5) speech(ctx, p.x, p.y, 2.7, 'Chop.', { size: 0.42 });
    }, { on: during(8.3, 11.9) });

    // The showing: eighteen visitors (and a queue on the porch in the rain).
    for (const v of VISITORS) {
      R.mover((t) => visitorAt(v, t) || { x: -40, y: -40, off: true }, (ctx, t, p) => {
        if (p.off) return;
        const out = p.x > 12.4;
        const look = out ? { ...v.look, shoes: C.ink } : v.look;
        let arms, hold, pose = p.moving ? 'walk' : 'stand';
        if (out && rainK(t) > 0.05) { hold = umbrella(v.umb); arms = [2.4, 0.15]; }
        else if (p.there) {
          if (v.act === 'tape') { arms = [1.45, 0.2]; hold = tape; }
          else if (v.act === 'phone') { arms = [2.5, 0.15]; hold = phone; }
          else if (v.act === 'knock') arms = [1.8 + Math.sin(t * 11) * 0.35, 0.15];
          else if (v.act === 'peek' || v.act === 'reach') arms = [1.5, 0.15];
          else if (v.act === 'look') arms = [0.3, -0.3];
        }
        person(ctx, p.x, p.y, 0, { ...look, pose, dir: p.dir, arms, hold }, t);
        let say = p.there && v.line && (t + v.i * 6.1) % 21 < 3.4 ? v.line : null;
        const sg = saga(t);
        if (p.there && v.i === 8 && sg && sg.stop === 0) say = (t % 6 < 3) ? 'Is the bike included?' : null;
        if (p.wait && Q.detail && v.i === 0 && t % 8 < 3) say = 'Is it 1 yet?';
        if (say && Q.detail) speech(ctx, p.x, p.y, 2.6 * (v.look.scale || 1) + 0.1, say, { size: 0.4 });
      }, { on: during(12.7, 15.3), depth: (t) => { const p = visitorAt(v, t); return p ? porchDepth(p) : 0; } });
    }

    // The lady in the housecoat, and her prints.
    R.mover((t) => LADY(H(t)), (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, { ...ladyLook(true, p.pose === 'walk'), pose: p.pose, dir: p.dir, back: p.back }, t);
      if (p.say && Q.detail) speech(ctx, p.x, p.y, 2.6, p.say, { size: 0.42 });
    }, { on: during(...OPEN_HOUSE), depth: (t) => porchDepth(LADY(H(t))) });
    R.thing(0, 0, (ctx, t) => {
      const h = H(t), fade = h > 15.4 ? Math.max(0, 1 - (h - 15.4) / 0.55) : 1;
      if (fade <= 0) return;
      ctx.save(); ctx.globalAlpha *= 0.6 * fade; ctx.fillStyle = C.brown;
      for (const [ph, x, y, s] of PRINTS) {
        if (ph > h) break;
        const [X, Y] = P(x + (s ? 0.12 : -0.12), y + (s ? -0.12 : 0.12), 0.01);
        ctx.beginPath(); ctx.ellipse(X, Y, 0.1, 0.05, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }, { anim: true, on: during(13.52, 16.0), depth: -1 });

    // The bike, when it's down here by mistake.
    sagaOn(R, 0);
    rails(R);
  },
};
