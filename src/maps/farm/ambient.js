// Around the Farm: what's drawn under the areas (the backdrop) and over them
// (the sky). Greybox: print marks, and over the farm the small plane that
// takes off from the airfield next door on the hour, low over the farm (at
// 4:02 it goes over the vows and the whole wedding waits for it). The marsh
// and the sea beyond the back edge, Plum Island on the horizon and
// Newburyport's steeples are the art's.
import { Q } from '../../engine/art.js';
import { reg, birds, geeseV } from '../shared.js';
import { tag, drawBlock } from '../greybox.js';
import { BLOCK } from './style.js';
import { hour } from './clock.js';
import { RUNWAY } from './plan.js';

export function backdrop(ctx, t, world) {
  const [X0, X1, Y0, Y1] = world.overviewBox(false);
  reg(ctx, (X0 + X1) / 2, Y0 + 1);
  reg(ctx, (X0 + X1) / 2, Y1 - 1);
}

// The plane: off the runway's end on the hour, 7am to 9pm, climbing
// out over the farm toward the southwest (over the house at about 4:09).
const FLY = 10 / 60; // hours it's in view
export function plane(t) {
  const h = hour(t), m = h - Math.floor(h);
  if (h < 7 || h >= 21 || m < 2 / 60 || m > 2 / 60 + FLY) return null;
  const k = (m - 2 / 60) / FLY;
  const x0 = (RUNWAY[0] + RUNWAY[2]) / 2, y0 = RUNWAY[3];
  return { x: x0 + (25 - x0) * k, y: y0 + (64.5 - y0) * k, z: 2 + 12 * k, vows: Math.floor(h) === 16 };
}

export function sky(ctx, t, world, fx) {
  const [X0, X1] = world.overviewBox(false);
  birds(ctx, t, 0, (X1 - X0) / 2);
  const p = plane(t);
  if (p) {
    drawBlock(ctx, p.x - 1.2, p.y - 0.4, p.z, 2.4, 0.8, 0.6, BLOCK.machine, null);
    drawBlock(ctx, p.x - 0.3, p.y - 1.6, p.z + 0.5, 0.6, 3.2, 0.1, BLOCK.machine, null);
    if (Q.detail) tag(ctx, p.x, p.y, p.z + 1.6, p.vows ? 'PLANE (over the vows)' : 'PLANE', { size: 0.5 });
  }
  if (fx.parade) geeseV(ctx, t, fx.parade, world.totalGeese, (X1 - X0) / 2);
}
