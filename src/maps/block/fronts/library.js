// The Library's front. Its door is in the left wall at y 12.5, right on Main
// Street's kerb, where people walk only 0.9 out: so nothing stands out in the
// road. A post at the wall's front end (clear of the bookcases inside) with a
// bracket arm and a hanging sign over the pavement, a book drop by the door,
// a step and a mat. Open 9am to 6pm; 10am to 12:30 is story time, with more
// kids on the rug.
//
// From 3pm the sound check starts on the stage round the corner, and the
// library feels every thump: the books jump on their shelves, the readers
// wince, the sign swings. The librarian goes out to shush it at 3pm, 4:30pm
// and 6pm (a walker, day.js), and after each shush the library is still for
// a few seconds. Then: THUMP.
import { C, Q, P, box, face, paint, label, speech, alpha, mix } from '../../../engine/art.js';
import { FRONT, board, LIT } from '../style.js';
import { open, nightK, hour } from '../clock.js';
import { extras, openCard } from './kit.js';

const ID = 'library';
const INK = FRONT[ID];
const PY = 15.75; // the post, at the wall's front end
const AX = -1.9; // how far the bracket reaches out, overhead
const AZ = 5.2; // the bracket's height
const BZ = 3.95; // the hanging board's middle (its bottom is well over heads)

// ---------- The sound check ----------
// From 3pm to 7pm, a thump every BEAT seconds, except for a few seconds
// after each shush (the librarian points and says "Shh!" from 3:12, 4:42
// and 6:12, for 20 minutes of the day each: day.js).
const BEAT = 1.1;
const SHUSH = [15.2, 16.7, 18.2];
const QUIET = 0.62; // hours of quiet from the start of each shush: the shush, then the stillness
export function thump(t) {
  const h = hour(t);
  if (h < 15 || h >= 19) return 0;
  if (SHUSH.some((s) => h >= s && h < s + QUIET)) return 0;
  const s = (t % BEAT) / BEAT;
  return s < 0.28 ? 1 - s / 0.28 : 0;
}
// Just after a shush: the library holds its breath.
const hush = (t) => { const h = hour(t); return SHUSH.some((s) => h >= s + 0.34 && h < s + QUIET); };

// Books that jump on their shelves with each thump: [x, y, z, along, color].
const JUMPERS = [
  [1.0, 1.5, 3.2, 'y', C.coral], [1.0, 4.4, 1.25, 'y', C.teal], [1.0, 6.9, 4.1, 'y', C.mustard],
  [1.0, 9.3, 2.2, 'y', C.purple], [1.0, 14.8, 3.2, 'y', C.red],
  [2.4, 1.0, 2.2, 'x', C.navy], [4.6, 1.0, 4.1, 'x', C.pink], [6.6, 1.0, 1.25, 'x', C.green], [13.3, 1.0, 3.2, 'x', C.mustard],
];
// The readers who wince: [x, y, z of the top of the head].
const READERS = [[3.7, 12.6, 2.2], [4.2, 8.7, 1.9], [11.0, 0.6, 3.2], [10.9, 8.6, 2.5], [3.7, 14.8, 1.6]];

export default function (R) {
  const pt = (u, v, z) => [-v, u, z]; // u along the wall, v out over the street

  // The post and the bracket arm.
  R.thing(-0.12, PY, (ctx) => {
    box(ctx, -0.21, PY - 0.09, 0, 0.18, 0.18, AZ + 0.4, INK.board, { flat: true, lw: 0.03 });
    face(ctx, [pt(PY, 0.12, AZ), pt(PY, -AX, AZ)], null, { lw: 0.12, stroke: C.ink });
    face(ctx, [pt(PY, 0.12, AZ - 0.9), pt(PY, 0.9, AZ)], null, { lw: 0.07, stroke: C.ink });
    const [X, Y] = P(...pt(PY, -AX, AZ));
    ctx.beginPath(); ctx.arc(X, Y, 0.1, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.03 });
  });
  // The hanging sign: LIBRARY, and the small print. It swings a little, and
  // jumps with each thump of the sound check.
  R.thing(-0.11, PY + 0.01, (ctx, t) => {
    const k = thump(t);
    const sw = Math.sin(t * 1.1) * 0.05 + k * Math.sin(t * 40) * 0.12;
    const x0 = AX + 0.25, x1 = -0.45, xm = (x0 + x1) / 2;
    const z = BZ + k * 0.08;
    ctx.save();
    const [cx, cy] = P(xm, PY, AZ);
    ctx.translate(cx, cy); ctx.rotate(sw); ctx.translate(-cx, -cy);
    for (const x of [x0 + 0.15, x1 - 0.15]) face(ctx, [[x, PY, AZ], [x, PY, z + 0.72]], null, { lw: 0.04, stroke: C.ink });
    board(ctx, 'x', xm, PY, z, x1 - x0, 1.45, null, { board: INK.board });
    if (Q.detail) {
      // an open book on top of the words
      const [bx, by] = P(xm, PY, z + 0.42);
      ctx.beginPath();
      ctx.moveTo(bx, by + 0.05); ctx.quadraticCurveTo(bx - 0.2, by - 0.12, bx - 0.42, by - 0.04); ctx.lineTo(bx - 0.42, by + 0.14);
      ctx.quadraticCurveTo(bx - 0.2, by + 0.06, bx, by + 0.22); ctx.quadraticCurveTo(bx + 0.2, by + 0.06, bx + 0.42, by + 0.14);
      ctx.lineTo(bx + 0.42, by - 0.04); ctx.quadraticCurveTo(bx + 0.2, by - 0.12, bx, by + 0.05); ctx.closePath();
      paint(ctx, C.white, { lw: 0.03 });
    }
    label(ctx, xm, PY, z - 0.05, 'LIBRARY', 0.36, INK.ink);
    label(ctx, xm, PY, z - 0.38, 'SHUSHING SINCE 1904', 0.12, C.white, 'Rethink Sans');
    ctx.restore();
  }, { anim: true });
  // OPEN or CLOSED, low on the post.
  openCard(R, ID, 'y', -0.24, PY - 0.1, 1.5, [-0.1, PY + 0.02]);

  // A step and a mat, kept to the kerb's edge (people walk 0.9 out).
  R.thing(-0.05, 11.3, (ctx) => {
    box(ctx, -0.3, 11.3, 0, 0.3, 2.4, 0.1, C.greyLight, { flat: true });
    face(ctx, [[-0.3, 11.65, 0.101], [-0.3, 13.35, 0.101], [-0.05, 13.35, 0.101], [-0.05, 11.65, 0.101]], INK.stripes[0], { lw: 0.03 });
  });
  // The book drop, against the wall past the door.
  R.thing(-0.2, 14.6, (ctx) => {
    box(ctx, -0.38, 13.95, 0, 0.36, 0.95, 1.25, C.red, { top: mix(C.red, C.ink, 0.25), lw: 0.04 });
    board(ctx, 'y', -0.39, 14.42, 1.05, 0.7, 0.12, null, { board: C.ink, edge: 0.02 });
    board(ctx, 'y', -0.39, 14.42, 0.62, 0.8, 0.44, 'BOOK', { board: C.white, ink: C.red, size: 0.2, edge: 0.02 });
    board(ctx, 'y', -0.39, 14.42, 0.36, 0.8, 0.02, null, { board: C.white, edge: 0 });
    if (Q.detail) label(ctx, -0.39, 14.42, 0.3, 'DROP', 0.17, C.white);
  });

  // The doorway glows at night while it's open.
  R.light({ at: [-0.3, 12.5, 1.6], r: 2.2, color: LIT, k: (t) => nightK(t) * open(ID, t) });

  // ---------- Story time, 10am to 12:30 ----------
  // A parent and four more kids in through the door, and down on the rug.
  const IN = [[0.3, 12.6], [2.3, 11.8], [6.0, 11.35], [7.6, 11.9]];
  extras(R, ID, [
    { path: [...IN, [8.7, 10.3]], seed: 741, dir: 'r', back: true, pose: 'sit', top: C.coral, scale: 0.68 },
    { path: [...IN, [8.8, 12.1]], seed: 742, dir: 'r', back: true, pose: 'sit', top: C.teal, scale: 0.66, delay: 0.1 },
    { path: [...IN, [9.3, 13.5], [10.4, 13.5]], seed: 743, dir: 'r', back: true, pose: 'sit', top: C.butter, hat: 'beanie', scale: 0.68, delay: 0.18 },
    { path: [...IN, [9.3, 13.5], [12.4, 13.9]], seed: 744, dir: 'l', back: true, pose: 'sit', top: C.pink, scale: 0.66, delay: 0.26 },
    { path: [...IN.slice(0, 3), [7.0, 12.4]], seed: 745, dir: 'r', back: true, top: C.lilac, delay: 0.05,
      say: (t) => (Math.sin(t * 0.5) > 0.85 ? 'WHO WANTS A SNACK' : null) },
  ]);

  // ---------- The sound check, 3pm to 7pm ----------
  // Books jump on their shelves (drawn over the still bookcases, and only
  // while it thumps).
  JUMPERS.forEach(([x, y, z, along, color], i) => {
    R.thing(along === 'y' ? x + 0.15 : x, along === 'y' ? y : y + 0.15, (ctx, t) => {
      const k = thump(t - i * 0.03);
      if (!k) return;
      const up = k * 0.22, lean = (i % 2 ? 1 : -1) * k * 0.08;
      if (along === 'y') {
        box(ctx, x - 0.55, y - 0.08 + lean, z + up, 0.55, 0.16, 0.62, color, { flat: true, lw: 0.03 });
      } else {
        box(ctx, x - 0.08 + lean, y - 0.55, z + up, 0.16, 0.55, 0.62, color, { flat: true, lw: 0.03 });
      }
      if (Q.detail) {
        const [X, Y] = P(x, y, z + 0.3);
        ctx.beginPath();
        for (const d of [-0.2, 0.2]) { ctx.moveTo(X + d * 1.6, Y - 0.25); ctx.lineTo(X + d * 2.1, Y - 0.35); }
        ctx.strokeStyle = alpha(C.ink, 0.7 * k); ctx.lineWidth = 0.04; ctx.stroke();
      }
    }, { anim: true, depth: x + y + 2.2 }); // over the bookcase it sits in
  });
  // The readers wince (little shock lines over their heads), and in the
  // stillness after a shush, one of them says thank you.
  R.mover(() => ({ x: 3.8, y: 12.7 }), (ctx, t) => {
    if (!Q.detail) return;
    const k = thump(t);
    if (k > 0.2) {
      ctx.beginPath();
      for (const [x, y, z] of READERS) {
        const [X, Y] = P(x, y, z + 0.35);
        for (let a = -2; a <= 2; a++) {
          const r0 = 0.28, r1 = 0.28 + 0.25 * k, ang = -Math.PI / 2 + a * 0.45;
          ctx.moveTo(X + Math.cos(ang) * r0, Y + Math.sin(ang) * r0);
          ctx.lineTo(X + Math.cos(ang) * r1, Y + Math.sin(ang) * r1);
        }
      }
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
    }
    if (hush(t)) speech(ctx, 3.7, 12.6, 2.9, 'BLESS HER', { size: 0.4 });
  }, { bias: 3 });
  // THUMP, coming through the wall from the stage (it's that way).
  R.mover(() => ({ x: 0.4, y: 15.6 }), (ctx, t) => {
    const k = thump(t);
    if (!k || !Q.detail) return;
    const n = Math.floor(t / BEAT);
    label(ctx, 0.6 + (n % 3) * 0.5, 15.2 - (n % 2) * 1.2, 4.9 + (1 - k) * 0.4, 'THUMP', 0.5 + (1 - k) * 0.15, alpha(C.coral, k));
  }, { bias: 3 });
}
