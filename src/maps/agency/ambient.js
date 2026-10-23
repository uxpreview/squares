// Around Pitch Day: what's drawn under and over its areas. Under: the woods on
// every side, in plain blocks for now (pines and maples, leaves down), print
// marks and a caption. Over: birds, and the geese's parade when it's all
// found.
import { C, box, alpha, tint, shade } from '../../engine/art.js';
import { reg, birds, geeseV } from '../shared.js';
import { W, D, BW } from './plan.js';
import { INK } from './style.js';

// Trees in rings round the map: behind the building (y < 0), at the left end
// (x < 0), across the road (y > D) and past the drive (x > W). [x, y, kind]
const TREES = [];
for (let x = -14; x < W + 14; x += 3.4) for (let r = 0; r < 3; r++) TREES.push([x + (r % 2) * 1.6, -3 - r * 3.2, (x * 7 + r) % 3]);
for (let y = 0; y < D + 12; y += 3.2) for (let r = 0; r < 3; r++) TREES.push([-3 - r * 3.4, y + (r % 2) * 1.5, (y * 5 + r) % 3]);
// (Across the road and past the drive the woods are in front of the lot, so
// they're drawn over it, in the sky: short ones, so they never hide a find.)
const FRONT_TREES = [];
for (let x = -6; x < W + 8; x += 4.2) FRONT_TREES.push([x, D + 3.2 + ((x * 3) % 2), ((Math.floor(x) % 3) + 3) % 3]);
for (let y = -4; y < D; y += 4) FRONT_TREES.push([W + 3.2 + ((y * 5) % 2), y, ((Math.floor(y) % 3) + 3) % 3]);
const tone = [INK.pine, INK.maple, tint(INK.maple, 0.3)];

function trees(ctx, list, tall) {
  for (const [x, y, k] of list) {
    const i = ((Math.floor(k) % 3) + 3) % 3, c = tone[i];
    box(ctx, x - 0.2, y - 0.2, 0, 0.4, 0.4, 1.4, shade(C.brown, 0.1), { flat: true });
    box(ctx, x - 1, y - 1, 1.4, 2, 2, (i < 1 ? 4.2 : 3) * tall, c, { flat: true });
  }
}

export function backdrop(ctx, t, world) {
  trees(ctx, TREES, 1);
  const ink = alpha(C.ink, 0.5);
  reg(ctx, (W - D) / 2, -20, ink);
  reg(ctx, (W - D) / 2, (W + D) / 2 + 10, ink);
  const k = 40;
  ctx.save();
  ctx.translate(-D + 2, D / 2 + 26);
  ctx.scale(1 / k, 1 / k);
  ctx.font = `${0.9 * k}px "Rethink Sans", system-ui, sans-serif`;
  ctx.fillStyle = ink;
  ctx.textBaseline = 'middle';
  ctx.fillText('GOOSE AT LARGE  ·  PITCH DAY  ·  PRIMAL, A DIGITAL AGENCY  ·  GREYBOX', 0, 0);
  ctx.restore();
  void BW;
}

export function sky(ctx, t, world, fx) {
  const [X0, X1] = world.overviewBox(false);
  trees(ctx, FRONT_TREES, 0.6);
  birds(ctx, t, 0, (X1 - X0) / 2);
  if (fx.parade) geeseV(ctx, t, fx.parade, world.totalGeese, (X1 - X0) / 2);
}
