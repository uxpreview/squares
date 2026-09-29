// The Observatory's front. It has no door: you go in from the alley along its
// open front, at y 9 (its edge is x = 16, the alley runs x 16 to 20, people
// walk x 18). So the street gets a door frame standing on its own in the
// alley, no wall round it, with the name over it and a big arrow saying
// where to look. The Courier's "Is this even a door?" stop: it is now.
// A doorbell for Gary on the post. Open 8pm to 4:30am; from 11pm to 2am the
// stargazers pile in.
import { C, Q, P, box, face, paint, shade } from '../../../engine/art.js';
import { FRONT, board, LIT, words } from '../style.js';
import { open, nightK } from '../clock.js';
import { extras, openCard } from './kit.js';

const ID = 'observatory';
const INK = FRONT[ID];
const FX = 16.35; // the frame stands just out in the alley
const Y0 = 7.8, Y1 = 10.2; // its two posts, either side of the way in at y 9
const TOP = 3.3;

function post(ctx, y, h) {
  box(ctx, FX - 0.09, y - 0.09, 0, 0.18, 0.18, h, INK.board, { flat: true, lw: 0.03 });
}

export default function (R) {
  // The far post, and the OPEN / CLOSED card hung on it.
  R.thing(FX, Y0, (ctx) => post(ctx, Y0, TOP));
  R.thing(FX + 0.02, Y0 + 0.02, (ctx) => face(ctx, [[FX, Y0 - 0.05, 2.45], [FX, Y0 + 0.2, 2.75], [FX, Y0 + 0.45, 2.45]], null, { lw: 0.025 }));
  openCard(R, ID, 'y', FX, Y0 + 0.2, 2.2, [FX + 0.03, Y0 + 0.03]);

  // The near post with the lintel, the name board, the arrow and the bell.
  R.thing(FX, Y1, (ctx) => {
    post(ctx, Y1, TOP);
    // the lintel, a door's worth of frame with no door in it
    box(ctx, FX - 0.1, Y0 - 0.12, TOP, 0.2, Y1 - Y0 + 0.24, 0.2, INK.board, { lw: 0.03 });
    // the name
    board(ctx, 'y', FX, 9, TOP + 0.62, 3.3, 0.8, 'OBSERVATORY', { board: INK.board, ink: INK.ink, size: 0.44 });
    // a big arrow on top: look up
    const az = TOP + 1.05;
    face(ctx, [[FX, 8.45, az], [FX, 9.55, az], [FX, 9.55, az + 0.9], [FX, 10.25, az + 0.9], [FX, 9, az + 2.0], [FX, 7.75, az + 0.9], [FX, 8.45, az + 0.9]],
      INK.ink, { lw: 0.05, dots: shade(C.mustard, 0.1), density: 0.15 });
    words(ctx, 'y', FX, 9, az + 0.72, 'LOOK', 0.26, INK.board);
    words(ctx, 'y', FX, 9, az + 0.4, 'UP', 0.34, INK.board);
    // painted stars on the name board's ends
    if (Q.detail) {
      for (const [y, z, s] of [[7.55, TOP + 0.85, 0.12], [10.45, TOP + 0.45, 0.1], [7.6, TOP + 0.4, 0.07]]) {
        const [X, Y] = P(FX, y, z);
        ctx.beginPath();
        ctx.moveTo(X, Y - s * 1.6); ctx.lineTo(X + s * 0.4, Y - s * 0.4); ctx.lineTo(X + s * 1.6, Y);
        ctx.lineTo(X + s * 0.4, Y + s * 0.4); ctx.lineTo(X, Y + s * 1.6); ctx.lineTo(X - s * 0.4, Y + s * 0.4);
        ctx.lineTo(X - s * 1.6, Y); ctx.lineTo(X - s * 0.4, Y - s * 0.4); ctx.closePath();
        ctx.fillStyle = C.white;
        ctx.fill();
      }
    }
    // the doorbell, at hand height on the near post
    board(ctx, 'y', FX - 0.1, Y1, 1.55, 0.62, 0.62, null, { board: C.white, edge: 0.03 });
    words(ctx, 'y', FX - 0.1, Y1, 1.72, 'RING FOR', 0.11, C.navy, 'Rethink Sans');
    words(ctx, 'y', FX - 0.1, Y1, 1.58, 'GARY', 0.14, C.coral);
    const [bx, by] = P(FX - 0.1, Y1, 1.38);
    ctx.beginPath(); ctx.arc(bx, by, 0.09, 0, Math.PI * 2); paint(ctx, C.red, { lw: 0.025 });
  });

  // A mat under the frame, out in the alley (flat, so people walk over it).
  R.thing(16.05, 8.2, (ctx) => {
    face(ctx, [[16.05, 8.3, 0.02], [17.0, 8.3, 0.02], [17.0, 9.7, 0.02], [16.05, 9.7, 0.02]], INK.board, { lw: 0.03 });
    if (!Q.detail) return;
    for (const y of [8.6, 9.0, 9.4]) {
      const [X, Y] = P(16.5, y, 0.03);
      ctx.beginPath(); ctx.arc(X, Y, 0.06, 0, Math.PI * 2); ctx.fillStyle = INK.ink; ctx.fill();
    }
  });

  // The way in glows at night while it's open, and the sign is lit.
  R.light({ at: [15.6, 9, 1.6], r: 2.6, color: LIT, k: (t) => nightK(t) * open(ID, t) });
  R.light({ at: [FX, 9, TOP + 0.8], r: 2.2, color: C.butter, k: (t) => nightK(t) * 0.6 });

  // ---------- The rush: stargazers, 11pm to 2am ----------
  // Two grown-ups join the back of the kids' queue for the goose's telescope,
  // two crowd the window, and one lies on a blanket and looks at the ceiling.
  extras(R, ID, [
    { path: [[16, 9], [14.3, 9.8], [12.6, 10.5]], seed: 601, dir: 'r', back: true, top: C.purple,
      say: (t) => (Math.sin(t * 0.7) > 0.8 ? 'IS IT OUR TURN?' : null) },
    { path: [[16, 9], [14.6, 10.4], [13.1, 11.35]], seed: 602, dir: 'r', back: true, top: C.teal, hat: 'beanie', delay: 0.1,
      prop: (ctx, p) => { const [X, Y] = P(p.x, p.y, 1.25); ctx.beginPath(); ctx.rect(X + 0.2, Y - 0.35, 0.2, 0.4); paint(ctx, C.red, { lw: 0.02 }); } },
    { path: [[16, 9], [14.0, 7.3], [13.9, 4.0], [14.35, 2.7]], seed: 603, dir: 'l', back: true, pose: 'point', top: C.mustard, delay: 0.15 },
    { path: [[16, 9], [14.1, 7.3], [14.2, 4.4], [15.3, 3.4]], seed: 604, dir: 'l', back: true, top: C.coral, delay: 0.25, arms: [2.6, 2.4],
      prop: (ctx, p) => {
        const [X, Y] = P(p.x, p.y, 0);
        ctx.beginPath(); ctx.roundRect(X - 0.35, Y - 2.1, 0.3, 0.2, 0.05); ctx.roundRect(X - 0.35, Y - 1.88, 0.3, 0.2, 0.05); paint(ctx, C.ink, { lw: 0.02 });
      } },
    { path: [[6.9, 13.2]], seed: 605, pose: 'lie', dir: 'l', z: 0.06, top: C.lilac, delay: 0.05,
      under: (ctx) => face(ctx, [[5.8, 12.7, 0.03], [7.9, 12.7, 0.03], [7.9, 13.8, 0.03], [5.8, 13.8, 0.03]], C.coral, { lw: 0.03, dots: C.butter, density: 0.3 }) },
  ]);
}
