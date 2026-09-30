// Around Plum Island: what's drawn under and over the island (the backdrop
// and the sky). The paper is the sea (style.js), so the page's marks and
// words are printed in cream on it. Across the river at the right-hand edge,
// Newburyport's steeples and the Salisbury jetty, as a skyline only
// (decision 32). The banner plane, clouds and gulls go here too.
import { C, Q, box, alpha, mix } from '../../engine/art.js';
import { reg, birds } from '../shared.js';
import { tag } from '../greybox.js';
import { W, D } from './land.js';
import { nightK } from './tide.js';
import { INK } from './style.js';
import { follow } from './finale.js';

import { paperAt } from './style.js';
export { paperAt };

// Newburyport on the far bank, upriver (past the back edge, at the right),
// and the Salisbury jetty across the river mouth: blocks on the paper.
const STEEPLES = [[97, -7, 7.5], [101, -9.5, 6], [104.5, -6.5, 8.5], [108, -10, 5.5], [111, -7.5, 6.5]];
function farBank(ctx, t) {
  // Faint, like something across the water: cream a little way into the paper.
  const ink = mix(paperAt(t), INK.cream, nightK(t) > 0.5 ? 0.18 : 0.32);
  // A low line of shore and roofs, then the steeples over it, thin.
  for (let i = 0; i < 9; i++) {
    const x = 95 + i * 2.2, y = -5.5 - (i % 3) * 1.2;
    box(ctx, x, y, 0, 1.8, 1.2, 0.6 + (i % 4) * 0.25, ink, { flat: true, stroke: false });
  }
  for (const [x, y, hgt] of STEEPLES) {
    box(ctx, x, y, 0, 0.5, 0.5, hgt * 0.55, ink, { flat: true, stroke: false });
  }
  // The Salisbury jetty, out from the far side of the river mouth.
  for (let i = 0; i < 10; i++) box(ctx, 116 + i * 0.3, 8 + i * 1.8, -0.4, 1.2, 1.2, 1.1, ink, { flat: true, stroke: false });
  if (Q.detail) {
    tag(ctx, 104.5, -6.5, 6.6, 'NEWBURYPORT', { size: 0.5, fill: alpha(C.white, 0.85) });
    tag(ctx, 118, 16, 2.6, 'SALISBURY JETTY', { size: 0.4, fill: alpha(C.white, 0.85) });
  }
}

// Registration marks round the sheet, and its caption, in cream.
export function backdrop(ctx, t) {
  const ink = INK.cream;
  ctx.save();
  farBank(ctx, t);
  reg(ctx, (W - D) / 2, -9, ink);
  reg(ctx, (W - D) / 2, (W + D) / 2 + 8, ink);
  reg(ctx, -D - 6, D / 2, ink);
  reg(ctx, W + 6, W / 2, ink);
  const k = 40;
  ctx.translate(-D + 4, D / 2 + 20);
  ctx.scale(1 / k, 1 / k);
  ctx.font = `${0.9 * k}px "Rethink Sans", system-ui, sans-serif`;
  ctx.fillStyle = alpha(ink, 0.6);
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
