// The Grounds: outside the front door, in the rain. The gravel drive and its
// turning circle, Inspector Pidge's car stuck in the mud, the gardener lost in
// his own maze (it comes up to his waist), the family crypt, and the house's
// front wall, which rises when you step out here: stone, the front door, and
// two tall windows lit from inside.
//
// Out here, on the evening's clock (seconds into the 180-second loop):
//     0  the gardener is lost in the maze: "Left? Or left?" (10 to 18)
//    28  he walks out (the way out was behind him) and goes into the house
//    63  Pidge comes out to his car. At 69 it backfires, spins its back wheel
//        and sprays him with mud ("Still stuck."), a hubcap rolls off down the
//        drive, and at 80 the horn honks at him. He goes back in at 84.
//    82  the lights go out (lamps, lanterns, windows), but not the car's
//        headlights, which he left on, or the candle at the crypt
//    85  the big strike: the crypt door creaks open; at midnight the bats leave
//   117  the gardener comes back and walks straight back into the maze
//   150  he sends up a distress flare
//   166  the hubcap comes back up the drive, having been all the way round
import {
  C, Q, box, rect, disc, cylinder, face, poly, paint, onRight, shade, mix, alpha, hash, P, speech,
} from '../../../engine/art.js';
import { clamp, particles } from '../../../engine/actors.js';
import { rain } from '../../../engine/weather.js';
import { ZK } from '../../../engine/iso.js';
import { INK, NIGHT, MAT, ROOM, house, storm, MIDNIGHT } from '../style.js';
import { DOORS, LOOP } from '../plan.js';

// ---------- The layout (the greybox's, kept) ----------
// The maze's hedges: [x0, y0, x1, y1] runs.
const HEDGES = [
  [0.5, 7.5, 5, 7.5], [6.6, 7.5, 7, 7.5], [0.5, 7.5, 0.5, 15.2], [0.5, 15.2, 7, 15.2], [7, 7.5, 7, 15.2],
  [2.2, 9, 2.2, 13.6], [2.2, 13.6, 5.4, 13.6], [5.4, 10, 5.4, 13.6],
];
const HEDGE_H = 1.0; // waist high on the gardener, which is the joke
const DOOR = DOORS.grounds[0]; // the front door, in the house's front wall (x 6.7 to 9.3, 4 tall)
const D0 = DOOR.at - DOOR.w / 2, D1 = DOOR.at + DOOR.w / 2;
const WIN = [[1.6, 4.0], [12.0, 14.4]]; // the two lit windows either side of it
const LAMPS = [[5.3, 2.8], [10.5, 10.1]];
// The parcel sits half a unit back from the greybox's (6.6, 1.3), against the
// door, so Pidge's "Still stuck." bubble (70 to 76s) doesn't cover it.
const PARCEL = [6.45, 0.85, 0.35];
const COMPASS = [1.1, 13.2]; // nudged a unit from the greybox's (1.3, 14.3), which the front hedge hid

// ---------- Inks ----------
const WALL = ROOM.grounds.wall; // the house front: pale stone
const STONE = MAT.stone, STONE_D = MAT.stoneDark;
const HEDGE = NIGHT.hedge, HEDGE_TOP = mix(NIGHT.hedge, MAT.leaf, 0.35), HEDGE_DOTS = shade(NIGHT.hedge, 0.45);
const TAN = mix(mix(MAT.oakLight, MAT.oak, 0.3), INK.stormNavy, 0.12); // Pidge's car: an old tan saloon
const GLASS = mix(INK.stormNavy, INK.verdigris, 0.3);
const MUD = NIGHT.mud, MUD_D = shade(NIGHT.mud, 0.3), MUD_HI = mix(NIGHT.mud, INK.bone, 0.3);
const WATER = mix(INK.stormNavy, INK.verdigris, 0.4);
const KRAFT = mix(MAT.oak, INK.bone, 0.4); // brown paper
const COPPER = mix(INK.verdigris, INK.bone, 0.12); // the crypt's roof, gone green
const OAK = mix(MAT.oak, INK.stormNavy, 0.2), OAK_D = shade(OAK, 0.3);
const GOLD = INK.candleGold;
const LIT = mix(INK.candleGold, INK.bone, 0.2); // a lit window
const SMOKE = mix(INK.bone, INK.stormNavy, 0.45);
const RAIN = NIGHT.rain;

// ---------- Small helpers ----------
const TAU = Math.PI * 2;
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => { const c = clamp(k); return c * c * (3 - 2 * c); };
const loopT = (t) => ((t % LOOP) + LOOP) % LOOP;

// Text painted flat on something. plane 'y': an upright face looking at the
// viewer's left (the plane y = at, text running along x); 'x': an upright face
// looking right (x = at, text running along -y); 'floor': lying flat at height
// at. (u, v) is the text's center: along the face and up it (on the floor, x, y).
function words(ctx, plane, at, u, v, text, size, color = C.ink, o = {}) {
  ctx.save();
  if (plane === 'y') ctx.transform(1, 0.5, 0, ZK, u - at, (u + at) / 2 - v * ZK);
  else if (plane === 'x') ctx.transform(1, -0.5, 0, ZK, at - u, (at + u) / 2 - v * ZK);
  else ctx.transform(1, 0.5, -1, 0.5, u - v, (u + v) / 2 - at * ZK);
  const k = 40;
  ctx.scale(1 / k, 1 / k);
  ctx.font = `${o.weight || 400} ${size * k}px ${o.font || '"Bagel Fat One", "Arial Black"'}, sans-serif`;
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
const SANS = { font: '"Rethink Sans", system-ui', weight: 800 };

// A path of (u, z) points on an upright face: the plane y = at (u along x).
function onY(ctx, at, pts) {
  ctx.beginPath();
  pts.forEach(([u, z], i) => { const X = u - at, Y = (u + at) / 2 - z * ZK; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
  ctx.closePath();
}

// A disc standing upright (a wheel, a hubcap, a lid), its face across the
// direction (dx, dy) on the ground: (1, 0) faces the viewer's left.
function upright(ctx, x, y, z, r, dx = 1, dy = 0, a0 = 0, a1 = TAU) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.transform(dx - dy, (dx + dy) / 2, 0, -ZK, X, Y);
  ctx.beginPath();
  ctx.arc(0, 0, r, a0, a1);
  ctx.restore();
}

// A pointed (Gothic) arch from (u0, zs) to (u1, zs), apex A above: its points.
function arch(u0, u1, zs, A, n = 7) {
  const w = u1 - u0;
  const r = Math.max(w / 2, (A * A + (w * w) / 4) / w);
  const phi = Math.acos(clamp((r - w / 2) / r, -1, 1));
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = Math.PI - phi * (i / n); pts.push([u0 + r + r * Math.cos(a), zs + r * Math.sin(a)]); }
  for (let i = 1; i <= n; i++) { const a = phi * (1 - i / n); pts.push([u1 - r + r * Math.cos(a), zs + r * Math.sin(a)]); }
  return pts;
}
// A lancet: straight sides from z0 up to zs, then the pointed arch.
const lancet = (u0, u1, z0, zs, A) => [[u0, z0], ...arch(u0, u1, zs, A), [u1, z0]];

// A soft shadow on the ground.
function shadow(ctx, x, y, rx, ry = rx / 2, a = 0.22) {
  const [X, Y] = P(x, y, 0);
  ctx.beginPath();
  ctx.ellipse(X, Y, rx, ry, 0, 0, TAU);
  ctx.fillStyle = alpha(C.ink, a);
  ctx.fill();
}

// Rain rings on a puddle: a few at a time, each spreading out and fading.
function rings(ctx, t, x, y, z, rx, ry, n, seed, color = alpha(INK.bone, 0.55)) {
  if (!Q.detail) return;
  ctx.lineWidth = 0.025;
  for (let i = 0; i < n; i++) {
    const life = 0.9 + hash(seed, i) * 0.5;
    const ph = t / life + hash(seed + 1, i);
    const c = Math.floor(ph), k = ph - c;
    const px = x + (hash(seed + 2, c * 7 + i) - 0.5) * rx * 1.4, py = y + (hash(seed + 3, c * 7 + i) - 0.5) * ry * 1.4;
    const [X, Y] = P(px, py, z);
    ctx.beginPath();
    ctx.ellipse(X, Y, 0.04 + k * 0.3, (0.04 + k * 0.3) / 2, 0, 0, TAU);
    ctx.strokeStyle = alpha(INK.bone, 0.6 * (1 - k));
    ctx.stroke();
  }
  ctx.strokeStyle = color;
}

// An irregular blob on the ground (puddles, mud): its points.
function blob(x, y, rx, ry, seed, n = 18, rough = 0.18, z = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const k = 1 + (hash(seed, i) - 0.5) * 2 * rough;
    pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k, z]);
  }
  return pts;
}

// The most recent lightning strike, if it was within `within` seconds: how
// long ago, and whether it was a big one.
function lastStrike(tt, within = 6) {
  let best = null;
  for (const s of storm.strikes) {
    const age = tt - s.t;
    if (age >= 0 && age < within && (!best || age < best.age)) best = { age, big: s.big };
  }
  return best;
}

// ---------- Pidge's car: when things happen (seconds into the loop) ----------
const BANG = 69, REV0 = 69.4, REV1 = 75.6, POP = 76, HONK = 80.5, BACK = 166, CLICK = 173.6;
// The car, in the mud: x 10.6 to 13.95, y 4.45 to 6.35, sunk a little and nose down.
const SINK = 0.2, TILT = 0.035;
const RW = 11.25, FW = 13.3, WR = 0.42; // rear and front wheels along x, their radius
const NEAR = 6.3, FAR = 4.5; // the near (viewer's) side and the far side, along y

const revving = (tt) => tt >= REV0 && tt < REV1;
// How far round the back wheel has turned: it spins hard while revving.
function wheelTurn(tt) {
  if (tt < REV0) return 0;
  const run = Math.min(tt, REV1) - REV0;
  const coast = tt > REV1 ? 1.6 * (1 - Math.exp(-(tt - REV1) * 2)) : 0;
  return run * 22 + coast * 22 * 0.5;
}
// The headlights: left on all evening, dimming a touch; they stutter when the
// engine catches, and flash with the horn.
function headlamps(tt) {
  let k = 0.85;
  if (tt >= BANG && tt < BANG + 0.5) k = hash(Math.floor(tt * 20), 3) > 0.5 ? 0.3 : 1;
  else if (revving(tt)) k = 0.75 + 0.25 * hash(Math.floor(tt * 12), 4);
  if (tt >= HONK && tt < HONK + 1.1) k = 1.25;
  if (HORN && HORN.k() > 0.3) k = 1.25; // and when you lean on the horn
  return k;
}
// The car's horn, a thing that answers a tap (set in build).
let HORN = null;
// The rear hubcap: on the wheel, then off down the drive, then back.
const OFF_PATH = [[11.2, 7.05], [10.6, 7.9], [9.7, 9.1], [9.1, 11.2], [8.8, 13.6], [8.7, 17.4]];
const ON_PATH = [[8.3, 17.4], [8.4, 13.4], [8.9, 10.6], [9.8, 8.6], [10.7, 7.4], [11.25, 7.0]];
function along(pts, d) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const len = Math.hypot(bx - ax, by - ay);
    if (d <= len || i === pts.length - 2) {
      const k = clamp(d / len);
      return { x: lerp(ax, bx, k), y: lerp(ay, by, k), dx: (bx - ax) / len, dy: (by - ay) / len, end: d >= len && i === pts.length - 2 };
    }
    d -= len;
  }
  return null;
}
const HUB_V = 1.9; // how fast it rolls, units a second
function hubcap(tt) {
  if (tt < POP || tt >= CLICK) return { on: true };
  const R0 = [RW, NEAR + 0.02, WR - SINK];
  if (tt < POP + 0.55) { // it springs off the wheel
    const k = (tt - POP) / 0.55;
    const [ex, ey] = OFF_PATH[0];
    return { x: lerp(R0[0], ex, k), y: lerp(R0[1], ey, k), z: lerp(R0[2], 0.19, k) + Math.sin(k * Math.PI) * 0.5, dx: 0.2, dy: 1, spin: k * 6 };
  }
  if (tt < BACK) {
    const d = (tt - POP - 0.55) * HUB_V;
    const p = along(OFF_PATH, d);
    if (!p || p.end) return { gone: true };
    const wob = Math.sin(d * 3) * 0.12;
    return { x: p.x, y: p.y, z: 0.19, dx: p.dx + wob * p.dy, dy: p.dy - wob * p.dx, spin: d * 5 };
  }
  const run = CLICK - 0.45 - BACK;
  if (tt < CLICK - 0.45) { // back up the drive, looking pleased with itself
    const total = pathLength(ON_PATH);
    const d = ((tt - BACK) / run) * total;
    const p = along(ON_PATH, d);
    return { x: p.x, y: p.y, z: 0.19, dx: p.dx, dy: p.dy, spin: -d * 5 };
  }
  const k = (tt - (CLICK - 0.45)) / 0.45; // and hops back on
  const [sx, sy] = ON_PATH[ON_PATH.length - 1];
  return { x: lerp(sx, R0[0], k), y: lerp(sy, R0[1], k), z: lerp(0.19, R0[2], k) + Math.sin(k * Math.PI) * 0.35, dx: 1, dy: 0, spin: 0 };
}
function pathLength(pts) {
  let n = 0;
  for (let i = 1; i < pts.length; i++) n += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return n;
}

// ---------- The maze ----------
// A hedge: a box of leaves with a lumpy top.
function hedge(ctx, x, y, w, d, h) {
  // Lumps along the top's two back edges first; the box then covers their
  // lower halves, leaving a leafy skyline.
  if (Q.detail) {
    ctx.beginPath();
    for (let u = 0.12; u < w; u += 0.3) { const [X, Y] = P(x + u, y, h); ctx.moveTo(X + 0.17, Y); ctx.arc(X, Y, 0.17, 0, TAU); }
    for (let v = 0.12; v < d; v += 0.3) { const [X, Y] = P(x, y + v, h); ctx.moveTo(X + 0.17, Y); ctx.arc(X, Y, 0.17, 0, TAU); }
    paint(ctx, HEDGE_TOP, { lw: 0.04 });
  }
  box(ctx, x, y, 0, w, d, h, HEDGE, { top: HEDGE_TOP, dotsL: HEDGE_DOTS, dotsR: HEDGE_DOTS, dotsT: shade(HEDGE_TOP, 0.3), densT: 0.18 });
  if (!Q.detail) return;
  // Leaves hanging over the front edges.
  ctx.beginPath();
  for (let u = 0.2; u < w - 0.05; u += 0.34) { const [X, Y] = P(x + u, y + d, h - 0.05); ctx.moveTo(X + 0.12, Y); ctx.arc(X, Y, 0.12, 0, Math.PI); }
  for (let v = 0.2; v < d - 0.05; v += 0.34) { const [X, Y] = P(x + w, y + v, h - 0.05); ctx.moveTo(X + 0.12, Y); ctx.arc(X, Y, 0.12, 0, Math.PI); }
  ctx.fillStyle = HEDGE_TOP;
  ctx.fill();
}

// The goose, in hedge, on the maze's corner: the gardener's masterpiece. It
// looks up at the house.
function topiary(ctx) {
  const [X, Y] = P(6.85, 7.45, HEDGE_H);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(1.3, 1.3);
  const leafy = { dots: shade(HEDGE_TOP, 0.35), density: 0.3, lw: 0.045 };
  // the stump of hedge it grows from
  ctx.beginPath();
  ctx.ellipse(0, -0.06, 0.34, 0.17, 0, 0, TAU);
  paint(ctx, HEDGE, leafy);
  // tail, body, wing
  ctx.beginPath();
  ctx.moveTo(-0.3, -0.55); ctx.lineTo(-0.64, -0.8); ctx.lineTo(-0.44, -0.4);
  paint(ctx, HEDGE_TOP, leafy);
  ctx.beginPath();
  ctx.ellipse(-0.02, -0.46, 0.47, 0.29, -0.1, 0, TAU);
  paint(ctx, HEDGE_TOP, leafy);
  ctx.beginPath();
  ctx.ellipse(-0.1, -0.5, 0.26, 0.13, -0.25, 0, TAU);
  paint(ctx, shade(HEDGE_TOP, 0.14), leafy);
  // neck and head
  ctx.beginPath();
  ctx.moveTo(0.3, -0.6);
  ctx.quadraticCurveTo(0.5, -0.95, 0.36, -1.3);
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.26;
  ctx.stroke();
  ctx.strokeStyle = HEDGE_TOP;
  ctx.lineWidth = 0.18;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0.38, -1.34, 0.15, 0, TAU);
  paint(ctx, HEDGE_TOP, leafy);
  ctx.beginPath();
  ctx.moveTo(0.5, -1.4); ctx.lineTo(0.76, -1.38); ctx.lineTo(0.51, -1.28);
  paint(ctx, HEDGE_TOP, { lw: 0.035 });
  ctx.restore();
}

// The sign at the way in, with a lifebuoy (in case of emergency).
function mazeSign(ctx) {
  const y = 6.15;
  for (const px of [3.95, 5.15]) box(ctx, px - 0.06, y - 0.06, 0, 0.12, 0.12, 1.85, OAK_D, { flat: true });
  onY(ctx, y + 0.07, [[3.75, 1.0], [5.35, 1.0], [5.35, 1.8], [3.75, 1.8]]);
  paint(ctx, OAK, { dots: OAK_D, density: 0.18 });
  onY(ctx, y + 0.07, [[3.83, 1.08], [5.27, 1.08], [5.27, 1.72], [3.83, 1.72]]);
  paint(ctx, MAT.paper, { lw: 0.03 });
  words(ctx, 'y', y + 0.08, 4.55, 1.52, 'THE LABYRINTH', 0.16, INK.oxblood);
  words(ctx, 'y', y + 0.08, 4.55, 1.27, 'ALLOW 3 HOURS', 0.13, C.ink, SANS);
  // The lifebuoy, hung on the left post.
  const bx = 3.95, bz = 0.62;
  for (let i = 0; i < 4; i++) {
    upright(ctx, bx, y + 0.1, bz, 0.3, 1, 0, (i / 4) * TAU, ((i + 1) / 4) * TAU);
    const [X, Y] = P(bx, y + 0.1, bz);
    ctx.lineTo(X, Y);
    ctx.closePath();
    paint(ctx, i % 2 ? INK.bone : INK.oxblood, { stroke: false });
  }
  upright(ctx, bx, y + 0.1, bz, 0.3);
  paint(ctx, null, { lw: 0.04 });
  upright(ctx, bx, y + 0.1, bz, 0.15);
  paint(ctx, OAK_D, { lw: 0.03 });
}

// Inside the maze: a fingerpost. Both arms point left.
function fingerpost(ctx) {
  const x = 4.1, y = 8.5;
  box(ctx, x - 0.05, y - 0.05, 0, 0.1, 0.1, 1.55, OAK_D, { flat: true });
  for (const [z, text] of [[1.35, 'LEFT'], [1.0, 'ALSO LEFT']]) {
    const len = text.length > 5 ? 1.2 : 0.8;
    onY(ctx, y + 0.06, [[x - len, z], [x - len + 0.22, z + 0.13], [x + 0.18, z + 0.13], [x + 0.18, z - 0.13], [x - len + 0.22, z - 0.13]]);
    paint(ctx, MAT.pine, { lw: 0.03 });
    words(ctx, 'y', y + 0.07, x - len / 2 + 0.08, z - 0.005, text, 0.13, C.ink, SANS);
  }
}

// The wheelbarrow, parked outside, full of clippings.
function wheelbarrow(ctx) {
  const x = 1.25, y = 4.95, w = 1.15, d = 0.8;
  shadow(ctx, x + 0.6, y + 0.45, 0.9, 0.35, 0.18);
  for (const ly of [y + 0.12, y + d - 0.12]) box(ctx, x + 0.12, ly - 0.03, 0, 0.06, 0.06, 0.4, C.ink, { flat: true, stroke: false });
  // handles
  for (const hy of [y + 0.15, y + d - 0.15]) face(ctx, [[x + 0.2, hy, 0.55], [x - 0.75, hy, 0.72]], null, { lw: 0.07, stroke: OAK_D });
  // the tray, wider at the top
  const tray = INK.oxblood;
  face(ctx, [[x + 0.1, y + d - 0.1, 0.35], [x + w - 0.1, y + d - 0.1, 0.35], [x + w + 0.12, y + d, 0.8], [x - 0.05, y + d, 0.8]], shade(tray, 0.25), { dots: shade(tray, 0.6), density: 0.2 });
  face(ctx, [[x + w - 0.1, y + 0.1, 0.35], [x + w - 0.1, y + d - 0.1, 0.35], [x + w + 0.12, y + d, 0.8], [x + w + 0.12, y, 0.8]], shade(tray, 0.1));
  // clippings heaped in it
  ctx.beginPath();
  for (const [cx, cy, r] of [[0.25, 0.3, 0.2], [0.55, 0.45, 0.22], [0.85, 0.3, 0.18], [0.45, 0.2, 0.16], [0.75, 0.6, 0.17]]) {
    const [X, Y] = P(x + cx, y + cy, 0.85);
    ctx.moveTo(X + r, Y);
    ctx.arc(X, Y, r, 0, TAU);
  }
  paint(ctx, HEDGE_TOP, { dots: shade(HEDGE_TOP, 0.4), density: 0.3, lw: 0.04 });
  // the wheel, at the front
  upright(ctx, x + w + 0.25, y + d / 2, 0.22, 0.22);
  paint(ctx, C.ink, { lw: 0.03 });
  upright(ctx, x + w + 0.25, y + d / 2, 0.22, 0.08);
  paint(ctx, MAT.silver, { lw: 0.02 });
}

// ---------- The house front ----------
// A window: stone tracery over glass (drawn by glass()), under a hood mould.
function windowStone(ctx, u0, u1) {
  const z0 = 2.0, zs = 3.45, A = 1.25;
  // the surround
  onY(ctx, 0, lancet(u0 - 0.18, u1 + 0.18, z0 - 0.1, zs, A + 0.16));
  paint(ctx, STONE, { dots: STONE_D, density: 0.2 });
  // the sill
  onRight(ctx, u0 - 0.35, z0 - 0.26, u1 - u0 + 0.7, 0.18, STONE_D);
  // hood mould over the arch, with little stops at its ends
  ctx.beginPath();
  arch(u0 - 0.3, u1 + 0.3, zs, A + 0.3).forEach(([u, z], i) => { const [X, Y] = P(u, 0, z); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
  ctx.lineWidth = 0.12;
  ctx.strokeStyle = STONE_D;
  ctx.lineCap = 'round';
  ctx.stroke();
  onRight(ctx, u0 - 0.38, zs - 0.28, 0.16, 0.26, STONE_D);
  onRight(ctx, u1 + 0.22, zs - 0.28, 0.16, 0.26, STONE_D);
}
function windowBars(ctx, u0, u1) {
  const z0 = 2.0, zs = 3.45, m = (u0 + u1) / 2;
  ctx.lineWidth = 0.08;
  ctx.strokeStyle = STONE;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  const line = (a, b) => { const [X0, Y0] = P(a[0], 0, a[1]), [X1, Y1] = P(b[0], 0, b[1]); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1); };
  line([m, z0], [m, zs + 0.45]); // the mullion
  line([u0, 2.85], [u1, 2.85]); // the transom
  ctx.stroke();
  // two small pointed lights under the big arch, and a round one over them
  ctx.lineWidth = 0.06;
  ctx.beginPath();
  for (const [a, b] of [[u0, m], [m, u1]]) arch(a, b, zs, 0.55).forEach(([u, z], i) => { const [X, Y] = P(u, 0, z); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
  const [cX, cY] = P(m, 0, zs + 0.9);
  ctx.moveTo(cX + 0.22, cY);
  ctx.ellipse(cX, cY, 0.22, 0.22, 0, 0, TAU);
  ctx.stroke();
  // the leading of the panes, in diamonds
  if (Q.detail) {
    ctx.lineWidth = 0.015;
    ctx.strokeStyle = alpha(C.ink, 0.35);
    ctx.beginPath();
    for (let u = u0 - 1.2; u < u1; u += 0.3) { line([u, z0], [u + 1.2, zs + 0.2]); line([u + 1.2, z0], [u, zs + 0.2]); }
    ctx.stroke();
  }
}

// The front door's stone surround, fanlight frame and the name over it.
function doorway(ctx) {
  const zs = 4.0;
  // jambs
  onRight(ctx, D0 - 0.38, 0, 0.38, zs, STONE, { dots: STONE_D, density: 0.2 });
  onRight(ctx, D1, 0, 0.38, zs, STONE, { dots: STONE_D, density: 0.2 });
  // a Tudor arch over the door, filled by the fanlight
  onY(ctx, 0, [[D0 - 0.38, zs], ...arch(D0 - 0.38, D1 + 0.38, zs, 1.05), [D1 + 0.38, zs]]);
  paint(ctx, STONE, { dots: STONE_D, density: 0.2 });
  // keystone
  onY(ctx, 0, [[DOOR.at - 0.17, zs + 0.78], [DOOR.at + 0.17, zs + 0.78], [DOOR.at + 0.22, zs + 1.15], [DOOR.at - 0.22, zs + 1.15]]);
  paint(ctx, STONE_D);
  // the house's name, carved
  onRight(ctx, D0 - 0.2, 5.28, D1 - D0 + 0.4, 0.4, STONE_D, { lw: 0.04 });
  words(ctx, 'y', 0, DOOR.at, 5.48, 'GOOSEWORTH', 0.26, INK.bone);
}
function fanlight(ctx, t) {
  const zs = 4.02;
  const k = house.lamp(t);
  onY(ctx, 0, [[D0 + 0.05, zs], ...arch(D0 + 0.05, D1 - 0.05, zs, 0.72), [D1 - 0.05, zs]]);
  paint(ctx, k > 0.5 ? LIT : house.glass(t), { lw: 0.04 });
  // sunburst glazing bars
  ctx.beginPath();
  const [cX, cY] = P(DOOR.at, 0, zs);
  for (let i = 1; i < 6; i++) {
    const a = (i / 6) * Math.PI;
    const [X, Y] = P(DOOR.at - Math.cos(a) * 1.2, 0, zs + Math.sin(a) * 0.68);
    ctx.moveTo(cX, cY);
    ctx.lineTo(X, Y);
  }
  ctx.lineWidth = 0.04;
  ctx.strokeStyle = STONE_D;
  ctx.stroke();
}

// The doors themselves: two oak leaves that swing into the hall whenever
// someone comes or goes (they're drawn through the doorway, so the wall
// hides them once they're open).
function doors(ctx, t, open) {
  const zb = 0.16, zt = DOOR.h, yh = -0.16;
  const th = open * 2.9; // radians: all the way back against the wall
  ctx.save();
  onY(ctx, 0, [[D0, zb], [D1, zb], [D1, zt], [D0, zt]]);
  ctx.clip();
  for (const side of [-1, 1]) {
    const hx = side < 0 ? D0 : D1;
    const fx = hx - side * (DOOR.w / 2) * Math.cos(th), fy = yh - (DOOR.w / 2) * Math.sin(th);
    const pt = (s, z) => [lerp(hx, fx, s), lerp(yh, fy, s), z];
    const lit = side < 0 ? OAK : shade(OAK, 0.08);
    face(ctx, [pt(0, zb), pt(1, zb), pt(1, zt), pt(0, zt)], lit, { dots: OAK_D, density: 0.15 });
    if (!Q.detail) continue;
    // two raised panels a leaf
    for (const [z0, z1] of [[0.45, 1.9], [2.2, 3.7]]) face(ctx, [pt(0.18, z0), pt(0.82, z0), pt(0.82, z1), pt(0.18, z1)], shade(lit, 0.12), { lw: 0.03 });
    if (side > 0) {
      // the knocker: a brass goose's head with a ring in its beak
      const [X, Y] = P(...pt(0.72, 2.55));
      ctx.beginPath();
      ctx.arc(X, Y - 0.08, 0.09, 0, TAU);
      paint(ctx, GOLD, { lw: 0.025 });
      ctx.beginPath();
      ctx.moveTo(X - 0.05, Y - 0.1); ctx.lineTo(X - 0.19, Y - 0.06); ctx.lineTo(X - 0.05, Y - 0.03);
      paint(ctx, MAT.brassDark, { lw: 0.02 });
      ctx.beginPath();
      ctx.ellipse(X - 0.1, Y + 0.1, 0.1, 0.12, 0, 0, TAU);
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 0.035;
      ctx.stroke();
    } else {
      // the letterbox
      const [a, b] = [P(...pt(0.3, 1.45)), P(...pt(0.7, 1.45))];
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      ctx.lineWidth = 0.1;
      ctx.strokeStyle = GOLD;
      ctx.stroke();
    }
  }
  ctx.restore();
}

// Stone courses across the wall, with the doorway and windows left clear.
function masonry(ctx) {
  if (!Q.detail) return;
  const clear = (u, z) => (u > D0 - 0.4 && u < D1 + 0.4 && z < 5.2) || WIN.some(([a, b]) => u > a - 0.4 && u < b + 0.4 && z > 1.7 && z < 4.9);
  ctx.beginPath();
  for (let z = 0.45, row = 0; z < 5.7; z += 0.5, row++) {
    for (let u = 0.5; u < 15.5; u += 0.25) {
      if (clear(u, z) || clear(u + 0.25, z)) continue;
      const [X0, Y0] = P(u, 0, z), [X1, Y1] = P(u + 0.25, 0, z);
      ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1);
    }
    for (let u = 0.5 + (row % 2) * 0.55; u < 15.5; u += 1.1) {
      if (clear(u, z + 0.25)) continue;
      const [X0, Y0] = P(u, 0, z), [X1, Y1] = P(u, 0, z + 0.5);
      ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1);
    }
  }
  ctx.lineWidth = 0.025;
  ctx.strokeStyle = shade(WALL, 0.22);
  ctx.stroke();
}

// Ivy up the wall from the left-hand flower bed.
function ivy(ctx, seed, u0, spread, top) {
  if (!Q.detail) return;
  const leaves = [];
  ctx.beginPath();
  for (let v = 0; v < 4; v++) {
    let u = u0 + (hash(seed, v) - 0.5) * 0.6, z = 0.3;
    const [X, Y] = P(u, 0, z);
    ctx.moveTo(X, Y);
    const lean = (hash(seed + 1, v) - 0.5) * spread;
    const reach = top * (0.55 + hash(seed + 2, v) * 0.45);
    while (z < reach) {
      z += 0.22;
      u += lean * 0.22 + Math.sin(z * 3 + v) * 0.05;
      const [X2, Y2] = P(u, 0, z);
      ctx.lineTo(X2, Y2);
      leaves.push([u + (hash(seed + v, z * 10) - 0.5) * 0.35, z + (hash(seed + 5, z * 10 + v) - 0.5) * 0.2, hash(seed + 3, z * 7 + v)]);
    }
  }
  ctx.lineWidth = 0.03;
  ctx.strokeStyle = shade(C.brown, 0.35);
  ctx.stroke();
  for (const [u, z, r] of leaves) {
    const [X, Y] = P(u, 0, z);
    ctx.beginPath();
    ctx.ellipse(X, Y, 0.13, 0.09, r * 3, 0, TAU);
    paint(ctx, r > 0.5 ? MAT.leafDark : NIGHT.leaf, { lw: 0.02 });
  }
}

// A drainpipe down the wall, with a hopper at the top and a shoe at the bottom.
function drainpipe(ctx, u) {
  onRight(ctx, u - 0.08, 0.25, 0.16, 5.3, shade(WALL, 0.45), { lw: 0.03 });
  onRight(ctx, u - 0.05, 0.25, 0.04, 5.3, alpha(INK.bone, 0.3), { stroke: false });
  onY(ctx, 0, [[u - 0.22, 5.75], [u + 0.22, 5.75], [u + 0.12, 5.4], [u - 0.12, 5.4]]);
  paint(ctx, shade(WALL, 0.5), { lw: 0.03 });
  for (let z = 1.2; z < 5.3; z += 1.3) onRight(ctx, u - 0.13, z, 0.26, 0.07, C.ink, { stroke: false });
  face(ctx, [[u - 0.08, 0, 0.3], [u + 0.08, 0, 0.3], [u + 0.08, 0.25, 0.12], [u - 0.08, 0.25, 0.12]], shade(WALL, 0.5), { lw: 0.03 });
}

// A lantern on a bracket beside the door (electric: it goes out with the rest).
// It's drawn with the wall, so it's cut down with it when the walls drop; only
// its glow is a light.
function wallLantern(R, u) {
  const z = 2.95;
  R.decor((ctx, t) => {
    face(ctx, [[u, 0, z + 0.62], [u, 0.34, z + 0.62]], null, { lw: 0.06 });
    face(ctx, [[u, 0, z + 0.3], [u, 0.3, z + 0.62]], null, { lw: 0.04 });
    const [X, Y] = P(u, 0.36, z);
    ctx.beginPath();
    ctx.moveTo(X - 0.14, Y); ctx.lineTo(X + 0.14, Y); ctx.lineTo(X + 0.19, Y - 0.42); ctx.lineTo(X - 0.19, Y - 0.42);
    ctx.closePath();
    paint(ctx, house.lamp(t) > 0.5 ? LIT : shade(GOLD, 0.55), { lw: 0.035 });
    ctx.beginPath();
    ctx.moveTo(X - 0.24, Y - 0.42); ctx.lineTo(X + 0.24, Y - 0.42); ctx.lineTo(X, Y - 0.62);
    ctx.closePath();
    paint(ctx, C.ink, { lw: 0.03 });
  }, { anim: true });
  R.light({ at: [u, 0.36, z + 0.25], r: 2.3, color: GOLD, k: house.lamp });
}

// ---------- The lawn ----------
// A lamp post: cast iron, with a glass lantern that goes out with the house.
function lampPost(R, x, y) {
  const h = 3.2;
  R.thing(x, y, (ctx) => {
    shadow(ctx, x, y, 0.35);
    cylinder(ctx, x, y, 0, 0.2, 0.22, C.ink, { flat: true, top: shade(C.ink, 0.1) });
    cylinder(ctx, x, y, 0.22, 0.11, 0.3, C.ink, { flat: true });
    box(ctx, x - 0.05, y - 0.05, 0.5, 0.1, 0.1, h - 0.5, C.ink, { flat: true, stroke: false });
    // the ladder rest, for the lamplighter
    face(ctx, [[x - 0.3, y + 0.3, h - 0.45], [x + 0.3, y - 0.3, h - 0.45]], null, { lw: 0.06 });
  });
  R.light({
    at: [x, y, h + 0.3], r: 3.4, color: GOLD, k: house.lamp,
    draw: (ctx, t, k) => {
      const [X, Y] = P(x, y, h);
      ctx.beginPath();
      ctx.moveTo(X - 0.17, Y); ctx.lineTo(X + 0.17, Y); ctx.lineTo(X + 0.27, Y - 0.62); ctx.lineTo(X - 0.27, Y - 0.62);
      ctx.closePath();
      paint(ctx, k > 0.5 ? LIT : shade(GOLD, 0.6), { lw: 0.04 });
      ctx.beginPath();
      ctx.moveTo(X, Y); ctx.lineTo(X, Y - 0.62);
      ctx.lineWidth = 0.03;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(X - 0.34, Y - 0.62); ctx.lineTo(X + 0.34, Y - 0.62); ctx.lineTo(X, Y - 0.92);
      ctx.closePath();
      paint(ctx, C.ink, { lw: 0.03 });
      ctx.beginPath();
      ctx.arc(X, Y - 0.97, 0.05, 0, TAU);
      paint(ctx, C.ink, { stroke: false });
    },
  });
  // Rain, lit up where it falls through the lamp's light.
  R.air((ctx, t) => {
    const k = house.lamp(t);
    if (!(k > 0.5) || !Q.detail) return;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const ph = t / 0.55 + hash(i, 71 + x);
      const c = Math.floor(ph), f = ph - c;
      const px = x + (hash(c, i * 3 + x) - 0.5) * 2.2, py = y + (hash(c, i * 5 + y) - 0.5) * 2.2;
      const z = h + 1.4 - f * 2.8;
      const [X, Y] = P(px, py, z);
      ctx.moveTo(X + 0.12, Y - 0.35);
      ctx.lineTo(X, Y);
    }
    ctx.lineWidth = 0.05;
    ctx.strokeStyle = alpha(LIT, 0.7);
    ctx.stroke();
  });
}

// A rose bush in the bed under the windows, drooping in the rain.
function roseBush(ctx, x, y, seed) {
  shadow(ctx, x, y, 0.45, 0.2, 0.2);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = hash(seed, i) * TAU, r = 0.12 + hash(seed + 1, i) * 0.2;
    const [X, Y] = P(x + Math.cos(a) * r, y + Math.sin(a) * r, 0.25 + hash(seed + 2, i) * 0.35);
    ctx.moveTo(X + 0.2, Y);
    ctx.arc(X, Y, 0.2, 0, TAU);
  }
  paint(ctx, MAT.leafDark, { dots: shade(MAT.leafDark, 0.45), density: 0.25, lw: 0.035 });
  for (let i = 0; i < 3; i++) {
    const [X, Y] = P(x + (hash(seed + 4, i) - 0.5) * 0.5, y + (hash(seed + 5, i) - 0.5) * 0.4, 0.35 + hash(seed + 6, i) * 0.3);
    ctx.beginPath();
    ctx.arc(X, Y, 0.09, 0, TAU);
    paint(ctx, INK.oxblood, { lw: 0.025 });
  }
}

// The garden bench, facing the drive.
function bench(ctx) {
  const x = 0.55, y0 = 2.5, y1 = 4.5;
  shadow(ctx, 0.9, 3.5, 1.2, 0.45, 0.15);
  for (const y of [y0 + 0.1, y1 - 0.2]) {
    box(ctx, x + 0.05, y, 0, 0.08, 0.1, 0.9, C.ink, { flat: true, stroke: false });
    box(ctx, x + 0.62, y, 0, 0.08, 0.1, 0.45, C.ink, { flat: true, stroke: false });
  }
  for (let i = 0; i < 4; i++) box(ctx, x + 0.1 + i * 0.16, y0, 0.45, 0.13, y1 - y0, 0.05, OAK, { flat: true, lw: 0.025 });
  for (let i = 0; i < 3; i++) box(ctx, x, y0, 0.62 + i * 0.16, 0.06, y1 - y0, 0.1, OAK, { flat: true, lw: 0.025 });
}

// The bird bath, overflowing.
function birdBath(ctx, t) {
  const x = 3.2, y = 3.5;
  shadow(ctx, x, y, 0.45);
  cylinder(ctx, x, y, 0, 0.26, 0.12, STONE_D, { flat: true });
  cylinder(ctx, x, y, 0.12, 0.1, 0.65, STONE, { flat: false });
  cylinder(ctx, x, y, 0.77, 0.5, 0.16, STONE, {});
  disc(ctx, x, y, 0.93, 0.4, WATER, { lw: 0.03 });
  rings(ctx, t, x, y, 0.93, 0.35, 0.35, 1, 17);
  if (!Q.detail) return;
  // spilling over the edge
  ctx.beginPath();
  for (let i = 0; i < 2; i++) {
    const a = 0.7 + i * 0.7;
    const [X, Y] = P(x + Math.cos(a) * 0.5, y + Math.sin(a) * 0.5, 0.8);
    const f = (t * 1.7 + i * 0.37) % 1;
    ctx.moveTo(X, Y + f * 0.7);
    ctx.lineTo(X, Y + f * 0.7 + 0.16);
  }
  ctx.lineWidth = 0.04;
  ctx.strokeStyle = alpha(INK.bone, 0.7);
  ctx.stroke();
}

// A frog hops between spots, sitting a while (croaking) at each.
function frogAt(spots, t, every, off) {
  const n = spots.length, T = n * every;
  const tt = (((t + off) % T) + T) % T;
  const i = Math.floor(tt / every), f = tt - i * every;
  const a = spots[i], b = spots[(i + 1) % n];
  const hop = clamp((f - (every - 0.4)) / 0.4);
  const dir = b[0] - b[1] - (a[0] - a[1]) >= 0 ? 1 : -1;
  return { x: lerp(a[0], b[0], hop), y: lerp(a[1], b[1], hop), z: Math.sin(hop * Math.PI) * 0.35, dir, croak: hop === 0 && Math.sin(f * 7) > 0.3 };
}
function frog(ctx, p) {
  const [X, Y] = P(p.x, p.y, p.z);
  const skin = mix(MAT.leaf, INK.candleGold, 0.2);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(p.dir, 1);
  if (p.croak) {
    ctx.beginPath();
    ctx.arc(0.12, -0.04, 0.07, 0, TAU);
    paint(ctx, mix(INK.bone, MAT.leaf, 0.3), { lw: 0.02 });
  }
  ctx.beginPath();
  ctx.ellipse(0, -0.1, 0.16, 0.1, -0.2, 0, TAU);
  paint(ctx, skin, { dots: shade(skin, 0.4), density: 0.3, lw: 0.03 });
  ctx.beginPath();
  ctx.arc(0.06, -0.2, 0.05, 0, TAU);
  ctx.arc(0.15, -0.18, 0.05, 0, TAU);
  paint(ctx, skin, { lw: 0.02 });
  ctx.fillStyle = C.ink;
  ctx.fillRect(0.05, -0.22, 0.025, 0.025);
  ctx.fillRect(0.14, -0.2, 0.025, 0.025);
  ctx.restore();
}

// ---------- The car ----------
// Its shape, side on (x along the car, z up, before it sank): the lower body
// back to front, and the cabin on top, which is a little narrower.
const BODY = [[10.62, 1.0], [10.74, 1.1], [12.78, 1.12], [13.88, 1.07], [13.96, 0.94]];
const CABIN = [[10.8, 1.1], [11.02, 1.5], [11.32, 1.72], [12.05, 1.79], [12.47, 1.74], [12.76, 1.13]];
const BODY_Y = [FAR + 0.12, NEAR - 0.12], CABIN_Y = [FAR + 0.25, NEAR - 0.25];
const FENDER = shade(TAN, 0.12);

function wheel(ctx, x, y, z, turn, hub) {
  upright(ctx, x, y - 0.16, z, WR);
  paint(ctx, C.black, { lw: 0.03 });
  upright(ctx, x, y, z, WR);
  paint(ctx, C.black, { lw: 0.04 });
  upright(ctx, x, y + 0.01, z, WR * 0.66);
  paint(ctx, INK.bone, { lw: 0.03 });
  // wire spokes (a blur when it spins)
  const [X, Y] = P(x, y + 0.01, z);
  ctx.save();
  ctx.transform(1, 0.5, 0, -ZK, X, Y);
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = turn + (i / 8) * TAU;
    ctx.moveTo(Math.cos(a) * 0.08, Math.sin(a) * 0.08);
    ctx.lineTo(Math.cos(a) * WR * 0.64, Math.sin(a) * WR * 0.64);
  }
  ctx.restore();
  ctx.lineWidth = 0.02;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  if (hub) {
    upright(ctx, x, y + 0.03, z, 0.14);
    paint(ctx, MAT.silver, { lw: 0.03 });
    upright(ctx, x, y + 0.04, z, 0.05);
    paint(ctx, shade(MAT.silver, 0.35), { stroke: false });
  }
}

// A mudguard over a wheel: a curved band, with its top surface showing.
function mudguard(ctx, cx, cz, back, front) {
  const r0 = WR + 0.06, r1 = WR + 0.22, y0 = NEAR - 0.3, y1 = NEAR + 0.08;
  const arc = [];
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI - (i / 12) * Math.PI;
    arc.push([cx + Math.cos(a) * r1, cz + Math.sin(a) * r1 * 0.9]);
  }
  // swept back and forward along the car, like a 1930s saloon's
  const pts = [[cx - back, cz - 0.12], ...arc, [cx + front, cz - 0.12]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, b] = [pts[i], pts[i + 1]];
    face(ctx, [[a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]]], FENDER, { stroke: false });
  }
  ctx.beginPath();
  pts.forEach(([x, z], i) => { const [X, Y] = P(x, y1, z); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
  for (let i = 12; i >= 0; i--) {
    const a = Math.PI - (i / 12) * Math.PI;
    const [X, Y] = P(cx + Math.cos(a) * r0, y1, cz + Math.sin(a) * r0 * 0.9);
    ctx.lineTo(X, Y);
  }
  ctx.closePath();
  paint(ctx, shade(FENDER, 0.22), { dots: shade(FENDER, 0.5), density: 0.2, lw: 0.035 });
}

function car(ctx, t) {
  const tt = loopT(t);
  const hc = hubcap(tt);
  const turn = wheelTurn(tt);
  // Shake while the engine races, and a jolt when it backfires.
  let sx = 0, sy = 0;
  if (revving(tt)) { sx = (hash(Math.floor(tt * 30), 1) - 0.5) * 0.06; sy = (hash(Math.floor(tt * 30), 2) - 0.5) * 0.05; }
  if (tt >= BANG && tt < BANG + 0.3) sy -= Math.sin(((tt - BANG) / 0.3) * Math.PI) * 0.18;
  const [pX, pY] = P(RW, NEAR, 0);
  ctx.save();
  ctx.translate(pX + sx, pY + sy);
  ctx.rotate(TILT);
  ctx.translate(-pX, -pY);
  const z0 = -SINK; // everything sits this much lower: it's in the mud
  const wz = WR + z0;
  const up = (pts) => pts.map(([x, z]) => [x, z + z0]);

  // Far wheels (mostly hidden), then the body from the back forward.
  wheel(ctx, RW, FAR + 0.16, wz, 0, false);
  wheel(ctx, FW, FAR + 0.16, wz, 0, false);
  // The lower body: its top surfaces, back to front, then its side.
  const body = up(BODY);
  for (let i = 0; i < body.length - 1; i++) {
    const [a, b] = [body[i], body[i + 1]];
    face(ctx, [[a[0], BODY_Y[0], a[1]], [b[0], BODY_Y[0], b[1]], [b[0], BODY_Y[1], b[1]], [a[0], BODY_Y[1], a[1]]], i === body.length - 2 ? shade(TAN, 0.08) : TAN, { lw: 0.03 });
  }
  const last = body[body.length - 1];
  face(ctx, [[last[0], BODY_Y[0], last[1]], [last[0], BODY_Y[1], last[1]], [last[0], BODY_Y[1], z0 + 0.5], [last[0], BODY_Y[0], z0 + 0.5]], shade(TAN, 0.1));
  poly(ctx, [[10.62, BODY_Y[1], z0 + 0.5], ...body.map(([x, z]) => [x, BODY_Y[1], z]), [last[0], BODY_Y[1], z0 + 0.5]]);
  paint(ctx, shade(TAN, 0.2), { dots: shade(TAN, 0.5), density: 0.16 });
  // The cabin: roof and windscreen, then its side and windows.
  const cab = up(CABIN);
  for (let i = 0; i < cab.length - 1; i++) {
    const [a, b] = [cab[i], cab[i + 1]];
    const glass = i === cab.length - 2;
    face(ctx, [[a[0], CABIN_Y[0], a[1]], [b[0], CABIN_Y[0], b[1]], [b[0], CABIN_Y[1], b[1]], [a[0], CABIN_Y[1], a[1]]], glass ? GLASS : i === 0 ? shade(TAN, 0.1) : TAN, { lw: 0.03 });
  }
  poly(ctx, cab.map(([x, z]) => [x, CABIN_Y[1], z]));
  paint(ctx, shade(TAN, 0.2), { dots: shade(TAN, 0.5), density: 0.16 });
  const wy = CABIN_Y[1] + 0.005;
  face(ctx, [[11.12, wy, z0 + 1.2], [11.62, wy, z0 + 1.2], [11.62, wy, z0 + 1.66], [11.38, wy, z0 + 1.64], [11.12, wy, z0 + 1.4]], GLASS, { lw: 0.03 });
  face(ctx, [[11.74, wy, z0 + 1.2], [12.5, wy, z0 + 1.2], [12.5, wy, z0 + 1.62], [11.74, wy, z0 + 1.68]], GLASS, { lw: 0.03 });
  if (Q.detail) {
    // a shine on the glass, and the phone books he sits on to see over the wheel
    face(ctx, [[11.85, wy, z0 + 1.28], [12.0, wy, z0 + 1.6]], null, { lw: 0.04, stroke: alpha(INK.bone, 0.35) });
    face(ctx, [[12.12, wy, z0 + 1.22], [12.4, wy, z0 + 1.22], [12.4, wy, z0 + 1.34], [12.12, wy, z0 + 1.34]], INK.oxblood, { lw: 0.02 });
    face(ctx, [[12.14, wy, z0 + 1.34], [12.38, wy, z0 + 1.34], [12.38, wy, z0 + 1.44], [12.14, wy, z0 + 1.44]], MAT.pine, { lw: 0.02 });
  }
  // the roof sign
  box(ctx, 11.4, 5.2, z0 + 1.76, 0.95, 0.4, 0.3, INK.bone, { flat: true, left: INK.bone, right: shade(INK.bone, 0.12), top: shade(INK.bone, 0.05) });
  words(ctx, 'y', 5.6, 11.875, z0 + 1.91, 'POLICE', 0.2, C.ink);
  // the radiator grille, and the pigeon on the radiator cap
  const gx = 13.97;
  face(ctx, [[gx, 5.0, z0 + 0.52], [gx, 5.9, z0 + 0.52], [gx, 5.9, z0 + 1.1], [gx, 5.0, z0 + 1.1]], MAT.silver, { lw: 0.04 });
  if (Q.detail) {
    ctx.beginPath();
    for (let v = 5.08; v < 5.86; v += 0.09) { const a = P(gx, v, z0 + 0.58), b = P(gx, v, z0 + 1.04); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
    ctx.lineWidth = 0.022;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
  }
  {
    const [X, Y] = P(13.9, 5.45, z0 + 1.1);
    ctx.beginPath();
    ctx.ellipse(X, Y - 0.12, 0.13, 0.08, -0.15, 0, TAU);
    ctx.arc(X + 0.13, Y - 0.2, 0.06, 0, TAU);
    ctx.moveTo(X - 0.1, Y - 0.12); ctx.lineTo(X - 0.24, Y - 0.08); ctx.lineTo(X - 0.1, Y - 0.06);
    paint(ctx, GOLD, { lw: 0.025 });
    ctx.beginPath();
    ctx.moveTo(X + 0.18, Y - 0.21); ctx.lineTo(X + 0.25, Y - 0.19); ctx.lineTo(X + 0.18, Y - 0.17);
    paint(ctx, MAT.brassDark, { stroke: false });
  }
  // bumper and number plate
  box(ctx, 14.0, 4.55, z0 + 0.38, 0.1, 1.8, 0.12, MAT.silver, { flat: true });
  face(ctx, [[14.11, 5.12, z0 + 0.2], [14.11, 5.78, z0 + 0.2], [14.11, 5.78, z0 + 0.36], [14.11, 5.12, z0 + 0.36]], INK.bone, { lw: 0.025 });
  words(ctx, 'x', 14.12, 5.45, z0 + 0.28, 'COO 1', 0.12, C.ink, SANS);
  // Near side: the back wheel (spinning when it's revving), the front one,
  // their mudguards and the running board between.
  wheel(ctx, RW, NEAR, wz, -turn, hc.on);
  wheel(ctx, FW, NEAR, wz, 0, true);
  face(ctx, [[RW + 0.55, NEAR - 0.3, z0 + 0.5], [FW - 0.55, NEAR - 0.3, z0 + 0.5], [FW - 0.55, NEAR + 0.12, z0 + 0.48], [RW + 0.55, NEAR + 0.12, z0 + 0.48]], shade(TAN, 0.55), { lw: 0.03 });
  mudguard(ctx, RW, wz, 0.72, 0.62);
  mudguard(ctx, FW, wz, 0.62, 0.72);
  // headlamps, on the front mudguards (their glow is a light; see build)
  for (const v of [FAR + 0.15, NEAR - 0.15]) {
    const [X, Y] = P(13.9, v, z0 + 1.02);
    ctx.beginPath();
    ctx.ellipse(X, Y, 0.17, 0.2, 0, 0, TAU);
    paint(ctx, MAT.silver, { lw: 0.035 });
  }
  // the door's seam and its handle
  face(ctx, [[11.68, BODY_Y[1] + 0.01, z0 + 0.55], [11.68, BODY_Y[1] + 0.01, z0 + 1.1]], null, { lw: 0.025 });
  face(ctx, [[12.52, BODY_Y[1] + 0.01, z0 + 0.55], [12.52, BODY_Y[1] + 0.01, z0 + 1.1]], null, { lw: 0.025 });
  face(ctx, [[12.3, BODY_Y[1] + 0.02, z0 + 0.98], [12.44, BODY_Y[1] + 0.02, z0 + 0.98]], null, { lw: 0.05, stroke: MAT.silver });
  // mud up its sides
  if (Q.detail) {
    ctx.fillStyle = MUD;
    for (let i = 0; i < 18; i++) {
      const [X, Y] = P(10.7 + hash(i, 41) * 3.2, BODY_Y[1] + 0.02, z0 + 0.52 + hash(i, 43) * hash(i, 47) * 0.55);
      ctx.beginPath();
      ctx.ellipse(X, Y, 0.035 + hash(i, 44) * 0.05, 0.03 + hash(i, 45) * 0.03, 0, 0, TAU);
      ctx.fill();
    }
  }
  // Wipers, going all evening, one with a parking ticket under it: he gave
  // himself a ticket for parking on the lawn. (They sweep the windscreen,
  // which leans back from the bonnet to the roof.)
  const ws = cab[cab.length - 2], wb = cab[cab.length - 1];
  const onScreen = (v, h) => [lerp(wb[0], ws[0], h) + 0.02, v, lerp(wb[1], ws[1], h)];
  const sw = Math.sin(t * 4.4) * 0.8;
  for (const [v, j] of [[5.0, 0], [5.62, 1]]) {
    const a = Math.PI / 2 + sw - 0.3;
    const tip = onScreen(v - Math.cos(a) * 0.5, clamp(Math.sin(a) * 0.75));
    face(ctx, [onScreen(v, 0.05), tip], null, { lw: 0.035 });
    if (j === 0 && Q.detail) {
      const m = onScreen(lerp(v, v - Math.cos(a) * 0.5, 0.55), clamp(Math.sin(a) * 0.4));
      const flap = Math.sin(t * 9) * 0.03;
      face(ctx, [[m[0], m[1] - 0.1, m[2] - 0.06], [m[0], m[1] + 0.1, m[2] - 0.06 + flap], [m[0] - 0.04, m[1] + 0.1, m[2] + 0.1 + flap], [m[0] - 0.04, m[1] - 0.1, m[2] + 0.1]], mix(INK.candleGold, INK.bone, 0.6), { lw: 0.02 });
    }
  }
  ctx.restore();

  // The mud it's sunk in, over the bottoms of the near wheels (not tilted).
  ctx.beginPath();
  for (const x of [RW, FW]) {
    const [X, Y] = P(x, NEAR + 0.15, 0);
    ctx.moveTo(X - 0.55, Y + 0.06);
    ctx.quadraticCurveTo(X - 0.3, Y - 0.28, X, Y - 0.2);
    ctx.quadraticCurveTo(X + 0.32, Y - 0.3, X + 0.58, Y + 0.02);
    ctx.quadraticCurveTo(X, Y + 0.22, X - 0.55, Y + 0.06);
  }
  paint(ctx, MUD, { dots: MUD_D, density: 0.3, lw: 0.04 });
}

// ---------- The crypt ----------
const CR = { x0: 12, x1: 15.5, y0: 11, y1: 15 };
const CRYPT_STONE = mix(NIGHT.stone, INK.deepPlum, 0.15);
const CD0 = 13.2, CD1 = 14.3, CFY = 14.9; // its door, on its front face
function crypt(ctx) {
  shadow(ctx, 13.9, 13.3, 3.2, 1.4, 0.2);
  // plinth and walls
  box(ctx, 11.9, 10.9, 0, 3.7, 4.2, 0.3, STONE_D, { dotsL: shade(STONE_D, 0.5) });
  box(ctx, 12.1, 11.1, 0.3, 3.3, 3.8, 2.0, CRYPT_STONE, { dotsL: shade(CRYPT_STONE, 0.55), dotsR: shade(CRYPT_STONE, 0.4) });
  // the gable end
  face(ctx, [[12.1, CFY, 2.3], [15.4, CFY, 2.3], [13.75, CFY, 3.38]], shade(CRYPT_STONE, 0.22), { dots: shade(CRYPT_STONE, 0.55), density: 0.22 });
  // the green copper roof
  face(ctx, [[11.92, 10.95, 2.25], [11.92, 15.08, 2.25], [13.75, 15.08, 3.45], [13.75, 10.95, 3.45]], shade(COPPER, 0.2), { dots: shade(COPPER, 0.5), density: 0.2 });
  face(ctx, [[15.58, 10.95, 2.25], [15.58, 15.08, 2.25], [13.75, 15.08, 3.45], [13.75, 10.95, 3.45]], COPPER, { dots: shade(COPPER, 0.35), density: 0.14 });
  if (Q.detail) {
    // moss, and streaks where the rain runs off
    for (let i = 0; i < 9; i++) {
      const y = 11.3 + hash(i, 101) * 3.5, k = hash(i, 102);
      const [X, Y] = P(lerp(15.4, 13.9, k), y, lerp(2.35, 3.3, k));
      ctx.beginPath();
      ctx.ellipse(X, Y, 0.18 + hash(i, 103) * 0.25, 0.08 + hash(i, 104) * 0.08, -0.46, 0, TAU);
      ctx.fillStyle = alpha(MAT.leafDark, 0.55);
      ctx.fill();
    }
    ctx.beginPath();
    for (let y = 11.4; y < 15; y += 0.45) { const a = P(15.55, y, 2.27), b = P(13.77, y, 3.43); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
    ctx.lineWidth = 0.025;
    ctx.strokeStyle = shade(COPPER, 0.3);
    ctx.stroke();
  }
  // the name, carved in the gable
  words(ctx, 'y', CFY + 0.01, 13.75, 2.62, 'GOOSEWORTH', 0.19, shade(CRYPT_STONE, 0.6));
  // corner buttresses with little pinnacles
  for (const bx of [11.95, 15.15]) {
    box(ctx, bx, 14.7, 0, 0.4, 0.4, 2.45, CRYPT_STONE, { dotsL: shade(CRYPT_STONE, 0.55) });
    face(ctx, [[bx, 15.1, 2.45], [bx + 0.4, 15.1, 2.45], [bx + 0.2, 14.9, 3.0]], shade(CRYPT_STONE, 0.2));
    face(ctx, [[bx + 0.4, 14.7, 2.45], [bx + 0.4, 15.1, 2.45], [bx + 0.2, 14.9, 3.0]], shade(CRYPT_STONE, 0.1));
  }
  // the doorway: a pointed arch, dark inside
  onY(ctx, CFY + 0.01, lancet(CD0 - 0.14, CD1 + 0.14, 0.3, 1.45, 0.62));
  paint(ctx, shade(CRYPT_STONE, 0.3));
  onY(ctx, CFY + 0.02, lancet(CD0, CD1, 0.3, 1.45, 0.5));
  paint(ctx, C.black);
  // a barred slit of a window down its side
  poly(ctx, lancet(12.5, 13.4, 0.95, 1.5, 0.4).map(([u, z]) => [15.42, u, z]));
  paint(ctx, shade(CRYPT_STONE, 0.3));
  poly(ctx, lancet(12.62, 13.28, 1.02, 1.5, 0.3).map(([u, z]) => [15.43, u, z]));
  paint(ctx, C.black);
  ctx.beginPath();
  for (const u of [12.8, 12.95, 13.1]) { const a = P(15.44, u, 1.02), b = P(15.44, u, 1.72); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
  ctx.lineWidth = 0.04;
  ctx.strokeStyle = shade(CRYPT_STONE, 0.1);
  ctx.stroke();
  // a stone cross on the gable
  const [kX, kY] = P(13.75, 15.08, 3.42);
  ctx.beginPath();
  ctx.rect(kX - 0.06, kY - 0.62, 0.12, 0.62);
  ctx.rect(kX - 0.22, kY - 0.48, 0.44, 0.11);
  paint(ctx, CRYPT_STONE, { lw: 0.035 });
  // ivy over the left of it
  if (Q.detail) {
    for (let i = 0; i < 26; i++) {
      const u = 12.1 + hash(i, 61) * 1.0 * (1 + hash(i, 62)), z = 0.35 + hash(i, 63) * 2.2 * (1 - (u - 12.1) / 2.4);
      const [X, Y] = P(u, CFY + 0.05, z);
      ctx.beginPath();
      ctx.ellipse(X, Y, 0.12, 0.08, hash(i, 64) * 3, 0, TAU);
      paint(ctx, hash(i, 65) > 0.5 ? MAT.leafDark : NIGHT.leaf, { lw: 0.02 });
    }
  }
}

// How far the crypt door has creaked open: a crack with every strike,
// wider with the big ones, and wide at midnight when the bats come out.
function creak(tt) {
  let k = 0;
  const s = lastStrike(tt, 7);
  if (s) {
    const open = s.age < 0.5 ? smooth(s.age / 0.5) : s.age < 2.5 ? 1 : 1 - smooth((s.age - 2.5) / 4);
    k = (s.big ? 0.55 : 0.3) * open;
  }
  const m = tt - MIDNIGHT;
  if (m > -0.5 && m < 6) k = Math.max(k, 0.9 * (m < 0 ? smooth((m + 0.5) / 0.5) : m < 3 ? 1 : 1 - smooth((m - 3) / 3)));
  return k;
}
function cryptDoor(ctx, t) {
  const tt = loopT(t);
  const th = creak(tt) * 1.1;
  const W = CD1 - CD0;
  // Every so often, something inside looks out of the side window, left, then
  // right, and goes away again.
  const ph = ((t % 23) + 23) % 23;
  if (ph > 3 && ph < 8.5 && !(ph > 5.6 && ph < 5.75)) {
    const look = Math.sin((ph - 3) * 1.4) * 0.09;
    ctx.fillStyle = GOLD;
    for (const d of [-0.08, 0.08]) {
      const [X, Y] = P(15.45, 12.95 + d + look, 1.3);
      ctx.beginPath();
      ctx.ellipse(X, Y, 0.035, 0.045, 0, 0, TAU);
      ctx.fill();
    }
  }
  // Eyes in the dark, when there's a crack to see them through.
  if (th > 0.08) {
    const blink = (t % 3.1) < 0.15;
    const [X, Y] = P(CD1 - 0.25, CFY - 0.3, 1.0);
    if (!blink) {
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.ellipse(X - 0.07, Y, 0.045, 0.03, 0, 0, TAU);
      ctx.ellipse(X + 0.07, Y, 0.045, 0.03, 0, 0, TAU);
      ctx.fill();
    }
  }
  // The door swings out on its left hinge.
  const pt = (u, z) => [CD0 + u * Math.cos(th), CFY + 0.03 + u * Math.sin(th), z];
  const shape = lancet(0, W, 0.3, 1.45, 0.5).map(([u, z]) => pt(u, z));
  poly(ctx, shape);
  paint(ctx, mix(OAK_D, INK.stormNavy, 0.3), { dots: shade(OAK_D, 0.5), density: 0.2, lw: 0.04 });
  if (Q.detail) {
    // iron straps and studs
    ctx.beginPath();
    for (const z of [0.6, 1.15]) { const a = P(...pt(0.02, z)), b = P(...pt(W * 0.8, z)); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
    ctx.lineWidth = 0.05;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
  }
  // The sign on it, swinging on its nail.
  const sw = Math.sin(t * 5) * th * 0.5;
  const nail = pt(W / 2, 1.3);
  const [nX, nY] = P(...nail);
  ctx.beginPath();
  const cw = 0.5, chh = 0.34;
  const L = [pt(W / 2 - cw, 1.1), pt(W / 2 + cw, 1.1)].map((p) => P(...p));
  ctx.save();
  ctx.translate(nX, nY);
  ctx.rotate(sw);
  ctx.translate(-nX, -nY);
  ctx.beginPath();
  ctx.moveTo(nX, nY); ctx.lineTo(L[0][0], L[0][1]);
  ctx.moveTo(nX, nY); ctx.lineTo(L[1][0], L[1][1]);
  ctx.lineWidth = 0.02;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  const card = [pt(W / 2 - cw, 1.1), pt(W / 2 + cw, 1.1), pt(W / 2 + cw, 1.1 - chh * 2), pt(W / 2 - cw, 1.1 - chh * 2)];
  poly(ctx, card);
  paint(ctx, MAT.paper, { lw: 0.025 });
  // (the card is nearly flat to us, so its words are painted on the door's plane)
  const cy = lerp(card[0][1], card[1][1], 0.5), cx = lerp(card[0][0], card[1][0], 0.5);
  words(ctx, 'y', cy, cx, 0.93, 'BACK IN', 0.12, C.ink, SANS);
  words(ctx, 'y', cy, cx, 0.72, '5 MINUTES', 0.12, INK.oxblood, SANS);
  ctx.restore();
}

// A little headstone, facing the drive.
function headstone(ctx, x, y, w, h, lines) {
  shadow(ctx, x, y + 0.1, w * 0.8, 0.2, 0.2);
  const pts = [[x - w / 2, 0], [x + w / 2, 0], [x + w / 2, h - w / 2]];
  for (let i = 1; i < 8; i++) { const a = (i / 8) * Math.PI; pts.push([x + (Math.cos(a) * w) / 2, h - w / 2 + (Math.sin(a) * w) / 2]); }
  pts.push([x - w / 2, h - w / 2]);
  // its thickness first, then the face
  onY(ctx, y - 0.12, pts);
  paint(ctx, shade(STONE, 0.3));
  onY(ctx, y, pts);
  paint(ctx, STONE, { dots: STONE_D, density: 0.15 });
  lines.forEach(([text, size, z], i) => words(ctx, 'y', y + 0.01, x, z, text, size, shade(STONE, 0.6), i ? SANS : undefined));
}

// ---------- Bats and a crow ----------
function bat(ctx, X, Y, t, s = 1, ph = 0) {
  const f = Math.sin(t * 16 + ph);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-0.2, -0.25 * f - 0.05, -0.42, -0.1 * f);
  ctx.quadraticCurveTo(-0.25, 0.02, -0.2, 0.1);
  ctx.quadraticCurveTo(-0.1, 0.02, 0, 0.08);
  ctx.quadraticCurveTo(0.1, 0.02, 0.2, 0.1);
  ctx.quadraticCurveTo(0.25, 0.02, 0.42, -0.1 * f);
  ctx.quadraticCurveTo(0.2, -0.25 * f - 0.05, 0, 0);
  paint(ctx, C.black, { lw: 0.02, stroke: C.ink });
  ctx.restore();
}
function crow(ctx, t) {
  const tt = loopT(t);
  const s = lastStrike(tt, 1.6);
  const caw = s && s.big;
  const [X, Y] = P(13.75, 12.1, 3.45);
  ctx.save();
  ctx.translate(X, Y);
  ctx.beginPath();
  ctx.ellipse(0.02, -0.2, 0.24, 0.15, -0.35, 0, TAU);
  ctx.moveTo(0.2, -0.12); ctx.lineTo(0.42, -0.02); ctx.lineTo(0.18, -0.02);
  paint(ctx, C.black, { lw: 0.03 });
  ctx.beginPath();
  ctx.arc(-0.2, -0.36, 0.1, 0, TAU);
  paint(ctx, C.black, { lw: 0.03 });
  ctx.beginPath();
  if (caw) {
    ctx.moveTo(-0.28, -0.39); ctx.lineTo(-0.48, -0.47); ctx.lineTo(-0.3, -0.36);
    ctx.moveTo(-0.29, -0.35); ctx.lineTo(-0.47, -0.3); ctx.lineTo(-0.28, -0.32);
  } else {
    ctx.moveTo(-0.28, -0.39); ctx.lineTo(-0.48, -0.36); ctx.lineTo(-0.28, -0.32);
  }
  paint(ctx, shade(C.grey, 0.4), { lw: 0.02 });
  ctx.fillStyle = INK.bone;
  ctx.fillRect(-0.24, -0.4, 0.035, 0.035);
  // feet
  ctx.beginPath();
  ctx.moveTo(0.0, -0.06); ctx.lineTo(-0.02, 0.02);
  ctx.moveTo(0.08, -0.06); ctx.lineTo(0.07, 0.02);
  ctx.lineWidth = 0.025;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.restore();
  if (caw && Q.detail) words(ctx, 'y', 12.1, 13.2, 4.3 + s.age * 0.3, 'CAW!', 0.24, alpha(C.ink, 1 - s.age / 1.6));
}

// ---------- The area ----------
export default {
  id: 'grounds',
  name: 'The Grounds',
  blurb: "Inspector Pidge's car is still stuck in the mud. The gardener is lost in his own maze again, and it only comes up to his waist.",

  build(R) {
    const people = R.walkers.filter((w) => !w.ghost);
    const [ox, oy, oz] = R.origin;
    const pidge = people.find((w) => w.id === 'pidge');
    // Someone out here, in the area's own units, or null.
    const outHere = (w, t) => {
      if (!w) return null;
      const p = w.at(t);
      if (!R.contains(p.x, p.y, p.z || 0)) return null;
      return { ...p, x: p.x - ox, y: p.y - oy, z: (p.z || 0) - oz };
    };
    // The front door opens for anyone within a couple of steps of it.
    const doorOpen = (t) => {
      let d = 99;
      for (const w of people) {
        const p = w.at(t);
        if (Math.abs((p.z || 0) - oz) < 1) d = Math.min(d, Math.hypot(p.x - (ox + DOOR.at), p.y - oy));
      }
      return smooth((2.9 - d) / 1.3);
    };

    // ---------- The ground ----------
    R.floor((ctx) => {
      // Tufts of wet grass, so the lawn isn't flat up close.
      if (Q.detail) {
        ctx.beginPath();
        for (let i = 0; i < 90; i++) {
          const x = hash(i, 11) * 16, y = 1.2 + hash(i, 12) * 14.8;
          if (x > 7.2 && x < 10 && y > 1) continue;
          const [X, Y] = P(x, y, 0);
          ctx.moveTo(X - 0.1, Y - 0.14); ctx.lineTo(X, Y); ctx.lineTo(X + 0.04, Y - 0.18);
          ctx.moveTo(X + 0.12, Y - 0.12); ctx.lineTo(X, Y);
        }
        ctx.lineWidth = 0.03;
        ctx.strokeStyle = NIGHT.lawnDots;
        ctx.stroke();
      }
      // The flower beds under the windows.
      for (const [a, b] of [[0.2, 5.8], [10.2, 15.8]]) {
        rect(ctx, a, 0.05, b - a, 1.0, 0, NIGHT.earth, { dots: NIGHT.earthDark, density: 0.3, lw: 0.04 });
        rect(ctx, a, 1.02, b - a, 0.14, 0.01, STONE_D, { lw: 0.03 });
      }
      // The drive and its turning circle, in wet gravel.
      const grit = { dots: shade(NIGHT.gravel, 0.4), density: 0.22, stroke: false };
      disc(ctx, 8.6, 3.6, 0, 2.4, NIGHT.gravel, grit);
      // (on out past the area's edge to the end of the lawn, so the gravel doesn't change there)
      rect(ctx, 7.4, 3.5, 2.4, 18.5, 0, NIGHT.gravel, grit);
      if (Q.detail) {
        // kerb stones down both sides
        ctx.beginPath();
        for (const x of [7.4, 9.8]) for (let y = 5.9; y < 21.6; y += 0.5) { const a = P(x, y, 0), b = P(x, y + 0.42, 0); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
        ctx.lineWidth = 0.09;
        ctx.strokeStyle = STONE_D;
        ctx.stroke();
        // tyre ruts, and the two that swerve off the circle into the mud
        ctx.beginPath();
        for (const x of [8.05, 9.15]) { const a = P(x, 22, 0); ctx.moveTo(a[0], a[1]); for (let y = 21; y > 5.5; y -= 1) { const b = P(x + Math.sin(y) * 0.05, y, 0); ctx.lineTo(b[0], b[1]); } }
        for (const [y0, y1] of [[4.0, FAR + 0.1], [5.6, NEAR - 0.1]]) {
          const a = P(8.4, y0 - 1.2, 0), c = P(9.4, y0, 0), b = P(10.9, y1, 0);
          ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(c[0], c[1], b[0], b[1]);
        }
        ctx.lineWidth = 0.13;
        ctx.strokeStyle = alpha(shade(NIGHT.gravel, 0.45), 0.6);
        ctx.stroke();
      }
      // The mud the car went into.
      poly(ctx, blob(12.25, 5.5, 2.55, 2.1, 5, 22, 0.16));
      paint(ctx, MUD, { dots: MUD_D, density: 0.25, lw: 0.04 });
      if (Q.detail) {
        // splatter round the edge, and wet shine on top
        ctx.fillStyle = MUD;
        for (let i = 0; i < 30; i++) {
          const a = hash(i, 21) * TAU, r = 2.3 + hash(i, 22) * 1.3;
          const [X, Y] = P(12.25 + Math.cos(a) * r * 1.1, 5.5 + Math.sin(a) * r * 0.9, 0);
          ctx.beginPath();
          ctx.ellipse(X, Y, 0.05 + hash(i, 23) * 0.08, 0.03 + hash(i, 24) * 0.04, 0, 0, TAU);
          ctx.fill();
        }
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const [X, Y] = P(10.6 + hash(i, 25) * 3.6, 3.9 + hash(i, 26) * 3.4, 0);
          ctx.moveTo(X - 0.18, Y); ctx.lineTo(X + 0.18, Y - 0.04);
        }
        ctx.lineWidth = 0.04;
        ctx.strokeStyle = alpha(MUD_HI, 0.7);
        ctx.stroke();
        // Pidge's footprints (three toes; he's a pigeon) from the door to the car
        ctx.beginPath();
        for (let i = 0; i < 9; i++) {
          const k = (i + 0.5) / 9;
          const x = lerp(8.05, 9.7, k) + (i % 2 ? 0.1 : -0.1), y = lerp(2.6, 5.95, k);
          const [X, Y] = P(x, y, 0);
          ctx.moveTo(X, Y); ctx.lineTo(X + 0.1, Y + 0.12);
          ctx.moveTo(X, Y); ctx.lineTo(X - 0.08, Y + 0.13);
          ctx.moveTo(X, Y); ctx.lineTo(X + 0.14, Y - 0.02);
          ctx.moveTo(X, Y); ctx.lineTo(X - 0.1, Y - 0.06);
        }
        ctx.lineWidth = 0.035;
        ctx.strokeStyle = alpha(MUD_D, 0.8);
        ctx.stroke();
      }
      // Stepping stones from the drive to the crypt's door.
      for (const [x, y] of [[10.35, 15.55], [11.2, 15.6], [12.05, 15.5], [12.9, 15.55]]) {
        poly(ctx, blob(x, y, 0.36, 0.28, x * 10, 9, 0.12, 0.01));
        paint(ctx, STONE_D, { lw: 0.03 });
      }
      // A drain grate by the left downpipe (the right one fills a water butt).
      rect(ctx, 0.55, 0.2, 0.4, 0.3, 0.02, C.ink, { lw: 0.02 });
      // Rose petals, knocked off by the rain.
      if (Q.detail) {
        ctx.fillStyle = INK.oxblood;
        for (let i = 0; i < 26; i++) {
          const x = [1.9, 3.4, 4.9, 10.9, 12.3, 13.9][i % 6] + (hash(i, 91) - 0.5) * 1.3, y = 0.2 + hash(i, 92) * 0.95;
          const [X, Y] = P(x, y, 0.01);
          ctx.beginPath();
          ctx.ellipse(X, Y, 0.06, 0.035, hash(i, 93) * 3, 0, TAU);
          ctx.fill();
        }
      }
    });

    // ---------- The house front ----------
    R.walls({
      left: false,
      right: WALL,
      cap: STONE,
      cut: INK.stormNavy,
      dotsR: shade(WALL, 0.3), densR: 0.12,
      doors: DOORS.grounds,
    });
    R.wall((ctx) => {
      masonry(ctx);
      // the plinth, a string course and the cornice
      onRight(ctx, 0, 0, D0 - 0.38, 0.45, STONE_D, { dots: shade(STONE_D, 0.45), density: 0.2 });
      onRight(ctx, D1 + 0.38, 0, 16 - D1 - 0.38, 0.45, STONE_D, { dots: shade(STONE_D, 0.45), density: 0.2 });
      onRight(ctx, 0, 5.15, D0 - 0.2, 0.14, STONE, { lw: 0.03 });
      onRight(ctx, D1 + 0.2, 5.15, 16 - D1 - 0.2, 0.14, STONE, { lw: 0.03 });
      onRight(ctx, 0, 5.72, 16, 0.28, STONE, { dots: STONE_D, density: 0.2, lw: 0.03 });
      // quoins up both ends
      for (const u of [0, 15.45]) for (let z = 0.45, i = 0; z < 5.7; z += 0.42, i++) onRight(ctx, u + (i % 2 && u ? -0.2 : 0), z, 0.55 + (i % 2 ? 0.2 : 0), 0.42, STONE, { lw: 0.025 });
    });
    R.decor((ctx) => {
      for (const [a, b] of WIN) windowStone(ctx, a, b);
      doorway(ctx);
      drainpipe(ctx, 0.75);
      drainpipe(ctx, 15.25);
      ivy(ctx, 3, 1.1, 1.6, 5.2);
      ivy(ctx, 9, 14.9, -1.2, 3.2);
      // "Beware of the goose": an enamel sign by the door
      onRight(ctx, 4.55, 1.35, 1.45, 0.72, INK.bone, { lw: 0.04 });
      onRight(ctx, 4.62, 1.42, 1.31, 0.58, null, { lw: 0.025, stroke: INK.oxblood });
      words(ctx, 'y', 0, 5.275, 1.84, 'BEWARE OF', 0.15, INK.oxblood, SANS);
      words(ctx, 'y', 0, 5.275, 1.6, 'THE GOOSE', 0.2, C.ink);
    });
    // The windows, lit from inside until the lights go out. Through the left
    // one, the hall's suit of armor, which moves every time lightning strikes;
    // through the right, the grandfather clock's pendulum.
    R.decor((ctx, t) => {
      const tt = loopT(t);
      const k = house.lamp(t);
      const glass = k > 0.5 ? LIT : house.glass(t);
      for (const [j, [a, b]] of WIN.entries()) {
        onY(ctx, 0, lancet(a, b, 2.0, 3.45, 1.25));
        paint(ctx, glass, { lw: 0.04 });
        if (k > 0.5) {
          // curtains, and something in the room
          const shape = (pts) => { onY(ctx, 0, pts); ctx.fillStyle = alpha(INK.oxblood, 0.55); ctx.fill(); };
          shape([[a, 2.0], [a + 0.4, 2.0], [a + 0.25, 4.1], [a, 4.3]]);
          shape([[b - 0.4, 2.0], [b, 2.0], [b, 4.3], [b - 0.25, 4.1]]);
          ctx.fillStyle = alpha(INK.deepPlum, 0.7);
          const m = (a + b) / 2;
          if (j === 0) {
            const pose = Math.max(0, storm.strikes.filter((s) => s.t <= tt).length) % 3;
            const u = m + [-0.45, 0.35, -0.1][pose];
            const [X, Y] = P(u, 0, 2.0);
            ctx.beginPath();
            ctx.arc(X, Y - 1.62, 0.15, 0, TAU);
            ctx.rect(X - 0.17, Y - 1.45, 0.34, 0.7);
            ctx.rect(X - 0.13, Y - 0.75, 0.1, 0.75);
            ctx.rect(X + 0.03, Y - 0.75, 0.1, 0.75);
            if (pose === 1) { ctx.rect(X + 0.17, Y - 1.85, 0.08, 0.5); ctx.rect(X + 0.17, Y - 1.95, 0.35, 0.05); }
            else ctx.rect(X + 0.17, Y - 1.4, 0.08, 0.55);
            ctx.rect(X - 0.25, Y - 1.4, 0.08, 0.55);
            ctx.fill();
          } else {
            const [X, Y] = P(m + 0.2, 0, 2.0);
            ctx.beginPath();
            ctx.rect(X - 0.2, Y - 2.3, 0.4, 2.3);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(X, Y - 1.95, 0.14, 0, TAU);
            ctx.fillStyle = alpha(LIT, 0.8);
            ctx.fill();
            const sw = Math.sin(t * 3) * 0.12;
            ctx.beginPath();
            ctx.moveTo(X, Y - 1.7); ctx.lineTo(X + sw, Y - 0.9);
            ctx.lineWidth = 0.03;
            ctx.strokeStyle = alpha(GOLD, 0.9);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(X + sw, Y - 0.85, 0.07, 0, TAU);
            ctx.fillStyle = GOLD;
            ctx.fill();
          }
        }
        windowBars(ctx, a, b);
      }
      fanlight(ctx, t);
    }, { anim: true });
    // The doors, opening for whoever's coming or going.
    R.decor((ctx, t) => doors(ctx, t, doorOpen(t)), { anim: true });
    // When the lights go out, the house's front goes dark with the rest of it.
    // (Only the wall: the lawn is the night's, and stays as it is. The doorway
    // is left alone, since the hall behind it darkens itself.)
    R.decor((ctx, t) => {
      const k = house.dark(t);
      if (!(k > 0.01)) return;
      const shade_ = alpha(C.night, Math.min(0.8, k * 0.66));
      const T = -0.45;
      poly(ctx, [[T, 0, 0], [D0, 0, 0], [D0, 0, DOOR.h], [D1, 0, DOOR.h], [D1, 0, 0], [16, 0, 0], [16, 0, 6], [T, 0, 6]]);
      ctx.fillStyle = shade_;
      ctx.fill();
      poly(ctx, [[16, 0, 0], [16, T, 0], [16, T, 6], [16, 0, 6]]);
      ctx.fill();
      poly(ctx, [[T, T, 6], [16, T, 6], [16, 0, 6], [T, 0, 6]]);
      ctx.fill();
    }, { anim: true });
    for (const u of [D0 - 0.75, D1 + 0.75]) wallLantern(R, u);
    // Drips from the window sills, and the downpipes gushing.
    R.decor((ctx, t) => {
      if (!Q.detail) return;
      ctx.beginPath();
      for (const [a, b] of WIN) {
        for (let i = 0; i < 2; i++) {
          const u = lerp(a - 0.1, b + 0.1, (i + 0.35) / 1.7);
          const f = (t * 1.3 + hash(i, a * 3)) % 1;
          const [X, Y] = P(u, 0.12, 1.74 - f * 1.6);
          ctx.moveTo(X, Y); ctx.lineTo(X, Y + 0.12);
        }
      }
      ctx.lineWidth = 0.035;
      ctx.strokeStyle = alpha(INK.bone, 0.6);
      ctx.stroke();
      // (the left downpipe into its drain; the right one fills the water butt)
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const w = Math.sin(t * 13 + i * 2) * 0.03;
        const [X0, Y0] = P(0.75, 0.25, 0.12), [X1, Y1] = P(0.75 + w, 0.42, 0.0);
        ctx.moveTo(X0 + (i - 1) * 0.04, Y0); ctx.quadraticCurveTo(X0 + (i - 1) * 0.05, Y0 + 0.05, X1 + (i - 1) * 0.06, Y1);
      }
      ctx.lineWidth = 0.05;
      ctx.strokeStyle = alpha(INK.bone, 0.75);
      ctx.stroke();
    }, { anim: true });

    // ---------- Things on the ground ----------
    // The front steps, the mat, and light from the door when it's open.
    R.rug((ctx) => {
      box(ctx, 5.95, 0, 0, 4.1, 1.9, 0.16, STONE, { dotsL: STONE_D });
      box(ctx, 6.35, 1.9, 0, 3.3, 0.55, 0.08, STONE, { dotsL: STONE_D });
      rect(ctx, DOOR.at - 0.85, 0.2, 1.7, 0.8, 0.165, mix(MAT.oak, C.ink, 0.35), { lw: 0.03 });
      words(ctx, 'floor', 0.17, DOOR.at, 0.6, 'GO AWAY', 0.26, alpha(INK.bone, 0.85));
      // webbed footprints across the step to the parcel and back: someone has
      // been out to see if it came
      if (Q.detail) {
        ctx.fillStyle = alpha(shade(STONE, 0.5), 0.85);
        for (const [x, y, dx, dy] of [[8.4, 1.25, -1, 0.35], [8.0, 1.42, -1, 0.35], [7.6, 1.5, -1, 0.3], [7.35, 1.78, 1, -0.2], [7.8, 1.72, 1, -0.2], [8.2, 1.6, 1, -0.3]]) {
          const l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l, vx = -uy, vy = ux;
          const at = (f, s) => [x + ux * f + vx * s, y + uy * f + vy * s, 0.166];
          poly(ctx, [at(-0.1, 0), at(0.1, 0.1), at(0.07, 0.035), at(0.13, 0), at(0.07, -0.035), at(0.1, -0.1)]);
          ctx.fill();
        }
      }
    });
    R.rug((ctx, t) => {
      const k = doorOpen(t) * house.lamp(t);
      if (k > 0.02) {
        poly(ctx, [[D0 + 0.1, 0.02, 0.17], [D1 - 0.1, 0.02, 0.17], [D1 + 0.5, 2.3, 0.02], [D0 - 0.5, 2.3, 0.02]]);
        ctx.fillStyle = alpha(GOLD, 0.25 * k);
        ctx.fill();
      }
      // light from the windows, on the beds and the lawn
      if (house.lamp(t) > 0.5) {
        for (const [a, b] of WIN) {
          poly(ctx, [[a, 0.1, 0], [b, 0.1, 0], [b + 0.8, 2.6, 0], [a - 0.5, 2.6, 0]]);
          ctx.fillStyle = alpha(GOLD, 0.1);
          ctx.fill();
        }
      }
      // the headlamps' beams across the lawn
      const hk = headlamps(loopT(t));
      poly(ctx, [[14.05, 4.6, 0], [14.05, 6.3, 0], [17.4, 7.9, 0], [17.4, 3.0, 0]]);
      ctx.fillStyle = alpha(LIT, 0.1 * hk);
      ctx.fill();
      // puddles on the drive and the lawn, and in the mud, and the rain on them
      for (const [x, y, rx, ry, s] of [[8.3, 9.6, 0.75, 0.5, 31], [9.0, 13.7, 0.5, 0.4, 32], [7.9, 4.7, 0.55, 0.4, 33], [3.9, 4.6, 0.6, 0.45, 34], [11.1, 7.05, 0.8, 0.45, 35], [13.4, 9.3, 0.6, 0.4, 36]]) {
        poly(ctx, blob(x, y, rx, ry, s, 12, 0.18, 0.01));
        paint(ctx, WATER, { lw: 0.025 });
        rings(ctx, t, x, y, 0.01, rx, ry, rx > 0.55 ? 2 : 1, s);
      }
      // the mud, glugging: a bubble swells and pops now and then
      if (Q.detail) {
        for (const [x, y, every, off] of [[12.9, 7.3, 3.7, 0], [14.45, 4.8, 4.9, 1.8]]) {
          const f = (((t + off) % every) + every) % every;
          const [X, Y] = P(x, y, 0);
          if (f < 1.6) {
            const r = 0.05 + (f / 1.6) * 0.16;
            ctx.beginPath();
            ctx.ellipse(X, Y - r * 0.4, r, r * 0.7, 0, Math.PI, 0);
            paint(ctx, MUD, { lw: 0.025 });
            ctx.fillStyle = alpha(MUD_HI, 0.8);
            ctx.fillRect(X - r * 0.4, Y - r * 0.75, 0.035, 0.035);
          } else if (f < 1.9) {
            const k = (f - 1.6) / 0.3;
            ctx.beginPath();
            ctx.ellipse(X, Y, 0.15 + k * 0.2, 0.07 + k * 0.1, 0, 0, TAU);
            ctx.lineWidth = 0.025;
            ctx.strokeStyle = alpha(MUD_HI, 0.8 * (1 - k));
            ctx.stroke();
          }
        }
      }
      // the parcel's own puddle, on the step
      poly(ctx, blob(PARCEL[0] + 0.17, PARCEL[1] + 0.43, 0.62, 0.5, 37, 14, 0.12, 0.17));
      paint(ctx, alpha(WATER, 0.85), { stroke: false });
      rings(ctx, t, PARCEL[0] + 0.3, PARCEL[1] + 0.6, 0.17, 0.4, 0.25, 2, 38);
    }, { anim: true });

    // A water butt under the right-hand downpipe, overflowing.
    R.thing(15.25, 0.9, (ctx, t) => {
      const x = 15.25, y = 0.5;
      shadow(ctx, x, y + 0.1, 0.5, 0.2, 0.2);
      cylinder(ctx, x, y, 0, 0.36, 0.95, OAK, { top: WATER });
      for (const z of [0.2, 0.75]) {
        const [X, Y] = P(x, y, z);
        ctx.beginPath();
        ctx.ellipse(X, Y, 0.36 * Math.SQRT2, 0.18 * Math.SQRT2, 0, 0, Math.PI);
        ctx.lineWidth = 0.05;
        ctx.strokeStyle = C.ink;
        ctx.stroke();
      }
      face(ctx, [[x, 0.02, 1.25], [x, 0.3, 1.0]], null, { lw: 0.12, stroke: shade(WALL, 0.45) });
      if (!Q.detail) return;
      rings(ctx, t, x, y, 0.95, 0.2, 0.2, 1, 44);
      // spilling over its rim
      ctx.beginPath();
      for (let i = 0; i < 2; i++) {
        const [X, Y] = P(x + 0.15 + i * 0.1, y + 0.3 - i * 0.05, 0.95);
        const f = (t * 1.9 + i * 0.31) % 1;
        ctx.moveTo(X + 0.02, Y + f * 0.95);
        ctx.lineTo(X + 0.02, Y + f * 0.95 + 0.14);
      }
      ctx.lineWidth = 0.035;
      ctx.strokeStyle = alpha(INK.bone, 0.7);
      ctx.stroke();
    }, { anim: true });
    // The flower beds' roses.
    for (const [x, y, s] of [[1.9, 0.55, 1], [3.4, 0.5, 2], [4.9, 0.55, 3], [10.9, 0.5, 4], [12.3, 0.55, 5], [13.9, 0.5, 6]]) R.thing(x, y + 0.3, (ctx) => roseBush(ctx, x, y, s));

    // The lamp posts.
    for (const [x, y] of LAMPS) lampPost(R, x, y);

    // The parcel on the step: soaked, sagging, string, a label, the Courier's
    // wing, and a gold chain poking out of a torn corner. Tap it and the wet
    // paper flops open: a little velvet box, and the monocle on its chain.
    const parcel = R.poke({ id: 'parcel', at: [PARCEL[0], PARCEL[1], PARCEL[2] + 0.05], r: 0.8, sound: 'pop', say: ['Squelch.', 'Still soggy.'] });
    R.thing(PARCEL[0] + 0.42, PARCEL[1] + 0.3, (ctx) => {
      const k = parcel.k();
      const x0 = PARCEL[0] - 0.42, x1 = PARCEL[0] + 0.42, y0 = PARCEL[1] - 0.3, y1 = PARCEL[1] + 0.3, z0 = 0.16, sag = 0.07;
      const z1 = 0.56 - 0.3 * k; // it slumps as it opens
      const xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
      shadow(ctx, xm + 0.05, ym + 0.05, 0.55 + 0.2 * k, 0.25 + 0.1 * k, 0.2);
      const side = shade(KRAFT, 0.18), wet = shade(KRAFT, 0.45);
      if (k > 0.05) {
        // the far flaps, standing up limp
        const up = 0.28 * k;
        face(ctx, [[x0, y0, z1], [x1, y0, z1], [x1 + 0.02, y0 - 0.08 * k, z1 + up * 0.7], [xm, y0 - 0.1 * k, z1 + up], [x0 - 0.02, y0 - 0.08 * k, z1 + up * 0.8]], shade(KRAFT, 0.08), { dots: wet, density: 0.3 });
        face(ctx, [[x0, y0, z1], [x0, y1, z1], [x0 - 0.1 * k, y1, z1 + up * 0.6], [x0 - 0.12 * k, ym, z1 + up * 0.9], [x0 - 0.08 * k, y0, z1 + up * 0.7]], shade(KRAFT, 0.12), { dots: wet, density: 0.3 });
      }
      face(ctx, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [xm, y1, z1 - sag], [x0, y1, z1]], side, { dots: wet, density: 0.35 });
      face(ctx, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, ym, z1 - sag], [x1, y0, z1]], shade(KRAFT, 0.06), { dots: wet, density: 0.25 });
      if (k <= 0.05) {
        face(ctx, [[x0, y0, z1], [xm, y0, z1 - sag], [x1, y0, z1], [x1, ym, z1 - sag], [x1, y1, z1], [xm, y1, z1 - sag], [x0, y1, z1], [x0, ym, z1 - sag]], KRAFT, { dots: wet, density: 0.2 });
        const [cX, cY] = P(xm, ym, z1 - sag * 1.5);
        ctx.beginPath();
        ctx.ellipse(cX, cY, 0.26, 0.11, 0, 0, TAU);
        ctx.fillStyle = alpha(wet, 0.6);
        ctx.fill();
        // string, both ways round, and a bow
        face(ctx, [[x0, ym, z1 - sag], [x1, ym, z1 - sag], [x1, ym, z0]], null, { lw: 0.03, stroke: INK.bone });
        face(ctx, [[x1 - 0.12, y0, z1 - 0.02], [x1 - 0.12, y1, z1 - 0.02], [x1 - 0.12, y1, z0]], null, { lw: 0.03, stroke: INK.bone });
        const [bX, bY] = P(x1 - 0.12, ym, z1 - sag);
        ctx.beginPath();
        ctx.ellipse(bX - 0.07, bY - 0.03, 0.07, 0.035, 0.4, 0, TAU);
        ctx.ellipse(bX + 0.07, bY - 0.03, 0.07, 0.035, -0.4, 0, TAU);
        ctx.strokeStyle = INK.bone;
        ctx.lineWidth = 0.025;
        ctx.stroke();
        // who it's for, in marker
        words(ctx, 'y', y1 + 0.005, x0 + 0.34, z0 + 0.2, 'G. GOOSE', 0.12, C.ink, SANS);
      } else {
        // open: the wet inside, the string gone slack on the step
        face(ctx, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], shade(KRAFT, 0.55), { stroke: false });
        ctx.beginPath();
        const [s0, s1, s2] = [P(x1 + 0.1, y1 + 0.15, z0 + 0.01), P(x1 + 0.35 * k, ym, z0 + 0.01), P(x1 + 0.2, y0 - 0.1, z0 + 0.01)];
        ctx.moveTo(...s0); ctx.quadraticCurveTo(...s1, ...s2);
        ctx.strokeStyle = INK.bone; ctx.lineWidth = 0.025; ctx.stroke();
        // the little box, its lid up, and the monocle on its chain
        const bx = xm - 0.15, by = ym - 0.11, bz = z0, bh = z1 - z0 + 0.06;
        face(ctx, [[bx, by, bz + bh], [bx + 0.3, by, bz + bh], [bx + 0.3, by - 0.04, bz + bh + 0.2 * k], [bx, by - 0.04, bz + bh + 0.2 * k]], MAT.velvetDark, { lw: 0.025 });
        box(ctx, bx, by, bz, 0.3, 0.22, bh, MAT.velvet, { lw: 0.025, top: MAT.velvetDark, flat: true });
        const [mX, mY] = P(xm, ym, bz + bh + 0.02);
        ctx.beginPath(); // the chain, coiled on the velvet and over the side
        ctx.moveTo(mX + 0.08, mY);
        ctx.quadraticCurveTo(mX + 0.2, mY + 0.02, mX + 0.16, mY + 0.08);
        ctx.quadraticCurveTo(mX + 0.1, mY + 0.2, mX + 0.22, mY + 0.22);
        ctx.strokeStyle = GOLD; ctx.lineWidth = 0.025; ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(mX, mY, 0.085, 0.07, 0, 0, TAU);
        ctx.fillStyle = alpha(INK.bone, 0.55); ctx.fill();
        ctx.lineWidth = 0.035; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mX - 0.04, mY - 0.03); ctx.lineTo(mX - 0.01, mY - 0.05); // a glint
        ctx.strokeStyle = C.white; ctx.lineWidth = 0.02; ctx.stroke();
        // the near flaps, flopped down onto the step
        const out = 0.3 * k;
        face(ctx, [[x0, y1, z1], [x1, y1, z1], [x1 - 0.03, y1 + out, z0 + 0.01], [x0 + 0.03, y1 + out, z0 + 0.01]], KRAFT, { dots: wet, density: 0.25 });
        words(ctx, 'floor', z0 + 0.012, xm, y1 + out * 0.55, 'G. GOOSE', 0.1, C.ink, SANS);
        face(ctx, [[x1, y0, z1], [x1, y1, z1], [x1 + out, y1 - 0.03, z0 + 0.01], [x1 + out, y0 + 0.03, z0 + 0.01]], shade(KRAFT, 0.04), { dots: wet, density: 0.25 });
      }
      // the Courier's little wing, on the end
      const [wX, wY] = P(x1 + 0.005, ym - 0.1, z0 + 0.22 - 0.1 * k);
      ctx.beginPath();
      ctx.moveTo(wX - 0.1, wY + 0.05);
      ctx.quadraticCurveTo(wX - 0.02, wY - 0.16, wX + 0.14, wY - 0.2);
      ctx.quadraticCurveTo(wX + 0.08, wY - 0.08, wX + 0.12, wY - 0.06);
      ctx.quadraticCurveTo(wX + 0.04, wY - 0.02, wX + 0.08, wY + 0.03);
      ctx.closePath();
      paint(ctx, INK.bone, { lw: 0.02 });
      if (k > 0.05) return;
      // shut: a torn corner, and a loop of gold chain hanging out of it
      const [tX, tY] = P(x1, y1, z0 + 0.1);
      ctx.beginPath();
      ctx.moveTo(tX - 0.12, tY - 0.02); ctx.lineTo(tX - 0.02, tY - 0.16); ctx.lineTo(tX + 0.02, tY - 0.02);
      paint(ctx, shade(KRAFT, 0.5), { lw: 0.02 });
      ctx.beginPath();
      ctx.moveTo(tX - 0.06, tY - 0.06);
      ctx.quadraticCurveTo(tX - 0.02, tY + 0.16, tX + 0.12, tY + 0.08);
      ctx.quadraticCurveTo(tX + 0.18, tY + 0.04, tX + 0.14, tY + 0.12);
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 0.03;
      ctx.stroke();
    }, { anim: true });
    R.find({
      id: 'parcel', label: 'A soaked parcel for G. Goose', kind: 'poke', inside: parcel, at: [PARCEL[0], PARCEL[1], 0.4], r: 0.75,
      hint: "Post for a G. Goose, left out in the rain. I can't open other people's post. You can.",
    });

    // By the door: the bell for the butler (who has been arrested). It
    // answers a tap, with rings, and nobody comes.
    const BELL_U = D1 + 0.95 + 0.3;
    const bell = R.poke({ id: 'bell', at: [BELL_U, 0.1, 1.9], r: 0.7, hold: 0.8, sound: 'bell', say: ['Ding. Nobody comes.', "He's been arrested.", 'Ding. Still arrested.'] });
    R.decor((ctx) => {
      const k = bell.k();
      if (k < 0.05) return;
      const [X, Y] = P(BELL_U, 0, 2.2);
      ctx.lineWidth = 0.03;
      ctx.strokeStyle = alpha(GOLD, k);
      for (const r of [0.16, 0.26]) { ctx.beginPath(); ctx.arc(X, Y, r + (1 - k) * 0.05, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(X, Y, r + (1 - k) * 0.05, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke(); }
    }, { anim: true });
    R.decor((ctx) => {
      const u = D1 + 0.95;
      onRight(ctx, u - 0.05, 1.55, 0.7, 0.42, GOLD, { lw: 0.03 });
      onRight(ctx, u + 0.02, 1.62, 0.56, 0.28, MAT.brassDark, { stroke: false });
      words(ctx, 'y', 0, u + 0.3, 1.81, 'RING FOR', 0.08, INK.bone, SANS);
      words(ctx, 'y', 0, u + 0.3, 1.7, 'BUTLER', 0.09, INK.bone, SANS);
      const [X, Y] = P(u + 0.3, 0, 2.2);
      ctx.beginPath();
      ctx.arc(X, Y, 0.09, 0, TAU);
      paint(ctx, GOLD, { lw: 0.03 });
      // the note stuck over it
      ctx.save();
      ctx.translate(...P(u + 0.42, 0, 1.52));
      ctx.transform(1, 0.5, 0, 1, 0, 0);
      ctx.rotate(-0.25);
      ctx.fillStyle = MAT.paper;
      ctx.fillRect(-0.3, -0.12, 0.6, 0.2);
      ctx.lineWidth = 0.015;
      ctx.strokeStyle = C.ink;
      ctx.strokeRect(-0.3, -0.12, 0.6, 0.2);
      ctx.font = `800 ${0.1 * 40}px "Rethink Sans", system-ui, sans-serif`;
      ctx.scale(1 / 40, 1 / 40);
      ctx.fillStyle = INK.oxblood;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('(ARRESTED)', 0, -0.02 * 40);
      ctx.restore();
    });
    // A boot scraper by the door.
    R.thing(9.8, 1.5, (ctx) => {
      box(ctx, 9.55, 1.25, 0.16, 0.5, 0.2, 0.05, C.ink, { flat: true });
      face(ctx, [[9.55, 1.35, 0.21], [9.55, 1.35, 0.45], [10.05, 1.35, 0.45], [10.05, 1.35, 0.21]], null, { lw: 0.04 });
    });

    // ---------- The maze ----------
    // The string he unrolled on the way in, so as not to get lost.
    R.rug((ctx) => {
      if (!Q.detail) return;
      const pts = [[5.35, 6.25], [5.8, 7.0], [5.85, 8.2], [4.6, 8.35], [3.4, 8.3], [3.2, 9.4], [3.8, 9.9], [4.6, 10.4], [4.3, 12.2], [3.0, 12.6], [2.7, 11.2], [3.8, 10.5], [4.2, 11.6], [3.2, 11.9], [3.1, 10.9], [3.9, 11.2]];
      ctx.beginPath();
      pts.forEach(([x, y], i) => { const [X, Y] = P(x, y, 0.02); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.lineWidth = 0.035;
      ctx.strokeStyle = INK.oxblood;
      ctx.lineJoin = 'round';
      ctx.stroke();
      // and the tangle it ended in, round his feet
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const [X, Y] = P(3.5 + Math.cos(i * 1.7) * 0.15, 11.1 + Math.sin(i * 2.3) * 0.12, 0.02);
        ctx.moveTo(X + 0.3, Y);
        ctx.ellipse(X, Y, 0.3 - i * 0.03, 0.12, i * 0.5, 0, TAU);
      }
      ctx.stroke();
      // hedge clippings on the grass by the barrow
      ctx.fillStyle = HEDGE_TOP;
      for (let i = 0; i < 14; i++) {
        const [X, Y] = P(1.2 + hash(i, 81) * 2.4, 5.2 + hash(i, 82) * 1.5, 0);
        ctx.beginPath();
        ctx.ellipse(X, Y, 0.07, 0.035, hash(i, 83) * 3, 0, TAU);
        ctx.fill();
      }
    });
    for (const [x0, y0, x1, y1] of HEDGES) {
      const [x, y, w, d] = y0 === y1 ? [x0, y0 - 0.22, x1 - x0, 0.45] : [x0 - 0.22, y0, 0.45, y1 - y0];
      R.thing(x + w / 2, y + d / 2, (ctx) => hedge(ctx, x, y, w, d, HEDGE_H));
    }
    // (on the hedge's corner, so drawn just after it)
    R.thing(7.05, 11.4, (ctx) => topiary(ctx));
    R.decoy({ id: 'topiary', at: [6.9, 7.45, HEDGE_H + 0.75], r: 0.8, say: ['Hedge. Very patient.', 'Still a hedge.', 'The gardener is very proud.'] });
    R.thing(5.2, 6.2, (ctx) => mazeSign(ctx));
    R.thing(4.2, 8.55, (ctx) => fingerpost(ctx));
    R.thing(2.6, 5.8, (ctx) => wheelbarrow(ctx));
    // his shears, left stuck in a hedge
    R.thing(2.6, 7.75, (ctx) => {
      const [X, Y] = P(2.5, 7.5, HEDGE_H + 0.05);
      ctx.beginPath();
      ctx.moveTo(X - 0.3, Y - 0.35); ctx.lineTo(X + 0.05, Y);
      ctx.moveTo(X + 0.3, Y - 0.35); ctx.lineTo(X - 0.05, Y);
      ctx.lineWidth = 0.05;
      ctx.strokeStyle = MAT.silver;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(X - 0.05, Y); ctx.lineTo(X - 0.12, Y + 0.2);
      ctx.moveTo(X + 0.05, Y); ctx.lineTo(X + 0.12, Y + 0.2);
      ctx.lineWidth = 0.07;
      ctx.strokeStyle = INK.oxblood;
      ctx.stroke();
    });

    // The gardener's compass, dropped in the maze: its needle can't settle.
    R.thing(COMPASS[0], COMPASS[1], (ctx, t) => {
      const [x, y] = COMPASS;
      shadow(ctx, x, y + 0.05, 0.35, 0.15, 0.25);
      // the lid, open, standing up behind
      upright(ctx, x, y - 0.27, 0.3, 0.27);
      paint(ctx, MAT.brassDark, { lw: 0.035 });
      upright(ctx, x, y - 0.26, 0.3, 0.18);
      paint(ctx, alpha(INK.bone, 0.35), { lw: 0.02 });
      cylinder(ctx, x, y, 0, 0.27, 0.08, GOLD, { flat: true, top: GOLD });
      disc(ctx, x, y, 0.085, 0.21, INK.bone, { lw: 0.02 });
      const a = t * 6 + Math.sin(t * 1.3) * 4;
      const c = Math.cos(a), s = Math.sin(a);
      poly(ctx, [[x + c * 0.18, y + s * 0.18, 0.09], [x - s * 0.04, y + c * 0.04, 0.09], [x, y, 0.09], [x + s * 0.04, y - c * 0.04, 0.09]]);
      paint(ctx, INK.oxblood, { stroke: false });
      poly(ctx, [[x - c * 0.18, y - s * 0.18, 0.09], [x - s * 0.04, y + c * 0.04, 0.09], [x, y, 0.09], [x + s * 0.04, y - c * 0.04, 0.09]]);
      paint(ctx, C.ink, { stroke: false });
    }, { anim: true });
    R.find({ id: 'compass', label: "The gardener's compass", kind: 'spot', at: [COMPASS[0], COMPASS[1], 0.1], r: 0.8 });

    // ---------- The lawn's other things ----------
    // A sundial, in a thunderstorm, at night.
    R.thing(15.0, 9.35, (ctx) => {
      const x = 14.95, y = 9.3;
      shadow(ctx, x, y, 0.45);
      box(ctx, x - 0.3, y - 0.3, 0, 0.6, 0.6, 0.12, STONE_D, { flat: true });
      cylinder(ctx, x, y, 0.12, 0.17, 0.72, STONE, {});
      cylinder(ctx, x, y, 0.84, 0.36, 0.08, STONE, { top: shade(STONE, 0.05) });
      disc(ctx, x, y, 0.925, 0.3, shade(STONE, 0.12), { lw: 0.02 });
      face(ctx, [[x - 0.22, y, 0.93], [x + 0.2, y, 0.93], [x - 0.22, y, 1.26]], GOLD, { lw: 0.03 });
      // with a card hung on it
      face(ctx, [[x - 0.18, y + 0.37, 0.83], [x + 0.26, y + 0.37, 0.83], [x + 0.26, y + 0.37, 0.52], [x - 0.18, y + 0.37, 0.52]], MAT.paper, { lw: 0.025 });
      words(ctx, 'y', y + 0.38, x + 0.04, 0.73, 'OUT OF', 0.075, C.ink, SANS);
      words(ctx, 'y', y + 0.38, x + 0.04, 0.61, 'ORDER', 0.075, INK.oxblood, SANS);
    });
    R.thing(1.3, 4.5, (ctx) => bench(ctx));
    R.thing(3.2, 3.5, (ctx, t) => birdBath(ctx, t), { anim: true });
    // Frogs, loving it.
    const frogs = [
      [[[7.9, 9.0], [8.6, 9.2], [8.9, 10.0], [8.2, 10.4]], 3.1, 0],
      [[[4.3, 4.2], [4.7, 4.8], [3.8, 5.1]], 3.7, 1.3],
    ];
    for (const [spots, every, off] of frogs) R.mover((t) => frogAt(spots, t, every, off), (ctx, t, p) => frog(ctx, p));
    // A hedgehog, snuffling up and down along the front of the maze.
    R.mover((t) => {
      const k = ((t % 90) + 90) % 90;
      const f = k < 45 ? k / 45 : (90 - k) / 45;
      const stop = Math.sin(k * 0.9) > 0.6; // stops to sniff now and then
      return { x: lerp(0.9, 6.5, smooth(f)), y: 15.75, dir: k < 45 ? 1 : -1, stop };
    }, (ctx, t, p) => {
      const [X, Y] = P(p.x, p.y, 0);
      ctx.save();
      ctx.translate(X, Y);
      ctx.scale(p.dir, 1);
      const bob = p.stop ? 0 : Math.abs(Math.sin(t * 9)) * 0.02;
      ctx.beginPath();
      ctx.ellipse(0.2, -0.08 - bob, 0.1, 0.06, 0.3, 0, TAU);
      paint(ctx, mix(C.brown, INK.bone, 0.35), { lw: 0.025 });
      ctx.beginPath();
      for (let i = 0; i <= 9; i++) {
        const a = Math.PI + (i / 9) * Math.PI, r = i % 2 ? 0.2 : 0.27;
        ctx.lineTo(Math.cos(a) * r * 1.1, -0.06 - bob + Math.sin(a) * r * 0.85);
      }
      ctx.closePath();
      paint(ctx, shade(C.brown, 0.3), { dots: C.ink, density: 0.3, lw: 0.025 });
      ctx.fillStyle = C.ink;
      ctx.fillRect(0.27, -0.1 - bob, 0.04, 0.04);
      ctx.restore();
    });
    // Somebody's umbrella, blown inside out, cartwheeling past twice an evening.
    R.mover((t) => {
      const tt = loopT(t);
      for (const start of [42, 132]) {
        const f = tt - start;
        if (f < 0 || f > 9.5) continue;
        const x = -0.8 + f * 1.95;
        return { x, y: 16.35 + Math.sin(f * 1.3) * 0.25, z: Math.abs(Math.sin(f * 2.6)) * 0.7 + 0.35, spin: f * 3.1 };
      }
      return { x: -99, y: -99, hide: true };
    }, (ctx, t, p) => {
      if (p.hide) return;
      shadow(ctx, p.x, p.y, 0.45, 0.15, 0.2);
      const [X, Y] = P(p.x, p.y, p.z);
      ctx.save();
      ctx.translate(X, Y);
      ctx.rotate(p.spin);
      // the canopy, cupped the wrong way, and its ribs sticking out
      ctx.beginPath();
      ctx.moveTo(-0.55, -0.1);
      ctx.quadraticCurveTo(0, 0.45, 0.55, -0.1);
      ctx.quadraticCurveTo(0, 0.12, -0.55, -0.1);
      paint(ctx, INK.oxblood, { dots: shade(INK.oxblood, 0.5), density: 0.2, lw: 0.035 });
      ctx.beginPath();
      for (const u of [-0.6, -0.3, 0.3, 0.6]) { ctx.moveTo(0, 0.1); ctx.lineTo(u, -0.18 - Math.abs(u) * 0.1); }
      ctx.moveTo(0, 0.15); ctx.lineTo(0, -0.55);
      ctx.arc(0.09, -0.55, 0.09, Math.PI, 0);
      ctx.lineWidth = 0.035;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
      ctx.restore();
    });

    // ---------- Pidge's car ----------
    // A plank he put under the wheel, and a spade, both no help at all.
    R.thing(11.5, 7.2, (ctx) => {
      poly(ctx, [[10.2, 6.75, 0.03], [11.6, 6.9, 0.05], [11.55, 7.25, 0.05], [10.15, 7.1, 0.03]]);
      paint(ctx, MAT.pine, { dots: shade(MAT.pine, 0.4), density: 0.15, lw: 0.03 });
    });
    R.thing(14.05, 6.6, (ctx, t) => car(ctx, t), { anim: true });
    // Tap the car and it parps (the one a first visit is shown).
    HORN = R.poke({ id: 'horn', teach: true, at: [12.4, 5.4, 1.1], r: 1.0, hold: 0.9, sound: 'horn', say: ['Still stuck.', 'Still very stuck.', 'He left the lights on, too.'] });
    R.thing(14.6, 7.6, (ctx) => {
      box(ctx, 14.55, 7.55, 0, 0.06, 0.06, 1.1, OAK, { flat: true });
      face(ctx, [[14.45, 7.58, 0.02], [14.75, 7.58, 0.02], [14.75, 7.58, -0.1], [14.6, 7.58, -0.2], [14.45, 7.58, -0.1]], MAT.silver, { lw: 0.025 });
      face(ctx, [[14.45, 7.58, 1.1], [14.75, 7.58, 1.1]], null, { lw: 0.06, stroke: OAK_D });
    });
    // Police tape round his own car, strung from the lamp post round to a
    // stake, until he ran out.
    R.thing(15.0, 3.5, (ctx, t) => {
      for (const [x, y] of [[10.3, 3.45], [15.0, 3.45], [15.0, 7.4]]) box(ctx, x - 0.04, y - 0.04, 0, 0.08, 0.08, 0.95, OAK, { flat: true, lw: 0.03 });
      const run = (a, b, ph) => {
        ctx.beginPath();
        for (let i = 0; i <= 12; i++) {
          const k = i / 12;
          const sag = Math.sin(k * Math.PI) * 0.18, flap = Math.sin(t * 5 + k * 6 + ph) * 0.05 * Math.sin(k * Math.PI);
          const [X, Y] = P(lerp(a[0], b[0], k), lerp(a[1], b[1], k), 0.85 - sag + flap);
          i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
        }
        ctx.lineWidth = 0.1;
        ctx.strokeStyle = GOLD;
        ctx.stroke();
        if (!Q.detail) return;
        ctx.setLineDash([0.12, 0.2]);
        ctx.lineWidth = 0.05;
        ctx.strokeStyle = C.ink;
        ctx.stroke();
        ctx.setLineDash([]);
      };
      run([10.3, 3.45], [15.0, 3.45], 0);
      run([15.0, 3.45], [15.0, 7.4], 1);
      // the end, blowing about
      const [eX, eY] = P(15.0, 7.4, 0.85);
      ctx.beginPath();
      ctx.moveTo(eX, eY);
      ctx.quadraticCurveTo(eX - 0.3, eY + 0.2 + Math.sin(t * 4) * 0.1, eX - 0.55 + Math.sin(t * 3) * 0.1, eY + 0.35);
      ctx.lineWidth = 0.1;
      ctx.strokeStyle = GOLD;
      ctx.stroke();
    }, { anim: true, depth: 18.45 });
    // The headlamps' glow: on all evening, even when the house goes dark.
    for (const v of [FAR + 0.15, NEAR - 0.15]) {
      R.light({
        at: [14.1, v, 0.85], r: 1.8, color: GOLD, k: (t) => headlamps(loopT(t)),
        draw: (ctx, t, k) => {
          const [pX, pY] = P(RW, NEAR, 0);
          const [X0, Y0] = P(13.9, v, 1.02 - SINK);
          // (in the tilted car's frame)
          const dx = X0 - pX, dy = Y0 - pY, c = Math.cos(TILT), s = Math.sin(TILT);
          const X = pX + dx * c - dy * s, Y = pY + dx * s + dy * c;
          ctx.beginPath();
          ctx.ellipse(X + 0.02, Y, 0.12, 0.15, 0, 0, TAU);
          ctx.fillStyle = k > 0.5 ? LIT : shade(GOLD, 0.4);
          ctx.fill();
        },
      });
    }
    // The back wheel's hubcap, when it's off the car.
    R.mover((t) => {
      const h = hubcap(loopT(t));
      return h.on || h.gone ? { x: -99, y: -99, hide: true } : h;
    }, (ctx, t, p) => {
      if (p.hide) return;
      shadow(ctx, p.x, p.y, 0.24, 0.09, 0.3);
      upright(ctx, p.x, p.y, p.z + 0.02, 0.21, p.dx, p.dy);
      paint(ctx, MAT.silver, { lw: 0.035 });
      upright(ctx, p.x, p.y, p.z + 0.02, 0.08, p.dx, p.dy);
      paint(ctx, shade(MAT.silver, 0.35), { stroke: false });
      // a glint, going round as it rolls
      const [X, Y] = P(p.x, p.y, p.z + 0.02);
      const a = p.spin || 0;
      ctx.fillStyle = INK.bone;
      ctx.fillRect(X + Math.cos(a) * 0.11 - 0.03, Y + Math.sin(a) * 0.11 - 0.03, 0.06, 0.06);
    });
    // Pidge, splattered: mud lands on him while the wheel spins, and stays
    // on him until he's back indoors.
    const SPOTS = [[70.3, 0.14, -1.25], [70.8, -0.1, -1.0], [71.4, 0.18, -0.9], [72.2, 0.02, -1.45], [73.0, -0.16, -1.3], [73.9, 0.12, -0.45], [74.8, 0.2, -2.25]];
    R.mover((t) => {
      const tt = loopT(t);
      const p = tt > SPOTS[0][0] && tt < 92 ? outHere(pidge, t) : null;
      return p || { x: -99, y: -99, hide: true };
    }, (ctx, t, p) => {
      if (p.hide || !Q.detail) return;
      const tt = loopT(t);
      const [X, Y] = P(p.x, p.y, p.z);
      ctx.fillStyle = MUD;
      for (const [at, dx, dy] of SPOTS) {
        if (tt < at) continue;
        ctx.beginPath();
        ctx.ellipse(X + dx, Y + dy, 0.08, 0.06, dx * 3, 0, TAU);
        ctx.ellipse(X + dx + 0.07, Y + dy + 0.05, 0.035, 0.03, 0, 0, TAU);
        ctx.fill();
      }
    }, { bias: 0.05 });

    // Mud flying off the spinning wheel, exhaust, the bang and the horn.
    R.air((ctx, t) => {
      const tt = loopT(t);
      if (revving(tt) && Q.detail) {
        // clods of mud, thrown back off the wheel (at Pidge, as it happens)
        const [sx, sy, sz] = [RW - 0.3, NEAR + 0.1, 0.15];
        ctx.lineWidth = 0.03;
        ctx.strokeStyle = C.ink;
        particles(t, 11, 0.7, (k, r) => {
          const vx = -1.3 - r() * 1.7, vy = (r() - 0.4) * 1.2, vz = 1.6 + r() * 1.8, T = k * 0.7;
          const z = sz + vz * T - 3.6 * T * T;
          if (z < 0) return;
          const [X, Y] = P(sx + vx * T, sy + vy * T, z);
          const s = 0.09 + r() * 0.08;
          ctx.beginPath();
          ctx.ellipse(X, Y, s, s * 0.75, r() * 3, 0, TAU);
          ctx.fillStyle = r() > 0.5 ? MUD : MUD_D;
          ctx.fill();
          ctx.stroke();
        }, 51);
        // speed lines off the wheel
        const [wX, wY] = P(RW, NEAR + 0.1, WR - SINK);
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const f = (t * 5 + i / 3) % 1;
          ctx.moveTo(wX - 0.55 - f * 0.4, wY - 0.3 + i * 0.22);
          ctx.lineTo(wX - 0.85 - f * 0.4, wY - 0.3 + i * 0.22 + 0.05);
        }
        ctx.lineWidth = 0.04;
        ctx.strokeStyle = alpha(INK.bone, 0.7);
        ctx.stroke();
        // and sooty exhaust
        particles(t, 4, 1.3, (k) => {
          const [X, Y] = P(10.45 - k * 1.3, 5.95 - k * 0.4, 0.3 + k * 1.2);
          ctx.beginPath();
          ctx.arc(X, Y, 0.14 + k * 0.4, 0, TAU);
          ctx.fillStyle = alpha(C.ink, 0.55 * (1 - k));
          ctx.fill();
        }, 52);
      }
      if (tt >= BANG && tt < BANG + 1.4) {
        const k = (tt - BANG) / 1.4;
        const [X, Y] = P(10.3, 5.95, 0.35);
        ctx.beginPath();
        ctx.arc(X - k * 0.6, Y - k * 0.5, 0.2 + k * 0.6, 0, TAU);
        ctx.fillStyle = alpha(C.ink, 0.6 * (1 - k));
        ctx.fill();
        words(ctx, 'y', 5.95, 9.9, 1.4 + k * 0.6, 'BANG!', 0.42, alpha(GOLD, 1 - k * k));
      }
      if (tt >= HONK && tt < HONK + 1.3) {
        const k = (tt - HONK) / 1.3;
        words(ctx, 'y', 5.4, 14.8, 2.0 + k * 0.5, 'HONK!', 0.42, alpha(INK.bone, 1 - k * k));
      }
      // Tapped: the horn, feebly.
      const hk = HORN ? HORN.k() : 0;
      if (hk > 0.05) words(ctx, 'y', 5.4, 14.6, 1.7 + hk * 0.35, 'parp.', 0.34, alpha(INK.bone, hk));
    });

    // ---------- The crypt ----------
    R.thing(CR.x1, CR.y1, (ctx) => crypt(ctx));
    R.thing(CR.x1, CR.y1 + 0.02, (ctx, t) => cryptDoor(ctx, t), { anim: true });
    R.thing(13.75, 12.3, (ctx, t) => crow(ctx, t), { anim: true, depth: 30.6 });
    // The candle in a lantern by its door (a candle: it stays lit in the dark).
    R.light({
      at: [12.75, 15.25, 1.3], r: 1.9, color: GOLD, k: house.flicker(7),
      draw: (ctx, t, k) => {
        face(ctx, [[12.75, CFY + 0.05, 1.75], [12.75, CFY + 0.3, 1.75]], null, { lw: 0.04 });
        const [X, Y] = P(12.75, CFY + 0.3, 1.1);
        ctx.beginPath();
        ctx.rect(X - 0.12, Y - 0.42, 0.24, 0.42);
        paint(ctx, alpha(LIT, 0.5 + k * 0.4), { lw: 0.03 });
        ctx.beginPath();
        ctx.ellipse(X, Y - 0.22, 0.04, 0.08 * (0.8 + k * 0.3), 0, 0, TAU);
        ctx.fillStyle = GOLD;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(X - 0.16, Y - 0.42); ctx.lineTo(X + 0.16, Y - 0.42); ctx.lineTo(X, Y - 0.6);
        ctx.closePath();
        paint(ctx, C.ink, { lw: 0.02 });
      },
    });
    // Two small headstones for the family's pets (Rex is mostly upstairs, in
    // the taxidermy room), and a plot that's been reserved.
    R.thing(10.15, 13.6, (ctx) => headstone(ctx, 10.15, 13.55, 0.62, 0.8, [['REX', 0.17, 0.5], ['(MOSTLY)', 0.09, 0.32]]));
    R.thing(10.7, 15.2, (ctx) => {
      poly(ctx, blob(10.7, 14.95, 0.36, 0.3, 71, 12, 0.1, 0));
      paint(ctx, NIGHT.earth, { dots: NIGHT.earthDark, density: 0.3, lw: 0.03 });
      headstone(ctx, 10.7, 14.62, 0.7, 0.72, [['RESERVED', 0.12, 0.42]]);
    });
    // The gargoyle's spout, and bats.
    R.air((ctx, t) => {
      const tt = loopT(t);
      // the gargoyle, crouched on the front corner, spouting the roof's water
      const [gX, gY] = P(15.45, 15.1, 2.3);
      const grot = shade(CRYPT_STONE, 0.28), line = { lw: 0.03 };
      ctx.beginPath();
      ctx.ellipse(gX + 0.02, gY - 0.08, 0.2, 0.13, 0.2, 0, TAU); // hunched back
      paint(ctx, grot, line);
      ctx.beginPath(); // horns
      ctx.moveTo(gX + 0.14, gY - 0.3); ctx.quadraticCurveTo(gX + 0.02, gY - 0.42, gX - 0.04, gY - 0.46); ctx.lineTo(gX + 0.18, gY - 0.34);
      ctx.moveTo(gX + 0.3, gY - 0.31); ctx.quadraticCurveTo(gX + 0.36, gY - 0.45, gX + 0.46, gY - 0.5); ctx.lineTo(gX + 0.34, gY - 0.3);
      paint(ctx, grot, line);
      ctx.beginPath(); // the head, leaning out
      ctx.arc(gX + 0.24, gY - 0.2, 0.14, 0, TAU);
      paint(ctx, grot, { dots: shade(grot, 0.5), density: 0.25, lw: 0.03 });
      ctx.beginPath(); // a mouth, wide open
      ctx.ellipse(gX + 0.33, gY - 0.12, 0.07, 0.045, 0.35, 0, TAU);
      ctx.fillStyle = C.ink;
      ctx.fill();
      ctx.fillStyle = GOLD; // eyes (glass, of course)
      ctx.fillRect(gX + 0.19, gY - 0.27, 0.04, 0.04);
      ctx.fillRect(gX + 0.28, gY - 0.26, 0.04, 0.04);
      if (Q.detail) {
        ctx.beginPath();
        const w = Math.sin(t * 9) * 0.03;
        ctx.moveTo(gX + 0.36, gY - 0.11);
        ctx.quadraticCurveTo(gX + 0.78, gY - 0.1, gX + 0.82 + w, gY + 2.45);
        ctx.lineWidth = 0.07;
        ctx.strokeStyle = alpha(INK.bone, 0.6);
        ctx.stroke();
        const f = (t * 3) % 1;
        const [sX, sY] = [gX + 0.82, gY + 2.45];
        ctx.beginPath();
        ctx.ellipse(sX, sY, 0.1 + f * 0.25, 0.04 + f * 0.1, 0, 0, TAU);
        ctx.lineWidth = 0.03;
        ctx.strokeStyle = alpha(INK.bone, 0.7 * (1 - f));
        ctx.stroke();
      }
      // three bats that live in the roof, circling
      for (let i = 0; i < 3; i++) {
        const a = t * (0.7 + i * 0.15) + i * 2.1;
        const [X, Y] = P(13.75 + Math.cos(a) * (1.6 + i * 0.4), 13 + Math.sin(a) * (1.2 + i * 0.3), 4.6 + i * 0.6 + Math.sin(t * 2 + i) * 0.2);
        bat(ctx, X, Y, t, 0.6, i);
      }
      // and at midnight, the rest of them, out of the door
      const m = tt - MIDNIGHT;
      if (m > 0.2 && m < 7) {
        for (let i = 0; i < 6; i++) {
          const k = clamp((m - 0.2 - i * 0.25) / 5);
          if (k <= 0) continue;
          const a = -0.9 + i * 0.35;
          const d = k * 9;
          const [X, Y] = P(13.9 + Math.cos(a) * d * 0.4, 15.2 + Math.sin(a) * d * 0.3 + d * 0.1, 1.2 + d * 0.9 + Math.sin(k * 20 + i) * 0.3);
          bat(ctx, X, Y, t, 0.7, i * 1.3);
        }
      }
    });

    // ---------- The gardener's flare ----------
    // At 150 he gives up and sends up a distress flare. From a maze he could
    // step over.
    const FLARE = 150, FROM = [3.4, 11.1, 1.9], UP = 7.5;
    const flareAt = (tt) => {
      const f = tt - FLARE;
      if (f < 0 || f > 11) return null;
      if (f < 1.3) { const k = f / 1.3; return { rising: true, k, x: FROM[0] - k * 0.4, y: FROM[1] - k * 0.3, z: FROM[2] + (1 - (1 - k) * (1 - k)) * UP }; }
      const k = (f - 1.3) / 9.7;
      return { rising: false, k, x: FROM[0] - 0.4 + k * 2.6, y: FROM[1] - 0.3 - k * 1.2, z: FROM[2] + UP - k * 5.5 };
    };
    const flareK = (t) => { const p = flareAt(loopT(t)); return !p || p.rising ? 0 : (1 - p.k * p.k) * (0.75 + 0.25 * hash(Math.floor(t * 14), 9)); };
    // Its light: a red glow round it, and red on the maze underneath.
    R.light({ at: (t) => { const p = flareAt(loopT(t)); return p ? [p.x, p.y, p.z] : [0, 0, -50]; }, r: 2.6, color: C.coral, k: flareK });
    R.light({ at: (t) => { const p = flareAt(loopT(t)); return p ? [p.x, p.y, 0.4] : [0, 0, -50]; }, r: 6.5, color: C.coral, k: (t) => flareK(t) * 0.9 });
    R.air((ctx, t) => {
      const tt = loopT(t);
      const p = flareAt(tt);
      if (!p) return;
      const f = tt - FLARE;
      // the smoke trail it left going up
      if (f < 5) {
        ctx.beginPath();
        for (let i = 0; i <= 10; i++) {
          const k = Math.min(1, f / 1.3) * (i / 10);
          const [X, Y] = P(FROM[0] - k * 0.4 + Math.sin(i + f) * 0.05 * f, FROM[1] - k * 0.3, FROM[2] + (1 - (1 - k) * (1 - k)) * UP);
          i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
        }
        ctx.lineWidth = 0.12 + f * 0.05;
        ctx.strokeStyle = alpha(SMOKE, 0.45 * (1 - f / 5));
        ctx.stroke();
      }
      const [X, Y] = P(p.x, p.y, p.z);
      if (!p.rising) {
        // a little parachute
        ctx.beginPath();
        ctx.arc(X, Y - 0.55, 0.32, Math.PI, 0);
        ctx.closePath();
        paint(ctx, alpha(INK.bone, 0.8), { lw: 0.025 });
        ctx.beginPath();
        ctx.moveTo(X - 0.32, Y - 0.55); ctx.lineTo(X, Y); ctx.lineTo(X + 0.32, Y - 0.55);
        ctx.lineWidth = 0.015;
        ctx.strokeStyle = alpha(INK.bone, 0.7);
        ctx.stroke();
        // sparks dropping off it
        particles(t, 6, 0.8, (k, r) => {
          ctx.fillStyle = alpha(C.coral, 1 - k);
          ctx.fillRect(X + (r() - 0.5) * 0.3, Y + k * 1.2, 0.05, 0.05);
        }, 53);
      }
      // the flare itself: a spiky red star with a white-hot middle
      const s = p.rising ? 0.5 : 1 + Math.sin(t * 23) * 0.12;
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU + t * 2, r = (i % 2 ? 0.1 : 0.3) * s;
        i ? ctx.lineTo(X + Math.cos(a) * r, Y + Math.sin(a) * r) : ctx.moveTo(X + Math.cos(a) * r, Y + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fillStyle = C.coral;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(X, Y, 0.09 * s, 0, TAU);
      ctx.fillStyle = INK.bone;
      ctx.fill();
      if (!p.rising && f < 5 && Q.detail) speech(ctx, p.x, p.y, p.z + 0.75, 'HELP!', { size: 0.42, color: INK.oxblood });
    });

    // ---------- The rain ----------
    // The sky's rain stays out of the area you're in, so the grounds bring
    // their own when you're here. (Not in the far-off picture of the area:
    // the sky's rain already falls on it there.)
    R.air((ctx, t) => {
      if (Q.own) return;
      rain(ctx, t, {
        area: [0, 0.3, 16.5, 16.5], n: 32, top: 13, seed: 23, color: RAIN,
        skip: (x, y) => (x > 11.9 && x < 15.6 && y > 10.9 && y < 15.1) || (x > 10.6 && x < 14 && y > 4.4 && y < 6.4),
      });
    });
  },
};
