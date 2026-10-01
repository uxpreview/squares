// The ink box: palette, halftone screens and drawing primitives.
// Every primitive draws in room-local 3D units (x, y, z) and projects itself.

import { ZK, S, WALL, SLAB } from './iso.js';

// ---------- Palette (a six-ink risograph set plus a few mixes) ----------
export const C = {
  paper: '#F1E8D6',
  paperDeep: '#E4D7BE',
  ink: '#252D52',
  navy: '#2C3A6B',
  night: '#1F2749',
  teal: '#2E8B84',
  tealLight: '#72BFB1',
  mint: '#B4DDCD',
  coral: '#E3603F',
  coralLight: '#F29172',
  blush: '#F3BCA9',
  pink: '#E98FA3',
  mustard: '#EDB53B',
  butter: '#F7DD8E',
  grey: '#A6A8B6',
  greyLight: '#D7D4CC',
  white: '#FBF6EA',
  green: '#4F9A65',
  leaf: '#7EBB68',
  brown: '#8E5B3E',
  wood: '#C98E5A',
  woodLight: '#E3B282',
  sky: '#A3CDE0',
  water: '#4DA7B6',
  red: '#C8413A',
  purple: '#6A5A9C',
  lilac: '#B9A8D8',
  black: '#1B1A22',
};

export const SKIN = ['#F4CDAA', '#E3A97F', '#C3835B', '#95603F', '#633F2A', '#F7DCC4'];
export const HAIR = ['#252D52', '#3D2B22', '#7A4A2A', '#DDA43F', '#B9B5AE', '#C8413A', '#1D1B19', '#E98FA3'];
export const CLOTH = [C.coral, C.teal, C.mustard, C.navy, C.blush, C.green, C.white, C.purple, C.red, C.sky, C.pink, C.tealLight];

// Quality flags, set by the renderer for each pass. own: drawing into a zone's
// own picture (a snapshot), where only that zone's pixels are on the canvas.
export const Q = { lines: true, detail: true, pxPerUnit: 20, own: false };

// ---------- Seeded randomness ----------
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
export const hash = (a, b = 0) => {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

// ---------- Color mixing ----------
const rgbCache = new Map();
function rgb(c) {
  let v = rgbCache.get(c);
  if (!v) {
    const h = c.replace('#', '');
    v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    rgbCache.set(c, v);
  }
  return v;
}
const mixCache = new Map();
export function mix(a, b, t) {
  const key = a + b + t;
  let v = mixCache.get(key);
  if (!v) {
    const A = rgb(a), B = rgb(b);
    const r = (i) => Math.round(A[i] + (B[i] - A[i]) * t).toString(16).padStart(2, '0');
    v = '#' + r(0) + r(1) + r(2);
    mixCache.set(key, v);
  }
  return v;
}
export const shade = (c, t = 0.2) => mix(c, C.ink, t);
export const tint = (c, t = 0.3) => mix(c, C.white, t);
export const alpha = (c, a) => {
  const [r, g, b] = rgb(c);
  return `rgba(${r},${g},${b},${a})`;
};

// ---------- Halftone screens ----------
// A dot screen in any ink. Dots grow with the world as you zoom in (like a
// magnified print) but never shrink below a few device pixels, which avoids moiré.
const TILE = 12;
const pats = new Map();
let patMatrix = new DOMMatrix();
let patScale = 0;

// Called for every picture drawn, often several times a frame, so it only
// works out the dot size here; each screen picks it up when it's next used.
export function setScreen(pxPerUnit, dpr = 1) {
  Q.pxPerUnit = pxPerUnit;
  const spacingUnits = Math.max((3.2 * dpr) / pxPerUnit, 0.34);
  const s = spacingUnits / TILE;
  if (s === patScale) return;
  patScale = s;
  patMatrix = new DOMMatrix().scaleSelf(s, s);
}

export function dots(color, density = 0.3) {
  const key = color + '|' + density;
  let p = pats.get(key);
  if (!p) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = TILE;
    const g = cv.getContext('2d');
    g.fillStyle = color;
    const r = Math.sqrt(density) * TILE * 0.4;
    for (const [x, y] of [[TILE / 2, TILE / 2], [0, 0], [TILE, 0], [0, TILE], [TILE, TILE]]) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    p = { pattern: g.createPattern(cv, 'repeat'), s: 0 };
    pats.set(key, p);
  }
  if (p.s !== patScale) {
    p.pattern.setTransform(patMatrix);
    p.s = patScale;
  }
  return p.pattern;
}

// ---------- Paths ----------
export const LW = 0.06;

export function P(x, y, z = 0) {
  return [x - y, (x + y) / 2 - z * ZK];
}

export function poly(ctx, pts) {
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const X = p[0] - p[1];
    const Y = (p[0] + p[1]) / 2 - (p[2] || 0) * ZK;
    if (i) ctx.lineTo(X, Y);
    else ctx.moveTo(X, Y);
  }
  ctx.closePath();
}

// Fill + halftone + ink outline for whatever path is current.
// o.dots: ink color for a halftone layer, o.density: 0..1, o.stroke: color or false, o.lw
export function paint(ctx, fill, o = {}) {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (o.dots && Q.detail) {
    ctx.fillStyle = dots(o.dots, o.density ?? 0.3);
    ctx.fill();
  }
  if (o.stroke !== false && Q.lines) {
    ctx.strokeStyle = o.stroke || C.ink;
    ctx.lineWidth = o.lw || LW;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

export function face(ctx, pts, fill, o) {
  poly(ctx, pts);
  paint(ctx, fill, o);
}

// ---------- Solids ----------
// A box from (x, y, z) sized w (along x), d (along y), h (up).
// o.top / o.left / o.right override face colors. "left" is the face you see on
// the screen's left (facing +y); "right" faces +x. o.flat skips halftone.
export function box(ctx, x, y, z, w, d, h, color, o = {}) {
  const x2 = x + w, y2 = y + d, z2 = z + h;
  const st = { stroke: o.stroke, lw: o.lw };
  const left = o.left || shade(color, 0.22);
  const right = o.right || shade(color, 0.1);
  face(ctx, [[x, y2, z], [x2, y2, z], [x2, y2, z2], [x, y2, z2]], left, {
    ...st,
    dots: o.flat ? null : o.dotsL || shade(color, 0.55),
    density: o.dens ?? 0.22,
  });
  face(ctx, [[x2, y, z], [x2, y2, z], [x2, y2, z2], [x2, y, z2]], right, {
    ...st,
    dots: o.flat ? null : o.dotsR || null,
    density: 0.16,
  });
  face(ctx, [[x, y, z2], [x2, y, z2], [x2, y2, z2], [x, y2, z2]], o.top || color, {
    ...st,
    dots: o.dotsT || null,
    density: o.densT ?? 0.2,
  });
}

// Flat rectangle lying on the floor (or any height z).
export function rect(ctx, x, y, w, d, z, fill, o) {
  face(ctx, [[x, y, z], [x + w, y, z], [x + w, y + d, z], [x, y + d, z]], fill, o);
}

// Circle lying flat (rugs, puddles, pools, table tops).
export function disc(ctx, cx, cy, z, r, fill, o) {
  const X = cx - cy, Y = (cx + cy) / 2 - z * ZK;
  ctx.beginPath();
  ctx.ellipse(X, Y, r * Math.SQRT2, (r * Math.SQRT2) / 2, 0, 0, Math.PI * 2);
  paint(ctx, fill, o);
}

// Upright cylinder (barrels, stools, washing drums seen from above, tanks).
export function cylinder(ctx, cx, cy, z, r, h, color, o = {}) {
  const X = cx - cy, Yb = (cx + cy) / 2 - z * ZK, Yt = Yb - h * ZK;
  const rx = r * Math.SQRT2, ry = rx / 2;
  ctx.beginPath();
  ctx.moveTo(X - rx, Yt);
  ctx.lineTo(X - rx, Yb);
  ctx.ellipse(X, Yb, rx, ry, 0, Math.PI, 0, true);
  ctx.lineTo(X + rx, Yt);
  ctx.closePath();
  paint(ctx, o.side || shade(color, 0.16), { stroke: o.stroke, dots: o.flat ? null : shade(color, 0.5), density: 0.18 });
  ctx.beginPath();
  ctx.ellipse(X, Yt, rx, ry, 0, 0, Math.PI * 2);
  paint(ctx, o.top || color, { stroke: o.stroke });
}

// ---------- Walls ----------
// Quads painted on the inside of the back walls.
// Left wall is the plane x = 0: position along it is y. Right wall is y = 0: position is x.
export function onLeft(ctx, y, z, w, h, fill, o) {
  face(ctx, [[0, y, z], [0, y + w, z], [0, y + w, z + h], [0, y, z + h]], fill, o);
}
export function onRight(ctx, x, z, w, h, fill, o) {
  face(ctx, [[x, 0, z], [x + w, 0, z], [x + w, 0, z + h], [x, 0, z + h]], fill, o);
}

// Window on a back wall: frame, glass (or scene) and mullions.
export function windowL(ctx, y, z, w, h, glass = C.sky, frame = C.white) {
  onLeft(ctx, y - 0.15, z - 0.15, w + 0.3, h + 0.3, frame);
  onLeft(ctx, y, z, w, h, glass, { dots: tint(glass, 0.5), density: 0.2 });
  face(ctx, [[0, y + w / 2, z], [0, y + w / 2, z + h]], null, { lw: 0.1, stroke: frame });
  face(ctx, [[0, y, z + h / 2], [0, y + w, z + h / 2]], null, { lw: 0.1, stroke: frame });
}
export function windowR(ctx, x, z, w, h, glass = C.sky, frame = C.white) {
  onRight(ctx, x - 0.15, z - 0.15, w + 0.3, h + 0.3, frame);
  onRight(ctx, x, z, w, h, glass, { dots: tint(glass, 0.5), density: 0.2 });
  face(ctx, [[x + w / 2, 0, z], [x + w / 2, 0, z + h]], null, { lw: 0.1, stroke: frame });
  face(ctx, [[x, 0, z + h / 2], [x + w, 0, z + h / 2]], null, { lw: 0.1, stroke: frame });
}

// Text painted flat on a wall or the floor. plane: 'left' (x=0, u runs along y),
// 'right' (y=0, u runs along x) or 'floor'. (u, v) is where the text's center sits:
// for walls v is height z, for the floor (u, v) is (x, y).
export function paintText(ctx, plane, u, v, text, size, color = C.ink, font = 'Bagel Fat One') {
  ctx.save();
  if (plane === 'left') ctx.transform(1, -0.5, 0, ZK, -u, u / 2 - v * ZK);
  else if (plane === 'right') ctx.transform(1, 0.5, 0, ZK, u, u / 2 - v * ZK);
  else ctx.transform(1, 0.5, -1, 0.5, u - v, (u + v) / 2);
  const k = 40;
  ctx.scale(1 / k, 1 / k);
  ctx.font = `${size * k}px "${font}", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// Upright text that always faces the viewer (speech bubbles, neon, labels).
export function label(ctx, x, y, z, text, size = 0.7, color = C.ink, font = 'Bagel Fat One', align = 'center') {
  const X = x - y, Y = (x + y) / 2 - z * ZK;
  const k = 40;
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(1 / k, 1 / k);
  ctx.font = `${size * k}px "${font}", "Arial Black", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

export function speech(ctx, x, y, z, text, o = {}) {
  const X = x - y, Y = (x + y) / 2 - z * ZK;
  const size = o.size || 0.62;
  const k = 40;
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(1 / k, 1 / k);
  ctx.font = `${size * k}px "Bagel Fat One", "Arial Black", sans-serif`;
  const w = ctx.measureText(text).width + size * k * 0.9;
  const h = size * k * 1.5;
  const bx = -w / 2 + (o.dx || 0) * k, by = -h - size * k * 0.6;
  ctx.beginPath();
  ctx.roundRect(bx, by, w, h, h / 2);
  ctx.moveTo(-size * k * 0.25, by + h);
  ctx.lineTo(0, 0);
  ctx.lineTo(size * k * 0.35, by + h);
  ctx.fillStyle = o.fill || C.white;
  ctx.fill();
  ctx.lineWidth = LW * k;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.fillStyle = o.color || C.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + w / 2, by + h / 2 + size * k * 0.05);
  ctx.restore();
}

// ---------- Standard room shell ----------
// Draws the slab, floor and (optionally) the two back walls.
// w, d: the zone's size, for one that isn't S x S (R.W, R.D).
export function slab(ctx, color = C.greyLight, w = S, d = S) {
  face(ctx, [[w, 0, 0], [w, d, 0], [w, d, -SLAB], [w, 0, -SLAB]], shade(color, 0.12));
  face(ctx, [[0, d, 0], [w, d, 0], [w, d, -SLAB], [0, d, -SLAB]], shade(color, 0.3), { dots: shade(color, 0.6), density: 0.25 });
}

export function floor(ctx, color, o = {}) {
  rect(ctx, 0, 0, S, S, 0, color, o);
}

// Grid of floor tiles (lines only). step in units.
export function tiles(ctx, step = 2, color = C.ink, lw = 0.035, x0 = 0, y0 = 0, w = S, d = S) {
  if (!Q.detail) return;
  ctx.beginPath();
  for (let i = step; i < w; i += step) {
    const a = P(x0 + i, y0), b = P(x0 + i, y0 + d);
    ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
  }
  for (let j = step; j < d; j += step) {
    const a = P(x0, y0 + j), b = P(x0 + w, y0 + j);
    ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.stroke();
}

// Checkerboard floor.
export function checker(ctx, a, b, step = 2, x0 = 0, y0 = 0, w = S, d = S) {
  rect(ctx, x0, y0, w, d, 0, a, { stroke: false });
  for (let i = 0; i < w / step; i++)
    for (let j = 0; j < d / step; j++)
      if ((i + j) % 2) rect(ctx, x0 + i * step, y0 + j * step, step, step, 0, b, { stroke: false });
}

// Wooden planks running along x.
export function planks(ctx, color = C.woodLight, step = 1, x0 = 0, y0 = 0, w = S, d = S) {
  rect(ctx, x0, y0, w, d, 0, color, { stroke: false });
  if (!Q.detail) return;
  ctx.beginPath();
  for (let j = step; j < d; j += step) {
    const a = P(x0, y0 + j), b = P(x0 + w, y0 + j);
    ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    const off = ((j * 7.3) % 5) + 1;
    for (let k = off; k < w; k += 5) {
      const c = P(x0 + k, y0 + j - step), e = P(x0 + k, y0 + j);
      ctx.moveTo(c[0], c[1]); ctx.lineTo(e[0], e[1]);
    }
  }
  ctx.strokeStyle = shade(color, 0.35);
  ctx.lineWidth = 0.03;
  ctx.stroke();
}

// The two back walls as thick slabs with a top edge, like cut-away dollhouse rooms.
// o.left / o.right: inner face colors. o.h: height. o.dots: halftone on the faces.
export function walls(ctx, o = {}) {
  const h = o.h ?? WALL, t = 0.45;
  const lc = o.left || C.white, rc = o.right || C.greyLight;
  const cap = o.cap || C.paper;
  if (o.rightWall !== false) {
    box(ctx, -t, -t, 0, S + t, t, h, rc, {
      left: rc, top: cap, right: shade(rc, 0.3), flat: true,
    });
    if (o.dotsR) onRight(ctx, 0, 0, S, h, null, { dots: o.dotsR, density: o.densR ?? 0.25, stroke: false });
  }
  if (o.leftWall !== false) {
    box(ctx, -t, 0, 0, t, S, h, lc, {
      right: lc, top: cap, left: shade(lc, 0.3), flat: true,
    });
    if (o.dotsL) onLeft(ctx, 0, 0, S, h, null, { dots: o.dotsL, density: o.densL ?? 0.25, stroke: false });
  }
}

// ---------- People ----------
// A small, cheerful billboard person standing at (x, y, z).
// o: { skin, hair, style: short|long|bun|curly|pony|bald, hat: cap|beanie|chef|helmet|party|none,
//      top, bottom, dress, pose, dir: 'l'|'r', back, phase, speed, scale, hold(ctx),
//      wear(ctx, body, t), face(ctx, hy, back, t) }
// Poses: stand walk run sit wave cheer jump dance swim sleep skate point carry read drum lie
// wear and face let a place dress its cast without new engine code: wear draws
// over the torso (an apron, medals) with body = { hipY, top, shoulderY, dress,
// back }, and face draws over the head (a mustache, spectacles, a beak) with
// the head's center at (0.02, hy). Both draw in the person's own units, facing
// right (the person is flipped for you when they face left).
export function person(ctx, x, y, z, o = {}, t = 0) {
  const X = x - y, Y = (x + y) / 2 - z * ZK;
  const s = o.scale || 1;
  const f = o.dir === 'l' ? -1 : 1;
  const pose = o.pose || 'stand';
  const ph = (o.phase || 0) + t * (o.speed || 7);
  const sn = Math.sin(ph), cs = Math.cos(ph);
  const skin = o.skin || SKIN[0];
  const top = o.top || C.coral;
  const bottom = o.bottom || C.navy;
  const back = !!o.back;

  // Joint angles (radians, 0 = straight down). Positive swings toward facing direction.
  let lA = 0.08, lB = -0.08, aA = 0.15, aB = -0.15, lean = 0, lift = 0;
  let kneeA = 0, kneeB = 0, torsoH = 0.85;
  let hideLegs = false;

  switch (pose) {
    case 'walk': lA = sn * 0.45; lB = -sn * 0.45; aA = -sn * 0.5; aB = sn * 0.5; lift = Math.abs(cs) * 0.05; break;
    case 'run': lA = sn * 0.8; lB = -sn * 0.8; aA = -sn * 1.1 + 0.4; aB = sn * 1.1 + 0.4; lean = 0.18; lift = Math.abs(cs) * 0.15; kneeA = 0.4; kneeB = 0.4; break;
    case 'wave': aA = Math.PI - 0.5 + sn * 0.35; break;
    case 'cheer': aA = Math.PI - 0.45 + sn * 0.15; aB = -Math.PI + 0.45 - sn * 0.15; lift = Math.abs(sn) * 0.25; break;
    case 'jump': lift = Math.abs(sn) * 0.9; aA = Math.PI - 0.6; aB = -Math.PI + 0.6; lA = 0.25; lB = -0.25; kneeA = kneeB = lift > 0.3 ? 0.5 : 0; break;
    case 'dance': lift = Math.abs(sn) * 0.15; aA = Math.PI * (0.55 + 0.35 * (sn > 0 ? 1 : 0)); aB = -Math.PI * (0.55 + 0.35 * (sn > 0 ? 0 : 1)); lA = 0.25 * sn; lB = -0.25 * cs; lean = sn * 0.1; break;
    case 'skate': lA = 0.25 + sn * 0.35; lB = -0.25 - sn * 0.1; aA = 1.2 + sn * 0.2; aB = -1.2 - sn * 0.2; lean = 0.22; break;
    case 'point': aA = 1.5; break;
    case 'carry': aA = 1.2; aB = 1.2; break;
    case 'read': aA = 1.0; aB = 1.0; break;
    case 'drum': aA = 1.2 + sn * 0.5; aB = 1.2 - sn * 0.5; break;
    case 'sit': lA = Math.PI / 2; lB = Math.PI / 2 - 0.1; kneeA = kneeB = -Math.PI / 2; aA = 0.6; aB = 0.5; break;
    case 'swim': hideLegs = true; aA = ph % (Math.PI * 2) < Math.PI ? Math.PI - 0.3 : 0.9; aB = 0.6 - sn * 0.3; break;
  }
  if (o.arms) [aA, aB] = o.arms;

  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(f * s, s);

  if (pose === 'sleep' || pose === 'lie') {
    ctx.rotate(-Math.PI / 2);
    ctx.translate(0.2, 0.3);
  }

  // Ground shadow
  if (Q.detail && pose !== 'swim' && pose !== 'sleep' && pose !== 'lie' && pose !== 'sit') {
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.45, 0.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = alpha(C.ink, 0.18);
    ctx.fill();
  }

  ctx.translate(0, -lift);
  ctx.rotate(lean);
  const legL = 0.8;
  const hipY = -legL;

  const limb = (x0, y0, ang, len, color, knee = 0, width = 0.2) => {
    const x1 = x0 + Math.sin(ang) * len * 0.5, y1 = y0 + Math.cos(ang) * len * 0.5;
    const x2 = x1 + Math.sin(ang + knee) * len * 0.5, y2 = y1 + Math.cos(ang + knee) * len * 0.5;
    ctx.beginPath();
    ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (Q.lines) {
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = width + 0.1;
      ctx.stroke();
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
    return [x2, y2];
  };

  // Legs
  if (!hideLegs) {
    const legColor = o.dress ? skin : bottom;
    const fA = limb(-0.12, hipY, lA, legL, legColor, kneeA);
    const fB = limb(0.12, hipY, lB, legL, legColor, kneeB);
    ctx.fillStyle = o.shoes || C.ink;
    for (const [fx, fy] of [fA, fB]) {
      ctx.beginPath();
      ctx.ellipse(fx + 0.06, fy, 0.14, 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const shoulderY = hipY - torsoH + 0.12;
  // Far arm (drawn behind the body)
  limb(-0.22, shoulderY, aB, 0.72, top, 0, 0.17);

  // Torso
  ctx.beginPath();
  if (o.dress) {
    ctx.moveTo(-0.22, hipY - torsoH);
    ctx.lineTo(0.22, hipY - torsoH);
    ctx.lineTo(0.4, hipY + 0.25);
    ctx.lineTo(-0.4, hipY + 0.25);
    ctx.closePath();
  } else {
    ctx.roundRect(-0.28, hipY - torsoH, 0.56, torsoH + 0.08, 0.18);
  }
  paint(ctx, top, { dots: Q.detail ? shade(top, 0.45) : null, density: 0.12 });
  if (!o.dress && !hideLegs && Q.detail) {
    ctx.beginPath();
    ctx.rect(-0.28, hipY - 0.06, 0.56, 0.14);
    ctx.fillStyle = bottom;
    ctx.fill();
  }
  if (o.wear) o.wear(ctx, { hipY, top: hipY - torsoH, shoulderY, dress: !!o.dress, back }, t);

  // Held item
  if (o.hold) {
    ctx.save();
    ctx.translate(0.35, shoulderY + 0.3);
    o.hold(ctx, t);
    ctx.restore();
  }

  // Near arm
  const hand = limb(0.22, shoulderY, aA, 0.72, top, 0, 0.17);
  if (Q.detail) {
    ctx.beginPath();
    ctx.arc(hand[0], hand[1], 0.09, 0, Math.PI * 2);
    ctx.fillStyle = skin;
    ctx.fill();
  }

  // Head
  const hy = hipY - torsoH - 0.3;
  ctx.beginPath();
  ctx.arc(0.02, hy, 0.31, 0, Math.PI * 2);
  paint(ctx, skin);
  drawHair(ctx, o.style || 'short', o.hair || HAIR[0], hy, back);
  drawHat(ctx, o.hat, hy, t);
  if (!back && Q.detail && pose !== 'sleep') {
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(0.1, hy + 0.02, 0.035, 0, Math.PI * 2);
    ctx.arc(0.24, hy + 0.02, 0.035, 0, Math.PI * 2);
    ctx.fill();
  }
  if (o.face) o.face(ctx, hy, back, t);
  ctx.restore();

  if (pose === 'sleep' && Q.detail) {
    const k = (t * 0.6) % 1;
    label(ctx, x - 0.5 * k, y - 0.5 * k, z + 1.2 + k * 1.2, 'z', 0.45 + k * 0.3, alpha(C.ink, 1 - k));
  }
}

function drawHair(ctx, style, color, hy, back) {
  if (style === 'bald') return;
  ctx.fillStyle = color;
  ctx.beginPath();
  if (back) {
    ctx.arc(0.02, hy, 0.33, 0, Math.PI * 2);
  } else {
    ctx.arc(0.02, hy - 0.03, 0.33, Math.PI * 1.02, Math.PI * 2.02);
    ctx.lineTo(-0.3, hy + 0.05);
  }
  ctx.fill();
  if (style === 'long' || style === 'pony') {
    ctx.beginPath();
    if (style === 'long') ctx.roundRect(-0.34, hy - 0.1, 0.26, 0.62, 0.12);
    else ctx.ellipse(-0.38, hy + 0.05, 0.1, 0.24, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (style === 'bun') {
    ctx.beginPath();
    ctx.arc(-0.05, hy - 0.38, 0.14, 0, Math.PI * 2);
    ctx.fill();
  }
  if (style === 'curly') {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI + (i / 5) * Math.PI;
      ctx.moveTo(0.02 + Math.cos(a) * 0.3, hy + Math.sin(a) * 0.3);
      ctx.arc(0.02 + Math.cos(a) * 0.3, hy + Math.sin(a) * 0.3, 0.12, 0, Math.PI * 2);
    }
    ctx.fill();
  }
}

function drawHat(ctx, hat, hy, t) {
  if (!hat || hat === 'none') return;
  ctx.beginPath();
  if (hat === 'cap') {
    ctx.arc(0.02, hy - 0.08, 0.32, Math.PI, 0);
    ctx.closePath();
    paint(ctx, C.coral);
    // The brim, at the dome's foot and finely outlined: thick ink on a thin
    // brim read as a black bar across the eyes.
    ctx.beginPath();
    ctx.rect(0.12, hy - 0.15, 0.36, 0.08);
    paint(ctx, C.coral, { lw: 0.025 });
  } else if (hat === 'beanie') {
    ctx.arc(0.02, hy - 0.06, 0.34, Math.PI, 0);
    paint(ctx, C.mustard);
    ctx.beginPath();
    ctx.arc(0.02, hy - 0.42, 0.08, 0, Math.PI * 2);
    paint(ctx, C.coral);
  } else if (hat === 'chef') {
    ctx.rect(-0.22, hy - 0.5, 0.48, 0.38);
    ctx.arc(-0.1, hy - 0.55, 0.18, 0, Math.PI * 2);
    ctx.arc(0.16, hy - 0.55, 0.18, 0, Math.PI * 2);
    paint(ctx, C.white);
  } else if (hat === 'helmet') {
    ctx.arc(0.02, hy - 0.02, 0.37, Math.PI, 0);
    paint(ctx, C.white);
  } else if (hat === 'party') {
    ctx.moveTo(-0.2, hy - 0.2);
    ctx.lineTo(0.05, hy - 0.85);
    ctx.lineTo(0.28, hy - 0.2);
    paint(ctx, C.pink, { dots: C.mustard, density: 0.4 });
  } else if (hat === 'sun') {
    ctx.ellipse(0.02, hy - 0.2, 0.55, 0.12, 0, 0, Math.PI * 2);
    paint(ctx, C.butter);
    ctx.beginPath();
    ctx.arc(0.02, hy - 0.22, 0.26, Math.PI, 0);
    paint(ctx, C.butter);
  }
}

// Build a random-looking but repeatable person style from a seed.
export function folk(seed, extra = {}) {
  const r = rng(seed * 7919 + 13);
  return {
    skin: pick(r, SKIN),
    hair: pick(r, HAIR),
    style: pick(r, ['short', 'short', 'long', 'bun', 'curly', 'pony', 'bald']),
    top: pick(r, CLOTH),
    bottom: pick(r, [C.navy, C.ink, C.teal, C.brown, C.grey, C.coral]),
    dress: r() < 0.18,
    phase: r() * 10,
    ...extra,
  };
}

// ---------- The goose ----------
// ~1 unit tall. pose: walk | stand | honk | swim | sit | peck
export function goose(ctx, x, y, z, t = 0, o = {}) {
  const X = x - y, Y = (x + y) / 2 - z * ZK;
  const f = o.dir === 'l' ? -1 : 1;
  const pose = o.pose || 'stand';
  const s = o.scale || 1;
  const ph = t * 9 + (o.phase || 0);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(f * s, s);
  if (pose !== 'swim' && Q.detail) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.4, 0.16, 0, 0, Math.PI * 2);
    ctx.fillStyle = alpha(C.ink, 0.18);
    ctx.fill();
  }
  const bob = pose === 'walk' ? Math.abs(Math.sin(ph)) * 0.06 : 0;
  ctx.translate(0, -bob);
  // legs
  if (pose !== 'swim' && pose !== 'sit') {
    ctx.strokeStyle = C.coral;
    ctx.lineWidth = 0.07;
    ctx.lineCap = 'round';
    const sw = pose === 'walk' ? Math.sin(ph) * 0.12 : 0;
    ctx.beginPath();
    ctx.moveTo(-0.05, -0.32); ctx.lineTo(-0.05 + sw, 0);
    ctx.moveTo(0.08, -0.32); ctx.lineTo(0.08 - sw, 0);
    ctx.stroke();
  }
  const by = pose === 'swim' ? -0.05 : pose === 'sit' ? -0.2 : -0.45;
  // body
  ctx.beginPath();
  ctx.ellipse(0, by, 0.42, 0.24, -0.12, 0, Math.PI * 2);
  ctx.moveTo(-0.3, by - 0.05);
  ctx.lineTo(-0.55, by - 0.22);
  ctx.lineTo(-0.38, by + 0.08);
  paint(ctx, C.white, { dots: Q.detail ? C.grey : null, density: 0.1 });
  // wing
  ctx.beginPath();
  ctx.ellipse(-0.05, by - 0.02, 0.24, 0.12, -0.2, 0, Math.PI * 2);
  paint(ctx, C.greyLight);
  // neck + head
  const honk = pose === 'honk';
  const peck = pose === 'peck' ? (Math.sin(t * 5) > 0 ? 1 : 0) : 0;
  const nx = honk ? 0.5 : peck ? 0.5 : 0.28, ny = honk ? by - 0.45 : peck ? by + 0.15 : by - 0.62;
  ctx.beginPath();
  ctx.moveTo(0.22, by - 0.1);
  ctx.quadraticCurveTo(0.35, by - 0.3, nx, ny);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.2;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.strokeStyle = C.white;
  ctx.lineWidth = 0.13;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(nx, ny, 0.12, 0, Math.PI * 2);
  paint(ctx, C.white);
  // beak
  ctx.beginPath();
  if (honk) {
    ctx.moveTo(nx + 0.08, ny - 0.04); ctx.lineTo(nx + 0.34, ny - 0.14); ctx.lineTo(nx + 0.1, ny);
    ctx.moveTo(nx + 0.08, ny + 0.03); ctx.lineTo(nx + 0.32, ny + 0.1); ctx.lineTo(nx + 0.08, ny + 0.06);
  } else {
    ctx.moveTo(nx + 0.08, ny - 0.05); ctx.lineTo(nx + 0.3, ny + 0.01); ctx.lineTo(nx + 0.08, ny + 0.06);
  }
  paint(ctx, C.coral);
  ctx.beginPath();
  ctx.arc(nx + 0.03, ny - 0.03, 0.03, 0, Math.PI * 2);
  ctx.fillStyle = C.ink;
  ctx.fill();
  ctx.restore();
}

// ---------- Nature and props ----------
// Potted plant. kind: leafy | spiky | bush | cactus | palm | fern
export function plant(ctx, x, y, z, t = 0, o = {}) {
  const X = x - y, Y = (x + y) / 2 - z * ZK;
  const s = o.scale || 1;
  const kind = o.kind || 'leafy';
  const leaf = o.leaf || C.green;
  const sway = Math.sin(t * 1.3 + x * 0.7 + y) * 0.06;
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(s, s);
  if (o.pot !== false) {
    ctx.beginPath();
    ctx.moveTo(-0.35, -0.6); ctx.lineTo(0.35, -0.6); ctx.lineTo(0.26, 0); ctx.lineTo(-0.26, 0);
    ctx.closePath();
    paint(ctx, o.potColor || C.coral, { dots: shade(o.potColor || C.coral, 0.5), density: 0.2 });
  }
  ctx.translate(0, -0.6);
  ctx.rotate(sway);
  const n = kind === 'bush' ? 7 : 6;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.42;
    ctx.save();
    ctx.rotate(a + Math.PI / 2);
    ctx.beginPath();
    if (kind === 'spiky') {
      ctx.moveTo(-0.08, 0); ctx.lineTo(0, -1.3 - (i % 2) * 0.3); ctx.lineTo(0.08, 0);
    } else if (kind === 'cactus') {
      if (i > 0) { ctx.restore(); continue; }
      ctx.roundRect(-0.18, -1.1, 0.36, 1.1, 0.18);
      ctx.roundRect(0.1, -0.8, 0.35, 0.16, 0.08);
      ctx.roundRect(0.3, -1.0, 0.16, 0.36, 0.08);
    } else if (kind === 'palm' || kind === 'fern') {
      ctx.ellipse(0, -0.65, 0.12, 0.62, 0, 0, Math.PI * 2);
    } else if (kind === 'bush') {
      ctx.arc(0, -0.45, 0.32, 0, Math.PI * 2);
    } else {
      ctx.ellipse(0, -0.5, 0.22, 0.45, 0, 0, Math.PI * 2);
    }
    paint(ctx, i % 2 ? leaf : shade(leaf, 0.15), { dots: shade(leaf, 0.5), density: 0.15 });
    ctx.restore();
  }
  ctx.restore();
}

export function tree(ctx, x, y, z, t = 0, o = {}) {
  const X = x - y, Y = (x + y) / 2 - z * ZK;
  const s = o.scale || 1;
  const leaf = o.leaf || C.green;
  const sway = Math.sin(t * 0.9 + x + y) * 0.04;
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(s, s);
  if (Q.detail) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.4, 0.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = alpha(C.ink, 0.15);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-0.15, 0); ctx.lineTo(-0.1, -2.2); ctx.lineTo(0.1, -2.2); ctx.lineTo(0.15, 0);
  paint(ctx, C.brown);
  ctx.rotate(sway);
  const blobs = o.blobs || [[0, -3.2, 1.2], [-0.8, -2.6, 0.8], [0.8, -2.7, 0.85], [0.1, -4.1, 0.85]];
  for (const [bx, by, br] of blobs) {
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    paint(ctx, leaf, { dots: shade(leaf, 0.45), density: 0.28 });
  }
  if (o.fruit) {
    ctx.fillStyle = o.fruit;
    for (const [fx, fy] of [[-0.5, -3], [0.6, -3.4], [0.2, -2.6], [-0.2, -3.9]]) {
      ctx.beginPath();
      ctx.arc(fx, fy, 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Simple chair facing +x (dir 'r') or +y (dir 'l').
export function chair(ctx, x, y, z = 0, color = C.mustard, dir = 'r') {
  box(ctx, x, y, z + 0.8, 0.8, 0.8, 0.15, color);
  if (dir === 'r') box(ctx, x - 0.05, y, z + 0.8, 0.15, 0.8, 0.9, color);
  else box(ctx, x, y - 0.05, z + 0.8, 0.8, 0.15, 0.9, color);
  for (const [lx, ly] of [[x + 0.65, y + 0.65], [x + 0.05, y + 0.65], [x + 0.65, y + 0.05]]) {
    box(ctx, lx, ly, z, 0.1, 0.1, 0.8, C.ink, { flat: true, stroke: false });
  }
}

// Table: top at height h.
export function table(ctx, x, y, w, d, h = 1.2, color = C.wood, z = 0) {
  const lw = 0.14;
  for (const [lx, ly] of [[x + w - lw - 0.1, y + d - lw - 0.1], [x + 0.1, y + d - lw - 0.1], [x + w - lw - 0.1, y + 0.1]]) {
    box(ctx, lx, ly, z, lw, lw, h - 0.15, shade(color, 0.2), { flat: true });
  }
  box(ctx, x, y, z + h - 0.15, w, d, 0.15, color);
}

// Shelf unit against the left wall (x = 0), spanning y..y+w, with n shelves of stuff.
export function shelfL(ctx, y, w, h, n, seed = 1, color = C.wood, fill) {
  const r = rng(seed);
  box(ctx, 0, y, 0, 1.1, w, 0.12, color);
  for (let i = 0; i < n; i++) {
    const z = 0.3 + (i * (h - 0.3)) / n;
    box(ctx, 0, y, z, 1.1, w, 0.1, color, { flat: true });
    if (fill) fill(ctx, y, z + 0.1, w, r, i);
    else {
      let yy = y + 0.1;
      while (yy < y + w - 0.3) {
        const bw = 0.18 + r() * 0.2, bh = 0.5 + r() * 0.35;
        box(ctx, 0.2, yy, z + 0.1, 0.7, bw, Math.min(bh, (h - 0.3) / n - 0.2), pick(r, CLOTH), { flat: true, lw: 0.03 });
        yy += bw + 0.02;
      }
    }
  }
  box(ctx, 0, y, h, 1.1, w, 0.12, color);
}
export function shelfR(ctx, x, w, h, n, seed = 1, color = C.wood, fill) {
  const r = rng(seed);
  box(ctx, x, 0, 0, w, 1.1, 0.12, color);
  for (let i = 0; i < n; i++) {
    const z = 0.3 + (i * (h - 0.3)) / n;
    box(ctx, x, 0, z, w, 1.1, 0.1, color, { flat: true });
    if (fill) fill(ctx, x, z + 0.1, w, r, i);
    else {
      let xx = x + 0.1;
      while (xx < x + w - 0.3) {
        const bw = 0.18 + r() * 0.2, bh = 0.5 + r() * 0.35;
        box(ctx, xx, 0.2, z + 0.1, bw, 0.7, Math.min(bh, (h - 0.3) / n - 0.2), pick(r, CLOTH), { flat: true, lw: 0.03 });
        xx += bw + 0.02;
      }
    }
  }
  box(ctx, x, 0, h, w, 1.1, 0.12, color);
}

// Wall clock that tells the real time.
export function clockL(ctx, y, z, r = 0.6) {
  const X = -y, Y = y / 2 - z * ZK;
  ctx.save();
  ctx.translate(X, Y);
  ctx.transform(1, -0.5, 0, 1, 0, 0);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  paint(ctx, C.white);
  const d = new Date();
  const hA = ((d.getHours() % 12) + d.getMinutes() / 60) / 12 * Math.PI * 2;
  const mA = (d.getMinutes() + d.getSeconds() / 60) / 60 * Math.PI * 2;
  ctx.strokeStyle = C.ink;
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.09;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(hA) * r * 0.5, -Math.cos(hA) * r * 0.5); ctx.stroke();
  ctx.lineWidth = 0.06;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(mA) * r * 0.8, -Math.cos(mA) * r * 0.8); ctx.stroke();
  ctx.restore();
}

// Framed picture on a wall. plane 'left' or 'right'.
export function frame(ctx, plane, u, z, w, h, color = C.mustard, art) {
  const f = plane === 'left' ? onLeft : onRight;
  f(ctx, u - 0.12, z - 0.12, w + 0.24, h + 0.24, C.ink);
  f(ctx, u, z, w, h, color, { dots: shade(color, 0.3), density: 0.2 });
  if (art) art(ctx);
}

// Lamp (floor lamp) with a soft glow.
export function lamp(ctx, x, y, t = 0, color = C.mustard, glow = true) {
  box(ctx, x - 0.3, y - 0.3, 0, 0.6, 0.6, 0.1, C.ink, { flat: true });
  box(ctx, x - 0.05, y - 0.05, 0.1, 0.1, 0.1, 3.2, C.ink, { flat: true, stroke: false });
  const X = x - y, Y = (x + y) / 2 - 3.3 * ZK;
  if (glow && Q.detail) {
    const g = ctx.createRadialGradient(X, Y + 0.3, 0.1, X, Y + 0.3, 2.4);
    g.addColorStop(0, alpha(C.butter, 0.55 + Math.sin(t * 2) * 0.05));
    g.addColorStop(1, alpha(C.butter, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(X, Y + 0.3, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(X - 0.35, Y); ctx.lineTo(X + 0.35, Y); ctx.lineTo(X + 0.55, Y + 0.7); ctx.lineTo(X - 0.55, Y + 0.7);
  ctx.closePath();
  paint(ctx, color);
}

// A soft glow centred on (x, y, z), r units out: lamps, candles, fires, lit
// windows. Screened over what's under it, so it brightens without covering.
// k: strength, 0..1. The gradient is drawn once per color and reused.
const glowSprites = new Map();
function glowSprite(color) {
  let cv = glowSprites.get(color);
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, alpha(color, 0.9));
    gr.addColorStop(0.3, alpha(color, 0.45));
    gr.addColorStop(0.65, alpha(color, 0.12));
    gr.addColorStop(1, alpha(color, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    glowSprites.set(color, cv);
  }
  return cv;
}
export function glow(ctx, x, y, z, r, color = C.butter, k = 1) {
  if (!(k > 0.01) || !(r > 0)) return;
  const X = x - y, Y = (x + y) / 2 - z * ZK;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha *= Math.min(1, k);
  ctx.drawImage(glowSprite(color), X - r, Y - r, r * 2, r * 2);
  ctx.restore();
}

// Rug on the floor.
export function rug(ctx, x, y, w, d, color = C.teal, border = C.coral) {
  rect(ctx, x, y, w, d, 0.01, border, { stroke: false });
  rect(ctx, x + 0.3, y + 0.3, w - 0.6, d - 0.6, 0.01, color, { dots: shade(color, 0.4), density: 0.15 });
}

// Speech-bubble-free sound mark: little musical notes floating up.
export function note(ctx, x, y, z, color = C.ink, s = 1) {
  const X = x - y, Y = (x + y) / 2 - z * ZK;
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.06;
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.14, 0.1, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0.12, -0.02); ctx.lineTo(0.12, -0.5); ctx.lineTo(0.3, -0.38);
  ctx.stroke();
  ctx.restore();
}
