// Moving Day's kit: the triple-decker, drawn properly (the lead's, before the
// area artists: they furnish the insides and keep these). A house on
// Farragut Road is three zones stacked FH apart, one per floor; each draws
// its floor, its two back walls, its stairs, its porch, and its outside
// (R.shell: the front, the south side, the bay, the roof), which shows on the
// overview and fades away when you step in (engine E11).
//
// An apartment's own units: x from the back of the house (0) to its front
// (BODY, the facade) and out over its porch (HOUSE_W); y along the road, from
// the house's north side (0) to its south side (HOUSE_D). Its floor is at 0.
import { C, Q, box, face, rect, paint, paintText, alpha, shade, tint, mix } from '../../engine/art.js';
import { ZK } from '../../engine/iso.js';
import { FH, HOUSE_W, HOUSE_D, FRONT, ROW_X0 } from './plan.js';
import { nightK } from './clock.js';
import { tag, drawBlock } from '../greybox.js';
import { LIT, INK, CUP } from './style.js';
const BRICK = INK.brick;

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
// o: { floor: 0, 1 or 2, siding, trim, modern (the Grey One), door (its
//      color), floorInk, name (painted on the floor, the greybox's),
//      walls: { left, right } (the inside walls' colors),
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
  R.walls({ h: FH, left: (o.walls && o.walls.left) || tint(siding, 0.55), right: (o.walls && o.walls.right) || tint(siding, 0.4) });

  // The stairs up from this floor (not from the top one).
  if (f < 2) {
    const [a, b] = FLIGHTS[f], n = 11;
    for (let i = 0; i < n; i++) {
      const x = a + ((b - a) * (i + 1)) / n, w = Math.abs(b - a) / n, zt = (FH * (i + 1)) / n;
      R.thing(x + w / 2, HALL.y1 - 0.2, (ctx) => box(ctx, x, HALL.y0 + 0.2, zt - 0.4, w, HALL.y1 - HALL.y0 - 0.4, 0.4, C.wood, { flat: true }));
    }
  }
  // The stairwell's banister, where the stairs from below come up.
  if (hole) R.thing((hole[0] + hole[2]) / 2, HALL.y1, (ctx) => {
    const x0 = hole[0], x1 = hole[2] - 0.3;
    box(ctx, x0, HALL.y1 - 0.08, 0.95, x1 - x0, 0.1, 0.08, C.wood, { flat: true, lw: 0.025 });
    for (let x = x0 + 0.1; x < x1; x += 0.45) box(ctx, x, HALL.y1 - 0.06, 0, 0.06, 0.06, 0.95, C.wood, { flat: true, stroke: false });
  });

  // The porch (or the Grey One's balcony), always showing: people stand out
  // on it, and it stands in front of the house's outside.
  // (Its deck sorts behind whoever stands on it, its rails and posts in front.)
  R.thing(PORCH.x0 + 0.1, PORCH.y0 + 0.1, (ctx) => porch(ctx, 0, 0, 0, o, 'deck'));
  R.thing(PORCH.x1, PORCH.y1 - 0.1, (ctx) => porch(ctx, 0, 0, 0, o, 'rails'));

  // ---------- The outside ----------
  // By day, printed again in dusk inks after dark (the night printed, not
  // dimmed), and the windows lit over that.
  const band = { floor: f, top: f === 2, modern: !!o.modern, siding, trim, door: o.door };
  R.shell((ctx) => outside(ctx, 0, 0, 0, band, (c) => c), { box: [0, 0, BODY, HOUSE_D] });
  R.shell((ctx) => outside(ctx, 0, 0, 0, band, dusk), { fade: (t) => Math.round(nightK(t) * 8) / 8 });
  R.shell((ctx) => panes(ctx, 0, 0, 0, band, () => LIT), { fade: (t) => Math.round(nightK(t) * 8) / 8 * (o.lit ? o.lit(t) : 1) });
}

// ---------- Drawing a house ----------
// The pieces of a triple-decker, at (x, y, z): the back corner of one floor
// and its floor's height. band: { floor, top (the top floor: its roof),
// modern (the Grey One: vertical siding, black frames, big glass, a glass
// balcony), siding, trim, door }. ink(c): the day's inks, or the night's.
export const dusk = (c) => mix(c, C.night, 0.4);
const ZB = -SLAB_T;
const P3 = (x, y, z) => [x - y, (x + y) / 2 - z * ZK];
// A window on the front (x = at, from y u0 to u1) or the south side (y = at,
// from x u0 to u1), from z0 to z1: its frame, the glass, the sash between.
function win(ctx, plane, at, u0, u1, z0, z1, glass, frame, modern) {
  const q = (u, z) => (plane === 'x' ? [at, u, z] : [u, at, z]);
  const f = modern ? 0.08 : 0.14;
  face(ctx, [q(u0 - f, z0 - f), q(u1 + f, z0 - f), q(u1 + f, z1 + f), q(u0 - f, z1 + f)], frame, { lw: 0.03 });
  face(ctx, [q(u0, z0), q(u1, z0), q(u1, z1), q(u0, z1)], glass, { lw: 0.025 });
  if (!Q.detail) return;
  if (!modern) {
    // Double-hung: the meeting rail across the middle, and a sill.
    const zm = (z0 + z1) / 2;
    face(ctx, [q(u0, zm - 0.04), q(u1, zm - 0.04), q(u1, zm + 0.04), q(u0, zm + 0.04)], frame, { stroke: false });
    face(ctx, [q(u0 - 0.2, z0 - 0.22), q(u1 + 0.2, z0 - 0.22), q(u1 + 0.2, z0 - 0.12), q(u0 - 0.2, z0 - 0.12)], frame, { lw: 0.025 });
  } else {
    const um = (u0 + u1) / 2;
    face(ctx, [q(um - 0.03, z0), q(um + 0.03, z0), q(um + 0.03, z1), q(um - 0.03, z1)], frame, { stroke: false });
  }
}
// Where the windows go on one floor (in the floor's own units): the front,
// beside the porch door; the bay's front and its south face; the south side.
function eachWindow(band, cb) {
  const m = band.modern;
  const z0 = m ? 0.5 : 1.15, z1 = m ? 3.5 : 3.25;
  const bx = BODY + BAY.out;
  cb('x', BODY, 2.5, 3.9, z0, z1);
  if (m) cb('x', bx, BAY.y0 + 0.3, BAY.y1 - 0.3, z0, z1);
  else for (const [u0, u1] of [[BAY.y0 + 0.35, BAY.y0 + 1.5], [BAY.y0 + 1.9, BAY.y1 - 0.35]]) cb('x', bx, u0, u1, z0, z1);
  cb('y', BAY.y1, BODY + 0.3, bx - 0.3, z0, z1);
  for (const x of m ? [1.2, 6.2] : [1.4, 5.4, 9.4]) cb('y', HOUSE_D, x, x + (m ? 3.2 : 1.35), z0, z1);
}
// The windows' glass only (lit at night: glass(c) gives the ink).
export function panes(ctx, x, y, z, band, glass) {
  ctx.save();
  ctx.translate(...P3(x, y, z));
  eachWindow(band, (plane, at, u0, u1, z0, z1) => {
    const q = (u, zz) => (plane === 'x' ? [at, u, zz] : [u, at, zz]);
    face(ctx, [q(u0, z0), q(u1, z0), q(u1, z1), q(u0, z1)], glass(), { lw: 0.025 });
  });
  ctx.restore();
}
// One floor's outside: the south side, the front, the bay; clapboards (or
// panels), corner boards, the windows, the door; the roof on the top floor.
export function outside(ctx, x, y, z, band, ink) {
  const { floor, top: isTop, modern, siding } = band;
  const trim = ink(band.trim || C.white);
  const top = isTop ? FH + 0.5 : FH + ZB;
  const sid = ink(siding), side = ink(shade(siding, 0.2)), bayFront = ink(tint(siding, 0.06));
  const glass = ink(tint(C.sky, 0.3)), frame = modern ? ink(C.black) : trim;
  const bx = BODY + BAY.out;
  ctx.save();
  ctx.translate(...P3(x, y, z));
  // The south side, the front, the bay (its front and south face).
  face(ctx, [[0, HOUSE_D, ZB], [BODY, HOUSE_D, ZB], [BODY, HOUSE_D, top], [0, HOUSE_D, top]], side, { dots: ink(shade(siding, 0.45)), density: 0.14 });
  face(ctx, [[BODY, 0, ZB], [BODY, HOUSE_D, ZB], [BODY, HOUSE_D, top], [BODY, 0, top]], sid);
  face(ctx, [[BODY, BAY.y1, ZB], [bx, BAY.y1, ZB], [bx, BAY.y1, top], [BODY, BAY.y1, top]], side, { dots: ink(shade(siding, 0.45)), density: 0.14 });
  face(ctx, [[bx, BAY.y0, ZB], [bx, BAY.y1, ZB], [bx, BAY.y1, top], [bx, BAY.y0, top]], bayFront);
  // Clapboards (the old ones) or panel seams (the Grey One), faint.
  if (Q.detail) {
    ctx.save();
    ctx.globalAlpha *= 0.22;
    const line = ink(shade(siding, 0.5));
    if (!modern) {
      for (let h = ZB + 0.34; h < top - 0.1; h += 0.34) {
        face(ctx, [[BODY, 0, h], [BODY, HOUSE_D, h], [BODY, HOUSE_D, h + 0.035], [BODY, 0, h + 0.035]], line, { stroke: false });
        face(ctx, [[0, HOUSE_D, h], [BODY, HOUSE_D, h], [BODY, HOUSE_D, h + 0.035], [0, HOUSE_D, h + 0.035]], line, { stroke: false });
        face(ctx, [[bx, BAY.y0, h], [bx, BAY.y1, h], [bx, BAY.y1, h + 0.035], [bx, BAY.y0, h + 0.035]], line, { stroke: false });
      }
    } else {
      for (let u = 0.9; u < HOUSE_D; u += 0.9) face(ctx, [[BODY, u, ZB], [BODY, u + 0.04, ZB], [BODY, u + 0.04, top], [BODY, u, top]], line, { stroke: false });
      for (let u = 0.9; u < BODY; u += 0.9) face(ctx, [[u, HOUSE_D, ZB], [u + 0.04, HOUSE_D, ZB], [u + 0.04, HOUSE_D, top], [u, HOUSE_D, top]], line, { stroke: false });
    }
    ctx.restore();
  }
  // Corner boards, and the band of trim between floors.
  if (!modern) {
    const cb = (pts) => face(ctx, pts, trim, { lw: 0.025 });
    cb([[BODY - 0.25, HOUSE_D, ZB], [BODY, HOUSE_D, ZB], [BODY, HOUSE_D, top], [BODY - 0.25, HOUSE_D, top]]);
    cb([[BODY, HOUSE_D - 0.25, ZB], [BODY, HOUSE_D, ZB], [BODY, HOUSE_D, top], [BODY, HOUSE_D - 0.25, top]]);
    cb([[bx, BAY.y1 - 0.2, ZB], [bx, BAY.y1, ZB], [bx, BAY.y1, top], [bx, BAY.y1 - 0.2, top]]);
    cb([[bx, BAY.y0, ZB], [bx, BAY.y0 + 0.2, ZB], [bx, BAY.y0 + 0.2, top], [bx, BAY.y0, top]]);
    if (!isTop) {
      cb([[BODY, 0, top - 0.3], [BODY, HOUSE_D, top - 0.3], [BODY, HOUSE_D, top], [BODY, 0, top]]);
      cb([[0, HOUSE_D, top - 0.3], [BODY, HOUSE_D, top - 0.3], [BODY, HOUSE_D, top], [0, HOUSE_D, top]]);
      cb([[bx, BAY.y0, top - 0.3], [bx, BAY.y1, top - 0.3], [bx, BAY.y1, top], [bx, BAY.y0, top]]);
    }
  }
  // The windows.
  eachWindow(band, (plane, at, u0, u1, z0, z1) => win(ctx, plane, at, u0, u1, z0, z1, glass, frame, modern));
  // The door onto the porch: the front door down in the ground floor (with
  // its transom), a glass-panelled porch door above.
  {
    const d0 = DOOR.y - DOOR.w / 2, d1 = DOOR.y + DOOR.w / 2, dz = floor === 0 ? 3.0 : 2.9;
    face(ctx, [[BODY, d0 - 0.14, 0], [BODY, d1 + 0.14, 0], [BODY, d1 + 0.14, dz + 0.14], [BODY, d0 - 0.14, dz + 0.14]], frame, { lw: 0.03 });
    face(ctx, [[BODY, d0, 0], [BODY, d1, 0], [BODY, d1, dz], [BODY, d0, dz]], ink(band.door || (modern ? C.black : floor === 0 ? C.red : C.navy)), { lw: 0.03 });
    if (Q.detail) face(ctx, [[BODY, d0 + 0.18, dz * 0.5], [BODY, d1 - 0.18, dz * 0.5], [BODY, d1 - 0.18, dz - 0.2], [BODY, d0 + 0.18, dz - 0.2]], glass, { lw: 0.02 });
  }
  // The ground floor's side: three gas meters, one a flat (a triple-decker
  // tell), and the downspout.
  if (floor === 0 && Q.detail) {
    for (let i = 0; i < 3; i++) box(ctx, 3 + i * 0.55, HOUSE_D, 0.9, 0.4, 0.25, 0.5, ink(C.greyLight), { flat: true, lw: 0.025 });
  }
  if (Q.detail) face(ctx, [[BODY - 0.5, HOUSE_D + 0.01, ZB], [BODY - 0.38, HOUSE_D + 0.01, ZB], [BODY - 0.38, HOUSE_D + 0.01, top], [BODY - 0.5, HOUSE_D + 0.01, top]], ink(modern ? C.black : C.white), { lw: 0.02 });
  // The roof: flat, behind a cornice on brackets along the front and the
  // side (the Grey One: a thin black edge and a glass rail round a roof deck).
  if (isTop) {
    face(ctx, [[0, 0, top], [BODY, 0, top], [BODY, HOUSE_D, top], [0, HOUSE_D, top]], ink(shade(C.greyLight, modern ? 0.2 : 0.08)));
    if (!modern) {
      box(ctx, 1.4, 1, top, 0.6, 0.6, 0.9, ink(BRICK), { flat: true, lw: 0.03, top: ink(shade(BRICK, 0.3)) });
      box(ctx, BODY - 0.25, -0.25, top - 0.55, BAY.out + 0.55, HOUSE_D + 0.5, 0.55, trim, { flat: true, lw: 0.035 });
      box(ctx, -0.25, HOUSE_D - 0.3, top - 0.55, BODY, 0.55, 0.55, trim, { flat: true, lw: 0.035 });
      // Dentils along the cornice's face.
      if (Q.detail) {
        const cx = bx + 0.3;
        for (let u = 0; u < HOUSE_D; u += 0.45) face(ctx, [[cx, u, top - 0.42], [cx, u + 0.2, top - 0.42], [cx, u + 0.2, top - 0.2], [cx, u, top - 0.2]], ink(shade(band.trim || C.white, 0.18)), { stroke: false });
      }
    } else {
      box(ctx, BODY - 0.1, -0.1, top - 0.3, BAY.out + 0.2, HOUSE_D + 0.2, 0.3, ink(C.black), { flat: true, lw: 0.03 });
      box(ctx, -0.1, HOUSE_D - 0.1, top - 0.3, BODY, 0.2, 0.3, ink(C.black), { flat: true, lw: 0.03 });
    }
  }
  ctx.restore();
}
// A floor's porch, at (x, y, z): deck boards, balusters and a rail, turned
// posts up to the porch above (the Grey One: a glass balcony, black posts).
// part: 'deck' or 'rails' (drawn as two things, so whoever's on the porch
// stands between them), or both.
export function porch(ctx, x, y, z, band, part = null) {
  const modern = !!band.modern, trim = band.trim || C.white;
  const x0 = PORCH.x0, x1 = PORCH.x1, y0 = PORCH.y0, y1 = PORCH.y1;
  ctx.save();
  ctx.translate(...P3(x, y, z));
  if (part !== 'rails') {
    box(ctx, x0, y0, ZB, x1 - x0, y1 - y0, -ZB, modern ? C.black : trim, { flat: true, top: modern ? shade(C.greyLight, 0.1) : C.woodLight, lw: 0.035 });
    if (Q.detail && !modern) {
      ctx.save(); ctx.globalAlpha *= 0.3;
      for (let u = y0 + 0.4; u < y1; u += 0.4) face(ctx, [[x0, u, 0.005], [x1, u, 0.005], [x1, u + 0.03, 0.005], [x0, u + 0.03, 0.005]], C.brown, { stroke: false });
      ctx.restore();
    }
  }
  if (part === 'deck') { ctx.restore(); return; }
  const H = 1.05, rx = x1 - 0.14;
  if (modern) {
    face(ctx, [[rx, y0, 0], [rx, y1, 0], [rx, y1, H], [rx, y0, H]], alpha(tint(C.sky, 0.35), 0.45), { lw: 0.03 });
    face(ctx, [[x0, y1, 0], [rx, y1, 0], [rx, y1, H], [x0, y1, H]], alpha(tint(C.sky, 0.35), 0.45), { lw: 0.03 });
    box(ctx, rx - 0.04, y0, H, 0.08, y1 - y0, 0.06, C.black, { flat: true, stroke: false });
    box(ctx, x0, y1 - 0.04, H, rx - x0, 0.08, 0.06, C.black, { flat: true, stroke: false });
    for (const u of [y0 + 0.1, y1 - 0.15]) box(ctx, rx - 0.06, u, 0, 0.1, 0.1, FH + ZB, C.black, { flat: true, lw: 0.02 });
  } else {
    // Balusters along the front and the south end, then the rails.
    if (Q.detail) {
      ctx.strokeStyle = trim; ctx.lineWidth = 0.07; ctx.lineCap = 'butt';
      ctx.beginPath();
      for (let u = y0 + 0.25; u < y1 - 0.1; u += 0.28) { const [a, b] = P3(rx, u, 0.05), [c, d] = P3(rx, u, H); ctx.moveTo(a, b); ctx.lineTo(c, d); }
      for (let u = x0 + 0.25; u < rx; u += 0.28) { const [a, b] = P3(u, y1 - 0.05, 0.05), [c, d] = P3(u, y1 - 0.05, H); ctx.moveTo(a, b); ctx.lineTo(c, d); }
      ctx.stroke();
    }
    box(ctx, rx - 0.07, y0, H, 0.16, y1 - y0, 0.1, trim, { flat: true, lw: 0.03 });
    box(ctx, x0, y1 - 0.12, H, rx - x0, 0.16, 0.1, trim, { flat: true, lw: 0.03 });
    for (const u of [y0 + 0.08, (y0 + y1) / 2 - 0.1, y1 - 0.26]) {
      box(ctx, rx - 0.12, u, 0, 0.22, 0.22, FH + ZB, trim, { flat: true, lw: 0.03 });
      box(ctx, rx - 0.17, u - 0.05, FH + ZB - 0.2, 0.32, 0.32, 0.2, trim, { flat: true, lw: 0.025 });
    }
  }
  ctx.restore();
}

// ---------- A whole house, closed ----------
// For the rest of the row (not enterable): three floors, porches and roof,
// drawn as one still thing by Farragut Road. (x, y) is its back corner, z its
// ground. ink: the day's (default) or dusk, for its night print.
export function house(ctx, x, y, z, siding, trim = C.white, ink = (c) => c) {
  for (let f = 0; f < 3; f++) {
    const band = { floor: f, top: f === 2, siding, trim };
    outside(ctx, x, y, z + f * FH, band, ink);
    porch(ctx, x, y, z + f * FH, { ...band, trim: ink(trim) });
  }
}

// ---------- Greybox furniture ----------
// A labeled block that's only there some of the time (when(t): the old
// tenant's things before noon, the new tenant's after). Still, so cached.
export function stuff(R, x, y, w, d, h, color, name, when = null, o = {}) {
  R.thing(x + w / 2, y + d / 2, (ctx) => drawBlock(ctx, x, y, o.z || 0, w, d, h, color, name, { size: 0.36 }), when ? { on: when } : {});
}

// ---------- The street's things ----------
// Shared by the road, the park, the island and the cast (day.js), so it's one
// hand. All at (x, y, z) in the units of whoever draws them.
const P = P3;
function lineUp(ctx, a, b, color, lw) {
  const [x0, y0] = P(...a), [x1, y1] = P(...b);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();
}

// Lettering painted on an upright plane: along x (facing the lower left) or
// y (the lower right), centred on (x, y, z). (Plum Island's, shared.)
export function lettering(ctx, along, x, y, z, text, size, ink = C.ink, font = 'Rethink Sans') {
  if (!Q.detail) return;
  ctx.save();
  const [dx, dy] = along === 'x' ? P(0, y, 0) : P(x, 0, 0);
  ctx.translate(dx, dy);
  paintText(ctx, along === 'x' ? 'right' : 'left', along === 'x' ? x : y, z, text, size, ink, font);
  ctx.restore();
}

// A parked car, 1.7 wide and 2.8 long, along y (Farragut Road) or x: a body,
// a cabin with its glass, wheels. o: { along: 'x', dir: -1 (its front toward
// -y or -x), rack, ticket (a ticket under the wiper) }
export function car(ctx, x, y, z, color, o = {}) {
  const X = o.along === 'x';
  const [w, d] = X ? [2.8, 1.5] : [1.5, 2.8];
  if (Q.detail) {
    const wh = X ? [[-0.95, 0.62], [0.95, 0.62], [-0.95, -0.62], [0.95, -0.62]] : [[0.62, -0.95], [0.62, 0.95], [-0.62, -0.95], [-0.62, 0.95]];
    for (const [dx, dy] of wh) box(ctx, x + dx - 0.18, y + dy - 0.18, z, 0.36, 0.36, 0.36, C.ink, { flat: true, lw: 0.03 });
  }
  box(ctx, x - w / 2, y - d / 2, z + 0.2, w, d, 0.62, color, { flat: true, lw: 0.045 });
  const back = 0.18 * (o.dir || 1);
  const [cw, cd, cx, cy] = X ? [1.5, 1.26, x - back, y] : [1.26, 1.5, x, y - back];
  const glass = mix(tint(C.sky, 0.25), color, 0.12);
  box(ctx, cx - cw / 2, cy - cd / 2, z + 0.82, cw, cd, 0.5, glass, { flat: true, top: tint(color, 0.08), left: shade(glass, 0.12), right: glass, lw: 0.04 });
  if (o.rack) box(ctx, cx - cw / 2 + 0.12, cy - cd / 2 + 0.12, z + 1.33, cw - 0.24, cd - 0.24, 0.07, C.ink, { flat: true, stroke: false });
  if (o.ticket && Q.detail) box(ctx, X ? x + 0.4 : x + 0.3, X ? y + 0.3 : y + 0.4, z + 0.83, 0.3, 0.3, 0.02, C.butter, { flat: true, lw: 0.02 });
}

// The rental truck (a lookalike: orange and white, and not that name):
// HEAVE-HO, "MOVING? WE'LL HEAVE." Along y, its cab toward +y (dir 1) or -y.
export const TRUCK = { w: 2.4, d: 7, h: 3.6, name: 'HEAVE-HO', line: "MOVING? WE'LL HEAVE." };
export function truck(ctx, x, y, z, o = {}) {
  const dir = o.dir || 1, { w, d, h } = TRUCK, cab = 1.9;
  const y0 = y - d / 2, y1 = y + d / 2;
  const box0 = dir > 0 ? y0 : y0 + cab, boxLen = d - cab;
  const cabY = dir > 0 ? y1 - cab : y0;
  const orange = INK.truck;
  if (Q.detail) for (const [dx, yy] of [[w / 2 - 0.15, y0 + 1], [w / 2 - 0.15, y1 - 1], [-w / 2 + 0.15, y0 + 1], [-w / 2 + 0.15, y1 - 1]]) box(ctx, x + dx - 0.22, yy - 0.3, z, 0.44, 0.6, 0.5, C.ink, { flat: true, lw: 0.03 });
  // The cab, then the box.
  box(ctx, x - w / 2 + 0.1, cabY, z + 0.4, w - 0.2, cab, 1.4, C.white, { flat: true, lw: 0.04 });
  box(ctx, x - w / 2 + 0.1, cabY + (dir > 0 ? 0.3 : 0.05), z + 1.8, w - 0.2, cab - 0.35, 0.8, tint(C.sky, 0.25), { flat: true, lw: 0.035, top: C.white });
  box(ctx, x - w / 2, box0, z + 0.5, w, boxLen, h - 0.5, C.white, { flat: true, lw: 0.045, top: tint(C.greyLight, 0.4) });
  // The orange band and the name down the side you see (its +x side).
  face(ctx, [[x + w / 2, box0, z + 0.5], [x + w / 2, box0 + boxLen, z + 0.5], [x + w / 2, box0 + boxLen, z + 1.7], [x + w / 2, box0, z + 1.7]], orange, { lw: 0.03 });
  face(ctx, [[x - w / 2, y0 + (dir > 0 ? 0 : cab) + boxLen, z + 0.5], [x + w / 2, y0 + (dir > 0 ? 0 : cab) + boxLen, z + 0.5], [x + w / 2, y0 + (dir > 0 ? 0 : cab) + boxLen, z + h], [x - w / 2, y0 + (dir > 0 ? 0 : cab) + boxLen, z + h]], dir > 0 ? C.white : orange, { lw: 0.03 });
  lettering(ctx, 'y', x + w / 2 + 0.01, box0 + boxLen / 2, z + 2.6, TRUCK.name, 0.62, orange, 'Bagel Fat One');
  lettering(ctx, 'y', x + w / 2 + 0.01, box0 + boxLen / 2, z + 1.1, TRUCK.line, 0.24, C.white);
  if (o.roof === 'peeled' && Q.detail) {
    // Storrowed: the roof peeled back like a sardine tin.
    ctx.save();
    const a = P(x - w / 2, box0 + 0.4, z + h), b = P(x + w / 2, box0 + 0.4, z + h), c = P(x + w / 2, box0 + 1.6, z + h + 1.3), e = P(x - w / 2, box0 + 1.6, z + h + 1.3);
    ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c); ctx.lineTo(...e); ctx.closePath();
    paint(ctx, tint(C.greyLight, 0.3), { lw: 0.04 });
    ctx.restore();
  }
}

// A moving box: brown card, a strip of tape, a word in marker on the side.
export function carton(ctx, x, y, z, w = 0.9, d = 0.7, h = 0.7, word = null) {
  box(ctx, x, y, z, w, d, h, C.woodLight, { flat: true, lw: 0.035, top: tint(C.woodLight, 0.12) });
  if (!Q.detail) return;
  face(ctx, [[x + w / 2 - 0.06, y, z + h + 0.001], [x + w / 2 + 0.06, y, z + h + 0.001], [x + w / 2 + 0.06, y + d, z + h + 0.001], [x + w / 2 - 0.06, y + d, z + h + 0.001]], tint(C.butter, 0.3), { stroke: false });
  if (word) lettering(ctx, 'x', x + w / 2, y + d + 0.01, z + h / 2, word, Math.min(0.2, w / word.length * 1.4), C.ink);
}

// An iced coffee from the donut shop that isn't on the map: a clear cup,
// pink and orange band, the ice, a straw. (Iced, whatever the weather.)
export function cup(ctx, x, y, z, s = 1) {
  const r = 0.12 * s, h = 0.36 * s;
  const [X, Y] = P(x, y, z);
  ctx.save(); ctx.translate(X, Y);
  ctx.beginPath(); ctx.moveTo(-r, -h); ctx.lineTo(-r * 0.8, 0); ctx.lineTo(r * 0.8, 0); ctx.lineTo(r, -h); ctx.closePath();
  paint(ctx, mix(C.brown, C.white, 0.45), { lw: 0.025 });
  ctx.fillStyle = CUP.band; ctx.fillRect(-r * 0.9, -h * 0.55, r * 1.8, h * 0.22);
  ctx.fillStyle = CUP.lid; ctx.fillRect(-r * 0.92, -h * 0.35, r * 1.84, h * 0.1);
  ctx.strokeStyle = CUP.lid; ctx.lineWidth = 0.035; ctx.beginPath(); ctx.moveTo(r * 0.3, -h); ctx.lineTo(r * 0.6, -h - 0.18 * s); ctx.stroke();
  ctx.restore();
}

// A folding lawn chair, webbing in two colors, facing +x (the row) or -x.
export function lawnChair(ctx, x, y, z, color = C.teal, o = {}) {
  const f = o.face === -1 ? -1 : 1;
  box(ctx, x - 0.35, y - 0.35, z + 0.4, 0.7, 0.7, 0.06, color, { flat: true, lw: 0.03 });
  const bx = f > 0 ? x - 0.35 : x + 0.29;
  box(ctx, bx, y - 0.35, z + 0.46, 0.06, 0.7, 0.75, tint(color, 0.3), { flat: true, lw: 0.03 });
  if (Q.detail) for (const [dx, dy] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) lineUp(ctx, [x + dx, y + dy, z], [x + dx * 0.9, y + dy * 0.9, z + 0.4], C.greyLight, 0.05);
}

// A mattress on its side, in its recycling bag (the rules since 2022), with
// its tag.
export function mattress(ctx, x, y, z, o = {}) {
  const X = o.along === 'x';
  box(ctx, x, y, z, X ? 2.2 : 0.35, X ? 0.35 : 2.2, 1.5, C.white, { flat: true, lw: 0.04, left: tint(C.sky, 0.55), right: tint(C.sky, 0.7) });
  if (Q.detail && o.bag !== false) {
    ctx.save(); ctx.globalAlpha *= 0.35;
    box(ctx, x - 0.05, y - 0.05, z, X ? 2.3 : 0.45, X ? 0.45 : 2.3, 1.58, tint(C.sky, 0.5), { flat: true, stroke: false });
    ctx.restore();
  }
}

// ---------- The neighborhood's small things ----------
// Drawn once here, so the road, the park, the island, the cast and the rooms
// share one hand (five artists had each drawn their own).

// An umbrella over someone standing at (x, y, z): the canopy's scallops, the
// shaft down to the hand. sway: a wobble in the wind; r: its reach (a golf
// umbrella is about 1.35); top: how high the canopy sits (2.95 over someone
// standing).
export function umbrella(ctx, x, y, z, color, sway = 0, r = 0.78, top = 2.95) {
  const [X, Y] = P3(x, y, z);
  ctx.save();
  ctx.translate(X + sway, Y - top * ZK);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0.12 - sway, 1.25); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-r, 0.05);
  ctx.quadraticCurveTo(-r, -0.7 * r, 0, -0.74 * r);
  ctx.quadraticCurveTo(r, -0.7 * r, r, 0.05);
  const n = r > 1 ? 6 : 4;
  for (let i = n - 1; i >= 0; i--) { const a = -r + (i + 0.5) * (2 * r / n); ctx.quadraticCurveTo(a + r / n, -0.12, a - r / n + 0.02, 0.05); }
  ctx.closePath();
  paint(ctx, color, { lw: 0.04, dots: shade(color, 0.4), density: 0.12 });
  ctx.beginPath(); ctx.moveTo(0, -0.74 * r); ctx.lineTo(0, -0.74 * r - 0.14); ctx.stroke();
  ctx.restore();
}

// The park's green streetlight on its plinth, at (x, y) standing on z: the
// lantern's glass (butter when lit), a little roof.
export const LAMPPOST = mix(C.green, C.ink, 0.55);
export const LAMP_H = 3.9;
export function streetlight(ctx, x, y, z, lit = false) {
  box(ctx, x - 0.16, y - 0.16, z, 0.32, 0.32, 0.35, LAMPPOST, { flat: true, lw: 0.03 });
  box(ctx, x - 0.07, y - 0.07, z + 0.35, 0.14, 0.14, LAMP_H - 0.35, LAMPPOST, { flat: true, lw: 0.03 });
  const zt = z + LAMP_H;
  box(ctx, x - 0.2, y - 0.2, zt, 0.4, 0.4, 0.55, lit ? LIT : tint(C.sky, 0.45), { flat: true, lw: 0.03, top: LAMPPOST });
  const [X, Y] = P3(x, y, zt + 0.55);
  ctx.beginPath(); ctx.moveTo(X - 0.4, Y + 0.02); ctx.lineTo(X, Y - 0.34); ctx.lineTo(X + 0.4, Y + 0.02); ctx.closePath();
  paint(ctx, LAMPPOST, { lw: 0.03 });
}

// A park bench, w long: iron legs, the back, the seat in front of it. Along
// x (facing +y) or, with along: 'y', facing +x.
export function bench(ctx, x, y, z, o = {}) {
  const w = o.w || 1.7;
  if (o.along === 'y') {
    for (const dy of [0.15, w - 0.25]) box(ctx, x + 0.1, y + dy, z, 0.5, 0.1, 0.45, C.ink, { flat: true, lw: 0.02 });
    box(ctx, x - 0.05, y, z + 0.53, 0.08, w, 0.5, C.wood, { flat: true, lw: 0.03 });
    box(ctx, x, y, z + 0.45, 0.6, w, 0.08, C.wood, { flat: true, lw: 0.03 });
    return;
  }
  for (const dx of [0.15, w - 0.25]) box(ctx, x + dx, y + 0.1, z, 0.1, 0.5, 0.45, C.ink, { flat: true, lw: 0.02 });
  box(ctx, x, y - 0.05, z + 0.53, w, 0.08, 0.5, C.wood, { flat: true, lw: 0.03 });
  box(ctx, x, y, z + 0.45, w, 0.6, 0.08, C.wood, { flat: true, lw: 0.03 });
}

// A line through 3D points (a rope, a leash, a fishing line).
export function line3(ctx, pts, color, lw = 0.05) {
  ctx.beginPath();
  pts.forEach((p, i) => { const [X, Y] = P3(p[0], p[1], p[2]); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.stroke();
}

// The donut shop's iced coffee in someone's hand (a person's hold).
export function cupHeld(ctx) {
  ctx.beginPath(); ctx.moveTo(-0.11, -0.34); ctx.lineTo(-0.08, 0); ctx.lineTo(0.08, 0); ctx.lineTo(0.11, -0.34); ctx.closePath();
  paint(ctx, mix(C.brown, C.white, 0.45), { lw: 0.025 });
  ctx.fillStyle = CUP.band; ctx.fillRect(-0.1, -0.2, 0.2, 0.08);
  ctx.fillStyle = CUP.lid; ctx.fillRect(-0.11, -0.37, 0.22, 0.05);
  ctx.strokeStyle = CUP.lid; ctx.lineWidth = 0.035; ctx.beginPath(); ctx.moveTo(0.03, -0.37); ctx.lineTo(0.08, -0.55); ctx.stroke();
}

// A gull standing at (x, y, z), now and then pecking; dir -1 faces left.
export function gullStand(ctx, x, y, z, t = 0, peck = false, dir = 1) {
  const [X, Y] = P3(x, y, z);
  ctx.save(); ctx.translate(X, Y); ctx.scale(dir, 1);
  const pk = peck && Math.sin(t * 4 + x) > 0.6;
  ctx.strokeStyle = C.coral; ctx.lineWidth = 0.035;
  ctx.beginPath(); ctx.moveTo(-0.03, 0); ctx.lineTo(-0.03, -0.16); ctx.moveTo(0.05, 0); ctx.lineTo(0.05, -0.16); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -0.26, 0.24, 0.12, -0.1, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.035 });
  ctx.beginPath(); ctx.ellipse(-0.06, -0.29, 0.16, 0.065, -0.15, 0, Math.PI * 2); paint(ctx, C.grey, { stroke: false });
  const hx = pk ? 0.26 : 0.18, hy = pk ? -0.2 : -0.42;
  ctx.beginPath(); ctx.arc(hx, hy, 0.08, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.03 });
  ctx.beginPath(); ctx.moveTo(hx + 0.06, hy - 0.02); ctx.lineTo(hx + 0.2, hy + 0.01); ctx.lineTo(hx + 0.06, hy + 0.03); paint(ctx, C.mustard, { lw: 0.02 });
  ctx.restore();
}

// A pigeon at (x, y, z), bobbing (or pecking): coral feet, a grey body and
// wing, the purple-grey head, an eye. o: { dir: 'l', peck, phase }.
export function pigeon(ctx, x, y, z, t, o = {}) {
  const [X, Y] = P3(x, y, z);
  const bob = o.peck ? Math.max(0, Math.sin(t * 7 + (o.phase || 0))) * 0.12 : Math.sin(t * 5 + (o.phase || 0)) * 0.03;
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(o.dir === 'l' ? -0.8 : 0.8, 0.8);
  ctx.strokeStyle = C.coral; ctx.lineWidth = 0.05;
  ctx.beginPath(); ctx.moveTo(-0.03, -0.18); ctx.lineTo(-0.05, 0); ctx.moveTo(0.06, -0.18); ctx.lineTo(0.07, 0); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -0.3, 0.3, 0.17, -0.1, 0, Math.PI * 2);
  ctx.moveTo(-0.22, -0.32); ctx.lineTo(-0.48, -0.36); ctx.lineTo(-0.26, -0.22);
  paint(ctx, C.grey, { lw: 0.03 });
  ctx.beginPath(); ctx.ellipse(-0.05, -0.33, 0.15, 0.08, -0.2, 0, Math.PI * 2); ctx.fillStyle = shade(C.grey, 0.15); ctx.fill();
  ctx.beginPath(); ctx.arc(0.24, -0.45 + bob, 0.1, 0, Math.PI * 2); paint(ctx, mix(C.grey, C.purple, 0.3), { lw: 0.025 });
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(0.33, -0.46 + bob); ctx.lineTo(0.41, -0.43 + bob); ctx.lineTo(0.33, -0.41 + bob); ctx.fill();
  ctx.fillStyle = C.coral; ctx.beginPath(); ctx.arc(0.27, -0.47 + bob, 0.02, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// A cat at (x, y, z), its tail going: sitting (a loaf), walking, asleep, or
// cross (standing, its back up in an arch). o: { color, eyes, dir: 'l',
// walk, sleep, cross, stripes, phase }.
export function cat(ctx, x, y, z, t, o = {}) {
  const [X, Y] = P3(x, y, z);
  const col = o.color || C.ink;
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(o.dir === 'l' ? -1 : 1, 1);
  if (Q.detail && !o.cross) { ctx.beginPath(); ctx.ellipse(0, 0, 0.32, 0.12, 0, 0, Math.PI * 2); ctx.fillStyle = alpha(C.ink, 0.15); ctx.fill(); }
  const tail = Math.sin(t * (o.cross ? 6 : 1.5) + (o.phase || 0)) * 0.25;
  ctx.beginPath(); ctx.moveTo(-0.25, -0.1); ctx.quadraticCurveTo(-0.55, -0.2 + tail, -0.45, -0.6 + tail);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.13; ctx.lineCap = 'round'; ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = 0.07; ctx.stroke();
  if (o.cross) {
    ctx.beginPath();
    ctx.moveTo(-0.3, 0); ctx.lineTo(-0.28, -0.25); ctx.quadraticCurveTo(0, -0.75, 0.28, -0.3); ctx.lineTo(0.3, 0); ctx.lineTo(0.2, 0); ctx.lineTo(0.15, -0.2); ctx.lineTo(-0.15, -0.2); ctx.lineTo(-0.2, 0); ctx.closePath();
  } else if (o.walk) {
    const s = Math.sin(t * 12) * 0.08;
    ctx.strokeStyle = col; ctx.lineWidth = 0.08;
    ctx.beginPath(); ctx.moveTo(-0.18, -0.2); ctx.lineTo(-0.18 + s, 0); ctx.moveTo(0.18, -0.2); ctx.lineTo(0.18 - s, 0); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -0.3, 0.3, 0.16, 0, 0, Math.PI * 2);
  } else {
    ctx.beginPath(); ctx.ellipse(0, -0.25, 0.26, 0.25, 0, 0, Math.PI * 2);
  }
  paint(ctx, col, { lw: 0.035, dots: o.stripes ? shade(col, 0.4) : null, density: 0.3 });
  const hx = o.cross ? 0.32 : o.walk ? 0.3 : 0.12, hy = o.cross ? -0.42 : o.walk ? -0.45 : -0.58;
  ctx.beginPath(); ctx.arc(hx, hy, 0.17, 0, Math.PI * 2);
  ctx.moveTo(hx - 0.14, hy - 0.08); ctx.lineTo(hx - 0.12, hy - 0.3); ctx.lineTo(hx - 0.02, hy - 0.14);
  ctx.moveTo(hx + 0.04, hy - 0.15); ctx.lineTo(hx + 0.14, hy - 0.3); ctx.lineTo(hx + 0.16, hy - 0.06);
  paint(ctx, col, { lw: 0.035 });
  if (o.sleep) { ctx.fillStyle = C.ink; ctx.fillRect(hx - 0.07, hy - 0.01, 0.09, 0.02); ctx.fillRect(hx + 0.05, hy - 0.01, 0.09, 0.02); }
  else { ctx.fillStyle = o.eyes || C.mustard; ctx.fillRect(hx - 0.06, hy - 0.03, 0.08, 0.035); ctx.fillRect(hx + 0.06, hy - 0.03, 0.08, 0.035); }
  ctx.restore();
}
