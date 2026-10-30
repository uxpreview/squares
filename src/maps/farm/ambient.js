// Around the Farm: what's drawn under the areas (the backdrop) and over them
// (the sky). Greybox: the marsh and the sea beyond the back edge, Plum Island
// on the horizon, and labels.
import { C, alpha } from '../../engine/art.js';
import { reg, birds, geeseV } from '../shared.js';

export function backdrop(ctx, t, world) {
  const [X0, X1, Y0, Y1] = world.overviewBox(false);
  reg(ctx, (X0 + X1) / 2, Y0 + 1);
  reg(ctx, (X0 + X1) / 2, Y1 - 1);
}

export function sky(ctx, t, world, fx) {
  const [X0, X1] = world.overviewBox(false);
  birds(ctx, t, 0, (X1 - X0) / 2);
  if (fx.parade) geeseV(ctx, t, fx.parade, world.totalGeese, (X1 - X0) / 2);
}
