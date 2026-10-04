// The Open House: the Grey One's first floor. A gut-renovated condo, staged
// for a showing: fake lemons in a bowl nobody's allowed to use, a staged
// sofa with one throw pillow placed just so, a realtor with a clipboard and
// a tablet, a basket of shoe booties at the door. Twenty people at the 1pm
// showing, all measuring. Everyone must wear the booties; the landlady
// from the Green House walks through in her slippers (she's out of her own
// flat then: day.js, OPEN_HOUSE).
import {
  C, Q, box, rect, disc, cylinder, face, paint, person, folk, speech, glow, chair, goose,
  shade, tint, mix, alpha, P, onLeft, onRight, paintText,
} from '../../../engine/art.js';
import { pulse } from '../../../engine/actors.js';
import { ZK } from '../../../engine/iso.js';
import { apartment, lettering } from '../kit.js';
import { SIDING, TRIM, ROOM } from '../style.js';
import { at, between, rainK, nightK } from '../clock.js';
import { ladyLook, OPEN_HOUSE } from '../day.js';
import { H, during, track, boards, edison, kitchenL, sagaOn, saga, porchDepth, onPorch, rails } from './grey-2.js';

// Paper shoe covers: plain blue, so they read as booties at phone size.
const BOOTIE = shade(C.sky, 0.08);
// The goose's feet: orange, never red, so they read as feet, not booties.
const FOOT = mix(C.coral, C.mustard, 0.35);
const LEMON = mix(C.mustard, C.butter, 0.35); // a lemon yellow, brighter than the badge's gold
const REAL = C.mustard; // a real lemon: a touch duller
// When it sells: as the last visitor leaves (the flyer by the door says so).
const SOLD = 15.35;

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
// (An umbrella apart, so three umbrellas in the rain don't merge into one.)
const QUEUE = [[12.95, 1.9], [13.6, 3.0], [14.2, 4.1]];
const DOOR_IN = [[14.2, 4.0], [13.4, 1.4], [12.1, 1.0], [11.9, 2.4]];
// Round the sofa's end and along the aisle between it and the coffee table,
// then round the dining table, so nobody walks through the furniture.
const AISLE = [[12.25, 3.3], [12.1, 4.65]], WEST = [8.7, 4.65], FRONT = [7.2, 7.0], BACK = [4.4, 2.6];
function wayTo(x, y) {
  if (x >= 11) return [...AISLE];
  if (y < 3) return [...AISLE, WEST, BACK];
  if (x < 7.5 && y > 4.8) return [...AISLE, WEST, FRONT];
  return [...AISLE, WEST];
}
// Keys for track(): from where you are at h0, through pts, there at h1,
// timed by distance; opts for once you're there.
function route(h0, from, pts, h1, opts) {
  const all = [from, ...pts];
  let L = 0; const d = [0];
  for (let i = 1; i < all.length; i++) { L += Math.hypot(all[i][0] - all[i - 1][0], all[i][1] - all[i - 1][1]); d.push(L); }
  return pts.map((p, i) => [h0 + (h1 - h0) * (d[i + 1] / (L || 1)), p[0], p[1], ...(i === pts.length - 1 && opts ? [opts] : [])]);
}
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
  const path = [...DOOR_IN, ...wayTo(x, y), [x, y]];
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
  [7.9, 12.1, 1.0], [8.0, 12.2, 2.4],
  ...route(8.0, [12.2, 2.4], [[12.25, 3.3], [12.1, 4.65], [8.7, 4.65], [6.6, 4.6]], 8.25, { dir: 'r', pose: 'point', say: 'One, two, three lemons.' }), [9.0, 6.6, 4.6, { dir: 'r', pose: 'point' }],
  ...route(9.0, [6.6, 4.6], [[8.7, 4.65], [12.1, 4.65], [12.25, 3.3], [11.5, 2.9]], 9.12, { dir: 'l' }), [9.4, 11.5, 2.9, { dir: 'l', say: 'Booties go here.' }],
  ...route(9.4, [11.5, 2.9], [[12.25, 3.3], [12.1, 4.65], [11.4, 7.4]], 9.6, { dir: 'l' }), [15.3, 11.4, 7.4, { dir: 'l' }],
  [15.4, 7.6, 5.4, { mop: true }], ...route(15.4, [7.6, 5.4], [[7.2, 4.8], [4.4, 4.8]], 15.7, { mop: true }),
  ...route(15.7, [4.4, 4.8], [[8.7, 4.65], [12.1, 4.65], [12.25, 3.3], [10.8, 3.05]], 15.95, { mop: true }),
  ...route(15.95, [10.8, 3.05], [[12.25, 3.3], [12.1, 4.65], [8.7, 4.65], [2.6, 4.7]], 16.1, { dir: 'l', say: 'Nineteen offers.' }), [19.3, 2.6, 4.7, { dir: 'l' }],
  [19.45, 8.9, 4.65], [19.5, 8.9, 4.65],
]);
// In the aisle in front of the sofa, people are drawn after it (it sorts
// at its near corner, 15.8), and in front of the island after that.
const roomDepth = (p) => {
  const d = p.x + p.y;
  if (p.x > 8.6 && p.x < 12.4 && p.y > 4.42 && p.y < 5.0) return Math.max(d, 15.85);
  return d;
};
const realtorDepth = (p) => (p.x > 0.9 && p.x < 4.3 && p.y > 4.0 && p.y < 5.2 ? Math.max(p.x + p.y, 8.1) : roomDepth(p));
const inDepth = (p) => { const d = porchDepth(p); return d === p.x + p.y ? roomDepth(p) : d; };
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
  [13.45, 14.2, 4.0], [13.49, 13.4, 1.4], [13.52, 12.1, 1.0], [13.56, 12.2, 2.5],
  ...route(13.56, [12.2, 2.5], [[12.25, 3.3], [12.1, 4.65], [8.7, 4.65], [7.4, 4.8]], 13.7, { dir: 'l', say: 'Real lemons? Show-off.' }),
  [13.8, 7.4, 4.8, { dir: 'l', say: 'Real lemons? Show-off.' }], [13.87, 4.4, 4.8, { dir: 'l', say: 'In my day, this was a wall.' }],
  [14.0, 4.4, 4.8, { dir: 'l', say: 'In my day, this was a wall.' }], ...route(14.0, [4.4, 4.8], [[8.7, 4.65], [12.1, 4.65], [12.25, 3.3], [12.2, 2.5]], 14.22),
  [14.26, 12.1, 1.0], [14.3, 13.4, 1.4], [14.34, 14.2, 4.0],
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
// A real one: duller, a dimple at the end, a green leaf.
function realLemon(ctx, x, y, z, s = 1) {
  const [X, Y] = P(x, y, z);
  ctx.save(); ctx.translate(X, Y); ctx.scale(s, s); ctx.rotate(0.25);
  ctx.beginPath(); ctx.ellipse(0, -0.11, 0.19, 0.14, 0, 0, Math.PI * 2);
  ctx.moveTo(0.18, -0.13); ctx.lineTo(0.25, -0.11); ctx.lineTo(0.18, -0.08);
  paint(ctx, REAL, { lw: 0.03, dots: shade(REAL, 0.3), density: 0.15 });
  ctx.beginPath(); ctx.ellipse(-0.2, -0.2, 0.1, 0.04, -0.5, 0, Math.PI * 2);
  paint(ctx, C.leaf, { lw: 0.02 });
  ctx.restore();
}
// A paper shoe cover, seen from the side so it reads as a shoe: a puffy
// blue slipper, toe forward, with a gathered elastic mouth at the ankle.
function bootie(ctx, x, y, f = 1, s = 1) {
  const [X, Y] = P(x, y, 0);
  ctx.save(); ctx.translate(X, Y); ctx.scale(f * s, s);
  ctx.beginPath();
  ctx.moveTo(-0.3, 0); ctx.lineTo(0.3, 0);
  ctx.quadraticCurveTo(0.42, -0.02, 0.38, -0.12);
  ctx.quadraticCurveTo(0.3, -0.22, 0.05, -0.26);
  ctx.lineTo(-0.02, -0.38); ctx.lineTo(-0.32, -0.38);
  ctx.quadraticCurveTo(-0.38, -0.18, -0.3, 0); ctx.closePath();
  paint(ctx, BOOTIE, { lw: 0.035, dots: shade(BOOTIE, 0.3), density: 0.25 });
  // The elastic ankle, gathered.
  ctx.beginPath(); ctx.ellipse(-0.17, -0.38, 0.16, 0.05, 0, 0, Math.PI * 2);
  paint(ctx, shade(BOOTIE, 0.35), { lw: 0.03 });
  if (Q.detail) {
    ctx.strokeStyle = C.white; ctx.lineWidth = 0.02;
    for (let i = 0; i < 5; i++) { const cx = -0.29 + i * 0.06; ctx.beginPath(); ctx.moveTo(cx, -0.33); ctx.lineTo(cx + 0.01, -0.28); ctx.stroke(); }
    // The seam along the sole.
    ctx.beginPath(); ctx.moveTo(-0.28, -0.05); ctx.lineTo(0.32, -0.05); ctx.strokeStyle = shade(BOOTIE, 0.3); ctx.stroke();
  }
  ctx.restore();
}

export default {
  id: 'grey-1',
  name: 'The Open House',
  blurb: 'Luxury living, parking not included. Flip the clock: twenty people came at one, and by evening it sold.',
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
        ctx.restore();
      }
    });
    // One stool, between the cupboards (the others went to the photo shoot).
    for (const x of [2.5]) R.thing(x + 0.3, 4.65, (ctx) => {
      box(ctx, x - 0.02, 4.35, 0, 0.08, 0.08, 0.95, C.black, { flat: true, stroke: false });
      box(ctx, x - 0.25, 4.1, 0.95, 0.5, 0.5, 0.1, C.black, { flat: true, lw: 0.02 });
    });

    // ---------- The island's two cupboards: one has the goose ----------
    // Flat white doors with black bar pulls, side by side under the quartz.
    // The left one has a coral webbed foot poking out under it, all day; the
    // right one is just staged bowls. Tap either and it swings open.
    const DOORS = [{ x0: 1.12, hinge: 1.12, dir: 1 }, { x0: 2.62, hinge: 3.88, dir: -1 }];
    const DW = 1.26, DZ0 = 0.1, DZ1 = 1.2, FY = 4.0;
    const gooseDoor = R.poke({ id: 'cupboard', at: [1.6, FY, 0.45], r: 0.75, sound: 'clunk', say: ['HONK?', 'Is the island load-bearing?'] });
    const bowlDoor = R.poke({ id: 'bowls', at: [2.85, FY, 0.4], r: 0.75, sound: 'clunk', say: ['Soft-close.', 'Staged bowls. Do not use.', 'Very soft. Very closed.'] });
    R.thing(4.02, 4.02, (ctx, t) => {
      [gooseDoor, bowlDoor].forEach((pk, i) => {
        const d = DOORS[i], k = pk.k(), a = k * 1.9;
        if (k > 0.02) {
          // The inside: a dark box, and what's in it.
          face(ctx, [[d.x0, FY, DZ0], [d.x0 + DW, FY, DZ0], [d.x0 + DW, FY, DZ1], [d.x0, FY, DZ1]], shade(C.greyLight, 0.55), { lw: 0.025 });
          face(ctx, [[d.x0, FY, 0.62], [d.x0 + DW, FY, 0.62]], null, { lw: 0.02, stroke: C.grey });
          if (i === 1 && Q.detail) {
            for (let j = 0; j < 4; j++) box(ctx, d.x0 + 0.2, FY - 0.45, 0.66 + j * 0.08, 0.45, 0.4, 0.07, j % 2 ? C.teal : tint(C.teal, 0.2), { flat: true, lw: 0.015 });
            cylinder(ctx, d.x0 + 0.95, FY - 0.25, 0.12, 0.12, 0.42, C.red, { flat: true });
          }
        }
        // The door, swung out on its hinge.
        const fx = d.hinge + d.dir * DW * Math.cos(a), fy = FY + DW * Math.sin(a);
        face(ctx, [[d.hinge, FY, DZ0], [fx, fy, DZ0], [fx, fy, DZ1], [d.hinge, FY, DZ1]], k > 0.02 ? tint(C.greyLight, 0.4) : tint(C.white, 0.3), { lw: 0.03 });
        // Its pull, by the free edge.
        const px = d.hinge + d.dir * (DW - 0.14) * Math.cos(a), py = FY + (DW - 0.14) * Math.sin(a) + 0.01;
        face(ctx, [[px - 0.02, py, 0.5], [px + 0.02, py, 0.5], [px + 0.02, py, 0.85], [px - 0.02, py, 0.85]], C.black, { lw: 0.015 });
      });
      // The tell: a big orange webbed foot out under the left door, toes
      // spread with the webbing lined in, so a still says goose.
      if (gooseDoor.k() < 0.3) {
        const w = Math.sin(t * 3) > 0.92 ? 0.05 : 0;
        const toes = [[1.34 - w, FY + 0.52], [1.6, FY + 0.6], [1.86 + w, FY + 0.52]];
        const pts = [[1.5, FY - 0.02], toes[0], [1.5, FY + 0.42], toes[1], [1.72, FY + 0.42], toes[2], [1.72, FY - 0.02]];
        ctx.beginPath(); pts.forEach(([x, y], j) => { const [X, Y] = P(x, y, 0.02); j ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.closePath();
        paint(ctx, FOOT, { lw: 0.03 });
        // The toes' bones, so it's webbing and not a shoe.
        ctx.strokeStyle = shade(FOOT, 0.35); ctx.lineWidth = 0.02;
        for (const [x, y] of toes) { const [A, B] = P(1.61, FY + 0.05, 0.02), [X, Y] = P(x, y, 0.02); ctx.beginPath(); ctx.moveTo(A, B); ctx.lineTo(X, Y); ctx.stroke(); }
      }
    }, { anim: true, depth: 8.02 });
    // The realtor's name tag, left on the island.
    // A big gold badge, alone on the island's bare quartz: a white strip
    // with REALTOR on it, a shine. Sorted in front of the island (one
    // thing, sorted at its far corner), or the island paints over it.
    R.thing(2.6, 3.6, (ctx) => {
      const z = 1.31, x0 = 3.05, y0 = 3.12, w = 0.88, d = 0.56;
      rect(ctx, x0 + 0.03, y0 + 0.03, w, d, z - 0.005, shade(C.mustard, 0.35), { stroke: false });
      rect(ctx, x0, y0, w, d, z, tint(C.mustard, 0.1), { lw: 0.035 });
      rect(ctx, x0 + 0.08, y0 + 0.16, w - 0.16, 0.26, z + 0.005, C.white, { lw: 0.02 });
      if (Q.detail) {
        rect(ctx, x0 + 0.08, y0 + 0.05, 0.3, 0.06, z + 0.004, tint(C.butter, 0.4), { stroke: false });
        ctx.save(); ctx.translate(0, -z * ZK); paintText(ctx, 'floor', x0 + w / 2, y0 + 0.29, 'REALTOR', 0.17, C.ink, 'Rethink Sans'); ctx.restore();
      }
    }, { depth: 8.05 });
    R.thing(3.8, 3.8, (ctx) => {
      for (let i = 0; i < 6; i++) rect(ctx, 1.2 + (i % 2) * 0.05, 3.25 - (i % 3) * 0.04, 0.6, 0.45, 1.31 + i * 0.03, C.white, { lw: 0.02 });
      if (Q.detail) { ctx.save(); ctx.translate(0, -1.5 * ZK); paintText(ctx, 'floor', 1.5, 3.45, 'OFFER', 0.1, C.ink, 'Rethink Sans'); ctx.restore(); }
    }, { on: during(16.1, 29), depth: 8.06 });
    R.find({ id: 'tag', label: "A realtor's name tag", kind: 'spot', at: [3.5, 3.4, 1.4], r: 0.9 });
    for (const [x, y] of [[1.7, 3.5], [2.6, 3.5], [3.5, 3.5]]) edison(R, x, y, 1.2);

    // ---------- The middle: the table and the lemons ----------
    R.thing(6.8, 6.6, (ctx) => {
      const x0 = 5.2, y0 = 5.0, w = 1.6, d = 1.6;
      for (const [lx, ly] of [[x0 + 0.1, y0 + d - 0.2], [x0 + w - 0.2, y0 + d - 0.2], [x0 + w - 0.2, y0 + 0.1]]) box(ctx, lx, ly, 0, 0.1, 0.1, 1.05, C.black, { flat: true, stroke: false });
      box(ctx, x0, y0, 1.05, w, d, 0.15, tint(C.wood, 0.25), { lw: 0.035 });
    });
    R.thing(5.0, 5.8, (ctx) => chair(ctx, 4.3, 5.4, 0, C.woodLight, 'r'));
    R.thing(6.4, 4.8, (ctx) => chair(ctx, 5.6, 4.0, 0, C.woodLight, 'l'));
    // The bowl nobody's allowed to use: real lemons this time, a card.
    // (Sorted in front of the table, or its top paints over it.)
    R.thing(6.5, 6.2, (ctx) => {
      disc(ctx, 6.25, 5.9, 1.2, 0.42, C.white, { lw: 0.035 });
      disc(ctx, 6.25, 5.9, 1.36, 0.46, tint(C.white, 0.2), { lw: 0.035 });
      for (const [dx, dy] of [[-0.12, -0.1], [0.15, -0.05], [0, 0.14], [0.06, -0.2]]) realLemon(ctx, 6.25 + dx, 5.9 + dy, 1.36, 0.85);
      face(ctx, [[6.25, 5.15, 1.2], [6.65, 5.15, 1.2], [6.65, 5.2, 1.45], [6.25, 5.2, 1.45]], C.white, { lw: 0.02 });
      lettering(ctx, 'x', 6.45, 5.21, 1.33, 'DO NOT EAT', 0.07, C.red);
    }, { depth: 13.45 });
    // The staged lemon tree in the corner: real lemons, matte, each with a
    // leaf, and one plastic one wired on among them, too bright, with a
    // shine and a produce sticker. The find.
    const LX = 1.62, LY = 8.88, LZ = 2.25;
    R.thing(1.6, 8.9, (ctx) => {
      // The pot, the trunk, the crown.
      const [PX, PY] = P(1.15, 8.45, 0);
      ctx.beginPath(); ctx.moveTo(PX - 0.42, PY - 0.75); ctx.lineTo(PX + 0.42, PY - 0.75); ctx.lineTo(PX + 0.32, PY); ctx.lineTo(PX - 0.32, PY); ctx.closePath();
      paint(ctx, C.white, { lw: 0.035, dots: C.greyLight, density: 0.25 });
      const [T0x, T0y] = P(1.15, 8.45, 0.65), [T1x, T1y] = P(1.15, 8.45, 1.7);
      ctx.beginPath(); ctx.moveTo(T0x, T0y); ctx.lineTo(T1x, T1y); ctx.strokeStyle = C.brown; ctx.lineWidth = 0.09; ctx.stroke();
      for (const [dx, dy, dz, r] of [[-0.3, 0.1, 2.1, 0.5], [0.3, -0.2, 2.2, 0.48], [0, 0, 2.6, 0.5], [0.2, 0.35, 2.0, 0.45], [-0.15, 0.4, 2.45, 0.42]]) {
        const [X, Y] = P(1.15 + dx, 8.45 + dy, dz);
        ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2);
        paint(ctx, shade(C.green, 0.12), { dots: shade(C.green, 0.45), density: 0.2 });
      }
      for (const [x, y, z] of [[1.35, 8.95, 1.8], [0.95, 8.95, 2.45], [1.4, 8.4, 2.8], [0.75, 8.55, 1.95]]) realLemon(ctx, x, y, z, 1.0);
      // The plastic one.
      lemon(ctx, LX, LY, LZ, 1.0);
      if (Q.detail) {
        const [X, Y] = P(LX, LY, LZ);
        ctx.save(); ctx.translate(X, Y); ctx.rotate(-0.3);
        ctx.beginPath(); ctx.ellipse(0.06, -0.1, 0.07, 0.05, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.015 });
        ctx.fillStyle = C.teal; ctx.fillRect(0.02, -0.11, 0.08, 0.02);
        ctx.restore();
      }
    });
    R.find({
      id: 'lemon', label: 'A plastic lemon', kind: 'hard', at: [LX, LY, LZ + 0.15], r: 0.6,
      riddle: 'The tree in the corner is faking one.',
      hint: 'Real lemons are dull. One on the lemon tree is a little too shiny.',
    });

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
    });
    // The stager's ceramic goose (the decoy): glazed white on a gold base,
    // stiff as a statue, a shine on its back, and a STAGED tag at its feet.
    const CG = [10.65, 5.3, 0.56];
    R.thing(11.05, 5.75, (ctx) => {
      disc(ctx, CG[0], CG[1], CG[2], 0.24, shade(C.mustard, 0.1), { lw: 0.025 });
      disc(ctx, CG[0], CG[1], CG[2] + 0.06, 0.22, tint(C.mustard, 0.15), { lw: 0.02 });
      goose(ctx, CG[0], CG[1], CG[2] + 0.06, 0, { pose: 'stand', dir: 'l', scale: 0.62 });
      if (!Q.detail) return;
      const [X, Y] = P(CG[0], CG[1], CG[2] + 0.06);
      ctx.fillStyle = alpha(C.white, 0.95);
      ctx.beginPath(); ctx.ellipse(X - 0.04, Y - 0.38, 0.1, 0.035, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = alpha(C.sky, 0.8); ctx.lineWidth = 0.02;
      ctx.beginPath(); ctx.arc(X - 0.12, Y - 0.48, 0.05, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
      face(ctx, [[CG[0] - 0.05, CG[1] + 0.3, CG[2]], [CG[0] + 0.3, CG[1] + 0.3, CG[2]], [CG[0] + 0.3, CG[1] + 0.3, CG[2] + 0.12], [CG[0] - 0.05, CG[1] + 0.3, CG[2] + 0.12]], C.white, { lw: 0.012 });
      lettering(ctx, 'x', CG[0] + 0.12, CG[1] + 0.31, CG[2] + 0.06, 'STAGED', 0.05, C.red);
    });
    R.decoy({ id: 'ceramic', at: [CG[0], CG[1], CG[2] + 0.45], r: 0.5, say: ['Staged. Do not touch.', 'Ceramic. Also staged.', 'It comes with the condo. It does not.'] });
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
    // By the door: a cardboard box of them, open, blue covers spilling out,
    // BOOTIES on its side, and a pair dropped on the floor beside it.
    R.thing(11.4, 2.55, (ctx) => {
      const x0 = 10.85, y0 = 1.95, w = 0.55, d = 0.55, h = 0.5, k = C.woodLight;
      box(ctx, x0, y0, 0, w, d, h, k, { lw: 0.035 });
      rect(ctx, x0 + 0.05, y0 + 0.05, w - 0.1, d - 0.1, h + 0.001, shade(BOOTIE, 0.2), { lw: 0.02 });
      for (const [dx, dy, dz] of [[0.15, 0.15, 0.06], [0.38, 0.2, 0.1], [0.25, 0.38, 0.12]]) {
        const [X, Y] = P(x0 + dx, y0 + dy, h + dz);
        ctx.beginPath(); ctx.ellipse(X, Y, 0.17, 0.09, 0.3, 0, Math.PI * 2); paint(ctx, BOOTIE, { lw: 0.025 });
      }
      // Flaps folded open.
      face(ctx, [[x0, y0 + d, h], [x0 + w, y0 + d, h], [x0 + w, y0 + d + 0.25, h + 0.18], [x0, y0 + d + 0.25, h + 0.18]], tint(k, 0.15), { lw: 0.025 });
      lettering(ctx, 'y', x0 + w + 0.01, y0 + d / 2, h * 0.5, 'BOOTIES', 0.1, C.navy);
    });
    R.thing(11.9, 3.0, (ctx) => { bootie(ctx, 11.4, 2.7, 1, 1.1); bootie(ctx, 11.8, 2.95, -1, 1.1); });
    R.find({ id: 'booties', label: 'A pair of shoe booties', kind: 'spot', at: [11.5, 2.65, 0.2], r: 0.95 });

    // ---------- What changed: the flyer by the door ----------
    // On an easel by the booties: FOR SALE, the house, ASKING in big red, NO
    // BROKER FEE (true since 2025). After the showing a red band goes across
    // it: UNDER AGREEMENT. Nineteen offers will do that.
    const sold = between(SOLD, 5);
    const EX0 = 7.4, EX1 = 8.6, EY = 2.6;
    R.thing(EX1 + 0.05, 2.7, (ctx) => {
      for (const x of [EX0 + 0.15, EX1 - 0.15]) box(ctx, x, EY + 0.05, 0, 0.06, 0.06, 2.45, C.black, { flat: true, stroke: false });
      box(ctx, (EX0 + EX1) / 2 - 0.03, EY - 0.35, 0, 0.06, 0.06, 2.3, C.black, { flat: true, stroke: false });
      box(ctx, EX0 + 0.05, EY - 0.02, 0.92, EX1 - EX0 - 0.1, 0.12, 0.06, C.black, { flat: true, stroke: false });
      const q = (x0, z0, x1, z1) => [[x0, EY, z0], [x1, EY, z0], [x1, EY, z1], [x0, EY, z1]];
      face(ctx, q(EX0, 0.98, EX1, 2.45), C.white, { lw: 0.03 });
      lettering(ctx, 'x', (EX0 + EX1) / 2, EY + 0.01, 2.3, 'FOR SALE', 0.13, C.ink);
      // The photo: the Grey One, grey with black windows.
      face(ctx, q(EX0 + 0.2, 1.62, EX1 - 0.2, 2.15), SIDING.grey, { lw: 0.02 });
      if (Q.detail) for (const x of [EX0 + 0.33, EX0 + 0.58, EX0 + 0.83]) for (const z of [1.7, 1.93]) face(ctx, q(x, z, x + 0.14, z + 0.15), C.black, { stroke: false });
      lettering(ctx, 'x', (EX0 + EX1) / 2, EY + 0.01, 1.08, 'NO BROKER FEE', 0.08, C.ink);
    });
    R.thing(EX1 + 0.06, 2.71, (ctx) => {
      lettering(ctx, 'x', (EX0 + EX1) / 2, EY + 0.01, 1.43, 'ASKING', 0.2, C.red);
      lettering(ctx, 'x', (EX0 + EX1) / 2, EY + 0.01, 1.24, '$1,249,000', 0.1, C.ink);
    }, { on: (t) => !sold(t) });
    R.thing(EX1 + 0.06, 2.71, (ctx) => {
      face(ctx, [[EX0 - 0.05, EY + 0.01, 1.18], [EX1 + 0.05, EY + 0.01, 1.32], [EX1 + 0.05, EY + 0.01, 1.6], [EX0 - 0.05, EY + 0.01, 1.46]], C.red, { lw: 0.025 });
      lettering(ctx, 'x', (EX0 + EX1) / 2, EY + 0.02, 1.39, 'UNDER AGREEMENT', 0.1, C.white);
    }, { on: sold });
    R.find({
      id: 'flyer', label: 'Something that sold since breakfast', kind: 'spot', at: [(EX0 + EX1) / 2, EY, 1.6], r: 0.85,
      when: sold, note: 'after the showing',
      riddle: 'It said ASKING at breakfast. Flip back and look.',
      hint: 'By the booties, the flyer changed its tune after the showing.',
    });

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

    // ---------- The goose, in the island ----------
    // Tucked in the left cupboard all day; tap it and out it steps, in booties.
    const GOOSE = (t) => {
      const k = gooseDoor.k();
      return { x: 1.75, y: 3.6 + 1.1 * k, z: 0, dir: 'l', hidden: k < 0.3, pose: k > 0.9 && pulse(t, 7) > 0.75 ? 'honk' : 'stand' };
    };
    R.goose(GOOSE, { bias: 1.75, kind: 'poke', inside: gooseDoor, hint: 'Two cupboards in the island. One of them has feet.' });
    R.mover(GOOSE, (ctx, t, p) => {
      if (p.hidden) return;
      const [X, Y] = P(p.x, p.y, 0);
      for (const dx of [0.05, -0.08]) {
        ctx.beginPath(); ctx.ellipse(X + dx, Y - 0.02, 0.13, 0.08, 0, 0, Math.PI * 2);
        paint(ctx, BOOTIE, { lw: 0.025 });
      }
    }, { bias: 1.77 });

    // The realtor answers a tap, all day (the room's first lesson).
    R.poke({
      id: 'realtor', teach: true, r: 1.0, sound: 'pop', when: during(7.9, 29),
      at: (t) => { const h = H(t); if (h >= 19.4) return [11.0, 3.95, 1.0]; const p = REALTOR(h); return [p.x, p.y, 1.5]; },
      say: ['Love the light!', 'Booties, please!', 'Offers by Tuesday.', 'Zzz. Love the light.'],
    });

    // ---------- The people ----------
    // The realtor, all day (booties on, of course).
    R.mover((t) => REALTOR(H(t)), (ctx, t, p) => {
      const h = H(t);
      if (h >= 19.4) {
        // (Smaller and further along, so her head stays on the sofa, off the
        // ceramic goose on the coffee table.)
        person(ctx, 11.75, 3.95, 0.72, { ...REALTOR_LOOK, pose: 'sleep', scale: 0.85 }, t);
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
    }, { on: during(7.9, 29), depth: (t) => { const p = REALTOR(H(t)); return H(t) >= 19.4 ? 16.2 : realtorDepth(p); } });

    // The morning: a photographer (flash) and a stager (chopping the pillow).
    R.mover(() => ({ x: 8.6, y: 8.0 }), (ctx, t, p) => {
      for (const [dx, dy] of [[-0.3, -0.2], [0.2, -0.3], [0, 0.25]]) { const [a, b] = P(7.9, 7.4, 1.5), [c, d] = P(7.9 + dx, 7.4 + dy, 0); ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.04; ctx.stroke(); }
      box(ctx, 7.7, 7.25, 1.5, 0.4, 0.3, 0.3, C.black, { flat: true, lw: 0.025 });
      person(ctx, p.x, p.y, 0, { ...folk(861, { top: C.black, hat: 'beanie', dress: false }), dir: 'l', arms: [1.5, 1.4] }, t);
      const k = t % 4.5;
      if (k < 0.18 && Q.detail) glow(ctx, 7.7, 7.3, 1.7, 2.6, C.white, 1);
      if (Q.detail && t % 17 < 3) speech(ctx, p.x, p.y, 2.7, 'Can we lose the stairs?', { size: 0.42 });
    }, { on: during(9.1, 11.8) });
    // (At the sofa's end, clear of the flyer the flip compares.)
    R.mover(() => ({ x: 8.65, y: 4.25 }), (ctx, t, p) => {
      const k = t % 3;
      person(ctx, p.x, p.y, 0, { ...folk(871, { top: C.pink, style: 'long', dress: false }), dir: 'r', arms: [k < 0.3 ? 2.2 : 1.3 - Math.min(1, (k - 0.3) * 3) * 0.3, 0.2] }, t);
      if (Q.detail && t % 13 < 2.5) speech(ctx, p.x, p.y, 2.7, 'Chop.', { size: 0.42 });
    }, { on: during(8.3, 11.9) });

    // The evening: the winning buyers, back already, measuring for a sofa
    // (in booties, of course), where the stager chopped the pillow.
    R.mover(() => ({ x: 8.3, y: 6.3 }), (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, { ...folk(881, { top: C.coral, dress: false, style: 'curly', shoes: BOOTIE }), dir: 'r', arms: [1.45, 0.2], hold: tape }, t);
      if (Q.detail && t % 15 < 3.2) speech(ctx, p.x, p.y, 2.7, 'Nineteen offers. We won!', { size: 0.42 });
    }, { on: during(16.4, 19.3) });
    R.mover(() => ({ x: 7.1, y: 7.6 }), (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, { ...folk(882, { top: C.teal, dress: true, style: 'long', shoes: BOOTIE }), dir: 'r', arms: [2.5, 0.15], hold: phone }, t);
      if (Q.detail && (t + 7) % 15 < 3.2) speech(ctx, p.x, p.y, 2.7, 'Where do we park?', { size: 0.42 });
    }, { on: during(16.4, 19.3) });

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
      }, { on: during(12.7, 15.3), depth: (t) => { const p = visitorAt(v, t); return p ? inDepth(p) : 0; } });
    }

    // The lady in the housecoat, and her prints.
    R.mover((t) => LADY(H(t)), (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, { ...ladyLook(true, p.pose === 'walk'), pose: p.pose, dir: p.dir, back: p.back }, t);
      if (p.say && Q.detail) speech(ctx, p.x, p.y, 2.6, p.say, { size: 0.42 });
    }, { on: during(...OPEN_HOUSE), depth: (t) => inDepth(LADY(H(t))) });
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
