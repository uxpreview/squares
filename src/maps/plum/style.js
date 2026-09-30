// Plum Island: the style sheet. Every area takes its colors and shared props
// from here, so the whole level stays one plate. A sun-bleached summer plate
// printed on the sea: the North Shore inks (docs/levels/plum.md, "Palette and
// plate"), shared with Newburyport later, for the art director to tune. Line
// ink stays the game's navy (C.ink).
import { C, mix, tint, shade } from '../../engine/art.js';
import { hour, nightK } from './tide.js';

export const INK = {
  sea: '#3F8FA6',
  shallows: '#8CCFC2',
  marsh: '#9DB36B',
  sand: '#E9CF98',
  shingle: '#A9A8A2',
  coral: '#E3603F',
  cream: '#F4EAD5',
};

// The ground's layers (land.js), from those inks.
export const LAND = {
  sand: INK.sand,
  bed: mix(INK.sand, INK.sea, 0.32),
  deep: mix(INK.sea, C.navy, 0.25),
  mud: mix(INK.sand, C.brown, 0.3),
  marsh: INK.marsh,
  scrub: shade(mix(INK.marsh, C.green, 0.45), 0.08),
  lawn: tint(mix(INK.marsh, INK.sand, 0.55), 0.12),
  dune: mix(INK.sand, INK.marsh, 0.38),
  strip: tint(INK.marsh, 0.28),
  track: mix(INK.sand, INK.shingle, 0.45),
  road: shade(INK.shingle, 0.08),
  kerb: tint(INK.shingle, 0.55),
  wet: C.ink,
  soil: mix(INK.sand, C.brown, 0.22),
};

// The same ground after dark: every ink printed deeper and bluer, fading in
// with the evening over the day's (drawLand's fade and inks).
export const EVENING = Object.fromEntries(Object.entries(LAND).map(([k, v]) => [k, mix(v, C.night, 0.55)]));

// ---------- The night ----------
// One answer for the whole island, decided by the art director: the engine
// doesn't dim anything here (R.dark on an outdoor area only darkens its
// ground, which already prints its evening inks, and its edge would show
// against the paper and the areas beside it). The night is printed, not
// dimmed: the ground and the sea in their night inks, and the biggest
// standing things (every house, the shops) printed again in dusk inks, a
// second still picture shown after dark, with their windows lit over it.
// People, cars and small props keep their day inks, so every find reads.
export const dusk = (c) => mix(c, C.night, 0.38);
export const nightPrint = (t) => nightK(t) >= 0.5;

// ---------- The sea through the day ----------
// What the sea looks like (the paper) through the day: pale at dawn, bright
// at noon, then, at sunset (decision 37), gold for a moment, pink, lavender,
// and the deep navy of the king tide. A sea mixed straight with gold reads as
// muddy olive, so the gold is warm and brief and the pink carries the sunset.
// The land keeps its colors; only the water takes the sky.
//
// The water is printed at 0.55 over the deep bed (land.js), so the paper is
// that mix. For each sunset color the sea's ink is worked back from the paper
// it should make (under()), so the paper really is gold, pink and lavender.
// Blends in 48 steps, so the colors (and the art kit's cache of mixes) stay few.
const q = (k) => Math.round(k * 48) / 48;
const hex2 = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const toHex = (v) => '#' + v.map((n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')).join('');
const A = 0.55; // the water's ink over the deep bed
const bedAt = (h) => mix(LAND.deep, EVENING.deep, q(nightAt(h)));
// The sea ink that prints `paper` over the deep bed at hour h. Where no ink
// is bright enough, the paper is printed a little deeper, the same hue (never
// clipped, which turns gold olive).
const under = (paper, h, back = 0) => {
  const D = hex2(bedAt(h)), P0 = hex2(paper);
  const k = Math.min(1, ...P0.map((p, i) => (255 * A + (1 - A) * D[i]) / Math.max(1, p)));
  // (back: part of the way back to the day's sea, so the water over the
  // sand blushes rather than turning to salmon; never for gold, which it
  // would turn olive.)
  return mix(toHex(P0.map((p, i) => (k * p - (1 - A) * D[i]) / A)), INK.sea, back);
};
// (nightK by the hour, for the table below.)
function nightAt(h) {
  if (h >= 21.6 || h < 4) return 1;
  if (h >= 20.4) return (h - 20.4) / 1.2;
  if (h < 5.3) return 1 - (h - 4) / 1.3;
  return 0;
}
const NIGHT_SEA = mix(INK.sea, C.night, 0.62);
const SEA = [
  [0, NIGHT_SEA],
  [4, NIGHT_SEA],
  [5.6, mix(tint(INK.sea, 0.25), C.blush, 0.3)], // dawn
  [8, tint(INK.sea, 0.08)],
  [17.5, INK.sea],
  [19.0, INK.sea],
  [19.3, under(mix(mix(C.mustard, C.coralLight, 0.4), INK.sea, 0.25), 19.3)], // gold, going down (brief)
  [19.55, under(mix(C.pink, C.blush, 0.3), 19.55, 0.3)], // the sea catching the pink
  [20.35, under(mix(C.pink, C.lilac, 0.35), 20.35, 0.25)], // sunset
  [20.9, under(mix(C.lilac, C.purple, 0.45), 20.9, 0.15)], // lavender, the last of it
  [21.5, under(mix(C.purple, C.night, 0.62), 21.5)],
  [22.2, NIGHT_SEA],
  [24, NIGHT_SEA],
];
export function seaAt(t) {
  const h = hour(t);
  for (let i = 1; i < SEA.length; i++) {
    const [h0, c0] = SEA[i - 1], [h1, c1] = SEA[i];
    if (h <= h1) return mix(c0, c1, q((h - h0) / (h1 - h0)));
  }
  return SEA[0][1];
}
// The paper is the sea: the plate's deep water, exactly (the sea ink at 0.55
// over the deep bed, which goes to its evening ink with the night), so the
// sea runs on past the map to every edge of the screen.
export function paperAt(t) {
  const deep = mix(LAND.deep, EVENING.deep, q(nightK(t)));
  return mix(deep, seaAt(t), A);
}

// ---------- The art's shared inks ----------
// Beach houses: cedar shingle gone silver, or painted, with white trim. Each
// house takes one body and one trim by its index (kit.js house()).
export const HOUSE = {
  body: [tint(INK.shingle, 0.28), mix(INK.shingle, C.brown, 0.18), tint(C.sky, 0.35), tint(C.blush, 0.3), tint(INK.shallows, 0.35), C.butter, tint(INK.shingle, 0.5)],
  roof: [shade(INK.shingle, 0.28), mix(INK.shingle, C.navy, 0.35), mix(C.brown, INK.shingle, 0.4)],
  trim: C.white,
  door: [C.teal, C.coral, C.navy, C.mustard],
  glass: tint(C.sky, 0.2),
};
// Cars: the six inks, a little sun-faded.
export const CARS = [C.coral, C.teal, C.mustard, tint(C.sky, 0.1), C.white, C.purple, C.red, tint(INK.shingle, 0.2)];
// A lit window, lamp or lantern after dark, and when the lights are on.
export const LIT = C.butter;
export const lightsOn = (t) => nightK(t) >= 0.3;
// The fake brand, on the banner plane and on cans and coolers across the
// island (and later across every place): Gander Cola. "Take a gander."
export const BRAND = { name: 'GANDER COLA', line: 'TAKE A GANDER', can: C.red, ink: C.white };

// The greenhead traps: blue boxes on legs (greenheads go for big dark
// shapes), printed in the plate's own blue rather than a raw one.
export const TRAP = mix(C.sky, C.navy, 0.5);
