// The Turnpike: the Great Marsh behind the town, and the one road across it
// from the mainland (off the back edge) to the island (docs/levels/plum.md).
// South of the road: the refuge's visitor center and Plum Island Airport at
// the mainland end (a little plane going round all day), and mid-causeway the
// lot where the Pink House stood, a sign on two granite posts now, with people
// still stopping for the photo and a painter who paints it anyway. North of
// it: Bob's Lobster and its queue (the goose got to the front and kept going,
// into a crate), Every King Tide Dave's truck parked on its lot all day, facing
// the road, his cooler packed for the flood, and the blue
// greenhead traps out on the marsh (the flies are winning). The drawbridge
// over the Plum Island River goes up for one boat and the whole road waits;
// at the king tide the road floods at its low spot, just behind it. At the
// island end, a restaurant deck faces the sunset.
//
// World units, like land.js. Everything standing on the marsh that the king
// tide reaches has its foot drawn live from the water line (feet()), since a
// still picture would stand over the water.
import { C, Q, box, disc, face, poly, paint, paintText, person, folk, speech, label, cylinder, mix, tint, shade, alpha, glow, goose } from '../../../engine/art.js';
import { ZK } from '../../../engine/iso.js';
import { drawLand, wade } from '../../../engine/terrain.js';
import { land, float, h, roadZ, PIKE, RIVER, BRIDGE, DECK, PINK, SHACK, AIRFIELD, VISITOR, DECK_AT, PANNES, CREEKS } from '../land.js';
import { hour, level, at, nightK, flicker, pinkWindow, highTide, sunsetWatch, FLICKERS, LOOP } from '../tide.js';
import { EVENING, LAND, INK, HOUSE, LIT, lightsOn, BRAND } from '../style.js';
import { bridgeUp, OPENINGS, parkedDave } from '../day.js';
import { who, trap, boat, footing, nightGlow, stay, gull, lettering, printed } from '../kit.js';
import { swim } from '../finale.js';

// ---------- Small helpers ----------
const mod = (t, p) => ((t % p) + p) % p;
const P3 = (x, y, z) => [x - y, (x + y) / 2 - z * ZK];
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const between = (a, b) => (t) => { const hr = hour(t); return a <= b ? hr >= a && hr < b : hr >= a || hr < b; };

// Inks for this stretch, from the plate's.
const GRANITE = mix(INK.shingle, C.white, 0.35);
const STEEL = mix(C.grey, C.navy, 0.28);
const CONCRETE = tint(INK.shingle, 0.35);
const PINKHOUSE = mix(C.pink, C.blush, 0.35);
const HERON = mix(C.grey, C.navy, 0.35);
const SHINGLE = HOUSE.body[1];
const ROOF = HOUSE.roof[0];
const WARN = C.mustard;
const q8 = (k) => Math.round(k * 8) / 8;

// A line through world points.
function line(ctx, pts, color, lw = 0.05) {
  ctx.beginPath();
  pts.forEach((p, i) => { const [X, Y] = P3(p[0], p[1], p[2]); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}
// A dot that faces the viewer (a bulb, a lamp, a bobber).
function dot(ctx, x, y, z, r, fill, stroke = true) {
  const [X, Y] = P3(x, y, z);
  ctx.beginPath();
  ctx.arc(X, Y, r, 0, Math.PI * 2);
  paint(ctx, fill, { lw: 0.025, stroke: stroke ? C.ink : false });
}
// Lettering on an upright plane (kit's lettering()).
const words = lettering;
// A flat quad on an upright plane: u across (along x or y), z up.
function pane(ctx, along, x, y, u0, u1, z0, z1, fill, o) {
  const pts = along === 'x'
    ? [[u0, y, z0], [u1, y, z0], [u1, y, z1], [u0, y, z1]]
    : [[x, u0, z0], [x, u1, z0], [x, u1, z1], [x, u0, z1]];
  face(ctx, pts, fill, o);
}
// A board: a panel with lines of lettering. lines: [[text, dz, size, ink, font]]
function plaque(ctx, along, x, y, z, w, hh, fill, lines = [], o = {}) {
  const c = along === 'x' ? x : y;
  pane(ctx, along, x, y, c - w / 2, c + w / 2, z - hh / 2, z + hh / 2, fill, { lw: o.lw ?? 0.05 });
  if (o.border && Q.detail) pane(ctx, along, x, y, c - w / 2 + 0.07, c + w / 2 - 0.07, z - hh / 2 + 0.07, z + hh / 2 - 0.07, null, { lw: 0.035, stroke: o.border });
  for (const [text, dz, size, ink, font] of lines) words(ctx, along, x, y, z + dz, text, size, ink || C.ink, font);
}
const pole = (ctx, x, y, z, hh, color = C.wood, r = 0.05) => box(ctx, x - r, y - r, z, r * 2, r * 2, hh, color, { flat: true, lw: 0.03 });

// A solid with six quad faces from eight corners (0-3 one end, 4-7 the other,
// in the same order), drawing only the faces that face you: a drawbridge's
// leaf at any angle, a ramp. colors: { [face]: fill } overrides (4 is 2-3-7-6).
const VIEW = [1, 1, 1 / ZK];
const FACES = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
function solid(ctx, c, color, colors = {}) {
  const cen = [0, 1, 2].map((k) => c.reduce((s, p) => s + p[k], 0) / 8);
  FACES.forEach((f, i) => {
    const [a, b, d] = [c[f[0]], c[f[1]], c[f[2]]];
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const fc = [0, 1, 2].map((k) => f.reduce((s, j) => s + c[j][k], 0) / 4);
    if (n[0] * (fc[0] - cen[0]) + n[1] * (fc[1] - cen[1]) + n[2] * (fc[2] - cen[2]) < 0) n = n.map((e) => -e);
    const len = Math.hypot(...n);
    if (len < 1e-6 || n[0] * VIEW[0] + n[1] * VIEW[1] + n[2] * VIEW[2] <= 1e-6) return;
    const [nx, ny, nz] = n.map((e) => e / len);
    const fill = colors[i] || (nz > 0.55 ? color : ny > nx ? shade(color, 0.22) : shade(color, 0.1));
    face(ctx, f.map((j) => c[j]), fill, { lw: 0.04 });
  });
}

// Feet on the marsh: the part of a post (or a stone) below `top` is drawn live
// from wherever's higher, the ground or the water, with a ripple ring when
// it's wet, so the king tide can come up round it. The rest is still.
function feet(R, posts, top, on = null) {
  const when = on || (() => true);
  const gs = posts.map(([x, y]) => R.ground(x, y)), gmin = Math.min(...gs), wet = (t) => level(t) > gmin + 0.02;
  // All the posts of one sign as one item, sorted by the front one.
  const [fx, fy] = posts.reduce((m, [x, y, w]) => (x + y + w > m[0] + m[1] ? [x + w / 2 - 0.01, y + w / 2 - 0.01] : m), [-1e9, -1e9]);
  const draw = (ctx, L) => posts.forEach(([x, y, w, color], i) => {
    const b = Math.max(gs[i], L);
    if (b < top) box(ctx, x - w / 2, y - w / 2, b, w, w, top - b, color, { flat: true, lw: 0.03 });
    if (L > gs[i] + 0.02 && Q.detail) {
      const [X, Y] = P3(x, y, L);
      ctx.beginPath();
      ctx.ellipse(X, Y, w * 1.6 + 0.12, w * 0.8 + 0.06, 0, 0, Math.PI * 2);
      ctx.strokeStyle = alpha(C.white, 0.85);
      ctx.lineWidth = 0.04;
      ctx.stroke();
    }
  });
  // Dry (most of the day): a still picture.
  R.thing(fx, fy, (ctx) => draw(ctx, -9), { on: (t) => when(t) && !wet(t) });
  R.thing(fx, fy, (ctx, t) => draw(ctx, level(t)), { anim: true, on: (t) => when(t) && wet(t) });
}

// Something that only moves some of the time (the bridge, its gates and
// bell): a still picture, drawn as at a quiet noon, while busy(t) is false,
// and drawn live only while it's true.
const QUIET = 100;
function calm(R, x, y, draw, busy, o = {}) {
  R.thing(x, y, (ctx) => draw(ctx, QUIET), { ...o, on: (t) => !busy(t) });
  R.thing(x, y, draw, { ...o, depth: o.busyDepth ?? o.depth, anim: true, on: busy });
}

// Everyone on the island turns to face the marsh at sunset (tide.js).
const turned = (p, t, pose = 'stand') => (sunsetWatch(t) ? { ...p, pose, dir: 'r', back: true } : p);
// Someone who stays put: pose(t) or a pose, hours they're about, sunset turn.
// o: { z, hours, sun (the sunset pose, or false), depth, after(ctx, t, p, z), scale }
function extra(R, x, y, look, pose, o = {}) {
  const z = o.z ?? R.ground(x, y);
  // Holding still: a cached picture (kit's stay()), not drawn every frame.
  if (typeof pose !== 'function' && !o.after) {
    stay(R, x, y, o.scale ? { ...look, scale: o.scale } : look, { z, pose: pose.pose, dir: pose.dir, back: pose.back, arms: pose.arms, hours: o.hours, sun: o.sun === false ? false : o.sun || 'stand', depth: o.depth });
    return;
  }
  R.thing(x, y, (ctx, t) => {
    if (o.hours && !o.hours(t)) return;
    let p = typeof pose === 'function' ? pose(t) : pose;
    if (o.sun !== false) p = turned(p, t, o.sun || 'stand');
    if (o.scale) p = { ...p, scale: o.scale };
    who(ctx, x, y, z, look, null, p, t);
    if (o.after) o.after(ctx, t, p, z);
  }, { anim: true, ...(o.depth != null ? { depth: o.depth } : {}) });
}

// ---------- Birds and beasts ----------
// A wading bird, standing: legs, body, an S of a neck and a dagger of a
// beak. strike 0..1: the neck shoots down and forward (a heron fishing).
function wader(ctx, x, y, z, t, o) {
  const s = o.scale || 1, f = o.dir === 'l' ? -1 : 1, legH = 0.8;
  const [X, Y] = P3(x, y, z);
  const k = o.strike || 0;
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(f * s, s);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.05;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-0.04, 0); ctx.lineTo(0, -legH);
  ctx.moveTo(0.08, 0); ctx.lineTo(0.04, -legH);
  ctx.stroke();
  const by = -legH - 0.14;
  ctx.beginPath();
  ctx.ellipse(-0.04, by, 0.34, 0.15, -0.18 - k * 0.25, 0, Math.PI * 2);
  ctx.moveTo(-0.3, by + 0.02); ctx.lineTo(-0.52, by + 0.14); ctx.lineTo(-0.28, by + 0.1);
  paint(ctx, o.color, { lw: 0.04 });
  if (o.wing && Q.detail) {
    ctx.beginPath();
    ctx.ellipse(-0.08, by - 0.02, 0.22, 0.09, -0.2, 0, Math.PI * 2);
    paint(ctx, o.wing, { stroke: false });
  }
  // The neck: tucked in an S, or out in a strike.
  const hx = 0.22 + k * 0.45, hy = by - 0.7 + k * 0.85;
  ctx.beginPath();
  ctx.moveTo(0.22, by - 0.06);
  ctx.bezierCurveTo(0.5 - k * 0.1, by - 0.25, 0.02 + k * 0.4, by - 0.45 + k * 0.3, hx, hy);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.15;
  ctx.stroke();
  ctx.strokeStyle = o.color;
  ctx.lineWidth = 0.09;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(hx, hy, 0.09, 0, Math.PI * 2);
  paint(ctx, o.color, { lw: 0.035 });
  ctx.beginPath();
  ctx.moveTo(hx + 0.06, hy - 0.03);
  ctx.lineTo(hx + 0.42, hy + 0.04 + k * 0.1);
  ctx.lineTo(hx + 0.06, hy + 0.04);
  paint(ctx, WARN, { lw: 0.025 });
  ctx.restore();
}
// The lobster: tail, body, two claws out front and long feelers, heading
// along x (s: +1 or -1). Red, because it's funnier.
function lobster(ctx, x, y, z, s, t) {
  const red = C.red, wig = Math.sin(t * 4) * 0.04;
  if (Q.detail) {
    for (const side of [-1, 1]) line(ctx, [[x + s * 0.12, y + side * 0.05, z + 0.05], [x + s * 0.55, y + side * 0.34, z + 0.18], [x + s * 0.72, y + side * 0.3, z + 0.1]], shade(red, 0.3), 0.025);
    for (const side of [-1, 1]) for (const k of [-0.05, 0.05]) line(ctx, [[x + k, y + side * 0.06, z], [x + k + s * 0.02, y + side * 0.2, z - 0.06]], shade(red, 0.35), 0.03);
  }
  for (let i = 3; i >= 1; i--) disc(ctx, x - s * (0.06 + i * 0.12), y, z + 0.02, 0.1 - i * 0.012, i === 3 ? shade(red, 0.1) : red, { lw: 0.025 });
  disc(ctx, x + s * 0.06, y, z + 0.05, 0.13, red, { lw: 0.03 });
  for (const side of [-1, 1]) {
    line(ctx, [[x + s * 0.14, y + side * 0.07, z + 0.05], [x + s * 0.3, y + side * 0.2, z + 0.06]], red, 0.06);
    disc(ctx, x + s * (0.38 + wig * side), y + side * 0.22, z + 0.07, 0.08, red, { lw: 0.025 });
  }
  if (Q.detail) { dot(ctx, x + s * 0.16, y - 0.04, z + 0.12, 0.025, C.ink, false); dot(ctx, x + s * 0.16, y + 0.04, z + 0.12, 0.025, C.ink, false); }
}

// ---------- The plane ----------
// A little high-wing plane pointing along x (s: +1 toward +x), wheels at z.
function plane(ctx, x, y, z, s, t, o = {}) {
  const body = o.color || C.white, trim = o.trim || C.coral;
  const X = (u) => x + u * s, x0 = Math.min(X(-0.95), X(0.95));
  if (Q.detail) for (const [u, v] of [[0.35, -0.42], [0.35, 0.42], [-0.8, 0]]) box(ctx, X(u) - 0.07, y + v - 0.07, z, 0.14, 0.14, 0.2, C.ink, { flat: true, lw: 0.02 });
  // The tail fin, the far side of the body first when it points away.
  const fin = () => face(ctx, [[X(-0.95), y, z + 0.55], [X(-0.55), y, z + 0.55], [X(-0.95), y, z + 1.1]], trim, { lw: 0.03 });
  box(ctx, Math.min(X(-0.95), X(-0.65)), y - 0.55, z + 0.52, 0.3, 1.1, 0.05, trim, { flat: true, lw: 0.025 });
  box(ctx, x0, y - 0.22, z + 0.2, 1.9, 0.44, 0.4, body, { flat: true, lw: 0.04 });
  if (Q.detail) face(ctx, [[x0, y + 0.22, z + 0.32], [x0 + 1.9, y + 0.22, z + 0.32], [x0 + 1.9, y + 0.22, z + 0.4], [x0, y + 0.22, z + 0.4]], trim, { stroke: false });
  box(ctx, Math.min(X(0.05), X(0.6)), y - 0.19, z + 0.6, 0.55, 0.38, 0.26, tint(C.sky, 0.2), { flat: true, lw: 0.03, top: body });
  fin();
  // The wing, on top, with its struts.
  if (Q.detail) for (const v of [-0.9, 0.9]) line(ctx, [[X(0.2), y + v, z + 0.9], [X(0.25), y + Math.sign(v) * 0.2, z + 0.3]], C.ink, 0.03);
  box(ctx, Math.min(X(0.02), X(0.48)), y - 1.35, z + 0.88, 0.46, 2.7, 0.07, trim, { flat: true, lw: 0.035, top: body });
  // The propeller: a blur when it's turning.
  const px = X(0.98), pz = z + 0.4;
  if (o.spin) {
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI * 2; const [PX, PY] = P3(px, y + Math.cos(a) * 0.42, pz + Math.sin(a) * 0.42); i ? ctx.lineTo(PX, PY) : ctx.moveTo(PX, PY); }
    ctx.fillStyle = alpha(C.ink, 0.14);
    ctx.fill();
  } else line(ctx, [[px, y - 0.42, pz - 0.1], [px, y + 0.42, pz + 0.1]], C.ink, 0.06);
  dot(ctx, px, y, pz, 0.05, C.ink, false);
}

export default {
  id: 'turnpike',
  name: 'The Turnpike',
  blurb: 'One low road over the marsh: Bob\'s Lobster, a drawbridge that waits for nobody, and the lot where the Pink House stood. Dave has been parked here since breakfast.',
  home: [PIKE, 12],
  build(R) {
    drawLand(R, land, { fade: nightK, inks: EVENING });

    // ---------- The road ----------
    // The dashes down the middle; the ones in the dip go under with the flood.
    const dashes = (y0, y1) => (ctx) => {
      for (let y = y0; y < y1 - 0.5; y += 1.6) {
        const z = h(PIKE, y + 0.4) + 0.01;
        face(ctx, [[PIKE - 0.07, y, z], [PIKE + 0.07, y, z], [PIKE + 0.07, y + 0.8, z], [PIKE - 0.07, y + 0.8, z]], alpha(C.white, 0.75), { stroke: false });
      }
    };
    R.rug(dashes(0.4, 12.4)).area = [PIKE - 1, 0, PIKE + 1, 12.4];
    R.rug(dashes(12.4, 17.6), { on: (t) => level(t) < 0.46 }).area = [PIKE - 1, 12.4, PIKE + 1, 17.6];
    R.rug(dashes(27, 28.2)).area = [PIKE - 1, 27, PIKE + 1, 28];

    // Welcome to the island, at the mainland end.
    const wz = R.ground(60.1, 1.1);
    R.thing(60.2, 2.1, (ctx) => {
      pole(ctx, 60.1, 0.35, wz, 1.9, C.wood, 0.06);
      pole(ctx, 60.1, 1.85, wz, 1.9, C.wood, 0.06);
      plaque(ctx, 'y', 60.16, 1.1, wz + 1.6, 2, 0.95, C.teal, [
        ['PLUM ISLAND', 0.2, 0.26, C.white, 'Bagel Fat One'],
        ['POP. 2,000', -0.11, 0.11, C.white],
        ['GREENHEADS 10,000,000', -0.29, 0.11, C.white],
      ], { border: C.white });
    });

    // ---------- The refuge's visitor center ----------
    const [vx, vy] = VISITOR, vw = 3, vd = 1.6, vz = footing(R, vx, vy, vw, vd);
    printed(R, vx + vw + 0.6, vy + vd + 0.7, (ctx, ink) => {
      const top = vz + 1.8, rise = 0.8, m = vy + vd / 2;
      const SH = ink(SHINGLE);
      box(ctx, vx, vy, vz, vw, vd, 1.8, SH, { dotsL: shade(SH, 0.5), dens: 0.14, lw: 0.05 });
      if (Q.detail) {
        ctx.strokeStyle = alpha(shade(SHINGLE, 0.35), 0.5); ctx.lineWidth = 0.025; ctx.beginPath();
        for (let z = vz + 0.3; z < top; z += 0.3) { const [a, b] = P3(vx, vy + vd, z), [c, d] = P3(vx + vw, vy + vd, z), [e, f] = P3(vx + vw, vy, z); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.lineTo(e, f); }
        ctx.stroke();
      }
      for (const u of [vx + 0.5, vx + 2.1]) pane(ctx, 'x', 0, vy + vd, u, u + 0.5, vz + 0.7, vz + 1.35, HOUSE.glass, { lw: 0.035, stroke: C.white });
      pane(ctx, 'x', 0, vy + vd, vx + 1.25, vx + 1.8, vz, vz + 1.4, C.teal, { lw: 0.04 });
      pane(ctx, 'y', vx + vw, 0, vy + 0.5, vy + 1.1, vz + 0.7, vz + 1.35, HOUSE.glass, { lw: 0.035, stroke: C.white });
      const roof = ink(mix(C.green, INK.shingle, 0.45));
      face(ctx, [[vx, vy, top], [vx + vw, vy, top], [vx + vw, m, top + rise], [vx, m, top + rise]], shade(roof, 0.12), { lw: 0.05 });
      face(ctx, [[vx + vw, vy, top], [vx + vw, vy + vd, top], [vx + vw, m, top + rise]], shade(SH, 0.06), { lw: 0.05, stroke: C.white });
      face(ctx, [[vx - 0.1, vy + vd + 0.1, top], [vx + vw + 0.1, vy + vd + 0.1, top], [vx + vw + 0.1, m, top + rise], [vx - 0.1, m, top + rise]], roof, { lw: 0.05, dots: Q.detail ? shade(roof, 0.4) : null, density: 0.14 });
      // The porch roof, on two posts.
      for (const u of [vx + 0.2, vx + vw - 0.2]) pole(ctx, u, vy + vd + 0.6, vz, 1.3, C.white, 0.05);
      face(ctx, [[vx, vy + vd, vz + 1.5], [vx + vw, vy + vd, vz + 1.5], [vx + vw, vy + vd + 0.7, vz + 1.3], [vx, vy + vd + 0.7, vz + 1.3]], shade(roof, 0.05), { lw: 0.04 });
      // Its flag, hanging limp on a still morning.
      pole(ctx, vx + vw + 0.5, vy + 1.9, vz, 3.2, C.white, 0.04);
      face(ctx, [[vx + vw + 0.54, vy + 1.9, vz + 3.15], [vx + vw + 1.2, vy + 1.9, vz + 3.15], [vx + vw + 1.2, vy + 1.9, vz + 2.75], [vx + vw + 0.54, vy + 1.9, vz + 2.75]], C.red, { lw: 0.03 });
      if (Q.detail) face(ctx, [[vx + vw + 0.54, vy + 1.9, vz + 3.15], [vx + vw + 0.8, vy + 1.9, vz + 3.15], [vx + vw + 0.8, vy + 1.9, vz + 2.97], [vx + vw + 0.54, vy + 1.9, vz + 2.97]], C.navy, { stroke: false });
      // The sign out front.
      const sz = R.ground(vx - 0.4, vy + 2.4);
      pole(ctx, vx - 1.2, vy + 2.4, sz, 1.2);
      pole(ctx, vx + 0.3, vy + 2.4, sz, 1.2);
      plaque(ctx, 'x', vx - 0.45, vy + 2.46, sz + 1.2, 1.9, 0.8, C.brown, [
        ['REFUGE VISITOR CENTER', 0.16, 0.14, C.white],
        ['REFUGE FULL? WE ARE NOT.', -0.14, 0.11, C.butter],
      ], { border: C.white });
    }, { veil: (ctx, v) => {
      const top = vz + 1.8, rise = 0.8, m = vy + vd / 2;
      v([[vx, vy, vz, vw, vd, 1.8]], [
        [[vx, vy, top], [vx + vw, vy, top], [vx + vw, m, top + rise], [vx, m, top + rise]], [[vx + vw, vy, top], [vx + vw, vy + vd, top], [vx + vw, m, top + rise]],
        [[vx - 0.1, vy + vd + 0.1, top], [vx + vw + 0.1, vy + vd + 0.1, top], [vx + vw + 0.1, m, top + rise], [vx - 0.1, m, top + rise]],
        [[vx, vy + vd, vz + 1.5], [vx + vw, vy + vd, vz + 1.5], [vx + vw, vy + vd + 0.7, vz + 1.3], [vx, vy + vd + 0.7, vz + 1.3]],
      ]);
    } });
    // The porch light, after dark.
    R.thing(vx + 1.9, vy + vd + 0.02, (ctx) => dot(ctx, vx + 1.95, vy + vd + 0.01, vz + 1.2, 0.09, LIT), { on: lightsOn });
    R.thing(vx + 1.9, vy + vd + 0.01, (ctx) => dot(ctx, vx + 1.95, vy + vd + 0.01, vz + 1.2, 0.09, C.white));
    nightGlow(R, vx + 1.9, vy + vd + 0.3, vz + 1.2, 2.2, LIT, 0.7);
    // The volunteer on the porch with the maps nobody takes.
    extra(R, vx + 0.9, vy + vd + 0.45, folk(301, { top: C.green, hat: 'sun', bottom: C.brown }), { pose: 'read', dir: 'l' }, { hours: between(8, 17) });

    // ---------- Plum Island Airport ----------
    const [a0, c0, a1, c1] = AIRFIELD, RY = (c0 + c1) / 2;
    // Runway numbers and a centre line, painted on the strip.
    R.rug((ctx) => {
      const z = 0.96;
      for (let x = a0 + 2.2; x < a1 - 2; x += 1.4) face(ctx, [[x, RY - 0.05, z], [x + 0.7, RY - 0.05, z], [x + 0.7, RY + 0.05, z], [x, RY + 0.05, z]], alpha(C.white, 0.7), { stroke: false });
      if (!Q.detail) return;
      paintText(ctx, 'floor', a0 + 1.1, RY, '27', 0.6, alpha(C.white, 0.75), 'Bagel Fat One');
      paintText(ctx, 'floor', a1 - 1.1, RY, '09', 0.6, alpha(C.white, 0.75), 'Bagel Fat One');
    }).area = [a0, c0, a1, c1];
    // The hangar, doors open onto the strip, the airport's name on its side.
    const hx = 49.6, hy = 7.6, hw = 3.4, hd = 2, hz = footing(R, hx, hy, hw, hd);
    printed(R, hx + hw, hy + hd, (ctx, ink) => {
      const tin = ink(tint(INK.shingle, 0.2)), top = hz + 1.6, rise = 0.9, m = hy + hd / 2;
      box(ctx, hx, hy, hz, hw, hd, 1.6, tin, { dotsL: shade(tin, 0.5), dens: 0.12, lw: 0.05 });
      if (Q.detail) {
        ctx.strokeStyle = alpha(shade(tin, 0.4), 0.5); ctx.lineWidth = 0.025; ctx.beginPath();
        for (let u = hx + 0.25; u < hx + hw; u += 0.25) { const [a, b] = P3(u, hy + hd, hz), [c, d] = P3(u, hy + hd, top); ctx.moveTo(a, b); ctx.lineTo(c, d); }
        ctx.stroke();
      }
      // The doors, on the end facing the road, slid open.
      pane(ctx, 'y', hx + hw, 0, hy + 0.2, hy + hd - 0.2, hz, hz + 1.5, shade(C.ink, 0.1), { lw: 0.04 });
      pane(ctx, 'y', hx + hw + 0.01, 0, hy + 0.1, hy + 0.55, hz, hz + 1.55, tint(tin, 0.1), { lw: 0.04 });
      pane(ctx, 'y', hx + hw + 0.01, 0, hy + hd - 0.55, hy + hd - 0.1, hz, hz + 1.55, tint(tin, 0.1), { lw: 0.04 });
      face(ctx, [[hx, hy, top], [hx + hw, hy, top], [hx + hw, m, top + rise], [hx, m, top + rise]], ink(shade(ROOF, 0.1)), { lw: 0.05 });
      face(ctx, [[hx + hw, hy, top], [hx + hw, hy + hd, top], [hx + hw, m, top + rise]], shade(tin, 0.08), { lw: 0.05 });
      face(ctx, [[hx, hy + hd, top], [hx + hw, hy + hd, top], [hx + hw, m, top + rise], [hx, m, top + rise]], ink(mix(ROOF, C.teal, 0.25)), { lw: 0.05, dots: Q.detail ? shade(ROOF, 0.4) : null, density: 0.12 });
      words(ctx, 'x', hx + hw / 2, hy + hd, hz + 1.1, 'PLUM ISLAND AIRPORT', 0.3, C.navy, 'Bagel Fat One');
      words(ctx, 'x', hx + hw / 2, hy + hd, hz + 0.65, 'FLYING SINCE 1910. MOSTLY.', 0.16, C.navy);
      // The beacon's mast at the back corner.
      pole(ctx, hx + 0.2, hy + 0.2, top, 2, C.white, 0.05);
      box(ctx, hx + 0.05, hy + 0.05, top + 2, 0.3, 0.3, 0.25, STEEL, { flat: true, lw: 0.03 });
    }, { veil: (ctx, v) => {
      const top = hz + 1.6, rise = 0.9, m = hy + hd / 2;
      v([[hx, hy, hz, hw, hd, 1.6]], [
        [[hx, hy, top], [hx + hw, hy, top], [hx + hw, m, top + rise], [hx, m, top + rise]], [[hx + hw, hy, top], [hx + hw, hy + hd, top], [hx + hw, m, top + rise]],
        [[hx, hy + hd, top], [hx + hw, hy + hd, top], [hx + hw, m, top + rise], [hx, m, top + rise]],
      ]);
    } });
    // The beacon: white, green, white, green, all night.
    const beacon = [hx + 0.2, hy + 0.2, hz + 1.6 + 2.15];
    R.light({ at: beacon, r: 2.4, color: C.white, k: (t) => nightK(t) * (mod(t, 2.4) < 0.5 ? 0.9 : 0) });
    R.thing(hx + 0.36, hy + 0.36, (ctx, t) => {
      if (nightK(t) < 0.3) return;
      const k = mod(t, 2.4);
      dot(ctx, beacon[0], beacon[1], beacon[2], 0.12, k < 0.5 ? C.white : k > 1.2 && k < 1.7 ? C.leaf : shade(C.leaf, 0.5));
    }, { anim: true });
    // A yellow Cub parked by the doors, and its owner under the cowling.
    const cub = [54.5, 9.2], cz = R.ground(...cub);
    R.thing(cub[0] + 1, cub[1] + 1.4, (ctx) => plane(ctx, cub[0], cub[1], cz, -1, 0, { color: C.mustard, trim: C.ink }));
    extra(R, cub[0] - 1.35, cub[1] + 0.5, folk(302, { top: C.navy, bottom: C.navy, hat: 'cap' }), { pose: 'carry', dir: 'r' }, { hours: between(7, 19) });
    // A low fence along the road, and the kid who waits all day for the plane.
    R.thing(59.85, 7.6, (ctx) => {
      const fz = 0.9;
      for (let y = 3.2; y <= 7.6; y += 0.55) pole(ctx, 59.8, y, fz - 0.05, 0.55, C.white, 0.035);
      for (const z of [0.25, 0.45]) line(ctx, [[59.8, 3.2, fz + z], [59.8, 7.6, fz + z]], C.white, 0.05);
    });
    // The plane, round every 50 seconds from 6am to 9pm: out to the far end,
    // turn, take off toward the Sound, gone a while, back in low over the
    // turnpike (everyone ducks), roll out, park.
    const APRON = 51.4, FAR = 58.6;
    const planeAt = (t) => {
      const hr = hour(t);
      if (hr < 6 || hr > 21) return { x: APRON, y: RY, z: 0, s: 1 };
      const k = mod(t, 50);
      if (k < 9) { const u = k / 9; return { x: APRON + (FAR - APRON) * u * u * (3 - 2 * u), y: RY, z: 0, s: 1, spin: true }; }
      if (k < 10.5) return { x: FAR, y: RY, z: 0, s: -1, spin: true };
      if (k < 17) { const u = (k - 10.5) / 6.5, x = FAR - 14.6 * u * u; return { x, y: RY, z: Math.max(0, (54.5 - x) * 0.55), s: -1, spin: true, gone: x < 48 }; }
      if (k < 34) return { x: 40, y: RY, z: 6, gone: true };
      if (k < 41) { const u = (k - 34) / 7; return { x: 95 - 37 * u, y: RY, z: 7 * Math.pow(1 - u, 0.7), s: -1, spin: true }; }
      if (k < 46) { const u = (k - 41) / 5; return { x: 58 - (58 - APRON) * (1 - (1 - u) * (1 - u)), y: RY, z: 0, s: -1, spin: true }; }
      return { x: APRON, y: RY, z: 0, s: k < 48 ? -1 : 1 };
    };
    R.mover(planeAt, (ctx, t, p) => {
      if (p.gone) return;
      const base = 0.95;
      if (p.z > 0.15) {
        const g = Math.max(h(p.x, p.y), level(t));
        disc(ctx, p.x, p.y, g + 0.01, 0.75, alpha(C.ink, 0.16), { stroke: false });
      }
      plane(ctx, p.x, p.y, base + p.z, p.s, t, { spin: p.spin });
    }, { bias: 0.5 });
    const kidAt = [60.15, 6.3];
    extra(R, kidAt[0], kidAt[1], folk(303, { top: C.mustard, bottom: C.teal, style: 'curly' }), (t) => {
      const p = planeAt(t), near = !p.gone && Math.abs(p.x - 57) < 5;
      return { pose: near ? 'jump' : 'stand', dir: 'l', back: !near };
    }, { hours: between(7, 19.5), scale: 0.7, sun: 'point' });
    extra(R, 60.3, 4.9, folk(304, { top: C.blush, bottom: C.navy, hat: 'sun' }), { pose: 'stand', dir: 'l', back: true }, { hours: between(7, 19.5) });
    // The windsock, blowing the way the plane takes off against.
    const [sx0, sy0] = [a1 - 0.4, c0 - 0.9], sz0 = R.ground(sx0, sy0);
    R.thing(sx0, sy0, (ctx) => pole(ctx, sx0, sy0, sz0, 2.4, C.white, 0.05));
    R.thing(sx0 + 1, sy0 + 0.05, (ctx, t) => {
      const z = sz0 + 2.3;
      for (let i = 0; i < 4; i++) {
        const u0 = i * 0.26, u1 = u0 + 0.26, r0 = 0.17 - i * 0.03, r1 = r0 - 0.03;
        const w0 = Math.sin(t * 5 - i) * 0.05 * i, w1 = Math.sin(t * 5 - i - 1) * 0.05 * (i + 1);
        face(ctx, [[sx0 + u0, sy0 + w0, z + r0 - u0 * 0.3], [sx0 + u1, sy0 + w1, z + r1 - u1 * 0.3], [sx0 + u1, sy0 + w1, z - r1 - u1 * 0.3], [sx0 + u0, sy0 + w0, z - r0 - u0 * 0.3]], i % 2 ? C.white : C.coral, { lw: 0.03 });
      }
    }, { anim: true });

    // ---------- Where the Pink House stood ----------
    const [px, py] = PINK, gz = footing(R, px - 1.2, py - 1.2, 2.4, 2.4);
    // The house, back for a moment at sunset (three times, a second each):
    // pink clapboard, white trim, its porch facing the road, a light on.
    // The same house is its own ghost in between (P: the inks to draw it in).
    const H0 = 55.4, H1 = 58.4, D0 = 9.4, D1 = 11.8, hz0 = footing(R, H0, D0, H1 - H0, D1 - D0);
    const HOUSE_INKS = { body: PINKHOUSE, roof: ROOF, lit: LIT, trim: C.white, chimney: C.brown, line: undefined, dots: true };
    const GHOST_INKS = { body: mix(C.pink, C.white, 0.2), roof: mix(C.pink, C.lilac, 0.45), lit: C.white, trim: C.white, chimney: mix(C.pink, C.lilac, 0.6), line: mix(C.pink, C.white, 0.5), dots: false };
    const pinkHouse = (ctx, P) => {
      const top = hz0 + 3.1, rise = 1.15, m = (D0 + D1) / 2, ln = P.line, st = (o) => (ln ? { ...o, stroke: o.stroke || ln } : o);
      box(ctx, H0, D0, hz0, H1 - H0, D1 - D0, 3.1, P.body, P.dots ? { dotsL: shade(P.body, 0.45), dens: 0.12, lw: 0.05 } : { flat: true, lw: 0.05, stroke: ln });
      if (Q.detail) {
        ctx.strokeStyle = alpha(ln || shade(P.body, 0.3), 0.55); ctx.lineWidth = 0.025; ctx.beginPath();
        for (let z = hz0 + 0.26; z < top; z += 0.26) { const [a, b] = P3(H0, D1, z), [c, d] = P3(H1, D1, z), [e, f] = P3(H1, D0, z); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.lineTo(e, f); }
        ctx.stroke();
      }
      // Windows, lit: someone's home.
      for (const z of [hz0 + 0.55, hz0 + 1.95]) {
        for (const u of [H0 + 0.35, H0 + 1.25, H0 + 2.15]) pane(ctx, 'x', 0, D1, u, u + 0.5, z, z + 0.75, P.lit, { lw: 0.04, stroke: P.trim });
        if (z > hz0 + 1) for (const v of [D0 + 0.4, D0 + 1.45]) pane(ctx, 'y', H1, 0, v, v + 0.5, z, z + 0.75, P.lit, { lw: 0.04, stroke: P.trim });
      }
      pane(ctx, 'y', H1, 0, D0 + 0.95, D0 + 1.45, hz0, hz0 + 1.4, P.trim, st({ lw: 0.04 }));
      pane(ctx, 'y', H1, 0, D0 + 0.25, D0 + 0.7, hz0 + 0.55, hz0 + 1.3, P.lit, { lw: 0.04, stroke: P.trim });
      ctx.strokeStyle = P.trim; ctx.lineWidth = 0.09; ctx.beginPath();
      for (const [cx, cy] of [[H0, D1], [H1, D1], [H1, D0]]) { const [a, b] = P3(cx, cy, hz0), [c, d] = P3(cx, cy, top); ctx.moveTo(a, b); ctx.lineTo(c, d); }
      ctx.stroke();
      // The roof, ridge along x, its gable end to the road.
      face(ctx, [[H0, D0, top], [H1, D0, top], [H1, m, top + rise], [H0, m, top + rise]], shade(P.roof, 0.12), st({ lw: 0.05 }));
      box(ctx, H0 + 0.5, m - 0.2, top + rise - 0.4, 0.4, 0.4, 0.9, P.chimney, { flat: true, lw: 0.04, stroke: ln });
      face(ctx, [[H1, D0, top], [H1, D1, top], [H1, m, top + rise]], shade(P.body, 0.06), { lw: 0.05, stroke: P.trim });
      if (Q.detail) pane(ctx, 'y', H1, 0, m - 0.2, m + 0.2, top + 0.2, top + 0.6, P.lit, { lw: 0.035, stroke: P.trim });
      face(ctx, [[H0 - 0.1, D1 + 0.12, top], [H1 + 0.1, D1 + 0.12, top], [H1 + 0.1, m, top + rise], [H0 - 0.1, m, top + rise]], P.roof, st({ lw: 0.05, dots: Q.detail && P.dots ? shade(P.roof, 0.4) : null, density: 0.14 }));
      // The porch along the road side: floor, posts, rail, roof.
      box(ctx, H1, D0 + 0.1, hz0, 0.8, D1 - D0 - 0.2, 0.3, P.trim, { flat: true, lw: 0.04, stroke: ln });
      for (const v of [D0 + 0.2, (D0 + D1) / 2, D1 - 0.3]) box(ctx, H1 + 0.65, v - 0.05, hz0 + 0.3, 0.1, 0.1, 1.3, P.trim, { flat: true, lw: 0.03, stroke: ln });
      if (Q.detail) line(ctx, [[H1 + 0.72, D0 + 0.2, hz0 + 0.75], [H1 + 0.72, D1 - 0.3, hz0 + 0.75]], P.trim, 0.06);
      face(ctx, [[H1, D0 + 0.05, hz0 + 1.75], [H1, D1 - 0.05, hz0 + 1.75], [H1 + 0.9, D1 - 0.05, hz0 + 1.55], [H1 + 0.9, D0 + 0.05, hz0 + 1.55]], shade(P.roof, 0.05), st({ lw: 0.04 }));
    };
    // In full for a moment three times across the sunset.
    R.thing(59.2, D1 + 0.1, (ctx) => pinkHouse(ctx, HOUSE_INKS), { fade: flicker });
    // In between, all through its window, its ghost: the same house in pale
    // light, see-through, a little off the ground, swaying, glowing pink. It
    // gives the player something to tap (gate 3, the owner: "the ghost is the
    // Pink House").
    const [hbx, hby] = P3((H0 + H1) / 2, (D0 + D1) / 2, hz0);
    R.thing(59.2, D1 + 0.1, (ctx, t) => {
      const k = 1 - flicker(t);
      if (k <= 0.01) return;
      glow(ctx, (H0 + H1) / 2, (D0 + D1) / 2, hz0 + 2, 4.6, C.pink, k * (0.8 + 0.2 * Math.sin(t * 1.9)));
      ctx.save();
      ctx.globalAlpha *= k * (0.62 + 0.08 * Math.sin(t * 2.3));
      ctx.translate(hbx, hby - 0.25 - 0.12 * Math.sin(t * 1.4));
      ctx.transform(1, 0, 0.035 * Math.sin(t * 1.1), 1, 0, 0);
      ctx.translate(-hbx, -hby);
      pinkHouse(ctx, GHOST_INKS);
      ctx.restore();
    }, { anim: true, on: pinkWindow });
    // The memorial: a painting of the house on two granite posts, facing the road.
    const mx = 59.6, mz = R.ground(mx, py);
    R.thing(mx + 0.25, py + 0.9, (ctx) => {
      for (const v of [py - 0.8, py + 0.6]) box(ctx, mx - 0.17, v, mz - 0.05, 0.34, 0.3, 1.75, GRANITE, { dotsL: shade(GRANITE, 0.45), dens: 0.14, lw: 0.04 });
      const x = mx + 0.02, z0 = mz + 0.8, z1 = mz + 1.7, v0 = py - 0.5, v1 = py + 0.6;
      pane(ctx, 'y', x, 0, v0, v1, z0, z1, C.white, { lw: 0.05 });
      pane(ctx, 'y', x, 0, v0 + 0.07, v1 - 0.07, z0 + 0.25, z1 - 0.07, tint(C.sky, 0.25), { stroke: false });
      pane(ctx, 'y', x, 0, v0 + 0.07, v1 - 0.07, z0 + 0.25, z0 + 0.4, INK.marsh, { stroke: false });
      // The house in paint, and its roof.
      const hv = py + 0.05;
      pane(ctx, 'y', x, 0, hv - 0.2, hv + 0.2, z0 + 0.36, z0 + 0.68, PINKHOUSE, { lw: 0.02 });
      face(ctx, [[x, hv - 0.24, z0 + 0.68], [x, hv + 0.24, z0 + 0.68], [x, hv, z0 + 0.85]], ROOF, { lw: 0.02 });
      words(ctx, 'y', x, py, z0 + 0.13, 'THE PINK HOUSE', 0.11, C.ink);
    });
    // People stopping for the photo, all day. One of them always turns round
    // just after the house has gone again.
    const glance = (t) => {
      const s = mod(t, LOOP);
      for (let i = 0; i < FLICKERS.length; i++) { const d = s - at(FLICKERS[i]); if (d > 0.4 && d < 2.4) return i; }
      return -1;
    };
    // (Pointing at the sign all day, a still picture; live only at sunset.)
    const photoHours = between(6.5, 21);
    extra(R, 60.15, 12.9, folk(81, { top: C.teal, hat: 'cap' }), { pose: 'point', dir: 'l', back: true }, { hours: (t) => photoHours(t) && !sunsetWatch(t), sun: false });
    extra(R, 60.15, 12.9, folk(81, { top: C.teal, hat: 'cap' }), (t) => {
      const g = glance(t);
      return g >= 0 ? { pose: 'stand', dir: 'l', back: true, g } : { pose: 'point', dir: 'r', back: true };
    }, {
      hours: (t) => photoHours(t) && sunsetWatch(t), sun: false,
      after: (ctx, t, p, z) => { if (p.g >= 0 && Q.detail) speech(ctx, 60.15, 12.9, z + 2.9, ['Huh.', 'Did you see that?', 'Nope. Nothing.'][p.g], { size: 0.38 }); },
    });
    extra(R, 60.2, 10.3, folk(83, { top: C.coral, style: 'long' }), { pose: 'point', dir: 'r' }, { hours: between(6.5, 21) });
    extra(R, 60.4, 11.05, folk(84, { top: C.white, bottom: C.teal, hat: 'sun' }), { pose: 'stand', dir: 'r' }, { hours: between(6.5, 21) });
    // The painter, who paints the house anyway. You can see his canvas.
    const [ex, ey] = [56.2, 13.45], ez = R.ground(ex, ey);
    R.thing(ex + 0.4, ey + 0.1, (ctx) => {
      line(ctx, [[ex - 0.35, ey + 0.15, ez], [ex, ey, ez + 1.5]], C.wood, 0.06);
      line(ctx, [[ex + 0.35, ey + 0.15, ez], [ex, ey, ez + 1.5]], C.wood, 0.06);
      line(ctx, [[ex, ey - 0.3, ez], [ex, ey, ez + 1.4]], C.wood, 0.06);
      pane(ctx, 'x', 0, ey + 0.06, ex - 0.42, ex + 0.42, ez + 0.75, ez + 1.4, C.white, { lw: 0.04 });
      pane(ctx, 'x', 0, ey + 0.07, ex - 0.36, ex + 0.36, ez + 0.95, ez + 1.34, tint(C.sky, 0.2), { stroke: false });
      pane(ctx, 'x', 0, ey + 0.07, ex - 0.36, ex + 0.36, ez + 0.81, ez + 0.95, INK.marsh, { stroke: false });
      pane(ctx, 'x', 0, ey + 0.08, ex - 0.14, ex + 0.12, ez + 0.9, ez + 1.1, PINKHOUSE, { lw: 0.02 });
      face(ctx, [[ex - 0.17, ey + 0.08, ez + 1.1], [ex + 0.15, ey + 0.08, ez + 1.1], [ex - 0.01, ey + 0.08, ez + 1.22]], ROOF, { lw: 0.02 });
      box(ctx, ex - 0.2, ey + 0.55, ez, 0.4, 0.35, 0.55, C.wood, { flat: true, lw: 0.03 });
    });
    R.thing(ex + 0.3, ey + 0.95, (ctx, t) => {
      if (!between(8, 20.9)(t)) return;
      const sun = sunsetWatch(t);
      person(ctx, ex, ey + 0.75, ez + 0.15, folk(85, { pose: 'sit', dir: 'r', back: true, top: C.purple, hat: 'beanie', arms: sun ? [0.3, 0.2] : [1.35 + Math.sin(t * 2.3) * 0.25, 0.5] }), t);
    }, { anim: true });

    // ---------- The low spot ----------
    // King tide tonight (and then, after midnight, now), facing the road.
    const ktx = 58.9, kty = 13.8, ktz = R.ground(ktx, kty), ktTop = ktz + 0.7;
    feet(R, [[ktx, kty - 0.6, 0.1, C.wood], [ktx, kty + 0.6, 0.1, C.wood]], ktTop);
    const ktBoard = (text, sub) => (ctx) => {
      for (const v of [kty - 0.6, kty + 0.6]) pole(ctx, ktx, v, ktTop, 0.9, C.wood, 0.05);
      plaque(ctx, 'y', ktx + 0.07, kty, ktz + 1.7, 1.8, 0.8, C.coral, [[text, 0.1, 0.16, C.white, 'Bagel Fat One'], [sub, -0.2, 0.1, C.white]], { border: C.white });
    };
    R.thing(ktx + 0.1, kty + 0.9, ktBoard('KING TIDE TONIGHT', 'ROAD MAY FLOOD. IT WILL.'), { on: (t) => !between(23.5, 4)(t) });
    R.thing(ktx + 0.1, kty + 0.9, ktBoard('KING TIDE NOW', 'TOLD YOU.'), { on: between(23.5, 4) });
    // Turn around, don't drown: the island side, facing the drivers who don't.
    const tdx = 64.9, tdy = 18.4, tdz = R.ground(tdx, tdy), tdTop = tdz + 0.7;
    feet(R, [[tdx - 0.55, tdy, 0.1, C.white], [tdx + 0.55, tdy, 0.1, C.white]], tdTop);
    const turnSign = (glint) => (ctx) => {
      if (!glint) for (const u of [tdx - 0.55, tdx + 0.55]) pole(ctx, u, tdy, tdTop, 0.9, C.white, 0.05);
      plaque(ctx, 'x', tdx, tdy + 0.07, tdz + 1.75, 1.7, 0.9, glint ? null : C.white, glint ? [] : [
        ['TURN AROUND', 0.17, 0.18, C.ink, 'Bagel Fat One'],
        ["DON'T DROWN", -0.15, 0.18, C.red, 'Bagel Fat One'],
      ], { border: glint ? LIT : C.red, lw: glint ? 0.001 : 0.05 });
    };
    R.thing(tdx + 0.9, tdy + 0.1, turnSign(false));
    R.thing(tdx + 0.91, tdy + 0.11, turnSign(true), { on: lightsOn });
    // The depth gauge by the dip, with Dave's high-water marks on it.
    const gx = 58.6, gy = 16.8, gzz = R.ground(gx, gy);
    feet(R, [[gx, gy, 0.22, C.white]], gzz + 1.6);
    R.thing(gx + 0.12, gy + 0.12, (ctx) => {
      box(ctx, gx - 0.11, gy - 0.11, gzz + 1.6, 0.22, 0.22, 0.9, C.white, { flat: true, lw: 0.03 });
      if (!Q.detail) return;
      for (let z = gzz + 0.25; z < gzz + 2.45; z += 0.25) line(ctx, [[gx + 0.11, gy - 0.02, z], [gx + 0.11, gy + 0.11, z]], C.ink, 0.03);
      for (const [z, s] of [[gzz + 0.6, '1'], [gzz + 1.1, '2'], [gzz + 1.6, '3'], [gzz + 2.1, '4']]) words(ctx, 'x', gx - 0.03, gy + 0.11, z, s, 0.14, C.ink);
    });
    // After ten, a flashing barrier goes out on the shoulder. Not across the road.
    const bx = 64.9, by = 14.6, bz = R.ground(bx, by), bTop = bz + 0.5;
    const nightShift = between(22, 3);
    feet(R, [[bx - 0.45, by, 0.08, C.white], [bx + 0.45, by, 0.08, C.white]], bTop, nightShift);
    R.thing(bx + 0.6, by + 0.1, (ctx) => {
      for (const u of [bx - 0.45, bx + 0.45]) pole(ctx, u, by, bTop, 0.45, C.white, 0.04);
      pane(ctx, 'x', 0, by + 0.05, bx - 0.6, bx + 0.6, bTop + 0.2, bTop + 0.45, C.white, { lw: 0.03 });
      for (let u = bx - 0.55; u < bx + 0.55; u += 0.3) face(ctx, [[u, by + 0.06, bTop + 0.2], [u + 0.15, by + 0.06, bTop + 0.2], [u + 0.25, by + 0.06, bTop + 0.45], [u + 0.1, by + 0.06, bTop + 0.45]], C.coral, { stroke: false });
      plaque(ctx, 'x', bx, by + 0.06, bTop + 0.1, 1.1, 0.16, C.white, [['ROAD CLOSED (ADVISORY)', 0, 0.09, C.ink]], { lw: 0.02 });
    }, { on: nightShift });
    R.thing(bx + 0.62, by + 0.12, (ctx, t) => {
      const on = mod(t, 1) < 0.5;
      dot(ctx, bx + 0.45, by + 0.05, bTop + 0.6, 0.09, on ? WARN : shade(WARN, 0.4));
    }, { anim: true, on: nightShift });
    R.light({ at: [bx + 0.45, by + 0.4, bTop + 0.6], r: 1.4, color: WARN, k: (t) => (nightShift(t) && mod(t, 1) < 0.5 ? 0.9 : 0) });

    // ---------- Bob's Lobster ----------
    const [sx, sy] = SHACK, S0 = sx - 0.4, S1 = S0 + 3, T0 = sy - 2, T1 = T0 + 2.2, sz = footing(R, S0, T0, 3, 2.2);
    const win = [S0 + 0.25, S0 + 1.3, sz + 0.85, sz + 1.6];
    printed(R, S1, T1, (ctx, ink) => {
      const top = sz + 2, rise = 0.85, m = (T0 + T1) / 2, body = ink(tint(INK.shingle, 0.45));
      box(ctx, S0, T0, sz, 3, 2.2, 2, body, { dotsL: shade(body, 0.5), dens: 0.14, lw: 0.05 });
      if (Q.detail) {
        ctx.strokeStyle = alpha(shade(body, 0.35), 0.5); ctx.lineWidth = 0.025; ctx.beginPath();
        for (let z = sz + 0.28; z < top; z += 0.28) { const [a, b] = P3(S0, T1, z), [c, d] = P3(S1, T1, z), [e, f] = P3(S1, T0, z); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.lineTo(e, f); }
        ctx.stroke();
      }
      // The order window, dark inside, and its counter.
      pane(ctx, 'x', 0, T1, win[0], win[1], win[2], win[3], shade(C.brown, 0.45), { lw: 0.04, stroke: C.white });
      box(ctx, win[0] - 0.05, T1, win[2] - 0.08, win[1] - win[0] + 0.1, 0.22, 0.08, C.white, { flat: true, lw: 0.03 });
      // The menu, chalked.
      plaque(ctx, 'x', S0 + 2.2, T1 + 0.01, sz + 1.25, 1.1, 0.95, shade(C.green, 0.45), [
        ['LOBSTER ROLL', 0.28, 0.13, C.white], ['CHOWDER', 0.1, 0.13, C.white], ['MORE LOBSTER', -0.08, 0.13, C.white],
        ['GREENHEAD SPRAY: NO', -0.3, 0.1, C.butter],
      ], { border: C.wood });
      // The awning over the window, striped.
      for (let i = 0; i < 6; i++) {
        const u0 = win[0] - 0.1 + i * 0.217, u1 = u0 + 0.217;
        face(ctx, [[u0, T1, top - 0.1], [u1, T1, top - 0.1], [u1, T1 + 0.55, top - 0.45], [u0, T1 + 0.55, top - 0.45]], ink(i % 2 ? C.white : C.coral), { lw: 0.03 });
      }
      // Have you seen this goose? On the end the queue faces.
      pane(ctx, 'y', S1 + 0.01, 0, T0 + 0.5, T0 + 1.45, sz + 0.75, sz + 1.75, C.white, { lw: 0.035 });
      if (Q.detail) {
        words(ctx, 'y', S1 + 0.01, T0 + 0.97, sz + 1.62, 'HAVE YOU SEEN', 0.1, C.ink);
        words(ctx, 'y', S1 + 0.01, T0 + 0.97, sz + 1.5, 'THIS GOOSE?', 0.1, C.ink);
        ctx.save();
        const [X, Y] = P3(S1 + 0.02, T0 + 0.97, sz + 1.0);
        ctx.translate(X, Y); ctx.transform(1, -0.5, 0, 1, 0, 0);
        ctx.beginPath(); ctx.ellipse(0, 0, 0.18, 0.1, 0, 0, Math.PI * 2);
        ctx.moveTo(0.1, -0.05); ctx.quadraticCurveTo(0.2, -0.3, 0.14, -0.34);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.stroke();
        ctx.restore();
        words(ctx, 'y', S1 + 0.01, T0 + 0.97, sz + 0.84, 'ANSWERS TO: HONK', 0.075, C.red);
      }
      // The roof, and the word on it.
      face(ctx, [[S0, T0, top], [S1, T0, top], [S1, m, top + rise], [S0, m, top + rise]], ink(shade(C.coral, 0.15)), { lw: 0.05 });
      face(ctx, [[S1, T0, top], [S1, T1, top], [S1, m, top + rise]], shade(body, 0.06), { lw: 0.05, stroke: C.white });
      face(ctx, [[S0 - 0.1, T1 + 0.1, top], [S1 + 0.1, T1 + 0.1, top], [S1 + 0.1, m, top + rise], [S0 - 0.1, m, top + rise]], ink(C.coral), { lw: 0.05, dots: Q.detail ? ink(shade(C.coral, 0.4)) : null, density: 0.12 });
      for (const u of [S0 + 0.8, S0 + 2.2]) pole(ctx, u, m, top + rise - 0.05, 0.45, C.ink, 0.03);
      plaque(ctx, 'x', S0 + 1.5, m, top + rise + 0.7, 2.8, 0.62, C.white, [["BOB'S LOBSTER", 0, 0.3, C.coral, 'Bagel Fat One']], { border: C.coral });
      // Bins round the side, for the gulls.
      cylinder(ctx, S1 + 0.35, T0 + 0.2, sz, 0.22, 0.6, ink(C.teal));
    }, { veil: (ctx, v) => {
      const top = sz + 2, rise = 0.85, m = (T0 + T1) / 2;
      v([[S0, T0, sz, 3, 2.2, 2]], [
        [[S0, T0, top], [S1, T0, top], [S1, m, top + rise], [S0, m, top + rise]], [[S1, T0, top], [S1, T1, top], [S1, m, top + rise]],
        [[S0 - 0.1, T1 + 0.1, top], [S1 + 0.1, T1 + 0.1, top], [S1 + 0.1, m, top + rise], [S0 - 0.1, m, top + rise]],
        [[win[0] - 0.1, T1, top - 0.1], [win[0] + 1.2, T1, top - 0.1], [win[0] + 1.2, T1 + 0.55, top - 0.45], [win[0] - 0.1, T1 + 0.55, top - 0.45]],
      ]);
    } });
    // The window and the bulbs, lit after dark.
    R.thing(S1 + 0.01, T1 + 0.01, (ctx) => pane(ctx, 'x', 0, T1, win[0], win[1], win[2], win[3], LIT, { lw: 0.04, stroke: C.white }), { on: lightsOn });
    // The cook, in the window, all day. Tap the window and he bobs up to it
    // (any hour: Bob is always in, and so is everyone else called Bob).
    const hatch = R.poke({ id: 'window', at: [(win[0] + win[1]) / 2, T1 + 0.05, (win[2] + win[3]) / 2], r: 0.8, hold: 2.5, teach: true,
      say: ["Bob's not in. I'm also Bob.", "We're all Bob here.", 'One lobster roll, coming up.'] });
    R.thing(S1 + 0.02, T1 + 0.02, (ctx, t) => {
      const k = hatch.k();
      if (!between(10.3, 20.7)(t) && k < 0.05) return;
      ctx.save();
      poly(ctx, [[win[0], T1, win[2]], [win[1], T1, win[2]], [win[1], T1, win[3]], [win[0], T1, win[3]]]);
      ctx.clip();
      const cx = win[0] + 0.55 + Math.sin(t * 0.7) * 0.2 * (1 - k);
      person(ctx, cx, T1 - 0.2 + 0.15 * k, sz + 0.2 + 0.3 * k, folk(90, { hat: 'chef', top: C.white, pose: k > 0.3 || mod(t, 6) < 1 ? 'wave' : 'carry', dir: 'l' }), t);
      ctx.restore();
    }, { anim: true });
    // A string of bulbs from Bob's corner to a pole by Dave's truck.
    const bulbPole = [64.4, 12.6], bpz = R.ground(...bulbPole);
    const bulbs = [];
    for (let i = 0; i <= 8; i++) {
      const u = i / 8, x = S0 + (bulbPole[0] - S0) * u, y = T1 + (bulbPole[1] - T1) * u;
      bulbs.push([x, y, (sz + 2) * (1 - u) + (bpz + 2.5) * u - Math.sin(u * Math.PI) * 0.4]);
    }
    R.thing(bulbPole[0] + 0.05, bulbPole[1] + 0.05, (ctx) => {
      pole(ctx, bulbPole[0], bulbPole[1], bpz, 2.55, C.wood, 0.05);
      line(ctx, bulbs, C.ink, 0.025);
      if (Q.detail) for (const b of bulbs) dot(ctx, b[0], b[1], b[2] - 0.07, 0.06, C.white);
    });
    R.thing(bulbPole[0] + 0.06, bulbPole[1] + 0.06, (ctx) => { for (const b of bulbs) dot(ctx, b[0], b[1], b[2] - 0.07, 0.08, LIT); }, { on: lightsOn });
    nightGlow(R, S0 + 1, T1 + 1.2, sz + 1.2, 2.6, LIT, 0.85);
    // The queue, since they opened. (Moved up a little for the crates at the
    // end of it: the goose was last in line, then got bored.)
    const queue = [[66.2, 11.4, 70], [67.1, 11.7, 71], [67.95, 11.6, 72]];
    // (The two by the shack stand in front of it: they sort after it, or its
    // roof would cover their heads.)
    queue.forEach(([x, y, s], i) => {
      extra(R, x, y, folk(s), { pose: i === 0 ? 'point' : i === 1 ? 'read' : 'stand', dir: 'l', back: true }, { hours: between(10.5, 20.5), ...(i ? { depth: S1 + T1 + 0.05 + i * 0.01 } : {}) });
    });
    // (No picnic table on the lot: behind Bob's, Dave's truck hid it and only
    // a head showed, and the lot has no dry corner left you can see. Lobster
    // rolls get eaten on the deck at the island end.)
    // The gull: on the ridge, down to the gulls' bin by Bob's, a rummage,
    // and back up. (The fry thief is the Town Beach's; this one does bins.)
    const ridge = [S0 + 2.4, (T0 + T1) / 2, sz + 2.85], grab = [S1 + 0.35, T0 + 0.2, sz + 0.62];
    R.mover((t) => {
      const k = mod(t, 16), open = between(11, 20.2)(t);
      if (!open || k < 8) return { x: ridge[0], y: ridge[1], z: ridge[2], fly: false, f: -1 };
      if (k < 10) { const u = (k - 8) / 2; return { x: ridge[0] + (grab[0] - ridge[0]) * u, y: ridge[1] + (grab[1] - ridge[1]) * u, z: ridge[2] + (grab[2] - ridge[2]) * u + Math.sin(u * Math.PI) * 1.2, fly: true, f: 1 }; }
      if (k < 12) return { x: grab[0], y: grab[1], z: grab[2], fly: false, f: 1, peck: true };
      if (k < 14) { const u = (k - 12) / 2; return { x: grab[0] + (ridge[0] - grab[0]) * u, y: grab[1] + (ridge[1] - grab[1]) * u, z: grab[2] + (ridge[2] - grab[2]) * u + Math.sin(u * Math.PI) * 1.2, fly: true, f: -1 }; }
      return { x: ridge[0], y: ridge[1], z: ridge[2], fly: false, f: -1 };
    }, (ctx, t, p) => gull(ctx, p.x, p.y, p.z, t, { fly: p.fly, dir: p.f, peck: p.peck }), { bias: 1 });
    // Dave himself, parked (a still picture while he's parked: day.js).
    parkedDave(R);
    // Dave's lot: his photo board, his chair (reserved), his cooler.
    const [dbx, dby] = [65.3, 12.95], dbz = R.ground(dbx, dby);
    R.thing(dbx + 0.8, dby + 0.1, (ctx) => {
      for (const u of [dbx - 0.65, dbx + 0.65]) pole(ctx, u, dby, dbz, 1.1, C.wood, 0.05);
      plaque(ctx, 'x', dbx, dby + 0.06, dbz + 1.4, 1.6, 0.95, C.white, [['EVERY KING TIDE', 0.34, 0.13, C.red, 'Bagel Fat One'], ['SINCE 1987', -0.36, 0.1, C.ink]], { border: C.red });
      // His photos: the truck, in water, every year, getting deeper.
      for (let i = 0; i < 4; i++) {
        const u = dbx - 0.62 + i * 0.32, w = 0.26;
        pane(ctx, 'x', 0, dby + 0.07, u, u + w, dbz + 1.18, dbz + 1.56, tint(C.sky, 0.3), { lw: 0.02 });
        pane(ctx, 'x', 0, dby + 0.07, u + 0.05, u + w - 0.05, dbz + 1.24, dbz + 1.34, C.red, { stroke: false });
        pane(ctx, 'x', 0, dby + 0.07, u, u + w, dbz + 1.18, dbz + 1.25 + i * 0.035, alpha(C.water, 0.85), { stroke: false });
      }
    });
    const [chx, chy] = [63.75, 12.7], chz = R.ground(chx, chy);
    R.thing(chx + 0.3, chy + 0.8, (ctx) => {
      // The lawn chair, facing the road, nobody in it.
      box(ctx, chx - 0.25, chy - 0.25, chz + 0.35, 0.5, 0.5, 0.05, C.teal, { flat: true, lw: 0.03 });
      face(ctx, [[chx + 0.25, chy - 0.25, chz + 0.4], [chx + 0.25, chy + 0.25, chz + 0.4], [chx + 0.4, chy + 0.25, chz + 1.0], [chx + 0.4, chy - 0.25, chz + 1.0]], C.teal, { lw: 0.03, dots: Q.detail ? C.white : null, density: 0.3 });
      for (const [u, v] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) line(ctx, [[chx + u, chy + v, chz], [chx + u, chy + v, chz + 0.36]], C.greyLight, 0.035);
      words(ctx, 'y', chx + 0.33, chy, chz + 0.8, 'DAVE', 0.1, C.white);
    });
    // His cooler: Gander Cola, take a gander. Packed for the flood, and the
    // end of his snorkel won't fit under the lid.
    const [cox, coy, cw, cd, ch] = [chx - 0.42, chy + 0.35, 0.72, 0.46, 0.44], coz = chz;
    const cooler = R.poke({ id: 'cooler', at: [cox + cw / 2, coy + cd / 2, coz + 0.35], r: 0.7, sound: 'clunk', say: "Dave's. Hands off." });
    const coolerAt = (ctx, k) => {
      const zt = coz + ch, a = k * 1.75, cs = Math.cos(a), sn = Math.sin(a), Lc = cd;
      const pt = (x, u, w) => [x, coy + u * cs - sn * w, zt + u * sn + cs * w];
      const lid = () => { const c = []; for (const x of [cox, cox + cw]) c.push(pt(x, 0, 0), pt(x, Lc, 0), pt(x, Lc, 0.07), pt(x, 0, 0.07)); solid(ctx, c, C.white); };
      if (k > 0.15) lid();
      box(ctx, cox, coy, coz, cw, cd, ch, BRAND.can, { flat: true, lw: 0.035, top: k > 0.15 ? shade(BRAND.can, 0.55) : C.white });
      words(ctx, 'x', cox + cw / 2, coy + cd, coz + 0.24, BRAND.name, 0.08, BRAND.ink, 'Bagel Fat One');
      // The snorkel: up out of the ice when it's open, its tip out of the
      // back corner when it's shut.
      const sx0 = cox + cw * 0.6, sy0 = coy + cd * 0.45, up = 0.15 + 0.45 * k;
      const tube = (pts) => { line(ctx, pts, C.ink, 0.14); line(ctx, pts, C.mustard, 0.09); };
      if (k > 0.15) {
        tube([[sx0, sy0, zt - 0.05], [sx0, sy0, zt + up + 0.5], [sx0 - 0.18, sy0, zt + up + 0.62]]);
        const [X, Y] = P3(sx0 + 0.1, sy0 + 0.05, zt + up + 0.05);
        ctx.beginPath(); ctx.ellipse(X, Y, 0.3, 0.19, 0, 0, Math.PI * 2);
        paint(ctx, C.teal, { lw: 0.035 });
        ctx.beginPath(); ctx.ellipse(X, Y, 0.21, 0.11, 0, 0, Math.PI * 2);
        paint(ctx, tint(C.sky, 0.3), { lw: 0.02 });
      } else {
        tube([[cox + 0.12, coy + 0.1, zt - 0.02], [cox + 0.1, coy + 0.08, zt + 0.32], [cox - 0.02, coy + 0.08, zt + 0.4]]);
        lid();
      }
    };
    calm(R, cox + cw, coy + cd, (ctx) => coolerAt(ctx, cooler.k()), () => cooler.k() > 0.001);

    // ---------- The drawbridge ----------
    // Two leaves hinged on piers either side of the river, which lift for a
    // boat (day.js), a tender's hut, gates, a bell, lights for the road and
    // the river, and the memorial flags at its mainland end.
    const [B0, B1] = BRIDGE, LEAF = RIVER - B0, BX0 = PIKE - 1.5, BX1 = PIKE + 1.5;
    const road = (t) => mix(LAND.road, EVENING.road, q8(nightK(t)));
    const bot = (x, y, t) => Math.max(h(x, y), level(t));
    // The ramps up to the deck and the piers, drawn from the water up.
    const ramp = (ctx, t, ya, yb, x0 = BX0 + 0.2, x1 = BX1 - 0.2) => {
      const za = roadZ(PIKE, ya), zb = roadZ(PIKE, yb);
      const c = [[x0, ya, bot(x0, ya, t)], [x0, yb, bot(x0, yb, t)], [x0, yb, zb], [x0, ya, za], [x1, ya, bot(x1, ya, t)], [x1, yb, bot(x1, yb, t)], [x1, yb, zb], [x1, ya, za]];
      solid(ctx, c, CONCRETE, { 4: road(t) });
    };
    const pier = (ctx, t, x0, x1, y0, y1, top) => {
      const b = Math.max(level(t), Math.min(h(x0, y1), h(x1, y1)));
      if (b < top) box(ctx, x0, y0, b, x1 - x0, y1 - y0, top - b, CONCRETE, { dotsL: shade(CONCRETE, 0.5), dens: 0.16, lw: 0.04 });
    };
    // The mainland side: its ramp, its pier, and the tender's platform.
    R.thing(BX0, 17.6, (ctx, t) => {
      pier(ctx, t, 58.4, 60.4, B0, 21, DECK - 0.3);
      pier(ctx, t, BX0 + 0.2, BX1 - 0.2, B0, B0 + 0.9, DECK - 0.3);
      ramp(ctx, t, 17.6, B0);
    }, { anim: true, depth: 77.8 });
    // The island side.
    R.thing(BX0, B1, (ctx, t) => ramp(ctx, t, B1, 27.2), { anim: true, depth: BX0 + B1 + 0.3 });
    R.thing(BX0, B1, (ctx, t) => pier(ctx, t, BX0 + 0.2, BX1 - 0.2, B1 - 0.9, B1, DECK - 0.3), { anim: true, depth: (t) => (bridgeUp(t) > 0 ? BX1 + B1 - 0.2 : 80) });
    // A leaf: hinged at y0, reaching toward the middle (s: +1 or -1), up by k.
    const leaf = (ctx, t, y0, s) => {
      const k = bridgeUp(t), th = k * 1.3, cs = Math.cos(th), sn = Math.sin(th), L = LEAF - 0.03;
      const pt = (x, u, w) => [x, y0 + s * u * cs - s * sn * w, DECK + u * sn + cs * w];
      const c = [];
      for (const x of [BX0, BX1]) c.push(pt(x, 0, -0.32), pt(x, L, -0.32), pt(x, L, 0), pt(x, 0, 0));
      solid(ctx, c, STEEL, { 4: road(t) });
      if (k < 0.3 && Q.detail) {
        ctx.save(); ctx.setLineDash([0.5, 0.4]);
        line(ctx, [pt(PIKE, 0.2, 0.01), pt(PIKE, L - 0.2, 0.01)], alpha(C.white, 0.7), 0.1);
        ctx.restore();
      }
      // Railings along both edges.
      for (const x of [BX0 + 0.08, BX1 - 0.08]) {
        line(ctx, [pt(x, 0, 0.5), pt(x, L, 0.5)], STEEL, 0.07);
        if (Q.detail) for (let u = 0; u <= L; u += 0.75) line(ctx, [pt(x, u, 0), pt(x, u, 0.5)], STEEL, 0.04);
      }
      // The light at the tip for the boats: green for go through, red
      // (flashing) while it's up.
      const tip = pt(BX1, L, 0.1);
      if (k > 0.05) dot(ctx, tip[0], tip[1], tip[2], 0.1, mod(t, 0.8) < 0.4 ? C.red : shade(C.red, 0.4));
    };
    const moving = (t) => bridgeUp(t) > 0;
    calm(R, BX0, B0, (ctx, t) => leaf(ctx, t, B0, 1), moving, { depth: 79.9 });
    calm(R, BX0, B1, (ctx, t) => leaf(ctx, t, B1, -1), moving, { depth: 80.1, busyDepth: (t) => (bridgeUp(t) > 0 ? BX1 + B1 : 80.1) });
    // The green tip lights for the boats, after dark, while it's down.
    R.thing(BX1, B1 - 0.2, (ctx) => { for (const y of [RIVER - 0.05, RIVER + 0.05]) dot(ctx, BX1, y, DECK + 0.1, 0.1, C.leaf); }, { on: (t) => lightsOn(t) && !moving(t), depth: 80.2 });
    // The tender's hut, on its platform at the mainland end.
    const hutZ = DECK - 0.3, HX0 = 58.6, HX1 = 60.1, HY0 = 19.4, HY1 = 20.4;
    printed(R, HX1, HY1, (ctx, ink) => {
      box(ctx, HX0, HY0, hutZ, HX1 - HX0, HY1 - HY0, 1.5, ink(C.white), { dotsL: ink(shade(C.white, 0.35)), dens: 0.1, lw: 0.04 });
      pane(ctx, 'x', 0, HY1, HX0 + 0.2, HX0 + 0.7, hutZ + 0.7, hutZ + 1.25, HOUSE.glass, { lw: 0.03, stroke: C.teal });
      pane(ctx, 'y', HX1, 0, HY0 + 0.2, HY1 - 0.2, hutZ + 0.7, hutZ + 1.25, HOUSE.glass, { lw: 0.03, stroke: C.teal });
      pane(ctx, 'x', 0, HY1, HX0 + 0.9, HX0 + 1.35, hutZ, hutZ + 1.2, C.teal, { lw: 0.03 });
      box(ctx, HX0 - 0.1, HY0 - 0.1, hutZ + 1.5, HX1 - HX0 + 0.2, HY1 - HY0 + 0.2, 0.12, ink(C.teal), { flat: true, lw: 0.04 });
      pole(ctx, HX0 + 0.75, HY0 + 0.5, hutZ + 1.62, 0.35, C.ink, 0.03);
      if (Q.detail) for (let x = 58.5; x < 60.4; x += 0.45) line(ctx, [[x, 20.95, hutZ], [x, 20.95, hutZ + 0.5]], C.white, 0.035);
      if (Q.detail) line(ctx, [[58.45, 20.95, hutZ + 0.5], [60.35, 20.95, hutZ + 0.5]], C.white, 0.05);
    }, { veil: (ctx, v) => v([[HX0, HY0, hutZ, HX1 - HX0, HY1 - HY0, 1.5], [HX0 - 0.1, HY0 - 0.1, hutZ + 1.5, HX1 - HX0 + 0.2, HY1 - HY0 + 0.2, 0.12]]) });
    R.thing(HX1 + 0.01, HY1 + 0.01, (ctx) => {
      pane(ctx, 'x', 0, HY1, HX0 + 0.2, HX0 + 0.7, hutZ + 0.7, hutZ + 1.25, LIT, { lw: 0.03, stroke: C.teal });
      pane(ctx, 'y', HX1, 0, HY0 + 0.2, HY1 - 0.2, hutZ + 0.7, hutZ + 1.25, LIT, { lw: 0.03, stroke: C.teal });
    }, { on: lightsOn });
    // The bell on the roof, swinging while the bridge moves; and it says so.
    // Anyone can ring it. The bridge doesn't care.
    const bell = R.poke({ id: 'bell', at: [HX0 + 0.75, HY0 + 0.5, hutZ + 1.85], r: 0.7, hold: 1.4, sound: 'tick',
      say: ['DING. Nobody moved.', 'DING. The bridge stays down.', "He's reading. Let him read."] });
    calm(R, HX1 + 0.02, HY1 + 0.02, (ctx, t) => {
      const k = bridgeUp(t), ring = (k > 0 && k < 1) || bell.k() > 0.02;
      const sw = ring ? Math.sin(t * 9) * 0.35 : 0, [X, Y] = P3(HX0 + 0.75, HY0 + 0.5, hutZ + 1.95);
      ctx.save(); ctx.translate(X, Y); ctx.rotate(sw);
      ctx.beginPath(); ctx.moveTo(-0.14, 0.26); ctx.quadraticCurveTo(-0.14, 0, 0, 0); ctx.quadraticCurveTo(0.14, 0, 0.14, 0.26); ctx.closePath();
      paint(ctx, WARN, { lw: 0.03 });
      ctx.restore();
      if (ring && Q.detail && mod(t, 1) < 0.6) label(ctx, HX0 + 0.3, HY0 + 0.2, hutZ + 2.6 + mod(t, 1) * 0.4, 'DING', 0.3, C.ink);
    }, (t) => moving(t) || bell.k() > 0.02);
    // The tender, on his platform. Waves the boat through; waves at the queue.
    const tender = folk(96, { top: C.navy, bottom: C.navy, hat: 'cap' }), up = (t) => bridgeUp(t) > 0;
    extra(R, 59.3, 20.75, tender, { pose: 'read', dir: 'r' }, { z: hutZ, depth: HX1 + HY1 + 0.4, hours: (t) => !up(t) });
    extra(R, 59.3, 20.75, tender, () => ({ pose: 'wave', dir: 'r' }), { z: hutZ, depth: HX1 + HY1 + 0.4, hours: up, sun: false });
    // The gates, down across the road while the bridge is up, lights flashing.
    const gates = [[63.85, 18.35, -1], [60.15, 26.6, 1]];
    for (const [gxx, gyy, dir] of gates) {
      const g0 = roadZ(PIKE, gyy) - 0.1;
      calm(R, gxx + 0.1, gyy + 0.1, (ctx, t) => {
        const k = clamp01(bridgeUp(t) * 4), a = k * Math.PI / 2, len = 2.1, pz = g0 + 0.9;
        pole(ctx, gxx, gyy, g0, 1.2, C.white, 0.07);
        const flash = k > 0 && mod(t, 0.8) < 0.4;
        dot(ctx, gxx, gyy + 0.08, g0 + 1.3, 0.09, flash ? C.red : shade(C.red, 0.45));
        dot(ctx, gxx + 0.08, gyy, g0 + 1.3, 0.09, !flash && k > 0 ? C.red : shade(C.red, 0.45));
        for (let i = 0; i < 4; i++) {
          const u0 = (i / 4) * len, u1 = ((i + 1) / 4) * len;
          const P = (u) => [gxx + dir * Math.sin(a) * u, gyy, pz + Math.cos(a) * u];
          line(ctx, [P(u0), P(u1)], i % 2 ? C.white : C.red, 0.1);
        }
      }, moving);
    }
    R.light({ at: [PIKE, RIVER, 2.6], r: 3.6, color: C.red, k: (t) => (bridgeUp(t) > 0 && mod(t, 0.8) < 0.4 ? 0.8 : 0) });
    // The memorial flags at the mainland end, south side, and their stone.
    const flags = [[59.6, 17.9, 'us'], [59.0, 17.9, 'pow'], [58.4, 17.9, 'ma']];
    const fz = R.ground(59, 17.9), fTop = fz + 0.6;
    feet(R, flags.map(([x, y]) => [x, y, 0.08, C.white]).concat([[59.0, 18.75, 0.5, GRANITE]]), fTop);
    R.thing(59.8, 19.1, (ctx) => {
      for (const [x, y] of flags) pole(ctx, x, y, fTop, 2.6, C.white, 0.04);
      box(ctx, 58.75, 18.5, fTop, 0.5, 0.5, 0.35, GRANITE, { dotsL: shade(GRANITE, 0.45), dens: 0.14, lw: 0.04 });
      plaque(ctx, 'x', 59, 19.01, fTop + 0.2, 0.36, 0.2, tint(C.mustard, 0.1), [['IN HONOR', 0, 0.06, C.ink]], { lw: 0.02 });
    });
    R.thing(60.5, 18.0, (ctx, t) => {
      for (const [x, y, kind] of flags) {
        const z1 = fTop + 2.55, z0 = z1 - 0.48, N = 5, lenF = 0.85;
        const pts = (zz) => Array.from({ length: N + 1 }, (_, i) => { const u = i / N; return [x + 0.04 + u * lenF, y + Math.sin(t * 4 + u * 4 + x) * 0.08 * u, zz - u * 0.06]; });
        const top = pts(z1), bottom = pts(z0);
        const base = kind === 'pow' ? C.black : C.white;
        face(ctx, [...top, ...bottom.reverse()], base, { lw: 0.03 });
        if (!Q.detail) continue;
        if (kind === 'us') {
          for (const f of [0.2, 0.5, 0.8]) { const a = pts(z1 - f * 0.48 + 0.05), b = pts(z1 - f * 0.48 - 0.05); face(ctx, [...a, ...b.reverse()], C.red, { stroke: false }); }
          const a = pts(z1).slice(0, 3), b = pts(z1 - 0.26).slice(0, 3);
          face(ctx, [...a, ...b.reverse()], C.navy, { stroke: false });
        } else {
          const m = pts((z0 + z1) / 2)[2];
          dot(ctx, m[0], m[1], m[2], 0.1, kind === 'pow' ? C.white : C.navy, false);
        }
      }
    }, { anim: true });

    // ---------- The river ----------
    // The boats the bridge opens for: a lobster boat at dawn (the Courier
    // waits), a sailboat in the afternoon (everyone waits).
    OPENINGS.forEach(([a, b], i) => {
      const o = i
        ? { mast: 3.6, len: 2.8, color: C.white, stripe: C.navy, sail: C.white }
        : { cabin: C.teal, len: 2.6, color: C.white, stripe: C.coral };
      const look = folk(i ? 97 : 98, i ? { top: C.white, hat: 'sun' } : { top: C.mustard, bottom: C.mustard });
      R.mover((t) => {
        const hr = hour(t);
        if (hr < a - 0.2 || hr > b + 0.2) return { x: 70, y: RIVER, away: true };
        const u = (hr - (a - 0.2)) / (b - a + 0.4);
        return { x: 94 - u * 45, y: RIVER };
      }, (ctx, t, p) => {
        if (p.away) return;
        boat(ctx, p.x, p.y, t, { along: 'x', dir: -1, wid: 1, ...o });
        const z = float(p.x, p.y, t) + 0.3;
        if (!i) {
          // Traps stacked on the stern, and the lobsterman.
          if (Q.detail) for (let k = 0; k < 2; k++) box(ctx, p.x + 0.55, p.y - 0.3 + k * 0.32, z, 0.4, 0.28, 0.25, mix(C.wood, C.teal, 0.3), { flat: true, lw: 0.025 });
          who(ctx, p.x + 0.1, p.y + 0.15, z, look, null, { pose: 'wave', dir: 'r' }, t);
        } else who(ctx, p.x + 0.9, p.y, z, look, null, { pose: 'sit', dir: 'l' }, t);
      });
    });
    // A channel marker, bobbing.
    R.mover((t) => ({ x: 79, y: RIVER + 0.4, z: float(79, RIVER + 0.4, t) + Math.sin(t * 1.6) * 0.04 }), (ctx, t, p) => {
      cylinder(ctx, p.x, p.y, p.z - 0.05, 0.18, 0.55, C.red);
      face(ctx, [[p.x - 0.18, p.y, p.z + 0.5], [p.x + 0.18, p.y, p.z + 0.5], [p.x, p.y, p.z + 0.75]], C.red, { lw: 0.03 });
    });
    // A fisherman on the island bank, casting into the river. (Clear of the
    // ice cream window: from the Center he stood on its roof.)
    const fish = [66.4, 26.55], bob = [66.6, 24.1];
    // (He and his rod are a still picture; only the line and the bobber move.)
    const fishing = between(5, 20.95), fsz = R.ground(...fish), tip = [fish[0] + 0.3, fish[1] - 1.3, fsz + 2.9];
    extra(R, fish[0], fish[1], folk(99, { top: C.green, bottom: C.brown, hat: 'sun' }), { pose: 'point', dir: 'r', back: true }, { hours: fishing, sun: false });
    R.thing(fish[0] + 0.01, fish[1] + 0.01, (ctx) => line(ctx, [[fish[0] + 0.2, fish[1] - 0.25, fsz + 1.3], tip], C.ink, 0.04), { on: fishing });
    R.thing(fish[0] + 0.02, fish[1] + 0.02, (ctx, t) => {
      if (!Q.detail) return;
      const L = Math.max(level(t), h(...bob));
      line(ctx, [tip, [bob[0], bob[1], L + 0.05]], alpha(C.ink, 0.6), 0.015);
      dot(ctx, bob[0], bob[1], L + 0.08 + Math.sin(t * 2.5) * 0.03, 0.06, C.coral);
    }, { anim: true, on: fishing });

    // ---------- The deck ----------
    // A restaurant deck at the island end, facing the marsh and the sunset,
    // on legs in the river bank (drawn live, from the water up).
    const [dx, dy] = DECK_AT, X0 = dx - 3.2, X1 = dx + 1.8, Y0 = dy - 1.1, Y1 = dy + 1.1, DZ = 1.25;
    const legs = [];
    for (const x of [X0 + 0.1, X0 + 1.8, dx + 0.2, X1 - 0.2]) for (const y of [Y0 + 0.1, Y1 - 0.2]) legs.push([x, y]);
    const legsAt = (ctx, L) => {
      for (const [x, y] of legs) {
        const b = Math.max(h(x, y), L);
        if (b < DZ - 0.15) box(ctx, x, y, b, 0.16, 0.16, DZ - 0.15 - b, shade(C.wood, 0.2), { flat: true, lw: 0.03 });
      }
    };
    // (Dry under the deck most of the day: a still picture.)
    const legsDry = Math.min(...legs.map(([x, y]) => h(x, y))) - 0.01, dryDeck = (t) => level(t) < legsDry;
    R.thing(X0, Y0, (ctx) => legsAt(ctx, -9), { depth: X0 + Y0 - 0.2, on: dryDeck });
    R.thing(X0, Y0, (ctx, t) => legsAt(ctx, level(t)), { anim: true, depth: X0 + Y0 - 0.2, on: (t) => !dryDeck(t) });
    printed(R, X0, Y0 + 0.01, (ctx, ink) => {
      box(ctx, X0, Y0, DZ - 0.18, X1 - X0, Y1 - Y0, 0.18, ink(tint(C.wood, 0.25)), { flat: true, lw: 0.04, top: ink(tint(C.woodLight, 0.2)) });
      if (Q.detail) {
        ctx.strokeStyle = alpha(shade(C.wood, 0.3), 0.5); ctx.lineWidth = 0.025; ctx.beginPath();
        for (let x = X0 + 0.35; x < X1; x += 0.35) { const [a, b] = P3(x, Y0, DZ), [c, d] = P3(x, Y1, DZ); ctx.moveTo(a, b); ctx.lineTo(c, d); }
        ctx.stroke();
      }
      // The rail along the river side and the ends.
      for (let x = X0 + 0.1; x <= X1; x += 0.5) line(ctx, [[x, Y0 + 0.05, DZ], [x, Y0 + 0.05, DZ + 0.75]], C.white, 0.04);
      line(ctx, [[X0 + 0.05, Y1 - 0.05, DZ + 0.75], [X0 + 0.05, Y0 + 0.05, DZ + 0.75], [X1 - 0.05, Y0 + 0.05, DZ + 0.75]], C.white, 0.07);
      // The bar at the road end, with its hatch.
      const bw = 1.3;
      box(ctx, X0, Y0 + 0.2, DZ, bw, Y1 - Y0 - 0.4, 1.9, ink(HOUSE.body[4]), { dotsL: ink(shade(HOUSE.body[4], 0.45)), dens: 0.12, lw: 0.04 });
      box(ctx, X0 - 0.1, Y0 + 0.1, DZ + 1.9, bw + 0.2, Y1 - Y0 - 0.2, 0.12, ink(C.teal), { flat: true, lw: 0.04 });
      pane(ctx, 'y', X0 + bw, 0, Y0 + 0.5, Y1 - 0.5, DZ + 0.8, DZ + 1.5, shade(C.brown, 0.45), { lw: 0.035, stroke: C.white });
      box(ctx, X0 + bw, Y0 + 0.45, DZ + 0.75, 0.2, Y1 - Y0 - 0.9, 0.07, C.white, { flat: true, lw: 0.025 });
      words(ctx, 'y', X0 + bw, dy, DZ + 1.7, 'SUNSET AT 8:20. BOOK NOW.', 0.1, C.ink);
    }, { veil: (ctx, v) => v([[X0, Y0, DZ - 0.18, X1 - X0, Y1 - Y0, 0.18], [X0, Y0 + 0.2, DZ, 1.3, Y1 - Y0 - 0.4, 1.9], [X0 - 0.1, Y0 + 0.1, DZ + 1.9, 1.5, Y1 - Y0 - 0.2, 0.12]]) });
    // Its tables and lanterns.
    // (Each its own picture, sorted just in front of whoever sits behind it.)
    const tables = [[dx - 0.8, dy - 0.2], [dx + 0.9, dy + 0.2]];
    for (const [x, y] of tables) {
      R.thing(x, y, (ctx) => {
        line(ctx, [[x, y, DZ], [x, y, DZ + 0.75]], C.ink, 0.05);
        disc(ctx, x, y, DZ + 0.78, 0.38, C.white, { lw: 0.03 });
        box(ctx, x - 0.06, y - 0.06, DZ + 0.8, 0.12, 0.12, 0.18, C.ink, { flat: true, lw: 0.02 });
      }, { depth: x + y + 0.3 });
      R.thing(x, y, (ctx) => dot(ctx, x, y, DZ + 0.9, 0.07, LIT), { on: lightsOn, depth: x + y + 0.31 });
    }
    // String lights on four posts, over everyone's heads.
    const posts = [[X0 + 1.45, Y0 + 0.1], [X1 - 0.1, Y0 + 0.1], [X1 - 0.1, Y1 - 0.1], [X0 + 1.45, Y1 - 0.1]];
    const strings = [];
    for (let i = 0; i < 4; i++) {
      const a = posts[i], b = posts[(i + 1) % 4], pts = [];
      for (let k = 0; k <= 6; k++) { const u = k / 6; pts.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, DZ + 3.2 - Math.sin(u * Math.PI) * 0.35]); }
      strings.push(pts);
    }
    R.thing(X1 + 0.1, Y1 + 0.1, (ctx) => {
      for (const [x, y] of posts) pole(ctx, x, y, DZ, 3.25, C.wood, 0.05);
      for (const s of strings) { line(ctx, s, C.ink, 0.025); if (Q.detail) for (const p of s) dot(ctx, p[0], p[1], p[2] - 0.06, 0.05, C.white); }
    });
    R.thing(X1 + 0.11, Y1 + 0.11, (ctx) => { for (const s of strings) for (const p of s) dot(ctx, p[0], p[1], p[2] - 0.06, 0.07, LIT); }, { on: lightsOn });
    nightGlow(R, dx, dy + 0.3, DZ + 1.4, 2.8, LIT, 0.9);
    // The diners, who all get up for the sunset, and the waiter. Those
    // sitting sit on stools behind their tables, so you see the tables.
    const dinerHours = between(11.5, 23);
    [[dx - 0.8, dy - 0.75, 211, 'sit', 'l'], [dx - 1.35, dy - 0.2, 213, 'sit', 'r'], [dx + 1.4, dy - 0.8, 215, 'stand', 'r'], [dx + 0.9, dy - 0.4, 217, 'sit', 'l']].forEach(([x, y, s, pose, dir], i) => {
      if (pose === 'sit') {
        R.thing(x, y, (ctx) => {
          line(ctx, [[x, y, DZ], [x, y, DZ + 0.37]], C.ink, 0.06);
          disc(ctx, x, y, DZ + 0.4, 0.2, C.wood, { lw: 0.03 });
        }, { depth: x + y - 0.01 });
      }
      extra(R, x, y, folk(s), { pose: pose === 'stand' ? 'point' : pose, dir, back: i === 2 }, { z: DZ, hours: dinerHours, sun: i === 2 ? 'point' : 'stand' });
    });
    R.mover((t) => {
      const k = mod(t, 14), u = k < 7 ? k / 7 : 2 - k / 7;
      return { x: X0 + 1.7 + (X1 - X0 - 2.1) * u, y: Y1 - 0.4, moving: true, dir: k < 7 ? 'r' : 'l' };
    }, (ctx, t, p) => {
      if (!between(11.5, 22.5)(t)) return;
      const sun = sunsetWatch(t);
      who(ctx, p.x, p.y, DZ, folk(219, { top: C.white, bottom: C.ink }), null, sun ? { pose: 'stand', dir: 'r', back: true } : { pose: 'walk', dir: p.dir }, t);
      if (!sun) box(ctx, p.x + (p.dir === 'r' ? 0.25 : -0.65), p.y - 0.2, DZ + 1.55, 0.4, 0.4, 0.05, C.greyLight, { flat: true, lw: 0.02 });
    });

    // ---------- The marsh ----------
    // Greenhead traps, blue boxes on legs, and a few of the flies they didn't catch.
    for (const [x, y] of [[53.8, 16.6], [70.5, 4.8], [78.4, 17.2], [86.6, 3.6], [92.2, 12.2], [55.2, 20.6]]) trap(R, x, y);
    for (const [x, y] of [[70.5, 4.8]]) {
      const z = R.ground(x, y) + 1.9;
      R.thing(x + 0.5, y + 0.5, (ctx, t) => {
        if (!Q.detail || nightK(t) > 0.6) return;
        for (let i = 0; i < 7; i++) {
          const a = t * (2.5 + i * 0.4) + i * 1.9, r = 0.35 + (i % 3) * 0.2;
          dot(ctx, x + Math.cos(a) * r, y + Math.sin(a * 1.3) * r, z + Math.sin(a * 1.7) * 0.3, 0.035, C.green, false);
        }
      }, { anim: true });
    }
    // The heron, in the creek, fishing: very still, then very not.
    const [hx0, hy0] = [75.5, 15.3], hg = R.ground(hx0, hy0);
    R.thing(hx0, hy0, (ctx, t) => {
      const k = mod(t, 11), strike = k > 9.6 ? Math.sin(((k - 9.6) / 1.4) * Math.PI) : 0;
      const draw = (g) => wader(g, hx0, hy0, hg, t, { color: HERON, wing: shade(HERON, 0.2), scale: 1.25, dir: 'l', strike });
      wade(ctx, hx0, hy0, hg, level(t), draw, 0.35);
    }, { anim: true });
    // Two egrets pacing the salt pannes.
    for (const [cx, cy, r, ph] of [[PANNES[1][0], PANNES[1][1], 0.9, 0], [PANNES[2][0], PANNES[2][1], 1.1, 20]]) {
      R.mover((t) => {
        const a = (t + ph) / 12;
        return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.8, dir: Math.sin(a) > 0 ? 'l' : 'r', peck: mod(t + ph, 6) < 1 };
      }, (ctx, t, p) => {
        const g = h(p.x, p.y);
        wade(ctx, p.x, p.y, g, level(t), (c) => wader(c, p.x, p.y, g, t, { color: C.white, scale: 0.85, dir: p.dir, strike: p.peck ? 0.8 : 0 }), 0.3);
      });
    }
    // The birder who came for the heron and stays for the heron.
    extra(R, 71.2, 16.8, folk(305, { top: C.mustard, bottom: C.green, hat: 'sun' }), { pose: 'read', dir: 'r' }, { hours: between(6, 19.8) });
    // Gulls wheeling over the marsh.
    for (const [cx, cy, rx, ph] of [[80, 10, 6, 0], [72, 6, 4, 9]]) {
      R.mover((t) => { const a = (t + ph) / 7; return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * rx * 0.6, z: 6 + Math.sin(a * 2) * 0.5, f: Math.sin(a) > 0 ? -1 : 1 }; },
        (ctx, t, p) => { if (nightK(t) < 0.8) gull(ctx, p.x, p.y, p.z, t, { fly: true, dir: p.f }); }, { bias: 20 });
    }

    // The ending: the geese paddle out to the Courier's van (finale.js).
    swim(R);

    // ---------- Bob's crates, and the porch goose ----------
    // Two crates of live lobsters at the end of the queue, just delivered. Two
    // of a kind, one has it: the goose got bored of queueing and got in. Its
    // lid sits ajar, a tail tip sticks out the side and a foot out between
    // the slats. The other one is just lobsters (live ones are dark; only the
    // one on the road is red).
    const CRATE = C.woodLight, CW = 0.95, CD = 0.75, CH = 0.6;
    const crate = (x0, y0, pk, o) => {
      const z = R.ground(x0 + CW / 2, y0 + CD / 2), zt = z + CH;
      const body = (ctx, t) => {
        const k = pk.k();
        box(ctx, x0, y0, z, CW, CD, CH, CRATE, { lw: 0.04, top: k > 0.15 ? shade(C.brown, 0.5) : CRATE, dotsL: shade(CRATE, 0.45), dens: 0.1 });
        // Slats: dark gaps across both faces you see.
        for (const dz of [0.2, 0.4]) {
          line(ctx, [[x0, y0 + CD, z + dz], [x0 + CW, y0 + CD, z + dz]], shade(C.wood, 0.5), 0.035);
          line(ctx, [[x0 + CW, y0, z + dz], [x0 + CW, y0 + CD, z + dz]], shade(C.wood, 0.5), 0.035);
        }
        words(ctx, 'x', x0 + CW / 2, y0 + CD, z + 0.49, "BOB'S", 0.12, C.navy, 'Bagel Fat One');
        words(ctx, 'x', x0 + CW / 2, y0 + CD, z + 0.3, 'LIVE LOBSTERS', 0.075, C.navy);
        if (o.tell && k < 0.3) {
          // The tail tip out of the side, under the lid, and a webbed foot
          // out of the bottom gap.
          face(ctx, [[x0 + CW, y0 + 0.12, zt - 0.1], [x0 + CW, y0 + 0.55, zt - 0.1], [x0 + CW + 0.45, y0 + 0.3, zt + 0.16]], C.white, { lw: 0.035, dots: Q.detail ? C.grey : null, density: 0.12 });
          if (Q.detail) line(ctx, [[x0 + CW + 0.05, y0 + 0.33, zt - 0.06], [x0 + CW + 0.32, y0 + 0.3, zt + 0.08]], C.greyLight, 0.03);
          const fy = y0 + CD;
          face(ctx, [[x0 + 0.32, fy, z + 0.16], [x0 + 0.46, fy, z + 0.16], [x0 + 0.56, fy + 0.3, z + 0.02], [x0 + 0.44, fy + 0.26, z + 0.02], [x0 + 0.36, fy + 0.32, z + 0.02], [x0 + 0.26, fy + 0.26, z + 0.02]], C.coral, { lw: 0.03 });
        }
        if (o.lobsters && k > 0.15) {
          // Two live lobsters, claws up, unimpressed.
          const L = mix(C.navy, C.green, 0.35), up = 0.25 * k;
          for (const [u, v, s] of [[0.3, 0.35, 1], [0.65, 0.4, -1]]) {
            const bx = x0 + u, by = y0 + v;
            line(ctx, [[bx, by, zt - 0.1], [bx + 0.08 * s, by, zt + up + 0.15]], L, 0.07);
            disc(ctx, bx + 0.1 * s, by, zt + up + 0.2, 0.09, L, { lw: 0.025 });
            if (Q.detail) line(ctx, [[bx, by, zt], [bx - 0.15 * s, by + 0.1, zt + up + 0.4]], shade(L, 0.2), 0.02);
          }
        }
      };
      // The lid, hinged along the back. Shut, it's drawn over the crate;
      // open, behind whatever comes up out of it.
      const lid = (ctx) => {
        const k = pk.k(), a = ((o.ajar || 0) + k * (1 - (o.ajar || 0))) * 1.75, cs = Math.cos(a), sn = Math.sin(a);
        const pt = (x, u, w) => [x, y0 + u * cs - sn * w, zt + u * sn + cs * w];
        const c = [];
        for (const x of [x0 - 0.02, x0 + CW + 0.02]) c.push(pt(x, 0, 0), pt(x, CD + 0.02, 0), pt(x, CD + 0.02, 0.06), pt(x, 0, 0.06));
        solid(ctx, c, tint(CRATE, 0.15));
      };
      const busy = () => pk.k() > 0.001, front = x0 + CW + y0 + CD;
      calm(R, x0 + CW, y0 + CD, body, busy);
      calm(R, x0 + CW, y0 + CD, lid, busy, { depth: front + 0.02, busyDepth: () => (pk.k() > 0.15 ? x0 + y0 + 0.05 : front + 0.02) });
      return z;
    };
    const goosey = R.poke({ id: 'crate', at: [69.0, 12.0, 1.0 + 0.35], r: 0.7, sound: 'clunk' });
    const lobsters = R.poke({ id: 'lobsters', at: [69.0, 10.98, 1.0 + 0.35], r: 0.6, sound: 'clunk', say: ['Live lobsters. They saw nothing.', 'Still lobsters. Still saw nothing.'] });
    const gcz = crate(69.0 - CW / 2, 12.0 - CD / 2, goosey, { tell: true, ajar: 0.07 });
    crate(69.0 - CW / 2, 10.98 - CD / 2, lobsters, { lobsters: true });
    // The porch goose out front of Bob's: concrete, and dressed by Bob for the
    // weather, which is always a flood. Drawn as the goose is, plus a slicker
    // and a sou'wester.
    const pgx = 66.5, pgy = 12.45, pgz = R.ground(pgx, pgy);
    R.thing(pgx + 0.3, pgy + 0.2, (ctx) => {
      const [X, Y] = P3(pgx, pgy, pgz), s = 0.85;
      // Its concrete step.
      box(ctx, pgx - 0.32, pgy - 0.25, pgz, 0.64, 0.5, 0.1, CONCRETE, { flat: true, lw: 0.03 });
      goose(ctx, pgx, pgy, pgz + 0.1, 0, { dir: 'r', pose: 'stand', scale: s });
      ctx.save();
      ctx.translate(X, Y - 0.1 * ZK);
      ctx.scale(s, s);
      // The slicker, over the body and the wing; the tail stays out.
      ctx.beginPath();
      ctx.ellipse(0.04, -0.44, 0.36, 0.22, -0.12, 0, Math.PI * 2);
      paint(ctx, C.mustard, { lw: 0.035, dots: Q.detail ? shade(C.mustard, 0.35) : null, density: 0.1 });
      ctx.beginPath(); ctx.moveTo(0.16, -0.62); ctx.lineTo(0.14, -0.26);
      ctx.strokeStyle = shade(C.mustard, 0.45); ctx.lineWidth = 0.025; ctx.stroke();
      for (const yy of [-0.52, -0.4]) { ctx.beginPath(); ctx.arc(0.2, yy, 0.025, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill(); }
      // The sou'wester: a brim, a crown, the long back down the neck.
      ctx.beginPath();
      ctx.ellipse(0.24, -1.2, 0.3, 0.075, -0.12, 0, Math.PI * 2);
      paint(ctx, C.mustard, { lw: 0.03 });
      ctx.beginPath();
      ctx.ellipse(0.27, -1.23, 0.15, 0.14, 0, Math.PI, Math.PI * 2);
      ctx.closePath();
      paint(ctx, C.mustard, { lw: 0.03 });
      ctx.beginPath(); ctx.moveTo(0.36, -1.17); ctx.lineTo(0.33, -0.98);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02; ctx.stroke();
      ctx.restore();
    });
    R.decoy({ id: 'porch-goose', at: [pgx, pgy, pgz + 0.55], r: 0.7, say: ['A porch goose. Dressed for the flood.', 'Concrete. Better dressed than you.', 'Bob changes its outfit weekly.'] });

    // ---------- The finds ----------
    // The goose: last in Bob's queue since they opened, then into a crate of
    // live lobsters. Up it comes when the lid does.
    R.goose((t) => {
      const k = goosey.k();
      return { x: 69.0, y: 12.0, z: gcz + 0.12 + 0.5 * k, dir: 'l', hidden: k < 0.3, pose: k > 0.6 && mod(t, 5) < 1.2 ? 'honk' : 'stand' };
    }, { kind: 'poke', inside: goosey, hint: 'The goose got to the front of the queue and kept going. Check the deliveries.' });
    // Dave's snorkel, in his cooler (he drives through the flood every year).
    R.find({ id: 'snorkel', label: 'A snorkel', kind: 'poke', inside: cooler, at: [cox + cw * 0.6, coy + cd * 0.45, coz + ch + 0.6], r: 0.8, hint: 'Every King Tide Dave comes prepared. Check what he packed.' });
    // A lobster crossing the road, very slowly, both ways: out from Bob's,
    // having second thoughts. (On the asphalt, mostly the far lane: past the
    // road's edge on Bob's side, its roof hid it.)
    const lobAt = (t) => { const x = PIKE - 0.4 + 0.9 * Math.sin(t / 14); return [x, 8.4, float(x, 8.4, t) + 0.2]; };
    R.find({ id: 'lobster', label: 'A lobster crossing the road', at: lobAt, r: 0.8 });
    R.mover((t) => { const [x, y, z] = lobAt(t); return { x, y, z, s: Math.cos(t / 14) >= 0 ? 1 : -1 }; }, (ctx, t, p) => lobster(ctx, p.x, p.y, p.z - 0.18, p.s, t));
    // A car key on a cork float, bobbing in a salt panne when there's water in it.
    const [kx, ky] = PANNES[0];
    const keyAt = (t) => [kx + 0.3 * Math.sin(t / 2.7), ky + 0.2 * Math.cos(t / 3.1), float(kx, ky, t) + 0.1];
    R.find({ id: 'key', label: 'A car key on a float', kind: 'hard', at: keyAt, r: 0.8, when: highTide, note: 'high tide',
      riddle: 'Bobbing where the marsh fills up at night.', hint: "At high water the pools on the marsh fill up. Something cork is bobbing in one, out behind Bob's." });
    R.mover((t) => { const [x, y, z] = keyAt(t); return { x, y, z: z + Math.sin(t * 1.9) * 0.03 }; }, (ctx, t, p) => {
      if (!highTide(t)) return;
      cylinder(ctx, p.x, p.y, p.z - 0.12, 0.17, 0.22, C.woodLight);
      if (Q.detail) cylinder(ctx, p.x, p.y, p.z - 0.04, 0.175, 0.06, C.coral, { stroke: false });
      line(ctx, [[p.x + 0.12, p.y + 0.05, p.z + 0.1], [p.x + 0.3, p.y + 0.12, p.z + 0.1]], C.ink, 0.025);
      disc(ctx, p.x + 0.34, p.y + 0.14, p.z + 0.1, 0.07, null, { lw: 0.03, stroke: C.greyLight });
      box(ctx, p.x + 0.36, p.y + 0.16, p.z + 0.06, 0.34, 0.08, 0.06, C.mustard, { flat: true, lw: 0.02 });
      disc(ctx, p.x + 0.4, p.y + 0.2, p.z + 0.13, 0.08, C.ink, { lw: 0.02 });
    }, { bias: 0.5 });
    // The Pink House, back for a moment at sunset.
    R.find({ id: 'pink-house', label: 'The Pink House, back for a moment', at: [56.9, 10.6, hz0 + 2], r: 1, when: pinkWindow, note: 'sunset' });
  },
};
