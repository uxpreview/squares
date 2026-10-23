// Pitch Day: the level's kit, the pieces every stretch of the top floor shares,
// so six areas drawn by six artists are one office. The greybox draws them as
// blocks; the art draws them for real here, once.
//
// - floorOf(R, ...): an area's carpet, and the outside of the two empty
//   storeys it stands on, under its front edge (place.below, plan.js)
// - backWall / sill: the low back wall with its windows, and the glass along
//   the front, where everyone stands at bear o'clock
// - pod(R, cx, wall, n): a peninsula of desks off the back or front wall,
//   pairs facing each other across a divider (the owner's "desks facing each
//   other against the wall"); it returns the seats
// - worker(R, seat, look, o): someone at a seat, who runs to the front
//   windows at bear o'clock (clock.js, rushK) and comes back, and goes home
//   at five
// - screen(R, seat, text): the monitor at a seat; the ones facing us show
//   what their owner is really doing, and flip to a spreadsheet when the
//   CEO's near (clock.js, watched)
// - room(R, ...): a glass meeting room in the spine
import { C, Q, box, face, rect, person, folk, alpha, tint, shade, paintText } from '../../engine/art.js';
import { ground, block, drawBlock, tag } from '../greybox.js';
import { BD, BW, FLOOR, STOREY, SILL, BACK, FRONT } from './plan.js';
import { rushK, seated, watched, staffed, dark } from './clock.js';
import { BLOCK, SIDING, DARK_GLASS, SCREEN, INK } from './style.js';

// Glass: a pale box laid on see-through (box() shades its color, so it takes
// a plain one and the alpha goes on the canvas).
export function glass(ctx, x, y, z, w, d, h, k = 0.4) {
  ctx.save();
  ctx.globalAlpha *= k;
  box(ctx, x, y, z, w, d, h, tint(C.sky, 0.45), { flat: true, lw: 0.04 });
  ctx.restore();
}

// ---------- The floor and the building under it ----------
// An area's carpet (no slab: the storeys under it stand in for one), and the
// outside of floors one and two under its front edge: white siding, a dark
// window every 2.4 units, a band at each floor. o: { name, nameAt, end (the
// building's right-hand end face too), lit: [x] (a window lit on floor two,
// Gary's), door: x (the front door, at the foot) }
export function floorOf(R, x0, x1, o = {}) {
  ground(R, { floor: o.floor, slab: false, grid: 2, name: o.name, nameAt: o.nameAt });
  R.floor((ctx) => {
    const F = -FLOOR;
    face(ctx, [[x0, BD, 0], [x1, BD, 0], [x1, BD, F], [x0, BD, F]], shade(SIDING, 0.18), { dots: shade(SIDING, 0.4), density: 0.18 });
    if (o.end) face(ctx, [[BW, 0, 0], [BW, BD, 0], [BW, BD, F], [BW, 0, F]], shade(SIDING, 0.06));
    for (let s = 0; s < 2; s++) {
      const z0 = F + s * STOREY + 0.9, h = 1.5;
      for (let x = x0 + 0.6; x + 1.6 <= x1 - 0.4; x += 2.4) {
        if (o.door != null && s === 0 && Math.abs(x + 0.8 - o.door) < 2) continue;
        const lit = s === 1 && (o.lit || []).some((lx) => Math.abs(lx - (x + 0.8)) < 1.2);
        face(ctx, [[x, BD, z0], [x + 1.6, BD, z0], [x + 1.6, BD, z0 + h], [x, BD, z0 + h]], lit ? C.butter : DARK_GLASS, { lw: 0.05 });
      }
      if (o.end) {
        for (let y = 1; y + 1.6 <= BD - 0.4; y += 2.4) face(ctx, [[BW, y, z0], [BW, y + 1.6, z0], [BW, y + 1.6, z0 + h], [BW, y, z0 + h]], DARK_GLASS, { lw: 0.05 });
      }
      // The band at the floor line.
      face(ctx, [[x0, BD, F + (s + 1) * STOREY - 0.12], [x1, BD, F + (s + 1) * STOREY - 0.12], [x1, BD, F + (s + 1) * STOREY], [x0, BD, F + (s + 1) * STOREY]], shade(SIDING, 0.3), { stroke: false });
    }
    if (o.door != null) {
      const d = o.door;
      face(ctx, [[d - 1.4, BD, F], [d + 1.4, BD, F], [d + 1.4, BD, F + 2.8], [d - 1.4, BD, F + 2.8]], tint(C.sky, 0.2));
      face(ctx, [[d - 0.03, BD, F], [d + 0.03, BD, F], [d + 0.03, BD, F + 2.8], [d - 0.03, BD, F + 2.8]], C.ink, { stroke: false });
      face(ctx, [[d - 2.2, BD, F + 3], [d + 2.2, BD, F + 3], [d + 2.2, BD, F + 3.8], [d - 2.2, BD, F + 3.8]], INK.maple);
    }
  });
}

// The low back wall along y = 0 (waist height, with windows over the woods),
// and the left-hand end of the building (x = 0) for Leadership.
export function backWall(R, x0, x1, o = {}) {
  for (let x = x0; x < x1 - 0.01; x += 4) {
    const w = Math.min(4, x1 - x);
    block(R, x, 0, w, 0.35, 1.1, BLOCK.wall, null);
  }
  if (o.left) for (let y = 0; y < BD - 0.01; y += 4) block(R, 0, y, 0.35, Math.min(4, BD - y), 1.1, BLOCK.wall, null);
}
// The glass along the front edge, low: where everyone stands at bear o'clock.
export function sill(R, x0, x1, o = {}) {
  for (let x = x0; x < x1 - 0.01; x += 2) {
    const w = Math.min(2, x1 - x);
    R.thing(x + w / 2, BD - 0.1, (ctx) => {
      glass(ctx, x, BD - 0.2, 0, w, 0.2, 0.9, 0.5);
    });
  }
  if (o.end) for (let y = 0; y < BD - 0.01; y += 2) R.thing(BW - 0.1, y + 1, (ctx) => glass(ctx, BW - 0.2, y, 0, 0.2, Math.min(2, BD - y), 0.9, 0.5));
}

// ---------- Desks ----------
// A peninsula: n pairs of desks off a wall, running into the room along y,
// people facing each other across a divider down the middle (x = cx). wall:
// 'back' (it starts at y = 0) or 'front' (at y = BD). Each seat is
// { x, y, dir, side, k } (side 'l' sits on the left of the divider, facing
// right, its screen turned away from us; 'r' faces left, its screen toward
// us). Returns the seats, left and right in turn, from the wall out.
export const DESK = { w: 1.25, d: 1.8, top: 1.15 };
export function pod(R, cx, wall, n = 3, o = {}) {
  const seats = [];
  for (let i = 0; i < n; i++) {
    const y0 = wall === 'back' ? 0.4 + i * DESK.d : BD - 0.4 - (i + 1) * DESK.d;
    const y = y0 + DESK.d / 2;
    block(R, cx - DESK.w - 0.06, y0 + 0.05, DESK.w, DESK.d - 0.1, DESK.top, BLOCK.desk, null);
    block(R, cx + 0.06, y0 + 0.05, DESK.w, DESK.d - 0.1, DESK.top, BLOCK.desk, null);
    block(R, cx - 0.06, y0 + 0.1, 0.12, DESK.d - 0.2, 1.75, BLOCK.divider, null);
    seats.push({ x: cx - DESK.w - 0.75, y, dir: 'r', side: 'l', cx, mon: [cx - 0.45, y, DESK.top] });
    seats.push({ x: cx + DESK.w + 0.75, y, dir: 'l', side: 'r', cx, mon: [cx + 0.45, y, DESK.top] });
  }
  if (o.name && Q.detail) R.air((ctx) => tag(ctx, cx, wall === 'back' ? 1 : BD - 1, 2.6, o.name, { size: 0.38 }));
  return seats;
}

// A monitor at a seat. Ours to see only when it faces us (side 'r'). It shows
// `text` (what its owner's really up to: a string, or a function of t) unless
// the CEO's near, when it's a spreadsheet; at bear o'clock nobody had time to
// switch it. Off while nobody's at the desk. o: { here(t) (someone's at the
// desk; default the floor's in), always (on day and night) }
export function screen(R, s, text, o = {}) {
  const [mx, my, mz] = s.mon;
  const facing = s.side === 'r';
  R.thing(mx, my, (ctx, t) => {
    const on = o.always || (o.here ? o.here(t) : staffed(t) > 0.5);
    const real = on && (rushK(t) > 0.5 || !watched(mx, t));
    const col = !on ? SCREEN.off : real ? SCREEN.play : SCREEN.work;
    drawBlock(ctx, mx - 0.1, my - 0.55, mz, 0.2, 1.1, 0.8, facing ? col : C.grey, null);
    if (facing && on && Q.detail) tag(ctx, mx + 0.2, my, mz + 1.15, real ? (typeof text === 'function' ? text(t) : text) : 'WORK', { size: 0.26, fill: real ? C.white : C.greyLight });
  }, { anim: true });
}

// Someone at a seat. They come in at their own minute in the morning (k: 0
// to 1), run to the front windows at bear o'clock (setting off a moment after
// the shout, depending on how far they are: back desks go further), and go
// home at five. o: { k, window: [x, y], pose (at the desk), label, always
// (here all day and night, Dev) }
export function worker(R, s, look, o = {}) {
  const k = o.k ?? 0.5;
  const win = o.window || [s.x, s.y < BD / 2 ? SILL - 1.1 : SILL];
  const travel = 2.2 + Math.abs(win[1] - s.y) / 3.2;
  const delay = o.delay ?? ((k * 7) % 1.4);
  // The chair stays put.
  block(R, s.x - 0.4, s.y - 0.4, 0.8, 0.8, 0.75, BLOCK.chair, null);
  R.mover((t) => {
    const here = o.always ? o.always(t) : seated(t, k);
    if (!here) return { x: s.x, y: s.y, gone: true };
    const r = rushK(t, travel, delay);
    if (r <= 0) return { x: s.x, y: s.y, sit: true, dir: s.dir };
    // Out of the chair into the aisle, then straight to the glass.
    const x = s.x, y = s.y + (win[1] - s.y) * r;
    return { x: x + (win[0] - x) * r, y, moving: r < 1, dir: r < 1 ? 'l' : 'l', back: false, front: r >= 1 };
  }, (ctx, t, p) => {
    if (p.gone) return;
    person(ctx, p.x, p.y, p.sit ? 0.15 : 0, { ...look, pose: p.sit ? (o.pose || 'sit') : p.moving ? 'run' : (o.at || 'point'), dir: p.dir, back: p.back }, t);
    if (o.label && Q.detail) tag(ctx, p.x, p.y, (p.sit ? 2.5 : 3), o.label, { size: 0.32 });
  }, { bias: 0.15 });
}

// A whole peninsula of people: everyone in its seats but those in `empty`
// (it's Friday: some desks are empty). looks: a seed to start their folk
// from. texts: what each seat facing us is really doing.
export function staff(R, seats, seed, o = {}) {
  seats.forEach((s, i) => {
    if ((o.empty || []).includes(i)) return;
    const look = folk(seed + i, o.look ? o.look(i) : {});
    const k = ((seed * 13 + i * 7) % 10) / 10;
    const each = { k, ...(o.each ? o.each(i, s) : {}) };
    worker(R, s, look, each);
    screen(R, s, (o.texts && o.texts[i]) || 'EMAIL', { here: each.always || ((t) => seated(t, each.k)) });
  });
}

// ---------- Rooms ----------
// A glass meeting room in the spine: its floor, its low glass walls (a gap
// for the door on the front side), a table, and its name on the floor.
export function room(R, x0, y0, x1, y1, name, o = {}) {
  R.rug((ctx) => {
    rect(ctx, x0, y0, x1 - x0, y1 - y0, 0, tint(o.floor || INK.carpet, 0.15), { stroke: false });
    if (name) paintText(ctx, 'floor', (x0 + x1) / 2, y1 - 0.9, name, 0.55, alpha(C.ink, 0.35));
  });
  const seg = (x, y, w, d) => R.thing(x + w / 2, y + d / 2, (ctx) => glass(ctx, x, y, 0, w, d, 2.4));
  for (let y = y0; y < y1 - 0.01; y += 2) seg(x0, y, 0.12, Math.min(2, y1 - y));
  for (let y = y0; y < y1 - 0.01; y += 2) seg(x1 - 0.12, y, 0.12, Math.min(2, y1 - y));
  // The door: a gap in the front wall, or the back one (o.back) for a room
  // in the front band, whose door faces the spine.
  const door = o.door ?? (x0 + x1) / 2;
  const dy = o.back ? y0 : y1 - 0.12;
  for (let x = x0; x < x1 - 0.01; x += 2) {
    const w = Math.min(2, x1 - x);
    if (x + w > door - 0.8 && x < door + 0.8) { if (x < door - 0.8) seg(x, dy, door - 0.8 - x, 0.12); if (x + w > door + 0.8) seg(door + 0.8, dy, x + w - door - 0.8, 0.12); continue; }
    seg(x, dy, w, 0.12);
  }
  if (!o.back) for (let x = x0; x < x1 - 0.01; x += 2) seg(x, y0, Math.min(2, x1 - x), 0.12);
  else for (let x = x0; x < x1 - 0.01; x += 2) seg(x, y1 - 0.12, Math.min(2, x1 - x), 0.12);
  if (o.table !== false) {
    const tw = (x1 - x0) * 0.55, td = (y1 - y0) * 0.35;
    block(R, (x0 + x1) / 2 - tw / 2, (y0 + y1) / 2 - td / 2 - 0.3, tw, td, 1.15, BLOCK.wood, null);
  }
}

export { BACK, FRONT, SILL, dark };
