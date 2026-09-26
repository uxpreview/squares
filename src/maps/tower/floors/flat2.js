// Apartment 2B: a seventh birthday party at full volume. Cake queue, a
// magician losing his rabbit, a toddler with a spaghetti arm, a dad who can
// sleep through anything, and a leak from the overflowing bath in 3A.
import {
  C, box, rect, disc, cylinder, face, poly, paint, person, folk, plant, walls, slab, planks, checker,
  windowL, windowR, onLeft, onRight, frame, lamp, chair, table, speech, label, paintText,
  shade, tint, alpha, dots, Q, P, SKIN, HAIR, rng, pick,
} from '../../../engine/art.js';
import { route, orbit, particles, pulse, clamp, ease } from '../../../engine/actors.js';
import { ZK } from '../../../engine/iso.js';

const PI = Math.PI;
const lerp = (a, b, k) => a + (b - a) * k;
const PARTY = [C.coral, C.teal, C.mustard, C.pink, C.purple, C.sky];

// ---------- little drawing helpers ----------

// Draw in a person-like local frame: origin on the floor at (x, y, z), 1 = 1 unit.
function local(ctx, x, y, z, s, f, fn) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(f * s, s);
  fn(ctx);
  ctx.restore();
}

// Draw flat on a back wall, centered at (u, v): +x local is screen right, +y is down.
function onWall(ctx, plane, u, v, fn) {
  ctx.save();
  if (plane === 'left') ctx.transform(1, -0.5, 0, ZK, -u, u / 2 - v * ZK);
  else ctx.transform(1, 0.5, 0, ZK, u, u / 2 - v * ZK);
  fn(ctx);
  ctx.restore();
}

// Draw flat on the floor, local (a, b) = world (x + a, y + b).
function onFloor(ctx, x, y, fn) {
  ctx.save();
  ctx.transform(1, 0.5, -1, 0.5, x - y, (x + y) / 2);
  fn(ctx);
  ctx.restore();
}

// Walk along a polyline by fraction k (0..1 of total length).
function along(pts, k) {
  const L = [];
  let tot = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    L.push(l);
    tot += l;
  }
  let d = clamp(k) * tot;
  for (let i = 0; i < L.length; i++) {
    if (d <= L[i] || i === L.length - 1) {
      const q = L[i] ? clamp(d / L[i]) : 0;
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      return { x: lerp(ax, bx, q), y: lerp(ay, by, q), ...facing(bx - ax, by - ay) };
    }
    d -= L[i];
  }
  return { x: pts[0][0], y: pts[0][1], dir: 'r', back: false };
}
const facing = (dx, dy) => ({ dir: dx - dy >= 0 ? 'r' : 'l', back: dx + dy < -0.01 });

function balloon(ctx, X, Y, r, color, t, i = 0, string = 1.2) {
  if (Q.detail && string) {
    ctx.beginPath();
    ctx.moveTo(X, Y + r * 1.15);
    for (let k = 1; k <= 6; k++) ctx.lineTo(X + Math.sin(t * 2 + k + i) * 0.06, Y + r * 1.15 + (k / 6) * string);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.025;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(X, Y, r, r * 1.15, 0, 0, PI * 2);
  paint(ctx, color, { dots: shade(color, 0.35), density: 0.14, lw: 0.04 });
  ctx.beginPath();
  ctx.moveTo(X - 0.06, Y + r * 1.25); ctx.lineTo(X + 0.06, Y + r * 1.25); ctx.lineTo(X, Y + r * 1.1);
  ctx.fillStyle = color;
  ctx.fill();
  if (Q.detail) {
    ctx.beginPath();
    ctx.ellipse(X - r * 0.35, Y - r * 0.4, r * 0.14, r * 0.25, 0.5, 0, PI * 2);
    ctx.fillStyle = alpha(C.white, 0.7);
    ctx.fill();
  }
}

function partyHat(ctx, x, y, color = C.pink, dotc = C.mustard) {
  ctx.beginPath();
  ctx.moveTo(x - 0.13, y); ctx.lineTo(x + 0.02, y - 0.42); ctx.lineTo(x + 0.15, y);
  ctx.closePath();
  paint(ctx, color, { dots: dotc, density: 0.4, lw: 0.035 });
  ctx.beginPath();
  ctx.arc(x + 0.02, y - 0.44, 0.06, 0, PI * 2);
  ctx.fillStyle = C.mustard;
  ctx.fill();
}

function cakeSlice(ctx, x, y, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.ellipse(0, 0.04, 0.26, 0.08, 0, 0, PI * 2);
  paint(ctx, C.white, { lw: 0.03 });
  ctx.beginPath();
  ctx.moveTo(-0.14, 0); ctx.lineTo(0.16, 0); ctx.lineTo(0.12, -0.16); ctx.lineTo(-0.14, -0.16);
  ctx.closePath();
  paint(ctx, C.blush, { lw: 0.03 });
  ctx.beginPath();
  ctx.rect(-0.14, -0.2, 0.26, 0.05);
  ctx.fillStyle = C.pink;
  ctx.fill();
  ctx.restore();
}

function dog(ctx, x, y, t, dir, sniff, moving) {
  const f = dir === 'l' ? -1 : 1;
  local(ctx, x, y, 0, 1, f, (c) => {
    if (Q.detail) {
      c.beginPath();
      c.ellipse(0, 0, 0.55, 0.16, 0, 0, PI * 2);
      c.fillStyle = alpha(C.ink, 0.16);
      c.fill();
    }
    const sw = moving ? Math.sin(t * 12) * 0.1 : 0;
    c.strokeStyle = C.brown;
    c.lineWidth = 0.1;
    c.lineCap = 'round';
    c.beginPath();
    for (const [lx, s] of [[-0.3, 1], [-0.18, -1], [0.22, -1], [0.34, 1]]) {
      c.moveTo(lx, -0.35); c.lineTo(lx + sw * s, 0);
    }
    c.stroke();
    // tail
    const wag = Math.sin(t * 16) * 0.5;
    c.beginPath();
    c.moveTo(-0.42, -0.5);
    c.lineTo(-0.42 - Math.cos(0.9 + wag) * 0.3, -0.5 - Math.sin(0.9 + wag) * 0.3);
    c.strokeStyle = C.wood;
    c.lineWidth = 0.08;
    c.stroke();
    c.beginPath();
    c.ellipse(0, -0.48, 0.48, 0.2, 0, 0, PI * 2);
    paint(c, C.wood, { dots: C.brown, density: 0.2, lw: 0.04 });
    const hx = 0.5, hy = sniff ? -0.22 + Math.abs(Math.sin(t * 8)) * 0.05 : -0.68;
    c.beginPath();
    c.ellipse(hx, hy, 0.2, 0.16, 0, 0, PI * 2);
    paint(c, C.wood, { lw: 0.04 });
    c.beginPath();
    c.ellipse(hx - 0.1, hy + 0.05, 0.07, 0.15, 0.3, 0, PI * 2);
    paint(c, C.brown, { lw: 0.03 });
    c.beginPath();
    c.arc(hx + 0.2, hy + 0.02, 0.045, 0, PI * 2);
    c.arc(hx + 0.06, hy - 0.04, 0.025, 0, PI * 2);
    c.fillStyle = C.ink;
    c.fill();
    // a red collar
    c.beginPath();
    c.moveTo(hx - 0.16, hy + 0.1); c.lineTo(hx - 0.08, hy + 0.2);
    c.strokeStyle = C.red;
    c.lineWidth = 0.07;
    c.stroke();
  });
}

function rabbit(ctx, x, y, z, t, dir) {
  const f = dir === 'l' ? -1 : 1;
  local(ctx, x, y, z, 1, f, (c) => {
    c.beginPath();
    c.ellipse(-0.02, -0.2, 0.24, 0.17, 0, 0, PI * 2);
    paint(c, C.white, { lw: 0.035 });
    c.beginPath();
    c.arc(-0.24, -0.24, 0.07, 0, PI * 2);
    paint(c, C.white, { lw: 0.03 });
    for (const [ex, a] of [[0.1, -0.25], [0.2, 0.15]]) {
      c.beginPath();
      c.ellipse(ex, -0.6, 0.05, 0.16, a, 0, PI * 2);
      paint(c, C.white, { lw: 0.03 });
      c.beginPath();
      c.ellipse(ex, -0.6, 0.02, 0.1, a, 0, PI * 2);
      c.fillStyle = C.pink;
      c.fill();
    }
    c.beginPath();
    c.arc(0.18, -0.36, 0.12, 0, PI * 2);
    paint(c, C.white, { lw: 0.035 });
    c.beginPath();
    c.arc(0.24, -0.38, 0.022, 0, PI * 2);
    c.fillStyle = C.ink;
    c.fill();
    c.beginPath();
    c.arc(0.3, -0.33, 0.02, 0, PI * 2);
    c.fillStyle = C.pink;
    c.fill();
  });
}

// Portrait painted inside a frame on a wall (local wall frame).
function portrait(c, w, h, bg, people) {
  c.beginPath();
  c.rect(-w / 2 - 0.1, -h / 2 - 0.1, w + 0.2, h + 0.2);
  paint(c, C.ink, { stroke: false });
  c.beginPath();
  c.rect(-w / 2, -h / 2, w, h);
  paint(c, bg, { dots: Q.detail ? shade(bg, 0.25) : null, density: 0.2, stroke: false });
  const n = people.length;
  people.forEach(([skin, top, hair], i) => {
    const px = -w / 2 + (w * (i + 0.5)) / n;
    const s = Math.min(1, (w / n) * 1.3);
    c.beginPath();
    c.ellipse(px, h / 2, 0.22 * s, 0.3 * s, 0, PI, 0);
    c.fillStyle = top;
    c.fill();
    c.beginPath();
    c.arc(px, h / 2 - 0.36 * s, 0.14 * s, 0, PI * 2);
    c.fillStyle = skin;
    c.fill();
    c.beginPath();
    c.arc(px, h / 2 - 0.39 * s, 0.15 * s, PI, 0);
    c.fillStyle = hair;
    c.fill();
  });
}

// ---------- the zone ----------

export default {
  id: 'flat2',
  name: '2B, The Party',
  blurb: 'Maya is turning seven and the goose has queued for cake four times. Dad has slept through a magic show, a piñata and a leak from 3A.',

  build(R) {
    // ---------- floor and walls ----------
    R.floor((ctx) => {
      slab(ctx, C.greyLight);
      planks(ctx, C.woodLight, 0.8);
      checker(ctx, C.white, C.mint, 0.7, 0, 0, 9.1, 2.8);
      if (Q.detail) {
        face(ctx, [[0, 2.8, 0.005], [9.1, 2.8, 0.005], [9.1, 0, 0.005]], null, { lw: 0.05 });
      }
    });
    R.wall((ctx) => walls(ctx, { left: tint(C.mint, 0.25), right: C.mint, dotsL: C.tealLight, dotsR: C.tealLight, densL: 0.12, densR: 0.16 }));

    R.decor((ctx) => {
      // skirting boards
      onLeft(ctx, 0, 0, 16, 0.3, C.white, { lw: 0.03 });
      onRight(ctx, 0, 0, 16, 0.3, C.white, { lw: 0.03 });
      // kitchen splashback tiles
      onRight(ctx, 1.8, 1.3, 5.8, 1.6, C.white, { dots: C.tealLight, density: 0.25 });
      if (Q.detail) {
        for (let x = 2.2; x < 7.6; x += 0.4) face(ctx, [[x, 0, 1.3], [x, 0, 2.9]], null, { lw: 0.02, stroke: C.grey });
        for (let z = 1.7; z < 2.9; z += 0.4) face(ctx, [[1.8, 0, z], [7.6, 0, z]], null, { lw: 0.02, stroke: C.grey });
      }
      // windows
      windowL(ctx, 7.6, 3.0, 2.6, 2.0, C.sky, C.white);
      windowR(ctx, 8.5, 2.5, 2.3, 2.3, C.sky, C.white);
      // curtains
      onLeft(ctx, 7.1, 2.7, 0.45, 2.6, C.coral, { dots: C.red, density: 0.25 });
      onLeft(ctx, 10.25, 2.7, 0.45, 2.6, C.coral, { dots: C.red, density: 0.25 });
      onRight(ctx, 8.0, 2.2, 0.4, 2.8, C.mustard, { dots: C.coral, density: 0.25 });
      onRight(ctx, 10.95, 2.2, 0.4, 2.8, C.mustard, { dots: C.coral, density: 0.25 });

      // Birthday banner on the left wall
      onLeft(ctx, 1.4, 5.05, 5.4, 0.75, C.pink, { dots: C.coral, density: 0.2 });
      paintText(ctx, 'left', 4.1, 5.43, 'HAPPY BIRTHDAY MAYA', 0.5, C.white);

      // The family photo wall
      const fam = [
        [1.9, 3.2, 1.2, 1.0, C.sky, [[SKIN[1], C.coral, HAIR[1]], [SKIN[0], C.teal, HAIR[3]]]],
        [3.4, 3.5, 0.8, 1.0, C.butter, [[SKIN[1], C.pink, HAIR[1]]]],
        [4.5, 3.1, 1.3, 0.9, C.lilac, [[SKIN[4], C.mustard, HAIR[4]], [SKIN[4], C.navy, HAIR[4]]]],
        [2.3, 1.7, 0.9, 0.9, C.blush, [[SKIN[1], C.green, HAIR[3]]]],
        [3.5, 1.9, 1.2, 0.9, C.mint, [[SKIN[0], C.red, HAIR[1]], [SKIN[1], C.sky, HAIR[3]], [SKIN[1], C.pink, HAIR[1]]]],
        [5.1, 1.8, 0.8, 0.8, C.butter, [[SKIN[1], C.purple, HAIR[3]]]],
        [5.6, 4.1, 0.7, 0.6, C.sky, [[SKIN[0], C.coral, HAIR[0]]]],
      ];
      for (const [y, z, w, h, bg, ppl] of fam) onWall(ctx, 'left', y + w / 2, z + h / 2, (c) => portrait(c, w, h, bg, ppl));

      // Fridge art and a school calendar on the right wall by the door
      onWall(ctx, 'right', 11.95, 2.3, (c) => {
        c.beginPath();
        c.rect(-0.55, -0.7, 1.1, 1.4);
        paint(c, C.white, { lw: 0.04 });
        c.beginPath();
        c.rect(-0.55, -0.7, 1.1, 0.3);
        paint(c, C.coral, { lw: 0.04 });
        if (Q.detail) {
          c.fillStyle = C.ink;
          for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) {
            c.beginPath();
            c.arc(-0.42 + j * 0.21, -0.2 + i * 0.25, 0.04, 0, PI * 2);
            c.fill();
          }
          c.beginPath();
          c.arc(0.42, 0.55, 0.12, 0, PI * 2);
          c.strokeStyle = C.red;
          c.lineWidth = 0.04;
          c.stroke();
        }
      });
      // Front door with 2B on it
      onRight(ctx, 13.7, 0, 1.7, 3.3, C.white, { lw: 0.05 });
      onRight(ctx, 13.85, 0, 1.4, 3.15, C.teal, { dots: C.navy, density: 0.2 });
      onRight(ctx, 14.2, 2.2, 0.7, 0.5, C.white, { lw: 0.04 });
      paintText(ctx, 'right', 14.55, 2.45, '2B', 0.42, C.ink);
      onRight(ctx, 14.95, 1.45, 0.14, 0.14, C.mustard, { lw: 0.03 });
      // coat hooks with coats
      for (const [x, col] of [[12.9, C.red], [13.3, C.navy]]) {
        onRight(ctx, x - 0.2, 2.2, 0.4, 1.3, col, { dots: shade(col, 0.4), density: 0.2 });
      }
      paintText(ctx, 'right', 11.95, 2.87, 'SEPT', 0.22, C.white);
    });

    // Paper streamers looping along the tops of both walls
    R.decor((ctx, t) => {
      if (!Q.detail) return;
      const run = (a, b, n, col, off) => {
        const pts = [];
        for (let i = 0; i <= n * 8; i++) {
          const k = i / (n * 8);
          const seg = (i % 8) / 8;
          const sag = Math.sin(seg * PI) * (0.55 + Math.sin(t * 1.2 + off + Math.floor(i / 8)) * 0.06);
          pts.push(P(lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k) - sag));
        }
        ctx.beginPath();
        pts.forEach(([X, Y], i) => (i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y)));
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 0.13;
        ctx.stroke();
        ctx.strokeStyle = col;
        ctx.lineWidth = 0.08;
        ctx.stroke();
      };
      run([0.05, 0.3, 5.95], [0.05, 15.8, 5.95], 7, C.coral, 0);
      run([0.05, 0.6, 5.85], [0.05, 15.6, 5.85], 6, C.teal, 2);
      run([0.3, 0.05, 5.95], [15.8, 0.05, 5.95], 7, C.pink, 1);
      run([0.6, 0.05, 5.85], [15.6, 0.05, 5.85], 6, C.mustard, 3);
    }, { anim: true });

    // ---------- the kitchen ----------
    // Upper cabinets
    R.decor((ctx) => {
      box(ctx, 1.8, 0, 3.3, 5.8, 0.7, 1.5, C.white, { top: C.paper, dotsL: C.grey });
      if (Q.detail) {
        for (let x = 1.8; x < 7.6; x += 1.45) {
          face(ctx, [[x, 0.7, 3.3], [x, 0.7, 4.8]], null, { lw: 0.03 });
          box(ctx, x + 1.2, 0.7, 3.5, 0.08, 0.04, 0.3, C.ink, { flat: true, stroke: false });
        }
      }
    });
    // Fridge in the corner, with a stowaway dove on top
    R.thing(1.7, 1.5, (ctx) => {
      box(ctx, 0.2, 0.2, 0, 1.5, 1.3, 3.8, C.white, { top: C.paper, right: tint(C.grey, 0.5) });
      face(ctx, [[1.7, 0.2, 2.5], [1.7, 1.5, 2.5]], null, { lw: 0.04 });
      box(ctx, 1.7, 1.2, 2.7, 0.06, 0.08, 0.7, C.grey, { flat: true });
      box(ctx, 1.7, 1.2, 1.2, 0.06, 0.08, 0.9, C.grey, { flat: true });
      // kid's drawings and magnets
      face(ctx, [[1.71, 0.35, 1.4], [1.71, 0.95, 1.4], [1.71, 0.95, 2.1], [1.71, 0.35, 2.1]], C.butter, { lw: 0.03 });
      face(ctx, [[1.71, 0.5, 2.8], [1.71, 1.05, 2.8], [1.71, 1.05, 3.4], [1.71, 0.5, 3.4]], C.sky, { lw: 0.03 });
      if (Q.detail) {
        const [X, Y] = P(1.71, 0.65, 1.75);
        ctx.beginPath();
        ctx.arc(X, Y, 0.14, 0, PI * 2);
        ctx.fillStyle = C.coral;
        ctx.fill();
        const [X2, Y2] = P(1.71, 0.78, 3.1);
        ctx.beginPath();
        ctx.moveTo(X2 - 0.2, Y2 + 0.1); ctx.lineTo(X2, Y2 - 0.15); ctx.lineTo(X2 + 0.2, Y2 + 0.1);
        ctx.strokeStyle = C.green; ctx.lineWidth = 0.05; ctx.stroke();
      }
    });
    R.mover(() => ({ x: 1.0, y: 0.9 }), (ctx, t) => {
      // the magician's dove, who has also had enough
      const [X, Y] = P(1.0, 0.9, 3.8);
      const bob = Math.sin(t * 5) > 0.6 ? 0.06 : 0;
      ctx.beginPath();
      ctx.ellipse(X, Y - 0.22, 0.26, 0.16, -0.1, 0, PI * 2);
      paint(ctx, C.white, { lw: 0.035 });
      ctx.beginPath();
      ctx.arc(X + 0.22, Y - 0.42 + bob, 0.1, 0, PI * 2);
      paint(ctx, C.white, { lw: 0.035 });
      ctx.beginPath();
      ctx.moveTo(X + 0.3, Y - 0.44 + bob); ctx.lineTo(X + 0.42, Y - 0.4 + bob); ctx.lineTo(X + 0.3, Y - 0.37 + bob);
      ctx.fillStyle = C.mustard; ctx.fill();
      ctx.beginPath();
      ctx.arc(X + 0.25, Y - 0.44 + bob, 0.022, 0, PI * 2);
      ctx.fillStyle = C.ink; ctx.fill();
    }, { bias: 1 });

    // Counter with stove, sink and a fishbowl
    R.thing(7.6, 1.2, (ctx) => {
      box(ctx, 1.8, 0.05, 0, 5.8, 1.15, 1.2, C.teal, { top: C.white, dotsL: C.navy });
      if (Q.detail) {
        for (let x = 1.8; x < 7.5; x += 1.45) {
          face(ctx, [[x, 1.2, 0.1], [x, 1.2, 1.1]], null, { lw: 0.03 });
          box(ctx, x + 0.6, 1.2, 0.9, 0.3, 0.04, 0.06, C.ink, { flat: true, stroke: false });
        }
      }
      // stove top
      rect(ctx, 3.3, 0.2, 1.4, 0.9, 1.21, C.ink, { lw: 0.04 });
      for (const [bx, by] of [[3.65, 0.45], [4.35, 0.45], [3.65, 0.85], [4.35, 0.85]]) disc(ctx, bx, by, 1.22, 0.18, C.grey, { lw: 0.02 });
      // sink
      rect(ctx, 5.3, 0.25, 1.1, 0.75, 1.21, C.grey, { lw: 0.04, dots: C.navy, density: 0.2 });
      box(ctx, 5.8, 0.1, 1.2, 0.08, 0.08, 0.5, C.grey, { flat: true });
      box(ctx, 5.8, 0.1, 1.65, 0.08, 0.4, 0.07, C.grey, { flat: true });
      // stacked dirty plates in the sink
      for (let i = 0; i < 4; i++) disc(ctx, 5.85, 0.62, 1.25 + i * 0.07, 0.3, i % 2 ? C.white : C.butter, { lw: 0.025 });
      // toaster, knife block, chopping board
      box(ctx, 2.0, 0.3, 1.2, 0.6, 0.4, 0.4, C.coral, { top: C.coralLight });
      box(ctx, 2.9, 0.3, 1.2, 0.25, 0.3, 0.45, C.brown);
      rect(ctx, 4.8, 0.3, 0.45, 0.7, 1.21, C.woodLight, { lw: 0.03 });
      // juice cartons
      box(ctx, 6.5, 0.15, 1.2, 0.22, 0.22, 0.5, C.mustard, { top: C.white });
      box(ctx, 6.2, 0.15, 1.2, 0.22, 0.22, 0.5, C.leaf, { top: C.white });
    });
    // Spaghetti pot, steaming
    R.thing(4.1, 1.0, (ctx, t) => {
      cylinder(ctx, 3.65, 0.5, 1.22, 0.32, 0.45, C.grey, { top: C.butter });
      if (Q.detail) {
        const [X, Y] = P(3.65, 0.5, 1.67);
        ctx.strokeStyle = C.mustard;
        ctx.lineWidth = 0.03;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(X + Math.sin(i * 2) * 0.12, Y + Math.cos(i * 3) * 0.05, 0.08, 0, PI * 1.5);
          ctx.stroke();
        }
        particles(t, 5, 2.2, (k, r) => {
          const [sx, sy] = P(3.65 + (r() - 0.5) * 0.4, 0.5, 1.8 + k * 2.2);
          ctx.beginPath();
          ctx.arc(sx + Math.sin(k * 6 + r() * 6) * 0.2, sy, 0.12 + k * 0.2, 0, PI * 2);
          ctx.fillStyle = alpha(C.white, 0.75 * (1 - k));
          ctx.fill();
        }, 21);
      }
    }, { anim: true });
    // Fishbowl with the TV remote in it (a find)
    R.thing(7.8, 1.3, (ctx, t) => {
      const [X, Y] = P(7.1, 0.65, 1.2);
      ctx.beginPath();
      ctx.arc(X, Y - 0.38, 0.4, 0, PI * 2);
      ctx.fillStyle = alpha(C.sky, 0.55);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.rect(X - 0.5, Y - 0.62, 1, 0.8);
      ctx.clip();
      ctx.beginPath();
      ctx.arc(X, Y - 0.38, 0.4, 0, PI * 2);
      ctx.fillStyle = alpha(C.water, 0.6);
      ctx.fill();
      ctx.restore();
      // the remote, lying at the bottom
      ctx.save();
      ctx.translate(X - 0.02, Y - 0.14);
      ctx.rotate(-0.25);
      ctx.beginPath();
      ctx.roundRect(-0.26, -0.07, 0.52, 0.14, 0.05);
      paint(ctx, C.ink, { lw: 0.03 });
      ctx.fillStyle = C.red;
      ctx.beginPath(); ctx.arc(0.17, 0, 0.035, 0, PI * 2); ctx.fill();
      ctx.fillStyle = C.grey;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-0.15 + i * 0.08, 0, 0.025, 0, PI * 2); ctx.fill(); }
      ctx.restore();
      // goldfish, circling and judging
      const a = t * 1.4;
      const fx = X + Math.cos(a) * 0.2, fy = Y - 0.42 + Math.sin(a * 2) * 0.04;
      const fd = -Math.sin(a) >= 0 ? 1 : -1;
      ctx.beginPath();
      ctx.ellipse(fx, fy, 0.1, 0.06, 0, 0, PI * 2);
      ctx.moveTo(fx - fd * 0.08, fy); ctx.lineTo(fx - fd * 0.18, fy - 0.06); ctx.lineTo(fx - fd * 0.18, fy + 0.06);
      ctx.fillStyle = C.coral;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(X, Y - 0.38, 0.4, 0, PI * 2);
      paint(ctx, null, { lw: 0.04 });
      ctx.beginPath();
      ctx.ellipse(X, Y - 0.72, 0.28, 0.06, 0, 0, PI * 2);
      paint(ctx, null, { lw: 0.03 });
      if (Q.detail) {
        ctx.beginPath();
        ctx.arc(X - 0.2, Y - 0.5, 0.08, PI, PI * 1.5);
        ctx.strokeStyle = alpha(C.white, 0.9);
        ctx.lineWidth = 0.04;
        ctx.stroke();
      }
    }, { anim: true });
    R.find({ id: 'remote', label: 'The TV remote', at: [7.1, 0.65, 1.35], r: 0.7 });

    // ---------- the cake table and the endless cake queue ----------
    R.rug((ctx) => {
      // spaghetti casualties under the high chair
      const splat = (x, y, s) => onFloor(ctx, x, y, (c) => {
        c.beginPath();
        c.ellipse(0, 0, 0.3 * s, 0.22 * s, 0.5, 0, PI * 2);
        c.fillStyle = alpha(C.red, 0.7);
        c.fill();
        c.strokeStyle = C.butter;
        c.lineWidth = 0.05;
        c.beginPath();
        for (let i = 0; i < 4; i++) {
          c.moveTo(-0.3 * s, -0.1 * s + i * 0.07);
          c.bezierCurveTo(-0.1, -0.3 * s + i * 0.1, 0.1, 0.2 * s, 0.3 * s, -0.05 + i * 0.05);
        }
        c.stroke();
      });
      splat(11.6, 4.9, 1);
      splat(12.3, 6.4, 0.8);
      splat(10.2, 6.6, 0.7);
      splat(12.9, 3.9, 0.6);
    });

    const TX = 5.4, TY = 3.2, TW = 3.8, TD = 2.0;
    R.thing(7.3, 4.6, (ctx) => {
      table(ctx, TX, TY, TW, TD, 1.2, C.wood);
      // tablecloth with a scalloped edge
      rect(ctx, TX - 0.1, TY - 0.1, TW + 0.2, TD + 0.2, 1.21, C.white, { dots: C.pink, density: 0.3, lw: 0.04 });
      face(ctx, [[TX - 0.1, TY + TD + 0.1, 1.21], [TX + TW + 0.1, TY + TD + 0.1, 1.21], [TX + TW + 0.1, TY + TD + 0.1, 0.85], [TX - 0.1, TY + TD + 0.1, 0.85]], shade(C.white, 0.1), { dots: C.pink, density: 0.3 });
      face(ctx, [[TX + TW + 0.1, TY - 0.1, 1.21], [TX + TW + 0.1, TY + TD + 0.1, 1.21], [TX + TW + 0.1, TY + TD + 0.1, 0.85], [TX + TW + 0.1, TY - 0.1, 0.85]], shade(C.white, 0.05), { dots: C.pink, density: 0.3 });
      // plates, cups, crisps, a juice jug
      for (const [px, py] of [[5.9, 4.6], [6.0, 3.6], [8.7, 4.7], [8.8, 3.7]]) disc(ctx, px, py, 1.23, 0.28, C.white, { lw: 0.03 });
      for (const [px, py, col] of [[6.5, 4.9, C.coral], [8.3, 3.5, C.teal], [6.4, 3.5, C.mustard], [8.9, 4.2, C.pink]]) cylinder(ctx, px, py, 1.22, 0.1, 0.25, col);
      disc(ctx, 5.9, 3.6, 1.26, 0.25, C.mustard, { dots: C.coral, density: 0.4, lw: 0.03 });
      cylinder(ctx, 8.8, 4.7, 1.24, 0.14, 0.45, alpha(C.sky, 0.8), { top: C.coralLight });
    });
    // The cake, candles flickering
    R.thing(7.31, 4.61, (ctx, t) => {
      cylinder(ctx, 7.3, 4.2, 1.21, 0.75, 0.5, C.blush, { top: C.white });
      cylinder(ctx, 7.3, 4.2, 1.71, 0.48, 0.4, C.pink, { top: C.white });
      if (Q.detail) {
        // icing drips
        for (let i = 0; i < 8; i++) {
          const a = PI * 0.1 + (i / 7) * PI * 0.8;
          const [X, Y] = P(7.3 + Math.cos(a) * 0.75, 4.2 + Math.sin(a) * 0.75, 1.71);
          ctx.beginPath();
          ctx.ellipse(X, Y + 0.06, 0.06, 0.1, 0, 0, PI * 2);
          ctx.fillStyle = C.white;
          ctx.fill();
        }
      }
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * PI * 2 + 0.3;
        const cx = 7.3 + Math.cos(a) * 0.3, cy = 4.2 + Math.sin(a) * 0.3;
        const [X, Y] = P(cx, cy, 2.11);
        ctx.fillStyle = PARTY[i % PARTY.length];
        ctx.fillRect(X - 0.03, Y - 0.32, 0.06, 0.32);
        const fl = 0.08 + Math.abs(Math.sin(t * 9 + i * 1.7)) * 0.04;
        ctx.beginPath();
        ctx.ellipse(X + Math.sin(t * 7 + i) * 0.015, Y - 0.4, fl * 0.55, fl, 0, 0, PI * 2);
        ctx.fillStyle = i % 2 ? C.mustard : C.coral;
        ctx.fill();
      }
      label(ctx, 7.3, 4.2, 2.95, '7', 0.6, C.coral);
    }, { anim: true });

    // Mum, serving slices at the back of the table
    const QP = 6;
    R.mover(() => ({ x: 7.3, y: 2.55 }), (ctx, t) => {
      const k = pulse(t, QP);
      const serving = k < 0.3;
      person(ctx, 7.3, 2.55, 0, folk(501, { dir: 'l', pose: serving ? 'point' : 'stand', top: C.purple, bottom: C.navy, style: 'pony', hair: HAIR[1], skin: SKIN[1],
        hold: serving ? null : (c) => { c.fillStyle = C.grey; c.fillRect(0.05, -0.05, 0.08, 0.45); } }), t);
      if (serving && Q.detail) {
        const [X, Y] = P(7.3, 2.55, 0);
        cakeSlice(ctx, X - 1.0, Y - 1.5, 0.9);
      }
    }, { bias: 0 });
    R.air((ctx, t) => {
      const k = pulse(t, QP);
      if (Q.detail && pulse(t, QP * 4) > 0.75 && k < 0.8) speech(ctx, 7.1, 2.4, 3.1, 'THAT GOOSE HAS HAD FOUR', { size: 0.4, dx: -1.6 });
    });

    // The queue: three kids and a goose. The front one gets cake, walks round
    // the back and joins the end again. Forever.
    const SLOTS = [[7.3, 6.1], [7.3, 7.0], [7.3, 7.9], [7.3, 8.8]];
    const LOOP = [[7.3, 6.1], [8.9, 6.4], [9.1, 9.8], [7.3, 9.9], [7.3, 8.8]];
    const N = SLOTS.length;
    const member = (i) => (t) => {
      const c = Math.floor(t / QP);
      const k = t / QP - c;
      const s = (((i - c) % N) + N) % N;
      if (s === 0) {
        if (k < 0.3) return { x: SLOTS[0][0], y: SLOTS[0][1], dir: 'r', back: true, moving: false, front: true };
        const p = along(LOOP, ease((k - 0.3) / 0.7));
        return { ...p, moving: k < 0.99, cake: true };
      }
      if (k < 0.3) return { x: SLOTS[s][0], y: SLOTS[s][1], dir: 'r', back: true, moving: false };
      const q = ease(clamp((k - 0.3) / 0.15));
      return { x: SLOTS[s][0], y: lerp(SLOTS[s][1], SLOTS[s - 1][1], q), dir: 'r', back: true, moving: q > 0 && q < 1 };
    };
    const queueKids = [
      folk(511, { top: C.teal, hat: 'party', scale: 0.7, style: 'curly', hair: HAIR[0] }),
      folk(512, { top: C.mustard, hat: 'party', scale: 0.68, style: 'pony', hair: HAIR[3], dress: true }),
      folk(513, { top: C.sky, hat: 'party', scale: 0.72, style: 'short', hair: HAIR[2] }),
    ];
    queueKids.forEach((look, i) => {
      R.mover(member(i), (ctx, t, p) => {
        person(ctx, p.x, p.y, 0, { ...look, pose: p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back,
          hold: p.cake ? (c) => cakeSlice(c, 0.12, 0.05, 0.9) : null }, t);
      });
    });
    // The goose, fourth in line, party hat on
    const gq = member(3);
    const gooseAt = (t) => {
      const p = gq(t);
      return { x: p.x, y: p.y, z: 0, dir: p.dir, pose: p.front ? 'honk' : p.moving ? 'walk' : 'stand', moving: p.moving, cake: p.cake };
    };
    R.goose(gooseAt);
    R.mover(gooseAt, (ctx, t, p) => {
      const f = p.dir === 'l' ? -1 : 1;
      const bob = p.pose === 'walk' ? Math.abs(Math.sin(t * 9)) * 0.06 : 0;
      const by = -0.45;
      const honk = p.pose === 'honk';
      const nx = honk ? 0.5 : 0.28, ny = honk ? by - 0.45 : by - 0.62;
      local(ctx, p.x, p.y, 0, 1, f, (c) => {
        c.translate(0, -bob);
        partyHat(c, nx - 0.03, ny - 0.06, C.teal, C.white);
        if (p.cake) cakeSlice(c, nx + 0.34, ny + 0.12, 0.7);
      });
    }, { bias: 0.02 });

    // Maya, the birthday girl, in her crown
    R.mover(() => ({ x: 4.7, y: 5.2 }), (ctx, t) => {
      const k = pulse(t, 7);
      const pose = k < 0.5 ? 'cheer' : 'stand';
      person(ctx, 4.7, 5.2, 0, folk(520, { dir: 'r', pose, top: C.pink, dress: true, style: 'long', hair: HAIR[3], skin: SKIN[0], scale: 0.74, speed: 8 }), t);
      local(ctx, 4.7, 5.2, 0, 0.74, 1, (c) => {
        const hy = -1.95 - (pose === 'cheer' ? Math.abs(Math.sin((t * 8) + folk(520).phase)) * 0.25 : 0);
        c.beginPath();
        c.moveTo(-0.24, hy - 0.22); c.lineTo(-0.24, hy - 0.5); c.lineTo(-0.12, hy - 0.36); c.lineTo(0.02, hy - 0.56);
        c.lineTo(0.16, hy - 0.36); c.lineTo(0.28, hy - 0.5); c.lineTo(0.28, hy - 0.22); c.closePath();
        paint(c, C.mustard, { lw: 0.04 });
      });
      if (Q.detail && k > 0.5 && k < 0.8) speech(ctx, 4.6, 5.1, 2.3, "I'M SEVEN!", { size: 0.42, dx: 1.1 });
    });

    // Presents piled up beside the table
    R.thing(4.4, 7.0, (ctx) => {
      const gift = (x, y, z, w, d, h, col, rib) => {
        box(ctx, x, y, z, w, d, h, col, { dotsL: shade(col, 0.5) });
        if (Q.detail) {
          face(ctx, [[x + w / 2, y, z + h], [x + w / 2, y + d, z + h], [x + w / 2, y + d, z]], null, { lw: 0.08, stroke: rib });
          face(ctx, [[x, y + d / 2, z + h], [x + w, y + d / 2, z + h], [x + w, y + d / 2, z]], null, { lw: 0.08, stroke: rib });
        }
      };
      gift(3.2, 5.8, 0, 0.9, 0.9, 0.7, C.teal, C.mustard);
      gift(4.0, 6.2, 0, 0.6, 0.7, 0.5, C.coral, C.white);
      gift(3.4, 6.0, 0.7, 0.6, 0.55, 0.45, C.purple, C.pink);
      gift(3.4, 6.8, 0, 0.5, 0.5, 0.9, C.mustard, C.red);
    });

    // ---------- the high chair and the spaghetti arm ----------
    const HX = 10.6, HY = 4.1;
    R.thing(HX + 0.5, HY + 0.5, (ctx) => {
      for (const [lx, ly] of [[HX - 0.45, HY - 0.45], [HX + 0.35, HY - 0.45], [HX - 0.45, HY + 0.35], [HX + 0.35, HY + 0.35]]) {
        box(ctx, lx, ly, 0, 0.1, 0.1, 1.5, C.white, { flat: true });
      }
      box(ctx, HX - 0.4, HY - 0.4, 1.5, 0.8, 0.8, 0.15, C.white);
      box(ctx, HX - 0.45, HY - 0.4, 1.5, 0.12, 0.8, 1.1, C.white, { top: C.paper });
    });
    // Balloons tied to the high chair
    R.mover(() => ({ x: HX - 0.4, y: HY - 0.4 }), (ctx, t) => {
      const [ax, ay] = P(HX - 0.4, HY - 0.3, 2.6);
      [[C.coral, 0.3, 3.0], [C.teal, 0.9, 3.4], [C.mustard, 1.5, 2.8]].forEach(([col, dx, h], i) => {
        const bx = ax + dx + Math.sin(t * 1.3 + i * 2) * 0.12, by = ay - h * ZK + Math.sin(t * 1.7 + i) * 0.08;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo(ax + dx * 0.3, ay - h * 0.5, bx, by + 0.45);
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 0.025;
        ctx.stroke();
        balloon(ctx, bx, by, 0.38, col, t, i, 0);
      });
    }, { bias: -0.2 });
    // The toddler, and the tray
    R.mover(() => ({ x: HX, y: HY }), (ctx, t) => {
      const fling = Math.sin(t * PI / 1.2 * 2);
      person(ctx, HX + 0.05, HY, 1.3, folk(530, { pose: 'sit', dir: 'r', scale: 0.6, top: C.butter, style: 'bald', skin: SKIN[2],
        arms: [1.3 + Math.max(0, fling) * 1.6, 0.9] }), t);
      // spaghetti hat
      if (Q.detail) {
        local(ctx, HX + 0.05, HY, 1.3, 0.6, 1, (c) => {
          c.strokeStyle = C.butter;
          c.lineWidth = 0.08;
          c.beginPath();
          for (let i = 0; i < 4; i++) {
            c.moveTo(-0.3 + i * 0.1, -2.12);
            c.quadraticCurveTo(-0.2 + i * 0.15, -2.4, -0.3 + i * 0.2, -1.8 + (i % 2) * 0.2);
          }
          c.stroke();
          c.beginPath();
          c.arc(0.1, -2.25, 0.09, 0, PI * 2);
          c.fillStyle = C.brown;
          c.fill();
        });
      }
      box(ctx, HX + 0.45, HY - 0.45, 2.0, 0.5, 0.9, 0.08, C.white, { top: C.paper });
      disc(ctx, HX + 0.7, HY, 2.1, 0.22, C.teal, { lw: 0.03 });
      disc(ctx, HX + 0.7, HY, 2.12, 0.14, C.red, { stroke: false });
    }, { bias: 1.3 });
    // Flying spaghetti
    R.air((ctx, t) => {
      if (!Q.detail) return;
      particles(t, 3, 2.4, (k, r) => {
        if (k > 0.5) return;
        const q = k / 0.5;
        const tx = HX + 0.5 + r() * 2.2, ty = HY + 0.6 + r() * 2.5;
        const x = lerp(HX + 0.3, tx, q), y = lerp(HY, ty, q), z = 2.5 + Math.sin(q * PI) * 1.8 - q * 2.5;
        const [X, Y] = P(x, y, z);
        ctx.save();
        ctx.translate(X, Y);
        ctx.rotate(q * 8);
        ctx.strokeStyle = C.butter;
        ctx.lineWidth = 0.06;
        ctx.beginPath();
        ctx.moveTo(-0.2, 0); ctx.bezierCurveTo(-0.1, -0.2, 0.1, 0.2, 0.2, 0);
        ctx.moveTo(-0.15, 0.08); ctx.bezierCurveTo(0, -0.1, 0.1, 0.25, 0.22, 0.1);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0.02, 0.07, 0, PI * 2);
        ctx.fillStyle = C.brown;
        ctx.fill();
        ctx.restore();
      }, 44);
    });
    // The meatball that made it all the way to the wall (a find)
    R.decor((ctx) => {
      onWall(ctx, 'right', 11.7, 3.55, (c) => {
        c.beginPath();
        c.moveTo(-0.3, 0);
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * PI * 2, rr = i % 2 ? 0.18 : 0.32;
          c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        c.closePath();
        c.fillStyle = C.red;
        c.fill();
        // drip
        c.beginPath();
        c.roundRect(-0.04, 0, 0.08, 0.55, 0.04);
        c.fill();
        c.strokeStyle = C.butter;
        c.lineWidth = 0.05;
        c.beginPath();
        c.moveTo(0.05, 0.05); c.bezierCurveTo(0.2, 0.3, -0.1, 0.4, 0.08, 0.7);
        c.stroke();
        c.beginPath();
        c.arc(0, -0.02, 0.15, 0, PI * 2);
        paint(c, C.brown, { lw: 0.03, dots: C.ink, density: 0.2 });
      });
    });
    R.find({ id: 'meatball', label: 'A meatball stuck to the wall', at: [11.7, 0, 3.55], r: 0.6 });

    // The dog, hoovering up the fallout
    const dogR = route([[11.6, 4.9, 1.6], [12.3, 6.4, 1.4], [10.2, 6.6, 1.8], [9.6, 5.8], [12.9, 3.9, 1.5]], { speed: 1.2 });
    R.mover(dogR, (ctx, t, p) => dog(ctx, p.x, p.y, t, p.dir, !p.moving, p.moving));

    // ---------- the leak from 3A and the broom ----------
    const PX = 9.9, PY = 1.6;
    R.thing(PX + 0.5, PY + 0.5, (ctx, t) => {
      cylinder(ctx, PX, PY, 0, 0.45, 0.55, C.grey, { top: C.water });
      disc(ctx, PX, PY, 0.55, 0.38, C.water, { stroke: false, dots: C.teal, density: 0.3 });
      box(ctx, PX + 0.42, PY - 0.05, 0.35, 0.3, 0.1, 0.08, C.ink, { flat: true });
      // ripples from each drip
      const k = pulse(t, 1.3);
      const [X, Y] = P(PX, PY, 0.56);
      ctx.beginPath();
      ctx.ellipse(X, Y, 0.1 + k * 0.4, (0.1 + k * 0.4) / 2, 0, 0, PI * 2);
      ctx.strokeStyle = alpha(C.white, 1 - k);
      ctx.lineWidth = 0.04;
      ctx.stroke();
    }, { anim: true });
    R.air((ctx, t) => {
      const k = pulse(t, 1.3);
      const z = lerp(7.6, 0.6, k * k);
      const [X, Y] = P(PX, PY, z);
      ctx.beginPath();
      ctx.moveTo(X, Y - 0.2);
      ctx.quadraticCurveTo(X + 0.1, Y, X, Y + 0.05);
      ctx.quadraticCurveTo(X - 0.1, Y, X, Y - 0.2);
      paint(ctx, C.water, { lw: 0.03 });
      // the drip forming at the top
      const [X2, Y2] = P(PX, PY, 7.6);
      ctx.beginPath();
      ctx.arc(X2, Y2, 0.05 + k * 0.05, 0, PI * 2);
      ctx.fillStyle = C.water;
      ctx.fill();
      if (Q.detail && k < 0.1) label(ctx, PX + 0.6, PY, 1.2, 'plink', 0.3, C.teal);
    });

    // Grandpa on a chair, banging the ceiling with a broom at the tuba upstairs
    const GX = 12.7, GY = 2.7;
    R.thing(GX + 0.45, GY + 0.45, (ctx) => chair(ctx, GX - 0.4, GY - 0.4, 0, C.coral, 'r'));
    R.mover(() => ({ x: GX, y: GY }), (ctx, t) => {
      const bang = Math.abs(Math.sin(t * 4.5));
      const up = 1 - bang;
      person(ctx, GX, GY, 0.95 + up * 0.08, { skin: SKIN[0], hair: HAIR[4], style: 'bald', top: C.green, bottom: C.brown, dir: 'l', pose: 'stand',
        arms: [PI - 0.35 - bang * 0.15, PI - 0.55 - bang * 0.15] }, t);
      // the broom
      const bx0 = GX - 0.1, by0 = GY + 0.25, z0 = 2.8 + up * 0.08;
      const topZ = 7.35 - bang * 0.35;
      const [a0, a1] = [P(bx0, by0, z0 - 0.9), P(bx0 - 0.3, by0 - 0.3, topZ - 0.4)];
      ctx.beginPath();
      ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.14; ctx.lineCap = 'round'; ctx.stroke();
      ctx.strokeStyle = C.wood; ctx.lineWidth = 0.08; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(a1[0] - 0.25, a1[1]); ctx.lineTo(a1[0] + 0.25, a1[1]);
      ctx.lineTo(a1[0] + 0.3, a1[1] - 0.45); ctx.lineTo(a1[0] - 0.3, a1[1] - 0.45); ctx.closePath();
      paint(ctx, C.mustard, { dots: C.brown, density: 0.3, lw: 0.04 });
      if (Q.detail && up > 0.85) label(ctx, bx0 - 0.3, by0 - 0.3, topZ + 0.2, 'THUD', 0.34, C.navy);
      if (Q.detail && pulse(t, 10) < 0.45) speech(ctx, GX + 0.2, GY + 0.2, 3.6, 'KEEP IT DOWN, 3A!', { size: 0.4, dx: 1.2 });
    }, { bias: 1.2 });
    // The tuba from upstairs, oozing through the ceiling
    R.air((ctx, t) => {
      if (!Q.detail) return;
      particles(t, 5, 3.2, (k, r, i) => {
        const x = 11 + r() * 4, y = 1 + r() * 4;
        note(ctx, x + Math.sin(k * 6) * 0.2, y, 7.6 - k * 2.2, alpha(C.navy, 1 - k), 1.1);
      }, 71);
      const k = pulse(t, 5);
      if (k < 0.5) label(ctx, 12.4, 0.6, 7.2 - k * 0.6, 'BWAAAMP', 0.55 + k * 0.2, alpha(C.purple, 1 - k * 2));
    });

    // Shoes piled by the door, and a late guest who took the stairs
    R.rug((ctx) => {
      const r = rng(31);
      for (let i = 0; i < 9; i++) {
        const x = 13.9 + r() * 1.6, y = 0.7 + r() * 1.4;
        onFloor(ctx, x, y, (c) => {
          c.rotate(r() * PI);
          c.beginPath();
          c.ellipse(0, 0, 0.22, 0.1, 0, 0, PI * 2);
          paint(c, pick(r, PARTY), { lw: 0.025 });
        });
      }
      rect(ctx, 13.9, 0.2, 1.4, 0.5, 0.012, C.brown, { dots: C.mustard, density: 0.3, lw: 0.03 });
    });
    const latecomer = route([[14.55, 0.35, 0.5], [14.5, 3.6, 3.5]], { speed: 0.9, loop: false, offset: 2 });
    R.mover(latecomer, (ctx, t, p) => {
      ctx.save();
      ctx.globalAlpha = clamp((p.y - 0.35) / 0.6);
      person(ctx, p.x, p.y, 0, { skin: SKIN[2], hair: HAIR[6], style: 'curly', top: C.tealLight, bottom: C.navy, pose: 'carry', dir: p.dir, back: p.back,
        hold: (c) => {
          c.beginPath(); c.rect(-0.1, -0.55, 0.75, 0.7); paint(c, C.red, { lw: 0.03, dots: C.mustard, density: 0.3 });
          c.fillStyle = C.mustard; c.fillRect(0.2, -0.55, 0.12, 0.7); c.fillRect(-0.1, -0.26, 0.75, 0.12);
        } }, t);
      ctx.restore();
      if (Q.detail && !p.moving && p.y > 3) speech(ctx, p.x, p.y, 2.8, 'SORRY! THE LIFT...', { size: 0.38, dx: 0.4 });
    });

    // ---------- the living room: sleeping dad, grandma, a balloon uncle ----------
    R.rug((ctx) => {
      rect(ctx, 2.2, 6.6, 3.2, 4.2, 0.01, C.mustard, { lw: 0.04 });
      rect(ctx, 2.45, 6.85, 2.7, 3.7, 0.012, C.teal, { dots: C.navy, density: 0.2, stroke: false });
    });
    // Sofa against the left wall
    const SY0 = 6.4, SY1 = 10.8;
    R.thing(1.8, SY1, (ctx) => {
      box(ctx, 0.15, SY0, 0, 1.6, SY1 - SY0, 0.8, C.coral, { top: C.coralLight });
      box(ctx, 0.15, SY0, 0.8, 0.55, SY1 - SY0, 1.2, C.coral, { top: C.coralLight });
      box(ctx, 0.15, SY0, 0.8, 1.6, 0.4, 0.5, C.coral, { top: C.coralLight });
      box(ctx, 0.15, SY1 - 0.4, 0.8, 1.6, 0.4, 0.5, C.coral, { top: C.coralLight });
      if (Q.detail) face(ctx, [[0.7, 8.6, 0.8], [1.75, 8.6, 0.8]], null, { lw: 0.03 });
      // cushion
      box(ctx, 0.7, 6.85, 0.8, 0.25, 0.7, 0.7, C.mustard, { top: C.butter });
    });
    // Dad, asleep through all of it, party hat on
    const DAD = { skin: SKIN[3], hair: HAIR[1], style: 'short', top: C.sky, bottom: C.navy, pose: 'sleep', dir: 'l', hat: 'party' };
    R.mover(() => ({ x: 1.9, y: SY1 + 0.1 }), (ctx, t) => {
      const [X, Y] = P(1.1, 9.4, 1.0);
      const breathe = Math.sin(t * 1.8) * 0.02;
      ctx.save();
      ctx.translate(X, Y);
      ctx.rotate(-0.46);
      ctx.scale(1, 1 + breathe);
      ctx.translate(-X, -Y);
      person(ctx, 1.1, 9.4, 1.0, DAD, t);
      ctx.restore();
    }, { bias: 0.01 });
    // Kid with a party blower, testing whether dad is really asleep
    R.mover(() => ({ x: 2.6, y: 7.2 }), (ctx, t) => {
      const k = pulse(t, 3.5);
      const blow = k > 0.3 && k < 0.75 ? Math.sin(((k - 0.3) / 0.45) * PI) : 0;
      person(ctx, 2.6, 7.2, 0, folk(540, { dir: 'l', pose: 'stand', scale: 0.66, top: C.red, hat: 'party', style: 'short', hair: HAIR[6], arms: [1.9, 0.6] }), t);
      const [X, Y] = P(2.6, 7.2, 0);
      const mx = X - 0.2, my = Y - 1.24;
      const len = 0.15 + blow * 0.9;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx - len, my + 0.02);
      if (blow < 0.3) ctx.arc(mx - len, my + 0.1, 0.08, -PI / 2, PI / 2, true);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.13; ctx.lineCap = 'round'; ctx.stroke();
      ctx.strokeStyle = C.mustard; ctx.lineWidth = 0.08; ctx.stroke();
      if (Q.detail && blow > 0.6) label(ctx, 2.0, 7.0, 2.3, 'PFWEEE', 0.3, C.coral);
    }, { bias: 3.2 });
    // Coffee table with snacks
    R.thing(4.2, 9.6, (ctx) => {
      table(ctx, 3.0, 8.4, 1.2, 1.2, 0.6, C.brown);
      disc(ctx, 3.6, 9.0, 0.62, 0.3, C.white, { lw: 0.03 });
      disc(ctx, 3.6, 9.0, 0.65, 0.2, C.mustard, { dots: C.coral, density: 0.4, stroke: false });
      cylinder(ctx, 3.25, 8.6, 0.6, 0.08, 0.2, C.coral);
    });

    // Grandma, knitting an extremely long scarf
    R.thing(2.2, 14.0, (ctx) => {
      box(ctx, 0.2, 12.0, 0, 1.9, 1.9, 0.8, C.purple, { top: C.lilac });
      box(ctx, 0.2, 12.0, 0.8, 0.5, 1.9, 1.5, C.purple, { top: C.lilac });
      box(ctx, 0.2, 12.0, 0.8, 1.9, 0.35, 0.6, C.purple, { top: C.lilac });
      box(ctx, 0.2, 13.55, 0.8, 1.9, 0.35, 0.6, C.purple, { top: C.lilac });
      disc(ctx, 1.0, 13.3, 0.81, 0.4, C.pink, { dots: C.white, density: 0.3, lw: 0.03 });
    });
    R.rug((ctx) => {
      // the scarf, trailing off across the floor
      const pts = [[2.1, 12.6], [3.0, 13.4], [2.6, 14.4], [3.8, 15.0], [5.2, 14.9], [6.4, 15.5]];
      const cols = [C.coral, C.mustard, C.teal, C.pink];
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
        for (let j = 0; j < 4; j++) {
          const k0 = j / 4, k1 = (j + 1) / 4;
          const x0 = lerp(ax, bx, k0), y0 = lerp(ay, by, k0), x1 = lerp(ax, bx, k1), y1 = lerp(ay, by, k1);
          const nx = -(y1 - y0), ny = x1 - x0, l = Math.hypot(nx, ny) || 1;
          const w = 0.22;
          face(ctx, [[x0 + (nx / l) * w, y0 + (ny / l) * w, 0.02], [x1 + (nx / l) * w, y1 + (ny / l) * w, 0.02],
            [x1 - (nx / l) * w, y1 - (ny / l) * w, 0.02], [x0 - (nx / l) * w, y0 - (ny / l) * w, 0.02]], cols[(i * 4 + j) % 4], { lw: 0.025 });
        }
      }
      disc(ctx, 6.6, 15.5, 0.02, 0.2, C.coral, { lw: 0.03 });
    });
    R.mover(() => ({ x: 1.3, y: 13.0 }), (ctx, t) => {
      person(ctx, 1.2, 12.9, 0.85, { skin: SKIN[0], hair: HAIR[4], style: 'bun', top: C.lilac, dress: false, bottom: C.purple, pose: 'sit', dir: 'r',
        arms: [1.1 + Math.sin(t * 8) * 0.15, 1.0 - Math.sin(t * 8) * 0.15] }, t);
      // needles and the knitting in her lap
      local(ctx, 1.2, 12.9, 0.85, 1, 1, (c) => {
        c.beginPath();
        c.roundRect(0.35, -1.25, 0.5, 0.35, 0.08);
        paint(c, C.coral, { dots: C.mustard, density: 0.4, lw: 0.03 });
        c.strokeStyle = C.grey;
        c.lineWidth = 0.04;
        const a = Math.sin(t * 8) * 0.2;
        c.beginPath();
        c.moveTo(0.4, -1.1); c.lineTo(0.95 + a * 0.2, -1.55);
        c.moveTo(0.8, -1.1); c.lineTo(0.3 - a * 0.2, -1.6);
        c.stroke();
        // glasses
        c.beginPath();
        c.arc(0.12, -1.93, 0.07, 0, PI * 2);
        c.arc(0.26, -1.93, 0.07, 0, PI * 2);
        c.strokeStyle = C.ink;
        c.lineWidth = 0.025;
        c.stroke();
      });
    }, { bias: 2.2 });
    // Floor lamp and a plant in the corner
    R.thing(1.0, 15.2, (ctx, t) => lamp(ctx, 0.9, 15.0, t, C.butter));
    R.thing(1.0, 5.7, (ctx, t) => plant(ctx, 0.9, 5.6, 0, t, { kind: 'fern', scale: 1.3, potColor: C.white, leaf: C.green }), { anim: true });

    // Uncle blowing up balloons that keep popping
    const UX = 2.7, UY = 3.4;
    R.mover(() => ({ x: UX, y: UY }), (ctx, t) => {
      const k = pulse(t, 5.5);
      person(ctx, UX, UY, 0, folk(550, { dir: 'r', pose: 'stand', top: C.navy, bottom: C.grey, style: 'short', hair: HAIR[0], skin: SKIN[4], arms: [1.9, 1.7] }), t);
      const [X, Y] = P(UX, UY, 0);
      const mx = X + 0.35, my = Y - 1.95;
      if (k < 0.8) {
        const r = 0.08 + ease(k / 0.8) * 0.5;
        ctx.save();
        ctx.translate(mx + r * 0.95, my - r * 0.2);
        ctx.rotate(-PI / 2);
        balloon(ctx, 0, 0, r, C.purple, t, 0, 0);
        ctx.restore();
      } else if (Q.detail) {
        const q = (k - 0.8) / 0.2;
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * PI * 2;
          ctx.beginPath();
          ctx.arc(mx + 0.6 + Math.cos(a) * q * 0.8, my + Math.sin(a) * q * 0.6 + q * q * 0.6, 0.06, 0, PI * 2);
          ctx.fillStyle = C.purple;
          ctx.fill();
        }
        label(ctx, UX + 0.5, UY - 0.5, 2.9, 'POP!', 0.5 + q * 0.2, alpha(C.red, 1 - q * 0.6));
      }
    });
    R.rug((ctx) => {
      // spent balloon bits
      for (const [x, y, col] of [[3.4, 4.1, C.purple], [2.2, 4.6, C.purple], [3.1, 2.6, C.pink], [4.1, 3.0, C.purple]]) {
        onFloor(ctx, x, y, (c) => {
          c.beginPath();
          c.moveTo(-0.15, 0); c.lineTo(0, -0.1); c.lineTo(0.18, 0.05); c.lineTo(0, 0.12); c.closePath();
          c.fillStyle = col;
          c.fill();
        });
      }
    });

    // ---------- the piñata and the blindfolded batter ----------
    R.rug((ctx) => {
      disc(ctx, 5.4, 12.3, 0.01, 2.9, C.pink, { dots: C.coral, density: 0.18, lw: 0.04 });
      disc(ctx, 5.4, 12.3, 0.015, 2.1, tint(C.pink, 0.35), { stroke: false });
      // sweets that have leaked out already
      if (Q.detail) {
        const r = rng(8);
        for (let i = 0; i < 14; i++) {
          const a = r() * PI * 2, d = r() * 1.6;
          disc(ctx, 5.2 + Math.cos(a) * d, 12.1 + Math.sin(a) * d, 0.03, 0.09, pick(r, PARTY), { lw: 0.02 });
        }
      }
    });
    const PNX = 6.3, PNY = 13.3, PNZ = 2.1;
    R.mover(() => ({ x: PNX, y: PNY }), (ctx, t) => {
      const [TXp, TYp] = P(PNX, PNY, 7.7);
      const [X, Y] = P(PNX, PNY, PNZ);
      const hit = pulse(t, 6);
      const kick = hit > 0.55 && hit < 0.6 ? 1 : 0;
      const a = Math.sin(t * 1.6) * 0.14 + (hit > 0.55 ? Math.sin((hit - 0.55) * 30) * Math.exp(-(hit - 0.55) * 12) * 0.4 : 0);
      ctx.save();
      ctx.translate(TXp, TYp);
      ctx.rotate(a);
      const L = Y - TYp;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, L - 0.3);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.04; ctx.stroke();
      ctx.translate(0, L);
      // a donkey, of course
      const cols = [C.pink, C.mustard, C.teal, C.coral];
      ctx.fillStyle = C.ink;
      for (const lx of [-0.45, -0.2, 0.25, 0.5]) {
        ctx.beginPath();
        ctx.rect(lx - 0.08, 0.2, 0.16, 0.55);
        paint(ctx, C.mustard, { lw: 0.035 });
      }
      ctx.beginPath();
      ctx.roundRect(-0.7, -0.3, 1.4, 0.6, 0.2);
      paint(ctx, C.pink, { lw: 0.04 });
      if (Q.detail) {
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(-0.66, -0.18 + i * 0.13); ctx.lineTo(0.66, -0.18 + i * 0.13);
          ctx.strokeStyle = cols[i];
          ctx.lineWidth = 0.08;
          ctx.stroke();
        }
      }
      ctx.beginPath();
      ctx.moveTo(0.4, -0.2); ctx.lineTo(0.6, -0.8); ctx.lineTo(0.9, -0.8); ctx.lineTo(0.75, -0.15); ctx.closePath();
      paint(ctx, C.teal, { lw: 0.04 });
      ctx.beginPath();
      ctx.roundRect(0.55, -1.05, 0.65, 0.38, 0.15);
      paint(ctx, C.teal, { lw: 0.04 });
      ctx.beginPath();
      ctx.ellipse(0.65, -1.25, 0.07, 0.2, -0.3, 0, PI * 2);
      ctx.ellipse(0.82, -1.25, 0.07, 0.2, 0.3, 0, PI * 2);
      paint(ctx, C.coral, { lw: 0.03 });
      ctx.beginPath();
      ctx.arc(0.85, -0.93, 0.04, 0, PI * 2);
      ctx.fillStyle = C.ink;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-0.7, -0.1); ctx.lineTo(-0.95, 0.25);
      ctx.strokeStyle = C.coral; ctx.lineWidth = 0.08; ctx.stroke();
      ctx.restore();
      if (Q.detail && kick) label(ctx, PNX + 0.3, PNY + 0.3, PNZ + 1.6, 'BONK', 0.4, C.red);
    }, { bias: 0.3 });
    // The batter, blindfolded, swinging mostly at nothing
    const BX = 7.2, BYp = 13.0;
    R.mover(() => ({ x: BX, y: BYp }), (ctx, t) => {
      const hit = pulse(t, 6);
      const dir = hit > 0.4 && hit < 0.7 ? 'l' : Math.sin(t * 0.9) > 0 ? 'r' : 'l';
      const f = dir === 'l' ? -1 : 1;
      const sw = Math.sin(t * 4.2);
      const aA = PI - 0.4 - (sw * 0.5 + 0.5) * 1.8;
      const s = 0.74;
      person(ctx, BX, BYp, 0, folk(560, { dir, pose: 'stand', scale: s, top: C.green, hat: 'party', style: 'curly', hair: HAIR[1], arms: [aA, aA - 0.2] }), t);
      local(ctx, BX, BYp, 0, s, f, (c) => {
        // blindfold
        c.beginPath();
        c.rect(-0.3, -2.0, 0.64, 0.12);
        c.fillStyle = C.red;
        c.fill();
        c.beginPath();
        c.moveTo(-0.28, -1.96); c.lineTo(-0.5, -1.8); c.moveTo(-0.28, -1.94); c.lineTo(-0.45, -1.72);
        c.strokeStyle = C.red; c.lineWidth = 0.06; c.stroke();
        // bat
        const sy = -1.53, hx = 0.22 + Math.sin(aA) * 0.72, hy = sy + Math.cos(aA) * 0.72;
        c.beginPath();
        c.moveTo(hx, hy);
        c.lineTo(hx + Math.sin(aA) * 1.1, hy + Math.cos(aA) * 1.1);
        c.strokeStyle = C.ink; c.lineWidth = 0.2; c.lineCap = 'round'; c.stroke();
        c.strokeStyle = C.wood; c.lineWidth = 0.13; c.stroke();
      });
      if (Q.detail && pulse(t, 6) > 0.1 && pulse(t, 6) < 0.35) speech(ctx, BX, BYp, 2.4, 'AM I CLOSE?', { size: 0.38, dx: 0.8 });
    });
    // Kids tearing round the piñata
    [0, 3.5].forEach((off, i) => {
      const o = orbit(5.3, 12.4, 2.7, 2.3, 7, off);
      R.mover(o, (ctx, t, p) => person(ctx, p.x, p.y, 0, folk(570 + i, { pose: 'run', dir: p.dir, back: p.back, scale: 0.66, hat: 'party', speed: 13, top: i ? C.coral : C.lilac }), t));
    });

    // ---------- The Great Gary, the magician ----------
    R.rug((ctx) => {
      rect(ctx, 12.2, 8.4, 3.5, 4.8, 0.01, C.navy, { dots: C.purple, density: 0.3, lw: 0.04 });
      if (Q.detail) {
        const r = rng(4);
        for (let i = 0; i < 9; i++) {
          onFloor(ctx, 12.5 + r() * 3, 8.7 + r() * 4.2, (c) => {
            c.beginPath();
            for (let j = 0; j < 10; j++) {
              const a = (j / 10) * PI * 2, rr = j % 2 ? 0.07 : 0.17;
              c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
            }
            c.fillStyle = C.mustard;
            c.fill();
          });
        }
      }
    });
    // Easel sign
    R.thing(15.3, 8.8, (ctx) => {
      face(ctx, [[15.3, 7.6, 0], [15.1, 8.4, 2.6]], null, { lw: 0.08, stroke: C.brown });
      face(ctx, [[15.3, 9.2, 0], [15.1, 8.4, 2.6]], null, { lw: 0.08, stroke: C.brown });
      face(ctx, [[15.2, 7.6, 1.0], [15.2, 9.2, 1.0], [15.2, 9.2, 2.5], [15.2, 7.6, 2.5]], C.white, { lw: 0.05 });
      label(ctx, 15.2, 8.4, 2.05, 'THE GREAT', 0.26, C.purple);
      label(ctx, 15.2, 8.4, 1.55, 'GARY', 0.46, C.coral);
    });
    // Magic table with the (empty) top hat
    const MTX = 14.0, MTY = 12.2;
    R.thing(MTX + 0.5, MTY + 0.5, (ctx, t) => {
      cylinder(ctx, MTX, MTY, 0, 0.08, 1.1, C.ink, { flat: true });
      cylinder(ctx, MTX, MTY, 1.1, 0.55, 0.08, C.purple);
      const [X, Y] = P(MTX, MTY, 1.2);
      const w = Math.sin(t * 3) * 0.05;
      ctx.save();
      ctx.translate(X, Y);
      ctx.rotate(w);
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.45, 0.14, 0, 0, PI * 2);
      paint(ctx, C.black, { lw: 0.03 });
      ctx.beginPath();
      ctx.rect(-0.28, -0.6, 0.56, 0.6);
      paint(ctx, C.black, { lw: 0.03 });
      ctx.fillStyle = C.red;
      ctx.fillRect(-0.28, -0.2, 0.56, 0.1);
      ctx.restore();
    }, { anim: true });
    // Gary, pulling out an endless string of hankies
    const GRX = 14.5, GRY = 10.3, MP = 12;
    R.mover(() => ({ x: GRX, y: GRY }), (ctx, t) => {
      const k = pulse(t, MP);
      person(ctx, GRX, GRY, 0, { skin: SKIN[0], hair: HAIR[0], style: 'short', top: C.purple, bottom: C.ink, dir: 'l', pose: 'stand',
        arms: [1.5 + Math.sin(t * 5) * 0.25, 0.6] }, t);
      local(ctx, GRX, GRY, 0, 1, -1, (c) => {
        // top hat
        c.beginPath();
        c.rect(-0.38, -2.3, 0.8, 0.1);
        c.rect(-0.25, -2.85, 0.54, 0.58);
        paint(c, C.black, { lw: 0.03 });
        c.fillStyle = C.red;
        c.fillRect(-0.25, -2.42, 0.54, 0.1);
        // moustache
        c.beginPath();
        c.ellipse(0.18, -1.84, 0.13, 0.05, 0.2, 0, PI * 2);
        c.fillStyle = C.ink;
        c.fill();
        // cape behind
        c.beginPath();
        c.moveTo(-0.28, -1.6); c.lineTo(-0.6, -0.4); c.lineTo(-0.2, -0.5); c.closePath();
        paint(c, C.red, { lw: 0.03 });
      });
      // the hankies
      const [X, Y] = P(GRX, GRY, 0);
      const aA = 1.5 + Math.sin(t * 5) * 0.25;
      const hx = X - (0.22 + Math.sin(aA) * 0.72), hy = Y - 1.53 + Math.cos(aA) * 0.72;
      const [pX, pY] = P(13.2, 11.2, 0.1);
      const pull = t * 0.9;
      const n = 12;
      for (let i = 0; i < n; i++) {
        const q = (i + (pull % 1)) / n;
        const x = lerp(hx, pX, q), y = lerp(hy, pY, q) - Math.sin(q * PI) * 0.5;
        ctx.beginPath();
        ctx.moveTo(x, y - 0.12); ctx.lineTo(x + 0.12, y); ctx.lineTo(x, y + 0.12); ctx.lineTo(x - 0.12, y); ctx.closePath();
        paint(ctx, PARTY[(i - Math.floor(pull) + 600) % PARTY.length], { lw: 0.025 });
      }
      // the growing pile
      const pr = 0.25 + k * 0.5;
      ctx.beginPath();
      ctx.ellipse(pX, pY - pr * 0.3, pr * 1.2, pr * 0.6, 0, 0, PI * 2);
      paint(ctx, C.pink, { dots: C.coral, density: 0.35, lw: 0.035 });
      ctx.beginPath();
      ctx.ellipse(pX + 0.1, pY - pr * 0.55, pr * 0.7, pr * 0.35, 0, 0, PI * 2);
      paint(ctx, C.teal, { dots: C.mustard, density: 0.35, lw: 0.035 });
      if (Q.detail) {
        const line = k < 0.33 ? 'NOTHING UP MY SLEEVE' : k < 0.66 ? 'TA-DA!' : 'WHERE IS MY RABBIT?';
        speech(ctx, GRX, GRY, 3.3, line, { size: 0.38, dx: -0.4 });
      }
    }, { bias: 0.3 });
    // His audience, deeply unimpressed
    R.mover(() => ({ x: 10.9, y: 10.6 }), (ctx, t) => person(ctx, 10.9, 10.6, -0.45, folk(580, { pose: 'sit', dir: 'r', scale: 0.68, hat: 'party' }), t));
    R.mover(() => ({ x: 11.3, y: 12.4 }), (ctx, t) => person(ctx, 11.3, 12.4, -0.45, folk(581, { pose: 'sit', dir: 'r', scale: 0.7, top: C.coral, style: 'long' }), t));
    R.mover(() => ({ x: 10.2, y: 13.8 }), (ctx, t) => {
      person(ctx, 10.2, 13.8, 0, folk(582, { pose: 'point', dir: 'l', scale: 0.7, top: C.mustard, hat: 'party' }), t);
      if (Q.detail && pulse(t, 8) > 0.6) speech(ctx, 10.2, 13.8, 2.1, 'IT WENT THAT WAY', { size: 0.34, dx: -0.8 });
    });

    // The rabbit, making a break for it (a find)
    const bunny = route([[13.3, 13.0, 1.2], [15.2, 15.0], [12.4, 15.3, 1.0], [8.8, 15.2], [9.2, 11.6, 1.5], [9.8, 8.4], [11.8, 7.6, 1.2], [12.6, 10.0]], { speed: 0.9 });
    const bunnyAt = (t) => {
      const p = bunny(t);
      return { ...p, z: p.moving ? Math.abs(Math.sin(t * 7)) * 0.35 : 0 };
    };
    R.mover(bunnyAt, (ctx, t, p) => {
      if (Q.detail) {
        const [X, Y] = P(p.x, p.y, 0);
        ctx.beginPath();
        ctx.ellipse(X, Y, 0.25, 0.1, 0, 0, PI * 2);
        ctx.fillStyle = alpha(C.ink, 0.15);
        ctx.fill();
      }
      rabbit(ctx, p.x, p.y, p.z, t, p.dir);
    });
    R.find({ id: 'rabbit', label: "The magician's rabbit", r: 0.8, at: (t) => { const p = bunnyAt(t); return [p.x, p.y, p.z + 0.35]; } });

    // Balloons that got away, pressed against the ceiling
    R.air((ctx, t) => {
      const bs = [[3.2, 2.4, C.coral], [6.0, 1.4, C.mustard], [1.4, 5.0, C.teal], [2.2, 10.5, C.pink], [8.2, 2.2, C.purple], [14.5, 5.0, C.sky], [1.6, 15.0, C.coral]];
      bs.forEach(([x, y, col], i) => {
        const [X, Y] = P(x + Math.sin(t * 0.3 + i) * 0.3, y + Math.cos(t * 0.25 + i) * 0.3, 7.0 + Math.sin(t * 1.1 + i) * 0.08);
        balloon(ctx, X, Y, 0.36, col, t, i, 1.4);
      });
    });
  },
};

function note(ctx, x, y, z, color, s = 1) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.06;
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.14, 0.1, -0.4, 0, PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0.12, -0.02); ctx.lineTo(0.12, -0.5); ctx.lineTo(0.3, -0.38);
  ctx.stroke();
  ctx.restore();
}
