// Rooftop Pool: a water tower, a diving board with a committed diver,
// a flamingo float, and a lifeguard who has seen enough running today.
import {
  C, box, rect, disc, cylinder, face, poly, paint, person, folk, plant, walls, slab, planks,
  speech, shade, tint, alpha, dots, Q, label, P,
} from '../art.js';
import { route, orbit, particles, pulse, clamp } from '../actors.js';
import { ZK } from '../iso.js';

const WATER_Z = -0.35;
const PX0 = 4, PY0 = 4.5, PX1 = 12.5, PY1 = 12.5; // pool edges

function parasol(ctx, x, y, t, a = C.coral, b = C.white) {
  box(ctx, x - 0.06, y - 0.06, 0, 0.12, 0.12, 3.1, C.ink, { flat: true, stroke: false });
  const n = 10, r = 1.7, z = 3.1;
  const [ax, ay] = P(x, y, z + 0.8);
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    const [x0, y0] = P(x + Math.cos(a0) * r, y + Math.sin(a0) * r, z);
    const [x1, y1] = P(x + Math.cos(a1) * r, y + Math.sin(a1) * r, z);
    ctx.beginPath();
    ctx.moveTo(ax, ay); ctx.lineTo(x0, y0); ctx.lineTo(x1, y1); ctx.closePath();
    paint(ctx, i % 2 ? a : b, { lw: 0.04 });
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

function waterTower(ctx, t) {
  const cx = 2.6, cy = 2.6;
  // stilts and cross bracing
  for (const [lx, ly] of [[1.3, 1.3], [3.7, 1.3], [1.3, 3.7], [3.7, 3.7]]) {
    box(ctx, lx, ly, 0, 0.22, 0.22, 5, C.brown, { flat: true });
  }
  face(ctx, [[1.4, 3.8, 0.6], [3.8, 3.8, 4.6]], null, { lw: 0.08, stroke: C.brown });
  face(ctx, [[3.8, 1.4, 0.6], [3.8, 3.8, 4.6]], null, { lw: 0.08, stroke: C.brown });
  box(ctx, 1.1, 1.1, 5, 3.0, 3.0, 0.18, C.brown);
  cylinder(ctx, cx, cy, 5.18, 1.45, 2.7, C.wood, { top: C.woodLight });
  // hoops
  for (const hz of [5.7, 6.5, 7.3]) {
    const [X, Y] = P(cx, cy, hz);
    ctx.beginPath();
    ctx.ellipse(X, Y, 1.45 * Math.SQRT2, 0.725 * Math.SQRT2, 0, 0, Math.PI);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.07;
    ctx.stroke();
  }
  // conical roof
  const [ax, ay] = P(cx, cy, 9.1);
  const [X, Y] = P(cx, cy, 7.88);
  ctx.beginPath();
  ctx.moveTo(X - 1.6 * Math.SQRT2, Y);
  ctx.lineTo(ax, ay);
  ctx.lineTo(X + 1.6 * Math.SQRT2, Y);
  ctx.ellipse(X, Y, 1.6 * Math.SQRT2, 0.8 * Math.SQRT2, 0, 0, Math.PI);
  paint(ctx, C.navy, { dots: C.ink, density: 0.3 });
  // painted name
  label(ctx, cx + 1.2, cy + 1.2, 6.1, 'SQ', 0.7, C.coral);
}

export default {
  id: 'pool',
  name: 'Rooftop Pool',
  blurb: 'The diver has been "about to jump" since noon. The lifeguard has a whistle and opinions.',

  build(R) {
    R.floor((ctx) => {
      slab(ctx, C.greyLight);
      planks(ctx, C.woodLight, 0.8);
      // coping around the pool
      rect(ctx, PX0 - 0.45, PY0 - 0.45, PX1 - PX0 + 0.9, PY1 - PY0 + 0.9, 0.01, C.white, { lw: 0.05 });
      if (Q.detail) {
        for (let x = PX0 - 0.45; x < PX1 + 0.4; x += 0.9) face(ctx, [[x, PY0 - 0.45, 0.01], [x, PY0, 0.01]], null, { lw: 0.02, stroke: C.grey });
      }
    });
    R.wall((ctx) => walls(ctx, { h: 1.0, left: C.greyLight, right: C.greyLight, cap: C.white }));

    // Pool: inner walls, then animated water.
    R.rug((ctx) => {
      face(ctx, [[PX0, PY0, 0], [PX0, PY1, 0], [PX0, PY1, -1.2], [PX0, PY0, -1.2]], C.tealLight, { dots: C.teal, density: 0.3 });
      face(ctx, [[PX0, PY0, 0], [PX1, PY0, 0], [PX1, PY0, -1.2], [PX0, PY0, -1.2]], shade(C.tealLight, 0.1), { dots: C.teal, density: 0.2 });
    });
    R.rug((ctx, t) => {
      poly(ctx, [[PX0, PY0, WATER_Z], [PX1, PY0, WATER_Z], [PX1, PY1, WATER_Z], [PX0, PY1, WATER_Z]]);
      ctx.fillStyle = alpha(C.water, 0.92);
      ctx.fill();
      if (!Q.detail) return;
      ctx.save();
      ctx.clip();
      ctx.fillStyle = dots(C.teal, 0.25);
      ctx.fill();
      // lane lines on the pool floor
      for (const ly of [6.5, 8.5, 10.5]) face(ctx, [[PX0 + 0.8, ly, -1.2], [PX1 - 0.8, ly, -1.2]], null, { lw: 0.18, stroke: alpha(C.navy, 0.35) });
      // drifting light ripples
      ctx.strokeStyle = alpha(C.white, 0.8);
      ctx.lineWidth = 0.07;
      ctx.lineCap = 'round';
      for (let i = 0; i < 16; i++) {
        const y = PY0 + 0.4 + (i % 8) * 1.0 + (i > 7 ? 0.5 : 0);
        const x = PX0 + ((i * 2.3 + t * 0.35 * (i % 2 ? 1 : -0.7)) % (PX1 - PX0) + (PX1 - PX0)) % (PX1 - PX0);
        ctx.beginPath();
        for (let k = 0; k <= 6; k++) {
          const [X, Y] = P(x + k * 0.22, y + Math.sin(t * 2 + k + i) * 0.08, WATER_Z);
          k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }, { anim: true });

    // Water tower and bunting to the corners
    R.thing(4.2, 4.2, (ctx, t) => waterTower(ctx, t));
    R.air((ctx, t) => {
      if (!Q.detail) return;
      const lines = [[[3.8, 3.8, 5], [15.5, 0.3, 1.1]], [[3.8, 3.8, 5], [0.3, 15.5, 1.1]]];
      const cols = [C.coral, C.mustard, C.teal, C.pink, C.navy];
      lines.forEach(([a, b], li) => {
        const n = 16;
        ctx.beginPath();
        const pts = [];
        for (let i = 0; i <= n; i++) {
          const k = i / n;
          const sag = Math.sin(k * Math.PI) * (1.3 + Math.sin(t * 1.5 + li) * 0.1);
          pts.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k - sag]);
        }
        pts.forEach((p, i) => { const [X, Y] = P(...p); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 0.04;
        ctx.stroke();
        for (let i = 1; i < n; i++) {
          const [X, Y] = P(...pts[i]);
          const sw = Math.sin(t * 3 + i) * 0.08;
          ctx.beginPath();
          ctx.moveTo(X - 0.22, Y); ctx.lineTo(X + 0.22, Y); ctx.lineTo(X + sw, Y + 0.55);
          ctx.closePath();
          ctx.fillStyle = cols[(i + li) % cols.length];
          ctx.fill();
        }
      });
    });

    // Diving board
    R.thing(8, 3, (ctx) => {
      box(ctx, 7.5, 1.9, 0, 1.0, 1.2, 0.9, C.grey);
      box(ctx, 7.65, 2.0, 0.9, 0.7, 4.1, 0.14, C.white, { top: C.butter });
      for (const lz of [0.3, 0.6]) face(ctx, [[7.6, 1.85, lz], [8.4, 1.85, lz]], null, { lw: 0.06 });
    });

    // The diver: walk out, bounce, commit, swim to the ladder, climb out.
    const DIVE = 8;
    R.mover((t) => {
      const k = pulse(t, DIVE);
      const s = k * DIVE;
      if (s < 1.2) return { x: 8, y: 2.6 + (s / 1.2) * 3, z: 1.04, pose: 'walk', a: clamp(s / 0.3), dir: 'l' };
      if (s < 3.4) return { x: 8, y: 5.6, z: 1.04 + Math.abs(Math.sin((s - 1.2) * Math.PI * 1.35)) * 0.9, pose: 'stand', dir: 'l' };
      if (s < 4.2) {
        const q = (s - 3.4) / 0.8;
        return { x: 8, y: 5.6 + q * 2.6, z: 1.3 + Math.sin(q * Math.PI) * 2 - q * 2.5, pose: 'cheer', dir: 'l', flip: q };
      }
      if (s < 4.8) return { x: 8, y: 8.2, z: -3, hidden: true };
      if (s < 7.2) { const q = (s - 4.8) / 2.4; return { x: 8 + q * 4.1, y: 8.2, z: -1.15, pose: 'swim', dir: 'r' }; }
      return { x: 13, y: 8.2, z: 0, pose: 'stand', dir: 'r', a: 1 - clamp((s - 7.2) / 0.6) };
    }, (ctx, t, p) => {
      if (p.hidden) return;
      ctx.save();
      if (p.a !== undefined) ctx.globalAlpha = p.a;
      person(ctx, p.x, p.y, p.z, { skin: '#C3835B', hair: C.ink, style: 'short', top: C.coral, bottom: C.coral, pose: p.pose, dir: p.dir, speed: 9 }, t);
      ctx.restore();
    }, { bias: 0.5 });

    // Splash where the diver lands
    R.air((ctx, t) => {
      const s = pulse(t, DIVE) * DIVE;
      if (s < 4.1 || s > 5.4) return;
      const q = (s - 4.1) / 1.3;
      for (let i = 0; i < 3; i++) {
        const rr = 0.3 + q * (1.2 + i * 0.6);
        const [X, Y] = P(8, 8.2, WATER_Z);
        ctx.beginPath();
        ctx.ellipse(X, Y, rr * 1.4, rr * 0.7, 0, 0, Math.PI * 2);
        ctx.strokeStyle = alpha(C.white, 1 - q);
        ctx.lineWidth = 0.1;
        ctx.stroke();
      }
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const d = q * 1.6;
        const z = WATER_Z + Math.sin(q * Math.PI) * (1.5 + (i % 3) * 0.5);
        const [X, Y] = P(8 + Math.cos(a) * d, 8.2 + Math.sin(a) * d, z);
        ctx.beginPath();
        ctx.arc(X, Y, 0.12 * (1 - q) + 0.04, 0, Math.PI * 2);
        ctx.fillStyle = C.white;
        ctx.fill();
      }
    });

    // Ladder on the right edge of the pool
    R.thing(12.6, 8.4, (ctx) => {
      for (const ly of [7.8, 8.6]) face(ctx, [[12.5, ly, -0.8], [12.5, ly, 1.1], [12.9, ly, 1.1]], null, { lw: 0.1, stroke: C.grey });
    });

    // Lap swimmers
    const lap1 = route([[PX0 + 0.8, 6.5], [PX1 - 0.8, 6.5]], { speed: 1.0, loop: false });
    const lap2 = route([[PX0 + 0.8, 10.6], [PX1 - 0.8, 10.6]], { speed: 0.8, loop: false, offset: 3 });
    [lap1, lap2].forEach((fn, i) => {
      R.mover(fn, (ctx, t, p) => {
        const [X, Y] = P(p.x, p.y, WATER_Z);
        ctx.beginPath();
        ctx.ellipse(X, Y, 0.7, 0.3, 0, 0, Math.PI * 2);
        ctx.strokeStyle = alpha(C.white, 0.8);
        ctx.lineWidth = 0.07;
        ctx.stroke();
        person(ctx, p.x, p.y, -1.15, folk(40 + i, { pose: 'swim', dir: p.dir, hat: i ? 'helmet' : undefined, speed: 6 }), t);
      });
    });

    // Flamingo float with a very relaxed passenger
    const flam = orbit(8.8, 9.2, 2.2, 1.8, 46, 0);
    R.mover(flam, (ctx, t, p) => {
      const bob = Math.sin(t * 1.6) * 0.04;
      disc(ctx, p.x, p.y, WATER_Z + 0.2 + bob, 1.0, C.pink, { dots: shade(C.pink, 0.4), density: 0.2 });
      disc(ctx, p.x, p.y, WATER_Z + 0.21 + bob, 0.5, alpha(C.water, 1), { stroke: false });
      person(ctx, p.x + 0.1, p.y + 0.1, WATER_Z - 0.1 + bob, folk(7, { pose: 'sit', dir: 'r', hat: 'sun', top: C.mustard }), t);
      // neck and head
      const [nx, ny] = P(p.x - 0.7, p.y - 0.4, WATER_Z + 0.3 + bob);
      ctx.beginPath();
      ctx.moveTo(nx, ny);
      ctx.bezierCurveTo(nx - 0.6, ny - 0.8, nx + 0.5, ny - 1.4, nx - 0.1, ny - 2.0);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 0.34;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.strokeStyle = C.pink;
      ctx.lineWidth = 0.24;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(nx - 0.1, ny - 2.05, 0.2, 0, Math.PI * 2);
      paint(ctx, C.pink);
      ctx.beginPath();
      ctx.moveTo(nx + 0.05, ny - 2.1); ctx.lineTo(nx + 0.4, ny - 1.9); ctx.lineTo(nx + 0.05, ny - 1.95);
      paint(ctx, C.ink);
    });

    // Rubber duck, drifting in a slow circle (a find)
    const duck = orbit(6, 7.4, 0.9, 0.7, 20, 5);
    R.mover(duck, (ctx, t, p) => {
      const [X, Y] = P(p.x, p.y, WATER_Z + Math.sin(t * 2) * 0.03);
      ctx.beginPath();
      ctx.ellipse(X, Y - 0.12, 0.26, 0.15, 0, 0, Math.PI * 2);
      ctx.arc(X + 0.14, Y - 0.34, 0.12, 0, Math.PI * 2);
      paint(ctx, C.mustard, { lw: 0.04 });
      ctx.beginPath();
      ctx.moveTo(X + 0.24, Y - 0.34); ctx.lineTo(X + 0.36, Y - 0.3); ctx.lineTo(X + 0.24, Y - 0.28);
      ctx.fillStyle = C.coral;
      ctx.fill();
    });
    R.find({ id: 'duck', label: 'A rubber duck', r: 0.8, at: (t) => { const p = duck(t); return [p.x, p.y, WATER_Z + 0.2]; } });

    // Loungers, parasols and sunbathers on the left deck
    [[0.9, 5.3, C.teal], [0.9, 8.2, C.mustard], [0.9, 11.1, C.coral]].forEach(([x, y, c], i) => {
      R.thing(x + 2.7, y + 1, (ctx, t) => {
        lounger(ctx, x, y, c);
        if (i !== 1) person(ctx, x + 1.5, y + 0.5, 0.55, folk(20 + i, { pose: 'lie', dir: 'l', hat: i ? 'sun' : undefined }), t);
      }, { anim: true });
    });
    R.thing(1.6, 7.6, (ctx, t) => parasol(ctx, 1.6, 7.6, t, C.coral, C.white));
    R.thing(1.6, 13.6, (ctx, t) => parasol(ctx, 1.6, 13.6, t, C.teal, C.butter));

    // The lost flip-flop (a find) under the empty lounger, and its twin on a towel
    R.rug((ctx) => {
      rect(ctx, 5.2, 13.4, 1.4, 2.2, 0.02, C.coral, { dots: C.white, density: 0.4 });
      rect(ctx, 7.2, 13.6, 1.4, 2.2, 0.02, C.teal, { dots: C.butter, density: 0.3 });
      rect(ctx, 9.6, 13.3, 1.4, 2.2, 0.02, C.mustard, { dots: C.coral, density: 0.25 });
      disc(ctx, 3.2, 9.2, 0.03, 0.2, C.pink, { lw: 0.03 });
      disc(ctx, 3.25, 9.05, 0.035, 0.12, C.pink, { lw: 0.03 });
      disc(ctx, 6.1, 15.1, 0.03, 0.2, C.pink, { lw: 0.03 });
    });
    R.find({ id: 'flipflop', label: 'One lost flip-flop', at: [3.2, 9.2, 0], r: 0.7 });

    // Sunglasses on the parapet (a find)
    R.decor((ctx) => {
      const [X, Y] = P(11, -0.25, 1.0);
      ctx.beginPath();
      ctx.ellipse(X - 0.2, Y - 0.06, 0.16, 0.1, 0, 0, Math.PI * 2);
      ctx.ellipse(X + 0.2, Y - 0.06, 0.16, 0.1, 0, 0, Math.PI * 2);
      ctx.fillStyle = C.ink;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(X - 0.05, Y - 0.08); ctx.lineTo(X + 0.05, Y - 0.08);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.04; ctx.stroke();
    });
    R.find({ id: 'shades', label: 'A pair of sunglasses', at: [11, -0.25, 1.0], r: 0.7 });

    // Lifeguard tower
    R.thing(14.6, 5.4, (ctx, t) => {
      for (const [lx, ly] of [[13.6, 4.4], [14.8, 4.4], [13.6, 5.6], [14.8, 5.6]]) box(ctx, lx, ly, 0, 0.14, 0.14, 2.8, C.white, { flat: true });
      box(ctx, 13.5, 4.3, 2.8, 1.5, 1.5, 0.15, C.coral);
      box(ctx, 14.9, 4.3, 2.95, 0.12, 1.5, 1.1, C.coral);
      for (let i = 0; i < 4; i++) face(ctx, [[14.9, 4.4, 0.6 + i * 0.6], [14.9, 5.8, 0.6 + i * 0.6]], null, { lw: 0.05 });
    });
    R.mover((t) => ({ x: 14.4, y: 5.0 }), (ctx, t) => {
      const whistle = pulse(t, 9) > 0.75;
      person(ctx, 14.4, 5.0, 2.95, { skin: SKIN_LG, hair: C.mustard, style: 'short', top: C.red, bottom: C.red, pose: whistle ? 'point' : 'sit', dir: 'l', hat: 'sun' }, t);
      if (whistle && Q.detail) speech(ctx, 14.2, 4.8, 5.6, 'NO RUNNING!', { size: 0.5 });
    }, { bias: 1 });

    // The kid who is running anyway
    const runner = route([[3.5, 14.6], [14.5, 14.6], [14.6, 9.5]], { speed: 3.2, loop: false, offset: 1 });
    R.mover(runner, (ctx, t, p) => person(ctx, p.x, p.y, 0, folk(3, { pose: 'run', dir: p.dir, back: p.back, scale: 0.72, top: C.mustard, speed: 12 }), t));

    // Beach ball between two kids
    R.thing(14.2, 12.6, (ctx, t) => person(ctx, 14.2, 12.6, 0, folk(11, { pose: 'cheer', dir: 'l', scale: 0.75 }), t), { anim: true });
    R.thing(13.4, 15.2, (ctx, t) => person(ctx, 13.4, 15.2, 0, folk(12, { pose: 'cheer', dir: 'r', scale: 0.75, back: true }), t), { anim: true });
    R.mover((t) => {
      const k = pulse(t, 2.4);
      const q = k < 0.5 ? k * 2 : 2 - k * 2;
      return { x: 14.2 + (13.4 - 14.2) * q, y: 12.6 + (15.2 - 12.6) * q, z: 1.8 + Math.sin(q * Math.PI) * 2.2 };
    }, (ctx, t, p) => {
      const [X, Y] = P(p.x, p.y, p.z);
      ctx.save();
      ctx.translate(X, Y);
      ctx.rotate(t * 4);
      const cols = [C.coral, C.white, C.mustard, C.white, C.teal, C.white];
      cols.forEach((c, i) => {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 0.36, (i / 6) * Math.PI * 2, ((i + 1) / 6) * Math.PI * 2);
        ctx.fillStyle = c;
        ctx.fill();
      });
      ctx.beginPath();
      ctx.arc(0, 0, 0.36, 0, Math.PI * 2);
      paint(ctx, null, { lw: 0.04 });
      ctx.restore();
      const [sx, sy] = P(p.x, p.y, 0);
      ctx.beginPath();
      ctx.ellipse(sx, sy, 0.35, 0.15, 0, 0, Math.PI * 2);
      ctx.fillStyle = alpha(C.ink, 0.15);
      ctx.fill();
    }, { bias: 0.2 });

    // Ice cream cart in the far corner
    R.thing(14.4, 2.2, (ctx, t) => {
      box(ctx, 12.6, 1.2, 0.3, 2.2, 1.2, 1.3, C.white, { top: C.blush });
      cylinder(ctx, 12.9, 2.5, 0, 0.3, 0.6, C.ink, { flat: true });
      cylinder(ctx, 14.5, 2.5, 0, 0.3, 0.6, C.ink, { flat: true });
      label(ctx, 13.7, 2.4, 1.0, 'ICE', 0.45, C.coral);
      parasol(ctx, 13.7, 1.8, t, C.mustard, C.white);
    });
    R.mover(() => ({ x: 12.2, y: 2.6 }), (ctx, t) => person(ctx, 12.2, 2.6, 0, folk(33, { pose: 'wave', dir: 'r', hat: 'cap' }), t));

    // Palms in planters along the back
    for (const [x, y] of [[7.2, 0.9], [10.5, 0.9], [0.9, 14.6]]) R.thing(x, y, (ctx, t) => plant(ctx, x, y, 0, t, { kind: 'palm', scale: 1.7, potColor: C.white, leaf: C.green }), { anim: true });

    // The goose, casing the joint behind the water tower
    R.goose(route([[5.2, 1.3, 2], [6.8, 1.4], [6.4, 3.4, 1.5], [4.9, 3.9]], { speed: 0.6 }), {});
  },
};

const SKIN_LG = '#E3A97F';
