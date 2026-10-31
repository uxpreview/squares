// The Farm's ground and water (ROADMAP E4, as built for Plum Island). Nearly
// flat: the farm at half a unit, a gentle rise where the house stands, the
// Great Marsh low at the back with its creeks, the Merrimack's flats in the
// back left corner, and Bowman's Pond in the fields. There's no tide here
// (that's Plum Island's verb): the water stands at one level all day.
//
// The ground keeps the engine's one rule (terrain.js): it never climbs toward
// the viewer steeper than 0.8 a unit. Every edge runs off into the meadow
// (the paper), so the land has no cut sides.
import { makeLand } from '../../engine/terrain.js';
import { shade } from '../../engine/art.js';
import { LAND, WATER, paperAt } from './style.js';
import {
  W, D, LANE, LOOP_DRIVE, PARKING, TRACK, PIKE, RUNWAY, HOUSE, POND, ORCHARD, STRIPES, CREEKS, FLATS, BASES, MOUND, HOME,
} from './plan.js';

const STEP = 0.5;
// The water's level, all day.
export const LEVEL = 0;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => { const k = clamp((v - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
const bump = (d, r) => (d >= r ? 0 : (1 - (d / r) ** 2) ** 2);
function segDist(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
  const u = l ? clamp(((px - ax) * dx + (py - ay) * dy) / l, 0, 1) : 0;
  return Math.hypot(px - ax - u * dx, py - ay - u * dy);
}
export const lineDist = (x, y, pts) => {
  let d = Infinity;
  for (let i = 1; i < pts.length; i++) d = Math.min(d, segDist(x, y, pts[i - 1], pts[i]));
  return d;
};
const inRect = (x, y, [x0, y0, x1, y1], m = 0) => Math.min(x - x0 - m, x1 - m - x, y - y0 - m, y1 - m - y);

// ---------- The height ----------
const FARM = 0.5; // the farm's ground
const MARSHY = 0.15; // the marsh platform, just over the water
function height(x, y) {
  // The farm, with a gentle rise round the house.
  const hx = (HOUSE[0] + HOUSE[2]) / 2, hy = (HOUSE[1] + HOUSE[3]) / 2;
  let h = FARM + 0.35 * bump(Math.hypot(x - hx, (y - hy) * 1.2), 15);
  // Down to the marsh at the back (behind the woods and the turnpike), except
  // the airfield's strip, built up.
  const toMarsh = smooth(8.5, 13.5, y);
  h = MARSHY + (h - MARSHY) * toMarsh;
  if (inRect(x, y, RUNWAY, -1) > 0) h = Math.max(h, 0.42 - 0.1 * smooth(0, 1.2, -inRect(x, y, RUNWAY)));
  // Creeks: down the middle under the water, gentle banks.
  for (const c of CREEKS) h = Math.min(h, -0.5 + (h + 0.5) * smooth(0.35, 3, lineDist(x, y, c)));
  // The turnpike's causeway, a little proud of the marsh (over the creeks:
  // the culverts are under it).
  h = Math.max(h, 0.55 - 0.45 * smooth(0.8, 3.4, lineDist(x, y, PIKE)));
  // The Merrimack's flats in the back left corner, under the water.
  h = Math.min(h, -0.4 + 0.6 * smooth(-0.5, 3, y - FLATS(x)));
  // Bowman's Pond, a bowl.
  const [px, py, pr] = POND;
  h = Math.min(h, -0.6 + 1.1 * smooth(0.8, pr + 1.2, Math.hypot(x - px, y - py)));
  return h;
}

// ---------- The layers ----------
const laneField = (x, y) => Math.max(
  1.05 - lineDist(x, y, LANE),
  0.75 - lineDist(x, y, TRACK),
  // The loop drive: a ring round the carriage barn's lawn.
  0.7 - Math.abs(Math.hypot((x - LOOP_DRIVE.cx) / LOOP_DRIVE.rx, (y - LOOP_DRIVE.cy) / LOOP_DRIVE.ry) - 1) * Math.min(LOOP_DRIVE.rx, LOOP_DRIVE.ry),
);
// The diamond: the base paths, the mound and home.
const infield = (x, y) => {
  let f = -Infinity;
  for (let i = 0; i < 4; i++) f = Math.max(f, 0.55 - segDist(x, y, BASES[i], BASES[(i + 1) % 4]));
  f = Math.max(f, 0.75 - Math.hypot(x - MOUND[0], y - MOUND[1]), 0.9 - Math.hypot(x - HOME[0], y - HOME[1]));
  return f;
};
const stripes = (x, y) => Math.max(...STRIPES.map((r) => inRect(x, y, r)));

export const land = makeLand({
  w: W,
  d: D,
  step: STEP,
  height,
  base: -1.5,
  level: () => LEVEL,
  top: LEVEL,
  rim: false,
  paper: paperAt,
  layers: [
    { id: 'meadow', color: LAND.meadow, field: () => 1 },
    // Mud where the water's shallow (the creeks, the flats, the pond's edge).
    { id: 'mud', color: LAND.mud, field: (x, y, h) => 0.08 - h, flat: true },
    // The Great Marsh, behind the woods.
    { id: 'marsh', color: LAND.marsh, field: (x, y, h) => Math.min(0.3 - h, h - 0.06, 14 - y), edge: shade(LAND.marsh, 0.3), lw: 0.04 },
    // The mown lawns round the house, the barn, the tent and the ball field.
    { id: 'lawn', color: LAND.lawn, field: (x, y) => Math.min(x - 0.5, 64.5 - x, y - 15.5, 71 - y), flat: true },
    // The parking field: mown, a shade lighter.
    { id: 'parking', color: LAND.mown, field: (x, y) => inRect(x, y, PARKING), flat: true },
    // The woods: north of the farm (between it and the turnpike) and behind the tent.
    { id: 'woods', color: LAND.woods, field: (x, y) => Math.max(Math.min(x - 26, 66 - x, y - 12, 16.8 - y), Math.min(x + 1, 30 - x, y - 13, 19.5 - y)), flat: true },
    // The leased fields: soil, with the crop in long stripes running back.
    { id: 'soil', color: LAND.soil, field: stripes, flat: true },
    { id: 'crop', color: LAND.crop, field: (x, y) => Math.min(stripes(x, y), Math.sin((Math.PI * (x - 67.5)) / 1.6) * 0.6), flat: true },
    // The orchard's grass, and the airfield's strip.
    { id: 'orchard', color: LAND.mown, field: (x, y) => inRect(x, y, ORCHARD), flat: true },
    { id: 'strip', color: LAND.strip, field: (x, y) => inRect(x, y, RUNWAY), flat: true },
    { id: 'infield', color: LAND.infield, field: infield, flat: true },
    { id: 'gravel', color: LAND.gravel, field: laneField, flat: true, edge: LAND.edge, lw: 0.04 },
    { id: 'road', color: LAND.road, field: (x, y) => 0.75 - lineDist(x, y, PIKE), flat: true },
  ],
  water: { color: WATER.color, wet: WATER.wet, side: WATER.color, alpha: 0.6, deepAlpha: 0, under: -0.3 },
  side: { soil: LAND.soil, dots: shade(LAND.soil, 0.45) },
});

// ---------- For what stands on it ----------
export const h = land.h;
