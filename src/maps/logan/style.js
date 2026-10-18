// Departures: the style sheet. Every area takes its colors and shared props from
// here, so the whole level stays one plate. The inks come from the brief
// (docs/levels/logan.md, "Palette and plate"): a cold harbor plate in late
// November, the airport's own signal colors and Thanksgiving's cranberry. Add
// recurring props (a plane, a sign, a character's look) here once, rather than
// in each area.
import { C, Q, box, rect, alpha, tint, shade, mix } from '../../engine/art.js';
import { tag, block } from '../greybox.js';
import { hour, nightK } from './clock.js';

export const INK = {
  harbor: '#55819A',
  tarmac: '#5B5F6E',
  concrete: '#CFC8B8',
  signal: '#F2C230',
  safety: '#EE7A31',
  cranberry: '#A8364A',
  snow: '#F3F1EA',
};

// The paper this level is printed on: the harbor, which follows the day
// (paperAt). PAPER is its noon.
export const PAPER = INK.harbor;
// Water inside an area (the dock's corner, under the pier, along the seawall)
// isn't painted: the area leaves its ground off there and the paper shows
// through, so it follows the day with the rest of the harbor. WATER is for a
// patch that has to be drawn (a puddle, a glint), a shade lighter.
export const WATER = tint(INK.harbor, 0.18);

// ---------- The harbor through the day ----------
// A grey dawn, the bright harbor of a cold morning, slate when the snow comes
// at three, pink for a moment at sunset (4:15pm, through the snow), and navy
// from the ground stop through the night. Blended in 32 steps so the colors
// stay few. The page's loose words print in cream all day (kind: 'night').
const q = (k) => Math.round(k * 32) / 32;
export const SEA = {
  night: mix(INK.harbor, C.night, 0.74),
  dawn: mix(INK.harbor, C.greyLight, 0.22),
  noon: INK.harbor,
  snow: mix(INK.harbor, C.grey, 0.42),
  sunset: mix(mix(INK.harbor, C.grey, 0.3), C.pink, 0.42),
  dusk: mix(INK.harbor, C.night, 0.48),
};
const DAY = [
  [4, SEA.night], [5.4, SEA.night], [6.8, SEA.dawn], [8.6, SEA.noon], [14, SEA.noon], [15.4, SEA.snow],
  [16.05, SEA.sunset], [16.45, SEA.sunset], [17.1, SEA.dusk], [17.8, SEA.night], [28, SEA.night],
];
export function paperAt(t) {
  let h = hour(t);
  if (h < 4) h += 24;
  for (let i = 1; i < DAY.length; i++) {
    const [h0, c0] = DAY[i - 1], [h1, c1] = DAY[i];
    if (h <= h1) return mix(c0, c1, q((h - h0) / (h1 - h0)));
  }
  return SEA.night;
}

// ---------- The night ----------
// Printed, not dimmed (Plum Island's answer): outside, the ground takes a
// veil of night ink after dark (kit.js, nightGround) and the big things that
// stand on it (planes, trucks, the tower, the garage) are printed a second
// time in dusk inks (kit.js, printed). The terminal stays lit, in its day
// inks, so its windows and floors glow against the dark. People keep their
// day inks, so every find reads.
export const dusk = (c) => mix(c, C.night, 0.4);
export const nightPrint = (t) => nightK(t) >= 0.5;
// A lit window, a lamp, the terminal's light on the snow.
export const LIT = C.butter;

// ---------- The airport's colors ----------
// Three lookalike airlines (no real name or logo): Spite (yellow all over,
// Flight 1 to Orlando, on time and never boarding), JetBlew (a navy tail
// with a pattern, the band's flight to New York) and Northeast (cranberry,
// the bride's). Planes landing and taking off take them in turn.
export const LIVERY = {
  spite: { name: 'SPITE', body: tint(INK.signal, 0.1), tail: INK.signal, stripe: shade(INK.signal, 0.25), logo: C.ink, nose: C.ink },
  jetblew: { name: 'JETBLEW', body: C.white, tail: C.navy, stripe: C.navy, logo: C.white, pattern: C.sky },
  northeast: { name: 'NORTHEAST', body: C.white, tail: INK.cranberry, stripe: INK.cranberry, logo: C.white },
};
// Ground vehicles: tugs, belt loaders and bag carts in signal yellow, the
// de-icers and cones in safety orange, the fuel and catering trucks white.
export const RAMP = { tug: INK.signal, cart: tint(INK.tarmac, 0.35), canopy: INK.signal, deicer: INK.safety, fuel: C.white, catering: C.white };
// Luggage: dark cases mostly (everyone's is black), a few loud ones, and the
// one pink bag that rides the loop all day.
export const BAGS = [C.ink, C.navy, C.black, C.navy, INK.cranberry, C.teal, C.grey, C.red, C.purple, C.mustard, C.green, C.coral];
export const PINK = C.pink;
// Wayfinding: the airport's signs, black on yellow.
export const SIGN = { board: C.black, ink: INK.signal };
// The fake brand, for every place: Gander Cola. "Take a gander."
export const BRAND = { name: 'GANDER COLA', line: 'TAKE A GANDER', can: C.red, ink: C.white };

// Greybox floor tones: landside, the terminal's carpet, airside concrete,
// tarmac, so the plan reads at a glance.
export const TONE = {
  curb: tint(INK.concrete, 0.25),
  road: tint(INK.tarmac, 0.35),
  terminal: tint(INK.cranberry, 0.62),
  hall: tint(INK.concrete, 0.4),
  bags: tint(INK.concrete, 0.1),
  apron: tint(INK.concrete, 0.05),
  grass: tint(C.green, 0.45),
  strip: INK.tarmac,
};
export const BLOCK = {
  wall: tint(INK.snow, 0.2),
  desk: tint(INK.cranberry, 0.25),
  belt: shade(INK.tarmac, 0.1),
  machine: tint(INK.harbor, 0.35),
  vehicle: INK.signal,
  safety: INK.safety,
  plane: INK.snow,
  seat: tint(INK.harbor, 0.5),
  sign: INK.signal,
};

// A long block (a counter, a low wall, a row of seats, a belt) in short
// pieces along its long side, so each sorts on its own and nobody standing
// beside it is painted over (QA's covered check). Same arguments as the
// greybox's block; the name goes on the first piece.
export function run(R, x, y, w, d, h, color, name, o = {}) {
  const along = w >= d, len = along ? w : d, n = Math.max(1, Math.ceil(len / (o.step || 3)));
  for (let i = 0; i < n; i++) {
    const a = (len * i) / n, b = (len * (i + 1)) / n;
    if (along) block(R, x + a, y, b - a, d, h, color, i ? null : name, o);
    else block(R, x, y + a, w, b - a, h, color, i ? null : name, o);
  }
}

// Painted lines on the ground (taxiway yellow, a rope maze, a lane), flat.
export function line(ctx, x, y, w, d, color = INK.signal) {
  rect(ctx, x, y, w, d, 0.01, color, { stroke: false });
}

// A patch of water inside an area: the harbor, a shade lighter.
export function water(ctx, x, y, w, d) {
  rect(ctx, x, y, w, d, 0, WATER, { stroke: false });
  rect(ctx, x, y, w, d, 0.005, alpha(C.white, 0.08), { stroke: false });
}
