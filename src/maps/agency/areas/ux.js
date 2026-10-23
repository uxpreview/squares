// UX: the usability lab at the back (an observation room and a test room
// either side of a one-way mirror, with Inspector Pidge as participant 4), an
// affinity wall of sticky notes, a card sort spread over the floor, a persona
// poster (BRENDA, 42, BUSY) and the real Brenda, and the journey map that
// runs along the floor and out into Dev.
//
// Running gags: Pidge has been looking for the Buy button since nine (a
// tally on the observers' whiteboard counts the hours); behind the mirror one
// researcher eats a sandwich, then another, then the candy, and the other
// takes notes until lunch and falls asleep. And the sticky notes spread all
// day: the wall fills by mid-afternoon, then the floor, the observation
// room's glass, its desk and the sleeping researcher.
import { C, Q, box, rect, face, paint, person, folk, alpha, tint, shade, mix, hash, P, paintText, cylinder, goose as drawGoose, rigid, glow } from '../../../engine/art.js';
import { ZK } from '../../../engine/iso.js';
import { route, clamp } from '../../../engine/actors.js';
import { TONE, INK, CHAIR } from '../style.js';
import { floorOf, backWall, sill, pod, staff, room, chair, desk, lettering, papers, plant, mug, SILL, onFace, words, dash, drawChairY } from '../kit.js';
import { bearOClock, rushK, seated, watched, nightK, H, BEAR_TIMES, LOOP } from '../clock.js';

const TAU = Math.PI * 2;
const NOTE = INK.sticky;
const NOTE_PALE = tint(INK.sticky, 0.4);
const SILVER = mix(C.greyLight, C.sky, 0.4);
const COAT = mix(C.wood, C.greyLight, 0.45); // Pidge's trench coat
const HAT = shade(C.brown, 0.15);
const LAB_H = 2.4; // the lab's glass walls

// ---------- Going to the glass at bear o'clock ----------
// The loop second the current bear o'clock started at (for whoever was
// somewhere else on their route when the shout went up).
function shoutAt(t) {
  const s = ((t % LOOP) + LOOP) % LOOP;
  for (const [a, b] of BEAR_TIMES) if (s >= a && s <= b + 12) return t - (s - a);
  return t;
}
// A hand at the end of an arm swung `a` (person(): straight arms, 0.72
// long, from the shoulder), for things held in it.
const SHOULDER = -1.53, HEAD = -1.95;
const hand = (a) => [0.22 + Math.sin(a) * 0.72, SHOULDER + Math.cos(a) * 0.72];

// ---------- Sticky notes ----------
// Every note on the floor's clock: where it is and the hour it goes up. Lists
// sorted by hour, so what's up at t is always the first n.
const BOARD = { x0: 73, x1: 83, y: 8.4, z0: 0.3, z1: 2.45 };
const DECOY = { x: 77.3, z: 1.2, s: 0.66 }; // the goose note (its corner)
const PIECES = [[73, 76.5], [76.5, 80], [80, 83]];
const byHour = (a, b) => a.h - b.h;
const WALL = PIECES.map(() => []);
for (let c = 0; c < 26; c++) for (let r = 0; r < 4; r++) {
  const x = 73.12 + c * 0.38 + (hash(c, r) - 0.5) * 0.07;
  const z = 0.42 + r * 0.4 + (hash(r, c + 9) - 0.5) * 0.06;
  if (x + 0.3 > DECOY.x - 0.04 && x < DECOY.x + DECOY.s + 0.04 && z + 0.3 > DECOY.z - 0.04 && z < DECOY.z + DECOY.s + 0.04) continue;
  // A few from yesterday at the left; the rest spread right through the day.
  const h = c < 4 && hash(c, r + 3) < 0.75 ? 0 : 8.6 + (c / 26) * 5.6 + hash(c * 3, r) * 1.4;
  const i = PIECES.findIndex(([a, b]) => x + 0.15 >= a && x + 0.15 < b);
  WALL[i].push({ x, z, h, pale: hash(c, r * 7) < 0.22, tilt: (hash(r * 5, c) - 0.5) * 0.08 });
}
WALL.forEach((l) => l.sort(byHour));
// Then down onto the floor in front of the wall, the observation room's
// glass, its desk, and the researcher asleep at it.
const FLOOR_NOTES = Array.from({ length: 24 }, (_, i) => ({
  x: 73.2 + hash(i, 41) * 9.6, y: 8.55 + hash(i, 42) * 0.75, h: 13 + hash(i, 43) * 4.5, a: hash(i, 44) * TAU, pale: hash(i, 45) < 0.25,
})).sort(byHour);
const GLASS_NOTES = Array.from({ length: 16 }, (_, i) => ({
  x: 72.6 + hash(i, 51) * 2.3, z: 0.3 + hash(i, 52) * 1.75, h: 12.2 + hash(i, 53) * 4, tilt: (hash(i, 54) - 0.5) * 0.1, pale: hash(i, 55) < 0.3,
})).sort(byHour);
const DESK_NOTES = Array.from({ length: 10 }, (_, i) => ({
  x: 77.3 + hash(i, 61) * 0.95, y: 4.95 + hash(i, 62) * 0.7, h: 15 + hash(i, 63) * 3, a: hash(i, 64) * TAU,
})).sort(byHour);
// (On the sleeper, in her own drawing's units.)
const BODY_NOTES = [[0.05, -1.25], [-0.12, -1.0], [0.1, -0.95], [-0.05, -2.05], [0.18, -1.95], [0.42, -1.3], [-0.2, -1.5], [0.15, -1.6], [0.3, -0.7]]
  .map(([u, v], i) => ({ u, v, h: 15.4 + i * 0.42, a: (hash(i, 71) - 0.5) * 0.8 }));
const upTo = (list, h) => { let n = 0; while (n < list.length && list[n].h <= h) n++; return n; };

// Notes on a face toward +y, all in one fill (a wall of them is a lot of
// shapes), with a scribble each when close.
function wallNotes(ctx, list, n, y, s = 0.3) {
  for (const pale of [false, true]) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const o = list[i];
      if (!!o.pale !== pale) continue;
      const pts = [P(o.x, y, o.z + o.tilt), P(o.x + s, y, o.z - o.tilt), P(o.x + s, y, o.z + s - o.tilt), P(o.x, y, o.z + s + o.tilt)];
      ctx.moveTo(...pts[0]); ctx.lineTo(...pts[1]); ctx.lineTo(...pts[2]); ctx.lineTo(...pts[3]); ctx.closePath();
    }
    paint(ctx, pale ? NOTE_PALE : NOTE, { lw: 0.018 });
  }
  if (!Q.detail) return;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const o = list[i];
    for (let l = 0; l < 2; l++) {
      const zz = o.z + s * (0.62 - l * 0.24);
      ctx.moveTo(...P(o.x + 0.06, y, zz)); ctx.lineTo(...P(o.x + s * (0.5 + hash(i, l) * 0.35), y, zz - o.tilt * 0.5));
    }
  }
  ctx.strokeStyle = alpha(C.ink, 0.55); ctx.lineWidth = 0.02; ctx.stroke();
}
// Notes lying flat (on the floor, on a desk).
function flatNotes(ctx, list, n, z, s = 0.28) {
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const o = list[i];
    const c = Math.cos(o.a) * s / 2, d = Math.sin(o.a) * s / 2;
    ctx.moveTo(...P(o.x - c + d, o.y - d - c, z)); ctx.lineTo(...P(o.x + c + d, o.y + d - c, z));
    ctx.lineTo(...P(o.x + c - d, o.y + d + c, z)); ctx.lineTo(...P(o.x - c - d, o.y - d + c, z)); ctx.closePath();
  }
  paint(ctx, NOTE, { lw: 0.018 });
}

// ---------- People ----------
// Inspector Pidge: the shared universe's pigeon detective, in his trench
// coat and hat. extra(ctx, hy) draws what he's holding up.
function pidgeLook(extra) {
  return folk(19, {
    skin: C.grey, style: 'bald', top: COAT, bottom: shade(COAT, 0.3),
    wear(ctx, b) {
      ctx.beginPath();
      ctx.moveTo(-0.3, b.hipY - 0.12); ctx.lineTo(0.3, b.hipY - 0.12); ctx.lineTo(0.38, b.hipY + 0.4); ctx.lineTo(-0.38, b.hipY + 0.4); ctx.closePath();
      paint(ctx, COAT, { lw: 0.04 });
      ctx.fillStyle = shade(COAT, 0.45); ctx.fillRect(-0.29, b.hipY - 0.16, 0.58, 0.08);
      if (!b.back) {
        ctx.beginPath(); ctx.moveTo(-0.06, b.top + 0.05); ctx.lineTo(0.02, b.top + 0.36); ctx.lineTo(0.1, b.top + 0.05);
        paint(ctx, shade(COAT, 0.2), { lw: 0.03 });
      }
      // A pigeon's shimmering neck.
      ctx.beginPath(); ctx.ellipse(0.02, b.top + 0.02, 0.27, 0.09, 0, 0, TAU);
      paint(ctx, C.tealLight, { lw: 0.03, dots: C.purple, density: 0.35 });
    },
    face(ctx, hy, back, t) {
      if (!back) {
        ctx.beginPath(); ctx.arc(0.22, hy, 0.055, 0, TAU); ctx.fillStyle = C.coral; ctx.fill();
        ctx.beginPath(); ctx.arc(0.225, hy, 0.028, 0, TAU); ctx.fillStyle = C.ink; ctx.fill();
        ctx.beginPath(); ctx.moveTo(0.3, hy); ctx.lineTo(0.54, hy + 0.08); ctx.lineTo(0.3, hy + 0.13); ctx.closePath();
        paint(ctx, shade(C.grey, 0.55), { lw: 0.03 });
      }
      // The hat: a brim and a pinched crown, with a band.
      ctx.beginPath(); ctx.ellipse(0.02, hy - 0.2, 0.46, 0.1, 0, 0, TAU); paint(ctx, HAT, { lw: 0.035 });
      ctx.beginPath(); ctx.moveTo(-0.24, hy - 0.2); ctx.lineTo(-0.2, hy - 0.52); ctx.quadraticCurveTo(0.02, hy - 0.44, 0.24, hy - 0.52); ctx.lineTo(0.28, hy - 0.2); ctx.closePath();
      paint(ctx, HAT, { lw: 0.035 });
      ctx.fillStyle = C.ink; ctx.fillRect(-0.23, hy - 0.3, 0.5, 0.07);
      if (extra) extra(ctx, hy, t);
    },
  });
}
// Things in Pidge's hands: the magnifying glass, and his question for the
// people behind the mirror (on a card, held up; he faces left, so the words
// are turned back round).
function magnifier(ctx) {
  const [hx, hy] = hand(1.9);
  ctx.strokeStyle = C.brown; ctx.lineWidth = 0.06; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + 0.12, hy - 0.18); ctx.stroke();
  ctx.beginPath(); ctx.arc(hx + 0.2, hy - 0.32, 0.16, 0, TAU); paint(ctx, alpha(tint(C.sky, 0.4), 0.8), { lw: 0.04 });
}
function buyCard(ctx) {
  ctx.save();
  ctx.scale(-1, 1);
  ctx.beginPath(); ctx.rect(-0.72, -2.95, 1.44, 0.48); paint(ctx, C.white, { lw: 0.04 });
  words(ctx, 'BUY BUTTON?', 0, -2.71, 0.22, C.ink, 'Bagel Fat One', 400);
  ctx.restore();
}

// A sandwich held up (in the drawing's own units), `left` of it still there.
function sandwich(ctx, x, y, left) {
  if (left <= 0.02) return;
  const w = 0.36 * left;
  ctx.beginPath(); ctx.moveTo(x - w / 2, y + 0.1); ctx.lineTo(x + w / 2, y + 0.1); ctx.lineTo(x + w / 2, y - 0.16); ctx.closePath();
  paint(ctx, C.woodLight, { lw: 0.025 });
  ctx.strokeStyle = C.leaf; ctx.lineWidth = 0.035;
  ctx.beginPath(); ctx.moveTo(x - w / 2 + 0.03, y + 0.04); ctx.lineTo(x + w / 2, y + 0.04); ctx.stroke();
}
function notepad(ctx, x, y) {
  ctx.beginPath(); ctx.rect(x - 0.14, y - 0.2, 0.28, 0.32); paint(ctx, C.white, { lw: 0.025 });
  ctx.fillStyle = C.teal; ctx.fillRect(x - 0.14, y - 0.2, 0.28, 0.06);
  ctx.strokeStyle = alpha(C.ink, 0.5); ctx.lineWidth = 0.018; ctx.beginPath();
  for (let i = 0; i < 3; i++) { ctx.moveTo(x - 0.09, y - 0.07 + i * 0.07); ctx.lineTo(x + 0.08, y - 0.07 + i * 0.07); }
  ctx.stroke();
}
function phone(ctx, x, y) {
  ctx.beginPath(); ctx.roundRect(x - 0.07, y - 0.12, 0.14, 0.24, 0.03); paint(ctx, C.ink, { lw: 0.02 });
  ctx.fillStyle = C.tealLight; ctx.fillRect(x - 0.05, y - 0.09, 0.1, 0.17);
}

export default {
  id: 'ux',
  name: 'UX',
  blurb: 'Participant 4 has been hunting for the Buy button since nine. Meanwhile, the sticky notes are spreading.',
  describe: 'A user research team\'s stretch of an office floor: two lab rooms split by a one-way mirror, a wall of sticky notes that spreads all day, index cards sorted into piles on the floor, a poster of a made-up customer next to a real one, a paper journey map, and desks by the windows.',

  build(R) {
    floorOf(R, 72, 88, { floor: TONE.ux });
    backWall(R, 72, 88);
    sill(R, 72, 88);
    const here = (t) => H(t);

    // ---------- The observation room ----------
    // Two researchers behind the mirror, at a desk along it, with their
    // sandwiches, the candy jar, the feed from the test room and a tally of
    // the hours participant 4 has been at it.
    room(R, 72.4, 0.4, 79.8, 6.8, null, { door: 76, table: false, floor: TONE.ux });
    desk(R, 77.2, 1.0, 1.25, 4.8);
    const R1 = { x: 76.2, y: 2.3 }, R2 = { x: 76.2, y: 4.5 };
    chair(R, { ...R1, side: 'l' });
    chair(R, { ...R2, side: 'l' });
    // (What's on the desk sorts after the desk, which is long.)
    const ON_DESK = { depth: 77.2 + 1.25 / 2 + 5.8 + 0.05 };

    // The tally board: P4, time on task, a stroke an hour since nine.
    R.thing(74.5, 0.72, (ctx) => {
      for (const lx of [73.2, 75.8]) box(ctx, lx, 0.6, 0, 0.06, 0.06, 0.95, C.grey, { flat: true, lw: 0.02 });
      box(ctx, 73.0, 0.6, 0.95, 3.0, 0.1, 1.45, C.white, { flat: true, lw: 0.03 });
      onFace(ctx, 'x', 74.5, 0.71, 2.1, (g) => {
        words(g, 'P4: TIME ON TASK', 0, 0, 0.22, C.ink);
        words(g, 'TASK: BUY ANYTHING', 0, 0.28, 0.15, C.teal);
      });
    });
    R.thing(74.5, 0.74, (ctx, t) => {
      const n = clamp(Math.floor(here(t) - 9), 0, 18);
      if (!n) return;
      onFace(ctx, 'x', 73.3, 0.71, 1.5, (g) => {
        g.strokeStyle = C.coral; g.lineWidth = 0.05; g.lineCap = 'round';
        g.beginPath();
        let u = 0;
        for (let i = 0; i < n; i++) {
          if (i % 5 === 4) { g.moveTo(u - 0.52, 0.04); g.lineTo(u - 0.02, -0.34); u += 0.16; continue; }
          g.moveTo(u, 0.08); g.lineTo(u, -0.36); u += 0.13;
        }
        g.stroke();
      });
    }, { anim: true });

    // The feed from the test room, on a cart: a shop page, a cursor going
    // round and round, and nowhere to buy anything.
    R.thing(73.4, 6.0, (ctx) => {
      box(ctx, 72.95, 4.8, 0.85, 0.8, 1.2, 0.06, C.grey, { flat: true, lw: 0.03 });
      for (const [lx, ly] of [[73.0, 4.85], [73.65, 4.85], [73.0, 5.9], [73.65, 5.9]]) box(ctx, lx, ly, 0, 0.06, 0.06, 0.85, C.ink, { flat: true, stroke: false });
      box(ctx, 72.95, 4.8, 0.2, 0.8, 1.2, 0.05, C.grey, { flat: true, lw: 0.025 });
      box(ctx, 73.3, 5.32, 0.91, 0.1, 0.16, 0.25, C.ink, { flat: true, stroke: false });
      box(ctx, 73.35, 4.7, 1.12, 0.1, 1.4, 0.82, C.black, { flat: true, lw: 0.03 });
      onFace(ctx, 'y', 73.46, 5.4, 1.53, (g) => {
        g.fillStyle = C.white; g.fillRect(-0.64, -0.36, 1.28, 0.72);
        g.fillStyle = C.teal; g.fillRect(-0.64, -0.36, 1.28, 0.12);
        const tiles = [C.coral, C.mustard, C.sky, C.leaf, C.pink, C.lilac];
        tiles.forEach((c, i) => { g.fillStyle = c; g.fillRect(-0.56 + (i % 3) * 0.4, -0.18 + Math.floor(i / 3) * 0.26, 0.3, 0.16); });
        g.fillStyle = C.grey;
        for (let i = 0; i < 6; i++) g.fillRect(-0.56 + (i % 3) * 0.4, -0.01 + Math.floor(i / 3) * 0.26, 0.2, 0.04);
      });
    });
    R.thing(73.42, 6.02, (ctx, t) => {
      if (here(t) < 8.9) return;
      onFace(ctx, 'y', 73.47, 5.4, 1.53, (g) => {
        const u = Math.sin(t * 0.9) * 0.45, v = Math.sin(t * 1.4) * 0.22;
        g.beginPath(); g.moveTo(u, v); g.lineTo(u + 0.0, v + 0.14); g.lineTo(u + 0.04, v + 0.1); g.lineTo(u + 0.1, v + 0.1); g.closePath();
        paint(g, C.white, { lw: 0.015 });
        if (Math.floor(t * 1.5) % 2) { g.beginPath(); g.arc(-0.56, -0.3, 0.035, 0, TAU); g.fillStyle = C.red; g.fill(); }
      });
    }, { anim: true });
    R.light({ at: [73.6, 5.4, 1.5], r: 1.4, color: tint(C.sky, 0.3), k: (t) => (here(t) >= 8.9 ? nightK(t) * 0.7 : 0) });

    // On the desk: the second sandwich waiting on its plate, then the
    // wrappers; the candy jar going down after lunch; the notes; the notes
    // that aren't hers.
    R.thing(77.85, 4.9, (ctx) => {
      papers(ctx, 77.85, 4.45, 1.1, 2);
      mug(ctx, 78.1, 1.35, 1.1, C.teal);
    }, ON_DESK);
    R.thing(77.85, 2.2, (ctx, t) => {
      const h = here(t);
      const [X, Y] = P(77.8, 1.95, 1.11);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.3, 0.15, 0, 0, TAU); paint(ctx, C.white, { lw: 0.025 });
      if (h < 11.2) sandwich(ctx, X, Y - 0.06, 1);
      const wrappers = (h > 10.6 ? 1 : 0) + (h > 12.8 ? 1 : 0);
      for (let i = 0; i < wrappers; i++) {
        const [wx, wy] = P(77.55 + i * 0.5, 2.55 + i * 0.1, 1.17);
        ctx.beginPath(); ctx.arc(wx, wy, 0.09, 0, TAU); paint(ctx, C.greyLight, { lw: 0.02 });
      }
    }, { anim: true, ...ON_DESK });
    R.thing(77.8, 3.6, (ctx, t) => {
      const left = 1 - clamp((here(t) - 12.8) / 4.2);
      const n = Math.round(16 * left);
      const [X, Y] = P(77.8, 3.4, 1.1);
      for (let i = 0; i < n; i++) {
        const cx = X + (hash(i, 81) - 0.5) * 0.3, cy = Y - 0.05 - (i / 16) * 0.38 - hash(i, 82) * 0.04;
        ctx.beginPath(); ctx.arc(cx, cy, 0.05, 0, TAU);
        ctx.fillStyle = [C.coral, C.mustard, C.pink, C.teal, C.purple][i % 5]; ctx.fill();
      }
      ctx.save(); ctx.globalAlpha *= 0.35;
      cylinder(ctx, 77.8, 3.4, 1.1, 0.17, 0.46, tint(C.sky, 0.5), { flat: true });
      ctx.restore();
      cylinder(ctx, 77.8, 3.4, 1.56, 0.18, 0.06, C.coral, { flat: true });
      if (Q.detail) onFace(ctx, 'x', 77.8, 3.58, 1.3, (g) => words(g, 'CANDY', 0, 0, 0.08, C.ink));
    }, { anim: true, ...ON_DESK });
    R.thing(77.85, 5.86, (ctx, t) => {
      const n = upTo(DESK_NOTES, here(t));
      if (n) rigid(ctx, 'ux-desk-' + n, 77.85, 5.3, 1.11, (g) => flatNotes(g, DESK_NOTES, n, 1.115));
    }, { anim: true, ...ON_DESK });

    // The researcher who eats: a sandwich from nine, another from eleven,
    // then the candy. At bear o'clock he runs to the windows, sandwich and all.
    const eater = folk(570, { top: C.teal, bottom: C.ink, style: 'short', dress: false });
    const glassR1 = [[75.3, 3.4], [75.6, 6.2], [76.0, 7.6], [80.8, 12.4], [80.8, 18.6], [79.0, 19.8], [79.0, SILL]];
    R.mover((t) => {
      if (!seated(t, 0.3)) return { x: R1.x, y: R1.y, gone: true };
      const r = dash(t, [[R1.x, R1.y], ...glassR1], undefined, 0.6);
      return r || { x: R1.x, y: R1.y, sit: true };
    }, (ctx, t, p) => {
      if (p.gone) return;
      const h = here(t);
      const left = h < 9 ? 0 : h < 10.6 ? 1 - (h - 9) / 1.6 : h < 11.2 ? 0 : h < 12.8 ? 1 - (h - 11.2) / 1.6 : 0;
      const eating = left > 0;
      const bite = eating && (t % 5) < 1.1;
      const candy = !eating && h > 12.8 && (t % 7) < 1.2;
      const a = p.sit ? (bite ? 2.35 : eating ? 1.3 : candy ? 1.55 : 0.6) : p.moving ? null : (eating ? 1.3 : 1.5);
      const look = {
        ...eater,
        pose: p.sit ? 'sit' : p.moving ? 'run' : 'stand',
        dir: p.sit ? 'r' : p.dir, back: p.sit ? false : p.back,
        ...(a != null ? { arms: [a, p.sit ? 0.5 : -0.15] } : {}),
        face(g) {
          if (!eating) return;
          const [hx, hy] = a != null ? hand(a) : [0.6, -1.3];
          sandwich(g, hx - (bite ? 0.18 : 0), hy - 0.04, left);
        },
      };
      person(ctx, p.x, p.y, p.sit ? 0.2 : 0, look, t);
    }, { bias: 0.1 });

    // The researcher who takes notes, and doesn't look up for anything, not
    // even a bear; after lunch she falls asleep, and the notes find her.
    const noter = folk(571, { top: C.mustard, bottom: C.navy, style: 'bun', dress: false });
    R.thing(R2.x, R2.y + 0.05, (ctx, t) => {
      const h = here(t);
      if (!(seated(t, 0.5) || h >= 13)) return;
      const asleep = h >= 13;
      const [X, Y] = P(R2.x, R2.y, 0.2);
      ctx.save();
      if (asleep) { ctx.translate(X, Y - 0.8); ctx.rotate(0.42); ctx.translate(-X, -(Y - 0.8)); }
      const aw = 1.2 + Math.sin(t * 7) * 0.07;
      person(ctx, R2.x, R2.y, 0.2, {
        ...noter, pose: 'sit', dir: 'r', arms: asleep ? [1.4, 1.2] : [aw, 0.5],
        face(g, hy) {
          if (asleep) {
            g.fillStyle = noter.skin;
            g.beginPath(); g.arc(0.1, hy + 0.02, 0.05, 0, TAU); g.arc(0.24, hy + 0.02, 0.05, 0, TAU); g.fill();
            g.strokeStyle = C.ink; g.lineWidth = 0.025; g.beginPath();
            g.moveTo(0.06, hy + 0.03); g.lineTo(0.14, hy + 0.03); g.moveTo(0.2, hy + 0.03); g.lineTo(0.28, hy + 0.03); g.stroke();
          } else {
            const [hx, hy2] = hand(aw);
            notepad(g, hx - 0.05, hy2 - 0.1);
          }
        },
      }, t);
      if (asleep) {
        const n = upTo(BODY_NOTES, h);
        for (let i = 0; i < n; i++) {
          const o = BODY_NOTES[i];
          ctx.save(); ctx.translate(X + o.u, Y + o.v); ctx.rotate(o.a);
          ctx.beginPath(); ctx.rect(-0.1, -0.1, 0.2, 0.2); paint(ctx, NOTE, { lw: 0.018 });
          ctx.restore();
        }
      }
      ctx.restore();
      if (asleep && Q.detail) {
        const k = (t * 0.5) % 1;
        const [zx, zy] = P(R2.x + 0.6, R2.y - 0.2, 2.2 + k * 1.1);
        ctx.save(); ctx.globalAlpha *= 1 - k;
        ctx.font = `${(0.36 + k * 0.25) * 40}px "Bagel Fat One", sans-serif`;
        ctx.translate(zx, zy); ctx.scale(1 / 40, 1 / 40); ctx.fillStyle = C.ink; ctx.textAlign = 'center';
        ctx.fillText('z', 0, 0);
        ctx.restore();
      }
    }, { anim: true });

    // Notes on the observation room's glass, from lunchtime.
    R.thing(73.8, 6.9, (ctx, t) => {
      const n = upTo(GLASS_NOTES, here(t));
      if (n) rigid(ctx, 'ux-glass-' + n, 73.8, 6.82, 1.2, (g) => wallNotes(g, GLASS_NOTES, n, 6.82, 0.28));
    }, { anim: true });
    // Over the door: quiet, please.
    R.thing(78.3, 6.86, (ctx) => {
      onFace(ctx, 'x', 78.3, 6.82, 1.85, (g) => {
        g.beginPath(); g.roundRect(-0.62, -0.17, 1.24, 0.34, 0.06); paint(g, C.red, { lw: 0.025 });
        words(g, 'TESTING. SHH.', 0, 0.01, 0.17, C.white);
      });
    });

    // ---------- The one-way mirror and the test room ----------
    // Shut, the test room's glass is mirror all round and over the top, and
    // participant 4 is a shape behind it; tap it and you can see in.
    const mirror = R.poke({ id: 'mirror', at: [84, 4.2, 2.0], r: 1.0, say: 'One-way mirror. P4 is waving at it.' });
    R.rug((ctx) => rect(ctx, 80.4, 0.4, 7.2, 6.4, 0, tint(TONE.ux, 0.25), { stroke: false }));
    // The mirror itself (the observers' side is the window, ours the mirror).
    R.thing(80.2, 3.6, (ctx) => {
      box(ctx, 80.05, 0.4, 0, 0.3, 6.4, LAB_H, SILVER, { flat: true, lw: 0.03, right: tint(SILVER, 0.2) });
      if (Q.detail) {
        ctx.save(); ctx.globalAlpha *= 0.6;
        for (const y of [1.2, 3.4, 5.0]) face(ctx, [[80.36, y, 0.3], [80.36, y + 0.35, 0.3], [80.36, y + 1.1, 2.1], [80.36, y + 0.75, 2.1]], C.white, { stroke: false });
        ctx.restore();
      }
    });
    // Its glass: clear when open, mirror when shut.
    const lab = (x, y, w, d, side) => R.thing(x + w / 2, y + d / 2, (ctx, t) => {
      const s = 1 - mirror.k();
      ctx.save();
      ctx.globalAlpha *= 0.35 + 0.6 * s;
      box(ctx, x, y, 0, w, d, LAB_H, mix(tint(C.sky, 0.45), SILVER, s), { flat: true, lw: 0.03 });
      ctx.restore();
      if (s > 0.3 && Q.detail) {
        ctx.save(); ctx.globalAlpha *= 0.55 * s;
        const fy = y + d, fx = x + w;
        for (let i = 0; i < 2; i++) {
          const u = 0.25 + i * 0.8;
          if (side === 'front' && u + 0.6 < w) face(ctx, [[x + u, fy, 0.2], [x + u + 0.22, fy, 0.2], [x + u + 0.62, fy, 2.2], [x + u + 0.4, fy, 2.2]], C.white, { stroke: false });
          if (side === 'right' && u + 0.6 < d) face(ctx, [[fx, y + u + 0.6, 0.2], [fx, y + u + 0.82, 0.2], [fx, y + u + 0.42, 2.2], [fx, y + u + 0.2, 2.2]], C.white, { stroke: false });
        }
        ctx.restore();
      }
      box(ctx, x, y, 0, Math.min(w, 0.08), Math.min(d, 0.08), LAB_H, C.white, { flat: true, lw: 0.025 });
      box(ctx, x, y, LAB_H - 0.06, w, d, 0.06, C.white, { flat: true, lw: 0.02 });
    }, { anim: true });
    for (const [x0, x1] of [[80.4, 82.4], [82.4, 83.2], [84.8, 86.4], [86.4, 87.6]]) lab(x0, 6.7, x1 - x0, 0.1, 'front');
    for (const [y0, y1] of [[0.4, 2.4], [2.4, 4.4], [4.4, 6.4], [6.4, 6.8]]) lab(87.5, y0, 0.1, y1 - y0, 'right');
    R.thing(84, 0.45, (ctx) => {
      ctx.save(); ctx.globalAlpha *= 0.35; box(ctx, 80.4, 0.4, 0, 7.2, 0.1, LAB_H, tint(C.sky, 0.45), { flat: true, lw: 0.03 }); ctx.restore();
      box(ctx, 80.4, 0.4, LAB_H - 0.06, 7.2, 0.1, 0.06, C.white, { flat: true, lw: 0.02 });
    });
    // The sign that makes everyone tap the glass.
    R.thing(86.95, 6.86, (ctx) => {
      onFace(ctx, 'x', 86.95, 6.82, 1.5, (g) => {
        g.beginPath(); g.rect(-0.55, -0.22, 1.1, 0.44); paint(g, C.white, { lw: 0.025 });
        words(g, 'PLEASE DON\'T', 0, -0.08, 0.13, C.ink);
        words(g, 'TAP THE GLASS', 0, 0.09, 0.13, C.red);
      });
    });
    // IN SESSION over the doorway, its red light on while P4 is in there.
    R.thing(84.0, 6.9, (ctx, t) => {
      const on = here(t) >= 8.9;
      const y = 6.82;
      box(ctx, 83.35, 6.72, 1.98, 1.3, 0.1, 0.4, C.black, { flat: true, lw: 0.025 });
      onFace(ctx, 'x', 84.0, y + 0.005, 2.18, (g) => words(g, 'IN SESSION', 0, 0.02, 0.17, on ? C.red : shade(C.red, 0.5), 'Bagel Fat One', 400));
      // The light, on top.
      box(ctx, 83.92, 6.74, 2.38, 0.16, 0.06, 0.04, C.ink, { flat: true, stroke: false });
      const [X, Y] = P(84.0, 6.77, 2.5);
      ctx.beginPath(); ctx.arc(X, Y, 0.15, Math.PI, 0); ctx.closePath(); paint(ctx, on ? C.red : shade(C.red, 0.5), { lw: 0.025 });
      if (on) glow(ctx, 84.0, 6.77, 2.48, 0.7, C.red, 0.55 + Math.sin(t * 2.4) * 0.25);
    }, { anim: true, depth: 95 });
    // Now and then, while it's shut, P4 presses his magnifying glass to the
    // glass from inside: his shadow, a big eye in the lens, a glint.
    const peek = (t) => { const s = ((t % 10) + 10) % 10; return s > 6.5 ? clamp(Math.min((s - 6.5) / 0.3, (10 - s) / 0.3)) : 0; };
    R.thing(85.55, 6.86, (ctx, t) => {
      const k = peek(t) * (1 - mirror.k()) * (here(t) >= 8.9 ? 1 : 0);
      if (k < 0.02) return;
      onFace(ctx, 'x', 85.55, 6.825, 1.4, (g) => {
        g.save();
        g.globalAlpha *= 0.3 * k;
        // His shadow: hat and head, pressed close.
        g.beginPath(); g.ellipse(-0.05, 0.1, 0.3, 0.32, 0, 0, TAU); g.fillStyle = C.ink; g.fill();
        g.beginPath(); g.ellipse(-0.05, -0.2, 0.45, 0.08, 0, 0, TAU); g.fill();
        g.beginPath(); g.rect(-0.28, -0.5, 0.46, 0.32); g.fill();
        g.restore();
        g.save();
        g.globalAlpha *= k;
        // The lens, the eye in it, the handle.
        g.lineCap = 'round';
        g.strokeStyle = C.ink; g.lineWidth = 0.1; g.beginPath(); g.moveTo(0.14, 0.18); g.lineTo(0.36, 0.48); g.stroke();
        g.strokeStyle = C.brown; g.lineWidth = 0.06; g.stroke();
        g.beginPath(); g.arc(0, 0, 0.24, 0, TAU); paint(g, tint(C.sky, 0.55), { lw: 0.05 });
        g.beginPath(); g.arc(-0.02, 0.01, 0.12, 0, TAU); paint(g, C.coral, { lw: 0.02 });
        g.beginPath(); g.arc(-0.01, 0.01, 0.06, 0, TAU); g.fillStyle = C.ink; g.fill();
        // The glint: a four-point star at the rim.
        const tw = 0.7 + Math.sin(t * 9) * 0.3, gx = 0.15, gy = -0.16;
        g.beginPath();
        g.moveTo(gx, gy - 0.16 * tw); g.lineTo(gx + 0.03, gy - 0.03); g.lineTo(gx + 0.16 * tw, gy); g.lineTo(gx + 0.03, gy + 0.03);
        g.lineTo(gx, gy + 0.16 * tw); g.lineTo(gx - 0.03, gy + 0.03); g.lineTo(gx - 0.16 * tw, gy); g.lineTo(gx - 0.03, gy - 0.03); g.closePath();
        g.fillStyle = C.white; g.fill();
        g.restore();
      });
    }, { anim: true });
    // The mirror over the top, while it's shut.
    R.thing(87.6, 6.82, (ctx) => {
      const s = 1 - mirror.k();
      if (s < 0.02) return;
      ctx.save();
      ctx.globalAlpha *= 0.95 * s;
      face(ctx, [[80.35, 0.4, LAB_H], [87.6, 0.4, LAB_H], [87.6, 6.8, LAB_H], [80.35, 6.8, LAB_H]], SILVER, { lw: 0.03, dots: shade(SILVER, 0.2), density: 0.12 });
      if (Q.detail) {
        ctx.globalAlpha *= 0.6;
        for (const u of [1.4, 2.4, 4.6, 5.3]) face(ctx, [[80.35 + u, 0.5, LAB_H], [80.75 + u, 0.5, LAB_H], [80.75 + u - 1.6, 6.7, LAB_H], [80.35 + u - 1.6, 6.7, LAB_H]].map(([x, y, z]) => [Math.max(80.4, x), y, z]), C.white, { stroke: false });
      }
      ctx.restore();
    }, { anim: true });

    // Inside: the task board, the desk with the laptop, the camera on its
    // tripod, a plant that gave up, and Pidge.
    R.thing(83.2, 0.75, (ctx) => {
      for (const lx of [81.9, 84.3]) box(ctx, lx, 0.62, 0, 0.06, 0.06, 1.0, C.grey, { flat: true, lw: 0.02 });
      box(ctx, 81.7, 0.62, 1.0, 2.9, 0.1, 1.2, C.white, { flat: true, lw: 0.03 });
      onFace(ctx, 'x', 83.15, 0.73, 1.6, (g) => {
        words(g, 'TASK 1 OF 1', 0, -0.24, 0.17, C.teal);
        words(g, 'BUY ANYTHING', 0, 0.05, 0.28, C.ink, 'Bagel Fat One', 400);
        words(g, 'TAKE YOUR TIME!', 0, 0.32, 0.13, C.coral);
      });
    });
    R.thing(84, 2.72, (ctx) => drawChairY(ctx, 84, 3.05, 0, CHAIR, -1, 'back'));
    R.thing(84, 3.0, (ctx) => drawChairY(ctx, 84, 3.05, 0, CHAIR, -1, 'seat'));
    desk(R, 82.6, 3.9, 3.0, 1.2);
    R.thing(84.3, 5.15, (ctx) => {
      // The laptop, its back to us (a Primal sticker), and the tissues.
      box(ctx, 83.65, 4.35, 1.1, 0.7, 0.45, 0.04, C.grey, { flat: true, lw: 0.02 });
      box(ctx, 83.65, 4.3, 1.14, 0.7, 0.05, 0.46, C.grey, { flat: true, lw: 0.025 });
      const [sx, sy] = P(84.0, 4.36, 1.37);
      ctx.beginPath(); ctx.arc(sx, sy, 0.09, 0, TAU); paint(ctx, INK.maple, { lw: 0.02 });
      box(ctx, 84.9, 4.3, 1.1, 0.4, 0.25, 0.2, C.sky, { flat: true, lw: 0.02 });
      const [tx, ty] = P(85.1, 4.42, 1.33);
      ctx.beginPath(); ctx.ellipse(tx, ty, 0.1, 0.07, 0, 0, TAU); paint(ctx, C.white, { lw: 0.02 });
      mug(ctx, 83.15, 4.5, 1.1, C.white);
      // His name card.
      face(ctx, [[83.4, 4.95, 1.1], [84.0, 4.95, 1.1], [84.0, 4.85, 1.3], [83.4, 4.85, 1.3]], C.white, { lw: 0.02 });
      if (Q.detail) onFace(ctx, 'x', 83.7, 4.9, 1.2, (g) => words(g, 'P4', 0, 0, 0.13, C.ink));
    });
    R.thing(86.9, 1.5, (ctx) => {
      // The camera that's recorded every minute of it.
      const [X, Y] = P(86.9, 1.4, 0);
      const [TX, TY] = P(86.9, 1.4, 1.6);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.beginPath();
      for (const dx of [-0.3, 0, 0.3]) { ctx.moveTo(TX, TY); ctx.lineTo(X + dx, Y + (dx ? 0.05 : 0.18)); }
      ctx.stroke();
      box(ctx, 86.7, 1.25, 1.6, 0.4, 0.3, 0.3, C.black, { flat: true, lw: 0.025 });
      box(ctx, 86.55, 1.4, 1.65, 0.15, 0.2, 0.2, C.ink, { flat: true, lw: 0.02 });
    });
    R.thing(86.92, 1.6, (ctx, t) => {
      if (Math.floor(t * 1.2) % 2) return;
      const [X, Y] = P(87.1, 1.55, 1.83);
      ctx.beginPath(); ctx.arc(X, Y, 0.045, 0, TAU); ctx.fillStyle = C.red; ctx.fill();
    }, { anim: true });
    R.thing(86.9, 6.1, (ctx) => plant(ctx, 86.9, 6.0, 0, 0.9, mix(C.green, C.mustard, 0.5)));

    // Pidge, since nine: typing, then the magnifying glass on the screen,
    // then his question held up for the mirror; round and round.
    const look = { type: pidgeLook(null), glass: pidgeLook((g) => magnifier(g)), card: pidgeLook((g) => buyCard(g)) };
    R.thing(84, 3.05, (ctx, t) => {
      if (here(t) < 8.9) return;
      const c = t % 26;
      const k = c < 13 ? 'type' : c < 19 ? 'glass' : 'card';
      const arms = k === 'type' ? [1.15 + Math.sin(t * 9) * 0.07, 1.05] : k === 'glass' ? [1.9, 0.9] : [2.95, -2.95];
      person(ctx, 84, 3.05, 0.2, { ...look[k], pose: 'sit', dir: 'l', arms }, t);
    }, { anim: true });
    R.find({ id: 'pidge', label: 'Inspector Pidge', kind: 'poke', inside: mirror, at: [84, 3.05, 1.7], r: 0.8, hint: 'Participant 4 is a detective. Look through the mirror.' });
    R.light({ at: [84, 4.1, 1.5], r: 1.5, color: tint(C.sky, 0.3), k: (t) => (here(t) >= 8.9 ? nightK(t) * 0.8 : 0) });

    // ---------- The affinity wall ----------
    // A long board of sticky notes, spreading by the hour, and the goose
    // somebody drew on one (a persona, apparently).
    PIECES.forEach(([x0, x1], i) => {
      R.thing((x0 + x1) / 2, BOARD.y, (ctx) => {
        for (const lx of [x0 + 0.25, x1 - 0.3]) {
          box(ctx, lx, BOARD.y - 0.35, 0, 0.06, 0.6, 0.05, C.grey, { flat: true, lw: 0.02 });
          box(ctx, lx, BOARD.y - 0.15, 0, 0.06, 0.06, BOARD.z0, C.grey, { flat: true, lw: 0.02 });
        }
        box(ctx, x0, BOARD.y - 0.15, BOARD.z0, x1 - x0, 0.15, BOARD.z1 - BOARD.z0, C.white, { flat: true, lw: 0.03 });
        const head = ['WHAT USERS SAY', 'WHAT USERS DO', 'WHY?!'][i];
        lettering(ctx, 'x', (x0 + x1) / 2, BOARD.y + 0.01, 2.22, head, 0.2, i === 2 ? C.coral : C.teal);
        if (i === 1) {
          // The goose note: a persona card with a goose on it.
          const { x, z, s } = DECOY;
          face(ctx, [[x, BOARD.y + 0.01, z], [x + s, BOARD.y + 0.01, z + 0.03], [x + s, BOARD.y + 0.01, z + s + 0.03], [x, BOARD.y + 0.01, z + s]], NOTE, { lw: 0.025 });
          onFace(ctx, 'x', x + s / 2, BOARD.y + 0.02, z + 0.2, (g) => {
            g.save(); g.translate(0.02, -0.02);
            drawGoose(g, 0, 0, 0, 0, { scale: 0.36, pose: 'stand', dir: 'r' });
            g.restore();
            words(g, 'NAME: GOOSE', 0, 0.08, 0.075, C.ink);
          });
        }
      });
      R.thing((x0 + x1) / 2, BOARD.y + 0.05, (ctx, t) => {
        const n = upTo(WALL[i], here(t));
        if (n) rigid(ctx, `ux-wall-${i}-${n}`, (x0 + x1) / 2, BOARD.y, 1.2, (g) => wallNotes(g, WALL[i], n, BOARD.y + 0.02));
      }, { anim: true });
    });
    R.rug((ctx, t) => flatNotes(ctx, FLOOR_NOTES, upTo(FLOOR_NOTES, here(t)), 0.01), { anim: true, step: (t) => upTo(FLOOR_NOTES, here(t)) });
    R.poke({ id: 'stickies', at: [75.2, 8.45, 1.3], r: 0.9, say: ['Insight: users want things.', 'Insight: users want things faster.', 'Pain point: Mondays.', 'Quote: "Where is the Buy button?"'] });
    R.decoy({ id: 'sticky-goose', at: [DECOY.x + DECOY.s / 2, BOARD.y + 0.05, DECOY.z + DECOY.s / 2], r: 0.6, say: 'Persona: Goose. Goals: bread.' });

    // The researcher who writes them, a note at a time, till seven at night.
    const sticker = folk(574, { top: C.purple, bottom: C.ink, style: 'curly', dress: false });
    const walk = route([[73.9, 9.35, 2.6], [75.9, 9.35, 2.2], [79.6, 9.35, 2.6], [82.2, 9.35, 2.4]], { speed: 0.9, loop: false });
    const glassSticky = (x) => [[x, 10.4], [81.2, 12.6], [81.2, 19.0], [80.0, 19.8], [80.0, SILL]];
    R.mover((t) => {
      const h = here(t);
      if (h < 8.7 || h > 19.6) return { x: 73.9, y: 9.35, gone: true };
      const p0 = walk(shoutAt(t));
      const r = dash(t, [[p0.x, p0.y], ...glassSticky(p0.x)], undefined, 1.0);
      if (r) return r;
      return { ...walk(t), at: true };
    }, (ctx, t, p) => {
      if (p.gone) return;
      const sticking = p.at && !p.moving;
      const up = sticking && (t % 2.2) < 0.7;
      person(ctx, p.x, p.y, 0, {
        ...sticker,
        pose: p.moving ? (p.at ? 'walk' : 'run') : 'stand',
        dir: sticking ? 'r' : p.dir, back: sticking ? true : p.back,
        ...(sticking ? { arms: [up ? 2.5 : 1.3, -0.2] } : {}),
        face(g) {
          if (!sticking) return;
          const [hx, hy] = hand(up ? 2.5 : 1.3);
          g.beginPath(); g.rect(hx - 0.1, hy - 0.1, 0.2, 0.2); paint(g, NOTE, { lw: 0.02 });
        },
      }, t);
    }, { bias: 0.1 });

    // ---------- The participants' waiting corner ----------
    // Participant 5 was due at ten.
    R.thing(85.3, 9.7, (ctx) => {
      drawChairY(ctx, 85.3, 9.8, 0, CHAIR, -1);
      drawChairY(ctx, 86.4, 9.8, 0, CHAIR, -1);
      // A jacket on one of them: participant 5 gave up at lunch.
      box(ctx, 86.1, 9.48, 0.62, 0.6, 0.12, 0.55, C.coral, { flat: true, lw: 0.025 });
    });
    R.thing(84.6, 9.5, (ctx) => {
      box(ctx, 84.57, 9.17, 0, 0.06, 0.06, 1.4, C.grey, { flat: true, lw: 0.02 });
      box(ctx, 84.2, 9.18, 1.4, 0.8, 0.05, 0.6, C.white, { flat: true, lw: 0.025 });
      onFace(ctx, 'x', 84.6, 9.24, 1.7, (g) => {
        words(g, 'PARTICIPANTS', 0, -0.13, 0.11, C.teal);
        words(g, 'PLEASE WAIT', 0, 0.02, 0.13, C.ink);
        words(g, 'NEXT: P5', 0, 0.18, 0.1, C.coral);
      });
    });
    // The thank-you table: a stack of $25 gift cards, one fewer per
    // participant. Still a tall stack.
    R.thing(87.3, 9.1, (ctx) => {
      box(ctx, 87.0, 8.8, 0, 0.6, 0.6, 0.75, C.white, { flat: true, lw: 0.03 });
      for (let i = 0; i < 5; i++) box(ctx, 87.05 + (i % 2) * 0.04, 8.9 - (i % 2) * 0.03, 0.75 + i * 0.05, 0.4, 0.28, 0.05, i % 2 ? C.butter : C.white, { flat: true, lw: 0.012 });
      face(ctx, [[87.1, 9.32, 0.75], [87.5, 9.32, 0.75], [87.5, 9.28, 1.0], [87.1, 9.28, 1.0]], C.teal, { lw: 0.015 });
      if (Q.detail) onFace(ctx, 'x', 87.3, 9.3, 0.875, (g) => words(g, '$25 THANKS!', 0, 0, 0.065, C.white));
    });
    R.thing(87.4, 11.4, (ctx) => plant(ctx, 87.4, 11.3, 0, 1.6));

    // ---------- The card sort ----------
    // Three piles on the floor: MUST HAVE (four cards), NICE TO HAVE, and
    // MISC, which is most of them, and a goose.
    const MISC = [77.7, 16.7];
    R.rug((ctx) => {
      face(ctx, [[73.1, 14.35, 0.01], [80.7, 14.35, 0.01], [80.7, 18.3, 0.01], [73.1, 18.3, 0.01]], null, { stroke: NOTE, lw: 0.07 });
      const heads = [[74.0, 'MUST HAVE', C.teal], [75.9, 'NICE TO HAVE', C.purple], [78.6, 'MISC', C.coral]];
      for (const [x, text, ink] of heads) {
        rect(ctx, x - 0.85, 14.6, 1.7, 0.55, 0.01, C.white, { lw: 0.025 });
        paintText(ctx, 'floor', x, 14.88, text, 0.22, ink);
      }
      const card = (x, y, a, z = 0.012) => onFace(ctx, 'floor', x, y, z, (g) => {
        g.rotate(a);
        g.beginPath(); g.rect(-0.22, -0.15, 0.44, 0.3); paint(g, C.white, { lw: 0.022 });
        if (Q.detail) { g.strokeStyle = alpha(C.ink, 0.45); g.lineWidth = 0.025; g.beginPath(); g.moveTo(-0.14, -0.03); g.lineTo(0.12, -0.03); g.moveTo(-0.14, 0.05); g.lineTo(0.04, 0.05); g.stroke(); }
      });
      for (let i = 0; i < 4; i++) card(74.0, 15.6 + i * 0.4, 0.04 * (i % 2 ? 1 : -1));
      for (let i = 0; i < 8; i++) card(75.6 + (i % 2) * 0.55, 15.6 + Math.floor(i / 2) * 0.42, (hash(i, 91) - 0.5) * 0.2);
      for (let i = 0; i < 44; i++) {
        const a = hash(i, 93) * TAU, r = Math.sqrt(hash(i, 94));
        card(MISC[0] + Math.cos(a) * r * 1.55, MISC[1] + Math.sin(a) * r * 1.2, hash(i, 95) * TAU, 0.012 + i * 0.0008);
      }
    });
    // The goose, filed under Misc: sitting low in the heap, a card on its
    // back, more in front of it.
    const G = [77.4, 16.8];
    R.goose((t) => ({ x: G[0], y: G[1], z: 0, pose: 'sit', dir: Math.floor(t / 7) % 3 === 1 ? 'r' : 'l' }),
      { kind: 'hard', hint: 'Someone sorted a goose into the pile marked Misc.' });
    R.thing(G[0] + 0.03, G[1] + 0.03, (ctx) => {
      onFace(ctx, 'floor', G[0] - 0.02, G[1], 0.36, (g) => { g.rotate(0.5); g.beginPath(); g.rect(-0.2, -0.14, 0.4, 0.28); paint(g, C.white, { lw: 0.022 }); });
    });
    R.thing(G[0] + 0.45, G[1] + 0.35, (ctx) => {
      for (let i = 0; i < 4; i++) {
        onFace(ctx, 'floor', G[0] + 0.15 + i * 0.05, G[1] + 0.3 - i * 0.04, 0.03 + i * 0.045, (g) => { g.rotate(0.3 + i * 0.5); g.beginPath(); g.rect(-0.22, -0.15, 0.44, 0.3); paint(g, C.white, { lw: 0.022 }); });
      }
    });
    // Someone's coffee, at the edge of it.
    R.thing(80.3, 14.75, (ctx) => mug(ctx, 80.3, 14.7, 0, C.coral));

    // ---------- Brenda, and Brenda ----------
    // The persona poster on its easel, and the real Brenda, who walked into
    // the persona workshop in 2023 and never left. She's very busy.
    R.thing(81.9, 15.85, (ctx) => {
      const [X0, Y0] = P(82.4, 15.6, 0), [X1, Y1] = P(81.95, 15.0, 1.9);
      ctx.strokeStyle = C.brown; ctx.lineWidth = 0.07; ctx.beginPath();
      ctx.moveTo(X1, Y1); ctx.lineTo(X0, Y0);
      for (const y of [14.25, 15.75]) { const [a, b] = P(82.05, y, 0); const [c, d] = P(82.0, y, 1.0); ctx.moveTo(a, b); ctx.lineTo(c, d); }
      ctx.stroke();
      box(ctx, 81.88, 14.05, 0.7, 0.14, 1.9, 0.08, C.brown, { flat: true, lw: 0.02 });
      box(ctx, 81.85, 14.1, 0.78, 0.08, 1.8, 1.9, C.white, { flat: true, lw: 0.03 });
      onFace(ctx, 'y', 81.94, 15.0, 1.73, (g) => {
        g.fillStyle = C.coral; g.fillRect(-0.9, -0.95, 1.8, 0.28);
        words(g, 'PERSONA', 0, -0.81, 0.18, C.white, 'Bagel Fat One', 400);
        // The stock photo: a woman delighted by a laptop.
        g.fillStyle = C.sky; g.fillRect(-0.82, -0.6, 0.78, 0.74);
        g.beginPath(); g.ellipse(-0.43, 0.08, 0.27, 0.2, 0, Math.PI, 0); paint(g, C.navy, { lw: 0.02 });
        g.beginPath(); g.arc(-0.43, -0.25, 0.15, 0, TAU); paint(g, C.blush, { lw: 0.02 });
        g.beginPath(); g.arc(-0.43, -0.29, 0.16, Math.PI, 0); g.fillStyle = C.mustard; g.fill();
        g.strokeStyle = C.ink; g.lineWidth = 0.022; g.beginPath(); g.arc(-0.43, -0.23, 0.07, 0.3, Math.PI - 0.3); g.stroke();
        g.beginPath(); g.arc(-0.17, -0.05, 0.05, 0, TAU); paint(g, C.blush, { lw: 0.02 });
        g.fillStyle = C.ink; g.fillRect(-0.18, -0.15, 0.025, 0.08);
        words(g, 'BRENDA', 0.44, -0.48, 0.24, C.ink, 'Bagel Fat One', 400);
        words(g, '42', 0.44, -0.24, 0.2, C.teal);
        words(g, 'BUSY', 0.44, -0.02, 0.2, C.coral);
        words(g, 'GOALS: GET IT DONE', 0, 0.36, 0.13, C.ink);
        words(g, '"I don\'t have time', 0, 0.56, 0.12, C.purple, 'Rethink Sans', 500);
        words(g, 'for this."', 0, 0.72, 0.12, C.purple, 'Rethink Sans', 500);
      });
    });
    R.find({ id: 'brenda', label: 'A persona named Brenda', at: [81.95, 15.0, 1.75], r: 0.8 });
    const brenda = folk(573, {
      top: C.coral, bottom: C.ink, style: 'long', dress: false,
      wear(ctx, b) {
        if (b.back) return;
        ctx.strokeStyle = C.teal; ctx.lineWidth = 0.03; ctx.beginPath();
        ctx.moveTo(-0.12, b.top + 0.03); ctx.lineTo(0.03, b.top + 0.42); ctx.lineTo(0.18, b.top + 0.03); ctx.stroke();
        ctx.beginPath(); ctx.rect(-0.06, b.top + 0.4, 0.18, 0.13); paint(ctx, C.white, { lw: 0.02 });
      },
    });
    const BR = [83.1, 15.1];
    const glassBrenda = [[82.4, 18.2], [81.0, 19.8], [81.0, SILL]];
    R.mover((t) => {
      if (!seated(t, 0.2)) return { x: BR[0], y: BR[1], gone: true };
      return dash(t, [BR, ...glassBrenda], undefined, 0.3) || { x: BR[0], y: BR[1], home: true };
    }, (ctx, t, p) => {
      if (p.gone) return;
      const c = t % 19;
      const poster = p.home && c > 12 && c < 15.5; // a look at herself
      const a = p.moving ? null : 1.25;
      person(ctx, p.x, p.y, 0, {
        ...brenda,
        pose: p.moving ? 'run' : 'stand',
        dir: p.home ? 'l' : p.dir, back: poster || (!p.home && p.back),
        ...(a != null ? { arms: [a, -0.1] } : {}),
        face(g) { if (a != null && !poster) { const [hx, hy] = hand(a); phone(g, hx - 0.05, hy - 0.08); } },
      }, t);
    }, { bias: 0.1 });

    // ---------- The journey map ----------
    // A paper strip along the floor, happy to begin with, and out the far
    // end toward Dev, less so.
    R.rug((ctx) => {
      rect(ctx, 73.0, 18.7, 15.0, 0.8, 0.008, C.white, { lw: 0.025 });
      const stages = [[74.3, 'AWARE', 0.8], [76.8, 'SIGN UP', 0.55], [79.3, 'BROWSE', 0.15], [81.8, 'FIND BUY', -0.45], [84.3, '???', -0.75], [86.8, 'GIVE UP', -0.95]];
      ctx.strokeStyle = alpha(C.ink, 0.25); ctx.lineWidth = 0.02; ctx.beginPath();
      for (let i = 1; i < stages.length; i++) { const x = (stages[i - 1][0] + stages[i][0]) / 2; ctx.moveTo(...P(x, 18.72, 0.01)); ctx.lineTo(...P(x, 19.48, 0.01)); }
      ctx.stroke();
      for (const [x, text] of stages) paintText(ctx, 'floor', x, 18.88, text, 0.17, C.ink);
      const y = (v) => 19.25 - v * 0.14;
      ctx.strokeStyle = C.coral; ctx.lineWidth = 0.04; ctx.beginPath();
      stages.forEach(([x, , v], i) => { const pt = P(x, y(v), 0.012); if (i) ctx.lineTo(...pt); else ctx.moveTo(...pt); });
      ctx.lineTo(...P(88, y(-1), 0.012));
      ctx.stroke();
      for (const [x, , v] of stages) onFace(ctx, 'floor', x, y(v), 0.014, (g) => {
        g.beginPath(); g.arc(0, 0, 0.13, 0, TAU); paint(g, v > 0 ? C.butter : tint(C.sky, 0.2), { lw: 0.02 });
        g.fillStyle = C.ink; g.fillRect(-0.06, -0.05, 0.025, 0.025); g.fillRect(0.035, -0.05, 0.025, 0.025);
        g.strokeStyle = C.ink; g.lineWidth = 0.02; g.beginPath();
        if (v > 0) g.arc(0, 0.0, 0.07, 0.4, Math.PI - 0.4); else g.arc(0, 0.1, 0.06, Math.PI + 0.5, -0.5);
        g.stroke();
        if (v < -0.9) { g.beginPath(); g.arc(0.07, 0.02, 0.025, 0, TAU); g.fillStyle = C.water; g.fill(); }
      });
    });
    R.thing(72.95, 19.5, (ctx) => {
      box(ctx, 72.7, 18.65, 0, 0.32, 0.9, 0.3, C.white, { flat: true, lw: 0.025 });
      const [X, Y] = P(73.02, 19.1, 0.15);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.05, 0.12, 0, 0, TAU); ctx.fillStyle = C.wood; ctx.fill();
    });

    // ---------- Desks by the front windows ----------
    // One of them is the eye-tracking station: the tracker bar under the
    // screen, a heatmap with a gaze dot wandering it, and the glasses.
    const front = [...pod(R, 75.6, 'front', 3), ...pod(R, 84.4, 'front', 3)];
    staff(R, front, 575, { empty: [3, 7], kinds: ['survey', 'calendar', 'email', 'survey', 'social', 'survey', 'photos', 'email', 'email', 'heatmap', 'photos', 'social'] });
    const eye = front[9];
    R.thing(eye.mon[0] + 0.2, eye.mon[1] + 0.45, (ctx) => {
      box(ctx, eye.mon[0] + 0.16, eye.mon[1] - 0.4, 1.1, 0.09, 0.8, 0.07, C.black, { flat: true, lw: 0.02 });
      for (const dy of [-0.25, 0.25]) { const [X, Y] = P(eye.mon[0] + 0.26, eye.mon[1] + dy, 1.14); ctx.beginPath(); ctx.arc(X, Y, 0.025, 0, TAU); ctx.fillStyle = C.red; ctx.fill(); }
    });
    const eyeK = ((575 * 13 + 9 * 7) % 10) / 10; // the seat's own arrival (kit.js, staff)
    R.thing(eye.mon[0] + 0.07, eye.mon[1] + 0.02, (ctx, t) => {
      if (!seated(t, eyeK) || (watched(eye.mon[0], t) && rushK(t) <= 0.5) || !Q.detail) return;
      const [X, Y] = P(eye.mon[0] + 0.07, eye.mon[1] - 0.15 + Math.sin(t * 1.7) * 0.25, eye.mon[2] + 0.6 + Math.sin(t * 2.3) * 0.18);
      ctx.beginPath(); ctx.arc(X, Y, 0.05, 0, TAU); paint(ctx, alpha(C.purple, 0.8), { lw: 0.015 });
    }, { anim: true });
    // The glasses, by the keyboard, cable and all.
    const EG = [eye.mon[0] + 0.38, eye.mon[1] + 0.58, 1.12];
    R.thing(EG[0] + 0.1, EG[1] + 0.2, (ctx) => {
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.beginPath();
      ctx.moveTo(...P(EG[0] + 0.05, EG[1] + 0.15, EG[2])); ctx.quadraticCurveTo(...P(EG[0] - 0.05, EG[1] - 0.3, EG[2]), ...P(eye.mon[0] + 0.2, eye.mon[1] + 0.3, 1.14));
      ctx.stroke();
      onFace(ctx, 'floor', EG[0], EG[1], EG[2], (g) => {
        g.rotate(-0.6);
        for (const u of [-0.18, 0.18]) { g.beginPath(); g.arc(u, 0, 0.15, 0, TAU); paint(g, alpha(tint(C.sky, 0.3), 0.85), { lw: 0.05 }); }
        g.strokeStyle = C.ink; g.lineWidth = 0.05; g.beginPath(); g.moveTo(-0.04, 0); g.lineTo(0.04, 0);
        g.moveTo(-0.33, 0); g.lineTo(-0.36, 0.34); g.moveTo(0.33, 0); g.lineTo(0.36, 0.34); g.stroke();
        g.beginPath(); g.arc(0, -0.04, 0.035, 0, TAU); g.fillStyle = C.red; g.fill();
      });
    });
    R.find({ id: 'eye-tracker', label: 'A pair of eye-tracking glasses', at: [EG[0], EG[1], EG[2] + 0.08], r: 0.8 });

    // At bear o'clock, on the chair someone just left: a note that isn't
    // yellow.
    const ws = front[10];
    R.thing(ws.x + 0.01, ws.y + 0.01, (ctx, t) => {
      if (!bearOClock(t)) return;
      onFace(ctx, 'floor', ws.x - 0.12, ws.y, 0.64, (g) => {
        g.rotate(0.35);
        g.beginPath(); g.rect(-0.2, -0.2, 0.4, 0.4); paint(g, C.pink, { lw: 0.025 });
        g.strokeStyle = alpha(C.ink, 0.6); g.lineWidth = 0.025; g.beginPath(); g.moveTo(-0.1, -0.03); g.lineTo(0.09, -0.03); g.moveTo(-0.1, 0.05); g.lineTo(0.03, 0.05); g.stroke();
      });
    }, { anim: true });
    R.find({ id: 'wrong-sticky', label: 'A rebel sticky note', kind: 'hard', at: [ws.x - 0.12, ws.y, 0.7], r: 0.6, when: bearOClock, note: 'bear o\'clock',
      riddle: 'Not like the others, on a seat left in a hurry.', hint: 'At bear o\'clock, look on the chairs by UX\'s front windows for a note that isn\'t yellow.' });
  },
};
