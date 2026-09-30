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
export const EVENING = Object.fromEntries(Object.entries(LAND).map(([k, v]) => [k, mix(v, C.night, 0.5)]));

// The sea's ink through the day, blended between: pale at dawn, bright at
// noon, gold at sunset, a deep navy for the king tide.
const SEA = [
  [0, mix(INK.sea, C.night, 0.55)],
  [4, mix(INK.sea, C.night, 0.55)],
  [5.6, mix(tint(INK.sea, 0.25), C.blush, 0.3)], // dawn
  [8, tint(INK.sea, 0.08)],
  [17.5, INK.sea],
  [19.3, mix(INK.sea, C.mustard, 0.26)], // gold, going down
  [20.2, mix(INK.sea, C.blush, 0.42)], // sunset, the sea catching the pink
  [20.9, mix(INK.sea, C.purple, 0.4)], // the last of it
  [21.6, mix(INK.sea, C.night, 0.5)],
  [24, mix(INK.sea, C.night, 0.55)],
];
// Blends in 48 steps, so the colors (and the art kit's cache of mixes) stay few.
const q = (k) => Math.round(k * 48) / 48;
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
  return mix(deep, seaAt(t), 0.55);
}

// Greybox tones for blocks and labels, so the plan reads at a glance.
export const GREY = {
  house: [C.white, C.greyLight, tint(C.sky, 0.3), tint(C.blush, 0.3), C.mint, C.butter],
  roof: [shade(C.grey, 0.2), C.brown, C.grey],
  wood: C.wood,
  rock: mix(INK.shingle, C.brown, 0.2),
  car: [C.coral, C.teal, C.mustard, C.sky, C.white, C.purple, C.red],
  trap: '#2F6DB5', // the traps are blue boxes on legs
  pink: C.pink,
};
