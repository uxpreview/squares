// Turns a zone definition into a list of drawable items, and renders it.
// A zone is one S x S patch of a map: a room on the block, a floor of a
// building, a stretch of beach.
//
// A zone module exports:
//   export default {
//     id: 'pool', name: 'Rooftop Pool', blurb: 'One line of story.',
//     build(R) { ... }   // R is the builder below
//   }
//
// Layers, drawn in this order:
//   floor  - slab, floor, floor patterns
//   wall   - the back walls
//   decor  - things flat on the walls (windows, posters, signs)
//   rug    - things flat on the floor (rugs, water, shadows, painted lines)
//   thing  - everything that stands up; depth-sorted back to front by x + y
//   dark   - the room's darkness when the lights go out (R.dark)
//   light  - glows from lamps, candles and fires (R.light); they shine through the dark
//   air    - drawn last, over everything (rain, snow, light beams, smoke)
//
// Every draw function receives (ctx, t) with ctx already positioned at the
// zone's back corner, in zone units. Items marked { anim: true } are redrawn
// each frame; the rest are baked into a cached picture when zoomed out.
//
// Walls the engine can cut down: R.walls({...}) draws the two back walls, with
// doors. On a map with walls down (cutaway.walls in its map.js), a wall with
// another room right behind it drops to waist height unless you're in its room,
// and whatever is painted on it (the wall and decor layers) is cut off with it.
//
// People on the map's shared timeline (map.walkers) are drawn by whichever
// zone they're standing in, so someone walking out of one room's door walks
// into the next one. See src/engine/world.js.

import { S, WALL, SLAB, ZK, isoX, isoY, zoneBounds } from './iso.js';
import { C, Q, setScreen, goose as drawGoose, box, onLeft, onRight, shade, alpha, glow } from './art.js';

const LAYERS = ['floor', 'wall', 'decor', 'rug', 'thing', 'dark', 'light', 'air'];
const WALL_L = 1, DECOR_L = 2, THING = 4;
export const WALL_T = 0.45; // wall thickness, the same as art.js walls()

// def: the zone module. place: where the map puts it.
//   place.at:     [x, y, z] of the zone's back corner in world units
//   place.tag:    short label shown above its name ("Unit 1A", "Floor 3")
//   place.h:      wall height, for framing and cutaways (default WALL)
//   place.span:   how much height counts as inside it, for walkers (default h + SLAB)
//   place.fixed:  outdoors; storeys never lift or dim it
//   place.walkers: people on the map's timeline (added by buildWorld)
export function buildZone(def, place = {}) {
  const [ox, oy, oz] = [place.at?.[0] ?? 0, place.at?.[1] ?? 0, place.at?.[2] ?? 0];
  const w = S, d = S, h = place.h ?? WALL;
  const zone = {
    def,
    id: def.id,
    name: def.name,
    tag: place.tag || '',
    ox, oy, oz, w, d, h,
    span: place.span ?? h + SLAB,
    fixed: !!place.fixed,
    anchor: [isoX(ox, oy), isoY(ox, oy, oz)],
    bounds: zoneBounds(w, d, h),
    items: [],
    anim: [],
    finds: [],
    walls: null, // what R.walls asked for
    doors: [], // openings in those walls, in zone units
    inner: { left: false, right: false }, // walls with a room right behind them (set by the world)
    low: null, // waist height for inner walls on maps with walls down (set by the world)
    wallK: 1, // 0 = inner walls down, 1 = up; the renderer animates it
    snap: null,
    snapScale: 0,
    snapT: -1,
    veil: 0, // 0 = fully shown, 1 = lifted out of the way (see cutaway in the renderer)
    lift: 0, // how far up it's drawn right now because of that, in world iso units
    dim: 0, // 0..1, faded back because it's below the zone you're in
  };
  const { items, finds } = zone;
  let order = 0;
  const add = (layer, draw, o = {}) => {
    const it = { layer: LAYERS.indexOf(layer), draw, depth: o.depth ?? 0, anim: !!o.anim, order: order++ };
    items.push(it);
    return it;
  };

  const R = {
    S,
    // Where this zone sits in the world (x, y, z of its back corner), and
    // whether a world point is inside it. Most zones never need these.
    origin: [ox, oy, oz],
    contains: (x, y, z = oz) => inside(zone, x, y, z),
    // The map's walkers (people on its shared timeline), if a zone wants to
    // react to them. The engine draws them; zones don't have to.
    walkers: place.walkers || [],
    floor: (draw, o) => add('floor', draw, o),
    wall: (draw, o) => add('wall', draw, o),
    decor: (draw, o) => add('decor', draw, o),
    rug: (draw, o) => add('rug', draw, o),
    air: (draw, o) => add('air', draw, { anim: true, ...o }),
    // A standing thing whose front-most floor point is near (x, y).
    thing: (x, y, draw, o = {}) => add('thing', draw, { depth: x + y, ...o }),
    // Something that moves. pos(t) returns at least { x, y }. draw(ctx, t, p).
    mover: (pos, draw, o = {}) => {
      let lastT = -1, lastP = null;
      const at = (t) => {
        if (t !== lastT) { lastP = pos(t); lastT = t; }
        return lastP;
      };
      const it = add('thing', (ctx, t) => draw(ctx, t, at(t)), { anim: true, ...o });
      it.depth = o.depth ?? ((t) => { const p = at(t); return p.x + p.y + (o.bias || 0); });
      return at;
    },
    // A hidden object to find. at: [x, y, z] or (t) => [x, y, z]. r: tap radius in units.
    find: ({ id, label, at, r = 0.9 }) => finds.push({ id, label, at, r }),
    // The loose goose. pos: [x, y, z?] or (t) => ({ x, y, z?, dir, pose })
    goose: (pos, o = {}) => {
      const fn = typeof pos === 'function' ? pos : () => ({ x: pos[0], y: pos[1], z: pos[2] || 0, ...o });
      const at = R.mover(fn, (ctx, t, p) => {
        drawGoose(ctx, p.x, p.y, p.z || 0, t, { dir: p.dir || o.dir, pose: p.pose || o.pose || (p.moving ? 'walk' : 'stand'), scale: o.scale });
      }, { bias: o.bias || 0 });
      finds.push({ id: 'goose', label: 'The goose', goose: true, r: 1.1, at: (t) => { const p = at(t); return [p.x, p.y, (p.z || 0) + 0.5]; } });
    },
    // The two back walls, drawn by the engine so a map can cut them down.
    // o: { h, left, right: inside face colors (false: no wall on that side),
    //      cap: the top edge, cut: the top edge when cut down (a dark section line),
    //      dotsL, dotsR, densL, densR: halftone on the faces,
    //      doors: [{ side: 'left' | 'right', at, w, h }] (at: the door's middle along the wall) }
    walls: (o = {}) => {
      zone.walls = {
        h: o.h ?? h,
        left: o.left ?? C.white,
        right: o.right ?? C.greyLight,
        cap: o.cap || C.paper,
        cut: o.cut || C.ink,
        dotsL: o.dotsL, dotsR: o.dotsR, densL: o.densL, densR: o.densR,
      };
      zone.doors = (o.doors || []).map((dd) => ({ side: dd.side, at: dd.at, w: dd.w ?? 2.2, h: dd.h ?? 3.6, id: dd.id }));
      add('wall', (ctx) => drawWalls(ctx, zone)).walls = true;
    },
    // A light that glows, even through the dark. o: { at: [x, y, z] or (t) => [x, y, z],
    // r: reach in units, color, k: (t) => strength 0..1, draw(ctx, t, k): the flame or bulb }
    light: (o) => add('light', (ctx, t) => {
      const [x, y, z] = typeof o.at === 'function' ? o.at(t) : o.at;
      const k = o.k ? o.k(t) : 1;
      glow(ctx, x, y, z, o.r ?? 2.5, o.color || C.butter, k);
      if (o.draw) o.draw(ctx, t, k);
    }, { anim: true }),
    // How dark the room is: fn(t) returns 0 (lit) to 1 (pitch black).
    dark: (fn, o = {}) => add('dark', (ctx, t) => darken(ctx, zone, fn(t), o.color || C.night), { anim: true }),
  };

  def.build(R);

  // Everyone on the map's timeline, drawn here while they're standing in this zone.
  for (const wk of place.walkers || []) {
    R.mover((t) => {
      const p = wk.at(t);
      if (!inside(zone, p.x, p.y, p.z || 0)) return OUT;
      return { ...p, x: p.x - ox, y: p.y - oy, z: (p.z || 0) - oz };
    }, (ctx, t, p) => { if (p !== OUT) wk.draw(ctx, t, p, wk); }, { bias: wk.bias || 0 });
  }

  items.sort((a, b) => a.layer - b.layer || a.order - b.order);
  zone.anim = items.filter((it) => it.anim);
  return zone;
}

const OUT = { x: -1e4, y: -1e4, out: true };

// Is the world point (x, y, z) inside the zone? Floors count from their own
// height up to the next floor (span), so each point is in one zone at most.
export function inside(zone, x, y, z) {
  return x >= zone.ox && x < zone.ox + zone.w && y >= zone.oy && y < zone.oy + zone.d &&
    z >= zone.oz - 0.01 && z < zone.oz + zone.span - 0.01;
}

// ---------- Walls ----------
// How tall a wall is right now: full height, or on its way down to waist height.
export function wallHeight(zone, side) {
  const o = zone.walls;
  if (!o || o[side] === false) return 0;
  if (zone.low == null || !zone.inner[side]) return o.h;
  return zone.low + (o.h - zone.low) * zone.wallK;
}

function drawWalls(ctx, zone) {
  const o = zone.walls;
  const hl = wallHeight(zone, 'left'), hr = wallHeight(zone, 'right');
  const H = Math.max(hl, hr);
  // The corner post, behind both walls; it takes the taller wall's height.
  if (H > 0) {
    const faceL = o.left === false ? shade(o.right, 0.3) : o.left;
    const faceR = o.right === false ? shade(o.left, 0.3) : o.right;
    box(ctx, -WALL_T, -WALL_T, 0, WALL_T, WALL_T, H, faceL, { left: faceR, right: faceL, top: H < o.h - 0.01 ? o.cut : o.cap, flat: true });
  }
  if (hr > 0) wallRun(ctx, 'right', o, hr, zone.doors);
  if (hl > 0) wallRun(ctx, 'left', o, hl, zone.doors);
}

// One wall, H tall, in pieces around its doors (with a lintel over each).
function wallRun(ctx, side, o, H, doors) {
  const face = o[side];
  const top = H < o.h - 0.01 ? o.cut : o.cap;
  const dotsC = side === 'left' ? o.dotsL : o.dotsR;
  const dens = (side === 'left' ? o.densL : o.densR) ?? 0.25;
  const piece = (u0, u1, z0, z1) => {
    if (u1 - u0 < 0.01 || z1 - z0 < 0.01) return;
    if (side === 'left') {
      box(ctx, -WALL_T, u0, z0, WALL_T, u1 - u0, z1 - z0, face, { right: face, left: shade(face, 0.3), top, flat: true });
      if (dotsC) onLeft(ctx, u0, z0, u1 - u0, z1 - z0, null, { dots: dotsC, density: dens, stroke: false });
    } else {
      box(ctx, u0, -WALL_T, z0, u1 - u0, WALL_T, z1 - z0, face, { left: face, right: shade(face, 0.3), top, flat: true });
      if (dotsC) onRight(ctx, u0, z0, u1 - u0, z1 - z0, null, { dots: dotsC, density: dens, stroke: false });
    }
  };
  const gaps = doors.filter((dd) => dd.side === side).map((dd) => [dd.at - dd.w / 2, dd.at + dd.w / 2, dd.h]).sort((a, b) => a[0] - b[0]);
  let u = 0;
  for (const [a, b, dh] of gaps) {
    piece(u, a, 0, H);
    piece(a, b, Math.min(dh, H), H); // lintel
    u = b;
  }
  piece(u, S, 0, H);
}

// The shape of the walls as they stand now, for cutting off what's painted on
// them. Null when nothing is cut down.
function wallClip(zone) {
  const o = zone.walls;
  if (!o || zone.low == null) return null;
  const hl = wallHeight(zone, 'left'), hr = wallHeight(zone, 'right');
  if ((o.left === false || hl >= o.h - 0.01) && (o.right === false || hr >= o.h - 0.01)) return null;
  const key = hl.toFixed(3) + '|' + hr.toFixed(3);
  if (zone.clipKey === key) return zone.clipPath;
  const p = new Path2D();
  if (hl > 0) quad(p, [[0, -0.6, -0.3], [0, S + 0.6, -0.3], [0, S + 0.6, hl], [0, -0.6, hl]]);
  if (hr > 0) quad(p, [[-0.6, 0, -0.3], [S + 0.6, 0, -0.3], [S + 0.6, 0, hr], [-0.6, 0, hr]]);
  zone.clipKey = key;
  zone.clipPath = p;
  return p;
}

// Add a 3D quad to a path, always wound the same way on screen, so several
// quads in one path add up (nonzero) instead of cancelling where they overlap.
function quad(path, pts) {
  const s = pts.map(([x, y, z]) => [x - y, (x + y) / 2 - z * ZK]);
  let area = 0;
  for (let i = 0; i < s.length; i++) {
    const [ax, ay] = s[i], [bx, by] = s[(i + 1) % s.length];
    area += ax * by - bx * ay;
  }
  if (area < 0) s.reverse();
  s.forEach(([X, Y], i) => (i ? path.lineTo(X, Y) : path.moveTo(X, Y)));
  path.closePath();
}

// ---------- Darkness ----------
// The room's outline: floor, slab and back walls at full height.
function roomPath(zone) {
  if (zone.roomPath) return zone.roomPath;
  const H = (zone.walls ? zone.walls.h : zone.h) + 0.2;
  const t0 = -WALL_T - 0.05;
  const p = new Path2D();
  quad(p, [[t0, zone.d, H], [t0, t0, H], [zone.w, t0, H], [zone.w, t0, -SLAB], [zone.w, zone.d, -SLAB], [t0, zone.d, -SLAB]]);
  zone.roomPath = p;
  return p;
}

function darken(ctx, zone, k, color) {
  if (!(k > 0.002)) return;
  ctx.save();
  ctx.fillStyle = alpha(color, Math.min(0.92, k * 0.85));
  if (Q.own) {
    // In the zone's own picture, darken only what the zone drew.
    ctx.globalCompositeOperation = 'source-atop';
    const b = zone.bounds;
    ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
  } else {
    ctx.fill(roomPath(zone));
  }
  ctx.restore();
}

// ---------- Drawing ----------
const depthOf = (it, t) => (typeof it.depth === 'function' ? it.depth(t) : it.depth);

function drawThings(ctx, list, t) {
  const keyed = list.map((it) => [depthOf(it, t), it.order, it]);
  keyed.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  for (const k of keyed) k[2].draw(ctx, t);
}

// Draw the items pick(it) says yes to, in layer order, with things depth
// sorted and anything painted on cut-down walls cut off with them.
function drawItems(ctx, zone, t, pick) {
  const clip = wallClip(zone);
  let things = [];
  let clipping = false;
  for (let i = 0; i < zone.items.length; i++) {
    const it = zone.items[i];
    if (!pick(it)) continue;
    if (it.layer === THING) { things.push(it); continue; }
    if (it.layer > THING && things) {
      if (clipping) { ctx.restore(); clipping = false; }
      drawThings(ctx, things, t);
      things = null;
    }
    const cut = !!clip && (it.layer === WALL_L || it.layer === DECOR_L) && !it.walls;
    if (cut !== clipping) {
      if (cut) { ctx.save(); ctx.clip(clip); } else ctx.restore();
      clipping = cut;
    }
    it.draw(ctx, t);
  }
  if (clipping) ctx.restore();
  if (things) drawThings(ctx, things, t);
}

const all = () => true;
const notBaked = (it) => !it.backdrop;
const baked = (it) => it.backdrop;

// Full-quality vector draw (used when zoomed in). `skipBackdrop` skips items
// already drawn into a cached backdrop.
export function drawZoneVector(ctx, zone, t, skipBackdrop = false) {
  drawItems(ctx, zone, t, skipBackdrop ? notBaked : all);
}

// Draw into an offscreen canvas covering the zone's bounds at `scale` device px per unit.
function paintInto(zone, key, scale, dpr, draw) {
  const b = zone.bounds;
  const w = Math.ceil((b.x1 - b.x0) * scale);
  const h = Math.ceil((b.y1 - b.y0) * scale);
  let cv = zone[key];
  if (!cv) cv = zone[key] = document.createElement('canvas');
  if (cv.width !== w || cv.height !== h) {
    cv.width = w;
    cv.height = h;
  }
  const g = cv.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, w, h);
  g.setTransform(scale, 0, 0, scale, -b.x0 * scale, -b.y0 * scale);
  setScreen(scale, dpr);
  Q.own = true;
  draw(g);
  Q.own = false;
}

// Snapshot: the whole zone (moving parts included) at time t, rendered into a
// bitmap. Zones you aren't looking at are shown as snapshots that refresh a
// few at a time, which keeps a whole map moving smoothly.
export function snapshotZone(zone, scale, t, dpr) {
  paintInto(zone, 'snap', scale, dpr, (g) => {
    Q.lines = scale > 6;
    Q.detail = scale > 4.5;
    drawZoneVector(g, zone, t);
    Q.lines = true;
    Q.detail = true;
  });
  zone.snapScale = scale;
  zone.snapT = t;
  zone.stale = false;
}

export function drawSnapshot(ctx, zone) {
  const b = zone.bounds;
  ctx.drawImage(zone.snap, b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
}

// Backdrop for the zone you're in: every static floor, wall, decor and rug item.
// Those layers sit behind everything that stands up, so caching them keeps depth
// order; animated items in the same layers are drawn on top of the cache.
export function bakeBackdrop(zone, scale, dpr) {
  for (const it of zone.items) it.backdrop = it.layer < THING && !it.anim;
  paintInto(zone, 'backdrop', scale, dpr, (g) => drawItems(g, zone, 0, baked));
  zone.backdropScale = scale;
  zone.backdropWallK = zone.wallK;
}

export function drawBackdrop(ctx, zone) {
  const b = zone.bounds;
  ctx.drawImage(zone.backdrop, b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
}

export function dropBackdrop(zone) {
  if (zone.backdrop) {
    zone.backdrop.width = zone.backdrop.height = 0;
    zone.backdrop = null;
    zone.backdropScale = 0;
  }
}

// Let go of a snapshot's memory (for zones far off screen, or a map being closed).
export function dropSnapshot(zone) {
  if (zone.snap) {
    zone.snap.width = zone.snap.height = 0;
    zone.snap = null;
    zone.snapScale = 0;
  }
}

export function findPos(f, t) {
  return typeof f.at === 'function' ? f.at(t) : f.at;
}
