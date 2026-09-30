// A world is a map, built: its zones placed in 3D, in draw order, with the
// questions the camera and the game need answered ("what's the whole picture",
// "where does this zone sit on screen", "which zone did I tap").
//
// A map module (see src/maps/*/map.js) exports:
//   {
//     id, name, tagline, short,               // short: the back button's label in a room (optional)
//     zones: [{ zone, at: [x, y, z], tag, h, span, fixed, size, shape }],  // zone modules and where they go
//                                              // (size, shape: for one that isn't 16 x 16; see zone.js)
//     order: ['zoneId', ...],                   // prev/next and list order (optional)
//     cutaway: { front, above, walls, lift, ghost },  // how zones get out of the way (below)
//     storeys: [{ id, name, short, z }],        // named floors, changed from the lift (optional)
//     storey: 'ground',                         // which floor the overview starts on
//     overview(portrait, storeyId, short) => [X0, X1, Y0, Y1],  // the framing for the whole map (optional)
//     backdrop(ctx, t, world, fx), sky(ctx, t, world, fx),  // drawn under / over the zones (optional)
//     plate: { paper, kind },                   // the sheet this place is printed on (optional);
//                                               // or { at(t) => { paper, kind } }: one that changes with the clock (a day)
//     walkers: [{ id, at(t), draw(ctx, t, p) }], // people on a shared timeline (optional)
//     land,                                     // ground with height and water (engine/terrain.js, optional)
//     words: { ... },                           // map-specific copy (see src/game/play.js)
//   }
//
// Cutaways, for when you're looking at one zone:
//   front: zones in front of it are cut away around its outline (the block)
//   above: zones on floors above it lift up and fade out (a building's floors).
//          With named storeys, the lift does the same in the overview.
//          'column': only the floors above it in its own building lift (a
//          street of houses: step into a second floor and only that house's
//          third floor lifts), and the front cut takes everything in front of
//          it, at any height (the house next door's upper floors too).
//   walls: waist height for inside walls (a number turns "walls down" on): a wall
//          with a room right behind it drops to this height unless you're in its room
//   lift, ghost: how far lifted floors rise (iso units) and how faint they get
//
// Walkers: people who move between zones on one clock. Each is drawn by the zone
// they're standing in, so they walk out of one room's door and into the next.
// at(t) gives world units { x, y, z, ... }; draw gets the same point in the
// zone's own units. See schedule() in src/engine/actors.js.

import { buildZone, inside, wallHeight, WALL_T } from './zone.js';
import { S, ZK, SLAB, unproject } from './iso.js';

const overlap = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0) > 0.5;

// Is chunk (or zone) b in front of a, on the same floor? Both are boxes on the
// floor that don't overlap: b is in front if it's past a along x or y and
// beside it (or past it both ways).
export function inFront(a, b) {
  const A = rectOf(a), B = rectOf(b);
  return (B[0] >= A[2] - 0.01 && B[3] > A[1] + 0.01) || (B[1] >= A[3] - 0.01 && B[2] > A[0] + 0.01);
}
const rectOf = (c) => (c.rect
  ? [c.zone.ox + c.rect[0], c.zone.oy + c.rect[1], c.zone.ox + c.rect[2], c.zone.oy + c.rect[3]]
  : [c.ox, c.oy, c.ox + c.w, c.oy + c.d]);

// Back to front: by how far along the floor each chunk's back corner is, then
// upward, except that anything in front of another on the same floor always
// comes after it (a small chunk of street beside a big room can be further
// back by its corner and still be in front), and a floor always comes after
// the one it stands on (in a house, the ground floor can wait on a strip of
// yard behind it that the floors above don't touch).
const over = (a, b) => {
  const A = rectOf(a), B = rectOf(b);
  return Math.min(A[2], B[2]) - Math.max(A[0], B[0]) > 0.01 && Math.min(A[3], B[3]) - Math.max(A[1], B[1]) > 0.01;
};
function sortChunks(list) {
  const order = list.slice().sort((a, b) => a.ox + a.oy - (b.ox + b.oy) || a.oz - b.oz || a.ox - b.ox);
  const n = order.length;
  const after = order.map(() => []), need = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const a = order[i], b = order[j];
      const first = Math.abs(a.oz - b.oz) > 0.5 ? a.oz < b.oz && over(a, b) : inFront(a, b);
      if (first) { after[i].push(j); need[j]++; }
    }
  }
  // Take the first one in the plain order that has nothing left to wait for
  // (or, if some are waiting on each other, the first one left).
  const out = [], done = new Array(n).fill(false);
  for (let k = 0; k < n; k++) {
    let pick = -1;
    for (let i = 0; i < n; i++) if (!done[i] && need[i] === 0) { pick = i; break; }
    if (pick < 0) pick = done.indexOf(false);
    done[pick] = true;
    out.push(order[pick]);
    for (const j of after[pick]) need[j]--;
  }
  return out;
}

// Where a line of sight meets a zone's ground with height: (X, Y) in the
// zone's own iso units, from its back corner. Walks down from over the
// highest the land goes (its line of sight can cross another area's hills on
// the way) to the zone's lowest, nearest the viewer first, and returns the
// first point on or under the ground, as [x, y] in the zone's units, or null.
function groundUnder(z, X, Y) {
  const top = Math.max(z.hi, z.land ? z.land.peak - z.oz : -Infinity) + 0.5, bottom = z.lo - 0.5, stepZ = 0.1;
  let prev = null;
  for (let h = top; h >= bottom; h -= stepZ) {
    const [x, y] = unproject(X, Y + h * ZK);
    const g = z.ground(x, y);
    if (h <= g) {
      if (!prev) return [x, y];
      // Between this step and the last: where the two cross.
      const u = (prev.h - prev.g) / (prev.h - prev.g - (h - g));
      return [prev.x + (x - prev.x) * u, prev.y + (y - prev.y) * u];
    }
    prev = { h, g, x, y };
  }
  return null;
}

export function buildWorld(map) {
  const cutaway = { front: false, above: false, walls: null, ...(map.cutaway || { front: true }) };
  const walkers = map.walkers || [];
  const land = map.land || null;
  // (A zone can stand on the land without printing it: place.land false, a house.)
  const zones = map.zones.map((place, index) => Object.assign(buildZone(place.zone, { ...place, walkers, land: place.land === false ? null : land }), { index }));
  const shells = zones.some((z) => z.shelled);
  // What's drawn, back to front: every zone's chunks (see zone.js).
  const drawOrder = sortChunks(zones.flatMap((z) => z.chunks));
  const order = map.order
    ? map.order.map((id) => zones.findIndex((z) => z.id === id)).filter((i) => i >= 0)
    : [...new Set(drawOrder.map((c) => c.zone.index))];

  // Storeys, bottom to top: the map's named floors, or one per floor height.
  const storeys = (map.storeys
    ? map.storeys.map((s) => ({ ...s }))
    : [...new Set(zones.map((z) => Math.round(z.oz * 100) / 100))].map((z) => ({ id: String(z), name: '', z }))
  ).sort((a, b) => a.z - b.z);
  for (const z of zones) {
    z.storey = 0;
    storeys.forEach((s, i) => { if (z.oz >= s.z - 0.05) z.storey = i; });
  }
  const top = storeys.length - 1;
  const named = map.storey ? storeys.findIndex((s) => s.id === map.storey) : -1;
  const defaultStorey = named >= 0 ? named : top;

  // Walls down: an inside wall is one with another zone right behind it (a
  // room, or a street running past: any box of a zone of any shape).
  if (cutaway.walls != null) {
    const boxes = (a) => a.rects.map((r) => [a.ox + r[0], a.oy + r[1], a.ox + r[2], a.oy + r[3]]);
    for (const z of zones) {
      z.low = cutaway.walls;
      z.wallK = 0;
      const near = zones.filter((a) => a !== z && overlap(a.oz, a.oz + a.span, z.oz, z.oz + z.h));
      z.inner.left = near.some((a) => boxes(a).some((b) => Math.abs(b[2] - z.ox) < 0.01 && overlap(b[1], b[3], z.oy, z.oy + z.d)));
      z.inner.right = near.some((a) => boxes(a).some((b) => Math.abs(b[3] - z.oy) < 0.01 && overlap(b[0], b[2], z.ox, z.ox + z.w)));
    }
  }

  // Every door in world units: the wall's plane, where the opening runs, how tall.
  const doors = zones.flatMap((z) => z.doors.map((dd) => {
    const left = dd.side === 'left';
    return {
      zone: z.id,
      side: dd.side,
      id: dd.id,
      axis: left ? 'x' : 'y', // the wall is the plane x = at (left) or y = at (right)
      plane: left ? z.ox : z.oy,
      from: (left ? z.oy : z.ox) + dd.at - dd.w / 2,
      to: (left ? z.oy : z.ox) + dd.at + dd.w / 2,
      z0: z.oz,
      z1: z.oz + dd.h,
      x: left ? z.ox : z.ox + dd.at,
      y: left ? z.oy + dd.at : z.oy,
    };
  }));

  const totalGeese = zones.filter((z) => z.finds.some((f) => f.goose)).length;
  const totalThings = zones.reduce((n, z) => n + z.finds.filter((f) => !f.goose).length, 0);

  // The zone's body (floor, walls, slab) in world iso space: around every
  // box of its floor, for a zone of any shape.
  const body = (z) => {
    const [ax, ay] = z.anchor;
    let X0 = Infinity, X1 = -Infinity, Y0 = Infinity, Y1 = -Infinity;
    for (const [x0, y0, x1, y1] of z.rects) {
      X0 = Math.min(X0, x0 - y1); X1 = Math.max(X1, x1 - y0);
      Y0 = Math.min(Y0, (x0 + y0) / 2); Y1 = Math.max(Y1, (x1 + y1) / 2);
    }
    return [ax + X0, ax + X1, ay + Y0 - (z.h + z.hi) * ZK, ay + Y1 + Math.max(SLAB, -z.base) * ZK];
  };

  // What the overview frames. portrait: taller than wide; short: a landscape
  // phone, where height is scarce. A map can frame itself (map.overview).
  // On a phone the map fills the screen rather than floating in paper: held
  // upright, the box is the map's full height and a wide map runs off the
  // sides, a swipe away; on its side, the full width. (Narrowing the box the
  // other way is what makes the framing fill that way.)
  function overviewBox(portrait, storeyId, short = false) {
    if (map.overview) return map.overview(portrait, storeyId, short);
    let X0 = Infinity, X1 = -Infinity, Y0 = Infinity, Y1 = -Infinity;
    for (const z of zones) {
      const [a, b, c, d] = body(z);
      X0 = Math.min(X0, a); X1 = Math.max(X1, b); Y0 = Math.min(Y0, c); Y1 = Math.max(Y1, d);
    }
    const cx = (X0 + X1) / 2, cy = (Y0 + Y1) / 2;
    if (portrait) return [cx - 1, cx + 1, Y0 - 5, Y1 + 4];
    if (short) return [X0 - 2, X1 + 2, cy - 1, cy + 1];
    return [X0 - 6, X1 + 6, Y0 - 5, Y1 + 4];
  }

  // What framing a zone looks at. A room: all of it. A long area (a street
  // running the length of the map) framed whole would make its finds tiny, so
  // it's framed a room's worth at a time, around near (a world point: where
  // you tapped, or a find), or else its home (zone.home, or its first piece).
  const long = (z) => z.w > S + 1 || z.d > S + 1;
  function zoneBox(z, near) {
    if (!long(z)) {
      const [X0, X1, Y0, Y1] = body(z);
      return [X0 - 0.5, X1 + 0.5, Y0 - 1.5, Y1 + 0.5];
    }
    let [cx, cy] = near ? [near[0] - z.ox, near[1] - z.oy] : z.home || [(z.rects[0][0] + z.rects[0][2]) / 2, (z.rects[0][1] + z.rects[0][3]) / 2];
    const R = S / 2 + 2;
    cx = Math.max(Math.min(R, z.w / 2), Math.min(z.w - Math.min(R, z.w / 2), cx));
    cy = Math.max(Math.min(R, z.d / 2), Math.min(z.d - Math.min(R, z.d / 2), cy));
    const [x0, y0, x1, y1] = [cx - R, cy - R, cx + R, cy + R];
    const [ax, ay] = z.anchor;
    // (On ground with height, framed at the ground's height there.)
    const g = z.ground ? z.ground(cx, cy) : 0;
    return [ax + x0 - y1 - 0.5, ax + x1 - y0 + 0.5, ay + (x0 + y0) / 2 - (z.h + g) * ZK - 1.5, ay + (x1 + y1) / 2 - g * ZK + SLAB * ZK + 0.5];
  }

  // Which zone is at world iso point (X, Y)? Front-most wins (chunk by chunk,
  // so a street that runs in front of a room wins there, and not behind it).
  // Tests the floor, then a few heights so taps on walls and tall things count
  // too. Zones lifted by a cutaway are tested where they're drawn. skip(zone)
  // leaves zones out.
  // A closed building (a zone with its outside showing, R.shell) counts its
  // whole box, floor to ceiling. On a map with those, where a tap meets things
  // at different heights (a house's second floor, the third floor above and
  // behind it along the same line of sight, the street), the nearest along the
  // line of sight wins: the highest point it meets (looking down, higher is
  // nearer), ties to the one drawn last.
  function zoneAt(X, Y, skip) {
    const under = new Map(); // where the tap meets each zone's ground (asked once a zone)
    let best = -1, bestZ = -Infinity;
    const hit = (z, at) => {
      if (!shells) return true;
      if (at > bestZ + 1e-6) { best = z.index; bestZ = at; }
      return false;
    };
    for (let i = drawOrder.length - 1; i >= 0; i--) {
      const c = drawOrder[i], z = c.zone;
      if (skip && skip(z)) continue;
      const [ax, ay] = [z.anchor[0], z.anchor[1] - (z.lift || 0)];
      const [x0, y0, x1, y1] = c.rect;
      // A closed building: its whole box. The line of sight through the tap
      // runs (lx + s, ly + s, s / ZK) from its floor point; it's in the box
      // for s in each axis's range, and meets the box first (nearest you) at
      // the top of all three.
      if (z.shelled && z.shellK > 0.5) {
        const [lx, ly] = unproject(X - ax, Y - ay);
        const top = Math.min(x1 - lx, y1 - ly, z.h * ZK);
        const bottom = Math.max(x0 - lx, y0 - ly, 0);
        // (Its top face counts a little lower, so the floor over it wins there.)
        if (top >= bottom && hit(z, z.oz + top / ZK - 0.02)) return z.index;
        continue;
      }
      // Ground with height: where the tap meets the ground.
      if (z.ground) {
        if (!under.has(z)) under.set(z, groundUnder(z, X - ax, Y - ay));
        const p = under.get(z);
        if (p && p[0] >= x0 - (x0 ? 0 : 0.5) && p[1] >= y0 - (y0 ? 0 : 0.5) && p[0] <= x1 && p[1] <= y1 && hit(z, z.oz + z.ground(p[0], p[1]))) return z.index;
        continue;
      }
      // Walls down, a room only reaches as high as its walls stand now, so a
      // tap on the street behind a lowered wall lands on the street.
      const top = z.low != null && z.walls ? Math.max(1.5, wallHeight(z, 'left'), wallHeight(z, 'right')) : Math.max(6, z.h);
      for (let h = 0; h <= top; h += top < 2 ? top : 2) {
        const [lx, ly] = unproject(X - ax, Y - ay + h * ZK);
        if (lx < x0 - (x0 ? 0 : 0.5) || ly < y0 - (y0 ? 0 : 0.5) || lx > x1 || ly > y1) continue;
        if (h > 0 && lx > 1.2 && ly > 1.2) continue; // above the floor only near the back walls
        if (hit(z, z.oz + h)) return z.index;
        break;
      }
    }
    return best;
  }

  // The zone a world point is standing in, if any.
  const zoneAtPoint = (x, y, z = 0) => zones.find((zn) => inside(zn, x, y, z)) || null;

  // The point on a zone's floor (its own units) under a world iso point:
  // on a flat floor, straight down; on ground with height, where the line of
  // sight first meets the ground.
  function floorUnder(z, X, Y) {
    const lx = X - z.anchor[0], ly = Y - z.anchor[1] + (z.lift || 0);
    if (z.ground) return groundUnder(z, lx, ly) || unproject(lx, ly + z.lo * ZK);
    return unproject(lx, ly);
  }

  // Does walking in a straight line from p to q (world { x, y, z }) go through
  // a wall rather than a door? Returns null, or { zone, side, x, y } where it
  // hits. Walls count at their full height, as they are when you're in the room.
  function blocked(p, q) {
    for (const z of zones) {
      const o = z.walls;
      if (!o) continue;
      for (const side of ['left', 'right']) {
        if (o[side] === false) continue;
        const left = side === 'left';
        const plane = left ? z.ox : z.oy;
        const a = left ? p.x : p.y, b = left ? q.x : q.y;
        if ((a >= plane) === (b >= plane)) continue;
        const k = (plane - a) / (b - a);
        const u = left ? p.y + (q.y - p.y) * k : p.x + (q.x - p.x) * k; // along the wall
        const zz = (p.z || 0) + ((q.z || 0) - (p.z || 0)) * k;
        const u0 = left ? z.oy : z.ox;
        if (u < u0 - WALL_T || u > u0 + (left ? z.d : z.w) || zz < z.oz - 0.1 || zz >= z.oz + o.h) continue;
        const through = z.doors.some((dd) => dd.side === side && u >= u0 + dd.at - dd.w / 2 + 0.15 &&
          u <= u0 + dd.at + dd.w / 2 - 0.15 && zz < z.oz + dd.h);
        if (!through) return { zone: z.id, side, x: left ? plane : u, y: left ? u : plane, z: zz };
      }
    }
    return null;
  }

  return {
    map,
    id: map.id,
    zones,
    // Chunks, not zones: what the renderer draws, in order. Each has .zone.
    drawOrder,
    order,
    storeys,
    defaultStorey,
    top,
    walkers,
    doors,
    totalGeese,
    totalThings,
    cutaway,
    overviewBox,
    zoneBox,
    long,
    zoneAt,
    zoneAtPoint,
    floorUnder,
    blocked,
    wallHeight,
    indexOf: (id) => zones.findIndex((z) => z.id === id),
  };
}
