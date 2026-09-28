// The Ball Pit's front. Its only door onto a street is the fire exit in its
// left wall (y 13.4 to 15.2), onto the alley between columns 3 and 4, so the
// sign owns up to it. A giant ball on a post reads from across the block; a
// mat says what it says. Open 9am to 6pm; 9:30 to noon is the toddlers'
// morning: the buggies park up outside and a nursery comes in on a walking
// rope and waits its turn by the pit. The wall clock tells the day's time.
import { C, Q, P, box, face, paint, shade, alpha } from '../../../engine/art.js';
import { pulse, clamp } from '../../../engine/actors.js';
import { FRONT, board, LIT } from '../style.js';
import { open, rush, nightK, hour } from '../clock.js';
import { extras } from './observatory.js';
import { words } from './noodles.js';

const ID = 'ballpit';
const INK = FRONT[ID];
const SX = -0.95, SY = 12.2; // the sign's post, out in the alley by the door
const TOP = 3.3;

// The giant ball: mustard with a coral band, a shine, halftone on its shade.
function bigBall(ctx, X, Y, r) {
  ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2);
  paint(ctx, INK.stripes[0], { dots: shade(C.mustard, 0.35), density: 0.15, lw: 0.05 });
  ctx.save();
  ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2); ctx.clip();
  ctx.beginPath(); ctx.ellipse(X, Y + r * 0.1, r * 1.1, r * 0.32, -0.35, 0, Math.PI * 2);
  paint(ctx, INK.stripes[1], { lw: 0.04 });
  ctx.restore();
  ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(X - r * 0.38, Y - r * 0.42, r * 0.18, r * 0.28, -0.6, 0, Math.PI * 2);
  ctx.fillStyle = alpha(C.white, 0.75); ctx.fill();
}

// A buggy, parked facing the alley.
function buggy(color) {
  return (ctx, t, p) => {
    const { x, y } = p;
    for (const [dx, dy] of [[-0.25, -0.3], [-0.25, 0.3], [0.2, -0.3], [0.2, 0.3]]) {
      const [X, Y] = P(x + dx, y + dy, 0.12);
      ctx.beginPath(); ctx.arc(X, Y, 0.12, 0, Math.PI * 2); paint(ctx, C.ink, { lw: 0.02 });
    }
    box(ctx, x - 0.3, y - 0.32, 0.25, 0.6, 0.64, 0.4, color, { dotsL: shade(color, 0.4), lw: 0.03 });
    // the hood, folded up over the back
    const [HX, HY] = P(x + 0.1, y, 0.65);
    ctx.beginPath(); ctx.moveTo(HX - 0.45, HY + 0.1); ctx.quadraticCurveTo(HX - 0.3, HY - 0.6, HX + 0.4, HY - 0.25); ctx.lineTo(HX + 0.3, HY + 0.2); ctx.closePath();
    paint(ctx, shade(color, 0.2), { lw: 0.03 });
    // the handle
    face(ctx, [[x + 0.3, y - 0.3, 0.6], [x + 0.55, y - 0.3, 1.25], [x + 0.55, y + 0.3, 1.25], [x + 0.3, y + 0.3, 0.6]], null, { lw: 0.05, stroke: C.ink });
  };
}

export default function (R) {
  // The post, the name, the small print and the ball on top.
  R.thing(SX, SY, (ctx) => {
    box(ctx, SX - 0.08, SY - 0.08, 0, 0.16, 0.16, TOP + 0.3, C.navy, { flat: true, stroke: false });
    board(ctx, 'y', SX, SY, TOP, 2.5, 0.8, 'BALL PIT', { board: INK.board, ink: INK.ink, size: 0.5 });
    board(ctx, 'y', SX, SY, TOP - 0.62, 2.3, 0.36, null, { board: C.white, edge: 0.03 });
    words(ctx, 'y', SX, SY, TOP - 0.62, 'FIRE EXIT. ALSO THE WAY IN.', 0.14, C.red);
    const [X, Y] = P(SX, SY, TOP + 1.25);
    bigBall(ctx, X, Y, 0.85);
  });
  // OPEN or CLOSED, on the post.
  R.thing(SX + 0.01, SY + 0.01, (ctx, t) => {
    const o = open(ID, t) > 0.5;
    board(ctx, 'y', SX - 0.05, SY, 1.6, 1.0, 0.42, o ? 'OPEN' : 'CLOSED', { board: o ? C.butter : C.greyLight, ink: C.ink, size: 0.22, edge: 0.03 });
  }, { anim: true });
  // The mat outside the fire exit (flat: people walk over it).
  R.thing(-0.1, 13.5, (ctx) => {
    face(ctx, [[-1.05, 13.55, 0.02], [-0.1, 13.55, 0.02], [-0.1, 15.05, 0.02], [-1.05, 15.05, 0.02]], C.coral, { lw: 0.03, dots: shade(C.coral, 0.3), density: 0.2 });
    if (!Q.detail) return;
    ctx.save();
    ctx.transform(1, 0.5, -1, 0.5, 0, 0);
    ctx.translate(-0.58, 14.3);
    ctx.rotate(Math.PI / 2);
    ctx.scale(1 / 40, 1 / 40);
    ctx.font = '8px "Bagel Fat One", "Arial Black", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = C.butter;
    ctx.fillText('WIPE YOUR SOCKS', 0, 0);
    ctx.restore();
  });

  // The fire exit glows at night while it's open, and the sign.
  R.light({ at: [-0.4, 14.3, 1.6], r: 2.4, color: LIT, k: (t) => nightK(t) * open(ID, t) });

  // ---------- Inside ----------
  // The wall clock (rooms/ballpit.js has it at y 9.6, z 3.1), with the day's time.
  R.decor((ctx, t) => {
    const h = hour(t), y = 9.6, z = 3.1, r = 0.45;
    ctx.save();
    const [X, Y] = P(0, y, z);
    ctx.translate(X, Y);
    ctx.transform(1, -0.5, 0, 1, 0, 0);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); paint(ctx, C.white);
    const hA = ((h % 12) / 12) * Math.PI * 2, mA = ((h % 1) * Math.PI * 2);
    ctx.strokeStyle = C.ink; ctx.lineCap = 'round';
    ctx.lineWidth = 0.09; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(hA) * r * 0.5, -Math.cos(hA) * r * 0.5); ctx.stroke();
    ctx.lineWidth = 0.06; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(mA) * r * 0.8, -Math.cos(mA) * r * 0.8); ctx.stroke();
    ctx.restore();
  }, { anim: true });

  // ---------- The toddlers' morning, 9:30 to noon ----------
  // The buggies park up outside.
  extras(R, ID, [
    { path: [[-0.6, 11.05]], seed: 0, draw: buggy(C.teal) },
    { path: [[-0.6, 10.0]], seed: 0, delay: 0.15, draw: buggy(C.coral) },
    { path: [[-0.6, 8.95]], seed: 0, delay: 0.3, draw: buggy(C.purple) },
  ]);
  // A nursery on a walking rope comes in at the fire exit and lines up along
  // the side of the pit, waiting its turn: the teacher at the front.
  const X = 4.75, LINE = [6.3, 7.2, 8.0, 8.8, 9.6];
  const via = (y) => [[-1.6, 14.3], [0.6, 14.3], [1.2, 13.6], [X, 13.6], [X, y]];
  const kid = (i, top, hat) => ({ path: via(LINE[i]), seed: 450 + i, dir: 'r', top, hat, scale: 0.55, delay: 0.05 + i * 0.07, arms: [1.25, 0.4] });
  extras(R, ID, [
    { path: via(LINE[0]), seed: 449, dir: 'r', top: C.green, hat: 'none', arms: [1.3, 2.6],
      say: (t) => (pulse(t, 8) < 0.3 ? 'ONE AT A TIME!' : null) },
    kid(1, C.coral, 'beanie'),
    { ...kid(2, C.sky, 'none'), say: (t) => (pulse(t, 6, 2) < 0.25 ? 'BALLS!' : null) },
    kid(3, C.mustard, 'cap'),
    { ...kid(4, C.pink, 'none'), pose: (t) => (pulse(t, 3) < 0.4 ? 'jump' : 'stand') },
  ]);
  // The rope, once they're all in line.
  R.mover(() => ({ x: X + 0.3, y: LINE[4] + 0.1 }), (ctx, t) => {
    const k = clamp((rush(ID, t) - 0.9) * 10);
    if (!k) return;
    ctx.save();
    ctx.globalAlpha = k;
    const a = [X + 0.35, LINE[0], 1.35], b = [X + 0.35, LINE[4] + 0.3, 0.75];
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const q = i / 12;
      const [PXx, PYy] = P(a[0], a[1] + (b[1] - a[1]) * q, a[2] + (b[2] - a[2]) * q - Math.sin(q * Math.PI * 4) * 0.06);
      i ? ctx.lineTo(PXx, PYy) : ctx.moveTo(PXx, PYy);
    }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.stroke();
    ctx.strokeStyle = C.coral; ctx.lineWidth = 0.05; ctx.stroke();
    if (Q.detail) {
      LINE.slice(1).forEach((y, i) => {
        const q = (y - a[1]) / (b[1] - a[1]);
        const [HX, HY] = P(a[0], y, a[2] + (b[2] - a[2]) * q);
        ctx.beginPath(); ctx.arc(HX, HY, 0.1, 0, Math.PI * 2); paint(ctx, [C.mustard, C.teal, C.purple, C.sky][i], { lw: 0.02 });
      });
    }
    ctx.restore();
  }, { bias: 0.5 });
}
