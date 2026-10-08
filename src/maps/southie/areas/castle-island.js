// Castle Island (docs/levels/southie.md): Day Boulevard's causeway along
// Pleasure Bay's north shore, Conley Terminal's containers behind its fence,
// the hot dog stand at the causeway's end (a lookalike, no name) and its
// line, the lot, Fort Independence on its mound (closed: it's a Tuesday),
// the McKay monument facing the channel, the walkway down the bay's east
// side, a footbridge, the Sugar Bowl at the tip of the Head Island causeway,
// and the harbor round it all (a container ship coming in, a sailboat, a
// kayak).
//
// The running gags:
// The line. Whatever the time and the weather, the hot dog line is the same
// length: someone joins the back every time someone leaves the window with
// food (one customer every six seconds, 11am to 9pm). In the rain they hold
// umbrellas. At 9pm the shutter comes down and the line stays anyway, in the
// dark, in lawn chairs: "They open at eleven." The goose is in it, forever:
// it gets a hot dog, eats it walking back, and gets back in line.
// The planes. Logan's 4R arrivals come in low over Pleasure Bay about once a
// minute (ambient.js, planeAt). Everyone on the island looks up and points,
// the spotters raise cameras and binoculars, one ticks his logbook, the dog
// barks, a kid covers his ears, and then everyone goes back to what they
// were doing. Inspector Pidge is with the spotters, sure the next one is the
// goose.
//
// World units, like plan.js and land.js (this area sits at the map's corner).
import { C, Q, goose as drawGoose, box, face, disc, paint, person, folk, speech, mix, tint, shade, alpha } from '../../../engine/art.js';
import { ZK } from '../../../engine/iso.js';
import { drawLand } from '../../../engine/terrain.js';
import { route } from '../../../engine/actors.js';
import { land, h } from '../land.js';
import { MCKAY, SUGAR_BOWL, GROUND, LOOP } from '../plan.js';
import { hour, at, between, nightK, rainK, wetK } from '../clock.js';
import { car, lawnChair, lettering, umbrella, bench, LAMP_H, streetlight as kitLight, gullStand, cupHeld, line3 as line } from '../kit.js';
import { CARS, INK, LIT, LAND, EVENING, CUP, BRAND } from '../style.js';
import { planeAt } from '../ambient.js';

const G = GROUND;
const TAU = Math.PI * 2;

// ---------- Small helpers ----------
const P3 = (x, y, z) => [x - y, (x + y) / 2 - z * ZK];
const gz = (x, y) => h(x, y);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (k) => { k = clamp01(k); return k * k * (3 - 2 * k); };
const frac = (v) => v - Math.floor(v);
const mod = (a, n) => ((a % n) + n) % n;
const lerp = (a, b, k) => a + (b - a) * k;
// The hour, running past midnight (1am is 25) so the evening stays in order.
const hh = (t) => { const hr = hour(t); return hr < 5 ? hr + 24 : hr; };
const raining = (t) => rainK(t) > 0.12;
const q8 = (k) => Math.round(k * 8) / 8;
const q16 = (k) => Math.round(k * 16) / 16;
const byNight = { fade: (t) => q8(nightK(t)), step: (t) => q8(nightK(t)) };
const HIDE = { x: -1e4, y: -1e4, hide: true };
// Every so often: true for `on` seconds of every `every`.
const every = (period, on, off = 0) => (t) => frac(t / period + off) < on / period;
// Which way someone moving by (dx, dy) faces.
const facing = (dx, dy) => ({ dir: dx - dy >= 0 ? 'r' : 'l', back: dx + dy < -0.01 });

// ---------- The planes ----------
// ambient.js flies one over every 57 seconds; it's over the island while
// it's between about -34 and 60 units along its line. PL(t): seconds since
// the last one came in (the same clock, so a scene can be timed to it).
const PERIOD = 57;
const PL = (t) => mod(t, PERIOD);
function planeK(t) {
  const p = planeAt(t);
  if (!p) return 0;
  return clamp01(Math.min((p.s + 34) / 8, (60 - p.s) / 8));
}
const overhead = (t) => planeK(t) > 0.5;
const UP = 2.7; // an arm pointing at the sky

// ---------- Inks ----------
const GRANITE = mix(C.greyLight, C.grey, 0.4);
const VEIL = alpha(C.night, 0.42);
const UMBRELLAS = [C.teal, C.coral, C.mustard, C.purple, C.navy, C.pink];
const COAT = mix(C.wood, C.greyLight, 0.45); // Pidge's trench coat
const MENU = mix(C.green, C.ink, 0.6); // the stand's chalkboard
const HULL = mix(C.navy, C.ink, 0.2);
const PUDDLE = alpha(tint(C.sky, 0.35), 0.6);
const MESH = alpha(C.grey, 0.22);


const pole = (ctx, x, y, z, ht, color = C.greyLight, r = 0.06) => box(ctx, x - r, y - r, z, r * 2, r * 2, ht, color, { flat: true, lw: 0.03 });
// A flat panel facing the lower left (along x, at y) or lower right (along y, at x).
function panel(ctx, along, x, y, z, w, ht, fill, o = {}) {
  const c = along === 'x' ? x : y;
  const pts = along === 'x'
    ? [[c - w / 2, y, z - ht / 2], [c + w / 2, y, z - ht / 2], [c + w / 2, y, z + ht / 2], [c - w / 2, y, z + ht / 2]]
    : [[x, c - w / 2, z - ht / 2], [x, c + w / 2, z - ht / 2], [x, c + w / 2, z + ht / 2], [x, c - w / 2, z + ht / 2]];
  face(ctx, pts, fill, { lw: o.lw ?? 0.03 });
}
// A polyline, walked by length: k from 0 to 1. Returns [x, y, dx, dy].
function along(pts, k) {
  let L = 0;
  const seg = [];
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
  let s = clamp01(k) * L;
  for (let i = 0; i < seg.length; i++) {
    if (s <= seg[i] || i === seg.length - 1) {
      const a = pts[i], b = pts[i + 1], u = seg[i] ? Math.min(1, s / seg[i]) : 0;
      return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, b[0] - a[0], b[1] - a[1]];
    }
    s -= seg[i];
  }
  return [pts[0][0], pts[0][1], 1, 0];
}

// The night: a veil of the night ink over solids' silhouettes (each a list of
// 3D points: its convex outline on the screen), in one path, all wound the
// same way, so overlaps aren't laid twice.
function hull2(pts) {
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  up.pop(); lo.pop();
  return lo.concat(up);
}
const boxPts = (x, y, z, w, d, ht) => [[x, y, z], [x + w, y, z], [x + w, y + d, z], [x, y + d, z], [x, y, z + ht], [x + w, y, z + ht], [x + w, y + d, z + ht], [x, y + d, z + ht]];
function veil(ctx, solids, fill = VEIL) {
  ctx.beginPath();
  for (const s of solids) {
    const hl = hull2(s.map((p) => P3(...p)));
    hl.forEach(([X, Y], i) => (i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y)));
    ctx.closePath();
  }
  ctx.fillStyle = fill;
  ctx.fill();
}
// A box turned by a (radians) about its center, sitting at z: its sides that
// face the viewer, then its top.
function rbox(ctx, cx, cy, z, w, d, ht, a, color, o = {}) {
  const c = Math.cos(a), s = Math.sin(a);
  const pt = (u, v) => [cx + u * c - v * s, cy + u * s + v * c];
  const k = [pt(-w / 2, -d / 2), pt(w / 2, -d / 2), pt(w / 2, d / 2), pt(-w / 2, d / 2)];
  for (let i = 0; i < 4; i++) {
    const A = k[i], B = k[(i + 1) % 4];
    const nx = B[1] - A[1], ny = -(B[0] - A[0]);
    if (nx + ny <= 0) continue;
    face(ctx, [[A[0], A[1], z], [B[0], B[1], z], [B[0], B[1], z + ht], [A[0], A[1], z + ht]], shade(color, ny > nx ? 0.22 : 0.1), { lw: o.lw ?? 0.03 });
  }
  face(ctx, k.map(([x, y]) => [x, y, z + ht]), color, { lw: o.lw ?? 0.03 });
}

// ---------- Things people hold (in the person's own units) ----------

function phoneHeld(ctx) {
  ctx.beginPath(); ctx.rect(-0.02, -0.34, 0.18, 0.28); paint(ctx, C.black, { lw: 0.02 });
}
// A hot dog in a paper boat: bun, frank, a line of mustard.
function dogShape(ctx, len = 1) {
  const L = 0.34 * len;
  ctx.beginPath(); ctx.roundRect(-L, -0.1, L * 2 + 0.06, 0.1, 0.05); paint(ctx, C.coral, { lw: 0.022 });
  ctx.beginPath(); ctx.roundRect(-L + 0.03, -0.06, L * 2, 0.11, 0.05); paint(ctx, C.woodLight, { lw: 0.022 });
  if (Q.detail) { ctx.strokeStyle = C.mustard; ctx.lineWidth = 0.03; ctx.beginPath(); for (let u = -L + 0.05; u < L; u += 0.08) ctx.lineTo(u, -0.1 + (Math.round(u * 25) % 2 ? 0.02 : -0.02)); ctx.stroke(); }
}
function hotdogHeld(ctx) { ctx.save(); ctx.translate(0.05, -0.1); dogShape(ctx, 0.75); ctx.restore(); }
function friesHeld(ctx) {
  ctx.fillStyle = C.mustard; ctx.strokeStyle = C.ink; ctx.lineWidth = 0.018;
  for (const [dx, hgt] of [[-0.1, 0.22], [-0.04, 0.28], [0.03, 0.24], [0.09, 0.2]]) { ctx.beginPath(); ctx.rect(dx, -hgt, 0.045, hgt); ctx.fill(); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-0.16, -0.12); ctx.lineTo(0.18, -0.12); ctx.lineTo(0.13, 0.03); ctx.lineTo(-0.11, 0.03); ctx.closePath();
  paint(ctx, C.white, { lw: 0.022 });
  ctx.fillStyle = C.red; ctx.fillRect(-0.12, -0.07, 0.26, 0.04);
}
function bookHeld(ctx) {
  ctx.beginPath(); ctx.rect(-0.04, -0.3, 0.36, 0.26); paint(ctx, C.navy, { lw: 0.025 });
  ctx.beginPath(); ctx.rect(0.0, -0.27, 0.3, 0.2); paint(ctx, C.white, { stroke: false });
}
// The logbook keeper's pencil, poised: his logbook's on the ground.
function pencilHeld(ctx) {
  ctx.save(); ctx.rotate(-0.6);
  ctx.beginPath(); ctx.rect(0.0, -0.05, 0.34, 0.07); paint(ctx, C.mustard, { lw: 0.02 });
  ctx.beginPath(); ctx.moveTo(0.34, -0.05); ctx.lineTo(0.42, -0.015); ctx.lineTo(0.34, 0.02); ctx.closePath(); paint(ctx, C.woodLight, { lw: 0.015 });
  ctx.fillStyle = C.pink; ctx.fillRect(-0.05, -0.05, 0.05, 0.07);
  ctx.restore();
}
function cameraHeld(ctx) {
  ctx.beginPath(); ctx.rect(-0.08, -0.2, 0.3, 0.2); paint(ctx, C.black, { lw: 0.02 });
  ctx.beginPath(); ctx.rect(0.2, -0.17, 0.3, 0.14); paint(ctx, shade(C.grey, 0.4), { lw: 0.02 });
}
function glassHeld(ctx) { // Pidge's magnifying glass
  ctx.strokeStyle = C.brown; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0.12, -0.2); ctx.stroke();
  ctx.beginPath(); ctx.arc(0.2, -0.33, 0.14, 0, TAU); paint(ctx, alpha(tint(C.sky, 0.4), 0.8), { lw: 0.035 });
}
// Raised to the eyes when a plane comes over (a face callback: drawn over the head).
function cameraUp(ctx, hy, back) {
  if (back) return;
  ctx.beginPath(); ctx.rect(0.1, hy - 0.17, 0.3, 0.26); paint(ctx, C.black, { lw: 0.025 });
  ctx.beginPath(); ctx.rect(0.38, hy - 0.2, 0.42, 0.24); paint(ctx, shade(C.grey, 0.35), { lw: 0.025 });
  ctx.beginPath(); ctx.rect(0.76, hy - 0.22, 0.08, 0.28); paint(ctx, C.black, { lw: 0.02 });
}
function binosUp(ctx, hy, back) {
  if (back) return;
  for (const dy of [-0.09, 0.07]) { ctx.beginPath(); ctx.rect(0.16, hy + dy - 0.07, 0.3, 0.13); paint(ctx, C.black, { lw: 0.02 }); }
}
// A rain poncho (the reader's), over the torso and down past the knees.
function poncho(ctx, b) {
  ctx.beginPath();
  ctx.moveTo(-0.3, b.top - 0.05); ctx.lineTo(0.3, b.top - 0.05); ctx.lineTo(0.5, b.hipY + 0.35); ctx.lineTo(-0.5, b.hipY + 0.35); ctx.closePath();
  paint(ctx, alpha(C.mustard, 0.92), { lw: 0.03 });
  ctx.beginPath(); ctx.arc(0.02, b.top - 0.32, 0.36, Math.PI * 0.95, Math.PI * 2.05); paint(ctx, C.mustard, { lw: 0.03 });
}

// Someone who holds still in their hours: cached pictures, one for each of
// dry and raining (o.umb: an umbrella color; o.wet: how they look in the
// rain) and calm and looking up at a plane (o.react: how they look then, or
// false to ignore it). o: { z, pose, dir, back, hold, arms, wear, face,
// scale, hours, depth, under, over }
function stay(R, x, y, look, o = {}) {
  const z = o.z ?? gz(x, y);
  const hours = o.hours || (() => true);
  const base = { ...look, pose: o.pose || 'stand', dir: o.dir || 'r', back: !!o.back };
  for (const k of ['hold', 'arms', 'wear', 'face', 'scale']) if (o[k]) base[k] = o[k];
  const react = o.react === false ? null : { arms: [UP, base.arms ? base.arms[1] : -0.15], ...(o.react || {}) };
  const depth = o.depth != null ? { depth: o.depth } : {};
  const wets = o.umb || o.wet ? [false, true] : [null];
  const reacts = react ? [false, true] : [null];
  for (const w of wets) for (const r of reacts) {
    const pose = { ...base, ...(w && o.wet ? o.wet : {}), ...(r ? react : {}) };
    R.thing(x, y, (ctx) => {
      if (o.under) o.under(ctx);
      person(ctx, x, y, z, pose, 0);
      if (w && o.umb) umbrella(ctx, x, y, z, o.umb);
      if (o.over) o.over(ctx);
    }, { on: (t) => hours(t) && (w === null || raining(t) === w) && (r === null || overhead(t) === r), ...depth });
  }
}
// A speech bubble now and then: say(t) returns the words, or null.
function talk(R, x, y, z, say, o = {}) {
  R.thing(x, y, (ctx, t) => { const s = say(t); if (s && Q.detail) speech(ctx, x, y, z, s, { size: o.size || 0.44, dx: o.dx || 0 }); }, { anim: true, depth: x + y + 6, on: (t) => !!say(t) });
}

// ---------- Street furniture (the kit's) ----------
const streetlight = (ctx, x, y, lit = false) => kitLight(ctx, x, y, gz(x, y), lit);
function lamp(R, x, y) {
  R.thing(x, y, (ctx) => streetlight(ctx, x, y));
  R.thing(x + 0.001, y + 0.001, (ctx) => streetlight(ctx, x, y, true), byNight);
  R.light({ at: [x, y, gz(x, y) + LAMP_H + 0.3], r: 3, color: LIT, k: nightK });
}
// A bench turned to face outward from a circle's middle (the Sugar Bowl's
// ring), at angle a round (cx, cy), r out.
function ringBench(ctx, cx, cy, r, a, z) {
  const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r, t = a - Math.PI / 2;
  const off = (v) => [x + Math.cos(a) * v, y + Math.sin(a) * v];
  const back = off(-0.3);
  // Back first when it's behind the seat on the screen, after when in front.
  const backFirst = Math.cos(a) + Math.sin(a) > 0;
  const drawBack = () => rbox(ctx, back[0], back[1], z + 0.5, 1.7, 0.08, 0.5, t, C.wood);
  if (backFirst) drawBack();
  for (const u of [-0.65, 0.65]) rbox(ctx, x + Math.cos(t) * u, y + Math.sin(t) * u, z, 0.1, 0.45, 0.45, t, C.ink, { lw: 0.02 });
  rbox(ctx, x, y, z + 0.45, 1.7, 0.6, 0.07, t, C.wood);
  if (!backFirst) drawBack();
}

function gullFly(ctx, x, y, z, t, dir = 1, fry = false) {
  const [X, Y] = P3(x, y, z);
  const flap = Math.sin(t * 11) * 0.22;
  ctx.save(); ctx.translate(X, Y); ctx.scale(dir, 1);
  ctx.beginPath(); ctx.moveTo(-0.5, -0.1 - flap); ctx.quadraticCurveTo(-0.2, -0.2, 0, 0); ctx.quadraticCurveTo(0.2, -0.2, 0.5, -0.1 - flap);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.14; ctx.lineCap = 'round'; ctx.stroke();
  ctx.strokeStyle = C.white; ctx.lineWidth = 0.08; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0.02, 0.02, 0.18, 0.07, 0, 0, TAU); paint(ctx, C.white, { lw: 0.025 });
  if (fry) { ctx.fillStyle = C.mustard; ctx.fillRect(0.18, 0.0, 0.2, 0.04); }
  ctx.restore();
}
// A dog (the one tied to the sign), standing, tail going.
function dog(ctx, x, y, z, t, dir, bark) {
  const [X, Y] = P3(x, y, z);
  const f = dir === 'l' ? -1 : 1, wag = Math.sin(t * (bark ? 20 : 6)) * 0.12;
  ctx.save(); ctx.translate(X, Y); ctx.scale(f, 1);
  if (Q.detail) { ctx.beginPath(); ctx.ellipse(0, 0, 0.45, 0.14, 0, 0, TAU); ctx.fillStyle = alpha(C.ink, 0.15); ctx.fill(); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.08; ctx.lineCap = 'round';
  ctx.beginPath(); for (const lx of [-0.24, -0.14, 0.18, 0.28]) { ctx.moveTo(lx, -0.28); ctx.lineTo(lx, 0); } ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-0.32, -0.38); ctx.lineTo(-0.5 + wag, -0.66); ctx.lineWidth = 0.07; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -0.38, 0.36, 0.16, 0, 0, TAU); paint(ctx, C.wood, { lw: 0.035 });
  const up = bark ? -0.12 : 0;
  ctx.beginPath(); ctx.arc(0.38, -0.56 + up, 0.15, 0, TAU); paint(ctx, C.wood, { lw: 0.035 });
  ctx.beginPath(); ctx.ellipse(0.53, -0.53 + up, 0.1, bark ? 0.09 : 0.06, 0, 0, TAU); paint(ctx, tint(C.wood, 0.3), { lw: 0.025 });
  ctx.beginPath(); ctx.ellipse(0.3, -0.5 + up, 0.06, 0.14, 0.3, 0, TAU); paint(ctx, C.brown, { lw: 0.02 });
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0.62, -0.56 + up, 0.03, 0, TAU); ctx.fill();
  ctx.restore();
}

// The goose's umbrella, tipped toward you like a shield: a navy canopy seen
// from the front (ribs, scalloped rim, the tip), covering its body and head
// and leaving the feet below and the tail tip behind. f: which way it faces.
const BROLLY = mix(C.navy, C.purple, 0.25);
function gooseBrolly(ctx, x, y, z, f, wob = 0) {
  const [X, Y] = P3(x, y, z);
  ctx.save(); ctx.translate(X, Y); ctx.scale(f, 1);
  const cx = 0.14, cy = -0.76 + wob, rx = 0.56, ry = 0.52, n = 8;
  // The tail tip out behind, drawn again so it clears the rim.
  ctx.beginPath(); ctx.moveTo(-0.36, -0.62); ctx.lineTo(-0.62, -0.74); ctx.lineTo(-0.4, -0.52); ctx.closePath();
  paint(ctx, C.white, { lw: 0.035 });
  // Its beak, poking out past the rim all the time (the playtest's phone
  // couldn't see the feet alone): orange, white cheek behind it.
  ctx.beginPath(); ctx.ellipse(cx + rx - 0.06, cy + 0.12, 0.09, 0.08, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.03 });
  ctx.beginPath(); ctx.moveTo(cx + rx - 0.0, cy + 0.08); ctx.lineTo(cx + rx + 0.26, cy + 0.15); ctx.lineTo(cx + rx - 0.0, cy + 0.2); ctx.closePath();
  paint(ctx, mix(C.coral, C.mustard, 0.45), { lw: 0.03 });
  // The canopy: scallops between the rib tips.
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU - Math.PI / 2, px = cx + Math.cos(a) * rx, py = cy + Math.sin(a) * ry;
    if (i === 0) { ctx.moveTo(px, py); continue; }
    const m = a - Math.PI / n;
    ctx.quadraticCurveTo(cx + Math.cos(m) * rx * 0.86, cy + Math.sin(m) * ry * 0.86, px, py);
  }
  ctx.closePath();
  paint(ctx, BROLLY, { lw: 0.04, dots: shade(BROLLY, 0.45), density: 0.12 });
  if (Q.detail) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU - Math.PI / 2; ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry); }
    ctx.strokeStyle = alpha(C.ink, 0.45); ctx.lineWidth = 0.02; ctx.stroke();
    // Every other panel a stripe, so it reads as an umbrella, not a shield.
    for (let i = 0; i < n; i += 2) {
      const a0 = (i / n) * TAU - Math.PI / 2, a1 = ((i + 1) / n) * TAU - Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a0) * rx * 0.97, cy + Math.sin(a0) * ry * 0.97);
      ctx.quadraticCurveTo(cx + Math.cos((a0 + a1) / 2) * rx * 0.84, cy + Math.sin((a0 + a1) / 2) * ry * 0.84, cx + Math.cos(a1) * rx * 0.97, cy + Math.sin(a1) * ry * 0.97);
      ctx.closePath(); ctx.fillStyle = alpha(C.mustard, 0.85); ctx.fill();
    }
  }
  disc2(ctx, cx, cy, 0.05, C.ink);
  ctx.restore();
}
function disc2(ctx, x, y, r, color) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = color; ctx.fill(); }

// A hot dog with everything, lying in its box at (x, y, z): the bun, the
// sausage, a zigzag of mustard, relish, onions and a tomato slice or two.
function loadedDog(ctx, x, y, z) {
  const [X, Y] = P3(x, y, z);
  ctx.save(); ctx.translate(X, Y);
  ctx.beginPath(); ctx.ellipse(0, 0, 0.34, 0.11, 0, 0, TAU); paint(ctx, C.wood, { lw: 0.025 });
  ctx.beginPath(); ctx.ellipse(0, -0.05, 0.36, 0.07, 0, 0, TAU); paint(ctx, C.red, { lw: 0.025 });
  if (Q.detail) {
    ctx.beginPath(); for (let i = 0; i <= 8; i++) ctx.lineTo(-0.28 + i * 0.07, -0.07 + (i % 2 ? -0.03 : 0.02));
    ctx.strokeStyle = C.mustard; ctx.lineWidth = 0.035; ctx.stroke();
    for (const [u, v, c] of [[-0.18, -0.02, C.leaf], [0.05, -0.1, C.leaf], [0.2, -0.03, C.leaf], [-0.06, -0.03, C.white], [0.12, -0.09, C.white], [-0.24, -0.08, C.white]]) { ctx.beginPath(); ctx.arc(u, v, 0.03, 0, TAU); ctx.fillStyle = c; ctx.fill(); }
    for (const u of [-0.1, 0.16]) { ctx.beginPath(); ctx.ellipse(u, -0.08, 0.06, 0.03, 0, 0, TAU); paint(ctx, C.coral, { lw: 0.015 }); }
  }
  ctx.restore();
}

// ---------- Where things are ----------
// The stand (plan.js STAND is its back corner): a low white-and-red box,
// its service window on the south face, the line running east from it.
const SX0 = 68, SY0 = 0.8, SX1 = 71.4, SY1 = 3.2, SH = 2.7;
const WIN = [70.25, 3.8]; // at the window, ordering
const slot = (k) => (k <= 0 ? WIN : [71.0 + 0.82 * k, 3.3 + (k % 2) * 0.14]);
function lineAt(p) {
  const a = Math.floor(p), f = p - a, A = slot(a), B = slot(a + 1);
  return [A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f];
}
const N = 8, M = N + 2, GOOSE_M = 3;
// Open 11 to 9, one customer every STEP seconds; a whole number of them a
// day, so the loop comes round to the same faces.
const T_OPEN = at(11), T_CLOSE = at(21), STEPS = 30, STEP = (T_CLOSE - T_OPEN) / STEPS;
const isOpen = between(11, 21);
// The Courier's second hot dog, set down for later once he's had his first
// (day.js has him at the stand from about 3:30).
const LATER = { when: between(15.8, 5), note: 'after 4pm' };
function qclock(t) {
  const s = mod(t, LOOP);
  if (s < T_OPEN) return { u: 0, open: false };
  if (s >= T_CLOSE) return { u: STEPS, open: false };
  return { u: (s - T_OPEN) / STEP, open: true };
}
const JOIN = [80.6, 6.3]; // new people come from the lot
const LEAVE = [WIN, [70.0, 4.7], [67.5, 5.35], [60.5, 5.3]]; // with food, off along the causeway
const GLEAVE = [WIN, [71.2, 4.5], [79.3, 4.55]]; // the goose goes round to the back
// Mover m's person right now: s is how far along they are (-1 served and
// leaving, 0 at the window, N just joining). Null when nobody's there.
function qstate(m, t) {
  const { u, open } = qclock(t);
  const base = Math.floor(u), f = u - base;
  const id = base - 1 + mod(m - (base - 1), M);
  const s = id - base;
  const goose = m === GOOSE_M;
  const rest = (p) => { const [x, y] = lineAt(p); return { id, s, p, x, y, moving: false, a: 1, ...(p < 0.5 ? { dir: 'r', back: true } : { dir: 'l', back: true }) }; };
  if (!open) return s >= N ? (goose ? rest(N) : null) : rest(s + 1);
  if (s === -1) {
    if (f < 0.15) return { ...rest(0), served: true };
    const k = (f - 0.15) / 0.85;
    const [x, y, dx, dy] = along(goose ? GLEAVE : LEAVE, k);
    return { id, s, p: -1, x, y, moving: true, ...facing(dx, dy), a: goose ? 1 : clamp01((1 - k) / 0.2), served: true };
  }
  if (s === N) {
    const k = clamp01(f / 0.7);
    if (k >= 1) return rest(N);
    const from = goose ? GLEAVE[GLEAVE.length - 1] : JOIN, to = slot(N);
    return { id, s, p: N, x: lerp(from[0], to[0], k), y: lerp(from[1], to[1], k), moving: true, ...facing(to[0] - from[0], to[1] - from[1]), a: goose ? 1 : clamp01(k / 0.2) };
  }
  const st = smooth(f / 0.3);
  const p = s + 1 - st;
  const r = rest(p);
  return f < 0.3 ? { ...r, moving: true, pose: 'walk' } : r;
}
const LOOKS = Array.from({ length: STEPS }, (_, i) => folk(700 + i, {
  ...(i % 9 === 4 ? { scale: 0.74 } : {}),
  ...(i % 5 === 1 ? { hat: 'cap' } : i % 7 === 3 ? { hat: 'beanie' } : {}),
}));

// The lot: parked along the causeway's south edge, facing the fort.
const LOT_Y = 6.9;
const PARKED = [
  { x: 66.4, color: CARS[1], who: [[0.2, -0.3, 11, 22.5], [0.2, 0.3, 11, 22.5]] },
  { x: 69.6, color: CARS[4], who: [[0.2, -0.3, 7, 23.5]] },
  { x: 72.8, color: CARS[6], who: [] },
  { x: 76.0, color: CARS[2], who: [[0.2, -0.3, 12, 20], [-0.45, 0.3, 12, 20]], dog: true },
];

// Fort Independence: five-sided granite on the mound, its front face along
// x (so its door and its name face you), the parade ground inside.
const FC = [88, 9.4], FR = 4.35, FRI = 3.05, FTOP = 4.4, PARADE = 2.0;
const FANG = [54, 126, 198, 270, 342].map((d) => (d * Math.PI) / 180);
const fv = (r, i) => [FC[0] + r * Math.cos(FANG[i]), FC[1] + r * Math.sin(FANG[i])];
const FRONT_Y = fv(FR, 0)[1]; // the face with the door
const DOOR_X = FC[0];

// The walk round the bay: in along the Head Island causeway, round the
// Sugar Bowl, over the footbridge, up the east walkway, through the lot and
// out along the causeway (and back: they turn round at the area's edges).
const LOOPWALK = [
  [58.0, 53.0], [68.6, 53.0], [69.3, 51.1], [70.5, 50.3], [72.5, 49.95], [74.3, 50.8],
  [75.0, 49.9], [77.1, 46.8], [77.8, 45.0], [78.8, 30.0], [78.4, 15.0], [80.1, 12.4], [80.3, 8.6],
  [79.6, 5.65], [65.0, 5.65], [64.2, 7.0], [58.0, 7.0],
];
// The footbridge from the east walkway's end to the Sugar Bowl, over the gap.
const BRIDGE = [[77.35, 46.7], [74.75, 50.3]];

// The container ship: in from the sea up the channel east of the island,
// bow first, from about 8:30am to 3pm, then gone behind the island.
const SHIP = { x0: 92.3, w: 3.2, L: 15, t0: 58, t1: 222, y0: 70, y1: 21 };
function shipBow(t) {
  const s = mod(t, LOOP);
  if (s < SHIP.t0 || s > SHIP.t1 + 10) return null;
  const k = clamp01((s - SHIP.t0) / (SHIP.t1 - SHIP.t0));
  return { y: lerp(SHIP.y0, SHIP.y1, k), a: s > SHIP.t1 ? 1 - (s - SHIP.t1) / 10 : 1 };
}

export default {
  id: 'castle-island',
  name: 'Castle Island',
  blurb: 'The hot dog line is the same length at noon, in the rain and at midnight. Flip the clock: somebody\'s saving lunch for later.',
  describe: 'The end of Day Boulevard: a hot dog stand under red and white stripes, plane spotters at the container port\'s fence, and Fort Independence behind a tall obelisk. Walkers loop the bay, and a plane comes in low every minute so everyone looks up. At night lamps glow along the causeway.',
  home: [76, 6],
  build(R) {
    drawLand(R, land, { fade: nightK, inks: { ...EVENING, island: EVENING.lawn } });

    // ---------- Paint on the ground ----------
    // A quad that follows the ground's height (the causeway runs down to the
    // water along its south edge).
    // (Cut at lo..hi in x: see the two halves below.)
    let lo = -Infinity, hi = Infinity;
    const gquad = (ctx, x0, y0, x1, y1, fill) => {
      x0 = Math.max(x0, lo); x1 = Math.min(x1, hi);
      if (x1 <= x0) return;
      const pts = [];
      for (let x = x0; x < x1; x += 1) pts.push([x, y0]);
      for (let y = y0; y < y1; y += 0.5) pts.push([x1, y]);
      for (let x = x1; x > x0; x -= 1) pts.push([x, y1]);
      for (let y = y1; y > y0; y -= 0.5) pts.push([x0, y]);
      face(ctx, pts.map(([x, y]) => [x, y, gz(x, y) + 0.012]), fill, { stroke: false });
    };
    const paintGround = (ink) => (ctx) => {
      gquad(ctx, 58, 2.2, 64.5, 3.5, ink.paving); // the causeway's north walk, by the fence
      gquad(ctx, 64.5, 2.2, 80.6, 5.0, ink.paving); // in front of the stand
      gquad(ctx, 64.5, 5.0, 80.6, 7.4, ink.road); // the lot
      gquad(ctx, 58, 6.3, 64.5, 7.4, ink.paving); // the south walk, along the rail
      // Kerbs.
      for (let [a, b, y] of [[58, 64.5, 3.5], [64.5, 80.6, 5.0], [58, 64.5, 6.3]]) if ((a = Math.max(a, lo)) < (b = Math.min(b, hi))) face(ctx, [[a, y - 0.06, G + 0.015], [b, y - 0.06, G + 0.015], [b, y + 0.06, G + 0.015], [a, y + 0.06, G + 0.015]], ink.kerb, { stroke: false });
      // Day Boulevard's center line, dashed, and the lot's spaces.
      for (let x = 58.3; x < 64; x += 1.2) if (x >= lo && x < hi) face(ctx, [[x, 4.86, G + 0.015], [x + 0.6, 4.86, G + 0.015], [x + 0.6, 4.96, G + 0.015], [x, 4.96, G + 0.015]], ink === LAND ? C.mustard : mix(C.mustard, C.night, 0.55), { stroke: false });
      for (const x of [64.8, 68.0, 71.2, 74.4, 77.6]) if (x >= lo && x < hi) face(ctx, [[x, 6.05, G + 0.015], [x + 0.08, 6.05, G + 0.015], [x + 0.08, 7.2, gz(x, 7.2) + 0.015], [x, 7.2, gz(x, 7.2) + 0.015]], ink.line, { stroke: false });
    };
    // In two halves, each drawn only by the pieces it lies on: drawn whole by
    // every piece of the island, the piece east of x 64 painted the south walk
    // over the fishermen standing on it.
    const halves = (paint, o) => {
      for (const [x0, x1] of [[58, 64], [64, 81]]) {
        const it = R.rug((ctx, t) => { lo = x0; hi = x1; paint(ctx, t); lo = -Infinity; hi = Infinity; }, o);
        it.area = [x0, 2, x1, 8];
      }
    };
    halves(paintGround(LAND));
    halves(paintGround(EVENING), { fade: (t) => q8(nightK(t)), step: (t) => q8(nightK(t)) });
    // Wet from ten till evening, with puddles that ripple while it rains.
    const PUDDLES = [[73.5, 4.4, 0.7], [67.2, 6.0, 0.8], [61.0, 4.2, 0.6], [78.5, 6.4, 0.6], [79.0, 25.0, 0.5], [70.5, 52.2, 0.55]];
    const wetFade = { fade: (t) => q16(wetK(t)), step: (t) => q16(wetK(t)) };
    halves((ctx) => {
      for (const [x, y, r] of PUDDLES) {
        if (x < lo || x >= hi || y > 8) continue;
        disc(ctx, x, y, gz(x, y) + 0.02, r, PUDDLE, { stroke: alpha(C.ink, 0.35), lw: 0.03 });
        if (Q.detail) disc(ctx, x - r * 0.2, y - r * 0.2, gz(x, y) + 0.022, r * 0.3, alpha(C.white, 0.5), { stroke: false });
      }
    }, wetFade);
    // The puddles out on the walks, each on its own patch.
    for (const [x, y, r] of PUDDLES) {
      if (y <= 8) continue;
      const it = R.rug((ctx) => {
        disc(ctx, x, y, gz(x, y) + 0.02, r, PUDDLE, { stroke: alpha(C.ink, 0.35), lw: 0.03 });
        if (Q.detail) disc(ctx, x - r * 0.2, y - r * 0.2, gz(x, y) + 0.022, r * 0.3, alpha(C.white, 0.5), { stroke: false });
      }, wetFade);
      it.area = [x - r - 0.5, y - r - 0.5, x + r + 0.5, y + r + 0.5];
    }
    PUDDLES.forEach(([x, y, r], j) => {
      const it = R.rug((ctx, t) => {
        if (!Q.detail) return;
        for (let i = 0; i < 2; i++) {
          const k = frac(t * 0.8 + i * 0.5 + j * 0.37);
          ctx.save(); ctx.globalAlpha *= (1 - k) * rainK(t);
          disc(ctx, x + Math.sin(j * 3 + Math.floor(t * 0.8 + i * 0.5 + j * 0.37) * 1.7) * r * 0.4, y, gz(x, y) + 0.03, 0.1 + k * 0.4, null, { stroke: C.white, lw: 0.03 });
          ctx.restore();
        }
      }, { anim: true, on: raining });
      it.area = [x - r - 1, y - r - 1, x + r + 1, y + r + 1];
    });

    // ---------- Conley Terminal, behind the fence ----------
    // Containers stacked one to three high (kept clear of the seams at x 64
    // and 80), sorted by their back corners so the fence stands in front.
    const BOXES = [C.coral, C.teal, C.navy, C.mustard, C.red, INK.harbor, C.green, C.purple];
    const STACKS = [[58.3, 3, 0], [64.8, 2, 3], [72.0, 3, 5], [75.1, 2, 1], [81.0, 1, 6], [84.1, 2, 2], [87.2, 3, 4], [90.3, 1, 7], [93.4, 2, 0]];
    const container = (ctx, x, y, z, color, L = 3.0) => {
      box(ctx, x, y, z, L, 1.3, 1.25, color, { lw: 0.035, dens: 0.16 });
      if (!Q.detail) return;
      ctx.save(); ctx.globalAlpha *= 0.35;
      for (let u = x + 0.25; u < x + L - 0.1; u += 0.25) line(ctx, [[u, y + 1.3, z + 0.08], [u, y + 1.3, z + 1.17]], shade(color, 0.5), 0.025);
      ctx.restore();
      line(ctx, [[x + L, y + 0.4, z + 0.1], [x + L, y + 0.4, z + 1.15]], shade(color, 0.4), 0.03);
    };
    STACKS.forEach(([x, n, c]) => {
      const L = x > 93 ? 2.4 : 3.0;
      R.thing(x, 0.2, (ctx) => { for (let i = 0; i < n; i++) container(ctx, x, 0.2, G + i * 1.25, BOXES[(c + i * 3) % BOXES.length], L); }, { depth: x + 0.2 });
      R.thing(x + 0.001, 0.2, (ctx) => veil(ctx, [boxPts(x, 0.2, G, L, 1.3, n * 1.25)]), { ...byNight, depth: x + 0.201 });
    });
    // The straddle carrier, shuffling one container between two stacks.
    {
      const period = 44;
      const at = (t) => {
        const k = mod(t, period);
        // 0-8 drive east, 8-14 lower and lift, 14-22 drive west, 22-28 lower and lift, rest idle.
        const xA = 80.8, xB = 83.9;
        let x = xA, hook = 1;
        if (k < 8) x = lerp(xA, xB, smooth(k / 8));
        else if (k < 14) { x = xB; hook = Math.abs((k - 11) / 3); }
        else if (k < 22) x = lerp(xB, xA, smooth((k - 14) / 8));
        else if (k < 28) { x = xA; hook = Math.abs((k - 25) / 3); }
        return { x, hook, carry: k >= 11 && k < 25 };
      };
      const frame = (ctx, x, part) => {
        const w = 3.4, y0 = 0.02, y1 = 2.02, top = G + 4.6;
        const legs = part === 'back' ? [[x, y0], [x + w - 0.2, y0]] : [[x, y1 - 0.2], [x + w - 0.2, y1 - 0.2]];
        for (const [lx, ly] of legs) box(ctx, lx, ly, G, 0.2, 0.2, 4.6, C.mustard, { flat: true, lw: 0.03 });
        if (part === 'back') return;
        box(ctx, x, y0, top, 0.2, y1 - y0, 0.3, C.mustard, { flat: true, lw: 0.03 });
        box(ctx, x + w - 0.2, y0, top, 0.2, y1 - y0, 0.3, C.mustard, { flat: true, lw: 0.03 });
        box(ctx, x, y1 - 0.2, top, w, 0.2, 0.3, C.mustard, { flat: true, lw: 0.03 });
        box(ctx, x, y0, top, w, 0.2, 0.3, C.mustard, { flat: true, lw: 0.03 });
        box(ctx, x + w - 0.9, y1 - 0.9, top + 0.3, 0.9, 0.9, 0.8, C.white, { flat: true, lw: 0.03, right: tint(C.sky, 0.3) });
      };
      R.mover((t) => ({ x: at(t).x + 3.4, y: 0.05 }), (ctx, t) => frame(ctx, at(t).x, 'back'));
      R.mover((t) => ({ x: at(t).x + 3.4, y: 2.02 }), (ctx, t) => {
        const p = at(t), x = p.x;
        const stackTop = G + (x < 82.4 ? 1.25 : 2.5);
        const hz = p.carry ? lerp(stackTop, G + 3.2, p.hook) : G + 3.9;
        if (Q.detail) for (const u of [x + 0.6, x + 2.8]) line(ctx, [[u, 1.0, G + 4.6], [u, 1.0, hz + (p.carry ? 1.25 : 0)]], C.ink, 0.03);
        if (p.carry) container(ctx, x + 0.2, 0.35, hz, C.purple);
        else box(ctx, x + 0.3, 0.45, hz, 2.8, 1.1, 0.12, C.mustard, { flat: true, lw: 0.025 });
        frame(ctx, x, 'front');
        const n = nightK(t);
        if (n > 0.02) { ctx.save(); ctx.globalAlpha *= q8(n); veil(ctx, [boxPts(x, 0.02, G, 3.4, 2, 5.7)]); ctx.restore(); }
        if (n > 0.3 && frac(t * 0.7) < 0.5) disc(ctx, x + 3.0, 1.5, G + 5.8, 0.12, C.coral, { lw: 0.02 });
      });
    }
    // The fence along the port: chain-link, posts, barbed wire, in short
    // pieces (each sorts by its back end, so everything in front of it draws
    // after it and the containers behind before).
    const FY = 2.15, FH = 2.1;
    const fence = (ctx, a, b) => {
      face(ctx, [[a, FY, G], [b, FY, G], [b, FY, G + FH], [a, FY, G + FH]], MESH, { stroke: false });
      if (Q.detail) {
        ctx.save(); ctx.globalAlpha *= 0.35;
        for (let u = a; u < b; u += 0.35) {
          line(ctx, [[u, FY, G], [Math.min(b, u + FH * 0.5), FY, G + Math.min(FH, (b - u) * 2)]], C.ink, 0.015);
          line(ctx, [[Math.min(b, u + 0.35), FY, G], [Math.max(a, u + 0.35 - FH * 0.5), FY, G + Math.min(FH, (u + 0.35 - a) * 2)]], C.ink, 0.015);
        }
        ctx.restore();
        ctx.save(); ctx.globalAlpha *= 0.6;
        const pts = [];
        for (let u = a; u <= b; u += 0.2) pts.push([u, FY, G + FH + 0.15 + (Math.round(u * 5) % 2 ? 0.1 : 0)]);
        line(ctx, pts, C.ink, 0.02);
        ctx.restore();
      }
      line(ctx, [[a, FY, G + FH], [b, FY, G + FH]], C.grey, 0.06);
      for (let u = a; u <= b + 1e-6; u += Math.max(0.5, (b - a) / Math.ceil((b - a) / 2.2))) pole(ctx, u, FY, G, FH + 0.25, C.grey, 0.05);
    };
    const FENCE = [[58.0, 60.6], [60.6, 63.9], [64.1, 66.3], [66.3, 67.9], [71.5, 74.3], [74.3, 77.1], [77.1, 79.9], [80.1, 83.0], [83.0, 86.0], [86.0, 89.0], [89.0, 92.0], [92.0, 95.8]];
    for (const [a, b] of FENCE) R.thing(a, FY, (ctx) => fence(ctx, a, b), { depth: a + FY });
    // Its sign.
    R.thing(81.7, FY, (ctx) => {
      panel(ctx, 'x', 82.2, FY + 0.03, G + 1.45, 0.95, 0.62, C.white, { lw: 0.03 });
      panel(ctx, 'x', 82.2, FY + 0.035, G + 1.66, 0.87, 0.16, C.red, { lw: 0.01 });
      lettering(ctx, 'x', 82.2, FY + 0.04, G + 1.66, 'PORT PROPERTY', 0.09, C.white, 'Bagel Fat One');
      lettering(ctx, 'x', 82.2, FY + 0.04, G + 1.45, 'NO TRESPASSING', 0.08, C.ink, 'Bagel Fat One');
      lettering(ctx, 'x', 82.2, FY + 0.04, G + 1.27, '(planes excepted)', 0.07, C.ink);
    }, { depth: 81.7 + FY + 0.01 });

    // ---------- The hot dog stand ----------
    R.thing(SX1, SY1, (ctx) => {
      const z = G;
      box(ctx, SX0, SY0, z, SX1 - SX0, SY1 - SY0, SH, C.white, { flat: true, lw: 0.045, left: shade(C.white, 0.07), right: tint(C.greyLight, 0.2) });
      // A red band at the top and a red kick plate at the bottom.
      for (const [z0, z1] of [[z, z + 0.35], [z + SH - 0.45, z + SH]]) {
        face(ctx, [[SX0, SY1, z0], [SX1, SY1, z0], [SX1, SY1, z1], [SX0, SY1, z1]], C.red, { lw: 0.03 });
        face(ctx, [[SX1, SY0, z0], [SX1, SY1, z0], [SX1, SY1, z1], [SX1, SY0, z1]], shade(C.red, 0.08), { lw: 0.03 });
      }
      // The roof, overhanging, and its sign.
      box(ctx, SX0 - 0.15, SY0 - 0.15, z + SH, SX1 - SX0 + 0.3, SY1 - SY0 + 0.3, 0.16, C.red, { flat: true, lw: 0.035, top: tint(C.greyLight, 0.2) });
      for (const u of [SX0 + 0.5, SX1 - 0.5]) pole(ctx, u, 2.0, z + SH + 0.16, 0.5, C.ink, 0.04);
      box(ctx, SX0 + 0.1, 1.95, z + SH + 0.55, SX1 - SX0 - 0.2, 0.1, 0.85, C.white, { flat: true, lw: 0.035 });
      panel(ctx, 'x', (SX0 + SX1) / 2, 2.051, z + SH + 0.97, SX1 - SX0 - 0.4, 0.66, C.red, { lw: 0.02 });
      lettering(ctx, 'x', (SX0 + SX1) / 2, 2.06, z + SH + 1.03, 'HOT DOGS', 0.42, C.white, 'Bagel Fat One');
      lettering(ctx, 'x', (SX0 + SX1) / 2, 2.06, z + SH + 0.74, 'CLAMS  ·  FRIES  ·  NO SEATING (SIT ANYWHERE)', 0.075, C.butter);
      // The menu on the east face: a chalkboard.
      const mx = SX1 + 0.01;
      face(ctx, [[mx, 1.0, z + 0.75], [mx, 3.0, z + 0.75], [mx, 3.0, z + 2.1], [mx, 1.0, z + 2.1]], MENU, { lw: 0.035 });
      lettering(ctx, 'y', mx + 0.01, 2.0, z + 1.88, 'MENU', 0.2, C.butter, 'Bagel Fat One');
      const items = [['HOT DOG', '3'], ['ONE WITH EVERYTHING', '4'], ['FRIED CLAMS', 'MKT'], ['FRIES', '3'], ['CHOWDA', '5']];
      items.forEach(([name, price], i) => {
        lettering(ctx, 'y', mx + 0.01, 1.62, z + 1.62 - i * 0.16, name, 0.085, C.white);
        lettering(ctx, 'y', mx + 0.01, 2.72, z + 1.62 - i * 0.16, price, 0.085, C.butter);
      });
      lettering(ctx, 'y', mx + 0.01, 2.0, z + 0.86, 'CASH? CARD? YES.', 0.11, C.coral, 'Bagel Fat One');
      // Specials, beside the window.
      face(ctx, [[SX0 + 0.15, SY1 + 0.01, z + 1.0], [SX0 + 1.05, SY1 + 0.01, z + 1.0], [SX0 + 1.05, SY1 + 0.01, z + 2.1], [SX0 + 0.15, SY1 + 0.01, z + 2.1]], C.butter, { lw: 0.03 });
      lettering(ctx, 'x', SX0 + 0.6, SY1 + 0.02, z + 1.88, 'TODAY', 0.12, C.red, 'Bagel Fat One');
      lettering(ctx, 'x', SX0 + 0.6, SY1 + 0.02, z + 1.62, 'SAME AS', 0.085, C.ink);
      lettering(ctx, 'x', SX0 + 0.6, SY1 + 0.02, z + 1.48, 'YESTERDAY', 0.085, C.ink);
      lettering(ctx, 'x', SX0 + 0.6, SY1 + 0.02, z + 1.2, 'SINCE FOREVER', 0.07, C.ink);
      // The window's frame (what's in it is drawn live).
      face(ctx, [[69.3, SY1 + 0.005, z + 0.92], [71.15, SY1 + 0.005, z + 0.92], [71.15, SY1 + 0.005, z + 2.45], [69.3, SY1 + 0.005, z + 2.45]], C.red, { lw: 0.035 });
      // The awning over it, striped.
      const aw = (u, v) => [u, SY1 + v * 0.95, z + 3.0 - v * 0.3];
      for (let i = 0; i < 8; i++) {
        const u0 = 69.1 + i * 0.28, u1 = u0 + 0.28;
        face(ctx, [aw(u0, 0), aw(u1, 0), aw(u1, 1), aw(u0, 1)], i % 2 ? C.white : C.red, { stroke: false });
      }
      face(ctx, [aw(69.1, 0), aw(71.34, 0), aw(71.34, 1), aw(69.1, 1)], null, { lw: 0.035 });
      if (Q.detail) for (let i = 0; i < 8; i++) {
        const u0 = 69.1 + i * 0.28, [X, Y] = P3(u0 + 0.14, SY1 + 0.95, z + 2.7);
        ctx.beginPath(); ctx.arc(X, Y, 0.14, 0, Math.PI); paint(ctx, i % 2 ? C.white : C.red, { lw: 0.025 });
      }
    }, { depth: 71.0 });
    R.thing(SX1 + 0.001, SY1, (ctx) => veil(ctx, [boxPts(SX0 - 0.15, SY0 - 0.15, G, SX1 - SX0 + 0.3, SY1 - SY0 + 1.1, SH + 1.4)]), { ...byNight, depth: 71.001 });
    // The window: the cook handing them out when it's open; the shutter
    // down when it isn't, with the hours on it.
    R.thing(SX1, SY1 + 0.01, (ctx, t) => {
      const z = G, open = isOpen(t);
      const win = [[69.45, SY1 + 0.01, z + 1.05], [71.0, SY1 + 0.01, z + 1.05], [71.0, SY1 + 0.01, z + 2.35], [69.45, SY1 + 0.01, z + 2.35]];
      if (!open) {
        face(ctx, win, tint(C.grey, 0.2), { lw: 0.03 });
        if (Q.detail) {
          ctx.save(); ctx.globalAlpha *= 0.5;
          for (let zz = z + 1.15; zz < z + 2.3; zz += 0.12) line(ctx, [[69.45, SY1 + 0.012, zz], [71.0, SY1 + 0.012, zz]], C.ink, 0.02);
          ctx.restore();
          panel(ctx, 'x', 70.22, SY1 + 0.015, z + 1.7, 0.9, 0.36, C.white, { lw: 0.025 });
          lettering(ctx, 'x', 70.22, SY1 + 0.02, z + 1.76, 'CLOSED', 0.11, C.red, 'Bagel Fat One');
          lettering(ctx, 'x', 70.22, SY1 + 0.02, z + 1.6, 'OPEN 11AM', 0.07, C.ink);
        }
        return;
      }
      face(ctx, win, mix(shade(C.woodLight, 0.55), LIT, q8(nightK(t)) * 0.6), { lw: 0.03 });
      ctx.save();
      face(ctx, win, null, { stroke: false });
      ctx.clip();
      const f = frac(qclock(t).u);
      const hand = f > 0.82 || f < 0.12;
      person(ctx, 70.2, 2.5, z + 0.05, { ...folk(760, { top: C.white, hat: 'chef', bottom: C.red }), dir: 'l', arms: hand ? [1.5, 0.4] : [0.9 + Math.sin(t * 5) * 0.3, 0.6], hold: hand ? hotdogHeld : null }, t);
      ctx.restore();
      // The counter.
      box(ctx, 69.4, SY1, z + 0.98, 1.65, 0.28, 0.08, C.greyLight, { flat: true, lw: 0.025 });
      if (Q.detail) {
        for (const [u, c] of [[69.6, C.mustard], [69.75, C.red], [69.9, C.leaf]]) box(ctx, u, SY1 + 0.08, z + 1.06, 0.1, 0.1, 0.22, c, { flat: true, lw: 0.015 });
        box(ctx, 70.55, SY1 + 0.05, z + 1.06, 0.3, 0.18, 0.14, C.white, { flat: true, lw: 0.015 });
      }
    }, { anim: true, depth: 71.002 });
    talk(R, 70.2, SY1, G + 3.2, (t) => (isOpen(t) && frac(qclock(t).u) < 0.14 ? (mod(Math.floor(qclock(t).u), 4) === 1 ? 'ONE WITH EVERYTHING!' : 'NEXT!') : null), { size: 0.4 });
    R.light({ at: [70.2, SY1 + 0.6, G + 2.6], r: 2.2, color: LIT, k: (t) => nightK(t) * (isOpen(t) ? 1 : 0.45) });
    // Steam from the vent on the roof.
    R.thing(68.6, 1.4, (ctx, t) => {
      if (!Q.detail || !isOpen(t)) return;
      box(ctx, 68.4, 1.2, G + SH + 0.16, 0.35, 0.35, 0.3, C.grey, { flat: true, lw: 0.02 });
      for (let i = 0; i < 5; i++) {
        const k = frac(t / 3 + i / 5), [X, Y] = P3(68.58, 1.38, G + SH + 0.5 + k * 2.2);
        ctx.beginPath(); ctx.arc(X + Math.sin(t * 2 + i) * 0.15 - k * 0.5, Y, 0.12 + k * 0.25, 0, TAU);
        ctx.fillStyle = alpha(C.white, 0.55 * (1 - k)); ctx.fill();
      }
    }, { anim: true, depth: 70.9 });

    // ---------- The line ----------
    // "LINE STARTS HERE", right where it always ends, and a dog tied to it.
    R.thing(78.5, 2.75, (ctx) => {
      pole(ctx, 78.5, 2.7, G, 1.9, C.ink, 0.045);
      panel(ctx, 'x', 78.5, 2.76, G + 1.72, 0.85, 0.48, C.butter, { lw: 0.03 });
      lettering(ctx, 'x', 78.5, 2.77, G + 1.8, 'LINE', 0.13, C.red, 'Bagel Fat One');
      lettering(ctx, 'x', 78.5, 2.77, G + 1.62, 'STARTS HERE', 0.08, C.ink, 'Bagel Fat One');
    });
    const dogHere = between(8, 20);
    R.mover(() => ({ x: 79.05, y: 2.95 }), (ctx, t) => {
      if (!dogHere(t)) return;
      const bark = overhead(t) && frac(t * 1.5) < 0.6;
      line(ctx, [[78.55, 2.72, G + 0.6], [78.8, 2.9, G + 0.2], [79.25, 2.95, G + 0.5]], C.red, 0.025);
      dog(ctx, 79.05, 2.95, G, t, 'l', bark);
      if (bark && Q.detail) speech(ctx, 79.3, 2.95, G + 1.4, 'WOOF!', { size: 0.4 });
    });
    // Everyone in it (and the goose).
    for (let m = 0; m < M; m++) {
      if (m === GOOSE_M) continue;
      R.mover((t) => { const s = qstate(m, t); return s ? { ...s } : HIDE; }, (ctx, t, p) => {
        if (p.hide || p.a <= 0.01) return;
        const look = LOOKS[mod(p.id, STEPS)];
        const hr = hh(t), open = isOpen(t);
        const z = gz(p.x, p.y);
        const night = !open && (hr >= 21.2 || hr < 6.5);
        // (Whoever's either side of the goose stands, so its umbrella clears
        // their chair and its feet aren't under one.)
        const gq = night ? qstate(GOOSE_M, t) : null;
        const chair = night && p.p >= 1 && mod(p.id, 2) === 0 && !(gq && Math.abs(p.p - gq.p) < 1.5);
        const up = overhead(t);
        let hold = null;
        if (p.served) hold = mod(p.id, 2) ? friesHeld : hotdogHeld;
        else if (mod(p.id, 3) === 0 || night) hold = phoneHeld;
        else if (mod(p.id, 3) === 1 && hr < 12.5) hold = cupHeld;
        // Chatting with whoever's behind them, now and then.
        const turned = !p.moving && p.p >= 1 && mod(p.id, 7) === 2 && !chair;
        const o = { ...look, pose: p.moving ? 'walk' : chair ? 'sit' : 'stand', dir: turned ? 'r' : p.dir, back: turned ? false : p.back, ...(hold ? { hold } : {}), ...(up && !p.moving ? { arms: [UP, -0.2] } : {}) };
        ctx.save(); ctx.globalAlpha *= p.a;
        if (chair) lawnChair(ctx, p.x, p.y, z, UMBRELLAS[mod(p.id, 6)], { face: -1 });
        person(ctx, p.x, p.y, chair ? z - 0.24 : z, o, t);
        if (night && hold === phoneHeld && Q.detail) {
          const [X, Y] = P3(p.x, p.y, chair ? z - 0.24 : z);
          ctx.beginPath(); ctx.arc(X + (o.dir === 'l' ? -0.42 : 0.42), Y - 1.35, 0.28, 0, TAU); ctx.fillStyle = alpha(LIT, 0.35); ctx.fill();
        }
        if (raining(t) && p.p >= 1 && !chair) umbrella(ctx, p.x, p.y, z, UMBRELLAS[mod(p.id, 6)], p.moving ? Math.sin(t * 7) * 0.04 : 0);
        ctx.restore();
      });
    }
    // The goose, in line forever: to the window, a hot dog, back round to
    // the end, eating it, in line again. It keeps a little umbrella tipped
    // at you all day, rain or shine (the hard find): only its orange feet
    // and its tail show past the canopy, and its beak when it honks at a
    // plane. Standing all night, so the feet still show.
    const gooseAt = (t) => {
      const s = qstate(GOOSE_M, t) || { ...slot(N), x: slot(N)[0], y: slot(N)[1], dir: 'l' };
      const pose = s.moving ? 'walk' : overhead(t) || (s.p === 0 && isOpen(t)) ? 'honk' : 'stand';
      return { x: s.x, y: s.y, z: gz(s.x, s.y), dir: s.p === 0 && !s.moving ? 'r' : s.dir, pose, moving: !!s.moving };
    };
    R.goose((t) => ({ ...gooseAt(t), hidden: true }), { kind: 'hard', hint: 'One regular in the hot dog line keeps an umbrella up, rain or shine. Look at the feet.' });
    R.mover(gooseAt, (ctx, t, p) => {
      drawGoose(ctx, p.x, p.y, p.z, t, { dir: p.dir, pose: p.pose });
      gooseBrolly(ctx, p.x, p.y, p.z, p.dir === 'l' ? -1 : 1, p.moving ? Math.sin(t * 9) * 0.03 : 0);
    }, { bias: 0.005 });
    R.mover((t) => { const s = qstate(GOOSE_M, t); return s && s.served ? { x: s.x, y: s.y, bias: 0.01, s } : HIDE; }, (ctx, t, p) => {
      if (p.hide) return;
      const s = p.s, f = s.moving ? (s.dir === 'l' ? -1 : 1) : 1;
      const [X, Y] = P3(s.x, s.y, gz(s.x, s.y));
      ctx.save(); ctx.translate(X + f * 0.5, Y - 1.05); ctx.scale(0.8, 0.8); dogShape(ctx, 0.8); ctx.restore();
    }, { bias: 0.02 });
    // The line talks.
    talk(R, slot(N)[0], slot(N)[1], G + 2.7, (t) => {
      if (isOpen(t)) return raining(t) && every(17, 3, 0.2)(t) ? 'Still worth it.' : null;
      return every(12, 3.4, 0.1)(t) ? 'They open at eleven.' : null;
    });
    talk(R, slot(4)[0], slot(4)[1], G + 2.7, (t) => (!isOpen(t) && hh(t) >= 21.2 && every(19, 3, 0.55)(t) ? 'Worth it.' : isOpen(t) && every(23, 2.6, 0.7)(t) && !overhead(t) ? 'Is this the line?' : null));

    // ---------- The picnic tables, under a striped canopy ----------
    const TX0 = 65.4, TX1 = 67.4;
    R.thing(TX1, 4.55, (ctx) => {
      const z = G;
      for (const y of [2.85, 4.25]) {
        box(ctx, TX0, y, z + 0.42, TX1 - TX0, 0.3, 0.07, C.wood, { flat: true, lw: 0.025 });
        for (const u of [TX0 + 0.15, TX1 - 0.25]) box(ctx, u, y + 0.1, z, 0.1, 0.1, 0.42, C.brown, { flat: true, lw: 0.02 });
      }
      for (const u of [TX0 + 0.2, TX1 - 0.3]) box(ctx, u, 3.6, z, 0.1, 0.2, 0.75, C.brown, { flat: true, lw: 0.02 });
      box(ctx, TX0 - 0.1, 3.3, z + 0.75, TX1 - TX0 + 0.2, 0.8, 0.08, C.wood, { flat: true, lw: 0.03 });
      if (!Q.detail) return;
      // Lunch: two hot dogs in their boats, fries, a can of Gander Cola.
      const [X1, Y1] = P3(65.9, 3.7, z + 0.83);
      ctx.save(); ctx.translate(X1, Y1); ctx.scale(0.9, 0.9); dogShape(ctx, 0.9); ctx.restore();
      const [X2, Y2] = P3(66.5, 3.5, z + 0.83);
      ctx.save(); ctx.translate(X2, Y2); ctx.scale(0.9, 0.9); dogShape(ctx, 0.9); ctx.restore();
      const [X3, Y3] = P3(66.95, 3.8, z + 0.83);
      ctx.save(); ctx.translate(X3, Y3); friesHeld(ctx); ctx.restore();
      box(ctx, 67.15, 3.45, z + 0.83, 0.13, 0.13, 0.24, BRAND.can, { flat: true, lw: 0.02 });
      box(ctx, 67.15, 3.45, z + 0.95, 0.13, 0.13, 0.05, BRAND.ink, { flat: true, stroke: false });
    }, { depth: 70.0 });
    // The family: 11:30 to 6:30, rain or shine (they're under the canopy).
    const fam = between(11.5, 18.5);
    const seatZ = G + 0.49;
    stay(R, 65.85, 2.95, folk(771, { top: C.navy, bottom: C.grey, hat: 'cap' }), { z: seatZ - 0.7, pose: 'sit', dir: 'l', hold: hotdogHeld, hours: fam, react: { arms: [UP, 0.5] } });
    stay(R, 66.95, 2.95, folk(772, { top: C.pink, style: 'long' }), { z: seatZ - 0.7, pose: 'sit', dir: 'l', hours: fam, react: { arms: [UP, 0.5] } });
    stay(R, 65.9, 4.4, folk(773, { top: C.mustard, scale: 0.72 }), { z: seatZ - 0.5, pose: 'sit', dir: 'r', back: true, scale: 0.72, hours: fam, react: { arms: [2.9, -2.9] } });
    stay(R, 66.85, 4.4, folk(774, { top: C.teal, scale: 0.72, style: 'pony' }), { z: seatZ - 0.5, pose: 'sit', dir: 'r', back: true, scale: 0.72, hours: fam, react: { arms: [UP, 0.4] } });
    // The kid who covers his ears.
    talk(R, 65.9, 4.4, G + 2.1, (t) => (fam(t) && overhead(t) ? 'TOO LOUD!' : null), { size: 0.38 });
    // The canopy: four posts and striped canvas, high enough to see under.
    R.thing(67.95, 4.65, (ctx) => {
      const z = G, top = z + 3.0, x0 = 65.0, x1 = 67.95, y0 = 2.35, y1 = 4.65;
      for (const [u, v] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) pole(ctx, u, v, z, 3.0, C.white, 0.05);
      const n = 10, w = (y1 - y0) / n;
      for (let i = 0; i < n; i++) face(ctx, [[x0, y0 + i * w, top], [x1, y0 + i * w, top], [x1, y0 + (i + 1) * w, top], [x0, y0 + (i + 1) * w, top]], i % 2 ? C.white : C.red, { stroke: false });
      face(ctx, [[x0, y0, top], [x1, y0, top], [x1, y1, top], [x0, y1, top]], null, { lw: 0.035 });
      // Its valance along the front and the side.
      for (let u = x0; u < x1 - 0.01; u += 0.295) {
        const [X, Y] = P3(u + 0.15, y1, top);
        ctx.beginPath(); ctx.moveTo(X - 0.15, Y); ctx.arc(X, Y, 0.15, Math.PI, 0, true); ctx.closePath();
        paint(ctx, Math.round((u - x0) / 0.295) % 2 ? C.white : C.red, { lw: 0.025 });
      }
      for (let v = y0; v < y1 - 0.01; v += 0.23) {
        const [X, Y] = P3(x1, v + 0.115, top);
        ctx.beginPath(); ctx.moveTo(X + 0.115, Y - 0.06); ctx.arc(X, Y, 0.13, 0.4, Math.PI - 0.4); ctx.closePath();
        paint(ctx, Math.round((v - y0) / 0.23) % 2 ? C.white : C.red, { lw: 0.025 });
      }
    }, { depth: 69.6 });
    R.thing(67.951, 4.65, (ctx) => veil(ctx, [boxPts(65.0, 2.35, G, 2.95, 2.3, 3.0)], alpha(C.night, 0.2)), { ...byNight, depth: 69.601 });
    // The decoy: a foil goose balloon from somebody's birthday, tied to the
    // canopy's front post, bobbing over the tables all day and all night.
    // (On the post nearer the stand: tied to the far one it floated up the
    // screen onto the plane spotters' heads, a goose standing on a hat.)
    // (High over the canopy on a long string: lower, at the canopy's edge, it
    // read as a real goose sitting under the awning, not a balloon.)
    const BAL = [68.5, 5.25, G + 4.4], POST = [67.95, 4.65];
    const balAt = (t) => [BAL[0] + Math.sin(t * 0.9) * 0.08, BAL[1] + Math.cos(t * 0.7) * 0.05, BAL[2] + Math.sin(t * 1.3) * 0.08];
    R.thing(BAL[0] + 0.6, BAL[1] + 0.6, (ctx, t) => {
      const [x, y, z] = balAt(t);
      // The string, curling down to the post.
      const [X0, Y0] = P3(POST[0], POST[1], G + 2.2), [X1, Y1] = P3(x, y, z - 0.05);
      ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.quadraticCurveTo(X0 - 0.3, (Y0 + Y1) / 2 + Math.sin(t * 1.1) * 0.1, X1, Y1);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02; ctx.stroke();
      ctx.save(); ctx.translate(X1, Y1); ctx.rotate(Math.sin(t * 0.8) * 0.06);
      // Puffy, seamed foil: body, neck, head, the beak, a shine.
      ctx.beginPath(); ctx.ellipse(0, -0.42, 0.44, 0.3, -0.1, 0, TAU);
      ctx.moveTo(-0.34, -0.48); ctx.lineTo(-0.62, -0.66); ctx.lineTo(-0.4, -0.3);
      paint(ctx, C.white, { lw: 0.04, dots: Q.detail ? C.greyLight : null, density: 0.15 });
      ctx.beginPath(); ctx.moveTo(0.22, -0.55); ctx.quadraticCurveTo(0.36, -0.8, 0.3, -1.02);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.22; ctx.lineCap = 'round'; ctx.stroke();
      ctx.strokeStyle = C.white; ctx.lineWidth = 0.15; ctx.stroke();
      ctx.beginPath(); ctx.arc(0.32, -1.08, 0.15, 0, TAU); paint(ctx, C.white, { lw: 0.04 });
      ctx.beginPath(); ctx.moveTo(0.43, -1.12); ctx.lineTo(0.66, -1.06); ctx.lineTo(0.43, -1.0); ctx.closePath(); paint(ctx, C.coral, { lw: 0.03 });
      ctx.beginPath(); ctx.arc(0.34, -1.12, 0.03, 0, TAU); ctx.fillStyle = C.ink; ctx.fill();
      if (Q.detail) {
        ctx.beginPath(); ctx.ellipse(0.1, -0.55, 0.12, 0.05, -0.5, 0, TAU); ctx.fillStyle = alpha(C.sky, 0.6); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, -0.42, 0.44, 0.3, -0.1, 0.2, 2.6); ctx.strokeStyle = alpha(C.ink, 0.3); ctx.lineWidth = 0.02; ctx.stroke();
      }
      // The knot.
      ctx.beginPath(); ctx.moveTo(-0.05, -0.12); ctx.lineTo(0.05, -0.12); ctx.lineTo(0, -0.02); ctx.closePath(); paint(ctx, C.white, { lw: 0.02 });
      ctx.restore();
    }, { anim: true, depth: BAL[0] + BAL[1] + 1.2 });
    R.decoy({ id: 'balloon', at: [BAL[0] + 0.1, BAL[1], BAL[2] + 0.4], r: 0.8, say: ['Helium. It honks higher.', 'A balloon. Mostly hot air.'] });
    // A gull, every so often, for a fry.
    R.mover((t) => {
      const k = frac(t / 26 + 0.3);
      if (k > 0.72) return HIDE;
      const tgt = [67.1, 3.95, G + 0.85];
      if (k < 0.3) { const u = k / 0.3; return { x: lerp(71.5, tgt[0], u), y: lerp(8.5, tgt[1], u), z: lerp(G + 6, tgt[2], smooth(u)), fly: true, dir: -1 }; }
      if (k < 0.42) return { x: tgt[0], y: tgt[1], z: tgt[2], fly: false };
      const u = (k - 0.42) / 0.3;
      return { x: lerp(tgt[0], 61, u), y: lerp(tgt[1], -1, u), z: lerp(tgt[2], G + 7, u), fly: true, dir: 1, fry: true };
    }, (ctx, t, p) => {
      if (p.hide) return;
      if (p.fly) gullFly(ctx, p.x, p.y, p.z, t, p.dir, p.fry);
      else gullStand(ctx, p.x, p.y, p.z, t, true, -1);
    }, { bias: 1 });
    talk(R, 66.85, 4.4, G + 2.1, (t) => { const k = frac(t / 26 + 0.3); return fam(t) && k > 0.4 && k < 0.58 ? 'HEY! MY FRY!' : null; }, { size: 0.38 });
    // Gulls waiting on the plaza, and on the fence.
    R.thing(64.9, 5.2, (ctx, t) => { gullStand(ctx, 64.4, 4.7, G, t, true, 1); gullStand(ctx, 68.4, 4.75, G, t + 2, false, -1); }, { anim: true });
    R.thing(80.6, FY + 0.1, (ctx, t) => { gullStand(ctx, 80.05, FY, G + FH + 0.25, t, false, -1); gullStand(ctx, 86.0, FY, G + FH + 0.25, t + 1, true, 1); }, { anim: true, depth: 86 + FY + 0.1 });

    // ---------- The Courier's lunch ----------
    // He's on the level's clock (day.js), which gives him his one with
    // everything; here, the trash can by the picnic tables, where he
    // leaves the other. (No second hot dog in his hand: one plain one, eaten
    // over and over beside the box, read as the find.)
    // (By the picnic tables' far end, clear of the fort: behind its rampart, at
    // the stand's far end, the playtest's phone never saw it.)
    R.thing(68.0, 3.6, (ctx) => {
      box(ctx, 67.7, 3.3, G, 0.6, 0.6, 1.35, C.green, { lw: 0.03, dens: 0.14 });
      box(ctx, 67.66, 3.26, G + 1.35, 0.68, 0.68, 0.08, shade(C.green, 0.2), { flat: true, lw: 0.025 });
      if (Q.detail) box(ctx, 68.3, 3.45, G + 0.95, 0.01, 0.3, 0.12, shade(C.green, 0.45), { flat: true, stroke: false });
    });

    // ---------- The one for later (after noon) ----------
    // He orders two, eats one, and leaves the other in its foam box on the
    // bin's lid, FOR LATER in marker. Later never comes. The bin's lid is
    // bare all morning, so the flip shows it. A tap opens the box: a hot dog
    // with everything.
    // (Big enough to read on a phone, overhanging the lid a little.)
    const CL = [67.52, 3.2, G + 1.43], CW = 0.95, CD = 0.78, CH = 0.24;
    const shell = R.poke({ id: 'clamshell', at: [CL[0] + CW / 2, CL[1] + CD / 2, CL[2] + 0.2], r: 0.8, when: LATER.when, sound: 'clunk', say: ['FOR LATER, it says.', 'Still warm. Somehow.'] });
    R.thing(81.4, 3.4, (ctx, t) => {
      if (!LATER.when(t)) return;
      const [x, y, z] = CL, k = shell.k();
      const foam = tint(C.greyLight, 0.55);
      box(ctx, x, y, z, CW, CD, CH, foam, { lw: 0.025, top: shade(foam, 0.12) });
      // The lid, hinged along the back: ajar a crack when shut (a smear of
      // mustard in the gap says there's lunch in it), up when tapped.
      const th = 0.14 + k * 1.75, hz = z + CH;
      const lid = () => {
        const dy = Math.cos(th) * CD, dz = Math.sin(th) * CD;
        face(ctx, [[x, y, hz], [x + CW, y, hz], [x + CW, y + dy, hz + dz], [x, y + dy, hz + dz]], foam, { lw: 0.025 });
        if (Q.detail && k < 0.5) {
          // In marker, lying on the lid along x.
          const [X, Y] = P3(x + CW / 2, y + dy / 2, hz + dz / 2 + 0.01);
          ctx.save(); ctx.translate(X, Y); ctx.transform(1, 0.5, -1, 0.5, 0, 0); ctx.scale(1 / 105, 1 / 105);
          ctx.font = '17px "Bagel Fat One", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = C.red;
          ctx.fillText('FOR', 0, -10); ctx.fillText('LATER', 0, 9); ctx.restore();
        }
      };
      const dog = () => {
        if (k < 0.25) { if (Q.detail) line(ctx, [[x + 0.15, y + CD - 0.01, hz + 0.03], [x + 0.55, y + CD - 0.01, hz + 0.04]], C.mustard, 0.045); return; }
        loadedDog(ctx, x + CW / 2, y + CD / 2, hz + 0.02);
      };
      if (th > Math.PI / 2) { lid(); dog(); } else { dog(); lid(); }
    }, { anim: true, on: LATER.when, depth: 68.5 + 4.0 + 0.02 });
    R.find({ id: 'hotdog', label: 'A hot dog with everything', kind: 'poke', ...LATER, at: [CL[0] + CW / 2, CL[1] + CD / 2, CL[2] + 0.2], r: 0.8, inside: shell, hint: 'The Courier bought two and only ate one. He set the other one down for later.' });

    // ---------- The plane spotters, by the fence ----------
    const spot = between(6.5, 20.5);
    const s1 = folk(781, { top: C.green, bottom: C.brown, hat: 'sun' });
    stay(R, 58.9, 2.75, s1, { dir: 'l', hold: cameraHeld, hours: between(6, 22), umb: C.navy, react: { face: cameraUp, arms: [2.1, 1.9] } });
    // His tripod, and the big lens.
    R.thing(59.5, 3.2, (ctx) => {
      for (const [dx, dy] of [[-0.25, -0.2], [0.25, -0.1], [0.0, 0.3]]) line(ctx, [[59.6, 3.0, G + 1.3], [59.6 + dx, 3.0 + dy, G]], C.ink, 0.04);
      box(ctx, 59.45, 2.9, G + 1.3, 0.3, 0.2, 0.2, C.black, { flat: true, lw: 0.02 });
      box(ctx, 59.5, 3.1, G + 1.33, 0.2, 0.6, 0.16, shade(C.grey, 0.45), { flat: true, lw: 0.02 }); // a dark lens (a white one read as the logbook)
    }, { on: spot });
    // The one on the stepladder, in a poncho when it rains.
    const s2 = folk(782, { top: C.coral, bottom: C.navy, hat: 'beanie' });
    R.thing(60.2, 2.75, (ctx) => {
      const x = 60.2, y = 2.55;
      // Outlined in ink, legs and treads, so it reads as a ladder and its
      // climber isn't standing on air.
      const rail = shade(C.greyLight, 0.15);
      for (const [dx, dy] of [[-0.3, -0.25], [0.3, -0.25], [-0.3, 0.25], [0.3, 0.25]]) {
        line(ctx, [[x + dx, y + dy, G], [x + dx * 0.5, y + dy * 0.4, G + 0.95]], C.ink, 0.11);
        line(ctx, [[x + dx, y + dy, G], [x + dx * 0.5, y + dy * 0.4, G + 0.95]], rail, 0.06);
      }
      for (const zz of [0.3, 0.62]) {
        const k = zz / 0.95, w = 0.3 - 0.15 * k;
        box(ctx, x - w, y + 0.25 - 0.15 * k - 0.06, G + zz, w * 2, 0.12, 0.05, rail, { flat: true, lw: 0.025 });
      }
      box(ctx, x - 0.25, y - 0.2, G + 0.95, 0.5, 0.4, 0.07, rail, { flat: true, lw: 0.03 });
    }, { on: spot, depth: 62.7 });
    stay(R, 60.2, 2.55, s2, { z: G + 1.0, dir: 'l', hours: spot, wet: { wear: poncho }, react: { face: binosUp, arms: [2.3, 2.2] }, depth: 62.8 });
    // The logbook keeper: every plane, a tick.
    const s3 = folk(783, { top: C.sky, bottom: C.ink, style: 'bald', hair: C.greyLight });
    stay(R, 62.5, 2.8, s3, { dir: 'l', pose: 'read', hold: pencilHeld, hours: spot, umb: C.teal, react: { pose: 'read', arms: [1.3, 1.2] } });
    // (After Pidge has had his say, never over it.)
    talk(R, 62.5, 2.8, G + 2.8, (t) => (spot(t) && PL(t) > 11.3 && PL(t) < 13.4 ? 'Tick.' : spot(t) && PL(t) > 19 && PL(t) < 21.5 && frac(t / 114) < 0.5 ? 'A321. Nice.' : null), { size: 0.4 });
    // A radio on the cooler, listening to the tower.
    R.thing(58.3, 3.3, (ctx) => {
      box(ctx, 57.95 + 0.1, 2.95, G, 0.75, 0.5, 0.5, C.red, { flat: true, lw: 0.03, top: shade(C.red, 0.25) });
      box(ctx, 58.2, 3.05, G + 0.5, 0.35, 0.18, 0.22, C.black, { flat: true, lw: 0.02 });
      line(ctx, [[58.25, 3.1, G + 0.72], [58.1, 3.05, G + 1.25]], C.ink, 0.02);
    }, { on: spot });
    talk(R, 58.4, 3.2, G + 1.4, (t) => (spot(t) && PL(t) > 1.2 && PL(t) < 4.8 ? '...four right, cleared to land...' : null), { size: 0.34 });
    // Tap it and it turns up: the tower, loud, and the dial's light.
    const radio = R.poke({ id: 'radio', at: [58.4, 3.15, G + 0.65], r: 0.9, teach: true, when: spot, sound: 'tick', hold: 3,
      say: ['...four right, cleared to land...', '...unidentified goose, two o\'clock...', '...hold short, hold short...'] });
    R.thing(58.31, 3.31, (ctx) => {
      const k = radio.k();
      const [X, Y] = P3(58.38, 3.05, G + 0.62);
      ctx.beginPath(); ctx.arc(X + 0.02, Y, 0.035, 0, TAU); ctx.fillStyle = k > 0.1 ? C.red : shade(C.red, 0.5); ctx.fill();
      if (k < 0.1 || !Q.detail) return;
      ctx.strokeStyle = alpha(C.ink, 0.6 * k); ctx.lineWidth = 0.03;
      for (const r of [0.22, 0.38, 0.54]) { ctx.beginPath(); ctx.arc(X - 0.1, Y - 0.2, r * k, -2.4, -0.7); ctx.stroke(); }
    }, { anim: true, on: spot });
    // Inspector Pidge: trench coat, deerstalker, a magnifying glass, and a
    // theory about the planes.
    const pidge = folk(19, {
      skin: C.grey, style: 'bald', top: COAT, bottom: shade(COAT, 0.3),
      wear(ctx, b) {
        ctx.beginPath(); ctx.ellipse(0.02, b.top + 0.02, 0.27, 0.09, 0, 0, TAU);
        paint(ctx, C.tealLight, { lw: 0.03, dots: C.purple, density: 0.35 });
        ctx.beginPath();
        ctx.moveTo(-0.3, b.hipY - 0.12); ctx.lineTo(0.3, b.hipY - 0.12); ctx.lineTo(0.4, b.hipY + 0.46); ctx.lineTo(-0.4, b.hipY + 0.46); ctx.closePath();
        paint(ctx, COAT, { lw: 0.04 });
        ctx.fillStyle = shade(COAT, 0.45); ctx.fillRect(-0.29, b.hipY - 0.16, 0.58, 0.08);
      },
      face(ctx, hy, back) {
        if (!back) {
          ctx.beginPath(); ctx.arc(0.22, hy + 0.0, 0.055, 0, TAU); ctx.fillStyle = C.coral; ctx.fill();
          ctx.beginPath(); ctx.arc(0.225, hy + 0.0, 0.028, 0, TAU); ctx.fillStyle = C.ink; ctx.fill();
          ctx.beginPath(); ctx.moveTo(0.3, hy + 0.0); ctx.lineTo(0.54, hy + 0.08); ctx.lineTo(0.3, hy + 0.13); ctx.closePath();
          paint(ctx, shade(C.grey, 0.55), { lw: 0.03 });
        }
        const check = mix(C.greyLight, C.brown, 0.45);
        for (const s of [1, -1]) {
          ctx.beginPath();
          ctx.moveTo(0.02 + s * 0.26, hy - 0.14); ctx.quadraticCurveTo(0.02 + s * 0.5, hy - 0.12, 0.02 + s * 0.58, hy + 0.04); ctx.lineTo(0.02 + s * 0.24, hy - 0.04); ctx.closePath();
          paint(ctx, shade(check, 0.15), { lw: 0.04 });
        }
        ctx.beginPath(); ctx.arc(0.02, hy - 0.06, 0.33, Math.PI, 0); ctx.closePath();
        paint(ctx, check, { dots: Q.detail ? C.ink : null, density: 0.3, lw: 0.05 });
      },
    });
    stay(R, 61.35, 2.85, pidge, { dir: 'l', hold: glassHeld, hours: spot, react: { pose: 'point', arms: [2.5, -0.2] } });
    // His bubble up over the umbrellas and off to the right, clear of the
    // stepladder's face beside him.
    talk(R, 61.35, 2.85, G + 3.3, (t) => {
      if (!spot(t)) return null;
      const k = PL(t);
      if (k > 6 && k < 11) return 'That one. Definitely a goose.';
      if (k > 15 && k < 18.5) return frac(t / 171) < 0.34 ? 'It got away.' : frac(t / 171) < 0.67 ? 'Disguised as a plane.' : 'Next one. Trust me.';
      if (k > 36 && k < 39) return 'Suspicious gull.';
      return null;
    }, { size: 0.4, dx: 2.7 });

    // ---------- The logbook, dropped by the fence ----------
    // Open on the walk a step from his feet: a navy spiral notebook, cream
    // pages ruled in blue, a column of bold red ticks, the spiral down the middle.
    const LOG = [63.3, 3.35];
    R.rug((ctx) => {
      const z = G + 0.02, [x, y] = LOG, hx = 0.55, hy = 0.36;
      face(ctx, [[x - hx, y - hy, z], [x + hx, y - hy, z], [x + hx, y + hy, z], [x - hx, y + hy, z]], C.navy, { lw: 0.04 });
      const page = tint(C.butter, 0.7);
      face(ctx, [[x - hx + 0.05, y - hy + 0.04, z + 0.03], [x - 0.03, y - hy + 0.04, z + 0.03], [x - 0.03, y + hy - 0.04, z + 0.03], [x - hx + 0.05, y + hy - 0.04, z + 0.03]], page, { lw: 0.02 });
      face(ctx, [[x + 0.03, y - hy + 0.04, z + 0.03], [x + hx - 0.05, y - hy + 0.04, z + 0.03], [x + hx - 0.05, y + hy - 0.04, z + 0.03], [x + 0.03, y + hy - 0.04, z + 0.03]], page, { lw: 0.02 });
      if (!Q.detail) return;
      ctx.save(); ctx.globalAlpha *= 0.6;
      for (let v = y - 0.24; v < y + 0.3; v += 0.1) for (const [a, b] of [[x - hx + 0.1, x - 0.08], [x + 0.08, x + hx - 0.1]]) line(ctx, [[a, v, z + 0.04], [b, v, z + 0.04]], C.sky, 0.015);
      ctx.restore();
      for (let v = y - 0.28; v < y + 0.3; v += 0.08) disc(ctx, x, v, z + 0.05, 0.03, C.ink, { stroke: false });
      // Scribbled plane numbers on the left, ticks on the right.
      for (let v = y - 0.22; v < y + 0.26; v += 0.1) line(ctx, [[x - 0.4, v, z + 0.045], [x - 0.15, v, z + 0.045]], C.ink, 0.025);
      for (let v = y - 0.22; v < y + 0.26; v += 0.1) line(ctx, [[x + 0.14, v, z + 0.045], [x + 0.2, v + 0.04, z + 0.045], [x + 0.34, v - 0.06, z + 0.045]], C.red, 0.035);
    });
    R.find({ id: 'logbook', label: "A plane spotter's logbook", kind: 'spot', at: [LOG[0], LOG[1], G + 0.1], r: 0.9 });

    // ---------- The relish packet, by the picnic tables ----------
    // Small and green on grey, a step off the canopy (the hard one).
    const REL = [66.3, 4.95];
    R.rug((ctx) => {
      const z = gz(...REL) + 0.03, [x, y] = REL, k = 0.62;
      face(ctx, [[x - 0.42 * k, y - 0.24 * k, z], [x + 0.42 * k, y - 0.24 * k, z], [x + 0.42 * k, y + 0.24 * k, z], [x - 0.3 * k, y + 0.24 * k, z], [x - 0.42 * k, y + 0.1 * k, z]], C.leaf, { lw: 0.03 });
      face(ctx, [[x - 0.3 * k, y - 0.16 * k, z + 0.01], [x + 0.3 * k, y - 0.16 * k, z + 0.01], [x + 0.3 * k, y + 0.16 * k, z + 0.01], [x - 0.3 * k, y + 0.16 * k, z + 0.01]], C.white, { stroke: false });
      if (Q.detail) {
        // The word, lying flat on it.
        const [X, Y] = P3(x, y, z + 0.02);
        ctx.save(); ctx.translate(X, Y); ctx.transform(1, 0.5, -1, 0.5, 0, 0); ctx.scale(k / 40, k / 40);
        ctx.font = '7px "Bagel Fat One", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = C.green;
        ctx.fillText('RELISH', 0, 0); ctx.restore();
        // A squirt of it, escaped.
        disc(ctx, x - 0.4, y + 0.14, z, 0.09, C.leaf, { lw: 0.02 });
      }
    });
    R.find({ id: 'relish', label: 'A relish packet', kind: 'hard', at: [REL[0], REL[1], G + 0.1], r: 0.8, riddle: 'Somebody\'s lunch lost a little green.', hint: 'Where people eat under the stripes, something small and green fell on the ground.' });

    // ---------- The causeway's south side: a bench, the rail, fishermen ----------
    R.thing(58.3, 6.3, (ctx) => bench(ctx, 58.3, 6.35, gz(58.3, 6.5)));
    const benchZ = gz(59, 6.6) + 0.53 - 0.7;
    stay(R, 58.8, 6.6, folk(791, { top: C.purple, bottom: C.ink, style: 'bun', hair: C.greyLight }), { z: benchZ, pose: 'sit', dir: 'l', hold: hotdogHeld, hours: between(9, 19), umb: C.purple });
    stay(R, 59.6, 6.6, folk(792, { top: C.brown, bottom: C.navy, style: 'bald', hair: C.greyLight, hat: 'cap' }), { z: benchZ, pose: 'sit', dir: 'l', hold: cupHeld, hours: between(9, 19) });
    talk(R, 59.6, 6.6, G + 2.3, (t) => (between(9, 19)(t) && PL(t) > 12 && PL(t) < 15 ? 'Every minute, that.' : null), { size: 0.38 });
    // The rail along the water.
    R.thing(63.9, 7.45, (ctx) => {
      const y = 7.45, z = gz(60, y);
      for (let u = 58.1; u < 63.95; u += 1.45) pole(ctx, u, y, z, 1.0, C.grey, 0.05);
      line(ctx, [[58, y, z + 1.0], [63.9, y, z + 1.0]], C.grey, 0.07);
      line(ctx, [[58, y, z + 0.55], [63.9, y, z + 0.55]], C.grey, 0.05);
    });
    lamp(R, 60.9, 6.35);
    // Two fishermen at the rail, rods over the bay, rain or shine; one stays
    // on into the night.
    const fishers = [[61.6, 7.1, 801, between(6, 23.5), C.mustard], [63.3, 7.15, 802, between(7, 19), null]];
    fishers.forEach(([x, y, seed, hours, umb], i) => {
      const look = folk(seed, { top: i ? C.teal : C.coral, bottom: C.navy, hat: i ? 'beanie' : 'sun' });
      stay(R, x, y, look, { dir: 'l', arms: [1.6, 1.2], hours, ...(umb ? { wet: { wear: poncho } } : { umb: C.navy }), react: { arms: [1.6, 2.9] } });
      R.thing(x + 0.2, y + 0.4, (ctx, t) => {
        const z = gz(x, y);
        const bite = frac(t / (41 + i * 13)) < 0.08;
        const tip = [x - 0.2 + i * 0.3, y + 3.2, z + 2.6 + (bite ? -0.35 : Math.sin(t * 1.4 + i) * 0.06)];
        line(ctx, [[x + 0.15, y + 0.35, z + 1.25], tip], C.ink, 0.04);
        const bob = [tip[0], y + 4.4, 0.05 + (bite ? -0.05 : Math.sin(t * 2.2 + i) * 0.04)];
        if (Q.detail) line(ctx, [tip, bob], alpha(C.ink, 0.6), 0.015);
        disc(ctx, bob[0], bob[1], bob[2], 0.08, C.red, { lw: 0.02 });
        if (bite && Q.detail) {
          const [X, Y] = P3(bob[0], bob[1], 0.35 + Math.abs(Math.sin(t * 9)) * 0.2);
          ctx.beginPath(); ctx.ellipse(X, Y, 0.2, 0.08, Math.sin(t * 12) * 0.6, 0, TAU); paint(ctx, C.greyLight, { lw: 0.02 });
        }
        box(ctx, x - 0.55, y - 0.2, z, 0.4, 0.35, 0.4, C.white, { flat: true, lw: 0.02 });
      }, { anim: true, on: hours });
    });
    R.light({ at: [61.6, 7.1, G + 2.2], r: 1.2, color: LIT, k: (t) => (hh(t) >= 20.5 && hh(t) < 23.5 ? nightK(t) * 0.8 : 0) });
    talk(R, 61.6, 7.1, G + 2.8, (t) => (between(6, 23.5)(t) && every(33, 3, 0.4)(t) ? (frac(t / 66) < 0.5 ? 'Nothing yet.' : 'They bite after the rain.') : null), { size: 0.38 });

    // ---------- The lot ----------
    PARKED.forEach(({ x, color, who, dog: hasDog }, ci) => {
      const y = LOT_Y, z = gz(x, y + 0.3);
      const inCar = (t) => who.some(([, , a, b]) => { const hr = hh(t); return hr >= a && hr < b; });
      // Empty, a still picture; with people in it (lunch in the car, looking
      // at the planes), drawn live with them inside.
      R.thing(x + 1.4, y + 0.75, (ctx) => car(ctx, x, y, z, color, { along: 'x', dir: 1 }), who.length ? { on: (t) => !inCar(t) } : {});
      R.thing(x + 1.401, y + 0.751, (ctx) => veil(ctx, [boxPts(x - 1.4, y - 0.75, z, 2.8, 1.5, 0.82), boxPts(x - 0.93, y - 0.63, z + 0.82, 1.5, 1.26, 0.5)]), byNight);
      if (!who.length) return;
      R.thing(x + 1.402, y + 0.752, (ctx, t) => {
        const hr = hh(t), cx = x - 0.18;
        const riders = who.filter(([, , a, b]) => hr >= a && hr < b).map(([dx, dy], i) => ({
          front: dx > 0, v: dy, lift: overhead(t) ? 0.05 : 0,
          skin: mix(C.woodLight, C.brown, ((ci + i) % 3) * 0.3), hair: [C.ink, C.mustard, C.brown][(ci + i) % 3], top: [C.navy, C.red, C.teal][(ci + i) % 3],
        }));
        car(ctx, x, y, z, color, { along: 'x', dir: 1, riders });
        if (hasDog && Q.detail) {
          // A dog with its head out of the back window.
          const [DX, DY] = P3(cx - 0.45, y + 0.7, z + 1.1);
          ctx.beginPath(); ctx.arc(DX, DY, 0.16, 0, TAU); paint(ctx, C.wood, { lw: 0.025 });
          ctx.beginPath(); ctx.ellipse(DX - 0.12, DY + 0.06, 0.06, 0.12, 0.4, 0, TAU); paint(ctx, C.brown, { lw: 0.02 });
          if (overhead(t)) speech(ctx, cx - 0.45, y + 0.7, z + 1.8, 'ARF!', { size: 0.36 });
        }
        // Wipers going, in the rain.
        if (raining(t)) {
          const xw = cx + 0.76;
          for (const s of [-1, 1]) {
            const a = (Math.sin(t * 5 + s) * 0.5 + 0.5) * 1.3;
            const py = y + s * 0.25 - 0.3, pz = z + 0.86;
            line(ctx, [[xw, py, pz], [xw, py + Math.sin(a) * 0.45, pz + Math.cos(a) * 0.4]], C.ink, 0.035);
          }
        }
        // Headlights, after dark.
        if (nightK(t) > 0.3) for (const s of [-0.45, 0.45]) disc(ctx, x + 1.42, y + s, z + 0.5, 0.11, LIT, { lw: 0.02 });
      }, { anim: true, on: inCar });
      R.light({ at: [x + 2.4, y, z + 0.4], r: 1.8, color: LIT, k: (t) => (inCar(t) ? nightK(t) * 0.9 : 0) });
    });
    // The lot's back row, parked nose out, one space empty but for a puddle
    // (the lot was a bare slab up close).
    for (const [x, ci] of [[73.1, 3], [74.9, 8], [76.7, 0]]) {
      const y = 11.7, z = gz(x, y);
      R.thing(x + 0.75, y + 1.4, (ctx) => car(ctx, x, y, z, CARS[ci], { dir: 1 }));
      R.thing(x + 0.751, y + 1.401, (ctx) => veil(ctx, [boxPts(x - 0.75, y - 1.4, z, 1.5, 2.8, 0.82), boxPts(x - 0.63, y - 1.0, z + 0.82, 1.26, 1.5, 0.5)]), byNight);
    }
    R.rug((ctx) => { const [X, Y] = P3(78.5, 11.9, G + 0.01); ctx.beginPath(); ctx.ellipse(X, Y, 0.9, 0.4, 0, 0, TAU); ctx.fillStyle = alpha(tint(C.sky, 0.4), 0.55); ctx.fill(); }, { on: (t) => hh(t) > 10 && hh(t) < 21 });
    // Its painted lines.
    R.rug((ctx) => { for (const x of [72.2, 74.0, 75.8, 77.6, 79.4]) line(ctx, [[x, 10.4, G + 0.01], [x, 13.2, G + 0.01]], alpha(C.white, 0.8), 0.06); });
    // A lamp at the plaza, one at the lot's end, and the sign.
    lamp(R, 74.6, 4.95);
    lamp(R, 81.4, 7.3);
    R.thing(64.9, 7.3, (ctx) => {
      pole(ctx, 64.85, 7.3, gz(64.85, 7.3), 2.3, C.greyLight, 0.05);
      panel(ctx, 'x', 64.85, 7.36, gz(64.85, 7.3) + 2.0, 0.78, 0.55, C.white, { lw: 0.03 });
      lettering(ctx, 'x', 64.85, 7.37, gz(64.85, 7.3) + 2.12, 'PARKING', 0.1, C.navy, 'Bagel Fat One');
      lettering(ctx, 'x', 64.85, 7.37, gz(64.85, 7.3) + 1.94, '2 HR LIMIT', 0.08, C.ink);
      lettering(ctx, 'x', 64.85, 7.37, gz(64.85, 7.3) + 1.81, '(OR ONE LINE)', 0.07, C.ink);
    });

    // ---------- Walkers on the Sugar Bowl loop ----------
    const WALKERS = [
      { seed: 811, speed: 1.35, off: 0, hours: between(6, 20.5), look: { top: C.pink, hat: 'sun', bottom: C.ink }, umb: C.pink },
      { seed: 812, speed: 1.35, off: 1.1, hours: between(6, 20.5), look: { top: C.teal, hat: 'sun', bottom: C.ink }, umb: C.teal },
      { seed: 813, speed: 1.05, off: 40, hours: between(6.5, 23), look: { top: C.green, bottom: C.navy }, dog: true, umb: C.green },
      { seed: 814, speed: 1.0, off: 95, hours: between(8, 19), look: { top: C.navy, bottom: C.grey }, stroller: true, umb: C.mustard },
      { seed: 815, speed: 0.7, off: 150, hours: between(7, 18), look: { top: C.brown, bottom: C.brown, style: 'bald', hair: C.greyLight, hat: 'cap' }, umb: C.navy },
      { seed: 816, speed: 2.4, off: 20, hours: between(6, 19.5), look: { top: C.coral, bottom: C.ink, style: 'pony' }, run: true },
    ];
    WALKERS.forEach((w) => {
      const r = route(LOOPWALK, { speed: w.speed, offset: w.off, loop: false });
      const look = folk(w.seed, w.look);
      R.mover((t) => {
        if (!w.hours(t)) return HIDE;
        const a = r(t), b = r(t + 0.1), d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        return { ...a, vx: (b.x - a.x) / d, vy: (b.y - a.y) / d };
      }, (ctx, t, p) => {
        if (p.hide) return;
        const z = Math.max(gz(p.x, p.y), G + 0.02);
        const up = overhead(t);
        const wet = raining(t) && !w.run;
        // A dog out in front on its lead, or a stroller pushed ahead: a step
        // along the way they're walking (p.vx, p.vy).
        const ahead = (d) => [p.x + p.vx * d, p.y + p.vy * d];
        if (w.dog) {
          const [dx, dy] = ahead(1.1);
          line(ctx, [[p.x, p.y, z + 1.3], [dx, dy, z + 0.45]], C.red, 0.03);
          dog(ctx, dx, dy, z, t, p.dir, up);
          if (up && Q.detail) speech(ctx, dx, dy, z + 1.3, 'WOOF!', { size: 0.36 });
        }
        if (w.stroller) {
          const [sx, sy] = ahead(0.75);
          box(ctx, sx - 0.3, sy - 0.3, z + 0.3, 0.6, 0.6, 0.55, C.navy, { flat: true, lw: 0.03 });
          box(ctx, sx - 0.3, sy - 0.3, z + 0.85, 0.6, 0.3, 0.3, C.teal, { flat: true, lw: 0.03 });
        }
        person(ctx, p.x, p.y, z, { ...look, pose: w.run ? 'run' : 'walk', dir: p.dir, back: p.back, ...(up ? { arms: [UP, -0.4] } : w.speed > 1.3 && !w.run ? { arms: [1.1 + Math.sin(t * 9) * 0.6, -1.1 + Math.sin(t * 9) * 0.6] } : {}) }, t);
        if (wet && w.umb) umbrella(ctx, p.x, p.y, z, w.umb, Math.sin(t * 7) * 0.04);
      });
    });

    // ---------- The east walkway ----------
    // A chain on posts along the bay side, benches facing the harbor, lamps.
    for (const [a, b] of [[14.5, 31.6], [32.4, 46.2]]) {
      R.thing(77.4, b, (ctx) => {
        const x = 77.35;
        for (let v = a; v <= b + 1e-6; v += (b - a) / Math.round((b - a) / 1.8)) pole(ctx, x, v, gz(x, v), 0.8, C.greyLight, 0.06);
        if (!Q.detail) return;
        const n = Math.round((b - a) / 1.8), st = (b - a) / n;
        for (let i = 0; i < n; i++) {
          const v0 = a + i * st, pts = [];
          for (let k = 0; k <= 6; k++) { const v = v0 + (st * k) / 6; pts.push([x, v, gz(x, v) + 0.72 - Math.sin((k / 6) * Math.PI) * 0.18]); }
          line(ctx, pts, C.ink, 0.03);
        }
      });
    }
    for (const y of [21.2, 36.8]) R.thing(79.4, y, (ctx) => bench(ctx, 79.45, y, gz(79.6, y + 0.8), { along: 'y' }));
    lamp(R, 79.95, 18.4);
    lamp(R, 79.95, 30.2);
    lamp(R, 79.9, 42.4);
    // Someone reading on a bench, all day, in a poncho when it rains. She's
    // the only one who doesn't look up.
    stay(R, 79.85, 22.1, folk(821, { top: C.lilac, bottom: C.navy, style: 'curly', hair: C.brown }), { z: gz(79.7, 22) + 0.53 - 0.7, pose: 'sit', dir: 'r', hold: bookHeld, arms: [1.0, 1.0], hours: between(8, 19.5), wet: { wear: poncho }, react: false });
    talk(R, 79.85, 22.1, G + 2.2, (t) => (between(8, 19.5)(t) && PL(t) > 7 && PL(t) < 10 && frac(t / 114) < 0.5 ? 'Every minute.' : null), { size: 0.38 });
    // A couple on the other bench, watching the ships.
    const cz = gz(79.7, 37.6) + 0.53 - 0.7;
    stay(R, 79.85, 37.4, folk(822, { top: C.red, bottom: C.navy, style: 'bald', hair: C.greyLight }), { z: cz, pose: 'sit', dir: 'r', hours: between(10, 20.5), umb: C.navy });
    stay(R, 79.85, 38.2, folk(823, { top: C.butter, bottom: C.grey, style: 'bun', hair: C.greyLight }), { z: cz, pose: 'sit', dir: 'r', hours: between(10, 20.5), hold: cupHeld });
    talk(R, 79.85, 37.8, G + 2.3, (t) => { const b = shipBow(t); return between(10, 20.5)(t) && b && b.y < 45 && every(21, 3, 0.3)(t) ? 'That one\'s ours.' : null; }, { size: 0.38 });

    // ---------- The footbridge to the Sugar Bowl ----------
    // Over the gap where the bay meets the harbor, in two pieces (a seam
    // runs across it at y 48).
    {
      const [[ax, ay], [bx, by]] = BRIDGE;
      const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy), nx = -dy / L * 0.75, ny = dx / L * 0.75;
      const zAt = (k) => G + 0.1 + Math.sin(k * Math.PI) * 0.35;
      const kSeam = (48 - ay) / dy;
      for (const [k0, k1] of [[0, kSeam - 0.01], [kSeam + 0.01, 1]]) {
        const P = (k, s) => [ax + dx * k + nx * s, ay + dy * k + ny * s, zAt(k)];
        const front = P(Math.max(k0, k1), 1);
        R.thing(front[0], front[1], (ctx) => {
          const n = 6, ks = Array.from({ length: n + 1 }, (_, i) => k0 + ((k1 - k0) * i) / n);
          // Its side toward the viewer, then the deck, then the rail.
          face(ctx, [...ks.map((k) => { const p = P(k, 1); return [p[0], p[1], p[2]]; }), ...ks.slice().reverse().map((k) => { const p = P(k, 1); return [p[0], p[1], p[2] - 0.25]; })], shade(C.wood, 0.25), { lw: 0.03 });
          face(ctx, [...ks.map((k) => P(k, -1)), ...ks.slice().reverse().map((k) => P(k, 1))], C.woodLight, { lw: 0.035 });
          if (Q.detail) for (const k of ks) { const a = P(k, -1), b = P(k, 1); line(ctx, [a, b], alpha(C.brown, 0.4), 0.02); }
          for (const s of [-1, 1]) {
            for (const k of ks) { const p = P(k, s); line(ctx, [p, [p[0], p[1], p[2] + 0.8]], C.white, 0.05); }
            line(ctx, ks.map((k) => { const p = P(k, s); return [p[0], p[1], p[2] + 0.8]; }), C.white, 0.07);
          }
        });
      }
    }

    // ---------- The Head Island causeway and the Sugar Bowl ----------
    lamp(R, 61.5, 51.95);
    lamp(R, 67.0, 51.95);
    R.thing(59.0, 53.85, (ctx) => bench(ctx, 59.0, 53.9, gz(59.8, 54.1)));
    const nz = gz(59.8, 54.2) + 0.53 - 0.7;
    stay(R, 59.8, 54.2, folk(831, { top: C.grey, bottom: C.brown, hat: 'cap' }), { z: nz, pose: 'read', dir: 'l', hold: bookHeld, hours: between(7, 17), umb: C.grey });
    // A fisherman on the harbor side, and his bucket.
    stay(R, 64.6, 54.7, folk(832, { top: C.mustard, bottom: C.ink, hat: 'beanie' }), { dir: 'l', arms: [1.6, 1.2], hours: between(6, 20), wet: { wear: poncho } });
    R.thing(64.9, 55.0, (ctx, t) => {
      const z = gz(64.6, 54.7);
      const tip = [64.5, 57.8, z + 2.4 + Math.sin(t * 1.2) * 0.07];
      line(ctx, [[64.75, 55.05, z + 1.25], tip], C.ink, 0.04);
      if (Q.detail) line(ctx, [tip, [64.6, 59.2, 0.03]], alpha(C.ink, 0.6), 0.015);
      box(ctx, 64.0, 54.4, z, 0.35, 0.35, 0.4, C.white, { flat: true, lw: 0.02 });
    }, { anim: true, on: between(6, 20) });
    // The Sugar Bowl: a ring of benches facing out to the water, a planter
    // and a lamp in the middle.
    const [BX, BY] = SUGAR_BOWL, BZ = gz(BX, BY);
    [90, 162, 234, 306, 18].forEach((deg) => {
      const a = (deg * Math.PI) / 180, x = BX + Math.cos(a) * 2.2, y = BY + Math.sin(a) * 2.2;
      R.thing(x, y, (ctx) => ringBench(ctx, BX, BY, 2.2, a, BZ), { depth: x + y - 0.35 });
    });
    R.thing(BX + 0.7, BY + 0.7, (ctx) => {
      ctx.beginPath();
      const [X, Y] = P3(BX, BY, BZ);
      ctx.ellipse(X, Y, 0.9, 0.45, 0, 0, TAU); paint(ctx, GRANITE, { lw: 0.03 });
      for (const [dx, dy, r] of [[0, -0.35, 0.35], [-0.35, -0.2, 0.25], [0.35, -0.2, 0.25]]) { ctx.beginPath(); ctx.arc(X + dx, Y + dy, r, 0, TAU); paint(ctx, C.leaf, { lw: 0.025, dots: C.green, density: 0.3 }); }
      for (const [dx, c] of [[-0.2, C.pink], [0.2, C.butter], [0.0, C.coral]]) { ctx.beginPath(); ctx.arc(X + dx, Y - 0.45, 0.07, 0, TAU); ctx.fillStyle = c; ctx.fill(); }
    });
    lamp(R, BX + 0.15, BY - 0.6);
    // A couple on the south bench, facing out to sea.
    const sbz = BZ + 0.52 - 0.7;
    stay(R, BX - 0.35, BY + 2.35, folk(841, { top: C.coral, bottom: C.navy }), { z: sbz, pose: 'sit', dir: 'l', hours: between(9, 21.5), umb: C.coral });
    stay(R, BX + 0.4, BY + 2.35, folk(842, { top: C.white, bottom: C.teal, style: 'long' }), { z: sbz, pose: 'sit', dir: 'l', hours: between(9, 21.5), hold: cupHeld });
    // The earbud's owner, jogging round and round the Sugar Bowl, one ear in.
    const lost = folk(843, { top: C.purple, bottom: C.ink, style: 'short', hat: 'cap' });
    const jogAt = (t) => {
      const a = (t / 9) * TAU;
      return { x: BX + Math.cos(a) * 3.2, y: BY + Math.sin(a) * 3.2, a };
    };
    R.mover((t) => (between(6.5, 19)(t) ? jogAt(t) : HIDE), (ctx, t, p) => {
      if (p.hide) return;
      const vx = -Math.sin(p.a), vy = Math.cos(p.a);
      const fc = facing(vx, vy), z = Math.max(gz(p.x, p.y), G);
      person(ctx, p.x, p.y, z, { ...lost, pose: 'run', ...fc, ...(overhead(t) ? { arms: [UP, 0.3] } : {}) }, t);
      if (Q.detail && every(18, 3.5, 0.2)(t)) speech(ctx, p.x, p.y, z + 3, 'Anyone seen an earbud?', { size: 0.38 });
    });
    // The earbud.
    // (A step clear of the bench beside it, which hid the stem.)
    const BUD = [BX + 0.7, BY + 1.2];
    R.thing(BUD[0], BUD[1], (ctx) => {
      const z = gz(...BUD) + 0.02, [X0, Y0] = P3(BUD[0], BUD[1], z);
      // (Drawn a size up, so it can be found on a phone.)
      ctx.save(); ctx.translate(X0, Y0); ctx.scale(1.6, 1.6);
      const X = 0, Y = 0;
      // An earbud, not a ball: a small bud with its grey rubber tip, and a
      // long thin stem off it at a slant, a dark mic cap on its end.
      ctx.beginPath(); ctx.ellipse(X + 0.08, Y + 0.02, 0.36, 0.1, 0, 0, TAU); ctx.fillStyle = alpha(C.ink, 0.18); ctx.fill();
      ctx.save(); ctx.translate(X - 0.12, Y - 0.14); ctx.rotate(0.35);
      ctx.beginPath(); ctx.roundRect(0.02, -0.045, 0.52, 0.09, 0.045); paint(ctx, C.white, { lw: 0.03 });
      ctx.beginPath(); ctx.roundRect(0.46, -0.045, 0.08, 0.09, 0.04); ctx.fillStyle = C.grey; ctx.fill();
      ctx.restore();
      ctx.beginPath(); ctx.ellipse(X - 0.12, Y - 0.15, 0.14, 0.12, -0.3, 0, TAU); paint(ctx, C.white, { lw: 0.03 });
      ctx.beginPath(); ctx.ellipse(X - 0.22, Y - 0.2, 0.07, 0.06, -0.3, 0, TAU); paint(ctx, C.greyLight, { lw: 0.02 });
      ctx.beginPath(); ctx.arc(X - 0.06, Y - 0.19, 0.025, 0, TAU); ctx.fillStyle = C.ink; ctx.fill();
      ctx.restore();
    });
    R.find({ id: 'earbud', label: 'A lost earbud', kind: 'hard', at: [BUD[0], BUD[1], gz(...BUD) + 0.15], r: 0.8, riddle: 'One ear in, one ear out, round and round.', hint: 'The jogger lapping the Sugar Bowl is one short. Look on the ground inside the ring of benches.' });

    // ---------- Fort Independence ----------
    // The 1851 fort: five granite curtain walls and an arrowhead bastion at
    // each corner (two faces meeting at a point, two short flanks back to the
    // curtain), all one height, grass on the ramparts behind a granite
    // parapet, the parade ground sunk inside.
    const V = FANG.map((_, i) => fv(FR, i)), inn = FANG.map((_, i) => fv(FRI, i));
    const TOP = G + FTOP, TT = TOP - 0.2; // the parapet's top, the rampart grass
    const dir = (a, b) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; };
    const add = (p, v, k) => [p[0] + v[0] * k, p[1] + v[1] * k];
    // A bastion's gorge along each curtain, its flanks, and how far its point
    // stands out from the corner.
    const BG = 1.0, BF = 0.5, BS = 1.2;
    // The outline, corner by corner, the same way round as FANG: where it
    // leaves the curtain, the flank's shoulder, the point, the other shoulder,
    // back to the next curtain. kind says what the wall from each point is.
    const OUT = [], KIND = [];
    V.forEach((v, i) => {
      const up = dir(v, V[(i + 4) % 5]), un = dir(v, V[(i + 1) % 5]);
      const np = [-up[1], up[0]], nn = [un[1], -un[0]]; // the curtains' outsides
      const cp = add(v, up, BG), cn = add(v, un, BG);
      OUT.push(cp, add(cp, np, BF), add(v, [Math.cos(FANG[i]), Math.sin(FANG[i])], BS), add(cn, nn, BF), cn);
      KIND.push('flank', 'face', 'face', 'flank', i === 0 ? 'front' : 'curtain');
    });
    const foot = OUT.map(([x, y]) => gz(x, y) - 0.2);
    // The same outline brought in by w (mitred), for the parapet's inside.
    const inset = (pts, w) => pts.map((p, k) => {
      const a = pts[(k + pts.length - 1) % pts.length], b = pts[(k + 1) % pts.length];
      const d0 = dir(a, p), d1 = dir(p, b), n0 = [d0[1], -d0[0]], n1 = [d1[1], -d1[0]];
      const m = 1 + n0[0] * n1[0] + n0[1] * n1[1];
      return [p[0] - (w * (n0[0] + n1[0])) / m, p[1] - (w * (n0[1] + n1[1])) / m];
    });
    const RIM = inset(OUT, 0.32);
    const ring = (ctx, a, b, z) => {
      ctx.beginPath();
      a.forEach(([x, y], i) => { const [X, Y] = P3(x, y, z); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.closePath();
      b.slice().reverse().forEach(([x, y], i) => { const [X, Y] = P3(x, y, z); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.closePath();
    };
    const rnd = (a, b) => frac(Math.sin(a * 127.1 + b * 311.7) * 43758.5453);
    const STONE = shade(GRANITE, 0.55), MOSS = [shade(mix(C.green, GRANITE, 0.25), 0.12), mix(C.leaf, C.green, 0.45)];
    const DARK = shade(GRANITE, 0.8);

    // One wall of dressed granite from A to B (seen from outside), its foot
    // at za and zb: block courses with staggered joints, a few stones a shade
    // off, weathering and moss at the foot, rain streaks, the coping band.
    const ashlar = (ctx, A, B, za, zb, fill, seed, gunsAt = []) => {
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const p = (u, z) => [A[0] + ((B[0] - A[0]) * u) / L, A[1] + ((B[1] - A[1]) * u) / L, z];
      const zf = (u) => za + ((zb - za) * u) / L;
      // Where the grass meets it (the mound bulges above the foot's line).
      const zg = (u) => { const [x, y] = p(u, 0); return Math.max(zf(u), gz(x, y) - 0.04); };
      const level = (f, u0 = 0, u1 = L) => { const pts = []; for (let u = u0; u < u1; u += 0.2) pts.push(p(u, f(u))); pts.push(p(u1, f(u1))); return pts; };
      const quad = (u0, u1, z0, z1) => [p(u0, z0), p(u1, z0), p(u1, z1), p(u0, z1)];
      const path = (pts) => pts.forEach((q, i) => { const [X, Y] = P3(...q); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      face(ctx, [p(0, za), p(L, zb), p(L, TOP), p(0, TOP)], fill, { lw: 0.045, dots: STONE, density: 0.06 });
      if (!Q.detail) return;
      const fine = Q.pxPerUnit >= 14; // the joints only once you're close enough to see them
      ctx.save();
      ctx.beginPath(); path([p(0, za), p(L, zb), p(L, TOP), p(0, TOP)]); ctx.closePath();
      ctx.clip();
      // Courses from the coping down, 0.34 high; blocks 0.55 to 0.95 long,
      // each course starting half a block over from the last; a few stones a
      // shade lighter or darker (dressed granite is never one grey).
      const CH = 0.34, lo = Math.min(za, zb), light = [], dark = [], joints = [];
      for (let k = 0, z1 = TOP - 0.2; z1 > lo; k++, z1 -= CH) {
        const z0 = z1 - CH;
        let u = -(k % 2) * 0.38 - rnd(seed, k) * 0.2;
        for (let j = 0; u < L; j++) {
          const w = 0.55 + rnd(seed + j, k * 7) * 0.4, r = rnd(seed * 3 + k, j);
          if (r < 0.14) light.push(quad(Math.max(0, u), Math.min(L, u + w), z0, z1));
          else if (r > 0.88) dark.push(quad(Math.max(0, u), Math.min(L, u + w), z0, z1));
          u += w;
          if (fine && u > 0.05 && u < L - 0.05) joints.push([p(u, z0), p(u, z1)]);
        }
        joints.push([p(0, z0), p(L, z0)]);
      }
      for (const [list, ink] of [[light, tint(fill, 0.14)], [dark, shade(fill, 0.08)]]) {
        ctx.beginPath();
        for (const q of list) { path(q); ctx.closePath(); }
        ctx.fillStyle = ink; ctx.fill();
      }
      ctx.beginPath();
      for (const sg of joints) path(sg);
      ctx.strokeStyle = alpha(C.ink, 0.5); ctx.lineWidth = 0.02; ctx.stroke();
      // Rain streaks down from the coping, and the damp at the foot.
      ctx.fillStyle = alpha(C.ink, 0.1);
      ctx.beginPath();
      for (let s = 0; s < L / 0.9; s++) {
        const u = (s + 0.2 + rnd(seed, s + 40) * 0.6) * 0.9, w = 0.06 + rnd(seed, s + 50) * 0.1;
        if (u + w > L) break;
        path(quad(u, u + w, TOP - 0.6 - rnd(seed, s + 60) * 1.2, TOP - 0.2)); ctx.closePath();
      }
      for (const u of gunsAt) { path(quad(u - 0.06, u + 0.06, zf(u) + 0.3, zf(u) + 1.1)); ctx.closePath(); }
      ctx.fill();
      for (const up of [0.75, 0.38]) {
        ctx.beginPath(); path([p(0, za), p(L, zb), ...level((u) => zg(u) + up).reverse()]); ctx.closePath();
        ctx.fillStyle = alpha(C.ink, 0.1); ctx.fill();
      }
      // Moss along the foot: a ragged fringe in patches, darker underneath,
      // with lighter clumps where it's thickest.
      const mossH = (u) => Math.max(0, Math.sin(u * 2.3 + seed) * 0.6 + Math.sin(u * 5.1 + seed * 0.7) * 0.4 + 0.1) * 0.3;
      const fringe = [p(0, za), p(L, zb)];
      for (let u = L; u > -0.1; u -= 0.1) fringe.push(p(Math.max(0, u), zg(Math.max(0, u)) + 0.06 + mossH(u) * 1.2));
      ctx.beginPath(); path(fringe); ctx.closePath();
      ctx.fillStyle = MOSS[0]; ctx.fill();
      ctx.beginPath();
      for (let u = 0.1; u < L; u += 0.22) {
        const m = mossH(u);
        if (m < 0.1) continue;
        const r = 0.05 + m * 0.3 + rnd(seed, u * 10) * 0.03;
        const [X, Y] = P3(...p(u + (rnd(seed, u * 10 + 1) - 0.5) * 0.1, zg(u) + 0.06 + m * 1.1));
        ctx.moveTo(X + r * 1.5, Y); ctx.ellipse(X, Y, r * 1.5, r, 0, 0, TAU);
      }
      ctx.fillStyle = MOSS[1]; ctx.fill();
      ctx.restore();
      // Gun embrasures: a dressed surround, the dark slot, its sill.
      for (const u of gunsAt) {
        const z = zf(u) + 1.15;
        face(ctx, quad(u - 0.2, u + 0.2, z - 0.05, z + 0.5), tint(fill, 0.18), { lw: 0.025 });
        face(ctx, quad(u - 0.09, u + 0.09, z + 0.05, z + 0.4), DARK, { lw: 0.02 });
        face(ctx, quad(u - 0.24, u + 0.24, z - 0.1, z - 0.03), tint(fill, 0.1), { lw: 0.02 });
      }
      // The coping along the top, standing a little proud, with its shadow.
      ctx.beginPath(); path(quad(0, L, TOP - 0.27, TOP - 0.2)); ctx.closePath();
      ctx.fillStyle = alpha(C.ink, 0.18); ctx.fill();
      face(ctx, quad(0, L, TOP - 0.2, TOP), tint(fill, 0.22), { lw: 0.03 });
      if (fine) for (let u = 0.7 + rnd(seed, 99) * 0.4; u < L - 0.2; u += 1.1) line(ctx, [p(u, TOP - 0.2), p(u, TOP)], alpha(C.ink, 0.45), 0.018);
    };

    // The sally port: an arch in the front curtain, the doors shut, and the
    // fort's name on a tablet over it.
    const sallyPort = (ctx) => {
      const fy = FRONT_Y + 0.01, dz = gz(DOOR_X, FRONT_Y + 0.3) - 0.05;
      const arch = (w, top, n = 12) => {
        const pts = [[DOOR_X - w, fy, dz], [DOOR_X + w, fy, dz]];
        for (let k = 0; k <= n; k++) { const a = (k / n) * Math.PI; pts.push([DOOR_X + Math.cos(a) * w, fy, top + Math.sin(a) * w * 0.9]); }
        return pts;
      };
      face(ctx, arch(0.85, dz + 1.45), tint(GRANITE, 0.32), { lw: 0.04 });
      if (Q.detail) {
        // Voussoirs round the arch.
        ctx.beginPath();
        for (let k = 1; k < 9; k++) {
          const a = (k / 9) * Math.PI, c = Math.cos(a), s = Math.sin(a) * 0.9;
          const [X0, Y0] = P3(DOOR_X + c * 0.62, fy, dz + 1.35 + s * 0.62), [X1, Y1] = P3(DOOR_X + c * 0.85, fy, dz + 1.45 + s * 0.85);
          ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1);
        }
        ctx.strokeStyle = alpha(C.ink, 0.5); ctx.lineWidth = 0.02; ctx.stroke();
      }
      face(ctx, arch(0.62, dz + 1.35), shade(C.brown, 0.15), { lw: 0.035 });
      line(ctx, [[DOOR_X, fy + 0.005, dz], [DOOR_X, fy + 0.005, dz + 1.9]], shade(C.brown, 0.5), 0.03);
      if (Q.detail) for (const u of [-0.4, -0.2, 0.2, 0.4]) for (const zz of [0.4, 0.9, 1.4]) disc(ctx, DOOR_X + u, fy + 0.01, dz + zz, 0.025, C.ink, { stroke: false });
      panel(ctx, 'x', DOOR_X, fy + 0.02, dz + 1.05, 0.8, 0.42, C.white, { lw: 0.025 });
      lettering(ctx, 'x', DOOR_X, fy + 0.03, dz + 1.12, 'CLOSED TUESDAYS', 0.065, C.red, 'Bagel Fat One');
      lettering(ctx, 'x', DOOR_X, fy + 0.03, dz + 0.97, 'tours sat & sun', 0.06, C.ink);
      // Its name over the door.
      // (A little left of the door: the near bastion hides the curtain's right end.)
      const NX = DOOR_X - 0.2;
      panel(ctx, 'x', NX, fy + 0.005, TOP - 0.6, 2.15, 0.56, tint(GRANITE, 0.3), { lw: 0.03 });
      lettering(ctx, 'x', NX, fy + 0.01, TOP - 0.5, 'FORT INDEPENDENCE', 0.16, shade(GRANITE, 0.62), 'Bagel Fat One');
      lettering(ctx, 'x', NX, fy + 0.01, TOP - 0.74, '1851', 0.14, shade(GRANITE, 0.62), 'Bagel Fat One');
    };
    R.thing(FC[0] + 2, FC[1] + 1, (ctx) => {
      // The outer walls you can see, back to front.
      const walls = [];
      for (let k = 0; k < OUT.length; k++) {
        const j = (k + 1) % OUT.length, A = OUT[k], B = OUT[j];
        const nx = B[1] - A[1], ny = -(B[0] - A[0]), n = Math.hypot(nx, ny);
        if (nx + ny <= 0.001) continue;
        walls.push({ k, j, A, B, d: A[0] + A[1] + B[0] + B[1], lean: (ny - nx) / n });
      }
      walls.sort((a, b) => a.d - b.d);
      for (const { k, j, A, B, lean } of walls) {
        // Darker the more it faces the lower left, in a few steps.
        const fill = shade(GRANITE, Math.round((0.05 + 0.17 * clamp01((lean + 1) / 2)) * 25) / 25);
        const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
        const kind = KIND[k];
        const guns = kind === 'flank' ? [L / 2] : kind === 'curtain' ? [L * 0.22, L * 0.5, L * 0.78] : [];
        ashlar(ctx, A, B, foot[k], foot[j], fill, k * 13 + 5, guns);
        if (kind === 'front') sallyPort(ctx);
      }

      // The ramparts' grass, behind the parapet.
      ring(ctx, RIM, inn, TT);
      paint(ctx, mix(LAND.lawn, GRANITE, 0.12), { lw: 0.03, dots: shade(LAND.lawn, 0.35), density: 0.14 });
      // The parade ground inside and the inner faces of the far walls.
      ctx.save();
      ctx.beginPath();
      inn.forEach(([x, y], i) => { const [X, Y] = P3(x, y, TT); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.closePath();
      ctx.clip();
      face(ctx, inn.map(([x, y]) => [x, y, G + PARADE]), LAND.lawn, { lw: 0.03, dots: shade(LAND.lawn, 0.4), density: 0.18 });
      if (Q.detail) line(ctx, [[FC[0], FC[1] + 2.4, G + PARADE + 0.01], [FC[0], FC[1] - 2, G + PARADE + 0.01]], tint(LAND.paving, 0.2), 0.3);
      for (let i = 0; i < 5; i++) {
        const j = (i + 1) % 5, A = inn[i], B = inn[j];
        const nx = -(B[1] - A[1]), ny = B[0] - A[0];
        if (nx + ny <= 0) continue;
        const p = (uu, zz) => [A[0] + (B[0] - A[0]) * uu, A[1] + (B[1] - A[1]) * uu, zz];
        const fill = ny > nx ? shade(GRANITE, 0.28) : shade(GRANITE, 0.14);
        face(ctx, [p(0, G + PARADE), p(1, G + PARADE), p(1, TT), p(0, TT)], fill, { lw: 0.03, dots: STONE, density: 0.08 });
        if (!Q.detail) continue;
        ctx.save(); ctx.globalAlpha *= 0.4;
        for (let zz = G + PARADE + 0.34; zz < TT - 0.1; zz += 0.34) line(ctx, [p(0, zz), p(1, zz)], C.ink, 0.018);
        ctx.restore();
        face(ctx, [p(0, TT - 0.18), p(1, TT - 0.18), p(1, TT), p(0, TT)], tint(fill, 0.2), { lw: 0.02 });
        // Casemate doors and their windows along the inside of the walls.
        for (const u of [0.2, 0.4, 0.6, 0.8]) {
          const door = u === 0.4 || u === 0.8;
          face(ctx, [p(u - 0.05, G + PARADE + (door ? 0 : 0.5)), p(u + 0.05, G + PARADE + (door ? 0 : 0.5)), p(u + 0.05, G + PARADE + 1.1), p(u - 0.05, G + PARADE + 1.1)], DARK, { lw: 0.02 });
        }
      }
      // The flagpole's foot (the near rampart hides the rest of it).
      line(ctx, [[FC[0], FC[1], G + PARADE], [FC[0], FC[1], TT]], C.ink, 0.1);
      line(ctx, [[FC[0], FC[1], G + PARADE], [FC[0], FC[1], TT]], C.white, 0.05);
      ctx.restore();
      // The parapet: its inside on the far walls, then its top all round.
      const rim = [];
      for (let k = 0; k < RIM.length; k++) {
        const A = RIM[k], B = RIM[(k + 1) % RIM.length];
        if (-(B[1] - A[1]) + (B[0] - A[0]) <= 0) continue;
        rim.push({ A, B, d: A[0] + A[1] + B[0] + B[1] });
      }
      rim.sort((a, b) => a.d - b.d);
      for (const { A, B } of rim) face(ctx, [[A[0], A[1], TT], [B[0], B[1], TT], [B[0], B[1], TOP], [A[0], A[1], TOP]], shade(GRANITE, 0.24), { lw: 0.025 });
      ring(ctx, OUT, RIM, TOP);
      paint(ctx, tint(GRANITE, 0.28), { lw: 0.04 });
      if (Q.detail && Q.pxPerUnit >= 14) {
        // Joints across the parapet's top.
        ctx.beginPath();
        OUT.forEach((A, k) => {
          const B = OUT[(k + 1) % OUT.length], a = RIM[k], b = RIM[(k + 1) % RIM.length];
          const n = Math.floor(Math.hypot(B[0] - A[0], B[1] - A[1]) / 0.8);
          for (let s = 1; s < n; s++) {
            const u = s / n, [X0, Y0] = P3(lerp(A[0], B[0], u), lerp(A[1], B[1], u), TOP), [X1, Y1] = P3(lerp(a[0], b[0], u), lerp(a[1], b[1], u), TOP);
            ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1);
          }
        });
        ctx.strokeStyle = alpha(C.ink, 0.35); ctx.lineWidth = 0.018; ctx.stroke();
      }
      // The flagpole, above the walls.
      line(ctx, [[FC[0], FC[1], TT], [FC[0], FC[1], G + PARADE + 6.4]], C.ink, 0.1);
      line(ctx, [[FC[0], FC[1], TT], [FC[0], FC[1], G + PARADE + 6.4]], C.white, 0.05);
      disc(ctx, FC[0], FC[1], G + PARADE + 6.45, 0.09, C.mustard, { lw: 0.02 });
    }, { depth: 99 });
    // Night ink over the curtains, each bastion and the flagpole.
    R.thing(FC[0] + 2.001, FC[1] + 1, (ctx) => veil(ctx, [
      [...V.map(([x, y]) => [x, y, gz(x, y) - 0.2]), ...V.map(([x, y]) => [x, y, TOP])],
      ...V.map((_, i) => { const pts = OUT.slice(i * 5, i * 5 + 5), zs = foot.slice(i * 5, i * 5 + 5); return [...pts.map(([x, y], k) => [x, y, zs[k]]), ...pts.map(([x, y]) => [x, y, TOP])]; }),
      boxPts(FC[0] - 0.1, FC[1] - 0.1, G + PARADE, 0.2, 0.2, 6.5),
    ]), { ...byNight, depth: 99.001 });
    R.light({ at: [FC[0], FRONT_Y + 2.5, G + 2.2], r: 5, color: LIT, k: (t) => nightK(t) * 0.55 });
    // The flag, in the wind off the harbor. (Flying east, off the bin at
    // the line's end: flying west it hid the FOR LATER box.)
    R.thing(FC[0], FC[1], (ctx, t) => {
      const X0 = FC[0] - FC[1], Y0 = (FC[0] + FC[1]) / 2 - (G + PARADE + 6.3) * ZK;
      const wv = (u) => Math.sin(t * 4 - u * 3) * 0.12 * u;
      const L = 1.7, H = 1.0, n = 8;
      const top = [], bot = [];
      for (let i = 0; i <= n; i++) { const u = i / n; top.push([X0 + u * L, Y0 + wv(u)]); bot.push([X0 + u * L, Y0 + H + wv(u)]); }
      ctx.beginPath(); top.forEach(([X, Y], i) => (i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y))); bot.slice().reverse().forEach(([X, Y]) => ctx.lineTo(X, Y)); ctx.closePath();
      paint(ctx, C.white, { lw: 0.035 });
      if (Q.detail) {
        for (let s = 0; s < 7; s += 2) {
          ctx.beginPath();
          for (let i = 0; i <= n; i++) { const u = i / n; ctx.lineTo(X0 + u * L, Y0 + (s / 7) * H + wv(u)); }
          for (let i = n; i >= 0; i--) { const u = i / n; ctx.lineTo(X0 + u * L, Y0 + ((s + 1) / 7) * H + wv(u)); }
          ctx.closePath(); ctx.fillStyle = C.red; ctx.fill();
        }
        ctx.beginPath();
        for (let i = 0; i <= 4; i++) { const u = (i / 4) * 0.45; ctx.lineTo(X0 + u * L, Y0 + wv(u)); }
        for (let i = 4; i >= 0; i--) { const u = (i / 4) * 0.45; ctx.lineTo(X0 + u * L, Y0 + 0.55 * H + wv(u)); }
        ctx.closePath(); ctx.fillStyle = C.navy; ctx.fill();
      }
    }, { anim: true, depth: 99.1 });
    // A tourist at the door, trying it anyway.
    const tourist = folk(851, { top: C.sky, bottom: C.brown, hat: 'sun' });
    stay(R, DOOR_X + 0.25, FRONT_Y + 0.7, tourist, { dir: 'r', back: true, arms: [1.7, 1.5], hours: between(9.5, 17), umb: C.red, hold: phoneHeld });
    R.poke({ id: 'fortdoor', at: [DOOR_X - 0.2, FRONT_Y + 0.05, gz(DOOR_X, FRONT_Y + 0.3) + 0.8], r: 0.8, sound: 'thump', say: ['Closed. It\'s a Tuesday.', 'Still Tuesday.', 'Tours Saturday and Sunday.'] });
    talk(R, DOOR_X + 0.25, FRONT_Y + 0.7, gz(DOOR_X, FRONT_Y + 0.7) + 2.8, (t) => (between(9.5, 17)(t) && every(16, 3.4, 0.5)(t) && !overhead(t) ? (frac(t / 32) < 0.5 ? 'Closed Tuesdays?' : 'Hello? Anyone?') : null), { size: 0.38 });
    // A kid on the grass, rolling down the hill (it's the best hill), timed
    // to the planes: when one comes over he stops and covers his ears.
    const kid = folk(852, { top: C.mustard, bottom: C.teal, scale: 0.72, style: 'curly' });
    const HILL = [[86.4, 14.0], [86.9, 17.0]];
    const kidAt = (t) => {
      const k = PL(t);
      const top = HILL[0], bot = HILL[1];
      const rolls = [[11.8, 15.5], [25.5, 29.2], [39.5, 43.2]];
      for (const [a, b] of rolls) {
        if (k >= a && k < b) { const u = (k - a) / (b - a); return { x: lerp(top[0], bot[0], u), y: lerp(top[1], bot[1], u), roll: true, flip: Math.floor(u * 9) % 2 }; }
        const walkEnd = b + 9;
        if (k >= b && k < walkEnd) { const u = (k - b) / 9; return { x: lerp(bot[0], top[0], u) + Math.sin(u * 7) * 0.15, y: lerp(bot[1], top[1], u), walk: true }; }
      }
      return { x: top[0], y: top[1], ears: overhead(t) };
    };
    R.mover((t) => (between(9, 18.5)(t) ? kidAt(t) : HIDE), (ctx, t, p) => {
      if (p.hide) return;
      const z = gz(p.x, p.y);
      if (p.roll) {
        person(ctx, p.x, p.y, z - 0.2, { ...kid, pose: 'lie', dir: p.flip ? 'l' : 'r', scale: 0.72 }, t);
        return;
      }
      person(ctx, p.x, p.y, z, { ...kid, pose: p.walk ? 'walk' : 'stand', dir: p.walk ? 'r' : 'l', back: !!p.walk, scale: 0.72, ...(p.ears ? { arms: [2.95, -2.95] } : {}) }, t);
      if (p.ears && Q.detail) speech(ctx, p.x, p.y, z + 2.1, 'LOUD!', { size: 0.38 });
      else if (!p.walk && Q.detail && PL(t) > 52) speech(ctx, p.x, p.y, z + 2.1, 'Again!', { size: 0.36 });
    });
    // His dad, on the grass, watching (and the planes).
    stay(R, 89.6, 15.4, folk(853, { top: C.navy, bottom: C.ink, style: 'short' }), { z: gz(89.6, 15.4) - 0.55, pose: 'sit', dir: 'l', hours: between(9, 18.5), hold: cupHeld, umb: C.teal });
    // The sign by the path up.
    R.thing(84.9, 15.6, (ctx) => {
      const z = gz(84.9, 15.5);
      for (const u of [84.45, 85.35]) pole(ctx, u, 15.5, z, 1.3, C.brown, 0.05);
      panel(ctx, 'x', 84.9, 15.56, z + 1.05, 1.2, 0.5, C.brown, { lw: 0.03 });
      lettering(ctx, 'x', 84.9, 15.57, z + 1.14, 'CASTLE ISLAND', 0.13, C.butter, 'Bagel Fat One');
      lettering(ctx, 'x', 84.9, 15.57, z + 0.96, 'FORT INDEPENDENCE', 0.07, C.white);
    });

    // ---------- The McKay monument ----------
    // A granite obelisk facing the shipping channel (the real one is 52 feet;
    // this one's been told to sit up straight and take up less of the sky).
    const [MX, MY] = MCKAY, MZ = Math.min(gz(MX - 1, MY - 1), gz(MX + 1, MY + 1)) - 0.1;
    const mTop = MZ + 7.4;
    R.thing(MX + 1.1, MY + 1.1, (ctx) => {
      box(ctx, MX - 1.1, MY - 1.1, MZ, 2.2, 2.2, 0.45 + (gz(MX - 1, MY - 1) - MZ), GRANITE, { lw: 0.04, dens: 0.14, top: tint(GRANITE, 0.25) });
      const zb = gz(MX - 1, MY - 1) + 0.45;
      box(ctx, MX - 0.8, MY - 0.8, zb, 1.6, 1.6, 0.5, GRANITE, { lw: 0.04, dens: 0.14, top: tint(GRANITE, 0.25) });
      const b = 0.55, tp = 0.34, z0 = zb + 0.5, z1 = mTop - 0.8;
      face(ctx, [[MX - b, MY + b, z0], [MX + b, MY + b, z0], [MX + tp, MY + tp, z1], [MX - tp, MY + tp, z1]], shade(GRANITE, 0.2), { lw: 0.04, dots: shade(GRANITE, 0.5), density: 0.14 });
      face(ctx, [[MX + b, MY - b, z0], [MX + b, MY + b, z0], [MX + tp, MY + tp, z1], [MX + tp, MY - tp, z1]], shade(GRANITE, 0.05), { lw: 0.04 });
      face(ctx, [[MX - tp, MY + tp, z1], [MX + tp, MY + tp, z1], [MX, MY, mTop]], shade(GRANITE, 0.15), { lw: 0.035 });
      face(ctx, [[MX + tp, MY - tp, z1], [MX + tp, MY + tp, z1], [MX, MY, mTop]], tint(GRANITE, 0.15), { lw: 0.035 });
      // The plaque, on the face toward the channel.
      face(ctx, [[MX + 0.81, MY - 0.55, zb + 0.08], [MX + 0.81, MY + 0.55, zb + 0.08], [MX + 0.81, MY + 0.55, zb + 0.44], [MX + 0.81, MY - 0.55, zb + 0.44]], mix(C.teal, C.greyLight, 0.35), { lw: 0.025 });
      lettering(ctx, 'y', MX + 0.82, MY, zb + 0.33, 'DONALD McKAY', 0.1, C.ink, 'Bagel Fat One');
      lettering(ctx, 'y', MX + 0.82, MY, zb + 0.18, 'SHIPBUILDER 1810-1880', 0.06, C.ink);
    });
    R.thing(MX + 1.101, MY + 1.101, (ctx) => veil(ctx, [boxPts(MX - 1.1, MY - 1.1, MZ, 2.2, 2.2, 1.2), [[MX - 0.55, MY - 0.55, MZ + 1], [MX + 0.55, MY - 0.55, MZ + 1], [MX + 0.55, MY + 0.55, MZ + 1], [MX - 0.55, MY + 0.55, MZ + 1], [MX, MY, mTop]]]), byNight);
    R.thing(MX + 0.2, MY + 0.2, (ctx, t) => gullStand(ctx, MX, MY, mTop - 0.05, t, false, frac(t / 17) < 0.5 ? 1 : -1), { anim: true, depth: MX + MY + 2.3 });
    // Two visitors taking its picture (and the plane's).
    stay(R, MX - 0.6, MY + 2.5, folk(861, { top: C.teal, bottom: C.ink, style: 'long' }), { dir: 'r', back: true, arms: [2.2, 0.2], hold: phoneHeld, hours: between(9.5, 18), umb: C.purple, react: { arms: [2.8, 0.2] } });
    stay(R, MX + 0.5, MY + 2.9, folk(862, { top: C.red, bottom: C.navy }), { dir: 'r', back: true, hours: between(9.5, 18), react: { pose: 'point', arms: [2.6, -0.2] } });

    // ---------- On the water ----------
    // A sailboat tacking about Pleasure Bay, and a kayak.
    const sail = (t) => {
      const a = (t / 150) * TAU;
      return { x: 66.8 + Math.cos(a) * 4.2, y: 29 + Math.sin(a) * 11.5, a };
    };
    R.mover((t) => { const p = sail(t); return { x: p.x + 0.8, y: p.y + 0.8, p }; }, (ctx, t, q) => {
      const { x, y, a } = q.p;
      const vx = -Math.sin(a) * 4.2, vy = Math.cos(a) * 11.5, L = Math.hypot(vx, vy), ux = vx / L, uy = vy / L;
      const z = 0.05 + Math.sin(t * 1.7) * 0.04;
      const bow = [x + ux * 1.0, y + uy * 1.0, z], st = [x - ux * 0.9, y - uy * 0.9, z], sx = -uy * 0.38, sy = ux * 0.38;
      face(ctx, [bow, [x + sx, y + sy, z + 0.25], [st[0] + sx, st[1] + sy, z + 0.25], [st[0] - sx, st[1] - sy, z + 0.25], [x - sx, y - sy, z + 0.25]], C.white, { lw: 0.035 });
      face(ctx, [[bow[0], bow[1], z], [x + sx, y + sy, z + 0.25], [st[0] + sx, st[1] + sy, z + 0.25], [st[0] + sx * 0.8, st[1] + sy * 0.8, z]], shade(C.white, 0.15), { lw: 0.03 });
      // The sails, flat to the screen so they read from any heading: the
      // main trailing back from the mast, the jib out to the bow.
      const mast = [x + ux * 0.2, y + uy * 0.2];
      const [MX0, MY0] = P3(mast[0], mast[1], z + 0.4), MY1 = MY0 - 2.5 * ZK;
      const back = ux - uy >= 0 ? -1 : 1; // the stern's side of the mast, on the screen
      ctx.beginPath(); ctx.moveTo(MX0, MY1); ctx.lineTo(MX0, MY0 - 0.05); ctx.quadraticCurveTo(MX0 + back * 0.7, MY0 - 0.6, MX0 + back * 1.15, MY0 - 0.05); ctx.closePath();
      paint(ctx, tint(C.butter, 0.4), { lw: 0.03 });
      const [BX0, BY0] = P3(bow[0], bow[1], z + 0.3);
      ctx.beginPath(); ctx.moveTo(MX0, MY1 + 0.4); ctx.lineTo(BX0, BY0); ctx.lineTo(MX0 - back * 0.1, MY0 - 0.1); ctx.closePath();
      paint(ctx, C.coral, { lw: 0.03 });
      ctx.beginPath(); ctx.moveTo(MX0, MY0 + 0.1); ctx.lineTo(MX0, MY1 - 0.1); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
      if (Q.detail) { ctx.save(); ctx.globalAlpha *= 0.5; line(ctx, [[st[0], st[1], 0.01], [st[0] - ux * 1.5, st[1] - uy * 1.5, 0.01]], C.white, 0.05); ctx.restore(); }
    });
    R.mover((t) => {
      const a = -(t / 80) * TAU;
      return { x: 70 + Math.cos(a) * 2.2, y: 17 + Math.sin(a) * 5, a };
    }, (ctx, t, p) => {
      const ux = Math.sin(p.a) * 2.2, uy = -Math.cos(p.a) * 5, L = Math.hypot(ux, uy), vx = ux / L, vy = uy / L;
      const z = 0.03;
      face(ctx, [[p.x + vx * 1.3, p.y + vy * 1.3, z], [p.x + vy * 0.3, p.y - vx * 0.3, z + 0.15], [p.x - vx * 1.3, p.y - vy * 1.3, z], [p.x - vy * 0.3, p.y + vx * 0.3, z + 0.15]], C.mustard, { lw: 0.03 });
      // (In the kayak up to the waist: no legs.)
      person(ctx, p.x, p.y, z - 0.6, { ...folk(871, { top: C.red, hat: 'cap' }), pose: 'swim', ...facing(vx, vy), arms: overhead(t) ? [UP, -0.4] : [1.3 + Math.sin(t * 4) * 0.4, -1.3 + Math.sin(t * 4) * 0.4] }, t);
      const s = Math.sin(t * 4) * 0.6;
      line(ctx, [[p.x - vy * 0.9 + vx * s, p.y + vx * 0.9 + vy * s, z + 0.1 + Math.max(0, s) * 0.5], [p.x + vy * 0.9 - vx * s, p.y - vx * 0.9 - vy * s, z + 0.1 + Math.max(0, -s) * 0.5]], C.ink, 0.04);
    }, { on: between(7, 18) });
    // Buoys in the channel, one with a gull on it.
    for (const [x, y, gull] of [[86.5, 28, true], [89.5, 50, false]]) {
      R.thing(x, y, (ctx, t) => {
        const z = Math.sin(t * 1.3 + x) * 0.06, tilt = Math.sin(t * 1.1 + y) * 0.08;
        const [X, Y] = P3(x, y, z);
        ctx.beginPath(); ctx.moveTo(X - 0.3, Y); ctx.lineTo(X - 0.18 + tilt, Y - 0.9); ctx.lineTo(X + 0.18 + tilt, Y - 0.9); ctx.lineTo(X + 0.3, Y); ctx.closePath();
        paint(ctx, gull ? C.red : C.green, { lw: 0.03 });
        ctx.fillStyle = C.white; ctx.fillRect(X - 0.22 + tilt * 0.5, Y - 0.55, 0.44, 0.1);
        if (gull) gullStand(ctx, x - 0.3 + tilt, y - 0.3, z + 0.85, t, false, 1);
      }, { anim: true });
    }
    // The container ship, coming in.
    R.mover((t) => { const b = shipBow(t); return b ? { x: SHIP.x0 + SHIP.w, y: Math.min(67.9, b.y + SHIP.L), b } : HIDE; }, (ctx, t, p) => {
      if (p.hide) return;
      const { y: yb, a } = p.b, x0 = SHIP.x0, w = SHIP.w, ys = yb + SHIP.L, cut = 67.95;
      // Everything is cut off at the map's front edge, like the land.
      const bx = (x, y0, z, ww, y1, hgt, color, o) => {
        const a0 = y0, a1 = Math.min(y1, cut);
        if (a1 <= a0) return;
        box(ctx, x, a0, z, ww, a1 - a0, hgt, color, o);
      };
      ctx.save(); ctx.globalAlpha *= a;
      // The bow, a wedge, then the hull.
      face(ctx, [[x0 + w / 2, yb, 1.6], [x0 + w, yb + 1.6, 1.6], [x0 + w, yb + 1.6, 0], [x0 + w / 2, yb + 0.2, 0]], shade(HULL, 0.05), { lw: 0.04 });
      face(ctx, [[x0 + w / 2, yb, 1.6], [x0 + w, yb + 1.6, 1.6], [x0, yb + 1.6, 1.6]], tint(C.grey, 0.2), { lw: 0.035 });
      bx(x0, yb + 1.6, 0, w, ys, 1.6, HULL, { lw: 0.045, dens: 0.12, top: tint(C.grey, 0.2) });
      if (Q.detail) face(ctx, [[x0 + w + 0.01, yb + 1.6, 0], [x0 + w + 0.01, Math.min(ys, cut), 0], [x0 + w + 0.01, Math.min(ys, cut), 0.3], [x0 + w + 0.01, yb + 1.6, 0.3]], C.red, { stroke: false });
      // Containers, in bays of two.
      const COLS = [C.coral, C.teal, C.mustard, C.navy, C.red, C.green, C.purple, C.white];
      let i = 0;
      for (let y = yb + 2.2; y < ys - 4.6; y += 2.05, i++) {
        const n = 1 + ((i * 7) % 3);
        for (let k = 0; k < n; k++) bx(x0 + 0.15, y, 1.6 + k * 0.8, w - 0.3, y + 1.95, 0.8, COLS[(i * 3 + k * 5) % COLS.length], { lw: 0.03, flat: true });
      }
      // The bridge and the stack at the stern.
      bx(x0 + 0.2, ys - 4.2, 1.6, w - 0.4, ys - 1.8, 3.4, C.white, { lw: 0.04, flat: true, right: tint(C.greyLight, 0.2) });
      if (Q.detail && ys - 1.8 <= cut) face(ctx, [[x0 + 0.3, ys - 1.79, 4.3], [x0 + w - 0.3, ys - 1.79, 4.3], [x0 + w - 0.3, ys - 1.79, 4.65], [x0 + 0.3, ys - 1.79, 4.65]], C.ink, { stroke: false });
      bx(x0 + w / 2 - 0.5, ys - 1.6, 1.6, 1.0, ys - 0.5, 4.9, C.mustard, { lw: 0.04, flat: true });
      bx(x0 + w / 2 - 0.52, ys - 1.62, 5.6, 1.04, ys - 0.48, 0.4, C.navy, { lw: 0.03, flat: true });
      ctx.restore();
      if (Q.detail && ys - 1 < cut) for (let j = 0; j < 5; j++) {
        const k = frac(t / 4 + j / 5), [X, Y] = P3(x0 + w / 2, ys - 1.05 - k * 1.5, 6.6 + k * 2);
        ctx.beginPath(); ctx.arc(X - k * 1.2, Y, 0.18 + k * 0.35, 0, TAU); ctx.fillStyle = alpha(C.grey, 0.5 * (1 - k) * a); ctx.fill();
      }
    });
  },
};
