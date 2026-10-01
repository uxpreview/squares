// Cars shared between places (Moving Day drew them first; Plum Island's were
// plain boxes): a sedan with wheels in arches, doors, lights on the end you
// see, a raked windscreen and glass you can see into, whoever's in it sitting
// inside it.
import { C, Q, box, face, paint, alpha, shade, tint, mix } from '../engine/art.js';
import { ZK } from '../engine/iso.js';

const P3 = (x, y, z) => [x - y, (x + y) / 2 - z * ZK];

// A car along y or x (o.along: 'x'), 2.8 long and 1.5 wide unless o.L and
// o.W say otherwise (heights scale with its length): wheels in
// their arches, a body with lights on the end you see, doors, a cabin set
// back with sloped glass you can see into, and whoever's inside drawn in it
// (not on the roof). o: { along: 'x', dir: -1 (its front toward -y or -x),
// rack, ticket (a ticket under the wiper), riders: [{ front (the front
// seats), v (across, -0.4 to 0.4), skin, hair, top, lift }] }
export function sedan(ctx, x, y, z, color, o = {}) {
  const X = o.along === 'x', dir = o.dir || 1, L = o.L || 2.8, W = o.W || 1.5;
  // Everything below is drawn at Moving Day's size and scaled about the car's
  // middle, so a smaller car is the same car.
  const s = L / 2.8, sw = W / 1.5;
  if (!o.scaled && (s !== 1 || sw !== 1)) {
    ctx.save();
    const [X0, Y0] = P3(x, y, z);
    ctx.translate(X0, Y0);
    // (A uniform scale on screen: the iso view has no single axis to stretch.)
    ctx.scale(s, s);
    ctx.translate(-X0, -Y0);
    sedan(ctx, x, y, z, color, { ...o, L: 2.8, W: 1.5 * (sw / s), scaled: true });
    ctx.restore();
    return;
  }
  // Local (u along it, + toward its front; v across it) to the map's x, y.
  const at = (u, v) => (X ? [x + u * dir, y + v] : [x + v, y + u * dir]);
  const pt = (u, v, h) => [...at(u, v), z + h];
  const lface = (pts, col, op) => face(ctx, pts.map(([u, v, h]) => pt(u, v, h)), col, op);
  const lbox = (u0, u1, v0, v1, h0, h, col, op) => {
    const [ax, ay] = at(u0, v0), [bx, by] = at(u1, v1);
    box(ctx, Math.min(ax, bx), Math.min(ay, by), z + h0, Math.abs(bx - ax), Math.abs(by - ay), h, col, op);
  };
  // The side and the end you see: +x and +y in the map, whichever way it faces.
  const near = W / 2, endU = dir > 0 ? L / 2 : -L / 2;
  const glass = mix(tint(C.sky, 0.25), color, 0.12);
  // The cabin: its floor from cb0 to cb1, its roof from rf0 to rf1 (the
  // windscreen raked more than the back window).
  const cb0 = -0.95, cb1 = 0.55, rf0 = -0.78, rf1 = 0.22, cw = 0.63, h0 = 0.78, h1 = 1.3;
  if (!Q.detail) {
    lbox(-L / 2, L / 2, -W / 2, W / 2, 0.2, 0.6, color, { flat: true, lw: 0.045 });
    lbox(cb0, cb1, -cw, cw, h0, h1 - h0, glass, { flat: true, top: tint(color, 0.08), lw: 0.04 });
    return;
  }
  // Wheels under it, the far ones first.
  for (const u of [-0.9, 0.9]) for (const v of [-0.5, 0.5]) lbox(u - 0.27, u + 0.27, v - 0.12, v + 0.12, 0, 0.42, C.ink, { flat: true, lw: 0.02 });
  // The body, a darker sill, bumpers.
  lbox(-L / 2, L / 2, -W / 2, W / 2, 0.22, 0.56, color, { flat: true, lw: 0.045 });
  lface([[-L / 2, near, 0.22], [L / 2, near, 0.22], [L / 2, near, 0.33], [-L / 2, near, 0.33]], shade(color, 0.35), { stroke: false });
  for (const e of [-1, 1]) lbox(e * L / 2 - 0.07, e * L / 2 + 0.07, -W / 2 + 0.05, W / 2 - 0.05, 0.22, 0.16, shade(C.greyLight, 0.25), { flat: true, lw: 0.025 });
  // The wheels on the side you see: an arch, the tyre, the hub.
  const disk = (u, h, r, col, op) => { const pts = []; for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; pts.push([u + Math.cos(a) * r, near + 0.01, h + Math.sin(a) * r * 1.0]); } lface(pts, col, op); };
  for (const u of [-0.9, 0.9]) {
    const arch = []; for (let k = 0; k <= 8; k++) { const a = (k / 8) * Math.PI; arch.push([u + Math.cos(a) * 0.36, near + 0.005, 0.24 + Math.sin(a) * 0.3]); }
    lface(arch, shade(color, 0.55), { stroke: false });
    disk(u, 0.24, 0.24, C.ink, { lw: 0.02 });
    disk(u, 0.24, 0.1, C.greyLight, { lw: 0.015 });
  }
  // Two doors and their handles.
  for (const u of [-0.55, 0.15]) {
    ctx.save(); ctx.globalAlpha *= 0.55;
    lface([[u, near + 0.006, 0.34], [u + 0.012, near + 0.006, 0.34], [u + 0.012, near + 0.006, 0.76], [u, near + 0.006, 0.76]], shade(color, 0.5), { stroke: false });
    ctx.restore();
    lface([[u - 0.3, near + 0.008, 0.62], [u - 0.14, near + 0.008, 0.62], [u - 0.14, near + 0.008, 0.66], [u - 0.3, near + 0.008, 0.66]], shade(color, 0.45), { stroke: false });
  }
  // The lights on the end you see: headlights at the front, red at the back.
  const front = dir > 0;
  for (const v of [-0.48, 0.48]) {
    const lit = front ? tint(C.butter, 0.5) : C.red;
    lface([[endU, v - 0.16, 0.56], [endU, v + 0.16, 0.56], [endU, v + 0.16, 0.7], [endU, v - 0.16, 0.7]], lit, { lw: 0.02 });
  }
  lface([[endU, -0.2, 0.42], [endU, 0.2, 0.42], [endU, 0.2, 0.52], [endU, -0.2, 0.52]], C.white, { lw: 0.015 });
  // The cabin, from the inside out: its far side and floor dark, the seat
  // backs, whoever's in it, then the glass and the pillars, then the roof.
  const dark = mix(C.ink, color, 0.2);
  const farEnd = front ? [[cb0, -cw, h0], [cb0, cw, h0], [rf0, cw, h1], [rf0, -cw, h1]] : [[cb1, -cw, h0], [cb1, cw, h0], [rf1, cw, h1], [rf1, -cw, h1]];
  lface([[cb0, -cw, h0], [cb1, -cw, h0], [rf1, -cw, h1], [rf0, -cw, h1]], dark, { lw: 0.03 });
  lface(farEnd, dark, { lw: 0.03 });
  lface([[cb0, -cw, h0], [cb1, -cw, h0], [cb1, cw, h0], [cb0, cw, h0]], dark, { stroke: false });
  for (const u of [-0.05, -0.62]) lbox(u - 0.06, u + 0.06, -0.55, 0.55, h0, 0.34, shade(dark, 0.1), { flat: true, stroke: false });
  for (const r of o.riders || []) {
    const u = r.front ? 0.05 : -0.52, v = r.v || 0, lift = r.lift || 0;
    const [SX, SY] = P3(...at(u, v), z + h0 + 0.18);
    ctx.beginPath(); ctx.ellipse(SX, SY, 0.22, 0.16, 0, 0, Math.PI * 2); paint(ctx, r.top || C.navy, { lw: 0.02 });
    const [HX, HY] = P3(...at(u, v), z + h0 + 0.37 + lift);
    ctx.beginPath(); ctx.arc(HX, HY, 0.15, 0, Math.PI * 2); paint(ctx, r.skin || mix(C.woodLight, C.brown, 0.3), { lw: 0.02 });
    ctx.beginPath(); ctx.arc(HX, HY - 0.03, 0.16, Math.PI * 1.05, Math.PI * 1.95); paint(ctx, r.hair || C.ink, { stroke: false });
  }
  const pane = alpha(glass, 0.55);
  const endPane = front ? [[cb1, -cw, h0], [cb1, cw, h0], [rf1, cw, h1], [rf1, -cw, h1]] : [[cb0, -cw, h0], [cb0, cw, h0], [rf0, cw, h1], [rf0, -cw, h1]];
  lface(endPane, pane, { lw: 0.03 });
  lface([[cb0, cw, h0], [cb1, cw, h0], [rf1, cw, h1], [rf0, cw, h1]], pane, { lw: 0.03 });
  // A glint across each pane.
  ctx.save(); ctx.globalAlpha *= 0.5;
  const gl = (p) => lface(p, C.white, { stroke: false });
  gl([[-0.5, cw + 0.004, h0 + 0.05], [-0.3, cw + 0.004, h0 + 0.05], [-0.42, cw + 0.004, h1 - 0.05], [-0.62, cw + 0.004, h1 - 0.05]]);
  ctx.restore();
  // The pillars, in the body's color.
  const pil = (u0, u1) => lface([[u0 - 0.05, cw + 0.006, h0], [u0 + 0.05, cw + 0.006, h0], [u1 + 0.05, cw + 0.006, h1], [u1 - 0.05, cw + 0.006, h1]], color, { lw: 0.02 });
  pil(cb0 + 0.04, rf0 + 0.04); pil(-0.2, -0.2); pil(cb1 - 0.04, rf1 - 0.04);
  lface([[cb0, cw + 0.006, h0], [cb1, cw + 0.006, h0], [cb1, cw + 0.006, h0 + 0.05], [cb0, cw + 0.006, h0 + 0.05]], color, { stroke: false });
  lface([[rf0, -cw, h1], [rf1, -cw, h1], [rf1, cw, h1], [rf0, cw, h1]], tint(color, 0.08), { lw: 0.04 });
  // A mirror by the windscreen.
  lbox(cb1 - 0.12, cb1 - 0.02, cw + 0.02, cw + 0.14, h0 + 0.04, 0.1, color, { flat: true, lw: 0.02 });
  if (o.rack) lbox(rf0 + 0.08, rf1 - 0.08, -cw + 0.12, cw - 0.12, h1 + 0.02, 0.07, C.ink, { flat: true, stroke: false });
  if (o.ticket) lbox(cb1 + 0.05, cb1 + 0.35, 0.05, 0.35, h0 + 0.005, 0.02, C.butter, { flat: true, lw: 0.02 });
}

