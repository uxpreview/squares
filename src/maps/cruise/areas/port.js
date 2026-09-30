// The Port. A tiny palm island in the sea off the ship's far side, ahead: sand
// and shallows printed straight on the sea (no slab, no walls), a pier toward
// the ship, the tiki hut gift shop, the steel band, the welcome banner, and
// the harbourmaster at the pier's end with the flagpole. The island gets ready
// all day: the band tunes, the banner goes up at noon, the shop opens at 3.
// At six the ship arrives, the yellow flag goes up, and the band plays the
// welcome anyway, to nobody. The Courier's tender boat goes round the island
// all day with a parcel, and is waved off every time it gets near the pier.
// Keep the id.
import {
  C, Q, box, disc, cylinder, face, poly, paint, person, folk, speech, shade, tint, mix, alpha, dots, SKIN, HAIR,
} from '../../../engine/art.js';
import { route, clamp } from '../../../engine/actors.js';
import { board, lettering, gull, P } from '../kit.js';
import { INK, MAT, hourOf, COSTUME } from '../style.js';

const TAU = Math.PI * 2;
// How far through an hour span we are (0 to 1), on the day's clock.
const ramp = (t, h0, h1) => clamp((hourOf(t) - h0) / (h1 - h0));
const smooth = (k) => (1 - Math.cos(Math.PI * clamp(k))) / 2;

// ---------- The island ----------
// Two lumps of sand (the main one and a lobe under the shop), kept inside the
// tender boat's circuit so it never runs aground.
const MAIN = [9.4, 8.6, 5.8, 4.8], LOBE = [12.4, 6.3, 3.0, 2.7];
const LOBES = [MAIN, LOBE];
const SAND = tint(INK.sunYellow, 0.45);
const WET = mix(INK.sunYellow, INK.teak, 0.4);
const wob = (a, s) => 1 + 0.035 * Math.sin(3 * a + s) + 0.025 * Math.cos(5 * a + 2 * s);
const edge = ([cx, cy, rx, ry], a, grow, s) => {
  const w = wob(a, s);
  return [cx + Math.cos(a) * (rx * w + grow), cy + Math.sin(a) * (ry * w + grow)];
};
const inLobe = ([cx, cy, rx, ry], x, y, grow) => ((x - cx) / (rx + grow)) ** 2 + ((y - cy) / (ry + grow)) ** 2 < 1;
// Both lobes as one path (they wind the same way, so the fill is their union).
function blobPath(ctx, grow) {
  ctx.beginPath();
  LOBES.forEach((e, i) => {
    for (let j = 0; j <= 56; j++) {
      const [x, y] = edge(e, (j / 56) * TAU, grow, i * 2);
      const [X, Y] = P(x, y, 0);
      j ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
    ctx.closePath();
  });
}
function blob(ctx, grow, fill, o = {}) {
  blobPath(ctx, grow);
  if (o.stroke && Q.lines) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw * 2; ctx.lineJoin = 'round'; ctx.stroke(); }
  ctx.fillStyle = fill;
  ctx.fill();
  if (o.dots && Q.detail) { ctx.fillStyle = dots(o.dots, o.density ?? 0.12); ctx.fill(); }
}
// A line of foam round the island, grow out from the sand (skipping the bit
// of each lobe that's inside the other).
function foamLine(ctx, grow, t, i0) {
  ctx.beginPath();
  LOBES.forEach((e, i) => {
    const other = LOBES[1 - i];
    let pen = false;
    for (let j = 0; j <= 56; j++) {
      const a = (j / 56) * TAU;
      const g = grow + Math.sin(a * 4 + t * 1.3 + i0) * 0.05;
      const [x, y] = edge(e, a, g, i * 2);
      if (inLobe(other, x, y, g + 0.1)) { pen = false; continue; }
      const [X, Y] = P(x, y, 0);
      pen ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      pen = true;
    }
  });
}

// ---------- The tender boat ----------
// The Courier goes round the island the long way, from the pier's left to its
// right, is waved off, turns round, and goes back. (A full circle would take
// him through the pier and the harbourmaster.) 48 seconds there and back, so
// five rounds a day.
const LEG = 20, WAIT = 4, CYCLE = 2 * (LEG + WAIT);
const A0 = 1.92, A1 = 1.28 + TAU; // the pier's left, round the back, the pier's right
const ellipse = (a) => [9 + Math.cos(a) * 7.5, 8 + Math.sin(a) * 6.5];
const tangent = (a) => Math.atan2(6.5 * Math.cos(a), -7.5 * Math.sin(a));
function tender(t) {
  const c = ((t % CYCLE) + CYCLE) % CYCLE;
  const pass = Math.floor(t / CYCLE) * 2 + (c >= LEG + WAIT ? 1 : 0);
  let a, h, near = null, turn = 0, moving = true;
  if (c < WAIT) { // at the pier's left, turning round
    a = A0; near = 'L'; turn = c / WAIT; moving = false;
    h = tangent(A0) + Math.PI - Math.PI * smooth(turn);
  } else if (c < WAIT + LEG) {
    a = A0 + (A1 - A0) * smooth((c - WAIT) / LEG); h = tangent(a);
  } else if (c < 2 * WAIT + LEG) { // at the pier's right, turning round
    a = A1; near = 'R'; turn = (c - WAIT - LEG) / WAIT; moving = false;
    h = tangent(A1) + Math.PI * smooth(turn);
  } else {
    a = A1 - (A1 - A0) * smooth((c - 2 * WAIT - LEG) / LEG); h = tangent(a) + Math.PI;
  }
  const [x, y] = ellipse(a);
  return { x, y, z: Math.sin(t * 2.3) * 0.03, h, near, turn, moving, pass };
}
// The parcel rides on the boat's foredeck.
const parcelAt = (p) => [p.x + Math.cos(p.h) * 0.72, p.y + Math.sin(p.h) * 0.72, p.z + 0.42];

// The hull, in the boat's own frame (u along it, v across), and its freeboard.
const HULL = [[1.15, 0], [0.75, 0.43], [-0.85, 0.46], [-1.05, 0.4], [-1.05, -0.4], [-0.85, -0.46], [0.75, -0.43]];
const FORE = [[1.15, 0], [0.75, 0.43], [0.52, 0.44], [0.52, -0.44], [0.75, -0.43]];
const FREE = 0.42;
const HULL_C = C.brown;

// The Courier: brown uniform, brown cap (the engine's cap is always coral).
function brownCap(ctx, hy) {
  ctx.beginPath();
  ctx.arc(0.02, hy - 0.08, 0.32, Math.PI, 0);
  ctx.rect(0.1, hy - 0.1, 0.38, 0.08);
  paint(ctx, C.brown, { lw: 0.03 });
}
const COURIER = { ...folk(7), skin: SKIN[2], hair: HAIR[1], style: 'short', top: C.brown, bottom: shade(C.brown, 0.18), dress: false, hat: 'none', face: brownCap };
const COURIER_SAYS = ['G. GOOSE?', 'SIGN HERE?', 'IT SAYS URGENT', 'JUST A SIGNATURE', 'G. GOOSE??'];
const NOPE = ['NOPE.', 'NOT TODAY.', 'KEEP GOING.', 'NO LANDING.', 'SHOO.'];

// (About 0.6 across, so it reads on a phone: the art director's size.)
const PK = 1.45;
function parcel(ctx, x, y, z) {
  const w = 0.21 * PK, d = 0.18 * PK, h = 0.3 * PK;
  box(ctx, x - w, y - d, z, 2 * w, 2 * d, h, KRAFT, { lw: 0.03, dens: 0.1 });
  if (!Q.detail) return;
  // String both ways round the top, and the label on the side facing us.
  face(ctx, [[x - w, y, z + h], [x + w, y, z + h]], null, { lw: 0.025, stroke: C.white });
  face(ctx, [[x, y - d, z + h], [x, y + d, z + h], [x, y + d, z]], null, { lw: 0.025, stroke: C.white });
  face(ctx, [[x - 0.17 * PK, y + d + 0.001, z + 0.05 * PK], [x + 0.13 * PK, y + d + 0.001, z + 0.05 * PK], [x + 0.13 * PK, y + d + 0.001, z + 0.22 * PK], [x - 0.17 * PK, y + d + 0.001, z + 0.22 * PK]], C.white, { lw: 0.012 });
  if (Q.pxPerUnit < 24) return;
  lettering(ctx, 'x', x - 0.02 * PK, y + d + 0.01, z + 0.17 * PK, 'G. GOOSE', 0.055 * PK);
  lettering(ctx, 'x', x - 0.02 * PK, y + d + 0.01, z + 0.1 * PK, 'MS BOTTOMLESS', 0.04 * PK);
}
const KRAFT = C.woodLight;

function drawBoat(ctx, t, p) {
  const c = Math.cos(p.h), s = Math.sin(p.h);
  const W = (u, v, z = 0) => [p.x + u * c - v * s, p.y + u * s + v * c, p.z + z];
  // The wake: foam where the stern has been.
  if (Q.detail && p.moving) {
    for (let i = 1; i <= 5; i++) {
      const q = tender(t - i * 0.3);
      const [X, Y] = P(q.x - Math.cos(q.h) * 1.1, q.y - Math.sin(q.h) * 1.1, 0);
      ctx.beginPath();
      ctx.ellipse(X, Y, 0.22 + i * 0.13, 0.1 + i * 0.05, 0, 0, TAU);
      ctx.fillStyle = alpha(C.white, 0.45 * (1 - i / 6));
      ctx.fill();
    }
  }
  // Foam round the waterline.
  poly(ctx, HULL.map(([u, v]) => W(u * 1.1, v * 1.25, 0)));
  ctx.fillStyle = alpha(C.white, p.moving ? 0.55 : 0.3);
  ctx.fill();
  // Which way each side faces: the ones facing us are drawn from outside,
  // the far ones from inside.
  const sides = HULL.map((a, i) => {
    const b = HULL[(i + 1) % HULL.length];
    const mu = (a[0] + b[0]) / 2, mv = (a[1] + b[1]) / 2;
    let nu = b[1] - a[1], nv = -(b[0] - a[0]);
    if (nu * mu + nv * mv < 0) { nu = -nu; nv = -nv; }
    const nx = nu * c - nv * s, ny = nu * s + nv * c;
    return { a, b, near: nx + ny > 0, nx, ny };
  });
  const IN = (u, v, z) => W(u * 0.9, v * 0.86, z);
  face(ctx, HULL.map(([u, v]) => IN(u, v, 0.15)), shade(C.wood, 0.3), { lw: 0.02 });
  for (const sd of sides) {
    if (sd.near) continue;
    face(ctx, [IN(...sd.a, 0.15), IN(...sd.b, 0.15), IN(...sd.b, FREE), IN(...sd.a, FREE)], shade(C.wood, 0.1), { lw: 0.02 });
  }
  // The outboard, if it's round the far side.
  const [mx, my] = W(-1.18, 0);
  const motor = () => {
    cylinder(ctx, mx, my, p.z + 0.2, 0.15, 0.5, C.greyLight, { top: C.grey });
    if (Q.detail && p.moving) {
      const k = (t * 3) % 1;
      const [X, Y] = P(mx, my, p.z + 0.85 + k * 0.6);
      ctx.beginPath(); ctx.arc(X - k * 0.2, Y, 0.06 + k * 0.08, 0, TAU);
      ctx.fillStyle = alpha(C.grey, 0.5 * (1 - k)); ctx.fill();
    }
  };
  const motorFirst = mx + my < p.x + p.y;
  if (motorFirst) motor();
  // The Courier: sat at the tiller, or up on his feet at the pier, waving the
  // paperwork.
  const [cx, cy] = W(-0.55, 0);
  const sx = c - s; // which way the boat's heading on screen
  const standing = !!p.near;
  const turned = standing ? (p.near === 'L' ? 'r' : 'l') : (sx >= 0 ? 'r' : 'l');
  person(ctx, cx, cy, p.z + (standing ? 0.15 : -0.3), {
    ...COURIER,
    pose: standing ? 'wave' : 'sit',
    dir: turned,
    speed: standing ? 9 : 7,
    hold: standing ? (g) => { g.beginPath(); g.rect(-0.05, -0.3, 0.3, 0.38); paint(g, C.white, { lw: 0.02 }); } : null,
  }, t);
  // The near sides, the gunwale, the foredeck, and the stripe.
  for (const sd of sides) {
    if (!sd.near) continue;
    const col = sd.nx > sd.ny ? shade(HULL_C, 0.08) : shade(HULL_C, 0.26);
    face(ctx, [W(...sd.a, 0), W(...sd.b, 0), W(...sd.b, FREE), W(...sd.a, FREE)], col, { lw: 0.03, dots: shade(HULL_C, 0.55), density: 0.12 });
    if (Q.detail) face(ctx, [W(...sd.a, 0.26), W(...sd.b, 0.26), W(...sd.b, 0.32), W(...sd.a, 0.32)], C.mustard, { stroke: false });
  }
  poly(ctx, HULL.map(([u, v]) => W(u, v, FREE)));
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.stroke(); }
  ctx.strokeStyle = tint(C.wood, 0.3); ctx.lineWidth = 0.06; ctx.stroke();
  face(ctx, FORE.map(([u, v]) => W(u, v, FREE)), tint(C.wood, 0.2), { lw: 0.03 });
  parcel(ctx, ...parcelAt(p));
  if (!motorFirst) motor();
  // Words at the pier: his, then the harbourmaster's (drawn on the pier).
  if (p.near && p.turn < 0.5 && Q.detail) speech(ctx, cx, cy, p.z + 2.6, COURIER_SAYS[p.pass % COURIER_SAYS.length], { size: 0.36 });
}

// ---------- People ----------
// A floral holiday shirt: a few white flowers over the top.
const floral = (ink) => (ctx, b) => {
  if (!Q.detail) return;
  ctx.fillStyle = ink;
  for (const [dx, dy] of [[-0.14, 0.2], [0.1, 0.38], [-0.05, 0.6], [0.16, 0.12]]) {
    ctx.beginPath(); ctx.arc(dx, b.top + dy, 0.045, 0, TAU); ctx.fill();
  }
};
const HARBOUR = { ...folk(122), skin: SKIN[4], hair: HAIR[6], style: 'short', top: C.white, bottom: C.navy, dress: false, hat: 'none' };
// A moustache under the harbourmaster's cap (the captain's cap, from the style sheet).
function harbourFace(glasses) {
  return (ctx, hy, back) => {
    COSTUME.captain.face(ctx, hy);
    if (back) return;
    ctx.fillStyle = C.ink;
    ctx.beginPath(); ctx.ellipse(0.2, hy + 0.13, 0.13, 0.045, 0, 0, TAU); ctx.fill();
    if (glasses) { // binoculars, up to his eyes
      ctx.beginPath(); ctx.roundRect(0.16, hy - 0.07, 0.3, 0.18, 0.05); paint(ctx, C.ink, { lw: 0.02 });
    }
  };
}
const BAND = [
  { x: 11.6, y: 9.45, look: { ...folk(201), top: INK.flamingo, bottom: C.white, dress: false, hat: 'none', wear: floral(C.white) } },
  { x: 12.55, y: 9.6, look: { ...folk(202), top: INK.sunYellow, bottom: C.white, dress: false, hat: 'none', style: 'curly', wear: floral(INK.flamingo) } },
  { x: 13.3, y: 9.55, look: { ...folk(203), top: C.coral, bottom: C.white, dress: false, hat: 'sun', wear: floral(C.white) } },
];
// What the band's doing, by the hour: tuning, rehearsing in bursts, the welcome.
const bandPlaying = (t, i) => {
  const h = hourOf(t);
  if (h >= 18) return 2; // the welcome, flat out
  if (h >= 15) return (t % 13) < 8 ? 1 : 0;
  if (h >= 12) return i < 2 && (t % 17) < 6 ? 1 : 0;
  return 0;
};

// A steel pan on its stand: a shallow chrome drum, dished in the top.
function pan(ctx, x, y, z, r = 0.34) {
  if (Q.detail) {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.04;
    for (const [dx, dy] of [[-0.2, 0.15], [0.2, 0.15], [0, -0.22]]) {
      const [A, B] = P(x + dx, y + dy, 0), [E, F] = P(x, y, z);
      ctx.beginPath(); ctx.moveTo(A, B); ctx.lineTo(E, F); ctx.stroke();
    }
  }
  cylinder(ctx, x, y, z, r, 0.16, MAT.chrome, { top: tint(MAT.chrome, 0.3) });
  disc(ctx, x, y, z + 0.16, r * 0.72, shade(MAT.chrome, 0.12), { lw: 0.015 });
  if (Q.detail) {
    for (const [dx, dy] of [[-0.1, -0.05], [0.1, 0.02], [0, 0.1]]) disc(ctx, x + dx, y + dy, z + 0.16, 0.06, tint(MAT.chrome, 0.2), { lw: 0.01 });
  }
}
// A note on the air, as the band plays.
function note(ctx, X, Y, s, ink) {
  ctx.fillStyle = ink; ctx.strokeStyle = ink; ctx.lineWidth = 0.035 * s;
  ctx.beginPath(); ctx.ellipse(X, Y, 0.1 * s, 0.07 * s, -0.4, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(X + 0.09 * s, Y - 0.02 * s); ctx.lineTo(X + 0.09 * s, Y - 0.4 * s);
  ctx.quadraticCurveTo(X + 0.24 * s, Y - 0.3 * s, X + 0.2 * s, Y - 0.18 * s); ctx.stroke();
}

// ---------- Palms ----------
// A palm: a curved trunk from (x, y) to its top (x + lx, y + ly, h), and a
// crown of fronds that sways (the crown is its own moving item).
function palmTrunk(ctx, x, y, h, lx, ly) {
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const k = i / 10, bend = k * k;
    pts.push(P(x + lx * bend, y + ly * bend, h * k));
  }
  if (Q.detail) { // its shadow on the sand
    const [X, Y] = P(x + lx * 0.6 + 0.6, y + ly * 0.6 + 0.3, 0);
    ctx.beginPath(); ctx.ellipse(X, Y, 1.5, 0.55, 0, 0, TAU);
    ctx.fillStyle = alpha(C.ink, 0.1); ctx.fill();
  }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach(([X, Y], i) => (i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y)));
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.36; ctx.stroke(); }
  ctx.strokeStyle = INK.teak; ctx.lineWidth = 0.26; ctx.stroke();
  if (!Q.detail) return;
  ctx.strokeStyle = shade(INK.teak, 0.35); ctx.lineWidth = 0.03;
  for (let i = 1; i < 10; i++) {
    const [X, Y] = pts[i];
    ctx.beginPath(); ctx.moveTo(X - 0.12, Y + 0.02); ctx.quadraticCurveTo(X, Y + 0.06, X + 0.12, Y + 0.02); ctx.stroke();
  }
}
function palmCrown(ctx, top, t, seed, n = 8, len = 2) {
  const [tx, ty, tz] = top;
  const sway = Math.sin(t * 0.8 + seed) * 0.06;
  const fronds = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + seed + sway * (1 + (i % 3) * 0.3);
    const L = len * (0.85 + ((i * 37) % 10) / 40);
    fronds.push({ a, L, key: Math.cos(a) + Math.sin(a), i });
  }
  fronds.sort((p, q) => p.key - q.key);
  const nuts = () => {
    for (const [dx, dy] of [[0.12, 0.05], [-0.05, 0.14], [0.05, -0.1]]) disc(ctx, tx + dx, ty + dy, tz - 0.2, 0.13, C.brown, { lw: 0.02 });
  };
  let nutsDrawn = false;
  for (const f of fronds) {
    if (!nutsDrawn && f.key > 0) { nuts(); nutsDrawn = true; }
    const lift = Math.sin(t * 1.3 + f.i + seed) * 0.05;
    const pt = (k) => P(tx + Math.cos(f.a) * f.L * k, ty + Math.sin(f.a) * f.L * k, tz + (0.5 + lift) * k - 1.35 * k * k);
    const [X0, Y0] = pt(0), [X1, Y1] = pt(0.5), [X2, Y2] = pt(1);
    let nx = -(Y2 - Y0), ny = X2 - X0;
    const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
    const w = 0.34;
    ctx.beginPath();
    ctx.moveTo(X0, Y0);
    ctx.quadraticCurveTo(X1 + nx * w * 2, Y1 + ny * w * 2, X2, Y2);
    ctx.quadraticCurveTo(X1 - nx * w * 2, Y1 - ny * w * 2, X0, Y0);
    paint(ctx, f.i % 2 ? C.leaf : C.green, { lw: 0.03, dots: Q.detail && f.key < 0 ? shade(C.green, 0.4) : null, density: 0.18 });
    if (!Q.detail) continue;
    ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.quadraticCurveTo(X1, Y1, X2, Y2);
    ctx.strokeStyle = shade(C.green, 0.35); ctx.lineWidth = 0.025; ctx.stroke();
    // Leaflets, cut into the edge.
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02;
    for (let k = 0.3; k < 0.95; k += 0.16) {
      const [A, B] = pt(k);
      ctx.beginPath(); ctx.moveTo(A, B); ctx.lineTo(A + nx * w * 0.8, B + ny * w * 0.8 + 0.06);
      ctx.moveTo(A, B); ctx.lineTo(A - nx * w * 0.8, B - ny * w * 0.8 + 0.06);
      ctx.stroke();
    }
  }
  if (!nutsDrawn) nuts();
}
const PALMS = [
  { x: 5, y: 7, h: 5.2, lx: -0.9, ly: -0.5, seed: 0.4 },
  { x: 14.8, y: 10.2, h: 5.8, lx: 0.8, ly: -1.0, seed: 2.1, n: 7, len: 1.8 },
  { x: 4.4, y: 9.9, h: 3.4, lx: -0.8, ly: 0.3, seed: 4.2, n: 7, len: 1.6 },
];

// A coconut on the sand; o.face paints one on it (the find).
// o.s scales it (the find is a big one, about 0.65 across, so it reads on a phone).
function coconut(ctx, x, y, z, o = {}) {
  const [X0, Y0] = P(x, y, z);
  if (o.s) { ctx.save(); ctx.translate(X0, Y0); ctx.scale(o.s, o.s); ctx.translate(-X0, -Y0); }
  coconutAt(ctx, X0, Y0, o);
  if (o.s) ctx.restore();
}
function coconutAt(ctx, X, Y, o) {
  ctx.beginPath(); ctx.ellipse(X, Y, 0.24, 0.21, o.tilt || 0, 0, TAU);
  paint(ctx, C.brown, { lw: 0.025, dots: shade(C.brown, 0.5), density: 0.3 });
  if (!Q.detail) return;
  if (o.face) {
    ctx.fillStyle = C.white;
    ctx.beginPath(); ctx.arc(X - 0.07, Y - 0.04, 0.035, 0, TAU); ctx.arc(X + 0.07, Y - 0.04, 0.035, 0, TAU); ctx.fill();
    ctx.strokeStyle = C.white; ctx.lineWidth = 0.025; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(X, Y + 0.0, 0.09, 0.25, Math.PI - 0.25); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X - 0.11, Y - 0.1); ctx.lineTo(X - 0.03, Y - 0.08); ctx.moveTo(X + 0.11, Y - 0.1); ctx.lineTo(X + 0.03, Y - 0.08); ctx.stroke();
    ctx.fillStyle = C.ink;
    ctx.beginPath(); ctx.arc(X - 0.065, Y - 0.035, 0.015, 0, TAU); ctx.arc(X + 0.075, Y - 0.035, 0.015, 0, TAU); ctx.fill();
  } else { // its own three eyes, at the top
    ctx.fillStyle = shade(C.brown, 0.55);
    for (const [dx, dy] of [[-0.05, -0.1], [0.04, -0.12], [0, -0.05]]) { ctx.beginPath(); ctx.arc(X + dx, Y + dy, 0.022, 0, TAU); ctx.fill(); }
  }
}

// A lei: a loop of flowers.
function lei(ctx, X, Y, s, ink) {
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU;
    ctx.beginPath(); ctx.arc(X + Math.cos(a) * 0.16 * s, Y + Math.sin(a) * 0.08 * s, 0.045 * s, 0, TAU);
    ctx.fillStyle = i % 3 ? ink : C.white; ctx.fill();
  }
}
const LEI_INKS = [INK.flamingo, C.coral, C.butter, C.pink, C.lilac];

// A tiki torch: a bamboo pole and a flame (lit at sunset).
const TORCHES = [[7.6, 11.3], [10.4, 8.55]];

// A crab, scuttling sideways, claws up.
function crab(ctx, x, y, t, moving) {
  const [X, Y] = P(x, y, 0.08);
  const k = moving ? Math.sin(t * 22) * 0.03 : 0;
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03;
  ctx.beginPath();
  for (const sgn of [-1, 1]) for (let i = 0; i < 3; i++) {
    ctx.moveTo(X + sgn * 0.08, Y + 0.02); ctx.lineTo(X + sgn * (0.2 + i * 0.03), Y + 0.08 + (i % 2 ? k : -k));
  }
  ctx.stroke();
  ctx.beginPath(); ctx.ellipse(X, Y, 0.14, 0.08, 0, 0, TAU); paint(ctx, C.coral, { lw: 0.025 });
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.arc(X + sgn * 0.17, Y - 0.1 + k, 0.05, 0, TAU); paint(ctx, C.coral, { lw: 0.02 }); }
  if (!Q.detail) return;
  ctx.fillStyle = C.ink;
  ctx.beginPath(); ctx.arc(X - 0.04, Y - 0.08, 0.018, 0, TAU); ctx.arc(X + 0.04, Y - 0.08, 0.018, 0, TAU); ctx.fill();
}

// Along a polyline, k from 0 to 1: where, and which way on screen.
function along(pts, k) {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  let d = clamp(k) * lens.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const u = lens[i] ? Math.min(1, d / lens[i]) : 0, [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      return { x: ax + (bx - ax) * u, y: ay + (by - ay) * u, dir: (bx - ax) - (by - ay) >= 0 ? 'r' : 'l' };
    }
    d -= lens[i];
  }
  return { x: pts[0][0], y: pts[0][1], dir: 'r' };
}

// The pier, the flagpole and the banner.
const PIER = { x0: 8, x1: 9.4, y0: 11.8, y1: 15.9, z: 0.6 };
const POLE = [8.2, 15.4];
const HM = [9.0, 14.3];
const BAN = { x0: 6.9, x1: 10.9, y: 12.2, h: 4 };
const WORKER = [11.5, 12.85];
// The shop: its walls, the serving window on its right side.
const SHOP = { x0: 11, y0: 5, x1: 14, y1: 8, h: 2.2 };
const WIN = { y0: 5.5, y1: 7.5, z0: 1.0, z1: 2.0 };
// The napper who keeps the shop: his deck chair, and his walk to work at 3.
const CHAIR = [6.2, 6.4];
const TO_WORK = [[6.6, 6.9], [8.8, 7.7], [10.6, 8.4], [11.75, 8.2]];
const KEEPER = { ...folk(125), skin: SKIN[3], hair: HAIR[4], style: 'bald', top: C.sky, bottom: C.white, dress: false, wear: floral(C.white) };

export default {
  id: 'port',
  name: 'The Port',
  blurb: 'The island has spent all day getting ready for the ship. At six it arrives, up goes the yellow flag, and the band plays the welcome anyway.',

  build(R) {
    // ---------- The sand and the shallows ----------
    R.floor((ctx) => {
      // The shallows, paler toward the beach (white over the sea, so they
      // follow the sea's colour through the day).
      blob(ctx, 1.2, alpha(C.white, 0.14));
      blob(ctx, 0.6, alpha(C.white, 0.16));
      if (Q.detail) { // ripples of sand under the water
        ctx.strokeStyle = alpha(C.white, 0.35); ctx.lineWidth = 0.04;
        for (const [x, y] of [[3.6, 11.4], [2.9, 6.2], [15.9, 11.2], [12.2, 14.1], [6.5, 3.5], [15.7, 4.4]]) {
          for (let i = 0; i < 3; i++) { const [X, Y] = P(x + i * 0.25, y + i * 0.2, 0); ctx.beginPath(); ctx.moveTo(X - 0.4, Y); ctx.quadraticCurveTo(X, Y - 0.12, X + 0.4, Y); ctx.stroke(); }
        }
      }
      // Wet sand, then dry.
      blob(ctx, 0.15, WET, { stroke: C.ink, lw: 0.04 });
      blob(ctx, -0.3, SAND, { dots: shade(INK.sunYellow, 0.3), density: 0.12 });
      if (!Q.detail) return;
      // Stepping planks from the pier to the shop door.
      for (let i = 0; i < 6; i++) {
        const { x, y } = along([[8.7, 11.7], [9.6, 10.4], [10.4, 9.0], [11.7, 8.2]], (i + 0.5) / 6);
        face(ctx, [[x - 0.35, y - 0.2, 0.01], [x + 0.35, y - 0.2, 0.01], [x + 0.35, y + 0.2, 0.01], [x - 0.35, y + 0.2, 0.01]], INK.teak, { lw: 0.025 });
      }
      // Footprints to the deck chair, starfish and shells.
      ctx.fillStyle = alpha(shade(INK.sunYellow, 0.45), 0.6);
      for (let i = 0; i < 8; i++) {
        const { x, y } = along(TO_WORK, i / 8);
        const [X, Y] = P(x + (i % 2 ? 0.12 : -0.12), y, 0);
        ctx.beginPath(); ctx.ellipse(X, Y, 0.07, 0.04, 0.4, 0, TAU); ctx.fill();
      }
      for (const [x, y, ink] of [[4.6, 12.1, INK.flamingo], [15.1, 7.9, C.coral], [7.2, 4.2, INK.flamingo]]) {
        const [X, Y] = P(x, y, 0);
        ctx.beginPath();
        for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU - Math.PI / 2, r = i % 2 ? 0.07 : 0.18; ctx.lineTo(X + Math.cos(a) * r, Y + Math.sin(a) * r * 0.6); }
        ctx.closePath(); paint(ctx, ink, { lw: 0.02 });
      }
      for (const [x, y] of [[9.9, 12.8], [5.3, 12.2], [14.6, 11.4], [3.9, 8.1], [10.6, 3.9]]) disc(ctx, x, y, 0, 0.08, C.white, { lw: 0.015 });
      // Beach grass in tufts.
      ctx.strokeStyle = C.green; ctx.lineWidth = 0.04; ctx.lineCap = 'round';
      for (const [x, y] of [[4.3, 7.8], [6.8, 4.4], [9.2, 4.0], [15.0, 6.8], [12.1, 3.9], [4.7, 11.2], [14.6, 10.1]]) {
        const [X, Y] = P(x, y, 0);
        ctx.beginPath();
        for (let i = -2; i <= 2; i++) { ctx.moveTo(X + i * 0.05, Y); ctx.quadraticCurveTo(X + i * 0.1, Y - 0.2, X + i * 0.16, Y - 0.34); }
        ctx.stroke();
      }
    });
    // The surf, lapping: a line of foam at the water's edge, and a fainter
    // one spreading out and fading.
    R.rug((ctx, t) => {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      foamLine(ctx, 0.28 + Math.sin(t * 1.6) * 0.08, t, 0);
      ctx.strokeStyle = alpha(C.white, 0.8); ctx.lineWidth = 0.1; ctx.stroke();
      if (!Q.detail) return;
      const k = (t / 3.2) % 1;
      foamLine(ctx, 0.5 + k * 0.7, t, 2);
      ctx.strokeStyle = alpha(C.white, 0.5 * (1 - k)); ctx.lineWidth = 0.06; ctx.stroke();
    }, { anim: true });
    // The band's stage: pallets on the sand.
    R.rug((ctx) => {
      box(ctx, 11.0, 8.9, 0, 2.85, 1.7, 0.25, INK.teak, { dens: 0.2 });
      if (!Q.detail) return;
      for (let x = 11.4; x < 13.8; x += 0.4) face(ctx, [[x, 8.9, 0.25], [x, 10.6, 0.25]], null, { lw: 0.02, stroke: MAT.teakDark });
    });

    // ---------- The palms ----------
    for (const pm of PALMS) {
      const top = [pm.x + pm.lx, pm.y + pm.ly, pm.h];
      R.thing(pm.x, pm.y, (ctx) => palmTrunk(ctx, pm.x, pm.y, pm.h, pm.lx, pm.ly));
      R.thing(pm.x, pm.y, (ctx, t) => palmCrown(ctx, top, t, pm.seed, pm.n, pm.len), { anim: true, depth: pm.x + pm.y + 0.01 });
    }
    // Coconuts fallen under the palms. Under the front palm, a pile, and one
    // of them has had a face painted on it.
    R.thing(4.4, 7.7, (ctx) => {
      coconut(ctx, 3.9, 7.3, 0.2); coconut(ctx, 4.3, 7.6, 0.2, { tilt: 0.5 });
    });
    const FACE = [13.05, 11.75, 0.56];
    R.thing(13.5, 12.0, (ctx) => {
      coconut(ctx, 12.7, 11.55, 0.2);
      coconut(ctx, 13.15, 11.4, 0.2, { tilt: 0.4 });
      coconut(ctx, 13.35, 11.85, 0.2, { tilt: -0.3 });
      coconut(ctx, 12.9, 12.0, 0.2);
      coconut(ctx, ...FACE, { face: true, s: 1.35 });
      // Half a husk, emptied.
      const [X, Y] = P(13.8, 12.3, 0.1);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.22, 0.12, 0, 0, Math.PI); ctx.closePath();
      paint(ctx, C.brown, { lw: 0.02 });
      ctx.beginPath(); ctx.ellipse(X, Y, 0.2, 0.08, 0, 0, TAU); ctx.fillStyle = C.white; ctx.fill();
    });
    R.find({ id: 'coconut', label: 'A coconut with a face', at: FACE, r: 0.75 });

    // ---------- The gift shop ----------
    R.thing(SHOP.x1, SHOP.y1, (ctx) => {
      const { x0, y0, x1, y1, h } = SHOP;
      box(ctx, x0, y0, 0, x1 - x0, y1 - y0, h, INK.teak, { dens: 0.16 });
      if (Q.detail) { // bamboo, up both faces we see
        ctx.strokeStyle = MAT.teakDark; ctx.lineWidth = 0.025;
        for (let x = x0 + 0.3; x < x1; x += 0.3) { const [A, B] = P(x, y1, 0), [, D] = P(x, y1, h); ctx.beginPath(); ctx.moveTo(A, B); ctx.lineTo(A, D); ctx.stroke(); }
        for (let y = y0 + 0.3; y < y1; y += 0.3) {
          if (y > WIN.y0 && y < WIN.y1) continue;
          const [A, B] = P(x1, y, 0), [, D] = P(x1, y, h); ctx.beginPath(); ctx.moveTo(A, B); ctx.lineTo(A, D); ctx.stroke();
        }
      }
      // The door, with a bead curtain.
      face(ctx, [[11.3, y1, 0], [12.2, y1, 0], [12.2, y1, 1.9], [11.3, y1, 1.9]], shade(INK.teak, 0.65), { lw: 0.03 });
      if (Q.detail) {
        ctx.lineWidth = 0.035; ctx.setLineDash([0.06, 0.05]);
        for (let i = 0; i < 6; i++) {
          const x = 11.38 + i * 0.15, [A, B] = P(x, y1 + 0.01, 1.85), [, D] = P(x, y1 + 0.01, 0.2);
          ctx.strokeStyle = [INK.flamingo, INK.sunYellow, C.white][i % 3];
          ctx.beginPath(); ctx.moveTo(A, B); ctx.lineTo(A, D); ctx.stroke();
        }
        ctx.setLineDash([]);
      }
      // The counter under the window, and the price board under that.
      box(ctx, x1, WIN.y0 - 0.15, 0.92, 0.38, WIN.y1 - WIN.y0 + 0.3, 0.08, C.wood, { flat: true, lw: 0.03 });
      board(ctx, 'y', x1 + 0.02, 6.5, 0.5, 1.9, 0.62, '', { board: C.ink });
      lettering(ctx, 'y', x1 + 0.03, 6.5, 0.64, 'COCONUT  $5', 0.15, C.white);
      lettering(ctx, 'y', x1 + 0.03, 6.5, 0.38, 'WITH A FACE  $40', 0.15, INK.sunYellow);
      // The thatch: two slopes we see, a fringe at the eaves.
      const E = 0.5, ez = h, apex = [12.5, 6.5, 4.3];
      face(ctx, [[x0 - E, y1 + E, ez], [x1 + E, y1 + E, ez], apex], C.mustard, { lw: 0.04, dots: shade(C.mustard, 0.45), density: 0.28 });
      face(ctx, [[x1 + E, y0 - E, ez], [x1 + E, y1 + E, ez], apex], C.butter, { lw: 0.04, dots: shade(C.mustard, 0.3), density: 0.18 });
      if (Q.detail) {
        ctx.strokeStyle = shade(C.mustard, 0.3); ctx.lineWidth = 0.025;
        const [AX, AY] = P(...apex);
        for (let k = 0.1; k < 1; k += 0.1) {
          for (const pt of [[x0 - E + (x1 - x0 + 2 * E) * k, y1 + E], [x1 + E, y0 - E + (y1 - y0 + 2 * E) * k]]) {
            const [X, Y] = P(pt[0], pt[1], ez);
            ctx.beginPath(); ctx.moveTo(AX, AY); ctx.lineTo(X, Y); ctx.stroke();
          }
        }
        // The fringe, hanging off the eaves.
        ctx.strokeStyle = shade(C.mustard, 0.2); ctx.lineWidth = 0.05;
        for (let k = 0; k <= 1.001; k += 0.05) {
          for (const pt of [[x0 - E + (x1 - x0 + 2 * E) * k, y1 + E], [x1 + E, y0 - E + (y1 - y0 + 2 * E) * k]]) {
            const [X, Y] = P(pt[0], pt[1], ez);
            ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + 0.02, Y + 0.28 + ((k * 31) % 1) * 0.12); ctx.stroke();
          }
        }
      }
      // Its name, on a board over the eaves.
      board(ctx, 'x', 12.3, y1 + E + 0.06, 3.05, 2.4, 0.6, '', { board: INK.flamingo });
      lettering(ctx, 'x', 12.3, y1 + E + 0.07, 3.1, 'GIFT SHOP', 0.34, C.white, 'Bagel Fat One');
      lettering(ctx, 'x', 12.3, y1 + E + 0.07, 2.86, 'souvenirs of a place you never went', 0.1, C.white);
    });
    // The serving window: shuttered, BACK AT 3, until three; then the shutter
    // rolls up on the shopkeeper and everything nobody will buy.
    R.thing(SHOP.x1 + 0.05, SHOP.y1 - 0.2, (ctx, t) => {
      const x = SHOP.x1 + 0.01, { y0, y1, z0, z1 } = WIN;
      const h = hourOf(t);
      const open = ramp(t, 14.98, 15.08); // the shutter's roll, 0 shut to 1 up
      const win = [[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]];
      if (open > 0) {
        face(ctx, win, shade(INK.teak, 0.7), { lw: 0.03 });
        ctx.save();
        poly(ctx, win); ctx.clip();
        // Shelves at the back: snow globes, T-shirts.
        if (Q.detail) {
          for (const [i, ink] of [[0, INK.flamingo], [1, C.sky], [2, INK.sunYellow]]) {
            const yy = 5.75 + i * 0.6, [X, Y] = P(12.2, yy, 1.85);
            ctx.beginPath(); ctx.moveTo(X - 0.2, Y); ctx.lineTo(X + 0.2, Y); ctx.lineTo(X + 0.14, Y + 0.4); ctx.lineTo(X - 0.14, Y + 0.4); ctx.closePath();
            paint(ctx, ink, { lw: 0.015 });
          }
        }
        // The shopkeeper, waving at nobody when the ship's in.
        person(ctx, 13.45, 6.55, -0.55, { ...KEEPER, dir: 'r', pose: h >= 18 ? 'wave' : 'stand' }, t);
        ctx.restore();
        // On the counter: a coconut in sunglasses, snow globes, folded shirts.
        coconut(ctx, SHOP.x1 + 0.2, 5.75, 1.18);
        if (Q.detail) { const [X, Y] = P(SHOP.x1 + 0.2, 5.75, 1.18); ctx.fillStyle = C.ink; ctx.fillRect(X - 0.13, Y - 0.08, 0.26, 0.06); }
        for (const [yy, ink] of [[6.3, C.sky], [6.6, INK.flamingo]]) {
          cylinder(ctx, SHOP.x1 + 0.18, yy, 1.0, 0.1, 0.05, C.wood, { flat: true });
          const [X, Y] = P(SHOP.x1 + 0.18, yy, 1.17);
          ctx.beginPath(); ctx.arc(X, Y, 0.11, 0, TAU); paint(ctx, alpha(ink, 0.8), { lw: 0.02 });
        }
        box(ctx, SHOP.x1 + 0.05, 6.9, 1.0, 0.28, 0.45, 0.18, C.white, { flat: true, lw: 0.02 });
        if (Q.detail && Q.pxPerUnit >= 26) lettering(ctx, 'y', SHOP.x1 + 0.34, 7.12, 1.09, "I WASN'T ALLOWED OFF", 0.035);
        board(ctx, 'y', SHOP.x1 + 0.3, 7.25, 1.22, 0.4, 0.22, 'OPEN', { board: INK.sunYellow, size: 0.13 });
      }
      if (open < 1) { // the shutter, rolling up from the bottom
        const zb = z0 + (z1 - z0) * open;
        face(ctx, [[x, y0, zb], [x, y1, zb], [x, y1, z1], [x, y0, z1]], tint(INK.teak, 0.2), { lw: 0.03 });
        if (Q.detail) {
          ctx.strokeStyle = shade(INK.teak, 0.3); ctx.lineWidth = 0.02;
          for (let z = zb + 0.12; z < z1; z += 0.12) face(ctx, [[x, y0, z], [x, y1, z]], null, { lw: 0.02, stroke: shade(INK.teak, 0.3) });
          if (open === 0) {
            board(ctx, 'y', x + 0.02, 6.5, 1.5, 1.2, 0.4, '', { board: C.white });
            lettering(ctx, 'y', x + 0.03, 6.5, 1.56, 'BACK AT 3', 0.16);
            lettering(ctx, 'y', x + 0.03, 6.5, 1.39, '(PROBABLY)', 0.09);
          }
        }
      }
      // The roll of shutter, up top.
      face(ctx, [[x + 0.08, y0, z1 - 0.02], [x + 0.08, y1, z1 - 0.02], [x + 0.08, y1, z1 + 0.14], [x + 0.08, y0, z1 + 0.14]], shade(INK.teak, 0.1), { lw: 0.03 });
    }, { anim: true, depth: SHOP.x1 + SHOP.y1 + 0.05 });
    // Gander Cola's cooler, by the window, and a gull on the ridge.
    R.thing(14.9, 8.1, (ctx) => {
      box(ctx, 14.25, 7.55, 0, 0.65, 0.5, 0.6, INK.funnelRed, { top: tint(INK.funnelRed, 0.2) });
      lettering(ctx, 'x', 14.57, 8.06, 0.4, 'GANDER', 0.15, C.white, 'Bagel Fat One');
      lettering(ctx, 'x', 14.57, 8.06, 0.22, 'Take a gander.', 0.07, C.white);
    }, { depth: 22.4 });
    R.thing(12.5, 6.6, (ctx, t) => gull(ctx, 12.5, 6.5, 4.25, t, { dir: 'l', peck: false, scale: 0.9 }), { anim: true, depth: 22.3 });

    // ---------- The steel band ----------
    const PANS = [[11.55, 10.1, 1.0], [12.3, 10.2, 1.0], [12.8, 10.25, 1.0]];
    for (const [x, y, z] of PANS) R.thing(x, y + 0.35, (ctx) => pan(ctx, x, y, z));
    // The bass: three oil drums, chrome.
    R.thing(13.75, 10.45, (ctx) => {
      for (const [x, y] of [[13.65, 9.85], [13.05, 10.25], [13.5, 10.3]]) {
        cylinder(ctx, x, y, 0.25, 0.22, 0.8, MAT.chrome, { top: tint(MAT.chrome, 0.2) });
        disc(ctx, x, y, 1.05, 0.15, shade(MAT.chrome, 0.12), { lw: 0.015 });
      }
    });
    BAND.forEach((b, i) => {
      R.thing(b.x, b.y, (ctx, t) => {
        const h = hourOf(t), playing = bandPlaying(t, i);
        let o = { ...b.look, dir: 'l' }, z = 0.25;
        if (i === 2 && h < 12) { // the bass, asleep on a crate till noon
          box(ctx, b.x - 0.25, b.y - 0.55, 0.25, 0.5, 0.45, 0.45, INK.teak, { dens: 0.2 });
          person(ctx, b.x, b.y - 0.35, 0.02, { ...o, pose: 'sit' }, t);
          if (Q.detail) {
            const k = (t * 0.5) % 1, [X, Y] = P(b.x - 0.4 * k, b.y - 0.35, 2.3 + k);
            ctx.font = `${0.3 + k * 0.2}px "Bagel Fat One", sans-serif`; ctx.fillStyle = alpha(C.ink, 1 - k); ctx.fillText('z', X, Y);
          }
          return;
        }
        if (i === 2) box(ctx, b.x - 0.25, b.y - 0.9, 0.25, 0.5, 0.45, 0.45, INK.teak, { dens: 0.2 });
        if (playing) o = { ...o, pose: 'drum', speed: playing === 2 ? 15 : 9 };
        else if (i === 0 && h < 15) o = { ...o, arms: [1.25 + ((t % 1.3) < 0.15 ? 0.35 : 0), 0.3] }; // tapping a note, tuning
        else if (i === 1 && h < 12) o = { ...o, pose: 'read' }; // reading the music
        else o = { ...o, pose: 'stand' };
        person(ctx, b.x, b.y, z, o, t);
        if (i === 1 && h >= 17.95 && h < 18.08 && Q.detail) speech(ctx, b.x, b.y, 3.1, 'A ONE, A TWO...', { size: 0.34 });
      }, { anim: true });
    });
    // The band's sign.
    R.thing(12.9, 11.2, (ctx) => {
      for (const x of [11.9, 12.9]) box(ctx, x - 0.04, 11.1, 0, 0.08, 0.08, 0.95, MAT.teakDark, { flat: true, stroke: false });
      board(ctx, 'x', 12.4, 11.2, 0.75, 1.5, 0.6, '', { board: C.white });
      lettering(ctx, 'x', 12.4, 11.21, 0.85, 'PAN-DEMIC', 0.24, INK.funnelRed, 'Bagel Fat One');
      lettering(ctx, 'x', 12.4, 11.21, 0.6, 'steel band  requests $5', 0.08);
    });
    // The notes: one at a time while tuning, then bursts, then the welcome.
    R.air((ctx, t) => {
      if (!Q.detail) return;
      const h = hourOf(t);
      if (h < 15 && !bandPlaying(t, 0)) {
        const k = (t % 1.3) / 1.3;
        const [X, Y] = P(11.55, 10.1, 1.4 + k * 1.3);
        note(ctx, X + Math.sin(k * 5) * 0.1, Y, 0.7, alpha(C.ink, 1 - k));
      }
      BAND.forEach((b, i) => {
        const pl = bandPlaying(t, i);
        if (!pl) return;
        const n = pl === 2 ? 4 : 2;
        for (let j = 0; j < n; j++) {
          const k = ((t * (pl === 2 ? 0.8 : 0.5) + j / n + i * 0.31) % 1);
          const [X, Y] = P(b.x - 0.2, b.y + 0.6, 1.6 + k * 2.4);
          note(ctx, X + Math.sin(k * 6 + j) * 0.35, Y, 0.8 + (j % 2) * 0.2, alpha(j % 2 ? INK.funnelRed : C.ink, 1 - k));
        }
      });
    });

    // ---------- The pier ----------
    const PIER_D = PIER.x1 + PIER.y1 - 0.5;
    R.thing(PIER.x1, PIER.y1, (ctx) => {
      const { x0, x1, y0, y1, z } = PIER;
      const piles = [];
      for (let y = 13.0; y <= y1; y += 0.95) for (const x of [x0 + 0.12, x1 - 0.12]) piles.push([x, Math.min(y, y1 - 0.12)]);
      piles.sort((a, b) => a[0] + a[1] - b[0] - b[1]);
      for (const [x, y] of piles) {
        if (Q.detail) { const [X, Y] = P(x, y, 0); ctx.beginPath(); ctx.ellipse(X, Y, 0.28, 0.12, 0, 0, TAU); ctx.fillStyle = alpha(C.white, 0.6); ctx.fill(); }
        cylinder(ctx, x, y, 0, 0.1, z, MAT.teakDark);
      }
      box(ctx, x0, y0, z - 0.15, x1 - x0, y1 - y0, 0.15, INK.teak, { lw: 0.04 });
      if (Q.detail) for (let y = y0 + 0.28; y < y1; y += 0.28) face(ctx, [[x0, y, z], [x1, y, z]], null, { lw: 0.02, stroke: MAT.teakDark });
      // Bollards at the end, and a coil of rope.
      for (const x of [x0 + 0.12, x1 - 0.12]) cylinder(ctx, x, y1 - 0.12, z, 0.1, 0.32, MAT.teakDark, { top: INK.teak });
      if (Q.detail) {
        const [X, Y] = P(9.05, 15.2, z);
        ctx.strokeStyle = C.butter; ctx.lineWidth = 0.035;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(X, Y, 0.18 - i * 0.05, 0.09 - i * 0.025, 0, 0, TAU); ctx.stroke(); }
      }
    }, { depth: PIER_D });
    // The sign at its end, facing the ship.
    R.thing(8.9, 15.95, (ctx) => {
      for (const x of [8.35, 9.25]) box(ctx, x - 0.04, 15.9, PIER.z, 0.08, 0.08, 0.95, MAT.teakDark, { flat: true, stroke: false });
      board(ctx, 'x', 8.8, 15.98, 1.25, 1.25, 0.6, '', { board: C.white });
      lettering(ctx, 'x', 8.8, 15.99, 1.36, 'PORT BARELY', 0.2, INK.funnelRed, 'Bagel Fat One');
      lettering(ctx, 'x', 8.8, 15.99, 1.14, 'POP. 9. NO VACANCY.', 0.09);
    }, { depth: PIER_D + 1.4 });
    // The red carpet, rolled out down the pier at five for the ship.
    R.thing(PIER.x1, 14, (ctx, t) => {
      const k = ramp(t, 17, 17.4);
      if (k <= 0) return;
      const ye = 12.0 + 2.0 * k, z = PIER.z + 0.005;
      face(ctx, [[8.3, 12.0, z], [9.1, 12.0, z], [9.1, ye, z], [8.3, ye, z]], MAT.carpetRed, { lw: 0.02, dots: shade(MAT.carpetRed, 0.4), density: 0.12 });
      if (k < 1) { // the roll, still going
        const [X0, Y0] = P(8.3, ye, z + 0.12), [X1, Y1] = P(9.1, ye, z + 0.12);
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1);
        if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.3; ctx.stroke(); }
        ctx.strokeStyle = MAT.carpetRed; ctx.lineWidth = 0.22; ctx.stroke();
      }
    }, { anim: true, depth: PIER_D + 0.05 });
    // The sweeper: sweeps the pier all day, rolls out the carpet at five, and
    // cheers the ship in.
    const SWEEPER = { ...folk(230), top: C.teal, bottom: C.white, dress: false, hat: 'sun', wear: floral(C.white) };
    const sweep = route([[8.45, 12.3, 1], [8.45, 13.3, 1]], { speed: 0.5, loop: false });
    R.mover((t) => {
      const h = hourOf(t);
      if (h < 17) { const p = sweep(t); return { ...p, pose: 'sweep' }; }
      if (h < 17.4) return { x: 8.45, y: 12.2 + 1.9 * ramp(t, 17, 17.4), dir: 'l', moving: true, pose: 'push' };
      return { x: 8.45, y: 14.1 - 0.35, dir: 'l', moving: false, pose: h >= 18 ? 'cheer' : 'stand' };
    }, (ctx, t, p) => {
      const broom = p.pose === 'sweep' || p.pose === 'stand';
      const sw = Math.sin(t * 5) * 0.4;
      person(ctx, p.x, p.y, PIER.z, {
        ...SWEEPER, dir: p.dir, pose: p.pose === 'cheer' ? 'cheer' : p.pose === 'push' ? 'carry' : 'stand',
        ...(p.pose === 'sweep' ? { arms: [0.9 + sw, 0.7 + sw] } : {}),
        hold: broom ? (g) => {
          g.rotate(p.pose === 'sweep' ? sw * 0.6 : 0);
          g.strokeStyle = C.ink; g.lineWidth = 0.07; g.beginPath(); g.moveTo(0, -0.5); g.lineTo(0.1, 0.9); g.stroke();
          g.beginPath(); g.moveTo(-0.12, 0.85); g.lineTo(0.3, 0.95); g.lineTo(0.28, 1.1); g.lineTo(-0.12, 1.02); g.closePath(); paint(g, C.butter, { lw: 0.02 });
        } : null,
      }, t);
    }, { depth: () => PIER_D + 0.3 });
    // The harbourmaster, at the end of the pier all day: binoculars on the
    // horizon, the tender waved off every time, and the flag at six.
    R.thing(HM[0], HM[1], (ctx, t) => {
      const h = hourOf(t), boat = tender(t);
      let o = { ...HARBOUR, dir: 'l', face: harbourFace(false) };
      let says = null;
      if (h >= 17.9 && h < 18.15) { // hauling the yellow flag up
        const k = Math.sin(t * 9);
        o = { ...o, arms: [Math.PI - 0.5 + k * 0.4, Math.PI - 0.5 - k * 0.4], dir: 'l' };
      } else if (boat.near) {
        o = { ...o, pose: 'wave', dir: boat.near === 'L' ? 'l' : 'r', speed: 11 };
        if (boat.turn >= 0.45) says = NOPE[boat.pass % NOPE.length];
      } else if (h >= 16.8 && h < 17.9) { // the ship, in sight
        o = { ...o, arms: [2.7, 2.5], face: harbourFace(true) };
      } else if (h >= 18.15) {
        o = { ...o, arms: [Math.PI - 0.9, 0.1] }; // saluting it in
      }
      person(ctx, HM[0], HM[1], PIER.z, o, t);
      if (says && Q.detail) speech(ctx, HM[0], HM[1], PIER.z + 2.7, says, { size: 0.38, fill: C.white });
    }, { anim: true, depth: PIER_D + 0.6 });
    // The flagpole: the island's own flag at the top all day, and the yellow
    // one run up under it at six. Nobody gets off.
    R.thing(POLE[0], POLE[1], (ctx) => {
      cylinder(ctx, POLE[0], POLE[1], PIER.z, 0.07, 4.4, C.white, { top: C.white });
      const [X, Y] = P(POLE[0], POLE[1], PIER.z + 4.45);
      ctx.beginPath(); ctx.arc(X, Y, 0.1, 0, TAU); paint(ctx, MAT.brass, { lw: 0.02 });
    }, { depth: PIER_D + 0.9 });
    R.thing(POLE[0] + 0.5, POLE[1], (ctx, t) => {
      const flag = (z, w, hgt, fill, o = {}) => {
        const pts = [];
        const n = 6;
        for (let i = 0; i <= n; i++) { const u = (i / n) * w; pts.push([POLE[0] + u, POLE[1], z + Math.sin(u * 5 - t * 7) * 0.07 * u]); }
        for (let i = n; i >= 0; i--) { const u = (i / n) * w; pts.push([POLE[0] + u, POLE[1], z - hgt + Math.sin(u * 5 - t * 7 - 0.4) * 0.07 * u]); }
        face(ctx, pts, fill, { lw: 0.025, ...o });
      };
      // The halyard.
      if (Q.detail) face(ctx, [[POLE[0] + 0.08, POLE[1], PIER.z + 0.9], [POLE[0] + 0.08, POLE[1], PIER.z + 4.35]], null, { lw: 0.015, stroke: C.ink });
      flag(PIER.z + 4.35, 0.95, 0.6, INK.flamingo);
      if (Q.detail) { const [X, Y] = P(POLE[0] + 0.45, POLE[1], PIER.z + 4.05 + Math.sin(0.45 * 5 - t * 7) * 0.03); ctx.beginPath(); ctx.arc(X, Y, 0.14, 0, TAU); paint(ctx, INK.sunYellow, { lw: 0.015 }); }
      const k = ramp(t, 17.9, 18.15);
      if (k <= 0) { // folded, waiting, at the foot of the pole
        box(ctx, POLE[0] + 0.12, POLE[1] - 0.15, PIER.z, 0.3, 0.3, 0.12, INK.sunYellow, { flat: true, lw: 0.02 });
        return;
      }
      flag(PIER.z + 1.2 + 2.3 * smooth(k), 0.9 * Math.min(1, 0.4 + k), 0.6, INK.sunYellow);
    }, { anim: true, depth: PIER_D + 0.95 });
    // A gull on the end bollard, working on something.
    R.thing(9.3, 15.9, (ctx, t) => gull(ctx, 9.28, 15.78, PIER.z + 0.33, t, { peck: true, dir: 'l', scale: 0.85, phase: 1 }), { anim: true, depth: PIER_D + 1.5 });

    // ---------- The welcome banner ----------
    for (const x of [BAN.x0, BAN.x1]) {
      R.thing(x, BAN.y, (ctx) => {
        cylinder(ctx, x, BAN.y, 0, 0.09, BAN.h, INK.teak);
        if (Q.detail) for (let z = 0.5; z < BAN.h; z += 0.6) disc(ctx, x, BAN.y, z, 0.1, MAT.teakDark, { lw: 0.015 });
        // A tiki face carved at the top.
        const [X, Y] = P(x, BAN.y, BAN.h + 0.25);
        ctx.beginPath(); ctx.roundRect(X - 0.2, Y - 0.3, 0.4, 0.6, 0.1); paint(ctx, MAT.teakDark, { lw: 0.03 });
        if (Q.detail) {
          ctx.fillStyle = INK.sunYellow;
          ctx.fillRect(X - 0.13, Y - 0.15, 0.1, 0.06); ctx.fillRect(X + 0.03, Y - 0.15, 0.1, 0.06);
          ctx.fillRect(X - 0.12, Y + 0.08, 0.24, 0.06);
        }
      });
    }
    // Bunting, from the banner's right pole to the shop's eaves.
    R.thing(10.9, 12.3, (ctx) => {
      if (!Q.detail) return;
      const a = [BAN.x1, BAN.y, BAN.h - 0.1], b = [10.5, 8.5, 2.25];
      const pt = (k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k - Math.sin(Math.PI * k) * 0.5];
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) { const [X, Y] = P(...pt(i / 12)); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02; ctx.stroke();
      for (let i = 1; i < 12; i++) {
        const [X, Y] = P(...pt(i / 12));
        ctx.beginPath(); ctx.moveTo(X - 0.1, Y); ctx.lineTo(X + 0.1, Y); ctx.lineTo(X, Y + 0.25); ctx.closePath();
        paint(ctx, [INK.flamingo, INK.sunYellow, C.white, C.teal][i % 4], { lw: 0.015 });
      }
    }, { depth: 23.25 });
    // The banner: a roll on the sand all morning, hauled up at half eleven,
    // up by noon, and at six, something pinned underneath.
    R.thing(BAN.x1, BAN.y, (ctx, t) => {
      const k = smooth(ramp(t, 11.5, 12)), h = hourOf(t);
      const { x0, x1, y } = BAN;
      if (k <= 0) { // rolled up, at the pole's foot
        const [X0, Y0] = P(x0 + 0.4, y + 0.5, 0.18), [X1, Y1] = P(x1 - 0.4, y + 0.5, 0.18);
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1);
        if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.44; ctx.stroke(); }
        ctx.strokeStyle = C.white; ctx.lineWidth = 0.36; ctx.stroke();
        if (Q.detail) { ctx.strokeStyle = INK.funnelRed; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(X0 + 0.5, Y0 + 0.25); ctx.lineTo(X0 + 0.9, Y0 + 0.45); ctx.stroke(); }
        return;
      }
      const zt = 1.1 + 2.6 * k, zb = Math.max(0.05, zt - 1.05);
      const pts = [];
      const n = 8;
      for (let i = 0; i <= n; i++) { const u = i / n; pts.push([x0 + 0.1 + (x1 - x0 - 0.2) * u, y, zt - Math.sin(Math.PI * u) * 0.08]); }
      for (let i = n; i >= 0; i--) { const u = i / n; pts.push([x0 + 0.1 + (x1 - x0 - 0.2) * u, y, zb + Math.sin(u * 7 - t * 2.4) * 0.05 * Math.sin(Math.PI * u)]); }
      face(ctx, pts, C.white, { lw: 0.035 });
      // The ropes to the poles.
      face(ctx, [[x0, y, BAN.h - 0.1], [x0 + 0.1, y, zt]], null, { lw: 0.02, stroke: C.ink });
      face(ctx, [[x1, y, BAN.h - 0.1], [x1 - 0.1, y, zt]], null, { lw: 0.02, stroke: C.ink });
      if (zt - zb > 0.9) {
        const xm = (x0 + x1) / 2;
        lettering(ctx, 'x', xm, y + 0.01, zt - 0.36, 'WELCOME', 0.42, INK.funnelRed, 'Bagel Fat One');
        lettering(ctx, 'x', xm, y + 0.01, zt - 0.8, 'MS BOTTOMLESS', 0.22, INK.teak, 'Bagel Fat One');
      }
      if (h >= 18.1) { // pinned under it
        const xm = (x0 + x1) / 2;
        board(ctx, 'x', xm + 0.3, y + 0.02, zb - 0.22, 2.4, 0.34, '', { board: INK.sunYellow });
        lettering(ctx, 'x', xm + 0.3, y + 0.03, zb - 0.22, '(FROM A DISTANCE)', 0.17, C.ink, 'Bagel Fat One');
      }
    }, { anim: true, depth: BAN.x1 + BAN.y + 0.1 });
    // Whoever hangs the banner: reads the instructions all morning, hauls
    // it up, sits and admires it all afternoon, and pins on the rest at six.
    const HANGER = { ...folk(240), top: C.coral, bottom: C.navy, dress: false, hat: 'cap' };
    R.thing(WORKER[0], WORKER[1] + 0.3, (ctx, t) => {
      const h = hourOf(t);
      const [x, y] = WORKER;
      box(ctx, x - 0.25, y - 0.2, 0, 0.5, 0.45, 0.42, INK.teak, { dens: 0.2 });
      if (h < 11.5 || (h >= 12.05 && h < 18.02)) {
        const reading = h < 11.5;
        person(ctx, x, y - 0.05, -0.28, {
          ...HANGER, pose: 'sit', dir: 'l', ...(reading ? { arms: [1.3, 1.2] } : {}),
          hold: reading ? (g) => { g.beginPath(); g.rect(-0.1, -0.35, 0.42, 0.5); paint(g, C.white, { lw: 0.02 }); } : (g) => {
            g.beginPath(); g.rect(-0.05, -0.2, 0.16, 0.22); paint(g, INK.funnelRed, { lw: 0.02 });
          },
        }, t);
        if (reading && Q.detail && (t % 9) < 2.5) speech(ctx, x, y, 2.4, 'STEP 1...', { size: 0.3 });
        return;
      }
      if (h < 12.05) { // hauling it up
        const k = Math.sin(t * 8);
        person(ctx, x - 0.15, y + 0.4, 0, { ...HANGER, dir: 'l', arms: [Math.PI - 0.6 + k * 0.4, Math.PI - 0.6 - k * 0.4] }, t);
        return;
      }
      person(ctx, x - 0.15, y + 0.4, 0, { ...HANGER, dir: 'l', pose: h < 18.15 ? 'point' : 'cheer' }, t);
    }, { anim: true, depth: WORKER[0] + WORKER[1] + 0.3 });

    // ---------- The torches ----------
    for (const [x, y] of TORCHES) {
      R.thing(x, y, (ctx) => {
        cylinder(ctx, x, y, 0, 0.05, 1.9, INK.teak, { flat: true });
        cylinder(ctx, x, y, 1.9, 0.12, 0.3, MAT.teakDark, { top: C.ink });
      });
      R.light({
        at: [x, y, 2.35], r: 2.2, color: C.mustard,
        k: (t) => ramp(t, 17.3, 17.6),
        draw: (ctx, t, k) => {
          if (k <= 0) return;
          const [X, Y] = P(x, y, 2.2);
          const f = Math.sin(t * 13 + x) * 0.04;
          ctx.beginPath();
          ctx.moveTo(X - 0.12 * k, Y);
          ctx.quadraticCurveTo(X - 0.1, Y - 0.25 * k, X + f, Y - 0.5 * k);
          ctx.quadraticCurveTo(X + 0.1, Y - 0.25 * k, X + 0.12 * k, Y);
          ctx.closePath();
          paint(ctx, C.coral, { stroke: false });
          ctx.beginPath(); ctx.ellipse(X, Y - 0.1 * k, 0.05 * k, 0.12 * k, 0, 0, TAU); ctx.fillStyle = C.butter; ctx.fill();
        },
      });
    }
    // The signpost, pointing everywhere at once.
    R.thing(10.25, 11.3, (ctx) => {
      box(ctx, 10.2, 11.2, 0, 0.1, 0.1, 2.5, INK.teak, { flat: true });
      const arrow = (z, text, fill, along, flip) => {
        const w = 1.3, hh = 0.3, x = 10.25, y = 11.25;
        const pts = along === 'x'
          ? [[x, y, z - hh / 2], [x + w * flip, y, z - hh / 2], [x + (w + 0.2) * flip, y, z], [x + w * flip, y, z + hh / 2], [x, y, z + hh / 2]]
          : [[x, y, z - hh / 2], [x, y + w * flip, z - hh / 2], [x, y + (w + 0.2) * flip, z], [x, y + w * flip, z + hh / 2], [x, y, z + hh / 2]];
        face(ctx, pts, fill, { lw: 0.025 });
        if (along === 'x') lettering(ctx, 'x', x + (w / 2) * flip, y + 0.01, z, text, 0.13);
        else lettering(ctx, 'y', x + 0.01, y + (w / 2) * flip, z, text, 0.13);
      };
      arrow(2.3, 'GIFT SHOP', C.white, 'x', 1);
      arrow(1.95, 'THE SHIP', INK.sunYellow, 'y', 1);
      arrow(1.6, 'BEACH (ALL OF IT)', tint(C.sky, 0.2), 'x', -1);
      arrow(1.25, 'MAINLAND 400 MI', INK.flamingo, 'y', -1);
    });

    // ---------- The islanders ----------
    // The shopkeeper, asleep in his deck chair under the palm till nearly
    // three, then a stroll to work. (He's in the window after that.)
    R.thing(CHAIR[0] + 0.6, CHAIR[1] + 0.5, (ctx) => {
      const [x, y] = CHAIR;
      for (const [lx, ly] of [[x - 0.4, y - 0.4], [x + 0.5, y - 0.4], [x - 0.4, y + 0.4], [x + 0.5, y + 0.4]]) box(ctx, lx, ly, 0, 0.06, 0.06, 0.4, MAT.teakDark, { flat: true, stroke: false });
      face(ctx, [[x - 0.45, y - 0.45, 0.4], [x + 0.55, y - 0.45, 0.35], [x + 0.55, y + 0.45, 0.35], [x - 0.45, y + 0.45, 0.4]], INK.flamingo, { lw: 0.03 });
      face(ctx, [[x - 0.45, y - 0.45, 0.4], [x - 0.45, y + 0.45, 0.4], [x - 0.7, y + 0.45, 1.2], [x - 0.7, y - 0.45, 1.2]], tint(INK.flamingo, 0.3), { lw: 0.03, dots: C.white, density: 0.2 });
    });
    R.mover((t) => {
      const h = hourOf(t);
      if (h < 14.8) return { x: CHAIR[0], y: CHAIR[1] + 0.05, dir: 'r', pose: 'nap' };
      if (h < 15) { const p = along(TO_WORK, ramp(t, 14.8, 15)); return { ...p, pose: 'walk', moving: true }; }
      return { x: -9, y: -9, pose: 'gone' };
    }, (ctx, t, p) => {
      if (p.pose === 'gone') return;
      if (p.pose === 'nap') {
        person(ctx, p.x, p.y, -0.3, {
          ...KEEPER, pose: 'sit', dir: 'r', arms: [2.9, 2.8],
          face: (g, hy) => { // his hat, over his face
            g.beginPath(); g.ellipse(0.14, hy + 0.02, 0.4, 0.3, 0, 0, TAU); paint(g, C.butter, { lw: 0.03 });
            g.beginPath(); g.arc(0.14, hy - 0.02, 0.2, Math.PI, 0); paint(g, C.butter, { lw: 0.03 });
            g.fillStyle = INK.flamingo; g.fillRect(-0.06, hy - 0.04, 0.4, 0.05);
          },
        }, t);
        if (Q.detail) {
          const k = (t * 0.45) % 1, [X, Y] = P(p.x + 0.3 - 0.4 * k, p.y, 2.0 + k * 1.1);
          ctx.font = `${0.3 + k * 0.25}px "Bagel Fat One", sans-serif`; ctx.fillStyle = alpha(C.ink, 1 - k); ctx.fillText('z', X, Y);
        }
        return;
      }
      person(ctx, p.x, p.y, 0, { ...KEEPER, pose: 'walk', dir: p.dir }, t);
    }, { bias: 1.6 });

    // The kid, building the ship out of sand, a bit more every few hours;
    // it gets its funnel by three and a flag by half four.
    const KID = { ...folk(210), top: INK.flamingo, bottom: C.teal, dress: false, hat: 'none', style: 'pony', scale: 0.7 };
    R.thing(5.6, 10.8, (ctx, t) => {
      const h = hourOf(t);
      const busy = h < 18;
      const k = Math.sin(t * 6);
      person(ctx, 5.6, 10.8, 0, { ...KID, dir: h >= 18 ? 'l' : 'r', pose: busy ? 'stand' : 'point', ...(busy ? { arms: [1.3 + k * 0.3, 1.0 - k * 0.3] } : {}) }, t);
    }, { anim: true });
    R.thing(6.9, 11.5, (ctx, t) => {
      const h = hourOf(t);
      const x = 6.3, y = 11.25, SH = shade(INK.sunYellow, 0.15);
      // A bucket and spade.
      cylinder(ctx, 5.35, 11.55, 0, 0.14, 0.24, C.sky, { flat: true });
      // The mound, then the hull, then decks, the funnel, a flag.
      if (h < 9) { disc(ctx, x, y, 0.08, 0.4, SH, { lw: 0.025 }); return; }
      box(ctx, x - 0.55, y - 0.22, 0, 1.1, 0.44, 0.22, SH, { lw: 0.025, dens: 0.3 });
      shapeBow(ctx, x + 0.55, y, SH);
      if (h >= 12) box(ctx, x - 0.4, y - 0.15, 0.22, 0.75, 0.3, 0.15, tint(SH, 0.2), { lw: 0.02 });
      if (h >= 15) cylinder(ctx, x - 0.05, y, 0.37, 0.08, 0.22, INK.funnelRed, { flat: true });
      if (h >= 16.5 && Q.detail) {
        const [X, Y] = P(x - 0.3, y, 0.37);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X, Y - 0.35); ctx.stroke();
        ctx.fillStyle = INK.sunYellow; ctx.fillRect(X, Y - 0.35, 0.14, 0.09);
      }
    }, { anim: true });

    // The lei maker: a basket that fills all day, and at six, held up to a
    // ship that isn't letting anybody off.
    const LEIS = { ...folk(220), top: C.purple, bottom: C.purple, dress: true, style: 'bun', hair: HAIR[0], wear: floral(INK.flamingo) };
    R.thing(7.6, 9.45, (ctx, t) => {
      const h = hourOf(t);
      box(ctx, 7.35, 9.0, 0, 0.5, 0.45, 0.42, INK.teak, { dens: 0.2 });
      const hold = (g) => lei(g, 0.1, 0, 1, INK.flamingo);
      if (h >= 18) person(ctx, 7.6, 9.6, 0, { ...LEIS, pose: 'cheer', dir: 'l', hold }, t);
      else person(ctx, 7.6, 9.25, -0.28, { ...LEIS, pose: 'sit', dir: 'l', arms: [1.2 + Math.sin(t * 3) * 0.2, 1.0], hold }, t);
    }, { anim: true });
    R.thing(8.3, 10.15, (ctx, t) => {
      cylinder(ctx, 8.2, 9.95, 0, 0.3, 0.3, C.wood, { top: shade(C.wood, 0.3) });
      if (!Q.detail) return;
      const n = Math.min(10, 1 + Math.floor(hourOf(t) - 7));
      for (let i = 0; i < n; i++) {
        const [X, Y] = P(8.2 + ((i * 0.37) % 0.3) - 0.15, 9.95 + ((i * 0.53) % 0.3) - 0.15, 0.3 + Math.floor(i / 3) * 0.07);
        lei(ctx, X, Y, 0.9, LEI_INKS[i % LEI_INKS.length]);
      }
    }, { anim: true });
    R.thing(8.9, 10.5, (ctx) => {
      box(ctx, 8.85, 10.45, 0, 0.07, 0.07, 0.9, MAT.teakDark, { flat: true, stroke: false });
      board(ctx, 'x', 8.9, 10.52, 0.85, 1.0, 0.44, '', { board: INK.sunYellow });
      lettering(ctx, 'x', 8.9, 10.53, 0.93, 'LEIS  $2', 0.14);
      lettering(ctx, 'x', 8.9, 10.53, 0.75, "GET LEI'D", 0.09, INK.funnelRed);
    });

    // Crabs on the beach, going sideways about their business.
    const crabs = [
      route([[14.75, 7.6, 1.5], [14.8, 9.7, 0.6]], { speed: 0.6, loop: false }),
      route([[11.1, 12.75, 2], [12.2, 12.4, 1]], { speed: 0.45, loop: false, offset: 3 }),
      route([[4.3, 6.2, 1], [5.9, 5.0, 2.5]], { speed: 0.5, loop: false, offset: 7 }),
    ];
    crabs.forEach((c) => R.mover(c, (ctx, t, p) => crab(ctx, p.x, p.y, t, p.moving)));

    // A fish, jumping somewhere different each time.
    const JUMPS = [[3.2, 13.8], [16.4, 2.6], [1.3, 3.0], [16.6, 14.2]];
    R.mover((t) => {
      const n = Math.floor(t / 6.5), k = (t % 6.5) / 1.1;
      const [x, y] = JUMPS[((n % JUMPS.length) + JUMPS.length) % JUMPS.length];
      return { x, y, k };
    }, (ctx, t, p) => {
      if (p.k > 2.2) return;
      if (p.k > 1 || p.k < 0.15) { // the rings
        const r = p.k > 1 ? p.k - 1 : p.k + 0.5;
        const [X, Y] = P(p.x + 0.5, p.y, 0);
        ctx.beginPath(); ctx.ellipse(X, Y, 0.2 + r * 0.4, 0.1 + r * 0.2, 0, 0, TAU);
        ctx.strokeStyle = alpha(C.white, 0.8 * (1 - r / 1.3)); ctx.lineWidth = 0.04; ctx.stroke();
        if (p.k > 1) return;
      }
      const [X, Y] = P(p.x + p.k, p.y, Math.sin(Math.PI * p.k) * 0.9);
      ctx.save(); ctx.translate(X, Y); ctx.rotate(-1.1 + p.k * 2.2);
      ctx.beginPath(); ctx.ellipse(0, 0, 0.2, 0.08, 0, 0, TAU); paint(ctx, MAT.chrome, { lw: 0.025 });
      ctx.beginPath(); ctx.moveTo(-0.18, 0); ctx.lineTo(-0.32, -0.08); ctx.lineTo(-0.32, 0.08); ctx.closePath(); paint(ctx, MAT.chrome, { lw: 0.02 });
      ctx.restore();
    });
    // The buoy the tender goes past all day.
    R.thing(2.4, 13.4, (ctx, t) => {
      const b = Math.sin(t * 2) * 0.05, tilt = Math.sin(t * 1.6) * 0.06;
      if (Q.detail) { const [X, Y] = P(2.4, 13.4, 0); ctx.beginPath(); ctx.ellipse(X, Y, 0.4, 0.17, 0, 0, TAU); ctx.fillStyle = alpha(C.white, 0.5); ctx.fill(); }
      const [X, Y] = P(2.4, 13.4, b);
      ctx.save(); ctx.translate(X, Y); ctx.rotate(tilt); ctx.translate(-X, -Y);
      cylinder(ctx, 2.4, 13.4, b, 0.26, 0.5, INK.funnelRed, { top: C.white });
      cylinder(ctx, 2.4, 13.4, b + 0.5, 0.14, 0.45, C.white, { top: INK.funnelRed });
      lettering(ctx, 'x', 2.4, 13.66, b + 0.25, 'NO WAKE', 0.09, C.white);
      ctx.restore();
    }, { anim: true });
    // A gull going round and round the island, like the boat.
    R.air((ctx, t) => {
      const a = t * 0.3;
      gull(ctx, 9.5 + Math.cos(a) * 5, 8.5 + Math.sin(a) * 4, 7.5 + Math.sin(t * 0.7) * 0.4, t, { fly: true, dir: -Math.sin(a) + Math.cos(a) > 0 ? 'r' : 'l', phase: 2 });
    });

    // ---------- The tender ----------
    R.mover(tender, drawBoat, {
      // Sorted with the pier: behind it on its left, in front of it on its right.
      depth: (t) => { const p = tender(t); return p.x + p.y + (p.x > 9.5 && p.y > 11 ? 2.5 : 0); },
    });
    R.find({ id: 'parcel', label: 'A parcel for G. Goose', at: (t) => { const [x, y, z] = parcelAt(tender(t)); return [x, y, z + 0.22]; }, r: 0.75 });
  },
};

// The sand ship's pointed bow.
function shapeBow(ctx, x, y, fill) {
  face(ctx, [[x, y - 0.22, 0.22], [x + 0.35, y, 0.22], [x, y + 0.22, 0.22]], tint(fill, 0.15), { lw: 0.02 });
  face(ctx, [[x, y + 0.22, 0], [x + 0.35, y, 0], [x + 0.35, y, 0.22], [x, y + 0.22, 0.22]], shade(fill, 0.2), { lw: 0.02 });
}
