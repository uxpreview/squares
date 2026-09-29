// The Model Railway's front. Its door is in the left wall at y 12.5, onto the
// alley between columns 3 and 4 (people walk 2 out; things on the ground stay
// within 1.2 of the wall). A signal gantry over the door, like a station
// entrance: a nameboard hung from it with a departures line that's always
// right, and on top a semaphore signal, arm up while it's open and level when
// it's shut, its lamp green or red after dark. Open 10am to 8pm; from 5pm to
// 7pm the evening timetable brings the enthusiasts, notebooks out.
import { C, Q, P, box, face, paint, paintText } from '../../../engine/art.js';
import { FRONT, board, doorstep, LIT, words } from '../style.js';
import { open, nightK } from '../clock.js';
import { extras, openCard } from './kit.js';

const ID = 'trains';
const INK = FRONT[ID];
const G0 = 11.0, G1 = 14.0, GM = (G0 + G1) / 2; // the gantry's legs, either side of the door (y 11.4 to 13.6)
const GX = -0.3, BZ = 5.8; // out from the wall; the beam's height
const SZ = 7.2; // the semaphore's pivot, up on the near leg

export default function (R) {
  // The gantry: two lattice legs, the beam, and the nameboard hung from it.
  R.thing(GX, G1, (ctx) => {
    for (const y of [G0, G1]) {
      box(ctx, GX - 0.09, y - 0.09, 0, 0.18, 0.18, y === G1 ? SZ + 0.35 : BZ + 0.2, C.white, { flat: true, lw: 0.03 });
      if (Q.detail) for (let z = 0.3; z < BZ - 0.3; z += 0.5) face(ctx, [[GX - 0.1, y - 0.09, z], [GX - 0.1, y + 0.09, z + 0.5]], null, { lw: 0.025, stroke: C.ink });
    }
    box(ctx, GX - 0.1, G0 - 0.1, BZ, 0.2, G1 - G0 + 0.2, 0.22, C.white, { flat: true, lw: 0.03 });
    for (const y of [G0 + 0.5, G1 - 0.5]) face(ctx, [[GX, y, BZ], [GX, y, BZ - 0.2]], null, { lw: 0.03, stroke: C.ink });
    // a station nameboard: white edge, green board
    board(ctx, 'y', GX - 0.02, GM, 5.0, G1 - G0 - 0.1, 1.0, null, { board: C.white });
    board(ctx, 'y', GX - 0.03, GM, 5.0, G1 - G0 - 0.3, 0.8, null, { board: INK.board, edge: 0.02 });
    words(ctx, 'y', GX - 0.04, GM, 5.15, 'MODEL RAILWAY', 0.36, INK.ink);
    words(ctx, 'y', GX - 0.04, GM, 4.78, 'NEXT TRAIN: 18 SECONDS. ALWAYS.', 0.11, C.white, 'Rethink Sans');
    // a ladder up the near leg to the signal
    if (Q.detail) for (let z = BZ + 0.3; z < SZ - 0.2; z += 0.3) face(ctx, [[GX - 0.12, G1 - 0.18, z], [GX - 0.12, G1 + 0.18, z]], null, { lw: 0.03, stroke: C.ink });
  });
  // The semaphore's arm: raised while it's open, level when it's shut; the
  // lamp green or red. And OPEN or CLOSED on the far leg.
  R.thing(GX + 0.01, G1 + 0.01, (ctx, t) => {
    const o = open(ID, t);
    const a = o * 0.7; // raised, in radians
    const along = (d, up) => [GX - 0.12, G1 + Math.cos(a) * d - Math.sin(a) * up, SZ + Math.sin(a) * d + Math.cos(a) * up];
    face(ctx, [along(0, -0.13), along(1.2, -0.1), along(1.2, 0.1), along(0, 0.13)], C.red, { lw: 0.03 });
    face(ctx, [along(0.85, -0.1), along(1.0, -0.1), along(1.0, 0.1), along(0.85, 0.1)], C.white, { stroke: false });
    const [X, Y] = P(...along(-0.3, -0.12));
    ctx.beginPath(); ctx.arc(X, Y, 0.13, 0, Math.PI * 2);
    paint(ctx, o > 0.5 ? C.leaf : C.red, { lw: 0.03 });
    const [px, py] = P(GX - 0.12, G1, SZ);
    ctx.beginPath(); ctx.arc(px, py, 0.05, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
  }, { anim: true });

  openCard(R, ID, 'y', GX - 0.1, G0 - 0.55, 1.6, [GX + 0.02, G0 - 0.53]);

  // A step, and a mat that says it.
  R.thing(-0.05, 11.3, (ctx) => {
    doorstep(ctx, 'left', 12.5, 2.2, C.red);
    if (Q.detail) paintText(ctx, 'floor', -0.95, 12.5, 'MIND THE GAP', 0.2, C.white);
  });

  // The doorway glows at night while it's open; so do the signal's lamp and
  // the sign.
  R.light({ at: [-0.4, 12.5, 1.6], r: 2.6, color: LIT, k: (t) => nightK(t) * open(ID, t) });
  R.light({ at: [GX - 0.2, G1 - 0.3, SZ], r: 1.2, color: C.leaf, k: (t) => nightK(t) * open(ID, t) });
  R.light({ at: [GX - 0.2, G1 - 0.3, SZ], r: 1.2, color: C.red, k: (t) => nightK(t) * (1 - open(ID, t)) });
  R.light({ at: [GX - 0.2, GM, 5.0], r: 2.2, color: C.butter, k: (t) => nightK(t) * 0.5 });

  // ---------- The evening timetable, 5pm to 7pm ----------
  // The enthusiasts, round the front aisles, taking notes. (They appear
  // rather than walk in: the door opens into the back aisle, behind the
  // table.)
  const notebook = (ctx, p) => {
    const [X, Y] = P(p.x, p.y, 0);
    ctx.beginPath(); ctx.rect(X + 0.12, Y - 1.5, 0.3, 0.36); paint(ctx, C.white, { lw: 0.025 });
    ctx.beginPath(); ctx.moveTo(X + 0.17, Y - 1.4); ctx.lineTo(X + 0.36, Y - 1.4); ctx.moveTo(X + 0.17, Y - 1.3); ctx.lineTo(X + 0.33, Y - 1.3);
    ctx.strokeStyle = C.navy; ctx.lineWidth = 0.02; ctx.stroke();
  };
  extras(R, ID, [
    { path: [[14.0, 5.3]], seed: 671, dir: 'l', back: true, top: C.brown, hat: 'cap', pose: 'read', prop: notebook },
    { path: [[14.0, 10.0]], seed: 672, dir: 'l', back: true, top: C.green, delay: 0.1, arms: [2.4, 0.3],
      prop: (ctx, p) => {
        // a stopwatch, held up
        const [X, Y] = P(p.x, p.y, 0);
        ctx.beginPath(); ctx.arc(X - 0.55, Y - 2.2, 0.13, 0, Math.PI * 2); paint(ctx, C.greyLight, { lw: 0.03 });
      },
      say: (t) => (Math.sin(t * 0.6) > 0.8 ? '18.6 SECONDS. AGAIN.' : null) },
    { path: [[9.6, 14.05]], seed: 673, dir: 'r', back: true, top: C.mustard, delay: 0.2, pose: 'read', prop: notebook },
    { path: [[3.4, 14.1]], seed: 674, dir: 'r', back: true, top: C.navy, hat: 'beanie', delay: 0.3, arms: [1.3, 0.3],
      prop: (ctx, p) => {
        // a flask of tea
        const [X, Y] = P(p.x, p.y, 0);
        ctx.beginPath(); ctx.roundRect(X + 0.22, Y - 1.45, 0.14, 0.34, 0.04); paint(ctx, C.red, { lw: 0.025 });
      },
      say: (t) => (Math.sin(t * 0.45 + 2) > 0.85 ? 'SHE\'S A BEAUTY' : null) },
    { path: [[14.0, 3.4]], seed: 675, dir: 'l', back: true, top: C.purple, scale: 0.72, delay: 0.4, pose: 'point' },
  ]);
}
