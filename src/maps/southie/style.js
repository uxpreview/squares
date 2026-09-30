// Moving Day: the style sheet. Every area takes its colors and shared props
// from here, so the whole level stays one plate: a wet, bright September
// street, printed in the triple-deckers' siding colors against the grey of a
// rainy day (docs/levels/southie.md, "Palette and plate"). The art director
// tunes the inks. Line ink stays the game's navy (C.ink).
import { C, mix, tint, shade } from '../../engine/art.js';
import { hour, nightK, rainK } from './clock.js';

export const INK = {
  paper: '#E6E2D6',
  green: '#9CB89A', // the Green House's siding
  yellow: '#EFD27A', // the Yellow House's
  blue: '#9DBBD4', // the rest of the row, with the others
  condo: '#5F666C', // the Grey One
  asphalt: '#7F838C',
  park: '#8DB86B',
  harbor: '#4F7F95',
  truck: '#E8793A', // the rental truck, cones, the NO PARKING signs
  brick: '#B5654A', // the corner at East Broadway, chimneys (shared with Newburyport)
};

// Each house's siding and trim.
export const SIDING = {
  green: INK.green,
  yellow: INK.yellow,
  grey: INK.condo,
  others: [INK.blue, tint(INK.brick, 0.25), tint(C.lilac, 0.2), C.white],
};
export const TRIM = { green: C.white, yellow: C.white, grey: C.black };

// The ground's layers (land.js).
export const LAND = {
  paving: mix(C.greyLight, INK.paper, 0.4), // sidewalks, lots, walkways
  yard: mix(INK.park, C.brown, 0.25),
  lawn: INK.park,
  road: INK.asphalt,
  line: C.white,
  kerb: tint(INK.asphalt, 0.55),
  sand: mix(C.butter, INK.paper, 0.45),
  bed: mix(C.butter, INK.harbor, 0.4),
  deep: mix(INK.harbor, C.navy, 0.3),
  soil: mix(C.brown, INK.paper, 0.35),
  wet: C.ink,
};
// The same ground after dark, printed deeper and bluer.
export const EVENING = Object.fromEntries(Object.entries(LAND).map(([k, v]) => [k, mix(v, C.night, 0.55)]));
// And wet: the road and the sidewalks go darker in the rain, and stay so a while.
export const WET = { road: shade(INK.asphalt, 0.28), paving: shade(LAND.paving, 0.16) };

// ---------- The paper through the day ----------
// Cream at seven, grey while it rains, pink behind Dorchester Heights at
// sunset, navy at night (the Block Party's plate.at(t)). Blended in 32 steps
// so the colors stay few.
const q = (k) => Math.round(k * 32) / 32;
const DAWN = mix(INK.paper, C.blush, 0.35);
const RAIN = mix(INK.paper, C.grey, 0.55);
const SUNSET = mix(C.blush, C.pink, 0.35);
const NIGHT = C.night;
export function paperAt(t) {
  const h = hour(t);
  let p = INK.paper;
  if (h < 7) p = mix(DAWN, INK.paper, q(Math.max(0, (h - 5.5) / 1.5)));
  p = mix(p, RAIN, q(Math.min(1, rainK(t) * 1.3)));
  if (h > 17.8 && h < 21) p = mix(p, SUNSET, q(Math.min(1, (h - 17.8) / 1.3, (21 - h) / 1.4)));
  return mix(p, NIGHT, q(nightK(t)));
}
// The page's loose words print in the light ink once the paper's dark.
export const kindAt = (t) => (nightK(t) > 0.5 ? 'night' : 'day');

// ---------- Shared inks for the art ----------
export const CARS = [C.coral, C.teal, C.mustard, tint(C.sky, 0.1), C.white, C.purple, C.red, INK.asphalt, C.black];
export const LIT = C.butter; // a lit window
export const lightsOn = (t) => nightK(t) >= 0.3;
// The fake brand, for every place: Gander Cola. "Take a gander."
export const BRAND = { name: 'GANDER COLA', line: 'TAKE A GANDER', can: C.red, ink: C.white };
// The donut shop's cups, pink and orange, everywhere (there's no shop on the
// map; decision 14).
export const CUP = { body: C.white, band: C.pink, lid: INK.truck, ice: tint(C.sky, 0.5) };
