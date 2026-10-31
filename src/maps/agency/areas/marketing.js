// Marketing: funnels on every whiteboard, the Funnel (a glass meeting room
// with a funnel on its door, a workshop in it all day), the swag closet
// bulging with branded stuff, a wall-sized Gantt chart, and in the spine
// Kayleigh filming the same seven seconds for social all day (she's on the
// level's clock, day.js, between coffee runs).
//
// Running gags: Take 47. The take sign by her ring light counts up by the
// hour, and every take is ruined by something passing: Dana on her walks,
// Kevin hauling swag boxes into the back of the shot, a thump from the swag
// closet, and at bear o'clock she turns the camera to the window. And the
// Gantt chart: an account manager moves the LAUNCH sticky a week to the
// right every hour ("Still on track!") until at four it's off the chart and
// on the Funnel's door.
import { C, Q, box, face, paint, person, folk, goose, label, speech, shade, tint, alpha, hash } from '../../../engine/art.js';
import { ease, clamp } from '../../../engine/actors.js';
import { ZK } from '../../../engine/iso.js';
import { TONE, INK, PRIMAL, FABRIC } from '../style.js';
import { floorOf, backWall, sill, pod, staff, room, lettering, drawChair, mug, plant, bear, onFace, words, along, dash, ALONG_X, DOWN } from '../kit.js';
import { bearOClock, rushK, seated, H, ceo } from '../clock.js';
import { SILL } from '../plan.js';
import { walkers } from '../day.js';

const P3 = (x, y, z) => [x - y, (x + y) / 2 - z * ZK];
const kayleigh = walkers.find((w) => w.id === 'kayleigh').at;

// Kayleigh's mark, and her ring light (the phone in the middle, facing her).
const MARK = [24.5, 15.6];
const RING = [23.3, 15.2, 1.85];
// The lane people run down to the glass at bear o'clock, between the Gantt
// chart and the ring light, so nobody runs through the set.
const LANE = 22.45;

// ---------- Drawing on a flat face ----------
// The boards here draw with v running up (the kit's onFace runs it down).
const UP = [0, 0, 1];
// A marker line through local points.
function line(ctx, pts, ink, w = 0.05, close = false) {
  ctx.beginPath();
  pts.forEach(([u, v], i) => (i ? ctx.lineTo(u, v) : ctx.moveTo(u, v)));
  if (close) ctx.closePath();
  ctx.strokeStyle = ink;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}
// A funnel in marker, centered on the plane's origin: w across the top, h
// tall, with bands across it at `cuts` (0 top to 1 the neck).
function funnel(ctx, w, h, ink, cuts = []) {
  const neck = -h * 0.12, nw = w * 0.09;
  line(ctx, [[-w / 2, h / 2], [-nw, neck], [-nw, -h / 2], [nw, -h / 2], [nw, neck], [w / 2, h / 2]], ink, 0.055);
  line(ctx, [[-w / 2, h / 2], [w / 2, h / 2]], ink, 0.055);
  for (const c of cuts) {
    const v = h / 2 - c * (h / 2 - neck), half = w / 2 - c * (w / 2 - nw);
    line(ctx, [[-half, v], [half, v]], ink, 0.035);
  }
}
// A goose in marker, the size of a thumb, at (u, v), turned by a.
function markerGoose(ctx, u, v, s, a, ink) {
  ctx.save();
  ctx.translate(u, v);
  ctx.rotate(a);
  ctx.scale(s, s);
  ctx.beginPath(); ctx.ellipse(0, 0, 0.42, 0.22, 0.1, 0, Math.PI * 2);
  ctx.fillStyle = C.white; ctx.fill();
  line(ctx, [[-0.4, 0.05], [-0.6, 0.2], [-0.35, -0.08]], ink, 0.06);
  ctx.beginPath(); ctx.ellipse(0, 0, 0.42, 0.22, 0.1, 0, Math.PI * 2);
  ctx.strokeStyle = ink; ctx.lineWidth = 0.06; ctx.stroke();
  line(ctx, [[0.3, 0.1], [0.38, 0.4], [0.32, 0.62]], ink, 0.06);
  line(ctx, [[0.32, 0.62], [0.58, 0.56]], C.coral, 0.09);
  line(ctx, [[-0.05, -0.2], [-0.12, -0.42]], C.coral, 0.05);
  line(ctx, [[0.1, -0.2], [0.14, -0.42]], C.coral, 0.05);
  ctx.restore();
}

// A whiteboard on wheels, its face toward the front (+y), along x0..x1 at y.
// draw(ctx, y) writes on it.
function board(R, x0, x1, y, draw) {
  R.thing((x0 + x1) / 2, y + 0.3, (ctx) => {
    for (const lx of [x0 + 0.2, x1 - 0.2]) {
      box(ctx, lx - 0.04, y - 0.3, 0.06, 0.08, 0.6, 0.05, C.grey, { flat: true, lw: 0.02 });
      for (const ly of [y - 0.28, y + 0.24]) box(ctx, lx - 0.03, ly, 0, 0.06, 0.06, 0.06, C.ink, { flat: true, stroke: false });
      box(ctx, lx - 0.03, y - 0.03, 0.1, 0.06, 0.06, 0.5, C.grey, { flat: true, lw: 0.02 });
    }
    box(ctx, x0, y - 0.04, 0.6, x1 - x0, 0.08, 1.65, C.white, { flat: true, left: C.white, right: C.greyLight, top: C.grey, lw: 0.035 });
    box(ctx, x0 + 0.25, y + 0.04, 0.66, x1 - x0 - 0.5, 0.1, 0.04, C.grey, { flat: true, lw: 0.02 });
    if (Q.detail) {
      // Markers in the tray.
      [C.red, C.teal, C.ink].forEach((col, i) => box(ctx, x0 + 0.4 + i * 0.25, y + 0.06, 0.7, 0.18, 0.05, 0.05, col, { flat: true, stroke: false }));
      draw(ctx, y + 0.045);
    }
  });
}
// Sticky notes on a face toward +y.
function stickies(ctx, y, notes) {
  for (const [x, z, col] of notes) face(ctx, [[x, y, z], [x + 0.22, y, z], [x + 0.22, y, z + 0.2], [x, y, z + 0.2]], col, { lw: 0.015 });
}

// Somewhere along a path of points, 0 at the start, 1 at the end, and which
// way they're facing walking it forward.
function heading(pts, r) {
  const q = along(pts, r);
  return { x: q.x, y: q.y, dir: q.dx - q.dy >= 0 ? 'r' : 'l', back: q.dx + q.dy < -0.01 };
}
// Off to the front glass at bear o'clock along a path (and back): the pose
// of someone at p, or p itself while there's no bear.
function rushing(t, p, path, travel, delay) {
  const d = dash(t, [[p.x, p.y], ...path], travel, delay);
  return d ? { x: d.x, y: d.y, pose: d.moving ? 'run' : 'point', dir: d.dir, back: d.back, rush: true } : p;
}

// ---------- The Gantt chart ----------
const GX0 = 17.0, GX1 = 21.9, GY = 14.8;
const COL0 = 18.15, COLW = 0.45;
const colX = (c) => COL0 + (c + 0.5) * COLW;
// Where the LAUNCH sticky is: a week to the right every hour from eight,
// peeled and stuck in the first minutes of the hour; at four it's off the
// chart (in the account manager's hand, then on the Funnel's door).
function sticky(t) {
  const h = H(t);
  if (h < 9 || h >= 17.4) return { col: h < 9 ? 0 : 8, x: colX(h < 9 ? 0 : 7), lift: 0 };
  const c = Math.floor(h - 8), frac = h - Math.floor(h);
  if (c >= 8) return { col: 8, x: colX(7), lift: 0 };
  const e = ease(clamp(frac / 0.12));
  return { col: c, x: colX(c - 1) + COLW * e, lift: Math.sin(e * Math.PI) * 0.22, moving: frac < 0.12 };
}
// The Funnel's door: hinged at x 21.8, shut along y 11.75, swung out into the
// spine while the meeting runs to the window.
const DOOR = { hx: 21.8, y: 11.75, w: 1.6 };
function doorEnd(a) { return [DOOR.hx - DOOR.w * Math.cos(a), DOOR.y + DOOR.w * Math.sin(a)]; }

// ---------- The swag closet ----------
const CL = { x0: 27.6, y0: 6.6, x1: 31.6, y1: 10, h: 2.6, d0: 28.0, d1: 31.2 };
// It thumps now and then (something in there), for a second every 23.
const thump = (t) => { const s = ((t % 23) + 23) % 23; return s > 14 && s < 15.3 ? Math.sin(s * 38) * (1 - (s - 14) / 1.3) : 0; };
const thumping = (t) => { const s = ((t % 23) + 23) % 23; return s > 14 && s < 15.6; };
// What falls out: totes, plush bears (Primal's mascot), water bottles.
const SPILL = Array.from({ length: 16 }, (_, i) => ({
  x: CL.d0 + 0.25 + hash(i, 7) * (CL.d1 - CL.d0 - 0.5),
  y: CL.y1 + 0.25 + hash(i, 11) * 1.45,
  kind: ['tote', 'bear', 'bottle', 'bear'][i % 4],
  col: [C.teal, PRIMAL, C.mustard, C.white, C.coral][i % 5],
  a: hash(i, 3) * Math.PI,
}));
function swagItem(ctx, it, x, y, z) {
  if (it.kind === 'tote') {
    const ca = Math.cos(it.a) * 0.25, sa = Math.sin(it.a) * 0.25;
    face(ctx, [[x - ca + sa, y - sa - ca, z], [x + ca + sa, y + sa - ca, z], [x + ca - sa, y + sa + ca, z], [x - ca - sa, y - sa + ca, z]], it.col, { lw: 0.02 });
    const [X, Y] = P3(x, y, z);
    ctx.beginPath(); ctx.arc(X, Y, 0.06, 0, Math.PI * 2); ctx.fillStyle = it.col === PRIMAL ? C.white : PRIMAL; ctx.fill();
  } else if (it.kind === 'bottle') {
    box(ctx, x - 0.2, y - 0.06, z, 0.4, 0.12, 0.12, it.col === C.white ? C.teal : it.col, { flat: true, lw: 0.02 });
    box(ctx, x + 0.2, y - 0.04, z + 0.02, 0.07, 0.08, 0.08, C.white, { flat: true, lw: 0.015 });
  } else plush(ctx, x, y, z, 0.8, it.col === C.white || it.col === C.mustard ? C.brown : C.black);
}
// A plush bear, sitting.
function plush(ctx, x, y, z, s = 1, fur = C.brown) {
  const [X, Y] = P3(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(s, s);
  ctx.beginPath(); ctx.ellipse(0, -0.18, 0.2, 0.18, 0, 0, Math.PI * 2); paint(ctx, fur, { lw: 0.025 });
  for (const ex of [-0.12, 0.12]) { ctx.beginPath(); ctx.arc(ex, -0.5, 0.06, 0, Math.PI * 2); paint(ctx, fur, { lw: 0.02 }); }
  ctx.beginPath(); ctx.arc(0, -0.42, 0.14, 0, Math.PI * 2); paint(ctx, fur, { lw: 0.025 });
  ctx.beginPath(); ctx.ellipse(0.03, -0.39, 0.06, 0.045, 0, 0, Math.PI * 2); ctx.fillStyle = C.woodLight; ctx.fill();
  ctx.fillStyle = C.white;
  ctx.fillRect(-0.06, -0.47, 0.03, 0.03); ctx.fillRect(0.05, -0.47, 0.03, 0.03);
  // Primal's tee.
  ctx.beginPath(); ctx.ellipse(0, -0.2, 0.14, 0.1, 0, 0, Math.PI * 2); ctx.fillStyle = PRIMAL; ctx.fill();
  ctx.restore();
}

// ---------- People ----------
const LOOKS = {
  am: folk(540, { top: C.teal, bottom: C.ink, style: 'bun', dress: false }),
  kevin: folk(541, { top: C.mustard, bottom: C.navy, hat: 'beanie', hatColor: PRIMAL, dress: false }),
  presenter: folk(542, { top: C.coral, bottom: C.ink, dress: false }),
  a1: folk(543, { top: C.navy }),
  a2: folk(544, { top: C.green, dress: false }),
};
const clipboard = (ctx) => {
  ctx.beginPath(); ctx.rect(-0.05, -0.2, 0.3, 0.4); paint(ctx, C.wood, { lw: 0.025 });
  ctx.beginPath(); ctx.rect(0, -0.15, 0.2, 0.3); ctx.fillStyle = C.white; ctx.fill();
};
const carton = (ctx) => {
  ctx.beginPath(); ctx.rect(-0.12, -0.42, 0.62, 0.5); paint(ctx, C.wood, { lw: 0.03 });
  ctx.beginPath(); ctx.rect(0.04, -0.3, 0.3, 0.12); ctx.fillStyle = PRIMAL; ctx.fill();
};
const marker = (ctx) => { ctx.beginPath(); ctx.rect(0.28, -0.03, 0.18, 0.06); ctx.fillStyle = C.red; ctx.fill(); };

// The account manager's day at the Gantt chart: beside the sticky, moving it
// on the hour; at four, off to stick it on the Funnel's door, and back.
const AM_DOOR = [[22.3, 15.35], [LANE, 13.4], [21.2, 12.5]];
function amAt(t) {
  const h = H(t);
  if (h < 8.05 || h > 17.3) return { x: 22, y: 15.35, gone: true };
  let p;
  if (h >= 16 && h < 16.45) {
    const r = h < 16.15 ? (h - 16) / 0.15 : h < 16.3 ? 1 : 1 - (h - 16.3) / 0.15;
    const q = heading(AM_DOOR, r);
    const walking = r > 0 && r < 1;
    p = walking ? { ...q, pose: 'walk', dir: h < 16.15 ? q.dir : (q.dir === 'r' ? 'l' : 'r'), back: h < 16.15 ? q.back : !q.back }
      : r >= 1 ? { x: q.x, y: q.y, pose: 'point', dir: 'l', back: true, door: true } : { x: q.x, y: q.y, pose: 'read', dir: 'l' };
  } else if (h >= 16.45) p = { x: 22.3, y: 15.35, pose: 'read', dir: 'l' };
  else {
    const s = sticky(t), frac = h - Math.floor(h);
    p = { x: s.x + 0.55, y: 15.35, pose: s.moving ? 'point' : 'read', dir: 'l', ontrack: h >= 9 && frac >= 0.12 && frac < 0.3 };
  }
  return rushing(t, p, [[LANE, 16.4], [LANE, 18.5], [23.9, SILL - 0.75]], 3.4, 0.3);
}

// Kevin, hauling swag boxes from the swag closet to the backdrop behind
// Kayleigh's set, all day, right through the back of her shot. He doesn't go
// to the window: he can't see over the box.
const KEVIN = [[28.7, 11.4], [28.15, 15.55]];
const KEVIN_WALK = 4.2 / 0.85, KEVIN_WAIT = 2.5, KEVIN_T = 2 * (KEVIN_WALK + KEVIN_WAIT);
function kevinAt(t) {
  if (!seated(t, 0.35)) return { x: 28.7, y: 11.4, gone: true };
  const s = ((t % KEVIN_T) + KEVIN_T) % KEVIN_T;
  if (s < KEVIN_WAIT) return { x: 28.7, y: 11.4, pose: 'stand', dir: 'r', back: true, box: false };
  if (s < KEVIN_WAIT + KEVIN_WALK) { const q = heading(KEVIN, (s - KEVIN_WAIT) / KEVIN_WALK); return { ...q, pose: 'walk', box: true, moving: true }; }
  if (s < 2 * KEVIN_WAIT + KEVIN_WALK) return { x: 28.15, y: 15.55, pose: 'carry', dir: 'l', back: true, box: s < KEVIN_WAIT * 1.5 + KEVIN_WALK };
  const q = heading(KEVIN, 1 - (s - 2 * KEVIN_WAIT - KEVIN_WALK) / KEVIN_WALK);
  return { ...q, pose: 'walk', dir: q.dir === 'r' ? 'l' : 'r', back: !q.back, box: false, moving: true };
}

// The Funnel's meeting: a workshop on the funnel, nine to five, two people
// at the table who run to the window at bear o'clock, and the presenter who
// doesn't stop.
const SEATS = [{ x: 19.7, y: 10.45, k: 0.25, look: LOOKS.a1, d: 0.5 }, { x: 22.3, y: 10.45, k: 0.4, look: LOOKS.a2, d: 0.9 }];
function seatAt(t, s, i) {
  if (!seated(t, s.k)) return { x: s.x, y: s.y, gone: true };
  const p = { x: s.x, y: s.y, pose: 'sit', dir: 'r', back: true, sit: true };
  return rushing(t, p, [[21.0, 11.1], [21.0, 12.9], [LANE, 13.8], [LANE, 18.2], [23.6 + i * 0.65, SILL]], 5.2, s.d);
}

export default {
  id: 'marketing',
  name: 'Marketing',
  blurb: 'Every whiteboard has a funnel on it. Kayleigh is on take 47 of a seven-second video, and LAUNCH is sliding off the chart.',
  describe: 'A marketing team\'s stretch of an open office: desks by the windows front and back, a glass meeting room where someone presents a funnel all day, a red closet bulging with branded swag, a wall-sized project chart, and a woman filming herself at a ring light in the walkway, take after take.',

  build(R) {
    floorOf(R, 16, 32, { floor: TONE.marketing });
    backWall(R, 16, 32);
    sill(R, 16, 32);

    // ---------- Desks off the back wall ----------
    const backSeats = pod(R, 20, 'back', 2);
    // At bear o'clock they go round the Funnel, not through its glass: the
    // left side down past its end, the right side out by the swag closet and
    // down the lane past Kayleigh's set.
    staff(R, backSeats, 520, {
      empty: [1],
      kinds: ['chart', 'chart', 'shop', 'chart'],
      each: (i, s) => (s.side === 'l'
        ? { via: [[16.25, s.y], [16.25, 18.6]], window: [i === 0 ? 16.7 : 17.3, SILL - 0.75] }
        : { via: [[s.x, 5.3], [25.6, 5.3], [25.6, 13.2], [LANE, 14.2], [LANE, 18.4]], window: [22.6, SILL - 0.75] }),
    });
    // A box of lanyards on the empty desk.
    const [lx, ly, lz] = backSeats[1].top;
    R.thing(lx, ly + 0.2, (ctx) => {
      box(ctx, lx - 0.25, ly - 0.2, lz, 0.5, 0.4, 0.25, C.wood, { flat: true, lw: 0.025 });
      if (!Q.detail) return;
      [C.teal, PRIMAL, C.mustard, C.purple].forEach((col, i) => {
        const [X, Y] = P3(lx - 0.15 + i * 0.1, ly - 0.05 + (i % 2) * 0.1, lz + 0.25);
        ctx.beginPath(); ctx.ellipse(X, Y, 0.12, 0.05, i, 0, Math.PI * 2); ctx.strokeStyle = col; ctx.lineWidth = 0.04; ctx.stroke();
      });
      // One dangles over the side.
      const [AX, AY] = P3(lx + 0.25, ly, lz + 0.22);
      ctx.beginPath(); ctx.moveTo(AX, AY); ctx.quadraticCurveTo(AX + 0.1, AY + 0.3, AX + 0.02, AY + 0.45); ctx.strokeStyle = C.teal; ctx.lineWidth = 0.04; ctx.stroke();
      ctx.fillStyle = C.white; ctx.fillRect(AX - 0.06, AY + 0.42, 0.14, 0.16);
    });

    // ---------- The back corner: two more funnels, swag, a bear ----------
    board(R, 23.6, 26.6, 2.3, (ctx, y) => {
      lettering(ctx, 'x', 25.1, y, 2.05, 'THE FUNNEL v7', 0.19, C.ink);
      onFace(ctx, [ALONG_X, UP], 24.9, y, 1.28, (c) => funnel(c, 1.5, 1.0, C.teal, [0.36, 0.72]));
      lettering(ctx, 'x', 24.9, y, 1.63, 'TOFU', 0.12, C.teal);
      lettering(ctx, 'x', 24.9, y, 1.37, 'MOFU', 0.1, C.teal);
      lettering(ctx, 'x', 24.9, y, 1.16, 'BOFU', 0.07, C.teal);
      onFace(ctx, [ALONG_X, UP], 24.9, y, 0, (c) => line(c, [[0.18, 0.86], [0.75, 0.86], [0.65, 0.92], [0.75, 0.86], [0.65, 0.8]], C.red, 0.04));
      lettering(ctx, 'x', 26.05, y, 0.86, '$$$', 0.15, C.red);
      stickies(ctx, y, [[23.75, 1.95, INK.sticky], [26.2, 1.6, C.pink], [26.2, 1.3, INK.sticky]]);
    });
    board(R, 27.4, 30.6, 2.3, (ctx, y) => {
      lettering(ctx, 'x', 29.0, y, 2.05, 'THE FUNNEL v8 FINAL', 0.17, C.ink);
      onFace(ctx, [ALONG_X, UP], 28.6, y, 1.42, (c) => funnel(c, 1.3, 0.85, C.purple, [0.5]));
      // Something falling out of the bottom of the funnel.
      onFace(ctx, [ALONG_X, UP], 28.6, y, 0, (c) => {
        markerGoose(c, 0.05, 0.86, 0.32, 2.4, C.ink);
        line(c, [[-0.25, 0.98], [-0.32, 0.9]], C.ink, 0.025);
        line(c, [[0.3, 0.98], [0.37, 0.9]], C.ink, 0.025);
      });
      lettering(ctx, 'x', 29.9, y, 1.15, '??', 0.3, C.red);
      stickies(ctx, y, [[30.05, 1.85, INK.sticky]]);
      lettering(ctx, 'x', 30.16, y, 1.95, 'WHO', 0.05, C.ink);
      lettering(ctx, 'x', 30.16, y, 1.9, 'DREW', 0.05, C.ink);
      lettering(ctx, 'x', 30.16, y, 1.85, 'THIS', 0.05, C.ink);
    });
    // A pallet of totes, still in their boxes.
    R.thing(26.4, 5.6, (ctx) => {
      box(ctx, 25.0, 4.4, 0, 1.4, 1.2, 0.14, C.wood, { flat: true, lw: 0.025 });
      for (let i = 0; i < 4; i++) box(ctx, 25.05 + (i % 2) * 0.66, 4.45 + 0.1, 0.14 + Math.floor(i / 2) * 0.5, 0.64, 1.05, 0.5, tint(C.wood, 0.15), { lw: 0.03, dots: shade(C.wood, 0.4) });
      lettering(ctx, 'x', 25.7, 5.61, 0.63, 'TOTES x500', 0.12, C.ink);
    });
    // The bear mascot standee: the only bear on the floor nobody runs to see.
    R.thing(31.1, 4.9, (ctx, t) => {
      box(ctx, 30.6, 4.3, 0, 1, 0.6, 0.12, C.wood, { flat: true, lw: 0.025 });
      bear(ctx, 31.1, 4.6, 0.12, 0, { pose: 'look', dir: 'l' });
      const [X, Y] = P3(31.1, 4.6, 1.15);
      ctx.beginPath(); ctx.rect(X - 0.42, Y - 0.2, 0.84, 0.4); paint(ctx, C.white, { lw: 0.03 });
      label(ctx, 31.1, 4.6, 1.22, 'ASK ME ABOUT', 0.11, C.ink, 'Rethink Sans');
      label(ctx, 31.1, 4.6, 1.08, 'THE FUNNEL', 0.13, PRIMAL, 'Rethink Sans');
    });
    R.thing(31.3, 1.2, (ctx) => plant(ctx, 31.3, 1.0, 0, 1.4));

    // ---------- The Funnel ----------
    room(R, 16.6, 6.4, 24.6, 11.8, 'THE FUNNEL', { door: 21 });
    board(R, 19.2, 22.6, 6.62, (ctx, y) => {
      lettering(ctx, 'x', 20.9, y, 2.05, 'FUNNEL WORKSHOP', 0.17, C.ink);
      onFace(ctx, [ALONG_X, UP], 20.4, y, 1.3, (c) => funnel(c, 1.4, 0.95, PRIMAL, [0.33, 0.66]));
      lettering(ctx, 'x', 21.8, y, 1.66, 'AWARENESS', 0.1, C.ink);
      lettering(ctx, 'x', 21.8, y, 1.4, 'CONSIDERATION', 0.08, C.ink);
      lettering(ctx, 'x', 21.8, y, 1.17, 'CONVERSION', 0.09, C.ink);
      lettering(ctx, 'x', 21.8, y, 0.92, 'GOOSE?', 0.1, C.red);
    });
    // On the table: a bowl of stress balls, branded water bottles, a coffee,
    // and a laptop playing a word game.
    // (Sorted in front of the table, which the kit stands at its front edge.)
    R.thing(20.7, 9.8, (ctx) => {
      const z = 1.13;
      const [X, Y] = P3(20.6, 8.8, z);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.3, 0.14, 0, 0, Math.PI); ctx.lineTo(X - 0.3, Y); paint(ctx, C.white, { lw: 0.025 });
      [C.coral, C.teal, C.mustard, PRIMAL, C.pink].forEach((col, i) => { ctx.beginPath(); ctx.arc(X - 0.18 + i * 0.09, Y - 0.04 - (i % 2) * 0.07, 0.07, 0, Math.PI * 2); paint(ctx, col, { lw: 0.015 }); });
      for (let i = 0; i < 3; i++) {
        box(ctx, 19.2 + i * 0.3, 8.3, z, 0.12, 0.12, 0.38, C.teal, { flat: true, lw: 0.02 });
        box(ctx, 19.22 + i * 0.3, 8.32, z + 0.38, 0.08, 0.08, 0.06, C.white, { flat: true, lw: 0.015 });
      }
      mug(ctx, 19.8, 9.45, z, C.coral);
      box(ctx, 22.0, 9.2, z, 0.6, 0.4, 0.03, C.grey, { flat: true, lw: 0.02 });
      face(ctx, [[22.02, 9.25, z + 0.03], [22.58, 9.25, z + 0.03], [22.58, 9.12, z + 0.42], [22.02, 9.12, z + 0.42]], C.ink, { lw: 0.02 });
      if (Q.detail) for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) {
        const col = (i + j * 2) % 4 === 0 ? C.leaf : (i + j) % 3 === 0 ? C.mustard : C.grey;
        const u = 22.08 + i * 0.1, v = z + 0.1 + j * 0.1;
        face(ctx, [[u, 9.24 - j * 0.035, v], [u + 0.08, 9.24 - j * 0.035, v], [u + 0.08, 9.22 - j * 0.035, v + 0.08], [u, 9.22 - j * 0.035, v + 0.08]], col, { stroke: false });
      }
    });
    // The attendees' chairs, facing the board: the seat, then the back
    // (drawn after whoever's in it).
    for (const s of SEATS) {
      R.thing(s.x, s.y, (ctx) => drawChair(ctx, s.x, s.y, 0, shade(INK.carpet, 0.45), 1, 'seat'));
      R.thing(s.x, s.y + 0.8, (ctx) => box(ctx, s.x - 0.3, s.y + 0.27, 0.6, 0.6, 0.1, 0.8, shade(INK.carpet, 0.45), { flat: true, lw: 0.03, top: tint(shade(INK.carpet, 0.45), 0.15) }));
    }
    SEATS.forEach((s, i) => R.mover((t) => seatAt(t, s, i), (ctx, t, p) => {
      if (p.gone) return;
      person(ctx, p.x, p.y, p.sit ? 0.2 : 0, { ...s.look, pose: p.pose, dir: p.dir, back: p.back }, t);
    }, { bias: 0.6 }));
    // The presenter: on slide one of the funnel since nine, and not stopping
    // for a bear.
    R.mover((t) => (seated(t, 0.1) ? { x: 23.3, y: 7.4 } : { x: 23.3, y: 7.4, gone: true }), (ctx, t, p) => {
      if (p.gone) return;
      const k = Math.sin(t * 0.7) > 0.3;
      person(ctx, p.x, p.y, 0, { ...LOOKS.presenter, pose: k ? 'point' : 'stand', dir: 'l', hold: k ? null : marker }, t);
      if (Q.detail && bearOClock(t)) speech(ctx, p.x, p.y, 2.75, 'Any questions? Guys?', { size: 0.36 });
    });
    // The cupboard: so full of swag the lid won't shut, and now and then it
    // bumps up (the totes inside shifting), straps flapping out of the gap.
    // Inside, a tote bag full of tote bags springs up.
    const cupboard = R.poke({ id: 'cupboard', at: [17.6, 7.6, 0.9], r: 0.8, say: 'Swag overflow. The closet is full.' });
    R.thing(17.6, 8.4, (ctx) => {
      box(ctx, 17.0, 6.8, 0, 1.2, 1.6, 1.15, C.wood, { lw: 0.035, top: shade(C.wood, 0.55), dots: shade(C.wood, 0.45) });
      face(ctx, [[18.2, 6.95, 0.1], [18.2, 8.25, 0.1], [18.2, 8.25, 1.0], [18.2, 6.95, 1.0]], tint(C.wood, 0.2), { lw: 0.025 });
      box(ctx, 18.2, 7.0, 0.3, 0.04, 0.06, 0.22, C.ink, { flat: true, stroke: false });
      // OVERFLOW, on a card taped high on its side, over the table, big
      // enough to read.
      face(ctx, [[17.06, 8.415, 0.66], [18.14, 8.415, 0.66], [18.14, 8.415, 1.08], [17.06, 8.415, 1.08]], C.white, { lw: 0.025 });
      lettering(ctx, 'x', 17.6, 8.42, 0.93, 'OVERFLOW', 0.17, PRIMAL, 'Bagel Fat One');
      lettering(ctx, 'x', 17.6, 8.42, 0.76, 'TOTES. DO NOT ADD.', 0.08, C.ink);
    });
    // The bump: a second or so of it every 11.
    const bumpK = (t) => { const s = ((t % 11) + 11) % 11; return s < 1.2 ? Math.abs(Math.sin(s * 7.8)) * (1 - s / 1.2) : 0; };
    R.thing(17.6, 8.45, (ctx, t) => {
      const k = cupboard.k();
      const bump = k < 0.05 ? bumpK(t) : 0;
      // The lid, hinged at the back, ajar with straps poking out; open, up.
      const a = 0.12 + bump * 0.3 + k * 1.6;
      const lid = (col) => face(ctx, [[17.0, 6.8, 1.15], [18.2, 6.8, 1.15], [18.2, 6.8 + 1.6 * Math.cos(a), 1.15 + 1.6 * Math.sin(a)], [17.0, 6.8 + 1.6 * Math.cos(a), 1.15 + 1.6 * Math.sin(a)]], col, { lw: 0.03 });
      if (k < 0.05) {
        lid(tint(C.wood, 0.25));
        // Straps hanging out of the gap, flapping when it bumps.
        const ey = 6.8 + 1.6 * Math.cos(a), ez = 1.15 + 1.6 * Math.sin(a);
        [C.teal, C.coral, C.mustard, C.teal].forEach((col, i) => {
          const [X, Y] = P3(17.2 + i * 0.27, ey, ez - 0.02);
          const fl = bump * Math.sin(t * 14 + i * 2) * 0.5;
          ctx.beginPath(); ctx.moveTo(X - 0.1, Y); ctx.bezierCurveTo(X - 0.14 + fl * 0.3, Y + 0.3 + bump * 0.1, X + 0.14 + fl * 0.3, Y + 0.3 + bump * 0.1, X + 0.1, Y);
          ctx.lineCap = 'round';
          ctx.strokeStyle = C.ink; ctx.lineWidth = 0.08; ctx.stroke();
          ctx.strokeStyle = col; ctx.lineWidth = 0.05; ctx.stroke();
        });
        if (bump > 0.05 && Q.detail) {
          // Thump lines, as the swag closet's.
          const [TX, TY] = P3(17.6, 7.6, 1.75);
          ctx.strokeStyle = C.ink; ctx.lineWidth = 0.04;
          ctx.beginPath();
          for (const sx of [-1, 1]) { ctx.moveTo(TX + sx * 0.3, TY - 0.05); ctx.lineTo(TX + sx * 0.5, TY - 0.25); ctx.moveTo(TX + sx * 0.35, TY + 0.1); ctx.lineTo(TX + sx * 0.6, TY + 0.02); }
          ctx.stroke();
        }
        return;
      }
      lid(tint(C.wood, 0.25));
      // The tote bag of tote bags, rising out of it.
      const z = 0.55 + 0.6 * k;
      [[C.teal, -0.18], [C.mustard, 0.02], [C.coral, 0.2]].forEach(([col, dx], i) => {
        box(ctx, 17.3 + dx + 0.1, 7.48, z + 0.3, 0.3, 0.12, 0.48 + (i % 2) * 0.1, col, { flat: true, lw: 0.02 });
      });
      box(ctx, 17.25, 7.4, z, 0.7, 0.3, 0.55, C.white, { flat: true, lw: 0.03, left: tint(C.woodLight, 0.4) });
      const [X, Y] = P3(17.6, 7.7, z + 0.28);
      ctx.beginPath(); ctx.arc(X, Y, 0.1, 0, Math.PI * 2); ctx.fillStyle = PRIMAL; ctx.fill();
      const [HX, HY] = P3(17.6, 7.7, z + 0.55);
      ctx.beginPath(); ctx.arc(HX, HY, 0.2, Math.PI, 0); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
    }, { anim: true });
    R.find({ id: 'totes', label: 'A tote bag of tote bags', kind: 'poke', inside: cupboard, at: [17.6, 7.6, 1.5], r: 0.75, hint: 'The meeting room\'s cupboard is full of bags full of bags.' });
    // The door, with a funnel on it (and from four, the LAUNCH sticky).
    R.thing(21.0, 11.85, (ctx, t) => {
      const here = SEATS.some((s) => seated(t, s.k));
      const a = here ? 1.15 * clamp(Math.max(rushK(t, 5.2, 0.5), rushK(t, 5.2, 0.9)) * 4) : 0;
      const [ex, ey] = doorEnd(a);
      const dx = (ex - DOOR.hx) / DOOR.w, dy = (ey - DOOR.y) / DOOR.w;
      ctx.save();
      ctx.globalAlpha *= 0.4;
      face(ctx, [[DOOR.hx, DOOR.y, 0], [ex, ey, 0], [ex, ey, 2.3], [DOOR.hx, DOOR.y, 2.3]], tint(C.sky, 0.45), { stroke: false });
      ctx.restore();
      face(ctx, [[DOOR.hx, DOOR.y, 0], [ex, ey, 0], [ex, ey, 2.3], [DOOR.hx, DOOR.y, 2.3]], null, { lw: 0.03 });
      const mid = (u) => [DOOR.hx + dx * u, DOOR.y + dy * u];
      // The funnel decal, and the handle.
      const [fx, fy] = mid(0.8);
      onFace(ctx, [[-dx, -dy, 0], UP], fx, fy, 1.45, (c) => funnel(c, 0.55, 0.45, PRIMAL, [0.5]));
      onFace(ctx, [[-dx, -dy, 0], DOWN], fx, fy, 1.05, (c) => words(c, 'THE FUNNEL', 0, 0, 0.09, C.ink));
      const [hx, hy] = mid(1.4);
      box(ctx, hx - 0.03, hy - 0.03, 0.9, 0.06, 0.06, 0.35, C.grey, { flat: true, lw: 0.02 });
      if (sticky(t).col >= 8 && (H(t) >= 16.15 || H(t) < 9)) {
        const [sx, sy] = mid(0.25);
        onFace(ctx, [[-dx, -dy, 0], UP], sx, sy, 1.5, (c) => { c.beginPath(); c.rect(-0.2, -0.17, 0.4, 0.34); c.fillStyle = INK.sticky; c.fill(); c.strokeStyle = C.ink; c.lineWidth = 0.015; c.stroke(); });
        onFace(ctx, [[-dx, -dy, 0], DOWN], sx, sy, 1.5, (c) => words(c, 'LAUNCH', 0, 0, 0.085, C.ink));
      }
    }, { anim: true });

    // ---------- The swag closet ----------
    const closet = R.poke({ id: 'swag', at: [29.6, 10.2, 1.2], r: 0.9, say: 'Everything falls out. Told you.' });
    R.thing(29.6, 9.9, (ctx) => {
      box(ctx, CL.x0, CL.y0, 0, CL.x1 - CL.x0, CL.y1 - CL.y0, CL.h, PRIMAL, { top: tint(PRIMAL, 0.2), lw: 0.04 });
      lettering(ctx, 'x', 29.6, CL.y1 + 0.01, 2.43, 'SWAG', 0.26, C.white, 'Bagel Fat One');
      lettering(ctx, 'y', CL.x1 + 0.01, 8.3, 1.6, 'BRAND', 0.3, tint(PRIMAL, 0.45), 'Bagel Fat One');
      lettering(ctx, 'y', CL.x1 + 0.01, 8.3, 1.2, 'ASSETS', 0.3, tint(PRIMAL, 0.45), 'Bagel Fat One');
      // On top: more boxes that didn't fit.
      box(ctx, 28.0, 7.2, CL.h, 0.9, 0.8, 0.5, C.wood, { lw: 0.025, dots: shade(C.wood, 0.4) });
      box(ctx, 29.1, 7.0, CL.h, 0.8, 0.9, 0.38, tint(C.wood, 0.15), { lw: 0.025, dots: shade(C.wood, 0.4) });
      box(ctx, 30.3, 7.4, CL.h, 0.8, 0.8, 0.6, C.wood, { lw: 0.025, dots: shade(C.wood, 0.4) });
      lettering(ctx, 'x', 28.45, 8.01, CL.h + 0.25, 'TOTES', 0.12, C.ink);
      lettering(ctx, 'x', 30.7, 8.21, CL.h + 0.3, 'PLUSH', 0.12, C.ink);
    });
    // Its doors (and what's behind them): thumping now and then while shut,
    // flung open by a tap.
    R.thing(29.6, 10.05, (ctx, t) => {
      const k = closet.k();
      const z0 = 0.06, z1 = 2.2;
      if (k > 0.02) {
        // Inside: shelves packed tight.
        face(ctx, [[CL.d0, CL.y1 + 0.005, z0], [CL.d1, CL.y1 + 0.005, z0], [CL.d1, CL.y1 + 0.005, z1], [CL.d0, CL.y1 + 0.005, z1]], shade(PRIMAL, 0.6), { lw: 0.03 });
        for (const zs of [0.8, 1.5]) {
          face(ctx, [[CL.d0, CL.y1 + 0.01, zs], [CL.d1, CL.y1 + 0.01, zs]], null, { lw: 0.05, stroke: C.wood });
          for (let i = 0; i < 8; i++) {
            const x = CL.d0 + 0.1 + i * 0.38, col = [C.teal, C.white, C.mustard, C.coral][(i + zs * 10) % 4];
            face(ctx, [[x, CL.y1 + 0.012, zs], [x + 0.32, CL.y1 + 0.012, zs], [x + 0.32, CL.y1 + 0.012, zs + 0.5], [x, CL.y1 + 0.012, zs + 0.5]], col, { lw: 0.015 });
          }
        }
        // What fell out, behind the goose.
        for (const it of SPILL) {
          if (it.y > CL.y1 + 0.8) continue;
          const x = 29.6 + (it.x - 29.6) * k, y = CL.y1 - 0.3 + (it.y - CL.y1 + 0.3) * k, z = 1.0 * (1 - k) + Math.sin(k * Math.PI) * 0.6;
          swagItem(ctx, it, x, y, z);
        }
        // The heap of plush the goose is sitting on.
        if (k > 0.5) for (let i = 0; i < 5; i++) plush(ctx, 29.2 + i * 0.2, CL.y1 + 0.35 + (i % 2) * 0.1, 0, 0.85, i % 2 ? C.black : C.brown);
      }
      const a = k > 0.02 ? 0.03 + k * 1.75 : 0.025 + thump(t) * 0.06;
      const leaf = (hx, s) => {
        const ex = hx + s * 1.6 * Math.cos(a), ey = CL.y1 + 0.02 + 1.6 * Math.sin(a);
        face(ctx, [[hx, CL.y1 + 0.02, z0], [ex, ey, z0], [ex, ey, z1], [hx, CL.y1 + 0.02, z1]], tint(PRIMAL, 0.12), { lw: 0.035 });
        const hx2 = hx + s * 1.45 * Math.cos(a), hy2 = CL.y1 + 0.02 + 1.45 * Math.sin(a);
        box(ctx, hx2 - 0.03, hy2 - 0.03, 0.95, 0.06, 0.06, 0.35, C.white, { flat: true, lw: 0.02 });
      };
      leaf(CL.d1, -1);
      leaf(CL.d0, 1);
      if (k < 0.5) {
        // Shut (just): a strap caught in the doors, a sign, a thump.
        const y = CL.y1 + 0.06;
        const [SX, SY] = P3(29.6, y, 0.55);
        ctx.beginPath(); ctx.arc(SX - 0.05, SY + 0.12, 0.13, -0.3, Math.PI * 0.9); ctx.strokeStyle = C.teal; ctx.lineWidth = 0.05; ctx.stroke();
        face(ctx, [[28.95, y, 1.3], [30.25, y, 1.3], [30.25, y, 1.72], [28.95, y, 1.72]], C.white, { lw: 0.02 });
        lettering(ctx, 'x', 29.6, y + 0.01, 1.59, 'DO NOT', 0.13, C.red);
        lettering(ctx, 'x', 29.6, y + 0.01, 1.43, 'OPEN', 0.13, C.red);
        if (thumping(t) && Q.detail) {
          const [TX, TY] = P3(29.6, CL.y1 + 0.1, 2.35);
          ctx.strokeStyle = C.ink; ctx.lineWidth = 0.04;
          ctx.beginPath();
          for (const s of [-1, 1]) { ctx.moveTo(TX + s * 0.25, TY - 0.05); ctx.lineTo(TX + s * 0.45, TY - 0.25); ctx.moveTo(TX + s * 0.3, TY + 0.1); ctx.lineTo(TX + s * 0.55, TY + 0.02); }
          ctx.stroke();
        }
      }
    }, { anim: true });
    // What fell out, in front.
    R.thing(29.6, 11.8, (ctx) => {
      const k = closet.k();
      if (k < 0.02) return;
      for (const it of SPILL) {
        if (it.y <= CL.y1 + 0.8) continue;
        const x = 29.6 + (it.x - 29.6) * k, y = CL.y1 - 0.3 + (it.y - CL.y1 + 0.3) * k, z = 1.0 * (1 - k) + Math.sin(k * Math.PI) * 0.6;
        swagItem(ctx, it, x, y, z);
      }
    }, { anim: true });
    R.goose((t) => ({ x: 29.65, y: CL.y1 + 0.55, z: 0.3, dir: 'l', pose: Math.sin(t * 0.9) > 0.6 ? 'honk' : 'sit', hidden: closet.k() < 0.5 }),
      { kind: 'poke', inside: closet, hint: 'Something in the swag closet is not a plush mascot.' });
    // A feather by the door, and a couple of totes that escaped earlier.
    R.rug((ctx) => {
      const [X, Y] = P3(30.6, 10.7, 0);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.18, 0.06, -0.3, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.02 });
    });
    R.thing(27.2, 11.3, (ctx) => {
      swagItem(ctx, { kind: 'tote', col: C.teal, a: 0.4 }, 26.9, 11.0, 0.01);
      swagItem(ctx, { kind: 'tote', col: C.mustard, a: 1.3 }, 27.3, 11.3, 0.03);
    });

    // ---------- The Gantt chart ----------
    const gantt = R.poke({ id: 'gantt', at: [19.6, 14.8, 1.8], r: 0.9, say: (t) => (sticky(t).col >= 8 && H(t) >= 16 ? 'LAUNCH is off the chart. Literally.' : 'LAUNCH has moved again. Nobody saw it.') });
    void gantt;
    R.thing((GX0 + GX1) / 2, GY + 0.05, (ctx) => {
      box(ctx, GX0, GY - 0.2, 0, GX1 - GX0, 0.2, 2.55, FABRIC, { lw: 0.035, top: tint(FABRIC, 0.2), left: tint(FABRIC, 0.1) });
      const y = GY + 0.005;
      face(ctx, [[GX0 + 0.1, y, 0.3], [GX1 - 0.1, y, 0.3], [GX1 - 0.1, y, 2.42], [GX0 + 0.1, y, 2.42]], C.white, { lw: 0.025 });
      if (!Q.detail) return;
      lettering(ctx, 'x', (GX0 + GX1) / 2, y, 2.3, 'GANDER COLA PITCH: THE PLAN', 0.13, C.ink);
      for (let c = 0; c < 8; c++) {
        lettering(ctx, 'x', colX(c), y, 2.12, `WK${c + 1}`, 0.09, C.grey);
        face(ctx, [[COL0 + c * COLW, y, 0.35], [COL0 + c * COLW, y, 2.05]], null, { lw: 0.012, stroke: C.greyLight });
      }
      const rows = [['BRIEF', 0, 2, C.teal], ['RESEARCH', 1, 3, C.coral], ['STRATEGY', 2, 5, C.mustard], ['CREATIVE', 3, 9, C.purple], ['LAUNCH', -1, -1, null]];
      rows.forEach(([name, a, b, col], i) => {
        const z = 1.85 - i * 0.3;
        lettering(ctx, 'x', GX0 + 0.62, y, z, name, 0.09, C.ink);
        face(ctx, [[GX0 + 0.12, y, z - 0.15], [GX1 - 0.12, y, z - 0.15]], null, { lw: 0.012, stroke: C.greyLight });
        if (col) face(ctx, [[COL0 + a * COLW + 0.03, y, z - 0.08], [Math.min(GX1 - 0.12, COL0 + b * COLW - 0.03), y, z - 0.08], [Math.min(GX1 - 0.12, COL0 + b * COLW - 0.03), y, z + 0.08], [COL0 + a * COLW + 0.03, y, z + 0.08]], col, { stroke: false });
      });
      // CREATIVE runs off the end, onto the wall, in pen.
      onFace(ctx, [ALONG_X, UP], GX1 - 0.1, y, 1.0, (c) => line(c, [[0, 0], [0.18, 0], [0.12, 0.06], [0.18, 0], [0.12, -0.06]], C.purple, 0.03));
      // Where TODAY is.
      face(ctx, [[COL0 + 0.45, y, 0.35], [COL0 + 0.45, y, 2.05]], null, { lw: 0.025, stroke: C.red });
    });
    // The sticky itself.
    R.thing(GX0, GY + 0.06, (ctx, t) => {
      const s = sticky(t);
      if (s.col >= 8 && H(t) >= 16) return;
      const y = GY + 0.01, z = 0.65 + s.lift;
      face(ctx, [[s.x - 0.2, y, z - 0.16], [s.x + 0.2, y, z - 0.16], [s.x + 0.2, y, z + 0.16], [s.x - 0.2, y, z + 0.16]], INK.sticky, { lw: 0.015 });
      lettering(ctx, 'x', s.x, y + 0.005, z, 'LAUNCH', 0.085, C.ink);
    }, { anim: true });
    // The account manager who moves it.
    R.mover(amAt, (ctx, t, p) => {
      if (p.gone) return;
      person(ctx, p.x, p.y, 0, { ...LOOKS.am, pose: p.pose, dir: p.dir, back: p.back, hold: p.pose === 'read' ? clipboard : null }, t);
      if (!Q.detail) return;
      if (!p.rush && p.ontrack) speech(ctx, p.x, p.y, 2.75, 'Still on track!', { size: 0.36 });
      else if (p.door) speech(ctx, p.x, p.y, 2.75, 'It\'s more of a soft launch.', { size: 0.36 });
    }, { bias: 0.15 });

    // ---------- Take 47 ----------
    // Her mark (tape), and the scripts of the takes before this one.
    R.rug((ctx) => {
      const [mx, my] = MARK;
      for (const s of [-1, 1]) face(ctx, [[mx - 0.3, my - 0.3 * s, 0], [mx + 0.3, my + 0.3 * s, 0]], null, { lw: 0.08, stroke: INK.sticky });
      if (!Q.detail) return;
      [[25.4, 16.4], [23.9, 16.5], [25.9, 15.8], [24.0, 14.6], [26.2, 16.9], [25.1, 17.2]].forEach(([x, y], i) => {
        const [X, Y] = P3(x, y, 0.08);
        ctx.beginPath(); ctx.arc(X, Y, 0.1 + (i % 2) * 0.02, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.02 });
      });
    });
    // The ring light, with her phone in the middle: it faces her, and at bear
    // o'clock it swings round to the window. She left it on all night.
    R.light({ at: RING, r: 2.4, color: C.butter, k: (t) => (H(t) > 8.6 ? 0.75 : 0) });
    R.thing(RING[0] + 0.3, RING[1] + 0.3, (ctx, t) => {
      const [x, y, z] = RING;
      for (let i = 0; i < 3; i++) {
        const a = i * 2.1 + 0.5;
        face(ctx, [[x + Math.cos(a) * 0.4, y + Math.sin(a) * 0.4, 0], [x, y, 0.75]], null, { lw: 0.05, stroke: C.ink });
      }
      box(ctx, x - 0.03, y - 0.03, 0.7, 0.06, 0.06, z - 0.95, C.ink, { flat: true, stroke: false });
      // A cue card clipped to the stand: the whole script.
      box(ctx, x - 0.02, y + 0.08, 0.95, 0.04, 0.5, 0.34, C.white, { flat: true, lw: 0.02, right: C.white });
      onFace(ctx, 'y', x + 0.03, y + 0.33, 1.18, (c) => words(c, 'HI GUYS!', 0, 0, 0.08, C.ink));
      onFace(ctx, 'y', x + 0.03, y + 0.33, 1.05, (c) => words(c, 'SWAG DROP!!', 0, 0, 0.07, PRIMAL));
      const lit = H(t) > 8.6;
      const th = 0.32 + (Math.PI / 2 - 0.32) * rushK(t, 2.4, 0.2);
      const ux = -Math.sin(th), uy = Math.cos(th);
      const ring = (r) => { ctx.beginPath(); for (let i = 0; i <= 28; i++) { const a = (i / 28) * Math.PI * 2; const [X, Y] = P3(x + ux * Math.cos(a) * r, y + uy * Math.cos(a) * r, z + Math.sin(a) * r); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } };
      ring(0.45);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.17; ctx.stroke();
      ctx.strokeStyle = lit ? C.white : C.greyLight; ctx.lineWidth = 0.1; ctx.stroke();
      // The phone, sideways, in its clamp.
      const c = (u, v) => [x + ux * u, y + uy * u, z + v];
      face(ctx, [c(-0.13, -0.22), c(0.13, -0.22), c(0.13, 0.22), c(-0.13, 0.22)], C.ink, { lw: 0.02 });
      face(ctx, [c(-0.45, 0), c(-0.13, 0)], null, { lw: 0.03, stroke: C.ink });
      // REC, blinking, while she's filming.
      const p = kayleigh(t);
      if (p.pose === 'film' && Math.sin(t * 5) > 0) {
        const [X, Y] = P3(...c(0.06, 0.15));
        ctx.beginPath(); ctx.arc(X, Y, 0.035, 0, Math.PI * 2); ctx.fillStyle = C.red; ctx.fill();
      }
    }, { anim: true });
    // The take sign: a little chalkboard counting up by the hour.
    R.thing(25.7, 15.05, (ctx, t) => {
      const x0 = 25.35, x1 = 26.05, y = 15.0;
      for (const lx of [x0 + 0.08, x1 - 0.08]) face(ctx, [[lx, y, 0.9], [lx, y - 0.35, 0]], null, { lw: 0.04, stroke: C.wood });
      face(ctx, [[x0, y, 0.1], [x1, y, 0.1], [x1, y, 0.95], [x0, y, 0.95]], C.ink, { lw: 0.04, stroke: C.wood });
      const take = 38 + Math.floor(clamp(H(t), 8, 17));
      lettering(ctx, 'x', 25.7, y + 0.01, 0.78, 'TAKE', 0.13, C.white);
      lettering(ctx, 'x', 25.7, y + 0.01, 0.45, String(take), 0.36, INK.sticky, 'Bagel Fat One');
    }, { anim: true });
    // The backdrop Kevin's building behind her, a box at a time.
    R.thing(27.3, 15.3, (ctx, t) => {
      const n = clamp(1 + Math.floor((H(t) - 8.5) * 1.2), 1, 9);
      const at = [[26.4, 14.85, 0], [26.85, 14.85, 0], [26.4, 14.4, 0], [26.85, 14.4, 0], [26.6, 14.6, 0.42], [26.4, 14.4, 0.42], [26.85, 14.85, 0.42], [26.6, 14.6, 0.84], [26.6, 14.6, 1.26]];
      at.slice(0, n).sort((a, b) => a[2] - b[2] || (a[0] + a[1]) - (b[0] + b[1])).forEach(([bx, by, bz], i) => {
        box(ctx, bx, by, bz, 0.42, 0.42, 0.42, i % 3 ? C.wood : tint(C.wood, 0.2), { lw: 0.025, dots: shade(C.wood, 0.4) });
        if (Q.detail) { const [X, Y] = P3(bx + 0.21, by + 0.42, bz + 0.21); ctx.beginPath(); ctx.arc(X, Y, 0.07, 0, Math.PI * 2); ctx.fillStyle = PRIMAL; ctx.fill(); }
      });
    }, { anim: true });
    R.mover(kevinAt, (ctx, t, p) => {
      if (p.gone) return;
      person(ctx, p.x, p.y, 0, { ...LOOKS.kevin, pose: p.box ? (p.moving ? 'carry' : 'carry') : p.pose, speed: p.moving ? 7 : 0, dir: p.dir, back: p.back, hold: p.box ? carton : null, arms: p.box && p.moving ? [1.2, 1.2] : undefined }, t);
    }, { bias: 0.15 });
    R.find({ id: 'ring-light', label: 'A ring light', at: [RING[0], RING[1], RING[2]], r: 0.8 });

    // What ruins each take, said over her head while she's on her mark (in a
    // mover that stands where she does, so the bubble is never cut at a seam
    // of the floor's pictures).
    R.mover(() => ({ x: MARK[0], y: MARK[1] + 0.05 }), (ctx, t) => {
      if (!Q.detail || kayleigh(t).pose !== 'film') return;
      let say = null;
      const c = ceo(t), k = kevinAt(t);
      if (bearOClock(t)) say = 'Pivoting to bear content.';
      else if (c.y > 11.5 && c.y < 14.5 && Math.abs(c.x - MARK[0]) < 3.5) say = 'CUT. Hi, Dana!';
      else if (thumping(t) && closet.k() < 0.5) say = 'CUT. Was that a honk?';
      else if (!k.gone && k.moving && k.y > 14.2) say = 'Kevin, you\'re in it!';
      if (say) speech(ctx, MARK[0], MARK[1], 2.75, say, { size: 0.36 });
    }, { bias: 0.3 });

    // ---------- The launch party's leftovers ----------
    R.rug((ctx) => {
      if (!Q.detail) return;
      for (let i = 0; i < 22; i++) {
        const a = hash(i, 5) * Math.PI * 2, r = 0.3 + hash(i, 9) * 1.1;
        const [X, Y] = P3(30.7 + Math.cos(a) * r, 17.0 + Math.sin(a) * r * 0.8, 0);
        ctx.fillStyle = [C.pink, C.mustard, C.teal, PRIMAL][i % 4];
        ctx.fillRect(X - 0.04, Y - 0.025, 0.08, 0.05);
      }
    });
    R.thing(29.9, 17.4, (ctx) => {
      const [X, Y] = P3(29.9, 17.3, 0.12);
      ctx.beginPath(); ctx.moveTo(X - 0.15, Y + 0.1); ctx.lineTo(X + 0.4, Y - 0.05); ctx.lineTo(X - 0.1, Y - 0.15); ctx.closePath();
      paint(ctx, C.pink, { lw: 0.025, dots: C.mustard, density: 0.4 });
    });
    // The decoy: a goose balloon, mostly out of helium.
    R.decoy({ id: 'balloon', at: [30.6, 16.4, 0.6], r: 0.7, say: 'Launch party balloon. Seen better days.' });
    R.thing(30.7, 16.7, (ctx, t) => {
      const z = 0.55 + Math.sin(t * 0.8) * 0.05;
      const [WX, WY] = P3(30.75, 16.75, 0);
      ctx.beginPath(); ctx.rect(WX - 0.1, WY - 0.14, 0.2, 0.14); paint(ctx, C.pink, { lw: 0.02 });
      const [BX, BY] = P3(30.6, 16.4, z - 0.12);
      ctx.beginPath(); ctx.moveTo(WX, WY - 0.12); ctx.quadraticCurveTo(WX + 0.2, (WY + BY) / 2, BX + 0.05, BY + 0.05);
      ctx.strokeStyle = C.pink; ctx.lineWidth = 0.03; ctx.stroke();
      ctx.save();
      ctx.translate(BX, BY);
      ctx.rotate(0.3 + Math.sin(t * 0.6) * 0.06);
      ctx.scale(0.95, 0.72);
      ctx.translate(-BX, -BY);
      goose(ctx, 30.6, 16.4, z, 0, { pose: 'swim', dir: 'l' });
      ctx.restore();
      // Creases, and the knot.
      ctx.strokeStyle = alpha(C.ink, 0.5); ctx.lineWidth = 0.025;
      ctx.beginPath(); ctx.moveTo(BX - 0.2, BY - 0.12); ctx.lineTo(BX - 0.05, BY - 0.05); ctx.moveTo(BX + 0.1, BY - 0.2); ctx.lineTo(BX + 0.18, BY - 0.07); ctx.stroke();
      ctx.beginPath(); ctx.arc(BX + 0.05, BY + 0.05, 0.04, 0, Math.PI * 2); ctx.fillStyle = C.pink; ctx.fill();
    }, { anim: true });

    // ---------- Desks off the front wall ----------
    // The fantasy football lineup on a screen, and a trophy taken out of a
    // drawer at bear o'clock, while its owner's at the window.
    const front = [...pod(R, 19.6, 'front', 3), ...pod(R, 27.6, 'front', 3)];
    staff(R, front, 530, { empty: [4, 8, 10], kinds: ['social', 'football', 'social', 'slides', 'social', 'email', 'social', 'slides', 'email', 'social', 'email', 'slides'] });
    const ff = front[1].mon;
    R.find({ id: 'fantasy', label: 'A fantasy football lineup', at: [ff[0] + 0.2, ff[1], ff[2] + 0.5], r: 0.75 });
    const [tx, ty, tz] = [front[7].mon[0] + 0.45, front[7].mon[1] - 0.7, front[7].mon[2]];
    R.thing(tx, ty, (ctx, t) => {
      if (!bearOClock(t)) return;
      box(ctx, tx - 0.12, ty - 0.12, tz, 0.24, 0.24, 0.08, C.brown, { flat: true, lw: 0.02 });
      box(ctx, tx - 0.025, ty - 0.025, tz + 0.08, 0.05, 0.05, 0.1, C.mustard, { flat: true, lw: 0.015 });
      const [X, Y] = P3(tx, ty, tz + 0.18);
      ctx.beginPath(); ctx.moveTo(X - 0.15, Y - 0.26); ctx.lineTo(X + 0.15, Y - 0.26); ctx.quadraticCurveTo(X + 0.14, Y, X, Y); ctx.quadraticCurveTo(X - 0.14, Y, X - 0.15, Y - 0.26);
      paint(ctx, C.mustard, { lw: 0.025 });
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(X + s * 0.16, Y - 0.17, 0.06, 0, Math.PI * 2); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.stroke(); }
      ctx.fillStyle = C.white; ctx.fillRect(X - 0.08, Y - 0.22, 0.04, 0.12);
    }, { anim: true });
    R.find({ id: 'trophy', label: 'A participation trophy', kind: 'hard', at: [tx, ty, tz + 0.18], r: 0.75, when: bearOClock, note: 'bear o\'clock',
      riddle: 'Everyone gets one. This one comes out when nobody\'s looking.', hint: 'When the bear comes, someone at a front desk leaves a little gold cup out.' });
  },
};
