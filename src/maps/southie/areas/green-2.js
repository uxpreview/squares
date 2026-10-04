// The Roommates: the Green House's second floor. Before noon, four guys
// moving out, slowly: one asleep on the futon, one playing one last game of
// beer pong against himself, one arguing about the deposit in front of a
// poster (there is a hole behind the poster), and the one on the day's clock
// actually carrying boxes. Their friend who doesn't live here sits on the
// porch eyeing the couch on the rope. The landlady comes up at 11:15 with her
// clipboard; at 11:40 the poster comes down.
// After noon a night-shift nurse moves in and sleeps through everything:
// blackout curtain, a white-noise machine, a sleep mask with eyes printed on
// it. Her sister unpacks on tiptoe. At nine she's up and off to work.
// The goose hides in one of the roommates' two duffel bags before noon (its
// tail out of the zip), and in one of her two hampers after (its beak under
// the lid). What changed: of the dozens of party cups on top of the fridge
// this morning, one is still up there tonight (she's too short to see it).
import {
  C, Q, box, rect, disc, cylinder, face, paint, person, folk, speech, shade, tint, mix, alpha,
  onLeft, onRight, P, paintText, chair, label,
} from '../../../engine/art.js';
import { route, particles, clamp } from '../../../engine/actors.js';
import { apartment, carton, lettering } from '../kit.js';
import { SIDING, TRIM, ROOM, BRAND } from '../style.js';
import { BEFORE, AFTER, outK, inK } from '../clock.js';
import { hh, hours, oldSide, newSide, says, line3, backWindow, sleeper } from './green-1.js';

const W = ROOM['green-2'];
// A line said with its bubble running off to the right of the speaker (the
// tail at its left end), so it never sits over the poster to their left.
function saysRight(ctx, x, y, z, t, lines, every, on, off = 0, size = 0.4) {
  const tt = t + off, i = Math.floor(tt / every), p = tt - i * every;
  if (p > on || !Q.detail || p < 0) return;
  const text = lines[i % lines.length], k = 40;
  ctx.save();
  ctx.font = `${size * k}px "Bagel Fat One", "Arial Black", sans-serif`;
  const w = ctx.measureText(text).width + size * k * 0.9;
  ctx.restore();
  speech(ctx, x, y, z, text, { size, dx: (w / 2 - size * k * 0.6) / k });
}
// The poster lets go at 11:37 and is on the floor by 11:42.
const DROP = [11.62, 11.7];
const dropK = (t) => clamp((hh(t) - DROP[0]) / (DROP[1] - DROP[0]));
const SLEEPY = folk(15, { style: 'curly', hair: C.brown, top: C.mustard, bottom: C.grey });
const SHOOTER = folk(16, { style: 'short', top: C.white, bottom: C.navy, hat: 'cap', hair: C.ink });
const ARGUER = folk(17, { style: 'short', top: C.teal, bottom: C.ink, hair: mix(C.brown, C.mustard, 0.4) });
const BUDDY = folk(18, { style: 'bald', top: C.red, bottom: C.navy });
const NURSE = folk(211, { style: 'bun', top: C.tealLight, bottom: C.tealLight, shoes: C.white });
const SISTER = folk(212, { style: 'long', top: C.lilac, bottom: C.navy, hair: NURSE.hair, skin: NURSE.skin });
const NIECE = folk(213, { style: 'pony', top: C.pink, bottom: C.teal, scale: 0.62, hair: NURSE.hair, skin: NURSE.skin });
// The nurse's day: asleep from one, up at eight-twenty, gone by nine.
const asleep = hours(13, 20.3), up = hours(20.3, 21), gone = hours(21, 29);

// A duffel bag lying along x from (x, y): navy canvas, two handles, a zip
// along the top. tail: the goose's (white feathers out of the open end of
// the zip); else a red sock. k: unzipped (0..1), the top folded open.
function duffel(ctx, x, y, k, tail) {
  const w = 1.1, d = 0.5, h = 0.42, col = C.navy;
  box(ctx, x, y, 0, w, d, h, col, { lw: 0.035, top: tint(col, 0.12), dens: 0.15 });
  // The rounded ends, the bands round it.
  for (const u of [0.2, w - 0.2]) face(ctx, [[x + u, y + d + 0.005, 0.02], [x + u, y + d + 0.005, h], [x + u, y, h]], null, { lw: 0.05, stroke: C.mustard });
  if (k < 0.5) {
    line3(ctx, [[x + 0.1, y + d / 2, h + 0.005], [x + w - 0.08, y + d / 2, h + 0.005]], C.ink, 0.03);
    // The pull, back at the far end; the zip's open a hand's width at the near one.
    box(ctx, x + w - 0.36, y + d / 2 - 0.04, h, 0.08, 0.08, 0.02, C.greyLight, { flat: true, lw: 0.01 });
    if (tail) {
      // White tail feathers out of the gap, and a tip of an orange foot.
      const [X, Y] = P(x + w - 0.15, y + d / 2, h + 0.02);
      ctx.beginPath(); ctx.moveTo(X - 0.14, Y); ctx.lineTo(X + 0.05, Y - 0.26); ctx.lineTo(X + 0.12, Y - 0.12); ctx.lineTo(X + 0.2, Y - 0.2); ctx.lineTo(X + 0.16, Y + 0.02); ctx.closePath();
      paint(ctx, C.white, { lw: 0.02 });
      if (Q.detail) { ctx.strokeStyle = C.grey; ctx.lineWidth = 0.015; ctx.beginPath(); ctx.moveTo(X, Y - 0.04); ctx.lineTo(X + 0.06, Y - 0.18); ctx.moveTo(X + 0.1, Y - 0.04); ctx.lineTo(X + 0.15, Y - 0.14); ctx.stroke(); }
    } else {
      const [X, Y] = P(x + w - 0.15, y + d / 2, h + 0.02);
      ctx.beginPath(); ctx.moveTo(X - 0.08, Y); ctx.lineTo(X - 0.04, Y - 0.26); ctx.lineTo(X + 0.18, Y - 0.3); ctx.lineTo(X + 0.2, Y - 0.2); ctx.lineTo(X + 0.06, Y - 0.17); ctx.lineTo(X + 0.08, Y + 0.02); ctx.closePath();
      paint(ctx, C.red, { lw: 0.02 });
    }
  } else {
    // Unzipped: the top folded back both ways, the inside dark.
    rect(ctx, x + 0.1, y + 0.08, w - 0.2, d - 0.16, h + 0.006, shade(col, 0.55), { stroke: false });
    face(ctx, [[x + 0.1, y + 0.08, h], [x + w - 0.1, y + 0.08, h], [x + w - 0.1, y - 0.05, h + 0.25], [x + 0.1, y - 0.05, h + 0.25]], tint(col, 0.12), { lw: 0.025 });
    if (!tail) cylinder(ctx, x + 0.6, y + 0.25, h - 0.1, 0.12, 0.14, C.red);
  }
  // The handles, over the top.
  for (const dy of [0.12, d - 0.12]) line3(ctx, [[x + 0.35, y + dy, h], [x + 0.5, y + dy, h + 0.22], [x + 0.75, y + dy, h + 0.22], [x + w - 0.35, y + dy, h]], C.ink, 0.04);
}
// A round wicker hamper at (x, y), its lid lifted off by k. beak: the
// goose's beak out under the lid (else a teal scrubs sleeve).
function hamper(ctx, x, y, k, beak) {
  const r = 0.36, h = 0.8, wick = C.woodLight;
  cylinder(ctx, x, y, 0, r, h, wick, { top: shade(wick, 0.45) });
  if (Q.detail) {
    // The weave, in bands.
    for (const z of [0.18, 0.38, 0.58]) { const [a, b] = P(x - r * 0.7, y + r * 0.7, z), [c, e] = P(x + r * 0.7, y - r * 0.7, z), [m, n] = P(x + r * 0.7, y + r * 0.7, z - 0.08); ctx.beginPath(); ctx.moveTo(a, b); ctx.quadraticCurveTo(m, n, c, e); ctx.strokeStyle = shade(wick, 0.35); ctx.lineWidth = 0.025; ctx.stroke(); }
  }
  const lift = k < 0.5 ? 0.2 : 0;
  if (k < 0.5) {
    // Something under the lid holding it up a crack.
    const [X, Y] = P(x + r * 0.75, y + r * 0.75, h + 0.1);
    if (beak) {
      // A sliver of white head in the gap, the beak poking out of it.
      ctx.beginPath(); ctx.ellipse(X - 0.06, Y - 0.02, 0.2, 0.09, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.02 });
    }
    cylinder(ctx, x, y, h + lift, r + 0.03, 0.06, shade(wick, 0.1), { flat: true, top: wick });
    ctx.beginPath();
    if (beak) { ctx.moveTo(X + 0.08, Y - 0.07); ctx.lineTo(X + 0.46, Y + 0.03); ctx.lineTo(X + 0.08, Y + 0.07); ctx.closePath(); paint(ctx, C.coral, { lw: 0.02 }); }
    else { ctx.moveTo(X - 0.1, Y - 0.02); ctx.lineTo(X + 0.08, Y + 0.0); ctx.lineTo(X + 0.12, Y + 0.32); ctx.lineTo(X - 0.02, Y + 0.34); ctx.closePath(); paint(ctx, C.tealLight, { lw: 0.02 }); }
  } else {
    // Lid off, leaning on its side; the washing inside.
    const [X, Y] = P(x, y, h);
    ctx.beginPath(); ctx.ellipse(X, Y - 0.04, 0.38, 0.15, 0, 0, Math.PI * 2); paint(ctx, beak ? C.white : C.tealLight, { lw: 0.02 });
    face(ctx, [[x - 0.3, y - r - 0.05, 0.05], [x + 0.3, y - r - 0.05, 0.05], [x + 0.3, y - r - 0.12, 0.75], [x - 0.3, y - r - 0.12, 0.75]], wick, { lw: 0.025 });
  }
}

export default {
  id: 'green-2',
  name: 'The Roommates',
  blurb: 'Four guys, one futon and a poster over a hole. Flip the clock to meet the night nurse.',
  size: [15, 9],
  build(R) {
    // Her window's dark while she's at work (the only dark one on the row).
    apartment(R, { floor: 1, walls: W, floorInk: W.floor, siding: SIDING.green, trim: TRIM.green, lit: (t) => (gone(t) ? 0 : 1) });
    R.dark((t) => (gone(t) ? 0.5 : 0));
    const old = oldSide, neu = newSide;

    // ---------- The floor and the walls ----------
    R.floor((ctx) => {
      if (!Q.detail) return;
      ctx.save(); ctx.globalAlpha *= 0.25;
      for (let y = 2.5; y < 9; y += 0.55) face(ctx, [[0, y, 0.004], [12.5, y, 0.004], [12.5, y + 0.03, 0.004], [0, y + 0.03, 0.004]], C.brown, { stroke: false });
      ctx.restore();
      // A ring where a cup sat on the floor for a year.
      ctx.save(); ctx.globalAlpha *= 0.3;
      for (const [u, v] of [[9.9, 4.9], [8.2, 7.4], [3.4, 5.2]]) { const [X, Y] = P(u, v, 0.005); ctx.beginPath(); ctx.ellipse(X, Y, 0.2, 0.1, 0, 0, Math.PI * 2); ctx.strokeStyle = C.brown; ctx.lineWidth = 0.04; ctx.stroke(); }
      ctx.restore();
    });
    backWindow(R, 5.4, 1.85, 1.1, 1.3);

    // Their walls, before noon: the pennant (no team, just CHAMPS), the
    // chore chart, a dartboard with the darts in the wall around it.
    R.thing(0.02, 0.02, (ctx) => {
      const [a, b, c] = [P(9.3, 0, 3.3), P(9.3, 0, 2.5), P(11.4, 0, 2.95)];
      ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c); ctx.closePath();
      paint(ctx, C.navy, { lw: 0.03 });
      onRight(ctx, 9.15, 2.45, 0.2, 0.9, C.white, { lw: 0.02 });
      paintText(ctx, 'right', 10.15, 2.92, 'CHAMPS', 0.22, C.white, 'Bagel Fat One');
      // The chore chart: every name crossed off every chore.
      onRight(ctx, 7.6, 1.6, 1.3, 1.0, C.white, { lw: 0.03 });
      paintText(ctx, 'right', 8.25, 2.45, 'CHORES', 0.14, C.red, 'Bagel Fat One');
      if (Q.detail) for (let i = 0; i < 4; i++) {
        paintText(ctx, 'right', 7.95, 2.22 - i * 0.16, ['DISHES', 'TRASH', 'BATH', 'RENT'][i], 0.08, C.ink, 'Rethink Sans');
        line3(ctx, [[8.3, 0.005, 2.22 - i * 0.16], [8.75, 0.005, 2.24 - i * 0.16]], C.red, 0.02);
        paintText(ctx, 'right', 8.55, 2.22 - i * 0.16, 'nobody', 0.07, C.teal, 'Rethink Sans');
      }
      // The dartboard, and the holes round it.
      const [X, Y] = P(11.9, 0, 2.6);
      for (const [r, col] of [[0.34, C.ink], [0.27, C.red], [0.19, C.butter], [0.1, C.green], [0.04, C.red]]) { ctx.beginPath(); ctx.ellipse(X, Y, r, r * 1.1, -0.45, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); }
      if (Q.detail) { ctx.fillStyle = C.ink; for (const [u, v] of [[11.2, 3.4], [12.3, 1.9], [11.5, 1.7], [12.4, 3.2], [11.1, 2.2]]) { const [x2, y2] = P(u, 0, v); ctx.fillRect(x2, y2, 0.05, 0.05); } }
    }, { on: old, depth: 0.1 });
    // Hers, after: the shift calendar (NIGHTS, NIGHTS, NIGHTS).
    R.thing(0.02, 0.02, (ctx) => {
      onRight(ctx, 9.6, 1.9, 1.2, 1.1, C.white, { lw: 0.03 });
      onRight(ctx, 9.6, 2.75, 1.2, 0.25, C.teal, { stroke: false });
      paintText(ctx, 'right', 10.2, 2.87, 'SHIFTS', 0.13, C.white, 'Bagel Fat One');
      if (Q.detail) for (let i = 0; i < 4; i++) paintText(ctx, 'right', 10.2, 2.55 - i * 0.16, 'NIGHTS', 0.1, C.navy, 'Rethink Sans');
    }, { on: neu, depth: 0.1 });

    // ---------- The poster, and the hole behind it ----------
    // The hole: a fist-sized dent gone right through the plaster (after
    // one, the landlady's patch over it).
    const HY = 7.8, HZ = 2.2;
    R.decor((ctx) => {
      ctx.beginPath();
      const pts = [[-0.3, -0.1], [-0.15, -0.28], [0.08, -0.22], [0.28, -0.3], [0.32, 0.02], [0.2, 0.26], [-0.06, 0.3], [-0.28, 0.18]];
      pts.forEach(([u, v], i) => { const [X, Y] = P(0, HY + u, HZ + v); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
      ctx.closePath();
      paint(ctx, shade(W.left, 0.75), { lw: 0.03 });
      if (!Q.detail) return;
      ctx.strokeStyle = shade(W.left, 0.4); ctx.lineWidth = 0.02; ctx.beginPath();
      for (const [a, b] of [[[0.3, 0.1], [0.55, 0.22]], [[-0.25, 0.2], [-0.45, 0.4]], [[0.1, -0.25], [0.2, -0.5]]]) { const [x1, y1] = P(0, HY + a[0], HZ + a[1]), [x2, y2] = P(0, HY + b[0], HZ + b[1]); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }
      ctx.stroke();
      // Lath showing through.
      for (const v of [-0.08, 0.1]) line3(ctx, [[0.005, HY - 0.2, HZ + v], [0.005, HY + 0.22, HZ + v]], C.wood, 0.06);
    });
    R.thing(0.03, HY + 0.6, (ctx) => {
      onLeft(ctx, HY - 0.5, HZ - 0.4, 1.0, 0.8, tint(W.left, 0.5), { lw: 0.02 });
      paintText(ctx, 'left', HY, HZ, 'PATCHED', 0.12, alpha(C.ink, 0.35), 'Rethink Sans');
    }, { on: hours(13, 29) });
    // The poster: THE DEPOSITS, reunion tour. It lets go at 11:37.
    // swing: lifted at the bottom by a tap, turning on its top edge (0 flat
    // on the wall, 1 swung up off the hole).
    const poster = (ctx, k, lean, swing = 0) => {
      const y0 = 7.0, y1 = 8.6, z0 = 1.25, z1 = 3.3, drop = k * (z0 - 0.05), a = swing * 1.15;
      const q = (u, v) => {
        const d = (1 - v) * (z1 - z0);
        const zz = swing > 0 ? z1 - d * Math.cos(a) : z0 + (z1 - z0) * v - drop, x = swing > 0 ? 0.03 + d * Math.sin(a) : 0.03 + lean * v;
        return [x, y0 + (y1 - y0) * u, zz];
      };
      face(ctx, [q(0, 0), q(1, 0), q(1, 1), q(0, 1)], C.purple, { lw: 0.035, dots: shade(C.purple, 0.4), density: 0.2 });
      face(ctx, [q(0.08, 0.35), q(0.92, 0.35), q(0.92, 0.72), q(0.08, 0.72)], C.mustard, { lw: 0.02 });
      // A guitar, a drum, a sunburst.
      const [X, Y] = P(...q(0.5, 0.54));
      ctx.beginPath(); ctx.ellipse(X, Y, 0.24, 0.16, -0.45, 0, Math.PI * 2); paint(ctx, C.coral, { lw: 0.02 });
      if (!Q.detail) return;
      ctx.save();
      const [ax, ay] = P(...q(0, 0)), [bx, by] = P(...q(1, 0)), [cx, cy] = P(...q(0, 1));
      ctx.transform((bx - ax), (by - ay), (cx - ax), (cy - ay), ax, ay);
      ctx.scale(-1 / 40, -1 / 40);
      const txt = (s, v, size, font) => { ctx.font = `${size * 40}px "${font}", "Arial Black", sans-serif`; ctx.fillText(s, -20, -v * 40); };
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = C.white;
      txt('THE', 0.9, 0.09, 'Bagel Fat One'); txt('DEPOSITS', 0.81, 0.13, 'Bagel Fat One');
      txt('REUNION TOUR', 0.22, 0.06, 'Rethink Sans'); txt('ONE NIGHT ONLY', 0.13, 0.06, 'Rethink Sans');
      ctx.restore();
      // Tape at the top corners.
      if (lean === 0 && k === 0 && swing === 0) for (const u of [0.02, 0.98]) face(ctx, [q(u - 0.05, 0.96), q(u + 0.05, 0.96), q(u + 0.05, 1.03), q(u - 0.05, 1.03)], alpha(tint(C.butter, 0.4), 0.9), { stroke: false });
    };
    // A tap lifts it off the hole (it's held up by two bits of tape and hope).
    const posterP = R.poke({ id: 'poster', at: [0.05, 7.8, 2.4], r: 0.95, sound: 'tick', say: ['Nothing back here.', 'Totally nothing.', 'Put it back. Please.'], when: (t) => hh(t) >= 5 && hh(t) < 12 });
    R.thing(0.05, 8.7, (ctx) => poster(ctx, 0, 0, posterP.k()), { anim: true, depth: (t) => (posterP.k() > 0.05 ? 9.6 : 8.75), on: (t) => hh(t) >= 5 && hh(t) < DROP[0] });
    R.thing(0.8, 8.7, (ctx, t) => {
      const k = dropK(t);
      poster(ctx, Math.min(1, k * 1.05), k > 0.85 ? (k - 0.85) / 0.15 * 0.5 : 0);
    }, { anim: true, on: hours(DROP[0], DROP[1]) });
    R.thing(0.8, 8.7, (ctx) => poster(ctx, 1, 0.5), { on: hours(DROP[1], 13) });

    // ---------- The kitchen ----------
    // The radiator, where the ping-pong balls go to die.
    R.thing(0.5, 3.65, (ctx) => {
      box(ctx, 0.02, 2.2, 0, 0.42, 1.4, 0.95, C.greyLight, { lw: 0.035, top: shade(C.greyLight, 0.1) });
      if (Q.detail) for (let u = 2.32; u < 3.55; u += 0.14) line3(ctx, [[0.45, u, 0.12], [0.45, u, 0.88]], shade(C.greyLight, 0.3), 0.035);
      for (const u of [2.3, 3.45]) box(ctx, 0.1, u, -0.0, 0.1, 0.1, 0.12, C.ink, { flat: true, stroke: false });
    });
    R.thing(1.0, 2.7, (ctx) => {
      const [X, Y] = P(0.82, 2.55, 0.15);
      ctx.beginPath(); ctx.arc(X, Y, 0.15, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.03 });
      ctx.beginPath(); ctx.arc(X - 0.04, Y - 0.05, 0.04, 0, Math.PI * 2); ctx.fillStyle = alpha(C.greyLight, 0.9); ctx.fill();
    }, { on: BEFORE.when });
    // The fridge: nothing in it but ketchup and hope. Magnets, a note.
    R.thing(1.15, 5.15, (ctx) => {
      box(ctx, 0.02, 3.95, 0, 1.1, 1.15, 3.0, C.white, { lw: 0.045 });
      face(ctx, [[1.12, 4.0, 1.95], [1.12, 5.05, 1.95]], null, { lw: 0.04 });
      box(ctx, 1.12, 4.85, 1.2, 0.08, 0.1, 0.55, C.greyLight, { flat: true, lw: 0.02 });
      box(ctx, 1.12, 4.85, 2.1, 0.08, 0.1, 0.5, C.greyLight, { flat: true, lw: 0.02 });
    });
    R.thing(1.2, 5.15, (ctx) => {
      face(ctx, [[1.125, 4.15, 2.3], [1.125, 4.65, 2.3], [1.125, 4.65, 2.75], [1.125, 4.15, 2.75]], C.butter, { lw: 0.015 });
      lettering(ctx, 'y', 1.13, 4.4, 2.6, 'WHO ATE', 0.07, C.ink);
      lettering(ctx, 'y', 1.13, 4.4, 2.45, 'MY PIZZA', 0.07, C.red);
    }, { on: old });
    R.thing(1.2, 5.15, (ctx) => {
      face(ctx, [[1.125, 4.15, 2.3], [1.125, 4.65, 2.3], [1.125, 4.65, 2.75], [1.125, 4.15, 2.75]], tint(C.mint, 0.3), { lw: 0.015 });
      lettering(ctx, 'y', 1.13, 4.4, 2.6, 'SLEEPING', 0.065, C.navy);
      lettering(ctx, 'y', 1.13, 4.4, 2.45, 'TIL 8PM', 0.07, C.navy);
    }, { on: neu });
    // On top of the fridge: every red party cup they ever bought, stacked
    // and stood, before noon. After, the one they missed (front left).
    const LAST = [0.75, 4.8];
    const CUPS = [];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) if (!(i === 3 && j === 4)) CUPS.push([0.2 + i * 0.24, 4.1 + j * 0.22, (i * 3 + j) % 4 === 0 ? 2 : 1]);
    R.thing(1.16, 5.16, (ctx) => {
      for (const [u, v, n] of CUPS) for (let k = 0; k < n; k++) cylinder(ctx, u, v, 3.0 + k * 0.08, 0.08, 0.2, C.red, { top: C.white });
      cylinder(ctx, LAST[0], LAST[1], 3.0, 0.08, 0.2, C.red, { top: C.white });
    }, { on: oldSide });
    R.thing(1.16, 5.16, (ctx) => cylinder(ctx, LAST[0], LAST[1], 3.0, 0.08, 0.2, C.red, { top: C.white }), { on: (t) => !oldSide(t) });
    // The counter and the sink; a pyramid of Gander Cola cans before noon,
    // her coffee maker after.
    R.thing(1.05, 6.75, (ctx) => {
      box(ctx, 0, 5.15, 0, 1.0, 1.55, 1.15, C.greyLight, { lw: 0.04, top: tint(C.grey, 0.2) });
      rect(ctx, 0.18, 5.5, 0.64, 0.7, 1.151, shade(C.grey, 0.2), { lw: 0.02 });
      box(ctx, 0.05, 5.8, 1.15, 0.1, 0.08, 0.5, C.greyLight, { flat: true, lw: 0.02 });
      box(ctx, 0.05, 5.8, 1.6, 0.38, 0.08, 0.07, C.greyLight, { flat: true, lw: 0.02 });
    });
    R.thing(1.1, 6.8, (ctx) => {
      const cans = [[0, 0], [0.22, 0], [0.44, 0], [0.11, 1], [0.33, 1], [0.22, 2]];
      for (const [u, row] of cans) cylinder(ctx, 0.45, 6.15 + u + row * 0.0, 1.15 + row * 0.26, 0.09, 0.25, BRAND.can, { top: C.greyLight });
      if (Q.detail) lettering(ctx, 'x', 0.45, 6.72, 1.25, 'GANDER', 0.07, BRAND.ink);
    }, { on: old });
    R.thing(1.1, 6.8, (ctx) => {
      box(ctx, 0.2, 6.05, 1.15, 0.45, 0.4, 0.6, C.black, { flat: true, lw: 0.025 });
      cylinder(ctx, 0.5, 6.25, 1.2, 0.13, 0.25, alpha(tint(C.sky, 0.3), 0.9));
      cylinder(ctx, 0.5, 5.6, 1.15, 0.1, 0.18, C.white);
    }, { on: neu });
    // Blackout curtain over the back window, after noon.
    R.thing(0.05, 7.0, (ctx) => {
      box(ctx, 0.1, 5.0, 3.5, 0.05, 1.9, 0.05, C.ink, { flat: true, stroke: false });
      face(ctx, [[0.08, 5.1, 3.5], [0.08, 6.8, 3.5], [0.08, 6.8, 1.45], [0.08, 5.1, 1.45]], C.navy, { lw: 0.035, dots: shade(C.navy, 0.5), density: 0.2 });
      if (Q.detail) for (const u of [5.5, 5.95, 6.4]) line3(ctx, [[0.09, u, 3.45], [0.09, u, 1.5]], shade(C.navy, 0.35), 0.03);
      if (Q.detail) for (const [u, v] of [[5.12, 3.4], [6.78, 3.4], [5.12, 1.5], [6.78, 1.5]]) face(ctx, [[0.09, u - 0.08, v - 0.05], [0.09, u + 0.08, v - 0.05], [0.09, u + 0.08, v + 0.05], [0.09, u - 0.08, v + 0.05]], alpha(C.greyLight, 0.9), { stroke: false });
    }, { on: neu });
    // The tower of pizza boxes: fourteen, leaning.
    R.thing(3.6, 6.3, (ctx) => {
      for (let i = 0; i < 14; i++) {
        const dx = Math.sin(i * 1.7) * 0.06 + i * 0.012, dy = Math.cos(i * 2.3) * 0.05;
        box(ctx, 2.6 + dx, 5.3 + dy, i * 0.13, 0.95, 0.95, 0.13, C.white, { flat: true, lw: 0.02, top: tint(C.woodLight, 0.4) });
        if (Q.detail && i % 3 === 0) lettering(ctx, 'x', 3.07 + dx, 6.25 + dy + 0.005, i * 0.13 + 0.065, 'PIZZA', 0.07, C.red);
      }
    }, { on: old });
    // Her boxes, after, going down as her sister unpacks.
    const hers = (x, y, words, until) => R.thing(x + 0.9, y + 0.7, (ctx) => {
      let z = 0;
      for (const w of words) { carton(ctx, x, y, z, 0.9, 0.7, 0.6, w); z += 0.6; }
    }, { on: (t) => neu(t) && inK(t) < until });
    hers(1.45, 3.1, ['SCRUBS', 'MORE SCRUBS', 'COFFEE'], 0.7);
    hers(4.8, 7.3, ['COFFEE', 'COFFEE (2)'], 0.45);
    hers(6.2, 7.6, ['EARPLUGS'], 0.9);
    // Theirs, before, going down as the one on the clock carries them.
    const theirs = (x, y, words, gone) => R.thing(x + 0.95, y + 0.75, (ctx) => {
      let z = 0;
      words.forEach((w, i) => { carton(ctx, x + (i % 2) * 0.04, y, z, 0.95, 0.75, 0.6, w); z += 0.6; });
    }, { on: (t) => old(t) && outK(t) < gone });
    theirs(4.8, 7.2, ['STUFF', 'MORE STUFF'], 0.6);
    theirs(6.6, 7.5, ['MIKE\'S?'], 0.85);
    theirs(3.0, 2.6, ['NOT MIKE\'S', 'CABLES'], 0.95);


    // The band's gear (they're THE DEPOSITS): a drum kit, an amp, a laundry
    // pile that is also a chair.
    R.thing(11.2, 8.4, (ctx) => {
      cylinder(ctx, 10.3, 7.7, 0, 0.5, 0.25, C.red, { top: C.white });
      const [X, Y] = P(10.3, 7.7, 0.55);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.5, 0.52, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.035 });
      ctx.beginPath(); ctx.ellipse(X, Y, 0.38, 0.4, 0, 0, Math.PI * 2); paint(ctx, C.red, { stroke: false });
      if (Q.detail) lettering(ctx, 'x', 10.3, 8.25, 0.55, 'DEPOSITS', 0.1, C.white);
      cylinder(ctx, 10.9, 7.0, 0.6, 0.25, 0.2, C.red, { top: C.white });
      box(ctx, 10.88, 6.98, 0, 0.05, 0.05, 0.6, C.greyLight, { flat: true, stroke: false });
      box(ctx, 9.7, 7.0, 0, 0.05, 0.05, 1.6, C.greyLight, { flat: true, stroke: false });
      disc(ctx, 9.72, 7.02, 1.62, 0.35, C.mustard, { lw: 0.025 });
    }, { on: old });
    R.thing(8.9, 8.8, (ctx) => {
      box(ctx, 8.1, 8.1, 0, 0.8, 0.6, 0.9, C.black, { lw: 0.035 });
      face(ctx, [[8.15, 8.7, 0.1], [8.85, 8.7, 0.1], [8.85, 8.7, 0.75], [8.15, 8.7, 0.75]], shade(C.grey, 0.4), { lw: 0.02, dots: C.ink, density: 0.5 });
      rect(ctx, 8.2, 8.2, 0.6, 0.4, 0.91, C.mustard, { stroke: false });
    }, { on: old });
    R.thing(8.4, 6.7, (ctx) => {
      const [X, Y] = P(7.8, 6.2, 0);
      const cols = [C.teal, C.white, C.coral, C.navy, C.mustard, C.grey, C.red];
      for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.ellipse(X + Math.cos(i * 2.1) * 0.35, Y - 0.12 - (i % 3) * 0.1, 0.3, 0.13, i * 0.5, 0, Math.PI * 2); paint(ctx, cols[i % cols.length], { lw: 0.02 }); }
    }, { on: old });
    // Hers: a round rug, a plant she'll forget to water (her hampers are the
    // goose's, below).
    R.rug((ctx) => {
      disc(ctx, 6.0, 5.2, 0.008, 1.3, tint(C.teal, 0.35), { lw: 0.02, dots: C.teal, density: 0.15 });
      disc(ctx, 6.0, 5.2, 0.01, 0.9, tint(C.teal, 0.6), { stroke: false });
    }, { on: neu });
    R.thing(3.3, 8.6, (ctx) => {
      box(ctx, 2.2, 7.9, 0, 1.3, 0.6, 1.2, C.white, { lw: 0.035, top: C.woodLight });
      if (Q.detail) for (const z of [0.3, 0.7]) line3(ctx, [[2.3, 8.505, z], [3.4, 8.505, z]], C.ink, 0.02);
      cylinder(ctx, 3.1, 8.2, 1.2, 0.18, 0.3, C.coral);
      const [X, Y] = P(3.1, 8.2, 1.5);
      ctx.strokeStyle = C.green; ctx.lineWidth = 0.05; ctx.beginPath();
      for (let i = -2; i <= 2; i++) { ctx.moveTo(X, Y); ctx.quadraticCurveTo(X + i * 0.1, Y - 0.4, X + i * 0.25, Y - 0.2); }
      ctx.stroke();
      rect(ctx, 2.35, 7.95, 0.55, 0.45, 1.21, C.white, { lw: 0.015 });
    }, { on: neu });

    // ---------- Before noon: the roommates ----------
    // The one arguing about the deposit, on the phone, guarding the poster.
    R.mover((t) => (hours(7, 12)(t) ? { x: 1.9, y: 7.6 } : { x: -99, y: -99 }), (ctx, t, p) => {
      if (p.x < -50) return;
      const h = hh(t), after = h >= DROP[0];
      person(ctx, p.x, p.y, 0, {
        ...ARGUER, pose: after ? 'stand' : 'point', dir: 'r', arms: after ? [2.9, -2.9] : [1.4 + Math.sin(t * 3) * 0.3, 2.6],
        hold: after ? null : (c) => { c.beginPath(); c.rect(-0.02, -0.34, 0.16, 0.28); paint(c, C.black, { lw: 0.02 }); },
      }, t);
      const lines = after ? ['That was there when we moved in.', 'It\'s a feature.'] : h >= 11.15 ? ['What hole?', 'It\'s original to the house.'] : ['We\'re getting the deposit back.', 'All of it.', 'Plus interest.', 'Mike, get off the futon.'];
      saysRight(ctx, p.x, p.y, 3.3, t, lines, 8, 3.6, 1);
    }, { bias: 0.4 });
    // The goose: before half past twelve in one of the two duffel bags by
    // the door (the same bag twice; its tail out of the zip, a red sock out
    // of the other's), after in one of her two wicker hampers (its beak out
    // under the lid; a scrubs sleeve out of the other's). A tap opens it.
    const gEarly = hours(5, 12.5);
    const BAG = [[2.5, 7.7], [2.5, 6.6]], HAMP = [[7.9, 6.8], [9.05, 7.0]];
    const holdAt = (i) => (t) => (gEarly(t) ? [BAG[i][0] + 0.55, BAG[i][1] + 0.25, 0.6] : [HAMP[i][0], HAMP[i][1], 1.0]);
    const bag = R.poke({ id: 'bag', at: holdAt(0), r: 0.8, sound: 'pop', say: 'HONK.' });
    const bag2 = R.poke({ id: 'laundry', at: holdAt(1), r: 0.8, sound: 'tick', say: ['Laundry.', 'Just laundry.', 'Smells like laundry.'] });
    const gooseAt = (t) => {
      const k = bag.k();
      if (gEarly(t)) return { x: BAG[0][0] + 0.6, y: BAG[0][1] + 0.25, z: 0.28, dir: 'r', pose: k > 0.6 && Math.sin(t * 1.3) > 0.7 ? 'honk' : 'sit', hidden: k < 0.5, ahead: 0.6 };
      return { x: HAMP[0][0], y: HAMP[0][1], z: 0.72, dir: 'l', pose: k > 0.6 && Math.sin(t * 1.1) > 0.7 ? 'honk' : 'sit', hidden: k < 0.5, ahead: 0.3 };
    };
    R.goose(gooseAt, { kind: 'poke', inside: bag, hint: 'Two of everything in this flat. One of them has a tail.' });
    for (const i of [0, 1]) {
      const pk = i ? bag2 : bag, [bx, by] = BAG[i];
      R.thing(bx + 1.1, by + 0.5, (ctx) => duffel(ctx, bx, by, pk.k(), i === 0), { anim: true, on: gEarly, depth: bx + by + 0.7 });
      const [hx, hy] = HAMP[i];
      R.thing(hx + 0.4, hy + 0.4, (ctx) => hamper(ctx, hx, hy, pk.k(), i === 0), { anim: true, on: (t) => !gEarly(t), depth: hx + hy + (i ? 0.4 : -0.2) });
    }

    // The beer pong table, and one last game (he's playing both sides).
    R.thing(7.6, 5.8, (ctx) => {
      for (const [lx, ly] of [[4.75, 4.55], [7.35, 4.55], [4.75, 5.55], [7.35, 5.55]]) box(ctx, lx, ly, 0, 0.1, 0.1, 0.92, C.ink, { flat: true, stroke: false });
      box(ctx, 4.6, 4.4, 0.92, 3.0, 1.35, 0.1, C.green, { lw: 0.035, top: C.green });
      if (Q.detail) {
        rect(ctx, 4.7, 4.5, 2.8, 1.15, 1.021, null, { lw: 0.03, stroke: C.white });
        line3(ctx, [[6.1, 4.5, 1.022], [6.1, 5.65, 1.022]], C.white, 0.03);
      }
    }, { on: old });
    const cups = (ctx, x0, dirX) => {
      const rows = [[0], [-0.2, 0.2], [-0.4, 0, 0.4]];
      rows.forEach((row, i) => row.forEach((v) => cylinder(ctx, x0 + dirX * i * 0.2, 5.075 + v * 0.55, 1.02, 0.09, 0.22, C.red, { top: C.white })));
    };
    R.thing(7.65, 5.85, (ctx) => { cups(ctx, 4.95, 1); cups(ctx, 7.25, -1); }, { on: old });
    // The trophy, at the net: a hunting decoy (a wooden goose, painted
    // brown and black) on a plinth, CHAMPS on a brass plate.
    R.thing(6.5, 5.1, (ctx) => {
      box(ctx, 5.8, 4.55, 1.02, 0.55, 0.4, 0.2, C.brown, { lw: 0.025, top: C.wood });
      face(ctx, [[5.9, 4.951, 1.06], [6.25, 4.951, 1.06], [6.25, 4.951, 1.18], [5.9, 4.951, 1.18]], C.mustard, { lw: 0.012 });
      if (Q.detail) lettering(ctx, 'x', 6.075, 4.955, 1.12, 'CHAMPS', 0.05, C.ink);
      const [X, Y] = P(6.07, 4.75, 1.22);
      // Its body, its wing, its tail.
      ctx.beginPath(); ctx.ellipse(X, Y - 0.2, 0.36, 0.17, -0.08, 0, Math.PI * 2); paint(ctx, C.brown, { lw: 0.025, dots: shade(C.brown, 0.4), density: 0.2 });
      ctx.beginPath(); ctx.ellipse(X - 0.04, Y - 0.24, 0.22, 0.09, -0.15, 0, Math.PI * 2); paint(ctx, shade(C.brown, 0.25), { lw: 0.02 });
      ctx.beginPath(); ctx.moveTo(X - 0.3, Y - 0.24); ctx.lineTo(X - 0.48, Y - 0.34); ctx.lineTo(X - 0.34, Y - 0.12); ctx.closePath(); paint(ctx, C.ink, { lw: 0.02 });
      // The long black neck, the head, the white chinstrap.
      ctx.beginPath(); ctx.moveTo(X + 0.2, Y - 0.28); ctx.quadraticCurveTo(X + 0.3, Y - 0.5, X + 0.26, Y - 0.68);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.12; ctx.lineCap = 'round'; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(X + 0.31, Y - 0.72, 0.11, 0.07, 0.15, 0, Math.PI * 2); paint(ctx, C.ink, { lw: 0.02 });
      ctx.beginPath(); ctx.ellipse(X + 0.27, Y - 0.7, 0.045, 0.035, 0, 0, Math.PI * 2); ctx.fillStyle = C.white; ctx.fill();
      if (Q.detail) { ctx.beginPath(); ctx.moveTo(X + 0.41, Y - 0.74); ctx.lineTo(X + 0.48, Y - 0.71); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.04; ctx.stroke(); }
    }, { on: old, depth: 13.5 });
    R.decoy({ id: 'trophy', at: [6.07, 4.75, 1.6], r: 0.6, say: ['That\'s the trophy.', 'Don\'t touch the trophy.', 'We said don\'t.'], when: old });
    // Whoever's asleep in the corner (Mike on the futon, then the nurse in
    // her bed) answers a tap, without waking up.
    const nap = R.poke({ id: 'sleeper', at: (t) => (hh(t) >= 5 && hh(t) < 12.5 ? [10.7, 3.2, 1.0] : [11.8, 3.75, 0.9]), r: 0.7, teach: true, sound: 'shush', hold: 3, say: ['Mmph.', 'Five more minutes.', 'Zzz. Go away.'] });
    R.thing(11.9, 4.6, (ctx, t) => {
      const k = nap.k();
      if (k < 0.2 || !Q.detail) return;
      const [x, y] = hh(t) >= 5 && hh(t) < 12.5 ? [9.55, 3.2] : [10.2, 3.7];
      label(ctx, x - 0.3, y - 0.3, 1.9 + k * 0.3, '?!', 0.4, alpha(C.ink, k));
    }, { anim: true });
    R.mover((t) => (hours(7, 11.9)(t) ? { x: 8.3, y: 5.2 } : { x: -99, y: -99 }), (ctx, t, p) => {
      if (p.x < -50) return;
      const c = t % 3.4, throwing = c < 0.35;
      person(ctx, p.x, p.y, 0, { ...SHOOTER, pose: 'stand', dir: 'l', arms: throwing ? [2.4, 0.3] : [1.2, 0.2] }, t);
      // The ball: up, over, and in (one in three).
      if (c > 0.3 && c < 1.5) {
        const k = (c - 0.3) / 1.2, i = Math.floor(t / 3.4), hit = i % 3 === 0;
        const tx = hit ? 5.05 : 4.3, ty = 5.1 + ((i * 7) % 5 - 2) * 0.1;
        const x = 8.0 + (tx - 8.0) * k, y = 5.2 + (ty - 5.2) * k, z = 1.9 + (1.2 - 1.9) * k + Math.sin(Math.PI * k) * 1.1;
        const [X, Y] = P(x, y, hit ? z : Math.max(z, 1.05));
        ctx.beginPath(); ctx.arc(X, Y, 0.07, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.02 });
      }
      const i = Math.floor(t / 3.4);
      if (c > 1.5 && c < 3.0 && Q.detail) speech(ctx, p.x, p.y, 2.7, i % 3 === 0 ? 'CUP!' : ['One last game.', 'Warm-up.', 'For the deposit.'][i % 3], { size: 0.38 });
    }, { bias: 0.4 });
    // The futon, and Mike on it, asleep through the whole move (up at
    // 11:37 when the poster goes).
    R.thing(11.4, 3.6, (ctx) => {
      box(ctx, 9.0, 2.4, 0, 2.4, 1.2, 0.35, C.wood, { flat: true, lw: 0.035 });
      box(ctx, 9.05, 2.7, 0.35, 2.3, 0.9, 0.3, C.navy, { lw: 0.035, dens: 0.15 });
      box(ctx, 9.0, 2.4, 0.35, 2.4, 0.3, 1.0, C.navy, { lw: 0.04, dens: 0.15 });
      for (const u of [9.0, 11.3]) box(ctx, u, 2.4, 0.0, 0.1, 1.2, 0.8, C.wood, { flat: true, lw: 0.025 });
    }, { on: old });
    R.thing(11.5, 3.7, (ctx, t) => {
      sleeper(ctx, 9.55, 3.2, 0.66, 1.6, { blanket: C.coral, breath: (Math.sin(t * 1.4) + 1) / 2, mouth: true, hair: SLEEPY.hair, skin: SLEEPY.skin });
      if (Q.detail) { const k = (t * 0.5) % 1; label(ctx, 9.3 - k * 0.5, 3.0 - k * 0.5, 1.5 + k * 1.2, 'Z', 0.35 + k * 0.3, alpha(C.ink, 1 - k)); }
    }, { anim: true, on: (t) => hh(t) >= 5 && hh(t) < DROP[0] + 0.02 });
    R.mover((t) => (hours(DROP[0] + 0.02, 12)(t) ? { x: 10.1, y: 3.35, ahead: 2.6 } : { x: -99, y: -99 }), (ctx, t, p) => {
      if (p.x < -50) return;
      person(ctx, p.x, p.y, 0.0, { ...SLEEPY, pose: 'sit', dir: 'l', arms: [0.4, 2.9] }, t);
      says(ctx, p.x, p.y, 2.4, t, ['Is it noon?', 'What\'d I miss?'], 6, 3.5);
    });
    // The TV on a milk crate, paused, and the controller's cord to the futon.
    R.thing(11.9, 7.1, (ctx) => {
      box(ctx, 10.9, 6.3, 0, 0.85, 0.75, 0.6, C.teal, { flat: true, lw: 0.03, top: shade(C.teal, 0.4) });
      if (Q.detail) for (let u = 10.98; u < 11.7; u += 0.12) line3(ctx, [[u, 7.05, 0.08], [u, 7.05, 0.52]], shade(C.teal, 0.4), 0.03);
      box(ctx, 10.95, 6.35, 0.6, 0.75, 0.6, 0.62, C.black, { flat: true, lw: 0.03 });
      face(ctx, [[11.0, 6.955, 0.67], [11.65, 6.955, 0.67], [11.65, 6.955, 1.16], [11.0, 6.955, 1.16]], C.purple, { lw: 0.02 });
      lettering(ctx, 'x', 11.33, 6.96, 0.92, 'PAUSED', 0.11, C.white);
      line3(ctx, [[11.3, 6.6, 0.3], [11.0, 5.6, 0.02], [10.2, 4.6, 0.02], [10.1, 4.2, 0.05]], C.ink, 0.025);
      box(ctx, 9.9, 4.0, 0.0, 0.4, 0.25, 0.08, C.black, { flat: true, lw: 0.015 });
    }, { on: old });
    // A traffic cone (nobody knows where from) and a lamp made of another.
    R.thing(12.4, 4.9, (ctx) => {
      const [X, Y] = P(12.1, 4.6, 0);
      ctx.beginPath(); ctx.rect(X - 0.32, Y - 0.1, 0.64, 0.16); paint(ctx, C.coral, { lw: 0.025 });
      ctx.beginPath(); ctx.moveTo(X - 0.2, Y - 0.08); ctx.lineTo(X - 0.05, Y - 0.85); ctx.lineTo(X + 0.05, Y - 0.85); ctx.lineTo(X + 0.2, Y - 0.08); ctx.closePath();
      paint(ctx, C.coral, { lw: 0.03 });
      ctx.fillStyle = C.white; ctx.fillRect(X - 0.13, Y - 0.45, 0.26, 0.1);
    }, { on: old });

    // Their friend who doesn't live here, out on the porch on a cooler,
    // eyeing the couch on the rope (it's right there).
    R.thing(14.3, 3.9, (ctx) => {
      box(ctx, 13.5, 3.2, 0, 0.9, 0.6, 0.5, C.white, { flat: true, lw: 0.03, top: C.teal });
      if (Q.detail) box(ctx, 13.5, 3.2, 0.5, 0.9, 0.6, 0.06, C.teal, { flat: true, lw: 0.02 });
    }, { on: old });
    R.mover((t) => (hours(7, 11.9)(t) ? { x: 13.95, y: 3.5, ahead: 0.6 } : { x: -99, y: -99 }), (ctx, t, p) => {
      if (p.x < -50) return;
      const h = hh(t), couch = h >= 9.1;
      person(ctx, p.x, p.y, -0.14, { ...BUDDY, pose: 'sit', dir: 'r', arms: couch && Math.sin(t * 0.8) > 0.3 ? [2.1, 0.3] : [1.0, 0.5] }, t);
      says(ctx, p.x, p.y, 2.2, t, couch ? ['Free couch?', 'It\'s right there.', 'Dibs.'] : ['Nice day for it.', 'I\'m helping.'], 10, 3.2, 3);
    });

    // ---------- After noon: the night nurse ----------
    // Her bed, the stethoscope on the post, clogs, the white-noise machine
    // on a crate.
    R.thing(12.0, 4.5, (ctx) => {
      box(ctx, 9.7, 2.9, 0, 2.3, 1.6, 0.45, C.wood, { flat: true, lw: 0.035 });
      box(ctx, 9.75, 2.95, 0.45, 2.2, 1.5, 0.27, C.white, { flat: true, lw: 0.03 });
      box(ctx, 9.6, 2.9, 0, 0.15, 1.6, 1.45, C.wood, { lw: 0.035 });
      line3(ctx, [[9.68, 4.45, 1.45], [9.72, 4.6, 0.95], [9.7, 4.52, 0.8]], C.ink, 0.04);
      disc(ctx, 9.7, 4.52, 0.78, 0.07, C.greyLight, { lw: 0.02 });
    }, { on: neu });
    R.thing(12.1, 4.55, (ctx, t) => {
      sleeper(ctx, 10.2, 3.7, 0.72, 1.6, { blanket: C.lilac, breath: (Math.sin(t * 0.9) + 1) / 2, mask: C.pink, hair: NURSE.hair, skin: NURSE.skin });
    }, { anim: true, on: asleep });
    R.thing(12.1, 4.55, (ctx) => {
      // Empty: the blanket thrown back, the mask on the pillow.
      box(ctx, 9.85, 3.3, 0.72, 0.7, 0.8, 0.18, C.white, { flat: true, lw: 0.03 });
      box(ctx, 11.0, 2.95, 0.72, 1.0, 1.5, 0.12, C.lilac, { flat: true, lw: 0.03 });
      const [X, Y] = P(10.2, 3.7, 0.95);
      ctx.beginPath(); ctx.roundRect(X - 0.24, Y - 0.06, 0.48, 0.17, 0.06); paint(ctx, C.pink, { lw: 0.025 });
      if (Q.detail) for (const dx of [-0.11, 0.11]) { ctx.beginPath(); ctx.ellipse(X + dx, Y + 0.025, 0.07, 0.05, 0, 0, Math.PI * 2); ctx.fillStyle = C.white; ctx.fill(); ctx.beginPath(); ctx.arc(X + dx + 0.015, Y + 0.03, 0.025, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill(); }
    }, { on: (t) => up(t) || gone(t) });
    R.thing(9.7, 4.9, (ctx) => {
      for (const u of [9.0, 9.35]) box(ctx, u, 4.6, 0, 0.28, 0.45, 0.25, C.white, { flat: true, lw: 0.02 });
    }, { on: (t) => neu(t) && !gone(t) });
    R.thing(9.65, 3.6, (ctx) => {
      box(ctx, 9.05, 2.95, 0, 0.55, 0.6, 0.6, C.teal, { flat: true, lw: 0.03, top: shade(C.teal, 0.4) });
      cylinder(ctx, 9.32, 3.25, 0.6, 0.2, 0.16, C.white, { top: C.greyLight });
    }, { on: neu });
    R.thing(9.7, 3.65, (ctx, t) => {
      if (!Q.detail) return;
      const [X, Y] = P(9.32, 3.25, 0.95);
      ctx.strokeStyle = alpha(C.navy, 0.8); ctx.lineWidth = 0.03;
      for (let i = 0; i < 3; i++) {
        const k = ((t * 0.6) + i / 3) % 1;
        ctx.globalAlpha = 1 - k;
        ctx.beginPath(); ctx.arc(X, Y, 0.15 + k * 0.6, -2.4, -0.7); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.green; ctx.fillRect(X - 0.03, Y + 0.12, 0.06, 0.04);
      if ((t % 11) < 2.5) speech(ctx, 9.32, 3.25, 2.0, 'shhhhhhhhh', { size: 0.3 });
    }, { anim: true, on: neu });
    // A nightlight in the kitchen for when she gets up.
    R.light({ at: [0.1, 7.1, 0.5], r: 1.2, color: C.butter, k: (t) => (neu(t) && hh(t) > 19.5 ? 0.8 : 0) });
    // The sign on the banister.
    R.thing(8.9, 2.1, (ctx) => {
      face(ctx, [[8.0, 2.08, 0.35], [9.3, 2.08, 0.35], [9.3, 2.08, 0.92], [8.0, 2.08, 0.92]], C.white, { lw: 0.025 });
      lettering(ctx, 'x', 8.65, 2.09, 0.78, 'DAY SLEEPER', 0.1, C.navy);
      lettering(ctx, 'x', 8.65, 2.09, 0.62, 'KNOCK SOFTLY', 0.08, C.ink);
      lettering(ctx, 'x', 8.65, 2.09, 0.48, 'OR NOT AT ALL', 0.08, C.red);
    }, { on: neu });
    // Her sister, unpacking on tiptoe, shushing everyone who comes up.
    const sisAt = route([[5.2, 5.4, 4], [3.0, 5.6, 3], [6.6, 6.5, 3], [3.4, 4.6, 2], [7.4, 4.8, 3]], { speed: 0.55 });
    R.mover((t) => (hours(13.2, 20.3)(t) ? sisAt(t) : { x: -99, y: -99 }), (ctx, t, p) => {
      if (p.x < -50) return;
      person(ctx, p.x, p.y, p.moving ? 0.08 + Math.abs(Math.sin(t * 3)) * 0.05 : 0, { ...SISTER, pose: p.moving ? 'walk' : 'point', dir: p.dir, back: p.back, phase: p.phase, speed: 3, arms: p.moving ? [0.9, 0.9] : [2.6, 0.3] }, t);
      if (!p.moving) says(ctx, p.x, p.y, 2.6, t, ['Shh!', 'Shhhh.', 'She\'s on nights.', 'SHH.'], 5, 2.4, 1);
    }, { bias: 0.3 });
    // Her niece on the porch with a juice box, reporting the couch.
    R.mover((t) => (hours(13.3, 19.5)(t) ? { x: 14.0, y: 3.3, ahead: 0.5 } : { x: -99, y: -99 }), (ctx, t, p) => {
      if (p.x < -50) return;
      person(ctx, p.x, p.y, 0, {
        ...NIECE, pose: 'stand', dir: 'r', arms: [Math.sin(t * 0.7) > 0.4 ? 1.9 : 0.4, 1.1],
        hold: (c) => { c.beginPath(); c.rect(-0.12, -0.2, 0.2, 0.28); paint(c, C.mustard, { lw: 0.02 }); },
      }, t);
      says(ctx, p.x, p.y, 1.8, t, ['Mom. A couch.', 'It\'s flying.', 'Can I have it?'], 9, 3, 4);
    });
    // The nurse, up at eight-twenty: scrubs on, coffee, keys, out the door.
    R.mover((t) => (up(t) ? { x: 7.9, y: 3.4 } : { x: -99, y: -99 }), (ctx, t, p) => {
      if (p.x < -50) return;
      person(ctx, p.x, p.y, 0, {
        ...NURSE, pose: 'stand', dir: 'r', arms: [2.3, 0.3],
        hold: (c) => { c.beginPath(); c.moveTo(-0.1, -0.3); c.lineTo(-0.08, 0); c.lineTo(0.08, 0); c.lineTo(0.1, -0.3); c.closePath(); paint(c, C.white, { lw: 0.02 }); },
      }, t);
      says(ctx, p.x, p.y, 2.6, t, ['Good morning.', 'What couch?'], 6, 3);
    });

    // ---------- The finds ----------
    R.find({ id: 'ball', label: 'A ping-pong ball', kind: 'hard', at: [0.82, 2.55, 0.15], r: 0.75, ...BEFORE, riddle: 'Where ping-pong balls go to die.', hint: 'Something in the kitchen clanks all winter. Look under it.' });
    R.find({ id: 'hole', label: 'A hole they hope nobody sees', kind: 'poke', inside: posterP, at: [0.05, HY, HZ], r: 0.8, ...BEFORE, hint: 'That poster is doing a lot of work. Lift it.' });
    R.find({ id: 'mask', label: 'A sleep mask', kind: 'spot', at: [10.2, 3.7, 1.1], r: 0.88, ...AFTER });
    R.find({ id: 'cup', label: 'Something the roommates left behind', kind: 'spot', at: [LAST[0], LAST[1], 3.12], r: 0.6, ...AFTER, riddle: 'Up high with dozens at breakfast. Flip back.', hint: 'Look up. One of their party cups never made it into a box.' });
  },
};
