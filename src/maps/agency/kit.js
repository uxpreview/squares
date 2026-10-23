// Pitch Day: the level's kit, the pieces every stretch of the top floor shares,
// so six areas drawn by six artists are one office. Drawn once, here.
//
// - floorOf(R, ...): an area's carpet, and the outside of the two empty
//   storeys it stands on, under its front edge (place.below, plan.js)
// - backWall / sill: the low back wall, and the glass along the front, where
//   everyone stands at bear o'clock
// - pod(R, cx, wall, n): a peninsula of desks off the back or front wall,
//   pairs facing each other across a divider (the owner's "desks facing each
//   other against the wall"); it returns the seats
// - worker(R, seat, look, o): someone at a seat, who runs to the front
//   windows at bear o'clock (clock.js, rushK) and comes back, and goes home
//   at five; staff(R, seats, ...) fills a peninsula
// - screen(R, seat, kind): the monitor at a seat; the ones facing us show
//   what their owner is really doing (a little picture: SCREENS), and flip to
//   a spreadsheet when the CEO's near (clock.js, watched)
// - room(R, ...): a glass meeting room in the spine; glass(ctx, ...)
// - drawTower(ctx): the stair tower, an octagon, the hero
// - car(ctx, ...), bear(ctx, ...), maple / pine (trees), plant, mug, papers
import { C, Q, box, face, rect, paint, person, folk, alpha, tint, shade, mix, paintText, hash } from '../../engine/art.js';
import { ZK } from '../../engine/iso.js';
import { BD, BW, FLOOR, STOREY, SILL, BACK, FRONT, TOWER } from './plan.js';
import { rushK, seated, watched, staffed, dark, nightK } from './clock.js';
import { SIDING, DARK_GLASS, INK, PRIMAL, BRAND, CHAIR, FABRIC } from './style.js';

const P3 = (x, y, z) => [x - y, (x + y) / 2 - z * ZK];
const LW = 0.045;

// Glass: a pale box laid on see-through (box() shades its color, so it takes
// a plain one and the alpha goes on the canvas).
export function glass(ctx, x, y, z, w, d, h, k = 0.4) {
  ctx.save();
  ctx.globalAlpha *= k;
  box(ctx, x, y, z, w, d, h, tint(C.sky, 0.45), { flat: true, lw: 0.03 });
  ctx.restore();
}

// ---------- The floor and the building under it ----------
// An area's carpet (tiles in two tones, no slab: the storeys under it stand
// in for one), and the outside of floors one and two under its front edge:
// white clapboard, a dark window every 2.4 units with a white frame, a band
// at each floor. o: { floor, end (the building's right-hand end face too),
// lit: [x] (a window lit on floor two, Gary's), door: x (the front door, at
// the foot, under PRIMAL's sign) }
export function floorOf(R, x0, x1, o = {}) {
  const carpet = o.floor || INK.carpet;
  R.floor((ctx) => {
    rect(ctx, x0, 0, x1 - x0, BD, 0, carpet, { stroke: false });
    // Carpet tiles, every other one a shade darker.
    if (Q.detail) {
      const dk = shade(carpet, 0.05);
      for (let x = x0; x < x1; x += 2) for (let y = 0; y < BD; y += 2) if (((x + y) / 2) % 2 === 0) rect(ctx, x, y, 2, 2, 0, dk, { stroke: false });
    }
    facade(ctx, x0, x1, o);
  });
}

// The two empty floors' outside, under x0..x1 of the front edge.
function facade(ctx, x0, x1, o) {
  const F = -FLOOR;
  const wall = shade(SIDING, 0.12), endWall = shade(SIDING, 0.04);
  face(ctx, [[x0, BD, 0], [x1, BD, 0], [x1, BD, F], [x0, BD, F]], wall, { lw: LW });
  if (o.end) face(ctx, [[BW, 0, 0], [BW, BD, 0], [BW, BD, F], [BW, 0, F]], endWall, { lw: LW });
  // Clapboard: a fine line every 0.4.
  if (Q.detail) {
    ctx.save();
    ctx.strokeStyle = alpha(C.ink, 0.12);
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    for (let z = F + 0.4; z < -0.1; z += 0.4) {
      let [a, b] = [P3(x0, BD, z), P3(x1, BD, z)];
      ctx.moveTo(...a); ctx.lineTo(...b);
      if (o.end) { [a, b] = [P3(BW, 0, z), P3(BW, BD, z)]; ctx.moveTo(...a); ctx.lineTo(...b); }
    }
    ctx.stroke();
    ctx.restore();
  }
  const win = (pts, lit) => {
    face(ctx, pts.frame, C.white, { lw: 0.035 });
    face(ctx, pts.glass, lit ? C.butter : DARK_GLASS, { stroke: false, dots: lit ? null : shade(DARK_GLASS, 0.4), density: 0.15 });
    if (!lit && Q.detail) { ctx.save(); ctx.globalAlpha *= 0.35; face(ctx, pts.glint, C.white, { stroke: false }); ctx.restore(); }
  };
  for (let s = 0; s < 2; s++) {
    const z0 = F + s * STOREY + 0.85, h = 1.55;
    for (let x = x0 + 0.6; x + 1.6 <= x1 - 0.4; x += 2.4) {
      if (o.door != null && s === 0 && Math.abs(x + 0.8 - o.door) < 2.6) continue;
      const lit = s === 1 && (o.lit || []).some((lx) => Math.abs(lx - (x + 0.8)) < 1.2);
      const y = BD + 0.01;
      win({
        frame: [[x - 0.1, y, z0 - 0.1], [x + 1.7, y, z0 - 0.1], [x + 1.7, y, z0 + h + 0.1], [x - 0.1, y, z0 + h + 0.1]],
        glass: [[x, y, z0], [x + 1.6, y, z0], [x + 1.6, y, z0 + h], [x, y, z0 + h]],
        glint: [[x + 0.2, y, z0 + 0.1], [x + 0.55, y, z0 + 0.1], [x + 1.0, y, z0 + h - 0.1], [x + 0.65, y, z0 + h - 0.1]],
      }, lit);
      if (lit && Q.detail) {
        // Gary, at his desk, nobody told.
        const [X, Y] = P3(x + 0.8, y, z0 + 0.25);
        ctx.beginPath(); ctx.arc(X, Y - 0.55, 0.16, 0, Math.PI * 2); paint(ctx, C.blush, { lw: 0.03 });
        ctx.beginPath(); ctx.ellipse(X, Y - 0.15, 0.24, 0.26, 0, Math.PI, 0); paint(ctx, C.teal, { lw: 0.03 });
        face(ctx, [[x + 0.15, y, z0], [x + 1.45, y, z0], [x + 1.45, y, z0 + 0.35], [x + 0.15, y, z0 + 0.35]], C.wood, { lw: 0.03 });
      }
    }
    if (o.end) {
      for (let y = 1; y + 1.6 <= BD - 0.4; y += 2.4) {
        const x = BW + 0.01;
        win({
          frame: [[x, y - 0.1, z0 - 0.1], [x, y + 1.7, z0 - 0.1], [x, y + 1.7, z0 + h + 0.1], [x, y - 0.1, z0 + h + 0.1]],
          glass: [[x, y, z0], [x, y + 1.6, z0], [x, y + 1.6, z0 + h], [x, y, z0 + h]],
          glint: [[x, y + 0.2, z0 + 0.1], [x, y + 0.55, z0 + 0.1], [x, y + 1.0, z0 + h - 0.1], [x, y + 0.65, z0 + h - 0.1]],
        }, false);
      }
    }
    // The band at each floor line.
    const zb = F + (s + 1) * STOREY;
    face(ctx, [[x0, BD + 0.02, zb - 0.16], [x1, BD + 0.02, zb - 0.16], [x1, BD + 0.02, zb], [x0, BD + 0.02, zb]], shade(SIDING, 0.32), { stroke: false });
    if (o.end) face(ctx, [[BW + 0.02, 0, zb - 0.16], [BW + 0.02, BD, zb - 0.16], [BW + 0.02, BD, zb], [BW + 0.02, 0, zb]], shade(SIDING, 0.25), { stroke: false });
  }
  // The foundation, where the building meets the lot.
  face(ctx, [[x0, BD + 0.02, F], [x1, BD + 0.02, F], [x1, BD + 0.02, F + 0.35], [x0, BD + 0.02, F + 0.35]], C.grey, { stroke: false, dots: shade(C.grey, 0.4), density: 0.25 });
  if (o.door != null) {
    const d = o.door, y = BD + 0.02;
    // The glass doors, a canopy, and PRIMAL over them.
    face(ctx, [[d - 1.6, y, F], [d + 1.6, y, F], [d + 1.6, y, F + 2.7], [d - 1.6, y, F + 2.7]], C.white, { lw: LW });
    face(ctx, [[d - 1.45, y, F], [d - 0.04, y, F], [d - 0.04, y, F + 2.55], [d - 1.45, y, F + 2.55]], tint(C.sky, 0.25), { lw: 0.03 });
    face(ctx, [[d + 0.04, y, F], [d + 1.45, y, F], [d + 1.45, y, F + 2.55], [d + 0.04, y, F + 2.55]], tint(C.sky, 0.25), { lw: 0.03 });
    face(ctx, [[d - 2.2, y, F + 2.9], [d + 2.2, y, F + 2.9], [d + 2.2, y + 1, F + 2.8], [d - 2.2, y + 1, F + 2.8]], PRIMAL, { lw: LW });
    lettering(ctx, 'x', d, y + 0.01, F + 4.3, 'PRIMAL', 1.05, PRIMAL, 'Bagel Fat One');
  }
}

// Words painted on a wall that runs along x (a face toward +y) or along y
// (toward +x), centered at (x, y, z), size in units.
export function lettering(ctx, along, x, y, z, text, size, ink = C.ink, font = 'Rethink Sans') {
  ctx.save();
  if (along === 'x') ctx.transform(1, 0.5, 0, ZK, x - y, (x + y) / 2 - z * ZK);
  else ctx.transform(1, -0.5, 0, ZK, x - y, (x + y) / 2 - z * ZK);
  const k = 40;
  ctx.scale(1 / k, 1 / k);
  ctx.font = `700 ${size * k}px "${font}", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ink;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// The low back wall along y = 0 (waist height, a cap on it), and the
// left-hand end of the building (x = 0) for Leadership. In pieces, so
// nobody standing at it is painted over.
export function backWall(R, x0, x1, o = {}) {
  const piece = (x, y, w, d) => R.thing(x + w / 2, y + d / 2, (ctx) => {
    box(ctx, x, y, 0, w, d, 1.05, SIDING, { flat: true, lw: LW });
    box(ctx, x - 0.05, y - 0.05, 1.05, w + 0.1, d + 0.1, 0.1, C.white, { flat: true, lw: 0.03 });
  });
  for (let x = x0; x < x1 - 0.01; x += 4) piece(x, 0, Math.min(4, x1 - x), 0.3);
  if (o.left) for (let y = 0.3; y < BD - 0.01; y += 4) piece(0, y, 0.3, Math.min(4, BD - y));
}
// The glass along the front edge, low, with a rail: where everyone stands at
// bear o'clock.
export function sill(R, x0, x1, o = {}) {
  const pane = (x, y, w, d) => R.thing(x + w / 2, y + d / 2, (ctx) => {
    glass(ctx, x, y, 0, w, d, 0.95, 0.45);
    box(ctx, x, y, 0.95, w, d, 0.08, C.white, { flat: true, lw: 0.025 });
  });
  for (let x = x0; x < x1 - 0.01; x += 2) pane(x, BD - 0.18, Math.min(2, x1 - x), 0.16);
  if (o.end) for (let y = 0; y < BD - 0.19; y += 2) pane(BW - 0.18, y, 0.16, Math.min(2, BD - 0.18 - y));
}

// ---------- Desks ----------
// A peninsula: n pairs of desks off a wall, running into the room along y,
// people facing each other across a divider down the middle (x = cx). wall:
// 'back' (it starts at y = 0) or 'front' (at y = BD). Each seat is
// { x, y, dir, side, cx, mon, top } (side 'l' sits on the left of the
// divider, facing right, its screen turned away from us; 'r' faces left, its
// screen toward us; mon: where its monitor stands; top: a free spot on its
// desk for a find or a mug). Returns the seats, left and right in turn, from
// the wall out.
export const DESK = { w: 1.25, d: 1.8, top: 1.1 };
export function pod(R, cx, wall, n = 3, o = {}) {
  const seats = [];
  for (let i = 0; i < n; i++) {
    const y0 = wall === 'back' ? 0.4 + i * DESK.d : BD - 0.4 - (i + 1) * DESK.d;
    const y = y0 + DESK.d / 2;
    desk(R, cx - DESK.w - 0.06, y0 + 0.05, DESK.w, DESK.d - 0.1, o.color);
    desk(R, cx + 0.06, y0 + 0.05, DESK.w, DESK.d - 0.1, o.color);
    R.thing(cx, y0 + DESK.d - 0.1, (ctx) => {
      box(ctx, cx - 0.06, y0 + 0.1, 0, 0.12, DESK.d - 0.2, 1.7, FABRIC, { flat: true, lw: 0.035, top: tint(FABRIC, 0.2) });
    });
    seats.push({ x: cx - DESK.w - 0.75, y, dir: 'r', side: 'l', cx, mon: [cx - 0.4, y, DESK.top], top: [cx - 0.95, y + (i % 2 ? 0.45 : -0.45), DESK.top] });
    seats.push({ x: cx + DESK.w + 0.75, y, dir: 'l', side: 'r', cx, mon: [cx + 0.4, y, DESK.top], top: [cx + 0.95, y + (i % 2 ? -0.45 : 0.45), DESK.top] });
  }
  return seats;
}
// One desk: a white top on two panel legs.
export function desk(R, x, y, w, d, color = C.white) {
  R.thing(x + w / 2, y + d, (ctx) => drawDesk(ctx, x, y, w, d, color));
}
export function drawDesk(ctx, x, y, w, d, color = C.white) {
  const leg = shade(C.greyLight, 0.1);
  box(ctx, x + 0.05, y + 0.05, 0, 0.08, d - 0.1, DESK.top - 0.06, leg, { flat: true, lw: 0.025 });
  box(ctx, x + w - 0.13, y + 0.05, 0, 0.08, d - 0.1, DESK.top - 0.06, leg, { flat: true, lw: 0.025 });
  box(ctx, x, y, DESK.top - 0.06, w, d, 0.06, color, { flat: true, lw: 0.035 });
}

// An office chair at a seat, its back away from the desk: the base, the
// seat, the back (drawn after anyone sitting, when it's toward us).
export function chair(R, s, color = CHAIR) {
  const away = s.side === 'r' ? 1 : -1;
  R.thing(s.x, s.y, (ctx) => drawChair(ctx, s.x, s.y, 0, color, away, 'seat'));
  R.thing(s.x + away * 0.4, s.y + 0.01, (ctx) => drawChair(ctx, s.x, s.y, 0, color, away, 'back'));
}
export function drawChair(ctx, x, y, z, color = CHAIR, away = 1, part = 'all') {
  if (part !== 'back') {
    if (Q.detail) for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      const [X, Y] = P3(x + Math.cos(a) * 0.32, y + Math.sin(a) * 0.32, z + 0.05);
      ctx.beginPath(); ctx.arc(X, Y, 0.05, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
    }
    box(ctx, x - 0.04, y - 0.04, z + 0.08, 0.08, 0.08, 0.4, C.ink, { flat: true, stroke: false });
    box(ctx, x - 0.32, y - 0.32, z + 0.48, 0.64, 0.64, 0.14, color, { flat: true, lw: 0.03 });
  }
  if (part !== 'seat') {
    const bx = x + away * 0.3;
    box(ctx, bx - 0.05, y - 0.3, z + 0.6, 0.1, 0.6, 0.8, color, { flat: true, lw: 0.03, top: tint(color, 0.15) });
  }
}

// ---------- Screens ----------
// What's on a monitor, as a little picture on its face (the face toward +x).
// Spot finds on screens are drawn bold enough to read; the rest are busy.
export const SCREENS = {
  sheet: { bg: C.white, draw: grid },
  email: { bg: C.white, draw: (c, b) => lines(c, b, 5, C.grey, [C.teal]) },
  calendar: { bg: C.white, draw: (c, b) => blocks(c, b, [C.teal, C.coral, C.mustard, C.teal]) },
  code: { bg: C.ink, draw: (c, b) => lines(c, b, 6, C.tealLight, [C.pink, C.mustard]) },
  terminal: { bg: C.black, draw: (c, b) => lines(c, b, 5, C.leaf, []) },
  social: { bg: C.white, draw: (c, b) => tiles(c, b, [C.pink, C.coral, C.sky, C.lilac]) },
  photos: { bg: C.white, draw: (c, b) => tiles(c, b, [C.sky, C.leaf, C.mustard, C.coral]) },
  mood: { bg: C.white, draw: (c, b) => tiles(c, b, [INK.maple, C.mustard, C.teal, C.blush]) },
  chart: { bg: C.white, draw: bars },
  logo: { bg: C.white, draw: (c, b) => word(c, b, 'G', INK.maple, 'Bagel Fat One', 0.5) },
  kern: { bg: C.white, draw: (c, b, t) => word(c, b, Math.floor(t / 20) % 2 ? 'G A N D E R' : 'G A ND E R', C.ink, 'Rethink Sans', 0.17) },
  helvetica: { bg: C.white, draw: (c, b) => word(c, b, 'Aa', C.ink, 'Rethink Sans') },
  comic: { bg: C.butter, draw: (c, b) => word(c, b, 'Aa!', C.purple, '"Comic Sans MS", "Comic Neue", cursive') },
  football: { bg: C.green, draw: football },
  shop: { bg: C.white, draw: (c, b) => tiles(c, b, [C.mustard, C.pink, C.white, C.teal]) },
  golf: { bg: C.leaf, draw: golf },
  cat: { bg: C.butter, draw: catFace },
  survey: { bg: C.white, draw: (c, b) => lines(c, b, 4, C.grey, [C.teal, C.teal]) },
  heatmap: { bg: C.white, draw: heat },
  slides: { bg: C.white, draw: (c, b) => word(c, b, 'GANDER', C.red, 'Bagel Fat One', 0.22) },
  off: { bg: C.ink, draw: null },
};
// A monitor at (x, y, z), its face toward +x (toward us) or its back to us,
// showing `kind` (a key of SCREENS) at t.
export function drawMonitor(ctx, x, y, z, kind, t, facing = true) {
  box(ctx, x - 0.12, y - 0.18, z, 0.24, 0.36, 0.04, C.ink, { flat: true, stroke: false });
  box(ctx, x - 0.03, y - 0.03, z + 0.04, 0.06, 0.06, 0.25, C.ink, { flat: true, stroke: false });
  const y0 = y - 0.55, y1 = y + 0.55, z0 = z + 0.26, z1 = z + 0.92;
  box(ctx, x - 0.05, y0, z0, 0.1, y1 - y0, z1 - z0, C.black, { flat: true, lw: 0.03 });
  if (!facing) return;
  const s = SCREENS[kind] || SCREENS.email, xf = x + 0.055, m = 0.05;
  const b = { x: xf, y0: y0 + m, y1: y1 - m, z0: z0 + m, z1: z1 - m };
  face(ctx, [[xf, b.y0, b.z0], [xf, b.y1, b.z0], [xf, b.y1, b.z1], [xf, b.y0, b.z1]], s.bg, { stroke: false });
  if (s.draw && Q.detail) s.draw(ctx, b, t);
}
// A rectangle on a screen, in its own 0..1 across (u) and up (v).
function q(ctx, b, u0, u1, v0, v1, col) {
  const y = (u) => b.y0 + (b.y1 - b.y0) * u, z = (v) => b.z0 + (b.z1 - b.z0) * v;
  face(ctx, [[b.x, y(u0), z(v0)], [b.x, y(u1), z(v0)], [b.x, y(u1), z(v1)], [b.x, y(u0), z(v1)]], col, { stroke: false });
}
function grid(ctx, b) {
  q(ctx, b, 0, 1, 0.82, 1, C.leaf);
  for (let i = 1; i < 5; i++) q(ctx, b, 0, 1, i * 0.18 - 0.01, i * 0.18 + 0.01, C.greyLight);
  for (let i = 1; i < 4; i++) q(ctx, b, i * 0.25 - 0.006, i * 0.25 + 0.006, 0, 0.82, C.greyLight);
}
function lines(ctx, b, n, col, accents) {
  for (let i = 0; i < n; i++) {
    const c = accents.length && i % 2 ? accents[i % accents.length] : col;
    q(ctx, b, 0.06, 0.3 + ((i * 37) % 60) / 100, 0.85 - i * (0.75 / n) - 0.07, 0.85 - i * (0.75 / n), c);
  }
}
function blocks(ctx, b, cols) { cols.forEach((c, i) => q(ctx, b, 0.08 + i * 0.22, 0.26 + i * 0.22, 0.2 + (i % 2) * 0.25, 0.55 + (i % 2) * 0.25, c)); }
function tiles(ctx, b, cols) { for (let i = 0; i < 4; i++) q(ctx, b, 0.06 + (i % 2) * 0.46, 0.48 + (i % 2) * 0.46, 0.08 + Math.floor(i / 2) * 0.44, 0.48 + Math.floor(i / 2) * 0.44, cols[i]); }
function bars(ctx, b) { [0.3, 0.55, 0.45, 0.8].forEach((h, i) => q(ctx, b, 0.1 + i * 0.22, 0.26 + i * 0.22, 0.08, 0.08 + h * 0.85, i === 3 ? C.coral : C.teal)); }
function heat(ctx, b) { q(ctx, b, 0.2, 0.55, 0.4, 0.8, C.coral); q(ctx, b, 0.3, 0.45, 0.5, 0.7, C.red); q(ctx, b, 0.6, 0.8, 0.15, 0.35, C.mustard); }
function football(ctx, b) {
  q(ctx, b, 0.48, 0.52, 0, 1, C.white);
  [[0.2, 0.3], [0.2, 0.7], [0.35, 0.5], [0.65, 0.3], [0.65, 0.7], [0.8, 0.5]].forEach(([u, v], i) => q(ctx, b, u - 0.04, u + 0.04, v - 0.06, v + 0.06, i < 3 ? C.red : C.white));
}
function golf(ctx, b) { q(ctx, b, 0.55, 0.85, 0.15, 0.45, tint(C.leaf, 0.3)); q(ctx, b, 0.68, 0.7, 0.3, 0.85, C.white); q(ctx, b, 0.7, 0.8, 0.72, 0.85, C.red); q(ctx, b, 0.25, 0.3, 0.3, 0.38, C.white); }
function catFace(ctx, b) {
  q(ctx, b, 0.3, 0.7, 0.15, 0.7, C.mustard);
  q(ctx, b, 0.3, 0.42, 0.7, 0.88, C.mustard); q(ctx, b, 0.58, 0.7, 0.7, 0.88, C.mustard);
  q(ctx, b, 0.38, 0.45, 0.45, 0.55, C.ink); q(ctx, b, 0.55, 0.62, 0.45, 0.55, C.ink);
}
function word(ctx, b, text, ink, font, size = 0.32) {
  const y = (b.y0 + b.y1) / 2, z = (b.z0 + b.z1) / 2;
  ctx.save();
  ctx.transform(1, -0.5, 0, ZK, b.x - y, (b.x + y) / 2 - z * ZK);
  const k = 40;
  ctx.scale(1 / k, 1 / k);
  ctx.font = `700 ${size * k}px ${font.includes('"') ? font : `"${font}", sans-serif`}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ink;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// A monitor at a seat. Ours to see only when it faces us (side 'r'). It shows
// `kind` (what its owner's really up to: a SCREENS key, or a function of t
// that gives one) unless the CEO's near, when it's a spreadsheet; at bear
// o'clock nobody had time to switch it. Off while nobody's at the desk.
// o: { here(t) (someone's at the desk; default the floor's in), always (on
// day and night) }
export function screen(R, s, kind, o = {}) {
  const [mx, my, mz] = s.mon;
  const facing = s.side === 'r';
  if (!facing) { R.thing(mx, my, (ctx) => drawMonitor(ctx, mx, my, mz, 'off', 0, false)); return; }
  R.thing(mx, my, (ctx, t) => {
    const on = o.always || (o.here ? o.here(t) : staffed(t) > 0.5);
    const real = on && (rushK(t) > 0.5 || !watched(mx, t));
    const k = !on ? 'off' : real ? (typeof kind === 'function' ? kind(t) : kind) : 'sheet';
    drawMonitor(ctx, mx, my, mz, k, t, true);
  }, { anim: true });
}

// ---------- People at desks ----------
// Someone at a seat. They come in at their own minute in the morning (k: 0
// to 1), run to the front windows at bear o'clock (setting off a moment after
// the shout, depending on how far they are: back desks go further), and go
// home at five. o: { k, window: [x, y], pose (at the desk), at (at the
// glass), always(t) (here when; Dev stay late), chair: false (no chair) }
export function worker(R, s, look, o = {}) {
  const k = o.k ?? 0.5;
  const win = o.window || [s.x, s.y < BD / 2 ? SILL - 1.1 : SILL];
  const travel = 2.2 + Math.abs(win[1] - s.y) / 3.2;
  const delay = o.delay ?? ((k * 7) % 1.4);
  if (o.chair !== false) chair(R, s);
  const sitting = (o.pose || 'sit') === 'sit';
  R.mover((t) => {
    const here = o.always ? o.always(t) : seated(t, k);
    if (!here) return { x: s.x, y: s.y, gone: true };
    const r = rushK(t, travel, delay);
    if (r <= 0) return { x: s.x + (sitting ? 0 : (s.side === 'r' ? -0.35 : 0.35)), y: s.y, sit: true, dir: s.dir };
    // Out of the chair into the aisle, then straight to the glass.
    const y = s.y + (win[1] - s.y) * r;
    return { x: s.x + (win[0] - s.x) * r, y, moving: r < 1, dir: 'l', back: false };
  }, (ctx, t, p) => {
    if (p.gone) return;
    const pose = p.sit ? (o.pose || 'sit') : p.moving ? 'run' : (o.at || ((s.x * 7) % 3 < 1 ? 'point' : 'stand'));
    person(ctx, p.x, p.y, p.sit && sitting ? 0.2 : 0, { ...look, pose, dir: p.dir, back: p.back }, t);
  }, { bias: 0.15 });
}

// A whole peninsula of people: everyone in its seats but those in `empty`
// (it's Friday: some desks are empty), with a monitor each and a little
// clutter. seed: where their looks start. kinds: what each seat facing us is
// really doing (SCREENS keys).
export function staff(R, seats, seed, o = {}) {
  seats.forEach((s, i) => {
    const kinds = o.kinds || o.texts;
    if ((o.empty || []).includes(i)) {
      chair(R, s);
      screen(R, s, 'off', { here: () => false });
      return;
    }
    const look = folk(seed + i, o.look ? o.look(i) : {});
    const k = ((seed * 13 + i * 7) % 10) / 10;
    const each = { k, ...(o.each ? o.each(i, s) : {}) };
    worker(R, s, look, each);
    screen(R, s, (kinds && kinds[i]) || 'email', { here: each.always || ((t) => seated(t, each.k)) });
    if (o.clutter !== false) clutter(R, s, seed + i);
  });
}
// Something on a desk: a mug, papers, a plant, a water bottle, headphones.
export function clutter(R, s, seed) {
  const r = hash(seed, 3);
  const [x, y, z] = s.top;
  R.thing(x, y, (ctx) => {
    if (r < 0.25) mug(ctx, x, y, z, [C.coral, C.teal, C.mustard, C.white][Math.floor(r * 16) % 4]);
    else if (r < 0.5) papers(ctx, x, y, z);
    else if (r < 0.7) plant(ctx, x, y, z, 0.45);
    else if (r < 0.85) { box(ctx, x - 0.12, y - 0.12, z, 0.24, 0.24, 0.42, C.sky, { flat: true, lw: 0.025 }); box(ctx, x - 0.07, y - 0.07, z + 0.42, 0.14, 0.14, 0.08, C.ink, { flat: true, stroke: false }); }
    else { const [X, Y] = P3(x, y, z + 0.12); ctx.beginPath(); ctx.arc(X, Y, 0.16, Math.PI, 0); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.07; ctx.stroke(); }
  });
}

// Small things for desks and counters.
export function mug(ctx, x, y, z, color = C.white) {
  box(ctx, x - 0.11, y - 0.11, z, 0.22, 0.22, 0.26, color, { flat: true, lw: 0.025 });
  const [X, Y] = P3(x + 0.11, y, z + 0.13);
  ctx.beginPath(); ctx.arc(X + 0.06, Y, 0.07, -Math.PI / 2, Math.PI / 2); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.035; ctx.stroke();
}
export function papers(ctx, x, y, z, n = 3) {
  for (let i = 0; i < n; i++) box(ctx, x - 0.25 + i * 0.03, y - 0.18 - i * 0.02, z + i * 0.02, 0.5, 0.36, 0.02, C.white, { flat: true, lw: 0.02 });
}
export function plant(ctx, x, y, z, s = 1, color = C.green) {
  box(ctx, x - 0.15 * s, y - 0.15 * s, z, 0.3 * s, 0.3 * s, 0.3 * s, INK.maple, { flat: true, lw: 0.025 });
  const [X, Y] = P3(x, y, z + 0.3 * s);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.45;
    ctx.beginPath(); ctx.ellipse(X + Math.cos(a) * 0.18 * s, Y + Math.sin(a) * 0.3 * s, 0.1 * s, 0.22 * s, a + Math.PI / 2, 0, Math.PI * 2);
    paint(ctx, color, { lw: 0.025 });
  }
}

// ---------- Rooms ----------
// A glass meeting room in the spine: its floor, white posts every two units
// and glass between, a rail along the top, the door (a gap in the front wall,
// or the back one: o.back, for a room in the front band, whose door faces the
// spine), a table, and its name on the floor.
export function room(R, x0, y0, x1, y1, name, o = {}) {
  R.rug((ctx) => {
    rect(ctx, x0, y0, x1 - x0, y1 - y0, 0, tint(o.floor || INK.carpet, 0.2), { stroke: false });
    if (name) paintText(ctx, 'floor', (x0 + x1) / 2, y1 - 0.8, name, 0.5, alpha(C.ink, 0.35));
  });
  const H = 2.4;
  const pane = (x, y, w, d) => R.thing(x + w / 2, y + d / 2, (ctx) => {
    glass(ctx, x, y, 0, w, d, H, 0.35);
    box(ctx, x, y, 0, Math.min(w, 0.08), Math.min(d, 0.08), H, C.white, { flat: true, lw: 0.025 });
    box(ctx, x, y, H - 0.06, w, d, 0.06, C.white, { flat: true, lw: 0.02 });
  });
  const door = o.door ?? (x0 + x1) / 2;
  const dy = o.back ? y0 : y1 - 0.1;
  const run = (y, gap) => {
    for (let x = x0; x < x1 - 0.01; x += 2) {
      const w = Math.min(2, x1 - x);
      if (gap && x + w > door - 0.8 && x < door + 0.8) {
        if (x < door - 0.8) pane(x, y, door - 0.8 - x, 0.1);
        if (x + w > door + 0.8) pane(door + 0.8, y, x + w - door - 0.8, 0.1);
        continue;
      }
      pane(x, y, w, 0.1);
    }
  };
  run(o.back ? y1 - 0.1 : y0, false);
  run(dy, true);
  for (let y = y0; y < y1 - 0.01; y += 2) { pane(x0, y, 0.1, Math.min(2, y1 - y)); pane(x1 - 0.1, y, 0.1, Math.min(2, y1 - y)); }
  if (o.table !== false) {
    const tw = (x1 - x0) * 0.55, td = (y1 - y0) * 0.35;
    const tx = (x0 + x1) / 2 - tw / 2, ty = (y0 + y1) / 2 - td / 2 - 0.3;
    R.thing(tx + tw / 2, ty + td, (ctx) => {
      box(ctx, tx + tw / 2 - 0.15, ty + td / 2 - 0.15, 0, 0.3, 0.3, 1.05, C.ink, { flat: true, stroke: false });
      box(ctx, tx, ty, 1.05, tw, td, 0.08, C.wood, { flat: true, lw: 0.035 });
    });
  }
}

// ---------- The stair tower ----------
// An octagon of white clapboard rising out of the floor at the back of the
// front of house, tall windows, a red door at its foot facing the floor, a
// pointed roof in Primal's red, and a bear for a weathervane.
export function drawTower(ctx, t = 0) {
  const { x: cx, y: cy, r, h } = TOWER;
  const pts = [];
  for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + (k * Math.PI) / 4; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  const lit = nightK(t) > 0.5;
  for (let k = 0; k < 8; k++) {
    const [ax, ay] = pts[k], [bx, by] = pts[(k + 1) % 8];
    const nx = by - ay, ny = -(bx - ax); // outward normal
    const toward = nx + ny;
    if (toward <= 0.01) continue;
    const col = shade(SIDING, 0.04 + (1 - Math.min(1, toward / (r * 1.1))) * 0.18);
    face(ctx, [[ax, ay, 0], [bx, by, 0], [bx, by, h], [ax, ay, h]], col, { lw: LW });
    const mid = (u) => [ax + (bx - ax) * u, ay + (by - ay) * u];
    const front = ny > Math.abs(nx) * 2;
    const [p0, p1] = [mid(0.3), mid(0.7)];
    if (front) {
      face(ctx, [[...p0, 0], [...p1, 0], [...p1, 2.4], [...p0, 2.4]], PRIMAL, { lw: 0.035 });
      face(ctx, [[...mid(0.48), 0.1], [...mid(0.52), 0.1], [...mid(0.52), 2.3], [...mid(0.48), 2.3]], shade(PRIMAL, 0.3), { stroke: false });
    }
    for (const z0 of front ? [4, 6.2] : [1.6, 4, 6.2]) face(ctx, [[...p0, z0], [...p1, z0], [...p1, z0 + 1.5], [...p0, z0 + 1.5]], lit ? C.butter : DARK_GLASS, { lw: 0.03 });
  }
  // The eaves, then the roof: eight triangles to a point, the near ones.
  const top = [cx, cy, h + 4.2];
  const eave = pts.map(([x, y]) => [cx + (x - cx) * 1.12, cy + (y - cy) * 1.12, h]);
  for (let k = 0; k < 8; k++) {
    const a = eave[k], b = eave[(k + 1) % 8];
    const toward = (b[1] - a[1]) - (b[0] - a[0]);
    if (toward <= 0) continue;
    face(ctx, [a, b, top], shade(PRIMAL, 0.05 + (1 - Math.min(1, toward / (r * 1.2))) * 0.2), { lw: LW, dots: shade(PRIMAL, 0.45), density: 0.15 });
  }
  // The weathervane: a bear, of course, turning with the wind.
  const [X, Y] = P3(...top);
  ctx.save();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.06;
  ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X, Y - 1.1); ctx.stroke();
  ctx.translate(X, Y - 1.1);
  ctx.scale(Math.sin(t * 0.13) > 0 ? 1 : -1, 1);
  ctx.beginPath(); ctx.ellipse(0, 0, 0.42, 0.2, 0, 0, Math.PI * 2); ctx.moveTo(0.56, -0.12); ctx.arc(0.42, -0.12, 0.14, 0, Math.PI * 2);
  ctx.fillStyle = C.ink; ctx.fill();
  ctx.restore();
}

// ---------- The lot ----------
// A car, 1.5 wide and 2.8 long, parked along y with its nose toward the
// building (dir -1) or away (1), with whoever's inside drawn in it (o.riders:
// [{ front, v, skin, hair, top, lift, eat }]). o: { tall (an SUV), long,
// leaves (on its roof) }
export function car(ctx, x, y, z, color, o = {}) {
  const dir = o.dir || -1, L = o.long || 2.8, W = 1.5;
  const at = (u, v) => [x + v, y + u * dir];
  const pt = (u, v, h) => [...at(u, v), z + h];
  const lface = (pts, col, op) => face(ctx, pts.map(([u, v, h]) => pt(u, v, h)), col, op);
  const lbox = (u0, u1, v0, v1, h0, h, col, op) => {
    const [ax, ay] = at(u0, v0), [bx, by] = at(u1, v1);
    box(ctx, Math.min(ax, bx), Math.min(ay, by), z + h0, Math.abs(bx - ax), Math.abs(by - ay), h, col, op);
  };
  const glassC = mix(tint(C.sky, 0.25), color, 0.12);
  const sc = L / 2.8;
  const cb0 = -0.95 * sc, cb1 = 0.55 * sc, rf0 = -0.78 * sc, rf1 = 0.22 * sc, cw = 0.63, h0 = 0.78, h1 = o.tall ? 1.55 : 1.3;
  if (!Q.detail) {
    lbox(-L / 2, L / 2, -W / 2, W / 2, 0.2, 0.6, color, { flat: true, lw: 0.045 });
    lbox(cb0, cb1, -cw, cw, h0, h1 - h0, glassC, { flat: true, top: tint(color, 0.08), lw: 0.04 });
    return;
  }
  for (const u of [-0.9 * sc, 0.9 * sc]) for (const v of [-0.5, 0.5]) lbox(u - 0.27, u + 0.27, v - 0.12, v + 0.12, 0, 0.42, C.ink, { flat: true, lw: 0.02 });
  lbox(-L / 2, L / 2, -W / 2, W / 2, 0.22, 0.56, color, { flat: true, lw: 0.045 });
  // The back end, the one we see when it's nosed in: red lights.
  const back = dir < 0 ? -L / 2 : L / 2;
  for (const v of [-0.48, 0.48]) lface([[back, v - 0.16, 0.56], [back, v + 0.16, 0.56], [back, v + 0.16, 0.7], [back, v - 0.16, 0.7]], C.red, { lw: 0.02 });
  const darkC = mix(C.ink, color, 0.2);
  lface([[cb0, -cw, h0], [cb1, -cw, h0], [rf1, -cw, h1], [rf0, -cw, h1]], darkC, { lw: 0.03 });
  lface([[cb0, -cw, h0], [cb1, -cw, h0], [cb1, cw, h0], [cb0, cw, h0]], darkC, { stroke: false });
  for (const r of o.riders || []) {
    const u = r.front ? 0.05 : -0.52, v = r.v || 0, lift = r.lift || 0;
    const [SX, SY] = P3(...at(u, v), z + h0 + 0.18);
    ctx.beginPath(); ctx.ellipse(SX, SY, 0.22, 0.16, 0, 0, Math.PI * 2); paint(ctx, r.top || C.navy, { lw: 0.02 });
    const [HX, HY] = P3(...at(u, v), z + h0 + 0.37 + lift);
    ctx.beginPath(); ctx.arc(HX, HY, 0.15, 0, Math.PI * 2); paint(ctx, r.skin || mix(C.woodLight, C.brown, 0.3), { lw: 0.02 });
    ctx.beginPath(); ctx.arc(HX, HY - 0.03, 0.16, Math.PI * 1.05, Math.PI * 1.95); paint(ctx, r.hair || C.ink, { stroke: false });
    if (r.eat) { const [FX, FY] = P3(...at(u, v + 0.18), z + h0 + 0.3); ctx.beginPath(); ctx.ellipse(FX, FY, 0.12, 0.07, 0, 0, Math.PI * 2); paint(ctx, C.woodLight, { lw: 0.015 }); }
  }
  const pane = alpha(glassC, 0.55);
  lface([[cb1, -cw, h0], [cb1, cw, h0], [rf1, cw, h1], [rf1, -cw, h1]], pane, { lw: 0.03 });
  lface([[cb0, -cw, h0], [cb0, cw, h0], [rf0, cw, h1], [rf0, -cw, h1]], pane, { lw: 0.03 });
  lface([[cb0, cw, h0], [cb1, cw, h0], [rf1, cw, h1], [rf0, cw, h1]], pane, { lw: 0.03 });
  lface([[rf0, -cw, h1], [rf1, -cw, h1], [rf1, cw, h1], [rf0, cw, h1]], tint(color, 0.08), { lw: 0.04 });
  if (o.leaves) for (let i = 0; i < 5; i++) {
    const [lx, ly] = at(rf0 + hash(i, x) * (rf1 - rf0), -0.5 + hash(x, i)); const [X, Y] = P3(lx, ly, z + h1 + 0.02);
    ctx.beginPath(); ctx.ellipse(X, Y, 0.1, 0.05, i, 0, Math.PI * 2); ctx.fillStyle = i % 2 ? INK.maple : C.mustard; ctx.fill();
  }
}

// The bear: a black bear about 1.7 long, a brown muzzle, round ears. pose:
// walk (or run), dig (head in the dumpster, its back end out), eat, look (up
// on its hind legs, looking at the windows), sit (upright, on the CEO's car).
export function bear(ctx, x, y, z, t, o = {}) {
  const [X, Y] = P3(x, y, z);
  const pose = o.pose || 'walk', f = o.dir === 'l' ? -1 : 1;
  const fur = C.black, muzzle = C.brown;
  ctx.save();
  ctx.translate(X, Y);
  if (Q.detail && z < 0.2) { ctx.beginPath(); ctx.ellipse(0, 0, 0.95, 0.34, 0, 0, Math.PI * 2); ctx.fillStyle = alpha(C.ink, 0.2); ctx.fill(); }
  ctx.scale(f, 1);
  const st = (w) => { ctx.strokeStyle = C.ink; ctx.lineWidth = w || 0.05; ctx.lineJoin = 'round'; ctx.stroke(); };
  const blob = (fill, w) => { ctx.fillStyle = fill; ctx.fill(); st(w); };
  const headAt = (hx, hy, s = 1) => {
    for (const ex of [-0.17, 0.17]) { ctx.beginPath(); ctx.arc(hx + ex * s, hy - 0.26 * s, 0.1 * s, 0, Math.PI * 2); blob(fur, 0.03); }
    ctx.beginPath(); ctx.arc(hx, hy, 0.31 * s, 0, Math.PI * 2); blob(fur, 0.05);
    ctx.beginPath(); ctx.ellipse(hx + 0.2 * s, hy + 0.07 * s, 0.16 * s, 0.12 * s, 0, 0, Math.PI * 2); blob(muzzle, 0.03);
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(hx + 0.33 * s, hy + 0.03 * s, 0.05 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.white; ctx.fillRect(hx + 0.02 * s, hy - 0.11 * s, 0.06 * s, 0.06 * s);
  };
  if (pose === 'look' || pose === 'sit') {
    const lift = pose === 'look' ? 0.45 : 0;
    ctx.beginPath(); ctx.ellipse(0, -0.75 - lift, 0.5, 0.78, 0, 0, Math.PI * 2); blob(fur, 0.05);
    ctx.beginPath(); ctx.ellipse(0.08, -0.7 - lift, 0.22, 0.45, 0, 0, Math.PI * 2); ctx.fillStyle = alpha(muzzle, 0.35); ctx.fill();
    headAt(0.05, -1.7 - lift, 1);
    const wave = pose === 'look' ? Math.sin(t * 3) * 0.1 : 0;
    for (const px of [-0.22, 0.28]) { ctx.beginPath(); ctx.ellipse(px, -1.1 - lift - (pose === 'look' ? 0.25 : 0) + wave, 0.11, 0.19, 0.3, 0, Math.PI * 2); blob(fur, 0.03); }
    if (pose === 'sit') for (const px of [-0.3, 0.3]) { ctx.beginPath(); ctx.ellipse(px, -0.05, 0.18, 0.1, 0, 0, Math.PI * 2); blob(fur, 0.03); }
  } else {
    const go = pose === 'walk' ? 1 : 0, sp = o.run ? 9 : 6;
    for (const [lx, ph] of [[-0.48, 0], [-0.3, Math.PI], [0.36, Math.PI], [0.54, 0]]) {
      const s = Math.sin(t * sp + ph) * 0.13 * go;
      ctx.beginPath(); ctx.roundRect(lx - 0.11 + s, -0.55, 0.22, 0.55, 0.08); blob(lx === -0.3 || lx === 0.54 ? shade(fur, -0.15) : fur, 0.03);
    }
    const bob = Math.abs(Math.sin(t * sp)) * 0.03 * go;
    ctx.beginPath(); ctx.ellipse(0, -0.75 - bob, 0.85, 0.42, 0, 0, Math.PI * 2); blob(fur, 0.05);
    ctx.beginPath(); ctx.ellipse(0.32, -1.0 - bob, 0.32, 0.2, 0, Math.PI, 0); ctx.fillStyle = fur; ctx.fill();
    ctx.beginPath(); ctx.arc(-0.84, -0.86 - bob, 0.08, 0, Math.PI * 2); ctx.fillStyle = fur; ctx.fill();
    if (pose === 'dig') {
      // Head and shoulders in the dumpster: only its back end, wiggling.
      ctx.beginPath(); ctx.arc(-0.84, -0.86, 0.09 + Math.abs(Math.sin(t * 8)) * 0.02, 0, Math.PI * 2); ctx.fillStyle = fur; ctx.fill();
    } else {
      const down = pose === 'eat' ? 0.3 : 0;
      headAt(0.9, -0.85 + down - bob, 1);
      if (pose === 'eat') { ctx.beginPath(); ctx.ellipse(1.22, -0.58, 0.18, 0.08, 0, 0, Math.PI * 2); paint(ctx, C.woodLight, { lw: 0.02 }); }
    }
  }
  ctx.restore();
}

// ---------- Trees ----------
// A maple in October (red, orange or gold), and a pine.
export function maple(ctx, x, y, z, s = 1, color = INK.maple) {
  box(ctx, x - 0.12 * s, y - 0.12 * s, z, 0.24 * s, 0.24 * s, 1.6 * s, C.brown, { flat: true, lw: 0.03 });
  const [X, Y] = P3(x, y, z + 1.6 * s);
  const blobs = [[0, -0.9, 0.95], [-0.6, -0.45, 0.6], [0.6, -0.5, 0.65], [-0.3, -1.4, 0.6], [0.35, -1.35, 0.55]];
  for (const [bx, by, r] of blobs) { ctx.beginPath(); ctx.arc(X + bx * s, Y + by * s, r * s, 0, Math.PI * 2); paint(ctx, color, { lw: 0.04, dots: shade(color, 0.35), density: 0.18 }); }
}
export function pine(ctx, x, y, z, s = 1, color = INK.pine) {
  box(ctx, x - 0.1 * s, y - 0.1 * s, z, 0.2 * s, 0.2 * s, 0.8 * s, C.brown, { flat: true, lw: 0.03 });
  const [X, Y] = P3(x, y, z + 0.6 * s);
  for (let i = 0; i < 3; i++) {
    const w = (1 - i * 0.25) * s, yb = Y - i * 0.85 * s;
    ctx.beginPath(); ctx.moveTo(X - w, yb); ctx.lineTo(X + w, yb); ctx.lineTo(X, yb - 1.5 * s); ctx.closePath();
    paint(ctx, i ? tint(color, i * 0.06) : color, { lw: 0.04, dots: shade(color, 0.4), density: 0.15 });
  }
}

export { BACK, FRONT, SILL, dark, BRAND };
