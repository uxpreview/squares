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
import { C, Q, P, LW, SKIN, box, face, rect, paint, alpha, tint, shade, mix, person, folk, paintText, label, glow } from '../../engine/art.js';
import { ZK } from '../../engine/iso.js';
import { INK, LIVERY, RAMP, BAGS, SIGN, LIT, WALL, GLASS, FRAME, dusk, nightPrint } from './style.js';
import { PLANE, AIR } from './plan.js';
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
  // Each piece's spot (where it sorts), and how far it reaches ([u0, u1, v0,
  // v1] in the plane's frame), so plane() can keep it out of a chunk seam.
  const part = (u, v, draw, [u0, u1, v0, v1]) => {
    const [px, py] = F.at(u, v), a = F.at(u0, v0), b = F.at(u1, v1);
    parts.push({ x: px, y: py, draw, reach: [Math.max(a[0], b[0]), Math.max(a[1], b[1])] });
  };

  // The gear, under everything else (its shadow is planeShadow, on the
  // ground).
  part(-4.6, 0, (ctx) => {
    if (o.gear === false || air > 1.5) return;
    for (const [u, v] of [[-1.7, 0], [-7.4, -1.1], [-7.4, 1.1]]) {
      F.lbox(ctx, u - 0.05, u + 0.05, v - 0.04, v + 0.04, 0.15, HC - R0 - 0.1, C.grey, { flat: true, lw: 0.015 });
      F.lbox(ctx, u - 0.17, u + 0.17, v - 0.1, v + 0.1, 0, 0.32, C.ink, { flat: true, lw: 0.015 });
    }
  }, [-7.6, -1.5, -1.2, 1.2]);

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
  part(-7.6, -PLANE.span / 4, (ctx) => { engine(-1)(ctx); wing(-1)(ctx); }, [-9.6, -4.3, -PLANE.span / 2, -R0 * 0.7]);
  part(-12.6, -1.6, stab(-1), [-13, -11.1, -3.1, -R0 * 0.3]);

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
    }, [u1, u0, -R0, R0 + (u0 > -4.4 && u1 < -3.2 ? 0.95 : 0)]);
  }
  // The near side, then the fin on top.
  part(-7.4, PLANE.span / 4, (ctx) => { engine(1)(ctx); wing(1)(ctx); }, [-9.6, -4.3, R0 * 0.7, PLANE.span / 2]);
  part(-12.4, 1.6, stab(1), [-13, -11.1, R0 * 0.3, 3.1]);
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
  }, [-13.2, -9.7, -0.09, 0.2]);
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
    for (const p of parts) R.thing(...seamSafe(p.x, p.y, ...p.reach), p.draw, { on: (t) => on(t) && nightPrint(t) === night });
  }
}
// Where to stand something wide or tall that reaches from its spot (x, y)
// to (x1, y1) at its front: in the area's last 16-unit chunk it reaches
// into, just past the seam, so the chunk drawn after its own doesn't paint
// over the part that reaches across (an area this big is drawn in chunks,
// each after the ones behind it and to its left). Its spot otherwise.
export function seamSafe(x, y, x1 = x, y1 = y) {
  const S = 16, past = (a, b) => (Math.floor(b / S) > Math.floor(a / S) ? Math.floor(b / S) * S + 0.05 : a);
  return [past(x, x1), past(y, y1)];
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
    person(ctx, px, py, z + 0.25, { ...(o.driver || look(41, 'ramp', { hat: 'beanie' })), pose: o.asleep ? 'sit' : 'sit', dir: (along === 'x' ? dir > 0 : dir < 0) ? 'r' : 'l', scale: 0.82, ...(o.asleep ? { arms: [0.2, -0.2] } : {}) }, o.asleep ? 0 : t);
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
// matching sweatshirt), 'ramp' (safety orange with the reflective bands,
// half of them in ear defenders), 'tsa' (navy, a grey shirt), 'agent' (the
// gate's navy with a cranberry scarf color), 'pilot' (white shirt, navy, a
// cap), 'trooper' (navy, a cap), 'band' (the Marching Ducks' cranberry),
// 'crew' (the fire and plow crews' yellow, with the same bands).
const PARKA = [C.navy, C.ink, INK.cranberry, C.teal, C.red, C.grey, C.purple, C.green, C.mustard, C.coral, C.black, tint(C.sky, 0.1)];
export function look(seed, kind = 'traveler', extra = {}) {
  const base = folk(seed);
  const r = ((seed * 7919) % 97) / 97;
  switch (kind) {
    case 'ramp': return { ...base, top: INK.safety, bottom: C.navy, hat: r < 0.6 ? 'beanie' : 'helmet', dress: false, wear: hiVis, ...(seed % 2 ? { face: muffs } : {}), ...extra };
    case 'tsa': return { ...base, top: shade(C.grey, 0.15), bottom: C.navy, dress: false, ...extra };
    case 'agent': return { ...base, top: C.navy, bottom: C.navy, ...extra };
    case 'pilot': return { ...base, top: C.white, bottom: C.navy, hat: 'cap', dress: false, ...extra };
    case 'trooper': return { ...base, top: shade(C.grey, 0.3), bottom: C.navy, hat: 'cap', dress: false, ...extra };
    case 'band': return { ...base, top: INK.cranberry, bottom: C.white, hat: 'cap', dress: false, ...extra };
    case 'crew': return { ...base, top: INK.signal, bottom: C.ink, hat: 'helmet', dress: false, wear: hiVis, ...extra };
    // (A traveler's beanie in a color of its own, never the parka's.)
    default: return { ...base, top: PARKA[seed % PARKA.length], hat: r < 0.35 ? 'beanie' : base.hat, hatColor: PARKA[(seed * 7 + 3) % PARKA.length], ...extra };
  }
}
// ---------- What the crews wear ----------
// One hi-vis for the whole airport (person()'s wear): two reflective bands
// round the jacket, on the ramp's orange and the crews' yellow alike.
export function hiVis(ctx, b) {
  if (!Q.detail || b.dress) return;
  ctx.fillStyle = C.greyLight;
  for (const k of [0.22, 0.5]) ctx.fillRect(-0.28, b.hipY - k - 0.035, 0.56, 0.07);
}
// A hi-vis vest over a shirt (a supervisor's, a snowman's): the vest, open
// down the front, and the same bands. As a wear: vest() or vest(color).
export const vest = (color = INK.safety) => (ctx, b) => {
  ctx.beginPath();
  ctx.roundRect(-0.29, b.top + 0.08, 0.58, b.hipY - b.top - 0.02, 0.14);
  ctx.fillStyle = color; ctx.fill();
  if (!b.back) { ctx.fillStyle = C.white; ctx.fillRect(-0.06, b.top + 0.08, 0.12, 0.42); }
  hiVis(ctx, b);
};
// Ear defenders (person()'s face): a band over the head, red cups.
export function muffs(ctx, hy, back) {
  ctx.beginPath(); ctx.arc(0.02, hy - 0.02, 0.36, Math.PI * 1.1, Math.PI * 1.9);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.07; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(back ? 0.02 : -0.07, hy + 0.04, 0.12, 0.15, 0, 0, Math.PI * 2);
  paint(ctx, C.red, { lw: 0.03 });
}
// A marshaller's wands, lit orange, out from the hands along the arms (the
// same arms as person()'s: [near, far]), for someone standing at (x, y, z).
export function wands(ctx, x, y, z, dir, [aA, aB], lit, s = 1) {
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

// ---------- The man in the inflatable turkey ----------
// One man, all day, on his way to the parade (the brief's crowd): off the
// first Silver Line at the curb before five, in the check-in queue right
// behind the goose from eight, through security at ten, at the gates from
// noon, and asleep there from half past seven (turkeyAsleep). Each area
// draws him only in its own hours (TURKEY), so there's only ever one of him.
// A fan of tail feathers behind, a body like a beach ball, the turkey's own
// head up on a neck over his, yellow turkey legs.
export const TURKEY = { curb: [4, 8], checkIn: [8, 10], security: [10, 11.5], gates: [12, 19.5] };
const TURKEY_LOOK = {
  ...folk(77), top: C.brown, bottom: C.mustard, hat: 'none', style: 'short', dress: false,
  wear: (ctx, b) => {
    ctx.beginPath(); ctx.ellipse(0.02, b.hipY - 0.36, 0.56, 0.6, 0, 0, Math.PI * 2);
    paint(ctx, C.brown, { lw: 0.04, dots: Q.detail ? shade(C.brown, 0.4) : null, density: 0.18 });
    if (b.back) return;
    ctx.beginPath(); ctx.ellipse(0.2, b.hipY - 0.3, 0.22, 0.34, 0, 0, Math.PI * 2); paint(ctx, C.woodLight, { lw: 0.03 });
    ctx.beginPath(); ctx.ellipse(-0.24, b.hipY - 0.42, 0.24, 0.16, 0.5, 0, Math.PI * 2); paint(ctx, shade(C.brown, 0.18), { lw: 0.025 });
  },
  face: (ctx, hy, back) => {
    // The turkey's own head and wattle, up on a neck over his.
    const nx = back ? -0.05 : 0.1;
    ctx.beginPath(); ctx.moveTo(nx, hy - 0.2); ctx.quadraticCurveTo(nx + 0.2, hy - 0.6, nx + 0.15, hy - 0.85);
    ctx.lineCap = 'round';
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.17; ctx.stroke(); ctx.strokeStyle = tint(C.brown, 0.3); ctx.lineWidth = 0.1; ctx.stroke();
    ctx.beginPath(); ctx.arc(nx + 0.17, hy - 0.9, 0.12, 0, Math.PI * 2); paint(ctx, tint(C.brown, 0.3), { lw: 0.025 });
    if (back) return;
    ctx.beginPath(); ctx.moveTo(nx + 0.26, hy - 0.92); ctx.lineTo(nx + 0.4, hy - 0.88); ctx.lineTo(nx + 0.26, hy - 0.84); ctx.closePath(); paint(ctx, C.mustard, { lw: 0.015 });
    ctx.beginPath(); ctx.ellipse(nx + 0.28, hy - 0.78, 0.04, 0.09, 0, 0, Math.PI * 2); paint(ctx, C.red, { lw: 0.015 });
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(nx + 0.2, hy - 0.93, 0.022, 0, Math.PI * 2); ctx.fill();
  },
};
// Him at (x, y, z). o: { pose, dir, back, arms, scale, bob } (t for the walk)
export function turkeyMan(ctx, x, y, z, o = {}, t = 0) {
  const s = o.scale || 1, f = o.dir === 'l' ? -1 : 1;
  const fan = () => {
    const [X, Y] = P(x, y, z);
    const cx = X - f * (o.back ? -0.1 : 0.28) * s, cy = Y - (1.38 + (o.bob || 0)) * s;
    const cols = [C.brown, C.mustard, C.coral, INK.cranberry, C.coral, C.mustard, C.brown];
    for (let i = 0; i < cols.length; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.3;
      ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * 0.62 * s, cy + Math.sin(a) * 0.62 * s, 0.15 * s, 0.42 * s, a + Math.PI / 2, 0, Math.PI * 2);
      paint(ctx, cols[i], { lw: 0.03 });
    }
  };
  if (!o.back) fan();
  person(ctx, x, y, z + (o.bob || 0), { ...TURKEY_LOOK, pose: o.pose || 'stand', dir: o.dir || 'r', back: !!o.back, scale: s, ...(o.arms ? { arms: o.arms } : { arms: [0.45, 0.35] }), speed: 6 }, t);
  if (o.back) fan();
}

// Him asleep at the gates after the ground stop, on the floor along x (feet
// at x, y; lieAlong's): the suit let down and pulled over him like a
// blanket, its fan of feathers spread on the floor past his feet, the
// turkey's head flopped beyond his.
export function turkeyAsleep(ctx, x, y, z = 0) {
  const cols = [C.brown, C.mustard, C.coral, INK.cranberry, C.coral, C.mustard, C.brown];
  for (let i = 0; i < cols.length; i++) {
    const a = -0.95 + i * 0.32, cx = x + 0.3 + Math.cos(a) * 0.55, cy = y + Math.sin(a) * 0.55;
    const pts = [];
    for (let k = 0; k < 10; k++) {
      const b = (k / 10) * Math.PI * 2, u = Math.cos(b) * 0.4, v = Math.sin(b) * 0.13;
      pts.push([cx + u * Math.cos(a) - v * Math.sin(a), cy + u * Math.sin(a) + v * Math.cos(a), z + 0.01]);
    }
    face(ctx, pts, cols[i], { lw: 0.025 });
  }
  lieAlong(ctx, x, y, z, asleep({ ...TURKEY_LOOK, wear: coatOver(C.brown) }), 0);
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
// Words on an upright plane: along 'x' (the plane y = y, facing the lower
// left) or 'y' (the plane x = x, the lower right), their middle at (x, y, z).
// o: { font (Rethink Sans), weight (bold for Rethink Sans), align }
export function words(ctx, along, x, y, z, text, size, color = C.ink, o = {}) {
  if (!Q.detail) return;
  ctx.save();
  ctx.transform(1, along === 'x' ? 0.5 : -0.5, 0, ZK, x - y, (x + y) / 2 - z * ZK);
  const k = 40;
  ctx.scale(1 / k, 1 / k);
  const font = o.font || 'Rethink Sans';
  ctx.font = `${o.weight || (font === 'Rethink Sans' ? 700 : 400)} ${size * k}px "${font}", system-ui, sans-serif`;
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
// The same in the regular weight (the signs' and boards' lettering).
export function lettering(ctx, along, x, y, z, text, size, ink = C.ink, font = 'Rethink Sans') {
  words(ctx, along, x, y, z, text, size, ink, { font, weight: 400 });
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
// A board with lines of lettering on it, upright, along 'x' or 'y' as sign(),
// centred on (x, y, z), w wide and h tall. lines: [text, size, ink?, font?],
// top to bottom, set close round the middle (o.gap: the line spacing, 1.2
// sizes) or spread down the board (o.even). o: { board, ink, font, edge }
export function board(ctx, along, x, y, z, w, h, lines, o = {}) {
  sign(ctx, along, x, y, z, w, h, null, { board: o.board || SIGN.board, edge: o.edge ?? 0.035 });
  if (!Q.detail) return;
  if (o.even) {
    const gap = h / (lines.length + 0.4);
    lines.forEach(([text, size, ink, font], i) => lettering(ctx, along, x, y, z + h / 2 - gap * (i + 0.7), text, size, ink || o.ink || SIGN.ink, font || o.font || 'Rethink Sans'));
    return;
  }
  const gap = o.gap || 1.2;
  let v = z + lines.reduce((s, l) => s + l[1] * gap, 0) / 2;
  for (const [text, size, ink, font] of lines) {
    v -= (size * gap) / 2;
    lettering(ctx, along, x, y, v - size * 0.04, text, size, ink || o.ink || SIGN.ink, font || o.font || 'Rethink Sans');
    v -= (size * gap) / 2;
  }
}

// ---------- Long things, in pieces ----------
// An area this big is drawn in 16-unit chunks, each after the ones behind it
// and to its left; a long still thing (a counter, a belt, a row of seats, a
// barrier) goes in short pieces that never cross a chunk's seam, so each
// sorts on its own, nobody beside it is painted over, and no chunk paints
// over a piece of it. spans(a, b, step): [a, b] in pieces at most step long,
// cut at the seams.
export function spans(a, b, step = 3) {
  const cuts = [a];
  for (let s = (Math.floor(a / 16) + 1) * 16; s < b - 1e-6; s += 16) if (s > a + 1e-6) cuts.push(s);
  cuts.push(b);
  const out = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const p = cuts[i], q = cuts[i + 1], n = Math.max(1, Math.ceil((q - p) / step - 1e-6));
    for (let k = 0; k < n; k++) out.push([p + ((q - p) * k) / n, p + ((q - p) * (k + 1)) / n]);
  }
  return out;
}
// A long still thing as pieces (spans of o.step, 1), each its own thing sorted
// at its front corner (or its back one, o.back: a belt things ride on), so
// people beside it sort right. draw(ctx, u0, u1, first, last) draws the piece
// from u0 to u1 along x or y, across c0..c1. o: { step, back, bias, on }
export function pieces(R, along, a, b, c0, c1, draw, o = {}) {
  const list = spans(a, b, o.step || 1);
  list.forEach(([u0, u1], i) => {
    const depth = (o.back ? u0 + c0 : u1 + c1) + (o.bias || 0);
    const x = along === 'x' ? (u0 + u1) / 2 : (c0 + c1) / 2, y = along === 'x' ? (c0 + c1) / 2 : (u0 + u1) / 2;
    R.thing(x, y, (ctx) => draw(ctx, u0, u1, i === 0, i === list.length - 1), { depth, ...(o.on ? { on: o.on } : {}) });
  });
}
// Edges of a solid, inked.
function inkEdges(ctx, edges, lw = 0.04) {
  if (!Q.lines) return;
  ctx.beginPath();
  for (const [a, b] of edges) { const [ax, ay] = P(...a), [bx, by] = P(...b); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();
}
// One piece of a long box, from u0 to u1 along x (y0..y1 deep, z0 up h),
// drawn so the seams with its neighbors aren't inked. o: { a / b: its start
// or end is a real end; front, top, side: colors; dots, lw }
export function barX(ctx, u0, u1, y0, y1, z0, h, col, o = {}) {
  const z1 = z0 + h;
  face(ctx, [[u0, y1, z0], [u1, y1, z0], [u1, y1, z1], [u0, y1, z1]], o.front || shade(col, 0.22), { stroke: false, dots: o.dots ? shade(col, 0.55) : null, density: 0.2 });
  face(ctx, [[u0, y0, z1], [u1, y0, z1], [u1, y1, z1], [u0, y1, z1]], o.top || col, { stroke: false });
  if (o.b) face(ctx, [[u1, y0, z0], [u1, y1, z0], [u1, y1, z1], [u1, y0, z1]], o.side || shade(col, 0.1), { stroke: false });
  const e = [[[u0, y0, z1], [u1, y0, z1]], [[u0, y1, z1], [u1, y1, z1]], [[u0, y1, z0], [u1, y1, z0]]];
  if (o.a) e.push([[u0, y1, z0], [u0, y1, z1]], [[u0, y0, z1], [u0, y1, z1]]);
  if (o.b) e.push([[u1, y0, z0], [u1, y0, z1]], [[u1, y1, z0], [u1, y1, z1]], [[u1, y0, z0], [u1, y1, z0]], [[u1, y0, z1], [u1, y1, z1]]);
  inkEdges(ctx, e, o.lw);
}
// The same along y (x0..x1 wide).
export function barY(ctx, u0, u1, x0, x1, z0, h, col, o = {}) {
  const z1 = z0 + h;
  face(ctx, [[x1, u0, z0], [x1, u1, z0], [x1, u1, z1], [x1, u0, z1]], o.front || shade(col, 0.1), { stroke: false, dots: o.dots ? shade(col, 0.5) : null, density: 0.16 });
  face(ctx, [[x0, u0, z1], [x1, u0, z1], [x1, u1, z1], [x0, u1, z1]], o.top || col, { stroke: false });
  if (o.b) face(ctx, [[x0, u1, z0], [x1, u1, z0], [x1, u1, z1], [x0, u1, z1]], o.side || shade(col, 0.22), { stroke: false });
  const e = [[[x0, u0, z1], [x0, u1, z1]], [[x1, u0, z1], [x1, u1, z1]], [[x1, u0, z0], [x1, u1, z0]]];
  if (o.a) e.push([[x1, u0, z0], [x1, u0, z1]], [[x0, u0, z1], [x1, u0, z1]]);
  if (o.b) e.push([[x0, u1, z0], [x0, u1, z1]], [[x1, u1, z0], [x1, u1, z1]], [[x0, u1, z0], [x1, u1, z0]], [[x0, u1, z1], [x1, u1, z1]]);
  inkEdges(ctx, e, o.lw);
}

// ---------- The terminal's walls ----------
// Roof off and walls low (decision 16), and one terminal from end to end:
// check-in, security and the gates share these. The landside wall along the
// curb, from x0 to x1 with its face at y + d: cream, a cranberry band, and
// any words painted on it (o.words: [[x, z, text, size, ink, font], ...]).
// o: { d (0.4), h (1.1), color }
export function lowWall(R, x0, x1, y, o = {}) {
  const d = o.d ?? 0.4, h = o.h ?? 1.1, color = o.color || WALL, list = o.words || [];
  for (const [a, b] of spans(x0, x1, 3)) {
    // (Sorted at its front left corner: anyone standing in front of it is
    // drawn after it.)
    R.thing(a + 0.05, y + d, (ctx) => {
      box(ctx, a, y, 0, b - a, d, h, color, { lw: 0.035, top: tint(color, 0.4), flat: true });
      face(ctx, [[a, y + d + 0.005, 0.5], [b, y + d + 0.005, 0.5], [b, y + d + 0.005, 0.62], [a, y + d + 0.005, 0.62]], INK.cranberry, { stroke: false });
      if (!Q.detail || !list.length) return;
      ctx.save();
      const pts = [[a, y + d, 0], [b, y + d, 0], [b, y + d, h], [a, y + d, h]].map((q) => P(...q));
      ctx.beginPath(); pts.forEach(([X, Y], i) => (i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y))); ctx.closePath(); ctx.clip();
      for (const [x, z, text, size, ink, font] of list) words(ctx, 'x', x, y + d + 0.01, z, text, size, ink, { font });
      ctx.restore();
    });
  }
}
// The airside glass from x0 to x1, its face at y (the sill behind it): a low
// sill, a band of glass with a glint, a rail along the top, mullions.
export function glassWall(R, x0, x1, y = AIR) {
  for (const [a, b] of spans(x0, x1, 2)) {
    // (Sorted at its front right corner: everyone inside is drawn before it.)
    R.thing(b - 0.05, y, (ctx) => {
      box(ctx, a, y - 0.4, 0, b - a, 0.4, 0.3, tint(INK.concrete, 0.2), { lw: 0.03, flat: true });
      face(ctx, [[a, y - 0.05, 0.3], [b, y - 0.05, 0.3], [b, y - 0.05, 1.1], [a, y - 0.05, 1.1]], GLASS, { stroke: false });
      if (Q.detail) {
        const m = a + (b - a) * 0.3;
        face(ctx, [[m, y - 0.04, 0.4], [m + 0.25, y - 0.04, 0.4], [m + 0.55, y - 0.04, 1.0], [m + 0.3, y - 0.04, 1.0]], alpha(C.white, 0.35), { stroke: false });
      }
      box(ctx, a, y - 0.3, 1.08, b - a, 0.25, 0.06, FRAME, { flat: true, lw: 0.025 });
      box(ctx, a, y - 0.3, 0.3, 0.06, 0.25, 0.8, FRAME, { flat: true, lw: 0.02 });
      box(ctx, b - 0.06, y - 0.3, 0.3, 0.06, 0.25, 0.8, FRAME, { flat: true, lw: 0.02 });
    });
  }
}

// ---------- Small things people do ----------
// Something held in the hand at the end of the near arm, raised a (as
// person()'s arms[0]): a hold is drawn from the chest, so this moves it out
// to the hand; o.turn turns it down the arm (a mallet, a scanner).
export const inHand = (a, draw, o = {}) => (ctx, t) => {
  ctx.save();
  ctx.translate(-0.13 + Math.sin(a) * 0.72, -0.3 + Math.cos(a) * 0.72);
  if (o.turn) ctx.rotate(-a);
  draw(ctx, t);
  ctx.restore();
};
// Eyes shut, over the open ones person() draws: a face, for someone of skin
// (their look's skin). shut(skin) is the face; shutEyes draws it in one.
export function shutEyes(ctx, hy, skin = SKIN[0]) {
  if (!Q.detail) return;
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(0.1, hy + 0.02, 0.05, 0, Math.PI * 2); ctx.arc(0.24, hy + 0.02, 0.05, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03;
  ctx.beginPath(); ctx.moveTo(0.06, hy + 0.03); ctx.lineTo(0.14, hy + 0.03); ctx.moveTo(0.2, hy + 0.03); ctx.lineTo(0.28, hy + 0.03); ctx.stroke();
}
export const shut = (skin) => (ctx, hy, back) => { if (!back) shutEyes(ctx, hy, skin); };
// A look, asleep: its eyes shut, then its own face (ear defenders, a veil)
// and any more faces given (a band hat).
export const asleep = (lk, ...faces) => ({
  ...lk,
  face: (ctx, hy, back, t) => {
    if (!back) shutEyes(ctx, hy, lk.skin);
    if (lk.face) lk.face(ctx, hy, back, t);
    for (const f of faces) f(ctx, hy, back, t);
  },
});
// Z's rising off a sleeper whose head is at (x, y, z).
export function zzz(ctx, x, y, z, t, off = 0) {
  if (!Q.detail) return;
  const k = ((t * 0.6 + off) % 1 + 1) % 1;
  label(ctx, x - 0.3 * k, y - 0.3 * k, z + k * 1.1, 'z', 0.42 + k * 0.3, alpha(C.ink, 1 - k));
}
// Someone lying down on a seat, a bag or the floor at height z: the engine's
// 'lie', turned to run along the floor, feet at (x, y) and the head about
// 1.8 away. o: { along ('x' or 'y'), head (-1: toward the axis's minus end,
// the default; 1: its plus end), pose ('lie', or 'sleep' for the z's), arms }
export function lieAlong(ctx, x, y, z, lk, t = 0, o = {}) {
  const [X, Y] = P(x, y, z), X_ = (o.along || 'x') === 'x', back = (o.head || -1) < 0;
  ctx.save();
  ctx.translate(X, Y); ctx.rotate(Math.atan2(0.5, 1) * (X_ ? 1 : -1)); ctx.translate(-X, -Y);
  person(ctx, x, y, z, { ...lk, pose: o.pose || 'lie', dir: X_ === back ? 'r' : 'l', ...(o.arms ? { arms: o.arms } : {}) }, t);
  ctx.restore();
}
// A coat (or a blanket) over someone lying down, over the legs and hips: a
// person's wear.
export const coatOver = (color) => (ctx, b) => {
  ctx.beginPath();
  ctx.roundRect(-0.36, b.hipY - 0.45, 0.72, 1.3, 0.16);
  paint(ctx, color, { lw: 0.04, dots: Q.detail ? shade(color, 0.45) : null, density: 0.15 });
};

// ---------- Gulls ----------
// The one herring gull everyone draws (on the curb's lamppost, on a wing at
// C13, all over the runway): white, a grey back, black wingtips with white
// spots, a yellow bill with its red spot, pink legs, a pale eye under a flat
// brow. Unimpressed. About 0.7 tall standing, two thirds of the goose, on
// (x, y, z). o: { dir ('r' or 'l'), fly (wings out, flapping), peck (head
// down), look (turns its head now and then), pass (a boarding pass in its
// bill: flying standby), phase, s (its size, 1) }
export function gull(ctx, x, y, z, t, o = {}) {
  const [X, Y] = P(x, y, z);
  const f = o.dir === 'l' ? -1 : 1, s = 0.82 * (o.s || 1), ph = o.phase || 0;
  ctx.save();
  ctx.translate(X, Y); ctx.scale(f * s, s);
  if (o.fly) {
    // In the air: its shadow on the ground under it, then the far wing, the
    // body and head, the near wing.
    if (Q.detail) { ctx.beginPath(); ctx.ellipse(0, (z * ZK) / s, 0.3, 0.11, 0, 0, Math.PI * 2); ctx.fillStyle = alpha(C.ink, 0.12); ctx.fill(); }
    const fl = Math.sin(t * 12 + ph) * 0.33;
    const wing = (dy, near) => {
      ctx.beginPath(); ctx.moveTo(-0.08, -0.15); ctx.quadraticCurveTo(-0.22, -0.45 - dy, -0.54, -0.33 - dy * 1.6); ctx.lineTo(-0.15, -0.1); ctx.closePath();
      paint(ctx, near ? C.greyLight : shade(C.greyLight, 0.12), { lw: 0.035 });
      ctx.beginPath(); ctx.moveTo(-0.42, -0.31 - dy * 1.3); ctx.lineTo(-0.54, -0.33 - dy * 1.6); ctx.lineTo(-0.38, -0.25 - dy * 1.1); ctx.closePath(); ctx.fillStyle = C.black; ctx.fill();
    };
    ctx.save(); ctx.scale(1, -1); ctx.translate(0, 0.24); wing(-fl * 0.7, false); ctx.restore();
    ctx.beginPath(); ctx.ellipse(0, -0.12, 0.3, 0.1, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.04 });
    ctx.beginPath(); ctx.arc(0.27, -0.16, 0.085, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.035 });
    ctx.beginPath(); ctx.moveTo(0.33, -0.18); ctx.lineTo(0.47, -0.15); ctx.lineTo(0.33, -0.13); ctx.closePath(); ctx.fillStyle = C.mustard; ctx.fill();
    wing(fl, true);
    ctx.restore();
    return;
  }
  if (Q.detail) { ctx.beginPath(); ctx.ellipse(0, 0, 0.3, 0.1, 0, 0, Math.PI * 2); ctx.fillStyle = alpha(C.ink, 0.15); ctx.fill(); }
  ctx.strokeStyle = C.pink; ctx.lineWidth = 0.06; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-0.06, -0.3); ctx.lineTo(-0.08, 0); ctx.moveTo(0.07, -0.3); ctx.lineTo(0.08, 0); ctx.stroke();
  // The body, and the folded wing over it: grey, its black tip past the tail
  // with white spots.
  ctx.beginPath(); ctx.ellipse(0, -0.44, 0.36, 0.2, -0.08, 0, Math.PI * 2);
  paint(ctx, C.white, { lw: 0.04 });
  ctx.beginPath();
  ctx.moveTo(0.22, -0.56); ctx.quadraticCurveTo(-0.1, -0.66, -0.36, -0.5); ctx.lineTo(-0.6, -0.5); ctx.lineTo(-0.36, -0.36); ctx.quadraticCurveTo(-0.05, -0.32, 0.22, -0.42); ctx.closePath();
  paint(ctx, C.grey, { lw: 0.035 });
  ctx.beginPath(); ctx.moveTo(-0.3, -0.52); ctx.lineTo(-0.6, -0.5); ctx.lineTo(-0.34, -0.4); ctx.closePath(); paint(ctx, C.black, { lw: 0.03 });
  if (Q.detail) { ctx.fillStyle = C.white; for (const sx of [-0.42, -0.5]) { ctx.beginPath(); ctx.arc(sx, -0.48, 0.022, 0, Math.PI * 2); ctx.fill(); } }
  // The head (down, pecking; or turned the other way now and then).
  if (o.look && Math.sin(t * 0.45 + ph) + Math.sin(t * 1.3 + ph) * 0.3 > 0.55) ctx.scale(-1, 1);
  if (o.peck) ctx.translate(0.1, 0.2);
  ctx.beginPath(); ctx.arc(0.27, -0.68, 0.14, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.035 });
  ctx.beginPath(); ctx.moveTo(0.38, -0.7); ctx.lineTo(0.62, -0.69); ctx.quadraticCurveTo(0.6, -0.62, 0.52, -0.63); ctx.lineTo(0.38, -0.63); ctx.closePath(); paint(ctx, C.mustard, { lw: 0.025 });
  if (Q.detail) {
    ctx.beginPath(); ctx.arc(0.53, -0.64, 0.022, 0, Math.PI * 2); ctx.fillStyle = C.red; ctx.fill();
    ctx.beginPath(); ctx.arc(0.31, -0.71, 0.035, 0, Math.PI * 2); ctx.fillStyle = C.butter; ctx.fill();
    ctx.beginPath(); ctx.arc(0.315, -0.705, 0.016, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0.26, -0.735); ctx.lineTo(0.37, -0.735); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.stroke();
    if (o.pass) {
      ctx.beginPath(); ctx.rect(0.55, -0.71, 0.22, 0.13); paint(ctx, C.white, { lw: 0.018 });
      ctx.fillStyle = C.red; ctx.fillRect(0.55, -0.71, 0.05, 0.13);
    }
  }
  ctx.restore();
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
