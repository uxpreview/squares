// The Umbrella Shop's front. Its door is in the right wall at x 12.5, onto the
// alley between rows C and D (people walk 2 out; things on the ground stay
// within 1.2 of the wall). The sign is the shop's own stock: a big striped
// umbrella on a pole, open while the shop is and furled when it shuts, with
// the name hung under it. It rains indoors, so a puddle leaks out under the
// wall. Open 9am to 6pm; from 3pm to 5pm the downpour (indoors) brings
// everyone in, brollies up.
import { C, Q, P, box, face, paint, poly, alpha, paintText } from '../../../engine/art.js';
import { FRONT, board, doorstep, LIT } from '../style.js';
import { open, nightK } from '../clock.js';
import { extras } from './observatory.js';

const ID = 'umbrellas';
const INK = FRONT[ID];
const PX = 15.3, PY = -0.3; // the pole, at the wall's end (the door is x 11.4 to 13.6)
const TOP = 5.6; // the pole's top, where the umbrella sits
const B0 = -0.35, B1 = -2.2, BY = (B0 + B1) / 2; // the blade, out over the alley

// An umbrella, apex at (x, y, z), radius r, in two colors. open: 0 (furled)
// to 1. No shaft: whoever holds it draws their own.
export function brolly(ctx, x, y, z, r, cols, open = 1) {
  const n = 8;
  const rad = 0.12 + (r - 0.12) * open, drop = 1.0 - 0.6 * open;
  const rim = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.2;
    rim.push([x + Math.cos(a) * rad, y + Math.sin(a) * rad, z - drop]);
  }
  // back panels first
  const order = rim.map((_, i) => i).sort((i, j) => {
    const a = ((i + 0.5) / n) * Math.PI * 2 + 0.2, b = ((j + 0.5) / n) * Math.PI * 2 + 0.2;
    return Math.cos(a) + Math.sin(a) - (Math.cos(b) + Math.sin(b));
  });
  for (const i of order) face(ctx, [[x, y, z], rim[i], rim[(i + 1) % n]], cols[i % 2], { lw: 0.035 });
  const [X, Y] = P(x, y, z);
  ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X, Y - 0.22);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.06; ctx.stroke();
}

export default function (R) {
  // The pole at the wall's end, an arm out over the alley, and the name on a
  // blade hung from it (so from inside, walls up, it hangs past the wall's
  // corner, clear of the shop's own lettering).
  R.thing(PX, PY, (ctx) => {
    box(ctx, PX - 0.09, PY - 0.09, 0, 0.18, 0.18, TOP, C.ink, { flat: true, stroke: false });
    face(ctx, [[PX, PY, 5.3], [PX, B1 - 0.1, 5.3]], null, { lw: 0.08, stroke: C.ink });
    for (const y of [B0 - 0.2, B1 + 0.2]) face(ctx, [[PX, y, 5.3], [PX, y, 5.1]], null, { lw: 0.03, stroke: C.ink });
    board(ctx, 'y', PX, BY, 4.5, B0 - B1, 1.2, null, { board: INK.board });
    if (Q.detail) {
      // a wavy mint trim along the bottom, like a canopy's edge
      ctx.beginPath();
      for (let i = 0; i <= 18; i++) {
        const [X, Y] = P(PX, B0 - 0.05 - i * ((B0 - B1 - 0.1) / 18), 4.02 + (i % 2) * 0.07);
        i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      }
      ctx.strokeStyle = INK.stripes[1]; ctx.lineWidth = 0.08; ctx.stroke();
    }
    words(ctx, PX, BY, 4.7, 'UMBRELLAS', 0.33, INK.ink);
    words(ctx, PX, BY, 4.32, 'COME IN OUT OF THE SUN', 0.12, C.navy, 'Rethink Sans');
  });
  // The umbrella on top: open while the shop is, furled when it's shut; and
  // OPEN or CLOSED on the pole.
  R.thing(PX + 0.01, PY + 0.01, (ctx, t) => {
    const o = open(ID, t);
    brolly(ctx, PX, PY, TOP + 1.3, 1.3, INK.stripes, o);
    board(ctx, 'y', PX + 0.11, PY, 1.6, 0.95, 0.4, o > 0.5 ? 'OPEN' : 'CLOSED', { board: o > 0.5 ? C.butter : C.greyLight, ink: C.ink, size: 0.22, edge: 0.03 });
  }, { anim: true });

  // A step and a mat, and the rain inside leaking out under the wall.
  R.thing(12.5, -0.05, (ctx) => {
    doorstep(ctx, 'right', 12.5, 2.2, C.navy);
    const pts = [];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const w = 1 + Math.sin(a * 3) * 0.1 + Math.cos(a * 5) * 0.06;
      pts.push([14.7 + Math.cos(a) * 0.75 * w, -0.45 + Math.sin(a) * 0.4 * w, 0.01]);
    }
    poly(ctx, pts);
    paint(ctx, alpha(C.water, 0.55), { stroke: false });
    face(ctx, [[14.25, -0.02, 0.012], [14.45, -0.02, 0.012], [14.5, -0.35, 0.012], [14.3, -0.35, 0.012]], alpha(C.water, 0.55), { stroke: false });
  });
  // The drips, joining the puddle.
  R.thing(14.7, -0.1, (ctx, t) => {
    if (!Q.detail) return;
    for (let i = 0; i < 2; i++) {
      const k = ((t * 0.7 + i * 0.5) % 1);
      const [X, Y] = P(14.4 + i * 0.3, -0.05 - k * 0.5, 0.02);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.05 + k * 0.2, 0.025 + k * 0.1, 0, 0, Math.PI * 2);
      ctx.strokeStyle = alpha(C.white, 0.8 * (1 - k)); ctx.lineWidth = 0.03; ctx.stroke();
    }
  }, { anim: true });

  // The doorway glows at night while it's open.
  R.light({ at: [12.5, 0.4, 1.6], r: 2.6, color: LIT, k: (t) => nightK(t) * open(ID, t) });

  // ---------- The afternoon downpour, indoors ----------
  // Everyone piles in to stand in it. They appear rather than walk in (the
  // door opens behind the counter).
  const held = (cols, r = 0.85) => (ctx, p) => {
    const [a, b] = [P(p.x + 0.25, p.y, 1.3), P(p.x + 0.25, p.y, 3.25)];
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.06; ctx.stroke();
    brolly(ctx, p.x + 0.25, p.y, 3.3, r, cols);
  };
  extras(R, ID, [
    { path: [[6.0, 10.0]], seed: 641, dir: 'r', top: C.purple, arms: [2.6, -0.3], prop: held([C.coral, C.white]),
      say: (t) => (Math.sin(t * 0.5) > 0.8 ? 'LOVELY DAY FOR IT' : null) },
    { path: [[9.0, 10.4]], seed: 642, dir: 'l', top: C.mustard, hat: 'sun', scale: 0.7, delay: 0.1,
      pose: (t) => (Math.sin(t * 2.2) > 0.2 ? 'jump' : 'stand'), prop: held([C.teal, C.butter], 0.6) },
    { path: [[5.2, 7.4]], seed: 643, dir: 'r', top: C.greyLight, delay: 0.2, arms: [2.9, -2.9],
      prop: (ctx, p) => {
        // a newspaper for a hat: forgot hers
        const [X, Y] = P(p.x, p.y, 2.45);
        ctx.beginPath(); ctx.moveTo(X - 0.55, Y + 0.1); ctx.lineTo(X, Y - 0.12); ctx.lineTo(X + 0.55, Y + 0.1);
        paint(ctx, C.white, { dots: C.grey, density: 0.3, lw: 0.03 });
      },
      say: (t) => (Math.sin(t * 0.6 + 2) > 0.85 ? 'FORGOT MINE' : null) },
    { path: [[13.4, 3.6]], seed: 644, dir: 'r', back: true, top: C.teal, hat: 'beanie', delay: 0.3, arms: [1.3, 0.3],
      prop: (ctx, p) => {
        // a furled one to pay for, dripping
        const [a, b] = [P(p.x + 0.3, p.y - 0.2, 0.2), P(p.x + 0.3, p.y - 0.2, 1.6)];
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.16; ctx.stroke();
        ctx.strokeStyle = C.pink; ctx.lineWidth = 0.1; ctx.stroke();
      } },
  ]);
}

// Lettering on an upright board along y (it faces the viewer's lower right).
function words(ctx, x, y, z, text, size, ink, font) {
  if (!Q.detail) return;
  ctx.save();
  const [dx, dy] = P(x, 0, 0);
  ctx.translate(dx, dy);
  paintText(ctx, 'left', y, z, text, size, ink, font);
  ctx.restore();
}
