// Plum Island's ground and water: a real barrier island, compressed but never
// rearranged (docs/levels/plum.md). World units: x runs along the island,
// south (the refuge, x = 0) to north (the river mouth, x = W); y from the back
// (Plum Island Sound, the Great Marsh and the Merrimack, y = 0) to the front
// (the Atlantic, y = D). A person is 2.3 units tall (a unit is about 2.4 feet),
// and the tide (tide.js) runs from -0.9 at noon to 0.8 at the king tide.
//
//   x   0 ............ 44 .............. 80 ............ 108
//   y 0   Plum Island   |  the Great Marsh:  |  the Merrimack
//         Sound, the    |  the turnpike, the |  (a sandbar the
//         flats         |  airfield, the     |  seals like)
//                       |  Pink House        |
//    22 ~~~~~ the island's back shore (the Plum Island River behind the town) ~~~
//         the refuge:   |  the Center, where |  the north end:
//         scrub, Lot 1, |  the turnpike      |  the lighthouse,
//         the tower,    |  lands; houses     |  the Point, the
//    35   the dunes     |  on the dunes      |  tip, the jetty
//    40 ~~~~~ the dune toe ~~~ the beach, wide at low tide, gone at the king tide ~~~
//    64   the Atlantic
//
// The ground follows the engine's one rule (terrain.js): toward the viewer
// it never climbs steeper than 0.8 a unit. So banks and dune backs that face
// away from you are gentle slopes, and anything steep (the jetty, the
// bridge) is a thing, not ground.
import { makeLand } from '../../engine/terrain.js';
import { C, mix, shade, tint } from '../../engine/art.js';
import { level, KING } from './tide.js';
import { INK, LAND } from './style.js';

export const W = 108, D = 64;
// The areas split here: the refuge, the town, the north end (along x); the
// water behind, the island, the beach and the sea (along y).
export const TOWN = 44, NORTH = 80, BACK = 22, BEACH = 42;

// Each area: the box it covers, [x0, y0, x1, y1] in world units. (Every area
// sits at the map's corner and takes its box as its shape, so an area file
// works in the same units as this one, like the Block Party's streets.)
export const AREAS = {
  flats: [0, 0, TOWN, BACK],
  turnpike: [TOWN, 0, NORTH, BACK],
  'north-point': [NORTH, 0, W, D],
  'refuge-dunes': [0, BACK, TOWN, BEACH],
  center: [TOWN, BACK, NORTH, BEACH],
  'refuge-beach': [0, BEACH, TOWN, D],
  'front-beach': [TOWN, BEACH, NORTH, D],
};

const STEP = 0.5;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => { const k = clamp((v - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
// A soft bump: 1 in the middle, 0 at r and past it.
const bump = (d, r) => (d >= r ? 0 : (1 - (d / r) ** 2) ** 2);

// ---------- The island's outline ----------
// Where dry sand ends at an ordinary high tide: the dune toe along the
// Atlantic, round the north tip (the Point, facing the river mouth), and the
// back shore along the Sound, the Plum Island River and the Merrimack. It
// runs on past the map's left edge (the refuge goes on for miles).
export const OCEAN = [[-4, 39.4], [12, 39.9], [26, 39.4], [44, 39.7], [60, 39.3], [76, 39.8], [86, 39.3], [92, 38.4], [96.5, 36.3], [99.2, 33.2]];
export const POINT = [[99.2, 33.2], [99.4, 30.2], [97.4, 27.4], [93.8, 25.3], [88.5, 23.6], [84, 22.9]];
export const FRONT = [...OCEAN, ...POINT.slice(1)];
export const BACK_SHORE = [[84, 22.9], [76, 22.6], [66, 22.9], [58, 22.4], [48, 22.8], [40, 22.1], [30, 21.5], [20, 22.2], [8, 21.6], [-4, 22]];
const OUTLINE = [...FRONT, ...BACK_SHORE.slice(1)];

function segDist(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
  const u = l ? clamp(((px - ax) * dx + (py - ay) * dy) / l, 0, 1) : 0;
  return Math.hypot(px - ax - u * dx, py - ay - u * dy);
}
const lineDist = (x, y, pts) => {
  let d = Infinity;
  for (let i = 1; i < pts.length; i++) d = Math.min(d, segDist(x, y, pts[i - 1], pts[i]));
  return d;
};
function insidePoly(x, y, pts) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// ---------- What's behind it ----------
// The Sound (the refuge's side): flats at -0.45, out at low tide, with a
// channel winding through, and marsh islands along the back.
const channel = (x) => 11 + 3 * Math.sin(x / 6.5 + 0.5);
const marshEdge = (x) => 4.2 + 1.4 * Math.sin(x / 5 + 1) + 0.8 * Math.sin(x / 2.3);
// The Plum Island River, behind the town, along the island's back shore.
export const RIVER = 18;
// Creeks winding back into the marsh from it.
export const CREEKS = [
  [[49.5, 17], [47.8, 12], [50.5, 7.5], [48.6, 1]],
  [[69.5, 17], [71.6, 13.4], [68.8, 10.6]],
];
// Salt pannes: shallow pools in the marsh that fill at high water.
export const PANNES = [[63.6, 12.6, 1.6], [53.8, 5.6, 1.2], [76.5, 12.4, 1.3]];
// The turnpike: across the marsh from the mainland (off the back edge) to the
// Center, on a low causeway. The bridge over the river is a thing (it's steep).
export const PIKE = 58.5; // its middle, along y
export const ROAD_Z = 0.65; // its crown (tide.js floods it above this)
export const BRIDGE = [15.2, 21.6]; // the span over the river, in y
// The airfield on the marsh, north of the road (x0, y0, x1, y1): a grass strip.
export const AIRFIELD = [63, 2.8, 79, 7.8];
// Where the Pink House stood: south of the road, a raised lot in the marsh.
export const PINK = [52, 11];
// The clam shack by the road, near the mainland end.
export const SHACK = [54.5, 2.6];
// The river mouth's sandbar, where the seals haul out at low tide.
export const BAR = [93, 11];

// Sloped so that nothing climbs toward you steeper than the engine's rule
// allows (0.8 a unit, straight down the screen): banks that face away from
// you are wide and gentle.
function sound(x, y) {
  // Plum Island Sound, behind the refuge: flats at -0.45, out at low tide,
  // the channel winding through, marsh islands along the back.
  let h = -0.45 - 1.3 * bump(Math.abs(y - channel(x)), 4);
  h = Math.max(h, 0.45 - 0.55 * Math.max(0, y - marshEdge(x)));
  // A marsh island in the middle (the goose's lookout).
  const isl = Math.hypot((x - 31) / 2.6, (y - 15.6) / 1.8);
  return Math.max(h, isl < 1 ? 0.45 : 0.45 - 0.6 * (isl - 1));
}
function marsh(x, y) {
  // The Great Marsh: a platform just over an ordinary high tide.
  let h = 0.45 + 0.025 * Math.sin(x * 1.7 + y * 0.9);
  // The Plum Island River, just behind the island: a flat bottom at -1.5,
  // its back bank (facing you) steep, its front one gentle.
  const r = y - RIVER;
  h = Math.min(h, r < 0 ? -1.5 + 1.95 * smooth(1.5, 3.5, -r) : -1.5 + 1.95 * smooth(1.5, 5.5, r));
  // Creeks: -0.6 down the middle, gentle banks either side.
  for (const c of CREEKS) h = Math.min(h, -0.6 + 1.05 * smooth(0.5, 3.4, lineDist(x, y, c)));
  // Salt pannes: shallow pools at 0.25.
  for (const [px, py, pr] of PANNES) h = Math.min(h, 0.45 - 0.2 * (1 - smooth(pr - 0.4, pr + 0.4, Math.hypot(x - px, y - py))));
  // Raised ground: the causeway (up to the bridge's ends), the airstrip, the
  // Pink House's lot, the clam shack's pad. Each falls away at 0.4 a unit
  // past its edge, into whatever's round it.
  const pad = (top, out) => top - 0.4 * Math.max(0, out);
  const ramp = Math.min(1, (1 - smooth(BRIDGE[0] - 0.6, BRIDGE[0] + 0.4, y)) + smooth(BRIDGE[1] - 0.2, BRIDGE[1] + 1.6, y));
  h = Math.max(h, pad(ROAD_Z, Math.abs(x - PIKE) - 1.35) - 2.5 * (1 - ramp));
  const [a0, b0, a1, b1] = AIRFIELD;
  h = Math.max(h, pad(0.95, Math.max(a0 - x, x - a1, b0 - y, y - b1)));
  h = Math.max(h, pad(0.8, Math.hypot(x - PINK[0], y - PINK[1]) - 1.8));
  h = Math.max(h, pad(1.05, Math.hypot(x - SHACK[0], y - SHACK[1]) - 1.9));
  return h;
}
function mouth(x, y) {
  // The Merrimack's mouth: deep water, and a sandbar that shows at low tide.
  const bar = Math.hypot((x - BAR[0]) / 3.4, (y - BAR[1]) / 1.9);
  return Math.max(-2.4, -0.35 - 1.2 * smooth(0.6, 2.2, bar));
}
// Whatever's behind the island at (x, y): the Sound, the marsh or the river
// mouth, blended where they meet.
function behind(x, y) {
  const a = smooth(TOWN - 4, TOWN + 1, x), b = smooth(NORTH + 1, NORTH + 6, x);
  let h = sound(x, y);
  if (a > 0) h += (marsh(x, y) - h) * a;
  if (b > 0) h += (mouth(x, y) - h) * b;
  return h;
}

// ---------- The island itself ----------
// Its top: the refuge's scrub, the town's flat streets, and the dunes along
// the Atlantic side, highest in the refuge. d: how far in from the Atlantic
// (or the Point); b: how far in from the back shore.
export const crestIn = 4.2; // how far in from the toe the dunes' crest runs
const duneTop = (x) => {
  const refuge = 2.75 + 0.3 * Math.sin(x / 3.1) * Math.sin(x / 1.7 + 1);
  return refuge + (2.05 - refuge) * smooth(TOWN - 3, TOWN + 3, x) - 0.6 * smooth(90, 98, x);
};
function island(x, y, d, b) {
  const refuge = 1.0 + 0.1 * Math.sin(x * 0.8) * Math.sin(y * 1.3);
  const inner = refuge + (1.15 - refuge) * smooth(TOWN - 3, TOWN + 3, x);
  // Down to the back shore: 0.9 at the water's edge.
  const base = 0.9 + (inner - 0.9) * smooth(0, 3, b);
  // The dunes: up from the toe (0.95) to the crest, down the back into the island.
  const c = duneTop(x);
  const dune = d < crestIn ? 0.95 + (c - 0.95) * smooth(0, crestIn, d) : base + (c - base) * (1 - smooth(crestIn, crestIn + 4.6, d));
  return Math.max(base, dune);
}

// The beach, out from the toe into the Atlantic (gentle: a wide beach at low
// tide), and round the Point into the river mouth (steep: the channel runs
// right past it).
function beach(x, d) {
  const k = smooth(89, 97, x), slope = 0.15 + 0.3 * k;
  const h = 0.95 - slope * d;
  return h > -1.2 ? h : Math.max(-2.6, -1.2 - (0.4 + 0.4 * k) * (-1.2 - h) / slope);
}

// ---------- The height, everywhere ----------
// Worked out once for every point of the land's grid (see makeLand).
const nx = Math.round(W / STEP), ny = Math.round(D / STEP);
const GEO = [];
for (let j = 0; j <= ny; j++) {
  for (let i = 0; i <= nx; i++) {
    const x = i * STEP, y = j * STEP;
    const d = lineDist(x, y, FRONT), b = lineDist(x, y, BACK_SHORE);
    GEO.push({ inside: insidePoly(x, y, OUTLINE), d, b, o: lineDist(x, y, OCEAN), p: lineDist(x, y, POINT) });
  }
}
const geo = (x, y) => GEO[Math.round(y / STEP) * (nx + 1) + Math.round(x / STEP)];

function height(x, y) {
  const g = geo(x, y);
  // (Inside, it eases down to the Point's river side as to the back shore.)
  if (g.inside) return island(x, y, g.o, Math.min(g.b, g.p));
  // Outside: the beach on the Atlantic side, the back shore's slope down into
  // what's behind it, blended where the two sides meet (round the Point).
  const sea = beach(x, g.d);
  const back = Math.max(behind(x, y), 0.9 - 0.42 * g.b);
  const w = smooth(-2, 2, g.b - g.d); // 0: nearer the back shore, 1: nearer the Atlantic
  return back + (sea - back) * w;
}

// ---------- The layers ----------
// Behind the island (the marsh side, not the Atlantic's): above 0 there, a
// unit or so clear of its back shore.
const backSide = (x, y) => { const g = geo(x, y); return g.inside ? -1 : Math.min(g.d - g.b, g.b - 0.6); };
// On the island, back from both shores (behind the dunes, clear of the back beach).
const inland = (x, y) => { const g = geo(x, y); return g.inside ? Math.min(g.d - 5.2, g.b - 1.1) : -1; };

// Roads: the turnpike and the island's own (Northern Boulevard to the Point,
// the refuge road south), as lines with a width; lots as boxes.
export const ROADS = [
  { pts: [[PIKE, -1], [PIKE, BRIDGE[0] + 0.3]], w: 1.35 },
  { pts: [[PIKE, BRIDGE[1] - 0.3], [PIKE, 26], [59.5, 29]], w: 1.3 },
  { pts: [[TOWN - 1, 25.6], [PIKE, 25.3], [76, 25.5], [86, 26.4], [91, 28.2]], w: 1.05 },
];
export const TRACK = [[-1, 25.1], [20, 25.4], [TOWN - 1, 25.6]]; // the refuge road: gravel
export const LOTS = [
  [55.8, 29, 63.5, 33], // the Center's lot, by the beach path
  [34.5, 23.6, 41, 27.2], // the refuge's Lot 1, by the boardwalk
  [84.5, 27.6, 90.5, 31.2], // the Point's lot, by the lighthouse
];
const roadField = (x, y) => {
  let f = -Infinity;
  for (const r of ROADS) f = Math.max(f, r.w - lineDist(x, y, r.pts));
  for (const [a0, b0, a1, b1] of LOTS) f = Math.max(f, Math.min(x - a0, a1 - x, y - b0, b1 - y));
  return f;
};

export const land = makeLand({
  w: W,
  d: D,
  step: STEP,
  height,
  base: -3.2,
  level,
  top: KING,
  layers: [
    { id: 'sand', color: LAND.sand, field: () => 1 },
    // The sea bed, always under: sand going grey-green with depth.
    { id: 'bed', color: LAND.bed, field: (x, y, h) => -1.25 - h },
    { id: 'deep', color: LAND.deep, field: (x, y, h) => -2.05 - h, flat: true, dots: shade(LAND.deep, 0.35), density: 0.14 },
    // Behind the island: mud on the flats, in the creeks and down the river.
    { id: 'mud', color: LAND.mud, field: (x, y, h) => Math.min(0.32 - h, backSide(x, y)) },
    // The marsh: just over an ordinary high tide, behind the island.
    { id: 'marsh', color: LAND.marsh, field: (x, y, h) => Math.min(h - 0.37, 0.72 - h, backSide(x, y) + 0.4), edge: shade(LAND.marsh, 0.35) },
    // The island's top behind the dunes: the refuge's scrub, the town's lawns.
    { id: 'scrub', color: LAND.scrub, field: (x, y) => Math.min(TOWN - 1 - x, inland(x, y)) },
    { id: 'lawn', color: LAND.lawn, field: (x, y) => Math.min(x - TOWN, inland(x, y)) },
    // Dune grass, on the dunes.
    { id: 'dune', color: LAND.dune, field: (x, y, h) => h - 1.5, edge: shade(LAND.dune, 0.3), lw: 0.04 },
    // The airstrip: mown grass, a shade lighter.
    { id: 'strip', color: LAND.strip, field: (x, y) => Math.min(x - AIRFIELD[0] - 0.3, AIRFIELD[2] - 0.3 - x, y - AIRFIELD[1] - 0.3, AIRFIELD[3] - 0.3 - y), flat: true },
    { id: 'track', color: LAND.track, field: (x, y) => 0.8 - lineDist(x, y, TRACK), flat: true },
    { id: 'road', color: LAND.road, field: roadField, flat: true, edge: LAND.kerb, lw: 0.06 },
  ],
  // One see-through pass of sea ink: the bed's own colors under it carry the
  // depth (sand in the shallows, the deep bed darker).
  water: { color: INK.sea, foam: C.white, wet: LAND.wet, side: INK.sea, alpha: 0.55, deepAlpha: 0 },
  side: { soil: LAND.soil, dots: shade(LAND.soil, 0.45) },
});

// ---------- For what stands on it ----------
// The ground's height at a world point, and where a floating thing floats.
export const h = land.h;
export const float = (x, y, t) => Math.max(land.h(x, y), level(t));
// The road's height for a car on it, over the bridge too: up the ramps to the
// deck over the river.
export const DECK = 1.55;
export function roadZ(x, y) {
  const [a, b] = BRIDGE;
  if (y > a - 1.5 && y < b + 1.5) {
    const k = y < a ? (y - (a - 1.5)) / 1.5 : y > b ? ((b + 1.5) - y) / 1.5 : 1;
    return Math.max(land.h(x, y), ROAD_Z + (DECK - ROAD_Z) * clamp(k, 0, 1));
  }
  return land.h(x, y);
}
