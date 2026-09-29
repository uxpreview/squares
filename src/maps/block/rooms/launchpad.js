// Launch Pad: a rocket that really goes. The crew walk out, ride the gantry
// lift and climb aboard, the board counts 3-2-1, the smoke rolls, and up it
// goes. Then it floats home under a parachute and the crew slide out.
import {
  C, box, rect, disc, cylinder, face, poly, paint, person, folk, slab, tiles, onLeft,
  paintText, label, speech, shade, tint, mix, alpha, dots, Q, P, hash,
} from '../../../engine/art.js';
import { route, pulse, clamp, ease } from '../../../engine/actors.js';
import { ZK } from '../../../engine/iso.js';

const T = 30; // one full mission
const RX = 6.2, RY = 6.2; // rocket spot
const PADZ = 0.45;
const BODY_R = 0.72, BODY_H = 4.6, NOSE_H = 1.7;
const GX0 = 2.6, GX1 = 4.0, GY0 = 5.5, GY1 = 6.9, GH = 8.8; // gantry footprint
const ARM_Z = 5.2;
const DOOR = [3.7, 13.7]; // crew hut door

const phase = (t) => pulse(t, T) * T;

// Rocket altitude over the mission.
function rocketState(t, s = phase(t)) {
  if (s < 11) return { alt: 0, fire: s > 10.2 ? (s - 10.2) / 0.8 : 0, sway: 0 };
  if (s < 15.5) { const k = (s - 11) / 4.5; return { alt: 46 * k * k, fire: 1, sway: 0 }; }
  if (s < 17) return { alt: 60, fire: 0, sway: 0, gone: true };
  if (s < 23) {
    const q = (s - 17) / 6;
    const alt = 15 * (1 - q) * (1 - q);
    return { alt: Math.max(0, alt), chute: 1, sway: Math.sin(s * 1.6) * 0.25 * (1 - q), retro: q > 0.86 ? 1 : 0 };
  }
  return { alt: 0, chute: clamp(1 - (s - 23) / 1.4), landed: true, sway: 0 };
}

const cylP = (cx, cy, a, r, z) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r, z];
function band(ctx, cx, cy, r, z1, z2, fill, a1 = -Math.PI / 4, a2 = (3 * Math.PI) / 4) {
  const pts = [];
  const n = 10;
  for (let i = 0; i <= n; i++) pts.push(cylP(cx, cy, a1 + ((a2 - a1) * i) / n, r + 0.005, z1));
  for (let i = n; i >= 0; i--) pts.push(cylP(cx, cy, a1 + ((a2 - a1) * i) / n, r + 0.005, z2));
  face(ctx, pts, fill, { lw: 0.03 });
}

function fin(ctx, x, y, z, a, color) {
  const p = (r, zz) => cylP(x, y, a, r, zz);
  face(ctx, [p(BODY_R * 0.9, z + 1.9), p(BODY_R * 0.9, z + 0.2), p(1.65, z - 0.35), p(1.65, z + 0.55)], color, { dots: shade(color, 0.4), density: 0.2 });
}

function drawRocket(ctx, x, y, z, t, st) {
  // flame
  if (st.fire || st.retro) {
    const [X, Y] = P(x, y, z - 0.3);
    const L = (st.fire ? 1.2 + st.fire * 2.2 : 1.1) + Math.sin(t * 40) * 0.25 + Math.sin(t * 23) * 0.2;
    const cols = [C.coral, C.mustard, C.butter];
    cols.forEach((c, i) => {
      const w = 0.55 - i * 0.15, l = L * (1 - i * 0.25);
      ctx.beginPath();
      ctx.moveTo(X - w, Y);
      ctx.quadraticCurveTo(X - w * 0.8, Y + l * 0.6, X, Y + l);
      ctx.quadraticCurveTo(X + w * 0.8, Y + l * 0.6, X + w, Y);
      ctx.closePath();
      ctx.fillStyle = c;
      ctx.fill();
    });
  }
  // nozzle
  const [nx, ny] = P(x, y, z);
  ctx.beginPath();
  ctx.moveTo(nx - 0.45, ny - 0.1); ctx.lineTo(nx + 0.45, ny - 0.1); ctx.lineTo(nx + 0.6, ny + 0.45); ctx.lineTo(nx - 0.6, ny + 0.45);
  ctx.closePath();
  paint(ctx, C.grey, { dots: C.ink, density: 0.2 });
  fin(ctx, x, y, z, Math.PI * 1.25, C.coral);
  cylinder(ctx, x, y, z, BODY_R, BODY_H, C.white, { top: C.white });
  fin(ctx, x, y, z, -Math.PI / 4, C.coral);
  fin(ctx, x, y, z, (3 * Math.PI) / 4, C.coral);
  band(ctx, x, y, BODY_R, z + 3.3, z + 3.6, C.coral);
  band(ctx, x, y, BODY_R, z + 0.25, z + 0.55, C.navy);
  // nose cone
  const [bx, by] = P(x, y, z + BODY_H);
  const [tx, ty] = P(x, y, z + BODY_H + NOSE_H);
  const rx = BODY_R * Math.SQRT2;
  ctx.beginPath();
  ctx.moveTo(bx - rx, by);
  ctx.quadraticCurveTo(bx - rx, by - NOSE_H * 0.7, tx, ty);
  ctx.quadraticCurveTo(bx + rx, by - NOSE_H * 0.7, bx + rx, by);
  ctx.ellipse(bx, by, rx, rx / 2, 0, 0, Math.PI);
  ctx.closePath();
  paint(ctx, C.coral, { dots: shade(C.coral, 0.45), density: 0.22 });
  // porthole, facing the viewer
  const [px, py] = P(...cylP(x, y, Math.PI / 4, BODY_R, z + 4.05));
  ctx.beginPath(); ctx.arc(px, py, 0.3, 0, Math.PI * 2); paint(ctx, C.navy, { lw: 0.06 });
  ctx.beginPath(); ctx.arc(px, py, 0.2, 0, Math.PI * 2); paint(ctx, C.sky, { lw: 0.03 });
  ctx.beginPath(); ctx.arc(px - 0.06, py - 0.06, 0.06, 0, Math.PI * 2); ctx.fillStyle = C.white; ctx.fill();
  // name, painted down the side
  label(ctx, ...cylP(x, y, Math.PI / 4, BODY_R + 0.02, z + 1.95), 'SQ', 0.42, C.navy);
  label(ctx, ...cylP(x, y, Math.PI / 4, BODY_R + 0.02, z + 1.5), '1', 0.42, C.navy);
  // hatch (open after landing)
  if (st.landed && phase(t) > 23.6) {
    const pts = [];
    for (let i = 0; i <= 4; i++) pts.push(cylP(x, y, Math.PI / 4 - 0.35 + i * 0.175, BODY_R + 0.01, z + 2.85));
    for (let i = 4; i >= 0; i--) pts.push(cylP(x, y, Math.PI / 4 - 0.35 + i * 0.175, BODY_R + 0.01, z + 3.7));
    face(ctx, pts, C.night, { lw: 0.04 });
  }
}

function drawChute(ctx, x, y, top, k, t) {
  if (k <= 0) return;
  const cz = top + 1.7 * k + 0.2;
  const [X, Y] = P(x, y, cz);
  const [nx, ny] = P(x, y, top);
  const W = 2.0 * (0.4 + 0.6 * k), H = 1.1 * k;
  const puff = 1 + Math.sin(t * 3) * 0.03;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.03;
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) {
    const ex = X - W * puff + (i / 6) * 2 * W * puff;
    ctx.moveTo(nx, ny); ctx.lineTo(ex, Y + 0.25);
  }
  ctx.stroke();
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI + (i / n) * Math.PI, a1 = Math.PI + ((i + 1) / n) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(X, Y + 0.25);
    ctx.ellipse(X, Y + 0.25, W * puff, H + 0.25, 0, a0, a1);
    ctx.closePath();
    paint(ctx, i % 2 ? C.coral : C.white, { lw: 0.04 });
  }
  // scalloped hem
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x0 = X - W * puff + (i / n) * 2 * W * puff, x1 = X - W * puff + ((i + 1) / n) * 2 * W * puff;
    ctx.moveTo(x0, Y + 0.25);
    ctx.quadraticCurveTo((x0 + x1) / 2, Y + 0.5, x1, Y + 0.25);
  }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.04; ctx.stroke();
}

function gantry(ctx, t, s = phase(t)) {
  const col = C.red;
  const posts = [[GX0, GY0], [GX1, GY0], [GX0, GY1], [GX1, GY1]];
  for (const [x, y] of posts) box(ctx, x - 0.08, y - 0.08, 0, 0.16, 0.16, GH, col, { flat: true, lw: 0.04 });
  // bracing on the two faces we can see
  if (Q.detail) {
    ctx.strokeStyle = shade(col, 0.2);
    ctx.lineWidth = 0.06;
    for (let z = 0; z < GH - 0.5; z += 1.1) {
      ctx.beginPath();
      const a = P(GX0, GY1, z), b = P(GX1, GY1, z + 1.1), c = P(GX1, GY1, z), d = P(GX0, GY1, z + 1.1);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.moveTo(c[0], c[1]); ctx.lineTo(d[0], d[1]);
      const e = P(GX1, GY0, z), f = P(GX1, GY1, z + 1.1), g = P(GX1, GY1, z), h = P(GX1, GY0, z + 1.1);
      ctx.moveTo(e[0], e[1]); ctx.lineTo(f[0], f[1]); ctx.moveTo(g[0], g[1]); ctx.lineTo(h[0], h[1]);
      ctx.stroke();
      face(ctx, [[GX0, GY1, z + 1.1], [GX1, GY1, z + 1.1], [GX1, GY0, z + 1.1]], null, { lw: 0.08, stroke: col });
    }
  }
  // top deck with a railing and a beacon
  box(ctx, GX0 - 0.3, GY0 - 0.3, GH, GX1 - GX0 + 0.6, GY1 - GY0 + 0.6, 0.15, C.greyLight);
  face(ctx, [[GX0 - 0.3, GY1 + 0.3, GH + 0.8], [GX1 + 0.3, GY1 + 0.3, GH + 0.8], [GX1 + 0.3, GY0 - 0.3, GH + 0.8]], null, { lw: 0.06 });
  for (const [x, y] of [[GX0 - 0.3, GY1 + 0.3], [GX1 + 0.3, GY1 + 0.3], [GX1 + 0.3, GY0 - 0.3]]) face(ctx, [[x, y, GH + 0.15], [x, y, GH + 0.8]], null, { lw: 0.06 });
  // swing arm
  const swing = s < 8 || s > 26 ? 0 : s < 9.5 ? (s - 8) / 1.5 : s < 24.5 ? 1 : 1 - (s - 24.5) / 1.5;
  const ang = -ease(clamp(swing)) * 1.3;
  const L = RX - BODY_R - GX1 + 0.05;
  const px = GX1, py = (GY0 + GY1) / 2;
  const ex = px + Math.cos(ang) * L, ey = py + Math.sin(ang) * L;
  const nx = -Math.sin(ang) * 0.35, ny = Math.cos(ang) * 0.35;
  face(ctx, [[px - nx, py - ny, ARM_Z - 0.2], [ex - nx, ey - ny, ARM_Z - 0.2], [ex + nx, ey + ny, ARM_Z - 0.2], [ex + nx, ey + ny, ARM_Z], [px + nx, py + ny, ARM_Z]], shade(C.greyLight, 0.25));
  face(ctx, [[px - nx, py - ny, ARM_Z], [ex - nx, ey - ny, ARM_Z], [ex + nx, ey + ny, ARM_Z], [px + nx, py + ny, ARM_Z]], C.greyLight);
  face(ctx, [[px + nx, py + ny, ARM_Z + 0.7], [ex + nx, ey + ny, ARM_Z + 0.7]], null, { lw: 0.05 });
  // blinking beacon
  const on = Math.sin(t * 5) > 0;
  const [bx, by] = P(GX1 + 0.2, GY1 + 0.2, GH + 1.0);
  ctx.beginPath(); ctx.arc(bx, by, 0.16, 0, Math.PI * 2); paint(ctx, on ? C.coral : shade(C.coral, 0.4), { lw: 0.04 });
  if (on && Q.detail) { ctx.beginPath(); ctx.arc(bx, by, 0.4, 0, Math.PI * 2); ctx.fillStyle = alpha(C.coral, 0.25); ctx.fill(); }
}

// Crew member i: out of the hut, up the lift, across the arm, into the rocket;
// later out of the hatch, down the slide and home.
function crewPos(i, t, s0 = phase(t)) {
  const s = s0 - i * 0.45;
  const lx = (GX0 + GX1) / 2 + (i ? 0.3 : -0.3), ly = GY1 + 0.45;
  if (s < 0) return { x: DOOR[0], y: DOOR[1], z: 0, a: 0 };
  if (s < 4 - i * 0.45) {
    const k = s / (4 - i * 0.45);
    return { x: DOOR[0] + (lx - DOOR[0]) * k, y: DOOR[1] + (ly - DOOR[1]) * k, z: 0, pose: 'walk', dir: 'r', back: true, a: clamp(s / 0.4) };
  }
  if (s < 6 - i * 0.45) { const q = s + i * 0.45; return { x: lx, y: ly, z: ARM_Z * ease(clamp((q - 4) / 2)), pose: i ? 'wave' : 'stand', dir: 'r', a: 1, lift: true }; }
  if (s < 7.3) {
    const k = clamp((s - 6) / 1.3);
    return { x: lx + (RX - BODY_R - lx) * k, y: ly + ((GY0 + GY1) / 2 + (i ? 0.2 : -0.2) - ly) * k, z: ARM_Z, pose: 'walk', dir: 'r', a: 1 - clamp((k - 0.7) / 0.3), lift: true };
  }
  if (s < 24.4) return { hidden: true, x: RX, y: RY };
  const top = slidePt(SL0 + 0.2, SLZ + 0.35), bot = slidePt(SL1, 0);
  if (s < 25.6) {
    const k = (s - 24.4) / 1.2;
    return { x: top[0] + (bot[0] - top[0]) * k, y: top[1] + (bot[1] - top[1]) * k, z: top[2] + (bot[2] - top[2]) * k, pose: 'sit', dir: 'r', a: clamp(k * 5), slide: true };
  }
  if (s < 26.2) return { x: bot[0], y: bot[1], z: 0, pose: 'cheer', dir: 'l', a: 1 };
  const k = clamp((s - 26.2) / 3.6);
  return { x: bot[0] + (DOOR[0] - bot[0]) * k, y: bot[1] + (DOOR[1] - bot[1]) * k, z: 0, pose: k < 1 ? 'walk' : 'stand', dir: 'l', a: 1 - clamp((k - 0.85) / 0.15) };
}

const SL0 = BODY_R + 0.05, SL1 = 3.7, SLZ = PADZ + 0.5 + 2.9;
const slidePt = (d, z, w = 0) => [RX + (d - w) * Math.SQRT1_2, RY + (d + w) * Math.SQRT1_2, z];
function slideShape(ctx, k) {
  if (k <= 0) return;
  const d1 = SL0 + (SL1 - SL0) * k, z1 = SLZ + (0.05 - SLZ) * k;
  const w = 0.45, h = 0.3;
  face(ctx, [slidePt(SL0, SLZ, w), slidePt(d1, z1, w), slidePt(d1, z1 + h, w), slidePt(SL0, SLZ + h, w)], shade(C.mustard, 0.2));
  face(ctx, [slidePt(SL0, SLZ + h, -w), slidePt(SL0, SLZ + h, w), slidePt(d1, z1 + h, w), slidePt(d1, z1 + h, -w)], C.mustard, { dots: C.coral, density: 0.15 });
  face(ctx, [slidePt(SL0, SLZ, -w), slidePt(d1, z1, -w), slidePt(d1, z1 + h, -w), slidePt(SL0, SLZ + h, -w)], shade(C.mustard, 0.1));
  face(ctx, [slidePt(SL0, SLZ + h + 0.15, w * 0.8), slidePt(d1, z1 + h + 0.15, w * 0.8)], null, { lw: 0.08, stroke: C.coral });
}

// Little dog in a bubble helmet.
function dog(ctx, x, y, z, t, dir, moving) {
  const [X, Y] = P(x, y, z);
  const f = dir === 'l' ? -1 : 1;
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(f * 0.9, 0.9);
  if (Q.detail) { ctx.beginPath(); ctx.ellipse(0, 0, 0.45, 0.15, 0, 0, Math.PI * 2); ctx.fillStyle = alpha(C.ink, 0.18); ctx.fill(); }
  const ph = t * 12;
  ctx.strokeStyle = C.brown; ctx.lineWidth = 0.1; ctx.lineCap = 'round';
  ctx.beginPath();
  for (const [lx, o] of [[-0.25, 0], [-0.12, Math.PI], [0.18, Math.PI], [0.3, 0]]) {
    const sw = moving ? Math.sin(ph + o) * 0.08 : 0;
    ctx.moveTo(lx, -0.3); ctx.lineTo(lx + sw, 0);
  }
  ctx.stroke();
  // tail
  ctx.beginPath(); ctx.moveTo(-0.35, -0.4); ctx.lineTo(-0.55, -0.62 + Math.sin(t * 14) * 0.1);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.13; ctx.stroke();
  ctx.strokeStyle = C.wood; ctx.lineWidth = 0.07; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -0.42, 0.42, 0.2, 0, 0, Math.PI * 2);
  paint(ctx, C.wood, { lw: 0.04, dots: C.brown, density: 0.2 });
  // head
  ctx.beginPath(); ctx.arc(0.42, -0.72, 0.18, 0, Math.PI * 2); paint(ctx, C.wood, { lw: 0.04 });
  ctx.beginPath(); ctx.ellipse(0.33, -0.7, 0.07, 0.14, 0.3, 0, Math.PI * 2); ctx.fillStyle = C.brown; ctx.fill();
  ctx.beginPath(); ctx.arc(0.58, -0.7, 0.04, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
  ctx.beginPath(); ctx.arc(0.47, -0.76, 0.025, 0, Math.PI * 2); ctx.fill();
  // helmet
  ctx.beginPath(); ctx.arc(0.43, -0.73, 0.3, 0, Math.PI * 2);
  ctx.fillStyle = alpha(C.sky, 0.35); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.04; ctx.stroke();
  ctx.beginPath(); ctx.arc(0.43, -0.73, 0.22, -2.4, -1.6); ctx.strokeStyle = C.white; ctx.lineWidth = 0.05; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0.43, -0.46, 0.28, 0.07, 0, 0, Math.PI * 2); paint(ctx, C.grey, { lw: 0.03 });
  ctx.restore();
}

function checkFlag(c, t, up) {
  c.save();
  c.translate(0, 0.1);
  c.beginPath(); c.moveTo(0, 0); c.lineTo(up ? 0.35 : 0.5, up ? -1.5 : -0.6);
  c.strokeStyle = C.ink; c.lineWidth = 0.05; c.stroke();
  c.translate(up ? 0.35 : 0.5, up ? -1.5 : -0.6);
  const w = Math.sin(t * 10) * 0.06;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    c.beginPath(); c.rect(i * 0.18, j * 0.18 + w * i, 0.18, 0.18);
    c.fillStyle = (i + j) % 2 ? C.white : C.ink; c.fill();
  }
  c.restore();
}

// ---------- On a day (the Block Party) ----------
// The rocket goes up once, at day.launch (8:48pm): the crew board ten seconds
// before, the board counts down from 7:30pm, liftoff, and it's gone. The pad
// smokes all night, and a new rocket is wheeled out between 3am and 4am.
// d(t): seconds since liftoff, from minus half a day to plus half a day.
// s(t): the 30 second mission's own clock, run once round the launch.
function dayClock(day) {
  const HR = 1 / ((((day.hour(1) - day.hour(0)) % 24) + 24) % 24); // seconds in an hour
  const LOOP = HR * 24;
  const d = (t) => ((((t - day.launch) % LOOP) + LOOP * 1.5) % LOOP) - LOOP / 2;
  const W0 = 6.2 * HR, W1 = 7.2 * HR; // 3am to 4am
  const wheel = (t) => { const x = d(t); return x >= W0 && x < W1 ? (x - W0) / (W1 - W0) : -1; };
  const rocketY = (w) => RY + (1 - ease(w)) * 8.6;
  return {
    d,
    back: W1,
    s: (t) => { const x = d(t); return x < -11 ? 0 : x < 11 ? 11 + x : x < 16.9 ? 24.1 + (x - 11) : 0; },
    rocket: (t) => {
      const x = d(t);
      if (x < 0) return { x: RX, y: RY, alt: 0, fire: x > -0.8 ? (x + 0.8) / 0.8 : 0, sway: 0 };
      if (x < 4.5) { const k = x / 4.5; return { x: RX, y: RY, alt: 46 * k * k, fire: 1, sway: 0 }; }
      const w = wheel(t);
      if (w >= 0) {
        // along the ground on its trolley, then up the ramp onto the plinth
        const y = rocketY(w);
        return { x: RX, y, alt: -PADZ * clamp((y - RY) / 2.2), sway: 0, wheel: true };
      }
      if (x < W1) return { x: RX, y: RY, gone: true };
      return { x: RX, y: RY, alt: 0, sway: 0 };
    },
    // The mechanic pushes the new one out.
    pusher: (t) => {
      const w = wheel(t);
      if (w < 0) return null;
      const y = rocketY(w) + 1.9;
      return { x: RX + 0.35, y, z: 0, pose: w < 0.98 ? 'carry' : 'cheer', dir: 'r', back: w < 0.98, say: w > 0.97 ? 'TA-DA' : null };
    },
    // The mission clock: the time of the launch all day, the countdown from
    // 7:30pm, and then the board is very optimistic.
    board: (t) => {
      const x = d(t);
      if (x >= -1.3 * HR && x < 0) {
        const n = Math.min(10, Math.ceil(-x / (1.3 * HR / 10)));
        return [String(n), C.mustard, n > 9 ? 1.7 : 2.1];
      }
      if (x >= 0 && x < 4.5) return ['LIFTOFF!', C.coral, 0.7];
      if (x >= 4.5 && x < 14) return ['BYE!', C.butter, 1.3];
      if (x >= 14 && x < W0) return ['BACK SOON', C.sky, 0.62];
      if (x >= W0 && x < W1) return ['NEW ONE!', C.butter, 0.72];
      return ['8:48 PM', C.mint, 0.9];
    },
  };
}

// The scorched, empty plinth, still smoking a little.
function scorch(ctx, t) {
  disc(ctx, RX, RY, PADZ + 0.01, 1.5, alpha(C.ink, 0.55), { stroke: false });
  disc(ctx, RX, RY, PADZ + 0.012, 0.8, alpha(C.night, 0.7), { stroke: false });
  if (!Q.detail) return;
  for (let i = 0; i < 5; i++) {
    const a = hash(i, 71) * Math.PI * 2, r = 0.3 + hash(i, 72) * 0.9;
    const [X, Y] = P(RX + Math.cos(a) * r, RY + Math.sin(a) * r, PADZ + 0.02);
    ctx.beginPath(); ctx.arc(X, Y, 0.06, 0, Math.PI * 2);
    ctx.fillStyle = Math.sin(t * 3 + i * 2) > 0 ? C.coral : C.mustard;
    ctx.fill();
  }
}

// The trolley the new rocket comes out on.
function dolly(ctx, x, y, z, t) {
  box(ctx, x - 1.0, y - 1.0, z + 0.2, 2.0, 2.0, 0.3, C.mustard, { top: tint(C.mustard, 0.2) });
  for (const [dx, dy] of [[-0.8, 0.8], [0.8, 0.8], [0.8, -0.8]]) {
    const [X, Y] = P(x + dx, y + dy, z + 0.12);
    ctx.beginPath(); ctx.arc(X, Y, 0.16, 0, Math.PI * 2); paint(ctx, C.ink, { lw: 0.02 });
  }
}

// Smoke after the launch: a cloud hanging over the lot that drifts and thins
// for a few minutes of the day, then a few wisps from the pad until the new
// rocket comes.
function afterSmoke(ctx, d) {
  if (d < 3 || d > 93) return;
  const puffs = [];
  if (d < 60) {
    const k = (d - 3) / 57;
    for (let i = 0; i < 9; i++) {
      const a = hash(i, 81) * Math.PI * 2, r = 1.2 + hash(i, 82) * 3.2;
      const x = RX + Math.cos(a) * r + k * 2.5, y = RY + Math.sin(a) * r - k * 1.5;
      const z = 2.2 + hash(i, 83) * 2.5 + k * 2;
      const rr = (0.9 + hash(i, 84) * 0.8) * (1 - k * k);
      if (rr > 0.05) puffs.push([...P(x, y, z), rr]);
    }
  }
  if (Q.detail && d > 20) {
    for (let i = 0; i < 3; i++) {
      const q = ((d * 0.25 + i / 3) % 1);
      puffs.push([...P(RX + (i - 1) * 0.5 + q * 0.4, RY - q * 0.3, PADZ + 0.4 + q * 3), 0.2 + q * 0.35 * (1 - q)]);
    }
  }
  if (!puffs.length) return;
  ctx.beginPath();
  for (const [X, Y, r] of puffs) { ctx.moveTo(X + r, Y); ctx.arc(X, Y, r, 0, Math.PI * 2); }
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.stroke(); }
  ctx.fillStyle = C.greyLight;
  ctx.fill();
  ctx.beginPath();
  for (const [X, Y, r] of puffs) { ctx.moveTo(X - r * 0.12 + r * 0.8, Y - r * 0.15); ctx.arc(X - r * 0.12, Y - r * 0.15, r * 0.8, 0, Math.PI * 2); }
  ctx.fillStyle = C.white;
  ctx.fill();
}

export default {
  id: 'launchpad',
  name: 'Launch Pad',
  blurb: 'Rocket SQ-1 goes up, comes down, and goes up again. The mechanic keeps forgetting to leave before the countdown.',

  build(R) {
    // On a day (the Block Party) the rocket goes up once, at the party's height
    // (dayClock below); on The Block it flies every 30 seconds, as ever.
    const day = R.opts.day;
    const dc = day ? dayClock(day) : null;
    const ph = day ? dc.s : phase;
    R.floor((ctx) => {
      slab(ctx, C.greyLight);
      rect(ctx, 0, 0, 16, 16, 0, C.greyLight, { stroke: false, dots: C.grey, density: 0.08 });
      tiles(ctx, 2, alpha(C.ink, 0.35), 0.035);
      // hazard stripe border around the launch zone
      if (Q.detail) {
        for (let i = 0; i < 20; i++) {
          const x0 = 0.3 + i * 0.4;
          face(ctx, [[x0, 10.8, 0.01], [x0 + 0.2, 10.8, 0.01], [x0 + 0.45, 11.1, 0.01], [x0 + 0.25, 11.1, 0.01]], C.mustard, { stroke: false });
        }
      }
      // pad: hazard ring and scorched centre
      disc(ctx, RX, RY, 0.01, 3.2, C.ink, { stroke: false });
      for (let i = 0; i < 28; i++) {
        const a0 = (i / 28) * Math.PI * 2, a1 = ((i + 0.5) / 28) * Math.PI * 2;
        face(ctx, [
          [RX + Math.cos(a0) * 2.7, RY + Math.sin(a0) * 2.7, 0.015], [RX + Math.cos(a1) * 2.7, RY + Math.sin(a1) * 2.7, 0.015],
          [RX + Math.cos(a1 + 0.1) * 3.2, RY + Math.sin(a1 + 0.1) * 3.2, 0.015], [RX + Math.cos(a0 + 0.1) * 3.2, RY + Math.sin(a0 + 0.1) * 3.2, 0.015],
        ], C.mustard, { stroke: false });
      }
      disc(ctx, RX, RY, 0.02, 2.7, C.grey, { dots: C.ink, density: 0.12, lw: 0.04 });
      // fuel lines
      face(ctx, [[1.6, 3.0, 0.03], [1.6, 4.8, 0.03], [4.8, 4.8, 0.03]], null, { lw: 0.12, stroke: C.teal });
      face(ctx, [[4.2, 2.2, 0.03], [5.4, 3.8, 0.03]], null, { lw: 0.12, stroke: C.coral });
      paintText(ctx, 'floor', 3.6, 9.9, 'KEEP BACK', 0.5, alpha(C.coral, 0.85));
    });
    R.walls({ h: 1.0, left: C.greyLight, right: C.greyLight, cap: C.white });
    R.decor((ctx) => {
      if (!Q.detail) return;
      for (let i = 0; i < 32; i++) {
        onLeft(ctx, i * 0.5 + 0.05, 0.25, 0.25, 0.5, i % 2 ? C.mustard : C.ink, { stroke: false });
      }
    });

    // Launch plinth
    R.thing(RX, RY, (ctx) => {
      cylinder(ctx, RX, RY, 0, 2.2, PADZ, C.grey, { top: shade(C.greyLight, 0.1) });
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        disc(ctx, RX + Math.cos(a) * 1.6, RY + Math.sin(a) * 1.6, PADZ + 0.01, 0.18, C.mustard, { lw: 0.03 });
      }
    });

    // Fuel tanks
    R.thing(2.3, 2.6, (ctx) => {
      cylinder(ctx, 1.5, 1.7, 0, 1.2, 3.6, C.white, { top: C.greyLight });
      band(ctx, 1.5, 1.7, 1.2, 2.2, 2.6, C.teal);
      label(ctx, 2.2, 2.4, 1.4, 'LOX', 0.5, C.teal);
      cylinder(ctx, 4.2, 1.2, 0, 0.9, 2.6, C.white, { top: C.greyLight });
      band(ctx, 4.2, 1.2, 0.9, 1.6, 1.9, C.coral);
    });

    // Gantry tower
    R.thing(GX1, GY1, (ctx, t) => gantry(ctx, t, ph(t)), { anim: true });
    // Lift cage
    R.mover((t) => {
      const s = ph(t);
      const z = s < 4 ? 0 : s < 6 ? ARM_Z * ease((s - 4) / 2) : s < 7.5 ? ARM_Z : s < 9.5 ? ARM_Z * (1 - ease((s - 7.5) / 2)) : 0;
      return { x: (GX0 + GX1) / 2, y: GY1 + 0.45, z };
    }, (ctx, t, p) => {
      const x0 = GX0 - 0.1, x1 = GX1 + 0.1, y0 = GY1 + 0.05, y1 = GY1 + 0.95;
      box(ctx, x0, y0, p.z, x1 - x0, y1 - y0, 0.1, C.mustard);
      face(ctx, [[x0, y1, p.z + 1.3], [x1, y1, p.z + 1.3], [x1, y0, p.z + 1.3]], null, { lw: 0.06 });
      for (const [x, y] of [[x0, y1], [x1, y1], [x1, y0]]) face(ctx, [[x, y, p.z], [x, y, p.z + 1.3]], null, { lw: 0.05 });
    }, { bias: 0.5 });

    // The crew
    [0, 1].forEach((i) => {
      R.mover((t) => crewPos(i, t, ph(t)), (ctx, t, p) => {
        if (p.hidden || !p.a || (day && dc.d(t) > 0)) return;
        ctx.save();
        ctx.globalAlpha = p.a;
        person(ctx, p.x, p.y, p.z, {
          skin: i ? '#C3835B' : '#F4CDAA', hair: i ? C.ink : C.mustard, style: i ? 'bun' : 'short',
          top: C.white, bottom: C.white, shoes: C.grey, hat: 'helmet', pose: p.pose || 'stand', dir: p.dir, back: p.back, speed: 6,
          hold: (c) => { c.beginPath(); c.rect(-0.62, -0.25, 0.3, 0.45); paint(c, C.coral, { lw: 0.03 }); },
        }, t);
        ctx.restore();
      }, { depth: (t) => { const p = crewPos(i, t, ph(t)); return p.x + p.y + (p.lift ? 0.9 : p.slide ? 1 : 0); } });
    });

    // The rocket, its flame, and its parachute.
    R.mover(day ? dc.rocket : (t) => ({ x: RX, y: RY, ...rocketState(t) }), (ctx, t, p) => {
      if (p.gone) {
        if (day) scorch(ctx, t);
        return;
      }
      const x = RX + p.sway, y = (day ? p.y : RY) - p.sway * 0.3;
      const z = PADZ + 0.5 + p.alt;
      if (p.wheel) dolly(ctx, x, y, z - 0.5, t);
      if (p.chute) drawChute(ctx, x, y, z + BODY_H + NOSE_H, p.chute, t);
      ctx.save();
      if (p.sway) {
        const [X, Y] = P(x, y, z + 3);
        ctx.translate(X, Y); ctx.rotate(p.sway * 0.3); ctx.translate(-X, -Y);
      }
      drawRocket(ctx, x, y, z, t, p);
      ctx.restore();
      const s = ph(t);
      if (!day && s > 23.6 && s < 28) slideShape(ctx, clamp((s - 23.6) / 0.5) * (1 - clamp((s - 27.5) / 0.5)));
    }, { bias: 0.3 });

    // Launch smoke and landing puffs.
    R.air((ctx, t) => {
      const s = ph(t);
      if (s < 10.3 || s > 24) return;
      const puffs = [];
      const add = (b, i, big) => {
        const age = s - b;
        const life = big ? 4.8 : 1.6;
        if (age < 0 || age > life) return;
        const k = age / life;
        const a = hash(i, 3) * Math.PI * 2;
        const d = (1 - Math.exp(-age * 1.4)) * (big ? 2.4 + hash(i, 4) * 3.4 : 1.8);
        const x = RX + Math.cos(a) * d, y = RY + Math.sin(a) * d;
        const z = 0.5 + age * (big ? 0.3 : 0.5) + hash(i, 5) * 0.5;
        const r = ((big ? 0.55 : 0.35) + age * (big ? 0.33 : 0.4)) * (1 - clamp((k - 0.75) / 0.25));
        if (r <= 0.02) return;
        const [X, Y] = P(x, y, z);
        puffs.push([X, Y, r, i]);
      };
      for (let i = 0; i < 34; i++) add(10.4 + (i / 34) * 4.4, i, true);
      for (let i = 0; i < 10; i++) add(22.2 + (i / 10) * 0.9, i + 50, false);
      if (!puffs.length) return;
      // one soft cloud: outlines first, then fills, so the outline hugs the whole billow
      ctx.beginPath();
      for (const [X, Y, r] of puffs) { ctx.moveTo(X + r, Y); ctx.arc(X, Y, r, 0, Math.PI * 2); }
      if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.12; ctx.stroke(); }
      ctx.fillStyle = C.greyLight;
      ctx.fill();
      if (Q.detail) { ctx.fillStyle = dots(C.grey, 0.25); ctx.fill(); }
      ctx.beginPath();
      for (const [X, Y, r] of puffs) { ctx.moveTo(X - r * 0.12 + r * 0.82, Y - r * 0.15); ctx.arc(X - r * 0.12, Y - r * 0.15, r * 0.82, 0, Math.PI * 2); }
      ctx.fillStyle = C.white;
      ctx.fill();
    });

    // Countdown board
    R.thing(0.9, 10.6, (ctx, t) => {
      for (const y of [7.9, 10.5]) box(ctx, 0.45, y, 0, 0.14, 0.14, 2.2, C.ink, { flat: true });
      box(ctx, 0.3, 7.2, 2.1, 0.3, 4.0, 2.7, C.navy, { right: C.night });
      const s = ph(t);
      let text = 'READY', col = C.mint, size = 1.0;
      if (s >= 8 && s < 11) { text = String(3 - Math.floor(s - 8)); col = C.mustard; size = 2.1; }
      else if (s >= 11 && s < 15.5) { text = 'LIFTOFF!'; col = C.coral; size = 0.7; }
      else if (s >= 15.5 && s < 17) { text = 'BYE!'; col = C.butter; size = 1.3; }
      else if (s >= 17 && s < 23) { text = 'LANDING'; col = C.sky; size = 0.7; }
      else if (s >= 23 && s < 28) { text = 'NICE'; col = C.mint; size = 1.3; }
      if (day) [text, col, size] = dc.board(t);
      if (text.length === 1 && pulse(t, 1) > 0.8) col = C.white;
      ctx.save();
      ctx.translate(0.6, 0.3);
      paintText(ctx, 'left', 9.2, 3.4, text, size, col);
      paintText(ctx, 'left', 9.2, 4.5, 'MISSION CLOCK', 0.34, C.white, 'Rethink Sans');
      ctx.restore();
    }, { anim: true });

    // Crew hut with a windsock on the roof.
    R.thing(3.2, 15.6, (ctx, t) => {
      box(ctx, 0.3, 12.2, 0, 2.9, 3.4, 2.6, C.white, { top: C.greyLight });
      box(ctx, 0.2, 12.1, 2.6, 3.1, 3.6, 0.2, C.teal);
      face(ctx, [[3.21, 13.2, 0], [3.21, 14.2, 0], [3.21, 14.2, 2.0], [3.21, 13.2, 2.0]], C.teal, { dots: shade(C.teal, 0.4), density: 0.2 });
      ctx.save(); ctx.translate(3.21, 1.6); paintText(ctx, 'left', 13.7, 2.3, 'CREW', 0.34, C.coral); ctx.restore();
      face(ctx, [[1.9, 15.6, 0.7], [0.7, 15.6, 0.7], [0.7, 15.6, 1.8], [1.9, 15.6, 1.8]], C.sky, { dots: C.white, density: 0.3 });
      // windsock
      face(ctx, [[2.6, 14.9, 2.8], [2.6, 14.9, 5.0]], null, { lw: 0.07 });
      const [X, Y] = P(2.6, 14.9, 4.9);
      const w = Math.sin(t * 3) * 0.08;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        const x0 = X + i * 0.32, x1 = X + (i + 1) * 0.32;
        const h0 = 0.28 - i * 0.04, h1 = 0.28 - (i + 1) * 0.04;
        ctx.moveTo(x0, Y - h0 + w * i); ctx.lineTo(x1, Y - h1 + w * (i + 1) + 0.1); ctx.lineTo(x1, Y + h1 + w * (i + 1) + 0.1); ctx.lineTo(x0, Y + h0 + w * i);
        ctx.closePath();
        paint(ctx, i % 2 ? C.white : C.coral, { lw: 0.03 });
      }
    }, { anim: true });

    // Mission control: the big wall of screens.
    R.thing(9.6, 0.4, (ctx) => {
      box(ctx, 9.6, 0, 0, 6.4, 0.4, 4.0, C.white, { top: C.greyLight });
      ctx.save(); ctx.translate(-0.41, 0.205);
      paintText(ctx, 'right', 12.8, 3.6, 'MISSION CONTROL', 0.5, C.navy);
      ctx.restore();
    });
    R.thing(9.65, 0.45, (ctx, t) => {
      const scr = (x0, x1, z0, z1) => face(ctx, [[x0, 0.41, z0], [x1, 0.41, z0], [x1, 0.41, z1], [x0, 0.41, z1]], C.night, { lw: 0.05 });
      scr(10.1, 12.1, 1.3, 3.1);
      scr(12.4, 15.0, 1.3, 3.1);
      // trajectory plot with a live dot
      const st = rocketState(t, ph(t));
      const s = ph(t);
      ctx.beginPath();
      for (let i = 0; i <= 20; i++) {
        const q = i / 20;
        const [X, Y] = P(12.6 + q * 2.2, 0.42, 1.5 + Math.sin(q * Math.PI) * 1.3);
        i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      }
      ctx.strokeStyle = alpha(C.mint, 0.6); ctx.lineWidth = 0.04; ctx.stroke();
      const q = s < 11 ? 0 : s < 17 ? (s - 11) / 12 : s < 23 ? 0.5 + (s - 17) / 12 : 1;
      const [dx, dy] = P(12.6 + q * 2.2, 0.42, 1.5 + Math.sin(q * Math.PI) * 1.3);
      ctx.beginPath(); ctx.arc(dx, dy, 0.1, 0, Math.PI * 2); ctx.fillStyle = C.coral; ctx.fill();
      // bar meters
      for (let i = 0; i < 6; i++) {
        const h = 0.3 + (0.5 + 0.5 * Math.sin(t * (2 + i) + i)) * (st.fire ? 1.3 : 0.6);
        face(ctx, [[10.3 + i * 0.3, 0.42, 1.45], [10.5 + i * 0.3, 0.42, 1.45], [10.5 + i * 0.3, 0.42, 1.45 + h], [10.3 + i * 0.3, 0.42, 1.45 + h]], [C.mint, C.mustard, C.coral][i % 3], { stroke: false });
      }
      // radar dish on the roof
      const [rx, ry] = P(15.3, 0.25, 4.0);
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx, ry - 0.6); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.08; ctx.stroke();
      const sp = Math.cos(t * 1.2);
      ctx.beginPath(); ctx.ellipse(rx, ry - 0.9, Math.max(0.08, Math.abs(sp) * 0.6), 0.45, 0, 0, Math.PI * 2);
      paint(ctx, sp > 0 ? C.white : C.greyLight, { lw: 0.05 });
      ctx.beginPath(); ctx.moveTo(rx, ry - 0.9); ctx.lineTo(rx + sp * 0.5, ry - 1.05); ctx.stroke();
    }, { anim: true });
    // Console desk with little monitors
    R.thing(10.2, 1.9, (ctx, t) => {
      box(ctx, 10.2, 1.2, 0, 5.6, 0.8, 1.0, C.navy, { top: tint(C.navy, 0.15) });
      for (let i = 0; i < 4; i++) {
        const x = 10.5 + i * 1.35;
        box(ctx, x, 1.3, 1.0, 0.9, 0.35, 0.65, C.greyLight);
        const on = (i + Math.floor(t * 2)) % 5 !== 0;
        face(ctx, [[x + 0.08, 1.66, 1.08], [x + 0.82, 1.66, 1.08], [x + 0.82, 1.66, 1.58], [x + 0.08, 1.66, 1.58]], on ? [C.mint, C.sky, C.butter, C.mint][i] : C.night, { lw: 0.03 });
        if (on && Q.detail) face(ctx, [[x + 0.15, 1.67, 1.2 + (i % 2) * 0.1], [x + 0.75, 1.67, 1.4 - (i % 2) * 0.1]], null, { lw: 0.04, stroke: C.navy });
      }
      for (let i = 0; i < 8; i++) {
        const [X, Y] = P(10.4 + i * 0.65, 2.0, 0.8);
        ctx.beginPath(); ctx.arc(X, Y, 0.06, 0, Math.PI * 2);
        ctx.fillStyle = Math.sin(t * 4 + i * 2) > 0 ? C.coral : C.mustard; ctx.fill();
      }
    }, { anim: true });
    // Controllers at their desks
    [[11.0, 0], [12.4, 1], [13.8, 2]].forEach(([x, i]) => {
      R.thing(x + 0.4, 2.9, (ctx, t) => {
        const s = ph(t);
        const excited = s > 11 && s < 16;
        box(ctx, x - 0.3, 2.6, 0, 0.7, 0.7, 0.75, C.ink, { flat: true });
        person(ctx, x, 2.9, 0.1, folk(200 + i, { pose: excited && i === 1 ? 'cheer' : 'sit', dir: 'r', back: true, arms: excited || i === 1 ? undefined : [1.3 + Math.sin(t * 9 + i) * 0.15, 1.3] }), t);
      }, { anim: true });
    });
    // Flight director and the flag waver
    R.mover(() => ({ x: 10.0, y: 3.5 }), (ctx, t, p) => {
      const s = ph(t);
      const go = s > 6 && s < 8.2, nailed = s > 24 && s < 26.5;
      person(ctx, p.x, p.y, 0, folk(210, { pose: go ? 'point' : nailed ? 'cheer' : 'stand', dir: 'l', top: C.sky, hat: 'none', style: 'bald', hold: (c) => { c.beginPath(); c.rect(-0.05, -0.1, 0.3, 0.38); paint(c, C.white, { lw: 0.02 }); } }), t);
      if (Q.detail && go) speech(ctx, p.x, p.y, 2.7, 'GO FOR LAUNCH!', { size: 0.42 });
      if (Q.detail && nailed) speech(ctx, p.x, p.y, 2.7, 'NAILED IT', { size: 0.42, fill: C.butter });
    });
    R.mover(() => ({ x: 15.3, y: 3.7 }), (ctx, t, p) => {
      const s = ph(t);
      const wave = s > 10.8 && s < 17;
      person(ctx, p.x, p.y, 0, folk(211, { pose: wave ? 'cheer' : 'stand', dir: 'l', top: C.mustard, hat: 'cap', hold: (c) => checkFlag(c, t, wave) }), t);
    });

    // Mechanic who keeps forgetting to leave.
    const mech = (t) => {
      const s = ph(t);
      const W = [7.7, 5.5], H = [8.6, 9.7];
      if (s < 8.2) return { x: W[0], y: W[1], z: PADZ, pose: 'drum', dir: 'l', back: true };
      if (s < 8.9) return { x: W[0], y: W[1], z: PADZ + Math.sin(((s - 8.2) / 0.7) * Math.PI) * 0.5, pose: 'jump', dir: 'r', say: 'EEP!' };
      if (s < 10.2) { const k = (s - 8.9) / 1.3; return { x: W[0] + (H[0] - W[0]) * k, y: W[1] + (H[1] - W[1]) * k, z: k < 0.4 ? PADZ : 0, pose: 'run', dir: 'l' }; }
      if (s < 23.5) return { x: H[0], y: H[1], z: 0, pose: 'sit', dir: 'r', back: true, peek: true };
      if (s < 26) { const k = (s - 23.5) / 2.5; return { x: H[0] + (W[0] - H[0]) * k, y: H[1] + (W[1] - H[1]) * k, z: k > 0.6 ? PADZ : 0, pose: 'walk', dir: 'r', back: true }; }
      return { x: W[0], y: W[1], z: PADZ, pose: 'drum', dir: 'l', back: true };
    };
    R.mover(day ? (t) => dc.pusher(t) || mech(t) : mech, (ctx, t, p) => {
      person(ctx, p.x, p.y, p.z, folk(220, { pose: p.pose, dir: p.dir, back: p.back, top: C.coral, bottom: C.navy, hat: 'cap', speed: p.pose === 'drum' ? 12 : 11 }), t);
      if (p.say && Q.detail) speech(ctx, p.x, p.y, p.z + 2.6, p.say, { size: 0.45 });
    });
    // Concrete blast barrier he hides behind
    R.thing(9.9, 10.6, (ctx) => {
      box(ctx, 7.4, 10.1, 0, 2.5, 0.55, 0.95, C.greyLight, { dotsL: C.grey });
      for (let i = 0; i < 5; i++) face(ctx, [[7.5 + i * 0.5, 10.66, 0.1], [7.75 + i * 0.5, 10.66, 0.85]], null, { lw: 0.12, stroke: C.mustard });
    });
    // The lost wrench
    R.rug((ctx) => {
      const [X, Y] = P(9.2, 4.3, 0.03);
      ctx.save(); ctx.translate(X, Y); ctx.rotate(-0.4);
      ctx.beginPath(); ctx.roundRect(-0.35, -0.05, 0.6, 0.1, 0.05); paint(ctx, C.grey, { lw: 0.03 });
      ctx.beginPath(); ctx.arc(0.3, 0, 0.13, 0.6, Math.PI * 2 - 0.6); ctx.lineTo(0.3, 0); ctx.closePath(); paint(ctx, C.grey, { lw: 0.03 });
      ctx.beginPath(); ctx.arc(-0.38, 0, 0.1, 0, Math.PI * 2); paint(ctx, C.grey, { lw: 0.03 });
      ctx.restore();
    });
    R.find({ id: 'wrench', label: 'A lost wrench', at: [9.2, 4.3, 0.05], r: 0.7 });

    // Fence around the viewing area
    for (let i = 0; i < 8; i++) {
      const x = 8 + i;
      R.thing(x + 1, 11, (ctx) => {
        face(ctx, [[x, 11, 0], [x + 1, 11, 0], [x + 1, 11, 1.25], [x, 11, 1.25]], alpha(C.white, 0.12), { lw: 0.02, stroke: alpha(C.ink, 0.35) });
        if (Q.detail) {
          ctx.beginPath();
          for (let k = 0; k < 4; k++) {
            const a = P(x + k * 0.25, 11, 0.05), b = P(x + k * 0.25 + 0.25, 11, 1.2), c = P(x + k * 0.25 + 0.25, 11, 0.05), d = P(x + k * 0.25, 11, 1.2);
            ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.moveTo(c[0], c[1]); ctx.lineTo(d[0], d[1]);
          }
          ctx.strokeStyle = alpha(C.ink, 0.3); ctx.lineWidth = 0.02; ctx.stroke();
        }
        face(ctx, [[x, 11, 1.25], [x + 1, 11, 1.25]], null, { lw: 0.07 });
        face(ctx, [[x, 11, 0], [x, 11, 1.35]], null, { lw: 0.08 });
      });
    }
    for (let i = 0; i < 5; i++) {
      const y = 11 + i;
      R.thing(8, y + 1, (ctx) => {
        face(ctx, [[8, y, 0], [8, y + 1, 0], [8, y + 1, 1.25], [8, y, 1.25]], alpha(C.white, 0.12), { lw: 0.02, stroke: alpha(C.ink, 0.35) });
        if (Q.detail) {
          ctx.beginPath();
          for (let k = 0; k < 4; k++) {
            const a = P(8, y + k * 0.25, 0.05), b = P(8, y + k * 0.25 + 0.25, 1.2), c = P(8, y + k * 0.25 + 0.25, 0.05), d = P(8, y + k * 0.25, 1.2);
            ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.moveTo(c[0], c[1]); ctx.lineTo(d[0], d[1]);
          }
          ctx.strokeStyle = alpha(C.ink, 0.3); ctx.lineWidth = 0.02; ctx.stroke();
        }
        face(ctx, [[8, y, 1.25], [8, y + 1, 1.25]], null, { lw: 0.07 });
        face(ctx, [[8, y + 1, 0], [8, y + 1, 1.35]], null, { lw: 0.08 });
      });
    }

    // The crowd
    const cheering = (t) => { const s = ph(t); return s > 11 && s < 17; };
    const crowd = [
      [9.3, 12.0, 301, 'wave'], [10.7, 11.9, 302, 'sign'], [12.2, 12.1, 303, 'photo'],
      [9.5, 13.8, 304, 'binox'], [11.0, 13.6, 305, 'kid'], [12.7, 14.6, 306, 'eat'], [11.4, 15.3, 307, 'wave'],
    ];
    crowd.forEach(([x, y, seed, role]) => {
      R.mover(() => ({ x, y }), (ctx, t, p) => {
        const cheer = cheering(t);
        const kid = role === 'kid';
        let pose = cheer ? (kid ? 'jump' : 'cheer') : 'stand';
        let arms;
        if (!cheer && role === 'binox') arms = [2.6, 2.4];
        if (!cheer && role === 'photo') arms = [2.0, 1.8];
        if (!cheer && role === 'eat') arms = [2.2, -0.2];
        if (!cheer && role === 'wave') pose = 'wave';
        if (role === 'sign') arms = [Math.PI - 0.2 + (cheer ? Math.sin(t * 12) * 0.2 : 0), -Math.PI + 0.2];
        person(ctx, x, y, 0, folk(seed, { pose, arms, dir: 'l', scale: kid ? 0.7 : 1, speed: 9, hat: role === 'wave' && seed === 301 ? 'sun' : undefined }), t);
        const [X, Y] = P(x, y, 0);
        if (role === 'binox' && !cheer) {
          ctx.beginPath(); ctx.roundRect(X - 0.35, Y - 2.1, 0.3, 0.2, 0.05); ctx.roundRect(X - 0.35, Y - 1.88, 0.3, 0.2, 0.05); paint(ctx, C.ink, { lw: 0.02 });
        }
        if (role === 'photo') {
          ctx.beginPath(); ctx.rect(X - 0.4, Y - 2.2, 0.36, 0.26); paint(ctx, C.ink, { lw: 0.02 });
          if (pulse(t, 0.9) < 0.15 && cheer) {
            ctx.beginPath();
            for (let k = 0; k < 8; k++) {
              const a = (k / 8) * Math.PI * 2;
              ctx.moveTo(X - 0.22, Y - 2.1); ctx.lineTo(X - 0.22 + Math.cos(a) * 0.55, Y - 2.1 + Math.sin(a) * 0.55);
            }
            ctx.strokeStyle = C.mustard; ctx.lineWidth = 0.06; ctx.stroke();
          }
        }
        if (role === 'eat' && !cheer) {
          ctx.beginPath(); ctx.roundRect(X - 0.62, Y - 2.02, 0.5, 0.14, 0.07); paint(ctx, C.woodLight, { lw: 0.02 });
          ctx.beginPath(); ctx.roundRect(X - 0.66, Y - 2.0, 0.58, 0.08, 0.04); ctx.fillStyle = C.red; ctx.fill();
        }
        if (role === 'sign') {
          const bob = cheer ? Math.sin(t * 12) * 0.08 : 0;
          ctx.beginPath(); ctx.moveTo(X - 0.1, Y - 2.2 + bob); ctx.lineTo(X - 0.1, Y - 3.0 + bob); ctx.strokeStyle = C.brown; ctx.lineWidth = 0.07; ctx.stroke();
          ctx.beginPath(); ctx.rect(X - 0.85, Y - 3.7 + bob, 1.5, 0.75); paint(ctx, C.white, { lw: 0.04 });
          label(ctx, x + 0.04, y + 0.04, (3.3 - bob) / ZK, 'GO SQ!', 0.34, C.coral);
        }
        if (seed === 301) {
          // kid on dad's shoulders
          person(ctx, x, y, 1.55, folk(308, { pose: cheer ? 'cheer' : 'sit', dir: 'l', scale: 0.62, top: C.pink }), t);
        }
      }, { bias: seed === 301 ? 0.05 : 0 });
    });

    // Hot dog cart
    R.thing(15.5, 13.5, (ctx, t) => {
      box(ctx, 13.8, 12.4, 0.35, 1.7, 1.0, 1.0, C.red, { top: C.white });
      cylinder(ctx, 14.1, 13.4, 0, 0.32, 0.6, C.ink, { flat: true });
      cylinder(ctx, 15.2, 13.4, 0, 0.32, 0.6, C.ink, { flat: true });
      label(ctx, 14.65, 13.42, 0.95, 'HOT DOGS', 0.3, C.white);
      // bun and sausage on the counter
      const [X, Y] = P(14.4, 12.9, 1.36);
      ctx.beginPath(); ctx.roundRect(X - 0.3, Y - 0.08, 0.6, 0.16, 0.08); paint(ctx, C.woodLight, { lw: 0.02 });
      ctx.beginPath(); ctx.roundRect(X - 0.34, Y - 0.1, 0.68, 0.08, 0.04); ctx.fillStyle = C.red; ctx.fill();
      // umbrella
      face(ctx, [[15.2, 12.6, 1.35], [15.2, 12.6, 3.0]], null, { lw: 0.06 });
      const [ux, uy] = P(15.2, 12.6, 3.3);
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(ux, uy - 0.35);
        ctx.lineTo(ux - 1.3 + (i / 6) * 2.6, uy + 0.3);
        ctx.lineTo(ux - 1.3 + ((i + 1) / 6) * 2.6, uy + 0.3);
        ctx.closePath();
        paint(ctx, i % 2 ? C.mustard : C.white, { lw: 0.03 });
      }
      if (Q.detail) {
        for (let i = 0; i < 3; i++) {
          const k = (t * 0.6 + i / 3) % 1;
          const [sx, sy] = P(14.2 + Math.sin(k * 6 + i) * 0.15, 12.7, 1.5 + k * 1.2);
          ctx.beginPath(); ctx.arc(sx, sy, 0.1 + k * 0.12, 0, Math.PI * 2);
          ctx.fillStyle = alpha(C.white, 0.8 * (1 - k)); ctx.fill();
        }
      }
    }, { anim: true });
    R.mover(() => ({ x: 14.6, y: 11.8 }), (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, folk(320, { pose: pulse(t, 5) < 0.3 ? 'wave' : 'stand', dir: 'l', hat: 'chef', top: C.white }), t);
    });
    R.mover(() => ({ x: 13.2, y: 13.3 }), (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, folk(321, { pose: cheering(t) ? 'jump' : 'stand', dir: 'r', scale: 0.7, arms: [1.5, 0.2] }), t);
    });

    // TV news van and a reporter doing a very dramatic live report.
    R.thing(15.9, 8.2, (ctx, t) => {
      for (const [x, y] of [[13.6, 8.1], [15.3, 8.1]]) cylinder(ctx, x, y - 0.1, 0, 0.32, 0.4, C.ink, { flat: true });
      box(ctx, 13.0, 6.4, 0.3, 2.3, 1.7, 2.0, C.white, { top: C.greyLight });
      box(ctx, 15.3, 6.4, 0.3, 0.7, 1.7, 1.3, C.sky, { top: C.greyLight });
      face(ctx, [[15.35, 8.11, 0.9], [15.9, 8.11, 0.9], [15.9, 8.11, 1.45], [15.35, 8.11, 1.45]], tint(C.sky, 0.4), { lw: 0.03 });
      label(ctx, 14.15, 8.11, 1.55, 'SQ NEWS', 0.4, C.coral);
      face(ctx, [[13.1, 8.11, 0.8], [15.2, 8.11, 0.8]], null, { lw: 0.12, stroke: C.coral });
      // dish on the roof, slowly tracking the rocket
      face(ctx, [[13.8, 7.2, 2.3], [13.8, 7.2, 2.9]], null, { lw: 0.08 });
      const [dx, dy] = P(13.8, 7.2, 3.1);
      const k = Math.sin(t * 0.4) * 0.3;
      ctx.save(); ctx.translate(dx, dy); ctx.rotate(-0.5 + k);
      ctx.beginPath(); ctx.ellipse(0, 0, 0.7, 0.35, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.05 });
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -0.5); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.04; ctx.stroke();
      ctx.restore();
    }, { anim: true });
    R.mover(() => ({ x: 11.4, y: 8.4 }), (ctx, t, p) => {
      const s = ph(t);
      const duck = s > 10.6 && s < 14;
      const turn = s > 14 && s < 17;
      person(ctx, p.x, p.y, 0, folk(330, {
        pose: duck ? 'sit' : turn ? 'point' : 'stand', dir: turn ? 'l' : 'r', top: C.purple, style: 'long', hair: C.mustard,
        arms: duck || turn ? undefined : [2.3 + Math.sin(t * 3) * 0.1, 0.9 + Math.sin(t * 2.3) * 0.4],
      }), t);
      if (!Q.detail) return;
      if (s > 1 && s < 6) speech(ctx, p.x, p.y, 2.7, 'LIVE FROM THE PAD!', { size: 0.4 });
      if (duck) speech(ctx, p.x, p.y, 1.8, 'AAAH', { size: 0.4, fill: C.butter });
    });
    R.mover(() => ({ x: 12.9, y: 9.8 }), (ctx, t, p) => {
      const s = ph(t);
      const follow = s > 11 && s < 17;
      person(ctx, p.x, p.y, 0, folk(331, { pose: 'stand', dir: 'l', top: C.green, hat: 'cap', arms: [follow ? 2.8 : 1.9, 1.6] }), t);
      const [X, Y] = P(p.x, p.y, follow ? 2.35 : 1.95);
      ctx.beginPath(); ctx.rect(X - 0.62, Y - 0.2, 0.62, 0.36); paint(ctx, C.ink, { lw: 0.02 });
      ctx.beginPath(); ctx.arc(X - 0.66, Y - 0.02, 0.12, 0, Math.PI * 2); paint(ctx, C.grey, { lw: 0.02 });
      if (Math.sin(t * 4) > 0) { ctx.beginPath(); ctx.arc(X - 0.1, Y - 0.26, 0.05, 0, Math.PI * 2); ctx.fillStyle = C.coral; ctx.fill(); }
    });

    // Traffic cone with a tiny flag planted in it.
    R.thing(10.6, 9.6, (ctx, t) => {
      const [X, Y] = P(10.3, 9.3, 0);
      ctx.beginPath(); ctx.moveTo(X - 0.3, Y); ctx.lineTo(X + 0.3, Y); ctx.lineTo(X + 0.06, Y - 0.85); ctx.lineTo(X - 0.06, Y - 0.85); ctx.closePath();
      paint(ctx, C.coral, { lw: 0.04 });
      ctx.beginPath(); ctx.rect(X - 0.18, Y - 0.5, 0.36, 0.12); ctx.fillStyle = C.white; ctx.fill();
      ctx.beginPath(); ctx.moveTo(X, Y - 0.85); ctx.lineTo(X, Y - 1.45); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
      const w = Math.sin(t * 6) * 0.03;
      ctx.beginPath(); ctx.moveTo(X, Y - 1.45); ctx.lineTo(X + 0.32, Y - 1.36 + w); ctx.lineTo(X, Y - 1.24); ctx.closePath();
      paint(ctx, C.teal, { lw: 0.02 });
    }, { anim: true });
    R.find({ id: 'flag', label: 'A tiny flag', at: [10.3, 9.3, 1.1], r: 0.6 });

    // Dog in a space helmet, on patrol.
    const dogRoute = route([[4.6, 11.2, 1], [7.2, 11.4], [7.2, 15.2, 1.5], [4.4, 15.2]], { speed: 1.4 });
    R.mover(dogRoute, (ctx, t, p) => dog(ctx, p.x, p.y, 0, t, p.dir, p.moving));
    R.find({ id: 'dog', label: 'A dog in a space helmet', at: (t) => { const p = dogRoute(t); return [p.x, p.y, 0.5]; }, r: 0.8 });

    // The goose, running the show from the top of the gantry.
    R.goose((t) => {
      const s = ph(t);
      const honk = (s > 8 && s < 11 && pulse(t, 1) < 0.35) || (s > 11 && s < 12.5);
      return { x: (GX0 + GX1) / 2, y: (GY0 + GY1) / 2 + 0.2, z: GH + 0.15, dir: 'r', pose: honk ? 'honk' : 'stand' };
    }, { bias: 1.5 });

    if (day) {
      // After the launch the smoke hangs over the lot, then the pad smoulders
      // all night.
      R.air((ctx, t) => afterSmoke(ctx, dc.d(t)));
      // Floodlights on the rocket after dark, and the crew hut's window lit.
      R.light({ at: [RX, RY, 3.2], r: 4, color: C.butter, k: (t) => day.nightK(t) * (dc.d(t) < 0 || dc.d(t) > dc.back ? 0.45 : 0.15) });
      R.thing(3.21, 15.61, (ctx, t) => {
        const k = Math.round(day.nightK(t) * 10) / 10;
        if (k < 0.1) return;
        face(ctx, [[1.9, 15.6, 0.7], [0.7, 15.6, 0.7], [0.7, 15.6, 1.8], [1.9, 15.6, 1.8]], mix(C.sky, C.butter, k), { lw: 0.04 });
      }, { anim: true });
    }
  },
};
