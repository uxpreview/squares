// Creative: mood boards on easels, a corkboard of rejected goose logos under a
// pink neon MAKE IT POP, the photo set for the mascot shoot (a red paper
// backdrop, a softbox and an umbrella strobe, a stool, TALENT: GOOSE) with
// Kyle the intern in a goose costume as the stand-in, a ping-pong table taped
// off until the pitch is done, a beanbag corner with a record player, and
// Theo kerning GANDER.
//
// Running gags. The shoot: the photographer waits all day for the talent and
// strobes Kyle every few seconds to keep her hand in, while the talent (the
// goose) sits under the drape on the set, a foot showing. Her sign counts the
// hours. The kerning: Theo nudges the N, and every hour Mo the art director
// walks over and nudges it back ("Nope."). At bear o'clock everyone runs to
// the glass, Kyle too, in the suit, and the photographer finally gets a shot
// of some talent. After the pitch the tape comes off the ping-pong table and
// Kyle (still in the suit) plays Mo. Under the front edge, on floor two,
// Gary's window is lit all day: nobody told him about the reorg.
import {
  C, Q, SKIN, box, face, paint, person, folk, speech, glow, label, shade, tint, mix, alpha, hash,
} from '../../../engine/art.js';
import { ZK } from '../../../engine/iso.js';
import { TONE, INK, BRAND } from '../style.js';
import {
  floorOf, backWall, sill, pod, staff, chair, screen, clutter, plant, mug, papers, DESK,
} from '../kit.js';
import { bearOClock, rushK, seated, watched, staffed, nightK, H } from '../clock.js';

const P3 = (x, y, z) => [x - y, (x + y) / 2 - z * ZK];
const DESK_TOP = DESK.top;

// ---------- Where things are ----------
const SET = { x0: 56.8, x1: 62.8, y: 6.6, h: 3.4, front: 10.0 }; // the backdrop and its sweep
const STOOL = [60.2, 8.8];
const DRAPE = [57.3, 8.4];
const STROBE = [62.65, 9.45];
const SOFTBOX = [57.0, 10.6];
const TRIPOD = [62.6, 10.9];
const SNAPPER = [63.6, 11.0]; // the photographer
const SIGN = [58.9, 11.2];
const TABLE = { x0: 64.6, y0: 14.6, x1: 69.4, y1: 17.2, h: 1.0 };
const BOARD = { x0: 62.1, x1: 65.1, y: 0.62, z0: 0.45, z1: 2.4 };
const EASELS = [[57.6, 17.2], [60.6, 16.9]];
const BEANBAG = [68.2, 8.6];
const DECKS = [70.5, 6.4];

// ---------- Drawing on a face ----------
// Sets ctx so (u, v) runs along a face: u along the vector U, v down along V
// (both 3D, per unit), from the 3D point O. Words and little pictures then
// draw flat in u, v.
function onFace(ctx, O, U, V) {
  const [X, Y] = P3(...O);
  ctx.transform(U[0] - U[1], (U[0] + U[1]) / 2 - U[2] * ZK, V[0] - V[1], (V[0] + V[1]) / 2 - V[2] * ZK, X, Y);
}
// Faces we can see: along x (toward +y), and along y (toward +x, u runs
// toward -y so words read left to right).
const ALONG_X = [1, 0, 0], ALONG_Y = [0, -1, 0], DOWN = [0, 0, -1];
function words(ctx, text, u, v, size, color, font = '"Rethink Sans", sans-serif', weight = 700, align = 'center') {
  ctx.save();
  ctx.scale(1 / 40, 1 / 40);
  ctx.font = `${weight} ${size * 40}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, u * 40, v * 40);
  ctx.restore();
}
function rr(ctx, u, v, w, h, fill, o = {}) {
  ctx.beginPath();
  ctx.rect(u, v, w, h);
  paint(ctx, fill, { lw: 0.025, ...o });
}
const COMIC = '"Comic Sans MS", "Comic Neue", cursive';
const BAGEL = '"Bagel Fat One", "Arial Black", sans-serif';

// A polyline, walked a fraction k of its length: [x, y, dx, dy].
function along(pts, k) {
  let len = 0;
  const seg = [];
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); len += d; }
  let s = Math.max(0, Math.min(1, k)) * len;
  for (let i = 0; i < seg.length; i++) {
    if (s <= seg[i] || i === seg.length - 1) {
      const a = pts[i], b = pts[i + 1], f = seg[i] ? Math.min(1, s / seg[i]) : 0;
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, b[0] - a[0], b[1] - a[1]];
    }
    s -= seg[i];
  }
  return [...pts[0], 0, 0];
}
const lengthOf = (pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
// Running for the glass at bear o'clock along a path (the first point is
// wherever they are now): where they are, facing the way they're going, and
// facing the lot once they're there.
function dash(t, path, travel, delay) {
  const r = rushK(t, travel, delay);
  if (r <= 0) return null;
  const back = r < rushK(t - 0.1, travel, delay);
  const [x, y, dx, dy] = along(path, r);
  if (r >= 1) return { x, y, dir: 'l', back: false, moving: false, r };
  const sx = back ? -1 : 1;
  return { x, y, dir: (dx - dy) * sx >= 0 ? 'r' : 'l', back: (dx + dy) * sx < -0.01, moving: true, r };
}

// ---------- The day's moments ----------
const shootOn = (t) => { const h = H(t); return h > 8.9 && h < 17.05; };
// The photographer's loop: wait, wait, "And... flap!", FLASH, look at the
// back of the camera. Eleven seconds round.
const CYCLE = 11;
const phase = (t) => ((t % CYCLE) + CYCLE) % CYCLE;
const posing = (t) => { const u = phase(t); return u > 6.3 && u < 7.9; };
const flashing = (t) => { const u = phase(t); return u > 7.55 && u < 7.8; };
const gameOn = (t) => { const h = H(t); return h >= 17.12 && h < 18.6; };

// ---------- The photo set ----------
// The backdrop: a roll of red paper (Gander Cola red) on two stands, hanging
// down and sweeping out over the floor. In two pieces along x, so the desks
// behind it stay behind it and the stool in front stays in front.
const PAPER = mix(BRAND.can, C.coral, 0.3);
const SWEEP = [[0, 0.7], [0.12, 0.38], [0.32, 0.15], [0.62, 0.04], [0.9, 0]];
function drawBackdrop(ctx, x0, x1, ends) {
  const { y, h } = SET;
  // The paper: hanging, then curving onto the floor.
  face(ctx, [[x0, y, SWEEP[0][1]], [x1, y, SWEEP[0][1]], [x1, y, h], [x0, y, h]], PAPER, { lw: 0.035, dots: shade(PAPER, 0.25), density: 0.12 });
  for (let i = 1; i < SWEEP.length; i++) {
    const [a, za] = SWEEP[i - 1], [b, zb] = SWEEP[i];
    face(ctx, [[x0, y + a, za], [x1, y + a, za], [x1, y + b, zb], [x0, y + b, zb]], tint(PAPER, 0.04 * i), { stroke: false });
  }
  // A crease where it was unrolled too fast.
  if (Q.detail) face(ctx, [[x0 + (x1 - x0) * 0.6, y, h - 0.1], [x0 + (x1 - x0) * 0.66, y, 1.4]], null, { lw: 0.02, stroke: shade(PAPER, 0.2) });
  // The roll at the top, and the stands at the ends.
  box(ctx, x0 - 0.02, y - 0.16, h, x1 - x0 + 0.04, 0.2, 0.2, PAPER, { flat: true, lw: 0.03, top: tint(PAPER, 0.15) });
  for (const sx of ends) {
    for (const [fx, fy] of [[sx - 0.35, y + 0.4], [sx + 0.35, y + 0.4], [sx, y - 0.5]]) face(ctx, [[sx, y - 0.05, 0.9], [fx, fy, 0]], null, { lw: 0.045 });
    box(ctx, sx - 0.04, y - 0.1, 0, 0.08, 0.08, h + 0.4, C.ink, { flat: true, stroke: false });
    box(ctx, sx - 0.07, y - 0.13, h + 0.05, 0.14, 0.14, 0.12, C.grey, { flat: true, lw: 0.02 });
  }
}

// A light stand: three legs and a pole.
function stand(ctx, x, y, h) {
  if (Q.detail) for (let k = 0; k < 3; k++) {
    const a = 0.6 + (k * Math.PI * 2) / 3;
    face(ctx, [[x, y, 0.75], [x + Math.cos(a) * 0.42, y + Math.sin(a) * 0.42, 0]], null, { lw: 0.045 });
  }
  box(ctx, x - 0.035, y - 0.035, 0, 0.07, 0.07, h, C.ink, { flat: true, stroke: false });
}
// The umbrella strobe, its umbrella turned to Kyle.
function drawStrobe(ctx) {
  const [x, y] = STROBE;
  stand(ctx, x, y, 2.45);
  box(ctx, x - 0.18, y - 0.12, 2.42, 0.36, 0.24, 0.26, C.black, { flat: true, lw: 0.025 });
  const [X, Y] = P3(x + 0.25, y + 0.1, 2.7);
  ctx.save();
  ctx.translate(X, Y);
  ctx.rotate(-0.35);
  ctx.beginPath(); ctx.ellipse(0, 0, 0.36, 0.7, 0, 0, Math.PI * 2);
  paint(ctx, C.white, { lw: 0.035, dots: C.greyLight, density: 0.2 });
  if (Q.detail) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 0.36, Math.sin(a) * 0.7); }
    ctx.strokeStyle = alpha(C.ink, 0.35); ctx.lineWidth = 0.015; ctx.stroke();
  }
  ctx.restore();
  face(ctx, [[x, y, 2.55], [x + 0.25, y + 0.1, 2.7]], null, { lw: 0.03 });
}
// The softbox on the left, its white face to the set.
function drawSoftbox(ctx) {
  const [x, y] = SOFTBOX;
  stand(ctx, x, y, 1.6);
  box(ctx, x - 0.3, y - 0.55, 1.45, 0.3, 1.1, 1.0, C.black, { flat: true, lw: 0.03, right: C.white });
  if (Q.detail) face(ctx, [[x + 0.001, y - 0.45, 1.55], [x + 0.001, y + 0.45, 1.55], [x + 0.001, y + 0.45, 2.35], [x + 0.001, y - 0.45, 2.35]], null, { lw: 0.015, stroke: C.greyLight });
}
// The stool, tall, wood, a rung for Kyle's feet.
function drawStool(ctx) {
  const [x, y] = STOOL;
  for (const [lx, ly] of [[-0.22, -0.22], [0.2, -0.22], [-0.22, 0.2], [0.2, 0.2]]) box(ctx, x + lx, y + ly, 0, 0.06, 0.06, 0.9, C.brown, { flat: true, lw: 0.02 });
  box(ctx, x - 0.24, y + 0.2, 0.38, 0.5, 0.05, 0.05, C.brown, { flat: true, lw: 0.015 });
  box(ctx, x + 0.2, y - 0.24, 0.38, 0.05, 0.5, 0.05, C.brown, { flat: true, lw: 0.015 });
  box(ctx, x - 0.3, y - 0.3, 0.9, 0.6, 0.6, 0.08, C.wood, { flat: true, lw: 0.03 });
}
// The camera on its tripod, pointed at the stool.
function drawCamera(ctx) {
  const [x, y] = TRIPOD;
  if (Q.detail) for (let k = 0; k < 3; k++) {
    const a = 0.3 + (k * Math.PI * 2) / 3;
    face(ctx, [[x, y, 1.35], [x + Math.cos(a) * 0.38, y + Math.sin(a) * 0.38, 0]], null, { lw: 0.04 });
  }
  box(ctx, x - 0.16, y - 0.12, 1.38, 0.32, 0.24, 0.24, C.black, { flat: true, lw: 0.02 });
  box(ctx, x - 0.36, y - 0.06, 1.42, 0.2, 0.12, 0.12, C.ink, { flat: true, lw: 0.015 });
  box(ctx, x - 0.06, y - 0.06, 1.62, 0.12, 0.1, 0.06, C.grey, { flat: true, lw: 0.015 });
}
// A camera bag and a case of spare bulbs, by the tripod.
function drawKit(ctx) {
  box(ctx, 61.6, 11.3, 0, 0.6, 0.35, 0.32, C.navy, { flat: true, lw: 0.025 });
  box(ctx, 61.66, 11.36, 0.32, 0.48, 0.23, 0.04, C.teal, { flat: true, lw: 0.015 });
  face(ctx, [[61.68, 11.65, 0.3], [61.9, 11.65, 0.62], [62.12, 11.65, 0.62], [62.12, 11.65, 0.3]], null, { lw: 0.04, stroke: C.mustard });
  box(ctx, 63.9, 9.6, 0, 0.7, 0.45, 0.4, C.grey, { flat: true, lw: 0.025 });
  if (Q.detail) for (let i = 0; i < 3; i++) box(ctx, 64.0 + i * 0.2, 9.75, 0.4, 0.06, 0.06, 0.03, C.ink, { flat: true, stroke: false });
}

// The A-frame sign at the edge of the set, facing the spine.
function drawSign(ctx) {
  const [x, y] = SIGN;
  const w = 1.2, h = 1.45;
  // The back leg, then the board, leaning.
  face(ctx, [[x - 0.35, y - w / 2, 0], [x - 0.35, y + w / 2, 0], [x - 0.05, y + w / 2, h], [x - 0.05, y - w / 2, h]], shade(C.wood, 0.25), { lw: 0.03 });
  face(ctx, [[x + 0.25, y - w / 2, 0], [x + 0.25, y + w / 2, 0], [x, y + w / 2, h], [x, y - w / 2, h]], C.ink, { lw: 0.035 });
  face(ctx, [[x + 0.23, y - w / 2 + 0.08, 0.1], [x + 0.23, y + w / 2 - 0.08, 0.1], [x + 0.02, y + w / 2 - 0.08, h - 0.08], [x + 0.02, y - w / 2 + 0.08, h - 0.08]], C.white, { stroke: false });
  ctx.save();
  onFace(ctx, [x + 0.04, y + w / 2 - 0.08, h - 0.1], ALONG_Y, [0.155, 0, -0.97]);
  words(ctx, 'TALENT:', 0.52, 0.17, 0.17, C.ink);
  words(ctx, 'GOOSE', 0.52, 0.42, 0.3, BRAND.can, BAGEL, 400);
  if (Q.detail) words(ctx, 'CALL TIME 9AM', 0.52, 0.68, 0.11, C.ink, undefined, 600);
  ctx.restore();
}
// Its last line keeps count all day.
function signLine(t) {
  const h = H(t);
  if (h < 9) return 'ON SET!';
  if (h >= 17.05) return h < 19 ? 'NO SHOW' : 'TOMORROW?';
  const n = Math.floor(h - 9);
  return n < 1 ? 'ANY MINUTE' : `WAITED ${n} HR${n > 1 ? 'S' : ''}`;
}

// The drape: a dust sheet over a lump on the set, which twitches. A big
// orange foot pokes out of its hem and goes back in.
function drawDrape(ctx, t, k) {
  if (k >= 0.6) return;
  const [x, y] = DRAPE;
  const [X, Y] = P3(x, y, 0.02);
  const u = (t % 6.5 + 6.5) % 6.5;
  const twitch = u < 0.5 ? Math.sin(u * 25) * 0.07 : 0;
  const hgt = (0.9 + (u < 0.5 ? 0.06 : 0)) * (1 - k / 0.6);
  // The sheet: a lump with a hem and folds.
  const cloth = tint(C.greyLight, 0.25);
  ctx.beginPath();
  ctx.moveTo(X - 0.75, Y + 0.05);
  ctx.quadraticCurveTo(X - 0.6 + twitch, Y - hgt * 0.95, X - 0.02 + twitch, Y - hgt);
  ctx.quadraticCurveTo(X + 0.55 + twitch, Y - hgt * 0.9, X + 0.75, Y + 0.02);
  ctx.quadraticCurveTo(X + 0.4, Y + 0.32, X - 0.05, Y + 0.3);
  ctx.quadraticCurveTo(X - 0.5, Y + 0.3, X - 0.75, Y + 0.05);
  paint(ctx, cloth, { lw: 0.035, dots: C.grey, density: 0.12 });
  if (Q.detail) {
    ctx.beginPath();
    ctx.moveTo(X - 0.15 + twitch, Y - hgt * 0.8); ctx.quadraticCurveTo(X - 0.3, Y - hgt * 0.3, X - 0.35, Y + 0.25);
    ctx.moveTo(X + 0.15 + twitch, Y - hgt * 0.75); ctx.quadraticCurveTo(X + 0.25, Y - hgt * 0.3, X + 0.3, Y + 0.24);
    ctx.strokeStyle = shade(cloth, 0.3); ctx.lineWidth = 0.02; ctx.stroke();
    // Now and then it honks.
    const hk = (t % 14 + 14) % 14;
    if (hk < 1.2) label(ctx, x - 0.1, y + 0.2, 1.25 + hk * 0.25, 'honk', 0.32, alpha(C.ink, 1 - hk / 1.2));
  }
  // The foot, out from under the hem on the stool's side, toes out.
  if (Math.sin(t * 0.8) > -0.35) {
    const wig = Math.sin(t * 3) * 0.04;
    ctx.save();
    ctx.translate(X + 0.5 + wig, Y + 0.22);
    ctx.scale(-1.5, 1.5);
    ctx.beginPath();
    ctx.moveTo(0.12, -0.06); ctx.lineTo(-0.28, 0.0);
    ctx.quadraticCurveTo(-0.27, 0.05, -0.33, 0.1);
    ctx.quadraticCurveTo(-0.25, 0.11, -0.23, 0.18);
    ctx.lineTo(0.12, 0.05); ctx.closePath();
    paint(ctx, C.coral, { lw: 0.025 });
    if (Q.detail) {
      ctx.beginPath(); ctx.moveTo(0.08, -0.02); ctx.lineTo(-0.26, 0.05); ctx.moveTo(0.08, 0.02); ctx.lineTo(-0.2, 0.13);
      ctx.strokeStyle = shade(C.coral, 0.35); ctx.lineWidth = 0.018; ctx.stroke();
    }
    ctx.restore();
  }
}
// Once it's pulled off, the sheet lies in a heap behind.
function drawHeap(ctx, k) {
  if (k <= 0.3) return;
  const [X, Y] = P3(DRAPE[0] - 0.35, DRAPE[1] - 1.1, 0);
  ctx.save();
  ctx.globalAlpha *= Math.min(1, (k - 0.3) / 0.4);
  ctx.beginPath(); ctx.ellipse(X, Y - 0.12, 0.6, 0.2, -0.1, 0, Math.PI * 2);
  paint(ctx, tint(C.greyLight, 0.25), { lw: 0.03, dots: C.grey, density: 0.12 });
  ctx.restore();
}

// ---------- The corkboard of rejected logos ----------
// Two cork panels (one each side of the chunk seam at x 64) on legs against
// the back wall, papers pinned up, and the worst one circled in red.
const CORK = mix(C.wood, C.woodLight, 0.4);
function drawCork(ctx, x0, x1, cards) {
  const { y, z0, z1 } = BOARD;
  for (const lx of [x0 + 0.15, x1 - 0.25]) box(ctx, lx, y - 0.1, 0, 0.1, 0.1, z0 + 0.1, C.ink, { flat: true, stroke: false });
  box(ctx, x0, y - 0.08, z0, x1 - x0, 0.08, z1 - z0, C.brown, { flat: true, lw: 0.035, left: C.brown });
  face(ctx, [[x0 + 0.08, y + 0.001, z0 + 0.08], [x1 - 0.08, y + 0.001, z0 + 0.08], [x1 - 0.08, y + 0.001, z1 - 0.08], [x0 + 0.08, y + 0.001, z1 - 0.08]], CORK, { stroke: false, dots: shade(CORK, 0.35), density: 0.25 });
  ctx.save();
  onFace(ctx, [x0, y + 0.005, z1], ALONG_X, DOWN);
  for (const c of cards) logoCard(ctx, ...c);
  ctx.restore();
}
// One logo on a card, centered at (u, v) on the board, s across. kind: what's
// on it.
function logoCard(ctx, u, v, kind, s = 0.55, tilt = 0) {
  ctx.save();
  ctx.translate(u, v);
  ctx.rotate(tilt);
  rr(ctx, -s / 2, -s / 2, s, s, C.white, { lw: 0.02 });
  ctx.fillStyle = C.red;
  ctx.beginPath(); ctx.arc(0, -s / 2 + 0.04, 0.025, 0, Math.PI * 2); ctx.fill();
  const k = s / 0.55;
  ctx.scale(k, k);
  if (kind === 'bulb') {
    // A goose in a lightbulb. "It's an idea goose."
    ctx.beginPath(); ctx.arc(0, -0.04, 0.17, 0, Math.PI * 2); paint(ctx, C.butter, { lw: 0.02 });
    rr(ctx, -0.07, 0.12, 0.14, 0.08, C.grey, { lw: 0.015 });
    goosey(ctx, 0, 0.04, 0.12, C.white);
  } else if (kind === 'g') {
    // A goose that's just a G.
    words(ctx, 'G', -0.02, 0.0, 0.42, C.teal, BAGEL, 400);
    ctx.beginPath(); ctx.moveTo(0.1, -0.06); ctx.lineTo(0.2, -0.04); ctx.lineTo(0.1, -0.01); paint(ctx, C.coral, { lw: 0.012 });
  } else if (kind === 'comic') {
    words(ctx, 'goose!', 0, -0.06, 0.13, C.purple, COMIC, 700);
    words(ctx, 'GANDER', 0, 0.1, 0.08, C.pink, COMIC, 700);
  } else if (kind === 'swoosh') {
    goosey(ctx, -0.03, 0.03, 0.17, C.ink);
    ctx.beginPath(); ctx.moveTo(-0.2, 0.12); ctx.quadraticCurveTo(0.02, 0.24, 0.22, 0.0); ctx.strokeStyle = C.coral; ctx.lineWidth = 0.04; ctx.stroke();
  } else if (kind === 'hash') {
    words(ctx, '#GOOSE', 0, 0.0, 0.1, C.teal, '"Rethink Sans", sans-serif', 800);
    words(ctx, 'v14', 0.13, 0.17, 0.07, C.grey, '"Rethink Sans", sans-serif', 600);
  } else if (kind === 'circle') {
    // Gander Cola as a circle with a beak. "Bold."
    ctx.beginPath(); ctx.arc(0, 0, 0.16, 0, Math.PI * 2); paint(ctx, BRAND.can, { lw: 0.02 });
    ctx.beginPath(); ctx.moveTo(0.15, -0.03); ctx.lineTo(0.26, 0.0); ctx.lineTo(0.15, 0.04); paint(ctx, C.mustard, { lw: 0.012 });
    ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(0.05, -0.05, 0.025, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'shades') {
    // The worst one: a goose in sunglasses doing a thumbs up, GANDER in
    // three fonts. Circled in red, NO.
    goosey(ctx, -0.02, 0.06, 0.2, C.white);
    rr(ctx, 0.03, -0.12, 0.1, 0.035, C.ink, { stroke: false });
    words(ctx, 'GaNdEr', 0, 0.2, 0.08, C.purple, COMIC, 700);
    ctx.beginPath(); ctx.ellipse(0, 0.02, 0.37, 0.34, 0.15, 0, Math.PI * 2); ctx.strokeStyle = C.red; ctx.lineWidth = 0.035; ctx.stroke();
    words(ctx, 'NO', 0.26, -0.3, 0.17, C.red, BAGEL, 400);
  }
  ctx.restore();
}
// A goose sketched on a card: a body, a neck and a beak (flat, in u, v).
function goosey(ctx, u, v, s, fill) {
  ctx.beginPath(); ctx.ellipse(u, v + s * 0.35, s * 0.6, s * 0.35, -0.1, 0, Math.PI * 2); paint(ctx, fill, { lw: 0.015 });
  ctx.beginPath(); ctx.moveTo(u + s * 0.3, v + s * 0.2); ctx.quadraticCurveTo(u + s * 0.5, v - s * 0.2, u + s * 0.4, v - s * 0.5);
  ctx.strokeStyle = C.ink; ctx.lineWidth = s * 0.28; ctx.lineCap = 'round'; ctx.stroke();
  ctx.strokeStyle = fill; ctx.lineWidth = s * 0.18; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(u + s * 0.45, v - s * 0.58); ctx.lineTo(u + s * 0.8, v - s * 0.48); ctx.lineTo(u + s * 0.45, v - s * 0.4); paint(ctx, C.coral, { lw: 0.01 });
}
// MAKE IT POP in pink neon over the board; the second P buzzes.
function drawNeon(ctx, t) {
  const night = nightK(t);
  const pop = !(((t * 7) % 23) < 1.3 || ((t * 3.1) % 17) < 0.4);
  const x = (BOARD.x0 + BOARD.x1) / 2, y = BOARD.y - 0.02, z = BOARD.z1 + 0.42;
  glow(ctx, x, y + 0.3, z, 2.2 + night, C.pink, 0.35 + night * 0.4);
  ctx.save();
  onFace(ctx, [x, y, z], ALONG_X, DOWN);
  ctx.scale(1 / 40, 1 / 40);
  ctx.font = `400 ${0.46 * 40}px ${BAGEL}`;
  ctx.textBaseline = 'middle';
  const full = ctx.measureText('MAKE IT POP').width, head = ctx.measureText('MAKE IT PO').width;
  const left = -full / 2;
  const tube = (text, at, on) => {
    ctx.lineWidth = 3.2; ctx.lineJoin = 'round';
    ctx.strokeStyle = on ? C.pink : shade(C.pink, 0.45);
    ctx.strokeText(text, at, 0);
    ctx.fillStyle = on ? tint(C.pink, 0.75) : shade(C.pink, 0.3);
    ctx.fillText(text, at, 0);
  };
  ctx.textAlign = 'left';
  tube('MAKE IT PO', left, true);
  tube('P', left + head, pop);
  ctx.restore();
}

// ---------- Easels and mood boards ----------
function drawEasel(ctx, x, y, which) {
  const lean = 0.17;
  for (const sx of [-0.5, 0.5]) face(ctx, [[x + sx, y + 0.22, 0], [x + sx * 0.6, y - 0.08, 2.3]], null, { lw: 0.06, stroke: C.wood });
  face(ctx, [[x, y - 0.7, 0], [x, y - 0.1, 2.2]], null, { lw: 0.05, stroke: shade(C.wood, 0.3) });
  box(ctx, x - 0.72, y + 0.04, 0.86, 1.44, 0.14, 0.06, C.wood, { flat: true, lw: 0.02 });
  const c = [[x - 0.7, y + 0.06, 0.92], [x + 0.7, y + 0.06, 0.92], [x + 0.7, y + 0.06 - lean, 2.02], [x - 0.7, y + 0.06 - lean, 2.02]];
  face(ctx, c, C.white, { lw: 0.035 });
  ctx.save();
  onFace(ctx, c[3], ALONG_X, [0, lean / 1.1, -1]);
  if (which === 0) {
    words(ctx, 'GANDER: VIBES', 0.7, 0.13, 0.13, C.ink);
    const tiles = [[0.1, 0.26, 0.38, 0.32, INK.maple], [0.52, 0.26, 0.3, 0.42, C.mustard], [0.86, 0.26, 0.44, 0.28, C.teal], [0.1, 0.62, 0.3, 0.36, C.blush], [0.44, 0.72, 0.42, 0.28, BRAND.can], [0.9, 0.58, 0.4, 0.42, INK.pine]];
    for (const [u, v, w, h, col] of tiles) rr(ctx, u, v, w, h, col, { lw: 0.015 });
    if (Q.detail) {
      // A can, a leaf and a wave, cut out of magazines.
      rr(ctx, 0.58, 0.32, 0.12, 0.24, C.white, { lw: 0.012 });
      ctx.beginPath(); ctx.ellipse(1.08, 0.4, 0.1, 0.06, 0.6, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.012 });
      words(ctx, 'FIZZ', 0.65, 0.86, 0.12, C.white, BAGEL, 400);
    }
  } else {
    words(ctx, 'BOLD?', 0.36, 0.2, 0.17, BRAND.can, COMIC, 700);
    words(ctx, 'PLAYFUL?', 0.95, 0.42, 0.14, C.teal, COMIC, 700);
    words(ctx, 'BOTH??', 0.5, 0.66, 0.16, C.purple, COMIC, 700);
    if (Q.detail) {
      for (let i = 0; i < 5; i++) rr(ctx, 0.12 + i * 0.24, 0.84, 0.2, 0.14, [INK.maple, C.mustard, C.teal, C.pink, C.lilac][i], { lw: 0.01 });
      ctx.beginPath(); ctx.moveTo(1.0, 0.62); ctx.lineTo(1.25, 0.72); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02; ctx.stroke();
    }
  }
  ctx.restore();
}

// ---------- The ping-pong table ----------
function drawTable(ctx) {
  const { x0, y0, x1, y1, h } = TABLE;
  const leg = shade(C.grey, 0.3);
  for (const [lx, ly] of [[x0 + 0.4, y0 + 0.3], [x1 - 0.5, y0 + 0.3], [x0 + 0.4, y1 - 0.4], [x1 - 0.5, y1 - 0.4]]) box(ctx, lx, ly, 0, 0.1, 0.1, h - 0.06, leg, { flat: true, lw: 0.02 });
  box(ctx, x0, y0, h - 0.08, x1 - x0, y1 - y0, 0.08, INK.pine, { flat: true, lw: 0.04, top: tint(INK.pine, 0.12) });
  // The white lines: the edge and the middle.
  const z = h + 0.002, m = 0.06, mid = (y0 + y1) / 2;
  ctx.save();
  ctx.strokeStyle = C.white; ctx.lineWidth = 0.05;
  face(ctx, [[x0 + m, y0 + m, z], [x1 - m, y0 + m, z], [x1 - m, y1 - m, z], [x0 + m, y1 - m, z]], null, { lw: 0.05, stroke: C.white });
  face(ctx, [[x0 + m, mid, z], [x1 - m, mid, z]], null, { lw: 0.03, stroke: C.white });
  ctx.restore();
  // The net, across the middle.
  const nx = (x0 + x1) / 2;
  face(ctx, [[nx, y0 - 0.12, h], [nx, y1 + 0.12, h], [nx, y1 + 0.12, h + 0.28], [nx, y0 - 0.12, h + 0.28]], alpha(C.white, 0.55), { lw: 0.025 });
  face(ctx, [[nx, y0 - 0.12, h + 0.28], [nx, y1 + 0.12, h + 0.28]], null, { lw: 0.05, stroke: C.white });
}
// Taped off: caution tape corner to corner, the paddles under it, and a
// tent card. Gone after the pitch.
function drawTape(ctx) {
  const { x0, y0, x1, y1, h } = TABLE;
  const z = h + 0.02;
  // The paddles, crossed, and the ball.
  for (const [px, py, col] of [[66.0, 15.5, BRAND.can], [66.3, 15.9, C.ink]]) {
    const [X, Y] = P3(px, py, z);
    ctx.beginPath(); ctx.ellipse(X, Y, 0.28, 0.17, 0.4, 0, Math.PI * 2); paint(ctx, col, { lw: 0.025 });
    ctx.beginPath(); ctx.moveTo(X + 0.2, Y + 0.12); ctx.lineTo(X + 0.42, Y + 0.24); ctx.strokeStyle = C.wood; ctx.lineWidth = 0.08; ctx.stroke();
  }
  const [bx, by] = P3(65.5, 16.4, z + 0.06);
  ctx.beginPath(); ctx.arc(bx, by, 0.07, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.015 });
  // Caution tape, two strips, black and yellow.
  const strip = (a, b) => {
    const w = 0.11;
    face(ctx, [[a[0], a[1] - w, z + 0.03], [b[0], b[1] - w, z + 0.03], [b[0], b[1] + w, z + 0.03], [a[0], a[1] + w, z + 0.03]], INK.sticky, { lw: 0.02 });
    if (Q.detail) {
      ctx.save();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05;
      ctx.beginPath();
      for (let k = 0.04; k < 1; k += 0.07) {
        const x = a[0] + (b[0] - a[0]) * k, y = a[1] + (b[1] - a[1]) * k;
        const [p, q] = [P3(x - 0.06, y - w, z + 0.03), P3(x + 0.06, y + w, z + 0.03)];
        ctx.moveTo(...p); ctx.lineTo(...q);
      }
      ctx.stroke();
      ctx.restore();
    }
  };
  strip([x0 - 0.1, y0 + 0.2], [x1 + 0.1, y1 - 0.2]);
  strip([x0 - 0.1, y1 - 0.2], [x1 + 0.1, y0 + 0.2]);
  // A tent card on the front half, toward the spine.
  const cx = 67.9, cy = 16.4, w = 1.5, hh = 0.55;
  face(ctx, [[cx - w / 2, cy - 0.15, z + hh], [cx + w / 2, cy - 0.15, z + hh], [cx + w / 2, cy - 0.35, z], [cx - w / 2, cy - 0.35, z]], C.greyLight, { lw: 0.02 });
  const c = [[cx - w / 2, cy + 0.08, z], [cx + w / 2, cy + 0.08, z], [cx + w / 2, cy - 0.15, z + hh], [cx - w / 2, cy - 0.15, z + hh]];
  face(ctx, c, C.white, { lw: 0.025 });
  ctx.save();
  onFace(ctx, c[3], ALONG_X, [0, 0.23 / hh, -1]);
  words(ctx, 'NOT UNTIL', w / 2, 0.16, 0.17, C.red, BAGEL, 400);
  words(ctx, 'AFTER THE PITCH', w / 2, 0.38, 0.15, C.ink);
  ctx.restore();
}

// ---------- The lounge ----------
function drawRug(ctx) {
  const [X, Y] = P3(68.4, 8.4, 0);
  ctx.beginPath(); ctx.ellipse(X, Y, 2.6, 1.3, 0, 0, Math.PI * 2);
  paint(ctx, C.mustard, { lw: 0.03, dots: shade(C.mustard, 0.3), density: 0.15 });
  ctx.beginPath(); ctx.ellipse(X, Y, 1.9, 0.95, 0, 0, Math.PI * 2);
  paint(ctx, C.coralLight, { stroke: false });
  ctx.beginPath(); ctx.ellipse(X, Y, 1.1, 0.55, 0, 0, Math.PI * 2);
  paint(ctx, C.teal, { stroke: false, dots: shade(C.teal, 0.3), density: 0.15 });
}
function drawBeanbag(ctx) {
  const [X, Y] = P3(...BEANBAG, 0);
  const col = C.purple;
  ctx.beginPath();
  ctx.moveTo(X - 0.85, Y);
  ctx.quadraticCurveTo(X - 0.95, Y - 0.75, X - 0.35, Y - 0.85);
  ctx.quadraticCurveTo(X + 0.1, Y - 0.55, X + 0.45, Y - 0.7);
  ctx.quadraticCurveTo(X + 0.95, Y - 0.6, X + 0.85, Y);
  ctx.quadraticCurveTo(X, Y + 0.4, X - 0.85, Y);
  paint(ctx, col, { lw: 0.04, dots: shade(col, 0.4), density: 0.18 });
  if (Q.detail) {
    ctx.beginPath(); ctx.moveTo(X - 0.3, Y - 0.6); ctx.quadraticCurveTo(X - 0.1, Y - 0.2, X + 0.3, Y - 0.15);
    ctx.strokeStyle = shade(col, 0.3); ctx.lineWidth = 0.025; ctx.stroke();
  }
}
// The record player on a crate of records, a box of more on the floor.
function drawDecks(ctx) {
  const [x, y] = DECKS;
  box(ctx, x - 0.5, y - 0.45, 0, 1.0, 0.9, 0.75, C.wood, { flat: true, lw: 0.03 });
  if (Q.detail) {
    // Record spines down the crate's front.
    const cols = [C.coral, C.ink, C.teal, C.mustard, C.pink, C.ink, C.lilac, C.red, C.navy, C.leaf];
    for (let i = 0; i < cols.length; i++) {
      const xx = x - 0.44 + i * 0.088;
      face(ctx, [[xx, y + 0.451, 0.06], [xx + 0.07, y + 0.451, 0.06], [xx + 0.07, y + 0.451, 0.68], [xx, y + 0.451, 0.68]], cols[i], { stroke: false });
    }
  }
  box(ctx, x - 0.42, y - 0.38, 0.75, 0.84, 0.76, 0.14, C.ink, { flat: true, lw: 0.025, top: shade(C.greyLight, 0.4) });
  // A sleeve leaning on the crate: someone's idea of "on brand".
  face(ctx, [[x + 0.51, y - 0.35, 0], [x + 0.51, y + 0.35, 0], [x + 0.62, y + 0.35, 0.68], [x + 0.62, y - 0.35, 0.68]], C.butter, { lw: 0.025 });
  if (Q.detail) {
    const [X, Y] = P3(x + 0.57, y, 0.34);
    ctx.beginPath(); ctx.arc(X, Y, 0.18, 0, Math.PI * 2); paint(ctx, C.ink, { stroke: false });
  }
}
// The platter going round, the arm on it, and notes coming off it while the
// floor's in.
function drawSpin(ctx, t) {
  const [x, y] = DECKS;
  const on = staffed(t) > 0.5;
  const [X, Y] = P3(x - 0.05, y, 0.9);
  ctx.beginPath(); ctx.ellipse(X, Y, 0.48, 0.24, 0, 0, Math.PI * 2); paint(ctx, C.black, { lw: 0.02 });
  const a = on ? t * 3.5 : 0.4;
  ctx.beginPath(); ctx.ellipse(X, Y, 0.16, 0.08, 0, 0, Math.PI * 2); ctx.fillStyle = C.coral; ctx.fill();
  ctx.beginPath(); ctx.arc(X + Math.cos(a) * 0.1, Y + Math.sin(a) * 0.05, 0.025, 0, Math.PI * 2); ctx.fillStyle = C.white; ctx.fill();
  ctx.beginPath(); ctx.moveTo(X + 0.55, Y - 0.12); ctx.lineTo(X + 0.18, Y + 0.08);
  ctx.strokeStyle = C.greyLight; ctx.lineWidth = 0.04; ctx.stroke();
  if (!on || !Q.detail) return;
  for (let i = 0; i < 2; i++) {
    const k = ((t * 0.45 + i * 0.5) % 1);
    const [nx, ny] = P3(x - 0.2 + Math.sin(k * 6 + i) * 0.2, y - 0.2, 1.2 + k * 1.3);
    ctx.save();
    ctx.globalAlpha *= 1 - k;
    ctx.fillStyle = C.ink; ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03;
    ctx.beginPath(); ctx.ellipse(nx, ny, 0.07, 0.05, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(nx + 0.06, ny); ctx.lineTo(nx + 0.06, ny - 0.25); ctx.lineTo(nx + 0.16, ny - 0.18); ctx.stroke();
    ctx.restore();
  }
}

// ---------- People ----------
// Kyle's goose suit: white all over, orange feet, a tail, and the hood: a
// goose's neck and head on top, his face in the hole. For a second, a goose.
function suitWear(ctx, b) {
  ctx.beginPath();
  ctx.moveTo(-0.26, b.hipY - 0.25); ctx.lineTo(-0.52, b.hipY - 0.38); ctx.lineTo(-0.3, b.hipY - 0.05);
  paint(ctx, C.white, { lw: 0.035 });
  if (Q.detail && !b.back) { ctx.beginPath(); ctx.ellipse(0.06, b.hipY - 0.35, 0.16, 0.24, 0, 0, Math.PI * 2); ctx.fillStyle = C.greyLight; ctx.fill(); }
}
function hood(state) {
  return (ctx, hy, back, t) => {
    // The neck, up off the crown, and the goose head with its beak.
    ctx.beginPath();
    ctx.moveTo(-0.02, hy - 0.3);
    ctx.quadraticCurveTo(0.0, hy - 0.72, 0.16, hy - 0.86);
    ctx.lineCap = 'round';
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.27; ctx.stroke();
    ctx.strokeStyle = C.white; ctx.lineWidth = 0.18; ctx.stroke();
    ctx.beginPath(); ctx.arc(0.18, hy - 0.9, 0.16, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.035 });
    ctx.beginPath(); ctx.moveTo(0.3, hy - 0.95); ctx.lineTo(0.56, hy - 0.88); ctx.lineTo(0.3, hy - 0.82); paint(ctx, C.coral, { lw: 0.025 });
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0.23, hy - 0.94, 0.03, 0, Math.PI * 2); ctx.fill();
    // The hood round his face (all of it from behind).
    ctx.beginPath();
    ctx.arc(0.02, hy, 0.4, 0, Math.PI * 2);
    if (!back) { ctx.moveTo(0.3, hy + 0.03); ctx.arc(0.1, hy + 0.03, 0.2, 0, Math.PI * 2, true); }
    paint(ctx, C.white, { lw: 0.035 });
    if (back || !Q.detail) return;
    const s = state(t);
    // His face: bored lids, a flat mouth; a blink at the flash; a smile for
    // the boss.
    const skin = SKIN[1];
    if (s.blink) {
      ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(0.1, hy + 0.02, 0.05, 0, Math.PI * 2); ctx.arc(0.24, hy + 0.02, 0.05, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0.05, hy + 0.03); ctx.lineTo(0.15, hy + 0.03); ctx.moveTo(0.19, hy + 0.03); ctx.lineTo(0.29, hy + 0.03);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.stroke();
    } else if (!s.perky) {
      ctx.fillStyle = skin; ctx.fillRect(0.05, hy - 0.03, 0.25, 0.045);
      ctx.beginPath(); ctx.moveTo(0.05, hy + 0.012); ctx.lineTo(0.3, hy + 0.012); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.018; ctx.stroke();
    }
    ctx.beginPath();
    if (s.perky) ctx.arc(0.17, hy + 0.1, 0.07, 0.2, Math.PI - 0.2);
    else { ctx.moveTo(0.12, hy + 0.14); ctx.lineTo(0.23, hy + 0.14); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.022; ctx.stroke();
  };
}
function phone(ctx) {
  ctx.save();
  ctx.rotate(-0.3);
  ctx.beginPath(); ctx.roundRect(-0.02, -0.14, 0.13, 0.22, 0.03); paint(ctx, C.ink, { lw: 0.015 });
  ctx.fillStyle = C.tealLight; ctx.fillRect(0.0, -0.12, 0.09, 0.16);
  ctx.restore();
}
function paddle(color) {
  return (ctx) => {
    ctx.save();
    ctx.rotate(-0.6);
    ctx.fillStyle = C.wood; ctx.fillRect(-0.03, -0.02, 0.06, 0.16);
    ctx.beginPath(); ctx.ellipse(0, -0.14, 0.13, 0.15, 0, 0, Math.PI * 2); paint(ctx, color, { lw: 0.02 });
    ctx.restore();
  };
}
// The photographer's vest, all pockets.
function vest(ctx, b) {
  if (b.back) return;
  ctx.beginPath(); ctx.roundRect(-0.27, b.top + 0.05, 0.54, b.hipY - b.top - 0.05, 0.1);
  paint(ctx, mix(C.wood, C.woodLight, 0.5), { lw: 0.025 });
  if (!Q.detail) return;
  ctx.fillStyle = shade(C.wood, 0.15);
  for (const [px, py] of [[-0.2, -0.35], [0.06, -0.35], [-0.2, -0.17], [0.06, -0.17]]) ctx.fillRect(px, b.hipY + py, 0.14, 0.12);
}
function camHeld(flashOn) {
  return (ctx) => {
    ctx.save();
    ctx.translate(-0.05, -0.15);
    ctx.beginPath(); ctx.roundRect(-0.15, -0.1, 0.3, 0.2, 0.04); paint(ctx, C.black, { lw: 0.02 });
    ctx.beginPath(); ctx.arc(0.17, 0, 0.07, 0, Math.PI * 2); paint(ctx, C.ink, { lw: 0.015 });
    if (flashOn) { ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(-0.05, -0.16, 0.12, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  };
}
// Mo's round glasses.
function specs(ctx, hy, back) {
  if (back || !Q.detail) return;
  ctx.beginPath(); ctx.arc(0.1, hy + 0.02, 0.075, 0, Math.PI * 2); ctx.moveTo(0.315, hy + 0.02); ctx.arc(0.24, hy + 0.02, 0.075, 0, Math.PI * 2);
  ctx.moveTo(0.175, hy + 0.02); ctx.lineTo(0.165, hy + 0.02);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.stroke();
}

// People at the back desks, who run for the glass by the aisles (round the
// photo set, not through it). Like the kit's staff, but each with a path.
function backDesks(R, seats, seed, o) {
  seats.forEach((s, i) => {
    if ((o.empty || []).includes(i)) { chair(R, s); screen(R, s, 'off', { here: () => false }); return; }
    const look = folk(seed + i);
    const k = ((seed * 13 + i * 7) % 10) / 10;
    const delay = (k * 7) % 1.4;
    chair(R, s);
    const path = o.path(s, i);
    const travel = 2.2 + lengthOf(path) / 4.4;
    R.mover((t) => {
      if (!seated(t, k)) return { x: s.x, y: s.y, gone: true };
      const d = dash(t, path, travel, delay);
      return d || { x: s.x, y: s.y, sit: true, dir: s.dir };
    }, (ctx, t, p) => {
      if (p.gone) return;
      const pose = p.sit ? 'sit' : p.moving ? 'run' : ((s.x * 7) % 3 < 1 ? 'point' : 'stand');
      person(ctx, p.x, p.y, p.sit ? 0.2 : 0, { ...look, pose, dir: p.dir, back: p.back }, t);
    }, { bias: 0.15 });
    screen(R, s, o.kinds[i], { here: (t) => seated(t, k) });
    clutter(R, s, seed + i);
  });
}

export default {
  id: 'creative',
  name: 'Creative',
  blurb: 'The mascot shoot has been ready since nine. The talent is late, so Kyle the intern is in the goose suit.',
  describe: 'A design studio: desks by the windows, a corkboard of rejected logos under a pink neon sign, a red photo set where an intern in a goose costume sits between flashing lights, a beanbag corner, a taped-off ping-pong table, and two designers moving one letter back and forth.',

  build(R) {
    floorOf(R, 56, 72, { floor: TONE.creative, lit: [64.6] });
    backWall(R, 56, 72);
    sill(R, 56, 72);

    // ---- The back desks: the left pair runs round the set, the right pair
    // down the middle and down the right-hand side.
    const MID = 64.1; // the aisle past the photographer
    const toMid = (s, glass) => [[s.x, s.y], [s.side === 'l' ? 56.7 : 62.1, s.y], [s.side === 'l' ? 56.7 : 62.1, 5.2], [MID, 5.2], [MID, 12.8], [63.3, 18.2], glass];
    backDesks(R, pod(R, 59.4, 'back', 2), 550, {
      kinds: ['mood', 'mood', 'helvetica', 'mood'],
      path: (s, i) => toMid(s, [[62.5, 23.6], [63.5, 24.0], [64.6, 23.6], [65.6, 25.1]][i]),
    });
    backDesks(R, pod(R, 68.6, 'back', 2), 555, {
      empty: [2],
      kinds: ['logo', 'logo', 'logo', 'logo'],
      path: (s, i) => (s.side === 'l'
        ? [[s.x, s.y], [65.9, s.y], [65.9, 4.8], [64.7, 5.4], [64.7, 13.2], [64.0, 18.4], [65.5, 23.4]]
        : [[s.x, s.y], [71.55, s.y], [71.55, 23.0], i === 1 ? [71.3, 24.0] : [70.95, 23.3]]),
    });

    // ---- The corkboard of rejected logos, MAKE IT POP over it.
    R.thing(63.0, BOARD.y, (ctx) => drawCork(ctx, BOARD.x0, 63.98, [
      [0.6, 0.72, 'shades', 0.62, -0.03], [1.42, 0.45, 'bulb', 0.5, 0.06], [1.45, 1.12, 'comic', 0.5, -0.04], [0.42, 1.52, 'g', 0.42, 0.08],
    ]));
    R.thing(64.6, BOARD.y, (ctx) => drawCork(ctx, 64.02, BOARD.x1, [
      [0.52, 0.45, 'hash', 0.48, -0.04], [0.55, 1.1, 'swoosh', 0.46, 0.05], [0.5, 1.62, 'circle', 0.36, -0.06],
    ]));
    R.thing(64.62, BOARD.y + 0.01, (ctx, t) => drawNeon(ctx, t), { anim: true });
    R.find({ id: 'logo', label: 'A rejected logo', at: [BOARD.x0 + 0.6, BOARD.y, BOARD.z1 - 0.7], r: 0.7 });

    // ---- The photo set. The sweep on the floor, the paper in two pieces.
    R.rug((ctx) => {
      const { x0, x1, y, front } = SET;
      const base = y + SWEEP[SWEEP.length - 1][0];
      face(ctx, [[x0, base, 0.005], [x1, base, 0.005], [x1, front, 0.005], [x0, front, 0.005]], tint(PAPER, 0.22), { lw: 0.035, dots: shade(PAPER, 0.15), density: 0.1 });
      // Tape marks on the floor where the stool goes.
      if (Q.detail) for (const [mx, my] of [[STOOL[0] - 0.45, STOOL[1] + 0.45], [STOOL[0] + 0.45, STOOL[1] + 0.45]]) {
        face(ctx, [[mx - 0.2, my, 0.01], [mx + 0.2, my, 0.01]], null, { lw: 0.06, stroke: INK.sticky });
        face(ctx, [[mx, my - 0.2, 0.01], [mx, my + 0.2, 0.01]], null, { lw: 0.06, stroke: INK.sticky });
      }
    });
    R.thing(58.3, 6.8, (ctx) => drawBackdrop(ctx, SET.x0, 59.8, [SET.x0 - 0.05]));
    R.thing(60.7, 6.8, (ctx) => drawBackdrop(ctx, 59.8, SET.x1, [SET.x1 + 0.05]));
    R.thing(SOFTBOX[0] + 0.3, SOFTBOX[1] + 0.4, drawSoftbox);
    R.thing(STROBE[0], STROBE[1], drawStrobe);
    R.thing(STOOL[0] + 0.3, STOOL[1] + 0.3, drawStool);
    R.thing(TRIPOD[0] + 0.3, TRIPOD[1] + 0.3, drawCamera);
    R.thing(62.6, 11.6, drawKit);
    R.thing(SIGN[0] + 0.3, SIGN[1] + 0.6, drawSign);
    R.thing(SIGN[0] + 0.31, SIGN[1] + 0.61, (ctx, t) => {
      ctx.save();
      onFace(ctx, [SIGN[0] + 0.04, SIGN[1] + 0.52, 0.55], ALONG_Y, [0.155, 0, -0.97]);
      words(ctx, signLine(t), 0.52, 0.12, 0.13, C.red, COMIC, 700);
      ctx.restore();
    }, { anim: true });

    // The strobes: they fire on the photographer's count, or on a tap.
    const strobe = R.poke({ id: 'strobe', at: [STROBE[0] + 0.25, STROBE[1] + 0.1, 2.7], r: 0.8, hold: 0.5, sound: 'pop',
      say: (t) => (shootOn(t) ? 'Flash! Kyle blinked.' : 'Flash! Nobody here to blink.') });
    const flashK = (t) => Math.max(shootOn(t) && rushK(t) === 0 && flashing(t) ? 1 : 0, strobe.k() > 0.15 ? 1 : 0);
    R.thing(STROBE[0] + 0.02, STROBE[1] + 0.02, (ctx, t) => {
      const f = flashK(t);
      // The modeling lamps, on while there's a shoot; the flash over them.
      const lamp = shootOn(t) ? 0.25 : 0;
      if (f || lamp) {
        glow(ctx, STROBE[0] + 0.25, STROBE[1] + 0.1, 2.7, f ? 3.2 : 1.2, f ? C.white : C.butter, f ? 1 : lamp);
        glow(ctx, SOFTBOX[0] + 0.05, SOFTBOX[1], 1.95, f ? 3 : 1.1, f ? C.white : C.butter, f ? 1 : lamp);
      }
    }, { anim: true });
    R.air((ctx, t) => {
      if (!flashK(t)) return;
      ctx.save();
      ctx.globalAlpha *= 0.28;
      face(ctx, [[SET.x0, SET.y, 3.2], [SET.x1, SET.y, 3.2], [SET.x1, SET.front, 0], [SET.x0, SET.front, 0]], C.white, { stroke: false });
      ctx.restore();
    });

    // The drape, and the talent under it the whole time.
    const drape = R.poke({ id: 'drape', at: [DRAPE[0], DRAPE[1], 0.5], r: 0.9, say: 'Something under the drape is honking.' });
    R.thing(DRAPE[0] - 1.2, DRAPE[1] - 1.2, (ctx) => drawHeap(ctx, drape.k()), { anim: true });
    R.thing(DRAPE[0] + 0.5, DRAPE[1] + 0.4, (ctx, t) => drawDrape(ctx, t, drape.k()), { anim: true });
    R.goose((t) => ({ x: DRAPE[0], y: DRAPE[1] + 0.05, z: 0, dir: 'r', pose: drape.k() > 0.9 && (t % 5) < 1 ? 'honk' : 'sit', hidden: drape.k() < 0.5 }),
      { kind: 'poke', inside: drape, hint: 'The talent showed up after all. It\'s hiding on the set.' });

    // ---- Kyle, in the suit since nine. On the stool all day, wings out for
    // every flash, on his phone in between, sitting up when the boss is near.
    // To the glass at bear o'clock; ping-pong after the pitch.
    const KYLE = { skin: SKIN[1], hair: C.ink, style: 'bald', top: C.white, bottom: C.white, shoes: C.coral, wear: suitWear };
    const kyleState = (t) => {
      const boss = watched(STOOL[0], t);
      const u = phase(t);
      const shooting = shootOn(t) && rushK(t) === 0;
      return {
        boss,
        flap: shooting && posing(t) && !boss,
        blink: (shooting && u > 7.55 && u < 8.1) || strobe.k() > 0.1,
        perky: boss || (shooting && posing(t)),
      };
    };
    const kyleLook = { ...KYLE, face: hood(kyleState) };
    const kylePath = [[61.6, 12.0], [62.9, 18.4], [63.2, 25.15]];
    const kyle = R.mover((t) => {
      const h = H(t);
      if (h < 8.75 || h >= 18.6) return { x: STOOL[0], y: STOOL[1], gone: true };
      if (gameOn(t)) return { x: 63.9, y: 15.9, dir: 'r', game: true };
      const d = dash(t, [STOOL, ...kylePath], 6.5, 0.4);
      if (d) return d;
      return { x: STOOL[0], y: STOOL[1], sit: true, dir: 'r' };
    }, (ctx, t, p) => {
      if (p.gone) return;
      if (p.sit) {
        const s = kyleState(t);
        const arms = s.flap ? [2.0 + Math.sin(t * 14) * 0.3, -2.0 - Math.sin(t * 14) * 0.3] : s.boss ? [0.3, -0.2] : [1.05, 0.95];
        person(ctx, p.x, p.y, 0.53, { ...kyleLook, pose: 'sit', dir: 'r', arms, hold: s.flap || s.boss ? null : phone }, t);
      } else if (p.game) {
        const sw = Math.sin(t * Math.PI / 0.8);
        person(ctx, p.x, p.y, 0, { ...kyleLook, pose: 'stand', dir: 'r', arms: [1.0 + sw * 0.5, -0.3], hold: paddle(BRAND.can) }, t);
      } else {
        person(ctx, p.x, p.y, 0, { ...kyleLook, pose: p.moving ? 'run' : 'point', dir: p.dir, back: p.back }, t);
      }
    }, { bias: 0.2 });
    R.decoy({ id: 'kyle', r: 0.8, say: 'That\'s Kyle. In the suit since nine.',
      when: (t) => { const h = H(t); return h >= 8.75 && h < 18.6; },
      at: (t) => { const p = kyle(t); return [p.x, p.y, p.sit ? 2.3 : 1.8]; } });

    // ---- The photographer: waiting for the talent since nine. Checks her
    // watch, looks at the stair, counts Kyle in and fires. At bear o'clock
    // she finally gets some talent in shot.
    const BEA = folk(561, { top: C.ink, bottom: C.navy, hat: 'cap', hatColor: C.mustard, style: 'pony', wear: vest });
    const lines = ['Any minute now.', 'The talent\'s running late.', 'Chin up, Kyle.', 'Where IS the goose?', 'Is that a honk?'];
    R.mover((t) => {
      const h = H(t);
      if (h < 8.6 || h >= 17.3) return { x: SNAPPER[0], y: SNAPPER[1], gone: true };
      const d = dash(t, [SNAPPER, [64.0, 18.0], [64.2, 25.3]], 6.0, 0.2);
      if (d) return { ...d, rush: true };
      const u = phase(t);
      const boss = watched(SNAPPER[0], t);
      const shoot = shootOn(t) && (posing(t) || (u > 7.9 && u < 8.6) || boss);
      return { x: shoot ? SNAPPER[0] - 0.25 : SNAPPER[0], y: SNAPPER[1] - (shoot ? 0.1 : 0), shoot, boss, u };
    }, (ctx, t, p) => {
      if (p.gone) return;
      if (p.rush) {
        const fire = !p.moving && ((t * 1.3) % 1) < 0.12;
        person(ctx, p.x, p.y, 0, { ...BEA, pose: p.moving ? 'run' : 'stand', dir: p.dir, back: p.back, arms: p.moving ? undefined : [1.7, 1.5], hold: p.moving ? null : camHeld(fire) }, t);
        if (fire) glow(ctx, p.x - 0.3, p.y + 0.3, 2.1, 1.2, C.white, 0.9);
        return;
      }
      const u = p.u;
      if (p.shoot) {
        // Bent to the viewfinder.
        person(ctx, p.x, p.y, 0, { ...BEA, pose: 'stand', dir: 'l', arms: [1.5, 1.25] }, t);
      } else if (u < 2.2) {
        // Checking her watch.
        person(ctx, p.x, p.y, 0, { ...BEA, pose: 'stand', dir: 'l', arms: [2.1, 0.15] }, t);
      } else if (u < 4.5) {
        // Looking over at the stair, where the talent should come up.
        person(ctx, p.x, p.y, 0, { ...BEA, pose: 'stand', dir: 'l', back: true }, t);
      } else {
        person(ctx, p.x, p.y, 0, { ...BEA, pose: 'stand', dir: 'l', arms: [0.2, -0.25] }, t);
      }
      const n = Math.floor(t / CYCLE);
      if (Q.detail && shootOn(t)) {
        if (p.boss) speech(ctx, p.x, p.y, 2.75, 'Any minute now!', { size: 0.4, dx: 3.0 });
        else if (u > 6.3 && u < 7.5) speech(ctx, p.x, p.y, 2.75, 'And... flap!', { size: 0.4, dx: 3.0 });
        else if (n % 2 === 0 && u > 2.4 && u < 5) speech(ctx, p.x, p.y, 2.75, lines[(n / 2) % lines.length], { size: 0.4, dx: 3.3 });
      }
    }, { bias: 0.1 });

    // ---- Mo, the art director: at the mood boards, and every hour over to
    // Theo's screen to nudge the N back. Ping-pong with Kyle after the pitch.
    const MO = { ...folk(562, { top: C.ink, bottom: C.ink, hair: C.grey, style: 'short', skin: SKIN[3] }), face: specs, dress: false };
    const HOME = [59.2, 18.9], TURN = [62.7, 19.0], DESK = [62.75, 23.85];
    const KEYS = [[0, HOME], [13, HOME], [15.5, TURN], [19.1, DESK], [23.4, DESK], [27.0, TURN], [29.5, HOME], [40, HOME]];
    const moRoute = (t) => {
      const u = ((t % 40) + 40) % 40;
      for (let i = 1; i < KEYS.length; i++) {
        const [t0, a] = KEYS[i - 1], [t1, b] = KEYS[i];
        if (u < t1) {
          const f = (u - t0) / (t1 - t0);
          const moving = a !== b;
          return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, moving, at: b === DESK && !moving, dir: (b[0] - a[0]) - (b[1] - a[1]) >= 0 ? 'r' : 'l', back: moving && (b[0] - a[0]) + (b[1] - a[1]) < 0, u };
        }
      }
      return { x: HOME[0], y: HOME[1], moving: false, u };
    };
    R.mover((t) => {
      const h = H(t);
      if (h < 9 || h >= 18.6) return { x: HOME[0], y: HOME[1], gone: true };
      if (gameOn(t)) return { x: 70.1, y: 16.1, dir: 'l', game: true };
      if (h >= 17.05) return { x: HOME[0], y: HOME[1], gone: true };
      const m = moRoute(t);
      const d = dash(t, [[m.x, m.y], [62.6, 19.6], [65.0, 24.3]], 4.5, 0.9);
      return d ? { ...d, rush: true } : m;
    }, (ctx, t, p) => {
      if (p.gone) return;
      if (p.game) {
        const sw = Math.sin(t * Math.PI / 0.8 + Math.PI);
        person(ctx, p.x, p.y, 0, { ...MO, pose: 'stand', dir: 'l', back: true, arms: [1.0 + sw * 0.5, -0.3], hold: paddle(C.ink) }, t);
        return;
      }
      if (p.rush) { person(ctx, p.x, p.y, 0, { ...MO, pose: p.moving ? 'run' : 'stand', dir: p.dir, back: p.back }, t); return; }
      if (p.at) {
        person(ctx, p.x, p.y, 0, { ...MO, pose: 'point', dir: 'l' }, t);
        if (Q.detail && p.u > 19.6 && p.u < 22.6 && !watched(p.x, t)) speech(ctx, p.x, p.y, 2.7, 'Nope.', { size: 0.4 });
      } else if (p.moving) {
        person(ctx, p.x, p.y, 0, { ...MO, pose: 'walk', dir: p.dir, back: p.back }, t);
      } else {
        // At the boards, chin in hand, now and then pointing at one.
        const point = (p.u % 13) > 9;
        person(ctx, p.x, p.y, 0, { ...MO, pose: point ? 'point' : 'stand', dir: 'l', back: true, arms: point ? undefined : [2.4, 0.3] }, t);
      }
    }, { bias: 0.1 });

    // ---- The beanbag corner: a rug, a beanbag with a designer asleep on
    // it (through bear o'clock and all), the record player, a big plant.
    R.rug(drawRug);
    R.thing(BEANBAG[0] + 0.6, BEANBAG[1] + 0.4, drawBeanbag);
    const NAP = folk(571, { top: C.leaf, bottom: C.navy, style: 'curly' });
    R.mover(() => ({ x: BEANBAG[0] + 0.1, y: BEANBAG[1] + 0.2 }), (ctx, t, p) => {
      const h = H(t);
      if (h < 9.5 || h >= 17.2) return;
      person(ctx, p.x + 0.25, p.y, 0.45, { ...NAP, pose: 'sleep', dir: 'r' }, t);
    }, { bias: 0.7 });
    R.thing(DECKS[0] + 0.5, DECKS[1] + 0.45, drawDecks);
    R.thing(DECKS[0] + 0.52, DECKS[1] + 0.47, drawSpin, { anim: true });
    R.thing(71.3, 10.0, (ctx) => plant(ctx, 71.3, 10.0, 0, 1.9, INK.pine));
    R.thing(65.6, 10.7, (ctx) => plant(ctx, 65.6, 10.7, 0, 1.4));

    // ---- The mood boards on easels, Mo's spot.
    EASELS.forEach(([x, y], i) => R.thing(x, y + 0.25, (ctx) => drawEasel(ctx, x, y, i)));
    // A stack of foam boards leaned against the easel, and a bin of rejects.
    R.thing(56.7, 16.2, (ctx) => {
      for (let i = 0; i < 3; i++) face(ctx, [[56.35 + i * 0.06, 15.0, 0], [56.35 + i * 0.06, 16.2, 0], [56.6 + i * 0.06, 16.2, 1.1], [56.6 + i * 0.06, 15.0, 1.1]], [C.white, C.butter, C.white][i], { lw: 0.025 });
    });
    R.thing(62.3, 16.9, (ctx) => {
      box(ctx, 61.95, 16.55, 0, 0.5, 0.5, 0.55, C.grey, { flat: true, lw: 0.025, top: shade(C.grey, 0.4) });
      if (Q.detail) for (let i = 0; i < 4; i++) {
        const [X, Y] = P3(62.1 + hash(i, 3) * 0.3, 16.7 + hash(i, 5) * 0.3, 0.6 + hash(i, 7) * 0.1);
        ctx.beginPath(); ctx.arc(X, Y, 0.1, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.02 });
      }
    });

    // ---- The ping-pong table: taped off till the pitch is done.
    R.thing(67, TABLE.y1, drawTable);
    R.thing(67.05, TABLE.y1 + 0.01, drawTape, { fade: (t) => (H(t) < 17.12 ? 1 : 0) });
    const pong = R.poke({ id: 'pingpong', at: [67, 16, 1], r: 0.9, hold: 0.9,
      say: (t) => (H(t) < 17.12 ? 'Not until after the pitch.' : gameOn(t) ? 'Game on. Finally.' : 'Kyle won. In the suit.') });
    // The ball: bounced once by a tap, rallied after the pitch, on the table
    // all night.
    R.thing(67.1, TABLE.y1 + 0.02, (ctx, t) => {
      let x, y, z;
      if (gameOn(t)) {
        const k = (t % 1.6) / 1.6, f = k < 0.5 ? k * 2 : 2 - k * 2;
        x = 64.9 + f * 4.2; y = 15.9 + Math.sin(t * 1.3) * 0.25;
        const q = (f * 2) % 1;
        z = TABLE.h + 0.08 + Math.sin(q * Math.PI) * 0.5;
      } else {
        const k = pong.k();
        if (H(t) < 17.12 && k < 0.02) return;
        x = 65.5 + k * 0.4; y = 16.4; z = TABLE.h + 0.08 + Math.sin(k * Math.PI) * 0.9;
        if (H(t) >= 17.12) {
          // Left where the game ended: the paddles, and the ball.
          x = 68.5; y = 15.2; z = TABLE.h + 0.08 + Math.sin(k * Math.PI) * 0.9;
          for (const [px, py, col] of [[65.4, 16.2, BRAND.can], [68.9, 16.5, C.ink]]) {
            const [PX, PY] = P3(px, py, TABLE.h + 0.02);
            ctx.beginPath(); ctx.ellipse(PX, PY, 0.28, 0.17, 0.4, 0, Math.PI * 2); paint(ctx, col, { lw: 0.025 });
            ctx.beginPath(); ctx.moveTo(PX + 0.2, PY + 0.12); ctx.lineTo(PX + 0.42, PY + 0.24); ctx.strokeStyle = C.wood; ctx.lineWidth = 0.08; ctx.stroke();
          }
        }
      }
      const [X, Y] = P3(x, y, z);
      ctx.beginPath(); ctx.arc(X, Y, 0.08, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.02 });
    }, { anim: true });
    // The skateboard, parked by the table: whose is a mystery.
    R.thing(71.0, 17.6, (ctx) => {
      const x0 = 70.3, x1 = 71.5, y = 17.35;
      for (const wx of [70.5, 71.3]) for (const dy of [-0.13, 0.13]) {
        const [X, Y] = P3(wx, y + dy, 0.06);
        ctx.beginPath(); ctx.arc(X, Y, 0.065, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.02 });
      }
      box(ctx, x0 + 0.08, y - 0.2, 0.12, x1 - x0 - 0.16, 0.4, 0.05, C.teal, { flat: true, lw: 0.025, top: C.ink });
      for (const [ex, z] of [[x0, 0.24], [x1, 0.24]]) {
        const s = ex < 71 ? 1 : -1;
        face(ctx, [[ex + s * 0.08, y - 0.2, 0.17], [ex + s * 0.08, y + 0.2, 0.17], [ex, y + 0.17, z], [ex, y - 0.17, z]], C.ink, { lw: 0.025 });
      }
      if (Q.detail) { const [X, Y] = P3(70.9, y, 0.18); ctx.beginPath(); ctx.arc(X, Y, 0.09, 0, Math.PI * 2); ctx.fillStyle = C.coral; ctx.fill(); }
    });
    R.find({ id: 'skateboard', label: 'A skateboard', at: [70.9, 17.35, 0.2], r: 0.7 });

    // ---- The front desks: Theo kerning (Mo moves it back every hour), a
    // Pantone swatch, and at bear o'clock the screen with the forbidden font.
    const front = [...pod(R, 59.6, 'front', 3), ...pod(R, 68.4, 'front', 3)];
    const WIN = { 2: [56.8, 25.0], 3: [62.35, 24.7], 4: [56.5, 24.1], 9: [71.15, 25.15], 11: [71.7, 24.3] };
    const FRONT_KINDS = [
      'mood', 'kern', 'mood', 'photos', 'helvetica', 'photos',
      'mood', 'logo', 'mood', (t) => (bearOClock(t) ? 'comic' : 'helvetica'), 'mood', 'photos',
    ];
    staff(R, front, 565, {
      empty: [6, 10],
      look: (i) => (i === 1 ? { top: C.mustard, hat: 'beanie', hatColor: C.teal, bottom: C.ink } : {}),
      each: (i) => (WIN[i] ? { window: WIN[i] } : {}),
      kinds: FRONT_KINDS,
    });
    // Theo, pleased with himself, every time he's nudged it.
    const theo = front[1];
    R.mover(() => ({ x: theo.x, y: theo.y + 0.02 }), (ctx, t) => {
      const u = ((t % 40) + 40) % 40;
      if (!Q.detail || u < 0.6 || u > 3.4 || !seated(t, 0.2) || rushK(t) > 0 || watched(theo.mon[0], t)) return;
      speech(ctx, theo.x, theo.y, 2.65, 'Perfect.', { size: 0.4 });
    }, { bias: 0.3 });
    // The swatch, fanned out on a desk.
    const sw = [58.9, 21.6, DESK_TOP];
    R.thing(sw[0] + 0.2, sw[1] + 0.3, (ctx) => {
      const [X, Y] = P3(sw[0], sw[1], sw[2] + 0.02);
      const cols = [INK.maple, C.coral, C.mustard, C.leaf, C.teal, C.purple, C.pink];
      cols.forEach((col, i) => {
        const a = -0.95 + i * 0.3;
        ctx.save();
        ctx.translate(X, Y);
        ctx.scale(1, 0.55);
        ctx.rotate(a);
        ctx.beginPath(); ctx.roundRect(-0.085, -0.78, 0.17, 0.78, 0.025);
        paint(ctx, col, { lw: 0.018 });
        ctx.fillStyle = C.white; ctx.fillRect(-0.06, -0.75, 0.12, 0.1);
        ctx.restore();
      });
      ctx.beginPath(); ctx.arc(X, Y, 0.035, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
    });
    R.find({ id: 'pantone', label: 'A Pantone swatch', at: [sw[0], sw[1] - 0.15, sw[2] + 0.1], r: 0.6 });
    const cs = front[9];
    R.find({ id: 'comic-sans', label: 'A document in Comic Sans', kind: 'hard', at: [cs.mon[0] + 0.06, cs.mon[1], 1.7], r: 0.6, when: bearOClock, note: 'bear o\'clock',
      riddle: 'The forbidden font, out while its owner looks at the bear.', hint: 'At bear o\'clock one of Creative\'s screens shows something nobody is supposed to use.' });

    // Odds and ends on the desks: a stack of proofs, another mug.
    R.thing(front[3].top[0] - 0.4, front[3].top[1] + 0.6, (ctx) => papers(ctx, front[3].top[0] - 0.4, front[3].top[1] + 0.55, DESK_TOP, 4));
    R.thing(front[7].top[0], front[7].top[1] - 0.8, (ctx) => mug(ctx, front[7].top[0], front[7].top[1] - 0.85, DESK_TOP, C.butter));
  },
};
