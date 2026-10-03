// Noodle Bar: a chef slapping noodles, a wok on fire (on purpose), a couple
// sharing one very long noodle, a bottomless challenge bowl and a goose who
// ordered the large (behind a menu: tap it).
import {
  C, box, rect, disc, cylinder, face, poly, paint, person, folk, slab, checker,
  speech, shade, tint, alpha, Q, label, P, paintText, onLeft, onRight, plant, rng, SKIN,
} from '../../../engine/art.js';
import { route, particles, pulse, clamp, ease } from '../../../engine/actors.js';

const CT_Y0 = 5.2, CT_Y1 = 6.2, CT_H = 1.2; // the long counter
const STOOL_Y = 7.0, SEAT = 0.85;

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
    return { x: s.ax + (s.bx - s.ax) * k, y: s.ay + (s.by - s.ay) * k, dir: dX >= 0 ? 'r' : 'l', back: dY < -0.01, moving: !s.still, seg: i };
  };
  f.T = T;
  return f;
}

// Wiggly noodle strands between two screen points.
function noodles(ctx, a, b, t, n = 3, sag = 0.3, wig = 0.08) {
  ctx.lineCap = 'round';
  for (const pass of [0, 1]) {
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      for (let k = 0; k <= 12; k++) {
        const q = k / 12;
        const x = a[0] + (b[0] - a[0]) * q + Math.sin(q * 9 + t * 8 + i * 2) * wig * Math.sin(q * Math.PI);
        const y = a[1] + (b[1] - a[1]) * q + Math.sin(q * Math.PI) * sag + (i - (n - 1) / 2) * 0.05;
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = pass ? C.butter : C.ink;
      ctx.lineWidth = pass ? 0.05 : 0.1;
      ctx.stroke();
    }
  }
}

// Noodle bowl on a surface at z.
function bowl(ctx, x, y, z, r = 0.3, color = C.white, rim = C.red) {
  const [X, Y] = P(x, y, z);
  const rx = r * Math.SQRT2, ry = rx / 2;
  ctx.beginPath();
  ctx.moveTo(X - rx, Y - r * 0.55);
  ctx.quadraticCurveTo(X - rx * 0.9, Y + ry * 0.8, X, Y + ry * 0.9);
  ctx.quadraticCurveTo(X + rx * 0.9, Y + ry * 0.8, X + rx, Y - r * 0.55);
  ctx.closePath();
  paint(ctx, color, { dots: shade(color, 0.3), density: 0.15, lw: 0.04 });
  ctx.beginPath();
  ctx.ellipse(X, Y - r * 0.55, rx, ry, 0, 0, Math.PI * 2);
  paint(ctx, rim, { lw: 0.04 });
  ctx.beginPath();
  ctx.ellipse(X, Y - r * 0.5, rx * 0.8, ry * 0.75, 0, 0, Math.PI * 2);
  paint(ctx, C.mustard, { stroke: false, dots: C.butter, density: 0.5 });
  if (Q.detail) {
    // egg half and a green onion
    ctx.beginPath(); ctx.ellipse(X + rx * 0.3, Y - r * 0.55, 0.1, 0.06, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.02 });
    ctx.beginPath(); ctx.arc(X + rx * 0.3, Y - r * 0.55, 0.035, 0, Math.PI * 2); ctx.fillStyle = C.mustard; ctx.fill();
    ctx.fillStyle = C.green;
    ctx.fillRect(X - rx * 0.4, Y - r * 0.6, 0.06, 0.04);
    ctx.fillRect(X - rx * 0.2, Y - r * 0.5, 0.06, 0.04);
  }
}

function lantern(ctx, hx, hy, hz, drop, t, i, color = C.red) {
  const [X, Y] = P(hx, hy, hz);
  const a = Math.sin(t * 1.4 + i * 1.7) * 0.14;
  ctx.save();
  ctx.translate(X, Y);
  ctx.rotate(a);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, drop - 0.5);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.035; ctx.stroke();
  const cy = drop;
  if (Q.detail) {
    ctx.beginPath(); ctx.arc(0, cy, 0.9, 0, Math.PI * 2);
    ctx.fillStyle = alpha(C.butter, 0.18 + 0.05 * Math.sin(t * 3 + i)); ctx.fill();
  }
  ctx.beginPath(); ctx.ellipse(0, cy, 0.46, 0.4, 0, 0, Math.PI * 2);
  paint(ctx, color, { dots: shade(color, 0.35), density: 0.15, lw: 0.05 });
  if (Q.detail) {
    ctx.strokeStyle = shade(color, 0.4); ctx.lineWidth = 0.025;
    for (const k of [-0.25, 0, 0.25]) {
      ctx.beginPath(); ctx.ellipse(0, cy, Math.abs(k) * 1.4 + 0.02, 0.39, 0, -Math.PI / 2, Math.PI / 2, k < 0); ctx.stroke();
    }
  }
  ctx.beginPath(); ctx.rect(-0.2, cy - 0.48, 0.4, 0.1); ctx.rect(-0.2, cy + 0.38, 0.4, 0.1);
  paint(ctx, C.ink, { lw: 0.02 });
  ctx.beginPath(); ctx.moveTo(0, cy + 0.48); ctx.lineTo(Math.sin(t * 2 + i) * 0.05, cy + 0.85);
  ctx.strokeStyle = C.mustard; ctx.lineWidth = 0.07; ctx.stroke();
  ctx.restore();
}

function stool(ctx, x, y, color = C.red) {
  box(ctx, x - 0.05, y - 0.05, 0, 0.1, 0.1, SEAT, C.ink, { flat: true, stroke: false });
  disc(ctx, x, y, 0.02, 0.3, C.ink, { stroke: false });
  cylinder(ctx, x, y, SEAT - 0.12, 0.34, 0.12, color);
}

function roundTable(ctx, x, y) {
  box(ctx, x - 0.07, y - 0.07, 0, 0.14, 0.14, CT_H, C.ink, { flat: true, stroke: false });
  disc(ctx, x, y, 0.02, 0.45, C.ink, { stroke: false });
  cylinder(ctx, x, y, CT_H - 0.1, 0.95, 0.1, C.wood, { top: C.woodLight });
}

function chairAt(ctx, x, y, color) {
  box(ctx, x - 0.3, y - 0.3, 0, 0.6, 0.6, 0.75, color, { flat: true });
  box(ctx, x - 0.35, y - 0.35, 0.75, 0.7, 0.7, 0.1, color);
}

function cat(ctx, x, y, z, t, o = {}) {
  const [X, Y] = P(x, y, z);
  const f = o.dir === 'l' ? -1 : 1;
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(f, 1);
  if (Q.detail && z < 0.1) {
    ctx.beginPath(); ctx.ellipse(0, 0, 0.38, 0.14, 0, 0, Math.PI * 2); ctx.fillStyle = alpha(C.ink, 0.15); ctx.fill();
  }
  // tail
  ctx.beginPath();
  ctx.moveTo(-0.2, -0.1);
  ctx.quadraticCurveTo(-0.6, -0.2 + Math.sin(t * 3) * 0.1, -0.5 + Math.sin(t * 3) * 0.15, -0.6);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.13; ctx.lineCap = 'round'; ctx.stroke();
  ctx.strokeStyle = C.mustard; ctx.lineWidth = 0.07; ctx.stroke();
  // body (sitting up, begging)
  ctx.beginPath(); ctx.ellipse(0, -0.28, 0.22, 0.3, o.up ? -0.2 : 0, 0, Math.PI * 2);
  paint(ctx, C.mustard, { dots: C.coral, density: 0.3, lw: 0.04 });
  const hy = o.up ? -0.72 : -0.62;
  ctx.beginPath();
  ctx.arc(0.06, hy, 0.18, 0, Math.PI * 2);
  ctx.moveTo(-0.08, hy - 0.1); ctx.lineTo(-0.06, hy - 0.3); ctx.lineTo(0.05, hy - 0.16);
  ctx.moveTo(0.12, hy - 0.16); ctx.lineTo(0.22, hy - 0.3); ctx.lineTo(0.22, hy - 0.08);
  paint(ctx, C.mustard, { lw: 0.04 });
  ctx.fillStyle = C.ink;
  ctx.beginPath(); ctx.arc(0.04, hy - 0.02, 0.025, 0, Math.PI * 2); ctx.arc(0.15, hy - 0.02, 0.025, 0, Math.PI * 2); ctx.fill();
  if (o.up) {
    // paws up
    ctx.beginPath(); ctx.ellipse(0.16, -0.5, 0.05, 0.1, 0.5, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.03 });
  }
  ctx.restore();
}

function luckyCat(ctx, x, y, z, t) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.beginPath(); ctx.roundRect(-0.25, -0.4, 0.5, 0.4, 0.12); paint(ctx, C.white, { lw: 0.035 });
  ctx.beginPath(); ctx.arc(0, -0.55, 0.22, 0, Math.PI * 2);
  ctx.moveTo(-0.2, -0.62); ctx.lineTo(-0.16, -0.82); ctx.lineTo(-0.04, -0.72);
  ctx.moveTo(0.04, -0.72); ctx.lineTo(0.16, -0.82); ctx.lineTo(0.2, -0.62);
  paint(ctx, C.white, { lw: 0.035 });
  ctx.fillStyle = C.ink;
  ctx.beginPath(); ctx.arc(-0.08, -0.56, 0.025, 0, Math.PI * 2); ctx.arc(0.08, -0.56, 0.025, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.red;
  ctx.fillRect(-0.2, -0.36, 0.4, 0.05);
  ctx.beginPath(); ctx.arc(0, -0.28, 0.06, 0, Math.PI * 2); ctx.fillStyle = C.mustard; ctx.fill();
  // coin
  ctx.beginPath(); ctx.ellipse(-0.12, -0.18, 0.1, 0.13, 0, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.025 });
  // waving paw
  ctx.save();
  ctx.translate(0.2, -0.42);
  ctx.rotate(-0.4 + Math.sin(t * 5) * 0.45);
  ctx.beginPath(); ctx.roundRect(-0.05, -0.32, 0.12, 0.34, 0.06); paint(ctx, C.white, { lw: 0.03 });
  ctx.restore();
  ctx.restore();
}

// Chopsticks stuck through a bun of hair (person's face hook: drawn in the
// head's own space, so they follow the head).
function hairSticks(ctx, hy) {
  ctx.lineCap = 'round';
  for (const [a, b] of [[[-0.38, hy - 0.5], [0.22, hy - 0.26]], [[-0.34, hy - 0.28], [0.24, hy - 0.5]]]) {
    ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.08; ctx.stroke();
    ctx.strokeStyle = C.wood; ctx.lineWidth = 0.04; ctx.stroke();
  }
}

// A teapot shaped like a goose, sitting on the counter at z: a white round
// body, its spout a goose's neck and head, its handle a tail. Goose sized.
function gooseTeapot(ctx, x, y, z) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  // the handle, curled up like a tail
  ctx.beginPath(); ctx.arc(-0.42, -0.42, 0.17, Math.PI * 0.4, Math.PI * 1.6);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.12; ctx.stroke();
  ctx.strokeStyle = C.white; ctx.lineWidth = 0.06; ctx.stroke();
  // body and lid
  ctx.beginPath(); ctx.ellipse(0, -0.34, 0.4, 0.32, 0, 0, Math.PI * 2);
  paint(ctx, C.white, { dots: C.grey, density: 0.12, lw: 0.04 });
  ctx.beginPath(); ctx.ellipse(-0.05, -0.38, 0.2, 0.1, -0.2, 0, Math.PI * 2); paint(ctx, C.greyLight, { lw: 0.03 });
  ctx.beginPath(); ctx.ellipse(0, -0.66, 0.16, 0.05, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.03 });
  ctx.beginPath(); ctx.arc(0, -0.74, 0.05, 0, Math.PI * 2); paint(ctx, C.coral, { lw: 0.025 });
  // the spout: a goose's neck and head
  ctx.beginPath(); ctx.moveTo(0.3, -0.4); ctx.quadraticCurveTo(0.45, -0.6, 0.42, -0.86);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.19; ctx.lineCap = 'round'; ctx.stroke();
  ctx.strokeStyle = C.white; ctx.lineWidth = 0.12; ctx.stroke();
  ctx.beginPath(); ctx.arc(0.42, -0.9, 0.11, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.035 });
  ctx.beginPath(); ctx.moveTo(0.5, -0.94); ctx.lineTo(0.72, -0.88); ctx.lineTo(0.5, -0.83); ctx.closePath(); paint(ctx, C.coral, { lw: 0.03 });
  ctx.beginPath(); ctx.arc(0.45, -0.93, 0.025, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
  // a blue band round its middle, like good china
  ctx.beginPath(); ctx.ellipse(0, -0.22, 0.37, 0.1, 0, 0.15, Math.PI - 0.15);
  ctx.strokeStyle = C.navy; ctx.lineWidth = 0.035; ctx.stroke();
  ctx.restore();
}

// A giant menu held up in front of someone facing you, flat to the screen,
// centred on (x, y), bottom edge at zb.
function bigPaper(ctx, x, y, zb, h, color, title) {
  const d = 0.36, zt = zb + h;
  face(ctx, [[x - d, y + d, zb], [x + d, y - d, zb], [x + d, y - d, zt], [x - d, y + d, zt]], color, { lw: 0.04, dots: shade(color, 0.3), density: 0.15 });
  // the fold down the middle
  face(ctx, [[x, y, zb + 0.05], [x, y, zt - 0.05]], null, { lw: 0.03, stroke: alpha(C.ink, 0.6) });
  const [X, Y] = P(x, y, zt - 0.25);
  ctx.beginPath(); ctx.rect(X - 0.7, Y - 0.22, 1.4, 0.06); ctx.fillStyle = C.mustard; ctx.fill();
  if (Q.detail) label(ctx, x, y, zt - 0.35, title, 0.26, C.butter);
  // little bowls drawn on it
  for (const [dx, dy] of [[-0.35, 0.45], [0.35, 0.45], [-0.35, 0.85], [0.35, 0.85]]) {
    ctx.beginPath(); ctx.arc(X + dx, Y + dy, 0.13, 0, Math.PI); ctx.closePath(); paint(ctx, C.white, { lw: 0.025 });
    if (Q.detail) { ctx.beginPath(); ctx.moveTo(X + dx - 0.1, Y + dy - 0.05); ctx.quadraticCurveTo(X + dx, Y + dy - 0.2, X + dx + 0.1, Y + dy - 0.05); ctx.strokeStyle = C.butter; ctx.lineWidth = 0.03; ctx.stroke(); }
  }
}

// A takeaway box (an oyster pail) on the counter at z: flaps folded shut
// (k 0) or popped open (k 1). fortune: a slip of paper peeks out of the
// flaps, and a fortune cookie pops up when it opens.
function takeaway(ctx, x, y, z, k, fortune) {
  const [X, Y] = P(x, y, z);
  ctx.beginPath(); ctx.moveTo(X - 0.17, Y); ctx.lineTo(X - 0.24, Y - 0.5); ctx.lineTo(X + 0.24, Y - 0.5); ctx.lineTo(X + 0.17, Y); ctx.closePath();
  paint(ctx, C.white, { lw: 0.035 });
  ctx.beginPath(); ctx.rect(X - 0.2, Y - 0.32, 0.4, 0.08); ctx.fillStyle = C.red; ctx.fill();
  // the wire handle
  ctx.beginPath(); ctx.arc(X, Y - 0.5, 0.2, Math.PI, 0); ctx.strokeStyle = C.grey; ctx.lineWidth = 0.025; ctx.stroke();
  if (fortune && k > 0.3) {
    // the cookie, popped up out of the box with its fortune
    const up = 0.15 + 0.15 * k;
    ctx.beginPath();
    ctx.moveTo(X - 0.2, Y - 0.5 - up); ctx.quadraticCurveTo(X - 0.16, Y - 0.8 - up, X, Y - 0.76 - up); ctx.quadraticCurveTo(X + 0.16, Y - 0.8 - up, X + 0.2, Y - 0.5 - up);
    ctx.quadraticCurveTo(X, Y - 0.6 - up, X - 0.2, Y - 0.5 - up);
    paint(ctx, C.mustard, { dots: C.brown, density: 0.2, lw: 0.035 });
    ctx.beginPath(); ctx.rect(X - 0.02, Y - 0.66 - up, 0.32, 0.07); paint(ctx, C.white, { lw: 0.02 });
  }
  // the flaps: folded in to a peak, or thrown open to the sides
  const a = k * 1.1;
  for (const f of [-1, 1]) {
    ctx.save();
    ctx.translate(X + f * 0.24, Y - 0.5);
    ctx.rotate(f * a);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-f * 0.24, -0.16); ctx.lineTo(-f * 0.02, -0.04); ctx.closePath();
    paint(ctx, C.white, { lw: 0.03 });
    ctx.restore();
  }
  if (fortune && k <= 0.3) {
    // a slip of paper poking out between the flaps
    ctx.beginPath(); ctx.rect(X - 0.02, Y - 0.72, 0.06, 0.18); paint(ctx, C.white, { lw: 0.02 });
    ctx.fillStyle = C.red; ctx.fillRect(X - 0.005, Y - 0.69, 0.03, 0.04);
  }
}

export default {
  id: 'noodles',
  name: 'Noodle Bar',
  blurb: 'The noodle challenge has been going for 47 minutes and the bowl is somehow fuller. Somebody keeps ordering the large, and nobody has asked them to pay.',

  build(R) {
    // ---------- room shell ----------
    R.floor((ctx) => {
      slab(ctx, C.greyLight);
      checker(ctx, C.white, tint(C.coral, 0.75), 1);
      // kitchen floor: plain rubber mat
      rect(ctx, 0.3, 0.3, 15.4, 4.7, 0.005, shade(C.greyLight, 0.1), { stroke: false, dots: C.grey, density: 0.2 });
    });
    R.walls({ left: C.coral, right: tint(C.red, 0.1), cap: C.paper, dotsL: shade(C.coral, 0.3), dotsR: shade(C.red, 0.35), densL: 0.12, densR: 0.12 });

    R.decor((ctx, t) => {
      // tiled splashback behind the kitchen
      onRight(ctx, 0, 0, 16, 3.0, C.white, { dots: C.grey, density: 0.15 });
      if (Q.detail) {
        for (let x = 0.5; x < 16; x += 0.5) face(ctx, [[x, 0, 0], [x, 0, 3]], null, { lw: 0.02, stroke: C.grey });
        for (let z = 0.5; z < 3; z += 0.5) face(ctx, [[0, 0, z], [16, 0, z]], null, { lw: 0.02, stroke: C.grey });
      }
      onRight(ctx, 0, 3.0, 16, 0.15, C.red);
      // menu boards along the top of the kitchen wall
      const menu = [['RAMEN', '9'], ['UDON', '8'], ['SOBA', '8'], ['DUMPLINGS', '6']];
      menu.forEach(([name, price], i) => {
        const x = 0.7 + i * 3.8;
        onRight(ctx, x - 0.1, 3.9, 3.4, 1.9, C.brown);
        onRight(ctx, x, 4.0, 3.2, 1.7, C.ink, { dots: C.navy, density: 0.3 });
        paintText(ctx, 'right', x + 1.6, 5.25, name, 0.55, C.butter);
        paintText(ctx, 'right', x + 1.6, 4.5, price + ' COINS', 0.36, C.white);
      });
      // left wall: window to the rainy street, neon sign, door
      onLeft(ctx, 1.7, 1.4, 4.6, 2.9, C.ink);
      onLeft(ctx, 1.85, 1.55, 4.3, 2.6, C.night, { dots: C.navy, density: 0.4 });
      if (Q.detail) {
        // street lights and rain outside
        for (let i = 0; i < 5; i++) onLeft(ctx, 2.2 + i * 0.85, 1.6, 0.4, 0.5 + (i % 3) * 0.4, shade(C.purple, 0.2), { stroke: false });
        ctx.strokeStyle = alpha(C.sky, 0.7);
        ctx.lineWidth = 0.03;
        for (let i = 0; i < 12; i++) {
          const y = 2 + ((i * 0.37) % 4), z = 4 - ((t * 3 + i * 0.7) % 2.4);
          face(ctx, [[0, y, z], [0, y - 0.05, z - 0.3]], null, { stroke: alpha(C.sky, 0.7), lw: 0.03 });
        }
      }
      face(ctx, [[0, 4, 1.55], [0, 4, 4.15]], null, { stroke: C.ink, lw: 0.1 });
      const on = Math.sin(t * 7) > -0.85 || Math.sin(t * 2.3) > 0.2;
      paintText(ctx, 'left', 4.0, 3.5, 'OPEN', 0.6, on ? C.pink : shade(C.pink, 0.5));
      // neon NOODLES
      const glow = Math.floor(t * 1.3) % 7 === 3 ? 0.35 : 1;
      paintText(ctx, 'left', 10.5, 5.0, 'NOODLES', 1.05, shade(C.mustard, 0.3));
      ctx.globalAlpha = glow;
      paintText(ctx, 'left', 10.47, 5.03, 'NOODLES', 1.05, C.butter);
      ctx.globalAlpha = 1;
      // paper notices
      onLeft(ctx, 6.6, 2.0, 1.1, 1.4, C.white, { lw: 0.04 });
      paintText(ctx, 'left', 7.15, 3.05, 'SLURP', 0.3, C.red);
      paintText(ctx, 'left', 7.15, 2.65, 'LOUDLY', 0.26, C.red);
      paintText(ctx, 'left', 7.15, 2.3, 'PLEASE', 0.22, C.ink);
      onLeft(ctx, 14.6, 3.6, 1.0, 1.3, C.butter, { lw: 0.04 });
      paintText(ctx, 'left', 15.1, 4.4, 'CASH', 0.26, C.ink);
      paintText(ctx, 'left', 15.1, 4.0, 'OR FISH', 0.2, C.ink);
      // doorway to the street
      onLeft(ctx, 12.2, 0, 2.2, 3.4, C.ink);
      onLeft(ctx, 12.35, 0, 1.9, 3.25, C.night, { dots: C.navy, density: 0.35 });
    }, { anim: true });

    // Kitchen door with a noren curtain on the right wall.
    R.decor((ctx, t) => {
      onRight(ctx, 13.4, 0, 2.0, 3.2, C.ink);
      onRight(ctx, 13.5, 0, 1.8, 3.1, shade(C.brown, 0.3));
      for (let i = 0; i < 3; i++) {
        const x = 13.5 + i * 0.6, sw = Math.sin(t * 1.5 + i) * 0.04;
        face(ctx, [[x + 0.02, 0.02, 3.1], [x + 0.58, 0.02, 3.1], [x + 0.58 + sw, 0.02, 1.9], [x + 0.02 + sw, 0.02, 1.9]], C.navy, { lw: 0.03 });
      }
      paintText(ctx, 'right', 14.4, 2.6, 'STAFF', 0.35, C.white);
    }, { anim: true });

    // ---------- kitchen ----------
    // Fridge
    R.thing(2.6, 1.5, (ctx) => {
      box(ctx, 0.5, 0.3, 0, 2.1, 1.2, 3.0, C.greyLight, { top: C.white });
      face(ctx, [[1.55, 1.5, 0.1], [1.55, 1.5, 2.9]], null, { lw: 0.04 });
      box(ctx, 1.35, 1.5, 1.3, 0.08, 0.05, 0.6, C.grey, { flat: true });
      box(ctx, 1.65, 1.5, 1.3, 0.08, 0.05, 0.6, C.grey, { flat: true });
      // magnets and a drawing
      face(ctx, [[0.8, 1.51, 2.0], [1.3, 1.51, 2.0], [1.3, 1.51, 2.6], [0.8, 1.51, 2.6]], C.white, { lw: 0.03 });
      face(ctx, [[0.9, 1.52, 2.15], [1.2, 1.52, 2.45]], null, { stroke: C.coral, lw: 0.05 });
      cylinder(ctx, 1.1, 0.8, 3.0, 0.25, 0.4, C.mustard);
      cylinder(ctx, 1.9, 0.8, 3.0, 0.2, 0.55, C.teal);
    });
    // Stove with pots and a wok burner, plus the hood above.
    R.thing(7.8, 1.4, (ctx) => {
      box(ctx, 3.8, 0.2, 0, 7.2, 1.2, 1.1, C.grey, { top: shade(C.greyLight, 0.1) });
      if (Q.detail) for (let i = 0; i < 6; i++) box(ctx, 4.2 + i * 1.15, 1.4, 0.35, 0.5, 0.02, 0.35, C.ink, { flat: true, lw: 0.02 });
      cylinder(ctx, 4.8, 0.8, 1.1, 0.5, 0.95, C.greyLight, { top: shade(C.mustard, 0.1) });
      cylinder(ctx, 6.1, 0.8, 1.1, 0.45, 0.8, C.grey, { top: C.brown });
      cylinder(ctx, 10.2, 0.8, 1.1, 0.4, 0.7, C.greyLight, { top: tint(C.coral, 0.2) });
      disc(ctx, 8.4, 0.8, 1.11, 0.4, C.ink);
      // hood
      box(ctx, 3.8, 0.0, 3.2, 7.2, 1.3, 0.5, C.greyLight, { flat: true });
      face(ctx, [[4.2, 1.3, 3.2], [10.6, 1.3, 3.2]], null, { lw: 0.03 });
    });
    // Bubbling pots, and the wok cook's flames.
    R.air((ctx, t) => {
      if (!Q.detail) return;
      for (const [x, z0, s] of [[4.8, 2.05, 1], [6.1, 1.9, 2], [10.2, 1.8, 3]]) {
        particles(t, 6, 2.2, (k, r) => {
          const [X, Y] = P(x + (r() - 0.5) * 0.5 + Math.sin(k * 6 + s) * 0.2, 0.8, z0 + k * 1.3);
          ctx.beginPath(); ctx.arc(X, Y, 0.12 + k * 0.25, 0, Math.PI * 2);
          ctx.fillStyle = alpha(C.white, 0.85 * (1 - k)); ctx.fill();
          ctx.strokeStyle = alpha(C.grey, 0.5 * (1 - k)); ctx.lineWidth = 0.025; ctx.stroke();
        }, s * 7);
      }
      const tossK = pulse(t, 2.4);
      if (tossK > 0.25 && tossK < 0.75) {
        const q = (tossK - 0.25) / 0.5;
        for (let i = 0; i < 7; i++) {
          const [X, Y] = P(8.4 + Math.sin(i * 2.1) * 0.25, 0.8, 1.3 + Math.sin(q * Math.PI) * (0.9 + (i % 3) * 0.3));
          ctx.beginPath();
          ctx.moveTo(X - 0.14, Y + 0.2); ctx.quadraticCurveTo(X - 0.12, Y - 0.2, X + Math.sin(t * 20 + i) * 0.06, Y - 0.45);
          ctx.quadraticCurveTo(X + 0.12, Y - 0.2, X + 0.14, Y + 0.2); ctx.closePath();
          paint(ctx, i % 2 ? C.mustard : C.coral, { lw: 0.03 });
        }
        // flying veg
        for (let i = 0; i < 4; i++) {
          const [X, Y] = P(8.4 + (i - 1.5) * 0.15, 0.9, 1.6 + Math.sin(q * Math.PI) * 1.7 * (0.7 + i * 0.1));
          ctx.fillStyle = [C.green, C.coral, C.butter, C.leaf][i];
          ctx.fillRect(X - 0.06, Y - 0.06, 0.12, 0.12);
        }
      }
    });
    // wok cook (seen from behind), tossing
    R.mover(() => ({ x: 8.4, y: 2.1 }), (ctx, t) => {
      const k = pulse(t, 2.4);
      const lift = k > 0.2 && k < 0.5 ? 0.6 : 0;
      person(ctx, 8.4, 2.1, 0, folk(201, { back: true, dir: 'r', hat: 'cap', top: C.white, bottom: C.ink, pose: 'stand', arms: [1.2 + lift, 1.0 + lift] }), t);
      if (Q.detail && pulse(t, 12) < 0.18) speech(ctx, 8.4, 2.1, 3.3, 'FIRE IS NORMAL', { size: 0.38 });
    });
    // sink with a teetering tower of bowls and the dishwasher
    R.thing(12.6, 1.4, (ctx) => {
      box(ctx, 11.2, 0.2, 0, 2.0, 1.2, 1.1, C.greyLight, { top: C.grey });
      rect(ctx, 11.5, 0.4, 1.3, 0.8, 1.11, C.water, { dots: C.white, density: 0.3, lw: 0.03 });
      box(ctx, 11.95, 0.2, 1.1, 0.1, 0.1, 0.7, C.grey, { flat: true });
    });
    R.mover(() => ({ x: 12.7, y: 0.6 }), (ctx, t) => {
      // the tower of clean bowls, swaying
      for (let i = 0; i < 12; i++) {
        const sway = Math.sin(t * 1.6) * 0.012 * i * i * 0.1;
        const [X, Y] = P(12.95 + sway, 0.55, 1.1 + i * 0.16);
        ctx.beginPath();
        ctx.moveTo(X - 0.3, Y - 0.12); ctx.quadraticCurveTo(X, Y + 0.12, X + 0.3, Y - 0.12);
        ctx.lineTo(X + 0.26, Y - 0.16); ctx.lineTo(X - 0.26, Y - 0.16); ctx.closePath();
        paint(ctx, i % 3 ? C.white : C.sky, { lw: 0.03 });
      }
    });
    R.mover(() => ({ x: 12.1, y: 2.1 }), (ctx, t) => {
      person(ctx, 12.1, 2.1, 0, folk(202, { back: true, dir: 'r', top: C.teal, bottom: C.ink, style: 'curly', pose: 'drum', speed: 10 }), t);
      if (!Q.detail) return;
      particles(t, 5, 1.4, (k, r) => {
        const [X, Y] = P(12.1 + (r() - 0.5) * 0.8, 0.9, 1.3 + k * 1.0);
        ctx.beginPath(); ctx.arc(X, Y, 0.06 + k * 0.05, 0, Math.PI * 2);
        ctx.strokeStyle = alpha(C.sky, 1 - k); ctx.lineWidth = 0.03; ctx.stroke();
      }, 3);
    });

    // ---------- the long counter ----------
    const diners = [3.4, 4.9, 6.4, 7.9, 9.4, 10.9, 12.4];
    // Things on the counter, each drawn by the counter segment it sits on so the
    // next segment along never paints over it.
    const cups = [C.teal, C.mustard, C.coral, C.teal, C.mustard, C.coral, C.teal];
    const onCounter = [];
    diners.forEach((x, i) => {
      if (i === 4) {
        // stool five has finished: a tower of empty bowls
        onCounter.push([x, (ctx) => {
          for (let b = 0; b < 5; b++) bowl(ctx, x + 0.1, 5.7, CT_H + b * 0.13, 0.3 - b * 0.01, b % 2 ? C.sky : C.white, b % 3 ? C.red : C.navy);
        }]);
        return;
      }
      onCounter.push([x, (ctx) => {
        if (i !== 5) cylinder(ctx, x - 0.3, 5.5, CT_H, 0.1, 0.3, cups[i], { flat: true });
        bowl(ctx, x + 0.25, 5.75, CT_H, 0.3, i % 2 ? C.white : C.sky, i % 3 ? C.red : C.navy);
      }]);
    });
    for (const x of [4.35, 8.8, 11.75]) {
      onCounter.push([x, (ctx) => {
        box(ctx, x - 0.2, 5.35, CT_H, 0.4, 0.3, 0.08, C.ink, { flat: true });
        cylinder(ctx, x - 0.08, 5.5, CT_H + 0.08, 0.07, 0.35, C.red, { flat: true });
        cylinder(ctx, x + 0.1, 5.5, CT_H + 0.08, 0.07, 0.3, C.brown, { flat: true });
      }]);
    }
    // pickup bags at the left end
    onCounter.push([1.2, (ctx) => {
      for (const [x, c] of [[0.85, C.butter], [1.5, C.paperDeep]]) {
        box(ctx, x - 0.25, 5.45, CT_H, 0.5, 0.4, 0.6, c, { flat: true });
        face(ctx, [[x - 0.25, 5.85, CT_H + 0.6], [x + 0.25, 5.85, CT_H + 0.6]], null, { lw: 0.04, stroke: C.red });
      }
      label(ctx, 1.2, 5.9, CT_H + 1.0, 'PICKUP', 0.32, C.red);
    }]);
    const counterSeg = (x0, w) => (ctx) => {
      box(ctx, x0, CT_Y0, 0, w, CT_Y1 - CT_Y0, CT_H - 0.12, C.red, { left: C.red, dotsL: shade(C.red, 0.5) });
      box(ctx, x0 - 0.02, CT_Y0 - 0.05, CT_H - 0.12, w + 0.04, CT_Y1 - CT_Y0 + 0.2, 0.12, C.woodLight, { left: C.wood });
      if (Q.detail) face(ctx, [[x0, CT_Y1, 0.35], [x0 + w, CT_Y1, 0.35]], null, { lw: 0.04, stroke: C.mustard });
      for (const [x, draw] of onCounter) if (x >= x0 && x < x0 + w) draw(ctx);
    };
    const cuts = [0.4, 2.65, 4.15, 5.65, 7.15, 8.65, 10.15, 11.65, 13.15, 14];
    for (let i = 0; i < cuts.length - 1; i++) {
      const x = cuts[i], w = cuts[i + 1] - x;
      R.thing(x + w / 2, CT_Y1 + 0.15, counterSeg(x, w));
    }

    // Stools
    diners.forEach((x, i) => R.thing(x, STOOL_Y, (ctx) => stool(ctx, x, STOOL_Y, i % 2 ? C.mustard : C.red)));

    // Diners at the counter, slurping in profile.
    const dinerStyle = [
      folk(211, { top: C.teal, style: 'bun' }),
      folk(212, { top: C.navy, hat: 'cap' }),
      folk(213, { top: C.mustard, style: 'long' }),
      folk(214, { top: C.green, style: 'bun', hair: C.brown, face: hairSticks }),
      folk(215, { top: C.lilac, style: 'bald', bottom: C.brown }),
      null,
      folk(216, { top: C.purple, style: 'curly' }),
    ];
    diners.forEach((x, i) => {
      const st = dinerStyle[i];
      if (!st) return;
      R.mover(() => ({ x, y: STOOL_Y }), (ctx, t, p) => {
        const per = 3.2 + i * 0.4;
        const k = pulse(t, per, i);
        const staring = i === 6 && pulse(t, 14) > 0.55;
        const phone = i === 1, full = i === 4;
        const arms = phone ? [2.4, 0.4] : staring ? [0.6, 0.4] : full ? [0.45, 0.3] : [2.3 - Math.sin(k * Math.PI * 2) * 0.25, 1.2];
        person(ctx, x, STOOL_Y, SEAT - 0.73, { ...st, pose: 'sit', dir: staring ? 'r' : 'r', arms }, t);
        if (!Q.detail) return;
        const [X, Y] = P(x, STOOL_Y, SEAT - 0.73);
        if (phone) {
          ctx.beginPath(); ctx.roundRect(X + 0.5, Y - 2.15, 0.16, 0.28, 0.03);
          paint(ctx, C.ink, { lw: 0.02 });
          ctx.fillStyle = alpha(C.sky, 0.8); ctx.fillRect(X + 0.52, Y - 2.12, 0.12, 0.2);
          if (pulse(t, 9) < 0.25) speech(ctx, x, STOOL_Y, 3.3, 'POSTING IT', { size: 0.36 });
          return;
        }
        if (full) {
          // stuffed: leaning back, hands on his belly, now and then a burp
          if (pulse(t, 7.3, 2) < 0.18) label(ctx, x + 0.5, STOOL_Y - 0.3, 2.85, 'BURP', 0.32, C.purple);
          return;
        }
        if (staring) {
          if (pulse(t, 14) > 0.7) speech(ctx, x, STOOL_Y, 3.4, 'IS THAT A GOOSE', { size: 0.36 });
          return;
        }
        // slurp: strands shorten from the bowl up into the mouth
        const mouth = [X + 0.3, Y - 1.85];
        const [bx, by] = P(x + 0.25, 5.75, CT_H + 0.2);
        const q = k < 0.7 ? k / 0.7 : 1;
        if (k < 0.7) {
          const from = [bx + (mouth[0] - bx) * q * 0.8, by + (mouth[1] - by) * q * 0.8];
          noodles(ctx, from, mouth, t, 3, 0.15 * (1 - q), 0.06);
        }
        if (k > 0.72 && k < 0.95 && (i % 2 === 0)) label(ctx, x + 0.5, STOOL_Y - 0.3, 2.75, 'SLURP', 0.32, C.red);
        // fogged-up glasses for one diner
        if (i === 2) {
          ctx.beginPath();
          ctx.arc(X + 0.1, Y - 1.93, 0.09, 0, Math.PI * 2);
          ctx.arc(X + 0.3, Y - 1.93, 0.09, 0, Math.PI * 2);
          paint(ctx, alpha(C.white, 0.85), { lw: 0.03 });
        }
      }, { bias: 0.1 });
    });

    // The cat begging under stool four, and the noodle that falls for it.
    const CATP = 10;
    R.mover(() => ({ x: 8.5, y: 7.8 }), (ctx, t) => {
      const s = pulse(t, CATP) * CATP;
      const jump = s > 3.1 && s < 3.8 ? Math.sin(((s - 3.1) / 0.7) * Math.PI) * 0.5 : 0;
      cat(ctx, 8.5, 7.8, jump, t, { dir: 'r', up: s > 2 && s < 3.8 });
      if (!Q.detail) return;
      const [X, Y] = P(8.5, 7.8, jump);
      if (s > 3.4 && s < 5.2) {
        // noodle dangling from the cat's mouth, then gone
        const q = (s - 3.4) / 1.8;
        ctx.beginPath(); ctx.moveTo(X + 0.2, Y - 0.62); ctx.quadraticCurveTo(X + 0.3, Y - 0.3, X + 0.25 - q * 0.1, Y - 0.62 + 0.4 * (1 - q));
        ctx.strokeStyle = C.butter; ctx.lineWidth = 0.05; ctx.stroke();
      }
      if (s > 5.2 && s < 6.6) label(ctx, 8.8, 7.5, 1.3, 'PRRR', 0.3, C.brown);
    }, { bias: 0.4 });
    R.air((ctx, t) => {
      const s = pulse(t, CATP) * CATP;
      if (s < 2.4 || s > 3.4) return;
      const q = (s - 2.4) / 1.0;
      const [X, Y] = P(8.2, 7.1 + q * 0.6, 1.8 - q * 1.2);
      ctx.save(); ctx.translate(X, Y); ctx.rotate(q * 4);
      noodles(ctx, [-0.25, 0], [0.25, 0], t, 1, 0.1, 0.05);
      ctx.restore();
    });

    // On stool six, the goose, in a bib, with the large, behind a giant menu:
    // a noodle runs from its bowl over the menu's top and goes in, slurp by
    // slurp. A tap and the menu comes down.
    const menu = R.poke({ id: 'menu', at: [11.25, STOOL_Y + 0.35, 1.55], r: 0.9, say: ['MORE!', 'MORE! (Please.)'] });
    const G = 13;
    R.goose((t) => {
      const s = pulse(t, G) * G, k = menu.k();
      return { x: 10.9, y: STOOL_Y, z: SEAT + 0.02, dir: 'r', hidden: k < 0.3, pose: s > 9 && s < 10.2 ? 'honk' : 'sit' };
    }, { bias: 0.1, kind: 'poke', inside: menu, hint: 'Somebody at the counter is still reading the menu. Mid-slurp.' });
    R.thing(11.25, STOOL_Y + 0.35, (ctx, t) => {
      const k = menu.k();
      if (k < 0.5 && Q.detail) {
        // the noodle, from the bowl up over the menu's top and in (slurp by slurp)
        const q = pulse(t, 3.1);
        const [bx, by] = P(11.15, 5.75, CT_H + 0.2);
        const [mx, my] = P(11.1, STOOL_Y + 0.15, 1.95);
        const from = q < 0.75 ? [bx + (mx - bx) * q * 0.6, by + (my - by) * q * 0.6] : [mx, my];
        if (q < 0.75) noodles(ctx, from, [mx, my], t, 2, -0.2 * (1 - q), 0.05);
        if (q > 0.78 && q < 0.95) label(ctx, 11.6, STOOL_Y + 0.4, 2.55, 'SLURP', 0.3, C.red);
      }
      bigPaper(ctx, 11.25, STOOL_Y + 0.35, 0.95 - k * 0.95, 1.25 - k * 0.4, C.navy, 'MENU');
    }, { anim: true, depth: 10.9 + STOOL_Y + 0.8 });
    R.mover(() => ({ x: 10.9, y: STOOL_Y }), (ctx, t) => {
      if (menu.k() < 0.3) return;
      const s = pulse(t, G) * G;
      const honk = s > 9 && s < 10.2;
      const [X, Y] = P(10.9, STOOL_Y, SEAT + 0.02);
      // bib
      const by = honk ? -0.45 : -0.2;
      ctx.beginPath();
      ctx.moveTo(X + 0.14, Y + by - 0.3); ctx.lineTo(X + 0.5, Y + by - 0.34); ctx.lineTo(X + 0.36, Y + by + 0.12); ctx.closePath();
      paint(ctx, C.white, { dots: C.red, density: 0.35, lw: 0.03 });
      if (!Q.detail) return;
      if (!honk) {
        const k = pulse(t, 3.1);
        const beak = [X + 0.56, Y + by - 0.61];
        const [bx, by2] = P(11.15, 5.75, CT_H + 0.2);
        const q = k < 0.75 ? k / 0.75 : 1;
        if (k < 0.75) noodles(ctx, [bx + (beak[0] - bx) * q * 0.7, by2 + (beak[1] - by2) * q * 0.7], beak, t, 2, 0.1, 0.05);
      } else {
        speech(ctx, 10.9, STOOL_Y, 2.7, 'MORE!', { size: 0.4 });
      }
    }, { bias: 0.2 });

    // ---------- the noodle chef ----------
    const CH = 3.6;
    const chefHands = (t) => {
      const s = pulse(t, CH) * CH;
      if (s < 2.4) {
        const spread = 0.5 + 0.5 * Math.sin((s / 2.4) * Math.PI * 3 - Math.PI / 2);
        return { aA: 1.0 + spread * 0.9, aB: -(1.0 + spread * 0.9), slap: 0, s };
      }
      if (s < 2.9) { const q = (s - 2.4) / 0.5; return { aA: 1.9 + q * 1.0, aB: -1.9 + q * 3.8, slap: 0, s, up: q }; }
      if (s < 3.2) { const q = (s - 2.9) / 0.3; return { aA: 2.9 - q * 2.2, aB: 1.9 - q * 1.2, slap: q, s }; }
      return { aA: 0.7, aB: 0.7, slap: 1, s };
    };
    const CHX = 6.4, CHY = 4.3;
    R.mover(() => ({ x: CHX, y: CHY }), (ctx, t) => {
      const h = chefHands(t);
      person(ctx, CHX, CHY, 0, { skin: SKIN[1], hair: C.ink, style: 'short', top: C.white, bottom: C.ink, hat: 'chef', pose: 'stand', dir: 'l', arms: [h.aA, h.aB] }, t);
      if (Q.detail && h.s > 3.0) label(ctx, CHX + 1.2, CHY + 0.4, 2.4, 'SLAP!', 0.45, C.red);
      if (Q.detail && pulse(t, 24) > 0.42 && pulse(t, 24) < 0.52) speech(ctx, CHX, CHY, 3.3, 'ORDER UP!', { size: 0.42 });
    });
    // noodles in the chef's hands, drawn just in front of the counter top
    R.mover(() => ({ x: CHX, y: CHY }), (ctx, t) => {
      const h = chefHands(t);
      const [X, Y] = P(CHX, CHY, 0);
      const f = -1; // facing left
      const hand = (a, sx) => [X + f * (sx + Math.sin(a) * 0.72), Y - 1.53 + Math.cos(a) * 0.72];
      const A = hand(h.aA, 0.22), B = hand(h.aB, -0.22);
      const [cx, cy] = P(CHX + 0.2, 5.6, CT_H + 0.02);
      if (h.slap < 1) {
        const d = Math.abs(A[0] - B[0]);
        noodles(ctx, A, B, t, 4, 0.9 - d * 0.35 + (h.up ? -0.6 * h.up : 0), 0.03);
      } else {
        // the slapped pile on the counter
        ctx.beginPath(); ctx.ellipse(cx, cy, 0.55, 0.18, 0, 0, Math.PI * 2);
        paint(ctx, C.butter, { dots: C.wood, density: 0.2, lw: 0.035 });
        noodles(ctx, [cx - 0.5, cy], [cx + 0.5, cy], t, 3, 0.05, 0.05);
      }
      if (!Q.detail) return;
      // flour puff on the slap
      const s = h.s;
      if (s > 3.05) {
        const q = (s - 3.05) / (CH - 3.05);
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2;
          const px = cx + Math.cos(a) * (0.3 + q * 1.1), py = cy - Math.abs(Math.sin(a)) * q * 0.9 - q * 0.3;
          ctx.beginPath(); ctx.arc(px, py, 0.1 + q * 0.18, 0, Math.PI * 2);
          ctx.fillStyle = alpha(C.white, 0.9 * (1 - q)); ctx.fill();
        }
      }
    }, { depth: 20.6 });

    // ---------- front of house: tables ----------
    // Table 1: a couple sharing one very long noodle.
    const T1 = [4.3, 11.2], TEA = [T1[0] - 0.45, T1[1] - 0.45];
    R.thing(T1[0] - 0.7, T1[1] + 0.7, (ctx) => chairAt(ctx, T1[0] - 0.7, T1[1] + 0.7, C.teal));
    R.thing(T1[0] + 0.7, T1[1] - 0.7, (ctx) => chairAt(ctx, T1[0] + 0.7, T1[1] - 0.7, C.teal));
    R.thing(T1[0], T1[1], (ctx) => { roundTable(ctx, T1[0], T1[1]); });
    const LOVE = 11;
    R.mover(() => ({ x: T1[0], y: T1[1] }), (ctx, t) => {
      const s = pulse(t, LOVE) * LOVE;
      const lean = s < 6 ? ease(s / 6) * 0.35 : s < 8 ? 0.35 : 0.35 * (1 - clamp((s - 8) / 0.6));
      const ax = T1[0] - 0.7 + lean * 0.5, ay = T1[1] + 0.7 - lean * 0.5;
      const bx = T1[0] + 0.7 - lean * 0.5, by = T1[1] - 0.7 + lean * 0.5;
      // their pot of tea (a goose lookalike, well away from the real one)
      gooseTeapot(ctx, TEA[0], TEA[1], CT_H);
      bowl(ctx, T1[0], T1[1], CT_H, 0.36, C.white, C.red);
      person(ctx, ax, ay, 0.02, folk(221, { pose: 'sit', dir: 'r', top: C.pink, style: 'long', arms: [1.2, 1.0] }), t);
      person(ctx, bx, by, 0.02, folk(222, { pose: 'sit', dir: 'l', top: C.navy, hat: 'none', arms: [1.2, 1.0] }), t);
      if (!Q.detail) return;
      const [AX, AY] = P(ax, ay, 0.02), [BX, BY] = P(bx, by, 0.02);
      const [cx, cy] = P(T1[0], T1[1], CT_H + 0.2);
      const ma = [AX + 0.3, AY - 1.85], mb = [BX - 0.3, BY - 1.85];
      if (s < 8) {
        ctx.lineCap = 'round';
        for (const [w, c] of [[0.1, C.ink], [0.05, C.butter]]) {
          ctx.beginPath(); ctx.moveTo(ma[0], ma[1]); ctx.quadraticCurveTo(cx, cy + 0.2 - lean * 1.5, mb[0], mb[1]);
          ctx.strokeStyle = c; ctx.lineWidth = w; ctx.stroke();
        }
      }
      if (s > 6 && s < 8.6) {
        const beat = 1 + Math.abs(Math.sin(t * 4)) * 0.25;
        const hx = (ma[0] + mb[0]) / 2, hy = Math.min(ma[1], mb[1]) - 0.7 - (s - 6) * 0.2;
        ctx.save(); ctx.translate(hx, hy); ctx.scale(beat * 1.3, beat * 1.3);
        ctx.beginPath(); ctx.moveTo(0, 0.12); ctx.bezierCurveTo(-0.3, -0.1, -0.12, -0.3, 0, -0.12); ctx.bezierCurveTo(0.12, -0.3, 0.3, -0.1, 0, 0.12);
        paint(ctx, C.pink, { lw: 0.03 });
        ctx.restore();
      }
      if (s > 8.6 && s < 10) speech(ctx, T1[0], T1[1], 3.3, 'OOPS, SNAPPED', { size: 0.38 });
    }, { bias: 0.5 });

    // Table 2: the bottomless noodle challenge.
    const T2 = [10.3, 12.8];
    R.thing(T2[0] - 0.7, T2[1] + 0.7, (ctx) => chairAt(ctx, T2[0] - 0.7, T2[1] + 0.7, C.mustard));
    R.thing(T2[0] + 0.7, T2[1] - 0.7, (ctx) => chairAt(ctx, T2[0] + 0.7, T2[1] - 0.7, C.mustard));
    R.thing(T2[0], T2[1], (ctx) => roundTable(ctx, T2[0], T2[1]));
    R.mover(() => ({ x: T2[0], y: T2[1] }), (ctx, t) => {
      // giant bowl
      const [X, Y] = P(T2[0], T2[1], CT_H);
      ctx.beginPath();
      ctx.moveTo(X - 1.0, Y - 0.6); ctx.quadraticCurveTo(X - 0.9, Y + 0.35, X, Y + 0.38); ctx.quadraticCurveTo(X + 0.9, Y + 0.35, X + 1.0, Y - 0.6);
      ctx.closePath();
      paint(ctx, C.white, { dots: C.sky, density: 0.3, lw: 0.05 });
      ctx.beginPath(); ctx.ellipse(X, Y - 0.6, 1.0, 0.45, 0, 0, Math.PI * 2); paint(ctx, C.navy, { lw: 0.05 });
      ctx.beginPath(); ctx.ellipse(X, Y - 0.62, 0.85, 0.36, 0, 0, Math.PI * 2); paint(ctx, C.mustard, { stroke: false, dots: C.butter, density: 0.5 });
      // mountain of noodles that never shrinks
      if (Q.detail) noodles(ctx, [X - 0.6, Y - 0.62], [X + 0.6, Y - 0.62], t * 0.3, 4, -0.35, 0.06);
      const ch = folk(231, { pose: 'sit', dir: 'r', top: C.coral, hat: 'none', style: 'bald', arms: [2.3 + Math.sin(t * 6) * 0.2, 1.2] });
      const [ax, ay] = [T2[0] - 0.7, T2[1] + 0.7];
      person(ctx, ax, ay, 0.02, ch, t);
      const fr = folk(232, { pose: 'sit', dir: 'l', top: C.teal, style: 'pony', arms: [Math.PI - 0.4 + Math.sin(t * 8) * 0.2, -Math.PI + 0.4] });
      person(ctx, T2[0] + 0.7, T2[1] - 0.7, 0.02, fr, t);
      if (!Q.detail) return;
      const [AX, AY] = P(ax, ay, 0.02);
      noodles(ctx, [X - 0.3, Y - 0.8], [AX + 0.3, AY - 1.85], t, 3, -0.1, 0.07);
      if (pulse(t, 5) < 0.4) speech(ctx, T2[0] + 0.7, T2[1] - 0.7, 3.2, 'KEEP GOING!', { size: 0.38 });
    }, { bias: 0.5 });
    // challenge sign with a timer that only counts up
    const SGY = 12.2;
    R.thing(12.6, SGY + 0.1, (ctx, t) => {
      box(ctx, 12.55, SGY - 0.05, 0, 0.1, 0.1, 1.5, C.ink, { flat: true, stroke: false });
      face(ctx, [[11.8, SGY, 1.5], [13.4, SGY, 1.5], [13.4, SGY, 2.9], [11.8, SGY, 2.9]], C.butter, { lw: 0.05 });
      ctx.save(); ctx.translate(-SGY - 0.01, (SGY + 0.01) / 2);
      paintText(ctx, 'right', 12.6, 2.6, 'NOODLE', 0.36, C.red);
      paintText(ctx, 'right', 12.6, 2.25, 'CHALLENGE', 0.3, C.red);
      const secs = Math.floor(47 * 60 + 12 + t);
      const mm = Math.floor(secs / 60) % 100, ss = secs % 60;
      paintText(ctx, 'right', 12.6, 1.78, `${mm}:${String(ss).padStart(2, '0')}`, 0.36, C.ink);
      ctx.restore();
    }, { anim: true });

    // Table 3: a toddler flinging noodles onto a patient parent.
    const T3 = [13.4, 9.6];
    R.thing(T3[0] - 0.7, T3[1] + 0.7, (ctx) => chairAt(ctx, T3[0] - 0.7, T3[1] + 0.7, C.red));
    R.thing(T3[0] + 0.7, T3[1] - 0.7, (ctx) => {
      // high chair
      for (const [dx, dy] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) box(ctx, T3[0] + 0.7 + dx - 0.04, T3[1] - 0.7 + dy - 0.04, 0, 0.08, 0.08, 1.3, C.wood, { flat: true, stroke: false });
      box(ctx, T3[0] + 0.35, T3[1] - 1.05, 1.3, 0.7, 0.7, 0.1, C.wood);
    });
    R.thing(T3[0], T3[1], (ctx) => roundTable(ctx, T3[0], T3[1]));
    const FL = 6;
    R.mover(() => ({ x: T3[0], y: T3[1] }), (ctx, t) => {
      const s = pulse(t, FL) * FL;
      bowl(ctx, T3[0] + 0.3, T3[1] - 0.3, CT_H, 0.25, C.mustard, C.teal);
      bowl(ctx, T3[0] - 0.3, T3[1] + 0.3, CT_H, 0.3, C.white, C.red);
      const [px, py] = [T3[0] - 0.7, T3[1] + 0.7];
      person(ctx, px, py, 0.02, folk(241, { pose: 'sit', dir: 'r', top: C.lilac, style: 'short', hat: 'none', arms: s > 2 && s < 4 ? [Math.PI - 0.5, 1.0] : [1.3, 1.0] }), t);
      const [kx, ky] = [T3[0] + 0.7, T3[1] - 0.7];
      person(ctx, kx, ky, 0.5, folk(242, { pose: 'sit', dir: 'l', scale: 0.62, top: C.mustard, style: 'curly', arms: s < 1.2 ? [Math.PI - 0.3 - s, 0.5] : [0.8, 0.5] }), t);
      if (!Q.detail) return;
      const [PX, PY] = P(px, py, 0.02);
      const head = [PX + 0.02, PY - 2.25];
      if (s > 0.6 && s < 1.6) {
        const q = (s - 0.6) / 1.0;
        const [KX, KY] = P(kx, ky, 0.5 + 1.2);
        const x = KX + (head[0] - KX) * q, y = KY + (head[1] - KY) * q - Math.sin(q * Math.PI) * 1.2;
        ctx.save(); ctx.translate(x, y); ctx.rotate(q * 8);
        noodles(ctx, [-0.2, 0], [0.2, 0], t, 2, 0.1, 0.03);
        ctx.restore();
      }
      if (s >= 1.6) {
        // noodle wig
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(head[0] - 0.25 + i * 0.15, head[1] - 0.05);
          ctx.quadraticCurveTo(head[0] - 0.3 + i * 0.2, head[1] + 0.3, head[0] - 0.25 + i * 0.17 + Math.sin(t * 3 + i) * 0.03, head[1] + 0.45 + (i % 2) * 0.1);
          ctx.strokeStyle = C.ink; ctx.lineWidth = 0.09; ctx.lineCap = 'round'; ctx.stroke();
          ctx.strokeStyle = C.butter; ctx.lineWidth = 0.05; ctx.stroke();
        }
      }
      if (s > 0.1 && s < 1) speech(ctx, kx, ky, 2.5, 'WHEE', { size: 0.34 });
      if (s > 2.2 && s < 4) speech(ctx, px, py, 2.7, 'THANKS, DEAR', { size: 0.34, dx: -0.7 });
    }, { bias: 0.5 });

    // The waiter, looping out of the kitchen with a tray. (His lane runs a
    // step in front of the stools, so he doesn't walk through the diners or
    // the cat.)
    const waiter = route([[15.0, 4.2, 1.2], [15.0, 8.2], [8.9, 8.3], [7.5, 10.2], [9.0, 11.6, 1.4], [8.6, 14.9], [13.2, 15.0], [14.9, 12.0], [14.9, 10.6, 1.4], [15.0, 8.2]], { speed: 1.3 });
    R.mover(waiter, (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, {
        skin: SKIN[2], hair: C.ink, style: 'short', top: C.white, bottom: C.ink, pose: p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back,
        arms: [2.0, -0.2],
        hold: (c) => {
          c.beginPath(); c.ellipse(0.35, -0.5, 0.55, 0.12, 0, 0, Math.PI * 2); paint(c, C.grey, { lw: 0.03 });
          for (const dx of [0.1, 0.55]) {
            c.beginPath(); c.moveTo(dx - 0.18, -0.62); c.quadraticCurveTo(dx, -0.45, dx + 0.18, -0.62); c.closePath(); paint(c, C.white, { lw: 0.03 });
            if (Q.detail) {
              const k = (t * 0.9 + dx) % 1;
              c.beginPath(); c.moveTo(dx, -0.7 - k * 0.4); c.quadraticCurveTo(dx + 0.08, -0.8 - k * 0.4, dx, -0.9 - k * 0.4);
              c.strokeStyle = alpha(C.grey, 1 - k); c.lineWidth = 0.03; c.stroke();
            }
          }
        },
      }, t);
    });

    // The delivery rider: in through the street door, collect, out again.
    const riderIn = track([[-0.6, 13.3], [1.4, 13.1], [1.9, 7.2]], 1.6);
    const riderOut = track([[1.9, 7.2], [1.4, 13.1], [-0.6, 13.3]], 1.8);
    const RIDE = 26;
    const rider = (t) => {
      let s = pulse(t, RIDE) * RIDE;
      if (s < riderIn.T) return { ...riderIn(s), bag: false };
      s -= riderIn.T;
      if (s < 4) return { x: 1.9, y: 7.2, dir: 'l', back: true, moving: false, wait: s };
      s -= 4;
      if (s < riderOut.T) return { ...riderOut(s), bag: true };
      return { x: -2, y: 13.3, hidden: true };
    };
    R.mover(rider, (ctx, t, p) => {
      if (p.hidden) return;
      const a = clamp((p.x + 0.4) / 0.8);
      ctx.save();
      ctx.globalAlpha = a;
      // square delivery backpack behind the rider
      const [X, Y] = P(p.x, p.y, 0);
      const f = p.dir === 'l' ? -1 : 1;
      if (!p.back) {
        ctx.beginPath(); ctx.rect(X - f * 0.55 - 0.3, Y - 1.85, 0.6, 0.72); paint(ctx, C.teal, { dots: C.navy, density: 0.2, lw: 0.04 });
      }
      person(ctx, p.x, p.y, 0, {
        skin: SKIN[3], hair: C.ink, top: C.teal, bottom: C.ink, hat: 'helmet', pose: p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back, speed: 9,
        hold: p.bag ? (c) => { c.beginPath(); c.rect(-0.05, 0.1, 0.4, 0.45); paint(c, C.butter, { lw: 0.03 }); } : null,
      }, t);
      if (p.back) {
        ctx.beginPath(); ctx.rect(X - 0.36, Y - 1.72, 0.72, 0.72); paint(ctx, C.teal, { dots: C.navy, density: 0.2, lw: 0.04 });
        label(ctx, p.x, p.y, 1.2, 'ZOOM', 0.22, C.white);
      }
      ctx.restore();
      if (!Q.detail) return;
      if (p.wait !== undefined && p.wait < 1.8) speech(ctx, p.x, p.y, 3.0, 'ORDER 42?', { size: 0.4 });
      if (p.wait !== undefined && p.wait > 2.2) speech(ctx, p.x, p.y, 3.0, 'THANKS!', { size: 0.4 });
    }, { bias: 0.2 });
    // the street door, swinging open when the rider passes
    R.mover(() => ({ x: 0.4, y: 14.4 }), (ctx, t) => {
      const p = rider(t);
      const near = p.hidden ? 0 : clamp(1.6 - Math.hypot(p.x - 0.3, p.y - 13.3));
      const a = near * 1.2;
      const hx = 0, hy = 14.3, L = 1.9;
      const ex = Math.sin(a) * L, ey = hy - Math.cos(a) * L;
      face(ctx, [[hx, hy, 0], [ex, ey, 0], [ex, ey, 3.2], [hx, hy, 3.2]], C.red, { dots: shade(C.red, 0.4), density: 0.15 });
      face(ctx, [[hx * 0.8 + ex * 0.2, hy * 0.8 + ey * 0.2, 1.6], [hx * 0.2 + ex * 0.8, hy * 0.2 + ey * 0.8, 1.6], [hx * 0.2 + ex * 0.8, hy * 0.2 + ey * 0.8, 2.8], [hx * 0.8 + ex * 0.2, hy * 0.8 + ey * 0.2, 2.8]], alpha(C.sky, 0.8), { lw: 0.03 });
    });

    // ---------- by the door: umbrellas, a wet customer, a fish tank ----------
    R.thing(0.9, 15.3, (ctx) => {
      cylinder(ctx, 0.9, 15.1, 0, 0.35, 0.8, C.navy);
      const cols = [C.mustard, C.teal, C.pink];
      cols.forEach((c, i) => {
        const [X, Y] = P(0.8 + i * 0.12, 15.0 + i * 0.1, 0.7);
        ctx.beginPath();
        ctx.moveTo(X - 0.12 + i * 0.1, Y); ctx.lineTo(X - 0.3 + i * 0.2, Y - 1.3); ctx.lineTo(X + 0.2 + i * 0.05, Y - 1.2); ctx.closePath();
        paint(ctx, c, { lw: 0.03 });
        ctx.beginPath(); ctx.arc(X - 0.28 + i * 0.2, Y - 1.4, 0.08, Math.PI, 0); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
      });
    });
    R.rug((ctx, t) => {
      const k = 0.5 + 0.5 * Math.sin(t * 0.3);
      disc(ctx, 1.3, 15.3, 0.01, 0.7 + k * 0.3, alpha(C.sky, 0.6), { stroke: alpha(C.navy, 0.3), lw: 0.03 });
      disc(ctx, 2.9, 14.6, 0.01, 0.6, alpha(C.sky, 0.5), { stroke: false });
    }, { anim: true });
    R.mover(() => ({ x: 2.9, y: 14.6 }), (ctx, t) => {
      const shake = pulse(t, 8) < 0.2;
      const [X, Y] = P(2.9, 14.6, 0);
      ctx.save();
      if (shake) { ctx.translate(X, Y); ctx.rotate(Math.sin(t * 30) * 0.08); ctx.translate(-X, -Y); }
      person(ctx, 2.9, 14.6, 0, folk(251, { pose: 'stand', dir: 'r', top: C.sky, style: 'long', hat: 'none', arms: [0.5, -0.2] }), t);
      ctx.restore();
      if (!Q.detail) return;
      particles(t, 6, 0.9, (k, r) => {
        const [dx, dy] = [(r() - 0.5) * 1.2, r() * 0.4];
        ctx.beginPath(); ctx.arc(X + dx * (shake ? 1.6 : 0.6), Y - 1.4 - dy + k * 1.4, 0.05, 0, Math.PI * 2);
        ctx.fillStyle = alpha(C.water, 1 - k); ctx.fill();
      }, 9);
      if (pulse(t, 8) > 0.3 && pulse(t, 8) < 0.6) speech(ctx, 2.9, 14.6, 2.9, 'TABLE FOR ONE?', { size: 0.36 });
    });
    // fish tank on a stand, with a kid squashed against the glass
    R.mover(() => ({ x: 6.2, y: 14.4 }), (ctx, t) => {
      person(ctx, 6.1, 14.4, 0, folk(252, { pose: 'stand', dir: 'l', scale: 0.66, top: C.red, hat: 'beanie', arms: [2.4, -2.4] }), t);
    });
    R.thing(7.0, 15.6, (ctx, t) => {
      box(ctx, 5.0, 14.9, 0, 2.0, 0.7, 0.8, C.brown);
      box(ctx, 5.0, 14.9, 0.8, 2.0, 0.7, 1.0, alpha(C.water, 0.55), { top: alpha(C.sky, 0.6), left: alpha(C.water, 0.45), right: alpha(C.water, 0.5), flat: true });
      if (!Q.detail) return;
      // weed and bubbles
      for (const x of [5.3, 6.6]) {
        const [X, Y] = P(x, 15.25, 0.8);
        ctx.beginPath(); ctx.moveTo(X, Y); ctx.quadraticCurveTo(X + Math.sin(t * 2 + x) * 0.15, Y - 0.5, X, Y - 0.9);
        ctx.strokeStyle = C.green; ctx.lineWidth = 0.08; ctx.stroke();
      }
      particles(t, 4, 2, (k, r) => {
        const [X, Y] = P(5.5 + r() * 1.2, 15.25, 0.9 + k * 0.85);
        ctx.beginPath(); ctx.arc(X, Y, 0.05, 0, Math.PI * 2); ctx.strokeStyle = C.white; ctx.lineWidth = 0.025; ctx.stroke();
      }, 4);
      for (let i = 0; i < 3; i++) {
        const u = Math.sin(t * (0.5 + i * 0.2) + i * 2);
        const [X, Y] = P(6.0 + u * 0.75, 15.3, 1.2 + i * 0.22);
        const f = Math.cos(t * (0.5 + i * 0.2) + i * 2) > 0 ? 1 : -1;
        ctx.beginPath();
        ctx.ellipse(X, Y, 0.13, 0.08, 0, 0, Math.PI * 2);
        ctx.moveTo(X - f * 0.12, Y); ctx.lineTo(X - f * 0.25, Y - 0.08); ctx.lineTo(X - f * 0.25, Y + 0.08); ctx.closePath();
        paint(ctx, [C.coral, C.mustard, C.pink][i], { lw: 0.025 });
      }
      label(ctx, 6.0, 15.6, 0.45, 'DO NOT EAT', 0.2, C.butter);
    }, { anim: true });

    // ---------- lanterns ----------
    R.air((ctx, t) => {
      const cables = [[[0, 9, 5.9], [9, 0, 5.9]], [[0, 15.5, 5.8], [15.5, 0, 5.8]]];
      cables.forEach(([a, b], ci) => {
        const n = 12, pts = [];
        for (let i = 0; i <= n; i++) {
          const k = i / n;
          pts.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] - Math.sin(k * Math.PI) * 0.7]);
        }
        ctx.beginPath();
        pts.forEach((p, i) => { const [X, Y] = P(...p); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.04; ctx.stroke();
        const cols = [C.red, C.coral, C.red, C.mustard];
        for (let i = 2; i < n - 1; i += ci ? 2 : 3) {
          const p = pts[i];
          lantern(ctx, p[0], p[1], p[2], ci ? 1.2 : 0.9, t, i + ci * 5, cols[(i + ci) % 4]);
        }
      });
    });

    // ---------- plants, shelf with the lucky cat, finds ----------
    R.thing(15.2, 15.2, (ctx, t) => plant(ctx, 15.2, 15.2, 0, t, { kind: 'palm', scale: 1.5, potColor: C.navy }), { anim: true });
    R.thing(0.9, 10.8, (ctx, t) => plant(ctx, 0.9, 10.8, 0, t, { kind: 'bush', scale: 1.3, potColor: C.mustard }), { anim: true });
    R.thing(15.2, 3.6, (ctx, t) => plant(ctx, 15.2, 3.6, 0, t, { kind: 'spiky', scale: 1.0, potColor: C.red }), { anim: true });
    // wall shelf on the left wall
    R.decor((ctx) => {
      box(ctx, 0, 7.0, 3.0, 0.7, 3.8, 0.1, C.wood);
      const jars = [[7.3, C.red, 0.5], [7.75, C.mustard, 0.35], [8.15, C.green, 0.6], [10.4, C.teal, 0.45]];
      for (const [y, c, h] of jars) {
        box(ctx, 0.15, y - 0.17, 3.1, 0.34, 0.34, h, c, { flat: true, lw: 0.03 });
        box(ctx, 0.12, y - 0.2, 3.1 + h, 0.4, 0.4, 0.07, C.ink, { flat: true, lw: 0.02 });
      }
      // tiny bonsai
      box(ctx, 0.12, 9.95, 3.1, 0.4, 0.3, 0.15, C.brown, { flat: true, lw: 0.03 });
      const [X, Y] = P(0.3, 10.1, 3.35);
      ctx.beginPath(); ctx.arc(X, Y - 0.1, 0.18, 0, Math.PI * 2); ctx.arc(X + 0.18, Y - 0.2, 0.14, 0, Math.PI * 2);
      paint(ctx, C.green, { lw: 0.03 });
    });
    R.decor((ctx, t) => luckyCat(ctx, 0.35, 9.1, 3.12, t), { anim: true });
    R.find({ id: 'luckycat', label: 'A lucky cat', at: [0.35, 9.1, 3.55], r: 0.7 });

    // Two takeaway boxes waiting at the pickup end of the counter. One has a
    // fortune's slip of paper poking out of its flaps; tap it and the flaps
    // pop open on a fortune cookie. The other is yesterday's.
    const BOXES = [[1.95, 5.6], [2.38, 5.85]];
    const box1 = R.poke({ id: 'takeaway', at: [BOXES[0][0], BOXES[0][1], CT_H + 0.38], r: 0.75 });
    const box2 = R.poke({ id: 'leftovers', at: [BOXES[1][0], BOXES[1][1], CT_H + 0.38], r: 0.75, hold: 1.5, say: ["Yesterday's noodles.", 'Still cold.', 'Do not open. Again.'] });
    R.thing(2.7, CT_Y1 + 0.2, (ctx, t) => {
      takeaway(ctx, BOXES[0][0], BOXES[0][1], CT_H, box1.k(), true);
      takeaway(ctx, BOXES[1][0], BOXES[1][1], CT_H, box2.k(), false);
    }, { anim: true, depth: 9.8 });
    R.find({ id: 'fortune', label: 'A fortune cookie', kind: 'poke', inside: box1, at: [BOXES[0][0], BOXES[0][1], CT_H + 0.75], r: 0.7, hint: 'Two takeaway boxes wait for pickup, and one has a fortune poking out.' });

    // Somebody's chopsticks aren't on the floor any more: they're holding up
    // her bun, at the counter.
    R.find({ id: 'chopsticks', label: 'A pair of chopsticks', kind: 'hard', at: [7.8, STOOL_Y, 2.25], r: 0.6, riddle: "Holding up somebody's hairdo.", hint: 'One of the diners at the counter has put her hair up with them.' });

    // The kitchen bell on the pass: tap it and the whole kitchen shouts.
    const bell = R.poke({ id: 'bell', at: [5.0, 5.45, CT_H + 0.15], r: 0.55, sound: 'tick', hold: 0.6, say: ['ORDER UP!', 'ORDER UP AGAIN!', 'Nobody ordered that.'] });
    R.thing(5.2, CT_Y1 + 0.2, (ctx, t) => {
      const k = bell.k(), j = k * Math.sin(t * 40) * 0.04;
      cylinder(ctx, 5.0, 5.45, CT_H, 0.2, 0.05, C.ink);
      const [X, Y] = P(5.0, 5.45, CT_H + 0.05);
      ctx.beginPath(); ctx.moveTo(X - 0.18 + j, Y); ctx.quadraticCurveTo(X - 0.17 + j, Y - 0.26, X + j, Y - 0.26); ctx.quadraticCurveTo(X + 0.17 + j, Y - 0.26, X + 0.18 + j, Y); ctx.closePath();
      paint(ctx, C.mustard, { lw: 0.03 });
      ctx.beginPath(); ctx.arc(X + j, Y - 0.3 + k * 0.04, 0.05, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.025 });
      if (k > 0.1 && Q.detail) {
        ctx.strokeStyle = alpha(C.ink, k); ctx.lineWidth = 0.03; ctx.beginPath();
        for (const f of [-1, 1]) { ctx.moveTo(X + f * 0.28, Y - 0.3); ctx.lineTo(X + f * 0.42, Y - 0.42); }
        ctx.stroke();
      }
    }, { anim: true, depth: 5.2 + CT_Y1 + 0.3 });

    // The goose teapot on the couple's table: its spout steams now and then.
    R.decoy({ id: 'teapot', at: [TEA[0], TEA[1], CT_H + 0.45], r: 0.6, say: ['A teapot. It honks when it boils.', 'Still a teapot.', 'It is not boiling. Yet.'] });
    R.air((ctx, t) => {
      if (!Q.detail) return;
      const k = pulse(t, 6);
      if (k > 0.4) return;
      const q = k / 0.4;
      const [X, Y] = P(TEA[0] + 0.25, TEA[1] - 0.25, CT_H + 0.95 + q * 0.6);
      ctx.beginPath(); ctx.arc(X + q * 0.2, Y, 0.08 + q * 0.14, 0, Math.PI * 2);
      ctx.fillStyle = alpha(C.white, 0.85 * (1 - q)); ctx.fill();
      ctx.strokeStyle = alpha(C.grey, 0.5 * (1 - q)); ctx.lineWidth = 0.025; ctx.stroke();
    });

    // The noodle challenger and the fish tank answer back. The challenger is
    // big, near the front: a first visit gets nudged to tap him.
    R.poke({ id: 'challenger', at: [T2[0] - 0.4, T2[1] + 0.4, 1.6], r: 1.1, teach: true, say: ['Not... full... yet.', 'Minute forty-eight.', 'I can see the bottom. No I cannot.'] });
    R.poke({ id: 'tank', at: [6.0, 15.25, 1.3], r: 0.8, sound: 'clunk', say: ['DO NOT EAT.', 'They are not on the menu.', 'The fish say hi.'] });

    // A tip jar and a register at the right end of the counter.
    R.thing(13.5, CT_Y1 + 0.35, (ctx, t) => {
      box(ctx, 12.9, 5.35, CT_H, 0.9, 0.6, 0.45, C.navy);
      box(ctx, 13.0, 5.4, CT_H + 0.45, 0.6, 0.3, 0.25, C.ink, { flat: true });
      label(ctx, 13.3, 5.6, CT_H + 0.62, '$', 0.2, C.mustard);
      cylinder(ctx, 13.6, 6.0, CT_H, 0.16, 0.35, alpha(C.sky, 0.7));
    });
  },
};
