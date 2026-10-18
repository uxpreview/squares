// The Apron: outside the gates, on the concrete. Three planes nosed in to
// their jet bridges (C12's is Flight 1, drawn on the map's clock in day.js),
// belt loaders up to the holds, a fuel truck, the catering truck with its box
// raised at C13, bag carts and cones; at the left end the de-icing pad and its
// two trucks. The service road runs along the front (the bag trains, day.js).
//
// Running gags. The marshaller waves in everything that comes along the
// service road with full ceremony: the bag train every time, a fuel truck at
// dawn, a man on a bike at noon, a Canada goose in the evening snow, the
// catering truck at midnight, and at 11:30pm Flight 1, at last. And in the
// stuck night (6pm to 11:30pm) a fourth plane waits on the de-icing pad: it's
// sprayed orange, snowed on, and sprayed again, three times, in a ground stop
// where nothing can leave.
//
// The finds: the goose in C14's forward hold (its tail sticks out under the
// door onto the belt loader, all day), a stowaway eating the meals in the
// catering box, a pilot doing the walkaround in bunny slippers by C13's tail,
// the bride's wedding dress on a dolly tagged for Honolulu, and after dark a
// snowman in a safety vest by the de-icing pad. A gull on C13's wing answers
// back, and so does the Canada goose while it's here.
//
// Seams: an area this big is drawn in 16-unit chunks (x 32, 48, 64, 80, 96
// and y 32), each after the ones behind it and to its left, and a chunk's
// floor covers whatever an earlier one drew over it. So anything standing
// across a seam is anchored at its front corner (drawn by the chunk that goes
// last), and each jet bridge keeps left of the seam that runs just past its
// gate's door (at the gate's x + 2).
import { C, Q, P, box, rect, face, poly, paint, disc, cylinder, tiles, person, label, paintText, alpha, tint, shade, mix } from '../../../engine/art.js';
import { clamp, particles } from '../../../engine/actors.js';
import { ZK, SLAB } from '../../../engine/iso.js';
import { INK, LIVERY, RAMP, BAGS, SIGN, BRAND, LIT, dusk, nightPrint } from '../style.js';
import { planeParts, planeShadow, solid, hexa, frame, tug, cart, bag, look, stay, sign, hangSign, lettering, snowCover, nightGround, printed, mast } from '../kit.js';
import { AIR, FRONT, CHECK, W, GATES, NOSE, PLANE } from '../plan.js';
import { LOOP, hour, at, dark, stopped, nightK, lightsOn, settle } from '../clock.js';
import { flight1AtGate } from '../day.js';
import { ending } from '../finale.js';

const X12 = GATES.C12, X13 = GATES.C13, X14 = GATES.C14;
// The service road: the bag trains run out along y 47.2 and back along 45.9
// (day.js), so it's kept clear from 45.2 to 47.8. Whoever comes for the
// marshaller drives in along VLANE between trains.
const RY0 = 45.2, RY1 = 47.8, MID = 46.55, VLANE = 46.9;
// Flight 1 is pushed back from C12 at 11:30pm (day.js's P_PUSH).
const PUSH = 289.5;
const PAD = [33, 33, 51, 44.5]; // the de-icing pad, painted on the ground
const DE = [39.5, 32.6]; // the fourth plane on the pad: its x and nose
const MARSH = [53.2, 44.3]; // the marshaller, between the pad and C12
const PILOT = [73.2, 44.8]; // by C13's tail, clear of its tailplane
const SNOWMAN = [41.6, 42.2];
const DRESS = [86.1, 44.3];
const TUGAT = [70, 44.3];
const GULL = [73.4, 41.0, 1.61]; // standing on C13's far wing

const id = (c) => c;
const inkAt = (t) => (nightPrint(t) ? dusk : id);
const wrap = (t) => (((t % LOOP) + LOOP) % LOOP);
const lerp = (a, b, k) => a + (b - a) * k;

// The ground's inks: the apron's concrete, the stands a paler slab, the
// de-icing pad and the service road darker, toward the tarmac.
const GROUND = {
  apron: mix(INK.concrete, INK.tarmac, 0.22),
  stand: tint(INK.concrete, 0.14),
  pad: mix(INK.concrete, INK.tarmac, 0.5),
  road: mix(INK.concrete, INK.tarmac, 0.78),
  curb: tint(INK.concrete, 0.3),
};

// ---------- Solids ----------
// An upright box as one solid (seams between pieces uninked): cut lists the
// faces where it carries on as another piece ('front' is +y, 'back' -y).
function brick(ctx, x0, y0, z0, x1, y1, z1, fill, o = {}) {
  const cut = o.cut || [];
  const f = (pts, extra = {}) => ({ pts, fill, ...extra });
  solid(ctx, [
    f([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], { fill: o.top || fill }),
    f([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]]),
    f([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]),
    f([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], { ghost: cut.includes('front') }),
    f([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], { ghost: cut.includes('back') }),
    f([[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]]),
  ], { ink: o.ink });
}
// A square beam from a to b ([x, y, z]), w across and h deep: a de-icer's boom.
function beam(ctx, a, b, w, h, fill, ink) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  let px = -d[1], py = d[0];
  const pl = Math.hypot(px, py) || 1;
  px /= pl; py /= pl;
  let ux = -d[2] * py, uy = d[2] * px, uz = d[0] * py - d[1] * px;
  const ul = Math.hypot(ux, uy, uz) || 1;
  ux /= ul; uy /= ul; uz /= ul;
  if (uz < 0) { ux = -ux; uy = -uy; uz = -uz; }
  const c = (p, s, k) => [p[0] + (px * s * w) / 2 + (ux * k * h) / 2, p[1] + (py * s * w) / 2 + (uy * k * h) / 2, p[2] + (uz * k * h) / 2];
  const A = [c(a, -1, -1), c(a, 1, -1), c(a, 1, 1), c(a, -1, 1)], B = [c(b, -1, -1), c(b, 1, -1), c(b, 1, 1), c(b, -1, 1)];
  solid(ctx, hexa(A, B, fill), { ink });
}
// A round tank lying along a vehicle (frame F), from u0 to u1, its axis h up.
const OCT = [[-0.42, 1], [0.42, 1], [1, 0.42], [1, -0.42], [0.42, -1], [-0.42, -1], [-1, -0.42], [-1, 0.42]];
function tank(ctx, F, u0, u1, h, r, fill, ink) {
  const ring = (u) => OCT.map(([v, k]) => F.pt(u, v * r, h + k * r));
  const A = ring(u0), B = ring(u1), faces = [];
  for (let k = 0; k < 8; k++) faces.push({ pts: [A[k], A[(k + 1) % 8], B[(k + 1) % 8], B[k]], fill, dots: k >= 3 && k <= 6 ? shade(fill, 0.45) : null });
  faces.push({ pts: [...A].reverse(), fill }, { pts: B, fill });
  solid(ctx, faces, { ink });
}
// A line in the world, inked with an outline (a hose, a cable, a strut).
function cord(ctx, pts, color, w = 0.06) {
  ctx.beginPath();
  pts.forEach((p, i) => { const [X, Y] = P(...p); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = w + 0.05; ctx.stroke(); }
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
}
// A cable sagging from a to b.
function sag(a, b, drop = 0.4, n = 8) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    out.push([lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k) - Math.sin(k * Math.PI) * drop]);
  }
  return out;
}
// Snow on a still thing's flat top (x0..x1, y0..y1 at z), printed for the day
// and the night, laid on as it settles. o: { on, depth }
function cap(R, x0, y0, x1, y1, z, o = {}) {
  for (const night of [false, true]) {
    R.thing(x1, y1, (ctx) => rect(ctx, x0 - 0.04, y0 - 0.04, x1 - x0 + 0.08, y1 - y0 + 0.08, z + 0.02, night ? dusk(C.white) : alpha(C.white, 0.95), { lw: 0.02 }),
      { fade: (t) => settle(t), depth: o.depth ?? x1 + y1 + 0.02, on: (t) => (!o.on || o.on(t)) && nightPrint(t) === night });
  }
}

// ---------- Planes ----------
// A parked plane, as the kit's plane() but with each piece anchored in the
// chunk that's drawn last of the ones it stands over (its near tailplane
// reaches past a seam at C13 and C14).
const R0 = PLANE.body / 2, HC = 0.62 + R0;
const BODY = [[0, 0.22, -0.28], [-0.55, 0.62, -0.12], [-1.6, 0.92, -0.02], [-2.6, 1, 0], [-4.6, 1, 0], [-6.6, 1, 0], [-8.6, 1, 0], [-10.2, 0.8, 0.28], [-11.7, 0.52, 0.62], [-13, 0.24, 0.9]];
const stabAt = (x, nose) => {
  const sx = x + 1.6, reach = x + 3.1;
  return [Math.floor(reach / 16) > Math.floor(sx / 16) ? Math.floor(reach / 16) * 16 + 0.05 : sx, nose + 12.4];
};
function parked(R, x, nose, o = {}) {
  const on = o.on || (() => true);
  R.rug((ctx) => planeShadow(ctx, x, nose, 0, 'y'), o.on ? { on } : {});
  const [sx, sy] = stabAt(x, nose);
  for (const night of [false, true]) {
    const parts = planeParts(x, nose, 0, 'y', { dir: -1, ...o, ink: night ? dusk : null, lit: night });
    for (const p of parts) {
      const stab = Math.abs(p.x - (x + 1.6)) < 0.01 && Math.abs(p.y - (nose + 12.4)) < 0.01;
      R.thing(stab ? sx : p.x, stab ? sy : p.y, p.draw, { on: (t) => on(t) && nightPrint(t) === night });
    }
  }
}
// The tops of a parked plane (its body, wings and tailplanes), for the snow
// lying on it and the de-icing fluid: faces, lifted a hair.
function tops(x, nose) {
  const pt = (u, v, h) => [x + v, nose - u, h + 0.03];
  const body = [];
  for (let i = 0; i < BODY.length - 1; i++) {
    const [u0, s0, r0] = BODY[i], [u1, s1, r1] = BODY[i + 1];
    const near = (u, s, r, f) => pt(u, R0 * s * (0.42 + 0.58 * f), HC + r + 1.04 * R0 * s * (1 - 0.58 * f));
    const far = (u, s, r) => pt(u, -0.42 * R0 * s, HC + r + 1.04 * R0 * s);
    body.push([far(u0, s0, r0), near(u0, s0, r0, 0), near(u1, s1, r1, 0), far(u1, s1, r1)]);
    body.push([near(u0, s0, r0, 0), near(u0, s0, r0, 0.4), near(u1, s1, r1, 0.4), near(u1, s1, r1, 0)]);
  }
  // A wing's top from the body's side out (a tailplane's from its root).
  const wing = (side) => {
    const v0 = R0 * 0.7, v1 = PLANE.span / 2, h0 = HC - R0 * 0.55 + 0.26, h1 = HC - R0 * 0.2 + 0.12;
    const k = (R0 - v0) / (v1 - v0), h = lerp(h0, h1, k);
    return [pt(lerp(-5.1, -8.2, k), side * R0, h), pt(-8.2, side * v1, h1), pt(-9.5, side * v1, h1), pt(lerp(-8.2, -9.5, k), side * R0, h)];
  };
  const stab = (side) => {
    const v0 = R0 * 0.3, v1 = 3.1, hh = HC + 0.62, k = (0.62 - v0) / (v1 - v0), h = lerp(hh + 0.16, hh + 0.33, k);
    return [pt(lerp(-11.1, -12.3, k), side * 0.62, h), pt(-12.3, side * v1, hh + 0.33), pt(-13, side * v1, hh + 0.33), pt(lerp(-12.7, -13, k), side * 0.62, h)];
  };
  return { body, near: wing(1), far: wing(-1), nearStab: stab(1), farStab: stab(-1) };
}
// Lay a color on a parked plane's tops, each piece just after the part it
// lies on. o: { fade, on, stroke }
function topsOn(R, x, nose, color, o = {}) {
  const T = tops(x, nose);
  const [sx, sy] = stabAt(x, nose);
  const add = (ax, ay, d, faces) => R.thing(ax, ay, (ctx) => {
    for (const f of faces) face(ctx, f, color, o.stroke ? { lw: 0.018 } : { stroke: false });
  }, { fade: o.fade, on: o.on, depth: ax + ay + d });
  add(x - 3.25, nose + 7.6, 0.01, [T.far]);
  add(x - 1.6, nose + 12.6, 0.01, [T.farStab]);
  add(x, nose + 12.35, 0.02, T.body);
  add(x + 3.25, nose + 7.4, 0.01, [T.near]);
  add(sx, sy, 0.01, [T.nearStab]);
}
// Snow on a parked plane, in its day and its night print.
function snowOn(R, x, nose, o = {}) {
  for (const night of [false, true]) {
    topsOn(R, x, nose, night ? dusk(C.white) : C.white, {
      stroke: true, fade: o.fade || settle, on: (t) => (!o.on || o.on(t)) && nightPrint(t) === night,
    });
  }
}

// A forward hold's door on a parked plane's near side (X its x), swung up
// and out k of the way like an awning: the opening, the bags inside, and the
// door.
function hold(ctx, X, nose, k, ink, body = C.white) {
  const x = X + 1.245, y0 = nose + 3.45, y1 = nose + 4.45, z0 = 0.66, z1 = 1.34, H = z1 - z0;
  if (k > 0.02) {
    const open = [[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]];
    face(ctx, open, ink(shade(C.navy, 0.35)), { lw: 0.025 });
    if (Q.detail) {
      // The bags stacked inside, seen through the opening.
      ctx.save();
      poly(ctx, open);
      ctx.clip();
      for (const [by, bz, c, w] of [[y0 + 0.06, z0, BAGS[1], 0.42], [y0 + 0.5, z0, BAGS[4], 0.42], [y0 + 0.28, z0 + 0.28, BAGS[5], 0.4], [y0 + 0.7, z0 + 0.28, BAGS[9], 0.3]]) {
        box(ctx, x - 0.55, by, bz, 0.5, w, 0.27, ink(c), { lw: 0.02 });
      }
      ctx.restore();
    }
  }
  const a = (k * Math.PI) / 2, ox = Math.sin(a) * H, oz = Math.cos(a) * H;
  face(ctx, [[x + 0.005, y0, z1], [x + 0.005, y1, z1], [x + 0.005 + ox, y1, z1 - oz], [x + 0.005 + ox, y0, z1 - oz]], ink(mix(body, C.grey, 0.3)), { lw: 0.03 });
  if (k < 0.3 && Q.detail) face(ctx, [[x + 0.01, y0 + 0.36, z0 + 0.14], [x + 0.01, y0 + 0.64, z0 + 0.14]], null, { lw: 0.045 });
}

// ---------- Jet bridges ----------
// From the gate's door in the glass to the plane's front door: a drum on a
// column at the glass, a tunnel on legs with wheels, and the cab at the door,
// its canopy against the plane, the airline's name down its side. It keeps
// left of the seam at X + 2. o: { on, back (how far the cab's pulled back) }
function bridge(R, X, livery, o = {}) {
  const on = o.on || (() => true), back = o.back || 0;
  const x0 = X + 0.95, x1 = X + 1.94, z0 = 1.2, z1 = 2.36;
  const yc = 34.85 - back; // where the tunnel meets the cab
  const L = LIVERY[livery];
  const tunnelColor = INK.snow;
  // The drum at the glass, on its column.
  printed(R, X + 1.6, 31.3, (ctx, ink) => {
    cylinder(ctx, X + 1.2, 30.85, 0, 0.2, z0, ink(C.grey), { flat: true });
    cylinder(ctx, X + 1.2, 30.85, z0 - 0.1, 0.55, 1.3, ink(tint(C.grey, 0.45)), { top: ink(INK.snow) });
  }, { on });
  // The tunnel, in two pieces (one each side of the seam at y 32).
  printed(R, x1, 31.99, (ctx, ink) => {
    brick(ctx, x0, 31.3, z0, x1, 32, z1, ink(tunnelColor), { cut: ['front'], ink: null });
  }, { on });
  printed(R, x1, yc, (ctx, ink, night) => {
    // The legs and their wheels, under the tunnel near its cab end.
    const ly = yc - 0.75;
    for (const lx of [X + 1.12, X + 1.72]) box(ctx, lx - 0.06, ly - 0.06, 0.32, 0.12, 0.12, z0 - 0.32, ink(C.grey), { flat: true, lw: 0.02 });
    box(ctx, X + 1.05, ly - 0.08, 0.6, 0.8, 0.16, 0.1, ink(C.grey), { flat: true, lw: 0.02 });
    box(ctx, X + 1.0, ly - 0.25, 0.14, 0.9, 0.5, 0.2, ink(shade(C.grey, 0.3)), { flat: true, lw: 0.02 });
    for (const lx of [X + 1.05, X + 1.62]) box(ctx, lx, ly - 0.2, 0, 0.3, 0.4, 0.3, C.ink, { flat: true, lw: 0.02 });
    brick(ctx, x0, 32, z0, x1, yc, z1, ink(tunnelColor), { cut: ['back'] });
    if (!Q.detail) return;
    // Its ribs, a strip of windows and the airline's name, on the side you see.
    ctx.beginPath();
    for (let y = 32.25; y < yc; y += 0.3) { const [ax, ay] = P(x1 + 0.005, y, z0 + 0.04), [bx, by] = P(x1 + 0.005, y, z1 - 0.04); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); }
    ctx.strokeStyle = alpha(C.ink, 0.12); ctx.lineWidth = 0.02; ctx.stroke();
    face(ctx, [[x1 + 0.006, 32.2, 1.95], [x1 + 0.006, yc - 0.15, 1.95], [x1 + 0.006, yc - 0.15, 2.18], [x1 + 0.006, 32.2, 2.18]], ink(night ? LIT : shade(C.sky, 0.25)), { lw: 0.02 });
    lettering(ctx, 'y', x1 + 0.01, (32 + yc) / 2, 1.58, L.name, 0.3, ink(L.tail === C.white ? C.navy : L.tail), 'Bagel Fat One');
  }, { on });
  // The cab at the door, its canopy against the plane, the gate's number.
  printed(R, x1, yc + 1.55, (ctx, ink, night) => {
    const y0 = yc, y1 = yc + 1.55;
    brick(ctx, X + 1.22, y0, z0 - 0.05, x1, y1, z1 + 0.2, ink(tint(C.grey, 0.6)));
    // The canopy: dark folds where it meets the fuselage.
    face(ctx, [[X + 1.22, y1 + 0.005, z0], [X + 1.42, y1 + 0.005, z0], [X + 1.42, y1 + 0.005, z1 + 0.15], [X + 1.22, y1 + 0.005, z1 + 0.15]], ink(C.ink), { lw: 0.02 });
    if (!Q.detail) return;
    for (const [ya, yb] of [[y0 + 0.2, y0 + 0.7], [y0 + 0.85, y1 - 0.2]]) face(ctx, [[x1 + 0.006, ya, 1.7], [x1 + 0.006, yb, 1.7], [x1 + 0.006, yb, 2.3], [x1 + 0.006, ya, 2.3]], ink(night ? LIT : shade(C.sky, 0.25)), { lw: 0.02 });
    face(ctx, [[X + 1.55, y1 + 0.006, 1.7], [x1 - 0.08, y1 + 0.006, 1.7], [x1 - 0.08, y1 + 0.006, 2.3], [X + 1.55, y1 + 0.006, 2.3]], ink(night ? LIT : shade(C.sky, 0.25)), { lw: 0.02 });
    sign(ctx, 'y', x1 + 0.012, y0 + 0.78, 1.42, 1.0, 0.26, `C${X === X12 ? 12 : X === X13 ? 13 : 14}`, { size: 0.18, edge: 0.02, board: ink(SIGN.board), ink: ink(SIGN.ink) });
  }, { on });
  cap(R, x0, 31.3, x1, yc, z1, { on, depth: x1 + yc + 0.02 });
  cap(R, X + 1.22, yc, x1, yc + 1.55, z1 + 0.2, { on });
}

// ---------- Ramp vehicles ----------
// A de-icing truck, along y with its cab toward the terminal (front at y):
// the cab, a tank of the orange stuff, the boom's turret at the back.
function deicer(ctx, x, y, ink, night) {
  const F = frame(x, y, 0, 'y', -1);
  for (const u of [-0.55, -2.9]) for (const v of [-0.72, 0.72]) F.lbox(ctx, u - 0.24, u + 0.24, v - 0.1, v + 0.1, 0, 0.48, C.ink, { flat: true, lw: 0.02 });
  F.lbox(ctx, -1.3, 0, -0.8, 0.8, 0.45, 1.4, ink(INK.safety), { lw: 0.035, dots: ink(shade(INK.safety, 0.4)) });
  F.lface(ctx, [[-0.15, 0.81, 1.25], [-1.15, 0.81, 1.25], [-1.15, 0.81, 1.72], [-0.15, 0.81, 1.72]], ink(night ? LIT : shade(C.sky, 0.3)), { lw: 0.025 });
  F.lbox(ctx, -3.6, -1.2, -0.75, 0.75, 0.3, 0.3, ink(C.grey), { flat: true, lw: 0.03 });
  F.lbox(ctx, -3.5, -1.4, -0.72, 0.72, 0.6, 1.1, ink(C.white), { lw: 0.035, dots: ink(C.greyLight) });
  F.lface(ctx, [[-1.45, 0.725, 1.25], [-3.45, 0.725, 1.25], [-3.45, 0.725, 1.42], [-1.45, 0.725, 1.42]], ink(INK.safety), { stroke: false });
  lettering(ctx, 'y', ...F.pt(-2.45, 0.73, 0.95), 'TYPE I', 0.26, ink(C.ink));
  const [tx, ty] = F.at(-3.0, 0);
  cylinder(ctx, tx, ty, 1.7, 0.3, 0.25, ink(C.grey), { flat: true });
  box(ctx, ...F.pt(-0.75, -0.12, 1.85), 0.22, 0.24, 0.12, ink(C.mustard), { flat: true, lw: 0.02 });
}
// The operator's basket at the end of a boom (its floor's middle at b).
function basket(ctx, b, ink, night) {
  const [x, y, z] = b;
  box(ctx, x - 0.36, y - 0.36, z, 0.72, 0.72, 0.7, ink(C.white), { lw: 0.03 });
  face(ctx, [[x + 0.365, y - 0.26, z + 0.28], [x + 0.365, y + 0.26, z + 0.28], [x + 0.365, y + 0.26, z + 0.62], [x + 0.365, y - 0.26, z + 0.62]], ink(night ? LIT : shade(C.sky, 0.3)), { lw: 0.02 });
  if (Q.detail) {
    // The operator, peering out under a hard hat.
    const [X, Y] = P(x + 0.37, y, z + 0.4);
    ctx.beginPath(); ctx.arc(X, Y - 0.04, 0.11, 0, Math.PI * 2); paint(ctx, ink(C.blush), { lw: 0.02 });
    ctx.beginPath(); ctx.arc(X, Y - 0.08, 0.12, Math.PI, 0); paint(ctx, ink(C.white), { lw: 0.02 });
  }
  box(ctx, x - 0.05, y - 0.05, z - 0.3, 0.1, 0.1, 0.3, C.ink, { flat: true, stroke: false });
}
// A boom from a truck's turret to its basket, and the basket.
function boom(ctx, from, to, ink, night) {
  beam(ctx, from, [to[0], to[1], to[2] + 0.1], 0.26, 0.3, ink(INK.safety), null);
  basket(ctx, to, ink, night);
}
// The fuel truck: a cab and a round tank of JET A, along x or y, its front
// toward dir.
function fuelTruck(ctx, x, y, along, dir, ink, night) {
  const F = frame(x, y, 0, along, dir);
  const cab = () => {
    F.lbox(ctx, -1.0, 0, -0.64, 0.64, 0.45, 1.2, ink(RAMP.fuel), { lw: 0.035, dots: ink(C.greyLight) });
    F.lface(ctx, [[-0.12, 0.645, 1.12], [-0.85, 0.645, 1.12], [-0.85, 0.645, 1.55], [-0.12, 0.645, 1.55]], ink(night ? LIT : shade(C.sky, 0.3)), { lw: 0.025 });
    F.lface(ctx, [[0, 0.645, 0.62], [-1.0, 0.645, 0.62], [-1.0, 0.645, 0.78], [0, 0.645, 0.78]], ink(C.red), { stroke: false });
    box(ctx, ...F.pt(-0.6, -0.12, 1.65), 0.22, 0.24, 0.12, ink(C.mustard), { flat: true, lw: 0.02 });
  };
  const body = () => {
    F.lbox(ctx, -3.3, -0.9, -0.6, 0.6, 0.3, 0.25, ink(C.grey), { flat: true, lw: 0.03 });
    tank(ctx, F, -3.2, -1.05, 1.1, 0.58, ink(RAMP.fuel), null);
    if (!Q.detail) return;
    F.lface(ctx, [[-1.1, 0.6, 0.92], [-3.15, 0.6, 0.92], [-3.15, 0.6, 1.06], [-1.1, 0.6, 1.06]], ink(C.red), { stroke: false });
    lettering(ctx, F.along, ...F.pt(-2.15, 0.62, 1.3), 'JET A', 0.3, ink(C.ink), 'Bagel Fat One');
    lettering(ctx, F.along, ...F.pt(-2.15, 0.62, 0.72), 'NOT FOR CARS', 0.14, ink(C.ink));
  };
  for (const u of [-0.5, -2.3, -2.85]) for (const v of [-0.55, 0.55]) F.lbox(ctx, u - 0.22, u + 0.22, v - 0.1, v + 0.1, 0, 0.44, C.ink, { flat: true, lw: 0.02 });
  if (dir < 0) { cab(); body(); } else { body(); cab(); }
}
// The catering truck: a cab, a chassis, a scissor lift and the white box of
// meals, lifted `lift` off its rest, with a platform at its back end. Along x,
// its cab toward +x. o: { reach (the platform's far end, u), half (the box's
// half width), side (letters on the box's side you see: off where the
// shutter goes) }
function catering(ctx, x, y, lift, ink, night, o = {}) {
  const F = frame(x, y, 0, 'x', 1);
  for (const u of [-0.6, -3.6]) for (const v of [-0.62, 0.62]) F.lbox(ctx, u - 0.22, u + 0.22, v - 0.1, v + 0.1, 0, 0.44, C.ink, { flat: true, lw: 0.02 });
  F.lbox(ctx, -4.4, -0.3, -0.7, 0.7, 0.3, 0.35, ink(C.grey), { flat: true, lw: 0.03 });
  const zb = 0.95 + lift;
  if (lift > 0.15) {
    // The scissors, on the side you see.
    for (const v of [-0.6, 0.62]) {
      const pts = (a, b) => [F.pt(a, v, 0.66), F.pt(b, v, zb)];
      cord(ctx, pts(-4.1, -2.4), ink(C.grey), 0.07);
      cord(ctx, pts(-2.4, -4.1), ink(C.grey), 0.07);
    }
  }
  const hw = o.half || 1.3;
  F.lbox(ctx, -4.35, -2.15, -hw, hw, zb, 1.55, ink(RAMP.catering), { lw: 0.035, dots: ink(C.greyLight) });
  F.lbox(ctx, o.reach ?? -4.9, -4.35, -1.1, 1.1, zb - 0.06, 0.06, ink(C.grey), { flat: true, lw: 0.02 });
  if (o.reach != null) cord(ctx, [F.pt(o.reach, 1.1, zb + 0.5), F.pt(-4.35, 1.1, zb + 0.5)], ink(C.grey), 0.04);
  if (Q.detail) {
    lettering(ctx, 'y', ...F.pt(-2.14, 0, zb + 1.08), 'CHICKEN', 0.3, ink(C.coral), 'Bagel Fat One');
    lettering(ctx, 'y', ...F.pt(-2.14, 0, zb + 0.66), 'OR PASTA', 0.3, ink(C.teal), 'Bagel Fat One');
    if (o.side) lettering(ctx, 'x', ...F.pt(-3.25, hw + 0.01, zb + 0.78), BRAND.line, 0.2, ink(C.red));
  }
  F.lbox(ctx, -1.25, 0, -0.75, 0.75, 0.45, 1.25, ink(RAMP.catering), { lw: 0.035, dots: ink(C.greyLight) });
  F.lface(ctx, [[-0.15, 0.755, 1.15], [-1.0, 0.755, 1.15], [-1.0, 0.755, 1.58], [-0.15, 0.755, 1.58]], ink(night ? LIT : shade(C.sky, 0.3)), { lw: 0.025 });
  box(ctx, ...F.pt(-0.7, -0.12, 1.7), 0.22, 0.24, 0.12, ink(C.mustard), { flat: true, lw: 0.02 });
}
// A belt loader along x, its belt's top end at xTop (the hold's sill, zTop)
// and its foot len along, low on the ground: a yellow chassis, the belt on
// its frame, rails and a seat at the foot.
function loader(ctx, xTop, y0, y1, zTop, len, ink) {
  const xb = xTop + len, zb = 0.4, th = 0.16;
  for (const wx of [xTop + 1.4, xb - 0.35]) for (const wy of [y0 - 0.02, y1 - 0.14]) box(ctx, wx - 0.16, wy, 0, 0.32, 0.16, 0.3, C.ink, { flat: true, lw: 0.02 });
  box(ctx, xTop + 1.1, y0 - 0.06, 0.12, len - 1.0, y1 - y0 + 0.12, 0.24, ink(RAMP.tug), { lw: 0.03, dots: ink(shade(RAMP.tug, 0.45)) });
  const mid = xTop + len * 0.42, zm = lerp(zTop, zb, 0.42);
  box(ctx, mid - 0.06, (y0 + y1) / 2 - 0.06, 0.36, 0.12, 0.12, zm - th - 0.36, ink(C.grey), { flat: true, stroke: false });
  // The frame, then the belt on it, its cleats and the rails.
  face(ctx, [[xTop, y1, zTop], [xb, y1, zb], [xb, y1, zb - th], [xTop, y1, zTop - th]], ink(RAMP.tug), { lw: 0.03 });
  face(ctx, [[xb, y0, zb], [xb, y1, zb], [xb, y1, zb - th], [xb, y0, zb - th]], ink(shade(RAMP.tug, 0.15)), { lw: 0.03 });
  face(ctx, [[xTop, y0, zTop], [xb, y0, zb], [xb, y1, zb], [xTop, y1, zTop]], ink(shade(C.grey, 0.45)), { lw: 0.03 });
  if (Q.detail) {
    ctx.beginPath();
    for (let x = xTop + 0.3; x < xb; x += 0.35) { const z = lerp(zTop, zb, (x - xTop) / len) + 0.005; const [ax, ay] = P(x, y0 + 0.04, z), [bx, by] = P(x, y1 - 0.04, z); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); }
    ctx.strokeStyle = alpha(C.ink, 0.35); ctx.lineWidth = 0.02; ctx.stroke();
  }
  for (const ry of [y0, y1]) cord(ctx, [[xTop, ry, zTop + 0.12], [xb, ry, zb + 0.12]], ink(C.grey), 0.035);
  // The seat and the wheel at the foot.
  box(ctx, xb - 0.75, y1 + 0.02, 0.36, 0.34, 0.26, 0.12, ink(C.ink), { flat: true, lw: 0.02 });
  cord(ctx, [[xb - 0.95, y1 + 0.15, 0.36], [xb - 1.05, y1 + 0.15, 0.85]], C.ink, 0.04);
}
// The belt's height at x on a loader.
const beltZ = (xTop, zTop, len, x) => lerp(zTop, 0.4, (x - xTop) / len);

// A traffic cone.
function cone(ctx, x, y, ink = id) {
  box(ctx, x - 0.2, y - 0.2, 0, 0.4, 0.4, 0.05, ink(C.ink), { flat: true, lw: 0.02 });
  const [X, Y] = P(x, y, 0.05), top = 0.52 * ZK;
  ctx.beginPath(); ctx.moveTo(X - 0.17, Y); ctx.lineTo(X - 0.03, Y - top); ctx.lineTo(X + 0.03, Y - top); ctx.lineTo(X + 0.17, Y); ctx.closePath();
  paint(ctx, ink(INK.safety), { lw: 0.025 });
  if (Q.detail) { ctx.fillStyle = ink(C.white); ctx.fillRect(X - 0.085, Y - top * 0.58, 0.17, 0.08); }
}
// A ground power unit, its cable to a plane's nose.
function gpu(ctx, x, y, to, ink) {
  for (const wx of [x - 0.35, x + 0.25]) box(ctx, wx, y + 0.3, 0, 0.12, 0.1, 0.2, C.ink, { flat: true, stroke: false });
  box(ctx, x - 0.5, y - 0.4, 0.14, 1.0, 0.8, 0.6, ink(RAMP.tug), { lw: 0.03, dots: ink(shade(RAMP.tug, 0.45)) });
  if (Q.detail) for (let k = 0; k < 4; k++) face(ctx, [[x + 0.505, y - 0.25 + k * 0.15, 0.3], [x + 0.505, y - 0.25 + k * 0.15, 0.6]], null, { lw: 0.025 });
  cord(ctx, sag([x + 0.5, y, 0.5], to, 0.35), C.ink, 0.05);
}
// A baggage container (an AKE can), silver, its door on the side you see.
function uld(ctx, x, y, ink) {
  const w = 1.3, d = 1.25, h = 1.35;
  box(ctx, x, y, 0, w, d, h, ink(C.greyLight), { lw: 0.03, dots: ink(C.grey) });
  face(ctx, [[x + 0.15, y + d + 0.005, 0.1], [x + w - 0.15, y + d + 0.005, 0.1], [x + w - 0.15, y + d + 0.005, h - 0.15], [x + 0.15, y + d + 0.005, h - 0.15]], ink(alpha(C.navy, 0.35)), { lw: 0.02 });
  lettering(ctx, 'x', x + w / 2, y + d + 0.01, h * 0.62, 'AKE', 0.26, ink(C.navy), 'Bagel Fat One');
}
// A fire extinguisher on its two-wheeled cart.
function extinguisher(ctx, x, y, ink) {
  for (const wy of [y - 0.25, y + 0.15]) box(ctx, x - 0.15, wy, 0, 0.3, 0.1, 0.3, C.ink, { flat: true, stroke: false });
  cylinder(ctx, x, y, 0.15, 0.24, 0.95, ink(C.red), {});
  cord(ctx, [[x + 0.2, y, 1.0], [x + 0.35, y, 1.25]], C.ink, 0.04);
}
// An open baggage dolly, along x, its bed at 0.45: bags stack on it.
function dolly(ctx, x, y, ink) {
  for (const u of [-0.85, 0.85]) for (const v of [-0.46, 0.46]) box(ctx, x + u - 0.12, y + v - 0.07, 0, 0.24, 0.14, 0.26, C.ink, { flat: true, lw: 0.02 });
  box(ctx, x - 1.2, y - 0.55, 0.24, 2.4, 1.1, 0.2, ink(RAMP.cart), { lw: 0.03 });
  cord(ctx, [[x + 1.2, y, 0.3], [x + 1.75, y, 0.12]], C.ink, 0.05);
}

// ---------- People ----------
// Reflective stripes on a hi-vis vest (person()'s wear).
function stripes(ctx, o) {
  if (!Q.detail || o.dress) return;
  ctx.fillStyle = C.greyLight;
  for (const k of [0.22, 0.5]) ctx.fillRect(-0.28, o.hipY - k - 0.035, 0.56, 0.07);
}
// Ear defenders (person()'s face).
function muffs(ctx, hy, back) {
  ctx.beginPath(); ctx.arc(0.02, hy - 0.02, 0.36, Math.PI * 1.1, Math.PI * 1.9);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.07; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(back ? 0.02 : -0.07, hy + 0.04, 0.12, 0.15, 0, 0, Math.PI * 2);
  paint(ctx, C.red, { lw: 0.03 });
}
// The ramp crew: safety orange, the stripes, sometimes ear defenders.
const crew = (seed, extra = {}) => look(seed, 'ramp', { wear: stripes, ...(seed % 2 ? { face: muffs } : {}), ...extra });
// A captain's cap: navy, a white crown, a gold badge, the peak.
function pilotCap(ctx, hy, back) {
  ctx.beginPath();
  ctx.moveTo(-0.3, hy - 0.13); ctx.lineTo(0.34, hy - 0.13); ctx.lineTo(0.42, hy - 0.38); ctx.lineTo(-0.36, hy - 0.38); ctx.closePath();
  paint(ctx, C.navy, { lw: 0.03 });
  ctx.beginPath(); ctx.ellipse(0.03, hy - 0.39, 0.4, 0.09, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.03 });
  if (back) return;
  ctx.beginPath(); ctx.arc(0.12, hy - 0.25, 0.05, 0, Math.PI * 2); ctx.fillStyle = C.mustard; ctx.fill();
  ctx.beginPath(); ctx.moveTo(0.1, hy - 0.14); ctx.lineTo(0.5, hy - 0.11); ctx.lineTo(0.45, hy - 0.04); ctx.lineTo(0.1, hy - 0.08); ctx.closePath();
  paint(ctx, C.ink, { lw: 0.02 });
}
// Bunny slippers, over a standing person's feet (person()'s wear).
function slippers(ctx) {
  for (const fx of [-0.06, 0.08]) {
    ctx.beginPath(); ctx.ellipse(fx + 0.08, -0.03, 0.21, 0.11, 0, 0, Math.PI * 2);
    paint(ctx, C.white, { lw: 0.025, dots: Q.detail ? C.pink : null, density: 0.15 });
    if (!Q.detail) continue;
    for (const [ex, a] of [[0.15, -0.35], [0.23, 0.1]]) {
      ctx.beginPath(); ctx.ellipse(fx + ex, -0.17, 0.045, 0.12, a, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.02 });
      ctx.beginPath(); ctx.ellipse(fx + ex, -0.16, 0.018, 0.07, a, 0, Math.PI * 2); ctx.fillStyle = C.pink; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(fx + 0.21, -0.06, 0.022, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
    ctx.beginPath(); ctx.arc(fx + 0.28, -0.03, 0.025, 0, Math.PI * 2); ctx.fillStyle = C.pink; ctx.fill();
  }
}
// A travel pillow round the neck (person()'s wear).
function pillow(ctx, o) {
  ctx.beginPath(); ctx.arc(0.02, o.top - 0.04, 0.24, 0.1, Math.PI - 0.1);
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.19; ctx.stroke();
  ctx.strokeStyle = C.mustard; ctx.lineWidth = 0.12; ctx.stroke();
}
// The marshaller's lit wands, out from her hands along her arms (the same
// arms as person()'s: near aA, far aB).
function wands(ctx, x, y, z, dir, [aA, aB], lit, s = 1) {
  const [X, Y] = P(x, y, z), f = dir === 'l' ? -1 : 1;
  ctx.save();
  ctx.translate(X, Y); ctx.scale(f * s, s);
  for (const [sx, a] of [[-0.22, aB], [0.22, aA]]) {
    const hx = sx + Math.sin(a) * 0.72, hy = -1.53 + Math.cos(a) * 0.72;
    const ex = hx + Math.sin(a) * 0.52, ey = hy + Math.cos(a) * 0.52;
    if (lit) { ctx.beginPath(); ctx.arc((hx + ex) / 2, (hy + ey) / 2, 0.34, 0, Math.PI * 2); ctx.fillStyle = alpha(INK.safety, 0.28); ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ex, ey); ctx.lineCap = 'round';
    if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.17; ctx.stroke(); }
    ctx.strokeStyle = lit ? tint(INK.safety, 0.4) : INK.safety; ctx.lineWidth = 0.11; ctx.stroke();
  }
  ctx.restore();
}

// ---------- Birds and the snowman ----------
// A herring gull, about goose height sitting down: white, a grey back with
// black wingtips, a yellow bill with its red spot, pink legs, a grudge. It
// holds a boarding pass in its bill (flying standby).
function gull(ctx, x, y, z, t, dir = 'r') {
  const [X, Y] = P(x, y, z), f = dir === 'l' ? -1 : 1;
  ctx.save();
  ctx.translate(X, Y); ctx.scale(f, 1);
  ctx.beginPath(); ctx.ellipse(0, 0, 0.3, 0.1, 0, 0, Math.PI * 2); ctx.fillStyle = alpha(C.ink, 0.16); ctx.fill();
  ctx.strokeStyle = C.pink; ctx.lineWidth = 0.05; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-0.04, -0.2); ctx.lineTo(-0.06, 0); ctx.moveTo(0.07, -0.2); ctx.lineTo(0.08, 0); ctx.stroke();
  // The body and white tail.
  ctx.beginPath(); ctx.ellipse(0, -0.33, 0.3, 0.16, -0.08, 0, Math.PI * 2);
  ctx.moveTo(-0.24, -0.36); ctx.lineTo(-0.48, -0.42); ctx.lineTo(-0.27, -0.27);
  paint(ctx, C.white, { lw: 0.04, dots: Q.detail ? C.greyLight : null, density: 0.1 });
  // The folded wing: grey, its black tip past the tail with white spots.
  ctx.beginPath(); ctx.moveTo(0.18, -0.42); ctx.quadraticCurveTo(-0.05, -0.52, -0.34, -0.42); ctx.lineTo(-0.3, -0.33); ctx.quadraticCurveTo(-0.02, -0.3, 0.18, -0.42);
  paint(ctx, C.grey, { lw: 0.035 });
  ctx.beginPath(); ctx.moveTo(-0.3, -0.42); ctx.lineTo(-0.56, -0.45); ctx.lineTo(-0.3, -0.34); ctx.closePath();
  paint(ctx, C.black, { lw: 0.03 });
  if (Q.detail) { ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(-0.48, -0.44, 0.022, 0, Math.PI * 2); ctx.fill(); }
  // The head, looking about.
  const look = Math.sin(t * 0.9) > 0.6 ? 0.04 : 0;
  ctx.beginPath(); ctx.moveTo(0.16, -0.38); ctx.lineTo(0.22, -0.55); ctx.lineTo(0.3, -0.5); ctx.lineTo(0.26, -0.36); ctx.closePath(); paint(ctx, C.white, { lw: 0.03 });
  ctx.beginPath(); ctx.arc(0.26 + look, -0.58, 0.1, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.035 });
  ctx.beginPath(); ctx.moveTo(0.33 + look, -0.6); ctx.lineTo(0.5 + look, -0.57); ctx.lineTo(0.47 + look, -0.53); ctx.lineTo(0.33 + look, -0.54); ctx.closePath();
  paint(ctx, C.mustard, { lw: 0.02 });
  ctx.beginPath(); ctx.arc(0.45 + look, -0.545, 0.018, 0, Math.PI * 2); ctx.fillStyle = C.red; ctx.fill();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0.29 + look, -0.6, 0.022, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.beginPath(); ctx.moveTo(0.24 + look, -0.66); ctx.lineTo(0.33 + look, -0.63); ctx.stroke();
  // The boarding pass.
  if (Q.detail) {
    ctx.beginPath(); ctx.rect(0.43 + look, -0.57, 0.17, 0.1); paint(ctx, C.white, { lw: 0.015 });
    ctx.fillStyle = C.red; ctx.fillRect(0.43 + look, -0.57, 0.04, 0.1);
  }
  ctx.restore();
}
// A Canada goose: brown, a black neck and head, the white chinstrap. Not the
// goose. pose: walk | stand | honk
function canada(ctx, x, y, z, t, dir = 'r', pose = 'walk') {
  const [X, Y] = P(x, y, z), f = dir === 'l' ? -1 : 1;
  const ph = t * 9;
  ctx.save();
  ctx.translate(X, Y); ctx.scale(f, 1);
  ctx.beginPath(); ctx.ellipse(0, 0, 0.4, 0.16, 0, 0, Math.PI * 2); ctx.fillStyle = alpha(C.ink, 0.18); ctx.fill();
  const bob = pose === 'walk' ? Math.abs(Math.sin(ph)) * 0.06 : 0;
  ctx.translate(0, -bob);
  const sw = pose === 'walk' ? Math.sin(ph) * 0.12 : 0;
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.07; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-0.05, -0.32); ctx.lineTo(-0.05 + sw, 0); ctx.moveTo(0.08, -0.32); ctx.lineTo(0.08 - sw, 0); ctx.stroke();
  const by = -0.45, body = mix(C.brown, C.grey, 0.4);
  ctx.beginPath(); ctx.ellipse(0, by, 0.43, 0.24, -0.12, 0, Math.PI * 2);
  paint(ctx, body, { dots: Q.detail ? shade(body, 0.45) : null, density: 0.2 });
  ctx.beginPath(); ctx.ellipse(-0.06, by - 0.03, 0.26, 0.13, -0.2, 0, Math.PI * 2); paint(ctx, shade(body, 0.25));
  ctx.beginPath(); ctx.moveTo(-0.32, by - 0.04); ctx.lineTo(-0.56, by - 0.2); ctx.lineTo(-0.38, by + 0.08); ctx.closePath(); paint(ctx, C.black, { lw: 0.03 });
  ctx.beginPath(); ctx.ellipse(-0.3, by + 0.1, 0.1, 0.06, 0, 0, Math.PI * 2); ctx.fillStyle = C.white; ctx.fill();
  const honk = pose === 'honk';
  const nx = honk ? 0.5 : 0.28, ny = honk ? by - 0.45 : by - 0.62;
  ctx.beginPath(); ctx.moveTo(0.22, by - 0.1); ctx.quadraticCurveTo(0.35, by - 0.3, nx, ny);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.2; ctx.stroke();
  ctx.strokeStyle = C.black; ctx.lineWidth = 0.13; ctx.stroke();
  ctx.beginPath(); ctx.arc(nx, ny, 0.12, 0, Math.PI * 2); paint(ctx, C.black);
  ctx.beginPath(); ctx.ellipse(nx - 0.02, ny + 0.04, 0.07, 0.045, -0.4, 0, Math.PI * 2); ctx.fillStyle = C.white; ctx.fill();
  ctx.beginPath();
  if (honk) { ctx.moveTo(nx + 0.08, ny - 0.04); ctx.lineTo(nx + 0.32, ny - 0.13); ctx.lineTo(nx + 0.1, ny); ctx.moveTo(nx + 0.08, ny + 0.03); ctx.lineTo(nx + 0.3, ny + 0.09); ctx.lineTo(nx + 0.08, ny + 0.06); }
  else { ctx.moveTo(nx + 0.08, ny - 0.05); ctx.lineTo(nx + 0.28, ny + 0.01); ctx.lineTo(nx + 0.08, ny + 0.06); }
  paint(ctx, C.black, { lw: 0.02 });
  ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(nx + 0.04, ny - 0.04, 0.025, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
// The snowman the night shift built by the de-icing pad: three balls, a hard
// hat, a safety vest, a carrot, and a pair of marshalling wands.
function snowman(ctx, x, y, ink) {
  const [X, Y] = P(x, y, 0);
  ctx.save();
  ctx.translate(X, Y);
  ctx.beginPath(); ctx.ellipse(0, 0, 0.55, 0.22, 0, 0, Math.PI * 2); ctx.fillStyle = alpha(C.ink, 0.15); ctx.fill();
  const snow = ink(C.white), dt = Q.detail ? ink(C.sky) : null;
  const ball = (cy, r) => { ctx.beginPath(); ctx.arc(0, cy, r, 0, Math.PI * 2); paint(ctx, snow, { dots: dt, density: 0.12, lw: 0.04 }); };
  // The stick arms, holding the wands up and out.
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(s * 0.26, -1.08); ctx.lineTo(s * 0.62, -1.42);
    ctx.strokeStyle = ink(C.brown); ctx.lineWidth = 0.05; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.62, -1.42); ctx.lineTo(s * 0.8, -1.8);
    ctx.lineCap = 'round'; ctx.strokeStyle = C.ink; ctx.lineWidth = 0.15; ctx.stroke();
    ctx.strokeStyle = INK.safety; ctx.lineWidth = 0.09; ctx.stroke();
  }
  ball(-0.42, 0.44);
  ball(-1.08, 0.34);
  // The vest, on the middle ball, open down the front.
  ctx.save();
  ctx.beginPath(); ctx.arc(0, -1.08, 0.34, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = INK.safety; ctx.fillRect(-0.4, -1.4, 0.8, 0.62);
  ctx.fillStyle = C.greyLight; ctx.fillRect(-0.4, -1.2, 0.8, 0.06); ctx.fillRect(-0.4, -1.0, 0.8, 0.06);
  ctx.fillStyle = snow; ctx.beginPath(); ctx.moveTo(-0.07, -1.45); ctx.lineTo(0.07, -1.45); ctx.lineTo(0.03, -0.72); ctx.lineTo(-0.03, -0.72); ctx.fill();
  ctx.restore();
  ctx.beginPath(); ctx.arc(0, -1.08, 0.34, 0, Math.PI * 2); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.04; ctx.stroke();
  ball(-1.62, 0.24);
  // Coal eyes and buttons, the carrot, the hard hat.
  ctx.fillStyle = C.ink;
  for (const [ex, ey] of [[-0.08, -1.66], [0.08, -1.66], [0, -0.55], [0, -0.35]]) { ctx.beginPath(); ctx.arc(ex, ey, 0.035, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(0, -1.6); ctx.lineTo(0.26, -1.56); ctx.lineTo(0, -1.53); ctx.closePath(); paint(ctx, C.coral, { lw: 0.02 });
  ctx.beginPath(); ctx.arc(0, -1.76, 0.22, Math.PI, 0); ctx.lineTo(0.3, -1.76); ctx.lineTo(-0.3, -1.76); ctx.closePath();
  paint(ctx, INK.signal, { lw: 0.03 });
  ctx.restore();
}

// ---------- The marshaller and who she waves in ----------
// Who comes along the service road for her: one a cycle (90 seconds, a
// quarter of the day), in from the bag room while the bag train is down at
// the gates, up to her wands, held, and waved back the way they came.
// (Timed between the bag trains on day.js's clock: the stretch from the bag
// room to her is clear at 16 to 58, 97 to 130, 232 to 274, and 284 on.)
const VISIT = [['fuel', 20], ['bike', 100], ['goose', 236], ['catering', 300]];
const V0 = 30.4, V1 = 51.6;
function visitor(t) {
  const s = wrap(t), c = VISIT.findIndex(([, t0], i) => s >= t0 && (i === VISIT.length - 1 || s < VISIT[i + 1][1]));
  if (c < 0) return null;
  const [kind, t0] = VISIT[c], k = s - t0;
  const go = kind === 'goose' ? 1.4 : kind === 'bike' ? 2.4 : 2.8;
  const back = kind === 'goose' ? 1.4 : kind === 'bike' ? 2.4 : 1.8; // (the trucks reverse)
  const d = V1 - V0, tin = d / go, wait = 5.5, tout = d / back;
  if (k < 0 || k > tin + wait + tout) return null;
  if (k < tin) return { kind, x: V0 + go * k, phase: 'in', moving: true, face: 1 };
  if (k < tin + wait) return { kind, x: V1, phase: 'wait', moving: false, face: 1, k: k - tin };
  const truck = kind === 'fuel' || kind === 'catering';
  return { kind, x: V1 - back * (k - tin - wait), phase: 'out', moving: true, face: truck ? 1 : -1 };
}
// What the marshaller's doing: who she's facing, and her signal.
function marshal(t, train) {
  const [mx, my] = MARSH, me = mx - my;
  const s = wrap(t), go = PUSH;
  if (s > go - 3 && s < go + 10) return { dir: 'r', mode: s < go + 1 ? 'come' : 'go' };
  const v = visitor(t);
  if (v) {
    const dir = v.x - 0.8 - VLANE < me ? 'l' : 'r';
    if (v.phase === 'in') return { dir, mode: V1 - v.x < 3 ? 'stop' : 'come' };
    if (v.phase === 'wait') return { dir, mode: v.k < 3.5 ? 'stop' : 'away' };
    return { dir, mode: 'away' };
  }
  const p = train && train(t);
  if (p && p.moving && p.y > RY0 && p.y < RY1 && Math.abs(p.hx) > 0.5) {
    const dx = p.x - mx, heading = p.hx > 0 ? 1 : -1;
    if (dx * heading < 0 && Math.abs(dx) < 10) return { dir: dx < 0 ? 'l' : 'r', mode: 'come' };
    if (dx * heading >= 0 && Math.abs(dx) < 12) return { dir: heading > 0 ? 'r' : 'l', mode: 'go' };
  }
  return { dir: 'l', mode: 'idle' };
}
// Her arms for a signal (near, far; 0 down, up is pi, forward positive).
function signal(mode, t) {
  const w = Math.sin(t * 7);
  switch (mode) {
    case 'come': return [Math.PI - 0.6 + 0.42 * w, Math.PI - 0.6 + 0.42 * w];
    case 'stop': return [-(Math.PI - 0.42), Math.PI - 0.42];
    case 'go': return [1.55, Math.PI - 0.5 + 0.35 * Math.sin(t * 6)];
    case 'away': return [0.95 + 0.35 * w, 0.95 + 0.35 * w];
    default: return [0.14 + 0.05 * Math.sin(t * 1.3), -0.14];
  }
}
// A bicycle along x, its front toward f (1 or -1), and a rider on it with a
// case bungeed to the rack.
function bike(ctx, x, y, f, t, ink, moving) {
  const wheel = (cx) => {
    const pts = [];
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; pts.push(P(cx + Math.cos(a) * 0.32, y, 0.32 + Math.sin(a) * 0.32)); }
    ctx.beginPath(); pts.forEach(([X, Y], i) => (i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y))); ctx.closePath();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.06; ctx.stroke();
  };
  const rear = x - 0.55 * f, front = x + 0.55 * f;
  wheel(rear); wheel(front);
  const col = ink(C.teal);
  cord(ctx, [[rear, y, 0.32], [x - 0.1 * f, y, 0.85], [x, y, 0.32], [rear, y, 0.32]], col, 0.05);
  cord(ctx, [[x - 0.1 * f, y, 0.85], [x + 0.42 * f, y, 0.92], [front, y, 0.32]], col, 0.05);
  cord(ctx, [[x + 0.42 * f, y - 0.2, 1.05], [x + 0.42 * f, y + 0.2, 1.05]], C.ink, 0.04);
  bag(ctx, rear - 0.05 * f, y, 0.62, { kind: 'case', color: C.purple, lie: true, along: 'x', s: 0.75, ink });
  person(ctx, x - 0.08 * f, y + 0.02, 0.22, { ...look(77, 'traveler', { top: C.green, hat: 'beanie' }), pose: 'sit', dir: f > 0 ? 'r' : 'l', scale: 0.92, arms: [1.25, 1.1], phase: 0 }, moving ? t * 0.6 : 0);
}

// ---------- The de-icing ----------
// In the stuck night the fourth plane waits on the pad; three times it's
// sprayed (SPRAY seconds), then waits while the snow builds up on it again.
const DE0 = at(18), DE1 = at(23.5), DEP = (DE1 - DE0) / 3, SPRAY = 9;
const dePhase = (t) => { const s = wrap(t); return s < DE0 || s >= DE1 ? -1 : (s - DE0) % DEP; };
// How much snow lies on it, and how orange it is, 0..1.
function deSnow(t) {
  const ph = dePhase(t);
  if (ph < 0) return 0;
  if (ph < SPRAY) return settle(t) * (1 - ph / SPRAY);
  return settle(t) * clamp((ph - SPRAY) / (DEP - SPRAY - 2));
}
function deCoat(t) {
  const ph = dePhase(t);
  if (ph < 0) return 0;
  if (ph < SPRAY) return ph / SPRAY;
  return clamp(1 - ((ph - SPRAY) / (DEP - SPRAY)) * 1.15);
}
// The baskets over the wings at night, and where their spray lands.
const BOOMS = [
  { truck: [34.2, 33.4], turret: [34.2, 36.4, 2.0], basket: [35.8, 39.6, 3.45], lands: [35.8, 40.1, 1.55] },
  { truck: [44.6, 33.4], turret: [44.6, 36.4, 2.0], basket: [43.2, 39.8, 3.45], lands: [43.1, 40.3, 1.55] },
];

export default {
  id: 'apron',
  name: 'The Apron',
  blurb: 'A marshaller waves in anything that moves, wanted or not. After dark the de-icers spray a plane orange, wait for the snow, and spray it again.',
  describe: 'The concrete outside the gates: planes at their jet bridges, belt loaders, bag carts, a fuel truck, a catering truck with its box raised, and a marshaller waving in whatever comes. After dark the snow piles up, and a plane on the de-icing pad is sprayed orange, again and again.',

  build(R) {
    // ---------- The ground ----------
    R.floor((ctx) => {
      // The plate's cut side down the right end (the runway's in front).
      face(ctx, [[W, AIR, 0], [W, FRONT, 0], [W, FRONT, -SLAB], [W, AIR, -SLAB]], shade(GROUND.apron, 0.2), { lw: 0.04 });
      rect(ctx, CHECK, AIR, W - CHECK, FRONT - AIR, 0, GROUND.apron, { stroke: false });
      tiles(ctx, 4, alpha(C.ink, 0.06), 0.025, CHECK, AIR, W - CHECK, RY0 - AIR);
      // The stands: a paler concrete in slabs, the lead-in line down the
      // middle with its stop bar, the stand's number, and the hatched box
      // kept clear in front of the nose.
      for (const X of [X12, X13, X14]) {
        rect(ctx, X - 7.3, AIR + 0.5, 14.6, RY0 - AIR - 1.1, 0.002, GROUND.stand, { stroke: false });
        tiles(ctx, 2, alpha(C.ink, 0.07), 0.022, X - 7.3, AIR + 0.5, 14.6, RY0 - AIR - 1.1);
        rect(ctx, X - 0.08, AIR + 1.2, 0.16, RY0 - AIR - 1.8, 0.004, INK.signal, { stroke: false });
        rect(ctx, X - 0.9, NOSE + 0.25, 1.8, 0.18, 0.004, INK.signal, { stroke: false });
        paintText(ctx, 'floor', X - 3.2, AIR + 2.6, `C${X === X12 ? 12 : X === X13 ? 13 : 14}`, 1.0, INK.signal);
        rect(ctx, X - 1.3, AIR + 0.7, 1.9, 1.6, 0.004, null, { lw: 0.05, stroke: C.red });
        if (Q.detail) {
          ctx.save(); poly(ctx, [[X - 1.3, AIR + 0.7, 0], [X + 0.6, AIR + 0.7, 0], [X + 0.6, AIR + 2.3, 0], [X - 1.3, AIR + 2.3, 0]]); ctx.clip();
          ctx.beginPath();
          for (let k = -3; k < 3; k += 0.45) { const [ax, ay] = P(X + k, AIR + 0.7, 0.004), [bx, by] = P(X + k + 1.6, AIR + 2.3, 0.004); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); }
          ctx.strokeStyle = alpha(C.red, 0.7); ctx.lineWidth = 0.05; ctx.stroke();
          ctx.restore();
        }
        // Where the engines drip, and the oil under the nose.
        for (const [ox, oy, r] of [[X - 3.4, 38.6, 0.7], [X + 3.4, 38.6, 0.7], [X, 35.6, 0.5], [X + 0.4, 40.8, 0.45]]) {
          face(ctx, [[ox - r, oy, 0.003], [ox, oy - r * 0.7, 0.003], [ox + r, oy, 0.003], [ox, oy + r * 0.7, 0.003]], alpha(C.ink, 0.07), { stroke: false });
        }
      }
      // The lines between the stands, dashed white.
      for (const x of [X12 - 8, X13 - 8, X14 - 8, X14 + 8]) {
        for (let y = AIR + 1; y < RY0 - 0.6; y += 1.2) rect(ctx, x - 0.05, y, 0.1, 0.6, 0.004, alpha(C.white, 0.75), { stroke: false });
      }
      // The de-icing pad: darker, its box in safety orange, its name.
      const [p0, q0, p1, q1] = PAD;
      rect(ctx, p0, q0, p1 - p0, q1 - q0, 0.002, GROUND.pad, { stroke: false });
      tiles(ctx, 3, alpha(C.ink, 0.08), 0.022, p0, q0, p1 - p0, q1 - q0);
      for (const [x, y, w, d] of [[p0, q0, p1 - p0, 0.18], [p0, q1 - 0.18, p1 - p0, 0.18], [p0, q0, 0.18, q1 - q0], [p1 - 0.18, q0, 0.18, q1 - q0]]) rect(ctx, x, y, w, d, 0.004, INK.safety, { stroke: false });
      for (let x = p0 + 1; x < p1 - 1; x += 1.4) face(ctx, [[x, q1 - 0.9, 0.004], [x + 0.5, q1 - 0.6, 0.004], [x + 1, q1 - 0.9, 0.004], [x + 1, q1 - 0.68, 0.004], [x + 0.5, q1 - 0.38, 0.004], [x, q1 - 0.68, 0.004]], alpha(INK.safety, 0.7), { stroke: false });
      paintText(ctx, 'floor', 46.6, 43.0, 'DE-ICING', 0.9, alpha(INK.safety, 0.85));
      paintText(ctx, 'floor', 36.8, 34.4, 'HOLD HERE', 0.6, alpha(INK.safety, 0.85));
      for (const [x, y] of [[38, 43.4], [46, 34.6], [42, 38.8]]) rect(ctx, x, y, 0.6, 0.35, 0.004, alpha(C.ink, 0.45), { lw: 0.02 });
      // The service road: tarmac, white edges, a dashed middle.
      rect(ctx, CHECK, RY0, W - CHECK, RY1 - RY0, 0.002, GROUND.road, { stroke: false });
      for (const y of [RY0 + 0.08, RY1 - 0.16]) rect(ctx, CHECK, y, W - CHECK, 0.08, 0.004, alpha(C.white, 0.85), { stroke: false });
      for (let x = CHECK + 0.6; x < W - 1; x += 2.4) rect(ctx, x, MID - 0.05, 1.2, 0.1, 0.004, alpha(C.white, 0.7), { stroke: false });
      for (const x of [44, 66, 98]) paintText(ctx, 'floor', x, MID + 0.6, 'SLOW', 0.5, alpha(C.white, 0.8));
      rect(ctx, CHECK, RY1, W - CHECK, FRONT - RY1, 0.002, GROUND.curb, { stroke: false });
    });

    // Glycol puddles on the pad while the spraying goes on.
    R.rug((ctx) => {
      for (const [x, y, r] of [[36, 40.6, 1.3], [43.2, 40.9, 1.2], [39.4, 44, 0.9], [34.6, 37.4, 0.6]]) {
        face(ctx, [[x - r, y, 0.008], [x - r * 0.3, y - r * 0.6, 0.008], [x + r, y - r * 0.2, 0.008], [x + r * 0.5, y + r * 0.6, 0.008], [x - r * 0.6, y + r * 0.5, 0.008]], alpha(INK.safety, 0.35), { stroke: false });
      }
    }, { on: (t) => stopped(t) && wrap(t) > DE0 + 4 });

    // The snow lying (the road's kept clear by the bag trains) and the night.
    snowCover(R, [[CHECK, AIR, W, RY0], [CHECK, RY1, W, FRONT]], { clear: [[CHECK, RY0, W, RY1]] });
    nightGround(R, [[CHECK, AIR, W, FRONT]]);

    // The terminal's light spills out of the glass onto the apron at night,
    // and the floodlights light their pools.
    for (let x = 34; x < W; x += 8) R.light({ at: [x, AIR + 0.6, 0.1], r: 3.6, color: LIT, k: (t) => nightK(t) * 0.42 });
    const MASTS = [31.0, 54.6, 70.0, 86.0, 102.6];
    for (const x of MASTS) {
      R.light({ at: [x, AIR + 1.2, 7.2], r: 1.8, color: LIT, k: (t) => (lightsOn(t) ? nightK(t) : 0) });
      R.light({ at: [x + 2, AIR + 5.5, 0.1], r: 6.5, color: LIT, k: (t) => (lightsOn(t) ? nightK(t) * 0.5 : 0) });
      for (const lit of [false, true]) R.thing(x, AIR + 1.3, (ctx) => mast(ctx, x, AIR + 1.2, 0, 7, lit), { on: (t) => lightsOn(t) === lit });
    }

    // ---------- Along the glass ----------
    // The de-icing fluid in its tanks, orange and green.
    printed(R, 37.6, 31.65, (ctx, ink) => {
      for (const [x, band, text] of [[35.3, INK.safety, 'TYPE I'], [37.0, C.green, 'TYPE IV']]) {
        cylinder(ctx, x, 31.05, 0, 0.62, 2.5, ink(C.white), {});
        const [X, Y] = P(x, 31.05, 1.7);
        if (Q.detail) {
          ctx.fillStyle = ink(band); ctx.fillRect(X - 0.87, Y - 0.12, 1.74, 0.24);
          label(ctx, x, 31.05, 1.05, text, 0.22, ink(C.ink), 'Rethink Sans');
        }
      }
      cord(ctx, [[35.9, 31.6, 0.4], [36.4, 31.7, 0.4]], ink(C.grey), 0.06);
    });
    for (const night of [false, true]) {
      R.thing(37.6, 31.65, (ctx) => { for (const x of [35.3, 37.0]) disc(ctx, x, 31.05, 2.52, 0.6, night ? dusk(C.white) : C.white, { lw: 0.02 }); },
        { fade: (t) => settle(t), depth: 69.3, on: (t) => nightPrint(t) === night });
    }
    // Baggage cans waiting by C14, the FOD bin, the extinguishers.
    printed(R, 91.6, 31.85, (ctx, ink) => { uld(ctx, 88.6, 30.5, ink); uld(ctx, 90.2, 30.5, ink); });
    cap(R, 88.6, 30.5, 89.9, 31.75, 1.35, { depth: 123.5 });
    cap(R, 90.2, 30.5, 91.5, 31.75, 1.35, { depth: 123.5 });
    printed(R, 66.4, 31.7, (ctx, ink) => {
      box(ctx, 65.8, 31.1, 0, 0.6, 0.6, 0.8, ink(C.red), { lw: 0.03 });
      lettering(ctx, 'x', 66.1, 31.71, 0.5, 'FOD', 0.22, ink(C.white), 'Bagel Fat One');
    });
    for (const [x, y] of [[73.6, 33.4], [88.6, 33.6]]) printed(R, x + 0.25, y + 0.25, (ctx, ink) => extinguisher(ctx, x, y, ink));
    // Signs: the stand that's on time, the pad's queue, the road.
    printed(R, 60.4, 31.4, (ctx, ink) => hangSign(ctx, 'x', 59.0, 31.4, 1.85, 2.8, 0.6, 'C12 · ORLANDO · ON TIME', { post: true, size: 0.26, board: ink(SIGN.board), ink: ink(SIGN.ink) }));
    printed(R, 50.5, 35.4, (ctx, ink) => {
      hangSign(ctx, 'y', 50.5, 34.3, 2.1, 2.2, 0.5, 'DE-ICING PAD', { post: true, size: 0.24, board: ink(SIGN.board), ink: ink(SIGN.ink) });
      sign(ctx, 'y', 50.5, 34.3, 1.5, 2.2, 0.48, 'TAKE A NUMBER', { size: 0.2, board: ink(C.white), ink: ink(C.ink) });
    });
    // The ticket machine for it, and the number it's on.
    printed(R, 50.6, 36.3, (ctx, ink) => {
      box(ctx, 50.4, 35.85, 0, 0.1, 0.1, 1.05, C.ink, { flat: true, stroke: false });
      box(ctx, 50.3, 35.75, 1.0, 0.3, 0.36, 0.42, ink(C.red), { lw: 0.025 });
      if (Q.detail) {
        face(ctx, [[50.605, 35.82, 1.15], [50.605, 36.04, 1.15], [50.605, 36.04, 1.3], [50.605, 35.82, 1.3]], ink(C.white), { lw: 0.015 });
        label(ctx, 50.6, 36.0, 1.68, 'NOW 47', 0.15, ink(C.ink), 'Rethink Sans');
      }
    });
    printed(R, 35.5, 44.85, (ctx, ink) => hangSign(ctx, 'x', 34.4, 44.85, 1.7, 2.2, 0.5, 'YIELD TO BAGS', { post: true, size: 0.24, board: ink(SIGN.board), ink: ink(SIGN.ink) }));

    // ---------- The planes ----------
    // C12 is Flight 1 (day.js). C13 is the band's, C14 the bride's; at night
    // a fourth waits on the de-icing pad.
    parked(R, X13, NOSE, { livery: 'jetblew' });
    parked(R, X14, NOSE, { livery: 'northeast' });
    parked(R, DE[0], DE[1], { livery: 'northeast', on: stopped });
    snowOn(R, X13, NOSE);
    snowOn(R, X14, NOSE);
    topsOn(R, DE[0], DE[1], dusk(C.white), { stroke: true, fade: deSnow, on: stopped });
    topsOn(R, DE[0], DE[1], alpha(INK.safety, 0.62), { fade: deCoat, on: stopped });

    // Flight 1 parked at C12 (day.js's, cached; its near tailplane anchored
    // past the seam at x 64 like the others), and the snow on it.
    const stab12 = stabAt(X12, NOSE);
    flight1AtGate({ ...R, thing: (x, y, draw, o) => (Math.abs(x - (X12 + 1.6)) < 0.01 && Math.abs(y - (NOSE + 12.4)) < 0.01 ? R.thing(stab12[0], stab12[1], draw, o) : R.thing(x, y, draw, o)) });
    snowOn(R, X12, NOSE, { on: (t) => !ending(t) && wrap(t) < PUSH });

    // The jet bridges (C12's pulls back before Flight 1 goes).
    const docked = (t) => { const h = hour(t); return h >= 4 && h < 23.42; };
    bridge(R, X12, 'spite', { on: docked });
    bridge(R, X12, 'spite', { on: (t) => !docked(t), back: 1.5 });
    bridge(R, X13, 'jetblew');
    bridge(R, X14, 'northeast');
    // Power to the noses.
    printed(R, X13 - 2.0, 33.0, (ctx, ink) => gpu(ctx, X13 - 2.5, 32.6, [X13 - 0.5, 34.1, 1.0], ink));
    printed(R, X14 - 2.0, 33.0, (ctx, ink) => gpu(ctx, X14 - 2.5, 32.6, [X14 - 0.5, 34.1, 1.0], ink));
    cap(R, X13 - 3.0, 32.2, X13 - 2.0, 33.0, 0.74);
    cap(R, X14 - 3.0, 32.2, X14 - 2.0, 33.0, 0.74);

    // ---------- C13: catering, the open hold, bags going up ----------
    // The hold's open, with only bags in it (C14's is shut: listen).
    printed(R, X13 + 1.25, NOSE + 4.45, (ctx, ink) => hold(ctx, X13, NOSE, 1, ink, LIVERY.jetblew.body), { depth: X13 + NOSE + 3.65 });
    printed(R, X13 + 5.4, 37.25, (ctx, ink) => loader(ctx, X13 + 1.3, 36.6, 37.25, 0.66, 4.1, ink), { depth: X13 + 5.4 + 37.25 });
    // Bags riding up into the hold, one after another.
    R.thing(X13 + 5.4, 37.25, (ctx, t) => {
      const ink = inkAt(t);
      for (let i = 0; i < 3; i++) {
        const k = ((t / 4.5 + i / 3) % 1 + 1) % 1, x = X13 + 5.2 - k * 3.85;
        if (k > 0.97) continue;
        bag(ctx, x, 36.93, beltZ(X13 + 1.3, 0.66, 4.1, x) + 0.02, { kind: i === 1 ? 'duffel' : 'case', color: BAGS[(i * 5 + 2) % BAGS.length], lie: true, along: 'x', s: 0.8, ink });
      }
    }, { anim: true, depth: X13 + 5.4 + 37.25 + 0.01 });
    // A handler at the loader's foot, heaving bags off the cart onto it.
    printed(R, X13 + 9.5, 38.6, (ctx, ink) => cart(ctx, X13 + 8.4, 38.0, 0, 'x', 1, { bags: 7, ink }));
    cap(R, X13 + 7.3, 37.38, X13 + 9.5, 38.62, 1.51);
    R.mover(() => ({ x: X13 + 6.0, y: 38.05 }), (ctx, t) => {
      const k = (t / 3) % 1, toBelt = k > 0.5, lift = Math.sin(k * Math.PI * 2);
      const lk = crew(41, { hat: 'beanie' });
      person(ctx, X13 + 6.0, 38.05, 0, { ...lk, pose: 'carry', dir: toBelt ? 'l' : 'r', arms: [1.1 + lift * 0.4, 1.0 + lift * 0.4] }, t);
      const [X, Y] = P(X13 + 6.0, 38.05, 1.15 + Math.max(0, lift) * 0.3);
      ctx.save(); ctx.translate(X + (toBelt ? -0.45 : 0.45), Y);
      ctx.beginPath(); ctx.roundRect(-0.25, -0.18, 0.5, 0.36, 0.06); paint(ctx, inkAt(t)(BAGS[Math.floor(t / 3) % BAGS.length]), { lw: 0.03 });
      ctx.restore();
    });
    // The catering truck, its box raised to the door; the stowaway inside.
    printed(R, X13 + 7.2, 36.5, (ctx, ink, night) => catering(ctx, X13 + 7.2, 35.2, 0.75, ink, night, { reach: -5.15 }));
    cap(R, X13 + 2.85, 33.9, X13 + 5.05, 36.5, 3.25, { depth: X13 + 7.2 + 36.5 + 0.01 });
    const meals = R.poke({ id: 'catering', at: [X13 + 4.0, 35.5, 2.5], r: 1.1, say: 'Is that somebody eating in there?' });
    R.thing(X13 + 5.05, 36.5, (ctx, t) => {
      const ink = inkAt(t), k = meals.k();
      const y = 36.505, xa = X13 + 3.0, xb = X13 + 4.9, za = 1.82, zb = 3.12;
      const open = [[xa, y, za], [xb, y, za], [xb, y, zb], [xa, y, zb]];
      if (k > 0.02) {
        // Inside: the meal carts, the empties, and him, eating.
        face(ctx, open, ink(shade(C.navy, 0.2)), { lw: 0.025 });
        ctx.save(); poly(ctx, open); ctx.clip();
        box(ctx, X13 + 3.05, 34.2, 1.72, 0.7, 0.9, 1.2, ink(C.greyLight), { lw: 0.02 });
        box(ctx, X13 + 3.85, 34.2, 1.72, 0.7, 0.9, 1.2, ink(C.greyLight), { lw: 0.02 });
        for (let i = 0; i < 4; i++) rect(ctx, X13 + 3.15, 35.6 - i * 0.05, 0.5, 0.3, 1.74 + i * 0.07, ink(C.greyLight), { lw: 0.015 });
        const chew = Math.sin(t * 5) > 0;
        person(ctx, X13 + 4.3, 35.95, 1.72, { ...look(66, 'traveler', { top: C.teal, hat: 'beanie', wear: pillow }), pose: 'sit', dir: 'l', scale: 0.8, arms: [chew ? 2.3 : 1.2, 0.9] }, 0);
        rect(ctx, X13 + 4.0, 36.1, 0.45, 0.32, 2.15, ink(C.greyLight), { lw: 0.015 });
        const [cx, cy] = P(X13 + 3.4, 36.3, 1.72);
        ctx.beginPath(); ctx.roundRect(cx - 0.06, cy - 0.24, 0.12, 0.24, 0.03); paint(ctx, BRAND.can, { lw: 0.015 });
        ctx.restore();
      }
      // The roller shutter, rolled up k of the way; shut, a gap at the bottom
      // shows a pair of socked feet.
      const top = zb - (zb - za) * (1 - k);
      if (k < 0.98) {
        const sh = [[xa, y + 0.005, za + (k < 0.05 ? 0.14 : 0)], [xb, y + 0.005, za + (k < 0.05 ? 0.14 : 0)], [xb, y + 0.005, zb], [xa, y + 0.005, zb]];
        if (k > 0.02) { sh[0][2] = top; sh[1][2] = top; }
        face(ctx, sh, ink(tint(C.grey, 0.55)), { lw: 0.025 });
        if (Q.detail) {
          ctx.beginPath();
          for (let z = sh[0][2] + 0.12; z < zb; z += 0.14) { const [ax, ay] = P(xa, y + 0.01, z), [bx, by] = P(xb, y + 0.01, z); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); }
          ctx.strokeStyle = alpha(C.ink, 0.22); ctx.lineWidth = 0.02; ctx.stroke();
        }
      }
      if (k < 0.05) {
        face(ctx, [[xa, y + 0.004, za], [xb, y + 0.004, za], [xb, y + 0.004, za + 0.14], [xa, y + 0.004, za + 0.14]], ink(C.ink), { lw: 0.02 });
        const wig = Math.sin(t * 6) > 0.5 ? 0.04 : 0;
        for (const fx of [X13 + 4.05, X13 + 4.45]) {
          const [X, Y] = P(fx, y + 0.02, za + 0.06 + (fx > X13 + 4.2 ? wig : 0));
          ctx.beginPath(); ctx.ellipse(X, Y, 0.12, 0.06, 0, 0, Math.PI * 2); paint(ctx, C.red, { lw: 0.02 });
        }
        // Somebody's chewing.
        const m = (t % 5) / 5;
        if (m < 0.45 && Q.detail) label(ctx, X13 + 4.2, y + 0.3, zb + 0.35 + m * 0.8, 'munch', 0.24, alpha(C.ink, 1 - m / 0.45), 'Rethink Sans');
      }
    }, { anim: true, depth: X13 + 7.2 + 36.5 + 0.05 });
    R.find({ id: 'stowaway', label: 'A stowaway', kind: 'poke', inside: meals, at: [X13 + 4.3, 35.95, 2.45], r: 0.8, hint: 'The catering box is eating its own meals.' });
    // The catering driver, looking up at his box, wondering where lunch went.
    stay(R, X13 + 8.0, 34.6, crew(43, { top: C.white, hat: 'cap' }), { dir: 'l', arms: [0.5, -0.5] });

    // ---------- C14: the hold, the goose, the fuel ----------
    const holdPoke = R.poke({ id: 'hold', at: [X14 + 1.55, 36.95, 1.0], r: 0.9, say: 'Something in here is honking.' });
    R.thing(X14 + 1.25, NOSE + 4.45, (ctx, t) => {
      const shake = holdPoke.k() < 0.05 && (t % 7) < 0.8 ? Math.sin(t * 40) * 0.02 : 0;
      ctx.save(); ctx.translate(shake, 0);
      hold(ctx, X14, NOSE, holdPoke.k(), inkAt(t), LIVERY.northeast.body);
      ctx.restore();
      // A honk now and then, out of the door's seam.
      const m = (t % 7) / 7;
      if (holdPoke.k() < 0.05 && m < 0.16 && Q.detail) label(ctx, X14 + 1.6, NOSE + 3.6, 1.55 + m * 3, 'honk!', 0.24, alpha(C.ink, 1 - m / 0.16), 'Rethink Sans');
    }, { anim: true, depth: X14 + NOSE + 3.65 });
    // The belt loader up to it, three bags on the belt and the goose's tail
    // caught under the door at the top.
    printed(R, X14 + 5.4, 37.25, (ctx, ink) => {
      loader(ctx, X14 + 1.3, 36.6, 37.25, 0.66, 4.1, ink);
      for (const [x, kind, c] of [[X14 + 4.7, 'case', BAGS[2]], [X14 + 3.85, 'duffel', BAGS[6]], [X14 + 3.0, 'case', BAGS[8]]]) {
        bag(ctx, x, 36.93, beltZ(X14 + 1.3, 0.66, 4.1, x) + 0.02, { kind, color: c, lie: true, along: 'x', s: 0.8, ink });
      }
    }, { depth: X14 + 5.4 + 37.25 });
    R.thing(X14 + 2.05, 37.3, (ctx, t) => {
      if (holdPoke.k() > 0.3) return;
      // A goose's tail, caught under the door: white, fanned, wagging.
      const wag = Math.sin(t * 2.3) * 0.05, x = X14 + 1.26, z = 0.7;
      const tip = [x + 0.62, 37.02 + wag, z + 0.34];
      face(ctx, [[x, 36.72, z], [x, 37.36, z], [x + 0.4, 37.3, z + 0.12], tip, [x + 0.44, 36.84, z + 0.22]], C.white, { lw: 0.035, dots: Q.detail ? C.grey : null, density: 0.12 });
      if (Q.detail) for (const fy of [36.9, 37.06, 37.2]) face(ctx, [[x + 0.12, fy, z + 0.06], [x + 0.5, fy + (tip[1] - fy) * 0.3, z + 0.26]], null, { lw: 0.02, stroke: C.grey });
    }, { anim: true, depth: X14 + 5.4 + 37.25 + 0.03 });
    R.goose((t) => ({
      x: X14 + 2.05, y: 36.95, z: beltZ(X14 + 1.3, 0.66, 4.1, X14 + 2.05) + 0.02,
      dir: 'r', pose: (t % 3.2) < 0.8 ? 'honk' : 'stand', hidden: holdPoke.k() < 0.5,
    }), { kind: 'poke', inside: holdPoke, hint: 'One plane\'s hold is honking.', scale: 0.82, bias: 4 });
    // The handler at the loader's foot, scratching his head at the belt.
    stay(R, X14 + 6.3, 37.7, crew(45, { hat: 'helmet' }), { dir: 'l', arms: [2.7, 0.15] });
    printed(R, X14 + 7.9, 36.18, (ctx, ink) => cart(ctx, X14 + 6.8, 35.6, 0, 'x', 1, { bags: 11, ink }));
    cap(R, X14 + 5.7, 34.98, X14 + 7.9, 36.22, 1.51);
    // The fuel truck under the near wing, its hose run in, the driver
    // watching the numbers go round.
    printed(R, X14 + 8.82, 41.8, (ctx, ink, night) => {
      cord(ctx, [[X14 + 7.55, 40.4, 0.6], [X14 + 7.0, 40.6, 0.05], [X14 + 6.0, 40.9, 0.05], [X14 + 5.8, 41.0, 0.85]], C.ink, 0.07);
      fuelTruck(ctx, X14 + 8.2, 38.6, 'y', -1, ink, night);
    });
    cap(R, X14 + 7.96, 39.65, X14 + 8.44, 41.8, 1.66, { depth: X14 + 8.82 + 41.8 + 0.02 });
    stay(R, X14 + 9.45, 41.65, crew(47, { hat: 'beanie' }), { pose: 'read', dir: 'l' });

    // ---------- C12's stand: Flight 1, on time all day ----------
    // The agent with the ON TIME paddle, and the bags for Orlando (a
    // surfboard, a beach umbrella, a rubber ring) waiting in the snow.
    R.thing(X12 + 3.4, 33.6, (ctx) => {
      person(ctx, X12 + 3.4, 33.6, 0, {
        ...look(52, 'agent', { hat: 'beanie' }), pose: 'stand', dir: 'l', arms: [2.6, -0.1],
        hold: (c) => {
          c.strokeStyle = C.ink; c.lineWidth = 0.05; c.beginPath(); c.moveTo(-0.1, 0); c.lineTo(-0.15, -0.9); c.stroke();
          c.beginPath(); c.roundRect(-0.5, -1.35, 0.7, 0.45, 0.06); paint(c, C.green, { lw: 0.03 });
          c.save(); c.translate(-0.15, -1.12); c.scale(-1 / 40, 1 / 40); c.font = '700 6px "Rethink Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = C.white; c.fillText('ON TIME', 0, 0); c.restore();
        },
      }, 0);
    });
    printed(R, X12 + 6.9, 34.18, (ctx, ink) => {
      cart(ctx, X12 + 5.8, 33.6, 0, 'x', 1, { ink, bags: [
        { u: -0.6, v: -0.22, kind: 'case', color: C.pink, lie: true },
        { u: 0.1, v: -0.24, kind: 'duffel', color: C.teal, lie: true },
        { u: 0.65, v: 0.2, kind: 'box', color: C.woodLight, lie: true },
        { u: -0.5, v: 0.22, kind: 'case', color: C.mustard, lie: true },
      ] });
      // The surfboard, the umbrella, the rubber ring, lashed on top.
      face(ctx, [[X12 + 4.7, 33.25, 1.56], [X12 + 6.9, 33.25, 1.56], [X12 + 7.0, 33.6, 1.6], [X12 + 6.9, 33.85, 1.56], [X12 + 4.7, 33.85, 1.56]], ink(C.sky), { lw: 0.03 });
      face(ctx, [[X12 + 4.9, 33.55, 1.6], [X12 + 6.8, 33.55, 1.6]], null, { lw: 0.03, stroke: ink(C.coral) });
      cord(ctx, [[X12 + 5.0, 34.1, 1.58], [X12 + 6.6, 34.1, 1.66]], ink(C.coral), 0.1);
      const [rx, ry] = P(X12 + 6.2, 33.7, 1.72);
      ctx.beginPath(); ctx.ellipse(rx, ry, 0.36, 0.17, 0, 0, Math.PI * 2); ctx.ellipse(rx, ry, 0.16, 0.07, 0, 0, Math.PI * 2);
      paint(ctx, ink(C.pink), { lw: 0.03 });
      if (Q.detail) label(ctx, X12 + 5.8, 34.25, 0.85, 'MCO', 0.16, ink(C.ink), 'Rethink Sans');
    });
    cap(R, X12 + 4.9, 33.3, X12 + 6.6, 33.8, 1.6, { depth: X12 + 6.9 + 34.18 + 0.02 });

    // ---------- The tug, its driver asleep ----------
    const nap = R.poke({ id: 'tug', at: [TUGAT[0], TUGAT[1], 1.6], r: 0.9, say: 'Five more minutes.', teach: true, hold: 2.2 });
    R.thing(TUGAT[0] + 0.7, TUGAT[1] + 0.52, (ctx, t) => {
      const awake = nap.k() > 0.5;
      tug(ctx, TUGAT[0], TUGAT[1], 0, 'x', 1, { driver: crew(49, { hat: 'beanie' }), asleep: !awake, ink: inkAt(t) }, t);
      if (settle(t) > 0.05) rect(ctx, TUGAT[0] - 0.74, TUGAT[1] - 0.54, 0.86, 1.08, 1.78, alpha(nightPrint(t) ? dusk(C.white) : C.white, settle(t)), { lw: 0.02 });
      if (!Q.detail) return;
      if (awake) label(ctx, TUGAT[0] - 0.2, TUGAT[1], 2.5, '!', 0.5, C.red, 'Bagel Fat One');
      else for (let i = 0; i < 3; i++) {
        const k = ((t * 0.45 + i / 3) % 1);
        label(ctx, TUGAT[0] - 0.4 - k * 0.4, TUGAT[1] - k * 0.3, 2.0 + k * 1.1, 'z', 0.3 + k * 0.2, alpha(C.ink, 1 - k));
      }
    }, { anim: true });
    R.light({ at: [TUGAT[0] + 0.3, TUGAT[1], 1.85], r: 0.7, color: C.mustard, k: (t) => ((t * 1.1) % 1 < 0.35 ? 0.85 : 0) });

    // ---------- The wedding dress, bound for Honolulu ----------
    // A dolly parked by the wrong plane, its bags tagged HNL, the dress in its
    // bag on top. Once the bride has it, only the claim stub's left.
    printed(R, DRESS[0] + 1.75, DRESS[1] + 0.55, (ctx, ink) => {
      dolly(ctx, DRESS[0], DRESS[1], ink);
      for (const [u, v, up, c, kind] of [[-0.55, -0.22, 0, BAGS[0], 'case'], [0.15, -0.24, 0, BAGS[3], 'case'], [0.75, 0.15, 0, BAGS[7], 'duffel'], [-0.6, 0.2, 0, BAGS[1], 'case'], [0.05, 0.18, 0, BAGS[10], 'case'], [-0.2, 0, 0.26, BAGS[2], 'case']]) {
        bag(ctx, DRESS[0] + u, DRESS[1] + v, 0.44 + up, { kind, color: c, lie: true, along: 'x', ink });
      }
      // The HNL placard on its stick.
      box(ctx, DRESS[0] + 1.05, DRESS[1] - 0.45, 0.44, 0.06, 0.06, 1.0, C.ink, { flat: true, stroke: false });
      sign(ctx, 'x', DRESS[0] + 1.08, DRESS[1] - 0.42, 1.62, 0.7, 0.36, 'HNL', { size: 0.24, board: ink(C.white), ink: ink(C.red), edge: 0.025 });
    });
    R.thing(DRESS[0] + 1.2, DRESS[1] + 0.62, (ctx, t) => {
      const ink = inkAt(t), x = DRESS[0], y = DRESS[1], z = 0.98;
      if (R.found('gates:bride')) {
        // Gone home: the claim stub left on the bags.
        rect(ctx, x - 0.15, y - 0.1, 0.32, 0.2, z, C.mustard, { lw: 0.02 });
        return;
      }
      // The garment bag, puffed up with tulle, its hanger and its tag.
      face(ctx, [[x - 0.6, y - 0.3, z], [x + 0.55, y - 0.32, z], [x + 0.6, y + 0.3, z], [x - 0.55, y + 0.34, z]], C.white, { lw: 0.03 });
      box(ctx, x - 0.55, y - 0.28, z, 1.1, 0.6, 0.16, C.white, { lw: 0.03, dots: C.greyLight, top: tint(C.blush, 0.6) });
      if (Q.detail) {
        // The window in the bag, and the lace in it.
        rect(ctx, x - 0.25, y - 0.15, 0.55, 0.32, z + 0.165, alpha(C.white, 0.9), { lw: 0.015, dots: C.pink, density: 0.3 });
        face(ctx, [[x - 0.5, y + 0.02, z + 0.165], [x + 0.5, y + 0.02, z + 0.165]], null, { lw: 0.02, stroke: C.grey });
      }
      cord(ctx, [[x - 0.6, y, z + 0.1], [x - 0.82, y, z + 0.16], [x - 0.86, y, z + 0.3], [x - 0.76, y, z + 0.34]], C.grey, 0.035);
      const [X, Y] = P(x + 0.58, y + 0.3, z + 0.05);
      ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + 0.08, Y + 0.12); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02; ctx.stroke();
      ctx.beginPath(); ctx.roundRect(X - 0.02, Y + 0.12, 0.42, 0.24, 0.03); paint(ctx, ink(C.white), { lw: 0.02 });
      ctx.fillStyle = C.red; ctx.fillRect(X - 0.02, Y + 0.12, 0.42, 0.06);
      if (Q.detail) label(ctx, x + 0.58 + 0.19, y + 0.3, z - 0.18, 'HONOLULU', 0.07, C.ink, 'Rethink Sans');
    }, { anim: true, depth: DRESS[0] + 1.75 + DRESS[1] + 0.55 + 0.02 });
    R.find({ id: 'dress', label: 'A wedding dress', at: [DRESS[0], DRESS[1], 1.15], r: 0.8 });

    // ---------- The pilot's walkaround ----------
    // Very seriously, by flashlight, in bunny slippers.
    R.mover(() => ({ x: PILOT[0], y: PILOT[1] }), (ctx, t) => {
      const sweep = Math.sin(t * 0.8) * 0.28, aA = 1.75 + sweep;
      person(ctx, PILOT[0], PILOT[1], 0, {
        ...look(232, 'pilot', { hat: null, hair: C.grey, style: 'short', face: pilotCap, wear: slippers }),
        pose: 'point', dir: 'r', arms: [aA, 0.55],
      }, t);
      const [X, Y] = P(PILOT[0], PILOT[1], 0);
      ctx.save(); ctx.translate(X, Y);
      // The clipboard in the far hand, the torch and its beam in the near.
      const fx = -0.22 + Math.sin(0.55) * 0.72, fy = -1.53 + Math.cos(0.55) * 0.72;
      ctx.beginPath(); ctx.rect(fx - 0.05, fy - 0.3, 0.26, 0.34); paint(ctx, C.woodLight, { lw: 0.02 });
      ctx.fillStyle = C.white; ctx.fillRect(fx - 0.01, fy - 0.26, 0.18, 0.24);
      const hx = 0.22 + Math.sin(aA) * 0.72, hy = -1.53 + Math.cos(aA) * 0.72, dx = Math.sin(aA), dy = Math.cos(aA);
      const beamK = 0.22 + nightK(t) * 0.3;
      ctx.beginPath(); ctx.moveTo(hx + dx * 0.15, hy + dy * 0.15);
      ctx.lineTo(hx + dx * 2.4 - dy * 0.5, hy + dy * 2.4 + dx * 0.5); ctx.lineTo(hx + dx * 2.4 + dy * 0.5, hy + dy * 2.4 - dx * 0.5); ctx.closePath();
      ctx.fillStyle = alpha(C.butter, beamK); ctx.fill();
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + dx * 0.2, hy + dy * 0.2); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.lineCap = 'round'; ctx.stroke();
      ctx.restore();
    });
    R.find({ id: 'pilot', label: 'A pilot in slippers', at: [PILOT[0], PILOT[1], 1.2], r: 0.9 });

    // ---------- The gull on C13's wing, flying standby ----------
    R.thing(GULL[0], GULL[1], (ctx, t) => gull(ctx, GULL[0], GULL[1], GULL[2], t, Math.sin(t * 0.35) > 0 ? 'r' : 'l'), { anim: true, depth: X13 - 3.25 + NOSE + 7.6 + 0.05 });
    R.decoy({ id: 'gull', at: [GULL[0], GULL[1], GULL[2] + 0.35], r: 0.7, say: 'A gull, flying standby.' });

    // ---------- The de-icing pad ----------
    for (const b of BOOMS) {
      const [x, y] = b.truck;
      printed(R, x + 0.8, y + 3.5, (ctx, ink, night) => deicer(ctx, x, y, ink, night));
      cap(R, x - 0.72, y + 1.4, x + 0.72, y + 3.5, 1.7, { depth: x + y + 4.32 });
      // By day the boom's folded down over the cab; at night it's up over
      // the wing.
      printed(R, x + 0.36, y + 0.4, (ctx, ink, night) => boom(ctx, b.turret, [x, y + 0.45, 1.95], ink, night), { on: (t) => !stopped(t), depth: x + y + 4.35 });
      R.thing(b.basket[0] + 0.36, b.basket[1] + 0.36, (ctx) => boom(ctx, b.turret, b.basket, dusk, true), { on: stopped });
      R.light({ at: [b.basket[0], b.basket[1], b.basket[2] - 0.2], r: 2.4, color: LIT, k: (t) => (stopped(t) ? 0.8 : 0) });
      R.light({ at: [x, y + 0.6, 1.95], r: 0.7, color: C.mustard, k: (t) => (((t + x) * 1.2) % 1 < 0.3 ? 0.8 : 0) });
    }
    R.poke({ id: 'deicer', at: [BOOMS[1].truck[0], BOOMS[1].truck[1] + 1.6, 1.4], r: 0.9, say: (t) => (stopped(t) ? 'Nothing can leave. Spraying it anyway.' : 'Waiting for snow. It\'s coming.') });
    // The spray, orange, and the steam coming off the wing.
    R.air((ctx, t) => {
      const ph = dePhase(t);
      if (ph < 0 || ph > SPRAY + 6 || !Q.detail) return;
      for (const [bi, b] of BOOMS.entries()) {
        const [nx, ny, nz] = [b.basket[0], b.basket[1], b.basket[2] - 0.3];
        const sweep = Math.sin(ph * 0.9 + bi) * 0.7;
        const [lx, ly, lz] = [b.lands[0] + sweep * 0.3, b.lands[1] + sweep, b.lands[2]];
        if (ph < SPRAY) {
          poly(ctx, [[nx, ny, nz], [lx - 0.8, ly - 0.7, lz], [lx + 0.8, ly + 0.7, lz]]);
          ctx.fillStyle = alpha(INK.safety, 0.42); ctx.fill();
          particles(t, 14, 0.6, (k, r) => {
            const sx = (r() - 0.5) * 1.5, sy = (r() - 0.5) * 1.5;
            const [X, Y] = P(nx + (lx + sx - nx) * k, ny + (ly + sy - ny) * k, nz + (lz - nz) * k);
            ctx.fillStyle = tint(INK.safety, 0.15); ctx.fillRect(X - 0.07, Y - 0.07, 0.14, 0.22);
          }, 11 + bi);
        }
        particles(t, 8, 2.6, (k, r) => {
          if (ph - k * 2.6 < 0 && ph < SPRAY) return;
          const [X, Y] = P(lx + (r() - 0.5) * 2, ly + (r() - 0.5) * 2, lz + k * 2.4);
          ctx.beginPath(); ctx.arc(X + Math.sin(t + k * 3) * 0.2, Y, 0.18 + k * 0.45, 0, Math.PI * 2);
          ctx.fillStyle = alpha(C.white, (1 - k) * 0.35 * (ph > SPRAY ? 1 - (ph - SPRAY) / 6 : 1)); ctx.fill();
        }, 21 + bi);
      }
    });
    // By day the crew waits: one on a drum with a coffee, one with the hose.
    printed(R, 38.1, 34.1, (ctx, ink) => cylinder(ctx, 37.8, 33.8, 0, 0.3, 0.75, ink(INK.safety), {}), { on: (t) => !stopped(t) });
    R.thing(37.8, 33.8, (ctx) => person(ctx, 37.8, 33.8, 0.75, {
      ...crew(51, { hat: 'beanie' }), pose: 'sit', dir: 'r', arms: [1.4, 0.4],
      hold: (c) => { c.beginPath(); c.rect(0.28, -0.22, 0.16, 0.2); paint(c, C.white, { lw: 0.02 }); },
    }, 0), { on: (t) => !stopped(t), depth: 38.1 + 34.1 + 0.05 });
    stay(R, 46.2, 36.4, crew(53, { hat: 'helmet' }), { pose: 'read', dir: 'l', on: (t) => !stopped(t) });
    // The snowman, built on the night shift, and the one who built it.
    for (const night of [false, true]) R.thing(SNOWMAN[0], SNOWMAN[1], (ctx) => snowman(ctx, SNOWMAN[0], SNOWMAN[1], night ? dusk : id), { on: (t) => dark(t) && nightPrint(t) === night });
    R.light({ at: [SNOWMAN[0], SNOWMAN[1], 1.75], r: 1.0, color: INK.safety, k: (t) => (dark(t) ? nightK(t) * 0.6 : 0) });
    stay(R, 43.9, 42.6, crew(55, { hat: 'beanie' }), { pose: 'point', dir: 'l', on: dark });
    R.find({ id: 'snowman', label: 'A snowman in a safety vest', kind: 'hard', when: dark, note: 'after dark', at: [SNOWMAN[0], SNOWMAN[1], 0.95], r: 0.8, riddle: 'Built on the night shift.', hint: 'Somebody at the de-icing pad had time on their hands after dark.' });

    // ---------- Cones ----------
    const CONES = [[X13 - 7.0, 43.2], [X13 + 6.3, 43.3], [X14 - 6.4, 42.9], [X14 + 6.8, 43.2], [X13 - 1.6, 32.4], [X14 - 1.6, 32.4], [33.6, 44.0], [50.4, 44.0], [X12 - 7.7, 42.4]];
    for (const [x, y] of CONES) printed(R, x + 0.2, y + 0.2, (ctx, ink) => cone(ctx, x, y, ink));

    // ---------- Someone keeping the stand clean ----------
    // A broom by day (the walk for anything that could get in an engine), a
    // shovel once the snow's lying.
    R.mover((t) => {
      const k = (t / 9) % 1, s = k < 0.5 ? k * 2 : 2 - k * 2;
      return { x: 68.4 + s * 2.4, y: 36.1, dir: k < 0.5 ? 'r' : 'l', moving: true };
    }, (ctx, t, p) => {
      const shovel = settle(t) > 0.25, f = p.dir === 'l' ? -1 : 1, push = Math.sin(t * 4) * 0.15;
      person(ctx, p.x, p.y, 0, { ...crew(57, { hat: 'helmet' }), pose: 'walk', dir: p.dir, arms: [0.9 + push, 0.8 + push], speed: 4 }, t);
      const [X, Y] = P(p.x, p.y, 0);
      ctx.save(); ctx.translate(X, Y); ctx.scale(f, 1);
      ctx.beginPath(); ctx.moveTo(0.6 + push, -1.0); ctx.lineTo(1.1 + push, -0.05); ctx.strokeStyle = C.brown; ctx.lineWidth = 0.06; ctx.stroke();
      ctx.beginPath();
      if (shovel) { ctx.moveTo(1.0 + push, -0.05); ctx.lineTo(1.35 + push, -0.05); ctx.lineTo(1.3 + push, -0.25); ctx.lineTo(1.05 + push, -0.25); ctx.closePath(); paint(ctx, C.grey, { lw: 0.025 }); }
      else { ctx.rect(0.85 + push, -0.08, 0.5, 0.1); paint(ctx, C.ink, { lw: 0.02 }); }
      if (shovel && Q.detail) for (let i = 0; i < 4; i++) { const k = ((t * 0.9 + i / 4) % 1); ctx.fillStyle = alpha(C.white, 1 - k); ctx.beginPath(); ctx.arc(1.3 + push + k * 0.5, -0.3 - Math.sin(k * Math.PI) * 0.6, 0.05, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    });

    // ---------- The marshaller ----------
    const train = R.walkers.find((w) => w.id === 'train');
    const trainAt = train ? (t) => train.at(t) : null;
    const MLOOK = crew(231, { hat: 'helmet', face: muffs, style: 'pony', hair: C.brown, dress: false });
    R.mover(() => ({ x: MARSH[0], y: MARSH[1] }), (ctx, t) => {
      const st = marshal(t, trainAt), arm = signal(st.mode, t);
      person(ctx, MARSH[0], MARSH[1], 0, { ...MLOOK, pose: 'stand', dir: st.dir, arms: arm }, t);
      wands(ctx, MARSH[0], MARSH[1], 0, st.dir, arm, nightK(t) > 0.3);
    });
    R.poke({ id: 'marshaller', at: [MARSH[0], MARSH[1], 1.7], r: 0.9, say: (t) => {
      if (stopped(t)) return 'Nothing is moving. I am waving anyway.';
      const s = wrap(t);
      if (s >= PUSH - 3) return 'Flight 1! Go, go, go!';
      return 'Keep coming. Keep coming. Stop.';
    } });
    // Whoever's coming up the road for her.
    R.mover((t) => {
      const v = visitor(t);
      return v ? { x: v.x, y: VLANE + 0.95, v } : { x: -1e4, y: -1e4, v: null };
    }, (ctx, t, p) => {
      const v = p.v;
      if (!v) return;
      const a = clamp((v.x - V0) / 2.5);
      ctx.save();
      ctx.globalAlpha *= a;
      const ink = inkAt(t), night = nightPrint(t);
      if (v.kind === 'fuel') fuelTruck(ctx, v.x, VLANE, 'x', 1, ink, night);
      else if (v.kind === 'catering') catering(ctx, v.x, VLANE, 0, ink, night, { side: true, half: 0.85 });
      else if (v.kind === 'bike') bike(ctx, v.x - 0.7, VLANE, v.face, t, ink, v.moving);
      else canada(ctx, v.x - 0.4, VLANE, 0, t, v.face > 0 ? 'r' : 'l', v.moving ? 'walk' : (t % 2 < 0.7 ? 'honk' : 'stand'));
      // A reversing truck beeps.
      if (v.phase === 'out' && v.face > 0 && Q.detail && (t * 2) % 1 < 0.5) label(ctx, v.x - 3.4, VLANE, 1.6, 'beep', 0.24, C.ink, 'Rethink Sans');
      if (settle(t) > 0.05 && (v.kind === 'fuel' || v.kind === 'catering')) {
        const len = v.kind === 'fuel' ? 1.0 : 2.2, z = v.kind === 'fuel' ? 1.68 : 2.52;
        rect(ctx, v.x - (v.kind === 'fuel' ? 1.0 : 4.35), VLANE - (v.kind === 'fuel' ? 0.64 : 0.85), len, v.kind === 'fuel' ? 1.28 : 1.7, z, alpha(night ? dusk(C.white) : C.white, settle(t)), { lw: 0.02 });
      }
      ctx.restore();
    });
    R.decoy({
      id: 'canada-goose', r: 0.7, say: 'A Canada goose. Waved in. Wrong goose.',
      at: (t) => { const v = visitor(t); return v && v.kind === 'goose' ? [v.x - 0.4, VLANE, 0.55] : [0, 0, -50]; },
      when: (t) => { const v = visitor(t); return !!v && v.kind === 'goose'; },
    });
  },
};
