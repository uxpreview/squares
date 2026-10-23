// Front of house: the middle of the floor. The stair arrives in the octagon
// tower at the back (the hero), reception (BACK IN 5 MINUTES, all day, the
// goose in the receptionist's chair with her headset on, and the Courier on
// the couch with his parcel), the kitchen (the fridge, the coffee machine QA
// broke, fish in the microwave, a cake for Steve) and at the front the pitch
// room, a glass box set up for Gander Cola.
//
// Running gags: NO SIGNAL. Raj from IT tries a new adapter every hour (crouch,
// plug, remote, despair, throw it on the pile), and at 3:58 it works. And
// Steve's cake: HAPPY BIRTHDAY STEVE, a slice gone an hour, each taken by
// someone asking who Steve is; nobody takes the last one, until the cleaner
// at nine.
import { C, Q, P, box, rect, disc, cylinder, face, paint, person, folk, goose, speech, plant as pot, shade, tint, alpha, hash } from '../../../engine/art.js';
import { schedule, particles } from '../../../engine/actors.js';
import { ZK } from '../../../engine/iso.js';
import { TONE, INK, BRAND, CHAIR, SIDING, PRIMAL } from '../style.js';
import { floorOf, backWall, sill, pod, staff, room, drawTower, lettering, mug, papers, plant } from '../kit.js';
import { bearOClock, rushK, seated, H, LOOP } from '../clock.js';
import { TOWER, PITCH, DOOR } from '../plan.js';

const wrap = (t) => (((t % LOOP) + LOOP) % LOOP);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;

// ---------- Painting on faces ----------
// Draw flat on an upright face along x (facing +y, toward the bottom left) or
// along y (facing +x), from (x, y, z): local u runs along the face to the
// right on screen, v runs down.
function onX(ctx, x, y, z, fn) {
  ctx.save();
  ctx.transform(1, 0.5, 0, ZK, x - y, (x + y) / 2 - z * ZK);
  fn(ctx);
  ctx.restore();
}
function onY(ctx, x, y, z, fn) {
  ctx.save();
  ctx.transform(1, -0.5, 0, ZK, x - y, (x + y) / 2 - z * ZK);
  fn(ctx);
  ctx.restore();
}
// Words at (u, v) in a face's own units.
function words(ctx, u, v, text, size, color = C.ink, font = 'Rethink Sans', align = 'center') {
  if (!Q.detail) return;
  ctx.save();
  ctx.translate(u, v);
  ctx.scale(1 / 40, 1 / 40);
  ctx.font = `700 ${size * 40}px "${font}", "Arial Black", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
function sheet(ctx, u, v, w, h, fill = C.white, lw = 0.025) {
  ctx.beginPath();
  ctx.rect(u, v, w, h);
  paint(ctx, fill, { lw });
}
// A goose in profile, flat (posters, the deck).
function goosePic(ctx, u, v, s) {
  ctx.save();
  ctx.translate(u, v);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.42, 0.24, -0.12, 0, Math.PI * 2);
  ctx.moveTo(-0.3, -0.05); ctx.lineTo(-0.55, -0.22); ctx.lineTo(-0.38, 0.08);
  paint(ctx, C.white, { lw: 0.06 });
  ctx.beginPath(); ctx.moveTo(0.22, -0.1); ctx.quadraticCurveTo(0.36, -0.3, 0.28, -0.62);
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.21; ctx.stroke();
  ctx.strokeStyle = C.white; ctx.lineWidth = 0.12; ctx.stroke();
  ctx.beginPath(); ctx.arc(0.28, -0.62, 0.12, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.05 });
  ctx.beginPath(); ctx.moveTo(0.37, -0.67); ctx.lineTo(0.6, -0.6); ctx.lineTo(0.37, -0.55); paint(ctx, C.coral, { lw: 0.04 });
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0.3, -0.65, 0.03, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
// A speech bubble, small, only close up.
function say(ctx, x, y, z, text) {
  if (Q.detail && text) speech(ctx, x, y, z, text, { size: 0.34 });
}

// ---------- People on their own clocks ----------
// A point k (0 to 1) of the way along a path of [x, y] points.
function along(pts, k) {
  const L = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(l); total += l; }
  let d = k * total;
  for (let i = 0; i < L.length; i++) {
    if (d <= L[i] || i === L.length - 1) {
      const f = L[i] ? clamp(d / L[i]) : 1;
      return [lerp(pts[i][0], pts[i + 1][0], f), lerp(pts[i][1], pts[i + 1][1], f)];
    }
    d -= L[i];
  }
  return pts[pts.length - 1];
}
const pathLen = (pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
// Someone who drops what they're doing at bear o'clock and runs to the glass
// (via: the way there, round the furniture), and comes back after. base(t)
// is where they'd be otherwise ({ gone } while they're not here).
function rush(base, via, delay = 0.4) {
  return (t) => {
    const p = base(t);
    if (p.gone || p.hidden) return p;
    const travel = 1.8 + pathLen([[p.x, p.y], ...via]) / 3.4;
    const r = rushK(t, travel, delay);
    if (r <= 0) return p;
    const [x, y] = along([[p.x, p.y], ...via], r);
    return { x, y, moving: r < 1, pose: r < 1 ? 'run' : 'point', dir: 'l', back: false, rushing: true };
  };
}
// Inside the stair tower (on the way up or down), nobody's drawn.
const IN = [44, 5.4], STAIR = [44, 7.5];
const inside = (p) => p.y < 7.05 && Math.abs(p.x - 44) < 2.6;

// ---------- Raj and the screen ----------
// The screen works at 3:58.
const WORKS = 15.97;
const RAJ = { tv: [41.3, 22.5], stand: [42.3, 24.0], pile: [41.8, 24.5], proud: [41.6, 20.4], glass: [42.4, 25.1] };
const ADAPTERS = [C.white, C.grey, C.black, C.mustard, C.teal, C.coral, C.lilac, C.sky];
const RAJ_SAYS = ['Try HDMI 2.', 'It\'s the dongle.', 'Anyone got USB-C?', 'Off and on again.', 'It worked yesterday.', 'Whose laptop is this?', 'It\'s the TV, isn\'t it.'];
// How many wrong adapters he's thrown on the pile today (one an hour, from
// ten to four), on top of yesterday's.
const tossed = (h) => (h < 9 ? 0 : clamp(Math.floor(h - 9.86) + 1, 0, 7));
// Raj's hour: walk the new adapter to the screen, crouch and plug it in, step
// back and try the remote (the screen searches), despair, throw it on the
// pile, fetch the next.
function rajAt(t) {
  const h = H(t);
  if (!seated(t, 0.05)) return { gone: true, x: RAJ.stand[0], y: RAJ.stand[1] };
  if (h < 9) return { x: RAJ.stand[0], y: RAJ.stand[1], pose: 'read', dir: 'l', hold: 'manual' };
  if (h >= WORKS) {
    if (h < WORKS + 0.18) return { x: RAJ.stand[0], y: RAJ.stand[1], pose: 'cheer', dir: 'r', say: 'IT WORKS!' };
    return { x: RAJ.proud[0], y: RAJ.proud[1], pose: 'stand', dir: 'r' };
  }
  const f = h % 1, k = Math.floor(h - 9);
  const walk = (a, b, f0, f1, hold) => {
    const q = clamp((f - f0) / (f1 - f0));
    const dX = (b[0] - a[0]) - (b[1] - a[1]);
    return { x: lerp(a[0], b[0], q), y: lerp(a[1], b[1], q), moving: true, pose: 'walk', dir: dX >= 0 ? 'r' : 'l', back: (b[0] - a[0]) + (b[1] - a[1]) < 0, hold };
  };
  if (f < 0.08) return walk(RAJ.pile, RAJ.tv, 0, 0.08, 'adapter');
  if (f < 0.45) return { x: RAJ.tv[0], y: RAJ.tv[1], z: -0.35, pose: 'sit', dir: 'l', back: true, fiddle: true };
  if (f < 0.52) return walk(RAJ.tv, RAJ.stand, 0.45, 0.52, 'remote');
  if (f < 0.76) return { x: RAJ.stand[0], y: RAJ.stand[1], pose: 'point', dir: 'l', hold: 'remote' };
  if (f < 0.86) return { x: RAJ.stand[0], y: RAJ.stand[1], pose: 'stand', dir: 'l', arms: [Math.PI - 0.45, -Math.PI + 0.45], say: RAJ_SAYS[k % RAJ_SAYS.length] };
  if (f < 0.9) return { x: RAJ.stand[0], y: RAJ.stand[1], pose: 'point', dir: 'l' };
  if (f < 0.96) return walk(RAJ.stand, RAJ.pile, 0.9, 0.96);
  return { x: RAJ.pile[0], y: RAJ.pile[1], pose: 'read', dir: 'l', back: true, hold: 'adapter' };
}
// What the big screen shows.
function tvShows(t) {
  const h = H(t);
  if (h < 7.6 || h >= 17.3) return 'off';
  if (h >= WORKS) return 'deck';
  if (h >= 9 && rushK(t) <= 0) { const f = h % 1; if (f >= 0.55 && f < 0.72) return 'search'; }
  return 'nosignal';
}
const tri = (v) => 1 - Math.abs((((v % 2) + 2) % 2) - 1);
// The big screen's picture, on its face (x = 40.52, y 23.5 to 20.5, z 2.55
// down to 1.15): local u 0 to 3, v 0 to 1.4.
function tvPicture(ctx, t) {
  const show = tvShows(t);
  onY(ctx, 40.52, 23.5, 2.55, (c) => {
    const W = 3, Hh = 1.4;
    const bg = show === 'off' ? C.black : show === 'deck' ? (Math.floor(wrap(t) / 3.5) % 4 === 1 || Math.floor(wrap(t) / 3.5) % 4 === 2 ? C.white : BRAND.can) : C.navy;
    c.beginPath(); c.rect(0, 0, W, Hh); c.fillStyle = bg; c.fill();
    if (show === 'off') { c.fillStyle = C.red; c.beginPath(); c.arc(W - 0.12, Hh - 0.1, 0.03, 0, Math.PI * 2); c.fill(); return; }
    if (show === 'nosignal') {
      // The NO SIGNAL box drifts round the screen, the way it does.
      const u = tri(t * 0.17) * (W - 1.3), v = tri(t * 0.23) * (Hh - 0.42);
      c.beginPath(); c.rect(u + 0.05, v + 0.05, 1.2, 0.32);
      c.strokeStyle = C.white; c.lineWidth = 0.03; c.stroke();
      words(c, u + 0.65, v + 0.22, 'NO SIGNAL', 0.2, C.white);
      return;
    }
    if (show === 'search') {
      words(c, W / 2, Hh / 2, 'SEARCHING' + '.'.repeat(Math.floor(t * 3) % 4), 0.2, C.white, 'Rethink Sans', 'center');
      return;
    }
    // The Gander Cola deck.
    const slide = Math.floor(wrap(t) / 3.5) % 4;
    if (slide === 0) {
      words(c, W / 2, 0.58, 'GANDER COLA', 0.42, C.white, 'Bagel Fat One');
      words(c, W / 2, 1.05, 'TAKE A GANDER', 0.16, C.white);
    } else if (slide === 1) {
      words(c, 0.2, 0.22, 'SALES, WITH US', 0.15, C.ink, 'Rethink Sans', 'left');
      [0.25, 0.4, 0.55, 0.85, 1.0].forEach((v, i) => { c.beginPath(); c.rect(0.5 + i * 0.42, 1.25 - v, 0.28, v); c.fillStyle = i === 4 ? BRAND.can : C.grey; c.fill(); });
    } else if (slide === 2) {
      goosePic(c, 1.0, 1.05, 0.95);
      words(c, 2.05, 0.6, 'THE GOOSE', 0.2, BRAND.can, 'Bagel Fat One');
      words(c, 2.05, 0.9, 'IS THE BRAND.', 0.14, C.ink);
    } else {
      words(c, W / 2, Hh / 2, 'QUESTIONS?', 0.34, C.white, 'Bagel Fat One');
    }
  });
}

// ---------- Furniture ----------
// A chair at a table, its back toward -y (side -1) or +y (side 1).
function seatY(ctx, x, y, side, color = CHAIR) {
  if (Q.detail) for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    const [X, Y] = P(x + Math.cos(a) * 0.3, y + Math.sin(a) * 0.3, 0.04);
    ctx.beginPath(); ctx.arc(X, Y, 0.05, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
  }
  box(ctx, x - 0.04, y - 0.04, 0.06, 0.08, 0.08, 0.38, C.ink, { flat: true, stroke: false });
  const by = side < 0 ? y - 0.37 : y + 0.27;
  if (side < 0) box(ctx, x - 0.28, by, 0.56, 0.56, 0.1, 0.78, color, { flat: true, lw: 0.03, top: tint(color, 0.15) });
  box(ctx, x - 0.3, y - 0.3, 0.44, 0.6, 0.6, 0.13, color, { flat: true, lw: 0.03 });
  if (side > 0) box(ctx, x - 0.28, by, 0.56, 0.56, 0.1, 0.78, color, { flat: true, lw: 0.03, top: tint(color, 0.15) });
}
// One half of the pitch table (split at the seam at x 48), and what's on it
// all day: a printed deck at every place, Gander Cola, the laptop.
const TABLE = { y0: 21.6, y1: 23.6, top: 1.13 };
const PLACES = [44.6, 46.8, 49, 51.2];
function tableHalf(ctx, x0, x1) {
  const { y0, y1, top } = TABLE;
  for (const lx of [x0 + 0.9, x1 - 0.9]) {
    box(ctx, lx - 0.5, (y0 + y1) / 2 - 0.12, 0, 1.0, 0.24, 0.05, C.ink, { flat: true, stroke: false });
    box(ctx, lx - 0.1, (y0 + y1) / 2 - 0.1, 0.05, 0.2, 0.2, top - 0.13, shade(C.greyLight, 0.25), { flat: true, lw: 0.025 });
  }
  box(ctx, x0, y0, top - 0.08, x1 - x0, y1 - y0, 0.08, C.wood, { flat: true, lw: 0.035, top: tint(C.wood, 0.12) });
  for (const px of PLACES) {
    if (px < x0 || px >= x1) continue;
    papers(ctx, px + 0.15, y0 + 0.35, top, 2);
    papers(ctx, px - 0.15, y1 - 0.35, top, 2);
  }
}

// The couch: one piece per cushion (it runs over the seam at y 16).
const COUCH = { x0: 33.2, x1: 35.3, back: 33.62, seat: 0.35, cushion: 0.22 };
const TEAL = C.teal;
function couchPart(ctx, y0, y1, arm) {
  const { x0, x1, back, seat } = COUCH;
  box(ctx, back, y0, 0.06, x1 - back, y1 - y0, seat - 0.06, shade(TEAL, 0.1), { flat: true, lw: 0.035 });
  box(ctx, x0, y0, 0.06, back - x0, y1 - y0, 1.2, TEAL, { flat: true, lw: 0.035, top: tint(TEAL, 0.15) });
  if (arm < 0) box(ctx, x0, y0 - 0.3, 0.06, x1 - x0, 0.3, 0.75, TEAL, { flat: true, lw: 0.035, top: tint(TEAL, 0.15) });
  // Little legs.
  for (const lx of [x0 + 0.05, x1 - 0.12]) box(ctx, lx, y1 - 0.12, 0, 0.07, 0.07, 0.07, C.ink, { flat: true, stroke: false });
}
function cushion(ctx, y0, y1, lift = 0, tilt = 0) {
  const { back, x1, seat, cushion: h } = COUCH;
  const z = seat + lift;
  if (!tilt) { box(ctx, back + 0.03, y0 + 0.03, z, x1 - back - 0.06, y1 - y0 - 0.06, h, tint(TEAL, 0.08), { flat: true, lw: 0.03, top: tint(TEAL, 0.22) }); return; }
  // Lifted and tipped back against the backrest, its underside to us.
  const a = back + 0.05, b = x1 - 0.05;
  const lo = [[b - tilt * 0.9, y0 + 0.05, z], [b - tilt * 0.9, y1 - 0.05, z]];
  const hi = [[a, y1 - 0.05, z + tilt * 0.9], [a, y0 + 0.05, z + tilt * 0.9]];
  face(ctx, [...lo, ...hi], shade(TEAL, 0.05), { lw: 0.03, dots: shade(TEAL, 0.4), density: 0.15 });
  face(ctx, [lo[1], [lo[1][0], lo[1][1], lo[1][2] + h], [hi[0][0], hi[0][1], hi[0][2] + h], hi[0]], tint(TEAL, 0.08), { lw: 0.03 });
}

// The fridge, closed or swung open (k 0 to 1). Hinged at its left edge.
const FR = { x0: 54.5, x1: 55.8, y0: 0.45, y1: 1.85, h: 2.5 };
function fridgeFront(ctx, k, t) {
  const { x0, x1, y1, h } = FR;
  const y = y1 + 0.005;
  if (k > 0.03) {
    // Inside: lit, three shelves of Gander Cola, a lunch with a name on it.
    face(ctx, [[x0 + 0.06, y, 0.12], [x1 - 0.06, y, 0.12], [x1 - 0.06, y, h - 0.08], [x0 + 0.06, y, h - 0.08]], C.butter, { lw: 0.03 });
    for (const sz of [0.75, 1.35, 1.9]) face(ctx, [[x0 + 0.06, y, sz], [x1 - 0.06, y, sz], [x1 - 0.06, y + 0.02, sz + 0.03], [x0 + 0.06, y + 0.02, sz + 0.03]], C.white, { lw: 0.02 });
    onX(ctx, x0, y + 0.01, h, (c) => {
      for (const [v, n] of [[0.6, 5], [1.15, 5]]) for (let i = 0; i < n; i++) {
        c.beginPath(); c.roundRect(0.14 + i * 0.22, v - 0.03, 0.16, 0.26, 0.04); paint(c, BRAND.can, { lw: 0.02 });
        c.fillStyle = C.white; c.fillRect(0.16 + i * 0.22, v + 0.08, 0.12, 0.03);
      }
      sheet(c, 0.2, 1.42, 0.55, 0.3, C.sky);
      words(c, 0.47, 1.57, 'NOT GREG\'S', 0.08, C.ink);
      c.beginPath(); c.roundRect(0.85, 1.38, 0.3, 0.34, 0.05); paint(c, C.coral, { lw: 0.02 });
      sheet(c, 0.25, 1.98, 0.8, 0.2, C.leaf);
    });
  }
  // The door: swings round its hinge toward us.
  const a = k * 1.35, W = x1 - x0;
  const ex = x0 + Math.cos(a) * W, ey = y1 + Math.sin(a) * W;
  const outer = Math.cos(a) - Math.sin(a) > 0;
  face(ctx, [[x0, y, 0.05], [ex, ey + 0.005, 0.05], [ex, ey + 0.005, h - 0.02], [x0, y, h - 0.02]], outer ? C.white : tint(C.greyLight, 0.3), { lw: 0.035 });
  if (outer && k < 0.1) {
    // Closed: the freezer line, the handle, magnets and the sign.
    face(ctx, [[x0, y, 1.75], [x1, y, 1.75]], null, { lw: 0.03 });
    box(ctx, x1 - 0.2, y, 0.9, 0.06, 0.06, 0.65, C.grey, { flat: true, lw: 0.02 });
    box(ctx, x1 - 0.2, y, 1.85, 0.06, 0.06, 0.4, C.grey, { flat: true, lw: 0.02 });
    onX(ctx, x0, y + 0.01, h, (c) => {
      sheet(c, 0.18, 1.0, 0.8, 0.5);
      words(c, 0.58, 1.13, 'LABELED', 0.11, C.red);
      words(c, 0.58, 1.27, 'FOOD ONLY', 0.11, C.red);
      words(c, 0.58, 1.4, '(GREG)', 0.07, C.ink);
      for (const [u, v, col] of [[0.3, 0.3, C.mustard], [0.6, 0.45, C.teal], [0.85, 0.25, C.pink], [0.4, 1.9, C.coral]]) { c.beginPath(); c.arc(u, v, 0.06, 0, Math.PI * 2); paint(c, col, { lw: 0.02 }); }
      sheet(c, 0.55, 1.7, 0.35, 0.45, C.white);
      goosePic(c, 0.72, 2.02, 0.28);
    });
  } else if (!outer) {
    // The inside of the door: milk, ketchup, something green.
    const sh = [0.5, 1.2, 1.9];
    for (const sz of sh) {
      const m = (u) => [lerp(x0, ex, u), lerp(y, ey, u)];
      const [ax, ay] = m(0.12), [bx, by] = m(0.88);
      face(ctx, [[ax, ay, sz], [bx, by, sz], [bx, by, sz + 0.12], [ax, ay, sz + 0.12]], C.white, { lw: 0.02 });
      const [cx, cy] = m(0.3), [dx, dy] = m(0.6);
      box(ctx, cx - 0.06, cy - 0.06, sz + 0.12, 0.12, 0.12, 0.32, sz > 1 ? C.red : C.white, { flat: true, lw: 0.02 });
      box(ctx, dx - 0.06, dy - 0.06, sz + 0.12, 0.12, 0.12, 0.26, sz > 1.5 ? C.leaf : C.mustard, { flat: true, lw: 0.02 });
    }
  }
  void t;
}

// Steve's cake: eight slices, eaten from the one nearest us round. n: left.
function cake(ctx, cx, cy, z, n) {
  const r = 0.42, h = 0.26, N = 8, step = (Math.PI * 2) / N;
  const sl = [];
  for (let i = N - n; i < N; i++) sl.push(i);
  const span = (i) => [Math.PI / 4 + (i - 0.5) * step, Math.PI / 4 + (i + 0.5) * step];
  const at = (a, zz) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r, zz];
  sl.sort((p, q) => { const m = (i) => { const [a0, a1] = span(i); const mm = (a0 + a1) / 2; return Math.cos(mm) + Math.sin(mm); }; return m(p) - m(q); });
  for (const i of sl) {
    const [a0, a1] = span(i);
    const cut = (a, nx, ny) => {
      if (nx + ny <= 0) return;
      face(ctx, [[cx, cy, z], at(a, z), at(a, z + h), [cx, cy, z + h]], C.woodLight, { lw: 0.02 });
      face(ctx, [[cx, cy, z + h * 0.45], at(a, z + h * 0.45), at(a, z + h * 0.6), [cx, cy, z + h * 0.6]], C.pink, { stroke: false });
    };
    if (n < N && i === N - n) cut(a0, Math.sin(a0), -Math.cos(a0));
    if (n < N && i === N - 1) cut(a1, -Math.sin(a1), Math.cos(a1));
    for (let s = 0; s < 3; s++) {
      const b0 = a0 + (s / 3) * step, b1 = a0 + ((s + 1) / 3) * step, m = (b0 + b1) / 2;
      if (Math.cos(m) + Math.sin(m) <= 0) continue;
      face(ctx, [at(b0, z), at(b1, z), at(b1, z + h), at(b0, z + h)], C.white, { lw: 0.02 });
      face(ctx, [at(b0, z + h - 0.06), at(b1, z + h - 0.06), at(b1, z + h), at(b0, z + h)], C.pink, { stroke: false });
    }
    const top = [[cx, cy, z + h]];
    for (let s = 0; s <= 3; s++) top.push(at(a0 + (s / 3) * step, z + h));
    face(ctx, top, C.white, { lw: 0.02 });
    if (Q.detail) { const [X, Y] = P(...at((a0 + a1) / 2, z + h).map((v, j) => (j < 2 ? lerp(j ? cy : cx, v, 0.7) : v))); ctx.beginPath(); ctx.arc(X, Y, 0.035, 0, Math.PI * 2); ctx.fillStyle = C.red; ctx.fill(); }
  }
}
// One slice on its own, cut side to us.
function slice(ctx, cx, cy, z) {
  const r = 0.36, h = 0.24, a0 = Math.PI / 2 - Math.PI / 8 - 0.25, a1 = Math.PI / 2 + Math.PI / 8 - 0.25;
  const at = (a, zz) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r, zz];
  face(ctx, [[cx, cy, z], at(a0, z), at(a0, z + h), [cx, cy, z + h]], C.woodLight, { lw: 0.02 });
  face(ctx, [[cx, cy, z + h * 0.45], at(a0, z + h * 0.45), at(a0, z + h * 0.6), [cx, cy, z + h * 0.6]], C.pink, { stroke: false });
  face(ctx, [at(a0, z), at(a1, z), at(a1, z + h), at(a0, z + h)], C.white, { lw: 0.02 });
  face(ctx, [at(a0, z + h - 0.06), at(a1, z + h - 0.06), at(a1, z + h), at(a0, z + h)], C.pink, { stroke: false });
  face(ctx, [[cx, cy, z + h], at(a0, z + h), at((a0 + a1) / 2, z + h), at(a1, z + h)], C.white, { lw: 0.02 });
  const [X, Y] = P(...at((a0 + a1) / 2, z + h).map((v, j) => (j < 2 ? lerp(j ? cy : cx, v, 0.6) : v)));
  ctx.beginPath(); ctx.arc(X, Y, 0.04, 0, Math.PI * 2); ctx.fillStyle = C.red; ctx.fill();
}
// The cake's day: a slice gone at each of these (loop seconds, about one an
// hour, avoiding bear o'clock), the last one left for the cleaner at nine.
const CUTS = [36, 53, 97, 114, 148, 166, 183];
const CLEANER_EATS = 283;
const slicesLeft = (t) => { const s = wrap(t); return s >= CLEANER_EATS ? 0 : 8 - CUTS.filter((c) => s >= c).length; };
const TAKERS = ['Happy birthday, Steve!', 'Who\'s Steve?', 'For Steve.', 'Is Steve in today?', 'Steve would want this.', 'Happy birthday... Steve?', 'Last bit\'s for Steve.'];

export default {
  id: 'front',
  name: 'Front of house',
  blurb: 'Reception will be back in five minutes, any minute now. In the pitch room, the screen has said NO SIGNAL since nine.',
  describe: 'The middle of the floor: an eight-sided stair tower at the back, an empty reception desk, a courier waiting on the couch, a kitchen with a broken coffee machine and a cake going a slice an hour, and a glass pitch room whose screen won\'t work until four.',

  build(R) {
    floorOf(R, 32, 56, { floor: TONE.front, door: DOOR[0], name: 'FRONT OF HOUSE', nameAt: [37, 13.2] });
    backWall(R, 32, 56);
    sill(R, 32, 56);

    // ---------- Floors ----------
    R.rug((ctx) => {
      // The kitchen's vinyl, the reception rug, and a red carpet out of the
      // pitch room for the client (somebody took "roll out the red carpet"
      // literally).
      rect(ctx, 47.9, 0.3, 8.1, 6.6, 0, tint(C.greyLight, 0.35), { stroke: false });
      if (Q.detail) for (let x = 47.9; x < 55.9; x += 0.8) for (let y = 0.3; y < 6.8; y += 0.8) if (Math.round((x + y) / 0.8) % 2) rect(ctx, x, y, 0.8, Math.min(0.8, 6.9 - y), 0, tint(C.grey, 0.45), { stroke: false });
      rect(ctx, 32.9, 14.0, 4.6, 4.7, 0, C.mustard, { stroke: false });
      rect(ctx, 33.2, 14.3, 4.0, 4.1, 0, C.butter, { stroke: false, dots: shade(C.butter, 0.3), density: 0.12 });
      rect(ctx, 47.05, 14.1, 1.3, 4.3, 0, BRAND.can, { lw: 0.03, dots: shade(BRAND.can, 0.35), density: 0.12 });
      for (const ex of [47.12, 48.28]) rect(ctx, ex - 0.03, 14.1, 0.06, 4.3, 0, C.mustard, { stroke: false });
      // Raj's cables, from the screen all over the floor.
      if (Q.detail) {
        ctx.lineCap = 'round';
        const cable = (col, pts) => {
          ctx.beginPath();
          const p0 = P(...pts[0]);
          ctx.moveTo(...p0);
          for (let i = 1; i + 1 < pts.length; i += 2) ctx.quadraticCurveTo(...P(...pts[i]), ...P(...pts[i + 1]));
          ctx.strokeStyle = C.ink; ctx.lineWidth = 0.08; ctx.stroke();
          ctx.strokeStyle = col; ctx.lineWidth = 0.045; ctx.stroke();
        };
        cable(C.black, [[40.6, 21.4], [41.8, 20.4], [42.2, 21.6], [42.6, 22.6], [43.3, 22.2]]);
        cable(C.white, [[40.6, 22.4], [41.9, 23.6], [41.2, 24.2], [40.6, 24.9], [41.0, 25.2]]);
        cable(C.grey, [[40.6, 22.0], [41.6, 19.6], [40.8, 19.3]]);
        cable(C.red, [[40.6, 21.0], [42.6, 21.0], [42.0, 23.0], [41.4, 23.2], [41.9, 23.9]]);
        cable(C.teal, [[40.7, 23.0], [42.8, 25.0], [43.6, 24.2]]);
      }
    });
    R.rug((ctx) => {
      // PLEASE WAIT HERE, on the floor in front of reception.
      if (!Q.detail) return;
      ctx.save();
      ctx.transform(1, 0.5, -1, 0.5, 35 - 10.6, (35 + 10.6) / 2);
      ctx.scale(1 / 40, 1 / 40);
      ctx.font = `700 ${0.3 * 40}px "Rethink Sans", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = alpha(C.ink, 0.55);
      ctx.fillText('PLEASE WAIT HERE', 0, 0);
      ctx.restore();
    });

    // ---------- The stair tower ----------
    // The hero. Sorted behind anyone standing in front of its door (it's wide,
    // so its front corner would put it in front of them).
    R.thing(TOWER.x + TOWER.r * 0.7, TOWER.y + TOWER.r * 0.7, (ctx, t) => drawTower(ctx, t), { anim: true, depth: 47.5 });
    // The call button beside the door, for a lift that doesn't exist, and
    // the signs.
    const call = R.poke({ id: 'call', at: [44.9, 6.85, 1.3], r: 0.7, say: 'Floors 1 and 2 are closed. Don\'t ask.', hold: 1.5 });
    R.thing(44.9, 6.82, (ctx) => {
      const y = 6.785;
      onX(ctx, 44.6, y, 1.55, (c) => {
        sheet(c, 0.12, 0, 0.3, 0.5, C.greyLight);
        sheet(c, -0.95, -0.95, 0.9, 0.35, C.white);
        words(c, -0.5, -0.82, 'FLOORS 1 & 2', 0.09, C.ink);
        words(c, -0.5, -0.7, 'CLOSED', 0.09, C.red);
      });
      lettering(ctx, 'x', 44, y + 0.01, 3.1, '3', 0.45, PRIMAL, 'Bagel Fat One');
    });
    R.thing(44.92, 6.84, (ctx, t) => {
      const lit = call.k() > 0.1 && Math.sin(t * 12) > -0.6;
      onX(ctx, 44.6, 6.79, 1.55, (c) => {
        for (const [v, up] of [[0.14, true], [0.35, false]]) {
          c.beginPath(); c.arc(0.27, v, 0.07, 0, Math.PI * 2); paint(c, lit && up ? C.mustard : C.white, { lw: 0.02 });
          c.beginPath(); c.moveTo(0.23, v + (up ? 0.02 : -0.02)); c.lineTo(0.31, v + (up ? 0.02 : -0.02)); c.lineTo(0.27, v + (up ? -0.03 : 0.03)); c.closePath(); c.fillStyle = C.ink; c.fill();
        }
      });
    }, { anim: true });

    // ---------- Reception ----------
    // A logo wall behind the desk, the desk, its sign, and in the
    // receptionist's chair, with her headset on, the goose.
    R.thing(35.5, 5.65, (ctx) => {
      box(ctx, 33.3, 4.9, 0, 4.4, 0.3, 2.7, SIDING, { flat: true, lw: 0.04, top: C.white });
      lettering(ctx, 'x', 35.5, 5.21, 1.85, 'PRIMAL', 0.82, PRIMAL, 'Bagel Fat One');
      lettering(ctx, 'x', 35.5, 5.21, 1.12, 'IDEAS WITH TEETH', 0.19, C.ink);
      pot(ctx, 38.25, 5.4, 0, 0, { kind: 'palm', scale: 1.15, potColor: C.white });
    }, { depth: 38 });
    R.thing(33.3, 5.85, (ctx) => seatY(ctx, 33.3, 6.1, -1, CHAIR));
    R.goose([33.3, 6.1, 0.6], { kind: 'hard', dir: 'r', pose: 'sit', hint: 'Somebody is covering reception, and doing a better job than the sign.' });
    // The receptionist's headset, on the goose.
    R.thing(33.35, 6.11, (ctx) => {
      const [X, Y] = P(33.3, 6.1, 0.6);
      ctx.save();
      ctx.translate(X, Y);
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0.28, -0.84, 0.15, Math.PI * 1.05, Math.PI * 1.95);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0.2, -0.8, 0.05, 0.065, 0, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
      ctx.beginPath(); ctx.moveTo(0.2, -0.77); ctx.quadraticCurveTo(0.26, -0.66, 0.44, -0.7);
      ctx.lineWidth = 0.03; ctx.stroke();
      ctx.beginPath(); ctx.arc(0.45, -0.7, 0.03, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }, { depth: 39.42 });
    // The desk: white, a wooden ledge along the front, the sign taped to it.
    R.thing(35, 9.4, (ctx) => {
      box(ctx, 33.0, 7.0, 0, 4.0, 2.4, 1.08, tint(INK.birch, 0.2), { flat: true, lw: 0.04, top: C.white });
      box(ctx, 33.0, 8.95, 1.08, 3.0, 0.45, 0.32, C.wood, { flat: true, lw: 0.035, top: tint(C.wood, 0.15) });
      // Her monitor (its back to us), the phone, the sign-in book, mints.
      box(ctx, 33.9, 7.35, 1.08, 0.06, 0.06, 0.3, C.ink, { flat: true, stroke: false });
      box(ctx, 33.45, 7.1, 1.38, 0.95, 0.1, 0.62, C.black, { flat: true, lw: 0.03 });
      box(ctx, 35.4, 7.85, 1.08, 0.5, 0.4, 0.1, C.ink, { flat: true, lw: 0.02 });
      box(ctx, 35.42, 7.88, 1.18, 0.18, 0.34, 0.08, C.black, { flat: true, lw: 0.02 });
      papers(ctx, 34.8, 8.55, 1.08, 2);
      disc(ctx, 33.5, 9.17, 1.405, 0.14, C.white, { lw: 0.02 });
      if (Q.detail) for (let i = 0; i < 4; i++) { const [X, Y] = P(33.45 + (i % 2) * 0.09, 9.12 + (i >> 1) * 0.09, 1.43); ctx.beginPath(); ctx.arc(X, Y, 0.035, 0, Math.PI * 2); ctx.fillStyle = i % 2 ? C.red : C.white; ctx.fill(); }
      plant(ctx, 36.6, 7.9, 1.08, 0.45);
      // The sign.
      onX(ctx, 33.3, 9.405, 0.95, (c) => {
        sheet(c, 0, 0, 3.4, 0.56, C.white, 0.03);
        words(c, 1.7, 0.29, 'BACK IN 5 MINUTES', 0.3, C.red, 'Bagel Fat One');
        c.beginPath(); c.rect(2.6, 0.48, 0.42, 0.34); paint(c, INK.sticky, { lw: 0.02 });
        words(c, 2.81, 0.6, 'since', 0.08, C.ink);
        words(c, 2.81, 0.72, '9am', 0.08, C.ink);
      });
    });
    // The bell (the thing to ring first) and the phone's hold light.
    const bell = R.poke({ id: 'bell', at: [36.4, 8.8, 1.3], r: 0.8, say: 'Ding. Back in 5 minutes.', teach: true, hold: 1.2 });
    R.thing(36.4, 8.95, (ctx, t) => {
      const k = bell.k();
      const z = 1.08 + Math.abs(Math.sin(k * Math.PI * 3)) * 0.06 * k;
      disc(ctx, 36.4, 8.8, 1.09, 0.2, C.ink, { lw: 0.02 });
      const [X, Y] = P(36.4, 8.8, z + 0.04);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.25, 0.1, 0, 0, Math.PI); ctx.lineTo(X - 0.25, Y);
      ctx.moveTo(X - 0.25, Y); ctx.bezierCurveTo(X - 0.25, Y - 0.3, X + 0.25, Y - 0.3, X + 0.25, Y);
      paint(ctx, C.mustard, { lw: 0.03 });
      ctx.beginPath(); ctx.arc(X, Y - 0.25, 0.045, 0, Math.PI * 2); paint(ctx, C.ink, { lw: 0.01 });
      if (k > 0.05 && Q.detail) {
        ctx.strokeStyle = alpha(C.ink, k); ctx.lineWidth = 0.035;
        for (const s of [-1, 1]) for (const r of [0.38, 0.5]) { ctx.beginPath(); ctx.arc(X, Y - 0.15, r, s > 0 ? -0.6 : Math.PI - 0.2, s > 0 ? 0.2 : Math.PI + 0.6); ctx.stroke(); }
      }
      // Line 1 on hold, all day.
      if (Math.floor(t * 1.5) % 2) { const [PX, PY] = P(35.85, 7.95, 1.19); ctx.beginPath(); ctx.arc(PX, PY, 0.04, 0, Math.PI * 2); ctx.fillStyle = C.coral; ctx.fill(); }
    }, { anim: true });

    // ---------- The couch, the Courier's all day ----------
    // He sits on the first cushion (day.js); the earbud is down the side of
    // the second, a bit of white wire showing at the seam.
    const couch = R.poke({ id: 'couch', at: [34.4, 16.9, 0.7], r: 0.9, say: 'Crumbs, a pen, forty cents.' });
    R.thing(34.3, 15.98, (ctx) => {
      couchPart(ctx, 14.25, 16.0, -1);
      cushion(ctx, 14.25, 16.0);
    });
    R.thing(34.3, 17.85, (ctx) => {
      const k = couch.k();
      couchPart(ctx, 16.0, 17.55, 0);
      if (k > 0.05) {
        // Under the cushion: crumbs, coins, a pen, and the earbud.
        const z = COUCH.seat + 0.005;
        if (Q.detail) for (let i = 0; i < 9; i++) { const [X, Y] = P(33.8 + hash(i, 3) * 1.3, 16.15 + hash(i, 5) * 1.2, z); ctx.beginPath(); ctx.arc(X, Y, 0.025, 0, Math.PI * 2); ctx.fillStyle = C.woodLight; ctx.fill(); }
        disc(ctx, 34.9, 16.45, z, 0.07, C.mustard, { lw: 0.015 });
        disc(ctx, 35.0, 16.65, z, 0.06, C.greyLight, { lw: 0.015 });
        box(ctx, 33.9, 16.3, z, 0.6, 0.05, 0.05, C.teal, { flat: true, lw: 0.015 });
        const [X, Y] = P(34.5, 16.8, z);
        ctx.beginPath(); ctx.ellipse(X, Y - 0.06, 0.09, 0.07, 0.3, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.025 });
        ctx.beginPath(); ctx.moveTo(X + 0.06, Y - 0.02); ctx.lineTo(X + 0.12, Y + 0.1); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke(); ctx.strokeStyle = C.white; ctx.lineWidth = 0.025; ctx.stroke();
      }
      cushion(ctx, 16.0, 17.55, k * 0.25, k > 0.05 ? k : 0);
      if (k <= 0.05 && Q.detail) {
        // A loop of white wire out of the seam between the cushions.
        const [X, Y] = P(34.1, 16.02, COUCH.seat + COUCH.cushion);
        ctx.beginPath(); ctx.moveTo(X - 0.05, Y); ctx.bezierCurveTo(X - 0.1, Y - 0.25, X + 0.25, Y - 0.25, X + 0.2, Y + 0.02);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.055; ctx.stroke();
        ctx.strokeStyle = C.white; ctx.lineWidth = 0.03; ctx.stroke();
      }
      box(ctx, COUCH.x0, 17.55, 0.06, COUCH.x1 - COUCH.x0, 0.3, 0.75, TEAL, { flat: true, lw: 0.035, top: tint(TEAL, 0.15) });
    }, { anim: true });
    R.find({ id: 'earbud', label: 'A lost earbud', kind: 'poke', inside: couch, at: [34.5, 16.8, 0.45], r: 0.8, hint: 'Somebody lost something small down the side of the couch.' });
    // A coffee table with this month's AD WEAK, and a plant.
    R.thing(36.3, 17.5, (ctx) => {
      box(ctx, 35.7, 16.3, 0, 1.2, 1.2, 0.42, C.wood, { flat: true, lw: 0.03, top: tint(C.wood, 0.15) });
      box(ctx, 35.85, 16.45, 0.42, 0.55, 0.4, 0.03, C.white, { flat: true, lw: 0.02 });
      box(ctx, 36.1, 16.9, 0.42, 0.55, 0.42, 0.04, C.coral, { flat: true, lw: 0.02 });
      if (Q.detail) { const [X, Y] = P(36.37, 17.11, 0.47); ctx.save(); ctx.translate(X, Y); ctx.transform(1, 0.5, -1, 0.5, 0, 0); ctx.scale(1 / 40, 1 / 40); ctx.font = '700 4px "Rethink Sans", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = C.white; ctx.fillText('AD WEAK', 0, 0); ctx.restore(); }
      mug(ctx, 35.95, 17.25, 0.42, C.mustard);
    });
    R.thing(33.6, 18.9, (ctx) => pot(ctx, 33.6, 18.9, 0, 0, { kind: 'leafy', scale: 0.95, potColor: C.white }));

    // ---------- The printer, behind reception ----------
    R.thing(39.5, 2.2, (ctx) => {
      box(ctx, 38.8, 1.3, 0, 1.3, 0.9, 0.85, C.greyLight, { flat: true, lw: 0.035 });
      box(ctx, 38.9, 1.35, 0.85, 1.1, 0.8, 0.22, C.white, { flat: true, lw: 0.03 });
      box(ctx, 39.0, 2.2, 0.55, 0.9, 0.3, 0.04, C.white, { flat: true, lw: 0.02 });
      onX(ctx, 38.8, 2.205, 0.8, (c) => {
        c.beginPath(); c.rect(0.65, 0.05, 0.42, 0.34); paint(c, INK.sticky, { lw: 0.02 });
        words(c, 0.86, 0.15, 'JAMMED', 0.08, C.ink);
        words(c, 0.86, 0.27, 'AGAIN', 0.08, C.ink);
      });
    });
    R.thing(40.1, 2.21, (ctx, t) => {
      // PAPER JAM, blinking, forever.
      if (Math.floor(t * 2) % 2) { const [X, Y] = P(40.1, 1.6, 1.07); ctx.beginPath(); ctx.arc(X, Y, 0.05, 0, Math.PI * 2); ctx.fillStyle = C.coral; ctx.fill(); }
    }, { anim: true });

    // ---------- The kitchen ----------
    // The wall at the back of it: cupboards, a splashback, the notice board.
    R.thing(51.3, 0.48, (ctx) => {
      box(ctx, 48.2, 0.3, 0, 6.25, 0.18, 2.85, SIDING, { flat: true, lw: 0.04, top: C.white });
      face(ctx, [[49.95, 0.485, 1.1], [54.45, 0.485, 1.1], [54.45, 0.485, 2.05], [49.95, 0.485, 2.05]], C.mint, { lw: 0.025 });
      if (Q.detail) {
        ctx.strokeStyle = alpha(C.white, 0.9); ctx.lineWidth = 0.025; ctx.beginPath();
        for (let x = 50.25; x < 54.45; x += 0.3) { ctx.moveTo(...P(x, 0.487, 1.1)); ctx.lineTo(...P(x, 0.487, 2.05)); }
        for (let z = 1.4; z < 2.05; z += 0.3) { ctx.moveTo(...P(49.95, 0.487, z)); ctx.lineTo(...P(54.45, 0.487, z)); }
        ctx.stroke();
      }
      box(ctx, 49.95, 0.48, 2.08, 4.5, 0.42, 0.72, C.woodLight, { flat: true, lw: 0.035, top: tint(C.woodLight, 0.2) });
      onX(ctx, 49.95, 0.905, 2.8, (c) => {
        for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(i * 0.9, 0.05); c.lineTo(i * 0.9, 0.67); c.strokeStyle = shade(C.woodLight, 0.35); c.lineWidth = 0.025; c.stroke(); }
        for (let i = 0; i < 5; i++) { c.fillStyle = C.ink; c.fillRect(i * 0.9 + (i % 2 ? 0.1 : 0.74), 0.5, 0.05, 0.14); }
      });
      // The notice board: HAVE YOU SEEN THIS GOOSE?, the lost and found, a
      // flyer for tonight's fire pit.
      onX(ctx, 48.32, 0.485, 2.68, (c) => {
        c.beginPath(); c.rect(0, 0, 1.5, 0.95); paint(c, C.woodLight, { lw: 0.035, dots: C.wood, density: 0.3 });
        sheet(c, 0.08, 0.06, 0.62, 0.8, C.white);
        words(c, 0.39, 0.15, 'HAVE YOU SEEN', 0.075, C.ink);
        words(c, 0.39, 0.25, 'THIS GOOSE?', 0.085, C.red);
        goosePic(c, 0.38, 0.62, 0.42);
        words(c, 0.39, 0.79, 'answers to "Gerald"', 0.045, C.ink);
        sheet(c, 0.8, 0.1, 0.58, 0.48, C.white);
        words(c, 1.09, 0.17, 'LOST & FOUND', 0.06, C.ink);
        for (let i = 0; i < 5; i++) { c.fillStyle = C.grey; c.fillRect(0.86, 0.25 + i * 0.065, 0.35 + ((i * 13) % 10) / 70, 0.025); }
        c.beginPath(); c.rect(0.82, 0.64, 0.5, 0.26); paint(c, C.coral, { lw: 0.02 });
        words(c, 1.07, 0.73, 'FIRE PIT', 0.065, C.white);
        words(c, 1.07, 0.83, '5PM', 0.06, C.white);
        for (const [u, v] of [[0.39, 0.08], [1.09, 0.12], [1.07, 0.66]]) { c.beginPath(); c.arc(u, v, 0.025, 0, Math.PI * 2); c.fillStyle = C.red; c.fill(); }
      });
    }, { depth: 49 });
    // The counter: cupboards, a dark top, the sink full of mugs, the note.
    R.thing(51.5, 1.6, (ctx) => {
      box(ctx, 48.6, 0.48, 0, 5.8, 1.12, 1.04, tint(INK.birch, 0.15), { flat: true, lw: 0.04 });
      box(ctx, 48.55, 0.48, 1.04, 5.9, 1.17, 0.07, shade(C.grey, 0.25), { flat: true, lw: 0.035 });
      onX(ctx, 48.6, 1.605, 1.0, (c) => {
        c.strokeStyle = shade(INK.birch, 0.3); c.lineWidth = 0.025;
        for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(i * 0.97, 0.08); c.lineTo(i * 0.97, 0.92); c.stroke(); }
        c.fillStyle = C.ink;
        for (let i = 0; i < 6; i++) c.fillRect(i * 0.97 + 0.4, 0.14, 0.18, 0.04);
      });
      // The sink.
      rect(ctx, 50.0, 0.68, 1.0, 0.65, 1.112, shade(C.greyLight, 0.25), { lw: 0.025 });
      rect(ctx, 50.08, 0.74, 0.84, 0.53, 1.113, shade(C.grey, 0.15), { stroke: false });
      mug(ctx, 50.3, 0.95, 0.98, C.coral);
      mug(ctx, 50.6, 1.05, 1.0, C.white);
      mug(ctx, 50.45, 1.1, 1.12, C.teal);
      box(ctx, 51.02, 0.9, 1.11, 0.1, 0.1, 0.38, C.grey, { flat: true, lw: 0.02 });
      box(ctx, 50.75, 0.9, 1.47, 0.37, 0.1, 0.06, C.grey, { flat: true, lw: 0.02 });
      // The kettle, the paper towels.
      cylinder(ctx, 51.45, 1.0, 1.11, 0.17, 0.36, C.greyLight);

    });
    // The note, taped up over the sink (readable, close up).
    R.find({ id: 'note', label: 'A passive-aggressive note', at: [50.37, 0.5, 1.62], r: 0.8 });
    R.thing(50.5, 0.6, (ctx) => {
      onX(ctx, 49.86, 0.49, 1.98, (c) => {
        c.save(); c.translate(0.5, 0.35); c.rotate(-0.04); c.translate(-0.5, -0.35);
        sheet(c, 0.05, 0.02, 0.92, 0.68, C.white, 0.03);
        words(c, 0.51, 0.15, 'YOUR MOTHER', 0.14, C.red, 'Bagel Fat One');
        words(c, 0.51, 0.31, 'DOESN\'T WORK', 0.14, C.red, 'Bagel Fat One');
        words(c, 0.51, 0.47, 'HERE.', 0.14, C.red, 'Bagel Fat One');
        c.fillStyle = C.ink; c.fillRect(0.2, 0.58, 0.62, 0.025);
        c.fillStyle = alpha(C.butter, 0.85); c.fillRect(0.3, -0.02, 0.4, 0.09);
        c.restore();
      });
    }, { depth: 51.2 });
    // The microwave (fish, all morning), the coffee machine (broken), the
    // donut box.
    R.thing(49.15, 1.3, (ctx) => {
      box(ctx, 48.7, 0.65, 1.11, 0.92, 0.62, 0.5, C.white, { flat: true, lw: 0.03 });
      onX(ctx, 48.7, 1.271, 1.58, (c) => {
        c.beginPath(); c.rect(0.06, 0.06, 0.58, 0.34); paint(c, C.ink, { lw: 0.02 });
        c.beginPath(); c.rect(0.7, 0.06, 0.16, 0.34); paint(c, C.greyLight, { lw: 0.02 });
      });
    });
    R.thing(49.16, 1.31, (ctx, t) => {
      const p = fishAt(t);
      const on = !p.hidden && !p.rushing && p.microwave;
      if (!on) return;
      const s = wrap(t) % 9, left = Math.max(0, Math.ceil(30 - (s / 7) * 30));
      onX(ctx, 48.7, 1.272, 1.58, (c) => {
        c.beginPath(); c.rect(0.08, 0.08, 0.54, 0.3); c.fillStyle = C.butter; c.fill();
        const a = t * 2;
        c.beginPath(); c.ellipse(0.35 + Math.cos(a) * 0.1, 0.28, 0.14, 0.05, 0, 0, Math.PI * 2); paint(c, C.sky, { lw: 0.015 });
        words(c, 0.78, 0.13, s < 7 ? `0:${String(left).padStart(2, '0')}` : 'END', 0.06, C.leaf);
      });
    }, { anim: true });
    // The smell, rising and drifting along the kitchen.
    R.thing(49.4, 1.32, (ctx, t) => {
      const p = fishAt(t);
      if (p.hidden || !p.microwave || !Q.detail) return;
      ctx.lineCap = 'round';
      particles(t, 7, 4, (k, r) => {
        const x = 49.1 + k * (1.2 + r() * 1.5), z = 1.7 + k * 1.6;
        const [X, Y] = P(x, 0.9 + r() * 0.6, z);
        ctx.beginPath();
        ctx.moveTo(X - 0.12, Y);
        ctx.bezierCurveTo(X - 0.05, Y - 0.12, X + 0.05, Y + 0.12, X + 0.12, Y);
        ctx.strokeStyle = alpha(C.green, 0.75 * (1 - k)); ctx.lineWidth = 0.05; ctx.stroke();
      }, 7);
    }, { anim: true });
    R.thing(53.0, 1.35, (ctx) => {
      box(ctx, 52.55, 0.62, 1.11, 0.95, 0.7, 0.88, shade(C.grey, 0.15), { flat: true, lw: 0.035, top: shade(C.grey, 0.3) });
      box(ctx, 52.8, 1.12, 1.11, 0.45, 0.25, 0.05, C.ink, { flat: true, lw: 0.02 });
      box(ctx, 52.95, 1.1, 1.58, 0.15, 0.25, 0.08, C.ink, { flat: true, lw: 0.02 });
      mug(ctx, 53.02, 1.25, 1.16, C.white);
      onX(ctx, 52.58, 1.325, 1.97, (c) => {
        c.save(); c.translate(0.45, 0.16); c.rotate(0.06);
        sheet(c, -0.36, -0.12, 0.72, 0.38, C.white, 0.025);
        words(c, 0, -0.02, 'OUT OF ORDER', 0.11, C.red, 'Bagel Fat One');
        words(c, 0, 0.12, 'Filed by QA', 0.065, C.ink);
        c.restore();
      });
      // The donut box (a regional chain's lookalike), two left.
      box(ctx, 53.6, 0.72, 1.11, 0.85, 0.6, 0.14, C.pink, { flat: true, lw: 0.025 });
      face(ctx, [[53.6, 0.72, 1.25], [54.45, 0.72, 1.25], [54.45, 0.56, 1.82], [53.6, 0.56, 1.82]], C.pink, { lw: 0.025 });
      onX(ctx, 53.6, 0.7, 1.62, (c) => words(c, 0.42, 0, 'DUNKER\'S', 0.13, C.coral, 'Bagel Fat One'));
      for (const [dx, dy, col] of [[53.85, 1.05, C.mustard], [54.17, 1.1, C.pink]]) {
        disc(ctx, dx, dy, 1.27, 0.15, tint(C.wood, 0.1), { lw: 0.02 });
        disc(ctx, dx, dy, 1.29, 0.12, col, { stroke: false });
        disc(ctx, dx, dy, 1.3, 0.04, C.ink, { stroke: false });
      }
    });
    const coffee = R.poke({ id: 'coffee', at: [53.15, 0.95, 1.5], r: 0.8, say: 'OUT OF ORDER. Filed by QA.', hold: 1.4 });
    R.thing(53.2, 1.36, (ctx, t) => {
      // Its error light, and when it's tapped, a sad puff.
      if (Math.floor(t * 2.5) % 2) { const [X, Y] = P(53.4, 1.33, 1.88); ctx.beginPath(); ctx.arc(X, Y, 0.045, 0, Math.PI * 2); ctx.fillStyle = C.red; ctx.fill(); }
      const k = coffee.k();
      if (k > 0.05 && Q.detail) for (let i = 0; i < 3; i++) { const [X, Y] = P(53.0 + i * 0.12, 0.9, 2.05 + k * (0.3 + i * 0.15)); ctx.beginPath(); ctx.arc(X, Y, 0.1 + i * 0.03, 0, Math.PI * 2); paint(ctx, alpha(C.greyLight, 0.9 * k), { lw: 0.02 }); }
    }, { anim: true });
    // The fridge: Gander Cola, and a lunch that isn't Greg's.
    R.thing(55.15, 1.84, (ctx) => box(ctx, FR.x0, FR.y0, 0, FR.x1 - FR.x0, FR.y1 - FR.y0, FR.h, C.white, { flat: true, lw: 0.04 }));
    const fridge = R.poke({ id: 'fridge', at: [55.2, 1.9, 1.4], r: 0.8, say: 'Labeled food only. This means you, Greg.', hold: 4 });
    R.thing(55.15, 1.86, (ctx, t) => fridgeFront(ctx, fridge.k(), t), { anim: true });
    // The island: teal, a white top, the banner, the cake, the slice on a
    // plate, and the Gander Cola goose bottle.
    const ISL = { x0: 49.2, x1: 51.5, y0: 3.6, y1: 5.2 };
    R.thing(50.35, 5.2, (ctx) => {
      const { x0, x1, y0, y1 } = ISL;
      box(ctx, x0 + 0.1, y0 + 0.1, 0, x1 - x0 - 0.2, y1 - y0 - 0.2, 1.04, tint(C.teal, 0.25), { flat: true, lw: 0.035 });
      box(ctx, x0, y0, 1.04, x1 - x0, y1 - y0, 0.08, C.white, { flat: true, lw: 0.035 });
      onX(ctx, x0 + 0.1, y1 - 0.095, 1.04, (c) => {
        // Bunting and the banner.
        const n = 7;
        for (let i = 0; i < n; i++) { c.beginPath(); c.moveTo(0.05 + i * 0.3, 0.02); c.lineTo(0.33 + i * 0.3, 0.02); c.lineTo(0.19 + i * 0.3, 0.24); c.closePath(); paint(c, [C.pink, C.mustard, C.sky, C.coral][i % 4], { lw: 0.015 }); }
        sheet(c, 0.1, 0.34, 1.9, 0.5, C.white);
        words(c, 1.05, 0.48, 'HAPPY BIRTHDAY', 0.19, PRIMAL, 'Bagel Fat One');
        words(c, 1.05, 0.7, 'STEVE', 0.2, C.purple, 'Bagel Fat One');
      });
      // The cake stand, the plate with the slice, forks, napkins.
      disc(ctx, 50.55, 4.3, 1.13, 0.52, C.white, { lw: 0.025 });
      disc(ctx, 49.72, 4.78, 1.13, 0.27, C.white, { lw: 0.025 });
      disc(ctx, 49.72, 4.78, 1.135, 0.2, tint(C.greyLight, 0.4), { stroke: false });
      slice(ctx, 49.72, 4.8, 1.14);
      box(ctx, 49.9, 4.98, 1.135, 0.3, 0.04, 0.02, C.grey, { flat: true, stroke: false });
      box(ctx, 49.35, 3.8, 1.12, 0.4, 0.4, 0.06, C.pink, { flat: true, lw: 0.02 });
      for (let i = 0; i < 3; i++) box(ctx, 49.45 + i * 0.08, 4.25, 1.12, 0.03, 0.3, 0.015, C.grey, { flat: true, stroke: false });
      // The Gander Cola goose bottle: a white ceramic goose with a red label
      // round its middle and a bottle cap on its head.
      const [bx, by, bz] = [51.15, 3.95, 1.13];
      disc(ctx, bx, by, bz + 0.005, 0.26, BRAND.can, { lw: 0.02 });
      goose(ctx, bx, by, bz + 0.01, 0, { pose: 'sit', dir: 'l', scale: 0.62 });
      const [X, Y] = P(bx, by, bz + 0.01);
      ctx.save();
      ctx.translate(X, Y);
      ctx.scale(-0.62, 0.62);
      ctx.save();
      ctx.beginPath(); ctx.ellipse(0, -0.2, 0.42, 0.24, -0.12, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = BRAND.can; ctx.fillRect(-0.14, -0.5, 0.3, 0.6);
      ctx.fillStyle = C.white; ctx.fillRect(-0.14, -0.24, 0.3, 0.05);
      ctx.restore();
      ctx.beginPath(); ctx.rect(0.19, -1.0, 0.18, 0.08); paint(ctx, C.grey, { lw: 0.03 });
      ctx.restore();
    });
    R.decoy({ id: 'cola', at: [51.15, 3.95, 1.5], r: 0.6, say: 'Gander Cola. Wrong kind of gander.' });
    R.find({ id: 'cake', label: 'A slice of Steve\'s cake', at: [49.72, 4.8, 1.3], r: 0.8 });
    R.thing(50.62, 5.26, (ctx, t) => cake(ctx, 50.55, 4.3, 1.14, slicesLeft(t)), { anim: true });
    // A balloon tied to the island, for Steve.
    R.thing(49.25, 5.3, (ctx, t) => {
      const sx = Math.sin(t * 0.9) * 0.12, sz = Math.sin(t * 1.3) * 0.06;
      const [AX, AY] = P(49.25, 5.2, 1.0), [BX, BY] = P(49.25 + sx, 5.2 - sx, 2.55 + sz);
      ctx.beginPath(); ctx.moveTo(AX, AY); ctx.quadraticCurveTo(AX + 0.15, (AY + BY) / 2, BX, BY);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(BX, BY - 0.38, 0.3, 0.38, sx, 0, Math.PI * 2); paint(ctx, C.pink, { lw: 0.035 });
      ctx.beginPath(); ctx.ellipse(BX - 0.1, BY - 0.5, 0.06, 0.1, 0.4, 0, Math.PI * 2); ctx.fillStyle = alpha(C.white, 0.7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(BX - 0.05, BY + 0.02); ctx.lineTo(BX + 0.05, BY + 0.02); ctx.lineTo(BX, BY - 0.03); ctx.fillStyle = C.pink; ctx.fill();
    }, { anim: true });
    R.thing(55.3, 6.4, (ctx) => pot(ctx, 55.3, 6.4, 0, 0, { kind: 'spiky', scale: 1.0, potColor: C.white }));

    // ---------- The water cooler ----------
    R.thing(47.4, 9.75, (ctx) => {
      box(ctx, 47.15, 9.25, 0, 0.5, 0.5, 1.1, C.white, { flat: true, lw: 0.035 });
      box(ctx, 47.6, 9.4, 0.75, 0.12, 0.2, 0.12, C.sky, { flat: true, lw: 0.02 });
      cylinder(ctx, 47.4, 9.5, 1.1, 0.22, 0.7, tint(C.sky, 0.3), { top: C.sky });
      box(ctx, 47.62, 9.0, 0.5, 0.1, 0.18, 0.4, C.white, { flat: true, lw: 0.02 });
    });
    R.thing(47.42, 9.76, (ctx, t) => {
      if (!Q.detail) return;
      const k = (wrap(t) % 9) / 1.6;
      if (k > 1) return;
      for (let i = 0; i < 3; i++) { const [X, Y] = P(47.4 + (i - 1) * 0.08, 9.5, 1.15 + ((k * 0.8 + i * 0.25) % 0.65)); ctx.beginPath(); ctx.arc(X, Y, 0.05, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.015 }); }
    }, { anim: true });

    // ---------- The pitch room ----------
    room(R, PITCH[0], PITCH[1], PITCH[2], PITCH[3], '', { door: 47.7, back: true, table: false });
    // Its sign on the glass, and the welcome board outside.
    R.thing(44.5, 18.6, (ctx) => {
      onX(ctx, 43.3, 18.52, 1.95, (c) => {
        words(c, 1.2, 0, 'PITCH ROOM', 0.26, C.ink, 'Bagel Fat One');
        words(c, 1.2, 0.22, 'booked all day (Dana)', 0.1, C.ink);
      });
    }, { depth: 63.9 });
    R.thing(51.0, 17.45, (ctx) => {
      for (const [lx, ly] of [[50.45, 17.25], [51.5, 17.25]]) box(ctx, lx, ly, 0, 0.06, 0.06, 1.0, C.wood, { flat: true, lw: 0.02 });
      box(ctx, 50.95, 17.0, 0, 0.06, 0.06, 2.0, C.wood, { flat: true, lw: 0.02 });
      box(ctx, 50.3, 17.32, 0.95, 1.4, 0.06, 1.1, C.white, { flat: true, lw: 0.03 });
      onX(ctx, 50.3, 17.385, 2.05, (c) => {
        words(c, 0.7, 0.16, 'WELCOME,', 0.13, C.ink);
        words(c, 0.7, 0.4, 'GANDER', 0.24, BRAND.can, 'Bagel Fat One');
        words(c, 0.7, 0.66, 'COLA!', 0.24, BRAND.can, 'Bagel Fat One');
        goosePic(c, 0.66, 1.0, 0.2);
      });
    });
    // The big screen on its stand, against the glass at the end.
    R.thing(40.6, 23.0, (ctx) => {
      for (const ly of [20.9, 23.0]) {
        box(ctx, 40.15, ly - 0.05, 0, 0.8, 0.1, 0.05, C.ink, { flat: true, stroke: false });
        box(ctx, 40.32, ly - 0.05, 0.05, 0.1, 0.1, 1.05, C.ink, { flat: true, stroke: false });
      }
      box(ctx, 40.32, 20.35, 1.05, 0.18, 3.3, 1.6, C.black, { flat: true, lw: 0.035 });
      // The box of cables behind it.
      box(ctx, 40.25, 18.75, 0, 0.95, 0.7, 0.55, C.woodLight, { flat: true, lw: 0.03, top: tint(C.woodLight, 0.15) });
      onX(ctx, 40.25, 19.455, 0.4, (c) => words(c, 0.47, 0.15, 'CABLES?', 0.13, C.ink));
      if (Q.detail) {
        ctx.lineCap = 'round';
        for (const [col, a, b] of [[C.ink, 0.2, 0.5], [C.white, 0.5, 0.3], [C.red, 0.7, 0.6]]) {
          const [X, Y] = P(40.35 + a * 0.7, 18.85 + b * 0.5, 0.56);
          ctx.beginPath(); ctx.moveTo(X, Y); ctx.bezierCurveTo(X - 0.2, Y - 0.4, X + 0.3, Y - 0.45, X + 0.2, Y + 0.05);
          ctx.strokeStyle = C.ink; ctx.lineWidth = 0.07; ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = 0.04; ctx.stroke();
        }
      }
    }, { depth: 63.6 });
    R.thing(40.62, 23.01, (ctx, t) => tvPicture(ctx, t), { anim: true, depth: 63.65 });
    // The table, in two halves either side of the seam, its chairs, and the
    // laptop that shows the deck perfectly well.
    R.thing(45.5, 23.6, (ctx) => {
      tableHalf(ctx, 43.0, 48.0);
      box(ctx, 43.25, 21.95, 1.13, 0.55, 0.75, 0.03, C.grey, { flat: true, lw: 0.02 });
      face(ctx, [[43.27, 21.97, 1.16], [43.27, 22.68, 1.16], [43.17, 22.68, 1.62], [43.17, 21.97, 1.62]], C.grey, { lw: 0.025 });
      face(ctx, [[43.29, 22.02, 1.2], [43.29, 22.63, 1.2], [43.2, 22.63, 1.58], [43.2, 22.02, 1.58]], BRAND.can, { stroke: false });
      onY(ctx, 43.3, 22.6, 1.42, (c) => words(c, 0.29, 0, 'GANDER', 0.09, C.white, 'Bagel Fat One'));
      // A six-pack of Gander Cola.
      for (let i = 0; i < 6; i++) cylinder(ctx, 46.9 + (i % 3) * 0.17, 22.45 + Math.floor(i / 3) * 0.17, 1.13, 0.07, 0.24, BRAND.can, { top: C.greyLight });
    }, { depth: 69.1 });
    R.thing(50.2, 23.6, (ctx) => {
      tableHalf(ctx, 48.0, 52.4);
      // The speakerphone nobody can make work either.
      const [X, Y] = P(50.1, 22.6, 1.14);
      ctx.beginPath(); ctx.moveTo(X, Y - 0.2); ctx.lineTo(X + 0.36, Y + 0.12); ctx.lineTo(X - 0.36, Y + 0.12); ctx.closePath(); paint(ctx, C.ink, { lw: 0.02 });
      ctx.beginPath(); ctx.arc(X, Y, 0.06, 0, Math.PI * 2); ctx.fillStyle = C.leaf; ctx.fill();
      // Water carafes.
      cylinder(ctx, 49.0, 22.6, 1.13, 0.11, 0.4, tint(C.sky, 0.4), { top: C.sky });
      cylinder(ctx, 51.5, 22.6, 1.13, 0.11, 0.4, tint(C.sky, 0.4), { top: C.sky });
    }, { depth: 73.8 });
    for (const px of PLACES) {
      R.thing(px, 20.5, (ctx) => seatY(ctx, px, 20.6, -1, CHAIR));
      R.thing(px, 24.9, (ctx) => seatY(ctx, px, 24.5, 1, CHAIR));
    }
    // The water glasses, laid out one by one in the afternoon (Bea, below).
    const GLASSES = [[49, 22.05], [51.2, 22.05], [51.2, 23.15], [49, 23.15], [46.8, 23.15], [46.8, 22.05], [44.6, 23.15], [44.6, 22.05]];
    const glassesDrawn = (ctx, t, lo, hi) => {
      const n = glassesOut(t);
      GLASSES.forEach(([gx, gy], i) => {
        if (i >= n || gx < lo || gx >= hi) return;
        cylinder(ctx, gx + 0.35, gy, 1.13, 0.07, 0.2, tint(C.sky, 0.5), { top: tint(C.sky, 0.2) });
      });
    };
    R.thing(45.5, 23.62, (ctx, t) => glassesDrawn(ctx, t, 43, 48), { anim: true, depth: 69.12 });
    R.thing(50.2, 23.62, (ctx, t) => glassesDrawn(ctx, t, 48, 53), { anim: true, depth: 73.82 });
    // The adapter that works, put down on the table while Raj is at the
    // window. (He picks it up again after, and tries a different one.)
    R.thing(45.5, 23.63, (ctx, t) => {
      if (!bearOClock(t)) return;
      const [X, Y] = P(44.2, 22.75, 1.13);
      ctx.save();
      ctx.translate(X, Y);
      ctx.beginPath(); ctx.roundRect(-0.17, -0.09, 0.26, 0.15, 0.04); paint(ctx, C.white, { lw: 0.03 });
      ctx.fillStyle = C.leaf; ctx.fillRect(-0.12, -0.06, 0.06, 0.06);
      ctx.beginPath(); ctx.moveTo(0.09, -0.01); ctx.bezierCurveTo(0.25, 0.05, 0.2, 0.18, 0.36, 0.12);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.06; ctx.stroke(); ctx.strokeStyle = C.white; ctx.lineWidth = 0.03; ctx.stroke();
      ctx.beginPath(); ctx.rect(0.34, 0.07, 0.09, 0.08); paint(ctx, C.grey, { lw: 0.02 });
      ctx.restore();
    }, { anim: true, depth: 69.13 });
    R.find({ id: 'adapter', label: 'An adapter that works', kind: 'hard', at: [44.25, 22.75, 1.25], r: 0.8, when: bearOClock, note: 'bear o\'clock',
      riddle: 'The one everyone\'s been looking for since nine.', hint: 'When the bear comes, the IT man puts down what he was holding on the big table.' });
    // The pile of wrong adapters, one more every hour.
    R.thing(41.4, 25.2, (ctx, t) => {
      const n = 3 + tossed(H(t));
      for (let i = 0; i < n; i++) {
        const x = 40.55 + hash(i, 11) * 1.0, y = 24.4 + hash(i, 17) * 0.75, z = Math.floor(i / 4) * 0.07;
        box(ctx, x, y, z, 0.24, 0.15, 0.07, ADAPTERS[(i + 3) % ADAPTERS.length], { flat: true, lw: 0.02 });
        if (Q.detail) { const [X, Y] = P(x + 0.24, y + 0.07, z + 0.04); ctx.beginPath(); ctx.moveTo(X, Y); ctx.quadraticCurveTo(X + 0.15, Y - 0.12, X + 0.22, Y + 0.05); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke(); }
      }
    }, { anim: true });

    // Raj from IT, since nine.
    const rajLook = folk(540, { top: C.teal, bottom: C.ink, style: 'short', dress: false });
    R.mover(rush(rajAt, [RAJ.glass]), (ctx, t, p) => {
      if (p.gone) return;
      const hold = p.hold === 'adapter' ? (c) => { c.beginPath(); c.roundRect(-0.08, -0.06, 0.2, 0.13, 0.03); paint(c, ADAPTERS[Math.floor(H(t) - 9 + 8) % ADAPTERS.length], { lw: 0.025 }); }
        : p.hold === 'remote' ? (c) => { c.beginPath(); c.roundRect(-0.03, -0.14, 0.08, 0.28, 0.03); paint(c, C.black, { lw: 0.02 }); }
          : p.hold === 'manual' ? (c) => { c.beginPath(); c.rect(-0.12, -0.18, 0.3, 0.36); paint(c, C.white, { lw: 0.025 }); }
            : null;
      const arms = p.fiddle ? [1.25 + Math.sin(t * 7) * 0.25, 1.05 + Math.cos(t * 6) * 0.25] : p.arms;
      person(ctx, p.x, p.y, p.z || 0, { ...rajLook, pose: p.pose || (p.moving ? 'walk' : 'stand'), dir: p.dir, back: p.back, hold, arms }, t);
      if (p.say && !p.rushing) say(ctx, p.x, p.y, 2.75, p.say);
    }, { bias: 0.1 });

    // Bea lays out the water glasses after lunch, one place at a time, and
    // waits by the window for the clients.
    const BEA = 1.3;
    const beaSteps = [IN];
    const placedAt = [];
    let bt = 0, bx = IN[0], by = IN[1];
    const go = (x, y) => { bt += Math.hypot(x - bx, y - by) / BEA; bx = x; by = y; beaSteps.push([x, y]); };
    const wait = (s, extra = {}, glasses = []) => { glasses.forEach((g, j) => placedAt[g] = bt + (j + 1) * (s / (glasses.length + 1))); beaSteps.push({ wait: s, ...extra }); bt += s; };
    beaSteps.push({ until: 141 }); bt = 141;
    go(STAIR[0], STAIR[1]); go(47.7, 17.4); go(47.7, 19.4);
    go(49, 19.75); wait(2.4, { pose: 'carry', dir: 'l' }, [0]);
    go(51.2, 19.75); wait(2.4, { pose: 'carry', dir: 'l' }, [1]);
    go(53.7, 20.3); go(53.7, 25.05);
    go(51.2, 25.05); wait(2.2, { pose: 'carry', dir: 'l', back: true }, [2]);
    go(49, 25.05); wait(2.2, { pose: 'carry', dir: 'l', back: true }, [3]);
    go(46.8, 25.05); wait(3.2, { pose: 'carry', dir: 'l', back: true }, [4, 5]);
    go(44.6, 25.05); wait(3.2, { pose: 'carry', dir: 'l', back: true }, [6, 7]);
    go(53.7, 25.05); go(54.1, 22.6);
    beaSteps.push({ until: 208, pose: 'stand', dir: 'l', back: false, done: true });
    beaSteps.push([53.7, 20.3], [47.7, 19.4], [47.7, 17.4], STAIR);
    const beaBase = schedule(beaSteps, { loop: LOOP, name: 'Bea' });
    const glassesOut = (t) => { const s = wrap(t); return s < 140 ? 0 : placedAt.filter((a) => s >= a).length; };
    const beaLook = folk(561, { top: C.mustard, bottom: C.navy, style: 'bun', dress: false });
    R.mover(rush((t) => { const p = beaBase(t); return inside(p) ? { ...p, hidden: true } : p; }, [[53.5, 25.05]]), (ctx, t, p) => {
      if (p.hidden) return;
      const left = 8 - glassesOut(t);
      const tray = p.done || p.rushing ? null : (c) => {
        c.beginPath(); c.ellipse(0.1, 0, 0.32, 0.08, 0, 0, Math.PI * 2); paint(c, C.grey, { lw: 0.025 });
        for (let i = 0; i < Math.min(left, 4); i++) { c.beginPath(); c.rect(-0.12 + i * 0.13, -0.2, 0.09, 0.18); paint(c, tint(C.sky, 0.5), { lw: 0.015 }); }
      };
      person(ctx, p.x, p.y, 0, { ...beaLook, pose: p.pose === 'stand' && !p.done ? 'carry' : p.pose, dir: p.dir, back: p.back, hold: tray, arms: tray ? [1.3, 1.3] : undefined }, t);
    }, { bias: 0.1 });

    // ---------- The kitchen's people ----------
    // Fish in the microwave, all morning ("thirty more seconds").
    const fishBase = schedule([
      IN,
      { until: 27 },
      STAIR, [47.6, 7.7], [49.15, 2.35],
      { until: 137, pose: 'stand', dir: 'r', back: true, microwave: true },
      [47.6, 7.7], STAIR,
    ], { loop: LOOP, name: 'Fish' });
    const fishAt = rush((t) => { const p = fishBase(t); return inside(p) ? { ...p, hidden: true } : p; }, [[47.7, 17.4], [47.7, 19.4], [52.6, 25.05]], 0.9);
    const fishLook = folk(571, { top: C.green, bottom: C.brown, style: 'bald', dress: false });
    R.mover(fishAt, (ctx, t, p) => {
      if (p.hidden) return;
      const beep = p.microwave && wrap(t) % 9 >= 7;
      person(ctx, p.x, p.y, 0, { ...fishLook, pose: beep ? 'point' : p.pose, dir: p.dir, back: p.back }, t);
      if (beep && !p.rushing) say(ctx, p.x, p.y, 2.75, 'Thirty more seconds.');
    }, { bias: 0.1 });
    // Steve's cake, a slice an hour: someone up the stair, a slice, a line,
    // and off again with it.
    const takerSteps = [IN];
    CUTS.forEach((c, i) => {
      takerSteps.push({ until: c - 6.6 }, STAIR, [50.4, 5.95], { wait: 3, pose: 'read', dir: 'l', back: true, said: i }, { wait: 0.6, pose: 'stand', said: i }, [STAIR[0], STAIR[1], 0], IN);
    });
    const taker = schedule(takerSteps, { loop: LOOP, name: 'Cake' });
    const takerAt = (t) => {
      const p = taker(t);
      if (inside(p)) return { ...p, hidden: true };
      const s = wrap(t);
      const i = CUTS.findIndex((c) => s < c + 11);
      return { ...p, visit: i < 0 ? 0 : i, plate: CUTS.some((c) => s >= c && s < c + 11) };
    };
    R.mover(takerAt, (ctx, t, p) => {
      if (p.hidden) return;
      const look = folk(600 + p.visit * 3, { dress: false });
      const plate = p.plate ? (c) => { c.beginPath(); c.ellipse(0.1, 0, 0.2, 0.07, 0, 0, Math.PI * 2); paint(c, C.white, { lw: 0.02 }); c.beginPath(); c.moveTo(0, -0.04); c.lineTo(0.2, -0.04); c.lineTo(0.12, -0.18); c.closePath(); paint(c, C.woodLight, { lw: 0.02 }); } : null;
      person(ctx, p.x, p.y, 0, { ...look, pose: p.pose, dir: p.dir, back: p.back, hold: plate, arms: plate && p.moving ? [1.1, -0.2] : undefined }, t);
      if (p.said != null && !p.moving) say(ctx, p.x, p.y, 2.75, TAKERS[p.said]);
    }, { bias: 0.1 });
    // The cleaner at nine, who finally eats the last slice, then vacuums.
    const cleaner = schedule([
      IN,
      { until: 268 },
      STAIR, [50.4, 5.95], { until: CLEANER_EATS + 3.5, pose: 'read', dir: 'l', back: true, eats: true },
      { speed: 1.0 }, [40, 11], [36, 11], [40, 11.6], [36, 11.6], [40, 10.4], [36, 10.4], { speed: 1.3 }, STAIR,
    ], { loop: LOOP, name: 'Cleaner' });
    const cleanerLook = folk(622, { top: C.navy, bottom: C.navy, hat: 'cap', hatColor: C.teal, dress: false });
    const cleanerAt = (t) => { const p = cleaner(t); return inside(p) ? { ...p, hidden: true } : p; };
    R.mover(cleanerAt, (ctx, t, p) => {
      if (p.hidden) return;
      const vac = !p.eats && p.y > 9.5 ? (c) => { c.strokeStyle = C.ink; c.lineWidth = 0.06; c.beginPath(); c.moveTo(0, 0); c.lineTo(0.45, 0.75); c.stroke(); c.beginPath(); c.rect(0.3, 0.72, 0.36, 0.1); paint(c, C.coral, { lw: 0.02 }); } : null;
      person(ctx, p.x, p.y, 0, { ...cleanerLook, pose: vac ? 'carry' : p.pose, dir: p.dir, back: p.back, hold: vac, arms: vac ? [0.9, 0.7] : undefined }, t);
      if (p.eats && wrap(t) >= CLEANER_EATS - 1) say(ctx, p.x, p.y, 2.75, 'Happy birthday, Steve.');
    }, { bias: 0.1 });

    // ---------- The water cooler ----------
    // Two people who have been "just grabbing water" since nine.
    const CHAT = [
      ['Did you see the bear?', 'Which time?'],
      ['Whose cake is that?', 'Steve\'s.'],
      ['Who\'s Steve?', 'No idea.'],
      ['Is the coffee fixed?', 'QA filed a bug.'],
      ['Big pitch at four.', 'Does the screen work?'],
      ['Reception\'s back in five.', 'Since nine.'],
      ['Seven geese, apparently.', 'From a casting agency.'],
      ['Love the energy!', 'Please don\'t.'],
    ];
    const FISHY = ['Is that fish?', 'Every Friday.'];
    // The line each of them is saying now, if any (0: the first, 1: the
    // second), while both are here.
    const chatLine = (t, who) => {
      const a = chatA(t), b = chatB(t);
      if (a.gone || b.gone || a.rushing || b.rushing) return null;
      const s = wrap(t), u = s % 9;
      const pair = fishAt(t).microwave && Math.floor(s / 9) % 3 === 1 ? FISHY : CHAT[Math.floor(s / 9) % CHAT.length];
      if (who === 0 && u > 0.5 && u < 4) return pair[0];
      if (who === 1 && u > 4.5 && u < 8) return pair[1];
      return null;
    };
    const chatter = (spot, dir, k, via, look, who) => {
      const at = R.mover(rush((t) => (seated(t, k) ? { x: spot[0], y: spot[1], pose: 'stand', dir, here: true } : { gone: true, x: spot[0], y: spot[1] }), via, 0.2), (ctx, t, p) => {
        if (p.gone) return;
        const cup = p.rushing ? null : (c) => { c.beginPath(); c.moveTo(-0.07, -0.1); c.lineTo(0.09, -0.1); c.lineTo(0.06, 0.1); c.lineTo(-0.04, 0.1); c.closePath(); paint(c, C.white, { lw: 0.02 }); };
        const talk = Math.sin(t * 2.3 + k * 9) > 0.3;
        person(ctx, p.x, p.y, 0, { ...look, pose: p.pose === 'stand' && talk ? 'point' : p.pose, dir: p.dir, back: p.back, hold: cup }, t);
        say(ctx, p.x, p.y, 2.75, chatLine(t, who));
      }, { bias: 0.1 });
      return at;
    };
    const chatA = chatter([46.7, 10.35], 'r', 0.3, [[47.7, 17.4], [47.7, 19.4], [50.0, 25.05]], folk(580, { top: C.coral, dress: false }), 0);
    const chatB = chatter([48.25, 10.05], 'l', 0.6, [[48.2, 17.4], [48.1, 19.4], [51.4, 25.05]], folk(583, { top: C.purple }), 1);

    // ---------- Desks by the front windows ----------
    staff(R, pod(R, 36, 'front', 3), 545, { empty: [3], kinds: ['email', 'sheet', 'email', 'shop', 'email', 'calendar'] });
  },
};
