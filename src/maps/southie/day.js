// Moving Day: everyone on the day's clock (clock.js), walking between the
// street and the apartments. The engine draws each of them in whichever area
// they're in, so someone walks in a front door, up the stairs through the
// first floor, and turns up on their own. The areas draw everyone who stays
// put (the audience, the line, the spotters).
//
// The day (hours; the clock is uneven, so at(h) gives the loop time):
//    7am   the movers start carrying out, house by house
//    8am   the Courier double-parks on Farragut Road with a parcel for
//          "G. Goose, Third Floor, Farragut Road", and climbs every house's
//          stairs to every third floor, and is sent away from each
//  11:30am the landlady climbs the Green House with her clipboard (the
//          inspection; the poster at 11:40)
//   noon   she hands out keys from the Green House's porch
//    1pm   the Courier goes for a hot dog at Castle Island
//    2pm   the curb collector starts carrying the curb up the Yellow House
//   9:30pm the Courier makes it up the Green House's last flight (the ending)
//
// npm run qa checks every walk: through doors, never walls, never faster
// than a run. The walks below are the greybox's, exactly; the art only
// changes how everyone looks, what they carry and what they say.
import { C, Q, P, SKIN, HAIR, folk, person, paint, speech, alpha, mix, tint, shade } from '../../engine/art.js';
import { ZK } from '../../engine/iso.js';
import { schedule } from '../../engine/actors.js';
import { HOUSES, ROW_X0, FH, GROUND, ROAD, STAND, FRONT } from './plan.js';
import { FLIGHTS, HALL, BODY, DOOR, carton, umbrella } from './kit.js';
import { LOOP, at, hour, rainK } from './clock.js';
import { CURB } from './plan.js';
import { CUP } from './style.js';

const G = GROUND;
const HY = Object.fromEntries(HOUSES);
const hallY = (id) => HY[id] + (HALL.y0 + HALL.y1) / 2;
// Points on the way up a house (world units): the curb in front of it, its
// front door, the top of each flight, and a spot in the middle of each floor.
const curb = (id, dx = 0) => [ROAD.walk0 + 0.8 + dx, HY[id] + DOOR.y, G];
const door = (id) => [ROW_X0 + BODY - 0.4, hallY(id), G];
const landing = (id, f) => [ROW_X0 + FLIGHTS[f - 1][1], hallY(id), G + f * FH];
const room = (id, f) => [ROW_X0 + 6, HY[id] + 4, G + f * FH];
// Up from the curb to floor f's room, and back down (steps for schedule()).
function up(id, f) {
  const s = [door(id)];
  for (let i = 1; i <= f; i++) s.push(landing(id, i));
  s.push(room(id, f));
  return s;
}
function down(id, f) {
  const s = [];
  for (let i = f; i >= 1; i--) s.push(landing(id, i));
  s.push(door(id), curb(id));
  return s;
}

// ---------- Little things ----------
const wrap = (t) => (((t % LOOP) + LOOP) % LOOP);
const hh = (t) => { const h = hour(t); return h < 5 ? h + 24 : h; };
// Outdoors (in front of the house, or out on a porch) and raining.
const wet = (t, w) => rainK(t) > 0.12 && w.x > FRONT - 0.2;
// Speech only close up, where it can be read.
const near = () => Q.detail && Q.pxPerUnit >= 12;
const say = (ctx, x, y, z, text) => { if (text && near()) speech(ctx, x, y, z, text, { size: 0.42 }); };
// Now and then: true for `on` seconds of every `every`.
const now = (t, every, on, off = 0) => wrap(t + off) % every < on;
// One of some lines, now and then (null the rest of the time).
const lines = (t, list, every = 9, on = 3.2, off = 0) => (now(t, every, on, off) ? list[Math.floor(wrap(t + off) / every) % list.length] : null);

// Words painted on something someone's holding (their own units; the engine
// mirrors them when they face left, so the words are turned back).
function words(g, text, x, y, size, color, flip, font = 'Rethink Sans') {
  if (!Q.detail || Q.pxPerUnit < 16) return;
  g.save();
  g.translate(x, y);
  if (flip) g.scale(-1, 1);
  g.scale(1 / 40, 1 / 40);
  g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `${size * 40}px "${font}", "Arial Black", sans-serif`;
  g.fillText(text, 0, 0);
  g.restore();
}
const rect = (g, x, y, w, h, fill, lw = 0.03, o = {}) => { g.beginPath(); g.rect(x, y, w, h); paint(g, fill, { lw, ...o }); };
const stroke = (g, pts, color, lw) => {
  g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.strokeStyle = color; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
};
// Drawing in someone's own units, from their feet (for what they drag, or
// what flies off them), facing their way.
function feet(ctx, p, fn) {
  const [X, Y] = P(p.x, p.y, p.z);
  ctx.save(); ctx.translate(X, Y); ctx.scale(p.dir === 'l' ? -1 : 1, 1); fn(ctx); ctx.restore();
}
// Arms: holding something in front, up over the head, dragging behind.
const CARRY = [1.2, 1.2], OVERHEAD = [2.75, -2.75], DRAG = [-0.7, -1.0];

// ---------- What people carry (in their own units, from the chest) ----------
// A moving box, a word on it in marker.
function box(g, word, flip, o = {}) {
  const w = o.w || 0.78, h = o.h || 0.6, x = o.x ?? -0.3, y = o.y ?? -0.34;
  rect(g, x, y, w, h, o.color || C.woodLight, 0.035);
  if (!Q.detail) return;
  g.fillStyle = tint(C.butter, 0.3); g.fillRect(x, y + 0.04, w, 0.07);
  if (word) words(g, word, x + w / 2, y + h * 0.6, Math.min(0.16, (w / word.length) * 1.5), C.ink, flip, 'Bagel Fat One');
}
// The beer pong table, folded on its side: the cups painted on it.
function pong(g) {
  rect(g, -1.15, -0.42, 2.4, 0.56, C.white, 0.035);
  if (!Q.detail) return;
  g.fillStyle = C.red;
  for (const [cx, s] of [[-0.95, 1], [1.05, -1]]) {
    for (let r = 0; r < 3; r++) for (let i = 0; i <= r; i++) {
      g.beginPath(); g.arc(cx + s * r * 0.1, -0.14 + (i - r / 2) * 0.11, 0.045, 0, Math.PI * 2); g.fill();
    }
  }
  g.fillStyle = C.navy; g.fillRect(-0.04, -0.42, 0.08, 0.56);
}
// A floor lamp, shade and all.
function lamp(g, shadeless = false, lit = false) {
  stroke(g, [[0.4, 0.75], [0.15, -1.45]], C.ink, 0.1);
  stroke(g, [[0.4, 0.75], [0.15, -1.45]], shadeless ? C.mustard : C.brown, 0.05);
  g.beginPath(); g.ellipse(0.42, 0.78, 0.2, 0.06, 0, 0, Math.PI * 2); paint(g, shadeless ? C.mustard : C.brown, { lw: 0.025 });
  if (shadeless) {
    g.beginPath(); g.arc(0.14, -1.55, 0.12, 0, Math.PI * 2); paint(g, lit ? C.butter : C.white, { lw: 0.025 });
    return;
  }
  g.beginPath(); g.moveTo(-0.12, -1.35); g.lineTo(0.42, -1.35); g.lineTo(0.3, -1.75); g.lineTo(0.0, -1.75); g.closePath();
  paint(g, C.butter, { lw: 0.03, dots: C.mustard, density: 0.15 });
}
// A kitchen chair, legs out.
function chair(g) {
  const wood = C.wood;
  rect(g, -0.2, -0.05, 0.62, 0.1, wood, 0.03);
  rect(g, -0.2, -0.75, 0.08, 0.72, wood, 0.03);
  rect(g, -0.2, -0.75, 0.3, 0.1, wood, 0.025);
  for (const x of [-0.18, 0.34]) stroke(g, [[x, 0.05], [x + 0.02, 0.55]], shade(wood, 0.3), 0.06);
}
// The kid's bike: little wheels, training wheels, streamers.
function kidBike(g, t) {
  for (const x of [-0.25, 0.45]) { g.beginPath(); g.arc(x, 0.22, 0.22, 0, Math.PI * 2); paint(g, null, { lw: 0.06 }); }
  g.beginPath(); g.arc(-0.42, 0.34, 0.08, 0, Math.PI * 2); paint(g, C.white, { lw: 0.025 });
  stroke(g, [[-0.25, 0.22], [0.05, -0.08], [0.35, -0.08], [0.45, 0.22]], C.ink, 0.11);
  stroke(g, [[-0.25, 0.22], [0.05, -0.08], [0.35, -0.08], [0.45, 0.22]], C.pink, 0.06);
  stroke(g, [[0.05, -0.08], [0.0, -0.22]], C.ink, 0.05);
  rect(g, -0.1, -0.26, 0.22, 0.06, C.white, 0.02);
  stroke(g, [[0.35, -0.08], [0.4, -0.35], [0.5, -0.35]], C.ink, 0.05);
  if (Q.detail) {
    const f = Math.sin(t * 9) * 0.05;
    stroke(g, [[0.5, -0.35], [0.7, -0.3 + f]], C.mustard, 0.03);
    stroke(g, [[0.5, -0.35], [0.7, -0.38 - f]], C.teal, 0.03);
  }
}
// A tall mirror: frame, glass, the glint.
function mirror(g) {
  rect(g, -0.25, -0.45, 0.66, 1.3, C.wood, 0.035);
  rect(g, -0.18, -0.38, 0.52, 1.16, tint(C.sky, 0.35), 0.02);
  if (!Q.detail) return;
  stroke(g, [[-0.08, 0.0], [0.12, -0.3]], alpha(C.white, 0.9), 0.05);
  stroke(g, [[-0.05, 0.2], [0.25, -0.25]], alpha(C.white, 0.7), 0.03);
}
// The exercise bike's box: a picture of the bike, and THIS SIDE UP upside down.
function bikeBox(g, flip) {
  g.save(); g.translate(0, 0.42); g.scale(0.9, 0.9);
  bikeBoxAt(g, flip);
  g.restore();
}
function bikeBoxAt(g, flip) {
  rect(g, -0.32, -0.95, 0.82, 1.45, C.woodLight, 0.035);
  if (!Q.detail) return;
  g.fillStyle = tint(C.butter, 0.3); g.fillRect(-0.32, -0.3, 0.82, 0.07);
  // The bike, in black ink on the side.
  g.fillStyle = C.black;
  stroke(g, [[-0.15, 0.25], [-0.05, -0.2], [0.25, -0.35], [0.28, -0.55]], C.black, 0.05);
  stroke(g, [[-0.2, 0.28], [0.35, 0.28]], C.black, 0.05);
  rect(g, 0.18, -0.68, 0.18, 0.12, C.black, 0.01);
  g.beginPath(); g.arc(-0.05, -0.2, 0.08, 0, Math.PI * 2); g.fill();
  g.save(); g.translate(0.09, -0.75); g.rotate(Math.PI); words(g, 'THIS SIDE UP', 0, 0, 0.09, C.red, flip, 'Bagel Fat One'); g.restore();
  stroke(g, [[0.4, -0.6], [0.4, -0.35], [0.33, -0.42]], C.red, 0.035);
  stroke(g, [[0.4, -0.35], [0.47, -0.42]], C.red, 0.035);
}
// A mattress over the head (from the feet: the head's hy).
function mattressUp(g, hy, t, rain) {
  const y0 = hy - 0.72;
  rect(g, -1.35, y0, 2.7, 0.34, C.white, 0.04);
  if (Q.detail) {
    g.fillStyle = tint(C.sky, 0.55); g.fillRect(-1.35, y0 + 0.24, 2.7, 0.1);
    for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(-1.1 + i * 0.44, y0 + 0.12, 0.03, 0, Math.PI * 2); g.fillStyle = shade(C.sky, 0.2); g.fill(); }
    if (rain) drips(g, [-1.3, 1.3], y0 + 0.36, t);
  }
}
// Water running off the ends of whatever's keeping someone dry.
function drips(g, xs, y, t) {
  g.fillStyle = alpha(C.white, 0.9);
  for (const [i, x] of xs.entries()) {
    const k = ((t * 1.6 + i * 0.37) % 1);
    g.beginPath(); g.ellipse(x, y + k * 1.4, 0.03, 0.06, 0, 0, Math.PI * 2); g.fill();
  }
}
// A flattened box held over the head, for want of anything better.
function flatBox(g, hy) {
  g.beginPath(); g.moveTo(-0.62, hy - 0.46); g.lineTo(0.66, hy - 0.52); g.lineTo(0.7, hy - 0.42); g.lineTo(-0.6, hy - 0.36); g.closePath();
  paint(g, C.woodLight, { lw: 0.03 });
}
// The curb's free things, for the collector.
function dresser(g) {
  rect(g, -0.36, -0.55, 0.9, 1.0, C.wood, 0.035, { dots: shade(C.wood, 0.5), density: 0.12 });
  if (!Q.detail) return;
  // (The middle drawer's missing, on the curb and upstairs.)
  for (let i = 0; i < 3; i++) {
    rect(g, -0.3, -0.48 + i * 0.31, 0.78, 0.26, i === 1 ? C.ink : tint(C.wood, 0.15), 0.02);
    if (i !== 1) { g.fillStyle = C.butter; g.fillRect(0.06, -0.37 + i * 0.31, 0.06, 0.05); }
  }
}
function tv(g) {
  rect(g, -0.3, -0.36, 0.78, 0.62, C.grey, 0.035);
  rect(g, -0.22, -0.28, 0.54, 0.44, shade(C.teal, 0.35), 0.025);
  if (Q.detail) {
    stroke(g, [[0.05, -0.36], [-0.12, -0.8]], C.ink, 0.03);
    stroke(g, [[0.12, -0.36], [0.32, -0.76]], C.ink, 0.03);
    stroke(g, [[-0.12, -0.2], [0.02, -0.1]], alpha(C.white, 0.5), 0.03);
    g.fillStyle = C.mustard; g.fillRect(0.36, -0.2, 0.06, 0.06);
  }
}
// The curb's couch, dragged up behind him (from his feet), soaked.
function couch(g, t, soaked) {
  const col = soaked ? shade(C.purple, 0.18) : C.purple;
  g.save(); g.rotate(-0.08);
  rect(g, -2.6, -0.95, 2.0, 0.7, col, 0.04, { dots: shade(col, 0.5), density: 0.12 });
  rect(g, -2.55, -0.5, 1.9, 0.4, tint(col, 0.1), 0.035);
  rect(g, -2.72, -0.8, 0.28, 0.65, col, 0.035);
  rect(g, -0.78, -0.8, 0.28, 0.65, col, 0.035);
  if (Q.detail) {
    g.fillStyle = C.brown; g.fillRect(-2.55, -0.12, 0.1, 0.12); g.fillRect(-0.72, -0.12, 0.1, 0.12);
    if (soaked) drips(g, [-2.4, -1.9, -1.3, -0.8], -0.08, t);
  }
  g.restore();
}
// The parcel: brown card, tape, G. GOOSE, 3RD FLOOR, and a goose drawn on it.
function parcel(g, o = {}) {
  if (o.under) g.translate(-0.32, 0.24);
  rect(g, -0.16, -0.24, 0.6, 0.4, C.woodLight, 0.035);
  g.beginPath(); g.moveTo(-0.16, -0.24); g.lineTo(-0.05, -0.33); g.lineTo(0.55, -0.33); g.lineTo(0.44, -0.24); g.closePath();
  paint(g, tint(C.woodLight, 0.3), { lw: 0.035 });
  if (!Q.detail) return;
  g.fillStyle = alpha(C.brown, 0.45); g.fillRect(0.0, -0.24, 0.06, 0.4);
  g.fillStyle = C.white; g.fillRect(0.14, -0.18, 0.27, 0.17);
  if (Q.pxPerUnit < 30) { g.fillStyle = C.ink; g.fillRect(0.17, -0.14, 0.2, 0.025); g.fillRect(0.17, -0.09, 0.14, 0.025); return; }
  words(g, 'G. GOOSE', 0.275, -0.13, 0.055, C.ink, o.flip, 'Bagel Fat One');
  words(g, '3RD FLOOR', 0.275, -0.06, 0.045, C.ink, o.flip);
  // The goose, in marker, below the label.
  g.lineCap = 'round';
  g.beginPath(); g.ellipse(0.24, 0.07, 0.07, 0.04, 0, 0, Math.PI * 2); g.strokeStyle = C.ink; g.lineWidth = 0.02; g.stroke();
  g.beginPath(); g.moveTo(0.3, 0.05); g.quadraticCurveTo(0.33, -0.02, 0.36, -0.03); g.stroke();
  g.fillStyle = C.coral; g.beginPath(); g.moveTo(0.36, -0.045); g.lineTo(0.41, -0.03); g.lineTo(0.36, -0.015); g.fill();
}
// The scanner: black, a little screen, a red beam when it's scanning.
function scanner(g, t, beam) {
  g.save(); g.translate(0.5, 0.0); g.rotate(-0.4);
  rect(g, -0.06, -0.2, 0.14, 0.3, C.black, 0.02);
  g.fillStyle = tint(C.teal, 0.4); g.fillRect(-0.03, -0.16, 0.08, 0.08);
  g.restore();
  if (beam && Q.detail && now(t, 1.3, 0.35)) stroke(g, [[0.62, -0.24], [0.95, -0.55]], alpha(C.red, 0.85), 0.03);
}
// A hot dog in its paper boat, one with everything (relish and mustard).
function hotdog(g) {
  g.save(); g.translate(0.5, -0.02);
  g.beginPath(); g.moveTo(-0.22, -0.02); g.lineTo(0.22, -0.02); g.lineTo(0.17, 0.08); g.lineTo(-0.17, 0.08); g.closePath(); paint(g, C.white, { lw: 0.02 });
  g.beginPath(); g.ellipse(0, -0.06, 0.22, 0.07, 0, 0, Math.PI * 2); paint(g, C.woodLight, { lw: 0.02 });
  g.beginPath(); g.ellipse(0, -0.1, 0.24, 0.045, 0, 0, Math.PI * 2); paint(g, C.coral, { lw: 0.02 });
  if (Q.detail) { stroke(g, [[-0.16, -0.13], [-0.08, -0.1], [0, -0.13], [0.08, -0.1], [0.16, -0.13]], C.mustard, 0.03); g.fillStyle = C.green; g.fillRect(-0.1, -0.16, 0.06, 0.03); g.fillRect(0.05, -0.16, 0.05, 0.03); }
  g.restore();
}
// An iced coffee, in the hand (the donut shop's, no name).
function coffee(g) {
  g.save(); g.translate(0.52, 0.05);
  g.beginPath(); g.moveTo(-0.11, -0.34); g.lineTo(-0.08, 0); g.lineTo(0.08, 0); g.lineTo(0.11, -0.34); g.closePath();
  paint(g, mix(C.brown, C.white, 0.45), { lw: 0.025 });
  g.fillStyle = CUP.band; g.fillRect(-0.1, -0.2, 0.2, 0.08);
  g.fillStyle = CUP.lid; g.fillRect(-0.11, -0.37, 0.22, 0.05);
  stroke(g, [[0.03, -0.37], [0.08, -0.55]], CUP.lid, 0.035);
  g.restore();
}
const phone = (g) => rect(g, 0.44, -0.3, 0.16, 0.26, C.black, 0.02);
function pizza(g) {
  g.save(); g.translate(0.42, 0.06); g.rotate(-0.5);
  g.beginPath(); g.moveTo(0, 0); g.lineTo(0.34, -0.1); g.lineTo(0.3, 0.1); g.closePath(); paint(g, C.butter, { lw: 0.02 });
  if (Q.detail) { g.fillStyle = C.red; g.beginPath(); g.arc(0.2, -0.02, 0.035, 0, Math.PI * 2); g.fill(); }
  g.restore();
}
// The landlady's clipboard, and a key held out.
function clipboard(g) {
  g.save(); g.rotate(-0.15);
  rect(g, -0.02, -0.4, 0.4, 0.5, C.brown, 0.025);
  rect(g, 0.04, -0.34, 0.28, 0.4, C.white, 0.015);
  if (Q.detail) { g.fillStyle = C.ink; for (let i = 0; i < 4; i++) g.fillRect(0.08, -0.26 + i * 0.08, 0.18 - (i % 2) * 0.06, 0.02); g.fillStyle = C.grey; g.fillRect(0.12, -0.44, 0.14, 0.07); }
  g.restore();
}
function key(g, x, y, t) {
  const s = Math.sin(t * 5) * 0.15;
  g.save(); g.translate(x, y); g.rotate(s);
  g.beginPath(); g.arc(0, 0.1, 0.06, 0, Math.PI * 2); paint(g, C.mustard, { lw: 0.02 });
  stroke(g, [[0, 0.16], [0, 0.36], [0.05, 0.36]], C.mustard, 0.035);
  g.restore();
}

// ---------- Clothes (wear: over the body; face: over the head) ----------
// Shorts, over bare legs (bottom: skin), for the Courier and Dad.
function shorts(color, pockets) {
  return (g, b) => {
    g.beginPath(); g.roundRect(-0.31, b.hipY - 0.08, 0.62, 0.4, 0.06); paint(g, color, { lw: 0.035 });
    if (pockets && Q.detail) rect(g, 0.12, b.hipY + 0.08, 0.16, 0.15, shade(color, 0.12), 0.02);
  };
}
// The Courier's brown cap (the engine's cap is always coral), a badge on it.
function brownCap(g, hy, back) {
  g.beginPath(); g.arc(0.02, hy - 0.02, 0.34, Math.PI, 0);
  if (!back) g.rect(0.14, hy - 0.06, 0.34, 0.07);
  paint(g, shade(C.brown, 0.12), { lw: 0.05 });
  if (Q.detail && !back) { g.fillStyle = C.butter; g.fillRect(-0.02, hy - 0.26, 0.12, 0.08); }
}
// A plain cap in any color, brim forward or turned round.
function cap(g, hy, back, color, turned = false) {
  g.beginPath(); g.arc(0.02, hy - 0.04, 0.33, Math.PI, 0);
  if (!back || turned) g.rect(turned ? -0.5 : 0.14, hy - 0.08, 0.36, 0.07);
  paint(g, color, { lw: 0.045 });
}
// A hood up, round the face.
function hoodUp(g, hy, back, color) {
  g.beginPath();
  if (back) g.arc(0.02, hy - 0.02, 0.4, 0, Math.PI * 2);
  else { g.arc(0.0, hy - 0.02, 0.4, -Math.PI * 0.32, Math.PI * 0.62, true); g.lineTo(-0.02, hy + 0.18); g.arc(0.06, hy, 0.25, Math.PI * 0.62, -Math.PI * 0.32, false); g.closePath(); }
  paint(g, color, { lw: 0.04 });
}
// Winded: sweat flying off, and a puff of breath.
function winded(g, hy, t) {
  if (!Q.detail) return;
  for (let i = 0; i < 2; i++) {
    const k = ((t * 1.4 + i * 0.5) % 1);
    g.beginPath(); g.ellipse(-0.25 - k * 0.3, hy - 0.25 - Math.sin(k * Math.PI) * 0.3 + k * 0.4, 0.035, 0.055, 0, 0, Math.PI * 2);
    g.fillStyle = alpha(tint(C.sky, 0.3), 1 - k); g.fill();
  }
  const k = ((t * 1.1) % 1);
  g.beginPath(); g.arc(0.45 + k * 0.3, hy + 0.08 - k * 0.1, 0.05 + k * 0.08, 0, Math.PI * 2);
  g.fillStyle = alpha(C.white, 0.8 * (1 - k)); g.fill();
}

// ---------- A walker ----------
// Their walk is schedule()'s, exactly as the greybox had it; look(t, p, w)
// dresses them for the moment (w: where they are in the world, p: in the
// area drawing them) and returns { look, under, over, lean, speak, z }.
function walker(id, name, seed, steps, o = {}) {
  const walk = schedule(steps, { loop: LOOP, name, speed: o.speed || 1.3 });
  const ctx0 = o.prep ? o.prep(walk) : null;
  return {
    id,
    name,
    color: o.color || C.coral,
    loop: LOOP,
    // ahead(t, p): how far to draw them in front of what they're standing
    // by (only the draw order: the walk is the walk).
    at: o.ahead ? (t) => { const p = walk(t), a = o.ahead(t, p); return a ? { ...p, ahead: a } : p; } : walk,
    draw(ctx, t, p) {
      const w = walk(t);
      const d = o.dress(t, p, w, ctx0);
      // (Somewhere else for a while, drawn by that area: the walk goes on.)
      if (d.hide) return;
      const z = p.z + (d.z || 0);
      const q = { ...p, z };
      if (d.under) d.under(ctx, q);
      if (d.lean) {
        const [X, Y] = P(p.x, p.y, z);
        ctx.save(); ctx.translate(X, Y); ctx.rotate(d.lean * (p.dir === 'l' ? -1 : 1)); ctx.translate(-X, -Y);
      }
      person(ctx, p.x, p.y, z, { ...d.look, pose: d.pose || p.pose, dir: p.dir, back: d.back ?? p.back }, t);
      if (d.lean) ctx.restore();
      if (d.over) d.over(ctx, q);
      say(ctx, p.x, p.y, z + (d.sayZ || 2.9), d.speak);
    },
  };
}
const face = (...fs) => (g, hy, back, t) => { for (const f of fs) if (f) f(g, hy, back, t); };
const wear = (...fs) => (g, b, t) => { for (const f of fs) if (f) f(g, b, t); };

// Which way someone's going, all day, worked out once from their walk (so
// drawing stays a pure function of t): up the house (1), down (-1) or
// standing (0), which trip of the half-day it is, and whether they've been
// standing a while (idle, not just catching a breath).
function legs(walk) {
  const N = LOOP * 4, leg = new Int8Array(N), trip = new Int8Array(N), idle = new Uint8Array(N);
  let next = 1, cur = 0, k = -1, am = true;
  for (let i = 0; i < N; i++) {
    const t = i / 4, p = walk(t), isAm = hh(t) < 12.5;
    if (isAm !== am) { am = isAm; k = -1; }
    if (!p.moving) { next = p.x > FRONT + 1 ? 1 : -1; cur = 0; } else if (cur === 0) { cur = next; if (cur === 1) k++; }
    leg[i] = cur; trip[i] = Math.max(0, k);
  }
  for (let i = 0; i < N;) {
    let j = i;
    while (j < N && leg[j] === 0) j++;
    if (j - i > 16) idle.fill(1, i, j);
    i = j === i ? i + 1 : j;
  }
  return (t) => { const i = Math.floor(wrap(t) * 4) % N; return { leg: leg[i], trip: trip[i], idle: !!idle[i] }; };
}
// Sitting on a moving box (from where they stand).
const onBox = (ctx, q) => carton(ctx, q.x - 0.32, q.y - 0.3, q.z + 0.1, 0.62, 0.6, 0.6);

// Out on a floor's porch.
const PORCH = (id, f) => [ROW_X0 + BODY + 1.2, HY[id] + 2.4, G + f * FH];

// ---------- The Courier ----------
// The game's delivery man, in his brown uniform, cap and shorts, with the
// parcel for G. Goose, Third Floor, and his scanner: every third floor, then
// lunch, then the Green House at the end.
const VAN = [ROAD.lane1 + 1, 45, G];
const BROWN = C.brown;
const courierLook = folk(7, {
  skin: SKIN[2], hair: HAIR[1], style: 'short', top: BROWN, bottom: SKIN[2], shoes: C.black, dress: false,
});
const courierWear = wear(shorts(shade(BROWN, 0.15), true), (g, b) => {
  // His belt and the scanner's holster.
  if (!Q.detail) return;
  g.fillStyle = C.black; g.fillRect(-0.28, b.hipY - 0.1, 0.56, 0.07);
  if (!b.back) rect(g, -0.26, b.hipY - 0.12, 0.12, 0.2, C.black, 0.015);
});
const courier = walker('courier', 'Courier', 7, [
  VAN, { until: at(7.6) },
  curb('grey'), ...up('grey', 2), { wait: 3, say: 'G. Goose?' }, ...down('grey', 2),
  ...up('yellow', 2), { wait: 3, say: 'G. Goose?' }, ...down('yellow', 2),
  ...up('green', 2), { wait: 3, say: 'G. Goose?' }, ...down('green', 2),
  VAN, { until: at(12.6) },
  [40, 5.5, G], [STAND[0] + 12, STAND[1] + 3, G], { until: at(16.6), say: 'One with everything.' },
  [40, 5.5, G], VAN, { until: at(20.1) },
  curb('green'), ...up('green', 2), PORCH('green', 2), { until: at(23.5), say: 'G. Goose?' }, room('green', 2), ...down('green', 2),
], {
  color: C.brown, speed: 1.7,
  // At the van's open back doors, in front of the van, not inside it.
  ahead: (t, p) => (!p.moving && p.x > ROAD.lane0 && p.y > 40 ? 2 : 0),
  dress(t, p, w) {
    const h = hh(t), flip = p.dir === 'l';
    const atVan = !w.moving && w.x > ROAD.lane0 && w.y > 40;
    const lunch = w.x > 50;
    const upstairs = w.z > G + 0.5;
    const top = w.z > G + FH * 1.5;
    const rain = wet(t, w);
    // He orders as he gets there (One with everything.), then eats it walking back.
    const hotdogOut = h > 15.8 && h < 17.4;
    let hold, arms, speak = p.say, pose;
    if (atVan) {
      // At the van's open back: coffee at dawn, the scanner the rest of the day.
      hold = h < 7 || h > 23 ? coffee : (g) => scanner(g, t, true);
      pose = 'stand';
      arms = [0.9, 0.2];
      speak = h > 11 && h < 12.7 ? lines(t, ['Three houses.', 'Three third floors.', 'Nobody named Goose.'], 10, 3.2)
        : h > 16.5 && h < 20.2 ? lines(t, ['Maybe the Green House.', 'Third floor. Third floor.'], 11, 3.2, 4) : null;
    } else if (top && (!w.moving || w.x > FRONT)) {
      // Asking at the door, or out on the Green House's top porch tonight: the parcel held out.
      hold = (g) => parcel(g, { flip });
      arms = CARRY;
    } else if (lunch && !w.moving) {
      hold = (g) => { parcel(g, { under: true, flip }); if (hotdogOut) hotdog(g); };
      arms = [0.5, 0.1];
      speak = hotdogOut ? lines(t, ['Worth it.', 'Relish. Good.'], 8, 2.6) : p.say;
    } else {
      hold = (g) => { parcel(g, { under: true, flip }); if (hotdogOut && lunch) hotdog(g); };
    }
    // On the stairs and up top, he's winded.
    const climbing = w.moving && upstairs;
    const puff = upstairs && (climbing || !w.moving);
    return {
      look: {
        ...courierLook, hold, wear: courierWear,
        ...(arms ? { arms } : {}),
        face: face((g, hy, back) => brownCap(g, hy, back), puff ? (g, hy, back) => winded(g, hy, t) : null),
      },
      pose,
      lean: climbing ? 0.12 : 0,
      over: rain ? (ctx, q) => umbrella(ctx, q.x, q.y, q.z, shade(BROWN, 0.05), w.moving ? Math.sin(t * 7) * 0.04 : 0) : null,
      speak,
      sayZ: rain ? 3.4 : 2.9,
    };
  },
});

// ---------- The landlady ----------
// Seventies, fifty-two years in the house: a housecoat and a cardigan,
// slippers, curlers, glasses on a chain, a clipboard, and every key on one
// ring (it jingles). The inspection at 11:30, keys on the porch at noon.
const LADY = { skin: SKIN[5], hair: HAIR[4], style: 'short', top: C.pink, dress: true, shoes: C.blush, bottom: C.pink };
const cardigan = (g, b) => {
  const c = C.teal;
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(s * 0.23, b.top + 0.02); g.lineTo(s * 0.1, b.top + 0.02); g.lineTo(s * 0.18, b.hipY - 0.05); g.lineTo(s * 0.34, b.hipY - 0.05); g.closePath();
    paint(g, c, { lw: 0.03, dots: shade(c, 0.4), density: 0.12 });
  }
};
// The ring of keys at her hip, and a glint off it when she moves.
const keyring = (moving) => (g, b, t) => {
  if (b.back) return;
  const x = 0.26, y = b.hipY + 0.02;
  g.beginPath(); g.arc(x, y, 0.13, 0, Math.PI * 2); g.strokeStyle = C.ink; g.lineWidth = 0.05; g.stroke();
  g.strokeStyle = C.mustard; g.lineWidth = 0.025; g.stroke();
  if (!Q.detail) return;
  for (let i = 0; i < 5; i++) {
    const a = 0.6 + i * 0.45 + (moving ? Math.sin(t * 14 + i) * 0.2 : 0);
    stroke(g, [[x + Math.cos(a) * 0.13, y + Math.sin(a) * 0.13], [x + Math.cos(a) * 0.3, y + Math.sin(a) * 0.3]], i % 2 ? C.greyLight : C.mustard, 0.04);
  }
  if (moving) {
    // The jingle: a sparkle now here, now there.
    const i = Math.floor(t * 6) % 3, k = (t * 6) % 1;
    const sx = x + [0.28, 0.05, 0.36][i], sy = y + [0.22, 0.3, 0.02][i], r = 0.1 * Math.sin(k * Math.PI);
    g.fillStyle = C.white;
    g.beginPath(); g.moveTo(sx, sy - r); g.lineTo(sx + r * 0.25, sy); g.lineTo(sx, sy + r); g.lineTo(sx - r * 0.25, sy); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(sx - r, sy); g.lineTo(sx, sy + r * 0.25); g.lineTo(sx + r, sy); g.lineTo(sx, sy - r * 0.25); g.closePath(); g.fill();
  }
};
// Curlers, glasses on their chain; a plastic rain bonnet over the curlers outside.
const curlers = (bonnet) => (g, hy, back) => {
  if (Q.detail) {
    for (const [dx, dy, c] of [[-0.2, -0.24, C.pink], [0.0, -0.33, C.sky], [0.2, -0.26, C.pink], [-0.3, -0.05, C.sky]]) {
      g.beginPath(); g.roundRect(0.02 + dx - 0.08, hy + dy - 0.06, 0.16, 0.12, 0.05); paint(g, c, { lw: 0.02 });
    }
  }
  if (!back && Q.detail) {
    g.strokeStyle = C.ink; g.lineWidth = 0.02;
    g.beginPath(); g.arc(0.1, hy + 0.03, 0.06, 0, Math.PI * 2); g.moveTo(0.3, hy + 0.03); g.arc(0.24, hy + 0.03, 0.06, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(0.04, hy + 0.05); g.quadraticCurveTo(-0.05, hy + 0.35, 0.1, hy + 0.45); g.strokeStyle = alpha(C.mustard, 0.9); g.stroke();
  }
  if (bonnet) {
    g.beginPath(); g.arc(0.02, hy - 0.04, 0.42, Math.PI * 1.02, Math.PI * 1.98);
    g.quadraticCurveTo(0.3, hy + 0.1, 0.02, hy + 0.08); g.quadraticCurveTo(-0.3, hy + 0.1, -0.4, hy - 0.04);
    paint(g, alpha(C.white, 0.4), { lw: 0.025, stroke: alpha(C.ink, 0.6) });
    if (!back) stroke(g, [[0.3, hy - 0.02], [0.2, hy + 0.3]], alpha(C.ink, 0.5), 0.02);
  }
};
// The police scanner at night (her evening's entertainment).
const policeScanner = (g) => {
  rect(g, 0.42, -0.45, 0.18, 0.34, C.black, 0.02);
  stroke(g, [[0.46, -0.45], [0.46, -0.72]], C.black, 0.03);
  if (Q.detail) { g.fillStyle = C.red; g.fillRect(0.48, -0.38, 0.06, 0.04); }
};
// When she's out at the Grey One's showing (grey-1.js draws her walk through).
export const OPEN_HOUSE = [13.45, 14.34];
// Her look for another area to draw her in: the rain bonnet if she's come in
// from the rain, the keys jingling if she's walking.
export const ladyLook = (bonnet, moving) => ({ ...LADY, wear: wear(cardigan, keyring(moving)), face: face(curlers(bonnet)) });
const landlady = walker('landlady', 'Landlady', 71, [
  room('green', 0), { until: at(10.9) },
  door('green'), landing('green', 1), room('green', 1), { until: at(11.45), say: 'What is this.' },
  landing('green', 2), room('green', 2), { until: at(11.85) },
  landing('green', 2), landing('green', 1), door('green'), PORCH('green', 0), { until: at(12.95), say: 'Next.' },
  door('green'),
], {
  color: C.purple,
  dress(t, p, w) {
    const h = hh(t), rain = wet(t, w), porch = w.x > FRONT && !w.moving;
    // Half past one: next door at the Open House, in her own slippers (the
    // Grey One's first floor draws her there, in this look; ladyLook).
    if (h >= OPEN_HOUSE[0] && h < OPEN_HOUSE[1] && !w.moving) return { hide: true };
    let hold = clipboard, arms, pose, speak = p.say, extra = null;
    if (porch) {
      // Handing out keys, one at a time, to the line in the rain.
      hold = clipboard;
      arms = [1.45, 0.9];
      extra = (g, hy, back, tt) => { if (now(tt, 2.4, 1.6)) key(g, 0.93, -1.4, tt); };
      speak = p.say && now(t, 2.4, 1.4) ? p.say : null;
    } else if (!w.moving) {
      if (p.say) { pose = 'point'; hold = clipboard; } // What is this.
      else if (h >= 20.5 || h < 6) { hold = policeScanner; arms = [1.2, 0.2]; speak = lines(t, ['Car alarm on P Street.', 'Kids on the beach again.', 'Mm-hm.', 'I knew it.'], 11, 3.4, 2); }
      else if (h > 13 && h < 20.5) { pose = 'read'; speak = lines(t, ['Deposit\'s in the can.', 'Fifty-two years.', 'Nobody measures.'], 13, 3.2, 5); }
      else if (h >= 11 && h < 12) { pose = 'read'; } // the Roommates' floor: writing it all down
      else { pose = 'read'; speak = h > 9 ? lines(t, ['Out by noon.', 'Wipe your feet.'], 13, 3, 3) : null; }
    } else arms = [0.9, -0.1];
    return {
      look: { ...LADY, hold, ...(arms ? { arms } : {}), wear: wear(cardigan, keyring(w.moving)), face: face(curlers(rain), extra) },
      pose,
      over: rain ? (ctx, q) => umbrella(ctx, q.x, q.y, q.z, C.lilac, w.moving ? Math.sin(t * 6) * 0.04 : 0) : null,
      speak,
      sayZ: rain ? 3.4 : 2.9,
    };
  },
});

// ---------- The movers, one a house ----------
// Out before noon, in after: loaded on the way down in the morning and on
// the way up in the afternoon, with something different each trip. Between
// times, they wait at the curb.
const MOVERS = {
  // The Green House: the Roommate, in the college hoodie.
  green: {
    look: folk(12, { skin: SKIN[1], hair: HAIR[1], style: 'short', top: C.red, bottom: C.grey, shoes: C.white, dress: false }),
    wear: (g, b) => {
      if (!Q.detail) return;
      if (b.back) { g.beginPath(); g.ellipse(0, b.top + 0.12, 0.24, 0.14, 0, 0, Math.PI * 2); paint(g, shade(C.red, 0.1), { lw: 0.03 }); return; }
      g.beginPath(); g.roundRect(-0.12, b.hipY - 0.35, 0.36, 0.2, 0.05); paint(g, shade(C.red, 0.1), { lw: 0.025 });
      g.fillStyle = C.white; g.fillRect(-0.18, b.top + 0.2, 0.4, 0.1);
    },
    head: (rain) => (rain ? (g, hy, back) => hoodUp(g, hy, back, C.red) : (g, hy, back) => cap(g, hy, back, C.white, true)),
    am: [['pong'], ['box', 'MISC']],
    pm: [['box', 'SCRUBS'], ['lamp']],
    idle: (h) => (h >= 20 || h < 6 ? pizza : h >= 9 && h < 13.5 ? phone : coffee),
    sit: (h) => h >= 9,
    rainGear: 'hood',
  },
  // The Yellow House: Dad, in a fleece and cargo shorts.
  yellow: {
    look: folk(42, { skin: SKIN[0], hair: HAIR[4], style: 'short', top: C.navy, bottom: SKIN[0], shoes: C.white, dress: false }),
    wear: wear(shorts(mix(C.leaf, C.brown, 0.45), true), (g, b) => { if (!b.back && Q.detail) stroke(g, [[0.02, b.top + 0.04], [0.02, b.top + 0.45]], C.greyLight, 0.03); }),
    head: () => (g, hy, back) => { cap(g, hy, back, C.teal); if (!back && Q.detail) { g.fillStyle = C.black; g.fillRect(-0.1, hy - 0.34, 0.34, 0.08); } },
    am: [['bike'], ['box', 'KIDS STUFF']],
    pm: [['box', 'BRAINTREE'], ['chair']],
    idle: () => coffee,
    sit: (h) => h >= 20 || h < 6,
    rainGear: 'umbrella',
  },
  // The Grey One: the Mover, in the company's purple shirt.
  grey: {
    look: folk(633, { skin: SKIN[3], hair: HAIR[6], style: 'short', top: C.purple, bottom: C.ink, hat: 'cap', dress: false }),
    wear: (g, b) => {
      if (!Q.detail) return;
      g.fillStyle = C.black; g.fillRect(-0.29, b.hipY - 0.3, 0.58, 0.18); // the back belt
      if (!b.back) { g.fillStyle = C.white; g.fillRect(0.02, b.top + 0.18, 0.18, 0.12); }
    },
    head: () => null,
    am: [['bikebox'], ['mirror']],
    pm: [['mattress'], ['box', 'FRAGILE']],
    idle: (h) => (h >= 9 && h < 13.5 ? phone : coffee),
    sit: (h) => h >= 9,
    rainGear: 'box',
  },
};
// What's in someone's arms: [hold, arms, overhead].
function load(item, flip, t) {
  switch (item[0]) {
    case 'pong': return [pong, [1.3, 1.0]];
    case 'lamp': return [(g) => lamp(g), [0.9, 0.6]];
    case 'chair': return [chair, CARRY];
    case 'bike': return [(g) => kidBike(g, t), [1.0, 0.9]];
    case 'mirror': return [mirror, CARRY];
    case 'bikebox': return [(g) => bikeBox(g, flip), CARRY];
    case 'mattress': return [null, OVERHEAD, (g, hy) => mattressUp(g, hy, t, true)];
    default: return [(g) => box(g, item[1], flip), CARRY];
  }
}
function trips(id, f, seed, name) {
  const steps = [curb(id, 0.4), { until: at(7.4) }];
  for (let k = 0; k < 2; k++) steps.push(...up(id, f), { wait: 2 }, ...down(id, f).map((p) => p), { wait: 2, carry: true });
  steps.push({ until: at(13.4) });
  for (let k = 0; k < 2; k++) steps.push(...up(id, f), { wait: 2 }, ...down(id, f), { wait: 2 });
  const who = MOVERS[id];
  return walker(`mover-${id}`, name, seed, steps, {
    color: C.teal,
    prep: legs,
    dress(t, p, w, legOf) {
      const h = hh(t), flip = p.dir === 'l', rain = wet(t, w);
      const { leg, trip, idle } = legOf(t);
      const am = h < 12.5;
      const loaded = (w.moving && leg === (am ? -1 : 1)) || !!p.carry;
      let hold = null, arms, over = null, pose, under = null, z = 0, speak = null, sayZ = 2.9;
      const headwear = [who.head(rain && who.rainGear === 'hood')];
      if (loaded) {
        const item = (am ? who.am : who.pm)[Math.min(trip, 1)];
        const [hd, a, top] = load(item, flip, t);
        // In the rain, a box goes up on the head.
        if (rain && item[0] === 'box' && who.rainGear !== 'hood') {
          arms = OVERHEAD;
          headwear.push((g, hy) => { g.save(); g.translate(0, hy - 0.2); box(g, item[1], flip, { x: -0.4, y: -0.56, w: 0.84, h: 0.54 }); g.restore(); if (Q.detail) drips(g, [-0.4, 0.44], hy - 0.2, t); });
        } else { hold = hd; arms = a; if (top) headwear.push(top); }
      } else if (idle) {
        // Waiting at the curb for the next half of the day.
        hold = who.idle(h);
        arms = [1.1, 0.2];
        if (who.sit(h)) { pose = 'sit'; z = -0.1; under = onBox; arms = [1.0, 0.5]; sayZ = 2.3; }
        if (rain && who.rainGear === 'umbrella') over = (ctx, q) => umbrella(ctx, q.x, q.y, q.z, C.teal);
        if (rain && who.rainGear === 'box') { hold = null; arms = OVERHEAD; headwear.push((g, hy) => { flatBox(g, hy); if (Q.detail) drips(g, [-0.6, 0.68], hy - 0.4, t); }); }
        if (id === 'yellow') speak = lines(t, am ? ['Who packed the kids?', 'Lift with your legs.'] : ['Braintree to Southie.', 'Honey, the chair.'], 17, 3, 3);
        if (id === 'green') speak = lines(t, h >= 20 || h < 6 ? ['Pizza\'s here.', 'We\'re not moving the futon.'] : ['Is the futon ours?', 'Bro.'], 19, 3, 8);
        if (id === 'grey') speak = lines(t, ['Wrong floor again.', 'On the clock.'], 23, 3, 12);
      } else if (rain && who.rainGear === 'box' && w.moving) {
        arms = OVERHEAD;
        headwear.push((g, hy) => flatBox(g, hy));
      }
      return {
        look: { ...who.look, wear: who.wear, hold, ...(arms ? { arms } : {}), face: face(...headwear) },
        pose, under, over, z, speak, sayZ,
      };
    },
  });
}

// ---------- The curb collector ----------
// Scruffy and delighted: a beard, a beanie, a flannel shirt, a garbage bag
// for a raincoat. He carries the curb's free things up the Yellow House one
// at a time (the couch, dragged and soaked; the dresser; the TV; the lamp
// with no shade), the hours in CURB (plan.js): Farragut Road loses each from
// the curb then, and the third floor gets it half an hour later.
const collectorLook = folk(61, { skin: SKIN[1], hair: HAIR[2], style: 'curly', top: C.red, bottom: C.grey, hat: 'beanie', shoes: C.brown, dress: false });
const beard = (g, hy, back) => {
  if (back) return;
  g.beginPath(); g.ellipse(0.12, hy + 0.2, 0.22, 0.15, 0, 0, Math.PI); g.fillStyle = HAIR[2]; g.fill();
  if (Q.detail) { g.beginPath(); g.arc(0.19, hy + 0.1, 0.07, 0.1, Math.PI - 0.1); g.strokeStyle = C.ink; g.lineWidth = 0.03; g.stroke(); }
};
// Flannel: a check over the shirt.
const flannel = (g, b) => {
  if (!Q.detail) return;
  g.strokeStyle = alpha(C.ink, 0.35); g.lineWidth = 0.035;
  g.beginPath();
  for (const x of [-0.14, 0.06]) { g.moveTo(x, b.top + 0.05); g.lineTo(x, b.hipY - 0.05); }
  for (const y of [b.top + 0.3, b.top + 0.6]) { g.moveTo(-0.26, y); g.lineTo(0.26, y); }
  g.stroke();
};
// The garbage bag poncho, shiny in the rain.
const bag = (g, b) => {
  g.beginPath(); g.moveTo(-0.24, b.top); g.lineTo(0.24, b.top); g.lineTo(0.4, b.hipY + 0.22); g.lineTo(-0.4, b.hipY + 0.22); g.closePath();
  paint(g, C.black, { lw: 0.03 });
  if (Q.detail) stroke(g, [[0.12, b.top + 0.15], [0.22, b.hipY]], alpha(C.white, 0.35), 0.04);
};
// A flashlight at night, looking for more.
const torch = (t) => (g) => {
  rect(g, 0.44, -0.12, 0.26, 0.1, C.grey, 0.02);
  if (!Q.detail) return;
  const a = Math.sin(t * 0.8) * 0.2;
  g.save(); g.translate(0.7, -0.07); g.rotate(0.5 + a);
  g.beginPath(); g.moveTo(0, -0.05); g.lineTo(1.4, -0.35); g.lineTo(1.4, 0.35); g.lineTo(0, 0.05); g.closePath();
  g.fillStyle = alpha(C.butter, 0.4); g.fill();
  g.restore();
};
const collector = (() => {
  const steps = [curb('yellow', 1.2), { until: at(13.1) }];
  for (const h of CURB) steps.push({ until: at(h) }, ...up('yellow', 2), { wait: 1.5 }, ...down('yellow', 2));
  return walker('collector', 'Collector', 61, steps, {
    color: C.mustard, speed: 2.6,
    prep: legs,
    dress(t, p, w, legOf) {
      const h = hh(t), flip = p.dir === 'l', rain = wet(t, w);
      const { leg } = legOf(t);
      // Which of the curb's things: the last CURB hour he's set off at.
      let n = -1;
      for (let i = 0; i < CURB.length; i++) if (h >= CURB[i] - 0.01) n = i;
      const loaded = w.moving && leg === 1 && n >= 0;
      let hold = null, arms, under = null, pose, speak = null;
      if (loaded) {
        if (n === 0) { arms = DRAG; under = (ctx, q) => feet(ctx, q, (g) => couch(g, t, h < 18)); pose = 'walk'; }
        else if (n === 1) { hold = dresser; arms = CARRY; }
        else if (n === 2) { hold = tv; arms = CARRY; }
        else { hold = (g) => lamp(g, true); arms = [0.9, 0.6]; }
      } else if (!w.moving && w.z > G + FH * 1.5) {
        pose = 'cheer';
        speak = ['Free couch!', 'Free dresser!', 'Free TV!', 'Free lamp!'][Math.max(0, n)];
      } else if (!w.moving) {
        // At the curb, eyeing the pile (and, at night, what's left of it).
        if (h >= 20 || h < 6) { hold = torch(t); arms = [1.3, 0.2]; speak = lines(t, ['Not the mattress.', 'Anything else free?'], 13, 3, 1); }
        else if (h < 13.1) { pose = now(t, 9, 4) ? 'point' : 'stand'; speak = h > 8 ? lines(t, ['Is that free?', 'Dibs.', 'Southie Christmas!'], 10, 3, 6) : null; }
        else speak = lines(t, ['Is that free?', 'Merry Christmas.'], 12, 3, 2);
      }
      return {
        look: { ...collectorLook, hold, ...(arms ? { arms } : {}), wear: rain ? bag : flannel, face: beard },
        pose, under, speak,
        sayZ: 3.1,
      };
    },
  });
})();

export const walkers = [
  courier,
  landlady,
  trips('green', 1, 12, 'Roommate'),
  trips('yellow', 0, 42, 'Dad'),
  trips('grey', 1, 91, 'Mover'),
  collector,
];
