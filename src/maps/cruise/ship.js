// The ship's own kit: every area on board stands on a deck drawn by deck(),
// so the hull, the bow's taper, the walls, the lift and the doors come out
// the same on every deck. The greybox draws with it; the art keeps it and
// dresses over it.
import { C, Q, face, poly, paint, tiles, alpha, shade, tint, onRight, paintText, box } from '../../engine/art.js';
import { SLAB, ZK } from '../../engine/iso.js';
import { DOORS, LIFT, BEAM, BOW, LENGTH, bowHalf } from './plan.js';
import { DECKS, INK } from './style.js';

const P = (x, y, z = 0) => [x - y, (x + y) / 2 - z * ZK];

// The deck's outline in the area's own units: far side, then round the bow
// (if it reaches it), then back along the cut side.
export function outline(R) {
  const [ox] = R.origin;
  const xs = [0];
  if (ox + R.W > BOW && ox < BOW) xs.push(BOW - ox);
  xs.push(R.W);
  const far = xs.map((x) => [x, BEAM / 2 - bowHalf(ox + x)]);
  const cut = xs.slice().reverse().map((x) => [x, BEAM / 2 + bowHalf(ox + x)]);
  return far.concat(cut.filter(([x, y], i) => !(i === 0 && Math.abs(y - far[far.length - 1][1]) < 1e-6)));
}
// Does this area reach the bow?
export const atBow = (R) => R.origin[0] + R.W > BOW + 0.01;

// A deck: its floor and slab (and, under the crew deck, the hull's red
// bottom), its walls with the plan's doors, the lift's doors if the lift is
// here, and its name on the floor (greybox only).
// o: { floor, wall, grid, name, rails (open air: rails, not walls), keel }
export function deck(R, id, deckId, o = {}) {
  const D = DECKS[deckId];
  const floor = o.floor || D.floor;
  const wall = o.wall || D.wall;
  const pts = outline(R);
  R.floor((ctx) => {
    // The slab's faces along the cut side (and round the bow), then the floor.
    const hull = deckId === 'crew' ? INK.funnelRed : INK.hullWhite;
    const depth = deckId === 'crew' ? SLAB + 1.6 : SLAB;
    const edge = pts.slice(pts.findIndex(([, y]) => y > BEAM / 2 + 0.01) - 1);
    for (let i = 0; i < edge.length - 1; i++) {
      const [x0, y0] = edge[i], [x1, y1] = edge[i + 1];
      if (x1 < x0 - 0.01) {
        face(ctx, [[x0, y0, 0], [x1, y1, 0], [x1, y1, -depth], [x0, y0, -depth]], shade(hull, 0.28), { dots: shade(hull, 0.55), density: 0.22 });
      } else {
        face(ctx, [[x0, y0, 0], [x1, y1, 0], [x1, y1, -depth], [x0, y0, -depth]], shade(hull, 0.12));
      }
    }
    // Along the cut side the hull ends in a section line.
    poly(ctx, pts.map(([x, y]) => [x, y, 0]));
    paint(ctx, floor, { stroke: false });
    if (o.grid !== false) {
      ctx.save();
      poly(ctx, pts.map(([x, y]) => [x, y, 0]));
      ctx.clip();
      tiles(ctx, o.grid || 2, alpha(C.ink, 0.1), 0.03, 0, 0, R.W, R.D);
      ctx.restore();
    }
    poly(ctx, pts.map(([x, y]) => [x, y, 0]));
    ctx.lineWidth = 0.06;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
  });
  // Walls: the far side (the hull, inside) and the wall behind (a bulkhead,
  // or the stern). At the bow the far side angles in, so it's drawn here
  // rather than by the engine.
  const bow = atBow(R);
  const H = o.rails ? 1.2 : 6;
  R.walls({
    h: H,
    left: wall,
    right: bow ? false : shade(wall, 0.06),
    cap: INK.hullWhite,
    cut: C.ink,
    doors: DOORS[id] || [],
  });
  if (bow) bowWall(R, H, shade(wall, 0.06));
  if (R.origin[0] === 0 && id !== 'port') (o.rails ? liftHouse(R) : liftDoors(R, deckId));
  if (o.name !== false) R.rug((ctx) => paintText(ctx, 'floor', R.W / 2, BEAM - 2.2, o.name || D.name, 1.1, alpha(C.ink, 0.25)));
}

// The far side at the bow, straight to the taper and then angling in to the
// point: short standing pieces, each sorted in on its own.
function bowWall(R, H, color) {
  const [ox] = R.origin;
  const x0 = BOW - ox;
  const pieces = [[0, x0]];
  const n = 4;
  for (let i = 0; i < n; i++) pieces.push([x0 + ((R.W - x0) * i) / n, x0 + ((R.W - x0) * (i + 1)) / n]);
  const yAt = (x) => BEAM / 2 - bowHalf(ox + x);
  for (const [a, b] of pieces) {
    const ya = yAt(a), yb = yAt(b);
    R.thing((a + b) / 2, (ya + yb) / 2 - 0.2, (ctx) => {
      face(ctx, [[a, ya, 0], [b, yb, 0], [b, yb, H], [a, ya, H]], color, { dots: shade(color, 0.3), density: 0.08 });
      face(ctx, [[a, ya, H], [b, yb, H], [b, yb - 0.3, H], [a, ya - 0.3, H]], INK.hullWhite);
    }, { depth: -1 });
  }
}

// The lift's doors on the far wall, with the deck's name over them.
function liftDoors(R, deckId) {
  const [x, , w] = LIFT.box;
  R.decor((ctx) => {
    onRight(ctx, x - 0.3, 0, w + 0.6, 4.1, C.grey);
    onRight(ctx, x, 0, w / 2 - 0.04, 3.5, tint(C.grey, 0.45));
    onRight(ctx, x + w / 2 + 0.04, 0, w / 2 - 0.04, 3.5, tint(C.grey, 0.45));
    if (Q.detail) paintText(ctx, 'right', x + w / 2, 3.8, 'LIFT', 0.32, C.ink, 'Rethink Sans');
  });
}

// Up top, the lift comes out of a little house by the far rail.
function liftHouse(R) {
  const [x, , w] = LIFT.box;
  R.thing(x + w / 2, 0.5, (ctx) => {
    box(ctx, x - 0.3, 0, 0, w + 0.6, 0.9, 4.4, INK.hullWhite, { flat: true });
    box(ctx, x, 0.9, 0, w, 0.04, 3.5, tint(C.grey, 0.45), { flat: true });
  });
}

// A lifeboat hanging on the far rail, along x from x to x + len: a pointed
// hull with a white band and a rope down its side, a canopy with windows.
// o.rope: false leaves the side clear for a name.
export function lifeboat(ctx, x, y, z, len = 4, o = {}) {
  const w = 1.2, ym = y + w / 2, top = z + 0.9;
  const g = [[x, ym], [x + 0.7, y], [x + len - 0.7, y], [x + len, ym], [x + len - 0.7, y + w], [x + 0.7, y + w]];
  const k = [[x + 0.6, ym], [x + 1.0, y + 0.3], [x + len - 1.0, y + 0.3], [x + len - 0.6, ym], [x + len - 1.0, y + w - 0.3], [x + 1.0, y + w - 0.3]];
  // The near side of the hull, in three panels (the bow end, the middle, the stern end).
  for (const [i, j, col] of [[3, 4, shade(INK.sunYellow, 0.15)], [4, 5, INK.sunYellow], [5, 0, shade(INK.sunYellow, 0.08)]]) {
    face(ctx, [[g[i][0], g[i][1], top], [g[j][0], g[j][1], top], [k[j][0], k[j][1], z], [k[i][0], k[i][1], z]], col, { dots: shade(INK.sunYellow, 0.4), density: 0.12, lw: 0.03 });
  }
  // A white band along the gunwale, and the rope looped down the side.
  face(ctx, [[g[4][0], g[4][1], top], [g[5][0], g[5][1], top], [g[5][0] + 0.02, g[5][1] - 0.02, top - 0.18], [g[4][0] - 0.02, g[4][1] - 0.02, top - 0.18]], C.white, { lw: 0.02 });
  if (Q.detail && o.rope !== false) {
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const u = x + 0.9 + ((len - 1.8) * i) / 6;
      const [X, Y] = P(u, y + w, top - 0.2);
      if (i === 0) ctx.moveTo(X, Y);
      else { const [mx, my] = P(u - (len - 1.8) / 12, y + w, top - 0.45); ctx.quadraticCurveTo(mx, my, X, Y); }
    }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.stroke();
  }
  face(ctx, g.map(([a, b]) => [a, b, top]), shade(INK.sunYellow, 0.3), { lw: 0.03 });
  // The canopy: white, with a row of little windows.
  box(ctx, x + 0.6, y + 0.15, top, len - 1.2, w - 0.3, 0.35, INK.hullWhite, { flat: true, lw: 0.03 });
  if (Q.detail) {
    for (let i = 0; i < 4; i++) {
      const u = x + 1.1 + i * ((len - 2.2) / 3);
      const [X, Y] = P(u, y + w - 0.15, top + 0.2);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.1, 0.07, 0, 0, Math.PI * 2); paint(ctx, INK.sea, { lw: 0.02 });
    }
  }
}

export { LENGTH };
