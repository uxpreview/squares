// Around the ship: the sea it sails on (the paper itself, which follows the
// day), its wake, the foam where the hull meets the water, and, over the
// crew deck, the sea seen from the side, so everything below the waterline
// looks like it's in an aquarium. Step into the crew deck and the water
// steps aside.
import { Q, alpha, shade, tint } from '../../engine/art.js';
import { birds, P3 } from '../shared.js';
import { SEA, LENGTH, BEAM, BOW, DECK } from './plan.js';
import { seaAt, hourOf } from './style.js';
import { SLAB } from '../../engine/iso.js';

const KEEL = DECK.crew - SLAB - 1.6; // the bottom of the hull

// How fast the ship's going: full ahead all day, slowing into port at 6pm.
export const way = (t) => {
  const h = hourOf(t);
  if (h < 17) return 1;
  if (h < 18) return 1 - (h - 17);
  return 0;
};

// The cut side and the bow, where the sea meets the hull, in world units.
const WATERLINE = [[0, BEAM], [BOW, BEAM], [LENGTH, BEAM / 2]];

function path(ctx, pts) {
  ctx.beginPath();
  pts.forEach(([x, y, z], i) => {
    const [X, Y] = P3(x, y, z);
    i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
  });
}

export function backdrop(ctx, t, world, fx) {
  const sea = seaAt(t);
  const foam = tint(sea, 0.7);
  const k = way(t);
  // The wake: two long lines of foam spreading out behind the stern.
  if (k > 0.02) {
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const d = ((t * 3 + i * 9) % 60);
      const spread = 1 + d * 0.28;
      const a = alpha(foam, 0.55 * k * (1 - d / 60));
      ctx.strokeStyle = a;
      ctx.lineWidth = 0.35;
      for (const s of [-1, 1]) {
        path(ctx, [[-d, BEAM / 2 + s * spread, SEA], [-d - 3, BEAM / 2 + s * (spread + 0.8), SEA]]);
        ctx.stroke();
      }
    }
    // The churn right behind the propellers.
    ctx.fillStyle = alpha(foam, 0.5 * k);
    for (let i = 0; i < 12; i++) {
      const d = (t * 4 + i * 1.7) % 14;
      const [X, Y] = P3(-1 - d, BEAM / 2 + Math.sin(i * 2.3) * (1 + d * 0.3), SEA);
      ctx.beginPath();
      ctx.ellipse(X, Y, 0.5, 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  // Glints on the open sea, drifting past.
  if (Q.detail) {
    ctx.save();
    ctx.strokeStyle = alpha(foam, 0.35);
    ctx.lineWidth = 0.18;
    ctx.lineCap = 'round';
    for (let i = 0; i < 40; i++) {
      const gx = ((i * 37.3) % 150) - 40 - ((t * 2 * (0.3 + k)) % 150);
      const gy = ((i * 53.1) % 90) - 30;
      const x = ((gx + 190) % 150) - 40;
      if (x > -2 && x < LENGTH + 2 && gy > -2 && gy < BEAM + 2) continue; // not under the ship
      const [X, Y] = P3(x, gy, SEA);
      ctx.beginPath();
      ctx.moveTo(X - 0.5, Y);
      ctx.lineTo(X + 0.5, Y);
      ctx.stroke();
    }
    ctx.restore();
  }
}

export function sky(ctx, t, world, fx) {
  const sea = seaAt(t);
  // The sea over the hull below the waterline, unless you're down there.
  const below = fx.focus && fx.focus.oz < DECK.promenade - 0.5;
  if (!below) {
    ctx.save();
    path(ctx, [...WATERLINE.map(([x, y]) => [x, y, SEA]), ...WATERLINE.slice().reverse().map(([x, y]) => [x, y, KEEL])]);
    ctx.closePath();
    ctx.fillStyle = alpha(shade(sea, 0.15), 0.55);
    ctx.fill();
    ctx.restore();
  }
  // The waterline: a wavy line of foam where the sea meets the hull.
  ctx.save();
  ctx.strokeStyle = tint(sea, 0.75);
  ctx.lineWidth = 0.22;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < WATERLINE.length - 1; i++) {
    const [x0, y0] = WATERLINE[i], [x1, y1] = WATERLINE[i + 1];
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 1.5);
    for (let j = 0; j <= n; j++) {
      const u = j / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u;
      const [X, Y] = P3(x, y, SEA + Math.sin(t * 2.2 + x * 0.6) * 0.12);
      i + j === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y);
    }
  }
  ctx.stroke();
  ctx.restore();
  // Gulls, following the ship for the buffet.
  birds(ctx, t, 0, 60, 30);
  birds(ctx, t + 17, 1, 60, 34);
}

