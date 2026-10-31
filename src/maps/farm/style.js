// The Farm: the style sheet. Every area takes its colors and shared props from
// here, so the whole level stays one plate. The inks come from the brief
// (docs/levels/farm.md, "Palette and plate"): a June plate, green-gold fields,
// earth in layers, fieldstone, brick and one big white tent, sharing the
// North Shore inks with Plum Island (brick, cream, marsh, sea). Add recurring
// props (a dig square, a fence, a guest's look) here once, rather than in each
// area.
import { C, Q, box, rect, face, alpha, tint, shade, mix, folk, person, paint } from '../../engine/art.js';
import { animal } from '../../engine/animals.js';
import { ZK } from '../../engine/iso.js';
import { tag, drawBlock, footing } from '../greybox.js';
import { hour } from './clock.js';

export const INK = {
  meadow: '#B9C77A',
  pasture: '#7FA05A',
  earth: '#8A6A4F',
  fieldstone: '#A49A8B',
  brick: '#B5654A',
  cream: '#F4EAD5',
  marsh: '#9DB36B',
  sea: '#3F8FA6',
};

// The paper: the June meadow (the fields run off every edge into it). It
// follows the day (paperAt).
export const PAPER = INK.meadow;

// ---------- The meadow through the day ----------
// Pale at dawn, bright at noon, gold at sunset behind the barn, then a night
// printed in dark ink. Blended in 32 steps so the colors stay few.
const q = (k) => Math.round(k * 32) / 32;
export const MEADOW = {
  night: mix(INK.meadow, C.night, 0.78),
  dawn: mix(INK.meadow, C.greyLight, 0.35),
  noon: INK.meadow,
  gold: mix(INK.meadow, C.mustard, 0.38),
  dusk: mix(mix(INK.meadow, C.pink, 0.25), C.night, 0.4),
};
const DAY = [
  [5, MEADOW.night], [5.3, MEADOW.night], [6.2, MEADOW.dawn], [8, MEADOW.noon], [18.5, MEADOW.noon], [19.8, MEADOW.gold],
  [20.4, MEADOW.gold], [21, MEADOW.dusk], [21.6, MEADOW.night], [29, MEADOW.night],
];
export function paperAt(t) {
  let h = hour(t);
  if (h < 5) h += 24;
  for (let i = 1; i < DAY.length; i++) {
    const [h0, c0] = DAY[i - 1], [h1, c1] = DAY[i];
    if (h <= h1) return mix(c0, c1, q((h - h0) / (h1 - h0)));
  }
  return MEADOW.night;
}
// The page's loose words print in ink on the meadow, in cream at night.
export const plateKind = (t) => { const h = hour(t); return h >= 20.8 || h < 5.8 ? 'night' : 'day'; };

// ---------- The ground's inks (land.js) ----------
export const LAND = {
  meadow: INK.meadow,
  lawn: INK.pasture,
  mown: tint(INK.pasture, 0.12),
  crop: shade(INK.pasture, 0.12),
  soil: tint(INK.earth, 0.3),
  woods: shade(INK.pasture, 0.28),
  marsh: INK.marsh,
  mud: mix(INK.earth, INK.marsh, 0.45),
  gravel: mix(INK.cream, INK.fieldstone, 0.4),
  road: mix(INK.fieldstone, C.ink, 0.25),
  infield: tint(INK.earth, 0.18),
  strip: tint(INK.meadow, 0.18),
  edge: shade(INK.meadow, 0.3),
};
export const WATER = { color: INK.sea, wet: shade(INK.marsh, 0.3) };

// ---------- Greybox tones ----------
// Blocks by what they are, so the plan reads at a glance.
export const BLOCK = {
  stone: INK.fieldstone,
  brick: INK.brick,
  wood: mix(C.white, INK.fieldstone, 0.25), // the white barns, clapboard
  shed: shade(INK.earth, 0.05),
  tent: INK.cream,
  table: C.white,
  vehicle: mix(INK.fieldstone, C.navy, 0.35),
  machine: C.grey,
  fence: mix(INK.earth, C.white, 0.35),
  hay: mix(C.mustard, INK.cream, 0.35),
  tree: shade(INK.pasture, 0.15),
  trunk: C.brown,
};

// ---------- The dig ----------
// The archaeologists' square: a hole in the ground with a string line round
// it, that a tap takes down a layer (a poke with steps, R.poke({ steps })).
// Its earth in three depths: the 1900s light, the 1800s middle, 1690 dark.
export const EARTH = [tint(INK.earth, 0.35), INK.earth, shade(INK.earth, 0.3), shade(INK.earth, 0.5)];
export const LAYERS = ['Today', 'The 1900s', 'The 1800s', '1690'];

// A dig square, drawn: at (x, y) its back corner, s its side, open to step
// k (0 grass, 3 the 1690 layer; a fraction while it's easing between). The
// faces of the hole show the layers it's been dug through, and a peg at each
// corner holds the string.
export function drawSquare(ctx, x, y, z, s, k, name) {
  const deep = Math.max(0, k) * 0.28;
  rect(ctx, x - 0.25, y - 0.25, s + 0.5, s + 0.5, z + 0.01, alpha(INK.earth, 0.25), { stroke: false });
  if (deep > 0.01) {
    // The far walls of the hole, banded by layer, and its floor.
    const n = Math.ceil(k - 1e-6);
    for (let i = 0; i < n; i++) {
      const z0 = z - Math.min(deep, (i + 1) * 0.28), z1 = z - i * 0.28;
      face(ctx, [[x, y, z1], [x + s, y, z1], [x + s, y, z0], [x, y, z0]], shade(EARTH[i + 1] || EARTH[3], 0.1), { lw: 0.03 });
      face(ctx, [[x, y, z1], [x, y + s, z1], [x, y + s, z0], [x, y, z0]], shade(EARTH[i + 1] || EARTH[3], 0.25), { lw: 0.03 });
    }
    rect(ctx, x, y, s, s, z - deep, EARTH[Math.min(3, Math.round(k))], { lw: 0.03 });
  } else rect(ctx, x, y, s, s, z + 0.01, LAND.lawn, { lw: 0.03 });
  // The pegs and the string.
  ctx.beginPath();
  [[x, y], [x + s, y], [x + s, y + s], [x, y + s]].forEach(([px, py], i) => {
    const X = px - py, Y = (px + py) / 2 - (z + 0.25) * ZK;
    if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
  });
  ctx.closePath();
  ctx.strokeStyle = C.coral;
  ctx.lineWidth = 0.035;
  ctx.stroke();
  if (name && Q.detail) tag(ctx, x + s / 2, y + s / 2, z + 0.9, name, { size: 0.3 });
}

// A square and its poke, on a zone: s about 1.4 (a real one's a metre or two).
// say: what each layer answers (from today down to 1690), and what filling
// it in says. Returns the poke, for finds inside it (R.find's inside, layer).
export function square(R, id, x, y, o = {}) {
  const s = o.s || 1.4;
  const z = footing(R, x, y, s, s);
  const sq = R.poke({
    id, at: [x + s / 2, y + s / 2, z], r: o.r ?? 0.95, steps: 4,
    say: o.say || ['The 1900s.', 'The 1800s.', '1690. Careful.', 'Filled back in.'],
    sound: 'pop', teach: o.teach,
  });
  R.thing(x + s / 2, y + s / 2, (ctx) => drawSquare(ctx, x, y, z, s, sq.k(), o.name), { anim: true, depth: x + y - 0.5 });
  return sq;
}

// ---------- Fences ----------
// Post and rail, along a list of points; gates are gaps ([x, y, w] at a
// point along it). Drawn as one thing per run, at its middle.
export function fence(R, pts, o = {}) {
  const h = o.h || 1.1;
  const gates = o.gates || [];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const L = Math.hypot(bx - ax, by - ay);
    const n = Math.max(1, Math.round(L / 2));
    for (let j = 0; j < n; j++) {
      const u0 = j / n, u1 = (j + 1) / n;
      const x0 = ax + (bx - ax) * u0, y0 = ay + (by - ay) * u0, x1 = ax + (bx - ax) * u1, y1 = ay + (by - ay) * u1;
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      if (gates.some(([gx, gy, gw]) => Math.hypot(mx - gx, my - gy) < (gw ?? 2) / 2)) continue;
      const z0 = footing(R, x0, y0), z1 = footing(R, x1, y1);
      R.thing(mx, my, (ctx) => {
        // A post at each end and two rails.
        ctx.beginPath();
        for (const [px, py, pz] of [[x0, y0, z0], [x1, y1, z1]]) {
          const X = px - py, Y = (px + py) / 2 - pz * ZK;
          ctx.moveTo(X, Y); ctx.lineTo(X, Y - h * ZK);
        }
        for (const r of [0.45, 0.9]) {
          ctx.moveTo(x0 - y0, (x0 + y0) / 2 - (z0 + h * r) * ZK);
          ctx.lineTo(x1 - y1, (x1 + y1) / 2 - (z1 + h * r) * ZK);
        }
        ctx.lineCap = 'round';
        if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.14; ctx.stroke(); }
        ctx.strokeStyle = o.color || BLOCK.fence;
        ctx.lineWidth = 0.08;
        ctx.stroke();
      });
    }
  }
}

// ---------- People and animals ----------
// A standing animal with a name tag (greybox), on a zone.
// o: { pose, dir, wool, color, scale, z }
export function beast(R, x, y, kind, name, o = {}) {
  const z = o.z ?? footing(R, x, y);
  R.thing(x, y, (ctx, t) => {
    animal(ctx, x, y, z, { kind, ...o }, t);
    if (name && Q.detail) tag(ctx, x, y, z + (o.tagZ || 2), name, { size: 0.34 });
  }, { anim: true });
}

// Wedding guests: their best clothes (no hi-vis on a farm).
export const guest = (seed, extra = {}) => folk(seed, { hat: 'none', ...extra });

// A crowd of people, drawn only while show(t) (the ceremony's chairs fill at
// four and empty at five). spots: [[x, y, pose?, dir?], ...]. Each person is a
// thing of its own so they sort with the chairs and tables.
export function crowd(R, spots, show, o = {}) {
  spots.forEach(([x, y, pose, dir], i) => {
    const z = footing(R, x, y);
    const look = (o.look || guest)((o.seed || 1) * 100 + i);
    R.thing(x, y, (ctx, t) => {
      person(ctx, x, y, z, { ...look, pose: pose || o.pose || 'stand', dir: dir || o.dir || 'r', back: o.back }, t);
    }, { anim: true, ...(show ? { on: show } : {}) });
  });
}

// A greybox block that's only there while show(t) (a car parked till seven).
export function blockWhile(R, x, y, w, d, h, color, name, show, o = {}) {
  const z = o.z ?? footing(R, x, y, w, d);
  R.thing(x + w / 2, y + d / 2, (ctx) => drawBlock(ctx, x, y, z, w, d, h, color, name, o), { anim: true, on: show });
}

// A tree: a trunk and a round crown (a maple, an apple, the lane's elms).
export function treeAt(R, x, y, o = {}) {
  const h = o.h || 4, r = o.r || 1.6;
  const z = footing(R, x, y);
  R.thing(x, y, (ctx) => {
    box(ctx, x - 0.2, y - 0.2, z, 0.4, 0.4, h * 0.55, BLOCK.trunk, { flat: true });
    const X = x - y, Y = (x + y) / 2 - (z + h * 0.55 + r * 0.6) * ZK;
    ctx.beginPath();
    ctx.ellipse(X, Y, r * 1.2, r * 0.95, 0, 0, Math.PI * 2);
    paint(ctx, o.color || BLOCK.tree);
  });
}
