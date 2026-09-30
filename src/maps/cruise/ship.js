// The ship's own kit: every area on board stands on a deck drawn by deck(),
// so the hull, the bow's taper, the walls, the lift and the doors come out
// the same on every deck. The greybox draws with it; the art keeps it and
// dresses over it.
import { C, Q, face, poly, paint, tiles, alpha, shade, tint, onRight, paintText, box } from '../../engine/art.js';
import { SLAB } from '../../engine/iso.js';
import { DOORS, LIFT, BEAM, BOW, LENGTH, bowHalf } from './plan.js';
import { DECKS, INK } from './style.js';

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

// A long, low block with a rounded end: a lifeboat hanging on the far rail.
export function lifeboat(ctx, x, y, z, len = 4) {
  box(ctx, x, y, z, len, 1.2, 0.9, INK.sunYellow, { flat: true, top: tint(INK.sunYellow, 0.3) });
  box(ctx, x + 0.3, y + 0.1, z + 0.9, len - 0.6, 1, 0.35, INK.hullWhite, { flat: true });
}

export { LENGTH };
