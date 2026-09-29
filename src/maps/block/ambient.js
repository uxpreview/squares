// Things that fly over the whole block rather than living in one room: the
// blimp and the paper plane. (The birds are in shared.js.)

import { C, paint, shade } from '../../engine/art.js';
import { P3 } from '../shared.js';
import { SIZE } from './plan.js';

// The blimp, with its banner. It flies top right to bottom left, nose to the
// lower left, over the back rows (the Launch Pad and the Lido): well above the
// stage when you're on Main Street, and under the title (block.md, 37).
// o: { at: where across the block, from, to: where along it it starts and ends }
export function blimp(ctx, t, o = {}) {
  const period = 95;
  const k = ((t % period) + period) % period / period;
  const from = o.from ?? -40, to = o.to ?? SIZE + 30;
  const x = o.at ?? SIZE * 0.33, y = from + k * (to - from);
  const z = 17 + Math.sin(t * 0.5) * 0.4;
  const [X, Y] = P3(x, y, z);

  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(-1, 1); // mirrored: flying to the lower left
  ctx.rotate(0.46);
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
  ctx.scale(-1, 1); // the banner still reads left to right
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

// A paper plane that loops lazily over the middle of the block.
export function plane(ctx, t, span = SIZE) {
  const a = t * 0.22;
  const cx = span / 2, cy = span / 2;
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

