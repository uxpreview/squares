// Plum Island: the style sheet. Every area takes its colors and shared props
// from here, so the whole level stays one plate. A sun-bleached summer plate,
// lighter and warmer than the Block: the brief's draft inks
// (docs/levels/plum.md, "Palette and plate"), for the art director to tune.
// Line ink stays the game's navy (C.ink).
import { C, mix, tint, shade } from '../../engine/art.js';

export const INK = {
  marsh: '#9DB36B',
  sea: '#3F8FA6',
  shallows: '#8CCFC2',
  sand: '#E9CF98',
  shingle: '#A9A8A2',
  coral: '#E3603F',
};

// The paper this level is printed on (and the sand in the sun).
export const PAPER = '#F4EAD5';

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

// The paper through the day (tide.js's hours), blended between: a warm dawn,
// bleached noon, gold at sunset, a deep blue evening for the king tide.
export const DAY = [
  [0, C.night],
  [3.5, C.night],
  [5.5, mix(PAPER, C.blush, 0.45)], // dawn
  [8, PAPER],
  [18, PAPER],
  [19.5, mix(PAPER, C.mustard, 0.42)], // sunset, gold
  [20.1, mix(C.pink, C.purple, 0.35)], // the last of it
  [20.8, mix(C.navy, C.purple, 0.3)], // the king tide, a deep blue evening
  [23, C.night],
  [24, C.night],
];

// Greybox tones for blocks and labels, so the plan reads at a glance.
export const GREY = {
  house: [C.white, C.greyLight, tint(C.sky, 0.3), tint(C.blush, 0.3), C.mint, C.butter],
  roof: [shade(C.grey, 0.2), C.brown, C.grey],
  wood: C.wood,
  rock: mix(INK.shingle, C.brown, 0.2),
  car: [C.coral, C.teal, C.mustard, C.sky, C.white, C.purple, C.red],
  trap: C.navy,
  pink: C.pink,
};
