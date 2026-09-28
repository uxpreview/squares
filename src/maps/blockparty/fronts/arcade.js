// The Neon Arcade's front: a tall neon blade on a pole in the alley (the big
// ARCADE on its wall is cut to waist height on the overview), a bike rack,
// and a mat. The pole stands at the wall's front end so that from inside,
// walls up, the blade sits clear of the wall's own art. Its door is in the left wall at
// y 12.5, onto the alley between columns 3 and 4 (people walk 2 out; things
// on the ground stay within 1.2 of the wall; the raccoon lives just along).
// Open noon to midnight, the neon off before; after school, 4pm to 7pm, the
// kids pile in and their bikes fill the rack.
import { C, Q, P, box, face, paint, label, shade, tint } from '../../../engine/art.js';
import { pulse } from '../../../engine/actors.js';
import { FRONT, board, doorstep, LIT } from '../style.js';
import { open, rush, nightK } from '../clock.js';
import { extras } from './observatory.js';

const ID = 'arcade';
const INK = FRONT[ID];
const PY = 15.75; // the pole, at the wall's front end (clear of the wall's own art inside)
const BX0 = -1.45, BX1 = -0.3, BZ0 = 2.6, BZ1 = 6.2; // the blade, sticking out over the alley

// Neon: a soft glow round a bright tube, or dark glass when it's shut.
function tube(ctx, lit, color) {
  if (lit && Q.detail) { ctx.shadowColor = color; ctx.shadowBlur = 12; }
  return lit ? tint(color, 0.35) : shade(color, 0.55);
}

export default function (R) {
  // The pole and the blade, black, for the tubes to glow on.
  R.thing(-0.2, PY, (ctx) => {
    box(ctx, -0.3, PY - 0.1, 0, 0.2, 0.2, BZ1 + 0.3, C.ink, { flat: true, stroke: false });
    for (const z of [BZ0 + 0.3, BZ1 - 0.3]) face(ctx, [[-0.2, PY, z], [BX0 + 0.1, PY, z]], null, { lw: 0.06 });
    board(ctx, 'x', (BX0 + BX1) / 2, PY, (BZ0 + BZ1) / 2, BX1 - BX0, BZ1 - BZ0, null, { board: INK.board });
    board(ctx, 'x', (BX0 + BX1) / 2, PY, BZ0 - 0.45, BX1 - BX0 + 0.3, 0.62, null, { board: C.night });
  });
  // The neon: ARCADE down the blade, on while it's open, with the odd stutter;
  // and OPEN or CLOSED on the pole.
  R.thing(-0.19, PY + 0.01, (ctx, t) => {
    const on = open(ID, t) > 0.5;
    const stutter = on && pulse(t, 6.1) > 0.93 && Math.sin(t * 70) > 0;
    if (Q.detail) {
      const x = (BX0 + BX1) / 2;
      ctx.save();
      const ink = tube(ctx, on && !stutter, INK.ink);
      'ARCADE'.split('').forEach((ch, i) => label(ctx, x, PY + 0.01, BZ1 - 0.35 - i * 0.56, ch, 0.62, ink));
      ctx.restore();
      ctx.save();
      const small = tube(ctx, on, C.tealLight);
      label(ctx, x, PY + 0.01, BZ0 - 0.32, 'HIGH SCORES', 0.17, small, 'Rethink Sans');
      label(ctx, x, PY + 0.01, BZ0 - 0.58, 'LOW PRICES', 0.17, small, 'Rethink Sans');
      ctx.restore();
    }
    board(ctx, 'y', -0.42, PY - 0.1, 1.45, 0.95, 0.4, on ? 'OPEN' : 'CLOSED', { board: on ? C.butter : C.greyLight, ink: C.ink, size: 0.22, edge: 0.03 });
  }, { anim: true });
  R.light({ at: [(BX0 + BX1) / 2, PY, (BZ0 + BZ1) / 2], r: 3.2, color: C.pink, k: (t) => nightK(t) * open(ID, t) * 0.7 });

  // A step and a mat.
  R.thing(-0.05, 11.4, (ctx) => doorstep(ctx, 'left', 12.5, 2.2, C.purple));
  // The bike rack past the door: two hoops, and bikes in it after school.
  const hoops = [14.2, 15.1];
  R.thing(-0.6, 15.6, (ctx) => {
    for (const y of hoops) {
      ctx.beginPath();
      for (let k = 0; k <= 14; k++) {
        // up one leg, over the top, down the other
        const a = Math.PI * (k - 2) / 10;
        const [u, z] = k < 2 ? [-0.35, k * 0.28] : k > 12 ? [0.35, (14 - k) * 0.28] : [-Math.cos(a) * 0.35, 0.56 + Math.sin(a) * 0.35];
        const [X, Y] = P(-0.6, y + u, z);
        k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      }
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.12; ctx.stroke();
      ctx.strokeStyle = C.grey; ctx.lineWidth = 0.06; ctx.stroke();
    }
  });
  R.thing(-0.7, 15.7, (ctx, t) => {
    const k = rush(ID, t);
    if (k < 0.2) return;
    hoops.forEach((y, i) => { if (k > 0.4 + i * 0.3 || i === 0) bike(ctx, -0.95, y, [C.coral, C.teal][i]); });
  }, { anim: true });

  // The doorway glows at night while it's open.
  R.light({ at: [-0.4, 12.5, 1.6], r: 2.6, color: LIT, k: (t) => nightK(t) * open(ID, t) });

  // ---------- After school ----------
  // In through the door and over to the air hockey and the claw.
  const IN = [[0.3, 12.3], [3.9, 12.3], [5.3, 9.8]];
  extras(R, ID, [
    { path: [...IN, [7.4, 6.5]], seed: 631, dir: 'r', back: true, top: C.navy, scale: 0.72, pose: (t) => (Math.sin(t * 1.3) > 0 ? 'cheer' : 'stand') },
    { path: [...IN, [8.6, 6.55]], seed: 632, dir: 'r', back: true, top: C.navy, hat: 'cap', scale: 0.72, delay: 0.1, pose: 'point' },
    { path: [...IN, [9.8, 6.45]], seed: 633, dir: 'l', back: true, top: C.teal, scale: 0.7, delay: 0.2, pose: (t) => (Math.sin(t * 1.3 + 2) > 0.2 ? 'jump' : 'stand') },
    { path: [...IN, [8.2, 5.2], [10.2, 4.7]], seed: 634, dir: 'r', back: true, top: C.mustard, scale: 0.72, delay: 0.25,
      say: (t) => (pulse(t, 8) > 0.8 ? 'MY GO NEXT' : null) },
    { path: [...IN, [8.6, 4.6]], seed: 635, dir: 'r', back: true, top: C.coral, hat: 'beanie', scale: 0.7, delay: 0.35 },
  ]);
}

// A kid's bike, leaning in the rack, drawn flat side on.
function bike(ctx, x, y, color) {
  const w = (u, z) => P(x, y + u, z);
  for (const u of [-0.45, 0.45]) {
    const [X, Y] = w(u, 0.32);
    ctx.beginPath(); ctx.arc(X, Y, 0.3, 0, Math.PI * 2);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.07; ctx.stroke();
  }
  ctx.beginPath();
  const pts = [w(-0.45, 0.32), w(0, 0.32), w(0.3, 0.75), w(-0.15, 0.75), w(-0.45, 0.32)];
  pts.forEach(([X, Y], i) => (i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y)));
  const [hx, hy] = w(0.45, 0.32), [gx, gy] = w(0.38, 0.95);
  ctx.moveTo(hx, hy); ctx.lineTo(gx, gy);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.11; ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = 0.06; ctx.stroke();
  const [sx, sy] = w(-0.15, 0.82);
  ctx.beginPath(); ctx.ellipse(sx, sy, 0.13, 0.05, 0, 0, Math.PI * 2); paint(ctx, C.ink);
}
