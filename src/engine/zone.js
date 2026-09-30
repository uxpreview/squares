// Turns a zone definition into a list of drawable items, and renders it.
// A zone is one patch of a map, S x S unless it says otherwise: a room on the
// block, a floor of a building, a stretch of street.
//
// A zone module exports:
//   export default {
//     id: 'pool', name: 'Rooftop Pool', blurb: 'One line of story.',
//     size: [w, d],      // optional: its floor along x and y (default S x S)
//     shape: [[x0, y0, x1, y1], ...],  // or, optional: a floor that isn't one box
//     home: [x, y],      // optional, a long area: where to frame it by default
//     build(R) { ... }   // R is the builder below
//   }
//
// Areas, not boxes: a zone can be any size (a long street, a wide square),
// and it's drawn in chunks, S x S at most, each one sorted into the map's draw
// order on its own. So a street that wraps round a room is drawn behind the
// room where it runs behind it and in front where it runs in front, and people
// can walk the length of it. You draw the zone in its own units as one piece;
// the engine does the splitting (see "Chunks" below). Keep anything wide and
// tall a unit or so clear of the seams (every S units along x and y).
//
// Layers, drawn in this order:
//   floor  - slab, floor, floor patterns
//   wall   - the back walls
//   decor  - things flat on the walls (windows, posters, signs)
//   rug    - things flat on the floor (rugs, water, shadows, painted lines)
//   thing  - everything that stands up; depth-sorted back to front by x + y
//   dark   - the room's darkness when the lights go out (R.dark)
//   light  - glows from lamps, candles and fires (R.light); they shine through the dark
//   shell  - the zone's outside (R.shell): a house's front, porches and roof,
//            over everything in it while you're not in it; it fades away when
//            you step in (a building seen from outside, opened like a dollhouse)
//   air    - drawn last, over everything (rain, snow, light beams, smoke)
//
// Every draw function receives (ctx, t) with ctx already positioned at the
// zone's back corner, in zone units. Items marked { anim: true } are redrawn
// each frame. An item can also fade: { fade: (t) => 0..1 } draws a still
// picture (cached like any other) at that opacity, and skips it at 0, so a
// street can print its night over its day for the cost of a stamp. The rest must look the same at every t: in the zone you're in,
// they're drawn once into cached pictures (the floor and walls in one, each
// standing thing in its own, see "Still things" below) and stamped back.
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
import { footprint } from './footprint.js';
import { C, Q, setScreen, goose as drawGoose, box, onLeft, onRight, shade, alpha, glow } from './art.js';

const LAYERS = ['floor', 'wall', 'decor', 'rug', 'thing', 'dark', 'light', 'shell', 'air'];
const WALL_L = 1, DECOR_L = 2, RUG_L = 3, THING = 4, SHELL_L = 7;
export const WALL_T = 0.45; // wall thickness, the same as art.js walls()

// def: the zone module. place: where the map puts it.
//   place.at:     [x, y, z] of the zone's back corner in world units
//   place.tag:    short label shown above its name ("Unit 1A", "Floor 3")
//   place.h:      wall height, for framing and cutaways (default WALL)
//   place.span:   how much height counts as inside it, for walkers (default h + SLAB)
//   place.fixed:  outdoors; storeys never lift or dim it
//   place.size:   [w, d], if the map sizes it rather than the zone (default def.size, or S x S)
//   place.shape:  a list of [x0, y0, x1, y1] boxes, in its own units, for a
//                 zone that isn't one box (an L of street); default def.shape
//   place.doors:  doors the map cuts in the zone's walls, as in R.walls (so a
//                 room can sit on two maps, with a door only on one of them)
//   place.walkers: people on the map's timeline (added by buildWorld)
//   place.reach:  how far past its corners its picture goes (default 1.5): more
//                 for a room with things standing outside it (a street front)
//   place.opts:   anything the map wants to tell the zone (R.opts), so a
//                 zone file shared by two maps can draw differently on one
//   place.land:   the map's ground with height and its water (terrain.js),
//                 given by buildWorld to every zone of a map with a land;
//                 false for a zone that stands on the land without printing it
//                 or being shaped by it (a house on a map with a shore)
export function buildZone(def, place = {}) {
  const [ox, oy, oz] = [place.at?.[0] ?? 0, place.at?.[1] ?? 0, place.at?.[2] ?? 0];
  const shape = place.shape || def.shape;
  const rects = shape ? shape.map((r) => [...r]) : [[0, 0, ...(place.size || def.size || [S, S])]];
  // Its size is the box around it all (a shape starts at its own 0, 0).
  const w = Math.max(...rects.map((r) => r[2])), d = Math.max(...rects.map((r) => r[3]));
  const h = place.h ?? WALL;
  // Ground with height (terrain.js): its height at a point, in the zone's own
  // units, and how low and high it (and its water) goes, for the zone's
  // picture, its patch of the screen and who counts as standing in it. A
  // zone without it has a flat floor at 0.
  const land = place.land || null;
  const ground = land ? (x, y) => land.h(ox + x, oy + y) - oz : null;
  let lo = 0, hi = 0;
  if (ground) {
    lo = Infinity; hi = -Infinity;
    for (const [x0, y0, x1, y1] of rects) {
      for (let x = x0; x <= x1 + 1e-6; x += Math.min(1, x1 - x0)) {
        for (let y = y0; y <= y1 + 1e-6; y += Math.min(1, y1 - y0)) { const z = ground(x, y); lo = Math.min(lo, z); hi = Math.max(hi, z); }
      }
    }
    hi = Math.max(hi, land.top - oz);
  }
  const base = land ? land.base - oz : -SLAB;
  const zone = {
    def,
    id: def.id,
    name: def.name,
    tag: place.tag || '',
    ox, oy, oz, w, d, h,
    rects, // its floor, as boxes in its own units (one, unless it has a shape)
    home: def.home || null, // a long area: where it's framed when you haven't tapped a spot (its own units)
    ground, lo, hi, base, land,
    span: place.span ?? h + SLAB,
    fixed: !!place.fixed,
    anchor: [isoX(ox, oy), isoY(ox, oy, oz)],
    bounds: zoneBounds(w, d, h, place.reach, land ? { hi, base } : null),
    items: [],
    anim: [],
    finds: [],
    walls: null, // what R.walls asked for
    doors: [], // openings in those walls, in zone units
    inner: { left: false, right: false }, // walls with a room right behind them (set by the world)
    low: null, // waist height for inner walls on maps with walls down (set by the world)
    wallK: 1, // 0 = inner walls down, 1 = up; the renderer animates it
    chunks: [], // what's drawn: one, or several for a zone bigger than S x S (see "Chunks")
    veil: 0, // 0 = fully shown, 1 = lifted out of the way (see cutaway in the renderer)
    lift: 0, // how far up it's drawn right now because of that, in world iso units
    dim: 0, // 0..1, faded back because it's below the zone you're in
    shelled: false, // has an outside (R.shell)
    shellK: 1, // 1 = its outside showing (closed), 0 = gone (you're in it); the renderer animates it
  };
  const { items, finds } = zone;
  let order = 0;
  const add = (layer, draw, o = {}) => {
    const it = { layer: LAYERS.indexOf(layer), draw, depth: o.depth ?? 0, anim: !!o.anim, order: order++ };
    if (o.fade) it.fade = o.fade;
    if (o.on) it.on = o.on;
    if (o.step) it.step = o.step;
    items.push(it);
    return it;
  };

  const R = {
    S,
    // This zone's floor, along x and y (S and S unless it's sized otherwise).
    W: w,
    D: d,
    // Its floor as boxes [x0, y0, x1, y1] (one, unless it has a shape).
    shape: rects,
    // Where this zone sits in the world (x, y, z of its back corner), and
    // whether a world point is inside it. Most zones never need these.
    origin: [ox, oy, oz],
    contains: (x, y, z = oz) => inside(zone, x, y, z),
    // The map's walkers (people on its shared timeline), if a zone wants to
    // react to them. The engine draws them; zones don't have to.
    walkers: place.walkers || [],
    // What the map tells this zone (place.opts), or {}.
    opts: place.opts || {},
    // The ground's height at a point (0 on a flat floor), for standing things
    // on it; and the map's land, if it has one (its water: land.level(t)).
    ground: (x, y) => (ground ? ground(x, y) : 0),
    land,
    floor: (draw, o) => add('floor', draw, o),
    wall: (draw, o) => add('wall', draw, o),
    decor: (draw, o) => add('decor', draw, o),
    rug: (draw, o) => add('rug', draw, o),
    air: (draw, o) => add('air', draw, { anim: true, ...o }),
    // A standing thing whose front-most floor point is near (x, y).
    thing: (x, y, draw, o = {}) => { const it = add('thing', draw, { depth: x + y, ...o }); it.at = [x, y]; return it; },
    // Something that moves. pos(t) returns at least { x, y }. draw(ctx, t, p).
    mover: (pos, draw, o = {}) => {
      let lastT = -1, lastP = null;
      const at = (t) => {
        if (t !== lastT) { lastP = pos(t); lastT = t; }
        return lastP;
      };
      const it = add('thing', (ctx, t) => draw(ctx, t, at(t)), { anim: true, ...o });
      // (p.ahead: someone standing up on something sorts as far forward as
      // its front, not as their feet; a band on a stage.)
      it.depth = o.depth ?? ((t) => { const p = at(t); return p.x + p.y + (o.bias || 0) + (p.ahead || 0); });
      it.pos = at;
      return at;
    },
    // A hidden object to find. at: [x, y, z] or (t) => [x, y, z]. r: tap radius in units.
    // when: (t) => true while it's there to find (under the tide, say, it isn't);
    // note: a word for the list on when to look ("low tide").
    // out: in a zone with an outside (R.shell), a find that's outside it (on a
    // porch), so it can be tapped while the house is closed.
    find: ({ id, label, at, r = 0.9, when, note, out }) => finds.push({ id, label, at, r, ...(when ? { when } : {}), ...(note ? { note } : {}), ...(out ? { out } : {}) }),
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
      zone.doors = [...(o.doors || []), ...(place.doors || [])].map((dd) => ({ side: dd.side, at: dd.at, w: dd.w ?? 2.2, h: dd.h ?? 3.6, id: dd.id }));
      add('wall', (ctx) => drawWalls(ctx, zone)).walls = true;
    },
    // A light that glows, even through the dark. o: { at: [x, y, z] or (t) => [x, y, z],
    // r: reach in units, color, k: (t) => strength 0..1, draw(ctx, t, k): the flame or bulb }
    light: (o) => lit(o, add('light', (ctx, t) => {
      const [x, y, z] = typeof o.at === 'function' ? o.at(t) : o.at;
      const k = o.k ? o.k(t) : 1;
      glow(ctx, x, y, z, o.r ?? 2.5, o.color || C.butter, k);
      if (o.draw) o.draw(ctx, t, k);
    }, { anim: true, on: o.k && !o.draw ? (t) => o.k(t) > 0.002 : null })),
    // The zone's outside, seen from the street: a house's front walls, porches,
    // roof and windows, drawn over everything in it. It shows while you're
    // anywhere but in this zone and fades away when you step in, so a house on
    // the overview is closed and opens like a dollhouse. Still unless o.anim.
    // Finds inside can't be tapped while it's closed (see find's out).
    // o.box: [x0, y0, x1, y1], the floor its outside encloses: standing things
    // outside it (a porch, whoever's out on it) are drawn after the outside,
    // since they stand in front of it.
    shell: (draw, o = {}) => {
      zone.shelled = true;
      if (o.box) zone.shellBox = o.box;
      const it = add('shell', draw, o);
      it.shellOf = zone;
      return it;
    },
    // How dark the room is: fn(t) returns 0 (lit) to 1 (pitch black).
    dark: (fn, o = {}) => add('dark', (ctx, t) => darken(ctx, zone, fn(t), o.color || C.night), { anim: true, on: (t) => fn(t) > 0.002 }),
  };

  // A glow that stays put only needs drawing by the chunks it can reach: its
  // floor spot, out to its reach, and back as far as its height lifts it up
  // the screen (a street has many lamps and many chunks).
  function lit(o, it) {
    if (Array.isArray(o.at) && !o.draw) {
      const [x, y, z] = o.at, r = (o.r ?? 2.5) + 1, up = 2 * Math.max(0, z) * ZK;
      it.area = [x - r - up, y - r - up, x + r, y + r];
    }
    return it;
  }

  def.build(R);

  // Everyone on the map's timeline, drawn here while they're standing in this zone.
  for (const wk of place.walkers || []) {
    R.mover((t) => {
      const p = wk.at(t);
      if (!inside(zone, p.x, p.y, p.z || 0)) return OUT;
      return { ...p, x: p.x - ox, y: p.y - oy, z: (p.z || 0) - oz };
    }, (ctx, t, p) => { if (p !== OUT) wk.draw(ctx, t, p, wk); }, { bias: wk.bias || 0 });
  }

  // A standing thing out behind a back wall (a sign on the street outside a
  // door) is drawn with the room's things, so it would stand over that wall
  // from inside. It shows while the wall is down (on the overview) and hides
  // while it's up.
  for (const it of items) {
    if (it.layer !== THING || it.pos || !it.at) continue;
    const side = it.at[0] < -0.01 ? 'left' : it.at[1] < -0.01 ? 'right' : null;
    if (side) { it.behind = side; it.zone = zone; }
  }

  items.sort((a, b) => a.layer - b.layer || a.order - b.order);
  zone.anim = items.filter((it) => it.anim);
  // The backdrop cache (the zone you're in) takes the flat things that don't
  // move, up to the first one that does: past it, a still one may sit over a
  // moving one (a curtain over a rainy window), so it's stamped in its turn.
  // A flat thing that changes only now and then says so with a step (a
  // number, or anything that compares, for each look it has: the tide's level
  // rounded, the evening's strength): the backdrop takes it anyway, drawn as
  // it is right now, and is baked again whenever a step changes, so it costs
  // a bake now and then instead of a draw every frame. (It's still marked
  // anim, so it's drawn live whenever the backdrop isn't in use.)
  let moving = false;
  for (const it of items) {
    if (it.layer < THING && !it.step && (it.anim || it.fade)) moving = true;
    it.backdrop = it.layer < THING && (!it.anim || !!it.step) && !moving;
  }
  zone.chunks = chunksOf(zone);
  return zone;
}

// ---------- Chunks ----------
// What gets drawn, split from what you visit. A zone up to S x S is one chunk,
// drawn as it always was. A bigger one, or one of any other shape, is cut
// into chunks of S x S at most, each with its own picture, caches and place
// in the draw order. A chunk draws the standing things whose spot is in it
// (and people and movers while they're in it); everything flat (the floor,
// walls, what's on them, rugs) and everything over the top (the dark, glows,
// the air) is drawn by every chunk, cut to the chunk's own patch of the
// screen. The patches fit together without gaps (each tucks about a pixel
// under the one behind it, which hides the seam), so the zone looks drawn in
// one piece. Flat things stay on the zone's floor (and its walls): past its
// edges they're cut off.
export const CHUNK = S;

function chunksOf(zone) {
  const rects = zone.rects;
  const single = rects.length === 1 && rects[0][0] === 0 && rects[0][1] === 0 && zone.w <= CHUNK + 1e-6 && zone.d <= CHUNK + 1e-6;
  if (single) return [chunk(zone, 0, rects[0], zone.items, false)];
  // Every rect, cut on the zone's own S x S grid (so seams line up).
  const parts = [];
  for (const [x0, y0, x1, y1] of rects) {
    for (let x = Math.floor(x0 / CHUNK) * CHUNK; x < x1 - 1e-6; x += CHUNK) {
      for (let y = Math.floor(y0 / CHUNK) * CHUNK; y < y1 - 1e-6; y += CHUNK) {
        const r = [Math.max(x0, x), Math.max(y0, y), Math.min(x1, x + CHUNK), Math.min(y1, y + CHUNK)];
        if (r[2] - r[0] > 1e-6 && r[3] - r[1] > 1e-6) parts.push(r);
      }
    }
  }
  // Which chunk a point belongs to: the one it's in, or the nearest.
  const owner = (x, y) => {
    let best = 0, bd = Infinity;
    for (let i = 0; i < parts.length; i++) {
      const [x0, y0, x1, y1] = parts[i];
      const dx = x < x0 ? x0 - x : x >= x1 ? x - x1 + 1e-9 : 0;
      const dy = y < y0 ? y0 - y : y >= y1 ? y - y1 + 1e-9 : 0;
      const dd = dx * dx + dy * dy;
      if (dd < bd) { bd = dd; best = i; if (!dd) break; }
    }
    return best;
  };
  zone.chunkAt = owner;
  const ownerOf = (it, t) => {
    if (it.ownT !== t) { const p = it.pos(t); it.ownT = t; it.own = owner(p.x, p.y); }
    return it.own;
  };
  return parts.map((rect, i) => {
    const items = [];
    for (const it of zone.items) {
      if (it.layer !== THING) {
        const a = it.area;
        if (!a || (a[0] < rect[2] && a[2] > rect[0] && a[1] < rect[3] && a[3] > rect[1])) items.push(it);
      }
      else if (it.pos) {
        // Something that moves is drawn by the chunk it's in right now (asked
        // once a frame, whichever chunk asks first; the others skip it
        // before sorting).
        const mine = (t) => ownerOf(it, t) === i;
        items.push({ ...it, mine, draw: (ctx, t) => { if (mine(t)) it.draw(ctx, t); } });
      } else if (owner(...(it.at || [0, 0])) === i) items.push(it);
    }
    return chunk(zone, i, rect, items, true);
  });
}

function chunk(zone, index, rect, items, cut) {
  const [x0, y0, x1, y1] = rect;
  const c = {
    zone,
    index,
    rect,
    // Its back corner in world units, for sorting the map's chunks.
    ox: zone.ox + x0,
    oy: zone.oy + y0,
    oz: zone.oz,
    items,
    anim: items.filter((it) => it.anim),
    bounds: cut ? {
      x0: x0 - y1 - 1.5,
      x1: x1 - y0 + 1.5,
      y0: (x0 + y0) / 2 - (zone.h + zone.hi) * ZK - 9,
      y1: (x1 + y1) / 2 + Math.max(SLAB, -zone.base) * ZK + 1.5,
    } : zone.bounds,
    // What its floor-and-walls cache needs to cover: all of it, or for a piece
    // of street (no walls) just its ground, which is all its patch lets through.
    flat: null,
    snap: null,
    snapScale: 0,
    snapT: -1,
    stale: false,
    cell: null,
  };
  if (cut && !zone.walls) c.flat = { ...c.bounds, y0: (x0 + y0) / 2 - (zone.hi + 1.5) * ZK - 1 };
  // Its patch of the screen, remade when the picture's scale moves the seam's
  // tuck (about a pixel and a half) past a thousandth of a unit.
  // which: 'flat' for the floor and what's on it; 'top' for the layers over
  // the things (the dark, glows, the air), which reaches as high as anything
  // in the zone can stand; 'water' for water on ground with height (terrain.js),
  // whose surface stands up over the chunk's back seams.
  if (cut) {
    const keys = {}, paths = {};
    c.cell = (which = 'flat') => {
      const over = Math.min(0.2, 1.5 / (Q.pxPerUnit || 8));
      const k = Math.round(over * 1000);
      if (k !== keys[which]) {
        keys[which] = k;
        paths[which] = zone.ground ? groundCellPath(zone, rect, over, which) : cellPath(zone, rect, over, which === 'top' ? zone.h + 9 : null);
      }
      return paths[which];
    };
  }
  return c;
}

// A chunk's patch of the screen: its floor; a sliver tucked under whatever
// part of the zone is right behind it; above its back edges, where the zone
// ends there, a strip for the walls and everything on them (a zone without
// walls gets a low one); below its front edges, where the zone ends, a strip
// for the slab. Edges are taken in pieces, since a zone of any shape can end
// along part of an edge and carry on along the rest. rise: how high the strip
// above reaches (default: the walls, and a little more).
function cellPath(zone, rect, over, rise = null) {
  const [x0, y0, x1, y1] = rect;
  const e = 1e-3;
  const has = (x, y) => zone.rects.some((r) => x >= r[0] && x < r[2] && y >= r[1] && y < r[3]);
  const up = rise ?? (zone.walls ? zone.walls.h + 9 : 1.5), down = -(SLAB + 1.5);
  // The pieces of [a, b] split wherever a rect of the zone starts or ends.
  const cuts = (a, b, axis) => {
    const at = [a, b];
    for (const r of zone.rects) for (const v of axis ? [r[1], r[3]] : [r[0], r[2]]) if (v > a + e && v < b - e) at.push(v);
    at.sort((p, q) => p - q);
    return at.slice(1).map((v, i) => [at[i], v]);
  };
  const p = new Path2D();
  quad(p, [[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]]);
  // Along the back right edge (y = y0) and the front left (y = y1), in x.
  for (const [a, b] of cuts(x0, x1, 0)) {
    const m = (a + b) / 2;
    const a2 = has(a - e, y0 + e) ? a - over : a; // tuck under the piece before it
    if (has(m, y0 - e)) quad(p, [[a, y0 - over, 0], [b, y0 - over, 0], [b, y0, 0], [a, y0, 0]]);
    else quad(p, [[a2, y0, 0], [b, y0, 0], [b, y0, up], [a2, y0, up]]);
    if (!has(m, y1 + e)) quad(p, [[has(a - e, y1 - e) ? a - over : a, y1, 0], [b, y1, 0], [b, y1, down], [has(a - e, y1 - e) ? a - over : a, y1, down]]);
  }
  // Along the back left edge (x = x0) and the front right (x = x1), in y.
  for (const [a, b] of cuts(y0, y1, 1)) {
    const m = (a + b) / 2;
    const a2 = has(x0 + e, a - e) ? a - over : a;
    if (has(x0 - e, m)) quad(p, [[x0 - over, a, 0], [x0 - over, b, 0], [x0, b, 0], [x0, a, 0]]);
    else quad(p, [[x0, a2, 0], [x0, b, 0], [x0, b, up], [x0, a2, up]]);
    if (!has(x1 + e, m)) quad(p, [[x1, has(x1 - e, a - e) ? a - over : a, 0], [x1, b, 0], [x1, b, down], [x1, has(x1 - e, a - e) ? a - over : a, down]]);
  }
  return p;
}

// The same for a zone with ground (terrain.js): every edge follows the
// ground's height along it (every half unit), the strip over a back edge
// where the zone ends reaches as high as its water can stand (or, for the
// top patch, anything standing on it), and the strip under a front edge
// where it ends goes down past the plate's cut side. The water's patch
// (which: 'water') reaches up over the back edges where the zone carries on
// too: the water's surface stands above the ground there, over the chunk
// behind, so each chunk draws its own water and nobody else's.
function groundCellPath(zone, rect, over, which) {
  const [x0, y0, x1, y1] = rect;
  const e = 1e-3, g = zone.ground;
  const has = (x, y) => zone.rects.some((r) => x >= r[0] && x < r[2] && y >= r[1] && y < r[3]);
  const up = which === 'top' ? zone.hi + zone.h + 9 : zone.hi + 1.5, down = zone.base - 1.5, water = which === 'water';
  const cuts = (a, b, axis) => {
    const at = [a, b];
    for (const r of zone.rects) for (const v of axis ? [r[1], r[3]] : [r[0], r[2]]) if (v > a + e && v < b - e) at.push(v);
    at.sort((p, q) => p - q);
    return at.slice(1).map((v, i) => [at[i], v]);
  };
  const along = (a, b) => {
    const n = Math.max(1, Math.ceil((b - a) / 0.5 - 1e-6)), out = [];
    for (let k = 0; k <= n; k++) out.push(a + ((b - a) * k) / n);
    return out;
  };
  // A band between two runs of points along an edge, as one shape.
  const band = (p, A, B) => quad(p, [...A, ...B.slice().reverse()]);
  const p = new Path2D();
  quad(p, groundRing(zone, rect));
  // Along the back right edge (y = y0) and the front left (y = y1), in x.
  for (const [a, b] of cuts(x0, x1, 0)) {
    const m = (a + b) / 2;
    if (has(m, y0 - e) && !water) {
      const xs = along(a, b);
      band(p, xs.map((x) => [x, y0 - over, g(x, y0 - over)]), xs.map((x) => [x, y0, g(x, y0)]));
    } else {
      const xs = along(has(a - e, y0 + e) ? a - over : a, b);
      band(p, xs.map((x) => [x, y0, g(x, y0)]), xs.map((x) => [x, y0, up]));
    }
    if (!has(m, y1 + e)) {
      const xs = along(has(a - e, y1 - e) ? a - over : a, b);
      band(p, xs.map((x) => [x, y1, g(x, y1)]), xs.map((x) => [x, y1, down]));
    }
  }
  // Along the back left edge (x = x0) and the front right (x = x1), in y.
  for (const [a, b] of cuts(y0, y1, 1)) {
    const m = (a + b) / 2;
    if (has(x0 - e, m) && !water) {
      const ys = along(a, b);
      band(p, ys.map((y) => [x0 - over, y, g(x0 - over, y)]), ys.map((y) => [x0, y, g(x0, y)]));
    } else {
      const ys = along(has(x0 + e, a - e) ? a - over : a, b);
      band(p, ys.map((y) => [x0, y, g(x0, y)]), ys.map((y) => [x0, y, up]));
    }
    if (!has(x1 + e, m)) {
      const ys = along(has(x1 - e, a - e) ? a - over : a, b);
      band(p, ys.map((y) => [x1, y, g(x1, y)]), ys.map((y) => [x1, y, down]));
    }
  }
  return p;
}

// A box of a zone's floor on its ground: the points round its edge, every
// half unit, at the ground's height.
function groundRing(zone, [x0, y0, x1, y1]) {
  const g = zone.ground, pts = [];
  const n = (a, b) => Math.max(1, Math.ceil((b - a) / 0.5 - 1e-6));
  const nx = n(x0, x1), ny = n(y0, y1);
  for (let k = 0; k < nx; k++) { const x = x0 + ((x1 - x0) * k) / nx; pts.push([x, y0, g(x, y0)]); }
  for (let k = 0; k < ny; k++) { const y = y0 + ((y1 - y0) * k) / ny; pts.push([x1, y, g(x1, y)]); }
  for (let k = nx; k > 0; k--) { const x = x0 + ((x1 - x0) * k) / nx; pts.push([x, y1, g(x, y1)]); }
  for (let k = ny; k > 0; k--) { const y = y0 + ((y1 - y0) * k) / ny; pts.push([x0, y, g(x0, y)]); }
  return pts;
}

const OUT = { x: -1e4, y: -1e4, out: true };

// Is the world point (x, y, z) inside the zone? Floors count from their own
// height up to the next floor (span), so each point is in one zone at most.
// On ground with height, from its lowest point (a wader in a creek) up.
export function inside(zone, x, y, z) {
  if (!(x >= zone.ox && x < zone.ox + zone.w && y >= zone.oy && y < zone.oy + zone.d &&
    z >= zone.oz + zone.lo - 0.01 && z < zone.oz + zone.hi + zone.span - 0.01)) return false;
  const r0 = zone.rects[0];
  if (zone.rects.length === 1 && !r0[0] && !r0[1]) return true;
  const lx = x - zone.ox, ly = y - zone.oy;
  return zone.rects.some((r) => lx >= r[0] && lx < r[2] && ly >= r[1] && ly < r[3]);
}

// ---------- Walls ----------
// How tall a wall is right now: full height, or on its way down to waist height.
export function wallHeight(zone, side) {
  const o = zone.walls;
  if (!o || o[side] === false) return 0;
  if (zone.low == null || !zone.inner[side]) return o.h;
  // (A wall lower than waist height, a fence, stays as it is.)
  const low = Math.min(zone.low, o.h);
  return low + (o.h - low) * zone.wallK;
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
  if (hr > 0) wallRun(ctx, 'right', o, hr, zone.doors, zone.w);
  if (hl > 0) wallRun(ctx, 'left', o, hl, zone.doors, zone.d);
}

// One wall, H tall and L long, in pieces around its doors (with a lintel over each).
function wallRun(ctx, side, o, H, doors, L) {
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
  piece(u, L, 0, H);
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
  if (hl > 0) quad(p, [[0, -0.6, -0.3], [0, zone.d + 0.6, -0.3], [0, zone.d + 0.6, hl], [0, -0.6, hl]]);
  if (hr > 0) quad(p, [[-0.6, 0, -0.3], [zone.w + 0.6, 0, -0.3], [zone.w + 0.6, 0, hr], [-0.6, 0, hr]]);
  zone.clipKey = key;
  zone.clipPath = p;
  return p;
}

// Add a 3D quad to a path, always wound the same way on screen, so several
// quads in one path add up (nonzero) instead of cancelling where they overlap.
function quad(path, pts) {
  poly(path, pts.map(([x, y, z]) => [x - y, (x + y) / 2 - z * ZK]));
}

// The same, for a shape already on screen (iso units).
function poly(path, s) {
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
  if (!zone.walls) {
    // Outdoors (a street), only the ground darkens: anything over it would
    // reach up over the rooms behind it too.
    if (!zone.groundPath) {
      zone.groundPath = new Path2D();
      for (const r of zone.rects) {
        const [x0, y0, x1, y1] = r;
        quad(zone.groundPath, zone.ground ? groundRing(zone, r) : [[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]]);
      }
    }
    ctx.fill(zone.groundPath);
  } else if (Q.own) {
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
// The functions below take a piece: one of a zone's chunks (the renderer
// draws those) or a whole zone (tools, to check it draws). Pictures and caches
// belong to the chunk.
const depthOf = (it, t) => (typeof it.depth === 'function' ? it.depth(t) : it.depth);

// Every item starts from the same line ends and corners, whatever the one
// before it left behind, so it looks the same drawn live or from a cache.
function fresh(ctx) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

// Stamp an item from the still-things sheet, if it has a patch there. The
// stamp goes on in device pixels: m keeps the zone's transform meanwhile
// (null while it's in place). Returns the transform to put back, or false if
// the item has no patch and should be drawn.
function stamp(ctx, st, it, m) {
  const spot = st && st.spots[it.order];
  if (!spot) return false;
  if (!m) { m = ctx.getTransform(); ctx.setTransform(1, 0, 0, 1, 0, 0); }
  ctx.drawImage(st.sheet, spot[0], spot[1], spot[4], spot[5], st.X + spot[2], st.Y + spot[3], spot[4], spot[5]);
  return m;
}

// How much of an item shows at t: 0 (skip it), up to 1.
function shown(it, t) {
  if (it.on && !it.on(t)) return 0;
  if (it.shellOf) {
    const k = it.shellOf.shellK;
    if (!(k > 0.002)) return 0;
    if (k < 1) { const f = it.fade ? it.fade(t) : 1; return f > 0.002 ? k * Math.min(1, f) : 0; }
  }
  if (it.behind) {
    const z = it.zone;
    if (z.low != null && z.inner[it.behind] && wallHeight(z, it.behind) > 2.4) return 0;
  }
  if (!it.fade) return 1;
  const a = it.fade(t);
  return a > 0.002 ? Math.min(1, a) : 0;
}

// st: the zone's still things, cached (or null to draw everything live).
function drawThings(ctx, list, t, st) {
  const keyed = [];
  for (const it of list) if (!it.mine || it.mine(t)) keyed.push([depthOf(it, t), it.order, it]);
  keyed.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let m = null; // the zone's transform, while stamping
  for (const k of keyed) {
    const it = k[2];
    const a = shown(it, t);
    if (!a) continue;
    const a0 = ctx.globalAlpha;
    if (a < 1) ctx.globalAlpha = a0 * a;
    const was = stamp(ctx, st, it, m);
    if (was) m = was;
    else {
      if (m) { ctx.setTransform(m); m = null; }
      fresh(ctx);
      it.draw(ctx, t);
    }
    ctx.globalAlpha = a0;
  }
  if (m) ctx.setTransform(m);
}

// Draw the items pick(it) says yes to, in layer order, with things depth
// sorted and anything painted on cut-down walls cut off with them. piece: a
// zone, or one of its chunks (whose flat and top layers are cut to its patch).
function drawItems(ctx, piece, t, pick, st = null) {
  const zone = piece.zone || piece;
  const clip = wallClip(zone);
  let things = [];
  let clipping = false, celled = null;
  // Clip to the chunk's patch for this item (see chunk(): which), or null for none.
  const toCell = (which) => {
    if (!piece.cell || which === celled) return;
    if (clipping) { ctx.restore(); clipping = false; }
    if (celled) ctx.restore();
    if (which) { ctx.save(); ctx.clip(piece.cell(which)); }
    celled = which;
  };
  const cellFor = (it) => (!things ? 'top' : it.layer === RUG_L && zone.ground ? 'water' : 'flat');
  // A building's standing things outside its walls (its porch) go on after
  // its outside, which they stand in front of; the rest before it.
  const box = zone.shellBox;
  const outOf = box ? (it) => {
    const p = it.pos ? it.pos(t) : it.at;
    if (!p) return false;
    const x = p.x ?? p[0], y = p.y ?? p[1];
    return x < box[0] || y < box[1] || x > box[2] || y > box[3];
  } : null;
  let later = null;
  const flush = () => {
    if (clipping) { ctx.restore(); clipping = false; }
    toCell(null);
    if (things) {
      if (outOf) { later = things.filter(outOf); things = things.filter((it) => !outOf(it)); }
      drawThings(ctx, things, t, st);
      things = null;
    }
  };
  for (let i = 0; i < piece.items.length; i++) {
    const it = piece.items[i];
    if (!pick(it)) continue;
    if (it.layer === THING) { things.push(it); continue; }
    const a = shown(it, t);
    if (!a) continue;
    if (it.layer > THING && things) flush();
    if (it.layer > SHELL_L && later) { flush(); drawThings(ctx, later, t, st); later = null; }
    toCell(cellFor(it));
    const cut = !!clip && (it.layer === WALL_L || it.layer === DECOR_L) && !it.walls;
    if (cut !== clipping) {
      if (cut) { ctx.save(); ctx.clip(clip); } else ctx.restore();
      clipping = cut;
    }
    const a0 = ctx.globalAlpha;
    if (a < 1) ctx.globalAlpha = a0 * a;
    const m = !clip && stamp(ctx, st, it, null);
    if (m) ctx.setTransform(m);
    else {
      fresh(ctx);
      it.draw(ctx, t);
    }
    ctx.globalAlpha = a0;
  }
  if (clipping) ctx.restore();
  clipping = false;
  toCell(null);
  if (things) flush();
  if (later) drawThings(ctx, later, t, st);
}

const all = () => true;
const notBaked = (it) => !it.backdrop;
const baked = (it) => it.backdrop;

// Full-quality vector draw (used when zoomed in). `skipBackdrop` skips items
// already drawn into a cached backdrop; `st` stamps still things from their
// cache (stillsFor) instead of drawing them.
export function drawZoneVector(ctx, zone, t, skipBackdrop = false, st = null) {
  drawItems(ctx, zone, t, skipBackdrop ? notBaked : all, st);
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
// order; animated items in the same layers are drawn on top of the cache. Like
// still things (below), it's drawn at the fraction of a pixel it's stamped at.
// The steps of the backdrop's items at t, as one key (see "step" in build).
function stepKey(zone, t) {
  const list = zone.steps || (zone.steps = zone.items.filter((it) => it.backdrop && it.step));
  if (!list.length) return '';
  let key = '';
  for (const it of list) key += it.step(t) + '|';
  return key;
}

function bakeBackdrop(zone, k, fx, fy, dpr, t = 0) {
  const b = zone.flat || zone.bounds;
  const sx = Math.floor(b.x0 * k + fx), sy = Math.floor(b.y0 * k + fy);
  const w = Math.ceil(b.x1 * k + fx) - sx, h = Math.ceil(b.y1 * k + fy) - sy;
  let cv = zone.backdrop;
  if (!cv) cv = zone.backdrop = document.createElement('canvas');
  if (cv.width !== w || cv.height !== h) {
    cv.width = w;
    cv.height = h;
  }
  const g = cv.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, w, h);
  g.setTransform(k, 0, 0, k, fx - sx, fy - sy);
  setScreen(k, dpr);
  // Drawn at t when anything in it has steps (as it is now); otherwise at 0,
  // as it always was. (One picture, baked whole: what costs on a slow
  // graphics chip is how much gets painted each frame, so one stamp beats a
  // stamp and a layer over it.)
  const key = stepKey(zone, t);
  drawItems(g, zone, key ? t : 0, baked);
  zone.bd = { k, fx, fy, sx, sy, wallK: (zone.zone || zone).wallK, lines: Q.lines, detail: Q.detail, X: 0, Y: 0, key };
}

// Where ctx (positioned at the zone's corner, k device px per unit) puts the
// zone on whole device pixels, and the fraction of a pixel left over; null if
// it's turned or faded, which a stamp can't match.
function pixelSpot(ctx, k) {
  const m = ctx.getTransform();
  // (The canvas keeps its transform in single precision.)
  if (Math.abs(m.b) > 1e-6 || Math.abs(m.c) > 1e-6 || Math.abs(m.a - k) > k * 1e-5 || Math.abs(m.d - k) > k * 1e-5 || ctx.globalAlpha < 1) return null;
  const X = Math.floor(m.e), Y = Math.floor(m.f);
  return { X, Y, fx: m.e - X, fy: m.f - Y };
}
const moved = (c, k, p) => !c || c.k !== k || Math.abs(c.fx - p.fx) > 1e-3 || Math.abs(c.fy - p.fy) > 1e-3 || c.lines !== Q.lines || c.detail !== Q.detail;

// Whether the backdrop can be stamped this frame (baking it if the scale, the
// fraction of a pixel or the walls have changed). Only while the camera is
// still, and not while inside walls are on their way up or down.
export function backdropFor(ctx, zone, k, dpr, t = 0) {
  const wallK = (zone.zone || zone).wallK;
  if (wallK !== 0 && wallK !== 1) return false;
  const p = pixelSpot(ctx, k);
  if (!p) return false;
  if (moved(zone.bd, k, p) || zone.bd.wallK !== wallK || zone.bd.key !== stepKey(zone, t)) {
    bakeBackdrop(zone, k, p.fx, p.fy, dpr, t);
    setScreen(k, dpr);
  }
  zone.bd.X = p.X;
  zone.bd.Y = p.Y;
  return true;
}

export function drawBackdrop(ctx, zone) {
  const { X, Y, sx, sy } = zone.bd;
  const m = ctx.getTransform();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(zone.backdrop, X + sx, Y + sy);
  ctx.setTransform(m);
}

export function dropBackdrop(zone) {
  if (zone.backdrop) {
    zone.backdrop.width = zone.backdrop.height = 0;
    zone.backdrop = null;
    zone.bd = null;
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

// ---------- Still things ----------
// In the zone you're in, every standing thing that doesn't move (no anim) is
// drawn once into a sheet, each in its own patch, and stamped back every frame
// in its place in the depth order, between the people walking around it (and
// so is any still flat thing the backdrop can't take). So the room only draws
// what moves. Stamps land on whole device pixels, at the
// same fraction of a pixel they were drawn at, so they match drawing live.
//
// First each thing's footprint is measured (once per zone, a few things a
// frame, with a stand-in canvas: see footprint.js). Things it can't measure,
// like glows screened over what's under them, stay live.
const FIND_MS = 3; // time per frame for measuring
const SHEET_W = 2048; // px, the sheet's width
const SHEET_MAX = 6e6; // px, its most area (anything past it stays live)

function measureStills(zone, budget) {
  const ms = zone.stillsMeasure || (zone.stillsMeasure = { next: 0, boxes: [] });
  const list = zone.items;
  if (ms.next >= list.length) return true;
  const q = { lines: Q.lines, detail: Q.detail, px: Q.pxPerUnit };
  const end = performance.now() + budget;
  while (ms.next < list.length && performance.now() < end) {
    const it = list[ms.next++];
    if (it.layer > THING || it.anim || it.backdrop || it.walls) continue;
    // In full detail and at low detail (some things draw differently far
    // out), with words showing: the footprint covers every way it draws.
    let box = null;
    try {
      for (const detail of [true, false]) {
        const g = footprint();
        Q.detail = Q.lines = detail;
        Q.pxPerUnit = 64;
        fresh(g);
        it.draw(g, 0);
        const r = g.box;
        if (r) box = box ? [Math.min(box[0], r[0]), Math.min(box[1], r[1]), Math.max(box[2], r[2]), Math.max(box[3], r[3])] : r;
      }
    } catch { box = null; }
    if (box) ms.boxes[it.order] = box;
  }
  Q.lines = q.lines;
  Q.detail = q.detail;
  Q.pxPerUnit = q.px;
  return ms.next >= list.length;
}

// Draw every still thing into the sheet, at k device px per unit, with the
// zone's corner at the fraction (fx, fy) of a device pixel.
function bakeStills(zone, k, fx, fy, dpr) {
  const boxes = zone.stillsMeasure.boxes;
  // Each thing's patch in device pixels, from the zone's corner (rounded down).
  const want = [];
  for (const it of zone.items) {
    const bx = boxes[it.order];
    if (!bx) continue;
    // (A pixel to spare all round, for the soft edges.)
    const sx = Math.floor(bx[0] * k + fx) - 1, sy = Math.floor(bx[1] * k + fy) - 1;
    want.push({ it, sx, sy, w: Math.ceil(bx[2] * k + fx) + 1 - sx, h: Math.ceil(bx[3] * k + fy) + 1 - sy });
  }
  // Shelves, tallest first.
  want.sort((a, b) => b.h - a.h);
  const spots = [];
  let x = 0, y = 0, shelf = 0, area = 0;
  const placed = [];
  for (const p of want) {
    if (p.w > SHEET_W) continue;
    if (x + p.w > SHEET_W) { x = 0; y += shelf; shelf = 0; }
    if ((y + p.h) * SHEET_W > SHEET_MAX) break;
    placed.push([p, x, y]);
    spots[p.it.order] = [x, y, p.sx, p.sy, p.w, p.h];
    x += p.w;
    shelf = Math.max(shelf, p.h);
    area += p.w * p.h;
  }
  const H = y + shelf;
  let cv = zone.stills && zone.stills.sheet;
  if (!cv) cv = document.createElement('canvas');
  if (cv.width !== SHEET_W || cv.height !== H) {
    cv.width = SHEET_W;
    cv.height = H;
  }
  const g = cv.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, cv.width, cv.height);
  setScreen(k, dpr);
  for (const [p, ax, ay] of placed) {
    g.save();
    g.beginPath();
    g.rect(ax, ay, p.w, p.h);
    g.clip();
    g.setTransform(k, 0, 0, k, ax - p.sx + fx, ay - p.sy + fy);
    fresh(g);
    p.it.draw(g, 0);
    g.restore();
  }
  zone.stills = { sheet: cv, spots, k, fx, fy, lines: Q.lines, detail: Q.detail, X: 0, Y: 0, area };
}

// The zone's still things, ready to stamp with ctx as it stands (positioned at
// the zone's corner, k device px per unit), or null to draw them live this
// frame (still finding footprints, or ctx turned or faded). Bakes the sheet
// when the scale or the fraction of a pixel has changed: call it only while
// the camera is still.
export function stillsFor(ctx, zone, k, dpr) {
  const p = pixelSpot(ctx, k);
  if (!p) return null;
  const ready = measureStills(zone, FIND_MS);
  setScreen(k, dpr);
  if (!ready) return null;
  if (moved(zone.stills, k, p)) {
    bakeStills(zone, k, p.fx, p.fy, dpr);
    setScreen(k, dpr);
  }
  zone.stills.X = p.X;
  zone.stills.Y = p.Y;
  return zone.stills;
}

export function dropStills(zone) {
  if (zone.stills) {
    zone.stills.sheet.width = zone.stills.sheet.height = 0;
    zone.stills = null;
  }
}

export function findPos(f, t) {
  return typeof f.at === 'function' ? f.at(t) : f.at;
}
