// Departures: the kit. The finished shared pieces every area builds on, drawn
// once here so the airport is one plate: toy planes, the ramp's tug and bag
// carts, luggage, the people (in parkas), the airport's signs, the night and
// the snow. Colors come from the style sheet (style.js); the plan's numbers
// (plan.js) say where the big things go.
//
// Solids here are drawn as faces with the backs left out (a plane's round
// body, a wing, a fin): solid() works out which faces look toward you and
// outlines only the edge of the shape, so a toy plane reads as one smooth
// thing rather than a cage of lines.
import { C, Q, P, LW, box, face, rect, paint, alpha, tint, shade, mix, person, folk, paintText, glow } from '../../engine/art.js';
import { ZK } from '../../engine/iso.js';
import { INK, LIVERY, RAMP, BAGS, SIGN, LIT, dusk, nightPrint } from './style.js';
import { PLANE } from './plan.js';
import { tag } from '../greybox.js';
import { nightK, settle, lightsOn } from './clock.js';

// ---------- Solids ----------
// The way toward the viewer: faces whose outward side points this way show.
const VIEW = [1, 1, 1 / ZK];
const key = (p) => p.map((v) => Math.round(v * 1000)).join(',');
// Draw a convex solid (or a piece of one) from its faces: [{ pts: [[x, y, z],
// ...], fill, dots, density }]. Faces turned away are skipped; the rest are
// filled, and only the outline of what shows is inked (plus any face marked
// edge: true, for a crease worth a line). center: a point inside it (for which
// way is out); default the middle of its corners. o: { lw, ink: a color mapper
// for the night print }
export function solid(ctx, faces, o = {}) {
  const ink = o.ink || ((c) => c);
  let c = o.center;
  if (!c) {
    c = [0, 0, 0]; let n = 0;
    for (const f of faces) for (const p of f.pts) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; n++; }
    c = c.map((v) => v / n);
  }
  // (A face marked ghost is never filled but counts as showing for the
  // outline: the cut end of a piece of a longer solid, so the seam between
  // two pieces isn't inked.)
  const shown = [];
  for (const f of faces) {
    if (f.ghost) { shown.push({ f, n: null }); continue; }
    // Newell's normal, turned outward from the center.
    let nx = 0, ny = 0, nz = 0, mx = 0, my = 0, mz = 0;
    const pts = f.pts, n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]);
      mx += a[0]; my += a[1]; mz += a[2];
    }
    mx /= n; my /= n; mz /= n;
    if (nx * (mx - c[0]) + ny * (my - c[1]) + nz * (mz - c[2]) < 0) { nx = -nx; ny = -ny; nz = -nz; }
    if (nx * VIEW[0] + ny * VIEW[1] + nz * VIEW[2] <= 1e-6) continue;
    const len = Math.hypot(nx, ny, nz) || 1;
    shown.push({ f, n: [nx / len, ny / len, nz / len] });
  }
  // Fill, shaded by which way each face looks (as box() shades a box's sides).
  for (const { f, n } of shown) {
    if (f.ghost) continue;
    const fill = f.fill ? (f.flat ? f.fill : shade(f.fill, Math.max(0, 0.1 * n[0] + 0.22 * n[1] - 0.04 * n[2] + 0.12 * Math.max(0, -n[2])))) : null;
    if (!fill) continue;
    face(ctx, f.pts, ink(fill), { stroke: false, dots: f.dots && Q.detail ? ink(f.dots) : null, density: f.density ?? 0.18 });
  }
  if (!Q.lines) return;
  // The outline: edges that border only one showing face (never one along a
  // ghost's rim: that's a seam inside the shape).
  const edges = new Map(), seams = new Set();
  for (const { f } of shown) {
    const pts = f.pts;
    if (f.ghost) {
      for (let i = 0; i < pts.length; i++) { const ka = key(pts[i]), kb = key(pts[(i + 1) % pts.length]); seams.add(ka < kb ? ka + '|' + kb : kb + '|' + ka); }
      continue;
    }
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], ka = key(a), kb = key(b);
      const k = ka < kb ? ka + '|' + kb : kb + '|' + ka;
      const e = edges.get(k);
      if (e) e.n++; else edges.set(k, { a, b, n: 1, crease: !!f.edge });
    }
  }
  ctx.beginPath();
  for (const [k, e] of edges) {
    if ((e.n !== 1 && !e.crease) || seams.has(k)) continue;
    const [ax, ay] = P(...e.a), [bx, by] = P(...e.b);
    ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
  }
  ctx.strokeStyle = C.ink; ctx.lineWidth = o.lw || LW; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.stroke();
}
// A hexahedron's six faces from its eight corners: bottom a0..a3 and top
// b0..b3, each going round the same way.
export function hexa(a, b, fill, o = {}) {
  const f = (pts, extra = {}) => ({ pts, fill, ...o, ...extra });
  return [
    f([a[0], a[1], a[2], a[3]]), f([b[0], b[1], b[2], b[3]], o.top ? { fill: o.top } : {}),
    f([a[0], a[1], b[1], b[0]]), f([a[1], a[2], b[2], b[1]]), f([a[2], a[3], b[3], b[2]]), f([a[3], a[0], b[0], b[3]]),
  ];
}

// A thing that faces along x or y, in its own frame: u along it (+ toward its
// front), v across it (+ toward the side you see), h up. at(u, v) gives the
// map's x, y. dir: which way its front points along the axis (1 or -1).
export function frame(x, y, z, along = 'y', dir = 1) {
  const X = along === 'x';
  const at = (u, v) => (X ? [x + u * dir, y + v] : [x + v, y + u * dir]);
  const pt = (u, v, h) => [...at(u, v), z + h];
  // A box in the frame, [u0, u1] x [v0, v1] x [h0, h0 + h].
  const lbox = (ctx, u0, u1, v0, v1, h0, h, col, op) => {
    const [ax, ay] = at(u0, v0), [bx, by] = at(u1, v1);
    box(ctx, Math.min(ax, bx), Math.min(ay, by), z + h0, Math.abs(bx - ax), Math.abs(by - ay), h, col, op);
  };
  const lface = (ctx, pts, col, op) => face(ctx, pts.map(([u, v, h]) => pt(u, v, h)), col, op);
  return { at, pt, lbox, lface, along, dir };
}

// ---------- Planes ----------
// A toy plane (decision 10), about 13 long and 13 across: a round white body
// with its windows and a stripe in the airline's colors, low wings with an
// engine under each, a tall fin with the airline's name, and the gear. It's
// drawn in pieces (the body in short lengths, each wing, the fin) so people
// standing round a parked plane sort in front of or behind each piece.
//
// (x, y) is the nose; the plane points along x or y with its nose toward -x
// or -y (dir -1, a plane at a gate or taking off over the pier) or +x or +y
// (dir 1). o: { livery: LIVERY's key or one of its entries, z (off the
// ground, flying), ink (the night print), lit (its windows lit, its lights
// on), t (the time, for the beacon), gear: false (up, in the air), name (a
// tag over it, the greybox's), hold: 0..1 (the forward hold's door open),
// door: 0..1 (the front door open, the jet bridge's) }
export const PLANE_LEN = PLANE.len;
const R0 = PLANE.body / 2; // the body's radius
const HC = 0.62 + R0; // its axis above the ground
// The body's sections from the nose (u 0) to the tail (u -len): [u, scale,
// how far the axis rises].
const BODY = [[0, 0.22, -0.28], [-0.55, 0.62, -0.12], [-1.6, 0.92, -0.02], [-2.6, 1, 0], [-4.6, 1, 0], [-6.6, 1, 0], [-8.6, 1, 0], [-10.2, 0.8, 0.28], [-11.7, 0.52, 0.62], [-13, 0.24, 0.9]];
// Round, in eight sides (v across, h up), a little taller than wide.
const RING = [[-0.42, 1], [0.42, 1], [1, 0.42], [1, -0.42], [0.42, -1], [-0.42, -1], [-1, -0.42], [-1, 0.42]];
// The body's section at u (its scale and how far its axis rises), between
// the listed ones.
function section(u) {
  for (let i = 1; i < BODY.length; i++) {
    const [u0, s0, r0] = BODY[i - 1], [u1, s1, r1] = BODY[i];
    if (u >= u1) { const k = (u0 - u) / (u0 - u1); return [s0 + (s1 - s0) * k, r0 + (r1 - r0) * k]; }
  }
  return [BODY[BODY.length - 1][1], BODY[BODY.length - 1][2]];
}

export function planeParts(x, y, z, along, o = {}) {
  const dir = o.dir ?? -1, air = o.z || 0;
  const F = frame(x, y, z + air, along, dir); // u runs nose (0) to tail (negative): toward +axis when dir is -1
  const L = typeof o.livery === 'string' ? LIVERY[o.livery] : (o.livery || LIVERY.northeast);
  const body = L.body, ink = o.ink || ((c) => c), lit = !!o.lit;
  const ring = (u, s, rise) => RING.map(([v, h]) => F.pt(u, v * R0 * s, HC + rise + h * R0 * s * 1.04));
  const parts = [];
  const part = (u, v, draw) => { const [px, py] = F.at(u, v); parts.push({ x: px, y: py, draw }); };

  // The gear, under everything else (its shadow is planeShadow, on the
  // ground).
  part(-4.6, 0, (ctx) => {
    if (o.gear === false || air > 1.5) return;
    for (const [u, v] of [[-1.7, 0], [-7.4, -1.1], [-7.4, 1.1]]) {
      F.lbox(ctx, u - 0.05, u + 0.05, v - 0.04, v + 0.04, 0.15, HC - R0 - 0.1, C.grey, { flat: true, lw: 0.015 });
      F.lbox(ctx, u - 0.17, u + 0.17, v - 0.1, v + 0.1, 0, 0.32, C.ink, { flat: true, lw: 0.015 });
    }
  });

  // A wing: root under the body, swept back, the tip raised a little, a
  // winglet in the airline's color. side: 1 (the side you see) or -1.
  const wing = (side) => {
    const v0 = side * R0 * 0.7, v1 = side * PLANE.span / 2, h0 = HC - R0 * 0.55, h1 = HC - R0 * 0.2;
    const a = [F.pt(-5.1, v0, h0), F.pt(-8.2, v0, h0), F.pt(-9.5, v1, h1), F.pt(-8.2, v1, h1)];
    const b = a.map((p, i) => [p[0], p[1], p[2] + (i < 2 ? 0.26 : 0.12)]);
    const faces = hexa(a, b, mix(body, C.grey, 0.18), { top: body });
    const tip = [F.pt(-8.15, v1, h1 + 0.1), F.pt(-9.45, v1, h1 + 0.1), F.pt(-9.6, v1, h1 + 0.9), F.pt(-9.05, v1, h1 + 0.9)];
    return (ctx) => {
      solid(ctx, faces, { ink });
      solid(ctx, hexa(tip, tip.map((p) => [p[0] + (along === 'y' ? 0.12 : 0), p[1] + (along === 'x' ? 0.12 : 0), p[2]]), L.tail), { ink });
      if (lit && Q.detail) glow(ctx, ...F.pt(-9.3, v1, h1 + 0.2), 0.9, side > 0 ? C.green : C.red, 0.8);
    };
  };
  // An engine under a wing: a short round pod, its intake dark.
  const engine = (side) => {
    const v = side * 3.4, h = HC - R0 - 0.1, r = 0.55;
    const pod = (u, s) => RING.map(([a, b]) => F.pt(u, v + a * r * s, h + b * r * s));
    const rings = [pod(-4.3, 0.9), pod(-4.6, 1), pod(-6.2, 1), pod(-6.8, 0.6)];
    const faces = [];
    for (let i = 0; i < rings.length - 1; i++) for (let k = 0; k < 8; k++) faces.push({ pts: [rings[i][k], rings[i][(k + 1) % 8], rings[i + 1][(k + 1) % 8], rings[i + 1][k]], fill: mix(body, C.grey, 0.35) });
    faces.push({ pts: [...rings[0]].reverse(), fill: C.ink, flat: true });
    faces.push({ pts: rings[rings.length - 1], fill: C.grey });
    const pylon = [F.pt(-4.9, v - 0.08, h + r * 0.6), F.pt(-6.2, v - 0.08, h + r * 0.6), F.pt(-6.4, v - 0.08, HC - R0 * 0.5), F.pt(-5.2, v - 0.08, HC - R0 * 0.5)];
    return (ctx) => {
      solid(ctx, hexa(pylon, pylon.map((p) => [p[0] + (along === 'y' ? 0.16 : 0), p[1] + (along === 'x' ? 0.16 : 0), p[2]]), mix(body, C.grey, 0.25)), { ink });
      solid(ctx, faces, { ink });
      // A band in the airline's color round the pod.
      const band = [F.pt(-4.75, v + r * 1.01, h + 0.15), F.pt(-5.15, v + r * 1.01, h + 0.15), F.pt(-5.15, v + r * 1.01, h - 0.25), F.pt(-4.75, v + r * 1.01, h - 0.25)];
      if (side > 0 && Q.detail) face(ctx, band, ink(L.stripe), { stroke: false });
    };
  };
  // A horizontal tailplane.
  const stab = (side) => {
    const v0 = side * R0 * 0.3, v1 = side * 3.1, hh = HC + 0.62;
    const a = [F.pt(-11.1, v0, hh), F.pt(-12.7, v0, hh), F.pt(-13, v1, hh + 0.25), F.pt(-12.3, v1, hh + 0.25)];
    return (ctx) => solid(ctx, hexa(a, a.map((p, i) => [p[0], p[1], p[2] + (i < 2 ? 0.16 : 0.08)]), mix(body, C.grey, 0.1), { top: body }), { ink });
  };

  // The far side first (it sorts behind the body by where it is).
  part(-7.6, -PLANE.span / 4, (ctx) => { engine(-1)(ctx); wing(-1)(ctx); });
  part(-12.6, -1.6, stab(-1));

  // The body, in lengths between its sections, each one a solid of its own.
  for (let i = 0; i < BODY.length - 1; i++) {
    const [u0, s0, r0] = BODY[i], [u1, s1, r1] = BODY[i + 1];
    const A = ring(u0, s0, r0), B = ring(u1, s1, r1);
    const faces = [];
    for (let k = 0; k < 8; k++) {
      // Bottom faces a little grey, the rest the body's color.
      const low = k >= 3 && k <= 6;
      faces.push({ pts: [A[k], A[(k + 1) % 8], B[(k + 1) % 8], B[k]], fill: low ? mix(body, C.grey, 0.22) : body, dots: low ? shade(body, 0.45) : null });
    }
    // The ends: only the nose's tip and the tail's are real; the rest are
    // where one piece meets the next.
    faces.push({ pts: [...A].reverse(), fill: body, ghost: i > 0 });
    faces.push({ pts: B, fill: body, ghost: i < BODY.length - 2 });
    part((u0 + u1) / 2, 0, (ctx) => {
      solid(ctx, faces, { ink });
      if (!Q.detail) return;
      // On the side you see: the stripe under the windows, the windows, the
      // cockpit, the door.
      // (A point on the side you see, h up from the axis, at the body's
      // size there.)
      const side = (u, h) => { const [sc, rise] = section(u); return F.pt(u, R0 * sc * 1.012, HC + rise + h * sc); };
      const ua = Math.min(u0, -0.9), ub = Math.max(u1, -10.4);
      if (ua > ub) {
        face(ctx, [side(ua, -0.2), side(ub, -0.2), side(ub, -0.42), side(ua, -0.42)], ink(L.stripe), { stroke: false });
        for (let u = -3.3; u > -10.2; u -= 0.62) {
          if (u > ua || u < ub) continue;
          const wc = lit ? LIT : shade(C.sky, 0.35);
          face(ctx, [side(u, 0.28), side(u - 0.26, 0.28), side(u - 0.26, 0.02), side(u, 0.02)], ink(wc), { stroke: false });
        }
      }
      if (u0 >= -1.6 && u1 <= -0.55) {
        // The cockpit's windscreen, on the round of the nose.
        const top = (u, v, h) => F.pt(u, v, HC + h);
        face(ctx, [top(-0.75, 0.86, 0.32), top(-1.25, 1.02, 0.32), top(-1.3, 0.98, 0.62), top(-0.86, 0.6, 0.62)], ink(lit ? LIT : C.ink), { lw: 0.02 });
        face(ctx, [top(-0.86, 0.6, 0.62), top(-1.3, 0.98, 0.62), top(-1.32, 0.3, 0.95), top(-0.98, 0.2, 0.86)], ink(lit ? tint(LIT, 0.3) : C.navy), { lw: 0.02 });
        if (L.nose) face(ctx, [side(-0.6, -0.2), side(-1.6, -0.2), side(-1.6, -0.42), side(-0.6, -0.42)], ink(L.stripe), { stroke: false });
      }
      if (u0 >= -2.6 && u1 <= -2.6 - 0.001 || (u0 > -3.2 && u1 < -2.4)) {
        // The front door (open: a dark gap where the jet bridge meets it).
        const d = o.door || 0;
        face(ctx, [side(-2.75, 0.46), side(-3.25, 0.46), side(-3.25, -0.48), side(-2.75, -0.48)], ink(d > 0.5 ? C.ink : body), { lw: 0.025 });
      }
      if (u0 > -4.4 && u1 < -3.2) {
        // The forward hold's door, low on the side you see.
        const k = o.hold || 0;
        const dd = (u, h) => F.pt(u, R0 * 1.02, HC + h);
        face(ctx, [dd(-3.5, -0.62), dd(-4.4, -0.62), dd(-4.4, -1.05), dd(-3.5, -1.05)], ink(k > 0.5 ? C.ink : mix(body, C.grey, 0.22)), { lw: 0.025 });
        if (k > 0.05) face(ctx, [dd(-3.5, -0.62), dd(-4.4, -0.62), F.pt(-4.4, R0 * 1.02 + 0.9 * k, HC - 0.62 + 0.25 * k), F.pt(-3.5, R0 * 1.02 + 0.9 * k, HC - 0.62 + 0.25 * k)], ink(mix(body, C.grey, 0.3)), { lw: 0.025 });
      }
    });
  }
  // The near side, then the fin on top.
  part(-7.4, PLANE.span / 4, (ctx) => { engine(1)(ctx); wing(1)(ctx); });
  part(-12.4, 1.6, stab(1));
  part(-12.2, 0.4, (ctx) => {
    const hb = HC + R0 * 0.62, w = 0.09;
    const fin = [F.pt(-9.7, -w, hb), F.pt(-12.9, -w, hb + 0.7), F.pt(-13.2, -w, hb + 3.2), F.pt(-12.2, -w, hb + 3.2)];
    solid(ctx, hexa(fin, fin.map(([px, py, pz]) => [px + (along === 'y' ? 2 * w : 0), py + (along === 'x' ? 2 * w : 0), pz]), L.tail), { ink });
    if (!Q.detail) return;
    // The pattern (JetBlew's dots), and the name up the fin.
    const s = (u, h) => F.pt(u, w * 1.4, hb + h);
    if (L.pattern) for (let i = 0; i < 6; i++) {
      const u = -10.6 - i * 0.38 - (i % 2) * 0.1, h = 0.7 + (i % 3) * 0.75 + i * 0.12;
      face(ctx, [s(u, h), s(u - 0.22, h), s(u - 0.22, h + 0.22), s(u, h + 0.22)], ink(L.pattern), { stroke: false });
    }
    ctx.save();
    const [fx, fy, fz] = F.pt(-12.15, w * 1.5, hb + 1.85);
    const plane = along === 'y' ? 'right' : 'left';
    const [dx, dy] = along === 'y' ? P(0, fy, 0) : P(fx, 0, 0);
    ctx.translate(dx, dy);
    paintText(ctx, plane, along === 'y' ? fx : fy, fz, L.name, 0.34, ink(L.logo), 'Bagel Fat One');
    ctx.restore();
    if (lit) {
      // The beacon on top, blinking.
      const on = Math.sin((o.t || 0) * 6) > 0.4;
      if (on) glow(ctx, ...F.pt(-6, 0, HC + R0 * 1.1), 1.1, C.red, 0.9);
      glow(ctx, ...F.pt(-13.1, 0, hb + 3.25), 0.7, C.white, 0.6);
    }
  });
  return parts;
}
// A plane's shadow on the ground (flat: under everything standing). air: how
// high it's flying (the shadow falls back and pales).
export function planeShadow(ctx, x, y, z, along = 'y', o = {}) {
  const F = frame(x, y, z, along, o.dir ?? -1), air = o.air || 0, sp = PLANE.span / 2;
  const sh = [[0, 0], [-1.6, R0], [-5.2, R0], [-8.2, sp], [-9.5, sp], [-8.4, R0], [-11.1, R0 * 0.6], [-12.6, 3.1], [-13, 3.1], [-13, -3.1], [-12.6, -3.1], [-11.1, -R0 * 0.6], [-8.4, -R0], [-9.5, -sp], [-8.2, -sp], [-5.2, -R0], [-1.6, -R0]];
  const back = air * 0.6;
  face(ctx, sh.map(([u, v]) => [...F.at(u + back, v - back * 0.5), z + 0.012]), alpha(C.ink, Math.max(0.04, 0.16 - air * 0.012)), { stroke: false });
}

// A plane in one piece, for one that moves (taxiing, landing, taking off):
// its shadow, then its pieces back to front. along: 'x' or 'y'; z is the
// ground under it and o.z how high it's flying. o as planeParts.
export function drawPlane(ctx, x, y, z, along = 'y', o = {}) {
  const air = o.z || 0;
  if (Q.detail || !air) planeShadow(ctx, x, y, z, along, { dir: o.dir, air });
  const parts = planeParts(x, y, z, along, o);
  parts.sort((a, b) => a.x + a.y - b.x - b.y);
  for (const p of parts) p.draw(ctx);
  if (o.name && Q.detail) { const [nx, ny] = frame(x, y, z, along, o.dir ?? -1).at(-4, 0); tag(ctx, nx, ny, z + air + 5, o.name); }
}

// A parked plane (at a gate, on the de-icing pad), nose toward -y at
// (x, nose), as still things that sort with the people round it, printed
// again in dusk inks after dark with its windows lit. o: planeParts's, plus
// on: (t) => bool while it's there.
export function plane(R, x, nose, o = {}) {
  const on = o.on || (() => true);
  R.rug((ctx) => planeShadow(ctx, x, nose, 0, 'y'), o.on ? { on } : {});
  for (const night of [false, true]) {
    const parts = planeParts(x, nose, 0, 'y', { dir: -1, ...o, ink: night ? dusk : null, lit: night });
    for (const p of parts) R.thing(p.x, p.y, p.draw, { on: (t) => on(t) && nightPrint(t) === night });
  }
}

// ---------- The ramp: tugs and bag carts ----------
// A baggage tug, about 1.4 long: a low yellow body, the driver under a little
// roof, a tow bar. Along x or y, its front toward dir. o: { driver: a look
// from folk() or false, asleep, color, ink }
export function tug(ctx, x, y, z, along = 'x', dir = 1, o = {}, t = 0) {
  const F = frame(x, y, z, along, dir), col = o.color || RAMP.tug, ink = o.ink || ((c) => c);
  for (const u of [-0.42, 0.42]) for (const v of [-0.42, 0.42]) F.lbox(ctx, u - 0.17, u + 0.17, v - 0.09, v + 0.09, 0, 0.32, C.ink, { flat: true, lw: 0.02 });
  F.lbox(ctx, -0.7, 0.7, -0.5, 0.5, 0.18, 0.4, ink(col), { lw: 0.04, dots: shade(col, 0.5) });
  F.lbox(ctx, 0.2, 0.7, -0.5, 0.5, 0.58, 0.22, ink(shade(col, 0.08)), { flat: true, lw: 0.035 });
  F.lbox(ctx, -0.82, -0.7, -0.1, 0.1, 0.24, 0.1, C.grey, { flat: true, lw: 0.02 });
  // The driver, then the posts and the roof over them.
  if (o.driver !== false) {
    const [px, py] = F.at(-0.25, 0);
    person(ctx, px, py, z + 0.25, { ...(o.driver || folk(41, { top: INK.safety, hat: 'beanie' })), pose: o.asleep ? 'sit' : 'sit', dir: (along === 'x' ? dir > 0 : dir < 0) ? 'r' : 'l', scale: 0.82, ...(o.asleep ? { arms: [0.2, -0.2] } : {}) }, o.asleep ? 0 : t);
  }
  for (const v of [-0.45, 0.45]) F.lbox(ctx, -0.65, -0.58, v - 0.035, v + 0.035, 0.58, 1.1, C.ink, { flat: true, stroke: false });
  F.lbox(ctx, -0.72, 0.1, -0.52, 0.52, 1.68, 0.08, ink(col), { flat: true, lw: 0.03 });
}
// A bag cart, about 2.2 long: an open trolley with a canopy, its bags inside
// (seeded, so every cart's different). o: { bags: a list of bag looks (bag()'s
// o) or a seed number, empty, color, ink, curtain: the near side's curtain
// drawn down }
export function cart(ctx, x, y, z, along = 'x', dir = 1, o = {}) {
  const F = frame(x, y, z, along, dir), ink = o.ink || ((c) => c), col = o.color || RAMP.cart;
  for (const u of [-0.75, 0.75]) for (const v of [-0.48, 0.48]) F.lbox(ctx, u - 0.12, u + 0.12, v - 0.07, v + 0.07, 0, 0.24, C.ink, { flat: true, lw: 0.02 });
  F.lbox(ctx, -1.05, 1.05, -0.58, 0.58, 0.2, 0.14, ink(col), { flat: true, lw: 0.035 });
  F.lbox(ctx, 1.05, 1.35, -0.04, 0.04, 0.22, 0.05, C.grey, { flat: true, stroke: false });
  // The far side's rail and the bags, then the near posts and the canopy.
  F.lbox(ctx, -1.05, 1.05, -0.6, -0.54, 0.34, 0.5, ink(shade(col, 0.1)), { flat: true, lw: 0.025 });
  if (!o.empty) {
    const list = Array.isArray(o.bags) ? o.bags : cartLoad(o.bags ?? 1);
    for (const b of list) {
      const [bx, by] = F.at(b.u, b.v);
      bag(ctx, bx, by, z + 0.34 + (b.up || 0), { ...b, along: b.along || (along === 'x' ? 'x' : 'y'), ink });
    }
  }
  for (const u of [-1, 1]) for (const v of [-0.55, 0.55]) F.lbox(ctx, u - 0.035, u + 0.035, v - 0.035, v + 0.035, 0.34, 1.1, C.ink, { flat: true, stroke: false });
  F.lbox(ctx, -1.1, 1.1, -0.62, 0.62, 1.44, 0.07, ink(RAMP.canopy), { flat: true, lw: 0.03 });
  if (o.curtain) F.lface(ctx, [[-1.0, 0.6, 0.4], [1.0, 0.6, 0.4], [1.0, 0.6, 1.42], [-1.0, 0.6, 1.42]], ink(alpha(INK.signal, 0.85)), { lw: 0.02 });
}
// A cart's load: five to seven bags, from a seed.
export function cartLoad(seed) {
  const list = [];
  let r = seed * 9301 + 49297;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  const spots = [[-0.6, -0.22, 0], [0, -0.25, 0], [0.6, -0.22, 0], [-0.55, 0.22, 0], [0.1, 0.24, 0], [0.62, 0.2, 0], [-0.25, 0, 0.5], [0.35, 0, 0.5]];
  const n = 5 + Math.floor(rnd() * 4);
  for (let i = 0; i < n; i++) {
    const [u, v, up] = spots[i];
    list.push({ u, v, up, color: BAGS[Math.floor(rnd() * BAGS.length)], kind: rnd() < 0.7 ? 'case' : rnd() < 0.6 ? 'duffel' : 'box', lie: true });
  }
  return list;
}
// A bag train: a tug and n carts behind it, along x or y, the tug's front at
// (x, y) toward dir. o: { driver, carts: [cart o, ...], ink }
export function train(ctx, x, y, z, along, dir, n = 3, o = {}, t = 0) {
  const F = frame(x, y, z, along, dir);
  const pieces = [];
  for (let i = n; i >= 1; i--) {
    const [cx, cy] = F.at(-1.2 - i * 2.6 + 0.4, 0);
    pieces.push([cx, cy, (c) => cart(c, cx, cy, z, along, dir, { ink: o.ink, ...(o.carts?.[i - 1] || { bags: (o.seed || 1) + i }) })]);
  }
  const [tx, ty] = F.at(0, 0);
  pieces.push([tx, ty, (c) => tug(c, tx, ty, z, along, dir, { driver: o.driver, ink: o.ink }, t)]);
  pieces.sort((a, b) => a[0] + a[1] - b[0] - b[1]);
  for (const p of pieces) p[2](ctx);
}

// ---------- Luggage ----------
// A bag, standing (or lying, on a belt or a cart) at (x, y, z). o: { kind:
// 'case' (a hard case on wheels, the usual), 'duffel', 'pack' (a backpack),
// 'box' (a taped box, or a cooler), 'skis' (a long bag), 'garment';
// color, along: 'x' or 'y' (its long side), lie (on its side), tag: a
// color for its tag (or false), fragile (the sticker), handle (the pull-up
// handle up), s (its size, 1), ink }
export function bag(ctx, x, y, z, o = {}) {
  const ink = o.ink || ((c) => c), kind = o.kind || 'case', s = o.s || 1, col = o.color || C.navy;
  const X = (o.along || 'x') === 'x';
  const lw = 0.025;
  if (kind === 'case') {
    // A hard case: on its wheels (0.5 wide, 0.32 deep, 0.75 tall), or lying.
    const [w, d, h] = o.lie ? [0.62 * s, 0.46 * s, 0.26 * s] : [0.46 * s, 0.28 * s, 0.68 * s];
    const W = X ? w : d, D = X ? d : w;
    if (!o.lie) for (const k of [-1, 1]) box(ctx, x + (X ? k * 0.15 * s : -0.02) - 0.03, y + (X ? -0.02 : k * 0.15 * s) - 0.03, z, 0.06, 0.06, 0.07, C.ink, { flat: true, stroke: false });
    const zb = z + (o.lie ? 0 : 0.06);
    box(ctx, x - W / 2, y - D / 2, zb, W, D, h, ink(col), { lw, dens: 0.18 });
    // Ribs, and the pull handle.
    if (Q.detail) {
      const rib = ink(shade(col, 0.25));
      for (const k of [-0.18, 0.18]) {
        if (X) face(ctx, [[x + k * W, y + D / 2 + 0.003, zb + 0.05], [x + k * W + 0.03, y + D / 2 + 0.003, zb + 0.05], [x + k * W + 0.03, y + D / 2 + 0.003, zb + h - 0.05], [x + k * W, y + D / 2 + 0.003, zb + h - 0.05]], rib, { stroke: false });
        else face(ctx, [[x + W / 2 + 0.003, y + k * D, zb + 0.05], [x + W / 2 + 0.003, y + k * D + 0.03, zb + 0.05], [x + W / 2 + 0.003, y + k * D + 0.03, zb + h - 0.05], [x + W / 2 + 0.003, y + k * D, zb + h - 0.05]], rib, { stroke: false });
      }
    }
    if (!o.lie && o.handle) {
      const hh = zb + h + 0.42;
      for (const k of [-0.1, 0.1]) box(ctx, x + (X ? k : 0) - 0.015, y + (X ? 0 : k) - 0.015, zb + h, 0.03, 0.03, 0.42, C.ink, { flat: true, stroke: false });
      box(ctx, x - (X ? 0.12 : 0.02), y - (X ? 0.02 : 0.12), hh, X ? 0.24 : 0.04, X ? 0.04 : 0.24, 0.04, C.ink, { flat: true, stroke: false });
    } else if (Q.detail) {
      box(ctx, x - (X ? 0.1 : 0.03), y - (X ? 0.03 : 0.1), zb + h, X ? 0.2 : 0.06, X ? 0.06 : 0.2, 0.04, C.ink, { flat: true, stroke: false });
    }
    if (o.fragile && Q.detail) box(ctx, x - 0.1, y - 0.08, zb + h, 0.2, 0.16, 0.005, ink(C.red), { flat: true, lw: 0.015 });
    if (o.tag !== false && Q.detail) tagOn(ctx, x + (X ? W / 2 : 0), y + (X ? 0 : D / 2), zb + h * 0.8, o.tag || C.white, ink);
    return;
  }
  if (kind === 'duffel') {
    const [w, d, h] = [0.7 * s, 0.38 * s, 0.34 * s];
    const W = X ? w : d, D = X ? d : w;
    box(ctx, x - W / 2, y - D / 2, z, W, D, h, ink(col), { lw, dens: 0.2 });
    // The rounded top, and the strap.
    face(ctx, X ? [[x - W / 2, y - D / 2, z + h], [x + W / 2, y - D / 2, z + h], [x + W / 2, y, z + h + 0.1], [x - W / 2, y, z + h + 0.1]] : [[x - W / 2, y - D / 2, z + h], [x - W / 2, y + D / 2, z + h], [x, y + D / 2, z + h + 0.1], [x, y - D / 2, z + h + 0.1]], ink(tint(col, 0.06)), { lw });
    if (Q.detail) face(ctx, X ? [[x - 0.05, y + D / 2 + 0.003, z], [x + 0.05, y + D / 2 + 0.003, z], [x + 0.05, y + D / 2 + 0.003, z + h], [x - 0.05, y + D / 2 + 0.003, z + h]] : [[x + W / 2 + 0.003, y - 0.05, z], [x + W / 2 + 0.003, y + 0.05, z], [x + W / 2 + 0.003, y + 0.05, z + h], [x + W / 2 + 0.003, y - 0.05, z + h]], ink(shade(col, 0.35)), { stroke: false });
    if (o.tag !== false && Q.detail) tagOn(ctx, x + (X ? W / 2 : 0), y + (X ? 0 : D / 2), z + h * 0.6, o.tag || C.white, ink);
    return;
  }
  if (kind === 'pack') {
    box(ctx, x - 0.2 * s, y - 0.14 * s, z, 0.4 * s, 0.28 * s, 0.56 * s, ink(col), { lw });
    box(ctx, x - 0.15 * s, y + 0.14 * s, z + 0.08, 0.3 * s, 0.06, 0.24 * s, ink(shade(col, 0.15)), { flat: true, lw: 0.02 });
    return;
  }
  if (kind === 'box') {
    const [w, d, h] = [0.56 * s, 0.46 * s, 0.4 * s];
    box(ctx, x - w / 2, y - d / 2, z, w, d, h, ink(o.color || C.woodLight), { lw, dens: 0.16 });
    if (Q.detail) box(ctx, x - w / 2, y - 0.04, z + h, w, 0.08, 0.004, ink(alpha(C.butter, 0.8)), { flat: true, stroke: false });
    return;
  }
  if (kind === 'skis') {
    const [w, d, h] = X ? [1.9 * s, 0.22, 0.18] : [0.22, 1.9 * s, 0.18];
    box(ctx, x - w / 2, y - d / 2, z, w, d, h, ink(col), { lw, dens: 0.15 });
    return;
  }
  if (kind === 'garment') {
    const [w, d, h] = X ? [0.95 * s, 0.4, 0.1] : [0.4, 0.95 * s, 0.1];
    box(ctx, x - w / 2, y - d / 2, z, w, d, h, ink(col), { lw, dens: 0.15 });
  }
}
// A paper tag hanging off a bag's handle.
function tagOn(ctx, x, y, z, color, ink) {
  const [X, Y] = P(x, y, z);
  ctx.beginPath(); ctx.moveTo(X, Y - 0.08); ctx.lineTo(X + 0.04, Y + 0.02);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.015; ctx.stroke();
  ctx.beginPath(); ctx.rect(X - 0.02, Y + 0.02, 0.12, 0.08);
  paint(ctx, ink(color), { lw: 0.015 });
}

// ---------- People ----------
// The day before Thanksgiving, in parkas: everyone's a traveler unless they
// work here. look(seed, kind, extra) gives a person's style (folk(), with
// the season's colors): kind is 'traveler' (parkas, beanies, the odd
// matching sweatshirt), 'ramp' (safety orange, ear defenders as a beanie),
// 'tsa' (navy, a grey shirt), 'agent' (the gate's navy with a cranberry
// scarf color), 'pilot' (white shirt, navy, a cap), 'trooper' (navy, a
// cap), 'band' (the Marching Ducks' cranberry), 'crew' (the fire and
// plow crews' yellow).
const PARKA = [C.navy, C.ink, INK.cranberry, C.teal, C.red, C.grey, C.purple, C.green, C.mustard, C.coral, C.black, tint(C.sky, 0.1)];
export function look(seed, kind = 'traveler', extra = {}) {
  const base = folk(seed);
  const r = ((seed * 7919) % 97) / 97;
  switch (kind) {
    case 'ramp': return { ...base, top: INK.safety, bottom: C.navy, hat: r < 0.6 ? 'beanie' : 'helmet', dress: false, ...extra };
    case 'tsa': return { ...base, top: shade(C.grey, 0.15), bottom: C.navy, dress: false, ...extra };
    case 'agent': return { ...base, top: C.navy, bottom: C.navy, ...extra };
    case 'pilot': return { ...base, top: C.white, bottom: C.navy, hat: 'cap', dress: false, ...extra };
    case 'trooper': return { ...base, top: shade(C.grey, 0.3), bottom: C.navy, hat: 'cap', dress: false, ...extra };
    case 'band': return { ...base, top: INK.cranberry, bottom: C.white, hat: 'cap', dress: false, ...extra };
    case 'crew': return { ...base, top: INK.signal, bottom: C.ink, hat: 'helmet', dress: false, ...extra };
    // (A traveler's beanie in a color of its own, never the parka's.)
    default: return { ...base, top: PARKA[seed % PARKA.length], hat: r < 0.35 ? 'beanie' : base.hat, hatColor: PARKA[(seed * 7 + 3) % PARKA.length], ...extra };
  }
}
// Someone who stays put and holds still, drawn once and cached (cheap, so
// the crowd can be big). Keep live people (R.mover, anim things) for the ones
// doing something. o: { z, pose, dir, back, scale, arms, depth, on: (t) =>
// bool while they're there, bag: a bag's o standing beside them (dir side) }
export function stay(R, x, y, lk, o = {}) {
  const z = o.z ?? 0;
  const op = { ...(o.on ? { on: o.on } : {}), ...(o.depth != null ? { depth: o.depth } : {}) };
  R.thing(x, y, (ctx) => {
    if (o.bag) bag(ctx, x + (o.dir === 'l' ? -0.5 : 0.5), y + 0.15, z, { handle: true, ...o.bag });
    person(ctx, x, y, z, { ...lk, pose: o.pose || 'stand', dir: o.dir || 'r', back: !!o.back, ...(o.arms ? { arms: o.arms } : {}), ...(o.scale ? { scale: o.scale } : {}) }, 0);
  }, op);
}
// Someone pulling a case behind them as they walk (for a mover's draw): p
// from the walk ({ x, y, moving, dir, back }).
export function roller(ctx, p, lk, t, o = {}) {
  const behind = (p.dir === 'l' ? 0.55 : -0.55);
  const bx = p.x + (p.back ? 0 : behind * 0.7), by = p.y + (p.back ? -0.5 : -behind * 0.7);
  const before = p.back;
  if (!before) bag(ctx, bx, by, p.z || 0, { handle: true, color: o.color || C.ink, ...o });
  person(ctx, p.x, p.y, p.z || 0, { ...lk, pose: p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back }, t);
  if (before) bag(ctx, bx, by, p.z || 0, { handle: true, color: o.color || C.ink, ...o });
}

// ---------- Signs ----------
// Lettering painted on an upright plane: along x (facing the lower left) or
// y (the lower right), centred on (x, y, z).
export function lettering(ctx, along, x, y, z, text, size, ink = C.ink, font = 'Rethink Sans') {
  if (!Q.detail) return;
  ctx.save();
  const [dx, dy] = along === 'x' ? P(0, y, 0) : P(x, 0, 0);
  ctx.translate(dx, dy);
  paintText(ctx, along === 'x' ? 'right' : 'left', along === 'x' ? x : y, z, text, size, ink, font);
  ctx.restore();
}
// A board with lettering, upright, along x ('x': facing the lower left) or y
// ('y': the lower right), centred on (x, y, z), w wide and h tall. The
// airport's own signs are black with yellow letters (SIGN); o: { board, ink,
// size, font, edge, arrow: '<' or '>' before the words }
export function sign(ctx, along, x, y, z, w, h, text, o = {}) {
  const pts = along === 'x'
    ? [[x - w / 2, y, z - h / 2], [x + w / 2, y, z - h / 2], [x + w / 2, y, z + h / 2], [x - w / 2, y, z + h / 2]]
    : [[x, y - w / 2, z - h / 2], [x, y + w / 2, z - h / 2], [x, y + w / 2, z + h / 2], [x, y - w / 2, z + h / 2]];
  face(ctx, pts, o.board || SIGN.board, { lw: o.edge ?? 0.04 });
  if (!text) return;
  lettering(ctx, along, x, y, z, (o.arrow ? o.arrow + ' ' : '') + text, o.size || h * 0.5, o.ink || SIGN.ink, o.font || 'Rethink Sans');
}
// A sign hung from the ceiling (there isn't one: on two thin rods up into the
// air) or on a post, at (x, y), its board's middle at z. o: sign()'s, plus
// post: true (on a post from the floor, not hung)
export function hangSign(ctx, along, x, y, z, w, h, text, o = {}) {
  const ends = [-w / 2 + 0.15, w / 2 - 0.15];
  for (const e of ends) {
    const [px, py] = along === 'x' ? [x + e, y] : [x, y + e];
    if (o.post) box(ctx, px - 0.04, py - 0.04, 0, 0.08, 0.08, z, C.ink, { flat: true, stroke: false });
    else box(ctx, px - 0.02, py - 0.02, z + h / 2, 0.04, 0.04, 1.2, C.ink, { flat: true, stroke: false });
  }
  sign(ctx, along, x, y, z, w, h, text, o);
}

// ---------- Outside: the night and the snow ----------
// The night's veil over an area's outdoor ground (boxes [x0, y0, x1, y1] in
// the area's units): a still layer laid on at the night's strength (cheap:
// one stamp). Put it after the ground, its paint and snowCover, so the snow
// goes blue at night too (the floodlights' glows brighten it again).
export function nightGround(R, rects, k = 0.42) {
  // (In twelve steps, so it bakes into the area's cached floor: a fade alone
  // kept everything flat drawn after it out of the cache.)
  R.rug((ctx) => { for (const [x0, y0, x1, y1] of rects) rect(ctx, x0, y0, x1 - x0, y1 - y0, 0.004, alpha(C.night, k), { stroke: false }); }, { fade: (t) => nightK(t), step: (t) => Math.round(nightK(t) * 12) });
}
// The snow lying on outdoor ground (boxes [x0, y0, x1, y1]): white, drifted
// against the edges and thinner in the middle, laid on as it settles (still,
// stamped at its strength). clear: boxes kept clear (a road the plows keep
// open), drawn as tracks rather than white. Put it before nightGround: it
// goes under nightGround, which tints it blue after dark.
export function snowCover(R, rects, o = {}) {
  R.rug((ctx) => {
    for (const [x0, y0, x1, y1] of rects) {
      rect(ctx, x0, y0, x1 - x0, y1 - y0, 0.006, alpha(INK.snow, 0.72), { stroke: false });
      // Drifts: a band of brighter snow along the back edges, and soft lumps.
      rect(ctx, x0, y0, x1 - x0, Math.min(0.8, y1 - y0), 0.007, alpha(C.white, 0.6), { stroke: false });
      rect(ctx, x0, y0, Math.min(0.8, x1 - x0), y1 - y0, 0.007, alpha(C.white, 0.6), { stroke: false });
      if (!Q.detail) continue;
      let r = Math.round(x0 * 31 + y0 * 17) + 7;
      const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
      const n = Math.round(((x1 - x0) * (y1 - y0)) / 6);
      for (let i = 0; i < n; i++) {
        const cx = x0 + rnd() * (x1 - x0), cy = y0 + rnd() * (y1 - y0), rr = 0.3 + rnd() * 0.6;
        rect(ctx, cx - rr, cy - rr * 0.6, rr * 2, rr * 1.2, 0.008, alpha(C.white, 0.35), { stroke: false });
      }
    }
    for (const [x0, y0, x1, y1] of o.clear || []) rect(ctx, x0, y0, x1 - x0, y1 - y0, 0.009, alpha(INK.tarmac, 0.55), { stroke: false });
  }, { fade: (t) => settle(t), step: (t) => Math.round(settle(t) * 12) });
}
// Snow on top of a still thing (a box's top), the same way: a cap that
// shows as it settles. For a moving thing, draw it with snowK yourself.
export function snowCap(R, x, y, z, w, d, o = {}) {
  R.thing(x + w, y + d, (ctx) => rect(ctx, x - 0.04, y - 0.04, w + 0.08, d + 0.08, z + 0.02, alpha(C.white, 0.92), { lw: 0.02 }), { fade: (t) => settle(t), depth: o.depth ?? x + w + y + d + 0.01 });
}
// A big still thing printed twice: in its day inks, and in dusk inks after
// dark (lights lit in the night one). draw(ctx, ink, night): ink(color)
// gives the color to print with. o: { on, depth }
export function printed(R, x, y, draw, o = {}) {
  const on = o.on || (() => true), depth = o.depth != null ? { depth: o.depth } : {};
  R.thing(x, y, (ctx) => draw(ctx, (c) => c, false), { on: (t) => on(t) && !nightPrint(t), ...depth });
  R.thing(x, y, (ctx) => draw(ctx, dusk, true), { on: (t) => on(t) && nightPrint(t), ...depth });
}
// A glow that comes on with the dark, at (x, y, z), r across.
export function nightGlow(R, x, y, z, r = 2.5, color = LIT, k = 1) {
  R.light({ at: [x, y, z], r, color, k: (t) => nightK(t) * k });
}
// A floodlight mast on the apron or by the road: a tall pole and a bank of
// lamps, lit after dark (its glow is a light, so add nightGlow over it).
export function mast(ctx, x, y, z = 0, h = 7, lit = false) {
  box(ctx, x - 0.1, y - 0.1, z, 0.2, 0.2, h, C.grey, { flat: true, lw: 0.03 });
  box(ctx, x - 0.45, y - 0.2, z + h, 0.9, 0.4, 0.35, lit ? LIT : C.greyLight, { flat: true, lw: 0.03 });
}

export { lightsOn, nightK, settle, dusk, nightPrint, LIT };
