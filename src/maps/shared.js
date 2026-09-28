// Pieces any map can use for its backdrop and sky: print marks, birds, and
// the all-geese victory lap. Everything draws in world iso units.
import { ZK } from '../engine/iso.js';
import { C, alpha, paint } from '../engine/art.js';

// A 3D point to world iso space.
export const P3 = (x, y, z) => [x - y, (x + y) / 2 - z * ZK];

// A registration mark, like the ones in the margins of a printed sheet.
export function reg(ctx, X, Y, ink = null) {
  ctx.save();
  ctx.strokeStyle = alpha(ink || C.ink, 0.5);
  ctx.lineWidth = 0.12;
  ctx.beginPath();
  ctx.arc(X, Y, 1, 0, Math.PI * 2);
  ctx.moveTo(X - 1.8, Y); ctx.lineTo(X + 1.8, Y);
  ctx.moveTo(X, Y - 1.8); ctx.lineTo(X, Y + 1.8);
  ctx.stroke();
  ctx.restore();
}

// A small flock of ink-line birds crossing a map about `span` units across.
export function birds(ctx, t, n, span, z0 = 22) {
  const period = 34;
  const k = ((t % period) + period) % period / period;
  const x = span * (0.2 + n * 0.5) - 30 + k * 60;
  const y = span * (1.1 - n * 0.5) - k * 70;
  const z = z0 + n * 3;
  const flock = [[0, 0], [-1.2, 1], [-1.2, -1], [-2.4, 2], [-2.4, -2], [-3.6, 2.8]];
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.14;
  ctx.lineCap = 'round';
  flock.forEach(([dx, dy], i) => {
    const [X, Y] = P3(x + dx, y + dy + dx * 0.3, z + Math.sin(t * 2 + i) * 0.2);
    const f = Math.sin(t * 10 + i * 1.3) * 0.35;
    ctx.beginPath();
    ctx.moveTo(X - 0.6, Y - f);
    ctx.quadraticCurveTo(X - 0.25, Y - 0.2, X, Y);
    ctx.quadraticCurveTo(X + 0.25, Y - 0.2, X + 0.6, Y - f);
    ctx.stroke();
  });
}

// The victory lap: every goose (n) in a V, flying low across a map about
// `span` units across, at height z. age: seconds since the lap started.
export function geeseV(ctx, t, age, n, span, z0 = 14) {
  const k = (age % 14) / 14;
  const cx = -30 + k * (span + 60), cy = span + 20 - k * (span + 40);
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1, rank = Math.ceil(i / 2);
    const x = cx - rank * 2.2, y = cy + side * rank * 2.2 + rank * 0.6;
    const z = z0 + Math.sin(t * 2 + i) * 0.3;
    const [X, Y] = P3(x, y, z);
    const flap = Math.sin(t * 7 + i * 0.7);
    ctx.save();
    ctx.translate(X, Y);
    ctx.scale(1.3, 1.3);
    // wings
    ctx.beginPath();
    ctx.moveTo(-0.2, 0); ctx.quadraticCurveTo(-0.5, -0.8 * flap, -1.1, -1.1 * flap);
    ctx.lineTo(0.1, -0.05);
    ctx.moveTo(-0.2, 0.05); ctx.quadraticCurveTo(0.1, -0.6 * flap, -0.2, -1.3 * flap);
    ctx.lineTo(0.3, 0);
    paint(ctx, C.greyLight, { lw: 0.05 });
    // body, neck, head, beak
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.55, 0.2, -0.46, 0, Math.PI * 2);
    paint(ctx, C.white, { lw: 0.05 });
    ctx.beginPath();
    ctx.moveTo(0.4, -0.2); ctx.lineTo(0.85, -0.45);
    ctx.strokeStyle = C.white; ctx.lineWidth = 0.14; ctx.lineCap = 'round'; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0.95, -0.5); ctx.lineTo(1.2, -0.58); ctx.lineTo(0.97, -0.42);
    ctx.fillStyle = C.coral; ctx.fill();
    ctx.restore();
  }
}
