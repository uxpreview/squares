// The Ice Rink's front. Its door is in the left wall (a low plank fence) at y
// 12.5, onto the alley between columns 3 and 4 (the street is x < 0; people
// walk 2 out, so anything on the ground stays within 1.2 of the wall). A
// gateway: two posts either side of the door with ICE RINK across the top,
// snow on it and icicles under it, a pair of skates hung on a post by their
// laces, a grit bin, a mat. Open 10am to 9pm; from 2pm to 5pm the afternoon
// skate: kids clinging to the boards and two show-offs lapping everyone.
//
// The snowman judge (a walker, day.js) is wheeled out of this gate at 5pm to
// score the party and back at about 11:40pm; while he's out, his spot by the
// judges' bench has a sign on it (rooms/icerink.js hides him).
import { C, Q, P, box, face, paint, person, folk, label, speech, shade, tint, alpha } from '../../../engine/art.js';
import { clamp } from '../../../engine/actors.js';
import { FRONT, board, LIT } from '../style.js';
import { open, rush, nightK } from '../clock.js';
import { extras } from './observatory.js';

const ID = 'icerink';
const INK = FRONT[ID];
const A = 11.2, B = 13.8; // the gateway's posts, either side of the door (y 11.4 to 13.6)
const GX = -0.3; // just out from the fence
const TOP = 3.4;

export default function (R) {
  const post = (ctx, y) => {
    box(ctx, GX - 0.1, y - 0.1, 0, 0.2, 0.2, TOP + 0.9, INK.stripes[0], { flat: true, lw: 0.03 });
    // candy stripes, in the rink's blue and white
    if (Q.detail) for (let z = 0.3; z < TOP; z += 0.6) face(ctx, [[GX + 0.1, y - 0.1, z], [GX + 0.1, y + 0.1, z + 0.25]], null, { lw: 0.08, stroke: C.white });
  };

  // The far post, with OPEN or CLOSED, and a pair of skates hung by the laces.
  R.thing(GX, A, (ctx) => {
    post(ctx, A);
    for (const [dy, dz] of [[-0.15, 0], [0.12, -0.12]]) {
      const [X, Y] = P(GX + 0.2, A + dy, 1.9 + dz);
      ctx.beginPath(); ctx.moveTo(X, Y - 0.5); ctx.lineTo(X + 0.02, Y - 0.2);
      ctx.strokeStyle = C.butter; ctx.lineWidth = 0.03; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(X - 0.15, Y - 0.2); ctx.lineTo(X + 0.1, Y - 0.2); ctx.lineTo(X + 0.12, Y + 0.05); ctx.lineTo(X + 0.35, Y + 0.1); ctx.lineTo(X + 0.35, Y + 0.2); ctx.lineTo(X - 0.15, Y + 0.2);
      ctx.closePath(); paint(ctx, C.white, { lw: 0.03 });
      ctx.beginPath(); ctx.moveTo(X - 0.2, Y + 0.28); ctx.lineTo(X + 0.42, Y + 0.28); ctx.strokeStyle = C.grey; ctx.lineWidth = 0.04; ctx.stroke();
    }
  });
  R.thing(GX + 0.01, A + 0.01, (ctx, t) => {
    const o = open(ID, t) > 0.5;
    board(ctx, 'y', GX - 0.12, A, 1.05, 0.95, 0.4, o ? 'OPEN' : 'CLOSED', { board: o ? C.butter : C.greyLight, ink: C.ink, size: 0.22, edge: 0.03 });
  }, { anim: true });

  // The near post and the sign across the top: ICE RINK, the small print,
  // snow on top, icicles under.
  R.thing(GX, B, (ctx) => {
    post(ctx, B);
    const w = B - A + 0.5, zc = TOP + 0.55;
    board(ctx, 'y', GX, (A + B) / 2, zc, w, 1.1, 'ICE RINK', { board: INK.board, ink: INK.ink, size: 0.6 });
    board(ctx, 'y', GX - 0.01, (A + B) / 2, zc - 0.36, w - 0.4, 0.26, 'FALLING OVER IS FREE', { board: INK.board, ink: C.coral, size: 0.16, edge: 0, font: 'Rethink Sans' });
    // snow along the top
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) {
      const y = A - 0.25 + (w * i) / 16;
      const [X, Y] = P(GX, y, zc + 0.55 + (i % 2 ? 0.14 : 0.06) + Math.sin(i * 1.7) * 0.04);
      i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
    const [e0, e1] = P(GX, A - 0.25 + w, zc + 0.5), [s0, s1] = P(GX, A - 0.25, zc + 0.5);
    ctx.lineTo(e0, e1); ctx.lineTo(s0, s1); ctx.closePath();
    paint(ctx, C.white, { lw: 0.03, dots: tint(C.sky, 0.3), density: 0.15 });
    // icicles along the bottom
    for (let i = 1; i < 11; i++) {
      const y = A - 0.25 + (w * i) / 11;
      const len = 0.2 + ((i * 37) % 5) * 0.08;
      const [X, Y] = P(GX, y, zc - 0.55);
      ctx.beginPath(); ctx.moveTo(X - 0.06, Y); ctx.lineTo(X + 0.06, Y); ctx.lineTo(X, Y + len * 1.12); ctx.closePath();
      paint(ctx, tint(C.sky, 0.5), { lw: 0.02 });
    }
  });

  // A snowy mat, and the grit bin past the door.
  R.thing(-0.05, 11.4, (ctx) => {
    face(ctx, [[-1.25, 11.7, 0.02], [-0.05, 11.7, 0.02], [-0.05, 13.3, 0.02], [-1.25, 13.3, 0.02]], INK.stripes[0], { lw: 0.03, dots: C.white, density: 0.25 });
  });
  R.thing(-0.35, 15.1, (ctx) => {
    box(ctx, -0.75, 14.3, 0, 0.7, 1.0, 0.8, C.mustard, { top: shade(C.mustard, 0.15), lw: 0.04 });
    box(ctx, -0.8, 14.25, 0.8, 0.8, 1.1, 0.12, shade(C.mustard, 0.2), { lw: 0.03 });
    if (Q.detail) label(ctx, -0.76, 14.8, 0.42, 'GRIT', 0.26, C.ink);
    // a dusting of snow on the lid
    face(ctx, [[-0.75, 14.35, 0.93], [-0.1, 14.35, 0.93], [-0.1, 15.1, 0.93], [-0.75, 15.1, 0.93]], alpha(C.white, 0.85), { stroke: false });
  });

  // The way in glows at night while it's open.
  R.light({ at: [-0.3, 12.5, 1.6], r: 2.6, color: LIT, k: (t) => nightK(t) * open(ID, t) });

  // ---------- His spot, while he's out judging ----------
  const judge = R.walkers.find((w) => w.id === 'snowman');
  const away = (t) => (judge ? !judge.at(t).hide : false);
  R.thing(1.75, 13.3, (ctx, t) => {
    if (!away(t)) return;
    // a ring in the snow where he stood, and the sign on a stake
    const [X, Y] = P(1.7, 12.9, 0.02);
    ctx.beginPath(); ctx.ellipse(X, Y, 0.75, 0.36, 0, 0, Math.PI * 2);
    ctx.strokeStyle = alpha(C.sky, 0.8); ctx.lineWidth = 0.06; ctx.stroke();
    box(ctx, 1.95, 13.25, 0, 0.1, 0.1, 1.3, C.brown, { flat: true, stroke: false });
    board(ctx, 'y', 2.0, 13.3, 1.55, 1.5, 0.7, null, { board: C.white, edge: 0.04 });
    label(ctx, 2.0, 13.3, 1.72, 'BACK AFTER', 0.18, C.navy, 'Rethink Sans');
    label(ctx, 2.0, 13.3, 1.44, 'THE PARTY', 0.24, C.coral);
  }, { anim: true });

  // ---------- The afternoon skate, 2pm to 5pm ----------
  // Three kids in through the gate and across the ice to cling to the back
  // boards (it's the only way they stay up).
  const IN = [[0.3, 12.4], [2.9, 11.9], [3.3, 10.6], [5.0, 10.5], [6.2, 8.2]];
  const cling = (t, i) => (Math.sin(t * 2.2 + i * 2) > 0.6 ? 'cheer' : 'stand');
  extras(R, ID, [
    { path: [...IN, [6.0, 5.15]], seed: 761, dir: 'r', back: true, top: C.coral, hat: 'beanie', scale: 0.7, arms: [2.3, 2.1], pose: (t) => cling(t, 0) },
    { path: [...IN, [7.1, 5.15]], seed: 762, dir: 'l', back: true, top: C.mustard, hat: 'beanie', scale: 0.68, arms: [2.3, 2.1], delay: 0.12, pose: (t) => cling(t, 1) },
    { path: [...IN, [13.2, 5.9], [14.4, 7.2]], seed: 763, dir: 'r', back: true, top: C.purple, hat: 'beanie', scale: 0.7, arms: [2.4, 2.0], delay: 0.22,
      say: (t) => (Math.sin(t * 0.7) > 0.8 ? 'I LIVE HERE NOW' : null) },
  ]);
  // Two show-offs lapping the rink, faster than everyone, fading in.
  [0, 1].forEach((i) => {
    const k = (t) => clamp((rush(ID, t) - 0.1 * i) / (1 - 0.1 * i));
    R.mover((t) => {
      if (k(t) <= 0) return { x: 9.5, y: 12, k: 0 };
      const a = t * 0.55 + i * 0.5;
      const vx = -Math.sin(a) * 4.7, vy = Math.cos(a) * 3.4;
      return { x: 9.5 + Math.cos(a) * 4.7, y: 8.75 + Math.sin(a) * 3.4, k: k(t), dir: vx - vy >= 0 ? 'r' : 'l', back: vx + vy < 0 };
    }, (ctx, t, p) => {
      if (!p.k) return;
      ctx.save();
      ctx.globalAlpha = p.k;
      person(ctx, p.x, p.y, 0, folk(771 + i, { pose: 'skate', dir: p.dir, back: p.back, top: i ? C.teal : C.red, hat: i ? 'none' : 'cap', speed: 9, arms: [0.3, -2.6 + i * 0.3] }), t);
      if (Q.detail) {
        const [X, Y] = P(p.x, p.y, 0.02);
        ctx.beginPath(); ctx.moveTo(X - 0.35, Y + 0.02); ctx.lineTo(X + 0.35, Y + 0.02);
        ctx.strokeStyle = C.grey; ctx.lineWidth = 0.05; ctx.stroke();
      }
      ctx.restore();
      if (i === 0 && Q.detail && p.k > 0.9 && Math.sin(t * 0.9) > 0.85) speech(ctx, p.x, p.y, 2.8, 'ON YOUR LEFT', { size: 0.36 });
    });
  });
}
