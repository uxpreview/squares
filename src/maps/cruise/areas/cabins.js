// The Cabins. A corridor along the hull and a row of cabins down the cut
// side, doors open, 1 to 12, with the honeymoon suite at the stern. Cabin 7
// is a divorce, live: every hour something else of Ray's flies out of the
// door onto a pile in the corridor. The room steward's towel animals get
// grander cabin by cabin. Keep the id: it's in links and saves.
//
// Everything in the cabins is cut down to a dollhouse wall (WH) so you can see
// into every cabin and over them into the corridor. The walls leave room for
// the day's walks (day.js): Doreen from the lift to her chair between
// cabins 3 and 4, the steward through cabin 12 and out through 11.
import {
  C, Q, box, rect, disc, cylinder, face, poly, paint, person, folk, plant, speech,
  shade, tint, alpha, onLeft, onRight, paintText,
} from '../../../engine/art.js';
import { route, clamp } from '../../../engine/actors.js';
import { ZK } from '../../../engine/iso.js';
import { deck } from '../ship.js';
import { P, shape, lettering, board, porthole, lifebuoy, bucket, cocktail, towelAnimal, sighting } from '../kit.js';
import { INK, MAT, at, wrap, green, queasy, seaAt } from '../style.js';

// ---------- The plan of the row ----------
const FY = 8.5; // the cabins' front wall, along the corridor
const T = 0.08; // half a wall's thickness
const WH = 1.0; // the cut height of every cabin wall
const DW = 1.8; // a doorway
const WALLC = INK.hullWhite;
const CARPET = tint(INK.sea, 0.62);
const SPREAD = [INK.flamingo, INK.sunYellow, C.sky, C.lilac, INK.funnelRed, C.tealLight];

// Cabin n runs x 4n-4 to 4n (1 and 2 are the honeymoon suite, x 0 to 8).
const x0Of = (n) => (n <= 2 ? 0 : 4 * n - 4);
// Doorways: most in the middle-left; a few moved for the walks through them.
const DOORS = { 1: 6.2, 3: 11.55, 4: 12.45, 6: 21.6, 11: 41.8, 12: 45.3 };
const doorOf = (n) => DOORS[n] ?? x0Of(n) + 2.2;
// Which side the open door is hung on (right: it swings open against the
// doorway's right-hand side, out of a walk's way).
const HINGE_R = { 4: true };
const ROOMS = [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
// Gaps in the walls between cabins: [from y, to y]. Cabins 3 and 4 are
// Doreen's family's, connecting, through a double doorway (she walks
// straight down from the lift to her chair, at x 12); the steward's short cut (44).
const LINKS = { 12: [FY + T, 13], 44: [9.2, 11.1] };
// Where each cabin's bed stands (x from, x to), clear of the chunk seams at 16 and 32.
const bedX = (n) => (n === 5 ? [17.0, 19.6] : n === 9 ? [33.0, 35.4] : [x0Of(n) + 0.6, x0Of(n) + 3.4]);
const BED_Y = [13, 15.4];

// Now and then: true for dur seconds out of every period.
const every = (t, period, dur, off = 0) => (((t + off) % period) + period) % period < dur;
// Where a standing person's near hand is, in their own units, for an arm at angle a.
const hand = (a) => [0.22 + Math.sin(a) * 0.72, -1.53 + Math.cos(a) * 0.72];

// ---------- Small drawing helpers ----------
function cutWall(ctx, x0, y0, x1, y1, color = WALLC, h = WH) {
  box(ctx, x0, y0, 0, x1 - x0, y1 - y0, h, color, { flat: true, top: C.ink, left: shade(color, 0.08), right: shade(color, 0.16), lw: 0.04 });
}
// An upright flat thing (a picture, a sign) facing the viewer's left, on the plane y.
function onY(ctx, x0, x1, y, z0, z1, fill, o) {
  face(ctx, [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], fill, o);
}
function heart(ctx, X, Y, s, fill) {
  ctx.beginPath();
  ctx.moveTo(X, Y + s * 0.35);
  ctx.bezierCurveTo(X - s * 0.9, Y - s * 0.25, X - s * 0.35, Y - s * 0.85, X, Y - s * 0.35);
  ctx.bezierCurveTo(X + s * 0.35, Y - s * 0.85, X + s * 0.9, Y - s * 0.25, X, Y + s * 0.35);
  paint(ctx, fill, { lw: 0.02 });
}
// Sunglasses, drawn over a face (a person's, a towel animal's).
function shades(ctx, x, y, s = 1) {
  ctx.fillStyle = C.black;
  ctx.beginPath();
  ctx.ellipse(x - 0.07 * s, y, 0.075 * s, 0.05 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 0.09 * s, y, 0.075 * s, 0.05 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 0.02 * s, y - 0.012 * s, 0.06 * s, 0.024 * s);
}

// A bed, its head against the wall at x0: frame, mattress, spread, pillows.
function bed(ctx, x0, x1, spread, o = {}) {
  const [y0, y1] = BED_Y;
  box(ctx, x0 - 0.22, y0, 0, 0.22, y1 - y0, 1.35, MAT.teakDark, { lw: 0.04 });
  box(ctx, x0, y0, 0, x1 - x0, y1 - y0, 0.35, INK.teak, { lw: 0.04 });
  box(ctx, x0, y0, 0.35, x1 - x0, y1 - y0, 0.35, C.white, { flat: true, lw: 0.04 });
  // the spread over the foot, and its fold
  box(ctx, x0 + (x1 - x0) * 0.45, y0 - 0.02, 0.35, (x1 - x0) * 0.55 + 0.02, y1 - y0 + 0.04, 0.37, spread, { flat: true, lw: 0.04, top: tint(spread, 0.15) });
  if (Q.detail) face(ctx, [[x0 + (x1 - x0) * 0.62, y0, 0.73], [x0 + (x1 - x0) * 0.62, y1, 0.73]], null, { lw: 0.03, stroke: shade(spread, 0.3) });
  if (o.pillows !== false) {
    const n = o.pillows ?? 2;
    for (let i = 0; i < n; i++) {
      const py = y0 + 0.2 + i * ((y1 - y0 - 0.4) / n);
      box(ctx, x0 + 0.1, py + 0.05, 0.7, 0.55, (y1 - y0 - 0.4) / n - 0.1, 0.18, C.white, { flat: true, lw: 0.03 });
    }
  }
}
// A low dresser against the front wall, with a few things on it (fill).
function dresser(ctx, x0, x1, fill) {
  box(ctx, x0, FY + T + 0.02, 0, x1 - x0, 0.62, 0.9, INK.teak, { lw: 0.04 });
  if (Q.detail) for (const z of [0.3, 0.6]) face(ctx, [[x0 + 0.05, FY + T + 0.64, z], [x1 - 0.05, FY + T + 0.64, z]], null, { lw: 0.025, stroke: MAT.teakDark });
  if (fill) fill(ctx);
}
// A room service tray on the floor: plates under a domed cover, a napkin.
function tray(ctx, x, y, z = 0, o = {}) {
  box(ctx, x - 0.4, y - 0.28, z, 0.8, 0.56, 0.05, MAT.chrome, { flat: true, lw: 0.03 });
  disc(ctx, x - 0.12, y, z + 0.06, 0.2, C.white, { lw: 0.02 });
  if (o.cloche !== false) {
    // (o.lift: a tap lifts the lid, 0 to 1, on two cold fried eggs.)
    const lift = o.lift || 0;
    if (lift > 0.02) {
      for (const dx of [-0.07, 0.05]) {
        disc(ctx, x - 0.12 + dx, y + dx * 0.4, z + 0.07, 0.08, C.white, { lw: 0.012 });
        disc(ctx, x - 0.12 + dx, y + dx * 0.4, z + 0.075, 0.035, INK.sunYellow, { stroke: false });
      }
    }
    const [X, Y] = P(x - 0.12, y, z + 0.06);
    ctx.save();
    ctx.translate(X + lift * 0.12, Y - lift * 0.55);
    ctx.rotate(lift * 0.5);
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.26, 0.24, 0, Math.PI, 0);
    ctx.closePath();
    paint(ctx, MAT.chrome, { lw: 0.025 });
    ctx.beginPath(); ctx.arc(0, -0.25, 0.035, 0, Math.PI * 2); paint(ctx, MAT.steel, { lw: 0.015 });
    ctx.restore();
  } else {
    // eaten: crumbs and a crust
    disc(ctx, x - 0.1, y + 0.02, z + 0.07, 0.07, C.woodLight, { lw: 0.015 });
  }
  box(ctx, x + 0.14, y - 0.18, z + 0.05, 0.18, 0.36, 0.03, C.white, { flat: true, lw: 0.015 });
  if (o.glass) cocktail(ctx, x + 0.25, y + 0.16, z + 0.05, { color: o.glass });
}
// A pair of shoes (or flip-flops) side by side, toes out.
function shoes(ctx, x, y, color, flip = false) {
  for (const dy of [-0.13, 0.13]) {
    if (flip) {
      disc(ctx, x, y + dy, 0.01, 0.12, color, { lw: 0.02 });
      disc(ctx, x + 0.14, y + dy, 0.01, 0.1, color, { lw: 0.02 });
      face(ctx, [[x + 0.16, y + dy, 0.02], [x + 0.04, y + dy - 0.08, 0.05]], null, { lw: 0.02 });
    } else box(ctx, x - 0.18, y + dy - 0.06, 0, 0.36, 0.12, 0.12, color, { lw: 0.02, flat: true });
  }
}
// A little suitcase: lying down (w along x) or standing up.
function suitcase(ctx, x, y, z, color, up = false) {
  if (up) {
    box(ctx, x - 0.35, y - 0.12, z, 0.7, 0.24, 0.95, color, { lw: 0.035 });
    face(ctx, [[x - 0.1, y, z + 0.95], [x - 0.1, y, z + 1.12], [x + 0.1, y, z + 1.12], [x + 0.1, y, z + 0.95]], null, { lw: 0.04 });
  } else {
    box(ctx, x - 0.62, y - 0.4, z, 1.24, 0.8, 0.36, color, { lw: 0.035 });
    if (Q.detail) face(ctx, [[x - 0.62, y + 0.4, z + 0.18], [x + 0.62, y + 0.4, z + 0.18]], null, { lw: 0.025, stroke: shade(color, 0.4) });
    disc(ctx, x + 0.25, y + 0.05, z + 0.37, 0.12, INK.sunYellow, { lw: 0.02 }); // a sticker from the last port
  }
}

// ---------- Towel animals ----------
// The steward's towel animals, grander down the corridor: kit.towelAnimal
// (swan, elephant, monkey) and the hats, glasses and props that go on them.
function towel(ctx, x, y, z, kind) {
  const base = { swanHat: 'swan', swanTux: 'swan', swanOut: 'swan', elephantShades: 'elephant', elephantParty: 'elephant' }[kind] || kind;
  const [X, Y] = P(x, y, z);
  if (kind === 'ray') return towelRay(ctx, x, y, z);
  if (kind === 'stack') {
    towelAnimal(ctx, x, y, z, 'elephant');
    towelAnimal(ctx, x, y, z + 0.34, 'swan');
    return;
  }
  if (kind === 'hearts') {
    // two swans, necks making a heart
    ctx.save(); ctx.translate(X, Y);
    for (const s of [-1, 1]) {
      ctx.save(); ctx.scale(s, 1); ctx.translate(-0.26, 0);
      ctx.beginPath(); ctx.ellipse(-0.05, -0.14, 0.26, 0.13, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.025 });
      ctx.beginPath();
      ctx.moveTo(0.1, -0.2); ctx.quadraticCurveTo(0.34, -0.66, 0.24, -0.7); ctx.quadraticCurveTo(0.12, -0.68, 0.26, -0.44);
      ctx.quadraticCurveTo(0.2, -0.34, 0.04, -0.24);
      paint(ctx, C.white, { lw: 0.025 });
      ctx.restore();
    }
    heart(ctx, 0, -0.52, 0.12, INK.flamingo);
    ctx.restore();
    return;
  }
  if (kind === 'swanOut') {
    // passed out, on its side, in sunglasses
    ctx.save(); ctx.translate(X, Y);
    ctx.beginPath(); ctx.ellipse(0, -0.1, 0.3, 0.11, 0.1, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.025 });
    ctx.beginPath(); ctx.moveTo(0.22, -0.1); ctx.quadraticCurveTo(0.5, -0.12, 0.56, -0.02); ctx.quadraticCurveTo(0.44, 0.0, 0.26, -0.04);
    paint(ctx, C.white, { lw: 0.025 });
    shades(ctx, 0.52, -0.05, 0.7);
    ctx.restore();
    return;
  }
  towelAnimal(ctx, x, y, z, base);
  if (!Q.detail) return;
  ctx.save(); ctx.translate(X, Y);
  if (kind === 'swanHat' || kind === 'swanTux') {
    // a hat on the swan's head, at about (0.2, -0.6)
    ctx.fillStyle = C.black;
    ctx.fillRect(0.1, -0.64, 0.2, 0.03);
    ctx.fillRect(0.14, kind === 'swanTux' ? -0.82 : -0.73, 0.12, kind === 'swanTux' ? 0.19 : 0.1);
    if (kind === 'swanTux') {
      ctx.beginPath(); ctx.moveTo(0.08, -0.3); ctx.lineTo(0.2, -0.24); ctx.lineTo(0.2, -0.36); ctx.closePath();
      ctx.moveTo(0.08, -0.3); ctx.lineTo(-0.04, -0.24); ctx.lineTo(-0.04, -0.36); ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = INK.flamingo; ctx.fillRect(0.14, -0.66, 0.12, 0.025);
    }
  } else if (kind === 'elephantShades') {
    shades(ctx, 0.27, -0.33, 0.9);
  } else if (kind === 'elephantParty') {
    ctx.beginPath(); ctx.moveTo(0.16, -0.4); ctx.lineTo(0.25, -0.66); ctx.lineTo(0.34, -0.4); ctx.closePath();
    paint(ctx, INK.flamingo, { lw: 0.02, dots: INK.sunYellow, density: 0.4 });
  }
  ctx.restore();
}
// The towel Ray: a towel man, bald, a mustache, a tiny golf club.
function towelRay(ctx, x, y, z) {
  const [X, Y] = P(x, y, z);
  ctx.save(); ctx.translate(X, Y);
  ctx.beginPath(); ctx.ellipse(0, -0.2, 0.2, 0.22, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.025 });
  ctx.beginPath(); ctx.ellipse(-0.12, -0.02, 0.12, 0.06, 0, 0, Math.PI * 2); ctx.ellipse(0.12, -0.02, 0.12, 0.06, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.02 });
  ctx.beginPath(); ctx.arc(0, -0.52, 0.14, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.025 });
  if (Q.detail) {
    ctx.fillStyle = C.ink;
    ctx.beginPath(); ctx.arc(-0.04, -0.54, 0.018, 0, Math.PI * 2); ctx.arc(0.05, -0.54, 0.018, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = HAIRY; ctx.fillRect(-0.07, -0.49, 0.14, 0.03); // the mustache
    ctx.strokeStyle = MAT.steel; ctx.lineWidth = 0.025;
    ctx.beginPath(); ctx.moveTo(0.18, -0.24); ctx.lineTo(0.3, 0.02); ctx.lineTo(0.38, 0.02); ctx.stroke();
    ctx.fillStyle = C.mustard; ctx.fillRect(-0.16, -0.26, 0.32, 0.05); // a mustard stripe, like his shirt
  }
  ctx.restore();
}
const HAIRY = shade(C.brown, 0.3);

// The towel monkey (a find), hanging by its arms from a lampshade rim at zr,
// its body at (x, y, z).
function towelMonkey(ctx, x, y, z, zr) {
  const [X, Y] = P(x, y, z);
  // Drawn half as big again as the other towel animals, so it reads as a
  // monkey from a room's framing (the playtest took it for a swan).
  const k = 1.45, rise = ((zr - z) * ZK) / k;
  ctx.save(); ctx.translate(X, Y); ctx.scale(k, k);
  // arms up to the rim
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(s * 0.1, -0.12); ctx.quadraticCurveTo(s * 0.2, -rise * 0.5, s * 0.14, -rise);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.11; ctx.stroke();
    ctx.strokeStyle = C.white; ctx.lineWidth = 0.07; ctx.stroke();
  }
  // legs dangling, and a curly tail
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(s * 0.07, 0.12); ctx.quadraticCurveTo(s * 0.16, 0.26, s * 0.1, 0.36);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.11; ctx.stroke();
    ctx.strokeStyle = C.white; ctx.lineWidth = 0.07; ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(0.1, 0.1); ctx.quadraticCurveTo(0.34, 0.2, 0.3, 0.02); ctx.quadraticCurveTo(0.26, -0.06, 0.2, 0.0);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.06; ctx.stroke();
  ctx.strokeStyle = C.white; ctx.lineWidth = 0.03; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, 0, 0.14, 0.17, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.025 });
  // head, ears, face
  ctx.beginPath(); ctx.arc(-0.15, -0.28, 0.06, 0, Math.PI * 2); ctx.arc(0.15, -0.28, 0.06, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.02 });
  ctx.beginPath(); ctx.arc(0, -0.27, 0.13, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.025 });
  ctx.beginPath(); ctx.ellipse(0, -0.24, 0.08, 0.065, 0, 0, Math.PI * 2); paint(ctx, C.woodLight, { lw: 0.015 });
  if (Q.detail) {
    ctx.fillStyle = C.ink;
    ctx.beginPath(); ctx.arc(-0.035, -0.3, 0.016, 0, Math.PI * 2); ctx.arc(0.035, -0.3, 0.016, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -0.22, 0.03, 0.2, Math.PI - 0.2); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.012; ctx.stroke();
  }
  ctx.restore();
}

// The nibbled garland (a find): a lei from the last port, flat on the bed,
// half its flowers bitten, a crescent at a time. bed: the spread's color.
function garland(ctx, x, y, z, bedColor) {
  const r = 0.36, n = 11;
  disc(ctx, x, y, z, r, null, { lw: 0.035, stroke: C.green });
  const inks = [INK.sunYellow, INK.flamingo, C.coral];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.2;
    const fx = x + Math.cos(a) * r, fy = y + Math.sin(a) * r;
    if (i === 6) { // eaten to the string
      disc(ctx, fx, fy, z + 0.002, 0.04, C.leaf, { lw: 0.012 });
      continue;
    }
    disc(ctx, fx, fy, z + 0.003, 0.1, inks[i % 3], { lw: 0.018 });
    if ([0, 2, 3, 5, 8].includes(i)) {
      // a crescent bite out of the outside of the flower
      disc(ctx, fx + Math.cos(a) * 0.08, fy + Math.sin(a) * 0.08, z + 0.004, 0.075, bedColor, { stroke: false });
      if (Q.detail) {
        const [X, Y] = P(fx + Math.cos(a) * 0.08, fy + Math.sin(a) * 0.08, z + 0.004);
        ctx.beginPath(); ctx.ellipse(X, Y, 0.075 * Math.SQRT2, 0.075 * Math.SQRT2 / 2, 0, 0, Math.PI * 2);
        ctx.strokeStyle = alpha(C.ink, 0.5); ctx.lineWidth = 0.012; ctx.stroke();
      }
    } else if (Q.detail) disc(ctx, fx, fy, z + 0.005, 0.03, INK.sunYellow, { stroke: false });
  }
}

// A banded green tail tip (screen units, at the context's origin): from a
// (where it leaves the towel) out and curling up to its tip.
const IGK = { skin: INK.queasyGreen, dark: shade(INK.queasyGreen, 0.35), pale: tint(INK.queasyGreen, 0.45) };
function tailTip(ctx, pts, w0) {
  const [a, b, c] = pts;
  ctx.lineCap = 'round';
  const n = 6;
  for (let i = 0; i < n; i++) {
    // short pieces, each thinner, so it tapers
    const u0 = i / n, u1 = (i + 1) / n;
    const q = (u) => [(1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * b[0] + u * u * c[0], (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * b[1] + u * u * c[1]];
    const [x0, y0] = q(u0), [x1, y1] = q(u1);
    const w = w0 * (1 - u0 * 0.8);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
    if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = w + 0.05; ctx.stroke(); }
    ctx.strokeStyle = i % 2 ? IGK.dark : IGK.skin; ctx.lineWidth = w; ctx.stroke();
  }
}

// The towel crocodile (the decoy): the steward's proudest work, in green
// towelling, lying along the spread with a prize rosette. Facing right.
function towelCroc(ctx, x, y, z) {
  const [X, Y] = P(x, y, z);
  const G = INK.queasyGreen, D = shade(INK.queasyGreen, 0.3);
  ctx.save(); ctx.translate(X, Y); ctx.scale(1.45, 1.45);
  // stubby rolled-washcloth legs
  for (const lx of [-0.3, -0.05, 0.2, 0.42]) { ctx.beginPath(); ctx.ellipse(lx, -0.02, 0.07, 0.04, 0, 0, Math.PI * 2); paint(ctx, D, { lw: 0.015 }); }
  // the tail, tapering off to the left with a flick up
  ctx.beginPath();
  ctx.moveTo(-0.32, -0.2); ctx.quadraticCurveTo(-0.7, -0.14, -0.86, -0.26); ctx.quadraticCurveTo(-0.72, -0.06, -0.3, -0.04);
  ctx.closePath(); paint(ctx, G, { lw: 0.022 });
  // the body: a fat roll, with its towel folds
  ctx.beginPath(); ctx.ellipse(0.04, -0.13, 0.42, 0.12, 0, 0, Math.PI * 2); paint(ctx, G, { lw: 0.025, dots: D, density: 0.18 });
  // the snout: long and flat, jaws a little open, teeth all along
  ctx.beginPath();
  ctx.moveTo(0.38, -0.22); ctx.lineTo(0.86, -0.17); ctx.quadraticCurveTo(0.9, -0.12, 0.84, -0.11); ctx.lineTo(0.42, -0.1); ctx.closePath();
  paint(ctx, G, { lw: 0.022 });
  if (Q.detail) {
    ctx.strokeStyle = D; ctx.lineWidth = 0.018;
    for (const fx of [-0.18, 0.02, 0.2]) { ctx.beginPath(); ctx.moveTo(fx, -0.24); ctx.quadraticCurveTo(fx + 0.04, -0.13, fx, -0.03); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(0.46, -0.145);
    for (let i = 0; i < 7; i++) ctx.lineTo(0.5 + i * 0.05 + 0.025, i % 2 ? -0.145 : -0.115);
    ctx.strokeStyle = C.white; ctx.lineWidth = 0.02; ctx.stroke();
    // nostrils
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0.82, -0.17, 0.012, 0, Math.PI * 2); ctx.fill();
  }
  // two rolled eye bumps with googly eyes
  for (const ex of [0.36, 0.47]) {
    ctx.beginPath(); ctx.arc(ex, -0.25, 0.06, 0, Math.PI * 2); paint(ctx, G, { lw: 0.018 });
    ctx.beginPath(); ctx.arc(ex + 0.005, -0.27, 0.035, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.012 });
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(ex + 0.015, -0.265, 0.016, 0, Math.PI * 2); ctx.fill();
  }
  // the rosette: 1ST, from the steward's towel animal league
  ctx.beginPath(); ctx.moveTo(-0.5, 0.0); ctx.lineTo(-0.56, 0.14); ctx.lineTo(-0.5, 0.11); ctx.lineTo(-0.46, 0.15); ctx.lineTo(-0.44, 0.0); ctx.closePath();
  paint(ctx, C.sky, { lw: 0.012 });
  ctx.beginPath(); ctx.arc(-0.48, -0.03, 0.07, 0, Math.PI * 2); paint(ctx, INK.sunYellow, { lw: 0.015 });
  if (Q.detail) { ctx.fillStyle = C.ink; ctx.font = '800 0.045px "Rethink Sans", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('1ST', -0.48, -0.015); }
  ctx.restore();
}

// The iguana, posing as a towel animal on the suite's bed (sighting 2): a
// white towel folded over it like the steward's swans, a bite of Doreen's
// melon rind in its mouth (no flower: only the garland under the cloche is
// flowers). Its green snout, one eye (it blinks) and the tip of
// its tail show the whole time. Facing right; drawn bigger than a towel swan.
function towelIguana(ctx, x, y, z, t) {
  const [X, Y] = P(x, y, z);
  ctx.save(); ctx.translate(X, Y); ctx.scale(1.5, 1.5);
  // the tail tip, out from under the back of the towel, curling up
  tailTip(ctx, [[-0.36, -0.08], [-0.7, -0.02], [-0.64, -0.24]], 0.075);
  // feet, tucked under: just the toes of one
  if (Q.detail) {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02;
    ctx.beginPath(); ctx.moveTo(0.18, 0.0); ctx.lineTo(0.27, 0.01); ctx.moveTo(0.18, 0.0); ctx.lineTo(0.25, -0.04); ctx.stroke();
  }
  // the snout, out of the towel's fold, with the rind in its mouth
  ctx.beginPath();
  ctx.moveTo(0.34, -0.44);
  ctx.bezierCurveTo(0.44, -0.5, 0.6, -0.47, 0.68, -0.38);
  ctx.bezierCurveTo(0.71, -0.32, 0.65, -0.28, 0.55, -0.28);
  ctx.lineTo(0.36, -0.26);
  ctx.closePath();
  paint(ctx, IGK.skin, { lw: 0.025 });
  ctx.beginPath(); ctx.moveTo(0.52, -0.28); ctx.quadraticCurveTo(0.5, -0.17, 0.38, -0.24); ctx.closePath();
  paint(ctx, IGK.pale, { lw: 0.02 }); // the dewlap
  if (Q.detail) {
    ctx.beginPath(); ctx.moveTo(0.68, -0.33); ctx.quadraticCurveTo(0.6, -0.3, 0.5, -0.32);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.018; ctx.stroke();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0.64, -0.39, 0.012, 0, Math.PI * 2); ctx.fill();
  }
  // the eye, blinking every few seconds
  const blink = ((t % 3.3) + 3.3) % 3.3 < 0.18;
  if (blink) {
    ctx.beginPath(); ctx.arc(0.5, -0.4, 0.04, 0.2, Math.PI - 0.2);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02; ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(0.5, -0.4, 0.045, 0, Math.PI * 2); paint(ctx, C.coral, { lw: 0.015 });
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0.51, -0.4, 0.022, 0, Math.PI * 2); ctx.fill();
  }
  // the melon rind, Doreen's, a crescent held crossways in its jaws
  ctx.save(); ctx.translate(0.74, -0.31); ctx.rotate(0.35);
  ctx.beginPath(); ctx.arc(0, -0.05, 0.13, 0.15, Math.PI - 0.15); ctx.closePath();
  paint(ctx, C.leaf, { lw: 0.014 });
  ctx.beginPath(); ctx.arc(0, -0.06, 0.1, 0.25, Math.PI - 0.25); ctx.closePath();
  paint(ctx, tint(C.coral, 0.5), { lw: 0.01 });
  ctx.restore();
  // the towel: a folded body like the steward's, and a rolled hood over its head
  ctx.beginPath();
  ctx.moveTo(-0.42, 0.0);
  ctx.bezierCurveTo(-0.46, -0.3, -0.1, -0.4, 0.18, -0.36);
  ctx.bezierCurveTo(0.3, -0.34, 0.36, -0.26, 0.36, -0.12);
  ctx.lineTo(0.34, 0.02);
  ctx.closePath();
  paint(ctx, C.white, { lw: 0.025, dots: C.greyLight, density: 0.12 });
  ctx.beginPath();
  ctx.moveTo(0.2, -0.28);
  ctx.bezierCurveTo(0.22, -0.52, 0.42, -0.58, 0.54, -0.48);
  ctx.quadraticCurveTo(0.5, -0.43, 0.44, -0.44);
  ctx.quadraticCurveTo(0.34, -0.42, 0.34, -0.24);
  ctx.closePath();
  paint(ctx, C.white, { lw: 0.022 });
  if (Q.detail) {
    // the towel's folds and its hem
    ctx.strokeStyle = C.greyLight; ctx.lineWidth = 0.02;
    ctx.beginPath(); ctx.moveTo(-0.3, -0.18); ctx.quadraticCurveTo(-0.05, -0.28, 0.2, -0.22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-0.34, -0.06); ctx.quadraticCurveTo(-0.02, -0.14, 0.3, -0.08); ctx.stroke();
    ctx.strokeStyle = C.sky; ctx.lineWidth = 0.025;
    ctx.beginPath(); ctx.moveTo(-0.4, -0.02); ctx.lineTo(0.34, -0.0); ctx.stroke();
  }
  ctx.restore();
}

// The suite's breakfast in bed: a tray, a silver cloche (lifted by k), and
// under it a melon rind and the nibbled garland. A loop of the garland has
// slipped out from under the front of the rim, three flowers on its string
// (one bitten), so the cloche says "lift me".
function breakfastInBed(ctx, x, y, z, k) {
  box(ctx, x - 0.6, y - 0.5, z, 1.2, 1.0, 0.05, MAT.chrome, { flat: true, lw: 0.03 });
  const zt = z + 0.06;
  const gx = x - 0.05, gy = y - 0.05;
  // the loop's string, from under the rim and back
  const ring = (a, r) => P(gx + Math.cos(a) * r, gy + Math.sin(a) * r, zt);
  ctx.beginPath();
  for (let i = 0; i <= 12; i++) {
    const a = 0.05 + (i / 12) * 1.45, r = 0.4 + Math.sin((i / 12) * Math.PI) * 0.22;
    const [X, Y] = ring(a, r); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
  }
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke(); }
  ctx.strokeStyle = C.green; ctx.lineWidth = 0.03; ctx.stroke();
  // its three flowers, the middle one bitten
  [[0.36, 0.58, INK.sunYellow], [0.78, 0.62, INK.flamingo], [1.2, 0.58, C.coral]].forEach(([a, r, ink], i) => {
    const fx = gx + Math.cos(a) * r, fy = gy + Math.sin(a) * r;
    disc(ctx, fx, fy, zt + 0.003, 0.14, ink, { lw: 0.02 });
    if (i === 1) disc(ctx, fx + Math.cos(a) * 0.12, fy + Math.sin(a) * 0.12, zt + 0.004, 0.09, MAT.chrome, { stroke: false });
    if (Q.detail) disc(ctx, fx, fy, zt + 0.005, 0.045, INK.sunYellow === ink ? C.coral : INK.sunYellow, { stroke: false });
  });
  if (k > 0.02) {
    garland(ctx, x - 0.05, y - 0.05, zt, MAT.chrome);
    // the melon: a rind, bitten clean
    const [X, Y] = P(x + 0.3, y - 0.25, zt);
    ctx.beginPath(); ctx.arc(X, Y - 0.04, 0.14, 0.1, Math.PI - 0.1); ctx.closePath();
    paint(ctx, C.leaf, { lw: 0.015 });
    ctx.beginPath(); ctx.arc(X, Y - 0.05, 0.1, 0.2, Math.PI - 0.2); ctx.closePath();
    paint(ctx, tint(C.coral, 0.5), { lw: 0.01 });
  }
  const [X, Y] = P(x - 0.05, y - 0.05, zt);
  ctx.save();
  ctx.translate(X - k * 0.35, Y - k * 0.95);
  ctx.rotate(-k * 0.45);
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.62, 0.31, 0, 0, Math.PI);
  ctx.ellipse(0, 0, 0.62, 0.58, 0, Math.PI, 0);
  paint(ctx, MAT.chrome, { lw: 0.03, dots: MAT.steel, density: 0.1 });
  if (Q.detail) {
    ctx.beginPath(); ctx.ellipse(-0.2, -0.3, 0.14, 0.08, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = alpha(C.white, 0.7); ctx.fill();
  }
  ctx.beginPath(); ctx.arc(0, -0.6, 0.06, 0, Math.PI * 2); paint(ctx, MAT.steel, { lw: 0.02 });
  ctx.restore();
}

// The tower of room service trays outside the suite: one more every hour the
// honeymooners don't come out. It sways, more the taller it gets, and a tap
// sets it going properly (k).
const TOWER = { x: 7.4, y: 6.7 };
const towerTrays = (t) => clamp(3 + Math.floor(wrap(t) / at(8)), 3, 14); // (at(8) is an hour in)
function trayTower(ctx, t, k) {
  const n = towerTrays(t);
  const [X, Y] = P(TOWER.x, TOWER.y, 0);
  const sway = Math.sin(t * 1.4) * 0.004 * n + Math.sin(t * 9) * 0.05 * k;
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(1.25, 1.25);
  for (let i = 0; i < n; i++) {
    const h = i * 0.3 * ZK;
    ctx.save();
    ctx.translate(sway * i * 1.8, -h);
    ctx.rotate(sway * (i % 2 ? 1 : -0.5));
    // a tray, seen from the corner, and its lid
    ctx.beginPath();
    ctx.moveTo(-0.5, 0); ctx.lineTo(0, -0.25); ctx.lineTo(0.5, 0); ctx.lineTo(0, 0.25); ctx.closePath();
    paint(ctx, MAT.chrome, { lw: 0.025 });
    ctx.beginPath(); ctx.moveTo(-0.5, 0); ctx.lineTo(0, 0.25); ctx.lineTo(0.5, 0); ctx.lineTo(0.5, 0.05); ctx.lineTo(0, 0.3); ctx.lineTo(-0.5, 0.05); ctx.closePath();
    paint(ctx, MAT.steel, { lw: 0.02 });
    ctx.beginPath(); ctx.ellipse(0, -0.02, 0.24, 0.24, 0, Math.PI, 0); ctx.closePath();
    paint(ctx, MAT.chrome, { lw: 0.02 });
    if (Q.detail && i % 3 === 1) { // a napkin hanging out, a lemon
      ctx.fillStyle = C.white; ctx.fillRect(0.2, -0.04, 0.16, 0.14);
    }
    ctx.restore();
  }
  ctx.restore();
}

// ---------- Cabin 7's things, and where they end up ----------
// Every hour something else of Ray's goes out of the door, from Brenda's
// hands onto the pile in the corridor. home: where it sits in cabin 7 until
// then; pile: where it lands (on the things that went before it).
const THROW_FROM = [26.6, 11.6, 1.9];
const FLY = 1.3;
const RAYS = [
  { h: 8, kind: 'pillow', name: 'pillow', home: [25.0, 14.6, 0.88], pile: [24.9, 7.4, 0] },
  { h: 9, kind: 'suitcase', name: 'suitcase', home: [25.0, 11.4, 0], pile: [23.9, 6.9, 0] },
  { h: 9.3, kind: 'trophy', name: 'golf trophy', home: [24.5, 9.0, 0.9], pile: [25.35, 6.3, 0] },
  { h: 10, kind: 'photo', name: 'wedding photo', home: [24.95, 9.0, 0.9], pile: [23.2, 7.7, 0] },
  { h: 11, kind: 'shirts', name: 'shirts', home: [24.9, 12.4, 0], pile: [23.9, 6.9, 0.36] },
  { h: 12, kind: 'suitcase2', name: 'other suitcase', home: [25.9, 11.0, 0], pile: [23.85, 6.85, 0.52] },
  { h: 13, kind: 'salad', name: 'salad', home: [27.0, 14.9, 0.72], pile: [23.5, 6.7, 0.88] },
  { h: 14, kind: 'palm', name: 'palm', home: [27.5, 9.6, 0], pile: [22.7, 6.0, 0] },
  { h: 15, kind: 'flippers', name: 'flippers', home: [26.4, 12.9, 0], pile: [24.95, 7.4, 0.2] },
  { h: 16, kind: 'golf', name: 'golf clubs', home: [24.55, 10.5, 0], pile: [25.5, 7.2, 0] },
  { h: 17, kind: 'towelRay', name: 'towel Ray', home: [26.2, 14.2, 0.72], pile: [24.3, 7.0, 0.88] },
];
// The last of Ray's things out of the door by t.
const lastOut = (t) => { let n = null; for (const it of RAYS) if (wrap(t) >= at(it.h)) n = it.name; return n; };
function rayThing(ctx, kind, x, y, z, t) {
  switch (kind) {
    case 'pillow': box(ctx, x - 0.32, y - 0.22, z, 0.64, 0.44, 0.18, C.white, { flat: true, lw: 0.03 }); break;
    case 'suitcase': suitcase(ctx, x, y, z, C.navy, z === 0 && y > 10); break;
    case 'suitcase2': suitcase(ctx, x, y, z, INK.funnelRed, z === 0 && y > 10); break;
    case 'trophy': {
      // his golf trophy (the lamp went with him: he's hugging it)
      box(ctx, x - 0.16, y - 0.16, z, 0.32, 0.32, 0.16, MAT.teakDark, { lw: 0.025 });
      const [X, Y] = P(x, y, z + 0.16);
      ctx.beginPath(); ctx.moveTo(X - 0.04, Y); ctx.lineTo(X - 0.04, Y - 0.14); ctx.lineTo(X + 0.04, Y - 0.14); ctx.lineTo(X + 0.04, Y); ctx.closePath();
      paint(ctx, MAT.brass, { lw: 0.02 });
      ctx.beginPath(); ctx.moveTo(X - 0.18, Y - 0.42); ctx.quadraticCurveTo(X - 0.16, Y - 0.12, X, Y - 0.12); ctx.quadraticCurveTo(X + 0.16, Y - 0.12, X + 0.18, Y - 0.42); ctx.closePath();
      paint(ctx, MAT.brass, { lw: 0.025 });
      // the handles, and a golf ball on top
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025;
      ctx.beginPath(); ctx.arc(X - 0.2, Y - 0.32, 0.06, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(X + 0.2, Y - 0.32, 0.06, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(X, Y - 0.5, 0.08, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.02 });
      break;
    }
    case 'photo': {
      onY(ctx, x - 0.24, x + 0.24, y, z, z + 0.4, MAT.brass, { lw: 0.025 });
      onY(ctx, x - 0.18, x + 0.18, y + 0.001, z + 0.05, z + 0.35, C.sky, { lw: 0.015 });
      if (Q.detail) {
        // the happy couple: two heads, one drawn over with a mustache
        const [a, b] = P(x - 0.07, y, z + 0.2), [c, d] = P(x + 0.07, y, z + 0.2);
        ctx.fillStyle = C.blush; ctx.beginPath(); ctx.arc(a, b, 0.06, 0, Math.PI * 2); ctx.arc(c, d, 0.06, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.015;
        ctx.beginPath(); ctx.moveTo(c - 0.04, d + 0.02); ctx.lineTo(c + 0.04, d + 0.02); ctx.stroke();
      }
      break;
    }
    case 'shirts': {
      const inks = [INK.flamingo, C.sky, INK.sunYellow, C.tealLight];
      for (let i = 0; i < 4; i++) {
        const [X, Y] = P(x + (i % 2) * 0.25 - 0.12, y + (i > 1 ? 0.2 : -0.1), z + 0.05 + i * 0.07);
        ctx.beginPath(); ctx.ellipse(X, Y, 0.34, 0.14, (i - 1.5) * 0.3, 0, Math.PI * 2);
        paint(ctx, inks[i], { lw: 0.02, dots: C.white, density: 0.3 });
      }
      break;
    }
    case 'salad': {
      const [X, Y] = P(x, y, z);
      ctx.beginPath(); ctx.ellipse(X, Y - 0.1, 0.3, 0.1, 0, 0, Math.PI); ctx.lineTo(X - 0.3, Y - 0.1); paint(ctx, MAT.chrome, { lw: 0.02 });
      for (const [dx, dy, c] of [[-0.14, -0.16, C.leaf], [0.05, -0.2, C.green], [0.16, -0.14, C.leaf], [-0.02, -0.12, C.red]]) {
        ctx.beginPath(); ctx.arc(X + dx, Y + dy, 0.09, 0, Math.PI * 2); paint(ctx, c, { lw: 0.015 });
      }
      break;
    }
    case 'palm': plant(ctx, x, y, z, t, { kind: 'palm', leaf: C.leaf, potColor: INK.teak, scale: 0.75 }); break;
    case 'flippers': {
      for (const dy of [-0.14, 0.14]) shape(ctx, [[x - 0.35, y + dy - 0.06, z + 0.02], [x + 0.2, y + dy - 0.14, z + 0.02], [x + 0.35, y + dy, z + 0.02], [x + 0.2, y + dy + 0.14, z + 0.02], [x - 0.35, y + dy + 0.06, z + 0.02]], MAT.pool, { lw: 0.02 });
      box(ctx, x - 0.3, y - 0.3, z + 0.03, 0.6, 0.06, 0.06, C.mustard, { flat: true, lw: 0.015 }); // the snorkel
      break;
    }
    case 'golf': {
      cylinder(ctx, x, y, z, 0.2, 0.95, C.navy, { lw: 0.03 });
      if (Q.detail) {
        for (const [dx, h] of [[-0.08, 0.35], [0.02, 0.45], [0.1, 0.3]]) {
          const [X, Y] = P(x + dx, y, z + 0.95);
          ctx.strokeStyle = MAT.steel; ctx.lineWidth = 0.03;
          ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X, Y - h); ctx.stroke();
          ctx.fillStyle = MAT.chrome; ctx.fillRect(X - 0.02, Y - h - 0.05, 0.1, 0.06);
        }
      }
      break;
    }
    case 'towelRay': towelRay(ctx, x, y, z); break;
  }
}

// ---------- People who stay in the cabins ----------
// A passenger (or crew, never green) who stays put, drawn every frame: sick is
// when they go green (seconds into the day); arms(t) for a moving arm; face
// and wear to dress them; say: [line, every, for, offset]; depth to sort them
// in front of the bed they sit on.
function extra(R, x, y, seed, o = {}) {
  const look = { ...folk(seed), ...(o.look || {}) };
  const opts = { anim: true };
  if (o.depth != null) opts.depth = o.depth;
  R.thing(x, y, (ctx, t) => {
    const arms = o.arms ? o.arms(t) : undefined;
    person(ctx, x, y, o.z || 0, {
      ...look,
      skin: queasy(look.skin, green(t, o.sick)),
      pose: typeof o.pose === 'function' ? o.pose(t) : o.pose || 'stand',
      dir: typeof o.dir === 'function' ? o.dir(t) : o.dir || 'r',
      back: o.back,
      scale: o.scale,
      arms,
      face: o.face ? (c, hy, back, tt) => o.face(c, hy, back, tt, arms) : undefined,
      wear: o.wear ? (c, b, tt) => o.wear(c, b, tt) : undefined,
    }, t);
    if (o.say && Q.detail && every(t, o.say[1], o.say[2] || 3.5, o.say[3] || 0)) {
      const line = typeof o.say[0] === 'function' ? o.say[0](t) : o.say[0];
      if (line) speech(ctx, x, y, (o.z || 0) + (o.sayZ ?? 2.7), line, { size: 0.42 });
    }
    if (o.after) o.after(ctx, t);
  }, opts);
}

export default {
  id: 'cabins',
  name: 'The Cabins',
  blurb: 'Cabin 7 is getting divorced with the door open. Every hour something else of Ray\'s lands in the corridor.',
  describe: 'A long corridor of red carpet and portholes runs down the far wall, past the lift and the stairs, with a row of cabins along the front, every door open. Room service trays pile up by the hour, and by afternoon an audience sits on folding chairs outside cabin 7.',

  build(R) {
    deck(R, 'cabins', 'cabins', { grid: false, name: false });

    // ---------- Floors ----------
    // The corridor's carpet: loud, red and gold, and made to hide anything.
    R.floor((ctx) => {
      rect(ctx, 0, 0.05, 48, FY - 0.05, 0, MAT.carpetRed, { stroke: false });
      if (!Q.detail) return;
      rect(ctx, 0, 0.55, 48, 0.12, 0.002, MAT.carpetGold, { stroke: false });
      rect(ctx, 0, FY - 0.6, 48, 0.12, 0.002, MAT.carpetGold, { stroke: false });
      for (let x = 0.6, i = 0; x < 48; x += 1.2, i++) {
        for (let y = 1.4, j = 0; y < FY - 0.8; y += 1.15, j++) {
          const d = 0.32;
          face(ctx, [[x, y - d, 0.003], [x + d, y, 0.003], [x, y + d, 0.003], [x - d, y, 0.003]], (i + j) % 2 ? MAT.carpetGold : shade(MAT.carpetRed, 0.18), { stroke: false });
          if ((i + j) % 2) disc(ctx, x, y, 0.004, 0.09, C.teal, { stroke: false });
        }
      }
    });
    // The cabins' carpet, every one the same (the suite's is pink).
    R.floor((ctx) => {
      rect(ctx, 8, FY, 40, 16 - FY, 0, CARPET, { stroke: false, dots: shade(CARPET, 0.25), density: 0.12 });
      rect(ctx, 0, FY, 8, 16 - FY, 0, tint(INK.flamingo, 0.45), { stroke: false, dots: INK.flamingo, density: 0.14 });
    });
    R.rug((ctx) => {
      // a heart rug in the suite (no rose petals: loose red petals read as
      // the garland, which is only under the cloche)
      const [X, Y] = P(4.6, 11.0, 0.01);
      ctx.save(); ctx.translate(X, Y); ctx.scale(1, 0.55);
      heart(ctx, 0, 0.2, 1.3, INK.flamingo);
      ctx.restore();
      // doormats outside every door, with its number
      for (const n of ROOMS) {
        if (n === 3) continue; // 3 and 4 share one mat, at their double doorway
        const dc = n === 4 ? 12 : doorOf(n), w = n === 4 ? 2.2 : 1.4;
        const text = n === 1 ? 'SUITE' : n === 4 ? '3 & 4' : String(n);
        rect(ctx, dc - w / 2, FY - 0.9, w, 0.7, 0.006, n === 1 ? INK.flamingo : MAT.teakDark, { lw: 0.03 });
        if (Q.detail) paintText(ctx, 'floor', dc, FY - 0.55, text, n === 1 || n === 4 ? 0.28 : 0.42, MAT.carpetGold, 'Rethink Sans');
      }
      // a bath mat by each bed, the same in every cabin
      for (const n of ROOMS) {
        if (n === 1) continue;
        const [bx0] = bedX(n);
        rect(ctx, bx0 + 0.4, 11.9, 1.6, 0.9, 0.006, C.white, { lw: 0.02 });
      }
    });

    // ---------- The hull wall (far side) and the stern ----------
    const PORTS = [2.5, 6.5, 18.2, 22.0, 25.8, 29.5, 33.5, 37.5, 41.5, 45.5];
    R.decor((ctx) => {
      // the handrail along the corridor, as on every ship
      for (const [a, b] of [[0.2, 9.9], [17.1, 47.8]]) {
        if (b - a < 0.5) continue;
        face(ctx, [[a, 0.02, 1.25], [b, 0.02, 1.25]], null, { lw: 0.14, stroke: C.ink });
        face(ctx, [[a, 0.02, 1.25], [b, 0.02, 1.25]], null, { lw: 0.08, stroke: INK.teak });
      }
      for (const x of PORTS) porthole(ctx, x, 4.3, 0.46);
      // the stairs, beside the lift
      onRight(ctx, 14.8, 0, 2.1, 3.4, MAT.steel);
      onRight(ctx, 14.95, 0, 1.8, 3.25, tint(MAT.steel, 0.35));
      onRight(ctx, 15.6, 1.9, 0.5, 0.8, MAT.glass);
      lettering(ctx, 'x', 15.85, 0.01, 3.7, 'STAIRS', 0.3);
      // the lift button, pressed a lot
      onRight(ctx, 14.05, 1.5, 0.35, 0.6, MAT.chrome);
      onRight(ctx, 14.15, 1.85, 0.15, 0.12, INK.sunYellow);
      onRight(ctx, 14.15, 1.62, 0.15, 0.12, INK.sunYellow);
      // hand sanitizer, all the way down
      for (const x of [4.2, 17.4, 31.2, 43.6]) {
        onRight(ctx, x, 1.6, 0.34, 0.55, C.white, { lw: 0.03 });
        onRight(ctx, x + 0.12, 1.52, 0.1, 0.1, MAT.steel, { lw: 0.02 });
      }
      if (Q.detail) {
        lettering(ctx, 'x', 4.37, 0.01, 2.62, 'WASH HANDS', 0.16);
        lettering(ctx, 'x', 4.37, 0.01, 2.4, 'THEN AGAIN', 0.16);
      }
      // the signs
      board(ctx, 'x', 5.9, 0.02, 2.75, 1.7, 0.45, 'MUSTER B  >', { size: 0.24, board: INK.sunYellow });
      board(ctx, 'x', 7.8, 0.02, 2.2, 0.9, 0.4, 'ICE', { size: 0.26, board: C.sky });
      board(ctx, 'x', 27.4, 0.02, 2.75, 2.8, 0.85, '', { board: C.white });
      lettering(ctx, 'x', 27.4, 0.01, 2.93, 'QUIET HOURS 10PM TO 7AM', 0.19);
      lettering(ctx, 'x', 27.4, 0.01, 2.6, '(NOT YOU, CABIN 7)', 0.17, INK.funnelRed);
      board(ctx, 'x', 34.9, 0.02, 2.6, 1.8, 1.3, '', { board: C.white });
      lettering(ctx, 'x', 34.9, 0.01, 3.0, 'DECK 7: CABINS', 0.19);
      // a little plan of the ship on the deck plan, and where you are
      onRight(ctx, 34.2, 2.2, 1.4, 0.45, INK.sea, { lw: 0.02 });
      shape(ctx, [[34.25, 0, 2.3], [35.3, 0, 2.3], [35.55, 0, 2.42], [35.3, 0, 2.55], [34.25, 0, 2.55]], C.white, { lw: 0.015 });
      lettering(ctx, 'x', 34.9, 0.01, 2.08, 'YOU ARE HERE. STILL.', 0.13, INK.funnelRed);
      // your captain, framed
      onRight(ctx, 39.4, 2.0, 1.3, 1.5, MAT.brass, { lw: 0.04 });
      onRight(ctx, 39.55, 2.35, 1.0, 1.0, C.sky);
      if (Q.detail) {
        const [X, Y] = P(40.05, 0, 2.9);
        ctx.save(); ctx.translate(X, Y); ctx.transform(1, 0.5, 0, 1, 0, 0);
        ctx.beginPath(); ctx.arc(0, 0.12, 0.26, 0, Math.PI * 2); paint(ctx, queasy(C.blush, 0.9), { lw: 0.02 });
        ctx.beginPath(); ctx.ellipse(0, -0.14, 0.32, 0.1, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.02 });
        ctx.fillStyle = C.ink; ctx.fillRect(-0.1, 0.08, 0.05, 0.05); ctx.fillRect(0.06, 0.08, 0.05, 0.05);
        ctx.restore();
        lettering(ctx, 'x', 40.05, 0.01, 2.17, 'YOUR CAPTAIN', 0.15);
      }
      // housekeeping's notice over the trolley
      board(ctx, 'x', 37.3, 0.02, 2.55, 2.3, 0.5, 'TOWEL ANIMALS ARE NOT PETS', { size: 0.15, board: C.white });
      // Gander Cola, take a gander
      board(ctx, 'x', 47.1, 0.02, 2.7, 1.0, 1.3, '', { board: INK.funnelRed });
      lettering(ctx, 'x', 47.1, 0.01, 3.05, 'GANDER', 0.24, C.white);
      lettering(ctx, 'x', 47.1, 0.01, 2.75, 'COLA', 0.24, C.white);
      lettering(ctx, 'x', 47.1, 0.01, 2.3, 'Take a gander.', 0.14, C.white);
      lifebuoy(ctx, 31.2, 3.5, 0.4);
      lifebuoy(ctx, 24.0, 3.0, 0.36);
      // the fire hose, in a red box
      onRight(ctx, 42.4, 1.5, 0.8, 0.9, INK.funnelRed, { lw: 0.03 });
      if (Q.detail) {
        const [X, Y] = P(42.8, 0, 1.95);
        ctx.save(); ctx.translate(X, Y); ctx.transform(1, 0.5, 0, 1, 0, 0);
        ctx.beginPath(); ctx.arc(0, 0, 0.26, 0, Math.PI * 2); ctx.arc(0, 0, 0.12, 0, Math.PI * 2, true);
        paint(ctx, C.red, { lw: 0.02 });
        ctx.restore();
      }
    });
    // The sea going by in the portholes, the color of the day.
    R.decor((ctx, t) => {
      if (!Q.detail) return;
      const sea = seaAt(t);
      for (const x of PORTS) {
        const [X, Y] = P(x, 0, 4.3);
        ctx.save(); ctx.translate(X, Y); ctx.transform(1, 0.5, 0, 1, 0, 0);
        ctx.beginPath(); ctx.arc(0, 0, 0.44, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = tint(sea, 0.55); ctx.fillRect(-0.5, -0.5, 1, 0.5);
        ctx.fillStyle = sea; ctx.fillRect(-0.5, 0.02, 1, 0.5);
        const w = ((t * 0.5 + x * 0.37) % 1.4) - 0.7;
        ctx.strokeStyle = alpha(C.white, 0.8); ctx.lineWidth = 0.04;
        ctx.beginPath(); ctx.moveTo(w, 0.2); ctx.lineTo(w + 0.22, 0.2); ctx.stroke();
        ctx.restore();
      }
    }, { anim: true });
    // The stern: the end of the corridor, and the suite's big window.
    R.decor((ctx) => {
      onLeft(ctx, 2.3, 3.2, 1.8, 0.7, C.green, { lw: 0.04 });
      paintText(ctx, 'left', 3.2, 3.55, 'EXIT', 0.4, C.white, 'Rethink Sans');
      if (Q.detail) paintText(ctx, 'left', 3.2, 2.85, "(IT'S THE SEA)", 0.2, C.ink, 'Rethink Sans');
      onLeft(ctx, 5.4, 1.6, 2.2, 1.6, MAT.brass, { lw: 0.04 });
      onLeft(ctx, 5.55, 1.75, 1.9, 1.3, INK.sea);
      if (Q.detail) {
        paintText(ctx, 'left', 6.5, 2.6, 'MS BOTTOMLESS', 0.2, C.white, 'Rethink Sans');
        paintText(ctx, 'left', 6.5, 2.2, 'EST. 1987', 0.16, C.white, 'Rethink Sans');
      }
      // the suite's stern window: sky, sea and the wake
      onLeft(ctx, 9.7, 1.5, 5.6, 3.0, C.white, { lw: 0.05 });
      onLeft(ctx, 9.9, 3.1, 5.2, 1.25, C.sky);
      onLeft(ctx, 9.9, 1.65, 5.2, 1.45, INK.sea, { dots: shade(INK.sea, 0.2), density: 0.2 });
      face(ctx, [[0, 11.5, 1.65], [0, 12.4, 3.08], [0, 12.8, 3.08], [0, 13.8, 1.65]], alpha(C.white, 0.7), { stroke: false });
      face(ctx, [[0, 12.5, 1.5], [0, 12.5, 4.5]], null, { lw: 0.1, stroke: C.white });
      // JUST MARRIED
      onLeft(ctx, 10.2, 4.9, 4.6, 0.6, C.white, { lw: 0.03 });
      paintText(ctx, 'left', 12.5, 5.2, 'JUST MARRIED', 0.42, INK.funnelRed, 'Rethink Sans');
    });

    // ---------- The cabins' walls, doors and door numbers ----------
    for (const n of ROOMS) {
      const a = x0Of(n), b = n === 1 ? 8 : a + 4;
      const dc = doorOf(n), g0 = dc - DW / 2, g1 = dc + DW / 2;
      const a1 = n === 1 ? 0 : a + T, b1 = b - T;
      if (g0 - a1 > 0.05) R.thing((a1 + g0) / 2, FY + T, (ctx) => cutWall(ctx, a1, FY - T, g0, FY + T));
      if (b1 - g1 > 0.05) R.thing((g1 + b1) / 2, FY + T, (ctx) => cutWall(ctx, g1, FY - T, b1, FY + T));
      // the door, open into the cabin, with its number on a brass plate
      // (cabin 7's slams when tapped: it's drawn with the cabin, below)
      const hx = HINGE_R[n] ? g1 - 0.1 : g0 + 0.02;
      if (n === 7) continue;
      R.thing(hx + 0.05, FY + 1.0, (ctx) => {
        box(ctx, hx, FY + T, 0, 0.08, 1.55, WH, INK.teak, { flat: true, top: C.ink, lw: 0.03 });
        face(ctx, [[hx + 0.081, FY + 0.45, 0.42], [hx + 0.081, FY + 1.05, 0.42], [hx + 0.081, FY + 1.05, 0.82], [hx + 0.081, FY + 0.45, 0.82]], MAT.brass, { lw: 0.02 });
        lettering(ctx, 'y', hx + 0.09, FY + 0.75, 0.62, n === 1 ? 'SUITE' : String(n), n === 1 ? 0.16 : 0.28);
      });
    }
    // The walls between cabins, cut into short pieces so people sort in front
    // of the right bit; the seam ones (16, 32) stand just on their chunk's side.
    for (let x = 8; x <= 44; x += 4) {
      const xa = x === 16 || x === 32 ? x : x - T, xb = xa + 2 * T;
      const gap = LINKS[x];
      const spans = gap ? [[FY + T, gap[0]], [gap[1], 16]] : [[FY + T, 16]];
      for (const [s0, s1] of spans) {
        if (s1 - s0 < 0.05) continue;
        const k = Math.max(1, Math.round((s1 - s0) / 2.5));
        for (let i = 0; i < k; i++) {
          const p0 = s0 + ((s1 - s0) * i) / k, p1 = s0 + ((s1 - s0) * (i + 1)) / k;
          R.thing(x, (p0 + p1) / 2, (ctx) => cutWall(ctx, xa, p0, xb, p1));
        }
      }
    }

    // ---------- The honeymoon suite (cabins 1 and 2) ----------
    R.thing(4, 13.7, (ctx) => {
      // the heart headboard against the stern
      const pts = [];
      for (let i = 0; i < 40; i++) {
        const s = (i / 40) * Math.PI * 2;
        const u = 16 * Math.sin(s) ** 3, v = 13 * Math.cos(s) - 5 * Math.cos(2 * s) - 2 * Math.cos(3 * s) - Math.cos(4 * s);
        pts.push([0.75, 13.7 + (u / 17) * 1.75, 1.45 + (v / 17) * 1.1]);
      }
      poly(ctx, pts);
      paint(ctx, INK.flamingo, { dots: shade(INK.flamingo, 0.35), density: 0.2 });
      box(ctx, 1, 12, 0, 6, 3.4, 0.45, shade(INK.flamingo, 0.1), { lw: 0.05 });
      box(ctx, 1, 12, 0.45, 6, 3.4, 0.35, C.white, { flat: true, lw: 0.05 });
      rect(ctx, 6.1, 12, 0.7, 3.4, 0.805, tint(INK.flamingo, 0.2), { lw: 0.03 });
      for (const py of [12.3, 13.8]) box(ctx, 1.15, py, 0.8, 0.7, 1.3, 0.2, C.white, { flat: true, lw: 0.03 });
      // chocolates on the pillows (and no petals on the spread)
      for (const [cx, cy] of [[1.5, 12.95], [1.5, 14.45]]) box(ctx, cx - 0.1, cy - 0.1, 1.0, 0.2, 0.2, 0.06, C.brown, { flat: true, lw: 0.015 });
      towel(ctx, 4.5, 12.95, 0.8, 'hearts');
    });
    // Breakfast in bed, with something under the lid that isn't breakfast.
    const cloche = R.poke({ id: 'breakfast', at: [2.95, 13.55, 1.2], r: 0.75, sound: 'tick', say: ['Not breakfast.', 'Somebody ate the melon.'] });
    R.thing(2.95, 13.6, (ctx) => breakfastInBed(ctx, 2.95, 13.55, 0.81, cloche.k()), { anim: true, depth: 18.0 });
    // The loveseat, and the newlyweds on it (one of them went to the buffet).
    R.thing(3.3, 9.4, (ctx) => {
      box(ctx, 1.7, 8.75, 0, 3.3, 0.35, 1.3, INK.flamingo, { lw: 0.04 });
      box(ctx, 1.7, 9.1, 0, 3.3, 0.85, 0.72, tint(INK.flamingo, 0.2), { lw: 0.04 });
      for (const x of [1.55, 4.9]) box(ctx, x, 8.9, 0, 0.25, 1.05, 0.95, INK.flamingo, { lw: 0.04 });
    }, { depth: 11.8 });
    // Pearls (not a lei: the only flowers in the suite are the garland's).
    const pearls = (ctx, b) => {
      for (let i = 0; i < 9; i++) {
        ctx.beginPath(); ctx.arc(-0.2 + i * 0.05, b.top + 0.06 + Math.sin((i / 8) * Math.PI) * 0.1, 0.03, 0, Math.PI * 2);
        paint(ctx, C.white, { lw: 0.01 });
      }
    };
    extra(R, 2.6, 9.65, 41, {
      pose: 'sit', dir: 'r', sick: at(11.5), sayZ: 2.1,
      look: { top: C.white, style: 'short' },
      arms: (t) => [wrap(t) < at(11.5) ? 1.9 + Math.sin(t * 1.5) * 0.15 : 0.6, 0.4],
      face: (ctx, hy, back, t, arms) => {
        if (wrap(t) >= at(11.5)) return;
        const [hx, hyy] = hand(arms[0]);
        ctx.beginPath(); ctx.arc(hx, hyy - 0.06, 0.07, 0, Math.PI * 2); paint(ctx, C.red, { lw: 0.015 }); // a strawberry
      },
      say: [(t) => (wrap(t) < at(11.5) ? 'Best. Honeymoon. Ever.' : 'I love you. I need a minute.'), 20, 3.5, 11],
    });
    extra(R, 4.0, 9.65, 42, {
      pose: 'sit', dir: 'l', look: { top: INK.flamingo, dress: true, style: 'long' }, wear: pearls,
      // (her answer to housekeeping, right after every knock; out of the groom's turn)
      say: ['Do NOT disturb!', 20, 3, 17.4], sayZ: 2.1,
      after: (ctx, t) => {
        if (!Q.detail) return;
        const ill = wrap(t) >= at(11.5);
        for (let i = 0; i < 3; i++) {
          const k = ((t * 0.4 + i / 3) % 1);
          const [X, Y] = P(3.3, 9.9, 2.2 + k * 1.6);
          if (ill) {
            // a broken heart instead, gone grey
            const hx = X + Math.sin(k * 6 + i * 2) * 0.25;
            ctx.save(); ctx.globalAlpha *= 1 - k;
            heart(ctx, hx, Y, 0.18, C.grey);
            ctx.beginPath(); ctx.moveTo(hx, Y - 0.07); ctx.lineTo(hx - 0.04, Y - 0.01); ctx.lineTo(hx + 0.03, Y + 0.02); ctx.lineTo(hx, Y + 0.06);
            ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.stroke();
            ctx.restore();
          } else {
            ctx.save(); ctx.globalAlpha *= 1 - k;
            heart(ctx, X + Math.sin(k * 6 + i * 2) * 0.25, Y, 0.18, INK.flamingo);
            ctx.restore();
          }
        }
      },
    });
    // champagne on ice outside the suite, and the sign on its door
    R.thing(7.0, 7.8, (ctx) => {
      cylinder(ctx, 7.0, 7.8, 0, 0.26, 0.5, MAT.chrome, { lw: 0.03 });
      const [X, Y] = P(7.0, 7.8, 0.5);
      ctx.save(); ctx.translate(X, Y); ctx.rotate(0.25);
      ctx.beginPath(); ctx.roundRect(-0.07, -0.55, 0.14, 0.55, 0.05); paint(ctx, C.green, { lw: 0.02 });
      ctx.fillStyle = MAT.brass; ctx.fillRect(-0.07, -0.6, 0.14, 0.12);
      ctx.restore();
    });
    R.thing(5.45, FY + 1.3, (ctx, t) => {
      // DO NOT DISTURB, swinging on the handle of the open door
      const [X, Y] = P(5.42, FY + 1.35, 0.72);
      ctx.save(); ctx.translate(X, Y); ctx.rotate(Math.sin(t * 2.2) * 0.12);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 0.12); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.015; ctx.stroke();
      ctx.beginPath(); ctx.rect(-0.14, 0.12, 0.28, 0.46); paint(ctx, INK.sunYellow, { lw: 0.02 });
      if (Q.detail) {
        ctx.fillStyle = C.ink; ctx.font = '700 0.07px "Rethink Sans", sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('DO NOT', 0, 0.28); ctx.fillText('DISTURB', 0, 0.37); ctx.fillText('EVER', 0, 0.46);
      }
      ctx.restore();
    }, { anim: true });

    // ---------- Cabin 3: Tyler's, with nobody in it ----------
    {
      const [b0, b1] = bedX(3);
      R.thing((b0 + b1) / 2, 14.2, (ctx) => {
        bed(ctx, b0, b1, SPREAD[2]);
        towel(ctx, b0 + 1.9, 14.2, 0.72, 'swan');
        // a propeller cap left on the pillow, a toy boat on the spread
        const [X, Y] = P(b0 + 0.4, 13.5, 0.9);
        ctx.beginPath(); ctx.arc(X, Y, 0.16, Math.PI, 0); paint(ctx, INK.funnelRed, { lw: 0.02 });
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02; ctx.beginPath(); ctx.moveTo(X, Y - 0.16); ctx.lineTo(X, Y - 0.24); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(X - 0.1, Y - 0.25, 0.1, 0.03, 0, 0, Math.PI * 2); ctx.ellipse(X + 0.1, Y - 0.25, 0.1, 0.03, 0, 0, Math.PI * 2); paint(ctx, INK.sunYellow, { lw: 0.012 });
      });
      R.thing(8.7, 9.3, (ctx) => dresser(ctx, 8.25, 9.25, (c) => {
        cylinder(c, 8.5, 9.0, 0.9, 0.08, 0.2, C.sky, { flat: true });
        cylinder(c, 8.75, 9.05, 0.9, 0.08, 0.2, INK.sunYellow, { flat: true });
        box(c, 8.9, 8.8, 0.9, 0.3, 0.4, 0.12, INK.flamingo, { flat: true, lw: 0.02 });
      }));
      R.thing(10.6, 11.3, (ctx) => {
        // toys: a beach ball and a bucket and spade (a red one, for sand)
        const [X, Y] = P(10.6, 11.3, 0.28);
        ctx.beginPath(); ctx.arc(X, Y, 0.28, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.025 });
        ctx.beginPath(); ctx.moveTo(X, Y); ctx.arc(X, Y, 0.28, -0.6, 0.5); ctx.closePath(); paint(ctx, INK.funnelRed, { lw: 0.015 });
        ctx.beginPath(); ctx.moveTo(X, Y); ctx.arc(X, Y, 0.28, 1.5, 2.6); ctx.closePath(); paint(ctx, C.sky, { lw: 0.015 });
        cylinder(ctx, 9.5, 12.0, 0, 0.14, 0.2, C.red, { lw: 0.02 });
      });
    }

    // ---------- Cabin 4: Doreen's. Harold is asleep; she's on a chair in the connecting door ----------
    {
      const [b0, b1] = bedX(4);
      R.thing((b0 + b1) / 2, 14.2, (ctx) => {
        bed(ctx, b0, b1, SPREAD[0]);
        towel(ctx, b1 - 0.35, 15.05, 0.72, 'elephant'); // at the foot, clear of Harold's feet
      });
      extra(R, 14.6, 14.0, 43, {
        pose: 'sleep', z: 0.75, depth: 29.4, look: { style: 'bald', top: C.sky, hair: C.grey },
        say: ['Zzzz. Seconds, please.', 22, 3, 5], sayZ: 1.2,
      });
      R.thing(11.9, 11.6, (ctx) => {
        // Doreen's chair, in the doorway between her cabin and Tyler's; its
        // back on Tyler's side, behind her, as she sits facing her own cabin
        box(ctx, 11.35, 11.4, 0, 0.2, 0.9, 1.25, MAT.teakDark, { lw: 0.035 });
        box(ctx, 11.55, 11.4, 0, 0.9, 0.9, 0.62, INK.teak, { lw: 0.035 });
      }, { depth: 23.2 });
      R.thing(14.6, 9.3, (ctx) => dresser(ctx, 13.7, 15.6, (c) => {
        // the buffet, smuggled home in napkins: a pyramid of rolls, a stack of plates
        for (const [dx, dy, dz] of [[0, 0, 0], [0.3, 0, 0], [0.15, 0.1, 0.16], [0.6, 0.05, 0]]) {
          const [X, Y] = P(13.9 + dx, 8.95 + dy, 0.9 + dz);
          c.beginPath(); c.ellipse(X, Y - 0.08, 0.15, 0.1, 0, 0, Math.PI * 2); paint(c, C.white, { lw: 0.015 });
          c.beginPath(); c.ellipse(X, Y - 0.14, 0.07, 0.04, 0, 0, Math.PI * 2); paint(c, C.woodLight, { lw: 0.01 });
        }
        for (let i = 0; i < 5; i++) disc(c, 15.2, 9.0, 0.92 + i * 0.05, 0.2, C.white, { lw: 0.015 });
      }));
    }

    // ---------- Cabin 5: the TV, and the man watching the captain's welcome on a loop ----------
    {
      const [b0, b1] = bedX(5);
      R.thing((b0 + b1) / 2, 14.2, (ctx) => {
        bed(ctx, b0, b1, SPREAD[3]);
        towel(ctx, b1 - 0.5, 14.5, 0.72, 'swanHat');
        tray(ctx, b0 + 1.2, 14.3, 0.72, { cloche: false, glass: INK.queasyGreen });
      });
      R.thing(19.1, 9.3, (ctx) => dresser(ctx, 18.4, 19.8, (c) => {
        box(c, 18.5, 8.72, 0.9, 1.2, 0.2, 0.8, C.black, { flat: true, lw: 0.03 });
      }));
      R.thing(19.1, 9.4, (ctx, t) => {
        // the TV: the captain, then the buffet cam, then bingo, over and over
        const s = Math.floor(t / 4) % 3;
        const scr = [[18.58, 8.93, 0.98], [19.62, 8.93, 0.98], [19.62, 8.93, 1.62], [18.58, 8.93, 1.62]];
        face(ctx, scr, [C.sky, INK.sunYellow, C.lilac][s], { lw: 0.02 });
        if (!Q.detail) return;
        const [X, Y] = P(19.1, 8.93, 1.3);
        if (s === 0) {
          ctx.beginPath(); ctx.arc(X, Y + 0.05, 0.16, 0, Math.PI * 2); paint(ctx, queasy(C.blush, 0.9), { lw: 0.015 });
          ctx.fillStyle = C.white; ctx.fillRect(X - 0.18, Y - 0.16, 0.36, 0.07);
        } else if (s === 1) {
          for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(X - 0.3 + i * 0.3, Y + i * 0.15 + 0.05, 0.12, 0.05, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.012 }); }
        } else {
          ctx.fillStyle = C.ink; ctx.font = '700 0.16px "Rethink Sans", sans-serif'; ctx.textAlign = 'center';
          ctx.fillText('B4', X, Y + 0.3);
        }
        // the flicker
        ctx.save(); poly(ctx, scr); ctx.clip();
        ctx.fillStyle = alpha(C.white, 0.15 + 0.1 * Math.sin(t * 23));
        ctx.fillRect(X - 1, Y - 1 + ((t * 0.8) % 1) * 1.5, 2, 0.08);
        ctx.restore();
      }, { anim: true, depth: 28.6 });
      extra(R, 18.4, 12.85, 44, {
        pose: 'sit', dir: 'l', back: true, depth: 32.6, sick: at(10.8),
        look: { top: C.white, bottom: C.white, style: 'bald' },
        say: ['Captain, you look terrible.', 18, 3.5, 4], sayZ: 2.2,
      });
    }

    // ---------- Cabin 6: a kid on the bed, a mother on the phone ----------
    {
      const [b0, b1] = bedX(6);
      R.thing((b0 + b1) / 2, 14.2, (ctx) => bed(ctx, b0, b1, SPREAD[1]));
      R.mover((t) => ({ x: b0 + 1.9, y: 14.0 }), (ctx, t, p) => {
        towel(ctx, b0 + 0.9, 14.6, 0.72, 'elephantShades');
        const k = Math.abs(Math.sin(t * 3.4));
        person(ctx, p.x, p.y, 0.72 + k * 0.9, { ...folk(45), top: C.coral, scale: 0.68, pose: k > 0.3 ? 'cheer' : 'stand', dir: 'l' }, t);
      }, { bias: 0.4 });
      R.thing(23.2, 9.3, (ctx) => dresser(ctx, 22.7, 23.8, (c) => {
        for (let i = 0; i < 3; i++) box(c, 22.85 + i * 0.3, 8.9, 0.9, 0.18, 0.12, 0.26, [C.sky, INK.sunYellow, C.coral][i], { flat: true, lw: 0.015 });
      }));
      extra(R, 21.0, 11.3, 46, {
        dir: 'r', look: { top: INK.sunYellow, dress: true, style: 'bun' },
        arms: () => [2.75, 0.4],
        face: (ctx, hy) => { ctx.beginPath(); ctx.roundRect(0.3, hy - 0.12, 0.1, 0.3, 0.03); paint(ctx, C.ink, { lw: 0.01 }); },
        say: ['Can we change cabins?', 15, 3.5, 8],
      });
    }

    // ---------- Cabin 7: Brenda's now. Ray's things go, one an hour ----------
    {
      const [b0, b1] = bedX(7);
      R.thing((b0 + b1) / 2, 14.2, (ctx) => {
        bed(ctx, b0, b1, SPREAD[4], { pillows: 1 });
        // her side of the bed: a big hat, tissues
        const [X, Y] = P(b0 + 0.45, 13.6, 0.9);
        ctx.beginPath(); ctx.ellipse(X, Y, 0.34, 0.12, 0, 0, Math.PI * 2); paint(ctx, C.butter, { lw: 0.02 });
        ctx.beginPath(); ctx.ellipse(X, Y - 0.06, 0.16, 0.1, 0, Math.PI, 0); paint(ctx, C.butter, { lw: 0.02 });
        box(ctx, b0 + 1.4, 13.2, 0.7, 0.4, 0.25, 0.18, C.white, { flat: true, lw: 0.02 });
      });
      R.thing(24.7, 9.3, (ctx) => dresser(ctx, 24.15, 25.2));
      // Her door: tap it and Brenda slams it (and opens it again: there's
      // more of Ray's stuff to throw). The area's big "tap me".
      const slam = R.poke({ id: 'cabin-7', at: [26.2, FY + 0.6, 0.9], r: 1.2, teach: true, hold: 1.4, sound: 'clunk', say: ['SLAM!', 'Not now, Ray!', 'Is that you, Ray? GO AWAY.'] });
      const hx = doorOf(7) - DW / 2 + 0.02;
      R.thing(hx + 0.5, FY + 0.7, (ctx) => {
        const k = slam.k(), th = k * Math.PI / 2, L = 1.55 + 0.2 * k;
        const ex = hx + Math.sin(th) * L, ey = FY + T + Math.cos(th) * L;
        face(ctx, [[hx, FY + T, 0], [ex, ey, 0], [ex, ey, WH], [hx, FY + T, WH]], INK.teak, { lw: 0.03 });
        face(ctx, [[hx, FY + T, WH], [ex, ey, WH]], null, { lw: 0.06, stroke: C.ink });
        const u = (a) => [hx + Math.sin(th) * a, FY + T + Math.cos(th) * a];
        const [p0x, p0y] = u(0.45), [p1x, p1y] = u(1.05);
        face(ctx, [[p0x, p0y, 0.42], [p1x, p1y, 0.42], [p1x, p1y, 0.82], [p0x, p0y, 0.82]], MAT.brass, { lw: 0.02 });
        if (k < 0.5) lettering(ctx, 'y', hx + 0.01, FY + 0.75, 0.62, '7', 0.28);
        else lettering(ctx, 'x', hx + 0.75, FY + T + 0.01, 0.62, '7', 0.28);
        if (k > 0.85 && Q.detail) {
          // shake lines off the slammed door
          ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.lineCap = 'round';
          for (const [dx, dz] of [[-0.25, 0.9], [-0.35, 0.6], [2.05, 0.9], [2.15, 0.6]]) {
            const [a, b] = P(hx + dx, FY + T, dz), [c, d] = P(hx + dx + (dx < 0 ? -0.25 : 0.25), FY + T, dz + 0.1);
            ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke();
          }
        }
      }, { anim: true });
      for (const it of RAYS) {
        const t0 = at(it.h);
        R.mover((t) => {
          const w = wrap(t);
          if (w < t0) return { x: it.home[0], y: it.home[1], z: it.home[2], ahead: it.home[2] > 0.5 ? 1.2 : 0 };
          const k = clamp((w - t0) / FLY);
          if (k >= 1) return { x: it.pile[0], y: it.pile[1], z: it.pile[2], ahead: it.pile[2] * 2 };
          const [fx, fy, fz] = THROW_FROM;
          return {
            x: fx + (it.pile[0] - fx) * k,
            y: fy + (it.pile[1] - fy) * k,
            z: fz + (it.pile[2] - fz) * k + Math.sin(k * Math.PI) * 1.8,
            ahead: 3,
          };
        }, (ctx, t, p) => rayThing(ctx, it.kind, p.x, p.y, p.z, t));
      }
    }

    // ---------- Cabin 8: the neighbours, listening ----------
    {
      const [b0, b1] = bedX(8);
      R.thing((b0 + b1) / 2, 14.2, (ctx) => {
        bed(ctx, b0, b1, SPREAD[5]);
        towel(ctx, b1 - 0.5, 14.6, 0.72, 'swanTux');
      });
      R.thing(28.7, 9.3, (ctx) => dresser(ctx, 28.2, 29.2, (c) => {
        cocktail(c, 28.5, 9.0, 0.9, { color: INK.sunYellow });
      }));
      extra(R, 28.5, 11.4, 47, {
        dir: 'l', look: { top: C.teal, style: 'curly' }, sick: at(11.2),
        arms: (t) => [2.35, 0.2],
        face: (ctx, hy, back, t, arms) => {
          // a glass against the wall, ear to the glass
          const [hx, hyy] = hand(arms[0]);
          ctx.beginPath(); ctx.moveTo(hx + 0.02, hyy - 0.2); ctx.lineTo(hx + 0.28, hyy - 0.24); ctx.lineTo(hx + 0.28, hyy + 0.04); ctx.lineTo(hx + 0.02, hyy);
          ctx.closePath(); paint(ctx, alpha(C.white, 0.8), { lw: 0.015 });
        },
      });
      extra(R, 30.2, 12.9, 48, {
        pose: 'sit', dir: 'l', depth: 44.6, look: { top: INK.sunYellow, dress: true, style: 'long' }, sayZ: 2.2,
        arms: (t) => [every(t, 1.6, 0.6) ? 2.6 : 1.0, 0.8],
        wear: (ctx, b) => {
          // a tub of popcorn in her lap
          ctx.beginPath(); ctx.moveTo(0.05, b.hipY - 0.35); ctx.lineTo(0.45, b.hipY - 0.35); ctx.lineTo(0.4, b.hipY + 0.02); ctx.lineTo(0.1, b.hipY + 0.02); ctx.closePath();
          paint(ctx, C.white, { lw: 0.02 });
          ctx.fillStyle = INK.funnelRed; ctx.fillRect(0.14, b.hipY - 0.35, 0.07, 0.37); ctx.fillRect(0.3, b.hipY - 0.35, 0.07, 0.37);
          ctx.beginPath(); ctx.arc(0.18, b.hipY - 0.38, 0.07, 0, Math.PI * 2); ctx.arc(0.32, b.hipY - 0.4, 0.07, 0, Math.PI * 2); paint(ctx, C.butter, { lw: 0.01 });
        },
        say: [(t) => (lastOut(t) ? `Ooh, the ${lastOut(t)}!` : 'Any minute now.'), 20, 3, 9],
      });
    }

    // ---------- Cabin 9: a towel monkey on the lamp, a man reading about a famous ship ----------
    {
      const [b0, b1] = bedX(9);
      R.thing((b0 + b1) / 2, 14.2, (ctx) => bed(ctx, b0, b1, SPREAD[3]));
      R.thing(34.6, 14.6, (ctx) => {
        // an arc lamp from the corner, its shade over the bed, and the monkey hanging off it
        const base = [33.4, 12.4];
        cylinder(ctx, base[0], base[1], 0, 0.22, 0.08, MAT.brass, { flat: true, lw: 0.03 });
        const [a, b] = P(base[0], base[1], 0.08), [c, d] = P(base[0], base[1], 2.9), [e, f] = P(34.5, 14.3, 2.35);
        ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.quadraticCurveTo(c + 0.4, d - 0.9, e, f - 0.2);
        ctx.lineCap = 'round';
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.stroke();
        ctx.strokeStyle = MAT.brass; ctx.lineWidth = 0.05; ctx.stroke();
        const [X, Y] = P(34.5, 14.3, 1.85);
        ctx.beginPath(); ctx.moveTo(X - 0.2, Y - 0.55); ctx.lineTo(X + 0.2, Y - 0.55); ctx.lineTo(X + 0.36, Y); ctx.lineTo(X - 0.36, Y); ctx.closePath();
        paint(ctx, INK.sunYellow, { lw: 0.03, dots: shade(INK.sunYellow, 0.3), density: 0.2 });
        towelMonkey(ctx, 34.5, 14.3, 1.1, 1.87);
      });
      R.thing(32.8, 9.3, (ctx) => dresser(ctx, 32.3, 33.25, (c) => {
        box(c, 32.4, 8.8, 0.9, 0.5, 0.4, 0.1, C.navy, { flat: true, lw: 0.02 });
        box(c, 32.45, 8.85, 1.0, 0.45, 0.35, 0.1, INK.flamingo, { flat: true, lw: 0.02 });
      }));
      R.thing(35.2, 10.3, (ctx) => {
        box(ctx, 34.7, 10.0, 0, 1.0, 0.9, 0.62, C.teal, { lw: 0.035 });
        box(ctx, 34.7, 9.75, 0, 1.0, 0.25, 1.3, shade(C.teal, 0.1), { lw: 0.035 });
      });
      extra(R, 35.2, 10.95, 49, {
        pose: 'sit', dir: 'l', look: { top: C.navy, style: 'short', hair: C.grey }, sick: at(12.3),
        arms: () => [1.25, 1.1],
        face: (ctx, hy, back, t, arms) => {
          const [hx, hyy] = hand(arms[0]);
          ctx.beginPath(); ctx.rect(hx - 0.02, hyy - 0.34, 0.3, 0.38); paint(ctx, C.navy, { lw: 0.015 });
          if (Q.detail) {
            ctx.fillStyle = C.white; ctx.font = '700 0.07px "Rethink Sans", sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('TITANIC', hx + 0.13, hyy - 0.16);
          }
        },
        say: ['Oh no. Oh no no no.', 24, 3, 14], sayZ: 2.2,
      });
    }

    // ---------- Cabin 10: a man who "just needs to lie down", and his wife, fanning ----------
    {
      const [b0, b1] = bedX(10);
      R.thing((b0 + b1) / 2, 14.2, (ctx) => bed(ctx, b0, b1, SPREAD[0], { pillows: 1 }));
      extra(R, b1 - 0.3, 14.1, 50, { pose: 'lie', z: 0.72, depth: 54.4, sick: at(10.5), look: { top: C.coral, style: 'bald' } });
      R.thing(36.7, 9.3, (ctx) => dresser(ctx, 36.2, 37.2, (c) => towel(c, 36.7, 9.0, 0.9, 'elephantParty')));
      extra(R, 38.4, 12.1, 51, {
        dir: 'r', look: { top: C.lilac, dress: true, style: 'curly', hair: C.grey },
        arms: (t) => [2.1 + Math.sin(t * 10) * 0.35, 0.3],
        face: (ctx, hy, back, t, arms) => {
          const [hx, hyy] = hand(arms[0]);
          ctx.save(); ctx.translate(hx, hyy); ctx.rotate(Math.sin(t * 10) * 0.4);
          ctx.beginPath(); ctx.rect(-0.02, -0.34, 0.34, 0.3); paint(ctx, C.white, { lw: 0.015 });
          ctx.fillStyle = alpha(C.ink, 0.5); for (let i = 0; i < 3; i++) ctx.fillRect(0.02, -0.28 + i * 0.08, 0.26, 0.025);
          ctx.restore();
        },
        say: ["It's the sea air, Frank.", 18, 3.5, 2],
      });
      R.thing(38.3, 7.75, (ctx) => tray(ctx, 38.3, 7.75));
    }

    // ---------- Cabin 11: Chad's friend, doing curls, asking after Chad ----------
    {
      const [b0, b1] = bedX(11);
      R.thing((b0 + b1) / 2, 14.2, (ctx) => {
        bed(ctx, b0, b1, SPREAD[2]);
        towel(ctx, b1 - 0.4, 13.45, 0.72, 'stack');
        // The steward's masterpiece, with its rosette: a towel crocodile.
        towelCroc(ctx, b0 + 1.45, 14.85, 0.72);
      });
      R.decoy({ id: 'croc', at: [bedX(11)[0] + 1.6, 14.85, 1.0], r: 0.9, say: ['A towel crocodile. Not an iguana.', "The steward's proudest work.", 'Please do not feed the towels.'] });
      R.thing(43.4, 9.3, (ctx) => dresser(ctx, 42.9, 43.85, (c) => {
        for (let i = 0; i < 3; i++) cylinder(c, 43.1 + i * 0.22, 9.0, 0.9, 0.08, 0.24, INK.funnelRed, { flat: true, lw: 0.015 });
      }));
      extra(R, 41.6, 12.2, 52, {
        dir: 'r', sick: at(12.2), look: { top: C.white, bottom: C.coral, hat: 'cap', style: 'short' },
        arms: (t) => { const k = (Math.sin(t * 4) + 1) / 2; return [0.4 + k * 2.2, 0.4 + (1 - k) * 2.0]; },
        face: (ctx, hy, back, t, arms) => {
          shades(ctx, 0.17, hy + 0.01);
          const [hx, hyy] = hand(arms[0]);
          ctx.beginPath(); ctx.rect(hx - 0.14, hyy - 0.08, 0.28, 0.16); paint(ctx, INK.funnelRed, { lw: 0.015 });
        },
        say: ['Chad? CHAD?', 16, 3, 6],
      });
      R.thing(41.9, 7.75, (ctx) => shoes(ctx, 41.9, 7.75, INK.flamingo, true));
    }

    // ---------- Cabin 12: Chad's. Spring break, in October ----------
    {
      const [b0, b1] = bedX(12);
      R.thing((b0 + b1) / 2, 14.2, (ctx) => {
        bed(ctx, b0, b1, SPREAD[4]);
        towel(ctx, b0 + 1.4, 14.2, 0.72, 'swanOut');
        // a pennant on the spread
        shape(ctx, [[b0 + 0.3, 15.0, 0.73], [b0 + 2.2, 14.8, 0.73], [b0 + 0.3, 15.3, 0.73]], INK.sunYellow, { lw: 0.02 });
        if (Q.detail) {
          // its lettering, printed flat along it
          const [X, Y] = P(b0 + 0.95, 15.03, 0.735);
          ctx.save(); ctx.translate(X, Y); ctx.transform(1, 0.5, -1, 0.5, 0, 0);
          ctx.rotate(-0.18); ctx.scale(1 / 40, 1 / 40);
          ctx.font = '700 4.4px "Rethink Sans", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = INK.funnelRed; ctx.fillText('SPRING BREAK', 0, 0);
          ctx.restore();
        }
      });
      R.thing(47.1, 9.3, (ctx) => dresser(ctx, 46.4, 47.8, (c) => {
        for (let i = 0; i < 4; i++) cocktail(c, 46.6 + i * 0.3, 9.0 + (i % 2) * 0.2, 0.9);
      }));
      R.thing(47.3, 10.4, (ctx) => {
        // an inflatable flamingo, a bit let down (clear of where the steward waits)
        const [X, Y] = P(47.3, 10.4, 0);
        ctx.beginPath(); ctx.ellipse(X, Y - 0.2, 0.55, 0.22, 0, 0, Math.PI * 2); ctx.ellipse(X, Y - 0.2, 0.28, 0.1, 0, 0, Math.PI * 2, true);
        paint(ctx, INK.flamingo, { lw: 0.025 });
        ctx.beginPath(); ctx.moveTo(X + 0.4, Y - 0.3); ctx.quadraticCurveTo(X + 0.7, Y - 0.9, X + 0.45, Y - 1.0);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.14; ctx.stroke(); ctx.strokeStyle = INK.flamingo; ctx.lineWidth = 0.09; ctx.stroke();
        ctx.beginPath(); ctx.arc(X + 0.42, Y - 1.02, 0.1, 0, Math.PI * 2); paint(ctx, INK.flamingo, { lw: 0.02 });
      });
    }

    // ---------- The corridor ----------
    // What's left outside the doors: trays, shoes, an ice bucket, and Chad's bucket.
    R.thing(10.3, 7.75, (ctx) => tray(ctx, 10.3, 7.75, 0, { cloche: false }));
    R.thing(17.6, 7.85, (ctx) => bucket(ctx, 17.6, 7.85, 0, { name: 'ICE' }));
    R.thing(14.0, 7.7, (ctx) => shoes(ctx, 14.0, 7.7, C.white));
    // (Its lid lifts on a tap: breakfast, still waiting.)
    const lid = R.poke({ id: 'eggs', at: [34.3, 7.75, 0.35], r: 0.7, hold: 2, sound: 'tick', say: ['Cold eggs. Since Tuesday.', 'Still cold.'] });
    R.thing(34.4, 7.75, (ctx) => tray(ctx, 34.4, 7.75, 0, { glass: INK.queasyGreen, lift: lid.k() }), { anim: true });
    R.thing(30.3, 7.85, (ctx) => shoes(ctx, 30.3, 7.85, C.brown));
    R.thing(44.6, 8.0, (ctx) => {
      bucket(ctx, 44.6, 8.0, 0, { name: 'CHAD' });
      if (!Q.detail) return;
      // and a smiley, in marker, under the name
      const [X, Y] = P(44.6, 8.0, 0.1);
      ctx.beginPath(); ctx.arc(X + 0.02, Y + 0.02, 0.05, 0.2, Math.PI - 0.2); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.012; ctx.stroke();
    });

    // Along the far wall: the ice machine, the Gander Cola machine, the steward's trolley.
    R.thing(7.8, 1.0, (ctx) => {
      box(ctx, 7.2, 0.05, 0, 1.2, 0.95, 1.6, MAT.chrome, { lw: 0.04 });
      onY(ctx, 7.4, 8.2, 1.0, 0.7, 1.3, MAT.steelDark, { lw: 0.02 });
      board(ctx, 'x', 7.8, 1.01, 0.4, 0.8, 0.25, 'OUT OF ORDER', { size: 0.1, board: C.white });
    });
    R.thing(20.2, 1.05, (ctx) => {
      box(ctx, 19.6, 0.05, 0, 1.2, 1.0, 2.7, INK.funnelRed, { lw: 0.04 });
      onY(ctx, 19.7, 20.45, 1.05, 1.0, 2.35, alpha(C.white, 0.35), { lw: 0.02 });
      if (Q.detail) {
        for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
          const [X, Y] = P(19.82 + c * 0.22, 1.05, 1.15 + r * 0.32);
          ctx.fillStyle = INK.funnelRed; ctx.fillRect(X - 0.05, Y - 0.2, 0.1, 0.2);
        }
      }
      lettering(ctx, 'y', 20.81, 0.55, 1.9, 'GANDER', 0.2, C.white);
      lettering(ctx, 'y', 20.81, 0.55, 1.62, 'COLA', 0.2, C.white);
      onY(ctx, 20.5, 20.7, 1.05, 1.6, 1.9, MAT.chrome, { lw: 0.015 });
    });
    R.thing(37.3, 1.6, (ctx) => {
      // the steward's trolley: towels, little shampoos, a mop bucket, towel animals ready to go
      box(ctx, 36.2, 0.4, 0.15, 2.2, 1.1, 0.08, MAT.steel, { flat: true, lw: 0.03 });
      box(ctx, 36.2, 0.4, 0.75, 2.2, 1.1, 0.08, MAT.steel, { flat: true, lw: 0.03 });
      for (const [x, y] of [[36.25, 1.4], [38.3, 1.4]]) box(ctx, x, y, 0, 0.06, 0.06, 1.45, MAT.steelDark, { flat: true, lw: 0.02 });
      for (let i = 0; i < 3; i++) box(ctx, 36.35 + i * 0.6, 0.55, 0.23, 0.5, 0.8, 0.45, C.white, { lw: 0.025, dotsL: C.grey });
      for (let i = 0; i < 6; i++) cylinder(ctx, 36.4 + i * 0.3, 1.2, 0.83, 0.07, 0.22, [INK.flamingo, C.sky, INK.sunYellow][i % 3], { flat: true, lw: 0.015 });
      box(ctx, 36.2, 0.4, 1.4, 2.2, 1.1, 0.06, MAT.steel, { flat: true, lw: 0.03 });
      towelAnimal(ctx, 36.8, 0.9, 1.46, 'swan');
      towelAnimal(ctx, 37.8, 0.9, 1.46, 'elephant');
      lettering(ctx, 'x', 37.3, 1.51, 0.5, 'HOUSEKEEPING', 0.18, C.navy);
      cylinder(ctx, 38.75, 1.0, 0, 0.3, 0.5, C.mustard, { lw: 0.03 });
      box(ctx, 38.72, 0.97, 0.5, 0.06, 0.06, 1.3, INK.teak, { flat: true, lw: 0.02 });
    });

    // The pile outside cabin 7 builds on the floor by the door (drawn by the
    // movers above); a note taped to cabin 7's wall, in Brenda's hand.
    R.thing(27.6, FY + T, (ctx) => {
      face(ctx, [[27.2, FY + T + 0.005, 0.35], [27.8, FY + T + 0.005, 0.35], [27.8, FY + T + 0.005, 0.8], [27.2, FY + T + 0.005, 0.8]], C.butter, { lw: 0.02 });
      lettering(ctx, 'x', 27.5, FY + T + 0.01, 0.66, 'RAY:', 0.1);
      lettering(ctx, 'x', 27.5, FY + T + 0.01, 0.5, 'PILE', 0.1);
    }, { depth: FY + 27.4 });

    // A room service waiter up and down the corridor, a cloche held high.
    // His beat stops short of where the day's people stand about (a steward
    // at x 6 and 30 and 36, Ray at 27), so he never walks through them.
    const waiter = route([[8.5, 5.0], [25.2, 5.0]], { speed: 1.1, loop: false });
    R.mover(waiter, (ctx, t, p) => {
      const arms = [Math.PI - 0.35, -0.2];
      person(ctx, p.x, p.y, 0, {
        ...folk(53), top: C.white, bottom: C.navy, hat: 'none', pose: 'walk', dir: p.dir, back: p.back, arms,
        face: (c, hy) => {
          const [hx, hyy] = hand(arms[0]);
          c.beginPath(); c.ellipse(hx, hyy - 0.05, 0.3, 0.06, 0, 0, Math.PI * 2); paint(c, MAT.chrome, { lw: 0.015 });
          c.beginPath(); c.ellipse(hx, hyy - 0.07, 0.22, 0.2, 0, Math.PI, 0); c.closePath(); paint(c, MAT.chrome, { lw: 0.015 });
        },
      }, t);
      if (Q.detail && every(t, 21, 3, 3)) speech(ctx, p.x, p.y, 2.9, 'Room service! Anyone?', { size: 0.42 });
    });
    // A power walker, laps of the corridor in a visor, going green by lunch.
    const lap = route([[1.5, 2.9], [47, 2.9]], { speed: 2.1, loop: false, offset: 9 });
    R.mover(lap, (ctx, t, p) => {
      const look = folk(54);
      const s = Math.sin(t * 9);
      person(ctx, p.x, p.y, 0, {
        ...look, top: INK.flamingo, bottom: C.white, style: 'pony', skin: queasy(look.skin, green(t, at(12.4))),
        pose: 'walk', speed: 9, dir: p.dir, back: p.back, arms: [0.9 + s * 0.9, 0.9 - s * 0.9],
        face: (c, hy) => { c.beginPath(); c.ellipse(0.2, hy - 0.16, 0.3, 0.06, 0.1, 0, Math.PI * 2); paint(c, C.white, { lw: 0.015 }); },
      }, t);
    });
    // A man lost with the deck plan, turning it round and round.
    extra(R, 3.6, 6.2, 55, {
      dir: (t) => (Math.floor(t / 3) % 2 ? 'l' : 'r'), look: { top: C.sky, bottom: C.brown, style: 'bald', hat: 'sun' },
      arms: () => [1.3, 1.3],
      face: (ctx, hy, back, t, arms) => {
        if (back) return;
        const [hx, hyy] = hand(arms[0]);
        ctx.beginPath(); ctx.rect(hx - 0.35, hyy - 0.4, 0.5, 0.42); paint(ctx, C.white, { lw: 0.015 });
        ctx.strokeStyle = INK.sea; ctx.lineWidth = 0.02; ctx.beginPath(); ctx.moveTo(hx - 0.3, hyy - 0.2); ctx.lineTo(hx + 0.1, hyy - 0.25); ctx.stroke();
      },
      say: ['Which end is the front?', 14, 3.5, 1],
    });
    // A man at the lift, pressing the button, and pressing it (his finger on
    // it, at x 14.2 on the far wall).
    extra(R, 14.1, 0.5, 56, {
      dir: 'r', look: { top: INK.teak, bottom: C.navy, style: 'short', hair: C.grey }, sick: at(11.8),
      arms: (t) => [2.35 + (every(t, 0.5, 0.2) ? 0.12 : 0), 0.1],
      say: ['Come ON.', 11, 2.5, 5],
    });
    R.poke({ id: 'lift-man', at: [14.1, 0.5, 1.5], r: 0.8, sound: 'tick', say: ['Pressed it 400 times.', 'It knows I\'m here.', 'Have you tried the stairs? No.'] });

    // ---------- The stern end of the corridor: the do-not-disturb war ----------
    // The honeymooners haven't come out since they boarded. Room service
    // leaves a tray an hour, and the tower outside the suite grows all day.
    const tower = R.poke({ id: 'tower', at: (t) => [TOWER.x, TOWER.y, 0.2 + towerTrays(t) * 0.19], r: 0.9, hold: 1.5, sound: 'clunk', say: ['Do NOT touch the tower.', "It's load-bearing now.", 'Day four of breakfast.'] });
    R.thing(TOWER.x, TOWER.y, (ctx, t) => trayTower(ctx, t, tower.k()), { anim: true });
    // ...and housekeeping knocks every few minutes, with fresh towels and a
    // swan, and gets the same answer from the loveseat every time.
    extra(R, 9.6, 6.7, 57, {
      dir: 'l', look: { top: C.white, bottom: C.navy, style: 'bun', hat: 'none' },
      arms: (t) => [every(t, 20, 2.2) ? 2.4 + Math.sin(t * 14) * 0.25 : 1.3, 1.2],
      face: (ctx, hy, back, t, arms) => {
        if (back) return;
        const [hx, hyy] = hand(1.2);
        // the towels she's holding, a swan on top
        ctx.beginPath(); ctx.rect(hx - 0.32, hyy - 0.22, 0.5, 0.26); paint(ctx, C.white, { lw: 0.015 });
        ctx.beginPath(); ctx.moveTo(hx - 0.32, hyy - 0.1); ctx.lineTo(hx + 0.18, hyy - 0.1); ctx.strokeStyle = C.greyLight; ctx.lineWidth = 0.02; ctx.stroke();
        ctx.save(); ctx.translate(hx - 0.07, hyy - 0.2); ctx.scale(0.55, 0.55);
        ctx.beginPath(); ctx.ellipse(0, -0.14, 0.28, 0.14, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.03 });
        ctx.beginPath(); ctx.moveTo(0.14, -0.2); ctx.quadraticCurveTo(0.34, -0.5, 0.18, -0.58); ctx.quadraticCurveTo(0.26, -0.44, 0.1, -0.26); paint(ctx, C.white, { lw: 0.03 });
        ctx.restore();
      },
      say: ['Housekeeping!', 20, 2.2, 0],
    });

    // The audience: across the corridor from cabin 7, a row of folding chairs
    // fills up through the day, drinks and snacks, everyone facing the show.
    const SEATS = [
      { at: [29.7, 6.3], from: 9.5, seed: 61, sick: at(11.8), snack: 'drink' },
      { at: [31.0, 6.9], from: 11, seed: 62, snack: 'popcorn' },
      { at: [33.1, 6.2], from: 12.5, seed: 63, snack: 'drink' },
      { at: [34.3, 6.9], from: 14, seed: 64, snack: 'popcorn', scale: 0.72 },
      { at: [35.5, 6.2], from: 15.5, seed: 65, snack: 'drink' },
    ];
    for (const s of SEATS) {
      const [x, y] = s.at;
      R.thing(x, y, (ctx, t) => {
        if (wrap(t) < at(s.from)) return;
        // a folding chair, its back to the far wall: legs, seat, back
        for (const [lx, ly] of [[x - 0.02, y + 0.3], [x + 0.62, y + 0.3], [x + 0.62, y - 0.37]]) box(ctx, lx, ly, 0, 0.05, 0.05, 0.55, MAT.steelDark, { flat: true, lw: 0.015 });
        box(ctx, x - 0.05, y - 0.4, 0.55, 0.75, 0.75, 0.08, C.navy, { flat: true, lw: 0.03 });
        box(ctx, x + 0.62, y - 0.4, 0.55, 0.08, 0.75, 0.75, C.navy, { flat: true, lw: 0.03 });
        const look = folk(s.seed);
        const eat = every(t, 2.2, 0.7, s.seed);
        person(ctx, x, y, 0, {
          ...look, skin: queasy(look.skin, green(t, s.sick)), pose: 'sit', dir: 'l', scale: s.scale,
          arms: [eat ? 2.5 : 1.1, 0.7],
          wear: (c, b) => {
            if (s.snack === 'popcorn') {
              c.beginPath(); c.rect(0.08, b.hipY - 0.32, 0.3, 0.32); paint(c, INK.funnelRed, { lw: 0.015 });
              c.beginPath(); c.arc(0.23, b.hipY - 0.34, 0.12, Math.PI, 0); paint(c, C.butter, { lw: 0.01 });
            }
          },
          face: (c, hy) => {
            if (s.snack !== 'drink') return;
            const [hx, hyy] = hand(eat ? 2.5 : 1.1);
            c.beginPath(); c.moveTo(hx - 0.07, hyy - 0.3); c.lineTo(hx - 0.05, hyy); c.lineTo(hx + 0.05, hyy); c.lineTo(hx + 0.07, hyy - 0.3); c.closePath();
            paint(c, INK.queasyGreen, { lw: 0.015 });
          },
        }, t);
      }, { anim: true });
    }

    // ---------- The finds ----------
    R.find({ id: 'chad-bucket', label: 'A bucket outside cabin 12', kind: 'spot', at: [44.6, 8, 0.3], r: 0.8 });
    // The chase, sighting 2: in the honeymoon suite, at the foot of the bed,
    // posing as one of the steward's towel animals with a melon rind in its mouth.
    // Its snout, a blinking eye and its tail tip show. Found, it's off the
    // bed, out of the suite's door and up the corridor to the lift.
    sighting(R, 1, {
      at: [5.6, 14.45, 0.8], kind: 'hard', depth: 21,
      hint: 'One of the towel animals in the suite is blinking.',
      draw: (ctx, t, p) => towelIguana(ctx, p.x, p.y, p.z, t),
      run: [[6.6, 11.6, 0], [6.3, 8.0, 0], [6.6, 5.0, 0], [11.8, 1.0, 0]],
    });
    R.find({
      id: 'garland', label: 'A nibbled flower garland', kind: 'poke', inside: cloche, at: [2.95, 13.55, 0.95], r: 0.8,
      hint: 'The honeymooners ordered breakfast in bed. Something got to it first.',
    });
    R.find({ id: 'towel-monkey', label: 'A towel monkey', kind: 'spot', at: [34.5, 14.3, 1.2], r: 0.9 });
  },
};
