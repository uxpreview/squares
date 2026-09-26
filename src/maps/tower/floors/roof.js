// The Roof: the Walk-Up's shared rooftop. A pigeon keeper counting his flock
// (one of them is a goose), a barbecue under constant pigeon attack, washing
// in the wind, vegetables, and a vent that plays the tuba from 3A.
import {
  C, box, rect, disc, cylinder, face, poly, paint, person, folk, plant, walls, slab, planks,
  speech, shade, tint, alpha, mix, dots, Q, label, P, note, paintText, table, hash, SKIN,
} from '../../../engine/art.js';
import { route, particles, pulse, clamp, ease } from '../../../engine/actors.js';

// ---------- Layout ----------
const HUT = 3.4;                       // stair hut, back corner, HUT x HUT x HUT
const DOOR = [1.1, 2.3];               // door on the hut's +y face (x range)
const TANK = { x: 14.2, y: 2.0, r: 1.45, z0: 2.4, h: 2.6 };
const TANK_TOP = TANK.z0 + TANK.h + 1.15; // tip of the cone
const GRILL = { x: 13.0, y: 7.8, z: 1.3 };
const LINE_Y = 12.8, LINE_X0 = 3.6, LINE_X1 = 10.4, LINE_Z = 2.85;
const VENT = { x: 8.9, y: 7.3 };
const KITE_KID = [14.6, 15.1];

const lineZ = (x) => LINE_Z - Math.sin(((x - LINE_X0) / (LINE_X1 - LINE_X0)) * Math.PI) * 0.25;

// ---------- Local helpers ----------
function pigeon(ctx, x, y, z, t, o = {}) {
  const [X, Y] = P(x, y, z);
  const f = o.dir === 'l' ? -1 : 1;
  const s = o.s || 1;
  const ph = o.ph || 0;
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(f * s, s);
  const body = o.body || C.grey;
  if (o.fly) {
    const flap = Math.sin(t * 16 + ph);
    ctx.beginPath();
    ctx.moveTo(-0.05, -0.1); ctx.lineTo(-0.2, -0.1 - 0.32 * flap); ctx.lineTo(0.1, -0.1);
    paint(ctx, shade(body, 0.2), { lw: 0.03 });
    ctx.beginPath();
    ctx.ellipse(0, -0.1, 0.22, 0.09, 0, 0, Math.PI * 2);
    ctx.moveTo(-0.18, -0.1); ctx.lineTo(-0.34, -0.16); ctx.lineTo(-0.34, -0.04);
    paint(ctx, body, { lw: 0.03 });
    ctx.beginPath();
    ctx.arc(0.22, -0.15, 0.08, 0, Math.PI * 2);
    paint(ctx, shade(body, 0.1), { lw: 0.03 });
    ctx.beginPath();
    ctx.moveTo(-0.02, -0.1); ctx.lineTo(0.1, -0.1 + 0.3 * flap); ctx.lineTo(0.18, -0.1);
    paint(ctx, tint(body, 0.2), { lw: 0.03 });
    if (o.hold) o.hold(ctx);
    ctx.restore();
    return;
  }
  if (Q.detail) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.2, 0.08, 0, 0, Math.PI * 2);
    ctx.fillStyle = alpha(C.ink, 0.15);
    ctx.fill();
  }
  const bob = o.walk ? Math.abs(Math.sin(t * 10 + ph)) * 0.03 : 0;
  ctx.translate(0, -bob);
  ctx.strokeStyle = C.coral;
  ctx.lineWidth = 0.035;
  ctx.beginPath();
  ctx.moveTo(-0.02, -0.14); ctx.lineTo(-0.03, 0);
  ctx.moveTo(0.05, -0.14); ctx.lineTo(0.06, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, -0.2, 0.2, 0.11, -0.15, 0, Math.PI * 2);
  ctx.moveTo(-0.14, -0.2); ctx.lineTo(-0.32, -0.28); ctx.lineTo(-0.3, -0.18);
  paint(ctx, body, { lw: 0.03 });
  ctx.beginPath();
  ctx.ellipse(-0.04, -0.2, 0.11, 0.06, -0.2, 0, Math.PI * 2);
  ctx.fillStyle = shade(body, 0.25);
  ctx.fill();
  const peck = o.peck && Math.sin(t * 6 + ph) > 0.2;
  const hx = peck ? 0.22 : 0.15, hy = peck ? -0.1 : -0.36;
  ctx.beginPath();
  ctx.moveTo(0.08, -0.25); ctx.lineTo(hx, hy);
  ctx.strokeStyle = C.tealLight;
  ctx.lineWidth = 0.1;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(hx, hy, 0.07, 0, Math.PI * 2);
  paint(ctx, shade(body, 0.1), { lw: 0.03 });
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.moveTo(hx + 0.05, hy - 0.01); ctx.lineTo(hx + 0.13, hy + 0.02); ctx.lineTo(hx + 0.05, hy + 0.03);
  ctx.fill();
  if (Q.detail) {
    ctx.fillStyle = C.coral;
    ctx.beginPath();
    ctx.arc(hx + 0.02, hy - 0.02, 0.022, 0, Math.PI * 2);
    ctx.fill();
  }
  if (o.hold) o.hold(ctx);
  ctx.restore();
}

function lettuce(ctx, x, y, z, col) {
  const [X, Y] = P(x, y, z);
  for (const [dx, dy, r] of [[-0.14, -0.1, 0.17], [0.14, -0.1, 0.17], [0, -0.22, 0.19], [0, -0.06, 0.15]]) {
    ctx.beginPath();
    ctx.arc(X + dx, Y + dy, r, 0, Math.PI * 2);
    paint(ctx, col, { dots: shade(col, 0.4), density: 0.2, lw: 0.03 });
  }
}

function burger(ctx, X, Y, s = 1, spin = 0) {
  ctx.save();
  ctx.translate(X, Y);
  ctx.rotate(spin);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.ellipse(0, -0.08, 0.2, 0.1, 0, Math.PI, 0);
  paint(ctx, C.wood, { lw: 0.03 });
  ctx.fillStyle = C.green;
  ctx.fillRect(-0.21, -0.07, 0.42, 0.04);
  ctx.beginPath();
  ctx.roundRect(-0.2, -0.04, 0.4, 0.07, 0.03);
  paint(ctx, C.brown, { lw: 0.03 });
  ctx.beginPath();
  ctx.roundRect(-0.19, 0.03, 0.38, 0.06, 0.03);
  paint(ctx, C.woodLight, { lw: 0.03 });
  ctx.restore();
}

// A catenary between two points; returns the points.
function sag(a, b, n, depth) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    pts.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k - Math.sin(k * Math.PI) * depth]);
  }
  return pts;
}
function strokePts(ctx, pts, color = C.ink, lw = 0.04) {
  ctx.beginPath();
  pts.forEach((p, i) => { const [X, Y] = P(...p); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.stroke();
}

// A piece of washing hanging from the line at x0..x0+w, blowing toward +y.
function washing(ctx, x0, w, h, t, col, o = {}) {
  const n = 6, ph = x0 * 1.7;
  const top = [], bot = [];
  for (let i = 0; i <= n; i++) {
    const x = x0 + (w * i) / n;
    const zt = lineZ(x);
    top.push([x, LINE_Y, zt]);
    const k = i / n;
    const gust = 0.5 + 0.5 * Math.sin(t * 0.9 + ph * 0.3);
    const blow = (0.2 + 0.35 * gust) + Math.sin(t * 3.2 + ph + k * 3) * 0.12;
    const lift = blow * 0.35;
    bot.push([x, LINE_Y + blow, zt - h + lift]);
  }
  poly(ctx, [...top, ...bot.reverse()]);
  paint(ctx, col, { dots: o.dots, density: 0.2, lw: 0.04 });
  if (o.stripe && Q.detail) {
    for (const q of [0.35, 0.55]) {
      const pts = top.map((p, i) => {
        const b = bot[n - i];
        return [p[0], p[1] + (b[1] - p[1]) * q, p[2] + (b[2] - p[2]) * q];
      });
      strokePts(ctx, pts, o.stripe, 0.09);
    }
  }
  // pegs
  if (Q.detail) {
    for (const x of [x0 + 0.08, x0 + w - 0.08]) {
      const [X, Y] = P(x, LINE_Y, lineZ(x));
      ctx.fillStyle = C.coral;
      ctx.fillRect(X - 0.03, Y - 0.1, 0.06, 0.2);
    }
  }
}

function lounger(ctx, x, y, color) {
  box(ctx, x, y, 0.35, 2.7, 1.0, 0.14, color);
  for (const [lx, ly] of [[x + 0.1, y + 0.1], [x + 2.5, y + 0.1], [x + 0.1, y + 0.8], [x + 2.5, y + 0.8]]) {
    box(ctx, lx, ly, 0, 0.1, 0.1, 0.35, C.ink, { flat: true, stroke: false });
  }
  face(ctx, [[x, y, 0.49], [x, y + 1, 0.49], [x - 0.35, y + 1, 1.5], [x - 0.35, y, 1.5]], tint(color, 0.2));
  if (Q.detail) {
    for (let i = 1; i < 6; i++) face(ctx, [[x + i * 0.45, y, 0.5], [x + i * 0.45, y + 1, 0.5]], null, { lw: 0.03, stroke: shade(color, 0.3) });
  }
}

// Text painted on a vertical plane x = px (runs along y).
function textX(ctx, px, y, z, text, size, color) {
  ctx.save();
  ctx.translate(px, px / 2);
  paintText(ctx, 'left', y, z, text, size, color);
  ctx.restore();
}
// Text painted on a vertical plane y = py (runs along x).
function textY(ctx, py, x, z, text, size, color) {
  ctx.save();
  ctx.translate(-py, py / 2);
  paintText(ctx, 'right', x, z, text, size, color);
  ctx.restore();
}

// ---------- Big props ----------
function stairHut(ctx) {
  box(ctx, 0, 0, 0, HUT, HUT, HUT, C.coralLight, { top: C.greyLight, dotsL: C.coral, dens: 0.3 });
  // cap
  box(ctx, -0.1, -0.1, HUT, HUT + 0.2, HUT + 0.2, 0.18, C.white);
  // doorway (open, propped with a brick)
  const [d0, d1] = DOOR;
  face(ctx, [[d0, HUT, 0], [d1, HUT, 0], [d1, HUT, 2.9], [d0, HUT, 2.9]], C.night);
  if (Q.detail) {
    // stairs going down inside
    for (let i = 0; i < 4; i++) {
      const z = 0.25 + i * 0.32, inset = 0.1 + i * 0.06;
      face(ctx, [[d0 + inset, HUT, z], [d1 - inset, HUT, z]], null, { lw: 0.05, stroke: alpha(C.grey, 0.8 - i * 0.15) });
    }
  }
  // the door, swung open against the hut wall
  face(ctx, [[d1, HUT, 0], [d1 + 0.85, HUT + 0.85, 0], [d1 + 0.85, HUT + 0.85, 2.9], [d1, HUT, 2.9]], C.teal, { dots: shade(C.teal, 0.4), density: 0.2 });
  disc(ctx, d1 + 0.62, HUT + 0.6, 1.4, 0.06, C.mustard, { lw: 0.02 });
  // brick
  box(ctx, d1 + 0.7, HUT + 0.9, 0, 0.45, 0.25, 0.22, C.red, { lw: 0.03 });
  // signs
  face(ctx, [[0.35, HUT, 1.6], [0.95, HUT, 1.6], [0.95, HUT, 2.4], [0.35, HUT, 2.4]], C.white, { lw: 0.03 });
  if (Q.detail) {
    textY(ctx, HUT, 0.65, 2.18, 'KEEP', 0.2, C.red);
    textY(ctx, HUT, 0.65, 1.98, 'DOOR', 0.2, C.red);
    textY(ctx, HUT, 0.65, 1.78, 'SHUT', 0.2, C.red);
  }
  // "NO BARBECUES" notice on the +x face
  face(ctx, [[HUT, 0.5, 1.5], [HUT, 2.9, 1.5], [HUT, 2.9, 2.8], [HUT, 0.5, 2.8]], C.white, { lw: 0.04 });
  if (Q.detail) {
    textX(ctx, HUT, 1.7, 2.45, 'NO', 0.35, C.red);
    textX(ctx, HUT, 1.7, 2.02, 'BARBECUES', 0.32, C.red);
    textX(ctx, HUT, 1.7, 1.7, 'BY ORDER OF THE SUPER', 0.12, C.ink);
    // bulb over the door
    disc(ctx, 1.7, HUT + 0.1, 3.05, 0.12, C.butter, { lw: 0.03 });
  }
  // vent box on the roof of the hut
  box(ctx, 0.4, 0.5, HUT + 0.18, 0.8, 0.8, 0.5, C.grey);
}

function aerial(ctx) {
  const x = 1.4, y = 1.3, z0 = HUT + 0.18;
  box(ctx, x - 0.05, y - 0.05, z0, 0.1, 0.1, 4.0, C.ink, { flat: true, stroke: false });
  for (const [z, w] of [[z0 + 2.9, 1.1], [z0 + 3.4, 0.85], [z0 + 3.85, 0.6]]) {
    face(ctx, [[x - w, y + w, z], [x + w, y - w, z]], null, { lw: 0.07, stroke: C.ink });
    for (let i = -2; i <= 2; i++) {
      const k = (i / 2) * w;
      face(ctx, [[x + k - 0.25, y - k - 0.25, z], [x + k + 0.25, y - k + 0.25, z]], null, { lw: 0.04, stroke: C.ink });
    }
  }
  // guy wires
  for (const [gx, gy] of [[0.1, 3.2], [3.2, 0.1]]) face(ctx, [[x, y, z0 + 2.4], [gx, gy, z0]], null, { lw: 0.02, stroke: alpha(C.ink, 0.6) });
  // satellite dish on the corner, pointed hopefully at the sky
  const [X, Y] = P(2.8, 2.8, z0 + 0.9);
  box(ctx, 2.75, 2.75, z0, 0.1, 0.1, 0.8, C.grey, { flat: true, stroke: false });
  ctx.save();
  ctx.translate(X, Y);
  ctx.rotate(-0.5);
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.55, 0.28, 0, 0, Math.PI * 2);
  paint(ctx, C.white, { dots: C.grey, density: 0.2 });
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(0.05, -0.5);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.04; ctx.stroke();
  ctx.beginPath(); ctx.arc(0.05, -0.52, 0.06, 0, Math.PI * 2); paint(ctx, C.coral, { lw: 0.02 });
  ctx.restore();
}

function waterTank(ctx) {
  const { x, y, r, z0, h } = TANK;
  for (const [lx, ly] of [[x - 1.3, y - 1.3], [x + 1.1, y - 1.3], [x - 1.3, y + 1.1], [x + 1.1, y + 1.1]]) {
    box(ctx, lx, ly, 0, 0.2, 0.2, z0, C.brown, { flat: true });
  }
  face(ctx, [[x - 1.2, y + 1.3, 0.3], [x + 1.2, y + 1.3, z0 - 0.3]], null, { lw: 0.07, stroke: C.brown });
  face(ctx, [[x - 1.2, y + 1.3, z0 - 0.3], [x + 1.2, y + 1.3, 0.3]], null, { lw: 0.07, stroke: C.brown });
  face(ctx, [[x + 1.3, y - 1.2, 0.3], [x + 1.3, y + 1.2, z0 - 0.3]], null, { lw: 0.07, stroke: C.brown });
  box(ctx, x - 1.55, y - 1.55, z0, 3.1, 3.1, 0.16, C.brown);
  cylinder(ctx, x, y, z0 + 0.16, r, h, C.wood, { top: C.woodLight });
  for (const hz of [z0 + 0.7, z0 + 1.5, z0 + 2.3]) {
    const [X, Y] = P(x, y, hz);
    ctx.beginPath();
    ctx.ellipse(X, Y, r * Math.SQRT2, r * Math.SQRT2 / 2, 0, 0, Math.PI);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.07;
    ctx.stroke();
  }
  const [ax, ay] = P(x, y, TANK_TOP);
  const [X, Y] = P(x, y, z0 + h + 0.16);
  const rr = (r + 0.15) * Math.SQRT2;
  ctx.beginPath();
  ctx.moveTo(X - rr, Y);
  ctx.lineTo(ax, ay);
  ctx.lineTo(X + rr, Y);
  ctx.ellipse(X, Y, rr, rr / 2, 0, 0, Math.PI);
  paint(ctx, C.navy, { dots: C.ink, density: 0.3 });
  label(ctx, x + 1.0, y + 1.0, z0 + 1.2, 'H2O', 0.55, C.white);
  // ladder
  for (const d of [-0.25, 0.25]) face(ctx, [[x + r * 0.72 + d, y + r * 0.72 - d, 0], [x + r * 0.72 + d, y + r * 0.72 - d, z0 + h]], null, { lw: 0.05, stroke: C.grey });
  for (let z = 0.4; z < z0 + h; z += 0.4) face(ctx, [[x + r * 0.72 - 0.25, y + r * 0.72 + 0.25, z], [x + r * 0.72 + 0.25, y + r * 0.72 - 0.25, z]], null, { lw: 0.04, stroke: C.grey });
}

function coop(ctx, t) {
  const x0 = 0.2, x1 = 2.6, y0 = 5.5, y1 = 9.5, zb = 0.9, zt = 2.9, ridge = 3.8, rx = 1.4;
  for (const [lx, ly] of [[x0 + 0.1, y0 + 0.1], [x1 - 0.25, y0 + 0.1], [x0 + 0.1, y1 - 0.25], [x1 - 0.25, y1 - 0.25]]) {
    box(ctx, lx, ly, 0, 0.15, 0.15, zb, C.brown, { flat: true });
  }
  box(ctx, x0, y0, zb, x1 - x0, y1 - y0, zt - zb, C.wood, { top: C.woodLight });
  // mesh front with dark inside
  face(ctx, [[x1, y0 + 0.3, zb + 0.25], [x1, y1 - 0.3, zb + 0.25], [x1, y1 - 0.3, zt - 0.25], [x1, y0 + 0.3, zt - 0.25]], shade(C.brown, 0.5));
  // pigeons sitting inside
  if (Q.detail) {
    for (let i = 0; i < 4; i++) {
      pigeon(ctx, x1 - 0.1, y0 + 0.9 + i * 0.85, zb + 0.3, t, { dir: i % 2 ? 'l' : 'r', s: 0.9, ph: i * 2 });
    }
    ctx.beginPath();
    for (let y = y0 + 0.3; y <= y1 - 0.3 + 0.01; y += 0.3) {
      const a = P(x1, y, zb + 0.25), b = P(x1, y, zt - 0.25);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    }
    for (let z = zb + 0.25; z <= zt - 0.25 + 0.01; z += 0.3) {
      const a = P(x1, y0 + 0.3, z), b = P(x1, y1 - 0.3, z);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    }
    ctx.strokeStyle = alpha(C.greyLight, 0.8);
    ctx.lineWidth = 0.025;
    ctx.stroke();
  }
  // gable end and roof
  face(ctx, [[x0, y1, zt], [x1, y1, zt], [rx, y1, ridge]], shade(C.wood, 0.25), { dots: shade(C.wood, 0.55), density: 0.2 });
  face(ctx, [[x1 + 0.2, y0 - 0.2, zt - 0.1], [x1 + 0.2, y1 + 0.2, zt - 0.1], [rx, y1 + 0.2, ridge], [rx, y0 - 0.2, ridge]], C.red, { dots: shade(C.red, 0.4), density: 0.15 });
  // landing board
  box(ctx, x1, y0 + 0.4, zb + 0.9, 0.8, y1 - y0 - 0.8, 0.08, C.woodLight);
  // sign
  face(ctx, [[x0 + 0.3, y1, zb + 0.3], [x1 - 0.3, y1, zb + 0.3], [x1 - 0.3, y1, zb + 1.0], [x0 + 0.3, y1, zb + 1.0]], C.white, { lw: 0.03 });
  if (Q.detail) textY(ctx, y1, 1.4, zb + 0.65, 'DOVE HQ', 0.26, C.navy);
}

function grill(ctx) {
  const { x, y, z } = GRILL;
  for (const [dx, dy] of [[-0.5, 0.3], [0.4, 0.4], [0.1, -0.5]]) {
    face(ctx, [[x + dx * 0.4, y + dy * 0.4, z - 0.3], [x + dx, y + dy, 0]], null, { lw: 0.07 });
  }
  const [X, Y] = P(x, y, z);
  ctx.beginPath();
  ctx.ellipse(X, Y, 0.95, 0.48, 0, 0, Math.PI);
  ctx.ellipse(X, Y + 0.2, 0.95, 0.75, 0, Math.PI, 0, true);
  ctx.beginPath();
  ctx.moveTo(X - 0.95, Y);
  ctx.bezierCurveTo(X - 0.9, Y + 0.85, X + 0.9, Y + 0.85, X + 0.95, Y);
  ctx.ellipse(X, Y, 0.95, 0.48, 0, 0, Math.PI, false);
  paint(ctx, C.black, { dots: C.grey, density: 0.12 });
  ctx.beginPath();
  ctx.ellipse(X, Y, 0.95, 0.48, 0, 0, Math.PI * 2);
  paint(ctx, shade(C.grey, 0.3));
  if (Q.detail) {
    ctx.beginPath();
    for (let i = -3; i <= 3; i++) { ctx.moveTo(X + i * 0.25 - 0.1, Y - 0.42 + Math.abs(i) * 0.03); ctx.lineTo(X + i * 0.25 + 0.1, Y + 0.42 - Math.abs(i) * 0.03); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.stroke();
    // sausages
    for (const [sx, sy] of [[-0.45, 0.05], [-0.3, 0.2]]) {
      ctx.beginPath(); ctx.roundRect(X + sx - 0.18, Y + sy - 0.05, 0.36, 0.1, 0.05); paint(ctx, C.red, { lw: 0.02 });
    }
    for (const [sx, sy] of [[0.4, -0.05], [0.15, 0.22]]) {
      ctx.beginPath(); ctx.ellipse(X + sx, Y + sy, 0.16, 0.08, 0, 0, Math.PI * 2); paint(ctx, C.brown, { lw: 0.02 });
    }
  }
}

// ---------- The zone ----------
export default {
  id: 'roof',
  name: 'The Roof',
  blurb: 'The pigeon keeper has counted his flock twice and keeps getting one extra, bigger bird. Also, someone is having a barbecue right under the NO BARBECUES sign.',

  build(R) {
    // Speech bubbles are queued while people draw, then painted last so
    // notes, smoke and string lights never cover the words.
    const talk = [];
    const say = (...a) => { if (talk.length > 40) talk.length = 0; talk.push(a); };
    // Surface: gravel and tar, with a timber deck in the front corner.
    R.floor((ctx) => {
      slab(ctx, C.greyLight);
      rect(ctx, 0, 0, 16, 16, 0, mix(C.grey, C.greyLight, 0.45), { dots: shade(C.grey, 0.25), density: 0.28, stroke: false });
      // tar patches
      const tar = alpha(C.navy, 0.18);
      for (const [cx, cy, w, d] of [[6.2, 4.4, 2.2, 1.0], [2.8, 11.2, 1.4, 2.3], [9.5, 10.6, 1.6, 0.9], [5.6, 15.2, 2.4, 0.6]]) {
        poly(ctx, [[cx - w / 2, cy - d / 2 + 0.2, 0], [cx + w / 2 - 0.3, cy - d / 2, 0], [cx + w / 2, cy + d / 2 - 0.1, 0], [cx - w / 2 + 0.4, cy + d / 2, 0]]);
        ctx.fillStyle = tar;
        ctx.fill();
      }
      planks(ctx, C.woodLight, 0.8, 10.6, 5.2, 5.4, 10.8);
      rect(ctx, 10.6, 5.2, 5.4, 10.8, 0.005, null, { lw: 0.05 });
      // puddle and drain
      disc(ctx, 7.4, 3.2, 0.01, 0.55, alpha(C.sky, 0.8), { stroke: false });
      disc(ctx, 8.0, 3.5, 0.01, 0.3, alpha(C.sky, 0.8), { stroke: false });
      disc(ctx, 15.2, 15.2, 0.01, 0.3, C.ink, { dots: C.grey, density: 0.5 });
      // chalk hopscotch by the kite kid
      if (Q.detail) {
        for (let i = 0; i < 4; i++) rect(ctx, 6.6 + i * 0.75, 14.4, 0.7, 0.7, 0.01, null, { stroke: alpha(C.white, 0.9), lw: 0.04 });
        paintText(ctx, 'floor', 10.0, 14.75, 'HOME', 0.28, alpha(C.white, 0.9));
      }
    });
    R.wall((ctx) => walls(ctx, { h: 1.0, left: C.greyLight, right: C.greyLight, cap: C.white }));

    // Graffiti and a notice on the parapet
    R.decor((ctx) => {
      if (!Q.detail) return;
      paintText(ctx, 'right', 3.6, 0.5, 'RENT IS DUE', 0.26, alpha(C.coral, 0.9));
      paintText(ctx, 'left', 13.8, 0.5, 'ANDY + LOLA', 0.24, alpha(C.purple, 0.85));
    });

    // Stair hut, aerial, satellite dish (the balloon gets snagged on the aerial)
    R.thing(HUT, HUT, (ctx) => stairHut(ctx));
    R.thing(2.9, 2.9, (ctx) => aerial(ctx), { depth: HUT * 2 + 0.1 });

    // A party balloon from 2B, snagged on the aerial (a find)
    const balloonAt = (t) => [1.75 + Math.sin(t * 1.3) * 0.12, 0.55 - Math.sin(t * 1.3) * 0.12, HUT + 3.7 + Math.sin(t * 2.1) * 0.08];
    R.air((ctx, t) => {
      const [bx, by, bz] = balloonAt(t);
      const [X, Y] = P(bx, by, bz);
      const [sx, sy] = P(1.4 + 0.5, 1.3 - 0.5, HUT + 3.08);
      ctx.beginPath();
      ctx.moveTo(X, Y + 0.34);
      ctx.quadraticCurveTo(X + 0.25, Y + 0.7, sx, sy);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(X, Y, 0.28, 0.34, Math.sin(t * 1.3) * 0.15, 0, Math.PI * 2);
      paint(ctx, C.pink, { lw: 0.04 });
      ctx.beginPath();
      ctx.moveTo(X - 0.06, Y + 0.4); ctx.lineTo(X + 0.06, Y + 0.4); ctx.lineTo(X, Y + 0.33);
      paint(ctx, C.pink, { lw: 0.02 });
      if (Q.detail) {
        ctx.beginPath(); ctx.ellipse(X - 0.1, Y - 0.12, 0.05, 0.09, 0.4, 0, Math.PI * 2);
        ctx.fillStyle = alpha(C.white, 0.8); ctx.fill();
        label(ctx, bx, by, bz, '2B', 0.18, C.white);
      }
    });

    // String lights along the back and over the barbecue
    R.air((ctx, t) => {
      if (!Q.detail) return;
      const strands = [
        [[HUT + 0.1, 0.2, HUT + 0.1], [TANK.x - 1.4, 0.5, 4.6], 0.8],
        [[TANK.x - 0.4, TANK.y + 1.3, 4.3], [LINE_X1, LINE_Y, LINE_Z + 0.1], 1.1],
      ];
      const cols = [C.butter, C.coral, C.mustard, C.pink, C.tealLight];
      strands.forEach(([a, b, d], si) => {
        const pts = sag(a, b, 14, d);
        strokePts(ctx, pts);
        for (let i = 1; i < pts.length - 1; i++) {
          const [X, Y] = P(...pts[i]);
          const on = Math.sin(t * 3 + i * 1.7 + si) > -0.3;
          ctx.beginPath();
          ctx.arc(X, Y + 0.12, 0.1, 0, Math.PI * 2);
          ctx.fillStyle = on ? cols[(i + si) % cols.length] : shade(C.grey, 0.3);
          ctx.fill();
          ctx.lineWidth = 0.025; ctx.strokeStyle = C.ink; ctx.stroke();
        }
      });
    });

    // ---------- Vegetable planters ----------
    R.thing(7.2, 1.7, (ctx) => {
      box(ctx, 3.9, 0.3, 0, 3.3, 1.4, 0.9, C.wood, { top: C.brown });
      if (Q.detail) {
        for (let i = 0; i < 5; i++) lettuce(ctx, 4.3 + i * 0.62, 1.25, 0.9, i % 2 ? C.leaf : C.green);
      }
      textX(ctx, 7.2, 1.0, 0.45, 'NO. 2B', 0.24, C.white);
    }, { depth: 7.0 });
    // sunflowers and tomato canes (they sway)
    R.thing(7.2, 1.0, (ctx, t) => {
      for (const [x, h] of [[4.3, 2.4], [5.1, 2.9], [5.9, 2.2]]) {
        const sw = Math.sin(t * 1.2 + x) * 0.08;
        const [bx, by] = P(x, 0.7, 0.9);
        const [tx, ty] = P(x + sw, 0.7 - sw, 0.9 + h);
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty);
        ctx.strokeStyle = C.green; ctx.lineWidth = 0.08; ctx.stroke();
        ctx.beginPath(); ctx.ellipse((bx + tx) / 2 + 0.15, (by + ty) / 2, 0.18, 0.08, -0.4, 0, Math.PI * 2); paint(ctx, C.leaf, { lw: 0.02 });
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * Math.PI * 2 + t * 0.1;
          ctx.beginPath(); ctx.ellipse(tx + Math.cos(a) * 0.26, ty + Math.sin(a) * 0.26, 0.14, 0.06, a, 0, Math.PI * 2);
          ctx.fillStyle = C.mustard; ctx.fill();
        }
        ctx.beginPath(); ctx.arc(tx, ty, 0.17, 0, Math.PI * 2); paint(ctx, C.brown, { dots: C.ink, density: 0.3, lw: 0.03 });
      }
      for (const x of [6.4, 6.85]) {
        face(ctx, [[x, 0.9, 0.9], [x, 0.9, 2.3]], null, { lw: 0.05, stroke: C.brown });
        if (Q.detail) for (let k = 0; k < 3; k++) {
          const [X, Y] = P(x + 0.08, 0.9, 1.3 + k * 0.35 + Math.sin(t * 1.4 + k) * 0.02);
          ctx.beginPath(); ctx.arc(X, Y, 0.1, 0, Math.PI * 2); paint(ctx, C.red, { lw: 0.02 });
        }
      }
    }, { anim: true, depth: 6.5 });

    R.thing(10.4, 1.7, (ctx, t) => {
      box(ctx, 7.6, 0.3, 0, 2.8, 1.4, 0.9, C.wood, { top: C.brown });
      // the prize marrow
      const [X, Y] = P(8.5, 1.0, 1.15);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.95, 0.32, -0.12, 0, Math.PI * 2);
      paint(ctx, C.green, { dots: C.leaf, density: 0.35 });
      if (Q.detail) {
        ctx.beginPath(); ctx.ellipse(X - 0.3, Y - 0.1, 0.4, 0.07, -0.12, 0, Math.PI * 2); ctx.fillStyle = alpha(C.mint, 0.6); ctx.fill();
        // rosette
        ctx.beginPath(); ctx.arc(X + 0.25, Y - 0.05, 0.16, 0, Math.PI * 2); paint(ctx, C.navy, { lw: 0.02 });
        ctx.beginPath(); ctx.moveTo(X + 0.2, Y + 0.05); ctx.lineTo(X + 0.12, Y + 0.35); ctx.lineTo(X + 0.3, Y + 0.08); ctx.lineTo(X + 0.36, Y + 0.34);
        ctx.strokeStyle = C.navy; ctx.lineWidth = 0.06; ctx.stroke();
        label(ctx, 8.62, 0.88, 1.15, '1', 0.16, C.butter);
        lettuce(ctx, 10.0, 1.4, 0.9, C.leaf);
        plant(ctx, 7.85, 1.4, 0.9, t, { kind: 'spiky', pot: false, scale: 0.4, leaf: C.green });
      }
      // the gnome (a find), half hidden in the lettuce
      const [gx, gy] = P(9.85, 0.75, 0.9);
      ctx.beginPath(); ctx.moveTo(gx - 0.16, gy - 0.3); ctx.lineTo(gx, gy - 0.72); ctx.lineTo(gx + 0.16, gy - 0.3); paint(ctx, C.red, { lw: 0.03 });
      ctx.beginPath(); ctx.arc(gx, gy - 0.26, 0.1, 0, Math.PI * 2); paint(ctx, SKIN[0], { lw: 0.02 });
      ctx.beginPath(); ctx.moveTo(gx - 0.1, gy - 0.22); ctx.lineTo(gx, gy - 0.02); ctx.lineTo(gx + 0.1, gy - 0.22); ctx.fillStyle = C.white; ctx.fill();
      ctx.beginPath(); ctx.roundRect(gx - 0.15, gy - 0.12, 0.3, 0.14, 0.05); paint(ctx, C.teal, { lw: 0.02 });
      textX(ctx, 10.4, 1.0, 0.45, 'NO. 1A', 0.24, C.white);
    }, { anim: true, depth: 9.8 });
    R.find({ id: 'gnome', label: 'A garden gnome', r: 0.7, at: [9.85, 0.75, 1.3] });

    // Gardener with a watering can, and the water
    R.mover(() => ({ x: 5.6, y: 2.75 }), (ctx, t) => {
      person(ctx, 5.6, 2.75, 0, folk(501, { pose: 'carry', dir: 'r', back: true, style: 'bun', hair: C.greyLight, top: C.green, bottom: C.navy, arms: [1.2 + Math.sin(t * 1.5) * 0.1, 0.4],
        hold: (g) => {
          g.beginPath(); g.roundRect(0.35, -0.25, 0.45, 0.35, 0.06); paint(g, C.teal, { lw: 0.04 });
          g.beginPath(); g.moveTo(0.78, -0.1); g.lineTo(1.15, -0.45); g.strokeStyle = C.ink; g.lineWidth = 0.08; g.stroke();
          g.strokeStyle = C.teal; g.lineWidth = 0.04; g.stroke();
        } }), t);
      if (!Q.detail) return;
      const [X, Y] = P(5.6, 2.75, 0);
      particles(t, 8, 0.6, (k, r) => {
        const x = X + 1.55 + k * 0.35 + r() * 0.1, y = Y - 1.7 + k * k * 1.3;
        ctx.beginPath(); ctx.arc(x, y, 0.045, 0, Math.PI * 2); ctx.fillStyle = C.water; ctx.fill();
      }, 51);
    }, { bias: 0.2 });

    // Old man on an upturned bucket, admiring his marrow
    R.mover(() => ({ x: 9.1, y: 2.9 }), (ctx, t) => {
      cylinder(ctx, 9.1, 2.9, 0, 0.32, 0.6, C.coral);
      person(ctx, 9.1, 2.9, -0.2, folk(502, { pose: 'sit', dir: 'r', back: true, style: 'bald', hat: 'cap', top: C.white, bottom: C.brown, arms: [0.9 + Math.sin(t * 0.8) * 0.1, 0.6] }), t);
      if (Q.detail && pulse(t, 11, 3) > 0.7) say(8.8, 2.6, 3.6, 'Beauty.', { size: 0.4 });
    });

    // ---------- Water tank, with a burger-stealing pigeon on top ----------
    R.thing(TANK.x + 1.4, TANK.y + 1.4, (ctx) => waterTank(ctx));

    // Phone guy hunting for one bar of signal
    const phone = route([[8.4, 3.7, 2], [9.9, 3.9], [9.7, 4.9, 3], [8.3, 4.6]], { speed: 0.8 });
    R.mover(phone, (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, folk(503, { pose: p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back, style: 'short', top: C.purple, arms: [Math.PI - 0.15, -0.2],
        hold: (g) => { g.beginPath(); g.roundRect(0.0, -1.2, 0.16, 0.26, 0.04); paint(g, C.ink, { lw: 0.02 }); } }), t);
      if (Q.detail && !p.moving) say(p.x, p.y, 3.0, p.y > 4.5 ? 'ONE BAR!' : 'Hello??', { size: 0.4 });
    });

    // ---------- Tuba vent: 3A practises the tuba, badly ----------
    R.thing(VENT.x, VENT.y, (ctx) => {
      cylinder(ctx, VENT.x, VENT.y, 0, 0.3, 1.2, C.grey, { top: C.ink });
      const [X, Y] = P(VENT.x, VENT.y, 1.45);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.62, 0.22, 0, 0, Math.PI * 2); paint(ctx, C.greyLight);
      box(ctx, VENT.x - 0.02, VENT.y - 0.02, 1.2, 0.04, 0.04, 0.25, C.ink, { flat: true, stroke: false });
      textX(ctx, VENT.x + 0.3, VENT.y, 0.6, '3A', 0.2, C.white);
    });
    R.air((ctx, t) => {
      if (!Q.detail) return;
      const cols = [C.navy, C.purple, C.coral];
      particles(t, 6, 4, (k, r, i) => {
        const x = VENT.x + Math.sin(k * 6 + i) * 0.4 + k * 0.8, y = VENT.y - k * 0.6, z = 1.6 + k * 4;
        ctx.save(); ctx.globalAlpha = k < 0.8 ? 1 : (1 - k) * 5;
        note(ctx, x, y, z, cols[i % 3], 0.9 + r() * 0.4);
        ctx.restore();
      }, 71);
      const s = pulse(t, 7) * 7;
      if (s > 3 && s < 4.3) say(VENT.x, VENT.y, 1.7, 'BWAAMP!', { size: 0.46 + ((s - 3) / 1.3) * 0.12, fill: C.butter, color: C.coral });
    });

    // Yoga on a mat next to the vent
    R.rug((ctx) => rect(ctx, 7.2, 9.3, 1.9, 1.0, 0.01, C.lilac, { dots: C.purple, density: 0.2, lw: 0.04 }));
    R.mover(() => ({ x: 8.2, y: 9.8 }), (ctx, t) => {
      const s = pulse(t, 7) * 7;
      const annoyed = s > 3.4 && s < 6.2;
      person(ctx, 8.2, 9.8, -0.62, folk(504, { pose: 'sit', dir: 'l', style: 'pony', hair: C.brown, top: C.teal, bottom: C.purple,
        arms: annoyed ? [Math.PI - 0.4, -Math.PI + 0.4] : [Math.PI - 0.9, -Math.PI + 0.9] }), t);
      if (!Q.detail) return;
      if (s < 3) say(8.0, 9.6, 2.6, 'Ommmm...', { size: 0.4 });
      else if (annoyed) say(8.0, 9.6, 2.6, 'REALLY, 3A?', { size: 0.4 });
    });

    // ---------- Pigeon coop, keeper, flock (and the goose) ----------
    R.thing(2.6, 9.5, (ctx, t) => coop(ctx, t), { anim: true });

    const flock = [[3.6, 6.3], [4.8, 6.6], [3.9, 7.4], [5.4, 7.9], [3.6, 8.8], [4.6, 9.3], [5.7, 6.2], [5.6, 9.2], [3.2, 10.0]];
    flock.forEach(([fx, fy], i) => {
      R.mover((t) => {
        const hop = Math.floor((t + i * 1.3) / 3);
        const dx = (hash(i, hop) - 0.5) * 0.5, dy = (hash(i + 9, hop) - 0.5) * 0.5;
        return { x: fx + dx, y: fy + dy, dir: hash(i, hop + 3) > 0.5 ? 'r' : 'l' };
      }, (ctx, t, p) => pigeon(ctx, p.x, p.y, 0, t, { dir: p.dir, peck: true, ph: i * 1.7, s: 1.3, body: i === 3 ? C.greyLight : i === 5 ? mix(C.grey, C.brown, 0.3) : C.grey }));
    });
    // pigeons perched on the landing board and ridge
    for (const [py, pz, px, dir] of [[6.3, 1.88, 3.0, 'r'], [8.4, 1.88, 3.1, 'l'], [7.0, 3.8, 1.4, 'r'], [8.9, 3.8, 1.4, 'l']]) {
      R.thing(px, py, (ctx, t) => pigeon(ctx, px, py, pz, t, { dir, ph: py, peck: pz < 3 }), { anim: true, depth: 12.2 + py * 0.01 });
    }

    // The goose, pecking among the pigeons as if nobody would notice
    const gooseWalk = route([[4.3, 7.8, 3], [5.0, 8.6, 2], [4.2, 8.4, 2.5]], { speed: 0.5 });
    R.goose((t) => { const p = gooseWalk(t); return { ...p, z: 0, pose: p.moving ? 'walk' : (pulse(t, 13) > 0.85 ? 'honk' : 'peck') }; });

    // The pigeon keeper with his flag pole, counting
    R.mover(() => ({ x: 5.6, y: 10.7 }), (ctx, t) => {
      const sw = Math.sin(t * 2.2);
      person(ctx, 5.6, 10.7, 0, folk(505, { pose: 'stand', dir: 'l', style: 'short', hair: C.greyLight, hat: 'cap', top: C.brown, bottom: C.navy,
        arms: [2.4 + sw * 0.3, -0.3],
        hold: (g) => {
          g.save();
          g.rotate(sw * 0.3);
          g.beginPath(); g.moveTo(0.3, -0.2); g.lineTo(0.9, -3.0);
          g.strokeStyle = C.ink; g.lineWidth = 0.07; g.stroke();
          g.beginPath();
          g.moveTo(0.9, -3.0);
          g.quadraticCurveTo(1.3, -3.0 + Math.sin(t * 8) * 0.12, 1.6, -2.85);
          g.lineTo(1.5, -2.45);
          g.quadraticCurveTo(1.2, -2.6 + Math.sin(t * 8 + 1) * 0.12, 0.82, -2.6);
          paint(g, C.red, { lw: 0.03 });
          g.restore();
        } }), t);
      if (!Q.detail) return;
      const k = Math.floor(pulse(t, 12) * 6);
      const says = ['...12', '...13', '...14', '...15', '...16?', 'Big one.'][k];
      say(5.4, 10.5, 3.2, says, { size: 0.4 });
    });

    // Pigeons circling over the coop, one landing now and then
    R.air((ctx, t) => {
      for (let i = 0; i < 5; i++) {
        const a = t * 0.7 + (i / 5) * Math.PI * 2;
        const x = 3.2 + Math.cos(a) * (2.4 + (i % 2) * 0.6), y = 7.5 + Math.sin(a) * (2.4 + (i % 2) * 0.6);
        const z = 5.6 + Math.sin(t * 1.3 + i) * 0.5 + (i % 3) * 0.4;
        pigeon(ctx, x, y, z, t, { fly: true, dir: -Math.sin(a) - Math.cos(a) > 0 ? 'r' : 'l', ph: i });
      }
      // a sixth one drops in to land on the ridge
      const s = pulse(t, 9, 2) * 9;
      if (s < 3) {
        const q = ease(s / 3);
        const x = 6 - q * 4.4, y = 4 + q * 3.8, z = 6.5 - q * (6.5 - 3.8) + Math.sin(q * Math.PI) * 0.6;
        pigeon(ctx, x, y, z, t, { fly: true, dir: 'l', ph: 7 });
      }
    });

    // Cat on the parapet, watching the pigeons very closely
    R.decor((ctx, t) => {
      const [X, Y] = P(-0.22, 11.6, 1.0);
      ctx.save();
      ctx.translate(X, Y);
      ctx.beginPath();
      ctx.moveTo(0.18, -0.1);
      ctx.quadraticCurveTo(0.6, -0.2 + Math.sin(t * 2.5) * 0.2, 0.5, -0.6 + Math.sin(t * 2.5) * 0.15);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.14; ctx.lineCap = 'round'; ctx.stroke();
      ctx.strokeStyle = C.mustard; ctx.lineWidth = 0.08; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, -0.25, 0.25, 0.28, 0, 0, Math.PI * 2); paint(ctx, C.mustard, { dots: C.coral, density: 0.3, lw: 0.04 });
      ctx.beginPath(); ctx.arc(-0.02, -0.62, 0.17, 0, Math.PI * 2);
      ctx.moveTo(-0.17, -0.7); ctx.lineTo(-0.14, -0.9); ctx.lineTo(-0.04, -0.77);
      ctx.moveTo(0.04, -0.77); ctx.lineTo(0.12, -0.9); ctx.lineTo(0.15, -0.7);
      paint(ctx, C.mustard, { lw: 0.04 });
      if (Q.detail) {
        ctx.fillStyle = C.ink;
        ctx.beginPath(); ctx.arc(-0.08, -0.64, 0.03, 0, Math.PI * 2); ctx.arc(0.05, -0.64, 0.03, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }, { anim: true });

    // ---------- Barbecue, with the burger heist ----------
    const HEIST = 10;
    const perch = [TANK.x, TANK.y, TANK_TOP];
    const apex = [GRILL.x, GRILL.y, GRILL.z + 2.8];
    const burgerAt = (t) => {
      const s = pulse(t, HEIST) * HEIST;
      if (s < 1.2 || s > 8.5) return { on: 'grill' };
      if (s < 2.0) { const q = 1 - Math.pow(1 - (s - 1.2) / 0.8, 2); return { on: 'air', x: GRILL.x, y: GRILL.y, z: GRILL.z + 0.1 + q * 2.7, spin: s * 9 }; }
      return { on: 'bird' };
    };
    const thief = (t) => {
      const s = pulse(t, HEIST) * HEIST;
      const lerp = (a, b, q) => [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q, a[2] + (b[2] - a[2]) * q];
      if (s < 1.0) return { p: perch, fly: false, dir: 'l' };
      if (s < 2.0) { const q = ease((s - 1.0) / 1.0); const p = lerp(perch, apex, q); p[2] += Math.sin(q * Math.PI) * 0.8; return { p, fly: true, dir: 'l' }; }
      if (s < 3.4) { const q = ease((s - 2.0) / 1.4); const p = lerp(apex, perch, q); p[2] += Math.sin(q * Math.PI) * 1.2; return { p, fly: true, dir: 'r', carry: true }; }
      return { p: perch, fly: false, dir: 'r', carry: s < 8.5, eat: 1 - clamp((s - 3.4) / 5) };
    };
    R.thing(GRILL.x + 0.6, GRILL.y + 0.6, (ctx) => grill(ctx));
    R.air((ctx, t) => {
      // the burger (on the grill, in the air, or in a beak)
      const b = burgerAt(t);
      if (b.on === 'grill') { const [X, Y] = P(GRILL.x + 0.1, GRILL.y - 0.25, GRILL.z); burger(ctx, X, Y, 0.8); }
      if (b.on === 'air') { const [X, Y] = P(b.x, b.y, b.z); burger(ctx, X, Y, 1, b.spin); }
      const th = thief(t);
      pigeon(ctx, th.p[0], th.p[1], th.p[2], t, {
        fly: th.fly, dir: th.dir, ph: 3, peck: !th.fly && th.carry, s: 1.1,
        hold: th.carry ? (g) => burger(g, th.fly ? 0.34 : 0.3, th.fly ? -0.08 : -0.02, th.fly ? 0.7 : 0.7 * (0.35 + 0.65 * (th.eat ?? 1))) : null,
      });
      // smoke
      if (!Q.detail) return;
      particles(t, 12, 2.6, (k, r) => {
        const x = GRILL.x + (r() - 0.5) * 0.5 + k * 1.2, y = GRILL.y + (r() - 0.5) * 0.5 - k * 0.9, z = GRILL.z + 0.3 + k * 2.6;
        const [X, Y] = P(x, y, z);
        ctx.beginPath(); ctx.arc(X, Y, 0.1 + k * 0.32, 0, Math.PI * 2);
        ctx.fillStyle = alpha(C.white, 0.5 * (1 - k)); ctx.fill();
      }, 81);
    });

    // The griller
    R.mover(() => ({ x: 12.1, y: 8.7 }), (ctx, t) => {
      const s = pulse(t, HEIST) * HEIST;
      const flip = s > 1.0 && s < 1.5;
      const angry = s > 2.0 && s < 5.5;
      person(ctx, 12.1, 8.7, 0, folk(506, { pose: angry ? 'point' : flip ? 'cheer' : 'drum', dir: 'r', style: 'short', hair: C.ink, hat: 'chef', top: C.white, bottom: C.navy,
        arms: angry ? [2.6 + Math.sin(t * 14) * 0.25, -0.2] : undefined,
        hold: (g) => { g.beginPath(); g.moveTo(0.2, 0); g.lineTo(0.75, -0.3); g.strokeStyle = C.ink; g.lineWidth = 0.06; g.stroke(); g.fillStyle = C.grey; g.fillRect(0.7, -0.4, 0.2, 0.14); } }), t);
      if (!Q.detail) return;
      if (angry) say(11.9, 8.5, 3.3, 'OI! MY BURGER!', { size: 0.42 });
      else if (s > 6.5 && s < 9) say(11.9, 8.5, 3.3, 'Next!', { size: 0.4 });
    }, { bias: 0 });

    // Queue with paper plates
    [[11.3, 10.3, 507, 'r'], [10.7, 11.7, 508, 'r']].forEach(([x, y, seed, dir], i) => {
      R.mover(() => ({ x, y }), (ctx, t) => {
        person(ctx, x, y, 0, folk(seed, { pose: 'carry', dir, back: true, arms: [1.3, 1.2],
          hold: (g) => { g.beginPath(); g.ellipse(0.55, -0.02, 0.3, 0.08, 0, 0, Math.PI * 2); paint(g, C.white, { lw: 0.03 }); } }), t);
        if (i === 1 && Q.detail && pulse(t, 10) > 0.3 && pulse(t, 10) < 0.5) say(x - 0.2, y - 0.2, 3.1, 'Still waiting', { size: 0.36, dx: -1.2 });
      });
    });

    // Picnic table on the deck
    R.thing(15.4, 13.8, (ctx) => {
      box(ctx, 12.9, 11.7, 0.7, 2.6, 0.4, 0.1, C.wood);
      table(ctx, 12.9, 12.3, 2.6, 1.0, 1.2, C.wood);
      box(ctx, 12.9, 13.6, 0.7, 2.6, 0.4, 0.1, C.wood);
      rect(ctx, 13.2, 12.4, 2.0, 0.8, 1.21, C.coral, { dots: C.white, density: 0.5, lw: 0.03 });
      if (Q.detail) {
        cylinder(ctx, 13.7, 12.7, 1.21, 0.12, 0.3, C.red, { flat: true });
        cylinder(ctx, 14.9, 12.9, 1.21, 0.12, 0.3, C.mustard, { flat: true });
        disc(ctx, 14.3, 12.6, 1.23, 0.28, C.white, { lw: 0.03 });
        disc(ctx, 14.3, 12.6, 1.25, 0.14, C.brown, { lw: 0.02 });
      }
    }, { depth: 26 });
    // Somebody's false teeth, chattering away on the table (a find)
    R.thing(15.05, 12.55, (ctx, t) => {
      const [X0, Y0] = P(15.05, 12.55, 1.22);
      ctx.save(); ctx.translate(X0, Y0); ctx.scale(1.4, 1.4);
      const X = 0, Y = 0;
      const open = Math.abs(Math.sin(t * 9)) * 0.08 * (pulse(t, 3) < 0.6 ? 1 : 0);
      ctx.beginPath(); ctx.ellipse(X, Y - 0.06, 0.22, 0.09, 0, Math.PI, 0); paint(ctx, C.pink, { lw: 0.03 });
      ctx.beginPath(); ctx.ellipse(X, Y - 0.1 - open, 0.22, 0.09, 0, Math.PI, 0); ctx.lineTo(X - 0.22, Y - 0.1 - open);
      paint(ctx, C.pink, { lw: 0.03 });
      ctx.fillStyle = C.white;
      for (let i = -3; i <= 3; i++) {
        ctx.fillRect(X + i * 0.055 - 0.022, Y - 0.1 - open, 0.044, 0.07);
        ctx.fillRect(X + i * 0.055 - 0.022, Y - 0.12, 0.044, 0.06);
      }
      ctx.restore();
    }, { anim: true, depth: 26.1 });
    R.find({ id: 'teeth', label: 'A pair of false teeth', r: 0.6, at: [15.05, 12.55, 1.3] });

    R.mover(() => ({ x: 14.2, y: 11.7 }), (ctx, t) => {
      person(ctx, 14.2, 11.7, 0.0, folk(509, { pose: 'sit', dir: 'l', style: 'curly', top: C.mustard, arms: [1.5 + Math.abs(Math.sin(t * 3)) * 0.8, 0.9] }), t);
    }, { bias: -0.3 });
    R.mover(() => ({ x: 14.0, y: 14.2 }), (ctx, t) => {
      person(ctx, 14.0, 14.2, 0.0, folk(510, { pose: 'sit', dir: 'r', back: true, style: 'long', top: C.pink, arms: [1.6, 1.0] }), t);
    }, { bias: 0.5 });

    // ---------- Washing line ----------
    for (const px of [LINE_X0, LINE_X1]) {
      R.thing(px, LINE_Y, (ctx) => {
        box(ctx, px - 0.07, LINE_Y - 0.07, 0, 0.14, 0.14, LINE_Z + 0.1, C.white, { flat: true });
        face(ctx, [[px, LINE_Y - 0.5, LINE_Z + 0.1], [px, LINE_Y + 0.5, LINE_Z + 0.1]], null, { lw: 0.08 });
      });
    }
    R.thing(LINE_X0, LINE_Y, (ctx) => {
      const pts = [];
      for (let i = 0; i <= 16; i++) { const x = LINE_X0 + ((LINE_X1 - LINE_X0) * i) / 16; pts.push([x, LINE_Y, lineZ(x)]); }
      strokePts(ctx, pts, C.ink, 0.035);
    }, { depth: LINE_X0 + LINE_Y + 0.01 });
    const pieces = [
      [3.9, 1.5, 1.5, C.sky, { stripe: C.white }],
      [5.6, 0.9, 1.0, C.coral, { dots: C.white }],
      [7.5, 1.6, 1.6, C.butter, { stripe: C.teal }],
      [9.3, 0.55, 0.7, C.purple, {}],
    ];
    pieces.forEach(([x0, w, h, col, o]) => R.thing(x0 + w / 2, LINE_Y, (ctx, t) => washing(ctx, x0, w, h, t, col, o), { anim: true }));
    // the rubber chicken, pegged up by its feet (a find)
    const chick = (t) => { const sw = Math.sin(t * 3.1) * 0.12; return [6.95, LINE_Y + 0.25 + sw, lineZ(6.95) - 0.55]; };
    R.thing(6.95, LINE_Y, (ctx, t) => {
      const [x, y, z] = chick(t);
      const [tx, ty] = P(6.95, LINE_Y, lineZ(6.95));
      const [X, Y] = P(x, y, z);
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(X, Y - 0.2);
      ctx.strokeStyle = C.coral; ctx.lineWidth = 0.05; ctx.stroke();
      ctx.save(); ctx.translate(X, Y); ctx.rotate((x - 6.95) * 0.2 + Math.sin(t * 3.1) * 0.2);
      ctx.beginPath(); ctx.ellipse(0, 0, 0.12, 0.28, 0, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.03 });
      ctx.beginPath(); ctx.arc(0, 0.34, 0.1, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.03 });
      ctx.beginPath(); ctx.moveTo(0.06, 0.4); ctx.lineTo(0.2, 0.44); ctx.lineTo(0.05, 0.47); ctx.fillStyle = C.coral; ctx.fill();
      ctx.beginPath(); ctx.arc(-0.07, 0.42, 0.05, 0, Math.PI * 2); ctx.arc(-0.05, 0.48, 0.04, 0, Math.PI * 2); ctx.fillStyle = C.red; ctx.fill();
      ctx.restore();
      if (Q.detail) { ctx.fillStyle = C.coral; ctx.fillRect(tx - 0.03, ty - 0.1, 0.06, 0.2); }
    }, { anim: true });
    R.find({ id: 'chicken', label: 'A rubber chicken', r: 0.7, at: (t) => { const c = chick(t); return [c[0], c[1], c[2]]; } });

    // Pegging out the washing
    R.mover(() => ({ x: 8.4, y: 13.8 }), (ctx, t) => {
      const reach = Math.sin(t * 1.4) > 0;
      person(ctx, 8.4, 13.8, 0, folk(511, { pose: 'stand', dir: 'r', back: true, style: 'long', hair: C.red, dress: true, top: C.teal, arms: reach ? [Math.PI - 0.5, -Math.PI + 0.7] : [0.6, -0.2] }), t);
    });
    // basket at their feet
    R.thing(9.4, 14.3, (ctx) => {
      cylinder(ctx, 9.3, 14.1, 0, 0.42, 0.45, C.woodLight, { top: C.white });
      if (Q.detail) { disc(ctx, 9.25, 14.05, 0.46, 0.25, C.pink, { lw: 0.02 }); }
    });

    // Neighbor coming up the stairs with more laundry, and going back for more
    const DOOR_PT = [1.7, 3.7];
    const carrier = route([[DOOR_PT[0], DOOR_PT[1], 3], [3.8, 4.4], [6.4, 6.2], [6.3, 11.4], [5.4, 13.9, 2.5], [6.3, 11.4], [6.4, 6.2], [3.8, 4.4]], { speed: 1.1, offset: 2 });
    R.mover(carrier, (ctx, t, p) => {
      const d = Math.hypot(p.x - DOOR_PT[0], p.y - DOOR_PT[1]);
      const a = clamp(d / 0.9);
      if (a <= 0.01) return;
      const full = !p.back;
      ctx.save(); ctx.globalAlpha = a;
      person(ctx, p.x, p.y, 0, folk(512, { pose: p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back, style: 'short', hair: C.ink, top: C.coral, bottom: C.teal, arms: full ? [1.3, 1.2] : undefined,
        hold: full ? (g) => { g.beginPath(); g.roundRect(0.1, -0.35, 0.8, 0.45, 0.1); paint(g, C.woodLight, { lw: 0.04 }); g.beginPath(); g.ellipse(0.5, -0.36, 0.34, 0.12, 0, 0, Math.PI * 2); paint(g, C.sky, { lw: 0.03 }); } : null }), t);
      ctx.restore();
    });

    // ---------- Sunbather in the left corner ----------
    R.thing(3.5, 14.8, (ctx, t) => {
      lounger(ctx, 0.8, 13.8, C.teal);
      person(ctx, 2.3, 14.3, 0.55, folk(513, { pose: 'lie', dir: 'l', style: 'short', top: C.red, bottom: C.red, hat: 'sun' }), t);
      // a pigeon, standing on their tummy
      pigeon(ctx, 2.5, 14.3, 1.05, t, { dir: 'r', ph: 5, peck: true });
    }, { anim: true });
    R.thing(1.0, 15.6, (ctx, t) => {
      const b = Math.abs(Math.sin(t * 6)) * 0.05;
      box(ctx, 0.5, 15.1, 0, 1.0, 0.5, 0.55 + b, C.navy);
      if (Q.detail) {
        disc(ctx, 0.75, 15.6, 0.3, 0.12, C.grey, { lw: 0.02 });
        disc(ctx, 1.25, 15.6, 0.3, 0.12, C.grey, { lw: 0.02 });
        const k = (t * 0.8) % 1;
        note(ctx, 1.0 + k * 0.3, 15.4 + k * 0.3, 1.0 + k * 1.2, alpha(C.pink, 1 - k), 0.8);
      }
    }, { anim: true });

    // Hopscotch
    const hop = route([[6.9, 14.75, 0.8], [9.3, 14.75, 0.8]], { speed: 1.4, loop: false });
    R.mover(hop, (ctx, t, p) => {
      const z = p.moving ? Math.abs(Math.sin(t * 6)) * 0.35 : 0;
      person(ctx, p.x, p.y, z, folk(515, { pose: p.moving ? 'jump' : 'stand', dir: p.dir, scale: 0.68, style: 'bun', top: C.pink, bottom: C.navy, speed: 3 }), t);
    });

    // ---------- Kite kid on the deck ----------
    const kiteAt = (t) => [19 + Math.sin(t * 0.7) * 0.5, 11 + Math.cos(t * 0.5) * 0.6, 7.5 + Math.sin(t * 1.1) * 0.3];
    R.mover(() => ({ x: KITE_KID[0], y: KITE_KID[1] }), (ctx, t) => {
      const tug = Math.sin(t * 2) * 0.15;
      person(ctx, KITE_KID[0], KITE_KID[1], 0, folk(514, { pose: 'stand', dir: 'r', scale: 0.72, style: 'pony', top: C.mustard, bottom: C.teal, arms: [Math.PI * 0.75 + tug, 2.0 + tug] }), t);
    });
    R.air((ctx, t) => {
      const [kx, ky, kz] = kiteAt(t);
      const [hx, hy] = P(KITE_KID[0], KITE_KID[1], 0);
      const [X, Y] = P(kx, ky, kz);
      const handX = hx + 0.7 * 0.72, handY = hy - 1.95 * 0.72;
      ctx.beginPath(); ctx.moveTo(handX, handY);
      ctx.quadraticCurveTo((handX + X) / 2 + 0.6, (handY + Y) / 2 + 1.0, X, Y + 0.5);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
      ctx.save(); ctx.translate(X, Y); ctx.rotate(Math.sin(t * 1.7) * 0.2);
      ctx.beginPath(); ctx.moveTo(0, -0.6); ctx.lineTo(0.45, 0); ctx.lineTo(0, 0.6); ctx.lineTo(-0.45, 0); ctx.closePath();
      paint(ctx, C.coral, { lw: 0.05 });
      ctx.beginPath(); ctx.moveTo(0, -0.6); ctx.lineTo(0, 0.6); ctx.lineTo(-0.45, 0); ctx.closePath();
      paint(ctx, C.mustard, { lw: 0.05 });
      ctx.beginPath(); ctx.moveTo(0, 0.6);
      for (let i = 1; i <= 8; i++) ctx.lineTo(Math.sin(t * 4 + i) * 0.18, 0.6 + i * 0.22);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
      if (Q.detail) for (let i = 2; i <= 8; i += 2) {
        const bx = Math.sin(t * 4 + i) * 0.18, by = 0.6 + i * 0.22;
        ctx.beginPath(); ctx.moveTo(bx - 0.1, by - 0.05); ctx.lineTo(bx + 0.1, by + 0.05); ctx.lineTo(bx + 0.1, by - 0.05); ctx.lineTo(bx - 0.1, by + 0.05); ctx.closePath();
        ctx.fillStyle = i % 4 ? C.teal : C.pink; ctx.fill();
      }
      ctx.restore();
    });

    // Deck chair reader, cooler, and the one person reading the building notices
    R.thing(15.6, 10.4, (ctx, t) => {
      const x = 14.6, y = 9.3;
      box(ctx, x, y, 0, 1.1, 1.0, 0.1, C.brown, { flat: true });
      face(ctx, [[x + 0.1, y, 0.5], [x + 0.1, y + 1.0, 0.5], [x + 1.1, y + 1.0, 0.1], [x + 1.1, y, 0.1]], C.coral, { dots: C.white, density: 0.35 });
      face(ctx, [[x + 0.1, y, 0.5], [x + 0.1, y + 1.0, 0.5], [x - 0.2, y + 1.0, 1.6], [x - 0.2, y, 1.6]], tint(C.coral, 0.2), { dots: C.white, density: 0.35 });
      const turn = pulse(t, 6) > 0.85;
      person(ctx, x + 0.6, y + 0.5, -0.2, folk(516, { pose: 'sit', dir: 'r', style: 'bald', hair: C.grey, top: C.sky, bottom: C.white, arms: [1.25, 1.1],
        hold: (g) => {
          g.beginPath(); g.rect(0.25, -0.55, turn ? 0.35 : 0.7, 0.6); paint(g, C.white, { lw: 0.03 });
          if (Q.detail) { g.fillStyle = C.grey; for (let i = 0; i < 4; i++) g.fillRect(0.3, -0.45 + i * 0.13, turn ? 0.25 : 0.6, 0.05); }
        } }), t);
    }, { anim: true });
    R.thing(15.6, 7.7, (ctx) => {
      box(ctx, 14.9, 6.9, 0, 1.0, 0.7, 0.7, C.tealLight, { top: C.white });
      box(ctx, 15.05, 7.1, 0.7, 0.7, 0.3, 0.06, C.white, { flat: true });
      if (Q.detail) textX(ctx, 15.9, 7.25, 0.35, 'ICE', 0.2, C.navy);
    });

    // Potted herbs and a deck chair on the deck edge
    for (const [x, y, kind, pc] of [[15.3, 5.8, 'spiky', C.white], [0.8, 11.0, 'bush', C.teal], [11.6, 15.3, 'leafy', C.mustard]]) {
      R.thing(x, y, (ctx, t) => plant(ctx, x, y, 0, t, { kind, scale: 0.8, potColor: pc, leaf: C.green }), { anim: true });
    }

    R.air((ctx) => {
      for (const a of talk) speech(ctx, ...a);
      talk.length = 0;
    });
  },
};

