// Main Street: the cross through the middle of the block, and the party being
// built at the crossroads all day. At dawn the stage is a bare frame and a
// pile of planks; by noon it has a deck, by 3pm a backdrop, lights and the
// band's gear, and at 7pm the whole block is out there. Bunting goes up
// through the morning, the bouncy castle won't stay up (someone keeps sitting
// on the pump), the bin lorry can't get past the sign (a walker, in day.js)
// and the laundromat's sheet becomes the banner.
//
// Speed: a street is drawn in 16 x 16 chunks, and each chunk draws every flat
// layer. So the road is printed in pieces, one per chunk (each only drawn by
// the chunks it reaches), and everything that changes with the hour is a
// still picture shown only in its hours (on), not an animated one.
import {
  C, Q, P, box, rect, disc, cylinder, face, poly, paint, paintText, person, folk, speech, label, note, tint, shade, alpha, goose,
} from '../../../engine/art.js';
import { SLAB } from '../../../engine/iso.js';
import { particles, ease } from '../../../engine/actors.js';
import { MAIN_STREET, MAIN0, MAIN1, MID, STAGE, STAGE_Z, CASTLE } from '../plan.js';
import { conga } from '../finale.js';
import { STREET, STREET_NIGHT, STAGE_INK, PARTY_LIGHT, BUNTING, bunting, board, cone, streetLamp, litter, onFloor } from '../style.js';
import { hour, nightK, within, LAUNCH } from '../clock.js';

// ---------- The day ----------
// Shown from hour a to hour b (b < a runs past midnight).
const during = (a, b) => (t) => {
  const h = hour(t);
  return a <= b ? h >= a && h < b : h >= a || h < b;
};
// 0 to 1 over [a, b], easing in and out over r hours.
const ramp = (a, b, r = 0.3) => (t) => within([a, b], hour(t), r);

const FRAME = during(5, 9); // the stage: a bare frame and a pile of planks
const HALF = during(9, 12); // half a deck
const DECK = during(12, 5); // the deck, till dawn
const SCAFFOLD = during(12, 13.5); // the backdrop's frame
const BACKDROP = during(13.5, 5);
const GEAR = during(14.5, 5); // the band's gear, the truss, the speakers
const LIGHTS = during(15, 23.5); // on for the sound check at 3pm, chasing at the party
const MIXING = during(14.5, 23.6);
const BUILDING = during(5, 12);
const CASTLE_UP = during(9, 20);
const BANNER = during(12.5, 5); // the laundromat's sheet
const PARTY = [18.7, 22.8]; // the extras' party (the named crowd walks in, day.js)

// ---------- The stage ----------
const [SX, SY, SW, SD] = STAGE; // 37.4, 37.4, 6.2, 6.2
const SX1 = SX + SW, SY1 = SY + SD;
const SZ = STAGE_Z; // the deck's height
const TOP = SZ + 7; // the backdrop's top
const T = 0.3; // the backdrop's thickness
const CUT = SW / 3; // the deck and backdrop are cut in thirds, so the band sorts in

// ---------- The road ----------
const has = (x, y) => MAIN_STREET.some((r) => x >= r[0] && x < r[2] && y >= r[1] && y < r[3]);
// The pieces the engine draws it in: every box of the street, cut on 16s.
const PARTS = [];
for (const [x0, y0, x1, y1] of MAIN_STREET) {
  for (let x = Math.floor(x0 / 16) * 16; x < x1; x += 16) {
    for (let y = Math.floor(y0 / 16) * 16; y < y1; y += 16) {
      const r = [Math.max(x0, x), Math.max(y0, y), Math.min(x1, x + 16), Math.min(y1, y + 16)];
      if (r[2] > r[0] && r[3] > r[1]) PARTS.push(r);
    }
  }
}
// The pieces of [a, b] where out(u) is true, in half units.
function runs(a, b, out) {
  const res = [];
  let s = null;
  for (let u = a; u < b - 1e-6; u += 0.5) {
    const o = out(Math.min(u + 0.25, b));
    if (o && s === null) s = u;
    if (!o && s !== null) { res.push([s, u]); s = null; }
  }
  if (s !== null) res.push([s, b]);
  return res;
}

// One piece of road: the slab where the street ends in front, the tarmac,
// and a kerb wherever it meets something else.
function ground(ctx, ink, [x0, y0, x1, y1]) {
  for (const [a, b] of runs(y0, y1, (v) => !has(x1 + 0.01, v))) {
    face(ctx, [[x1, a, 0], [x1, b, 0], [x1, b, -SLAB], [x1, a, -SLAB]], shade(ink.slab, 0.12), { lw: 0.04 });
  }
  for (const [a, b] of runs(x0, x1, (u) => !has(u, y1 + 0.01))) {
    face(ctx, [[a, y1, 0], [b, y1, 0], [b, y1, -SLAB], [a, y1, -SLAB]], shade(ink.slab, 0.3), { dots: shade(ink.slab, 0.6), density: 0.25, lw: 0.04 });
  }
  rect(ctx, x0, y0, x1 - x0, y1 - y0, 0, ink.road, { stroke: false, dots: ink.roadDots, density: 0.07 });
  const K = 0.32;
  const kerb = (x, y, w, d) => rect(ctx, x, y, w, d, 0, ink.kerb, { lw: 0.03, stroke: shade(ink.kerb, 0.35) });
  for (const [a, b] of runs(y0, y1, (v) => !has(x0 - 0.01, v))) kerb(x0, a, K, b - a);
  for (const [a, b] of runs(y0, y1, (v) => !has(x1 + 0.01, v))) kerb(x1 - K, a, K, b - a);
  for (const [a, b] of runs(x0, x1, (u) => !has(u, y0 - 0.01))) kerb(a, y0, b - a, K);
  for (const [a, b] of runs(x0, x1, (u) => !has(u, y1 + 0.01))) kerb(a, y1 - K, b - a, K);
}

// Everything painted, chalked or skidded on the road: { b: its box, d(ctx, ink) }.
const MARKS = [];
const mark = (b, d) => MARKS.push({ b, d });
const chalk = (ink) => (ink === STREET ? alpha(C.white, 0.85) : alpha(ink.line, 0.6));
const rubber = (ink) => (ink === STREET ? alpha(shade(ink.road, 0.5), 0.55) : alpha(C.night, 0.6));

// The dashes down the middle, both ways, missing the crossings and the chalk.
const skip = (v, gaps) => gaps.some(([a, b]) => v > a - 1.2 && v < b + 0.2);
for (let y = 0.6; y < MAIN0 - 1; y += 2) if (!skip(y, [[10, 12]])) mark([MID - 0.1, y, MID + 0.1, y + 1.1], (c, ink) => rect(c, MID - 0.1, y, 0.2, 1.1, 0, ink.line, { stroke: false }));
for (let y = MAIN1 + 0.6; y < 80; y += 2) if (!skip(y, [[60, 62], [64.4, 68.6]])) mark([MID - 0.1, y, MID + 0.1, y + 1.1], (c, ink) => rect(c, MID - 0.1, y, 0.2, 1.1, 0, ink.line, { stroke: false }));
for (let x = 0.6; x < MAIN0 - 1; x += 2) if (!skip(x, [[4.5, 12.5], [17.5, 19.5], [21.6, 26]])) mark([x, MID - 0.1, x + 1.1, MID + 0.1], (c, ink) => rect(c, x, MID - 0.1, 1.1, 0.2, 0, ink.line, { stroke: false }));
for (let x = MAIN1 + 0.6; x < 80; x += 2) if (!skip(x, [[66, 68]])) mark([x, MID - 0.1, x + 1.1, MID + 0.1], (c, ink) => rect(c, x, MID - 0.1, 1.1, 0.2, 0, ink.line, { stroke: false }));

// Zebra crossings, one on each arm.
function zebra(alongY, at) {
  if (alongY) {
    for (let x = MAIN0 + 0.7; x < MAIN1 - 0.8; x += 1) mark([x, at, x + 0.55, at + 2], (c, ink) => rect(c, x, at, 0.55, 2, 0, ink.line, { stroke: false }));
  } else {
    for (let y = MAIN0 + 0.7; y < MAIN1 - 0.8; y += 1) mark([at, y, at + 2, y + 0.55], (c, ink) => rect(c, at, y, 2, 0.55, 0, ink.line, { stroke: false }));
  }
}
zebra(true, 10);
zebra(true, 60);
zebra(false, 17.5);
zebra(false, 66);

// Manhole covers and drains.
for (const [x, y] of [[MID, 14.5], [13.5, 42.6], [62.5, 38.6], [MID, 71]]) {
  mark([x - 0.7, y - 0.7, x + 0.7, y + 0.7], (c, ink) => {
    disc(c, x, y, 0, 0.6, ink.drain, { lw: 0.04 });
    if (!Q.detail) return;
    disc(c, x, y, 0, 0.42, null, { lw: 0.03, stroke: ink.roadDots });
    for (const d of [-0.2, 0, 0.2]) face(c, [[x - 0.35, y + d, 0], [x + 0.35, y + d, 0]], null, { lw: 0.03, stroke: ink.roadDots });
  });
}
for (const [x, y, alongY] of [[MAIN0 + 0.55, 19, true], [MAIN1 - 0.55, 30, true], [MAIN0 + 0.55, 64, true], [MAIN1 - 0.55, 52, true], [29, MAIN0 + 0.55, false], [12, MAIN1 - 0.55, false], [60, MAIN1 - 0.55, false], [76, MAIN0 + 0.55, false]]) {
  const w = alongY ? 0.4 : 1, d = alongY ? 1 : 0.4;
  mark([x - w / 2, y - d / 2, x + w / 2, y + d / 2], (c, ink) => {
    rect(c, x - w / 2, y - d / 2, w, d, 0, ink.drain, { lw: 0.03 });
    if (!Q.detail) return;
    for (let k = 1; k < 5; k++) {
      const f = -0.5 + k / 5;
      face(c, alongY ? [[x - 0.15, y + f * d, 0], [x + 0.15, y + f * d, 0]] : [[x + f * w, y - 0.15, 0], [x + f * w, y + 0.15, 0]], null, { lw: 0.04, stroke: ink.road });
    }
  });
}

// Where the bin lorry keeps stopping (and backing off): skid marks.
mark([MID - 1.3, 26, MID + 1.3, 31.8], (c, ink) => {
  c.strokeStyle = rubber(ink);
  c.lineCap = 'round';
  for (const [dx, y0, y1, w] of [[-0.95, 26.3, 31.5, 0.22], [0.95, 26.3, 31.5, 0.22], [-0.8, 27.4, 30.9, 0.12], [0.8, 27.4, 30.9, 0.12]]) {
    c.lineWidth = w;
    c.beginPath();
    for (let k = 0; k <= 8; k++) {
      const y = y0 + ((y1 - y0) * k) / 8;
      const [X, Y] = P(MID + dx + Math.sin(k * 0.9 + dx) * 0.08, y, 0);
      k ? c.lineTo(X, Y) : c.moveTo(X, Y);
    }
    c.stroke();
  }
});

// Chalk: a hopscotch, a sun and somebody's opinion.
mark([21.6, 38.8, 26.2, 42.4], (c, ink) => {
  const s = chalk(ink), o = { stroke: s, lw: 0.07 };
  const boxes = [[22, 40], [22.9, 40], [23.8, 39.5], [23.8, 40.5], [24.7, 40], [25.6, 39.5], [25.6, 40.5]];
  for (const [x, y] of boxes) face(c, [[x, y, 0], [x + 0.9, y, 0], [x + 0.9, y + 1, 0], [x, y + 1, 0]], null, o);
  if (!Q.detail) return;
  boxes.forEach(([x, y], i) => paintText(c, 'floor', x + 0.45, y + 0.5, String(i + 1), 0.45, s));
  disc(c, 22.8, 42.0, 0, 0.3, null, o);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    face(c, [[22.8 + Math.cos(a) * 0.4, 42.0 + Math.sin(a) * 0.4, 0], [22.8 + Math.cos(a) * 0.6, 42.0 + Math.sin(a) * 0.6, 0]], null, o);
  }
});
mark([24.5, 41.8, 27.5, 42.6], (c, ink) => { if (Q.detail) paintText(c, 'floor', 26.1, 42.1, 'BINS OUT', 0.36, chalk(ink), 'Rethink Sans'); });

// Painted on the road by the council, for once on topic.
mark([38, 64.5, 43, 68.5], (c, ink) => {
  paintText(c, 'floor', MID, 65.6, 'SLOW', 1.3, ink.line);
  paintText(c, 'floor', MID, 67.5, 'GEESE', 1.3, ink.line);
});

// Print the road in pieces, each only reaching the chunks it touches: its
// day inks as a still layer, the night inks fading in over them with the dark.
function printRoad(R) {
  const pieces = PARTS.map((part) => {
    const mine = MARKS.filter(({ b }) => {
      const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
      return cx >= part[0] && cx < part[2] && cy >= part[1] && cy < part[3];
    });
    const area = [part[0] - 1, part[1] - 1, part[2] + 1, part[3] + 1];
    for (const { b } of mine) {
      area[0] = Math.min(area[0], b[0] - 1); area[1] = Math.min(area[1], b[1] - 1);
      area[2] = Math.max(area[2], b[2] + 1); area[3] = Math.max(area[3], b[3] + 1);
    }
    return { part, mine, area };
  });
  // Ground first everywhere, then the marks, so a mark over a seam isn't
  // covered by the next piece's tarmac.
  for (const [ink, o] of [[STREET, {}], [STREET_NIGHT, { fade: nightK }]]) {
    for (const p of pieces) R.floor((ctx) => ground(ctx, ink, p.part), o).area = p.area;
    for (const p of pieces) if (p.mine.length) R.floor((ctx) => { for (const m of p.mine) m.d(ctx, ink); }, o).area = p.area;
  }
}

// ---------- Small helpers ----------
// Words painted on an upright plane: plane 'x' is x = c (u runs along y),
// 'y' is y = c (u along x). v is the height.
function words(ctx, plane, c, u, v, text, size, color, font) {
  ctx.save();
  const [dx, dy] = plane === 'x' ? P(c, 0, 0) : P(0, c, 0);
  ctx.translate(dx, dy);
  paintText(ctx, plane === 'x' ? 'left' : 'right', u, v, text, size, color, font);
  ctx.restore();
}
const line = (ctx, a, b, color = C.ink, lw = 0.06) => face(ctx, [a, b], null, { stroke: color, lw });

// A balloon on a string, from (X, Y) on screen, bobbing at t.
function balloon(ctx, X, Y, color, t, k = 0) {
  const bx = X + Math.sin(t * 1.3 + k) * 0.12, by = Y - 1.5 + Math.sin(t * 1.7 + k) * 0.06;
  ctx.beginPath();
  ctx.moveTo(X, Y);
  ctx.quadraticCurveTo(X + 0.15, Y - 0.7, bx, by + 0.34);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.025;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(bx, by, 0.27, 0.34, 0, 0, Math.PI * 2);
  paint(ctx, color, { lw: 0.035 });
  if (Q.detail) {
    ctx.beginPath();
    ctx.ellipse(bx - 0.09, by - 0.12, 0.05, 0.09, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = alpha(C.white, 0.7);
    ctx.fill();
  }
}

// ---------- The stage, piece by piece ----------
// A third of the deck, by the thirds i (along x) and j (along y). The skirt
// shows on the front faces; outlines only round the outside.
function deckPiece(ctx, i, j) {
  const x0 = SX + i * CUT, y0 = SY + j * CUT, x1 = x0 + CUT, y1 = y0 + CUT;
  const lw = 0.05;
  if (i === 2) {
    const pts = [[x1, y0, 0], [x1, y1, 0], [x1, y1, SZ], [x1, y0, SZ]];
    face(ctx, pts, shade(STAGE_INK.skirt, 0.08), { stroke: false, dots: shade(STAGE_INK.skirt, 0.45), density: 0.12 });
    skirtArt(ctx, pts, 'x');
    line(ctx, [x1, y0, 0], [x1, y1, 0], C.ink, lw);
    if (j === 0) line(ctx, [x1, y0, 0], [x1, y0, SZ], C.ink, lw);
  }
  if (j === 2) {
    const pts = [[x0, y1, 0], [x1, y1, 0], [x1, y1, SZ], [x0, y1, SZ]];
    face(ctx, pts, shade(STAGE_INK.skirt, 0.22), { stroke: false, dots: shade(STAGE_INK.skirt, 0.55), density: 0.2 });
    skirtArt(ctx, pts, 'y');
    line(ctx, [x0, y1, 0], [x1, y1, 0], C.ink, lw);
    if (i === 0) line(ctx, [x0, y1, 0], [x0, y1, SZ], C.ink, lw);
    if (i === 2) line(ctx, [x1, y1, 0], [x1, y1, SZ], C.ink, lw);
  }
  // The boards.
  rect(ctx, x0, y0, CUT, CUT, SZ, STAGE_INK.deck, { stroke: false });
  if (Q.detail) {
    ctx.strokeStyle = STAGE_INK.boards;
    ctx.lineWidth = 0.025;
    ctx.beginPath();
    for (let y = SY + 0.52; y < SY1; y += 0.52) {
      if (y <= y0 || y >= y1) continue;
      const [a, b] = [P(x0, y, SZ), P(x1, y, SZ)];
      ctx.moveTo(...a);
      ctx.lineTo(...b);
    }
    // board ends, staggered
    for (let y = SY; y < SY1 - 0.1; y += 0.52) {
      if (y < y0 - 0.01 || y >= y1) continue;
      const x = x0 + ((y * 7.3) % CUT);
      const [a, b] = [P(x, y, SZ), P(x, Math.min(y + 0.52, y1), SZ)];
      ctx.moveTo(...a);
      ctx.lineTo(...b);
    }
    ctx.stroke();
  }
  // The edges.
  if (i === 2) line(ctx, [x1, y0, SZ], [x1, y1, SZ], C.ink, lw);
  if (j === 2) line(ctx, [x0, y1, SZ], [x1, y1, SZ], C.ink, lw);
}
// The front skirt: a scalloped trim and the band's name, cut to this piece.
function skirtArt(ctx, pts, plane) {
  if (!Q.detail) return;
  ctx.save();
  poly(ctx, pts);
  ctx.clip();
  // scallops along the top
  const at = (u, z) => (plane === 'x' ? [SX1, u, z] : [u, SY1, z]);
  for (let u = SX; u < SX1; u += 0.62) {
    ctx.beginPath();
    const [a, b] = [P(...at(u, SZ)), P(...at(u + 0.62, SZ))];
    const m = P(...at(u + 0.31, SZ - 0.32));
    ctx.moveTo(...a);
    ctx.quadraticCurveTo(m[0], m[1] + 0.1, ...b);
    ctx.closePath();
    ctx.fillStyle = C.mustard;
    ctx.fill();
  }
  if (plane === 'y') words(ctx, 'y', SY1, MID, 0.62, 'THE HONKS', 0.62, C.butter);
  else words(ctx, 'x', SX1, MID, 0.62, 'LIVE 7PM', 0.56, C.butter);
  ctx.restore();
}

// The backdrop: two walls along the stage's back edges, each in thirds.
// Wall A stands at x = SX (its face toward the stage at x = SX + T), wall B
// at y = SY. "BLOCK" on one, "PARTY" on the other, halftone, bunting on top.
function wallA(ctx, k) {
  const ya = SY + k * CUT, yb = ya + CUT, x = SX + T;
  const pts = [[x, ya, SZ], [x, yb, SZ], [x, yb, TOP], [x, ya, TOP]];
  face(ctx, pts, STAGE_INK.backdrop, { stroke: false, dots: STAGE_INK.backdropDots, density: 0.22 });
  backdropArt(ctx, pts, 'x', x);
  face(ctx, [[SX, ya, TOP], [x, ya, TOP], [x, yb, TOP], [SX, yb, TOP]], tint(STAGE_INK.backdrop, 0.2), { stroke: false });
  line(ctx, [x, ya, TOP], [x, yb, TOP]);
  line(ctx, [x, ya, SZ], [x, yb, SZ], C.ink, 0.04);
  if (k === 2) {
    face(ctx, [[SX, SY1, SZ], [x, SY1, SZ], [x, SY1, TOP], [SX, SY1, TOP]], shade(STAGE_INK.backdrop, 0.3), { lw: 0.04 });
  }
}
function wallB(ctx, k) {
  const xa = Math.max(SX + T, SX + k * CUT), xb = SX + (k + 1) * CUT, y = SY + T;
  const pts = [[xa, y, SZ], [xb, y, SZ], [xb, y, TOP], [xa, y, TOP]];
  face(ctx, pts, shade(STAGE_INK.backdrop, 0.12), { stroke: false, dots: STAGE_INK.backdropDots, density: 0.3 });
  backdropArt(ctx, pts, 'y', y);
  face(ctx, [[xa, SY, TOP], [xb, SY, TOP], [xb, y, TOP], [xa, y, TOP]], tint(STAGE_INK.backdrop, 0.2), { stroke: false });
  line(ctx, [xa, y, TOP], [xb, y, TOP]);
  line(ctx, [xa, y, SZ], [xb, y, SZ], C.ink, 0.04);
  if (k === 0) line(ctx, [SX + T, y, SZ], [SX + T, y, TOP]); // the inside corner
  if (k === 2) {
    face(ctx, [[SX1, SY, SZ], [SX1, y, SZ], [SX1, y, TOP], [SX1, SY, TOP]], shade(STAGE_INK.backdrop, 0.3), { lw: 0.04 });
  }
}
// What's painted on the backdrop, cut to one third of it.
function backdropArt(ctx, pts, plane, c) {
  ctx.save();
  poly(ctx, pts);
  ctx.clip();
  const at = (u, z) => (plane === 'x' ? [c, u, z] : [u, c, z]);
  const [u0, u1] = plane === 'x' ? [SY, SY1] : [SX, SX1];
  const mid = (u0 + u1) / 2;
  // A coral trim along the top, and the bunting hanging off it.
  face(ctx, [at(u0, TOP - 0.4), at(u1, TOP - 0.4), at(u1, TOP), at(u0, TOP)], C.coral, { stroke: false });
  const big = plane === 'x' ? 'BLOCK' : 'PARTY';
  // The big letters, with an ink shadow.
  ctx.save();
  ctx.translate(0.09, 0.09);
  words(ctx, plane, c, mid, 5.35, big, 1.62, C.ink);
  ctx.restore();
  words(ctx, plane, c, mid, 5.35, big, 1.62, STAGE_INK.sign);
  if (Q.detail) {
    // The flags under the trim.
    let n = 0;
    for (let u = u0 + 0.05; u < u1 - 0.3; u += 0.52, n++) {
      face(ctx, [at(u, TOP - 0.4), at(u + 0.42, TOP - 0.4), at(u + 0.21, TOP - 0.95)], BUNTING[n % BUNTING.length], { lw: 0.025 });
    }
    // Stars, and the small print.
    for (const [du, z] of [[-2.4, 3.1], [2.5, 7.0], [-2.6, 7.1], [2.2, 3.4], [0.2, 6.9]]) star(ctx, at(mid + du, z), 0.22);
    if (plane === 'x') words(ctx, plane, c, mid, 3.5, 'TONIGHT 7PM', 0.55, C.white);
    else {
      words(ctx, plane, c, mid, 3.6, 'ALL WELCOME*', 0.5, C.white);
      words(ctx, plane, c, mid, 2.85, '*even geese', 0.34, C.butter, 'Rethink Sans');
    }
    // The festoon along the top, its bulbs off (the lights layer lights them).
    for (const u of FESTOON(u0, u1)) {
      const [X, Y] = P(...at(u, TOP - 0.1));
      ctx.beginPath();
      ctx.arc(X, Y + 0.12, 0.09, 0, Math.PI * 2);
      paint(ctx, C.greyLight, { lw: 0.025 });
    }
  }
  ctx.restore();
}
const FESTOON = (u0, u1) => { const r = []; for (let u = u0 + 0.35; u < u1 - 0.2; u += 0.62) r.push(u); return r; };
function star(ctx, [x, y, z], r) {
  const [X, Y] = P(x, y, z);
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, rr = i % 2 ? r * 0.35 : r;
    ctx.lineTo(X + Math.cos(a) * rr, Y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = C.butter;
  ctx.fill();
}

// Before the backdrop: its frame of timber, going up at noon.
function scaffold(ctx) {
  const post = (x, y) => box(ctx, x - 0.1, y - 0.1, SZ, 0.2, 0.2, TOP - SZ, C.wood, { flat: true, lw: 0.03 });
  for (let k = 0; k <= 3; k++) post(SX + 0.15, SY + k * CUT - (k === 3 ? 0.15 : 0) + (k === 0 ? 0.15 : 0));
  for (let k = 1; k <= 3; k++) post(SX + k * CUT - (k === 3 ? 0.15 : 0), SY + 0.15);
  for (const z of [SZ + 2.3, SZ + 4.6, TOP - 0.1]) {
    line(ctx, [SX + 0.15, SY + 0.15, z], [SX + 0.15, SY1 - 0.15, z], C.wood, 0.14);
    line(ctx, [SX + 0.15, SY + 0.15, z], [SX1 - 0.15, SY + 0.15, z], C.wood, 0.14);
  }
  // Half a purple flat leant against it, and a pot of paint.
  face(ctx, [[SX + 0.3, SY + 0.4, SZ], [SX + 0.3, SY + 2.4, SZ], [SX + 0.1, SY + 2.4, SZ + 3.2], [SX + 0.1, SY + 0.4, SZ + 3.2]], STAGE_INK.backdrop, { dots: STAGE_INK.backdropDots, density: 0.22, lw: 0.04 });
  cylinder(ctx, SX + 1.0, SY + 2.9, SZ, 0.22, 0.35, C.white, { top: STAGE_INK.backdrop });
}

// The morning: a frame of posts and joists, then half a deck.
function frame(ctx, half) {
  const xs = [SX + 0.1, SX + CUT, SX + 2 * CUT, SX1 - 0.25], ys = xs.map((x) => x - SX + SY);
  const posts = [];
  for (const x of xs) for (const y of ys) posts.push([x, y]);
  posts.sort((a, b) => a[0] + a[1] - b[0] - b[1]);
  const post = ([x, y]) => box(ctx, x, y, 0, 0.18, 0.18, SZ - 0.1, C.wood, { flat: true, lw: 0.03 });
  const deckY = SY + CUT * 1.5;
  for (const p of posts) if (!half || p[1] < deckY - 0.3) post(p);
  // joists
  for (const y of ys) line(ctx, [SX, y + 0.09, SZ - 0.08], [SX1, y + 0.09, SZ - 0.08], C.woodLight, 0.12);
  line(ctx, [SX, SY, SZ - 0.08], [SX, SY1, SZ - 0.08], C.woodLight, 0.12);
  line(ctx, [SX1, SY, SZ - 0.08], [SX1, SY1, SZ - 0.08], C.woodLight, 0.12);
  if (half) {
    box(ctx, SX, SY, SZ - 0.12, SW, deckY - SY, 0.12, STAGE_INK.deck, { flat: true, lw: 0.04 });
    if (Q.detail) {
      for (let y = SY + 0.52; y < deckY; y += 0.52) line(ctx, [SX, y, SZ], [SX1, y, SZ], STAGE_INK.boards, 0.025);
    }
    // a few loose boards laid across the joists
    for (const [y, dx] of [[deckY + 0.6, 0.3], [deckY + 1.5, -0.2]]) box(ctx, SX + 0.4 + dx, y, SZ - 0.08, SW - 0.6, 0.4, 0.06, STAGE_INK.deck, { flat: true, lw: 0.03 });
    for (const p of posts) if (p[1] >= deckY - 0.3) post(p);
  } else {
    // cross braces
    for (const x of xs) line(ctx, [x + 0.09, SY, 0.1], [x + 0.09, SY1, SZ - 0.2], C.wood, 0.06);
  }
}

// A speaker stack: two cabinets, cones on the faces you see.
function speakers(ctx, x, y, w, d) {
  const h = 1.1;
  for (let k = 0; k < 2; k++) {
    const z = SZ + k * h;
    box(ctx, x, y, z, w, d, h - 0.04, C.ink, { lw: 0.04, left: shade(C.ink, 0.1), right: tint(C.ink, 0.12) });
    if (!Q.detail) continue;
    // cones: on the left face (y + d) and the right one (x + w)
    for (const [cx, cy, r] of [[x + w / 2, y + d, 0.36], [x + w, y + d / 2, 0.3]]) {
      const [X, Y] = P(cx, cy, z + h / 2);
      ctx.beginPath();
      ctx.ellipse(X, Y, r * 0.75, r, 0, 0, Math.PI * 2);
      paint(ctx, C.grey, { lw: 0.03 });
      ctx.beginPath();
      ctx.ellipse(X, Y, r * 0.3, r * 0.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = C.ink;
      ctx.fill();
    }
  }
}

// The drum kit, in front of the drummer (who stands at 39.0, 39.2).
function drums(ctx) {
  const z = SZ;
  // hi-hat on the left, a crash on the right
  line(ctx, [38.9, 39.95, z], [38.9, 39.95, z + 1.25], C.greyLight, 0.05);
  disc(ctx, 38.9, 39.95, z + 1.25, 0.3, C.mustard, { lw: 0.03 });
  line(ctx, [40.25, 39.0, z], [40.25, 39.0, z + 1.55], C.greyLight, 0.05);
  disc(ctx, 40.25, 39.0, z + 1.55, 0.36, C.mustard, { lw: 0.03 });
  // floor tom, snare
  cylinder(ctx, 40.35, 39.55, z, 0.28, 0.6, C.coral, { top: C.white });
  cylinder(ctx, 39.25, 39.85, z + 0.6, 0.24, 0.2, C.white, { top: C.white });
  line(ctx, [39.25, 39.85, z], [39.25, 39.85, z + 0.6], C.greyLight, 0.05);
  // the bass drum, facing out, with the band on its head
  const [X, Y] = P(39.85, 40.0, z + 0.46);
  ctx.beginPath();
  ctx.ellipse(X, Y, 0.5, 0.46, 0, 0, Math.PI * 2);
  paint(ctx, C.coral, { lw: 0.04 });
  ctx.beginPath();
  ctx.ellipse(X, Y, 0.4, 0.37, 0, 0, Math.PI * 2);
  paint(ctx, C.white, { lw: 0.02 });
  if (Q.detail) label(ctx, 39.85, 40.0, z + 0.46, 'HONK', 0.2, C.coral);
  // a tom on top
  cylinder(ctx, 39.7, 39.8, z + 0.95, 0.2, 0.2, C.coral, { top: C.white });
}

// ---------- The bouncy castle ----------
const [KX, KY, KW, KD] = CASTLE; // 5, 38.4, 5, 4.2
const PUMP = [KX + KW + 1.3, KY + 1.8]; // the blower, a step off its side
const CYCLE = 26;
// How far up it is (0.12 flat to 0.95): up it goes, nearly there, then
// someone sits on the pump and it sags, till they get up again.
function puff(t) {
  const c = ((t % CYCLE) + CYCLE) % CYCLE;
  if (c < 17) return 0.12 + 0.83 * ease(c / 17);
  if (c < 18) return 0.95;
  if (c < 25) return 0.95 - 0.83 * ((c - 18) / 7);
  return 0.12;
}
// A wall with battlements, from a to b (floor points), standing zb to zt.
function battlement(ctx, a, b, zb, zt, color) {
  const n = 6, pts = [[a[0], a[1], zb], [b[0], b[1], zb]];
  for (let i = n; i >= 0; i--) {
    const k = i / n, x = a[0] + (b[0] - a[0]) * k, y = a[1] + (b[1] - a[1]) * k;
    const up = i % 2 ? 0 : 0.25;
    pts.push([x, y, zt + up]);
  }
  face(ctx, pts, color, { dots: shade(color, 0.4), density: 0.15, lw: 0.04 });
}
function turret(ctx, x, y, z, h, color, roof) {
  cylinder(ctx, x, y, z, 0.42, h, color, { top: color });
  const [X, Y] = P(x, y, z + h), [, Yt] = P(x, y, z + h + 0.9);
  ctx.beginPath();
  ctx.moveTo(X - 0.62, Y);
  ctx.lineTo(X, Yt);
  ctx.lineTo(X + 0.62, Y);
  ctx.ellipse(X, Y, 0.62, 0.3, 0, 0, Math.PI);
  paint(ctx, roof, { lw: 0.04 });
}
// boost: the pump, tapped (0 to 1): up it goes, whoever's sitting on it.
function castle(ctx, t, boost = 0) {
  const k = Math.max(puff(t), 0.12 + 0.83 * boost), c = ((t % CYCLE) + CYCLE) % CYCLE;
  const base = 0.2 + 0.35 * k, wall = 0.25 + 1.5 * k, tower = 0.3 + 2.1 * k;
  const x0 = KX, y0 = KY, x1 = KX + KW, y1 = KY + KD;
  box(ctx, x0, y0, 0, KW, KD, base, C.coral, { top: C.butter, lw: 0.04 });
  turret(ctx, x0 + 0.3, y0 + 0.3, 0, tower, C.mustard, C.coral);
  battlement(ctx, [x0 + 0.5, y0 + 0.25], [x1 - 0.5, y0 + 0.25], base, base + wall, C.teal);
  battlement(ctx, [x0 + 0.25, y1 - 0.5], [x0 + 0.25, y0 + 0.5], base, base + wall, shade(C.teal, 0.1));
  turret(ctx, x1 - 0.3, y0 + 0.3, 0, tower, C.mustard, C.coral);
  turret(ctx, x0 + 0.3, y1 - 0.3, 0, tower, C.mustard, C.coral);
  // Kids: bouncing while it's up, stuck in the sag while it isn't.
  const up = k > 0.6;
  [[6.6, 39.8, 61], [8.5, 40.3, 67], [7.2, 41.5, 73]].forEach(([x, y, s], i) => {
    const o = { ...folk(s), scale: 0.62, pose: up ? 'jump' : 'sit', dir: i % 2 ? 'l' : 'r', phase: i * 1.7, speed: 6 };
    person(ctx, x, y, base - (up ? 0 : 0.15), o, t);
  });
  // The front walls, lower, then the last turret.
  battlement(ctx, [x0 + 0.5, y1 - 0.2], [x1 - 0.5, y1 - 0.2], base, base + wall * 0.5, C.pink);
  battlement(ctx, [x1 - 0.2, y0 + 0.5], [x1 - 0.2, y1 - 0.5], base, base + wall * 0.5, tint(C.pink, 0.1));
  if (Q.detail && k > 0.45) words(ctx, 'y', y1 - 0.2, (x0 + x1) / 2, base + wall * 0.26, 'BOUNCE', 0.42 * Math.min(1, k + 0.1), C.white);
  turret(ctx, x1 - 0.3, y1 - 0.3, 0, tower, C.mustard, C.coral);
  // A kid who's been waiting since the last time, outside by the steps.
  if (!up && c > 18) person(ctx, x1 + 0.3, y1 + 0.5, 0, { ...folk(79), scale: 0.62, pose: 'stand', dir: 'l' }, t);
}
// Off hours: flat on the road, folded, with a note.
function flatCastle(ctx) {
  box(ctx, KX, KY, 0, KW, KD, 0.25, C.coral, { top: C.butter, lw: 0.04 });
  for (const [x, y, c] of [[KX + 0.4, KY + 0.4, C.teal], [KX + 2.4, KY + 0.6, C.mustard], [KX + 0.8, KY + 2.2, C.pink]]) {
    box(ctx, x, y, 0.25, 1.8, 1.4, 0.22, c, { flat: true, lw: 0.03 });
  }
}

// The blower, and whoever sits on it this time (someone new every go).
const SITTERS = [
  { seed: 101, dress: true, hair: C.greyLight, say: 'OOH, A SEAT.' },
  { seed: 102, hat: 'cap', say: 'JUST A MINUTE.' },
  { seed: 103, hat: 'sun', say: 'LOVELY AND WARM.' },
  { seed: 104, say: 'IS THIS FREE?' },
  { seed: 105, hat: 'beanie', say: 'MY FEET!' },
];
function pump(ctx, t) {
  const [px, py] = PUMP;
  // the hose into the castle's side
  ctx.beginPath();
  ctx.moveTo(...P(px - 0.3, py + 0.3, 0.3));
  ctx.quadraticCurveTo(...P(px - 0.8, py + 0.9, 0), ...P(KX + KW - 0.1, py + 0.6, 0.35));
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.22;
  ctx.stroke();
  ctx.strokeStyle = C.teal;
  ctx.lineWidth = 0.14;
  ctx.stroke();
  box(ctx, px - 0.35, py - 0.35, 0, 0.7, 0.7, 0.6, C.mustard, { lw: 0.04 });
  if (Q.detail) {
    const [X, Y] = P(px, py + 0.35, 0.3);
    ctx.beginPath();
    ctx.ellipse(X, Y, 0.2, 0.24, 0, 0, Math.PI * 2);
    paint(ctx, C.ink, { lw: 0.02 });
    const a = t * 20;
    ctx.strokeStyle = C.grey;
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const b = a + (i * Math.PI * 2) / 3;
      ctx.moveTo(X, Y);
      ctx.lineTo(X + Math.cos(b) * 0.17, Y + Math.sin(b) * 0.2);
    }
    ctx.stroke();
  }
  const c = ((t % CYCLE) + CYCLE) % CYCLE;
  const who = SITTERS[Math.floor(t / CYCLE) % SITTERS.length];
  const look = { ...folk(who.seed), ...(who.dress ? { dress: true } : {}), ...(who.hair ? { hair: who.hair } : {}), hat: who.hat };
  const far = [px + 2.4, py + 1.5], seat = [px + 0.05, py + 0.05];
  if (c > 13 && c < 18) {
    // wandering over: the only free seat on the street
    const k = Math.min(1, (c - 13) / 4.4);
    ctx.save();
    ctx.globalAlpha *= Math.min(1, (c - 13) / 0.6);
    person(ctx, far[0] + (seat[0] - far[0]) * k, far[1] + (seat[1] - far[1]) * k, 0, { ...look, pose: k < 1 ? 'walk' : 'stand', dir: 'l' }, t);
    ctx.restore();
  } else if (c >= 18 && c < 25) {
    person(ctx, seat[0], seat[1], 0.6, { ...look, pose: 'sit', dir: 'l' }, t);
    if (c < 20.5 && Q.detail && Q.pxPerUnit >= 12) speech(ctx, seat[0], seat[1], 2.6, who.say, { size: 0.42 });
  } else if (c >= 25) {
    const k = (c - 25) / 1;
    ctx.save();
    ctx.globalAlpha *= 1 - k * 0.6;
    person(ctx, seat[0] + (far[0] - seat[0]) * k, seat[1] + (far[1] - seat[1]) * k, 0, { ...look, pose: 'walk', dir: 'r' }, t);
    ctx.restore();
  }
  // The castle's attendant, who has seen this before.
  const cross = c >= 18 && c < 25;
  person(ctx, KX + KW + 0.6, KY + KD + 0.4, 0, { ...folk(97), top: C.teal, hat: 'cap', pose: cross ? 'point' : 'wave', dir: 'r' }, t);
  if (cross && c < 21 && Q.detail && Q.pxPerUnit >= 12) speech(ctx, KX + KW + 0.6, KY + KD + 0.4, 3.0, 'OFF THE PUMP!', { size: 0.42 });
}

// ---------- The crates of party stuff ----------
// Two lidded crates on the back arm: PARTY (the spare bunting) and HATS.
const CRATE = { x: 42.1, y: 24.6, w: 1.4, d: 1.3, h: 0.8 };
const HATS = { x: 42.3, y: 26.0, w: 1.2, d: 0.8, h: 0.55 };
// A lid hinged along a crate's back edge (y = c.y), open by k: flat at 0,
// up and leaning back past upright at 1.
function lid(ctx, c, k, color, most = 1.95) {
  const a = k * most, top = c.h, D = c.d;
  const y = c.y + D * Math.cos(a), z = top + D * Math.sin(a);
  face(ctx, [[c.x, c.y, top], [c.x + c.w, c.y, top], [c.x + c.w, y, z], [c.x, y, z]], k > 0.5 ? shade(color, 0.25) : color, { lw: 0.04 });
  if (k < 0.5 && Q.detail) line(ctx, [c.x + 0.1, (c.y + y) / 2, (top + z) / 2], [c.x + c.w - 0.1, (c.y + y) / 2, (top + z) / 2], shade(color, 0.35), 0.025);
}
// The inside of an open crate, dark.
const inside = (ctx, c) => rect(ctx, c.x + 0.06, c.y + 0.06, c.w - 0.12, c.d - 0.12, c.h - 0.005, shade(C.wood, 0.6), { stroke: false });
// A roll of bunting: a spool, and flags round it.
function roll(ctx, x, y, z) {
  cylinder(ctx, x, y, z, 0.38, 0.28, C.white, { top: C.white });
  disc(ctx, x, y, z + 0.28, 0.12, C.wood, { lw: 0.02 });
  for (const [a, c] of [[0, C.coral], [1.6, C.teal], [3.2, C.mustard], [4.6, C.purple]]) {
    const [X, Y] = P(x + Math.cos(a) * 0.38, y + Math.sin(a) * 0.38, z + 0.14);
    ctx.beginPath();
    ctx.moveTo(X - 0.08, Y - 0.06);
    ctx.lineTo(X + 0.08, Y - 0.06);
    ctx.lineTo(X, Y + 0.1);
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
  }
}
function partyCrate(ctx, k) {
  const c = CRATE;
  if (k < 0.5) {
    // Shut: the roll's tail of flags caught under the lid, down the side.
    lid(ctx, c, k, C.wood);
    const pts = [[c.x + c.w - 0.05, 25.15, c.h + 0.02], [c.x + c.w + 0.04, 25.3, 0.62], [c.x + c.w + 0.05, 25.5, 0.42], [c.x + c.w + 0.04, 25.72, 0.24]];
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(...P(...p)) : ctx.moveTo(...P(...p))));
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.03;
    ctx.stroke();
    pts.slice(1).forEach((p, i) => {
      const [X, Y] = P(...p);
      ctx.beginPath();
      ctx.moveTo(X - 0.13, Y);
      ctx.lineTo(X + 0.13, Y);
      ctx.lineTo(X, Y + 0.28);
      ctx.closePath();
      paint(ctx, BUNTING[i + 1], { lw: 0.025 });
    });
    return;
  }
  // Open: the lid up behind, and the roll pops up out of it.
  lid(ctx, c, k, C.wood);
  inside(ctx, c);
  roll(ctx, 42.8, 25.25, c.h - 0.3 + 0.55 * k);
}
function hatCrate(ctx, k) {
  const c = HATS;
  if (k < 0.5) { lid(ctx, c, k, C.woodLight, 1.5); return; }
  lid(ctx, c, k, C.woodLight, 1.5);
  inside(ctx, c);
  // Party hats, springing up.
  for (const [x, y, col, d] of [[42.6, 26.3, C.pink, 0], [43.0, 26.35, C.teal, 0.12], [42.8, 26.55, C.mustard, 0.06]]) {
    const [X, Y] = P(x, y, c.h - 0.2 + (0.45 + d) * k);
    ctx.beginPath();
    ctx.moveTo(X - 0.15, Y);
    ctx.lineTo(X, Y - 0.5);
    ctx.lineTo(X + 0.15, Y);
    ctx.closePath();
    paint(ctx, col, { lw: 0.025 });
  }
}

// ---------- The Courier's map ----------
// On the zebra crossing on the back road, between two stripes and over one.
const MAP = [39.45, 10.95];

// ---------- The balloon goose ----------
// Tethered for the parade by the "Have you seen this goose?" board, half
// blown up: a white goose the size of the real one, bobbing low on a string.
const BG = { x: 40.1, y: 56.0, bag: [40.55, 56.5] };
function balloonGoose(ctx, t) {
  const bob = Math.sin(t * 1.1) * 0.07, z = 0.55 + bob;
  const [bx, by] = BG.bag;
  // Its shadow on the road, and the sandbag it's tied to.
  if (Q.detail) {
    const [SX, SY] = P(BG.x, BG.y, 0);
    ctx.beginPath();
    ctx.ellipse(SX, SY, 0.36, 0.13, 0, 0, Math.PI * 2);
    ctx.fillStyle = alpha(C.ink, 0.13);
    ctx.fill();
  }
  box(ctx, bx - 0.2, by - 0.15, 0, 0.4, 0.3, 0.2, C.woodLight, { lw: 0.03 });
  // The string, from the bag to its belly.
  const [AX, AY] = P(bx, by, 0.2), [GX, GY] = P(BG.x + 0.05, BG.y + 0.05, z + 0.1);
  ctx.beginPath();
  ctx.moveTo(AX, AY);
  ctx.quadraticCurveTo((AX + GX) / 2 + 0.1, (AY + GY) / 2 + 0.15, GX, GY);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.025;
  ctx.stroke();
  // The goose: the real one's shape, a little saggy, swaying on its string.
  const [X, Y] = P(BG.x, BG.y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.rotate(Math.sin(t * 0.8) * 0.08);
  ctx.scale(1, 0.94);
  ctx.translate(-X, -Y);
  goose(ctx, BG.x, BG.y, z, 0, { pose: 'swim', dir: 'l' });
  ctx.restore();
  if (!Q.detail) return;
  // A shine, a crease where it's not full, and the knot under it.
  ctx.beginPath();
  ctx.ellipse(X + 0.12, Y - 0.12, 0.1, 0.04, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = alpha(C.white, 0.9);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(X - 0.25, Y - 0.08);
  ctx.quadraticCurveTo(X - 0.1, Y - 0.02, X + 0.05, Y - 0.1);
  ctx.strokeStyle = C.greyLight;
  ctx.lineWidth = 0.025;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(GX, GY + 0.03, 0.04, 0, Math.PI * 2);
  ctx.fillStyle = C.white;
  ctx.fill();
}

// ---------- The street's furniture ----------
// Lamp posts along both kerbs, a unit clear of the seams (every 16).
// (On the left-hand arm the first pair stands back at 2.5, clear of the
// bouncy castle.)
const POSTS = [];
for (const u of [8, 24, 56, 72]) {
  const v = u === 8 ? 2.5 : u;
  POSTS.push([MAIN0 + 0.6, u], [MAIN1 - 0.6, u], [v, MAIN0 + 0.6], [v, MAIN1 - 0.6]);
}
// Bunting, strung across each arm, going up through the morning (none at
// dawn, all of it by noon), nearest the stage first.
const STRINGS = [
  [[MAIN0, 52, 5.2], [MAIN1, 52, 5.2]],
  [[52, MAIN0, 5.2], [52, MAIN1, 5.2]],
  [[30.5, MAIN0, 5.2], [30.5, MAIN1, 5.2]],
  [[MAIN0, 30.5, 5.2], [MAIN1, 30.5, 5.2]],
  [[MAIN0, 70, 5.2], [MAIN1, 70, 5.2]],
  [[70, MAIN0, 5.2], [70, MAIN1, 5.2]],
  [[13, MAIN0, 5.2], [13, MAIN1, 5.2]],
  [[MAIN0, 13, 5.2], [MAIN1, 13, 5.2]],
];
const STRING_AT = (i) => 7 + (i + 1) * 0.6; // the hour each one is up

// The party's extras: in the road's middle by the stage, off the walking
// lanes, all looking at the band. extra: a balloon, a foam finger, a kid on
// their shoulders.
const CROWD = [
  // the front arm, from behind
  [38.3, 45.7, 'dance', 1, 'hat'], [39.7, 46.4, 'cheer', 2, 'balloon'], [41.3, 45.8, 'stand', 3, 'shoulders'],
  [42.9, 46.7, 'jump', 4, 'hat', 0.72], [38.7, 49.4, 'cheer', 5, 'finger'], [42.5, 49.3, 'dance', 6, 'balloon'],
  [39.3, 52.3, 'wave', 7, 'hat'], [42.0, 52.7, 'cheer', 8, null],
  // the right-hand arm, from behind
  [45.8, 39.1, 'cheer', 9, 'hat'], [46.6, 42.3, 'dance', 10, 'balloon'], [49.4, 38.5, 'jump', 11, null, 0.72],
  [49.9, 41.7, 'stand', 12, 'shoulders'], [51.5, 40.1, 'wave', 13, 'hat'],
  // the left-hand arm, facing the stage
  [33.6, 38.6, 'dance', 14, 'hat'], [34.9, 41.1, 'cheer', 15, 'balloon'], [33.2, 42.9, 'jump', 16, 'finger', 0.72],
].map(([x, y, pose, i, extra, scale]) => ({
  x, y, pose, extra, scale: scale || 1, seed: 200 + i * 11,
  back: x > 37 && x < 44 ? true : x > 45, dir: x > 45 ? 'l' : 'r',
  from: PARTY[0] + (i % 5) * 0.12, to: PARTY[1] - (i % 4) * 0.12,
}));
const BALLOONS = [C.coral, C.teal, C.mustard, C.pink, C.purple];
// When the rocket goes up behind the launch pad's fence (8:48pm: clock.js),
// half the party turns round to point at it (it's up and right from here).
const liftoff = (t) => { const h = hour(t); return h >= LAUNCH && h < LAUNCH + 0.3; };
function partyGoer(ctx, t, g) {
  const up = g.seed % 2 === 0 && g.extra !== 'shoulders' && liftoff(t);
  const f = (up ? 'r' : g.dir) === 'l' ? -1 : 1;
  const look = { ...folk(g.seed), pose: up ? 'point' : g.pose, dir: up ? 'r' : g.dir, back: up || g.back, scale: g.scale };
  if (g.extra === 'hat' || g.seed % 3 === 0) look.hat = 'party';
  if (g.extra === 'shoulders') look.arms = [2.7, -2.7];
  person(ctx, g.x, g.y, 0, look, t);
  const [X, Y] = P(g.x, g.y, 0);
  const s = g.scale;
  if (g.extra === 'shoulders') {
    person(ctx, g.x, g.y, 1.6, { ...folk(g.seed + 1), pose: 'sit', arms: [2.8, -2.6], scale: 0.6, hat: 'party', dir: g.dir, back: g.back }, t);
  } else if (g.extra === 'balloon') {
    balloon(ctx, X + f * 0.45 * s, Y - 1.55 * s, BALLOONS[g.seed % BALLOONS.length], t, g.seed);
  } else if (g.extra === 'finger' && Q.detail) {
    const bob = Math.abs(Math.sin(t * 7 + g.seed)) * 0.25;
    ctx.beginPath();
    ctx.roundRect(X + f * 0.25 - 0.18, Y - 2.95 * s - bob, 0.36, 0.42, 0.1);
    ctx.roundRect(X + f * 0.25 - 0.06, Y - 3.35 * s - bob, 0.12, 0.42, 0.06);
    paint(ctx, C.mustard, { lw: 0.03 });
  }
  // glow sticks after dark
  if (Q.detail && nightK(t) > 0.3 && g.seed % 2) {
    const a = t * 5 + g.seed;
    ctx.beginPath();
    ctx.moveTo(X - f * 0.3 + Math.cos(a) * 0.2, Y - 2.3 * s + Math.sin(a) * 0.2);
    ctx.lineTo(X - f * 0.3 - Math.cos(a) * 0.2, Y - 2.3 * s - Math.sin(a) * 0.2);
    ctx.strokeStyle = g.seed % 4 === 1 ? C.tealLight : C.pink;
    ctx.lineWidth = 0.1;
    ctx.stroke();
  }
}

export default {
  id: 'main-street',
  name: 'Main Street',
  blurb: 'The Block Party is today, and the stage is going up in the middle of the road. The bin lorry would like a word.',
  shape: MAIN_STREET,
  home: [MID, MID + 6], // the stage
  build(R) {
    printRoad(R);

    // ---------- The stage ----------
    // The morning's frame and half deck, the planks and the crew.
    R.thing(SX1, SY1, (ctx) => frame(ctx, false), { depth: 81, on: FRAME });
    R.thing(SX1, SY1, (ctx) => frame(ctx, true), { depth: 81, on: HALF });
    R.thing(MID, 46.3, (ctx) => {
      for (let k = 0; k < 6; k++) box(ctx, 38.6 + (k % 2) * 0.15, 45.5 + (k % 3) * 0.02, k * 0.1, 3.2, 0.8, 0.1, k % 2 ? C.woodLight : C.wood, { flat: true, lw: 0.03 });
      box(ctx, 42.0, 45.4, 0, 0.5, 0.3, 0.25, C.red, { flat: true, lw: 0.03 }); // the toolbox
    }, { on: during(5, 11.5) });
    // The builder: at the planks with a hammer, then up on the half deck.
    const hammer = (ctx) => {
      ctx.fillStyle = C.brown;
      ctx.fillRect(0.05, -0.3, 0.07, 0.4);
      ctx.fillStyle = C.grey;
      ctx.fillRect(-0.05, -0.36, 0.27, 0.1);
    };
    R.thing(40.6, 41.2, (ctx, t) => {
      const h = hour(t);
      const on = h >= 9;
      const [x, y, z] = on ? [40.2, 39.3, SZ] : [41.4, 44.9 - 0.2, 0];
      person(ctx, x, y, z, { ...folk(88), top: C.mustard, hat: 'helmet', pose: 'drum', dir: 'r', hold: hammer }, t);
    }, { anim: true, on: BUILDING, depth: 82 });
    // The foreman, with the instructions: step one of four hundred.
    R.thing(42.8, 46.8, (ctx, t) => {
      person(ctx, 42.8, 46.8, 0, { ...folk(89), top: C.coral, hat: 'helmet', pose: 'read', dir: 'r', hold: (c) => { c.fillStyle = C.white; c.strokeStyle = C.ink; c.lineWidth = 0.03; c.fillRect(-0.05, -0.45, 0.6, 0.45); c.strokeRect(-0.05, -0.45, 0.6, 0.45); } }, t);
      if (Q.detail && Q.pxPerUnit >= 12 && Math.sin(t * 0.7) > 0.3) speech(ctx, 42.8, 46.8, 3.0, 'STEP 1 OF 400.', { size: 0.42 });
    }, { anim: true, on: BUILDING });

    // The deck, in thirds so the band sorts in on it.
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const x0 = SX + i * CUT, y0 = SY + j * CUT;
        R.thing(x0 + CUT / 2, y0 + CUT / 2, (ctx) => deckPiece(ctx, i, j), { depth: x0 + y0 + CUT - 0.6, on: DECK });
      }
    }
    // Steps up on the right, where the band hops up from the lane.
    R.thing(44, 38.8, (ctx) => {
      box(ctx, SX1, 38.2, 0, 0.35, 1.3, SZ * 0.66, STAGE_INK.boards, { lw: 0.04, top: STAGE_INK.deck });
      box(ctx, SX1 + 0.35, 38.2, 0, 0.3, 1.3, SZ * 0.33, STAGE_INK.boards, { lw: 0.04, top: STAGE_INK.deck });
    }, { depth: 82.4, on: DECK });
    // The backdrop's frame, then the backdrop.
    R.thing(SX + 0.5, SY + 0.5, (ctx) => scaffold(ctx), { depth: 76, on: SCAFFOLD });
    for (let k = 0; k < 3; k++) {
      R.thing(SX + T / 2, SY + (k + 0.5) * CUT, (ctx) => wallA(ctx, k), { depth: SX + SY + (k + 1) * CUT - 0.1, on: BACKDROP });
      R.thing(SX + (k + 0.5) * CUT, SY + T / 2, (ctx) => wallB(ctx, k), { depth: SX + SY + (k + 1) * CUT - 0.05, on: BACKDROP });
    }
    // The band's gear, from 2:30: the drum kit, the bassist's amp, the mic,
    // a monitor, and a speaker stack on each front corner.
    // (Over the drummer, who sorts on the deck at about 84.7; under the singer.)
    R.thing(39.8, 40.0, (ctx) => drums(ctx), { depth: 85.2, on: GEAR });
    R.thing(41.7, 38.1, (ctx) => {
      box(ctx, 41.3, 37.8, SZ, 0.8, 0.5, 0.95, C.ink, { lw: 0.04, left: shade(C.ink, 0.1) });
      if (Q.detail) {
        face(ctx, [[41.38, 38.3, SZ + 0.1], [42.02, 38.3, SZ + 0.1], [42.02, 38.3, SZ + 0.75], [41.38, 38.3, SZ + 0.75]], C.grey, { dots: C.ink, density: 0.5, lw: 0.02 });
        box(ctx, 41.3, 37.8, SZ + 0.95, 0.8, 0.5, 0.12, C.mustard, { flat: true, lw: 0.02 });
      }
    }, { on: GEAR });
    R.thing(41.55, 41.45, (ctx) => {
      line(ctx, [41.55, 41.45, SZ], [41.55, 41.45, SZ + 1.55], C.greyLight, 0.05);
      disc(ctx, 41.55, 41.45, SZ, 0.2, C.ink, { lw: 0.02 });
      const [X, Y] = P(41.55, 41.45, SZ + 1.62);
      ctx.beginPath();
      ctx.ellipse(X, Y, 0.09, 0.12, 0, 0, Math.PI * 2);
      paint(ctx, C.ink, { lw: 0.02 });
    }, { depth: 89.5, on: GEAR }); // in front of the singer
    R.thing(40.2, 43.2, (ctx) => {
      face(ctx, [[39.5, 42.7, SZ], [40.9, 42.7, SZ], [40.9, 43.3, SZ], [39.5, 43.3, SZ]], C.ink, { lw: 0.02 });
      face(ctx, [[39.5, 42.7, SZ + 0.45], [40.9, 42.7, SZ + 0.45], [40.9, 43.3, SZ], [39.5, 43.3, SZ]], C.navy, { dots: C.ink, density: 0.4, lw: 0.03 });
      if (Q.detail) rect(ctx, 38.9, 42.9, 0.4, 0.5, SZ + 0.01, C.white, { lw: 0.02 }); // the set list
    }, { depth: 82.9, on: GEAR });
    R.thing(38.3, 42.95, (ctx) => speakers(ctx, 37.75, 42.4, 1.1, 1.05), { on: GEAR });
    R.thing(42.95, 38.15, (ctx) => speakers(ctx, 42.4, 37.75, 1.05, 0.75), { on: GEAR });

    // The truss: a beam across the front of the backdrop, its cans hanging.
    const TA = [SX + T / 2, SY1 - 0.15], TB = [SX1 - 0.15, SY + T / 2], TZ = 7.8, CANS = 7;
    const along = (k, z) => [TA[0] + (TB[0] - TA[0]) * k, TA[1] + (TB[1] - TA[1]) * k, z];
    R.thing(MID, MID, (ctx) => {
      const n = 14;
      ctx.beginPath();
      for (const z of [TZ + 0.35, TZ - 0.05]) {
        ctx.moveTo(...P(...along(0, z)));
        ctx.lineTo(...P(...along(1, z)));
      }
      for (let i = 0; i <= n; i++) {
        ctx.lineTo(...P(...along(i / n, i % 2 ? TZ + 0.35 : TZ - 0.05)));
      }
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 0.07;
      ctx.stroke();
      for (let i = 0; i < CANS; i++) {
        const [x, y] = along((i + 0.5) / CANS, 0);
        line(ctx, [x, y, TZ - 0.05], [x, y, TZ - 0.3], C.ink, 0.05);
        box(ctx, x - 0.16, y - 0.16, TZ - 0.72, 0.32, 0.32, 0.42, C.ink, { flat: true, lw: 0.02 });
      }
    }, { depth: 86, on: GEAR });
    // The lights: on for the sound check at 3pm (testing, one at a time),
    // chasing at the party, the beams swinging once it's dusk.
    R.thing(MID, MID, (ctx, t) => {
      const h = hour(t), party = h >= 19;
      const L = STAGE_INK.lights;
      const step = Math.floor(t * (party ? 4 : 1.5));
      // the festoon along the backdrop's top
      let n = 0;
      for (const [plane, c, u0, u1] of [['x', SX + T, SY, SY1], ['y', SY + T, SX, SX1]]) {
        for (const u of FESTOON(u0, u1)) {
          const on = party || (step + n) % 3 !== 0;
          if (on) {
            const [X, Y] = P(...(plane === 'x' ? [c, u, TOP - 0.1] : [u, c, TOP - 0.1]));
            ctx.beginPath();
            ctx.arc(X, Y + 0.12, 0.11, 0, Math.PI * 2);
            ctx.fillStyle = L[(n + (party ? step : 0)) % L.length];
            ctx.fill();
          }
          n++;
        }
      }
      // the cans, and at the party their beams
      const dusk = party ? Math.min(1, 0.35 + nightK(t)) : 0;
      for (let i = 0; i < CANS; i++) {
        const on = party || i === step % CANS;
        if (!on) continue;
        const col = L[(i + (party ? step : 0)) % L.length];
        const [x, y] = along((i + 0.5) / CANS, 0);
        const [X, Y] = P(x, y, TZ - 0.72);
        if (party) {
          const sx = MID + Math.sin(t * 0.9 + i * 1.3) * 2.2, sy = MID + Math.cos(t * 0.7 + i) * 2.2;
          const [FX, FY] = P(sx, sy, SZ);
          ctx.beginPath();
          ctx.moveTo(X - 0.12, Y);
          ctx.lineTo(FX - 0.9, FY);
          ctx.lineTo(FX + 0.9, FY);
          ctx.lineTo(X + 0.12, Y);
          ctx.closePath();
          ctx.fillStyle = alpha(col, 0.1 + 0.14 * dusk);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.ellipse(X, Y + 0.02, 0.15, 0.08, 0, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();
      }
    }, { anim: true, depth: 90, on: LIGHTS }); // the beams wash over the band
    // Notes off the speakers while there's music.
    R.thing(MID, MID, (ctx, t) => {
      if (!Q.detail) return;
      particles(t, 6, 2.6, (k, r, i) => {
        const [x, y] = i % 2 ? [38.3, 42.95] : [42.95, 38.15];
        note(ctx, x + (r() - 0.5) * 0.8 + k * 0.4, y + (r() - 0.5) * 0.8 + k * 0.4, SZ + 2.4 + k * 2.2, alpha(i % 3 ? C.ink : C.coral, 1 - k), 0.9);
      }, 7);
    }, { anim: true, depth: 90.1, on: LIGHTS });
    // The stage's glow at the party.
    const glowK = (t) => {
      const h = hour(t);
      return h >= 19 && h < 23.5 ? within([19, 23.5], h, 0.3) * (0.3 + 0.6 * nightK(t)) : 0;
    };
    R.light({ at: [MID, MID, 3.5], r: 6.5, color: PARTY_LIGHT, k: glowK });
    R.light({ at: [MID + 1, MID + 1, 1.6], r: 3.5, color: C.butter, k: (t) => glowK(t) * 0.6 });

    // The stage answers a tap all day: a sound check, and notes off it.
    const check = R.poke({ id: 'stage', at: [MID, MID, SZ + 1.2], r: 1.8, hold: 2.5, sound: 'tick', teach: true, say: ['ONE, TWO. ONE, TWO.', 'IS THIS THING ON?', 'THE HONKS. LIVE AT 7PM.'] });
    R.thing(MID, MID, (ctx, t) => {
      const k = check.k();
      if (k <= 0.01 || !Q.detail) return;
      const s = (t * 0.8) % 1;
      for (let i = 0; i < 5; i++) {
        const u = (s + i / 5) % 1;
        note(ctx, MID - 1.6 + i * 0.8, MID + 1.6 - i * 0.8, SZ + 1.2 + u * 2.6, alpha(i % 2 ? C.coral : C.ink, k * (1 - u * 0.7)), 1.6);
      }
    }, { anim: true, depth: 90.2 });

    // The generator behind the backdrop, and its cable.
    R.thing(42.8, 35.0, (ctx) => {
      line(ctx, [42.8, 35.2, 0.03], [42.8, SY, 0.03], C.ink, 0.07);
      box(ctx, 42.3, 34.3, 0, 1.0, 0.8, 0.8, C.mustard, { lw: 0.04 });
      box(ctx, 42.45, 34.45, 0.8, 0.2, 0.2, 0.3, C.ink, { flat: true, lw: 0.02 });
      if (Q.detail) words(ctx, 'y', 35.1, 42.8, 0.45, 'GENNY', 0.26, C.ink);
    }, { on: GEAR });
    R.thing(42.55, 34.55, (ctx, t) => {
      if (!Q.detail) return;
      particles(t, 3, 2, (k, r) => {
        const [X, Y] = P(42.55 + k * 0.4, 34.55 - k * 0.2, 1.2 + k * 1.3);
        ctx.beginPath();
        ctx.arc(X, Y, 0.12 + k * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = alpha(C.grey, 0.5 * (1 - k));
        ctx.fill();
      }, 3);
    }, { anim: true, on: LIGHTS });

    // ---------- The banner: the laundromat's sheet ----------
    // Dot and Mo carry it out at noon; by half past it's up across the
    // right-hand arm, hand painted, on two poles.
    const BX = 54.5, BY0 = MAIN0 + 0.45, BY1 = MAIN1 - 0.45;
    for (const y of [MAIN0 + 0.3, MAIN1 - 0.3]) {
      R.thing(BX, y, (ctx) => box(ctx, BX - 0.08, y - 0.08, 0, 0.16, 0.16, 5.3, C.wood, { flat: true, lw: 0.03 }), { on: BANNER });
    }
    R.thing(BX, MID, (ctx) => {
      // the sheet, rippled
      const pts = [];
      for (let k = 0; k <= 10; k++) pts.push([BX, BY0 + ((BY1 - BY0) * k) / 10, 3.0 + Math.sin(k * 1.4) * 0.06]);
      for (let k = 10; k >= 0; k--) pts.push([BX, BY0 + ((BY1 - BY0) * k) / 10, 5.1 - Math.sin(k * 0.9) * 0.08 - Math.sin((k / 10) * Math.PI) * 0.25]);
      face(ctx, pts, STAGE_INK.banner, { lw: 0.04 });
      line(ctx, [BX, MAIN0 + 0.3, 5.25], [BX, BY0, 5.1], C.ink, 0.04);
      line(ctx, [BX, MAIN1 - 0.3, 5.25], [BX, BY1, 5.1], C.ink, 0.04);
      words(ctx, 'x', BX, MID, 4.2, 'PARTY TONITE!', 0.82, C.coral);
      if (!Q.detail) return;
      // drips, a laundry tag and a signature
      for (const [u, l] of [[37.8, 0.4], [39.3, 0.25], [41.9, 0.5], [43.2, 0.3]]) line(ctx, [BX, u, 3.9], [BX, u, 3.9 - l], C.coral, 0.07);
      words(ctx, 'x', BX, MID + 1.8, 3.35, 'love, Dot + Mo', 0.3, C.teal, 'Rethink Sans');
      face(ctx, [[BX, BY1 - 0.7, 3.1], [BX, BY1 - 0.3, 3.1], [BX, BY1 - 0.3, 3.45], [BX, BY1 - 0.7, 3.45]], C.blush, { lw: 0.02 });
    }, { depth: BX + MID, on: BANNER });

    // ---------- The back arm: the lorry's problem ----------
    // ROAD CLOSED, and the bin men's reply.
    R.thing(MID, 33.4, (ctx) => {
      for (const x of [38.4, 42.6]) {
        line(ctx, [x, 33.0, 0], [x, 33.3, 1.0], C.ink, 0.08);
        line(ctx, [x, 33.6, 0], [x, 33.3, 1.0], C.ink, 0.08);
      }
      const n = 8;
      for (let k = 0; k < n; k++) {
        const a = 38.2 + (k * 4.6) / n, b = a + 4.6 / n;
        face(ctx, [[a, 33.3, 0.7], [b, 33.3, 0.7], [b, 33.3, 1.0], [a, 33.3, 1.0]], k % 2 ? C.white : C.coral, { lw: 0.02 });
      }
      board(ctx, 'x', MID, 33.3, 1.9, 3.4, 1.1, null, { board: C.white });
      words(ctx, 'y', 33.3, MID, 2.2, 'ROAD CLOSED', 0.42, C.red);
      words(ctx, 'y', 33.3, MID, 1.82, 'FOR PARTY', 0.34, C.ink);
      if (Q.detail) words(ctx, 'y', 33.3, MID + 0.3, 1.5, 'says who?  -the bins', 0.24, C.navy, 'Rethink Sans');
    });
    R.thing(38.0, 34.0, (ctx) => cone(ctx, 38.0, 34.0), {});
    R.thing(43.1, 33.8, (ctx) => cone(ctx, 43.1, 33.8), {});
    // one the lorry got
    R.thing(41.5, 32.9, (ctx) => {
      face(ctx, [[41.0, 32.7, 0.02], [41.9, 32.6, 0.02], [42.0, 33.1, 0.02], [41.1, 33.2, 0.02]], C.coral, { lw: 0.03 });
      face(ctx, [[41.3, 32.75, 0.03], [41.5, 32.72, 0.03], [41.6, 33.12, 0.03], [41.4, 33.15, 0.03]], C.white, { stroke: false });
    });
    const partyLid = R.poke({ id: 'party-crate', at: [42.8, 25.25, 0.9], r: 0.9, sound: 'clunk' });
    const hatLid = R.poke({ id: 'hats', at: [42.9, 26.4, 0.6], r: 0.7, sound: 'clunk', say: ['Just hats.', 'Still just hats.', 'One each. No geese.'] });
    // Two crates of party stuff by the kerb, lids shut. The big one (PARTY)
    // has the spare roll of bunting in it, its tail of flags caught under the
    // lid; the little one (HATS) is just hats.
    R.thing(43.5, 25.9, (ctx) => {
      box(ctx, CRATE.x, CRATE.y, 0, CRATE.w, CRATE.d, CRATE.h, C.wood, { lw: 0.04, dotsL: shade(C.wood, 0.5) });
      if (!Q.detail) return;
      for (const z of [0.27, 0.54]) line(ctx, [CRATE.x, CRATE.y + CRATE.d, z], [CRATE.x + CRATE.w, CRATE.y + CRATE.d, z], shade(C.wood, 0.35), 0.03);
      words(ctx, 'x', CRATE.x + CRATE.w, CRATE.y + CRATE.d / 2, 0.42, 'PARTY', 0.22, C.brown);
    }, { depth: 68.0 });
    R.thing(43.5, 25.95, (ctx) => partyCrate(ctx, partyLid.k()), { anim: true, depth: 68.1 });
    R.thing(43.5, 26.8, (ctx) => {
      box(ctx, HATS.x, HATS.y, 0, HATS.w, HATS.d, HATS.h, C.woodLight, { lw: 0.04 });
      words(ctx, 'y', HATS.y + HATS.d, HATS.x + HATS.w / 2, 0.28, 'HATS', 0.24, C.brown);
    }, { depth: 69.0 });
    R.thing(43.5, 26.85, (ctx) => hatCrate(ctx, hatLid.k()), { anim: true, depth: 69.1 });
    // The pigeons, pecking, till the lorry comes by (and one fewer after 1pm:
    // Inspector Pidge nicked it).
    const lorry = R.walkers.find((w) => w.id === 'lorry');
    // The bin lorry answers back, wherever it's got to.
    if (lorry) R.poke({ id: 'lorry', at: (t) => { const p = lorry.at(t); return [p.x, p.y, 1.5]; }, r: 1.4, sound: 'clunk', say: ['HONK HONK.', 'Party? On bin day?', 'Back it up. Again.'] });
    R.thing(38.0, 18.9, (ctx, t) => {
      const lz = lorry && lorry.at(t);
      const scared = lz && Math.abs(lz.y - 18.9) < 3.5 && Math.abs(lz.x - MID) < 1;
      const h = hour(t);
      [[37.7, 18.3], [38.3, 18.9], [37.9, 19.5]].forEach(([x, y], i) => {
        if (i === 1 && h >= 13) return;
        const z = scared ? 1.1 + Math.abs(Math.sin(t * 9 + i)) * 0.5 : 0;
        const [X, Y] = P(x, y, z);
        const f = i % 2 ? -1 : 1, peck = !scared && Math.sin(t * 4 + i * 2) > 0.5 ? 0.12 : 0;
        ctx.beginPath();
        ctx.ellipse(X, Y - 0.2, 0.26, 0.16, 0, 0, Math.PI * 2);
        paint(ctx, C.grey, { lw: 0.03 });
        ctx.beginPath();
        ctx.arc(X + f * 0.22, Y - 0.35 + peck, 0.1, 0, Math.PI * 2);
        paint(ctx, shade(C.grey, 0.3), { lw: 0.03 });
        if (scared) {
          ctx.beginPath();
          ctx.moveTo(X - 0.1, Y - 0.25);
          ctx.lineTo(X - 0.35, Y - 0.55 - Math.sin(t * 20 + i) * 0.2);
          ctx.lineTo(X + 0.1, Y - 0.25);
          paint(ctx, C.greyLight, { lw: 0.03 });
        }
      });
    }, { anim: true, on: during(5, 20) });

    // ---------- The left arm: the bouncy castle ----------
    // Tap the pump and the castle goes up, for a bit.
    const blower = R.poke({ id: 'pump', at: [PUMP[0], PUMP[1], 0.5], r: 0.8, hold: 4, sound: 'clunk', say: ['WHIRRRRR.', 'Full puff! For a bit.', "It's a pump, not a seat."] });
    R.thing(KX + KW / 2, KY + KD / 2, (ctx, t) => castle(ctx, t, blower.k()), { anim: true, depth: 48, on: CASTLE_UP });
    R.thing(KX + KW / 2, KY + KD / 2, (ctx) => flatCastle(ctx), { depth: 48, on: during(20, 9) });
    R.thing(PUMP[0], PUMP[1], (ctx, t) => pump(ctx, t), { anim: true, on: CASTLE_UP });
    // The hopscotch, with a kid on it, and one chalking the next go.
    R.mover((t) => {
      const c = t % 7;
      const k = Math.min(1, c / 5.5);
      return { x: 22.4 + k * 3.6, y: MID, k: c };
    }, (ctx, t, p) => person(ctx, p.x, p.y, 0, { ...folk(131), scale: 0.64, pose: p.k < 5.5 ? 'jump' : 'stand', dir: 'r', speed: 8 }, t), { on: during(9, 18.5) });
    R.thing(21.7, 41.9, (ctx, t) => person(ctx, 21.7, 41.9, 0, { ...folk(137), scale: 0.62, pose: 'sit', dir: 'r', arms: [1.3 + Math.sin(t * 6) * 0.3, 0.4] }, t), { anim: true, on: during(9, 18.5) });

    // ---------- The front arm ----------
    // "Have you seen this goose?" on an A-board.
    R.thing(38.6, 58.8, (ctx) => {
      for (const x of [37.9, 39.3]) line(ctx, [x, 58.5, 0], [x, 58.8, 2.2], C.brown, 0.09);
      board(ctx, 'x', 38.6, 58.8, 1.55, 1.6, 1.4, null, { board: C.white });
      words(ctx, 'y', 58.8, 38.6, 2.05, 'HAVE YOU SEEN', 0.2, C.ink);
      const [X, Y] = P(38.6, 58.8, 1.55);
      ctx.beginPath();
      ctx.ellipse(X, Y, 0.35, 0.22, 0, 0, Math.PI * 2);
      ctx.fillStyle = C.ink;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(X + 0.3, Y - 0.35, 0.1, 0, Math.PI * 2);
      ctx.fill();
      words(ctx, 'y', 58.8, 38.6, 1.08, 'THIS GOOSE?', 0.2, C.ink);
      if (Q.detail) words(ctx, 'y', 58.8, 38.6, 0.92, 'reward: bread', 0.15, C.coral, 'Rethink Sans');
    });
    // The sound desk, from the sound check to the end, and whoever's on it.
    R.thing(40.5, 50.35, (ctx) => {
      box(ctx, 39.8, 50.0, 0, 1.4, 0.7, 0.9, C.ink, { lw: 0.04, left: C.navy });
      if (!Q.detail) return;
      for (let k = 0; k < 6; k++) line(ctx, [39.95 + k * 0.2, 50.15, 0.91], [39.95 + k * 0.2, 50.55, 0.91], C.greyLight, 0.03);
      face(ctx, [[40.8, 50.1, 0.91], [41.1, 50.1, 0.91], [41.1, 50.1, 1.2], [40.8, 50.1, 1.2]], C.tealLight, { lw: 0.02 });
    }, { on: MIXING });
    R.thing(40.5, 49.5, (ctx, t) => {
      const bob = Math.abs(Math.sin(t * 5)) * 0.06;
      person(ctx, 40.5, 49.5, bob, { ...folk(141), top: C.ink, pose: 'stand', arms: [1.1, 1.0], back: true, dir: 'r' }, t);
      const [X, Y] = P(40.5, 49.5, bob);
      ctx.beginPath();
      ctx.arc(X + 0.02, Y - 1.95, 0.37, Math.PI * 1.1, Math.PI * 1.9);
      ctx.strokeStyle = C.coral;
      ctx.lineWidth = 0.08;
      ctx.stroke();
      if (Q.detail && Q.pxPerUnit >= 12 && hour(t) < 19 && Math.sin(t * 0.9) > 0.4) speech(ctx, 40.5, 49.5, 3.0, 'CHECK. CHECK.', { size: 0.42 });
    }, { anim: true, depth: 89.9, on: MIXING });

    // ---------- The party ----------
    for (const g of CROWD) {
      R.thing(g.x, g.y, (ctx, t) => partyGoer(ctx, t, g), { anim: true, fade: ramp(g.from, g.to, 0.25) });
    }
    // Gone by 11. Except him, asleep on the kerb till dawn.
    R.thing(36.5, 50.6, (ctx, t) => {
      person(ctx, 36.5, 50.6, 0.05, { ...folk(151), pose: 'sit', hat: 'party', arms: [0.3, 0.2], dir: 'r' }, t);
      if (!Q.detail) return;
      const k = (t * 0.5) % 1;
      label(ctx, 36.5 + 0.3 * k, 50.6 - 0.3 * k, 2.1 + k * 1.1, 'z', 0.4 + k * 0.3, alpha(C.ink, 1 - k));
    }, { anim: true, on: during(23, 5.8) });

    // ---------- Bunting, lamps, balloons ----------
    STRINGS.forEach(([a, b], i) => {
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      R.thing(mx, my, (ctx) => bunting(ctx, a, b, 0, 14), { depth: mx + my + 1, on: during(STRING_AT(i), 5) });
    });
    // Someone up a stepladder hanging the next string, all morning.
    R.thing(MID, MID, (ctx, t) => {
      const i = Math.min(STRINGS.length - 1, Math.max(0, Math.floor((hour(t) - 7) / 0.6)));
      const [a, b] = STRINGS[i];
      const alongX = a[1] === b[1];
      const [x, y] = alongX ? [MAIN0 + 0.4, a[1] + 0.3] : [a[0] + 0.3, MAIN0 + 0.4];
      for (const [dx, dy] of alongX ? [[-0.2, -0.4], [-0.2, 0.4]] : [[-0.4, -0.2], [0.4, -0.2]]) line(ctx, [x + dx, y + dy, 0], [x, y, 2.5], C.greyLight, 0.07);
      for (const z of [0.7, 1.4, 2.1]) line(ctx, [x - 0.25, y - 0.1, z], [x + 0.05, y + 0.25, z], C.greyLight, 0.05);
      person(ctx, x, y, 2.3, { ...folk(161), top: C.teal, pose: 'wave', dir: alongX ? 'r' : 'l' }, t);
    }, { anim: true, on: during(7, 11.8) });
    // Lamp posts, each with a "Have you seen this goose?" poster; lit at night
    // (the same lamps as the pavement's). The ones nearest the stage get balloons at noon.
    for (const [x, y] of POSTS) {
      streetLamp(R, x, y, true);
      const near = [x, y].some((v) => v === 24 || v === 56);
      if (near) {
        R.thing(x + 0.01, y + 0.01, (ctx) => {
          const [X, Y] = P(x, y, 3.2);
          [C.coral, C.teal, C.mustard].forEach((c, k) => balloon(ctx, X + (k - 1) * 0.12, Y, c, 0, k * 2.1));
        }, { on: during(12, 5) });
      }
    }

    // ---------- The Courier's trail ----------
    // His map, folded in four and dropped on the zebra crossing on the back
    // road: white paper on the white stripes. A street map of the Block itself
    // (a cross of road, the blocks), every one circled and crossed out.
    const [mx, my] = MAP;
    R.thing(mx, my, (ctx) => onFloor(ctx, mx, my, 0.35, () => {
      const W = 0.27, D = 0.21;
      ctx.beginPath();
      ctx.rect(-W, -D, W * 2, D * 2);
      paint(ctx, C.white, { lw: 0.02, stroke: C.greyLight });
      // the roads: Main Street's cross, in the road ink
      ctx.fillStyle = STREET.road;
      ctx.fillRect(-0.035, -D, 0.07, D * 2);
      ctx.fillRect(-W, -0.035, W * 2, 0.07);
      if (!Q.detail) return;
      for (const u of [-0.17, -0.08, 0.08, 0.17]) {
        for (const v of [-0.13, -0.07, 0.07, 0.13]) {
          ctx.fillStyle = C.greyLight;
          ctx.fillRect(u - 0.03, v - 0.02, 0.06, 0.04);
          ctx.beginPath();
          ctx.arc(u, v, 0.035, 0, Math.PI * 2);
          ctx.strokeStyle = alpha(C.coral, 0.55);
          ctx.lineWidth = 0.012;
          ctx.stroke();
        }
      }
      // the folds, and a dog-eared corner
      ctx.strokeStyle = C.greyLight;
      ctx.lineWidth = 0.012;
      ctx.beginPath();
      ctx.moveTo(-W, 0.005); ctx.lineTo(W, 0.005);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(W - 0.08, D); ctx.lineTo(W, D); ctx.lineTo(W, D - 0.08); ctx.closePath();
      paint(ctx, tint(C.greyLight, 0.4), { lw: 0.012, stroke: C.greyLight });
    }));
    // A delivery slip, signed with a webbed foot.
    const [sx, sy] = [27, MID + 2.4];
    R.thing(sx, sy, (ctx) => {
      const z = 0.02;
      face(ctx, [[sx - 0.5, sy - 0.32, z], [sx + 0.5, sy - 0.32, z], [sx + 0.5, sy + 0.32, z], [sx - 0.5, sy + 0.32, z]], C.butter, { lw: 0.035 });
      if (Q.detail) for (const d of [-0.18, -0.06]) line(ctx, [sx - 0.4, sy + d, z], [sx + 0.4, sy + d, z], C.grey, 0.025);
      // the foot: three toes and the web between
      face(ctx, [[sx - 0.1, sy + 0.2, z], [sx + 0.34, sy - 0.02, z], [sx + 0.24, sy + 0.12, z], [sx + 0.4, sy + 0.16, z], [sx + 0.24, sy + 0.22, z], [sx + 0.34, sy + 0.36, z]], C.coral, { lw: 0.02 });
    });
    // The Courier's lunch, off the lane: a lunchbox, lid up, a sandwich.
    const [lx, ly] = [58, 38.4];
    R.thing(lx, ly, (ctx) => {
      box(ctx, lx - 0.4, ly - 0.26, 0, 0.8, 0.52, 0.3, C.brown, { lw: 0.035 });
      face(ctx, [[lx - 0.4, ly - 0.26, 0.3], [lx + 0.4, ly - 0.26, 0.3], [lx + 0.4, ly - 0.4, 0.78], [lx - 0.4, ly - 0.4, 0.78]], tint(C.brown, 0.2), { lw: 0.035 });
      face(ctx, [[lx - 0.3, ly - 0.14, 0.31], [lx + 0.14, ly - 0.14, 0.31], [lx - 0.3, ly + 0.2, 0.31]], C.butter, { lw: 0.025 });
      disc(ctx, lx + 0.2, ly + 0.08, 0.31, 0.12, C.red, { lw: 0.02 });
      if (Q.detail) words(ctx, 'y', ly + 0.26, lx, 0.15, 'LUNCH', 0.15, C.butter);
    });
    // His brown cap, left on the cool box beside it, so the lunch reads as
    // the Courier's.
    R.thing(60.1, 38.6, (ctx) => {
      const [X, Y] = P(59.6, 38.2, 0.62);
      ctx.beginPath(); ctx.ellipse(X + 0.12, Y + 0.06, 0.3, 0.1, -0.2, 0, Math.PI * 2); paint(ctx, shade(C.brown, 0.2), { lw: 0.03 }); // the peak
      ctx.beginPath(); ctx.ellipse(X - 0.04, Y - 0.02, 0.24, 0.17, 0, Math.PI, 0); ctx.closePath(); paint(ctx, C.brown, { lw: 0.03 }); // the crown
      if (Q.detail) { ctx.fillStyle = C.butter; ctx.fillRect(X - 0.14, Y - 0.1, 0.2, 0.05); }
    });
    // He put it down with the party's supplies, waiting by the kerb to be set
    // out: a stack of folding chairs, a cool box, a crate of paper cups, and
    // what's blown off the top of them.
    R.thing(57.1, 38.5, (ctx) => {
      for (let i = 0; i < 5; i++) {
        const z = 0.05 + i * 0.2;
        box(ctx, 56.35, 37.8, z, 0.72, 0.68, 0.07, i % 2 ? C.coral : tint(C.coral, 0.2), { flat: true, lw: 0.03 });
      }
      for (const [x, y] of [[56.4, 37.85], [56.97, 37.85], [56.4, 38.38], [56.97, 38.38]]) box(ctx, x, y, 0, 0.1, 0.1, 1.05, C.ink, { flat: true, stroke: false });
      box(ctx, 56.35, 38.43, 1.05, 0.72, 0.05, 0.55, C.coral, { flat: true, lw: 0.03 }); // the top chair's back
    });
    R.thing(60.05, 38.55, (ctx) => {
      box(ctx, 59.15, 37.85, 0, 0.9, 0.7, 0.5, C.white, { top: C.teal, lw: 0.035 });
      box(ctx, 59.12, 37.82, 0.5, 0.96, 0.76, 0.1, C.teal, { lw: 0.03 });
      words(ctx, 'y', 38.55, 59.6, 0.27, 'ICE', 0.2, C.teal);
    });
    R.thing(59.1, 39.75, (ctx) => {
      box(ctx, 58.4, 39.05, 0, 0.7, 0.7, 0.35, C.wood, { lw: 0.035 });
      if (!Q.detail) return;
      for (const [x, y] of [[58.6, 39.25], [58.9, 39.25], [58.6, 39.55], [58.9, 39.55]]) cylinder(ctx, x, y, 0.35, 0.1, 0.22, C.white, { flat: true });
    });
    R.thing(58.6, 39.6, (ctx) => {
      litter(ctx, 'napkin', 57.3, 39.3, 0.4);
      litter(ctx, 'wrapper', 59.9, 39.4, -0.5);
      litter(ctx, 'napkin', 58.9, 37.75, 1.2);
    });

    // The ending: the geese conga round Main Street (finale.js).
    conga(R);

    // The balloon goose, by the board that asks if you've seen one.
    R.thing(BG.x + 0.6, BG.y + 0.6, (ctx, t) => balloonGoose(ctx, t), { anim: true });
    R.decoy({ id: 'balloon-goose', at: (t) => [BG.x, BG.y, 0.95 + Math.sin(t * 1.1) * 0.07], r: 0.8, say: ['A balloon goose. Full of hot air.', 'Still a balloon.', 'Do not pop the goose.'] });

    R.find({ id: 'courier-map', label: 'The Courier\'s map', kind: 'hard', at: [mx, my, 0.05], r: 0.75, riddle: 'Hiding in plain stripes.', hint: 'One of the white stripes on a crossing is folded in four.' });
    R.find({ id: 'delivery-slip', label: 'A signed delivery slip', at: [sx, sy, 0.05], r: 0.8 });
    R.find({ id: 'bunting', label: 'A roll of bunting', kind: 'poke', inside: partyLid, at: [42.8, 25.25, 1.1], r: 0.75, hint: 'Two crates of party stuff up the back road. A tail of flags is caught in one lid.' });
    R.find({ id: 'lunch', label: 'The Courier\'s lunch', at: [lx, ly, 0.3], r: 0.8 });
  },
};
