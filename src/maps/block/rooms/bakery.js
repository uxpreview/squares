// Bakery at 5am: a roaring brick oven, a wedding cake that wobbles at every
// sneeze, a queue that never ends and one goose with a ticket.
//
// Retuned for the difficulty rules (session 9): the goose is a hard find now,
// queueing behind a man in a goose costume (a decoy) under a cake topped with
// sugar swans (another), with a concrete porch goose by the door (another);
// ticket number one is under the day-old bread (poke); the rolling pin lies
// with the baguettes on the far cooling rack (hard).
import {
  C, box, rect, disc, cylinder, face, poly, paint, person, folk, slab, checker,
  speech, shade, tint, alpha, Q, label, P, paintText, onLeft, onRight, plant, rng, SKIN, goose,
} from '../../../engine/art.js';
import { particles, pulse, clamp, ease } from '../../../engine/actors.js';
import { ZK } from '../../../engine/iso.js';

// ---------- helpers ----------
function track(pts, speed) {
  const segs = [];
  let T = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x, y, p] = pts[i];
    if (p) { segs.push({ t0: T, dur: p, ax: x, ay: y, bx: x, by: y, still: true }); T += p; }
    if (i < pts.length - 1) {
      const [bx, by] = pts[i + 1];
      const dur = Math.hypot(bx - x, by - y) / speed;
      segs.push({ t0: T, dur, ax: x, ay: y, bx, by });
      T += dur;
    }
  }
  const f = (tt) => {
    tt = clamp(tt, 0, T - 1e-6);
    let i = segs.findIndex((g) => tt < g.t0 + g.dur);
    if (i < 0) i = segs.length - 1;
    const s = segs[i];
    let ref = s;
    for (let j = i; j >= 0 && ref.still; j--) ref = segs[j];
    if (ref.still) ref = segs.find((g) => !g.still) || s;
    const k = s.dur ? (tt - s.t0) / s.dur : 0;
    const dX = (ref.bx - ref.ax) - (ref.by - ref.ay), dY = (ref.bx - ref.ax) + (ref.by - ref.ay);
    return { x: s.ax + (s.bx - s.ax) * k, y: s.ay + (s.by - s.ay) * k, dir: dX >= 0 ? 'r' : 'l', back: dY < -0.01, moving: !s.still };
  };
  f.T = T;
  return f;
}

// Screen-space loaf shapes (drawn at the current origin).
function loaf(ctx, kind = 0, s = 1) {
  ctx.save();
  ctx.scale(s, s);
  ctx.beginPath();
  if (kind === 0) ctx.ellipse(0, -0.14, 0.34, 0.17, 0, 0, Math.PI * 2); // bloomer
  else if (kind === 1) ctx.roundRect(-0.5, -0.18, 1.0, 0.16, 0.08); // baguette
  else ctx.arc(0, -0.13, 0.15, 0, Math.PI * 2); // roll
  paint(ctx, kind === 1 ? C.mustard : C.wood, { dots: C.brown, density: 0.2, lw: 0.035 });
  if (Q.detail) {
    ctx.strokeStyle = C.butter;
    ctx.lineWidth = 0.035;
    ctx.beginPath();
    if (kind === 0) { for (const d of [-0.15, 0, 0.15]) { ctx.moveTo(d - 0.05, -0.24); ctx.lineTo(d + 0.05, -0.08); } }
    else if (kind === 1) { for (const d of [-0.3, -0.05, 0.2]) { ctx.moveTo(d, -0.16); ctx.lineTo(d + 0.15, -0.06); } }
    ctx.stroke();
  }
  ctx.restore();
}

function croissant(ctx, X, Y, s = 1) {
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(-0.34, 0.02);
  ctx.quadraticCurveTo(-0.3, -0.26, 0, -0.26);
  ctx.quadraticCurveTo(0.3, -0.26, 0.34, 0.02);
  ctx.quadraticCurveTo(0.16, -0.08, 0, -0.06);
  ctx.quadraticCurveTo(-0.16, -0.08, -0.34, 0.02);
  paint(ctx, C.mustard, { dots: C.wood, density: 0.3, lw: 0.035 });
  if (Q.detail) {
    ctx.strokeStyle = shade(C.mustard, 0.35);
    ctx.lineWidth = 0.025;
    ctx.beginPath();
    for (const d of [-0.17, 0, 0.17]) { ctx.moveTo(d - 0.03, -0.24); ctx.lineTo(d + 0.02, -0.08); }
    ctx.stroke();
  }
  ctx.restore();
}

function bun(ctx, X, Y, c = C.wood) {
  ctx.beginPath();
  ctx.ellipse(X, Y - 0.1, 0.18, 0.12, 0, 0, Math.PI * 2);
  paint(ctx, c, { lw: 0.03 });
  if (Q.detail) {
    ctx.beginPath(); ctx.ellipse(X, Y - 0.15, 0.1, 0.05, 0, 0, Math.PI * 2);
    ctx.fillStyle = C.white; ctx.fill();
  }
}

// Brick coursing on a vertical face. plane 'x' (face at x = at, running along y) or 'y'.
function bricks(ctx, plane, at, u0, u1, z0, z1, color) {
  if (!Q.detail) return;
  ctx.beginPath();
  let row = 0;
  for (let z = z0 + 0.32; z < z1; z += 0.32, row++) {
    const a = plane === 'x' ? P(at, u0, z) : P(u0, at, z);
    const b = plane === 'x' ? P(at, u1, z) : P(u1, at, z);
    ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    for (let u = u0 + (row % 2 ? 0.35 : 0.7); u < u1; u += 0.7) {
      const c = plane === 'x' ? P(at, u, z) : P(u, at, z);
      const d = plane === 'x' ? P(at, u, Math.min(z + 0.32, z1)) : P(u, at, Math.min(z + 0.32, z1));
      ctx.moveTo(c[0], c[1]); ctx.lineTo(d[0], d[1]);
    }
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.035;
  ctx.stroke();
}

function flourPuff(ctx, X, Y, q, n = 8, size = 1) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + i;
    const r = (0.2 + q * 1.1) * size;
    ctx.beginPath();
    ctx.arc(X + Math.cos(a) * r, Y - q * 1.2 * size - Math.abs(Math.sin(a)) * r * 0.5, (0.15 + q * 0.3) * size, 0, Math.PI * 2);
    ctx.fillStyle = alpha(C.white, 0.9 * (1 - q));
    ctx.fill();
    ctx.strokeStyle = alpha(C.greyLight, 0.9 * (1 - q));
    ctx.lineWidth = 0.025;
    ctx.stroke();
  }
}

// Gary's goose costume: a white hood with a beak, over his head.
function costumeHead(ctx, x, y, dir, back) {
  const [X, Y] = P(x, y, 0);
  const f = dir === 'l' ? -1 : 1;
  ctx.beginPath(); ctx.arc(X, Y - 2.02, 0.32, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.04 });
  if (!back) {
    // (a full hood: from the front only a slit to see out of)
    ctx.beginPath(); ctx.moveTo(X - 0.12, Y - 1.95); ctx.lineTo(X + 0.12, Y - 1.95); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X + f * 0.22, Y - 2.06); ctx.lineTo(X + f * 0.52, Y - 1.98); ctx.lineTo(X + f * 0.22, Y - 1.9); ctx.closePath();
    paint(ctx, C.coral, { lw: 0.03 });
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(X + f * 0.1, Y - 2.1, 0.035, 0, Math.PI * 2); ctx.fill();
  }
}

// A rolling pin, the length of a baguette, drawn where one would be.
function rollingPin(ctx, s = 1) {
  ctx.save();
  ctx.scale(s, s);
  ctx.beginPath(); ctx.roundRect(-0.36, -0.19, 0.72, 0.18, 0.08); paint(ctx, C.mustard, { dots: C.brown, density: 0.2, lw: 0.035 });
  for (const sd of [-1, 1]) { ctx.beginPath(); ctx.roundRect(sd > 0 ? 0.36 : -0.56, -0.14, 0.2, 0.08, 0.04); paint(ctx, C.wood, { lw: 0.03 }); }
  ctx.restore();
}

// ---------- layout ----------
const OX1 = 5.0, OY0 = 0.2, OY1 = 5.2, OH = 3.4; // brick oven block
const MOUTH = { y0: 1.9, y1: 3.9, z0: 0.9, z1: 1.9, arch: 0.6 };
const DC_Y0 = 10.0, DC_Y1 = 11.0, DC_X0 = 3.6, DC_X1 = 12.8; // display counter
const QT = 6; // queue beat, and the NOW SERVING tick
const CAKE = [13.5, 8.2];
const PG = [4.9, 15.0]; // the porch goose
// The rolling pin: which rack (its x), which shelf, which baguette along it, and where that is.
const PIN = [12.2, 2, 3, 12.2 + 0.4 + 0.55 * 3];

export default {
  id: 'bakery',
  name: 'Dawn Bakery',
  blurb: 'It is 5am, the oven is roaring and the wedding cake wobbles every time somebody sneezes. There is a goose in the queue and it has a ticket.',

  build(R) {
    // ---------- shell ----------
    R.floor((ctx) => {
      slab(ctx, C.greyLight);
      checker(ctx, C.paper, C.paperDeep, 1);
      if (!Q.detail) return;
      // flour dust around the kitchen
      const r = rng(9);
      ctx.fillStyle = alpha(C.white, 0.9);
      for (let i = 0; i < 90; i++) {
        const x = 5.5 + r() * 5, y = 5 + r() * 4;
        const [X, Y] = P(x, y, 0.005);
        ctx.beginPath(); ctx.ellipse(X, Y, 0.05 + r() * 0.15, 0.03 + r() * 0.07, 0, 0, Math.PI * 2); ctx.fill();
      }
      // crumbs trail (the mouse's favourite)
      ctx.fillStyle = C.wood;
      for (let i = 0; i < 14; i++) {
        const [X, Y] = P(9.4 + r() * 1.4, 1.6 + r() * 0.5, 0.005);
        ctx.fillRect(X, Y, 0.06, 0.05);
      }
    });
    R.walls({ left: C.blush, right: C.butter, cap: C.paper, dotsL: shade(C.blush, 0.25), dotsR: shade(C.butter, 0.2), densL: 0.1, densR: 0.1 });

    R.decor((ctx) => {
      // tiled dado along the right wall
      onRight(ctx, 5.0, 0, 11, 1.4, C.white, { dots: C.greyLight, density: 0.2 });
      if (Q.detail) for (let x = 5.5; x < 16; x += 0.5) face(ctx, [[x, 0, 0], [x, 0, 1.4]], null, { lw: 0.02, stroke: C.greyLight });
      onRight(ctx, 5.0, 1.4, 11, 0.12, C.coral);
      onLeft(ctx, 5.2, 1.4, 10.8, 0.12, C.coral);
      // shop name painted on the right wall
      paintText(ctx, 'right', 11.8, 5.25, 'RISE & SHINE', 0.95, C.coral);
      paintText(ctx, 'right', 11.8, 4.55, 'BAKERY . SINCE 5AM', 0.4, C.brown);
      // pre-dawn window on the left wall
      onLeft(ctx, 6.3, 1.9, 4.4, 2.8, C.white);
      onLeft(ctx, 6.5, 2.05, 4.0, 2.5, C.night, { dots: C.purple, density: 0.35 });
      onLeft(ctx, 6.5, 2.05, 4.0, 0.6, shade(C.pink, 0.2), { stroke: false, dots: C.purple, density: 0.3 });
      if (Q.detail) {
        for (const [y, z] of [[7.1, 4.2], [8.3, 3.8], [9.6, 4.3], [10.1, 3.6], [7.7, 3.4]]) {
          const [X, Y] = P(0, y, z);
          ctx.fillStyle = C.butter;
          ctx.beginPath(); ctx.arc(X, Y, 0.05, 0, Math.PI * 2); ctx.fill();
        }
        // moon
        const [mx, my] = P(0, 9.4, 4.0);
        ctx.beginPath(); ctx.arc(mx, my, 0.3, 0, Math.PI * 2); ctx.fillStyle = C.butter; ctx.fill();
        ctx.beginPath(); ctx.arc(mx - 0.12, my - 0.05, 0.26, 0, Math.PI * 2); ctx.fillStyle = C.night; ctx.fill();
        // rooftops
        for (let i = 0; i < 4; i++) onLeft(ctx, 6.6 + i * 1.0, 2.05, 0.8, 0.3 + (i % 2) * 0.35, C.ink, { stroke: false });
      }
      face(ctx, [[0, 8.5, 2.05], [0, 8.5, 4.55]], null, { stroke: C.white, lw: 0.1 });
      // street door
      onLeft(ctx, 12.1, 0, 2.3, 3.5, C.ink);
      onLeft(ctx, 12.25, 0, 2.0, 3.35, C.teal, { dots: shade(C.teal, 0.4), density: 0.2 });
      onLeft(ctx, 12.55, 1.3, 1.4, 1.7, C.night, { dots: C.purple, density: 0.3 });
      paintText(ctx, 'left', 13.25, 2.55, 'OPEN', 0.34, C.butter);
      paintText(ctx, 'left', 13.25, 2.1, '5AM', 0.3, C.pink);
      // framed bread posters
      onLeft(ctx, 5.6, 5.0, 0.2, 0.2, null, { stroke: false });
    });

    // Wall clock stuck at a quarter past five, but the second hand tries hard.
    R.decor((ctx, t) => {
      const y0 = 0;
      const [X, Y] = P(8.2, y0, 4.6);
      ctx.save();
      ctx.translate(X, Y);
      ctx.transform(1, 0.5, 0, 1, 0, 0);
      ctx.beginPath(); ctx.arc(0, 0, 0.62, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.08 });
      ctx.strokeStyle = C.ink; ctx.lineCap = 'round';
      const hA = ((5 + 12 / 60) / 12) * Math.PI * 2, mA = ((12 + t / 60) / 60) * Math.PI * 2, sA = Math.floor(t) / 60 * Math.PI * 2;
      ctx.lineWidth = 0.09; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(hA) * 0.3, -Math.cos(hA) * 0.3); ctx.stroke();
      ctx.lineWidth = 0.06; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(mA) * 0.5, -Math.cos(mA) * 0.5); ctx.stroke();
      ctx.strokeStyle = C.coral; ctx.lineWidth = 0.03; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(sA) * 0.52, -Math.cos(sA) * 0.52); ctx.stroke();
      ctx.restore();
    }, { anim: true });

    // Mouse hole
    R.decor((ctx) => {
      ctx.beginPath();
      const [a0, a1] = [P(15.3, 0, 0), P(15.8, 0, 0)];
      ctx.moveTo(a0[0], a0[1]);
      ctx.lineTo(a0[0], a0[1] - 0.25);
      ctx.quadraticCurveTo((a0[0] + a1[0]) / 2, (a0[1] + a1[1]) / 2 - 0.65, a1[0], a1[1] - 0.25);
      ctx.lineTo(a1[0], a1[1]);
      ctx.closePath();
      paint(ctx, C.ink);
    });

    // ---------- the brick oven ----------
    R.thing(OX1, OY1, (ctx) => {
      box(ctx, 0.2, OY0, 0, OX1 - 0.2, OY1 - OY0, OH, C.red, { top: shade(C.red, 0.05), right: C.coral, left: shade(C.red, 0.1), dotsL: shade(C.red, 0.5) });
      bricks(ctx, 'x', OX1, OY0, OY1, 0, OH, alpha(C.blush, 0.8));
      bricks(ctx, 'y', OY1, 0.2, OX1, 0, OH, alpha(C.blush, 0.6));
      // domed cap
      box(ctx, 0.5, OY0 + 0.3, OH, OX1 - 0.8, OY1 - OY0 - 0.6, 0.4, C.coral, { top: C.coralLight });
      // chimney
      box(ctx, 1.0, 1.0, OH + 0.4, 1.1, 1.1, 8.4 - OH - 0.4, C.red, { right: C.coral });
      bricks(ctx, 'x', 2.1, 1.0, 2.1, OH + 0.4, 8.4, alpha(C.blush, 0.7));
      bricks(ctx, 'y', 2.1, 1.0, 2.1, OH + 0.4, 8.4, alpha(C.blush, 0.7));
      box(ctx, 0.9, 0.9, 8.4, 1.3, 1.3, 0.2, C.ink, { flat: true });
      // mouth surround
      const pts = [[OX1 + 0.01, MOUTH.y0 - 0.2, MOUTH.z0 - 0.2]];
      for (let i = 0; i <= 12; i++) {
        const a = Math.PI - (i / 12) * Math.PI;
        pts.push([OX1 + 0.01, (MOUTH.y0 + MOUTH.y1) / 2 + Math.cos(a) * ((MOUTH.y1 - MOUTH.y0) / 2 + 0.2), MOUTH.z1 + Math.sin(a) * (MOUTH.arch + 0.2)]);
      }
      pts.push([OX1 + 0.01, MOUTH.y1 + 0.2, MOUTH.z0 - 0.2]);
      face(ctx, pts, C.greyLight, { dots: C.grey, density: 0.3 });
      // ledge
      box(ctx, OX1, MOUTH.y0 - 0.3, MOUTH.z0 - 0.25, 0.4, MOUTH.y1 - MOUTH.y0 + 0.6, 0.15, C.grey);
      // oven sign
      label(ctx, OX1, 3.0, 3.0, 'OLD BERTHA', 0.34, C.butter);
      // wood pile
      for (let i = 0; i < 6; i++) {
        const [X, Y] = P(OX1 + 0.5 + (i % 3) * 0.3, 4.6, 0.12 + Math.floor(i / 3) * 0.22);
        ctx.beginPath(); ctx.arc(X, Y, 0.13, 0, Math.PI * 2); paint(ctx, C.wood, { lw: 0.03 });
        ctx.beginPath(); ctx.arc(X, Y, 0.05, 0, Math.PI * 2); ctx.fillStyle = C.brown; ctx.fill();
      }
    });
    // glowing mouth, pulsing
    R.thing(OX1 + 0.02, OY1, (ctx, t) => {
      const g = 0.5 + 0.5 * Math.sin(t * 2.2) * Math.sin(t * 0.7 + 1);
      const pts = [[OX1 + 0.02, MOUTH.y0, MOUTH.z0]];
      for (let i = 0; i <= 12; i++) {
        const a = Math.PI - (i / 12) * Math.PI;
        pts.push([OX1 + 0.02, (MOUTH.y0 + MOUTH.y1) / 2 + Math.cos(a) * ((MOUTH.y1 - MOUTH.y0) / 2), MOUTH.z1 + Math.sin(a) * MOUTH.arch]);
      }
      pts.push([OX1 + 0.02, MOUTH.y1, MOUTH.z0]);
      face(ctx, pts, C.brown, { lw: 0.06 });
      ctx.save();
      poly(ctx, pts);
      ctx.clip();
      face(ctx, pts, alpha(C.mustard, 0.55 + g * 0.35), { stroke: false, dots: C.coral, density: 0.35 + g * 0.2 });
      // loaves inside and licking flames
      for (let i = 0; i < 3; i++) {
        const [X, Y] = P(OX1, MOUTH.y0 + 0.4 + i * 0.6, MOUTH.z0 + 0.15);
        ctx.save(); ctx.translate(X, Y); loaf(ctx, 0, 0.7); ctx.restore();
      }
      if (Q.detail) {
        for (let i = 0; i < 6; i++) {
          const y = MOUTH.y0 + 0.2 + i * 0.32;
          const h = 0.35 + 0.25 * Math.abs(Math.sin(t * 6 + i * 1.7));
          const [X, Y] = P(OX1, y, MOUTH.z1 + 0.2);
          ctx.beginPath();
          ctx.moveTo(X - 0.12, Y); ctx.quadraticCurveTo(X - 0.1, Y - h, X, Y - h - 0.12); ctx.quadraticCurveTo(X + 0.1, Y - h, X + 0.12, Y);
          ctx.closePath();
          ctx.fillStyle = i % 2 ? C.coral : C.butter;
          ctx.fill();
        }
      }
      ctx.restore();
    }, { anim: true, depth: OX1 + OY1 + 0.01 });
    // warm light on the floor in front of the oven
    R.rug((ctx, t) => {
      if (!Q.detail) return;
      const g = 0.5 + 0.5 * Math.sin(t * 2.2) * Math.sin(t * 0.7 + 1);
      const [X, Y] = P(OX1 + 1.4, 2.9, 0);
      const gr = ctx.createRadialGradient(X, Y, 0.2, X, Y, 3.2);
      gr.addColorStop(0, alpha(C.mustard, 0.35 + g * 0.15));
      gr.addColorStop(1, alpha(C.mustard, 0));
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.ellipse(X, Y, 3.2, 1.6, 0, 0, Math.PI * 2); ctx.fill();
    }, { anim: true });
    // chimney smoke
    R.air((ctx, t) => {
      if (!Q.detail) return;
      particles(t, 9, 4.5, (k, r) => {
        const [X, Y] = P(1.55 + k * 1.2 + Math.sin(k * 5 + r() * 6) * 0.3, 1.55 - k * 0.5, 8.7 + k * 2.2);
        ctx.beginPath(); ctx.arc(X, Y, 0.2 + k * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = alpha(C.greyLight, 0.85 * (1 - k)); ctx.fill();
        ctx.strokeStyle = alpha(C.grey, 0.6 * (1 - k)); ctx.lineWidth = 0.03; ctx.stroke();
      }, 11);
    });

    // ---------- the oven baker and the peel ----------
    const PEEL = 8;
    const BK = [8.0, 2.7];
    // bread cart the loaves land on (the pile grows through the shift)
    R.thing(11.4, 3.5, (ctx, t) => {
      for (const [x, y] of [[9.8, 2.4], [11.2, 2.4], [9.8, 3.3], [11.2, 3.3]]) cylinder(ctx, x, y, 0, 0.1, 0.15, C.ink, { flat: true });
      box(ctx, 9.6, 2.2, 0.15, 1.8, 1.3, 0.1, C.grey, { flat: true });
      box(ctx, 9.6, 2.2, 0.95, 1.8, 1.3, 0.08, C.greyLight);
      for (const [x, y] of [[9.65, 3.42], [11.3, 3.42], [11.3, 2.25]]) box(ctx, x, y, 0.15, 0.06, 0.06, 0.85, C.grey, { flat: true, stroke: false });
      const n = 2 + (Math.floor(t / PEEL) % 7);
      for (let i = 0; i < n; i++) {
        const [X, Y] = P(9.95 + (i % 3) * 0.5, 2.5 + Math.floor(i / 3) * 0.4, 1.03);
        ctx.save(); ctx.translate(X, Y); loaf(ctx, 0, 0.8); ctx.restore();
      }
    }, { anim: true });
    R.mover(() => ({ x: BK[0], y: BK[1] }), (ctx, t) => {
      const s = pulse(t, PEEL) * PEEL;
      // reach: 0 = peel pulled back, 1 = deep in the oven
      let reach, carry;
      if (s < 2) { reach = ease(s / 2); carry = false; }
      else if (s < 3) { reach = 1; carry = s > 2.6; }
      else if (s < 5) { reach = 1 - ease((s - 3) / 2); carry = true; }
      else if (s < 6) { reach = 0; carry = s < 5.5; }
      else { reach = 0; carry = false; }
      const turn = s >= 5 && s < 6;
      person(ctx, BK[0] - reach * 0.6, BK[1] + reach * 0.2, 0, {
        skin: SKIN[2], hair: C.ink, style: 'short', top: C.white, bottom: C.navy, hat: 'chef', pose: 'stand',
        dir: turn ? 'r' : 'l', arms: turn ? [1.0, 0.8] : [1.35, 1.2],
      }, t);
      // the long peel
      const [HX, HY] = P(BK[0] - reach * 0.6, BK[1] + reach * 0.2, 1.3);
      const tip = turn ? P(10.1, 2.9, 1.15) : P(OX1 + 0.4 - reach * 2.2, 2.9, MOUTH.z0 + 0.1);
      ctx.beginPath(); ctx.moveTo(HX + (turn ? 0.3 : -0.3), HY); ctx.lineTo(tip[0], tip[1]);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.12; ctx.lineCap = 'round'; ctx.stroke();
      ctx.strokeStyle = C.woodLight; ctx.lineWidth = 0.07; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(tip[0], tip[1], 0.42, 0.2, 0, 0, Math.PI * 2);
      paint(ctx, C.woodLight, { lw: 0.04 });
      if (carry) { ctx.save(); ctx.translate(tip[0], tip[1]); loaf(ctx, 0, 0.9); ctx.restore(); }
      if (Q.detail && carry && !turn && reach < 0.8) {
        // steam off the hot loaf
        for (let i = 0; i < 2; i++) {
          const k = (t * 0.9 + i * 0.5) % 1;
          ctx.beginPath(); ctx.arc(tip[0] + Math.sin(k * 6 + i) * 0.1, tip[1] - 0.3 - k * 0.8, 0.08 + k * 0.1, 0, Math.PI * 2);
          ctx.fillStyle = alpha(C.white, 0.8 * (1 - k)); ctx.fill();
        }
      }
      if (Q.detail && s > 5 && s < 6.4) speech(ctx, BK[0], BK[1], 3.3, 'NUMBER ' + (212 + Math.floor(t / PEEL)) + '!', { size: 0.36 });
    }, { bias: 0.2 });

    // ---------- cooling racks along the right wall ----------
    for (const [x0, seed] of [[9.0, 3], [12.2, 4]]) {
      R.thing(x0 + 1.5, 1.3, (ctx) => {
        const w = 3.0, r = rng(seed);
        for (const x of [x0, x0 + w - 0.08]) for (const y of [0.25, 1.15]) box(ctx, x, y, 0, 0.08, 0.08, 4.3, C.grey, { flat: true, stroke: false });
        for (let i = 0; i < 5; i++) {
          const z = 0.5 + i * 0.9;
          box(ctx, x0, 0.25, z, w, 0.98, 0.04, C.greyLight, { flat: true, lw: 0.03 });
          if (Q.detail) for (let k = 1; k < 8; k++) face(ctx, [[x0 + k * (w / 8), 0.25, z + 0.04], [x0 + k * (w / 8), 1.23, z + 0.04]], null, { lw: 0.015, stroke: C.grey });
          // loaves
          const kind = i === 2 ? 1 : i === 4 ? 2 : r() < 0.5 ? 0 : 2;
          const step = kind === 1 ? 0.55 : kind === 2 ? 0.38 : 0.72;
          for (let x = x0 + 0.4, n = 0; x < x0 + w - 0.2; x += step, n++) {
            const [X, Y] = P(x, 0.8, z + 0.05);
            ctx.save(); ctx.translate(X, Y); if (kind === 1) ctx.rotate(-0.46);
            // one of the baguettes on the far rack is the rolling pin (a hard find)
            if (x0 === PIN[0] && i === PIN[1] && n === PIN[2]) rollingPin(ctx, 0.8);
            else loaf(ctx, kind, kind === 1 ? 0.8 : 1);
            ctx.restore();
          }
        }
      });
    }
    // steam curling off the fresh racks
    R.air((ctx, t) => {
      if (!Q.detail) return;
      particles(t, 8, 3, (k, r) => {
        const x = 9.3 + r() * 5.6, z = 0.6 + Math.floor(r() * 4) * 0.9;
        const [X, Y] = P(x + Math.sin(k * 4 + x) * 0.2, 1.1, z + 0.3 + k * 1.0);
        ctx.beginPath(); ctx.moveTo(X, Y); ctx.quadraticCurveTo(X + 0.12, Y - 0.2, X, Y - 0.35);
        ctx.strokeStyle = alpha(C.white, 0.9 * (1 - k)); ctx.lineWidth = 0.05; ctx.lineCap = 'round'; ctx.stroke();
      }, 21);
    });

    // ---------- the mouse ----------
    const mouseT = track([[15.55, 0.2], [15.3, 1.55], [13.2, 1.7], [11.2, 1.75], [10.0, 1.8, 2.5], [11.8, 1.6], [15.3, 1.55], [15.55, 0.2, 3]], 1.4);
    const mouse = (t) => mouseT(pulse(t, mouseT.T) * mouseT.T);
    R.mover(mouse, (ctx, t, p) => {
      const [X, Y] = P(p.x, p.y, 0);
      const f = p.dir === 'l' ? -1 : 1;
      ctx.save();
      ctx.translate(X, Y);
      ctx.scale(f, 1);
      const bob = p.moving ? Math.abs(Math.sin(t * 20)) * 0.03 : 0;
      ctx.beginPath(); ctx.moveTo(-0.2, -0.08); ctx.quadraticCurveTo(-0.45, -0.02 + Math.sin(t * 8) * 0.06, -0.55, -0.18);
      ctx.strokeStyle = C.pink; ctx.lineWidth = 0.035; ctx.lineCap = 'round'; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, -0.12 - bob, 0.22, 0.13, 0, 0, Math.PI * 2);
      ctx.moveTo(0.3, -0.12 - bob); ctx.lineTo(0.12, -0.22 - bob); ctx.lineTo(0.14, -0.04 - bob);
      paint(ctx, C.grey, { lw: 0.035 });
      ctx.beginPath(); ctx.arc(0.1, -0.26 - bob, 0.07, 0, Math.PI * 2); paint(ctx, C.pink, { lw: 0.025 });
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0.2, -0.16 - bob, 0.022, 0, Math.PI * 2); ctx.arc(0.31, -0.12 - bob, 0.025, 0, Math.PI * 2); ctx.fill();
      // crumb on the way home
      if (p.dir === 'r' && p.x > 10.3) { ctx.fillStyle = C.wood; ctx.fillRect(0.28, -0.1 - bob, 0.1, 0.08); }
      ctx.restore();
    });
    R.find({ id: 'mouse', label: 'A mouse', r: 0.8, at: (t) => { const p = mouse(t); return [p.x, p.y, 0.15]; } });

    // ---------- kneading table and the flour clouds ----------
    const KN = 16; // shared beat with the cake
    const SNEEZE = 6.2;
    R.mover(() => ({ x: 7.6, y: 5.3 }), (ctx, t) => {
      const s = pulse(t, KN) * KN;
      const pre = s > SNEEZE - 1.2 && s < SNEEZE;
      const sneeze = s >= SNEEZE && s < SNEEZE + 0.8;
      const knead = Math.sin(t * 5);
      person(ctx, 7.6, 5.3, 0, {
        skin: SKIN[0], hair: C.mustard, style: 'bun', top: C.sky, bottom: C.navy, pose: 'stand', dir: 'l',
        arms: pre ? [Math.PI - 0.6, 0.4] : sneeze ? [0.6, -0.6] : [1.4 + knead * 0.3, -1.1 - knead * 0.3],
      }, t);
      if (!Q.detail) return;
      if (pre) label(ctx, 7.5, 5.3, 3.1, 'AAH...', 0.4, C.navy);
      if (sneeze) speech(ctx, 7.6, 5.3, 3.2, 'ACHOO!', { size: 0.5 });
    });
    R.thing(9.5, 7.9, (ctx, t) => {
      table(ctx);
      function table(ctx) {
        for (const [x, y] of [[6.0, 6.2], [9.2, 6.2], [6.0, 7.6], [9.2, 7.6]]) box(ctx, x, y, 0, 0.14, 0.14, 1.0, C.wood, { flat: true });
        box(ctx, 5.8, 6.0, 1.0, 3.6, 1.8, 0.15, C.woodLight, { top: tint(C.woodLight, 0.5), dotsT: C.white, densT: 0.35 });
        box(ctx, 6.0, 6.2, 0.2, 3.3, 1.5, 0.06, C.wood, { flat: true });
        // flour sacks under the table
        for (const x of [6.6, 7.7]) {
          const [X, Y] = P(x, 7.0, 0.26);
          ctx.beginPath(); ctx.roundRect(X - 0.35, Y - 0.6, 0.7, 0.6, 0.15); paint(ctx, C.paperDeep, { dots: C.wood, density: 0.25, lw: 0.03 });
        }
      }
      // the dough, squished by the kneading
      const knead = Math.sin(t * 5);
      const [X, Y] = P(7.5, 6.7, 1.15);
      ctx.beginPath(); ctx.ellipse(X, Y - 0.15, 0.55 + knead * 0.1, 0.25 - knead * 0.05, 0, 0, Math.PI * 2);
      paint(ctx, C.butter, { dots: C.white, density: 0.3, lw: 0.04 });
      // bowls and a scale
      cylinder(ctx, 9.0, 6.5, 1.15, 0.3, 0.3, C.teal, { top: C.white });
      const [SX, SY] = P(6.3, 6.5, 1.15);
      ctx.beginPath(); ctx.roundRect(SX - 0.3, SY - 0.3, 0.6, 0.3, 0.05); paint(ctx, C.coral, { lw: 0.03 });
      ctx.beginPath(); ctx.arc(SX, SY - 0.15, 0.1, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.02 });
    }, { anim: true });
    // Flour: small puffs on every knead, one huge cloud on the sneeze.
    R.air((ctx, t) => {
      if (!Q.detail) return;
      const [X, Y] = P(7.5, 6.7, 1.2);
      const k = pulse(t, 1.26);
      flourPuff(ctx, X, Y, k, 5, 0.5);
      const s = pulse(t, KN) * KN;
      if (s > SNEEZE && s < SNEEZE + 2.5) flourPuff(ctx, X - 0.5, Y - 0.6, (s - SNEEZE) / 2.5, 12, 1.8);
    });

    // ---------- the wedding cake and its nervous pastry chef ----------
    const wobble = (t) => {
      const s = pulse(t, KN) * KN;
      let a = 0;
      if (s > SNEEZE + 0.2 && s < SNEEZE + 5) { const q = s - SNEEZE - 0.2; a = Math.sin(q * 9) * 0.1 * Math.exp(-q * 0.8); }
      if (s > 3.6 && s < 4.6) a = Math.sin((s - 3.6) * 14) * 0.02;
      return a;
    };
    R.thing(CAKE[0] + 1.0, CAKE[1] + 1.0, (ctx) => {
      // trolley
      box(ctx, CAKE[0] - 0.9, CAKE[1] - 0.9, 0.2, 1.8, 1.8, 0.8, C.greyLight, { top: C.white });
      for (const [dx, dy] of [[-0.75, -0.75], [0.75, -0.75], [-0.75, 0.75], [0.75, 0.75]]) cylinder(ctx, CAKE[0] + dx, CAKE[1] + dy, 0, 0.12, 0.2, C.ink, { flat: true });
    });
    R.thing(CAKE[0] + 0.9, CAKE[1] + 0.9, (ctx, t) => {
      const a = wobble(t);
      const [BX, BY] = P(CAKE[0], CAKE[1], 1.0);
      ctx.save();
      ctx.translate(BX, BY);
      const tiers = [[0.8, 0.7, C.white], [0.66, 0.65, C.blush], [0.52, 0.6, C.white], [0.4, 0.55, C.blush], [0.28, 0.5, C.white]];
      let z = 0;
      tiers.forEach(([r, h, c], i) => {
        ctx.save();
        ctx.rotate(a * (i + 1) * 0.5);
        const rx = r * Math.SQRT2, ry = rx / 2;
        const yb = -z * ZK, yt = -(z + h) * ZK;
        ctx.beginPath();
        ctx.moveTo(-rx, yt); ctx.lineTo(-rx, yb); ctx.ellipse(0, yb, rx, ry, 0, Math.PI, 0, true); ctx.lineTo(rx, yt); ctx.closePath();
        paint(ctx, shade(c, 0.06), { dots: C.pink, density: 0.12 });
        ctx.beginPath(); ctx.ellipse(0, yt, rx, ry, 0, 0, Math.PI * 2); paint(ctx, c);
        if (Q.detail) {
          // piping dots and a ribbon
          ctx.fillStyle = C.white;
          for (let k = 0; k < 7; k++) {
            const aa = Math.PI * (k / 6);
            ctx.beginPath(); ctx.arc(-Math.cos(aa) * rx, yb + Math.sin(aa) * ry - 0.05, 0.05, 0, Math.PI * 2); ctx.fill();
          }
          ctx.strokeStyle = C.pink; ctx.lineWidth = 0.05;
          ctx.beginPath(); ctx.ellipse(0, (yb + yt) / 2, rx, ry, 0, 0, Math.PI); ctx.stroke();
        }
        ctx.restore();
        z += h;
      });
      // two sugar swans on top (a decoy), wobbling with the top tier
      ctx.rotate(a * 2.5);
      goose(ctx, -0.14, 0.14, z, 0, { pose: 'swim', dir: 'r', scale: 0.38 });
      goose(ctx, 0.14, -0.14, z, 0, { pose: 'swim', dir: 'l', scale: 0.38 });
      ctx.restore();
    }, { anim: true, depth: CAKE[0] + CAKE[1] + 2.05 });
    R.decoy({ id: 'swans', at: [CAKE[0], CAKE[1], 4.3], r: 0.7, say: ['Sugar swans. Hands off the cake.', 'Still sugar. Still swans.'] });
    // pastry chef on a step stool, the topper, the panic
    const PC = [15.35, 7.9];
    R.thing(PC[0] + 0.4, PC[1] + 0.4, (ctx) => {
      box(ctx, PC[0] - 0.4, PC[1] - 0.4, 0, 0.8, 0.8, 0.5, C.mustard);
      box(ctx, PC[0] - 0.4, PC[1] - 0.4, 0.5, 0.8, 0.4, 0.5, C.mustard);
    });
    R.mover(() => ({ x: PC[0], y: PC[1] }), (ctx, t) => {
      const s = pulse(t, KN) * KN;
      const a = wobble(t);
      const panic = s > SNEEZE + 0.2 && s < SNEEZE + 4;
      const reach = s < 3.6 ? ease(s / 3.6) : s < 12.5 ? 1 : 1 - ease((s - 12.5) / 1.5);
      const holding = s < 4.2 || s > 12.5;
      const arms = panic ? [Math.PI - 0.4 + Math.sin(t * 14) * 0.3, -Math.PI + 0.4 - Math.sin(t * 14) * 0.3] : [0.8 + reach * 1.4, 0.6 + reach * 1.1];
      person(ctx, PC[0], PC[1], 1.0, { skin: SKIN[5], hair: C.brown, style: 'curly', top: C.white, bottom: C.pink, hat: 'chef', pose: 'stand', dir: 'l', arms }, t);
      // cake top position (in screen space, with the wobble)
      const [BX, BY] = P(CAKE[0], CAKE[1], 1.0);
      const topH = 3.0 * ZK;
      const tx = BX + Math.sin(a * 2.5) * topH, ty = BY - Math.cos(a * 2.5) * topH;
      const [HX, HY] = P(PC[0], PC[1], 1.0);
      const hand = [HX - Math.sin(arms[0]) * 0.72 - 0.22, HY - 1.53 + Math.cos(arms[0]) * 0.72];
      const at = holding && !panic ? [hand[0] + (tx - hand[0]) * (s < 4.2 ? clamp((s - 3.2) / 1) : 0), hand[1] + (ty - hand[1]) * (s < 4.2 ? clamp((s - 3.2) / 1) : 0)] : [tx, ty];
      // two tiny figures under an arch
      ctx.save();
      ctx.translate(at[0], at[1]);
      ctx.rotate(a * 3);
      ctx.beginPath(); ctx.arc(0, -0.25, 0.28, Math.PI, 0); ctx.strokeStyle = C.mustard; ctx.lineWidth = 0.05; ctx.stroke();
      for (const [dx, c] of [[-0.1, C.ink], [0.1, C.white]]) {
        ctx.beginPath(); ctx.roundRect(dx - 0.06, -0.3, 0.12, 0.3, 0.04); paint(ctx, c, { lw: 0.02 });
        ctx.beginPath(); ctx.arc(dx, -0.37, 0.06, 0, Math.PI * 2); paint(ctx, C.blush, { lw: 0.02 });
      }
      ctx.restore();
      if (!Q.detail) return;
      // sweat drops
      if (panic || (s > 1.5 && s < 4.2)) {
        for (let i = 0; i < 2; i++) {
          const k = (t * 1.5 + i * 0.5) % 1;
          ctx.beginPath(); ctx.arc(HX - 0.35 - i * 0.1, HY - 2.3 + k * 0.5, 0.05, 0, Math.PI * 2);
          ctx.fillStyle = C.sky; ctx.fill();
        }
      }
      if (panic) speech(ctx, PC[0], PC[1], 4.0, 'NOBODY BREATHE', { size: 0.4 });
      else if (s > 10.5 && s < 12.3) speech(ctx, PC[0], PC[1], 4.0, 'PERFECT.', { size: 0.4 });
      else if (s > 12.8 && s < 15.5) speech(ctx, PC[0], PC[1], 4.0, 'ONE MORE TRY', { size: 0.38 });
    }, { bias: 0.3 });

    // ---------- sleepy apprentice on the flour sacks ----------
    R.thing(2.8, 8.9, (ctx) => {
      for (const [x, y, z] of [[0.8, 6.4, 0], [1.9, 6.5, 0], [0.8, 7.6, 0], [1.9, 7.7, 0], [1.3, 7.0, 0.7], [1.3, 8.4, 0]]) {
        const [X, Y] = P(x, y, z);
        ctx.beginPath();
        ctx.moveTo(X - 0.55, Y - 0.1); ctx.quadraticCurveTo(X - 0.62, Y - 0.6, X - 0.3, Y - 0.78);
        ctx.lineTo(X - 0.15, Y - 0.95); ctx.lineTo(X + 0.15, Y - 0.95); ctx.lineTo(X + 0.3, Y - 0.78);
        ctx.quadraticCurveTo(X + 0.62, Y - 0.6, X + 0.55, Y - 0.1); ctx.quadraticCurveTo(X, Y + 0.08, X - 0.55, Y - 0.1);
        paint(ctx, C.paperDeep, { dots: C.wood, density: 0.25, lw: 0.04 });
        if (Q.detail) { ctx.fillStyle = C.brown; ctx.fillRect(X - 0.18, Y - 0.82, 0.36, 0.05); label(ctx, x, y, z + 0.3, 'FLOUR', 0.2, C.red); }
      }
    });
    R.mover(() => ({ x: 2.2, y: 8.3 }), (ctx, t) => {
      person(ctx, 2.2, 8.2, 0.9, folk(301, { pose: 'sleep', dir: 'r', top: C.white, bottom: C.navy, hat: 'chef' }), t);
    }, { bias: 2.5 });
    R.poke({ id: 'apprentice', at: [2.2, 8.2, 1.4], r: 1.0, sound: 'tick', say: ['Five more minutes.', 'Zzz.', 'I am UP. I am up.'] });

    // A stack of trays being carried out, wobbling.
    const appr = track([[12.4, 2.3], [11.2, 4.4], [10.9, 8.9], [10.3, 9.3, 1.6], [10.9, 8.9], [11.2, 4.4], [12.4, 2.3, 1.2]], 1.1);
    R.mover((t) => appr(pulse(t, appr.T) * appr.T), (ctx, t, p) => {
      const load = p.y > 5.6 ? 0 : 1;
      person(ctx, p.x, p.y, 0, {
        ...folk(302, { top: C.teal, style: 'pony', hat: 'cap' }), pose: p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back,
        arms: [2.6, -2.6],
        hold: (c) => {
          for (let i = 0; i < 4; i++) {
            const sway = Math.sin(t * 3 + i * 0.4) * 0.04 * i;
            c.beginPath(); c.rect(-0.8 + sway, -1.0 - i * 0.25, 1.0, 0.08); paint(c, C.grey, { lw: 0.02 });
            for (let k = 0; k < 3; k++) { c.save(); c.translate(-0.6 + k * 0.33 + sway, -1.0 - i * 0.25); if (i < 2 + load * 2) bun(c, 0, 0, i % 2 ? C.wood : C.mustard); c.restore(); }
          }
        },
      }, t);
    });

    // ---------- the display counter ----------
    const cash = 6.6;
    const onCase = [];
    const r = rng(12);
    for (let x = DC_X0 + 0.5; x < DC_X1 - 0.3; x += 0.62) {
      if (Math.abs(x - cash) < 0.6) continue;
      const kind = Math.floor(r() * 3);
      onCase.push([x, (ctx) => {
        const [X, Y] = P(x, 10.5, 0.95);
        if (kind === 0) croissant(ctx, X, Y, 0.9);
        else if (kind === 1) { bun(ctx, X - 0.1, Y, C.wood); bun(ctx, X + 0.15, Y - 0.05, C.mustard); }
        else { ctx.save(); ctx.translate(X, Y); loaf(ctx, 2, 1); ctx.restore(); ctx.beginPath(); ctx.arc(X + 0.18, Y - 0.2, 0.06, 0, Math.PI * 2); ctx.fillStyle = C.red; ctx.fill(); }
      }]);
    }
    const register = (ctx) => {
      box(ctx, cash - 0.35, 10.2, 1.5, 0.7, 0.55, 0.35, C.teal);
      box(ctx, cash - 0.3, 10.25, 1.85, 0.6, 0.25, 0.25, C.ink, { flat: true });
      label(ctx, cash, 10.5, 2.05, '$', 0.2, C.mustard);
    };
    const bell = (ctx) => {
      const [X, Y] = P(9.2, 10.55, 1.5);
      ctx.beginPath(); ctx.arc(X, Y - 0.05, 0.15, Math.PI, 0); ctx.closePath(); paint(ctx, C.mustard, { lw: 0.03 });
      ctx.beginPath(); ctx.rect(X - 0.2, Y - 0.05, 0.4, 0.06); paint(ctx, C.ink, { lw: 0.02 });
    };
    const caseSeg = (x0, w) => (ctx) => {
      box(ctx, x0, DC_Y0, 0, w, DC_Y1 - DC_Y0, 0.9, C.mustard, { left: C.coral, dotsL: shade(C.coral, 0.4) });
      rect(ctx, x0 + 0.05, DC_Y0 + 0.05, w - 0.1, DC_Y1 - DC_Y0 - 0.1, 0.9, C.white, { stroke: false });
      for (const [x, draw] of onCase) if (x >= x0 && x < x0 + w) draw(ctx);
      // glass front and top
      face(ctx, [[x0, DC_Y1, 0.9], [x0 + w, DC_Y1, 0.9], [x0 + w, DC_Y1 - 0.2, 1.5], [x0, DC_Y1 - 0.2, 1.5]], alpha(C.sky, 0.28), { lw: 0.03 });
      face(ctx, [[x0, DC_Y0, 1.5], [x0 + w, DC_Y0, 1.5], [x0 + w, DC_Y1 - 0.2, 1.5], [x0, DC_Y1 - 0.2, 1.5]], alpha(C.sky, 0.2), { lw: 0.03 });
      if (Q.detail) face(ctx, [[x0 + 0.2, DC_Y1 - 0.05, 1.1], [x0 + 0.5, DC_Y1 - 0.12, 1.35]], null, { stroke: alpha(C.white, 0.9), lw: 0.05 });
      if (cash >= x0 && cash < x0 + w) register(ctx);
      if (9.2 >= x0 && 9.2 < x0 + w) bell(ctx);
    };
    const cuts = [DC_X0, 5.1, 6.1, 7.6, 9.1, 10.6, 12.1, DC_X1];
    for (let i = 0; i < cuts.length - 1; i++) {
      const x = cuts[i], w = cuts[i + 1] - x;
      R.thing(x + w / 2, DC_Y1 + 0.1, caseSeg(x, w));
    }
    // NOW SERVING sign hanging over the till
    R.air((ctx, t) => {
      const n = 40 + (Math.floor(t / QT) % 60);
      const x0 = 5.4, x1 = 8.0, y = 10.3, z0 = 3.6, z1 = 4.6;
      for (const x of [x0 + 0.2, x1 - 0.2]) face(ctx, [[x, y, z1], [x, y, 6.2]], null, { lw: 0.03 });
      face(ctx, [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], C.ink, { lw: 0.05 });
      ctx.save(); ctx.translate(-y - 0.01, (y + 0.01) / 2);
      paintText(ctx, 'right', (x0 + x1) / 2, z1 - 0.25, 'NOW SERVING', 0.26, C.white);
      const flash = pulse(t, QT) < 0.12;
      paintText(ctx, 'right', (x0 + x1) / 2, z0 + 0.35, String(n), 0.55, flash ? C.butter : C.coral);
      ctx.restore();
      if (flash && Q.detail) label(ctx, 9.4, 10.6, 2.2, 'DING!', 0.34, C.coral);
    });
    // cashier
    R.mover(() => ({ x: cash + 0.2, y: 9.3 }), (ctx, t) => {
      const f = pulse(t, QT);
      const hand = f > 0.55 && f < 0.8;
      person(ctx, cash + 0.2, 9.3, 0, {
        skin: SKIN[4], hair: C.ink, style: 'curly', top: C.pink, bottom: C.navy, pose: hand ? 'carry' : f < 0.12 ? 'point' : 'stand', dir: 'l',
        hold: hand ? (c) => { c.beginPath(); c.rect(-0.1, -0.1, 0.4, 0.5); paint(c, C.paperDeep, { lw: 0.03 }); } : null,
      }, t);
      if (Q.detail && f < 0.15) speech(ctx, cash + 0.2, 9.3, 2.7, 'NEXT!', { size: 0.4, dx: 1.5 });
    });

    // ---------- the queue ----------
    const slots = [[6.4, 12.0], [5.3, 12.6], [4.2, 13.2], [3.1, 13.8]];
    const away = track([[6.4, 12.0], [5.0, 11.55], [1.4, 11.8], [-0.6, 12.6, 3.5], [-0.6, 14.0], [1.4, 14.8], [3.1, 13.8]], 1.3);
    const gooseAway = track([[6.4, 12.0], [7.4, 13.3], [10.7, 13.9, 3.5], [8.4, 15.3], [5.2, 15.2], [3.1, 13.8]], 1.0);
    const NQ = 6;
    const slotOf = (st) => (st === 0 ? 0 : st === 3 ? 3 : st === 4 ? 2 : 1);
    const queuePos = (i, goose) => (t) => {
      const u = t / QT + i;
      const st = ((Math.floor(u) % NQ) + NQ) % NQ;
      const f = u - Math.floor(u);
      if (st === 1 || st === 2) {
        const tr = goose ? gooseAway : away;
        const p = tr(((st - 1 + f) / 2) * tr.T);
        return { ...p, bag: true, hidden: !goose && p.x < -0.3, fade: goose ? 1 : clamp((p.x + 0.3) / 0.8) };
      }
      const cur = slots[slotOf(st)];
      const prevSt = (st + NQ - 1) % NQ;
      const prev = prevSt === 2 ? cur : slots[slotOf(prevSt)];
      const k = clamp(f / 0.15);
      return { x: prev[0] + (cur[0] - prev[0]) * k, y: prev[1] + (cur[1] - prev[1]) * k, dir: 'r', back: false, moving: k < 1 && prev !== cur, front: st === 0, f, bag: st === 0 && f > 0.7, fade: 1 };
    };
    const qStyles = [
      folk(311, { top: C.navy, hat: 'beanie' }), folk(312, { top: C.green, style: 'long' }), folk(313, { top: C.purple, style: 'bald' }),
      folk(314, { top: C.coral, hat: 'cap', scale: 0.72 }), folk(315, { top: C.teal, style: 'bun' }),
    ];
    const lines = ['TWO BAGELS', 'ONE OF EVERYTHING', 'CROISSANT PLEASE', 'IS IT READY?', 'BREADCRUMBS. FOR A FRIEND.'];
    // Gary, in a goose costume (a decoy), queueing just ahead of the real one.
    const COSTUME = 4;
    R.decoy({ id: 'gary', at: (t) => { const p = queuePos(5, false)(t); return [p.x, p.y, 1.7]; }, r: 1.0, say: ['Just Gary, in a goose suit.', 'Gary. Still Gary.', 'Honk, says Gary. Unconvincingly.'] });
    for (let i = 0; i < NQ; i++) {
      if (i === 3) continue; // the goose takes this spot
      const qi = i < 3 ? i : i - 1;
      const pos = queuePos(i, false);
      R.mover(pos, (ctx, t, p) => {
        if (p.hidden) return;
        ctx.save();
        ctx.globalAlpha = p.fade;
        const yawn = !p.moving && !p.front && pulse(t, 9, i * 2) < 0.2;
        const suit = qi === COSTUME;
        person(ctx, p.x, p.y, 0, {
          ...qStyles[qi], ...(suit ? { top: C.white, bottom: C.white, hat: null, style: 'bald' } : {}),
          dir: p.dir, back: p.back, pose: p.moving ? 'walk' : yawn ? 'cheer' : 'stand', speed: yawn ? 1 : 7,
          hold: p.bag ? (c) => { c.beginPath(); c.rect(-0.1, -0.05, 0.38, 0.5); paint(c, C.paperDeep, { lw: 0.03 }); c.beginPath(); c.roundRect(0.0, -0.25, 0.1, 0.3, 0.05); paint(c, C.mustard, { lw: 0.02 }); } : null,
        }, t);
        if (suit) costumeHead(ctx, p.x, p.y, p.dir, p.back);
        ctx.restore();
        if (!Q.detail) return;
        if (p.front && p.f > 0.2 && p.f < 0.55) speech(ctx, p.x, p.y, 2.9, lines[qi], { size: 0.36 });
        if (yawn) label(ctx, p.x + 0.3, p.y - 0.3, 2.9, 'YAWN', 0.28, C.navy);
      });
    }
    // The goose, in the queue like everyone else. It gets a croissant, eats it by the window table, gets back in line.
    const gq = queuePos(3, true);
    R.goose((t) => {
      const p = gq(t);
      return { x: p.x, y: p.y, z: 0, dir: p.dir, pose: p.moving ? 'walk' : p.front && p.f > 0.12 && p.f < 0.35 ? 'honk' : p.bag && !p.moving ? 'peck' : 'stand', moving: p.moving };
    }, { bias: 0.05, kind: 'hard', hint: "It has a ticket and it's waiting its turn like everybody else. Not everything white in here is a goose." });
    R.mover(gq, (ctx, t, p) => {
      if (!Q.detail) return;
      // a paper ticket on a string round its neck, and the croissant once served
      const [X, Y] = P(p.x, p.y, 0);
      const f = p.dir === 'l' ? -1 : 1;
      if (!p.bag) {
        // (low on its chest: up by the beak the red number read as a gull's spot)
        ctx.beginPath(); ctx.rect(X + f * 0.2 - 0.12, Y - 0.56, 0.24, 0.18); paint(ctx, C.white, { lw: 0.025 });
        const k = Math.floor(t / QT), st = (k + 3) % NQ;
        label(ctx, p.x + f * 0.1, p.y - f * 0.1, 0.43, String(40 + ((k + (NQ - st) % NQ) % 60)), 0.12, C.red);
      } else if (p.moving) {
        croissant(ctx, X + f * 0.55, Y - 0.95, 0.55);
      }
      if (p.front && p.f > 0.12 && p.f < 0.35) speech(ctx, p.x, p.y, 1.9, 'HONK', { size: 0.34 });
    }, { bias: 0.06 });

    // The happy couple, here at 5am to check on their cake.
    for (const [x, y, bride] of [[13.4, 12.5, true], [14.4, 11.9, false]]) {
      R.mover(() => ({ x, y }), (ctx, t) => {
        const s = pulse(t, KN) * KN;
        const panic = s > SNEEZE + 0.2 && s < SNEEZE + 3.5;
        const st = bride
          ? { skin: SKIN[1], hair: C.brown, style: 'long', top: C.white, dress: true, shoes: C.white }
          : { skin: SKIN[3], hair: C.ink, style: 'short', top: C.navy, bottom: C.navy };
        person(ctx, x, y, 0, { ...st, pose: panic ? 'jump' : bride ? 'point' : 'stand', dir: 'r', speed: 9, arms: panic ? undefined : bride ? undefined : [2.6, 0.2] }, t);
        if (!Q.detail) return;
        if (bride && !panic && s > 1 && s < 4) speech(ctx, x, y, 2.9, 'IS THAT OURS?', { size: 0.36 });
        if (!bride && panic) speech(ctx, x, y, 2.9, 'OUR CAKE!', { size: 0.38 });
        if (!bride && s > 11 && s < 13) speech(ctx, x, y, 2.9, 'CAN WE EAT IT NOW', { size: 0.34 });
        if (bride) {
          // veil
          const [X, Y] = P(x, y, 0);
          ctx.beginPath(); ctx.moveTo(X - 0.1, Y - 2.35); ctx.quadraticCurveTo(X - 0.7, Y - 1.8, X - 0.55, Y - 1.0); ctx.lineTo(X - 0.2, Y - 1.3); ctx.closePath();
          paint(ctx, alpha(C.white, 0.8), { lw: 0.025 });
        }
      });
    }

    // ---------- cafe corner ----------
    const cafe = (x, y) => (ctx) => {
      box(ctx, x - 0.05, y - 0.05, 0, 0.1, 0.1, 1.1, C.ink, { flat: true, stroke: false });
      disc(ctx, x, y, 0.02, 0.35, C.ink, { stroke: false });
      cylinder(ctx, x, y, 1.05, 0.6, 0.08, C.white, { top: C.white });
    };
    R.thing(9.9, 14.9, cafe(9.9, 14.9));
    R.thing(12.8, 13.0, cafe(12.8, 13.0));
    R.thing(13.8, 14.2, (ctx) => { box(ctx, 13.4, 13.8, 0, 0.8, 0.8, 0.8, C.teal, { flat: true }); box(ctx, 13.4, 13.8, 0.8, 0.12, 0.8, 0.8, C.teal); });
    // newspaper reader dunking a croissant into coffee
    R.mover(() => ({ x: 13.7, y: 14.2 }), (ctx, t) => {
      const dunk = pulse(t, 5) > 0.6;
      person(ctx, 13.75, 14.2, 0.02, folk(321, { pose: 'sit', dir: 'l', top: C.brown, style: 'bald', hat: 'none', arms: dunk ? [1.7, 1.2] : [1.2, 1.2] }), t);
      cylinder(ctx, 12.6, 13.0, 1.13, 0.14, 0.22, C.coral, { top: C.brown });
      const [X, Y] = P(13.0, 13.4, 1.4);
      ctx.save(); ctx.translate(X, Y); ctx.rotate(-0.2);
      ctx.beginPath(); ctx.rect(-0.35, -0.5, 0.75, 0.55); paint(ctx, C.white, { dots: C.grey, density: 0.3, lw: 0.03 });
      if (Q.detail) { ctx.fillStyle = C.ink; ctx.fillRect(-0.28, -0.44, 0.6, 0.08); }
      ctx.restore();
      if (Q.detail && dunk) croissant(ctx, ...P(12.65, 12.95, 1.45), 0.4);
      if (Q.detail && pulse(t, 13) < 0.2) speech(ctx, 13.7, 14.2, 3.0, 'SHH, IT IS 5AM', { size: 0.34 });
    }, { bias: 0.4 });

    // ---------- lamps ----------
    R.air((ctx, t) => {
      for (const [x, y] of [[8.0, 7.0], [4.6, 10.6], [10.6, 10.6], [12.8, 13.0]]) {
        const [X, Y] = P(x, y, 5.0);
        const [X2, Y2] = P(x, y, 6.6);
        ctx.beginPath(); ctx.moveTo(X2, Y2 - 2); ctx.lineTo(X, Y);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.035; ctx.stroke();
        if (Q.detail) {
          ctx.beginPath(); ctx.arc(X, Y + 0.3, 1.0, 0, Math.PI * 2);
          ctx.fillStyle = alpha(C.butter, 0.2 + Math.sin(t * 2 + x) * 0.03); ctx.fill();
        }
        ctx.beginPath(); ctx.moveTo(X - 0.15, Y); ctx.lineTo(X + 0.15, Y); ctx.lineTo(X + 0.45, Y + 0.4); ctx.lineTo(X - 0.45, Y + 0.4); ctx.closePath();
        paint(ctx, C.teal, { lw: 0.04 });
        ctx.beginPath(); ctx.arc(X, Y + 0.42, 0.12, 0, Math.PI); ctx.fillStyle = C.butter; ctx.fill();
      }
    });

    // ---------- finds ----------
    // The rolling pin, lying with the baguettes on the far cooling rack (drawn by the rack).
    R.find({ id: 'rollingpin', label: 'A rolling pin', kind: 'hard', r: 0.6, at: [PIN[3], 0.8, 2.45], riddle: 'Lying low with the loaves.', hint: 'One of the baguettes on the cooling racks has handles.' });
    // A dropped croissant on the floor near the door.
    R.rug((ctx) => {
      croissant(ctx, ...P(2.2, 15.5, 0.02), 1.0);
      if (Q.detail) { ctx.fillStyle = C.mustard; for (const [dx, dy] of [[0.4, 0.1], [-0.35, 0.15], [0.2, 0.2]]) { const [X, Y] = P(2.2 + dx, 15.5 + dy, 0.01); ctx.fillRect(X, Y, 0.06, 0.05); } }
    });
    R.find({ id: 'croissant', label: 'A dropped croissant', at: [2.2, 15.5, 0.12], r: 0.7 });

    // A concrete porch goose in a baker's hat, the shop's mascot (a decoy).
    R.thing(PG[0] + 0.5, PG[1] + 0.5, (ctx) => {
      box(ctx, PG[0] - 0.45, PG[1] - 0.45, 0, 0.9, 0.9, 0.15, C.grey, { top: C.greyLight });
      goose(ctx, PG[0], PG[1], 0.15, 0, { pose: 'stand', dir: 'r' });
      // the hat
      const [X, Y] = P(PG[0], PG[1], 0.15);
      ctx.beginPath(); ctx.roundRect(X + 0.12, Y - 1.25, 0.24, 0.14, 0.03); paint(ctx, C.white, { lw: 0.03 });
      ctx.beginPath(); ctx.arc(X + 0.24, Y - 1.31, 0.15, Math.PI, 0); paint(ctx, C.white, { lw: 0.03 });
    });
    R.decoy({ id: 'porch', at: [PG[0], PG[1], 0.8], r: 0.8, say: ['A concrete goose. In a hat.', 'Still concrete.', 'It came with the shop.'] });

    // plants and a bread basket by the door
    R.thing(15.4, 10.6, (ctx, t) => plant(ctx, 15.4, 10.6, 0, t, { kind: 'leafy', scale: 1.4, potColor: C.teal }), { anim: true });
    R.thing(0.9, 15.3, (ctx, t) => plant(ctx, 0.9, 15.3, 0, t, { kind: 'bush', scale: 1.1, potColor: C.coral }), { anim: true });
    // The day-old bread basket: a tap and the loaves hop up, and under them
    // is ticket number one, the one they've been calling since the day it opened.
    const basket = R.poke({ id: 'basket', at: [1.3, 10.5, 1.2], r: 1.0 });
    R.thing(1.4, 10.6, (ctx) => {
      box(ctx, 0.5, 9.8, 0, 1.6, 1.4, 1.0, C.wood, { top: C.brown });
      const k = basket.k();
      if (k <= 0.3) {
        // the ticket's corner, poking out from under the loaves
        const [X, Y] = P(1.95, 10.95, 1.02);
        ctx.save(); ctx.translate(X, Y); ctx.rotate(-0.35);
        ctx.beginPath(); ctx.rect(-0.02, -0.08, 0.26, 0.17); paint(ctx, C.white, { lw: 0.025 });
        ctx.fillStyle = C.red; ctx.fillRect(0.12, -0.04, 0.05, 0.09);
        ctx.restore();
      }
      if (k > 0.3) {
        // the ticket, on the basket's bed
        const [X, Y] = P(1.3, 10.5, 1.01);
        ctx.save(); ctx.translate(X, Y); ctx.rotate(0.25);
        ctx.beginPath(); ctx.rect(-0.2, -0.13, 0.4, 0.26); paint(ctx, C.white, { lw: 0.025 });
        ctx.restore();
        label(ctx, 1.3, 10.5, 1.06, '1', 0.2, C.red);
      }
      for (let i = 0; i < 4; i++) {
        const side = i % 2 ? 1 : -1;
        const [X, Y] = P(1.0 + (i % 2) * 0.6 + side * 0.5 * k, 10.2 + Math.floor(i / 2) * 0.5 - side * 0.3 * k, 1.0 + Math.sin(k * Math.PI) * 0.7 + 0.1 * k);
        ctx.save(); ctx.translate(X, Y); ctx.rotate(-0.8 + side * 0.6 * k); loaf(ctx, 1, 0.8); ctx.restore();
      }
      label(ctx, 1.3, 11.2, 0.5, 'DAY OLD', 0.22, C.butter);
    }, { anim: true });
    R.find({ id: 'ticket', label: 'Ticket number one', kind: 'poke', inside: basket, at: [1.3, 10.5, 1.05], r: 0.6, hint: "NOW SERVING has been waiting years for number one. Try under yesterday's bread." });
  },
};
