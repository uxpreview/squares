// Master Bedroom: the late Lord's room upstairs. The middle of his four-poster
// is a trapdoor that keeps dropping open (the cat always gets off first), and
// what it swallows comes back up out of the RETURNS basket, mostly. The goose-
// proof safe opens a crack in the dark, the new will is on the desk, the diary
// is on the bedside table, and the goose painted out of his portrait won't stay
// painted out.
import {
  C, Q, P, box, rect, cylinder, face, poly, paint, label, slab, onLeft, onRight, mix, shade, tint, alpha, hash,
} from '../../../engine/art.js';
import { clamp, ease } from '../../../engine/actors.js';
import { ZK } from '../../../engine/iso.js';
import {
  INK, MAT, ROOM, house, storm, MIDNIGHT, stormWindow, drapes, stripes, trim, painting,
  lamp, candle, fire,
} from '../style.js';
import { DOORS, LOOP } from '../plan.js';

// ---------- Inks ----------
const RM = ROOM['master-bedroom'];
const WALL_L = RM.wall;
const WALL_R = shade(RM.wall, 0.07);
const STRIPE = mix(RM.wall, INK.oxblood, 0.13);
const WAINSCOT = mix(RM.wall, INK.oxblood, 0.32);
const CARPET = RM.floor;
const TRIM = RM.trim;
const WOOD = MAT.mahogany;
const WOOD_D = MAT.mahoganyDark;
const WOOD_L = mix(MAT.mahogany, MAT.oak, 0.28);
const VELVET = MAT.velvet;
const VELVET_D = MAT.velvetDark;
const PLUM = INK.deepPlum;
const LINEN = MAT.linen;
const LINEN_S = mix(MAT.linen, INK.deepPlum, 0.16);
const BRASS = MAT.brass;
const BRASS_D = MAT.brassDark;
const IRON = mix(INK.verdigris, INK.stormNavy, 0.6);
const IRON_D = shade(IRON, 0.35);
const BONE = INK.bone;
const PIT = mix(C.ink, INK.deepPlum, 0.3); // the dark down a hole
const CAT = mix(INK.stormNavy, C.black, 0.5);
const FUR = MAT.fur;
const FUR_D = MAT.furDark;
const PAPER = MAT.paper;
const WICKER = MAT.pine;
const WICKER_D = MAT.oak;
const GREEN = mix(INK.verdigris, INK.stormNavy, 0.2); // the good armchair's velvet
const LEATHER = mix(INK.oxblood, INK.stormNavy, 0.35);
const GLASS = MAT.glass;
const SILK = mix(INK.bone, INK.candleGold, 0.22);
const TARTAN = mix(INK.verdigris, INK.stormNavy, 0.15);
const BOTTLE = mix(INK.verdigris, INK.stormNavy, 0.45);

const DISPLAY = '"Bagel Fat One", "Arial Black", sans-serif';
const BODY = '"Rethink Sans", system-ui, sans-serif';

// ---------- Where things are ----------
const TOP = 1.25; // the mattress
const BX0 = 2, BY0 = 2.5, BX1 = 7, BY1 = 8; // the four-poster, post to post
const PH = 4.6, PS = 0.25, RAIL = 4.35; // post height and size, underside of the canopy rails
const HOLE = { x0: 2.85, y0: 5.1, x1: 5.05, y1: 7.1 }; // the trapdoor
const HX = (HOLE.x0 + HOLE.x1) / 2, HY = (HOLE.y0 + HOLE.y1) / 2;
const PILLOW_L = [3.45, 3.5], PILLOW_R = [5.55, 3.5];
const CAT_BED = [6.2, 4.85], CAT_FLOOR = [8.05, 5.95];
const CAT_Z = TOP + 0.14; // on its blanket
const BASKET = { x0: 9.95, y0: 5.0, x1: 10.85, y1: 5.75, h: 0.95 };
const BASKET_MID = [(BASKET.x0 + BASKET.x1) / 2, (BASKET.y0 + BASKET.y1) / 2];
const FOX = [9.6, 9.05];

// ---------- The evening, as the bed sees it ----------
// Every so often the middle of the bed drops open. t: when, open: for how
// long, back: when the cat dares get back on (it always gets off first).
const DROPS = [
  { t: 12, open: 2.6, what: 'quilt' },
  { t: 27, open: 2.4, what: 'pillow', back: 33.4 },
  { t: 42, open: 3.4, what: 'snore' },
  { t: 57, open: 6.4, what: 'bat' },
  { t: 72, open: 2.8, what: 'bottle' },
  { t: 101, open: 5.4, what: 'skeleton' },
  { t: 118, open: 3.6, what: 'hand' },
  { t: 134, open: 4.2, what: 'periscope' },
  { t: 150, open: 2.9, what: 'quilt back' },
  { t: 165, open: 2.2, what: 'nightcap' },
];
const loopT = (t) => ((t % LOOP) + LOOP) % LOOP;
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (tt, a, b) => clamp((tt - a) / (b - a));
const arc = (k, h) => Math.sin(Math.PI * clamp(k)) * h;

// How far open the trapdoor is: 0 shut, 1 hanging open (it drops, bounces, and swings shut).
function doorK(tt) {
  for (const d of DROPS) {
    const a = tt - d.t;
    if (a < 0 || a > d.open + 0.45) continue;
    if (a < 0.18) return a / 0.18;
    if (a < 0.45) return 1 - 0.14 * Math.sin(((a - 0.18) / 0.27) * Math.PI);
    if (a < d.open) return 1;
    return 1 - ease((a - d.open) / 0.45);
  }
  return 0;
}
// The quilt: 0 on the bed, 1 gone down the hole. It goes at 12 and the
// skeleton pushes it back up at 150.
function quiltK(tt) {
  if (tt < 12.25) return { k: 0 };
  if (tt < 13.55) return { k: (tt - 12.25) / 1.3, dir: 'in' };
  if (tt < 150.3) return { k: 1 };
  if (tt < 152.5) return { k: 1 - (tt - 150.3) / 2.2, dir: 'out' };
  return { k: 0 };
}
// The left pillow (and the nightcap on it) goes down at 27, and the pillow
// shoots back out of the RETURNS basket at 31. The nightcap doesn't.
function pillowL(tt) {
  const [px, py] = PILLOW_L;
  if (tt < 27.25 || tt >= 32.35) return { x: px, y: py, z: TOP, home: true };
  if (tt < 27.95) { const k = ease(seg(tt, 27.25, 27.95)); return { x: lerp(px, HX, k), y: lerp(py, HY, k), z: TOP, slide: true }; }
  if (tt < 28.65) { const k = seg(tt, 27.95, 28.65); return { x: HX, y: HY, z: TOP - k * k * 2.4, sunk: true }; }
  if (tt < 31.05) return null;
  const k = seg(tt, 31.05, 32.35), e = ease(k);
  return { x: lerp(BASKET_MID[0], px, e), y: lerp(BASKET_MID[1], py, e), z: lerp(0.7, TOP, k) + arc(k, 3.2), flying: true, spin: k };
}
// The nightcap: on the pillow, then down the hole, then on the skeleton, then
// flicked back up onto the pillow at 165.
function capAt(tt) {
  if (tt < 27.25 || tt >= 166.4) {
    const p = pillowL(tt);
    return { x: p.x - 0.1, y: p.y - 0.15, z: TOP + 0.33, on: true };
  }
  if (tt < 28.65) { const p = pillowL(tt); return { x: p.x - 0.1, y: p.y - 0.15, z: p.z + 0.33, sunk: p.sunk }; }
  if (tt >= 165.3) {
    const k = seg(tt, 165.3, 166.4);
    return { x: lerp(HX, PILLOW_L[0] - 0.1, ease(k)), y: lerp(HY, PILLOW_L[1] - 0.15, ease(k)), z: lerp(TOP - 0.6, TOP + 0.33, k) + arc(k, 1.8), flying: true, spin: k };
  }
  return null;
}
// The cat: asleep on the bed, except just before (and for a while after) the
// bed opens. It's up and watching the safe while the lights are out.
function catAt(tt) {
  const [bx, by] = CAT_BED, [fx, fy] = CAT_FLOOR;
  for (const d of DROPS) {
    const off = d.t - 1.9, on = d.back ?? d.t + d.open + 1.8;
    if (tt < off - 0.6 || tt > on + 0.9) continue;
    if (tt < off) return { x: bx, y: by, z: CAT_Z, pose: 'wake', dir: 'r' };
    if (tt < off + 0.45) {
      const k = seg(tt, off, off + 0.45);
      return { x: lerp(bx, fx, k), y: lerp(by, fy, k), z: lerp(CAT_Z, 0, k) + arc(k, 0.7), pose: 'hop', dir: 'r', k };
    }
    if (tt < on) {
      const scared = d.what === 'skeleton' && tt > d.t + 0.4 && tt < d.t + 4.9;
      return { x: fx, y: fy, z: 0, pose: scared ? 'arch' : 'sit', dir: 'l' };
    }
    if (tt < on + 0.45) {
      const k = seg(tt, on, on + 0.45);
      return { x: lerp(fx, bx, k), y: lerp(fy, by, k), z: lerp(0, CAT_Z, k) + arc(k, 0.9), pose: 'hop', dir: 'l', k };
    }
    return { x: bx, y: by, z: CAT_Z, pose: 'wake', dir: 'r' };
  }
  if (tt > 83.4 && tt < 94.2) return { x: bx, y: by, z: CAT_Z, pose: 'wake', dir: 'r', watch: true };
  return { x: bx, y: by, z: CAT_Z, pose: 'sleep', dir: 'r' };
}
// The safe: a crack open in the dark, and shut again before anyone sees.
function safeK(tt) {
  if (tt < 83.2 || tt > 93.9) return 0;
  if (tt < 85.4) return ease(seg(tt, 83.2, 85.4));
  if (tt < 91.6) return 1 + 0.06 * Math.sin((tt - 85.4) * 2.3);
  return 1 - ease(seg(tt, 91.6, 93.9));
}
// The RETURNS basket's lid: up when something comes out, or goes in.
function lidK(tt) {
  const pop = (a, b) => (tt < a || tt > b ? 0 : Math.sin(Math.PI * seg(tt, a, b)));
  return Math.max(pop(30.85, 31.75), pop(73.05, 74.05));
}

// ---------- Drawing helpers ----------
// Draw in the upright plane through (x0, y0) toward (x1, y1): local u runs
// along it (in units), v runs down, from the point (x0, y0, z0).
function plane(ctx, x0, y0, z0, x1, y1, fn) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  ctx.save();
  ctx.transform(ux - uy, (ux + uy) / 2, 0, ZK, x0 - y0, (x0 + y0) / 2 - z0 * ZK);
  fn(ctx);
  ctx.restore();
}
// Draw flat on a level surface at height z: u runs along x, v along y.
function flat(ctx, x, y, z, fn) {
  ctx.save();
  ctx.transform(1, 0.5, -1, 0.5, x - y, (x + y) / 2 - z * ZK);
  fn(ctx);
  ctx.restore();
}
function words(ctx, text, x, y, size, color, o = {}) {
  const k = 40;
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale(1 / k, 1 / k);
  const font = o.font || BODY;
  ctx.font = `${o.italic ? 'italic ' : ''}${font === DISPLAY ? 400 : o.weight || 700} ${size * k}px ${font}`;
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
// A wobbly line of handwriting, in whatever plane the context is in.
function scribble(ctx, x, y, w, seed, color = C.ink, lw = 0.014) {
  const n = Math.max(3, Math.round(w / 0.035));
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const u = x + (w * i) / n, v = y + (hash(seed, i) - 0.5) * 0.028;
    i ? ctx.lineTo(u, v) : ctx.moveTo(u, v);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.stroke();
}
// A line through 3D points.
function line3(ctx, pts, color = C.ink, lw = 0.05) {
  ctx.beginPath();
  pts.forEach((p, i) => { const [X, Y] = P(...p); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}
// A bone (or a limb, or a tube): a thick stroke with an ink outline.
function limb(ctx, pts, color, w) {
  ctx.beginPath();
  pts.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = w + 0.08; ctx.stroke(); }
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
}
function shadow(ctx, x, y, rx, ry, a = 0.2) {
  const [X, Y] = P(x, y, 0);
  ctx.beginPath();
  ctx.ellipse(X, Y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = alpha(C.ink, a);
  ctx.fill();
}
// A point on an upright plane: 'y' is the plane y = at (u runs along x), 'x' the plane x = at (u along y).
const on = (kind, at, u, z) => (kind === 'y' ? [u, at, z] : [at, u, z]);

// Clip to what's above the trapdoor (or any opening): whatever is below the
// mattress only shows through the hole, whatever has come up shows above it.
function clipAbove(ctx, x0, y0, x1, y1, z) {
  const L = P(x0, y1, z), F = P(x1, y1, z), Rr = P(x1, y0, z);
  ctx.beginPath();
  ctx.moveTo(L[0] - 3, L[1] - 30);
  ctx.lineTo(L[0], L[1]);
  ctx.lineTo(F[0], F[1]);
  ctx.lineTo(Rr[0], Rr[1]);
  ctx.lineTo(Rr[0] + 3, Rr[1] - 30);
  ctx.closePath();
  ctx.clip();
}

// ---------- The four-poster ----------
function bedPost(ctx, x, y) {
  box(ctx, x - 0.03, y - 0.03, 0, PS + 0.06, PS + 0.06, 0.92, WOOD);
  box(ctx, x + 0.045, y + 0.045, 0.92, PS - 0.09, PS - 0.09, PH - 0.92, WOOD, { flat: true });
  for (const z of [0.92, 1.6, 2.65, 3.7]) box(ctx, x, y, z, PS, PS, 0.12, WOOD_D, { flat: true });
  box(ctx, x - 0.02, y - 0.02, PH - 0.12, PS + 0.04, PS + 0.04, 0.12, WOOD_D, { flat: true });
  const [X, Y] = P(x + PS / 2, y + PS / 2, PH);
  ctx.beginPath();
  ctx.ellipse(X, Y - 0.17, 0.12, 0.17, 0, 0, Math.PI * 2);
  paint(ctx, BRASS, { lw: 0.04 });
}
// A velvet valance with a scalloped hem, hanging on an upright plane.
function valance(ctx, kind, at, a, b, zTop, zBot) {
  const n = Math.max(2, Math.round((b - a) / 0.85));
  const pt = (u, z) => P(...on(kind, at, u, z));
  ctx.beginPath();
  let p = pt(a, zTop);
  ctx.moveTo(p[0], p[1]);
  p = pt(b, zTop);
  ctx.lineTo(p[0], p[1]);
  for (let i = n; i > 0; i--) {
    const u0 = a + ((b - a) * i) / n, u1 = a + ((b - a) * (i - 1)) / n;
    const e = pt(u0, zBot + 0.15), f = pt(u1, zBot + 0.15), m = pt((u0 + u1) / 2, zBot);
    if (i === n) ctx.lineTo(e[0], e[1]);
    ctx.quadraticCurveTo(2 * m[0] - (e[0] + f[0]) / 2, 2 * m[1] - (e[1] + f[1]) / 2, f[0], f[1]);
  }
  ctx.closePath();
  paint(ctx, VELVET, { dots: VELVET_D, density: 0.22 });
  face(ctx, [on(kind, at, a, zTop - 0.1), on(kind, at, b, zTop - 0.1)], null, { lw: 0.06, stroke: BRASS });
}
// A curtain drawn shut on an upright plane, with its folds.
function curtain(ctx, kind, at, a, b, z0, z1) {
  face(ctx, [on(kind, at, a, z0), on(kind, at, b, z0), on(kind, at, b, z1), on(kind, at, a, z1)], VELVET, { dots: VELVET_D, density: 0.3 });
  if (!Q.detail) return;
  ctx.beginPath();
  for (let u = a + 0.3; u < b - 0.1; u += 0.36) {
    const p0 = P(...on(kind, at, u, z0 + 0.05)), p1 = P(...on(kind, at, u, z1));
    ctx.moveTo(p0[0], p0[1]);
    ctx.lineTo(p1[0], p1[1]);
  }
  ctx.strokeStyle = VELVET_D;
  ctx.lineWidth = 0.035;
  ctx.stroke();
}
// A curtain gathered at a post and tied back with a gold cord.
function bunch(ctx, x, y) {
  const [X, Yf] = P(x, y, 0);
  const Yt = Yf - 2.1 * ZK, Ytop = Yf - RAIL * ZK;
  ctx.beginPath();
  ctx.moveTo(X - 0.32, Ytop);
  ctx.lineTo(X + 0.32, Ytop);
  ctx.quadraticCurveTo(X + 0.32, Ytop + (Yt - Ytop) * 0.6, X + 0.13, Yt);
  ctx.quadraticCurveTo(X + 0.2, Yt + (Yf - Yt) * 0.6, X + 0.46, Yf + 0.05);
  ctx.quadraticCurveTo(X, Yf + 0.22, X - 0.46, Yf + 0.05);
  ctx.quadraticCurveTo(X - 0.2, Yt + (Yf - Yt) * 0.6, X - 0.13, Yt);
  ctx.quadraticCurveTo(X - 0.32, Ytop + (Yt - Ytop) * 0.6, X - 0.32, Ytop);
  ctx.closePath();
  paint(ctx, VELVET, { dots: VELVET_D, density: 0.25 });
  if (Q.detail) {
    ctx.beginPath();
    for (const s of [-0.16, 0.02, 0.18]) {
      ctx.moveTo(X + s * 1.2, Ytop + 0.1);
      ctx.quadraticCurveTo(X + s * 0.5, Yt - 0.2, X + s * 0.3, Yt);
      ctx.moveTo(X + s * 0.3, Yt + 0.1);
      ctx.quadraticCurveTo(X + s * 0.8, Yf - 0.6, X + s * 1.9, Yf);
    }
    ctx.strokeStyle = VELVET_D;
    ctx.lineWidth = 0.035;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(X, Yt, 0.19, 0.07, 0, 0, Math.PI * 2);
  paint(ctx, BRASS, { lw: 0.03 });
  ctx.beginPath();
  ctx.moveTo(X + 0.12, Yt + 0.02);
  ctx.lineTo(X + 0.22, Yt + 0.42);
  ctx.lineTo(X + 0.06, Yt + 0.42);
  ctx.closePath();
  paint(ctx, BRASS, { lw: 0.03 });
}

// The far half: the curtains drawn on the far sides (a velvet box for the bed
// to sit in), the valances, the headboard and the back posts.
function bedBack(ctx) {
  curtain(ctx, 'x', BX0 + 0.12, BY0 + 0.12, BY1 - 0.1, 0.05, RAIL);
  curtain(ctx, 'y', BY0 + 0.12, BX0 + 0.12, BX1 - 0.1, 0.05, RAIL);
  valance(ctx, 'x', BX0 + 0.12, BY0 + 0.12, BY1 - 0.1, RAIL, 3.8);
  valance(ctx, 'y', BY0 + 0.12, BX0 + 0.12, BX1 - 0.1, RAIL, 3.8);
  box(ctx, BX0, BY0 + PS, RAIL, 0.12, BY1 - BY0 - 2 * PS, 0.2, WOOD_D, { flat: true });
  box(ctx, BX0 + PS, BY0, RAIL, BX1 - BX0 - 2 * PS, 0.12, 0.2, WOOD_D, { flat: true });
  // The headboard, with a carved crest and the family's brass G.
  const hx0 = BX0 + PS, hx1 = BX1 - PS, hy = BY0 + 0.24;
  box(ctx, hx0, BY0 + 0.05, 0.25, hx1 - hx0, 0.19, 2.75, WOOD, { dotsL: WOOD_D });
  const crest = [];
  for (let i = 0; i <= 12; i++) {
    const u = i / 12;
    crest.push([lerp(hx0, hx1, u), hy, 3.0 + Math.sin(u * Math.PI) * 0.55 + (i === 6 ? 0.12 : 0)]);
  }
  face(ctx, [[hx0, hy, 2.95], ...crest, [hx1, hy, 2.95]], WOOD, { dots: WOOD_D, density: 0.2 });
  if (Q.detail) {
    for (const [a, b] of [[hx0 + 0.3, 4.3], [4.7, hx1 - 0.3]]) {
      face(ctx, [[a, hy, 1.45], [b, hy, 1.45], [b, hy, 2.75], [a, hy, 2.75]], null, { lw: 0.04, stroke: WOOD_D });
      face(ctx, [[a + 0.15, hy, 1.6], [b - 0.15, hy, 1.6], [b - 0.15, hy, 2.6], [a + 0.15, hy, 2.6]], WOOD_L, { lw: 0.03 });
    }
  }
  plane(ctx, 4.5, hy, 3.28, 5.5, hy, (g) => {
    g.beginPath();
    g.moveTo(-0.28, -0.22); g.lineTo(0.28, -0.22); g.lineTo(0.28, 0.08);
    g.quadraticCurveTo(0.26, 0.3, 0, 0.38); g.quadraticCurveTo(-0.26, 0.3, -0.28, 0.08);
    g.closePath();
    paint(g, BRASS, { lw: 0.04 });
    words(g, 'G', 0, 0.06, 0.34, WOOD_D, { font: DISPLAY });
  });
  bedPost(ctx, BX0, BY0);
  bedPost(ctx, BX1 - PS, BY0);
  bunch(ctx, BX1 - 0.02, BY0 + 0.32);
}

// The bed itself: the frame, its skirt and the mattress.
function bedBody(ctx) {
  const x0 = BX0 + 0.1, y0 = BY0 + 0.15, x1 = BX1 - 0.1, y1 = BY1 - 0.1;
  box(ctx, x0, y0, 0.28, x1 - x0, y1 - y0, 0.64, WOOD);
  // A velvet skirt, pleated, on the two sides we can see.
  face(ctx, [[x1 + 0.02, y0, 0.92], [x1 + 0.02, y1, 0.92], [x1 + 0.02, y1, 0.04], [x1 + 0.02, y0, 0.04]], VELVET, { dots: VELVET_D, density: 0.2 });
  face(ctx, [[x0, y1 + 0.02, 0.92], [x1 + 0.02, y1 + 0.02, 0.92], [x1 + 0.02, y1 + 0.02, 0.04], [x0, y1 + 0.02, 0.04]], shade(VELVET, 0.1), { dots: VELVET_D, density: 0.26 });
  if (Q.detail) {
    ctx.beginPath();
    for (let y = y0 + 0.25; y < y1; y += 0.3) { const a = P(x1 + 0.02, y, 0.9), b = P(x1 + 0.02, y, 0.06); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
    for (let x = x0 + 0.25; x < x1; x += 0.3) { const a = P(x, y1 + 0.02, 0.9), b = P(x, y1 + 0.02, 0.06); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
    ctx.strokeStyle = VELVET_D;
    ctx.lineWidth = 0.03;
    ctx.stroke();
  }
  // The mattress and its sheet.
  box(ctx, BX0 + 0.15, BY0 + 0.28, 0.92, BX1 - BX0 - 0.3, BY1 - BY0 - 0.4, TOP - 0.92, LINEN, { dotsL: LINEN_S, left: LINEN_S, right: tint(LINEN_S, 0.3) });
  // the top sheet, turned down under the pillows, and its creases
  face(ctx, [[BX0 + 0.2, 3.98, TOP + 0.004], [BX1 - 0.12, 3.98, TOP + 0.004], [BX1 - 0.12, 4.36, TOP + 0.004], [BX0 + 0.2, 4.36, TOP + 0.004]], tint(LINEN_S, 0.45), { lw: 0.03 });
  if (Q.detail) {
    line3(ctx, [[BX1 - 0.15, BY0 + 0.3, 1.08], [BX1 - 0.15, BY1 - 0.12, 1.08], [BX0 + 0.15, BY1 - 0.12, 1.08]], LINEN_S, 0.03);
    for (const [a, b, c] of [[[2.5, 4.7], [3.4, 5.0], [4.1, 4.75]], [[5.2, 6.4], [5.9, 6.9], [6.6, 6.7]], [[2.6, 7.4], [3.2, 7.2], [3.9, 7.5]]]) {
      line3(ctx, [[a[0], a[1], TOP + 0.004], [b[0], b[1], TOP + 0.004], [c[0], c[1], TOP + 0.004]], alpha(LINEN_S, 0.9), 0.025);
    }
  }
}
// A folded tartan blanket, where the cat sleeps.
function blanket(ctx) {
  const x0 = 5.5, x1 = 6.8, y0 = 4.38, y1 = 5.4, z = TOP, h = CAT_Z - TOP;
  box(ctx, x0, y0, z, x1 - x0, y1 - y0, h, TARTAN, { dotsL: shade(TARTAN, 0.5), top: tint(TARTAN, 0.06) });
  if (!Q.detail) return;
  for (const u of [0.22, 0.5, 0.78]) line3(ctx, [[lerp(x0, x1, u), y0, z + h], [lerp(x0, x1, u), y1, z + h]], INK.oxblood, 0.05);
  for (const v of [0.3, 0.72]) line3(ctx, [[x0, lerp(y0, y1, v), z + h], [x1, lerp(y0, y1, v), z + h]], INK.oxblood, 0.05);
  for (const u of [0.36, 0.64]) line3(ctx, [[lerp(x0, x1, u), y0, z + h], [lerp(x0, x1, u), y1, z + h]], BRASS, 0.02);
  line3(ctx, [[x0, y1, z + h * 0.5], [x1, y1, z + h * 0.5], [x1, y0, z + h * 0.5]], shade(TARTAN, 0.45), 0.025);
}

// The near half: the footboard, the front posts, the foot curtain and the rails.
function bedFront(ctx) {
  const fx0 = BX0 + PS, fx1 = BX1 - PS, fy = BY1 - 0.22;
  box(ctx, fx0, fy, 0.28, fx1 - fx0, 0.18, 1.27, WOOD, { dotsL: WOOD_D });
  box(ctx, fx0 - 0.05, fy - 0.03, 1.55, fx1 - fx0 + 0.1, 0.24, 0.1, WOOD_D, { flat: true });
  if (Q.detail) {
    const yy = fy + 0.18;
    for (const [a, b] of [[fx0 + 0.25, 4.35], [4.65, fx1 - 0.25]]) {
      face(ctx, [[a, yy, 0.55], [b, yy, 0.55], [b, yy, 1.35], [a, yy, 1.35]], WOOD_L, { lw: 0.03 });
    }
  }
  box(ctx, BX1 - 0.12, BY0 + PS, RAIL, 0.12, BY1 - BY0 - 2 * PS, 0.2, WOOD_D, { flat: true });
  box(ctx, BX0 + PS, BY1 - 0.12, RAIL, BX1 - BX0 - 2 * PS, 0.12, 0.2, WOOD_D, { flat: true });
  bedPost(ctx, BX0, BY1 - PS);
  bedPost(ctx, BX1 - PS, BY1 - PS);
  bunch(ctx, BX0 + 0.3, BY1 + 0.1);
}

// ---------- On the bed ----------
function puff(g, w, d, b = 0.09) {
  const hw = w / 2, hd = d / 2;
  g.beginPath();
  g.moveTo(-hw, -hd);
  g.quadraticCurveTo(0, -hd - b, hw, -hd);
  g.quadraticCurveTo(hw + b, 0, hw, hd);
  g.quadraticCurveTo(0, hd + b, -hw, hd);
  g.quadraticCurveTo(-hw - b, 0, -hw, -hd);
  g.closePath();
}
function pillow(ctx, x, y, z, w = 1.5, d = 0.95) {
  flat(ctx, x, y, z + 0.02, (g) => { puff(g, w, d); paint(g, LINEN_S, { lw: 0.05 }); });
  for (const [dz, s] of [[0.09, 0.985], [0.18, 0.97]]) flat(ctx, x, y, z + dz, (g) => { puff(g, w * s, d * s); g.fillStyle = LINEN_S; g.fill(); });
  flat(ctx, x, y, z + 0.27, (g) => {
    puff(g, w * 0.95, d * 0.93);
    paint(g, LINEN, { lw: 0.05 });
    if (Q.detail) {
      g.beginPath();
      g.moveTo(-w * 0.3, -d * 0.1); g.quadraticCurveTo(0, d * 0.12, w * 0.3, -d * 0.05);
      g.strokeStyle = LINEN_S; g.lineWidth = 0.03; g.stroke();
    }
  });
}
// A pillow in the air, tumbling (screen-facing, so it can spin).
function flyingPillow(ctx, x, y, z, spin) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.rotate(spin * Math.PI * 2);
  puff(ctx, 1.3, 0.7, 0.12);
  paint(ctx, LINEN, { lw: 0.05 });
  ctx.restore();
}
function nightcap(ctx, X, Y, s = 1, lean = -1, rot = 0) {
  ctx.save();
  ctx.translate(X, Y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(-0.27, 0);
  ctx.bezierCurveTo(-0.22, -0.48, 0.3 * lean, -0.66, 0.64 * lean, -0.3);
  ctx.bezierCurveTo(0.34 * lean, -0.42, 0.22, -0.3, 0.27, 0);
  ctx.closePath();
  paint(ctx, BONE, { dots: INK.oxblood, density: 0.35, lw: 0.04 });
  ctx.beginPath();
  ctx.roundRect(-0.29, -0.09, 0.58, 0.12, 0.05);
  paint(ctx, INK.oxblood, { lw: 0.03 });
  ctx.beginPath();
  ctx.arc(0.66 * lean, -0.28, 0.08, 0, Math.PI * 2);
  paint(ctx, BRASS, { lw: 0.03 });
  ctx.restore();
}
// The quilt, as four corners on the mattress (it can gather and shrink).
function quilt(ctx, c, z, hang = 0) {
  if (hang > 0.01) {
    // it hangs over the side and the foot
    const [, , [x2, y2], [x3, y3]] = c, [x1, y1] = c[1];
    face(ctx, [[x1, y1, z], [x2, y2, z], [x2, y2, z - 0.36 * hang], [x1, y1, z - 0.36 * hang]], tint(PLUM, 0.06), { dots: shade(PLUM, 0.5), density: 0.2 });
    face(ctx, [[x3, y3, z], [x2, y2, z], [x2, y2, z - 0.36 * hang], [x3, y3, z - 0.36 * hang]], shade(PLUM, 0.12), { dots: shade(PLUM, 0.5), density: 0.28 });
  }
  face(ctx, c.map(([x, y]) => [x, y, z]), PLUM, { dots: shade(PLUM, 0.45), density: 0.12 });
  if (!Q.detail) return;
  const at = (u, v) => {
    const top = [lerp(c[0][0], c[1][0], u), lerp(c[0][1], c[1][1], u)], bot = [lerp(c[3][0], c[2][0], u), lerp(c[3][1], c[2][1], u)];
    return [lerp(top[0], bot[0], v), lerp(top[1], bot[1], v), z];
  };
  // gold border, and diamond quilting
  face(ctx, [at(0.05, 0.06), at(0.95, 0.06), at(0.95, 0.94), at(0.05, 0.94)], null, { lw: 0.05, stroke: BRASS });
  ctx.beginPath();
  for (let i = -5; i <= 10; i++) {
    for (const s of [1, -1]) {
      let started = false;
      for (let k = 0; k <= 10; k++) {
        const v = 0.1 + k * 0.08, u = 0.1 + i * 0.16 + s * (v - 0.1) * 0.9;
        if (u < 0.1 || u > 0.9) { started = false; continue; }
        const [X, Y] = P(...at(u, v));
        started ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
        started = true;
      }
    }
  }
  ctx.strokeStyle = alpha(BRASS, 0.7);
  ctx.lineWidth = 0.025;
  ctx.stroke();
}
const QUILT_HOME = [[BX0 + 0.2, 4.35], [BX1 - 0.12, 4.35], [BX1 - 0.12, BY1 - 0.1], [BX0 + 0.2, BY1 - 0.1]];
const QUILT_HOLE = [[HOLE.x0, HOLE.y0], [HOLE.x1, HOLE.y0], [HOLE.x1, HOLE.y1], [HOLE.x0, HOLE.y1]];
const lerpQuad = (a, b, k) => a.map(([x, y], i) => [lerp(x, b[i][0], k), lerp(y, b[i][1], k)]);

// The dark inside the trapdoor, its far walls, and a ladder going down (the
// cellar is a long way below).
function holeInside(ctx, k) {
  const { x0, y0, x1, y1 } = HOLE;
  face(ctx, [[x0, y0, TOP], [x1, y0, TOP], [x1, y1, TOP], [x0, y1, TOP]], PIT, { stroke: false });
  face(ctx, [[x0, y0, TOP], [x0, y1, TOP], [x0, y1, 0.92], [x0, y0, 0.92]], LINEN_S, { lw: 0.03 });
  face(ctx, [[x0, y0, TOP], [x1, y0, TOP], [x1, y0, 0.92], [x0, y0, 0.92]], shade(LINEN_S, 0.12), { lw: 0.03 });
  face(ctx, [[x0, y0, 0.92], [x0, y1, 0.92], [x0, y1, 0.28], [x0, y0, 0.28]], WOOD_D, { lw: 0.03 });
  face(ctx, [[x0, y0, 0.92], [x1, y0, 0.92], [x1, y0, 0.28], [x0, y0, 0.28]], shade(WOOD_D, 0.2), { lw: 0.03 });
  face(ctx, [[x0, y0, 0.28], [x0, y1, 0.28], [x0, y1, -3], [x0, y0, -3]], mix(PIT, INK.deepPlum, 0.35), { stroke: false });
  if (Q.detail) {
    // ladder rungs down the far wall, fading into the dark
    for (let i = 0; i < 6; i++) {
      const z = 0.1 - i * 0.42;
      line3(ctx, [[x0 + 0.03, 5.6, z], [x0 + 0.03, 6.6, z]], alpha(WOOD_L, 1 - i * 0.16), 0.05);
    }
    line3(ctx, [[x0 + 0.03, 5.6, 0.28], [x0 + 0.03, 5.6, -2.4]], alpha(WOOD_L, 0.5), 0.05);
    line3(ctx, [[x0 + 0.03, 6.6, 0.28], [x0 + 0.03, 6.6, -2.4]], alpha(WOOD_L, 0.5), 0.05);
    // far, far down: a candle in the cellar
    const [X, Y] = P(HX + 0.3, HY + 0.2, -4.5);
    ctx.beginPath();
    ctx.arc(X, Y, 0.06, 0, Math.PI * 2);
    ctx.fillStyle = alpha(INK.candleGold, 0.8 * k);
    ctx.fill();
  }
}
// One of the two trapdoor flaps, hinged at hingeX, swung down by k.
function flapQuad(hingeX, s, k) {
  const a = (k * Math.PI) / 2, w = (HOLE.x1 - HOLE.x0) / 2;
  const fx = hingeX + s * w * Math.cos(a), fz = TOP - w * Math.sin(a);
  return [[hingeX, HOLE.y0, TOP], [hingeX, HOLE.y1, TOP], [fx, HOLE.y1, fz], [fx, HOLE.y0, fz]];
}

// A skeleton sitting up in bed (and in the Lord's nightcap), facing the foot.
function skeleton(ctx, x, y, z, t, up, wave) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y + (1 - up) * 2.6);
  ctx.scale(-1, 1);
  limb(ctx, [[0, 0.5], [0, -1.25]], BONE, 0.1);
  for (let i = 0; i < 4; i++) {
    const yy = -1.1 + i * 0.16, w = 0.31 - Math.abs(i - 1) * 0.035;
    ctx.beginPath();
    ctx.moveTo(-w, yy + 0.07);
    ctx.quadraticCurveTo(0, yy - 0.1, w, yy + 0.07);
    ctx.lineCap = 'round';
    if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.13; ctx.stroke(); }
    ctx.strokeStyle = BONE;
    ctx.lineWidth = 0.06;
    ctx.stroke();
  }
  limb(ctx, [[-0.33, -1.22], [0, -1.3], [0.33, -1.22]], BONE, 0.08);
  limb(ctx, [[-0.3, -1.2], [-0.45, -0.72], [-0.66, -0.4]], BONE, 0.08);
  const sw = Math.sin(t * 8) * 0.32 * wave;
  const hx = 0.62 + sw, hy = -2.12;
  limb(ctx, [[0.3, -1.2], [0.56, -1.62], [hx, hy]], BONE, 0.08);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.035;
  ctx.beginPath();
  for (let f = -1; f <= 1; f++) { ctx.moveTo(hx, hy); ctx.lineTo(hx + f * 0.09 + sw * 0.1, hy - 0.2); }
  ctx.stroke();
  // skull
  ctx.beginPath();
  ctx.arc(0.04, -1.63, 0.26, 0, Math.PI * 2);
  paint(ctx, BONE, { lw: 0.05 });
  ctx.beginPath();
  ctx.roundRect(-0.02, -1.47, 0.24, 0.14, 0.05);
  paint(ctx, BONE, { lw: 0.04 });
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.ellipse(0.1, -1.66, 0.06, 0.075, 0, 0, Math.PI * 2);
  ctx.ellipse(0.24, -1.66, 0.05, 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0.2, -1.55); ctx.lineTo(0.24, -1.49); ctx.lineTo(0.16, -1.5);
  ctx.fill();
  if (Q.detail) {
    ctx.beginPath();
    for (let i = 0; i < 4; i++) { ctx.moveTo(0.02 + i * 0.05, -1.45); ctx.lineTo(0.02 + i * 0.05, -1.37); }
    ctx.lineWidth = 0.02;
    ctx.stroke();
  }
  nightcap(ctx, 0.0, -1.8, 0.95, -1, -0.15);
  ctx.restore();
}
// A bony hand, patting about for something (the diary?).
function hand(ctx, x, y, z, reach, pat) {
  const [ax, ay] = P(HX + 0.2, HOLE.y0 + 0.1, TOP - 0.3);
  const [X, Y] = P(x, y, z + pat * 0.2);
  limb(ctx, [[ax, ay], [lerp(ax, X, 0.55), lerp(ay, Y, 0.55) - 0.25 * reach], [X, Y]], BONE, 0.08);
  ctx.save();
  ctx.translate(X, Y);
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.13, 0.08, 0.2, 0, Math.PI * 2);
  paint(ctx, BONE, { lw: 0.04 });
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.04;
  ctx.beginPath();
  for (let f = 0; f < 4; f++) { ctx.moveTo(0.05, -0.04 + f * 0.03); ctx.lineTo(0.28, -0.1 + f * 0.07 - pat * 0.05); }
  ctx.moveTo(-0.05, 0.05); ctx.lineTo(0.08, 0.16);
  ctx.stroke();
  ctx.restore();
}
function periscope(ctx, x, y, z, up, look) {
  const [X, Y] = P(x, y, z);
  const top = Y - up * 1.7;
  ctx.beginPath();
  ctx.rect(X - 0.13, top, 0.26, Y - top + 0.4);
  paint(ctx, BRASS, { dots: BRASS_D, density: 0.25, lw: 0.045 });
  for (const v of [0.35, 0.95]) {
    ctx.beginPath();
    ctx.rect(X - 0.16, top + v, 0.32, 0.08);
    paint(ctx, BRASS_D, { lw: 0.03 });
  }
  // the head, turned to look left, right, or straight at you
  const f = look;
  if (Math.abs(f) > 0.3) {
    ctx.beginPath();
    ctx.roundRect(f > 0 ? X - 0.16 : X - 0.52, top - 0.42, 0.68, 0.42, 0.08);
    paint(ctx, BRASS, { lw: 0.045 });
    ctx.beginPath();
    ctx.ellipse(f > 0 ? X + 0.52 : X - 0.52, top - 0.21, 0.07, 0.17, 0, 0, Math.PI * 2);
    paint(ctx, GLASS, { lw: 0.035 });
  } else {
    ctx.beginPath();
    ctx.roundRect(X - 0.26, top - 0.46, 0.52, 0.46, 0.1);
    paint(ctx, BRASS, { lw: 0.045 });
    ctx.beginPath();
    ctx.arc(X, top - 0.23, 0.17, 0, Math.PI * 2);
    paint(ctx, GLASS, { lw: 0.035 });
    ctx.beginPath();
    ctx.arc(X, top - 0.23, 0.08, 0, Math.PI * 2);
    ctx.fillStyle = C.ink;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(X - 0.06, top - 0.29, 0.045, 0, Math.PI * 2);
    ctx.fillStyle = C.white;
    ctx.fill();
  }
}
function bottle(ctx, X, Y, rot) {
  ctx.save();
  ctx.translate(X, Y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(-0.13, 0.28);
  ctx.lineTo(-0.13, -0.08);
  ctx.quadraticCurveTo(-0.13, -0.2, -0.05, -0.25);
  ctx.lineTo(-0.05, -0.42);
  ctx.lineTo(0.05, -0.42);
  ctx.lineTo(0.05, -0.25);
  ctx.quadraticCurveTo(0.13, -0.2, 0.13, -0.08);
  ctx.lineTo(0.13, 0.28);
  ctx.closePath();
  paint(ctx, BOTTLE, { lw: 0.04 });
  ctx.beginPath();
  ctx.rect(-0.12, -0.02, 0.24, 0.18);
  paint(ctx, BONE, { lw: 0.02 });
  if (Q.detail) words(ctx, '1974', 0, 0.07, 0.085, INK.oxblood);
  ctx.restore();
}
function bat(ctx, X, Y, t, s = 1) {
  const flap = Math.sin(t * 22);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(s, s);
  for (const f of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, -0.02);
    ctx.lineTo(f * 0.2, -0.12 - flap * 0.18);
    ctx.lineTo(f * 0.48, -0.06 - flap * 0.3);
    ctx.quadraticCurveTo(f * 0.36, 0.0, f * 0.32, 0.08 - flap * 0.1);
    ctx.quadraticCurveTo(f * 0.22, 0.02, f * 0.14, 0.1 - flap * 0.05);
    ctx.quadraticCurveTo(f * 0.08, 0.04, 0, 0.06);
    ctx.closePath();
    paint(ctx, mix(CAT, INK.deepPlum, 0.55), { lw: 0.035 });
  }
  ctx.beginPath();
  ctx.ellipse(0, 0.02, 0.07, 0.11, 0, 0, Math.PI * 2);
  paint(ctx, CAT, { lw: 0.03 });
  ctx.beginPath();
  ctx.moveTo(-0.06, -0.06); ctx.lineTo(-0.05, -0.16); ctx.lineTo(-0.01, -0.08);
  ctx.moveTo(0.06, -0.06); ctx.lineTo(0.05, -0.16); ctx.lineTo(0.01, -0.08);
  ctx.fillStyle = CAT;
  ctx.fill();
  ctx.fillStyle = BONE;
  ctx.fillRect(-0.04, -0.02, 0.025, 0.025);
  ctx.fillRect(0.015, -0.02, 0.025, 0.025);
  ctx.restore();
}

// Where the bat goes: up out of the bed, twice round the four-poster, and home.
function batAt(tt) {
  const a = tt - 57.3;
  if (a < 0 || a > 5.9) return null;
  if (a < 0.5) return { x: HX, y: HY, z: TOP - 0.4 + a * 3.2, inHole: a < 0.35 };
  if (a < 5.3) {
    const k = (a - 0.5) / 4.8, ang = -Math.PI / 2 + k * Math.PI * 4;
    const r = 1.6 + Math.sin(k * Math.PI) * 2.4;
    return { x: 4.6 + Math.cos(ang) * r, y: 5.3 + Math.sin(ang) * r, z: 2.9 + Math.sin(k * 11) * 0.5 + Math.sin(k * Math.PI) * 0.6 };
  }
  const k = (a - 5.3) / 0.6;
  const from = { x: 4.6, y: 5.3 - 1.6, z: 2.9 };
  return { x: lerp(from.x, HX, k), y: lerp(from.y, HY, k), z: lerp(from.z, TOP - 0.5, k * k), inHole: k > 0.7 };
}
// The empty 1974 comes up out of the bed and drops into the RETURNS basket.
function bottleAt(tt) {
  const k = seg(tt, 72.3, 73.55);
  if (tt < 72.3 || tt > 73.6) return null;
  const e = ease(k);
  return { x: lerp(HX, BASKET_MID[0], e), y: lerp(HY, BASKET_MID[1], e), z: lerp(TOP - 0.6, 0.6, k) + arc(k, 3.0), rot: k * 9 };
}

// Everything on the bed that changes: pillows, quilt, the trapdoor and what's
// in it. The cat is drawn on its own.
function bedding(ctx, t) {
  const tt = loopT(t);
  const door = doorK(tt);
  const q = quiltK(tt);
  const pl = pillowL(tt);
  const cap = capAt(tt);
  const hide = q.k > 0.02 || q.dir;

  // The trapdoor's outline, on the sheet, when the quilt isn't over it.
  if (door < 0.01 && hide && Q.detail) {
    const { x0, y0, x1, y1 } = HOLE;
    face(ctx, [[x0, y0, TOP], [x1, y0, TOP], [x1, y1, TOP], [x0, y1, TOP]], null, { lw: 0.03, stroke: LINEN_S });
    line3(ctx, [[HX, y0, TOP], [HX, y1, TOP]], LINEN_S, 0.03);
    const [X, Y] = P(HX, y1 - 0.15, TOP);
    ctx.beginPath();
    ctx.ellipse(X, Y, 0.11, 0.055, 0, 0, Math.PI * 2);
    ctx.strokeStyle = BRASS_D;
    ctx.lineWidth = 0.035;
    ctx.stroke();
  }
  // Pillows (and the nightcap) at home.
  pillow(ctx, PILLOW_R[0], PILLOW_R[1], TOP);
  if (pl && pl.home) pillow(ctx, pl.x, pl.y, pl.z);
  if (cap && cap.on) { const [X, Y] = P(cap.x, cap.y, cap.z); nightcap(ctx, X, Y, 0.8, 1, 0.5); }

  if (door > 0.01) {
    const { x0, y0, x1, y1 } = HOLE;
    ctx.save();
    poly(ctx, [[x0, y0, TOP], [x1, y0, TOP], [x1, y1, TOP], [x0, y1, TOP]]);
    ctx.clip();
    holeInside(ctx, door);
    face(ctx, flapQuad(x0, 1, door), LINEN, { lw: 0.04 });
    ctx.restore();

    // What goes down, or comes up.
    ctx.save();
    clipAbove(ctx, x0, y0, x1, y1, TOP);
    if (q.k > 0.5 && q.k < 1) {
      const k = (q.k - 0.5) / 0.5;
      quilt(ctx, QUILT_HOLE, TOP + 0.04 - k * k * 2.4);
      if (q.dir === 'out') {
        for (const [hx, hy] of [[x0 + 0.5, y1], [x1, y0 + 0.5]]) {
          const [X, Y] = P(hx, hy, TOP + 0.04 - k * k * 2.4);
          limb(ctx, [[X - 0.05, Y + 1.4], [X, Y + 0.08]], BONE, 0.11);
          ctx.beginPath();
          ctx.ellipse(X, Y + 0.02, 0.16, 0.1, 0, 0, Math.PI * 2);
          paint(ctx, BONE, { lw: 0.045 });
          ctx.strokeStyle = C.ink;
          ctx.lineWidth = 0.05;
          ctx.beginPath();
          for (let f = -1.5; f <= 1.5; f++) { ctx.moveTo(X + f * 0.08, Y - 0.02); ctx.quadraticCurveTo(X + f * 0.09, Y - 0.2, X + f * 0.07, Y - 0.26); }
          ctx.stroke();
          ctx.strokeStyle = BONE;
          ctx.lineWidth = 0.03;
          ctx.stroke();
        }
      }
    }
    if (pl && pl.sunk) pillow(ctx, pl.x, pl.y, pl.z, 1.3, 0.8);
    if (cap && cap.sunk) { const [X, Y] = P(cap.x, cap.y, cap.z); nightcap(ctx, X, Y, 0.8, 1, 0.5); }
    if (tt > 101 && tt < 106.4) {
      const up = ease(seg(tt, 101.3, 102.3)) * (1 - ease(seg(tt, 105.2, 106.2)));
      skeleton(ctx, HX - 0.1, HY + 0.1, TOP, t, up, seg(tt, 102.2, 102.6) * (1 - seg(tt, 104.8, 105.1)));
    }
    if (tt > 118.2 && tt < 121.5) {
      const reach = ease(seg(tt, 118.3, 118.9)) * (1 - ease(seg(tt, 120.7, 121.3)));
      const k = seg(tt, 118.9, 120.6);
      const hx = lerp(HX, 4.3, k), hy = lerp(HOLE.y0 + 0.1, 4.2, reach * (0.4 + 0.6 * k));
      hand(ctx, hx, hy, TOP + 0.05 - (1 - reach) * 0.8, reach, Math.abs(Math.sin(tt * 9)) * (k > 0 && k < 1 ? 1 : 0));
    }
    if (tt > 134.2 && tt < 138.1) {
      const up = ease(seg(tt, 134.3, 134.9)) * (1 - ease(seg(tt, 137.3, 137.9)));
      const look = [1, 1, -1, -1, 0, 0, 1][Math.floor(seg(tt, 134.9, 137.3) * 6.99)];
      periscope(ctx, HX + 0.2, HY, TOP, up, look);
    }
    if (cap && cap.flying && tt < 165.6) { const [X, Y] = P(cap.x, cap.y, cap.z); nightcap(ctx, X, Y, 0.8, 1, cap.spin * 6); }
    const b = bottleAt(tt);
    if (b && b.z < TOP + 0.5 && seg(tt, 72.3, 73.55) < 0.2) { const [X, Y] = P(b.x, b.y, b.z); bottle(ctx, X, Y, b.rot); }
    const bt = batAt(tt);
    if (bt && bt.inHole) { const [X, Y] = P(bt.x, bt.y, bt.z); bat(ctx, X, Y, t, 1.3); }
    ctx.restore();

    ctx.save();
    poly(ctx, [[x0, y0, TOP], [x1, y0, TOP], [x1, y1, TOP], [x0, y1, TOP]]);
    ctx.clip();
    face(ctx, flapQuad(x1, -1, door), WOOD_L, { lw: 0.04 });
    ctx.restore();
  }
  // The left pillow sliding toward the hole, on the sheet.
  if (pl && pl.slide) pillow(ctx, pl.x, pl.y, pl.z, 1.4, 0.9);
  if (cap && !cap.on && !cap.sunk && !cap.flying && pl && pl.slide) { const [X, Y] = P(cap.x, cap.y, cap.z); nightcap(ctx, X, Y, 0.8, 1, 0.5); }
  // The quilt, on the bed or on its way.
  if (q.k < 0.5) {
    const k = q.k / 0.5;
    quilt(ctx, lerpQuad(QUILT_HOME, QUILT_HOLE, ease(k)), TOP + 0.04, 1 - clamp(k * 4));
  } else if (q.k < 1 && door < 0.01) {
    quilt(ctx, QUILT_HOLE, TOP + 0.04);
  }
  blanket(ctx);
}

// The sign on the foot of the bed: it swings every time the bed goes.
function signSwing(tt) {
  let s = 0;
  for (const d of DROPS) {
    const a = tt - d.t;
    if (a > 0 && a < 5) s += Math.sin(a * 6) * Math.exp(-a * 1.1) * 0.35;
  }
  return s;
}
function mindTheBed(ctx, t) {
  const sw = signSwing(loopT(t));
  plane(ctx, 3.05, BY1 - 0.06, RAIL, 4.05, BY1 - 0.06, (g) => {
    g.rotate(sw);
    g.strokeStyle = BRASS_D;
    g.lineWidth = 0.035;
    g.beginPath();
    g.moveTo(-0.3, 0); g.lineTo(-0.2, 0.36);
    g.moveTo(0.3, 0); g.lineTo(0.2, 0.36);
    g.stroke();
    g.translate(0, 0.78);
    g.beginPath();
    g.arc(0, 0, 0.42, 0, Math.PI * 2);
    paint(g, INK.oxblood, { lw: 0.04 });
    g.beginPath();
    g.arc(0, 0, 0.27, 0, Math.PI * 2);
    paint(g, BONE, { stroke: false });
    g.beginPath();
    g.rect(-0.6, -0.1, 1.2, 0.2);
    paint(g, INK.stormNavy, { lw: 0.03 });
    if (Q.detail) words(g, 'MIND THE BED', 0, 0.005, 0.12, BONE, { font: DISPLAY });
  });
}

// ---------- The cat ----------
function cat(ctx, p, t, glowOnly = false) {
  const [X, Y] = P(p.x, p.y, p.z);
  const f = p.dir === 'l' ? -1 : 1;
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(f, 1);
  const eye = (ex, ey, open) => {
    if (open < 0.2) {
      ctx.beginPath();
      ctx.moveTo(ex - 0.035, ey); ctx.quadraticCurveTo(ex, ey + 0.025, ex + 0.035, ey);
      ctx.strokeStyle = BONE; ctx.lineWidth = 0.02; ctx.stroke();
      return;
    }
    ctx.beginPath();
    ctx.ellipse(ex, ey, 0.04, 0.035 * open, 0, 0, Math.PI * 2);
    ctx.fillStyle = INK.candleGold;
    ctx.fill();
    ctx.fillStyle = C.black;
    ctx.fillRect(ex - 0.008, ey - 0.03 * open, 0.016, 0.06 * open);
  };
  const ears = (hx, hy, back = 0) => {
    ctx.beginPath();
    ctx.moveTo(hx - 0.14, hy - 0.08); ctx.lineTo(hx - 0.1 - back, hy - 0.27 + back * 0.5); ctx.lineTo(hx - 0.01, hy - 0.14);
    ctx.moveTo(hx + 0.02, hy - 0.15); ctx.lineTo(hx + 0.1 - back, hy - 0.28 + back * 0.5); ctx.lineTo(hx + 0.15, hy - 0.08);
    paint(ctx, CAT, { lw: 0.03 });
  };
  if (glowOnly) {
    eye(0.4, -0.46, 1);
    eye(0.48, -0.46, 1);
    ctx.restore();
    return;
  }
  if (Q.detail && p.z < 0.05) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.36, 0.13, 0, 0, Math.PI * 2);
    ctx.fillStyle = alpha(C.ink, 0.2);
    ctx.fill();
  }
  if (p.pose === 'sleep' || p.pose === 'wake') {
    const br = 1 + Math.sin(t * 2.3) * (p.pose === 'sleep' ? 0.04 : 0.015);
    // tail wrapped round
    ctx.beginPath();
    ctx.moveTo(-0.34, -0.12);
    ctx.quadraticCurveTo(-0.44, 0.06, -0.05, 0.04);
    ctx.quadraticCurveTo(0.2, 0.03, 0.3, -0.03);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.13; ctx.lineCap = 'round'; ctx.stroke();
    ctx.strokeStyle = CAT; ctx.lineWidth = 0.08; ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(-0.04, -0.19, 0.4, 0.2 * br, 0, 0, Math.PI * 2);
    paint(ctx, CAT, { lw: 0.04 });
    const up = p.pose === 'wake';
    const hx = up ? 0.36 : 0.3, hy = up ? -0.44 : -0.24;
    ears(hx, hy, up ? 0 : 0.04);
    ctx.beginPath();
    ctx.arc(hx, hy, 0.16, 0, Math.PI * 2);
    paint(ctx, CAT, { lw: 0.04 });
    if (up) {
      const blink = hash(Math.floor(t * 1.3), 7) > 0.85 ? 0.1 : 1;
      eye(hx + 0.04, hy - 0.02, blink);
      eye(hx + 0.12, hy - 0.02, blink);
    } else {
      eye(hx + 0.04, hy, 0);
      eye(hx + 0.12, hy, 0);
    }
    ctx.beginPath();
    ctx.moveTo(hx + 0.08, hy + 0.08); ctx.lineTo(hx + 0.14, hy + 0.12);
    ctx.strokeStyle = BONE; ctx.lineWidth = 0.02; ctx.stroke();
  } else if (p.pose === 'sit' || p.pose === 'arch') {
    const arch = p.pose === 'arch';
    const sw = Math.sin(t * (arch ? 9 : 2.2));
    // tail
    ctx.beginPath();
    if (arch) { ctx.moveTo(-0.2, -0.45); ctx.quadraticCurveTo(-0.45 + sw * 0.03, -0.8, -0.3, -1.05); }
    else { ctx.moveTo(-0.15, -0.05); ctx.quadraticCurveTo(-0.45, 0.02, -0.5 + sw * 0.08, -0.25 + sw * 0.05); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = arch ? 0.2 : 0.13; ctx.lineCap = 'round'; ctx.stroke();
    ctx.strokeStyle = CAT; ctx.lineWidth = arch ? 0.14 : 0.08; ctx.stroke();
    if (arch) {
      // back up, fur on end, legs stiff
      limb(ctx, [[-0.22, -0.3], [-0.24, 0]], CAT, 0.07);
      limb(ctx, [[0.2, -0.3], [0.24, 0]], CAT, 0.07);
      ctx.beginPath();
      ctx.moveTo(-0.3, -0.3);
      ctx.quadraticCurveTo(-0.05, -0.95, 0.3, -0.32);
      ctx.quadraticCurveTo(0, -0.18, -0.3, -0.3);
      paint(ctx, CAT, { lw: 0.04 });
      if (Q.detail) {
        ctx.beginPath();
        for (let i = 0; i < 7; i++) {
          const a = Math.PI * (0.15 + i * 0.1), cx = Math.cos(a) * -0.3, cy = -0.55 - Math.sin(a) * 0.12;
          ctx.moveTo(cx, cy); ctx.lineTo(cx * 1.15, cy - 0.12);
        }
        ctx.strokeStyle = CAT; ctx.lineWidth = 0.03; ctx.stroke();
      }
      ears(0.36, -0.46, 0.05);
      ctx.beginPath();
      ctx.arc(0.36, -0.46, 0.15, 0, Math.PI * 2);
      paint(ctx, CAT, { lw: 0.04 });
      eye(0.4, -0.5, 1.2);
      eye(0.48, -0.5, 1.2);
      ctx.beginPath();
      ctx.ellipse(0.46, -0.38, 0.04, 0.03, 0, 0, Math.PI * 2);
      ctx.fillStyle = INK.oxblood; ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(0, -0.3, 0.22, 0.3, 0, 0, Math.PI * 2);
      paint(ctx, CAT, { lw: 0.04 });
      ctx.beginPath();
      ctx.ellipse(0.1, -0.32, 0.08, 0.14, 0, 0, Math.PI * 2);
      ctx.fillStyle = BONE; ctx.fill();
      ears(0.06, -0.72);
      ctx.beginPath();
      ctx.arc(0.06, -0.72, 0.17, 0, Math.PI * 2);
      paint(ctx, CAT, { lw: 0.04 });
      const blink = hash(Math.floor(t * 1.1), 3) > 0.86 ? 0.1 : 1;
      eye(0.1, -0.74, blink);
      eye(0.19, -0.74, blink);
    }
  } else {
    // mid-hop: stretched out
    const tilt = (p.k - 0.5) * 0.9;
    ctx.rotate(tilt);
    ctx.beginPath();
    ctx.moveTo(-0.3, -0.25); ctx.quadraticCurveTo(-0.6, -0.35, -0.7, -0.15);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.13; ctx.lineCap = 'round'; ctx.stroke();
    ctx.strokeStyle = CAT; ctx.lineWidth = 0.08; ctx.stroke();
    limb(ctx, [[0.2, -0.22], [0.42, -0.08]], CAT, 0.07);
    limb(ctx, [[-0.2, -0.22], [-0.42, -0.06]], CAT, 0.07);
    ctx.beginPath();
    ctx.ellipse(0, -0.28, 0.38, 0.14, 0, 0, Math.PI * 2);
    paint(ctx, CAT, { lw: 0.04 });
    ears(0.38, -0.36);
    ctx.beginPath();
    ctx.arc(0.38, -0.36, 0.14, 0, Math.PI * 2);
    paint(ctx, CAT, { lw: 0.04 });
    eye(0.43, -0.38, 1);
    eye(0.5, -0.38, 1);
  }
  ctx.restore();
}

// ---------- The rest of the room ----------
// The bedside table, heaped with his night reading. The diary is one open
// book among several: the one in his handwriting, with a strap and a ribbon.
const NT = { x0: 7.55, y0: 2.62, x1: 9.05, y1: 3.8, z: 1.01 };
const PAGE = shade(PAPER, 0.06); // every page on the table shares one tone, so none of them glows
const NEWS = mix(PAPER, LINEN_S, 0.55);
function bedsideTable(ctx) {
  const { x0, y0, x1, y1 } = NT;
  for (const [lx, ly] of [[x0 + 0.05, y1 - 0.15], [x1 - 0.15, y1 - 0.15], [x1 - 0.15, y0 + 0.05]]) box(ctx, lx, ly, 0, 0.1, 0.1, 0.5, WOOD_D, { flat: true });
  box(ctx, x0, y0, 0.45, x1 - x0, y1 - y0, 0.48, WOOD, { dotsL: WOOD_D });
  box(ctx, x0 - 0.04, y0 - 0.04, 0.93, x1 - x0 + 0.08, y1 - y0 + 0.08, 0.08, WOOD_D);
  for (const [a, b] of [[x0 + 0.1, 8.25], [8.35, x1 - 0.1]]) {
    face(ctx, [[a, y1, 0.55], [b, y1, 0.55], [b, y1, 0.83], [a, y1, 0.83]], WOOD_L, { lw: 0.03 });
    const [kx, ky] = P((a + b) / 2, y1, 0.69);
    ctx.beginPath();
    ctx.arc(kx, ky, 0.045, 0, Math.PI * 2);
    paint(ctx, BRASS, { lw: 0.02 });
  }
  // the lamp's foot
  const [fx, fy] = P(7.95, 2.88, 1.01);
  ctx.beginPath();
  ctx.ellipse(fx, fy, 0.2, 0.1, 0, 0, Math.PI * 2);
  paint(ctx, BRASS, { lw: 0.03 });
  bedsideHeap(ctx);
}
// Straight printed lines (a book, a newspaper): the diary's are wobbly.
function printed(g, x, y, w, n, gap, color = alpha(C.ink, 0.45), lw = 0.008) {
  g.beginPath();
  for (let i = 0; i < n; i++) { g.moveTo(x, y + i * gap); g.lineTo(x + w, y + i * gap); }
  g.strokeStyle = color;
  g.lineWidth = lw;
  g.stroke();
}
// A small card standing up (a birthday card), in the upright plane from (x0, y0) to (x1, y1).
function standingCard(ctx, x0, y0, x1, y1, z, h, color, draw) {
  const w = Math.hypot(x1 - x0, y1 - y0);
  plane(ctx, x0, y0, z + h, x1, y1, (g) => {
    g.beginPath();
    g.rect(0, 0, w, h);
    paint(g, color, { lw: 0.02 });
    if (Q.detail && draw) draw(g, w, h);
  });
}
function bedsideHeap(ctx) {
  const z = NT.z;
  // a letter, under everything at the back
  flat(ctx, 8.2, 2.66, z + 0.002, (g) => {
    g.rotate(0.12);
    g.beginPath();
    g.rect(0, 0, 0.36, 0.24);
    paint(g, PAGE, { lw: 0.018 });
    if (Q.detail) { g.beginPath(); g.moveTo(0, 0); g.lineTo(0.18, 0.12); g.lineTo(0.36, 0); g.strokeStyle = alpha(C.ink, 0.5); g.lineWidth = 0.01; g.stroke(); }
  });
  // a birthday card, standing between the lamp and the books
  standingCard(ctx, 8.14, 2.78, 8.42, 2.78, z, 0.28, mix(PAGE, INK.candleGold, 0.25), (g, w, h) => {
    words(g, '80', w / 2, h * 0.45, 0.13, INK.oxblood, { font: DISPLAY });
  });
  // a stack of books, and his teeth in a glass on top (one short: it's in the soup downstairs)
  const books = [[8.47, 2.7, 0.46, 0.34, LEATHER], [8.5, 2.73, 0.42, 0.3, TARTAN], [8.46, 2.71, 0.44, 0.33, PLUM]];
  books.forEach(([bx, by, w, d, c], i) => {
    box(ctx, bx, by, z + i * 0.075, w, d, 0.07, c, { lw: 0.02 });
    if (Q.detail) line3(ctx, [[bx + 0.03, by + d, z + i * 0.075 + 0.035], [bx + w - 0.03, by + d, z + i * 0.075 + 0.035]], PAGE, 0.03);
  });
  const zs = z + 0.225;
  cylinder(ctx, 8.68, 2.87, zs, 0.1, 0.27, alpha(GLASS, 0.9), { top: alpha(tint(GLASS, 0.4), 0.9) });
  if (Q.detail) {
    const [X, Y] = P(8.68, 2.87, zs + 0.1);
    ctx.beginPath();
    ctx.ellipse(X, Y, 0.09, 0.055, 0, 0, Math.PI * 2);
    ctx.fillStyle = mix(C.pink, INK.oxblood, 0.2);
    ctx.fill();
    ctx.fillStyle = BONE;
    for (let i = 0; i < 5; i++) if (i !== 2) ctx.fillRect(X - 0.078 + i * 0.032, Y - 0.065, 0.025, 0.045);
  }
  // the evening paper, folded, at the front
  flat(ctx, 7.62, 3.12, z + 0.004, (g) => {
    g.rotate(-0.1);
    g.beginPath();
    g.rect(0, 0, 0.6, 0.48);
    paint(g, NEWS, { lw: 0.02 });
    g.fillStyle = alpha(C.ink, 0.75);
    g.fillRect(0.05, 0.05, 0.5, 0.06);
    if (!Q.detail) return;
    words(g, 'THE EVENING QUACK', 0.3, 0.08, 0.04, NEWS, { font: DISPLAY });
    g.fillStyle = alpha(C.ink, 0.35);
    g.fillRect(0.05, 0.15, 0.2, 0.14);
    printed(g, 0.29, 0.16, 0.26, 4, 0.04);
    printed(g, 0.05, 0.34, 0.24, 3, 0.04);
    printed(g, 0.31, 0.34, 0.24, 3, 0.04);
  });
  diary(ctx);
  // the Bible, open at Genesis, where the birds are made (no ribbon, no strap, all print)
  flat(ctx, 8.6, 3.2, z + 0.006, (g) => {
    g.rotate(-0.08);
    g.beginPath();
    g.roundRect(-0.03, -0.03, 0.47, 0.37, 0.03);
    paint(g, mix(C.ink, INK.deepPlum, 0.4), { lw: 0.025 });
    g.beginPath();
    g.rect(0, 0, 0.41, 0.31);
    paint(g, PAGE, { lw: 0.015 });
    g.beginPath();
    g.moveTo(0.205, 0); g.lineTo(0.205, 0.31);
    g.strokeStyle = alpha(C.ink, 0.6); g.lineWidth = 0.012; g.stroke();
    if (!Q.detail) return;
    for (const px of [0.025, 0.105, 0.23, 0.31]) printed(g, px, 0.04, 0.065, 7, 0.035);
    g.fillStyle = INK.oxblood;
    g.fillRect(0.025, 0.03, 0.025, 0.03);
  });
  // his spectacles, left on the Bible
  if (Q.detail) {
    for (const [sx, sy] of [[8.7, 3.36], [8.84, 3.33]]) {
      const [X, Y] = P(sx, sy, z + 0.02);
      ctx.beginPath();
      ctx.ellipse(X, Y, 0.06, 0.035, 0, 0, Math.PI * 2);
      ctx.fillStyle = alpha(tint(GLASS, 0.5), 0.5);
      ctx.fill();
      ctx.strokeStyle = BRASS_D; ctx.lineWidth = 0.018; ctx.stroke();
    }
    line3(ctx, [[8.75, 3.35, z + 0.03], [8.79, 3.34, z + 0.03]], BRASS_D, 0.016);
    line3(ctx, [[8.66, 3.35, z + 0.02], [8.64, 3.24, z + 0.02]], BRASS_D, 0.014);
  }
  // another card, fallen flat at the front corner
  flat(ctx, 7.66, 3.5, z + 0.008, (g) => {
    g.rotate(0.45);
    g.beginPath();
    g.rect(0, 0, 0.22, 0.17);
    paint(g, mix(PAGE, INK.verdigris, 0.3), { lw: 0.015 });
    if (Q.detail) words(g, '80', 0.11, 0.085, 0.08, INK.candleGold, { font: DISPLAY });
  });
}
// The Lord's diary, open at the page (the find). Small, and the only book on
// the table in his handwriting: a leather strap undone and a ribbon marker.
function diary(ctx) {
  const z = NT.z + 0.008;
  flat(ctx, 8.1, 3.22, z, (g) => {
    g.rotate(0.06);
    // the strap, undone, hanging toward you off the front cover, with its buckle
    g.beginPath();
    g.moveTo(0.44, 0.33); g.quadraticCurveTo(0.47, 0.42, 0.42, 0.5); g.lineTo(0.38, 0.49); g.quadraticCurveTo(0.42, 0.42, 0.4, 0.33);
    g.closePath();
    paint(g, mix(INK.oxblood, C.brown, 0.4), { lw: 0.014 });
    // and the little brass lock every diary has, sprung open: the one
    // thing on the table that says "diary" from across the room
    g.beginPath();
    g.arc(0.39, 0.51, 0.05, Math.PI, 0);
    g.strokeStyle = C.ink; g.lineWidth = 0.034; g.stroke();
    g.strokeStyle = BRASS; g.lineWidth = 0.02; g.stroke();
    g.beginPath();
    g.roundRect(0.32, 0.5, 0.14, 0.11, 0.018);
    paint(g, BRASS, { lw: 0.016 });
    g.beginPath();
    g.arc(0.39, 0.54, 0.014, 0, Math.PI * 2);
    g.moveTo(0.385, 0.545); g.lineTo(0.385, 0.58); g.lineTo(0.395, 0.58); g.lineTo(0.395, 0.545);
    g.fillStyle = C.ink; g.fill();
    // the covers
    g.beginPath();
    g.roundRect(-0.025, -0.025, 0.55, 0.39, 0.03);
    paint(g, mix(INK.oxblood, C.brown, 0.4), { lw: 0.025 });
    g.beginPath();
    g.moveTo(0, 0); g.quadraticCurveTo(0.13, -0.02, 0.25, 0.01); g.lineTo(0.25, 0.35); g.quadraticCurveTo(0.13, 0.32, 0, 0.34);
    g.closePath();
    paint(g, PAGE, { lw: 0.014 });
    g.beginPath();
    g.moveTo(0.25, 0.01); g.quadraticCurveTo(0.37, -0.02, 0.5, 0); g.lineTo(0.5, 0.34); g.quadraticCurveTo(0.37, 0.32, 0.25, 0.35);
    g.closePath();
    paint(g, PAGE, { lw: 0.014 });
    // the ribbon marker, out of the gutter at the bottom
    g.beginPath();
    g.moveTo(0.245, 0.33); g.quadraticCurveTo(0.22, 0.42, 0.26, 0.47); g.lineTo(0.285, 0.46); g.quadraticCurveTo(0.25, 0.41, 0.262, 0.33);
    g.closePath();
    g.fillStyle = INK.candleGold; g.fill();
    // the left page: his wobbly hand (at any zoom: the other books are print),
    for (let i = 0; i < 6; i++) scribble(g, 0.03, 0.05 + i * 0.045, 0.19 - (i % 3) * 0.03, 11 + i, alpha(C.ink, 0.7), 0.009);
    if (!Q.detail) return;
    // and a goose in the margin, looking at you
    g.save();
    g.translate(0.19, 0.28);
    g.scale(0.6, 0.6);
    g.beginPath();
    g.ellipse(0, 0.02, 0.06, 0.035, 0, 0, Math.PI * 2);
    g.moveTo(0.04, 0.0); g.quadraticCurveTo(0.07, -0.06, 0.05, -0.1);
    g.strokeStyle = C.ink; g.lineWidth = 0.014; g.stroke();
    g.beginPath();
    g.arc(0.05, -0.105, 0.02, 0, Math.PI * 2);
    g.stroke();
    g.restore();
    // the right page: the line itself, underlined twice
    const lines = ['the goose', 'is looking', 'at me', 'again'];
    lines.forEach((s, i) => words(g, s, 0.375, 0.06 + i * 0.055, 0.042, alpha(C.ink, 0.85), { weight: 700, italic: true }));
    g.strokeStyle = alpha(C.ink, 0.85);
    g.lineWidth = 0.008;
    g.beginPath();
    g.moveTo(0.29, 0.285); g.lineTo(0.47, 0.28);
    g.moveTo(0.3, 0.3); g.lineTo(0.46, 0.297);
    g.stroke();
  });
  // the pen, left beside it
  line3(ctx, [[8.2, 3.68, z + 0.02], [8.48, 3.62, z + 0.02]], C.ink, 0.035);
  line3(ctx, [[8.42, 3.63, z + 0.02], [8.48, 3.62, z + 0.02]], BRASS, 0.035);
}

function slippers(ctx) {
  for (const [x, y] of [[7.45, 4.15], [7.62, 4.5]]) {
    flat(ctx, x, y, 0.02, (g) => {
      g.beginPath();
      g.ellipse(0, 0, 0.28, 0.12, 0.3, 0, Math.PI * 2);
      paint(g, VELVET, { lw: 0.03 });
      g.beginPath();
      g.ellipse(-0.08, -0.02, 0.12, 0.07, 0.3, 0, Math.PI * 2);
      g.fillStyle = shade(VELVET, 0.4);
      g.fill();
    });
    const [X, Y] = P(x + 0.12, y + 0.02, 0.1);
    ctx.fillStyle = BRASS;
    ctx.fillRect(X - 0.03, Y - 0.03, 0.06, 0.06);
  }
}

function basket(ctx) {
  const { x0, y0, x1, y1, h } = BASKET;
  box(ctx, x0, y0, 0, x1 - x0, y1 - y0, h, WICKER, { dotsL: WICKER_D, dens: 0.3 });
  if (Q.detail) {
    ctx.beginPath();
    for (let z = 0.15; z < h; z += 0.16) {
      let a = P(x0, y1, z), b = P(x1, y1, z), c = P(x1, y0, z);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]);
    }
    for (let u = 0.12; u < 1; u += 0.14) {
      let a = P(lerp(x0, x1, u), y1, 0.02), b = P(lerp(x0, x1, u), y1, h);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      a = P(x1, lerp(y0, y1, u), 0.02); b = P(x1, lerp(y0, y1, u), h);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    }
    ctx.strokeStyle = alpha(WICKER_D, 0.6);
    ctx.lineWidth = 0.02;
    ctx.stroke();
  }
  plane(ctx, x0 + 0.08, y1 + 0.01, 0.7, x1, y1 + 0.01, (g) => {
    g.beginPath();
    g.roundRect(0.02, 0, 0.72, 0.22, 0.04);
    paint(g, BRASS, { lw: 0.03 });
    words(g, 'RETURNS', 0.38, 0.115, 0.13, WOOD_D, { font: DISPLAY });
  });
}
function basketLid(ctx, t) {
  const { x0, y0, x1, y1, h } = BASKET;
  const a = lidK(loopT(t)) * 1.3;
  const d = y1 - y0 + 0.06;
  const fy = y0 - 0.03 + d * Math.cos(a), fz = h + d * Math.sin(a);
  face(ctx, [[x0 - 0.03, y0 - 0.03, h], [x1 + 0.03, y0 - 0.03, h], [x1 + 0.03, fy, fz], [x0 - 0.03, fy, fz]], tint(WICKER, 0.1), { dots: WICKER_D, density: 0.15 });
  if (a < 0.05) {
    face(ctx, [[x0 - 0.03, y1 + 0.03, h], [x1 + 0.03, y1 + 0.03, h], [x1 + 0.03, y1 + 0.03, h - 0.1], [x0 - 0.03, y1 + 0.03, h - 0.1]], WICKER_D, { lw: 0.03 });
  }
}

// The goose-proof safe. Its door is drawn separately so it can open.
function safeBody(ctx) {
  box(ctx, 10.92, 0.25, 0, 2.16, 1.42, 0.2, IRON_D, { flat: true });
  box(ctx, 11, 0.3, 0.2, 2, 1.3, 2.0, IRON, { dotsL: IRON_D, top: tint(IRON, 0.08) });
  if (Q.detail) {
    // gold lining on the side, and the maker's name on top
    face(ctx, [[13, 0.45, 0.4], [13, 1.45, 0.4], [13, 1.45, 2.0], [13, 0.45, 2.0]], null, { lw: 0.025, stroke: BRASS });
    flat(ctx, 11.2, 0.55, 2.2, (g) => words(g, 'GOOSE-PROOF', 0.8, 0.4, 0.2, BRASS, { font: DISPLAY }));
  }
  plane(ctx, 11, 1.6, 2.2, 12, 1.6, (g) => {
    g.fillStyle = PIT;
    g.fillRect(0.14, 0.18, 1.72, 1.66);
  });
}
function safeDoor(ctx, k) {
  const a = (k * Math.PI) / 6.2;
  plane(ctx, 11.14, 1.6, 2.02, 11.14 + Math.cos(a), 1.6 + Math.sin(a), (g) => {
    g.beginPath();
    g.rect(0, 0, 1.72, 1.66);
    paint(g, IRON, { lw: 0.04 });
    if (Q.detail) {
      g.strokeStyle = BRASS;
      g.lineWidth = 0.025;
      g.strokeRect(0.1, 0.1, 1.52, 1.46);
      g.strokeRect(0.16, 0.16, 1.4, 1.34);
      words(g, 'GRUBB & SON', 0.86, 0.3, 0.1, BRASS, { weight: 700 });
      words(g, 'BURGLAR & GOOSE PROOF', 0.86, 1.4, 0.075, BRASS, { weight: 700 });
    }
    // the dial, the handle and the keyhole
    g.beginPath();
    g.arc(0.86, 0.78, 0.26, 0, Math.PI * 2);
    paint(g, BRASS, { lw: 0.04 });
    g.beginPath();
    g.arc(0.86, 0.78, 0.16, 0, Math.PI * 2);
    paint(g, BRASS_D, { lw: 0.03 });
    if (Q.detail) {
      g.strokeStyle = C.ink;
      g.lineWidth = 0.015;
      g.beginPath();
      for (let i = 0; i < 12; i++) {
        const an = (i / 12) * Math.PI * 2;
        g.moveTo(0.86 + Math.cos(an) * 0.2, 0.78 + Math.sin(an) * 0.2);
        g.lineTo(0.86 + Math.cos(an) * 0.25, 0.78 + Math.sin(an) * 0.25);
      }
      g.stroke();
    }
    g.beginPath();
    g.rect(1.3, 0.55, 0.08, 0.5);
    paint(g, BRASS, { lw: 0.03 });
    g.beginPath();
    g.ellipse(0.86, 1.18, 0.07, 0.09, 0, 0, Math.PI * 2);
    paint(g, BRASS, { lw: 0.02 });
    g.fillStyle = C.ink;
    g.fillRect(0.845, 1.16, 0.03, 0.08);
    // hinges
    g.beginPath();
    g.rect(-0.05, 0.25, 0.1, 0.22);
    g.rect(-0.05, 1.2, 0.1, 0.22);
    paint(g, BRASS_D, { lw: 0.02 });
  });
}

function washstand(ctx) {
  const x0 = 14.05, x1 = 15.65, y0 = 0.15, y1 = 0.95;
  box(ctx, x0, y0, 0, x1 - x0, y1 - y0, 0.95, WOOD, { dotsL: WOOD_D });
  face(ctx, [[x0 + 0.12, y1, 0.15], [x1 - 0.12, y1, 0.15], [x1 - 0.12, y1, 0.8], [x0 + 0.12, y1, 0.8]], WOOD_L, { lw: 0.03 });
  box(ctx, x0 - 0.05, y0 - 0.05, 0.95, x1 - x0 + 0.1, y1 - y0 + 0.1, 0.1, MAT.marble, { dotsL: MAT.marbleVein });
  cylinder(ctx, 14.75, 0.58, 1.05, 0.34, 0.1, tint(GLASS, 0.3), { top: BONE });
  cylinder(ctx, 14.75, 0.55, 1.1, 0.14, 0.42, BONE, { top: tint(BONE, 0.3) });
  const [X, Y] = P(14.85, 0.62, 1.48);
  ctx.beginPath();
  ctx.moveTo(X, Y); ctx.lineTo(X + 0.18, Y - 0.08); ctx.lineTo(X + 0.06, Y + 0.08);
  paint(ctx, BONE, { lw: 0.03 });
  box(ctx, 15.25, 0.45, 1.05, 0.22, 0.16, 0.06, mix(C.pink, BONE, 0.4), { flat: true });
  // a towel on the side
  face(ctx, [[x1 + 0.02, 0.25, 0.9], [x1 + 0.02, 0.85, 0.9], [x1 + 0.02, 0.85, 0.35], [x1 + 0.02, 0.25, 0.35]], BONE, { lw: 0.03 });
  face(ctx, [[x1 + 0.03, 0.25, 0.5], [x1 + 0.03, 0.85, 0.5], [x1 + 0.03, 0.85, 0.44], [x1 + 0.03, 0.25, 0.44]], INK.oxblood, { stroke: false });
}

// The Lord's goose trap. It's never caught a goose. The mouse likes the bread.
function gooseTrap(ctx) {
  const x0 = 12.3, y0 = 3.85, w = 1.1, d = 0.7;
  box(ctx, x0, y0, 0, w, d, 0.1, WOOD_L, { dotsL: WOOD_D });
  if (Q.detail) flat(ctx, x0, y0 + d - 0.14, 0.101, (g) => words(g, 'GOOSE TRAP', w / 2, 0, 0.1, WOOD_D, { font: DISPLAY }));
  line3(ctx, [[x0 + 0.12, y0 + 0.12, 0.12], [x0 + w - 0.12, y0 + 0.12, 0.12], [x0 + w - 0.12, y0 + 0.5, 0.12], [x0 + 0.12, y0 + 0.5, 0.12], [x0 + 0.12, y0 + 0.12, 0.12]], MAT.silver, 0.05);
  const [cx, cy] = P(x0 + 0.2, y0 + 0.31, 0.16);
  ctx.beginPath();
  for (let i = 0; i < 4; i++) ctx.ellipse(cx + 0.05 + i * 0.05, cy, 0.03, 0.07, 0, 0, Math.PI * 2);
  ctx.strokeStyle = MAT.silver;
  ctx.lineWidth = 0.025;
  ctx.stroke();
  flat(ctx, x0 + 0.62, y0 + 0.31, 0.12, (g) => {
    g.beginPath();
    g.roundRect(-0.17, -0.14, 0.34, 0.28, 0.08);
    paint(g, MAT.oak, { lw: 0.03 });
    g.beginPath();
    g.roundRect(-0.13, -0.1, 0.26, 0.2, 0.05);
    g.fillStyle = MAT.pine;
    g.fill();
  });
}

function chamberPot(ctx) {
  cylinder(ctx, 9.7, 0.62, 0, 0.28, 0.34, BONE, { top: mix(GLASS, INK.stormNavy, 0.3) });
  const [X, Y] = P(9.7, 0.62, 0.34);
  ctx.beginPath();
  ctx.ellipse(X, Y, 0.28 * Math.SQRT2, 0.14 * Math.SQRT2, 0, 0, Math.PI * 2);
  ctx.strokeStyle = BRASS;
  ctx.lineWidth = 0.04;
  ctx.stroke();
  if (Q.detail) words(ctx, 'NOT A HAT', X - 0.05, Y + 0.24, 0.085, INK.oxblood);
}

// The fox, in the Lord's dressing gown, holding a candle for nobody.
function fox(ctx) {
  const [x, y] = FOX;
  box(ctx, x - 0.42, y - 0.42, 0, 0.84, 0.84, 0.14, WOOD, { dotsL: WOOD_D });
  plane(ctx, x - 0.25, y + 0.42, 0.12, x + 0.25, y + 0.42, (g) => {
    g.fillStyle = BRASS;
    g.fillRect(0.05, 0.0, 0.4, 0.1);
    if (Q.detail) words(g, 'VALET', 0.25, 0.05, 0.075, WOOD_D, { font: DISPLAY });
  });
  const [X, Y] = P(x, y, 0.14);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(-1, 1);
  // tail
  ctx.beginPath();
  ctx.moveTo(-0.18, -0.55);
  ctx.quadraticCurveTo(-0.85, -0.7, -0.72, -0.12);
  ctx.quadraticCurveTo(-0.45, -0.1, -0.2, -0.3);
  ctx.closePath();
  paint(ctx, FUR, { dots: FUR_D, density: 0.2, lw: 0.04 });
  ctx.beginPath();
  ctx.moveTo(-0.72, -0.12);
  ctx.quadraticCurveTo(-0.78, -0.32, -0.66, -0.4);
  ctx.quadraticCurveTo(-0.55, -0.2, -0.5, -0.12);
  ctx.closePath();
  paint(ctx, BONE, { lw: 0.03 });
  // slippers
  for (const sx of [-0.12, 0.14]) {
    ctx.beginPath();
    ctx.ellipse(sx + 0.05, -0.04, 0.15, 0.07, 0, 0, Math.PI * 2);
    paint(ctx, VELVET, { lw: 0.03 });
  }
  // far sleeve
  limb(ctx, [[-0.2, -1.42], [-0.3, -1.0], [-0.27, -0.72]], VELVET_D, 0.17);
  // the gown
  ctx.beginPath();
  ctx.moveTo(-0.27, -1.5);
  ctx.lineTo(0.27, -1.5);
  ctx.lineTo(0.42, -0.1);
  ctx.quadraticCurveTo(0.02, -0.02, -0.4, -0.1);
  ctx.closePath();
  paint(ctx, VELVET_D, { dots: shade(VELVET_D, 0.45), density: 0.18, lw: 0.045 });
  // his white chest in the V of the lapels
  ctx.beginPath();
  ctx.moveTo(-0.08, -1.5); ctx.lineTo(0.2, -1.5); ctx.lineTo(0.07, -1.02);
  ctx.closePath();
  paint(ctx, BONE, { lw: 0.03 });
  ctx.strokeStyle = BRASS;
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  ctx.moveTo(-0.12, -1.5); ctx.lineTo(0.07, -0.98); ctx.lineTo(0.24, -1.5);
  ctx.moveTo(0.07, -0.98); ctx.lineTo(0.2, -0.1);
  ctx.stroke();
  // the sash
  ctx.beginPath();
  ctx.moveTo(-0.33, -0.86); ctx.lineTo(0.35, -0.86); ctx.lineTo(0.36, -0.76); ctx.lineTo(-0.34, -0.76);
  ctx.closePath();
  paint(ctx, BRASS, { lw: 0.03 });
  limb(ctx, [[0.14, -0.8], [0.2, -0.45]], BRASS, 0.05);
  limb(ctx, [[0.18, -0.8], [0.3, -0.5]], BRASS, 0.05);
  // near sleeve, bent, holding up the candlestick
  limb(ctx, [[0.2, -1.4], [0.3, -1.02], [0.55, -1.1]], VELVET_D, 0.17);
  ctx.beginPath();
  ctx.arc(0.6, -1.1, 0.08, 0, Math.PI * 2);
  paint(ctx, FUR, { lw: 0.03 });
  ctx.beginPath();
  ctx.rect(0.57, -1.4, 0.07, 0.34);
  paint(ctx, BRASS, { lw: 0.03 });
  ctx.beginPath();
  ctx.ellipse(0.6, -1.4, 0.16, 0.05, 0, 0, Math.PI * 2);
  paint(ctx, BRASS, { lw: 0.03 });
  // the head
  ctx.beginPath();
  ctx.moveTo(-0.14, -1.8); ctx.lineTo(-0.1, -2.12); ctx.lineTo(0.04, -1.9);
  ctx.moveTo(0.02, -1.92); ctx.lineTo(0.12, -2.18); ctx.lineTo(0.2, -1.86);
  paint(ctx, FUR, { lw: 0.035 });
  ctx.beginPath();
  ctx.arc(0.03, -1.76, 0.22, 0, Math.PI * 2);
  paint(ctx, FUR, { dots: FUR_D, density: 0.15, lw: 0.04 });
  ctx.beginPath();
  ctx.moveTo(0.1, -1.86); ctx.lineTo(0.5, -1.72); ctx.lineTo(0.12, -1.6);
  ctx.closePath();
  paint(ctx, FUR, { lw: 0.035 });
  ctx.beginPath();
  ctx.moveTo(-0.12, -1.66); ctx.quadraticCurveTo(0.1, -1.5, 0.44, -1.69); ctx.lineTo(0.12, -1.6);
  ctx.quadraticCurveTo(0, -1.6, -0.12, -1.66);
  paint(ctx, BONE, { lw: 0.03 });
  ctx.beginPath();
  ctx.arc(0.5, -1.72, 0.045, 0, Math.PI * 2);
  ctx.fillStyle = C.black;
  ctx.fill();
  // a glass eye
  ctx.beginPath();
  ctx.arc(0.12, -1.8, 0.05, 0, Math.PI * 2);
  paint(ctx, INK.candleGold, { lw: 0.025 });
  ctx.fillStyle = C.black;
  ctx.fillRect(0.11, -1.83, 0.02, 0.06);
  // and his pipe
  limb(ctx, [[0.34, -1.64], [0.56, -1.6]], WOOD_D, 0.04);
  ctx.beginPath();
  ctx.roundRect(0.52, -1.72, 0.1, 0.14, 0.03);
  paint(ctx, WOOD, { lw: 0.03 });
  ctx.restore();
}
// Where the fox's pipe and candle are, on screen.
const FOX_PIPE = (() => { const [X, Y] = P(FOX[0], FOX[1], 0.14); return [X - 0.57, Y - 1.74]; })();

// The writing desk, buried in birthday post, bills and drafts. The will is
// one handwritten page among them: the only one with a signature line, a
// wax seal and a ribbon.
const DESK_Z = 1.205;
const DESK_PAGE = shade(PAPER, 0.05);
const DESK_PAGE2 = mix(PAPER, LINEN_S, 0.4);
// A loose sheet lying on the desk, turned by rot, with fn drawing on it.
function sheet(ctx, x, y, z, rot, w, h, color, fn) {
  flat(ctx, x, y, z, (g) => {
    g.rotate(rot);
    g.beginPath();
    g.rect(0, 0, w, h);
    paint(g, color, { lw: 0.018 });
    if (Q.detail && fn) fn(g);
  });
}
function desk(ctx) {
  const x0 = 12, y0 = 10.5, x1 = 14, y1 = 11.7;
  for (const [lx, ly] of [[x0 + 0.08, y1 - 0.2], [x1 - 0.2, y1 - 0.2], [x1 - 0.2, y0 + 0.08]]) box(ctx, lx, ly, 0, 0.12, 0.12, 0.95, WOOD_D, { flat: true });
  box(ctx, x0 + 0.05, y0 + 0.05, 0.85, x1 - x0 - 0.1, y1 - y0 - 0.1, 0.24, WOOD, { dotsL: WOOD_D });
  face(ctx, [[x0 + 0.4, y1 - 0.05, 0.9], [x1 - 0.4, y1 - 0.05, 0.9], [x1 - 0.4, y1 - 0.05, 1.05], [x0 + 0.4, y1 - 0.05, 1.05]], WOOD_L, { lw: 0.03 });
  box(ctx, x0 - 0.05, y0 - 0.05, 1.09, x1 - x0 + 0.1, y1 - y0 + 0.1, 0.11, WOOD);
  rect(ctx, x0 + 0.12, y0 + 0.1, x1 - x0 - 0.24, y1 - y0 - 0.2, 1.201, LEATHER, { lw: 0.03 });
  if (Q.detail) rect(ctx, x0 + 0.2, y0 + 0.18, x1 - x0 - 0.4, y1 - y0 - 0.36, 1.202, null, { lw: 0.02, stroke: BRASS });
  // the blotter, with last week's letters on it backwards
  rect(ctx, 12.5, 10.82, 1.05, 0.66, 1.203, mix(GREEN, LINEN_S, 0.25), { lw: 0.02 });
  if (Q.detail) {
    flat(ctx, 12.5, 10.82, 1.204, (g) => {
      for (let i = 0; i < 4; i++) scribble(g, 0.2, 0.4 + i * 0.06, 0.5, 71 + i, alpha(C.ink, 0.22), 0.012);
    });
  }
  for (const [cx, cy] of [[12.5, 10.82], [13.55, 11.48]]) {
    const s = cx < 13 ? 1 : -1;
    face(ctx, [[cx, cy, 1.205], [cx + 0.2 * s, cy, 1.205], [cx, cy + 0.2 * s, 1.205]], LEATHER, { lw: 0.015 });
  }
  // the candlestick's dish
  const [dx, dy] = P(12.35, 10.75, 1.21);
  ctx.beginPath();
  ctx.ellipse(dx, dy, 0.2, 0.1, 0, 0, Math.PI * 2);
  paint(ctx, BRASS, { lw: 0.03 });
  ctx.beginPath();
  ctx.rect(dx - 0.05, dy - 0.12, 0.1, 0.12);
  paint(ctx, BRASS, { lw: 0.02 });
  // birthday cards, standing along the back
  standingCard(ctx, 12.62, 10.6, 12.88, 10.64, DESK_Z, 0.3, mix(DESK_PAGE, INK.verdigris, 0.35), (g, w, h) => {
    words(g, '80', w / 2, h * 0.45, 0.13, INK.candleGold, { font: DISPLAY });
  });
  standingCard(ctx, 12.95, 10.62, 13.2, 10.58, DESK_Z, 0.26, DESK_PAGE, (g, w, h) => {
    words(g, 'Many', w / 2, h * 0.3, 0.045, INK.oxblood, { italic: true });
    words(g, 'happy', w / 2, h * 0.5, 0.045, INK.oxblood, { italic: true });
    words(g, 'returns', w / 2, h * 0.7, 0.045, INK.oxblood, { italic: true });
  });
  standingCard(ctx, 13.26, 10.6, 13.46, 10.7, DESK_Z, 0.24, mix(DESK_PAGE, INK.oxblood, 0.3), (g, w, h) => {
    words(g, '80', w / 2, h * 0.5, 0.1, BONE, { font: DISPLAY });
  });
  // an opened envelope by the candle
  sheet(ctx, 12.14, 10.9, 1.206, -0.2, 0.3, 0.2, DESK_PAGE2, (g) => {
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0.15, 0.1); g.lineTo(0.3, 0);
    g.strokeStyle = alpha(C.ink, 0.5); g.lineWidth = 0.01; g.stroke();
  });
  // a bill from the taxidermist, printed, with a total nobody paid
  sheet(ctx, 12.58, 10.86, 1.208, -0.28, 0.34, 0.46, DESK_PAGE2, (g) => {
    words(g, 'PLUME & SONS', 0.17, 0.05, 0.035, C.ink, { font: DISPLAY });
    words(g, '1 bear, stuffed', 0.03, 0.12, 0.026, C.ink, { align: 'left' });
    printed(g, 0.03, 0.17, 0.2, 5, 0.035);
    printed(g, 0.26, 0.17, 0.05, 5, 0.035);
    g.fillStyle = INK.oxblood;
    g.fillRect(0.2, 0.38, 0.12, 0.025);
  });
  // the new will, half on the blotter
  theWill(ctx);
  // a draft letter, crossed out, over the will's corner
  sheet(ctx, 13.3, 10.8, 1.214, 0.3, 0.3, 0.4, DESK_PAGE, (g) => {
    for (let i = 0; i < 6; i++) scribble(g, 0.04, 0.05 + i * 0.055, 0.22, 81 + i, alpha(C.ink, 0.65), 0.009);
    g.strokeStyle = alpha(C.ink, 0.7); g.lineWidth = 0.012;
    g.beginPath(); g.moveTo(0.03, 0.04); g.lineTo(0.27, 0.34); g.moveTo(0.27, 0.04); g.lineTo(0.03, 0.34); g.stroke();
  });
  // letters, in his cousin's hand, signed off with love (no line, no seal)
  for (let i = 0; i < 3; i++) {
    sheet(ctx, 12.14 + i * 0.05, 11.12 - i * 0.03, 1.206 + i * 0.004, 0.08 - i * 0.12, 0.3, 0.38, i === 1 ? DESK_PAGE2 : DESK_PAGE, i === 2 ? (g) => {
      words(g, 'Dear Barnaby,', 0.03, 0.05, 0.026, C.ink, { italic: true, align: 'left' });
      for (let j = 0; j < 4; j++) scribble(g, 0.03, 0.1 + j * 0.05, 0.24, 91 + j, alpha(C.ink, 0.65), 0.009);
      words(g, 'Love, Mabel', 0.27, 0.33, 0.026, C.ink, { italic: true, align: 'right' });
    } : null);
  }
  // an envelope with a red stamp, and the stick of sealing wax
  sheet(ctx, 13.45, 11.25, 1.212, -0.15, 0.3, 0.2, DESK_PAGE2, (g) => {
    g.fillStyle = INK.oxblood;
    g.fillRect(0.22, 0.03, 0.05, 0.06);
    for (let j = 0; j < 2; j++) scribble(g, 0.06, 0.1 + j * 0.04, 0.14, 101 + j, alpha(C.ink, 0.6), 0.009);
  });
  box(ctx, 13.4, 11.5, 1.205, 0.22, 0.05, 0.05, INK.oxblood, { flat: true, lw: 0.02 });
  // inkpot and a goose quill (he'd have hated that)
  cylinder(ctx, 13.72, 10.78, 1.2, 0.12, 0.16, alpha(GLASS, 0.95), { top: C.ink });
  const [qx, qy] = P(13.72, 10.78, 1.34);
  ctx.save();
  ctx.translate(qx, qy);
  ctx.rotate(-0.55);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-0.14, -0.4, -0.02, -0.82);
  ctx.quadraticCurveTo(0.12, -0.42, 0, 0);
  paint(ctx, C.white, { lw: 0.03 });
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(-0.02, -0.8);
  ctx.strokeStyle = C.greyLight; ctx.lineWidth = 0.02; ctx.stroke();
  ctx.restore();
}
// The new will: Dr. Crane gets the good armchair. A page at its real size,
// told from the letters by the signature line, the seal and the ribbon.
const WILL = { x: 12.88, y: 11.02, rot: 0.12, w: 0.34, h: 0.46 };
function theWill(ctx) {
  sheet(ctx, WILL.x, WILL.y, 1.211, WILL.rot, WILL.w, WILL.h, DESK_PAGE, null);
  flat(ctx, WILL.x, WILL.y, 1.212, (g) => {
    g.rotate(WILL.rot);
    // a heading in his own hand
    scribble(g, 0.08, 0.05, 0.18, 29, alpha(C.ink, 0.85), 0.014);
    if (Q.detail) {
      for (let i = 0; i < 3; i++) scribble(g, 0.03, 0.1 + i * 0.04, 0.28 - (i === 2 ? 0.1 : 0), 31 + i, alpha(C.ink, 0.65), 0.008);
      words(g, 'To Dr. Crane:', 0.17, 0.235, 0.028, C.ink, { italic: true });
      words(g, 'the good armchair.', 0.17, 0.27, 0.028, C.ink, { italic: true });
      scribble(g, 0.03, 0.31, 0.26, 41, alpha(C.ink, 0.65), 0.008);
      // the signature, on its line
      g.beginPath();
      g.moveTo(0.15, 0.41); g.lineTo(0.31, 0.41);
      g.strokeStyle = C.ink; g.lineWidth = 0.008; g.stroke();
      g.beginPath();
      g.moveTo(0.16, 0.4); g.bezierCurveTo(0.19, 0.35, 0.21, 0.42, 0.24, 0.38); g.quadraticCurveTo(0.27, 0.36, 0.3, 0.4);
      g.lineWidth = 0.009; g.stroke();
    }
    // the ribbon and the wax seal, bottom left
    g.beginPath();
    g.moveTo(0.06, 0.4); g.lineTo(0.03, 0.5); g.moveTo(0.1, 0.4); g.lineTo(0.12, 0.5);
    g.strokeStyle = INK.oxblood; g.lineWidth = 0.022; g.stroke();
    g.beginPath();
    g.arc(0.08, 0.4, 0.045, 0, Math.PI * 2);
    paint(g, INK.oxblood, { lw: 0.014 });
    if (Q.detail) {
      g.beginPath();
      g.arc(0.08, 0.4, 0.025, 0, Math.PI * 2);
      g.strokeStyle = shade(INK.oxblood, 0.35); g.lineWidth = 0.008; g.stroke();
    }
  });
}
function deskChair(ctx) {
  const x0 = 12.6, y0 = 9.5, w = 0.8;
  for (const [lx, ly] of [[x0 + 0.05, y0 + 0.65], [x0 + 0.65, y0 + 0.65], [x0 + 0.65, y0 + 0.05], [x0 + 0.05, y0 + 0.05]]) box(ctx, lx, ly, 0, 0.09, 0.09, 0.78, WOOD_D, { flat: true });
  box(ctx, x0 - 0.02, y0 - 0.02, 0.72, w + 0.04, w + 0.04, 0.1, WOOD);
  box(ctx, x0 + 0.02, y0 + 0.02, 0.82, w - 0.04, w - 0.04, 0.12, VELVET, { dotsL: VELVET_D });
  box(ctx, x0 + 0.02, y0 - 0.02, 0.9, 0.08, 0.1, 1.0, WOOD_D, { flat: true });
  box(ctx, x0 + w - 0.1, y0 - 0.02, 0.9, 0.08, 0.1, 1.0, WOOD_D, { flat: true });
  plane(ctx, x0, y0 + 0.03, 1.95, x0 + 1, y0 + 0.03, (g) => {
    g.beginPath();
    g.ellipse(w / 2, 0.32, 0.36, 0.3, 0, 0, Math.PI * 2);
    paint(g, WOOD, { lw: 0.04 });
    g.beginPath();
    g.ellipse(w / 2, 0.32, 0.25, 0.2, 0, 0, Math.PI * 2);
    paint(g, VELVET, { dots: VELVET_D, density: 0.2, lw: 0.03 });
  });
}
function wastebasket(ctx) {
  cylinder(ctx, 14.8, 12.15, 0, 0.3, 0.6, WICKER, { top: shade(WICKER, 0.4) });
  // the old will, crumpled and crossed out
  const [X, Y] = P(14.72, 12.12, 0.62);
  ctx.save();
  ctx.translate(X, Y);
  ctx.rotate(-0.28);
  ctx.beginPath();
  ctx.moveTo(-0.24, 0.05); ctx.lineTo(-0.26, -0.62); ctx.lineTo(0.02, -0.66); ctx.lineTo(0.24, -0.6); ctx.lineTo(0.26, 0.04);
  ctx.closePath();
  paint(ctx, shade(PAPER, 0.06), { lw: 0.03 });
  words(ctx, 'OLD WILL', 0, -0.5, 0.1, C.ink, { font: DISPLAY });
  if (Q.detail) for (let i = 0; i < 3; i++) scribble(ctx, -0.17, -0.36 + i * 0.1, 0.34, 51 + i, alpha(C.ink, 0.6), 0.015);
  ctx.strokeStyle = INK.oxblood;
  ctx.lineWidth = 0.06;
  ctx.beginPath();
  ctx.moveTo(-0.2, -0.58); ctx.lineTo(0.2, -0.06);
  ctx.moveTo(0.2, -0.58); ctx.lineTo(-0.2, -0.06);
  ctx.stroke();
  ctx.restore();
  // and two that missed
  for (const [x, y, sd] of [[15.4, 12.6, 1], [14.25, 12.85, 2]]) {
    const [bx, by] = P(x, y, 0);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, r = 0.13 + hash(sd, i) * 0.06;
      const px = bx + Math.cos(a) * r, py = by - 0.14 + Math.sin(a) * r * 0.85;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    paint(ctx, PAPER, { lw: 0.03 });
    if (Q.detail) {
      ctx.beginPath();
      ctx.moveTo(bx - 0.08, by - 0.18); ctx.lineTo(bx + 0.02, by - 0.12); ctx.lineTo(bx + 0.07, by - 0.2);
      ctx.strokeStyle = LINEN_S; ctx.lineWidth = 0.02; ctx.stroke();
    }
  }
}

// The fireplace, and what's on the mantel.
function fireplace(ctx) {
  const d = 0.55, zm = 1.95;
  face(ctx, [[0.02, 10.25, 0], [0.02, 11.75, 0], [0.02, 11.75, 1.3], [0.02, 10.25, 1.3]], PIT, { lw: 0.03 });
  face(ctx, [[0.02, 10.25, 0], [d, 10.25, 0], [d, 10.25, 1.3], [0.02, 10.25, 1.3]], shade(PIT, 0.2), { lw: 0.03 });
  box(ctx, 0, 9.6, 0, d, 0.65, zm, MAT.marble, { dotsL: MAT.marbleVein, dens: 0.18 });
  box(ctx, 0, 10.25, 1.3, d, 1.5, zm - 1.3, MAT.marble, { dotsL: MAT.marbleVein, dens: 0.18 });
  box(ctx, 0, 11.75, 0, d, 0.65, zm, MAT.marble, { dotsL: MAT.marbleVein, dens: 0.18 });
  box(ctx, 0, 9.45, zm, 0.82, 3.1, 0.16, MAT.marble, { dotsL: MAT.marbleVein, top: tint(MAT.marble, 0.3) });
  if (Q.detail) {
    line3(ctx, [[d, 9.75, 0.3], [d, 9.95, 0.9], [d, 9.85, 1.6]], MAT.marbleVein, 0.02);
    line3(ctx, [[d, 12.05, 0.2], [d, 12.2, 1.1]], MAT.marbleVein, 0.02);
    line3(ctx, [[d, 10.6, 1.5], [d, 11.3, 1.75]], MAT.marbleVein, 0.02);
  }
  // the grate and its coals
  box(ctx, 0.1, 10.5, 0.02, 0.4, 1.0, 0.1, C.ink, { flat: true });
  for (let i = 0; i < 6; i++) {
    const [X, Y] = P(0.25 + (i % 2) * 0.12, 10.62 + i * 0.15, 0.2);
    ctx.beginPath();
    ctx.arc(X, Y, 0.09, 0, Math.PI * 2);
    paint(ctx, i % 2 ? shade(INK.oxblood, 0.2) : C.ink, { lw: 0.02 });
  }
  // the fender, and the irons
  box(ctx, 1.28, 9.85, 0, 0.06, 2.3, 0.26, BRASS, { flat: true });
  box(ctx, d, 9.85, 0, 1.28 - d, 0.06, 0.26, BRASS, { flat: true });
  box(ctx, d, 12.09, 0, 1.28 - d, 0.06, 0.26, BRASS, { flat: true });
  line3(ctx, [[0.95, 12.72, 0], [0.95, 12.72, 1.05]], C.ink, 0.06);
  line3(ctx, [[0.88, 12.66, 1.05], [1.05, 12.8, 0.1]], C.ink, 0.04);
  line3(ctx, [[1.0, 12.62, 1.0], [0.85, 12.86, 0.12]], C.ink, 0.04);
  const [bx, by] = P(0.95, 12.72, 1.08);
  ctx.beginPath();
  ctx.arc(bx, by, 0.06, 0, Math.PI * 2);
  paint(ctx, BRASS, { lw: 0.02 });
  // On the mantel: candlesticks, a stuffed pigeon under a dome, the clock, a photo.
  for (const y of [9.72, 12.28]) {
    const [X, Y] = P(0.32, y, zm + 0.16);
    ctx.beginPath();
    ctx.ellipse(X, Y, 0.13, 0.065, 0, 0, Math.PI * 2);
    paint(ctx, BRASS, { lw: 0.025 });
    ctx.beginPath();
    ctx.rect(X - 0.035, Y - 0.34, 0.07, 0.34);
    paint(ctx, BRASS, { lw: 0.02 });
  }
  const [dX, dY] = P(0.36, 10.35, zm + 0.16);
  ctx.beginPath();
  ctx.ellipse(dX, dY, 0.2, 0.08, 0, 0, Math.PI * 2);
  paint(ctx, WOOD_D, { lw: 0.025 });
  // a pigeon (a relative of the inspector's, stuffed)
  ctx.beginPath();
  ctx.ellipse(dX, dY - 0.16, 0.13, 0.09, 0, 0, Math.PI * 2);
  ctx.arc(dX + 0.1, dY - 0.28, 0.06, 0, Math.PI * 2);
  paint(ctx, C.grey, { lw: 0.02 });
  ctx.beginPath();
  ctx.moveTo(dX + 0.15, dY - 0.29); ctx.lineTo(dX + 0.21, dY - 0.27); ctx.lineTo(dX + 0.15, dY - 0.25);
  ctx.fillStyle = C.ink;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(dX - 0.19, dY);
  ctx.lineTo(dX - 0.19, dY - 0.3);
  ctx.arc(dX, dY - 0.3, 0.19, Math.PI, 0);
  ctx.lineTo(dX + 0.19, dY);
  ctx.fillStyle = alpha(tint(GLASS, 0.5), 0.35);
  ctx.fill();
  ctx.strokeStyle = alpha(C.white, 0.8);
  ctx.lineWidth = 0.025;
  ctx.stroke();
  if (Q.detail) words(ctx, 'PIDGE SR.', dX, dY + 0.03, 0.045, BRASS);
  // the clock's case (its hands are drawn live)
  box(ctx, 0.12, 10.72, zm + 0.16, 0.4, 0.56, 0.5, WOOD, { dotsL: WOOD_D });
  const [cX, cY] = P(0.32, 11.0, zm + 0.66);
  ctx.beginPath();
  ctx.ellipse(cX, cY, 0.2, 0.14, 0, Math.PI, 0);
  paint(ctx, WOOD, { lw: 0.03 });
  plane(ctx, 0.52, 11.0, zm + 0.41, 0.52, 10.0, (g) => {
    g.beginPath();
    g.arc(0, 0, 0.19, 0, Math.PI * 2);
    paint(g, BONE, { lw: 0.03 });
  });
  // a photo from 1974
  plane(ctx, 0.2, 11.85, zm + 0.62, 0.2, 10.85, (g) => {
    g.beginPath();
    g.rect(0, 0, 0.36, 0.44);
    paint(g, BRASS, { lw: 0.025 });
    g.fillStyle = mix(INK.bone, INK.candleGold, 0.4);
    g.fillRect(0.05, 0.05, 0.26, 0.34);
    g.fillStyle = WOOD_D;
    g.beginPath();
    g.arc(0.12, 0.2, 0.05, 0, Math.PI * 2);
    g.arc(0.24, 0.2, 0.05, 0, Math.PI * 2);
    g.fill();
    g.fillRect(0.07, 0.25, 0.1, 0.12);
    g.fillRect(0.19, 0.25, 0.1, 0.12);
    if (Q.detail) words(g, '1974', 0.18, 0.1, 0.05, WOOD_D);
  });
}
function clockHands(ctx, t) {
  // The evening on the clock face: a minute a second, midnight at MIDNIGHT.
  const m = (loopT(t) - MIDNIGHT) + 24 * 60;
  const mA = ((m % 60) / 60) * Math.PI * 2, hA = (((m / 60) % 12) / 12) * Math.PI * 2;
  plane(ctx, 0.525, 11.0, 2.36, 0.525, 10.0, (g) => {
    g.strokeStyle = C.ink;
    g.lineCap = 'round';
    g.lineWidth = 0.035;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.sin(hA) * 0.09, -Math.cos(hA) * 0.09); g.stroke();
    g.lineWidth = 0.022;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.sin(mA) * 0.15, -Math.cos(mA) * 0.15); g.stroke();
  });
}
// The fire itself, drawn with the lights so it still burns in the dark.
function flames(ctx, t, k) {
  const tongues = [[10.7, 0.8, 0], [10.95, 1.0, 1], [11.2, 0.9, 2], [11.4, 0.7, 3]];
  for (const [y, h, i] of tongues) {
    const fl = 0.75 + 0.25 * Math.sin(t * (7 + i * 1.7) + i * 2) + 0.1 * hash(i, Math.floor(t * 10));
    const [X, Y] = P(0.3, y, 0.22);
    const hh = h * fl * 0.9;
    for (const [c, s] of [[mix(INK.candleGold, INK.oxblood, 0.45), 1], [INK.candleGold, 0.66], [INK.bone, 0.3]]) {
      ctx.beginPath();
      ctx.moveTo(X - 0.15 * s, Y);
      ctx.quadraticCurveTo(X - 0.17 * s, Y - hh * s * 0.6, X + Math.sin(t * 5 + i) * 0.05, Y - hh * s);
      ctx.quadraticCurveTo(X + 0.17 * s, Y - hh * s * 0.6, X + 0.15 * s, Y);
      ctx.closePath();
      ctx.fillStyle = c;
      ctx.fill();
    }
  }
  if (!Q.detail) return;
  // sparks up the chimney
  for (let i = 0; i < 6; i++) {
    const a = ((t * 0.7 + hash(i, 3)) % 1);
    const [X, Y] = P(0.3, 10.75 + hash(i, 5) * 0.6 + Math.sin(t * 3 + i) * 0.05, 0.4 + a * 0.9);
    ctx.beginPath();
    ctx.arc(X, Y, 0.035 * (1 - a), 0, Math.PI * 2);
    ctx.fillStyle = alpha(INK.candleGold, 1 - a);
    ctx.fill();
  }
}

// His good armchair, which the new will leaves to Dr. Crane. Crane has
// already put his name on it.
function armchair(ctx) {
  const x0 = 0.35, x1 = 1.85, y0 = 8.3, y1 = 9.6;
  for (const [lx, ly] of [[x1 - 0.15, y0 + 0.05], [x1 - 0.15, y1 - 0.15], [x0 + 0.05, y1 - 0.15]]) box(ctx, lx, ly, 0, 0.1, 0.1, 0.32, WOOD_D, { flat: true });
  box(ctx, x0, y0, 0.3, 0.32, y1 - y0, 1.9, GREEN, { dotsL: shade(GREEN, 0.5) });
  box(ctx, x0 + 0.32, y0, 0.3, x1 - x0 - 0.32, 0.24, 0.72, GREEN);
  box(ctx, x0 + 0.32, y0, 1.02, 0.42, 0.2, 1.05, GREEN, { flat: true });
  box(ctx, x0 + 0.3, y0 + 0.22, 0.3, x1 - x0 - 0.3, y1 - y0 - 0.44, 0.34, GREEN, { dotsL: shade(GREEN, 0.5) });
  box(ctx, x0 + 0.34, y0 + 0.25, 0.64, x1 - x0 - 0.38, y1 - y0 - 0.5, 0.16, tint(GREEN, 0.12), { flat: true });
  box(ctx, x0 + 0.32, y1 - 0.2, 1.02, 0.42, 0.2, 1.05, GREEN, { flat: true });
  box(ctx, x0 + 0.32, y1 - 0.24, 0.3, x1 - x0 - 0.32, 0.24, 0.72, GREEN, { dotsL: shade(GREEN, 0.5) });
  plane(ctx, x1 + 0.005, y1 - 0.3, 0.6, x1 + 0.005, y0, (g) => {
    g.beginPath();
    g.rect(0.12, 0, 0.5, 0.16);
    paint(g, BRASS, { lw: 0.02 });
    if (Q.detail) {
      words(g, 'THE GOOD', 0.37, 0.05, 0.05, WOOD_D, { font: DISPLAY });
      words(g, 'ARMCHAIR', 0.37, 0.11, 0.05, WOOD_D, { font: DISPLAY });
    }
  });
  // Dr. Crane's luggage label, tied on already
  const [tX, tY] = P(x1 - 0.1, y1 - 0.02, 0.98);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.02;
  ctx.beginPath();
  ctx.moveTo(tX, tY); ctx.lineTo(tX + 0.12, tY + 0.25);
  ctx.stroke();
  ctx.save();
  ctx.translate(tX + 0.12, tY + 0.25);
  ctx.rotate(0.25);
  ctx.beginPath();
  ctx.moveTo(-0.1, 0); ctx.lineTo(0.1, 0); ctx.lineTo(0.16, 0.08); ctx.lineTo(0.16, 0.36); ctx.lineTo(-0.16, 0.36); ctx.lineTo(-0.16, 0.08);
  ctx.closePath();
  paint(ctx, BONE, { lw: 0.025 });
  if (Q.detail) words(ctx, 'CRANE', 0, 0.22, 0.08, INK.oxblood, { font: DISPLAY });
  ctx.restore();
}

function bench(ctx) {
  const x0 = 2.6, x1 = 6.4, y0 = 8.35, y1 = 9.15;
  for (const [lx, ly] of [[x0 + 0.08, y1 - 0.18], [x1 - 0.18, y1 - 0.18], [x1 - 0.18, y0 + 0.08]]) box(ctx, lx, ly, 0, 0.1, 0.1, 0.6, WOOD_D, { flat: true });
  box(ctx, x0, y0, 0.55, x1 - x0, y1 - y0, 0.14, WOOD, { dotsL: WOOD_D });
  box(ctx, x0 + 0.05, y0 + 0.05, 0.69, x1 - x0 - 0.1, y1 - y0 - 0.1, 0.18, PLUM, { dotsL: shade(PLUM, 0.5), top: tint(PLUM, 0.08) });
  if (Q.detail) {
    ctx.fillStyle = BRASS;
    for (let i = 0; i < 6; i++) { const [X, Y] = P(x0 + 0.4 + i * 0.6, 8.75, 0.875); ctx.fillRect(X - 0.025, Y - 0.025, 0.05, 0.05); }
  }
  // a newspaper, folded to the bit he cared about
  flat(ctx, 4.9, 8.5, 0.875, (g) => {
    g.beginPath();
    g.rect(0, 0, 0.7, 0.5);
    paint(g, tint(PAPER, 0.3), { lw: 0.02 });
    if (Q.detail) {
      words(g, 'GOOSE SIGHTED', 0.35, 0.1, 0.07, C.ink, { font: DISPLAY });
      for (let i = 0; i < 4; i++) scribble(g, 0.06, 0.22 + i * 0.07, 0.58, 61 + i, alpha(C.ink, 0.5), 0.01);
    }
  });
  // his bird book, open at geese, and a closed one under it (printed, no strap)
  box(ctx, 3.1, 8.5, 0.87, 0.5, 0.36, 0.07, TARTAN, { lw: 0.02 });
  flat(ctx, 3.62, 8.46, 0.875, (g) => {
    g.rotate(0.1);
    g.beginPath();
    g.roundRect(-0.025, -0.025, 0.5, 0.36, 0.03);
    paint(g, LEATHER, { lw: 0.022 });
    g.beginPath();
    g.rect(0, 0, 0.45, 0.31);
    paint(g, PAGE, { lw: 0.014 });
    g.beginPath();
    g.moveTo(0.225, 0); g.lineTo(0.225, 0.31);
    g.strokeStyle = alpha(C.ink, 0.6); g.lineWidth = 0.012; g.stroke();
    if (!Q.detail) return;
    // a printed goose, in a neat box, and neat print beside it
    g.strokeStyle = alpha(C.ink, 0.6); g.lineWidth = 0.008;
    g.strokeRect(0.03, 0.04, 0.17, 0.13);
    g.beginPath();
    g.ellipse(0.1, 0.12, 0.045, 0.025, 0, 0, Math.PI * 2);
    g.moveTo(0.135, 0.11); g.quadraticCurveTo(0.15, 0.07, 0.14, 0.06);
    g.stroke();
    printed(g, 0.03, 0.21, 0.17, 3, 0.03);
    printed(g, 0.25, 0.04, 0.17, 8, 0.033);
  });
}

function wardrobe(ctx) {
  const x1 = 1.3, y0 = 13.3, y1 = 15.8;
  box(ctx, 0, y0, 0, x1, y1 - y0, 0.18, WOOD_D, { flat: true });
  box(ctx, 0, y0 + 0.05, 0.18, x1 - 0.05, y1 - y0 - 0.1, 3.72, WOOD, { dotsL: WOOD_D });
  box(ctx, 0, y0 - 0.08, 3.9, x1 + 0.08, y1 - y0 + 0.16, 0.3, WOOD_D);
  plane(ctx, x1 - 0.045, y1 - 0.05, 3.9, x1 - 0.045, y0, (g) => {
    for (const u of [0.1, 1.25]) {
      g.beginPath();
      g.rect(u, 0.25, 1.05, 2.6);
      paint(g, WOOD_L, { lw: 0.03 });
      g.beginPath();
      g.rect(u + 0.14, 0.4, 0.77, 2.3);
      paint(g, u < 1 ? alpha(GLASS, 0.9) : WOOD, { lw: 0.03 });
    }
    // the mirror catches the room's light
    g.strokeStyle = alpha(C.white, 0.7);
    g.lineWidth = 0.06;
    g.beginPath();
    g.moveTo(0.35, 0.7); g.lineTo(0.7, 0.45);
    g.moveTo(0.35, 1.1); g.lineTo(0.85, 0.75);
    g.stroke();
    g.beginPath();
    g.rect(0.1, 2.98, 2.2, 0.62);
    paint(g, WOOD_L, { lw: 0.03 });
    g.fillStyle = BRASS;
    for (const [u, v] of [[1.12, 1.6], [1.38, 1.6], [0.9, 3.29], [1.5, 3.29]]) { g.beginPath(); g.arc(u, v, 0.05, 0, Math.PI * 2); g.fill(); }
  });
  // hatboxes, and a trunk from somewhere in 1974
  cylinder(ctx, 0.65, 14.0, 4.2, 0.42, 0.42, mix(BONE, INK.oxblood, 0.15), { top: BONE });
  cylinder(ctx, 0.62, 14.05, 4.62, 0.3, 0.3, PLUM, { top: tint(PLUM, 0.2) });
  box(ctx, 0.1, 14.8, 4.2, 1.0, 0.85, 0.5, MAT.oak, { dotsL: WOOD_D });
  if (Q.detail) {
    plane(ctx, 1.101, 15.6, 4.62, 1.101, 14.6, (g) => {
      g.beginPath();
      g.ellipse(0.4, 0.2, 0.2, 0.12, 0, 0, Math.PI * 2);
      paint(g, BONE, { lw: 0.02 });
      words(g, 'SPAIN 74', 0.4, 0.2, 0.06, INK.oxblood);
    });
  }
}

// A folding screen, with the Lord's long johns thrown over it.
function screen(ctx) {
  const pts = [[2.4, 14.95], [3.25, 14.3], [4.1, 14.95], [5.0, 14.3]];
  for (let i = 0; i < 3; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    face(ctx, [[ax, ay, 0.08], [bx, by, 0.08], [bx, by, 2.1], [ax, ay, 2.1]], WOOD, { lw: 0.045 });
    plane(ctx, ax, ay, 1.98, bx, by, (g) => {
      const w = Math.hypot(bx - ax, by - ay);
      g.beginPath();
      g.rect(0.08, 0.1, w - 0.16, 1.7);
      paint(g, SILK, { dots: shade(SILK, 0.25), density: 0.12, lw: 0.03 });
      if (i === 1 || !Q.detail) return;
      // painted cranes (as in birds; any resemblance to the doctor is unkind)
      g.strokeStyle = C.ink;
      g.lineWidth = 0.025;
      g.beginPath();
      g.ellipse(w / 2, 0.9, 0.16, 0.08, -0.3, 0, Math.PI * 2);
      g.moveTo(w / 2 + 0.12, 0.84); g.quadraticCurveTo(w / 2 + 0.2, 0.6, w / 2 + 0.1, 0.5);
      g.moveTo(w / 2, 0.98); g.lineTo(w / 2 - 0.02, 1.3);
      g.moveTo(w / 2 + 0.05, 0.98); g.lineTo(w / 2 + 0.06, 1.3);
      g.stroke();
      g.fillStyle = INK.oxblood;
      g.beginPath(); g.arc(w / 2 + 0.1, 0.5, 0.04, 0, Math.PI * 2); g.fill();
      g.strokeStyle = alpha(INK.verdigris, 0.8);
      g.lineWidth = 0.02;
      g.beginPath();
      for (let k = 0; k < 4; k++) { g.moveTo(0.15 + k * 0.1, 1.72); g.quadraticCurveTo(0.2 + k * 0.1, 1.4, 0.12 + k * 0.12, 1.2); }
      g.stroke();
    });
  }
  // long johns, over the middle panel
  plane(ctx, 3.25, 14.3, 2.12, 4.1, 14.95, (g) => {
    g.beginPath();
    g.moveTo(0.18, 0); g.lineTo(0.72, 0); g.lineTo(0.7, 0.55);
    g.lineTo(0.62, 1.05); g.lineTo(0.5, 1.05); g.lineTo(0.46, 0.6);
    g.lineTo(0.42, 0.6); g.lineTo(0.38, 1.0); g.lineTo(0.26, 1.0); g.lineTo(0.2, 0.55);
    g.closePath();
    paint(g, VELVET, { dots: VELVET_D, density: 0.2, lw: 0.035 });
    g.beginPath();
    g.rect(0.34, 0.12, 0.22, 0.2);
    paint(g, BONE, { lw: 0.02 });
    g.fillStyle = C.ink;
    for (const v of [0.17, 0.27]) { g.beginPath(); g.arc(0.45, v, 0.02, 0, Math.PI * 2); g.fill(); }
  });
}

// The bearskin in front of the fire (the Lord got the bear before the bear
// got into the library).
function bearskin(ctx) {
  flat(ctx, 2.35, 11.0, 0.015, (g) => {
    g.beginPath();
    g.moveTo(-0.9, -0.2);
    g.quadraticCurveTo(-1.25, -0.9, -0.85, -1.2);
    g.quadraticCurveTo(-0.5, -0.8, -0.3, -0.55);
    g.quadraticCurveTo(0.2, -0.75, 0.55, -0.5);
    g.quadraticCurveTo(0.85, -1.05, 1.15, -1.0);
    g.quadraticCurveTo(1.1, -0.55, 0.9, -0.3);
    g.lineTo(1.2, 0);
    g.lineTo(0.9, 0.3);
    g.quadraticCurveTo(1.1, 0.55, 1.15, 1.0);
    g.quadraticCurveTo(0.85, 1.05, 0.55, 0.5);
    g.quadraticCurveTo(0.2, 0.75, -0.3, 0.55);
    g.quadraticCurveTo(-0.5, 0.8, -0.85, 1.2);
    g.quadraticCurveTo(-1.25, 0.9, -0.9, 0.2);
    g.quadraticCurveTo(-1.05, 0, -0.9, -0.2);
    g.closePath();
    paint(g, FUR_D, { dots: shade(FUR_D, 0.4), density: 0.25, lw: 0.04 });
    if (!Q.detail) return;
    g.strokeStyle = BONE;
    g.lineWidth = 0.025;
    g.beginPath();
    for (const [cx, cy, s] of [[-0.9, -1.15, -1], [1.12, -0.98, -1], [1.12, 0.98, 1], [-0.9, 1.15, 1]]) {
      for (let k = -1; k <= 1; k++) { g.moveTo(cx + k * 0.08, cy); g.lineTo(cx + k * 0.1, cy + s * 0.1); }
    }
    g.stroke();
  });
}
function bearHead(ctx) {
  const [X, Y] = P(3.65, 11.0, 0);
  ctx.save();
  ctx.translate(X, Y);
  ctx.beginPath();
  ctx.ellipse(0, -0.28, 0.34, 0.28, 0, 0, Math.PI * 2);
  paint(ctx, FUR_D, { dots: shade(FUR_D, 0.4), density: 0.2, lw: 0.04 });
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * 0.24, -0.5, 0.09, 0, Math.PI * 2);
    paint(ctx, FUR_D, { lw: 0.03 });
  }
  ctx.beginPath();
  ctx.ellipse(0.12, -0.16, 0.2, 0.14, 0.2, 0, Math.PI * 2);
  paint(ctx, mix(FUR_D, INK.candleGold, 0.3), { lw: 0.03 });
  ctx.beginPath();
  ctx.ellipse(0.2, -0.05, 0.12, 0.06, 0.2, 0, Math.PI * 2);
  ctx.fillStyle = INK.oxblood;
  ctx.fill();
  ctx.fillStyle = BONE;
  ctx.beginPath();
  ctx.moveTo(0.1, -0.08); ctx.lineTo(0.13, -0.0); ctx.lineTo(0.16, -0.08);
  ctx.moveTo(0.26, -0.07); ctx.lineTo(0.28, 0.0); ctx.lineTo(0.31, -0.06);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0.26, -0.2, 0.04, 0, Math.PI * 2);
  ctx.fillStyle = C.ink;
  ctx.fill();
  for (const ex of [-0.08, 0.1]) {
    ctx.beginPath();
    ctx.arc(ex, -0.36, 0.045, 0, Math.PI * 2);
    paint(ctx, INK.candleGold, { lw: 0.02 });
  }
  ctx.restore();
}

// The rug in front of the bed.
function bigRug(ctx) {
  const x0 = 1.4, y0 = 8.6, x1 = 10.6, y1 = 14.3;
  const field = mix(INK.bone, INK.oxblood, 0.26), border = INK.oxblood, gold = BRASS;
  rect(ctx, x0, y0, x1 - x0, y1 - y0, 0.01, border, { lw: 0.04 });
  rect(ctx, x0 + 0.25, y0 + 0.25, x1 - x0 - 0.5, y1 - y0 - 0.5, 0.012, gold, { stroke: false });
  rect(ctx, x0 + 0.35, y0 + 0.35, x1 - x0 - 0.7, y1 - y0 - 0.7, 0.014, field, { dots: shade(field, 0.25), density: 0.12, stroke: false });
  // the medallion, and the corners
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const diamond = (x, y, rx, ry, fill) => face(ctx, [[x - rx, y, 0.016], [x, y - ry, 0.016], [x + rx, y, 0.016], [x, y + ry, 0.016]], fill, { lw: 0.03 });
  diamond(cx, cy, 2.4, 1.6, PLUM);
  diamond(cx, cy, 1.5, 1.0, gold);
  diamond(cx, cy, 0.7, 0.45, border);
  for (const [x, y] of [[x0 + 0.35, y0 + 0.35], [x1 - 0.35, y0 + 0.35], [x1 - 0.35, y1 - 0.35], [x0 + 0.35, y1 - 0.35]]) {
    const sx = x < cx ? 1 : -1, sy = y < cy ? 1 : -1;
    face(ctx, [[x, y, 0.016], [x + sx * 1.4, y, 0.016], [x, y + sy * 1.0, 0.016]], PLUM, { lw: 0.03 });
  }
  if (Q.detail) {
    // fringe at the short ends
    ctx.beginPath();
    for (let y = y0 + 0.1; y < y1; y += 0.18) {
      for (const [x, dx] of [[x0, -0.18], [x1, 0.18]]) { const a = P(x, y, 0.01), b = P(x + dx, y, 0.01); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
    }
    ctx.strokeStyle = BONE;
    ctx.lineWidth = 0.03;
    ctx.stroke();
  }
}
function sheepskin(ctx) {
  flat(ctx, 8.25, 5.55, 0.012, (g) => {
    g.beginPath();
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2, r = 1 + 0.08 * Math.sin(i * 2.7);
      const u = Math.cos(a) * 0.85 * r, v = Math.sin(a) * 1.0 * r;
      i ? g.lineTo(u, v) : g.moveTo(u, v);
    }
    g.closePath();
    paint(g, BONE, { dots: LINEN_S, density: 0.3, lw: 0.035 });
  });
}

// The Lord's portrait, and the goose he had painted out of it.
const PORTRAIT = { y0: 10.1, w: 1.8, z0: 2.75, h: 2.35 };
function portraitArt(ctx) {
  const { y0, w, z0, h } = PORTRAIT;
  plane(ctx, 0.01, y0 + w, z0 + h, 0.01, y0, (g) => {
    // him: bald, white whiskers, a red coat, a stuffed trout
    g.beginPath();
    g.moveTo(0.18, h); g.lineTo(0.28, 1.2); g.quadraticCurveTo(0.6, 1.0, 0.95, 1.2); g.lineTo(1.05, h);
    g.closePath();
    paint(g, INK.oxblood, { lw: 0.03 });
    g.beginPath();
    g.moveTo(0.5, 1.12); g.lineTo(0.62, 1.5); g.lineTo(0.72, 1.12);
    g.fillStyle = BONE;
    g.fill();
    g.beginPath();
    g.arc(0.62, 0.85, 0.24, 0, Math.PI * 2);
    paint(g, mix(INK.bone, INK.oxblood, 0.3), { lw: 0.03 });
    g.fillStyle = BONE;
    g.beginPath();
    g.ellipse(0.4, 0.95, 0.09, 0.16, 0.2, 0, Math.PI * 2);
    g.ellipse(0.84, 0.95, 0.09, 0.16, -0.2, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = C.ink;
    g.fillRect(0.53, 0.8, 0.05, 0.03);
    g.fillRect(0.66, 0.8, 0.05, 0.03);
    g.fillRect(0.56, 1.0, 0.13, 0.02);
    g.beginPath();
    g.ellipse(0.35, 1.75, 0.3, 0.1, -0.3, 0, Math.PI * 2);
    paint(g, INK.verdigris, { lw: 0.02 });
    // the goose that was beside him, painted over (badly)
    g.beginPath();
    g.ellipse(1.35, 1.72, 0.3, 0.2, -0.1, 0, Math.PI * 2);
    g.moveTo(1.52, 1.62);
    g.quadraticCurveTo(1.62, 1.2, 1.5, 0.95);
    g.lineTo(1.4, 0.98);
    g.quadraticCurveTo(1.5, 1.3, 1.4, 1.58);
    g.moveTo(1.6, 0.93);
    g.arc(1.47, 0.93, 0.13, 0, Math.PI * 2);
    g.fillStyle = mix(PORTRAIT_GROUND, INK.oxblood, 0.25);
    g.fill();
  });
}
const PORTRAIT_GROUND = mix(INK.deepPlum, INK.stormNavy, 0.35);
// The goose's one eye that the painter missed, looking about; and in a flash
// of lightning the goose shows right through the paint.
function portraitGoose(ctx, t) {
  const { y0, w, z0, h } = PORTRAIT;
  const f = storm.flash(t);
  plane(ctx, 0.01, y0 + w, z0 + h, 0.01, y0, (g) => {
    if (f > 0.05) {
      g.save();
      g.globalAlpha *= Math.min(1, f * 1.2);
      g.beginPath();
      g.ellipse(1.35, 1.72, 0.3, 0.2, -0.1, 0, Math.PI * 2);
      g.moveTo(1.52, 1.62);
      g.quadraticCurveTo(1.62, 1.2, 1.5, 0.95);
      g.lineTo(1.4, 0.98);
      g.quadraticCurveTo(1.5, 1.3, 1.4, 1.58);
      g.moveTo(1.6, 0.93);
      g.arc(1.47, 0.93, 0.13, 0, Math.PI * 2);
      g.fillStyle = C.white;
      g.fill();
      g.beginPath();
      g.moveTo(1.58, 0.9); g.lineTo(1.78, 0.95); g.lineTo(1.58, 0.99);
      g.fillStyle = C.coral;
      g.fill();
      g.restore();
    }
    if (!Q.detail) return;
    const blink = hash(Math.floor(t * 0.8), 17) > 0.8 ? 0.2 : 1;
    const look = Math.sin(t * 0.7) > 0 ? 0.035 : -0.035;
    g.beginPath();
    g.ellipse(1.5, 0.91, 0.05, 0.045 * blink, 0, 0, Math.PI * 2);
    g.fillStyle = C.white;
    g.fill();
    g.beginPath();
    g.arc(1.5 + look * 0.6, 0.91, 0.022 * blink, 0, Math.PI * 2);
    g.fillStyle = C.ink;
    g.fill();
  });
}

// ---------- Movers ----------
// The mouse: out of its hole to the goose trap for the bread, but only while
// the cat's asleep.
const MOUSE_TRIPS = [1.5, 17.2, 47.4, 76.8, 108.3, 124, 140.3, 155.2, 170.2];
const MOUSE_HOLE = [13.55, 0.2], MOUSE_BREAD = [12.9, 4.35];
function mouseAt(tt) {
  for (const s of MOUSE_TRIPS) {
    const a = tt - s;
    if (a < 0 || a > 8.2) continue;
    const [hx, hy] = MOUSE_HOLE, [bx, by] = MOUSE_BREAD;
    if (a < 1.2) return { x: hx, y: hy + 0.25 * seg(a, 0, 1.2), dir: 'l', peek: true };
    if (a < 3.0) { const k = seg(a, 1.2, 3.0); return { x: lerp(hx, bx, k), y: lerp(hy + 0.25, by, k), dir: 'l', run: true }; }
    if (a < 6.0) return { x: bx, y: by, dir: 'l', nibble: true };
    if (a < 7.8) { const k = seg(a, 6.0, 7.8); return { x: lerp(bx, hx, k), y: lerp(by, hy + 0.25, k), dir: 'r', run: true }; }
    return { x: hx, y: hy + 0.25 * (1 - seg(a, 7.8, 8.2)), dir: 'r' };
  }
  return null;
}
function mouse(ctx, p, t) {
  const [X, Y] = P(p.x, p.y, 0);
  const f = p.dir === 'l' ? -1 : 1;
  const hop = p.run ? Math.abs(Math.sin(t * 22)) * 0.05 : p.nibble ? Math.abs(Math.sin(t * 12)) * 0.02 : 0;
  ctx.save();
  ctx.translate(X, Y - hop);
  ctx.scale(f, 1);
  ctx.beginPath();
  ctx.moveTo(-0.12, -0.04); ctx.quadraticCurveTo(-0.3, 0.02, -0.34, -0.1);
  ctx.strokeStyle = C.pink; ctx.lineWidth = 0.02; ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, -0.07, 0.13, 0.075, 0, 0, Math.PI * 2);
  paint(ctx, C.grey, { lw: 0.025 });
  ctx.beginPath();
  ctx.arc(0.02, -0.14, 0.045, 0, Math.PI * 2);
  paint(ctx, C.greyLight, { lw: 0.02 });
  ctx.fillStyle = C.pink;
  ctx.beginPath(); ctx.arc(0.15, -0.07, 0.018, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.ink;
  ctx.beginPath(); ctx.arc(0.08, -0.09, 0.012, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Anything in the air over the bed has to be drawn after the bed's contents
// and before its front posts; anywhere else, where it is.
const inBed = (x, y) => x > BX0 && x < BX1 && y > BY0 && y < BY1;
const airDepth = (p) => (inBed(p.x, p.y) ? 9.95 : p.x + p.y + 0.3);

export default {
  id: 'master-bedroom',
  name: 'Master Bedroom',
  blurb: 'The four-poster has a trapdoor that keeps dropping open, and the cat always gets off first. His diary says the goose was watching.',

  build(R) {
    // ---------- The room ----------
    R.floor((ctx) => {
      slab(ctx, shade(CARPET, 0.05));
      rect(ctx, 0, 0, R.S, R.S, 0, CARPET, { stroke: false, dots: shade(CARPET, 0.35), density: 0.1 });
      if (!Q.detail) return;
      ctx.beginPath();
      for (let i = 0.8; i < 16; i += 1.6) {
        for (let j = 0.8; j < 16; j += 1.6) {
          [[i - 0.14, j], [i, j - 0.14], [i + 0.14, j], [i, j + 0.14]].forEach(([x, y], k) => {
            const [X, Y] = P(x, y, 0);
            k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
          });
          ctx.closePath();
        }
      }
      ctx.fillStyle = mix(CARPET, INK.candleGold, 0.2);
      ctx.fill();
    });
    R.walls({
      left: WALL_L, right: WALL_R, cap: INK.bone, cut: INK.stormNavy,
      dotsL: shade(WALL_L, 0.2), dotsR: shade(WALL_R, 0.22), densL: 0.1, densR: 0.12,
      doors: DOORS['master-bedroom'] || [],
    });
    R.wall((ctx) => {
      onLeft(ctx, 0, 0, 16, 1.95, WAINSCOT, { stroke: false, dots: shade(WAINSCOT, 0.3), density: 0.12 });
      onRight(ctx, 0, 0, 16, 1.95, shade(WAINSCOT, 0.06), { stroke: false, dots: shade(WAINSCOT, 0.3), density: 0.12 });
      if (!Q.detail) return;
      for (let u = 0.25; u < 15.5; u += 1.55) {
        onLeft(ctx, u, 0.55, 1.25, 1.05, null, { lw: 0.03, stroke: shade(WAINSCOT, 0.35) });
        onRight(ctx, u, 0.55, 1.25, 1.05, null, { lw: 0.03, stroke: shade(WAINSCOT, 0.35) });
      }
    });
    stripes(R, 'left', STRIPE, { z: 1.95, step: 0.7, w: 0.22 });
    stripes(R, 'right', shade(STRIPE, 0.05), { z: 1.95, step: 0.7, w: 0.22 });
    trim(R, 'left', TRIM, { dado: 1.9 });
    trim(R, 'right', TRIM, { dado: 1.9 });
    R.decor((ctx) => {
      onLeft(ctx, 0, 5.6, 16, 0.4, TRIM, { stroke: false });
      onRight(ctx, 0, 5.6, 16, 0.4, TRIM, { stroke: false });
      onLeft(ctx, 0, 5.52, 16, 0.08, BRASS_D, { stroke: false });
      onRight(ctx, 0, 5.52, 16, 0.08, BRASS_D, { stroke: false });
    });

    // ---------- The right wall: windows, the empty trophy, the bell ----------
    stormWindow(R, 'right', 8.8, 1.8, 1.8, 2.8);
    stormWindow(R, 'right', 14, 1.8, 1.5, 2.8);
    R.decor((ctx, t) => {
      // rain running down the glass
      if (!Q.detail) return;
      ctx.beginPath();
      for (const [x0, w, seed] of [[8.8, 1.8, 3], [14, 1.5, 5]]) {
        for (let i = 0; i < 7; i++) {
          const u = x0 + 0.08 + (w - 0.16) * hash(seed, i);
          const k = (t * (0.35 + 0.3 * hash(seed + 3, i)) + hash(seed + 7, i)) % 1;
          const z = 4.55 - k * 2.7;
          const a = P(u, 0, z), b = P(u, 0, z - 0.28);
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
        }
      }
      ctx.strokeStyle = alpha(BONE, 0.5);
      ctx.lineWidth = 0.035;
      ctx.stroke();
    }, { anim: true });
    R.decor((ctx) => {
      for (const [x0, w] of [[8.8, 1.8], [14, 1.5]]) box(ctx, x0 - 0.25, 0, 1.52, w + 0.5, 0.26, 0.12, BONE, { flat: true });
      // the leak: a damp patch under the first window
      if (Q.detail) {
        const [X, Y] = P(9.7, 0, 1.2);
        ctx.beginPath();
        ctx.ellipse(X, Y + 0.3, 0.4, 0.55, 0.45, 0, Math.PI * 2);
        ctx.fillStyle = alpha(shade(WAINSCOT, 0.4), 0.35);
        ctx.fill();
      }
    });
    drapes(R, 'right', 8.8, 1.8, 1.8, 2.8, VELVET);
    R.decor((ctx) => {
      // the second window's drapes (the room ends before a full pair would)
      const z = 1.8, h = 2.8, top = z + h + 0.35;
      for (const [a, b] of [[13.28, 14.1], [15.42, 15.96]]) {
        onRight(ctx, a, z - 0.6, b - a, top - z + 0.6, VELVET, { dots: shade(VELVET, 0.45), density: 0.22 });
        if (Q.detail) {
          for (let k = 1; k < 3; k++) {
            const v = a + ((b - a) * k) / 3;
            face(ctx, [[v, 0, z - 0.6], [v, 0, top]], null, { lw: 0.03, stroke: shade(VELVET, 0.35) });
          }
        }
      }
      onRight(ctx, 13.12, top - 0.1, 2.86, 0.55, shade(VELVET, 0.15));
      onRight(ctx, 13.12, top - 0.18, 2.86, 0.1, BRASS, { stroke: false });
    });
    R.decor((ctx) => {
      // Over the bed: a trophy shield, waiting for its goose.
      plane(ctx, 3.6, 0.01, 5.95, 4.6, 0.01, (g) => {
        g.beginPath();
        g.moveTo(0, 0); g.lineTo(1.8, 0); g.lineTo(1.8, 0.6);
        g.quadraticCurveTo(1.75, 1.05, 0.9, 1.25); g.quadraticCurveTo(0.05, 1.05, 0, 0.6);
        g.closePath();
        paint(g, WOOD, { dots: WOOD_D, density: 0.25, lw: 0.04 });
        g.beginPath();
        g.moveTo(0.15, 0.12); g.lineTo(1.65, 0.12); g.lineTo(1.65, 0.58);
        g.quadraticCurveTo(1.6, 0.95, 0.9, 1.12); g.quadraticCurveTo(0.2, 0.95, 0.15, 0.58);
        g.closePath();
        g.strokeStyle = BRASS;
        g.lineWidth = 0.04;
        g.stroke();
        g.beginPath();
        g.arc(0.9, 0.42, 0.08, 0, Math.PI * 2);
        paint(g, WOOD_D, { lw: 0.03 });
        g.beginPath();
        g.rect(0.45, 0.7, 0.9, 0.26);
        paint(g, BRASS, { lw: 0.03 });
        words(g, 'GOOSE', 0.9, 0.79, 0.13, WOOD_D, { font: DISPLAY });
        if (Q.detail) words(g, 'by Tuesday', 0.9, 0.9, 0.07, WOOD_D);
      });
      // The bell for Jenkins, and what it says under it.
      plane(ctx, 7.05, 0.01, 1.7, 8.05, 0.01, (g) => {
        g.beginPath();
        g.rect(0, 0, 0.62, 0.3);
        paint(g, BRASS, { lw: 0.03 });
        if (Q.detail) {
          words(g, 'RING FOR', 0.31, 0.09, 0.075, WOOD_D, { font: DISPLAY });
          words(g, 'JENKINS', 0.31, 0.2, 0.075, WOOD_D, { font: DISPLAY });
          words(g, '(he won\'t come)', 0.31, 0.42, 0.06, C.ink, { italic: true });
        }
      });
      // the mouse hole, with its own sign
      plane(ctx, 13.4, 0.01, 0.45, 14.4, 0.01, (g) => {
        g.beginPath();
        g.moveTo(0, 0.45); g.lineTo(0, 0.25); g.arc(0.16, 0.25, 0.16, Math.PI, 0); g.lineTo(0.32, 0.45);
        g.closePath();
        paint(g, PIT, { lw: 0.03 });
        if (Q.detail) {
          g.fillStyle = BONE;
          g.fillRect(-0.02, -0.18, 0.36, 0.13);
          words(g, 'NO GEESE', 0.16, -0.115, 0.06, C.ink, { weight: 700 });
        }
      });
    });
    // the bell pull, stirring in the draught
    R.decor((ctx, t) => {
      const sw = Math.sin(t * 1.3) * 0.04 + Math.sin(t * 3.1) * 0.015;
      plane(ctx, 7.35, 0.02, 5.5, 8.35, 0.02, (g) => {
        g.fillStyle = BRASS;
        g.fillRect(-0.08, -0.06, 0.16, 0.1);
        g.save();
        g.rotate(sw);
        g.beginPath();
        g.rect(-0.06, 0, 0.12, 3.35);
        paint(g, VELVET, { dots: BRASS, density: 0.3, lw: 0.025 });
        g.beginPath();
        g.moveTo(-0.08, 3.35); g.lineTo(0.08, 3.35); g.lineTo(0.13, 3.72); g.lineTo(-0.13, 3.72);
        g.closePath();
        paint(g, BRASS, { lw: 0.025 });
        g.restore();
      });
    }, { anim: true });

    // ---------- The left wall: the chimney breast, his portrait, a sampler ----------
    R.decor((ctx) => {
      onLeft(ctx, 9.45, 2.11, 3.1, 3.4, mix(WALL_L, INK.oxblood, 0.08), { lw: 0.03, dots: shade(WALL_L, 0.3), density: 0.1 });
      // a sampler over the armchair
      plane(ctx, 0.01, 9.55, 3.7, 0.01, 8.55, (g) => {
        g.beginPath();
        g.rect(0, 0, 1.2, 0.95);
        paint(g, WOOD, { lw: 0.04 });
        g.beginPath();
        g.rect(0.08, 0.08, 1.04, 0.79);
        paint(g, LINEN, { dots: LINEN_S, density: 0.25, lw: 0.02 });
        g.strokeStyle = INK.oxblood;
        g.lineWidth = 0.03;
        g.setLineDash([0.04, 0.04]);
        g.strokeRect(0.14, 0.14, 0.92, 0.67);
        g.setLineDash([]);
        words(g, 'BEWARE', 0.6, 0.32, 0.15, INK.oxblood, { font: DISPLAY });
        words(g, 'THE GOOSE', 0.6, 0.52, 0.13, INK.verdigris, { font: DISPLAY });
        if (Q.detail) words(g, 'B.G.', 0.6, 0.7, 0.06, C.ink);
      });
    });
    painting(R, 'left', PORTRAIT.y0, PORTRAIT.z0, PORTRAIT.w, PORTRAIT.h, PORTRAIT_GROUND, portraitArt);
    R.decor((ctx) => {
      // WET PAINT, on a card tucked in the frame
      plane(ctx, 0.02, PORTRAIT.y0 + 0.55, PORTRAIT.z0 + 0.05, 0.02, PORTRAIT.y0 - 0.45, (g) => {
        g.rotate(0.12);
        g.beginPath();
        g.rect(0, 0, 0.5, 0.2);
        paint(g, BONE, { lw: 0.02 });
        if (Q.detail) words(g, 'WET PAINT', 0.25, 0.1, 0.07, INK.oxblood, { font: DISPLAY });
      });
    });
    R.decor((ctx, t) => portraitGoose(ctx, t), { anim: true });

    // ---------- On the floor ----------
    R.rug((ctx) => {
      bigRug(ctx);
      sheepskin(ctx);
      rect(ctx, 0.55, 9.75, 0.95, 2.5, 0.012, MAT.stone, { dots: MAT.stoneDark, density: 0.2, lw: 0.03 });
      bearskin(ctx);
      // shadows under the furniture
      face(ctx, [[BX0 - 0.1, BY0 + 0.1, 0.005], [BX1 + 0.25, BY0 + 0.1, 0.005], [BX1 + 0.25, BY1 + 0.25, 0.005], [BX0 - 0.1, BY1 + 0.25, 0.005]], alpha(C.ink, 0.22), { stroke: false });
      shadow(ctx, 12, 1.1, 1.8, 0.8, 0.22);
      shadow(ctx, 13.05, 11.2, 1.7, 0.7, 0.18);
      shadow(ctx, FOX[0], FOX[1], 0.7, 0.32, 0.2);
      shadow(ctx, 9.6, 6.6, 0.8, 0.35, 0.2);
    });

    // ---------- The four-poster ----------
    R.thing(4.5, 2.6, (ctx) => bedBack(ctx), { depth: 4.8 });
    R.thing(4.5, 5.2, (ctx) => bedBody(ctx), { depth: 9.8 });
    R.thing(4.5, 5.3, (ctx, t) => bedding(ctx, t), { depth: 9.9, anim: true });
    R.thing(4.5, 7.9, (ctx) => bedFront(ctx), { depth: 10.5 });
    R.thing(3.05, 8.0, (ctx, t) => mindTheBed(ctx, t), { depth: 10.55, anim: true });

    // The cat, who always knows.
    R.mover((t) => catAt(loopT(t)), (ctx, t, p) => cat(ctx, p, t), { depth: (t) => { const p = catAt(loopT(t)); return p.z > 0.9 && inBed(p.x, p.y) ? 10.9 : p.x + p.y + 0.2; } });
    // The pillow, coming back out of the RETURNS basket.
    R.mover((t) => pillowL(loopT(t)) || { x: -1e4, y: -1e4 }, (ctx, t, p) => {
      if (!p.flying) return;
      ctx.save();
      if (p.z < BASKET.h + 0.2) clipAbove(ctx, BASKET.x0, BASKET.y0, BASKET.x1, BASKET.y1, BASKET.h);
      flyingPillow(ctx, p.x, p.y, p.z, p.spin);
      ctx.restore();
    }, { depth: (t) => { const p = pillowL(loopT(t)); return p ? airDepth(p) : 0; } });
    // The nightcap, flicked back up onto its pillow.
    R.mover((t) => capAt(loopT(t)) || { x: -1e4, y: -1e4 }, (ctx, t, p) => {
      if (!p.flying || loopT(t) < 165.6) return;
      const [X, Y] = P(p.x, p.y, p.z);
      nightcap(ctx, X, Y, 0.8, 1, p.spin * 6);
    }, { depth: () => 9.97 });
    // The empty 1974, into the basket.
    R.mover((t) => bottleAt(loopT(t)) || { x: -1e4, y: -1e4 }, (ctx, t, p) => {
      if (p.x < -100 || seg(loopT(t), 72.3, 73.55) < 0.2) return;
      ctx.save();
      if (p.z < BASKET.h + 0.4) clipAbove(ctx, BASKET.x0, BASKET.y0, BASKET.x1, BASKET.y1, BASKET.h);
      const [X, Y] = P(p.x, p.y, p.z);
      bottle(ctx, X, Y, p.rot);
      ctx.restore();
    }, { depth: (t) => { const p = bottleAt(loopT(t)); return p ? airDepth(p) : 0; } });
    // The bat, twice round the bed.
    R.mover((t) => batAt(loopT(t)) || { x: -1e4, y: -1e4 }, (ctx, t, p) => {
      if (p.x < -100 || p.inHole) return;
      const [X, Y] = P(p.x, p.y, p.z);
      bat(ctx, X, Y, t, 1.5);
    }, { depth: (t) => { const p = batAt(loopT(t)); return p ? airDepth(p) + 0.02 : 0; } });

    // ---------- Around the bed ----------
    R.thing(8.2, 3.2, (ctx) => bedsideTable(ctx), { depth: 10.6 });
    lamp(R, 7.95, 2.88, { z: 1.0, h: 0.8, r: 2.8 });
    R.thing(7.6, 4.4, (ctx) => slippers(ctx));
    R.thing(9.6, 6.6, (ctx) => basket(ctx));
    R.thing(9.61, 6.61, (ctx, t) => basketLid(ctx, t), { anim: true });
    R.thing(4.5, 8.75, (ctx) => bench(ctx));

    // ---------- The safe, the washstand, the trap ----------
    R.thing(12, 1.0, (ctx) => safeBody(ctx));
    R.thing(12, 1.02, (ctx, t) => safeDoor(ctx, safeK(loopT(t))), { anim: true });
    R.thing(14.85, 0.55, (ctx) => washstand(ctx));
    R.thing(12.85, 4.2, (ctx) => gooseTrap(ctx));
    R.mover((t) => mouseAt(loopT(t)) || { x: -1e4, y: -1e4 }, (ctx, t, p) => { if (p.x > -100) mouse(ctx, p, t); });
    R.thing(9.7, 0.62, (ctx) => chamberPot(ctx));
    // the drip from the window into the pot
    R.thing(9.72, 0.64, (ctx, t) => {
      const k = (t % 1.3) / 1.3;
      const z = 1.5 - k * k * 1.2;
      if (k < 0.8) {
        const [X, Y] = P(9.7, 0.35, z);
        ctx.beginPath();
        ctx.ellipse(X, Y, 0.035, 0.06, 0, 0, Math.PI * 2);
        ctx.fillStyle = alpha(tint(GLASS, 0.4), 0.9);
        ctx.fill();
      } else if (Q.detail) {
        const r = (k - 0.8) / 0.2;
        const [X, Y] = P(9.7, 0.55, 0.3);
        ctx.beginPath();
        ctx.ellipse(X, Y, 0.1 + r * 0.25, (0.1 + r * 0.25) * 0.5, 0, 0, Math.PI * 2);
        ctx.strokeStyle = alpha(BONE, 1 - r);
        ctx.lineWidth = 0.025;
        ctx.stroke();
      }
    }, { anim: true });

    // ---------- The fox, the desk, the will ----------
    R.thing(FOX[0], FOX[1], (ctx) => fox(ctx));
    R.thing(13, 9.95, (ctx) => deskChair(ctx));
    R.thing(13, 11.1, (ctx) => desk(ctx));
    R.thing(14.8, 12.15, (ctx) => wastebasket(ctx));

    // ---------- The fireplace side ----------
    R.thing(0.5, 11.0, (ctx) => fireplace(ctx), { depth: 11.6 });
    R.thing(0.52, 11.01, (ctx, t) => clockHands(ctx, t), { depth: 11.62, anim: true });
    R.thing(3.65, 11.0, (ctx) => bearHead(ctx));
    R.thing(1.1, 8.95, (ctx) => armchair(ctx));
    R.thing(0.65, 14.55, (ctx) => wardrobe(ctx));
    R.thing(3.7, 14.9, (ctx) => screen(ctx));

    // ---------- Lights ----------
    candle(R, 12.35, 10.75, 1.33, 51);
    candle(R, 0.32, 9.72, 2.45, 61);
    candle(R, 0.32, 12.28, 2.45, 62);
    // The fox's candle: the point in the room that lands on its paw.
    candle(R, FOX[0] - 0.3, FOX[1] + 0.3, 0.14 + 1.42 / ZK, 71, { r: 1.6 });
    fire(R, 0.6, 11.0, 0.55, 3, 3.6);
    R.light({ at: [0.3, 11, 0.4], r: 0, draw: (ctx, t) => flames(ctx, t) });
    // The safe, in the dark: a glint of gold, and two eyes. Nobody's in there.
    R.light({
      at: [12.4, 1.3, 1.2], r: 1.1, color: INK.candleGold, k: (t) => 0.55 * clamp(safeK(loopT(t))),
      draw: (ctx, t) => {
        const tt = loopT(t);
        if (tt < 86.2 || tt > 91.6) return;
        const blink = (tt > 87.6 && tt < 87.8) || (tt > 89.9 && tt < 90.1) ? 0.15 : 1;
        for (const ex of [0, 0.13]) {
          const [X, Y] = P(12.6 + ex * 0.3, 1.25, 1.35);
          ctx.beginPath();
          ctx.ellipse(X + ex, Y, 0.05, 0.045 * blink, 0, 0, Math.PI * 2);
          ctx.fillStyle = BONE;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(X + ex - 0.01, Y, 0.02 * blink, 0, Math.PI * 2);
          ctx.fillStyle = C.ink;
          ctx.fill();
        }
      },
    });
    // The cat's eyes, while it watches the safe in the dark.
    R.light({
      at: [CAT_BED[0], CAT_BED[1], CAT_Z + 0.4], r: 0,
      draw: (ctx, t) => {
        const p = catAt(loopT(t));
        if (p.watch) cat(ctx, p, t, true);
      },
    });
    R.dark(house.dark);

    // ---------- In the air ----------
    // Dust off the trapdoor, snoring from under the bed, moths round the lamp,
    // and smoke from the fox's pipe.
    R.air((ctx, t) => {
      const tt = loopT(t);
      if (!Q.detail) return;
      for (const d of DROPS) {
        const a = tt - d.t;
        if (a < 0 || a > 0.8) continue;
        for (let i = 0; i < 7; i++) {
          const ang = (i / 7) * Math.PI * 2, r = 0.8 + a * 1.4;
          const [X, Y] = P(HX + Math.cos(ang) * r, HY + Math.sin(ang) * r * 0.8, TOP + 0.2 + a * 0.6);
          ctx.beginPath();
          ctx.arc(X, Y, 0.12 + a * 0.1, 0, Math.PI * 2);
          ctx.fillStyle = alpha(LINEN_S, 0.6 * (1 - a / 0.8));
          ctx.fill();
        }
      }
      if (tt > 42.3 && tt < 45.4) {
        for (let i = 0; i < 3; i++) {
          const k = seg(tt, 42.3 + i * 0.7, 42.3 + i * 0.7 + 1.6);
          if (k <= 0 || k >= 1) continue;
          label(ctx, HX - k * 0.8, HY - k * 0.3, TOP + 0.3 + k * 1.8, 'Z', 0.35 + k * 0.35, alpha(C.ink, 1 - k));
        }
      }
      // moths: round the lamp while it's on, round the desk candle while it isn't
      const m = clamp(seg(tt, 82, 83.5) - seg(tt, 95, 96.5));
      const cx = lerp(7.95, 12.35, ease(m)), cy = lerp(2.88, 10.75, ease(m)), cz = lerp(2.2, 1.9, m);
      for (let i = 0; i < 2; i++) {
        const a = t * (3.1 + i) + i * 2;
        const [X, Y] = P(cx + Math.cos(a) * 0.5, cy + Math.sin(a) * 0.5, cz + Math.sin(a * 1.7) * 0.25);
        const fl = Math.abs(Math.sin(t * 30 + i));
        ctx.beginPath();
        ctx.ellipse(X - 0.05, Y, 0.06, 0.03 + fl * 0.04, -0.5, 0, Math.PI * 2);
        ctx.ellipse(X + 0.05, Y, 0.06, 0.03 + fl * 0.04, 0.5, 0, Math.PI * 2);
        ctx.fillStyle = BONE;
        ctx.fill();
      }
      for (let i = 0; i < 4; i++) {
        const k = (t * 0.35 + i / 4) % 1;
        ctx.beginPath();
        ctx.arc(FOX_PIPE[0] - k * 0.25 + Math.sin(k * 6 + i) * 0.08, FOX_PIPE[1] - k * 1.1, 0.05 + k * 0.1, 0, Math.PI * 2);
        ctx.fillStyle = alpha(BONE, 0.55 * (1 - k));
        ctx.fill();
      }
    });
    // A spider, going up and down on a thread off the canopy.
    R.thing(7.05, 3.35, (ctx, t) => {
      const z = 3.0 + Math.sin(t * 0.6) * 0.45 + Math.max(0, Math.sin(t * 0.21)) * 0.5;
      line3(ctx, [[7.05, 3.35, RAIL], [7.05, 3.35, z]], alpha(BONE, 0.7), 0.015);
      const [X, Y] = P(7.05, 3.35, z);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 0.02;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const s = (i - 1.5) * 0.06;
        ctx.moveTo(X, Y + s); ctx.lineTo(X - 0.14, Y + s * 2 + 0.04);
        ctx.moveTo(X, Y + s); ctx.lineTo(X + 0.14, Y + s * 2 + 0.04);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(X, Y, 0.06, 0.08, 0, 0, Math.PI * 2);
      ctx.fillStyle = C.black;
      ctx.fill();
    }, { depth: 10.3, anim: true });

    // ---------- The finds ----------
    R.find({ id: 'diary', label: "The Lord's diary", at: [8.33, 3.4, 1.03], r: 0.6 });
    R.find({ id: 'new-will', label: 'The new will', at: [13.02, 11.27, 1.22], r: 0.6 });
  },
};
