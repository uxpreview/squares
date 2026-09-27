// Taxidermy Room: Lord Gooseworth's hobby, and the house's dark-humor
// centerpiece. Everything he ever stuffed stands on a plinth with a joke on
// its brass plate. One new stand, marked GOOSE, has nothing on it yet: the
// order form on his desk says Tuesday.
//
// The running gag: the owl on its perch turns its head whenever you're not
// watching. Every lightning flash catches it facing somewhere new (behind it,
// straight at you, upside down at midnight), it snaps round every few seconds
// in between, and it keeps an eye on the mouse that lives in the bear cub.
// The little story is that mouse's evening: it pops out to sit on Mr. Tiddles'
// head (stuffed in 1971, still watching the window), and later rolls a glass
// eye home from the spill under the workbench. Nothing here is alive. Probably.
import {
  C, Q, P, box, disc, cylinder, face, paint, onLeft, onRight, planks, slab, mix, shade, alpha, hash,
} from '../../../engine/art.js';
import { particles, clamp } from '../../../engine/actors.js';
import { ZK } from '../../../engine/iso.js';
import {
  INK, MAT, ROOM, NIGHT, house, storm, lightsOut, stormWindow, drapes, stripes, lamp, candle, fire,
} from '../style.js';
import { DOORS, LOOP } from '../plan.js';

const TAU = Math.PI * 2;
const tt = (t) => ((t % LOOP) + LOOP) % LOOP; // seconds into the evening

// ---------- Inks (the room's own, from the style sheet) ----------
const RM = ROOM['taxidermy-room'];
const PAPER_L = RM.wall, PAPER_R = shade(RM.wall, 0.07);
const STRIPE = mix(RM.wall, INK.oxblood, 0.13);
const TRIM = RM.trim;
const PLINTH = MAT.mahogany, PLINTH_TOP = mix(MAT.mahogany, INK.bone, 0.16);
const BRASS = MAT.brass, BRASS_D = MAT.brassDark, ENGRAVE = shade(MAT.brassDark, 0.55);
const FUR = MAT.fur, FUR_D = MAT.furDark, FUR_L = mix(MAT.fur, INK.bone, 0.5);
const BEARC = mix(FUR, FUR_D, 0.3);
const BOARC = mix(FUR_D, MAT.stoneDark, 0.2);
const FOX = mix(INK.candleGold, INK.oxblood, 0.42);
const ANTLER = mix(INK.bone, MAT.oak, 0.3);
const LEATHER = mix(INK.verdigris, INK.stormNavy, 0.3);
const GREY = mix(INK.bone, INK.stormNavy, 0.42); // mice, pigeons, the vice
const PINK = mix(INK.oxblood, INK.bone, 0.55); // noses, ears, tails
const BLACK = mix(C.black, INK.deepPlum, 0.25); // Mr. Tiddles, the ostrich, the bat
const TIGER = mix(INK.candleGold, INK.oxblood, 0.2);
const OWL_BUFF = mix(INK.candleGold, INK.bone, 0.38), OWL_SPECK = mix(INK.bone, INK.stormNavy, 0.55);
const OWL_RIM = mix(INK.candleGold, INK.oxblood, 0.35);
const PEA = mix(INK.verdigris, C.navy, 0.45); // peacock blue
const JAR = alpha(mix(MAT.glass, INK.bone, 0.5), 0.55);
const SHADOW = alpha(C.ink, 0.16);

const SANS = (px) => `700 ${px}px "Rethink Sans", system-ui, sans-serif`;
const FAT = (px) => `${px}px "Bagel Fat One", "Arial Black", sans-serif`;

// ---------- Drawing helpers ----------
// Text on a plane: 'x' is a face at x = c (it faces the lower right), 'y' a
// face at y = c (it faces the lower left), 'z' lies flat at height c. (u, v)
// is the middle of the text: along the face and up it, or (x, y) when flat.
function txt(ctx, plane, c, u, v, s, size, color = C.ink, font = SANS, maxW = 0) {
  ctx.save();
  if (plane === 'x') ctx.transform(1, -0.5, 0, ZK, c - u, (c + u) / 2 - v * ZK);
  else if (plane === 'y') ctx.transform(1, 0.5, 0, ZK, u - c, (u + c) / 2 - v * ZK);
  else ctx.transform(1, 0.5, -1, 0.5, u - v, (u + v) / 2 - c * ZK);
  write(ctx, s, size, color, font, maxW);
  ctx.restore();
}
// Text centered on the current origin, `size` units tall.
function write(ctx, s, size, color, font = SANS, maxW = 0) {
  const k = 40;
  ctx.save();
  ctx.scale(1 / k, 1 / k);
  ctx.font = font(size * k);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  if (maxW) ctx.fillText(s, 0, 0, maxW * k);
  else ctx.fillText(s, 0, 0);
  ctx.restore();
}

// A brass plate on a face (plane 'x' at x = c or 'y' at y = c), centered at u
// along the face and v up it, with a line or two engraved on it.
function plate(ctx, plane, c, u, v, w, h, lines, size) {
  const q = plane === 'x'
    ? [[c, u - w / 2, v - h / 2], [c, u + w / 2, v - h / 2], [c, u + w / 2, v + h / 2], [c, u - w / 2, v + h / 2]]
    : [[u - w / 2, c, v - h / 2], [u + w / 2, c, v - h / 2], [u + w / 2, c, v + h / 2], [u - w / 2, c, v + h / 2]];
  face(ctx, q, BRASS, { lw: 0.025, stroke: BRASS_D });
  if (!Q.detail) return;
  const n = lines.length;
  lines.forEach((s, i) => txt(ctx, plane, c, u, v + ((n - 1) / 2 - i) * size * 1.18, s, size, ENGRAVE, SANS, w * 0.9));
}
// The same, facing the viewer (on round things).
function tag(ctx, x, y, z, w, h, lines, size, fill = BRASS, ink = ENGRAVE) {
  const [X, Y] = P(x, y, z);
  ctx.beginPath();
  ctx.rect(X - w / 2, Y - h / 2, w, h);
  paint(ctx, fill, { lw: 0.025, stroke: fill === BRASS ? BRASS_D : C.ink });
  if (!Q.detail) return;
  const n = lines.length;
  lines.forEach((s, i) => {
    ctx.save();
    ctx.translate(X, Y + (i - (n - 1) / 2) * size * 1.18);
    write(ctx, s, size, ink, SANS, w * 0.9);
    ctx.restore();
  });
}

// Draw flat on the floor plane at height z, in plain (x, y) floor units.
function flat(ctx, z, fn) {
  ctx.save();
  ctx.transform(1, 0.5, -1, 0.5, 0, -z * ZK);
  fn(ctx);
  ctx.restore();
}
// Draw flat on a back wall: (a, b) is (x, -z) on the right wall, (-y, -z) on the left.
function onWall(ctx, side, fn) {
  ctx.save();
  if (side === 'left') ctx.transform(1, -0.5, 0, ZK, 0, 0);
  else ctx.transform(1, 0.5, 0, ZK, 0, 0);
  fn(ctx);
  ctx.restore();
}
// A standing cut-out (animals, heads): origin on the floor point (x, y, z), in
// screen units with up negative, scaled by s. flip: facing left.
function bb(ctx, x, y, z, flip, fn, s = 1) {
  ctx.save();
  ctx.translate(x - y, (x + y) / 2 - z * ZK);
  ctx.scale(flip ? -s : s, s);
  fn(ctx);
  ctx.restore();
}
// A stroke with an ink outline (legs, antlers, tails) for the current path.
function limb(ctx, color, w) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (Q.lines) {
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = w + 0.055;
    ctx.stroke();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
}
// A glass eye: dark (or colored, with a pupil), and a glint.
function glassEye(ctx, x, y, r = 0.035, iris = null) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = iris || C.ink;
  ctx.fill();
  if (iris) {
    ctx.beginPath();
    ctx.arc(x, y, r * 0.5, 0, TAU);
    ctx.fillStyle = C.ink;
    ctx.fill();
  }
  if (!Q.detail) return;
  ctx.beginPath();
  ctx.arc(x + r * 0.3, y - r * 0.35, r * 0.38, 0, TAU);
  ctx.fillStyle = C.white;
  ctx.fill();
}
function ell(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
}

// A plinth: a stepped base, the body and a moulded top.
function plinth(ctx, x, y, w, d, h, color = PLINTH, top = PLINTH_TOP) {
  const lip = 0.07;
  box(ctx, x - lip, y - lip, 0, w + lip * 2, d + lip * 2, 0.13, shade(color, 0.12), { flat: true, lw: 0.04 });
  box(ctx, x, y, 0.13, w, d, h - 0.25, color, { lw: 0.04, dens: 0.16 });
  box(ctx, x - lip, y - lip, h - 0.12, w + lip * 2, d + lip * 2, 0.12, color, { flat: true, lw: 0.04, top });
}

// Every glass eye in the room, as screen points (zone iso units), so they can
// all catch the light together: white in a flash, candle gold in the dark.
const GLINTS = [];
const eyeAt = (x, y, z, dx, dy, s = 1, flip = false) => GLINTS.push([x - y + dx * s * (flip ? -1 : 1), (x + y) / 2 - z * ZK + dy * s]);

// ---------- The stag (back corner): not a hat stand ----------
// Drawn facing right, then flipped to look along the wall at the window.
const STAG = { x: 1.7, y: 1.7, z: 0.6, s: 1.22 };
function stagBody(ctx) {
  const far = shade(FUR, 0.28);
  ctx.beginPath(); ctx.moveTo(-0.44, -0.8); ctx.lineTo(-0.52, -0.42); ctx.lineTo(-0.44, 0);
  limb(ctx, far, 0.1);
  ctx.beginPath(); ctx.moveTo(0.52, -0.82); ctx.lineTo(0.57, -0.4); ctx.lineTo(0.57, 0);
  limb(ctx, far, 0.09);
  ctx.beginPath();
  ctx.moveTo(-0.74, -1.0);
  ctx.bezierCurveTo(-0.5, -1.26, 0.2, -1.24, 0.46, -1.22);
  ctx.bezierCurveTo(0.68, -1.18, 0.72, -0.96, 0.6, -0.8);
  ctx.bezierCurveTo(0.4, -0.68, -0.3, -0.66, -0.6, -0.72);
  ctx.bezierCurveTo(-0.82, -0.78, -0.86, -0.92, -0.74, -1.0);
  paint(ctx, FUR, { dots: shade(FUR, 0.45), density: 0.1 });
  ell(ctx, -0.73, -0.9, 0.09, 0.12, 0.3);
  paint(ctx, FUR_L, { stroke: false });
  ctx.beginPath(); ctx.moveTo(-0.56, -0.86); ctx.lineTo(-0.66, -0.42); ctx.lineTo(-0.57, 0);
  limb(ctx, FUR, 0.11);
  ctx.beginPath(); ctx.moveTo(0.4, -0.86); ctx.lineTo(0.45, -0.4); ctx.lineTo(0.44, 0);
  limb(ctx, FUR, 0.1);
  ctx.fillStyle = C.ink;
  for (const hx of [-0.57, 0.44, -0.44, 0.57]) { ell(ctx, hx + 0.02, -0.02, 0.065, 0.035); ctx.fill(); }
  // a thick neck, and the shaggy mane under it
  ctx.beginPath();
  ctx.moveTo(0.2, -1.18);
  ctx.bezierCurveTo(0.42, -1.5, 0.56, -1.74, 0.68, -1.9);
  ctx.lineTo(1.0, -1.76);
  ctx.bezierCurveTo(0.9, -1.46, 0.8, -1.1, 0.66, -0.84);
  ctx.closePath();
  paint(ctx, FUR, { dots: shade(FUR, 0.45), density: 0.1 });
  ctx.beginPath();
  ctx.moveTo(0.95, -1.7);
  for (let i = 0; i < 5; i++) {
    const k = i / 4;
    ctx.lineTo(0.92 - k * 0.2 + 0.07, -1.62 + k * 0.52);
    ctx.lineTo(0.92 - k * 0.2 - 0.03, -1.56 + k * 0.52);
  }
  ctx.lineTo(0.66, -0.96);
  ctx.lineTo(0.8, -1.3);
  ctx.closePath();
  paint(ctx, shade(FUR, 0.2), { stroke: false });
  // head, nose, ear, eye
  ctx.beginPath();
  ctx.moveTo(0.66, -1.98);
  ctx.bezierCurveTo(0.8, -2.1, 0.96, -2.02, 1.04, -1.9);
  ctx.lineTo(1.24, -1.73);
  ctx.bezierCurveTo(1.29, -1.66, 1.24, -1.58, 1.14, -1.59);
  ctx.bezierCurveTo(1.02, -1.6, 0.9, -1.64, 0.82, -1.68);
  ctx.bezierCurveTo(0.7, -1.72, 0.62, -1.86, 0.66, -1.98);
  paint(ctx, FUR, { dots: shade(FUR, 0.45), density: 0.08 });
  ell(ctx, 1.2, -1.67, 0.05, 0.035, 0.5);
  ctx.fillStyle = C.ink;
  ctx.fill();
  ell(ctx, 1.05, -1.64, 0.1, 0.04, 0.3);
  paint(ctx, FUR_L, { stroke: false });
  ctx.beginPath();
  ctx.moveTo(0.7, -1.95);
  ctx.quadraticCurveTo(0.46, -2.1, 0.42, -2.02);
  ctx.quadraticCurveTo(0.52, -1.9, 0.68, -1.87);
  paint(ctx, shade(FUR, 0.1), { lw: 0.035 });
  glassEye(ctx, 0.9, -1.87, 0.036);
}
// The antlers, with the Lord's party hat on one tine (it's his 80th).
function stagAntlers(ctx, far) {
  const c = far ? shade(ANTLER, 0.22) : ANTLER;
  const o = far ? [-0.14, 0.02] : [0, 0];
  const pts = [[0.8, -1.98], [0.73, -2.34], [0.6, -2.72], [0.56, -3.06], [0.7, -3.4]];
  const tines = [
    [0.77, -2.14, 1.05, -2.26], [0.66, -2.56, 0.96, -2.74], [0.58, -2.9, 0.86, -3.14],
    [0.57, -3.06, 0.42, -3.36], [0.6, -3.2, 0.52, -3.46],
  ];
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x + o[0], y + o[1]) : ctx.moveTo(x + o[0], y + o[1])));
  for (const [a, b, cx, cy] of tines) {
    ctx.moveTo(a + o[0], b + o[1]);
    ctx.quadraticCurveTo(a + o[0] + 0.12, b + o[1] - 0.03, cx + o[0], cy + o[1]);
  }
  limb(ctx, c, far ? 0.065 : 0.075);
  if (far) return;
  ctx.save();
  ctx.translate(1.05, -2.24);
  ctx.rotate(0.55);
  ctx.beginPath();
  ctx.moveTo(-0.15, 0.03); ctx.lineTo(0.02, -0.44); ctx.lineTo(0.17, 0.03);
  ctx.closePath();
  paint(ctx, C.pink, { dots: C.mustard, density: 0.4, lw: 0.035 });
  ctx.beginPath();
  ctx.arc(0.02, -0.46, 0.045, 0, TAU);
  paint(ctx, C.mustard, { lw: 0.025 });
  ctx.restore();
}
// Where the spider lets itself down from: the tip of a tine, in stag units.
const STAG_TIP = [0.52, -3.46];
function drawStag(ctx) {
  plinth(ctx, 1.0, 1.0, 1.4, 1.4, STAG.z);
  plate(ctx, 'y', 2.47, 1.7, 0.37, 1.25, 0.22, ['NOT A HAT STAND'], 0.14);
  plate(ctx, 'x', 2.47, 1.7, 0.37, 1.0, 0.22, ['STAG, 1958'], 0.14);
  bb(ctx, STAG.x, STAG.y, STAG.z, true, (g) => {
    stagAntlers(g, true);
    stagBody(g);
    stagAntlers(g, false);
  }, STAG.s);
}

// ---------- The boar (on the right wall) ----------
const BOAR = { x: 5.5, y: 1.2, z: 0.5, s: 1.25 };
function drawBoar(ctx) {
  plinth(ctx, 4.5, 0.6, 2, 1.2, BOAR.z, MAT.stoneDark, MAT.stone);
  plate(ctx, 'y', 1.87, 5.5, 0.26, 1.9, 0.24, ['SHOT BY THE BRIGADIER, 1974', '(IT WAS ALREADY STUFFED)'], 0.085);
  bb(ctx, BOAR.x, BOAR.y, BOAR.z, false, (g) => {
    const far = shade(BOARC, 0.25);
    for (const lx of [-0.34, 0.52]) { g.beginPath(); g.moveTo(lx, -0.34); g.lineTo(lx + 0.02, 0); limb(g, far, 0.1); }
    g.beginPath();
    g.moveTo(-0.74, -0.56);
    g.bezierCurveTo(-0.72, -0.86, -0.2, -0.98, 0.3, -1.0);
    g.bezierCurveTo(0.56, -1.0, 0.72, -0.86, 0.8, -0.7);
    g.lineTo(1.04, -0.44);
    g.lineTo(1.06, -0.3);
    g.lineTo(0.9, -0.27);
    g.bezierCurveTo(0.7, -0.3, 0.55, -0.3, 0.45, -0.27);
    g.bezierCurveTo(0.2, -0.22, -0.4, -0.22, -0.64, -0.3);
    g.bezierCurveTo(-0.78, -0.36, -0.8, -0.48, -0.74, -0.56);
    paint(g, BOARC, { dots: shade(BOARC, 0.5), density: 0.22 });
    // bristles along the back
    g.beginPath();
    g.moveTo(-0.36, -0.9);
    for (let i = 0; i <= 10; i++) g.lineTo(-0.36 + i * 0.09, -0.95 - (i % 2) * 0.1 - Math.sin((i / 10) * Math.PI) * 0.06);
    g.lineTo(0.56, -0.96);
    paint(g, shade(BOARC, 0.4), { lw: 0.03 });
    for (const lx of [-0.46, 0.4]) { g.beginPath(); g.moveTo(lx, -0.34); g.lineTo(lx - 0.02, 0); limb(g, BOARC, 0.11); }
    ell(g, 1.04, -0.37, 0.05, 0.085);
    paint(g, PINK, { lw: 0.03 });
    g.fillStyle = C.ink;
    ell(g, 1.05, -0.4, 0.012, 0.02); g.fill();
    ell(g, 1.05, -0.33, 0.012, 0.02); g.fill();
    g.beginPath(); g.moveTo(0.86, -0.3); g.quadraticCurveTo(1.0, -0.34, 0.97, -0.56);
    limb(g, INK.bone, 0.055);
    g.beginPath(); g.moveTo(0.56, -0.9); g.lineTo(0.48, -1.12); g.lineTo(0.68, -0.96); g.closePath();
    paint(g, shade(BOARC, 0.2), { lw: 0.03 });
    glassEye(g, 0.74, -0.72, 0.034, INK.candleGold);
    g.beginPath(); g.moveTo(-0.74, -0.54); g.quadraticCurveTo(-0.9, -0.56, -0.84, -0.66); g.quadraticCurveTo(-0.78, -0.72, -0.86, -0.78);
    g.strokeStyle = C.ink; g.lineWidth = 0.03; g.stroke();
  }, BOAR.s);
}

// ---------- The bear cub (left wall), the mouse's house ----------
const BEAR = { x: 1.3, y: 5.7, z: 0.56, s: 1.3 };
const HOLE = 5.72; // the mouse hole, in the front of the plinth (x = 2)
function drawBear(ctx) {
  plinth(ctx, 0.6, 5, 1.4, 1.4, BEAR.z);
  plate(ctx, 'y', 6.47, 1.3, 0.33, 1.3, 0.22, ['BEAR CUB', "(MUM'S IN THE LIBRARY)"], 0.08);
  // the mouse's front door
  const a = P(2.0, HOLE - 0.14, 0), b = P(2.0, HOLE + 0.14, 0), top = P(2.0, HOLE, 0.24);
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.quadraticCurveTo(a[0], top[1] - 0.02, top[0], top[1]);
  ctx.quadraticCurveTo(b[0], top[1] + 0.1, b[0], b[1]);
  ctx.closePath();
  paint(ctx, C.black, { lw: 0.03 });
  bb(ctx, BEAR.x, BEAR.y, BEAR.z, false, (g) => {
    const fur = BEARC, light = mix(fur, INK.bone, 0.4);
    for (const s of [-1, 1]) {
      g.beginPath(); g.rect(s * 0.17 - 0.1, -0.36, 0.2, 0.34);
      paint(g, shade(fur, 0.1), { lw: 0.035 });
      ell(g, s * 0.19, -0.04, 0.14, 0.07);
      paint(g, shade(fur, 0.15), { lw: 0.035 });
    }
    // body and tummy, with the torn seam the mouse lives behind
    ell(g, 0, -0.66, 0.37, 0.42);
    paint(g, fur, { dots: shade(fur, 0.45), density: 0.24 });
    ell(g, 0, -0.6, 0.22, 0.28);
    paint(g, light, { stroke: false });
    ell(g, 0.08, -0.58, 0.07, 0.05, 0.3);
    paint(g, C.black, { lw: 0.02 });
    g.fillStyle = INK.bone;
    for (const [sx, sy] of [[0.02, -0.6], [0.14, -0.55], [0.1, -0.63]]) { g.beginPath(); g.arc(sx, sy, 0.028, 0, TAU); g.fill(); }
    // arms up: a roar that isn't fooling anyone
    for (const s of [-1, 1]) {
      g.beginPath(); g.moveTo(s * 0.28, -0.88); g.quadraticCurveTo(s * 0.5, -1.02, s * 0.52, -1.22);
      limb(g, fur, 0.17);
      g.beginPath(); g.arc(s * 0.53, -1.25, 0.1, 0, TAU);
      paint(g, shade(fur, 0.1), { lw: 0.035 });
      if (Q.detail) {
        g.strokeStyle = INK.bone; g.lineWidth = 0.02;
        for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(s * 0.53 + i * 0.045, -1.33); g.lineTo(s * 0.53 + i * 0.05, -1.39); g.stroke(); }
      }
    }
    for (const s of [-1, 1]) {
      g.beginPath(); g.arc(s * 0.23, -1.56, 0.1, 0, TAU);
      paint(g, fur, { lw: 0.035 });
      g.beginPath(); g.arc(s * 0.23, -1.56, 0.05, 0, TAU);
      paint(g, light, { stroke: false });
    }
    g.beginPath(); g.arc(0, -1.32, 0.3, 0, TAU);
    paint(g, fur, { dots: shade(fur, 0.45), density: 0.2 });
    ell(g, 0, -1.22, 0.14, 0.11);
    paint(g, light, { lw: 0.03 });
    ell(g, 0, -1.28, 0.05, 0.035);
    g.fillStyle = C.ink; g.fill();
    ell(g, 0, -1.16, 0.045, 0.04);
    g.fillStyle = C.black; g.fill();
    g.fillStyle = C.white;
    g.fillRect(-0.03, -1.2, 0.02, 0.025); g.fillRect(0.012, -1.2, 0.02, 0.025);
    glassEye(g, -0.1, -1.4, 0.036);
    glassEye(g, 0.1, -1.4, 0.036);
  }, BEAR.s);
}

// ---------- The fox (right wall): definitely stuffed ----------
const FOXAT = { x: 10.0, y: 1.0, z: 0.4, s: 1.2 };
// Its tail flicks once, twice a loop.
const TWITCH = [44, 131.5];
function foxTail(t) {
  const s = tt(t);
  for (const w of TWITCH) {
    const k = (s - w) / 0.45;
    if (k >= 0 && k < 1) return Math.sin(k * TAU) * 0.55 * (1 - k);
  }
  return 0;
}
function drawFox(ctx, t) {
  plinth(ctx, 9.5, 0.6, 1, 0.8, FOXAT.z);
  plate(ctx, 'y', 1.47, 10.0, 0.23, 0.95, 0.18, ['DEFINITELY STUFFED'], 0.085);
  bb(ctx, FOXAT.x, FOXAT.y, FOXAT.z, true, (g) => {
    // tail up over its back, flicking
    g.save();
    g.translate(-0.4, -0.54);
    g.rotate(-foxTail(t));
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(-0.28, -0.02, -0.4, -0.22, -0.34, -0.5);
    g.bezierCurveTo(-0.3, -0.66, -0.12, -0.7, -0.08, -0.6);
    g.bezierCurveTo(-0.16, -0.46, -0.12, -0.22, 0.06, -0.14);
    g.closePath();
    paint(g, FOX, { dots: shade(FOX, 0.4), density: 0.2 });
    g.beginPath();
    g.moveTo(-0.33, -0.52);
    g.bezierCurveTo(-0.3, -0.66, -0.12, -0.7, -0.08, -0.6);
    g.quadraticCurveTo(-0.2, -0.56, -0.33, -0.52);
    paint(g, INK.bone, { lw: 0.03 });
    g.restore();
    const legs = shade(FUR_D, 0.2);
    for (const lx of [-0.26, 0.32]) { g.beginPath(); g.moveTo(lx, -0.42); g.lineTo(lx + 0.02, 0); limb(g, shade(legs, 0.2), 0.06); }
    g.beginPath();
    g.moveTo(-0.46, -0.52);
    g.bezierCurveTo(-0.3, -0.7, 0.2, -0.72, 0.38, -0.66);
    g.bezierCurveTo(0.48, -0.6, 0.46, -0.44, 0.36, -0.4);
    g.bezierCurveTo(0.1, -0.36, -0.3, -0.36, -0.44, -0.42);
    g.closePath();
    paint(g, FOX, { dots: shade(FOX, 0.4), density: 0.2 });
    for (const lx of [-0.34, 0.24]) { g.beginPath(); g.moveTo(lx, -0.44); g.lineTo(lx - 0.02, 0); limb(g, legs, 0.065); }
    ell(g, 0.4, -0.55, 0.08, 0.12, -0.3);
    paint(g, INK.bone, { stroke: false });
    g.beginPath();
    g.moveTo(0.34, -0.66);
    g.lineTo(0.46, -0.92);
    g.lineTo(0.58, -0.88);
    g.lineTo(0.84, -0.76);
    g.lineTo(0.62, -0.68);
    g.closePath();
    paint(g, FOX, { lw: 0.04 });
    g.beginPath(); g.moveTo(0.52, -0.73); g.lineTo(0.84, -0.76); g.lineTo(0.62, -0.68); g.closePath();
    paint(g, INK.bone, { stroke: false });
    for (const [ex, lean] of [[0.44, -0.2], [0.56, 0.1]]) {
      g.beginPath(); g.moveTo(ex - 0.06, -0.88); g.lineTo(ex + lean * 0.3, -1.08); g.lineTo(ex + 0.07, -0.88); g.closePath();
      paint(g, shade(FOX, 0.1), { lw: 0.03 });
    }
    ell(g, 0.84, -0.765, 0.03, 0.025);
    g.fillStyle = C.ink; g.fill();
    glassEye(g, 0.58, -0.82, 0.028, INK.candleGold);
  }, FOXAT.s);
}

// ---------- The peacock (front of the left wall) ----------
const PEACOCK = { x: 1.1, y: 14.5, z: 0.62, s: 1.3 };
function drawPeacock(ctx) {
  plinth(ctx, 0.6, 14, 1, 1, PEACOCK.z);
  plate(ctx, 'x', 1.67, 14.5, 0.37, 0.95, 0.22, ['STILL SHOWING OFF'], 0.085);
  bb(ctx, PEACOCK.x, PEACOCK.y, PEACOCK.z, false, (g) => {
    const cx = -0.08, cy = -0.46, R0 = 1.18, n = 15;
    g.beginPath();
    g.moveTo(cx, cy);
    g.arc(cx, cy, R0 * 0.94, Math.PI * 1.06, Math.PI * 1.94);
    g.closePath();
    paint(g, INK.verdigris, { dots: shade(INK.verdigris, 0.35), density: 0.3 });
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (1.08 + (0.84 * i) / (n - 1));
      const ex = cx + Math.cos(a) * R0 * 0.8, ey = cy + Math.sin(a) * R0 * 0.8;
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(ex, ey);
      g.strokeStyle = shade(INK.verdigris, 0.35); g.lineWidth = 0.02; g.stroke();
      ell(g, ex, ey, 0.13, 0.09, a); paint(g, mix(INK.verdigris, C.green, 0.3), { lw: 0.025 });
      ell(g, ex, ey, 0.085, 0.06, a); paint(g, BRASS, { stroke: false });
      ell(g, ex, ey, 0.05, 0.04, a); paint(g, INK.deepPlum, { stroke: false });
      ell(g, ex, ey, 0.022, 0.02, a); g.fillStyle = C.ink; g.fill();
    }
    for (const lx of [-0.04, 0.06]) { g.beginPath(); g.moveTo(lx, -0.3); g.lineTo(lx + 0.02, 0); limb(g, GREY, 0.035); }
    ell(g, 0, -0.44, 0.22, 0.17, -0.2);
    paint(g, PEA, { dots: shade(PEA, 0.4), density: 0.2 });
    ell(g, -0.06, -0.42, 0.14, 0.09, -0.2);
    paint(g, mix(FUR, INK.bone, 0.2), { lw: 0.03 });
    g.beginPath(); g.moveTo(0.1, -0.52); g.quadraticCurveTo(0.2, -0.72, 0.13, -0.95);
    limb(g, PEA, 0.1);
    g.beginPath(); g.arc(0.14, -0.98, 0.075, 0, TAU);
    paint(g, PEA, { lw: 0.035 });
    g.beginPath(); g.moveTo(0.2, -1.0); g.lineTo(0.3, -0.96); g.lineTo(0.2, -0.94);
    paint(g, GREY, { lw: 0.02 });
    g.strokeStyle = C.ink; g.lineWidth = 0.015;
    for (let i = 0; i < 4; i++) {
      const cxr = 0.08 + i * 0.035;
      g.beginPath(); g.moveTo(0.13, -1.04); g.lineTo(cxr, -1.2); g.stroke();
      g.beginPath(); g.arc(cxr, -1.21, 0.022, 0, TAU); g.fillStyle = PEA; g.fill();
    }
    g.fillStyle = INK.bone;
    ell(g, 0.16, -0.99, 0.04, 0.015); g.fill();
    glassEye(g, 0.16, -0.99, 0.018);
  }, PEACOCK.s);
}

// ---------- The owl, whose head turns ----------
// Its head is at z 3.1 (the find). s: its size; head: the head's center above
// its feet, in owl units.
const OWL = { x: 12.5, y: 2.5, s: 1.25, head: 0.72 };
OWL.z = 3.1 - (OWL.head * OWL.s) / ZK; // its feet, on the perch
// Where it can look: yaw in degrees (0 at you, -90 your left, 90 your right,
// 180 away) and a roll (a curious tilt, or upside down).
const LOOK = {
  room: [-30, 0], you: [0, 0], stand: [-96, 0], right: [96, 0], back: [180, 0],
  tilt: [-12, -0.85], upside: [0, Math.PI], library: [168, 0.3],
};
// Every lightning flash catches it somewhere new: its biggest turns.
const FLASH_LOOKS = ['back', 'you', 'stand', 'back', 'upside', 'you', 'back', 'you'];
// And it keeps turning in between, every five or six seconds. At 95, the
// scream, it looks round at the library, like everyone else.
const BETWEEN = [
  [0, 'room'], [11.5, 'room'], [17, 'stand'], [23, 'you'], [36, 'room'], [41.5, 'right'], [53.5, 'room'],
  [58.5, 'tilt'], [70, 'room'], [75.5, 'stand'], [90.5, 'you'], [95.3, 'library'], [101, 'room'],
  [123, 'room'], [136, 'tilt'], [141.5, 'room'], [147, 'right'], [158.5, 'room'], [164, 'stand'],
  [170, 'you'], [175.5, 'room'],
];

// ---------- The mouse ----------
// Its evening as keyframes [seconds, x, y, z, what it's doing]; between one
// key and the next it moves in a straight line (or stays put).
const HOME = [2.07, HOLE, 0];
const MK = [];
{
  let mt = 0, mp = HOME;
  const key = (pose) => MK.push([mt, mp[0], mp[1], mp[2], pose]);
  const stay = (until, pose) => { key(pose); mt = until; };
  const go = (p, pose = 'run', speed = 2.6) => {
    key(pose);
    mt += Math.hypot(p[0] - mp[0], p[1] - mp[1], (p[2] - mp[2]) * 1.6) / speed;
    mp = p;
  };
  stay(8.5, 'hide'); stay(11.5, 'peek'); stay(15, 'hide');
  // Out to see Mr. Tiddles, and up onto his head.
  go([2.55, 6.7, 0]); go([2.1, 7.8, 0]); go([1.3, 8.45, 0]); go([1.17, 8.6, 0]);
  go([1.17, 8.6, 0.93], 'climb', 1.5); go([0.9, 8.85, 0.93]); go([0.62, 9.02, 1.9], 'climb', 1.3);
  stay(mt + 7.5, 'sit');
  go([0.9, 8.85, 0.93], 'climb', 1.6); go([1.17, 8.6, 0.93]); go([1.17, 8.6, 0], 'climb', 2);
  go([1.4, 8.4, 0]); go([2.2, 7.5, 0]); go([2.45, 6.5, 0]); go(HOME);
  stay(60.5, 'hide'); stay(63, 'peek'); stay(112, 'hide');
  // The heist: a glass eye from the spill under the workbench, rolled home.
  go([3.3, 4.9, 0]); go([4.7, 3.65, 0]); go([6.3, 2.75, 0]); go([7.12, 2.24, 0]);
  stay(mt + 0.9, 'grab');
  go([6.3, 2.75, 0], 'push', 1.7); go([4.7, 3.65, 0], 'push', 1.7); go([3.3, 4.9, 0], 'push', 1.7); go(HOME, 'push', 1.7);
  stay(150.5, 'hide'); stay(153, 'peek'); stay(LOOP, 'hide');
  key('hide');
}
// Which way it faces: the way it last moved.
for (let i = 0, dir = 'r'; i < MK.length; i++) {
  const a = MK[i], b = MK[i + 1];
  if (b && (b[1] !== a[1] || b[2] !== a[2])) dir = (b[1] - a[1]) - (b[2] - a[2]) >= 0 ? 'r' : 'l';
  a[5] = dir;
}
function mouseAt(t) {
  const s = tt(t);
  let i = 0;
  while (i < MK.length - 2 && MK[i + 1][0] <= s) i++;
  const a = MK[i], b = MK[i + 1];
  const k = b[0] > a[0] ? clamp((s - a[0]) / (b[0] - a[0])) : 0;
  const pose = a[4];
  return {
    x: a[1] + (b[1] - a[1]) * k, y: a[2] + (b[2] - a[2]) * k, z: a[3] + (b[3] - a[3]) * k,
    pose, dir: a[5], up: b[3] >= a[3], out: pose !== 'hide' && pose !== 'peek', dist: s * 2.6,
  };
}

// The owl's head over the evening: keyframes of { t, yaw, roll }, from the
// flashes, the turns in between, and (while the mouse is out) the mouse.
function yawTo(x, y) {
  const dx = x - OWL.x, dy = y - OWL.y;
  return (Math.atan2(dx - dy, dx + dy) * 180) / Math.PI;
}
const OK = [];
{
  const add = (t, [yaw, roll], o = {}) => OK.push({ t, yaw, roll, ...o });
  BETWEEN.forEach(([t, p]) => add(t, LOOK[p]));
  storm.strikes.forEach((s, i) => add(s.t + 0.04, LOOK[FLASH_LOOKS[i % FLASH_LOOKS.length]], { flash: true }));
  for (let t = 0; t < LOOP; t += 0.5) {
    const m = mouseAt(t);
    if (!m.out) continue;
    // an owl's head moves in jerks: to the nearest 20 degrees
    add(t, [Math.round(clamp(yawTo(m.x, m.y), -110, 110) / 20) * 20, 0], { mouse: true });
  }
  OK.sort((a, b) => a.t - b.t);
  // While the mouse is out the owl watches nothing else; drop repeats.
  const kept = OK.filter((k) => k.mouse || !mouseAt(k.t).out);
  OK.length = 0;
  for (const k of kept) {
    const last = OK[OK.length - 1];
    if (last && last.yaw === k.yaw && last.roll === k.roll) continue;
    OK.push(k);
  }
}
const SNAP = 0.14; // how long a turn takes: quick, but you can see it happen
function owlLook(t) {
  const s = tt(t);
  let i = OK.length - 1;
  while (i > 0 && OK[i].t > s) i--;
  const cur = OK[i], prev = OK[(i + OK.length - 1) % OK.length];
  const k = clamp((s - cur.t) / SNAP);
  const e = k * k * (3 - 2 * k);
  return {
    yaw: prev.yaw + (cur.yaw - prev.yaw) * e,
    roll: prev.roll + (cur.roll - prev.roll) * e,
    since: s - cur.t,
    turn: Math.abs(cur.yaw - prev.yaw) + Math.abs(cur.roll - prev.roll) * 60,
    dirn: Math.sign(cur.yaw - prev.yaw || cur.roll - prev.roll),
  };
}
// A feather comes loose on the big turns and drifts down.
const BIG = OK.filter((k, i) => {
  const p = OK[(i + OK.length - 1) % OK.length];
  return Math.abs(k.yaw - p.yaw) >= 150 || Math.abs(k.roll - p.roll) > 2;
}).map((k) => k.t);
function featherAt(t) {
  const s = tt(t);
  let t0 = null;
  for (const b of BIG) if (b <= s) t0 = b;
  if (t0 == null || s - t0 > 3.4) return { x: -1e4, y: -1e4, off: true };
  const a = s - t0, k = clamp(a / 2.8);
  return {
    x: OWL.x + 0.5 * k + Math.sin(a * 3.2) * 0.18, y: OWL.y + 0.7 * k,
    z: Math.max(0.02, 3.0 - 3.0 * k), spin: Math.sin(a * 3.2) * 0.9, fade: clamp((3.4 - a) / 0.6),
  };
}

function owlHead(ctx, yaw, roll) {
  const a = (yaw * Math.PI) / 180;
  const f = Math.cos(a), s = Math.sin(a);
  ctx.save();
  ctx.rotate(roll);
  ell(ctx, 0, 0, 0.28, 0.25);
  paint(ctx, OWL_BUFF, { dots: OWL_SPECK, density: 0.28, lw: 0.04 });
  if (f > -0.3) {
    // the heart-shaped face, squeezed to one side as it turns
    const sx = clamp((f + 0.3) / 1.3, 0.1, 1);
    ctx.save();
    ctx.translate(s * 0.14, 0.02);
    ctx.scale(sx, 1);
    ctx.beginPath();
    ctx.moveTo(0, -0.14);
    ctx.bezierCurveTo(-0.06, -0.21, -0.2, -0.2, -0.21, -0.08);
    ctx.bezierCurveTo(-0.22, 0.06, -0.1, 0.16, 0, 0.21);
    ctx.bezierCurveTo(0.1, 0.16, 0.22, 0.06, 0.21, -0.08);
    ctx.bezierCurveTo(0.2, -0.2, 0.06, -0.21, 0, -0.14);
    paint(ctx, INK.bone, { lw: 0.035, stroke: OWL_RIM });
    for (const e of [-1, 1]) {
      ell(ctx, e * 0.085, -0.03, 0.048, 0.054);
      ctx.fillStyle = C.ink;
      ctx.fill();
      if (Q.detail) {
        ctx.beginPath();
        ctx.arc(e * 0.085 + 0.016, -0.05, 0.016, 0, TAU);
        ctx.fillStyle = C.white;
        ctx.fill();
      }
    }
    ctx.beginPath();
    ctx.moveTo(-0.025, 0.04); ctx.lineTo(0.025, 0.04); ctx.lineTo(0, 0.1);
    ctx.closePath();
    paint(ctx, mix(INK.bone, MAT.oak, 0.4), { lw: 0.02 });
    ctx.restore();
  } else if (Q.detail) {
    // the back of its head: a parting in the feathers
    ctx.beginPath();
    ctx.moveTo(s * 0.06, -0.22);
    ctx.quadraticCurveTo(s * 0.1, 0, s * 0.04, 0.22);
    ctx.strokeStyle = shade(OWL_BUFF, 0.35);
    ctx.lineWidth = 0.03;
    ctx.stroke();
  }
  ctx.restore();
}
function drawOwl(ctx, t) {
  // the perch: a turned stand with a branch across the top
  cylinder(ctx, OWL.x, OWL.y, 0, 0.42, 0.1, PLINTH, { top: PLINTH_TOP });
  cylinder(ctx, OWL.x, OWL.y, 0.1, 0.07, OWL.z - 0.2, PLINTH, { top: PLINTH_TOP });
  cylinder(ctx, OWL.x, OWL.y, 0.9, 0.11, 0.12, BRASS, { top: BRASS });
  bb(ctx, OWL.x, OWL.y, OWL.z - 0.1, false, (g) => {
    g.beginPath();
    g.moveTo(-0.5, -0.02); g.quadraticCurveTo(0, -0.12, 0.52, -0.06);
    g.moveTo(0.3, -0.07); g.lineTo(0.44, -0.2);
    limb(g, shade(PLINTH, 0.1), 0.1);
  });
  const L = owlLook(t);
  bb(ctx, OWL.x, OWL.y, OWL.z, false, (g) => {
    // wings folded behind, the body, the white chest, talons on the branch
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(sd * 0.2, -0.62);
      g.quadraticCurveTo(sd * 0.32, -0.3, sd * 0.06, 0.12);
      g.quadraticCurveTo(sd * 0.12, -0.3, sd * 0.02, -0.6);
      g.closePath();
      paint(g, shade(OWL_BUFF, 0.12), { dots: OWL_SPECK, density: 0.3, lw: 0.035 });
    }
    ell(g, 0, -0.34, 0.25, 0.35);
    paint(g, OWL_BUFF, { dots: OWL_SPECK, density: 0.28, lw: 0.04 });
    ell(g, 0, -0.28, 0.16, 0.26);
    paint(g, INK.bone, { dots: Q.detail ? OWL_SPECK : null, density: 0.06, stroke: false });
    g.strokeStyle = GREY; g.lineWidth = 0.025;
    for (const sd of [-1, 1]) {
      for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(sd * 0.08, 0); g.lineTo(sd * 0.08 + i * 0.04, 0.05); g.stroke(); }
    }
    g.translate(0, -OWL.head);
    owlHead(g, L.yaw, L.roll);
    // a whoosh while it turns
    if (L.since < 0.4 && L.turn > 25 && Q.detail) {
      const k = L.since / 0.4;
      g.strokeStyle = alpha(C.ink, 0.7 * (1 - k));
      g.lineWidth = 0.03;
      g.lineCap = 'round';
      for (const [r, a0, a1] of [[0.37, 3.6, 5.0], [0.45, 3.9, 4.8]]) {
        g.beginPath();
        if (L.dirn > 0) g.arc(0, 0, r, a0, a1); else g.arc(0, 0, r, Math.PI * 3 - a1, Math.PI * 3 - a0);
        g.stroke();
      }
    }
  }, OWL.s);
  // the tag tied to the perch
  bb(ctx, OWL.x, OWL.y, 1.35, false, (g) => {
    g.beginPath(); g.moveTo(0.05, -0.05); g.lineTo(0.16, 0.08);
    g.strokeStyle = C.ink; g.lineWidth = 0.015; g.stroke();
    g.save();
    g.translate(0.4, 0.2);
    g.rotate(0.08);
    g.beginPath(); g.rect(-0.34, -0.14, 0.68, 0.28);
    paint(g, INK.bone, { lw: 0.025 });
    if (Q.detail) {
      g.translate(0, -0.05); write(g, 'DOES NOT', 0.1, INK.oxblood);
      g.translate(0, 0.1); write(g, 'TURN ITS HEAD', 0.085, INK.oxblood);
    }
    g.restore();
  });
}

// ---------- Mr. Tiddles, 1971 (on the window seat) ----------
const CAT = { x: 0.55, y: 9.05, z: 0.93, s: 1.3 };
function drawSeat(ctx) {
  box(ctx, 0, 7.75, 0, 1.12, 2.5, 0.78, PLINTH, { lw: 0.04 });
  box(ctx, 0.02, 7.8, 0.78, 1.06, 2.4, 0.15, MAT.velvet, { top: mix(MAT.velvet, INK.bone, 0.12), lw: 0.035 });
  plate(ctx, 'x', 1.13, 9.0, 0.42, 1.3, 0.26, ['MR. TIDDLES, 1971'], 0.13);
  // Mr. Tiddles, from behind, watching the storm (as he has since 1971)
  bb(ctx, CAT.x, CAT.y, CAT.z, false, (g) => {
    g.beginPath();
    g.moveTo(0.18, -0.08);
    g.bezierCurveTo(0.42, -0.02, 0.5, 0.05, 0.46, 0.2);
    limb(g, BLACK, 0.08);
    g.beginPath(); g.arc(0.46, 0.21, 0.04, 0, TAU);
    paint(g, INK.bone, { stroke: false });
    ell(g, 0, -0.3, 0.27, 0.31);
    paint(g, BLACK, { dots: INK.deepPlum, density: 0.3, lw: 0.04 });
    g.beginPath(); g.arc(-0.07, -0.7, 0.2, 0, TAU);
    paint(g, BLACK, { lw: 0.04 });
    for (const [ex, lean] of [[-0.2, -0.06], [0.04, 0.05]]) {
      g.beginPath(); g.moveTo(ex - 0.06, -0.8); g.lineTo(ex + lean, -1.0); g.lineTo(ex + 0.08, -0.84); g.closePath();
      paint(g, BLACK, { lw: 0.035 });
    }
    g.beginPath(); g.moveTo(-0.24, -0.55); g.quadraticCurveTo(-0.06, -0.48, 0.12, -0.56);
    g.strokeStyle = INK.oxblood; g.lineWidth = 0.05; g.stroke();
    g.beginPath(); g.arc(-0.05, -0.49, 0.035, 0, TAU);
    paint(g, BRASS, { lw: 0.02 });
  }, CAT.s);
}

// ---------- The empty stand, marked GOOSE (a find) ----------
const STAND = { x: 7.5, y: 5.5, w: 1.2, d: 1.2, h: 0.82 };
function drawStand(ctx) {
  const { x, y, w, d, h } = STAND;
  // new, pale and polished: the only plinth in the room without a coat of dust
  plinth(ctx, x, y, w, d, h, MAT.oakLight, mix(MAT.oakLight, INK.bone, 0.35));
  plate(ctx, 'y', y + d + 0.07, x + w / 2, 0.45, 0.95, 0.3, ['GOOSE'], 0.22);
  if (Q.detail) {
    face(ctx, [[x + 0.15, y + d + 0.071, 0.2], [x + 0.28, y + d + 0.071, 0.2], [x + 0.08, y + d + 0.071, 0.64], [x + 0.02, y + d + 0.071, 0.64]], alpha(C.white, 0.35), { stroke: false });
  }
  // two webbed feet chalked on top, where it will stand, and a tape measure
  flat(ctx, h + 0.005, (g) => {
    g.strokeStyle = alpha(C.white, 0.9);
    g.lineWidth = 0.028;
    g.lineJoin = 'round';
    for (const [fx, fy] of [[x + 0.38, y + 0.46], [x + 0.7, y + 0.62]]) {
      g.beginPath();
      g.moveTo(fx, fy + 0.02);
      g.lineTo(fx + 0.19, fy - 0.12);
      g.lineTo(fx + 0.13, fy + 0.02);
      g.lineTo(fx + 0.21, fy + 0.11);
      g.lineTo(fx + 0.08, fy + 0.11);
      g.lineTo(fx + 0.02, fy + 0.22);
      g.closePath();
      g.stroke();
    }
    g.beginPath();
    g.rect(x + 0.18, y + 0.92, 0.8, 0.06);
    g.fillStyle = BRASS;
    g.fill();
    g.strokeStyle = C.ink;
    g.lineWidth = 0.015;
    g.stroke();
    if (Q.detail) {
      g.beginPath();
      for (let i = 1; i < 16; i++) { g.moveTo(x + 0.18 + i * 0.05, y + 0.92); g.lineTo(x + 0.18 + i * 0.05, y + (i % 4 ? 0.945 : 0.965)); }
      g.stroke();
    }
  });
  cylinder(ctx, x + 0.12, y + 0.95, h, 0.1, 0.1, INK.candleGold, { top: mix(INK.candleGold, INK.bone, 0.3) });
  // the price tag, on a string from the corner
  const [ax, ay] = P(x + w + 0.07, y + d + 0.07, h - 0.02);
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + 0.05, ay + 0.28);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.015; ctx.stroke();
  ctx.save();
  ctx.translate(ax + 0.1, ay + 0.44);
  ctx.rotate(-0.25);
  ctx.beginPath();
  ctx.moveTo(-0.16, -0.15); ctx.lineTo(0.07, -0.15); ctx.lineTo(0.16, 0); ctx.lineTo(0.07, 0.15); ctx.lineTo(-0.16, 0.15);
  ctx.closePath();
  paint(ctx, INK.bone, { lw: 0.02 });
  if (Q.detail) write(ctx, '£40', 0.11, INK.oxblood);
  ctx.restore();
}

// ---------- The Lord's desk and the order form (a find) ----------
const FORM = { x: 3.0, y: 12.1, z: 1.105 };
function drawDesk(ctx) {
  // his chair, pushed back from the desk
  const cx = 2.6, cy = 10.5;
  for (const [lx, ly] of [[cx + 0.65, cy + 0.65], [cx + 0.05, cy + 0.65], [cx + 0.65, cy + 0.05]]) box(ctx, lx, ly, 0, 0.1, 0.1, 0.8, C.ink, { flat: true, stroke: false });
  box(ctx, cx, cy, 0.8, 0.8, 0.8, 0.15, MAT.mahoganyDark, { lw: 0.035 });
  box(ctx, cx, cy - 0.05, 0.8, 0.8, 0.15, 1.05, MAT.mahoganyDark, { lw: 0.035 });
  box(ctx, cx + 0.04, cy + 0.1, 0.95, 0.72, 0.66, 0.08, MAT.velvet, { flat: true, lw: 0.03 });
  const x = 2, y = 11.5, w = 2, d = 1.2, h = 1.1;
  box(ctx, x + 0.05, y + 0.05, 0, 0.55, d - 0.1, h - 0.12, PLINTH, { lw: 0.04 });
  box(ctx, x + w - 0.6, y + 0.05, 0, 0.55, d - 0.1, h - 0.12, PLINTH, { lw: 0.04 });
  box(ctx, x + 0.6, y + d - 0.2, 0.3, w - 1.2, 0.12, h - 0.42, shade(PLINTH, 0.15), { flat: true, lw: 0.03 });
  if (Q.detail) {
    for (const px of [x + 0.08, x + w - 0.57]) {
      for (let i = 0; i < 3; i++) {
        const z0 = 0.1 + i * 0.3;
        face(ctx, [[px, y + d - 0.05, z0], [px + 0.49, y + d - 0.05, z0], [px + 0.49, y + d - 0.05, z0 + 0.24], [px, y + d - 0.05, z0 + 0.24]], shade(PLINTH, 0.08), { lw: 0.02 });
        disc(ctx, px + 0.245, y + d - 0.04, z0 + 0.12, 0.03, BRASS, { stroke: false });
      }
    }
  }
  box(ctx, x - 0.05, y - 0.05, h - 0.12, w + 0.1, d + 0.1, 0.12, PLINTH, { top: PLINTH_TOP, lw: 0.04 });
  face(ctx, [[x + 0.12, y + 0.1, h + 0.002], [x + w - 0.12, y + 0.1, h + 0.002], [x + w - 0.12, y + d - 0.1, h + 0.002], [x + 0.12, y + d - 0.1, h + 0.002]], LEATHER, { lw: 0.025, stroke: BRASS_D });
  // the order form
  flat(ctx, FORM.z, (g) => {
    g.translate(FORM.x, FORM.y);
    g.rotate(-0.1);
    g.beginPath();
    g.rect(-0.42, -0.47, 0.84, 0.94);
    paint(g, MAT.paper, { lw: 0.025 });
    // a bite out of the corner, the size of a beak
    g.beginPath();
    g.arc(0.42, 0.47, 0.1, Math.PI, Math.PI * 1.5);
    g.lineTo(0.42, 0.47);
    g.closePath();
    g.fillStyle = LEATHER;
    g.fill();
    g.beginPath();
    g.rect(-0.42, -0.47, 0.84, 0.16);
    g.fillStyle = INK.oxblood;
    g.fill();
    if (Q.detail) {
      g.save(); g.translate(0, -0.39); write(g, 'ORDER FORM', 0.1, INK.bone, FAT); g.restore();
      g.save(); g.translate(0, -0.2); write(g, '1 x GOOSE', 0.15, C.ink, FAT); g.restore();
      g.save(); g.translate(-0.08, -0.05); write(g, 'STUFFED.', 0.09, C.ink); g.restore();
      g.save(); g.translate(-0.06, 0.06); write(g, 'BY TUESDAY.', 0.09, INK.oxblood); g.restore();
      // the goose, sketched from life
      g.strokeStyle = C.ink;
      g.lineWidth = 0.02;
      g.lineCap = 'round';
      g.beginPath();
      g.ellipse(0.17, 0.27, 0.11, 0.06, 0, 0, TAU);
      g.moveTo(0.25, 0.24); g.quadraticCurveTo(0.3, 0.14, 0.27, 0.1);
      g.moveTo(0.3, 0.1); g.arc(0.27, 0.1, 0.03, 0, TAU);
      g.moveTo(0.3, 0.1); g.lineTo(0.36, 0.11);
      g.stroke();
      // his squiggle
      g.beginPath();
      g.moveTo(-0.34, 0.31);
      g.bezierCurveTo(-0.29, 0.19, -0.23, 0.37, -0.18, 0.27);
      g.bezierCurveTo(-0.14, 0.19, -0.09, 0.36, -0.04, 0.28);
      g.moveTo(-0.35, 0.37); g.lineTo(-0.03, 0.36);
      g.strokeStyle = INK.stormNavy;
      g.stroke();
    }
  });
  // an inkwell and quill, a jar of eyes and a magnifying glass
  cylinder(ctx, 3.72, 11.75, h, 0.09, 0.12, C.ink, { top: shade(C.ink, 0.2) });
  bb(ctx, 3.72, 11.75, h + 0.12, false, (g) => {
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(0.14, -0.3, 0.3, -0.46);
    g.quadraticCurveTo(0.22, -0.24, 0.02, 0);
    paint(g, INK.bone, { lw: 0.02 });
  });
  eyeJar(ctx, 2.3, 12.5, h, 0.13, 0.28, 3);
  flat(ctx, h + 0.01, (g) => {
    g.beginPath(); g.moveTo(3.55, 12.35); g.lineTo(3.3, 12.6);
    g.strokeStyle = C.ink; g.lineWidth = 0.08; g.lineCap = 'round'; g.stroke();
    g.strokeStyle = MAT.mahoganyDark; g.lineWidth = 0.05; g.stroke();
    g.beginPath(); g.arc(3.68, 12.22, 0.14, 0, TAU);
    paint(g, alpha(MAT.glass, 0.5), { lw: 0.03, stroke: BRASS_D });
  });
}

// A jar of glass eyes, all looking somewhere different.
function eyeJar(ctx, x, y, z, r, h, seed, lbl) {
  cylinder(ctx, x, y, z, r, h, JAR, { top: JAR, side: JAR });
  const [X, Y] = P(x, y, z);
  for (let i = 0; i < 5; i++) {
    const ex = X + (hash(seed, i) - 0.5) * r * 1.2, ey = Y - r * 0.4 - (i / 5) * h * ZK * 0.85;
    ctx.beginPath(); ctx.arc(ex, ey, r * 0.36, 0, TAU);
    paint(ctx, INK.bone, { lw: 0.012 });
    if (!Q.detail) continue;
    const a = hash(seed, i + 9) * TAU;
    ctx.beginPath(); ctx.arc(ex + Math.cos(a) * r * 0.12, ey + Math.sin(a) * r * 0.12, r * 0.18, 0, TAU);
    ctx.fillStyle = [INK.verdigris, INK.candleGold, FUR, INK.stormNavy][(i + seed) % 4];
    ctx.fill();
    ctx.beginPath(); ctx.arc(ex + Math.cos(a) * r * 0.15, ey + Math.sin(a) * r * 0.15, r * 0.08, 0, TAU);
    ctx.fillStyle = C.ink;
    ctx.fill();
  }
  cylinder(ctx, x, y, z + h, r * 1.04, 0.05, BRASS_D, { top: BRASS });
  if (lbl && Q.detail) {
    const [lx, ly] = P(x, y, z + h * 0.5);
    ctx.beginPath(); ctx.rect(lx - r * 1.0, ly - 0.055, r * 2.0, 0.11);
    paint(ctx, INK.bone, { lw: 0.012 });
    ctx.save(); ctx.translate(lx, ly); write(ctx, lbl, 0.065, C.ink, SANS, r * 1.9); ctx.restore();
  }
}

// ---------- The workbench, the squirrel, the glue pot ----------
const BENCH = { x: 6.9, y: 0, w: 2.4, d: 1.1, h: 1.02 };
function drawBench(ctx) {
  const { x, y, w, d, h } = BENCH;
  for (const [lx, ly] of [[x + 0.08, y + d - 0.2], [x + w - 0.2, y + d - 0.2]]) box(ctx, lx, ly, 0, 0.12, 0.12, h - 0.1, shade(MAT.oak, 0.25), { flat: true, lw: 0.03 });
  box(ctx, x + 0.08, y + 0.1, 0.25, w - 0.16, d - 0.25, 0.06, shade(MAT.oak, 0.2), { flat: true, lw: 0.03 });
  // a sack of stuffing on the shelf underneath
  bb(ctx, x + 0.75, y + 0.55, 0.31, false, (g) => {
    g.beginPath();
    g.moveTo(-0.32, 0); g.quadraticCurveTo(-0.38, -0.36, -0.2, -0.48); g.lineTo(0.2, -0.5); g.quadraticCurveTo(0.38, -0.36, 0.32, 0);
    g.closePath();
    paint(g, mix(MAT.pine, INK.bone, 0.2), { dots: shade(MAT.pine, 0.4), density: 0.2, lw: 0.035 });
    g.fillStyle = mix(INK.candleGold, INK.bone, 0.45);
    for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(-0.14 + i * 0.06, -0.5 - (i % 2) * 0.05, 0.05, 0.03, i, 0, TAU); g.fill(); }
    if (Q.detail) write(g, 'STUFFING', 0.09, INK.oxblood);
  });
  box(ctx, x, y, h - 0.1, w, d, 0.1, MAT.oak, { top: MAT.oakLight, lw: 0.04 });
  box(ctx, x + w - 0.28, y + d - 0.34, h, 0.24, 0.3, 0.18, GREY, { lw: 0.03 });
  flat(ctx, h + 0.005, (g) => {
    g.fillStyle = INK.bone;
    for (const [sx, sy] of [[7.25, 0.85], [7.95, 0.3], [7.7, 0.95], [8.05, 0.9]]) { g.beginPath(); g.ellipse(sx, sy, 0.08, 0.06, 0, 0, TAU); g.fill(); }
    g.strokeStyle = C.ink; g.lineWidth = 0.02;
    g.beginPath(); g.moveTo(8.45, 0.72); g.lineTo(8.72, 0.98); g.moveTo(8.72, 0.72); g.lineTo(8.45, 0.98); g.stroke();
    g.beginPath(); g.arc(8.42, 0.69, 0.04, 0, TAU); g.arc(8.75, 0.69, 0.04, 0, TAU); g.stroke();
  });
  cylinder(ctx, 8.2, 0.3, h, 0.06, 0.1, INK.oxblood, { top: INK.bone });
  // the squirrel: one eye in, the other on the bench, the tail not on yet
  bb(ctx, 7.55, 0.55, h, false, (g) => {
    const red = mix(FUR, INK.candleGold, 0.25);
    g.beginPath();
    g.moveTo(-0.24, 0);
    g.bezierCurveTo(-0.3, -0.26, -0.12, -0.4, 0.04, -0.36);
    g.bezierCurveTo(0.2, -0.32, 0.26, -0.14, 0.22, 0);
    g.closePath();
    paint(g, red, { dots: shade(red, 0.4), density: 0.2, lw: 0.035 });
    g.beginPath(); g.moveTo(-0.05, -0.32); g.lineTo(0.02, -0.05);
    g.strokeStyle = C.ink; g.lineWidth = 0.02; g.stroke();
    g.fillStyle = INK.bone;
    g.beginPath(); g.ellipse(0.0, -0.16, 0.05, 0.08, 0.2, 0, TAU); g.fill();
    g.beginPath(); g.arc(0.14, -0.4, 0.12, 0, TAU);
    paint(g, red, { lw: 0.035 });
    g.beginPath(); g.moveTo(0.1, -0.5); g.lineTo(0.12, -0.6); g.lineTo(0.17, -0.5);
    paint(g, red, { lw: 0.025 });
    g.beginPath(); g.arc(0.2, -0.42, 0.028, 0, TAU);
    g.fillStyle = C.black; g.fill();
    ell(g, 0.25, -0.37, 0.025, 0.018); g.fillStyle = C.ink; g.fill();
    g.beginPath(); g.moveTo(-0.02, -0.26); g.lineTo(-0.2, -0.46);
    g.strokeStyle = MAT.silver; g.lineWidth = 0.02; g.stroke();
    g.beginPath(); g.moveTo(-0.2, -0.46); g.quadraticCurveTo(-0.34, -0.3, -0.28, -0.02);
    g.strokeStyle = INK.oxblood; g.lineWidth = 0.012; g.stroke();
  }, 1.3);
  bb(ctx, 8.05, 0.72, h, false, (g) => {
    g.beginPath();
    g.moveTo(-0.18, -0.02);
    g.bezierCurveTo(-0.1, -0.2, 0.18, -0.24, 0.2, -0.08);
    g.bezierCurveTo(0.14, -0.02, 0.0, -0.05, -0.18, -0.02);
    paint(g, mix(FUR, INK.candleGold, 0.25), { dots: shade(FUR, 0.4), density: 0.25, lw: 0.03 });
  }, 1.3);
  bb(ctx, 7.85, 0.35, h, false, (g) => glassEye(g, 0, -0.04, 0.04, INK.candleGold));
  // the glue pot on its burner
  box(ctx, 8.72, 0.34, h, 0.3, 0.3, 0.12, BRASS_D, { lw: 0.025 });
  cylinder(ctx, 8.87, 0.49, h + 0.26, 0.14, 0.2, GREY, { top: mix(INK.candleGold, FUR, 0.4) });
  bb(ctx, 8.87, 0.49, h + 0.12, false, (g) => {
    g.strokeStyle = C.ink; g.lineWidth = 0.02;
    g.beginPath(); g.moveTo(-0.12, 0); g.lineTo(-0.1, -0.16); g.moveTo(0.12, 0); g.lineTo(0.1, -0.16); g.stroke();
  });
}
function drawBenchLife(ctx, t) {
  if (!Q.detail) return;
  // the burner's flame, and steam off the glue
  const [X, Y] = P(8.87, 0.49, BENCH.h + 0.12);
  const fl = 0.8 + 0.2 * Math.sin(t * 23) * Math.sin(t * 7);
  ctx.beginPath();
  ctx.moveTo(X - 0.05, Y); ctx.quadraticCurveTo(X, Y - 0.18 * fl, X + 0.05, Y);
  ctx.fillStyle = INK.candleGold;
  ctx.fill();
  particles(t, 5, 2.4, (k, r) => {
    const x0 = X + (r() - 0.5) * 0.14 + Math.sin(k * 5 + r() * 6) * 0.06 * k;
    const y0 = Y - 0.35 - k * 0.9;
    ctx.beginPath();
    ctx.arc(x0, y0, 0.03 + k * 0.07, 0, TAU);
    ctx.fillStyle = alpha(INK.bone, 0.45 * (1 - k));
    ctx.fill();
  }, 4);
}

// ---------- The curio cabinet (right wall) ----------
const CAB = { x: 12.6, y: 0, w: 2.8, d: 0.85, h: 3.9 };
function drawCabinet(ctx) {
  const { x, y, w, d, h } = CAB;
  box(ctx, x, y, 0, w, d, 0.55, PLINTH, { lw: 0.04 });
  box(ctx, x + w - 0.08, y, 0.55, 0.08, d, h - 0.85, PLINTH, { flat: true, lw: 0.035 });
  face(ctx, [[x, y + 0.02, 0.55], [x + w, y + 0.02, 0.55], [x + w, y + 0.02, h - 0.3], [x, y + 0.02, h - 0.3]], shade(INK.deepPlum, 0.15), { stroke: false });
  const shelves = [0.55, 1.62, 2.66];
  for (const z of shelves.slice(1)) box(ctx, x, y, z - 0.05, w - 0.08, d - 0.05, 0.05, PLINTH_TOP, { flat: true, lw: 0.025 });
  // bottom shelf: two frogs, taking tea
  for (const [fx, flip] of [[13.2, false], [14.1, true]]) {
    bb(ctx, fx, 0.42, 0.55, flip, (g) => {
      ell(g, 0, -0.18, 0.18, 0.16);
      paint(g, mix(INK.verdigris, C.green, 0.4), { dots: shade(INK.verdigris, 0.4), density: 0.25, lw: 0.03 });
      g.beginPath(); g.arc(0.08, -0.36, 0.1, 0, TAU);
      paint(g, mix(INK.verdigris, C.green, 0.4), { lw: 0.03 });
      glassEye(g, 0.12, -0.42, 0.03, INK.candleGold);
      g.beginPath(); g.moveTo(0.2, -0.22); g.lineTo(0.3, -0.16);
      g.strokeStyle = C.ink; g.lineWidth = 0.02; g.stroke();
      g.beginPath(); g.rect(0.26, -0.22, 0.08, 0.06);
      paint(g, INK.bone, { lw: 0.015 });
      g.beginPath(); g.rect(-0.06, -0.52, 0.16, 0.08); g.rect(-0.1, -0.45, 0.24, 0.025);
      paint(g, C.black, { stroke: false });
    }, 1.15);
  }
  bb(ctx, 13.65, 0.42, 0.55, false, (g) => {
    g.beginPath(); g.rect(-0.12, -0.2, 0.24, 0.2);
    paint(g, INK.bone, { lw: 0.02 });
    g.beginPath(); g.rect(-0.16, -0.02, 0.32, 0.03);
    paint(g, INK.bone, { lw: 0.02 });
  });
  // middle shelf: a hedgehog (a cactus) and a bear (probably)
  bb(ctx, 13.25, 0.42, shelves[1], false, (g) => {
    g.beginPath(); g.moveTo(-0.12, 0); g.lineTo(-0.1, -0.14); g.lineTo(0.1, -0.14); g.lineTo(0.12, 0); g.closePath();
    paint(g, MAT.terracotta, { lw: 0.025 });
    g.beginPath(); g.ellipse(0, -0.28, 0.1, 0.16, 0, 0, TAU);
    paint(g, MAT.leaf, { dots: shade(MAT.leaf, 0.4), density: 0.3, lw: 0.025 });
  }, 1.2);
  bb(ctx, 14.35, 0.42, shelves[1], false, (g) => {
    g.beginPath();
    g.moveTo(-0.28, 0); g.bezierCurveTo(-0.34, -0.3, -0.1, -0.46, 0.06, -0.4); g.bezierCurveTo(0.3, -0.36, 0.34, -0.1, 0.28, 0);
    g.closePath();
    paint(g, shade(FUR, 0.1), { dots: shade(FUR, 0.5), density: 0.4, lw: 0.03 });
    glassEye(g, 0.02, -0.26, 0.028);
    glassEye(g, 0.12, -0.27, 0.028);
  }, 1.15);
  // top shelf: the last dodo (a pigeon with a false beak)
  bb(ctx, 13.45, 0.42, shelves[2], false, (g) => {
    for (const lx of [-0.03, 0.05]) { g.beginPath(); g.moveTo(lx, -0.12); g.lineTo(lx, 0); limb(g, PINK, 0.025); }
    ell(g, 0, -0.24, 0.2, 0.14, -0.1);
    paint(g, GREY, { dots: shade(GREY, 0.4), density: 0.2, lw: 0.03 });
    g.beginPath(); g.arc(0.18, -0.4, 0.09, 0, TAU);
    paint(g, GREY, { lw: 0.03 });
    ell(g, 0.13, -0.32, 0.07, 0.05);
    paint(g, INK.verdigris, { dots: C.purple, density: 0.35, stroke: false });
    g.beginPath(); g.moveTo(0.24, -0.44); g.quadraticCurveTo(0.52, -0.46, 0.5, -0.32); g.quadraticCurveTo(0.4, -0.36, 0.24, -0.36);
    g.closePath();
    paint(g, mix(INK.candleGold, INK.bone, 0.3), { lw: 0.025 });
    g.beginPath(); g.moveTo(0.26, -0.44); g.quadraticCurveTo(0.12, -0.52, 0.1, -0.4);
    g.strokeStyle = INK.oxblood; g.lineWidth = 0.012; g.stroke();
    glassEye(g, 0.2, -0.42, 0.022, C.coral);
  }, 1.2);
  eyeJar(ctx, 14.55, 0.4, shelves[2], 0.15, 0.34, 11, 'SPARES');
  if (Q.detail) {
    txt(ctx, 'y', d - 0.05, 13.65, 0.63, 'FROGS, TAKING TEA', 0.065, BRASS);
    txt(ctx, 'y', d - 0.05, 13.25, shelves[1] + 0.02, 'HEDGEHOG', 0.065, BRASS);
    txt(ctx, 'y', d - 0.05, 14.35, shelves[1] + 0.02, 'A BEAR, PROBABLY', 0.065, BRASS);
    txt(ctx, 'y', d - 0.05, 13.5, shelves[2] + 0.02, 'THE LAST DODO (A PIGEON)', 0.065, BRASS);
  }
  // the glass front, its frame and the crown on top
  face(ctx, [[x, y + d, 0.55], [x + w - 0.08, y + d, 0.55], [x + w - 0.08, y + d, h - 0.3], [x, y + d, h - 0.3]], alpha(MAT.glass, 0.16), { lw: 0.04 });
  if (Q.detail) {
    for (const [u0, z0, u1, z1] of [[x + 0.3, 1.2, x + 0.9, 2.6], [x + 0.5, 1.2, x + 0.9, 2.0], [x + 1.7, 2.3, x + 2.2, 3.4]]) {
      face(ctx, [[u0, y + d, z0], [u1, y + d, z1]], null, { lw: 0.035, stroke: alpha(C.white, 0.55) });
    }
  }
  for (const u of [x + 0.04, x + w / 2]) box(ctx, u - 0.04, y + d - 0.06, 0.55, 0.08, 0.08, h - 0.85, PLINTH, { flat: true, lw: 0.025 });
  box(ctx, x - 0.08, y, h - 0.3, w + 0.08, d + 0.1, 0.3, PLINTH, { top: PLINTH_TOP, lw: 0.04 });
  disc(ctx, x + w / 2 - 0.04, y + d + 0.02, 0.3, 0.04, BRASS, { stroke: false });
}

// ---------- Inspector, 1988 (under a glass dome) ----------
const DOME = { x: 13.6, y: 8.6 };
function drawDome(ctx) {
  const { x, y } = DOME;
  box(ctx, x - 0.36, y - 0.36, 0, 0.72, 0.72, 0.16, PLINTH, { flat: true, lw: 0.04 });
  box(ctx, x - 0.25, y - 0.25, 0.16, 0.5, 0.5, 0.86, PLINTH, { lw: 0.04, dens: 0.16 });
  box(ctx, x - 0.36, y - 0.36, 1.02, 0.72, 0.72, 0.12, PLINTH, { flat: true, top: PLINTH_TOP, lw: 0.04 });
  tag(ctx, x + 0.25, y + 0.25, 0.62, 0.62, 0.3, ['INSPECTOR,', '1988'], 0.1);
  cylinder(ctx, x, y, 1.14, 0.34, 0.06, MAT.mahoganyDark, { top: PLINTH_TOP });
  bb(ctx, x, y, 1.2, false, (g) => {
    for (const lx of [-0.04, 0.05]) { g.beginPath(); g.moveTo(lx, -0.14); g.lineTo(lx + 0.01, 0); limb(g, PINK, 0.025); }
    ell(g, -0.02, -0.26, 0.2, 0.14, -0.15);
    paint(g, GREY, { dots: shade(GREY, 0.4), density: 0.2, lw: 0.03 });
    g.beginPath(); g.moveTo(-0.2, -0.24); g.lineTo(-0.34, -0.14); g.lineTo(-0.18, -0.16);
    paint(g, shade(GREY, 0.2), { lw: 0.025 });
    g.beginPath(); g.arc(0.14, -0.44, 0.09, 0, TAU);
    paint(g, GREY, { lw: 0.03 });
    ell(g, 0.1, -0.34, 0.08, 0.06);
    paint(g, INK.verdigris, { dots: C.purple, density: 0.35, stroke: false });
    g.beginPath(); g.moveTo(0.22, -0.46); g.lineTo(0.31, -0.42); g.lineTo(0.22, -0.4);
    paint(g, shade(GREY, 0.5), { lw: 0.015 });
    glassEye(g, 0.17, -0.46, 0.022, C.coral);
    // his trilby, of course
    g.beginPath(); g.ellipse(0.13, -0.52, 0.15, 0.03, -0.1, 0, TAU);
    paint(g, C.brown, { lw: 0.02 });
    g.beginPath(); g.moveTo(0.04, -0.52); g.lineTo(0.06, -0.63); g.quadraticCurveTo(0.13, -0.6, 0.2, -0.64); g.lineTo(0.22, -0.53); g.closePath();
    paint(g, C.brown, { lw: 0.02 });
    g.fillStyle = C.ink;
    g.fillRect(0.05, -0.57, 0.16, 0.03);
    // the dome
    g.beginPath();
    g.moveTo(-0.4, 0.02);
    g.lineTo(-0.4, -0.52);
    g.arc(0, -0.52, 0.4, Math.PI, 0);
    g.lineTo(0.4, 0.02);
    paint(g, alpha(MAT.glass, 0.2), { lw: 0.035 });
    if (Q.detail) {
      g.beginPath(); g.arc(0, -0.52, 0.32, Math.PI * 1.1, Math.PI * 1.35);
      g.moveTo(-0.32, -0.5); g.lineTo(-0.32, -0.2);
      g.strokeStyle = alpha(C.white, 0.7); g.lineWidth = 0.035; g.lineCap = 'round'; g.stroke();
    }
  }, 1.15);
}

// ---------- The tiger rug (moth-eaten) ----------
const RUG = { y: 10.9 };
function tigerHide(g) {
  // half the outline, from the neck back to the tail, mirrored for the other side
  const half = [
    [12.6, 0.5], [12.25, 0.75], [12.45, 1.2], [12.75, 1.62], [12.5, 1.78], [12.25, 1.7], [11.85, 1.25],
    [11.4, 0.95], [10.4, 1.05], [9.4, 0.98], [9.0, 1.2], [8.85, 1.68], [8.55, 1.8], [8.35, 1.66], [8.25, 1.2], [8.2, 0.6], [8.05, 0.2],
  ];
  g.beginPath();
  half.forEach(([x, d], i) => (i ? g.lineTo(x, RUG.y - d) : g.moveTo(x, RUG.y - d)));
  for (let i = half.length - 1; i >= 0; i--) g.lineTo(half[i][0], RUG.y + half[i][1]);
  g.closePath();
}
function drawRug(ctx) {
  flat(ctx, 0.008, (g) => {
    // a felt backing, then the hide
    tigerHide(g);
    g.lineJoin = 'round';
    g.strokeStyle = C.ink; g.lineWidth = 0.36; g.stroke();
    g.strokeStyle = MAT.velvet; g.lineWidth = 0.28; g.stroke();
    tigerHide(g);
    paint(g, TIGER, { dots: shade(TIGER, 0.35), density: 0.12, lw: 0.03 });
    g.beginPath(); g.ellipse(10.3, RUG.y, 1.5, 0.35, 0, 0, TAU);
    g.fillStyle = mix(TIGER, INK.bone, 0.45); g.fill();
    g.fillStyle = C.black;
    for (let i = 0; i < 8; i++) {
      const sx = 8.7 + i * 0.47;
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(sx - 0.05, RUG.y + s * 0.3);
        g.quadraticCurveTo(sx + 0.12, RUG.y + s * 0.7, sx + 0.02, RUG.y + s * (1.0 + (i % 2) * 0.12));
        g.quadraticCurveTo(sx + 0.2, RUG.y + s * 0.66, sx + 0.08, RUG.y + s * 0.3);
        g.closePath();
        g.fill();
      }
    }
    // the tail, curling
    g.beginPath(); g.moveTo(8.1, RUG.y); g.bezierCurveTo(7.5, RUG.y - 0.1, 7.3, RUG.y + 0.9, 6.9, RUG.y + 0.8); g.quadraticCurveTo(6.6, RUG.y + 0.7, 6.75, RUG.y + 0.45);
    limb(g, TIGER, 0.16);
    // where the moths have been at it
    for (const [hx, hy, r] of [[9.35, 10.3, 0.13], [10.6, 11.55, 0.11], [11.2, 10.25, 0.09], [9.0, 11.45, 0.08], [10.15, 10.95, 0.07], [11.7, 11.3, 0.06]]) {
      g.beginPath();
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * TAU, rr = r * (0.7 + 0.5 * hash(Math.round(hx * 10), k));
        k ? g.lineTo(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr) : g.moveTo(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr);
      }
      g.closePath();
      paint(g, RM.floor, { lw: 0.02 });
    }
  });
}
// Its head, lying at the end of the rug, still hoping to look fierce.
function drawTigerHead(ctx) {
  bb(ctx, 12.95, RUG.y, 0, false, (g) => {
    for (const s of [-1, 1]) {
      g.beginPath(); g.arc(s * 0.3, -0.62, 0.11, 0, TAU);
      paint(g, TIGER, { lw: 0.035 });
      g.beginPath(); g.arc(s * 0.3, -0.62, 0.05, 0, TAU);
      paint(g, C.black, { stroke: false });
    }
    g.beginPath();
    g.moveTo(-0.42, -0.14);
    g.bezierCurveTo(-0.46, -0.6, -0.2, -0.72, 0, -0.72);
    g.bezierCurveTo(0.2, -0.72, 0.46, -0.6, 0.42, -0.14);
    g.bezierCurveTo(0.3, 0.02, -0.3, 0.02, -0.42, -0.14);
    paint(g, TIGER, { dots: shade(TIGER, 0.35), density: 0.15, lw: 0.04 });
    g.fillStyle = C.black;
    for (const [sx, sy, rot] of [[0, -0.64, 0], [-0.1, -0.6, -0.3], [0.1, -0.6, 0.3], [-0.34, -0.36, 0.4], [0.34, -0.36, -0.4]]) {
      g.beginPath(); g.ellipse(sx, sy, 0.02, 0.07, rot, 0, TAU); g.fill();
    }
    ell(g, 0, -0.22, 0.22, 0.16);
    paint(g, INK.bone, { lw: 0.03 });
    ell(g, 0, -0.1, 0.14, 0.09);
    paint(g, INK.oxblood, { lw: 0.03 });
    g.fillStyle = INK.bone;
    for (const s of [-1, 1]) {
      g.beginPath(); g.moveTo(s * 0.1, -0.17); g.lineTo(s * 0.07, -0.08); g.lineTo(s * 0.04, -0.17); g.closePath(); g.fill();
    }
    ell(g, 0, -0.3, 0.06, 0.04);
    g.fillStyle = PINK; g.fill();
    glassEye(g, -0.15, -0.44, 0.045, INK.candleGold);
    glassEye(g, 0.15, -0.44, 0.045, INK.candleGold);
  }, 1.2);
}

// ---------- On the walls ----------
// A wooden shield to mount a head on.
function shield(ctx, side, u, z, w, h) {
  onWall(ctx, side, (g) => {
    const a = side === 'left' ? -u : u;
    g.beginPath();
    g.moveTo(a - w / 2, -z - h / 2);
    g.lineTo(a + w / 2, -z - h / 2);
    g.lineTo(a + w / 2, -z + h * 0.15);
    g.quadraticCurveTo(a + w / 2, -z + h * 0.42, a, -z + h / 2);
    g.quadraticCurveTo(a - w / 2, -z + h * 0.42, a - w / 2, -z + h * 0.15);
    g.closePath();
    paint(g, PLINTH, { dots: shade(PLINTH, 0.4), density: 0.15, lw: 0.035 });
  });
}
// A small brass label on a wall.
function wallPlate(ctx, side, u, z, w, s, size = 0.09) {
  const f = side === 'left' ? onLeft : onRight;
  f(ctx, u - w / 2, z - 0.1, w, 0.2, BRASS, { lw: 0.02, stroke: BRASS_D });
  if (Q.detail) txt(ctx, side === 'left' ? 'x' : 'y', 0, u, z, s, size, ENGRAVE, SANS, w * 0.92);
}
// A head stands out from the wall a little.
const off = (side, u, z, d = 0.3) => (side === 'left' ? [d, u, z] : [u, d, z]);

function wartHog(ctx) {
  const side = 'left', u = 5.7, z = 4.2, s = 1.35;
  shield(ctx, side, u, z, 1.1, 1.25);
  wallPlate(ctx, side, u, z - 0.92, 1.6, 'GERALD. HE KNOWS WHAT HE DID.', 0.085);
  bb(ctx, ...off(side, u, z), false, (g) => {
    const skin = mix(INK.bone, INK.stormNavy, 0.5);
    g.beginPath();
    g.moveTo(-0.3, -0.34); g.lineTo(-0.52, -0.46); g.lineTo(-0.36, -0.18); g.closePath();
    g.moveTo(0.3, -0.34); g.lineTo(0.52, -0.46); g.lineTo(0.36, -0.18); g.closePath();
    paint(g, skin, { lw: 0.03 });
    g.beginPath();
    g.moveTo(-0.32, -0.36); g.quadraticCurveTo(0, -0.52, 0.32, -0.36);
    g.lineTo(0.2, 0.2); g.quadraticCurveTo(0, 0.28, -0.2, 0.2);
    g.closePath();
    paint(g, skin, { dots: shade(skin, 0.4), density: 0.25, lw: 0.035 });
    g.beginPath(); g.moveTo(-0.14, -0.5); for (let i = 0; i < 6; i++) g.lineTo(-0.12 + i * 0.05, -0.58 - (i % 2) * 0.08); g.lineTo(0.14, -0.5);
    paint(g, shade(FUR_D, 0.1), { lw: 0.02 });
    ell(g, 0, 0.18, 0.15, 0.08);
    paint(g, PINK, { lw: 0.03 });
    for (const sd of [-1, 1]) {
      g.beginPath(); g.moveTo(sd * 0.12, 0.12); g.quadraticCurveTo(sd * 0.34, 0.1, sd * 0.3, -0.12);
      limb(g, INK.bone, 0.045);
      g.beginPath(); g.arc(sd * 0.2, -0.04, 0.04, 0, TAU);
      paint(g, shade(skin, 0.1), { lw: 0.02 });
      glassEye(g, sd * 0.13, -0.2, 0.03, INK.candleGold);
    }
  }, s);
  for (const sd of [-1, 1]) eyeAt(...off(side, u, z), sd * 0.13, -0.2, s);
}
function moose(ctx) {
  const side = 'right', u = 5.5, z = 4.15, s = 1.35;
  shield(ctx, side, u, z, 1.05, 1.3);
  wallPlate(ctx, side, u, z - 0.98, 1.5, 'THE REST IS IN THE HALL', 0.09);
  bb(ctx, ...off(side, u, z, 0.35), false, (g) => {
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(sd * 0.18, -0.3);
      g.quadraticCurveTo(sd * 0.5, -0.36, sd * 0.66, -0.56);
      for (let i = 0; i < 5; i++) { g.lineTo(sd * (0.68 + i * 0.07), -0.68 - i * 0.07); g.lineTo(sd * (0.67 + i * 0.07), -0.6 - i * 0.07); }
      g.lineTo(sd * 1.02, -0.88);
      g.quadraticCurveTo(sd * 0.64, -0.86, sd * 0.46, -0.52);
      g.quadraticCurveTo(sd * 0.34, -0.4, sd * 0.16, -0.36);
      g.closePath();
      paint(g, ANTLER, { dots: shade(ANTLER, 0.3), density: 0.15, lw: 0.035 });
    }
    g.beginPath();
    g.moveTo(-0.2, -0.42);
    g.quadraticCurveTo(0, -0.5, 0.2, -0.42);
    g.quadraticCurveTo(0.22, -0.1, 0.18, 0.2);
    g.quadraticCurveTo(0.2, 0.36, 0, 0.38);
    g.quadraticCurveTo(-0.2, 0.36, -0.18, 0.2);
    g.quadraticCurveTo(-0.22, -0.1, -0.2, -0.42);
    paint(g, FUR_D, { dots: shade(FUR_D, 0.45), density: 0.22, lw: 0.035 });
    ell(g, 0, 0.26, 0.17, 0.12);
    paint(g, shade(FUR_D, 0.1), { lw: 0.03 });
    g.fillStyle = C.ink;
    ell(g, -0.06, 0.28, 0.025, 0.035); g.fill();
    ell(g, 0.06, 0.28, 0.025, 0.035); g.fill();
    for (const sd of [-1, 1]) {
      g.beginPath(); g.moveTo(sd * 0.18, -0.34); g.lineTo(sd * 0.36, -0.28); g.lineTo(sd * 0.2, -0.22); g.closePath();
      paint(g, FUR_D, { lw: 0.025 });
      glassEye(g, sd * 0.12, -0.18, 0.03, INK.candleGold);
    }
    g.beginPath(); g.moveTo(-0.04, 0.38); g.quadraticCurveTo(0, 0.6, 0.05, 0.38);
    paint(g, FUR_D, { lw: 0.025 });
  }, s);
  for (const sd of [-1, 1]) eyeAt(...off(side, u, z, 0.35), sd * 0.12, -0.18, s);
}
function jackalope(ctx) {
  const side = 'right', u = 3.1, z = 3.95, s = 1.35;
  shield(ctx, side, u, z, 0.8, 0.95);
  wallPlate(ctx, side, u, z - 0.74, 1.3, 'JACKALOPE (GENUINE)', 0.085);
  bb(ctx, ...off(side, u, z, 0.25), false, (g) => {
    const fur = mix(FUR, INK.bone, 0.35);
    for (const sd of [-1, 1]) {
      g.beginPath(); g.moveTo(sd * 0.06, -0.2); g.lineTo(sd * 0.18, -0.52); g.moveTo(sd * 0.13, -0.38); g.lineTo(sd * 0.24, -0.42);
      limb(g, ANTLER, 0.03);
      ell(g, sd * 0.16, -0.2, 0.06, 0.2, sd * 0.5);
      paint(g, fur, { lw: 0.03 });
    }
    g.beginPath(); g.arc(0, -0.02, 0.18, 0, TAU);
    paint(g, fur, { dots: shade(fur, 0.4), density: 0.2, lw: 0.035 });
    ell(g, 0, 0.06, 0.03, 0.02); g.fillStyle = PINK; g.fill();
    glassEye(g, -0.08, -0.06, 0.028);
    glassEye(g, 0.08, -0.06, 0.028);
    g.fillStyle = C.white;
    g.fillRect(-0.025, 0.1, 0.022, 0.05); g.fillRect(0.004, 0.1, 0.022, 0.05);
  }, s);
}
function teddy(ctx) {
  const side = 'right', u = 10.15, z = 3.5, s = 1.35;
  shield(ctx, side, u, z, 0.8, 0.95);
  wallPlate(ctx, side, u, z - 0.74, 1.2, 'BIG GAME, 1947', 0.1);
  bb(ctx, ...off(side, u, z, 0.25), false, (g) => {
    const fur = mix(INK.candleGold, FUR, 0.45);
    for (const sd of [-1, 1]) {
      g.beginPath(); g.arc(sd * 0.16, -0.18, 0.08, 0, TAU);
      paint(g, fur, { lw: 0.03 });
    }
    g.beginPath(); g.arc(0, -0.02, 0.2, 0, TAU);
    paint(g, fur, { dots: shade(fur, 0.35), density: 0.2, lw: 0.035 });
    ell(g, 0, 0.05, 0.09, 0.07);
    paint(g, mix(fur, INK.bone, 0.5), { lw: 0.025 });
    ell(g, 0, 0.03, 0.03, 0.02); g.fillStyle = C.ink; g.fill();
    g.fillStyle = C.black;
    for (const sd of [-1, 1]) { g.beginPath(); g.arc(sd * 0.08, -0.06, 0.028, 0, TAU); g.fill(); }
    // one ear sewn back on, a little crooked
    g.strokeStyle = C.ink; g.lineWidth = 0.012;
    g.beginPath(); for (let i = 0; i < 4; i++) { g.moveTo(-0.2 + i * 0.03, -0.14); g.lineTo(-0.18 + i * 0.03, -0.1); } g.stroke();
  }, s);
}
function fish(ctx) {
  const side = 'left', u = 14.3, z = 4.35;
  onWall(ctx, side, (g) => {
    const a = -u, b = -z;
    g.beginPath(); g.ellipse(a, b, 1.3, 0.38, 0, 0, TAU);
    paint(g, PLINTH, { dots: shade(PLINTH, 0.4), density: 0.15, lw: 0.035 });
    // a pike, jaws open
    const skin = mix(INK.verdigris, INK.candleGold, 0.3);
    g.beginPath();
    g.moveTo(a + 0.95, b - 0.02);
    g.lineTo(a + 0.66, b - 0.13);
    g.quadraticCurveTo(a, b - 0.26, a - 0.72, b - 0.06);
    g.lineTo(a - 1.02, b - 0.24); g.lineTo(a - 0.93, b); g.lineTo(a - 1.02, b + 0.22);
    g.lineTo(a - 0.72, b + 0.06);
    g.quadraticCurveTo(a, b + 0.22, a + 0.66, b + 0.09);
    g.lineTo(a + 0.95, b + 0.11);
    g.lineTo(a + 0.7, b + 0.02);
    g.closePath();
    paint(g, skin, { dots: shade(skin, 0.4), density: 0.25, lw: 0.035 });
    g.fillStyle = mix(skin, INK.bone, 0.5);
    for (let i = 0; i < 7; i++) { g.beginPath(); g.ellipse(a - 0.45 + i * 0.13, b - 0.05 + (i % 2) * 0.07, 0.035, 0.02, 0, 0, TAU); g.fill(); }
    g.fillStyle = C.white;
    for (let i = 0; i < 4; i++) g.fillRect(a + 0.72 + i * 0.045, b - 0.09, 0.018, 0.04);
    glassEye(g, a + 0.52, b - 0.08, 0.04, INK.candleGold);
  });
  wallPlate(ctx, side, u, z - 0.6, 2.0, 'THE ONE THAT GOT AWAY (IT DIDN\'T)', 0.09);
}

// ---------- The cuckoo clock (its cuckoo is stuffed too) ----------
// It keeps the evening's time, a minute a second, so it strikes midnight at 88
// with the grandfather clock downstairs. On the hour and the half hour the
// door opens and the cuckoo flops out, upside down, and says nothing.
const CLOCK = { y: 3.85, z: 3.95 };
const MIN_AT_ZERO = 22 * 60 + 32; // 10:32 pm when the loop starts, so 88 s is midnight
function cuckooOut(t) {
  const since = (MIN_AT_ZERO + tt(t)) % 30; // seconds since the last half hour
  if (since > 3.2) return 0;
  if (since < 0.25) return since / 0.25;
  if (since > 2.7) return 1 - (since - 2.7) / 0.5;
  return 1;
}
function drawClockBody(ctx) {
  const { y, z } = CLOCK;
  // pine-cone weights on their chains
  for (const [wy, wz] of [[y - 0.16, 2.5], [y + 0.16, 2.2]]) {
    const top = P(0.14, wy, z - 0.5), bot = P(0.14, wy, wz + 0.3);
    ctx.beginPath(); ctx.moveTo(top[0], top[1]); ctx.lineTo(bot[0], bot[1]);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02; ctx.stroke();
    bb(ctx, 0.14, wy, wz, false, (g) => {
      ell(g, 0, -0.18, 0.075, 0.17);
      paint(g, BRASS_D, { dots: shade(BRASS_D, 0.45), density: 0.45, lw: 0.025 });
    });
  }
  box(ctx, 0, y - 0.42, z - 0.5, 0.26, 0.84, 0.86, MAT.mahoganyDark, { lw: 0.035 });
  face(ctx, [[0.3, y - 0.56, z + 0.36], [0.3, y, z + 0.72], [0, y, z + 0.72], [0, y - 0.56, z + 0.36]], PLINTH, { lw: 0.035 });
  face(ctx, [[0.3, y + 0.56, z + 0.36], [0.3, y, z + 0.72], [0, y, z + 0.72], [0, y + 0.56, z + 0.36]], shade(PLINTH, 0.15), { lw: 0.035 });
  bb(ctx, 0.27, y, z - 0.1, false, (g) => {
    g.beginPath(); g.arc(0, 0, 0.26, 0, TAU);
    paint(g, INK.bone, { lw: 0.03 });
    if (!Q.detail) return;
    g.fillStyle = C.ink;
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; g.fillRect(Math.cos(a) * 0.2 - 0.01, Math.sin(a) * 0.2 - 0.01, 0.02, 0.02); }
    g.fillStyle = MAT.leaf;
    for (const [lx, ly] of [[-0.34, -0.28], [0.34, -0.28], [-0.36, 0.3], [0.36, 0.3]]) { g.beginPath(); g.ellipse(lx, ly, 0.08, 0.05, lx * ly * 8, 0, TAU); g.fill(); }
  });
  bb(ctx, 0.27, y, z + 0.32, false, (g) => {
    g.beginPath(); g.rect(-0.09, -0.12, 0.18, 0.18);
    paint(g, shade(PLINTH, 0.3), { lw: 0.025 });
  });
}
function drawClockLife(ctx, t) {
  const { y, z } = CLOCK;
  const m = MIN_AT_ZERO + tt(t);
  // the hands
  bb(ctx, 0.27, y, z - 0.1, false, (g) => {
    const mA = ((m % 60) / 60) * TAU, hA = (((m / 60) % 12) / 12) * TAU;
    g.strokeStyle = C.ink; g.lineCap = 'round';
    g.lineWidth = 0.035; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.sin(hA) * 0.12, -Math.cos(hA) * 0.12); g.stroke();
    g.lineWidth = 0.022; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.sin(mA) * 0.19, -Math.cos(mA) * 0.19); g.stroke();
  });
  // the pendulum, ticking
  bb(ctx, 0.24, y, z - 0.5, false, (g) => {
    g.rotate(Math.sin(t * Math.PI) * 0.22);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 0.62);
    g.strokeStyle = C.ink; g.lineWidth = 0.02; g.stroke();
    g.beginPath(); g.moveTo(0, 0.56); g.lineTo(0.07, 0.66); g.lineTo(0, 0.78); g.lineTo(-0.07, 0.66); g.closePath();
    paint(g, BRASS, { lw: 0.02 });
  });
  // the cuckoo
  const k = cuckooOut(t);
  if (k <= 0) return;
  const since = m % 30;
  const boing = since > 0.25 && since < 2.7 ? Math.sin((since - 0.25) * 11) * Math.exp(-(since - 0.25) * 2.2) * 0.12 : 0;
  bb(ctx, 0.27, y, z + 0.32, false, (g) => {
    g.beginPath(); g.rect(-0.09, -0.12, 0.18, 0.18);
    g.fillStyle = C.black; g.fill();
    // out on its spring, towards the room
    const ex = 0.3 * k, ey = 0.15 * k + boing;
    g.beginPath(); g.moveTo(0, -0.03);
    for (let i = 1; i <= 8; i++) g.lineTo((ex * i) / 8, -0.03 + (ey * i) / 8 + (i % 2 ? -0.03 : 0.03));
    g.strokeStyle = MAT.silver; g.lineWidth = 0.015; g.stroke();
    g.translate(ex, ey);
    g.rotate(Math.PI + boing * 3); // upside down, as stuffed things are when they fall out of clocks
    ell(g, 0, 0.02, 0.12, 0.075);
    paint(g, mix(FUR, INK.stormNavy, 0.3), { lw: 0.025 });
    g.beginPath(); g.arc(0.11, -0.04, 0.06, 0, TAU);
    paint(g, mix(FUR, INK.stormNavy, 0.3), { lw: 0.025 });
    g.beginPath(); g.moveTo(0.15, -0.05); g.lineTo(0.24, -0.03); g.lineTo(0.15, -0.01);
    paint(g, INK.candleGold, { lw: 0.015 });
    glassEye(g, 0.12, -0.05, 0.015);
  });
}

// ---------- The pegboard, the shelf of eyes and the signs ----------
function drawPegboard(ctx) {
  const x0 = 6.95, x1 = 9.25, z0 = 1.35, z1 = 3.05;
  onRight(ctx, x0, z0, x1 - x0, z1 - z0, MAT.pine, { dots: shade(MAT.pine, 0.45), density: 0.12, lw: 0.035 });
  onWall(ctx, 'right', (g) => {
    // each tool hangs over its painted outline
    const tools = (ghost) => {
      const ink = (c) => (ghost ? alpha(C.ink, 0.25) : c);
      g.save();
      if (ghost) g.translate(0.035, 0.035);
      g.lineWidth = 0.02;
      g.strokeStyle = C.ink;
      g.beginPath(); g.moveTo(7.15, -2.85); g.lineTo(7.95, -2.85); g.lineTo(7.95, -2.62); g.lineTo(7.15, -2.42); g.closePath();
      g.fillStyle = ink(MAT.silver); g.fill(); if (!ghost) g.stroke();
      g.beginPath(); g.rect(7.95, -2.9, 0.22, 0.32);
      g.fillStyle = ink(MAT.oak); g.fill(); if (!ghost) g.stroke();
      g.beginPath(); g.rect(8.46, -2.9, 0.05, 0.62);
      g.fillStyle = ink(MAT.oak); g.fill(); if (!ghost) g.stroke();
      g.beginPath(); g.rect(8.34, -2.95, 0.3, 0.1);
      g.fillStyle = ink(GREY); g.fill(); if (!ghost) g.stroke();
      g.beginPath(); g.moveTo(8.8, -2.95); g.lineTo(8.9, -2.62); g.lineTo(8.84, -2.3); g.moveTo(8.98, -2.95); g.lineTo(8.9, -2.62); g.lineTo(8.98, -2.3);
      g.strokeStyle = ink(GREY); g.lineWidth = 0.05; g.lineCap = 'round'; g.stroke();
      g.restore();
    };
    tools(true);
    tools(false);
    // scalpels, tweezers, brushes, and one empty outline where something went missing
    for (let i = 0; i < 5; i++) {
      const u = 7.15 + i * 0.16;
      g.beginPath(); g.moveTo(u, -2.2); g.lineTo(u, -1.7);
      g.strokeStyle = i < 2 ? MAT.silver : MAT.oak; g.lineWidth = 0.035; g.stroke();
      if (i >= 2) { g.beginPath(); g.ellipse(u, -1.66, 0.03, 0.06, 0, 0, TAU); g.fillStyle = INK.bone; g.fill(); }
    }
    g.beginPath(); g.ellipse(8.2, -1.95, 0.12, 0.2, 0, 0, TAU);
    g.strokeStyle = alpha(C.ink, 0.45); g.lineWidth = 0.02; g.setLineDash([0.05, 0.04]); g.stroke(); g.setLineDash([]);
    g.beginPath(); g.rect(8.55, -2.12, 0.55, 0.56);
    g.fillStyle = INK.bone; g.fill(); g.strokeStyle = C.ink; g.lineWidth = 0.015; g.stroke();
  });
  if (Q.detail) {
    txt(ctx, 'y', 0, 8.2, 1.62, '?', 0.14, alpha(C.ink, 0.5));
    txt(ctx, 'y', 0, 8.82, 2.0, 'TO DO:', 0.08, C.ink);
    txt(ctx, 'y', 0, 8.82, 1.88, 'SQUIRREL', 0.07, C.ink);
    txt(ctx, 'y', 0, 8.82, 1.77, 'MORE EYES', 0.07, C.ink);
    txt(ctx, 'y', 0, 8.82, 1.66, 'TUESDAY!!', 0.07, INK.oxblood);
  }
  // the shelf of eyes above
  box(ctx, 6.85, 0, 3.3, 2.5, 0.42, 0.07, PLINTH, { top: PLINTH_TOP, lw: 0.03 });
  const jars = [[7.25, 'BROWN'], [7.85, 'BLUE'], [8.45, 'ODD'], [9.05, 'JUDGING']];
  jars.forEach(([jx, lbl], i) => eyeJar(ctx, jx, 0.21, 3.37, 0.17, 0.4, 20 + i, lbl));
}

function drawSigns(ctx) {
  // an enamel sign over the cabinet
  onRight(ctx, 12.85, 4.3, 2.3, 0.7, INK.bone, { lw: 0.04 });
  onRight(ctx, 12.95, 4.38, 2.1, 0.54, null, { lw: 0.025, stroke: INK.oxblood });
  if (Q.detail) {
    txt(ctx, 'y', 0, 14.0, 4.77, 'PLEASE DO NOT', 0.17, INK.oxblood, FAT);
    txt(ctx, 'y', 0, 14.0, 4.53, 'FEED THE EXHIBITS', 0.17, INK.oxblood, FAT);
  }
  // his certificate over the desk
  onLeft(ctx, 11.55, 2.35, 1.3, 0.95, MAT.brass, { dots: MAT.brassDark, density: 0.25, lw: 0.035 });
  onLeft(ctx, 11.65, 2.45, 1.1, 0.75, INK.bone, { lw: 0.02 });
  if (Q.detail) {
    txt(ctx, 'x', 0, 12.2, 3.03, 'TAXIDERMIST', 0.11, C.ink, FAT);
    txt(ctx, 'x', 0, 12.2, 2.87, 'OF THE YEAR, 1966', 0.08, C.ink);
    txt(ctx, 'x', 0, 12.2, 2.68, '(RUNNER-UP)', 0.09, INK.oxblood);
  }
  // cobwebs in the back corner
  if (Q.detail) {
    ctx.strokeStyle = alpha(INK.bone, 0.6);
    ctx.lineWidth = 0.015;
    for (let i = 0; i < 4; i++) {
      const a = P(0, 0.2 + i * 0.22, 5.6), b = P(0.2 + i * 0.22, 0, 5.6), c = P(0, 0, 5.6 - 0.25 - i * 0.2);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(c[0], c[1], b[0], b[1]); ctx.stroke();
    }
    const o = P(0, 0, 5.6);
    for (const [x, y, z] of [[0, 1.2, 5.6], [1.2, 0, 5.6], [0, 0, 4.6]]) {
      const e = P(x, y, z);
      ctx.beginPath(); ctx.moveTo(o[0], o[1]); ctx.lineTo(e[0], e[1]); ctx.stroke();
    }
  }
}

// ---------- The mouse ----------
function drawMouse(ctx, t, p) {
  if (p.pose === 'hide') return;
  const [X, Y] = P(p.x, p.y, p.z);
  ctx.save();
  ctx.translate(X, Y);
  if (p.pose === 'peek') {
    // just a nose out of the hole, whiskers going
    const tw = Math.sin(t * 17) * 0.015;
    ctx.scale(1.2, 1.2);
    ctx.beginPath(); ctx.moveTo(-0.04, -0.02); ctx.quadraticCurveTo(0.02, -0.12, 0.1 + tw, -0.05); ctx.quadraticCurveTo(0.02, 0.0, -0.04, -0.02);
    paint(ctx, GREY, { lw: 0.02 });
    ctx.beginPath(); ctx.arc(-0.01, -0.1, 0.035, 0, TAU);
    paint(ctx, PINK, { lw: 0.015 });
    ctx.beginPath(); ctx.arc(0.04, -0.07, 0.012, 0, TAU); ctx.fillStyle = C.ink; ctx.fill();
    if (Q.detail) {
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.008;
      ctx.beginPath(); ctx.moveTo(0.1, -0.05); ctx.lineTo(0.18, -0.08 + tw); ctx.moveTo(0.1, -0.05); ctx.lineTo(0.18, -0.02 - tw); ctx.stroke();
    }
    ctx.restore();
    return;
  }
  const f = p.dir === 'l' ? -1 : 1;
  ctx.scale(f * 1.25, 1.25);
  if (p.pose === 'climb') ctx.rotate(p.up ? -1.35 : 1.35);
  if (p.pose === 'sit') {
    // on Mr. Tiddles' head, washing its face
    const w = Math.sin(t * 9) > 0;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-0.18, 0.04, -0.2, 0.14);
    ctx.strokeStyle = PINK; ctx.lineWidth = 0.018; ctx.stroke();
    ell(ctx, 0, -0.1, 0.07, 0.1);
    paint(ctx, GREY, { lw: 0.02 });
    ctx.beginPath(); ctx.arc(0.02, -0.22, 0.06, 0, TAU);
    paint(ctx, GREY, { lw: 0.02 });
    ctx.beginPath(); ctx.arc(-0.02, -0.28, 0.03, 0, TAU);
    paint(ctx, PINK, { lw: 0.012 });
    ctx.beginPath(); ctx.arc(w ? 0.07 : 0.05, w ? -0.2 : -0.16, 0.022, 0, TAU);
    ctx.fillStyle = PINK; ctx.fill();
    ctx.beginPath(); ctx.arc(0.05, -0.23, 0.01, 0, TAU); ctx.fillStyle = C.ink; ctx.fill();
    ctx.restore();
    return;
  }
  const run = p.pose !== 'grab';
  const bob = run ? Math.abs(Math.sin(t * 26)) * 0.02 : 0;
  ctx.beginPath(); ctx.moveTo(-0.1, -0.04); ctx.quadraticCurveTo(-0.24, -0.02 + Math.sin(t * 12) * 0.03, -0.3, -0.1);
  ctx.strokeStyle = PINK; ctx.lineWidth = 0.018; ctx.lineCap = 'round'; ctx.stroke();
  ell(ctx, 0, -0.06 - bob, 0.11, 0.06);
  paint(ctx, GREY, { lw: 0.02 });
  ctx.beginPath(); ctx.moveTo(0.06, -0.1 - bob); ctx.quadraticCurveTo(0.16, -0.1 - bob, 0.2, -0.05 - bob); ctx.quadraticCurveTo(0.12, -0.02 - bob, 0.06, -0.03 - bob);
  paint(ctx, GREY, { lw: 0.02 });
  ctx.beginPath(); ctx.arc(0.07, -0.13 - bob, 0.035, 0, TAU);
  paint(ctx, PINK, { lw: 0.012 });
  ctx.beginPath(); ctx.arc(0.12, -0.08 - bob, 0.01, 0, TAU); ctx.fillStyle = C.ink; ctx.fill();
  ctx.restore();
  // the eye it's rolling home
  if (p.pose === 'push') {
    const [ex, ey] = P(p.x + (p.dir === 'l' ? -0.16 : 0.12), p.y + (p.dir === 'l' ? 0.16 : -0.12), 0);
    const roll = -p.dist * 3;
    ctx.beginPath(); ctx.arc(ex, ey - 0.09, 0.09, 0, TAU);
    paint(ctx, INK.bone, { lw: 0.015 });
    ctx.beginPath(); ctx.arc(ex + Math.cos(roll) * 0.045, ey - 0.09 + Math.sin(roll) * 0.035, 0.04, 0, TAU);
    ctx.fillStyle = INK.verdigris; ctx.fill();
    ctx.beginPath(); ctx.arc(ex + Math.cos(roll) * 0.05, ey - 0.09 + Math.sin(roll) * 0.04, 0.018, 0, TAU);
    ctx.fillStyle = C.ink; ctx.fill();
  }
}

// ---------- Moths (they ate the tiger) ----------
// They circle the lamp, and the candle on the desk while the lamp is off.
const LAMP = [6, 10, 2.75], FLAME = [2.25, 11.7, 1.62];
function mothAt(t, i) {
  const s = tt(t);
  let g = 0;
  if (s >= 82 && s < 95) g = clamp((s - 82) / 1.4);
  else if (s >= 95 && s < 97) g = 1 - clamp((s - 95) / 1.4);
  const a = t * (1.6 + i * 0.35) + i * 2.1;
  const r = 0.35 + 0.18 * Math.sin(t * 0.7 + i);
  const c = [0, 1, 2].map((j) => LAMP[j] + (FLAME[j] - LAMP[j]) * g);
  return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, c[2] + Math.sin(t * 2.3 + i * 1.7) * 0.18];
}

// ---------- The Lord's armchair, and his footstool (a tortoise) ----------
function drawArmchair(ctx) {
  const x = 3.9, y = 8.6, v = MAT.velvet, vd = MAT.velvetDark;
  for (const [lx, ly] of [[x + 0.1, y + 1.02], [x + 1.02, y + 1.02], [x + 1.02, y + 0.1]]) box(ctx, lx, ly, 0, 0.1, 0.1, 0.22, C.ink, { flat: true, stroke: false });
  // the tall back and its wings, the seat, the arms
  box(ctx, x, y, 0.22, 0.3, 1.25, 1.75, vd, { lw: 0.04, top: v });
  box(ctx, x + 0.3, y + 0.05, 0.22, 0.95, 1.15, 0.38, vd, { lw: 0.04, top: v });
  box(ctx, x + 0.32, y + 0.12, 0.6, 0.85, 1.0, 0.1, v, { lw: 0.035, top: mix(v, INK.bone, 0.12) });
  for (const ay of [y, y + 1.0]) box(ctx, x + 0.3, ay, 0.6, 0.9, 0.25, 0.42, v, { lw: 0.035, top: mix(v, INK.bone, 0.12) });
  for (const wy of [y, y + 1.0]) box(ctx, x + 0.3, wy, 1.02, 0.22, 0.25, 0.85, vd, { lw: 0.035, top: v });
  if (Q.detail) {
    // buttons on the back
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) disc(ctx, x + 0.31, y + 0.35 + i * 0.28, 1.2 + j * 0.3, 0.025, BRASS, { stroke: false });
  }
  // his newspaper, left on the seat
  flat(ctx, 0.71, (g) => {
    g.translate(4.75, 9.2);
    g.rotate(0.3);
    g.beginPath(); g.rect(-0.3, -0.22, 0.6, 0.44);
    paint(g, INK.bone, { lw: 0.02 });
    if (Q.detail) {
      g.fillStyle = alpha(C.ink, 0.55);
      g.fillRect(-0.25, -0.17, 0.5, 0.07);
      for (let i = 0; i < 4; i++) g.fillRect(-0.25, -0.05 + i * 0.06, i % 2 ? 0.3 : 0.5, 0.025);
    }
  });
}
function drawTortoise(ctx) {
  bb(ctx, 5.85, 9.2, 0, false, (g) => {
    for (const lx of [-0.26, 0.24]) { g.beginPath(); g.rect(lx - 0.05, -0.14, 0.1, 0.14); paint(g, mix(MAT.leaf, FUR_D, 0.4), { lw: 0.025 }); }
    g.beginPath(); g.arc(0.38, -0.2, 0.08, 0, TAU);
    paint(g, mix(MAT.leaf, FUR_D, 0.4), { lw: 0.025 });
    glassEye(g, 0.41, -0.22, 0.018);
    g.beginPath(); g.ellipse(0, -0.2, 0.36, 0.2, 0, Math.PI, 0); g.closePath();
    paint(g, mix(MAT.oak, FUR_D, 0.35), { lw: 0.035 });
    g.strokeStyle = shade(MAT.oak, 0.5); g.lineWidth = 0.02;
    for (const [a, b] of [[-0.18, -0.34], [0.0, -0.4], [0.18, -0.34]]) { g.beginPath(); g.moveTo(a, -0.2); g.lineTo(b * 0.5, b); g.stroke(); }
    // the cushion he rests his feet on
    g.beginPath(); g.ellipse(0, -0.42, 0.28, 0.09, 0, 0, TAU);
    paint(g, MAT.velvet, { lw: 0.03 });
    if (Q.detail) {
      g.beginPath(); g.rect(-0.2, -0.08, 0.4, 0.1);
      paint(g, BRASS, { lw: 0.015, stroke: BRASS_D });
      g.save(); g.translate(0, -0.03); write(g, 'FOOTSTOOL', 0.06, ENGRAVE); g.restore();
    }
  }, 1.1);
}

// ---------- A crate from the supplier, with something in it ----------
// Stencilled LIVE ANIMAL, with LIVE crossed out. The eyes in the gap blink.
const CRATE = { x: 5.5, y: 14.0, w: 1.1, d: 0.95, h: 0.78 };
function drawCrate(ctx) {
  const { x, y, w, d, h } = CRATE;
  box(ctx, x, y, 0, w, d, h, MAT.pine, { lw: 0.04, dotsL: shade(MAT.pine, 0.45) });
  if (Q.detail) {
    for (const z of [0.26, 0.52]) face(ctx, [[x, y + d, z], [x + w, y + d, z]], null, { lw: 0.02, stroke: shade(MAT.pine, 0.4) });
    for (const z of [0.26, 0.52]) face(ctx, [[x + w, y, z], [x + w, y + d, z]], null, { lw: 0.02, stroke: shade(MAT.pine, 0.4) });
    txt(ctx, 'y', y + d, x + w / 2, 0.44, 'LIVE ANIMAL', 0.13, alpha(C.ink, 0.75));
    face(ctx, [[x + 0.1, y + d, 0.5], [x + 0.52, y + d, 0.38]], null, { lw: 0.035, stroke: INK.oxblood });
    txt(ctx, 'y', y + d, x + 0.38, 0.62, 'STUFFED', 0.1, INK.oxblood, FAT);
    txt(ctx, 'x', x + w, y + d / 2, 0.36, 'THIS WAY UP', 0.075, alpha(C.ink, 0.7));
  }
  // straw sticking out under the lid, which is propped half open
  flat(ctx, h, (g) => {
    g.fillStyle = mix(INK.candleGold, INK.bone, 0.35);
    for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(x + 0.15 + hash(i, 4) * 0.8, y + 0.1 + hash(i, 5) * 0.75, 0.09, 0.03, hash(i, 6) * 3, 0, TAU); g.fill(); }
  });
  face(ctx, [[x - 0.02, y - 0.02, h + 0.22], [x + w + 0.02, y - 0.02, h + 0.22], [x + w + 0.02, y + d * 0.55, h + 0.02], [x - 0.02, y + d * 0.55, h + 0.02]], shade(MAT.pine, 0.1), { lw: 0.035, dots: shade(MAT.pine, 0.4), density: 0.1 });
}
function crateEyes(t) {
  // blink every seven seconds or so; look about in between
  const s = tt(t);
  const b = (s % 7.3) < 0.16 || (s % 11.1) < 0.14;
  return { open: !b, look: Math.sin(s * 0.9) * 0.02 };
}

// ---------- An ostrich, shy ----------
const OSTRICH = { x: 14.4, y: 12.6 };
function drawOstrich(ctx) {
  const { x, y } = OSTRICH;
  cylinder(ctx, x, y, 0, 0.5, 0.12, PLINTH, { top: PLINTH_TOP });
  bb(ctx, x, y, 0.12, false, (g) => {
    // the fire bucket its head is in
    g.save();
    g.translate(-1.02, 0.28);
    g.beginPath(); g.moveTo(-0.2, -0.36); g.lineTo(0.2, -0.36); g.lineTo(0.16, 0); g.lineTo(-0.16, 0); g.closePath();
    paint(g, INK.oxblood, { dots: shade(INK.oxblood, 0.4), density: 0.15, lw: 0.035 });
    ell(g, 0, -0.36, 0.2, 0.05);
    paint(g, mix(INK.candleGold, INK.bone, 0.3), { lw: 0.03 });
    if (Q.detail) { g.translate(0, -0.18); write(g, 'FIRE', 0.1, INK.bone, FAT); }
    g.restore();
    // legs
    for (const [lx, bend] of [[-0.12, 0.1], [0.1, -0.06]]) {
      g.beginPath(); g.moveTo(lx, -1.0); g.lineTo(lx + bend, -0.5); g.lineTo(lx, 0);
      limb(g, PINK, 0.06);
      ell(g, lx + 0.06, -0.02, 0.1, 0.035); g.fillStyle = shade(PINK, 0.3); g.fill();
    }
    // the neck, all the way down into the bucket
    g.beginPath(); g.moveTo(-0.3, -1.28); g.bezierCurveTo(-0.7, -1.3, -0.95, -0.9, -1.02, -0.2);
    limb(g, PINK, 0.1);
    // the body: black plumes, white wingtips, a proud tail
    g.beginPath();
    g.moveTo(-0.46, -1.2);
    g.bezierCurveTo(-0.4, -1.62, 0.4, -1.66, 0.56, -1.36);
    g.bezierCurveTo(0.74, -1.5, 0.78, -1.3, 0.7, -1.16);
    g.bezierCurveTo(0.5, -0.92, -0.2, -0.86, -0.46, -1.2);
    paint(g, BLACK, { dots: INK.deepPlum, density: 0.3, lw: 0.04 });
    g.fillStyle = INK.bone;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(0.2 + i * 0.12, -1.02 - i * 0.05, 0.1, 0.05, -0.4, 0, TAU); g.fill(); }
    g.beginPath(); g.ellipse(0.72, -1.36, 0.1, 0.07, 0.5, 0, TAU); g.fill();
  }, 1.2);
  tag(ctx, x + 0.35, y + 0.35, 0.22, 0.8, 0.2, ['OSTRICH (SHY)'], 0.1);
}

// ---------- A penguin, a long way from home ----------
function drawPenguin(ctx) {
  const x = 10.9, y = 5.2;
  box(ctx, x - 0.35, y - 0.35, 0, 0.7, 0.7, 0.34, mix(INK.bone, MAT.glass, 0.4), { lw: 0.035, top: INK.bone, dotsL: MAT.glass });
  plate(ctx, 'y', y + 0.35, x, 0.17, 0.62, 0.16, ['VERY LOST'], 0.09);
  bb(ctx, x, y, 0.34, false, (g) => {
    ell(g, -0.07, -0.02, 0.09, 0.035); g.fillStyle = C.coral; g.fill();
    ell(g, 0.07, -0.02, 0.09, 0.035); g.fill();
    g.beginPath(); g.ellipse(0, -0.42, 0.26, 0.42, 0, 0, TAU);
    paint(g, BLACK, { lw: 0.04 });
    g.beginPath(); g.ellipse(0, -0.36, 0.17, 0.34, 0, 0, TAU);
    paint(g, INK.bone, { stroke: false });
    for (const sd of [-1, 1]) {
      g.beginPath(); g.moveTo(sd * 0.22, -0.6); g.quadraticCurveTo(sd * 0.42, -0.4, sd * 0.36, -0.18); g.lineTo(sd * 0.22, -0.34);
      paint(g, BLACK, { lw: 0.03 });
    }
    g.beginPath(); g.moveTo(-0.03, -0.66); g.lineTo(0.03, -0.66); g.lineTo(0, -0.58); g.closePath();
    paint(g, C.coral, { lw: 0.015 });
    glassEye(g, -0.07, -0.72, 0.025);
    glassEye(g, 0.07, -0.72, 0.025);
  }, 1.15);
}

// ---------- Build ----------
export default {
  id: 'taxidermy-room',
  name: 'Taxidermy Room',
  blurb: 'Stuffed everything, and one empty stand marked GOOSE. The owl turns its head whenever you look away.',

  build(R) {
    // ---- floor and walls ----
    R.floor((ctx) => {
      slab(ctx, RM.floor);
      planks(ctx, RM.floor, 0.72);
    });
    R.walls({
      left: PAPER_L, right: PAPER_R, cap: INK.bone, cut: INK.stormNavy,
      doors: DOORS['taxidermy-room'] || [],
    });
    stripes(R, 'left', STRIPE, { z: 1.12, step: 0.72, w: 0.24 });
    stripes(R, 'right', shade(STRIPE, 0.06), { z: 1.12, step: 0.72, w: 0.24 });
    R.decor((ctx) => {
      // dark panelling to the dado rail, and a picture rail at the top
      for (const f of [onLeft, onRight]) {
        f(ctx, 0, 0, 16, 1.02, TRIM, { stroke: false });
        if (Q.detail) for (let u = 0.25; u < 15.5; u += 1.55) f(ctx, u, 0.26, 1.3, 0.58, mix(TRIM, MAT.mahogany, 0.45), { lw: 0.02, stroke: shade(TRIM, 0.4) });
        f(ctx, 0, 0, 16, 0.16, shade(TRIM, 0.3), { stroke: false });
        f(ctx, 0, 1.0, 16, 0.12, MAT.mahogany, { lw: 0.025 });
        f(ctx, 0, 5.62, 16, 0.24, TRIM, { lw: 0.025 });
      }
    });

    // ---- the window onto the storm ----
    stormWindow(R, 'left', 8, 2, 2, 2.6);
    R.decor((ctx, t) => {
      // rain running down the glass, and a bat going past in two of the flashes
      ctx.save();
      ctx.beginPath();
      [[0, 8, 2], [0, 10, 2], [0, 10, 4.6], [0, 8, 4.6]].forEach(([x, y, z], i) => { const [X, Y] = P(x, y, z); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.closePath();
      ctx.clip();
      ctx.strokeStyle = alpha(INK.bone, 0.45);
      ctx.lineWidth = 0.025;
      ctx.beginPath();
      for (let i = 0; i < 9; i++) {
        const u = 8.1 + ((i * 0.37) % 1.8);
        const k = (t * (0.35 + hash(i, 3) * 0.3) + hash(i, 1)) % 1;
        const [X, Y] = P(0, u, 4.7 - k * 2.9);
        ctx.moveTo(X, Y); ctx.lineTo(X + 0.02, Y + 0.25);
      }
      ctx.stroke();
      const s = tt(t);
      for (const b0 of [29.9, 108.8]) {
        const k = (s - b0) / 1.6;
        if (k < 0 || k > 1) continue;
        const [X, Y] = P(0, 10.3 - k * 2.6, 3.0 + Math.sin(k * 9) * 0.25);
        const fl = Math.sin(t * 30);
        ctx.fillStyle = C.black;
        ctx.beginPath();
        ctx.ellipse(X, Y, 0.06, 0.04, 0, 0, TAU);
        ctx.moveTo(X, Y); ctx.lineTo(X - 0.28, Y - 0.12 * fl); ctx.lineTo(X - 0.14, Y + 0.02); ctx.lineTo(X - 0.08, Y);
        ctx.moveTo(X, Y); ctx.lineTo(X + 0.28, Y - 0.12 * fl); ctx.lineTo(X + 0.14, Y + 0.02); ctx.lineTo(X + 0.08, Y);
        ctx.fill();
      }
      ctx.restore();
    }, { anim: true });
    drapes(R, 'left', 8, 2, 2, 2.6, MAT.velvet);
    // a stuffed bat, hung from the curtain rail, turning in the draught
    R.decor((ctx, t) => {
      bb(ctx, 0.2, 10.95, 4.86, false, (g) => {
        g.rotate(Math.sin(t * 1.3) * 0.12);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 0.08);
        g.strokeStyle = C.ink; g.lineWidth = 0.015; g.stroke();
        g.beginPath();
        g.moveTo(0, 0.08);
        g.quadraticCurveTo(-0.14, 0.14, -0.1, 0.36);
        g.lineTo(0, 0.44);
        g.lineTo(0.1, 0.36);
        g.quadraticCurveTo(0.14, 0.14, 0, 0.08);
        paint(g, BLACK, { lw: 0.025 });
        g.beginPath(); g.moveTo(-0.05, 0.44); g.lineTo(-0.07, 0.52); g.lineTo(0, 0.47); g.lineTo(0.07, 0.52); g.lineTo(0.05, 0.44);
        paint(g, BLACK, { lw: 0.02 });
        glassEye(g, -0.025, 0.4, 0.014, INK.candleGold);
        glassEye(g, 0.025, 0.4, 0.014, INK.candleGold);
      }, 1.3);
    }, { anim: true });
    // lightning, thrown across the floor through the window
    R.rug((ctx, t) => {
      const k = storm.flash(t);
      if (k < 0.02) return;
      flat(ctx, 0.01, (g) => {
        g.fillStyle = alpha(NIGHT.flash, 0.55 * k);
        for (const [a, b] of [[8.05, 8.95], [9.05, 9.95]]) {
          for (const [z0, z1] of [[0.05, 1.2], [1.35, 2.5]]) {
            g.beginPath();
            g.moveTo(z0, a + z0 * 0.35); g.lineTo(z0, b + z0 * 0.35); g.lineTo(z1, b + z1 * 0.35); g.lineTo(z1, a + z1 * 0.35);
            g.closePath();
            g.fill();
          }
        }
      });
    }, { anim: true });

    // ---- on the walls ----
    R.decor((ctx) => {
      drawClockBody(ctx);
      wartHog(ctx);
      moose(ctx);
      jackalope(ctx);
      teddy(ctx);
      fish(ctx);
      drawPegboard(ctx);
      drawSigns(ctx);
    });
    R.decor((ctx, t) => drawClockLife(ctx, t), { anim: true });

    // ---- on the floor ----
    R.rug((ctx) => {
      // shadows under everything that stands
      flat(ctx, 0.004, (g) => {
        g.fillStyle = SHADOW;
        for (const [x, y, w, d] of [
          [0.95, 0.95, 1.7, 1.7], [4.45, 0.55, 2.3, 1.5], [0.55, 4.95, 1.7, 1.7], [9.45, 0.55, 1.3, 1.1], [0.55, 13.95, 1.3, 1.3],
          [7.45, 5.45, 1.5, 1.5], [1.9, 11.4, 2.4, 1.5], [0, 7.7, 1.35, 2.7], [13.2, 8.2, 0.95, 0.95], [6.85, 0, 2.6, 1.35],
          [12.55, 0, 3, 1.1], [3.85, 8.55, 1.5, 1.5], [5.45, 13.95, 1.35, 1.2], [10.5, 4.8, 0.95, 0.95],
        ]) { g.beginPath(); g.rect(x, y, w, d); g.fill(); }
        for (const [x, y, r] of [[OWL.x + 0.1, OWL.y + 0.1, 0.5], [6.1, 10.1, 0.35], [OSTRICH.x + 0.1, OSTRICH.y + 0.1, 0.6], [5.9, 9.25, 0.4]]) {
          g.beginPath(); g.ellipse(x, y, r, r, 0, 0, TAU); g.fill();
        }
      });
      drawRug(ctx);
      // sawdust under the workbench, and the jar of eyes it knocked off
      flat(ctx, 0.006, (g) => {
        g.fillStyle = alpha(MAT.pine, 0.7);
        for (let i = 0; i < 26; i++) { g.beginPath(); g.ellipse(7.0 + hash(i, 1) * 2.3, 0.9 + hash(i, 2) * 0.9, 0.05, 0.03, hash(i, 3) * 3, 0, TAU); g.fill(); }
        g.beginPath(); g.rect(7.45, 1.45, 0.42, 0.3);
        paint(g, JAR, { lw: 0.025 });
      });
      const [jx, jy] = P(7.45, 1.6, 0.15);
      ctx.beginPath(); ctx.ellipse(jx, jy, 0.1, 0.15, 0.4, 0, TAU);
      paint(ctx, JAR, { lw: 0.025 });
      for (const [ex, ey, c] of [[7.05, 2.05, INK.verdigris], [7.35, 2.3, INK.candleGold], [7.6, 2.02, FUR], [7.25, 1.78, INK.stormNavy], [7.8, 2.35, INK.verdigris]]) {
        const [X, Y] = P(ex, ey, 0);
        ctx.beginPath(); ctx.arc(X, Y - 0.08, 0.08, 0, TAU);
        paint(ctx, INK.bone, { lw: 0.015 });
        ctx.beginPath(); ctx.arc(X + 0.02, Y - 0.09, 0.038, 0, TAU);
        ctx.fillStyle = c; ctx.fill();
        ctx.beginPath(); ctx.arc(X + 0.025, Y - 0.095, 0.016, 0, TAU);
        ctx.fillStyle = C.ink; ctx.fill();
      }
      // drafts of the order form, screwed up round the bin
      for (const [bx, by] of [[4.4, 13.95], [5.05, 13.2], [4.25, 14.5]]) {
        const [X, Y] = P(bx, by, 0);
        ctx.beginPath();
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * TAU, r = 0.09 + hash(Math.round(bx * 7), k) * 0.05;
          k ? ctx.lineTo(X + Math.cos(a) * r, Y - 0.09 + Math.sin(a) * r) : ctx.moveTo(X + Math.cos(a) * r, Y - 0.09 + Math.sin(a) * r);
        }
        ctx.closePath();
        paint(ctx, MAT.paper, { lw: 0.02 });
      }
    });

    // ---- standing things ----
    R.thing(1.7, 1.7, (ctx) => drawStag(ctx));
    // a spider, letting itself down from the stag's antler
    R.thing(1.71, 1.71, (ctx, t) => {
      if (!Q.detail) return;
      const len = 0.25 + 0.55 * (0.5 - 0.5 * Math.cos((t * TAU) / 17));
      bb(ctx, STAG.x, STAG.y, STAG.z, true, (g) => {
        const [ax, ay] = STAG_TIP;
        const sy = ay + len + Math.sin(t * 1.7) * 0.02;
        g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax, sy);
        g.strokeStyle = alpha(INK.bone, 0.8); g.lineWidth = 0.01; g.stroke();
        g.strokeStyle = C.black; g.lineWidth = 0.012;
        for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) {
          g.beginPath(); g.moveTo(ax, sy + 0.03); g.lineTo(ax + sd * 0.07, sy - 0.02 + i * 0.03); g.lineTo(ax + sd * 0.09, sy + 0.03 + i * 0.03); g.stroke();
        }
        ell(g, ax, sy + 0.035, 0.035, 0.045); g.fillStyle = C.black; g.fill();
      }, STAG.s);
    }, { anim: true });
    R.thing(5.5, 1.8, (ctx) => drawBoar(ctx));
    R.thing(8.1, 1.1, (ctx) => drawBench(ctx));
    R.thing(8.12, 1.12, (ctx, t) => drawBenchLife(ctx, t), { anim: true });
    fire(R, 8.87, 0.49, BENCH.h + 0.2, 17, 1.3);
    R.thing(10.0, 1.4, (ctx, t) => drawFox(ctx, t), { anim: true });
    R.thing(14.0, 0.85, (ctx) => drawCabinet(ctx));
    R.thing(12.5, 2.5, (ctx, t) => drawOwl(ctx, t), { anim: true });
    R.thing(BEAR.x, BEAR.y, (ctx) => drawBear(ctx));
    R.thing(0.56, 9.0, (ctx) => drawSeat(ctx));
    R.thing(8.1, 6.7, (ctx) => drawStand(ctx));
    R.thing(10.9, 5.55, (ctx) => drawPenguin(ctx));
    R.thing(3.0, 12.7, (ctx) => drawDesk(ctx));
    candle(R, 2.25, 11.7, 1.1, 5);
    R.thing(4.5, 9.8, (ctx) => drawArmchair(ctx));
    R.thing(5.85, 9.3, (ctx) => drawTortoise(ctx));
    // the wastepaper basket by the desk
    R.thing(4.72, 13.7, (ctx) => {
      cylinder(ctx, 4.72, 13.45, 0, 0.26, 0.55, mix(MAT.pine, MAT.oak, 0.4), { top: shade(MAT.oak, 0.4) });
      const [X, Y] = P(4.72, 13.45, 0.55);
      ctx.beginPath(); ctx.arc(X - 0.05, Y - 0.04, 0.1, 0, TAU); ctx.arc(X + 0.1, Y - 0.02, 0.08, 0, TAU);
      paint(ctx, MAT.paper, { lw: 0.02 });
    });
    R.thing(6.05, 14.95, (ctx) => drawCrate(ctx));
    R.thing(6.06, 14.96, (ctx, t) => {
      // the eyes in the crate
      const e = crateEyes(t);
      const [X, Y] = P(CRATE.x + CRATE.w / 2, CRATE.y + CRATE.d * 0.62, CRATE.h + 0.07);
      for (const sd of [-1, 1]) {
        if (e.open) {
          ctx.beginPath(); ctx.ellipse(X + sd * 0.09, Y, 0.05, 0.035, 0, 0, TAU);
          ctx.fillStyle = INK.candleGold; ctx.fill();
          ctx.beginPath(); ctx.arc(X + sd * 0.09 + e.look, Y, 0.018, 0, TAU);
          ctx.fillStyle = C.black; ctx.fill();
        } else {
          ctx.beginPath(); ctx.moveTo(X + sd * 0.09 - 0.05, Y); ctx.lineTo(X + sd * 0.09 + 0.05, Y);
          ctx.strokeStyle = INK.candleGold; ctx.lineWidth = 0.02; ctx.stroke();
        }
      }
    }, { anim: true });
    R.thing(1.1, 14.5, (ctx) => drawPeacock(ctx));
    R.thing(13.6, 8.85, (ctx) => drawDome(ctx));
    R.thing(12.95, 11.2, (ctx) => drawTigerHead(ctx));
    R.thing(OSTRICH.x + 0.4, OSTRICH.y + 0.4, (ctx) => drawOstrich(ctx));
    // the standard lamp: a foot for the style sheet's lamp to stand on
    R.thing(5.99, 9.99, (ctx) => cylinder(ctx, 6, 10, 0, 0.3, 0.08, MAT.brassDark, { top: BRASS }));
    lamp(R, 6, 10);

    // The mouse, and the eye it rolls home.
    R.mover(mouseAt, drawMouse, { depth: (t) => { const p = mouseAt(t); return p.x + p.y + (p.z > 0.05 ? 3 : 0.3); } });
    // The owl's feather, when it turns too hard.
    R.mover(featherAt, (ctx, t, p) => {
      if (p.off) return;
      const [X, Y] = P(p.x, p.y, p.z);
      ctx.save();
      ctx.globalAlpha *= p.fade;
      ctx.translate(X, Y);
      ctx.rotate(p.spin);
      ctx.beginPath(); ctx.moveTo(-0.13, 0); ctx.quadraticCurveTo(0, -0.08, 0.13, 0); ctx.quadraticCurveTo(0, 0.05, -0.13, 0);
      paint(ctx, OWL_BUFF, { lw: 0.015 });
      ctx.restore();
    }, { bias: 0.2 });

    R.dark(house.dark);

    // ---- over everything: moths, and every glass eye catching the light ----
    eyeAt(STAG.x, STAG.y, STAG.z, 0.9, -1.87, STAG.s, true);
    for (const sd of [-1, 1]) eyeAt(BEAR.x, BEAR.y, BEAR.z, sd * 0.1, -1.4, BEAR.s);
    eyeAt(BOAR.x, BOAR.y, BOAR.z, 0.74, -0.72, BOAR.s);
    eyeAt(FOXAT.x, FOXAT.y, FOXAT.z, 0.58, -0.82, FOXAT.s, true);
    for (const sd of [-1, 1]) eyeAt(12.95, RUG.y, 0, sd * 0.15, -0.44, 1.2);
    eyeAt(PEACOCK.x, PEACOCK.y, PEACOCK.z, 0.16, -0.99, PEACOCK.s);
    eyeAt(DOME.x, DOME.y, 1.2, 0.17, -0.46, 1.15);
    for (const sd of [-1, 1]) eyeAt(10.9, 5.2, 0.34, sd * 0.07, -0.72, 1.15);
    R.air((ctx, t) => {
      if (!Q.detail) return;
      const dark = lightsOut(t), fl = storm.flash(t);
      for (let i = 0; i < 3; i++) {
        const [mx, my, mz] = mothAt(t, i);
        const [X, Y] = P(mx, my, mz);
        const w = Math.abs(Math.sin(t * 28 + i * 2)) * 0.07 + 0.02;
        ctx.fillStyle = mix(INK.bone, FUR, 0.3);
        ctx.beginPath();
        ctx.ellipse(X - w * 0.6, Y, w, 0.035, 0.4, 0, TAU);
        ctx.ellipse(X + w * 0.6, Y, w, 0.035, -0.4, 0, TAU);
        ctx.fill();
        ctx.fillStyle = C.ink;
        ctx.fillRect(X - 0.008, Y - 0.03, 0.016, 0.06);
      }
      const k = Math.max(fl, dark * (1 - fl) * 0.85);
      if (k < 0.05) return;
      ctx.fillStyle = fl > dark * 0.5 ? alpha(C.white, Math.min(1, fl * 1.4)) : alpha(INK.candleGold, 0.9 * dark);
      for (const [X, Y] of GLINTS) {
        const tw = 0.6 + 0.4 * Math.sin(t * 3 + X * 5);
        ctx.beginPath();
        ctx.arc(X, Y, 0.03 * tw + 0.012, 0, TAU);
        ctx.fill();
      }
      // and the owl's, wherever its head has got to
      const L = owlLook(t);
      const a = (L.yaw * Math.PI) / 180;
      if (Math.cos(a) > 0.2) {
        const [X, Y] = P(OWL.x, OWL.y, OWL.z);
        const hy = Y - OWL.head * OWL.s;
        const sx = clamp((Math.cos(a) + 0.3) / 1.3, 0.1, 1);
        for (const e of [-1, 1]) {
          const ex = (Math.sin(a) * 0.14 + e * 0.085 * sx) * OWL.s, ey = -0.01 * OWL.s;
          const rx = ex * Math.cos(L.roll) - ey * Math.sin(L.roll), ry = ex * Math.sin(L.roll) + ey * Math.cos(L.roll);
          ctx.beginPath(); ctx.arc(X + rx, hy + ry, 0.045, 0, TAU); ctx.fill();
        }
      }
    });

    // ---- the finds ----
    R.find({ id: 'order-form', label: 'An order form for a goose', at: [3, 12.1, 1.2], r: 0.7 });
    R.find({ id: 'empty-stand', label: 'An empty stand marked GOOSE', at: [8.1, 6.1, 0.95], r: 0.8 });
    R.find({ id: 'owl', label: 'The owl that turns its head', at: [12.5, 2.5, 3.1], r: 0.8 });
  },
};
