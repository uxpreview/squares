// Umbrella Shop: it rains indoors here, which is great for business.
// Two little clouds drift under the ceiling, the shopkeeper mops forever,
// and a line of ducklings has picked up one extra, much larger duckling.
import {
  C, box, rect, disc, cylinder, face, poly, paint, person, folk, walls, slab, checker, tiles,
  speech, shade, tint, alpha, Q, label, P, paintText, onLeft, onRight, windowR, frame, clockL, shelfR,
  hash, rng, pick,
} from '../../../engine/art.js';
import { route, particles, pulse, clamp, ease } from '../../../engine/actors.js';
import { ZK } from '../../../engine/iso.js';

const lerp = (a, b, k) => a + (b - a) * k;
const memo = (fn) => { let lt = NaN, lp = null; return (t) => (t === lt ? lp : (lt = t, lp = fn(t))); };
const UCOLS = [
  [C.coral, C.white], [C.teal, C.butter], [C.navy, C.sky], [C.mustard, C.white], [C.pink, C.white],
  [C.purple, C.lilac], [C.red, C.butter], [C.green, C.mint], [C.sky, C.white],
];
const RAIN = 'rgba(44,58,107,0.5)';
const WET = 'rgba(77,167,182,0.55)';

// Puddles: [cx, cy, rx, ry]
const PUD = [
  [9.6, 12.8, 2.0, 1.6], // the pond, with frog
  [4.4, 9.4, 1.2, 0.9],
  [12.5, 7.9, 1.1, 1.0],
  [6.9, 3.9, 1.6, 0.8], // the one being mopped
  [2.3, 13.2, 0.9, 0.8],
];
const inPond = (x, y) => {
  const [cx, cy, rx, ry] = PUD[0];
  return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 0.8;
};

function puddle(ctx, cx, cy, rx, ry, z = 0.012) {
  poly(ctx, Array.from({ length: 20 }, (_, i) => {
    const a = (i / 20) * Math.PI * 2;
    const w = 1 + Math.sin(a * 3 + cx) * 0.08 + Math.cos(a * 5 + cy) * 0.05;
    return [cx + Math.cos(a) * rx * w, cy + Math.sin(a) * ry * w, z];
  }));
}

// An umbrella whose canopy apex is at height z. open: 0 (furled) .. 1 (open).
// inv: 0..1 how inside-out it is. len: shaft length below the apex.
function umbrella(ctx, x, y, z, o = {}) {
  const r = o.r || 0.9;
  const open = o.open ?? 1;
  const inv = o.inv || 0;
  const [ca, cb] = o.cols || UCOLS[0];
  const rad = lerp(0.1, r, open) * (1 - inv * 0.2);
  const drop = lerp(1.15, 0.45, open);
  const rimZ = z - drop + inv * (drop + 0.55);
  const len = o.len ?? 1.4;
  const n = 8;
  const rot = o.rot || 0;
  const [ax, ay] = P(x, y, z);
  const [bx, by] = P(x, y, z - len);
  // shaft + handle
  if (o.shaft !== false) {
    ctx.beginPath();
    ctx.moveTo(ax, ay - 0.18); ctx.lineTo(bx, by);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.06; ctx.lineCap = 'round'; ctx.stroke();
    ctx.beginPath();
    ctx.arc(bx + 0.13 * (o.hook || 1), by, 0.13, Math.PI, 0, true);
    ctx.strokeStyle = o.handle || C.brown; ctx.lineWidth = 0.08; ctx.stroke();
  }
  const rim = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rot;
    const w = inv > 0.3 ? (i % 2 ? 1.12 : 0.92) : 1;
    rim.push([x + Math.cos(a) * rad * w, y + Math.sin(a) * rad * w, rimZ + (inv > 0.3 && i % 3 === 0 ? 0.15 : 0)]);
  }
  const order = [];
  for (let i = 0; i < n; i++) {
    const am = ((i + 0.5) / n) * Math.PI * 2 + rot;
    order.push([Math.cos(am) + Math.sin(am), i]);
  }
  order.sort((p, q) => (inv > 0.5 ? q[0] - p[0] : p[0] - q[0]));
  for (const [, i] of order) {
    const p0 = P(...rim[i]), p1 = P(...rim[(i + 1) % n]);
    const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(p0[0], p0[1]);
    ctx.quadraticCurveTo(mx + (ax - mx) * 0.14 * open, my + (ay - my) * 0.14 * open, p1[0], p1[1]);
    ctx.closePath();
    paint(ctx, i % 2 ? ca : cb, { lw: 0.035 });
  }
  if (inv > 0.3 && Q.detail) {
    // bent ribs sticking out
    ctx.beginPath();
    for (let i = 0; i < n; i += 2) {
      const [px, py] = P(...rim[i]);
      ctx.moveTo(px, py); ctx.lineTo(px + (px - ax) * 0.25, py - 0.12 - (i % 4) * 0.05);
    }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
  }
  // ferrule
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, ay - 0.2);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
}

// A duck (or duckling). s = scale.
function duck(ctx, x, y, z, t, o = {}) {
  const [X, Y] = P(x, y, z);
  const s = o.scale || 0.5;
  const f = o.dir === 'l' ? -1 : 1;
  const swim = !!o.swim;
  const ph = t * 11 + (o.phase || 0);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(f * s, s);
  if (swim) {
    ctx.beginPath();
    ctx.ellipse(0, 0.02, 0.6, 0.2, 0, 0, Math.PI * 2);
    ctx.strokeStyle = alpha(C.white, 0.8); ctx.lineWidth = 0.08; ctx.stroke();
  } else {
    if (Q.detail) {
      ctx.beginPath(); ctx.ellipse(0, 0, 0.4, 0.15, 0, 0, Math.PI * 2);
      ctx.fillStyle = alpha(C.ink, 0.18); ctx.fill();
    }
    const sw = Math.sin(ph) * 0.1;
    ctx.strokeStyle = C.coral; ctx.lineWidth = 0.09; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-0.05, -0.25); ctx.lineTo(-0.05 + sw, 0); ctx.moveTo(0.1, -0.25); ctx.lineTo(0.1 - sw, 0); ctx.stroke();
    ctx.translate(0, -Math.abs(Math.sin(ph)) * 0.06 - 0.22);
  }
  const body = o.col || C.butter;
  ctx.beginPath();
  ctx.ellipse(0, -0.2, 0.42, 0.26, -0.08, 0, Math.PI * 2);
  ctx.moveTo(-0.34, -0.26); ctx.lineTo(-0.56, -0.44); ctx.lineTo(-0.38, -0.12);
  paint(ctx, body, { dots: Q.detail ? shade(body, 0.35) : null, density: 0.12, lw: 0.07 });
  ctx.beginPath(); ctx.ellipse(-0.06, -0.22, 0.22, 0.12, -0.2, 0, Math.PI * 2);
  paint(ctx, o.wing || shade(body, 0.12), { lw: 0.05 });
  ctx.beginPath(); ctx.arc(0.28, -0.6, 0.2, 0, Math.PI * 2);
  paint(ctx, o.head || body, { lw: 0.07 });
  ctx.beginPath(); ctx.moveTo(0.42, -0.62); ctx.lineTo(0.64, -0.56); ctx.lineTo(0.42, -0.5);
  paint(ctx, C.coral, { lw: 0.04 });
  ctx.fillStyle = C.ink;
  ctx.beginPath(); ctx.arc(0.33, -0.65, 0.04, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function cloud(ctx, x, y, z, t, s = 1) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(s, s);
  const puffs = [[-1.3, 0.1, 0.7], [-0.5, -0.35, 0.9], [0.5, -0.4, 0.85], [1.3, 0.05, 0.65], [0, 0.2, 0.8]];
  ctx.beginPath();
  for (const [px, py, r] of puffs) {
    const rr = r * (1 + Math.sin(t * 1.3 + px) * 0.04);
    ctx.moveTo(px + rr, py);
    ctx.arc(px, py, rr, 0, Math.PI * 2);
  }
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.12; ctx.stroke(); }
  paint(ctx, C.grey, { dots: C.navy, density: 0.18, stroke: false });
  ctx.beginPath();
  ctx.ellipse(-0.4, -0.5, 0.45, 0.25, 0, 0, Math.PI * 2);
  ctx.fillStyle = alpha(C.white, 0.35);
  ctx.fill();
  ctx.restore();
}

export default {
  id: 'umbrellas',
  name: 'Umbrella Shop',
  blurb: 'It has rained indoors since the grand opening, and sales have never been better. The shopkeeper is still mopping.',

  build(R) {
    // ---------- Floor, walls ----------
    R.floor((ctx) => {
      slab(ctx, C.teal);
      checker(ctx, C.white, tint(C.sky, 0.45), 2);
      tiles(ctx, 2, alpha(C.navy, 0.2), 0.03);
      // entrance mat
      rect(ctx, 0.4, 12.6, 1.6, 2.6, 0.01, C.coral, { dots: shade(C.coral, 0.4), density: 0.25 });
      paintText(ctx, 'floor', 1.2, 13.9, 'DRIP', 0.4, C.white);
    });
    R.wall((ctx) => walls(ctx, { h: 7, left: C.mint, right: C.lilac, dotsL: shade(C.mint, 0.25), dotsR: shade(C.lilac, 0.25), densL: 0.14, densR: 0.14, cap: C.white }));

    R.decor((ctx) => {
      // a sunny window: it is lovely out
      windowR(ctx, 1.2, 1.9, 3.8, 2.9, C.sky, C.white);
      const sun = [];
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; sun.push([2.3 + Math.cos(a) * 0.45, 0.01, 4.0 + Math.sin(a) * 0.45]); }
      face(ctx, sun, C.mustard, { lw: 0.03 });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        face(ctx, [[2.3 + Math.cos(a) * 0.6, 0.01, 4.0 + Math.sin(a) * 0.6], [2.3 + Math.cos(a) * 0.85, 0.01, 4.0 + Math.sin(a) * 0.85]], null, { lw: 0.06, stroke: C.mustard });
      }
      face(ctx, [[3.2, 0.01, 2.0], [5.0, 0.01, 2.0], [5.0, 0.01, 2.6], [4.2, 0.01, 2.9], [3.2, 0.01, 2.4]], C.leaf, { lw: 0.03 });
      // shop name
      paintText(ctx, 'right', 9.3, 6.25, 'BRELLA & DAUGHTERS', 0.62, C.navy);
      paintText(ctx, 'right', 9.3, 5.7, 'umbrellas since 1903', 0.3, C.purple, 'Rethink Sans');
      paintText(ctx, 'right', 8.5, 3.85, 'BOOTS', 0.4, C.navy);
      // forecast board
      onRight(ctx, 11.4, 3.0, 3.8, 2.2, C.navy, { lw: 0.05 });
      paintText(ctx, 'right', 13.3, 4.75, 'TODAY', 0.34, C.butter);
      paintText(ctx, 'right', 13.3, 4.2, 'OUTSIDE: SUNNY', 0.26, C.white, 'Rethink Sans');
      paintText(ctx, 'right', 13.3, 3.75, 'INSIDE: 100% RAIN', 0.26, C.white, 'Rethink Sans');
      paintText(ctx, 'right', 13.3, 3.3, 'as usual', 0.22, C.tealLight, 'Rethink Sans');
      // left wall: name, rack of hanging umbrellas, signs, door
      paintText(ctx, 'left', 5.2, 6.2, 'UMBRELLAS', 0.8, C.teal);
      for (const rz of [4.9, 3.3]) {
        face(ctx, [[0.02, 1.0, rz], [0.02, 9.2, rz]], null, { lw: 0.1, stroke: C.brown });
        for (let i = 0; i < 12; i++) {
          const yy = 1.35 + i * 0.66;
          const [ca, cb] = UCOLS[(i * 5 + (rz > 4 ? 3 : 0)) % UCOLS.length];
          // hook
          const [hx, hy] = P(0.05, yy, rz);
          ctx.beginPath(); ctx.arc(hx + 0.08, hy + 0.02, 0.09, Math.PI, 0.2);
          ctx.strokeStyle = C.brown; ctx.lineWidth = 0.05; ctx.stroke();
          face(ctx, [[0.05, yy - 0.16, rz - 0.15], [0.05, yy + 0.16, rz - 0.15], [0.05, yy + 0.02, rz - 1.35]], ca, { lw: 0.03 });
          face(ctx, [[0.05, yy - 0.03, rz - 0.15], [0.05, yy + 0.07, rz - 0.15], [0.05, yy + 0.02, rz - 1.35]], cb, { lw: 0.02 });
        }
      }
      onLeft(ctx, 9.9, 3.2, 2.4, 1.2, C.butter, { lw: 0.05 });
      paintText(ctx, 'left', 11.1, 4.0, 'NO REFUNDS', 0.32, C.coral);
      paintText(ctx, 'left', 11.1, 3.58, 'IF DRY', 0.32, C.coral);
      clockL(ctx, 11.1, 5.4, 0.5);
      onLeft(ctx, 12.9, 0, 2.0, 3.3, C.navy, { lw: 0.05 });
      onLeft(ctx, 13.05, 0.1, 1.7, 3.05, C.teal, { dots: shade(C.teal, 0.4), density: 0.15 });
      onLeft(ctx, 13.3, 1.5, 1.2, 1.3, C.sky, { dots: tint(C.sky, 0.5), density: 0.2 });
      paintText(ctx, 'left', 13.9, 3.75, 'please drip responsibly', 0.22, C.navy, 'Rethink Sans');
    });

    // wires across the ceiling
    R.decor((ctx) => {
      face(ctx, [[0, 5.5, 6.6], [5.5, 0, 6.6]], null, { lw: 0.05 });
      face(ctx, [[0, 12, 6.6], [12, 0, 6.6]], null, { lw: 0.05 });
    });

    // ---------- Puddles and ripples ----------
    R.rug((ctx) => {
      PUD.forEach(([cx, cy, rx, ry], i) => {
        puddle(ctx, cx, cy, rx, ry);
        paint(ctx, i === 0 ? alpha(C.water, 0.85) : WET, { dots: i === 0 ? C.teal : null, density: 0.2, stroke: i === 0 ? C.teal : false, lw: 0.05 });
      });
      // lily pads
      for (const [lx, ly, lr] of [[8.9, 12.3, 0.45], [10.4, 13.4, 0.5], [10.6, 12.0, 0.3]]) {
        const pts = [];
        for (let i = 0; i <= 14; i++) { const a = 0.4 + (i / 14) * (Math.PI * 2 - 0.5); pts.push([lx + Math.cos(a) * lr, ly + Math.sin(a) * lr, 0.03]); }
        pts.push([lx, ly, 0.03]);
        face(ctx, pts, C.leaf, { dots: C.green, density: 0.2, lw: 0.035 });
      }
    });
    R.rug((ctx, t) => {
      if (!Q.detail) return;
      ctx.lineWidth = 0.04;
      PUD.forEach(([cx, cy, rx, ry], j) => {
        particles(t, j === 0 ? 5 : 2, 1.3, (k, r) => {
          const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.75;
          const x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d;
          const [X, Y] = P(x, y, 0.02);
          const rr = 0.05 + k * 0.45;
          ctx.beginPath();
          ctx.ellipse(X, Y, rr * 1.4, rr * 0.7, 0, 0, Math.PI * 2);
          ctx.strokeStyle = alpha(C.white, 0.9 * (1 - k));
          ctx.stroke();
        }, 10 + j);
      });
    }, { anim: true });

    // ---------- Boot shelves (right wall) ----------
    R.thing(10.6, 1.1, (ctx) => {
      shelfR(ctx, 6.4, 4.2, 3.0, 3, 5, C.wood, (g, x, z, w, r) => {
        for (let xx = x + 0.25; xx < x + w - 0.4; xx += 0.62) {
          const col = pick(r, [C.coral, C.teal, C.navy, C.pink, C.green, C.red, C.purple, C.sky]);
          for (const dx of [0, 0.22]) {
            box(g, xx + dx, 0.45, z, 0.18, 0.2, 0.55, col, { flat: true, lw: 0.025 });
            box(g, xx + dx, 0.45, z, 0.18, 0.38, 0.14, col, { flat: true, lw: 0.025 });
          }
        }
      });
    });

    // ---------- Counter and cashier with an umbrella over the till ----------
    R.mover(() => ({ x: 13.1, y: 0.9 }), (ctx, t) => {
      person(ctx, 13.1, 0.9, 0, folk(201, { pose: 'carry', dir: 'l', top: C.teal, style: 'bun', hair: C.grey }), t);
    });
    R.thing(14.8, 2.6, (ctx, t) => {
      box(ctx, 11.2, 1.6, 0, 3.6, 1.0, 1.25, C.wood, { top: C.woodLight });
      face(ctx, [[11.2, 2.6, 0.3], [14.8, 2.6, 0.3]], null, { lw: 0.04, stroke: shade(C.wood, 0.4) });
      // till
      const ding = pulse(t, 6) > 0.8;
      box(ctx, 12.2, 1.8, 1.25, 0.8, 0.6, 0.45, C.greyLight, { top: C.white });
      if (ding) box(ctx, 12.25, 2.4, 1.28, 0.7, 0.35, 0.12, C.grey);
      box(ctx, 12.3, 1.85, 1.7, 0.6, 0.12, 0.3, C.navy, { flat: true });
      if (ding && Q.detail) label(ctx, 12.6, 2.3, 2.6, 'ding!', 0.3, C.coral);
      // bell and tissues
      cylinder(ctx, 14.0, 2.1, 1.25, 0.15, 0.12, C.mustard);
      box(ctx, 13.3, 1.9, 1.25, 0.45, 0.3, 0.2, C.pink, { top: C.white });
      // umbrella held over the till
      umbrella(ctx, 13.0, 1.3, 3.5, { open: 1, r: 0.95, cols: [C.navy, C.butter], len: 1.3, rot: Math.sin(t * 0.8) * 0.1 });
    }, { anim: true });

    // bin with a broken umbrella (a find)
    R.thing(10.4, 2.4, (ctx) => {
      cylinder(ctx, 10.3, 2.2, 0, 0.42, 0.9, C.grey, { top: C.night });
      umbrella(ctx, 10.3, 2.2, 1.75, { open: 0.9, inv: 1, r: 0.75, cols: [C.red, C.white], len: 1.0, rot: 0.3 });
      box(ctx, 10.55, 2.64, 0.35, 0.5, 0.02, 0.3, C.butter, { flat: true, lw: 0.02 });
    });
    R.find({ id: 'broken', label: 'A broken umbrella', at: [10.3, 2.2, 1.7], r: 0.8 });

    // ---------- Umbrella stands ----------
    const stand = (x, y, seed) => R.thing(x + 0.4, y + 0.4, (ctx) => {
      const r = rng(seed);
      cylinder(ctx, x, y, 0, 0.5, 0.9, C.navy, { top: C.night });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const ux = x + Math.cos(a) * 0.22, uy = y + Math.sin(a) * 0.22;
        const cols = pick(r, UCOLS);
        const [tx, ty] = P(ux, uy, 0.5);
        const [hx, hy] = P(ux + Math.cos(a) * 0.3, uy + Math.sin(a) * 0.3, 1.9 + r() * 0.3);
        ctx.beginPath();
        ctx.moveTo(tx - 0.08, ty); ctx.lineTo(hx - 0.04, hy + 0.4); ctx.lineTo(hx + 0.04, hy + 0.4); ctx.lineTo(tx + 0.08, ty);
        paint(ctx, cols[0], { lw: 0.03 });
        ctx.beginPath(); ctx.moveTo(hx, hy + 0.4); ctx.lineTo(hx, hy);
        ctx.arc(hx + 0.12, hy, 0.12, Math.PI, 0.1);
        ctx.strokeStyle = C.brown; ctx.lineWidth = 0.06; ctx.stroke();
      }
      cylinder(ctx, x, y, 0, 0.5, 0.55, C.navy, { top: 'rgba(0,0,0,0)', flat: true });
    });
    stand(1.0, 11.8, 3);
    stand(14.9, 14.6, 4);
    stand(8.6, 1.5, 5);

    // ---------- Display: umbrellas that open and close by themselves ----------
    const DX = 7.4, DY = 7.6;
    R.thing(DX + 1.3, DY + 1.3, (ctx, t) => {
      cylinder(ctx, DX, DY, 0, 1.4, 0.4, C.white, { top: C.coral });
      label(ctx, DX + 1.0, DY + 1.0, 0.2, 'AUTO-OPEN!', 0.26, C.navy);
      const spots = [[DX - 0.55, DY - 0.45, 0, UCOLS[1]], [DX + 0.6, DY - 0.2, 1.3, UCOLS[4]], [DX - 0.05, DY + 0.6, 2.6, UCOLS[5]]];
      spots.forEach(([x, y, off, cols], i) => {
        const q = pulse(t + off, 4.2);
        let open = q < 0.15 ? ease(q / 0.15) : q < 0.6 ? 1 : q < 0.8 ? 1 - ease((q - 0.6) / 0.2) : 0;
        let inv = 0;
        if (i === 2) {
          // this one opens a little too enthusiastically
          const n = Math.floor((t + off) / 4.2);
          if (n % 2 === 1 && q > 0.12 && q < 0.6) inv = clamp((q - 0.12) / 0.06);
        }
        box(ctx, x - 0.06, y - 0.06, 0.4, 0.12, 0.12, 0.6, C.ink, { flat: true, stroke: false });
        umbrella(ctx, x, y, 2.6, { open, inv, r: 0.85, cols, len: 1.6, rot: i });
      });
    }, { anim: true });

    // ---------- Umbrellas (and one boot) hanging from the ceiling wires ----------
    const hang = [
      [1.3, 4.2, 0], [3.6, 1.9, 1], [4.8, 0.7, 2],
      [1.2, 10.8, 3], [3.4, 8.6, 6], [7.6, 4.4, 7], [9.8, 2.2, 8], [11.2, 0.8, 4],
    ];
    hang.forEach(([x, y, c], i) => {
      R.thing(x, y, (ctx, t) => {
        const sw = Math.sin(t * 1.1 + i * 1.7) * 0.12;
        const [wx, wy] = P(x, y, 6.6);
        const [ux, uy] = P(x + sw, y - sw, 5.85);
        ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(ux, uy - 0.2);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.stroke();
        umbrella(ctx, x + sw, y - sw, 5.85, { open: 1, r: 0.8, cols: UCOLS[c], len: 1.1, rot: i * 0.4 });
      }, { anim: true, depth: x + y - 2 });
    });
    // the yellow boot, hanging upside down where an umbrella should be (a find)
    const BOOT = [5.6, 6.4];
    R.thing(BOOT[0], BOOT[1], (ctx, t) => {
      const sw = Math.sin(t * 1.3) * 0.1;
      const [wx, wy] = P(BOOT[0], BOOT[1], 6.6);
      ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx, wy + 0.6);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.stroke();
      ctx.save();
      ctx.translate(wx, wy + 0.6);
      ctx.rotate(sw);
      ctx.beginPath();
      ctx.moveTo(-0.2, 0); ctx.lineTo(0.2, 0); ctx.lineTo(0.22, 0.7);
      ctx.quadraticCurveTo(0.24, 0.98, 0.0, 0.98); ctx.lineTo(-0.5, 0.98);
      ctx.quadraticCurveTo(-0.62, 0.86, -0.46, 0.72); ctx.lineTo(-0.22, 0.62); ctx.closePath();
      paint(ctx, C.mustard, { dots: shade(C.mustard, 0.4), density: 0.15, lw: 0.05 });
      ctx.beginPath(); ctx.rect(-0.62, 0.9, 0.86, 0.1); paint(ctx, C.ink, { lw: 0.02 });
      ctx.restore();
    }, { anim: true, depth: BOOT[0] + BOOT[1] - 2 });
    R.find({ id: 'boot', label: 'A yellow rain boot', at: [BOOT[0], BOOT[1], 5.9], r: 0.7 });

    // restocking the ceiling from a stepladder
    R.thing(3.3, 3.3, (ctx, t) => {
      for (const [a, b] of [[[2.6, 3.4, 0], [3.0, 3.0, 2.3]], [[3.4, 2.6, 0], [3.0, 3.0, 2.3]], [[2.9, 3.7, 0], [3.2, 3.2, 2.1]], [[3.7, 2.9, 0], [3.2, 3.2, 2.1]]]) {
        face(ctx, [a, b], null, { lw: 0.08, stroke: C.grey });
      }
      for (let z = 0.5; z < 2.2; z += 0.55) face(ctx, [[2.7 + z * 0.13, 3.3 - z * 0.13, z], [3.3 - z * 0.13 + 0.26, 2.7 + z * 0.13 - 0.26, z]], null, { lw: 0.06, stroke: C.grey });
      const reach = Math.sin(t * 1.4);
      person(ctx, 3.0, 3.0, 2.2, folk(202, { pose: 'stand', arms: [2.8 + reach * 0.2, -2.6], dir: 'r', top: C.purple, hat: 'cap' }), t);
      umbrella(ctx, 3.3 + reach * 0.05, 2.7, 5.1 + reach * 0.1, { open: 0.15, r: 0.7, cols: UCOLS[2], len: 1.0, shaft: true });
    }, { anim: true });

    // ---------- The shopkeeper, mopping (hopelessly) ----------
    const mop = route([[5.6, 3.6], [8.5, 4.2]], { speed: 0.5, loop: false });
    R.mover(mop, (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, folk(203, {
        pose: 'walk', dir: p.dir, back: p.back, top: C.coral, bottom: C.navy, style: 'bald', hair: C.grey, speed: 4,
        hold: (g, tt) => {
          const sw = Math.sin(tt * 5) * 0.25;
          g.beginPath(); g.moveTo(-0.1, -0.2); g.lineTo(0.55 + sw, 1.1);
          g.strokeStyle = C.wood; g.lineWidth = 0.07; g.stroke();
          g.beginPath();
          for (let i = 0; i < 7; i++) { g.moveTo(0.55 + sw, 1.1); g.lineTo(0.3 + sw + i * 0.08, 1.35); }
          g.strokeStyle = C.white; g.lineWidth = 0.07; g.stroke();
        },
      }), t);
      const lq = pulse(t, 13);
      if (Q.detail && pulse(t, 11) > 0.72 && !(lq < 0.25)) speech(ctx, p.x, p.y, 2.75, 'almost dry', { size: 0.34 });
    });
    R.thing(5.1, 5.1, (ctx, t) => {
      cylinder(ctx, 4.8, 4.8, 0, 0.35, 0.55, C.mustard, { top: C.water });
      if (Q.detail) {
        const k = pulse(t, 0.9);
        const [X, Y] = P(5.1, 5.05, 0.55 - k * 0.55);
        ctx.beginPath(); ctx.arc(X, Y, 0.05, 0, Math.PI * 2); ctx.fillStyle = C.water; ctx.fill();
      }
      label(ctx, 5.0, 5.2, 0.3, 'NO.47', 0.16, C.navy, 'Rethink Sans');
    }, { anim: true });

    // ---------- Kids stomping in puddles ----------
    const stomp = [[4.1, 9.2, 204, C.red, 0], [3.7, 10.1, 205, C.teal, 0.5], [12.5, 7.9, 206, C.pink, 0.2]];
    stomp.forEach(([x, y, seed, boots, off], i) => {
      R.thing(x, y, (ctx, t) => {
        const q = pulse(t + off, 0.75);
        const z = 4 * q * (1 - q) * 0.55;
        person(ctx, x, y, z, folk(seed, { scale: 0.68, pose: 'stand', arms: z > 0.15 ? [2.4, -2.3] : [0.5, -0.5], dir: i % 2 ? 'l' : 'r', top: i === 1 ? C.coral : C.mustard, shoes: boots, hat: 'sun' }), t);
        if (Q.detail && (q < 0.28 || q > 0.97)) {
          const k = q > 0.9 ? 0 : q / 0.28;
          for (let j = 0; j < 7; j++) {
            const a = (j / 7) * Math.PI * 2;
            const [X, Y] = P(x + Math.cos(a) * k * 0.8, y + Math.sin(a) * k * 0.8, Math.sin(k * Math.PI) * 0.5);
            ctx.beginPath(); ctx.arc(X, Y, 0.07, 0, Math.PI * 2); ctx.fillStyle = C.water; ctx.fill();
          }
        }
      }, { anim: true });
    });

    // ---------- Customers ----------
    // testing an umbrella the proper way
    const tester = route([[13.6, 5.0], [14.6, 9.6, 1], [11.2, 10.2], [10.4, 5.6, 1.5]], { speed: 0.8 });
    R.mover(tester, (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, folk(207, { pose: p.moving ? 'walk' : 'stand', arms: [2.9, -0.2], dir: p.dir, back: p.back, top: C.green, style: 'long' }), t);
      umbrella(ctx, p.x, p.y, 3.25, { open: 1, r: 0.95, cols: UCOLS[6], len: 1.1, rot: t * 0.3 });
    }, { bias: 0.3 });
    // a couple sharing one umbrella, badly
    const couple = route([[4.0, 15.3], [13.0, 15.3]], { speed: 0.7, loop: false, offset: 4 });
    R.mover(couple, (ctx, t, p) => {
      person(ctx, p.x - 0.35, p.y - 0.35, 0, folk(208, { pose: 'walk', dir: p.dir, top: C.navy, style: 'short' }), t);
      person(ctx, p.x + 0.35, p.y + 0.35, 0, folk(209, { pose: 'walk', dir: p.dir, top: C.pink, style: 'curly', phase: 2 }), t);
      umbrella(ctx, p.x - 0.35, p.y - 0.35, 3.3, { open: 1, r: 0.85, cols: UCOLS[0], len: 1.1 });
      if (Q.detail) {
        const k = pulse(t, 0.6);
        const [X, Y] = P(p.x + 0.45, p.y + 0.45, 2.4 - k * 1.2);
        ctx.beginPath(); ctx.arc(X, Y, 0.05, 0, Math.PI * 2); ctx.fillStyle = C.water; ctx.fill();
      }
    }, { bias: 0.4 });
    // the man who did not bring an umbrella to an umbrella shop
    R.mover(() => ({ x: 2.4, y: 13.4 }), (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, folk(210, {
        pose: 'stand', arms: [2.9, -2.9], dir: 'r', top: C.greyLight, bottom: C.grey, style: 'bald', hair: C.ink,
        hold: (g) => { g.beginPath(); g.rect(-0.75, -1.45, 0.95, 0.12); paint(g, C.white, { dots: C.grey, density: 0.3, lw: 0.02 }); },
      }), t);
      if (Q.detail && pulse(t, 9, 3) > 0.65) speech(ctx, p.x, p.y, 2.9, "I'm just browsing", { size: 0.32 });
    });
    // grandma trying on boots
    R.thing(1.2, 9.2, (ctx, t) => {
      box(ctx, 0.2, 7.9, 0, 1.0, 2.4, 0.7, C.wood, { top: C.woodLight });
      box(ctx, 1.4, 9.4, 0, 0.7, 0.45, 0.35, C.coral, { top: C.white });
      const tug = Math.sin(t * 6) > 0.3;
      person(ctx, 0.75, 8.8, 0.05, folk(211, { pose: 'sit', dir: 'r', top: C.purple, hair: C.greyLight, style: 'bun', arms: tug ? [1.6, 1.4] : [1.2, 1.0], shoes: C.green }), t);
      if (Q.detail && pulse(t, 8) > 0.6) speech(ctx, 0.75, 8.8, 2.2, 'too squeaky', { size: 0.3 });
    }, { anim: true });
    // a kid catching raindrops with her tongue
    R.mover(() => ({ x: 14.2, y: 12.4 }), (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, folk(212, { scale: 0.66, pose: 'cheer', dir: 'r', top: C.sky, style: 'pony', hair: C.red }), t);
      if (Q.detail && pulse(t, 5) > 0.55) speech(ctx, p.x, p.y, 1.9, 'AAAH', { size: 0.3 });
    });
    // dog shaking off, owner getting wet
    R.thing(11.4, 11.0, (ctx, t) => {
      person(ctx, 11.9, 10.4, 0, folk(213, { pose: 'stand', dir: 'l', top: C.mustard, hat: 'beanie', arms: [0.9, -0.3] }), t);
      const q = pulse(t, 5);
      const shake = q < 0.3 ? Math.sin(t * 40) * 0.25 : 0;
      const [X, Y] = P(11.0, 11.1, 0);
      ctx.save();
      ctx.translate(X, Y);
      ctx.beginPath(); ctx.moveTo(0.3, -0.5); ctx.lineTo(0.9, -1.2); ctx.strokeStyle = C.coral; ctx.lineWidth = 0.03; ctx.stroke();
      ctx.rotate(shake * 0.3);
      ctx.beginPath();
      ctx.ellipse(0, -0.4, 0.45, 0.25, 0, 0, Math.PI * 2);
      paint(ctx, C.wood, { dots: C.brown, density: 0.2, lw: 0.05 });
      for (const lx of [-0.3, -0.1, 0.15, 0.3]) { ctx.beginPath(); ctx.moveTo(lx, -0.3); ctx.lineTo(lx, 0); ctx.strokeStyle = C.brown; ctx.lineWidth = 0.08; ctx.stroke(); }
      ctx.beginPath(); ctx.arc(0.42, -0.62, 0.2, 0, Math.PI * 2); paint(ctx, C.wood, { lw: 0.05 });
      ctx.beginPath(); ctx.ellipse(0.32, -0.6, 0.08, 0.16, 0.3 + shake, 0, Math.PI * 2); paint(ctx, C.brown, { lw: 0.03 });
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0.5, -0.66, 0.035, 0, Math.PI * 2); ctx.arc(0.62, -0.6, 0.05, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-0.42, -0.45); ctx.lineTo(-0.6, -0.7 + Math.sin(t * 12) * 0.1); ctx.strokeStyle = C.wood; ctx.lineWidth = 0.08; ctx.stroke();
      ctx.restore();
      if (q < 0.35 && Q.detail) {
        const k = q / 0.35;
        for (let j = 0; j < 10; j++) {
          const a = (j / 10) * Math.PI * 2;
          ctx.beginPath(); ctx.arc(X + Math.cos(a) * (0.5 + k * 1.1), Y - 0.45 + Math.sin(a) * (0.3 + k * 0.6) + k * k * 0.4, 0.05, 0, Math.PI * 2);
          ctx.fillStyle = C.water; ctx.fill();
        }
      }
      if (Q.detail && q > 0.3 && q < 0.6) speech(ctx, 11.9, 10.4, 2.8, 'BISCUIT!', { size: 0.34 });
    }, { anim: true });

    // ---------- The frog (a find) ----------
    const frogAt = (t) => {
      const q = pulse(t, 12) * 12;
      const A = [8.9, 12.3], B = [10.4, 13.4];
      if (q < 5.5) return { x: A[0], y: A[1], z: 0.05, dir: 'r', q };
      if (q < 6.2) { const k = (q - 5.5) / 0.7; return { x: lerp(A[0], B[0], k), y: lerp(A[1], B[1], k), z: 0.05 + Math.sin(k * Math.PI) * 0.9, dir: 'r', jump: true, q }; }
      if (q < 11.3) return { x: B[0], y: B[1], z: 0.05, dir: 'l', q };
      const k = (q - 11.3) / 0.7;
      return { x: lerp(B[0], A[0], k), y: lerp(B[1], A[1], k), z: 0.05 + Math.sin(k * Math.PI) * 0.9, dir: 'l', jump: true, q };
    };
    R.mover(frogAt, (ctx, t, p) => {
      const [X, Y] = P(p.x, p.y, p.z);
      const f = p.dir === 'l' ? -1 : 1;
      ctx.save();
      ctx.translate(X, Y);
      ctx.scale(f * 0.9, 0.9);
      if (p.jump) {
        ctx.beginPath(); ctx.moveTo(-0.2, -0.1); ctx.lineTo(-0.55, 0.15); ctx.moveTo(0.1, -0.1); ctx.lineTo(-0.2, 0.2);
        ctx.strokeStyle = C.green; ctx.lineWidth = 0.1; ctx.lineCap = 'round'; ctx.stroke();
      }
      ctx.beginPath();
      ctx.ellipse(0, -0.2, 0.34, 0.22, -0.15, 0, Math.PI * 2);
      paint(ctx, C.green, { dots: shade(C.green, 0.4), density: 0.2, lw: 0.05 });
      for (const ex of [0.05, 0.28]) {
        ctx.beginPath(); ctx.arc(ex, -0.42, 0.1, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.04 });
        ctx.beginPath(); ctx.arc(ex + 0.02, -0.42, 0.045, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(0.22, -0.2, 0.1, 0.2, Math.PI - 0.6); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
      // tongue flick at a raindrop
      const tq = pulse(t, 3.1);
      if (!p.jump && tq > 0.85) {
        const k = Math.sin(((tq - 0.85) / 0.15) * Math.PI);
        ctx.beginPath(); ctx.moveTo(0.3, -0.18); ctx.lineTo(0.3 + k * 0.5, -0.18 - k * 0.8);
        ctx.strokeStyle = C.pink; ctx.lineWidth = 0.06; ctx.stroke();
      }
      ctx.restore();
    }, { bias: 0.2 });
    R.find({ id: 'frog', label: 'A frog', at: (t) => { const p = frogAt(t); return [p.x, p.y, p.z + 0.25]; }, r: 0.7 });

    // ---------- Mother duck, ducklings, and one very large duckling ----------
    const duckRoute = route([[2.6, 6.2], [3.2, 10.4], [6.8, 12.6], [9.6, 12.9], [12.6, 13.4], [14.2, 11.2], [13.6, 6.8], [10.8, 5.6], [5.8, 5.6], [3.6, 5.0]], { speed: 0.85 });
    const GAP = 0.75;
    R.mover((t) => duckRoute(t), (ctx, t, p) => {
      duck(ctx, p.x, p.y, 0, t, { scale: 0.7, dir: p.dir, swim: inPond(p.x, p.y), col: C.woodLight, wing: C.teal, head: C.wood });
    });
    for (let i = 1; i <= 5; i++) {
      R.mover((t) => duckRoute(t - i * GAP), (ctx, t, p) => {
        duck(ctx, p.x, p.y, 0, t, { scale: 0.36, dir: p.dir, swim: inPond(p.x, p.y), col: C.butter, phase: i * 1.3 });
      });
    }
    R.goose((t) => {
      const p = duckRoute(t - 6 * GAP - 0.4);
      return { ...p, z: 0, pose: inPond(p.x, p.y) ? 'swim' : 'walk' };
    }, {});

    // ---------- Air: two small rain clouds, and a lot of rain ----------
    const clouds = [
      (t) => [8 + Math.sin(t / 11) * 3.2, 8 + Math.cos(t / 11) * 3.2, 8.4],
      (t) => [8 + Math.sin(t / 8 + 2.6) * 4.2, 8 + Math.cos(t / 13 + 1) * 3.6, 8.9],
    ];
    R.air((ctx, t) => {
      ctx.strokeStyle = RAIN;
      ctx.lineWidth = 0.035;
      ctx.lineCap = 'round';
      const n = Q.detail ? 32 : 14;
      clouds.forEach((cf, ci) => {
        const [cx, cy, cz] = cf(t);
        ctx.beginPath();
        particles(t, n, 0.85, (k, r) => {
          const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 3.2;
          const x = Math.max(0.3, Math.min(15.7, cx + Math.cos(a) * d));
          const y = Math.max(0.3, Math.min(15.7, cy + Math.sin(a) * d));
          const z = (cz - 0.3) * (1 - k);
          const [X, Y] = P(x, y, z);
          ctx.moveTo(X, Y); ctx.lineTo(X + 0.05, Y - 0.75);
        }, 30 + ci);
        ctx.stroke();
        // splashes on the floor
        if (Q.detail) {
          particles(t, 6, 0.4, (k, r) => {
            const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 3.0;
            const [X, Y] = P(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 0);
            ctx.beginPath();
            ctx.ellipse(X, Y, 0.08 + k * 0.2, 0.04 + k * 0.1, 0, Math.PI, 0);
            ctx.strokeStyle = alpha(C.navy, 0.5 * (1 - k));
            ctx.stroke();
          }, 40 + ci);
        }
      });
      // lightning, now and then
      const lq = pulse(t, 13);
      if (lq < 0.05) {
        const [cx, cy, cz] = clouds[0](t);
        poly(ctx, [[0, 0, 7], [16, 0, 7], [16, 0, 0], [16, 16, 0], [0, 16, 0], [0, 16, 7]]);
        ctx.fillStyle = alpha(C.white, 0.22);
        ctx.fill();
        ctx.beginPath();
        let [X, Y] = P(cx, cy, cz - 0.5);
        ctx.moveTo(X, Y);
        for (let i = 1; i <= 6; i++) { const [x2, y2] = P(cx + (i % 2 ? 0.4 : -0.3), cy, cz - 0.5 - i * 0.8); ctx.lineTo(x2, y2); }
        ctx.strokeStyle = C.mustard; ctx.lineWidth = 0.12; ctx.stroke();
      }
      clouds.forEach((cf, ci) => { const [x, y, z] = cf(t); cloud(ctx, x, y, z, t, ci ? 0.9 : 1.1); });
    });
    R.air((ctx, t) => {
      const lq = pulse(t, 13);
      if (lq > 0.05 && lq < 0.2 && Q.detail) { const m = mop(t); speech(ctx, m.x, m.y, 2.75, 'NOT AGAIN', { size: 0.34 }); }
    });
  },
};
