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
//   air    - drawn last, over everything (rain, snow, light beams, smoke)
//
// Every draw function receives (ctx, t) with ctx already positioned at the
// zone's back corner, in zone units. Items marked { anim: true } are redrawn
// each frame; the rest are baked into a cached picture when zoomed out.

import { S, WALL, isoX, isoY, zoneBounds } from './iso.js';
import { Q, setScreen, goose as drawGoose } from './art.js';

const LAYERS = ['floor', 'wall', 'decor', 'rug', 'thing', 'air'];

// def: the zone module. place: where the map puts it.
//   place.at:  [x, y, z] of the zone's back corner in world units
//   place.tag: short label shown above its name ("Unit 1A", "Floor 3")
//   place.h:   wall height, for framing and cutaways (default WALL)
export function buildZone(def, place = {}) {
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

  const [ox, oy, oz] = [place.at?.[0] ?? 0, place.at?.[1] ?? 0, place.at?.[2] ?? 0];
  const w = S, d = S, h = place.h ?? WALL;
  return {
    def,
    id: def.id,
    name: def.name,
    tag: place.tag || '',
    ox, oy, oz, w, d, h,
    anchor: [isoX(ox, oy), isoY(ox, oy, oz)],
    bounds: zoneBounds(w, d, h),
    items,
    anim: items.filter((it) => it.anim),
    finds,
    snap: null,
    snapScale: 0,
    snapT: -1,
    veil: 0, // 0 = fully shown, 1 = lifted out of the way (see cutaway in the renderer)
    lift: 0, // how far up it's drawn right now because of that, in world iso units
  };
}

const depthOf = (it, t) => (typeof it.depth === 'function' ? it.depth(t) : it.depth);

function drawThings(ctx, list, t) {
  const keyed = list.map((it) => [depthOf(it, t), it.order, it]);
  keyed.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  for (const k of keyed) k[2].draw(ctx, t);
}

// Full-quality vector draw (used when zoomed in). `skipBackdrop` skips items
// already drawn into a cached backdrop.
export function drawZoneVector(ctx, zone, t, skipBackdrop = false) {
  let things = [];
  for (let i = 0; i < zone.items.length; i++) {
    const it = zone.items[i];
    if (skipBackdrop && it.backdrop) continue;
    if (it.layer === 4) { things.push(it); continue; }
    if (it.layer === 5 && things) { drawThings(ctx, things, t); things = null; }
    it.draw(ctx, t);
  }
  if (things) drawThings(ctx, things, t);
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
  draw(g);
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
}

export function drawSnapshot(ctx, zone) {
  const b = zone.bounds;
  ctx.drawImage(zone.snap, b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
}

// Backdrop for the zone you're in: every static floor, wall, decor and rug item.
// Those layers sit behind everything that stands up, so caching them keeps depth
// order; animated items in the same layers are drawn on top of the cache.
export function bakeBackdrop(zone, scale, dpr) {
  for (const it of zone.items) it.backdrop = it.layer < 4 && !it.anim;
  paintInto(zone, 'backdrop', scale, dpr, (g) => {
    for (const it of zone.items) if (it.backdrop) it.draw(g, 0);
  });
  zone.backdropScale = scale;
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
