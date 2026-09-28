// Ball Pit: an indoor play center. A twisty slide feeds a pit full of balls,
// kids pop up like periscopes, a castle wobbles, and one parent is fast asleep
// while a small child builds a tower of balls on his tummy.
import {
  C, box, rect, disc, cylinder, face, poly, paint, person, folk, slab, checker, tiles,
  speech, shade, tint, alpha, Q, label, P, paintText, onLeft, onRight, frame, clockL, shelfL,
  hash, rng, pick, note,
} from '../../../engine/art.js';
import { route, particles, pulse, clamp, ease } from '../../../engine/actors.js';
import { ZK } from '../../../engine/iso.js';

// ---------- Layout ----------
const X0 = 6, Y0 = 5, X1 = 13, Y1 = 12; // ball pit interior
const SURF = 0.85; // top of the balls
const RIM = 1.05; // padded rim height
const BALLC = [C.coral, C.mustard, C.teal, C.pink, C.sky, C.purple, C.red, C.leaf, C.white];
const PAD = [C.teal, C.mustard, C.coral, C.purple, C.sky];
const HL = 'rgba(251,246,234,0.75)';
const lerp = (a, b, k) => a + (b - a) * k;

// Tower + twisty slide
const TX0 = 0.5, TX1 = 3.7, TZ = 4.2;
const HX = 5.3, HY = 2.0, HR = 1.3, HZ0 = 4.3, HZ1 = 1.9, A0 = -Math.PI, A1 = 2 * Math.PI;
const CHUTE_END = 6.5, CHUTE_X = HX + HR;
const helixAt = (s) => {
  const a = A0 + (A1 - A0) * s;
  return { x: HX + Math.cos(a) * HR, y: HY + Math.sin(a) * HR, z: HZ0 + (HZ1 - HZ0) * s, a };
};

// Bouncy castle
const CX0 = 9.9, CX1 = 15.4, CY0 = 0.6, CY1 = 4.2, CB = 0.7;

const memo = (fn) => { let lt = NaN, lp = null; return (t) => (t === lt ? lp : (lt = t, lp = fn(t))); };

// A single ball, centered on screen point (X, Y) sitting on its bottom.
function ball(ctx, X, Y, r, col) {
  ctx.beginPath();
  ctx.arc(X, Y - r * 0.8, r, 0, Math.PI * 2);
  paint(ctx, col, { lw: 0.03 });
  if (Q.detail) {
    ctx.beginPath();
    ctx.arc(X - r * 0.35, Y - r * 1.15, r * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = HL;
    ctx.fill();
  }
}
const ballCol = (a, b) => BALLC[Math.floor(hash(a, b) * BALLC.length) % BALLC.length];

// Balls that close over whatever is sticking out of the pit at (x, y).
function ballsAround(ctx, t, x, y, w, seed) {
  const [X, Y] = P(x, y, SURF);
  const n = 6;
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1)) * 2 - 1;
    const j = Math.sin(t * 3 + i * 1.7 + seed) * 0.02;
    ball(ctx, X + u * w, Y + (1 - u * u) * w * 0.28 + 0.14 + j, 0.19, ballCol(seed, i));
  }
}

// A person standing in the balls: only the part above the surface shows.
// h is how much sticks out, in screen units.
function sunk(ctx, t, x, y, h, o, seed) {
  if (h > 0.02) {
    const s = o.scale || 1;
    const [X, Y] = P(x, y, SURF);
    ctx.save();
    ctx.beginPath();
    ctx.rect(X - 2.5, Y - 5, 5, 5.05);
    ctx.clip();
    person(ctx, x, y, SURF + (h - 2.26 * s) / ZK, o, t);
    ctx.restore();
  }
  ballsAround(ctx, t, x, y, 0.42 * (o.scale || 1) + 0.12, seed);
}

// A little timeline: phases of [duration, fn(q, tt)].
function timeline(phases) {
  const T = phases.reduce((s, p) => s + p[0], 0);
  const f = (t) => {
    let tt = ((t % T) + T) % T;
    for (const [d, fn] of phases) {
      if (tt < d) return fn(tt / d, tt);
      tt -= d;
    }
    return phases[phases.length - 1][1](1, 0);
  };
  f.T = T;
  return f;
}

function cone(ctx, x, y, z, r, h, a, b, n = 8) {
  const [ax, ay] = P(x, y, z + h);
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    if (Math.sin((a0 + a1) / 2 + Math.PI / 4) < -0.2) continue; // back faces
    const [x0, y0] = P(x + Math.cos(a0) * r, y + Math.sin(a0) * r, z);
    const [x1, y1] = P(x + Math.cos(a1) * r, y + Math.sin(a1) * r, z);
    ctx.beginPath();
    ctx.moveTo(ax, ay); ctx.lineTo(x0, y0); ctx.lineTo(x1, y1); ctx.closePath();
    paint(ctx, i % 2 ? a : b, { lw: 0.04 });
  }
}

// ---------- The slide tower ----------
function towerBody(ctx) {
  // padded block under the platform, with crawl holes
  box(ctx, TX0, TX0, 0, TX1 - TX0, TX1 - TX0, TZ - 0.2, C.coral, { top: C.coralLight });
  // stripes of padding
  for (let z = 0.9; z < TZ - 0.3; z += 0.9) {
    face(ctx, [[TX0, TX1, z], [TX1, TX1, z]], null, { lw: 0.04, stroke: shade(C.coral, 0.4) });
    face(ctx, [[TX1, TX0, z], [TX1, TX1, z]], null, { lw: 0.04, stroke: shade(C.coral, 0.4) });
  }
  // crawl holes
  const hole = (pts) => { face(ctx, pts, C.night, { lw: 0.08, stroke: C.mustard }); };
  const ring = (cx, cz, plane) => {
    const pts = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      pts.push(plane === 'y' ? [cx + Math.cos(a) * 0.55, TX1 + 0.001, cz + Math.sin(a) * 0.55] : [TX1 + 0.001, cx + Math.cos(a) * 0.55, cz + Math.sin(a) * 0.55]);
    }
    hole(pts);
  };
  ring(0.95, 0.75, 'y');
  ring(2.9, 0.75, 'x');
  // platform deck
  box(ctx, TX0 - 0.1, TX0 - 0.1, TZ - 0.2, TX1 - TX0 + 0.2, TX1 - TX0 + 0.2, 0.2, C.mustard, { top: C.butter });
  // back posts
  for (const [px, py] of [[TX0 - 0.1, TX0 - 0.1], [TX1 - 0.15, TX0 - 0.1], [TX0 - 0.1, TX1 - 0.15]]) {
    box(ctx, px, py, TZ, 0.25, 0.25, 1.9, C.teal, { flat: true });
  }
  // ladder on the front-left face
  for (const lx of [1.72, 2.48]) box(ctx, lx, TX1 + 0.05, 0, 0.1, 0.1, TZ + 0.7, C.teal, { flat: true });
  for (let z = 0.35; z < TZ + 0.1; z += 0.45) face(ctx, [[1.77, TX1 + 0.1, z], [2.53, TX1 + 0.1, z]], null, { lw: 0.07, stroke: C.teal });
}

function towerFront(ctx) {
  // front post
  box(ctx, TX1 - 0.15, TX1 - 0.15, TZ, 0.25, 0.25, 1.9, C.teal, { flat: true });
  // net railings on the open sides (openings for the ladder and the slide)
  const net = (pts) => {
    face(ctx, pts, alpha(C.white, 0.25), { lw: 0.05 });
  };
  net([[TX1, TX0, TZ], [TX1, 1.55, TZ], [TX1, 1.55, TZ + 0.9], [TX1, TX0, TZ + 0.9]]);
  net([[TX1, 2.45, TZ], [TX1, TX1, TZ], [TX1, TX1, TZ + 0.9], [TX1, 2.45, TZ + 0.9]]);
  net([[TX0, TX1, TZ], [1.65, TX1, TZ], [1.65, TX1, TZ + 0.9], [TX0, TX1, TZ + 0.9]]);
  net([[2.55, TX1, TZ], [TX1, TX1, TZ], [TX1, TX1, TZ + 0.9], [2.55, TX1, TZ + 0.9]]);
  if (Q.detail) {
    ctx.beginPath();
    for (let k = 0.2; k < 3; k += 0.3) {
      for (const [a, b] of [[[TX1, TX0 + k, TZ], [TX1, TX0 + k, TZ + 0.9]], [[TX0 + k, TX1, TZ], [TX0 + k, TX1, TZ + 0.9]]]) {
        if ((a[1] > 1.55 && a[1] < 2.45 && a[0] === TX1) || (a[0] > 1.65 && a[0] < 2.55 && a[1] === TX1)) continue;
        const A = P(...a), B = P(...b);
        ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]);
      }
    }
    ctx.strokeStyle = alpha(C.ink, 0.5);
    ctx.lineWidth = 0.025;
    ctx.stroke();
  }
  // pointy roof
  const cx = (TX0 + TX1) / 2, top = [cx, cx, 7.4];
  const c = [[TX0 - 0.3, TX0 - 0.3], [TX1 + 0.3, TX0 - 0.3], [TX1 + 0.3, TX1 + 0.3], [TX0 - 0.3, TX1 + 0.3]];
  face(ctx, [top, [...c[1], 6.0], [...c[2], 6.0]], C.coral, { dots: shade(C.coral, 0.5), density: 0.2 });
  face(ctx, [top, [...c[2], 6.0], [...c[3], 6.0]], C.mustard, { dots: shade(C.mustard, 0.5), density: 0.25 });
  // flag on top
  face(ctx, [[cx, cx, 7.4], [cx, cx, 8.3]], null, { lw: 0.06 });
  face(ctx, [[cx, cx, 8.3], [cx + 0.7, cx - 0.1, 8.05], [cx, cx, 7.8]], C.teal, { lw: 0.04 });
}

// ---------- The twisty slide ----------
const HN = 56;
const HSEG = [];
for (let i = 0; i < HN; i++) {
  const s0 = i / HN, s1 = (i + 1) / HN;
  const p0 = helixAt(s0), p1 = helixAt(s1);
  const ri = HR - 0.42, ro = HR + 0.42;
  const pt = (p, r, dz = 0) => [HX + Math.cos(p.a) * r, HY + Math.sin(p.a) * r, p.z + dz];
  const am = (p0.a + p1.a) / 2;
  HSEG.push({
    d: HX + HY + Math.cos(am) * HR + Math.sin(am) * HR,
    facing: Math.cos(am) + Math.sin(am) > 0,
    bottom: [pt(p0, ri), pt(p0, ro), pt(p1, ro), pt(p1, ri)],
    outer: [pt(p0, ro), pt(p1, ro), pt(p1, ro, 0.42), pt(p0, ro, 0.42)],
    inner: [pt(p0, ri), pt(p1, ri), pt(p1, ri, 0.3), pt(p0, ri, 0.3)],
    i,
  });
}
function drawSeg(ctx, g) {
  const bot = () => face(ctx, g.bottom, C.mustard, { lw: 0.035, dots: g.facing ? null : shade(C.mustard, 0.4), density: 0.15 });
  const out = () => face(ctx, g.outer, C.teal, { lw: 0.035, dots: g.facing ? null : C.navy, density: 0.2 });
  const inn = () => face(ctx, g.inner, shade(C.teal, 0.2), { lw: 0.035 });
  if (g.facing) { inn(); bot(); out(); } else { out(); bot(); inn(); }
}

// ---------- Castle ----------
function castleWob(t) {
  return { k: Math.sin(t * 2.3) * 0.045 + Math.sin(t * 5.1) * 0.012, sq: Math.sin(t * 4.6) * 0.018 };
}
const CASTLE_ORIGIN = P((CX0 + CX1) / 2, CY1, 0);
function turret(ctx, x, y, h, col, roofA, roofB) {
  cylinder(ctx, x, y, 0, 0.62, CB + h, col, { top: tint(col, 0.2) });
  // puffy rings
  for (let z = 1.2; z < CB + h; z += 0.9) {
    const [X, Y] = P(x, y, z);
    ctx.beginPath();
    ctx.ellipse(X, Y, 0.62 * Math.SQRT2, 0.31 * Math.SQRT2, 0, 0, Math.PI);
    ctx.strokeStyle = shade(col, 0.35);
    ctx.lineWidth = 0.04;
    ctx.stroke();
  }
  cone(ctx, x, y, CB + h, 0.78, 1.25, roofA, roofB);
}

export default {
  id: 'ballpit',
  name: 'Ball Pit',
  blurb: 'Nobody has seen the bottom of the ball pit since 2019. One dad is asleep, and his tummy is now a ball tower.',

  build(R) {
    // ---------- Floor and walls ----------
    R.floor((ctx) => {
      slab(ctx, C.sky);
      checker(ctx, tint(C.sky, 0.5), tint(C.mint, 0.35), 2);
      tiles(ctx, 2, alpha(C.navy, 0.18), 0.03);
    });
    R.walls({ h: 6, left: C.butter, right: C.blush, dotsL: shade(C.butter, 0.25), dotsR: shade(C.blush, 0.25), densL: 0.12, densR: 0.12, cap: C.white });

    // Wall art
    R.decor((ctx) => {
      // clouds on the left wall
      const cloudL = (y, z, s) => {
        for (const [dy, dz, r] of [[0, 0, 0.5], [0.55, 0.15, 0.62], [1.15, 0, 0.48], [0.55, -0.2, 0.5]]) {
          const pts = [];
          for (let i = 0; i < 14; i++) {
            const a = (i / 14) * Math.PI * 2;
            pts.push([0.01, y + (dy + Math.cos(a) * r) * s, z + (dz + Math.sin(a) * r * 0.7) * s]);
          }
          face(ctx, pts, C.white, { stroke: false });
        }
      };
      cloudL(8.3, 4.6, 1.0);
      cloudL(11.4, 3.7, 0.8);
      cloudL(13.6, 5.1, 0.7);
      // rainbow on the right wall
      const arc = (r0, r1, col) => {
        const pts = [];
        for (let i = 0; i <= 16; i++) { const a = Math.PI * (i / 16); pts.push([8.2 + Math.cos(a) * r1, 0.01, 2.1 + Math.sin(a) * r1]); }
        for (let i = 16; i >= 0; i--) { const a = Math.PI * (i / 16); pts.push([8.2 + Math.cos(a) * r0, 0.01, 2.1 + Math.sin(a) * r0]); }
        face(ctx, pts, col, { lw: 0.03 });
      };
      arc(1.3, 1.6, C.coral);
      arc(1.0, 1.3, C.mustard);
      arc(0.7, 1.0, C.teal);
      arc(0.4, 0.7, C.purple);
      paintText(ctx, 'right', 8.2, 4.7, 'BALL PIT', 0.95, C.coral);
      paintText(ctx, 'right', 8.2, 4.05, 'dive in!', 0.45, C.navy);
      // bunting above the castle
      const pts = [];
      for (let i = 0; i <= 12; i++) { const k = i / 12; pts.push([9.5 + k * 6.3, 0.01, 5.7 - Math.sin(k * Math.PI) * 0.5]); }
      for (let i = 0; i < 12; i++) {
        const [a, b] = [pts[i], pts[i + 1]];
        face(ctx, [a, b, [(a[0] + b[0]) / 2, 0.01, (a[2] + b[2]) / 2 - 0.45]], PAD[i % PAD.length], { lw: 0.03 });
      }
      // socks only sign over the cubbies
      onLeft(ctx, 4.5, 2.95, 3.3, 1.1, C.navy, { lw: 0.05 });
      paintText(ctx, 'left', 6.15, 3.63, 'SOCKS ONLY', 0.5, C.butter);
      paintText(ctx, 'left', 6.15, 3.2, 'no shoes past here', 0.26, C.white, 'Rethink Sans');
      // rules poster
      frame(ctx, 'left', 11.2, 1.6, 1.6, 1.4, C.white, (g) => {
        paintText(g, 'left', 12.0, 2.75, 'RULES', 0.34, C.coral);
        paintText(g, 'left', 12.0, 2.35, '1. no grown-ups', 0.18, C.ink, 'Rethink Sans');
        paintText(g, 'left', 12.0, 2.1, '2. no diving', 0.18, C.ink, 'Rethink Sans');
        paintText(g, 'left', 12.0, 1.85, '3. no geese', 0.18, C.ink, 'Rethink Sans');
      });
      clockL(ctx, 9.6, 3.1, 0.45);
      // exit door
      onLeft(ctx, 13.4, 0, 1.8, 3.2, C.teal, { dots: shade(C.teal, 0.4), density: 0.15 });
      onLeft(ctx, 13.55, 0.15, 1.5, 2.9, C.tealLight, { lw: 0.04 });
      onLeft(ctx, 13.5, 3.35, 1.6, 0.5, C.red, { lw: 0.04 });
      paintText(ctx, 'left', 14.3, 3.6, 'EXIT', 0.36, C.white);
    });

    // escaped balls on the floor
    R.rug((ctx) => {
      const r = rng(9);
      const spots = [];
      for (let i = 0; i < 30; i++) {
        const side = i % 4;
        let x, y;
        if (side === 0) { x = X0 - 1.2 - r() * 1.4; y = Y0 + r() * 7; }
        else if (side === 1) { x = X0 + r() * 7; y = Y1 + 0.8 + r() * 0.5; }
        else if (side === 2) { x = X1 + 0.7 + r() * 0.3; y = Y0 + 1 + r() * 1.5; }
        else { x = 4.2 + r() * 1.2; y = 5.2 + r() * 6; }
        spots.push([x, y]);
      }
      spots.push([2.6, 13.4], [3.1, 13.6], [2.2, 13.7], [3.5, 13.3], [2.8, 13.9]);
      spots.sort((a, b) => a[0] + a[1] - b[0] - b[1]);
      spots.forEach(([x, y], i) => {
        const [X, Y] = P(x, y, 0);
        ctx.beginPath();
        ctx.ellipse(X, Y, 0.22, 0.09, 0, 0, Math.PI * 2);
        ctx.fillStyle = alpha(C.ink, 0.15);
        ctx.fill();
        ball(ctx, X, Y, 0.18, ballCol(3, i));
      });
    });

    // ---------- Shoe cubbies ----------
    R.thing(1.1, 7.9, (ctx) => {
      shelfL(ctx, 4.3, 3.5, 2.5, 2, 4, C.wood, (g, y, z, w, r) => {
        for (let yy = y + 0.2; yy < y + w - 0.4; yy += 0.6) {
          const col = pick(r, [C.coral, C.navy, C.pink, C.teal, C.mustard, C.white, C.purple]);
          if (r() < 0.2) continue;
          for (const dy of [0, 0.22]) {
            const [X, Y] = P(0.8, yy + dy, z + 0.02);
            g.beginPath();
            g.ellipse(X, Y - 0.08, 0.15, 0.1, 0, 0, Math.PI * 2);
            paint(g, col, { lw: 0.025 });
            g.beginPath();
            g.rect(X - 0.15, Y - 0.12, 0.3, 0.05);
            g.fillStyle = C.white;
            g.fill();
          }
        }
      });
    });

    // ---------- The tower and the twisty slide ----------
    R.thing(TX1, TX1, (ctx) => towerBody(ctx), { depth: 6.8 });
    R.thing(TX1, TX1, (ctx) => towerFront(ctx), { depth: 7.3 });

    // Kids that climb, slide, splash, and do it all again.
    const LAD = [2.1, TX1 + 0.3];
    const EXIT = [4.9, 4.7];
    const LAND = [6.6, 6.9];
    const skid = (q) => {
      const s = q * q * 0.35 + q * 0.65;
      const p = helixAt(s);
      const dX = -Math.sin(p.a) - Math.cos(p.a);
      return { ...p, mode: 'helix', pose: 'sit', dir: dX >= 0 ? 'r' : 'l', seg: Math.min(HN - 1, Math.floor(s * HN)) };
    };
    const kidTL = timeline([
      [2.2, (q) => ({ x: lerp(EXIT[0], LAD[0], q), y: lerp(EXIT[1], LAD[1], q), z: 0, pose: 'walk', dir: 'l', back: true, mode: 'floor', d: Math.max(7.05, lerp(EXIT[0] + EXIT[1], 6.1, q)) })],
      [0.6, () => ({ x: LAD[0], y: LAD[1], z: 0, pose: 'stand', dir: 'l', back: true, mode: 'floor', d: 7.05 })],
      [2.2, (q) => ({ x: LAD[0], y: LAD[1], z: q * TZ, pose: 'walk', dir: 'r', back: true, mode: 'tower', d: 7.1 })],
      [0.9, (q) => ({ x: lerp(2.1, 3.5, q), y: lerp(3.3, 2.0, q), z: TZ, pose: 'walk', dir: 'r', back: true, mode: 'tower', d: 7.1 })],
      [0.8, () => ({ x: 3.5, y: 2.0, z: TZ, pose: 'cheer', dir: 'r', mode: 'tower', d: 7.1, yell: true })],
      [2.4, (q) => skid(q)],
      [0.5, (q) => ({ x: CHUTE_X, y: lerp(HY, CHUTE_END, q), z: lerp(HZ1, SURF, q), pose: 'sit', dir: 'l', mode: 'chute', d: 11.1 })],
      [0.7, (q) => ({ x: LAND[0], y: LAND[1], h: lerp(1.3, 0, ease(q)), pose: 'cheer', dir: 'l', mode: 'pit' })],
      [1.0, (q) => ({ x: lerp(LAND[0], 6.45, q), y: lerp(LAND[1], 5.6, q), h: 0, mode: 'hidden' })],
      [0.5, (q) => ({ x: 6.45, y: 5.6, h: ease(q) * 1.2, pose: 'stand', dir: 'l', back: true, mode: 'pit' })],
      [0.7, (q) => ({ x: lerp(6.45, EXIT[0], q), y: lerp(5.6, EXIT[1], q), z: lerp(SURF - 0.34, 0, q) + Math.sin(q * Math.PI) * 1.0, pose: 'jump', dir: 'l', back: true, mode: 'floor', clip: q < 0.45, d: lerp(12.1, 9.8, q) })],
    ]);
    const SLIDE_T = kidTL.T;
    const kidStyles = [
      folk(101, { scale: 0.7, top: C.coral, hair: C.mustard, style: 'pony' }),
      folk(102, { scale: 0.68, top: C.teal, style: 'curly', hat: 'cap' }),
      folk(103, { scale: 0.72, top: C.purple, style: 'bun', dress: true }),
    ];
    const kids = [0, 1, 2].map((i) => memo((t) => kidTL(t + (i * SLIDE_T) / 3)));
    const ARMS_UP = [2.6, -2.6];
    const drawSlideKid = (ctx, t, p, i) => {
      const st = kidStyles[i];
      if (p.mode === 'hidden') { ballsAround(ctx, t, p.x, p.y, 0.4, 50 + i); return; }
      if (p.mode === 'pit') { sunk(ctx, t, p.x, p.y, p.h, { ...st, pose: p.pose, dir: p.dir, back: p.back }, 60 + i); return; }
      const sitting = p.pose === 'sit';
      const z = sitting ? p.z - 0.38 : p.z;
      if (p.clip) {
        const [X, Y] = P(p.x, p.y, SURF);
        ctx.save(); ctx.beginPath(); ctx.rect(X - 3, Y - 6, 6, 6); ctx.clip();
        person(ctx, p.x, p.y, z, { ...st, pose: p.pose, dir: p.dir, back: p.back, speed: 9 }, t);
        ctx.restore();
      } else {
        person(ctx, p.x, p.y, z, { ...st, pose: p.pose, dir: p.dir, back: p.back, arms: sitting ? ARMS_UP : undefined, speed: 9 }, t);
      }
      if (p.yell && Q.detail) speech(ctx, p.x, p.y, p.z + 1.9, 'WHEEE', { size: 0.36 });
    };
    kids.forEach((kp, i) => {
      R.mover(kp, (ctx, t, p) => { if (p.mode !== 'helix') drawSlideKid(ctx, t, p, i); }, {
        depth: (t) => { const p = kp(t); return p.d ?? p.x + p.y + 0.02; },
      });
    });

    // The helix itself, with any kid currently riding it sorted into place.
    const HORDER = [...HSEG].sort((a, b) => a.d - b.d);
    R.thing(HX, HY, (ctx, t) => {
      // pole and supports
      const list = HORDER.map((g) => ({ d: g.d, f: () => drawSeg(ctx, g) }));
      list.push({ d: HX + HY, f: () => {
        cylinder(ctx, HX, HY, 0, 0.18, HZ0 + 0.3, C.purple, { flat: true });
        const [X, Y] = P(HX, HY, HZ0 + 0.3);
        ctx.beginPath(); ctx.arc(X, Y, 0.22, 0, Math.PI * 2); paint(ctx, C.mustard);
      } });
      kids.forEach((kp, i) => {
        const p = kp(t);
        if (p.mode !== 'helix') return;
        const g = HSEG[p.seg];
        list.push({ d: g.d - (g.facing ? 0.001 : -0.001), f: () => drawSlideKid(ctx, t, p, i) });
      });
      list.sort((a, b) => a.d - b.d);
      for (const it of list) it.f();
    }, { depth: 7.8, anim: true });

    // The straight run-out into the pit (drawn after the back rim)
    R.thing(CHUTE_X, 4, (ctx) => {
      const x0 = CHUTE_X - 0.42, x1 = CHUTE_X + 0.42;
      const zAt = (y) => lerp(HZ1, SURF, (y - HY) / (CHUTE_END - HY));
      for (const sy of [3.1, 4.1]) box(ctx, CHUTE_X - 0.08, sy, 0, 0.16, 0.16, zAt(sy) - 0.05, C.purple, { flat: true });
      face(ctx, [[x0, HY, zAt(HY)], [x0, CHUTE_END, zAt(CHUTE_END)], [x0, CHUTE_END, zAt(CHUTE_END) + 0.3], [x0, HY, zAt(HY) + 0.3]], shade(C.teal, 0.2), { lw: 0.035 });
      face(ctx, [[x0, HY, zAt(HY)], [x1, HY, zAt(HY)], [x1, CHUTE_END, zAt(CHUTE_END)], [x0, CHUTE_END, zAt(CHUTE_END)]], C.mustard, { lw: 0.035 });
      face(ctx, [[x1, HY, zAt(HY)], [x1, CHUTE_END, zAt(CHUTE_END)], [x1, CHUTE_END, zAt(CHUTE_END) + 0.42], [x1, HY, zAt(HY) + 0.42]], C.teal, { lw: 0.035, dots: C.navy, density: 0.15 });
    }, { depth: 11 });

    // ---------- The ball pit ----------
    // back and left rims
    R.thing(X0, Y0, (ctx) => {
      let i = 0;
      for (let x = X0 - 0.45; x < X1 + 0.4; x += 0.9875, i++) box(ctx, x, Y0 - 0.45, 0, 0.9875, 0.45, RIM, PAD[i % PAD.length], { lw: 0.04 });
      i = 1;
      for (let y = Y0; y < Y1 - 0.01; y += 1, i++) box(ctx, X0 - 0.45, y, 0, 0.45, 1, RIM, PAD[i % PAD.length], { lw: 0.04 });
      cylinder(ctx, X0 - 0.22, Y0 - 0.22, 0, 0.32, 1.6, C.coral, { top: C.mustard });
    }, { depth: 10.5 });
    // the balls
    R.thing(X0, Y0, (ctx) => {
      rect(ctx, X0, Y0, X1 - X0, Y1 - Y0, SURF - 0.1, C.navy, { stroke: false });
      const r = rng(77);
      const pts = [];
      for (let x = X0 + 0.14; x < X1 - 0.05; x += 0.33) {
        for (let y = Y0 + 0.14; y < Y1 - 0.05; y += 0.33) {
          pts.push([x + (r() - 0.5) * 0.14, y + (r() - 0.5) * 0.14, SURF - 0.04 + r() * 0.08, pick(r, BALLC)]);
        }
      }
      pts.sort((a, b) => a[0] + a[1] - b[0] - b[1]);
      for (const p of pts) { const [X, Y] = P(p[0], p[1], p[2]); ball(ctx, X, Y, 0.2, p[3]); }
    }, { depth: 10.6 });
    // front and right rims, in slices so kids sort properly around them
    {
      let i = 0;
      for (let x = X0 - 0.45; x < X1 + 0.4; x += 0.9875, i++) {
        const xx = x, c = PAD[(i + 2) % PAD.length];
        R.thing(xx + 0.5, Y1 + 0.22, (ctx) => box(ctx, xx, Y1, 0, 0.9875, 0.45, RIM, c, { lw: 0.04 }));
      }
      i = 0;
      for (let y = Y0 - 0.45; y < Y1 - 0.01; y += 1.0 + (y < Y0 ? -0.55 : 0), i++) {
        const yy = y, len = y < Y0 ? 0.45 : 1, c = PAD[(i + 4) % PAD.length];
        R.thing(X1 + 0.22, yy + len / 2, (ctx) => box(ctx, X1, yy, 0, 0.45, len, RIM, c, { lw: 0.04 }));
      }
      R.thing(X1 + 0.3, Y0 - 0.2, (ctx) => cylinder(ctx, X1 + 0.22, Y0 - 0.22, 0, 0.32, 1.6, C.coral, { top: C.mustard }));
      R.thing(X0 - 0.2, Y1 + 0.3, (ctx) => cylinder(ctx, X0 - 0.22, Y1 + 0.22, 0, 0.32, 1.6, C.coral, { top: C.mustard }));
      R.thing(X1 + 0.5, Y1 + 0.5, (ctx) => cylinder(ctx, X1 + 0.22, Y1 + 0.22, 0, 0.32, 1.6, C.coral, { top: C.mustard }));
    }

    // Sippy cup balanced on the front-left post (a find)
    R.thing(X0 - 0.2, Y1 + 0.35, (ctx) => {
      const x = X0 - 0.22, y = Y1 + 0.22, z = 1.6;
      cylinder(ctx, x, y, z, 0.16, 0.34, C.mint, { top: C.purple });
      const [X, Y] = P(x, y, z + 0.34);
      ctx.beginPath();
      ctx.moveTo(X - 0.08, Y); ctx.lineTo(X - 0.03, Y - 0.2); ctx.lineTo(X + 0.05, Y - 0.2); ctx.lineTo(X + 0.08, Y);
      paint(ctx, C.purple, { lw: 0.03 });
      const [hx, hy] = P(x, y, z + 0.18);
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(hx + s * 0.3, hy, 0.09, 0.07, 0, 0, Math.PI * 2);
        paint(ctx, C.purple, { lw: 0.03 });
      }
    });
    R.find({ id: 'sippy', label: 'A sippy cup', at: [X0 - 0.22, Y1 + 0.22, 1.85], r: 0.7 });

    // Pit kids popping up and sinking back down
    const slots = [[8.6, 6.4], [11.8, 6.2], [10.2, 8.0], [12.1, 9.4], [9.0, 9.2], [10.6, 11.0], [8.0, 7.8], [11.2, 7.3]];
    for (let i = 0; i < 4; i++) {
      const per = 5.2 + i * 0.9, off = i * 2.3;
      const st = folk(120 + i, { scale: 0.66 + (i % 2) * 0.06, hat: i === 2 ? 'beanie' : undefined });
      const pos = memo((t) => {
        const tt = t + off;
        const n = Math.floor(tt / per);
        const k = tt / per - n;
        const [x, y] = slots[(n * 3 + i * 2) % slots.length];
        let h, pose = 'cheer';
        if (k < 0.07) h = ease(k / 0.07) * 1.35;
        else if (k < 0.35) h = 1.35;
        else if (k < 0.55) { h = lerp(1.35, 0.42, ease((k - 0.35) / 0.2)); pose = 'stand'; }
        else if (k < 0.85) { h = 0.42; pose = 'stand'; }
        else { h = lerp(0.42, 0, (k - 0.85) / 0.15); pose = 'stand'; }
        return { x: x + (i % 2 ? 0.2 : -0.2), y, h, pose, pop: k, dir: hash(i, n) > 0.5 ? 'l' : 'r' };
      });
      R.mover(pos, (ctx, t, p) => {
        sunk(ctx, t, p.x, p.y, p.h, { ...st, pose: p.pose, dir: p.dir }, 70 + i);
        if (p.pop < 0.12 && Q.detail) {
          const q = p.pop / 0.12;
          for (let j = 0; j < 6; j++) {
            const a = (j / 6) * Math.PI * 2 + i;
            const [X, Y] = P(p.x + Math.cos(a) * q * 0.9, p.y + Math.sin(a) * q * 0.9, SURF + Math.sin(q * Math.PI) * 0.9);
            ball(ctx, X, Y, 0.17, ballCol(i + 30, j));
          }
        }
      });
    }

    // The kid who is definitely fine
    R.mover(() => ({ x: 12.0, y: 11.1 }), (ctx, t, p) => {
      const h = 0.34 + Math.max(0, Math.sin(t * 1.3)) * 0.12;
      sunk(ctx, t, p.x, p.y, h, folk(131, { scale: 0.66, pose: 'wave', dir: 'l', speed: 10 }), 91);
      if (Q.detail && pulse(t, 9) > 0.6) speech(ctx, p.x, p.y, SURF + 1.0, "I'M OK", { size: 0.34 });
    });

    // ---------- The sleeping dad and the ball tower ----------
    const BX = 1.0, BY = 12.1;
    R.thing(4.2, 12.9, (ctx) => {
      // bench along x
      for (const lx of [BX + 0.1, BX + 2.9]) box(ctx, lx, BY + 0.2, 0, 0.15, 0.5, 0.6, C.ink, { flat: true });
      box(ctx, BX, BY, 0.6, 3.2, 0.9, 0.15, C.wood, { top: C.woodLight });
      box(ctx, BX, BY - 0.05, 0.75, 3.2, 0.15, 0.8, C.wood, { top: C.woodLight });
    });
    const THROW = 2.4, BIG = 16;
    const HAND = [7.0, 10.4];
    const BELLY = [2.55, 12.45, 1.25];
    R.mover(() => ({ x: 2.6, y: 12.5 }), (ctx, t) => {
      const [X, Y] = P(BX + 0.6, BY + 0.45, 0.75);
      ctx.save();
      ctx.translate(X, Y);
      ctx.rotate(0.46);
      ctx.translate(-X, -Y);
      person(ctx, BX + 0.6, BY + 0.45, 0.75, folk(140, { pose: 'sleep', dir: 'l', top: C.green, bottom: C.navy, style: 'bald', skin: '#E3A97F' }), t);
      ctx.restore();
      // the tower of balls on his tummy
      const tt = pulse(t, BIG) * BIG;
      let n = 0;
      for (let j = 0; j < 5; j++) if (tt >= j * THROW + 2.08) n++;
      const collapse = tt >= 5 * THROW + 2.08 ? (tt - (5 * THROW + 2.08)) / (BIG - (5 * THROW + 2.08)) : -1;
      const [bx, by] = P(...BELLY);
      for (let j = 0; j < n; j++) {
        let dx = Math.sin(t * 2 + j) * 0.02 * j, dy = -j * 0.33;
        let a = 1;
        if (collapse >= 0) {
          const q = clamp(collapse * 2.2 - j * 0.1);
          dx += (j % 2 ? 1 : -0.6) * q * (0.8 + j * 0.25);
          dy += (j * 0.33 + 0.9) * q - Math.sin(q * Math.PI) * 0.6;
          a = 1 - clamp((collapse - 0.75) * 4);
        }
        ctx.globalAlpha = a;
        ball(ctx, bx + dx, by + dy, 0.18, ballCol(8, j));
      }
      ctx.globalAlpha = 1;
      if (collapse >= 0.2 && collapse < 0.9 && Q.detail) speech(ctx, BX + 1.8, BY + 0.2, 2.6, 'five more minutes', { size: 0.34 });
    }, { depth: 17.2 });

    // The ball thrower
    R.mover(() => ({ x: HAND[0], y: HAND[1] }), (ctx, t, p) => {
      const q = pulse(t, THROW);
      let aA;
      if (q < 0.35) aA = lerp(0.3, -2.6, q / 0.35);
      else if (q < 0.45) aA = lerp(-2.6, 2.2, (q - 0.35) / 0.1);
      else aA = lerp(2.2, 0.3, clamp((q - 0.45) / 0.3));
      sunk(ctx, t, p.x, p.y, 1.2, folk(150, { scale: 0.7, pose: 'stand', dir: 'l', arms: [aA, -0.2], top: C.mustard, hat: 'cap' }), 92);
    });
    R.air((ctx, t) => {
      const tt = pulse(t, BIG) * BIG;
      const j = Math.floor(tt / THROW);
      if (j > 5) return;
      const k = (tt - j * THROW - 1.08) / 1.0;
      if (k < 0 || k > 1) return;
      const top = BELLY[2] + Math.min(j, 5) * 0.3;
      const x = lerp(HAND[0], BELLY[0], k), y = lerp(HAND[1], BELLY[1], k);
      const z = lerp(SURF + 1.35, top, k) + Math.sin(k * Math.PI) * 2.4;
      const [X, Y] = P(x, y, z);
      ball(ctx, X, Y, 0.18, ballCol(8, j));
    });

    // ---------- Trampolines ----------
    const tramp = (ctx, cx, cy, dip, col) => {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        box(ctx, cx + Math.cos(a) * 0.9 - 0.06, cy + Math.sin(a) * 0.9 - 0.06, 0, 0.12, 0.12, 0.55, C.ink, { flat: true, stroke: false });
      }
      disc(ctx, cx, cy, 0.6, 1.1, col, { dots: shade(col, 0.4), density: 0.2 });
      const [X, Y] = P(cx, cy, 0.6);
      ctx.beginPath();
      ctx.ellipse(X, Y + dip * 0.5, 0.85 * Math.SQRT2, 0.85 * Math.SQRT2 / 2 + dip * 0.2, 0, 0, Math.PI * 2);
      paint(ctx, C.night, { lw: 0.04 });
    };
    const bounce = (t, per, hMax) => { const q = pulse(t, per); return { z: 4 * q * (1 - q) * hMax, q }; };
    // a kid doing flips
    R.thing(14.7, 6.8, (ctx, t) => {
      const b = bounce(t, 1.1, 2.6);
      const n = Math.floor(t / 1.1);
      tramp(ctx, 14.7, 6.8, b.z < 0.15 ? 0.25 : 0, C.coral);
      const [X, Y] = P(14.7, 6.8, 0.65 + b.z + 0.8);
      ctx.save();
      if (n % 3 === 2) { ctx.translate(X, Y); ctx.rotate(-b.q * Math.PI * 2); ctx.translate(-X, -Y); }
      person(ctx, 14.7, 6.8, 0.65 + b.z, folk(160, { scale: 0.68, pose: b.z > 0.3 ? 'cheer' : 'stand', dir: 'l', top: C.pink, style: 'long' }), t);
      ctx.restore();
    }, { anim: true });
    // a grown-up who has read the sign and decided it is not for him
    R.thing(14.7, 10.3, (ctx, t) => {
      const b = bounce(t + 0.3, 1.5, 1.3);
      tramp(ctx, 14.7, 10.3, b.z < 0.15 ? 0.4 : 0, C.teal);
      person(ctx, 14.7, 10.3, 0.65 + b.z, folk(161, { pose: b.z > 0.2 ? 'cheer' : 'stand', dir: 'l', top: C.navy, bottom: C.grey, style: 'short', hair: C.grey }), t);
      if (Q.detail && b.q > 0.3 && b.q < 0.7) label(ctx, 15.4, 10.0, 3.7 + b.z, '!', 0.6, C.coral);
    }, { anim: true });
    R.thing(15.7, 12.9, (ctx) => {
      box(ctx, 15.65, 12.85, 0, 0.08, 0.08, 1.9, C.ink, { flat: true });
      face(ctx, [[15.7, 12.3, 1.4], [15.7, 13.5, 1.4], [15.7, 13.5, 2.2], [15.7, 12.3, 2.2]], C.butter, { lw: 0.04 });
      paintTextX(ctx, 15.71, 12.9, 1.95, 'KIDS', 0.3, C.coral);
      paintTextX(ctx, 15.71, 12.9, 1.62, 'ONLY', 0.3, C.coral);
    });
    R.mover(() => ({ x: 15.1, y: 12.0 }), (ctx, t, p) => {
      const pt = pulse(t, 6) > 0.55;
      person(ctx, p.x, p.y, 0, folk(162, { pose: pt ? 'point' : 'stand', dir: 'r', back: true, top: C.coral, bottom: C.navy, hat: 'cap', style: 'pony' }), t);
      if (pt && Q.detail) speech(ctx, p.x, p.y, 2.7, 'SIR.', { size: 0.4 });
    });

    // ---------- Bouncy castle ----------
    const castleKids = [[11.2, 2.2, 0, 163], [12.8, 2.9, 0.4, 164], [14.2, 1.9, 0.75, 165]];
    R.thing(CX1, CY1, (ctx, t) => {
      const { k, sq } = castleWob(t);
      const [OX, OY] = CASTLE_ORIGIN;
      ctx.save();
      ctx.translate(OX, OY);
      ctx.transform(1, 0, -k, 1 + sq, 0, 0);
      ctx.translate(-OX, -OY);
      box(ctx, CX0, CY0, 0, CX1 - CX0, CY1 - CY0, CB, C.sky, { top: C.coral, dotsT: shade(C.coral, 0.3), densT: 0.15 });
      box(ctx, CX0, CY0, CB, CX1 - CX0, 0.35, 2.4, C.mustard, { top: C.butter });
      box(ctx, CX0, CY0, CB, 0.35, CY1 - CY0, 2.4, C.mustard, { top: C.butter });
      // arches painted on the back walls
      for (let x = CX0 + 1.1; x < CX1 - 0.6; x += 1.3) face(ctx, [[x, CY0 + 0.36, CB + 0.3], [x + 0.8, CY0 + 0.36, CB + 0.3], [x + 0.8, CY0 + 0.36, CB + 1.6], [x + 0.4, CY0 + 0.36, CB + 2.0], [x, CY0 + 0.36, CB + 1.6]], C.coral, { lw: 0.03 });
      turret(ctx, CX0, CY0, 3.0, C.teal, C.coral, C.white);
      turret(ctx, CX1, CY0, 3.0, C.teal, C.mustard, C.white);
      turret(ctx, CX0, CY1, 3.0, C.teal, C.mustard, C.white);
      // bouncing kids
      for (const [x, y, ph, seed] of castleKids) {
        const b = bounce(t + ph, 0.8, 1.2);
        person(ctx, x, y, CB + b.z, folk(seed, { scale: 0.66, pose: b.z > 0.2 ? 'cheer' : 'stand', dir: seed % 2 ? 'l' : 'r' }), t);
      }
      // front: low padded walls and net
      box(ctx, CX0 + 0.3, CY1 - 0.35, CB, CX1 - CX0 - 0.6, 0.35, 0.6, C.coral, { top: C.coralLight });
      box(ctx, CX1 - 0.35, CY0 + 0.3, CB, 0.35, CY1 - CY0 - 0.6, 0.6, C.coral, { top: C.coralLight });
      face(ctx, [[CX0 + 0.3, CY1 - 0.17, CB + 0.6], [CX1 - 0.17, CY1 - 0.17, CB + 0.6], [CX1 - 0.17, CY1 - 0.17, CB + 2.4], [CX0 + 0.3, CY1 - 0.17, CB + 2.4]], alpha(C.white, 0.18), { lw: 0.04 });
      face(ctx, [[CX1 - 0.17, CY0 + 0.3, CB + 0.6], [CX1 - 0.17, CY1 - 0.17, CB + 0.6], [CX1 - 0.17, CY1 - 0.17, CB + 2.4], [CX1 - 0.17, CY0 + 0.3, CB + 2.4]], alpha(C.white, 0.18), { lw: 0.04 });
      if (Q.detail) {
        ctx.beginPath();
        for (let x = CX0 + 0.6; x < CX1 - 0.2; x += 0.35) { const a = P(x, CY1 - 0.17, CB + 0.6), b = P(x, CY1 - 0.17, CB + 2.4); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
        for (let y = CY0 + 0.6; y < CY1 - 0.2; y += 0.35) { const a = P(CX1 - 0.17, y, CB + 0.6), b = P(CX1 - 0.17, y, CB + 2.4); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
        ctx.strokeStyle = alpha(C.ink, 0.35);
        ctx.lineWidth = 0.025;
        ctx.stroke();
      }
      turret(ctx, CX1, CY1, 3.0, C.teal, C.coral, C.white);
      // flagpole with a shoe hanging off it by its laces
      const tz = CB + 3.0 + 1.25;
      face(ctx, [[CX1, CY1, tz], [CX1, CY1, tz + 0.9]], null, { lw: 0.06 });
      const sw = Math.sin(t * 2.2) * 0.25;
      const [px, py] = P(CX1, CY1, tz + 0.85);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(sw);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 0.52);
      ctx.strokeStyle = C.white; ctx.lineWidth = 0.035; ctx.stroke();
      ctx.translate(0, 0.72);
      ctx.scale(1.5, 1.5);
      ctx.beginPath();
      ctx.moveTo(-0.3, 0.14); ctx.lineTo(-0.3, -0.05); ctx.quadraticCurveTo(-0.15, -0.2, 0.0, -0.12);
      ctx.lineTo(0.2, 0.0); ctx.quadraticCurveTo(0.34, 0.04, 0.32, 0.14); ctx.closePath();
      paint(ctx, C.red, { lw: 0.04 });
      ctx.beginPath(); ctx.rect(-0.3, 0.1, 0.62, 0.07); paint(ctx, C.white, { lw: 0.03 });
      ctx.restore();
      ctx.restore();
    }, { depth: 10, anim: true });
    R.find({
      id: 'shoe', label: 'A lost shoe', r: 0.8,
      at: (t) => {
        const { k, sq } = castleWob(t);
        const z = CB + 3.0 + 1.25 + 0.3;
        const b = P(CX1, CY1, z)[1] - CASTLE_ORIGIN[1];
        const dX = -k * b, dY = sq * b;
        return [CX1 + dX / 2, CY1 - dX / 2, z - dY / ZK];
      },
    });

    // ---------- Coin ride ----------
    R.thing(1.9, 9.8, (ctx, t) => {
      box(ctx, 0.7, 9.0, 0, 1.4, 1.5, 0.35, C.grey, { top: C.greyLight });
      label(ctx, 1.9, 10.4, 0.2, '20c', 0.26, C.ink);
      const [X, Y] = P(1.4, 9.75, 0.35);
      const rock = Math.sin(t * 3.2) * 0.12;
      ctx.save();
      ctx.translate(X, Y);
      ctx.rotate(rock);
      // a fat little rocket
      ctx.beginPath();
      ctx.moveTo(-0.9, -0.2); ctx.quadraticCurveTo(-0.9, -0.95, 0.1, -0.95);
      ctx.quadraticCurveTo(0.95, -0.9, 1.1, -0.5); ctx.quadraticCurveTo(0.95, -0.15, 0.1, -0.1);
      ctx.closePath();
      paint(ctx, C.white, { dots: C.grey, density: 0.2 });
      ctx.beginPath(); ctx.moveTo(-0.9, -0.3); ctx.lineTo(-1.2, 0); ctx.lineTo(-0.6, -0.15); paint(ctx, C.coral);
      ctx.beginPath(); ctx.moveTo(-0.9, -0.8); ctx.lineTo(-1.2, -1.15); ctx.lineTo(-0.6, -0.9); paint(ctx, C.coral);
      ctx.beginPath(); ctx.arc(0.55, -0.55, 0.16, 0, Math.PI * 2); paint(ctx, C.sky);
      ctx.restore();
      person(ctx, 1.2 + rock * 0.3, 9.55, 0.72 - rock * 0.3, folk(170, { scale: 0.55, pose: 'sit', arms: [2.5 + Math.sin(t * 3.2) * 0.3, -2.5], dir: 'r', hat: 'helmet' }), t);
    }, { anim: true });

    // ---------- Birthday party ----------
    const TY0 = 13.7, TY1 = 14.9, TZT = 0.9;
    const tcol = [C.white, C.butter];
    for (let x = 7.2, i = 0; x < 12.39; x += 1.04, i++) {
      const xx = x, ii = i;
      R.thing(xx + 0.52, (TY0 + TY1) / 2, (ctx) => {
        if (ii === 0 || ii === 4) for (const lx of [xx + (ii ? 0.8 : 0.1)]) box(ctx, lx, TY1 - 0.25, 0, 0.12, 0.12, TZT, C.ink, { flat: true });
        box(ctx, xx, TY0, 0.45, 1.04, TY1 - TY0, TZT - 0.45, C.pink, { top: tcol[ii % 2], dotsT: C.pink, densT: 0.12, lw: 0.04 });
        // plate and cup
        disc(ctx, xx + 0.5, TY0 + 0.35, TZT + 0.01, 0.22, C.white, { lw: 0.03 });
        disc(ctx, xx + 0.5, TY1 - 0.35, TZT + 0.01, 0.22, C.white, { lw: 0.03 });
        if (ii !== 2) {
          disc(ctx, xx + 0.5, TY0 + 0.35, TZT + 0.03, 0.1, C.coral, { stroke: false });
          cylinder(ctx, xx + 0.85, TY0 + 0.75, TZT, 0.09, 0.25, PAD[ii % PAD.length]);
        }
      });
    }
    // cake with trick candles
    const CAKE = [9.8, 14.3];
    const blowT = (t) => pulse(t, 7.5) * 7.5;
    R.thing(CAKE[0], CAKE[1] + 0.05, (ctx, t) => {
      cylinder(ctx, CAKE[0], CAKE[1], TZT, 0.42, 0.28, C.pink, { top: C.white });
      cylinder(ctx, CAKE[0], CAKE[1], TZT + 0.28, 0.3, 0.24, C.pink, { top: C.white });
      const s = blowT(t);
      const lit = s < 3.4 || s > 5.6;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const cx = CAKE[0] + Math.cos(a) * 0.18, cy = CAKE[1] + Math.sin(a) * 0.18;
        const [X, Y] = P(cx, cy, TZT + 0.52);
        ctx.fillStyle = PAD[i];
        ctx.fillRect(X - 0.025, Y - 0.25, 0.05, 0.25);
        if (lit) {
          const f = 1 + Math.sin(t * 17 + i * 2) * 0.15;
          ctx.beginPath();
          ctx.ellipse(X, Y - 0.34, 0.05 * f, 0.1 * f, 0, 0, Math.PI * 2);
          ctx.fillStyle = C.mustard;
          ctx.fill();
        } else if (Q.detail) {
          const q = (s - 3.4) / 2.2;
          ctx.beginPath();
          ctx.moveTo(X, Y - 0.28);
          ctx.quadraticCurveTo(X + Math.sin(t * 5 + i) * 0.15, Y - 0.5 - q * 0.4, X + 0.05, Y - 0.7 - q * 0.6);
          ctx.strokeStyle = alpha(C.grey, 1 - q);
          ctx.lineWidth = 0.04;
          ctx.stroke();
        }
      }
    }, { anim: true });
    // the party guests
    const guests = [[7.7, 13.1, 180], [8.7, 13.15, 181], [10.9, 13.15, 183], [11.9, 13.1, 184]];
    guests.forEach(([x, y, seed], i) => {
      R.thing(x, y, (ctx, t) => {
        const s = blowT(t);
        const pose = s > 5.6 && s < 6.6 ? 'cheer' : 'stand';
        person(ctx, x, y, 0, folk(seed, { scale: 0.68, pose, dir: i < 2 ? 'r' : 'l', hat: 'party' }), t);
        if (Q.detail && s < 3.2 && i % 2 === 0) {
          const q = pulse(t + i, 1.6);
          note(ctx, x - q * 0.4, y - q * 0.4, 1.9 + q * 1.2, alpha(C.ink, 1 - q), 0.8);
        }
      }, { anim: true });
    });
    // birthday kid
    R.thing(CAKE[0], 13.15, (ctx, t) => {
      const s = blowT(t);
      const blowing = s > 2.9 && s < 3.6;
      const [X, Y] = P(CAKE[0], 13.15, 0);
      ctx.save();
      if (blowing) { ctx.translate(X, Y); ctx.rotate(0.12); ctx.translate(-X, -Y); }
      person(ctx, CAKE[0], 13.15, 0, folk(182, { scale: 0.72, pose: s > 5.6 && s < 7 ? 'point' : 'stand', dir: 'r', hat: 'party', top: C.mustard }), t);
      ctx.restore();
      if (!Q.detail) return;
      if (blowing) {
        const [hx, hy] = P(CAKE[0] + 0.2, 13.35, 1.4);
        ctx.strokeStyle = C.sky;
        ctx.lineWidth = 0.05;
        ctx.lineCap = 'round';
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(hx + 0.1, hy + i * 0.08);
          ctx.lineTo(hx + 0.35 + (s - 2.9) * 0.4, hy + 0.15 + i * 0.12);
          ctx.stroke();
        }
      }
      if (s > 5.6 && s < 7.3) speech(ctx, CAKE[0], 13.15, 2.4, 'AGAIN?!', { size: 0.4 });
    }, { anim: true });
    // two guests on the near side, and the parent filming it
    R.thing(8.4, 15.5, (ctx, t) => person(ctx, 8.4, 15.5, 0, folk(185, { scale: 0.7, pose: 'stand', dir: 'l', back: true, hat: 'party' }), t), { anim: true });
    R.thing(11.1, 15.55, (ctx, t) => person(ctx, 11.1, 15.55, 0, folk(186, { scale: 0.66, pose: blowT(t) > 5.6 ? 'cheer' : 'stand', dir: 'r', back: true, hat: 'party' }), t), { anim: true });
    R.thing(13.3, 14.6, (ctx, t) => {
      person(ctx, 13.3, 14.6, 0, folk(187, {
        pose: 'point', dir: 'l', top: C.teal, style: 'bun',
        hold: (g) => { g.beginPath(); g.roundRect(0.35, -0.2, 0.22, 0.38, 0.05); paint(g, C.ink, { lw: 0.02 }); },
      }), t);
      if (Q.detail && pulse(t, 7.5) * 7.5 > 3.0 && pulse(t, 7.5) * 7.5 < 3.2) {
        const [X, Y] = P(13.3, 14.6, 1.7);
        ctx.beginPath();
        ctx.arc(X - 0.8, Y, 0.35, 0, Math.PI * 2);
        ctx.fillStyle = alpha(C.white, 0.9);
        ctx.fill();
      }
    }, { anim: true });
    // presents
    R.thing(15.3, 15.6, (ctx) => {
      box(ctx, 14.9, 14.9, 0, 0.7, 0.7, 0.6, C.purple, { top: tint(C.purple, 0.3) });
      box(ctx, 15.0, 15.0, 0.6, 0.5, 0.5, 0.4, C.mustard, { top: C.butter });
      face(ctx, [[15.25, 15.0, 1.0], [15.25, 15.5, 1.0]], null, { lw: 0.06, stroke: C.coral });
      face(ctx, [[15.0, 15.25, 1.0], [15.5, 15.25, 1.0]], null, { lw: 0.06, stroke: C.coral });
    });
    // balloon bunch tied to the presents
    R.thing(15.35, 15.35, (ctx, t) => {
      const cols = [C.pink, C.mustard, C.teal, C.purple, C.sky];
      const [ax, ay] = P(15.25, 15.25, 1.0);
      cols.forEach((c, i) => {
        const bx = ax + Math.sin(t * 1.1 + i * 1.3) * 0.12 + (i - 2) * 0.3;
        const by = ay - 2.2 - (i % 2) * 0.45 - Math.cos(t * 0.9 + i) * 0.06;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(bx - 0.1, (ay + by) / 2, bx, by + 0.4);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(bx, by, 0.3, 0.38, 0, 0, Math.PI * 2); paint(ctx, c, { lw: 0.04 });
        ctx.beginPath(); ctx.ellipse(bx - 0.1, by - 0.12, 0.06, 0.1, -0.4, 0, Math.PI * 2); ctx.fillStyle = HL; ctx.fill();
      });
    }, { anim: true });

    // pizza delivery from the front door, carried the long way round
    const pizza = route([[0.9, 14.2, 1.5], [3.5, 14.2], [6.5, 14.9, 2]], { speed: 1.1, loop: false });
    R.mover(pizza, (ctx, t, p) => {
      const carrying = p.dir === 'r' || !p.moving;
      person(ctx, p.x, p.y, 0, folk(190, {
        pose: carrying ? 'carry' : 'walk', dir: p.dir, back: p.back, top: C.red, hat: 'cap',
        hold: carrying ? (g) => { for (let i = 0; i < 3; i++) { g.beginPath(); g.rect(0.0, -0.1 - i * 0.16, 0.75, 0.15); paint(g, i % 2 ? C.wood : C.woodLight, { lw: 0.025 }); } } : undefined,
      }), t);
    });

    // the dino mascot and its biggest fan
    R.thing(1.6, 15.1, (ctx, t) => {
      const sp = 5, ph = 3;
      person(ctx, 1.6, 15.1, 0, { skin: C.leaf, top: C.green, bottom: C.green, shoes: C.green, style: 'bald', pose: 'dance', dir: 'r', scale: 1.1, speed: sp, phase: ph }, t);
      const lift = Math.abs(Math.sin(ph + t * sp)) * 0.15 * 1.1;
      const [X, Y] = P(1.6, 15.1, 0);
      const hx = X + 0.1, hy = Y - 2.2 * 1.1 - lift;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) { ctx.moveTo(hx - 0.5 + i * 0.25, hy - 0.4); ctx.lineTo(hx - 0.38 + i * 0.25, hy - 0.72 + (i % 2) * 0.05); ctx.lineTo(hx - 0.26 + i * 0.25, hy - 0.4); }
      paint(ctx, C.mustard, { lw: 0.03 });
      ctx.beginPath();
      ctx.ellipse(hx, hy, 0.55, 0.48, 0, 0, Math.PI * 2);
      ctx.ellipse(hx + 0.45, hy + 0.1, 0.35, 0.28, 0, 0, Math.PI * 2);
      paint(ctx, C.leaf, { dots: C.green, density: 0.2 });
      ctx.fillStyle = C.white;
      ctx.beginPath(); ctx.arc(hx + 0.12, hy - 0.12, 0.14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.ink;
      ctx.beginPath(); ctx.arc(hx + 0.16, hy - 0.12, 0.06, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hx + 0.4, hy + 0.2, 0.2, 0.2, Math.PI - 0.2); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.04; ctx.stroke();
    }, { anim: true });
    R.thing(2.6, 15.5, (ctx, t) => person(ctx, 2.6, 15.5, 0, folk(191, { scale: 0.6, pose: 'cheer', dir: 'l', top: C.coral, style: 'pony' }), t), { anim: true });

    // a kid sock-skating along the front (it is SOCKS ONLY, after all)
    const sock = route([[5.0, 15.7], [12.5, 15.8]], { speed: 2.4, loop: false, offset: 2 });
    R.mover(sock, (ctx, t, p) => person(ctx, p.x, p.y, 0, folk(192, { scale: 0.66, pose: 'skate', dir: p.dir, top: C.sky, shoes: C.white, speed: 4 }), t));

    // ---------- Air: balloons ----------
    R.air((ctx, t) => {
      if (!Q.detail) return;
      const cols = [C.mustard, C.teal, C.pink, C.purple];
      particles(t, 4, 16, (k, r, i) => {
        const x = 13 + r() * 1.5 - k * 5, y = 13.2 + r() - k * 4;
        const z = 3 + k * 7;
        const [X, Y] = P(x + Math.sin(k * 9 + i) * 0.4, y, z);
        ctx.globalAlpha = k < 0.85 ? 1 : (1 - k) / 0.15;
        ctx.beginPath(); ctx.moveTo(X, Y + 0.35); ctx.quadraticCurveTo(X + 0.15, Y + 0.7, X - 0.05, Y + 1.1);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(X, Y, 0.26, 0.33, 0, 0, Math.PI * 2); paint(ctx, cols[i % 4], { lw: 0.04 });
        ctx.globalAlpha = 1;
      }, 5);
    });
    // The red balloon, loose and taking the scenic route (a find)
    const redB = (t) => [8.5 + Math.sin(t / 9) * 4.5, 8.5 + Math.sin(t / 7 + 1) * 4.2, 6.2 + Math.sin(t * 0.8) * 0.3];
    R.air((ctx, t) => {
      const [x, y, z] = redB(t);
      const [X, Y] = P(x, y, z);
      ctx.beginPath(); ctx.moveTo(X, Y + 0.38); ctx.bezierCurveTo(X + 0.2, Y + 0.8, X - 0.2, Y + 1.1, X + Math.sin(t * 2) * 0.1, Y + 1.5);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(X, Y, 0.3, 0.38, Math.sin(t) * 0.1, 0, Math.PI * 2); paint(ctx, C.red, { lw: 0.05 });
      ctx.beginPath(); ctx.moveTo(X - 0.06, Y + 0.44); ctx.lineTo(X + 0.06, Y + 0.44); ctx.lineTo(X, Y + 0.36); paint(ctx, C.red, { lw: 0.03 });
      ctx.beginPath(); ctx.ellipse(X - 0.1, Y - 0.14, 0.06, 0.11, -0.4, 0, Math.PI * 2); ctx.fillStyle = HL; ctx.fill();
    });
    R.find({ id: 'balloon', label: 'A red balloon', at: redB, r: 0.8 });

    // Splashes of balls when a slider lands
    R.air((ctx, t) => {
      if (!Q.detail) return;
      kids.forEach((kp, i) => {
        const tt = pulse(t + (i * SLIDE_T) / 3, SLIDE_T) * SLIDE_T;
        const q = (tt - 9.6) / 0.9;
        if (q < 0 || q > 1) return;
        for (let j = 0; j < 8; j++) {
          const a = (j / 8) * Math.PI * 2 + i;
          const d = q * (1 + (j % 3) * 0.3);
          const [X, Y] = P(LAND[0] + Math.cos(a) * d, LAND[1] + Math.sin(a) * d, SURF + Math.sin(q * Math.PI) * (1.2 + (j % 2) * 0.6));
          ball(ctx, X, Y, 0.17, ballCol(40 + i, j));
        }
      });
    });

    // ---------- The goose, periscoping through the balls ----------
    const gpath = route([[10.4, 6.4, 1.5], [12.0, 8.3], [11.2, 10.4, 2], [9.4, 10.0], [8.6, 8.1, 1.5], [9.3, 6.6]], { speed: 0.55 });
    const gpos = memo((t) => { const p = gpath(t); return { ...p, z: SURF - 0.1 + Math.sin(t * 2.4) * 0.03, pose: 'swim' }; });
    R.goose(gpos, { bias: 0 });
    R.mover(gpos, (ctx, t, p) => {
      const [X, Y] = P(p.x, p.y, SURF);
      const pts = [[-0.5, 0.12], [-0.22, 0.2], [0.08, 0.2], [0.38, 0.14], [-0.62, 0.3], [-0.35, 0.38], [-0.05, 0.4], [0.25, 0.38], [0.52, 0.3]];
      pts.forEach(([dx, dy], i) => ball(ctx, X + dx * (p.dir === 'l' ? -1 : 1), Y + dy, 0.19, ballCol(55, i)));
    }, { bias: 0.001 });
  },
};

// Text on a plane parallel to the left wall at x = x0 ('left' orientation).
function paintTextX(ctx, x0, u, v, text, size, color) {
  ctx.save();
  ctx.translate(x0, x0 / 2);
  paintText(ctx, 'left', u, v, text, size, color);
  ctx.restore();
}
