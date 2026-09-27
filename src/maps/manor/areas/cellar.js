// Wine Cellar: stone vaults under the kitchen, and the Lord's wine. Jenkins the
// butler is packing his trunk and drinking the 1974 (since nobody is paying
// him anyway), a barrel by the left wall is not just a barrel, and the storm
// is getting in through the light well. You also see in from outside, through
// the cut in the lawn on the right of the plate.
//
// The evening, as the cellar sees it (seconds into the 180-second loop; the
// times come from Jenkins's walk in evening.js, so they follow it if it moves):
//     0  nobody here. The rats commute through the barrel every 30 seconds.
//    43  Jenkins comes down the steps (the engine draws him).
//    53  he stands by his trunk: a bottle from the 1974 case every seven or so
//        seconds, an empty on the floor after each, and one more thing
//        squeezed into the trunk. 58: "Nobody pays me anyway".
//    82  lights out: the bulb dies, the candles carry on, so does Jenkins.
//    95  the scream upstairs: "!", he drops the bottle and runs up the steps.
//   after that, the empties, the bulging trunk and the rats, until dinner
//        starts the evening over.
import {
  C, Q, box, rect, disc, cylinder, face, paint, P, slab, goose,
  mix, shade, tint, alpha, hash, rng,
} from '../../../engine/art.js';
import { particles, clamp, ease } from '../../../engine/actors.js';
import { ZK } from '../../../engine/iso.js';
import { INK, MAT, ROOM, NIGHT, house, storm, lastStrike } from '../style.js';
import { DOORS, LOOP } from '../plan.js';

// ---------- Inks ----------
const RM = ROOM.cellar;
const STONE = RM.wall;
const STONE_R = shade(RM.wall, 0.07); // the right wall, a touch darker
const RECESS = shade(RM.wall, 0.3); // under the arches
const FLAG = RM.floor;
const OAK = RM.trim;
const OAK_D = shade(OAK, 0.35);
const OAK_DD = mix(OAK, C.black, 0.66);
const PINE = MAT.pine;
const BRICK = mix(MAT.terracotta, RM.wall, 0.3);
const IRON = mix(INK.stormNavy, C.black, 0.35);
const WATER = mix(INK.stormNavy, INK.verdigris, 0.4);
const GLASS = [MAT.wine, mix(INK.verdigris, INK.stormNavy, 0.55), shade(MAT.wine, 0.35), mix(INK.verdigris, C.black, 0.45)];
const FOIL = [INK.oxblood, MAT.brass, INK.bone, MAT.velvetDark, INK.verdigris];
const COLD = mix(INK.bone, NIGHT.flash, 0.6); // the draft from behind the barrel
const RATS = mix(C.grey, INK.stormNavy, 0.35);
const TRUNK_C = mix(INK.verdigris, INK.stormNavy, 0.45);
const STRAP = shade(MAT.mahogany, 0.1);
const CHALK = alpha(INK.bone, 0.82);
// Jenkins's paperwork, gone a bit damp and grey down here.
const PAPER = mix(MAT.paper, FLAG, 0.14);
const PAPER_OLD = mix(MAT.paper, PINE, 0.4);
const NEWS = mix(MAT.paper, FLAG, 0.36);
const PEN = alpha(INK.stormNavy, 0.6);
const WORDS = '"Rethink Sans", system-ui, sans-serif';
const DISPLAY = '"Bagel Fat One", "Arial Black", sans-serif';

// ---------- Where things are (the greybox's layout) ----------
const CASK = { x0: 0.5, x1: 2.8, y: 11.5, z: 1.02, r: 0.8 }; // the barrel that isn't
const TRUNK = { x: 5, y: 6, w: 2, d: 1.2 }; // Jenkins's, lid at 0.8
const STEPS = { x: 12.2, y: 9.5, w: 2, d: 5, rise: 7.1, n: 12 }; // up to the kitchen hatch
const HOLE = 11.6; // the mousehole, along the right wall
const WIN = { x: 14.2, z: 4.55, w: 1.4, h: 0.9 }; // the light well, on the right wall

const loopT = (t) => ((t % LOOP) + LOOP) % LOOP;

// ---------- Drawing flat on a surface ----------
// In a surface's own units: a runs across it and b runs down it, from the
// point (u, v) on it. inX: a face at x = x0, facing +x like the left wall (a
// runs toward the back corner). inY: a face at y = y0, facing +y like the
// right wall (a runs toward the front). inZ: lying flat at height z.
const inX = (ctx, x0, u, v) => ctx.transform(1, -0.5, 0, ZK, x0 - u, x0 / 2 + u / 2 - v * ZK);
const inY = (ctx, y0, u, v) => ctx.transform(1, 0.5, 0, ZK, u - y0, (u + y0) / 2 - v * ZK);
const inZ = (ctx, x, y, z) => ctx.transform(1, 0.5, -1, 0.5, x - y, (x + y) / 2 - z * ZK);

// Text at (a, b) in whatever surface the context is drawing on. size in units.
function words(ctx, s, a, b, size, color, o = {}) {
  const k = 40;
  ctx.save();
  ctx.translate(a, b);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale(1 / k, 1 / k);
  ctx.font = `${o.weight || 700} ${size * k}px ${o.font || WORDS}`;
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = 'middle';
  if (o.outline) {
    ctx.lineWidth = o.outline * k;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = C.ink;
    ctx.strokeText(s, 0, 0);
  }
  ctx.fillStyle = color;
  ctx.fillText(s, 0, 0);
  ctx.restore();
}

// Upright text that faces you, with an ink outline (hic, the "!").
function shout(ctx, x, y, z, s, size, color, a = 1) {
  if (a <= 0.01) return;
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(X, Y);
  words(ctx, s, 0, 0, size, color, { font: DISPLAY, weight: 400, outline: 0.08 });
  ctx.restore();
}

// ---------- Papers ----------
// A sheet lying flat at (x, y, z), turned by rot in its own plane, w across
// and h down. marks(ctx) draws on it in its own units, from its center.
function sheet(ctx, x, y, z, w, h, rot, color, marks) {
  ctx.save();
  inZ(ctx, x, y, z);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.rect(-w / 2, -h / 2, w, h);
  paint(ctx, color, { lw: 0.016 });
  if (marks && Q.detail) marks(ctx);
  ctx.restore();
}

// Lines of handwriting (or print): n of them from b0, step apart, ragged.
function scrawl(ctx, a0, a1, b0, step, n, color, seed = 1, lw = 0.011) {
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const b = b0 + i * step;
    ctx.moveTo(a0, b);
    ctx.lineTo(a0 + (a1 - a0) * (0.55 + 0.45 * hash(seed, i)), b);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.stroke();
}

// A line of dots of thread: cobwebs, strung between points.
function strands(ctx, lines, color = alpha(INK.bone, 0.55), lw = 0.022) {
  ctx.beginPath();
  for (const pts of lines) pts.forEach(([x, y, z], i) => { const [X, Y] = P(x, y, z); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.stroke();
}

// A cobweb in a corner: threads fanning out from (x, y, z) along two
// directions (unit vectors), with sagging rings between them.
function cobweb(ctx, at, d1, d2, size, rings = 3) {
  if (!Q.detail) return;
  const [x, y, z] = at;
  const n = 5, lines = [];
  const dir = (k) => [d1[0] + (d2[0] - d1[0]) * k, d1[1] + (d2[1] - d1[1]) * k, d1[2] + (d2[2] - d1[2]) * k];
  for (let i = 0; i < n; i++) {
    const d = dir(i / (n - 1));
    lines.push([[x, y, z], [x + d[0] * size, y + d[1] * size, z + d[2] * size]]);
  }
  for (let j = 1; j <= rings; j++) {
    const s = (size * j) / (rings + 0.4);
    const ring = [];
    for (let i = 0; i < n; i++) {
      const d = dir(i / (n - 1));
      const sag = i % (n - 1) ? 0.9 : 1;
      ring.push([x + d[0] * s * sag, y + d[1] * s * sag, z + d[2] * s * sag - (i % (n - 1) ? 0.04 * j : 0)]);
    }
    lines.push(ring);
  }
  strands(ctx, lines);
}

// ---------- Bottles ----------
// Standing up, in screen space at a floor point. glass: its color; o.label,
// o.cap (foil), o.s (scale), o.tip (lean, radians).
function bottle(ctx, x, y, z, glass, o = {}) {
  const [X, Y] = P(x, y, z);
  const s = o.s || 1;
  ctx.save();
  ctx.translate(X, Y);
  if (o.tip) ctx.rotate(o.tip);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(-0.09, 0);
  ctx.lineTo(-0.09, -0.27);
  ctx.quadraticCurveTo(-0.09, -0.36, -0.035, -0.39);
  ctx.lineTo(-0.035, -0.52);
  ctx.lineTo(0.035, -0.52);
  ctx.lineTo(0.035, -0.39);
  ctx.quadraticCurveTo(0.09, -0.36, 0.09, -0.27);
  ctx.lineTo(0.09, 0);
  ctx.closePath();
  paint(ctx, glass, { lw: 0.028 });
  if (Q.detail) {
    if (o.label) {
      ctx.fillStyle = o.label;
      ctx.fillRect(-0.085, -0.22, 0.17, 0.12);
    }
    ctx.fillStyle = o.cap || MAT.brass;
    ctx.fillRect(-0.038, -0.52, 0.076, 0.07);
    ctx.fillStyle = alpha(INK.bone, 0.45);
    ctx.fillRect(0.035, -0.3, 0.025, 0.24);
  }
  ctx.restore();
}

// Lying on its side on the floor, pointing along (dx, dy); spin turns its label.
function bottleDown(ctx, x, y, glass, dx, dy, o = {}) {
  const [X, Y] = P(x, y, (o.z || 0) + 0.08);
  const ang = Math.atan2((dx + dy) / 2, dx - dy);
  ctx.save();
  ctx.translate(X, Y);
  if (Q.detail) {
    ctx.beginPath();
    ctx.ellipse(0, 0.07, 0.26, 0.07, 0, 0, Math.PI * 2);
    ctx.fillStyle = alpha(C.ink, 0.2);
    ctx.fill();
  }
  ctx.rotate(ang + Math.PI / 2);
  ctx.translate(0, 0.24);
  bottle(ctx, 0, 0, 0, glass, { label: o.label, cap: o.cap });
  if (Q.detail && o.spin != null) {
    ctx.fillStyle = alpha(C.ink, 0.35);
    ctx.fillRect(-0.085 + ((o.spin % 1) + 1) % 1 * 0.12, -0.22, 0.04, 0.12);
  }
  ctx.restore();
}

// ---------- Casks ----------
// A cask lying on its side along x, from its back head at x0 to its front head
// at x1 (which faces the room), around (yc, zc). r: its widest (the heads are a
// little narrower). o.door: how far the front head is swung open, in radians,
// for the one that's a door. o.chalk: something written on its head.
const PHI1 = -Math.atan(ZK), PHI2 = PHI1 + Math.PI; // where its outline runs
function caskAt(x, yc, zc, rho, phi) {
  const y = yc + rho * Math.cos(phi), z = zc + rho * Math.sin(phi);
  return [x - y, (x + y) / 2 - z * ZK];
}
function cask(ctx, x0, x1, yc, zc, r, o = {}) {
  const rad = (x) => r * (0.86 + 0.14 * Math.sin((Math.PI * (x - x0)) / (x1 - x0)));
  const wood = o.color || OAK;
  const N = 8;
  // Chocks underneath.
  if (o.chocks !== false) {
    for (const xc of [x0 + 0.35, x1 - 0.45]) box(ctx, xc - 0.12, yc - r * 0.75, 0, 0.24, r * 1.5, Math.max(0.1, zc - r * 0.8), OAK_D, { flat: true });
  }
  // The body: outline of the back head, along the top, round the front head, back along the bottom.
  const pts = [];
  for (let i = 0; i <= 10; i++) pts.push(caskAt(x0, yc, zc, rad(x0), PHI1 + (i / 10) * Math.PI));
  for (let i = 1; i <= N; i++) { const x = x0 + ((x1 - x0) * i) / N; pts.push(caskAt(x, yc, zc, rad(x), PHI2)); }
  for (let i = 1; i <= 10; i++) pts.push(caskAt(x1, yc, zc, rad(x1), PHI2 + (i / 10) * Math.PI));
  for (let i = N - 1; i >= 1; i--) { const x = x0 + ((x1 - x0) * i) / N; pts.push(caskAt(x, yc, zc, rad(x), PHI1)); }
  ctx.beginPath();
  pts.forEach(([X, Y], i) => (i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y)));
  ctx.closePath();
  paint(ctx, shade(wood, 0.1), { dots: shade(wood, 0.5), density: 0.18 });
  // Staves.
  if (Q.detail) {
    ctx.beginPath();
    for (let k = 1; k < 6; k++) {
      const phi = PHI1 + (k / 6) * Math.PI;
      for (let i = 0; i <= N; i++) {
        const x = x0 + ((x1 - x0) * i) / N;
        const [X, Y] = caskAt(x, yc, zc, rad(x), phi);
        i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      }
    }
    ctx.strokeStyle = shade(wood, 0.4);
    ctx.lineWidth = 0.025;
    ctx.stroke();
  }
  // Iron hoops, the side of each you can see.
  const L = x1 - x0;
  for (const f of [0.1, 0.3, 0.7, 0.9]) {
    const x = x0 + L * f;
    ctx.save();
    inX(ctx, x, yc, zc);
    ctx.beginPath();
    ctx.arc(0, 0, rad(x) + 0.01, PHI1 + Math.PI, PHI2 + Math.PI);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.1;
    ctx.stroke();
    ctx.strokeStyle = IRON;
    ctx.lineWidth = 0.06;
    ctx.stroke();
    ctx.restore();
  }
  if (o.stencil) {
    ctx.save();
    inY(ctx, yc + r * 0.99, (x0 + x1) / 2, zc + 0.05);
    words(ctx, o.stencil, 0, 0, 0.19, alpha(INK.bone, 0.8), { font: DISPLAY, weight: 400 });
    ctx.restore();
  }
  // The front head: shut, or swung open on its back edge like a door.
  const rh = rad(x1);
  const th = o.door || 0;
  if (th > 0.004) {
    ctx.save();
    inX(ctx, x1, yc, zc);
    ctx.beginPath();
    ctx.arc(0, 0, rh, 0, Math.PI * 2);
    paint(ctx, mix(C.black, INK.stormNavy, 0.4), { lw: 0.05 });
    if (Q.detail) { // a cold glint far inside
      ctx.beginPath();
      ctx.arc(-0.1, 0.05, rh * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = alpha(COLD, 0.12);
      ctx.fill();
    }
    ctx.restore();
    const hy = yc - rh;
    const door = (phi, s = 1) => {
      const rel = rh * s * (1 + Math.cos(phi)) + rh * (1 - s);
      return P(x1 + rel * Math.sin(th), hy + rel * Math.cos(th), zc + rh * s * Math.sin(phi));
    };
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) { const [X, Y] = door((i / 24) * Math.PI * 2); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
    ctx.closePath();
    paint(ctx, tint(wood, 0.08), { dots: shade(wood, 0.45), density: 0.12, lw: 0.05 });
    if (Q.detail) {
      ctx.beginPath();
      for (const q of [-0.5, 0, 0.5]) {
        const phi = Math.acos(q);
        const [X0, Y0] = door(phi), [X1, Y1] = door(-phi);
        ctx.moveTo(X0, Y0);
        ctx.lineTo(X1, Y1);
      }
      ctx.strokeStyle = shade(wood, 0.35);
      ctx.lineWidth = 0.025;
      ctx.stroke();
    }
    return;
  }
  ctx.save();
  inX(ctx, x1, yc, zc);
  ctx.beginPath();
  ctx.arc(0, 0, rh, 0, Math.PI * 2);
  paint(ctx, tint(wood, 0.08), { dots: shade(wood, 0.45), density: 0.12, lw: 0.05 });
  ctx.beginPath();
  ctx.arc(0, 0, rh - 0.07, 0, Math.PI * 2);
  ctx.strokeStyle = shade(wood, 0.3);
  ctx.lineWidth = 0.03;
  ctx.stroke();
  if (Q.detail) {
    ctx.beginPath();
    for (const q of [-0.5, 0, 0.5]) {
      const a = q * rh, h = Math.sqrt(rh * rh - a * a) - 0.07;
      ctx.moveTo(a, -h);
      ctx.lineTo(a, h);
    }
    ctx.strokeStyle = shade(wood, 0.35);
    ctx.lineWidth = 0.025;
    ctx.stroke();
    if (o.chalk) words(ctx, o.chalk, 0, -0.05, 0.16, CHALK, { weight: 700 });
  }
  if (o.tap) {
    ctx.fillStyle = MAT.brassDark;
    ctx.fillRect(-0.05, rh * 0.45, 0.1, 0.18);
  }
  ctx.restore();
}

// ---------- Critters ----------
// A rat, side on, in screen space at a floor point. o: { dir, moving, color,
// ears, hat (a party hat, from upstairs), s, a (fade) }
function rat(ctx, x, y, z, t, o = {}) {
  const [X, Y] = P(x, y, z);
  const f = o.dir === 'l' ? -1 : 1, s = o.s || 1;
  const col = o.color || RATS;
  const run = o.moving ? Math.sin(t * 34) : 0;
  ctx.save();
  if (o.a != null) ctx.globalAlpha *= clamp(o.a);
  ctx.translate(X, Y);
  ctx.scale(f * s, s);
  if (Q.detail) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.3, 0.07, 0, 0, Math.PI * 2);
    ctx.fillStyle = alpha(C.ink, 0.22);
    ctx.fill();
  }
  // tail
  ctx.beginPath();
  ctx.moveTo(-0.2, -0.1);
  ctx.quadraticCurveTo(-0.45, -0.02 + run * 0.06, -0.6, -0.14 - run * 0.04);
  ctx.strokeStyle = o.ears || mix(C.pink, RATS, 0.4);
  ctx.lineWidth = 0.035;
  ctx.lineCap = 'round';
  ctx.stroke();
  // legs, scurrying
  if (Q.detail) {
    ctx.beginPath();
    for (const [lx, ph] of [[-0.12, 0], [0.12, Math.PI]]) {
      ctx.moveTo(lx, -0.06);
      ctx.lineTo(lx + (o.moving ? Math.sin(t * 34 + ph) * 0.06 : 0), 0);
    }
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.035;
    ctx.stroke();
  }
  // body and head
  const bob = Math.abs(run) * 0.02;
  ctx.beginPath();
  ctx.ellipse(-0.02, -0.14 - bob, 0.22, 0.11, 0, 0, Math.PI * 2);
  paint(ctx, col, { lw: 0.028 });
  ctx.beginPath();
  ctx.moveTo(0.1, -0.23 - bob);
  ctx.quadraticCurveTo(0.3, -0.2 - bob, 0.36, -0.1 - bob);
  ctx.quadraticCurveTo(0.24, -0.05 - bob, 0.1, -0.06 - bob);
  ctx.closePath();
  paint(ctx, col, { lw: 0.028 });
  ctx.beginPath();
  ctx.arc(0.1, -0.24 - bob, 0.065, 0, Math.PI * 2);
  paint(ctx, o.ears || mix(C.pink, RATS, 0.4), { lw: 0.025 });
  if (Q.detail) {
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(0.22, -0.17 - bob, 0.022, 0, Math.PI * 2);
    ctx.arc(0.36, -0.1 - bob, 0.025, 0, Math.PI * 2);
    ctx.fill();
  }
  if (o.hat) {
    ctx.beginPath();
    ctx.moveTo(0.02, -0.27 - bob);
    ctx.lineTo(0.12, -0.55 - bob);
    ctx.lineTo(0.22, -0.25 - bob);
    ctx.closePath();
    paint(ctx, C.pink, { dots: C.mustard, density: 0.4, lw: 0.025 });
  }
  ctx.restore();
}

// Along a path of floor points at a constant pace: k from 0 to 1.
function along(pts, k) {
  const lens = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); lens.push(l); total += l; }
  let d = clamp(k) * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const q = lens[i] ? clamp(d / lens[i]) : 0;
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      return { x: ax + (bx - ax) * q, y: ay + (by - ay) * q, dir: bx - by - (ax - ay) >= 0 ? 'r' : 'l' };
    }
    d -= lens[i];
  }
  const [x, y] = pts[pts.length - 1];
  return { x, y, dir: 'r' };
}
const pathLength = (pts) => pts.slice(1).reduce((n, p, i) => n + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);

// ---------- Jenkins's evening, read off the shared clock ----------
// Where he stands in here the longest, and from when to when. Everything of
// his (the case, the empties, the trunk) keys off this, so it follows him if
// his walk ever changes.
function jenkinsHere(R) {
  const w = R.walkers.find((k) => k.id === 'jenkins');
  const [ox, oy, oz] = R.origin;
  let best = null, run = null;
  if (w) {
    for (let t = 0; t <= LOOP; t += 0.25) {
      const p = w.at(t);
      const here = R.contains(p.x, p.y, p.z || 0) && !p.moving;
      if (here) {
        if (!run) run = { t0: t, x: p.x - ox, y: p.y - oy };
        run.t1 = t;
      } else if (run) {
        if (!best || run.t1 - run.t0 > best.t1 - best.t0) best = run;
        run = null;
      }
    }
    if (run && (!best || run.t1 - run.t0 > best.t1 - best.t0)) best = run;
  }
  const b = best || { t0: 53, t1: 95.75, x: 7.5, y: 8.5 };
  const A = b.t0, D = b.t1 + 0.25;
  // Six bottles: he opens the next as he finishes the last. The sixth is in
  // his hand when the scream comes.
  const S = (D - A - 4) / 5.2;
  const starts = Array.from({ length: 6 }, (_, k) => A + 0.8 + k * S);
  const at = (t) => {
    if (!w) return null;
    const p = w.at(t);
    if (!R.contains(p.x, p.y, p.z || 0)) return null;
    return { ...p, x: p.x - ox, y: p.y - oy, z: (p.z || 0) - oz };
  };
  return { spot: [b.x, b.y], A, D, starts, at };
}

export default {
  id: 'cellar',
  name: 'Wine Cellar',
  blurb: 'Jenkins is packing, and drinking the 1974, since nobody is paying him anyway. That barrel is definitely just a barrel.',

  build(R) {
    const J = jenkinsHere(R);
    const [SX, SY] = J.spot;
    // How many bottles he has opened by t (0 to 6), in this loop.
    const opened = (t) => { const tt = loopT(t); return J.starts.filter((s) => tt >= s).length; };
    const standing = (t) => { const tt = loopT(t); return tt >= J.A && tt < J.D; };

    // ---------- The floor: big worn flagstones ----------
    R.floor((ctx) => {
      slab(ctx, FLAG);
      rect(ctx, 0, 0, 16, 16, 0, FLAG, { stroke: false, dots: shade(FLAG, 0.35), density: 0.12 });
      if (!Q.detail) return;
      const r = rng(17);
      const joints = [], tints = [];
      for (let row = 0; row < 8; row++) {
        const y0 = row * 2;
        if (row) joints.push([0, y0, 16, y0]);
        let x = 0, first = true;
        while (x < 16) {
          const x1 = Math.min(16, x + (first ? 0.7 + r() * 1.6 : 1.5 + r() * 1.9));
          first = false;
          if (r() < 0.35) tints.push([x, y0, x1 - x, r() < 0.5]);
          if (x1 < 16) joints.push([x1, y0, x1, y0 + 2]);
          x = x1;
        }
      }
      for (const [x, y, w, pale] of tints) rect(ctx, x + 0.05, y + 0.05, w - 0.1, 1.9, 0, pale ? alpha(INK.bone, 0.07) : alpha(C.ink, 0.1), { stroke: false });
      ctx.beginPath();
      for (const [x0, y0, x1, y1] of joints) { const a = P(x0, y0), b = P(x1, y1); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
      // A few cracks.
      for (const [x, y, n] of [[3.2, 5.1, 5], [9.4, 3.3, 4], [4.4, 13.2, 6], [15.1, 11.6, 4]]) {
        let cx = x, cy = y;
        const a = P(cx, cy);
        ctx.moveTo(a[0], a[1]);
        for (let i = 0; i < n; i++) {
          cx += 0.25 + hash(n, i) * 0.3;
          cy += (hash(i, n) - 0.5) * 0.5;
          const b = P(cx, cy);
          ctx.lineTo(b[0], b[1]);
        }
      }
      ctx.strokeStyle = shade(FLAG, 0.42);
      ctx.lineWidth = 0.045;
      ctx.stroke();
    });

    // ---------- Walls: stone, with brick arches over the racks ----------
    R.walls({
      left: STONE, right: STONE_R, cap: INK.bone, cut: INK.stormNavy,
      dotsL: shade(STONE, 0.3), dotsR: shade(STONE_R, 0.32), densL: 0.1, densR: 0.12,
      doors: DOORS.cellar || [],
    });
    R.wall((ctx) => {
      if (!Q.detail) return;
      for (const side of ['left', 'right']) {
        const r = rng(side === 'left' ? 5 : 9);
        const at = side === 'left' ? (u, z) => P(0, u, z) : (u, z) => P(u, 0, z);
        const segs = [];
        ctx.save();
        for (let row = 0; row < 10; row++) {
          const z0 = row * 0.6, z1 = Math.min(6, z0 + 0.6);
          if (row) segs.push([0, z0, 16, z0]);
          let u = row % 2 ? -0.45 : 0;
          while (u < 16) {
            const u1 = u + 0.85 + r() * 0.85;
            if (r() < 0.22) {
              const pale = r() < 0.5;
              const q = side === 'left'
                ? [[0, u + 0.04, z0 + 0.04], [0, Math.min(16, u1) - 0.04, z0 + 0.04], [0, Math.min(16, u1) - 0.04, z1 - 0.04], [0, u + 0.04, z1 - 0.04]]
                : [[u + 0.04, 0, z0 + 0.04], [Math.min(16, u1) - 0.04, 0, z0 + 0.04], [Math.min(16, u1) - 0.04, 0, z1 - 0.04], [u + 0.04, 0, z1 - 0.04]];
              if (u >= 0) face(ctx, q, pale ? alpha(INK.bone, 0.09) : alpha(C.ink, 0.08), { stroke: false });
            }
            if (u1 < 16) segs.push([u1, z0, u1, z1]);
            u = u1;
          }
        }
        ctx.beginPath();
        for (const [u0, z0, u1, z1] of segs) { const a = at(u0, z0), b = at(u1, z1); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
        ctx.strokeStyle = shade(side === 'left' ? STONE : STONE_R, 0.28);
        ctx.lineWidth = 0.03;
        ctx.stroke();
        ctx.restore();
      }
      // Damp: a green bloom under the light well, and saltpetre in streaks.
      ctx.save();
      inY(ctx, 0, 15, 2.2);
      ctx.beginPath();
      ctx.ellipse(0, 0.6, 1.1, 2.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = alpha(INK.verdigris, 0.2);
      ctx.fill();
      ctx.restore();
      const salt = [];
      for (let i = 0; i < 9; i++) {
        const u = 1 + hash(21, i) * 14, z = 1.4 + hash(22, i) * 3;
        salt.push(hash(23, i) < 0.5 ? [[0, u, z], [0, u + 0.05, z - 0.8 - hash(24, i)]] : [[u, 0, z], [u + 0.05, 0, z - 0.8 - hash(24, i)]]);
      }
      strands(ctx, salt, alpha(INK.bone, 0.3), 0.05);
    });

    // Arches: the vaults the racks sit in, and the one the barrel sits in.
    const arch = (ctx, side, u0, u1, zs, rise, recess = true) => {
      const uc = (u0 + u1) / 2, w = (u1 - u0) / 2, th = 0.34;
      ctx.save();
      if (side === 'left') inX(ctx, 0, uc, zs);
      else inY(ctx, 0, uc, zs);
      if (recess) {
        ctx.beginPath();
        ctx.ellipse(0, 0, w, rise, 0, Math.PI, 0);
        ctx.lineTo(w, zs);
        ctx.lineTo(-w, zs);
        ctx.closePath();
        paint(ctx, RECESS, { stroke: false, dots: shade(RECESS, 0.4), density: 0.14 });
      }
      ctx.beginPath();
      ctx.ellipse(0, 0, w + th, rise + th, 0, Math.PI, 0);
      ctx.ellipse(0, 0, w, rise, 0, 0, Math.PI, true);
      ctx.closePath();
      paint(ctx, BRICK, { dots: shade(BRICK, 0.45), density: 0.16, lw: 0.035 });
      if (Q.detail) {
        ctx.beginPath();
        const n = Math.round((w + rise) * 3.4);
        for (let i = 1; i < n; i++) {
          const a = Math.PI + (i / n) * Math.PI;
          ctx.moveTo(Math.cos(a) * w, Math.sin(a) * rise);
          ctx.lineTo(Math.cos(a) * (w + th), Math.sin(a) * (rise + th));
        }
        ctx.strokeStyle = shade(BRICK, 0.4);
        ctx.lineWidth = 0.03;
        ctx.stroke();
      }
      ctx.restore();
    };
    R.decor((ctx) => {
      arch(ctx, 'left', 0.7, 4.9, 3.75, 1.45);
      arch(ctx, 'left', 4.9, 9.3, 3.75, 1.45);
      arch(ctx, 'left', 10.2, 12.8, 2.0, 1.3);
      arch(ctx, 'left', 13.0, 15.9, 2.4, 1.25);
      arch(ctx, 'right', 2.6, 6.9, 3.75, 1.45);
      arch(ctx, 'right', 6.9, 11.3, 3.75, 1.45);
    });

    // ---------- On the walls ----------
    R.decor((ctx) => {
      // A water pipe along the top of the right wall, with brackets.
      ctx.beginPath();
      const p0 = P(0, 0.12, 5.62), p1 = P(16, 0.12, 5.62);
      ctx.moveTo(p0[0], p0[1]);
      ctx.lineTo(p1[0], p1[1]);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 0.2;
      ctx.stroke();
      ctx.strokeStyle = mix(IRON, INK.verdigris, 0.35);
      ctx.lineWidth = 0.13;
      ctx.stroke();
      for (let x = 1.5; x < 16; x += 3) face(ctx, [[x, 0, 5.45], [x, 0, 5.8], [x + 0.14, 0, 5.8], [x + 0.14, 0, 5.45]], IRON, { lw: 0.02 });
      // A valve wheel where it drops down the corner.
      ctx.save();
      inY(ctx, 0.05, 0.9, 5.2);
      ctx.beginPath();
      ctx.arc(0, 0, 0.22, 0, Math.PI * 2);
      ctx.moveTo(-0.22, 0); ctx.lineTo(0.22, 0); ctx.moveTo(0, -0.22); ctx.lineTo(0, 0.22);
      ctx.strokeStyle = INK.oxblood;
      ctx.lineWidth = 0.05;
      ctx.stroke();
      ctx.restore();

      // The mousehole.
      ctx.save();
      inY(ctx, 0, HOLE, 0);
      ctx.beginPath();
      ctx.moveTo(-0.24, 0);
      ctx.lineTo(-0.24, -0.2);
      ctx.arc(0, -0.2, 0.24, Math.PI, 0);
      ctx.lineTo(0.24, 0);
      ctx.closePath();
      paint(ctx, mix(C.black, INK.stormNavy, 0.3), { lw: 0.03 });
      ctx.restore();

      // Chalked up in the first vault: how long since anyone paid him.
      ctx.save();
      inX(ctx, 0, 2.8, 4.75);
      words(ctx, 'DAYS UNPAID', 0, -0.05, 0.2, CHALK);
      ctx.beginPath();
      for (let g = 0; g < 7; g++) {
        const a0 = -1.45 + g * 0.42, b0 = 0.18 + (g > 3 ? 0.3 : 0), a1 = a0 - (g > 3 ? 1.68 : 0);
        for (let i = 0; i < 4; i++) { ctx.moveTo(a1 + i * 0.07, b0); ctx.lineTo(a1 + i * 0.07, b0 + 0.22); }
        ctx.moveTo(a1 - 0.03, b0 + 0.2);
        ctx.lineTo(a1 + 0.26, b0 + 0.02);
      }
      ctx.strokeStyle = CHALK;
      ctx.lineWidth = 0.025;
      ctx.stroke();
      ctx.restore();

      // Cobwebs in the corners.
      cobweb(ctx, [0, 0, 6], [0, 1, 0], [0, 0, -1], 1.3, 4);
      cobweb(ctx, [0, 0, 6], [1, 0, 0], [0, 0, -1], 1.3, 4);
      cobweb(ctx, [0, 16, 6], [0, -1, 0], [0, 0, -1], 0.9);
      cobweb(ctx, [16, 0, 6], [-1, 0, 0], [0, 0, -1], 0.9);
    });

    // The light well, high on the right wall: a barred window at ground
    // level outside, with the rain going past and the lightning flashing in.
    R.decor((ctx) => {
      const { x, z, w, h } = WIN;
      face(ctx, [[x - 0.2, 0, z - 0.25], [x + w + 0.2, 0, z - 0.25], [x + w + 0.2, 0, z + h + 0.15], [x - 0.2, 0, z + h + 0.15]], shade(STONE_R, 0.25), { lw: 0.04 });
      box(ctx, x - 0.25, 0, z - 0.32, w + 0.5, 0.22, 0.1, tint(STONE_R, 0.1), { flat: true });
    });
    R.decor((ctx, t) => {
      const { x, z, w, h } = WIN;
      const glass = house.glass(t);
      face(ctx, [[x, 0, z], [x + w, 0, z], [x + w, 0, z + h], [x, 0, z + h]], glass, { lw: 0.03 });
      if (Q.detail) {
        // Grass at the bottom (the lawn is right outside), and rain going by.
        ctx.save();
        inY(ctx, 0, x, z);
        ctx.beginPath();
        ctx.rect(0, -h, w, h);
        ctx.clip();
        ctx.beginPath();
        for (let i = 0; i < 9; i++) {
          const a = 0.08 + i * 0.16;
          ctx.moveTo(a - 0.05, 0);
          ctx.lineTo(a + 0.02, -0.18 - (i % 3) * 0.05);
          ctx.lineTo(a + 0.06, 0);
        }
        ctx.fillStyle = NIGHT.leaf;
        ctx.fill();
        ctx.beginPath();
        for (let i = 0; i < 7; i++) {
          const k = ((t * 1.6 + hash(31, i)) % 1);
          const a = hash(32, i) * w, b = -h + k * (h + 0.3);
          ctx.moveTo(a + 0.12, b - 0.22);
          ctx.lineTo(a, b);
        }
        ctx.strokeStyle = NIGHT.rain;
        ctx.lineWidth = 0.03;
        ctx.stroke();
        ctx.restore();
      }
      // Bars.
      ctx.beginPath();
      for (let i = 1; i < 5; i++) { const a = P(x + (w * i) / 5, 0, z), b = P(x + (w * i) / 5, 0, z + h); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
      ctx.strokeStyle = IRON;
      ctx.lineWidth = 0.07;
      ctx.stroke();
    }, { anim: true });

    // The poster (a find): the same goose as on The Block's blimp, with tear-off
    // strips (two gone) and a tack in each corner.
    const POSTER = { u: 13, v: 3, w: 1.3, h: 1.62 };
    R.decor((ctx) => {
      ctx.save();
      inY(ctx, 0.02, POSTER.u, POSTER.v);
      ctx.rotate(-0.035);
      const { w, h } = POSTER;
      ctx.fillStyle = alpha(C.ink, 0.25);
      ctx.fillRect(-w / 2 + 0.06, -h / 2 + 0.06, w, h);
      ctx.beginPath();
      ctx.rect(-w / 2, -h / 2, w, h);
      paint(ctx, tint(INK.bone, 0.2), { dots: alpha(INK.candleGold, 0.5), density: 0.08, lw: 0.03 });
      words(ctx, 'HAVE YOU SEEN', 0, -h / 2 + 0.2, 0.17, C.coral, { font: DISPLAY, weight: 400 });
      ctx.save();
      ctx.translate(-0.02, 0.18);
      goose(ctx, 0, 0, 0, 0, { scale: 0.5, dir: 'r' });
      ctx.restore();
      words(ctx, 'THIS GOOSE?', 0, 0.36, 0.16, C.coral, { font: DISPLAY, weight: 400 });
      words(ctx, 'REWARD: 1 BREAD', 0, 0.54, 0.07, C.ink, { weight: 700 });
      for (const [a, b] of [[-w / 2 + 0.08, -h / 2 + 0.08], [w / 2 - 0.08, -h / 2 + 0.08], [-w / 2 + 0.08, h / 2 - 0.08], [w / 2 - 0.08, h / 2 - 0.08]]) {
        ctx.beginPath();
        ctx.arc(a, b, 0.045, 0, Math.PI * 2);
        paint(ctx, MAT.brass, { lw: 0.015 });
      }
      ctx.restore();
    });
    // Its tear-off strips, lifting in the draft.
    R.decor((ctx, t) => {
      if (!Q.detail) return;
      ctx.save();
      inY(ctx, 0.03, POSTER.u, POSTER.v);
      ctx.rotate(-0.035);
      const { w, h } = POSTER;
      for (let i = 0; i < 7; i++) {
        if (i === 2 || i === 5) continue; // torn off
        const a = -w / 2 + 0.06 + i * ((w - 0.12) / 7) + 0.01;
        const sw = (w - 0.12) / 7 - 0.02;
        ctx.save();
        ctx.translate(a + sw / 2, h / 2 - 0.3);
        ctx.transform(1, 0, Math.sin(t * 2.3 + i * 1.7) * 0.12, 1, 0, 0);
        ctx.beginPath();
        ctx.rect(-sw / 2, 0, sw, 0.3);
        paint(ctx, tint(INK.bone, 0.2), { lw: 0.012 });
        ctx.rotate(Math.PI / 2);
        words(ctx, 'HONK 555', 0.15, 0, 0.045, C.ink, { weight: 600 });
        ctx.restore();
      }
      ctx.restore();
    }, { anim: true });

    // Jenkins's peg between the vaults: his bowler hat and his umbrella,
    // ready by the secret passage (he's leaving).
    const PEG = [0.3, 4.9, 4.45];
    R.decor((ctx) => {
      const [X, Y] = P(...PEG);
      ctx.save();
      // the peg rail, and two pegs
      ctx.beginPath();
      ctx.moveTo(X - 0.55, Y + 0.28); ctx.lineTo(X + 0.55, Y - 0.27); ctx.lineTo(X + 0.55, Y - 0.07); ctx.lineTo(X - 0.55, Y + 0.48);
      ctx.closePath();
      paint(ctx, OAK_D, { lw: 0.03 });
      for (const dx of [-0.3, 0.3]) {
        ctx.beginPath();
        ctx.arc(X + dx, Y + 0.18 - dx * 0.5, 0.05, 0, Math.PI * 2);
        paint(ctx, MAT.brass, { lw: 0.02 });
      }
      // the umbrella, furled, hanging by its crook
      ctx.beginPath();
      ctx.arc(X + 0.38, Y + 0.08, 0.08, Math.PI, 0);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.035; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(X + 0.46, Y + 0.08); ctx.lineTo(X + 0.56, Y + 0.45); ctx.lineTo(X + 0.46, Y + 1.25); ctx.lineTo(X + 0.36, Y + 0.45);
      ctx.closePath();
      paint(ctx, C.ink, { lw: 0.02, stroke: INK.stormNavy });
      // the bowler hat
      ctx.beginPath();
      ctx.ellipse(X - 0.3, Y + 0.3, 0.24, 0.06, -0.1, 0, Math.PI * 2);
      paint(ctx, C.ink, { lw: 0.02, stroke: INK.stormNavy });
      ctx.beginPath();
      ctx.arc(X - 0.3, Y + 0.26, 0.15, Math.PI, 0);
      paint(ctx, C.ink, { lw: 0.02, stroke: INK.stormNavy });
      ctx.restore();
      cobweb(ctx, [0.3, 4.62, 5.6], [0, 1, -0.4], [0, 0.5, -1], 0.45, 2);
    });

    // The bat that lives on the pipe: flaps when the thunder wakes it.
    R.decor((ctx, t) => {
      const [X, Y] = P(8.8, 0.15, 5.52);
      const s = storm.strike(t);
      const tt = loopT(t);
      const flap = (s && s.age < 1.3) || (tt % 23) < 0.9;
      ctx.save();
      ctx.translate(X, Y);
      ctx.fillStyle = mix(INK.deepPlum, C.black, 0.4);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 0.02;
      if (flap) {
        const w = Math.sin(t * 22) * 0.12;
        ctx.beginPath();
        ctx.moveTo(0, 0.05);
        ctx.lineTo(-0.34, 0.1 + w); ctx.lineTo(-0.26, 0.22 + w); ctx.lineTo(-0.14, 0.18); ctx.lineTo(-0.06, 0.3);
        ctx.lineTo(0.06, 0.3); ctx.lineTo(0.14, 0.18); ctx.lineTo(0.26, 0.22 + w); ctx.lineTo(0.34, 0.1 + w);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(-0.07, 0.02);
        ctx.quadraticCurveTo(-0.11, 0.25, 0, 0.36);
        ctx.quadraticCurveTo(0.11, 0.25, 0.07, 0.02);
        ctx.closePath();
        ctx.fill();
      }
      // ears, at the bottom (it's upside down)
      ctx.beginPath();
      ctx.moveTo(-0.05, 0.33); ctx.lineTo(-0.07, 0.42); ctx.lineTo(-0.01, 0.35);
      ctx.moveTo(0.05, 0.33); ctx.lineTo(0.07, 0.42); ctx.lineTo(0.01, 0.35);
      ctx.fill();
      ctx.restore();
    }, { anim: true });

    // ---------- The wine racks, full and dusty (baked: they're heavy) ----------
    // Bottles lie neck out in a lattice. A few holes; chalked bays.
    const rackFace = (ctx, len, seed, bays) => {
      const r = rng(seed);
      const top = 0.18, rows = 7, ch = 0.44;
      const bw = len / bays.length;
      const cells = [];
      bays.forEach((_, bi) => {
        const a0 = bi * bw + 0.08, cw = (bw - 0.16) / 4;
        for (let c = 0; c < 4; c++) for (let j = 0; j < rows; j++) cells.push([a0 + c * cw, top + j * ch, cw, ch]);
      });
      ctx.beginPath();
      for (const [a, b, w, h] of cells) ctx.rect(a + 0.015, b + 0.015, w - 0.03, h - 0.03);
      ctx.fillStyle = OAK_DD;
      ctx.fill();
      if (!Q.detail) {
        ctx.fillStyle = alpha(MAT.wine, 0.8);
        ctx.fill();
        return;
      }
      const glass = GLASS.map(() => new Path2D()), foil = FOIL.map(() => new Path2D()), glint = new Path2D();
      for (const [a, b, w, h] of cells) {
        if (r() < 0.06) continue; // an empty hole
        const cx = a + w / 2, cy = b + h / 2, gi = Math.floor(r() * GLASS.length), fi = Math.floor(r() * FOIL.length);
        glass[gi].moveTo(cx + 0.165, cy);
        glass[gi].arc(cx, cy, 0.165, 0, Math.PI * 2);
        foil[fi].moveTo(cx + 0.075, cy);
        foil[fi].arc(cx, cy, 0.075, 0, Math.PI * 2);
        glint.moveTo(cx - 0.11, cy - 0.05);
        glint.arc(cx - 0.05, cy - 0.05, 0.06, Math.PI, Math.PI * 1.5);
      }
      GLASS.forEach((c, i) => { ctx.fillStyle = c; ctx.fill(glass[i]); });
      FOIL.forEach((c, i) => { ctx.fillStyle = c; ctx.fill(foil[i]); });
      ctx.strokeStyle = alpha(INK.bone, 0.5);
      ctx.lineWidth = 0.025;
      ctx.stroke(glint);
      // Dust over the lot, and bay labels chalked on the top rail.
      ctx.beginPath();
      ctx.rect(0, 0, len, 3.6);
      paint(ctx, null, { dots: alpha(INK.bone, 0.6), density: 0.05, stroke: false });
      bays.forEach((s, bi) => words(ctx, s, bi * bw + bw / 2, 0.09, 0.1, CHALK));
      // Posts between the bays.
      ctx.beginPath();
      for (let bi = 0; bi <= bays.length; bi++) ctx.rect(bi * bw - 0.06, 0, 0.12, 3.35);
      paint(ctx, OAK, { lw: 0.02 });
    };
    R.rug((ctx) => {
      // Along the left wall (front at x = 1.2), and along the right (front at y = 1.2).
      box(ctx, 0, 1, 0, 1.2, 8, 3.6, OAK_D, { top: shade(OAK, 0.15), flat: true });
      ctx.save();
      inX(ctx, 1.2, 9, 3.6);
      rackFace(ctx, 8, 3, ['CLARET', 'PORT', 'HOCK', 'HIS ONLY']);
      ctx.restore();
      box(ctx, 3, 0, 0, 8, 1.2, 3.6, OAK_D, { top: shade(OAK, 0.15), flat: true });
      ctx.save();
      inY(ctx, 1.2, 3, 3.6);
      rackFace(ctx, 8, 7, ['PLONK', 'COOKING', 'GUESTS', 'NOT GUESTS']);
      ctx.restore();
      // Plinths.
      box(ctx, 1.15, 1, 0, 0.1, 8, 0.25, OAK_D, { flat: true });
      box(ctx, 3, 1.15, 0, 8, 0.1, 0.25, OAK_D, { flat: true });
      if (!Q.detail) return;
      // Dust and odds and ends on top: a lantern, stubs, a bottle lying down.
      rect(ctx, 0.05, 1.05, 1.1, 7.9, 3.61, alpha(INK.bone, 0.12), { stroke: false });
      rect(ctx, 3.05, 0.05, 7.9, 1.1, 3.61, alpha(INK.bone, 0.12), { stroke: false });
      cylinder(ctx, 0.6, 2.2, 3.6, 0.08, 0.22, INK.bone, { flat: true });
      cylinder(ctx, 5.6, 0.6, 3.6, 0.07, 0.14, INK.bone, { flat: true });
      bottleDown(ctx, 0.62, 6.2, GLASS[1], 0, 1, { z: 3.6 });
      bottleDown(ctx, 8.6, 0.55, GLASS[0], 1, 0, { z: 3.6 });
      cobweb(ctx, [1.2, 9, 3.6], [0, 0, -1], [0, -1, 0], 0.7);
      cobweb(ctx, [11, 1.2, 3.6], [0, 0, -1], [-1, 0, 0], 0.7);
      cobweb(ctx, [1.2, 1, 0.3], [0, 0, 1], [1, 0.4, 0], 0.5, 2);
    });

    // ---------- The barrel that is definitely just a barrel ----------
    // Every 30 seconds: a grey rat runs over from the mousehole, the head of the
    // cask swings open a crack (cold air, the candle on top leans), the rat
    // goes in. A little later it opens again and a different rat comes out,
    // in a party hat, and runs back to the hole.
    const PER = 30, OFF = 7;
    const sOf = (t) => (((t + OFF) % PER) + PER) % PER;
    const swing = (s, t0, t1, max) => {
      if (s < t0 || s > t1) return 0;
      const k = s - t0, d = t1 - t0;
      if (k < 0.45) return max * ease(k / 0.45);
      if (k > d - 0.55) return max * (1 - ease((k - (d - 0.55)) / 0.55));
      return max * (1 + Math.sin(k * 9) * 0.04);
    };
    const doorAt = (t) => { const s = sOf(t); return swing(s, 6.3, 8.3, 0.46) + swing(s, 15.1, 17.4, 0.58); };
    // The draft: up while it's open, and dying away for a second after.
    const draft = (t) => {
      let d = 0;
      for (const back of [0, 0.4, 0.8, 1.2]) d = Math.max(d, (doorAt(t - back) / 0.58) * (1 - back / 1.6));
      return clamp(d);
    };
    const RAT_A = [[HOLE, 0.25], [HOLE - 0.2, 1.9], [8.4, 2.0], [4.3, 2.3], [3.5, 5.5], [3.4, 9.8], [3.05, 11.35]];
    const RAT_B = [[3.05, 11.7], [4.6, 12.9], [8.6, 12.7], [10.1, 10.9], [11.2, 6.6], [HOLE, 1.8], [HOLE, 0.25]];
    const LA = pathLength(RAT_A), LB = pathLength(RAT_B);
    R.thing(CASK.x0 + 1.2, CASK.y, (ctx, t) => {
      const { x0, x1, y, z, r } = CASK;
      cask(ctx, x0, x1, y, z, r, { door: doorAt(t), stencil: 'JUST A BARREL' });
      // brass candle dish on top
      disc(ctx, 1.9, y, z + r * 0.99, 0.16, MAT.brass, { lw: 0.02 });
      if (Q.detail) cobweb(ctx, [x0 + 0.2, y + r * 0.6, z + r * 0.9], [0, 0, -1], [0, 1, 0], 0.4, 2);
    }, { anim: true });
    // Rats: in (grey), and out (white, with a party hat from upstairs).
    R.mover((t) => {
      const s = sOf(t);
      if (s >= 1.6 && s < 7.0) { const p = along(RAT_A, (s - 1.6) / (LA / 3.5)); return { ...p, z: 0, moving: true, a: clamp((s - 1.6) / 0.3) }; }
      if (s >= 7.0 && s < 7.45) { const k = (s - 7.0) / 0.45; return { x: 3.05 - k * 0.45, y: 11.35 + k * 0.1, z: k * 0.4, dir: 'l', moving: true, a: 1 - k }; }
      return { x: -1e4, y: -1e4, hide: true };
    }, (ctx, t, p) => { if (!p.hide) rat(ctx, p.x, p.y, p.z, t, p); }, { bias: 0.3 });
    R.mover((t) => {
      const s = sOf(t);
      if (s >= 15.5 && s < 15.95) { const k = (s - 15.5) / 0.45; return { x: 2.6 + k * 0.45, y: 11.6 + k * 0.1, z: 0.4 * (1 - k), dir: 'r', moving: true, a: k }; }
      if (s >= 15.95 && s < 15.95 + LB / 3.2) { const k = (s - 15.95) / (LB / 3.2); const p = along(RAT_B, k); return { ...p, z: 0, moving: true, a: 1 - clamp((k - 0.96) / 0.04) }; }
      return { x: -1e4, y: -1e4, hide: true };
    }, (ctx, t, p) => { if (!p.hide) rat(ctx, p.x, p.y, p.z, t, { ...p, color: tint(INK.bone, 0.3), ears: C.pink, hat: true }); }, { bias: 0.3 });
    // The mouse who lives in the hole, peeking out between rats.
    R.thing(HOLE, 0.35, (ctx, t) => {
      const s = sOf(t);
      const out = Math.max(clamp((s - 9) / 0.5) * clamp((13 - s) / 0.5), clamp((s - 23.5) / 0.5) * clamp((28 - s) / 0.5));
      if (out <= 0.01) return;
      const [X, Y] = P(HOLE, 0.05, 0);
      const look = Math.sin(t * 3) > 0 ? 1 : -1;
      ctx.save();
      ctx.translate(X, Y + (1 - out) * 0.2);
      ctx.beginPath();
      ctx.rect(-0.3, -0.5, 0.6, 0.5 - (1 - out) * 0.2);
      ctx.clip();
      ctx.scale(look, 1);
      ctx.beginPath();
      ctx.ellipse(0, -0.12, 0.13, 0.11, 0, 0, Math.PI * 2);
      ctx.moveTo(0.08, -0.18); ctx.lineTo(0.24, -0.09); ctx.lineTo(0.08, -0.04);
      paint(ctx, C.grey, { lw: 0.025 });
      ctx.beginPath();
      ctx.arc(-0.05, -0.23, 0.06, 0, Math.PI * 2);
      paint(ctx, C.pink, { lw: 0.02 });
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.arc(0.06, -0.15, 0.02, 0, Math.PI * 2);
      ctx.arc(0.24, -0.09, 0.022, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }, { anim: true });

    // ---------- More casks, stacked in the front corner ----------
    R.thing(1.6, 14.2, (ctx) => {
      cask(ctx, 0.15, 1.55, 13.45, 0.58, 0.55, { chalk: 'PORT' });
      cask(ctx, 0.15, 1.55, 14.62, 0.58, 0.55, { chalk: '?', tap: true });
      cask(ctx, 0.15, 1.55, 14.04, 1.55, 0.55, { chocks: false, chalk: 'VINEGAR' });
    });

    // ---------- Jenkins's corner ----------
    // His trunk, filling up: something more squeezed in after each bottle,
    // until the lid won't shut and a strap gives up.
    const packed = (t) => {
      const tt = loopT(t);
      if (tt < J.A) return 0;
      return J.starts.slice(0, 5).filter((s) => tt >= s + 3).length;
    };
    R.thing(TRUNK.x + 1, TRUNK.y + 0.6, (ctx, t) => {
      const n = packed(t);
      const { x, y, w, d } = TRUNK;
      const bulge = n >= 5 ? 0.09 : 0;
      // things poking out of the back first (behind the lid)
      if (n >= 3) { // the Lord's stuffed pheasant, tail first
        const [X, Y] = P(x + 0.35, y + 0.15, 0.8);
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          ctx.moveTo(X - 0.03 + i * 0.07, Y);
          ctx.quadraticCurveTo(X - 0.2 + i * 0.12, Y - 0.5, X - 0.42 + i * 0.16, Y - 0.95 + i * 0.1);
        }
        ctx.lineCap = 'round';
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 0.1;
        ctx.stroke();
        ctx.strokeStyle = MAT.fur;
        ctx.lineWidth = 0.06;
        ctx.stroke();
        if (Q.detail) {
          ctx.setLineDash([0.06, 0.07]);
          ctx.strokeStyle = MAT.furDark;
          ctx.lineWidth = 0.05;
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      box(ctx, x, y, 0, w, d, 0.6, TRUNK_C, { dotsL: shade(TRUNK_C, 0.5) });
      // oak bands and brass corners
      for (const bz of [0.1, 0.42]) {
        face(ctx, [[x, y + d, bz], [x + w, y + d, bz], [x + w, y + d, bz + 0.09], [x, y + d, bz + 0.09]], OAK, { lw: 0.02 });
        face(ctx, [[x + w, y, bz], [x + w, y + d, bz], [x + w, y + d, bz + 0.09], [x + w, y, bz + 0.09]], shade(OAK, 0.1), { lw: 0.02 });
      }
      if (bulge) face(ctx, [[x, y + d, 0.6], [x + w, y + d, 0.6], [x + w, y + d, 0.6 + bulge], [x, y + d, 0.6 + bulge]], INK.bone, { lw: 0.02, dots: INK.oxblood, density: 0.3 });
      box(ctx, x - 0.02, y - 0.02, 0.6 + bulge, w + 0.04, d + 0.04, 0.2, TRUNK_C, { top: tint(TRUNK_C, 0.12), dotsL: shade(TRUNK_C, 0.5) });
      // brass corners on the front
      for (const [cx, sgn] of [[x, 1], [x + w, -1]]) {
        face(ctx, [[cx, y + d + 0.02, 0], [cx + sgn * 0.16, y + d + 0.02, 0], [cx, y + d + 0.02, 0.16]], MAT.brass, { lw: 0.015 });
        face(ctx, [[cx, y + d + 0.02, 0.6], [cx + sgn * 0.16, y + d + 0.02, 0.6], [cx, y + d + 0.02, 0.44]], MAT.brass, { lw: 0.015 });
      }
      // travel stickers
      const sticker = (u, v, c, s, round) => {
        ctx.save();
        inY(ctx, y + d + 0.001, u, v);
        ctx.beginPath();
        if (round) ctx.arc(0, 0, 0.13, 0, Math.PI * 2);
        else ctx.rect(-0.2, -0.09, 0.4, 0.18);
        paint(ctx, c, { lw: 0.015 });
        if (Q.detail) words(ctx, s, 0, 0, round ? 0.055 : 0.07, C.ink, { weight: 700 });
        ctx.restore();
      };
      sticker(x + 0.62, 0.3, INK.candleGold, 'BRIGHTON', true);
      sticker(x + 1.05, 0.28, INK.bone, 'ANYWHERE', false);
      sticker(x + 1.5, 0.3, mix(INK.oxblood, INK.bone, 0.2), 'AWAY', true);
      // straps (the right one bursts when it's too full)
      for (const sx of [x + 0.45, x + 1.55]) {
        const burst = sx > x + 1 && bulge;
        face(ctx, [[sx, y - 0.02, 0.8 + bulge + 0.005], [sx + 0.13, y - 0.02, 0.8 + bulge + 0.005], [sx + 0.13, y + d + 0.02, 0.8 + bulge + 0.005], [sx, y + d + 0.02, 0.8 + bulge + 0.005]], STRAP, { lw: 0.015 });
        if (burst) {
          const [X, Y] = P(sx + 0.06, y + d + 0.02, 0.8 + bulge);
          ctx.beginPath();
          ctx.moveTo(X, Y);
          ctx.quadraticCurveTo(X - 0.18, Y + 0.3, X - 0.05, Y + 0.55);
          ctx.strokeStyle = C.ink;
          ctx.lineWidth = 0.15;
          ctx.stroke();
          ctx.strokeStyle = STRAP;
          ctx.lineWidth = 0.11;
          ctx.stroke();
        } else {
          face(ctx, [[sx, y + d + 0.02, 0], [sx + 0.13, y + d + 0.02, 0], [sx + 0.13, y + d + 0.02, 0.8 + bulge], [sx, y + d + 0.02, 0.8 + bulge]], STRAP, { lw: 0.015 });
          face(ctx, [[sx - 0.02, y + d + 0.03, 0.42], [sx + 0.15, y + d + 0.03, 0.42], [sx + 0.15, y + d + 0.03, 0.54], [sx - 0.02, y + d + 0.03, 0.54]], MAT.brass, { lw: 0.015 });
        }
      }
      // things hanging out of the lid: a shirt sleeve, a sock, a candlestick, a tie
      const hang = (u, len, c, stripes) => {
        ctx.save();
        inY(ctx, y + d + 0.03, u, 0.62 + bulge);
        ctx.beginPath();
        ctx.moveTo(-0.07, 0);
        ctx.lineTo(0.07, 0);
        ctx.lineTo(0.09, len);
        ctx.lineTo(-0.06, len + 0.03);
        ctx.closePath();
        paint(ctx, c, { lw: 0.02 });
        if (stripes && Q.detail) {
          ctx.fillStyle = stripes;
          for (let b = 0.06; b < len; b += 0.1) ctx.fillRect(-0.07, b, 0.15, 0.04);
        }
        ctx.restore();
      };
      hang(x + 0.24, 0.42, INK.bone);
      if (n >= 1) hang(x + 1.83, 0.3, INK.oxblood, INK.bone);
      if (n >= 2) { // the silver candlestick, out of the end
        const [X, Y] = P(x + w + 0.02, y + 0.55, 0.66 + bulge);
        ctx.save();
        ctx.translate(X, Y);
        ctx.rotate(0.46);
        ctx.beginPath();
        ctx.rect(0, -0.04, 0.42, 0.08);
        ctx.rect(0.4, -0.1, 0.06, 0.2);
        paint(ctx, MAT.silver, { lw: 0.02 });
        ctx.restore();
      }
      if (n >= 4) { // a tie, out of the end
        ctx.save();
        inX(ctx, x + w + 0.02, y + 0.95, 0.62 + bulge);
        ctx.beginPath();
        ctx.moveTo(-0.05, 0); ctx.lineTo(0.05, 0); ctx.lineTo(0.08, 0.34); ctx.lineTo(0, 0.42); ctx.lineTo(-0.08, 0.34);
        ctx.closePath();
        paint(ctx, INK.oxblood, { lw: 0.02, dots: INK.candleGold, density: 0.2 });
        ctx.restore();
      }
      // His paperwork on the lid, sorted for the new job: the cellar book on
      // a clipboard (every 1974 ticked off) and a train timetable.
      const lz = 0.805 + bulge;
      sheet(ctx, 6.42, 6.5, lz, 0.4, 0.5, 0.12, OAK_D);
      sheet(ctx, 6.42, 6.52, lz + 0.004, 0.34, 0.42, 0.12, PAPER, (g) => {
        words(g, 'CELLAR BOOK', 0, -0.15, 0.04, PEN, { weight: 700 });
        scrawl(g, -0.14, 0.06, -0.09, 0.045, 6, PEN, 3);
        g.beginPath(); // the ticks
        for (let i = 0; i < 6; i++) { const b = -0.09 + i * 0.045; g.moveTo(0.09, b - 0.005); g.lineTo(0.105, b + 0.012); g.lineTo(0.14, b - 0.02); }
        g.strokeStyle = INK.oxblood;
        g.lineWidth = 0.013;
        g.stroke();
      });
      sheet(ctx, 6.42, 6.32, lz + 0.008, 0.16, 0.05, 0.12, MAT.brass); // the clip
      sheet(ctx, 6.78, 6.98, lz + 0.004, 0.17, 0.38, -0.42, PAPER_OLD, (g) => {
        g.fillStyle = INK.oxblood;
        g.fillRect(-0.085, -0.19, 0.17, 0.06);
        words(g, 'TRAINS', 0, -0.16, 0.035, PAPER_OLD, { weight: 700 });
        g.beginPath(); // the grid of times
        for (let a = -0.05; a < 0.08; a += 0.05) { g.moveTo(a, -0.11); g.lineTo(a, 0.17); }
        g.strokeStyle = alpha(INK.stormNavy, 0.3);
        g.lineWidth = 0.008;
        g.stroke();
        scrawl(g, -0.07, 0.07, -0.09, 0.03, 9, PEN, 7, 0.009);
      });
    }, { anim: true });

    // More of it, slid off the end of the trunk onto the floor: the wine
    // list, the Lord's reference for him, his resignation (dated, signed:
    // a find), the paper, his laundry list and two luggage labels.
    // Only one of them is a letter he signed.
    R.rug((ctx) => {
      const z = 0.006;
      sheet(ctx, 7.5, 5.12, z, 0.26, 0.38, 0.2, mix(PAPER_OLD, INK.candleGold, 0.25), (g) => {
        words(g, 'WINES', 0, -0.14, 0.06, INK.oxblood, { font: DISPLAY, weight: 400 });
        g.setLineDash([0.012, 0.02]);
        scrawl(g, -0.1, 0.1, -0.07, 0.04, 6, alpha(INK.oxblood, 0.7), 11);
        g.setLineDash([]);
      });
      // The Lord's reference: his crest at the top, "B.G." at the bottom, no date.
      sheet(ctx, 8.2, 5.28, z, 0.33, 0.44, -0.38, PAPER, (g) => {
        g.beginPath(); // the crest, a little shield
        g.moveTo(-0.04, -0.19); g.lineTo(0.04, -0.19); g.lineTo(0.04, -0.145); g.lineTo(0, -0.115); g.lineTo(-0.04, -0.145);
        g.closePath();
        paint(g, INK.oxblood, { lw: 0.008 });
        scrawl(g, -0.13, 0.13, -0.075, 0.038, 6, PEN, 5);
        words(g, 'B.G.', 0.08, 0.175, 0.065, INK.stormNavy, { weight: 'italic 600' });
      });
      // The resignation: dated at the top, "Sir," and signed Jenkins.
      sheet(ctx, 7.72, 5.86, z, 0.33, 0.44, 0.28, PAPER, (g) => {
        words(g, 'LAST WEEK', 0.1, -0.185, 0.04, INK.stormNavy, { weight: 700 }); // the date: his alibi
        words(g, 'Sir,', -0.11, -0.125, 0.045, INK.stormNavy, { weight: 'italic 600' });
        scrawl(g, -0.13, 0.13, -0.07, 0.038, 5, PEN, 2);
        words(g, 'Jenkins', 0.03, 0.165, 0.08, INK.stormNavy, { weight: 'italic 600' });
      });
      // The evening paper, folded, over a corner of it.
      sheet(ctx, 8.22, 5.92, z, 0.5, 0.36, -0.12, NEWS, (g) => {
        g.fillStyle = alpha(INK.stormNavy, 0.8);
        g.fillRect(-0.23, -0.16, 0.46, 0.055);
        words(g, 'GALE WARNING', 0, -0.132, 0.036, NEWS, { weight: 800 });
        g.fillStyle = alpha(INK.stormNavy, 0.3);
        g.fillRect(-0.22, -0.08, 0.14, 0.11); // a photo
        scrawl(g, -0.06, 0.22, -0.07, 0.028, 5, alpha(INK.stormNavy, 0.4), 13, 0.01);
        scrawl(g, -0.22, 0.22, 0.07, 0.028, 4, alpha(INK.stormNavy, 0.4), 17, 0.01);
      });
      // The laundry list, torn from a pad.
      sheet(ctx, 7.3, 6.5, z, 0.17, 0.27, 0.55, mix(PAPER, INK.verdigris, 0.12), (g) => {
        words(g, 'SOCKS x6', 0, -0.095, 0.032, PEN, { weight: 700 });
        scrawl(g, -0.06, 0.06, -0.04, 0.035, 4, PEN, 23);
      });
      // Luggage labels, strings and all.
      for (const [lx, ly, rot] of [[8.72, 5.5, 0.9], [7.18, 5.62, -0.6]]) {
        sheet(ctx, lx, ly, z, 0.12, 0.2, rot, PAPER_OLD, (g) => {
          g.beginPath();
          g.arc(0, -0.07, 0.015, 0, Math.PI * 2);
          g.moveTo(0, -0.07); g.quadraticCurveTo(0.09, -0.16, 0.03, -0.24);
          g.strokeStyle = INK.oxblood;
          g.lineWidth = 0.01;
          g.stroke();
          scrawl(g, -0.04, 0.04, 0, 0.03, 2, PEN, 29);
        });
      }
    });

    // The case of 1974 he's working through, lid off, "for my funeral".
    const CASE = { x: SX + 0.9, y: SY - 1.45, w: 0.9, d: 0.6, h: 0.42 };
    R.thing(CASE.x + CASE.w / 2, CASE.y + CASE.d / 2, (ctx, t) => {
      const { x, y, w, d, h } = CASE;
      const left = 6 - opened(t);
      // back and inside
      box(ctx, x, y, 0, w, d, h, PINE, { dotsL: shade(PINE, 0.45), top: shade(PINE, 0.4) });
      rect(ctx, x + 0.05, y + 0.05, w - 0.1, d - 0.1, h, mix(PINE, MAT.fur, 0.4), { stroke: false, dots: MAT.brass, density: 0.3 });
      // bottles, back row first
      for (let j = 0; j < 2; j++) {
        for (let i = 0; i < 3; i++) {
          const idx = j * 3 + i;
          if (idx >= left) continue;
          bottle(ctx, x + 0.2 + i * 0.25, y + 0.16 + j * 0.28, h - 0.25, GLASS[0], { cap: MAT.brass, s: 0.9 });
        }
      }
      // the front board again, so the bottles sit inside
      face(ctx, [[x, y + d, 0], [x + w, y + d, 0], [x + w, y + d, h], [x, y + d, h]], shade(PINE, 0.18), { dots: shade(PINE, 0.5), density: 0.2 });
      face(ctx, [[x + w, y, 0], [x + w, y + d, 0], [x + w, y + d, h], [x + w, y, h]], shade(PINE, 0.08));
      ctx.save();
      inY(ctx, y + d + 0.001, x + w / 2, h / 2);
      words(ctx, '1974', 0, 0, 0.2, INK.oxblood, { font: DISPLAY, weight: 400 });
      ctx.restore();
      ctx.save();
      inX(ctx, x + w + 0.001, y + d / 2, h / 2);
      words(ctx, 'GOOSEWORTH', 0, 0, 0.075, shade(PINE, 0.6), { weight: 700 });
      ctx.restore();
      // its lid, leaning on the end, chalked
      const lx = x + w + 0.02;
      face(ctx, [[lx + 0.3, y - 0.05, 0], [lx + 0.3, y + d + 0.05, 0], [lx + 0.02, y + d + 0.05, 0.7], [lx + 0.02, y - 0.05, 0.7]], tint(PINE, 0.05), { lw: 0.025 });
      if (Q.detail) {
        const [X, Y] = P(lx + 0.16, y + d / 2, 0.36);
        ctx.save();
        ctx.translate(X, Y);
        ctx.transform(1, -0.5, -0.16, 0.95, 0, 0);
        words(ctx, 'FOR MY', 0, -0.06, 0.065, CHALK, { weight: 700 });
        words(ctx, 'FUNERAL', 0, 0.03, 0.065, CHALK, { weight: 700 });
        words(ctx, 'B.G.', 0, 0.12, 0.06, CHALK, { weight: 700 });
        ctx.restore();
      }
    }, { anim: true });

    // His side table, an upturned crate: a candle, a glass, a corkscrew.
    const TAB = { x: SX - 2.1, y: SY + 0.45, w: 0.75, d: 0.7, h: 0.62 };
    R.thing(TAB.x + TAB.w / 2, TAB.y + TAB.d / 2, (ctx) => {
      const { x, y, w, d, h } = TAB;
      box(ctx, x, y, 0, w, d, h, PINE, { dotsL: shade(PINE, 0.45) });
      if (Q.detail) {
        face(ctx, [[x, y + d, h * 0.5], [x + w, y + d, h * 0.5]], null, { lw: 0.02, stroke: shade(PINE, 0.45) });
        face(ctx, [[x + w, y, h * 0.5], [x + w, y + d, h * 0.5]], null, { lw: 0.02, stroke: shade(PINE, 0.45) });
      }
      disc(ctx, x + 0.25, y + 0.3, h + 0.01, 0.13, MAT.brass, { lw: 0.02 });
      // the glass
      const [GX, GY] = P(x + 0.55, y + 0.5, h);
      ctx.beginPath();
      ctx.ellipse(GX, GY, 0.07, 0.03, 0, 0, Math.PI * 2);
      ctx.moveTo(GX, GY); ctx.lineTo(GX, GY - 0.15);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 0.02;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(GX - 0.09, GY - 0.33);
      ctx.quadraticCurveTo(GX - 0.1, GY - 0.14, GX, GY - 0.14);
      ctx.quadraticCurveTo(GX + 0.1, GY - 0.14, GX + 0.09, GY - 0.33);
      ctx.closePath();
      paint(ctx, alpha(INK.bone, 0.35), { lw: 0.02 });
      ctx.beginPath();
      ctx.moveTo(GX - 0.085, GY - 0.24);
      ctx.quadraticCurveTo(GX, GY - 0.13, GX + 0.085, GY - 0.24);
      ctx.closePath();
      ctx.fillStyle = MAT.wine;
      ctx.fill();
      // corkscrew and a cork
      if (Q.detail) {
        const [CX, CY] = P(x + 0.5, y + 0.15, h);
        ctx.beginPath();
        ctx.moveTo(CX - 0.14, CY - 0.02); ctx.lineTo(CX + 0.1, CY - 0.1);
        ctx.strokeStyle = MAT.silver;
        ctx.lineWidth = 0.035;
        ctx.stroke();
        ctx.beginPath();
        for (let i = 0; i < 4; i++) { ctx.moveTo(CX + 0.1 + i * 0.03, CY - 0.1 - i * 0.015); ctx.lineTo(CX + 0.13 + i * 0.03, CY - 0.06 - i * 0.015); }
        ctx.lineWidth = 0.02;
        ctx.stroke();
        disc(ctx, x + 0.2, y + 0.58, h, 0.05, MAT.oakLight, { lw: 0.015 });
      }
    });

    // The empties, piling up where he stands (the 1974 first). The third one
    // rolls off toward the drain; the one in his hand when the scream comes
    // is dropped where he stood, and spills.
    const EMPTY = [
      { dx: -0.45, dy: 1.05, up: true, label: INK.candleGold },
      { dx: 0.25, dy: 1.45, lie: [1, 0.35] },
      { dx: 0.75, dy: 0.95, lie: [0.35, 1], roll: [10.1, 11.4] },
      { dx: -0.95, dy: 1.5, up: true },
      { dx: -0.2, dy: 1.95, lie: [-0.2, 1] },
    ];
    EMPTY.forEach((e, k) => {
      const shown = (t) => { const tt = loopT(t); return tt >= J.starts[k + 1] ? tt - J.starts[k + 1] : -1; };
      const home = [SX + e.dx, SY + e.dy];
      R.mover((t) => {
        const age = shown(t);
        if (age < 0) return { x: -1e4, y: -1e4, hide: true };
        if (e.roll) {
          const q = ease(clamp((age - 0.5) / 4));
          return { x: home[0] + (e.roll[0] - home[0]) * q, y: home[1] + (e.roll[1] - home[1]) * q, spin: q * 6, age };
        }
        return { x: home[0], y: home[1], age };
      }, (ctx, t, p) => {
        if (p.hide) return;
        const drop = Math.max(0, 0.25 - p.age) * 1.6;
        if (e.up) {
          bottle(ctx, p.x, p.y, drop, GLASS[k === 0 ? 0 : 2], { label: e.label || INK.bone, cap: MAT.brass });
        } else {
          bottleDown(ctx, p.x, p.y, GLASS[0], e.lie[0], e.lie[1], { label: INK.bone, cap: MAT.brass, spin: p.spin });
        }
      }, { bias: 0.1 });
    });
    // The dropped one, and its spill.
    const DROP = [SX + 0.55, SY + 0.35];
    R.rug((ctx, t) => {
      const tt = loopT(t);
      if (tt < J.D) return;
      const k = ease(clamp((tt - J.D - 0.2) / 5));
      disc(ctx, DROP[0] + 0.25, DROP[1] + 0.3, 0.005, 0.15 + k * 0.45, alpha(MAT.wine, 0.85), { stroke: false });
    }, { anim: true });
    R.mover((t) => {
      const tt = loopT(t);
      if (tt < J.D) return { x: -1e4, y: -1e4, hide: true };
      return { x: DROP[0], y: DROP[1], age: tt - J.D };
    }, (ctx, t, p) => {
      if (p.hide) return;
      if (p.age < 0.3) bottle(ctx, p.x, p.y, (0.3 - p.age) * 2.4, GLASS[0], { tip: p.age * 5, cap: MAT.brass, label: INK.candleGold });
      else bottleDown(ctx, p.x, p.y, GLASS[0], 1, 0.6, { label: INK.candleGold, cap: MAT.brass });
    }, { bias: 0.1 });

    // The bottle in his hand while he stands there.
    R.mover((t) => {
      if (!standing(t) || loopT(t) < J.starts[0]) return { x: -1e4, y: -1e4, hide: true };
      const p = J.at(t);
      if (!p) return { x: -1e4, y: -1e4, hide: true };
      return { x: p.x, y: p.y, z: p.z, dir: p.dir };
    }, (ctx, t, p) => {
      if (p.hide) return;
      const [X, Y] = P(p.x, p.y, p.z);
      const f = p.dir === 'l' ? -1 : 1;
      ctx.save();
      ctx.translate(X + f * 0.34, Y - 0.78);
      ctx.rotate(Math.PI + Math.sin(t * 2.1) * 0.12);
      bottle(ctx, 0, 0, 0, GLASS[0], { label: INK.candleGold, cap: MAT.brass, s: 0.9 });
      ctx.restore();
    }, { bias: 0.05 });

    // ---------- The steps up to the kitchen hatch ----------
    // Open treads on one heavy spine, so you can see through them to Jenkins
    // behind; cut off at the ceiling like the walls are (above it is the
    // kitchen's floor, lifted away when you're down here), with the cut
    // printed in the same dark ink. A rail down the open side.
    {
      const { x, y, w, d, rise } = STEPS;
      const n = 10, run = d / n, CUT = 6, slope = d / rise;
      const nose = (yy) => (rise * (yy - y)) / d; // the line the treads' front edges sit on
      const sx0 = x + w / 2 - 0.17, sx1 = x + w / 2 + 0.17;
      const yT0 = y + 0.08 * slope, yT = y + (CUT + 0.08) * slope; // the spine's top edge, floor to cut
      const yB0 = y + 0.66 * slope, yB = y + (CUT + 0.66) * slope; // its underside
      R.thing(x + w / 2, y + 0.3, (ctx) => {
        face(ctx, [[sx0, yB0, 0], [sx1, yB0, 0], [sx1, yB, CUT], [sx0, yB, CUT]], shade(OAK, 0.5), { dots: OAK_DD, density: 0.2 });
        face(ctx, [[sx1, yT0, 0], [sx1, yT, CUT], [sx1, yB, CUT], [sx1, yB0, 0]], OAK_D, { dots: shade(OAK_D, 0.5), density: 0.15 });
        face(ctx, [[sx0, yT0, 0], [sx1, yT0, 0], [sx1, yT, CUT], [sx0, yT, CUT]], OAK, { lw: 0.03 });
        face(ctx, [[sx0, yT, CUT], [sx1, yT, CUT], [sx1, yB, CUT], [sx0, yB, CUT]], INK.stormNavy, { lw: 0.03 });
      });
      for (let i = 0; i < n; i++) {
        const ty = y + i * run, tz = (rise * (i + 1)) / n;
        if (tz > CUT) break;
        R.thing(x + w / 2, ty + 0.05, (ctx) => {
          box(ctx, x + 0.08, ty + 0.01, tz - 0.12, w - 0.16, run - 0.02, 0.12, OAK, { top: tint(OAK, 0.14), flat: true });
          if (Q.detail) face(ctx, [[x + 0.25, ty + run - 0.01, tz - 0.06], [x + w - 0.25, ty + run - 0.01, tz - 0.06]], null, { lw: 0.02, stroke: shade(OAK, 0.4) });
        });
      }
      // The rail, on posts from the treads' ends, in front of anyone on the steps.
      R.thing(x + w, y + 3, (ctx) => {
        const rx = x + w - 0.1;
        const posts = [[y + 0.12, 0, 1.4], [y + 1.25, nose(y + 1.5), 1.0], [y + 2.25, nose(y + 2.5), 1.0]];
        for (const [py, pz, ph] of posts) box(ctx, rx - 0.06, py - 0.06, pz, 0.12, 0.12, ph, OAK_D, { flat: true, lw: 0.03 });
        const [aX, aY] = P(rx, y + 0.12, 1.3), [bX, bY] = P(rx, y + 2.6, nose(y + 2.6) + 0.95);
        ctx.beginPath();
        ctx.moveTo(aX, aY);
        ctx.lineTo(bX, bY);
        ctx.lineCap = 'round';
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 0.16;
        ctx.stroke();
        ctx.strokeStyle = OAK;
        ctx.lineWidth = 0.1;
        ctx.stroke();
      });
    }

    // ---------- The front right: crates, the bucket, the drain ----------
    // Crates, stencilled: spare glass eyes (one looking out), emergency gin,
    // spare trifle bowls.
    const crate = (ctx, x, y, z, w, d, h, text, o = {}) => {
      box(ctx, x, y, z, w, d, h, PINE, { dotsL: shade(PINE, 0.5) });
      if (Q.detail) {
        ctx.beginPath();
        for (let k = 1; k < 3; k++) {
          const zz = z + (h * k) / 3;
          let a = P(x, y + d, zz), b = P(x + w, y + d, zz);
          ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
          a = P(x + w, y, zz); b = P(x + w, y + d, zz);
          ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
        }
        ctx.strokeStyle = shade(PINE, 0.5);
        ctx.lineWidth = 0.025;
        ctx.stroke();
      }
      ctx.save();
      if (o.end) inX(ctx, x + w + 0.001, y + d / 2, z + h / 2);
      else inY(ctx, y + d + 0.001, x + w / 2, z + h / 2);
      words(ctx, text, 0, 0, o.size || 0.15, shade(PINE, 0.7), { font: DISPLAY, weight: 400 });
      if (o.sub) words(ctx, o.sub, 0, 0.17, 0.07, shade(PINE, 0.6), { weight: 700 });
      ctx.restore();
    };
    R.thing(15, 5.9, (ctx) => {
      crate(ctx, 14.05, 4.1, 0, 1.8, 1.2, 0.95, 'GLASS EYES', { sub: 'SPARES (500)', size: 0.13 });
      crate(ctx, 14.1, 5.45, 0, 1.75, 1.15, 0.9, 'GIN', { sub: 'EMERGENCY', size: 0.22 });
      crate(ctx, 14.25, 4.55, 0.95, 1.45, 1.3, 0.72, 'TRIFLE', { sub: 'SPARE BOWLS', end: true, size: 0.16 });
    });
    // One of the glass eyes, looking out between the slats.
    R.thing(15, 5.31, (ctx, t) => {
      if (!Q.detail) return;
      const [X, Y] = P(14.55, 5.3, 0.62);
      ctx.beginPath();
      ctx.ellipse(X, Y, 0.1, 0.07, 0, 0, Math.PI * 2);
      paint(ctx, INK.bone, { lw: 0.02 });
      const look = Math.sin(t * 0.7) * 0.04 + (Math.sin(t * 2.9) > 0.97 ? 0.03 : 0);
      ctx.beginPath();
      ctx.arc(X + look, Y + 0.01, 0.04, 0, Math.PI * 2);
      ctx.fillStyle = INK.verdigris;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(X + look, Y + 0.01, 0.02, 0, Math.PI * 2);
      ctx.fillStyle = C.ink;
      ctx.fill();
    }, { anim: true });

    // The bucket under the light well, catching what drips off the sill.
    const DRIP = 1.7;
    R.thing(15.05, 1.2, (ctx, t) => {
      const cx = 15.05, cy = 1.2;
      cylinder(ctx, cx, cy, 0, 0.36, 0.55, MAT.silver, { top: shade(MAT.silver, 0.25) });
      disc(ctx, cx, cy, 0.46, 0.3, WATER, { stroke: false });
      const k = ((loopT(t) % DRIP) / DRIP);
      if (Q.detail && k < 0.55) {
        const q = k / 0.55;
        const [X, Y] = P(cx, cy, 0.46);
        ctx.beginPath();
        ctx.ellipse(X, Y, 0.06 + q * 0.34, (0.06 + q * 0.34) / 2, 0, 0, Math.PI * 2);
        ctx.strokeStyle = alpha(INK.bone, 0.7 * (1 - q));
        ctx.lineWidth = 0.025;
        ctx.stroke();
      }
      // the handle
      const [aX, aY] = P(cx - 0.34, cy + 0.02, 0.5), [bX, bY] = P(cx + 0.34, cy - 0.02, 0.5);
      ctx.beginPath();
      ctx.moveTo(aX, aY);
      ctx.quadraticCurveTo((aX + bX) / 2, aY - 0.5, bX, bY);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 0.035;
      ctx.stroke();
    }, { anim: true });
    // The drop itself, falling from the sill.
    R.mover(() => ({ x: 15.05, y: 1.19 }), (ctx, t) => {
      const k = ((loopT(t) + DRIP - 0.35) % DRIP) / 0.35;
      if (k > 1) return;
      const z = WIN.z - 0.3 - (WIN.z - 0.76) * k * k;
      const [X, Y] = P(15.05, 0.55 + k * 0.6, z);
      ctx.beginPath();
      ctx.ellipse(X, Y, 0.035, 0.06, 0, 0, Math.PI * 2);
      ctx.fillStyle = tint(WATER, 0.5);
      ctx.fill();
    }, { bias: -0.2 });

    // Puddles (the storm is getting in), and the drain in the middle of the biggest.
    const DRAIN = [10.4, 12.5];
    const blob = (ctx, x, y, parts, c) => {
      ctx.beginPath();
      for (const [dx, dy, r] of parts) {
        const [X, Y] = P(x + dx, y + dy, 0.004);
        ctx.moveTo(X + r * Math.SQRT2, Y);
        ctx.ellipse(X, Y, r * Math.SQRT2, (r * Math.SQRT2) / 2, 0, 0, Math.PI * 2);
      }
      ctx.fillStyle = c;
      ctx.fill();
    };
    R.rug((ctx) => {
      blob(ctx, DRAIN[0], DRAIN[1], [[0, 0, 1.1], [-0.9, 0.5, 0.7], [0.6, 0.7, 0.6], [-0.3, -0.8, 0.5]], WATER);
      blob(ctx, 15, 1.9, [[0, 0, 0.7], [-0.6, 0.5, 0.45], [0.2, 0.8, 0.4]], WATER);
      blob(ctx, 4.3, 14.3, [[0, 0, 0.45], [0.5, 0.2, 0.3]], WATER);
      blob(ctx, 13.1, 7.2, [[0, 0, 0.4], [0.35, -0.3, 0.3]], WATER);
      if (Q.detail) {
        // shine
        ctx.beginPath();
        for (const [x, y, l] of [[DRAIN[0] - 0.6, DRAIN[1] - 0.2, 0.6], [15.1, 1.7, 0.4], [4.2, 14.2, 0.25]]) {
          const a = P(x, y, 0.01), b = P(x + l, y - l * 0.3, 0.01);
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
        }
        ctx.strokeStyle = alpha(INK.bone, 0.45);
        ctx.lineWidth = 0.05;
        ctx.stroke();
      }
      // the drain
      const [X, Y] = P(DRAIN[0], DRAIN[1], 0.01);
      ctx.beginPath();
      ctx.ellipse(X, Y, 0.6, 0.3, 0, 0, Math.PI * 2);
      paint(ctx, IRON, { lw: 0.035 });
      ctx.save();
      ctx.clip();
      ctx.beginPath();
      for (let i = -3; i <= 3; i++) { ctx.moveTo(X + i * 0.15 - 0.2, Y - 0.3); ctx.lineTo(X + i * 0.15 + 0.2, Y + 0.3); }
      ctx.strokeStyle = shade(STONE, 0.2);
      ctx.lineWidth = 0.05;
      ctx.stroke();
      ctx.restore();
      // Straw and corks by the casks.
      if (Q.detail) {
        ctx.beginPath();
        for (let i = 0; i < 26; i++) {
          const x = 2.2 + hash(41, i) * 3.2, y = 12.2 + hash(42, i) * 3.2, a = hash(43, i) * Math.PI;
          const p0 = P(x, y, 0.01), p1 = P(x + Math.cos(a) * 0.3, y + Math.sin(a) * 0.3, 0.01);
          ctx.moveTo(p0[0], p0[1]);
          ctx.lineTo(p1[0], p1[1]);
        }
        ctx.strokeStyle = alpha(MAT.custard, 0.55);
        ctx.lineWidth = 0.03;
        ctx.stroke();
        for (const [x, y] of [[4.1, 10.3], [9.2, 9.8], [6.3, 12.2], [11.5, 13.8]]) disc(ctx, x, y, 0.02, 0.06, MAT.oakLight, { lw: 0.015 });
      }
    });
    // Ripples where the drips from the vault land, and the drain's swirl.
    const CEIL = [9.7, 13.1], CEIL_EVERY = 2.6;
    R.rug((ctx, t) => {
      if (!Q.detail) return;
      const k = ((loopT(t) % CEIL_EVERY) / CEIL_EVERY) * CEIL_EVERY - 0.6;
      if (k > 0 && k < 0.9) {
        const q = k / 0.9;
        for (const s of [1, 0.55]) {
          const [X, Y] = P(CEIL[0], CEIL[1], 0.01);
          ctx.beginPath();
          ctx.ellipse(X, Y, 0.1 + q * 0.5 * s, (0.1 + q * 0.5 * s) / 2, 0, 0, Math.PI * 2);
          ctx.strokeStyle = alpha(INK.bone, 0.6 * (1 - q));
          ctx.lineWidth = 0.025;
          ctx.stroke();
        }
      }
      const [X, Y] = P(DRAIN[0], DRAIN[1], 0.02);
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = t * 2.2 + (i * Math.PI * 2) / 3;
        ctx.moveTo(X + Math.cos(a) * 0.48, Y + Math.sin(a) * 0.24);
        ctx.ellipse(X, Y, 0.48, 0.24, 0, a, a + 0.7);
      }
      ctx.strokeStyle = alpha(INK.bone, 0.4);
      ctx.lineWidth = 0.025;
      ctx.stroke();
    }, { anim: true });
    R.air((ctx, t) => {
      const k = (loopT(t) % CEIL_EVERY) / 0.6;
      if (k > 1) return;
      const [X, Y] = P(CEIL[0], CEIL[1], 6.4 * (1 - k * k));
      ctx.beginPath();
      ctx.ellipse(X, Y, 0.035, 0.07, 0, 0, Math.PI * 2);
      ctx.fillStyle = tint(WATER, 0.55);
      ctx.fill();
    });

    // ---------- The spider, going up and down on her thread ----------
    R.mover(() => ({ x: 3.4, y: 3.7 }), (ctx, t) => {
      const q = 0.5 - 0.5 * Math.cos(clamp(((loopT(t) % 19) - 2) / 15) * Math.PI * 2);
      const z = 6.1 - q * 2.9;
      const [TX, TY] = P(3.4, 3.7, 6.4), [X, Y] = P(3.4, 3.7, z);
      ctx.beginPath();
      ctx.moveTo(TX, TY);
      ctx.lineTo(X, Y);
      ctx.strokeStyle = alpha(INK.bone, 0.6);
      ctx.lineWidth = 0.015;
      ctx.stroke();
      ctx.beginPath();
      const wig = Math.sin(t * 9) * 0.03;
      for (const f of [-1, 1]) for (let i = 0; i < 4; i++) {
        ctx.moveTo(X, Y + 0.08);
        ctx.quadraticCurveTo(X + f * 0.16, Y - 0.02 + i * 0.07, X + f * (0.2 + (i % 2) * 0.03), Y + 0.12 + i * 0.07 + wig * f);
      }
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 0.025;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(X, Y + 0.12, 0.07, 0.09, 0, 0, Math.PI * 2);
      ctx.ellipse(X, Y + 0.02, 0.045, 0.045, 0, 0, Math.PI * 2);
      ctx.fillStyle = C.ink;
      ctx.fill();
    }, { bias: 0 });

    // ---------- Lights ----------
    // The bare bulb, swinging on its flex (harder after each clap of thunder),
    // with moths. It dies with the rest of the house's lights.
    const swingAt = (t) => {
      const tt = loopT(t);
      let a = Math.sin(t * 1.3) * 0.05;
      const i = lastStrike(t);
      if (i >= 0) {
        const s = storm.strikes[i], age = tt - s.t;
        a += (s.big ? 0.3 : 0.16) * Math.exp(-age * 0.7) * Math.sin(age * 3.4);
      }
      return a;
    };
    const HOOK = [8, 8, 6.6], FLEX = 1.6;
    const bulbAt = (t) => {
      const a = swingAt(t), d = FLEX * Math.sin(a);
      return [HOOK[0] + d * 0.7, HOOK[1] - d * 0.7, HOOK[2] - FLEX * Math.cos(a)];
    };
    R.light({
      at: bulbAt, r: 4.6, color: INK.candleGold, k: (t) => house.lamp(t) * (0.95 + 0.05 * hash(3, Math.floor(t * 9))),
      draw: (ctx, t, k) => {
        const [bx, by, bz] = bulbAt(t);
        const [HX, HY] = P(...HOOK), [X, Y] = P(bx, by, bz);
        ctx.beginPath();
        ctx.moveTo(HX, HY);
        ctx.lineTo(X, Y - 0.18);
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 0.035;
        ctx.stroke();
        ctx.fillStyle = MAT.brassDark;
        ctx.fillRect(X - 0.07, Y - 0.2, 0.14, 0.12);
        ctx.beginPath();
        ctx.ellipse(X, Y, 0.12, 0.14, 0, 0, Math.PI * 2);
        ctx.fillStyle = k > 0.5 ? tint(INK.candleGold, 0.45) : shade(INK.bone, 0.45);
        ctx.fill();
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 0.025;
        ctx.stroke();
        if (!Q.detail) return;
        // moths, round and round while it's on; asleep on it when it's off
        for (let i = 0; i < 2; i++) {
          const a = t * (2.6 + i * 0.9) + i * 2.5;
          const r = 0.45 + 0.15 * Math.sin(t * 1.7 + i);
          const mx = k > 0.5 ? X + Math.cos(a) * r : X + (i ? 0.08 : -0.06);
          const my = k > 0.5 ? Y + Math.sin(a) * r * 0.5 - 0.1 : Y + (i ? -0.02 : 0.06);
          const fl = k > 0.5 ? Math.abs(Math.sin(t * 30 + i)) : 0.2;
          ctx.beginPath();
          ctx.ellipse(mx - 0.035, my, 0.045, 0.02 + fl * 0.02, -0.5, 0, Math.PI * 2);
          ctx.ellipse(mx + 0.035, my, 0.045, 0.02 + fl * 0.02, 0.5, 0, Math.PI * 2);
          ctx.fillStyle = INK.bone;
          ctx.fill();
        }
      },
    });

    // Candles: flames that lean in the draft, and stay lit in the dark.
    const candleLight = (x, y, z, seed, o = {}) => {
      const h = o.h ?? 0.3, lean = o.lean || (() => 0);
      R.light({
        at: [x, y, z + h + 0.15], r: o.r ?? 1.9, color: INK.candleGold, k: house.flicker(seed),
        draw: (ctx, t, k) => {
          const [X, Y] = P(x, y, z);
          ctx.fillStyle = INK.bone;
          ctx.fillRect(X - 0.05, Y - h, 0.1, h);
          if (Q.lines) {
            ctx.strokeStyle = C.ink;
            ctx.lineWidth = 0.018;
            ctx.strokeRect(X - 0.05, Y - h, 0.1, h);
          }
          const L = lean(t) + Math.sin(t * 7 + seed) * 0.05;
          const fh = 0.13 * (0.8 + k * 0.3) * (1 - lean(t) * 0.25);
          ctx.save();
          ctx.translate(X, Y - h - 0.02);
          ctx.rotate(L);
          ctx.beginPath();
          ctx.ellipse(0, -fh, 0.06, fh, 0, 0, Math.PI * 2);
          ctx.fillStyle = INK.candleGold;
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(0, -fh * 0.7, 0.025, fh * 0.45, 0, 0, Math.PI * 2);
          ctx.fillStyle = INK.bone;
          ctx.fill();
          ctx.restore();
        },
      });
    };
    candleLight(1.9, CASK.y, CASK.z + CASK.r * 0.99, 71, { lean: (t) => draft(t) * 1.05 });
    candleLight(TAB.x + 0.25, TAB.y + 0.3, TAB.h + 0.01, 72, { h: 0.2 });
    // A candle stuck in an old bottle, on the newel post.
    R.thing(STEPS.x + STEPS.w, STEPS.y + 0.2, (ctx) => bottle(ctx, STEPS.x + STEPS.w - 0.06, STEPS.y + 0.1, 1.5, GLASS[1], { s: 0.8 }), { bias: 0 });
    candleLight(STEPS.x + STEPS.w - 0.06, STEPS.y + 0.1, 1.9, 73, { h: 0.18, r: 1.6 });

    // ---------- In front of the right-hand rack (art direction pass) ----------
    // Demijohns of something homemade in wicker jackets, a tasting barrel with
    // two glasses (one his, one "for the auditor"), and a mousetrap that went
    // off hours ago and caught nothing: the cheese is gone.
    R.thing(11.2, 3.6, (ctx) => {
      for (const [x, y, s] of [[10.4, 2.8, 1.45], [11.5, 2.7, 1.3], [11.0, 3.75, 1.55]]) {
        const [X, Y] = P(x, y, 0);
        ctx.save();
        ctx.translate(X, Y);
        ctx.scale(s, s);
        ctx.beginPath(); // the glass belly
        ctx.ellipse(0, -0.38, 0.34, 0.38, 0, 0, Math.PI * 2);
        paint(ctx, alpha(GLASS[1], 0.85), { lw: 0.03 });
        ctx.beginPath(); // the neck
        ctx.rect(-0.06, -0.98, 0.12, 0.25);
        paint(ctx, GLASS[1], { lw: 0.025 });
        ctx.beginPath(); // the wicker jacket
        ctx.moveTo(-0.34, -0.36); ctx.quadraticCurveTo(0, -0.26, 0.34, -0.36);
        ctx.lineTo(0.3, -0.12); ctx.quadraticCurveTo(0, 0.02, -0.3, -0.12);
        ctx.closePath();
        paint(ctx, MAT.pine, { lw: 0.025, dots: MAT.oak, density: 0.35 });
        if (Q.detail) {
          ctx.beginPath(); // a glint, and a paper label
          ctx.moveTo(-0.2, -0.56); ctx.quadraticCurveTo(-0.24, -0.46, -0.2, -0.4);
          ctx.strokeStyle = alpha(INK.bone, 0.6); ctx.lineWidth = 0.03; ctx.stroke();
          ctx.fillStyle = INK.bone;
          ctx.fillRect(0.02, -0.6, 0.18, 0.12);
        }
        ctx.restore();
      }
    });
    R.thing(9.3, 5.6, (ctx) => {
      cylinder(ctx, 9.3, 5.6, 0, 0.42, 0.85, OAK, { top: tint(OAK, 0.15), dots: OAK_D });
      for (const z of [0.18, 0.66]) {
        const [X, Y] = P(9.3, 5.6, z);
        ctx.beginPath(); ctx.ellipse(X, Y, 0.42 * Math.SQRT2 * 0.5 + 0.3, 0.3 * 0.5 + 0.06, 0, 0, Math.PI);
        ctx.strokeStyle = IRON; ctx.lineWidth = 0.05; ctx.stroke();
      }
      for (const [dx, full] of [[-0.15, 0.6], [0.15, 0]]) {
        const [X, Y] = P(9.3 + dx, 5.6 - dx, 0.86);
        ctx.beginPath(); // a glass on a stem
        ctx.moveTo(X - 0.1, Y - 0.34); ctx.quadraticCurveTo(X - 0.1, Y - 0.16, X, Y - 0.15);
        ctx.quadraticCurveTo(X + 0.1, Y - 0.16, X + 0.1, Y - 0.34); ctx.closePath();
        paint(ctx, alpha(MAT.glass, 0.45), { lw: 0.02 });
        if (full) { ctx.fillStyle = MAT.wine; ctx.fillRect(X - 0.08, Y - 0.26, 0.16, 0.08); }
        ctx.fillStyle = alpha(MAT.glass, 0.8);
        ctx.fillRect(X - 0.015, Y - 0.15, 0.03, 0.15);
      }
    });
    R.thing(11.4, 6.6, (ctx) => {
      box(ctx, 11.1, 6.4, 0, 0.6, 0.3, 0.05, PINE, { flat: true, lw: 0.02 });
      const a = P(11.15, 6.55, 0.06), b = P(11.2, 6.55, 0.3);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(b[0] + 0.28, b[1] - 0.14);
      ctx.strokeStyle = MAT.silver; ctx.lineWidth = 0.03; ctx.stroke();
      if (Q.detail) {
        const [X, Y] = P(11.55, 6.55, 0.08); // crumbs, where the cheese was
        ctx.fillStyle = MAT.custard;
        for (const [dx, dy] of [[0, 0], [0.08, 0.03], [-0.06, 0.04]]) ctx.fillRect(X + dx - 0.02, Y + dy - 0.02, 0.04, 0.04);
      }
    });

    R.dark(house.dark);

    // ---------- In the air ----------
    // The draft, curling out of the barrel while it's open.
    R.air((ctx, t) => {
      const d = draft(t);
      if (d < 0.03 || !Q.detail) return;
      ctx.lineWidth = 0.035;
      ctx.lineCap = 'round';
      particles(t, 7, 1.7, (k, r) => {
        const z0 = 0.4 + r() * 1.2, y0 = CASK.y - 0.3 + r() * 0.9, ph = r() * 6;
        const x = CASK.x1 + 0.1 + k * 2.6, y = y0 + k * 1.1 + Math.sin(k * 5 + ph) * 0.2, z = z0 + k * 0.5;
        const [X, Y] = P(x, y, z);
        ctx.beginPath();
        ctx.arc(X, Y, 0.1 + k * 0.12, ph, ph + 2.2);
        ctx.strokeStyle = alpha(COLD, d * (1 - k) * 0.7);
        ctx.stroke();
      }, 5);
    });
    // Dust in the light of the bulb.
    R.air((ctx, t) => {
      const k0 = house.lamp(t);
      if (k0 < 0.5 || !Q.detail) return;
      ctx.fillStyle = alpha(INK.bone, 0.5);
      particles(t, 12, 9, (k, r) => {
        const x = 8 + (r() - 0.5) * 3.4 + Math.sin(k * 6 + r() * 5) * 0.2, y = 8 + (r() - 0.5) * 3.4, z = 1.2 + r() * 3.2 + k * 0.8;
        const [X, Y] = P(x, y, z);
        const a = Math.sin(k * Math.PI);
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(X, Y, 0.03, 0, Math.PI * 2);
        ctx.fill();
      }, 8);
      ctx.globalAlpha = 1;
    });
    // Lightning through the light well: a cold shaft onto the floor.
    R.air((ctx, t) => {
      const f = storm.flash(t);
      if (f < 0.04) return;
      const { x, z, w, h } = WIN;
      const out = (px, pz) => { const s = pz / 0.95; return P(px - 0.3 * s, s, 0); };
      const a = P(x, 0, z + h), b = P(x + w, 0, z + h), c = P(x + w, 0, z), d = P(x, 0, z);
      const e = out(x + w, z), g = out(x + w, z + h), hh = out(x, z + h);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]);
      ctx.lineTo(e[0], e[1]); ctx.lineTo(g[0], g[1]); ctx.lineTo(hh[0], hh[1]);
      ctx.lineTo(d[0], d[1]);
      ctx.closePath();
      ctx.fillStyle = alpha(NIGHT.flash, 0.28 * f);
      ctx.fill();
    });
    // Jenkins, hiccuping between bottles, and the scream upstairs.
    const HIC = [];
    for (let h = J.A + 4.5; h < J.D - 1.5; h += 4.6) if (h < 57.5 || h > 66.5) HIC.push(h);
    R.air((ctx, t) => {
      const tt = loopT(t);
      const p = J.at(t);
      if (!p) return;
      for (const h of HIC) {
        const k = (tt - h) / 1.6;
        if (k < 0 || k > 1) continue;
        shout(ctx, p.x + 0.35 + k * 0.4, p.y - 0.35 - k * 0.4, 2.6 + k * 1.1, 'hic!', 0.32 + k * 0.1, INK.bone, 1 - k * k);
      }
      if (tt >= J.D - 1.2 && tt < J.D + 0.4) {
        const k = (tt - (J.D - 1.2)) / 1.6;
        shout(ctx, p.x, p.y, 3.0 + Math.sin(k * 30) * 0.03, '!', 0.7, INK.candleGold, 1);
      }
    });

    // ---------- Finds ----------
    R.find({ id: 'resignation', label: "Jenkins's resignation letter", at: [7.72, 5.86, 0.02], r: 0.6 });
    R.find({ id: 'poster', label: 'A poster about a missing goose', at: [13, 0.05, 3], r: 0.8 });
  },
};
