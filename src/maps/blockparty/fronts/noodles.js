// The Noodle Bar's front. Its only door onto a street is the kitchen door in
// its right wall (x 13.4 to 15.4), right on Main Street's kerb, where people
// walk only 0.9 out: so everything on the ground hugs the wall, and the
// canopy over the door is held up from the wall, above everyone's heads. A
// giant bowl on a pole reads from across the block; the valance owns up that
// the way in is through the kitchen. Open 11am to 11:30pm; noon to 2pm is the
// lunch rush: people hovering behind the stools, eating standing up, and one
// lost soul in the kitchen.
//
// Also here: the window on the far wall shows the day's sky (drawn from here,
// so The Block's own noodle bar keeps its rainy night), and the octopus's
// runs up the alley: a NO OCTOPUSES sign on the open front, and the chef
// sees it coming.
import { C, Q, P, box, face, paint, paintText, speech, shade } from '../../../engine/art.js';
import { pulse } from '../../../engine/actors.js';
import { FRONT, board, LIT, words } from '../style.js';
import { open, nightK, hour } from '../clock.js';
import { extras, openCard, skyPane } from './kit.js';

const ID = 'noodles';
const INK = FRONT[ID];
const PY = -0.14; // the pole, at the wall
const PX = 11.9; // along it, left of the door (x 13.4 to 15.4)
const A = 13.1, B = 15.7, OUT = 1.3, CZ = 3.0; // the canopy over the kitchen door

// The octopus waits up the alley for the noodle bar (day.js: it leaves the
// aquarium at 6am, 1pm and 8pm and is carried back two hours later).
const OCTO = [[6, 8], [13, 15], [20, 22]];
const octopusNear = (t) => { const h = hour(t); return OCTO.some(([a, b]) => h > a + 1.3 && h < b + 0.1); };

// The giant bowl on top of the pole: red, heaped with noodles, chopsticks in.
function bowlSign(ctx) {
  const [X, Y] = P(PX, PY, 5.3);
  // steam
  if (Q.detail) {
    ctx.lineCap = 'round';
    for (const dx of [-0.45, 0, 0.45]) {
      ctx.beginPath();
      ctx.moveTo(X + dx, Y - 0.35);
      ctx.bezierCurveTo(X + dx - 0.25, Y - 0.7, X + dx + 0.25, Y - 0.95, X + dx, Y - 1.3);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.16; ctx.stroke();
      ctx.strokeStyle = C.white; ctx.lineWidth = 0.09; ctx.stroke();
    }
  }
  // chopsticks, behind the rim
  for (const [a, b] of [[0.25, 0.95], [0.45, 1.2]]) {
    ctx.beginPath(); ctx.moveTo(X + a, Y - 0.05); ctx.lineTo(X + b, Y - 1.35);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.14; ctx.stroke();
    ctx.strokeStyle = C.woodLight; ctx.lineWidth = 0.07; ctx.stroke();
  }
  // the heap of noodles
  ctx.beginPath(); ctx.ellipse(X, Y, 1.05, 0.28, 0, Math.PI, 0); ctx.quadraticCurveTo(X, Y - 0.75, X - 1.05, Y);
  paint(ctx, C.butter, { dots: C.mustard, density: 0.3, lw: 0.04 });
  if (Q.detail) {
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(X - 0.8 + i * 0.4, Y - 0.05);
      ctx.bezierCurveTo(X - 0.7 + i * 0.4, Y - 0.45, X - 0.5 + i * 0.4, Y - 0.1, X - 0.4 + i * 0.4, Y - 0.35);
      ctx.strokeStyle = C.mustard; ctx.lineWidth = 0.05; ctx.stroke();
    }
  }
  // the bowl
  ctx.beginPath();
  ctx.moveTo(X - 1.1, Y); ctx.quadraticCurveTo(X - 1.0, Y + 1.0, X, Y + 1.0); ctx.quadraticCurveTo(X + 1.0, Y + 1.0, X + 1.1, Y);
  ctx.closePath();
  paint(ctx, INK.board, { dots: shade(C.red, 0.35), density: 0.18, lw: 0.05 });
  ctx.beginPath(); ctx.moveTo(X - 1.02, Y + 0.3); ctx.quadraticCurveTo(X, Y + 0.48, X + 1.02, Y + 0.3);
  ctx.strokeStyle = INK.ink; ctx.lineWidth = 0.1; ctx.stroke();
}

export default function (R) {
  const pt = (u, v, z) => [u, -v, z]; // u along the wall, v out over the kerb

  // The pole, the bowl, the name and the small print, all at the wall.
  R.thing(PX, PY, (ctx) => {
    box(ctx, PX - 0.08, PY - 0.08, 0, 0.16, 0.16, 4.6, C.ink, { flat: true, stroke: false });
    board(ctx, 'x', PX, PY - 0.1, 3.95, 2.5, 0.8, 'NOODLES', { board: INK.board, ink: INK.ink, size: 0.5 });
    board(ctx, 'x', PX, PY - 0.1, 3.35, 2.1, 0.34, 'SLURP RESPONSIBLY', { board: C.white, ink: C.red, size: 0.17, edge: 0.03 });
    bowlSign(ctx);
  });
  // OPEN or CLOSED, on the pole at eye height.
  openCard(R, ID, 'x', PX, PY - 0.1, 1.9, [PX + 0.01, PY + 0.01]);

  // Two crates of cabbages against the wall, waiting to go in.
  R.thing(12.8, -0.05, (ctx) => {
    box(ctx, 12.3, -0.42, 0, 0.9, 0.38, 0.42, C.woodLight, { top: C.wood, lw: 0.03 });
    box(ctx, 12.4, -0.38, 0.42, 0.7, 0.34, 0.36, C.woodLight, { top: C.wood, lw: 0.03 });
    for (const [x, c] of [[12.55, C.leaf], [12.8, C.green], [13.0, C.leaf]]) {
      const [X, Y] = P(x, -0.2, 0.86);
      ctx.beginPath(); ctx.arc(X, Y - 0.1, 0.15, 0, Math.PI * 2); paint(ctx, c, { lw: 0.03 });
    }
    words(ctx, 'x', 12.75, -0.42, 0.2, 'CABBAGE', 0.14, C.brown);
  });

  // The canopy over the kitchen door, on struts from the wall.
  R.thing(B, -0.05, (ctx) => {
    for (const u of [A + 0.1, B - 0.1]) face(ctx, [pt(u, 0, CZ - 0.6), pt(u, OUT, CZ)], null, { lw: 0.07, stroke: C.ink });
    const n = 6, w = B - A;
    for (let i = 0; i < n; i++) {
      const u0 = A + (i / n) * w, u1 = A + ((i + 1) / n) * w;
      face(ctx, [pt(u0, 0, CZ + 0.55), pt(u1, 0, CZ + 0.55), pt(u1, OUT, CZ), pt(u0, OUT, CZ)], INK.stripes[i % 2], { lw: 0.03 });
    }
    board(ctx, 'x', (A + B) / 2, -OUT, CZ - 0.2, w, 0.4, 'YES, THROUGH THE KITCHEN', { board: C.butter, ink: C.red, size: 0.17, edge: 0.03 });
  });

  // The doorway glows at night while it's open, and the bowl is lit.
  R.light({ at: [14.4, -0.4, 1.6], r: 2.6, color: LIT, k: (t) => nightK(t) * open(ID, t) });
  R.light({ at: [PX, PY - 0.3, 4.6], r: 2.2, color: C.butter, k: (t) => nightK(t) * open(ID, t) * 0.7 });

  // ---------- Inside ----------
  // The far window, with the day's sky, and the neon OPEN lit on the hours.
  R.decor((ctx, t) => {
    const h = hour(t);
    skyPane(ctx, 1.85, 1.55, 4.3, 2.6, h);
    face(ctx, [[0, 4, 1.55], [0, 4, 4.15]], null, { stroke: C.ink, lw: 0.1 });
    const o = open(ID, t) > 0.5;
    const on = o && (Math.sin(t * 7) > -0.85 || Math.sin(t * 2.3) > 0.2);
    paintText(ctx, 'left', 4.0, 3.5, o ? 'OPEN' : 'CLOSED', 0.6, on ? C.pink : shade(C.pink, 0.5));
  }, { anim: true });

  // NO OCTOPUSES, on the open front, facing the alley it keeps coming up.
  R.thing(15.75, 6.9, (ctx) => {
    box(ctx, 15.66, 6.36, 0, 0.1, 0.1, 1.7, C.ink, { flat: true, stroke: false });
    board(ctx, 'y', 15.76, 6.4, 2.05, 1.7, 0.8, null, { board: C.white, edge: 0.04 });
    words(ctx, 'y', 15.76, 6.4, 2.23, 'NO OCTOPUSES', 0.22, C.red);
    words(ctx, 'y', 15.76, 6.4, 1.9, 'NOT EVEN FOR TAKEAWAY', 0.12, C.ink, 'Rethink Sans');
  });
  // The chef, when it's back.
  R.mover(() => ({ x: 6.4, y: 4.3 }), (ctx, t) => {
    if (!Q.detail || !octopusNear(t)) return;
    const s = pulse(t, 24);
    if (s > 0.1 && s < 0.3) speech(ctx, 6.4, 4.3, 3.3, "IT'S BACK", { size: 0.42 });
    else if (s > 0.62 && s < 0.8) speech(ctx, 6.4, 4.3, 3.3, 'HIDE THE PRAWNS', { size: 0.4 });
  }, { bias: 0.2 });

  // ---------- The lunch rush, noon to 2pm ----------
  const tray = (ctx, p) => {
    const [X, Y] = P(p.x, p.y, 0);
    ctx.beginPath(); ctx.ellipse(X + 0.35, Y - 1.3, 0.45, 0.11, 0, 0, Math.PI * 2); paint(ctx, C.teal, { lw: 0.03 });
    ctx.beginPath(); ctx.moveTo(X + 0.12, Y - 1.4); ctx.quadraticCurveTo(X + 0.35, Y - 1.15, X + 0.58, Y - 1.4); ctx.closePath(); paint(ctx, C.white, { lw: 0.03 });
  };
  const bowl = (ctx, p) => {
    const [X, Y] = P(p.x, p.y, 0);
    ctx.beginPath(); ctx.moveTo(X - 0.5, Y - 1.55); ctx.quadraticCurveTo(X - 0.28, Y - 1.2, X - 0.06, Y - 1.55); ctx.closePath();
    paint(ctx, C.red, { lw: 0.03 });
    if (!Q.detail) return;
    ctx.beginPath(); ctx.moveTo(X - 0.3, Y - 1.58); ctx.quadraticCurveTo(X - 0.2, Y - 1.8, X - 0.25, Y - 1.95);
    ctx.strokeStyle = C.butter; ctx.lineWidth = 0.05; ctx.stroke();
  };
  extras(R, ID, [
    // in through the only door, which is the kitchen's
    { path: [[14.4, -0.9], [14.4, 1.4], [14.1, 3.0]], seed: 401, dir: 'l', top: C.navy, bottom: C.grey, hat: 'none',
      say: (t) => (pulse(t, 7) < 0.35 ? 'IS THIS THE WAY IN?' : null) },
    // hovering behind the stools
    { path: [[2.9, 8.35]], seed: 402, dir: 'r', back: true, top: C.purple, delay: 0.1, arms: [1.25, 1.2], prop: tray,
      say: (t) => (pulse(t, 9, 3) < 0.3 ? 'ARE YOU DONE?' : null) },
    { path: [[4.45, 8.45]], seed: 403, dir: 'r', back: true, top: C.mustard, hat: 'cap', delay: 0.2, arms: [1.7, 0.4] },
    // eating standing up
    { path: [[7.1, 13.75]], seed: 404, dir: 'l', top: C.teal, delay: 0.05, arms: [1.6, 1.3], prop: bowl,
      say: (t) => (pulse(t, 11, 5) < 0.25 ? 'NO SEATS. WORTH IT.' : null) },
  ]);
}
