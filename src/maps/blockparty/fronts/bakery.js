// Dawn Bakery's front. Its street door (left wall, y 12.1 to 14.4) opens onto
// the alley right at the alleys' hot spot, where the octopus's print, the
// noodle bar's key and a cat in a bin are all to be found: so the front stays
// tight to the wall (x -0.8 to 0, y 11.8 to 14.5) and mostly overhead. A
// striped canopy on struts from the wall, a giant croissant over the name,
// the valance owning up to the hours, the milk just delivered. Open 4am to
// 2pm; 5am to 8am is the dawn queue, out of the door and into the alley.
// The window shows the day's sky.
import { C, Q, P, box, face, paint, shade } from '../../../engine/art.js';
import { pulse } from '../../../engine/actors.js';
import { FRONT, board, LIT } from '../style.js';
import { open, nightK, hour } from '../clock.js';
import { extras } from './observatory.js';
import { skyPane, words } from './noodles.js';

const ID = 'bakery';
const INK = FRONT[ID];
const A = 11.9, B = 14.5, OUT = 0.8, CZ = 3.25; // the canopy over the door

// A croissant, facing the viewer, s across, centred at (X, Y) on screen.
function croissant(ctx, X, Y, s) {
  const seg = [[-0.52, 0.3, 0.12], [-0.3, 0.06, 0.2], [0, -0.04, 0.27], [0.3, 0.06, 0.2], [0.52, 0.3, 0.12]];
  for (const [dx, dy, r] of seg) {
    ctx.beginPath(); ctx.ellipse(X + dx * s, Y + dy * s, r * s, r * s * 0.8, 0, 0, Math.PI * 2);
    paint(ctx, C.mustard, { dots: shade(C.mustard, 0.35), density: 0.25, lw: 0.04 });
  }
  if (!Q.detail) return;
  for (const [dx, dy] of [[-0.11, -0.06], [0.11, -0.06]]) {
    ctx.beginPath(); ctx.moveTo(X + dx * s, Y + (dy - 0.18) * s); ctx.lineTo(X + dx * s * 1.1, Y + (dy + 0.12) * s);
    ctx.strokeStyle = C.wood; ctx.lineWidth = 0.05; ctx.stroke();
  }
}

export default function (R) {
  const pt = (u, v, z) => [-v, u, z]; // u along the wall, v out into the alley

  // The canopy, the name board on top of it and the croissant on top of that.
  R.thing(-0.05, B, (ctx) => {
    for (const u of [A + 0.1, B - 0.1]) face(ctx, [pt(u, 0, CZ - 0.6), pt(u, OUT, CZ)], null, { lw: 0.07, stroke: C.ink });
    const n = 6, w = B - A;
    for (let i = 0; i < n; i++) {
      const u0 = A + (i / n) * w, u1 = A + ((i + 1) / n) * w;
      face(ctx, [pt(u0, 0, CZ + 0.5), pt(u1, 0, CZ + 0.5), pt(u1, OUT, CZ), pt(u0, OUT, CZ)], INK.stripes[i % 2], { lw: 0.03 });
    }
    board(ctx, 'y', -OUT, (A + B) / 2, CZ - 0.2, w, 0.4, 'UP BEFORE YOU', { board: C.white, ink: C.coral, size: 0.2, edge: 0.03 });
    board(ctx, 'y', -0.05, (A + B) / 2, CZ + 1.15, w - 0.1, 1.0, 'BAKERY', { board: INK.board, ink: INK.ink, size: 0.56 });
    words(ctx, 'y', -0.06, (A + B) / 2, CZ + 1.5, 'DAWN', 0.22, C.brown);
    const [X, Y] = P(-0.05, (A + B) / 2, CZ + 2.15);
    croissant(ctx, X, Y, 1.9);
  });
  // OPEN or CLOSED, hung under the valance on two strings.
  R.thing(-OUT + 0.01, 12.6, (ctx, t) => {
    const o = open(ID, t) > 0.5, y = 12.55;
    for (const dy of [-0.3, 0.3]) face(ctx, [pt(y + dy, OUT - 0.05, CZ - 0.4), pt(y + dy, OUT - 0.05, 2.75)], null, { lw: 0.025 });
    board(ctx, 'y', -OUT + 0.05, y, 2.55, 0.95, 0.4, o ? 'OPEN' : 'CLOSED', { board: o ? C.butter : C.greyLight, ink: C.ink, size: 0.2, edge: 0.03 });
  }, { anim: true });
  // The milk, just delivered, against the wall by the door.
  R.thing(-0.1, 12.05, (ctx) => {
    box(ctx, -0.45, 11.82, 0, 0.36, 0.26, 0.22, C.teal, { lw: 0.03 });
    for (const [x, y] of [[-0.35, 11.9], [-0.2, 11.98]]) {
      const [X, Y] = P(x, y, 0.2);
      ctx.beginPath(); ctx.roundRect(X - 0.07, Y - 0.42, 0.14, 0.42, 0.05); paint(ctx, C.white, { lw: 0.025 });
      ctx.fillStyle = C.coral; ctx.fillRect(X - 0.07, Y - 0.46, 0.14, 0.07);
    }
  });

  // The doorway glows at night while it's open.
  R.light({ at: [-0.4, 13.25, 1.6], r: 2.4, color: LIT, k: (t) => nightK(t) * open(ID, t) });

  // The window, with the day's sky (it opens at 4am: most mornings, a blush).
  R.decor((ctx, t) => {
    skyPane(ctx, 6.5, 2.05, 4.0, 2.5, hour(t));
    face(ctx, [[0, 8.5, 2.05], [0, 8.5, 4.55]], null, { stroke: C.white, lw: 0.1 });
  }, { anim: true });

  // ---------- The dawn queue, 5am to 8am ----------
  // It runs on from the room's own queue (its last place is 3.1, 13.8), in at
  // the door and out into the alley, keeping to either side of the way the
  // served customers go out (the top of the door) and back (the bottom).
  const mug = (ctx, p) => {
    const [X, Y] = P(p.x, p.y, 0);
    ctx.beginPath(); ctx.roundRect(X + 0.28, Y - 1.45, 0.2, 0.24, 0.04); paint(ctx, C.white, { lw: 0.025 });
    if (!Q.detail) return;
    ctx.beginPath(); ctx.moveTo(X + 0.38, Y - 1.5); ctx.quadraticCurveTo(X + 0.48, Y - 1.65, X + 0.36, Y - 1.8);
    ctx.strokeStyle = C.greyLight; ctx.lineWidth = 0.04; ctx.stroke();
  };
  extras(R, ID, [
    { path: [[-2, 13.3], [-0.2, 13.4], [1.7, 13.5]], seed: 511, dir: 'r', top: C.blush, hat: 'none',
      say: (t) => (pulse(t, 10) < 0.25 ? 'IS IT 5 YET?' : null) },
    { path: [[-2, 13.2], [0.5, 13.2]], seed: 512, dir: 'r', top: C.green, hat: 'beanie', delay: 0.12, prop: mug },
    { path: [[-2, 13.0], [-0.45, 13.0]], seed: 513, dir: 'r', top: C.coral, hat: 'cap', delay: 0.24, pose: 'run',
      say: (t) => (pulse(t, 13, 6) < 0.2 ? 'STILL JOGGING' : null) },
    { path: [[-2, 14.2], [-0.5, 14.2]], seed: 514, dir: 'r', top: C.purple, delay: 0.36, arms: [0.3, 0.2],
      say: (t) => (pulse(t, 9, 4) < 0.25 ? 'WHAT IS THE QUEUE FOR?' : null) },
  ]);
}
