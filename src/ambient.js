// Things that live on the whole map rather than in one room:
// print furniture around the plate, a blimp, and a flock of birds.

import { GRID, PITCH, S, WALL, ZK, SLAB } from './iso.js';
import { C, alpha, paint, shade, dots, Q } from './art.js';

const EXTENT = (GRID - 1) * PITCH + S;

// Registration marks, crop marks, an ink swatch strip and a plate caption,
// like the margins of a sheet fresh off a risograph.
export function drawBackdrop(ctx, t) {
  const top = -WALL * ZK - 7;
  const bottom = EXTENT + SLAB * ZK + 6;
  reg(ctx, 0, top);
  reg(ctx, 0, bottom);
  reg(ctx, -EXTENT - 6, EXTENT / 2);
  reg(ctx, EXTENT + 6, EXTENT / 2);

  // ink swatches on the right margin
  const inks = [C.navy, C.teal, C.coral, C.mustard, C.blush, C.grey];
  const sx = EXTENT - 8, sy = EXTENT * 0.78;
  inks.forEach((c, i) => {
    ctx.beginPath();
    ctx.rect(sx + i * 1.6, sy, 1.4, 1.4);
    ctx.fillStyle = c;
    ctx.fill();
  });

  const k = 40;
  ctx.save();
  ctx.translate(-EXTENT + 2, EXTENT * 0.78 + 0.7);
  ctx.scale(1 / k, 1 / k);
  ctx.font = `${0.9 * k}px "Rethink Sans", system-ui, sans-serif`;
  ctx.fillStyle = alpha(C.ink, 0.55);
  ctx.textBaseline = 'middle';
  ctx.fillText('SQUARES  ·  PLATE 1 OF 1  ·  6 INKS  ·  16 ROOMS, 1 GOOSE', 0, 0);
  ctx.restore();
}

function reg(ctx, X, Y) {
  ctx.save();
  ctx.strokeStyle = alpha(C.ink, 0.5);
  ctx.lineWidth = 0.12;
  ctx.beginPath();
  ctx.arc(X, Y, 1, 0, Math.PI * 2);
  ctx.moveTo(X - 1.8, Y); ctx.lineTo(X + 1.8, Y);
  ctx.moveTo(X, Y - 1.8); ctx.lineTo(X, Y + 1.8);
  ctx.stroke();
  ctx.restore();
}

// ---------- Blimp ----------
const P3 = (x, y, z) => [x - y, (x + y) / 2 - z * ZK];

export function drawSky(ctx, t, z) {
  blimp(ctx, t);
  birds(ctx, t, 0);
  birds(ctx, t + 17, 1);
  plane(ctx, t);
}

function blimp(ctx, t) {
  const period = 95;
  const k = ((t % period) + period) % period / period;
  const x = -40 + k * (EXTENT + 80);
  const y = EXTENT * 0.35;
  const z = 17 + Math.sin(t * 0.5) * 0.4;
  const [X, Y] = P3(x, y, z);

  ctx.save();
  ctx.translate(X, Y);
  ctx.rotate(0.46); // travelling along +x
  // banner trailing behind
  const wob = Math.sin(t * 2.2) * 0.25;
  ctx.beginPath();
  ctx.moveTo(-4.2, 0.2);
  ctx.lineTo(-6, 0.4 + wob * 0.3);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.08;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-6, -0.5 + wob * 0.3);
  ctx.quadraticCurveTo(-11, -0.5 + wob, -16.5, -0.5 - wob * 0.4);
  ctx.lineTo(-16.5, 1.3 - wob * 0.4);
  ctx.quadraticCurveTo(-11, 1.3 + wob, -6, 1.3 + wob * 0.3);
  ctx.closePath();
  paint(ctx, C.white);
  const kk = 40;
  ctx.save();
  ctx.translate(-11.25, 0.42 + wob * 0.5);
  ctx.scale(1 / kk, 1 / kk);
  ctx.font = `${0.95 * kk}px "Bagel Fat One", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = C.coral;
  ctx.fillText('HAVE YOU SEEN THIS GOOSE?', 0, 0);
  ctx.restore();

  // fins
  ctx.beginPath();
  ctx.moveTo(-3, -0.2); ctx.lineTo(-4.4, -1.6); ctx.lineTo(-3.8, -0.1);
  ctx.moveTo(-3, 0.3); ctx.lineTo(-4.4, 1.6); ctx.lineTo(-3.8, 0.2);
  paint(ctx, C.coral);
  // envelope
  ctx.beginPath();
  ctx.ellipse(0, 0, 4, 1.45, 0, 0, Math.PI * 2);
  paint(ctx, C.mustard, { dots: shade(C.mustard, 0.5), density: 0.18 });
  ctx.save();
  ctx.clip();
  ctx.fillStyle = C.coral;
  for (let i = -3; i <= 3; i += 2) ctx.fillRect(i - 0.35, -2, 0.7, 4);
  ctx.restore();
  ctx.beginPath();
  ctx.ellipse(0, 0, 4, 1.45, 0, 0, Math.PI * 2);
  paint(ctx, null);
  // gondola
  ctx.beginPath();
  ctx.roundRect(-0.9, 1.35, 1.8, 0.6, 0.2);
  paint(ctx, C.navy);
  ctx.fillStyle = C.butter;
  for (let i = 0; i < 3; i++) ctx.fillRect(-0.7 + i * 0.5, 1.5, 0.3, 0.22);
  // propeller
  const pr = Math.sin(t * 30) * 0.5;
  ctx.beginPath();
  ctx.moveTo(-1.1, 1.65 - pr); ctx.lineTo(-1.1, 1.65 + pr);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.1;
  ctx.stroke();
  ctx.restore();
}

function birds(ctx, t, n) {
  const period = 34;
  const k = ((t % period) + period) % period / period;
  const x = EXTENT * (0.2 + n * 0.5) - 30 + k * 60;
  const y = EXTENT * (1.1 - n * 0.5) - k * 70;
  const z = 22 + n * 3;
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

// A paper plane that loops lazily over the middle of the block.
function plane(ctx, t) {
  const a = t * 0.22;
  const cx = EXTENT / 2, cy = EXTENT / 2;
  const x = cx + Math.cos(a) * 30, y = cy + Math.sin(a) * 30;
  const z = 12 + Math.sin(a * 3) * 2;
  const [X, Y] = P3(x, y, z);
  const vx = -Math.sin(a), vy = Math.cos(a);
  const ang = Math.atan2((vx + vy) / 2, vx - vy);
  ctx.save();
  ctx.translate(X, Y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(1.1, 0); ctx.lineTo(-0.8, -0.6); ctx.lineTo(-0.5, 0); ctx.lineTo(-0.8, 0.5);
  ctx.closePath();
  paint(ctx, C.white);
  ctx.beginPath();
  ctx.moveTo(1.1, 0); ctx.lineTo(-0.5, 0);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.05;
  ctx.stroke();
  ctx.restore();
}

export { EXTENT };
