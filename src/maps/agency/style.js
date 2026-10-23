// Pitch Day: the style sheet. Every area takes its colors and shared props from
// here, so the whole level stays one plate. The inks come from the brief
// (docs/levels/agency.md, "Palette and plate"): New England woods at the end
// of October, leaves down, and an office's own colors (white desks, slate
// carpet, glass, sticky-note yellow). Add recurring props (a desk, a sign, a
// character's look) here once, rather than in each area.
import { C, alpha, tint, shade, mix } from '../../engine/art.js';

export const INK = {
  leaves: '#D49A52',
  maple: '#B8452F',
  pine: '#2F5A48',
  asphalt: '#575B66',
  carpet: '#7D90A6',
  birch: '#F1EDE4',
  sticky: '#F4D23C',
};

// The paper this level is printed on: the woods' floor, leaves down. It runs
// to every edge of the screen.
export const PAPER = INK.leaves;

// The building: white siding, dark glass on the empty floors, the office's
// low walls and windows.
export const SIDING = tint(INK.birch, 0.1);
export const DARK_GLASS = mix(C.navy, INK.asphalt, 0.35);
export const GLASS = alpha(tint(C.sky, 0.35), 0.35);
export const FRAME = shade(C.grey, 0.2);
// Primal's own red-orange (its logo, the stair tower's door).
export const PRIMAL = INK.maple;
// The fake brand, for every place, and today's client: Gander Cola.
export const BRAND = { name: 'GANDER COLA', line: 'TAKE A GANDER', can: C.red, ink: C.white };
// A screen showing work (a spreadsheet's grey) and one that isn't.
export const SCREEN = { work: tint(C.greyLight, 0.4), play: C.tealLight, off: C.ink };

// Greybox floor tones: each team's carpet a shade apart, so the plan reads at
// a glance, and the lot.
export const TONE = {
  leadership: tint(INK.carpet, 0.35),
  marketing: tint(INK.carpet, 0.5),
  front: tint(INK.birch, 0.2),
  creative: tint(INK.carpet, 0.45),
  ux: tint(INK.carpet, 0.55),
  'dev-qa': tint(INK.carpet, 0.3),
  lot: INK.asphalt,
  road: shade(INK.asphalt, 0.2),
  grass: tint(INK.pine, 0.35),
  walk: tint(C.greyLight, 0.2),
};
export const BLOCK = {
  desk: INK.birch,
  divider: tint(INK.carpet, 0.2),
  chair: shade(INK.carpet, 0.35),
  room: alpha(tint(C.sky, 0.6), 0.45),
  wall: SIDING,
  wood: C.wood,
  kitchen: tint(INK.birch, 0.05),
  car: [C.red, C.navy, C.grey, C.white, C.teal, C.mustard, C.black, C.green],
  bear: C.black,
  sign: INK.sticky,
  machine: tint(C.grey, 0.2),
};
