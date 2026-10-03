// Model Railway: a whole tiny world on one big table. A train loops through
// a papier-mache mountain, a cat lies in wait, and the club's newest model, a
// plastic goose at monster scale, terrorizes the town on a turntable. The
// real goose is asleep under the layout.
import {
  C, box, rect, disc, cylinder, face, poly, paint, person, folk, slab, planks,
  speech, shade, tint, alpha, Q, label, P, goose, onLeft, onRight, frame, paintText, rng, pick, shelfR, clockL, windowL, mix, dots,
} from '../../../engine/art.js';
import { route, orbit, particles, pulse, clamp, wave } from '../../../engine/actors.js';
import { ZK } from '../../../engine/iso.js';

const TZ = 1.2; // table top height
const T0 = 2.6, T1 = 13.4; // table extents (x and y)
const BACK = -40; // depth offset for everything standing behind the table
const TABLE_D = -20;

// ---------- Track: a rounded square loop ----------
const RC = 2.2;
const SEGS = [];
{
  const L1 = 4.4;
  const arc = (cx, cy, a0) => ({ arc: true, cx, cy, a0, len: (Math.PI / 2) * RC });
  const line = (x0, y0, x1, y1) => ({ x0, y0, x1, y1, len: L1 });
  const parts = [
    line(5.8, 3.6, 10.2, 3.6), arc(10.2, 5.8, -Math.PI / 2),
    line(12.4, 5.8, 12.4, 10.2), arc(10.2, 10.2, 0),
    line(10.2, 12.4, 5.8, 12.4), arc(5.8, 10.2, Math.PI / 2),
    line(3.6, 10.2, 3.6, 5.8), arc(5.8, 5.8, Math.PI),
  ];
  let s = 0;
  for (const p of parts) { p.s0 = s; s += p.len; SEGS.push(p); }
}
const TL = SEGS[SEGS.length - 1].s0 + SEGS[SEGS.length - 1].len;
const wrap = (s) => ((s % TL) + TL) % TL;
function trackPt(s) {
  s = wrap(s);
  let g = SEGS[0];
  for (const q of SEGS) if (s >= q.s0) g = q;
  const k = (s - g.s0) / g.len;
  if (g.arc) {
    const a = g.a0 + k * (Math.PI / 2);
    return { x: g.cx + Math.cos(a) * RC, y: g.cy + Math.sin(a) * RC, dx: -Math.sin(a), dy: Math.cos(a) };
  }
  const dx = (g.x1 - g.x0) / g.len, dy = (g.y1 - g.y0) / g.len;
  return { x: g.x0 + (g.x1 - g.x0) * k, y: g.y0 + (g.y1 - g.y0) * k, dx, dy };
}

// ---------- Mountain (built once) ----------
const MC = [4.1, 4.1];
const M_RINGS = [];
{
  const N = 22;
  const rings = [
    { r: 3.0, z: TZ, c: MC, n: 0.2 },
    { r: 2.55, z: TZ + 0.75, c: [4.05, 4.05], n: 0.3 },
    { r: 1.95, z: TZ + 1.55, c: [3.95, 3.9], n: 0.32 },
    { r: 1.25, z: TZ + 2.3, c: [3.8, 3.75], n: 0.28 },
    { r: 0.6, z: TZ + 2.85, c: [3.65, 3.6], n: 0.18 },
  ];
  for (const rg of rings) {
    const pts = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const r = rg.r + Math.sin(a * 3 + rg.z) * rg.n + Math.sin(a * 5 + 1) * rg.n * 0.5;
      pts.push([Math.max(T0 + 0.03, rg.c[0] + Math.cos(a) * r), Math.max(T0 + 0.03, rg.c[1] + Math.sin(a) * r), rg.z]);
    }
    M_RINGS.push(pts);
  }
}
const PEAK = [3.55, 3.5, TZ + 3.25];
function inPoly(x, y, pts) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
// Tunnel mouths: where the track crosses the mountain's foot.
let TUN_IN = 0, TUN_OUT = 0;
{
  const base = M_RINGS[0];
  for (let s = SEGS[6].s0; s < TL; s += 0.02) { const p = trackPt(s); if (inPoly(p.x, p.y, base)) { TUN_IN = s; break; } }
  for (let s = 0; s < 5; s += 0.02) { const p = trackPt(s); if (!inPoly(p.x, p.y, base)) { TUN_OUT = s; break; } }
}

// ---------- Train schedule ----------
// The loco stops at the station, then does one lap with a gentle start and stop.
const S_STOP = 10.9;
const MOVE = 15, ACC = 1.6, DWELL = 3.6, PERIOD = MOVE + DWELL;
const VMAX = TL / (MOVE - ACC);
function trainDist(t) {
  const tau = pulse(t, PERIOD) * PERIOD;
  if (tau >= MOVE) return TL;
  if (tau < ACC) return (VMAX * tau * tau) / (2 * ACC);
  if (tau < MOVE - ACC) return (VMAX * ACC) / 2 + VMAX * (tau - ACC);
  const r = MOVE - tau;
  return TL - (VMAX * r * r) / (2 * ACC);
}
const locoS = (t) => S_STOP + trainDist(t);
const tauOf = (t) => pulse(t, PERIOD) * PERIOD;
const CARS = [
  { len: 1.0, kind: 'loco', color: C.red },
  { len: 0.85, color: C.teal },
  { len: 0.85, color: C.mustard },
  { len: 0.85, color: C.teal },
  { len: 0.7, color: C.coral, kind: 'van' },
];
const GAPC = 0.12;
{
  let off = 0;
  for (const c of CARS) { c.off = off; off += c.len + GAPC; }
}
// Visible part of a car [back, front] in track distance, or null inside the tunnel.
function visibleSpan(sf, len) {
  let uf = wrap(sf);
  const tb = TUN_OUT;
  if (uf < tb) uf += TL; // map so the tunnel is one interval [TUN_IN, TL + TUN_OUT)
  const ub = uf - len;
  const T_A = TUN_IN, T_B = TL + TUN_OUT;
  if (uf >= T_B && ub < T_B) return [T_B, uf];
  if (uf <= T_A) return [ub, uf];
  if (ub >= T_A && uf <= T_B) return null;
  if (ub < T_A) return [ub, T_A];
  return [ub, uf];
}

// ---------- Small drawing helpers ----------
function inY(ctx, y0, fn) { ctx.save(); ctx.transform(1, 0.5, 0, -ZK, -y0, y0 / 2); fn(); ctx.restore(); }

// A box of any heading: a and b are the ends of its center line.
function obox(ctx, a, b, w, z0, h, color, o = {}) {
  let dx = b.x - a.x, dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 1;
  dx /= L; dy /= L;
  const nx = -dy * w / 2, ny = dx * w / 2;
  const c = [[a.x + nx, a.y + ny], [b.x + nx, b.y + ny], [b.x - nx, b.y - ny], [a.x - nx, a.y - ny]];
  const normals = [[-dy, dx], [dx, dy], [dy, -dx], [-dx, -dy]];
  const z1 = z0 + h;
  for (let i = 0; i < 4; i++) {
    const [mx, my] = normals[i];
    if (mx + my <= 0.001) continue;
    const p = c[i], q = c[(i + 1) % 4];
    const side = my > mx ? shade(color, 0.22) : shade(color, 0.1);
    face(ctx, [[p[0], p[1], z0], [q[0], q[1], z0], [q[0], q[1], z1], [p[0], p[1], z1]], side, { lw: o.lw || 0.03 });
    if (o.windows && Math.abs(i % 2) === 0 && Q.detail) {
      // a band of lit windows along the long sides
      const n = o.windows;
      for (let k = 0; k < n; k++) {
        const f0 = 0.12 + (k / n) * 0.76, f1 = f0 + 0.76 / n - 0.06;
        const A = [p[0] + (q[0] - p[0]) * f0, p[1] + (q[1] - p[1]) * f0];
        const B = [p[0] + (q[0] - p[0]) * f1, p[1] + (q[1] - p[1]) * f1];
        face(ctx, [[A[0], A[1], z0 + h * 0.45], [B[0], B[1], z0 + h * 0.45], [B[0], B[1], z0 + h * 0.8], [A[0], A[1], z0 + h * 0.8]], C.butter, { lw: 0.015 });
      }
    }
  }
  face(ctx, c.map(([x, y]) => [x, y, z1]), o.top || color, { lw: o.lw || 0.03 });
}

// Tiny cone tree at model scale.
function tinyTree(ctx, x, y, z, s = 1, leaf = C.green) {
  const [X, Y] = P(x, y, z);
  ctx.beginPath();
  ctx.moveTo(X, Y); ctx.lineTo(X, Y - 0.2 * s);
  ctx.strokeStyle = C.brown; ctx.lineWidth = 0.05 * s; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(X - 0.2 * s, Y - 0.15 * s); ctx.lineTo(X, Y - 0.75 * s); ctx.lineTo(X + 0.2 * s, Y - 0.15 * s); ctx.closePath();
  paint(ctx, leaf, { lw: 0.025, dots: shade(leaf, 0.45), density: 0.2 });
  ctx.beginPath();
  ctx.moveTo(X - 0.15 * s, Y - 0.45 * s); ctx.lineTo(X, Y - 0.95 * s); ctx.lineTo(X + 0.15 * s, Y - 0.45 * s); ctx.closePath();
  paint(ctx, tint(leaf, 0.12), { lw: 0.025 });
}

// Tiny house with a pitched roof (ridge along x or y).
function house(ctx, x, y, w, d, h, color, roof, alongX = true) {
  box(ctx, x, y, TZ, w, d, h, color, { lw: 0.025 });
  const z = TZ + h, rh = Math.min(w, d) * 0.55;
  if (alongX) {
    const ym = y + d / 2;
    face(ctx, [[x, y, z], [x + w, y, z], [x + w, ym, z + rh], [x, ym, z + rh]], shade(roof, 0.1), { lw: 0.025 });
    face(ctx, [[x, y + d, z], [x + w, y + d, z], [x + w, ym, z + rh], [x, ym, z + rh]], roof, { lw: 0.025, dots: shade(roof, 0.4), density: 0.2 });
    face(ctx, [[x + w, y, z], [x + w, y + d, z], [x + w, ym, z + rh]], shade(color, 0.1), { lw: 0.025 });
  } else {
    const xm = x + w / 2;
    face(ctx, [[x, y, z], [x, y + d, z], [xm, y + d, z + rh], [xm, y, z + rh]], shade(roof, 0.1), { lw: 0.025 });
    face(ctx, [[x + w, y, z], [x + w, y + d, z], [xm, y + d, z + rh], [xm, y, z + rh]], roof, { lw: 0.025, dots: shade(roof, 0.4), density: 0.2 });
    face(ctx, [[x, y + d, z], [x + w, y + d, z], [xm, y + d, z + rh]], shade(color, 0.22), { lw: 0.025 });
  }
  if (Q.detail) {
    // windows and a door on the two visible walls
    const win = (px, py, pz) => { const [X, Y] = P(px, py, pz); ctx.fillStyle = C.butter; ctx.fillRect(X - 0.04, Y - 0.05, 0.08, 0.09); };
    win(x + w * 0.3, y + d, TZ + h * 0.6); win(x + w * 0.7, y + d, TZ + h * 0.6);
    win(x + w, y + d * 0.5, TZ + h * 0.6);
    const [X, Y] = P(x + w * 0.5, y + d, TZ);
    ctx.fillStyle = C.ink; ctx.fillRect(X - 0.04, Y - 0.17, 0.08, 0.16);
  }
}

// Tiny car on the road.
function tinyCar(ctx, x, y, dx, dy, color) {
  const a = { x: x - dx * 0.18, y: y - dy * 0.18 }, b = { x: x + dx * 0.18, y: y + dy * 0.18 };
  obox(ctx, a, b, 0.2, TZ, 0.1, color, { lw: 0.02 });
  const a2 = { x: x - dx * 0.08, y: y - dy * 0.08 }, b2 = { x: x + dx * 0.06, y: y + dy * 0.06 };
  obox(ctx, a2, b2, 0.17, TZ + 0.1, 0.07, tint(color, 0.3), { lw: 0.02, top: C.sky });
}

function tinyFolk(ctx, x, y, z, t, o) {
  person(ctx, x, y, z, { ...o, scale: o.scale || 0.2 }, t);
}

// Rotate a person's drawing about their feet (for leaning over the table).
function leaning(ctx, x, y, z, ang, fn) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y); ctx.rotate(ang); ctx.translate(-X, -Y);
  fn();
  ctx.restore();
}
const nearHand = (a) => [Math.sin(a) * 0.72 - 0.13, Math.cos(a) * 0.72 - 0.3];

function tinyCow(ctx, x, y, z) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.fillStyle = C.ink;
  for (const lx of [-0.12, -0.05, 0.07, 0.13]) ctx.fillRect(lx, -0.14, 0.035, 0.14);
  ctx.beginPath(); ctx.ellipse(0, -0.2, 0.19, 0.1, 0, 0, Math.PI * 2);
  paint(ctx, C.white, { lw: 0.025 });
  ctx.fillStyle = C.ink;
  ctx.beginPath(); ctx.arc(-0.07, -0.22, 0.045, 0, Math.PI * 2); ctx.arc(0.06, -0.17, 0.035, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0.21, -0.26, 0.07, 0.06, 0.3, 0, Math.PI * 2);
  paint(ctx, C.white, { lw: 0.025 });
  ctx.beginPath(); ctx.ellipse(0.26, -0.24, 0.035, 0.03, 0, 0, Math.PI * 2); ctx.fillStyle = C.pink; ctx.fill();
  ctx.restore();
}

// The sky by the hour (as the Lido's), for the window, and the clock on the
// day's time.
const SKY = [[0, C.night], [4.5, C.night], [6, C.blush], [8, C.sky], [17, C.sky], [19, C.pink], [20.5, C.purple], [21.5, C.night], [24, C.night]];
function skyAt(h) {
  for (let i = 1; i < SKY.length; i++) {
    const [h0, c0] = SKY[i - 1], [h1, c1] = SKY[i];
    if (h <= h1) return mix(c0, c1, Math.round(((h - h0) / (h1 - h0)) * 20) / 20);
  }
  return C.night;
}
function dayWindow(ctx, h) {
  onLeft(ctx, 8.8, 2.5, 2.6, 2.2, skyAt(h), { lw: 0.03 });
  const dark = h < 5.5 || h > 20.5;
  if (dark && Q.detail) {
    for (const [yy, zz] of [[9.2, 4.2], [10.1, 3.4], [10.9, 4.4], [9.6, 2.9], [11.1, 3.0]]) {
      const [X, Y] = P(0, yy, zz);
      ctx.fillStyle = C.butter; ctx.fillRect(X - 0.04, Y - 0.04, 0.08, 0.08);
    }
  }
  const k = clamp((h - 6) / 14);
  const [X, Y] = P(0, dark ? 10.4 : 9.3 + k * 1.8, dark ? 4.0 : 3.0 + Math.sin(k * Math.PI) * 1.2);
  ctx.beginPath(); ctx.arc(X, Y, 0.3, 0, Math.PI * 2);
  ctx.fillStyle = dark ? C.butter : C.mustard; ctx.fill();
  face(ctx, [[0, 10.1, 2.5], [0, 10.1, 4.7]], null, { lw: 0.1, stroke: C.white });
  face(ctx, [[0, 8.8, 3.6], [0, 11.4, 3.6]], null, { lw: 0.1, stroke: C.white });
}
function dayClockL(ctx, y, z, r, h) {
  const [X, Y] = P(0, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.transform(1, -0.5, 0, 1, 0, 0);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
  paint(ctx, C.white);
  const hA = ((h % 12) / 12) * Math.PI * 2, mA = (h % 1) * Math.PI * 2;
  ctx.strokeStyle = C.ink; ctx.lineCap = 'round';
  ctx.lineWidth = 0.09; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(hA) * r * 0.5, -Math.cos(hA) * r * 0.5); ctx.stroke();
  ctx.lineWidth = 0.06; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(mA) * r * 0.8, -Math.cos(mA) * r * 0.8); ctx.stroke();
  ctx.restore();
}

export default {
  id: 'trains',
  name: 'Model Railway',
  blurb: 'Eleven years on this tiny town, and the club finally bought it a monster. The 8:15 is still running on time.',

  build(R) {
    const back = (x, y, draw, o = {}) => R.thing(x, y, draw, { depth: BACK + x + y, ...o });

    // ---------- Floor and walls ----------
    R.floor((ctx) => {
      slab(ctx, C.wood);
      planks(ctx, C.woodLight, 0.9);
      // a long runner rug along the front aisles
      rect(ctx, 13.9, 1.5, 1.7, 14.1, 0.01, C.red, { dots: shade(C.red, 0.35), density: 0.2, lw: 0.04 });
      rect(ctx, 1.5, 13.9, 12.4, 1.7, 0.01, C.red, { dots: shade(C.red, 0.35), density: 0.2, lw: 0.04 });
    });
    R.walls({ left: tint(C.sky, 0.45), right: tint(C.sky, 0.3), cap: C.paper, dotsL: C.sky, dotsR: C.sky, densL: 0.15, densR: 0.15 });

    R.decor((ctx) => {
      // wood wainscot on both walls
      onLeft(ctx, 0, 0, 16, 1.7, C.wood, { dots: shade(C.wood, 0.35), density: 0.2 });
      onRight(ctx, 0, 0, 16, 1.7, C.wood, { dots: shade(C.wood, 0.35), density: 0.2 });
      if (Q.detail) {
        for (let u = 1; u < 16; u += 1) {
          face(ctx, [[0.01, u, 0], [0.01, u, 1.7]], null, { lw: 0.025, stroke: shade(C.wood, 0.4) });
          face(ctx, [[u, 0.01, 0], [u, 0.01, 1.7]], null, { lw: 0.025, stroke: shade(C.wood, 0.4) });
        }
      }
      onLeft(ctx, 0, 1.7, 16, 0.12, C.brown);
      onRight(ctx, 0, 1.7, 16, 0.12, C.brown);

      // Club banner along the right wall
      onRight(ctx, 1.2, 4.3, 11.2, 1.2, C.navy, { dots: C.ink, density: 0.2 });
      paintText(ctx, 'right', 6.8, 4.95, 'SQUARES MODEL RAILWAY CLUB', 0.62, C.butter);
      paintText(ctx, 'right', 6.8, 4.5, 'EST. 1974  ·  MIND THE GAUGE', 0.26, C.white, 'Rethink Sans');

      // Travel posters on the left wall
      frame(ctx, 'left', 4.3, 2.4, 1.6, 2.1, C.sky, (g) => {
        onLeft(g, 4.3, 2.4, 1.6, 0.8, C.green);
        face(g, [[0, 4.5, 3.2], [0, 5.1, 4.0], [0, 5.7, 3.2]], C.white);
        paintText(g, 'left', 5.1, 2.75, 'VISIT', 0.24, C.white);
        paintText(g, 'left', 5.1, 4.25, 'THE ALPS', 0.26, C.navy);
      });
      frame(ctx, 'left', 6.4, 2.4, 1.6, 2.1, C.coral, (g) => {
        paintText(g, 'left', 7.2, 3.95, 'GOOSE', 0.34, C.white);
        paintText(g, 'left', 7.2, 3.5, 'JUNCTION', 0.26, C.butter);
        paintText(g, 'left', 7.2, 2.85, 'BY RAIL', 0.2, C.white);
      });
      windowL(ctx, 8.8, 2.5, 2.6, 2.2, C.night, C.white);
      // stars in the window
      if (Q.detail) {
        for (const [yy, zz] of [[9.2, 4.2], [10.1, 3.4], [10.9, 4.4], [9.6, 2.9], [11.1, 3.0]]) {
          const [X, Y] = P(0, yy, zz);
          ctx.fillStyle = C.butter; ctx.fillRect(X - 0.04, Y - 0.04, 0.08, 0.08);
        }
      }
      // the moon
      {
        const [X, Y] = P(0, 10.4, 4.0);
        ctx.beginPath(); ctx.arc(X, Y, 0.3, 0, Math.PI * 2); ctx.fillStyle = C.butter; ctx.fill();
      }
      // rules board
      onLeft(ctx, 12.0, 2.3, 1.6, 2.2, C.white, { lw: 0.05 });
      paintText(ctx, 'left', 12.8, 4.2, 'CLUB RULES', 0.22, C.coral);
      if (Q.detail) {
        const rules = ['1. NO TOUCHING', '2. NO RUNNING', '3. NO CATS', '4. NO GEESE'];
        rules.forEach((r, i) => paintText(ctx, 'left', 12.8, 3.8 - i * 0.35, r, 0.15, C.ink, 'Rethink Sans'));
        // "NO CATS" has been crossed out
        face(ctx, [[0, 12.35, 3.1], [0, 13.25, 3.1]], null, { lw: 0.04, stroke: C.red });
      }
      clockL(ctx, 14.6, 4.2, 0.55);

      // Departures board on the right wall, front aisle
      onRight(ctx, 13.7, 2.4, 2.1, 1.9, C.black, { lw: 0.06 });
      paintText(ctx, 'right', 14.75, 4.05, 'DEPARTURES', 0.2, C.butter);
    });
    // The window shows the hour and the clock tells the day's time.
    const day = R.opts.day;
    R.decor((ctx, t) => { const h = day.hour(t); dayWindow(ctx, h); dayClockL(ctx, 14.6, 4.2, 0.55, h); }, { anim: true });

    // split-flap rows, one always flipping
    R.decor((ctx, t) => {
      if (!Q.detail) return;
      const rows = [['8:15 SQUARESVILLE', 'ON TIME', C.leaf], ['8:40 GOOSE JCT', 'DELAYED', C.coral], ['9:05 MOUNTAIN', 'ON TIME', C.leaf]];
      rows.forEach(([a, b, c], i) => {
        paintText(ctx, 'right', 14.5, 3.65 - i * 0.42, a, 0.14, C.white, 'Rethink Sans');
        const blink = i === 1 && Math.floor(t * 2) % 2;
        if (!blink) paintText(ctx, 'right', 15.45, 3.65 - i * 0.42, b, 0.13, c, 'Rethink Sans');
      });
    }, { anim: true });

    // ---------- Back aisles (drawn before the table) ----------
    // Shelves of boxed trains on the right wall
    back(3.2 + 3.6, 1.1, (ctx) => {
      shelfR(ctx, 2.9, 3.6, 3.3, 3, 21, C.brown, (g, x, z, w, r) => {
        let xx = x + 0.1;
        while (xx < x + w - 0.6) {
          const bw = 0.45 + r() * 0.35;
          const c = pick(r, [C.red, C.navy, C.mustard, C.teal, C.coral]);
          box(g, xx, 0.2, z, bw, 0.75, 0.5 + r() * 0.25, c, { lw: 0.03, top: tint(c, 0.2) });
          const [X, Y] = P(xx + bw / 2, 0.95, z + 0.3);
          g.fillStyle = C.white; g.fillRect(X - 0.14, Y - 0.05, 0.28, 0.1);
          xx += bw + 0.08;
        }
      });
    });
    // Signal lever frame, and the signalman pulling levers
    back(9.6, 1.1, (ctx, t) => {
      box(ctx, 7.9, 0.3, 0, 1.7, 0.8, 0.7, C.brown, { top: C.wood });
      const cols = [C.red, C.red, C.mustard, C.navy, C.red, C.white];
      const lv = Math.floor(t / 1.5) % 6;
      cols.forEach((c, i) => {
        const x = 8.05 + i * 0.26;
        const pulled = i === lv;
        face(ctx, [[x, 0.7, 0.7], [x + (pulled ? 0.0 : 0), pulled ? 1.0 : 0.55, 1.55]], null, { lw: 0.1, stroke: C.ink });
        face(ctx, [[x, 0.7, 0.7], [x, pulled ? 1.0 : 0.55, 1.55]], null, { lw: 0.06, stroke: c });
      });
    }, { anim: true });
    // Tea urn table on the right wall
    back(12.6, 1.2, (ctx) => {
      for (const [lx, ly] of [[10.7, 0.3], [12.4, 0.3], [10.7, 1.0], [12.4, 1.0]]) box(ctx, lx, ly, 0, 0.08, 0.08, 1.1, C.brown, { flat: true, lw: 0.03 });
      box(ctx, 10.6, 0.2, 1.1, 2.0, 1.0, 0.08, C.wood);
      cylinder(ctx, 11.1, 0.65, 1.18, 0.28, 0.7, C.grey, { top: C.greyLight });
      box(ctx, 11.05, 0.95, 1.4, 0.1, 0.12, 0.06, C.ink, { flat: true });
      for (const [mx, c] of [[11.7, C.white], [12.0, C.coral], [12.25, C.mustard]]) cylinder(ctx, mx, 0.8, 1.18, 0.09, 0.16, c);
      // a plate of biscuits
      disc(ctx, 11.9, 0.45, 1.19, 0.22, C.white, { lw: 0.02 });
      disc(ctx, 11.9, 0.45, 1.2, 0.12, C.woodLight, { lw: 0.02 });
    });

    // Back-aisle people: drawn twice so the table hides their legs but not
    // their arms reaching over it.
    const backPerson = (pos, drawFn) => {
      const at = R.mover(pos, (ctx, t, p) => drawFn(ctx, t, p), { depth: (t) => { const p = at(t); return BACK + p.x + p.y; } });
      R.mover(pos, (ctx, t, p) => {
        const [X, Y] = P(p.x, p.y, 0);
        ctx.save();
        ctx.beginPath();
        ctx.rect(X - 4, Y - 12, 8, 12 - 0.95 * (p.scale || 1));
        ctx.clip();
        drawFn(ctx, t, p);
        ctx.restore();
      }, { depth: TABLE_D + 0.5 });
    };

    // Signalman, back to us, working the levers
    backPerson(() => ({ x: 8.8, y: 1.8 }), (ctx, t, p) => {
      const tug = pulse(t, 1.5);
      const a = tug < 0.4 ? 2.4 - tug * 2 : 1.6;
      person(ctx, p.x, p.y, 0, folk(81, { pose: 'stand', dir: 'l', back: true, top: C.green, style: 'bald', arms: [a, 0.3] }), t);
    });
    // Tea maker
    backPerson(() => ({ x: 11.9, y: 1.9 }), (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, folk(82, { pose: 'stand', dir: 'l', style: 'bun', hair: C.grey, top: C.pink, dress: true, arms: [1.25, 1.0],
        hold(g) {
          const [hx, hy] = nearHand(1.25);
          g.beginPath(); g.rect(hx - 0.08, hy - 0.15, 0.18, 0.18); paint(g, C.white, { lw: 0.025 });
          g.beginPath(); g.arc(hx + 0.12, hy - 0.06, 0.05, -1.5, 1.5); g.strokeStyle = C.ink; g.lineWidth = 0.025; g.stroke();
        } }), t);
    });
    // Inspector with a magnifying glass, watching the tunnel mouth
    backPerson(() => ({ x: 1.8, y: 8.2 }), (ctx, t, p) => {
      leaning(ctx, p.x, p.y, 0, 0.3 + wave(t, 0.8, 0.05), () => {
        person(ctx, p.x, p.y, 0, folk(83, { pose: 'stand', dir: 'r', style: 'bald', hair: C.grey, top: C.brown, arms: [1.9, 1.2],
          hold(g) {
            const [hx, hy] = nearHand(1.9);
            g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + 0.2, hy - 0.1); g.strokeStyle = C.ink; g.lineWidth = 0.06; g.stroke();
            g.beginPath(); g.arc(hx + 0.35, hy - 0.18, 0.18, 0, Math.PI * 2);
            g.fillStyle = alpha(C.sky, 0.6); g.fill();
            g.strokeStyle = C.ink; g.lineWidth = 0.05; g.stroke();
          } }), t);
        // a moustache, magnified
      });
    });
    // Tree planter with tweezers, placing one tiny tree over and over
    backPerson(() => ({ x: 1.8, y: 11.2 }), (ctx, t, p) => {
      const k = pulse(t, 5);
      const dip = k < 0.5 ? Math.sin(k * 2 * Math.PI) * 0.2 : 0;
      leaning(ctx, p.x, p.y, 0, 0.42, () => {
        person(ctx, p.x, p.y, 0, folk(84, { pose: 'stand', dir: 'r', style: 'curly', hair: C.brown, top: C.teal, arms: [1.75 - dip, 1.3],
          hold(g) {
            const [hx, hy] = nearHand(1.75 - dip);
            g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + 0.4, hy + 0.12); g.moveTo(hx, hy + 0.04); g.lineTo(hx + 0.4, hy + 0.14);
            g.strokeStyle = C.grey; g.lineWidth = 0.03; g.stroke();
            if (k > 0.1 && k < 0.95) {
              g.save(); g.translate(hx + 0.42, hy + 0.32); g.rotate(-0.42);
              g.beginPath(); g.moveTo(-0.08, 0); g.lineTo(0, -0.3); g.lineTo(0.08, 0); g.closePath();
              paint(g, C.leaf, { lw: 0.02 });
              g.restore();
            }
          } }), t);
        // head loupe
        const [X, Y] = P(p.x, p.y, 0);
        ctx.beginPath(); ctx.arc(X + 0.28, Y - 1.98, 0.09, 0, Math.PI * 2); ctx.fillStyle = alpha(C.sky, 0.8); ctx.fill();
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.04; ctx.stroke();
      });
    });

    // ---------- The table and its flat landscape ----------
    const LAKE = [];
    {
      const r = rng(4);
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const w = 1 + (r() - 0.5) * 0.12;
        LAKE.push([7.6 + Math.cos(a) * 2.1 * w, Math.min(13.2, 11.75 + Math.sin(a) * 1.45 * w)]);
      }
    }
    R.thing(T1, T1, (ctx) => {
      // skirt, pleated, and legs hidden behind it
      face(ctx, [[T0, T1, 0.05], [T1, T1, 0.05], [T1, T1, TZ - 0.2], [T0, T1, TZ - 0.2]], C.navy, { dots: C.ink, density: 0.25 });
      face(ctx, [[T1, T0, 0.05], [T1, T1, 0.05], [T1, T1, TZ - 0.2], [T1, T0, TZ - 0.2]], shade(C.navy, -0.1), { dots: C.ink, density: 0.15 });
      if (Q.detail) {
        for (let u = T0 + 0.4; u < T1; u += 0.4) {
          face(ctx, [[u, T1, 0.05], [u, T1, TZ - 0.2]], null, { lw: 0.025, stroke: C.ink });
          face(ctx, [[T1, u, 0.05], [T1, u, TZ - 0.2]], null, { lw: 0.025, stroke: C.ink });
        }
      }
      // fascia board
      face(ctx, [[T0, T1, TZ - 0.22], [T1, T1, TZ - 0.22], [T1, T1, TZ], [T0, T1, TZ]], C.wood);
      face(ctx, [[T1, T0, TZ - 0.22], [T1, T1, TZ - 0.22], [T1, T1, TZ], [T1, T0, TZ]], C.woodLight);
      // grass
      rect(ctx, T0, T0, T1 - T0, T1 - T0, TZ, C.leaf, { dots: C.green, density: 0.25 });

      // sheep field with furrows
      rect(ctx, 4.5, 7.5, 2.5, 2.3, TZ + 0.005, tint(C.leaf, 0.35), { lw: 0.03, dots: C.leaf, density: 0.3 });
      // town square
      rect(ctx, 7.85, 5.45, 2.7, 2.9, TZ + 0.005, C.greyLight, { lw: 0.03, dots: C.grey, density: 0.25 });
      // road ring around the town
      poly(ctx, [[7.2, 4.8, TZ], [11.2, 4.8, TZ], [11.2, 9.0, TZ], [7.2, 9.0, TZ]]);
      ctx.moveTo(...P(7.65, 5.25, TZ)); ctx.lineTo(...P(7.65, 8.55, TZ)); ctx.lineTo(...P(10.75, 8.55, TZ)); ctx.lineTo(...P(10.75, 5.25, TZ)); ctx.closePath();
      ctx.fillStyle = C.grey; ctx.fill('evenodd');
      if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.stroke(); }
      if (Q.detail) {
        ctx.setLineDash([0.12, 0.12]);
        face(ctx, [[7.42, 5.02, TZ], [10.98, 5.02, TZ], [10.98, 8.78, TZ], [7.42, 8.78, TZ]], null, { lw: 0.03, stroke: C.white });
        ctx.setLineDash([]);
      }
      // lake with a sandy shore
      ctx.save();
      poly(ctx, LAKE.map(([x, y]) => [x + (x - 7.6) * 0.08, y + (y - 11.75) * 0.1, TZ]));
      paint(ctx, C.butter, { lw: 0.02 });
      poly(ctx, LAKE.map(([x, y]) => [x, y, TZ + 0.005]));
      paint(ctx, C.water, { dots: C.teal, density: 0.3, lw: 0.03 });
      ctx.restore();

      // track: ballast, sleepers, rails
      const ring = (off) => {
        const pts = [];
        for (let s = 0; s < TL; s += 0.2) {
          const p = trackPt(s);
          pts.push(P(p.x - p.dy * off, p.y + p.dx * off, TZ + 0.01));
        }
        return pts;
      };
      ctx.beginPath();
      for (const pts of [ring(0.3), ring(-0.3)]) {
        pts.forEach(([X, Y], i) => (i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y)));
        ctx.closePath();
      }
      ctx.fillStyle = C.greyLight; ctx.fill('evenodd');
      if (Q.detail) { ctx.fillStyle = dots(C.grey, 0.25); ctx.fill('evenodd'); }
      if (Q.detail) {
        ctx.beginPath();
        for (let s = 0; s < TL; s += 0.26) {
          const p = trackPt(s);
          const a = P(p.x - p.dy * 0.2, p.y + p.dx * 0.2, TZ + 0.02), b = P(p.x + p.dy * 0.2, p.y - p.dx * 0.2, TZ + 0.02);
          ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
        }
        ctx.strokeStyle = C.brown; ctx.lineWidth = 0.07; ctx.stroke();
      }
      for (const off of [0.11, -0.11]) {
        const pts = ring(off);
        ctx.beginPath();
        pts.forEach(([X, Y], i) => (i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y)));
        ctx.closePath();
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.06; ctx.stroke();
      }

      // campsite ground and fire ring
      disc(ctx, 3.9, 12.3, TZ + 0.005, 0.45, C.woodLight, { lw: 0.02 });
      // station platform
      box(ctx, 12.7, 6.0, TZ, 0.6, 3.8, 0.12, C.greyLight, { top: C.white, lw: 0.03 });
      if (Q.detail) face(ctx, [[12.75, 6.0, TZ + 0.125], [12.75, 9.8, TZ + 0.125]], null, { lw: 0.04, stroke: C.mustard });
    }, { depth: TABLE_D });

    // Lake shimmer (drawn just above the table)
    R.thing(8, 12, (ctx, t) => {
      if (!Q.detail) return;
      ctx.strokeStyle = alpha(C.white, 0.8);
      ctx.lineWidth = 0.035;
      for (let i = 0; i < 7; i++) {
        const x = 6.2 + ((i * 0.9 + t * 0.2) % 3);
        const y = 10.8 + (i % 4) * 0.4 + (i > 3 ? 1.6 : 0);
        if (y > 12.1 && y < 12.7) continue;
        ctx.beginPath();
        for (let k = 0; k <= 4; k++) {
          const [X, Y] = P(x + k * 0.1, y + Math.sin(t * 2 + k + i) * 0.04, TZ + 0.01);
          k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
        }
        ctx.stroke();
      }
    }, { depth: TABLE_D + 0.2, anim: true });

    // ---------- The mountain ----------
    R.thing(6, 6, (ctx) => {
      const facets = [];
      const rings = [...M_RINGS];
      const N = rings[0].length;
      for (let r = 0; r < rings.length - 1; r++) {
        for (let i = 0; i < N; i++) {
          const a = rings[r][i], b = rings[r][(i + 1) % N], c = rings[r + 1][(i + 1) % N], d = rings[r + 1][i];
          facets.push({ pts: [a, b, c, d], band: r });
        }
      }
      const top = rings[rings.length - 1];
      for (let i = 0; i < N; i++) facets.push({ pts: [top[i], top[(i + 1) % N], PEAK], band: 4 });
      for (const f of facets) {
        const p = f.pts;
        f.depth = p.reduce((s, q) => s + q[0] + q[1], 0) / p.length;
        const ux = p[1][0] - p[0][0], uy = p[1][1] - p[0][1], uz = p[1][2] - p[0][2];
        const q = p[p.length - 1];
        const vx = q[0] - p[0][0], vy = q[1] - p[0][1], vz = q[2] - p[0][2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const nl = Math.hypot(nx, ny, nz) || 1;
        nx /= nl; ny /= nl; nz /= nl;
        if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
        f.light = clamp(nx * -0.45 + ny * 0.55 + nz * 0.7, 0, 1);
      }
      facets.sort((a, b) => a.depth - b.depth);
      for (const f of facets) {
        const snow = f.band >= 3;
        const base = f.band <= 1 ? C.green : f.band === 2 ? mix(C.green, C.grey, 0.6) : C.greyLight;
        const col = snow ? mix(C.greyLight, C.white, f.light) : mix(shade(base, 0.3), tint(base, 0.25), f.light);
        face(ctx, f.pts, col, { lw: 0.02, stroke: shade(col, 0.12), dots: !snow && f.light < 0.45 ? shade(base, 0.5) : null, density: 0.15 });
      }
      // a few trees on the lower slopes
      for (const [x, y] of [[6.4, 5.2], [5.6, 6.3], [2.9, 6.5], [6.8, 4.1], [4.8, 6.8]]) {
        if (inPoly(x, y, M_RINGS[0])) tinyTree(ctx, x, y, TZ + 0.35, 0.8, C.green);
      }
      // tunnel mouths: stone portals with dark arches
      for (const s0 of [TUN_IN, TUN_OUT]) {
        const p = trackPt(s0);
        const nx = -p.dy, ny = p.dx;
        const W = 0.62, H = 0.8;
        const at = (u, z) => [p.x + nx * u, p.y + ny * u, TZ + z];
        face(ctx, [at(-W, 0), at(W, 0), at(W, H), at(-W, H)], C.greyLight, { lw: 0.03, dots: C.grey, density: 0.35 });
        face(ctx, [at(-W - 0.05, H), at(W + 0.05, H), at(W + 0.05, H + 0.1), at(-W - 0.05, H + 0.1)], C.grey, { lw: 0.03 });
        const arch = [at(0.3, 0)];
        for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI; arch.push(at(Math.cos(a) * 0.3, 0.38 + Math.sin(a) * 0.25)); }
        arch.push(at(-0.3, 0));
        face(ctx, arch, C.black, { lw: 0.03 });
      }
      // label painted on the mountain by a proud member
      if (Q.detail) label(ctx, 4.9, 5.4, TZ + 1.2, 'MT. PAPIER', 0.18, alpha(C.ink, 0.55), 'Rethink Sans');
    }, { depth: 9 });

    // A tiny cow, somehow up in the snow, white on white (a find)
    const COW = [4.37, 4.32, TZ + 2.55];
    R.thing(COW[0] + 0.2, COW[1] + 0.2, (ctx) => {
      // rocks poking through the snow, cow-patch sized, so the cow blends in
      for (const [dx, dy, dz, rr] of [[-0.55, 0.1, 0.12, 0.07], [0.35, -0.45, 0.05, 0.05], [-0.2, -0.6, 0.3, 0.06], [0.45, 0.2, -0.15, 0.06], [-0.75, -0.35, 0.2, 0.045]]) {
        const [X, Y] = P(COW[0] + dx, COW[1] + dy, COW[2] + dz);
        ctx.beginPath(); ctx.ellipse(X, Y - 0.05, rr * 1.3, rr, 0, 0, Math.PI * 2);
        ctx.fillStyle = C.ink; ctx.fill();
      }
      tinyCow(ctx, COW[0], COW[1], COW[2]);
    }, { depth: 9.2 });
    R.find({ id: 'cow', label: 'A tiny cow', kind: 'hard', at: [COW[0], COW[1], COW[2] + 0.18], r: 0.6, riddle: 'Moo-ving up in the world.', hint: 'Not every white patch on the mountain is snow. One has spots.' });

    // ---------- Town ----------
    const houses = [
      [7.5, 4.0, 0.6, 0.55, 0.45, C.white, C.red, true],
      [8.35, 4.05, 0.55, 0.5, 0.55, C.butter, C.navy, true],
      [9.15, 4.0, 0.7, 0.55, 0.4, C.pink, C.teal, true],
      [10.05, 4.05, 0.5, 0.5, 0.6, C.white, C.coral, true],
      [11.45, 5.7, 0.5, 0.6, 0.45, C.mint, C.red, false],
      [11.45, 6.6, 0.5, 0.55, 0.6, C.butter, C.brown, false],
      [11.45, 7.45, 0.5, 0.65, 0.4, C.white, C.navy, false],
      [7.6, 9.25, 0.6, 0.5, 0.5, C.coral, C.navy, true],
      [8.5, 9.25, 0.55, 0.55, 0.42, C.white, C.teal, true],
      [9.35, 9.25, 0.65, 0.5, 0.55, C.sky, C.red, true],
      [10.3, 9.25, 0.5, 0.5, 0.45, C.butter, C.coral, true],
    ];
    for (const h of houses) {
      const [x, y, w, d] = h;
      R.thing(x + w, y + d, (ctx) => house(ctx, ...h));
    }
    // church in the corner of the square
    R.thing(8.6, 6.1, (ctx) => {
      house(ctx, 7.95, 5.55, 0.55, 0.45, 0.5, C.white, C.navy, false);
      box(ctx, 8.1, 5.6, TZ + 0.5, 0.25, 0.25, 0.5, C.white, { lw: 0.025 });
      const [X, Y] = P(8.225, 5.725, TZ + 1.0);
      ctx.beginPath(); ctx.moveTo(X - 0.2, Y); ctx.lineTo(X, Y - 0.5); ctx.lineTo(X + 0.2, Y); ctx.closePath();
      paint(ctx, C.navy, { lw: 0.025 });
    });

    // Tiny trees all over
    const TREES = [
      [2.9, 11.0], [3.2, 11.6], [2.9, 12.3], [3.3, 13.0], [4.6, 13.1], [5.2, 13.2], [3.1, 8.7], [3.0, 9.6],
      [4.7, 10.7], [4.4, 11.2], [11.8, 3.0], [13.0, 4.6], [13.1, 5.4], [11.4, 3.1], [12.9, 11.4], [13.1, 12.6],
      [12.1, 13.1], [10.8, 11.3], [11.3, 10.9], [9.9, 10.3], [7.1, 10.2], [6.2, 7.2], [7.0, 7.1], [4.3, 7.0],
      [9.4, 5.6], [10.5, 5.6], [10.5, 8.2], [7.2, 3.0], [8.4, 3.0], [9.6, 3.1],
    ];
    TREES.forEach(([x, y], i) => R.thing(x, y, (ctx) => tinyTree(ctx, x, y, TZ, 0.65 + (i % 3) * 0.15, i % 4 ? C.green : shade(C.green, 0.2))));

    // Sheep in the field (and a scarecrow)
    R.thing(7.0, 9.8, (ctx, t) => {
      if (Q.detail) {
        // fence
        const f = [[4.5, 7.5], [7.0, 7.5], [7.0, 9.8], [4.5, 9.8], [4.5, 7.5]];
        for (let i = 0; i < 4; i++) {
          const [ax, ay] = f[i], [bx, by] = f[i + 1];
          face(ctx, [[ax, ay, TZ + 0.12], [bx, by, TZ + 0.12]], null, { lw: 0.025, stroke: C.brown });
        }
      }
      const sheep = [[5.0, 8.0], [5.7, 8.4], [6.4, 7.9], [5.3, 9.1], [6.2, 9.3], [6.6, 8.7]];
      sheep.forEach(([x, y], i) => {
        const g = Math.max(0, Math.sin(t * 1.3 + i * 1.7)) * 0.03;
        const [X, Y] = P(x, y, TZ);
        ctx.fillStyle = C.ink;
        ctx.fillRect(X - 0.08, Y - 0.1, 0.03, 0.1); ctx.fillRect(X + 0.06, Y - 0.1, 0.03, 0.1);
        ctx.beginPath(); ctx.ellipse(X, Y - 0.17, 0.15, 0.1, 0, 0, Math.PI * 2);
        paint(ctx, C.white, { lw: 0.02 });
        ctx.beginPath(); ctx.ellipse(X + (i % 2 ? -0.15 : 0.15), Y - 0.15 + g, 0.055, 0.045, 0, 0, Math.PI * 2);
        ctx.fillStyle = C.ink; ctx.fill();
      });
      // scarecrow
      const [X, Y] = P(5.9, 8.6, TZ);
      ctx.strokeStyle = C.brown; ctx.lineWidth = 0.035;
      ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X, Y - 0.55); ctx.moveTo(X - 0.18, Y - 0.4); ctx.lineTo(X + 0.18, Y - 0.4); ctx.stroke();
      ctx.beginPath(); ctx.arc(X, Y - 0.58, 0.06, 0, Math.PI * 2); paint(ctx, C.butter, { lw: 0.02 });
    }, { anim: true });

    // Windmill with turning sails, back right corner
    R.thing(12.8, 3.6, (ctx, t) => {
      cylinder(ctx, 12.5, 3.2, TZ, 0.28, 0.9, C.white, { top: C.coral });
      const [X, Y] = P(12.5, 3.2, TZ + 0.9);
      ctx.beginPath(); ctx.moveTo(X - 0.4, Y); ctx.lineTo(X, Y - 0.4); ctx.lineTo(X + 0.4, Y); ctx.closePath();
      paint(ctx, C.coral, { lw: 0.025 });
      inY(ctx, 3.5, () => {
        const cx = 12.5, cz = TZ + 0.85;
        for (let i = 0; i < 4; i++) {
          const a = t * 1.6 + (i * Math.PI) / 2;
          ctx.save(); ctx.translate(cx, cz); ctx.rotate(a);
          ctx.beginPath(); ctx.rect(0.05, -0.06, 0.6, 0.12); paint(ctx, C.butter, { lw: 0.02 });
          ctx.restore();
        }
        ctx.beginPath(); ctx.arc(cx, cz, 0.05, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
      });
    }, { anim: true });

    // Campsite with a tent and a flickering fire, and a camper who hasn't noticed anything
    R.thing(4.4, 12.6, (ctx, t) => {
      face(ctx, [[3.1, 12.0, TZ], [3.6, 12.0, TZ + 0.4], [3.6, 12.6, TZ + 0.4], [3.1, 12.6, TZ]], C.coral, { lw: 0.025 });
      face(ctx, [[4.1, 12.0, TZ], [3.6, 12.0, TZ + 0.4], [3.6, 12.6, TZ + 0.4], [4.1, 12.6, TZ]], shade(C.coral, 0.15), { lw: 0.025 });
      face(ctx, [[3.1, 12.6, TZ], [4.1, 12.6, TZ], [3.6, 12.6, TZ + 0.4]], shade(C.coral, 0.3), { lw: 0.025 });
      face(ctx, [[3.45, 12.6, TZ], [3.75, 12.6, TZ], [3.6, 12.6, TZ + 0.3]], C.ink, { lw: 0.02 });
      const [X, Y] = P(4.1, 12.9, TZ);
      const f = 0.8 + Math.sin(t * 13) * 0.15 + Math.sin(t * 7.3) * 0.1;
      ctx.beginPath(); ctx.arc(X, Y - 0.08, 0.25, 0, Math.PI * 2); ctx.fillStyle = alpha(C.mustard, 0.3); ctx.fill();
      ctx.beginPath(); ctx.moveTo(X - 0.08, Y); ctx.quadraticCurveTo(X, Y - 0.35 * f, X + 0.08, Y); ctx.closePath();
      ctx.fillStyle = C.coral; ctx.fill();
      ctx.beginPath(); ctx.moveTo(X - 0.04, Y); ctx.quadraticCurveTo(X, Y - 0.2 * f, X + 0.04, Y); ctx.closePath();
      ctx.fillStyle = C.butter; ctx.fill();
      tinyFolk(ctx, 4.4, 13.05, TZ - 0.14, t, folk(90, { pose: 'sit', dir: 'l', top: C.navy, arms: [1.4, 1.3] }));
    }, { anim: true });

    // Lighthouse on a little island (a find), beam sweeping
    const LH = [6.5, 11.0];
    R.thing(LH[0] + 0.3, LH[1] + 0.3, (ctx) => {
      disc(ctx, LH[0], LH[1], TZ + 0.01, 0.35, C.greyLight, { lw: 0.025, dots: C.grey, density: 0.3 });
      for (let i = 0; i < 4; i++) cylinder(ctx, LH[0], LH[1], TZ + i * 0.16, 0.1 - i * 0.01, 0.16, i % 2 ? C.white : C.red, { top: i % 2 ? C.white : C.red });
      cylinder(ctx, LH[0], LH[1], TZ + 0.64, 0.07, 0.12, C.butter, { top: C.ink });
    });
    R.air((ctx, t) => {
      if (!Q.detail) return;
      const a = t * 1.8;
      const [X, Y] = P(LH[0], LH[1], TZ + 0.7);
      const dx = Math.cos(a), dy = Math.sin(a);
      const e1 = P(LH[0] + (dx - dy * 0.25) * 1.6, LH[1] + (dy + dx * 0.25) * 1.6, TZ + 0.7);
      const e2 = P(LH[0] + (dx + dy * 0.25) * 1.6, LH[1] + (dy - dx * 0.25) * 1.6, TZ + 0.7);
      ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(e1[0], e1[1]); ctx.lineTo(e2[0], e2[1]); ctx.closePath();
      ctx.fillStyle = alpha(C.butter, 0.45); ctx.fill();
    });
    R.find({ id: 'lighthouse', label: 'A tiny lighthouse', at: [LH[0], LH[1], TZ + 0.4], r: 0.6 });

    // Sailboat on the lake
    R.mover((t) => { const a = t * 0.25; return { x: 8.2 + Math.cos(a) * 0.9, y: 11.0 + Math.sin(a) * 0.35, a }; }, (ctx, t, p) => {
      const [X, Y] = P(p.x, p.y, TZ + 0.01);
      ctx.beginPath(); ctx.moveTo(X - 0.18, Y - 0.05); ctx.lineTo(X + 0.18, Y - 0.05); ctx.lineTo(X + 0.12, Y + 0.03); ctx.lineTo(X - 0.12, Y + 0.03); ctx.closePath();
      paint(ctx, C.brown, { lw: 0.02 });
      ctx.beginPath(); ctx.moveTo(X, Y - 0.05); ctx.lineTo(X, Y - 0.45); ctx.lineTo(X + 0.18, Y - 0.1); ctx.closePath();
      paint(ctx, C.white, { lw: 0.02 });
    });

    // Bridge trusses (back one before the train, front one after)
    const BX0 = 5.95, BX1 = 9.45;
    const truss = (ctx, y, x0, x1) => {
      face(ctx, [[x0, y, TZ + 0.55], [x1, y, TZ + 0.55]], null, { lw: 0.07, stroke: C.red });
      face(ctx, [[x0, y, TZ + 0.02], [x1, y, TZ + 0.02]], null, { lw: 0.06, stroke: C.red });
      for (let x = Math.ceil(x0 / 0.35) * 0.35; x <= x1 + 0.001; x += 0.35) {
        const up = Math.round(x / 0.35) % 2;
        face(ctx, [[x, y, TZ], [x, y, TZ + 0.55]], null, { lw: 0.04, stroke: C.red });
        face(ctx, [[x, y, up ? TZ : TZ + 0.55], [Math.min(x1, x + 0.35), y, up ? TZ + 0.55 : TZ]], null, { lw: 0.03, stroke: C.red });
      }
    };
    R.thing(BX1, 12.1, (ctx) => {
      box(ctx, BX0 - 0.2, 12.0, TZ - 0.12, 0.2, 0.8, 0.12, C.greyLight, { lw: 0.02 });
      box(ctx, BX1, 12.0, TZ - 0.12, 0.2, 0.8, 0.12, C.greyLight, { lw: 0.02 });
      truss(ctx, 12.12, BX0, BX1);
    }, { depth: BX0 + 12.1 });
    for (let x = BX0; x < BX1 - 0.01; x += 0.7) {
      const x1 = Math.min(BX1, x + 0.7);
      R.thing(x1, 12.7, (ctx) => truss(ctx, 12.68, x, x1), { depth: x1 + 12.4 + 0.45 });
    }

    // Station house, signal and waiting passengers
    R.thing(13.3, 7.2, (ctx) => {
      house(ctx, 12.8, 6.15, 0.5, 1.0, 0.55, C.butter, C.red, false);
      label(ctx, 13.3, 6.65, TZ + 1.05, 'SQUARESVILLE', 0.13, C.navy, 'Rethink Sans');
      // bench
      box(ctx, 13.05, 8.4, TZ + 0.12, 0.18, 0.6, 0.1, C.wood, { lw: 0.02 });
    });
    R.thing(12.95, 10.9, (ctx, t) => {
      const moving = tauOf(t) < MOVE - 0.3 || tauOf(t) > PERIOD - 0.8;
      box(ctx, 12.9, 10.8, TZ, 0.05, 0.05, 0.9, C.ink, { flat: true, stroke: false });
      const [X, Y] = P(12.925, 10.825, TZ + 0.9);
      ctx.beginPath(); ctx.roundRect(X - 0.07, Y - 0.2, 0.14, 0.26, 0.05); paint(ctx, C.ink, { lw: 0.02 });
      ctx.beginPath(); ctx.arc(X, Y - 0.12, 0.04, 0, Math.PI * 2); ctx.fillStyle = moving ? shade(C.red, 0.6) : C.red; ctx.fill();
      ctx.beginPath(); ctx.arc(X, Y - 0.01, 0.04, 0, Math.PI * 2); ctx.fillStyle = moving ? C.leaf : shade(C.leaf, 0.6); ctx.fill();
    }, { anim: true });
    const PASS = [[13.0, 7.45, C.coral], [13.05, 7.95, C.teal], [12.95, 8.55, C.mustard], [13.05, 9.3, C.purple]];
    PASS.forEach(([x, y, c], i) => {
      R.mover((t) => {
        const tau = tauOf(t);
        let a = 1, xx = x;
        if (tau < 1.5 + i * 0.4) a = clamp((tau - 0.8 - i * 0.4) / 0.6);
        if (tau > MOVE + 0.4 + i * 0.25) { const q = clamp((tau - MOVE - 0.4 - i * 0.25) / 1.2); xx = x - q * 0.45; a = 1 - q; }
        return { x: xx, y, a };
      }, (ctx, t, p) => {
        if (p.a <= 0.02 || !Q.detail) return;
        ctx.save(); ctx.globalAlpha = p.a;
        tinyFolk(ctx, p.x, p.y, TZ + 0.12, t, folk(100 + i, { pose: p.x < x - 0.01 ? 'walk' : 'stand', dir: 'l', top: c, hat: i === 1 ? 'cap' : undefined }));
        ctx.restore();
      });
    });

    // ---------- The train ----------
    const carSpan = (t, c) => {
      const sf = locoS(t) - c.off;
      return visibleSpan(sf, c.len);
    };
    CARS.forEach((c) => {
      R.mover((t) => {
        const sp = carSpan(t, c);
        if (!sp) return { x: -99, y: -99, hide: true };
        const a = trackPt(sp[0]), b = trackPt(sp[1]);
        return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, a, b, sp };
      }, (ctx, t, p) => {
        if (p.hide) return;
        const { a, b } = p;
        obox(ctx, a, b, 0.4, TZ + 0.03, 0.1, C.ink, { lw: 0.02 });
        if (c.kind === 'loco') {
          // cab at the back, boiler and chimney at the front
          const f = (k) => { const q = trackPt(p.sp[1] - k); return { x: q.x, y: q.y }; };
          const full = p.sp[1] - p.sp[0] > c.len - 0.05;
          const parts = [];
          const cabBack = { x: a.x, y: a.y };
          const splitK = Math.min(0.38, p.sp[1] - p.sp[0]);
          const mid = f(splitK);
          parts.push({ d: (b.x + b.y + mid.x + mid.y) / 2, draw: () => obox(ctx, mid, b, 0.34, TZ + 0.13, 0.3, C.red, { lw: 0.025, top: tint(C.red, 0.15) }) });
          if (p.sp[1] - p.sp[0] > splitK + 0.02) parts.push({ d: (cabBack.x + cabBack.y + mid.x + mid.y) / 2, draw: () => obox(ctx, cabBack, mid, 0.42, TZ + 0.13, 0.5, C.navy, { lw: 0.025, top: C.ink, windows: 1 }) });
          if (full) {
            const ch0 = f(0.12), ch1 = f(0.2);
            parts.push({ d: ch0.x + ch0.y + 0.01, draw: () => obox(ctx, ch1, ch0, 0.1, TZ + 0.43, 0.2, C.ink, { lw: 0.02 }) });
            const fr = f(0.02);
            parts.push({ d: fr.x + fr.y + 0.02, draw: () => { const [X, Y] = P(fr.x, fr.y, TZ + 0.3); ctx.beginPath(); ctx.arc(X, Y, 0.06, 0, Math.PI * 2); ctx.fillStyle = C.butter; ctx.fill(); } });
          }
          parts.sort((u, v) => u.d - v.d).forEach((q) => q.draw());
        } else {
          obox(ctx, a, b, 0.42, TZ + 0.13, c.kind === 'van' ? 0.36 : 0.4, c.color, { lw: 0.025, top: c.kind === 'van' ? shade(c.color, 0.1) : C.greyLight, windows: c.kind === 'van' ? 0 : 3 });
        }
      }, { bias: 0.05 });
    });

    // Steam puffs from the chimney
    R.air((ctx, t) => {
      if (!Q.detail) return;
      particles(t, 14, 2.2, (k, r) => {
        const tb = t - k * 2.2;
        const tau = tauOf(tb);
        if (tau > MOVE + 0.3 && tau < PERIOD - 0.6 && r() < 0.7) return;
        const p = trackPt(locoS(tb) - 0.16);
        const [X, Y] = P(p.x + (r() - 0.5) * 0.3 * k, p.y + (r() - 0.5) * 0.3 * k, TZ + 0.75 + k * 1.8);
        ctx.beginPath();
        ctx.arc(X, Y, 0.08 + k * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = alpha(C.white, 0.85 * (1 - k));
        ctx.fill();
        ctx.strokeStyle = alpha(C.grey, 0.6 * (1 - k));
        ctx.lineWidth = 0.025;
        ctx.stroke();
      }, 5);
    });

    // ---------- The monster, and the town running for its life ----------
    // A plastic goose, life size, so a monster to the town, on a little
    // turntable that swings it round to face each side of the square (a decoy).
    const GC = [9.2, 6.95];
    R.thing(GC[0], GC[1], (ctx, t) => {
      disc(ctx, GC[0], GC[1], TZ, 0.5, C.grey, { lw: 0.025 });
      cylinder(ctx, GC[0], GC[1], TZ, 0.42, 0.08, C.greyLight, { top: C.white });
      if (Q.detail) label(ctx, GC[0] + 0.3, GC[1] + 0.3, TZ + 0.04, 'GOOSEZILLA', 0.09, C.ink, 'Rethink Sans');
      const turn = pulse(t, 6);
      const dir = turn < 0.5 ? 'l' : 'r';
      goose(ctx, GC[0], GC[1], TZ + 0.08, 0, { dir, pose: 'honk' });
      // a moulding seam down its middle, and the shine of plastic
      if (Q.detail) {
        const [X, Y] = P(GC[0], GC[1], TZ + 0.08);
        const f = dir === 'l' ? -1 : 1;
        ctx.beginPath(); ctx.ellipse(X - 0.08 * f, Y - 0.56, 0.12, 0.05, -0.12 * f, Math.PI * 1.1, Math.PI * 1.7);
        ctx.strokeStyle = C.white; ctx.lineWidth = 0.04; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(X - 0.4 * f, Y - 0.46); ctx.lineTo(X + 0.36 * f, Y - 0.5);
        ctx.strokeStyle = alpha(C.grey, 0.7); ctx.lineWidth = 0.015; ctx.stroke();
      }
    }, { anim: true });
    R.decoy({ id: 'monster', at: [GC[0], GC[1], TZ + 0.6], r: 0.9, say: ['Plastic. 1:87 scale.', 'Still plastic.', 'The town is terrified anyway.'] });
    // Fleeing townsfolk, arms up
    for (let i = 0; i < 8; i++) {
      const o = orbit(GC[0], GC[1], 1.05 + (i % 3) * 0.12, 1.0 + (i % 2) * 0.12, 6 + (i % 3), i * 0.9, i % 2 === 0);
      R.mover(o, (ctx, t, p) => {
        if (!Q.detail) return;
        tinyFolk(ctx, p.x, p.y, TZ, t, folk(110 + i, { pose: 'run', dir: p.dir, back: p.back, speed: 16, arms: [Math.PI - 0.3 + Math.sin(t * 20 + i) * 0.2, -Math.PI + 0.3] }));
      });
    }
    R.air((ctx, t) => {
      if (!Q.detail) return;
      const words = ['AAAH!', 'HELP!', 'RUN!', 'EEK!'];
      for (let i = 0; i < 4; i += 1) {
        const k = pulse(t, 5.2, i * 1.3);
        if (k > 0.3) continue;
        if (k > 0.6) continue;
        const o = orbit(GC[0], GC[1], 1.05 + ((i * 2) % 3) * 0.12, 1.0 + ((i * 2) % 2) * 0.12, 6 + ((i * 2) % 3), i * 2 * 0.9, true)(t);
        speech(ctx, o.x, o.y, TZ + 0.6, words[i], { size: 0.2 });
      }
    });
    // Tiny cars fleeing around the ring road, and a fire engine with its light going
    const roadPts = [[7.42, 5.02], [10.98, 5.02], [10.98, 8.78], [7.42, 8.78]];
    [[0, C.red], [0.33, C.sky], [0.66, C.mustard]].forEach(([off, col], i) => {
      const rt = route(roadPts, { speed: 1.6, offset: off * 14.6 });
      R.mover(rt, (ctx, t, p) => {
        const q = rt(t + 0.05);
        let dx = q.x - p.x, dy = q.y - p.y;
        const l = Math.hypot(dx, dy) || 1;
        tinyCar(ctx, p.x, p.y, dx / l, dy / l, col);
      });
    });
    R.thing(8.3, 8.85, (ctx, t) => {
      tinyCar(ctx, 8.1, 8.78, 1, 0, C.red);
      const [X, Y] = P(8.1, 8.78, TZ + 0.25);
      const on = Math.floor(t * 5) % 2;
      ctx.beginPath(); ctx.arc(X, Y, on ? 0.12 : 0.05, 0, Math.PI * 2);
      ctx.fillStyle = on ? alpha(C.sky, 0.9) : C.navy; ctx.fill();
    }, { anim: true });
    // Two tiny tanks aiming at the monster, firing tiny puffs
    [[7.7, 7.9], [10.7, 6.1]].forEach(([x, y], i) => {
      R.thing(x + 0.2, y + 0.2, (ctx, t) => {
        let dx = GC[0] - x, dy = GC[1] - y;
        const l = Math.hypot(dx, dy) || 1;
        dx /= l; dy /= l;
        obox(ctx, { x: x - dx * 0.18, y: y - dy * 0.18 }, { x: x + dx * 0.18, y: y + dy * 0.18 }, 0.24, TZ, 0.1, C.green, { lw: 0.02 });
        obox(ctx, { x: x - dx * 0.07, y: y - dy * 0.07 }, { x: x + dx * 0.07, y: y + dy * 0.07 }, 0.14, TZ + 0.1, 0.07, shade(C.green, 0.1), { lw: 0.02 });
        const [X0, Y0] = P(x, y, TZ + 0.14), [X1, Y1] = P(x + dx * 0.36, y + dy * 0.36, TZ + 0.16);
        ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.04; ctx.stroke();
        const k = pulse(t, 3.1, i * 1.4);
        if (k < 0.25 && Q.detail) {
          const q = k / 0.25;
          const [PX, PY] = P(x + dx * (0.4 + q * 0.5), y + dy * (0.4 + q * 0.5), TZ + 0.18);
          ctx.beginPath(); ctx.arc(PX, PY, 0.04 + q * 0.08, 0, Math.PI * 2);
          ctx.fillStyle = alpha(C.white, 1 - q); ctx.fill();
          ctx.strokeStyle = alpha(C.ink, 1 - q); ctx.lineWidth = 0.015; ctx.stroke();
          label(ctx, x, y, TZ + 0.5, 'pew', 0.15, C.ink, 'Rethink Sans');
        }
      }, { anim: true });
    });
    // News helicopter circling the monster
    const heli = orbit(GC[0], GC[1], 1.6, 1.4, 9, 0);
    R.mover((t) => { const p = heli(t); return { ...p, z: TZ + 1.9 + Math.sin(t * 1.5) * 0.08 }; }, (ctx, t, p) => {
      const [X, Y] = P(p.x, p.y, p.z);
      const f = p.dir === 'l' ? -1 : 1;
      ctx.save();
      ctx.translate(X, Y);
      ctx.scale(f, 1);
      ctx.beginPath(); ctx.moveTo(-0.1, -0.02); ctx.lineTo(-0.42, -0.06); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, 0.16, 0.1, 0, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.025 });
      ctx.beginPath(); ctx.ellipse(0.07, -0.02, 0.06, 0.05, 0, 0, Math.PI * 2); ctx.fillStyle = C.sky; ctx.fill();
      const rw = Math.abs(Math.cos(t * 30)) * 0.35 + 0.05;
      ctx.beginPath(); ctx.moveTo(-rw, -0.16); ctx.lineTo(rw, -0.16); ctx.moveTo(0, -0.16); ctx.lineTo(0, -0.09);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
      ctx.restore();
      // shadow on the town
      const [SX, SY] = P(p.x, p.y, TZ);
      ctx.beginPath(); ctx.ellipse(SX, SY, 0.15, 0.07, 0, 0, Math.PI * 2); ctx.fillStyle = alpha(C.ink, 0.15); ctx.fill();
    }, { bias: 3 });

    // ---------- The cat, lying in wait by the line ----------
    const CAT = [10.2, 12.95];
    R.mover(() => ({ x: CAT[0], y: CAT[1] }), (ctx, t, p) => {
      // distance from the swat point to the nearest visible car
      const sx = 10.55, sy = 12.4;
      let best = 99;
      for (const c of CARS) {
        const sp = carSpan(t, c);
        if (!sp) continue;
        for (const s of [sp[0], (sp[0] + sp[1]) / 2, sp[1]]) {
          const q = trackPt(s);
          best = Math.min(best, Math.hypot(q.x - sx, q.y - sy));
        }
      }
      const ahead = wrap(15.55 - locoS(t));
      const stalking = ahead < 6 && best > 0.6;
      const swat = best < 0.6;
      const [X, Y] = P(p.x, p.y, TZ);
      ctx.save();
      ctx.translate(X, Y);
      const wig = stalking ? Math.sin(t * 22) * 0.04 : 0;
      const low = stalking || swat ? 0.1 : 0;
      if (Q.detail) { ctx.beginPath(); ctx.ellipse(0, 0, 0.5, 0.14, 0, 0, Math.PI * 2); ctx.fillStyle = alpha(C.ink, 0.18); ctx.fill(); }
      // tail
      const tw = Math.sin(t * (stalking ? 9 : 2.5)) * 0.25;
      ctx.beginPath();
      ctx.moveTo(-0.4 + wig, -0.3 + low);
      ctx.quadraticCurveTo(-0.75, -0.35, -0.7 + tw * 0.4, -0.85 + low + Math.abs(tw) * 0.2);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.14; ctx.lineCap = 'round'; ctx.stroke();
      ctx.strokeStyle = C.night; ctx.lineWidth = 0.08; ctx.stroke();
      // back legs + body
      ctx.beginPath();
      ctx.ellipse(-0.1 + wig, -0.33 + low, 0.42, 0.24 - low * 0.5, stalking ? 0.12 : 0, 0, Math.PI * 2);
      paint(ctx, C.night, { dots: C.navy, density: 0.3 });
      // front legs, one swatting
      ctx.fillStyle = C.white;
      ctx.beginPath(); ctx.roundRect(0.1, -0.2, 0.1, 0.2, 0.04); ctx.fill();
      if (swat) {
        const sw = Math.sin(t * 28) * 0.15;
        ctx.beginPath(); ctx.moveTo(0.2, -0.3); ctx.lineTo(0.8, -0.45 + sw);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.12; ctx.stroke();
        ctx.strokeStyle = C.night; ctx.lineWidth = 0.07; ctx.stroke();
        ctx.beginPath(); ctx.arc(0.82, -0.45 + sw, 0.06, 0, Math.PI * 2); ctx.fillStyle = C.white; ctx.fill();
      } else {
        ctx.beginPath(); ctx.roundRect(0.24, -0.2, 0.1, 0.2, 0.04); ctx.fill();
      }
      // head
      const hy = -0.52 + low * 1.2;
      ctx.beginPath();
      ctx.arc(0.3, hy, 0.19, 0, Math.PI * 2);
      ctx.moveTo(0.16, hy - 0.08); ctx.lineTo(0.18, hy - 0.3); ctx.lineTo(0.28, hy - 0.17);
      ctx.moveTo(0.34, hy - 0.17); ctx.lineTo(0.44, hy - 0.28); ctx.lineTo(0.47, hy - 0.06);
      paint(ctx, C.night);
      ctx.fillStyle = C.butter;
      const eh = stalking || swat ? 0.05 : 0.02;
      ctx.beginPath(); ctx.ellipse(0.3, hy - 0.02, 0.035, eh, 0, 0, Math.PI * 2); ctx.ellipse(0.42, hy - 0.02, 0.035, eh, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }, { bias: 0.3 });

    // ---------- Front aisles: the giants ----------
    // Conductor with the controller, shouting at the right moments
    R.mover(() => ({ x: 14.5, y: 8.4 }), (ctx, t, p) => {
      const tau = tauOf(t);
      const call = tau > PERIOD - 1.8;
      person(ctx, p.x, p.y, 0, folk(120, { pose: 'stand', dir: 'l', style: 'short', hair: C.grey, top: C.navy, bottom: C.ink, arms: call ? [Math.PI - 0.4, 1.3] : [1.35, 1.25],
        hold(g) {
          if (call) return;
          const [hx, hy] = nearHand(1.35);
          g.beginPath(); g.roundRect(hx - 0.25, hy - 0.08, 0.42, 0.26, 0.05); paint(g, C.mustard, { lw: 0.03 });
          g.save(); g.translate(hx - 0.05, hy + 0.05); g.rotate(trainDist(t) * 0.3);
          g.beginPath(); g.arc(0, 0, 0.07, 0, Math.PI * 2); paint(g, C.ink, { lw: 0.02 });
          g.fillStyle = C.white; g.fillRect(-0.01, -0.07, 0.02, 0.05);
          g.restore();
          g.beginPath(); g.arc(hx + 0.1, hy, 0.025, 0, Math.PI * 2); g.fillStyle = tau < MOVE ? C.leaf : C.red; g.fill();
        } }), t);
      // conductor's cap
      const [X, Y] = P(p.x, p.y, 0);
      ctx.save(); ctx.translate(X, Y); ctx.scale(-1, 1);
      ctx.beginPath(); ctx.roundRect(-0.3, -2.4, 0.64, 0.24, 0.06); paint(ctx, C.navy, { lw: 0.04 });
      ctx.beginPath(); ctx.moveTo(0.1, -2.17); ctx.lineTo(0.5, -2.12); ctx.lineTo(0.3, -2.2); ctx.closePath(); paint(ctx, C.ink, { lw: 0.03 });
      ctx.beginPath(); ctx.arc(0.05, -2.3, 0.05, 0, Math.PI * 2); ctx.fillStyle = C.mustard; ctx.fill();
      ctx.restore();
    });

    // Kid on tiptoe at the edge
    R.mover(() => ({ x: 14.25, y: 11.3 }), (ctx, t, p) => {
      const up = Math.max(0, Math.sin(t * 2.2)) * 0.15;
      person(ctx, p.x, p.y, up, folk(121, { pose: 'stand', dir: 'l', scale: 0.66, top: C.mustard, style: 'pony', arms: [1.5, 1.4] }), t);
    });
    // Kid on a step stool shouting train noises
    R.mover(() => ({ x: 9.6, y: 14.4 }), (ctx, t, p) => {
      box(ctx, p.x - 0.35, p.y - 0.35, 0, 0.7, 0.7, 0.5, C.coral);
      person(ctx, p.x, p.y, 0.5, folk(122, { pose: pulse(t, 4) < 0.5 ? 'cheer' : 'point', dir: 'r', back: false, scale: 0.7, top: C.teal, hat: 'cap' }), t);
    });
    // Photographer crouched at track level, flash going off
    R.mover(() => ({ x: 5.0, y: 14.3 }), (ctx, t, p) => {
      person(ctx, p.x, p.y, -0.25, folk(123, { pose: 'sit', dir: 'r', style: 'bun', top: C.purple, arms: [1.5, 1.5],
        hold(g) {
          const [hx, hy] = nearHand(1.5);
          g.beginPath(); g.roundRect(hx - 0.1, hy - 0.16, 0.36, 0.24, 0.04); paint(g, C.ink, { lw: 0.02 });
          g.beginPath(); g.arc(hx + 0.26, hy - 0.04, 0.08, 0, Math.PI * 2); paint(g, C.grey, { lw: 0.02 });
        } }), t);
    });
    R.air((ctx, t) => {
      const k = pulse(t, 5.5, 1);
      if (k > 0.06 || !Q.detail) return;
      const [X, Y] = P(5.4, 14.0, 1.45);
      ctx.beginPath(); ctx.arc(X, Y, 0.3 + k * 8, 0, Math.PI * 2);
      ctx.fillStyle = alpha(C.white, 0.9 - k * 10); ctx.fill();
    });

    // ---------- The real goose: asleep under the layout ----------
    // A stretch of the table's skirt breathes, and a z drifts out from under
    // it now and then. A tap rolls the skirt up: the goose is napping among
    // the club's boxes, and wakes to honk back whenever the 8:15 toots.
    const SK0 = 6.2, SK1 = 7.8, SKM = (SK0 + SK1) / 2, HT = TZ - 0.2;
    const skirt = R.poke({ id: 'skirt', at: [SKM, T1, 0.5], r: 1.0 });
    const hole = [[SK0, T1, 0], [SK1, T1, 0], [SK1, T1, HT], [SK0, T1, HT]];
    // Behind the skirt: the dark under the table and the club's boxes.
    R.thing(SKM, T1, (ctx) => {
      if (skirt.k() < 0.01) return;
      face(ctx, hole, shade(C.brown, 0.55), { lw: 0.03 });
      ctx.save();
      poly(ctx, hole);
      ctx.clip();
      box(ctx, SK0 + 0.05, 12.5, 0, 0.55, 0.7, 0.6, C.woodLight, { lw: 0.025 });
      box(ctx, SK1 - 0.5, 12.6, 0, 0.45, 0.6, 0.45, C.wood, { lw: 0.025 });
      box(ctx, SK1 - 0.45, 12.65, 0.45, 0.4, 0.5, 0.3, C.woodLight, { lw: 0.025 });
      if (Q.detail) {
        label(ctx, SK0 + 0.32, 13.2, 0.32, 'TREES', 0.1, C.ink, 'Rethink Sans');
        label(ctx, SK1 - 0.27, 13.2, 0.22, 'TRACK', 0.1, C.ink, 'Rethink Sans');
      }
      ctx.restore();
    }, { anim: true, depth: TABLE_D + 0.3 });
    const toot = (t) => tauOf(t) < 1.4;
    R.goose((t) => {
      const k = skirt.k();
      return { x: SKM, y: T1 - 0.1, z: 0, dir: 'l', pose: toot(t) ? 'honk' : 'sit', hidden: k < 0.5 };
    }, { scale: 0.85, kind: 'poke', inside: skirt, hint: 'Someone under the layout is snoring, and it is not the man fixing the wiring.' });
    // The skirt itself: breathing while it's down, rolled up once it's lifted.
    R.thing(SKM, T1 + 0.3, (ctx, t) => {
      const k = skirt.k();
      const hb = 0.05 + k * (HT - 0.13);
      const b = k > 0.01 ? 0 : 0.12 + Math.sin(t * 1.5) * 0.08;
      face(ctx, [[SK0, T1, hb], [SKM, T1 + b, hb], [SK1, T1, hb], [SK1, T1, HT], [SKM, T1 + b * 0.3, HT], [SK0, T1, HT]], C.navy, { lw: 0.025, dots: C.ink, density: 0.25 });
      if (Q.detail) {
        for (let u = SK0 + 0.4; u < SK1 - 0.01; u += 0.4) {
          const bb = b * (1 - Math.abs(u - SKM) / (SKM - SK0));
          face(ctx, [[u, T1 + bb, hb], [u, T1 + bb * 0.3, HT]], null, { lw: 0.025, stroke: C.ink });
        }
      }
      if (k > 0.01) {
        // the rolled hem
        face(ctx, [[SK0, T1 + 0.02, hb], [SK1, T1 + 0.02, hb]], null, { lw: 0.13, stroke: C.ink });
        face(ctx, [[SK0, T1 + 0.02, hb], [SK1, T1 + 0.02, hb]], null, { lw: 0.08, stroke: tint(C.navy, 0.2) });
      }
    }, { anim: true });
    // Snoring: a z from under the skirt, then from the goose once it's found.
    R.air((ctx, t) => {
      if (!Q.detail || toot(t)) return;
      const open = skirt.k() > 0.5;
      const q = (t * 0.45) % 1;
      if (!open && q > 0.6) return;
      const z0 = open ? 0.9 : 0.15;
      label(ctx, SKM - 0.2 + q * 0.2, T1 + (open ? 0 : 0.35) + q * 0.3, z0 + q * 0.7, 'z', 0.28 + q * 0.14, alpha(C.ink, 1 - q));
    });
    R.air((ctx, t) => {
      if (!Q.detail || !toot(t) || skirt.k() < 0.5) return;
      label(ctx, SKM - 0.3, T1 - 0.1, 1.5 + tauOf(t) * 0.3, 'HONK!', 0.3, C.coral);
    });

    // A few things that answer back: the 8:15, the man under the table, and
    // the conductor's controller (the one a first visit is nudged to).
    R.poke({ id: 'train', at: (t) => { const p = trackPt(locoS(t)); return [p.x, p.y, TZ + 0.35]; }, r: 0.8, say: ['TOOT TOOT!', 'ON TIME. ALWAYS.', 'TOOT.'] });
    R.poke({ id: 'legs', at: [11.4, 14.1, 0.25], r: 0.8, sound: 'clunk', say: ['OW!', 'Busy. Wiring.', 'Has anyone seen my screwdriver?'] });
    R.poke({ id: 'controller', at: [14.4, 8.3, 1.4], r: 1.1, sound: 'tick', teach: true, say: ['Hands off the controller.', 'Eleven years. Nobody touches it.', 'Fine. Watch the 8:15.'] });

    // A member under the table, only his legs sticking out, fixing the wiring
    R.thing(11.4, 14.6, (ctx, t) => {
      const kick = Math.sin(t * 3) * 0.12;
      const [X, Y] = P(11.0, 13.4, 0.05);
      // lifted skirt corner
      face(ctx, [[10.6, 13.42, 0.05], [11.45, 13.42, 0.05], [11.45, 13.42, 0.5], [10.6, 13.42, 0.5]], C.ink);
      for (const [dx, k] of [[-0.15, kick], [0.15, -kick]]) {
        const [fx, fy] = P(11.0 + dx + 0.6, 14.5, 0.1 + Math.max(0, k));
        ctx.beginPath(); ctx.moveTo(X + dx * 1.2, Y - 0.1); ctx.lineTo(fx, fy);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.26; ctx.lineCap = 'round'; ctx.stroke();
        ctx.strokeStyle = C.navy; ctx.lineWidth = 0.18; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(fx, fy - 0.1, 0.1, 0.16, 0, 0, Math.PI * 2); ctx.fillStyle = C.brown; ctx.fill();
      }
      // toolbox
      box(ctx, 12.2, 14.1, 0, 0.8, 0.45, 0.4, C.red);
      face(ctx, [[12.4, 14.33, 0.4], [12.4, 14.33, 0.55], [12.8, 14.33, 0.55], [12.8, 14.33, 0.4]], null, { lw: 0.05 });
    }, { anim: true });
    R.air((ctx, t) => {
      if (!Q.detail) return;
      const k = pulse(t, 7, 2);
      if (k > 0.2) return;
      particles(t, 8, 0.4, (q, r) => {
        const [X, Y] = P(11.0, 13.5, 0.4);
        const a = -Math.PI * r();
        ctx.fillStyle = r() < 0.5 ? C.mustard : C.butter;
        ctx.fillRect(X + Math.cos(a) * q * 0.8, Y + Math.sin(a) * q * 0.8, 0.06, 0.06);
      }, 9);
      label(ctx, 11.3, 13.8, 1.2, 'OW!', 0.3, C.coral);
    });

    // Member carrying a brand new locomotive box up and down the aisles
    const walker = route([[15.2, 2.8], [15.2, 15.1, 1], [2.8, 15.2, 2]], { speed: 0.8, loop: false });
    R.mover(walker, (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, folk(124, { pose: p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back, style: 'short', hair: C.brown, top: C.red, arms: [1.25, 1.25], speed: 6,
        hold(g) {
          g.beginPath(); g.rect(-0.25, -0.45, 0.9, 0.45); paint(g, C.mustard, { lw: 0.03 });
          g.beginPath(); g.rect(-0.15, -0.35, 0.7, 0.25); g.fillStyle = C.red; g.fill();
        } }), t);
    });

    // Old member asleep in an armchair in the front corner
    R.thing(2.3, 15.6, (ctx) => {
      box(ctx, 0.4, 13.9, 0, 1.6, 1.5, 0.7, C.green);
      box(ctx, 0.4, 13.9, 0.7, 0.4, 1.5, 1.1, C.green);
      box(ctx, 0.4, 13.7, 0, 1.6, 0.3, 1.0, shade(C.green, 0.1));
      box(ctx, 0.4, 15.4, 0, 1.6, 0.3, 1.0, shade(C.green, 0.1));
    });
    R.mover(() => ({ x: 1.3, y: 14.7 }), (ctx, t, p) => {
      person(ctx, p.x, p.y, 0.05, folk(125, { pose: 'sit', dir: 'r', style: 'bald', top: C.white, arms: [0.8, 0.7],
        hold(g) { g.beginPath(); g.rect(0.0, -0.1, 0.4, 0.3); paint(g, C.sky, { lw: 0.02 }); } }), t);
      if (Q.detail) {
        const k = (t * 0.6) % 1;
        label(ctx, p.x - 0.4 * k, p.y - 0.4 * k, 2.6 + k * 1.2, 'z', 0.4 + k * 0.3, alpha(C.ink, 1 - k));
      }
    }, { depth: 18.05 });

    // The club's ticket machine, in the back corner, has eaten a ticket: its
    // corner shows in the slot. A thump and it drops into the tray (a find).
    const TM = { x0: 14.0, y0: 0.25, w: 0.9, d: 0.7, h: 1.75 };
    const TMY = TM.y0 + TM.d, TMU = TM.x0 + TM.w / 2;
    R.thing(TM.x0 + TM.w, TMY, (ctx) => {
      box(ctx, TM.x0, TM.y0, 0, TM.w, TM.d, TM.h, C.red, { top: shade(C.red, 0.1) });
      // the sign on top
      box(ctx, TM.x0 + 0.05, TM.y0 + 0.3, TM.h, TM.w - 0.1, 0.12, 0.34, C.navy, { lw: 0.025 });
      label(ctx, TMU, TM.y0 + 0.42, TM.h + 0.17, 'TICKETS', 0.15, C.butter);
      inY(ctx, TMY + 0.005, () => {
        // a little screen, the coin slot, the ticket slot and the tray
        ctx.beginPath(); ctx.rect(TM.x0 + 0.15, 1.2, 0.6, 0.32); paint(ctx, C.ink, { lw: 0.03 });
        ctx.fillStyle = C.leaf; ctx.fillRect(TM.x0 + 0.22, 1.36, 0.3, 0.06);
        ctx.beginPath(); ctx.rect(TM.x0 + 0.65, 1.0, 0.06, 0.14); paint(ctx, C.greyLight, { lw: 0.02 });
        ctx.beginPath(); ctx.rect(TM.x0 + 0.22, 0.86, 0.46, 0.06); paint(ctx, C.black, { lw: 0.02 });
        ctx.beginPath(); ctx.rect(TM.x0 + 0.15, 0.22, 0.6, 0.3); paint(ctx, C.black, { lw: 0.03, dots: C.ink, density: 0.3 });
      });
    });
    const machine = R.poke({ id: 'machine', at: [TMU, TMY, 1.0], r: 1.0, sound: 'clunk' });
    R.thing(TM.x0 + TM.w + 0.01, TMY + 0.01, (ctx) => {
      const k = machine.k();
      inY(ctx, TMY + 0.01, () => {
        if (k < 0.02) {
          // just the corner, stuck in the slot
          ctx.beginPath(); ctx.rect(TMU - 0.12, 0.78, 0.24, 0.1); paint(ctx, C.butter, { lw: 0.02 });
          return;
        }
        // the whole ticket, dropping into the tray
        const v = 0.78 - k * 0.48;
        ctx.save(); ctx.translate(TMU, v); ctx.rotate(0.15 * k);
        ctx.beginPath(); ctx.rect(-0.2, 0, 0.4, 0.22); paint(ctx, C.butter, { lw: 0.025 });
        ctx.fillStyle = C.coral; ctx.fillRect(-0.15, 0.13, 0.2, 0.04);
        ctx.fillStyle = C.navy; ctx.fillRect(-0.15, 0.05, 0.14, 0.04);
        ctx.restore();
      });
    }, { anim: true });
    R.find({ id: 'ticket', label: 'A lost train ticket', kind: 'poke', inside: machine, at: [TMU, TMY, 0.42], r: 0.6, hint: 'The club ticket machine has been chewing on one for ages. Give it a thump.' });

    // A toddler on a ride-on train doing laps of the aisles
    const toddler = route([[3.2, 15.3], [15.3, 15.3, 0.6], [15.3, 3.4, 1.5]], { speed: 1.3, loop: false, offset: 6 });
    R.mover(toddler, (ctx, t, p) => {
      const q = toddler(t + 0.05);
      let dx = q.x - p.x, dy = q.y - p.y;
      const l = Math.hypot(dx, dy);
      if (l < 1e-4) { dx = p.dir === 'l' ? -1 : 1; dy = 0; } else { dx /= l; dy /= l; }
      const a = { x: p.x - dx * 0.55, y: p.y - dy * 0.55 }, b = { x: p.x + dx * 0.55, y: p.y + dy * 0.55 };
      for (const k of [-0.35, 0.35]) {
        const w = { x: p.x + dx * k, y: p.y + dy * k };
        cylinder(ctx, w.x, w.y, 0, 0.14, 0.1, C.ink, { flat: true });
      }
      obox(ctx, a, b, 0.55, 0.12, 0.35, C.red, { top: C.coral });
      const f = { x: p.x + dx * 0.35, y: p.y + dy * 0.35 };
      cylinder(ctx, f.x, f.y, 0.47, 0.08, 0.35, C.ink, { top: C.black });
      person(ctx, p.x - dx * 0.1, p.y - dy * 0.1, 0.05, folk(126, { pose: 'sit', dir: p.dir, back: p.back, scale: 0.6, top: C.butter, hat: 'party', arms: [1.3, 1.2] }), t);
    });
    R.air((ctx, t) => {
      if (!Q.detail) return;
      const p = toddler(t);
      if (!p.moving) return;
      particles(t, 5, 1.2, (k, r) => {
        const tb = t - k * 1.2;
        const q = toddler(tb);
        const [X, Y] = P(q.x, q.y, 1.0 + k * 1.2);
        ctx.beginPath(); ctx.arc(X + (r() - 0.5) * 0.3, Y, 0.06 + k * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = alpha(C.white, 0.8 * (1 - k)); ctx.fill();
      }, 8);
    });

    // ---------- Words in the air ----------
    R.air((ctx, t) => {
      if (!Q.detail) return;
      const tau = tauOf(t);
      if (tau > PERIOD - 1.8) speech(ctx, 14.3, 8.2, 3.0, 'ALL ABOARD!', { size: 0.42 });
      if (tau < 1.2) {
        const p = trackPt(locoS(t));
        label(ctx, p.x, p.y, TZ + 1.4 + tau * 0.4, 'TOOT TOOT', 0.24, alpha(C.coral, 1 - tau / 1.2));
      }
      if (pulse(t, 4) < 0.5) speech(ctx, 9.5, 14.4, 2.75, 'CHOO CHOO!', { size: 0.3, dx: -0.9 });
    });
  },
};

