// The Couch: the Green House's third floor. Before noon the last tenant is
// leaving everything ("It's all yours."): a hammock, a papasan chair, a lava
// lamp, a fish tank, a tapestry, string lights, a guitar with five strings.
// He leaves with a backpack and one plant.
// The couple from out of state drove all night and got here at dawn. Their
// couch doesn't fit the stairs, so at nine they rig a pulley on the porch
// and haul it up the front; it jams halfway and hangs there all day
// (Farragut Road draws it). They wait on the porch in the rain till noon,
// measuring the porch door. After noon they're in, measuring the stairwell,
// again and again ("Seventy-one inches." "It's seventy-two."), with a floor
// plan on a napkin, their dog, and an air mattress.
// The ending (finale.js): at 9:30pm the geese haul the couch the rest of the
// way, over the porch rail, PIVOT, and sit on it out on the porch, where the
// street can see. The couple watch from the porch door.
import {
  C, Q, box, rect, disc, cylinder, face, paint, person, folk, speech, shade, tint, mix, alpha,
  onLeft, onRight, P, paintText, label, goose as drawGoose,
} from '../../../engine/art.js';
import { route, particles, clamp, ease } from '../../../engine/actors.js';
import { apartment, carton, lettering } from '../kit.js';
import { SIDING, TRIM, ROOM, BRAND, lightsOn } from '../style.js';
import { AFTER, rainK } from '../clock.js';
import { playing, beat, HAUL, PIVOT } from '../finale.js';
import { hh, hours, oldSide, newSide, says, line3, backWindow, sleeper, pigeon, umbrella, onHours } from './green-1.js';

const W = ROOM['green-3'];
// The couple: one in a fleece that says nothing, one who's sure it's
// seventy-two inches. (Also in the noon queue downstairs.)
const FLEECE = folk(233, { style: 'short', top: C.grey, bottom: C.ink, hat: 'beanie' });
const SURE = folk(234, { style: 'long', top: C.mustard, bottom: C.navy });
const TENANT = folk(301, { style: 'long', hair: C.brown, top: mix(C.teal, C.leaf, 0.5), bottom: C.woodLight, hat: 'beanie', shoes: C.brown });
// The fleece's chest: a blank patch where a logo would be.
const blank = (c, b) => { if (b.back || !Q.detail) return; c.beginPath(); c.rect(0.02, b.shoulderY + 0.05, 0.18, 0.12); c.strokeStyle = alpha(C.white, 0.8); c.lineWidth = 0.025; c.stroke(); };
// Where the hauling rope runs: the pulley on its arm (Farragut Road draws
// the arm and the wheel), down to a cleat on the 2x4 we lash to the porch
// post, and a coil on the deck.
const PULLEY = [15.6, 2.2, 4.2];
const CLEAT = [14.55, 2.3, 1.25];
const COIL = [14.0, 1.25];
const rigged = hours(8.5, 29);
const haul = hours(9.0, 9.35);
const waiting = hours(9.35, 12);
const inside = hours(13, 29);
// The couch's size (Farragut Road's): 1.6 deep, 2.4 long.
const CW = 1.6, CD = 2.4;
const CORAL = C.coral;

// ---------- A box turned in plan ----------
// A box about a centre (cx, cy), turned by angle a, in the box's own frame
// (u across, v along): its visible sides, then its top. Sides are shaded by
// which way they face, the way box() shades its left and right.
function rbox(ctx, cx, cy, cz, a, u0, v0, w, d, z0, h, color, o = {}) {
  const ca = Math.cos(a), sa = Math.sin(a);
  const p = (u, v) => [cx + u * ca - v * sa, cy + u * sa + v * ca];
  const q = [p(u0, v0), p(u0 + w, v0), p(u0 + w, v0 + d), p(u0, v0 + d)];
  const m = p(u0 + w / 2, v0 + d / 2);
  const za = cz + z0, zb = cz + z0 + h;
  for (let i = 0; i < 4; i++) {
    const A = q[i], B = q[(i + 1) % 4];
    const nx = (A[0] + B[0]) / 2 - m[0], ny = (A[1] + B[1]) / 2 - m[1];
    if (nx + ny <= 1e-4) continue;
    const sx = Math.max(0, nx), sy = Math.max(0, ny);
    const amt = (0.1 * sx + 0.22 * sy) / (sx + sy);
    face(ctx, [[A[0], A[1], za], [B[0], B[1], za], [B[0], B[1], zb], [A[0], A[1], zb]], shade(color, amt), { lw: o.lw || 0.035, dots: o.flat ? null : sy > sx ? shade(color, 0.5) : null, density: 0.16 });
  }
  face(ctx, q.map(([x, y]) => [x, y, zb]), o.top || color, { lw: o.lw || 0.035 });
}
// The coral couch, turned by a about (cx, cy), its seat at cz: three legs
// (the fourth is on the floor inside, a find), the back, the arms, two
// cushions. Parts drawn back to front for the way it faces.
function couch(ctx, cx, cy, cz, a) {
  const u0 = -CW / 2, v0 = -CD / 2;
  const legs = [[0.15, 0.15], [CW - 0.3, 0.15], [CW - 0.3, CD - 0.3]];
  for (const [u, v] of legs) rbox(ctx, cx, cy, cz, a, u0 + u, v0 + v, 0.15, 0.15, 0, 0.22, C.brown, { flat: true, lw: 0.02 });
  rbox(ctx, cx, cy, cz, a, u0, v0, CW, CD, 0.22, 0.42, CORAL);
  const ca = Math.cos(a), sa = Math.sin(a);
  const parts = [
    [u0, v0, 0.45, CD, 0.64, 0.75, shade(CORAL, 0.05)],
    [u0, v0, CW, 0.35, 0.64, 0.45, CORAL],
    [u0, v0 + CD - 0.35, CW, 0.35, 0.64, 0.45, CORAL],
    [u0 + 0.45, v0 + 0.35, CW - 0.5, (CD - 0.7) / 2, 0.64, 0.14, tint(CORAL, 0.12)],
    [u0 + 0.45, v0 + 0.35 + (CD - 0.7) / 2, CW - 0.5, (CD - 0.7) / 2, 0.64, 0.14, tint(CORAL, 0.12)],
  ].map((pt) => {
    const mu = pt[0] + pt[2] / 2, mv = pt[1] + pt[3] / 2;
    return { pt, depth: (mu * ca - mv * sa) + (mu * sa + mv * ca) + (pt[5] < 0.2 ? 0.5 : 0) };
  }).sort((x, y) => x.depth - y.depth);
  for (const { pt } of parts) rbox(ctx, cx, cy, cz, a, pt[0], pt[1], pt[2], pt[3], pt[4], pt[5], pt[6]);
}
// Where the couch is through the pivot (k: 0..1), in this floor's units:
// over the rail from the rope, turned a quarter, set down in the porch's
// corner (close enough).
const C0 = [16.0, 2.2, 1.0], C1 = [14.35, 2.5, 1.3], C2 = [13.8, 3.2, 0.55], CF = [13.75, 3.45, 0];
function couchAt(k) {
  if (k <= 0.3) { const e = ease(k / 0.3); return { c: C0.map((v, i) => v + (C1[i] - v) * e), a: 0 }; }
  if (k <= 0.78) {
    const e = ease((k - 0.3) / 0.48);
    const wob = Math.sin(e * Math.PI * 3) * 0.12 * (1 - e);
    return { c: C1.map((v, i) => v + (C2[i] - v) * e), a: (Math.PI / 2) * e + wob };
  }
  const e = clamp((k - 0.78) / 0.22), bounce = Math.abs(Math.sin(e * Math.PI * 2)) * 0.15 * (1 - e);
  return { c: [C2[0] + (CF[0] - C2[0]) * e, C2[1] + (CF[1] - C2[1]) * e, C2[2] * (1 - e) + bounce], a: Math.PI / 2 };
}
// The geese at the end: eight on the rope (out on the porch and in through
// the porch door), four cheering; then four on the couch, two on its back,
// three on the rail, three on the deck.
const HAULERS = 8;
const haulSpot = (i, h, t) => {
  // A crowd on the rope, across the porch from the rail toward the door
  // (the house is closed at the end, so it all happens out here), stepping
  // back as the couch comes up.
  if (i < HAULERS) { const k = i / (HAULERS - 1); return { x: 14.3 - k * 1.2 - 0.2 * h + Math.sin(t * 7 + i) * 0.05, y: 0.55 + k * 1.75 + 0.1 * h, z: 0, pose: 'walk', dir: 'r' }; }
  const j = i - HAULERS;
  return { x: 13.3 + (j % 2) * 0.9, y: 3.3 + Math.floor(j / 2) * 0.7, z: 0, pose: Math.sin(t * 5 + j) > 0 ? 'honk' : 'stand', dir: 'r' };
};
const FINAL = [
  [13.0, 3.75, 0.78, 'sit', 'l'], [13.5, 3.8, 0.78, 'sit', 'l'], [14.0, 3.75, 0.78, 'sit', 'l'], [14.5, 3.8, 0.78, 'sit', 'l'],
  [13.2, 2.85, 1.39, 'stand', 'l'], [14.3, 2.85, 1.39, 'honk', 'r'],
  [14.62, 0.7, 1.13, 'stand', 'r'], [14.62, 1.3, 1.13, 'honk', 'r'], [14.62, 1.9, 1.13, 'stand', 'r'],
  [13.35, 1.1, 0, 'honk', 'l'], [14.1, 1.6, 0, 'stand', 'l'], [13.0, 2.3, 0, 'stand', 'r'],
];
function gooseAtEnd(i, t) {
  const h = beat(HAUL), k = beat(PIVOT);
  const a = haulSpot(i, h, t);
  if (k <= 0) return a;
  const [fx, fy, fz, pose, dir] = FINAL[i];
  // They let go and scramble: along the floor, then a hop up.
  const e = clamp(k * 1.25 - (i % 4) * 0.05);
  const hop = fz > 0 ? Math.sin(Math.PI * clamp((e - 0.6) / 0.4)) * 0.5 : 0;
  if (e >= 1) return { x: fx, y: fy, z: fz, pose, dir };
  return { x: a.x + (fx - a.x) * e, y: a.y + (fy - a.y) * e, z: fz * clamp((e - 0.6) / 0.4) + hop, pose: 'walk', dir: fx >= a.x ? 'r' : 'l' };
}

export default {
  id: 'green-3',
  name: 'The Couch',
  blurb: 'The couch does not fit up the stairs, so it has been on a rope since nine. They have measured the stairwell six times.',
  size: [15, 9],
  build(R) {
    apartment(R, { floor: 2, walls: W, floorInk: W.floor, siding: SIDING.green, trim: TRIM.green });
    const old = oldSide, neu = newSide;

    // ---------- The floor and the walls ----------
    R.floor((ctx) => {
      if (!Q.detail) return;
      ctx.save(); ctx.globalAlpha *= 0.22;
      for (let y = 2.3; y < 9; y += 0.45) face(ctx, [[0, y, 0.004], [12.5, y, 0.004], [12.5, y + 0.03, 0.004], [0, y + 0.03, 0.004]], C.brown, { stroke: false });
      ctx.restore();
    });
    R.rug((ctx) => {
      // A woven rug, left behind with everything else.
      rect(ctx, 8.8, 4.3, 3.2, 2.2, 0.008, C.mustard, { lw: 0.02 });
      rect(ctx, 9.0, 4.5, 2.8, 1.8, 0.01, C.coral, { stroke: false, dots: shade(C.coral, 0.4), density: 0.25 });
      if (Q.detail) for (let u = 9.2; u < 11.8; u += 0.4) line3(ctx, [[u, 4.5, 0.012], [u + 0.2, 6.3, 0.012]], C.mustard, 0.04);
    });
    backWindow(R, 2.6, 1.9, 1.2, 1.3);
    // The tapestry (a sun and a moon), string lights along the top of the
    // wall, a dreamcatcher: all of it staying.
    R.decor((ctx) => {
      onRight(ctx, 8.3, 1.2, 3.4, 2.6, C.purple, { lw: 0.03, dots: shade(C.purple, 0.4), density: 0.15 });
      onRight(ctx, 8.45, 1.35, 3.1, 2.3, null, { lw: 0.04, stroke: C.mustard });
      const [X, Y] = P(10.0, 0, 2.5);
      ctx.save(); ctx.translate(X, Y); ctx.transform(1, 0.5, 0, 1, 0, 0);
      ctx.beginPath(); ctx.arc(0, 0, 0.62, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.03 });
      if (Q.detail) { ctx.strokeStyle = C.mustard; ctx.lineWidth = 0.05; ctx.beginPath(); for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ctx.moveTo(Math.cos(a) * 0.72, Math.sin(a) * 0.72); ctx.lineTo(Math.cos(a) * 0.95, Math.sin(a) * 0.95); } ctx.stroke(); }
      ctx.beginPath(); ctx.arc(0.1, 0, 0.42, 0, Math.PI * 2); paint(ctx, C.purple, { stroke: false });
      ctx.beginPath(); ctx.arc(-0.1, -0.02, 0.4, -1.2, 1.2); paint(ctx, C.butter, { stroke: false });
      ctx.restore();
      // The tenant's note, taped by the back door: all his worldly goods.
      onLeft(ctx, 5.0, 1.7, 0.9, 0.9, C.butter, { lw: 0.02 });
      paintText(ctx, 'left', 5.45, 2.35, 'IT\'S ALL', 0.13, C.ink, 'Rethink Sans');
      paintText(ctx, 'left', 5.45, 2.17, 'YOURS :)', 0.13, C.ink, 'Rethink Sans');
      paintText(ctx, 'left', 5.45, 1.93, 'feed the fish', 0.08, C.teal, 'Rethink Sans');
    });
    R.thing(0.05, 0.05, (ctx, t) => {
      const cols = [C.mustard, C.pink, C.sky, C.leaf];
      const hang = (a, b, n, off) => {
        ctx.beginPath();
        for (let i = 0; i <= n; i++) { const k = i / n, pt = a.map((v, j) => v + (b[j] - v) * k), [X, Y] = P(...pt); const sag = Math.sin(((k * 4) % 1) * Math.PI) * 0.14; if (i) ctx.lineTo(X, Y + sag); else ctx.moveTo(X, Y + sag); }
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02; ctx.stroke();
        for (let i = 1; i < n; i++) {
          const k = i / n, pt = a.map((v, j) => v + (b[j] - v) * k), [X, Y] = P(...pt), sag = Math.sin(((k * 4) % 1) * Math.PI) * 0.14;
          const on = (Math.floor(t * 1.5) + i + off) % 4 !== 0;
          ctx.beginPath(); ctx.arc(X, Y + sag + 0.05, 0.055, 0, Math.PI * 2);
          ctx.fillStyle = on ? cols[(i + off) % 4] : shade(cols[(i + off) % 4], 0.45); ctx.fill();
        }
      };
      hang([8.0, 0.02, 4.1], [12.4, 0.02, 4.1], 18, 0);
      hang([0.02, 8.8, 4.1], [0.02, 4.4, 4.1], 14, 2);
    }, { anim: true });
    // The paper lantern over the middle room, lit at night.
    R.thing(7.2, 5.8, (ctx) => {
      line3(ctx, [[7.2, 5.6, 4.4], [7.2, 5.6, 3.7]], C.ink, 0.02);
      const [X, Y] = P(7.2, 5.6, 3.35);
      ctx.beginPath(); ctx.arc(X, Y, 0.42, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.03 });
      if (Q.detail) { ctx.strokeStyle = alpha(C.ink, 0.25); ctx.lineWidth = 0.015; for (const dy of [-0.2, 0, 0.2]) { ctx.beginPath(); ctx.ellipse(X, Y + dy, Math.sqrt(0.42 * 0.42 - dy * dy), 0.05, 0, 0, Math.PI * 2); ctx.stroke(); } }
    });
    R.light({ at: [7.2, 5.6, 3.35], r: 4.5, color: C.butter, k: (t) => (lightsOn(t) ? 0.8 : 0) });

    // ---------- The kitchen ----------
    R.thing(1.05, 4.3, (ctx) => {
      box(ctx, 0, 2.2, 0, 1.0, 2.1, 1.15, C.white, { lw: 0.04, top: tint(C.greyLight, 0.2) });
      rect(ctx, 0.18, 2.6, 0.64, 0.7, 1.151, shade(C.greyLight, 0.2), { lw: 0.02 });
      box(ctx, 0.05, 2.9, 1.15, 0.1, 0.08, 0.5, C.greyLight, { flat: true, lw: 0.02 });
      box(ctx, 0.05, 2.9, 1.6, 0.36, 0.08, 0.07, C.greyLight, { flat: true, lw: 0.02 });
      // A kombucha jar (his), a plant cutting in a glass.
      cylinder(ctx, 0.5, 3.8, 1.15, 0.18, 0.45, alpha(C.mustard, 0.8), { top: C.white });
      cylinder(ctx, 0.45, 4.05, 1.15, 0.08, 0.2, alpha(tint(C.sky, 0.5), 0.9));
    });
    R.thing(1.15, 5.7, (ctx) => {
      box(ctx, 0.02, 4.45, 0, 1.1, 1.15, 3.0, C.white, { lw: 0.045 });
      face(ctx, [[1.12, 4.5, 1.95], [1.12, 5.55, 1.95]], null, { lw: 0.04 });
      box(ctx, 1.12, 5.35, 1.2, 0.08, 0.1, 0.55, C.greyLight, { flat: true, lw: 0.02 });
      box(ctx, 1.12, 5.35, 2.1, 0.08, 0.1, 0.5, C.greyLight, { flat: true, lw: 0.02 });
      if (Q.detail) for (const [u, v, c] of [[4.6, 2.5, C.leaf], [4.9, 2.3, C.pink], [4.7, 1.4, C.mustard], [5.1, 0.9, C.purple]]) face(ctx, [[1.125, u, v], [1.125, u + 0.18, v], [1.125, u + 0.18, v + 0.18], [1.125, u, v + 0.18]], c, { lw: 0.015 });
    });
    // The fish tank: three fish, a castle, bubbles. (They keep the fish.)
    R.thing(1.1, 7.95, (ctx) => {
      box(ctx, 0.1, 6.0, 0, 0.9, 1.9, 0.9, C.brown, { lw: 0.035 });
      box(ctx, 0.15, 6.05, 0.9, 0.8, 1.8, 0.85, alpha(tint(C.teal, 0.3), 0.55), { flat: true, lw: 0.03, top: alpha(tint(C.teal, 0.2), 0.6) });
      rect(ctx, 0.2, 6.1, 0.7, 1.7, 0.95, C.woodLight, { stroke: false });
      box(ctx, 0.35, 7.2, 0.95, 0.3, 0.3, 0.35, C.greyLight, { flat: true, lw: 0.02 });
      box(ctx, 0.1, 6.0, 1.75, 0.35, 1.9, 0.1, C.ink, { flat: true, lw: 0.02 });
    });
    R.thing(1.2, 8.0, (ctx, t) => {
      for (let i = 0; i < 3; i++) {
        const k = (Math.sin(t * (0.4 + i * 0.13) + i * 2) + 1) / 2, y = 6.25 + k * 1.4, z = 1.15 + i * 0.18;
        const [X, Y] = P(0.97, y, z), dir = Math.cos(t * (0.4 + i * 0.13) + i * 2) > 0 ? -1 : 1;
        ctx.save(); ctx.translate(X, Y); ctx.scale(dir, 1);
        ctx.beginPath(); ctx.ellipse(0, 0, 0.12, 0.07, 0, 0, Math.PI * 2); ctx.moveTo(0.1, 0); ctx.lineTo(0.2, -0.07); ctx.lineTo(0.2, 0.07); ctx.closePath();
        ctx.fillStyle = [C.coral, C.mustard, C.sky][i]; ctx.fill();
        ctx.restore();
      }
      if (!Q.detail) return;
      ctx.fillStyle = alpha(C.white, 0.8);
      particles(t, 5, 2, (k, r) => { const [X, Y] = P(0.96, 7.35 + r() * 0.2, 1.0 + k * 0.7); ctx.beginPath(); ctx.arc(X, Y, 0.03, 0, Math.PI * 2); ctx.fill(); }, 21);
    }, { anim: true });

    // ---------- Before noon: what he's leaving ----------
    // The pile by the stairs: a guitar with five strings, records, a lamp
    // with a scarf over it, a box that says FREE (it's all free).
    R.thing(6.1, 3.9, (ctx) => {
      carton(ctx, 4.7, 2.7, 0, 1.0, 0.8, 0.7, 'FREE');
      box(ctx, 5.0, 2.8, 0.7, 0.6, 0.6, 0.12, C.ink, { flat: true, lw: 0.02 });
      disc(ctx, 5.3, 3.1, 0.83, 0.25, C.ink, { lw: 0.02 });
      disc(ctx, 5.3, 3.1, 0.84, 0.08, C.red, { stroke: false });
      // The guitar leaning on the box.
      const [X, Y] = P(5.85, 3.6, 0.4);
      ctx.save(); ctx.translate(X, Y); ctx.rotate(0.35);
      ctx.beginPath(); ctx.ellipse(0, 0, 0.3, 0.36, 0, 0, Math.PI * 2); paint(ctx, C.wood, { lw: 0.03 });
      ctx.beginPath(); ctx.arc(0, -0.05, 0.1, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
      ctx.beginPath(); ctx.rect(-0.05, -1.3, 0.1, 1.0); paint(ctx, C.brown, { lw: 0.025 });
      ctx.restore();
    }, { on: old });
    // The papasan chair (staying).
    R.thing(10.1, 5.7, (ctx) => {
      cylinder(ctx, 9.3, 4.95, 0, 0.45, 0.35, C.wood, { top: C.brown });
      const [X, Y] = P(9.3, 4.95, 0.75);
      ctx.beginPath(); ctx.ellipse(X, Y, 1.05, 0.55, 0, 0, Math.PI * 2); paint(ctx, C.woodLight, { lw: 0.04 });
      ctx.beginPath(); ctx.ellipse(X, Y - 0.05, 0.9, 0.44, 0, 0, Math.PI * 2); paint(ctx, C.teal, { lw: 0.03, dots: shade(C.teal, 0.4), density: 0.2 });
      if (Q.detail) { ctx.strokeStyle = C.brown; ctx.lineWidth = 0.02; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(X + i * 0.28, Y + 0.3); ctx.lineTo(X + i * 0.3, Y + 0.52); ctx.stroke(); } }
    });
    // The lava lamp on a milk crate, blobs rising (and glowing at night).
    R.thing(12.4, 5.9, (ctx) => box(ctx, 11.6, 5.2, 0, 0.7, 0.6, 0.6, C.purple, { flat: true, lw: 0.03, top: shade(C.purple, 0.4) }));
    R.thing(12.45, 5.95, (ctx, t) => {
      const [X, Y] = P(11.95, 5.5, 0.6);
      ctx.beginPath(); ctx.moveTo(X - 0.14, Y); ctx.lineTo(X + 0.14, Y); ctx.lineTo(X + 0.1, Y - 0.2); ctx.lineTo(X - 0.1, Y - 0.2); ctx.closePath(); paint(ctx, C.greyLight, { lw: 0.02 });
      ctx.beginPath(); ctx.moveTo(X - 0.1, Y - 0.2); ctx.lineTo(X - 0.17, Y - 0.75); ctx.lineTo(X - 0.08, Y - 1.1); ctx.lineTo(X + 0.08, Y - 1.1); ctx.lineTo(X + 0.17, Y - 0.75); ctx.lineTo(X + 0.1, Y - 0.2); ctx.closePath();
      paint(ctx, tint(C.pink, 0.5), { lw: 0.025 });
      for (let i = 0; i < 3; i++) {
        const k = (t * 0.12 + i / 3) % 1, by = Y - 0.25 - Math.sin(k * Math.PI) * 0.75;
        ctx.beginPath(); ctx.ellipse(X + Math.sin(t * 0.5 + i) * 0.04, by, 0.06 + 0.02 * i, 0.09, 0, 0, Math.PI * 2); ctx.fillStyle = C.coral; ctx.fill();
      }
      ctx.beginPath(); ctx.moveTo(X - 0.09, Y - 1.1); ctx.lineTo(X + 0.09, Y - 1.1); ctx.lineTo(X + 0.06, Y - 1.25); ctx.lineTo(X - 0.06, Y - 1.25); ctx.closePath(); paint(ctx, C.greyLight, { lw: 0.02 });
    }, { anim: true });
    R.light({ at: [11.95, 5.5, 1.2], r: 1.8, color: C.pink, k: (t) => (lightsOn(t) ? 0.7 : 0.15) });
    // A macrame plant hanger over the bay, swaying in the draft.
    R.thing(12.3, 4.6, (ctx, t) => {
      const s = Math.sin(t * 0.8) * 0.06;
      line3(ctx, [[12.0, 4.3, 4.4], [12.0 + s, 4.3, 2.9]], C.woodLight, 0.03);
      const [X, Y] = P(12.0 + s, 4.3, 2.7);
      ctx.beginPath(); ctx.moveTo(X - 0.22, Y - 0.2); ctx.lineTo(X + 0.22, Y - 0.2); ctx.lineTo(X + 0.16, Y + 0.12); ctx.lineTo(X - 0.16, Y + 0.12); ctx.closePath(); paint(ctx, C.coral, { lw: 0.025 });
      ctx.strokeStyle = C.green; ctx.lineWidth = 0.05; ctx.beginPath();
      for (let i = -2; i <= 2; i++) { ctx.moveTo(X + i * 0.08, Y - 0.2); ctx.quadraticCurveTo(X + i * 0.2, Y + 0.1, X + i * 0.15, Y + 0.55 + Math.abs(i) * 0.1); }
      ctx.stroke();
    }, { anim: true });

    // The hammock, on its stand, swinging (staying too).
    const swing = (t) => Math.sin(t * 1.1) * 0.12;
    R.thing(12.3, 7.4, (ctx) => {
      box(ctx, 8.7, 6.95, 0, 3.6, 0.12, 0.1, C.wood, { flat: true, lw: 0.025 });
      for (const [a, b] of [[[8.75, 7.0, 0.1], [8.85, 7.0, 1.9]], [[12.25, 7.0, 0.1], [12.15, 7.0, 1.9]]]) line3(ctx, [a, b], C.wood, 0.12);
      for (const u of [8.7, 12.3]) box(ctx, u - 0.1, 6.55, 0, 0.2, 0.9, 0.08, C.wood, { flat: true, lw: 0.02 });
    });
    R.thing(12.35, 7.45, (ctx, t) => {
      const s = swing(t);
      const pts = []; for (let i = 0; i <= 12; i++) { const k = i / 12; pts.push([9.2 + k * 2.6 + s * Math.sin(k * Math.PI), 7.0, 1.45 - Math.sin(k * Math.PI) * 0.85]); }
      // The net: two edges and the cloth between.
      ctx.beginPath();
      pts.forEach((p, i) => { const [X, Y] = P(p[0], p[1] - 0.35, p[2]); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
      for (let i = pts.length - 1; i >= 0; i--) { const [X, Y] = P(pts[i][0], pts[i][1] + 0.35, pts[i][2] - 0.08); ctx.lineTo(X, Y); }
      ctx.closePath(); paint(ctx, C.pink, { lw: 0.03, dots: C.mustard, density: 0.3 });
      line3(ctx, [[8.85, 7.0, 1.85], [9.2, 6.8, 1.45]], C.ink, 0.025); line3(ctx, [[8.85, 7.0, 1.85], [9.2, 7.3, 1.45]], C.ink, 0.025);
      line3(ctx, [[12.15, 7.0, 1.85], [11.8, 6.8, 1.45]], C.ink, 0.025); line3(ctx, [[12.15, 7.0, 1.85], [11.8, 7.3, 1.45]], C.ink, 0.025);
    }, { anim: true });

    // The last tenant: in the hammock with a ukulele till ten, then round
    // the flat with his backpack, then at the top of the stairs, then gone.
    R.mover((t) => {
      const h = hh(t);
      if (h >= 5 && h < 10.3) return { x: 10.5 + swing(t), y: 7.0, z: 0.35, pose: 'sit', dir: 'l', ahead: 2.6 };
      if (h >= 10.3 && h < 11.2) return { ...tenantWalk(t), z: 0, pose: 'walk' };
      if (h >= 11.2 && h < 11.62) return { x: 2.8, y: 2.5, z: 0, pose: 'wave', dir: 'r' };
      return { x: -99, y: -99 };
    }, (ctx, t, p) => {
      if (p.x < -50) return;
      const pack = (c, b) => { if (!Q.detail) return; c.beginPath(); c.roundRect(-0.52, b.shoulderY - 0.02, 0.3, 0.6, 0.08); paint(c, C.red, { lw: 0.025 }); };
      person(ctx, p.x, p.y, p.z, {
        ...TENANT, pose: p.pose === 'walk' && !p.moving ? 'stand' : p.pose, dir: p.dir, back: p.back, phase: p.phase,
        arms: p.pose === 'sit' ? [1.3 + Math.sin(t * 9) * 0.15, 1.0] : undefined,
        wear: p.pose === 'sit' ? null : pack,
        hold: p.pose === 'sit' ? (c) => { c.beginPath(); c.ellipse(0, 0, 0.18, 0.13, 0.4, 0, Math.PI * 2); paint(c, C.mustard, { lw: 0.02 }); } : p.pose === 'wave' ? null : (c) => { c.beginPath(); c.rect(-0.12, -0.15, 0.24, 0.2); paint(c, C.coral, { lw: 0.02 }); c.beginPath(); c.arc(0, -0.25, 0.18, 0, Math.PI * 2); paint(c, C.leaf, { lw: 0.02 }); },
      }, t);
      const h = hh(t);
      const lines = h < 9 ? ['It\'s all yours, man.', 'The fish too.'] : h < 10.3 ? ['Nice couch.', 'It\'s all yours.', 'Is it stuck?'] : h < 11.2 ? ['Just taking the plant.', 'It\'s all yours.'] : ['It\'s all yours!', 'Peace.'];
      says(ctx, p.x, p.y, (p.z || 0) + 2.5, t, lines, 9, 3.4, 2);
      if (p.pose === 'sit' && Q.detail && Math.sin(t * 2) > 0.3) label(ctx, p.x + 0.4, p.y - 0.4, 2.6 + ((t * 0.7) % 1) * 0.4, '♪', 0.3, C.ink, 'Rethink Sans');
    });
    // A bean bag (staying): the goose's before noon.
    R.thing(4.0, 7.7, (ctx) => {
      const [X, Y] = P(3.3, 7.0, 0);
      ctx.beginPath(); ctx.moveTo(X - 0.8, Y); ctx.quadraticCurveTo(X - 0.95, Y - 0.9, X - 0.1, Y - 0.95); ctx.quadraticCurveTo(X + 0.8, Y - 0.9, X + 0.8, Y); ctx.quadraticCurveTo(X, Y + 0.3, X - 0.8, Y); ctx.closePath();
      paint(ctx, C.purple, { lw: 0.035, dots: shade(C.purple, 0.45), density: 0.2 });
      ctx.beginPath(); ctx.ellipse(X, Y - 0.55, 0.5, 0.2, 0, 0, Math.PI * 2); ctx.fillStyle = shade(C.purple, 0.25); ctx.fill();
    });


    // His tortoise, left behind too ("It's all yours"), crossing the flat
    // once a day, very slowly. The couple keep it.
    R.mover((t) => {
      const h = hh(t), k = clamp((h - 6) / 22);
      return { x: 2.4 + k * 8.2, y: 5.2 + Math.sin(k * 7) * 0.9, dir: 'r' };
    }, (ctx, t, p) => {
      const [X, Y] = P(p.x, p.y, 0);
      const step = Math.sin(t * 2) * 0.03;
      ctx.fillStyle = C.leaf;
      for (const dx of [-0.14, 0.14]) { ctx.beginPath(); ctx.ellipse(X + dx + step, Y - 0.03, 0.05, 0.04, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.beginPath(); ctx.arc(X + 0.25 + step, Y - 0.1, 0.06, 0, Math.PI * 2); paint(ctx, C.leaf, { lw: 0.02 });
      ctx.beginPath(); ctx.ellipse(X, Y - 0.1, 0.24, 0.16, 0, Math.PI, 0); ctx.closePath(); paint(ctx, C.green, { lw: 0.025, dots: C.brown, density: 0.4 });
    });
    // A monstera, a rolled yoga mat, a stack of records: also staying.
    R.thing(8.3, 8.7, (ctx) => {
      cylinder(ctx, 7.9, 8.3, 0, 0.3, 0.55, C.white);
      const [X, Y] = P(7.9, 8.3, 0.6);
      for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.45; ctx.beginPath(); ctx.ellipse(X + Math.cos(a) * 0.45, Y + Math.sin(a) * 0.55 - 0.1, 0.24, 0.14, a, 0, Math.PI * 2); paint(ctx, C.green, { lw: 0.02 }); }
      box(ctx, 6.8, 8.2, 0, 0.9, 0.22, 0.22, C.teal, { flat: true, lw: 0.02 });
    });
    // A wind chime by the porch door.
    R.thing(12.5, 2.0, (ctx, t) => {
      line3(ctx, [[12.4, 1.95, 4.4], [12.4, 1.95, 3.6]], C.ink, 0.015);
      disc(ctx, 12.4, 1.95, 3.6, 0.14, C.wood, { lw: 0.015 });
      for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2, s = Math.sin(t * 2.3 + i) * 0.04; line3(ctx, [[12.4 + Math.cos(a) * 0.1 + s, 1.95 + Math.sin(a) * 0.1, 3.55], [12.4 + Math.cos(a) * 0.1 + s * 2, 1.95 + Math.sin(a) * 0.1, 3.0 + i * 0.08]], C.greyLight, 0.035); }
    }, { anim: true });

    // ---------- The porch ----------
    // The rigging: a 2x4 lashed up the porch post, a beam out to the arm,
    // a brace; the rope's cleat.
    R.thing(14.8, 2.4, (ctx) => {
      box(ctx, 14.42, 2.05, 0, 0.18, 0.18, 4.65, C.woodLight, { flat: true, lw: 0.03 });
      box(ctx, 14.42, 2.05, 4.45, 0.65, 0.18, 0.2, C.woodLight, { flat: true, lw: 0.03 });
      line3(ctx, [[14.5, 2.14, 3.6], [15.0, 2.14, 4.45]], C.woodLight, 0.1);
      for (const z of [0.55, 0.95, 2.4, 3.6]) line3(ctx, [[14.4, 2.1, z], [14.62, 2.25, z + 0.08]], C.brown, 0.05);
      box(ctx, 14.6, 2.2, 1.18, 0.08, 0.2, 0.08, C.ink, { flat: true, stroke: false });
    }, { on: rigged });
    // The rope: pulley, cleat, coil (or, while they haul, their hands).
    R.thing(15, 2.6, (ctx, t) => {
      const rope = C.woodLight;
      if (haul(t)) {
        const k = Math.sin(t * 5) * 0.12;
        line3(ctx, [PULLEY, [14.25 + k, 1.75, 1.35], [13.45 + k, 1.55, 1.3], [12.95, 1.4, 0.9], [COIL[0], COIL[1], 0.05]], rope, 0.06);
      } else {
        line3(ctx, [PULLEY, [CLEAT[0] + 0.05, CLEAT[1], CLEAT[2] + 0.04]], rope, 0.06);
        line3(ctx, [[CLEAT[0], CLEAT[1], CLEAT[2]], [14.4, 1.9, 0.6], [COIL[0] + 0.3, COIL[1], 0.05]], rope, 0.05);
      }
      const [X, Y] = P(COIL[0], COIL[1], 0.02);
      for (const r of [0.34, 0.26, 0.18]) { ctx.beginPath(); ctx.ellipse(X, Y, r, r * 0.5, 0, 0, Math.PI * 2); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.08; ctx.stroke(); ctx.strokeStyle = rope; ctx.lineWidth = 0.05; ctx.stroke(); }
    }, { anim: true, on: (t) => hours(9, 29)(t) && !playing(), depth: 17.6 });
    R.thing(14.3, 1.6, (ctx) => {
      const [X, Y] = P(COIL[0], COIL[1], 0.02);
      for (const r of [0.34, 0.26, 0.18]) { ctx.beginPath(); ctx.ellipse(X, Y, r, r * 0.5, 0, 0, Math.PI * 2); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.08; ctx.stroke(); ctx.strokeStyle = C.woodLight; ctx.lineWidth = 0.05; ctx.stroke(); }
    }, { on: hours(8.5, 9) });
    // Pigeons: on the rail at dawn, on the rigging's beam once it's up.
    R.mover((t) => (rigged(t) ? { x: 14.75, y: 2.14, z: 4.65, ahead: 3 } : { x: 14.62, y: 3.4, z: 1.13, ahead: 1 }), (ctx, t, p) => {
      pigeon(ctx, p.x, p.y, p.z, t, { dir: 'r' });
      pigeon(ctx, p.x + 0.35, p.y - 0.02, p.z, t, { dir: 'l', phase: 2, peck: !rigged(t) });
    });
    // A cooler (they brought it from home), and her umbrella in the rain.
    R.thing(14.3, 4.1, (ctx) => {
      box(ctx, 13.5, 3.5, 0, 0.9, 0.55, 0.5, C.red, { flat: true, lw: 0.03, top: C.white });
    }, { on: hours(8.4, 12) });
    // The couple, before noon: rigging, hauling ("HEAVE!" "HO!"), then
    // waiting out the old tenant in the rain, measuring the porch door.
    R.mover((t) => {
      const h = hh(t);
      if (h >= 8.4 && h < 9) return { x: 14.15, y: 1.7, pose: 'rig' };
      if (haul(t)) return { x: 14.0 - Math.sin(t * 5) * 0.05, y: 1.75, pose: 'haul' };
      if (waiting(t)) return { x: 13.0, y: 1.9, pose: 'measure' };
      return { x: -99, y: -99 };
    }, (ctx, t, p) => {
      if (p.x < -50) return;
      const rain = rainK(t) > 0.1;
      const arms = p.pose === 'rig' ? [2.9, 2.6] : p.pose === 'haul' ? [1.7 + Math.sin(t * 5) * 0.2, 1.5] : [1.2, 0.3];
      person(ctx, p.x, p.y, 0, { ...FLEECE, pose: 'stand', dir: p.pose === 'measure' ? 'l' : 'r', back: p.pose === 'measure', arms, wear: blank }, t);
      if (rain && p.pose === 'measure') {
        // A clear poncho.
        const [X, Y] = P(p.x, p.y, 0);
        ctx.beginPath(); ctx.moveTo(X, Y - 2.5); ctx.lineTo(X - 0.5, Y - 0.7); ctx.lineTo(X + 0.5, Y - 0.7); ctx.closePath(); paint(ctx, alpha(C.white, 0.35), { lw: 0.02, stroke: alpha(C.ink, 0.5) });
      }
      if (p.pose === 'measure') {
        // The tape, up the door frame and back.
        const k = (Math.sin(t * 0.7) + 1) / 2;
        line3(ctx, [[12.56, 0.3, 0.05], [12.56, 0.3, 0.05 + k * 2.9]], C.mustard, 0.06);
        says(ctx, p.x, p.y, 2.6, t, ['Seventy-one inches.', 'Measure it again.', 'Seventy-one.'], 9, 3.4, 0);
      } else says(ctx, p.x, p.y, 2.6, t, p.pose === 'haul' ? ['HEAVE!'] : ['Is this knot right?', 'Lefty loosey.'], 2.4, 1.2, 0);
    }, { bias: 0.3 });
    R.mover((t) => {
      const h = hh(t);
      if (h >= 8.4 && h < 9) return { x: 13.5, y: 2.9, pose: 'coil' };
      if (haul(t)) return { x: 13.2 - Math.sin(t * 5) * 0.05, y: 1.5, pose: 'haul' };
      if (waiting(t)) return { x: 13.95, y: 3.8, pose: 'sit' };
      return { x: -99, y: -99 };
    }, (ctx, t, p) => {
      if (p.x < -50) return;
      const sit = p.pose === 'sit';
      person(ctx, p.x, p.y, sit ? -0.18 : 0, {
        ...SURE, pose: sit ? 'sit' : 'stand', dir: 'r', arms: p.pose === 'haul' ? [1.7 + Math.sin(t * 5 + 1) * 0.2, 1.5] : sit ? [2.2, 0.6] : [1.2, 1.0],
        hold: sit ? (c) => { c.beginPath(); c.moveTo(-0.1, -0.3); c.lineTo(-0.08, 0); c.lineTo(0.08, 0); c.lineTo(0.1, -0.3); c.closePath(); paint(c, C.white, { lw: 0.02 }); c.fillStyle = C.pink; c.fillRect(-0.09, -0.18, 0.18, 0.06); } : null,
      }, t);
      if (sit && rainK(t) > 0.1) umbrella(ctx, p.x, p.y, -0.7, C.coral, 0);
      says(ctx, p.x, p.y, sit ? 2.3 : 2.6, t, p.pose === 'haul' ? ['HO!'] : sit ? ['It\'s seventy-two.', 'We could live on the porch.', 'Is it noon yet?'] : ['Is this the rope?', 'Where\'s the other end?'], p.pose === 'haul' ? 2.4 : 9, p.pose === 'haul' ? 1.2 : 3.4, p.pose === 'haul' ? 1.2 : 4.5);
    }, { bias: 0.3 });

    // ---------- After noon: the couple, in ----------
    // Their boxes (the napkin's on top), the air mattress (the couch is
    // outside), their dog.
    R.thing(7.7, 6.9, (ctx) => {
      carton(ctx, 5.0, 4.6, 0, 1.3, 1.0, 0.5, 'OHIO');
      carton(ctx, 5.0, 4.6, 0.5, 1.3, 1.0, 0.5, 'KITCHEN');
      carton(ctx, 6.3, 4.6, 0, 1.2, 1.0, 0.5, 'FRAGILE');
      carton(ctx, 5.0, 5.6, 0, 1.3, 1.0, 0.55, 'COUCH STUFF');
      carton(ctx, 6.3, 5.6, 0, 1.2, 1.1, 0.55, 'TAPE MEASURES');
    }, { on: neu });
    R.thing(7.75, 7.0, (ctx) => {
      // The napkin: a floor plan in ballpoint, the couch drawn in, a big "?".
      const z = 1.01, x0 = 5.55, y0 = 4.95;
      face(ctx, [[x0, y0, z], [x0 + 0.75, y0 - 0.05, z], [x0 + 0.8, y0 + 0.72, z], [x0 + 0.05, y0 + 0.75, z]], C.white, { lw: 0.02 });
      if (!Q.detail) return;
      const pen = C.navy;
      rect(ctx, x0 + 0.12, y0 + 0.1, 0.55, 0.55, z + 0.002, null, { lw: 0.025, stroke: pen });
      line3(ctx, [[x0 + 0.4, y0 + 0.1, z + 0.003], [x0 + 0.4, y0 + 0.4, z + 0.003]], pen, 0.02);
      rect(ctx, x0 + 0.45, y0 + 0.2, 0.18, 0.35, z + 0.003, alpha(C.coral, 0.8), { lw: 0.015, stroke: pen });
      label(ctx, x0 + 0.3, y0 + 0.55, z + 0.05, '72"?', 0.12, C.red, 'Rethink Sans');
    }, { on: neu });
    // The air mattress.
    R.thing(12.4, 4.1, (ctx) => {
      box(ctx, 10.3, 2.4, 0, 2.0, 1.6, 0.4, tint(C.sky, 0.1), { lw: 0.035, top: tint(C.sky, 0.3) });
      if (Q.detail) for (let u = 10.6; u < 12.2; u += 0.35) line3(ctx, [[u, 2.45, 0.405], [u, 3.95, 0.405]], shade(C.sky, 0.1), 0.02);
      box(ctx, 10.4, 2.5, 0.4, 0.55, 1.4, 0.15, C.white, { flat: true, lw: 0.025 });
      // A pump on the floor, its hose.
      box(ctx, 12.35, 4.2, 0, 0.35, 0.3, 0.3, C.mustard, { flat: true, lw: 0.02 });
      line3(ctx, [[12.4, 4.25, 0.2], [12.3, 3.95, 0.15]], C.ink, 0.04);
    }, { on: neu });
    // Measuring the stairwell: the tape out along the banister, in, out.
    R.mover((t) => (hours(13.1, 20.5)(t) ? { x: 7.9, y: 2.6 } : { x: -99, y: -99 }), (ctx, t, p) => {
      if (p.x < -50) return;
      const c = t % 9, k = c < 3 ? ease(c / 3) : c < 6.5 ? 1 : 1 - ease((c - 6.5) / 2.5);
      person(ctx, p.x, p.y, 0, { ...FLEECE, pose: 'stand', dir: 'l', arms: [1.5, 1.2], wear: blank, hold: (cc) => { cc.beginPath(); cc.rect(-0.12, -0.15, 0.26, 0.24); paint(cc, C.mustard, { lw: 0.02 }); } }, t);
      line3(ctx, [[7.6, 2.45, 1.05], [7.6 - k * 4.9, 2.45, 1.05]], C.mustard, 0.06);
      if (c > 3 && c < 6.4) speech(ctx, p.x, p.y, 2.6, Math.floor(t / 9) % 2 ? 'Seventy-one inches.' : 'Seventy-one. Again.', { size: 0.38 });
    }, { bias: 0.3 });
    R.mover((t) => (hours(13.1, 20.5)(t) ? { x: 2.6, y: 2.7 } : { x: -99, y: -99 }), (ctx, t, p) => {
      if (p.x < -50) return;
      const c = t % 9;
      person(ctx, p.x, p.y, 0, { ...SURE, pose: c > 3 && c < 6.5 ? 'point' : 'stand', dir: 'r', arms: [1.4, 0.4] }, t);
      if (c > 6.6 && c < 8.8) speech(ctx, p.x, p.y, 2.6, ['It\'s seventy-two.', 'The couch is seventy-three.', 'We could saw it.'][Math.floor(t / 9) % 3], { size: 0.38 });
    }, { bias: 0.3 });
    // Their dog, a beagle more or less, who has found the fish.
    R.mover((t) => {
      if (!inside(t) || playing()) return { x: -99, y: -99 };
      const h = hh(t);
      if (h >= 21) return { x: 11.9, y: 4.5, sleep: true };
      const p = t % 30;
      if (p < 18) return { x: 1.7, y: 6.9, dir: 'l', sniff: true, wag: true, bark: p > 2 && p < 4 };
      const k = (p - 18) / 12, a = k * Math.PI * 2;
      return { x: 5.5 + Math.cos(a) * 3.0, y: 7.2 + Math.sin(a) * 0.9, dir: Math.sin(a) > 0 ? 'l' : 'r', run: true };
    }, (ctx, t, p) => {
      if (p.x < -50) return;
      dog(ctx, p.x, p.y, 0, t, p);
      if (p.bark && Q.detail) speech(ctx, p.x, p.y, 1.5, 'Woof!', { size: 0.34 });
      if (p.sleep && Q.detail) label(ctx, p.x - 0.2, p.y - 0.2, 1.2 + ((t * 0.5) % 1) * 0.5, 'z', 0.3, C.ink);
    });
    // Night: on the air mattress with takeout, then asleep. (At the end
    // they're in the porch door instead, watching.)
    R.mover((t) => (hours(20.5, 22.6)(t) && !playing() ? { x: 11.2, y: 3.5, ahead: 3 } : { x: -99, y: -99 }), (ctx, t, p) => {
      if (p.x < -50) return;
      person(ctx, 10.8, 3.2, -0.3, { ...FLEECE, pose: 'sit', dir: 'l', arms: [1.6 + Math.sin(t * 2) * 0.3, 0.6], wear: blank }, t);
      person(ctx, 11.6, 3.5, -0.3, { ...SURE, pose: 'sit', dir: 'l', arms: [1.4, 0.8], hold: (c) => { c.beginPath(); c.rect(-0.12, -0.2, 0.26, 0.2); paint(c, C.white, { lw: 0.02 }); } }, t);
      says(ctx, 11.2, 3.3, 2.2, t, ['It\'ll fit.', 'It\'s seventy-two.', 'Who is G. Goose?'], 8, 3.5);
    });
    R.thing(12.4, 4.2, (ctx, t) => {
      sleeper(ctx, 10.7, 2.95, 0.4, 1.4, { blanket: C.teal, breath: (Math.sin(t * 0.8) + 1) / 2, hair: FLEECE.hair, skin: FLEECE.skin });
      sleeper(ctx, 10.7, 3.55, 0.4, 1.4, { blanket: C.teal, breath: (Math.sin(t * 0.8 + 2) + 1) / 2, hair: SURE.hair, skin: SURE.skin, mouth: true });
    }, { anim: true, on: (t) => hours(22.6, 29)(t) && !playing() });

    // ---------- The goose ----------
    // Before noon it's in the bean bag; after, in the hammock, swinging.
    R.goose((t) => (old(t) ? { x: 3.35, y: 6.95, z: 0.55, pose: 'sit', dir: 'r', ahead: 1.0 } : { x: 10.4 + swing(t), y: 7.05, z: 0.62, pose: Math.sin(t * 0.5) > 0.9 ? 'honk' : 'sit', dir: 'l', ahead: 2.6 }), { bias: 0.1 });

    // ---------- The ending ----------
    // Geese on the rope, pulling; the couch over the rail, PIVOT!, and set
    // down in the porch's corner, four of them on it. The couple in the porch
    // door, watching.
    for (let i = 0; i < 12; i++) {
      R.mover((t) => (playing() ? gooseAtEnd(i, t) : { x: -99, y: -99 }), (ctx, t, p) => {
        if (p.x < -50) return;
        drawGoose(ctx, p.x, p.y, p.z, t + i * 0.37, { dir: p.dir, pose: p.pose, scale: 0.8 });
      }, { bias: 0.9, depth: (t) => { if (!playing()) return 0; const p = gooseAtEnd(i, t); return p.x + p.y + (p.z > 0.5 ? 1.5 : 0.9); } });
    }
    // The rope while they haul, through their beaks.
    R.thing(15, 1.5, (ctx, t) => {
      if (beat(PIVOT) > 0) return;
      const h = beat(HAUL), pts = [PULLEY];
      for (let i = 0; i < HAULERS; i++) { const g = haulSpot(i, h, t); pts.push([g.x + 0.42, g.y - 0.42, 0.86]); }
      pts.push([12.8, 2.7, 0.02]);
      line3(ctx, pts, C.woodLight, 0.06);
    }, { anim: true, on: () => playing(), depth: 19.5 });
    R.mover((t) => {
      if (!playing()) return { x: -99, y: -99 };
      const k = beat(PIVOT);
      if (k <= 0) return { x: -99, y: -99 };
      const { c } = couchAt(k);
      return { x: c[0], y: c[1], ahead: c[0] > 14.6 ? 3 : 0 };
    }, (ctx, t, p) => {
      if (p.x < -50) return;
      const k = beat(PIVOT), { c, a } = couchAt(k);
      couch(ctx, c[0], c[1], c[2], a);
      // A paperback under the corner with no leg.
      if (k >= 1) rbox(ctx, c[0], c[1], 0, a, -CW / 2 + 0.1, CD / 2 - 0.35, 0.3, 0.25, 0, 0.2, C.teal, { flat: true, lw: 0.02 });
      if (k > 0.3 && k < 0.85 && Q.detail) speech(ctx, c[0], c[1], c[2] + 2.3, 'PIVOT!', { size: 0.55, fill: C.butter });
    }, { bias: 0.2 });
    // The couple in the porch door, stunned.
    R.mover((t) => (playing() ? { x: 12.7, y: 1.1 } : { x: -99, y: -99 }), (ctx, t, p) => {
      if (p.x < -50) return;
      const k = beat(PIVOT);
      const gasp = (c, hy) => { c.beginPath(); c.ellipse(0.2, hy + 0.14, 0.05, 0.07, 0, 0, Math.PI * 2); c.fillStyle = C.ink; c.fill(); };
      person(ctx, 12.7, 0.7, 0, { ...FLEECE, pose: 'stand', dir: 'r', arms: k >= 1 ? [0.3, -0.3] : [2.6, -2.6], wear: blank, face: gasp }, t);
      person(ctx, 12.75, 1.45, 0, { ...SURE, pose: k > 0.3 && k < 0.85 ? 'cheer' : 'stand', dir: 'r', arms: k > 0.3 && k < 0.85 ? undefined : [0.2, -0.4], face: gasp }, t);
      const line = k <= 0 ? 'Are those... geese?' : k < 1 ? 'PIVOT! PIVOT!' : 'Close enough.';
      if (Q.detail) speech(ctx, 12.75, 1.45, 2.7, line, { size: 0.42 });
      if (k >= 1 && Q.detail && (t % 6) > 3) speech(ctx, 12.7, 0.7, 3.2, 'It\'s seventy-two.', { size: 0.38 });
    }, { bias: 0.2 });

    // ---------- The finds ----------
    // The tape measure: the yellow one they keep losing, on the kitchen
    // floor with a foot of tape out.
    R.thing(3.3, 8.6, (ctx) => {
      box(ctx, 2.35, 7.95, 0, 0.45, 0.4, 0.4, C.mustard, { flat: true, lw: 0.03, top: tint(C.mustard, 0.2) });
      disc(ctx, 2.575, 8.15, 0.401, 0.12, C.ink, { stroke: false });
      box(ctx, 2.8, 8.25, 0, 0.8, 0.08, 0.02, C.butter, { flat: true, lw: 0.015 });
      if (Q.detail) for (let u = 2.9; u < 3.6; u += 0.1) line3(ctx, [[u, 8.26, 0.025], [u, 8.3, 0.025]], C.ink, 0.012);
      box(ctx, 3.58, 8.22, 0, 0.05, 0.14, 0.08, C.greyLight, { flat: true, stroke: false });
    });
    // The couch's missing leg, under the hammock: turned wood, a brass cup.
    R.thing(11.2, 7.9, (ctx) => {
      const [X, Y] = P(10.6, 7.6, 0.12);
      ctx.save(); ctx.translate(X, Y); ctx.rotate(-0.3);
      ctx.beginPath(); ctx.moveTo(-0.35, -0.1); ctx.quadraticCurveTo(-0.1, -0.16, 0.2, -0.08); ctx.lineTo(0.3, -0.07); ctx.lineTo(0.3, 0.07); ctx.lineTo(0.2, 0.08); ctx.quadraticCurveTo(-0.1, 0.16, -0.35, 0.1); ctx.closePath();
      paint(ctx, C.brown, { lw: 0.03 });
      ctx.beginPath(); ctx.rect(0.28, -0.08, 0.1, 0.16); paint(ctx, C.mustard, { lw: 0.02 });
      ctx.beginPath(); ctx.ellipse(-0.35, 0, 0.05, 0.1, 0, 0, Math.PI * 2); paint(ctx, shade(C.brown, 0.2), { lw: 0.02 });
      ctx.restore();
    });
    R.find({ id: 'tape', label: 'A tape measure', at: [2.7, 8.15, 0.25], r: 0.7 });
    R.find({ id: 'leg', label: 'The couch\'s missing leg', at: [10.6, 7.6, 0.15], r: 0.7 });
    R.find({ id: 'plan', label: 'A floor plan on a napkin', at: [5.95, 5.3, 1.03], r: 0.7, ...AFTER });
  },
};

// The last tenant's walk round the flat with his backpack.
const tenantWalk = route([[7.2, 6.6, 2], [3.2, 5.2, 2], [1.6, 7.6, 3], [6.0, 3.4, 2], [9.6, 3.2, 2]], { speed: 0.8 });

// A small dog (a beagle, more or less), at (x, y, z), facing dir.
// (The Yellow House's, copied.)
function dog(ctx, x, y, z, t, o = {}) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(o.dir === 'l' ? -1 : 1, 1);
  if (Q.detail) { ctx.beginPath(); ctx.ellipse(0, 0, 0.45, 0.14, 0, 0, Math.PI * 2); ctx.fillStyle = alpha(C.ink, 0.15); ctx.fill(); }
  if (o.sleep) {
    ctx.beginPath(); ctx.ellipse(0, -0.2, 0.45, 0.2, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.035 });
    ctx.beginPath(); ctx.ellipse(-0.1, -0.28, 0.2, 0.1, 0, 0, Math.PI * 2); ctx.fillStyle = C.brown; ctx.fill();
    ctx.beginPath(); ctx.arc(0.38, -0.2, 0.15, 0, Math.PI * 2); paint(ctx, C.wood, { lw: 0.035 });
    ctx.restore();
    return;
  }
  const run = o.run ? Math.sin(t * 16) * 0.12 : 0;
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.lineCap = 'round';
  ctx.beginPath();
  for (const [lx, sw] of [[-0.25, run], [-0.15, -run], [0.2, -run], [0.3, run]]) { ctx.moveTo(lx, -0.3); ctx.lineTo(lx + sw, 0); }
  ctx.stroke();
  const wag = Math.sin(t * (o.wag ? 18 : 3)) * 0.25;
  ctx.beginPath(); ctx.moveTo(-0.34, -0.42); ctx.lineTo(-0.52 + wag * 0.3, -0.72 + Math.abs(wag) * 0.2);
  ctx.lineWidth = 0.08; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -0.42, 0.4, 0.17, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.035 });
  ctx.beginPath(); ctx.ellipse(-0.1, -0.5, 0.2, 0.1, 0, 0, Math.PI * 2); ctx.fillStyle = C.brown; ctx.fill();
  const dip = o.sniff ? 0.22 + Math.sin(t * 9) * 0.03 : 0;
  ctx.beginPath(); ctx.arc(0.4, -0.62 + dip, 0.16, 0, Math.PI * 2); paint(ctx, C.wood, { lw: 0.035 });
  ctx.beginPath(); ctx.ellipse(0.56, -0.58 + dip, 0.1, 0.07, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.025 });
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0.65, -0.6 + dip, 0.035, 0, Math.PI * 2); ctx.arc(0.45, -0.66 + dip, 0.025, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0.32, -0.55 + dip, 0.07, 0.15, 0.2, 0, Math.PI * 2); paint(ctx, C.brown, { lw: 0.025 });
  ctx.restore();
}
