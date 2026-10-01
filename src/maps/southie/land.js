// Moving Day's ground and water: a slice of City Point, South Boston,
// compressed but never rearranged (plan.js has the layout). The city is flat
// at GROUND; Marine Park rolls a little and runs down a beach into Pleasure
// Bay; causeways ring the bay; Castle Island is a mound with the fort on it;
// Dorchester Bay is in front. The water's level doesn't move (no tide here),
// just small waves on the harbor.
//
// The engine's rule (terrain.js): toward the viewer the ground never climbs
// steeper than 0.8 a unit, so the causeways' bay sides are gentle and the sea
// wall along Day Boulevard is a thing, not ground.
import { makeLand } from '../../engine/terrain.js';
import { C, shade, mix } from '../../engine/art.js';
import { nightK } from './clock.js';
import { W, D, GROUND, ROAD, ROAD_Y, SHORE_Y, DAY_BLVD, CIRCLE, BROADWAY, PARK_X, BAY, BEACH_X, HEAD_ISLAND, SUGAR_BOWL, EAST_WALK, ISLAND, LOT } from './plan.js';
import { LAND, INK } from './style.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => { const k = clamp((v - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
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

export const LEVEL = 0; // the water, all day
const BED = -1.6, DEEP = -2.6;

// Pleasure Bay's water: a rounded box, its beach on the west side.
const bayIn = (x, y) => Math.min(x - BAY.x0, BAY.x1 - x, y - BAY.y0, BAY.y1 - y);
// The causeways round the bay: Day Boulevard's along its north shore, the
// Head Island causeway out to the Sugar Bowl, the walkway down its east side.
const causeway = (x, y) => Math.max(
  3 - lineDist(x, y, [[42, 4.5], [82, 4.5]]),
  2 - lineDist(x, y, HEAD_ISLAND),
  SUGAR_BOWL[2] - Math.hypot(x - SUGAR_BOWL[0], y - SUGAR_BOWL[1]),
  2.2 - lineDist(x, y, EAST_WALK),
);
// Where there's land (above 0) and how far in: the city and the park (down
// to the sea wall on the west, the park's south edge, the bay's beach), the
// causeways, the port's apron north of them, and Castle Island.
const mainland = (x, y) => Math.min(BAY.x0 - 3 - x, (x < PARK_X + 2 ? SHORE_Y : 59.5) - y);
export const island = (x, y) => ISLAND[2] - Math.hypot(x - ISLAND[0], (y - ISLAND[1]) * 1.15);
// (And the Castle Island lot, at the causeway's end.)
const lot = (x, y) => Math.min(x - LOT[0], LOT[2] - x, y - LOT[1] + 3, LOT[3] - y);
const landness = (x, y) => Math.max(mainland(x, y), causeway(x, y), island(x, y), lot(x, y), 2.5 - y);

// The water's floor: Pleasure Bay's shallow bed, the harbor's deeper one.
const floorOf = (x, y) => DEEP + (BED - DEEP) * smooth(-4, 0, bayIn(x, y));
// The land's top: flat city, the park rolling a little, Castle Island's mound.
function top(x, y) {
  let g = GROUND;
  if (x > PARK_X) g += 0.16 * Math.sin(x / 4.2) * Math.sin(y / 5.1) * smooth(PARK_X, PARK_X + 4, x) * (1 - smooth(BEACH_X - 3, BEACH_X, x));
  const i = island(x, y);
  if (i > 0) g = Math.max(g, GROUND + 1.3 * smooth(0, ISLAND[2] * 0.8, i));
  return g;
}

// Land running down into water over R units, gentle enough (a rise of up to
// 3 over 6 units, 0.75 a unit at its steepest) that it never climbs toward
// the viewer too steeply. The beach on the bay runs longer, and the sea wall
// on the west is a thing, so the ground there just drops.
function height(x, y) {
  if (x < PARK_X + 2 && y > SHORE_Y) return DEEP;
  const L = landness(x, y);
  const beach = x > BEACH_X - 2 && x < BAY.x0 + 4 && y > BAY.y0 && y < BAY.y1;
  const R = beach ? 8 : 6;
  const k = smooth(-R + 1, 1, L);
  const f = floorOf(x, y);
  return f + (top(x, y) - f) * k;
}

// Roads: Farragut Road, East Broadway's end, Day Boulevard.
function roadField(x, y) {
  const farragut = Math.min(x - ROAD.park0, ROAD.park1 - x, y - ROAD_Y[0], ROAD_Y[1] + 1 - y);
  const broadway = Math.min(y - BROADWAY[0], BROADWAY[1] - y, CIRCLE[0] - x);
  const day = 1.7 - lineDist(x, y, DAY_BLVD);
  return Math.max(farragut, broadway, day);
}
// Paving: every sidewalk, the lots, the walkways round the bay, the circle.
function pavingField(x, y) {
  const walks = Math.min(x - (ROAD.walk0 - 0.01), ROAD.walk1 - x);
  const circle = CIRCLE[2] + 1.2 - Math.hypot(x - CIRCLE[0], y - CIRCLE[1]);
  const lot = Math.min(x - LOT[0], LOT[2] - x, y - LOT[1], LOT[3] - y);
  const loop = 1.6 - Math.min(lineDist(x, y, HEAD_ISLAND), lineDist(x, y, EAST_WALK), Math.hypot(x - SUGAR_BOWL[0], y - SUGAR_BOWL[1]) - 2.2);
  const shore = 1.8 - lineDist(x, y, [[0, 61.6], [26, 61.6]]);
  const conley = 2.2 - y; // the port's apron north of the causeway
  return Math.max(walks, circle, lot, loop, shore, x > 52 ? conley : -1);
}

export const land = makeLand({
  w: W,
  d: D,
  step: 0.5,
  height,
  base: -3.4,
  level: () => LEVEL,
  top: 0,
  layers: [
    { id: 'soil', color: LAND.yard, field: () => 1 },
    { id: 'bed', color: LAND.bed, field: (x, y, h) => -0.2 - h },
    { id: 'deep', color: LAND.deep, field: (x, y, h) => -2.1 - h, flat: true },
    // The beach: Pleasure Bay Beach, down the park's east side into the bay.
    { id: 'sand', color: LAND.sand, field: (x, y, h) => Math.min(x - BEACH_X, h + 0.9, y - BAY.y0 + 2, BAY.y1 + 3 - y, BAY.x0 + 6 - x) },
    { id: 'lawn', color: LAND.lawn, field: (x, y, h) => Math.min(x - PARK_X - 0.01, BEACH_X - x, h - 0.2, 59 - y, y - 3), edge: shade(LAND.lawn, 0.3), lw: 0.04 },
    { id: 'island', color: LAND.lawn, field: (x, y, h) => Math.min(island(x, y) - 1.2, h - 0.35), edge: shade(LAND.lawn, 0.3), lw: 0.04 },
    { id: 'paving', color: LAND.paving, field: (x, y, h) => Math.min(pavingField(x, y), h + 0.25), flat: true, edge: LAND.kerb, lw: 0.05 },
    { id: 'road', color: LAND.road, field: (x, y, h) => Math.min(roadField(x, y), h + 0.25), flat: true, edge: LAND.kerb, lw: 0.06 },
  ],
  // (The water takes the night, like the paper.)
  water: { color: (t) => mix(INK.harbor, C.night, Math.round(nightK(t) * 0.6 * 16) / 16), foam: C.white, wet: LAND.wet, side: INK.harbor, alpha: 0.6, deepAlpha: 0.25, depth: 1.2, under: -1.2 },
  side: { soil: LAND.soil, dots: shade(LAND.soil, 0.45) },
  rim: false,
});

export const h = land.h;
