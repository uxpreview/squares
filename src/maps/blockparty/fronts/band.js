// Band Practice's front. Its side door (painted on the room's left wall, at
// y 12.1) opens right onto Main Street's kerb, where people walk only 0.9
// out: so nothing stands in the road. Two poles at the wall hold a venue
// marquee over the door, bulbs round the edge, with the Honks' name and a
// line that follows their day: practice, the gig at 7, live now, thank you.
// The neighbor's tenth note is taped to a pole. Open 11am to 11pm; from noon
// to 2pm the fans turn up for practice. At 2pm the band carries its amps out
// of this door to the stage (day.js; the room's amps go with them).
import { C, Q, P, box, face, paint, shade } from '../../../engine/art.js';
import { FRONT, board, LIT, words } from '../style.js';
import { open, nightK, hour } from '../clock.js';
import { extras, openCard } from './kit.js';

const ID = 'band';
const INK = FRONT[ID];
const A = 10.75, B = 13.45; // the poles, either side of the door (y 11.05 to 13.15)
const MY = (A + B) / 2, MW = 3.3; // the marquee, over the door
const PX = -0.15;

// The marquee's line, by the hour.
function line(h) {
  if (h >= 11 && h < 14.2) return 'PRACTICE IN PROGRESS';
  if (h >= 14.2 && h < 19) return 'TONIGHT: MAIN STAGE, 7PM';
  if (h >= 19 && h < 22) return 'LIVE NOW, ON MAIN ST';
  if (h >= 22 && h < 23) return 'THANK YOU, BLOCK!';
  return 'PRACTICE AT 11 (SORRY)';
}

export default function (R) {
  // The poles and the marquee's board.
  R.thing(PX, A, (ctx) => box(ctx, PX - 0.08, A - 0.08, 0, 0.16, 0.16, 5.25, C.ink, { flat: true, stroke: false }));
  R.thing(PX, B, (ctx) => {
    box(ctx, PX - 0.08, B - 0.08, 0, 0.16, 0.16, 5.25, C.ink, { flat: true, stroke: false });
    board(ctx, 'y', PX - 0.1, MY, 4.55, MW, 1.35, null, { board: INK.board });
    words(ctx, 'y', PX - 0.1, MY, 4.78, 'THE HONKS', 0.62, INK.ink);
    // a lightning bolt either side
    if (Q.detail) {
      for (const y of [MY - 1.35, MY + 1.35]) {
        face(ctx, [[PX - 0.11, y + 0.05, 5.1], [PX - 0.11, y - 0.12, 4.75], [PX - 0.11, y + 0.02, 4.75], [PX - 0.11, y - 0.08, 4.45], [PX - 0.11, y + 0.12, 4.85], [PX - 0.11, y - 0.02, 4.85]], C.coral, { lw: 0.02 });
      }
    }
    // the neighbor's note, taped on at head height
    face(ctx, [[PX - 0.1, B + 0.1, 1.55], [PX - 0.1, B + 0.62, 1.58], [PX - 0.1, B + 0.6, 2.22], [PX - 0.1, B + 0.08, 2.2]], C.white, { lw: 0.025 });
    words(ctx, 'y', PX - 0.1, B + 0.35, 2.05, 'KEEP IT', 0.1, C.coral);
    words(ctx, 'y', PX - 0.1, B + 0.35, 1.9, 'DOWN!!', 0.1, C.coral);
    words(ctx, 'y', PX - 0.1, B + 0.35, 1.7, 'ask no.10', 0.07, C.navy, 'Rethink Sans');
  });
  // The marquee's line and its bulbs (chasing while it's open, bright at
  // night), and OPEN or CLOSED on the far pole.
  R.thing(PX + 0.01, B + 0.01, (ctx, t) => {
    const h = hour(t), o = open(ID, t) > 0.5;
    board(ctx, 'y', PX - 0.12, MY, 3.98, MW - 0.3, 0.36, line(h), { board: C.white, ink: C.ink, size: 0.19, edge: 0.03, font: 'Rethink Sans' });
    if (Q.detail) {
      const n = 14, step = Math.floor(t * 5);
      for (let i = 0; i < n; i++) {
        const y = MY - MW / 2 + 0.12 + (i / (n - 1)) * (MW - 0.24);
        for (const z of [5.18, 3.92 + 0.0]) {
          const on = o && (i + step + (z > 5 ? 0 : 1)) % 3 !== 0;
          const [X, Y] = P(PX - 0.13, y, z);
          ctx.beginPath(); ctx.arc(X, Y, 0.06, 0, Math.PI * 2);
          ctx.fillStyle = on ? C.butter : shade(C.butter, 0.5); ctx.fill();
        }
      }
    }
  }, { anim: true });

  openCard(R, ID, 'y', PX - 0.11, A - 0.5, 1.6, [PX + 0.02, A - 0.48]);

  // A mat at the door, tucked in against the kerb.
  R.thing(-0.05, 11.2, (ctx) => {
    face(ctx, [[-0.45, 11.25, 0.01], [-0.05, 11.25, 0.01], [-0.05, 12.95, 0.01], [-0.45, 12.95, 0.01]], INK.board, { lw: 0.03 });
    if (Q.detail) face(ctx, [[-0.25, 11.4, 0.015], [-0.25, 12.8, 0.015]], null, { lw: 0.06, stroke: INK.ink });
  });

  // The doorway glows at night while it's open, and so does the marquee.
  R.light({ at: [-0.4, 12.1, 1.6], r: 2.6, color: LIT, k: (t) => nightK(t) * open(ID, t) });
  R.light({ at: [PX - 0.2, MY, 4.5], r: 2.4, color: C.butter, k: (t) => nightK(t) * open(ID, t) * 0.6 });

  // ---------- Practice, noon to 2pm: the fans ----------
  const phone = (ctx, p, t) => {
    const [X, Y] = P(p.x, p.y, 0);
    ctx.beginPath(); ctx.roundRect(X + 0.35, Y - 2.75, 0.16, 0.26, 0.03); paint(ctx, C.ink, { lw: 0.02 });
    if (Math.floor(t * 2) % 2) { ctx.beginPath(); ctx.arc(X + 0.43, Y - 2.7, 0.03, 0, Math.PI * 2); ctx.fillStyle = C.red; ctx.fill(); }
  };
  extras(R, ID, [
    // one in through the door with an autograph book, hoping
    { path: [[0.3, 12.5], [2.0, 13.0]], seed: 661, dir: 'r', top: C.pink, arms: [1.3, 1.1],
      prop: (ctx, p) => { const [X, Y] = P(p.x, p.y, 0); ctx.beginPath(); ctx.rect(X + 0.25, Y - 1.45, 0.34, 0.26); paint(ctx, C.butter, { lw: 0.025 }); },
      say: (t) => (Math.sin(t * 0.6) > 0.8 ? 'SIGN MY BOOK?' : null) },
    { path: [[12.9, 8.4]], seed: 662, dir: 'l', back: true, top: C.ink, delay: 0.1, arms: [2.9, 0.3], prop: phone },
    { path: [[13.6, 11.3]], seed: 663, dir: 'l', back: true, top: C.coral, hat: 'beanie', delay: 0.2, pose: 'cheer',
      say: (t) => (Math.sin(t * 0.5 + 2) > 0.85 ? 'WE LOVE YOU, GOOSE!' : null) },
    { path: [[6.3, 10.8]], seed: 664, dir: 'r', back: true, top: C.mustard, delay: 0.3, pose: (t) => (Math.sin(t * 6.283) > 0 ? 'cheer' : 'stand') },
  ]);
}
