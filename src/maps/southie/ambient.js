// Around Moving Day: what's drawn under the map (the backdrop: the rest of
// City Point's rooftops behind the row, Dorchester Heights' white tower far
// off at the back left, where the sun sets, the Seaport's towers and the
// port's cranes at the back) and over it (the sky: the rain from ten till
// three, and the planes landing at Logan, low over Pleasure Bay, left to
// right, about once a minute: runway 4R's arrivals).
//
// World units (plan.js). Greybox: flat silhouettes in inks mixed into the
// paper; the art replaces them.
import { C, Q, alpha, mix, shade, face, box, poly, paint } from '../../engine/art.js';
import { ZK } from '../../engine/iso.js';
import { rain } from '../../engine/weather.js';
import { reg, birds, geeseV } from '../shared.js';
import { W, D, HOUSES, HOUSE_D, ROW_X0, ROW_X1 } from './plan.js';
import { rainK, nightK, hour } from './clock.js';
import { paperAt, INK } from './style.js';
import { tag } from '../greybox.js';
import { follow } from './finale.js';

export { paperAt };
const PX = (x, y) => x - y;
const PY = (x, y, z = 0) => (x + y) / 2 - z * ZK;
const faint = (c, t, k = 0.55) => mix(c, paperAt(t), k);

// ---------- Under ----------
export function backdrop(ctx, t, world) {
  // The rest of City Point, rooftops west of the row: P Street and on.
  ctx.save();
  for (let i = 0; i < 3; i++) for (let j = 0; j < 6; j++) {
    const x = -10 - i * 12, y = 2 + j * 10;
    box(ctx, x, y, 0, 9, 8, 9 + ((i + j) % 3), faint(C.greyLight, t, 0.6), { flat: true, lw: 0.03 });
  }
  // Dorchester Heights: a hill and its white tower, far off at the back left.
  box(ctx, -70, 22, 8, 3, 3, 14, faint(C.white, t, 0.3), { flat: true });
  if (Q.detail) tag(ctx, -68.5, 23.5, 24, 'DORCHESTER HEIGHTS', { size: 0.5 });
  // The Seaport's towers, behind to the north.
  [[-30, -60, 30], [-20, -70, 38], [-8, -64, 26], [4, -72, 44]].forEach(([x, y, hh]) => box(ctx, x, y, 0, 6, 6, hh, faint(C.sky, t, 0.35), { flat: true, lw: 0.03 }));
  if (Q.detail) tag(ctx, -10, -64, 48, 'THE SEAPORT', { size: 0.5 });
  // Conley Terminal's cranes, behind Castle Island.
  [60, 68, 76].forEach((x) => box(ctx, x, -10, 0, 1.2, 1.2, 20, faint(C.coral, t, 0.3), { flat: true }));
  ctx.restore();
  // Print marks, and the caption.
  const [X0, X1, Y0, Y1] = world.overviewBox(false);
  reg(ctx, (X0 + X1) / 2, Y0 + 1);
  reg(ctx, (X0 + X1) / 2, Y1 - 1);
  const k = 40;
  ctx.save();
  ctx.translate((X0 + X1) / 2, Y1 - 4);
  ctx.scale(1 / k, 1 / k);
  ctx.font = `${0.9 * k}px "Rethink Sans", system-ui, sans-serif`;
  ctx.fillStyle = alpha(nightK(t) > 0.5 ? C.white : C.ink, 0.55);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MOVING DAY  ·  SOUTH BOSTON  ·  GREYBOX', 0, 0);
  ctx.restore();
}

// ---------- Over ----------
// The planes: on 4R's line (020°: in our units a little east for every unit
// north), over Pleasure Bay, low, coming down. One about every PLANE seconds.
export const PLANE = 57;
const DIR = [0.34, -0.94];
const OVER = [63, 30]; // where the line crosses Pleasure Bay
export function planeAt(t) {
  const k = ((t % PLANE) + PLANE) % PLANE; // seconds since the last one came in
  const s = -120 + k * 16; // units along the line
  if (s > 140) return null;
  return { x: OVER[0] + DIR[0] * s, y: OVER[1] + DIR[1] * s, z: 22 - s * 0.06, s };
}
function plane(ctx, p) {
  const { x, y, z } = p;
  // Greybox: a fuselage along the line and a pair of wings.
  const L = 5, Wd = 4.4;
  const nose = [x + DIR[0] * L, y + DIR[1] * L, z], tail = [x - DIR[0] * L, y - DIR[1] * L, z + 0.3];
  const side = [-DIR[1], DIR[0]];
  poly(ctx, [nose, [x + side[0] * 0.5, y + side[1] * 0.5, z], tail, [x - side[0] * 0.5, y - side[1] * 0.5, z]]);
  paint(ctx, C.white);
  poly(ctx, [[x + side[0] * Wd, y + side[1] * Wd, z], [x + DIR[0] * 1.2, y + DIR[1] * 1.2, z], [x - side[0] * Wd, y - side[1] * Wd, z], [x - DIR[0] * 0.8, y - DIR[1] * 0.8, z]]);
  paint(ctx, C.greyLight);
}

// Rain doesn't fall indoors: not on the houses (their roofs take it).
const HOUSE_BOXES = HOUSES.map(([, y]) => [ROW_X0, y, ROW_X1, y + HOUSE_D]);
const indoors = (x, y) => HOUSE_BOXES.some(([a, b, c, d]) => x >= a && x < c && y >= b && y < d);
export function sky(ctx, t, world, fx) {
  follow(fx);
  const r = rainK(t);
  if (r > 0.02) {
    const [vx0, vy0, vx1, vy1] = fx.view;
    // The view's box on the ground, roughly (iso back to x, y).
    const cx = (vx0 + vx1) / 2, cy = (vy0 + vy1) / 2 + 8, half = Math.max(vx1 - vx0, (vy1 - vy0) * 2) * 0.7;
    const X = cy + cx / 2, Y = cy - cx / 2;
    rain(ctx, t, {
      area: [X - half, Y - half, X + half, Y + half],
      n: Math.round((Q.detail ? 260 : 160) * r),
      top: 16,
      speed: 24,
      color: alpha(nightK(t) > 0.5 ? C.sky : C.navy, 0.35),
      skip: indoors,
    });
  }
  const p = planeAt(t);
  if (p) plane(ctx, p);
  birds(ctx, t, 0, 60, 20);
  if (fx.parade) geeseV(ctx, t, fx.parade, world.totalGeese, 60);
}
