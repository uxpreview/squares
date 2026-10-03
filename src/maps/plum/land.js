// Plum Island's ground and water: a real barrier island, compressed but never
// rearranged (docs/levels/plum.md, Shape). World units: x runs along the
// island, south (Sandy Point, x = 0, the top left of the screen) to north
// (the Point and the river mouth, x = W, the bottom right); y from the back
// (the Great Marsh, Plum Island Sound and the Merrimack, y = 0) to the front
// (the Atlantic, y = D). A person is 2.3 units tall (a unit is about 2.4
// feet), and the tide (tide.js) runs from -0.9 at noon to 0.8 at midnight.
//
//   x  0 ....... 48 ......... 70 .............. 96 ...... 112
//   y 0  Plum      | the Great Marsh: the turnpike, | the
//        Island    | the airfield, the Pink House's | Merrimack,
//        Sound,    | lot, Bob's Lobster, the Plum  | the Basin
//        the flats | Island River behind the town   |
//   27 ~~~~~~~~~~~ the island's back shore ~~~~~~~~~~~~~~~~~~~~~~~~~
//        the refuge: | the Center:  | the Town Beach: | the Point:
//        its road,   | where the    | rows of houses  | the light-
//        the tower,  | turnpike     | on the dunes    | house, the
//        the gate    | lands        |                 | playground
//   43.5 ~~~~ the dune toe ~~~ the beach, wide at low tide ~~~~~~~~~~~
//   58   the Atlantic, and the paper: the plate is the sea
//
// The ground follows the engine's one rule (terrain.js): toward the viewer
// it never climbs steeper than 0.8 a unit. So banks and dune backs that face
// away from you are gentle slopes, and anything steep (the jetty, the
// bridge) is a thing, not ground. Every edge of the map is deep water or
// marsh, printed without a cut side: the sea runs on into the paper.
import { makeLand } from '../../engine/terrain.js';
import { C, shade } from '../../engine/art.js';
import { level, KING, DIP, LOW } from './tide.js';
import { INK, LAND, seaAt, paperAt } from './style.js';

export const W = 112, D = 58;
// The areas split here: the refuge, the Center, the Town Beach, the Point
// (along x); the water behind, the island, the beach and the sea (along y).
export const CENTER = 48, TOWN = 70, POINT_X = 96, BACK = 28, BEACH = 44;

// Each area: the box it covers, [x0, y0, x1, y1] in world units. (Every area
// sits at the map's corner and takes its box as its shape, so an area file
// works in the same units as this one, like the Block Party's streets.)
export const AREAS = {
  sound: [0, 0, CENTER, BACK],
  turnpike: [CENTER, 0, POINT_X, BACK],
  'north-point': [POINT_X, 0, W, D],
  'refuge-dunes': [0, BACK, CENTER, BEACH],
  'refuge-beach': [0, BEACH, CENTER, D],
  center: [CENTER, BACK, TOWN, D],
  'town-beach': [TOWN, BACK, POINT_X, D],
};

const STEP = 0.5;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => { const k = clamp((v - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
// A soft bump: 1 in the middle, 0 at r and past it.
const bump = (d, r) => (d >= r ? 0 : (1 - (d / r) ** 2) ** 2);

// ---------- The island's outline ----------
// Where dry sand ends at an ordinary high tide: from Sandy Point (the south
// tip) along the Atlantic's dune toe, round the north tip (the Point, facing
// the river mouth), and back along the island's back shore (the Sound, the
// Plum Island River, the Basin) to Sandy Point.
export const OCEAN = [[4.5, 37.5], [8, 41.4], [14, 43.1], [26, 43.6], [40, 43.3], [56, 43.6], [72, 43.2], [86, 43.5], [96, 43], [101.5, 41.6], [105.5, 38.8], [107.6, 35.2]];
export const POINT = [[107.6, 35.2], [107.4, 31.4], [105.4, 28.2], [101.5, 26.3], [96, 25.8]];
export const FRONT = [...OCEAN, ...POINT.slice(1)];
export const BACK_SHORE = [[96, 25.8], [88, 26.6], [78, 27.1], [68, 26.8], [60, 27.2], [50, 26.9], [38, 26.4], [26, 27], [15, 26.6], [9, 28.4], [5.4, 31.6], [4, 34.6], [4.5, 37.5]];
const OUTLINE = [...FRONT, ...BACK_SHORE.slice(1)];

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
function insidePoly(x, y, pts) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// ---------- What's behind it ----------
// Plum Island Sound, behind the refuge: flats at -0.45, out at low tide,
// with a channel winding through, and marsh islands along the back (the
// mainland's marsh, at the top of the screen).
const channel = (x) => 15 + 3.2 * Math.sin(x / 6.5 + 0.5);
const marshEdge = (x) => 5.2 + 1.4 * Math.sin(x / 5 + 1) + 0.8 * Math.sin(x / 2.3);
// The Plum Island River, behind the town, along the island's back shore.
export const RIVER = 22.3;
// Creeks winding back into the marsh from it.
export const CREEKS = [
  [[51, 20.5], [52.6, 15.5], [50.2, 11], [52, 5.5], [50.8, 0]],
  [[74, 20.5], [76.4, 16.4], [73.6, 12.8], [75.6, 8.4]],
  [[88, 20.5], [86.8, 15.6], [89.2, 11.4]],
];
// Salt pannes: shallow pools in the marsh that fill at high water.
export const PANNES = [[70.2, 9.4, 1.5], [80.5, 13.2, 1.3], [84.5, 6.2, 1.6]];
// The turnpike: across the marsh from the mainland (off the back edge) to the
// Center, on a low causeway. The drawbridge over the river is a thing.
export const PIKE = 62; // its middle, along x
export const ROAD_Z = 0.95; // its crown, over an ordinary high tide
// Its low spot, just behind the drawbridge: under at the king tide (decision 27).
export const LOW_SPOT = [13.2, 18.2];
export const BRIDGE = [RIVER - 3, RIVER + 3]; // the span over the river, in y
// The airfield, south of the road at the mainland end (x0, y0, x1, y1): a
// grass strip along it.
export const AIRFIELD = [49.2, 3.2, 59.6, 7.6];
// The refuge's visitor center, at the mainland end, south of the road.
export const VISITOR = [53.2, 0.3];
// Where the Pink House stood: south of the road, mid-causeway, a raised lot.
export const PINK = [57.4, 11.6];
// Bob's Lobster (decision 50), across the road from it, and its lot.
export const SHACK = [66.4, 10.4];
// The restaurant deck at the island end, north of the road, facing the sunset.
export const DECK_AT = [70.4, 24.6];
// The Merrimack's mouth: a sandbar that shows at low tide, and the Basin, a
// lagoon on the river side of the Point.
export const BAR = [104, 11];
export const BASIN = [100.6, 21.6];

function sound(x, y) {
  let h = -0.45 - 1.3 * bump(Math.abs(y - channel(x)), 4.4);
  h = Math.max(h, 0.45 - 0.55 * Math.max(0, y - marshEdge(x)));
  // A marsh island in the middle (the goose's lookout).
  const isl = Math.hypot((x - 30) / 2.6, (y - 20.4) / 1.8);
  return Math.max(h, isl < 1 ? 0.45 : 0.45 - 0.6 * (isl - 1));
}
// The causeway's crown along it: over an ordinary high tide, dipping at its
// low spot, and down under the bridge (whose deck is a thing).
function crown(y) {
  const [a, b] = LOW_SPOT;
  const dip = smooth(a - 1.6, a + 0.8, y) * (1 - smooth(b - 0.8, b + 1.2, y));
  return ROAD_Z - (ROAD_Z - DIP + 0.1) * dip;
}
function marsh(x, y) {
  // The Great Marsh: a platform just over an ordinary high tide.
  let h = 0.45 + 0.025 * Math.sin(x * 1.7 + y * 0.9);
  // The Plum Island River: a flat bottom at -1.5, its back bank steep (it
  // faces you), its front one gentle.
  const r = y - RIVER;
  h = Math.min(h, r < 0 ? -1.5 + 1.95 * smooth(1.5, 3.5, -r) : -1.5 + 1.95 * smooth(1.5, 5.5, r));
  // Creeks: -0.6 down the middle, gentle banks either side.
  for (const c of CREEKS) h = Math.min(h, -0.6 + 1.05 * smooth(0.5, 3.4, lineDist(x, y, c)));
  // Salt pannes: shallow pools at 0.25.
  for (const [px, py, pr] of PANNES) h = Math.min(h, 0.45 - 0.2 * (1 - smooth(pr - 0.4, pr + 0.4, Math.hypot(x - px, y - py))));
  // Raised ground: the causeway (up to the bridge's ends), the airstrip, the
  // Pink House's lot, Bob's Lobster's. Each falls away at 0.4 a unit past
  // its edge, into whatever's round it.
  const pad = (top, out) => top - 0.4 * Math.max(0, out);
  const ramp = Math.min(1, (1 - smooth(BRIDGE[0] - 0.6, BRIDGE[0] + 0.4, y)) + smooth(BRIDGE[1] - 0.2, BRIDGE[1] + 1.6, y));
  h = Math.max(h, pad(crown(y), Math.abs(x - PIKE) - 1.4) - 2.5 * (1 - ramp));
  const [a0, b0, a1, b1] = AIRFIELD;
  h = Math.max(h, pad(0.95, Math.max(a0 - x, x - a1, b0 - y, y - b1)));
  h = Math.max(h, pad(1.0, Math.hypot(x - PINK[0], y - PINK[1]) - 1.9));
  h = Math.max(h, pad(1.05, Math.max(Math.abs(x - SHACK[0]) - 2.6, Math.abs(y - SHACK[1]) - 2.2)));
  h = Math.max(h, pad(1.0, Math.hypot(x - VISITOR[0] - 1.5, y - 1) - 2));
  return h;
}
function mouth(x, y) {
  // The Merrimack's mouth: deep water, a sandbar that shows at low tide, and
  // the Basin behind the Point, shallow, cut off from the river at low water.
  const bar = Math.hypot((x - BAR[0]) / 3.6, (y - BAR[1]) / 1.9);
  let h = Math.max(-2.5, -0.35 - 1.2 * smooth(0.6, 2.2, bar));
  // (A ring of marsh round it, joined to the Point's back shore.)
  const bas = Math.hypot((x - BASIN[0]) / 4.2, (y - BASIN[1]) / 2.8);
  h = Math.max(h, 0.45 - 1.2 * Math.max(0, bas - 1));
  return Math.min(h, -0.5 + 0.95 * smooth(0.35, 0.62, bas));
}
// Whatever's behind the island at (x, y): the Sound, the marsh or the river
// mouth, blended where they meet.
function behind(x, y) {
  const a = smooth(CENTER - 5, CENTER + 1, x), b = smooth(POINT_X - 6, POINT_X - 1, x);
  let h = sound(x, y);
  if (a > 0) h += (marsh(x, y) - h) * a;
  if (b > 0) h += (mouth(x, y) - h) * b;
  return h;
}

// ---------- The island itself ----------
// Its top: the refuge's scrub, the town's flat streets, and the dunes along
// the Atlantic side, highest in the refuge. d: how far in from the Atlantic
// (or the Point); b: how far in from the back shore.
export const crestIn = 4;
const duneTop = (x) => {
  const refuge = 2.75 + 0.3 * Math.sin(x / 3.1) * Math.sin(x / 1.7 + 1);
  return (refuge + (2.05 - refuge) * smooth(CENTER - 3, CENTER + 3, x) - 0.6 * smooth(98, 105, x)) * (0.55 + 0.45 * smooth(5, 14, x));
};
function island(x, y, d, b) {
  const refuge = 1.0 + 0.1 * Math.sin(x * 0.8) * Math.sin(y * 1.3);
  const inner = refuge + (1.15 - refuge) * smooth(CENTER - 3, CENTER + 3, x);
  const base = 0.9 + (inner - 0.9) * smooth(0, 3, b);
  const c = Math.max(base, duneTop(x));
  const dune = d < crestIn ? 0.95 + (c - 0.95) * smooth(0, crestIn, d) : base + (c - base) * (1 - smooth(crestIn, crestIn + 4.2, d));
  return Math.max(base, dune);
}

// The beach, out from the toe into the Atlantic (a wide beach at low tide),
// and round the Point into the river mouth (steep: the channel runs right
// past it).
function beach(x, d) {
  const k = smooth(100, 107, x), slope = 0.25 + 0.25 * k;
  const h = 0.95 - slope * d;
  return h > -1.2 ? h : Math.max(-2.7, -1.2 - (0.45 + 0.35 * k) * (-1.2 - h) / slope);
}

// ---------- The height, everywhere ----------
const nx = Math.round(W / STEP), ny = Math.round(D / STEP);
const GEO = [];
for (let j = 0; j <= ny; j++) {
  for (let i = 0; i <= nx; i++) {
    const x = i * STEP, y = j * STEP;
    GEO.push({ inside: insidePoly(x, y, OUTLINE), d: lineDist(x, y, FRONT), b: lineDist(x, y, BACK_SHORE), o: lineDist(x, y, OCEAN), p: lineDist(x, y, POINT) });
  }
}
const geo = (x, y) => GEO[Math.round(y / STEP) * (nx + 1) + Math.round(x / STEP)];

function ground(x, y) {
  const g = geo(x, y);
  if (g.inside) return island(x, y, g.o, Math.min(g.b, g.p));
  const sea = beach(x, g.d);
  const back = Math.max(behind(x, y), 0.9 - 0.42 * g.b);
  const w = smooth(-2, 2, g.b - g.d); // 0: nearer the back shore, 1: nearer the Atlantic
  return back + (sea - back) * w;
}
// The rim: every edge but the mainland's marsh goes down to deep water, the
// paper's own color, so the sea runs on past the map. (Down toward the
// front; up gently from the back edges, by the slope rule.)
const DEEP = -2.7;
function height(x, y) {
  let h = ground(x, y);
  const front = DEEP + 0.7 * Math.max(0, Math.min(W - x, D - y) - 2);
  const south = DEEP + 0.5 * Math.max(0, x - 2); // the Sound's mouth, past Sandy Point
  const river = DEEP + 0.5 * Math.max(0, y - 2) + 6 * (1 - smooth(POINT_X - 4, POINT_X + 2, x)); // the Merrimack, off the back edge
  return Math.min(h, front, south, river);
}

// ---------- The layers ----------
// Behind the island (the marsh side, not the Atlantic's): above 0 there, a
// unit or so clear of its back shore.
const backSide = (x, y) => { const g = geo(x, y); return g.inside ? -1 : Math.min(g.d - g.b, g.b - 0.6); };
// On the island, back from both shores (behind the dunes, clear of the back beach).
const inland = (x, y) => { const g = geo(x, y); return g.inside ? Math.min(g.d - 5, g.b - 1.1) : -1; };

// Roads: the turnpike, and the island's own (Plum Island Boulevard through
// the Center, Northern Boulevard to the Point, Sunset Drive south to the
// refuge's gate); lots as boxes. The refuge road is gravel.
export const BLVD = 31; // the island's road, along x
export const GATE = 46.4; // the refuge's gatehouse, on Sunset Drive
export const ROADS = [
  { pts: [[PIKE, -1], [PIKE, BRIDGE[0] + 0.3]], w: 1.4 },
  { pts: [[PIKE, BRIDGE[1] - 0.3], [PIKE, BLVD]], w: 1.4 },
  { pts: [[GATE - 1, BLVD], [96, BLVD], [100.5, 30.2], [103, 32.4]], w: 1.1 },
];
export const TRACK = [[-1, 32.5], [8, 33.2], [22, 32.6], [34, 31.6], [GATE, BLVD]];
export const LOTS = {
  lot1: [36.5, 32.6, 43, 36], // the refuge's Lot 1, by its boardwalk
  residents: [55.5, 33, 60.8, 37.4], // the Center's residents-only lot
  private: [63.4, 33, 68.4, 37.4], // $20 a day, across the path
  point: [96.8, 32.2, 101.6, 35.4], // the Point's lot, by the lighthouse
};
const roadField = (x, y) => {
  let f = -Infinity;
  for (const r of ROADS) f = Math.max(f, r.w - lineDist(x, y, r.pts));
  for (const [a0, b0, a1, b1] of Object.values(LOTS)) f = Math.max(f, Math.min(x - a0, a1 - x, y - b0, b1 - y));
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
  rim: false,
  paper: paperAt,
  layers: [
    { id: 'sand', color: LAND.sand, field: () => 1 },
    // The sea bed, always under: sand going grey-green with depth.
    { id: 'bed', color: LAND.bed, field: (x, y, h) => -1.25 - h },
    // Deep water: the sea's bed, which under the water is the paper's color.
    { id: 'deep', color: LAND.deep, field: (x, y, h) => -2.05 - h, flat: true },
    // Behind the island: mud on the flats, in the creeks and down the river.
    { id: 'mud', color: LAND.mud, field: (x, y, h) => Math.min(0.32 - h, backSide(x, y)) },
    // The marsh: just over an ordinary high tide, behind the island.
    { id: 'marsh', color: LAND.marsh, field: (x, y, h) => Math.min(h - 0.37, 0.8 - h, backSide(x, y) + 0.4), edge: shade(LAND.marsh, 0.35) },
    // The island's top behind the dunes: the refuge's scrub, the town's lawns.
    { id: 'scrub', color: LAND.scrub, field: (x, y) => Math.min(CENTER - 1 - x, inland(x, y)) },
    { id: 'lawn', color: LAND.lawn, field: (x, y) => Math.min(x - CENTER, inland(x, y)) },
    // Dune grass, on the dunes.
    { id: 'dune', color: LAND.dune, field: (x, y, h) => h - 1.5, edge: shade(LAND.dune, 0.3), lw: 0.04 },
    // The airstrip: mown grass, a shade lighter.
    { id: 'strip', color: LAND.strip, field: (x, y) => Math.min(x - AIRFIELD[0] - 0.3, AIRFIELD[2] - 0.3 - x, y - AIRFIELD[1] - 0.3, AIRFIELD[3] - 0.3 - y), flat: true },
    { id: 'track', color: LAND.track, field: (x, y) => 0.8 - lineDist(x, y, TRACK), flat: true },
    { id: 'road', color: LAND.road, field: roadField, flat: true, edge: LAND.kerb, lw: 0.06 },
  ],
  // One see-through pass of sea ink, which follows the day (style.js): the
  // bed's own colors under it carry the depth, and over the deep bed it's
  // exactly the paper.
  // Below the lowest tide it's printed opaque, so the open sea has no seams.
  water: { color: seaAt, foam: C.white, wet: LAND.wet, side: INK.sea, alpha: 0.55, deepAlpha: 0, under: LOW - 0.3 },
  side: { soil: LAND.soil, dots: shade(LAND.soil, 0.45) },
});

// ---------- For what stands on it ----------
export const h = land.h;
export const float = (x, y, t) => Math.max(land.h(x, y), level(t));
// The road's height for a car on it, over the drawbridge too: up the ramps
// to the deck over the river. up: how far the bridge is open, 0 to 1 (a
// car never drives it open).
export const DECK = 1.6;
export function roadZ(x, y) {
  const [a, b] = BRIDGE;
  if (y > a - 1.5 && y < b + 1.5) {
    const k = y < a ? (y - (a - 1.5)) / 1.5 : y > b ? ((b + 1.5) - y) / 1.5 : 1;
    return Math.max(land.h(x, y), crown(y) + (DECK - crown(y)) * clamp(k, 0, 1));
  }
  return land.h(x, y);
}
