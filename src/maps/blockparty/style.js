// The Block, connected: the style sheet. Every street takes its colors and
// shared props from here. The Block's plate is the game's own: the cream
// paper and the six inks in C (src/engine/art.js), halftone dots, the
// registration marks. The streets add a grey-lilac road ink with cream kerbs,
// and the bunting is in the six inks. The brief: docs/levels/block.md.
//
// A day on the Block (day.js) changes the plate itself: warm at dawn, full at
// noon, amber at the party, navy at night with the windows lit. Its colors are
// here too.
import { C, Q, mix, tint, shade, alpha, box, rect, paint } from '../../engine/art.js';
import { ZK } from '../../engine/iso.js';

export const STREET = {
  road: mix(C.grey, C.lilac, 0.35),
  roadDots: shade(mix(C.grey, C.lilac, 0.35), 0.25),
  line: C.white,
  kerb: C.white,
  alley: mix(C.greyLight, C.brown, 0.18),
  cobble: shade(mix(C.greyLight, C.brown, 0.18), 0.12),
  pavement: tint(C.greyLight, 0.25),
  slab: C.grey,
};

// Greybox blocks on the streets: one color per kind of thing, so the plan
// reads at a glance.
export const BLOCK = {
  party: C.coral, // the stage and everything for the party
  street: C.navy, // lamp posts, bins, signs
  stall: C.mustard, // carts and stands
  green: C.green,
};

// The six inks, for bunting.
export const BUNTING = [C.coral, C.mustard, C.teal, C.navy, C.blush, C.purple];

// ---------- The day's plate ----------
// The paper through the day, by the hour. day.js blends between them.
export const PAPER = [
  [0, C.night],
  [4, C.night],
  [5.5, mix(C.paper, C.blush, 0.55)], // dawn
  [8, C.paper],
  [17, C.paper],
  [19, mix(C.paper, C.mustard, 0.45)], // the party, at sunset
  [20.5, mix(C.coral, C.purple, 0.55)], // dusk
  [22, C.night],
  [24, C.night],
];

// ---------- Shared props ----------
// A lamp post: a pole and a lamp. (x, y) in the area's own units.
export function lampPost(ctx, x, y, lit = 0) {
  box(ctx, x - 0.15, y - 0.15, 0, 0.3, 0.3, 4.4, C.navy, { flat: true });
  box(ctx, x - 0.4, y - 0.4, 4.4, 0.8, 0.8, 0.45, lit > 0.5 ? C.butter : C.white, { flat: true });
}

// A "Have you seen this goose?" poster, facing the viewer, on a post at height z.
export function poster(ctx, x, y, z) {
  if (!Q.detail) return;
  const X = x - y, Y = (x + y) / 2 - z * ZK;
  ctx.beginPath();
  ctx.rect(X - 0.45, Y - 0.6, 0.9, 1.1);
  paint(ctx, C.white, { lw: 0.04 });
  ctx.beginPath();
  ctx.ellipse(X, Y - 0.05, 0.22, 0.16, 0, 0, Math.PI * 2);
  ctx.fillStyle = C.ink;
  ctx.fill();
}

// A string of bunting from a to b (world or area units, [x, y, z]), sagging.
export function bunting(ctx, a, b, t = 0, n = 14) {
  const P = (x, y, z) => [x - y, (x + y) / 2 - z * ZK];
  const at = (k) => {
    const sag = Math.sin(k * Math.PI) * 0.9;
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k - sag];
  };
  ctx.beginPath();
  for (let i = 0; i <= 20; i++) {
    const [X, Y] = P(...at(i / 20));
    i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
  }
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.05;
  ctx.stroke();
  for (let i = 1; i < n; i++) {
    const [X, Y] = P(...at(i / n));
    const sway = Math.sin(t * 2 + i) * 0.05;
    ctx.beginPath();
    ctx.moveTo(X - 0.28, Y);
    ctx.lineTo(X + 0.28, Y);
    ctx.lineTo(X + sway, Y + 0.6);
    ctx.closePath();
    paint(ctx, BUNTING[i % BUNTING.length], { lw: 0.03 });
  }
}

// Night on a street: its ground darkens (the lamps and what stands on it keep
// their color, lit by the lamps). Drawn flat, so it goes after the rugs.
// dark(t): 0 by day to 1 at night.
export function dusk(R, dark, k = 0.55) {
  R.rug((ctx, t) => {
    const a = dark(t) * k;
    if (a < 0.01) return;
    for (const [x0, y0, x1, y1] of R.shape) rect(ctx, x0, y0, x1 - x0, y1 - y0, 0, alpha(C.night, a), { stroke: false });
  }, { anim: true });
}
