// The Rooftop Pool's front: it's the Lido now (down on a city block, the roof
// went elsewhere). Its door is in the left wall at y 12.5, right on Main
// Street's kerb, where people walk only 0.9 out: so nothing stands out in
// the road. Two posts at the wall hold a striped canopy up out of everyone's
// way, with LIDO on top and the valance owning up to the move; a lifebuoy on
// one post, a palm by the door. Open 8am to 7pm; at noon the Lido is heaving:
// a queue for the diving board and lilos in the water.
import { C, Q, P, box, face, paint, person, folk, plant, shade } from '../../../engine/art.js';
import { FRONT, board, LIT } from '../style.js';
import { open, nightK } from '../clock.js';
import { extras, openCard } from './kit.js';

const ID = 'pool';
const INK = FRONT[ID];
const A = 10.9, B = 14.1; // the two posts, either side of the door (y 11.4 to 13.6)
const PX = -0.15; // at the wall
const OUT = 1.4, CZ = 3.0; // the canopy reaches 1.4 over the kerb, 3 up (clear of heads)
const WATER_Z = -0.35; // the pool's water (rooms/pool.js)

export default function (R) {
  const pt = (u, v, z) => [PX - v, u, z]; // u along the wall, v out over the street

  // The far post, with OPEN or CLOSED hung on it.
  R.thing(PX, A, (ctx) => box(ctx, PX - 0.09, A - 0.09, 0, 0.18, 0.18, 5.2, C.white, { flat: true, lw: 0.03 }));
  openCard(R, ID, 'y', PX - 0.12, A, 1.9, [PX + 0.01, A + 0.01]);

  // The near post, the canopy, the valance and the LIDO board on top.
  R.thing(PX, B, (ctx) => {
    box(ctx, PX - 0.09, B - 0.09, 0, 0.18, 0.18, 5.2, C.white, { flat: true, lw: 0.03 });
    // struts from the posts out to the canopy's edge
    for (const u of [A, B]) face(ctx, [pt(u, 0, CZ - 0.5), pt(u, OUT, CZ)], null, { lw: 0.07, stroke: C.ink });
    const n = 8, w = B - A;
    for (let i = 0; i < n; i++) {
      const u0 = A + (i / n) * w, u1 = A + ((i + 1) / n) * w;
      face(ctx, [pt(u0, 0, CZ + 0.55), pt(u1, 0, CZ + 0.55), pt(u1, OUT, CZ), pt(u0, OUT, CZ)], INK.stripes[i % 2], { lw: 0.03 });
    }
    // the valance: one white band that says it
    board(ctx, 'y', PX - OUT, (A + B) / 2, CZ - 0.18, w, 0.36, 'NOW ON THE GROUND FLOOR', { board: C.white, ink: C.teal, size: 0.19, edge: 0.03 });
    // LIDO, standing on the canopy between the posts
    board(ctx, 'y', PX - 0.05, (A + B) / 2, 4.5, w - 0.1, 1.2, 'LIDO', { board: INK.board, ink: INK.ink, size: 0.72 });
    if (Q.detail) {
      // a wave along the bottom of the board
      ctx.beginPath();
      for (let i = 0; i <= 24; i++) {
        const [X, Y] = P(PX - 0.06, A + 0.2 + (i / 24) * (w - 0.4), 4.05 + Math.sin(i * 1.3) * 0.06);
        i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      }
      ctx.strokeStyle = C.white; ctx.lineWidth = 0.07; ctx.stroke();
    }
    // a lifebuoy on the near post
    const [X, Y] = P(PX - 0.12, B, 1.6);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(X, Y, 0.36, (i / 4) * Math.PI * 2, ((i + 1) / 4) * Math.PI * 2);
      ctx.arc(X, Y, 0.18, ((i + 1) / 4) * Math.PI * 2, (i / 4) * Math.PI * 2, true);
      ctx.closePath();
      paint(ctx, i % 2 ? C.white : C.coral, { lw: 0.03 });
    }
  });

  // A palm in a white pot by the door, against the wall.
  R.thing(-0.3, 9.9, (ctx, t) => plant(ctx, -0.3, 9.9, 0, t, { kind: 'palm', scale: 1.3, potColor: C.white, leaf: C.green }), { anim: true });

  // The doorway glows at night while it's open.
  R.light({ at: [-0.4, 12.5, 1.6], r: 2.6, color: LIT, k: (t) => nightK(t) * open(ID, t) });

  // ---------- Noon at the Lido ----------
  // A queue for the diving board behind the diver who won't, and two lilos.
  const lilo = (color, seed) => (ctx, t, p) => {
    const dx = Math.sin(t * 0.3 + p.x) * 0.3, bob = Math.sin(t * 1.4 + p.y) * 0.03;
    const x = p.x + dx, y = p.y, z = WATER_Z + bob;
    box(ctx, x - 0.95, y - 0.38, z, 1.9, 0.76, 0.16, color, { top: shade(color, 0.05), lw: 0.03 });
    if (Q.detail) for (let i = 1; i < 5; i++) face(ctx, [[x - 0.95 + i * 0.38, y - 0.38, z + 0.17], [x - 0.95 + i * 0.38, y + 0.38, z + 0.17]], null, { lw: 0.025, stroke: shade(color, 0.3) });
    person(ctx, x + 0.1, y, z + 0.2, folk(seed, { pose: 'lie', dir: 'l', hat: 'sun', top: C.coral }), t);
  };
  extras(R, ID, [
    { path: [[8.95, 2.5]], seed: 621, dir: 'l', top: C.red,
      say: (t) => (Math.sin(t * 0.6) > 0.85 ? 'JUST JUMP!' : null) },
    { path: [[9.75, 2.6]], seed: 622, dir: 'l', top: C.teal, delay: 0.1, arms: [0.3, 2.8] },
    { path: [[10.55, 2.7]], seed: 623, dir: 'l', top: C.mustard, scale: 0.72, delay: 0.2, pose: (t) => (Math.sin(t * 2) > 0.3 ? 'jump' : 'stand') },
    { path: [[5.4, 11.75]], seed: 624, delay: 0.05, draw: lilo(C.pink, 624) },
    { path: [[11.0, 5.3]], seed: 625, delay: 0.15, draw: lilo(C.mustard, 625) },
  ]);
}
