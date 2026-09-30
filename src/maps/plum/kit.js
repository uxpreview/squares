// Plum Island's shared pieces: cars, boats, beach houses, umbrellas,
// greenhead traps, signs on posts, people standing or wading, and the lights
// that come on after dark. Every area and the day's cast (day.js) draws with
// these, so the island is one hand. All in world units (the areas sit at the
// map's corner), standing on the island's ground or floating on its water.
import { C, Q, box, disc, face, person, paint, paintText, glow, alpha, shade, tint, mix } from '../../engine/art.js';
import { ZK } from '../../engine/iso.js';
import { wade } from '../../engine/terrain.js';
import { tag, footing } from '../greybox.js';
import { GREY, HOUSE, INK, LIT, lightsOn } from './style.js';
import { land, float } from './land.js';
import { level, nightK } from './tide.js';

export { footing, tag };

const P = (x, y, z) => [x - y, (x + y) / 2 - z * ZK];
// A flat shape through world points, filled and outlined.
function shape(ctx, pts, fill, o) {
  ctx.beginPath();
  pts.forEach((p, i) => { const [X, Y] = P(...p); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
  ctx.closePath();
  paint(ctx, fill, o);
}

// ---------- Cars ----------
// A car, 1 wide and 2 long, pointing along x ('x') or y ('y'), its wheels at
// z: a low body, a cabin with its windows, wheels peeking out under the
// sides, and a roof rack or a surfboard if asked. In water (a flooded road),
// only what's above it shows. o: { rack, board, dir (1: the front toward +x
// or +y, the default; -1 the other way) }
export function car(ctx, x, y, z, color, along = 'y', label = null, t = 0, water = null, o = {}) {
  const X = along === 'x';
  const [w, d] = X ? [2, 1] : [1, 2];
  const draw = (g) => {
    // Wheels: dark stubs at the four corners, under the body.
    if (Q.detail) {
      const wh = X ? [[-0.62, 0.42], [0.62, 0.42], [-0.62, -0.42], [0.62, -0.42]] : [[0.42, -0.62], [0.42, 0.62], [-0.42, -0.62], [-0.42, 0.62]];
      for (const [dx, dy] of wh) box(g, x + dx - 0.13, y + dy - 0.13, z, 0.26, 0.26, 0.28, C.ink, { flat: true, lw: 0.03 });
    }
    box(g, x - w / 2, y - d / 2, z + 0.16, w, d, 0.48, color, { flat: true, lw: 0.045 });
    // The cabin, set back a little from the front, glass all round.
    const back = 0.1 * (o.dir || 1); // the cabin sits back from the bonnet
    const [cw, cd, cx, cy] = X ? [1.05, 0.84, x - back, y] : [0.84, 1.05, x, y - back];
    const glass = mix(tint(C.sky, 0.25), color, 0.12);
    box(g, cx - cw / 2, cy - cd / 2, z + 0.64, cw, cd, 0.4, glass, { flat: true, top: tint(color, 0.08), left: shade(glass, 0.12), right: glass, lw: 0.04 });
    // Pillars between the windows, so it reads as a cabin, not a box.
    if (Q.detail) {
      g.strokeStyle = tint(color, 0.05);
      g.lineWidth = 0.07;
      g.beginPath();
      if (X) {
        for (const u of [cx - cw / 2 + 0.04, cx + 0.05, cx + cw / 2 - 0.04]) { const [a, b] = P(u, cy + cd / 2, z + 0.66), [c, e] = P(u, cy + cd / 2, z + 1.02); g.moveTo(a, b); g.lineTo(c, e); }
      } else {
        for (const v of [cy - cd / 2 + 0.04, cy + 0.05, cy + cd / 2 - 0.04]) { const [a, b] = P(cx + cw / 2, v, z + 0.66), [c, e] = P(cx + cw / 2, v, z + 1.02); g.moveTo(a, b); g.lineTo(c, e); }
      }
      g.stroke();
    }
    if (o.board) box(g, cx - (X ? 0.9 : 0.16), cy - (X ? 0.16 : 0.9), z + 1.06, X ? 1.8 : 0.32, X ? 0.32 : 1.8, 0.08, o.board, { flat: true, lw: 0.03 });
    else if (o.rack) box(g, cx - cw / 2 + 0.1, cy - cd / 2 + 0.1, z + 1.05, cw - 0.2, cd - 0.2, 0.06, C.ink, { flat: true, stroke: false });
  };
  if (water != null) wade(ctx, x, y, z, water, draw, 1.2);
  else draw(ctx);
}
// A car's headlights after dark, as a glow on the road ahead of it: call from
// the car's own draw with its heading (+1 or -1 along its axis).
export function headlights(ctx, x, y, z, along, sign, t) {
  const k = nightK(t);
  if (k < 0.3) return;
  const dx = along === 'x' ? sign * 1.6 : 0, dy = along === 'y' ? sign * 1.6 : 0;
  glow(ctx, x + dx, y + dy, z + 0.4, 1.4, LIT, k * 0.8);
}

// ---------- Boats ----------
// A boat floating at its spot (or sitting on the mud when the tide's out):
// a hull with a pointed bow, and a cabin, a mast and sail, or a stripe.
// len along x or y; o: { along, len, wid, dir (1: bow toward +x or +y, -1
// the other way), color, stripe, cabin, mast, sail, heel }
export function boat(ctx, x, y, t, o = {}) {
  const z = float(x, y, t) - 0.15 + (o.bob === false ? 0 : 0.04 * Math.sin(t * 1.7 + x));
  const along = o.along || 'x', len = o.len || 2.2, wid = o.wid || 0.9, dir = o.dir || 1;
  const hull = o.color || C.white, deckZ = z + 0.45;
  // Its outline, in (u along, v across), the bow at +u.
  const out = [[-len / 2, -wid / 2], [len * 0.18, -wid / 2], [len / 2, 0], [len * 0.18, wid / 2], [-len / 2, wid / 2]];
  const W = ([u, v], zz) => (along === 'x' ? [x + u * dir, y + v, zz] : [x + v, y + u * dir, zz]);
  // The hull's sides, back ones first, then the deck.
  const sides = out.map((p, i) => [p, out[(i + 1) % out.length]])
    .map(([a, b]) => ({ a, b, k: W(a, 0)[0] + W(a, 0)[1] + W(b, 0)[0] + W(b, 0)[1] }))
    .sort((m, n) => m.k - n.k);
  for (const { a, b } of sides) {
    const q = [W(a, z + 0.06), W(b, z + 0.06), W(b, deckZ), W(a, deckZ)];
    shape(ctx, q, shade(hull, 0.14), { lw: 0.04 });
    if (o.stripe && Q.detail) shape(ctx, [W(a, deckZ - 0.16), W(b, deckZ - 0.16), W(b, deckZ - 0.06), W(a, deckZ - 0.06)], o.stripe, { stroke: false });
  }
  shape(ctx, out.map((p) => W([p[0] * 0.96, p[1] * 0.9], deckZ)), o.deck || tint(C.woodLight, 0.2), { lw: 0.04 });
  if (o.cabin) {
    const [cx, cy] = along === 'x' ? [x - len * 0.12 * dir, y] : [x, y - len * 0.12 * dir];
    const cw = along === 'x' ? len * 0.36 : wid * 0.62, cd = along === 'x' ? wid * 0.62 : len * 0.36;
    box(ctx, cx - cw / 2, cy - cd / 2, deckZ, cw, cd, 0.55, o.cabin, { flat: true, lw: 0.04 });
    if (Q.detail) box(ctx, cx - cw / 2 - 0.02, cy - cd / 2 - 0.02, deckZ + 0.55, cw + 0.04, cd + 0.04, 0.06, C.white, { flat: true, lw: 0.03 });
  }
  if (o.mast) {
    const heel = o.heel || 0;
    box(ctx, x - 0.05, y - 0.05, deckZ, 0.1, 0.1, o.mast, C.wood, { flat: true, lw: 0.03 });
    if (Q.detail) {
      const back = along === 'x' ? [-len * 0.45 * dir, 0] : [0, -len * 0.45 * dir];
      const top = [x + heel, y, deckZ + o.mast], foot = [x, y, deckZ + 0.35], clew = [x + back[0], y + back[1], deckZ + 0.35];
      shape(ctx, [top, foot, clew], o.sail || C.white, { lw: 0.04 });
      if (o.jib !== false) {
        const fwd = along === 'x' ? [len * 0.42 * dir, 0] : [0, len * 0.42 * dir];
        shape(ctx, [[x + heel * 0.8, y, deckZ + o.mast * 0.85], [x + fwd[0], y + fwd[1], deckZ + 0.2], [x, y, deckZ + 0.4]], tint(o.sail || C.white, 0.2), { lw: 0.035 });
      }
    }
  }
  if (o.label && Q.detail) tag(ctx, x, y, z + (o.mast ? o.mast + 1.2 : 1.6), o.label, { size: 0.38 });
}

// ---------- Beach houses ----------
// A beach house: cedar shingle or paint, white trim, windows on the two sides
// you can see and a door, a pitched roof, on pilings if it asks, with its
// windows lit after dark (and a glow) unless it's empty. color: a HOUSE index
// (or a color). o: { stilts, h, ridge ('x' or 'y'), roof, trim, door, deck,
// dark (no lights), label }
export function house(R, x, y, w, d, color, o = {}) {
  const i = typeof color === 'number' ? color : 0;
  const body = typeof color === 'number' ? HOUSE.body[i % HOUSE.body.length] : color;
  const roof = o.roof || HOUSE.roof[i % HOUSE.roof.length];
  const trim = o.trim || HOUSE.trim, door = o.door || HOUSE.door[i % HOUSE.door.length];
  const z = footing(R, x, y, w, d), lift = o.stilts || 0, h = o.h || 2.2;
  const z0 = z + lift, top = z0 + h, rise = Math.min(w, d) * 0.45;
  // Windows on each face: [along the face, from the left], 0 to 1.
  const winL = w > 2.2 ? [0.25, 0.72] : [0.5], winR = d > 2 ? [0.3, 0.75] : [0.55];
  const doorAt = w > 2.2 ? 0.5 : null; // a door between the windows on the lower-left face
  const wz = z0 + h * 0.42, wh = Math.min(0.75, h * 0.34);
  // The face along x (at y + d, facing lower left): u from x; along y (at x + w): v from y.
  const onL = (u0, u1, z1, z2) => [[x + u0, y + d, z1], [x + u1, y + d, z1], [x + u1, y + d, z2], [x + u0, y + d, z2]];
  const onR = (v0, v1, z1, z2) => [[x + w, y + v0, z1], [x + w, y + v1, z1], [x + w, y + v1, z2], [x + w, y + v0, z2]];
  const windows = (ctx, glass, frame) => {
    for (const k of winL) {
      if (doorAt != null && Math.abs(k - doorAt) < 0.12) continue;
      face(ctx, onL(w * k - 0.28, w * k + 0.28, wz, wz + wh), glass, { lw: 0.035, stroke: frame });
    }
    for (const k of winR) face(ctx, onR(d * k - 0.26, d * k + 0.26, wz, wz + wh), glass, { lw: 0.035, stroke: frame });
  };
  R.thing(x + w, y + d, (ctx) => {
    if (lift) {
      for (const [px, py] of [[x + 0.15, y + 0.15], [x + w - 0.35, y + 0.15], [x + 0.15, y + d - 0.35], [x + w - 0.35, y + d - 0.35], [x + w / 2 - 0.1, y + d - 0.35], [x + w - 0.35, y + d / 2 - 0.1]]) {
        box(ctx, px, py, z - 0.3, 0.2, 0.2, lift + 0.3, shade(C.wood, 0.15), { flat: true, lw: 0.03 });
      }
      if (Q.detail) {
        // Cross-bracing between the front pilings.
        ctx.strokeStyle = shade(C.wood, 0.3); ctx.lineWidth = 0.05; ctx.beginPath();
        const [a, b] = P(x + 0.25, y + d - 0.25, z + 0.1), [c, e] = P(x + w - 0.25, y + d - 0.25, z0 - 0.1);
        const [f, g] = P(x + 0.25, y + d - 0.25, z0 - 0.1), [m, n] = P(x + w - 0.25, y + d - 0.25, z + 0.1);
        ctx.moveTo(a, b); ctx.lineTo(c, e); ctx.moveTo(f, g); ctx.lineTo(m, n); ctx.stroke();
      }
    }
    box(ctx, x, y, z0, w, d, h, body, { dotsL: shade(body, 0.5), dens: 0.16, lw: 0.05 });
    // Shingle courses on the two faces you see.
    if (Q.detail) {
      ctx.strokeStyle = alpha(shade(body, 0.35), 0.5); ctx.lineWidth = 0.025; ctx.beginPath();
      for (let zz = z0 + 0.3; zz < top - 0.05; zz += 0.3) {
        const [a, b] = P(x, y + d, zz), [c, e] = P(x + w, y + d, zz), [f, g] = P(x + w, y, zz);
        ctx.moveTo(a, b); ctx.lineTo(c, e); ctx.lineTo(f, g);
      }
      ctx.stroke();
    }
    windows(ctx, HOUSE.glass, trim);
    if (doorAt != null) face(ctx, onL(w * doorAt - 0.27, w * doorAt + 0.27, z0, z0 + Math.min(1.5, h * 0.7)), door, { lw: 0.04 });
    // Corner boards, in the trim.
    ctx.strokeStyle = trim; ctx.lineWidth = 0.08; ctx.beginPath();
    for (const [cx, cy] of [[x, y + d], [x + w, y + d], [x + w, y]]) { const [a, b] = P(cx, cy, z0 + 0.04), [c, e] = P(cx, cy, top - 0.02); ctx.moveTo(a, b); ctx.lineTo(c, e); }
    ctx.stroke();
    // The roof.
    const lw = 0.05;
    if ((o.ridge || 'x') === 'x') {
      const m = y + d / 2;
      shape(ctx, [[x, y, top], [x + w, y, top], [x + w, m, top + rise], [x, m, top + rise]], shade(roof, 0.12), { lw });
      shape(ctx, [[x + w, y, top], [x + w, y + d, top], [x + w, m, top + rise]], shade(body, 0.06), { lw, stroke: trim });
      shape(ctx, [[x, y + d, top], [x + w, y + d, top], [x + w, m, top + rise], [x, m, top + rise]], roof, { lw, dots: Q.detail ? shade(roof, 0.4) : null, density: 0.14 });
    } else {
      const m = x + w / 2;
      shape(ctx, [[x, y, top], [x, y + d, top], [m, y + d, top + rise], [m, y, top + rise]], shade(roof, 0.12), { lw });
      shape(ctx, [[x, y + d, top], [x + w, y + d, top], [m, y + d, top + rise]], shade(body, 0.16), { lw, stroke: trim });
      shape(ctx, [[x + w, y, top], [x + w, y + d, top], [m, y + d, top + rise], [m, y, top + rise]], roof, { lw, dots: Q.detail ? shade(roof, 0.4) : null, density: 0.14 });
    }
    if (o.label && Q.detail) tag(ctx, x + w / 2, y + d / 2, top + rise + 0.6, o.label, { size: 0.4 });
  });
  if (o.dark) return;
  // After dark, the windows lit (a still picture, stamped while the lights
  // are on) and a glow round the house.
  R.thing(x + w + 0.01, y + d + 0.01, (ctx) => windows(ctx, LIT, trim), { on: lightsOn });
  R.light({ at: [x + w * 0.6, y + d * 0.8, wz + wh / 2], r: 2.2, color: LIT, k: (t) => nightK(t) * 0.55 });
}

// ---------- Beach things ----------
// A beach umbrella over a striped towel: a white pole and a canopy in the
// color and white, in eight panels.
export function umbrella(ctx, x, y, z, color, o = {}) {
  if (o.towel !== false) {
    const tw = o.towelColor || tint(color, 0.35);
    shape(ctx, [[x - 0.2, y - 0.1, z + 0.02], [x + 0.9, y - 0.1, z + 0.02], [x + 0.9, y + 0.55, z + 0.02], [x - 0.2, y + 0.55, z + 0.02]], tw, { lw: 0.03 });
    if (Q.detail) shape(ctx, [[x + 0.15, y - 0.1, z + 0.02], [x + 0.3, y - 0.1, z + 0.02], [x + 0.3, y + 0.55, z + 0.02], [x + 0.15, y + 0.55, z + 0.02]], C.white, { stroke: false });
  }
  box(ctx, x - 0.04, y - 0.04, z, 0.08, 0.08, 2.1, C.white, { flat: true, lw: 0.03 });
  const tipZ = z + 2.25, rim = (a) => [x + Math.cos(a) * 0.95, y + Math.sin(a) * 0.95, z + 1.78];
  const n = 8;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2, b = ((k + 1) / n) * Math.PI * 2;
    shape(ctx, [[x, y, tipZ], rim(a), rim(b)], k % 2 ? C.white : color, { lw: 0.035 });
  }
  if (Q.detail) disc(ctx, x, y, tipZ + 0.02, 0.07, color, { lw: 0.02 });
}

// A greenhead trap: the blue box on legs they put along the marsh edge
// (greenheads go for big dark shapes, fly up inside, and can't get out).
export function trap(R, x, y) {
  const z = footing(R, x - 0.4, y - 0.4, 0.8, 0.8);
  R.thing(x, y, (ctx) => {
    for (const [px, py] of [[x - 0.4, y - 0.4], [x + 0.3, y - 0.4], [x - 0.4, y + 0.3], [x + 0.3, y + 0.3]]) box(ctx, px, py, z, 0.1, 0.1, 0.95, C.wood, { flat: true, lw: 0.03 });
    box(ctx, x - 0.45, y - 0.45, z + 0.9, 0.9, 0.9, 0.62, GREY.trap, { dotsL: shade(GREY.trap, 0.5), lw: 0.04 });
    // The screen on top, where they end up.
    box(ctx, x - 0.3, y - 0.3, z + 1.52, 0.6, 0.6, 0.18, tint(C.grey, 0.4), { flat: true, lw: 0.03 });
  });
}

// ---------- Signs ----------
// A board with lettering on it, upright, in the plane along x ('x': it faces
// the viewer's lower left) or along y ('y': the lower right), centred on
// (x, y, z), w wide and h tall. o: { board, ink, size, font, edge }
export function board(ctx, along, x, y, z, w, h, text, o = {}) {
  const pts = along === 'x'
    ? [[x - w / 2, y, z - h / 2], [x + w / 2, y, z - h / 2], [x + w / 2, y, z + h / 2], [x - w / 2, y, z + h / 2]]
    : [[x, y - w / 2, z - h / 2], [x, y + w / 2, z - h / 2], [x, y + w / 2, z + h / 2], [x, y - w / 2, z + h / 2]];
  face(ctx, pts, o.board || C.white, { lw: o.edge ?? 0.05 });
  if (!text || !Q.detail) return;
  ctx.save();
  // paintText draws on the planes through the corner; move there.
  const [dx, dy] = along === 'x' ? P(0, y, 0) : P(x, 0, 0);
  ctx.translate(dx, dy);
  paintText(ctx, along === 'x' ? 'right' : 'left', along === 'x' ? x : y, z, text, o.size || h * 0.5, o.ink || C.ink, o.font || '"Rethink Sans"');
  ctx.restore();
}
// A sign on a post (or two), standing on the ground at (x, y): the lettering
// on a board facing along x or y. o: { along, w, h (the board's), post (its
// height to the board's middle), board, ink, size, posts: 1 or 2 }
export function signpost(R, x, y, text, o = {}) {
  const along = o.along || 'x', w = o.w || Math.max(1.2, text.length * 0.22), bh = o.h || 0.7, post = o.post || 1.4;
  const z = footing(R, x, y);
  R.thing(x + 0.1, y + 0.1, (ctx) => {
    const n = o.posts || (w > 1.8 ? 2 : 1);
    for (let k = 0; k < n; k++) {
      const off = n === 1 ? 0 : (k ? 1 : -1) * (w / 2 - 0.2);
      const [px, py] = along === 'x' ? [x + off, y] : [x, y + off];
      box(ctx, px - 0.05, py - 0.05, z, 0.1, 0.1, post + bh / 2, o.postColor || C.wood, { flat: true, lw: 0.03 });
    }
    board(ctx, along, x + (along === 'y' ? 0.06 : 0), y + (along === 'x' ? 0.06 : 0), z + post, w, bh, text, o);
  });
}

// A name, standing on the ground at a spot: a label for a place in the greybox.
// (The art replaces these with signposts, or nothing.)
export function sign(R, x, y, text, h = 2) {
  const z = footing(R, x, y);
  R.air((ctx) => { if (Q.detail) tag(ctx, x, y, z + h, text, { size: 0.5, fill: alpha(C.white, 0.9) }); });
}

// ---------- People ----------
// Someone standing on the ground at (x, y), or in the water to their waist
// (wade) when it's over their feet. p: { pose, dir, back, scale } from a walk,
// look from folk(), t: the time. (name is kept for the greybox's calls and
// not drawn: in the art, who someone is shows in what they're doing.)
export function who(ctx, x, y, z, look, name, p = {}, t = 0) {
  const L = level(t);
  const draw = (g) => person(g, x, y, z, { ...look, pose: p.pose || 'stand', dir: p.dir || 'r', back: p.back, ...(p.scale ? { scale: p.scale } : {}) }, t);
  if (L > z + 0.05) wade(ctx, x, y, z, L, draw);
  else draw(ctx);
}

// ---------- Lights after dark ----------
// A glow that comes on with the dark, at (x, y, z), r across.
export function nightGlow(R, x, y, z, r = 2.5, color = LIT, k = 1) {
  R.light({ at: [x, y, z], r, color, k: (t) => nightK(t) * k });
}

export { land, float, level, alpha, INK, LIT, lightsOn };
