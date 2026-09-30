// Farragut Road (docs/levels/southie.md): the street in front of the row on
// Moving Day. Parked both sides, the rest of the row (not enterable) at both
// ends, East Broadway's end at the top, the shore road and the sea wall at
// the bottom.
//
// The running gag, the truck: HEAVE-HO comes down the road at 7am and is
// stuck by 9 in front of the Yellow House, between a car parked in its own
// NO PARKING zone (ticketed at 8:20) and a pickup double-parked beside a
// lawn chair saving a space. The queue behind it honks all day (a goose in
// the other lane honks along). The parked car's owner comes back at noon,
// looks, and walks off. At 3pm six neighbors come out and bounce the car
// sideways ("HEAVE!" "HO!"), the truck gets out to applause and is gone
// south by 4:15, the queue after it.
//
// Also: the couch on its rope in front of the Green House from 9am (with a
// man on a guide rope below it), the curb pile in front of the Yellow House
// (under a tarp in the rain, carried off one piece at a time from CURB's
// hours; the bagged mattress stays, it always stays), the Storrowed truck
// and its driver on the curb, the Courier's van, the rain (umbrellas,
// puddles that ripple and linger, a mattress carried as an umbrella), and at
// night the streetlights, the cars' shapes in the dark, and a pizza at 9:30.
//
// World units, like plan.js and land.js (this area sits at the map's corner).
import { C, Q, box, face, disc, paint, person, folk, speech, mix, tint, shade, alpha, goose } from '../../../engine/art.js';
import { ZK } from '../../../engine/iso.js';
import { drawLand } from '../../../engine/terrain.js';
import { land } from '../land.js';
import { ROAD, HOUSES, OTHER_HOUSES, ROW_X0, GROUND, SHORE_Y, CURB, FH } from '../plan.js';
import { hour, between, nightK, rainK, wetK } from '../clock.js';
import { house, dusk, panes, car, truck, carton, lawnChair, mattress, lettering } from '../kit.js';
import { beat, playing, HAUL, PIVOT } from '../finale.js';
import { SIDING, INK, CARS, CUP, LIT, EVENING, BRAND } from '../style.js';

const G = GROUND;
const yOf = (id) => HOUSES.find(([k]) => k === id)[1];

// ---------- Small helpers ----------
const P3 = (x, y, z) => [x - y, (x + y) / 2 - z * ZK];
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (k) => { k = clamp01(k); return k * k * (3 - 2 * k); };
const frac = (v) => v - Math.floor(v);
// The hour, running past midnight (1am is 25) so the evening stays in order.
const hh = (t) => { const h = hour(t); return h < 5 ? h + 24 : h; };
const raining = (t) => rainK(t) > 0.12;
const q8 = (k) => Math.round(k * 8) / 8;
const q16 = (k) => Math.round(k * 16) / 16;
// Stepped fades: still pictures that change only now and then.
const byNight = { fade: (t) => q8(nightK(t)), step: (t) => q8(nightK(t)) };
const HIDE = { x: -1e4, y: -1e4, hide: true };

// Inks for the street, from the plate's.
const GRANITE = mix(C.greyLight, C.grey, 0.4);
const LAMPPOST = mix(C.green, C.ink, 0.55);
const TARP = mix(C.sky, C.navy, 0.35);
const BIN = mix(C.sky, C.navy, 0.25);
const RECLINER = mix(C.brown, C.wood, 0.35);
const PUDDLE = alpha(tint(C.sky, 0.35), 0.6);
const VEIL = alpha(C.night, 0.42);
const UMBRELLAS = [C.teal, C.coral, C.mustard, C.purple, C.navy, C.pink];

function line(ctx, pts, color, lw = 0.05) {
  ctx.beginPath();
  pts.forEach((p, i) => { const [X, Y] = P3(p[0], p[1], p[2]); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.stroke();
}
const pole = (ctx, x, y, z, h, color = C.greyLight, r = 0.06) => box(ctx, x - r, y - r, z, r * 2, r * 2, h, color, { flat: true, lw: 0.03 });
// A flat panel facing the lower left (along x, at y) or lower right (along y, at x).
function panel(ctx, along, x, y, z, w, h, fill, o = {}) {
  const c = along === 'x' ? x : y;
  const pts = along === 'x'
    ? [[c - w / 2, y, z - h / 2], [c + w / 2, y, z - h / 2], [c + w / 2, y, z + h / 2], [c - w / 2, y, z + h / 2]]
    : [[x, c - w / 2, z - h / 2], [x, c + w / 2, z - h / 2], [x, c + w / 2, z + h / 2], [x, c - w / 2, z + h / 2]];
  face(ctx, pts, fill, { lw: o.lw ?? 0.03 });
}
// The night: a veil of the night ink over boxes' silhouettes (a parked car's
// shape in the dark), all in one path wound one way so overlaps aren't laid twice.
function veil(ctx, boxes, fill = VEIL) {
  ctx.beginPath();
  for (const [x, y, z, w, d, h] of boxes) {
    const s = [[x, y + d, z], [x + w, y + d, z], [x + w, y, z], [x + w, y, z + h], [x, y, z + h], [x, y + d, z + h]].map((p) => P3(...p));
    let a = 0;
    for (let i = 0, j = s.length - 1; i < s.length; j = i++) a += s[j][0] * s[i][1] - s[i][0] * s[j][1];
    if (a < 0) s.reverse();
    s.forEach(([X, Y], i) => (i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y)));
    ctx.closePath();
  }
  ctx.fillStyle = fill;
  ctx.fill();
}
// The boxes a kit car stands in (car() in kit.js), for its veil.
function carBoxes(x, y, z, along) {
  const X = along === 'x';
  const [w, d] = X ? [2.8, 1.5] : [1.5, 2.8];
  const [cw, cd] = X ? [1.5, 1.26] : [1.26, 1.5];
  return [[x - w / 2, y - d / 2, z, w, d, 0.82], [x - cw / 2, y - cd / 2, z + 0.82, cw, cd, 0.5]];
}

// ---------- Things people hold (in the person's own units) ----------
// An iced coffee: clear cup, pink band, orange lid, a straw.
function cupHeld(ctx) {
  ctx.beginPath(); ctx.moveTo(-0.11, -0.34); ctx.lineTo(-0.08, 0); ctx.lineTo(0.08, 0); ctx.lineTo(0.11, -0.34); ctx.closePath();
  paint(ctx, mix(C.brown, C.white, 0.45), { lw: 0.025 });
  ctx.fillStyle = CUP.band; ctx.fillRect(-0.1, -0.2, 0.2, 0.08);
  ctx.fillStyle = CUP.lid; ctx.fillRect(-0.11, -0.37, 0.22, 0.05);
  ctx.strokeStyle = CUP.lid; ctx.lineWidth = 0.035; ctx.beginPath(); ctx.moveTo(0.03, -0.37); ctx.lineTo(0.08, -0.55); ctx.stroke();
}
// A carrier tray of four.
function trayHeld(ctx) {
  ctx.beginPath(); ctx.rect(-0.3, -0.05, 0.6, 0.12); paint(ctx, C.woodLight, { lw: 0.025 });
  for (const dx of [-0.2, 0, 0.2]) { ctx.save(); ctx.translate(dx, -0.02); ctx.scale(0.8, 0.8); cupHeld(ctx); ctx.restore(); }
}
function pizzaHeld(ctx) {
  ctx.beginPath(); ctx.rect(-0.35, -0.5, 0.7, 0.14); paint(ctx, C.white, { lw: 0.03 });
  ctx.beginPath(); ctx.rect(-0.33, -0.36, 0.66, 0.12); paint(ctx, C.white, { lw: 0.03 });
}
function phoneHeld(ctx) {
  ctx.beginPath(); ctx.rect(-0.02, -0.34, 0.18, 0.28); paint(ctx, C.black, { lw: 0.02 });
}
function clipboardHeld(ctx) {
  ctx.beginPath(); ctx.rect(-0.05, -0.36, 0.32, 0.4); paint(ctx, C.woodLight, { lw: 0.025 });
  ctx.beginPath(); ctx.rect(0.0, -0.3, 0.22, 0.28); paint(ctx, C.white, { stroke: false });
}
// A foil blanket over the shoulders (the Storrowed driver).
function blanket(ctx, b) {
  ctx.beginPath();
  ctx.moveTo(-0.34, b.top + 0.05); ctx.lineTo(0.34, b.top + 0.05); ctx.lineTo(0.42, b.hipY + 0.1); ctx.lineTo(-0.42, b.hipY + 0.1); ctx.closePath();
  paint(ctx, tint(C.greyLight, 0.2), { lw: 0.03, dots: C.grey, density: 0.2 });
}
// An umbrella over someone standing at (x, y, z).
function umbrella(ctx, x, y, z, color, sway = 0) {
  const [X, Y] = P3(x, y, z);
  const top = Y - 2.95 * ZK, r = 0.78;
  ctx.save();
  ctx.translate(X + sway, top);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0.12 - sway, 1.25); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-r, 0.05);
  ctx.quadraticCurveTo(-r, -0.55, 0, -0.58);
  ctx.quadraticCurveTo(r, -0.55, r, 0.05);
  for (let i = 3; i >= 0; i--) { const a = -r + (i + 0.5) * (2 * r / 4); ctx.quadraticCurveTo(a + r / 4, -0.12, a - r / 4 + 0.02, 0.05); }
  ctx.closePath();
  paint(ctx, color, { lw: 0.04, dots: shade(color, 0.4), density: 0.12 });
  ctx.beginPath(); ctx.moveTo(0, -0.58); ctx.lineTo(0, -0.72); ctx.stroke();
  ctx.restore();
}
// A traffic cone.
function cone(ctx, x, y, z) {
  const [X, Y] = P3(x, y, z);
  ctx.beginPath(); ctx.rect(X - 0.32, Y - 0.1, 0.64, 0.16); paint(ctx, INK.truck, { lw: 0.025 });
  ctx.beginPath(); ctx.moveTo(X - 0.2, Y - 0.08); ctx.lineTo(X - 0.05, Y - 0.85); ctx.lineTo(X + 0.05, Y - 0.85); ctx.lineTo(X + 0.2, Y - 0.08); ctx.closePath();
  paint(ctx, INK.truck, { lw: 0.03 });
  ctx.fillStyle = C.white; ctx.fillRect(X - 0.13, Y - 0.5, 0.26, 0.12);
}

// Someone who holds still in their hours: a cached picture (and a second one
// under an umbrella while it rains). o: { z, pose, dir, back, hold, arms,
// wear, hours, umb (an umbrella color, when it rains), scale, depth }
function stay(R, x, y, look, o = {}) {
  const z = o.z ?? G;
  const hours = o.hours || (() => true);
  const pose = { ...look, pose: o.pose || 'stand', dir: o.dir || 'r', back: !!o.back, ...(o.hold ? { hold: o.hold } : {}), ...(o.arms ? { arms: o.arms } : {}), ...(o.wear ? { wear: o.wear } : {}), ...(o.scale ? { scale: o.scale } : {}) };
  const depth = o.depth != null ? { depth: o.depth } : {};
  const draw = (umb) => (ctx) => { if (o.under) o.under(ctx); person(ctx, x, y, z, pose, 0); if (umb) umbrella(ctx, x, y, z, umb); if (o.over) o.over(ctx); };
  if (!o.umb) { R.thing(x, y, draw(null), { on: hours, ...depth }); return; }
  R.thing(x, y, draw(null), { on: (t) => hours(t) && !raining(t), ...depth });
  R.thing(x, y, draw(o.umb), { on: (t) => hours(t) && raining(t), ...depth });
}
// A speech bubble now and then: say(t) returns the words, or null.
function talk(R, x, y, z, say, o = {}) {
  R.thing(x, y, (ctx, t) => { const s = say(t); if (s) speech(ctx, x, y, z, s, { size: o.size || 0.46 }); }, { anim: true, depth: x + y + 6, on: (t) => !!say(t) });
}
// Every so often: true for `on` seconds of every `every`.
const every = (period, on, off = 0) => (t) => frac(t / period + off) < on / period;

// A walk on the day's clock: [hour, x, y, extra] keyframes, straight lines
// between; standing still takes the extra of the frame it's standing at.
// Returns (t) => null (not about) or { x, y, dir, back, moving, ... }.
function timeline(frames) {
  return (t) => {
    const hr = hh(t);
    if (hr < frames[0][0] || hr > frames[frames.length - 1][0]) return null;
    for (let i = 0; i < frames.length - 1; i++) {
      const a = frames[i], b = frames[i + 1];
      if (hr > b[0]) continue;
      const k = (hr - a[0]) / Math.max(1e-6, b[0] - a[0]);
      const dx = b[1] - a[1], dy = b[2] - a[2];
      const x = a[1] + dx * k, y = a[2] + dy * k;
      const extra = a[3] || {};
      if (Math.abs(dx) + Math.abs(dy) > 1e-6) {
        const dX = dx - dy, dY = dx + dy;
        return { ...extra, x, y, moving: true, pose: 'walk', dir: dX >= 0 ? 'r' : 'l', back: dY < -0.01 };
      }
      return { dir: 'r', back: false, pose: 'stand', ...extra, x, y, moving: false };
    }
    return null;
  };
}
// Someone on a timeline, drawn live. o: { z, hold, umb, look extras, say(t, p) }
function walker(R, frames, look, o = {}) {
  const at = timeline(frames);
  R.mover((t) => at(t) || HIDE, (ctx, t, p) => {
    if (p.hide) return;
    const z = (o.z ?? G) + (p.z || 0);
    person(ctx, p.x, p.y, z, { ...look, pose: p.pose, dir: p.dir, back: p.back, ...(p.arms ? { arms: p.arms } : {}), ...(o.hold || p.hold ? { hold: p.hold || o.hold } : {}) }, t);
    if (o.umb && raining(t)) umbrella(ctx, p.x, p.y, z, o.umb, p.moving ? Math.sin(t * 7) * 0.04 : 0);
    if (o.after) o.after(ctx, t, p, z);
    if (p.say && Q.detail) speech(ctx, p.x, p.y, z + 3.1, p.say, { size: 0.44 });
  });
}

// ---------- The truck's day (the running gag) ----------
// Down the road from the north at 7am, stuck by 9 in front of the Yellow
// House, out at 3pm after the car's been bounced aside, gone south by 4:15.
const TX = ROAD.mid; // its middle, across both lanes
const STUCK = 33.5; // where its back end stops
const TRUCK_L = 7;
function truckBack(t) {
  const hr = hh(t);
  if (hr < 7 || hr >= 16.2) return null;
  if (hr < 8.6) return -TRUCK_L + (STUCK + TRUCK_L) * smooth((hr - 7) / 1.6);
  if (hr < 15.2) return STUCK;
  const k = (hr - 15.2) / 1;
  return STUCK + (70 - STUCK) * k * k * (1.6 - 0.6 * k);
}
const stuck = (t) => { const hr = hh(t); return hr >= 8.6 && hr < 15.2; };
// The car in the way: parked in the truck's own NO PARKING zone, a little
// out from the curb; bounced 0.9 sideways at 3pm, a hop at a time.
const BLOCK = { x: 19.9, y: 42.6 }; // its middle, just ahead of the truck's nose
const HOPS = 6;
function bounce(t) {
  const hr = hh(t);
  if (hr < 15) return { dx: 0, z: 0, k: 0, i: -1 };
  if (hr >= 15.3) return { dx: -0.9, z: 0, k: 1, i: HOPS };
  const k = (hr - 15) / 0.3, i = Math.floor(k * HOPS), f = frac(k * HOPS);
  return { dx: -0.9 * (i + smooth(f)) / HOPS, z: 0.38 * Math.sin(Math.PI * f), k, i, f };
}
// The queue behind the truck: the southbound lane, stopped car by car from
// nine; they follow it out at 3:20. [x, y, color, arrives, leaves, along]
const QX = ROAD.lane0 + 1.15;
const QUEUE = [
  [QX, 25.6, CARS[5], 8.75, 15.35],
  [QX, 21.9, CARS[2], 9.1, 15.42],
  [QX, 18.3, CARS[3], 9.5, 15.5],
  [19.6, 13.0, CARS[6], 10, 15.6, 'x'], // stuck mid-turn, in from Broadway
];
const SPEED = 38; // units an hour
function queuePos(q, t) {
  const [x, y, , a, l, along] = q, hr = hh(t);
  if (along === 'x') {
    const x0 = x - SPEED * 0.4;
    if (hr < a - 0.4 || hr > l + 0.4) return null;
    if (hr < a) return { x: x0 + (x - x0) * smooth((hr - (a - 0.4)) / 0.4), y };
    if (hr < l) return { x, y, still: true };
    return { x: x + SPEED * (hr - l), y };
  }
  const t0 = a - (y + 4) / SPEED;
  if (hr < t0 || hr > l + 1.2) return null;
  if (hr < a) return { x, y: -4 + (y + 4) * ((hr - t0) / (a - t0)) };
  if (hr < l) return { x, y, still: true };
  return { x, y: y + SPEED * (hr - l) * Math.min(1, (hr - l) * 6 + 0.3) };
}
const honking = (i) => every(5.3, 0.9, i * 0.29);

// ---------- The couch on the rope ----------
// Up from the sidewalk in front of the Green House at 9am, halfway up from
// 9:20 on, all day and all night; at the end the geese haul it up to the
// porch and the house takes it in (finale.js; green-3 draws the rest).
const COUCH = [16.6, yOf('green') + 1];
const COUCH_W = 1.6, COUCH_D = 2.4;
function couchZ(t) {
  if (playing()) return beat(PIVOT) > 0 ? null : G + 6.2 + (2 * FH + 1 - 6.2) * beat(HAUL);
  const hr = hour(t);
  if (hr >= 5 && hr < 9) return null;
  if (hr >= 9 && hr < 9.35) return G + 0.4 + 5.8 * ((hr - 9) / 0.35);
  return G + 6.2 + 0.08 * Math.sin(t * 1.3);
}
// The pulley, on an arm off the top of the Green House's porches.
const PULLEY = [16.1, COUCH[1] + COUCH_D / 2, G + 3 * FH - 0.2];

// A proper couch: coral, a plump seat and back, rolled arms, three legs (the
// fourth is up on the third floor: a find).
function couchArt(ctx, x, y, z, color = C.coral) {
  const w = COUCH_W, d = COUCH_D;
  const legs = [[x + 0.15, y + 0.15], [x + w - 0.3, y + 0.15], [x + w - 0.3, y + d - 0.3]];
  for (const [lx, ly] of legs) box(ctx, lx, ly, z, 0.15, 0.15, 0.22, C.brown, { flat: true, lw: 0.02 });
  box(ctx, x, y, z + 0.22, w, d, 0.42, color, { lw: 0.04, dens: 0.18 });
  box(ctx, x, y, z + 0.64, 0.45, d, 0.75, shade(color, 0.05), { lw: 0.04 });
  box(ctx, x, y, z + 0.64, w, 0.35, 0.45, color, { lw: 0.04 });
  box(ctx, x, y + d - 0.35, z + 0.64, w, 0.35, 0.45, color, { lw: 0.04 });
  if (Q.detail) {
    box(ctx, x + 0.45, y + 0.35, z + 0.64, w - 0.5, (d - 0.7) / 2, 0.14, tint(color, 0.12), { flat: true, lw: 0.025 });
    box(ctx, x + 0.45, y + 0.35 + (d - 0.7) / 2, z + 0.64, w - 0.5, (d - 0.7) / 2, 0.14, tint(color, 0.12), { flat: true, lw: 0.025 });
  }
}

// ---------- A pickup and a van ----------
// The double-parked pickup, facing north: cab at its north end, the bed open.
function pickup(ctx, x, y0, z, color) {
  const w = 1.6, L = 4.4, cab = 1.9;
  if (Q.detail) for (const [dx, dy] of [[0.62, 0.8], [0.62, L - 0.8], [-0.62, 0.8], [-0.62, L - 0.8]]) box(ctx, x + dx - 0.2, y0 + dy - 0.2, z, 0.4, 0.4, 0.42, C.ink, { flat: true, lw: 0.03 });
  box(ctx, x - w / 2, y0, z + 0.25, w, L, 0.65, color, { flat: true, lw: 0.045 });
  box(ctx, x - w / 2 + 0.1, y0 + 0.9, z + 0.9, w - 0.2, cab - 0.9, 0.62, mix(tint(C.sky, 0.25), color, 0.12), { flat: true, lw: 0.04, top: tint(color, 0.08) });
  // The bed: its floor and its sides.
  box(ctx, x - w / 2 + 0.08, y0 + cab + 0.05, z + 0.9, w - 0.16, L - cab - 0.13, 0.02, shade(color, 0.35), { flat: true, stroke: false });
  box(ctx, x + w / 2 - 0.1, y0 + cab, z + 0.9, 0.1, L - cab, 0.35, color, { flat: true, lw: 0.03 });
  box(ctx, x - w / 2, y0 + L - 0.1, z + 0.9, w, 0.1, 0.35, color, { flat: true, lw: 0.03 });
}
// The Courier's van: brown, boxy, back doors open, hazards on.
function van(ctx, x, y0, z) {
  const w = 1.8, L = 3.4, H = 2.5;
  if (Q.detail) for (const [dx, dy] of [[0.7, 0.6], [0.7, L - 0.6], [-0.7, 0.6], [-0.7, L - 0.6]]) box(ctx, x + dx - 0.2, y0 + dy - 0.2, z, 0.4, 0.4, 0.42, C.ink, { flat: true, lw: 0.03 });
  box(ctx, x - w / 2, y0 + 0.9, z + 0.3, w, L - 0.9, H - 0.3, C.brown, { lw: 0.045, dens: 0.12, top: tint(C.brown, 0.15) });
  box(ctx, x - w / 2, y0, z + 0.3, w, 0.9, 1.1, C.brown, { flat: true, lw: 0.04 });
  face(ctx, [[x + w / 2, y0 + 0.1, z + 1.4], [x + w / 2, y0 + 0.9, z + 1.4], [x + w / 2, y0 + 0.9, z + 2.3], [x + w / 2, y0 + 0.5, z + 2.3]], tint(C.sky, 0.25), { lw: 0.03 });
  lettering(ctx, 'y', x + w / 2 + 0.01, y0 + 2.1, z + 1.75, 'PARCELS', 0.36, C.butter, 'Bagel Fat One');
  lettering(ctx, 'y', x + w / 2 + 0.01, y0 + 2.1, z + 1.25, '(EVENTUALLY)', 0.17, C.butter);
  // The open back: dark inside, parcels, the doors swung out.
  face(ctx, [[x - w / 2 + 0.1, y0 + L, z + 0.4], [x + w / 2 - 0.1, y0 + L, z + 0.4], [x + w / 2 - 0.1, y0 + L, z + H - 0.1], [x - w / 2 + 0.1, y0 + L, z + H - 0.1]], shade(C.brown, 0.6), { lw: 0.03 });
  if (Q.detail) {
    carton(ctx, x - 0.6, y0 + L - 0.6, z + 0.4, 0.55, 0.5, 0.45);
    carton(ctx, x + 0.05, y0 + L - 0.6, z + 0.4, 0.5, 0.5, 0.6);
    carton(ctx, x - 0.4, y0 + L - 0.55, z + 0.85, 0.45, 0.45, 0.4);
  }
  box(ctx, x + w / 2 - 0.05, y0 + L, z + 0.35, 0.05, 0.85, H - 0.45, C.brown, { flat: true, lw: 0.03 });
  box(ctx, x - w / 2, y0 + L, z + 0.35, 0.05, 0.85, H - 0.45, C.brown, { flat: true, lw: 0.03 });
}

// ---------- Street furniture ----------
// A NO PARKING sign on a post: the city's street occupancy permit, a real thing.
function noParking(ctx, x, y) {
  pole(ctx, x, y, G, 2.6, C.greyLight, 0.05);
  const z = G + 2.25;
  panel(ctx, 'x', x, y + 0.06, z, 0.8, 0.95, C.white, { lw: 0.035 });
  panel(ctx, 'x', x, y + 0.061, z + 0.28, 0.72, 0.24, C.red, { lw: 0.01 });
  lettering(ctx, 'x', x, y + 0.07, z + 0.28, 'NO PARKING', 0.12, C.white, 'Bagel Fat One');
  lettering(ctx, 'x', x, y + 0.07, z + 0.02, 'MOVING DAY', 0.12, C.ink, 'Bagel Fat One');
  lettering(ctx, 'x', x, y + 0.07, z - 0.18, 'SEPT 1  7AM-6PM', 0.08, C.ink);
  lettering(ctx, 'x', x, y + 0.07, z - 0.34, 'TOW ZONE', 0.09, C.red, 'Bagel Fat One');
}
// The poster the goose's been on in every place: "Have you seen this goose?",
// taped to a pole, a little soggy (a goose drawn on it).
function goosePoster(ctx, x, y) {
  pole(ctx, x, y, G, 2.8, C.greyLight, 0.05);
  const z = G + 2.1;
  panel(ctx, 'x', x, y + 0.06, z, 0.9, 1.1, C.white, { lw: 0.035 });
  lettering(ctx, 'x', x, y + 0.07, z + 0.38, 'HAVE YOU SEEN', 0.1, C.ink, 'Bagel Fat One');
  lettering(ctx, 'x', x, y + 0.07, z + 0.25, 'THIS GOOSE?', 0.1, C.ink, 'Bagel Fat One');
  if (Q.detail) goose(ctx, x - 0.12, y + 0.08, z - 0.35, 0, { scale: 0.42, dir: 'r' });
  lettering(ctx, 'x', x, y + 0.07, z - 0.42, 'ANSWERS TO HONK', 0.065, C.red);
}
// A streetlight: a post-top lantern on a dark green post.
const LAMP_H = 3.9;
function streetlight(ctx, x, y, lit = false) {
  box(ctx, x - 0.16, y - 0.16, G, 0.32, 0.32, 0.35, LAMPPOST, { flat: true, lw: 0.03 });
  pole(ctx, x, y, G + 0.35, LAMP_H - 0.35, LAMPPOST, 0.07);
  const z = G + LAMP_H;
  box(ctx, x - 0.2, y - 0.2, z, 0.4, 0.4, 0.55, lit ? LIT : tint(C.sky, 0.45), { flat: true, lw: 0.03, top: LAMPPOST });
  const [X, Y] = P3(x, y, z + 0.55);
  ctx.beginPath(); ctx.moveTo(X - 0.4, Y + 0.02); ctx.lineTo(X, Y - 0.34); ctx.lineTo(X + 0.4, Y + 0.02); ctx.closePath();
  paint(ctx, LAMPPOST, { lw: 0.03 });
}
function hydrant(ctx, x, y) {
  box(ctx, x - 0.2, y - 0.2, G, 0.4, 0.4, 0.14, C.red, { flat: true, lw: 0.025 });
  box(ctx, x - 0.15, y - 0.15, G + 0.14, 0.3, 0.3, 0.55, C.red, { flat: true, lw: 0.03 });
  box(ctx, x - 0.25, y - 0.07, G + 0.45, 0.5, 0.14, 0.14, C.red, { flat: true, lw: 0.025 });
  box(ctx, x - 0.18, y - 0.18, G + 0.69, 0.36, 0.36, 0.1, C.butter, { flat: true, lw: 0.025 });
}
function barrel(ctx, x, y, color, lid = true) {
  box(ctx, x - 0.3, y - 0.3, G, 0.6, 0.6, 1.0, color, { lw: 0.03, dens: 0.14 });
  if (lid) box(ctx, x - 0.34, y - 0.34, G + 1.0, 0.68, 0.68, 0.08, shade(color, 0.12), { flat: true, lw: 0.025 });
}
function bench(ctx, x, y) {
  for (const dx of [0.15, 1.45]) box(ctx, x + dx, y + 0.1, G, 0.1, 0.5, 0.45, C.ink, { flat: true, lw: 0.02 });
  box(ctx, x, y, G + 0.45, 1.7, 0.6, 0.08, C.wood, { flat: true, lw: 0.03 });
  box(ctx, x, y - 0.05, G + 0.53, 1.7, 0.08, 0.5, C.wood, { flat: true, lw: 0.03 });
}
function gullStand(ctx, x, y, z, t = 0, peck = false, dir = 1) {
  const [X, Y] = P3(x, y, z);
  ctx.save(); ctx.translate(X, Y); ctx.scale(dir, 1);
  const pk = peck && Math.sin(t * 4 + x) > 0.6;
  ctx.strokeStyle = C.coral; ctx.lineWidth = 0.035;
  ctx.beginPath(); ctx.moveTo(-0.03, 0); ctx.lineTo(-0.03, -0.16); ctx.moveTo(0.05, 0); ctx.lineTo(0.05, -0.16); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -0.26, 0.24, 0.12, -0.1, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.035 });
  ctx.beginPath(); ctx.ellipse(-0.06, -0.29, 0.16, 0.065, -0.15, 0, Math.PI * 2); paint(ctx, C.grey, { stroke: false });
  const hx = pk ? 0.26 : 0.18, hy = pk ? -0.2 : -0.42;
  ctx.beginPath(); ctx.arc(hx, hy, 0.08, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.03 });
  ctx.beginPath(); ctx.moveTo(hx + 0.06, hy - 0.02); ctx.lineTo(hx + 0.2, hy + 0.01); ctx.lineTo(hx + 0.06, hy + 0.03); paint(ctx, C.mustard, { lw: 0.02 });
  ctx.restore();
}
function pigeon(ctx, x, y, z, t, ph) {
  const [X, Y] = P3(x, y, z);
  const pk = Math.sin(t * 5 + ph) > 0.4 ? 0.1 : 0;
  ctx.beginPath(); ctx.ellipse(X, Y - 0.16, 0.2, 0.11, 0, 0, Math.PI * 2); paint(ctx, C.grey, { lw: 0.03 });
  ctx.beginPath(); ctx.arc(X + 0.17, Y - 0.3 + pk, 0.08, 0, Math.PI * 2); paint(ctx, mix(C.grey, C.purple, 0.3), { lw: 0.025 });
}
// A dog, on a lead, in a raincoat when it rains.
function dog(ctx, x, y, z, t, dir, coat) {
  const [X, Y] = P3(x, y, z);
  const f = dir === 'l' ? -1 : 1, s = Math.sin(t * 12) * 0.08;
  ctx.save(); ctx.translate(X, Y); ctx.scale(f, 1);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.07; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-0.22, -0.25); ctx.lineTo(-0.22 + s, 0); ctx.moveTo(0.2, -0.25); ctx.lineTo(0.2 - s, 0); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -0.32, 0.34, 0.15, 0, 0, Math.PI * 2); paint(ctx, coat ? C.red : C.wood, { lw: 0.03 });
  ctx.beginPath(); ctx.ellipse(0.36, -0.46, 0.14, 0.11, 0, 0, Math.PI * 2); paint(ctx, C.wood, { lw: 0.03 });
  ctx.beginPath(); ctx.moveTo(-0.32, -0.36); ctx.lineTo(-0.46, -0.5 + s); ctx.strokeStyle = C.wood; ctx.lineWidth = 0.06; ctx.stroke();
  ctx.restore();
}

// ---------- Where the street's things stand ----------
const WX = ROAD.park0 + 1.1; // the west side's parked cars (their middle)
const EX = ROAD.park1 - 1.1; // the east side's
const WWALK = ROAD.walk0 + 1.7; // where people walk, the west sidewalk's curb side
const EWALK = ROAD.park1 + 0.8; // the east sidewalk
// Parked cars: [y (middle), color, extra] (clear of the chunk seams at 16, 32, 48).
const WEST = [[2.4, 0, 'mattress'], [5.6, 4], [8.8, 8, 'rack'], [24.0, 1], [27.2, 6, 'boxes'], [50.4, 7, 'rack'], [53.6, 3]];
const EAST = [[2.4, 3], [5.6, 6, 'mattress'], [8.8, 0], [26.0, 4], [29.2, 2, 'rack'], [34.2, 5], [50.4, 1], [53.6, 8, 'boxes'], [56.8, 6]];

export default {
  id: 'farragut-road',
  name: 'Farragut Road',
  blurb: 'One truck, one street built for horses, cars parked on both sides. The truck has been stuck since nine.',
  home: [22, 30],
  build(R) {
    drawLand(R, land, { fade: nightK, inks: EVENING });

    // ---------- Paint on the road ----------
    R.rug((ctx) => {
      // The double yellow, broken at East Broadway.
      for (const [a, b] of [[0.3, 10.6], [15.4, 58]]) {
        for (const dx of [-0.13, 0.05]) face(ctx, [[TX + dx, a, G + 0.01], [TX + dx + 0.08, a, G + 0.01], [TX + dx + 0.08, b, G + 0.01], [TX + dx, b, G + 0.01]], C.mustard, { stroke: false });
      }
      // A crosswalk across Farragut at the corner.
      for (let x = ROAD.park0 + 0.3; x < ROAD.park1 - 0.3; x += 0.75) face(ctx, [[x, 15.6, G + 0.01], [x + 0.38, 15.6, G + 0.01], [x + 0.38, 16.9, G + 0.01], [x, 16.9, G + 0.01]], alpha(C.white, 0.85), { stroke: false });
      // STOP at the bottom, before Day Boulevard.
      face(ctx, [[ROAD.park0 + 2.3, 57.2, G + 0.01], [TX - 0.2, 57.2, G + 0.01], [TX - 0.2, 57.5, G + 0.01], [ROAD.park0 + 2.3, 57.5, G + 0.01]], alpha(C.white, 0.85), { stroke: false });
    });
    // The wet road, darker from ten till evening, and its puddles.
    const PUDDLES = [[18.3, 12.2, 1.0], [23.6, 17.8, 0.8], [20.2, 30.6, 0.7], [25.9, 38.2, 0.6], [21.1, 45.2, 1.1], [18.4, 47.0, 0.7], [23.1, 53.8, 0.9], [19.6, 58.4, 0.8], [7.5, 13.2, 1.0], [27.4, 33.4, 0.55]];
    const wetFade = { fade: (t) => q16(wetK(t)), step: (t) => q16(wetK(t)) };
    R.rug((ctx) => {
      const road = [[ROAD.park0, 0, ROAD.park1, 60], [0, 10.8, ROAD.park0, 15.2]];
      for (const [x0, y0, x1, y1] of road) face(ctx, [[x0, y0, G + 0.005], [x1, y0, G + 0.005], [x1, y1, G + 0.005], [x0, y1, G + 0.005]], alpha(C.ink, 0.16), { stroke: false });
      for (const [x, y, r] of PUDDLES) {
        disc(ctx, x, y, G + 0.012, r, PUDDLE, { stroke: alpha(C.ink, 0.35), lw: 0.03 });
        disc(ctx, x + r * 0.5, y - r * 0.3, G + 0.013, r * 0.6, PUDDLE, { stroke: false });
        if (Q.detail) disc(ctx, x - r * 0.2, y - r * 0.2, G + 0.014, r * 0.3, alpha(C.white, 0.5), { stroke: false });
      }
    }, wetFade);
    // Rings on the puddles while it rains.
    PUDDLES.forEach(([x, y, r], j) => {
      const it = R.rug((ctx, t) => {
        if (!Q.detail) return;
        for (let i = 0; i < 2; i++) {
          const k = frac(t * 0.8 + i * 0.5 + j * 0.37);
          const a = (1 - k) * rainK(t);
          const ox = Math.sin(j * 3 + Math.floor(t * 0.8 + i * 0.5 + j * 0.37) * 1.7) * r * 0.4;
          ctx.save(); ctx.globalAlpha *= a;
          disc(ctx, x + ox, y, G + 0.02, 0.1 + k * 0.4, null, { stroke: C.white, lw: 0.03 });
          ctx.restore();
        }
      }, { anim: true, on: raining });
      it.area = [x - r - 1, y - r - 1, x + r + 1, y + r + 1];
    });

    // ---------- The rest of the row ----------
    // North of East Broadway, and south of the Grey One: printed by day and
    // again in dusk inks after dark, their windows lit on everyone's first night.
    OTHER_HOUSES.forEach((y, i) => {
      const s = SIDING.others[i];
      R.thing(ROW_X0 + 7, y + 4.5, (ctx) => house(ctx, ROW_X0, y, G, s));
      R.thing(ROW_X0 + 7.01, y + 4.5, (ctx) => house(ctx, ROW_X0, y, G, s, C.white, dusk), byNight);
      R.thing(ROW_X0 + 7.02, y + 4.5, (ctx) => { for (let f = 0; f < 3; f++) panes(ctx, ROW_X0, y, G + f * FH, { floor: f, top: f === 2 }, () => LIT); }, byNight);
      R.light({ at: [ROW_X0 + 14.6, y + 1, G + 3.1], r: 1.8, color: LIT, k: nightK });
    });
    // On the north house's porch, the old guard in a lawn chair, all day, watching.
    const oldGuard = folk(501, { hair: C.greyLight, style: 'bald', top: C.green, bottom: C.grey });
    stay(R, 14.3, 5.6, oldGuard, { z: G - 0.3, pose: 'sit', dir: 'r', hold: cupHeld, hours: between(6.5, 21), under: (ctx) => lawnChair(ctx, 14.1, 5.6, G, C.teal) });
    talk(R, 14.3, 5.6, G + 2.4, (t) => (between(6.5, 21)(t) && every(23, 3.5, 0.2)(t) ? (hh(t) < 12 ? 'I\'ve seen worse.' : hh(t) < 16 ? 'Forty-one Moving Days.' : 'Here comes the pizza.') : null));
    // South of the Grey One, a kid selling boxes on the sidewalk.
    R.thing(17.25, 51.9, (ctx) => {
      box(ctx, 16.7, 50.6, G, 0.6, 1.3, 0.75, C.woodLight, { flat: true, lw: 0.03 });
      panel(ctx, 'y', 17.31, 51.25, G + 0.45, 1.1, 0.5, C.white, { lw: 0.03 });
      lettering(ctx, 'y', 17.32, 51.25, G + 0.52, 'BOXES', 0.2, C.red, 'Bagel Fat One');
      lettering(ctx, 'y', 17.32, 51.25, G + 0.32, '50¢  (USED ONCE)', 0.1, C.ink);
      for (let i = 0; i < 4; i++) box(ctx, 16.75 + i * 0.02, 50.7, G + 0.75 + i * 0.05, 0.5, 1.1, 0.05, C.woodLight, { flat: true, lw: 0.02 });
    }, { on: between(8, 17.5) });
    stay(R, 16.2, 51.3, folk(502, { scale: 0.72 }), { scale: 0.72, dir: 'r', umb: C.pink, hours: between(8, 17.5), pose: 'stand' });
    talk(R, 16.2, 51.3, G + 2.4, (t) => (between(8, 17.5)(t) && every(17, 3, 0.6)(t) ? 'BOXES! GET YOUR BOXES!' : null));

    // ---------- The corner at East Broadway ----------
    R.thing(ROAD.walk0 + 0.4, 10.4, (ctx) => {
      pole(ctx, 15.9, 10.2, G, 3.4, LAMPPOST, 0.06);
      box(ctx, 15.2, 10.16, G + 3.05, 1.4, 0.08, 0.28, C.green, { flat: true, lw: 0.025 });
      lettering(ctx, 'x', 15.9, 10.25, G + 3.19, 'E BROADWAY', 0.14, C.white, 'Bagel Fat One');
      box(ctx, 15.86, 9.5, G + 3.35, 0.08, 1.4, 0.28, C.green, { flat: true, lw: 0.025 });
      lettering(ctx, 'y', 15.95, 10.2, G + 3.49, 'FARRAGUT RD', 0.14, C.white, 'Bagel Fat One');
    });
    // STOP at the bottom, with a sticker someone added.
    R.thing(ROAD.walk0 + 1.6, 57.6, (ctx) => {
      pole(ctx, 17.1, 57.5, G, 2.5, C.greyLight, 0.05);
      const [X, Y] = P3(17.1, 57.6, G + 2.35);
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + (i * Math.PI) / 4; ctx.lineTo(X + Math.cos(a) * 0.42, Y + Math.sin(a) * 0.42); }
      ctx.closePath(); paint(ctx, C.red, { lw: 0.035 });
      lettering(ctx, 'x', 17.1, 57.6, G + 2.36, 'STOP', 0.24, C.white, 'Bagel Fat One');
      panel(ctx, 'x', 17.1, 57.61, G + 1.78, 0.62, 0.2, C.white, { lw: 0.02 });
      lettering(ctx, 'x', 17.1, 57.62, G + 1.78, 'MOVING', 0.12, C.ink, 'Bagel Fat One');
    });

    // ---------- Streetlights ----------
    const LAMPS = [[ROAD.walk0 + 1.75, 9.4], [ROAD.walk0 + 1.75, 26.8], [ROAD.walk0 + 1.75, 46.2], [ROAD.park1 + 0.3, 3.8], [ROAD.park1 + 0.3, 17.6], [ROAD.park1 + 0.3, 31], [ROAD.park1 + 0.3, 45.4], [ROAD.park1 + 0.3, 58.4]];
    for (const [x, y] of LAMPS) {
      R.thing(x, y, (ctx) => streetlight(ctx, x, y));
      R.thing(x + 0.001, y + 0.001, (ctx) => streetlight(ctx, x, y, true), byNight);
      R.light({ at: [x, y, G + LAMP_H + 0.3], r: 3.2, color: LIT, k: nightK });
    }
    // Trees on the park side.
    for (const [y, s] of [[10.2, 0.85], [22.6, 0.8], [39.2, 0.9], [55.2, 0.85]]) {
      const x = ROAD.walk1 - 0.45;
      R.thing(x, y, (ctx) => {
        const [X, Y] = P3(x, y, G);
        ctx.save(); ctx.translate(X, Y); ctx.scale(s, s);
        ctx.beginPath(); ctx.ellipse(0, 0, 1.2, 0.5, 0, 0, Math.PI * 2); ctx.fillStyle = alpha(C.ink, 0.15); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-0.14, 0); ctx.lineTo(-0.09, -2.4); ctx.lineTo(0.09, -2.4); ctx.lineTo(0.14, 0); paint(ctx, C.brown);
        for (const [bx, by, br] of [[0, -3.4, 1.15], [-0.75, -2.8, 0.75], [0.75, -2.9, 0.8], [0.1, -4.2, 0.8]]) {
          ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2);
          paint(ctx, C.green, { dots: shade(C.green, 0.45), density: 0.28 });
        }
        ctx.restore();
      });
    }

    // ---------- Parked cars, both sides ----------
    const extras = (ctx, x, y, kind, color) => {
      if (kind === 'mattress') {
        box(ctx, x - 0.62, y - 1.05, G + 1.33, 1.24, 2.1, 0.28, C.white, { flat: true, lw: 0.03, right: tint(C.sky, 0.6), left: tint(C.sky, 0.45) });
        if (Q.detail) for (const dy of [-0.6, 0.6]) line(ctx, [[x - 0.8, y + dy, G + 0.8], [x - 0.64, y + dy, G + 1.62], [x + 0.64, y + dy, G + 1.62], [x + 0.8, y + dy, G + 0.8]], C.ink, 0.03);
      } else if (kind === 'rack') {
        carton(ctx, x - 0.5, y - 0.6, G + 1.4, 0.7, 0.6, 0.45);
        carton(ctx, x - 0.45, y + 0.05, G + 1.4, 0.6, 0.55, 0.35);
        if (Q.detail) line(ctx, [[x - 0.7, y - 0.3, G + 0.9], [x - 0.5, y - 0.3, G + 1.85], [x + 0.2, y - 0.3, G + 1.85], [x + 0.72, y - 0.3, G + 0.9]], C.coral, 0.03);
      } else if (kind === 'boxes') {
        // The hatch up, boxes to the roof.
        box(ctx, x - 0.66, y + 1.25, G + 0.82, 1.32, 0.12, 0.62, color, { flat: true, lw: 0.03 });
        carton(ctx, x - 0.55, y + 0.95, G + 0.82, 0.55, 0.42, 0.4, 'MISC');
        carton(ctx, x + 0.02, y + 0.95, G + 0.82, 0.5, 0.42, 0.5);
      }
    };
    const parked = (x, y, color, dir, kind) => {
      R.thing(x + 0.75, y + 1.4, (ctx) => { car(ctx, x, y, G, color, { dir }); if (kind) extras(ctx, x, y, kind, color); });
      R.thing(x + 0.751, y + 1.401, (ctx) => veil(ctx, carBoxes(x, y, G)), byNight);
    };
    WEST.forEach(([y, c, kind]) => parked(WX, y, CARS[c], 1, kind));
    EAST.forEach(([y, c, kind]) => parked(EX, y, CARS[c], -1, kind));

    // ---------- Nobody parks under the couch ----------
    R.thing(WX + 0.4, 21.6, (ctx) => {
      cone(ctx, WX, 18.2, G); cone(ctx, WX, 21.2, G);
      panel(ctx, 'y', WX + 0.12, 19.7, G + 0.55, 1.4, 0.5, C.woodLight, { lw: 0.03 });
      lettering(ctx, 'y', WX + 0.13, 19.7, G + 0.62, 'COUCH ZONE', 0.15, C.ink, 'Bagel Fat One');
      lettering(ctx, 'y', WX + 0.13, 19.7, G + 0.44, 'park at own risk', 0.09, C.ink);
    });

    // ---------- The Storrowed truck ----------
    // Limped over from Storrow Drive, its roof peeled like a sardine tin, a
    // sign in the window, its driver on the curb still in shock.
    const SY = 20.7, SX = EX;
    R.thing(SX + 1.2, SY + 3.5, (ctx) => {
      truck(ctx, SX, SY, G, { dir: -1, roof: 'peeled' });
      if (!Q.detail) return;
      const z = G + 3.6, y0 = SY - 3.5 + 1.9 + 0.4;
      face(ctx, [[SX - 1.1, y0, z + 0.01], [SX + 1.1, y0, z + 0.01], [SX + 1.1, y0 + 1.2, z + 0.01], [SX - 1.1, y0 + 1.2, z + 0.01]], C.ink, { lw: 0.02 });
      carton(ctx, SX - 0.8, y0 + 0.2, z - 0.25, 0.7, 0.6, 0.55);
      // A lamp shade poking out, and a plant.
      const [X, Y] = P3(SX + 0.3, y0 + 0.6, z + 0.6);
      ctx.beginPath(); ctx.moveTo(X - 0.3, Y + 0.25); ctx.lineTo(X - 0.18, Y - 0.1); ctx.lineTo(X + 0.18, Y - 0.1); ctx.lineTo(X + 0.3, Y + 0.25); ctx.closePath();
      paint(ctx, C.butter, { lw: 0.03 });
      const [X2, Y2] = P3(SX + 0.6, y0 + 0.9, z + 0.5);
      for (const [dx, dy, r] of [[0, -0.1, 0.22], [-0.18, 0.05, 0.16], [0.18, 0.05, 0.16]]) { ctx.beginPath(); ctx.arc(X2 + dx, Y2 + dy, r, 0, Math.PI * 2); paint(ctx, C.leaf, { lw: 0.025 }); }
      // The sign in the window.
      panel(ctx, 'y', SX + 1.11, SY - 3.5 + 0.95, G + 2.2, 1.15, 0.5, C.white, { lw: 0.025 });
      lettering(ctx, 'y', SX + 1.12, SY - 3.5 + 0.95, G + 2.32, 'I TOOK', 0.14, C.ink, 'Bagel Fat One');
      lettering(ctx, 'y', SX + 1.12, SY - 3.5 + 0.95, G + 2.1, 'STORROW.', 0.17, C.red, 'Bagel Fat One');
    });
    R.thing(SX + 1.21, SY + 3.51, (ctx) => veil(ctx, [[SX - 1.2, SY - 3.5, G, 2.4, 7, 3.6]]), byNight);
    // Its driver, on the curb, in a foil blanket, with an iced coffee he hasn't touched.
    const shock = folk(503, { top: C.mustard, bottom: C.navy, hair: C.brown });
    stay(R, EWALK - 0.1, 22.2, shock, { z: G - 0.5, pose: 'sit', dir: 'l', hold: cupHeld, wear: blanket, hours: between(7.5, 20) });
    talk(R, EWALK - 0.1, 22.2, G + 1.9, (t) => (between(7.5, 20)(t) && every(19, 3.2, 0.4)(t) ? (frac(t / 38) < 0.5 ? 'Nobody mentioned bridges.' : 'It was a shortcut.') : null));
    // Someone taking its picture.
    stay(R, EWALK + 0.2, 18.4, folk(504, { top: C.pink }), { pose: 'point', dir: 'l', back: true, hold: phoneHeld, hours: (t) => between(9, 11.5)(t) || between(16, 18.5)(t), umb: C.purple });
    // A cat asleep on its warm hood at night.
    R.thing(SX + 0.2, 17.4, (ctx) => {
      const [X, Y] = P3(SX + 0.2, 17.6, G + 1.55);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.34, 0.16, 0, 0, Math.PI * 2); paint(ctx, C.ink, { lw: 0.02 });
      ctx.beginPath(); ctx.arc(X + 0.28, Y - 0.1, 0.12, 0, Math.PI * 2); paint(ctx, C.ink, { stroke: false });
    }, { on: between(21, 5) });

    // ---------- The curb pile, in front of the Yellow House ----------
    // Put out one piece at a time all morning; carried up the Yellow House
    // one piece at a time from CURB's hours (the curb collector, day.js).
    const out = (from, until) => (t) => { const x = hour(t); return x >= from && x < until; };
    const PX = ROAD.walk0 + 0.3;
    R.thing(PX + 1.1, 31.1, (ctx) => {
      box(ctx, PX + 0.05, 29.0, G + 0.1, 1.05, 2.1, 0.4, C.purple, { lw: 0.035 });
      box(ctx, PX + 0.05, 29.0, G + 0.5, 0.35, 2.1, 0.55, shade(C.purple, 0.05), { lw: 0.035 });
      for (const y of [29, 30.8]) box(ctx, PX + 0.05, y, G + 0.5, 1.05, 0.3, 0.32, C.purple, { flat: true, lw: 0.03 });
      if (Q.detail) { for (const y of [29.1, 30.9]) box(ctx, PX + 0.15, y, G, 0.12, 0.12, 0.1, C.brown, { flat: true, lw: 0.02 }); }
      panel(ctx, 'y', PX + 1.11, 30.05, G + 0.35, 0.8, 0.36, C.woodLight, { lw: 0.025 });
      lettering(ctx, 'y', PX + 1.12, 30.05, G + 0.35, 'FREE', 0.2, C.red, 'Bagel Fat One');
    }, { on: out(8, CURB[0]) });
    R.thing(PX + 0.9, 33.4, (ctx) => {
      box(ctx, PX + 0.1, 32.4, G, 0.8, 1.0, 1.35, C.wood, { lw: 0.035, dens: 0.14 });
      for (let i = 0; i < 3; i++) {
        face(ctx, [[PX + 0.9, 32.5, G + 0.2 + i * 0.4], [PX + 0.9, 33.3, G + 0.2 + i * 0.4], [PX + 0.9, 33.3, G + 0.5 + i * 0.4], [PX + 0.9, 32.5, G + 0.5 + i * 0.4]], tint(C.wood, 0.15), { lw: 0.025 });
        if (Q.detail) box(ctx, PX + 0.9, 32.85, G + 0.32 + i * 0.4, 0.04, 0.1, 0.06, C.butter, { flat: true, stroke: false });
      }
    }, { on: out(8.8, CURB[1]) });
    R.thing(PX + 0.9, 34.4, (ctx) => {
      // An old TV, the deep kind.
      box(ctx, PX + 0.15, 33.7, G, 0.75, 0.7, 0.62, C.grey, { lw: 0.03, dens: 0.14 });
      face(ctx, [[PX + 0.9, 33.78, G + 0.1], [PX + 0.9, 34.32, G + 0.1], [PX + 0.9, 34.32, G + 0.52], [PX + 0.9, 33.78, G + 0.52]], shade(C.teal, 0.35), { lw: 0.025 });
      if (Q.detail) line(ctx, [[PX + 0.5, 34.0, G + 0.62], [PX + 0.4, 33.8, G + 1.1]], C.ink, 0.025), line(ctx, [[PX + 0.5, 34.1, G + 0.62], [PX + 0.6, 34.35, G + 1.05]], C.ink, 0.025);
    }, { on: out(9.6, CURB[2]) });
    R.thing(PX + 0.6, 34.95, (ctx) => {
      // The lamp, with no shade (it turns up on the third floor tonight).
      box(ctx, PX + 0.3, 34.65, G, 0.4, 0.4, 0.08, C.mustard, { flat: true, lw: 0.025 });
      pole(ctx, PX + 0.5, 34.85, G + 0.08, 1.9, C.mustard, 0.04);
      const [X, Y] = P3(PX + 0.5, 34.85, G + 2.05);
      ctx.beginPath(); ctx.arc(X, Y, 0.13, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.025 });
    }, { on: out(10.4, CURB[3]) });
    // Boxes marked FREE (the bottom one soggy).
    R.thing(PX + 1.1, 32.2, (ctx) => { carton(ctx, PX + 0.4, 31.45, G, 0.7, 0.6, 0.45, 'FREE'); carton(ctx, PX + 0.45, 31.5, G + 0.45, 0.55, 0.5, 0.35); }, { on: out(8.4, 17) });
    // The tarp, over what's left while it rains.
    R.thing(PX + 1.2, 35.4, (ctx) => {
      const x0 = PX, x1 = PX + 1.15, y0 = 32.2, y1 = 35.3, top = G + 1.5;
      face(ctx, [[x1, y0, G], [x1, y1, G], [x1, y1, top - 0.15], [x1, (y0 + y1) / 2, top - 0.35], [x1, y0, top]], TARP, { lw: 0.035, dots: shade(TARP, 0.4), density: 0.12 });
      face(ctx, [[x0, y1, G + 0.1], [x1, y1, G], [x1, y1, top - 0.15], [x0, y1, top - 0.3]], shade(TARP, 0.2), { lw: 0.035 });
      face(ctx, [[x0, y0, top - 0.1], [x1, y0, top], [x1, (y0 + y1) / 2, top - 0.35], [x1, y1, top - 0.15], [x0, y1, top - 0.3], [x0, (y0 + y1) / 2, top - 0.3]], tint(TARP, 0.15), { lw: 0.035 });
      if (Q.detail) for (const y of [y0 + 0.1, y1 - 0.1]) disc(ctx, x1 + 0.02, y, G + 0.3, 0.05, C.white, { lw: 0.015 });
    }, { on: (t) => raining(t) && hour(t) < CURB[1] });
    // The mattress, in its bag. It stays. It always stays.
    const MY = 35.2;
    R.thing(PX + 0.1, MY + 2.25, (ctx) => {
      mattress(ctx, PX - 0.05, MY, G);
      box(ctx, PX + 0.32, MY + 0.2, G, 0.06, 0.8, 0.45, C.woodLight, { flat: true, lw: 0.025 });
    });
    const lateSign = (late) => (ctx) => {
      panel(ctx, 'y', PX + 0.34, MY + 1.1, G + 1.0, 0.95, 0.4, C.white, { lw: 0.025 });
      lettering(ctx, 'y', PX + 0.35, MY + 1.1, G + 1.0, late ? 'STILL FREE' : 'FREE', late ? 0.15 : 0.24, C.red, 'Bagel Fat One');
    };
    R.thing(PX + 0.35, MY + 1.3, lateSign(false), { on: (t) => hh(t) < 18 });
    R.thing(PX + 0.35, MY + 1.3, lateSign(true), { on: (t) => hh(t) >= 18 });
    // Its tag: DO NOT REMOVE (a find).
    const TAG = [PX + 0.4, MY + 1.85, G + 0.42];
    R.thing(TAG[0], TAG[1] + 0.1, (ctx) => {
      line(ctx, [[PX + 0.3, TAG[1] - 0.1, G + 0.7], [TAG[0], TAG[1], TAG[2] + 0.2]], C.ink, 0.025);
      panel(ctx, 'y', TAG[0], TAG[1], TAG[2], 0.5, 0.36, C.white, { lw: 0.03 });
      lettering(ctx, 'y', TAG[0] + 0.01, TAG[1], TAG[2] + 0.08, 'DO NOT', 0.08, C.red, 'Bagel Fat One');
      lettering(ctx, 'y', TAG[0] + 0.01, TAG[1], TAG[2] - 0.05, 'REMOVE', 0.08, C.red, 'Bagel Fat One');
      if (Q.detail) for (let i = 0; i < 2; i++) face(ctx, [[TAG[0] + 0.01, TAG[1] - 0.18, TAG[2] - 0.12 - i * 0.04], [TAG[0] + 0.01, TAG[1] + 0.18, TAG[2] - 0.12 - i * 0.04], [TAG[0] + 0.01, TAG[1] + 0.18, TAG[2] - 0.13 - i * 0.04], [TAG[0] + 0.01, TAG[1] - 0.18, TAG[2] - 0.13 - i * 0.04]], C.ink, { stroke: false });
    });
    R.find({ id: 'tag', label: 'A mattress tag', at: TAG, r: 0.85 });
    // Pigeons working the curb.
    R.thing(ROAD.walk0 + 1.6, 31.6, (ctx, t) => { for (const [x, y, ph] of [[16.9, 31.2, 0], [17.2, 31.9, 1.7], [16.8, 32.6, 3.1]]) pigeon(ctx, x, y, G, t, ph); }, { anim: true, on: (t) => hour(t) >= 7 && hour(t) < 19 && !raining(t) });
    // Bins at the gaps, overflowing on Moving Day; a cat on one.
    R.thing(16.3, 27.2, (ctx) => {
      barrel(ctx, 15.9, 26.2, C.grey);
      barrel(ctx, 15.9, 26.95, BIN, false);
      for (let i = 0; i < 3; i++) box(ctx, 15.62 + i * 0.05, 26.7, G + 1.0 + i * 0.1, 0.55, 0.55, 0.06, C.woodLight, { flat: true, lw: 0.02 });
    });
    R.thing(15.95, 26.25, (ctx, t) => {
      const [X, Y] = P3(15.9, 26.2, G + 1.08);
      ctx.beginPath(); ctx.ellipse(X, Y - 0.2, 0.22, 0.2, 0, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.025 });
      ctx.beginPath(); ctx.arc(X + 0.1, Y - 0.48, 0.13, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.025 });
      ctx.beginPath(); ctx.moveTo(X - 0.18, Y - 0.05); ctx.quadraticCurveTo(X - 0.45, Y - 0.1 + Math.sin(t * 2) * 0.15, X - 0.4, Y - 0.4); ctx.strokeStyle = C.mustard; ctx.lineWidth = 0.06; ctx.stroke();
    }, { anim: true, on: (t) => !raining(t) });
    R.thing(16.6, 47.6, (ctx) => {
      barrel(ctx, 15.9, 47.0, BIN); barrel(ctx, 16.6, 47.0, BIN);
      // The Grey One's boxes, flattened and tied, matching.
      box(ctx, 15.7, 45.6, G, 1.2, 0.35, 0.9, C.woodLight, { flat: true, lw: 0.03 });
      if (Q.detail) line(ctx, [[15.7, 45.95, G + 0.45], [16.9, 45.95, G + 0.45]], C.white, 0.03);
    });

    // ---------- The couch on the rope ----------
    R.thing(PULLEY[0] + 0.5, PULLEY[1], (ctx) => {
      box(ctx, ROW_X0 + 15, PULLEY[1] - 0.1, PULLEY[2] + 0.2, PULLEY[0] - ROW_X0 - 14.8, 0.2, 0.2, C.wood, { flat: true, lw: 0.03 });
      const [X, Y] = P3(PULLEY[0], PULLEY[1], PULLEY[2]);
      ctx.beginPath(); ctx.arc(X, Y, 0.2, 0, Math.PI * 2); paint(ctx, C.greyLight, { lw: 0.03 });
    }, { on: (t) => couchZ(t) != null || (hour(t) >= 8.5 && hour(t) < 9) });
    // The rope comes down to the sling, and the couch sways under it. A man
    // on the sidewalk steadies it with a guide rope some of the day.
    const guide = (t) => { const hr = hour(t); return (hr >= 9.3 && hr < 11.9) || (hr >= 13.2 && hr < 18.5); };
    const GUIDE = [WX + 0.3, COUCH[1] + COUCH_D + 1.3];
    R.mover((t) => {
      const z = couchZ(t);
      if (z == null) return HIDE;
      const sw = playing() ? 0 : 0.14 * Math.sin(t * 0.9) * (guide(t) ? 0.4 : 1);
      const x = COUCH[0] - 0.9 * beat(HAUL);
      return { x: x + COUCH_W + sw, y: COUCH[1] + COUCH_D, z, sw, cx: x };
    }, (ctx, t, p) => {
      if (p.hide) return;
      const x = p.cx + p.sw, y = COUCH[1], z = p.z;
      // Its shadow on the sidewalk while it's low.
      if (z < G + 3 && Q.detail) { ctx.save(); ctx.globalAlpha *= 0.15; disc(ctx, x + 0.8, y + 1.2, G + 0.01, 1.1, C.ink, { stroke: false }); ctx.restore(); }
      const hook = [x + COUCH_W / 2, y + COUCH_D / 2, z + 2.2];
      line(ctx, [PULLEY, hook], shade(C.woodLight, 0.2), 0.06);
      couchArt(ctx, x, y, z);
      // The sling: two straps under it, up to the hook.
      for (const dy of [0.45, COUCH_D - 0.45]) {
        line(ctx, [[x - 0.05, y + dy, z + 1.05], [x - 0.05, y + dy, z], [x + COUCH_W + 0.05, y + dy, z], [x + COUCH_W + 0.05, y + dy, z + 0.66]], INK.truck, 0.07);
        line(ctx, [[x + COUCH_W + 0.05, y + dy, z + 0.66], hook], INK.truck, 0.05);
      }
      line(ctx, [[x, y + 0.45, z + 1.05], hook], INK.truck, 0.05);
      line(ctx, [[x, y + COUCH_D - 0.45, z + 1.05], hook], INK.truck, 0.05);
      disc(ctx, hook[0], hook[1], hook[2], 0.08, C.grey, { lw: 0.02 });
      if (guide(t) && !playing()) line(ctx, [[x + COUCH_W, y + COUCH_D - 0.1, z + 0.2], [GUIDE[0] + 0.35, GUIDE[1] - 0.1, G + 1.5]], shade(C.woodLight, 0.2), 0.04);
      // Wet: it drips.
      if (raining(t) && Q.detail && z > G + 2) {
        for (let i = 0; i < 3; i++) {
          const k = frac(t * 1.1 + i / 3);
          disc(ctx, x + 0.3 + i * 0.45, y + 0.6 + i * 0.5, z - k * (z - G), 0.05, alpha(C.sky, 1 - k), { stroke: false });
        }
      }
    }, { bias: 0.5 });
    const guy = folk(505, { top: C.mustard, bottom: C.navy, hat: 'helmet' });
    stay(R, GUIDE[0], GUIDE[1], guy, { dir: 'r', back: true, arms: [2.1, 1.7], hours: guide });
    talk(R, GUIDE[0], GUIDE[1], G + 3, (t) => (guide(t) && every(13, 2.6, 0.1)(t) ? (frac(t / 26) < 0.5 ? 'YOUR LEFT!' : 'NO, YOUR OTHER LEFT!') : null));

    // ---------- NO PARKING, MOVING DAY ----------
    for (const [x, y] of [[ROAD.walk0 + 1.75, 39.2], [ROAD.walk0 + 1.75, 45.4], [ROAD.park1 + 0.3, 48.9], [ROAD.park1 + 0.3, 58.0]]) R.thing(x, y + 0.1, (ctx) => noParking(ctx, x, y));
    R.thing(ROAD.park1 + 0.35, 46.1, (ctx) => goosePoster(ctx, ROAD.park1 + 0.35, 46));

    // ---------- The truck ----------
    R.mover((t) => { const b = truckBack(t); return b == null ? HIDE : { x: TX + 1.2, y: b + TRUCK_L, b }; }, (ctx, t, p) => {
      if (p.hide) return;
      const front = p.y;
      const a = clamp01(front / 6) * clamp01((64 - front) / 5);
      if (a <= 0.01) return;
      const hr = hh(t);
      // Now and then it tries: a little shove forward, a little back.
      const tries = stuck(t) && every(9, 1.2, 0.15)(t);
      const wig = tries ? Math.sin(t * 18) * 0.05 : 0;
      ctx.save(); ctx.globalAlpha *= a;
      truck(ctx, TX, p.b + TRUCK_L / 2 + wig, G, { dir: 1 });
      // Its one side mirror (the other's in the road), and the driver.
      box(ctx, TX + 1.2, front - 1.55 + wig, G + 1.9, 0.14, 0.12, 0.08, C.ink, { flat: true, stroke: false });
      box(ctx, TX + 1.3, front - 1.6 + wig, G + 1.75, 0.08, 0.28, 0.55, C.ink, { flat: true, lw: 0.02 });
      const [HX, HY] = P3(TX - 0.45, front - 0.3 + wig, G + 2.15);
      ctx.beginPath(); ctx.arc(HX, HY, 0.26, 0, Math.PI * 2); paint(ctx, mix(C.brown, C.woodLight, 0.6), { lw: 0.03 });
      ctx.beginPath(); ctx.arc(HX, HY - 0.05, 0.28, Math.PI * 1.05, Math.PI * 1.95); paint(ctx, C.red, { stroke: false });
      // Hazards while it's stuck.
      if (stuck(t) && frac(t * 1.2) < 0.5 && Q.detail) {
        for (const y of [front - 0.05, p.b + 0.05]) disc(ctx, TX + 1.15, y, G + 0.7, 0.12, C.mustard, { lw: 0.02 });
      }
      ctx.restore();
      if (!Q.detail) return;
      const say = stuck(t) && every(7.1, 1.6, 0.55)(t) ? (frac(t / 14.2) < 0.5 ? 'SORRY!' : 'IS THIS A STREET?') : hr >= 15.28 && hr < 15.55 ? 'THANK YOU!' : null;
      if (say) speech(ctx, TX, front - 1, G + 4.6, say, { size: 0.5 });
    });
    // The snapped-off side mirror, in the road where the truck clipped it.
    const MIRROR = [ROAD.lane0 + 0.55, 29.6, G];
    R.thing(MIRROR[0] + 0.4, MIRROR[1] + 0.3, (ctx) => {
      const [x, y, z] = MIRROR;
      if (Q.detail) { ctx.save(); ctx.globalAlpha *= 0.18; disc(ctx, x, y, z + 0.005, 0.5, C.ink, { stroke: false }); ctx.restore(); }
      box(ctx, x - 0.18, y - 0.4, z, 0.36, 0.8, 0.22, C.black, { flat: true, lw: 0.03, top: shade(C.black, 0.1) });
      face(ctx, [[x + 0.19, y - 0.34, z + 0.03], [x + 0.19, y + 0.34, z + 0.03], [x + 0.19, y + 0.34, z + 0.2], [x + 0.19, y - 0.34, z + 0.2]], tint(C.sky, 0.3), { lw: 0.02 });
      // The bracket arm, bent, and a wire.
      box(ctx, x - 0.05, y - 0.62, z + 0.05, 0.08, 0.3, 0.08, C.grey, { flat: true, lw: 0.02 });
      if (Q.detail) {
        line(ctx, [[x + 0.19, y - 0.2, z + 0.18], [x + 0.19, y + 0.05, z + 0.06], [x + 0.19, y + 0.2, z + 0.16]], C.white, 0.02);
        line(ctx, [[x, y - 0.6, z + 0.1], [x + 0.25, y - 0.8, z + 0.02], [x + 0.1, y - 0.95, z + 0.01]], C.red, 0.025);
      }
    });
    R.find({ id: 'mirror', label: 'A snapped-off side mirror', at: [MIRROR[0], MIRROR[1], G + 0.15], r: 0.9 });

    // The car in the way, and the ticket it got at 8:20.
    R.mover((t) => { const b = bounce(t); return { x: BLOCK.x + b.dx + 0.75, y: BLOCK.y + 1.4, b }; }, (ctx, t, p) => {
      const { dx, z } = p.b, hr = hh(t);
      const x = BLOCK.x + dx;
      if (z > 0.02 && Q.detail) { ctx.save(); ctx.globalAlpha *= 0.2; disc(ctx, x, BLOCK.y, G + 0.01, 1.1, C.ink, { stroke: false }); ctx.restore(); }
      car(ctx, x, BLOCK.y, G + z, C.teal, { dir: 1, ticket: hr >= 8.35 });
      if (hr >= 8.35 && Q.detail) box(ctx, x + 0.25, BLOCK.y + 0.3, G + z + 0.84, 0.45, 0.3, 0.02, INK.truck, { flat: true, lw: 0.02 });
      const n = nightK(t);
      if (n > 0.02) { ctx.save(); ctx.globalAlpha *= q8(n); veil(ctx, carBoxes(x, BLOCK.y, G + z)); ctx.restore(); }
    });
    // The pickup, double-parked across from it, its owner in a recliner in
    // the bed, watching. (The space beside it is saved: a lawn chair.)
    const PU = [ROAD.lane1 - 0.32, 36.6];
    const pickupOn = between(8.3, 16.4);
    R.thing(PU[0] + 0.8, PU[1] + 4.4, (ctx) => {
      pickup(ctx, PU[0], PU[1], G, C.red);
      const bx = PU[0] - 0.5, by = PU[1] + 2.2;
      box(ctx, bx, by, G + 0.92, 1.0, 1.0, 0.45, RECLINER, { lw: 0.03 });
      box(ctx, bx, by - 0.1, G + 1.37, 1.0, 0.3, 0.8, RECLINER, { lw: 0.03 });
      // A can of Gander Cola in the cupholder.
      box(ctx, bx + 0.82, by + 0.72, G + 1.37, 0.14, 0.14, 0.22, BRAND.can, { flat: true, lw: 0.02 });
      if (Q.detail) box(ctx, bx + 0.82, by + 0.72, G + 1.47, 0.14, 0.14, 0.05, BRAND.ink, { flat: true, stroke: false });
    }, { on: pickupOn });
    R.thing(PU[0] + 0.81, PU[1] + 4.41, (ctx) => veil(ctx, [[PU[0] - 0.8, PU[1], G, 1.6, 4.4, 1.5]]), { ...byNight, on: pickupOn });
    stay(R, PU[0] + 0.1, PU[1] + 2.9, folk(506, { top: C.navy, bottom: C.grey, hat: 'cap' }), { z: G + 0.45, pose: 'sit', dir: 'l', hold: cupHeld, hours: pickupOn, umb: C.mustard, depth: PU[0] + PU[1] + 5.3 });
    talk(R, PU[0] + 0.1, PU[1] + 2.9, G + 3.1, (t) => (stuck(t) && every(11, 2.4, 0.7)(t) ? (frac(t / 22) < 0.5 ? 'Take your time.' : 'Almost. Almost.') : null));
    // The lawn chair, saving a space. In September.
    const CHAIR = [EX + 0.05, 39];
    R.thing(CHAIR[0] + 0.4, CHAIR[1] + 0.4, (ctx) => {
      lawnChair(ctx, CHAIR[0], CHAIR[1], G, C.coral, { face: -1 });
      cone(ctx, EX - 0.2, 37.2, G);
    });
    R.find({ id: 'chair', label: 'A lawn chair saving a space', at: [CHAIR[0], CHAIR[1], G + 0.6], r: 0.9 });
    R.thing(EWALK, 40.9, (ctx) => hydrant(ctx, EWALK - 0.2, 40.8));
    // The Courier's van, double-parked in all but name.
    const VX = EX + 0.3;
    R.thing(VX + 0.9, 44.6, (ctx) => van(ctx, VX, 41.2, G));
    R.thing(VX + 0.91, 44.61, (ctx) => veil(ctx, [[VX - 0.9, 41.2, G, 1.8, 3.4, 2.5]]), byNight);
    R.thing(VX + 0.95, 44.7, (ctx, t) => { if (frac(t * 1.2) < 0.5) for (const x of [VX - 0.8, VX + 0.8]) disc(ctx, x, 44.66, G + 0.75, 0.1, C.mustard, { lw: 0.02 }); }, { anim: true });

    // ---------- The queue, honking ----------
    QUEUE.forEach((q, i) => {
      const [, , color, , , along] = q;
      const X = along === 'x';
      R.mover((t) => { const p = queuePos(q, t); return p ? { ...p, x: p.x + (X ? 1.4 : 0.75), y: p.y + (X ? 0.75 : 1.4), cx: p.x, cy: p.y } : HIDE; }, (ctx, t, p) => {
        if (p.hide) return;
        const a = X ? clamp01((p.cx + 1) / 4) * clamp01((28 - p.cx) / 2) : clamp01((p.cy + 2) / 4) * clamp01((62 - p.cy) / 4);
        if (a <= 0.01) return;
        ctx.save(); ctx.globalAlpha *= a;
        car(ctx, p.cx, p.cy, G, color, { dir: 1, along: X ? 'x' : undefined });
        // The driver.
        const [HX, HY] = X ? P3(p.cx + 0.55, p.cy + 0.25, G + 1.02) : P3(p.cx - 0.3, p.cy + 0.55, G + 1.02);
        ctx.beginPath(); ctx.arc(HX, HY, 0.19, 0, Math.PI * 2); paint(ctx, mix(C.woodLight, C.brown, (i % 3) * 0.3), { lw: 0.025 });
        ctx.beginPath(); ctx.arc(HX, HY - 0.04, 0.2, Math.PI * 1.05, Math.PI * 1.95); paint(ctx, [C.ink, C.mustard, C.brown, C.grey][i], { stroke: false });
        ctx.restore();
        if (p.still && Q.detail && honking(i)(t)) speech(ctx, p.cx, p.cy, G + 2.1, ['HONK', 'HONK HONK', 'C\'MON!', 'BEEP'][i], { size: 0.46, fill: i === 2 ? C.butter : C.white });
      });
    });

    // ---------- The goose, in the other lane, honking along ----------
    const GX = ROAD.lane1 - 0.85;
    R.goose((t) => {
      const k = frac(t / 34), y = 25.8 + 3.8 * (k < 0.5 ? smooth(k * 2) : 1 - smooth(k * 2 - 1));
      const moving = Math.abs(k - 0.25) < 0.2 || Math.abs(k - 0.75) < 0.2;
      const honk = stuck(t) && frac(t / 5.3 + 0.9) < 0.2;
      const night = nightK(t) > 0.6;
      return { x: GX, y, z: G, dir: k < 0.5 ? 'l' : 'r', pose: night ? 'sit' : honk ? 'honk' : moving ? 'walk' : 'stand', moving };
    });

    // ---------- 3pm: six neighbors bounce the car ----------
    const HELP = [
      [[-0.5, -1.95], [17.1, 38.0], folk(511, { top: C.coral })],
      [[0.05, -1.95], [16.9, 39.0], folk(512, { top: C.white, dress: true })],
      [[0.55, -1.95], [17.2, 37.2], folk(513, { top: C.green, hat: 'beanie' })],
      [[-0.5, 1.95], [16.9, 46.4], folk(514, { top: C.purple })],
      [[0.05, 1.95], [16.7, 47.4], folk(515, { top: C.teal, hat: 'cap' })],
      [[0.55, 1.95], [16.9, 48.6], folk(516, { top: C.pink })],
    ];
    HELP.forEach(([[ox, oy], [sx, sy], look], i) => {
      const back = oy < 0; // at the back end, facing south
      R.mover((t) => {
        const hr = hh(t);
        if (hr < 14.7 || hr > 15.8) return HIDE;
        const b = bounce(t);
        const px = BLOCK.x + b.dx + ox, py = BLOCK.y + oy;
        if (hr < 14.95) { const k = (hr - 14.7) / 0.25; return { x: sx + (px - sx) * k, y: sy + (py - sy) * k, pose: 'walk', dir: back ? 'l' : 'r', back: !back }; }
        if (hr < 15) return { x: px, y: py, pose: 'stand', dir: back ? 'l' : 'r', back: !back, arms: [1.2, 1.2] };
        if (hr < 15.3) return { x: px, y: py, z: b.z * 0.4, pose: 'stand', dir: back ? 'l' : 'r', back: !back, arms: [1.1 + b.z * 2.5, 1.1 + b.z * 2.5], hop: b };
        if (hr < 15.52) return { x: px, y: py, pose: 'cheer', dir: back ? 'l' : 'r', back: false };
        const k = (hr - 15.52) / 0.28;
        return { x: px + (sx - px) * k, y: py + (sy - py) * k, pose: 'walk', dir: sy > py ? 'l' : 'r', back: sy < py };
      }, (ctx, t, p) => {
        if (p.hide) return;
        person(ctx, p.x, p.y, G + (p.z || 0), { ...look, pose: p.pose, dir: p.dir, back: p.back, ...(p.arms ? { arms: p.arms } : {}) }, t);
        if (!Q.detail) return;
        if (p.hop && p.hop.f < 0.6 && (i === 1 || i === 4) && (p.hop.i % 2 === (i === 1 ? 0 : 1))) speech(ctx, p.x, p.y, G + 3.1, i === 1 ? 'HEAVE!' : 'HO!', { size: 0.5 });
        if (p.pose === 'cheer' && i === 2) speech(ctx, p.x, p.y, G + 3.1, 'YAAAY!', { size: 0.5 });
      });
    });

    // ---------- Noon: the car's owner comes back, looks, walks off ----------
    walker(R, [
      [11.75, WWALK, 23.4], [12.05, WWALK + 0.1, 39.6], [12.12, WX - 0.3, 40.3, { dir: 'l', say: 'Huh.' }],
      [12.3, WX - 0.3, 40.3, { dir: 'l', say: 'Nope.' }], [12.38, WX - 0.3, 40.3], [12.66, WWALK, 26.8], [12.82, 13.8, 26.8],
    ], folk(520, { top: C.teal, bottom: C.ink }), { hold: cupHeld, umb: C.navy });
    // 8:05: a parking officer writes it up.
    walker(R, [
      [7.85, WWALK, 52], [8.05, WX - 0.95, 43.2], [8.1, WX - 0.95, 43.2, { dir: 'r', pose: 'read', hold: clipboardHeld }],
      [8.35, WX - 0.95, 43.2, { dir: 'r', say: 'Moving Day special.' }], [8.45, WX - 0.95, 43.2], [8.7, WWALK, 52.5],
    ], folk(521, { top: C.navy, bottom: C.navy, hat: 'cap' }));
    // 7am: the coffee run, a tray of four, across the road to the row.
    walker(R, [
      [7.05, EWALK, 0.6], [7.72, EWALK, 26.8], [7.92, WWALK, 26.8], [8.0, WWALK, 26.8, { dir: 'l', say: 'Who ordered oat?' }],
      [8.35, WWALK, 26.8], [8.5, 13.6, 26.8],
    ], folk(522, { top: C.coral, style: 'curly' }), { hold: trayHeld });

    // ---------- People up and down the sidewalks ----------
    // A dog walker, all day on the park side; both in raincoats in the rain.
    {
      const lead = folk(523, { top: C.green, bottom: C.navy });
      const span = 50 / 1.0; // seconds each way
      R.mover((t) => {
        if (!between(6.5, 20.5)(t)) return HIDE;
        const k = frac(t / (span * 2)), fwd = k < 0.5, u = fwd ? k * 2 : 2 - k * 2;
        return { x: EWALK + 0.35, y: 3 + 52 * u, dir: fwd ? 'l' : 'r', back: !fwd };
      }, (ctx, t, p) => {
        if (p.hide) return;
        const dy = p.dir === 'l' ? 1.3 : -1.3;
        const wet = raining(t);
        line(ctx, [[p.x, p.y, G + 1.3], [p.x + 0.1, p.y + dy, G + 0.45]], C.red, 0.03);
        dog(ctx, p.x + 0.1, p.y + dy, G, t, p.dir, wet);
        person(ctx, p.x, p.y, G, { ...lead, pose: 'walk', dir: p.dir, back: p.back }, t);
        if (wet) umbrella(ctx, p.x, p.y, G, C.teal, Math.sin(t * 7) * 0.04);
      });
    }
    // In the rain, a mattress carried as an umbrella.
    {
      const look = folk(524, { top: C.purple, bottom: C.ink });
      R.mover((t) => {
        if (rainK(t) < 0.25) return HIDE;
        const k = frac(t / 44), fwd = k < 0.5, u = fwd ? k * 2 : 2 - k * 2;
        return { x: EWALK - 0.3, y: 27 + 21 * u, dir: fwd ? 'l' : 'r', back: !fwd };
      }, (ctx, t, p) => {
        if (p.hide) return;
        person(ctx, p.x, p.y, G, { ...look, pose: 'walk', dir: p.dir, back: p.back, arms: [Math.PI - 0.35, -Math.PI + 0.35] }, t);
        const bob = Math.abs(Math.sin(t * 7)) * 0.05;
        box(ctx, p.x - 0.7, p.y - 1.2, G + 2.45 + bob, 1.4, 2.4, 0.3, C.white, { flat: true, lw: 0.035, right: tint(C.sky, 0.6), left: tint(C.sky, 0.45), top: tint(C.sky, 0.75) });
        if (Q.detail) for (let i = 0; i < 3; i++) { const k = frac(t * 1.4 + i / 3); disc(ctx, p.x + 0.7, p.y - 0.8 + i * 0.8, G + 2.4 - k * 2.4, 0.04, alpha(C.sky, 1 - k), { stroke: false }); }
      });
    }
    // Iced coffees in everyone's hands: a pair on the east sidewalk, watching.
    stay(R, EWALK + 0.4, 35.2, folk(525, { top: C.butter }), { dir: 'l', back: true, hold: cupHeld, hours: between(8.5, 17), umb: C.coral });
    stay(R, EWALK + 0.5, 36.3, folk(526, { top: C.navy, style: 'long' }), { dir: 'l', back: true, hold: cupHeld, hours: between(9, 17.5), umb: C.pink, pose: 'point' });
    talk(R, EWALK + 0.5, 36.3, G + 3.2, (t) => (stuck(t) && every(15, 2.6, 0.35)(t) ? 'Pivot it!' : null));

    // ---------- The shore road and the sea wall ----------
    const WY = SHORE_Y;
    for (const [a, b] of [[0, 15.95], [16.05, ROAD.walk1]]) {
      R.thing(b, WY + 0.2, (ctx) => {
        face(ctx, [[a, WY + 0.1, 0], [b, WY + 0.1, 0], [b, WY + 0.1, G + 0.8], [a, WY + 0.1, G + 0.8]], shade(GRANITE, 0.2), { lw: 0.035, dots: shade(GRANITE, 0.5), density: 0.2 });
        box(ctx, a, WY - 0.35, G, b - a, 0.45, 0.8, GRANITE, { lw: 0.035, flat: true, top: tint(GRANITE, 0.2) });
        if (Q.detail) {
          ctx.save(); ctx.globalAlpha *= 0.35;
          for (let x = a + 1.3; x < b - 0.2; x += 1.3) line(ctx, [[x, WY + 0.1, 0], [x, WY + 0.1, G + 0.8]], C.ink, 0.025);
          line(ctx, [[a, WY + 0.1, G * 0.5], [b, WY + 0.1, G * 0.5]], C.ink, 0.025);
          ctx.restore();
        }
      });
    }
    R.thing(6.2, WY - 0.9, (ctx) => bench(ctx, 4.5, WY - 1.5));
    R.thing(22.2, WY - 0.9, (ctx) => bench(ctx, 20.5, WY - 1.5));
    R.thing(12.5, WY - 0.8, (ctx) => streetlight(ctx, 12.5, WY - 0.85));
    R.thing(12.501, WY - 0.799, (ctx) => streetlight(ctx, 12.5, WY - 0.85, true), byNight);
    R.light({ at: [12.5, WY - 0.85, G + LAMP_H + 0.3], r: 3, color: LIT, k: nightK });
    // A man fishing off the wall, rain or shine, and his gulls.
    const fisher = folk(530, { top: C.mustard, bottom: C.navy, hat: 'sun' });
    stay(R, 9.2, WY - 0.75, fisher, { dir: 'l', arms: [1.7, 1.2], hours: between(5.5, 20.5) });
    R.thing(9.4, WY - 0.3, (ctx, t) => {
      const tip = [9.5, WY + 1.8, G + 3.0 + Math.sin(t * 1.5) * 0.08];
      line(ctx, [[9.3, WY - 0.6, G + 1.5], tip], C.ink, 0.04);
      if (Q.detail) line(ctx, [tip, [9.6, WY + 3.2, 0.02]], alpha(C.ink, 0.6), 0.015);
      box(ctx, 8.4, WY - 0.9, G, 0.4, 0.4, 0.45, C.white, { flat: true, lw: 0.025 });
    }, { anim: true, on: between(5.5, 20.5) });
    R.thing(15, WY - 0.1, (ctx, t) => { gullStand(ctx, 14.4, WY - 0.12, G + 0.8, t, true, 1); gullStand(ctx, 17.8, WY - 0.12, G + 0.8, t, false, -1); }, { anim: true });
    // A jogger along the shore, all day.
    {
      const look = folk(531, { top: C.pink, bottom: C.ink, style: 'pony' });
      R.mover((t) => {
        if (!between(6, 19.5)(t)) return HIDE;
        const k = frac(t / 36), fwd = k < 0.5, u = fwd ? k * 2 : 2 - k * 2;
        return { x: 1 + 26 * u, y: WY - 1.05, dir: fwd ? 'r' : 'l', back: fwd };
      }, (ctx, t, p) => { if (!p.hide) person(ctx, p.x, p.y, G, { ...look, pose: 'run', dir: p.dir, back: p.back }, t); });
    }
    // At night, two on the wall with a pizza, looking at the harbor.
    stay(R, 19.6, WY - 0.2, folk(532, { top: C.coral }), { z: G, pose: 'sit', dir: 'l', hours: between(20.3, 1.5) });
    stay(R, 20.4, WY - 0.2, folk(533, { top: C.teal, style: 'long' }), { z: G, pose: 'sit', dir: 'r', hours: between(20.3, 1.5), over: (ctx) => box(ctx, 19.85, WY - 0.3, G + 0.8, 0.45, 0.45, 0.06, C.white, { flat: true, lw: 0.02 }) });

    // ---------- 9:30pm: a pizza ----------
    const PZ = [QX, 32.2];
    const pizzaAt = (t) => {
      const hr = hh(t);
      if (hr < 21.1 || hr > 22.7) return null;
      if (hr < 21.45) return { y: -4 + (PZ[1] + 4) * smooth((hr - 21.1) / 0.35), moving: true };
      if (hr < 22.25) return { y: PZ[1] };
      return { y: PZ[1] + (hr - 22.25) * 90 * Math.min(1, (hr - 22.25) * 5 + 0.3), moving: true };
    };
    R.mover((t) => { const p = pizzaAt(t); return p ? { x: PZ[0] + 0.75, y: p.y + 1.4, cy: p.y, moving: p.moving } : HIDE; }, (ctx, t, p) => {
      if (p.hide) return;
      const a = clamp01((p.cy + 2) / 4) * clamp01((62 - p.cy) / 4);
      ctx.save(); ctx.globalAlpha *= a;
      car(ctx, PZ[0], p.cy, G, C.white, { dir: 1 });
      box(ctx, PZ[0] - 0.4, p.cy - 0.35, G + 1.32, 0.8, 0.3, 0.4, LIT, { flat: true, lw: 0.03 });
      lettering(ctx, 'x', PZ[0], p.cy - 0.04, G + 1.52, 'PIZZA', 0.2, C.red, 'Bagel Fat One');
      ctx.save(); ctx.globalAlpha *= q8(nightK(t)); veil(ctx, carBoxes(PZ[0], p.cy, G)); ctx.restore();
      box(ctx, PZ[0] - 0.4, p.cy - 0.35, G + 1.32, 0.8, 0.3, 0.4, LIT, { flat: true, lw: 0.03 });
      lettering(ctx, 'x', PZ[0], p.cy - 0.04, G + 1.52, 'PIZZA', 0.2, C.red, 'Bagel Fat One');
      if (!p.moving && frac(t * 1.2) < 0.5) for (const x of [PZ[0] - 0.6, PZ[0] + 0.6]) disc(ctx, x, p.cy + 1.42, G + 0.6, 0.1, C.mustard, { lw: 0.02 });
      ctx.restore();
    });
    R.light({ at: (t) => { const p = pizzaAt(t); return p ? [PZ[0], p.y - 0.2, G + 1.6] : [PZ[0], -50, 0]; }, r: 1.6, color: LIT, k: (t) => (pizzaAt(t) ? 1 : 0) });
    R.light({ at: (t) => { const p = pizzaAt(t); return p ? [PZ[0], p.y + 2.4, G + 0.5] : [PZ[0], -50, 0]; }, r: 2.2, color: LIT, k: (t) => (pizzaAt(t)?.moving ? 0.9 : 0) });
    walker(R, [
      [21.46, WWALK + 1.9, PZ[1] - 0.2, { hold: pizzaHeld }], [21.62, WWALK, 29.6, { hold: pizzaHeld }], [21.68, 15.75, 28.9, { dir: 'l', back: true, say: 'PIZZA!', hold: pizzaHeld }],
      [21.98, 15.75, 28.9], [22.1, WWALK, 29.6], [22.24, WWALK + 1.9, PZ[1] - 0.2],
    ], folk(534, { top: C.red, hat: 'cap' }));
  },
};
