// Greenhouse: glass walls, a flytrap with a grudge, a snail derby, a prize
// pumpkin, a gardener on a ladder and a sprinkler that runs on its own schedule.
import {
  C, box, rect, disc, cylinder, face, paint, person, folk, plant, walls, slab, floor,
  onLeft, onRight, speech, paintText, shade, tint, mix, alpha, dots, Q, P, rng, pick,
} from '../../../engine/art.js';
import { route, particles, pulse, clamp, ease } from '../../../engine/actors.js';
import { ZK } from '../../../engine/iso.js';

const H = 6.4; // glass wall height
const TERRA = mix(C.coral, C.brown, 0.35);
const ORANGE = mix(C.coral, C.mustard, 0.45);
const BRICK = mix(C.coral, C.paper, 0.45);
const GRAVEL = mix(C.paperDeep, C.greyLight, 0.4);

// ---------- little local helpers ----------
function txt(ctx, X, Y, s, size, color = C.ink, font = 'Bagel Fat One') {
  const k = 40;
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(1 / k, 1 / k);
  ctx.font = `${size * k}px "${font}", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(s, 0, 0);
  ctx.restore();
}

// A board on a stake that faces the viewer.
function sign(ctx, x, y, text, o = {}) {
  const z = o.z ?? 1.0, w = o.w ?? 1.6, h = o.h ?? 0.55;
  box(ctx, x - 0.05, y - 0.05, 0, 0.1, 0.1, z + 0.1, C.brown, { flat: true });
  const [X, Y] = P(x, y, z + h / 2);
  ctx.beginPath();
  ctx.roundRect(X - w / 2, Y - (h * ZK) / 2, w, h * ZK, 0.08);
  paint(ctx, o.fill || C.white, { lw: 0.05 });
  txt(ctx, X, Y + 0.02, text, o.size || 0.3, o.color || C.ink);
}

function leafShape(ctx, X, Y, ang, len, wid, col, slits = true) {
  ctx.save();
  ctx.translate(X, Y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(wid, -len * 0.05, wid * 1.15, -len * 0.75, 0, -len);
  ctx.bezierCurveTo(-wid * 1.15, -len * 0.75, -wid, -len * 0.05, 0, 0);
  paint(ctx, col, { dots: shade(col, 0.45), density: 0.14, lw: 0.05 });
  if (Q.detail) {
    ctx.beginPath();
    ctx.moveTo(0, -len * 0.04);
    ctx.lineTo(0, -len * 0.9);
    if (slits) {
      for (let k = 0.22; k < 0.8; k += 0.15) {
        const w = wid * 0.82 * Math.pow(Math.sin(Math.PI * Math.min(k, 0.9)), 0.8);
        ctx.moveTo(w * 0.97, -len * k);
        ctx.lineTo(w * 0.3, -len * (k + 0.05));
        ctx.moveTo(-w * 0.97, -len * k);
        ctx.lineTo(-w * 0.3, -len * (k + 0.05));
      }
    }
    ctx.strokeStyle = shade(col, 0.5);
    ctx.lineWidth = 0.05;
    ctx.stroke();
  }
  ctx.restore();
}

function stem(ctx, X0, Y0, X1, Y1, col = C.green, w = 0.1) {
  ctx.beginPath();
  ctx.moveTo(X0, Y0);
  ctx.quadraticCurveTo(X0 + (X1 - X0) * 0.2, Y1 + (Y0 - Y1) * 0.3, X1, Y1);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = w + 0.06;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.stroke();
}

// Small pot with flowers (for the tiered bench).
function flowerPot(ctx, x, y, z, color, potColor = TERRA, s = 0.5) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(s, s);
  for (const [dx, h, c] of [[-0.25, 1.1, color], [0.05, 1.4, color], [0.3, 1.0, C.white]]) {
    stem(ctx, 0, -0.5, dx, -h, C.green, 0.07);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.moveTo(dx + Math.cos(a) * 0.16 + 0.12, -h + Math.sin(a) * 0.16);
      ctx.arc(dx + Math.cos(a) * 0.16, -h + Math.sin(a) * 0.16, 0.12, 0, Math.PI * 2);
    }
    paint(ctx, c, { lw: 0.04 });
    ctx.beginPath();
    ctx.arc(dx, -h, 0.08, 0, Math.PI * 2);
    ctx.fillStyle = C.mustard;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-0.35, -0.55); ctx.lineTo(0.35, -0.55); ctx.lineTo(0.26, 0); ctx.lineTo(-0.26, 0);
  ctx.closePath();
  paint(ctx, potColor, { dots: shade(potColor, 0.5), density: 0.2 });
  ctx.restore();
}

function gnome(ctx, x, y, z, s = 0.55) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(s, s);
  // boots
  ctx.fillStyle = C.ink;
  ctx.beginPath(); ctx.ellipse(-0.15, 0, 0.16, 0.08, 0, 0, Math.PI * 2); ctx.ellipse(0.17, 0, 0.16, 0.08, 0, 0, Math.PI * 2); ctx.fill();
  // coat
  ctx.beginPath();
  ctx.moveTo(-0.4, 0); ctx.lineTo(0.4, 0); ctx.lineTo(0.28, -0.8); ctx.lineTo(-0.28, -0.8); ctx.closePath();
  paint(ctx, C.navy, { dots: C.ink, density: 0.2, lw: 0.06 });
  ctx.beginPath(); ctx.rect(-0.36, -0.28, 0.72, 0.1); ctx.fillStyle = C.brown; ctx.fill();
  // face
  ctx.beginPath(); ctx.arc(0, -1.0, 0.22, 0, Math.PI * 2); paint(ctx, '#F4CDAA', { lw: 0.06 });
  // beard
  ctx.beginPath(); ctx.moveTo(-0.24, -0.98); ctx.quadraticCurveTo(0, -0.95, 0.24, -0.98); ctx.lineTo(0, -0.42); ctx.closePath();
  paint(ctx, C.white, { lw: 0.06 });
  // nose
  ctx.beginPath(); ctx.arc(0.02, -0.98, 0.07, 0, Math.PI * 2); ctx.fillStyle = C.pink; ctx.fill();
  // hat
  ctx.beginPath(); ctx.moveTo(-0.27, -1.1); ctx.lineTo(0.27, -1.1); ctx.lineTo(0.1, -1.95); ctx.closePath();
  paint(ctx, C.red, { lw: 0.06 });
  ctx.restore();
}

function wateringCan(ctx, x, y, z, s = 1) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(s, s);
  // spout
  ctx.beginPath();
  ctx.moveTo(0.25, -0.2); ctx.lineTo(0.72, -0.62); ctx.lineTo(0.78, -0.55); ctx.lineTo(0.3, -0.1);
  ctx.closePath();
  paint(ctx, C.teal, { lw: 0.04 });
  ctx.beginPath(); ctx.ellipse(0.78, -0.6, 0.06, 0.1, -0.8, 0, Math.PI * 2); paint(ctx, C.tealLight, { lw: 0.03 });
  // handle
  ctx.beginPath(); ctx.arc(-0.05, -0.5, 0.26, Math.PI, 0); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.12; ctx.stroke();
  ctx.strokeStyle = C.teal; ctx.lineWidth = 0.06; ctx.stroke();
  // body
  ctx.beginPath(); ctx.roundRect(-0.32, -0.5, 0.6, 0.5, 0.06); paint(ctx, C.teal, { dots: shade(C.teal, 0.5), density: 0.2, lw: 0.04 });
  ctx.beginPath(); ctx.ellipse(-0.02, -0.5, 0.3, 0.08, 0, 0, Math.PI * 2); paint(ctx, C.tealLight, { lw: 0.03 });
  ctx.restore();
}

// A snail facing screen-right. num: text on the shell. bob: body stretch 0..1
function snail(ctx, X, Y, s, shell, num, bob = 0, stripe) {
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(s, s);
  const st = 1 + bob * 0.12;
  ctx.beginPath();
  ctx.roundRect(-0.4, -0.14, 0.9 * st, 0.16, 0.08);
  paint(ctx, mix(C.greyLight, C.brown, 0.3), { lw: 0.04 });
  const hx = -0.4 + 0.9 * st - 0.06;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.035;
  ctx.beginPath();
  ctx.moveTo(hx - 0.05, -0.12); ctx.lineTo(hx + 0.05, -0.42);
  ctx.moveTo(hx - 0.12, -0.12); ctx.lineTo(hx - 0.1, -0.4);
  ctx.stroke();
  ctx.fillStyle = C.ink;
  ctx.beginPath(); ctx.arc(hx + 0.05, -0.43, 0.045, 0, Math.PI * 2); ctx.arc(hx - 0.1, -0.41, 0.045, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.arc(-0.05, -0.34, 0.26, 0, Math.PI * 2);
  paint(ctx, shell, { dots: shade(shell, 0.45), density: 0.2, lw: 0.04 });
  if (stripe) {
    ctx.beginPath(); ctx.rect(-0.2, -0.6, 0.12, 0.52); ctx.fillStyle = stripe; ctx.fill();
  }
  if (num) {
    ctx.beginPath(); ctx.arc(-0.05, -0.34, 0.17, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.03 });
    txt(ctx, -0.05, -0.33, num, 0.24, C.ink);
  } else if (Q.detail) {
    ctx.beginPath();
    for (let a = 0; a < 9; a += 0.3) {
      const r = 0.22 * (1 - a / 10);
      const px = -0.05 + Math.cos(a) * r, py = -0.34 + Math.sin(a) * r;
      a ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.strokeStyle = shade(shell, 0.5); ctx.lineWidth = 0.03; ctx.stroke();
  }
  ctx.restore();
}

// Hanging basket, pivoting from (x, y, z) on a bracket.
function basket(ctx, x, y, z, t, flowers = C.pink, drip = false) {
  const [X, Y] = P(x, y, z);
  const th = Math.sin(t * 1.3 + x * 0.7 + y) * 0.13;
  ctx.save();
  ctx.translate(X, Y);
  ctx.rotate(th);
  const L = 1.1;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.035;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(-0.5, L);
  ctx.moveTo(0, 0); ctx.lineTo(0.5, L);
  ctx.moveTo(0, 0); ctx.lineTo(0.05, L - 0.1);
  ctx.stroke();
  // trailing vines behind the bowl
  if (Q.detail) {
    for (let i = 0; i < 6; i++) {
      const vx = -0.45 + i * 0.18, len = 0.9 + ((i * 37) % 5) * 0.2;
      const sw = Math.sin(t * 1.7 + i) * 0.06;
      ctx.beginPath();
      ctx.moveTo(vx, L + 0.15);
      ctx.quadraticCurveTo(vx + sw * 3, L + len * 0.6, vx + sw * 4, L + len);
      ctx.strokeStyle = C.green; ctx.lineWidth = 0.06; ctx.stroke();
      for (let k = 1; k < 4; k++) {
        ctx.beginPath();
        ctx.ellipse(vx + sw * k, L + 0.1 + (len * k) / 4, 0.09, 0.06, 0.5, 0, Math.PI * 2);
        ctx.fillStyle = k % 2 ? C.leaf : flowers;
        ctx.fill();
      }
    }
  }
  // foliage dome
  for (const [fx, fy, r, c] of [[-0.35, L - 0.05, 0.28, C.green], [0.35, L - 0.05, 0.28, C.leaf], [0, L - 0.2, 0.32, C.leaf]]) {
    ctx.beginPath(); ctx.arc(fx, fy, r, 0, Math.PI * 2); paint(ctx, c, { dots: shade(c, 0.45), density: 0.15, lw: 0.04 });
  }
  for (const [fx, fy] of [[-0.3, L - 0.2], [0.1, L - 0.4], [0.35, L - 0.1], [-0.1, L - 0.05]]) {
    ctx.beginPath(); ctx.arc(fx, fy, 0.08, 0, Math.PI * 2); ctx.fillStyle = flowers; ctx.fill();
  }
  // bowl
  ctx.beginPath();
  ctx.moveTo(-0.6, L); ctx.lineTo(0.6, L);
  ctx.quadraticCurveTo(0.55, L + 0.55, 0, L + 0.55);
  ctx.quadraticCurveTo(-0.55, L + 0.55, -0.6, L);
  paint(ctx, C.brown, { dots: C.ink, density: 0.25, lw: 0.04 });
  if (drip && Q.detail) {
    for (let i = 0; i < 3; i++) {
      const k = pulse(t, 0.9, i * 0.3);
      ctx.beginPath(); ctx.arc(-0.2 + i * 0.2, L + 0.55 + k * 1.2, 0.05, 0, Math.PI * 2);
      ctx.fillStyle = alpha(C.sky, 1 - k); ctx.fill();
    }
  }
  ctx.restore();
}
function bracketL(ctx, y, z) {
  face(ctx, [[0, y, z], [1.0, y, z]], null, { lw: 0.1 });
  face(ctx, [[0, y, z - 0.6], [0.6, y, z]], null, { lw: 0.06 });
}
function bracketR(ctx, x, z) {
  face(ctx, [[x, 0, z], [x, 1.0, z]], null, { lw: 0.1 });
  face(ctx, [[x, 0, z - 0.6], [x, 0.6, z]], null, { lw: 0.06 });
}

// Tiered plant stand against the left wall, one chunk along y.
function tierSeg(ctx, y0, y1, seed, skip) {
  const r = rng(seed);
  const tiers = [[0, 2.0], [0.8, 1.35], [1.6, 0.7]];
  const w = y1 - y0;
  for (const [x0, z] of tiers) {
    for (const ly of [y0 + 0.08, y1 - 0.2]) box(ctx, x0 + 0.62, ly, 0, 0.12, 0.12, z, C.brown, { flat: true, lw: 0.03 });
    box(ctx, x0, y0, z - 0.12, 0.8, w, 0.12, C.wood, { lw: 0.04 });
    let yy = y0 + 0.35;
    while (yy < y1 - 0.2) {
      if (!skip || Math.abs(yy - skip) > 0.45) {
        const k = r();
        const pc = pick(r, [TERRA, TERRA, C.white, C.coral, C.mustard]);
        if (k < 0.3) flowerPot(ctx, x0 + 0.4, yy, z, pick(r, [C.pink, C.coral, C.lilac, C.mustard, C.red]), pc, 0.5);
        else plant(ctx, x0 + 0.4, yy, z, 0, { kind: pick(r, ['leafy', 'spiky', 'bush', 'cactus', 'fern']), scale: 0.4 + r() * 0.18, potColor: pc, leaf: pick(r, [C.green, C.leaf, C.teal]) });
      }
      yy += 0.55 + r() * 0.2;
    }
  }
}

function monstera(ctx, t, front) {
  const [X, Y] = P(1.4, 1.4, 1.1);
  const leaves = front
    ? [[-1.5, 1.1, 1.8, C.leaf], [1.4, 1.0, 1.9, C.green], [-0.35, 0.7, 2.2, C.green]]
    : [[-0.6, 3.6, 2.3, C.green], [0.2, 4.4, 2.4, C.leaf], [0.9, 3.4, 2.2, C.green], [-1.2, 2.6, 2.0, C.leaf], [1.8, 2.3, 2.0, C.leaf], [-2.1, 1.8, 1.9, C.green], [2.4, 1.6, 1.8, C.green]];
  leaves.forEach(([dx, up, len, col], i) => {
    const sw = Math.sin(t * 0.9 + i * 1.3) * 0.05;
    const lx = X + dx * 0.9, ly = Y - up * 0.9;
    stem(ctx, X, Y, lx, ly, C.green, 0.1);
    const ang = Math.atan2(lx - X, -(ly - Y)) * 1.1 + sw;
    leafShape(ctx, lx, ly + 0.2, ang, len, len * 0.5, col);
  });
}

export default {
  id: 'greenhouse',
  name: 'Greenhouse',
  blurb: 'The prize pumpkin has a ribbon and an agent. The flytrap has missed the same fly all morning.',

  build(R) {
    // ---------- floor: gravel with brick paths ----------
    R.floor((ctx) => {
      slab(ctx, C.greyLight);
      floor(ctx, GRAVEL, { dots: shade(GRAVEL, 0.35), density: 0.14, stroke: false });
      const bricks = (x0, y0, w, d, alongX) => {
        rect(ctx, x0, y0, w, d, 0.01, BRICK, { dots: shade(BRICK, 0.35), density: 0.1, lw: 0.04 });
        if (!Q.detail) return;
        ctx.beginPath();
        if (alongX) {
          for (let j = 1; j < 3; j++) { const a = P(x0, y0 + (j * d) / 3), b = P(x0 + w, y0 + (j * d) / 3); ctx.moveTo(...a); ctx.lineTo(...b); }
          for (let j = 0; j < 3; j++) for (let i = (j % 2) * 0.4 + 0.4; i < w; i += 0.8) {
            const a = P(x0 + i, y0 + (j * d) / 3), b = P(x0 + i, y0 + ((j + 1) * d) / 3); ctx.moveTo(...a); ctx.lineTo(...b);
          }
        } else {
          for (let j = 1; j < 3; j++) { const a = P(x0 + (j * w) / 3, y0), b = P(x0 + (j * w) / 3, y0 + d); ctx.moveTo(...a); ctx.lineTo(...b); }
          for (let j = 0; j < 3; j++) for (let i = (j % 2) * 0.4 + 0.4; i < d; i += 0.8) {
            const a = P(x0 + (j * w) / 3, y0 + i), b = P(x0 + ((j + 1) * w) / 3, y0 + i); ctx.moveTo(...a); ctx.lineTo(...b);
          }
        }
        ctx.strokeStyle = shade(BRICK, 0.35);
        ctx.lineWidth = 0.03;
        ctx.stroke();
      };
      bricks(9.2, 1.4, 1.2, 14.6, false);
      bricks(2.5, 10.2, 13.5, 1.2, true);
    });

    // ---------- glass walls ----------
    R.wall((ctx) => {
      walls(ctx, { h: H, left: C.mint, right: tint(C.mint, 0.3), cap: C.white });
      // the garden outside, seen through the glass
      const hedge = (plane) => {
        const pts = [];
        for (let u = 0; u <= 16.01; u += 0.5) pts.push([u, 1.3 + Math.sin(u * 1.9) * 0.25 + Math.sin(u * 0.7) * 0.35]);
        const on = (u, z) => (plane === 'L' ? [0, u, z] : [u, 0, z]);
        face(ctx, [on(0, 0), ...pts.map(([u, z]) => on(u, z)), on(16, 0)], mix(C.mint, C.green, 0.3), { dots: mix(C.mint, C.green, 0.6), density: 0.2, stroke: false });
        for (const [u, z, rr] of plane === 'L' ? [[3.5, 3.0, 1.2], [11, 2.6, 0.9]] : [[5.5, 2.9, 1.1], [13.5, 2.5, 0.8]]) {
          const ring = [];
          for (let a = 0; a < Math.PI * 2; a += 0.3) ring.push(on(u + Math.cos(a) * rr, z + Math.sin(a) * rr * 0.9 + 0.2));
          face(ctx, [on(u - 0.12, 0), on(u + 0.12, 0), on(u + 0.12, z), on(u - 0.12, z)], mix(C.mint, C.brown, 0.3), { stroke: false });
          face(ctx, ring, mix(C.mint, C.green, 0.4), { dots: mix(C.mint, C.green, 0.7), density: 0.2, stroke: false });
        }
      };
      hedge('L');
      hedge('R');
    });
    R.decor((ctx) => {
      // white mullion grid and a few glints
      const zs = [0.02, 0.9, 3.1, 5.2, H - 0.02];
      const W = (a, b, lw = 0.13) => face(ctx, [a, b], null, { lw, stroke: C.white });
      for (let u = 0; u <= 16.01; u += 2) {
        W([0, u, 0], [0, u, H]);
        W([u, 0, 0], [u, 0, H]);
      }
      for (const z of zs) {
        W([0, 0, z], [0, 16, z]);
        W([0, 0, z], [16, 0, z]);
      }
      if (Q.detail) {
        for (const [u, z] of [[1, 3.5], [5, 1.2], [9, 3.4], [13, 1.3], [7, 5.4]]) {
          face(ctx, [[0, u + 0.3, z + 0.2], [0, u + 1.1, z + 1.3]], null, { lw: 0.07, stroke: alpha(C.white, 0.8) });
          face(ctx, [[u + 0.4, 0, z + 0.2], [u + 1.2, 0, z + 1.3]], null, { lw: 0.07, stroke: alpha(C.white, 0.8) });
        }
      }
      // brackets for the hanging baskets
      for (const y of [7, 10.5, 14]) bracketL(ctx, y, 5.4);
      for (const x of [10.1, 12.4]) bracketR(ctx, x, 5.4);
      // pegboard with tools behind the potting bench
      onRight(ctx, 4.9, 1.6, 4.0, 1.9, C.woodLight, { dots: shade(C.woodLight, 0.3), density: 0.25 });
      const tool = (x, z, len, head) => {
        face(ctx, [[x, 0.02, z], [x, 0.02, z - len]], null, { lw: 0.08, stroke: C.brown });
        head(x, z - len);
      };
      tool(5.4, 3.3, 1.2, (x, z) => face(ctx, [[x - 0.25, 0.02, z], [x + 0.25, 0.02, z], [x + 0.2, 0.02, z - 0.35], [x - 0.2, 0.02, z - 0.35]], C.grey, { lw: 0.03 }));
      tool(6.1, 3.3, 1.0, (x, z) => face(ctx, [[x - 0.14, 0.02, z], [x + 0.14, 0.02, z], [x, 0.02, z - 0.45]], C.grey, { lw: 0.03 }));
      tool(6.9, 3.3, 1.3, (x, z) => { for (let i = -2; i <= 2; i++) face(ctx, [[x + i * 0.1, 0.02, z], [x + i * 0.1, 0.02, z - 0.3]], null, { lw: 0.04, stroke: C.ink }); });
      face(ctx, [[7.6, 0.02, 3.0], [8.0, 0.02, 2.2], [7.9, 0.02, 2.2], [7.5, 0.02, 3.0]], C.coral, { lw: 0.03 });
      face(ctx, [[8.2, 0.02, 3.0], [7.8, 0.02, 2.2], [7.9, 0.02, 2.2], [8.3, 0.02, 3.0]], C.coral, { lw: 0.03 });
      // tap and hose reel on the right wall
      onRight(ctx, 15.0, 0.6, 0.5, 0.5, C.grey);
      face(ctx, [[15.25, 0.05, 1.1], [15.25, 0.05, 1.35]], null, { lw: 0.12, stroke: C.red });
      // wooden sign on the glass
      onLeft(ctx, 1.1, 4.6, 5.4, 0.9, C.wood, { dots: shade(C.wood, 0.4), density: 0.2 });
    });
    R.decor((ctx) => {
      // sign text (a separate item so the font is fresh when baked)
      paintText(ctx, 'left', 3.8, 5.05, 'GREENHOUSE No.5', 0.46, C.white);
    });

    // Hose running from the tap, under the snoozer's deck chair, to the ladder.
    R.rug((ctx) => {
      const pts = [[15.25, 0.3], [15.0, 2.8], [14.6, 4.2], [14.0, 5.6], [12.9, 5.2], [12.0, 4.4], [12.3, 3.4]];
      ctx.beginPath();
      pts.forEach(([x, y], i) => { const [X, Y] = P(x, y, 0.05); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.18; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.strokeStyle = C.green; ctx.lineWidth = 0.1; ctx.stroke();
      // tomato bed
      rect(ctx, 14.5, 8.1, 1.4, 2.1, 0.02, C.brown, { dots: C.ink, density: 0.3, lw: 0.04 });
      // shadow puddle of pumpkin
      disc(ctx, 5.4, 13.4, 0.02, 1.6, alpha(C.ink, 0.12), { stroke: false });
    });

    // ---------- back corner: monstera and the goose's raised bed ----------
    R.thing(1.4, 1.4, (ctx, t) => {
      cylinder(ctx, 1.4, 1.4, 0, 0.8, 1.1, TERRA, { top: C.brown });
      monstera(ctx, t, false);
    }, { anim: true });
    R.thing(2.9, 2.9, (ctx, t) => monstera(ctx, t, true), { anim: true, depth: 2.9 });

    // Raised bed: back half first (box + tall leaves), then the goose, then the front leaves.
    const BED = [2.8, 2.8, 2.3, 2.3, 0.8];
    R.thing(3.6, 3.6, (ctx, t) => {
      box(ctx, BED[0], BED[1], 0, BED[2], BED[3], BED[4], C.wood, { top: C.brown, dotsT: C.ink, densT: 0.3 });
      const [X, Y] = P(3.7, 3.4, 0.8);
      [[-0.9, 2.2, -0.45], [0.2, 2.6, 0.05], [1.0, 2.1, 0.5]].forEach(([dx, len, a], i) => {
        const sw = Math.sin(t * 1.1 + i) * 0.04;
        stem(ctx, X, Y, X + dx * 0.5, Y - 0.4, C.green, 0.09);
        leafShape(ctx, X + dx * 0.5, Y - 0.3, a + sw, len, len * 0.42, i % 2 ? C.green : C.teal, false);
      });
    }, { anim: true, depth: 6.9 });
    R.thing(5.1, 5.1, (ctx, t) => {
      const [X, Y] = P(4.2, 4.2, 0.8);
      [[-1.3, 1.5, -1.0, C.leaf], [1.2, 1.5, 1.05, C.green], [-0.5, 1.4, -0.35, C.green], [0.45, 1.35, 0.4, C.leaf]].forEach(([dx, len, a, col], i) => {
        const sw = Math.sin(t * 1.3 + i * 2) * 0.05;
        stem(ctx, X, Y + 0.1, X + dx * 0.25, Y - 0.1, C.green, 0.08);
        leafShape(ctx, X + dx * 0.25, Y, a + sw, len, len * 0.5, col, false);
      });
    }, { anim: true, depth: 9.2 });
    // The goose ducks down among the giant leaves, then pops up and looks around.
    R.goose((t) => {
      const s = pulse(t, 9) * 9;
      let z = 0.05, dir = 'r', pose = 'stand';
      if (s > 2.5 && s < 7.8) {
        const up = clamp((s - 2.5) / 0.35) * (1 - clamp((s - 7.4) / 0.4));
        z = 0.05 + ease(up) * 0.75;
        dir = s < 4 ? 'r' : s < 5.5 ? 'l' : 'r';
        if (s > 5.6 && s < 6.4) pose = 'honk';
      }
      return { x: 3.8, y: 3.7, z, dir, pose };
    }, { bias: 0 });

    // ---------- tiered plant stand on the left wall ----------
    for (let i = 0; i < 4; i++) {
      const y0 = 5.6 + i * 2.5, y1 = y0 + 2.5;
      R.thing(2.4, y1, (ctx) => {
        tierSeg(ctx, y0, y1, 50 + i, i === 1 ? 9.3 : null);
        if (i === 1) gnome(ctx, 2.0, 9.3, 0.7, 0.5);
      });
    }
    R.find({ id: 'gnome', label: 'A garden gnome', at: [2.0, 9.3, 1.2], r: 0.7 });

    // Hanging baskets (swaying). The one by the ladder is getting watered.
    for (const y of [7, 10.5, 14]) R.thing(1.0, y, (ctx, t) => basket(ctx, 1.0, y, 5.4, t, y === 10.5 ? C.mustard : C.pink), { anim: true });
    R.thing(10.1, 1.0, (ctx, t) => basket(ctx, 10.1, 1.0, 5.4, t, C.lilac), { anim: true });

    // ---------- potting bench and the repotter ----------
    R.thing(9.0, 1.3, (ctx) => {
      table(ctx, 4.8, 0.1, 4.2, 1.2, 1.1, C.wood);
      box(ctx, 5.0, 0.3, 1.1, 1.3, 0.8, 0.35, C.brown, { top: C.ink });
      for (const [px, n] of [[6.8, 3], [7.5, 2]]) for (let k = 0; k < n; k++) cylinder(ctx, px, 0.6, 1.1 + k * 0.18, 0.28, 0.2, TERRA);
      plant(ctx, 8.4, 0.6, 1.1, 0, { kind: 'bush', scale: 0.4, potColor: TERRA, leaf: C.leaf });
      // seed trays on a shelf above
      box(ctx, 5.0, 0, 3.8, 3.8, 0.7, 0.1, C.wood);
      for (let i = 0; i < 6; i++) plant(ctx, 5.4 + i * 0.6, 0.35, 3.9, 0, { kind: 'spiky', scale: 0.22, potColor: C.white, leaf: C.leaf });
    }, { depth: 6 });
    R.mover(() => ({ x: 6.6, y: 2.0 }), (ctx, t) => {
      const dig = pulse(t, 1.6) < 0.5;
      person(ctx, 6.6, 2.0, 0, folk(71, { back: true, dir: 'r', pose: 'stand', arms: dig ? [2.4, 2.0] : [2.0, 2.3], hat: 'sun', top: C.green }), t);
      if (!Q.detail) return;
      particles(t, 7, 0.9, (k, r) => {
        const [X, Y] = P(6.0 + r() * 0.8, 0.8 + r() * 0.3, 1.5 + Math.sin(k * Math.PI) * 0.9);
        ctx.beginPath(); ctx.arc(X + (r() - 0.5) * k * 1.2, Y, 0.06, 0, Math.PI * 2);
        ctx.fillStyle = C.brown; ctx.fill();
      }, 3);
    });

    // ---------- the gardener on the stepladder, and the hose gag ----------
    // 0-8s watering the basket; 8-10.2 the snoozer rolls onto the hose and it stops;
    // 10.2-11.4 he rolls back and the gardener gets it in the face.
    const HOSE = 14;
    const hoseState = (t) => {
      const s = pulse(t, HOSE) * HOSE;
      return s < 8 ? 'on' : s < 10.2 ? 'off' : s < 11.4 ? 'blast' : 'on';
    };
    R.thing(12.2, 3.4, (ctx) => {
      // stepladder: two A-frames
      for (const ly of [2.2, 3.1]) {
        face(ctx, [[11.4, ly, 0], [12.1, ly, 2.4]], null, { lw: 0.14, stroke: C.ink });
        face(ctx, [[11.4, ly, 0], [12.1, ly, 2.4]], null, { lw: 0.08, stroke: C.mustard });
        face(ctx, [[12.9, ly, 0], [12.2, ly, 2.4]], null, { lw: 0.14, stroke: C.ink });
        face(ctx, [[12.9, ly, 0], [12.2, ly, 2.4]], null, { lw: 0.08, stroke: C.mustard });
      }
      for (const z of [0.6, 1.2, 1.8]) {
        const dx = (z / 2.4) * 0.7;
        box(ctx, 11.4 + dx - 0.1, 2.2, z, 0.3, 0.9, 0.06, C.mustard, { flat: true, lw: 0.03 });
      }
      box(ctx, 11.95, 2.15, 2.4, 0.5, 1.0, 0.1, C.mustard, { lw: 0.03 });
    });
    R.mover(() => ({ x: 12.2, y: 2.8 }), (ctx, t) => {
      const st = hoseState(t);
      const s = pulse(t, HOSE) * HOSE;
      const g = { skin: '#95603F', hair: C.ink, style: 'short', top: C.teal, bottom: C.brown, hat: 'sun', dir: 'r' };
      let pose = 'point', arms;
      if (st === 'on') arms = [2.3, 0.3];
      if (st === 'off') { arms = [1.4 + Math.sin(t * 14) * 0.3, 0.4]; }
      if (st === 'blast') pose = 'cheer';
      const Z = 2.45;
      person(ctx, 12.2, 2.8, Z, { ...g, pose, arms }, t);
      // hose up to the hand
      const [X, Y] = P(12.2, 2.8, Z);
      const hx = X + (st === 'blast' ? 0.5 : st === 'off' ? 0.9 : 0.8), hy = Y - (st === 'blast' ? 2.45 : st === 'off' ? 1.65 : 2.0);
      const [fx, fy] = P(12.3, 3.4, 0.05);
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.bezierCurveTo(fx + 0.6, fy - 1.5, hx + 0.6, hy + 1.2, hx, hy);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.16; ctx.stroke();
      ctx.strokeStyle = C.green; ctx.lineWidth = 0.08; ctx.stroke();
      ctx.beginPath(); ctx.arc(hx, hy, 0.1, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.03 });
      if (!Q.detail) return;
      if (st === 'on') {
        // arc of water into the basket
        const [bx, by] = P(12.4, 1.0, 4.7);
        particles(t, 14, 0.7, (k) => {
          const px = hx + (bx - hx) * k, py = hy + (by - hy) * k - Math.sin(k * Math.PI) * 0.9;
          ctx.beginPath(); ctx.arc(px, py, 0.07, 0, Math.PI * 2); ctx.fillStyle = C.sky; ctx.fill();
        }, 9);
      } else if (st === 'blast') {
        particles(t, 18, 0.6, (k, r) => {
          const a = -Math.PI / 2 + (r() - 0.5) * 1.6;
          const d = k * 1.3;
          ctx.beginPath(); ctx.arc(hx + Math.cos(a) * d, hy + Math.sin(a) * d + k * k * 1.2, 0.07, 0, Math.PI * 2);
          ctx.fillStyle = C.sky; ctx.fill();
        }, 10);
        speech(ctx, 12.0, 2.6, 5.4, 'PFFT!', { size: 0.5 });
      } else if (s > 8.6) {
        speech(ctx, 12.0, 2.6, 5.2, '?', { size: 0.55 });
      }
    }, { bias: 0.4 });
    R.thing(12.4, 1.0, (ctx, t) => basket(ctx, 12.4, 1.0, 5.4, t, C.coral, hoseState(t) === 'on'), { anim: true });

    // The snoozer in the deck chair, lying on the hose.
    R.mover(() => ({ x: 14.2, y: 5.9 }), (ctx, t) => {
      const st = hoseState(t);
      const sh = st === 'off' ? 0.18 : 0;
      const x = 13.4, y = 5.0;
      box(ctx, x, y, 0.35, 1.9, 0.9, 0.08, C.white, { top: C.coral, dotsT: C.white, densT: 0.4 });
      face(ctx, [[x, y, 0.43], [x, y + 0.9, 0.43], [x - 0.4, y + 0.9, 1.4], [x - 0.4, y, 1.4]], C.coral, { dots: C.white, density: 0.35 });
      for (const [lx, ly] of [[x + 0.1, y + 0.1], [x + 1.7, y + 0.1], [x + 0.1, y + 0.75], [x + 1.7, y + 0.75]]) box(ctx, lx, ly, 0, 0.08, 0.08, 0.35, C.ink, { flat: true, stroke: false });
      person(ctx, x + 1.3 + sh, y + 0.2, 0.55, { skin: '#F4CDAA', hair: C.greyLight, style: 'bald', top: C.white, bottom: C.teal, pose: 'sleep', dir: 'r', hat: 'sun' }, t);
      if (st === 'off' && Q.detail) {
        // the hose bulges behind the kink
        const k = clamp((pulse(t, HOSE) * HOSE - 8) / 2);
        const [X, Y] = P(14.4, 4.4, 0.1);
        ctx.beginPath(); ctx.ellipse(X, Y, 0.12 + k * 0.25, 0.1 + k * 0.18, 0, 0, Math.PI * 2);
        paint(ctx, C.green, { lw: 0.04 });
      }
    });
    // tomatoes on stakes by the snoozer
    for (const y of [8.7, 9.8]) {
      R.thing(15.2, y, (ctx, t) => {
        box(ctx, 15.15, y - 0.05, 0, 0.08, 0.08, 2.6, C.brown, { flat: true, lw: 0.03 });
        const [X, Y] = P(15.2, y, 0);
        const sw = Math.sin(t * 1.2 + y) * 0.04;
        for (let i = 0; i < 6; i++) {
          const yy = Y - 0.4 - i * 0.42, xx = X + (i % 2 ? 0.35 : -0.35) + sw * i;
          ctx.beginPath(); ctx.ellipse(xx, yy, 0.35, 0.2, i % 2 ? 0.4 : -0.4, 0, Math.PI * 2);
          paint(ctx, i % 3 ? C.green : C.leaf, { dots: C.ink, density: 0.12, lw: 0.04 });
        }
        for (const [dx, dy] of [[0.2, -0.9], [-0.25, -1.5], [0.3, -2.0], [-0.1, -2.5]]) {
          ctx.beginPath(); ctx.arc(X + dx + sw * 3, Y + dy, 0.14, 0, Math.PI * 2); paint(ctx, C.red, { lw: 0.04 });
        }
      }, { anim: true });
    }

    // The watering can nobody is using (a find), by the ladder.
    R.thing(10.9, 4.2, (ctx) => wateringCan(ctx, 10.9, 4.2, 0, 0.8));
    R.find({ id: 'can', label: 'A watering can', at: [10.9, 4.2, 0.3], r: 0.7 });

    // ---------- the venus flytrap ----------
    const TRAP = 6;
    const trapOpen = (t) => {
      const s = pulse(t, TRAP) * TRAP;
      if (s < 3.6) return 0.8 + Math.sin(t * 9) * 0.03;
      if (s < 3.72) return 0.8 * (1 - (s - 3.6) / 0.12);
      if (s < 5.0) return 0.02 + Math.abs(Math.sin((s - 3.72) * 9)) * 0.06;
      return 0.8 * ease((s - 5) / 1);
    };
    const TX = 7.2, TY = 8.8;
    R.thing(TX + 0.9, TY + 0.9, (ctx, t) => {
      cylinder(ctx, TX, TY, 0, 0.85, 1.0, TERRA, { top: C.brown });
      // baby traps round the rim
      for (const [dx, dy, a] of [[-0.6, 0.3, -0.5], [0.4, 0.6, 0.4], [0.7, -0.3, 0.8]]) {
        const [X, Y] = P(TX + dx, TY + dy, 1.1);
        leafShape(ctx, X, Y, a, 0.6, 0.18, C.leaf, false);
        ctx.beginPath(); ctx.ellipse(X + Math.sin(a) * 0.65, Y - Math.cos(a) * 0.65, 0.16, 0.1, a, 0, Math.PI * 2);
        paint(ctx, C.pink, { lw: 0.03 });
      }
      const [bx, by] = P(TX, TY, 1.0);
      const [hx, hy] = P(TX + 0.7, TY - 0.5, 2.9);
      const bob = Math.sin(t * 2) * 0.05;
      stem(ctx, bx, by, hx, hy + bob, C.green, 0.22);
      const open = trapOpen(t);
      const lobe = (sgn) => {
        ctx.save();
        ctx.translate(hx - 0.1, hy + bob);
        ctx.rotate(-sgn * open * 0.75);
        ctx.scale(1, sgn);
        // teeth
        ctx.beginPath();
        for (let i = 0; i < 7; i++) {
          const x0 = 0.15 + i * 0.2;
          ctx.moveTo(x0, 0.02); ctx.lineTo(x0 + 0.07, 0.32); ctx.lineTo(x0 + 0.13, 0.02);
        }
        paint(ctx, C.white, { lw: 0.03 });
        ctx.beginPath();
        ctx.ellipse(0.75, -0.3, 0.8, 0.42, 0, 0, Math.PI * 2);
        paint(ctx, C.green, { dots: shade(C.green, 0.5), density: 0.2 });
        ctx.beginPath();
        ctx.ellipse(0.78, -0.05, 0.68, 0.14, 0, 0, Math.PI * 2);
        paint(ctx, C.red, { lw: 0.04 });
        ctx.restore();
      };
      lobe(-1);
      lobe(1);
      // drool, when open
      if (open > 0.6 && Q.detail) {
        const k = pulse(t, 1.4);
        ctx.beginPath(); ctx.ellipse(hx + 0.6, hy + 0.25 + k * 0.5, 0.05, 0.08 + k * 0.05, 0, 0, Math.PI * 2);
        ctx.fillStyle = alpha(C.sky, 1 - k); ctx.fill();
      }
      sign(ctx, TX + 0.2, TY + 1.3, 'PLEASE DO NOT PET', { z: 0.7, w: 2.3, size: 0.22 });
    }, { anim: true });

    // The visitor who leans in, gets snapped at, and leaps back. Every time.
    R.mover((t) => {
      const s = pulse(t, TRAP) * TRAP;
      const A = [10.2, 7.4], B = [9.3, 7.7], Cc = [11.0, 6.8];
      if (s < 3.6) { const k = ease(clamp(s / 3.2)); return { x: A[0] + (B[0] - A[0]) * k, y: A[1] + (B[1] - A[1]) * k, z: 0, pose: 'point' }; }
      if (s < 4.2) { const k = (s - 3.6) / 0.6; return { x: B[0] + (Cc[0] - B[0]) * k, y: B[1] + (Cc[1] - B[1]) * k, z: Math.sin(k * Math.PI) * 0.8, pose: 'cheer', eek: true }; }
      if (s < 5.2) return { x: Cc[0], y: Cc[1], z: 0, pose: 'stand', eek: s < 5 };
      const k = (s - 5.2) / 0.8;
      return { x: Cc[0] + (A[0] - Cc[0]) * k, y: Cc[1] + (A[1] - Cc[1]) * k, z: 0, pose: 'walk' };
    }, (ctx, t, p) => {
      person(ctx, p.x, p.y, p.z, folk(88, { pose: p.pose, dir: 'l', hat: 'cap', top: C.purple, style: 'curly' }), t);
      if (p.eek && Q.detail) speech(ctx, p.x, p.y, p.z + 2.9, 'EEK!', { size: 0.5 });
    });
    // The fly it keeps missing.
    R.mover((t) => {
      const s = pulse(t, TRAP) * TRAP;
      let x = TX + 0.9 + Math.sin(t * 5) * 0.4, y = TY - 1.0 + Math.cos(t * 7) * 0.3, z = 3.6 + Math.sin(t * 11) * 0.25;
      if (s > 3.55 && s < 5.6) {
        const k = Math.sin(clamp((s - 3.55) / 2.05) * Math.PI);
        x += k * 2.2; y -= k * 2.6; z += k * 1.8;
      }
      return { x, y, z };
    }, (ctx, t, p) => {
      if (!Q.detail) return;
      const [X, Y] = P(p.x, p.y, p.z);
      const w = Math.abs(Math.sin(t * 40)) * 0.12 + 0.04;
      ctx.beginPath(); ctx.ellipse(X - 0.06, Y - 0.08, 0.1, w, -0.5, 0, Math.PI * 2); ctx.ellipse(X + 0.06, Y - 0.08, 0.1, w, 0.5, 0, Math.PI * 2);
      ctx.fillStyle = alpha(C.white, 0.9); ctx.fill();
      ctx.beginPath(); ctx.arc(X, Y, 0.08, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
    }, { bias: 3 });

    // ---------- sprinkler: a pipe across the ceiling that mists on a timer ----------
    const MIST = 11;
    const misting = (t) => { const s = pulse(t, MIST) * MIST; return s > 5 && s < 9.5; };
    R.air((ctx, t) => {
      const a = [0, 11, 6.3], b = [11, 0, 6.3];
      const [ax, ay] = P(...a), [bx, by] = P(...b);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.2; ctx.stroke();
      ctx.strokeStyle = C.grey; ctx.lineWidth = 0.12; ctx.stroke();
      for (let i = 1; i < 8; i++) {
        const k = i / 8;
        const [X, Y] = P(11 * k, 11 * (1 - k), 6.3);
        ctx.beginPath(); ctx.moveTo(X - 0.1, Y); ctx.lineTo(X + 0.1, Y); ctx.lineTo(X, Y + 0.25); ctx.closePath();
        paint(ctx, C.greyLight, { lw: 0.03 });
      }
      if (!Q.detail) return;
      const s = pulse(t, MIST) * MIST;
      const strength = clamp((s - 5) / 0.4) * (1 - clamp((s - 9.5) / 1.2));
      if (strength <= 0) return;
      for (let i = 1; i < 8; i++) {
        const k = i / 8;
        const [X, Y] = P(11 * k, 11 * (1 - k), 6.1);
        const flick = 0.85 + Math.sin(t * 9 + i) * 0.15;
        ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X - 1.1 * flick, Y + 3.2); ctx.quadraticCurveTo(X, Y + 3.7, X + 1.1 * flick, Y + 3.2); ctx.closePath();
        ctx.fillStyle = alpha(C.white, 0.28 * strength); ctx.fill();
      }
      particles(t, 60, 1.6, (k, r) => {
        const u = Math.floor(r() * 7 + 1) / 8;
        const sx = 11 * u + (r() - 0.5) * 2.2 * k, sy = 11 * (1 - u) + (r() - 0.5) * 2.2 * k;
        const z = 6.1 - k * (3.4 + r() * 1.5);
        const [X, Y] = P(sx, sy, z);
        ctx.beginPath(); ctx.arc(X, Y, 0.06 + k * 0.05, 0, Math.PI * 2);
        ctx.fillStyle = alpha(r() > 0.5 ? C.water : C.white, strength * (1 - k * 0.8));
        ctx.fill();
      }, 21);
    });

    // The reader under the sprinkler, with an umbrella ready.
    R.thing(7.3, 4.8, (ctx) => {
      box(ctx, 5.9, 4.1, 0.6, 1.4, 0.7, 0.12, C.wood);
      for (const [lx, ly] of [[6.0, 4.2], [7.1, 4.2], [6.0, 4.65], [7.1, 4.65]]) box(ctx, lx, ly, 0, 0.1, 0.1, 0.6, C.brown, { flat: true, stroke: false });
    }, { depth: 10.9 });
    R.mover(() => ({ x: 6.6, y: 4.5 }), (ctx, t) => {
      const wet = misting(t - 0.4);
      person(ctx, 6.6, 4.5, 0.2, folk(64, {
        pose: 'sit', dir: 'r', style: 'bun', top: C.mustard, arms: wet ? [2.7, 0.9] : [1.1, 1.0],
        hold: wet
          ? (c) => {
            c.beginPath(); c.moveTo(0.05, 0.3); c.lineTo(-0.1, -1.6); c.strokeStyle = C.ink; c.lineWidth = 0.06; c.stroke();
            c.beginPath(); c.moveTo(-1.1, -1.3); c.quadraticCurveTo(-0.1, -2.5, 0.9, -1.3);
            for (let i = 0; i < 4; i++) c.quadraticCurveTo(0.65 - i * 0.5, -1.5, 0.4 - i * 0.5, -1.3);
            c.closePath(); paint(c, C.coral, { dots: C.white, density: 0.3, lw: 0.05 });
          }
          : (c) => {
            c.beginPath(); c.rect(-0.05, -0.25, 0.7, 0.55); paint(c, C.white, { lw: 0.04 });
            c.strokeStyle = C.grey; c.lineWidth = 0.03; c.beginPath();
            for (let i = 0; i < 4; i++) { c.moveTo(0.05, -0.15 + i * 0.12); c.lineTo(0.55, -0.15 + i * 0.12); }
            c.stroke();
          },
      }), t);
    }, { depth: 11 });

    // ---------- bees and butterflies ----------
    const bee = (i) => (t) => {
      const cx = [2.4, 2.6, 5.4, 12][i], cy = [8, 12.5, 13.2, 7.8][i];
      return { x: cx + Math.sin(t * (0.9 + i * 0.13) + i) * 1.2 + Math.sin(t * 7 + i) * 0.1, y: cy + Math.sin(t * (1.3 + i * 0.1) + i * 2) * 1.4, z: 2.4 + Math.sin(t * 1.7 + i) * 0.5 + (i === 2 ? 0.5 : 0), vx: Math.cos(t * (0.9 + i * 0.13) + i) };
    };
    for (let i = 0; i < 4; i++) {
      const fn = bee(i);
      R.mover(fn, (ctx, t, p) => {
        if (!Q.detail) return;
        for (let k = 1; k <= 3; k++) {
          const q = fn(t - k * 0.09);
          const [X, Y] = P(q.x, q.y, q.z);
          ctx.beginPath(); ctx.arc(X, Y, 0.03, 0, Math.PI * 2); ctx.fillStyle = alpha(C.ink, 0.5 - k * 0.12); ctx.fill();
        }
        const [X, Y] = P(p.x, p.y, p.z);
        const f = p.vx > 0 ? 1 : -1;
        const w = Math.abs(Math.sin(t * 45 + i)) * 0.1 + 0.03;
        ctx.beginPath(); ctx.ellipse(X - 0.02 * f, Y - 0.14, 0.07, w + 0.04, 0.3 * f, 0, Math.PI * 2);
        ctx.fillStyle = alpha(C.white, 0.9); ctx.fill();
        ctx.beginPath(); ctx.ellipse(X, Y, 0.16, 0.1, 0, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.03 });
        ctx.fillStyle = C.ink;
        ctx.fillRect(X - 0.03, Y - 0.1, 0.04, 0.2);
        ctx.fillRect(X + 0.06 * f - 0.02, Y - 0.1, 0.03, 0.2);
      }, { bias: 3 });
    }
    const fly = (i) => (t) => {
      const [cx, cy, rx, ry, sp] = [[12.7, 7.9, 1.7, 1.7, 0.55], [4.5, 11.8, 1.6, 1.2, 0.45], [11.6, 3.6, 1.2, 1.0, 0.6]][i];
      const a = t * sp + i * 2;
      return { x: cx + Math.sin(a) * rx, y: cy + Math.sin(a * 2) * ry * 0.7, z: 1.9 + Math.sin(t * 2.3 + i) * 0.4, vx: Math.cos(a) * rx - Math.cos(a * 2) * ry * 1.4 };
    };
    const bfCols = [[C.pink, C.coral], [C.mustard, C.coral], [C.lilac, C.purple]];
    for (let i = 0; i < 3; i++) {
      R.mover(fly(i), (ctx, t, p) => {
        if (!Q.detail) return;
        const [X, Y] = P(p.x, p.y, p.z + Math.abs(Math.sin(t * 6 + i)) * 0.15);
        const flap = 0.25 + Math.abs(Math.sin(t * 13 + i)) * 0.75;
        ctx.save();
        ctx.translate(X, Y);
        ctx.scale(p.vx > 0 ? 1 : -1, 1);
        for (const sgn of [-1, 1]) {
          ctx.save();
          ctx.scale(sgn * flap, 1);
          ctx.beginPath();
          ctx.ellipse(0.2, -0.16, 0.2, 0.15, -0.5, 0, Math.PI * 2);
          ctx.ellipse(0.15, 0.08, 0.13, 0.1, 0.5, 0, Math.PI * 2);
          paint(ctx, bfCols[i][0], { dots: bfCols[i][1], density: 0.35, lw: 0.03 });
          ctx.restore();
        }
        ctx.beginPath(); ctx.ellipse(0, 0, 0.04, 0.16, 0, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
        ctx.restore();
      }, { bias: 3 });
    }
    // The kid with a net, always one second behind the butterfly.
    R.mover((t) => {
      const p = fly(0)(t - 1.1), q = fly(0)(t - 1.0);
      const dx = q.x - p.x, dy = q.y - p.y;
      return { x: p.x, y: p.y + 0.4, dir: dx - dy >= 0 ? 'r' : 'l', back: dx + dy < 0 };
    }, (ctx, t, p) => {
      const sw = Math.sin(t * 5);
      person(ctx, p.x, p.y, 0, folk(12, {
        pose: 'run', dir: p.dir, back: p.back, scale: 0.72, speed: 11, top: C.coral, hat: 'sun',
        arms: [2.6 + sw * 0.4, -0.6],
        hold: (c) => {
          c.save();
          c.translate(-0.1, -0.2);
          c.rotate(sw * 0.4 - 0.2);
          c.beginPath(); c.moveTo(0, 0.4); c.lineTo(0.2, -1.6); c.strokeStyle = C.brown; c.lineWidth = 0.08; c.stroke();
          c.beginPath(); c.ellipse(0.25, -1.95, 0.3, 0.38, 0.2, 0, Math.PI * 2);
          c.fillStyle = alpha(C.white, 0.6); c.fill();
          c.strokeStyle = C.ink; c.lineWidth = 0.05; c.stroke();
          c.restore();
        },
      }), t);
    });

    // ---------- the prize pumpkin ----------
    R.thing(6.8, 14.8, (ctx, t) => {
      box(ctx, 4.0, 12.0, 0, 2.8, 2.8, 0.25, C.woodLight, { lw: 0.04 });
      const [X, Y] = P(5.4, 13.4, 1.1);
      const lobes = [[-1.35, 0.75], [1.35, 0.75], [-0.85, 0.95], [0.85, 0.95], [0, 1.05]];
      lobes.forEach(([dx, rx], i) => {
        ctx.beginPath(); ctx.ellipse(X + dx, Y, rx, 1.05, 0, 0, Math.PI * 2);
        paint(ctx, i < 2 ? shade(ORANGE, 0.15) : i < 4 ? shade(ORANGE, 0.05) : ORANGE, { dots: shade(ORANGE, 0.45), density: i < 2 ? 0.3 : 0.14, lw: 0.06 });
      });
      ctx.beginPath(); ctx.moveTo(X - 0.1, Y - 0.95); ctx.quadraticCurveTo(X - 0.2, Y - 1.5, X + 0.25, Y - 1.6);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.26; ctx.stroke(); ctx.strokeStyle = C.green; ctx.lineWidth = 0.17; ctx.stroke();
      leafShape(ctx, X + 0.2, Y - 1.0, 1.1, 0.9, 0.35, C.leaf, false);
      // rosette
      const rx = X - 0.5, ry = Y + 0.1;
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(rx + s * 0.08, ry); ctx.lineTo(rx + s * 0.3, ry + 0.85); ctx.lineTo(rx + s * 0.12, ry + 0.72); ctx.lineTo(rx, ry + 0.85); ctx.closePath();
        paint(ctx, C.navy, { lw: 0.04 });
      }
      ctx.beginPath();
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ctx.moveTo(rx, ry); ctx.arc(rx, ry, 0.42, a, a + 0.35); }
      paint(ctx, C.sky, { lw: 0.04 });
      ctx.beginPath(); ctx.arc(rx, ry, 0.28, 0, Math.PI * 2); paint(ctx, C.navy, { lw: 0.04 });
      txt(ctx, rx, ry + 0.02, '1ST', 0.2, C.white);
      sign(ctx, 3.9, 14.9, '812 LB', { z: 0.8, w: 1.2, size: 0.3, fill: C.ink, color: C.butter });
    }, { depth: 20.3 });
    // proud grower, posing
    R.mover(() => ({ x: 3.5, y: 12.4 }), (ctx, t) => {
      const snap = pulse(t, 3.2) > 0.85;
      person(ctx, 3.5, 12.4, 0, folk(23, { pose: snap ? 'cheer' : 'wave', dir: 'r', top: C.red, style: 'long', hair: HAIRC, hat: 'none', speed: 5 }), t);
    });
    // kid trying to hug it
    R.mover(() => ({ x: 7.1, y: 13.5 }), (ctx, t) => {
      person(ctx, 7.1, 13.5, 0.25, folk(29, { pose: 'carry', dir: 'l', scale: 0.7, top: C.tealLight, lean: 0 }), t);
    });
    // photographer, flash every few seconds
    R.mover(() => ({ x: 8.7, y: 15.2 }), (ctx, t) => {
      person(ctx, 8.7, 15.2, 0, folk(35, {
        pose: 'stand', dir: 'l', arms: [1.6, 1.5], top: C.navy, hat: 'beanie',
        hold: (c) => { c.beginPath(); c.roundRect(-0.05, -0.35, 0.5, 0.35, 0.05); paint(c, C.ink, { lw: 0.03 }); c.beginPath(); c.arc(0.25, -0.17, 0.1, 0, Math.PI * 2); paint(c, C.grey, { lw: 0.03 }); },
      }), t);
      const f = pulse(t, 3.2);
      if (f > 0.85 && f < 0.93 && Q.detail) {
        const [X, Y] = P(8.7, 15.2, 1.9);
        ctx.beginPath();
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.moveTo(X - 0.6 + Math.cos(a) * 0.2, Y + Math.sin(a) * 0.2); ctx.lineTo(X - 0.6 + Math.cos(a) * 0.8, Y + Math.sin(a) * 0.8); }
        ctx.strokeStyle = C.mustard; ctx.lineWidth = 0.08; ctx.stroke();
      }
    });

    // ---------- the snail derby ----------
    const RACE = 36;
    const PL = { x0: 10.4, x1: 15.4, y0: 12.6, y1: 13.6, z: 0.85 };
    R.thing(15.4, 13.6, (ctx) => {
      box(ctx, 10.7, 12.7, 0, 0.8, 0.8, PL.z - 0.1, C.brown, { lw: 0.04 });
      box(ctx, 14.3, 12.7, 0, 0.8, 0.8, PL.z - 0.1, C.brown, { lw: 0.04 });
      box(ctx, PL.x0, PL.y0, PL.z - 0.1, PL.x1 - PL.x0, PL.y1 - PL.y0, 0.1, C.woodLight, { lw: 0.04 });
      for (const ly of [12.93, 13.27]) face(ctx, [[PL.x0 + 0.1, ly, PL.z + 0.001], [PL.x1 - 0.1, ly, PL.z + 0.001]], null, { lw: 0.03, stroke: C.white });
      face(ctx, [[PL.x0 + 0.5, PL.y0, PL.z + 0.001], [PL.x0 + 0.5, PL.y1, PL.z + 0.001]], null, { lw: 0.05, stroke: C.white });
      for (let j = 0; j < 4; j++) for (let i = 0; i < 2; i++) {
        if ((i + j) % 2) rect(ctx, 14.7 + i * 0.25, PL.y0 + j * 0.25, 0.25, 0.25, PL.z + 0.002, C.ink, { stroke: false });
        else rect(ctx, 14.7 + i * 0.25, PL.y0 + j * 0.25, 0.25, 0.25, PL.z + 0.002, C.white, { stroke: false });
      }
      sign(ctx, 12.8, 14.0, 'THE SNAIL 500', { z: 0.2, w: 2.0, size: 0.28, fill: C.mustard });
    }, { depth: 25 });
    const racers = [[C.coral, C.white, 1.0], [C.teal, C.butter, 0.93], [C.purple, C.pink, 0.97]];
    const snailX = (i, t) => {
      const s = pulse(t, RACE) * RACE;
      const spd = racers[i][2];
      const q = clamp((s - 2) / 26 * spd + Math.sin(s * 0.8 + i * 2) * 0.012);
      return PL.x0 + 0.6 + q * (PL.x1 - PL.x0 - 1.0);
    };
    R.mover(() => ({ x: 13, y: 13.1 }), (ctx, t) => {
      const s = pulse(t, RACE) * RACE;
      const a = s > 33 ? 1 - (s - 33) / 1.5 : s < 0.8 ? s / 0.8 : 1;
      ctx.save();
      ctx.globalAlpha = clamp(a);
      racers.forEach(([shell, stripe], i) => {
        const [X, Y] = P(snailX(i, t), 12.77 + i * 0.33, PL.z);
        snail(ctx, X, Y, 0.75, shell, null, Math.abs(Math.sin(t * 2 + i)), stripe);
      });
      ctx.restore();
    }, { depth: 25.1 });
    // crowd
    const cheering = (t) => { const s = pulse(t, RACE) * RACE; return s > 22 && s < 33; };
    [[11.3, 11.8, 41, C.pink], [12.5, 11.7, 42, C.mustard], [13.7, 11.8, 43, C.sky]].forEach(([x, y, seed, top], i) => {
      R.mover(() => ({ x, y }), (ctx, t) => {
        const c = cheering(t);
        person(ctx, x, y, 0, folk(seed, { pose: c ? (i === 1 ? 'jump' : 'cheer') : i === 2 ? 'point' : 'stand', dir: i ? 'l' : 'r', scale: 0.7, top, speed: 9 }), t);
      }, { depth: 24.5 + i * 0.01 });
    });
    // toddler at the start line with a lettuce leaf, for motivation
    R.mover(() => ({ x: 9.7, y: 13.6 }), (ctx, t) => {
      person(ctx, 9.7, 13.6, 0, folk(47, {
        pose: 'sit', dir: 'r', scale: 0.62, top: C.butter, arms: [1.6 + Math.sin(t * 3) * 0.2, 0.5],
        hold: (c) => { c.beginPath(); c.ellipse(0.45, -0.1, 0.28, 0.2, 0.3, 0, Math.PI * 2); paint(c, C.leaf, { lw: 0.04 }); },
      }), t);
    }, { depth: 23.3 });
    // referee with the flag and a lot to say
    R.mover(() => ({ x: 15.5, y: 11.3 }), (ctx, t) => {
      const s = pulse(t, RACE) * RACE;
      const wave = (s > 26 && s < 31) || s < 2.5;
      person(ctx, 15.5, 11.3, 0, {
        skin: '#C3835B', hair: C.greyLight, style: 'short', top: C.white, bottom: C.ink, dir: 'l', pose: wave ? 'wave' : 'stand', hat: 'cap', speed: 14,
        arms: wave ? undefined : [0.9, -0.1],
        hold: (c) => {
          c.beginPath(); c.moveTo(0, 0.1); c.lineTo(0.1, -1.1); c.strokeStyle = C.ink; c.lineWidth = 0.05; c.stroke();
          for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) { c.fillStyle = (i + j) % 2 ? C.ink : C.white; c.fillRect(0.1 + i * 0.16, -1.1 + j * 0.16, 0.16, 0.16); }
        },
      }, t);
      if (!Q.detail) return;
      if (s < 2.5) speech(ctx, 15.3, 11.1, 3.0, "AND THEY'RE OFF!", { size: 0.42, dx: -0.6 });
      else if (s > 12 && s < 15) speech(ctx, 15.3, 11.1, 3.0, 'STILL OFF!', { size: 0.42, dx: -0.6 });
      else if (s > 27 && s < 31) speech(ctx, 15.3, 11.1, 3.0, 'PHOTO FINISH!', { size: 0.42, dx: -0.6 });
    }, { depth: 26.8 });

    // Contestant No. 4 quit the race and is climbing the glass instead (a find).
    const esc = (t) => {
      const k = pulse(t, 70);
      return [13.3, 0.05, 0.5 + k * 4.2, k];
    };
    R.decor((ctx, t) => {
      const [x, y, z, k] = esc(t);
      const [X0, Y0] = P(x, y, 0.3), [X, Y] = P(x, y, z);
      ctx.save();
      ctx.globalAlpha = clamp(k / 0.03) * clamp((1 - k) / 0.04);
      ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X, Y + 0.2);
      ctx.strokeStyle = alpha(C.white, 0.9); ctx.lineWidth = 0.16; ctx.lineCap = 'round'; ctx.stroke();
      ctx.translate(X, Y);
      ctx.rotate(-Math.PI / 2 + 0.46);
      snail(ctx, 0, 0.1, 0.7, C.mustard, '4', Math.abs(Math.sin(t * 1.5)));
      ctx.restore();
    }, { anim: true });
    R.find({ id: 'snail', label: 'A snail wearing a number', r: 0.8, at: (t) => { const [x, y, z] = esc(t); return [x, y, z]; } });

    // ---------- a wheelbarrow of compost, and sacks in the corner ----------
    R.thing(5.0, 7.8, (ctx) => {
      const [wx, wy] = P(4.7, 7.25, 0.34);
      face(ctx, [[3.4, 6.9, 0.8], [2.4, 6.9, 0.75]], null, { lw: 0.1, stroke: C.ink });
      face(ctx, [[3.4, 7.6, 0.8], [2.4, 7.6, 0.75]], null, { lw: 0.1, stroke: C.ink });
      box(ctx, 3.3, 6.95, 0, 0.08, 0.08, 0.5, C.ink, { flat: true, stroke: false });
      box(ctx, 3.3, 7.5, 0, 0.08, 0.08, 0.5, C.ink, { flat: true, stroke: false });
      face(ctx, [[3.2, 6.8, 0.9], [4.8, 6.8, 0.9], [4.5, 6.95, 0.35], [3.4, 6.95, 0.35]], shade(C.teal, 0.1));
      face(ctx, [[3.2, 7.7, 0.9], [4.8, 7.7, 0.9], [4.5, 7.55, 0.35], [3.4, 7.55, 0.35]], shade(C.teal, 0.2), { dots: shade(C.teal, 0.5), density: 0.2 });
      face(ctx, [[4.8, 6.8, 0.9], [4.8, 7.7, 0.9], [4.5, 7.55, 0.35], [4.5, 6.95, 0.35]], C.teal);
      face(ctx, [[3.25, 6.85, 0.95], [4.75, 6.85, 0.95], [4.75, 7.65, 0.95], [3.25, 7.65, 0.95]], C.brown, { dots: C.ink, density: 0.3 });
      ctx.beginPath(); ctx.arc(wx, wy, 0.34, 0, Math.PI * 2); paint(ctx, C.ink);
      ctx.beginPath(); ctx.arc(wx, wy, 0.12, 0, Math.PI * 2); paint(ctx, C.grey);
      face(ctx, [[4.0, 7.3, 0.95], [3.7, 7.1, 2.3]], null, { lw: 0.1, stroke: C.brown });
      face(ctx, [[4.08, 7.3, 0.95], [4.28, 7.45, 0.6], [4.0, 7.55, 0.5], [3.85, 7.3, 0.95]], C.grey, { lw: 0.04 });
    });
    R.thing(3.6, 15.8, (ctx) => {
      for (const [sx, sy, sz, c] of [[3.0, 15.0, 0, C.paperDeep], [3.8, 15.2, 0, C.butter], [3.3, 15.1, 0.7, C.paperDeep]]) {
        const [X, Y] = P(sx, sy, sz);
        ctx.beginPath(); ctx.roundRect(X - 0.55, Y - 0.85, 1.1, 0.9, 0.2); paint(ctx, c, { dots: shade(c, 0.3), density: 0.2, lw: 0.05 });
        txt(ctx, X, Y - 0.4, sz ? 'SEEDS' : 'SOIL', 0.26, C.brown);
      }
    });

    // ---------- the plant that goes for walks ----------
    const carrier = route([[2.8, 10.8, 1.5], [9.8, 10.8], [9.8, 5.0, 1], [9.8, 10.8], [15.4, 10.8, 1]], { speed: 0.9, loop: false });
    R.mover(carrier, (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, folk(57, {
        pose: p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back, arms: [1.3, 1.3], top: C.pink, speed: 6,
        hold: (c) => plant(c, 0.05, 0, 0, t, { kind: 'palm', scale: 0.95, potColor: C.white, leaf: C.green }),
      }), t);
    });
  },
};

const HAIRC = '#DDA43F';

function table(ctx, x, y, w, d, h, color) {
  const lw = 0.14;
  for (const [lx, ly] of [[x + w - lw - 0.1, y + d - lw - 0.1], [x + 0.1, y + d - lw - 0.1], [x + w - lw - 0.1, y + 0.1]]) {
    box(ctx, lx, ly, 0, lw, lw, h - 0.15, shade(color, 0.2), { flat: true });
  }
  box(ctx, x, y, h - 0.15, w, d, 0.15, color);
}
