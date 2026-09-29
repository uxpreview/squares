// Around Plum Island: what's drawn under and over the island (the backdrop
// and the sky), and the paper it's printed on through the day. Print marks
// and a caption for now; the banner plane, clouds and gulls go here.
import { C, alpha, mix } from '../../engine/art.js';
import { reg, birds } from '../shared.js';
import { W, D } from './land.js';
import { hour, nightK } from './tide.js';
import { DAY } from './style.js';
import { follow } from './finale.js';

// The paper through the day.
export function paperAt(t) {
  const h = hour(t);
  for (let i = 1; i < DAY.length; i++) {
    const [h0, c0] = DAY[i - 1], [h1, c1] = DAY[i];
    if (h <= h1) return mix(c0, c1, (h - h0) / (h1 - h0));
  }
  return DAY[0][1];
}

// Registration marks round the sheet, and its caption, in the light ink
// after dark.
export function backdrop(ctx, t) {
  const night = nightK(t) > 0.5;
  const ink = night ? C.paper : null;
  ctx.save();
  reg(ctx, (W - D) / 2, -9, ink);
  reg(ctx, (W - D) / 2, (W + D) / 2 + 8, ink);
  reg(ctx, -D - 6, D / 2, ink);
  reg(ctx, W + 6, W / 2, ink);
  const k = 40;
  ctx.translate(-D + 4, D / 2 + 20);
  ctx.scale(1 / k, 1 / k);
  ctx.font = `${0.9 * k}px "Rethink Sans", system-ui, sans-serif`;
  ctx.fillStyle = alpha(night ? C.paper : C.ink, 0.55);
  ctx.textBaseline = 'middle';
  ctx.fillText('SQUARES  ·  PLUM ISLAND  ·  KING TIDE TONIGHT  ·  GREYBOX', 0, 0);
  ctx.restore();
}

// Over the island: birds by day, and the finale's clock (finale.js).
export function sky(ctx, t, world, fx) {
  follow(fx);
  if (nightK(t) < 0.5) {
    birds(ctx, t, 0, 70);
    birds(ctx, t + 17, 1, 70);
  }
}

