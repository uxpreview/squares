// Gooseworth Manor: the style sheet. Every area takes its colors and shared
// props from here, so the whole house stays one plate. The inks come from the
// brief (docs/levels/manor.md, "Palette and plate"). Add recurring props (a
// lamp, a candle, a character's look) here once, rather than in each area.
//
// The plate is night: storm navy outside, rooms lit warm from inside, and every
// light candle gold. The storm and the evening's lights-out are shared here so
// every room flashes and goes dark at the same moment.
import { C, SKIN, HAIR, Q, mix, tint, shade, alpha, hash, box } from '../../engine/art.js';
import { storm as makeStorm } from '../../engine/weather.js';
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

// The paper this level is printed on.
export const PAPER = '#E9DCC4';

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

// Greybox floors, one warm tone per room so the plan reads at a glance.
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

// ---------- The storm and the evening's lights ----------
export const storm = makeStorm({ loop: LOOP, every: [15, 25], seed: 9, first: 6 });

// The lights flicker from 78 seconds and go out at 82; the scream at 95
// brings them back on.
export function lightsOut(t) {
  const tt = ((t % LOOP) + LOOP) % LOOP;
  if (tt < 78 || tt >= 95) return 0;
  if (tt < 82) return hash(Math.floor(tt * 9), 5) > 0.55 ? 1 : 0;
  return 1;
}

export const house = {
  // How dark a room is: black when the lights are out, lit up by lightning.
  dark: (t) => lightsOut(t) * (1 - 0.8 * storm.flash(t)),
  // Electric lamps go out with the lights; candles and fires don't.
  lamp: (t) => 1 - lightsOut(t),
  flicker: (seed) => (t) => 0.72 + 0.28 * hash(seed, Math.floor(t * 11)),
  // Window glass: the stormy night, white for a moment when lightning strikes.
  glass: (t) => mix(mix(INK.stormNavy, INK.deepPlum, 0.2), NIGHT.flash, Math.round(storm.flash(t) * 12) / 12),
};

// ---------- Props every room can use ----------
// A window on a back wall, looking out at the storm.
export function stormWindow(R, side, u, z, w, h) {
  pane(R, side, u, z, w, h, house.glass, INK.bone);
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

// ---------- The cast ----------
// color: their ink on paths and name tags in the greybox.
export const CAST = {
  philippa: { name: 'Lady Philippa', color: INK.deepPlum, look: { skin: SKIN[0], hair: HAIR[3], style: 'long', top: INK.deepPlum, dress: true } },
  rupert: { name: 'Rupert', color: INK.verdigris, look: { skin: SKIN[5], hair: HAIR[2], style: 'short', top: INK.verdigris, bottom: C.ink } },
  brigadier: { name: 'Brigadier Snort', color: INK.oxblood, look: { skin: SKIN[1], hair: HAIR[4], style: 'bald', top: INK.oxblood, bottom: INK.stormNavy } },
  crane: { name: 'Dr. Crane', color: C.grey, look: { skin: SKIN[3], hair: HAIR[4], style: 'short', top: C.greyLight, bottom: C.grey } },
  hatchett: { name: 'Mrs. Hatchett', color: INK.candleGold, look: { skin: SKIN[2], hair: HAIR[6], style: 'bun', hat: 'chef', top: C.white, bottom: C.ink, dress: true } },
  jenkins: { name: 'Jenkins', color: C.ink, look: { skin: SKIN[0], hair: HAIR[4], style: 'short', top: C.ink, bottom: C.ink } },
  maid: { name: 'The maid', color: C.pink, look: { skin: SKIN[4], hair: HAIR[0], style: 'pony', top: C.ink, dress: true } },
  pidge: { name: 'Inspector Pidge', color: C.wood, look: { skin: C.grey, hair: C.greyLight, style: 'bald', top: C.wood, bottom: C.ink } },
  gardener: { name: 'The gardener', color: C.green, look: { skin: SKIN[2], hair: HAIR[1], style: 'short', hat: 'sun', top: C.green, bottom: C.brown } },
  chauffeur: { name: 'The chauffeur', color: C.navy, look: { skin: SKIN[3], hair: HAIR[0], style: 'short', hat: 'cap', top: C.navy, bottom: C.ink } },
  lord: { name: 'Lord Gooseworth', color: INK.oxblood, look: { skin: SKIN[5], hair: HAIR[4], style: 'bald', top: INK.oxblood, bottom: C.ink } },
};
