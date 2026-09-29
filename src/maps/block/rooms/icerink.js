// Ice Rink: an outdoor winter rink with a slow resurfacing machine, a figure
// skater chasing a perfect score, a cocoa line that never ends and a snowman
// judge who is still missing his nose.
import {
  C, box, rect, disc, cylinder, face, poly, paint, person, folk, slab, floor,
  speech, shade, tint, alpha, Q, label, P, paintText, rng, hash, SKIN,
} from '../../../engine/art.js';
import { route, orbit, particles, pulse, clamp } from '../../../engine/actors.js';

const X0 = 4, X1 = 15, Y0 = 4.5, Y1 = 13; // rink boards
const CX = 9.5, CY = 8.75; // centre ice
const ICE = tint(C.sky, 0.55);
const BOARD_H = 0.7;

// ---------- little helpers ----------
// Text on a plane parallel to y = 0 at y = y0 ('right' orientation), or x = x0 ('left').
function textY(ctx, y0, u, v, text, size, color, font) {
  ctx.save(); ctx.translate(-y0, y0 / 2); paintText(ctx, 'right', u, v, text, size, color, font); ctx.restore();
}
function textX(ctx, x0, u, v, text, size, color, font) {
  ctx.save(); ctx.translate(x0, x0 / 2); paintText(ctx, 'left', u, v, text, size, color, font); ctx.restore();
}

// A polyline walker with pauses: returns f(time) and f.T (total duration).
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

// Snowy pine tree (billboard).
function pine(ctx, x, y, s = 1) {
  const [X, Y] = P(x, y, 0);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(s, s);
  if (Q.detail) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.2, 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = alpha(C.ink, 0.12);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.rect(-0.16, -0.9, 0.32, 0.9);
  paint(ctx, C.brown);
  for (let i = 0; i < 4; i++) {
    const w = 1.35 - i * 0.28, yb = -0.7 - i * 0.95, yt = yb - 1.6;
    ctx.beginPath();
    ctx.moveTo(-w, yb); ctx.lineTo(0, yt); ctx.lineTo(w, yb);
    ctx.quadraticCurveTo(0, yb + 0.25, -w, yb);
    paint(ctx, i % 2 ? C.green : shade(C.green, 0.12), { dots: shade(C.green, 0.5), density: 0.28 });
    // snow cap
    ctx.beginPath();
    const cw = w * 0.5, ch = 0.8;
    ctx.moveTo(-cw, yt + ch);
    ctx.lineTo(0, yt);
    ctx.lineTo(cw, yt + ch);
    ctx.quadraticCurveTo(cw * 0.5, yt + ch - 0.25, 0, yt + ch + 0.05);
    ctx.quadraticCurveTo(-cw * 0.5, yt + ch - 0.25, -cw, yt + ch);
    paint(ctx, C.white, { lw: 0.04 });
    // snow along the hem
    if (Q.detail) {
      ctx.beginPath();
      ctx.ellipse(-w * 0.55, yb - 0.05, w * 0.28, 0.1, 0.1, 0, Math.PI * 2);
      ctx.ellipse(w * 0.45, yb - 0.03, w * 0.22, 0.08, -0.1, 0, Math.PI * 2);
      ctx.fillStyle = C.white;
      ctx.fill();
    }
  }
  ctx.restore();
}

// A little snow mound.
function mound(ctx, x, y, r = 0.8) {
  const [X, Y] = P(x, y, 0);
  ctx.beginPath();
  ctx.ellipse(X, Y, r * 1.4, r * 0.55, 0, Math.PI, 0);
  ctx.closePath();
  paint(ctx, C.white, { dots: tint(C.sky, 0.1), density: 0.12, lw: 0.04 });
}

// Bench running along y, facing +x.
function bench(ctx, x, y, len, color = C.wood) {
  for (const ly of [y + 0.15, y + len - 0.3]) {
    box(ctx, x + 0.1, ly, 0, 0.12, 0.12, 0.7, C.ink, { flat: true, stroke: false });
    box(ctx, x + 0.6, ly, 0, 0.12, 0.12, 0.7, C.ink, { flat: true, stroke: false });
  }
  box(ctx, x - 0.05, y, 0.7, 0.15, len, 0.9, color);
  box(ctx, x, y, 0.7, 0.85, len, 0.12, color, { top: tint(color, 0.15) });
  // snow on the back rail
  if (Q.detail) box(ctx, x - 0.05, y + 0.2, 1.6, 0.15, len - 0.4, 0.06, C.white, { flat: true, lw: 0.03 });
}

// Snowman without a nose. card: text on a score card held up by a stick arm.
function snowman(ctx, x, y, t, card) {
  const [X, Y] = P(x, y, 0);
  ctx.save();
  ctx.translate(X, Y);
  if (Q.detail) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.9, 0.35, 0, 0, Math.PI * 2);
    ctx.fillStyle = alpha(C.ink, 0.14);
    ctx.fill();
  }
  // arms (sticks)
  ctx.strokeStyle = C.brown;
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.08;
  ctx.beginPath();
  ctx.moveTo(0.7, -1.68); ctx.lineTo(0.8, -1.95);
  const up = card ? 1 : 0;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0.4, -1.6); ctx.lineTo(0.95, -1.75);
  ctx.moveTo(-0.4, -1.6); ctx.lineTo(-0.9, -1.8 - up * 0.9);
  ctx.stroke();
  for (const [cy, r] of [[-0.6, 0.66], [-1.55, 0.5], [-2.3, 0.36]]) {
    ctx.beginPath();
    ctx.arc(0, cy, r, 0, Math.PI * 2);
    paint(ctx, C.white, { dots: tint(C.sky, 0.05), density: 0.14 });
  }
  // coal
  ctx.fillStyle = C.ink;
  for (const [bx, by, br] of [[0.05, -1.35, 0.06], [0.07, -1.65, 0.06], [0.08, -0.85, 0.06], [-0.08, -2.38, 0.045], [0.14, -2.38, 0.045],
    [-0.1, -2.13, 0.03], [0, -2.1, 0.03], [0.1, -2.1, 0.03], [0.2, -2.13, 0.03]]) {
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
  }
  // where the nose should be: a small sad dent
  ctx.beginPath(); ctx.arc(0.04, -2.26, 0.035, 0, Math.PI * 2);
  ctx.strokeStyle = C.grey; ctx.lineWidth = 0.02; ctx.stroke();
  // scarf
  ctx.beginPath();
  ctx.roundRect(-0.36, -2.0, 0.72, 0.16, 0.06);
  ctx.rect(-0.28, -1.95, 0.14, 0.55);
  paint(ctx, C.teal, { dots: C.white, density: 0.3, lw: 0.03 });
  // top hat
  ctx.beginPath();
  ctx.rect(-0.38, -2.62, 0.76, 0.08);
  ctx.rect(-0.24, -3.05, 0.48, 0.45);
  paint(ctx, C.ink);
  ctx.beginPath();
  ctx.rect(-0.24, -2.72, 0.48, 0.08);
  ctx.fillStyle = C.red;
  ctx.fill();
  ctx.restore();
  if (card) scoreCard(ctx, x - 0.55, y + 0.55, 2.95, card);
}

function scoreCard(ctx, x, y, z, text) {
  const [X, Y] = P(x, y, z);
  ctx.beginPath();
  ctx.roundRect(X - 0.42, Y - 0.3, 0.84, 0.6, 0.06);
  paint(ctx, C.white, { lw: 0.05 });
  label(ctx, x, y, z - 0.02, text, 0.42, C.ink);
}

// Hot cocoa mug (screen space, for person.hold).
function mug(ctx, t, steam = true) {
  ctx.beginPath();
  ctx.roundRect(-0.05, -0.2, 0.22, 0.24, 0.04);
  paint(ctx, C.white, { lw: 0.04 });
  ctx.beginPath();
  ctx.rect(-0.05, -0.12, 0.22, 0.06);
  ctx.fillStyle = C.coral;
  ctx.fill();
  if (steam && Q.detail) {
    ctx.strokeStyle = alpha(C.grey, 0.8);
    ctx.lineWidth = 0.035;
    ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      const k = (t * 0.8 + i * 0.5) % 1;
      ctx.beginPath();
      ctx.moveTo(0.03 + i * 0.08, -0.25 - k * 0.5);
      ctx.quadraticCurveTo(0.1 + i * 0.08 + Math.sin(t * 4 + i) * 0.06, -0.35 - k * 0.5, 0.03 + i * 0.08, -0.45 - k * 0.5);
      ctx.globalAlpha = 1 - k;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

function stick(swing = 0) {
  return (ctx) => {
    ctx.save();
    ctx.rotate(swing);
    ctx.beginPath();
    ctx.moveTo(-0.05, -0.1); ctx.lineTo(0.45, 1.15); ctx.lineTo(0.8, 1.15);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.13; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.strokeStyle = C.mustard; ctx.lineWidth = 0.07; ctx.stroke();
    ctx.restore();
  };
}

// ---------- the resurfacing machine ----------
const machine = route([[5.3, 5.85], [13.7, 5.85], [13.7, 11.6], [5.3, 11.6]], { speed: 0.5 });
function heading(t) {
  const a = machine(t), b = machine(t + 0.05);
  const dx = b.x - a.x, dy = b.y - a.y;
  const n = Math.hypot(dx, dy) || 1;
  return [dx / n, dy / n];
}

export default {
  id: 'icerink',
  name: 'Ice Rink',
  blurb: 'The snowman judge gives every spin a 1.0 until someone finds his nose. The cocoa line never shrinks, because everybody gets straight back in it.',

  build(R) {
    // ---------- ground and ice ----------
    R.floor((ctx) => {
      slab(ctx, C.greyLight);
      floor(ctx, C.white, { dots: tint(C.sky, 0.25), density: 0.1 });
      rect(ctx, X0, Y0, X1 - X0, Y1 - Y0, 0.01, ICE, { dots: tint(C.sky, 0.15), density: 0.14 });
      // practice patch at the front for the hockey kids
      rect(ctx, 6.6, 13.8, 7.2, 1.9, 0.01, ICE, { dots: tint(C.sky, 0.15), density: 0.14, lw: 0.04 });
      if (!Q.detail) return;
      // rink markings
      face(ctx, [[CX, Y0, 0.012], [CX, Y1, 0.012]], null, { stroke: alpha(C.red, 0.5), lw: 0.14 });
      for (const bx of [6.8, 12.2]) face(ctx, [[bx, Y0, 0.012], [bx, Y1, 0.012]], null, { stroke: alpha(C.navy, 0.35), lw: 0.12 });
      disc(ctx, CX, CY, 0.012, 1.7, null, { stroke: alpha(C.red, 0.45), lw: 0.07 });
      disc(ctx, CX, CY, 0.012, 0.15, alpha(C.red, 0.5), { stroke: false });
      // scratches and carved loops
      const r = rng(71);
      ctx.lineCap = 'round';
      for (let i = 0; i < 70; i++) {
        const cx = X0 + 0.5 + r() * (X1 - X0 - 1), cy = Y0 + 0.5 + r() * (Y1 - Y0 - 1);
        const rad = 0.6 + r() * 3.2, a0 = r() * Math.PI * 2, span = 0.4 + r() * 1.3;
        ctx.beginPath();
        for (let k = 0; k <= 10; k++) {
          const a = a0 + (span * k) / 10;
          const x = clamp(cx + Math.cos(a) * rad, X0 + 0.1, X1 - 0.1), y = clamp(cy + Math.sin(a) * rad * 0.8, Y0 + 0.1, Y1 - 0.1);
          const [X, Y] = P(x, y, 0.013);
          k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
        }
        ctx.strokeStyle = i % 3 ? alpha(C.white, 0.9) : alpha(C.navy, 0.18);
        ctx.lineWidth = i % 3 ? 0.05 : 0.025;
        ctx.stroke();
      }
      // a figure eight carved at centre ice
      ctx.beginPath();
      for (let k = 0; k <= 60; k++) {
        const a = (k / 60) * Math.PI * 2;
        const [X, Y] = P(CX + Math.sin(a) * 1.1, CY + Math.sin(2 * a) * 0.5, 0.013);
        k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      }
      ctx.strokeStyle = alpha(C.white, 0.95);
      ctx.lineWidth = 0.06;
      ctx.stroke();
      // footprints in the snow: people from the gate and the queue, and one set of goose feet
      ctx.fillStyle = alpha(C.sky, 0.55);
      for (let i = 0; i < 12; i++) {
        const [X, Y] = P(1 + i * 0.25, 14.8 - i * 0.18 + (i % 2) * 0.15, 0);
        ctx.beginPath(); ctx.ellipse(X, Y, 0.1, 0.05, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = alpha(C.coral, 0.45);
      ctx.lineWidth = 0.035;
      for (let i = 0; i < 6; i++) {
        const k = i / 5;
        const x = 2.8 + (4 - 2.8) * k + (i % 2) * 0.12, y = 12.3 + (10.5 - 12.3) * k;
        const [X, Y] = P(x, y, 0);
        ctx.beginPath();
        ctx.moveTo(X - 0.1, Y + 0.05); ctx.lineTo(X + 0.02, Y - 0.08); ctx.lineTo(X + 0.12, Y + 0.05);
        ctx.moveTo(X + 0.02, Y - 0.08); ctx.lineTo(X + 0.02, Y + 0.08);
        ctx.stroke();
      }
    });

    // Low plank fence with snow on top.
    R.walls({ h: 1.0, left: C.wood, right: C.wood, cap: C.white });
    R.wall((ctx) => {
      if (!Q.detail) return;
      for (let i = 0.8; i < 16; i += 0.8) {
        face(ctx, [[i, 0, 0], [i, 0, 1.0]], null, { lw: 0.025, stroke: shade(C.wood, 0.35) });
        face(ctx, [[0, i, 0], [0, i, 1.0]], null, { lw: 0.025, stroke: shade(C.wood, 0.35) });
      }
    });

    // Fresh, glossy ice left behind the machine.
    R.rug((ctx, t) => {
      if (!Q.detail) return;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const n = 26;
      for (let k = 0; k < n; k++) {
        const a = machine(t - k * 0.55), b = machine(t - (k + 1) * 0.55);
        if (Math.hypot(a.x - b.x, a.y - b.y) > 1) continue;
        const [ax, ay] = P(a.x, a.y, 0.015), [bx, by] = P(b.x, b.y, 0.015);
        ctx.beginPath();
        ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
        ctx.strokeStyle = alpha(C.sky, 0.75 * (1 - k / n));
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.strokeStyle = alpha(C.white, 0.9 * (1 - k / n));
        ctx.lineWidth = 0.25;
        ctx.stroke();
      }
      // a couple of glints on the wet stripe
      for (let k = 2; k < 12; k += 4) {
        const a = machine(t - k * 0.55);
        const [X, Y] = P(a.x, a.y, 0.02);
        const s = 0.12 + 0.08 * Math.sin(t * 5 + k);
        ctx.beginPath();
        ctx.moveTo(X - s * 2, Y); ctx.lineTo(X + s * 2, Y); ctx.moveTo(X, Y - s); ctx.lineTo(X, Y + s);
        ctx.strokeStyle = C.sky;
        ctx.lineWidth = 0.04;
        ctx.stroke();
      }
    }, { anim: true });

    // ---------- boards around the rink, split up so skaters sort correctly ----------
    const boardSeg = (x, y, w, d, text) => (ctx) => {
      box(ctx, x, y, 0, w, d, BOARD_H, C.white, { top: C.red, dotsL: tint(C.sky, 0.3), dens: 0.15 });
      if (!Q.detail) return;
      // yellow kick plate
      if (d < w) face(ctx, [[x, y + d, 0], [x + w, y + d, 0], [x + w, y + d, 0.14], [x, y + d, 0.14]], C.mustard, { lw: 0.03 });
      else face(ctx, [[x + w, y, 0], [x + w, y + d, 0], [x + w, y + d, 0.14], [x + w, y, 0.14]], C.mustard, { lw: 0.03 });
      if (text) {
        ctx.save();
        if (d < w) poly(ctx, [[x, y + d, 0.15], [x + w, y + d, 0.15], [x + w, y + d, BOARD_H], [x, y + d, BOARD_H]]);
        else poly(ctx, [[x + w, y, 0.15], [x + w, y + d, 0.15], [x + w, y + d, BOARD_H], [x + w, y, BOARD_H]]);
        ctx.clip();
        text(ctx);
        ctx.restore();
      }
    };
    const T = 0.2;
    // back side (y = Y0), inner face visible
    const backAds = (ctx) => {
      textY(ctx, Y0 + T / 2, 6.6, 0.43, 'SKATE NICE', 0.36, C.navy);
      textY(ctx, Y0 + T / 2, 10.2, 0.43, 'NO GEESE ON ICE', 0.34, C.red);
      textY(ctx, Y0 + T / 2, 13.5, 0.43, 'COCOA', 0.36, C.brown);
    };
    for (let x = X0; x < X1 - 0.01; x += 1) {
      R.thing(x + 0.5, Y0 + 0.1, boardSeg(x, Y0 - T / 2, 1, T, backAds));
    }
    // left side (x = X0), with an open gate at y 10 to 11
    const leftAds = (ctx) => {
      textX(ctx, X0 + T / 2, 6.9, 0.43, 'GLIDE', 0.36, C.teal);
      textX(ctx, X0 + T / 2, 8.9, 0.43, 'SLIDE', 0.36, C.coral);
    };
    for (let y = Y0; y < Y1 - 0.01; y += 1) {
      if (y >= 9.99 && y < 10.99) continue;
      R.thing(X0 + 0.1, y + 0.5, boardSeg(X0 - T / 2, y, T, 1, leftAds));
    }
    // the gate, swung open onto the snow
    R.thing(X0 - 0.5, 10.1, (ctx) => {
      face(ctx, [[X0, 10, 0], [X0 - 0.9, 10.3, 0], [X0 - 0.9, 10.3, BOARD_H], [X0, 10, BOARD_H]], C.white, { dots: tint(C.sky, 0.3), density: 0.15 });
      face(ctx, [[X0, 10, BOARD_H], [X0 - 0.9, 10.3, BOARD_H]], null, { stroke: C.red, lw: 0.1 });
    });
    // front side (y = Y1): outer face visible
    const frontAds = (ctx) => {
      textY(ctx, Y1 + T / 2 + 0.001, 5.9, 0.43, 'HOT COCOA', 0.34, C.brown);
      textY(ctx, Y1 + T / 2 + 0.001, 9.5, 0.43, 'FROSTY PARK', 0.36, C.navy);
      textY(ctx, Y1 + T / 2 + 0.001, 13.2, 0.43, 'MIND THE GAP', 0.3, C.teal);
    };
    for (let x = X0 - T / 2; x < X1 + T / 2 - 0.01; x += 1) {
      const w = Math.min(1, X1 + T / 2 - x);
      R.thing(x + w / 2, Y1 + 0.1, boardSeg(x, Y1 - T / 2, w, T, frontAds));
    }
    // right side (x = X1): outer face visible
    const rightAds = (ctx) => {
      textX(ctx, X1 + T / 2 + 0.001, 7.4, 0.43, 'SQUARES', 0.36, C.coral);
      textX(ctx, X1 + T / 2 + 0.001, 10.8, 0.43, 'WARM SOCKS', 0.3, C.purple);
    };
    for (let y = Y0 - T / 2; y < Y1 - T / 2 - 0.01; y += 1) {
      const d = Math.min(1, Y1 - T / 2 - y);
      R.thing(X1 + 0.1, y + d / 2, boardSeg(X1 - T / 2, y, T, d, rightAds));
    }

    // ---------- trees, mounds and the fence line ----------
    for (const [x, y, s] of [[1.3, 1.4, 1.35], [3.3, 0.9, 1.05], [0.9, 3.5, 1.0], [7.0, 0.3, 0.7], [13.4, 1.0, 1.2], [15.1, 2.3, 1.0], [15.3, 0.6, 0.8], [0.9, 15.0, 0.75]]) {
      R.thing(x, y, (ctx) => pine(ctx, x, y, s));
    }
    for (const [x, y, r] of [[2.3, 2.6, 0.7], [12.4, 2.8, 0.5], [0.8, 7.8, 0.5], [14.6, 14.6, 0.6], [4.8, 15.3, 0.5], [3.4, 4.2, 0.45]]) {
      R.thing(x, y, (ctx) => mound(ctx, x, y, r));
    }

    // Light poles at the rink corners with bulbs strung between them.
    const poles = [[3.7, 4.2], [15.3, 4.2], [15.3, 13.3], [3.7, 13.3]];
    const PZ = 4.3;
    // The pole lamps light up after dark.
    const day = R.opts.day;
    poles.forEach(([x, y]) => R.light({ at: [x, y, PZ], r: 3.4, color: C.butter, k: (t) => day.nightK(t) * 0.6 }));
    poles.forEach(([x, y], i) => {
      R.thing(x, y, (ctx) => {
        box(ctx, x - 0.08, y - 0.08, 0, 0.16, 0.16, PZ, C.navy, { flat: true });
        box(ctx, x - 0.2, y - 0.2, PZ, 0.4, 0.4, 0.2, C.ink, { flat: true });
        if (i === 0) {
          // PA speaker
          box(ctx, x + 0.08, y - 0.2, PZ - 1.0, 0.35, 0.4, 0.5, C.grey);
          disc(ctx, x + 0.25, y + 0.21, PZ - 0.75, 0.12, C.ink, { stroke: false });
        }
      });
    });
    R.air((ctx, t) => {
      if (!Q.detail) return;
      const cols = [C.mustard, C.coral, C.teal, C.pink, C.butter];
      for (let s = 0; s < 4; s++) {
        const [ax, ay] = poles[s], [bx, by] = poles[(s + 1) % 4];
        const n = 14, pts = [];
        for (let i = 0; i <= n; i++) {
          const k = i / n;
          pts.push([ax + (bx - ax) * k, ay + (by - ay) * k, PZ + 0.1 - Math.sin(k * Math.PI) * (0.9 + Math.sin(t * 1.2 + s) * 0.05)]);
        }
        ctx.beginPath();
        pts.forEach((p, i) => { const [X, Y] = P(...p); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 0.035;
        ctx.stroke();
        for (let i = 1; i < n; i++) {
          const [X, Y] = P(...pts[i]);
          const on = (Math.floor(t * 2.5) + i + s) % 3 !== 0;
          ctx.beginPath();
          ctx.arc(X, Y + 0.14, 0.11, 0, Math.PI * 2);
          ctx.fillStyle = on ? cols[(i + s) % cols.length] : shade(C.greyLight, 0.1);
          ctx.fill();
          ctx.strokeStyle = C.ink;
          ctx.lineWidth = 0.025;
          ctx.stroke();
        }
      }
      // music from the speaker
      particles(t, 3, 3.6, (k, r) => {
        const [x, y] = poles[0];
        ctx.globalAlpha = 1 - k;
        const [X, Y] = P(x + 0.6 + k * 1.2, y + 0.3, PZ - 0.7 + k * 1.5 + Math.sin(k * 8) * 0.15);
        ctx.fillStyle = C.navy;
        ctx.strokeStyle = C.navy;
        ctx.lineWidth = 0.05;
        ctx.beginPath(); ctx.ellipse(X, Y, 0.13, 0.09, -0.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(X + 0.11, Y - 0.02); ctx.lineTo(X + 0.11, Y - 0.45); ctx.lineTo(X + 0.28, Y - 0.34); ctx.stroke();
        ctx.globalAlpha = 1;
      }, 5);
    });

    // A rink sign on posts behind the back boards.
    R.thing(6.6, 2.2, (ctx) => {
      for (const x of [4.2, 6.2]) box(ctx, x, 2.0, 0, 0.14, 0.14, 3.2, C.brown, { flat: true });
      face(ctx, [[3.8, 2.2, 2.2], [6.8, 2.2, 2.2], [6.8, 2.2, 3.4], [3.8, 2.2, 3.4]], C.navy, { dots: C.ink, density: 0.2 });
      face(ctx, [[3.8, 2.2, 3.4], [6.8, 2.2, 3.4], [6.8, 2.1, 3.55], [3.8, 2.1, 3.55]], C.white, { lw: 0.03 });
      textY(ctx, 2.21, 5.3, 3.0, 'FROSTY', 0.52, C.butter);
      textY(ctx, 2.21, 5.3, 2.5, 'RINK', 0.42, C.white);
    });

    // ---------- the cocoa hut ----------
    const HX = 7.4, HW = 4.2, HY = 0.4, HD = 2.1;
    R.thing(HX + HW / 2, HY + 0.3, (ctx) => {
      box(ctx, HX, HY, 0, HW, 0.2, 2.8, C.red, { left: C.blush, dotsL: C.coralLight });
      box(ctx, HX, HY, 0, 0.2, HD, 2.8, C.red, { right: C.coral });
      box(ctx, HX + HW - 0.2, HY, 0, 0.2, HD, 2.8, C.red, { right: C.red });
      // shelf with mugs and a menu inside
      box(ctx, HX + 0.3, HY + 0.2, 1.7, 3.5, 0.3, 0.08, C.wood, { flat: true });
      for (let i = 0; i < 8; i++) {
        cylinder(ctx, HX + 0.55 + i * 0.42, HY + 0.35, 1.78, 0.1, 0.22, [C.white, C.teal, C.mustard, C.coral][i % 4], { flat: true });
      }
      textY(ctx, HY + 0.21, HX + 2.1, 2.3, 'COCOA 2 . MARSHMALLOWS FREE', 0.2, C.white);
    });
    // vendor behind the counter, ladling and handing out mugs
    const Tq = 7; // queue beat
    R.mover(() => ({ x: HX + 2.1, y: HY + 1.1 }), (ctx, t) => {
      const f = pulse(t, Tq);
      const hand = f > 0.45 && f < 0.75;
      person(ctx, HX + 2.1, HY + 1.1, 0, {
        skin: SKIN[3], hair: C.ink, style: 'bun', top: C.coral, bottom: C.navy, hat: 'beanie',
        pose: hand ? 'carry' : 'drum', dir: 'r', speed: 5,
        hold: hand ? (c) => mug(c, t) : null,
      }, t);
    });
    // counter, roof, awning, sign; the carrot has ended up on the roof
    R.thing(HX + HW / 2, HY + HD + 0.5, (ctx, t) => {
      box(ctx, HX - 0.05, HY + HD, 0, HW + 0.1, 0.45, 1.15, C.wood, { top: C.woodLight });
      if (Q.detail) for (let i = 1; i < 8; i++) face(ctx, [[HX + i * 0.53, HY + HD + 0.45, 0], [HX + i * 0.53, HY + HD + 0.45, 1.0]], null, { lw: 0.025, stroke: shade(C.wood, 0.4) });
      // pot and mugs on the counter
      cylinder(ctx, HX + 0.7, HY + HD + 0.22, 1.15, 0.32, 0.5, C.grey, { top: C.brown });
      for (let i = 0; i < 3; i++) cylinder(ctx, HX + 3.0 + i * 0.35, HY + HD + 0.25, 1.15, 0.1, 0.22, [C.white, C.teal, C.mustard][i], { flat: true });
      box(ctx, HX + 1.6, HY + HD + 0.1, 1.15, 0.35, 0.25, 0.4, C.pink, { flat: true });
      // front posts
      for (const x of [HX, HX + HW - 0.15]) box(ctx, x, HY + HD + 0.3, 1.15, 0.15, 0.15, 1.65, C.red, { flat: true });
      // striped awning
      const az = 2.8;
      for (let i = 0; i < 8; i++) {
        const xa = HX - 0.2 + (i * (HW + 0.4)) / 8, xb = xa + (HW + 0.4) / 8;
        face(ctx, [[xa, HY + HD + 0.1, az], [xb, HY + HD + 0.1, az], [xb, HY + HD + 0.9, az - 0.55], [xa, HY + HD + 0.9, az - 0.55]], i % 2 ? C.white : C.red, { lw: 0.035 });
      }
      // roof, heavy with snow
      box(ctx, HX - 0.2, HY - 0.2, az, HW + 0.4, HD + 0.3, 0.22, C.red);
      box(ctx, HX - 0.15, HY - 0.15, az + 0.22, HW + 0.3, HD + 0.2, 0.2, C.white, { flat: true, lw: 0.04 });
      // sign
      box(ctx, HX + 0.6, HY + 0.9, az + 0.42, 3.0, 0.14, 0.75, C.mustard, { left: C.mustard });
      textY(ctx, HY + 1.05, HX + 2.1, az + 0.8, 'HOT COCOA', 0.46, C.brown);
      // icicles
      if (Q.detail) {
        ctx.fillStyle = C.white;
        for (let i = 0; i < 9; i++) {
          const x = HX - 0.1 + i * 0.5;
          const [X, Y] = P(x, HY + HD + 0.9, az - 0.55);
          ctx.beginPath();
          ctx.moveTo(X - 0.06, Y); ctx.lineTo(X, Y + 0.2 + (i % 3) * 0.1); ctx.lineTo(X + 0.06, Y);
          paint(ctx, tint(C.sky, 0.4), { lw: 0.02 });
        }
      }
      // the snowman's carrot, stuck in the roof snow
      const [cx, cy] = P(HX + HW - 0.35, HY + HD - 0.2, az + 0.45);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.6);
      ctx.beginPath();
      ctx.moveTo(-0.3, -0.08); ctx.quadraticCurveTo(0.2, -0.05, 0.36, 0); ctx.quadraticCurveTo(0.2, 0.06, -0.3, 0.08);
      ctx.closePath();
      paint(ctx, C.coral, { lw: 0.035 });
      ctx.strokeStyle = shade(C.coral, 0.4); ctx.lineWidth = 0.02;
      ctx.beginPath(); ctx.moveTo(-0.1, -0.06); ctx.lineTo(-0.05, 0.02); ctx.moveTo(0.08, -0.04); ctx.lineTo(0.12, 0.03); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-0.3, 0); ctx.lineTo(-0.45, -0.12); ctx.moveTo(-0.3, 0.02); ctx.lineTo(-0.46, 0.06);
      ctx.strokeStyle = C.green; ctx.lineWidth = 0.05; ctx.stroke();
      ctx.restore();
      ctx.beginPath();
      ctx.ellipse(cx - 0.16, cy + 0.12, 0.22, 0.07, 0, 0, Math.PI * 2);
      ctx.fillStyle = C.white; ctx.fill();
    });
    R.find({ id: 'carrot', label: 'A carrot', at: [HX + HW - 0.35, HY + HD - 0.2, 3.3], r: 0.7 });
    // steam from the pot
    R.air((ctx, t) => {
      if (!Q.detail) return;
      particles(t, 7, 2.6, (k, r) => {
        const x = HX + 0.7 + (r() - 0.5) * 0.3, y = HY + HD + 0.22;
        const [X, Y] = P(x + Math.sin(k * 5 + r() * 6) * 0.2, y, 1.7 + k * 1.1);
        ctx.beginPath();
        ctx.arc(X, Y, 0.1 + k * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = alpha(C.white, 0.8 * (1 - k));
        ctx.fill();
        ctx.strokeStyle = alpha(C.grey, 0.5 * (1 - k));
        ctx.lineWidth = 0.025;
        ctx.stroke();
      }, 9);
    });

    // A barrel table where the cocoa drinkers pause.
    R.thing(5.9, 3.0, (ctx) => {
      cylinder(ctx, 5.9, 3.0, 0, 0.45, 1.1, C.brown, { top: C.wood });
      for (const z of [0.3, 0.8]) {
        const [X, Y] = P(5.9, 3.0, z);
        ctx.beginPath(); ctx.ellipse(X, Y, 0.45 * Math.SQRT2, 0.225 * Math.SQRT2, 0, 0, Math.PI);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
      }
      cylinder(ctx, 5.8, 2.95, 1.1, 0.1, 0.2, C.white, { flat: true });
      cylinder(ctx, 5.3, 3.2, 1.1, 0.12, 0.05, C.white, { flat: true });
    });

    // The cocoa queue: four slots and a loop. Get cocoa, drink it, rejoin at the back.
    const slots = [[9.5, 3.15], [10.7, 3.4], [11.9, 3.5], [13.1, 3.55]];
    const wander = track([[9.5, 3.15], [8.2, 3.55], [6.5, 3.55, 3.2], [6.8, 4.05], [13.8, 4.05], [13.1, 3.55]], 1.05);
    const NQ = 6;
    const qStyles = [
      folk(101, { hat: 'beanie', top: C.teal }), folk(102, { top: C.mustard, style: 'long' }), folk(103, { hat: 'cap', top: C.purple }),
      folk(104, { top: C.navy, style: 'curly', scale: 0.72 }), folk(105, { top: C.pink, hat: 'beanie' }), folk(106, { top: C.green, style: 'bald' }),
    ];
    const slotOf = (st) => (st === 0 ? 0 : st === 3 ? 3 : st === 4 ? 2 : st === 5 ? 1 : -1);
    for (let i = 0; i < NQ; i++) {
      const pos = (t) => {
        const u = t / Tq + i;
        const st = ((Math.floor(u) % NQ) + NQ) % NQ;
        const f = u - Math.floor(u);
        if (st === 1 || st === 2) {
          const p = wander(((st - 1 + f) / 2) * wander.T);
          return { ...p, cocoa: true, sip: p.moving ? 0 : 1 };
        }
        const cur = slots[slotOf(st)];
        const prevSt = (st + NQ - 1) % NQ;
        const prev = prevSt === 2 ? cur : slots[slotOf(prevSt)];
        const k = clamp(f / 0.14);
        const x = prev[0] + (cur[0] - prev[0]) * k, y = prev[1] + (cur[1] - prev[1]) * k;
        return { x, y, dir: 'l', back: st === 0, moving: k < 1 && prev !== cur, cocoa: st === 0 && f > 0.62, front: st === 0, f };
      };
      R.mover(pos, (ctx, t, p) => {
        const o = { ...qStyles[i], dir: p.dir, back: p.back, pose: p.moving ? 'walk' : p.sip ? 'carry' : 'stand' };
        if (p.cocoa) o.hold = (c) => mug(c, t);
        if (p.cocoa && !p.moving && !p.sip) o.arms = [0.9, -0.1];
        person(ctx, p.x, p.y, 0, o, t);
        if (!Q.detail) return;
        if (p.sip && (i % 2 === 0)) speech(ctx, p.x, p.y, 2.7, i === 0 ? 'AHHH' : 'AGAIN!', { size: 0.4 });
        if (p.front && p.f > 0.15 && p.f < 0.45) speech(ctx, p.x, p.y, 2.7, i % 3 === 1 ? 'EXTRA FOAM' : 'ONE MORE', { size: 0.4 });
      });
    }

    // ---------- the benches on the left ----------
    // Lacing skates since November.
    R.thing(2.2, 7.4, (ctx) => bench(ctx, 1.1, 5.2, 2.2, C.teal));
    R.thing(2.4, 7.0, (ctx) => {
      // the loose ice skate on the bench
      const [X, Y] = P(1.6, 6.9, 0.85);
      ctx.beginPath();
      ctx.moveTo(X - 0.2, Y - 0.45); ctx.lineTo(X + 0.05, Y - 0.45); ctx.lineTo(X + 0.08, Y - 0.15); ctx.lineTo(X + 0.35, Y - 0.1);
      ctx.lineTo(X + 0.35, Y); ctx.lineTo(X - 0.2, Y); ctx.closePath();
      paint(ctx, C.white, { lw: 0.04 });
      ctx.beginPath(); ctx.moveTo(X - 0.3, Y + 0.08); ctx.lineTo(X + 0.45, Y + 0.08);
      ctx.strokeStyle = C.grey; ctx.lineWidth = 0.05; ctx.stroke();
    });
    R.mover(() => ({ x: 1.95, y: 6.0 }), (ctx, t) => {
      const lacing = pulse(t, 11) < 0.8;
      person(ctx, 1.95, 6.0, 0.05, folk(61, { pose: 'sit', dir: 'r', hat: 'beanie', top: C.coral, arms: lacing ? [1.7 + Math.sin(t * 9) * 0.35, 1.5 - Math.sin(t * 9) * 0.35] : [Math.PI - 0.4, -Math.PI + 0.4] }), t);
      if (!Q.detail) return;
      // the endless lace, snaking over the snow
      ctx.beginPath();
      for (let k = 0; k <= 40; k++) {
        const q = k / 40;
        const x = 2.7 + q * 0.9 + Math.sin(q * 14 + t * 0.5) * 0.25, y = 6.0 + Math.sin(q * 9) * 0.7 + q * 1.6;
        const [X, Y] = P(x, y, k < 3 ? 0.4 - k * 0.13 : 0.02);
        k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      }
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.07; ctx.stroke();
      ctx.strokeStyle = C.butter; ctx.lineWidth = 0.035; ctx.stroke();
      if (!lacing) speech(ctx, 1.95, 6.0, 2.8, 'ALMOST!', { size: 0.42 });
    }, { bias: 2 });

    // The judges' bench and the figure skater they are judging.
    const FIG = 14;
    R.thing(2.2, 11.3, (ctx) => {
      bench(ctx, 1.1, 8.6, 2.6, C.brown);
      // a flask and a clipboard
      cylinder(ctx, 1.5, 10.95, 0.82, 0.08, 0.3, C.teal, { flat: true });
    });
    const judges = [[1.95, 9.2, folk(71, { hat: 'none', style: 'bald', top: C.navy, bottom: C.ink, skin: SKIN[0] })], [1.95, 10.4, folk(72, { style: 'bun', hair: C.grey, top: C.purple, dress: false })]];
    const scores = [['5.9', '6.0', '5.8', '6.0', '5.7'], ['5.8', '5.9', '6.0', '5.9', '6.0']];
    judges.forEach(([x, y, st], j) => {
      R.mover(() => ({ x, y }), (ctx, t) => {
        const s = pulse(t, FIG) * FIG, cyc = Math.floor(t / FIG);
        const show = s > 10.2 && s < 13.8;
        person(ctx, x, y, 0.05, { ...st, pose: 'sit', dir: 'r', arms: show ? [Math.PI - 0.25, 0.5] : [0.9, 0.7] }, t);
        if (show) scoreCard(ctx, x + 0.45, y - 0.45, 3.05, scores[j][((cyc % 5) + 5) % 5]);
      }, { bias: 2.2 });
    });
    // The snowman is the third judge. (He's wheeled out to judge the party
    // at 5pm: he's the walker then, not this.)
    const out = R.walkers.find((w) => w.id === 'snowman');
    R.mover(() => ({ x: 1.7, y: 12.9 }), (ctx, t) => {
      if (out && !out.at(t).hide) return;
      const s = pulse(t, FIG) * FIG;
      snowman(ctx, 1.7, 12.9, t, s > 10.6 && s < 13.8 ? '1.0' : null);
    });
    // A kid looking for the nose.
    const seeker = route([[1.3, 13.9, 1.2], [3.6, 14.2], [3.4, 15.4, 1.5], [1.8, 15.2]], { speed: 0.9 });
    R.mover(seeker, (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, folk(81, { pose: p.moving ? 'walk' : 'point', dir: p.dir, back: p.back, scale: 0.7, hat: 'beanie', top: C.red }), t);
      if (!p.moving && Q.detail) speech(ctx, p.x, p.y, 1.9, 'NOSE??', { size: 0.38 });
    });

    // The figure skater: glide, spin, jump, bow, wait for the scores.
    const fig = (t) => {
      const s = pulse(t, FIG) * FIG;
      if (s < 5) {
        const a = Math.PI + (s / 5) * Math.PI * 2;
        const vx = -Math.sin(a), vy = Math.cos(a) * 0.6;
        return { x: CX + Math.cos(a) * 1.3, y: CY + Math.sin(a) * 0.8, z: 0, pose: 'skate', dir: vx - vy >= 0 ? 'r' : 'l', back: vx + vy < 0 };
      }
      const x = CX - 1.3, y = CY;
      if (s < 8) {
        const q = s - 5;
        const fast = 5 + q * 3;
        const ph = Math.floor(q * fast);
        return { x, y, z: 0, pose: 'stand', spin: true, dir: ph % 2 ? 'l' : 'r', back: Math.floor(ph / 2) % 2 === 1, arms: [Math.PI - 0.15, -Math.PI + 0.15] };
      }
      if (s < 9) {
        const q = s - 8;
        const ph = Math.floor(q * 16);
        return { x, y, z: Math.sin(q * Math.PI) * 1.3, pose: 'stand', spin: true, dir: ph % 2 ? 'l' : 'r', back: Math.floor(ph / 2) % 2 === 1, arms: [0.3, -0.3] };
      }
      if (s < 10.2) return { x, y, z: 0, pose: 'stand', dir: 'r', arms: [1.9, -1.9] };
      return { x, y, z: 0, pose: 'wave', dir: 'r', wait: true };
    };
    R.mover(fig, (ctx, t, p) => {
      person(ctx, p.x, p.y, p.z, {
        skin: SKIN[5], hair: C.mustard, style: 'bun', top: C.pink, dress: true, shoes: C.white,
        pose: p.pose, dir: p.dir, back: p.back, arms: p.arms, speed: 6,
      }, t);
      if (!Q.detail) return;
      if (p.spin) {
        // whoosh rings
        for (let i = 0; i < 3; i++) {
          const [X, Y] = P(p.x, p.y, p.z + 0.5 + i * 0.55);
          ctx.beginPath();
          const a0 = t * 14 + i * 2;
          ctx.ellipse(X, Y, 0.75, 0.25, 0, a0, a0 + 2.2);
          ctx.strokeStyle = alpha(C.navy, 0.6);
          ctx.lineWidth = 0.05;
          ctx.stroke();
        }
      }
      const s = pulse(t, FIG) * FIG;
      if (s > 9.2 && s < 10.4) speech(ctx, p.x, p.y, 2.9, 'TA-DAA!', { size: 0.45 });
      if (s > 12.6 && s < 13.9) speech(ctx, p.x, p.y, 2.9, 'ONE POINT ZERO?!', { size: 0.4 });
    }, { bias: 0.1 });

    // ---------- skaters going round ----------
    const loop = (rx, ry, per, off) => orbit(CX, CY, rx, ry, per, off);
    // Parent towing a chain of small kids. The tail swings wide.
    const CHAIN = 18;
    const chain = [0, 1, 2, 3].map((k) => loop(3.05 + k * 0.1, 2.05 + k * 0.08, CHAIN, -k * 0.62));
    const chainStyle = [
      folk(91, { top: C.navy, hat: 'cap', style: 'short' }),
      folk(92, { scale: 0.68, top: C.mustard, hat: 'beanie' }),
      folk(93, { scale: 0.66, top: C.coral, style: 'pony' }),
      folk(94, { scale: 0.62, top: C.teal, hat: 'beanie' }),
    ];
    chain.forEach((fn, k) => {
      R.mover(fn, (ctx, t, p) => {
        const st = chainStyle[k];
        if (k > 0 && Q.detail) {
          const q = chain[k - 1](t);
          const [ax, ay] = P(p.x, p.y, 1.05 * st.scale);
          const [bx, by] = P(q.x, q.y, k === 1 ? 1.1 : 1.05 * chainStyle[k - 1].scale);
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
          ctx.strokeStyle = C.ink; ctx.lineWidth = 0.13; ctx.lineCap = 'round'; ctx.stroke();
          ctx.strokeStyle = st.top; ctx.lineWidth = 0.08; ctx.stroke();
        }
        const tail = k === 3;
        person(ctx, p.x, p.y, 0, { ...st, pose: tail ? 'cheer' : 'skate', dir: p.dir, back: p.back, speed: 5 }, t);
        if (tail && Q.detail && pulse(t, CHAIN) > 0.1 && pulse(t, CHAIN) < 0.28) speech(ctx, p.x, p.y, 2.0, 'WHEEE!', { size: 0.4 });
        if (k === 0 && Q.detail && pulse(t, CHAIN) > 0.55 && pulse(t, CHAIN) < 0.7) speech(ctx, p.x, p.y, 2.9, 'HOLD ON!', { size: 0.4 });
      });
    });
    // A couple holding hands.
    const couple = loop(2.7, 1.75, 24, 8);
    R.mover(couple, (ctx, t, p) => {
      const q = couple(t - 0.35);
      person(ctx, q.x, q.y, 0, folk(95, { pose: 'skate', dir: q.dir, back: q.back, top: C.red, style: 'long', speed: 4 }), t);
      person(ctx, p.x, p.y, 0, folk(96, { pose: 'skate', dir: p.dir, back: p.back, top: C.sky, hat: 'beanie', speed: 4 }), t);
      if (Q.detail) {
        const a = P(q.x, q.y, 1.1), b = P(p.x, p.y, 1.1);
        const [mx, my] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 0.9];
        const beat = 1 + Math.abs(Math.sin(t * 3)) * 0.25;
        ctx.save(); ctx.translate(mx, my); ctx.scale(beat, beat);
        ctx.beginPath();
        ctx.moveTo(0, 0.12); ctx.bezierCurveTo(-0.3, -0.1, -0.12, -0.3, 0, -0.12); ctx.bezierCurveTo(0.12, -0.3, 0.3, -0.1, 0, 0.12);
        paint(ctx, C.pink, { lw: 0.03 });
        ctx.restore();
      }
    });
    // A speed skater in a terrible hurry.
    const speedy = loop(3.35, 2.35, 7, 3);
    R.mover(speedy, (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, folk(97, { pose: 'run', dir: p.dir, back: p.back, top: C.mustard, bottom: C.mustard, hat: 'helmet', speed: 11 }), t);
      if (!Q.detail) return;
      const q = speedy(t - 0.25);
      for (let i = 0; i < 3; i++) {
        const [ax, ay] = P(q.x, q.y, 0.6 + i * 0.4), [bx, by] = P(q.x + (p.x - q.x) * 0.5, q.y + (p.y - q.y) * 0.5, 0.6 + i * 0.4);
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
        ctx.strokeStyle = alpha(C.navy, 0.5); ctx.lineWidth = 0.05; ctx.stroke();
      }
    });
    // A toddler with a penguin skate helper, overtaken by everyone.
    const peng = loop(2.35, 1.45, 60, 20);
    R.mover(peng, (ctx, t, p) => {
      const f = p.dir === 'l' ? -1 : 1;
      person(ctx, p.x, p.y, 0, folk(98, { pose: 'carry', dir: p.dir, back: p.back, scale: 0.6, top: C.lilac, hat: 'beanie' }), t);
      const [X, Y] = P(p.x + 0.35 * (f > 0 ? 1 : 0), p.y + 0.35 * (f > 0 ? 0 : 1), 0);
      ctx.save();
      ctx.translate(X, Y);
      ctx.scale(f, 1);
      ctx.rotate(Math.sin(t * 6) * 0.08);
      ctx.beginPath(); ctx.ellipse(0, -0.5, 0.3, 0.5, 0, 0, Math.PI * 2); paint(ctx, C.ink);
      ctx.beginPath(); ctx.ellipse(0.08, -0.45, 0.18, 0.36, 0, 0, Math.PI * 2); paint(ctx, C.white, { stroke: false });
      ctx.beginPath(); ctx.arc(0.08, -0.9, 0.04, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
      ctx.beginPath(); ctx.moveTo(0.2, -0.85); ctx.lineTo(0.4, -0.8); ctx.lineTo(0.2, -0.75); paint(ctx, C.mustard, { lw: 0.02 });
      ctx.restore();
    });

    // A beginner hugging the front boards: shuffle, let go, flail, splat, "I'M FINE".
    const BEG = 13;
    R.mover((t) => {
      const s = pulse(t, BEG) * BEG;
      if (s < 5) return { x: 5.0 + s * 0.4, y: 12.55, pose: 'walk', wob: 0.12, arms: [Math.PI - 1.4, -0.4] };
      if (s < 7.2) { const q = s - 5; return { x: 7.0 + q * 0.35, y: 12.55 - q * 0.3, pose: 'cheer', wob: 0.35, speed: 16 }; }
      if (s < 9.5) return { x: 7.8, y: 11.9, pose: 'lie', down: true };
      if (s < 10.8) return { x: 7.8, y: 11.9, pose: 'wave', fine: true };
      const q = (s - 10.8) / 2.2;
      return { x: 7.8 - q * 2.8, y: 11.9 + q * 0.65, pose: 'walk', wob: 0.15, back: false, dir: 'l', arms: [-0.4, Math.PI - 1.4] };
    }, (ctx, t, p) => {
      const [X, Y] = P(p.x, p.y, 0);
      ctx.save();
      if (p.wob) { ctx.translate(X, Y); ctx.rotate(Math.sin(t * 9) * p.wob); ctx.translate(-X, -Y); }
      person(ctx, p.x, p.y, p.down ? 0.25 : 0, folk(99, { pose: p.pose, dir: p.dir || 'r', top: C.green, hat: 'helmet', arms: p.arms, speed: p.speed || 3 }), t);
      ctx.restore();
      if (!Q.detail) return;
      if (p.down) {
        for (let i = 0; i < 3; i++) {
          const a = t * 4 + (i * Math.PI * 2) / 3;
          label(ctx, p.x + Math.cos(a) * 0.6, p.y + Math.sin(a) * 0.6, 1.2, '*', 0.55, C.mustard);
        }
      }
      if (p.fine) speech(ctx, p.x, p.y, 2.8, "I'M FINE!", { size: 0.42 });
    }, { bias: -0.1 });

    // An old-timer doing slow, perfect loops with his hands behind his back.
    const oldie = (t) => {
      const a = t * 0.45;
      const x = 12.55 + Math.sin(a) * 0.55, y = 10.4 + Math.sin(2 * a) * 0.3;
      const vx = Math.cos(a) * 0.55, vy = Math.cos(2 * a) * 0.6;
      return { x, y, dir: vx - vy >= 0 ? 'r' : 'l', back: vx + vy < -0.05 };
    };
    R.mover(oldie, (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, { skin: SKIN[0], hair: C.white, style: 'bald', top: C.brown, bottom: C.ink, hat: 'beanie', pose: 'stand', dir: p.dir, back: p.back, arms: [-0.6, -0.5] }, t);
      if (Q.detail && pulse(t, 17) < 0.14) speech(ctx, p.x, p.y, 2.9, 'SINCE 1961', { size: 0.38 });
    });

    // A kid who licked the light pole.
    R.mover(() => ({ x: 15.0, y: 13.85 }), (ctx, t) => {
      const pull = Math.max(0, Math.sin(t * 2.2)) * 0.12;
      const [X, Y] = P(15.0, 13.85, 0);
      ctx.save();
      ctx.translate(X, Y); ctx.rotate(-pull); ctx.translate(-X, -Y);
      person(ctx, 15.0, 13.85, 0, folk(121, { pose: 'cheer', dir: 'r', scale: 0.72, top: C.mustard, hat: 'beanie', speed: 12 }), t);
      ctx.restore();
      const hx = X + 0.2 + Math.sin(pull) * 1.3, hy = Y - 1.3;
      const [PX] = P(15.3, 13.3, 0);
      ctx.beginPath();
      ctx.moveTo(hx, hy); ctx.lineTo(PX - 0.1, hy - 0.05);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.lineCap = 'round'; ctx.stroke();
      ctx.strokeStyle = C.pink; ctx.lineWidth = 0.06; ctx.stroke();
      if (Q.detail && pulse(t, 7) < 0.3) speech(ctx, 14.9, 13.9, 2.2, 'HEWP!', { size: 0.38 });
    }, { bias: 0.5 });

    // ---------- the resurfacing machine (with a lost mitten riding along) ----------
    R.mover(machine, (ctx, t, p) => {
      const [hx, hy] = heading(t);
      const alongX = Math.abs(hx) > Math.abs(hy);
      const w = alongX ? 2.3 : 1.3, d = alongX ? 1.3 : 2.3;
      const x = p.x - w / 2, y = p.y - d / 2;
      // shadow and conditioner towel at the back
      const bx = p.x - hx * 1.3, by = p.y - hy * 1.3;
      rect(ctx, bx - (alongX ? 0.15 : 0.6), by - (alongX ? 0.6 : 0.15), alongX ? 0.3 : 1.2, alongX ? 1.2 : 0.3, 0.02, C.navy, { lw: 0.03 });
      box(ctx, x + 0.1, y + 0.1, 0, w - 0.2, d - 0.2, 0.35, C.ink, { flat: true });
      box(ctx, x, y, 0.3, w, d, 0.75, C.white, { top: C.white, dotsL: C.sky });
      // stripe
      if (Q.detail) {
        face(ctx, [[x, y + d, 0.55], [x + w, y + d, 0.55], [x + w, y + d, 0.7], [x, y + d, 0.7]], C.teal, { lw: 0.02 });
        face(ctx, [[x + w, y, 0.55], [x + w, y + d, 0.55], [x + w, y + d, 0.7], [x + w, y, 0.7]], C.teal, { lw: 0.02 });
      }
      // snow tank over the rear 60%
      const tx = alongX ? (hx > 0 ? x : x + w * 0.4) : x, ty = alongX ? y : (hy > 0 ? y : y + d * 0.4);
      const tw = alongX ? w * 0.6 : w, td = alongX ? d : d * 0.6;
      box(ctx, tx + 0.05, ty + 0.05, 1.05, tw - 0.1, td - 0.1, 0.55, C.teal, { top: shade(C.teal, 0.3) });
      rect(ctx, tx + 0.2, ty + 0.2, tw - 0.4, td - 0.4, 1.6, C.white, { lw: 0.03, dots: C.sky, density: 0.2 });
      label(ctx, alongX ? p.x : x + w, alongX ? y + d : p.y, 0.95, 'ICE-O-MATIC', 0.26, C.navy);
      // driver in the front seat
      const sx = p.x + hx * 0.7, sy = p.y + hy * 0.7;
      const dir = hx - hy >= 0 ? 'r' : 'l', back = hx + hy < 0;
      person(ctx, sx, sy, 0.4, { skin: SKIN[2], hair: C.ink, top: C.mustard, bottom: C.navy, hat: 'cap', pose: 'sit', dir, back, arms: [1.3, 1.2] }, t);
      // blinking beacon
      const [BX, BY] = P(tx + tw / 2, ty + td / 2, 1.85);
      ctx.beginPath();
      ctx.roundRect(BX - 0.14, BY - 0.3, 0.28, 0.32, 0.1);
      paint(ctx, pulse(t, 0.8) < 0.5 ? C.mustard : shade(C.mustard, 0.4), { lw: 0.03 });
      if (pulse(t, 0.8) < 0.5 && Q.detail) {
        ctx.beginPath(); ctx.arc(BX, BY - 0.1, 0.42, 0, Math.PI * 2);
        ctx.fillStyle = alpha(C.butter, 0.35); ctx.fill();
      }
      // the mitten on the tank lid
      const mx = tx + tw / 2 - hx * 0.45, my = ty + td / 2 - hy * 0.45;
      const [MX, MY] = P(mx, my, 1.65);
      ctx.save();
      ctx.translate(MX, MY);
      ctx.rotate(0.3);
      ctx.beginPath();
      ctx.roundRect(-0.17, -0.42, 0.34, 0.46, 0.15);
      ctx.moveTo(0.14, -0.1); ctx.ellipse(0.2, -0.16, 0.08, 0.14, 0.5, 0, Math.PI * 2);
      paint(ctx, C.red, { dots: C.white, density: 0.22, lw: 0.04 });
      ctx.beginPath(); ctx.rect(-0.18, -0.02, 0.36, 0.1); paint(ctx, C.white, { lw: 0.03 });
      ctx.restore();
      if (Q.detail && pulse(t, 29) > 0.4 && pulse(t, 29) < 0.5) speech(ctx, sx, sy, 3.0, 'BEEP BEEP', { size: 0.4 });
    }, { bias: 0.4 });
    R.find({
      id: 'mitten', label: 'A lost mitten', r: 0.8,
      at: (t) => {
        const p = machine(t), [hx, hy] = heading(t);
        const alongX = Math.abs(hx) > Math.abs(hy);
        const w = alongX ? 2.3 : 1.3, d = alongX ? 1.3 : 2.3;
        const x = p.x - w / 2, y = p.y - d / 2;
        const tx = alongX ? (hx > 0 ? x : x + w * 0.4) : x, ty = alongX ? y : (hy > 0 ? y : y + d * 0.4);
        const tw = alongX ? w * 0.6 : w, td = alongX ? d : d * 0.6;
        return [tx + tw / 2 - hx * 0.45, ty + td / 2 - hy * 0.45, 1.85];
      },
    });

    // ---------- hockey on the practice patch ----------
    const HOC = 6;
    const A = [7.6, 14.7], NET = [13.0, 14.6];
    const puck = (t) => {
      const s = pulse(t, HOC) * HOC;
      if (s < 0.4) return { x: A[0] + 0.5, y: A[1] };
      if (s < 1.3) { const q = (s - 0.4) / 0.9; return { x: A[0] + 0.5 + (NET[0] - A[0] - 0.5) * q, y: A[1] + (NET[1] - A[1]) * q }; }
      if (s < 3.4) return { x: NET[0], y: NET[1] };
      if (s < 4.8) { const q = (s - 3.4) / 1.4; return { x: NET[0] - 0.4 - (NET[0] - 0.4 - A[0] - 0.5) * q, y: NET[1] + (A[1] - NET[1]) * q + Math.sin(q * Math.PI) * 0.4 }; }
      return { x: A[0] + 0.5, y: A[1] };
    };
    R.thing(NET[0] + 0.5, NET[1] + 0.6, (ctx) => {
      const x0 = NET[0] - 0.1, x1 = NET[0] + 0.5, y0 = NET[1] - 0.65, y1 = NET[1] + 0.65, h = 0.85;
      face(ctx, [[x1, y0, 0], [x1, y1, 0], [x1, y1, h], [x1, y0, h]], alpha(C.white, 0.6), { dots: C.grey, density: 0.35, lw: 0.03 });
      face(ctx, [[x0, y0, 0], [x1, y0, 0], [x1, y0, h], [x0, y0, h]], alpha(C.white, 0.5), { dots: C.grey, density: 0.35, lw: 0.03 });
      face(ctx, [[x0, y0, h], [x0, y1, h], [x1, y1, h], [x1, y0, h]], alpha(C.white, 0.5), { dots: C.grey, density: 0.35, lw: 0.03 });
      face(ctx, [[x0, y0, 0], [x0, y0, h], [x0, y1, h], [x0, y1, 0]], null, { stroke: C.red, lw: 0.1 });
    }, { depth: NET[0] + NET[1] + 0.2 });
    R.mover(puck, (ctx, t, p) => {
      disc(ctx, p.x, p.y, 0.1, 0.2, C.ink, { lw: 0.03 });
      const [X, Y] = P(p.x, p.y, 0.1);
      ctx.beginPath(); ctx.ellipse(X, Y - 0.08, 0.26, 0.1, 0, 0, Math.PI * 2);
      ctx.fillStyle = C.black; ctx.fill();
      ctx.beginPath(); ctx.ellipse(X, Y - 0.1, 0.2, 0.06, 0, 0, Math.PI * 2);
      ctx.fillStyle = shade(C.grey, 0.5); ctx.fill();
    }, { bias: 0.15 });
    R.find({ id: 'puck', label: 'A hockey puck', r: 0.7, at: (t) => { const p = puck(t); return [p.x, p.y, 0.1]; } });
    // shooter
    R.mover(() => ({ x: A[0], y: A[1] }), (ctx, t) => {
      const s = pulse(t, HOC) * HOC;
      const swing = s < 0.3 ? -0.9 * (s / 0.3) : s < 0.5 ? -0.9 + 1.6 * ((s - 0.3) / 0.2) : s < 1 ? 0.7 : 0;
      const cheer = s > 1.4 && s < 3.2;
      person(ctx, A[0], A[1], 0, folk(111, { pose: cheer ? 'jump' : 'stand', dir: 'r', scale: 0.75, top: C.red, hat: 'helmet', arms: cheer ? undefined : [0.8, 0.9], hold: cheer ? null : stick(swing), speed: 9 }), t);
      if (cheer && Q.detail) speech(ctx, A[0], A[1], 2.3, 'GOAL!!', { size: 0.42 });
    });
    // goalie: dives too late, fishes the puck out and passes it back
    R.mover((t) => {
      const s = pulse(t, HOC) * HOC;
      if (s < 1.0) return { x: 12.1, y: 14.4, pose: 'stand' };
      if (s < 2.0) return { x: 12.1, y: 14.4 + (s - 1) * 0.5, pose: 'lie' };
      if (s < 3.4) return { x: 12.3, y: 14.4, pose: 'stand', sulk: true };
      return { x: 12.3, y: 14.4, pose: 'stand', pass: true };
    }, (ctx, t, p) => {
      const s = pulse(t, HOC) * HOC;
      const sw = p.pass && s < 3.7 ? 0.8 : 0;
      person(ctx, p.x, p.y, p.pose === 'lie' ? 0.2 : 0, folk(112, { pose: p.pose, dir: 'l', scale: 0.75, top: C.teal, hat: 'helmet', arms: [0.8, 0.9], hold: stick(sw - 0.2) }), t);
      if (p.sulk && Q.detail) speech(ctx, p.x, p.y, 2.2, 'NOT FAIR', { size: 0.36 });
    });

    // ---------- the goose: a run-up and a belly slide in a nice scarf ----------
    const gIn = track([[2.9, 12.2], [3.5, 11.2], [4.1, 10.5]], 0.9);
    const gBack = track([[12.3, 9.6], [4.3, 10.5], [3.5, 11.2], [2.9, 12.2]], 1.0);
    const GC = 24;
    const goosePos = (t) => {
      let s = pulse(t, GC) * GC;
      if (s < gIn.T) return { ...gIn(s), z: 0 };
      s -= gIn.T;
      if (s < 0.7) { const q = s / 0.7; return { x: 4.1 + q * 1.2, y: 10.5 - q * 0.1, z: 0, dir: 'r', moving: true, run: true }; }
      s -= 0.7;
      if (s < 4.2) {
        const u = s / 4.2, q = 1 - (1 - u) * (1 - u);
        return { x: 5.3 + q * 7.0, y: 10.4 - q * 0.8, z: 0.05, dir: 'r', pose: 'sit', slide: 1 - u };
      }
      s -= 4.2;
      if (s < 1.6) return { x: 12.3, y: 9.6, z: 0, dir: 'r', pose: s < 1.0 ? 'honk' : 'stand' };
      s -= 1.6;
      if (s < gBack.T) return { ...gBack(s), z: 0 };
      return { x: 2.9, y: 12.2, z: 0, dir: 'r', pose: 'peck' };
    };
    R.goose(goosePos, { bias: 0.3 });
    // the scarf (and a spray of ice when sliding)
    R.mover(goosePos, (ctx, t, p) => {
      const pose = p.pose || (p.moving ? 'walk' : 'stand');
      const f = p.dir === 'l' ? -1 : 1;
      const by = pose === 'sit' ? -0.2 : -0.45;
      const bob = pose === 'walk' ? Math.abs(Math.sin(t * 9)) * 0.06 : 0;
      const [X, Y] = P(p.x, p.y, p.z || 0);
      ctx.save();
      ctx.translate(X, Y - bob);
      ctx.scale(f, 1);
      const nx = pose === 'honk' ? 0.36 : 0.3, ny = by - 0.27;
      const flap = Math.sin(t * 12) * 0.08;
      const len = p.slide ? 0.5 + p.slide * 0.4 : 0.35;
      ctx.beginPath();
      ctx.moveTo(nx - 0.02, ny + 0.02);
      ctx.quadraticCurveTo(nx - len * 0.6, ny - 0.05 + flap, nx - len - 0.1, ny + (p.slide ? -0.1 : 0.3) + flap);
      ctx.lineTo(nx - len - 0.02, ny + (p.slide ? 0.04 : 0.38) + flap);
      ctx.quadraticCurveTo(nx - len * 0.5, ny + 0.12, nx, ny + 0.12);
      ctx.closePath();
      paint(ctx, C.red, { dots: C.white, density: 0.35, lw: 0.035 });
      ctx.beginPath();
      ctx.ellipse(nx + 0.02, ny + 0.05, 0.15, 0.08, -0.3, 0, Math.PI * 2);
      paint(ctx, C.red, { lw: 0.035 });
      ctx.beginPath(); ctx.moveTo(nx - 0.08, ny); ctx.lineTo(nx - 0.04, ny + 0.12); ctx.moveTo(nx + 0.06, ny - 0.02); ctx.lineTo(nx + 0.1, ny + 0.1);
      ctx.strokeStyle = C.white; ctx.lineWidth = 0.035; ctx.stroke();
      ctx.restore();
      if (p.slide && Q.detail) {
        for (let i = 0; i < 6; i++) {
          const k = ((t * 3 + i / 6) % 1);
          const [sx, sy] = P(p.x - 0.4 - k * 0.8 * p.slide - 0.2, p.y + (i % 3 - 1) * 0.25, 0.1 + Math.sin(k * Math.PI) * 0.4);
          ctx.beginPath(); ctx.arc(sx, sy, 0.06 * (1 - k) + 0.02, 0, Math.PI * 2);
          ctx.fillStyle = C.white; ctx.fill();
          ctx.strokeStyle = alpha(C.sky, 0.9); ctx.lineWidth = 0.02; ctx.stroke();
        }
      }
    }, { bias: 0.31 });

    // ---------- snow over everything ----------
    R.air((ctx, t) => {
      if (!Q.detail) return;
      particles(t, 64, 8, (k, r) => {
        const x = r() * 17 - 0.5, y = r() * 17 - 0.5, sz = 0.05 + r() * 0.06, w = r() * 6;
        const z = 9 - k * 9;
        const [X, Y] = P(x + Math.sin(t * 0.9 + w) * 0.35, y + Math.cos(t * 0.7 + w) * 0.2, z);
        ctx.beginPath();
        ctx.arc(X, Y, sz, 0, Math.PI * 2);
        ctx.fillStyle = C.white;
        ctx.globalAlpha = Math.min(1, k * 6, (1 - k) * 8);
        ctx.fill();
        ctx.strokeStyle = alpha(C.navy, 0.5);
        ctx.lineWidth = 0.02;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }, 3);
    });
  },
};
