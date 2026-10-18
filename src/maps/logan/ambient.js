// Around Departures: what's drawn under and over its areas. Under: across the
// inner harbor behind the airport, Boston's skyline in plain blocks (the
// Seaport and Castle Island to the left, downtown in the middle, the Zakim to
// the right; logan.md, Shape), print marks and a caption. Over: the snow,
// from 3pm (clock.js), and the geese's parade when it's all found.
import { C, Q, box, alpha, tint } from '../../engine/art.js';
import { reg, birds, geeseV } from '../shared.js';
import { W, D } from './plan.js';
import { snowK } from './clock.js';
import { INK } from './style.js';

// Across the water, in world units behind the map's back edges (y < 0 is
// west, across the inner harbor; x < 0 is south, toward South Boston).
const SKYLINE = [
  // [x, y, w, d, h]
  [-26, -10, 3, 3, 3], [-21, -13, 3, 2.5, 5], [-16, -15, 3.5, 3, 6], // the Seaport
  [8, -22, 3.5, 3.5, 7], [13, -23, 3, 3, 10], [18, -22, 4, 3.5, 8], [24, -24, 3, 3, 12],
  [29, -22, 3.5, 3.5, 9], [34, -23, 3.5, 3, 11], [40, -22, 3, 3, 6], [45, -23, 4, 3.5, 8], // downtown
  [54, -22, 3, 3, 4.5], [59, -21, 3.5, 2.5, 3.5], // the North End
];
const FORT = [-30, 2, 5, 5, 1.6]; // Castle Island

export function backdrop(ctx, t, world) {
  const far = tint(INK.harbor, 0.22);
  for (const [x, y, w, d, h] of [...SKYLINE, FORT]) box(ctx, x, y, 0, w, d, h, far, { flat: true });
  // The Zakim's two towers and its cables, in a line.
  for (const x of [70, 76]) box(ctx, x, -21, 0, 0.6, 0.6, 6, far, { flat: true });
  box(ctx, 67, -21.1, 1.8, 12, 0.3, 0.3, far, { flat: true });
  const ink = alpha(INK.snow, 0.7);
  reg(ctx, (W - D) / 2, -12, ink);
  reg(ctx, (W - D) / 2, (W + D) / 2 + 8, ink);
  reg(ctx, -D - 6, D / 2, ink);
  reg(ctx, W + 6, W / 2, ink);
  const k = 40;
  ctx.save();
  ctx.translate(-D + 4, D / 2 + 22);
  ctx.scale(1 / k, 1 / k);
  ctx.font = `${0.9 * k}px "Rethink Sans", system-ui, sans-serif`;
  ctx.fillStyle = ink;
  ctx.textBaseline = 'middle';
  ctx.fillText('GOOSE AT LARGE  ·  DEPARTURES  ·  BOSTON LOGAN  ·  GREYBOX', 0, 0);
  ctx.restore();
}

export function sky(ctx, t, world, fx) {
  const [X0, X1] = world.overviewBox(false);
  birds(ctx, t, 0, (X1 - X0) / 2);
  // The snow: flakes falling over the whole airport, heavier with the storm.
  const s = snowK(t);
  if (s > 0.01 && Q.detail) {
    ctx.fillStyle = alpha(C.white, 0.85);
    const n = Math.round(160 * s);
    for (let i = 0; i < n; i++) {
      const a = (i * 97.13) % 1, b = (i * 41.77) % 1;
      const X = -D + a * (W + D) + Math.sin(t * 0.7 + i) * 0.6;
      const Y = -10 + ((b * 100 + t * 3.2) % 100);
      ctx.fillRect(X, Y, 0.18, 0.18);
    }
  }
  if (fx.parade) geeseV(ctx, t, fx.parade, world.totalGeese, (X1 - X0) / 2);
}
