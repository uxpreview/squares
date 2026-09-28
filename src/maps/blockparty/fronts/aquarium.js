// The Aquarium's front. Its door is in the left wall at y 12.5, onto the
// alley between columns 1 and 2 (people walk 2 out; things on the ground stay
// within 1.2 of the wall). A navy door frame like a ship's, with the name on
// its header, a fish swimming along the top blowing bubbles, and a plate
// underneath that asks nicely; on the near post, a tally of the day's
// escapes, because the octopus goes out of this door for the noodle bar at
// 6am, 1pm and 8pm. Open 9am to 6pm; from 10:30 to 1pm it's feeding time and
// everyone comes to watch.
import { C, Q, P, box, face, paint, paintText, alpha, shade } from '../../../engine/art.js';
import { FRONT, board, doorstep, LIT } from '../style.js';
import { open, nightK, hour } from '../clock.js';
import { extras } from './observatory.js';

const ID = 'aquarium';
const INK = FRONT[ID];
const D0 = 11.05, D1 = 13.95, DY = (D0 + D1) / 2; // the frame's posts, either side of the door (y 11.4 to 13.6)
const HX = -0.3, HZ = 4.55; // the header board, out from the wall, and its middle
const FZ = 5.55; // the fish on top
const ESCAPES = [6, 13, 20]; // when the octopus gets out (day.js)

// Lettering on an upright board along y (it faces the lower right).
function words(ctx, x, y, z, text, size, ink, font) {
  if (!Q.detail) return;
  ctx.save();
  const [dx, dy] = P(x, 0, 0);
  ctx.translate(dx, dy);
  paintText(ctx, 'left', y, z, text, size, ink, font);
  ctx.restore();
}

// The fish on the header, facing along the wall toward the front, bobbing.
function fish(ctx, y, z) {
  const L = 0.85, H = 0.38, x = HX - 0.02;
  face(ctx, [[x, y - L + 0.15, z], [x, y - L - 0.35, z + 0.35], [x, y - L - 0.25, z], [x, y - L - 0.35, z - 0.35]], INK.stripes[0], { lw: 0.035 });
  face(ctx, [[x, y - 0.2, z + H * 0.9], [x, y + 0.2, z + H + 0.25], [x, y + 0.35, z + H * 0.8]], INK.stripes[0], { lw: 0.035 });
  const body = [];
  for (let i = 0; i <= 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    body.push([x, y + Math.cos(a) * L, z + Math.sin(a) * H]);
  }
  face(ctx, body, C.mustard, { lw: 0.04, dots: shade(C.mustard, 0.3), density: 0.15 });
  for (const k of [-0.25, 0.1]) face(ctx, [[x, y + k, z + H * 0.85], [x, y + k, z - H * 0.85]], null, { lw: 0.06, stroke: C.white });
  const [X, Y] = P(x, y + L - 0.3, z + 0.08);
  ctx.beginPath(); ctx.arc(X, Y, 0.1, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.025 });
  ctx.beginPath(); ctx.arc(X + 0.02, Y, 0.045, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
}

export default function (R) {
  // The frame: two posts and the header, with the name and what's on.
  R.thing(-0.15, D1, (ctx) => {
    for (const y of [D0, D1]) box(ctx, -0.35, y - 0.1, 0, 0.2, 0.2, HZ + 0.6, INK.board, { flat: true, lw: 0.03 });
    board(ctx, 'y', HX, DY, HZ, D1 - D0 + 0.4, 1.1, null, { board: INK.board });
    words(ctx, HX, DY, HZ + 0.15, 'AQUARIUM', 0.5, INK.ink);
    words(ctx, HX, DY, HZ - 0.33, 'NOW SHOWING: FISH', 0.14, C.white, 'Rethink Sans');
    // the plate under it
    board(ctx, 'y', HX, DY, 3.8, D1 - D0 - 0.2, 0.36, null, { board: C.white, edge: 0.03 });
    words(ctx, HX, DY, 3.8, 'PLEASE CLOSE THE DOOR, THE OCTOPUS', 0.13, C.navy, 'Rethink Sans');
    if (Q.detail) {
      // rivets round the header
      for (let i = 0; i <= 8; i++) {
        for (const z of [HZ - 0.47, HZ + 0.47]) {
          const [X, Y] = P(HX - 0.01, D0 - 0.1 + (i / 8) * (D1 - D0 + 0.2), z);
          ctx.beginPath(); ctx.arc(X, Y, 0.04, 0, Math.PI * 2); ctx.fillStyle = C.grey; ctx.fill();
        }
      }
    }
  });
  // The fish swims to and fro along the header, blowing bubbles; OPEN or
  // CLOSED on the far post.
  R.thing(-0.14, D1 + 0.01, (ctx, t) => {
    const y = DY + Math.sin(t * 0.4) * 0.6, z = FZ + Math.sin(t * 1.3) * 0.06;
    fish(ctx, y, z);
    if (Q.detail) {
      ctx.strokeStyle = alpha(C.white, 0.9); ctx.lineWidth = 0.04;
      for (let i = 0; i < 3; i++) {
        const k = (t * 0.45 + i / 3) % 1;
        const [X, Y] = P(HX, y + 0.95 + Math.sin(k * 9 + i) * 0.08, z + 0.1 + k * 1.3);
        ctx.beginPath(); ctx.arc(X, Y, 0.06 + k * 0.08, 0, Math.PI * 2); ctx.stroke();
      }
    }
    const o = open(ID, t) > 0.5;
    board(ctx, 'y', -0.4, D0 - 0.6, 1.6, 0.95, 0.4, o ? 'OPEN' : 'CLOSED', { board: o ? C.butter : C.greyLight, ink: C.ink, size: 0.22, edge: 0.03 });
  }, { anim: true });
  // The day's escapes, chalked up on the near post: a stroke each time.
  R.thing(-0.13, D1 + 0.02, (ctx, t) => {
    board(ctx, 'y', -0.47, D1 + 0.55, 2.35, 0.95, 0.7, null, { board: C.night, edge: 0.03 });
    words(ctx, -0.47, D1 + 0.55, 2.55, 'ESCAPES TODAY', 0.1, C.white, 'Rethink Sans');
    const since = (((hour(t) - 5) % 24) + 24) % 24; // the day starts at 5am
    const n = ESCAPES.filter((h) => since >= h - 5).length;
    ctx.strokeStyle = C.white; ctx.lineWidth = 0.04; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const [a, b] = [P(-0.48, D1 + 0.3 + i * 0.16, 2.12), P(-0.48, D1 + 0.3 + i * 0.16, 2.42)];
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    }
    ctx.stroke();
    if (!n) words(ctx, -0.47, D1 + 0.55, 2.25, 'NONE (YET)', 0.1, C.mint, 'Rethink Sans');
  }, { anim: true });

  // A step and a mat.
  R.thing(-0.05, 11.3, (ctx) => doorstep(ctx, 'left', 12.5, 2.2, C.teal));

  // The doorway glows at night while it's open, and the fish is lit.
  R.light({ at: [-0.4, 12.5, 1.6], r: 2.6, color: LIT, k: (t) => nightK(t) * open(ID, t) });
  R.light({ at: [HX - 0.2, DY, HZ], r: 2.4, color: C.tealLight, k: (t) => nightK(t) * 0.55 });

  // ---------- Feeding time, 10:30 to 1pm ----------
  // Everyone comes to watch. (They appear rather than walk in: the octopus's
  // tank is right inside the door.)
  extras(R, ID, [
    { path: [[10.6, 2.9]], seed: 651, dir: 'r', back: true, top: C.white, hat: 'cap', arms: [2.6, 0.4],
      prop: (ctx, p, t) => {
        // a bucket, and a fish held up by the tail
        const [X, Y] = P(p.x, p.y, 0);
        ctx.beginPath(); ctx.moveTo(X - 0.55, Y - 0.95); ctx.lineTo(X - 0.5, Y - 0.55); ctx.lineTo(X - 0.2, Y - 0.55); ctx.lineTo(X - 0.15, Y - 0.95); ctx.closePath();
        paint(ctx, C.grey, { lw: 0.03 });
        const w = Math.sin(t * 8) * 0.12;
        ctx.save(); ctx.translate(X + 0.62, Y - 2.4); ctx.rotate(Math.PI / 2 + w);
        ctx.beginPath(); ctx.ellipse(0.2, 0, 0.22, 0.1, 0, 0, Math.PI * 2); ctx.moveTo(0, 0); ctx.lineTo(-0.12, 0.1); ctx.lineTo(-0.12, -0.1); ctx.closePath();
        paint(ctx, C.grey, { lw: 0.025 });
        ctx.restore();
      },
      say: (t) => (Math.sin(t * 0.7) > 0.7 ? 'FEEDING TIME!' : null) },
    { path: [[3.2, 1.4]], seed: 652, dir: 'r', back: true, top: C.coral, delay: 0.1, arms: [2.3, 0.2] },
    { path: [[6.6, 1.35]], seed: 653, dir: 'r', back: true, top: C.mustard, scale: 0.7, delay: 0.2, pose: (t) => (Math.sin(t * 2.4) > 0.3 ? 'jump' : 'stand') },
    { path: [[2.4, 4.0]], seed: 654, dir: 'l', back: true, top: C.teal, hat: 'beanie', delay: 0.3, pose: 'point' },
    { path: [[15.0, 7.4]], seed: 655, dir: 'l', top: C.lilac, scale: 0.72, delay: 0.4,
      say: (t) => (Math.sin(t * 0.5 + 1) > 0.85 ? 'CAN WE FEED THE OCTOPUS?' : null) },
  ]);
}
