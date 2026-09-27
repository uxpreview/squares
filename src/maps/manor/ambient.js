// Around the manor: the night it's printed on, the grounds it stands in and
// the storm over it. The backdrop is drawn under the rooms: the plate, the
// moon and the clouds, the lawn (cut open on two sides like a slice of cake,
// which is where you see the cellar, and where the family's old pets are
// buried), and everything that stands behind or beside the house: the crooked
// tower, the twisted chimneys, the storm trees, the greenhouse, the garden,
// and the drive the storm has cut. The sky is drawn over the rooms: the rain
// in front of the house, the bats, the lightning and its flash, and the
// victory lap.
//
// Both are drawn every frame with nothing cached, so they stay cheap: flat
// shapes, one path for anything repeated, small things only when Q.detail is
// on, and nothing drawn that's off screen.
import { ZK } from '../../engine/iso.js';
import { C, Q, box, face, poly, paint, alpha, mix, shade, hash, dots, glow, disc } from '../../engine/art.js';
import { rain, bolt } from '../../engine/weather.js';
import { geeseV } from '../shared.js';
import { HOUSE, LAWN, DEPTH } from './plan.js';
import { INK, NIGHT, MAT, storm, lightsOut } from './style.js';

const P3 = (x, y, z = 0) => [x - y, (x + y) / 2 - z * ZK];

// The picture, in world iso units: what the overview frames and the camera
// may pan across. The night itself runs past it to every edge of the screen.
export const PLATE = [-74, -52, 66, 68];

const [LX0, LY0, LX1, LY1] = LAWN;
const [HX0, HY0, HX1, HY1] = HOUSE;
const inHouse = (x, y) => x >= HX0 && x <= HX1 && y >= HY0 && y <= HY1;
const behind = (x, y) => x < HX0 || y < HY0;

// The outside's inks: the level's six, mixed for a night in the open. Things
// facing the moon (the screen's right) print a step lighter.
const OUT = {
  moon: INK.bone,
  crater: mix(INK.bone, INK.stormNavy, 0.16),
  halo: mix(INK.bone, INK.stormNavy, 0.6),
  cloud: mix(INK.stormNavy, INK.deepPlum, 0.38),
  cloudRim: mix(INK.deepPlum, INK.bone, 0.42),
  wisp: mix(INK.stormNavy, INK.deepPlum, 0.25),
  haze: mix(INK.stormNavy, INK.bone, 0.2),
  stone: mix(INK.bone, INK.stormNavy, 0.5),
  stoneShade: mix(INK.bone, INK.stormNavy, 0.68),
  stoneTop: mix(INK.bone, INK.stormNavy, 0.4),
  slate: mix(INK.deepPlum, INK.stormNavy, 0.3),
  slateLit: mix(INK.deepPlum, INK.bone, 0.12),
  brick: mix(INK.oxblood, INK.stormNavy, 0.38),
  brickLit: mix(INK.oxblood, INK.bone, 0.18),
  pot: mix(INK.oxblood, INK.candleGold, 0.35),
  bark: mix(INK.deepPlum, INK.stormNavy, 0.2),
  barkLit: mix(INK.deepPlum, INK.bone, 0.3),
  root: mix(INK.deepPlum, INK.bone, 0.45),
  clod: mix(mix(INK.oxblood, INK.deepPlum, 0.5), INK.stormNavy, 0.3),
  iron: mix(INK.verdigris, INK.stormNavy, 0.25),
  dark: mix(INK.stormNavy, C.black, 0.55),
  hedge: NIGHT.hedge,
  owl: mix(INK.oxblood, INK.stormNavy, 0.35),
  smoke: mix(INK.stormNavy, INK.bone, 0.42),
  water: mix(INK.bone, INK.verdigris, 0.3),
  leaf: mix(MAT.leaf, INK.stormNavy, 0.35),
  glass: mix(MAT.glass, INK.stormNavy, 0.3),
  mud: shade(NIGHT.mud, 0.2),
};

// The visible world rect this frame (fx.view), so what's off screen is skipped.
let VIEW = null;
const seen = (X0, Y0, X1, Y1) => !VIEW || !(X1 < VIEW[0] || X0 > VIEW[2] || Y1 < VIEW[1] || Y0 > VIEW[3]);
// Where the night is printed: everywhere you can see, and at least the plate.
const sheet = () => (VIEW && VIEW.every(Number.isFinite)
  ? [Math.min(PLATE[0], VIEW[0] - 2), Math.min(PLATE[1], VIEW[1] - 2), Math.max(PLATE[2], VIEW[2] + 2), Math.max(PLATE[3], VIEW[3] + 2)]
  : PLATE);
// Copies of a pattern that repeats every `span` across the sheet, for things
// strung along the sky (the cloud bank, the wisps): offsets to draw it at.
function repeats(from, to, span) {
  const [S0, , S1] = sheet();
  const k0 = Math.floor((S0 - to) / span), k1 = Math.ceil((S1 - from) / span);
  if (!(k1 - k0 < 40)) return [0]; // a view that wide is nothing we'd draw; don't try
  const out = [];
  for (let k = k0; k <= k1; k++) out.push(k * span);
  return out;
}

// A line between two world points, added to the current path.
function seg(ctx, a, b) {
  const [X0, Y0] = P3(a[0], a[1], a[2]);
  const [X1, Y1] = P3(b[0], b[1], b[2]);
  ctx.moveTo(X0, Y0);
  ctx.lineTo(X1, Y1);
}

// Small print for signs and stones, at (X, Y) in whatever space we're in.
function tiny(ctx, text, X, Y, size, color) {
  const k = 40;
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(1 / k, 1 / k);
  ctx.font = `700 ${size * k}px "Rethink Sans", system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// Draw flat on something facing the front (+y: a headstone, the front cut)
// or the right (+x: the right-hand cut), as if on paper: inside draw(), x runs
// to the right along it and y runs down, in world units, from (x, y, z).
function flat(ctx, side, x, y, z, draw) {
  const [X, Y] = P3(x, y, z);
  ctx.save();
  ctx.transform(1, side === 'front' ? 0.5 : -0.5, 0, 1, X, Y);
  draw(ctx);
  ctx.restore();
}
// The same on the cut faces: u runs along the face (x on the front, y on the right).
const onCut = (ctx, side, u, z, draw) => flat(ctx, side, side === 'front' ? u : LX1, side === 'front' ? LY1 : u, z, draw);

// Running water along a path: a soft stream, and bright dashes running down it.
// o: { color, a (its opacity), speed }
function stream(ctx, path, lw, t, o = {}) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  path(ctx);
  ctx.strokeStyle = alpha(o.color || OUT.water, o.a ?? 0.4);
  ctx.lineWidth = lw;
  ctx.stroke();
  if (Q.detail) {
    ctx.setLineDash([lw * 1.4, lw * 2.4]);
    ctx.lineDashOffset = -t * (o.speed || 8);
    ctx.strokeStyle = alpha(INK.bone, 0.65);
    ctx.lineWidth = lw * 0.35;
    ctx.stroke();
  }
  ctx.restore();
}

// ---------- The tower ----------
// At the back corner: the tallest thing, and what the level is known by. It
// leans a little (it's old), and its spire leans a little more.
const T = { x: -6.8, y: -6.8, w: 6, h: 21, lean: [0.4, -0.4] };
const PARAPET = T.h + 1.2;
const SPIRE = { z: 31.6, tip: [0.7, -0.4] };
const TP = (x, y, z) => {
  const k = Math.min(z, T.h) / T.h;
  return [x + T.lean[0] * k, y + T.lean[1] * k, z];
};
const APEX = [T.x + T.w / 2 + T.lean[0] + SPIRE.tip[0], T.y + T.w / 2 + T.lean[1] + SPIRE.tip[1], SPIRE.z];
// The lightning rod's tip: where the big strikes land.
const ROD = P3(APEX[0], APEX[1], APEX[2] + 2.9);

// The tower's windows: [face, from, to (along it), bottom, top (the arch's tip), kind].
// 'lit' goes out with the house's lights, 'candle' doesn't, and in 'goose'
// someone is looking out. Nobody knows how it got up there.
const TWIN = [
  ['left', -5.7, -4.5, 12.2, 15.4, 'lit'],
  ['left', -3.1, -1.9, 12.2, 15.4, 'candle'],
  ['right', -5.7, -4.5, 12.2, 15.4, 'dark'],
  ['right', -3.1, -1.9, 12.2, 15.4, 'lit'],
  ['right', -4.5, -3.1, 16.6, 19.6, 'goose'],
];

function tower(ctx, t) {
  const { x, y, w, h } = T;
  const x2 = x + w, y2 = y + w;
  const [lx, ly] = T.lean;
  const [RX, RY] = ROD;
  if (!seen(RX - 14, RY - 4, RX + 14, 4)) return;
  // The shaft: the shadowed face on the left, the moonlit one on the right.
  face(ctx, [TP(x, y2, 0), TP(x2, y2, 0), TP(x2, y2, h), TP(x, y2, h)], OUT.stoneShade, { dots: shade(OUT.stoneShade, 0.45), density: 0.22 });
  face(ctx, [TP(x2, y, 0), TP(x2, y2, 0), TP(x2, y2, h), TP(x2, y, h)], OUT.stone, { dots: shade(OUT.stone, 0.42), density: 0.14 });
  if (Q.detail) {
    // String courses, and the corner stones up the front edge.
    ctx.beginPath();
    for (const z of [7.6, 11.4, 16.1, 20.2]) {
      seg(ctx, TP(x, y2, z), TP(x2, y2, z));
      seg(ctx, TP(x2, y2, z), TP(x2, y, z));
    }
    for (let z = 0.9, i = 0; z < h - 1; z += 0.9, i++) {
      const u = i % 2 ? 0.9 : 0.55;
      seg(ctx, TP(x2 - u, y2, z), TP(x2, y2, z));
      seg(ctx, TP(x2, y2, z), TP(x2, y2 - (i % 2 ? 0.55 : 0.9), z));
    }
    ctx.strokeStyle = shade(OUT.stoneShade, 0.35);
    ctx.lineWidth = 0.06;
    ctx.stroke();
  }
  // The windows, lit gold (until the lights go out: the candle stays).
  const out = lightsOut(t);
  const lit = out ? mix(INK.candleGold, INK.stormNavy, 0.72) : INK.candleGold;
  const flick = 0.72 + 0.28 * hash(7, Math.floor(t * 11));
  for (const [side, u0, u1, z0, z1, kind] of TWIN) {
    const fill = kind === 'dark' ? OUT.dark : kind === 'candle' ? INK.candleGold : lit;
    lancet(ctx, side, u0, u1, z0, z1, fill);
    if (kind === 'goose') gooseInWindow(ctx, side, (u0 + u1) / 2, z0, t);
  }
  // A rose window high on the left face.
  rose(ctx, x + 3.1, y2, 18.2, 0.85, lit);
  // Their glow on the night (a cached sprite, not a gradient per frame).
  glow(ctx, ...TP(x + 2.5, y2 + 0.3, 13.8), 3.6, INK.candleGold, 0.34 * flick);
  if (!out) {
    glow(ctx, ...TP(x2 + 0.3, y + 4, 14), 3.2, INK.candleGold, 0.3);
    glow(ctx, ...TP(x2 + 0.3, y + 3, 18.2), 3, INK.candleGold, 0.3);
  }
  // Gargoyles at the corners under the parapet, spouting the rain.
  gargoyle(ctx, ...P3(...TP(x, y2, h - 0.5)), -1, t);
  gargoyle(ctx, ...P3(...TP(x2, y, h - 0.5)), 1, t);

  // The parapet, overhanging on corbels.
  const o = 0.35, px = x - o + lx, py = y - o + ly, pw = w + 2 * o;
  if (Q.detail) {
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const u = 0.3 + i * (pw - 0.6) / 8;
      poly(ctx, [[px + u - 0.12, py + pw, h], [px + u + 0.12, py + pw, h], [px + u + 0.06, py + pw - o, h - 0.45], [px + u - 0.06, py + pw - o, h - 0.45]]);
      ctx.fillStyle = OUT.dark;
      ctx.fill();
      poly(ctx, [[px + pw, py + u - 0.12, h], [px + pw, py + u + 0.12, h], [px + pw - o, py + u + 0.06, h - 0.45], [px + pw - o, py + u - 0.06, h - 0.45]]);
      ctx.fill();
    }
  }
  face(ctx, [[px, py + pw, h], [px + pw, py + pw, h], [px + pw, py + pw, PARAPET], [px, py + pw, PARAPET]], OUT.stoneShade, { dots: shade(OUT.stoneShade, 0.45), density: 0.22 });
  face(ctx, [[px + pw, py, h], [px + pw, py + pw, h], [px + pw, py + pw, PARAPET], [px + pw, py, PARAPET]], OUT.stone);
  face(ctx, [[px, py, PARAPET], [px + pw, py, PARAPET], [px + pw, py + pw, PARAPET], [px, py + pw, PARAPET]], OUT.stoneTop);
  merlons(ctx, px, py, pw, false);
  pinnacle(ctx, px + 0.2, py + 0.2);

  // The spire, in slates, with a lit dormer on each side we can see.
  const s0 = 0.6, sx = x + s0 + lx, sy = y + s0 + ly, sw = w - 2 * s0;
  const c0 = [sx, sy, PARAPET], c1 = [sx + sw, sy, PARAPET], c2 = [sx + sw, sy + sw, PARAPET], c3 = [sx, sy + sw, PARAPET];
  face(ctx, [c0, c1, APEX], OUT.slate);
  face(ctx, [c3, c0, APEX], OUT.slate);
  face(ctx, [c3, c2, APEX], OUT.slate, { dots: shade(OUT.slate, 0.5), density: 0.26 });
  face(ctx, [c1, c2, APEX], OUT.slateLit, { dots: shade(OUT.slateLit, 0.45), density: 0.16 });
  if (Q.detail) {
    ctx.beginPath();
    for (let k = 1; k < 10; k++) {
      const f = k / 10;
      const L = (c) => [c[0] + (APEX[0] - c[0]) * f, c[1] + (APEX[1] - c[1]) * f, c[2] + (APEX[2] - c[2]) * f];
      seg(ctx, L(c3), L(c2));
      seg(ctx, L(c2), L(c1));
    }
    ctx.strokeStyle = alpha(C.ink, 0.5);
    ctx.lineWidth = 0.05;
    ctx.stroke();
  }
  dormer(ctx, c3, c2, 'left', lit);
  dormer(ctx, c1, c2, 'right', lit);
  merlons(ctx, px, py, pw, true);
  pinnacle(ctx, px + 0.2, py + pw - 0.2);
  pinnacle(ctx, px + pw - 0.2, py + 0.2);
  pinnacle(ctx, px + pw - 0.2, py + pw - 0.2);
  weathervane(ctx, t);
}

// A pointed (lancet) window on the shaft's left face (y = y2, u along x) or
// right face (x = x2, u along y), with its tracery.
function lancet(ctx, side, u0, u1, z0, z1, fill) {
  const s = u1 - u0, um = (u0 + u1) / 2, zs = z1 - s * 0.85;
  const at = side === 'left' ? (u, z) => TP(u, T.y + T.w, z) : (u, z) => TP(T.x + T.w, u, z);
  const pts = [[u0, z0], [u1, z0], [u1, zs], [u1 - s * 0.1, zs + s * 0.42], [u1 - s * 0.28, zs + s * 0.7], [um, z1], [u0 + s * 0.28, zs + s * 0.7], [u0 + s * 0.1, zs + s * 0.42], [u0, zs]];
  face(ctx, pts.map(([u, z]) => at(u, z)), fill, { lw: 0.07 });
  if (Q.detail) {
    ctx.beginPath();
    seg(ctx, at(um, z0), at(um, zs + s * 0.3));
    seg(ctx, at(u0, zs - 0.4), at(u1, zs - 0.4));
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.05;
    ctx.stroke();
  }
}

// A round window with a quatrefoil, on the shaft's left face.
function rose(ctx, x, y, z, r, fill) {
  flat(ctx, 'front', ...TP(x, y, z), (g) => {
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    paint(g, fill, { lw: 0.08 });
    if (!Q.detail) return;
    g.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      g.moveTo(Math.cos(a) * r * 0.42 + r * 0.3, Math.sin(a) * r * 0.42);
      g.arc(Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42, r * 0.3, 0, Math.PI * 2);
    }
    g.strokeStyle = C.ink;
    g.lineWidth = 0.05;
    g.stroke();
  });
}

// The goose, in the tower, looking out. It turns its head now and then.
function gooseInWindow(ctx, side, u, z, t) {
  const p = side === 'left' ? TP(u, T.y + T.w, z) : TP(T.x + T.w, u, z);
  const look = Math.sin(t * 0.45) > 0.6 ? -1 : 1;
  flat(ctx, side, ...p, (g) => {
    g.fillStyle = INK.stormNavy;
    g.beginPath();
    g.ellipse(0.05, -0.12, 0.42, 0.2, 0, Math.PI, 0);
    g.fill();
    g.beginPath();
    g.moveTo(0.1, -0.2);
    g.quadraticCurveTo(0.22 * look, -0.7, 0.02 * look, -1.05);
    g.lineWidth = 0.16;
    g.strokeStyle = INK.stormNavy;
    g.stroke();
    g.beginPath();
    g.arc(0.02 * look, -1.1, 0.13, 0, Math.PI * 2);
    g.moveTo(0.1 * look, -1.16);
    g.lineTo(0.36 * look, -1.08);
    g.lineTo(0.1 * look, -1.02);
    g.fill();
  });
}

// A little gabled dormer standing on a face of the spire, lit.
function dormer(ctx, a, b, side, lit) {
  const f = 0.27;
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, a[2]];
  const p = [m[0] + (APEX[0] - m[0]) * f, m[1] + (APEX[1] - m[1]) * f, m[2] + (APEX[2] - m[2]) * f];
  const at = side === 'left' ? (u, z) => [p[0] + u, p[1] + 0.25, p[2] + z] : (u, z) => [p[0] + 0.25, p[1] - u, p[2] + z];
  face(ctx, [at(-0.55, -0.5), at(0.55, -0.5), at(0.55, 0.5), at(0, 1.15), at(-0.55, 0.5)], side === 'left' ? OUT.slate : OUT.slateLit, { lw: 0.05 });
  face(ctx, [at(-0.25, -0.35), at(0.25, -0.35), at(0.25, 0.35), at(0, 0.62), at(-0.25, 0.35)], lit, { lw: 0.04 });
}

// Battlements along the parapet's far edges (drawn before the spire) or near ones.
function merlons(ctx, px, py, pw, near) {
  const m = 0.62, n = 5, step = (pw - m) / (n - 1), d = 0.32, mh = 0.8;
  const o = { left: OUT.stoneShade, right: OUT.stone, top: OUT.stoneTop, flat: true, lw: 0.05 };
  for (let i = 0; i < n; i++) {
    const u = i * step;
    if (near) {
      box(ctx, px + pw - d, py + u, PARAPET, d, m, mh, OUT.stone, o);
      box(ctx, px + u, py + pw - d, PARAPET, m, d, mh, OUT.stone, o);
    } else {
      box(ctx, px + u, py, PARAPET, m, d, mh, OUT.stone, o);
      box(ctx, px, py + u, PARAPET, d, m, mh, OUT.stone, o);
    }
  }
}

// A thin stone spike at a corner of the parapet, with a knob on top.
function pinnacle(ctx, x, y) {
  const [X, Y] = P3(x, y, PARAPET + 0.8);
  const Yt = Y - 2.3 * ZK;
  ctx.beginPath();
  ctx.moveTo(X - 0.3, Y);
  ctx.lineTo(X, Yt);
  ctx.lineTo(X + 0.3, Y);
  ctx.closePath();
  paint(ctx, OUT.slateLit, { lw: 0.05 });
  ctx.beginPath();
  ctx.arc(X, Yt, 0.14, 0, Math.PI * 2);
  paint(ctx, OUT.stone, { lw: 0.04 });
}

// A stone beast under the parapet, rain pouring out of its mouth. dir: -1 left, 1 right.
function gargoyle(ctx, X, Y, dir, t) {
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(dir, 1);
  ctx.beginPath();
  ctx.moveTo(0, -0.42);
  ctx.lineTo(0.5, -0.58);
  ctx.lineTo(0.98, -0.48);
  ctx.lineTo(1.06, -0.84);
  ctx.lineTo(1.22, -0.46);
  ctx.lineTo(1.66, -0.34);
  ctx.lineTo(1.74, -0.14);
  ctx.lineTo(1.46, -0.08);
  ctx.lineTo(1.62, 0.06);
  ctx.lineTo(1.18, 0.12);
  ctx.lineTo(0.88, 0.28);
  ctx.lineTo(0.72, 0.5);
  ctx.lineTo(0.5, 0.3);
  ctx.lineTo(0, 0.3);
  ctx.closePath();
  paint(ctx, OUT.stone, { lw: 0.05 });
  if (Q.detail) {
    ctx.beginPath();
    ctx.arc(1.26, -0.28, 0.06, 0, Math.PI * 2);
    ctx.fillStyle = C.ink;
    ctx.fill();
  }
  ctx.restore();
  const mx = X + dir * 1.5, my = Y;
  stream(ctx, (g) => {
    g.moveTo(mx, my);
    g.quadraticCurveTo(mx + dir * 1.9, my - 0.3, mx + dir * 2.4, my + 7);
  }, 0.24, t, { a: 0.45, speed: 9 });
}

// The rod, and a weathervane goose on it that turns in the wind and spins when
// the lightning hits.
function weathervane(ctx, t) {
  const [ax, ay, az] = APEX;
  const [X0, Y0] = P3(ax, ay, az);
  ctx.beginPath();
  ctx.moveTo(X0, Y0);
  ctx.lineTo(ROD[0], ROD[1]);
  const zc = az + 1.1;
  seg(ctx, [ax - 0.9, ay, zc], [ax + 0.9, ay, zc]);
  seg(ctx, [ax, ay - 0.9, zc], [ax, ay + 0.9, zc]);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.11;
  ctx.lineCap = 'round';
  ctx.stroke();
  const s = storm.strike(t);
  let a = Math.sin(t * 0.9) * 0.4;
  if (s && s.big) a += s.age * 16 * (1.5 - s.age);
  const [X, Y] = P3(ax, ay, az + 2.05);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(Math.cos(a), 1);
  ctx.beginPath();
  ctx.ellipse(0.12, 0, 0.55, 0.24, -0.1, 0, Math.PI * 2);
  ctx.moveTo(0.62, -0.08);
  ctx.lineTo(0.95, -0.34);
  ctx.lineTo(0.8, 0.05);
  ctx.moveTo(-0.62, -0.72);
  ctx.arc(-0.72, -0.72, 0.15, 0, Math.PI * 2);
  ctx.moveTo(-0.86, -0.78);
  ctx.lineTo(-1.12, -0.7);
  ctx.lineTo(-0.86, -0.64);
  ctx.fillStyle = OUT.dark;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-0.3, -0.08);
  ctx.quadraticCurveTo(-0.55, -0.3, -0.7, -0.66);
  ctx.strokeStyle = OUT.dark;
  ctx.lineWidth = 0.16;
  ctx.stroke();
  ctx.restore();
}

// ---------- Chimneys ----------
// Twisted Tudor chimneys up the outside of the back walls: a brick stack, then
// shafts with a spiral twist, flared caps and pots, all smoking. The kitchen's
// leans (its range hasn't gone out since 1974).
const CHIMNEYS = [
  { x: 21.3, y: -1.5, w: 2.2, d: 1.5, top: 14.3, n: 2, h: 3.8, lean: 0, smoke: 0.8 },
  { x: -1.5, y: 22.8, w: 1.5, d: 2.2, top: 14.3, n: 2, h: 4.2, lean: 0, smoke: 0.8 },
  { x: 40.4, y: -1.3, w: 1.6, d: 1.3, top: 7.2, n: 1, h: 4.4, lean: -1.4, smoke: 1.3 },
];
const SHAFT_R = 0.4;
const shaftsOf = (c) => (c.n === 1 ? [[c.x + c.w / 2, c.y + c.d / 2]]
  : c.w > c.d ? [[c.x + c.w * 0.27, c.y + c.d / 2], [c.x + c.w * 0.73, c.y + c.d / 2]]
    : [[c.x + c.w / 2, c.y + c.d * 0.27], [c.x + c.w / 2, c.y + c.d * 0.73]]);
// Where the smoke comes out: the top of every pot, on screen. [X, Y, how smoky]
const POTS = [];
for (const c of CHIMNEYS) {
  for (const [cx, cy] of shaftsOf(c)) {
    const [X, Y] = P3(cx, cy, c.top + 0.4 + c.h);
    POTS.push([X + c.lean, Y - 0.35 - 0.8 * ZK, c.smoke]);
  }
}

function chimney(ctx, t, c) {
  const [X, Y] = P3(c.x + c.w / 2, c.y + c.d / 2, c.top);
  if (!seen(X - 4, Y - 7, X + 4, Y + c.top * ZK + 2)) return;
  box(ctx, c.x, c.y, 0, c.w, c.d, c.top, OUT.brick, { dotsL: shade(OUT.brick, 0.55), dens: 0.2 });
  if (Q.detail) {
    ctx.beginPath();
    for (let z = 0.55; z < c.top; z += 0.55) {
      seg(ctx, [c.x, c.y + c.d, z], [c.x + c.w, c.y + c.d, z]);
      seg(ctx, [c.x + c.w, c.y + c.d, z], [c.x + c.w, c.y, z]);
    }
    ctx.strokeStyle = alpha(C.ink, 0.28);
    ctx.lineWidth = 0.04;
    ctx.stroke();
  }
  box(ctx, c.x - 0.2, c.y - 0.2, c.top, c.w + 0.4, c.d + 0.4, 0.4, OUT.brickLit, { flat: true });
  for (const [cx, cy] of shaftsOf(c)) twisted(ctx, cx, cy, c.top + 0.4, c.h, c.lean);
}

// One twisted shaft (drawn flat on screen, since it can lean), its cap and pot.
function twisted(ctx, cx, cy, z0, h, lean) {
  const [Xb, Yb] = P3(cx, cy, z0);
  const Yt = Yb - h * ZK, Xt = Xb + lean;
  const rx = SHAFT_R * Math.SQRT2, ry = rx / 2;
  ctx.beginPath();
  ctx.moveTo(Xb - rx, Yb);
  ctx.lineTo(Xt - rx, Yt);
  ctx.lineTo(Xt + rx, Yt);
  ctx.lineTo(Xb + rx, Yb);
  ctx.ellipse(Xb, Yb, rx, ry, 0, 0, Math.PI);
  paint(ctx, OUT.brick, { lw: 0.05 });
  // The twist: light bands spiralling up it.
  ctx.beginPath();
  const n = Math.max(3, Math.round(h / 0.5));
  for (let i = 0; i < n; i++) {
    const f0 = i / n, f1 = (i + 1.4) / n;
    if (f1 > 1) break;
    const xa = Xb - rx + lean * f0, ya = Yb + (Yt - Yb) * f0;
    const xb = Xb + rx + lean * f1, yb = Yb + (Yt - Yb) * f1;
    ctx.moveTo(xa, ya);
    ctx.quadraticCurveTo((xa + xb) / 2, (ya + yb) / 2 + 0.28, xb, yb);
  }
  ctx.strokeStyle = OUT.brickLit;
  ctx.lineWidth = 0.13;
  ctx.stroke();
  // The flared cap, and a pot on it.
  ctx.beginPath();
  ctx.ellipse(Xt, Yt - 0.12, rx * 1.45, ry * 1.45, 0, 0, Math.PI * 2);
  paint(ctx, OUT.brickLit, { lw: 0.05 });
  const pr = rx * 0.62, ph = 0.8 * ZK, Yp = Yt - 0.35;
  ctx.beginPath();
  ctx.moveTo(Xt - pr, Yp - ph);
  ctx.lineTo(Xt - pr, Yp);
  ctx.ellipse(Xt, Yp, pr, pr / 2, 0, Math.PI, 0, true);
  ctx.lineTo(Xt + pr, Yp - ph);
  ctx.closePath();
  paint(ctx, OUT.pot, { lw: 0.05 });
  ctx.beginPath();
  ctx.ellipse(Xt, Yp - ph, pr, pr / 2, 0, 0, Math.PI * 2);
  paint(ctx, OUT.dark, { lw: 0.04 });
}

// Smoke from every pot, blown off to the left with the rain.
function smoke(ctx, t) {
  for (let p = 0; p < POTS.length; p++) {
    const [X, Y, k] = POTS[p];
    if (!seen(X - 12, Y - 8, X + 2, Y + 1)) continue;
    for (let i = 0; i < 4; i++) {
      const a = (t * 0.3 + i / 4 + p * 0.37) % 1;
      const r = 0.4 + a * 1.7;
      ctx.beginPath();
      ctx.arc(X - a * 7.5 - Math.sin(a * 6 + i) * 0.4, Y - a * 5.2 + a * a * 2.2, r, 0, Math.PI * 2);
      ctx.fillStyle = alpha(OUT.smoke, (1 - a) * 0.42 * k);
      ctx.fill();
    }
  }
}

// ---------- Trees ----------
// Bare storm trees, bent by the wind (it blows to the screen's left, like the
// rain), their tips whipping. [x, y, height, seed, owl]
const TREES = [
  [-10, 3, 12.5, 1],
  [-10.5, 21.5, 14, 2, true],
  [-11.2, 31, 10.5, 3],
  [4, -8.5, 12, 4],
  [21, -9.8, 13.5, 5, true],
  [45.5, -8, 11, 6],
  [-10, 51.5, 13, 7],
];

// One branch and its children, as quadratic segments by depth.
function grow(segs, X, Y, ang, len, depth, seed, bend) {
  const a = ang + bend * (1 + depth * 0.9);
  const tw = (hash(seed, 11 + depth) - 0.5) * 0.9;
  const ex = X + Math.sin(a) * len, ey = Y - Math.cos(a) * len;
  const cx = X + Math.sin(a - tw * 0.5) * len * 0.5, cy = Y - Math.cos(a - tw * 0.5) * len * 0.5;
  segs[depth].push(X, Y, cx, cy, ex, ey);
  if (depth === 3) return;
  const n = depth === 0 ? 3 : 2;
  for (let i = 0; i < n; i++) {
    const s = (seed * 7 + i * 13 + depth * 29) | 0;
    const spread = depth === 0 ? (i - 1) * 0.62 + (hash(s, 1) - 0.5) * 0.3 : (i ? 1 : -1) * (0.3 + hash(s, 2) * 0.45);
    const k = depth === 0 ? 0.52 + hash(s, 3) * 0.2 : 0.62 + hash(s, 3) * 0.18;
    // The trunk forks along its top; the rest fork at their tips.
    const f = depth === 0 ? 0.6 + i * 0.2 : 1;
    const u = 1 - f;
    const bx = u * u * X + 2 * u * f * cx + f * f * ex, by = u * u * Y + 2 * u * f * cy + f * f * ey;
    grow(segs, bx, by, a + spread, len * k, depth + 1, s, bend);
  }
}

const TREE_W = [1, 0.55, 0.3, 0.15];
function stormTree(ctx, t, x, y, h, seed, hasOwl) {
  const [X, Y] = P3(x, y);
  if (!seen(X - h * 0.8, Y - h * 1.3, X + h * 0.6, Y + 1)) return;
  const gust = 0.5 + 0.5 * Math.sin(t * 0.63 + seed * 1.3);
  const bend = -0.05 - gust * 0.09 + Math.sin(t * 2.7 + seed * 2.1) * 0.035 * (0.4 + gust);
  const segs = [[], [], [], []];
  grow(segs, X, Y, (hash(seed, 1) - 0.5) * 0.12, h * 0.42, 0, seed, bend);
  const w0 = h * 0.05;
  const paths = segs.map((s) => {
    const p = new Path2D();
    for (let i = 0; i < s.length; i += 6) {
      p.moveTo(s[i], s[i + 1]);
      p.quadraticCurveTo(s[i + 2], s[i + 3], s[i + 4], s[i + 5]);
    }
    return p;
  });
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (Q.lines) {
    ctx.strokeStyle = C.ink;
    for (let d = 0; d < 4; d++) {
      ctx.lineWidth = w0 * TREE_W[d] + 0.12;
      ctx.stroke(paths[d]);
    }
  }
  // The root flare, then the bark.
  ctx.beginPath();
  ctx.moveTo(X - w0 * 1.4, Y + 0.1);
  ctx.quadraticCurveTo(X - w0 * 0.4, Y - 0.2, X - w0 * 0.3, Y - h * 0.12);
  ctx.lineTo(X + w0 * 0.3, Y - h * 0.12);
  ctx.quadraticCurveTo(X + w0 * 0.4, Y - 0.2, X + w0 * 1.4, Y + 0.1);
  ctx.closePath();
  paint(ctx, OUT.bark, { lw: 0.06 });
  ctx.strokeStyle = OUT.bark;
  for (let d = 0; d < 4; d++) {
    ctx.lineWidth = w0 * TREE_W[d];
    ctx.stroke(paths[d]);
  }
  // Moonlight down the right side of the trunk and the big limbs.
  ctx.save();
  ctx.translate(w0 * 0.28, 0);
  ctx.strokeStyle = OUT.barkLit;
  ctx.lineWidth = w0 * 0.22;
  ctx.stroke(paths[0]);
  ctx.translate(-w0 * 0.12, 0);
  ctx.lineWidth = w0 * 0.14;
  ctx.stroke(paths[1]);
  ctx.restore();
  if (hasOwl) {
    const s = segs[1];
    owl(ctx, s[4], s[5] + 0.05, t, seed);
  }
}

// An owl on a branch: gold eyes that blink, and go wide when lightning strikes.
function owl(ctx, X, Y, t, seed) {
  ctx.beginPath();
  ctx.ellipse(X, Y - 0.42, 0.3, 0.42, 0, 0, Math.PI * 2);
  ctx.moveTo(X - 0.26, Y - 0.66);
  ctx.lineTo(X - 0.3, Y - 0.98);
  ctx.lineTo(X - 0.08, Y - 0.78);
  ctx.moveTo(X + 0.26, Y - 0.66);
  ctx.lineTo(X + 0.3, Y - 0.98);
  ctx.lineTo(X + 0.08, Y - 0.78);
  paint(ctx, OUT.owl, { lw: 0.04 });
  const s = storm.strike(t);
  const wide = s && s.age < 1.3;
  const ph = (t * 0.8 + seed * 0.37) % 1;
  if (!wide && ph < 0.06) {
    ctx.beginPath();
    ctx.moveTo(X - 0.2, Y - 0.62);
    ctx.lineTo(X - 0.04, Y - 0.62);
    ctx.moveTo(X + 0.04, Y - 0.62);
    ctx.lineTo(X + 0.2, Y - 0.62);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.05;
    ctx.stroke();
    return;
  }
  const r = wide ? 0.12 : 0.085;
  ctx.beginPath();
  ctx.arc(X - 0.11, Y - 0.62, r, 0, Math.PI * 2);
  ctx.arc(X + 0.11, Y - 0.62, r, 0, Math.PI * 2);
  ctx.fillStyle = INK.candleGold;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(X - 0.11, Y - 0.62, r * 0.4, 0, Math.PI * 2);
  ctx.arc(X + 0.11, Y - 0.62, r * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = C.ink;
  ctx.fill();
}

// ---------- The greenhouse ----------
// At the lawn's left front: white iron and glass that catches every flash,
// palms inside, and a lantern someone left burning.
const GH = { x: -12, y: 36, w: 8, d: 11, base: 0.8, eave: 3.3, ridge: 5.2 };
function greenhouse(ctx, t) {
  const { x, y, w, d, base, eave, ridge } = GH;
  const x2 = x + w, y2 = y + d, xm = x + w / 2;
  const [Xa] = P3(x, y2), [Xb] = P3(x2, y);
  if (!seen(Xa - 1, P3(x, y, ridge)[1] - 1, Xb + 1, P3(x2, y2)[1] + 1)) return;
  const f = Math.round(storm.flash(t) * 8) / 8;
  const pane = alpha(mix(OUT.glass, NIGHT.flash, f), 0.45 + f * 0.35);
  // The far roof slope, seen from above through the glass.
  face(ctx, [[x, y, eave], [x, y2, eave], [xm, y2, ridge], [xm, y, ridge]], alpha(OUT.glass, 0.5), { stroke: false });
  // Inside: palms, ferns, and the lantern's glow.
  const leaf = OUT.leaf;
  ctx.lineCap = 'round';
  for (const [px, py, s] of [[x + 2, y + 2.5, 1.1], [x + 5.5, y + 5, 1.3], [x + 2.4, y + 8.6, 1]]) {
    const [X, Y] = P3(px, py, 0.8);
    const sway = Math.sin(t * 1.1 + px) * 0.05;
    ctx.beginPath();
    ctx.moveTo(X, Y);
    ctx.lineTo(X + sway * 4, Y - 2.4 * s);
    ctx.strokeStyle = OUT.bark;
    ctx.lineWidth = 0.18;
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.5 + sway;
      const tx = X + sway * 4, ty = Y - 2.4 * s;
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(tx + Math.cos(a) * 0.9 * s, ty + Math.sin(a) * 0.9 * s - 0.3, tx + Math.cos(a) * 1.5 * s, ty + Math.sin(a) * 1.2 * s + 0.7);
    }
    ctx.strokeStyle = leaf;
    ctx.lineWidth = 0.22;
    ctx.stroke();
  }
  glow(ctx, x + 4.5, y + 7, 1.4, 4, INK.candleGold, 0.5 * (0.8 + 0.2 * hash(3, Math.floor(t * 9))));
  // The brick base.
  face(ctx, [[x, y2, 0], [x2, y2, 0], [x2, y2, base], [x, y2, base]], shade(OUT.brick, 0.2));
  face(ctx, [[x2, y, 0], [x2, y2, 0], [x2, y2, base], [x2, y, base]], OUT.brick);
  // The near glass: the long side, the gable end, the near roof slope.
  face(ctx, [[x2, y, base], [x2, y2, base], [x2, y2, eave], [x2, y, eave]], pane, { stroke: false });
  face(ctx, [[x, y2, base], [x2, y2, base], [x2, y2, eave], [xm, y2, ridge], [x, y2, eave]], pane, { stroke: false });
  face(ctx, [[x2, y, eave], [x2, y2, eave], [xm, y2, ridge], [xm, y, ridge]], pane, { stroke: false });
  // The lantern, on its hook.
  const [LX, LY] = P3(x + 4.5, y + 7, 1.6);
  ctx.beginPath();
  ctx.roundRect(LX - 0.16, LY - 0.3, 0.32, 0.36, 0.06);
  paint(ctx, INK.candleGold, { lw: 0.04 });
  // White iron: glazing bars on every face, in one path.
  ctx.beginPath();
  for (let u = y; u <= y2 + 0.01; u += d / 10) {
    seg(ctx, [x2, u, base], [x2, u, eave]);
    seg(ctx, [x2, u, eave], [xm, u, ridge]);
  }
  for (let u = x; u <= x2 + 0.01; u += w / 8) {
    const zr = eave + (ridge - eave) * (1 - Math.abs(u - xm) / (w / 2));
    seg(ctx, [u, y2, base], [u, y2, zr]);
  }
  seg(ctx, [x2, y, (base + eave) / 2], [x2, y2, (base + eave) / 2]);
  seg(ctx, [x, y2, (base + eave) / 2], [x2, y2, (base + eave) / 2]);
  seg(ctx, [x, y2, eave], [xm, y2, ridge]);
  seg(ctx, [xm, y2, ridge], [x2, y2, eave]);
  seg(ctx, [xm, y, ridge], [xm, y2, ridge]);
  seg(ctx, [x2, y, eave], [x2, y2, eave]);
  seg(ctx, [x, y2, base], [x, y2, eave]);
  ctx.strokeStyle = INK.bone;
  ctx.lineWidth = 0.08;
  ctx.stroke();
  // The door, and iron cresting along the ridge.
  ctx.beginPath();
  seg(ctx, [x2, 40.9, base], [x2, 40.9, 2.6]);
  seg(ctx, [x2, 42.1, base], [x2, 42.1, 2.6]);
  seg(ctx, [x2, 40.9, 2.6], [x2, 42.1, 2.6]);
  ctx.lineWidth = 0.16;
  ctx.stroke();
  if (Q.detail) {
    ctx.beginPath();
    for (let u = y + 0.5; u < y2; u += 0.9) seg(ctx, [xm, u, ridge], [xm, u, ridge + 0.45]);
    ctx.lineWidth = 0.06;
    ctx.stroke();
  }
}

// ---------- The garden ----------
// Topiary on the left front (the hedge goose is in the Grounds' maze): two
// spirals and two balls on sticks.
const TOPIARY = [[2.5, 37.5, 'spiral'], [8.5, 37.5, 'ball'], [2.5, 45.5, 'spiral'], [8.5, 45.5, 'ball']];
function topiary(ctx, t, x, y, kind) {
  const [X, Y] = P3(x, y);
  if (!seen(X - 2, Y - 5, X + 2, Y + 1)) return;
  const green = OUT.hedge, dark = shade(OUT.hedge, 0.35);
  // A square stone planter.
  box(ctx, x - 0.6, y - 0.6, 0, 1.2, 1.2, 0.5, MAT.stone, { left: MAT.stoneDark, right: OUT.stone, top: shade(MAT.stoneDark, 0.3), flat: true });
  const Y0 = Y - 0.5 * ZK;
  if (kind === 'spiral') {
    ctx.beginPath();
    ctx.moveTo(X - 0.95, Y0);
    ctx.lineTo(X, Y0 - 3.4);
    ctx.lineTo(X + 0.95, Y0);
    ctx.ellipse(X, Y0, 0.95, 0.4, 0, 0, Math.PI);
    paint(ctx, green, { dots: dark, density: 0.25, lw: 0.05 });
    // The spiral cut into it.
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const f0 = 0.12 + i * 0.22, f1 = f0 + 0.13;
      const w0 = 0.95 * (1 - f0), w1 = 0.95 * (1 - f1);
      ctx.moveTo(X - w0, Y0 - 3.4 * f0);
      ctx.quadraticCurveTo(X, Y0 - 3.4 * f0 + 0.35, X + w1, Y0 - 3.4 * f1);
    }
    ctx.strokeStyle = dark;
    ctx.lineWidth = 0.14;
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(X, Y0);
    ctx.lineTo(X, Y0 - 1.6);
    ctx.strokeStyle = OUT.bark;
    ctx.lineWidth = 0.14;
    ctx.stroke();
    for (const [r, h] of [[0.72, 1.7], [0.5, 2.75]]) {
      ctx.beginPath();
      ctx.arc(X, Y0 - h, r, 0, Math.PI * 2);
      paint(ctx, green, { dots: dark, density: 0.25, lw: 0.05 });
    }
  }
}

// A stone goose on a plinth, the family's ancestral goose. (The Grounds
// already has the sundial; this is the lawn's statue.) Its plaque is the only
// thing on the estate that trusts a goose.
function gooseStatue(ctx) {
  const x = 40, y = 42.5;
  const [X, Y] = P3(x, y);
  if (!seen(X - 2, Y - 4, X + 2, Y + 1)) return;
  box(ctx, x - 0.8, y - 0.8, 0, 1.6, 1.6, 0.25, MAT.stone, { left: MAT.stoneDark, right: OUT.stone, top: OUT.stoneTop, flat: true });
  box(ctx, x - 0.4, y - 0.4, 0.25, 0.8, 0.8, 1.1, MAT.stone, { left: MAT.stoneDark, right: OUT.stone, top: OUT.stoneTop, flat: true });
  const [GX, GY] = P3(x, y, 1.35);
  ctx.save();
  ctx.translate(GX, GY);
  ctx.scale(1.3, 1.3);
  ctx.beginPath();
  ctx.ellipse(0, -0.42, 0.44, 0.25, -0.12, 0, Math.PI * 2);
  ctx.moveTo(-0.3, -0.48); ctx.lineTo(-0.58, -0.66); ctx.lineTo(-0.38, -0.34);
  paint(ctx, OUT.stone, { lw: 0.04, dots: MAT.stoneDark, density: 0.25 });
  ctx.beginPath();
  ctx.moveTo(0.22, -0.55); ctx.quadraticCurveTo(0.36, -0.76, 0.28, -1.07);
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.2; ctx.stroke();
  ctx.strokeStyle = OUT.stone; ctx.lineWidth = 0.12; ctx.stroke();
  ctx.beginPath();
  ctx.arc(0.28, -1.08, 0.12, 0, Math.PI * 2);
  ctx.moveTo(0.37, -1.13); ctx.lineTo(0.6, -1.06); ctx.lineTo(0.37, -1.0);
  paint(ctx, OUT.stone, { lw: 0.04 });
  ctx.fillStyle = MAT.stoneDark; // moss on its back, and a blank stone eye
  ctx.beginPath(); ctx.ellipse(-0.08, -0.6, 0.18, 0.05, -0.1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0.3, -1.11, 0.025, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (Q.detail) flat(ctx, 'front', x, y + 0.4, 0.8, (g) => tiny(g, 'IN GOOSE WE TRUST', 0, 0, 0.13, INK.bone));
}

// The family's pets, under little headstones at the lawn's front edge (their
// bones are in the cut, just below). [x, y, name, facing]
const GRAVES = [[36.5, 52.8, 'TIDDLES', 'front'], [41.5, 53.1, 'GOLDIE', 'front'], [46.9, 45, 'REX', 'right']];
function headstone(ctx, x, y, name, side) {
  const [X, Y] = P3(x, y);
  if (!seen(X - 1.5, Y - 2, X + 1.5, Y + 1)) return;
  // Its thickness, then its face with the name.
  const edge = side === 'front' ? [[x + 0.45, y - 0.3, 0], [x + 0.45, y, 0], [x + 0.45, y, 0.85], [x + 0.45, y - 0.3, 0.85]]
    : [[x - 0.3, y + 0.45, 0], [x, y + 0.45, 0], [x, y + 0.45, 0.85], [x - 0.3, y + 0.45, 0.85]];
  face(ctx, edge, MAT.stoneDark, { lw: 0.04 });
  flat(ctx, side, x, y, 0, (g) => {
    g.beginPath();
    g.moveTo(-0.45, 0);
    g.lineTo(-0.45, -0.95);
    g.arc(0, -0.95, 0.45, Math.PI, 0);
    g.lineTo(0.45, 0);
    g.closePath();
    paint(g, side === 'front' ? mix(MAT.stone, INK.stormNavy, 0.2) : MAT.stone, { lw: 0.04 });
    if (Q.detail) {
      tiny(g, 'RIP', 0, -1.02, 0.18, C.ink);
      tiny(g, name, 0, -0.66, 0.15, C.ink);
    }
  });
}

// The drive, cut: a storm tree down across it, roots and all, and past it the
// road washed away over the edge. Nobody is leaving tonight.
function fallenTree(ctx, t) {
  const y = 51.8;
  const [X0] = P3(14, y), [X1] = P3(35, y);
  if (!seen(X0 - 3, 25, X1 + 2, 45)) return;
  // The hole it came out of, and the root plate, torn up on end.
  disc(ctx, 13.7, y, 0.01, 1.35, NIGHT.earthDark, { lw: 0.05 });
  const [RX, RY] = P3(15.2, y, 1.8);
  const clod = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r = 1.9 + (hash(i, 81) - 0.5) * 0.6;
    clod.push([RX - Math.cos(a) * r, RY + Math.cos(a) * r * 0.5 - Math.sin(a) * r * ZK * 0.9]);
  }
  ctx.beginPath();
  clod.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.closePath();
  paint(ctx, OUT.clod, { dots: shade(OUT.clod, 0.45), density: 0.3, lw: 0.06 });
  // Its torn roots, pale where they snapped.
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const [px, py] = clod[(i * 5) % 12];
    const a = Math.atan2(py - RY, px - RX) + (hash(i, 83) - 0.5) * 0.6;
    const r = 0.7 + hash(i, 82) * 1.1;
    ctx.moveTo(px - Math.cos(a) * 0.9, py - Math.sin(a) * 0.9);
    ctx.quadraticCurveTo(px + Math.cos(a + 0.5) * r * 0.5, py + Math.sin(a + 0.5) * r * 0.5, px + Math.cos(a) * r, py + Math.sin(a) * r);
  }
  ctx.strokeStyle = OUT.root;
  ctx.lineWidth = 0.12;
  ctx.lineCap = 'round';
  ctx.stroke();
  // The trunk, lying across the drive, and its crown flat on the lawn.
  const limb = (pts, lw) => {
    ctx.beginPath();
    pts.forEach(([px, py, pz], i) => {
      const [A, B] = P3(px, py, pz);
      i ? ctx.lineTo(A, B) : ctx.moveTo(A, B);
    });
    if (Q.lines) {
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = lw + 0.12;
      ctx.stroke();
    }
    ctx.strokeStyle = OUT.bark;
    ctx.lineWidth = lw;
    ctx.stroke();
  };
  limb([[15.6, y, 1.5], [22, y + 0.15, 1.0], [28.8, y + 0.2, 0.75]], 1.35);
  // Moonlight along the top of the trunk.
  ctx.beginPath();
  seg(ctx, [16, y - 0.3, 1.95], [22, y - 0.15, 1.45]);
  seg(ctx, [22, y - 0.15, 1.45], [28, y - 0.1, 1.15]);
  ctx.strokeStyle = OUT.barkLit;
  ctx.lineWidth = 0.22;
  ctx.stroke();
  for (const pts of [
    [[28.2, y + 0.2, 0.8], [31, y - 0.9, 1.1], [33.6, y - 0.8, 0.9]],
    [[28.6, y + 0.2, 0.7], [31.6, y + 0.9, 0.6], [34.2, y + 1.4, 0.4]],
    [[27, y + 0.2, 0.8], [29.4, y + 1.5, 0.5], [30.4, y + 1.9, 0.3]],
    [[29.4, y - 0.4, 0.9], [31.2, y - 1.3, 1.2]],
  ]) limb(pts, 0.34);
  if (Q.detail) {
    // Bark lines along the trunk.
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const x0 = 17 + i * 2;
      seg(ctx, [x0, y + 0.1, 1.45 - i * 0.1], [x0 + 1.2, y + 0.12, 1.4 - i * 0.1]);
    }
    ctx.strokeStyle = alpha(C.ink, 0.5);
    ctx.lineWidth = 0.05;
    ctx.stroke();
  }
}

// A signpost at the edge, pointing helpfully into the washout.
function signpost(ctx) {
  const x = 27.4, y = 53.3;
  const [X, Y] = P3(x, y);
  if (!seen(X - 2, Y - 3, X + 2, Y + 1)) return;
  const [, Yt] = P3(x, y, 2.3);
  ctx.beginPath();
  ctx.moveTo(X, Y);
  ctx.lineTo(X + 0.12, Yt);
  ctx.strokeStyle = OUT.bark;
  ctx.lineWidth = 0.16;
  ctx.stroke();
  // The arrow board, facing us, pointing off the edge (+y).
  face(ctx, [[x + 0.1, y - 0.3, 1.7], [x + 0.1, y + 1.2, 1.7], [x + 0.1, y + 1.65, 2.02], [x + 0.1, y + 1.2, 2.34], [x + 0.1, y - 0.3, 2.34]], MAT.oakLight, { lw: 0.04 });
  if (Q.detail) flat(ctx, 'right', x + 0.1, y + 0.55, 2.02, (g) => tiny(g, 'WAY OUT', 0, 0, 0.26, C.ink));
}

// Iron railings along the lawn's far edges (the near edges are the cut), with
// stone piers at the corners and every so often.
function railings(ctx) {
  const h = 1.5;
  ctx.beginPath();
  for (let x = LX0 + 0.4; x < LX1; x += 0.8) seg(ctx, [x, LY0, 0], [x, LY0, h]);
  for (let y = LY0 + 0.4; y < LY1; y += 0.8) seg(ctx, [LX0, y, 0], [LX0, y, h]);
  for (const z of [0.3, h - 0.25]) {
    seg(ctx, [LX0, LY0, z], [LX1, LY0, z]);
    seg(ctx, [LX0, LY0, z], [LX0, LY1, z]);
  }
  ctx.strokeStyle = OUT.iron;
  ctx.lineWidth = 0.08;
  ctx.stroke();
  if (Q.detail) {
    // Spear tips.
    ctx.beginPath();
    const tip = (x, y) => {
      const [X, Y] = P3(x, y, h);
      ctx.moveTo(X - 0.1, Y);
      ctx.lineTo(X, Y - 0.32);
      ctx.lineTo(X + 0.1, Y);
    };
    for (let x = LX0 + 0.4; x < LX1; x += 0.8) tip(x, LY0);
    for (let y = LY0 + 0.4; y < LY1; y += 0.8) tip(LX0, y);
    ctx.fillStyle = OUT.iron;
    ctx.fill();
  }
  const o = { left: MAT.stoneDark, right: OUT.stone, top: OUT.stoneTop, flat: true, lw: 0.04 };
  for (const [x, y] of [[LX0, LY0], [6, LY0], [26, LY0], [LX1 - 0.4, LY0], [LX0, 12], [LX0, 34], [LX0, LY1 - 0.4]]) {
    box(ctx, x - 0.35, y - 0.35, 0, 0.7, 0.7, 2, MAT.stone, o);
    box(ctx, x - 0.45, y - 0.45, 2, 0.9, 0.9, 0.25, MAT.stone, o);
  }
}

// Everything that stands on the lawn, back to front (by x + y).
const THINGS = [
  [T.x + T.y + T.w, (ctx, t) => tower(ctx, t)],
  ...CHIMNEYS.map((c) => [c.x + c.y + (c.w + c.d) / 2, (ctx, t) => chimney(ctx, t, c)]),
  ...TREES.map((tr) => [tr[0] + tr[1], (ctx, t) => stormTree(ctx, t, ...tr)]),
  [GH.x + GH.y + (GH.w + GH.d) / 2, (ctx, t) => greenhouse(ctx, t)],
  ...TOPIARY.map(([x, y, kind]) => [x + y, (ctx, t) => topiary(ctx, t, x, y, kind)]),
  [82.5, (ctx) => gooseStatue(ctx)],
  ...GRAVES.map(([x, y, name, side]) => [x + y, (ctx) => headstone(ctx, x, y, name, side)]),
  [15.2 + 51.8, (ctx, t) => fallenTree(ctx, t)],
  [27.4 + 53.3, (ctx) => signpost(ctx)],
].sort((a, b) => a[0] - b[0]);

// ---------- The night and the sky behind ----------
function platePath(ctx) {
  const [X0, Y0, X1, Y1] = sheet();
  ctx.beginPath();
  ctx.rect(X0, Y0, X1 - X0, Y1 - Y0);
}

// The night, printed storm navy to every edge of the screen: the map is the
// whole picture, not a panel on paper.
function plate(ctx) {
  platePath(ctx);
  ctx.fillStyle = NIGHT.plate;
  ctx.fill();
  if (Q.detail) {
    ctx.fillStyle = dots(NIGHT.plateDots, 0.22);
    ctx.fill();
  }
}

// The moon, breaking through behind the spire: it's what makes the tower, the
// weathervane and the bats read as shapes against the storm.
const MOON = { X: 5.6, Y: -41, r: 6.2 };
function moon(ctx) {
  const { X, Y, r } = MOON;
  if (!seen(X - r * 3, Y - r * 3, X + r * 3, Y + r * 3)) return;
  glow(ctx, Y + X / 2, Y - X / 2, 0, r * 3.4, OUT.halo, 0.75);
  ctx.beginPath();
  ctx.arc(X, Y, r, 0, Math.PI * 2);
  paint(ctx, OUT.moon, { dots: OUT.crater, density: 0.2, stroke: false });
  if (!Q.detail) return;
  ctx.beginPath();
  for (const [dx, dy, cr] of [[-2, -1.4, 1.2], [2, 0.9, 1.6], [-0.6, 2.6, 0.8], [2.6, -2.8, 0.6], [-3.4, 1.4, 0.5]]) {
    ctx.moveTo(X + dx + cr, Y + dy);
    ctx.arc(X + dx, Y + dy, cr, 0, Math.PI * 2);
  }
  ctx.fillStyle = OUT.crater;
  ctx.fill();
}

// The storm: a heavy bank of billowing cloud along the top of the plate,
// drifting left with the wind and parting around the moon (the billows next
// to it catch its light), and wisps blowing across it.
const BILLOWS = 30;
// [X at t = 0, Y, length, thickness, speed]
const WISPS = [[2, -38.2, 15, 0.9, 1.1], [-40, -33, 20, 1.2, 0.8], [40, -29, 16, 1, 0.95]];
function clouds(ctx, t) {
  const [X0, Y0, X1] = PLATE;
  const [S0, S1, S2] = sheet();
  const span = X1 - X0 + 24;
  const lit = [], all = [];
  // The bank repeats every span, so it runs on past the plate to the screen's edges.
  for (const off of repeats(X0 - 12, X1 + 12, span)) {
    for (let i = 0; i < BILLOWS; i++) {
      const X = off + X0 - 12 + ((((i * span) / BILLOWS + hash(i, 51) * 3 - t * 0.45) % span) + span) % span;
      if (X < S0 - 6 || X > S2 + 6) continue;
      const side = Math.min(1, ((X - MOON.X) / 36) ** 2);
      const Y = Y0 + 1.6 + hash(i, 52) * 2.6 + side * 4.5;
      const d = Math.hypot(X - MOON.X, Y - MOON.Y);
      const r = (3 + hash(i, 53) * 2.8) * Math.min(1, Math.max(0, (d - MOON.r + 0.5) / 7));
      if (r < 0.4) continue;
      all.push(X, Y, r, d);
      if (d < MOON.r + 15) lit.push(X, Y, r, d);
    }
  }
  // The edges facing the moon, then the billows, then the dark mass above them.
  ctx.beginPath();
  for (let i = 0; i < lit.length; i += 4) {
    const [X, Y, r, d] = lit.slice(i, i + 4);
    const k = 0.7 / d;
    ctx.moveTo(X + (MOON.X - X) * k + r, Y + (MOON.Y - Y) * k);
    ctx.arc(X + (MOON.X - X) * k, Y + (MOON.Y - Y) * k, r, 0, Math.PI * 2);
  }
  ctx.fillStyle = OUT.cloudRim;
  ctx.fill();
  // Above the billows, cloud all the way up: the storm is the whole sky.
  ctx.beginPath();
  ctx.rect(S0, S1, S2 - S0, Y0 + 1.6 - S1);
  for (let i = 0; i < all.length; i += 4) {
    ctx.moveTo(all[i] + all[i + 2], all[i + 1]);
    ctx.arc(all[i], all[i + 1], all[i + 2], 0, Math.PI * 2);
  }
  paint(ctx, OUT.cloud, { dots: shade(OUT.cloud, 0.5), density: 0.28, stroke: false });
  // Wisps: long and thin, tapering at both ends.
  ctx.beginPath();
  const wspan = X1 - X0 + 40;
  for (const off of repeats(X0 - 20, X1 + 20, wspan)) {
    for (const [x0, Y, len, th, v] of WISPS) {
      const X = off + X0 - 20 + ((((x0 - X0 + 20 - t * v) % wspan) + wspan) % wspan);
      if (X + len / 2 < S0 || X - len / 2 > S2) continue;
      ctx.moveTo(X + len / 2, Y);
      ctx.ellipse(X, Y, len / 2, th / 2, 0, 0, Math.PI * 2);
    }
  }
  ctx.fillStyle = OUT.wisp;
  ctx.fill();
}

// A printed haze low in the sky, the dots denser toward the horizon (the
// lawn's far edges), so the dark trees and the railings stand out against it.
function haze(ctx) {
  const [X0, , X1, Y1] = sheet();
  const [LX, LY] = P3(LX0, LY1), [BX, BY] = P3(LX0, LY0), [RX, RY] = P3(LX1, LY0);
  // The horizon, straight on out to the sides of the screen.
  const hz = (X) => (X < BX ? BY + (X - BX) * (LY - BY) / (LX - BX) : BY + (X - BX) * (RY - BY) / (RX - BX));
  for (const [lift, d] of [[15, 0.1], [8, 0.18], [3, 0.28]]) {
    ctx.beginPath();
    ctx.moveTo(X0, Math.min(Y1, hz(X0) - lift));
    ctx.lineTo(BX, BY - lift);
    ctx.lineTo(X1, Math.min(Y1, hz(X1) - lift));
    ctx.lineTo(X1, Y1);
    ctx.lineTo(X0, Y1);
    ctx.closePath();
    ctx.fillStyle = dots(OUT.haze, d);
    ctx.fill();
  }
}

// Bats circling the spire; they scatter when lightning strikes. The ones on
// the far side are drawn in the backdrop, the near ones in the sky.
function bats(ctx, t, near) {
  const s = storm.strike(t);
  const scare = s ? Math.max(0, 1 - s.age / 1.4) : 0;
  const cx = APEX[0] - 0.4, cy = APEX[1] + 0.3;
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const a = t * (0.5 + hash(i, 41) * 0.35) + hash(i, 42) * 6.28;
    const r = 5.5 + hash(i, 43) * 5 + scare * 7;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if ((Math.cos(a) + Math.sin(a) > 0) !== near) continue;
    const z = 23.5 + hash(i, 44) * 8 + Math.sin(t * 1.3 + i) * 0.8 + scare * 3;
    const [X, Y] = P3(x, y, z);
    batPath(ctx, X, Y, t * (9 + scare * 9) + i * 1.7, 0.9 + hash(i, 45) * 0.35);
  }
  ctx.fillStyle = OUT.dark;
  ctx.fill();
}
function batPath(ctx, X, Y, ph, s) {
  const up = Math.sin(ph) * 0.55 * s;
  ctx.moveTo(X, Y - 0.12 * s);
  ctx.quadraticCurveTo(X + 0.35 * s, Y - 0.25 * s - up * 0.6, X + 0.85 * s, Y - up);
  ctx.lineTo(X + 0.64 * s, Y - up * 0.5 + 0.12 * s);
  ctx.lineTo(X + 0.46 * s, Y - up * 0.3 + 0.04 * s);
  ctx.lineTo(X + 0.3 * s, Y + 0.14 * s);
  ctx.lineTo(X + 0.06 * s, Y + 0.16 * s);
  ctx.lineTo(X - 0.06 * s, Y + 0.16 * s);
  ctx.lineTo(X - 0.3 * s, Y + 0.14 * s);
  ctx.lineTo(X - 0.46 * s, Y - up * 0.3 + 0.04 * s);
  ctx.lineTo(X - 0.64 * s, Y - up * 0.5 + 0.12 * s);
  ctx.lineTo(X - 0.85 * s, Y - up);
  ctx.quadraticCurveTo(X - 0.35 * s, Y - 0.25 * s - up * 0.6, X - 0.04 * s, Y - 0.12 * s);
  ctx.lineTo(X - 0.1 * s, Y - 0.3 * s);
  ctx.lineTo(X, Y - 0.16 * s);
  ctx.lineTo(X + 0.1 * s, Y - 0.3 * s);
  ctx.closePath();
}

// Leaves torn off the trees, tumbling across the plate with the wind.
const LEAF_INKS = [INK.oxblood, mix(INK.candleGold, INK.oxblood, 0.4), mix(INK.deepPlum, INK.bone, 0.25)];
function leaves(ctx, t) {
  const [X0, Y0, X1, Y1] = PLATE;
  const span = X1 - X0 + 20;
  for (let c = 0; c < 3; c++) {
    ctx.beginPath();
    for (let i = c; i < 18; i += 3) {
      const ph = (t * (7 + hash(i, 61) * 6) + hash(i, 62) * span) % span;
      const X = X1 + 10 - ph;
      const Y = Y0 + 12 + hash(i, 63) * (Y1 - Y0 - 34) + Math.sin(t * 1.7 + i) * 2.2 + ph * 0.1;
      if (!seen(X - 1, Y - 1, X + 1, Y + 1)) continue;
      const a = t * (3 + hash(i, 64) * 4) + i;
      const ry = 0.05 + 0.13 * Math.abs(Math.cos(t * 4 + i));
      ctx.moveTo(X + Math.cos(a) * 0.34, Y + Math.sin(a) * 0.34);
      ctx.ellipse(X, Y, 0.34, ry, a, 0, Math.PI * 2);
    }
    ctx.fillStyle = LEAF_INKS[c];
    ctx.fill();
  }
}

// ---------- The lawn and the cut ----------
const PUDDLES = [[-5, 26, 1.1], [11, 50, 1.3], [37.5, 47.5, 0.9], [24.6, 50.2, 0.6], [-8, 9, 0.9]];
const STONES = [[14.8, 41.8], [12.4, 41.5], [10, 41.9], [7.6, 41.5], [5.2, 41.8], [2.9, 41.5], [0.6, 41.7], [-1.7, 41.5]];

function lawn(ctx, t) {
  poly(ctx, [[LX0, LY0, 0], [LX1, LY0, 0], [LX1, LY1, 0], [LX0, LY1, 0]]);
  paint(ctx, NIGHT.lawn, { dots: NIGHT.lawnDots, density: 0.12, stroke: false });
  // The house's footings: dark earth where the ground floor sits (seen when
  // the floors lift away).
  poly(ctx, [[HX0, HY0, -1.1], [HX1, HY0, -1.1], [HX1, HY1, -1.1], [HX0, HY1, -1.1]]);
  paint(ctx, NIGHT.earthDark, { stroke: false });
  face(ctx, [[HX0, HY0, 0], [HX1, HY0, 0], [HX1, HY0, -1.1], [HX0, HY0, -1.1]], NIGHT.earth, { stroke: false });
  face(ctx, [[HX0, HY0, 0], [HX0, HY1, 0], [HX0, HY1, -1.1], [HX0, HY0, -1.1]], shade(NIGHT.earth, 0.2), { stroke: false });
  // The drive runs to the edge of the lawn, or it did: its end is washed away.
  poly(ctx, [[23.4, 48, 0], [25.8, 48, 0], [25.8, 52.3, 0], [25.2, 52.8, 0], [24.6, 52.4, 0], [24, 52.9, 0], [23.4, 52.5, 0]]);
  paint(ctx, NIGHT.gravel, { dots: shade(NIGHT.gravel, 0.35), density: 0.2, stroke: false });
  poly(ctx, [[21.8, 54, 0], [22.6, 53.1, 0], [23.4, 52.5, 0], [24, 52.9, 0], [24.6, 52.4, 0], [25.2, 52.8, 0], [25.8, 52.3, 0], [26.9, 53.2, 0], [27.8, 54, 0]]);
  paint(ctx, OUT.mud, { stroke: false });
  // Stepping stones from the front garden to the greenhouse door.
  ctx.beginPath();
  for (const [x, y] of STONES) {
    const [X, Y] = P3(x, y, 0.02);
    ctx.moveTo(X + 0.85, Y);
    ctx.ellipse(X, Y, 0.85, 0.42, 0, 0, Math.PI * 2);
  }
  ctx.fillStyle = mix(NIGHT.gravel, INK.stormNavy, 0.35);
  ctx.fill();
  // Puddles, flashing with the lightning, rain rippling them.
  const f = Math.round(storm.flash(t) * 6) / 6;
  const water = mix(mix(INK.stormNavy, INK.bone, 0.14), NIGHT.flash, f * 0.8);
  for (const [x, y, r] of PUDDLES) disc(ctx, x, y, 0.01, r, water, { stroke: false });
  if (Q.detail) {
    ctx.beginPath();
    PUDDLES.forEach(([x, y, r], i) => {
      const ph = t * 1.3 + hash(i, 71);
      const k = ph % 1, n = Math.floor(ph);
      const [X, Y] = P3(x + (hash(i, n) - 0.5) * r, y + (hash(n, i) - 0.5) * r * 0.6, 0.02);
      const rr = (0.1 + k * r * 0.6) * Math.SQRT2;
      ctx.moveTo(X + rr, Y);
      ctx.ellipse(X, Y, rr, rr / 2, 0, 0, Math.PI * 2);
    });
    ctx.strokeStyle = alpha(INK.bone, 0.4);
    ctx.lineWidth = 0.04;
    ctx.stroke();
  }
}

// The cut through the ground: layers of earth down to the bedrock, wobbling
// along the two faces and meeting at the corner.
const STRATA = [
  [-0.6, 0.05, mix(NIGHT.lawn, INK.stormNavy, 0.3)], // turf
  [-2.7, 0.35, mix(INK.deepPlum, INK.stormNavy, 0.42)], // topsoil
  [-5.5, 0.5, mix(INK.oxblood, INK.stormNavy, 0.58)], // clay
  [-8, 0.45, mix(mix(INK.deepPlum, INK.bone, 0.18), INK.stormNavy, 0.5)], // rubble
];
const BEDROCK = mix(INK.deepPlum, INK.stormNavy, 0.72);
// s: how far along the cut from the front corner (the front face is s < 0).
const layerZ = (i, s) => STRATA[i][0] + STRATA[i][1] * (Math.sin(s * 0.41 + i * 1.9) * 0.65 + Math.sin(s * 1.07 + i * 4.3) * 0.35);
function strata(ctx, side) {
  const front = side === 'front';
  const [u0, u1] = front ? [LX0, LX1] : [LY0, LY1];
  const W = front ? (u, z) => P3(u, LY1, z) : (u, z) => P3(LX1, u, z);
  const S = front ? (u) => u - LX1 : (u) => LY1 - u;
  const dk = front ? 0.22 : 0;
  let [X, Y] = W(u0, 0);
  ctx.beginPath();
  ctx.moveTo(X, Y);
  for (const [u, z] of [[u1, 0], [u1, -DEPTH], [u0, -DEPTH]]) {
    [X, Y] = W(u, z);
    ctx.lineTo(X, Y);
  }
  ctx.closePath();
  paint(ctx, shade(BEDROCK, dk), { dots: shade(BEDROCK, 0.5), density: 0.2, stroke: false });
  for (let i = STRATA.length - 1; i >= 0; i--) {
    ctx.beginPath();
    [X, Y] = W(u0, 0);
    ctx.moveTo(X, Y);
    [X, Y] = W(u1, 0);
    ctx.lineTo(X, Y);
    for (let u = u1; u > u0; u -= 1.5) {
      [X, Y] = W(u, layerZ(i, S(u)));
      ctx.lineTo(X, Y);
    }
    [X, Y] = W(u0, layerZ(i, S(u0)));
    ctx.lineTo(X, Y);
    ctx.closePath();
    ctx.fillStyle = shade(STRATA[i][2], dk);
    ctx.fill();
    if (i === 2 && Q.detail) {
      ctx.fillStyle = dots(shade(STRATA[i][2], 0.45), 0.18);
      ctx.fill();
    }
  }
}

function cut(ctx, t) {
  const [FX0] = P3(LX0, LY1), [FX1] = P3(LX1, LY1), [RX1] = P3(LX1, LY0);
  if (!seen(FX0, 0, RX1, PLATE[3])) return;
  strata(ctx, 'right');
  strata(ctx, 'front');
  if (Q.detail) {
    cellarFrame(ctx);
    grassRoots(ctx);
    treeRoots(ctx);
    rocksAndBones(ctx);
    pets(ctx);
    fossil(ctx);
    chest(ctx, t);
    pipes(ctx, t);
    worms(ctx, t);
    drips(ctx, t);
  }
  washout(ctx, t);
  // The slab's edges.
  ctx.beginPath();
  seg(ctx, [LX0, LY1, 0], [LX1, LY1, 0]);
  seg(ctx, [LX1, LY1, 0], [LX1, LY0, 0]);
  seg(ctx, [LX1, LY1, 0], [LX1, LY1, -DEPTH]);
  seg(ctx, [LX0, LY1, 0], [LX0, LY1, -DEPTH]);
  seg(ctx, [LX1, LY0, 0], [LX1, LY0, -DEPTH]);
  seg(ctx, [LX0, LY1, -DEPTH], [LX1, LY1, -DEPTH]);
  seg(ctx, [LX1, LY1, -DEPTH], [LX1, LY0, -DEPTH]);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.09;
  ctx.stroke();
  // The corner, a shade lighter where the two faces meet the moonlight.
}

// The house's foundations, cut through around the cellar (the cellar itself
// is drawn by its room, over this).
function cellarFrame(ctx) {
  onCut(ctx, 'right', 17, -1.1, (g) => {
    const w = 18, h = 8.4 * ZK;
    g.beginPath();
    g.rect(0, 0, w, h);
    g.rect(1, 0, 16, 7.1 * ZK);
    g.fillStyle = MAT.stoneDark;
    g.fill('evenodd');
    g.beginPath();
    for (let y = 0.6; y < h; y += 0.6) {
      g.moveTo(0, y); g.lineTo(1, y);
      g.moveTo(w - 1, y); g.lineTo(w, y);
    }
    for (let x = 0.5; x < w; x += 1.1) { g.moveTo(x, 7.1 * ZK); g.lineTo(x, h); }
    g.moveTo(0, 7.1 * ZK + 0.6); g.lineTo(w, 7.1 * ZK + 0.6);
    g.strokeStyle = alpha(C.ink, 0.45);
    g.lineWidth = 0.05;
    g.stroke();
  });
}

// Grass roots in the turf, all along the top of the cut.
function grassRoots(ctx) {
  ctx.beginPath();
  for (let x = LX0 + 0.3; x < LX1; x += 0.45) {
    const [X, Y] = P3(x, LY1, 0);
    ctx.moveTo(X, Y + 0.1);
    ctx.lineTo(X + (hash(Math.round(x * 10), 5) - 0.5) * 0.3, Y + 0.5 + hash(Math.round(x * 10), 6) * 0.6);
  }
  for (let y = LY0 + 0.3; y < LY1; y += 0.45) {
    const [X, Y] = P3(LX1, y, 0);
    ctx.moveTo(X, Y + 0.1);
    ctx.lineTo(X + (hash(Math.round(y * 10), 7) - 0.5) * 0.3, Y + 0.5 + hash(Math.round(y * 10), 8) * 0.6);
  }
  ctx.strokeStyle = mix(NIGHT.lawn, INK.bone, 0.15);
  ctx.lineWidth = 0.05;
  ctx.stroke();
}

// Roots from the trees by the edges, down into the cut.
function treeRoots(ctx) {
  const root = (side, u, list) => onCut(ctx, side, u, -0.4, (g) => {
    g.beginPath();
    for (const [x1, y1, x2, y2] of list) {
      g.moveTo(0, 0);
      g.quadraticCurveTo(x1, y1, x2, y2);
    }
    g.strokeStyle = C.ink;
    g.lineWidth = 0.2;
    g.lineCap = 'round';
    g.stroke();
    g.strokeStyle = OUT.bark;
    g.lineWidth = 0.12;
    g.stroke();
  });
  root('front', -10, [[-1, 1.2, -2.6, 2.4], [0.4, 1.4, 0.2, 3.6], [1.4, 0.8, 2.8, 2], [-0.4, 2.4, -1.2, 4.4], [0.9, 2.6, 1.6, 4.9]]);
  root('right', -8, [[-1, 1.1, -2.2, 2.6], [0.3, 1.6, 0.4, 3.4], [1.2, 0.9, 2.4, 1.8]]);
}

// Stones in the rubble, and the odd old bone.
const ROCKS = [['front', -5, -6.6, 1.1], ['front', 8, -7.2, 0.8], ['front', 18.5, -6.3, 1.2], ['front', 31, -7, 0.9], ['front', 45.5, -6.4, 0.8],
  ['right', 52, -6.8, 0.9], ['right', 33, -6.2, 1.1], ['right', 27, -7.4, 0.8], ['right', -3.5, -6.6, 1]];
const BONES = [['front', -2, -3.6, 0.4], ['front', 14, -4.4, -0.3], ['front', 33, -3.9, 0.9], ['right', 49.5, -4.2, -0.5], ['right', 30, -4.8, 0.2], ['right', -6, -3.8, 0.6]];
function rocksAndBones(ctx) {
  for (const [side, u, z, r] of ROCKS) {
    onCut(ctx, side, u, z, (g) => {
      g.beginPath();
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const rr = r * (0.75 + hash(Math.round(u * 7) + i, 91) * 0.4);
        g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.62);
      }
      g.closePath();
      paint(g, side === 'front' ? MAT.stoneDark : mix(MAT.stone, MAT.stoneDark, 0.5), { lw: 0.05 });
    });
  }
  for (const [side, u, z, a] of BONES) onCut(ctx, side, u, z, (g) => bone(g, 0, 0, 0.55, a));
}
// A bone, as a line with knobs, centered on (X, Y).
function bone(g, X, Y, len, a) {
  const dx = Math.cos(a) * len, dy = Math.sin(a) * len;
  g.beginPath();
  g.moveTo(X - dx, Y - dy);
  g.lineTo(X + dx, Y + dy);
  g.strokeStyle = INK.bone;
  g.lineWidth = 0.12;
  g.lineCap = 'round';
  g.stroke();
  g.beginPath();
  for (const k of [-1, 1]) {
    const ex = X + dx * k, ey = Y + dy * k, nx = -dy / len * 0.09, ny = dx / len * 0.09;
    g.moveTo(ex + nx + 0.09, ey + ny);
    g.arc(ex + nx, ey + ny, 0.09, 0, Math.PI * 2);
    g.moveTo(ex - nx + 0.09, ey - ny);
    g.arc(ex - nx, ey - ny, 0.09, 0, Math.PI * 2);
  }
  g.fillStyle = INK.bone;
  g.fill();
}

// The pets, each just under its headstone: Tiddles the cat (curled up),
// Goldie the goldfish, and Rex, who went with his favorite bone.
function pets(ctx) {
  const ink = (g, lw = 0.06) => {
    g.strokeStyle = INK.bone;
    g.lineWidth = lw;
    g.lineCap = 'round';
    g.stroke();
  };
  onCut(ctx, 'front', 36.5, -1.9, (g) => {
    g.beginPath();
    g.arc(0, 0, 0.55, Math.PI * 0.85, Math.PI * 2.1);
    ink(g, 0.08);
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * (1.15 + i * 0.13);
      g.moveTo(Math.cos(a) * 0.55, Math.sin(a) * 0.55);
      g.lineTo(Math.cos(a) * 0.3, Math.sin(a) * 0.3 + 0.08);
    }
    g.moveTo(Math.cos(Math.PI * 2.1) * 0.55, Math.sin(Math.PI * 2.1) * 0.55);
    g.quadraticCurveTo(0.9, 0.5, 0.3, 0.55);
    g.moveTo(-0.1, 0.2); g.lineTo(-0.25, 0.5);
    g.moveTo(0.2, 0.25); g.lineTo(0.1, 0.52);
    ink(g);
    g.beginPath();
    g.arc(-0.62, 0.02, 0.2, 0, Math.PI * 2);
    g.moveTo(-0.78, -0.08); g.lineTo(-0.8, -0.3); g.lineTo(-0.66, -0.16);
    g.moveTo(-0.5, -0.12); g.lineTo(-0.42, -0.32); g.lineTo(-0.36, -0.1);
    g.fillStyle = INK.bone;
    g.fill();
    g.beginPath();
    g.arc(-0.68, 0.0, 0.045, 0, Math.PI * 2);
    g.arc(-0.56, 0.0, 0.045, 0, Math.PI * 2);
    g.fillStyle = C.ink;
    g.fill();
  });
  onCut(ctx, 'front', 41.5, -1.6, (g) => {
    g.beginPath();
    g.moveTo(-0.5, 0);
    g.lineTo(0.35, 0);
    for (let i = 0; i < 5; i++) {
      const x = -0.35 + i * 0.16;
      g.moveTo(x, 0); g.lineTo(x + 0.08, -0.22);
      g.moveTo(x, 0); g.lineTo(x + 0.08, 0.22);
    }
    g.moveTo(0.35, 0); g.lineTo(0.55, -0.2); g.lineTo(0.55, 0.2); g.closePath();
    ink(g, 0.05);
    g.beginPath();
    g.moveTo(-0.5, -0.2); g.lineTo(-0.75, 0); g.lineTo(-0.5, 0.2); g.closePath();
    g.fillStyle = INK.bone;
    g.fill();
  });
  onCut(ctx, 'right', 45.8, -2.2, (g) => {
    g.beginPath();
    g.moveTo(-0.7, -0.1);
    g.quadraticCurveTo(0, -0.3, 0.6, -0.05);
    for (let i = 0; i < 5; i++) {
      const x = -0.4 + i * 0.16;
      g.moveTo(x, -0.2); g.quadraticCurveTo(x + 0.12, 0.05, x + 0.02, 0.2);
    }
    g.moveTo(0.6, -0.05); g.quadraticCurveTo(0.9, -0.3, 1.05, -0.5);
    g.moveTo(-0.5, -0.05); g.lineTo(-0.62, 0.45);
    g.moveTo(-0.3, -0.05); g.lineTo(-0.2, 0.45);
    g.moveTo(0.35, 0); g.lineTo(0.3, 0.45);
    g.moveTo(0.55, 0); g.lineTo(0.7, 0.42);
    ink(g);
    g.beginPath();
    g.ellipse(-0.95, -0.15, 0.3, 0.17, -0.2, 0, Math.PI * 2);
    g.moveTo(-1.02, -0.3); g.lineTo(-0.95, -0.5); g.lineTo(-0.84, -0.3);
    g.fillStyle = INK.bone;
    g.fill();
    g.beginPath();
    g.arc(-0.92, -0.2, 0.05, 0, Math.PI * 2);
    g.fillStyle = C.ink;
    g.fill();
    bone(g, -1.15, 0.12, 0.28, 0.2);
  });
}

// Deep in the bedrock, a fossil. The goose has been here a long, long time.
function fossil(ctx) {
  onCut(ctx, 'right', 47, -8.4, (g) => {
    g.strokeStyle = INK.bone;
    g.lineCap = 'round';
    // The ribcage and backbone.
    g.beginPath();
    g.ellipse(2.4, 0.2, 1.1, 0.55, -0.1, 0, Math.PI * 2);
    for (let i = 0; i < 5; i++) {
      const x = 1.6 + i * 0.38;
      g.moveTo(x, -0.28); g.quadraticCurveTo(x + 0.15, 0.2, x - 0.05, 0.68);
    }
    g.moveTo(3.5, 0.1); g.lineTo(4.3, -0.15); g.lineTo(4.55, -0.35);
    g.moveTo(4.3, -0.15); g.lineTo(4.6, 0.05);
    // The wing, folded.
    g.moveTo(1.9, -0.3); g.lineTo(2.9, -0.95); g.lineTo(4.1, -0.7);
    g.moveTo(2.9, -0.95); g.lineTo(3.8, -1.05);
    // The legs and a webbed foot.
    g.moveTo(2.2, 0.72); g.lineTo(2.0, 1.25); g.lineTo(2.3, 1.6);
    g.moveTo(2.8, 0.7); g.lineTo(2.9, 1.3); g.lineTo(3.2, 1.55);
    g.lineWidth = 0.09;
    g.stroke();
    g.beginPath();
    g.moveTo(2.3, 1.6); g.lineTo(2.0, 1.85); g.lineTo(2.65, 1.85); g.closePath();
    g.moveTo(3.2, 1.55); g.lineTo(2.95, 1.8); g.lineTo(3.55, 1.75); g.closePath();
    g.fillStyle = INK.bone;
    g.fill();
    // The long neck, bone by bone, and the skull with its beak.
    g.beginPath();
    for (let i = 0; i < 9; i++) {
      const f = i / 8;
      const x = 1.4 - f * 1.2 - Math.sin(f * Math.PI) * 0.3, y = -0.1 - f * 1.4 + Math.sin(f * Math.PI * 2) * 0.12;
      g.moveTo(x + 0.11, y);
      g.arc(x, y, 0.11, 0, Math.PI * 2);
    }
    g.moveTo(0.05, -1.65);
    g.ellipse(-0.05, -1.65, 0.3, 0.2, 0, 0, Math.PI * 2);
    g.moveTo(-0.3, -1.72); g.lineTo(-0.85, -1.6); g.lineTo(-0.3, -1.54);
    g.fill();
    g.beginPath();
    g.arc(-0.05, -1.7, 0.06, 0, Math.PI * 2);
    g.fillStyle = C.ink;
    g.fill();
  });
  // Two ammonites for company.
  for (const [side, u, z, r] of [['front', 12, -8.9, 0.45], ['right', 34, -9.1, 0.38]]) {
    onCut(ctx, side, u, z, (g) => {
      g.beginPath();
      for (let a = 0; a < Math.PI * 5; a += 0.35) {
        const rr = r * (a / (Math.PI * 5));
        g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      g.strokeStyle = alpha(INK.bone, 0.7);
      g.lineWidth = 0.06;
      g.stroke();
    });
  }
}

// A chest, buried long ago and forgotten about, lid ajar, still full.
function chest(ctx, t) {
  onCut(ctx, 'front', 2, -6.1, (g) => {
    g.beginPath();
    g.rect(0, -0.8, 1.8, 0.9);
    paint(g, mix(MAT.oak, INK.stormNavy, 0.35), { lw: 0.05 });
    g.beginPath();
    g.moveTo(0, -0.8);
    g.lineTo(0.1, -1.25);
    g.quadraticCurveTo(0.9, -1.55, 1.75, -1.3);
    g.lineTo(1.8, -0.8);
    g.closePath();
    paint(g, mix(MAT.oak, INK.stormNavy, 0.2), { lw: 0.05 });
    g.fillStyle = MAT.brassDark;
    g.fillRect(0.25, -0.8, 0.14, 0.9);
    g.fillRect(1.41, -0.8, 0.14, 0.9);
    g.fillRect(0.8, -0.72, 0.2, 0.26);
    // Gold, glinting in the dark.
    g.beginPath();
    for (let i = 0; i < 7; i++) {
      const x = 0.35 + i * 0.18, y = -0.86 - Math.sin(i * 1.3) * 0.06;
      g.moveTo(x + 0.08, y);
      g.arc(x, y, 0.08, 0, Math.PI * 2);
    }
    g.moveTo(2.1, 0.02);
    g.arc(2.02, 0.02, 0.08, 0, Math.PI * 2);
    g.fillStyle = INK.candleGold;
    g.fill();
    if ((t * 0.5) % 1 < 0.12) {
      g.beginPath();
      g.moveTo(0.9, -1.15); g.lineTo(0.95, -0.92); g.lineTo(1.18, -0.87); g.lineTo(0.95, -0.82); g.lineTo(0.9, -0.6);
      g.lineTo(0.85, -0.82); g.lineTo(0.62, -0.87); g.lineTo(0.85, -0.92);
      g.closePath();
      g.fillStyle = INK.bone;
      g.fill();
    }
  });
}

// Drains: a pipe end in the front cut gushing rainwater, and a pipe along the
// right cut under the conservatory, dripping at a joint.
function pipes(ctx, t) {
  onCut(ctx, 'front', 11, -1.8, (g) => {
    g.beginPath();
    g.arc(0, 0, 0.42, 0, Math.PI * 2);
    paint(g, MAT.stoneDark, { lw: 0.05 });
    g.beginPath();
    g.arc(0, 0, 0.28, 0, Math.PI * 2);
    g.fillStyle = OUT.dark;
    g.fill();
    stream(g, (p) => {
      p.moveTo(-0.05, 0.12);
      p.quadraticCurveTo(-0.9, 0.1, -1.05, 3.4);
    }, 0.34, t, { a: 0.5, speed: 6 });
  });
  onCut(ctx, 'right', 31, -2.4, (g) => {
    g.beginPath();
    g.rect(0, -0.3, 13.5, 0.6);
    paint(g, mix(MAT.stoneDark, INK.verdigris, 0.25), { lw: 0.05 });
    g.fillStyle = alpha(INK.bone, 0.25);
    g.fillRect(0, -0.24, 13.5, 0.1);
    g.fillStyle = shade(MAT.stoneDark, 0.3);
    for (const x of [3.2, 7, 10.8]) g.fillRect(x, -0.38, 0.35, 0.76);
    const k = (t * 1.1) % 1;
    g.beginPath();
    g.arc(7.17, 0.45 + k * 2.2, 0.07 + 0.03 * (1 - k), 0, Math.PI * 2);
    g.fillStyle = alpha(OUT.water, 1 - k * 0.7);
    g.fill();
  });
}

// Worms, going about their business.
const WORMS = [['front', -7, -1.3], ['front', 16, -1.6], ['front', 30.5, -1.2], ['right', 38, -1.4], ['right', 21, -3.7]];
function worms(ctx, t) {
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < WORMS.length; i++) {
    const [side, u, z] = WORMS[i];
    onCut(ctx, side, u, z, (g) => {
      g.beginPath();
      for (let k = 0; k <= 6; k++) {
        const x = k * 0.13 + Math.sin(t * 0.8 + i) * 0.15;
        const y = Math.sin(k * 1.2 + t * 3 + i * 2) * 0.07;
        k ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.strokeStyle = mix(C.pink, INK.oxblood, 0.3);
      g.lineWidth = 0.1;
      g.stroke();
    });
  }
  ctx.restore();
}

// Rain soaking through, dripping down the cut.
const DRIPS = [['front', 5, 0.9], ['front', 19.5, 1.2], ['front', 44, 0.8], ['right', 51, 1], ['right', 36.5, 1.3], ['right', -6, 0.9]];
function drips(ctx, t) {
  ctx.beginPath();
  for (let i = 0; i < DRIPS.length; i++) {
    const [side, u, v] = DRIPS[i];
    const k = (t * v * 0.35 + hash(i, 97)) % 1;
    const z = -0.5 - k * (DEPTH - 1);
    const [X, Y] = side === 'front' ? P3(u, LY1, z) : P3(LX1, u, z);
    ctx.moveTo(X, Y - 0.4);
    ctx.lineTo(X, Y);
  }
  ctx.strokeStyle = alpha(OUT.water, 0.55);
  ctx.lineWidth = 0.07;
  ctx.stroke();
}

// Where the drive went over the edge: a gully bitten out of the cut, a muddy
// waterfall down it, and bits of road on the way down.
function washout(ctx, t) {
  onCut(ctx, 'front', 21.8, 0, (g) => {
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(6, 0);
    g.lineTo(4.6, 1.3);
    g.lineTo(4, 3.1);
    g.lineTo(3.2, 5.2);
    g.lineTo(2.5, 3.4);
    g.lineTo(1.3, 1.6);
    g.closePath();
    paint(g, shade(OUT.mud, 0.35), { lw: 0.06 });
    // Chunks of the road, stuck on the way down.
    g.beginPath();
    for (const [x, y, r] of [[2.2, 1.5, 0.3], [3.8, 2.2, 0.25], [3.1, 4.3, 0.2], [1.6, 0.8, 0.22]]) {
      g.moveTo(x - r, y);
      g.lineTo(x, y - r * 0.7);
      g.lineTo(x + r, y - r * 0.2);
      g.lineTo(x + r * 0.6, y + r * 0.6);
      g.closePath();
    }
    paint(g, NIGHT.gravel, { lw: 0.04 });
    // The drive's rainwater, pouring off the end of it and down to the bottom
    // of the cut, where it splashes.
    const muddy = mix(OUT.water, NIGHT.mud, 0.45);
    stream(g, (p) => {
      p.moveTo(2.9, -0.05);
      p.quadraticCurveTo(3.6, 1.6, 3.25, 4.6);
      p.quadraticCurveTo(3.1, 7, 3.2, DEPTH * ZK - 0.2);
    }, 0.75, t, { color: muddy, a: 0.6, speed: 7 });
    stream(g, (p) => {
      p.moveTo(3.9, -0.05);
      p.quadraticCurveTo(3.9, 1.8, 3.45, 4.2);
    }, 0.35, t + 0.4, { color: muddy, a: 0.5, speed: 6 });
    const k = (t * 2.2) % 1;
    g.beginPath();
    g.ellipse(3.2, DEPTH * ZK, 0.5 + k * 0.9, 0.18 + k * 0.2, 0, Math.PI, 0);
    g.strokeStyle = alpha(muddy, 0.8 * (1 - k));
    g.lineWidth = 0.1;
    g.stroke();
  });
}

// ---------- Backdrop ----------
export function backdrop(ctx, t, world, fx) {
  VIEW = fx.view || null;
  plate(ctx);
  // The sky: the moon, the clouds and the far bats stay on the plate.
  ctx.save();
  platePath(ctx);
  ctx.clip();
  haze(ctx);
  moon(ctx);
  clouds(ctx, t);
  bats(ctx, t, false);
  ctx.restore();
  lawn(ctx, t);
  cut(ctx, t);
  railings(ctx);
  for (const [, draw] of THINGS) draw(ctx, t);
  smoke(ctx, t);
  // Rain on the lawn behind the house (the rest falls in the sky, over the rooms).
  rain(ctx, t, { area: LAWN, n: 120, top: 22, seed: 5, color: NIGHT.rain, skip: (x, y) => inHouse(x, y) || !behind(x, y) });
  ctx.save();
  platePath(ctx);
  ctx.clip();
  leaves(ctx, t);
  ctx.restore();
}

// ---------- Sky ----------
// Rain in front of the house, the lightning (a bolt and a flash of cold light
// over everything), the near bats (dark against the flash), and the victory lap.
export function sky(ctx, t, world, fx) {
  VIEW = fx.view || null;
  ctx.save();
  if (fx.cut) ctx.clip(fx.cut, 'evenodd'); // keep the weather out of the room you're in
  rain(ctx, t, { area: LAWN, n: 260, top: 22, seed: 8, color: NIGHT.rain, skip: (x, y) => inHouse(x, y) || behind(x, y) });
  ctx.restore();
  const s = storm.strike(t);
  if (s) {
    // The thumbnail gets the bolt but not the flash: a white plate reads as nothing.
    const k = fx.thumb ? 1 : storm.flash(t);
    // Big strikes come down out of the clouds onto the tower's rod; small ones
    // fork off in the distance, over the estate's far corners.
    if (s.big) bolt(ctx, [ROD[0] + (s.x - 0.5) * 22, PLATE[1] + 1.5], ROD, s.i + 1, k);
    else {
      const X = s.x < 0.5 ? PLATE[0] + 8 + s.x * 70 : PLATE[2] - 40 + (s.x - 0.5) * 60;
      bolt(ctx, [X, PLATE[1] + 1.5], [X + (s.y - 0.5) * 14, PLATE[1] + 26 + s.y * 14], s.i + 7, k * 0.8);
    }
    if (!fx.thumb) {
      // The flash lights the night, not the paper around it.
      ctx.save();
      platePath(ctx);
      ctx.fillStyle = alpha(NIGHT.flash, 0.4 * k);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.save();
  if (fx.cut) ctx.clip(fx.cut, 'evenodd');
  bats(ctx, t, true);
  ctx.restore();
  if (fx.parade) geeseV(ctx, t, fx.parade, world.totalGeese, 60, 24);
}
