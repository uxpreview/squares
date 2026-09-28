// The Laundromat's front. Its door (left wall, y 11.4 to 13.6) is right on
// Main Street's kerb, where people walk only 0.9 out: so the two posts and
// the basket stand at the wall, and the canopy reaches out over the kerb
// above everyone's heads. LAUNDRY on top, and over it a neon OPEN 24H that
// glows all night (it never closes; the 2am crowd is its rush). The lost
// sock poster is on the near post: the sock the Courier is carrying all day.
//
// Inside, on this map only: the window shows the day's sky, and the giant
// sheet hangs on a line across the front until Dot and Mo carry it out at
// noon (day.js). After that the line is empty but for a note.
import { C, Q, P, box, face, paint, paintText, label, alpha, shade } from '../../../engine/art.js';
import { pulse } from '../../../engine/actors.js';
import { FRONT, board, LIT, words, lostSock } from '../style.js';
import { nightK, hour } from '../clock.js';
import { extras, skyPane } from './kit.js';

const ID = 'laundromat';
const INK = FRONT[ID];
const PX = -0.15; // the posts, at the wall
const A = 10.5, B = 14.5; // either side of the door (y 11.4 to 13.6)
const OUT = 1.3, CZ = 3.0;

// The neon flickers now and then, and is bright once it's dark.
const neon = (t) => {
  const flick = Math.sin(t * 23) > 0.95 || (pulse(t, 7) > 0.92 && Math.sin(t * 40) > 0);
  return flick ? shade(C.pink, 0.45) : nightK(t) > 0.3 ? C.pink : shade(C.pink, 0.15);
};

// The line across the front and the giant sheet on it, in pieces so people
// behind it sort right. The sheet is up from dawn till noon.
const LINE_Y = 15.1, LZ = 3.4, S0 = 5.9, S1 = 14.1;
const sheetUp = (t) => { const h = hour(t); return h >= 5 && h < 12; };
const sag = (x) => Math.sin(((x - 5.4) / 9.2) * Math.PI) * 0.3;
function lineSeg(ctx, t, x0, x1) {
  const up = sheetUp(t);
  // the sheet, billowing a little along its bottom edge
  if (up) {
    const a = Math.max(x0, S0), b = Math.min(x1, S1);
    if (b > a) {
      const pts = [];
      const n = 6;
      for (let i = 0; i <= n; i++) { const x = a + ((b - a) * i) / n; pts.push([x, LINE_Y, LZ - sag(x) - 0.05]); }
      for (let i = n; i >= 0; i--) {
        const x = a + ((b - a) * i) / n;
        const w = Math.sin(x * 0.9 + t * 1.3);
        pts.push([x, LINE_Y + w * 0.15, 0.75 + w * 0.12]);
      }
      // filled without an outline, so the pieces join up; then its hem
      face(ctx, pts, C.white, { dots: C.sky, density: 0.3, stroke: false });
      ctx.beginPath();
      pts.slice(n + 1).forEach(([x, y, z], i) => { const [X, Y] = P(x, y, z); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.035; ctx.stroke();
      if (a === S0 || b === S1) {
        const e = a === S0 ? a : b;
        const [X0, Y0] = P(e, LINE_Y, LZ - sag(e) - 0.05), [X1, Y1] = P(e, LINE_Y + Math.sin(e * 0.9 + t * 1.3) * 0.15, 0.75 + Math.sin(e * 0.9 + t * 1.3) * 0.12);
        ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1); ctx.stroke();
      }
    }
  }
  // the line itself
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) {
    const x = x0 + ((x1 - x0) * i) / 6;
    const [X, Y] = P(x, LINE_Y, LZ - sag(x));
    i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
  }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.035; ctx.stroke();
  // pegs, with or without the sheet
  if (Q.detail) {
    for (let x = S0 + 0.3; x < S1; x += 1.1) {
      if (x < x0 || x >= x1) continue;
      const [X, Y] = P(x, LINE_Y, LZ - sag(x));
      ctx.beginPath(); ctx.rect(X - 0.04, Y - 0.08, 0.08, 0.24); paint(ctx, up ? C.coral : C.mustard, { lw: 0.02 });
    }
  }
  // no sheet: a note where it was
  if (!up && x0 <= 10 && x1 > 10) {
    const [X, Y] = P(10, LINE_Y, LZ - sag(10));
    ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X, Y + 0.3); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02; ctx.stroke();
    board(ctx, 'x', 10, LINE_Y, LZ - sag(10) - 0.65, 1.7, 0.7, null, { board: C.butter, edge: 0.03 });
    words(ctx, 'x', 10, LINE_Y, LZ - sag(10) - 0.5, 'WHO TOOK', 0.2, C.ink);
    words(ctx, 'x', 10, LINE_Y, LZ - sag(10) - 0.78, 'THE SHEET?', 0.2, C.red);
  }
}

export default function (R) {
  const pt = (u, v, z) => [PX - v, u, z]; // u along the wall, v out over the kerb

  // The far post, with the card hung on it: it's always open.
  R.thing(PX, A, (ctx) => {
    box(ctx, PX - 0.09, A - 0.09, 0, 0.18, 0.18, CZ + 0.6, C.teal, { flat: true, lw: 0.03 });
    board(ctx, 'y', PX - 0.12, A, 1.95, 1.0, 0.42, 'OPEN', { board: C.butter, ink: C.ink, size: 0.22, edge: 0.03 });
    words(ctx, 'y', PX - 0.12, A, 1.6, '(STILL)', 0.14, C.navy);
  });
  // A basket of washing by the wall, waiting for a machine.
  R.thing(-0.05, 10.1, (ctx) => {
    box(ctx, -0.42, 9.55, 0, 0.36, 0.6, 0.38, C.teal, { dotsL: shade(C.teal, 0.4), lw: 0.03 });
    for (const [y, c] of [[9.7, C.coral], [9.95, C.white], [10.05, C.mustard]]) {
      const [X, Y] = P(-0.24, y, 0.42);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.16, 0.08, 0, 0, Math.PI * 2); paint(ctx, c, { lw: 0.025 });
    }
  });

  // The near post, the canopy, LAUNDRY and the lost sock poster.
  R.thing(PX, B, (ctx) => {
    box(ctx, PX - 0.09, B - 0.09, 0, 0.18, 0.18, CZ + 0.6, C.teal, { flat: true, lw: 0.03 });
    for (const u of [A, B]) face(ctx, [pt(u, 0, CZ - 0.5), pt(u, OUT, CZ)], null, { lw: 0.07, stroke: C.ink });
    const n = 8, w = B - A;
    for (let i = 0; i < n; i++) {
      const u0 = A + (i / n) * w, u1 = A + ((i + 1) / n) * w;
      face(ctx, [pt(u0, 0, CZ + 0.55), pt(u1, 0, CZ + 0.55), pt(u1, OUT, CZ), pt(u0, OUT, CZ)], INK.stripes[i % 2], { lw: 0.03 });
    }
    board(ctx, 'y', PX - OUT, (A + B) / 2, CZ - 0.18, w, 0.36, 'SOCKS NOT GUARANTEED', { board: C.white, ink: C.teal, size: 0.19, edge: 0.03 });
    board(ctx, 'y', PX + 0.05, (A + B) / 2, CZ + 1.2, w - 0.2, 1.1, 'LAUNDRY', { board: INK.board, ink: INK.ink, size: 0.64 });
    // bubbles along the board's top
    if (Q.detail) {
      for (const [y, z, r] of [[10.9, 4.85, 0.14], [11.3, 4.95, 0.1], [13.8, 4.9, 0.12], [14.1, 4.8, 0.08]]) {
        const [X, Y] = P(PX + 0.04, y, z);
        ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2); paint(ctx, alpha(C.white, 0.8), { lw: 0.025 });
      }
    }
    // the lost sock poster, at eye height on the post
    board(ctx, 'y', PX - 0.12, B, 1.8, 0.95, 1.05, null, { board: C.white, edge: 0.03 });
    words(ctx, 'y', PX - 0.12, B + 0.15, 2.1, 'LOST', 0.24, C.red);
    // the sock itself, the one in the Courier's parcel (finale.js)
    if (Q.detail) { const [SX, SY] = P(PX - 0.12, B - 0.25, 2.12); lostSock(ctx, SX - 0.06, SY, 0.28); }
    words(ctx, 'y', PX - 0.12, B, 1.82, 'ONE SOCK', 0.15, C.ink);
    words(ctx, 'y', PX - 0.12, B, 1.58, 'ANSWERS TO', 0.1, C.navy, 'Rethink Sans');
    words(ctx, 'y', PX - 0.12, B, 1.44, 'NOTHING', 0.1, C.navy, 'Rethink Sans');
  });
  // OPEN 24H in neon over the name, on its own dark board.
  R.thing(PX + 0.02, B - 0.9, (ctx, t) => {
    const y = (A + B) / 2;
    board(ctx, 'y', PX + 0.05, y, CZ + 2.25, 2.6, 0.62, null, { board: C.night, edge: 0.04 });
    words(ctx, 'y', PX + 0.04, y, CZ + 2.25, 'OPEN 24H', 0.42, neon(t));
  }, { anim: true });

  // The doorway glows all night, and the neon.
  R.light({ at: [-0.4, 12.5, 1.6], r: 2.6, color: LIT, k: nightK });
  R.light({ at: [PX - 0.3, (A + B) / 2, CZ + 2.2], r: 2.4, color: C.pink, k: (t) => nightK(t) * 0.6 });

  // ---------- Inside ----------
  // The window onto Main Street, with the day's sky, and its neon.
  R.decor((ctx, t) => {
    skyPane(ctx, 1.0, 2.5, 5.2, 2.7, hour(t));
    face(ctx, [[0, 3.6, 2.5], [0, 3.6, 5.2]], null, { lw: 0.12, stroke: C.white });
    // the room's own neon (rooms/laundromat.js), repainted over the sky
    const flick = Math.sin(t * 23) > 0.93 || (pulse(t, 7) > 0.9 && Math.sin(t * 40) > 0);
    paintText(ctx, 'left', 3.6, 3.5, 'OPEN 24H', 0.9, flick ? alpha(C.pink, 0.35) : C.pink);
  }, { anim: true });

  // The line and the sheet (or the note).
  const cuts = [5.3, 7.5, 9.5, 11.5, 14.7];
  R.thing(5.35, LINE_Y, (ctx) => box(ctx, 5.3, LINE_Y - 0.05, 0, 0.1, 0.1, LZ + 0.1, C.grey, { flat: true, stroke: false }));
  R.thing(14.65, LINE_Y, (ctx) => box(ctx, 14.6, LINE_Y - 0.05, 0, 0.1, 0.1, LZ + 0.1, C.grey, { flat: true, stroke: false }));
  for (let i = 0; i < cuts.length - 1; i++) {
    const x0 = cuts[i], x1 = cuts[i + 1];
    R.thing(x1, LINE_Y + 0.05, (ctx, t) => lineSeg(ctx, t, x0, x1), { anim: true });
  }

  // ---------- The 2am crowd, 1am to 3am ----------
  const pillow = (ctx, p) => {
    const [X, Y] = P(p.x, p.y, 0);
    ctx.beginPath(); ctx.roundRect(X + 0.05, Y - 1.55, 0.6, 0.4, 0.12); paint(ctx, C.white, { dots: C.sky, density: 0.3, lw: 0.03 });
  };
  const book = (ctx, p) => {
    const [X, Y] = P(p.x, p.y, 0);
    ctx.beginPath(); ctx.rect(X - 0.05, Y - 1.6, 0.42, 0.32); paint(ctx, C.coral, { lw: 0.03 });
  };
  const aprons = (ctx, p) => {
    const [X, Y] = P(p.x, p.y, 0);
    ctx.beginPath(); ctx.rect(X - 0.1, Y - 1.3, 0.8, 0.4); paint(ctx, C.wood, { dots: C.brown, density: 0.3, lw: 0.03 });
    ctx.beginPath(); ctx.ellipse(X + 0.3, Y - 1.32, 0.38, 0.1, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.025 });
  };
  const IN = [[-0.9, 12.5], [2.6, 12.5]];
  extras(R, ID, [
    { path: [...IN, [5.4, 12.0]], seed: 431, dir: 'l', top: C.pink, hat: 'party', pose: 'dance',
      say: (t) => (pulse(t, 8) < 0.3 ? 'ONE MORE SONG' : null) },
    { path: [...IN, [9.0, 12.4]], seed: 432, dir: 'r', top: C.sky, hat: 'none', delay: 0.1, arms: [1.3, 1.2], prop: pillow },
    { path: [...IN, [13.2, 12.9]], seed: 433, dir: 'l', top: C.teal, hat: 'none', delay: 0.2, pose: 'read', prop: book },
    { path: [...IN, [6.6, 14.7]], seed: 434, dir: 'r', top: C.white, hat: 'chef', delay: 0.3, arms: [1.2, 1.2], prop: aprons,
      say: (t) => (pulse(t, 10, 5) < 0.25 ? 'MY SHIFT IS AT 4' : null) },
    { path: [...IN, [11.4, 14.8]], seed: 435, dir: 'l', top: C.ink, hat: 'none', delay: 0.4,
      say: (t) => (pulse(t, 12, 2) < 0.22 ? 'WHAT A GIG' : null) },
  ]);
  // The sleepy one's z's.
  R.mover(() => ({ x: 9.0, y: 12.4 }), (ctx, t) => {
    const h = hour(t);
    if (!Q.detail || h < 1.4 || h > 2.6) return;
    const k = (t * 0.55) % 1;
    label(ctx, 8.9 - k * 0.4, 12.1 - k * 0.4, 2.7 + k, 'z', 0.35 + k * 0.25, alpha(C.ink, 1 - k));
  }, { bias: 0.3 });
}

