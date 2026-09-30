// Moving Day's kit: the triple-decker, in greybox for now (the art replaces
// the insides of these functions and keeps what they take). A house on
// Farragut Road is three zones stacked FH apart, one per floor; each draws
// its floor, its two back walls, its stairs, its porch, and its outside
// (R.shell: the front, the south side, the bay, the roof), which shows on the
// overview and fades away when you step in (engine E11).
//
// An apartment's own units: x from the back of the house (0) to its front
// (BODY, the facade) and out over its porch (HOUSE_W); y along the road, from
// the house's north side (0) to its south side (HOUSE_D). Its floor is at 0.
import { C, Q, box, face, rect, paintText, alpha, shade, tint, mix } from '../../engine/art.js';
import { FH, HOUSE_W, HOUSE_D, FRONT, ROW_X0 } from './plan.js';
import { nightK } from './clock.js';
import { tag, drawBlock } from '../greybox.js';
import { LIT } from './style.js';

export const BODY = FRONT - ROW_X0; // 12.5: the facade, from the back of the house
export { HOUSE_W, HOUSE_D, FH };
const SLAB_T = 0.45; // a floor's thickness
// The porches, and the bay window stack beside them (the front door is under
// the porches, into the stair hall along the north side, the back wall, so
// nothing in the hall stands between you and the rooms).
export const BAY = { y0: 5, y1: 8.4, out: 1.4 };
export const PORCH = { y0: 0, y1: 4.4, x0: BODY, x1: HOUSE_W - 0.2 };
export const HALL = { y0: 0, y1: 2 }; // the stair hall, along the back wall
// Each flight climbs a floor, toward the back: [x at the bottom, x at the top].
export const FLIGHTS = [[12.2, 7.2], [7.2, 2.2]];
export const DOOR = { y: 1, w: 1.2 };

// Where someone on the stairs is, going up from floor f's front door (0 to
// 1 along the flight), in the apartment's units: for the walkers (day.js).
export const stairPoint = (f, k) => {
  const [a, b] = FLIGHTS[f];
  return [a + (b - a) * k, (HALL.y0 + HALL.y1) / 2, f * FH + FH * k];
};

// ---------- One floor of a house ----------
// o: { floor: 0, 1 or 2, siding, trim, glass, name (painted on the floor),
//      lit(t): 0..1, whether its windows are lit tonight }
export function apartment(R, o) {
  const f = o.floor, siding = o.siding, trim = o.trim || C.white;
  const floorInk = o.floorInk || C.woodLight;
  // The floor, with a hole where the stairs from below come up.
  const hole = f > 0 ? [FLIGHTS[f - 1][1], HALL.y0, FLIGHTS[f - 1][0] + 0.3, HALL.y1] : null;
  R.floor((ctx) => {
    const parts = hole
      ? [[0, HALL.y1, BODY, HOUSE_D], [0, 0, hole[0], HALL.y1], [hole[2], 0, BODY, HALL.y1]]
      : [[0, 0, BODY, HOUSE_D]];
    for (const [x0, y0, x1, y1] of parts) {
      face(ctx, [[x1, y0, 0], [x1, y1, 0], [x1, y1, -SLAB_T], [x1, y0, -SLAB_T]], shade(floorInk, 0.15));
      face(ctx, [[x0, y1, 0], [x1, y1, 0], [x1, y1, -SLAB_T], [x0, y1, -SLAB_T]], shade(floorInk, 0.3), { dots: shade(floorInk, 0.6), density: 0.25 });
      rect(ctx, x0, y0, x1 - x0, y1 - y0, 0, floorInk, { lw: 0.03 });
    }
    // Rooms, as lines on the floor: the front room (the bay), the middle, the kitchen at the back.
    ctx.save();
    ctx.globalAlpha *= 0.35;
    for (const x of [4.2, 8.4]) face(ctx, [[x, HALL.y1, 0.01], [x + 0.08, HALL.y1, 0.01], [x + 0.08, HOUSE_D, 0.01], [x, HOUSE_D, 0.01]], C.ink, { stroke: false });
    ctx.restore();
    if (o.name) paintText(ctx, 'floor', 6.2, 5.6, o.name, 0.72, alpha(C.ink, 0.25));
  });
  R.walls({ h: FH, left: tint(siding, 0.55), right: tint(siding, 0.4) });

  // The stairs up from this floor (not from the top one).
  if (f < 2) {
    const [a, b] = FLIGHTS[f], n = 11;
    for (let i = 0; i < n; i++) {
      const x = a + ((b - a) * (i + 1)) / n, w = Math.abs(b - a) / n, zt = (FH * (i + 1)) / n;
      R.thing(x + w / 2, HALL.y1 - 0.2, (ctx) => box(ctx, x, HALL.y0 + 0.2, zt - 0.4, w, HALL.y1 - HALL.y0 - 0.4, 0.4, C.wood, { flat: true }));
    }
  }
  // The stairwell's banister, where the stairs from below come up.
  if (hole) R.thing((hole[0] + hole[2]) / 2, HALL.y1, (ctx) => box(ctx, hole[0], HALL.y1 - 0.08, 0, hole[2] - hole[0] - 0.3, 0.08, 1, trim, { flat: true }));

  // The porch: floor, rail, posts (always showing: people stand out on it).
  R.thing(PORCH.x1, PORCH.y1 - 0.1, (ctx) => {
    box(ctx, PORCH.x0, PORCH.y0, -SLAB_T, PORCH.x1 - PORCH.x0, PORCH.y1 - PORCH.y0, SLAB_T, trim, { flat: true, top: C.woodLight });
    // The rail along the front, low.
    box(ctx, PORCH.x1 - 0.12, PORCH.y0, 1, 0.12, PORCH.y1 - PORCH.y0, 0.12, trim, { flat: true });
    for (const y of [PORCH.y0 + 0.1, (PORCH.y0 + PORCH.y1) / 2, PORCH.y1 - 0.25]) box(ctx, PORCH.x1 - 0.2, y, 0, 0.18, 0.18, FH - SLAB_T, trim, { flat: true });
  });

  // ---------- The outside ----------
  const top = f === 2 ? FH + 0.4 : FH - SLAB_T;
  const zb = -SLAB_T;
  const sid = siding, side = shade(siding, 0.22);
  const glass = tint(C.sky, 0.25);
  const windows = (ctx, ink) => {
    // Front: the bay's three sides (two show), and one beside the door.
    const bx = BODY + BAY.out;
    for (const [y0, y1] of [[BAY.y0 + 0.4, BAY.y0 + 1.5], [BAY.y0 + 2.0, BAY.y1 - 0.4]]) face(ctx, [[bx, y0, 1.2], [bx, y1, 1.2], [bx, y1, 3.3], [bx, y0, 3.3]], ink);
    face(ctx, [[BODY, 2.6, 1.2], [BODY, 3.8, 1.2], [BODY, 3.8, 3.3], [BODY, 2.6, 3.3]], ink);
    // Side: three down the south wall.
    for (const x of [1.4, 5.4, 9.4]) face(ctx, [[x, HOUSE_D, 1.2], [x + 1.4, HOUSE_D, 1.2], [x + 1.4, HOUSE_D, 3.3], [x, HOUSE_D, 3.3]], ink);
  };
  R.shell((ctx) => {
    // The south side, then the front, then the bay on it. (Its box: the
    // house behind its front, so the porch and whoever's on it go on after.)
    face(ctx, [[0, HOUSE_D, zb], [BODY, HOUSE_D, zb], [BODY, HOUSE_D, top], [0, HOUSE_D, top]], side, { dots: shade(siding, 0.5), density: 0.18 });
    face(ctx, [[BODY, 0, zb], [BODY, HOUSE_D, zb], [BODY, HOUSE_D, top], [BODY, 0, top]], sid);
    box(ctx, BODY, BAY.y0, zb, BAY.out, BAY.y1 - BAY.y0, top - zb, sid, { flat: true, top: f === 2 ? tint(sid, 0.2) : sid });
    // Clapboard lines, faint.
    ctx.save();
    ctx.globalAlpha *= 0.18;
    for (let z = zb + 0.5; z < top; z += 0.5) face(ctx, [[BODY, 0, z], [BODY, HOUSE_D, z], [BODY, HOUSE_D, z + 0.04], [BODY, 0, z + 0.04]], C.ink, { stroke: false });
    ctx.restore();
    windows(ctx, glass);
    // The front door, on the ground floor, under the porch.
    if (f === 0) face(ctx, [[BODY, DOOR.y - DOOR.w / 2, 0], [BODY, DOOR.y + DOOR.w / 2, 0], [BODY, DOOR.y + DOOR.w / 2, 3.1], [BODY, DOOR.y - DOOR.w / 2, 3.1]], C.navy);
    // The roof: flat, with a cornice.
    if (f === 2) {
      face(ctx, [[0, 0, top], [BODY, 0, top], [BODY, HOUSE_D, top], [0, HOUSE_D, top]], shade(C.greyLight, 0.1));
      box(ctx, BODY - 0.3, -0.2, top - 0.5, 0.6 + BAY.out, HOUSE_D + 0.4, 0.5, trim, { flat: true });
      box(ctx, -0.2, HOUSE_D - 0.3, top - 0.5, BODY + 0.2, 0.5, 0.5, trim, { flat: true });
    }
    if (o.label && Q.detail) tag(ctx, BODY + 0.6, HOUSE_D / 2, top + (f === 2 ? 1 : -1.4), o.label, { size: 0.42 });
  }, { box: [0, 0, BODY, HOUSE_D] });
  // Windows lit after dark (a still picture, faded in with the night).
  R.shell((ctx) => windows(ctx, LIT), { fade: (t) => Math.round(nightK(t) * 8) / 8 * (o.lit ? o.lit(t) : 1) });
}

// ---------- A whole house, closed ----------
// For the rest of the row (not enterable): three floors, porches and roof,
// drawn as one still thing by Farragut Road. (x, y) is its back corner, z its
// ground; lit(t) as above.
export function house(ctx, x, y, z, siding, trim = C.white) {
  const H = FH * 3 + 0.4;
  const side = shade(siding, 0.22);
  face(ctx, [[x, y + HOUSE_D, z], [x + BODY, y + HOUSE_D, z], [x + BODY, y + HOUSE_D, z + H], [x, y + HOUSE_D, z + H]], side, { dots: shade(siding, 0.5), density: 0.18 });
  face(ctx, [[x + BODY, y, z], [x + BODY, y + HOUSE_D, z], [x + BODY, y + HOUSE_D, z + H], [x + BODY, y, z + H]], siding);
  face(ctx, [[x, y, z + H], [x + BODY, y, z + H], [x + BODY, y + HOUSE_D, z + H], [x, y + HOUSE_D, z + H]], shade(C.greyLight, 0.1));
  box(ctx, x + BODY, y + BAY.y0, z, BAY.out, BAY.y1 - BAY.y0, H, siding, { flat: true });
  for (let f = 0; f < 3; f++) {
    const zf = z + f * FH;
    box(ctx, x + PORCH.x0, y + PORCH.y0, zf, PORCH.x1 - PORCH.x0, PORCH.y1 - PORCH.y0, 0.4, trim, { flat: true, top: C.woodLight });
    box(ctx, x + PORCH.x1 - 0.2, y + PORCH.y1 - 0.25, zf, 0.18, 0.18, FH, trim, { flat: true });
    box(ctx, x + PORCH.x1 - 0.2, y + PORCH.y0 + 0.1, zf, 0.18, 0.18, FH, trim, { flat: true });
    for (const [y0, y1] of [[BAY.y0 + 0.4, BAY.y0 + 1.5], [BAY.y0 + 2.0, BAY.y1 - 0.4]]) {
      const bx = x + BODY + BAY.out;
      face(ctx, [[bx, y + y0, zf + 1.2], [bx, y + y1, zf + 1.2], [bx, y + y1, zf + 3.3], [bx, y + y0, zf + 3.3]], tint(C.sky, 0.25));
    }
  }
  box(ctx, x + BODY - 0.3, y - 0.2, z + H - 0.5, 0.6 + BAY.out, HOUSE_D + 0.4, 0.5, trim, { flat: true });
}

// ---------- Greybox furniture ----------
// A labeled block that's only there some of the time (when(t): the old
// tenant's things before noon, the new tenant's after). Still, so cached.
export function stuff(R, x, y, w, d, h, color, name, when = null, o = {}) {
  R.thing(x + w / 2, y + d / 2, (ctx) => drawBlock(ctx, x, y, o.z || 0, w, d, h, color, name, { size: 0.36 }), when ? { on: when } : {});
}
