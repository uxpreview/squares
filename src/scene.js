// Turns a room definition into a list of drawable items, and renders it.
//
// A room module exports:
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
//   air    - drawn last, over everything (rain, snow, light beams, smoke)
//
// Every draw function receives (ctx, t) with ctx already positioned at the
// room's back corner, in room units. Items marked { anim: true } are redrawn
// each frame; the rest are baked into a cached picture when zoomed out.

import { S, ROOM_BOUNDS, PITCH, isoX, isoY } from './iso.js';
import { Q, setScreen, goose as drawGoose, C } from './art.js';

const LAYERS = ['floor', 'wall', 'decor', 'rug', 'thing', 'air'];

export function buildRoom(def, col, row) {
  const items = [];
  const finds = [];
  let order = 0;
  const add = (layer, draw, o = {}) => {
    const it = { layer: LAYERS.indexOf(layer), draw, depth: o.depth ?? 0, anim: !!o.anim, order: order++ };
    items.push(it);
    return it;
  };

  const R = {
    S,
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
  };

  def.build(R);
  items.sort((a, b) => a.layer - b.layer || a.order - b.order);

  return {
    def,
    id: def.id,
    col,
    row,
    ox: col * PITCH,
    oy: row * PITCH,
    items,
    finds,
    snap: null,
    snapScale: 0,
    snapT: -1,
  };
}

// Anchor of a room in world iso space (its back corner).
export const roomAnchor = (room) => [isoX(room.ox, room.oy), isoY(room.ox, room.oy)];

const depthOf = (it, t) => (typeof it.depth === 'function' ? it.depth(t) : it.depth);

function drawThings(ctx, list, t) {
  const keyed = list.map((it) => [depthOf(it, t), it.order, it]);
  keyed.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  for (const k of keyed) k[2].draw(ctx, t);
}

// Full-quality vector draw (used when zoomed in). `from` skips items already
// drawn into a cached backdrop.
export function drawRoomVector(ctx, room, t, skipBackdrop = false) {
  let things = [];
  for (let i = 0; i < room.items.length; i++) {
    const it = room.items[i];
    if (skipBackdrop && it.backdrop) continue;
    if (it.layer === 4) { things.push(it); continue; }
    if (it.layer === 5 && things) { drawThings(ctx, things, t); things = null; }
    it.draw(ctx, t);
  }
  if (things) drawThings(ctx, things, t);
}

// Snapshot: the whole room (moving parts included) at time t, rendered into a
// bitmap at `scale` device px per unit. Rooms you aren't looking at are shown as
// snapshots that refresh a few at a time, which keeps the full block smooth.
export function snapshotRoom(room, scale, t, dpr) {
  const b = ROOM_BOUNDS;
  const w = Math.ceil((b.x1 - b.x0) * scale);
  const h = Math.ceil((b.y1 - b.y0) * scale);
  let cv = room.snap;
  if (!cv) cv = room.snap = document.createElement('canvas');
  if (cv.width !== w || cv.height !== h) {
    cv.width = w;
    cv.height = h;
  }
  const g = cv.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, w, h);
  g.setTransform(scale, 0, 0, scale, -b.x0 * scale, -b.y0 * scale);
  setScreen(scale, dpr);
  Q.lines = scale > 6;
  Q.detail = scale > 4.5;
  drawRoomVector(g, room, t);
  Q.lines = true;
  Q.detail = true;
  room.snapScale = scale;
  room.snapT = t;
}

export function drawSnapshot(ctx, room) {
  const b = ROOM_BOUNDS;
  ctx.drawImage(room.snap, b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
}

// Backdrop for the room you're in: every static floor, wall, decor and rug item.
// Those layers sit behind everything that stands up, so caching them keeps depth
// order; animated items in the same layers are drawn on top of the cache.
export function bakeBackdrop(room, scale, dpr) {
  for (const it of room.items) it.backdrop = it.layer < 4 && !it.anim;
  const b = ROOM_BOUNDS;
  const w = Math.ceil((b.x1 - b.x0) * scale);
  const h = Math.ceil((b.y1 - b.y0) * scale);
  const cv = room.backdrop || (room.backdrop = document.createElement('canvas'));
  if (cv.width !== w || cv.height !== h) {
    cv.width = w;
    cv.height = h;
  }
  const g = cv.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, w, h);
  g.setTransform(scale, 0, 0, scale, -b.x0 * scale, -b.y0 * scale);
  setScreen(scale, dpr);
  for (const it of room.items) if (it.backdrop) it.draw(g, 0);
  room.backdropScale = scale;
}

export function drawBackdrop(ctx, room) {
  const b = ROOM_BOUNDS;
  ctx.drawImage(room.backdrop, b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
}

export function dropBackdrop(room) {
  if (room.backdrop) {
    room.backdrop.width = room.backdrop.height = 0;
    room.backdrop = null;
    room.backdropScale = 0;
  }
}

// Let go of a snapshot's memory (for rooms far off screen).
export function dropSnapshot(room) {
  if (room.snap) {
    room.snap.width = room.snap.height = 0;
    room.snap = null;
    room.snapScale = 0;
  }
}

export function findPos(f, t) {
  return typeof f.at === 'function' ? f.at(t) : f.at;
}

export { C };
