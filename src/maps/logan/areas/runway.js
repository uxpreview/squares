// The Runway: along the front of the airport, on the harbor (logan.md). The
// one runway, 33L at the pier end and 15R at the far one, between two strips
// of grass and the seawall; the approach light pier walks out over the water
// on its line, a plane spotter on its end. Planes land over the pier and take
// off back over it on the clock (none from the ground stop on), keeping left
// of the middle: the far end belongs to the gulls, and the goose walks its
// centerline among them. Bird control's cannon goes BANG now and then and
// every gull lifts off (the goose stays, and honks). The plows queue on the
// grass at the pier end all day waiting for snow; at six they sweep the
// runway side by side, down and back, the goose marching on the end of the
// line, plowing nothing.
//
// At 11:30pm Flight 1 is pushed back and towed down the runway to its far end
// (day.js), and the geese cross in front of it (finale.js): for that hour
// nothing taller than a goose stands between x 55 and the far end. The plows
// and the goose are back in the queue at the pier end, the fire truck drives
// down there too (and backs home at one, beeping), and the windsock's hinged
// mast is laid down flat.
//
// One long area drawn in chunks (zone.js): anything that moves across it is
// drawn by the chunk it's over, and a whole toy plane is wider than one
// chunk's picture, so planes are drawn in pieces (flyer, below).
import {
  C, Q, P, box, rect, disc, face, paint, person, label, glow, alpha, tint, shade, mix, hash, cylinder,
} from '../../../engine/art.js';
import { ZK } from '../../../engine/iso.js';
import { clamp } from '../../../engine/actors.js';
import { INK, TONE, LIT, dusk, nightPrint } from '../style.js';
import {
  solid, hexa, frame, planeParts, planeShadow, bag, look, lettering, sign, snowCover, nightGround, printed,
} from '../kit.js';
import { W, D, FRONT, SHORE, SEAWALL, STRIP, CENTER } from '../plan.js';
import { LOOP, hour, flying, snowK, nightK, lightsOn, settle } from '../clock.js';
import { crossing, ending } from '../finale.js';
import { BANGS, bangAge } from '../ambient.js';

// ---------- Time ----------
const TAU = Math.PI * 2;
const wrap = (t) => (((t % LOOP) + LOOP) % LOOP);
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => { const q = clamp(k); return q * q * (3 - 2 * q); };
const frac = (v) => v - Math.floor(v);
const same = (c) => c;
// The runway's lights are on after dark, and in the snow.
const litUp = (t) => lightsOn(t) || snowK(t) > 0.55;
// Seconds since a poke was tapped (its page clock, not the scene's), or a lot.
const since = (pk) => (pk.since > -1e8 ? (performance.now() - pk.since) / 1000 : 1e9);

// ---------- The ground ----------
const [RX0, RY0, RX1, RY1] = STRIP; // 18, 50.5, 102, 55
const WL = -0.55; // the harbor's surface (the paper), for whatever floats or stands in it
const GRASS = TONE.grass;
const TARMAC = INK.tarmac;
const PAD = tint(INK.tarmac, 0.2);
const GRANITE = mix(C.grey, INK.concrete, 0.4);
const ROCK = mix(C.grey, C.brown, 0.28);
const MARK = alpha(C.white, 0.93);
// The taxiways in from the apron: the far one is Flight 1's, the near one
// an exit.
const TAXI = [[87.5, 90.5], [43, 46]];

function groundArt(ctx) {
  // The filled land, grass from the shore to the seawall.
  rect(ctx, SHORE, FRONT, W - SHORE, SEAWALL - FRONT, 0, GRASS, { stroke: false, dots: shade(GRASS, 0.3), density: 0.07 });
  // Tufts, here and there.
  if (Q.detail) {
    ctx.beginPath();
    for (let i = 0; i < 170; i++) {
      const x = SHORE + 0.4 + hash(i, 3) * (W - SHORE - 0.8);
      let y = FRONT + 0.2 + hash(i, 7) * (SEAWALL - FRONT - 0.5);
      if (y > RY0 - 0.25 && y < RY1 + 0.25) y = hash(i, 9) < 0.5 ? FRONT + 0.2 + hash(i, 11) * 2.0 : RY1 + 0.35 + hash(i, 13) * 1.3;
      const [X, Y] = P(x, y, 0);
      ctx.moveTo(X - 0.08, Y); ctx.lineTo(X - 0.12, Y - 0.14);
      ctx.moveTo(X, Y); ctx.lineTo(X, Y - 0.18);
      ctx.moveTo(X + 0.08, Y); ctx.lineTo(X + 0.13, Y - 0.13);
    }
    ctx.strokeStyle = shade(GRASS, 0.32); ctx.lineWidth = 0.03; ctx.lineCap = 'round'; ctx.stroke();
  }
  // Blast pads at both ends, and the taxiways in, widening where they meet.
  rect(ctx, SHORE, RY0 + 0.4, RX0 - SHORE, RY1 - RY0 - 0.8, 0.002, PAD, { stroke: false });
  rect(ctx, RX1, RY0 + 0.4, W - RX1 - 0.25, RY1 - RY0 - 0.8, 0.002, PAD, { stroke: false });
  for (const [a, b] of TAXI) {
    face(ctx, [[a, FRONT, 0.003], [b, FRONT, 0.003], [b + 0.3, 49.7, 0.003], [b + 1.6, RY0 + 0.01, 0.003], [a - 1.6, RY0 + 0.01, 0.003], [a - 0.3, 49.7, 0.003]], PAD, { stroke: false });
  }
  // The runway itself.
  rect(ctx, RX0, RY0, RX1 - RX0, RY1 - RY0, 0.004, TARMAC, { stroke: false, dots: shade(TARMAC, 0.35), density: 0.05 });
  // The seawall: granite blocks down to the water along the front, and round
  // the far end; a lighter coping along its top.
  const lo = WL - 0.05;
  face(ctx, [[SHORE, SEAWALL, 0], [W, SEAWALL, 0], [W, SEAWALL, lo], [SHORE, SEAWALL, lo]], shade(GRANITE, 0.22), { dots: shade(GRANITE, 0.55), density: 0.18, lw: 0.04 });
  face(ctx, [[W, FRONT, 0], [W, SEAWALL, 0], [W, SEAWALL, lo], [W, FRONT, lo]], shade(GRANITE, 0.1), { dots: shade(GRANITE, 0.5), density: 0.12, lw: 0.04 });
  if (Q.detail) {
    const zj = lo / 2;
    ctx.beginPath();
    const seg = (a, b) => { const [ax, ay] = P(...a), [bx, by] = P(...b); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); };
    seg([SHORE, SEAWALL, zj], [W, SEAWALL, zj]);
    seg([W, FRONT, zj], [W, SEAWALL, zj]);
    let i = 0;
    for (let x = SHORE + 0.45; x < W; x += 0.9, i++) seg([x, SEAWALL, i % 2 ? 0 : zj], [x, SEAWALL, i % 2 ? zj : lo]);
    for (let y = FRONT + 0.45; y < SEAWALL; y += 0.9, i++) seg([W, y, i % 2 ? 0 : zj], [W, y, i % 2 ? zj : lo]);
    ctx.strokeStyle = shade(GRANITE, 0.5); ctx.lineWidth = 0.025; ctx.stroke();
  }
  rect(ctx, SHORE, SEAWALL - 0.24, W - SHORE, 0.24, 0.006, tint(GRANITE, 0.25), { stroke: false });
  rect(ctx, W - 0.24, FRONT, 0.24, SEAWALL - FRONT, 0.006, tint(GRANITE, 0.25), { stroke: false });
  face(ctx, [[SHORE, SEAWALL, 0.006], [W, SEAWALL, 0.006]], null, { lw: 0.05 });
  face(ctx, [[W, FRONT, 0.006], [W, SEAWALL, 0.006]], null, { lw: 0.05 });
}

// Words painted flat on the ground, upright for whoever's coming along the
// runway: up 1 for a plane heading +x (landing over the pier), -1 heading -x.
function groundText(ctx, x, y, text, size, color, up) {
  const [X, Y] = P(x, y, 0.012);
  ctx.save();
  if (up > 0) ctx.transform(-1, 0.5, -1, -0.5, X, Y);
  else ctx.transform(1, -0.5, 1, 0.5, X, Y);
  const k = 40;
  ctx.scale(1 / k, 1 / k);
  ctx.font = `700 ${size * k}px "Rethink Sans", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// The runway's paint: threshold bars, its numbers, the aiming points and
// touchdown marks, the dashed centerline and edge lines; the taxiways' yellow
// lead-in lines and hold-short bars; chevrons on the blast pads.
function runwayPaint(ctx) {
  const bar = (x, y, w, d, c = MARK) => rect(ctx, x, y, w, d, 0.01, c, { stroke: false });
  // Threshold bars, four a side of the centerline, at both ends.
  for (const x0 of [RX0 + 0.35, RX1 - 2.55]) {
    for (let i = 0; i < 4; i++) {
      const y = RY0 + 0.35 + i * 0.48;
      bar(x0, y, 2.2, 0.3);
      bar(x0, 2 * CENTER - y - 0.3, 2.2, 0.3);
    }
  }
  // The numbers: 33L at the pier end, 15R at the far end, each upright for
  // the planes that start there.
  groundText(ctx, 24.6, CENTER, '33', 2.4, MARK, 1);
  groundText(ctx, 22.3, CENTER, 'L', 1.9, MARK, 1);
  groundText(ctx, 95.4, CENTER, '15', 2.4, MARK, -1);
  groundText(ctx, 97.7, CENTER, 'R', 1.9, MARK, -1);
  // Aiming points, and touchdown marks.
  for (const x of [29.5, 88.0]) { bar(x, RY0 + 0.95, 2.6, 0.5); bar(x, RY1 - 1.45, 2.6, 0.5); }
  for (const x of [34.5, 83.5]) for (const y of [RY0 + 1.0, RY0 + 1.4, RY1 - 1.55, RY1 - 1.15]) bar(x, y, 1.6, 0.18);
  // Rubber laid down where the wheels touch, and the centerline.
  for (let i = 0; i < 26; i++) {
    const x = 27.5 + hash(i, 31) * 13, y = CENTER + (i % 2 ? 1.1 : -1.1) + (hash(i, 32) - 0.5) * 0.35;
    bar(x, y - 0.05, 1.2 + hash(i, 33) * 3, 0.1, alpha(C.ink, 0.22));
  }
  for (let x = 27; x < 93.5; x += 2.5) bar(x, CENTER - 0.07, 1.5, 0.14);
  // Edge lines.
  bar(RX0, RY0 + 0.12, RX1 - RX0, 0.1);
  bar(RX0, RY1 - 0.22, RX1 - RX0, 0.1);
  // Blast pads' chevrons, pointing at the runway.
  ctx.beginPath();
  for (const [x0, x1] of [[SHORE + 0.15, RX0 - 0.25], [W - 0.4, RX1 + 0.25]]) {
    for (const k of [0, 0.75]) {
      const a = P(lerp(x0, x1, k * 0.6), RY0 + 0.55, 0.01), b = P(lerp(x0, x1, k * 0.6 + 0.4), CENTER, 0.01), c = P(lerp(x0, x1, k * 0.6), RY1 - 0.55, 0.01);
      ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c);
    }
  }
  ctx.strokeStyle = INK.signal; ctx.lineWidth = 0.12; ctx.lineJoin = 'miter'; ctx.stroke();
  // The taxiways' lead-in lines onto the centerline (Flight 1 turns left onto
  // it at the far one; the near one is an exit for planes heading +x), and
  // the hold-short bars across each: two solid, two dashed.
  ctx.beginPath();
  for (const [a, b] of TAXI) {
    const m = (a + b) / 2, left = a > 60 ? -1 : 1;
    const p0 = P(m, FRONT + 0.05, 0.012), p1 = P(m, 50.2, 0.012), c = P(m, CENTER, 0.012), p2 = P(m + left * 3.4, CENTER, 0.012);
    ctx.moveTo(...p0); ctx.lineTo(...p1); ctx.quadraticCurveTo(...c, ...p2);
  }
  ctx.strokeStyle = INK.signal; ctx.lineWidth = 0.1; ctx.lineCap = 'butt'; ctx.stroke();
  for (const [a, b] of TAXI) {
    bar(a + 0.05, 49.18, b - a - 0.1, 0.08, INK.signal);
    bar(a + 0.05, 49.34, b - a - 0.1, 0.08, INK.signal);
    for (let x = a + 0.1; x < b - 0.2; x += 0.55) { bar(x, 49.52, 0.32, 0.08, INK.signal); bar(x, 49.68, 0.32, 0.08, INK.signal); }
  }
}

// ---------- Lights ----------
// Edge lights along both sides (white), the threshold at the pier end
// (green), the far end (red), and the taxiways' (blue). [x, y, color]
const WHITE = LIT, GREEN = tint(C.green, 0.3), RED = C.red, BLUE = mix(C.sky, C.navy, 0.3);
const LAMPS = [];
for (let x = 19; x <= 101; x += 3) {
  for (const y of [RY0 - 0.18, RY1 + 0.18]) if (!(y < CENTER && TAXI.some(([a, b]) => x > a - 1.7 && x < b + 1.7))) LAMPS.push([x, y, WHITE]);
}
for (let y = RY0 + 0.3; y < RY1 - 0.2; y += 0.55) { LAMPS.push([RX0 - 0.15, y, GREEN]); LAMPS.push([RX1 + 0.15, y, RED]); }
for (const [a, b] of TAXI) for (const y of [48.35, 49.95]) { LAMPS.push([a - 0.3, y, BLUE]); LAMPS.push([b + 0.3, y, BLUE]); }

// The fittings, by day: little stalks with a colored lens.
function lampFittings(ctx) {
  for (const [x, y, c] of LAMPS) {
    box(ctx, x - 0.025, y - 0.025, 0, 0.05, 0.05, 0.1, C.grey, { flat: true, stroke: false });
    disc(ctx, x, y, 0.1, 0.07, C.greyLight, { lw: 0.012 });
    if (Q.detail) disc(ctx, x, y, 0.105, 0.035, c === WHITE ? C.white : c, { stroke: false });
  }
}
// Lit: a bright lens and a soft halo on the ground round it.
function lampsLit(ctx) {
  for (const [x, y, c] of LAMPS) {
    disc(ctx, x, y, 0.02, 0.55, alpha(c, 0.13), { stroke: false });
    disc(ctx, x, y, 0.12, 0.24, alpha(c, 0.42), { stroke: false });
    disc(ctx, x, y, 0.13, 0.09, c === WHITE ? C.white : tint(c, 0.25), { stroke: false });
  }
}

// ---------- Planes ----------
// A plane's turn on the runway, every thirty seconds from about 6am till the
// storm (each turn only starts if it can finish before the ground stop): in
// over the harbor and the pier, down by the numbers, rolling out to the
// middle, round, and away again over the pier. The three airlines take turns.
// Planes stay left of x 60: the far end belongs to the gulls and the goose.
// Touchdown is in step with the level's jet sound (sound.js, every 30s from 4).
const CYCLE = 30;
const LIVERIES = ['northeast', 'jetblew', 'spite'];
function traffic(t) {
  const s = wrap(t);
  const n = Math.floor((s + 0.5) / CYCLE), ts = n * CYCLE - 0.5;
  if (!flying(ts) || !flying(ts + 27)) return null;
  const k = s - ts, livery = LIVERIES[n % 3];
  if (k < 4.5) {
    // The approach: over the end of the pier, gliding down to the numbers.
    const q = k / 4.5;
    return { x: lerp(8, 34, q), z: 4.4 * Math.pow(1 - q, 1.35), dir: 1, livery, a: clamp(k / 1.1) };
  }
  if (k < 13.5) {
    // Rolling out, slowing to a stop in the middle.
    const u = k - 4.5, v0 = 26 / 4.5;
    return { x: 34 + v0 * u - (v0 / 18) * u * u, z: 0, dir: 1, livery, a: 1 };
  }
  if (k < 14.3) return { x: 60, z: 0, dir: 1, livery, a: 1 };
  // Round (in a blink: a toy turns on a sixpence), then away over the pier.
  if (k < 17) return { x: 47, z: 0, dir: -1, livery, a: 1 };
  const u = k - 17, x = 47 - 0.6 * u * u;
  if (x < 5.5) return null;
  return { x, z: Math.max(0, (36 - x) * 0.16), dir: -1, livery, a: clamp((x - 5.5) / 7) };
}

// The chunks this long area is drawn in, along x (zone.js cuts it every 16).
const CHUNKS = [0, 16, 32, 48, 64, 80, 96];
const chunkEnd = (x0) => Math.min(x0 + 16, W);
// What a chunk's picture holds on screen, across (iso X), for the area's y.
const holds = (x0, a, b) => a >= x0 - D - 1.4 && b <= chunkEnd(x0) - FRONT + 1.4;
// Each piece of a toy plane (planeParts' order) as a box in the plane's own
// frame, u along it (0 at the nose, toward the tail), v across.
const PIECES = [
  [-7.6, -1.5, -1.3, 1.3], [-9.7, -4.2, -6.7, -0.7], [-13.1, -11, -3.2, -0.2],
  [-0.55, 0], [-1.6, -0.55], [-2.6, -1.6], [-4.6, -2.6], [-6.6, -4.6], [-8.6, -6.6], [-10.2, -8.6], [-11.7, -10.2], [-13, -11.7],
  [-9.7, -4.2, 0.7, 6.7], [-13.1, -11, 0.2, 3.2], [-13.3, -9.6, -0.15, 0.15],
].map((p) => (p.length === 2 ? [...p, -1.3, 1.3] : p));
// A plane that moves, drawn in pieces, each one its own mover. A whole toy
// plane is wider than a chunk's picture, so drawn as one thing it was cut off
// at a picture's edge; each piece is drawn by a chunk whose picture holds it
// (the one it stands over, if it can), and sorts with whatever's round it.
// state(t): null, or { x, y, along, dir, z (in the air), livery, a (0..1) }.
// (Other areas could use it for anything big that moves: Flight 1 too.)
const AWAY = { x: 50, y: 54, gone: true };
function flyer(R, state) {
  let memoT = NaN, memo = null;
  const at = (t) => {
    if (t === memoT) return memo;
    memoT = t;
    const s = state(t);
    if (!s) return (memo = null);
    const night = nightPrint(t);
    const o = { dir: s.dir, z: s.z, livery: s.livery, ink: night ? dusk : null, lit: night, t };
    const parts = planeParts(s.x, s.y, 0, s.along, o);
    const F = frame(s.x, s.y, 0, s.along, s.dir);
    memo = { s, parts: parts.map((p, i) => {
      const [u0, u1, v0, v1] = PIECES[i];
      let a = Infinity, b = -Infinity, mx = -Infinity;
      for (const u of [u0, u1]) for (const v of [v0, v1]) { const [x, y] = F.at(u, v); a = Math.min(a, x - y); b = Math.max(b, x - y); mx = Math.max(mx, x); }
      const own = clamp(Math.floor(mx / 16) * 16, 0, 96);
      const x0 = [own, own - 16, own + 16, own - 32, own + 32].find((c) => c >= 0 && c <= 96 && holds(c, a, b)) ?? own;
      const hx = clamp(p.x, x0 + 0.01, chunkEnd(x0) - 0.01), hy = clamp(p.y, FRONT + 0.01, D - 0.01);
      // (Wings and tailplanes sort over what's on the grass under them.)
      const over = i === 1 || i === 2 || i === 12 || i === 13 ? 1.5 : 0;
      return { draw: p.draw, x: hx, y: hy, ahead: p.x + p.y - hx - hy + (s.z || 0) * 0.9 + over };
    }) };
    return memo;
  };
  PIECES.forEach((_, i) => {
    R.mover((t) => { const m = at(t); return m ? m.parts[i] : AWAY; }, (ctx, t, p) => { if (!p.gone) p.draw(ctx); },
      { fade: (t) => { const m = at(t); return m ? m.s.a : 0; } });
  });
  return at;
}

// ---------- The pier ----------
// The approach light pier, out over the water on the runway's line: a deck on
// piles with railings, a bar of lights across it every two units, and a
// wider platform at the end (and the long bar), where the spotter stands.
const BARS = [1.4, 5, 7, 9, 11, 13, 15];
const DECK = 0.45; // its top
const PIER = [CENTER - 0.6, CENTER + 0.6];
const PLAT = [0.8, 4.6, CENTER - 0.95, CENTER + 0.95];
const PILE = shade(C.brown, 0.15), PLANK = mix(C.grey, C.wood, 0.35), STEEL = shade(C.grey, 0.12);

function pile(ctx, x, y, ink) {
  box(ctx, x - 0.08, y - 0.08, WL, 0.16, 0.16, DECK - 0.1 - WL, ink(PILE), { flat: true, lw: 0.02 });
}
function lightBar(ctx, x, half, ink, night) {
  box(ctx, x - 0.05, CENTER - 0.05, DECK, 0.1, 0.1, 0.7, ink(STEEL), { flat: true, lw: 0.02 });
  box(ctx, x - 0.04, CENTER - half, 1.12, 0.08, half * 2, 0.07, ink(STEEL), { flat: true, lw: 0.02 });
  const n = Math.round(half * 2 / 0.5);
  for (let j = 0; j <= n; j++) {
    const y = CENTER - half + (j * half * 2) / n;
    box(ctx, x - 0.08, y - 0.07, 1.19, 0.16, 0.14, 0.12, night ? LIT : ink(C.greyLight), { flat: true, lw: 0.015 });
  }
}
function rail(ctx, x0, x1, y, ink) {
  for (let x = x0 + 0.1; x < x1; x += 1) box(ctx, x - 0.03, y - 0.03, DECK, 0.06, 0.06, 0.48, ink(STEEL), { flat: true, stroke: false });
  face(ctx, [[x0, y, DECK + 0.48], [x1, y, DECK + 0.48]], null, { lw: 0.05, stroke: ink(STEEL) });
  face(ctx, [[x0, y, DECK + 0.26], [x1, y, DECK + 0.26]], null, { lw: 0.03, stroke: ink(STEEL) });
}
function pierPiece(ctx, ink, night, x0, x1, end) {
  const [y0, y1] = end ? [PLAT[2], PLAT[3]] : PIER;
  for (const x of [x0 + 0.2, x1 - 0.2]) for (const y of [y0 + 0.15, y1 - 0.15]) pile(ctx, x, y, ink);
  if (Q.detail) for (const x of [x0 + 0.2, x1 - 0.2]) disc(ctx, x, y1 - 0.15, WL + 0.01, 0.2, null, { stroke: alpha(C.white, 0.5), lw: 0.025 });
  box(ctx, x0, y0, DECK - 0.12, x1 - x0, y1 - y0, 0.12, ink(PLANK), { lw: 0.03, top: ink(tint(PLANK, 0.1)) });
  if (Q.detail) {
    ctx.beginPath();
    for (let x = x0 + 0.3; x < x1; x += 0.3) { const [ax, ay] = P(x, y0, DECK + 0.002), [bx, by] = P(x, y1, DECK + 0.002); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); }
    ctx.strokeStyle = ink(shade(PLANK, 0.25)); ctx.lineWidth = 0.02; ctx.stroke();
  }
  rail(ctx, x0, x1, y0 + 0.04, ink);
  for (const xb of BARS) if (xb >= x0 && xb < x1) lightBar(ctx, xb, xb < 2 ? 1.75 : 1.1, ink, night);
}

// The plane spotter: on a stepladder at the end of the pier with a big white
// lens and a flask, there all day and all night. He follows every plane over
// him, sips between them, and cheers Flight 1 out at midnight.
const SPOT = [3.4, CENTER + 0.3];
function spotter(ctx, t, plane) {
  const [x, y] = SPOT, z = DECK + 0.78;
  const s = wrap(t), h = hour(t);
  // Who he's watching: the plane in the air nearby, or Flight 1 going out.
  let aim = null;
  if (plane && plane.x < 34) aim = { x: plane.x - (plane.dir > 0 ? 6 : -6), z: plane.z + 1.5 };
  const f1 = s > 318 && s < 337 ? 89 - 3.5 * (s - 310.7) : null;
  if (f1 != null && f1 < 40) aim = { x: f1 + 6, z: Math.max(0, (60 - f1) * 0.12) + 1.5 };
  const cheer = s >= 337 && s < 345;
  const dir = aim ? (aim.x >= x ? 'r' : 'l') : 'r';
  const sip = !aim && !cheer && frac(t / 7.3) > 0.78;
  const ang = aim ? Math.atan2(aim.z + 1.5 - z - 1.6, Math.abs(aim.x - x) + 0.5) : 0.15;
  const lk = look(260, 'traveler', { top: C.mustard, bottom: C.navy, hat: 'beanie', style: 'short' });
  person(ctx, x, y, z, {
    ...lk, dir, pose: cheer ? 'cheer' : 'stand',
    arms: cheer ? undefined : aim ? [1.35 + ang * 0.8, 1.25 + ang * 0.8] : sip ? [2.55, 0.25] : [0.55, 0.3],
    hold: cheer ? null : (g) => {
      if (aim) {
        // The camera at his eye, the long white lens up at the plane.
        g.save(); g.translate(-0.25, -0.62); g.rotate(-ang);
        g.beginPath(); g.rect(-0.12, -0.12, 0.26, 0.22); paint(g, C.ink, { lw: 0.025 });
        g.beginPath(); g.rect(0.12, -0.09, 0.62, 0.16); paint(g, C.white, { lw: 0.025 });
        g.beginPath(); g.rect(0.66, -0.11, 0.12, 0.2); paint(g, C.ink, { lw: 0.02 });
        g.restore();
      } else if (sip) {
        g.save(); g.translate(-0.12, -0.8); g.beginPath(); g.roundRect(-0.07, -0.12, 0.14, 0.24, 0.04); paint(g, C.grey, { lw: 0.02 }); g.restore();
      } else {
        // The camera hanging, the lens pointing down.
        g.save(); g.translate(-0.25, 0.1); g.beginPath(); g.rect(-0.1, -0.1, 0.22, 0.18); paint(g, C.ink, { lw: 0.02 });
        g.beginPath(); g.rect(-0.04, 0.08, 0.13, 0.42); paint(g, C.white, { lw: 0.02 }); g.restore();
      }
    },
    face: (g, hy) => { if (h >= 15.5 || h < 1) { g.beginPath(); g.arc(0.02, hy - 0.36, 0.3, Math.PI * 1.05, Math.PI * 1.95); g.fillStyle = C.white; g.fill(); } },
  }, t);
}
function ladder(ctx) {
  const [x, y] = SPOT;
  for (const dx of [-0.32, 0.32]) {
    face(ctx, [[x + dx, y - 0.18, DECK], [x + dx * 0.4, y - 0.18, DECK + 0.78]], null, { lw: 0.06, stroke: C.grey });
    face(ctx, [[x + dx, y + 0.18, DECK], [x + dx * 0.4, y + 0.18, DECK + 0.78]], null, { lw: 0.06, stroke: C.grey });
  }
  for (const k of [0.3, 0.55]) face(ctx, [[x - 0.32 + k * 0.19, y + 0.18, DECK + k * 0.78], [x - 0.32 + k * 0.19, y - 0.18, DECK + k * 0.78]], null, { lw: 0.05, stroke: C.grey });
  box(ctx, x - 0.2, y - 0.22, DECK + 0.76, 0.4, 0.44, 0.05, C.greyLight, { flat: true, lw: 0.02 });
}

// ---------- Bird control ----------
// The cannon (a propane scare gun on a little trailer, aimed over the
// runway) goes off now and then by day, on the level's clock (ambient.js:
// BANGS, and the sky's flock of gulls going up off the far end, BURST
// seconds); the first sends the gulls back onto the runway for the day, the
// last (3:12pm, with the snow coming) sends them off it for the night. A tap
// fires it too. The officer works it from a safe distance, by remote.
const SCARE = 7.5; // seconds one of our own gulls is up, scared
const BURST = 14; // seconds the sky's flock is up (ambient.js)
const CANNON = [36.7, 48.35];
// Seconds since the cannon last went off (by the clock or a tap), or a lot.
let cannonPoke = null;
const sinceTap = () => (cannonPoke ? since(cannonPoke) : 1e9);
const sinceBang = (t) => Math.min(bangAge(t), sinceTap());

function cannonArt(ctx, ink) {
  const [x, y] = CANNON;
  // The trailer, its wheels and its sign.
  for (const yy of [y - 0.34, y + 0.24]) box(ctx, x - 0.18, yy, 0, 0.36, 0.1, 0.32, ink(C.ink), { flat: true, lw: 0.015 });
  box(ctx, x - 0.55, y - 0.28, 0.22, 1.1, 0.56, 0.1, ink(C.grey), { lw: 0.025 });
  face(ctx, [[x - 0.55, y, 0.27], [x - 1.0, y, 0.12]], null, { lw: 0.05, stroke: ink(C.ink) });
  // The propane tank.
  cylinder(ctx, x - 0.3, y - 0.05, 0.32, 0.16, 0.42, ink(C.white), { top: ink(C.white) });
  // The barrel: a long tube on a post, tipped up over the runway, flared at the muzzle.
  box(ctx, x + 0.12, y - 0.05, 0.32, 0.1, 0.1, 0.3, ink(C.ink), { flat: true, stroke: false });
  const a = P(x + 0.17, y - 0.25, 0.55), b = P(x + 0.17, y + 0.62, 0.86);
  const nx = -(b[1] - a[1]), ny = b[0] - a[0], nl = Math.hypot(nx, ny), ux = nx / nl, uy = ny / nl;
  ctx.beginPath();
  ctx.moveTo(a[0] + ux * 0.1, a[1] + uy * 0.1); ctx.lineTo(b[0] + ux * 0.13, b[1] + uy * 0.13);
  ctx.lineTo(b[0] + ux * 0.2, b[1] + uy * 0.2); ctx.lineTo(b[0] - ux * 0.2, b[1] - uy * 0.2);
  ctx.lineTo(b[0] - ux * 0.13, b[1] - uy * 0.13); ctx.lineTo(a[0] - ux * 0.1, a[1] - uy * 0.1); ctx.closePath();
  paint(ctx, ink(shade(C.grey, 0.3)), { lw: 0.03 });
  ctx.beginPath(); ctx.ellipse(b[0], b[1], 0.1, 0.2, Math.atan2(uy, ux), 0, TAU); paint(ctx, ink(C.ink), { lw: 0.02 });
  lettering(ctx, 'x', x, y + 0.29, 0.26, 'SORRY, GULLS', 0.07, ink(C.white));
}
// The bang: a flash, a ring of smoke rolling out of the muzzle, the word.
function bangArt(ctx, t) {
  const e = sinceBang(t);
  if (e > 2.6) return;
  const [x, y] = CANNON;
  const [mx, my] = P(x + 0.17, y + 0.68, 0.88);
  if (e < 0.18) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.18 : 0.42, a = (i / 10) * TAU; ctx.lineTo(mx + Math.cos(a) * r, my - 0.15 + Math.sin(a) * r * 0.8); }
    ctx.closePath(); paint(ctx, C.butter, { lw: 0.03 });
  }
  for (let i = 0; i < 5; i++) {
    const k = clamp((e - i * 0.05) / 2.4);
    if (k <= 0 || k >= 1) continue;
    const r = 0.14 + k * (0.3 + i * 0.06);
    ctx.beginPath();
    ctx.arc(mx - 0.3 + i * 0.2 + k * 0.4, my - 0.1 - k * (0.6 + i * 0.25), r, 0, TAU);
    ctx.fillStyle = alpha(C.greyLight, 0.85 * (1 - k)); ctx.fill();
  }
  if (e < 1.1 && Q.detail) {
    const k = e / 1.1, s = 0.55 + Math.min(1, e * 6) * 0.25;
    label(ctx, x + 0.3, y + 0.9, 2.1 + k * 0.5, 'BANG!', s, alpha(C.red, 1 - k * k));
  }
}
// The officer, by the windsock with a remote: a thumb on the button before
// each bang, binoculars after, her clipboard the rest of the day.
function officer(ctx, t) {
  const s = wrap(t);
  const next = BANGS.find((b) => b - s > -3.5 && b - s < 1.3);
  const e = next == null ? null : s - next;
  const lk = look(71, 'ramp', { hat: 'beanie', top: INK.safety, style: 'pony' });
  const press = e != null && e < 0, watch = e != null && e >= 0;
  person(ctx, 61.6, 48.55, 0, {
    ...lk, dir: 'l', pose: 'stand', arms: press ? [1.5, 0.3] : watch ? [2.55, 2.45] : [1.05, 1.0],
    hold: (g) => {
      if (press) { g.beginPath(); g.rect(0.05, -0.05, 0.2, 0.14); paint(g, C.ink, { lw: 0.02 }); g.beginPath(); g.arc(0.15, -0.07, 0.05, 0, TAU); paint(g, C.red, { lw: 0.015 }); }
      else if (watch) { g.save(); g.translate(-0.25, -0.68); g.beginPath(); g.rect(-0.02, -0.1, 0.24, 0.18); paint(g, C.ink, { lw: 0.02 }); g.restore(); }
      else { g.beginPath(); g.rect(-0.05, -0.12, 0.3, 0.38); paint(g, C.woodLight, { lw: 0.02 }); g.beginPath(); g.rect(0, -0.06, 0.2, 0.28); paint(g, C.white, { lw: 0.015 }); }
    },
  }, t);
}

// ---------- The windsock ----------
// Orange and white, on a striped mast; it droops on a still morning, comes
// round with the storm and stands straight out all night, flapping. Tapped,
// it spins right round. A red light on top after dark.
const SOCK = [64.25, 48.3];
// The mast is hinged at its foot: laid down flat along the grass (toward -x)
// from 11:25pm to 12:45am, out of Flight 1's way, and stood up again.
function foldK(t) {
  const s = wrap(t);
  if (s < 286 || s >= 335.5) return 0;
  if (s < 288.5) return smooth((s - 286) / 2.5);
  if (s < 333) return 1;
  return 1 - smooth((s - 333) / 2.5);
}
const MAST = 2.95;
function sockArt(ctx, t, tap) {
  const [mx, my] = SOCK, fold = foldK(t), fa = fold * Math.PI / 2;
  const ink = nightPrint(t) ? dusk : same;
  // Laid down (or on its way): the mast drawn here, tilted.
  if (fold > 0) {
    const pt = (k) => P(mx - Math.sin(fa) * MAST * k, my, 0.12 + Math.cos(fa) * MAST * k);
    ctx.lineCap = 'butt';
    const [a0, b0] = pt(0), [a1, b1] = pt(1);
    ctx.beginPath(); ctx.moveTo(a0, b0); ctx.lineTo(a1, b1); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.14; ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const [p0, q0] = pt(i / 6), [p1, q1] = pt((i + 1) / 6);
      ctx.beginPath(); ctx.moveTo(p0, q0); ctx.lineTo(p1, q1); ctx.strokeStyle = ink(i % 2 ? C.white : C.red); ctx.lineWidth = 0.08; ctx.stroke();
    }
  }
  const top = 0.12 + Math.cos(fa) * MAST, tx = mx - Math.sin(fa) * MAST;
  const h = hour(t), hh = h < 4 ? h + 24 : h;
  const storm = hh < 14.5 ? 0 : hh < 17 ? (hh - 14.5) / 2.5 : hh < 26 ? 1 : Math.max(0, 1 - (hh - 26) / 2);
  const gust = 0.5 + 0.5 * Math.sin(t * 0.37) * Math.sin(t * 0.91);
  const strength = clamp(0.25 + storm * 0.75 + gust * 0.2);
  const e = since(tap), spin = e < 1.4 ? smooth(e / 1.4) * TAU : 0;
  const phi = lerp(Math.PI / 2, Math.PI, storm) + Math.sin(t * 1.3) * (0.12 + 0.1 * strength) + spin;
  const droop = (1 - strength) * 0.9;
  const len = 1.25 + strength * 0.4;
  const w = [Math.cos(phi), Math.sin(phi), -droop], wl = Math.hypot(...w);
  const d = [lerp(w[0] / wl, -1, fold), lerp(w[1] / wl, 0, fold), lerp(w[2] / wl, -0.05, fold)], dl = Math.hypot(...d);
  const B = P(tx, my, top), E = P(tx + (d[0] / dl) * len, my + (d[1] / dl) * len, top + (d[2] / dl) * len);
  let ax = E[0] - B[0], ay = E[1] - B[1];
  const al = Math.hypot(ax, ay) || 1; ax /= al; ay /= al;
  const nx = -ay, ny = ax, flap = Math.sin(t * (6 + strength * 6)) * 0.05 * strength;
  const pt = (u, side) => {
    const r = lerp(0.22, 0.09, u), w = flap * u * u;
    return [B[0] + (E[0] - B[0]) * u + nx * (side * r + w), B[1] + (E[1] - B[1]) * u + ny * (side * r + w)];
  };
  for (let i = 0; i < 5; i++) {
    const u0 = i / 5, u1 = (i + 1) / 5;
    ctx.beginPath(); ctx.moveTo(...pt(u0, -1)); ctx.lineTo(...pt(u1, -1)); ctx.lineTo(...pt(u1, 1)); ctx.lineTo(...pt(u0, 1)); ctx.closePath();
    ctx.fillStyle = i % 2 ? C.white : INK.safety; ctx.fill();
  }
  ctx.beginPath();
  for (let i = 0; i <= 10; i++) ctx.lineTo(...pt(i / 10, -1));
  for (let i = 10; i >= 0; i--) ctx.lineTo(...pt(i / 10, 1));
  ctx.closePath(); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.04; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(B[0], B[1], 0.1, 0.22, Math.atan2(ny, nx), 0, TAU); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
  if (lightsOn(t)) {
    const [lx, ly] = P(tx, my, top + 0.32);
    if (Math.sin(t * 3) > -0.4) glow(ctx, tx, my, top + 0.32, 0.9, C.red, 0.9);
    ctx.beginPath(); ctx.arc(lx, ly, 0.06, 0, TAU); ctx.fillStyle = C.red; ctx.fill();
  }
}
function mastBase(ctx, ink) {
  const [mx, my] = SOCK;
  box(ctx, mx - 0.25, my - 0.25, 0, 0.5, 0.5, 0.12, ink(GRANITE), { flat: true, lw: 0.02 });
}
function mastArt(ctx, ink) {
  const [mx, my] = SOCK;
  mastBase(ctx, ink);
  for (let i = 0; i < 6; i++) box(ctx, mx - 0.045, my - 0.045, 0.12 + i * 0.5, 0.09, 0.09, 0.5, ink(i % 2 ? C.white : C.red), { flat: true, lw: 0.012 });
  box(ctx, mx - 0.07, my - 0.07, 3.1, 0.14, 0.14, 0.18, ink(C.grey), { flat: true, lw: 0.015 });
}

// ---------- The fire truck ----------
// The airport's crash tender, on standby by the far taxiway: red, a crew cab
// up front (toward -x) and a tank behind with a monitor on its roof. The crew
// cab's door opens on a tap, and the dalmatian's in the passenger seat; shut,
// a spotty ear shows at the window, and a breath on the glass.
const TRUCK = { x0: 77.6, x1: 82.4, y0: 48.65, y1: 50.35, cab: 79.6, roofCab: 1.5, roofTank: 1.68 };
const DOOR = { x0: 78.0, x1: 79.3, z0: 0.42, z1: 1.42 };
function truckArt(ctx, ink, night) {
  const { x0, x1, y0, y1, cab, roofCab, roofTank } = TRUCK;
  const red = ink(C.red), dark = ink(C.ink);
  for (const yy of [y0 + 0.02, y1 - 0.2]) for (const x of [78.5, 80.75, 81.75]) box(ctx, x - 0.28, yy, 0, 0.56, 0.18, 0.54, dark, { flat: true, lw: 0.02 });
  box(ctx, x0, y0, 0.32, cab - x0, y1 - y0, roofCab - 0.32, red, { dots: ink(shade(C.red, 0.5)), dens: 0.14 });
  box(ctx, cab, y0, 0.32, x1 - cab, y1 - y0, roofTank - 0.32, red, { dots: ink(shade(C.red, 0.5)), dens: 0.14 });
  // The cab's glass, round its front corner; its doorway (dark, under the
  // door, which is drawn with the dalmatian).
  face(ctx, [[x0 + 0.02, y1 + 0.01, 0.95], [DOOR.x0 - 0.05, y1 + 0.01, 0.95], [DOOR.x0 - 0.05, y1 + 0.01, roofCab - 0.08], [x0 + 0.02, y1 + 0.01, roofCab - 0.08]], night ? LIT : ink(shade(C.sky, 0.45)), { lw: 0.02 });
  face(ctx, [[DOOR.x0, y1 + 0.005, DOOR.z0], [DOOR.x1, y1 + 0.005, DOOR.z0], [DOOR.x1, y1 + 0.005, DOOR.z1], [DOOR.x0, y1 + 0.005, DOOR.z1]], night ? shade(LIT, 0.35) : dark, { lw: 0.02 });
  // A white stripe down the side, the roll-up lockers, the name.
  face(ctx, [[x0, y1 + 0.006, 0.66], [x1, y1 + 0.006, 0.66], [x1, y1 + 0.006, 0.8], [x0, y1 + 0.006, 0.8]], ink(C.white), { stroke: false });
  face(ctx, [[x1 + 0.006, y0, 0.66], [x1 + 0.006, y1, 0.66], [x1 + 0.006, y1, 0.8], [x1 + 0.006, y0, 0.8]], ink(C.white), { stroke: false });
  for (const [a, b] of [[79.75, 80.75], [80.85, 81.85]]) {
    face(ctx, [[a, y1 + 0.008, 0.9], [b, y1 + 0.008, 0.9], [b, y1 + 0.008, 1.55], [a, y1 + 0.008, 1.55]], ink(C.greyLight), { lw: 0.02 });
    if (Q.detail) { ctx.beginPath(); for (let z = 0.98; z < 1.55; z += 0.09) { const [p, q] = P(a, y1 + 0.009, z), [r, s] = P(b, y1 + 0.009, z); ctx.moveTo(p, q); ctx.lineTo(r, s); } ctx.strokeStyle = ink(C.grey); ctx.lineWidth = 0.015; ctx.stroke(); }
  }
  lettering(ctx, 'x', 81.0, y1 + 0.01, 0.5, 'FIRE RESCUE 1', 0.15, ink(C.white));
  // A ladder up the back, the monitor on the roof, the light bar on the cab.
  for (const yy of [y0 + 0.5, y1 - 0.5]) face(ctx, [[x1 + 0.03, yy, 0.35], [x1 + 0.03, yy, roofTank]], null, { lw: 0.04, stroke: ink(C.grey) });
  for (let z = 0.5; z < roofTank; z += 0.25) face(ctx, [[x1 + 0.03, y0 + 0.5, z], [x1 + 0.03, y1 - 0.5, z]], null, { lw: 0.03, stroke: ink(C.grey) });
  box(ctx, 80.1, 49.3, roofTank, 0.4, 0.4, 0.18, ink(C.grey), { lw: 0.02 });
  const m0 = P(80.3, 49.5, roofTank + 0.25), m1 = P(79.3, 49.5, roofTank + 0.45);
  ctx.beginPath(); ctx.moveTo(...m0); ctx.lineTo(...m1); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.17; ctx.lineCap = 'round'; ctx.stroke();
  ctx.strokeStyle = ink(C.greyLight); ctx.lineWidth = 0.1; ctx.stroke();
  box(ctx, x0 + 0.12, y0 + 0.25, roofCab, 0.35, y1 - y0 - 0.5, 0.12, ink(C.white), { flat: true, lw: 0.02 });
}
// The door, the dalmatian, the light bar flashing while it's open.
function dalmatian(ctx, t, k) {
  const [X, Y] = P(78.72, TRUCK.y1 - 0.15, 0.62);
  ctx.save(); ctx.translate(X, Y); ctx.scale(-1, 1);
  const wag = Math.sin(t * 9) * 0.06;
  // Sitting up on the seat: body, chest, head out toward the door, ears.
  ctx.beginPath(); ctx.ellipse(0.05, -0.22, 0.26, 0.3, 0.2, 0, TAU); paint(ctx, C.white, { lw: 0.035 });
  ctx.beginPath(); ctx.moveTo(-0.15, -0.05); ctx.quadraticCurveTo(-0.38, -0.08 + wag, -0.42, -0.3 + wag); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.06; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0.2, -0.62, 0.2, 0.17, -0.2, 0, TAU); paint(ctx, C.white, { lw: 0.035 });
  ctx.beginPath(); ctx.ellipse(0.38, -0.58, 0.1, 0.07, 0.1, 0, TAU); paint(ctx, C.white, { lw: 0.03 });
  ctx.beginPath(); ctx.arc(0.47, -0.6, 0.035, 0, TAU); ctx.fillStyle = C.ink; ctx.fill();
  ctx.beginPath(); ctx.ellipse(0.42, -0.5, 0.04, 0.07, 0.3, 0, TAU); ctx.fillStyle = C.coral; ctx.fill();
  ctx.beginPath(); ctx.ellipse(0.06, -0.62, 0.07, 0.15, 0.5, 0, TAU); paint(ctx, C.ink, { lw: 0.02 });
  ctx.fillStyle = C.ink;
  for (const [sx, sy, r] of [[-0.05, -0.3, 0.05], [0.15, -0.15, 0.04], [-0.1, -0.08, 0.04], [0.1, -0.38, 0.035], [0.25, -0.7, 0.03], [-0.12, -0.42, 0.03]]) { ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill(); }
  ctx.beginPath(); ctx.arc(0.22, -0.66, 0.03, 0, TAU); ctx.fill();
  ctx.restore();
  void k;
}
function truckDoor(ctx, t, k) {
  const { y1 } = TRUCK, { x0, x1, z0, z1 } = DOOR;
  const night = nightPrint(t), ink = night ? dusk : same;
  if (k > 0.08) dalmatian(ctx, t, k);
  const a = k * 1.3, w = x1 - x0;
  const fx = x0 + Math.cos(a) * w, fy = y1 + 0.01 + Math.sin(a) * w;
  const out = a < Math.PI / 4;
  const pts = (za, zb) => [[x0, y1 + 0.01, za], [fx, fy, za], [fx, fy, zb], [x0, y1 + 0.01, zb]];
  face(ctx, pts(z0, z1), ink(out ? C.red : shade(C.red, 0.35)), { lw: 0.03 });
  // The window: dark glass (lit at night), and while it's shut a spotty ear
  // pressed to it, and a breath on the glass.
  const win = (u, z) => [x0 + (fx - x0) * u, y1 + 0.01 + (fy - y1 - 0.01) * u, z];
  face(ctx, [win(0.1, 0.95), win(0.9, 0.95), win(0.9, 1.33), win(0.1, 1.33)], night ? LIT : ink(shade(C.sky, 0.45)), { lw: 0.02 });
  if (k < 0.08 && Q.detail) {
    const [ex, ey] = P(78.5, y1 + 0.02, 1.12);
    ctx.beginPath(); ctx.ellipse(ex, ey, 0.13, 0.16, 0.3, 0, TAU); paint(ctx, C.white, { lw: 0.025 });
    ctx.fillStyle = C.ink;
    for (const [sx, sy] of [[-0.04, -0.05], [0.05, 0.04], [-0.02, 0.08]]) { ctx.beginPath(); ctx.arc(ex + sx, ey + sy, 0.03, 0, TAU); ctx.fill(); }
    const fog = 0.5 + 0.5 * Math.sin(t * 1.6);
    const [bx, by] = P(78.95, y1 + 0.02, 1.08);
    ctx.beginPath(); ctx.ellipse(bx, by, 0.1 + fog * 0.07, 0.07 + fog * 0.04, 0, 0, TAU); ctx.fillStyle = alpha(C.white, 0.35 + fog * 0.3); ctx.fill();
  }
  if (Q.detail) { const [hx, hy] = P(...win(0.82, 0.82)); ctx.beginPath(); ctx.rect(hx - 0.06, hy - 0.02, 0.12, 0.04); ctx.fillStyle = C.ink; ctx.fill(); }
  // The light bar, flashing red and white while the door's open.
  if (k > 0.5) {
    const on = Math.sin(t * 14) > 0;
    glow(ctx, TRUCK.x0 + 0.3, 49.15, TRUCK.roofCab + 0.1, 1.0, on ? C.red : C.white, 0.9);
    glow(ctx, TRUCK.x0 + 0.3, 49.85, TRUCK.roofCab + 0.1, 1.0, on ? C.white : C.red, 0.9);
  }
}

// The truck's night: at 11:25pm it drives down to the pier end, out of
// Flight 1's way (parked by the cannon, where the plane's already climbing
// over it), and at 1:15am it backs all the way home, beeping. Where it is
// then, from where it stands by day: { dx, dy, home, moving, reversing }.
const TOUT = [[80, 49.5], [77.5, 51.4], [42.9, 51.4], [40.4, 49.5]];
const TBACK = [[40.4, 49.5], [43, 51.4], [77.5, 51.4], [80, 49.5]];
const TRUCK_OUT = 284, TRUCK_BACK = 345, TRUCK_V = 5;
function truckAt(s) {
  const out = pathLen(TOUT) / TRUCK_V, back = pathLen(TBACK) / TRUCK_V;
  if (s < TRUCK_OUT || s >= TRUCK_BACK + back) return { dx: 0, dy: 0, home: true };
  if (s < TRUCK_OUT + out) { const p = along(TOUT, smooth((s - TRUCK_OUT) / out)); return { dx: p.x - 80, dy: p.y - 49.5, moving: true }; }
  if (s < TRUCK_BACK) return { dx: TOUT[3][0] - 80, dy: 0 };
  const p = along(TBACK, smooth((s - TRUCK_BACK) / back));
  return { dx: p.x - 80, dy: p.y - 49.5, moving: true, reversing: true };
}
// The snow on its roofs.
function truckSnow(ctx) {
  const { x0, x1, y0, y1, cab, roofCab, roofTank } = TRUCK;
  rect(ctx, x0 + 0.05, y0 + 0.05, cab - x0 - 0.1, y1 - y0 - 0.1, roofCab + 0.01, alpha(C.white, 0.92), { lw: 0.02 });
  rect(ctx, cab + 0.05, y0 + 0.05, x1 - cab - 0.1, y1 - y0 - 0.1, roofTank + 0.01, alpha(C.white, 0.92), { lw: 0.02 });
}

// ---------- The plows ----------
// Five plows queue on the grass behind the runway at the pier end all day
// (facing -x, toward the pier), waiting for snow; planes land and take off
// over them. At the ground stop they pull out one by one onto the runway,
// abreast, and sweep it in echelon, each a lane over from the one before and
// a beat behind it (so each one trails the last, throwing the snow toward
// the water), down and back, again and again, turning round at each end one
// after another. They're back in the queue by 11:20pm, before Flight 1 is
// pushed back. The goose marches on the end of the line, in its own lane on
// the grass by the runway's edge.
const QY = 48.38;
const QX = [22.0, 24.2, 26.4, 28.6, 30.8];
const LANE = (i) => 50.9 + i * 0.88;
const GOOSE_LANE = 55.6;
const BEAT = 0.6; // seconds each one runs behind the one before
const T0 = 190.5; // the ground stop, 6pm (clock.js)
const OUT = 10; // pulling out of the queue
const SWEND = 276; // the lead's back at the pier end (11:15pm)
const IN = 7; // pulling back into the queue
const TURNS = [20, 95, 26, 95, 34]; // where the line turns round
const SWEEP = (() => {
  const t0 = T0 + OUT, t1 = SWEND;
  let tot = 0;
  for (let i = 1; i < TURNS.length; i++) tot += Math.abs(TURNS[i] - TURNS[i - 1]);
  const legs = [];
  let t = t0;
  for (let i = 1; i < TURNS.length; i++) {
    const d = TURNS[i] - TURNS[i - 1], dur = (Math.abs(d) / tot) * (t1 - t0);
    legs.push({ t, dur, a: TURNS[i - 1], d });
    t += dur;
  }
  return legs;
})();
// The lead's run at s: where it is, which way it's heading, how fast. Each
// leg speeds up out of the turn, runs steady, and slows into the next.
// Before the first leg it waits at the start, after the last at the end
// (both heading -x).
const EASE = 1.5;
function sweep(s) {
  if (s < SWEEP[0].t) return { L: TURNS[0], dir: -1, v: 0 };
  for (const g of SWEEP) {
    if (s < g.t + g.dur) {
      const u = Math.max(0, s - g.t), T = g.dur, V = Math.abs(g.d) / (T - EASE), sg = Math.sign(g.d);
      let d, v;
      if (u < EASE) { d = (V * u * u) / (2 * EASE); v = (V * u) / EASE; }
      else if (u < T - EASE) { d = (V * EASE) / 2 + V * (u - EASE); v = V; }
      else { const r = T - u; d = Math.abs(g.d) - (V * r * r) / (2 * EASE); v = (V * r) / EASE; }
      return { L: g.a + sg * d, dir: sg, v: sg * v };
    }
  }
  return { L: TURNS[TURNS.length - 1], dir: -1, v: 0 };
}
// Along a path of points, k of the way by distance (0..1).
function along(pts, k) {
  const lens = [];
  let tot = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); lens.push(l); tot += l; }
  let d = clamp(k) * tot;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const u = lens[i] ? Math.min(1, d / lens[i]) : 1, a = pts[i], b = pts[i + 1];
      return { x: lerp(a[0], b[0], u), y: lerp(a[1], b[1], u), dx: b[0] - a[0], dy: b[1] - a[1] };
    }
    d -= lens[i];
  }
  return { x: pts[0][0], y: pts[0][1], dx: 0, dy: 0 };
}
const pathLen = (pts) => { let l = 0; for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return l; };
// Plow i at s: { x, y, dir, moving, parked, v }.
function plowAt(i, s) {
  if (s < T0 || s >= SWEND + IN) return { x: QX[i], y: QY, dir: -1, moving: false, parked: true, v: 0 };
  if (s < T0 + OUT) {
    // Out of the queue, the front one first: down onto its lane, along to the start.
    const pts = [[QX[i], QY], [QX[i] - 1.5, LANE(i)], [TURNS[0], LANE(i)]];
    const start = T0 + i * 0.9, q = clamp((s - start) / (pathLen(pts) / 2.6));
    const p = along(pts, smooth(q));
    return { x: p.x, y: p.y, dir: -1, moving: q > 0 && q < 1, v: 2 };
  }
  if (s >= SWEND) {
    // Back in, the front one first: along its lane, up into its place.
    const end = TURNS[TURNS.length - 1];
    const pts = [[end, LANE(i)], [QX[i] + 1.5, LANE(i)], [QX[i], QY]];
    const start = SWEND + 0.3 + i * 0.9, q = clamp((s - start) / (pathLen(pts) / 2.6));
    if (q <= 0) { const w = sweep(s - i * BEAT); return { x: w.L, y: LANE(i), dir: -1, moving: Math.abs(w.v) > 0.05, v: w.v }; }
    const p = along(pts, smooth(q));
    return { x: p.x, y: p.y, dir: -1, moving: q < 1, v: 2 };
  }
  const w = sweep(s - i * BEAT);
  return { x: w.L, y: LANE(i), dir: w.dir, moving: Math.abs(w.v) > 0.05, v: w.v };
}

const PLOW = INK.safety, BLADE = INK.signal;
// A plow, about 2.2 long with its blade: an orange truck, a sander on the
// back, a cab with its driver at the window, a beacon on the roof (low
// enough that a plane's wing clears it), and a yellow blade angled so the
// snow goes toward the water (+y) whichever way it's heading. (x, y) is its
// middle; dir 1 heads +x. o: { ink, driver: a look or null, doing: what the
// driver's up to while parked, beacon, lights, snow (on its roof), plate }
function plow(ctx, x, y, dir, o, t) {
  const ink = o.ink || same;
  const F = frame(x, y, 0, 'x', dir);
  const col = ink(PLOW), dark = ink(C.ink), pane = o.lights ? LIT : ink(shade(C.sky, 0.3));
  const parts = [];
  const add = (u, v, draw) => { const [px, py] = F.at(u, v); parts.push([px + py, draw]); };
  for (const u of [-0.5, 0.42]) for (const v of [-0.38, 0.38]) add(u, v, () => F.lbox(ctx, u - 0.18, u + 0.18, v - 0.08, v + 0.08, 0, 0.36, dark, { flat: true, lw: 0.02 }));
  add(-0.5, 0, () => {
    F.lbox(ctx, -0.85, 0.2, -0.42, 0.42, 0.22, 0.3, col, { lw: 0.03, dots: ink(shade(PLOW, 0.5)), dens: 0.15 });
    // The sander, its load of grit (or snow on it), a word on its side.
    F.lbox(ctx, -0.85, -0.12, -0.38, 0.38, 0.52, 0.28, ink(shade(PLOW, 0.12)), { lw: 0.03 });
    face(ctx, [F.pt(-0.81, -0.34, 0.805), F.pt(-0.16, -0.34, 0.805), F.pt(-0.16, 0.34, 0.805), F.pt(-0.81, 0.34, 0.805)], o.snow ? C.white : ink(C.brown), { stroke: false });
    if (o.plate && Q.detail) { const [lx, ly] = F.at(-0.48, 0.38); lettering(ctx, 'x', lx, ly + 0.012, 0.66, o.plate, 0.1, ink(C.white)); }
  });
  add(0.32, 0, () => {
    // The cab, with windows on the sides you see and the driver's head at
    // the near one.
    F.lbox(ctx, 0.0, 0.66, -0.42, 0.42, 0.22, 0.92, col, { lw: 0.03, dots: ink(shade(PLOW, 0.5)), dens: 0.12 });
    F.lface(ctx, [[0.08, 0.425, 0.7], [0.58, 0.425, 0.7], [0.58, 0.425, 1.05], [0.08, 0.425, 1.05]], pane, { lw: 0.02 });
    if (dir > 0) F.lface(ctx, [[0.665, -0.34, 0.66], [0.665, 0.34, 0.66], [0.665, 0.34, 1.05], [0.665, -0.34, 1.05]], pane, { lw: 0.02 });
    else F.lface(ctx, [[-0.005, -0.34, 0.82], [-0.005, 0.34, 0.82], [-0.005, 0.34, 1.05], [-0.005, -0.34, 1.05]], pane, { lw: 0.02 });
    if (o.driver && Q.detail) {
      const doing = o.doing, lk = o.driver;
      const nod = doing === 'sleep' ? 0.06 : 0;
      const [hx, hy] = P(...F.pt(0.3, 0.43, 0.89 - nod));
      const f = dir > 0 ? 1 : -1;
      ctx.save(); ctx.translate(hx, hy); ctx.scale(f, 1);
      ctx.beginPath(); ctx.arc(0, 0, 0.12, 0, TAU); paint(ctx, lk.skin, { lw: 0.02 });
      ctx.beginPath(); ctx.arc(0, -0.03, 0.13, Math.PI, 0); paint(ctx, C.mustard, { lw: 0.02 });
      if (doing !== 'sleep') { ctx.beginPath(); ctx.arc(0.06, 0.01, 0.017, 0, TAU); ctx.arc(0.1, 0.01, 0.017, 0, TAU); ctx.fillStyle = C.ink; ctx.fill(); }
      else { ctx.beginPath(); ctx.moveTo(0.03, 0.02); ctx.lineTo(0.12, 0.02); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.015; ctx.stroke(); }
      if (doing === 'paper') { ctx.beginPath(); ctx.rect(0.05, -0.02, 0.22, 0.15); paint(ctx, C.white, { lw: 0.015 }); }
      if (doing === 'coffee') { ctx.beginPath(); ctx.rect(0.09, 0.02, 0.07, 0.08); paint(ctx, C.white, { lw: 0.012 }); }
      ctx.restore();
      if (doing === 'phone') glow(ctx, ...F.pt(0.42, 0.43, 0.82), 0.45, C.sky, 0.8);
      if (doing === 'sleep') {
        const k = frac(t * 0.5 + x * 0.1);
        const [zx, zy, zz] = F.pt(0.3, 0.43, 1.3 + k * 0.8);
        label(ctx, zx - 0.2 * k, zy - 0.2 * k, zz, 'z', 0.3 + k * 0.2, alpha(C.ink, 1 - k));
      }
      if (doing === 'wait' || doing === 'cheer') {
        // An arm out of the window: palm up for the snow, or waving when it comes.
        const a = doing === 'cheer' ? Math.sin(t * 10) * 0.5 : 0;
        const [ax, ay] = P(...F.pt(0.42, 0.44, 0.78)), [bx, by] = P(...F.pt(0.45 + Math.sin(a) * 0.2, 0.78, 1.0 + Math.cos(a) * 0.12));
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineCap = 'round';
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.12; ctx.stroke(); ctx.strokeStyle = lk.top; ctx.lineWidth = 0.08; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(bx, by - 0.02, 0.07, 0.04, 0, 0, TAU); paint(ctx, lk.skin, { lw: 0.015 });
      }
    }
    F.lbox(ctx, -0.03, 0.69, -0.45, 0.45, 1.14, 0.05, col, { flat: true, lw: 0.03 });
    if (o.snow) F.lbox(ctx, 0.0, 0.66, -0.42, 0.42, 1.19, 0.04, C.white, { flat: true, lw: 0.015 });
    // The beacon, turning.
    const [bx, by] = F.at(0.33, 0);
    box(ctx, bx - 0.07, by - 0.07, 1.19, 0.14, 0.14, 0.09, o.beacon ? INK.safety : ink(shade(INK.safety, 0.25)), { flat: true, lw: 0.015 });
    if (o.beacon) {
      const k = 0.5 + 0.5 * Math.sin(t * 9 + x * 0.7);
      glow(ctx, bx, by, 1.27, 1.1 + k * 0.9, INK.safety, 0.55 + k * 0.45);
      const [lx, ly] = P(bx, by, 1.32);
      ctx.beginPath(); ctx.arc(lx, ly, 0.05 + k * 0.04, 0, TAU); ctx.fillStyle = tint(INK.safety, 0.6); ctx.fill();
    }
  });
  add(1.0, 0, () => {
    // The push frame, then the blade: its -y end leads and its +y end
    // trails, so the snow rolls off toward the water.
    face(ctx, [F.pt(0.66, -0.25, 0.34), F.pt(0.94, -0.25, 0.3)], null, { lw: 0.07, stroke: dark });
    face(ctx, [F.pt(0.66, 0.25, 0.34), F.pt(0.94, 0.25, 0.3)], null, { lw: 0.07, stroke: dark });
    const A = F.at(1.12, -0.5), B = F.at(0.9, 0.5);
    const bl = [[A[0], A[1], 0.03], [B[0], B[1], 0.03], [B[0] - 0.08 * dir, B[1], 0.03], [A[0] - 0.08 * dir, A[1], 0.03]];
    solid(ctx, hexa(bl, bl.map((p) => [p[0], p[1], 0.56]), ink(BLADE)), { lw: 0.03 });
    if (Q.detail) {
      face(ctx, [[A[0], A[1], 0.1], [B[0], B[1], 0.1]], null, { lw: 0.07, stroke: dark });
      for (let k = 0.15; k < 0.95; k += 0.2) face(ctx, [[lerp(A[0], B[0], k), lerp(A[1], B[1], k), 0.2], [lerp(A[0], B[0], k + 0.07), lerp(A[1], B[1], k + 0.07), 0.5]], null, { lw: 0.05, stroke: dark });
    }
    if (o.lights) {
      for (const v of [-0.28, 0.28]) { const [hx, hy] = F.at(0.67, v); glow(ctx, hx, hy, 0.62, 0.8, LIT, 0.9); }
      const [gx, gy] = F.at(2.2, 0); glow(ctx, gx, gy, 0, 1.8, LIT, 0.45);
    }
  });
  parts.sort((a, b) => a[0] - b[0]);
  for (const p of parts) p[1]();
}
// The snow off a blade's trailing end, rolling toward the water.
function spray(ctx, x, y, dir, t, seed, big) {
  const n = big ? 6 : 3;
  for (let j = 0; j < n; j++) {
    const k = frac(t * 1.7 + j / n + seed * 0.37);
    const bx = x + dir * 0.9, by = y + 0.5;
    const px = bx - dir * k * 0.6, py = by + k * (big ? 1.4 : 0.7), pz = 0.3 + Math.sin(k * Math.PI) * (big ? 0.7 : 0.4);
    const [X, Y] = P(px, py, pz);
    ctx.beginPath(); ctx.arc(X, Y, (big ? 0.12 : 0.08) * (1 - k * 0.5), 0, TAU);
    ctx.fillStyle = alpha(C.white, 0.9 * (1 - k)); ctx.fill();
  }
}
// The drivers, and what they do while they wait for snow: the one at the
// front has his arm out of the window all day, palm up, and waves it when
// the snow comes.
const DRIVERS = [0, 1, 2, 3, 4].map((i) => look(140 + i * 7, 'crew', { hat: 'beanie' }));
const DOING = ['wait', 'sleep', 'paper', 'coffee', 'phone'];
const PLATES = ['WAITING FOR SNOW', null, 'SINCE OCTOBER', null, null];

// ---------- The goose ----------
// By day it walks the centerline among the gulls at the far end. At dusk it
// walks to the far end and waits on the grass by the runway's edge; when the
// plows come down the runway and turn there, it falls in on the end of their
// line and marches with them, plowing nothing. Back at the pier end it joins
// the back of their queue, and stays there through Flight 1 and the geese
// (all of the ending); at 2:30am it walks back out along the runway's edge to
// the far end for the morning.
const GQ = [32.9, QY];
const GW = [TURNS[1], GOOSE_LANE];
const DAYWALK = (u) => ({ x: 92 + Math.sin(u * 0.25) * 4, y: CENTER, dx: Math.cos(u * 0.25), dy: 0 });
const GJOIN = 172, DAWN_T = 325;
const FIRST_TURN = SWEEP[0].t + SWEEP[0].dur + 5 * BEAT;
const HOME_IN = SWEND + IN + 0.3;
const BACK_IN = [[TURNS[TURNS.length - 1], GOOSE_LANE], [33.4, 51.5], GQ];
const DAWN = [GQ, [33.6, 54.6], [86, 54.6], [88.8, CENTER], [92, CENTER]];
function goosePos(t) {
  const s = wrap(t);
  const honk = sinceBang(t) < 1.6;
  const walk = (p, moving = true) => {
    const dX = p.dx - p.dy;
    return { x: p.x, y: p.y, z: 0, dir: dX >= 0 ? 'r' : 'l', pose: honk ? 'honk' : moving ? 'walk' : 'stand', moving };
  };
  const still = (p, dir = 'l') => ({ x: p[0], y: p[1], z: 0, dir, pose: honk ? 'honk' : 'stand', moving: false });
  // All through the ending, wherever the clock has got to, it waits in the queue.
  if (ending(t)) return still(GQ);
  if (s < GJOIN) return walk(DAYWALK(s));
  if (s < FIRST_TURN) {
    const d0 = DAYWALK(GJOIN), pts = [[d0.x, d0.y], GW];
    const q = (s - GJOIN) / (pathLen(pts) / 1.3);
    return q < 1 ? walk(along(pts, q)) : still(GW);
  }
  if (s < SWEND + 5 * BEAT) {
    const w = sweep(s - 5 * BEAT);
    return { x: w.L, y: GOOSE_LANE, z: 0, dir: w.dir > 0 ? 'r' : 'l', pose: honk ? 'honk' : Math.abs(w.v) > 0.05 ? 'walk' : 'stand', moving: Math.abs(w.v) > 0.05 };
  }
  if (s < HOME_IN) return still(BACK_IN[0]);
  const q = (s - HOME_IN) / (pathLen(BACK_IN) / 1.3);
  if (q < 1) return walk(along(BACK_IN, q));
  if (s < DAWN_T) return still(GQ);
  return walk(along(DAWN, (s - DAWN_T) / (LOOP - DAWN_T)));
}

// ---------- Gulls ----------
// Everywhere on the grass, and a crowd on the far end of the runway round
// the goose by day (the first nine). The crowd goes up with the sky's flock
// at every BANG (ambient.js draws them in the air, so here they're gone
// while it's up) and comes down again: onto the runway at the first BANG of
// the morning, onto the grass for the night at the last (out of the plows'
// way, and clear of where Flight 1 and the geese go at midnight). The rest
// stay put and only jump, at a BANG or a tap. One keeps Uncle Ray company
// all day and all night.
const GULLS = [
  [[86.6, 51.3], [36.2, 56.85]], [[88.9, 54.2], [40.6, 56.88]], [[90.7, 51.2], [47.2, 48.3]], [[93.5, 54.0], [50.6, 56.88]],
  [[95.4, 51.5], [44.6, 48.25]], [[97.3, 54.3], [54.9, 48.4]], [[99.1, 52.0], [53.4, 56.9]], [[100.7, 53.7], [72.4, 56.88]],
  [[91.8, 53.85], [56.8, 48.35]],
  [[18.9, 48.4]], [[29.6, 56.85]], [[41.2, 56.85]], [[52.3, 50.2], [52.3, 48.4]], [[57.6, 56.75]], [[47.5, 56.88]], [[35.0, 48.25]], [[70.2, 56.4], [70.2, 56.9]],
].map(([d, n], i) => ({ day: d, night: n || d, far: i < 9, phase: hash(i, 5) * 10, dir: hash(i, 8) < 0.5 ? 'l' : 'r', lift: 2.4 + hash(i, 6) * 2.2, lag: hash(i, 4) * 0.5, swing: 1 + hash(i, 2) * 1.6 }));

function gullAt(g, t) {
  const s = wrap(t);
  const day = s >= BANGS[0] + BURST && s < BANGS[BANGS.length - 1] + BURST;
  const home = day ? g.day : g.night;
  const age = bangAge(t);
  let e = null;
  if (g.far && age < BURST - 0.4) {
    // Up with the sky's flock: a hop off the ground, then gone till it lands.
    if (age > 0.35) return { x: g.day[0], y: g.day[1], z: 0, gone: true };
    const b = s - age, before = Math.abs(b - BANGS[0]) < 0.01 ? g.night : g.day;
    return { x: before[0], y: before[1], z: (age / 0.35) * 0.8, fly: 1, dir: g.dir };
  }
  if (!g.far && age < SCARE) e = age;
  const tap = sinceTap();
  if (tap < SCARE) e = e == null ? tap : Math.min(e, tap);
  if (e == null || e - g.lag < 0 || e - g.lag > SCARE - 0.5) return { x: home[0], y: home[1], z: 0, fly: 0, dir: g.dir };
  // A scare: up, round in a loop, and back down where it was.
  const q = clamp((e - g.lag) / (SCARE - 0.5));
  const up = q < 0.12 ? Math.sin((q / 0.12) * Math.PI / 2) : q < 0.72 ? 1 : 1 - smooth((q - 0.72) / 0.28);
  const a = q * TAU * 0.8 + g.phase;
  const x = home[0] + Math.sin(a) * g.swing * Math.sin(q * Math.PI);
  const y = home[1] + (Math.cos(a) - Math.cos(g.phase)) * g.swing * 0.5 * Math.sin(q * Math.PI);
  return { x, y, z: up * g.lift, fly: up > 0.02 ? 1 : 0, dir: Math.cos(a) >= 0 ? 'r' : 'l' };
}
// A herring gull: white, a grey back with black tips, a yellow bill, pink
// legs; about half the goose's height. In the air, wings out and flapping.
function gull(ctx, x, y, z, t, o) {
  const [X, Y] = P(x, y, z);
  const f = o.dir === 'l' ? -1 : 1, s = 1.2;
  ctx.save(); ctx.translate(X, Y); ctx.scale(f * s, s);
  if (o.fly) {
    const fl = Math.sin(t * 12 + o.phase) * 0.22;
    if (Q.detail) { ctx.save(); ctx.translate(0, (z * ZK) / s); ctx.beginPath(); ctx.ellipse(0, 0, 0.2, 0.08, 0, 0, TAU); ctx.fillStyle = alpha(C.ink, 0.12); ctx.fill(); ctx.restore(); }
    const wing = (dy) => {
      ctx.beginPath(); ctx.moveTo(-0.05, -0.1); ctx.quadraticCurveTo(-0.15, -0.3 - dy, -0.36, -0.22 - dy * 1.6); ctx.lineTo(-0.1, -0.07); ctx.closePath(); paint(ctx, C.greyLight, { lw: 0.025 });
    };
    wing(fl);
    ctx.beginPath(); ctx.ellipse(0, -0.08, 0.2, 0.065, 0, 0, TAU); paint(ctx, C.white, { lw: 0.03 });
    ctx.beginPath(); ctx.arc(0.18, -0.11, 0.055, 0, TAU); paint(ctx, C.white, { lw: 0.025 });
    ctx.beginPath(); ctx.moveTo(0.22, -0.12); ctx.lineTo(0.31, -0.1); ctx.lineTo(0.22, -0.09); ctx.fillStyle = C.mustard; ctx.fill();
    ctx.save(); ctx.scale(1, -1); ctx.translate(0, 0.16); wing(-fl * 0.7); ctx.restore();
  } else {
    if (Q.detail) { ctx.beginPath(); ctx.ellipse(0, 0, 0.2, 0.08, 0, 0, TAU); ctx.fillStyle = alpha(C.ink, 0.15); ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(-0.04, -0.17); ctx.lineTo(-0.05, 0); ctx.moveTo(0.04, -0.17); ctx.lineTo(0.05, 0);
    ctx.strokeStyle = C.blush; ctx.lineWidth = 0.035; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-0.02, -0.25, 0.2, 0.1, -0.12, 0, TAU); paint(ctx, C.white, { lw: 0.03 });
    ctx.beginPath(); ctx.moveTo(0.1, -0.33); ctx.quadraticCurveTo(-0.08, -0.38, -0.22, -0.3); ctx.lineTo(-0.3, -0.24); ctx.quadraticCurveTo(-0.08, -0.22, 0.1, -0.26); ctx.closePath(); paint(ctx, C.grey, { lw: 0.025 });
    ctx.beginPath(); ctx.moveTo(-0.22, -0.3); ctx.lineTo(-0.34, -0.25); ctx.lineTo(-0.24, -0.25); ctx.closePath(); ctx.fillStyle = C.ink; ctx.fill();
    const peck = o.peck ? 0.12 : 0;
    ctx.beginPath(); ctx.arc(0.15, -0.38 + peck, 0.075, 0, TAU); paint(ctx, C.white, { lw: 0.025 });
    ctx.beginPath(); ctx.moveTo(0.2, -0.39 + peck); ctx.lineTo(0.31, -0.37 + peck); ctx.lineTo(0.2, -0.35 + peck); ctx.closePath(); ctx.fillStyle = C.mustard; ctx.fill();
    ctx.beginPath(); ctx.arc(0.17, -0.4 + peck, 0.018, 0, TAU); ctx.fillStyle = C.ink; ctx.fill();
  }
  ctx.restore();
}

// ---------- In the water ----------
// Boulders at the seawall's foot, and the flat-topped seal rocks.
function rock(ctx, x, y, r, top, ink, seed) {
  const n = 9, pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + seed, rr = r * (0.78 + 0.32 * hash(seed * 13, i));
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8]);
  }
  // The sides you see, down to the water; then the top, a little domed.
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n], mx = (a[0] + b[0]) / 2 - x, my = (a[1] + b[1]) / 2 - y;
    if (mx + my <= -0.02) continue;
    face(ctx, [[a[0], a[1], top - 0.08], [b[0], b[1], top - 0.08], [b[0], b[1], WL], [a[0], a[1], WL]], ink(shade(ROCK, mx > my ? 0.14 : 0.28)), { lw: 0.025, dots: Q.detail ? ink(shade(ROCK, 0.55)) : null, density: 0.16 });
  }
  face(ctx, pts.map(([px, py]) => [px, py, top - 0.08]), ink(tint(ROCK, 0.05)), { lw: 0.03 });
  face(ctx, pts.map(([px, py]) => [x + (px - x) * 0.7, y + (py - y) * 0.7 - 0.05, top]), ink(tint(ROCK, 0.18)), { stroke: false });
  if (Q.detail && r > 0.42) disc(ctx, x + r * 0.25, y + r * 0.45, WL + 0.005, r * 1.08, null, { stroke: alpha(C.white, 0.4), lw: 0.022 });
}
// Riprap along the seawall's foot, a jumble of boulders just out of the
// water, in stretches (each one thing); and the flat-topped seal rocks
// further out.
const RIPRAP = [];
for (let x = SHORE + 0.5, i = 0; x < W - 0.3; i++) {
  const big = hash(i, 25) < 0.3;
  // (None where the geese hop down into the harbor at midnight: finale.js.)
  if (x < 79.5 || x > 94.5) RIPRAP.push([x, SEAWALL + 0.2 + hash(i, 21) * (big ? 0.55 : 0.3), big ? 0.42 + hash(i, 22) * 0.2 : 0.22 + hash(i, 22) * 0.18, WL + 0.12 + hash(i, 23) * (big ? 0.35 : 0.18)]);
  x += 0.45 + hash(i, 24) * 0.6;
}
const SEALROCKS = [[21.7, 58.0, 0.85, 0.12], [23.1, 58.45, 0.95, 0.16], [24.6, 58.25, 0.7, 0.06]];

// A harbor seal in its banana pose, head and tail up, on a rock; it lifts its
// head now and then, and flaps its tail.
function seal(ctx, x, y, z, t, o) {
  const [X, Y] = P(x, y, z);
  const f = o.dir === 'l' ? -1 : 1, s = o.s || 1, ph = o.phase || 0, col = o.color;
  ctx.save(); ctx.translate(X, Y); ctx.scale(f * s, s);
  const head = 0.08 + Math.max(0, Math.sin(t * 0.6 + ph)) * 0.16;
  const tail = 0.06 + Math.max(0, Math.sin(t * 1.7 + ph + 2)) * Math.max(0, Math.sin(t * 0.3 + ph)) * 0.14;
  ctx.beginPath();
  ctx.moveTo(-0.62, -0.1 - tail);
  ctx.quadraticCurveTo(-0.2, 0.08, 0.28, 0.0);
  ctx.quadraticCurveTo(0.48, -0.04, 0.55, -0.18 - head);
  ctx.quadraticCurveTo(0.5, -0.38 - head, 0.3, -0.33 - head * 0.5);
  ctx.quadraticCurveTo(-0.1, -0.36, -0.5, -0.2 - tail * 0.7);
  ctx.closePath();
  paint(ctx, col, { dots: Q.detail ? shade(col, 0.5) : null, density: 0.18, lw: 0.04 });
  // Flippers at the tail, a front flipper, the face.
  ctx.beginPath(); ctx.moveTo(-0.55, -0.12 - tail); ctx.lineTo(-0.74, -0.2 - tail * 1.4); ctx.lineTo(-0.7, -0.05 - tail); ctx.closePath(); paint(ctx, shade(col, 0.2), { lw: 0.025 });
  ctx.beginPath(); ctx.ellipse(0.12, -0.04, 0.12, 0.05, 0.4, 0, TAU); paint(ctx, shade(col, 0.15), { lw: 0.02 });
  ctx.fillStyle = C.ink;
  ctx.beginPath(); ctx.arc(0.42, -0.27 - head * 0.85, 0.035, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(0.54, -0.21 - head * 0.9, 0.025, 0, TAU); ctx.fill();
  if (Q.detail) {
    ctx.beginPath();
    for (const dy of [-0.02, 0.02]) { ctx.moveTo(0.52, -0.2 - head * 0.9 + dy); ctx.lineTo(0.68, -0.23 - head * 0.9 + dy * 2); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.012; ctx.stroke();
  }
  ctx.restore();
}

// A mute swan, afloat in front of the seawall in November, lost: bigger than
// the goose, an S of a neck, an orange bill with a black knob, its wings
// raised a little like sails. It turns its head this way and that.
const SWAN = [44, SEAWALL + 1.6];
function swan(ctx, t) {
  const bob = Math.sin(t * 1.3) * 0.03, drift = Math.sin(t * 0.11) * 0.35;
  const x = SWAN[0] + drift, y = SWAN[1];
  if (Q.detail) for (let i = 0; i < 2; i++) {
    const k = frac(t * 0.35 + i * 0.5);
    disc(ctx, x, y, WL + 0.005, 0.5 + k * 0.7, null, { stroke: alpha(C.white, 0.5 * (1 - k)), lw: 0.03 });
  }
  const [X, Y] = P(x, y, WL + bob);
  const look = Math.sin(t * 0.5) > 0.3 ? -1 : 1;
  ctx.save(); ctx.translate(X, Y); ctx.scale(-1.15 * look, 1.15);
  ctx.beginPath(); ctx.ellipse(0, -0.06, 0.5, 0.2, 0, 0, TAU); ctx.fillStyle = alpha(C.ink, 0.12); ctx.fill();
  // The body, a boat with a lifted tail.
  ctx.beginPath();
  ctx.moveTo(-0.55, -0.32); ctx.quadraticCurveTo(-0.5, -0.05, -0.1, -0.02); ctx.quadraticCurveTo(0.35, 0.0, 0.45, -0.2);
  ctx.quadraticCurveTo(0.2, -0.32, -0.05, -0.45); ctx.quadraticCurveTo(-0.35, -0.5, -0.55, -0.32); ctx.closePath();
  paint(ctx, C.white, { dots: Q.detail ? C.grey : null, density: 0.1, lw: 0.04 });
  // Raised wings.
  ctx.beginPath(); ctx.moveTo(-0.38, -0.38); ctx.quadraticCurveTo(-0.15, -0.68, 0.18, -0.42); ctx.quadraticCurveTo(-0.05, -0.38, -0.38, -0.38); paint(ctx, C.white, { lw: 0.03 });
  if (Q.detail) { ctx.beginPath(); ctx.moveTo(-0.25, -0.44); ctx.quadraticCurveTo(-0.1, -0.55, 0.08, -0.45); ctx.strokeStyle = C.greyLight; ctx.lineWidth = 0.025; ctx.stroke(); }
  // The S of the neck, and the head.
  ctx.beginPath(); ctx.moveTo(0.3, -0.22); ctx.bezierCurveTo(0.55, -0.45, 0.15, -0.75, 0.32, -1.05);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.17; ctx.lineCap = 'round'; ctx.stroke();
  ctx.strokeStyle = C.white; ctx.lineWidth = 0.1; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0.38, -1.08, 0.12, 0.08, 0.3, 0, TAU); paint(ctx, C.white, { lw: 0.03 });
  ctx.beginPath(); ctx.moveTo(0.46, -1.1); ctx.lineTo(0.66, -1.0); ctx.lineTo(0.48, -1.02); ctx.closePath(); paint(ctx, C.coral, { lw: 0.02 });
  ctx.beginPath(); ctx.arc(0.46, -1.11, 0.045, 0, TAU); ctx.fillStyle = C.ink; ctx.fill();
  ctx.beginPath(); ctx.arc(0.4, -1.11, 0.022, 0, TAU); ctx.fill();
  ctx.restore();
}

// The fisherman: rows in at dawn and fishes off the end of the runway all
// day, under the sign. At ten he reels in a suitcase. At half past three he
// rows home with it.
const BOAT = { x: 70, y: 59.2 };
const ROW_IN = [20, 33], ROW_OUT = [152, 165], CATCH = 96;
function boatAt(s) {
  if (s < ROW_IN[0] || s >= ROW_OUT[1]) return null;
  if (s < ROW_IN[1]) { const q = smooth((s - ROW_IN[0]) / (ROW_IN[1] - ROW_IN[0])); return { x: lerp(105.5, BOAT.x, q), rowing: true, a: clamp((105.5 - lerp(105.5, BOAT.x, q)) / 3) }; }
  if (s >= ROW_OUT[0]) { const q = smooth((s - ROW_OUT[0]) / (ROW_OUT[1] - ROW_OUT[0])); const x = lerp(BOAT.x, 105.5, q); return { x, rowing: true, a: clamp((105.5 - x) / 3) }; }
  return { x: BOAT.x, rowing: false, a: 1 };
}
function dinghy(ctx, t, s, p) {
  const { y } = BOAT, x = p.x, z = WL + Math.sin(t * 1.4) * 0.03;
  if (Q.detail) disc(ctx, x, y, WL + 0.005, 1.5 + Math.sin(t * 1.4) * 0.05, null, { stroke: alpha(C.white, 0.45), lw: 0.03 });
  const zt = z + 0.36;
  const top = [[x - 1.05, y - 0.42], [x + 0.72, y - 0.42], [x + 1.22, y], [x + 0.72, y + 0.42], [x - 1.05, y + 0.42]];
  const low = top.map(([px, py]) => [x + (px - x) * 0.86, y + (py - y) * 0.8]);
  // Inside: the far walls in shadow, the floor, a thwart.
  face(ctx, top.map(([px, py]) => [px, py, zt]), shade(C.woodLight, 0.35), { lw: 0.035 });
  face(ctx, low.map(([px, py]) => [px, py, z + 0.06]), C.woodLight, { stroke: false, dots: Q.detail ? C.wood : null, density: 0.12 });
  box(ctx, x - 0.42, y - 0.4, z + 0.22, 0.32, 0.8, 0.06, C.wood, { flat: true, lw: 0.02 });
  // The catch, on the floor.
  const caught = s >= CATCH + 3;
  if (caught) bag(ctx, x + 0.55, y, z + 0.08, { kind: 'case', color: C.navy, lie: true, tag: C.mustard, along: 'x' });
  const lk = look(52, 'traveler', { top: C.red, bottom: C.navy, hat: 'beanie', style: 'curly' });
  const reel = s >= CATCH && s < CATCH + 3;
  const row = Math.sin(t * 3);
  person(ctx, x - 0.26, y, z - 0.33, {
    ...lk, pose: 'sit', dir: p.rowing ? 'l' : 'r', scale: 0.85, arms: p.rowing ? [1.1 + row * 0.45, 1.1 + row * 0.45] : reel ? [2.3, 1.9] : [1.55, 1.15],
  }, t);
  // The hull's sides you see, over his legs, and its white rubbing strake.
  for (let i = 1; i < 4; i++) {
    const a = top[i], b = top[i + 1];
    face(ctx, [[a[0], a[1], zt], [b[0], b[1], zt], [x + (b[0] - x) * 0.86, y + (b[1] - y) * 0.8, z - 0.1], [x + (a[0] - x) * 0.86, y + (a[1] - y) * 0.8, z - 0.1]], i === 3 ? C.teal : shade(C.teal, 0.12), { lw: 0.03, dots: Q.detail ? shade(C.teal, 0.5) : null, density: 0.16 });
  }
  face(ctx, [[x - 1.05, y + 0.43, zt - 0.08], [x + 0.72, y + 0.43, zt - 0.08], [x + 1.2, y + 0.02, zt - 0.08]], null, { lw: 0.05, stroke: C.white });
  if (p.rowing) {
    for (const side of [-1, 1]) {
      const [ax, ay] = P(x - 0.2, y + side * 0.44, zt), [bx, by] = P(x - 0.2 + 0.7 * row, y + side * 1.25, WL);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.08; ctx.stroke(); ctx.strokeStyle = C.wood; ctx.lineWidth = 0.045; ctx.stroke();
    }
    return;
  }
  // The rod, out over the water, and its line: a bobber, or the suitcase coming up.
  const tip = [x + 1.45, y + 0.75, z + 2.1 + (reel ? 0.45 : Math.sin(t * 0.7) * 0.08)];
  const [hx, hy] = P(x + 0.12, y + 0.02, z + 0.8), [ax, ay] = P(...tip);
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ax, ay); ctx.lineCap = 'round';
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.075; ctx.stroke(); ctx.strokeStyle = C.brown; ctx.lineWidth = 0.035; ctx.stroke();
  let end = [x + 1.55, y + 0.95, WL + 0.02];
  if (reel) { const k = (s - CATCH) / 3; end = [x + 1.55 - k * 0.2, y + 0.95 - k * 0.15, lerp(WL, tip[2] - 0.6, Math.min(1, k * 1.4))]; }
  const [bx, by] = P(...end);
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(ax + 0.05, (ay + by) / 2 + 0.1, bx, by); ctx.strokeStyle = alpha(C.ink, 0.7); ctx.lineWidth = 0.015; ctx.stroke();
  if (reel) bag(ctx, end[0], end[1], end[2] - 0.62, { kind: 'case', color: C.navy, tag: C.mustard });
  else { ctx.beginPath(); ctx.arc(bx, by - 0.04, 0.06, 0, TAU); paint(ctx, C.red, { lw: 0.015 }); }
}

// ---------- People on the grass ----------
// The fire crew by day: one in a camp chair with the paper, one polishing
// the truck that's already spotless. After dark they're in the cab.
const CHAIR = [83.8, 48.45];
function campChair(ctx, ink) {
  const [x, y] = CHAIR;
  for (const [dx, dy] of [[-0.25, -0.22], [0.25, -0.22], [-0.25, 0.22], [0.25, 0.22]]) face(ctx, [[x + dx, y + dy, 0], [x - dx * 0.2, y - dy * 0.2, 0.5]], null, { lw: 0.04, stroke: ink(C.ink) });
  face(ctx, [[x - 0.28, y - 0.25, 0.5], [x + 0.28, y - 0.25, 0.5], [x + 0.28, y + 0.25, 0.48], [x - 0.28, y + 0.25, 0.48]], ink(INK.cranberry), { lw: 0.025 });
  face(ctx, [[x + 0.28, y - 0.25, 0.5], [x + 0.28, y + 0.25, 0.5], [x + 0.36, y + 0.25, 1.15], [x + 0.36, y - 0.25, 1.15]], ink(shade(INK.cranberry, 0.15)), { lw: 0.025 });
}
const crewDay = (t) => { const h = hour(t); return h >= 6 && h < 15.5; };
function polisher(ctx, t) {
  const lk = look(88, 'crew', { hat: 'helmet', style: 'bun' });
  person(ctx, 80.9, 50.85, 0, {
    ...lk, dir: 'l', back: true, pose: 'stand', arms: [1.9 + Math.sin(t * 5) * 0.45, 0.4 + Math.cos(t * 5) * 0.2],
    hold: (g) => { g.beginPath(); g.ellipse(0.32 + Math.sin(t * 5) * 0.08, -0.45, 0.1, 0.07, 0, 0, TAU); paint(g, C.white, { lw: 0.015 }); },
  }, t);
}
// The bulb changer: down the row of edge lights on the near side from seven
// till three, a few minutes a light, testing each one (it blinks).
const BULBS = [];
for (let x = 64; x <= 100; x += 3) BULBS.push(x);
const BULB_T = [36, 153];
function bulbAt(s) {
  if (s < BULB_T[0] || s >= BULB_T[1]) return null;
  const per = (BULB_T[1] - BULB_T[0]) / BULBS.length, i = Math.min(BULBS.length - 1, Math.floor((s - BULB_T[0]) / per)), u = (s - BULB_T[0]) - i * per;
  const x1 = BULBS[i] + 0.55, x0 = i ? BULBS[i - 1] + 0.55 : x1 - 2;
  if (u < 2) return { x: lerp(x0, x1, u / 2), y: RY1 + 0.75, walk: true, i };
  return { x: x1, y: RY1 + 0.75, walk: false, i, u };
}
function bulbChanger(ctx, t, p) {
  const lk = look(117, 'crew', { hat: 'helmet' });
  if (!p.walk) {
    // His toolbox, the bulb he's testing blinking.
    box(ctx, p.x + 0.35, p.y + 0.05, 0, 0.42, 0.24, 0.22, C.red, { flat: true, lw: 0.02 });
    box(ctx, p.x + 0.45, p.y + 0.11, 0.22, 0.22, 0.04, 0.05, C.ink, { flat: true, stroke: false });
    if (Math.sin(t * 6) > 0) glow(ctx, BULBS[p.i], RY1 + 0.18, 0.15, 0.6, LIT, 0.9);
  }
  person(ctx, p.x, p.y, p.walk ? 0 : -0.35, { ...lk, dir: 'l', back: !p.walk, pose: p.walk ? 'walk' : 'sit', arms: p.walk ? undefined : [1.3 + Math.sin(t * 4) * 0.15, 1.1] }, t);
}

// ---------- Uncle Ray ----------
// A small wooden box with a brass plate, fallen off a passing cart onto the
// grass by the seawall, sitting the right way up and facing the runway. He
// always wanted to see it. Once his family's found him, he's gone home, and
// there's only the claim tag. A gull keeps him company.
const RAY = [58.5, 56.3];
function rayArt(ctx, t, home) {
  const [x, y] = RAY;
  if (home) {
    // The claim tag he left, on its string.
    rect(ctx, x - 0.18, y - 0.1, 0.36, 0.2, 0.02, C.white, { lw: 0.02 });
    rect(ctx, x - 0.12, y - 0.04, 0.24, 0.06, 0.025, C.mustard, { stroke: false });
    face(ctx, [[x + 0.18, y, 0.025], [x + 0.45, y + 0.15, 0.02]], null, { lw: 0.02, stroke: C.ink });
    if (Q.detail) lettering(ctx, 'x', x, y + 0.11, 0.06, 'HOME', 0.07, C.ink);
    return;
  }
  const w = 0.62, d = 0.44, h = 0.4;
  box(ctx, x - w / 2, y - d / 2, 0, w, d, h, C.wood, { top: C.woodLight, dots: shade(C.wood, 0.45), dens: 0.15 });
  // The lid's rim, the brass plate with his name, a luggage tag on a string.
  box(ctx, x - w / 2 - 0.02, y - d / 2 - 0.02, h, w + 0.04, d + 0.04, 0.05, C.woodLight, { lw: 0.025 });
  face(ctx, [[x - 0.17, y + d / 2 + 0.005, 0.1], [x + 0.17, y + d / 2 + 0.005, 0.1], [x + 0.17, y + d / 2 + 0.005, 0.26], [x - 0.17, y + d / 2 + 0.005, 0.26]], C.mustard, { lw: 0.015 });
  lettering(ctx, 'x', x, y + d / 2 + 0.01, 0.18, 'RAY', 0.13, C.ink, 'Bagel Fat One');
  const sw = Math.sin(t * 1.1) * 0.03;
  face(ctx, [[x + w / 2, y + 0.08, 0.3], [x + w / 2 + 0.12, y + 0.18 + sw, 0.12]], null, { lw: 0.015, stroke: C.ink });
  face(ctx, [[x + w / 2 + 0.06, y + 0.12 + sw, 0.15], [x + w / 2 + 0.24, y + 0.2 + sw, 0.15], [x + w / 2 + 0.24, y + 0.2 + sw, 0.03], [x + w / 2 + 0.06, y + 0.12 + sw, 0.03]], C.white, { lw: 0.015 });
}

// ---------- The area ----------
export default {
  id: 'runway',
  name: 'The Runway',
  blurb: 'One runway, ending on a pier over the harbor. The gulls own it, the plows wait for snow, and the goose thinks it\'s cleared for takeoff.',
  describe: 'A runway along the water, its end on a pier of lights walking out over the harbor. Planes land, turn and take off, gulls stand about, a fire crew waits, a windsock swings. After dark, five snowplows sweep the runway side by side, again and again.',

  build(R) {
    // ----- The ground, its paint and its lights -----
    R.floor(groundArt);
    R.rug(runwayPaint);
    R.rug(lampFittings);
    // The snow, laid on as it settles (the plows keep the runway and the
    // taxiways clear), and the night's veil, each baked a step at a time.
    const stepped = (fn) => {
      const rug = R.rug;
      R.rug = (draw, o = {}) => rug(draw, o.fade && !o.step ? { ...o, step: (t) => Math.round(o.fade(t) * 12) } : o);
      try { fn(); } finally { R.rug = rug; }
    };
    const LANDS = [[SHORE, FRONT, W, SEAWALL]];
    const GRASSES = [[SHORE, FRONT, W, RY0], [SHORE, RY1, W, SEAWALL], [SHORE, RY0, RX0, RY1], [RX1, RY0, W, RY1]];
    stepped(() => snowCover(R, GRASSES, { clear: TAXI.map(([a, b]) => [a - 0.6, FRONT, b + 0.6, RY0]) }));
    // The runway, plowed: a dusting, and the snow they've pushed off it
    // banked along its edges.
    R.rug((ctx) => {
      rect(ctx, RX0, RY0, RX1 - RX0, RY1 - RY0, 0.011, alpha(C.white, 0.16), { stroke: false });
      for (const [y, d] of [[RY0 - 0.42, 0.3], [RY1 + 0.12, 0.42]]) {
        rect(ctx, RX0, y, RX1 - RX0, d, 0.012, alpha(C.white, 0.85), { stroke: false });
        if (Q.detail) for (let x = RX0 + 0.5; x < RX1; x += 1.7) disc(ctx, x + hash(x, 3), y + d / 2, 0.013, 0.22 + hash(x, 4) * 0.12, alpha(C.white, 0.9), { stroke: false });
      }
    }, { fade: (t) => settle(t), step: (t) => Math.round(settle(t) * 12) });
    stepped(() => nightGround(R, LANDS));
    R.rug((ctx) => {
      face(ctx, [[SHORE, SEAWALL, 0], [W, SEAWALL, 0], [W, SEAWALL, WL - 0.05], [SHORE, SEAWALL, WL - 0.05]], alpha(C.night, 0.42), { stroke: false });
      face(ctx, [[W, FRONT, 0], [W, SEAWALL, 0], [W, SEAWALL, WL - 0.05], [W, FRONT, WL - 0.05]], alpha(C.night, 0.42), { stroke: false });
    }, { fade: (t) => nightK(t), step: (t) => Math.round(nightK(t) * 12) });
    R.rug(lampsLit, { on: litUp });

    // ----- The planes -----
    const plane = (t) => { const p = traffic(t); return p ? { ...p, y: CENTER, along: 'x' } : null; };
    // Their shadows, drawn by each chunk they fall on.
    for (const x0 of CHUNKS) {
      const span = (p) => { const back = p.z * 0.6; return p.dir > 0 ? [p.x - 13.5 - back, p.x + 0.5] : [p.x - 0.5 - back, p.x + 13.5]; };
      const it = R.rug((ctx, t) => { const p = traffic(t); if (p) planeShadow(ctx, p.x, CENTER, 0, 'x', { dir: p.dir, air: p.z }); },
        { anim: true, on: (t) => { const p = traffic(t); if (!p) return false; const [a, b] = span(p); return a < chunkEnd(x0) + 2 && b > x0 - 2; } });
      it.area = [x0 - 1.5, FRONT, chunkEnd(x0) + 1.5, D];
    }
    flyer(R, plane);

    // ----- The pier, out over the water -----
    printed(R, PLAT[1], PLAT[2] + 0.05, (ctx, ink, night) => pierPiece(ctx, ink, night, PLAT[0], PLAT[1], true), { depth: PLAT[0] + PLAT[2] });
    const EDGES = [PLAT[1], 6, 8, 10, 12, 14, SHORE];
    for (let j = 1; j < EDGES.length; j++) {
      const x0 = EDGES[j - 1], x1 = EDGES[j];
      printed(R, x1, PIER[0], (ctx, ink, night) => pierPiece(ctx, ink, night, x0, x1, false), { depth: x0 + PIER[0] + 0.5 });
    }
    // Its near railings, in front of whoever's on it.
    printed(R, PLAT[1], PLAT[3], (ctx, ink) => rail(ctx, PLAT[0], PLAT[1], PLAT[3] - 0.04, ink), { depth: SPOT[0] + SPOT[1] + 0.2 });
    for (let x0 = PLAT[1]; x0 < SHORE - 0.01; x0 += 4) printed(R, Math.min(SHORE, x0 + 4), PIER[1], (ctx, ink) => rail(ctx, x0, Math.min(SHORE, x0 + 4), PIER[1] - 0.04, ink));
    // The planes' lights on it after dark, and the rabbit: a flash running
    // down the bars toward the runway, twice a second.
    const rabbit = R.air((ctx, t) => {
      for (const xb of BARS) glow(ctx, xb, CENTER, 1.25, xb < 2 ? 2.2 : 1.5, LIT, 0.55);
      const j = Math.floor(frac(t * 2) * BARS.length);
      glow(ctx, BARS[j], CENTER, 1.3, 1.8, C.white, 1);
      const [X, Y] = P(BARS[j], CENTER, 1.28);
      ctx.beginPath(); ctx.arc(X, Y, 0.12, 0, TAU); ctx.fillStyle = C.white; ctx.fill();
    }, { on: litUp });
    rabbit.area = [0, FRONT, 15.9, D];
    // The plane spotter on his stepladder at the end.
    R.thing(SPOT[0] - 0.01, SPOT[1], ladder, { depth: SPOT[0] + SPOT[1] - 0.05 });
    R.mover(() => ({ x: SPOT[0], y: SPOT[1] }), (ctx, t) => spotter(ctx, t, traffic(t)));
    R.find({ id: 'spotter', label: 'A plane spotter', at: [SPOT[0], SPOT[1], 2.9], r: 0.9 });

    // ----- The seawall's rocks, the seals, the swan -----
    for (let x0 = SHORE; x0 < W; x0 += 8) {
      const set = RIPRAP.filter(([x]) => x >= x0 && x < x0 + 8).sort((a, b) => a[0] + a[1] - b[0] - b[1]);
      printed(R, Math.min(W, x0 + 8) - 0.5, SEAWALL + 0.7, (ctx, ink) => { for (const [x, y, r, top] of set) rock(ctx, x, y, r, top, ink, x); }, { depth: x0 + SEAWALL });
    }
    for (const [i, [x, y, r, top]] of SEALROCKS.entries()) printed(R, x, y, (ctx, ink) => rock(ctx, x, y, r, top, ink, i + 7), { depth: 79 + i * 0.1 });
    R.thing(23.05, 58.45, (ctx, t) => {
      seal(ctx, 22.9, 58.35, 0.17, t, { color: mix(C.grey, C.navy, 0.35), dir: 'r', s: 1.35, phase: 0 });
      seal(ctx, 24.45, 58.5, 0.07, t, { color: tint(C.grey, 0.35), dir: 'l', s: 0.8, phase: 2.2 });
    }, { anim: true });
    R.find({ id: 'seal', label: 'A seal', at: [23, SEAWALL + 1.2, 0.5], r: 0.85 });
    R.thing(SWAN[0], SWAN[1], (ctx, t) => swan(ctx, t), { anim: true });
    R.decoy({ id: 'swan', at: (t) => [SWAN[0] + Math.sin(t * 0.11) * 0.35, SWAN[1], 0.1], r: 0.8, say: 'A swan. In November. Lost.' });
    // The sign by the seal rocks.
    printed(R, 26.6, SEAWALL - 0.12, (ctx, ink) => {
      for (const dx of [-0.45, 0.45]) box(ctx, 26.6 + dx - 0.04, SEAWALL - 0.16, 0, 0.08, 0.08, 0.5, ink(C.grey), { flat: true, stroke: false });
      sign(ctx, 'x', 26.6, SEAWALL - 0.12, 0.78, 1.25, 0.56, null, { board: ink(C.white) });
      lettering(ctx, 'x', 26.6, SEAWALL - 0.11, 0.88, 'NO SWIMMING', 0.18, ink(C.red), 'Bagel Fat One');
      lettering(ctx, 'x', 26.6, SEAWALL - 0.11, 0.66, 'SEALS, THIS MEANS YOU', 0.09, ink(C.ink));
    });

    // ----- The fisherman, off the end of the runway -----
    R.mover((t) => { const p = boatAt(wrap(t)); return p ? { x: p.x, y: BOAT.y, p } : { x: BOAT.x, y: BOAT.y, gone: true }; },
      (ctx, t, q) => { if (q.gone) return; ctx.save(); ctx.globalAlpha *= q.p.a; dinghy(ctx, t, wrap(t), q.p); ctx.restore(); });

    // ----- Uncle Ray -----
    R.thing(RAY[0], RAY[1], (ctx, t) => rayArt(ctx, t, R.found('curb:family')), { anim: true });
    R.find({ id: 'ray', label: 'Uncle Ray', kind: 'hard', at: [RAY[0], RAY[1], 0.25], r: 0.7, riddle: 'Fell off a cart. Very calm about it.', hint: 'A box near the seawall has a name on it.' });

    // ----- Bird control -----
    const cannon = R.poke({ id: 'cannon', at: [CANNON[0], CANNON[1] + 0.2, 0.7], r: 0.9, say: 'BANG. Every gull gone. Nearly.', sound: 'thump', hold: SCARE });
    cannonPoke = cannon;
    printed(R, CANNON[0], CANNON[1] + 0.3, (ctx, ink) => cannonArt(ctx, ink));
    R.thing(CANNON[0] + 0.01, CANNON[1] + 0.35, (ctx, t) => bangArt(ctx, t), { anim: true, on: (t) => sinceBang(t) < 2.6 });
    R.mover(() => ({ x: 61.6, y: 48.55 }), (ctx, t) => { if (hour(t) >= 6 && hour(t) < 17.4) officer(ctx, t); });

    // ----- The windsock -----
    const sock = R.poke({ id: 'windsock', at: (t) => (foldK(t) > 0.5 ? [SOCK[0] - 3.4, SOCK[1], 0.4] : [65, 49.2, 3]), r: 0.9, say: 'Wind: yes.', teach: true, sound: 'shush', hold: 1.4 });
    printed(R, SOCK[0], SOCK[1], (ctx, ink) => mastArt(ctx, ink), { on: (t) => foldK(t) <= 0 });
    printed(R, SOCK[0], SOCK[1], (ctx, ink) => mastBase(ctx, ink), { on: (t) => foldK(t) > 0 });
    R.thing(SOCK[0] + 0.02, SOCK[1], (ctx, t) => sockArt(ctx, t, sock), { anim: true, depth: SOCK[0] + SOCK[1] + 0.05 });

    // ----- The fire truck, the crew, the dalmatian -----
    const at = (t) => truckAt(wrap(t));
    const home = (t) => at(t).home;
    const truck = R.poke({ id: 'fire-truck', at: (t) => { const o = at(t); return [78.7 + o.dx, 50.45 + o.dy, 1.15]; }, r: 0.9, say: 'Drill in five. Or ten.', sound: 'horn' });
    printed(R, 80.5, 49.5, truckArt, { on: home });
    R.thing(80.5, 49.5, truckSnow, { fade: (t) => settle(t), on: home, depth: 80.5 + 49.5 + 0.03 });
    R.thing(80.05, 50.4, (ctx, t) => truckDoor(ctx, t, truck.k()), { anim: true, on: home, depth: 80.5 + 49.5 + 0.06 });
    // Out and back for Flight 1's hour, drawn as it goes.
    R.mover((t) => { const o = at(t); return { x: TRUCK.x1 + o.dx, y: TRUCK.y1 + o.dy, ahead: 80.5 + 49.5 - TRUCK.x1 - TRUCK.y1, o }; }, (ctx, t, p) => {
      const o = p.o;
      if (o.home) return;
      const night = nightPrint(t);
      ctx.save(); ctx.translate(o.dx - o.dy, (o.dx + o.dy) / 2);
      truckArt(ctx, night ? dusk : same, night);
      if (settle(t) > 0.01) { ctx.save(); ctx.globalAlpha *= settle(t); truckSnow(ctx); ctx.restore(); }
      truckDoor(ctx, t, truck.k());
      if (o.moving) {
        // Its beacon going, and backing home, beeping.
        const on = Math.sin(t * 12) > 0;
        glow(ctx, TRUCK.x0 + 0.3, 49.5, TRUCK.roofCab + 0.12, 1.1, on ? C.red : C.white, 0.85);
        if (o.reversing && Q.detail && frac(t * 1.6) < 0.5) label(ctx, TRUCK.x1 + 0.3, 49.5, 2.5, 'BEEP', 0.42, C.white);
      }
      ctx.restore();
    });
    R.find({ id: 'dalmatian', label: 'A dalmatian', kind: 'poke', inside: truck, at: (t) => { const o = at(t); return [78.75 + o.dx, 50.25 + o.dy, 1.0]; }, r: 0.7, hint: 'The fire truck\'s cab has a spotty passenger.' });
    printed(R, CHAIR[0], CHAIR[1], (ctx, ink) => campChair(ctx, ink), { on: crewDay });
    R.thing(CHAIR[0] + 0.01, CHAIR[1], (ctx) => person(ctx, CHAIR[0] + 0.05, CHAIR[1], -0.22, {
      ...look(93, 'crew', { hat: 'cap', style: 'short' }), pose: 'sit', dir: 'l', arms: [1.25, 1.15],
      hold: (g) => { g.beginPath(); g.rect(-0.1, -0.5, 0.62, 0.5); paint(g, C.white, { lw: 0.02 }); if (Q.detail) { g.beginPath(); for (let k = 0; k < 4; k++) { g.moveTo(-0.02, -0.4 + k * 0.1); g.lineTo(0.42, -0.4 + k * 0.1); } g.strokeStyle = C.grey; g.lineWidth = 0.02; g.stroke(); } },
    }, 0), { on: crewDay, depth: CHAIR[0] + CHAIR[1] + 0.05 });
    R.mover(() => ({ x: 80.9, y: 50.85 }), (ctx, t) => { if (crewDay(t)) polisher(ctx, t); });

    // ----- The bulb changer -----
    R.mover((t) => { const p = bulbAt(wrap(t)); return p ? { ...p } : { x: 80, y: RY1 + 0.75, gone: true }; }, (ctx, t, p) => { if (!p.gone) bulbChanger(ctx, t, p); });

    // ----- The plows and their queue -----
    [0, 1, 2, 3, 4].forEach((i) => {
      R.mover((t) => {
        const p = plowAt(i, wrap(t));
        // Owned by the chunk its front corner's in, so the one in front
        // doesn't paint its ground over it.
        const fx = p.x + 1.1;
        return { ...p, x: fx, ahead: p.x - fx, rx: p.x };
      }, (ctx, t, p) => {
        const s = wrap(t), night = nightPrint(t), parked = p.parked;
        const working = !parked;
        // By day they wait (the one in front with his arm out for the snow,
        // waving once it comes); after the night's work they sleep.
        const doing = !parked ? 'drive' : s < T0 ? (i === 0 && snowK(t) > 0 ? 'cheer' : DOING[i]) : 'sleep';
        plow(ctx, p.rx, p.y, p.dir, {
          ink: night ? dusk : null,
          driver: DRIVERS[i],
          doing,
          beacon: working || (parked && snowK(t) > 0 && s < T0),
          lights: working && lightsOn(t),
          snow: parked && settle(t) > 0.35,
          plate: PLATES[i],
        }, t);
        if (working && p.moving && settle(t) > 0.15 && Math.abs(p.v) > 0.6) spray(ctx, p.rx, p.y, p.dir, t, i, i === 4);
      });
    });

    // ----- The gulls -----
    GULLS.forEach((g, i) => {
      R.mover((t) => { const p = gullAt(g, t); return { ...p, ahead: p.z * 1.2 }; }, (ctx, t, p) => {
        if (p.gone) return;
        const peck = !p.fly && Math.sin(t * 0.9 + g.phase * 3) > 0.82;
        gull(ctx, p.x, p.y, p.z, t, { dir: p.dir, fly: p.fly, phase: g.phase, peck });
      });
      void i;
    });

    // ----- The goose -----
    R.goose(goosePos, { kind: 'hard', hint: 'Cleared for takeoff, it thinks.' });

    // ----- The ending: the geese cross in front of Flight 1 -----
    crossing(R);
  },
};
