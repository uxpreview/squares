// Pitch Day: the style sheet. Every area takes its colors and shared props from
// here, so the whole level stays one plate. The inks come from the brief
// (docs/levels/agency.md, "Palette and plate"): New England woods at the end
// of October, leaves down, and an office's own colors (white desks, slate
// carpet, glass, sticky-note yellow). Add recurring props (a desk, a sign, a
// character's look) here once, rather than in each area.
import { C, alpha, tint, shade, mix } from '../../engine/art.js';
import { H } from './clock.js';

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

// The building: tan clapboard (the real one's front is tan, with brown trim
// bands and a stone base: the owner's old office, session 23's research),
// dark glass on the empty floors, the office's low walls and windows.
export const SIDING = mix(INK.birch, INK.leaves, 0.2);
export const TRIM = mix(C.brown, C.wood, 0.35);
export const STONE = mix(C.grey, C.brown, 0.25);
export const DARK_GLASS = mix(C.navy, INK.asphalt, 0.35);
export const GLASS = alpha(tint(C.sky, 0.35), 0.35);
export const FRAME = shade(C.grey, 0.2);
// Primal's own red-orange (its logo, the stair tower's door).
export const PRIMAL = INK.maple;
// The fake brand, for every place, and today's client: Gander Cola.
export const BRAND = { name: 'GANDER COLA', line: 'TAKE A GANDER', can: C.red, ink: C.white };
// The office chairs and the desks' dividers.
export const CHAIR = shade(INK.carpet, 0.45);
export const FABRIC = tint(INK.carpet, 0.25);

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

// ---------- The woods through the day ----------
// The paper follows the clock: a misty morning (paler), bright October
// leaves all afternoon, gold before sunset (about 6pm), and a deep blue-green
// night under the trees. Blended in 32 steps so the colors stay few. At night
// the page's loose words print in cream (kind: 'night').
const qk = (k) => Math.round(k * 32) / 32;
export const WOODS = {
  dawn: mix(INK.leaves, C.greyLight, 0.35),
  day: INK.leaves,
  gold: mix(INK.leaves, C.mustard, 0.35),
  dusk: mix(INK.leaves, INK.maple, 0.3),
  night: mix(INK.pine, C.night, 0.55),
};
const DAY = [[7, WOODS.dawn], [9, WOODS.day], [16.6, WOODS.day], [17.5, WOODS.gold], [18.3, WOODS.dusk], [19.2, WOODS.night], [30.2, WOODS.night], [31, WOODS.dawn]];
export function paperAt(t) {
  const h = H(t);
  for (let i = 1; i < DAY.length; i++) {
    const [h0, c0] = DAY[i - 1], [h1, c1] = DAY[i];
    if (h <= h1) return mix(c0, c1, qk((h - h0) / (h1 - h0)));
  }
  return WOODS.night;
}
