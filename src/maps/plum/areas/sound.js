// The Sound: Plum Island Sound, behind the refuge (docs/levels/plum.md). At
// low water the flats come out and the clammers walk out onto them, with the
// clam warden checking licences; at high water they're under again and the
// kayaks come out from the launch across from Lot 1. A sailboat ran aground
// at dawn, and its owner is waiting it out on the hull, reading, all day,
// aground or afloat. The mainland's marsh along the back: salt hay on its
// staddles, greenhead traps, an osprey on its pole and somebody's camp.
//
// World units, like land.js. The chunk seams (x 16 and 32, y 16) are kept
// clear of anything wide and tall: the sailboat sits at x 19.4 for that.
import { C, Q, P, SKIN, HAIR, box, disc, face, poly, paint, person, folk, speech, glow, alpha, shade, tint, mix, cylinder, paintText, goose } from '../../../engine/art.js';
import { clamp, pulse } from '../../../engine/actors.js';
import { drawLand, wade } from '../../../engine/terrain.js';
import { land, float, h } from '../land.js';
import { level, lowTide, highTide, nightK, sunsetWatch, at } from '../tide.js';
import { EVENING, INK, LAND, LIT, lightsOn, BRAND } from '../style.js';
import { boat, trap, signpost, board, house, gull, lettering } from '../kit.js';

// ---------- Where things are ----------
const SAIL = [19.4, 21.8]; // the sailboat, aground on the flats south of the channel
const LAUNCH = [40.2, 26.2]; // the refuge's kayak launch, across from Lot 1
const BOOT = [12.0, 23.0]; // right by One Boot's hopping spot
const BOTTLE = [8, 9.4];
const PADDLE = [23, 22.6];
const TOW = [21.8, 20.4]; // the towing sign on its piling, by the sailboat's bow
const SUN0 = at(19.8), SUN1 = at(20.9); // the sunset watch, in loop seconds
const WADERS = shade(C.green, 0.28);
const BOOT_RED = C.coral; // One Boot's boots: the one he's in, and the one in the mud
const FONT = 'Rethink Sans';

// ---------- Little helpers ----------
const lerp = (a, b, k) => a + (b - a) * k;
// The clock keeps running past the loop; the day's walks read loop seconds.
const loopT = (t) => ((t % 360) + 360) % 360;
const dirOf = (dx, dy) => (dx - dy >= 0 ? 'r' : 'l');
const say = (ctx, x, y, z, text, size = 0.44) => { if (Q.detail) speech(ctx, x, y, z, text, { size }); };
// A line between two world points, inked, then colored.
function stick(ctx, a, b, color, w = 0.06) {
  const [x0, y0] = P(...a), [x1, y1] = P(...b);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
  ctx.lineCap = 'round';
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = w + 0.05; ctx.stroke(); }
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
}
// A path round the outline of some world points (their convex hull on screen).
function hull(ctx, pts) {
  const q = pts.map((p) => P(...p)).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for (const p of q) { while (lo.length > 1 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of q.slice().reverse()) { while (hi.length > 1 && cross(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
  const ring = lo.slice(0, -1).concat(hi.slice(0, -1));
  ctx.beginPath(); ring.forEach(([X, Y], i) => (i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y))); ctx.closePath();
}
// Lettering on a plane along x, facing the lower left (kit's lettering()).
const letters = (ctx, x, y, z, text, size, ink = C.ink, font = FONT) => lettering(ctx, 'x', x, y, z, text, size, ink, font);
// Someone drawn standing (or wading, when the water's over their feet).
function body(ctx, x, y, z, look, o, t) {
  const L = level(t);
  const draw = (g) => person(g, x, y, z, { ...look, ...o }, t);
  if (L > z + 0.05) wade(ctx, x, y, z, L, draw); else draw(ctx);
}
// Bent over (a clammer at the rake): the whole figure tipped forward from the feet.
function bent(ctx, x, y, z, look, o, t, lean) {
  const [X, Y] = P(x, y, z), f = o.dir === 'l' ? -1 : 1, L = level(t);
  const draw = (g) => { g.save(); g.translate(X, Y); g.rotate(f * lean); g.translate(-X, -Y); person(g, x, y, z, { ...look, ...o }, t); g.restore(); };
  if (L > z + 0.05) wade(ctx, x, y, z, L, draw); else draw(ctx);
}
// Someone sitting in a kayak: waist up, cut at the deck.
function seated(ctx, x, y, zDeck, look, o, t) {
  const [X, Y] = P(x, y, zDeck + 0.1);
  ctx.save();
  ctx.beginPath(); ctx.rect(X - 3, Y - 4, 6, 4); ctx.clip();
  person(ctx, x, y, zDeck - 0.62, { ...look, pose: 'stand', ...o }, t);
  ctx.restore();
}

// A walk on the clock: from start at t0, steps of { to: [x, y], speed } or
// { wait: s } / { until: t } (with anything else they should say while
// there: dir, back, a tag). Returns (t) => where and what, or null when
// they're not here.
function plan(t0, start, steps, speed = 1.2) {
  const segs = [];
  let t = t0, [x, y] = start, dir = 'r';
  for (const s of steps) {
    if (s.to) {
      const [bx, by] = s.to, dur = Math.hypot(bx - x, by - y) / (s.speed || speed);
      dir = dirOf(bx - x, by - y);
      segs.push({ ...s, t0: t, t1: t + dur, ax: x, ay: y, bx, by, move: true, dir, back: by - y + bx - x < -0.01 });
      t += dur; x = bx; y = by;
    } else {
      const dur = s.until != null ? s.until - t : s.wait;
      segs.push({ dir, back: false, ...s, t0: t, t1: t + dur, ax: x, ay: y, bx: x, by: y, move: false });
      t += dur;
    }
  }
  const fn = (t0) => {
    const tt = loopT(t0);
    for (const g of segs) {
      if (tt < g.t0 || tt >= g.t1) continue;
      const k = (tt - g.t0) / (g.t1 - g.t0);
      return { x: lerp(g.ax, g.bx, k), y: lerp(g.ay, g.by, k), moving: g.move, dir: g.dir, back: g.back, seg: g, k };
    }
    return null;
  };
  fn.end = t;
  return fn;
}
const away = (p) => ({ x: p[0], y: p[1], gone: true });

// ---------- Kayaks ----------
function kayak(ctx, x, y, z, ang, color) {
  const c = Math.cos(ang), s = Math.sin(ang);
  const W = (u, v, zz) => [x + u * c - v * s, y + u * s + v * c, zz];
  const out = [[-1.1, 0], [-0.55, -0.26], [0.55, -0.26], [1.1, 0], [0.55, 0.26], [-0.55, 0.26]];
  face(ctx, out.map(([u, v]) => W(u, v, z + 0.02)), shade(color, 0.3), { lw: 0.04 });
  face(ctx, out.map(([u, v]) => W(u, v, z + 0.2)), color, { lw: 0.04 });
  if (Q.detail) face(ctx, [[-0.32, 0], [-0.2, -0.14], [0.2, -0.14], [0.32, 0], [0.2, 0.14], [-0.2, 0.14]].map(([u, v]) => W(u, v, z + 0.21)), C.ink, { stroke: false });
}
// A double paddle across the kayak, dipping one side then the other.
function paddle(ctx, x, y, zDeck, ang, t, blade, still = false) {
  const c = Math.cos(ang), s = Math.sin(ang), sw = still ? 0 : Math.sin(t * 3.2);
  const u = still ? 0.1 : 0.18 * Math.cos(t * 3.2);
  const a = [x + u * c + 0.95 * s, y + u * s - 0.95 * c, zDeck + (still ? 0.35 : 0.55 + 0.32 * sw)];
  const b = [x + u * c - 0.95 * s, y + u * s + 0.95 * c, zDeck + (still ? 0.35 : 0.55 - 0.32 * sw)];
  stick(ctx, a, b, C.ink, 0.05);
  for (const p of [a, b]) {
    const [X, Y] = P(...p);
    ctx.beginPath(); ctx.ellipse(X, Y, 0.16, 0.08, 0.5, 0, Math.PI * 2);
    paint(ctx, blade, { lw: 0.03 });
  }
}
// A kayaker's afternoon: carry it down from the launch, wait for the water
// (or not), paddle out to a lazy circle, stop for the sunset, come back.
function kayakTrip(o) {
  const [ex, ey] = o.from, [sx, sy] = o.spot;
  const carry = Math.hypot(sx - ex, sy - ey);
  const a1 = o.appear + carry;
  const c0 = [o.center[0] + o.r * Math.cos(o.phase), o.center[1] + o.ry * Math.sin(o.phase)];
  const tc = o.float + Math.hypot(c0[0] - sx, c0[1] - sy) / o.speed;
  const w = (Math.PI * 2) / 40;
  const active = (t) => (t - tc) - Math.max(0, Math.min(t, SUN1) - Math.max(tc, SUN0));
  const onCircle = (t) => {
    const a = o.phase + w * active(t);
    return { x: o.center[0] + o.r * Math.cos(a), y: o.center[1] + o.ry * Math.sin(a), ang: Math.atan2(o.ry * Math.cos(a), -o.r * Math.sin(a)) };
  };
  const pr = onCircle(o.leave), [lx, ly] = o.land;
  const tl = o.leave + Math.hypot(lx - pr.x, ly - pr.y) / o.speed;
  const te = tl + Math.hypot(ex - lx, ey - ly);
  const outAng = Math.atan2(c0[1] - sy, c0[0] - sx);
  return (t0) => {
    const t = loopT(t0);
    if (t < o.appear || t >= te) return { ...away(o.from) };
    if (t < a1) { const k = (t - o.appear) / carry; return { x: lerp(ex, sx, k), y: lerp(ey, sy, k), mode: 'carry', ang: outAng, dir: dirOf(sx - ex, sy - ey), back: true }; }
    if (t < o.float) return { x: sx, y: sy, mode: 'wait', ang: outAng };
    if (t < tc) { const k = (t - o.float) / (tc - o.float); return { x: lerp(sx, c0[0], k), y: lerp(sy, c0[1], k), mode: 'paddle', ang: outAng }; }
    if (t < o.leave) return { ...onCircle(t), mode: sunsetWatch(t) ? 'watch' : 'paddle' };
    if (t < tl) { const k = (t - o.leave) / (tl - o.leave); return { x: lerp(pr.x, lx, k), y: lerp(pr.y, ly, k), mode: 'paddle', ang: Math.atan2(ly - pr.y, lx - pr.x) }; }
    const k = (t - tl) / (te - tl);
    return { x: lerp(lx, ex, k), y: lerp(ly, ey, k), mode: 'carry', ang: Math.PI / 2, dir: dirOf(ex - lx, ey - ly), back: false };
  };
}
// Draw a kayaker from a kayakTrip (or H's) position.
function drawKayaker(ctx, t, p, look, color, blade, extra = {}) {
  if (p.gone) return;
  if (p.mode === 'carry') {
    const z = h(p.x, p.y);
    body(ctx, p.x, p.y, z, look, { pose: 'walk', dir: p.dir, back: p.back, arms: [Math.PI - 0.3, -Math.PI + 0.3] }, t);
    kayak(ctx, p.x, p.y, z + 2.25, p.ang, color);
    return;
  }
  const g = h(p.x, p.y), L = level(t), afloat = L > g;
  const z = (afloat ? L : g) - 0.08 + (afloat ? 0.03 * Math.sin(t * 1.8 + p.x) : 0);
  if (afloat && Q.lines) {
    const [X, Y] = P(p.x, p.y, L);
    ctx.beginPath(); ctx.ellipse(X, Y, 1.5, 0.55, 0, 0, Math.PI * 2);
    ctx.strokeStyle = alpha(C.white, 0.7); ctx.lineWidth = 0.05; ctx.stroke();
  }
  kayak(ctx, p.x, p.y, z, p.ang, color);
  const cx = Math.cos(p.ang), sy = Math.sin(p.ang);
  const watch = p.mode === 'watch' || extra.watch;
  const dir = watch ? 'r' : dirOf(cx, sy), back = watch || cx + sy < -0.05;
  const zd = z + 0.2;
  if (p.mode === 'hands') {
    const s = Math.sin(t * 5);
    seated(ctx, p.x, p.y, zd, look, { dir, back, arms: [1.3 + s * 0.7, 1.3 - s * 0.7] }, t);
    if (Q.detail && afloat) {
      // Splashes where the hands go in.
      ctx.fillStyle = alpha(C.white, 0.9);
      for (const k of [-1, 1]) {
        const ph = (t * 1.6 + (k > 0 ? 0.5 : 0)) % 1;
        const [X, Y] = P(p.x - sy * 0.45 * k, p.y + cx * 0.45 * k, L + ph * 0.5);
        ctx.beginPath(); ctx.arc(X, Y, 0.06 * (1 - ph) + 0.02, 0, Math.PI * 2); ctx.fill();
      }
    }
    return;
  }
  const still = p.mode === 'wait' || watch;
  seated(ctx, p.x, p.y, zd, look, { dir, back, arms: still ? [0.5, 0.5] : [1.25, 1.25] }, t);
  paddle(ctx, p.x, p.y, zd, p.ang, t, blade, still);
}

// ---------- Birds ----------
// A heron or an egret: legs, a body, an S of a neck and a dagger of a bill.
// strike: 0 to 1, the neck shooting out. night: printed as a silhouette.
function wader(ctx, x, y, z, t, o) {
  const [X, Y] = P(x, y, z), f = o.dir === 'l' ? -1 : 1, s = o.scale || 1;
  const col = o.night ? shade(C.night, 0.2) : o.color;
  ctx.save(); ctx.translate(X, Y); ctx.scale(f * s, s);
  ctx.lineCap = 'round';
  ctx.strokeStyle = o.night ? col : o.legs; ctx.lineWidth = 0.05;
  ctx.beginPath(); ctx.moveTo(-0.04, 0); ctx.lineTo(0.02, -0.72); ctx.moveTo(0.1, 0); ctx.lineTo(0.06, -0.72); ctx.stroke();
  // Body: a tipped oval with the tail down behind.
  ctx.beginPath();
  ctx.ellipse(0.02, -0.86, 0.34, 0.15, -0.35, 0, Math.PI * 2);
  ctx.moveTo(-0.26, -0.8); ctx.lineTo(-0.46, -0.66); ctx.lineTo(-0.2, -0.72);
  paint(ctx, col, { lw: 0.04, dots: o.night ? null : o.dots, density: 0.12 });
  // The neck, coiled or striking, then the head and bill.
  const k = o.strike || 0;
  const hx = lerp(0.22, 0.6, k), hy = lerp(-1.5, -1.0, k);
  ctx.beginPath(); ctx.moveTo(0.24, -0.95);
  ctx.bezierCurveTo(lerp(0.05, 0.4, k), -1.1, lerp(0.4, 0.5, k), -1.3, hx, hy);
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.15; ctx.stroke(); }
  ctx.strokeStyle = col; ctx.lineWidth = 0.1; ctx.stroke();
  ctx.beginPath(); ctx.arc(hx, hy, 0.08, 0, Math.PI * 2); paint(ctx, col, { lw: 0.03 });
  ctx.beginPath(); ctx.moveTo(hx + 0.05, hy - 0.04); ctx.lineTo(hx + 0.38, hy + 0.02 + k * 0.08); ctx.lineTo(hx + 0.05, hy + 0.04);
  paint(ctx, o.night ? col : o.bill, { lw: 0.025 });
  if (o.cap && !o.night) { ctx.beginPath(); ctx.moveTo(hx - 0.06, hy - 0.05); ctx.lineTo(hx - 0.3, hy - 0.12); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.035; ctx.stroke(); }
  ctx.restore();
}
// Where a wading bird stands along a line across the channel (at x, from yA
// on the marsh side toward yB in the deep): wherever the water is about
// `depth` deep, smoothed over the last dozen seconds so it walks, not jumps.
function shoreline(x, yA, yB, depth) {
  const n = Math.round(Math.abs(yB - yA) / 0.1), sg = Math.sign(yB - yA);
  const H = Array.from({ length: n + 1 }, (_, i) => h(x, yA + sg * i * 0.1));
  const edge = (L) => { for (let i = 0; i <= n; i++) if (H[i] <= L - depth) return yA + sg * i * 0.1; return yB; };
  return (t) => { let s = 0; for (let k = 0; k < 8; k++) s += edge(level(t - k * 1.6)); return s / 8; };
}
// A bird in flight, wings flapping: an M in the air.
function flier(ctx, x, y, z, t, color, span = 0.5, speed = 7) {
  const [X, Y] = P(x, y, z), fl = Math.sin(t * speed) * 0.2;
  ctx.beginPath();
  ctx.moveTo(X - span, Y - fl); ctx.quadraticCurveTo(X - span * 0.45, Y - 0.2 - fl, X, Y);
  ctx.quadraticCurveTo(X + span * 0.45, Y - 0.2 - fl, X + span, Y - fl);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.13; ctx.stroke(); }
  ctx.strokeStyle = color; ctx.lineWidth = 0.08; ctx.stroke();
}
// ---------- The marsh's own things ----------
// Salt hay stacked on a staddle: a ring of short posts and a haystack on top,
// the way they've dried it on the Great Marsh for three hundred years.
function staddle(ctx, x, y) {
  const z = h(x, y);
  {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      box(ctx, x + Math.cos(a) * 0.62 - 0.06, y + Math.sin(a) * 0.62 - 0.06, z, 0.12, 0.12, 0.5, shade(C.wood, 0.2), { flat: true, lw: 0.03 });
    }
    const hay = mix(C.mustard, C.woodLight, 0.45);
    const [X, Y] = P(x, y, z + 0.5), [, Yt] = P(x, y, z + 2.1);
    ctx.beginPath();
    ctx.moveTo(X - 1.15, Y);
    ctx.bezierCurveTo(X - 1.2, Y - 1.0, X - 0.5, Yt, X, Yt);
    ctx.bezierCurveTo(X + 0.5, Yt, X + 1.2, Y - 1.0, X + 1.15, Y);
    ctx.ellipse(X, Y, 1.15, 0.5, 0, 0, Math.PI);
    paint(ctx, hay, { dots: shade(hay, 0.45), density: 0.18, lw: 0.05 });
    if (Q.detail) {
      ctx.strokeStyle = alpha(shade(hay, 0.4), 0.8); ctx.lineWidth = 0.03; ctx.beginPath();
      for (let k = -2; k <= 2; k++) { ctx.moveTo(X + k * 0.35, Y + 0.3 - Math.abs(k) * 0.08); ctx.quadraticCurveTo(X + k * 0.3, Y - 0.6, X + k * 0.12, Yt + 0.2); }
      ctx.stroke();
    }
  }
}
// Tufts of cordgrass along an edge (still, and cheap once cached). At the
// king tide their tips stick out of the flood, which is true.
function tufts(ctx, pts) {
  {
    if (!Q.detail) return;
    ctx.lineCap = 'round';
    for (const [x, y, n] of pts) {
      const z = h(x, y), [X, Y] = P(x, y, z);
      ctx.beginPath();
      for (let i = 0; i < n; i++) { const dx = (i - (n - 1) / 2) * 0.09; ctx.moveTo(X + dx, Y); ctx.lineTo(X + dx * 2.2 + (i % 2 ? 0.05 : -0.04), Y - 0.35 - (i % 3) * 0.08); }
      ctx.strokeStyle = shade(INK.marsh, 0.35); ctx.lineWidth = 0.05; ctx.stroke();
    }
  }
}
// A sign of several lines on two posts, facing lower left.
function notice(R, x, y, lines, o = {}) {
  const z = h(x, y), w = o.w || 2, lh = o.lh || 0.4, post = o.post || 1.3, n = lines.length;
  const draw = (ctx) => {
    for (const k of [-1, 1]) box(ctx, x + k * (w / 2 - 0.25) - 0.05, y - 0.05, z, 0.1, 0.1, post + n * lh * 0.5, C.wood, { flat: true, lw: 0.03 });
    const top = z + post + n * lh * 0.5;
    board(ctx, 'x', x, y + 0.06, top - (n * lh) / 2, w, n * lh + 0.12, null, { board: o.board || C.white });
    lines.forEach((s, i) => letters(ctx, x, y + 0.06, top - lh * (i + 0.55), s, (o.size || 0.26) * (i === 0 ? 1.15 : 1), i === 0 && o.head ? o.head : o.ink || C.ink, i === 0 ? 'Bagel Fat One' : FONT));
  };
  // (With no R, just the drawing, to fold into another still picture.)
  if (R) R.thing(x + 0.1, y + 0.1, draw);
  return draw;
}

export default {
  id: 'sound',
  name: 'The Sound',
  blurb: 'Clammers on the mud at noon, kayaks on the water by dusk. The sailboat ran aground at dawn, and its owner has not looked up from her book since.',
  describe: 'Wide mud flats behind the refuge, cut by a winding channel, with a grassy islet in the middle. Along the back, the mainland marsh: haystacks on stilts, blue fly traps and a camp on pilings. The tide fills the flats by evening, right up to the refuge road.',
  home: [24, 17],
  build(R) {
    drawLand(R, land, { fade: nightK, inks: EVENING });

    // ================= The mainland's marsh, along the back =================
    for (const [x, y] of [[10, 3.2], [24, 3.6], [38, 4.4]]) trap(R, x, y);
    // The greenheads round the traps, by day: the traps work, a bit.
    for (const [x, y] of [[24, 3.6]]) {
      R.thing(x + 0.9, y + 0.9, (ctx, t) => {
        if (!Q.detail || nightK(t) > 0.5) return;
        ctx.fillStyle = C.ink;
        for (let i = 0; i < 4; i++) {
          const a = t * (3 + i) + i * 1.7;
          const [X, Y] = P(x + Math.cos(a) * 0.7, y + Math.sin(a * 1.3) * 0.6, 2.4 + 0.3 * Math.sin(a * 2));
          ctx.fillRect(X - 0.04, Y - 0.04, 0.08, 0.08);
        }
      }, { anim: true });
    }
    // Cordgrass along the marsh edge (kept clear of the skiff).
    const edgeTufts = (x0, x1) => { const pts = []; for (let x = x0; x < x1; x += 2.3) { if (Math.abs(x - 21) < 1.6) continue; let y = 4; while (y < 7 && h(x, y + 0.3) > 0.38) y += 0.3; pts.push([x, y, 3 + (Math.round(x) % 3)]); } return pts; };
    // The marsh's still things, one picture per chunk (salt hay, the camp's
    // boardwalk, the osprey's pole, the grass), back to front.
    const OS = [44.2, 2.4], OZ = h(...OS) + 4.6;
    const T1 = edgeTufts(9.5, 15.5), T2 = edgeTufts(16.8, 31), T3 = edgeTufts(33.2, 47.5);
    R.thing(15.5, 7, (ctx) => { staddle(ctx, 13, 2.4); tufts(ctx, T1); });
    R.thing(31, 7, (ctx) => { staddle(ctx, 27.4, 2.2); boardwalk(ctx); tufts(ctx, T2); });
    R.thing(47.5, 7, (ctx) => { staddle(ctx, 35.4, 1.8); pole(ctx); tufts(ctx, T3); });
    // Somebody's old gunning camp, up on stilts, with a boardwalk out to the
    // creek and a skiff at the end of it. Its window is lit at night.
    house(R, 19.6, 0.6, 2.2, 1.6, 1, { stilts: 0.9, h: 1.5, ridge: 'x', door: C.coral });
    function boardwalk(ctx) {
      const z = 0.5;
      for (let y = 2.4; y < 4.6; y += 0.7) box(ctx, 20.5, y, z - 0.1, 0.08, 0.08, 0.2, shade(C.wood, 0.25), { flat: true, stroke: false });
      box(ctx, 20.4, 2.2, z, 0.6, 2.5, 0.08, C.woodLight, { flat: true, lw: 0.03 });
      if (Q.detail) { ctx.strokeStyle = shade(C.woodLight, 0.3); ctx.lineWidth = 0.02; ctx.beginPath(); for (let y = 2.5; y < 4.7; y += 0.3) { const [a, b] = P(20.4, y, z + 0.08), [c, d] = P(21, y, z + 0.08); ctx.moveTo(a, b); ctx.lineTo(c, d); } ctx.stroke(); }
      board(ctx, 'x', 20.7, 4.72, z + 0.75, 1.7, 0.36, 'GONE CLAMMING', { size: 0.17, font: FONT, board: C.butter });
      box(ctx, 20.66, 4.62, z, 0.08, 0.08, 0.6, C.wood, { flat: true, lw: 0.03 });
    }
    // (Aground most of the day, a still picture; live once it floats.)
    const skiffAfloat = (t) => level(t) > h(20.9, 5.7);
    const skiff = (ctx, t) => boat(ctx, 20.9, 5.7, t, { along: 'y', len: 1.7, wid: 0.75, color: C.white, stripe: C.teal, bob: skiffAfloat(t) });
    R.thing(21.6, 6, (ctx) => skiff(ctx, 100), { on: (t) => !skiffAfloat(t) });
    R.thing(21.6, 6, skiff, { anim: true, on: skiffAfloat });
    // The osprey's pole, and its nest, on the marsh.
    function pole(ctx) {
      box(ctx, OS[0] - 0.08, OS[1] - 0.08, OZ - 4.6, 0.16, 0.16, 4.6, shade(C.wood, 0.3), { flat: true, lw: 0.035 });
      box(ctx, OS[0] - 0.55, OS[1] - 0.55, OZ, 1.1, 1.1, 0.1, C.wood, { flat: true, lw: 0.03 });
      const [X, Y] = P(OS[0], OS[1], OZ + 0.1);
      ctx.beginPath(); ctx.ellipse(X, Y - 0.1, 0.95, 0.42, 0, 0, Math.PI * 2);
      paint(ctx, mix(C.brown, C.wood, 0.3), { dots: shade(C.brown, 0.4), density: 0.3, lw: 0.04 });
      if (Q.detail) { ctx.strokeStyle = shade(C.brown, 0.2); ctx.lineWidth = 0.04; ctx.beginPath(); for (let i = 0; i < 7; i++) { const a = i * 0.9; ctx.moveTo(X + Math.cos(a) * 0.5, Y - 0.1 + Math.sin(a) * 0.2); ctx.lineTo(X + Math.cos(a) * 1.15, Y - 0.1 + Math.sin(a) * 0.45); } ctx.stroke(); }
    }
    // The osprey: sits on the nest, and every so often goes round the Sound
    // once looking for a fish (and looking at everyone else's).
    const ospreyAt = (t) => {
      const s = ((t % 46) + 46) % 46;
      if (s < 30 || nightK(t) > 0.5) return { x: OS[0] + 0.1, y: OS[1] + 0.1, z: OZ + 0.2, sit: true };
      const a = ((s - 30) / 16) * Math.PI * 2;
      const r = Math.sin(a / 2);
      return { x: OS[0] - 6 * r + Math.sin(a) * -3, y: OS[1] + 7 * r, z: OZ + 1.5 * r + 0.2 };
    };
    R.mover(ospreyAt, (ctx, t, p) => {
      if (p.sit) {
        const [X, Y] = P(p.x, p.y, p.z);
        ctx.beginPath(); ctx.ellipse(X, Y - 0.25, 0.2, 0.3, 0.1, 0, Math.PI * 2); paint(ctx, shade(C.brown, 0.15), { lw: 0.035 });
        ctx.beginPath(); ctx.arc(X + 0.05, Y - 0.6, 0.13, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.03 });
        if (Q.detail) { ctx.fillStyle = C.ink; ctx.fillRect(X + 0.04, Y - 0.63, 0.14, 0.04); ctx.beginPath(); ctx.moveTo(X + 0.16, Y - 0.62); ctx.lineTo(X + 0.26, Y - 0.56); ctx.lineTo(X + 0.15, Y - 0.56); ctx.fill(); }
        return;
      }
      flier(ctx, p.x, p.y, p.z, t, tint(C.brown, 0.15), 0.7, 5);
    }, { bias: 12 });

    // ================= The channel =================
    // Channel markers: a green can and a red nun, leaning with the current.
    for (const [x, y, col, num, nun] of [[9, 18, C.green, '3', false], [26.6, 12, C.red, '4', true]]) {
      R.thing(x + 0.3, y + 0.3, (ctx, t) => {
        const z = float(x, y, t) - 0.1 + 0.05 * Math.sin(t * 1.4 + x), lean = 0.12 * Math.sin(t * 0.7 + y);
        cylinder(ctx, x, y, z, 0.3, 0.95, col, { flat: true });
        if (nun) {
          const [X, Y] = P(x, y, z + 0.95), [Xt, Yt] = P(x + lean, y, z + 1.5);
          ctx.beginPath(); ctx.moveTo(X - 0.42, Y); ctx.lineTo(Xt, Yt); ctx.lineTo(X + 0.42, Y); ctx.ellipse(X, Y, 0.42, 0.21, 0, 0, Math.PI); paint(ctx, col, { lw: 0.04 });
        }
        if (Q.detail) { const [X, Y] = P(x, y + 0.3, z + 0.5); ctx.fillStyle = C.white; ctx.font = '0.4px "Bagel Fat One", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(num, X, Y); }
      }, { anim: true });
    }
    // A heron in the channel, stepping in and out with the water's edge;
    // after dark, a silhouette against the moon on the water.
    const heronY = shoreline(36, 5.4, 13.5, 0.32);
    R.mover((t) => ({ x: 36 + 0.4 * Math.sin(t / 9), y: heronY(t) }), (ctx, t, p) => {
      const z = h(p.x, p.y), L = level(t), night = nightK(t) > 0.55;
      if (night && Q.detail) {
        // The moon's road on the water, just behind it.
        ctx.strokeStyle = alpha(C.butter, 0.55 * nightK(t)); ctx.lineWidth = 0.06; ctx.beginPath();
        for (let i = 0; i < 7; i++) { const w = (0.75 - i * 0.08) * (0.8 + 0.25 * Math.sin(t * 1.3 + i)); const [X, Y] = P(p.x - 0.1 - i * 0.28, p.y - 0.1 - i * 0.28, L); ctx.moveTo(X - w, Y); ctx.lineTo(X + w, Y); }
        ctx.stroke();
      }
      const s = pulse(t, 11), strike = s > 0.9 ? Math.sin(((s - 0.9) / 0.1) * Math.PI) : 0;
      const draw = (g) => wader(g, p.x, p.y, z, t, { color: mix(C.grey, C.navy, 0.25), legs: C.ink, bill: C.mustard, dots: C.navy, cap: true, scale: 1.25, dir: 'l', strike, night });
      if (L > z + 0.02) wade(ctx, p.x, p.y, z, L, draw, 0.3); else draw(ctx);
    });
    // Two egrets, doing the same thing more nervously. They go to roost at dark.
    for (const [x, yA, yB, ph] of [[10.5, 5.6, 13.5, 0], [44.5, 4.8, 16, 3]]) {
      const ey = shoreline(x, yA, yB, 0.22);
      R.mover((t) => ({ x: x + 0.6 * Math.sin(t / 5 + ph), y: ey(t) }), (ctx, t, p) => {
        if (nightK(t) > 0.6) return;
        const z = h(p.x, p.y), L = level(t), s = pulse(t + ph, 6), strike = s > 0.85 ? Math.sin(((s - 0.85) / 0.15) * Math.PI) : 0;
        const draw = (g) => wader(g, p.x, p.y, z, t, { color: C.white, legs: C.ink, bill: C.mustard, dots: C.grey, scale: 0.95, dir: Math.cos(t / 5 + ph) > 0 ? 'r' : 'l', strike });
        if (L > z + 0.02) wade(ctx, p.x, p.y, z, L, draw, 0.25); else draw(ctx);
      });
    }
    // A gull going round and round over the flats, by day.
    const gullAt = (t) => { const a = t / 4; return { x: 22 + Math.cos(a) * 5, y: 17 + Math.sin(a) * 3, z: 5.5 + Math.sin(a * 2) * 0.4 }; };
    R.mover(gullAt, (ctx, t, p) => { if (nightK(t) <= 0.5) flier(ctx, p.x, p.y, p.z, t, C.grey, 0.45, 8); }, { bias: 12 });

    // ================= The sailboat (the running gag) =================
    // Aground at low tide, afloat at high, and its owner on the hull reading
    // through all of it: the tide coming up round her, the warden, the
    // sunset (she looks up for that), and the night, by her reading lamp.
    const owner = folk(52, { top: C.sky, bottom: C.white, hat: 'sun', style: 'long', hair: C.brown });
    const boatZ = (t) => { const g = h(...SAIL), L = level(t); return float(...SAIL, t) - 0.15 + (L > g ? 0.04 * Math.sin(t * 1.7 + SAIL[0]) : 0); };
    const ownerSpot = (t) => [SAIL[0] + 0.95, SAIL[1] + 0.34, boatZ(t) + 0.45 - 0.72];
    // Aground (most of the day) the hull, mast and boom are a still picture
    // and only she, her flag and her mug are live; afloat, all of it is.
    const aground = (t) => level(t) < h(...SAIL) - 0.05;
    // Tap her (the first thing a new player is nudged to try): she looks up.
    const reader = R.poke({ id: 'reader', teach: true, hold: 3, at: (t) => { const [x, y, z] = ownerSpot(t); return [x - 0.6, y, z + 0.9]; }, r: 1.3, sound: 'pop', say: ['Do you mind? Chapter nine.', 'It\'ll float. Shh.', 'No, I don\'t need a tow.'] });
    const sailboat = (ctx, t, part) => {
      const [bx, by] = SAIL, g = h(bx, by), L = level(t), afloat = L > g;
      const z = boatZ(t), deck = z + 0.45;
      const mx = bx + 0.35;
      if (part !== 'top') {
      // The tide coming up round the hull: rings on the water.
      if (L > g - 0.05 && L < g + 0.45 && Q.lines) {
        const [X, Y] = P(bx, by, L), k = pulse(t, 2.5);
        ctx.strokeStyle = alpha(C.white, 0.8 * (1 - k)); ctx.lineWidth = 0.05;
        ctx.beginPath(); ctx.ellipse(X, Y, 2.3 + k * 0.6, 1.0 + k * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
      }
      // The anchor she put out on the mud, for all the good it did.
      if (!afloat) {
        const az = h(bx + 2.8, by + 1.2);
        stick(ctx, [bx + 1.55, by, deck - 0.05], [bx + 2.8, by + 1.2, az + 0.05], C.woodLight, 0.035);
      }
      boat(ctx, bx, by, t, { along: 'x', len: 3.2, wid: 1.2, color: C.white, stripe: C.navy, cabin: tint(C.sky, 0.45), bob: afloat });
      // The boom with its sail rolled up on it, and the mast.
      stick(ctx, [mx, by, deck + 0.95], [bx - 1.35, by, deck + 0.85], C.wood, 0.07);
      if (Q.detail) stick(ctx, [mx - 0.1, by, deck + 1.05], [bx - 1.2, by, deck + 0.95], INK.cream, 0.14);
      box(ctx, mx - 0.05, by - 0.05, deck, 0.1, 0.1, 4.1, C.greyLight, { flat: true, lw: 0.03 });
      }
      if (part === 'hull') return;
      // A flag at half-mast, for the day she's having.
      const fz = deck + 2.2, fl = Math.sin(t * 4) * 0.06;
      face(ctx, [[mx, by, fz + 0.3], [mx, by + 0.55, fz + 0.2 + fl], [mx, by + 0.5, fz + 0.02 + fl], [mx, by, fz]], C.coral, { lw: 0.03 });
      if (Q.detail) face(ctx, [[mx, by + 0.18, fz + 0.28], [mx, by + 0.3, fz + 0.25 + fl * 0.5], [mx, by + 0.3, fz + 0.07 + fl * 0.5], [mx, by + 0.18, fz + 0.03]], C.white, { stroke: false });
      // The masthead light and the reading lamp, on at dusk.
      const on = lightsOn(t);
      disc(ctx, mx, by, deck + 4.12, 0.08, on ? LIT : C.white, { lw: 0.025 });
      if (on) glow(ctx, mx, by, deck + 4.12, 0.9, LIT, nightK(t) * 0.9);
      stick(ctx, [mx, by + 0.02, deck + 1.9], [mx + 0.45, by + 0.2, deck + 1.95], C.ink, 0.03);
      const [lx, ly] = P(mx + 0.5, by + 0.22, deck + 1.9);
      ctx.beginPath(); ctx.moveTo(lx - 0.14, ly + 0.08); ctx.lineTo(lx, ly - 0.1); ctx.lineTo(lx + 0.14, ly + 0.08); ctx.closePath(); paint(ctx, C.mustard, { lw: 0.03 });
      if (on) { ctx.beginPath(); ctx.arc(lx, ly + 0.1, 0.06, 0, Math.PI * 2); ctx.fillStyle = LIT; ctx.fill(); }
      // (Its glow is drawn here with the boat, not as a light of its own:
      // a light that moves is drawn by every chunk.)
      const glowK = nightK(t);
      // Her mug, with the steam coming off it.
      const [ux, uy] = [bx + 1.3, by - 0.12];
      cylinder(ctx, ux, uy, deck, 0.09, 0.18, C.coral, { flat: true });
      if (Q.detail && !on) {
        ctx.strokeStyle = alpha(C.white, 0.8); ctx.lineWidth = 0.03;
        for (let i = 0; i < 2; i++) { const k = (t * 0.5 + i * 0.5) % 1; const [X, Y] = P(ux, uy, deck + 0.25 + k * 0.6); ctx.beginPath(); ctx.moveTo(X, Y); ctx.quadraticCurveTo(X + 0.08 * Math.sin(t * 3 + i), Y - 0.1, X, Y - 0.2); ctx.stroke(); }
      }
      // Her, reading. The page turns every nine seconds.
      // (Tapped, she lowers the book and gives you a look.)
      const looked = reader.k() > 0.5;
      const watch = sunsetWatch(t) || looked;
      const [ox, oy, oz] = ownerSpot(t);
      const book = (c2, tt) => {
        c2.beginPath(); c2.rect(0.22, -0.14, 0.52, 0.3); paint(c2, C.coral, { lw: 0.03 });
        c2.beginPath(); c2.rect(0.25, -0.12, 0.22, 0.25); c2.rect(0.49, -0.12, 0.22, 0.25); paint(c2, C.white, { lw: 0.02 });
        const k = pulse(tt, 9);
        if (k < 0.1) { const w = 0.22 * Math.cos((k / 0.1) * Math.PI); c2.beginPath(); c2.rect(0.48, -0.15, w, 0.25); paint(c2, INK.cream, { lw: 0.02 }); }
      };
      person(ctx, ox, oy, oz, { ...owner, pose: 'sit', dir: 'r', back: watch && !looked, arms: watch ? [0.35, 0.3] : [1.0, 0.95], hold: watch ? null : book }, t);
      if (glowK > 0.3) glow(ctx, mx + 0.5, by + 0.22, deck + 1.5, 1.8, LIT, glowK * 0.8);
      // What she says, now and then.
      const s = t % 360;
      const line = s > 60 && s < 66 ? 'It\'ll float.' : s > 186 && s < 192 ? 'Told you.' : s > 298 && s < 304 ? 'One more chapter.' : null;
      const w = wardenAsk(t);
      if (w && w.who === 'boat' && w.k > 0.5) say(ctx, ox, oy, oz + 2.4, ASK.boat[1]);
      else if (line) say(ctx, ox, oy, oz + 2.4, line);
    };
    R.thing(SAIL[0] + 1.8, SAIL[1] + 0.7, (ctx) => sailboat(ctx, 100, 'hull'), { on: aground });
    R.thing(SAIL[0] + 1.8, SAIL[1] + 0.71, (ctx, t) => sailboat(ctx, t, 'top'), { anim: true, on: aground });
    R.thing(SAIL[0] + 1.8, SAIL[1] + 0.7, (ctx, t) => sailboat(ctx, t, 'all'), { anim: true, on: (t) => !aground(t) });
    // The towing company's sign on a piling, right off her bow. Ignored.
    const TOP = 0.85;
    R.thing(TOW[0] + 0.2, TOW[1] + 0.2, (ctx, t) => {
      const z = Math.max(h(...TOW), level(t));
      if (z < TOP) box(ctx, TOW[0] - 0.13, TOW[1] - 0.13, z, 0.26, 0.26, TOP - z, shade(C.wood, 0.3), { flat: true, lw: 0.03 });
    }, { anim: true });
    R.thing(TOW[0] + 0.21, TOW[1] + 0.21, (ctx) => {
      box(ctx, TOW[0] - 0.13, TOW[1] - 0.13, TOP, 0.26, 0.26, 2.3, shade(C.wood, 0.3), { flat: true, lw: 0.03 });
      board(ctx, 'x', TOW[0], TOW[1] + 0.16, TOP + 1.7, 1.7, 0.42, 'NEED A TOW?', { size: 0.26, font: 'Bagel Fat One', board: C.mustard });
      board(ctx, 'x', TOW[0], TOW[1] + 0.16, TOP + 1.25, 1.3, 0.34, 'RADIO CH 16', { size: 0.2, font: FONT, board: C.white });
      gull(ctx, TOW[0], TOW[1], TOP + 2.3, 0, { dir: 'l' });
    });

    // ================= The flats: clammers, and the warden =================
    // The clam warden walks out, asks everyone for their licence (the boat
    // included), and stands on the beach writing it all down.
    const warden = plan(44, [18, 27.9], [
      { to: [22.1, 24.9] }, { wait: 6, ask: 1, dir: 'r' },
      { to: [27.2, 22.7] }, { wait: 6, ask: 2, dir: 'l' },
      { to: [19.9, 23.4] }, { wait: 6, ask: 'boat', dir: 'r', back: true },
      { to: [10.1, 24.1] }, { wait: 7, ask: 0, dir: 'r' },
      { to: [17.4, 26.9] }, { until: 150, note: true, dir: 'l' },
      { to: [17.4, 27.9] },
    ]);
    const ASK = { 1: ['Licence?', 'Right here.'], 2: ['Licence?', 'Since 1971.'], boat: ['You can\'t park here.', 'Tell the tide.'], 0: ['Licence?', 'Can it wait?'] };
    function wardenAsk(t) { const p = warden(t); return p && p.seg.ask != null ? { who: p.seg.ask, k: p.k } : null; }
    const wLook = folk(50, { top: mix(C.woodLight, C.mustard, 0.35), bottom: C.green, hat: 'sun', style: 'pony', skin: SKIN[3] });
    const clipboard = (g) => { g.beginPath(); g.rect(0.2, -0.1, 0.3, 0.38); paint(g, C.wood, { lw: 0.03 }); g.beginPath(); g.rect(0.24, -0.05, 0.22, 0.28); paint(g, C.white, { stroke: false }); };
    R.mover((t) => warden(t) || away([18, 27.9]), (ctx, t, p) => {
      if (p.gone) return;
      const z = h(p.x, p.y), asking = p.seg.ask != null;
      body(ctx, p.x, p.y, z, wLook, { pose: p.moving ? 'walk' : asking && p.k < 0.5 ? 'point' : 'read', dir: p.dir, back: p.back, hold: p.moving || (asking && p.k < 0.5) ? null : clipboard }, t);
      if (asking && p.k < 0.5) say(ctx, p.x, p.y, z + 2.5, ASK[p.seg.ask][0]);
    });

    // The clammers. Each has a bucket; they walk out as the flats come out,
    // rake, and walk back in as the tide turns.
    const bucket = (ctx, x, y, z) => {
      cylinder(ctx, x, y, z, 0.17, 0.32, tint(C.grey, 0.35), { flat: true });
      if (Q.detail) for (const [dx, dy] of [[-0.05, -0.03], [0.05, 0.02], [0, 0.06]]) disc(ctx, x + dx, y + dy, z + 0.33, 0.05, INK.cream, { lw: 0.015 });
    };
    const rake = (g, t) => {
      const s = Math.sin(t * 2.2), ex = 0.58 + s * 0.14, ey = 1.22;
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(0.02, -0.12); g.lineTo(ex, ey);
      if (Q.lines) { g.strokeStyle = C.ink; g.lineWidth = 0.11; g.stroke(); }
      g.strokeStyle = C.wood; g.lineWidth = 0.06; g.stroke();
      g.beginPath(); g.moveTo(ex - 0.17, ey); g.lineTo(ex + 0.17, ey);
      for (let k = -2; k <= 2; k++) { g.moveTo(ex + k * 0.08, ey); g.lineTo(ex + k * 0.08 + 0.02, ey + 0.1); }
      g.strokeStyle = C.ink; g.lineWidth = 0.04; g.stroke();
    };
    const pail = (g) => { g.beginPath(); g.rect(0.12, 0.3, 0.26, 0.28); paint(g, tint(C.grey, 0.35), { lw: 0.03 }); };
    const card = (g) => { g.beginPath(); g.rect(0.5, -0.45, 0.24, 0.16); paint(g, C.white, { lw: 0.025 }); };

    // One Boot: lost a boot in the mud this morning and has spent the whole
    // low tide hopping round it on one foot, trying not to put a sock in the mud.
    const c0 = plan(28, [11, 27.9], [
      { to: [11, 26.4], speed: 0.7 }, { to: [10.9, 23.3], speed: 0.7 }, { until: 160, dir: 'r', stuck: true },
      { to: [11, 26.4], speed: 0.7 }, { to: [11, 27.9], speed: 0.7 },
    ]);
    const c0Look = folk(41, { top: C.mustard, bottom: WADERS, shoes: BOOT_RED, hat: 'cap', style: 'short' });
    R.mover((t) => c0(t) || away([11, 27.9]), (ctx, t, p) => {
      if (p.gone) return;
      const hop = Math.abs(Math.sin(t * 5.5)) * 0.28, z = h(p.x, p.y) + hop;
      const s = t % 14, reach = p.seg.stuck && s > 4 && s < 6.5;
      body(ctx, p.x, p.y, z, c0Look, { pose: reach ? 'point' : 'stand', dir: p.dir, back: p.back, arms: reach ? null : [1.55 + 0.25 * Math.sin(t * 5.5), -1.4 - 0.3 * Math.sin(t * 5.5)] }, t);
      // The sock.
      if (Q.detail) { const [X, Y] = P(p.x, p.y, z), f = p.dir === 'l' ? -1 : 1; ctx.beginPath(); ctx.ellipse(X + f * 0.12, Y - 0.02, 0.14, 0.08, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.025 }); }
      const w = wardenAsk(t);
      if (w && w.who === 0 && w.k > 0.5) say(ctx, p.x, p.y, z + 2.5, ASK[0][1]);
      else if (p.seg.stuck && s < 3) say(ctx, p.x, p.y, z + 2.5, 'It\'s RIGHT there.');
      else if (p.seg.stuck && s > 8.5 && s < 11) say(ctx, p.x, p.y, z + 2.5, 'Nobody look.');
    });

    // Two who actually dig: bent at the rake, a bucket filling beside them.
    // The second, Ern, is last off the flats every day, and walks home along
    // the beach with his lantern at dusk, after the sunset.
    const c1 = plan(32, [14, 27.9], [{ to: [14, 26.3] }, { to: [22.8, 24.2] }, { until: 163, dig: true, dir: 'r' }, { to: [14, 26.3] }, { to: [14, 27.9] }]);
    const c2 = plan(36, [28, 27.9], [
      { to: [28, 26.6] }, { to: [26.4, 23.4] }, { until: 198, dig: true, dir: 'l' },
      { to: [28, 26.6], speed: 0.9 }, { until: 216, watch: true, dir: 'r', back: true },
      { to: [46.4, 26.9], speed: 1.0 }, { to: [47, 27.9], speed: 1.0 },
    ]);
    const lantern = (g, t) => {
      g.strokeStyle = C.ink; g.lineWidth = 0.03; g.beginPath(); g.moveTo(0.45, -0.2); g.lineTo(0.45, 0.05); g.stroke();
      g.beginPath(); g.rect(0.35, 0.05, 0.2, 0.26); paint(g, LIT, { lw: 0.03 });
      g.beginPath(); g.rect(0.33, 0.02, 0.24, 0.05); g.rect(0.33, 0.3, 0.24, 0.05); paint(g, C.ink, { stroke: false });
    };
    const digger = (fn, look, who, extra) => R.mover((t) => fn(t) || away([20, 27.9]), (ctx, t, p) => {
      if (p.gone) return;
      const z = h(p.x, p.y), w = wardenAsk(t), asked = w && w.who === who;
      const f = p.dir === 'l' ? -1 : 1;
      if (p.seg.dig && !asked) {
        const s = Math.sin(t * 2.2 + who);
        bent(ctx, p.x, p.y, z, look, { pose: 'stand', dir: p.dir, arms: [0.9 + s * 0.25, 0.7 + s * 0.25], hold: rake }, t, 0.42);
        bucket(ctx, p.x + 0.35 * f, p.y + 0.45, z);
      } else if (p.seg.dig) {
        body(ctx, p.x, p.y, z, look, { pose: who === 1 ? 'point' : 'stand', dir: p.dir, hold: who === 1 ? card : null }, t);
        bucket(ctx, p.x + 0.35 * f, p.y + 0.45, z);
        if (w.k > 0.5) say(ctx, p.x, p.y, z + 2.5, ASK[who][1]);
      } else {
        const lit = extra && loopT(t) > 196;
        body(ctx, p.x, p.y, z, look, { pose: p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back, arms: lit ? [0.9, -0.2] : null, hold: lit ? lantern : pail }, t);
        if (lit) glow(ctx, p.x + 0.35, p.y - 0.35, z + 1.0, 1.7, LIT, 0.35 + 0.6 * nightK(t));
      }
      if (extra && p.seg.dig && loopT(t) > 188 && loopT(t) < 196) say(ctx, p.x, p.y, z + 2.5, 'Five more minutes.');
    });
    digger(c1, folk(44, { top: C.teal, bottom: WADERS, shoes: WADERS, hat: 'cap', style: 'bald' }), 1, false);
    digger(c2, folk(47, { top: C.coral, bottom: WADERS, shoes: WADERS, hat: 'beanie', hair: HAIR[4], style: 'curly' }), 2, true);

    // Clams squirting on the flats at low tide, and three green crabs.
    const SQUIRTS = [[20.6, 23.6, 0], [24.4, 25.2, 1.1], [25.2, 22.6, 2.3], [18.4, 24.6, 0.7], [16.6, 24.9, 1.8]];
    R.thing(25.4, 25.4, (ctx, t) => {
      if (!Q.detail || !lowTide(t)) return;
      ctx.fillStyle = alpha(C.white, 0.95);
      for (const [x, y, ph] of SQUIRTS) {
        const k = pulse(t + ph, 3.4);
        if (k > 0.3) continue;
        const z = h(x, y), q = k / 0.3;
        for (let i = 0; i < 3; i++) { const u = clamp(q - i * 0.12); const [X, Y] = P(x + u * 0.25, y - u * 0.1, z + Math.sin(u * Math.PI) * 0.55); ctx.beginPath(); ctx.arc(X, Y, 0.045, 0, Math.PI * 2); ctx.fill(); }
      }
    }, { anim: true });
    for (const [x, y, ph] of [[23.6, 25.6, 0], [30.2, 24.4, 2], [15.2, 24.2, 4]]) {
      R.thing(x, y, (ctx, t) => {
        if (!Q.detail || level(t) > h(x, y) - 0.02) return;
        const cx = x + 0.35 * Math.sin(t / 2 + ph), z = h(cx, y);
        const [X, Y] = P(cx, y, z);
        ctx.beginPath(); ctx.ellipse(X, Y - 0.06, 0.13, 0.07, 0, 0, Math.PI * 2); paint(ctx, mix(C.green, C.brown, 0.4), { lw: 0.025 });
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.beginPath();
        for (const k of [-1, 1]) { ctx.moveTo(X + k * 0.1, Y - 0.08); ctx.lineTo(X + k * 0.2, Y - 0.16 - 0.03 * Math.sin(t * 6)); ctx.moveTo(X + k * 0.08, Y - 0.03); ctx.lineTo(X + k * 0.18, Y + 0.02); }
        ctx.stroke();
      }, { anim: true });
    }

    // ================= The back beach =================
    notice(R, 13.4, 27.2, ['CLAM FLATS', 'PERMIT REQUIRED', 'CLAMS EXEMPT'], { w: 2.1, size: 0.24, board: C.white, head: C.teal });
    // Biscuit, who has been told about the gulls.
    const dogOwner = plan(46, [33.8, 27.9], [{ to: [33.8, 26.4], speed: 1 }, { until: 150, dir: 'r', back: true }, { to: [33.8, 27.9], speed: 1 }]);
    const doLook = folk(58, { top: C.purple, bottom: C.navy, hat: 'cap' });
    const fig8 = (t) => { const w = (Math.PI * 2) / 7; return [35.2 + 2.3 * Math.sin(w * t), 22.9 + 1.0 * Math.sin(2 * w * t)]; };
    const dogAt = (t) => {
      const o = dogOwner(t);
      if (!o) return { x: 35.6, y: 27.9, gone: true };
      const side = [o.x + 0.7, o.y - 0.3];
      const k = clamp((loopT(t) - 50) / 3) * clamp((149 - loopT(t)) / 3);
      const [fx, fy] = fig8(t);
      const x = lerp(side[0], fx, k), y = lerp(side[1], fy, k);
      const [nx, ny] = k > 0.5 ? fig8(t + 0.1) : [side[0] + (o.moving ? 0 : 0.01), side[1]];
      return { x, y, dir: dirOf(nx - x, ny - y), run: k > 0.5 };
    };
    R.mover((t) => dogOwner(t) || away([35.6, 27.9]), (ctx, t, p) => {
      if (p.gone) return;
      const z = h(p.x, p.y), s = t % 12, shout = !p.moving && s < 2.6;
      body(ctx, p.x, p.y, z, doLook, { pose: p.moving ? 'walk' : shout ? 'wave' : 'stand', dir: p.dir, back: p.back && !shout }, t);
      if (shout) say(ctx, p.x, p.y, z + 2.5, (Math.floor(t / 12) % 2) ? 'BISCUIT, NO.' : 'BISCUIT!');
    });
    R.mover(dogAt, (ctx, t, p) => {
      if (p.gone) return;
      const z = h(p.x, p.y), [X, Y] = P(p.x, p.y, z), f = p.dir === 'l' ? -1 : 1, b = p.run ? Math.abs(Math.sin(t * 12)) * 0.12 : 0;
      ctx.save(); ctx.translate(X, Y - b); ctx.scale(f, 1);
      const fur = C.woodLight;
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.07; ctx.lineCap = 'round'; ctx.beginPath();
      const sw = p.run ? Math.sin(t * 12) * 0.12 : 0;
      for (const [lx, d] of [[-0.2, sw], [0.2, -sw]]) { ctx.moveTo(lx, -0.25); ctx.lineTo(lx + d, 0); }
      ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, -0.33, 0.3, 0.14, 0, 0, Math.PI * 2); paint(ctx, fur, { lw: 0.035 });
      ctx.beginPath(); ctx.arc(0.3, -0.48, 0.12, 0, Math.PI * 2); paint(ctx, fur, { lw: 0.03 });
      ctx.beginPath(); ctx.ellipse(0.26, -0.5, 0.05, 0.09, 0.4, 0, Math.PI * 2); paint(ctx, C.brown, { lw: 0.02 });
      ctx.beginPath(); ctx.moveTo(-0.28, -0.38); ctx.lineTo(-0.45, -0.55 + Math.sin(t * 14) * 0.06); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
      ctx.restore();
    });
    // The gulls Biscuit is after: they go up when he comes, and come down again.
    for (const [gx, gy, ph] of [[33.4, 22.2, 0], [37, 23.5, 1.3]]) {
      R.mover((t) => ({ x: gx, y: gy }), (ctx, t) => {
        if (nightK(t) > 0.6) return;
        const d = dogAt(t), near = d.gone ? 0 : clamp((1.9 - Math.hypot(d.x - gx, d.y - gy)) / 0.9);
        const z = float(gx, gy, t);
        if (near > 0.05) { flier(ctx, gx, gy, z + 0.3 + near * 1.6, t, C.white, 0.35, 10); return; }
        gull(ctx, gx, gy, z + (level(t) > h(gx, gy) ? -0.12 + 0.03 * Math.sin(t * 2 + ph) : 0), t, { dir: ph ? 'l' : 'r', peck: true, phase: ph });
      });
    }
    // The sunset couple: chairs out on the beach, backs to everyone, then home.
    const coupleLooks = [folk(71, { top: C.white, bottom: C.teal }), folk(72, { dress: true, top: C.pink, hat: 'sun' })];
    [[32.6, 26.5], [33.9, 26.3]].forEach(([x, y], i) => {
      const walk = plan(193 + i, [x + 0.4, 27.9], [{ to: [x, y], speed: 1 }, { until: 232, sit: true, dir: 'r', back: true }, { to: [x + 0.4, 27.9], speed: 1 }]);
      R.mover((t) => walk(t) || away([x, 27.9]), (ctx, t, p) => {
        if (p.gone) return;
        const z = h(p.x, p.y);
        if (!p.seg.sit) { body(ctx, p.x, p.y, z, coupleLooks[i], { pose: 'walk', dir: p.dir, back: p.back }, t); return; }
        person(ctx, p.x, p.y, z - 0.2, { ...coupleLooks[i], pose: 'sit', dir: 'r', back: true, arms: [0.4, 0.3] }, t);
        // The chair, in front of them from here (its back square behind theirs).
        const cc = [C.coral, C.teal][i];
        stick(ctx, [p.x - 0.05, p.y + 0.35, z], [p.x + 0.55, p.y - 0.2, z + 0.35], C.greyLight, 0.03);
        stick(ctx, [p.x + 0.55, p.y + 0.35, z], [p.x - 0.05, p.y - 0.2, z + 0.35], C.greyLight, 0.03);
        face(ctx, [[p.x - 0.05, p.y + 0.3, z + 0.35], [p.x + 0.55, p.y + 0.3, z + 0.35], [p.x + 0.55, p.y + 0.22, z + 1.05], [p.x - 0.05, p.y + 0.22, z + 1.05]], cc, { lw: 0.035, dots: shade(cc, 0.4), density: 0.2 });
        if (Q.detail) face(ctx, [[p.x + 0.15, p.y + 0.3, z + 0.35], [p.x + 0.35, p.y + 0.3, z + 0.35], [p.x + 0.35, p.y + 0.22, z + 1.05], [p.x + 0.15, p.y + 0.22, z + 1.05]], C.white, { stroke: false });
      });
    });

    // ================= The kayak launch =================
    // A ramp down the beach, a rack of refuge kayaks, the sign, and a cooler.
    R.rug((ctx) => {
      const x0 = 39.5, x1 = 40.9;
      for (let y = 25.8; y < 27.5; y += 0.34) {
        const z = h(40.2, y + 0.17) + 0.06;
        face(ctx, [[x0, y, z], [x1, y, z], [x1, y + 0.3, z], [x0, y + 0.3, z]], tint(C.woodLight, 0.1), { lw: 0.03 });
      }
    });
    const launchSign = notice(null, 38.6, 27.6, ['KAYAK LAUNCH', 'HIGH TIDE ONLY', 'OTHERWISE, MUD'], { w: 2.5, size: 0.24, board: C.white, head: C.coral });
    R.thing(39.7, 27.7, (ctx) => {
      const z = h(37.6, 27.2);
      for (const [dx, dy] of [[0, 0], [1.6, 0], [0, 0.6], [1.6, 0.6]]) box(ctx, 36.8 + dx, 26.6 + dy, z, 0.1, 0.1, 1.4, C.wood, { flat: true, lw: 0.03 });
      for (const zz of [0.55, 1.2]) box(ctx, 36.75, 26.55, z + zz, 1.8, 0.8, 0.07, C.wood, { flat: true, lw: 0.03 });
      kayak(ctx, 37.7, 26.95, z + 0.62, 0, C.mint);
      kayak(ctx, 37.7, 26.95, z + 1.27, 0, C.purple);
      launchSign(ctx);
    });
    R.thing(42.3, 27.5, (ctx) => {
      const x = 41.7, y = 26.9, z = h(x, y);
      box(ctx, x, y, z, 0.9, 0.55, 0.55, BRAND.can, { flat: true, lw: 0.035, top: C.white });
      letters(ctx, x + 0.45, y + 0.55, z + 0.3, 'GANDER', 0.2, BRAND.ink, 'Bagel Fat One');
    });

    // ================= The kayakers =================
    // Kayaker One has been sitting in a kayak on the mud since the morning,
    // waiting for the water. Two comes down when it does. They go round
    // lazily, stop for the sunset, and come in before dark.
    const kA = kayakTrip({ appear: 30, from: [40.2, 27.9], spot: [40.6, 23.6], float: 191, center: [38, 12], r: 3.5, ry: 2.1, phase: 1.6, speed: 1.0, leave: 246, land: [40.3, 25.3] });
    const kB = kayakTrip({ appear: 185, from: [41.8, 27.9], spot: [41.8, 23.8], float: 191, center: [21.8, 10.6], r: 3.2, ry: 2.0, phase: 0.2, speed: 1.6, leave: 244, land: [41.6, 25.4] });
    const aLook = folk(60, { top: C.white, bottom: C.teal, hat: 'sun' }), bLook = folk(62, { top: C.teal, hat: 'cap' });
    // (Sitting on the mud all day is a still picture; only what she says is live.)
    const kWait = kA(100);
    R.thing(kWait.x + 0.8, kWait.y + 0.8, (ctx) => drawKayaker(ctx, 100, kWait, aLook, C.coral, C.white), { on: (t) => kA(t).mode === 'wait' });
    R.mover(kA, (ctx, t, p) => {
      if (p.mode !== 'wait') { drawKayaker(ctx, t, p, aLook, C.coral, C.white); return; }
      if (p.gone) return;
      const s = t % 30, z = h(p.x, p.y) + 1.9;
      if (s < 3) say(ctx, p.x, p.y, z, 'Any tide now.');
      else if (loopT(t) > 186) say(ctx, p.x, p.y, z, 'FINALLY.');
    });
    R.mover(kB, (ctx, t, p) => drawKayaker(ctx, t, p, bLook, C.teal, C.white));
    // Kayaker Three, who pushed off at sunset and only then noticed the
    // paddle wasn't in the kayak. Paddles by hand, all night, headlamp on,
    // until the tide drops and there it is.
    const H = { from: [42.8, 27.9], spot: [42.6, 24.6], drift: [27.4, 23.4], home: [42, 25.2] };
    const hCarry = Math.hypot(H.spot[0] - H.from[0], H.spot[1] - H.from[1]);
    const hGo = 222, hArrive = hGo + Math.hypot(H.drift[0] - H.spot[0], H.drift[1] - H.spot[1]) / 0.55, hFound = 351;
    const hDrift = (t) => { const a = clamp((t - hArrive) / 5); return [H.drift[0] + a * 0.6 * Math.sin((t - hArrive) / 7), H.drift[1] + a * 0.35 * Math.sin((t - hArrive) / 5)]; };
    const hAt = (t) => {
      const s = ((t % 360) + 360) % 360;
      if (s < 196) return away(H.from);
      if (s < 196 + hCarry) { const k = (s - 196) / hCarry; return { x: lerp(H.from[0], H.spot[0], k), y: lerp(H.from[1], H.spot[1], k), mode: 'carry', ang: -2.9, dir: 'l', back: true }; }
      if (s < hGo) return { x: H.spot[0], y: H.spot[1], mode: 'ashore', ang: -2.9 };
      if (s < hArrive) { const k = (s - hGo) / (hArrive - hGo); return { x: lerp(H.spot[0], H.drift[0], k), y: lerp(H.spot[1], H.drift[1], k), mode: 'hands', ang: Math.atan2(H.drift[1] - H.spot[1], H.drift[0] - H.spot[0]) }; }
      if (s < hFound) { const [x, y] = hDrift(s); return { x, y, mode: 'hands', ang: -2.9 + 0.6 * Math.sin((s - hArrive) / 13) }; }
      const [fx, fy] = hDrift(hFound), k = (s - hFound) / (360 - hFound);
      return { x: lerp(fx, H.home[0], k), y: lerp(fy, H.home[1], k), mode: 'paddle', ang: Math.atan2(H.home[1] - fy, H.home[0] - fx) };
    };
    const hLook = folk(66, { top: C.pink, bottom: C.navy, hat: 'cap', style: 'pony', skin: SKIN[3] });
    R.mover(hAt, (ctx, t, p) => {
      if (p.gone) return;
      const s = ((t % 360) + 360) % 360;
      if (p.mode === 'ashore') {
        // Standing by the kayak on the sand, for the sunset.
        const z = h(p.x, p.y), watch = sunsetWatch(t);
        kayak(ctx, p.x, p.y, z - 0.04, p.ang, C.mustard);
        body(ctx, p.x - 0.4, p.y + 0.8, h(p.x - 0.4, p.y + 0.8), hLook, { pose: 'stand', dir: watch ? 'r' : 'l', back: watch }, t);
        return;
      }
      drawKayaker(ctx, t, p, hLook, C.mustard, C.mustard);
      const L = level(t), zt = Math.max(L, h(p.x, p.y)) + 1.95;
      if (p.mode === 'hands') {
        if (s < hGo + 3.5) say(ctx, p.x, p.y, zt, 'Wait.');
        else if (s % 24 < 3) say(ctx, p.x, p.y, zt, 'Little help?');
        const k = nightK(t);
        if (k > 0.3) { const [X, Y] = P(p.x, p.y, Math.max(L, h(p.x, p.y)) + 1.55); ctx.beginPath(); ctx.arc(X + 0.1, Y, 0.06, 0, Math.PI * 2); ctx.fillStyle = LIT; ctx.fill(); glow(ctx, p.x, p.y, Math.max(L, h(p.x, p.y)) + 1.4, 1.1, LIT, k * 0.6); }
      } else if (p.mode === 'paddle' && s < hFound + 4) say(ctx, p.x, p.y, zt, 'Found it!');
    });

    // ================= The goose, and the duck blinds =================
    // Two duck blinds on the marsh island, up on pilings so the king tide
    // goes under them, either side of a sign that says BIRDS ONLY. In one, a
    // gunner asleep since dawn (his cap shows over the brush). In the other,
    // the goose: an orange foot dangles through the floor and a tail tip
    // sticks out of the brush. A tap drops the front flap. Out in front of
    // the gunner's blind, his wooden decoy, sat on the mud at low water and
    // floating at high.
    signpost(R, 28.3, 19.4, 'BIRDS ONLY', { w: 1.3, h: 0.42, post: 0.75, size: 0.22, font: FONT, board: C.white });
    R.thing(31.6, 22.4, (ctx) => tufts(ctx, [[27.6, 19.2, 5], [28.2, 21.9, 4], [31.4, 21.6, 5], [30.2, 18.6, 4], [29, 22.2, 3]]));
    const HAY = mix(C.mustard, C.woodLight, 0.45), HAYD = shade(HAY, 0.3);
    const BF = 1.05, BW = 0.95; // the blinds' floor, over the king tide, and their brush walls
    const BLIND_A = { x: 30.1, y: 19.4, w: 1.4, d: 1.1 }, BLIND_B = { x: 26.3, y: 19.7, w: 1.4, d: 1.1 }; // (A kept a unit off the seam at x 32)
    // A wall of brush: the face, then upright stalks and a ragged top.
    const brush = (ctx, pts, col, n) => {
      face(ctx, pts, col, { lw: 0.04, dots: Q.detail ? shade(col, 0.45) : null, density: 0.14 });
      if (!Q.detail) return;
      const [a, b, , d] = pts; // a, b along the floor; d over a
      ctx.lineCap = 'round'; ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const k = i / n, base = [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
        const top = [lerp(d[0], d[0] + b[0] - a[0], k), lerp(d[1], d[1] + b[1] - a[1], k), lerp(d[2], d[2] + b[2] - a[2], k) + 0.12 + (i % 3) * 0.07];
        const [X0, Y0] = P(...base), [X1, Y1] = P(...top);
        ctx.moveTo(X0, Y0); ctx.lineTo(X1 + (i % 2 ? 0.05 : -0.04), Y1);
      }
      ctx.strokeStyle = HAYD; ctx.lineWidth = 0.035; ctx.stroke();
    };
    // The back of a blind: pilings, floor, its two back walls and inside.
    const blindBack = (ctx, B) => {
      const { x, y, w, d } = B, g = h(x + w / 2, y + d / 2);
      for (const [px, py] of [[x + 0.1, y + 0.1], [x + w - 0.2, y + 0.1], [x + 0.1, y + d - 0.2], [x + w - 0.2, y + d - 0.2]]) box(ctx, px, py, g - 0.1, 0.1, 0.1, BF - g + 0.1, shade(C.wood, 0.3), { flat: true, lw: 0.025 });
      box(ctx, x, y, BF - 0.1, w, d, 0.1, C.wood, { flat: true, lw: 0.03 });
      brush(ctx, [[x, y, BF], [x, y + d, BF], [x, y + d, BF + BW], [x, y, BF + BW]], shade(HAY, 0.22), 6);
      brush(ctx, [[x, y, BF], [x + w, y, BF], [x + w, y, BF + BW], [x, y, BF + BW]], shade(HAY, 0.14), 7);
    };
    // Its front: the side wall, and the front flap, hinged at the floor (k: open).
    const blindFront = (ctx, B, k) => {
      const { x, y, w, d } = B, a = k * Math.PI * 0.47, s = Math.sin(a) * BW, c = Math.cos(a) * BW;
      brush(ctx, [[x + w, y, BF], [x + w, y + d, BF], [x + w, y + d, BF + BW], [x + w, y, BF + BW]], HAY, 6);
      brush(ctx, [[x, y + d, BF], [x + w, y + d, BF], [x + w, y + d + s, BF + c], [x, y + d + s, BF + c]], tint(HAY, 0.08), 7);
    };
    // The goose's blind. Its foot and tail tip show while it's shut.
    const blindA = R.poke({ id: 'blind', at: [BLIND_A.x + 0.7, BLIND_A.y + 0.9, BF + 0.5], r: 1.0, sound: 'pop', say: ['HONK.'] });
    R.thing(BLIND_A.x + 0.2, BLIND_A.y + 0.2, (ctx) => blindBack(ctx, BLIND_A));
    R.goose((t) => {
      const k = blindA.k(), s = t % 11;
      return { x: BLIND_A.x + 0.7, y: BLIND_A.y + 0.6, z: BF, dir: 'r', hidden: k < 0.35, pose: sunsetWatch(t) ? 'stand' : s < 1.4 ? 'honk' : 'stand' };
    }, { bias: -0.2, kind: 'poke', inside: blindA, hint: 'Two duck blinds on the island. Only one of them has feet.' });
    R.thing(BLIND_A.x + BLIND_A.w, BLIND_A.y + BLIND_A.d, (ctx, t) => {
      const k = blindA.k(), { x, y, w, d } = BLIND_A;
      // The foot, dangling through a gap in the floor, paddling a little.
      const [FX, FY] = P(x + w - 0.35, y + d - 0.1, BF - 0.1), sw = 0.04 * Math.sin(t * 2.3);
      if (k < 0.35) {
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.11; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(FX, FY); ctx.lineTo(FX + sw, FY + 0.3); ctx.stroke();
        ctx.strokeStyle = C.coral; ctx.lineWidth = 0.07; ctx.stroke();
        // A webbed foot, toes spread: three toes and the web between them.
        const fx = FX + sw, fy = FY + 0.3;
        ctx.beginPath(); ctx.moveTo(fx, fy);
        ctx.lineTo(fx - 0.17, fy + 0.13); ctx.quadraticCurveTo(fx - 0.09, fy + 0.11, fx - 0.04, fy + 0.18);
        ctx.quadraticCurveTo(fx + 0.02, fy + 0.13, fx + 0.1, fy + 0.18); ctx.quadraticCurveTo(fx + 0.13, fy + 0.11, fx + 0.22, fy + 0.11);
        ctx.closePath(); paint(ctx, C.coral, { lw: 0.03 });
      }
      // The tail tip, up over the brush at the back.
      if (k < 0.35) {
        const [TX, TY] = P(x + 0.35, y + 0.35, BF + BW + 0.05), wag = 0.04 * Math.sin(t * 1.7);
        ctx.beginPath(); ctx.moveTo(TX - 0.12, TY + 0.1); ctx.lineTo(TX - 0.2 + wag, TY - 0.28); ctx.lineTo(TX + 0.12, TY + 0.08); ctx.closePath();
        paint(ctx, C.white, { lw: 0.035 });
      }
      blindFront(ctx, BLIND_A, k);
    }, { anim: true, depth: BLIND_A.x + BLIND_A.y + BLIND_A.w + BLIND_A.d });
    // The gunner's blind: his cap over the brush, and snores.
    const blindB = R.poke({ id: 'gunner', at: [BLIND_B.x + 0.7, BLIND_B.y + 0.9, BF + 0.5], r: 1.0, sound: 'pop', say: ['Shh. Waiting for geese.', 'Wake me when one shows up.', 'Since 1987. Zzz.'] });
    const gunner = folk(77, { top: mix(C.green, C.brown, 0.4), bottom: C.brown, hat: 'cap', style: 'bald' });
    R.thing(BLIND_B.x + 0.2, BLIND_B.y + 0.2, (ctx) => blindBack(ctx, BLIND_B));
    R.thing(BLIND_B.x + BLIND_B.w, BLIND_B.y + BLIND_B.d, (ctx, t) => {
      const k = blindB.k(), { x, y, w, d } = BLIND_B;
      // (Clipped to the blind, floor up, so his boots don't poke out under it.)
      ctx.save(); hull(ctx, [[x, y, BF], [x + w, y, BF], [x + w, y + d, BF], [x, y + d, BF], [x, y, BF + 3], [x + w, y, BF + 3], [x + w, y + d, BF + 3], [x, y + d, BF + 3]]); ctx.clip();
      person(ctx, x + 0.75, y + 0.55, BF - 0.75, { ...gunner, pose: 'sit', dir: 'r', arms: [0.4, 0.35] }, 0);
      ctx.restore();
      blindFront(ctx, BLIND_B, k);
      // His thermos, steaming on the rim.
      cylinder(ctx, x + w - 0.25, y + 0.25, BF + BW, 0.08, 0.26, C.red, { flat: true });
      if (Q.detail) {
        const z = pulse(t, 4.5);
        ctx.fillStyle = C.ink; ctx.font = '0.32px "Bagel Fat One", sans-serif'; ctx.textAlign = 'center';
        const [X, Y] = P(x + 0.6, y + 0.4, BF + BW + 1.0 + z * 0.6);
        ctx.globalAlpha = 1 - z; ctx.fillText('z', X + z * 0.3, Y); ctx.globalAlpha = 1;
      }
    }, { anim: true, depth: BLIND_B.x + BLIND_B.y + BLIND_B.w + BLIND_B.d });
    // His wooden decoy: carved, painted white, chipped to the wood, on a
    // keel and an anchor line. Sits on the mud at low water, floats at high.
    const DEC = [25.3, 20.9];
    const decoyAt = (t) => { const g = h(...DEC), L = level(t); return [DEC[0] + (L > g ? 0.15 * Math.sin(t / 4) : 0), DEC[1], float(...DEC, t) + (L > g ? 0.03 * Math.sin(t * 1.6) : 0)]; };
    R.mover((t) => { const [x, y] = decoyAt(t); return { x, y }; }, (ctx, t) => {
      const [x, y, z] = decoyAt(t), afloat = level(t) > h(...DEC);
      const [X, Y] = P(x, y, z);
      // The anchor line, off to its weight.
      // (Off to the back, away from the clammers walking by, to its lead weight.)
      const ax = x - 0.9, ay = y - 0.6, az = h(ax, ay);
      stick(ctx, [x - 0.3, y, z + 0.05], [ax, ay, az + 0.05], C.ink, 0.02);
      if (level(t) < az) disc(ctx, ax, ay, az + 0.04, 0.08, C.grey, { lw: 0.02 });
      // The keel block under it.
      ctx.beginPath(); ctx.ellipse(X, Y - 0.02, 0.4, 0.1, 0, 0, Math.PI * 2); paint(ctx, C.wood, { lw: 0.03 });
      ctx.save(); ctx.translate(X, Y); ctx.rotate(afloat ? 0.04 * Math.sin(t * 1.3) : -0.08); ctx.translate(-X, -Y);
      goose(ctx, x, y, z + 0.08, 0, { pose: 'swim', dir: 'l', scale: 0.95 });
      if (Q.detail) {
        // Chipped paint, the wood showing, and a painted eye that doesn't blink.
        ctx.beginPath(); ctx.ellipse(X - 0.12, Y - 0.12, 0.12, 0.05, -0.2, 0, Math.PI * 2); ctx.fillStyle = C.woodLight; ctx.fill();
        ctx.beginPath(); ctx.ellipse(X + 0.18, Y - 0.07, 0.07, 0.03, 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = shade(C.wood, 0.2); ctx.lineWidth = 0.015;
        ctx.beginPath(); ctx.moveTo(X - 0.3, Y - 0.03); ctx.lineTo(X + 0.3, Y - 0.03); ctx.stroke();
      }
      ctx.restore();
      if (afloat && Q.lines) { ctx.beginPath(); ctx.ellipse(X, Y, 0.6, 0.24, 0, 0, Math.PI * 2); ctx.strokeStyle = alpha(C.white, 0.7); ctx.lineWidth = 0.04; ctx.stroke(); }
    });
    R.decoy({ id: 'wooden-goose', at: (t) => { const [x, y, z] = decoyAt(t); return [x, y, z + 0.3]; }, r: 0.8, say: ['A wooden decoy. Quack, apparently.', 'Carved in 1952. Still wood.', 'It has never once honked.'] });

    // ================= The finds =================
    // A clammer's boot, stuck upright in the mud, next to One Boot (low tide).
    R.thing(BOOT[0] + 0.3, BOOT[1] + 0.3, (ctx) => {
      const [x, y] = BOOT, z = h(x, y);
      disc(ctx, x, y, z + 0.01, 0.36, shade(LAND.mud, 0.2), { stroke: false });
      // A tall red rubber boot, stood bolt upright where the mud took it,
      // the heel sunk and the toe out, pointing at its owner.
      const [X, Y] = P(x, y, z);
      ctx.beginPath(); ctx.ellipse(X + 0.1, Y + 0.02, 0.62, 0.2, 0, 0, Math.PI * 2); paint(ctx, shade(LAND.mud, 0.1), { lw: 0.03 });
      ctx.save(); ctx.translate(X - 0.08, Y); ctx.scale(1.5, 1.5);
      ctx.beginPath();
      ctx.moveTo(-0.15, -0.8); ctx.lineTo(0.12, -0.8); ctx.lineTo(0.12, -0.22);
      ctx.quadraticCurveTo(0.2, -0.16, 0.38, -0.12); ctx.quadraticCurveTo(0.5, -0.09, 0.48, 0.01);
      ctx.lineTo(-0.17, 0.01); ctx.closePath();
      paint(ctx, BOOT_RED, { lw: 0.04 });
      // A black sole and a mustard band at the top: a wellie, not a post.
      ctx.beginPath(); ctx.rect(-0.17, -0.03, 0.65, 0.05); paint(ctx, C.ink, { stroke: false });
      ctx.beginPath(); ctx.rect(-0.16, -0.8, 0.29, 0.1); paint(ctx, C.mustard, { lw: 0.03 });
      ctx.beginPath(); ctx.ellipse(-0.015, -0.8, 0.135, 0.045, 0, 0, Math.PI * 2); paint(ctx, C.ink, { stroke: false });
      if (Q.detail) { ctx.beginPath(); ctx.moveTo(-0.07, -0.64); ctx.lineTo(-0.07, -0.24); ctx.strokeStyle = alpha(C.white, 0.6); ctx.lineWidth = 0.035; ctx.stroke(); }
      ctx.restore();
      // The mud lapping up over the heel.
      ctx.beginPath(); ctx.ellipse(X - 0.12, Y + 0.03, 0.26, 0.08, 0, 0, Math.PI * 2); paint(ctx, shade(LAND.mud, 0.2), { stroke: false });
    }, { on: lowTide });
    R.find({ id: 'boot', label: 'A clammer\'s lost boot', at: [BOOT[0], BOOT[1], h(...BOOT) + 0.6], r: 0.85, when: lowTide, note: 'low tide' });
    // A message in a bottle, washed up on the far flats (low tide).
    R.thing(BOTTLE[0] + 0.4, BOTTLE[1] + 0.2, (ctx) => {
      const [x, y] = BOTTLE, z = h(x, y) + 0.1;
      // Sunk to the shoulder: only the neck and the cork stick up out of the
      // mud, the glass dulled with it.
      const b = P(x + 0.1, y - 0.04, z - 0.02), n = P(x + 0.34, y - 0.14, z + 0.05);
      const glass = mix(mix(C.teal, C.green, 0.4), LAND.mud, 0.45);
      ctx.lineCap = 'round';
      const line = (p, q, c, w) => { ctx.beginPath(); ctx.moveTo(...p); ctx.lineTo(...q); ctx.strokeStyle = c; ctx.lineWidth = w; ctx.stroke(); };
      if (Q.lines) line(b, n, C.ink, 0.15);
      line(b, n, glass, 0.09);
      ctx.beginPath(); ctx.arc(n[0] + 0.04, n[1] - 0.02, 0.05, 0, Math.PI * 2); paint(ctx, shade(C.wood, 0.15), { lw: 0.022 });
      const [MX, MY] = P(x + 0.08, y - 0.02, z - 0.04);
      ctx.beginPath(); ctx.ellipse(MX, MY, 0.2, 0.08, -0.05, 0, Math.PI * 2); paint(ctx, shade(LAND.mud, 0.08), { lw: 0.02 });
    }, { on: lowTide });
    R.find({ id: 'bottle', label: 'A message in a bottle', kind: 'hard', at: [BOTTLE[0], BOTTLE[1], h(...BOTTLE) + 0.2], r: 0.8, when: lowTide, note: 'low tide', riddle: 'A letter nobody posted, waiting where nobody walks.', hint: 'Across the channel from everyone, the mud is keeping something glassy.' });

    // A crab pot, left out on the flats: at low water it sits on the mud; at
    // high, only its buoy shows. Its lid opens on a tap, and what the crabs
    // caught this time is somebody's teeth.
    const POT = [36.4, 19.2], potZ = h(...POT);
    const pot = R.poke({ id: 'crab-pot', at: [POT[0], POT[1], potZ + 0.3], r: 0.95, sound: 'clunk' });
    R.thing(POT[0] + 0.6, POT[1] + 0.5, (ctx, t) => {
      const [x, y] = POT, z = potZ, L = level(t);
      if (L > z + 0.5) {
        // Just its buoy, bobbing on the line.
        const bz = L + 0.04 * Math.sin(t * 1.8);
        stick(ctx, [x + 0.3, y + 0.2, bz], [x + 0.3, y + 0.2, bz - 0.1], C.ink, 0.02);
        cylinder(ctx, x + 0.3, y + 0.2, bz - 0.05, 0.13, 0.3, C.mustard, { flat: true });
        if (Q.detail) cylinder(ctx, x + 0.3, y + 0.2, bz + 0.08, 0.135, 0.08, C.coral, { flat: true });
        return;
      }
      const k = pot.k(), W = 1.1, D = 0.75, Hh = 0.6, x0 = x - W / 2, y0 = y - D / 2;
      const wire = mix(C.green, C.teal, 0.4);
      // The pot: a wire box, its back and floor first, then what's in it.
      face(ctx, [[x0, y0, z], [x0 + W, y0, z], [x0 + W, y0 + D, z], [x0, y0 + D, z]], shade(LAND.mud, 0.15), { lw: 0.03 });
      if (k > 0.2) {
        // The teeth: pink gums, white teeth, grinning.
        const [X, Y] = P(x, y, z + 0.08);
        ctx.beginPath(); ctx.ellipse(X, Y - 0.05, 0.24, 0.12, 0, 0, Math.PI * 2); paint(ctx, C.pink, { lw: 0.025 });
        ctx.beginPath(); ctx.rect(X - 0.19, Y - 0.1, 0.38, 0.09); paint(ctx, C.white, { lw: 0.02 });
        if (Q.detail) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.012; ctx.beginPath(); for (let i = -2; i <= 2; i++) { ctx.moveTo(X + i * 0.075, Y - 0.1); ctx.lineTo(X + i * 0.075, Y - 0.01); } ctx.stroke(); }
      }
      const mesh = (pts, col) => {
        face(ctx, pts, alpha(col, 0.18), { lw: 0.035, stroke: wire });
        if (!Q.detail) return;
        const [a, b, , d] = pts;
        ctx.beginPath();
        for (let i = 1; i < 5; i++) { const u = i / 5; const p0 = P(lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)), p1 = P(lerp(d[0], d[0] + b[0] - a[0], u), lerp(d[1], d[1] + b[1] - a[1], u), lerp(d[2], d[2] + b[2] - a[2], u)); ctx.moveTo(...p0); ctx.lineTo(...p1); }
        for (let i = 1; i < 3; i++) { const u = i / 3; const p0 = P(lerp(a[0], d[0], u), lerp(a[1], d[1], u), lerp(a[2], d[2], u)), p1 = P(lerp(b[0], b[0] + d[0] - a[0], u), lerp(b[1], b[1] + d[1] - a[1], u), lerp(b[2], b[2] + d[2] - a[2], u)); ctx.moveTo(...p0); ctx.lineTo(...p1); }
        ctx.strokeStyle = alpha(wire, 0.85); ctx.lineWidth = 0.02; ctx.stroke();
      };
      mesh([[x0, y0, z], [x0, y0 + D, z], [x0, y0 + D, z + Hh], [x0, y0, z + Hh]], wire);
      mesh([[x0, y0, z], [x0 + W, y0, z], [x0 + W, y0, z + Hh], [x0, y0, z + Hh]], wire);
      mesh([[x0 + W, y0, z], [x0 + W, y0 + D, z], [x0 + W, y0 + D, z + Hh], [x0 + W, y0, z + Hh]], wire);
      mesh([[x0, y0 + D, z], [x0 + W, y0 + D, z], [x0 + W, y0 + D, z + Hh], [x0, y0 + D, z + Hh]], wire);
      if (k <= 0.2) {
        // Shut, a white edge of teeth shows through the mesh at the front
        // (drawn over the sides, under a wire or two, so it isn't dimmed).
        const [X, Y] = P(x + 0.1, y + 0.15, z + 0.06);
        ctx.beginPath(); ctx.ellipse(X, Y - 0.04, 0.26, 0.12, 0, 0, Math.PI * 2); paint(ctx, C.pink, { lw: 0.025 });
        ctx.beginPath(); ctx.rect(X - 0.21, Y - 0.12, 0.42, 0.1); paint(ctx, C.white, { lw: 0.025 });
        if (Q.detail) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.014; ctx.beginPath(); for (let i = -2; i <= 2; i++) { ctx.moveTo(X + i * 0.08, Y - 0.12); ctx.lineTo(X + i * 0.08, Y - 0.02); } ctx.stroke(); }
        stick(ctx, [x - 0.1, y0 + D, z], [x - 0.1, y0 + D, z + Hh], wire, 0.025);
        stick(ctx, [x + 0.15, y0 + D, z], [x + 0.15, y0 + D, z + Hh], wire, 0.025);
      }
      // The lid, hinged along the back, never quite shut: up and over when it's open.
      const a = 0.16 + k * Math.PI * 0.55, c = Math.cos(a) * D, s = Math.sin(a) * D;
      const lidPts = [[x0, y0, z + Hh], [x0 + W, y0, z + Hh], [x0 + W, y0 + c, z + Hh + s], [x0, y0 + c, z + Hh + s]];
      mesh(lidPts, wire);
      // The lid's frame, a hinge bar along the back and a latch at the front.
      ctx.beginPath(); ctx.moveTo(...P(...lidPts[0])); for (const q of lidPts.slice(1)) ctx.lineTo(...P(...q)); ctx.closePath();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
      stick(ctx, [x0 - 0.04, y0, z + Hh], [x0 + W + 0.04, y0, z + Hh], C.grey, 0.06);
      const lx = x0 + W / 2, ly = y0 + c, lz = z + Hh + s;
      box(ctx, lx - 0.1, ly - 0.03, lz - (k < 0.2 ? 0.2 : 0.02), 0.2, 0.06, 0.22, C.mustard, { flat: true, lw: 0.025 });
      // Its line and buoy, lying on the mud.
      stick(ctx, [x0 + W, y0 + D / 2, z + Hh], [x + 1.1, y + 0.6, z + 0.05], C.ink, 0.02);
      cylinder(ctx, x + 1.15, y + 0.65, z, 0.13, 0.3, C.mustard, { flat: true });
      if (Q.detail) cylinder(ctx, x + 1.15, y + 0.65, z + 0.13, 0.135, 0.08, C.coral, { flat: true });
    }, { anim: true });
    R.find({ id: 'teeth', label: 'Some false teeth', kind: 'poke', inside: pot, at: [POT[0], POT[1], potZ + 0.15], r: 0.7, when: lowTide, note: 'low tide', hint: 'The crabs caught something odd this time. Low water shows you where they keep it.' });
    // A kayak paddle, drifting on the flood (high tide): Kayaker Three's.
    const paddleAt = (t) => [PADDLE[0] + Math.sin(t / 3) * 0.4, PADDLE[1] + Math.cos(t / 4) * 0.3, float(PADDLE[0], PADDLE[1], t) + 0.1];
    R.mover((t) => { const [x, y] = paddleAt(t); return { x, y }; }, (ctx, t) => {
      if (!highTide(t)) return;
      const [x, y, z] = paddleAt(t), a = t / 9, c = Math.cos(a) * 0.42, s = Math.sin(a) * 0.42;
      const zz = z - 0.08;
      if (Q.lines) { const [X, Y] = P(x, y, zz - 0.02); ctx.beginPath(); ctx.ellipse(X, Y, 0.75, 0.3, 0, 0, Math.PI * 2); ctx.strokeStyle = alpha(C.white, 0.7); ctx.lineWidth = 0.04; ctx.stroke(); }
      stick(ctx, [x - c, y - s, zz], [x + c, y + s, zz], C.ink, 0.06);
      for (const k of [-1, 1]) { const [X, Y] = P(x + k * c * 1.05, y + k * s * 1.05, zz); ctx.beginPath(); ctx.ellipse(X, Y, 0.2, 0.1, a * 0.5, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.03 }); }
    });
    R.find({ id: 'paddle', label: 'A kayak paddle', at: paddleAt, r: 0.8, when: highTide, note: 'high tide' });
  },
};
