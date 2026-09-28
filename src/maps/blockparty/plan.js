// The Block, connected: where everything sits. The same sixteen rooms on the
// same 4 x 4 grid, pulled apart by streets: Main Street crosses the middle
// both ways (the stage at the crossing), back alleys run between the other
// rows and columns, and the pavement runs along the two front edges.
//
//          col 1        col 2          col 3        col 4
//   A   Observatory | Launch Pad  ‖ Rooftop Pool | Arcade
//   B   Greenhouse  | Roller Disco ‖ Library     | Ice Rink
//       ============ Main Street ==== stage ==== Main Street ====
//   C   Noodle Bar  | Bakery      ‖ Laundromat   | Ball Pit
//   D   Umbrellas   | Aquarium    ‖ Band         | Model Railway
//                                                   ...the pavement, along the front
//
// World units: x runs to the screen's lower right, y to the lower left.
// Rooms are 16 x 16. The brief: docs/levels/block.md.
import { S } from '../../engine/iso.js';

export const ALLEY = 4; // a back alley's width
export const MAIN = 9; // Main Street's width, kerb to kerb
export const PAVE = 4; // the pavement's width
export const LOOP = 360; // a day on the Block, in seconds (see day.js)

// Where each column (x) and row (y) of rooms starts.
export const LINE = [0, S + ALLEY, 2 * S + ALLEY + MAIN, 3 * S + 2 * ALLEY + MAIN]; // 0, 20, 45, 65
export const EDGE = 4 * S + 2 * ALLEY + MAIN; // the rooms' front edges, 81
export const SIZE = EDGE + PAVE; // the whole block, corner to corner, 85
export const MAIN0 = 2 * S + ALLEY; // Main Street's back kerb, 36
export const MAIN1 = MAIN0 + MAIN; // its front kerb, 45
export const MID = MAIN0 + MAIN / 2; // the middle of the road, 40.5

// The rooms, row by row from the back corner (the old Block's order).
export const GRID = [
  ['observatory', 'launchpad', 'pool', 'arcade'],
  ['greenhouse', 'disco', 'library', 'icerink'],
  ['noodles', 'bakery', 'laundromat', 'ballpit'],
  ['umbrellas', 'aquarium', 'band', 'trains'],
];

// Room id -> [x, y, z] of its back corner.
export const AT = {};
GRID.forEach((row, r) => row.forEach((id, c) => { AT[id] = [LINE[c], LINE[r], 0]; }));

// Each room's door onto the street behind it: side 'left' is the wall at
// x = 0 (the street behind it along x), 'right' the wall at y = 0; at: the
// middle of the door along the wall (w: its width, if not the usual 2.2).
// Where a room paints a door on that wall, the opening is cut through it. The Observatory, in the back corner,
// has no street behind it: you go in from the alley along its front.
export const DOORS = {
  launchpad: { side: 'left', at: 12.5 },
  pool: { side: 'left', at: 12.5 },
  arcade: { side: 'left', at: 12.5 },
  greenhouse: { side: 'right', at: 12.5 },
  disco: { side: 'left', at: 12.5 },
  library: { side: 'left', at: 12.5 },
  icerink: { side: 'left', at: 12.5 },
  noodles: { side: 'right', at: 14.4, w: 2 }, // its kitchen door, onto Main Street
  bakery: { side: 'left', at: 13.25, w: 2.3 }, // its street door
  laundromat: { side: 'left', at: 12.5 },
  ballpit: { side: 'left', at: 14.3, w: 1.8 }, // its fire exit
  umbrellas: { side: 'right', at: 12.5 },
  aquarium: { side: 'left', at: 12.5 },
  band: { side: 'left', at: 12.1, w: 2.1 }, // its side door
  trains: { side: 'left', at: 12.5 },
};

// The streets, each one area of any shape (boxes of [x0, y0, x1, y1], see
// "Chunks" in src/engine/zone.js). None of them overlap.
export const MAIN_STREET = [
  [MAIN0, 0, MAIN1, EDGE], // along y, the whole way, the stage in the middle
  [0, MAIN0, MAIN0, MAIN1], // along x, to its left
  [MAIN1, MAIN0, EDGE, MAIN1], // and to its right
];

const a0 = S, a1 = S + ALLEY; // the alley between columns (and rows) 1 and 2: 16 to 20
const b0 = LINE[3] - ALLEY, b1 = LINE[3]; // between 3 and 4: 61 to 65
export const ALLEYS = [
  // Along y, between the columns, each half of the block.
  [a0, 0, a1, MAIN0], [a0, MAIN1, a1, EDGE],
  [b0, 0, b1, MAIN0], [b0, MAIN1, b1, EDGE],
  // Along x, between the rows, cut where the ones along y cross.
  [0, a0, a0, a1], [a1, a0, MAIN0, a1], [MAIN1, a0, b0, a1], [b1, a0, EDGE, a1],
  [0, b0, a0, b1], [a1, b0, MAIN0, b1], [MAIN1, b0, b0, b1], [b1, b0, EDGE, b1],
];

export const PAVEMENT = [
  [EDGE, 0, SIZE, SIZE], // down the right-hand front
  [0, EDGE, EDGE, SIZE], // along the left-hand front
];

// The stage, at the crossing (world units, x, y, w, d).
export const STAGE = [MID - 2.5, MID - 2.5, 5, 5];

// ---------- Walking ----------
// People walk the streets along lanes: the middle of each alley, both kerbs of
// Main Street and the middle of the pavement, every way. They cross wherever
// two lanes meet, so any two points on lanes join up (route() below).
export const LANES = [(a0 + a1) / 2, MAIN0 + 1.6, MAIN1 - 1.6, (b0 + b1) / 2, EDGE + PAVE / 2]; // 18, 37.6, 43.4, 63, 83
// The lane behind each column (for a left door) and each row (a right door):
// the alley, or Main Street's near kerb for the rooms that face it.
const BEHIND = [null, LANES[0], LANES[2], LANES[3]];

// Each door in world units: which plane it's in, the spot in the street
// outside it (on a lane) and a step inside it.
export const DOOR = {};
for (const [id, d] of Object.entries(DOORS)) {
  const [ox, oy] = AT[id];
  const c = LINE.indexOf(ox), r = LINE.indexOf(oy);
  DOOR[id] = d.side === 'left'
    ? { axis: 'x', plane: ox, x: ox, y: oy + d.at, out: [BEHIND[c], oy + d.at], in: [ox + 1.6, oy + d.at] }
    : { axis: 'y', plane: oy, x: ox + d.at, y: oy, out: [ox + d.at, BEHIND[r]], in: [ox + d.at, oy + 1.6] };
}
// The Observatory's "door": the alley along its front, the Courier's hardest stop.
DOOR.observatory = { out: [LANES[0], 9], in: [S - 1.2, 9] };

// The way along the lanes from a to b (points on lanes, [x, y]): the corners
// to walk through, not counting a. Shortest, by Dijkstra on the lane grid.
export function route(a, b) {
  const on = (p, i) => LANES.some((v) => Math.abs(p[i] - v) < 1e-6);
  if (!(on(a, 0) || on(a, 1)) || !(on(b, 0) || on(b, 1))) throw new Error(`route: [${a}] or [${b}] isn't on a lane`);
  const pts = [a, b];
  for (const x of LANES) for (const y of LANES) pts.push([x, y]);
  // Neighbors: next along each lane.
  const n = pts.length, next = pts.map(() => []);
  for (const axis of [0, 1]) {
    for (const v of LANES) {
      const line = pts.map((p, i) => i).filter((i) => Math.abs(pts[i][axis] - v) < 1e-6).sort((i, j) => pts[i][1 - axis] - pts[j][1 - axis]);
      for (let k = 1; k < line.length; k++) {
        const i = line[k - 1], j = line[k], w = Math.abs(pts[i][1 - axis] - pts[j][1 - axis]);
        next[i].push([j, w]);
        next[j].push([i, w]);
      }
    }
  }
  const dist = new Array(n).fill(Infinity), prev = new Array(n).fill(-1), done = new Array(n).fill(false);
  dist[0] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || dist[u] === Infinity || u === 1) break;
    done[u] = true;
    // A small cost per turn keeps walks straight.
    for (const [v, w] of next[u]) if (dist[u] + w + 0.3 < dist[v]) { dist[v] = dist[u] + w + 0.3; prev[v] = u; }
  }
  const path = [];
  for (let i = 1; i > 0; i = prev[i]) path.unshift(pts[i]);
  // Drop corners that don't turn.
  return path.filter((p, i) => {
    const q = i ? path[i - 1] : a, r = path[i + 1];
    return !r || !((Math.abs(q[0] - p[0]) < 1e-6 && Math.abs(p[0] - r[0]) < 1e-6) || (Math.abs(q[1] - p[1]) < 1e-6 && Math.abs(p[1] - r[1]) < 1e-6));
  });
}

