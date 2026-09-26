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
    cache: null,
    cacheScale: 0,
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

// Full-quality vector draw (used when zoomed in).
export function drawRoomVector(ctx, room, t) {
  let things = [];
  for (const it of room.items) {
    if (it.layer === 4) { things.push(it); continue; }
    if (it.layer === 5 && things) { drawThings(ctx, things, t); things = null; }
    it.draw(ctx, t);
  }
  if (things) drawThings(ctx, things, t);
}

// Bake the static parts of a room into a bitmap at `scale` device px per unit.
export function bakeRoom(room, scale, dpr) {
  const b = ROOM_BOUNDS;
  const w = Math.ceil((b.x1 - b.x0) * scale);
  const h = Math.ceil((b.y1 - b.y0) * scale);
  let cv = room.cache;
  if (!cv || cv.width !== w || cv.height !== h) {
    cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
  }
  const g = cv.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, w, h);
  g.setTransform(scale, 0, 0, scale, -b.x0 * scale, -b.y0 * scale);
  setScreen(scale, dpr);
  Q.lines = scale > 7;
  Q.detail = scale > 5;
  const statics = room.items.filter((it) => !it.anim);
  let things = [];
  for (const it of statics) {
    if (it.layer === 4) { things.push(it); continue; }
    if (it.layer === 5 && things) { drawThings(g, things, 0); things = null; }
    it.draw(g, 0);
  }
  if (things) drawThings(g, things, 0);
  room.cache = cv;
  room.cacheScale = scale;
  Q.lines = true;
  Q.detail = true;
}

// Cached draw: the baked picture plus the moving parts on top.
export function drawRoomCached(ctx, room, t) {
  const b = ROOM_BOUNDS;
  ctx.drawImage(room.cache, b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
  const anim = room.items.filter((it) => it.anim);
  let things = [];
  for (const it of anim) {
    if (it.layer === 4) { things.push(it); continue; }
    if (it.layer === 5 && things) { drawThings(ctx, things, t); things = null; }
    it.draw(ctx, t);
  }
  if (things) drawThings(ctx, things, t);
}

export function findPos(f, t) {
  return typeof f.at === 'function' ? f.at(t) : f.at;
}

export { C };
