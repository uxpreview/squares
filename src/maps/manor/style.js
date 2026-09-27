// Gooseworth Manor: the style sheet. Every area takes its colors and shared
// props from here, so the whole house stays one plate. The inks come from the
// brief (docs/levels/manor.md, "Palette and plate"). Add recurring props (a
// lamp, a candle, a character's look) here once, rather than in each area.
//
// The plate is night: storm navy outside, rooms lit warm from inside, and every
// light candle gold. The storm and the evening's lights-out are shared here so
// every room flashes and goes dark at the same moment.
import {
  C, SKIN, HAIR, Q, mix, tint, shade, alpha, hash, box, paint, person, goose, onLeft, onRight, face,
} from '../../engine/art.js';
import { storm as makeStorm } from '../../engine/weather.js';
import { ZK } from '../../engine/iso.js';
import { pane } from '../greybox.js';
import { LOOP } from './plan.js';

export const INK = {
  stormNavy: '#1F2749',
  deepPlum: '#4B2E4F',
  oxblood: '#8E2F3A',
  candleGold: '#E8B04A',
  verdigris: '#4E8A7C',
  bone: '#EFE3C8',
};

// The night outside.
export const NIGHT = {
  plate: INK.stormNavy,
  plateDots: mix(INK.stormNavy, INK.deepPlum, 0.6),
  lawn: mix(INK.verdigris, INK.stormNavy, 0.62),
  lawnDots: mix(INK.verdigris, INK.stormNavy, 0.25),
  hedge: mix(INK.verdigris, INK.stormNavy, 0.35),
  leaf: mix(INK.verdigris, INK.stormNavy, 0.45),
  earth: mix(INK.deepPlum, INK.stormNavy, 0.25),
  earthDark: mix(INK.deepPlum, INK.stormNavy, 0.6),
  stone: mix(INK.bone, INK.stormNavy, 0.45),
  gravel: mix(INK.bone, INK.stormNavy, 0.3),
  mud: mix(INK.oxblood, INK.stormNavy, 0.55),
  rain: alpha(INK.bone, 0.38),
  flash: mix(C.white, C.sky, 0.35),
};

// Greybox floors, one warm tone per room so the plan reads at a glance. The
// owner approved these at gate 2: each room keeps its tone as its color family.
export const TONE = {
  library: tint(INK.oxblood, 0.42),
  'dining-room': tint(INK.candleGold, 0.4),
  kitchen: tint(INK.bone, 0.2),
  'billiard-room': tint(INK.verdigris, 0.42),
  'grand-hall': tint(INK.deepPlum, 0.5),
  conservatory: tint(INK.verdigris, 0.62),
  'master-bedroom': tint(INK.oxblood, 0.6),
  'taxidermy-room': tint(INK.candleGold, 0.6),
  'guest-rooms': tint(INK.deepPlum, 0.66),
  cellar: mix(INK.deepPlum, INK.bone, 0.3),
  grounds: NIGHT.lawn,
};
// Blocks (furniture) in the greybox: a step darker than the floor.
export const blockOf = (tone) => shade(tone, 0.28);

// A room's walls: bone, warmed by the room's own tone, cut in storm navy.
export const walls = (tone, o = {}) => ({
  left: mix(INK.bone, tone, 0.3),
  right: mix(INK.bone, tone, 0.45),
  cap: INK.bone,
  cut: INK.stormNavy,
  ...o,
});

// ---------- Materials ----------
// What the house is made of, mixed from the six inks. Use these rather than
// C's daylight colors, so every room looks printed on the same night.
export const MAT = {
  mahogany: mix(INK.oxblood, INK.deepPlum, 0.45), // the grand rooms' furniture
  mahoganyDark: shade(mix(INK.oxblood, INK.deepPlum, 0.45), 0.3),
  oak: mix(INK.candleGold, INK.oxblood, 0.35), // floors, the servants' side
  oakLight: mix(INK.candleGold, INK.bone, 0.45),
  pine: mix(INK.candleGold, INK.bone, 0.55), // the kitchen table, crates
  velvet: INK.oxblood,
  velvetDark: mix(INK.oxblood, INK.deepPlum, 0.55),
  brass: INK.candleGold,
  brassDark: mix(INK.candleGold, INK.oxblood, 0.3),
  silver: mix(INK.bone, INK.stormNavy, 0.18),
  linen: INK.bone,
  marble: INK.bone,
  marbleVein: mix(INK.bone, INK.stormNavy, 0.3),
  stone: mix(INK.bone, INK.stormNavy, 0.35),
  stoneDark: mix(INK.bone, INK.stormNavy, 0.55),
  terracotta: mix(INK.oxblood, INK.candleGold, 0.4),
  glass: mix(INK.bone, INK.verdigris, 0.45),
  leaf: mix(INK.verdigris, C.green, 0.35),
  leafDark: mix(INK.verdigris, INK.stormNavy, 0.3),
  fur: mix(INK.oxblood, INK.candleGold, 0.3), // stuffed animals, the bear, the dog
  furDark: mix(INK.oxblood, INK.stormNavy, 0.45),
  trifle: mix(INK.oxblood, C.pink, 0.55), // raspberry jelly
  custard: mix(INK.candleGold, INK.bone, 0.6),
  cream: C.white,
  wine: mix(INK.oxblood, INK.deepPlum, 0.3),
  paper: INK.bone, // letters, forms, the diary's pages
};

// Each room's colors: its wallpaper (wall), what it stands on (floor) and the
// woodwork (trim: skirting, door frames, shelves). Picked from the greybox tone
// families above so the house still reads room by room, each lit its own way.
export const ROOM = {
  library: { wall: mix(INK.oxblood, INK.deepPlum, 0.25), floor: MAT.mahogany, trim: MAT.mahoganyDark },
  'dining-room': { wall: mix(INK.candleGold, INK.bone, 0.35), floor: MAT.oak, trim: MAT.mahogany },
  // (The kitchen's flags are warmed by the range, so the servants' side still
  // reads as lit from inside next to the cellar's cold stone.)
  kitchen: { wall: mix(INK.bone, INK.verdigris, 0.12), floor: mix(MAT.stone, INK.candleGold, 0.2), trim: INK.verdigris },
  'billiard-room': { wall: mix(INK.verdigris, INK.stormNavy, 0.2), floor: MAT.oak, trim: MAT.mahoganyDark },
  'grand-hall': { wall: mix(INK.deepPlum, INK.bone, 0.18), floor: MAT.marble, trim: MAT.mahogany },
  conservatory: { wall: MAT.glass, floor: MAT.terracotta, trim: INK.bone },
  'master-bedroom': { wall: mix(INK.oxblood, INK.bone, 0.55), floor: MAT.velvetDark, trim: MAT.mahogany },
  'taxidermy-room': { wall: mix(INK.candleGold, INK.oxblood, 0.25), floor: MAT.oak, trim: MAT.mahoganyDark },
  'guest-rooms': { wall: mix(INK.deepPlum, INK.bone, 0.55), floor: mix(INK.deepPlum, INK.bone, 0.3), trim: MAT.mahogany },
  cellar: { wall: MAT.stone, floor: MAT.stoneDark, trim: MAT.oak },
  grounds: { wall: mix(INK.bone, INK.stormNavy, 0.25), floor: NIGHT.lawn, trim: MAT.stone },
};

// ---------- The storm and the evening's lights ----------
export const storm = makeStorm({ loop: LOOP, every: [15, 25], seed: 9, first: 6 });
// Sheet lightning far off: small, frequent flickers that only the glass room
// (the conservatory) catches. Drawn there, not over the whole plate.
export const sheet = makeStorm({ loop: LOOP, every: [5, 8], seed: 21, first: 3 });

// The lights flicker from 78 seconds and go out at 82; the scream at 95
// brings them back on.
export function lightsOut(t) {
  const tt = ((t % LOOP) + LOOP) % LOOP;
  if (tt < 78 || tt >= 95) return 0;
  if (tt < 82) return hash(Math.floor(tt * 9), 5) > 0.55 ? 1 : 0;
  return 1;
}

// Midnight, the moment of the murder: in the dark, before the scream. The
// grandfather clock strikes it, and every lightning flash shows where
// everyone was at this moment (see echoes in evening.js).
export const MIDNIGHT = 88;

export const house = {
  // How dark a room is: black when the lights are out, lit up by lightning.
  dark: (t) => lightsOut(t) * (1 - 0.8 * storm.flash(t)),
  // Electric lamps go out with the lights; candles and fires don't.
  lamp: (t) => 1 - lightsOut(t),
  flicker: (seed) => (t) => 0.72 + 0.28 * hash(seed, Math.floor(t * 11)),
  // Window glass: the stormy night, white for a moment when lightning strikes.
  glass: (t) => mix(mix(INK.stormNavy, INK.deepPlum, 0.2), NIGHT.flash, Math.round(storm.flash(t) * 12) / 12),
};

// Which strike was the last one, at or before t (its index in storm.strikes),
// or -1 before the first of the loop. For things that change with each flash.
export function lastStrike(t, st = storm) {
  const tt = ((t % LOOP) + LOOP) % LOOP;
  let i = -1;
  for (const s of st.strikes) if (s.t <= tt) i = s.i;
  return i;
}
// How many flashes the conservatory has seen so far this loop (the storm's and
// the sheet lightning's): a new pose for Philippa and the gardener with each.
export const glassFlashes = (t) => lastStrike(t) + lastStrike(t, sheet) + 2;

// How strongly lightning is showing the past right now, 0..1: it lands with
// the strike and fades over a second and a bit.
export function pastK(t) {
  const s = storm.strike(t);
  if (!s) return 0;
  return Math.max(0, 1 - s.age / 1.3) * (s.age < 0.05 ? 0.5 : 1);
}

// ---------- The case ----------
// The verdict, as the game tells it: solved is the scene time the case was
// solved at (0 if it was solved on an earlier visit), or null while it's open.
// Areas that change when the case closes read it: the goose takes the Lord's
// chair in the dining room. map.js hands it to the game (case.onSolved).
export const verdict = { solved: null };
export const isSolved = () => verdict.solved != null;

// ---------- Props every room can use ----------
// A window on a back wall, looking out at the storm.
export function stormWindow(R, side, u, z, w, h) {
  pane(R, side, u, z, w, h, house.glass, INK.bone);
}

// Heavy velvet drapes either side of a window (u, z, w, h as stormWindow),
// with a pelmet over the top. color: the velvet.
export function drapes(R, side, u, z, w, h, color = MAT.velvet) {
  const f = side === 'left' ? onLeft : onRight;
  R.decor((ctx) => {
    const top = z + h + 0.35;
    for (const [a, b] of [[u - 0.75, u + 0.1], [u + w - 0.1, u + w + 0.75]]) {
      f(ctx, a, z - 0.6, b - a, top - z + 0.6, color, { dots: shade(color, 0.45), density: 0.22 });
      if (Q.detail) {
        for (let k = 1; k < 3; k++) {
          const v = a + ((b - a) * k) / 3;
          const p = side === 'left' ? [[0, v, z - 0.6], [0, v, top]] : [[v, 0, z - 0.6], [v, 0, top]];
          face(ctx, p, null, { lw: 0.03, stroke: shade(color, 0.35) });
        }
      }
    }
    f(ctx, u - 0.9, top - 0.1, w + 1.8, 0.55, shade(color, 0.15));
    f(ctx, u - 0.9, top - 0.18, w + 1.8, 0.1, MAT.brass, { stroke: false });
  });
}

// Wallpaper stripes on a back wall, the whole length, up to height h. Two
// tones of one ink; Q.detail only (far out the wall is flat).
export function stripes(R, side, color, o = {}) {
  const f = side === 'left' ? onLeft : onRight;
  const h = o.h ?? 6, step = o.step ?? 0.8, w = o.w ?? 0.3, z0 = o.z ?? 0;
  R.wall((ctx) => {
    if (!Q.detail) return;
    for (let u = step / 2; u < 16; u += step) f(ctx, u, z0, w, h - z0, color, { stroke: false });
  });
}

// A skirting board and a dado rail along a back wall, in the room's trim.
export function trim(R, side, color, o = {}) {
  const f = side === 'left' ? onLeft : onRight;
  R.decor((ctx) => {
    f(ctx, 0, 0, 16, o.skirt ?? 0.35, color, { stroke: false });
    if (o.dado) f(ctx, 0, o.dado, 16, 0.12, color, { stroke: false });
  });
}

// A painting in a gilt frame on a back wall. art(ctx) paints inside it: the
// frame is already there, and (u, z, w, h) is the canvas area.
export function painting(R, side, u, z, w, h, ground, art, o = {}) {
  const f = side === 'left' ? onLeft : onRight;
  const draw = (ctx, t) => {
    f(ctx, u - 0.22, z - 0.22, w + 0.44, h + 0.44, MAT.brass, { dots: MAT.brassDark, density: 0.25 });
    f(ctx, u, z, w, h, ground, { dots: shade(ground, 0.3), density: 0.15 });
    if (art) art(ctx, t);
  };
  R.decor(draw, { anim: !!o.anim });
}

// An electric lamp: a glow on a stand, off when the lights go out.
export function lamp(R, x, y, o = {}) {
  const z = o.z ?? 0;
  const h = o.h ?? 2.6;
  R.thing(x, y, (ctx) => {
    box(ctx, x - 0.05, y - 0.05, z, 0.1, 0.1, h, C.ink, { flat: true, stroke: false });
  });
  R.light({
    at: [x, y, z + h + 0.3], r: o.r ?? 3.4, color: INK.candleGold, k: house.lamp,
    draw: (ctx, t, k) => {
      const X = x - y, Y = (x + y) / 2 - (z + h) * 1.12;
      ctx.beginPath();
      ctx.moveTo(X - 0.3, Y - 0.6); ctx.lineTo(X + 0.3, Y - 0.6); ctx.lineTo(X + 0.45, Y); ctx.lineTo(X - 0.45, Y);
      ctx.closePath();
      ctx.fillStyle = k > 0.5 ? INK.candleGold : shade(INK.candleGold, 0.5);
      ctx.fill();
      if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke(); }
    },
  });
}

// A candle (or a few): a small flame that flickers and stays lit in the dark.
export function candle(R, x, y, z, seed = 1, o = {}) {
  R.light({
    at: [x, y, z + 0.5], r: o.r ?? 1.8, color: INK.candleGold, k: house.flicker(seed),
    draw: (ctx, t, k) => {
      const X = x - y, Y = (x + y) / 2 - z * 1.12;
      ctx.fillStyle = INK.bone;
      ctx.fillRect(X - 0.06, Y - 0.35, 0.12, 0.35);
      ctx.beginPath();
      ctx.ellipse(X, Y - 0.48, 0.07, 0.13 * (0.8 + k * 0.3), 0, 0, Math.PI * 2);
      ctx.fillStyle = INK.candleGold;
      ctx.fill();
    },
  });
}

// A fire (a hearth, a range): a big warm flicker.
export function fire(R, x, y, z, seed = 3, r = 3.2) {
  R.light({ at: [x, y, z], r, color: INK.candleGold, k: house.flicker(seed) });
  R.light({ at: [x, y, z], r: r * 0.45, color: C.coral, k: house.flicker(seed + 1) });
}

// One webbed goose footprint on the floor: the trail runs from the kitchen's
// flour through the dining room to the library, so every room draws it the
// same way. (x, y): the heel; ang: the way it's walking; web: the pad's fill;
// toe: the toes; len: its size (0.5 in the flour, smaller as it runs out).
export function webPrint(ctx, x, y, ang, web, toe = web, len = 0.5) {
  const pt = (dd, a) => {
    const px = x + Math.cos(ang + a) * dd, py = y + Math.sin(ang + a) * dd;
    return [px - py, (px + py) / 2 - 0.015 * ZK];
  };
  const heel = pt(0.03, 0);
  const tips = [pt(len, -0.62), pt(len * 1.12, 0), pt(len, 0.62)];
  const dips = [pt(len * 0.78, -0.31), pt(len * 0.82, 0.31)];
  const side = [pt(len * 0.45, -0.75), pt(len * 0.45, 0.75)];
  ctx.beginPath(); // the webbed pad, pressed in
  ctx.moveTo(heel[0], heel[1]);
  ctx.quadraticCurveTo(side[0][0], side[0][1], tips[0][0], tips[0][1]);
  ctx.quadraticCurveTo(dips[0][0], dips[0][1], tips[1][0], tips[1][1]);
  ctx.quadraticCurveTo(dips[1][0], dips[1][1], tips[2][0], tips[2][1]);
  ctx.quadraticCurveTo(side[1][0], side[1][1], heel[0], heel[1]);
  ctx.closePath();
  ctx.fillStyle = web;
  ctx.fill();
  const w = len / 0.5; // three toes, with round ends
  ctx.beginPath();
  for (const tp of tips) { ctx.moveTo(heel[0], heel[1]); ctx.lineTo(tp[0], tp[1]); }
  ctx.strokeStyle = toe;
  ctx.lineWidth = 0.045 * w;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.fillStyle = toe;
  for (const tp of tips) { ctx.beginPath(); ctx.ellipse(tp[0], tp[1], 0.06 * w, 0.045 * w, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath();
  ctx.ellipse(heel[0], heel[1], 0.07 * w, 0.045 * w, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ---------- The cast ----------
// color: their ink on paths and name tags. look: person() options (see art.js).
export const CAST = {
  philippa: { name: 'Lady Philippa', color: INK.deepPlum, look: { skin: SKIN[0], hair: HAIR[3], style: 'long', top: INK.deepPlum, dress: true } },
  rupert: { name: 'Rupert', color: INK.verdigris, look: { skin: SKIN[5], hair: HAIR[2], style: 'short', top: INK.verdigris, bottom: C.ink } },
  brigadier: { name: 'Brigadier Snort', color: INK.oxblood, look: { skin: SKIN[1], hair: HAIR[4], style: 'bald', top: INK.oxblood, bottom: INK.stormNavy } },
  crane: { name: 'Dr. Crane', color: C.grey, look: { skin: SKIN[3], hair: HAIR[4], style: 'short', top: mix(INK.bone, INK.stormNavy, 0.12), bottom: C.grey } },
  hatchett: { name: 'Mrs. Hatchett', color: INK.candleGold, look: { skin: SKIN[2], hair: HAIR[6], style: 'bun', hat: 'chef', top: mix(INK.candleGold, INK.oxblood, 0.2), dress: true } },
  jenkins: { name: 'Jenkins', color: C.ink, look: { skin: SKIN[0], hair: HAIR[4], style: 'short', top: C.ink, bottom: C.ink } },
  maid: { name: 'The maid', color: C.pink, look: { skin: SKIN[4], hair: HAIR[0], style: 'pony', top: mix(INK.deepPlum, INK.stormNavy, 0.4), dress: true } },
  pidge: { name: 'Inspector Pidge', color: C.wood, look: { skin: C.grey, hair: C.greyLight, style: 'bald', top: C.wood, bottom: C.pink } },
  gardener: { name: 'The gardener', color: C.green, look: { skin: SKIN[2], hair: HAIR[1], style: 'short', hat: 'sun', top: MAT.leaf, bottom: C.brown } },
  chauffeur: { name: 'The chauffeur', color: C.navy, look: { skin: SKIN[3], hair: HAIR[0], style: 'short', top: C.navy, bottom: C.ink } },
  lord: { name: 'Lord Gooseworth', color: INK.oxblood, look: { skin: SKIN[5], hair: HAIR[4], style: 'bald', hat: 'party', top: MAT.velvetDark, bottom: C.ink } },
};

// Everyone's costume: what person() can't draw on its own. Each is { wear, face }
// (see person() in art.js). The shapes are in a person's own units, facing right.
const OUTLINE = { lw: 0.03 };
function apron(ctx, b, color, bib = true) {
  if (b.back) return;
  ctx.beginPath();
  ctx.moveTo(-0.16, b.hipY - 0.42); ctx.lineTo(0.2, b.hipY - 0.42); ctx.lineTo(0.26, b.hipY + 0.2); ctx.lineTo(-0.2, b.hipY + 0.2);
  ctx.closePath();
  paint(ctx, color, OUTLINE);
  if (bib) {
    ctx.beginPath();
    ctx.rect(-0.08, b.top + 0.08, 0.22, b.hipY - 0.42 - b.top - 0.08);
    paint(ctx, color, OUTLINE);
  }
}
const COSTUME = {
  philippa: {
    wear(ctx, b) { // pearls
      if (b.back || !Q.detail) return;
      ctx.fillStyle = INK.bone;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(-0.12 + i * 0.06, b.top + 0.06 + Math.sin((i / 5) * Math.PI) * 0.07, 0.03, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    face(ctx, hy, back) { // the lipstick that's on the glass in the library
      if (back || !Q.detail) return;
      ctx.beginPath();
      ctx.ellipse(0.2, hy + 0.15, 0.055, 0.028, 0, 0, Math.PI * 2);
      ctx.fillStyle = INK.oxblood;
      ctx.fill();
    },
  },
  rupert: {
    wear(ctx, b) { // a tie, loosened after the third bet
      if (b.back) return;
      ctx.beginPath();
      ctx.moveTo(0.02, b.top + 0.02); ctx.lineTo(0.12, b.top + 0.02); ctx.lineTo(0.2, b.top + 0.42); ctx.lineTo(0.1, b.top + 0.46);
      ctx.closePath();
      paint(ctx, INK.oxblood, OUTLINE);
    },
    face(ctx, hy, back) { // a nose that's been at the port
      if (back || !Q.detail) return;
      ctx.beginPath();
      ctx.arc(0.31, hy + 0.08, 0.05, 0, Math.PI * 2);
      ctx.fillStyle = mix(INK.oxblood, SKIN[5], 0.45);
      ctx.fill();
    },
  },
  brigadier: {
    wear(ctx, b) { // medals, from 1974 and before
      if (b.back || !Q.detail) return;
      for (let i = 0; i < 3; i++) {
        const x = -0.04 + i * 0.1, y = b.top + 0.28;
        ctx.fillStyle = [INK.verdigris, INK.bone, INK.deepPlum][i];
        ctx.fillRect(x - 0.035, y - 0.07, 0.07, 0.08);
        ctx.beginPath();
        ctx.arc(x, y + 0.05, 0.04, 0, Math.PI * 2);
        ctx.fillStyle = INK.candleGold;
        ctx.fill();
      }
    },
    face(ctx, hy, back) { // epaulette, and a mustache you could lose a spoon in
      ctx.beginPath();
      ctx.ellipse(0.2, hy + 0.37, 0.14, 0.05, 0, 0, Math.PI * 2);
      paint(ctx, INK.candleGold, OUTLINE);
      if (back) return;
      ctx.beginPath();
      ctx.moveTo(0.22, hy + 0.1);
      ctx.quadraticCurveTo(0.05, hy + 0.06, -0.04, hy + 0.21);
      ctx.quadraticCurveTo(0.1, hy + 0.22, 0.22, hy + 0.17);
      ctx.quadraticCurveTo(0.34, hy + 0.22, 0.46, hy + 0.15);
      ctx.quadraticCurveTo(0.38, hy + 0.06, 0.22, hy + 0.1);
      paint(ctx, INK.bone, OUTLINE);
    },
  },
  crane: {
    wear(ctx, b) { // stethoscope
      if (b.back || !Q.detail) return;
      ctx.beginPath();
      ctx.moveTo(-0.14, b.top + 0.02);
      ctx.quadraticCurveTo(-0.1, b.top + 0.45, 0.1, b.top + 0.48);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 0.035;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0.12, b.top + 0.5, 0.05, 0, Math.PI * 2);
      paint(ctx, MAT.silver, OUTLINE);
    },
    face(ctx, hy, back) { // spectacles
      if (back || !Q.detail) return;
      ctx.beginPath();
      ctx.arc(0.1, hy + 0.02, 0.07, 0, Math.PI * 2);
      ctx.moveTo(0.315, hy + 0.02);
      ctx.arc(0.245, hy + 0.02, 0.07, 0, Math.PI * 2);
      ctx.moveTo(0.17, hy + 0.02); ctx.lineTo(0.175, hy + 0.02);
      ctx.moveTo(0.03, hy + 0.01); ctx.lineTo(-0.14, hy - 0.03);
      ctx.fillStyle = alpha(INK.bone, 0.35);
      ctx.fill();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 0.028;
      ctx.stroke();
    },
  },
  hatchett: {
    wear(ctx, b) { apron(ctx, b, INK.bone); },
  },
  jenkins: {
    wear(ctx, b) { // shirt front and bow tie
      if (b.back) return;
      ctx.beginPath();
      ctx.moveTo(-0.02, b.top); ctx.lineTo(0.2, b.top); ctx.lineTo(0.1, b.top + 0.45);
      ctx.closePath();
      paint(ctx, INK.bone, { stroke: false });
      ctx.beginPath();
      ctx.moveTo(0.09, b.top + 0.06); ctx.lineTo(-0.01, b.top + 0.01); ctx.lineTo(-0.01, b.top + 0.11);
      ctx.moveTo(0.09, b.top + 0.06); ctx.lineTo(0.19, b.top + 0.01); ctx.lineTo(0.19, b.top + 0.11);
      ctx.fillStyle = C.ink;
      ctx.fill();
    },
  },
  maid: {
    wear(ctx, b) { apron(ctx, b, INK.bone); },
    face(ctx, hy) { // a frilly cap
      ctx.beginPath();
      ctx.ellipse(0.0, hy - 0.27, 0.2, 0.08, -0.15, 0, Math.PI * 2);
      paint(ctx, INK.bone, OUTLINE);
    },
  },
  pidge: {
    wear(ctx, b) { // a pigeon's shimmering neck, and the trench coat's belt
      ctx.beginPath();
      ctx.ellipse(0.02, b.top + 0.02, 0.27, 0.09, 0, 0, Math.PI * 2);
      paint(ctx, INK.verdigris, { ...OUTLINE, dots: C.purple, density: 0.35 });
      ctx.beginPath();
      ctx.rect(-0.28, b.hipY - 0.34, 0.56, 0.07);
      paint(ctx, shade(C.wood, 0.35), { stroke: false });
    },
    face(ctx, hy, back) { // beak, a pigeon's orange eye, and the hat
      if (!back) {
        ctx.beginPath();
        ctx.arc(0.24, hy + 0.02, 0.055, 0, Math.PI * 2);
        ctx.fillStyle = C.coral;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0.245, hy + 0.02, 0.028, 0, Math.PI * 2);
        ctx.fillStyle = C.ink;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0.3, hy + 0.0); ctx.lineTo(0.54, hy + 0.08); ctx.lineTo(0.3, hy + 0.13);
        ctx.closePath();
        paint(ctx, shade(C.grey, 0.55), OUTLINE);
        ctx.beginPath();
        ctx.ellipse(0.33, hy + 0.03, 0.05, 0.035, 0, 0, Math.PI * 2);
        ctx.fillStyle = INK.bone;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.ellipse(0.02, hy - 0.18, 0.47, 0.09, 0, 0, Math.PI * 2);
      paint(ctx, C.brown, OUTLINE);
      ctx.beginPath();
      ctx.moveTo(-0.21, hy - 0.18); ctx.lineTo(-0.17, hy - 0.5); ctx.quadraticCurveTo(0.02, hy - 0.42, 0.21, hy - 0.5);
      ctx.lineTo(0.25, hy - 0.18);
      ctx.closePath();
      paint(ctx, C.brown, OUTLINE);
      ctx.fillStyle = C.ink;
      ctx.fillRect(-0.2, hy - 0.27, 0.44, 0.07);
    },
  },
  gardener: {
    face(ctx, hy) { // a flower in the hat band
      if (!Q.detail) return;
      ctx.beginPath();
      ctx.arc(0.22, hy - 0.3, 0.07, 0, Math.PI * 2);
      paint(ctx, INK.oxblood, OUTLINE);
    },
  },
  chauffeur: {
    face(ctx, hy) { // a peaked cap with a badge
      ctx.beginPath();
      ctx.ellipse(0.02, hy - 0.24, 0.32, 0.12, 0, 0, Math.PI * 2);
      paint(ctx, C.ink, OUTLINE);
      ctx.beginPath();
      ctx.ellipse(0.28, hy - 0.16, 0.16, 0.045, 0.2, 0, Math.PI * 2);
      paint(ctx, C.black, OUTLINE);
      ctx.beginPath();
      ctx.arc(0.14, hy - 0.26, 0.04, 0, Math.PI * 2);
      ctx.fillStyle = INK.candleGold;
      ctx.fill();
    },
  },
  lord: {
    face(ctx, hy, back) { // white mutton chops
      if (back) return;
      ctx.fillStyle = INK.bone;
      ctx.beginPath();
      ctx.ellipse(-0.1, hy + 0.12, 0.1, 0.17, 0.3, 0, Math.PI * 2);
      ctx.ellipse(0.2, hy + 0.2, 0.14, 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
    },
  },
};

// Someone from the cast, in costume. id: a key of CAST. p: where and how, as
// a walker gives it ({ x, y, z, pose, dir, back }). o: anything person() takes.
export function dressed(id, o = {}) {
  return { ...CAST[id].look, ...COSTUME[id], ...o };
}
export function drawCast(ctx, id, p, t, o = {}) {
  person(ctx, p.x, p.y, p.z || 0, dressed(id, { pose: p.pose, dir: p.dir, back: p.back, ...o }), t);
}

// A shape left behind by lightning: where someone stood at midnight, as a flat
// storm-navy silhouette. k: how strongly, 0..1.
export function echoPerson(ctx, look, p, t, k) {
  if (!(k > 0.02)) return;
  const c = INK.stormNavy;
  const lines = Q.lines, detail = Q.detail;
  Q.lines = false;
  Q.detail = false;
  ctx.save();
  ctx.globalAlpha *= 0.62 * k;
  person(ctx, p.x, p.y, p.z || 0, {
    pose: p.pose, dir: p.dir, back: p.back, style: look.style, dress: look.dress,
    skin: c, hair: c, top: c, bottom: c, shoes: c,
  }, 0);
  ctx.restore();
  Q.lines = lines;
  Q.detail = detail;
}

// The goose's shape, flat, for the same trick. It's the level's big clue, so
// it's a size up from life, darker than the people's shapes, and edged in
// the flash's cold light so it reads on the library's dark rug.
export function echoGoose(ctx, x, y, z, dir, k) {
  if (!(k > 0.02)) return;
  const X = x - y, Y = (x + y) / 2 - z * ZK, f = dir === 'l' ? -1 : 1;
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(f * 1.2, 1.2);
  ctx.globalAlpha *= Math.min(1, 0.9 * k);
  const body = () => {
    ctx.beginPath();
    ctx.ellipse(0, -0.45, 0.42, 0.24, -0.12, 0, Math.PI * 2);
    ctx.moveTo(-0.3, -0.5); ctx.lineTo(-0.55, -0.67); ctx.lineTo(-0.38, -0.37);
    ctx.moveTo(0.4, -1.07); ctx.arc(0.28, -1.07, 0.12, 0, Math.PI * 2);
    ctx.moveTo(0.36, -1.12); ctx.lineTo(0.58, -1.06); ctx.lineTo(0.36, -1.01);
    ctx.rect(-0.08, -0.34, 0.05, 0.34);
    ctx.rect(0.06, -0.34, 0.05, 0.34);
  };
  const neck = () => {
    ctx.beginPath();
    ctx.moveTo(0.22, -0.55);
    ctx.quadraticCurveTo(0.35, -0.75, 0.28, -1.07);
  };
  // the cold rim
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = alpha(NIGHT.flash, 0.85);
  body(); ctx.lineWidth = 0.1; ctx.stroke();
  neck(); ctx.lineWidth = 0.27; ctx.stroke();
  // the shape
  ctx.fillStyle = INK.stormNavy;
  ctx.strokeStyle = INK.stormNavy;
  body(); ctx.fill();
  neck(); ctx.lineWidth = 0.16; ctx.stroke();
  ctx.restore();
}

// The goose, wearing the monocle it ordered (the parcel on the doorstep).
// Same options as goose() in art.js; poses stand, sit and walk get the monocle.
export function monocleGoose(ctx, x, y, z, t, o = {}) {
  goose(ctx, x, y, z, t, o);
  const pose = o.pose || 'stand';
  if (pose !== 'stand' && pose !== 'sit' && pose !== 'walk') return;
  const s = o.scale || 1, f = o.dir === 'l' ? -1 : 1;
  const by = pose === 'sit' ? -0.2 : -0.45;
  const bob = pose === 'walk' ? Math.abs(Math.sin(t * 9 + (o.phase || 0))) * 0.06 : 0;
  const X = x - y, Y = (x + y) / 2 - z * ZK;
  const ex = 0.33, ey = by - 0.66 - bob;
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(f * s, s);
  ctx.beginPath();
  ctx.moveTo(ex - 0.02, ey + 0.08);
  ctx.quadraticCurveTo(0.1, by - 0.2, 0.2, by - 0.05);
  ctx.strokeStyle = INK.candleGold;
  ctx.lineWidth = 0.025;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(ex, ey, 0.085, 0, Math.PI * 2);
  ctx.fillStyle = alpha(INK.bone, 0.45);
  ctx.fill();
  ctx.strokeStyle = INK.candleGold;
  ctx.lineWidth = 0.035;
  ctx.stroke();
  if (Q.detail) {
    ctx.beginPath();
    ctx.arc(ex + 0.025, ey - 0.03, 0.022, 0, Math.PI * 2);
    ctx.fillStyle = C.white;
    ctx.fill();
  }
  ctx.restore();
}

// The late Lord Gooseworth's ghost: pale, see-through, trailing off where his
// legs were, one arm out pointing (at the goose, usually). Standing at (x, y, z)
// in a zone's units. k: how visible, 0..1 (tie it to the lightning).
export function lordGhost(ctx, x, y, z, t, k, dir = 'r') {
  if (!(k > 0.02)) return;
  const pale = mix(INK.bone, NIGHT.flash, 0.5);
  const bob = Math.sin(t * 2.2) * 0.12;
  ctx.save();
  ctx.globalAlpha *= 0.75 * k;
  // (The swim pose draws no legs; arms override it to point. The party hat stays on.)
  person(ctx, x, y, z + 0.35 + bob, dressed('lord', {
    pose: 'swim', arms: [1.45, -0.35], dir, skin: pale, top: pale, bottom: pale, hair: pale,
  }), t);
  // A wisp for legs.
  const X = x - y, Y = (x + y) / 2 - (z + 0.35 + bob) * ZK;
  ctx.beginPath();
  ctx.moveTo(X - 0.26, Y - 0.8);
  ctx.quadraticCurveTo(X - 0.3, Y - 0.2, X + Math.sin(t * 3) * 0.2, Y + 0.25);
  ctx.quadraticCurveTo(X + 0.2, Y - 0.2, X + 0.26, Y - 0.8);
  ctx.closePath();
  ctx.fillStyle = pale;
  ctx.fill();
  ctx.restore();
}
