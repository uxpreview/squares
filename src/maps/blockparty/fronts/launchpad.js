// The Launch Pad's front: a vacant lot where the mechanic has built a rocket,
// so the street gets a car park's boom barrier over the gap in the fence (up
// while it's open, down when it's shut), a proper sign on two posts with a
// little rocket on top, and a stack of tyres. Its door is in the left wall at
// y 12.5, onto the alley between columns 1 and 2 (people walk 2 out; things
// on the ground stay within 1.2 of the wall). Open 8am to 10pm. From 7:30pm
// the countdown: a crowd comes out through the crew hut to stand behind the
// rope, and at 8:48pm the rocket goes (the room file does the rocket).
import { C, Q, P, box, face, paint, person, folk, paintText, cylinder } from '../../../engine/art.js';
import { FRONT, board, doorstep, LIT } from '../style.js';
import { open, nightK, hour, within, HOURS, HOUR, LAUNCH } from '../clock.js';
import { extras } from './observatory.js';

const ID = 'launchpad';
const INK = FRONT[ID];
const SX = -0.7; // the sign's posts, out from the wall
const B = [-0.45, 11.0]; // the barrier's post, just before the door

function words(ctx, x, y, z, text, size, ink, font) {
  if (!Q.detail) return;
  ctx.save();
  const [dx, dy] = P(x, 0, 0);
  ctx.translate(dx, dy);
  paintText(ctx, 'left', y, z, text, size, ink, font);
  ctx.restore();
}

// Hours since liftoff, from minus twelve to plus twelve.
const sinceLaunch = (t) => ((hour(t) - LAUNCH + 36) % 24) - 12;

export default function (R) {
  // The sign: two posts past the door, high enough to clear the crew hut,
  // a board, and a little rocket standing on top.
  const S0 = 13.9, S1 = 15.9, SY = (S0 + S1) / 2, SZ = 4.0;
  R.thing(SX, S0, (ctx) => box(ctx, SX - 0.08, S0 - 0.08, 0, 0.16, 0.16, SZ + 0.6, C.ink, { flat: true, stroke: false }));
  R.thing(SX, S1, (ctx) => {
    box(ctx, SX - 0.08, S1 - 0.08, 0, 0.16, 0.16, SZ + 0.6, C.ink, { flat: true, stroke: false });
    board(ctx, 'y', SX, SY, SZ, 3.4, 1.3, null, { board: INK.board });
    // a hazard stripe along the bottom
    for (let i = 0; i < 8; i++) {
      const y0 = SY - 1.7 + i * 0.425;
      face(ctx, [[SX, y0, SZ - 0.65], [SX, y0 + 0.21, SZ - 0.65], [SX, y0 + 0.21, SZ - 0.48], [SX, y0, SZ - 0.48]], i % 2 ? C.ink : C.mustard, { stroke: false });
    }
    words(ctx, SX, SY, SZ + 0.3, 'LAUNCH PAD', 0.56, INK.ink);
    words(ctx, SX, SY, SZ - 0.22, 'VACANT LOT (ISH)', 0.24, C.navy, 'Rethink Sans');
    // the little rocket on top
    const [X, Y] = P(SX, SY, SZ + 1.35);
    ctx.beginPath();
    ctx.moveTo(X - 0.45, Y + 0.5); ctx.lineTo(X - 0.2, Y + 0.05); ctx.lineTo(X - 0.2, Y + 0.5); ctx.closePath();
    ctx.moveTo(X + 0.45, Y + 0.5); ctx.lineTo(X + 0.2, Y + 0.05); ctx.lineTo(X + 0.2, Y + 0.5); ctx.closePath();
    paint(ctx, C.coral, { lw: 0.03 });
    ctx.beginPath(); ctx.ellipse(X, Y, 0.22, 0.6, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.04 });
    ctx.beginPath(); ctx.moveTo(X - 0.2, Y - 0.3); ctx.quadraticCurveTo(X, Y - 0.85, X + 0.2, Y - 0.3); ctx.closePath(); paint(ctx, C.coral, { lw: 0.03 });
    ctx.beginPath(); ctx.arc(X, Y - 0.05, 0.09, 0, Math.PI * 2); paint(ctx, C.sky, { lw: 0.025 });
  });
  // OPEN or CLOSED, hung on the post by the door.
  R.thing(SX + 0.02, S0 + 0.02, (ctx, t) => {
    const o = open(ID, t) > 0.5;
    board(ctx, 'y', SX + 0.1, S0 + 0.1, 1.7, 0.95, 0.4, o ? 'OPEN' : 'CLOSED', { board: o ? C.butter : C.greyLight, ink: C.ink, size: 0.22, edge: 0.03 });
  }, { anim: true });

  // The boom barrier: up while it's open, down across the door when it's shut.
  R.thing(B[0], B[1], (ctx, t) => {
    box(ctx, B[0] - 0.18, B[1] - 0.18, 0, 0.36, 0.36, 1.1, C.mustard, { top: C.ink });
    const a = open(ID, t) * 1.35, L = 2.8;
    const at = (k) => P(B[0], B[1] + 0.1 + Math.cos(a) * L * k, 1.0 + Math.sin(a) * L * k);
    ctx.lineCap = 'butt';
    const [x0, y0] = at(0), [x1, y1] = at(1);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.2; ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const [ax, ay] = at(i / 7), [bx, by] = at((i + 1) / 7);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
      ctx.strokeStyle = i % 2 ? C.white : INK.ink; ctx.lineWidth = 0.13; ctx.stroke();
    }
  }, { anim: true });

  // A step and a mat, and a stack of old tyres by the fence.
  R.thing(-0.05, 11.4, (ctx) => doorstep(ctx, 'left', 12.5, 2.2, C.grey));
  R.thing(-0.6, 9.9, (ctx) => {
    for (let i = 0; i < 3; i++) cylinder(ctx, -0.6, 9.9, i * 0.32, 0.5, 0.32, C.ink, { top: C.grey });
    cylinder(ctx, -0.6, 9.9, 0.96, 0.2, 0.02, C.night, { stroke: false });
  });

  // The doorway glows at night while it's open.
  R.light({ at: [-0.4, 12.5, 1.6], r: 2.6, color: LIT, k: (t) => nightK(t) * open(ID, t) });

  // ---------- The countdown crowd ----------
  // Behind a rope across the lot (the dog does laps round them), out through
  // the crew hut from 7:30pm, staying till the rocket's well gone.
  R.thing(7.8, 11.8, (ctx) => {
    const posts = [[4.3, 11.8], [6.0, 11.8], [7.7, 11.8]];
    for (let i = 0; i < 2; i++) {
      const [a] = posts[i], [c] = posts[i + 1];
      ctx.beginPath();
      for (let k = 0; k <= 8; k++) {
        const [X, Y] = P(a + (c - a) * (k / 8), 11.8, 0.95 - Math.sin((k / 8) * Math.PI) * 0.25);
        k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      }
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.12; ctx.stroke();
      ctx.strokeStyle = C.coral; ctx.lineWidth = 0.07; ctx.stroke();
    }
    for (const [x, y] of posts) {
      face(ctx, [[x, y, 0], [x, y, 1.0]], null, { lw: 0.08, stroke: C.ink });
      const [X, Y] = P(x, y, 1.02);
      ctx.beginPath(); ctx.arc(X, Y, 0.08, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.03 });
    }
  });
  const liftoff = (t) => { const h = sinceLaunch(t); return h >= 0 && h < 0.45; };
  const count = (t) => {
    const s = -sinceLaunch(t) * HOUR; // seconds to go
    return s > 0 && s < 6 ? String(Math.ceil(s / 1.95)) + '!' : liftoff(t) ? 'WOOO!' : null;
  };
  const HUT = [3.35, 13.7];
  extras(R, ID, [
    { path: [HUT, [4.6, 13.2], [5.1, 12.5]], seed: 611, dir: 'r', back: true, top: C.teal, pose: (t) => (liftoff(t) ? 'cheer' : 'stand'), say: count },
    { path: [HUT, [4.8, 13.0], [6.3, 12.6]], seed: 612, dir: 'r', back: true, top: C.mustard, delay: 0.1, pose: (t) => (liftoff(t) ? 'jump' : 'point') },
    { path: [HUT, [5.0, 13.8]], seed: 613, dir: 'r', back: true, top: C.pink, scale: 0.7, delay: 0.2, pose: (t) => (liftoff(t) ? 'jump' : 'wave') },
    { path: [HUT, [4.8, 14.3], [6.4, 13.9]], seed: 614, dir: 'r', back: true, top: C.coral, delay: 0.3, pose: (t) => (liftoff(t) ? 'cheer' : 'stand') },
    { path: [HUT, [4.6, 14.8], [5.7, 14.8]], seed: 615, dir: 'r', back: true, top: C.lilac, hat: 'cap', delay: 0.35, arms: [2.0, 1.8],
      prop: (ctx, p) => { const [X, Y] = P(p.x, p.y, 0); ctx.beginPath(); ctx.rect(X + 0.05, Y - 2.2, 0.36, 0.26); paint(ctx, C.ink, { lw: 0.02 }); } },
  ], (t) => within(HOURS[ID].rush, hour(t), 0.25));
}
