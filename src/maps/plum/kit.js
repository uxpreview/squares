// Plum Island's greybox pieces, shared by its areas: cars, boats, houses on
// stilts, umbrellas, greenhead traps, people with their names over them. Plain
// blocks and labels (see src/maps/greybox.js), standing on the island's
// ground or floating on its water. The art replaces all of it.
import { C, Q, box, disc, person, alpha, shade, tint } from '../../engine/art.js';
import { wade } from '../../engine/terrain.js';
import { tag, footing } from '../greybox.js';
import { GREY } from './style.js';
import { land, float } from './land.js';
import { level } from './tide.js';

export { footing, tag };

// A car, 1 wide and 2 long, pointing along x ('x') or y ('y'), its wheels at z.
// In water, only what's above it shows.
export function car(ctx, x, y, z, color, along = 'y', label = null, t = 0, water = null) {
  const [w, d] = along === 'x' ? [2, 1] : [1, 2];
  const draw = (g) => {
    box(g, x - w / 2, y - d / 2, z + 0.15, w, d, 0.55, color, { flat: true });
    const [cw, cd] = along === 'x' ? [1.1, 0.9] : [0.9, 1.1];
    box(g, x - cw / 2, y - cd / 2, z + 0.7, cw, cd, 0.45, tint(C.sky, 0.3), { flat: true, top: color });
    if (label && Q.detail) tag(g, x, y, z + 1.9, label, { size: 0.36 });
  };
  if (water != null) wade(ctx, x, y, z, water, draw, 1.2);
  else draw(ctx);
}

// A boat floating on the water at its spot (or sitting on the mud when the
// tide's out). len along x or y; o: { cabin, mast, color }.
export function boat(ctx, x, y, t, o = {}) {
  const z = float(x, y, t) - 0.15;
  const along = o.along || 'x', len = o.len || 2.2, wid = o.wid || 0.9;
  const [w, d] = along === 'x' ? [len, wid] : [wid, len];
  box(ctx, x - w / 2, y - d / 2, z, w, d, 0.45, o.color || C.white, { flat: true });
  if (o.cabin) box(ctx, x - w / 4, y - d / 4, z + 0.45, w / 2.2, d / 2.2, 0.5, o.cabin, { flat: true });
  if (o.mast) {
    box(ctx, x - 0.05, y - 0.05, z + 0.45, 0.1, 0.1, o.mast, C.wood, { flat: true });
    if (Q.detail) {
      ctx.beginPath();
      const P = (px, py, pz) => [px - py, (px + py) / 2 - pz * 1.12];
      const [ax, ay] = P(x, y, z + 0.6 + o.mast), [bx, by] = P(x, y, z + 0.8), [cx, cy] = P(x + (along === 'x' ? -len * 0.45 : 0), y + (along === 'y' ? -len * 0.45 : 0), z + 0.8);
      ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx, cy); ctx.closePath();
      ctx.fillStyle = C.white; ctx.fill();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
    }
  }
  if (o.label && Q.detail) tag(ctx, x, y, z + (o.mast ? o.mast + 1.2 : 1.6), o.label, { size: 0.38 });
}

// A house (a plain block with a pitched roof), on stilts if it asks. The
// roof's ridge runs along x or y. o: { stilts, roof, ridge, label }
export function house(R, x, y, w, d, color, o = {}) {
  const z = footing(R, x, y, w, d), lift = o.stilts || 0, h = o.h || 2.2;
  R.thing(x + w, y + d, (ctx) => {
    if (lift) {
      for (const [px, py] of [[x + 0.2, y + 0.2], [x + w - 0.4, y + 0.2], [x + 0.2, y + d - 0.4], [x + w - 0.4, y + d - 0.4]]) {
        box(ctx, px, py, z, 0.2, 0.2, lift, C.wood, { flat: true });
      }
    }
    box(ctx, x, y, z + lift, w, d, h, color, { flat: true });
    const roof = o.roof || GREY.roof[0], top = z + lift + h, rise = Math.min(w, d) * 0.45;
    const P = (px, py, pz) => [px - py, (px + py) / 2 - pz * 1.12];
    const face = (pts, c) => {
      ctx.beginPath();
      pts.forEach((p, i) => { const [X, Y] = P(...p); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.closePath();
      ctx.fillStyle = c; ctx.fill();
      if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke(); }
    };
    if ((o.ridge || 'x') === 'x') {
      const m = y + d / 2;
      face([[x, y, top], [x + w, y, top], [x + w, m, top + rise], [x, m, top + rise]], shade(roof, 0.1));
      face([[x + w, y, top], [x + w, y + d, top], [x + w, m, top + rise]], shade(color, 0.08));
      face([[x, y + d, top], [x + w, y + d, top], [x + w, m, top + rise], [x, m, top + rise]], roof);
    } else {
      const m = x + w / 2;
      face([[x, y, top], [x, y + d, top], [m, y + d, top + rise], [m, y, top + rise]], shade(roof, 0.1));
      face([[x, y + d, top], [x + w, y + d, top], [m, y + d, top + rise]], shade(color, 0.2));
      face([[x + w, y, top], [x + w, y + d, top], [m, y + d, top + rise], [m, y, top + rise]], roof);
    }
    if (o.label && Q.detail) tag(ctx, x + w / 2, y + d / 2, top + rise + 0.6, o.label, { size: 0.4 });
  });
}

// A beach umbrella: a pole and a striped canopy, and a towel under it.
export function umbrella(ctx, x, y, z, color) {
  disc(ctx, x + 0.3, y + 0.2, z + 0.01, 0.55, tint(color, 0.45), { stroke: false });
  box(ctx, x - 0.04, y - 0.04, z, 0.08, 0.08, 1.9, C.white, { flat: true });
  const P = (px, py, pz) => [px - py, (px + py) / 2 - pz * 1.12];
  ctx.beginPath();
  const [tx, ty] = P(x, y, z + 2.2);
  ctx.moveTo(tx, ty);
  for (let a = 0; a <= 12; a++) {
    const u = (a / 12) * Math.PI * 2;
    const [X, Y] = P(x + Math.cos(u) * 0.95, y + Math.sin(u) * 0.95, z + 1.75);
    ctx.lineTo(X, Y);
  }
  ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke(); }
}

// A greenhead trap: the black box on legs they put along the marsh edge.
export function trap(R, x, y) {
  const z = footing(R, x - 0.4, y - 0.4, 0.8, 0.8);
  R.thing(x, y, (ctx) => {
    for (const [px, py] of [[x - 0.35, y - 0.35], [x + 0.25, y - 0.35], [x - 0.35, y + 0.25], [x + 0.25, y + 0.25]]) box(ctx, px, py, z, 0.1, 0.1, 0.9, C.wood, { flat: true });
    box(ctx, x - 0.45, y - 0.45, z + 0.9, 0.9, 0.9, 0.7, GREY.trap, { flat: true });
  });
}

// Someone, with their name over their head: standing on the ground at
// (x, y), or in the water to their waist (wade) when it's over their feet.
// p: { pose, dir, back } from a walk, look from folk(), t: the time.
export function who(ctx, x, y, z, look, name, p = {}, t = 0) {
  const L = level(t);
  const draw = (g) => person(g, x, y, z, { ...look, pose: p.pose || 'stand', dir: p.dir || 'r', back: p.back }, t);
  if (L > z + 0.05) wade(ctx, x, y, z, L, draw);
  else draw(ctx);
  if (name && Q.detail) tag(ctx, x, y, Math.max(z, L) + 3, name, { size: 0.36 });
}

// A name, standing on the ground at a spot: a label for a place in the greybox.
export function sign(R, x, y, text, h = 2) {
  const z = footing(R, x, y);
  R.air((ctx) => { if (Q.detail) tag(ctx, x, y, z + h, text, { size: 0.5, fill: alpha(C.white, 0.9) }); });
}

export { land, float, level, alpha };
