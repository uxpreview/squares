// The North Point: the island's tip at the mouth of the Merrimack
// (docs/levels/plum.md). Newburyport Harbor Light on the river side and the
// playground across the road from it, the Point's lot (always full), the
// Basin behind, the lifeguard stands (the only lifeguards on the island) with
// their chalkboard of today's tides, lobster boats and the whale watch boat
// through the river mouth, and the jetty out into the Atlantic.
//
// The running gag, the jetty at dawn: two fishermen cast off the jetty and
// one off the Point on the falling tide. As the water drops, seals haul out
// on the rocks one at a time, and each time one takes a rock the fishermen
// shuffle out one more. One gives up and climbs back to the beach (the seals
// bark at him); a seal hops out after the other, until the last fisherman is
// on the last rock with a seal. At eight he catches a striper, at last, and
// carries it home at nine past three seals. The one in sunglasses stays all
// day, and all night.
//
// World units, like land.js (the area sits at the map's corner).
import { C, Q, P, box, face, poly, paint, disc, person, folk, speech, paintText, glow, rng, mix, tint, shade, alpha } from '../../../engine/art.js';
import { ZK } from '../../../engine/iso.js';
import { schedule } from '../../../engine/actors.js';
import { drawLand, wade } from '../../../engine/terrain.js';
import { land, float, h, BASIN, BAR, LOTS } from '../land.js';
import { LOOP, level, hour, lowTide, nightK, sunsetWatch } from '../tide.js';
import { EVENING, INK, LAND, LIT, BRAND, CARS, lightsOn } from '../style.js';
import { who, boat, car, house, umbrella, board, footing, nightGlow, gull, lettering } from '../kit.js';

// ---------- The clock ----------
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const wrap = (t) => (((t % LOOP) + LOOP) % LOOP);
// Shown from hour a to hour b (b < a runs past midnight).
const during = (a, b) => (t) => { const hr = hour(t); return a <= b ? hr >= a && hr < b : hr >= a || hr < b; };
// 0 to 1 across loop seconds a to b.
const span = (t, a, b) => clamp((wrap(t) - a) / (b - a));
const inside = (t, a, b) => { const s = wrap(t); return s >= a && s < b; };
const talk = (ctx, x, y, z, text) => { if (Q.detail && Q.pxPerUnit >= 12) speech(ctx, x, y, z, text, { size: 0.42 }); };

const guards = during(9, 17.5); // the stands are open
const kids = during(9, 19.5); // the playground's busy
const offDuty = (t) => !guards(t);

// ---------- Where things are ----------
// The jetty: big rocks in a line out from the island's north-east corner,
// lower as it goes (the far ones go under at the king tide).
const ROCKS = Array.from({ length: 11 }, (_, i) => ({ x: 104.6 + i * 0.2, y: 41.4 + i * 1.4, top: 1.7 - i * 0.12 }));
const RK = (i, dx = 0, dy = 0) => [ROCKS[i].x + dx, ROCKS[i].y + dy, ROCKS[i].top];
// On the jetty, people stand on the rocks' tops; everywhere else, on the ground.
const onJetty = (x, y) => y > 40.9 && Math.abs(x - (104.6 + (y - 41.4) / 7)) < 1;
const feet = (p) => (onJetty(p.x, p.y) ? p.z : h(p.x, p.y));
const LIGHT = [101.8, 28.6];
const OCEAN_STAND = [103.2, 42.4], RIVER_STAND = [100.8, 24.6]; // (the river one nudged clear of the lighthouse)
const BOARD_AT = [101.8, 41.6];
const SWING = { x0: 103.1, x1: 105.5, y: 35.4 };
const DOOR = [98.2, 29.9]; // the fishermen's rental
const LANE = 110.9; // the channel, out past the Point

// Where the Atlantic meets the Point's beach at x, for a water level L.
function shoreY(x, L) {
  let a = 41, b = 56;
  for (let i = 0; i < 10; i++) { const m = (a + b) / 2; if (h(x, m) > L) a = m; else b = m; }
  return (a + b) / 2;
}

// ---------- Drawing helpers ----------
// Lettering on an upright plane (kit's lettering()).
const write = lettering;
// A board with lines of lettering: lines [text, size, ink?].
function notice(ctx, along, x, y, z, w, hgt, lines, o = {}) {
  board(ctx, along, x, y, z, w, hgt, null, o);
  if (!Q.detail) return;
  const step = (hgt * 0.84) / lines.length;
  lines.forEach(([text, size, ink], i) => write(ctx, along, x, y, z + hgt * 0.42 - step * (i + 0.5), text, size, ink || o.ink || C.ink, o.font));
}
const post = (ctx, x, y, z, hgt, color = C.wood, wd = 0.1) => box(ctx, x - wd / 2, y - wd / 2, z, wd, wd, hgt, color, { flat: true, lw: 0.03 });
// A thick line between two world points: a strut, a leg, a rail.
function strut(ctx, a, b, w, color) {
  const [X0, Y0] = P(...a), [X1, Y1] = P(...b);
  ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1);
  ctx.lineCap = 'round';
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = w + 0.06; ctx.stroke(); }
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
}
function line(ctx, pts, color, w) {
  ctx.beginPath();
  pts.forEach((p, i) => { const [X, Y] = P(...p); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.stroke();
}
// Someone at (x, y, z): who() from the kit (it wades them), with extras
// (arms, hold) riding along in the look.
const man = (ctx, x, y, z, look, p, t) => who(ctx, x, y, z, look, null, p, t);
// Everyone faces the marsh at sunset.
const turn = (t, p) => (sunsetWatch(t) ? { ...p, pose: p.pose === 'sit' ? 'sit' : 'stand', dir: 'r', back: true } : p);
// Only what's above the plane at z (a kayaker in their cockpit).
function above(ctx, x, y, z, draw) {
  const [X, Y] = P(x, y, z);
  ctx.save(); ctx.beginPath(); ctx.rect(X - 40, Y - 80, 80, 80); ctx.clip();
  draw(ctx);
  ctx.restore();
}

// ---------- The jetty's granite ----------
// Big blocks tumbled in a line: each rock a main block and a smaller one
// fallen against it, their corners knocked about and their tops tilted, so
// it reads as quarried stone, not cubes. Below an ordinary high tide they're
// dark with weed; only what's above the water is drawn.
const GRANITE = mix(INK.shingle, C.paperDeep, 0.3);
const WEED = mix(shade(GRANITE, 0.4), C.green, 0.22);
// A block: its top's corners (knocked about, tilted), and sides that splay
// out as they go down, so a rock out at low water stands on a wide foot and
// the jetty reads as one tumbled mound. Corners go round from the back:
// 0 (-x -y), 1 (+x -y), 2 (+x +y), 3 (-x +y).
const SPLAY = 0.28, CORNER = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
function stone(cx, cy, w, d, top, rand, flatRight = false) {
  const j = (a) => (rand() - 0.5) * a;
  const tops = CORNER.map(([sx, sy]) => [cx + sx * (w / 2) * 0.84 + j(0.3), cy + sy * (d / 2) * 0.84 + j(0.3)]);
  if (flatRight) { tops[1][0] = cx + (w / 2) * 0.84; tops[2][0] = cx + (w / 2) * 0.84; }
  const tz = tops.map(() => top + j(0.4));
  return { tops, tz, zb: h(cx, cy) - 0.3 };
}
// A corner of a block at height z, down its splayed side.
function sideAt(s, i, z) {
  const d = Math.max(0, s.tz[i] - z) * SPLAY;
  return [s.tops[i][0] + CORNER[i][0] * d, s.tops[i][1] + CORNER[i][1] * d, Math.min(z, s.tz[i])];
}
const STONES = ROCKS.map((r, i) => {
  const rand = rng(40 + i * 7);
  const main = { ...stone(r.x + (i === 9 ? 0 : (rand() - 0.5) * 0.1), r.y, 1.36, 1.3, r.top, rand, i === 9), main: true };
  // The fallen one: behind on the left for the even rocks, in front for the odd.
  const back = i % 2 === 0;
  const extra = stone(r.x + (back ? -0.78 : 0.02), r.y + (back ? 0.15 : 0.82), 0.86, 0.74, r.top - 0.3 - rand() * 0.2, rand);
  return back ? [extra, main] : [main, extra];
});
// The lure hangs on the right face of the fourth rock from the end, half a
// unit under an ordinary tide (so it's out only at low water). (It was on
// the second-to-last, but framed on a laptop that sat under the area's name.)
const LURE_ROCK = 7;
const LURE = (() => { const m = STONES[LURE_ROCK].find((st) => st.main); const a = sideAt(m, 1, -0.5), b = sideAt(m, 2, -0.5); return [(a[0] + b[0]) / 2 + 0.03, ROCKS[LURE_ROCK].y, -0.5]; })();
// A block from z0 up to z1 (Infinity: to its top). The tide never gets above
// CUT, so what's over it is a still picture and only the band under it,
// where the water moves, is drawn every frame.
const CUT = 0.85;
const splits = (s) => Math.min(...s.tz) > CUT + 0.05;
function drawStone(ctx, s, z0, z1 = Infinity, cutBelow = false) {
  const { tz, zb } = s;
  if (Math.max(...tz) <= z0 + 0.02) return;
  const lo = Math.max(z0, zb);
  const side = (i, z) => sideAt(s, i, z);
  const up = (i) => side(i, Math.max(Math.min(z1, tz[i]), lo));
  const R1 = [side(1, lo), side(2, lo), up(2), up(1)], L1 = [side(2, lo), side(3, lo), up(3), up(2)];
  const still = z1 === Infinity && z0 >= CUT;
  face(ctx, R1, shade(GRANITE, 0.1), { stroke: false });
  face(ctx, L1, shade(GRANITE, 0.26), { stroke: false, dots: z1 === Infinity && Q.detail ? shade(GRANITE, 0.6) : null, density: 0.2 });
  const wl = Math.min(0.35, Math.min(...tz) - 0.06, z1);
  if (wl > lo + 0.03) {
    face(ctx, [side(1, lo), side(2, lo), side(2, wl), side(1, wl)], WEED, { stroke: false });
    face(ctx, [side(2, lo), side(3, lo), side(3, wl), side(2, wl)], shade(WEED, 0.15), { stroke: false });
  }
  // The outline: the three upright edges, the foot along the water (unless
  // it's the still part's cut), and the top's edge (unless it's the band's).
  ctx.beginPath();
  const seg = (a, b) => { const [X0, Y0] = P(...a), [X1, Y1] = P(...b); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1); };
  for (const i of [1, 2, 3]) seg(side(i, lo), up(i));
  if (cutBelow) { /* a cut, not the water: no line */ } else { seg(side(1, lo), side(2, lo)); seg(side(2, lo), side(3, lo)); }
  if (z1 === Infinity) { seg(up(1), up(2)); seg(up(2), up(3)); }
  paint(ctx, null, { lw: 0.045 });
  if (z1 === Infinity) face(ctx, [up(0), up(1), up(2), up(3)], tint(GRANITE, 0.18), { lw: 0.045, dots: still && Q.detail ? C.white : null, density: 0.07 });
  // Foam where the water laps it.
  if (!cutBelow && z0 > zb && Q.lines) line(ctx, [side(1, lo), side(2, lo), side(3, lo)], alpha(C.white, 0.9), 0.07);
}

// ---------- Seals ----------
// A seal lying on a rock in the banana pose (head and tail up), in (x, y, z).
// o: { dir, scale, glasses, bark, head }
function seal(ctx, x, y, z, t, o = {}) {
  const [X, Y] = P(x, y, z);
  const f = o.dir === 'l' ? -1 : 1, s = o.scale || 1, ph = t * 1.3 + (o.phase || 0);
  const body = mix(C.grey, C.ink, 0.28), belly = tint(C.grey, 0.25);
  const tail = 0.12 + 0.05 * Math.sin(ph * 2), lift = o.head ?? (0.34 + 0.05 * Math.sin(ph));
  ctx.save(); ctx.translate(X, Y); ctx.scale(f * s, s);
  if (Q.detail) { ctx.beginPath(); ctx.ellipse(0, 0.02, 0.62, 0.15, 0, 0, Math.PI * 2); ctx.fillStyle = alpha(C.ink, 0.2); ctx.fill(); }
  // Tail flippers, up.
  ctx.beginPath(); ctx.moveTo(-0.58, -0.08 - tail); ctx.lineTo(-0.84, -0.24 - tail * 1.4); ctx.lineTo(-0.78, -0.02 - tail); ctx.closePath();
  paint(ctx, shade(body, 0.1), { lw: 0.04 });
  // The body.
  ctx.beginPath();
  ctx.moveTo(-0.64, -0.06 - tail);
  ctx.quadraticCurveTo(-0.3, 0.07, 0.26, 0.02);
  ctx.quadraticCurveTo(0.52, -0.02, 0.5, -lift);
  ctx.quadraticCurveTo(0.3, -0.36, -0.1, -0.3);
  ctx.quadraticCurveTo(-0.46, -0.26, -0.64, -0.06 - tail);
  paint(ctx, body, { dots: Q.detail ? shade(body, 0.55) : null, density: 0.22, lw: 0.05 });
  if (Q.detail) {
    ctx.beginPath(); ctx.ellipse(0.12, -0.02, 0.3, 0.05, -0.05, 0, Math.PI * 2); ctx.fillStyle = alpha(belly, 0.7); ctx.fill();
    // The front flipper, now and then a wave.
    const fl = Math.sin(ph * 0.7) > 0.85 ? -0.5 : 0.25;
    ctx.save(); ctx.translate(0.22, -0.06); ctx.rotate(fl);
    ctx.beginPath(); ctx.ellipse(0, 0.1, 0.06, 0.13, 0, 0, Math.PI * 2); paint(ctx, shade(body, 0.1), { lw: 0.035 });
    ctx.restore();
  }
  // The head.
  const hx = 0.48, hy = -lift - 0.1;
  ctx.beginPath(); ctx.arc(hx, hy, 0.17, 0, Math.PI * 2); paint(ctx, body, { lw: 0.05 });
  ctx.beginPath(); ctx.ellipse(hx + 0.14, hy + 0.05, 0.1, 0.075, 0, 0, Math.PI * 2); paint(ctx, belly, { lw: 0.035 });
  ctx.fillStyle = C.ink;
  ctx.beginPath(); ctx.arc(hx + 0.23, hy + 0.02, 0.035, 0, Math.PI * 2); ctx.fill();
  if (o.glasses) {
    ctx.beginPath(); ctx.roundRect(hx - 0.11, hy - 0.11, 0.3, 0.12, 0.04); paint(ctx, C.ink, { lw: 0.045, stroke: C.coral });
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.beginPath(); ctx.moveTo(hx - 0.1, hy - 0.06); ctx.lineTo(hx - 0.17, hy - 0.03); ctx.stroke();
    if (Q.detail) { ctx.strokeStyle = alpha(C.white, 0.85); ctx.lineWidth = 0.025; ctx.beginPath(); ctx.moveTo(hx + 0.08, hy - 0.08); ctx.lineTo(hx + 0.12, hy - 0.04); ctx.stroke(); }
  } else {
    ctx.beginPath(); ctx.arc(hx + 0.05, hy - 0.04, 0.03, 0, Math.PI * 2); ctx.fill();
  }
  if (Q.detail) {
    ctx.strokeStyle = alpha(C.ink, 0.6); ctx.lineWidth = 0.015; ctx.beginPath();
    for (const k of [-0.03, 0.03]) { ctx.moveTo(hx + 0.2, hy + 0.06 + k); ctx.lineTo(hx + 0.36, hy + 0.04 + k * 2); }
    ctx.stroke();
  }
  ctx.restore();
  if (o.bark) talk(ctx, x, y, z + 1.3, o.bark);
}
// Just a head in the water, coming in (or going).
function sealHead(ctx, x, y, L, t, dir) {
  const [X, Y] = P(x, y, L + 0.05 * Math.sin(t * 3));
  const f = dir === 'l' ? -1 : 1, body = mix(C.grey, C.ink, 0.28);
  ctx.save(); ctx.translate(X, Y); ctx.scale(f, 1);
  ctx.beginPath(); ctx.arc(0, -0.14, 0.16, 0, Math.PI * 2); paint(ctx, body, { lw: 0.045 });
  ctx.beginPath(); ctx.ellipse(0.13, -0.1, 0.09, 0.07, 0, 0, Math.PI * 2); paint(ctx, tint(C.grey, 0.25), { lw: 0.03 });
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0.04, -0.2, 0.03, 0, Math.PI * 2); ctx.fill();
  if (Q.lines) { ctx.beginPath(); ctx.ellipse(-0.05, 0, 0.42, 0.14, 0, 0, Math.PI * 2); ctx.strokeStyle = alpha(C.white, 0.9); ctx.lineWidth = 0.05; ctx.stroke(); }
  ctx.restore();
}

// Each seal's day: where it is and what it's doing, from the clock.
// Hauling out and hopping along go up the rock's side; swims come from and
// go to the channel side (+x).
function sealDay(plan) {
  return (t) => {
    const s = wrap(t);
    for (const [a, b, kind, from, to] of plan) {
      if (s < a || s >= b) continue;
      const k = (s - a) / (b - a);
      if (kind === 'bask') return { x: from[0], y: from[1], z: from[2], mode: 'bask' };
      const x = lerp(from[0], to[0], k), y = lerp(from[1], to[1], k);
      if (kind === 'swim') return { x, y, mode: 'swim', dir: to[0] > from[0] ? 'r' : 'l' };
      if (kind === 'haul') return { x, y, zf: [from[2], to[2]], k, mode: 'haul' };
      // A hop along the rocks: little bounces.
      return { x, y, z: lerp(from[2], to[2], k) + 0.25 * Math.abs(Math.sin(k * Math.PI * 3)), mode: 'bask' };
    }
    return { x: ROCKS[5].x, y: ROCKS[5].y, mode: 'away' };
  };
}
const WATER = 'water'; // a haul's water end: its z is the level at the time
const S1_SPOT = RK(10, -0.3, -0.35);
const SEALS = [
  // The one in sunglasses: on the middle rock, all day and all night.
  { plan: [[0, LOOP, 'bask', RK(4, 0, -0.05)]], glasses: true, scale: 1.05, dir: 'l' },
  // The second: up on the fishermen's rock at 5:40am, then along the jetty
  // to the last rock with the last fisherman; off again at 10:30pm.
  { plan: [
    [6, 10, 'swim', RK(7, 3.6, 0.6), RK(7, 1.05, 0.2)],
    [10, 11.5, 'haul', [...RK(7, 1.05, 0.2).slice(0, 2), WATER], RK(7, 0.05, 0)],
    [11.5, 31, 'bask', RK(7, 0.05, 0)],
    [31, 35, 'hop', RK(7, 0.05, 0), RK(9, -0.35, -0.2)],
    [35, 37, 'hop', RK(9, -0.35, -0.2), S1_SPOT],
    [37, 232, 'bask', S1_SPOT],
    [232, 234, 'haul', S1_SPOT, [...RK(10, 1.1, 0.1).slice(0, 2), WATER]],
    [234, 242, 'swim', RK(10, 1.1, 0.1), RK(10, 4.5, 1)],
  ], scale: 1.1, dir: 'r' },
  // The third: onto the next rock at 6:20am; off at 10:45pm.
  { plan: [
    [16, 20, 'swim', RK(8, 3.4, -0.4), RK(8, 1.05, 0.1)],
    [20, 21.5, 'haul', [...RK(8, 1.05, 0.1).slice(0, 2), WATER], RK(8, 0, -0.05)],
    [21.5, 238, 'bask', RK(8, 0, -0.05)],
    [238, 240, 'haul', RK(8, 0, -0.05), [...RK(8, 1.1, 0.2).slice(0, 2), WATER]],
    [240, 248, 'swim', RK(8, 1.1, 0.2), RK(8, 4.2, -0.6)],
  ], scale: 1.15, dir: 'l' },
].map((s) => ({ ...s, at: sealDay(s.plan) }));

// ---------- Fishing ----------
// A striped bass, hanging by its mouth, and wriggling (in someone's units).
function striper(g, x, y, t) {
  g.save(); g.translate(x, y); g.rotate(Math.sin(t * 9) * 0.25);
  g.strokeStyle = alpha(C.ink, 0.7); g.lineWidth = 0.02; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 0.15); g.stroke();
  const skin = mix(C.grey, C.tealLight, 0.25);
  g.beginPath(); g.ellipse(0, 0.48, 0.12, 0.33, 0, 0, Math.PI * 2); paint(g, skin, { lw: 0.035 });
  g.beginPath(); g.moveTo(0, 0.78); g.lineTo(-0.13, 0.95); g.lineTo(0.13, 0.95); g.closePath(); paint(g, shade(skin, 0.2), { lw: 0.03 });
  if (Q.detail) {
    g.strokeStyle = shade(skin, 0.5); g.lineWidth = 0.022; g.beginPath();
    for (const u of [-0.06, 0, 0.06]) { g.moveTo(u, 0.28); g.lineTo(u, 0.7); }
    g.stroke();
    g.fillStyle = C.ink; g.beginPath(); g.arc(0.04, 0.22, 0.025, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}
// A rod in someone's hands (drawn in their own units, facing right: the
// origin is at their chest) and, when they're fishing, the line out to a
// spot in the water. mode: fish, reel, catch or carry (over the shoulder).
function rod(x, y, z, dir, t, mode, cast, fish = false) {
  const [X, Y] = P(x, y, z), f = dir === 'l' ? -1 : 1;
  return (g) => {
    let butt = [0.1, 0.5], tip = [1.5, -1.3];
    if (mode === 'carry') { butt = [0.35, 0.35]; tip = [-0.75, -1.85]; }
    else if (mode === 'catch') { butt = [0.2, 0.35]; tip = [0.7, -2.25]; }
    else if (mode === 'reel') tip = [1.45, -0.8 + Math.sin(t * 9) * 0.08];
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(...butt);
    if (mode === 'reel') g.quadraticCurveTo(1.05, -1.1, ...tip); else g.lineTo(...tip);
    g.strokeStyle = C.ink; g.lineWidth = 0.06; g.stroke();
    if (Q.detail) { g.beginPath(); g.arc(butt[0] + (tip[0] - butt[0]) * 0.12, butt[1] + (tip[1] - butt[1]) * 0.12, 0.07, 0, Math.PI * 2); paint(g, C.grey, { lw: 0.025 }); }
    if ((mode === 'fish' || mode === 'reel') && cast) {
      const [WX, WY] = P(cast[0], cast[1], level(t));
      const lx = (WX - X) * f - 0.35, ly = WY - Y + 1.23;
      g.beginPath(); g.moveTo(...tip);
      g.quadraticCurveTo((tip[0] + lx) / 2, mode === 'reel' ? (tip[1] + ly) / 2 : Math.max(tip[1], ly) + 0.15, lx, ly);
      g.strokeStyle = alpha(C.ink, 0.55); g.lineWidth = 0.02; g.stroke();
    }
    if (mode === 'catch' || fish) striper(g, tip[0], tip[1], t);
  };
}
const ARMS = { fish: [1.0, 0.75], reel: [1.1, 0.85], catch: [2.5, 2.3], carry: [2.4, 0.3] };
// A fisherman on a schedule: p.fish, p.reel, p.catch say what they're doing.
function fisherman(R, look, steps, castAt, o = {}) {
  const walk = schedule(steps, { loop: LOOP, name: o.name || 'A fisherman', speed: 1.3 });
  R.mover((t) => { const p = walk(t); return { ...p, z: feet(p) }; }, (ctx, t, p) => {
    if (p.hide) return;
    const mode = p.catch ? 'catch' : p.reel ? 'reel' : p.fish ? 'fish' : 'carry';
    const dir = p.moving ? p.dir : 'r', back = p.moving ? p.back : false;
    const cast = castAt(p);
    const fish = o.fish ? o.fish(t) : false;
    man(ctx, p.x, p.y, p.z, { ...look, arms: mode === 'reel' ? [1.1 + Math.sin(t * 12) * 0.2, 0.85] : ARMS[mode], hold: rod(p.x, p.y, p.z, dir, t, mode, cast, fish) }, { pose: p.moving ? 'walk' : 'stand', dir, back }, t);
    if (p.say) talk(ctx, p.x, p.y, p.z + 2.9, p.say);
  }, { bias: 1.6 });
}

// ---------- The lighthouse ----------
// An upright cone cut off at the top: the tower. Shaded on its left.
function frustum(ctx, cx, cy, z, r0, r1, hgt, color) {
  const [X, Yb] = P(cx, cy, z), Yt = Yb - hgt * ZK;
  const a0 = r0 * Math.SQRT2, a1 = r1 * Math.SQRT2;
  const out = () => {
    ctx.beginPath();
    ctx.moveTo(X - a1, Yt); ctx.lineTo(X - a0, Yb);
    ctx.ellipse(X, Yb, a0, a0 / 2, 0, Math.PI, 0, true);
    ctx.lineTo(X + a1, Yt);
    ctx.ellipse(X, Yt, a1, a1 / 2, 0, 0, Math.PI, false);
    ctx.closePath();
  };
  out(); ctx.fillStyle = color; ctx.fill();
  const m = Math.PI * 0.62;
  ctx.beginPath();
  ctx.moveTo(X - a1, Yt); ctx.lineTo(X - a0, Yb);
  ctx.ellipse(X, Yb, a0, a0 / 2, 0, Math.PI, m, true);
  ctx.lineTo(X + a1 * Math.cos(m), Yt + (a1 / 2) * Math.sin(m));
  ctx.ellipse(X, Yt, a1, a1 / 2, 0, m, Math.PI, false);
  ctx.closePath();
  paint(ctx, shade(color, 0.14), { stroke: false, dots: Q.detail ? shade(color, 0.45) : null, density: 0.16 });
  out(); paint(ctx, null, { lw: 0.06 });
  return { X, Yb, Yt, a0, a1 };
}
function lantern(ctx, x, y, z, lit) {
  const [X, Yb] = P(x, y, z);
  const r = 0.46 * Math.SQRT2, hgt = 0.85 * ZK, Yt = Yb - hgt;
  // The glass drum, with its astragals.
  ctx.beginPath();
  ctx.moveTo(X - r, Yt); ctx.lineTo(X - r, Yb); ctx.ellipse(X, Yb, r, r / 2, 0, Math.PI, 0, true); ctx.lineTo(X + r, Yt);
  ctx.ellipse(X, Yt, r, r / 2, 0, 0, Math.PI, false); ctx.closePath();
  paint(ctx, lit ? LIT : mix(C.ink, C.sky, 0.3), { lw: 0.05 });
  if (lit) { ctx.beginPath(); ctx.arc(X, Yb - hgt * 0.5, 0.2, 0, Math.PI * 2); ctx.fillStyle = C.white; ctx.fill(); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.beginPath();
  for (const k of [-0.7, 0, 0.7]) { ctx.moveTo(X + r * k, Yb + (r / 2) * Math.sqrt(1 - k * k)); ctx.lineTo(X + r * k, Yt + (r / 2) * Math.sqrt(1 - k * k)); }
  ctx.stroke();
  // The roof: a black cone, a vent ball and a lightning rod.
  const rr = 0.58 * Math.SQRT2, apex = Yt - 0.62;
  ctx.beginPath(); ctx.moveTo(X - rr, Yt); ctx.lineTo(X, apex); ctx.lineTo(X + rr, Yt); ctx.ellipse(X, Yt, rr, rr / 2, 0, 0, Math.PI, false); ctx.closePath();
  paint(ctx, C.ink, { lw: 0.05 });
  ctx.beginPath(); ctx.arc(X, apex - 0.08, 0.1, 0, Math.PI * 2); paint(ctx, C.ink, { lw: 0.03, stroke: C.ink });
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.beginPath(); ctx.moveTo(X, apex - 0.18); ctx.lineTo(X, apex - 0.55); ctx.stroke();
  // The gallery's front railing, over the drum.
  const gr = 0.84 * Math.SQRT2, rail = Yb + 0.08 - 0.5 * ZK;
  ctx.beginPath(); ctx.ellipse(X, rail, gr, gr / 2, 0, 0, Math.PI, false); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
  ctx.beginPath();
  for (let k = 0; k <= 8; k++) { const a = (k / 8) * Math.PI, px = X + Math.cos(a) * gr, py = Math.sin(a) * gr / 2; ctx.moveTo(px, rail + py); ctx.lineTo(px, Yb + 0.08 + py); }
  ctx.lineWidth = 0.03; ctx.stroke();
}
// A wedge of the lamp's beam, flat across the dark from (x, y, z).
function wedge(ctx, x, y, z, a, len, w, fill) {
  poly(ctx, [[x, y, z], [x + Math.cos(a - w) * len, y + Math.sin(a - w) * len, z], [x + Math.cos(a + w) * len, y + Math.sin(a + w) * len, z]]);
  ctx.fillStyle = fill; ctx.fill();
}

// ---------- Playground, beach and boat bits ----------
function kayak(ctx, x, y, z, a, color, look, t, paddle) {
  const ca = Math.cos(a), sa = Math.sin(a);
  const W = (u, v, zz) => [x + ca * u - sa * v, y + sa * u + ca * v, zz];
  const out = [[-1.05, 0], [-0.6, -0.24], [0.6, -0.24], [1.05, 0], [0.6, 0.24], [-0.6, 0.24]];
  face(ctx, out.map(([u, v]) => W(u, v, z + 0.04)), shade(color, 0.25), { lw: 0.04 });
  face(ctx, out.map(([u, v]) => W(u * 0.97, v * 0.85, z + 0.16)), color, { lw: 0.04 });
  face(ctx, [W(-0.25, -0.12, z + 0.17), W(0.2, -0.12, z + 0.17), W(0.2, 0.12, z + 0.17), W(-0.25, 0.12, z + 0.17)], C.ink, { stroke: false });
  if (!look) return;
  const dX = ca - sa, dY = ca + sa;
  above(ctx, x, y, z + 0.16, (g) => person(g, x, y, z + 0.18 - 0.8 * 0.9, { ...look, pose: 'sit', scale: 0.9, dir: dX >= 0 ? 'r' : 'l', back: dY < 0, arms: [1.2, 1.1] }, t));
  if (paddle) {
    const k = Math.sin(t * 3);
    line(ctx, [W(0.1, -0.95, z + 0.9 + k * 0.3), W(0.1, 0.95, z + 0.9 - k * 0.3)], C.ink, 0.06);
    for (const s of [-1, 1]) { const [X, Y] = P(...W(0.1, s * 0.95, z + 0.9 - s * k * 0.3)); ctx.beginPath(); ctx.ellipse(X, Y, 0.1, 0.06, 0, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.03 }); }
  }
}
// The lobster buoy (the find): a foam bullet in a lobsterman's colors,
// coral over white over teal, a spindle on top, and its rope going down.
function lobsterBuoy(ctx, x, y, z, t) {
  const [X, Y] = P(x, y, z);
  ctx.save(); ctx.translate(X, Y);
  if (Q.detail) {
    ctx.beginPath(); ctx.moveTo(0.05, 0.02); ctx.quadraticCurveTo(0.5, 0.25, 0.9, 0.35);
    ctx.strokeStyle = alpha(C.mustard, 0.6); ctx.lineWidth = 0.05; ctx.stroke();
  }
  if (Q.lines) { ctx.beginPath(); ctx.ellipse(0, 0.02, 0.36, 0.13, 0, 0, Math.PI * 2); ctx.strokeStyle = alpha(C.white, 0.9); ctx.lineWidth = 0.05; ctx.stroke(); }
  ctx.rotate(Math.sin(t * 1.3) * 0.16);
  const band = (y0, y1, color) => { ctx.save(); ctx.beginPath(); ctx.rect(-0.3, y0, 0.6, y1 - y0); ctx.clip(); ctx.beginPath(); ctx.ellipse(0, -0.3, 0.19, 0.34, 0, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); ctx.restore(); };
  band(-0.7, -0.44, C.coral);
  band(-0.44, -0.2, C.white);
  band(-0.2, 0.1, C.teal);
  ctx.beginPath(); ctx.ellipse(0, -0.3, 0.19, 0.34, 0, 0, Math.PI * 2); paint(ctx, null, { lw: 0.045 });
  ctx.fillStyle = alpha(C.ink, 0.18); ctx.beginPath(); ctx.ellipse(-0.08, -0.3, 0.07, 0.3, 0, 0, Math.PI * 2); ctx.fill();
  box(ctx, -0.03, 0, 0.55, 0.06, 0.06, 0.45, C.wood, { flat: true, lw: 0.025 });
  ctx.restore();
}
// A lifeguard stand's umbrella, open over the seat.
function canopy(ctx, x, y, z, r) {
  const tip = z + 0.45, rim = (a) => [x + Math.cos(a) * r, y + Math.sin(a) * r, z];
  const panels = [];
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, b = ((k + 1) / 8) * Math.PI * 2; panels.push({ k, a, b, d: Math.cos((a + b) / 2) + Math.sin((a + b) / 2) }); }
  panels.sort((m, n) => m.d - n.d);
  for (const { k, a, b } of panels) face(ctx, [[x, y, tip], rim(a), rim(b)], k % 2 ? C.white : C.coral, { lw: 0.035 });
}

export default {
  id: 'north-point',
  name: 'The North Point',
  blurb: 'The lighthouse, the island\'s only lifeguards, and a jetty the seals take back one rock at a time.',
  home: [103, 36],
  build(R) {
    drawLand(R, land, { fade: nightK, inks: EVENING, surf: true });
    const courier = R.walkers.find((w) => w.id === 'courier-point');
    const asking = (t) => {
      if (!courier) return false;
      const p = courier.at(t);
      return p.say === 'G. Goose?' && Math.hypot(p.x - 104.2, p.y - 40.2) < 0.6;
    };

    // ---------- The lighthouse ----------
    // Newburyport Harbor Light, 1898: a white tower with a black lantern
    // room, on the river side. After dark its lamp comes on and the beam
    // sweeps the river mouth.
    const [lx, ly] = LIGHT;
    const lz = footing(R, lx - 0.9, ly - 0.9, 1.8, 1.8);
    const GAL = lz + 6.2;
    R.thing(lx + 0.9, ly + 0.9, (ctx) => {
      const tw = frustum(ctx, lx, ly, lz, 0.88, 0.6, 6.2, C.white);
      // Its door and windows, facing us.
      const door = mix(C.navy, C.ink, 0.2);
      ctx.beginPath(); ctx.roundRect(tw.X - 0.28, tw.Yb + tw.a0 / 2 - 0.04 - 1.35 * ZK, 0.56, 1.35 * ZK, [0.28, 0.28, 0, 0]); paint(ctx, door, { lw: 0.05 });
      for (const zz of [2.6, 4.4]) { ctx.beginPath(); ctx.rect(tw.X - 0.11, tw.Yb + 0.6 - zz * ZK, 0.22, 0.4); paint(ctx, mix(C.ink, C.sky, 0.3), { lw: 0.04 }); }
      // The gallery: a black deck on brackets, and its railing's back half.
      const [X, Yg] = P(lx, ly, GAL), gr = 0.84 * Math.SQRT2;
      ctx.beginPath(); ctx.ellipse(X, Yg, gr, gr / 2, 0, 0, Math.PI * 2); paint(ctx, C.ink, { lw: 0.04 });
      ctx.beginPath(); ctx.ellipse(X, Yg + 0.12, gr, gr / 2, 0, 0, Math.PI, false); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.12; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(X, Yg - 0.5 * ZK, gr, gr / 2, 0, Math.PI, Math.PI * 2, false); ctx.lineWidth = 0.04; ctx.stroke();
    });
    // The lantern: dark glass by day, lit at night (two still pictures).
    R.thing(lx + 0.92, ly + 0.92, (ctx) => lantern(ctx, lx, ly, GAL + 0.08, false), { on: (t) => !lightsOn(t) });
    R.thing(lx + 0.92, ly + 0.92, (ctx) => lantern(ctx, lx, ly, GAL + 0.08, true), { on: lightsOn });
    R.light({ at: [lx, ly, GAL + 0.5], r: 2.6, color: LIT, k: nightK });
    // The beam: two soft wedges turning round, only at night.
    R.air((ctx, t) => {
      const k = nightK(t);
      const a = t * 0.8;
      for (const off of [0, Math.PI]) {
        wedge(ctx, lx, ly, GAL + 0.5, a + off, 9, 0.15, alpha(LIT, 0.13 * k));
        wedge(ctx, lx, ly, GAL + 0.5, a + off, 7, 0.05, alpha(LIT, 0.2 * k));
      }
    }, { on: (t) => nightK(t) > 0.05 }).area = [lx - 9, ly - 9, lx + 9, ly + 9];
    // Its plaque, by the door.
    R.thing(lx + 0.95, ly + 0.95, (ctx) => notice(ctx, 'x', lx + 0.2, ly + 0.86, lz + 1.9, 0.62, 0.5, [['HARBOR LIGHT', 0.075, C.white], ['1898', 0.09, C.white], ['HAS SEEN WORSE', 0.066, C.butter]], { board: C.navy, edge: 0.03 }));
    // ---------- The beach house on the back ----------
    // The fishermen's rental, with its quarterboard and their rods by the
    // door, and an outdoor shower that's always in use.
    const hz = footing(R, 97, 27.4, 2.4, 2);
    house(R, 97, 27.4, 2.4, 2, 4, { ridge: 'x' });
    R.thing(99.42, 29.42, (ctx) => {
      notice(ctx, 'x', 98.2, 29.43, hz + 1.95, 1.3, 0.32, [['THE REEL DEAL', 0.18, C.navy]], { board: C.white, font: 'Bagel Fat One' });
      if (Q.detail) for (const [x, lean] of [[99.0, 0.25], [99.15, 0.4], [99.28, 0.3]]) line(ctx, [[x, 29.5, hz], [x - lean, 29.5, hz + 2.3]], C.ink, 0.04);
    });
    // The shower stall, against the house's side.
    const sz = footing(R, 99.5, 27.6, 0.8, 0.8);
    const showerer = folk(397, { top: C.teal, bottom: C.teal, style: 'curly' });
    const stall = (ctx) => {
      box(ctx, 99.5, 27.6, sz + 0.35, 0.8, 0.8, 1.55, C.woodLight, { flat: true, lw: 0.04, top: alpha(C.woodLight, 0) });
      if (Q.detail) { ctx.strokeStyle = shade(C.woodLight, 0.3); ctx.lineWidth = 0.025; ctx.beginPath(); for (let k = 1; k < 4; k++) { const [a, b] = P(99.5 + k * 0.2, 28.4, sz + 0.35), [c, e] = P(99.5 + k * 0.2, 28.4, sz + 1.9); ctx.moveTo(a, b); ctx.lineTo(c, e); } ctx.stroke(); }
      post(ctx, 99.6, 27.7, sz, 2.3, C.grey, 0.06);
      disc(ctx, 99.75, 27.85, sz + 2.3, 0.12, C.grey, { lw: 0.03 });
    };
    R.thing(100.3, 28.4, stall, { on: (t) => !during(11, 18)(t) });
    R.thing(100.3, 28.4, (ctx, t) => {
      man(ctx, 99.9, 28.0, sz, { ...showerer, arms: [2.8 + Math.sin(t * 5) * 0.2, -2.6] }, { pose: 'stand', dir: 'l' }, t);
      stall(ctx);
      if (Q.detail) for (let i = 0; i < 5; i++) { const k = (t * 1.6 + i / 5) % 1; disc(ctx, 99.72 + (i % 3) * 0.1, 27.9 + (i % 2) * 0.1, sz + 2.2 - k * 0.5, 0.03, C.sky, { stroke: false }); }
      if (Math.sin(t * 0.4) > 0.8) talk(ctx, 99.9, 28.0, sz + 2.8, 'Occupied!');
    }, { anim: true, on: during(11, 18) });

    // ---------- The lot ----------
    // Always full. Five spots: two parked cars, the Courier's (in the
    // afternoon), a beach car's, and the one a man's been saving since
    // seven for his cousin, who never comes.
    const [l0, m0, l1, m1] = LOTS.point;
    R.rug((ctx) => {
      if (!Q.detail) return;
      for (const x of [97.7, 98.7, 99.7, 100.7]) line(ctx, [[x, m0 + 0.3, h(x, m0 + 0.3) + 0.02], [x, m0 + 2.5, h(x, m0 + 2.5) + 0.02]], alpha(C.white, 0.8), 0.06);
    });
    const parked = [[101.15, CARS[6], { board: C.butter }]];
    for (const [x, color, o] of parked) R.thing(x + 0.5, 34.6, (ctx) => car(ctx, x, 33.6, h(x, 33.6), color, 'y', null, 0, null, o));
    // The spot saver, in his beach chair, in the empty spot.
    const saver = folk(321, { top: C.white, bottom: C.teal, hat: 'cap', style: 'bald' });
    // (In the space between the Courier's van and the parked car, clear of
    // both: at 99.2 he sat against the van and looked to be on it.)
    const cx0 = 99.85, cy0 = 33.7, chz = h(cx0, cy0);
    const beachChair = (ctx) => {
      box(ctx, cx0 - 0.3, cy0 - 0.25, chz + 0.3, 0.6, 0.5, 0.06, C.coral, { flat: true, lw: 0.03 });
      face(ctx, [[cx0 - 0.3, cy0 - 0.25, chz + 0.35], [cx0 + 0.3, cy0 - 0.25, chz + 0.35], [cx0 + 0.3, cy0 - 0.45, chz + 1.1], [cx0 - 0.3, cy0 - 0.45, chz + 1.1]], C.coral, { lw: 0.035, dots: Q.detail ? C.white : null, density: 0.3 });
      for (const [dx, dy] of [[-0.3, -0.25], [0.3, -0.25], [-0.3, 0.25], [0.3, 0.25]]) strut(ctx, [cx0 + dx, cy0 + dy, chz], [cx0 + dx, cy0 + dy * 0.8, chz + 0.33], 0.03, C.grey);
      // His cardboard sign.
      notice(ctx, 'x', cx0 + 0.55, cy0 + 0.55, chz + 0.55, 0.62, 0.36, [['SAVED', 0.17, C.ink]], { board: C.woodLight });
      post(ctx, cx0 + 0.55, cy0 + 0.5, chz, 0.4, C.wood, 0.05);
    };
    const saverOn = during(7.5, 19.8), saverSunset = during(19.8, 20.9);
    R.thing(cx0 + 0.6, cy0 + 0.6, (ctx) => { beachChair(ctx); man(ctx, cx0, cy0, chz + 0.35 - 0.8, saver, { pose: 'sit', dir: 'l' }, 0); }, { on: saverOn });
    R.thing(cx0 + 0.6, cy0 + 0.6, (ctx) => { beachChair(ctx); man(ctx, cx0, cy0, chz + 0.35 - 0.8, saver, { pose: 'sit', dir: 'r', back: true }, 0); }, { anim: true, on: saverSunset });
    const SAVES = ['It\'s for my cousin.', 'He\'s ten minutes out.', 'Still coming.', 'He said he left.'];
    R.thing(cx0 + 0.62, cy0 + 0.62, (ctx, t) => talk(ctx, cx0, cy0, chz + 2.2, SAVES[Math.floor(t / 14) % SAVES.length]), { anim: true, on: (t) => saverOn(t) && t % 14 < 3.5 });
    // "LOT FULL", on a sawhorse, parked in the first spot since six.
    const sh = h(97.2, 33.6);
    R.thing(97.8, 33.9, (ctx) => {
      for (const dx of [-0.45, 0.45]) { strut(ctx, [97.2 + dx, 33.35, sh], [97.2 + dx, 33.6, sh + 0.9], 0.05, C.white); strut(ctx, [97.2 + dx, 33.85, sh], [97.2 + dx, 33.6, sh + 0.9], 0.05, C.white); }
      notice(ctx, 'x', 97.2, 33.65, sh + 0.8, 1.2, 0.55, [['LOT FULL', 0.2, C.white], ['SINCE 6AM', 0.12, C.white]], { board: C.coral, font: 'Bagel Fat One' });
    });
    // The lot's streetlight, with the parking sign on its post.
    const [sx, sy] = [96.7, 35.8], slz = h(sx, sy);
    const lampHead = (ctx, on) => {
      post(ctx, sx, sy, slz, 4.2, C.grey, 0.12);
      notice(ctx, 'x', sx, sy + 0.08, slz + 2.0, 1.2, 0.62, [['PARKING $25', 0.16, C.white], ['SEALS FREE', 0.15, C.butter]], { board: C.teal });
      strut(ctx, [sx, sy, slz + 4.15], [sx + 0.9, sy - 0.2, slz + 4.25], 0.06, C.grey);
      box(ctx, sx + 0.7, sy - 0.35, slz + 4.05, 0.45, 0.3, 0.16, on ? LIT : C.grey, { flat: true, lw: 0.03 });
    };
    R.thing(sx + 0.1, sy + 0.1, (ctx) => lampHead(ctx, false), { on: (t) => !lightsOn(t) });
    R.thing(sx + 0.1, sy + 0.1, (ctx) => lampHead(ctx, true), { on: lightsOn });
    nightGlow(R, sx + 0.9, sy - 0.2, slz + 3.8, 3);

    // ---------- The playground ----------
    // Across the road from the lighthouse: a swing set (the goose has one
    // swing), a slide, a lobster on a spring, a bench and the rules.
    const swTop = footing(R, SWING.x0, SWING.y - 0.6, SWING.x1 - SWING.x0, 1.2) + 2.5;
    const CHAIN = 1.85;
    const legs = (ctx, dy) => {
      for (const x of [SWING.x0, SWING.x1]) strut(ctx, [x, SWING.y + dy, h(x, SWING.y + dy)], [x, SWING.y, swTop], 0.08, C.teal);
    };
    R.thing(SWING.x1, SWING.y, (ctx) => { legs(ctx, -0.65); strut(ctx, [SWING.x0 - 0.1, SWING.y, swTop], [SWING.x1 + 0.1, SWING.y, swTop], 0.1, C.teal); });
    R.thing(SWING.x1 + 0.2, SWING.y + 0.75, (ctx) => legs(ctx, 0.65));
    const swingAt = (x, amp, rate, ph) => (t) => { const a = amp * Math.sin(t * rate + ph); return { x, y: SWING.y + Math.sin(a) * CHAIN, z: swTop - Math.cos(a) * CHAIN }; };
    const seat = (ctx, x, p) => {
      if (Q.lines) for (const dx of [-0.22, 0.22]) line(ctx, [[x + dx, SWING.y, swTop], [x + dx, p.y, p.z]], C.ink, 0.03);
      box(ctx, x - 0.28, p.y - 0.12, p.z - 0.06, 0.56, 0.24, 0.06, C.ink, { flat: true, lw: 0.02 });
    };
    // The goose's swing: gently, all day.
    const gooseSwing = swingAt(103.8, 0.3, 1.7, 0);
    R.mover(gooseSwing, (ctx, t, p) => seat(ctx, 103.8, p), { bias: 0.9 });
    // A kid on the other, much higher.
    const swinger = folk(301, { top: C.pink, bottom: C.navy, style: 'pony' });
    const kidSwing = swingAt(104.75, 0.62, 1.7, 1.3);
    R.mover(kidSwing, (ctx, t, p) => {
      seat(ctx, 104.75, p);
      if (kids(t)) man(ctx, 104.75, p.y, p.z - 0.8 * 0.7, { ...swinger, arms: [2.75, 2.75] }, { pose: 'sit', dir: 'l', scale: 0.7 }, t);
    }, { bias: 0.9 });
    // The slide, along y, its ladder on the right; a kid going round.
    const SX = 101.9, sTop = h(SX, 35.0) + 1.5, sBot = h(SX, 37.2) + 0.25;
    R.thing(102.6, 35.4, (ctx) => {
      for (const [dx, dy] of [[-0.3, -0.35], [0.3, -0.35], [-0.3, 0.3], [0.3, 0.3]]) post(ctx, SX + dx, 35.0 + dy, h(SX + dx, 35 + dy), sTop - h(SX, 35), C.teal, 0.08);
      box(ctx, SX - 0.35, 34.6, sTop - 0.08, 0.7, 0.75, 0.1, C.coral, { flat: true, lw: 0.035 });
      for (const dy of [-0.3, 0.25]) strut(ctx, [SX + 0.55, 35.0 + dy, h(SX + 0.55, 35 + dy)], [SX + 0.35, 35.0 + dy, sTop], 0.04, C.teal);
      if (Q.lines) for (let k = 1; k < 5; k++) { const z = h(SX, 35) + k * 0.3; line(ctx, [[SX + 0.55 - k * 0.04, 34.7, z], [SX + 0.55 - k * 0.04, 35.25, z]], C.teal, 0.04); }
    });
    R.thing(102.3, 37.3, (ctx) => {
      face(ctx, [[SX - 0.3, 35.35, sTop], [SX + 0.3, 35.35, sTop], [SX + 0.3, 37.2, sBot], [SX - 0.3, 37.2, sBot]], C.mustard, { lw: 0.04 });
      for (const dx of [-0.3, 0.3]) strut(ctx, [SX + dx, 35.35, sTop + 0.15], [SX + dx, 37.2, sBot + 0.12], 0.05, shade(C.mustard, 0.15));
      post(ctx, SX, 37.0, h(SX, 37.0), sBot - h(SX, 37.0) - 0.02, C.teal, 0.07);
    });
    const slider = folk(305, { top: C.green, bottom: C.coral, style: 'short' });
    R.mover((t) => {
      const c = wrap(t) % 10;
      if (c < 3) { const k = c / 3; return { x: SX + 0.5, y: 35.0, z: lerp(h(SX + 0.5, 35), sTop, k), pose: 'walk', dir: 'l', back: true }; }
      if (c < 4) return { x: SX, y: 35.05, z: sTop, pose: 'stand', dir: 'l', wave: true };
      if (c < 5.5) { const k = (c - 4) / 1.5; return { x: SX, y: lerp(35.3, 37.25, k), z: lerp(sTop, sBot, k * k) - 0.56, pose: 'sit', dir: 'l' }; }
      const k = (c - 5.5) / 4.5, x = lerp(SX + 0.2, SX + 0.5, k), y = lerp(37.5, 35.0, k);
      return { x, y, z: h(x, y), pose: 'walk', dir: 'r', back: true };
    }, (ctx, t, p) => {
      if (!kids(t)) return;
      man(ctx, p.x, p.y, p.z, { ...slider, ...(p.pose === 'sit' ? { arms: [2.8, -2.8] } : {}) }, { pose: p.pose, dir: p.dir, back: p.back, scale: 0.7 }, t);
      if (p.wave) talk(ctx, p.x, p.y, p.z + 2.1, 'Watch!');
    }, { bias: 1.4 });
    // A lobster on a spring, and a toddler on the lobster.
    const lrx = 104.4, lry = 37.0, lrz = h(lrx, lry);
    const toddler = folk(307, { top: C.butter, bottom: C.teal, style: 'curly' });
    const springer = (ctx, t) => {
      const rock = kids(t) ? Math.sin(t * 5) * 0.14 : 0, x = lrx + rock;
      if (Q.lines) { const pts = []; for (let k = 0; k <= 6; k++) pts.push([lrx + rock * (k / 6) + (k % 2 ? 0.1 : -0.1), lry, lrz + k * 0.08]); line(ctx, pts, C.grey, 0.05); }
      box(ctx, x - 0.4, lry - 0.18, lrz + 0.48, 0.8, 0.36, 0.26, C.coral, { flat: true, lw: 0.035 });
      for (const dy of [-0.2, 0.2]) { disc(ctx, x + 0.55, lry + dy, lrz + 0.62, 0.15, C.coral, { lw: 0.03 }); }
      if (Q.detail) { ctx.fillStyle = C.ink; for (const dy of [-0.08, 0.08]) { const [X, Y] = P(x + 0.4, lry + dy, lrz + 0.85); ctx.beginPath(); ctx.arc(X, Y, 0.04, 0, Math.PI * 2); ctx.fill(); } }
      if (kids(t)) man(ctx, x - 0.05, lry, lrz + 0.75 - 0.8 * 0.55, { ...toddler, arms: [1.3, 1.2] }, { pose: 'sit', dir: 'r', scale: 0.55 }, t);
    };
    R.thing(lrx + 0.5, lry + 0.4, (ctx) => springer(ctx, 0), { on: (t) => !kids(t) });
    R.thing(lrx + 0.5, lry + 0.4, springer, { anim: true, on: kids });
    // The bench, and a parent on their phone.
    const bz = h(100.3, 38.3);
    const parent = folk(311, { top: C.sky, bottom: C.navy, style: 'long' });
    const phone = (g) => { g.fillStyle = C.ink; g.fillRect(0.28, -0.3, 0.14, 0.22); };
    R.thing(101, 38.6, (ctx) => {
      box(ctx, 99.7, 38.1, bz + 0.5, 1.2, 0.4, 0.08, C.wood, { flat: true, lw: 0.03 });
      box(ctx, 99.7, 37.98, bz + 0.58, 1.2, 0.08, 0.45, C.wood, { flat: true, lw: 0.03 });
      for (const x of [99.8, 100.75]) post(ctx, x, 38.45, bz, 0.5, C.ink, 0.06);
    });
    // (Sorted after the bench, or its seat covers them.)
    R.thing(101.01, 38.61, (ctx) => man(ctx, 100.4, 38.3, bz + 0.58 - 0.8, { ...parent, arms: [1.0, 0.9], hold: phone }, { pose: 'sit', dir: 'l' }, 0), { on: kids });
    // The rules.
    const [rbx, rby] = [105.6, 31.8], rz = h(rbx, rby);
    R.thing(rbx + 0.1, rby + 0.1, (ctx) => {
      for (const dy of [-0.45, 0.45]) post(ctx, rbx, rby + dy, rz, 1.3, C.teal, 0.08);
      notice(ctx, 'y', rbx + 0.06, rby, rz + 1.45, 1.2, 0.72, [['PLAYGROUND', 0.15, C.white], ['NO DOGS · NO GLASS', 0.1, C.white], ['NO GEESE', 0.13, C.butter]], { board: C.navy });
    });

    // ---------- The lifeguard stands ----------
    // Tall white chairs, one on the ocean side and one on the river side,
    // open 9 to 5:30 (the only lifeguards on the island). After dark each has
    // a lantern on a post. Legs and ladders only above the water.
    const stand = (x, y, sea) => {
      const z0 = footing(R, x - 0.5, y - 0.5, 1, 1), deck = z0 + 1.9;
      // Its legs: a still picture while the water's below them, live when it's round them.
      const legsDry = (t) => level(t) - 0.02 <= z0 - 0.1;
      const legs = (ctx, L) => {
        const zb = Math.max(z0 - 0.1, L - 0.02), k = clamp((zb - z0) / (deck - z0));
        for (const [sx2, sy2] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const top = [x + sx2 * 0.42, y + sy2 * 0.42, deck], ft = [x + sx2 * 0.64, y + sy2 * 0.64, z0];
          strut(ctx, [lerp(ft[0], top[0], k), lerp(ft[1], top[1], k), zb], top, 0.1, C.white);
        }
        if (k < 0.5) strut(ctx, [x - 0.53, y + 0.53, z0 + 0.95], [x + 0.53, y + 0.53, z0 + 0.95], 0.06, C.white);
        // The ladder, on the land side.
        const lyy = sea ? y : y, lxx = sea ? x + 0.72 : x - 0.72;
        if (sea) {
          for (const dy of [-0.22, 0.22]) strut(ctx, [lerp(lxx + 0.25, x + 0.5, k), lyy + dy, zb], [x + 0.5, lyy + dy, deck], 0.05, C.white);
          if (Q.lines) for (let r = 1; r < 6; r++) { const zz = z0 + r * 0.32; if (zz > zb) line(ctx, [[lerp(lxx + 0.25, x + 0.5, (zz - z0) / (deck - z0)), lyy - 0.22, zz], [lerp(lxx + 0.25, x + 0.5, (zz - z0) / (deck - z0)), lyy + 0.22, zz]], C.white, 0.04); }
        }
      };
      R.thing(x + 0.62, y + 0.62, (ctx) => legs(ctx, -9), { on: legsDry });
      R.thing(x + 0.62, y + 0.62, (ctx, t) => legs(ctx, level(t)), { anim: true, on: (t) => !legsDry(t) });
      R.thing(x + 0.63, y + 0.64, (ctx) => {
        box(ctx, x - 0.52, y - 0.52, deck, 1.04, 1.04, 0.14, C.white, { flat: true, lw: 0.04 });
        box(ctx, x - 0.42, y - 0.3, deck + 0.14, 0.84, 0.5, 0.3, C.white, { flat: true, lw: 0.035 });
        if (sea) {
          box(ctx, x - 0.46, y - 0.52, deck + 0.14, 0.92, 0.12, 1.15, C.coral, { flat: true, lw: 0.04 });
          write(ctx, 'x', x, y - 0.4, deck + 0.95, 'GUARD', 0.26, C.white, 'Bagel Fat One');
        }
        // The umbrella's pole, the rescue can hanging off the side.
        post(ctx, x, sea ? y - 0.46 : y + 0.46, deck, 2.2, C.white, 0.07);
        const [rx, ry, rz2] = [x + 0.56, y + 0.3, deck - 0.35];
        box(ctx, rx - 0.08, ry - 0.3, rz2, 0.16, 0.6, 0.16, C.coral, { flat: true, lw: 0.03 });
      });
      if (!sea) {
        R.thing(x + 0.66, y + 0.67, (ctx) => {
          box(ctx, x - 0.46, y + 0.4, deck + 0.14, 0.92, 0.12, 1.15, C.coral, { flat: true, lw: 0.04 });
          write(ctx, 'x', x, y + 0.52, deck + 0.95, 'GUARD', 0.26, C.white, 'Bagel Fat One');
        });
      }
      // Its umbrella: open on duty, furled off.
      const cyy = sea ? y - 0.2 : y + 0.2;
      R.thing(x + 0.7, y + 0.72, (ctx) => canopy(ctx, x, cyy, deck + 2.05, 1.0), { on: guards });
      R.thing(x + 0.7, y + 0.72, (ctx) => { const [X, Y] = P(x, sea ? y - 0.46 : y + 0.46, deck + 1.3); ctx.beginPath(); ctx.moveTo(X - 0.12, Y); ctx.lineTo(X, Y - 1.1); ctx.lineTo(X + 0.12, Y); ctx.closePath(); paint(ctx, C.coral, { lw: 0.035 }); }, { on: offDuty });
      return deck;
    };
    const oDeck = stand(...OCEAN_STAND, true);
    const rDeck = stand(...RIVER_STAND, false);
    // The lanterns by each stand, lit after dark.
    for (const [x, y] of [[102.0, 41.1], [101.9, 26.2]]) {
      const z = h(x, y);
      const lamp = (on) => (ctx) => {
        post(ctx, x, y, z, 2.2, C.wood, 0.1);
        strut(ctx, [x, y, z + 2.15], [x + 0.35, y, z + 2.15], 0.04, C.ink);
        box(ctx, x + 0.22, y - 0.12, z + 1.7, 0.26, 0.24, 0.36, on ? LIT : tint(C.grey, 0.4), { flat: true, lw: 0.035 });
      };
      R.thing(x + 0.4, y + 0.15, lamp(false), { on: (t) => !lightsOn(t) });
      R.thing(x + 0.4, y + 0.15, lamp(true), { on: lightsOn });
      nightGlow(R, x + 0.35, y, z + 1.9, 1.8);
    }
    // The ocean guard: sits and watches, and every half minute stands up and
    // whistles at the same swimmer drifting toward the jetty. When the
    // Courier comes asking for G. Goose, never heard of him.
    const oGuard = folk(101, { top: C.coral, bottom: C.coral, hat: 'cap', style: 'short' });
    const [ox, oy] = OCEAN_STAND;
    const cycle = (t) => (((wrap(t) - 58) % 26) + 26) % 26;
    // (Sitting watching is a still picture; the whistle and the "Who?" are live.)
    const whistling = (t) => { const c = cycle(t); return c >= 19 && c < 23.5; };
    const busy = (t) => whistling(t) || asking(t);
    R.thing(ox + 0.66, oy + 0.66, (ctx) => man(ctx, ox, oy - 0.05, oDeck + 0.44 - 0.8, { ...oGuard, arms: [0.6, 0.5] }, { pose: 'sit', dir: 'l' }, 0), { on: (t) => guards(t) && !busy(t) });
    R.thing(ox + 0.66, oy + 0.66, (ctx, t) => {
      if (whistling(t)) {
        man(ctx, ox, oy - 0.05, oDeck + 0.44 - 0.8, { ...oGuard, arms: [1.6, 2.7 + Math.sin(t * 10) * 0.2] }, { pose: 'sit', dir: 'l' }, t);
        talk(ctx, ox, oy, oDeck + 2.2, 'TWEET!');
      } else {
        man(ctx, ox, oy - 0.05, oDeck + 0.44 - 0.8, { ...oGuard, arms: [0.6, 0.5] }, { pose: 'sit', dir: 'l' }, t);
        talk(ctx, ox, oy, oDeck + 2.2, 'Who?');
      }
    }, { anim: true, on: (t) => guards(t) && busy(t) });
    // The river guard, back to us, binoculars on the boats.
    const rGuard = folk(103, { top: C.coral, bottom: C.coral, hat: 'cap', style: 'pony' });
    const [rx0, ry0] = RIVER_STAND;
    R.thing(rx0 + 0.64, ry0 + 0.62, (ctx) => man(ctx, rx0, ry0, rDeck + 0.44 - 0.8, { ...rGuard, arms: [2.3, 2.2] }, { pose: 'sit', dir: 'r', back: true }, 0), { on: guards });
    // The swim flags, and the guards' cooler (Gander Cola, of course).
    R.thing(102.4, 44.9, (ctx, t) => {
      for (const [fx, fy] of [[99.4, 44.8], [102.2, 44.4]]) {
        const z = h(fx, fy);
        post(ctx, fx, fy, z, 2.2, C.white, 0.06);
        for (const [z1, z2, color] of [[z + 1.9, z + 2.2, C.red], [z + 1.6, z + 1.9, C.mustard]]) {
          const pts = [];
          for (let k = 0; k <= 4; k++) { const u = k * 0.18; pts.push([fx + u, fy + Math.sin(t * 6 + k) * 0.06 * k, z2 - k * 0.01]); }
          for (let k = 4; k >= 0; k--) { const u = k * 0.18; pts.push([fx + u, fy + Math.sin(t * 6 + k) * 0.06 * k, z1 - k * 0.01]); }
          face(ctx, pts, color, { lw: 0.03 });
        }
      }
    }, { anim: true, on: guards });
    const kz = h(102.4, 42.9);
    R.thing(102.8, 43.3, (ctx) => {
      box(ctx, 102.1, 42.7, kz, 0.7, 0.45, 0.42, BRAND.can, { flat: true, lw: 0.035, top: C.white });
      write(ctx, 'x', 102.45, 43.15, kz + 0.21, 'GANDER', 0.15, BRAND.ink, 'Bagel Fat One');
    }, { on: guards });
    // The chalkboard of today's tides, on an easel by the ocean stand.
    const [bx, by] = BOARD_AT, bz0 = h(bx, by);
    R.thing(bx + 0.9, by + 0.5, (ctx) => {
      for (const dx of [-0.7, 0.7]) { strut(ctx, [bx + dx, by + 0.3, bz0], [bx + dx * 0.9, by, bz0 + 1.8], 0.06, C.wood); strut(ctx, [bx + dx, by - 0.4, bz0], [bx + dx * 0.9, by, bz0 + 1.8], 0.06, shade(C.wood, 0.2)); }
      board(ctx, 'x', bx, by + 0.02, bz0 + 1.12, 1.76, 1.36, null, { board: C.wood });
      notice(ctx, 'x', bx, by + 0.04, bz0 + 1.12, 1.6, 1.2, [
        ['TIDES TODAY', 0.19, C.white],
        ['LOW 12:02 PM', 0.15],
        ['HIGH 12:15 AM', 0.15],
        ['KING TIDE!', 0.18, tint(C.coral, 0.35)],
        ['WATER 64°  SEALS 3', 0.12],
        ['GREENHEADS: YES', 0.12, C.butter],
      ], { board: mix(C.ink, C.green, 0.25), ink: tint(C.greyLight, 0.4), edge: 0.03 });
    });

    // ---------- The Point's beach ----------
    // Swimmers off the ocean side (one keeps drifting to the jetty), a kite
    // over the Point, a family on the river side under the NO SWIMMING sign.
    const swimmers = [folk(381, { top: C.teal, style: 'bun' }), folk(383, { top: C.coral, style: 'short' }), folk(385, { top: C.mustard, style: 'bald' })];
    R.mover((t) => ({ x: 101.4, y: shoreY(101.4, level(t)) + 2.2 }), (ctx, t) => {
      const L = level(t), c = cycle(t);
      const sx1 = 99.8, sx2 = 100.8;
      man(ctx, sx1, shoreY(sx1, L) + 2.5, h(sx1, shoreY(sx1, L) + 2.5), swimmers[0], { pose: 'swim', dir: 'l' }, t);
      man(ctx, sx2, shoreY(sx2, L) + 1.7, h(sx2, shoreY(sx2, L) + 1.7), swimmers[1], { pose: 'wave', dir: 'l' }, t);
      const k = c < 19 ? c / 19 : c < 23.5 ? 1 : 1 - (c - 23.5) / 2.5;
      const x3 = lerp(101.3, 102.8, k), y3 = shoreY(x3, L) + 2.4;
      man(ctx, x3, y3, h(x3, y3), swimmers[2], { pose: 'swim', dir: c < 23.5 ? 'r' : 'l' }, t);
    }, { on: during(10, 17) });
    // The kite.
    const flier = folk(341, { top: C.white, bottom: C.navy, hat: 'sun' });
    const [kx, ky] = [98.9, 41.3], kz0 = h(kx, ky);
    R.thing(kx + 0.3, ky + 0.3, (ctx, t) => {
      const sun = sunsetWatch(t);
      man(ctx, kx, ky, kz0, { ...flier, arms: [2.3, 2.0] }, turn(t, { pose: 'stand', dir: 'r' }), t);
      const [X, Y] = P(kx, ky, kz0);
      const hx = X + (sun ? 0.5 : 0.77), hy = Y - 2.0;
      const kxw = 100.2 + Math.sin(t * 0.7) * 0.8, kzw = 8.6 + Math.sin(t * 1.1) * 0.5;
      const [KX, KY] = P(kxw, 45.2, kzw);
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo((hx + KX) / 2, (hy + KY) / 2 + 1.2, KX, KY); ctx.strokeStyle = alpha(C.ink, 0.6); ctx.lineWidth = 0.02; ctx.stroke();
      const tilt = Math.sin(t * 1.3) * 0.2;
      ctx.save(); ctx.translate(KX, KY); ctx.rotate(tilt);
      ctx.beginPath(); ctx.moveTo(0, -0.55); ctx.lineTo(0.38, 0); ctx.lineTo(0, 0.7); ctx.lineTo(-0.38, 0); ctx.closePath(); paint(ctx, C.coral, { lw: 0.04 });
      ctx.beginPath(); ctx.moveTo(0, -0.55); ctx.lineTo(0.38, 0); ctx.lineTo(0, 0); ctx.closePath(); paint(ctx, C.butter, { lw: 0.03 });
      ctx.beginPath(); ctx.moveTo(0, 0.7);
      for (let k = 1; k <= 4; k++) ctx.lineTo(Math.sin(t * 4 + k) * 0.15, 0.7 + k * 0.3);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.stroke();
      ctx.restore();
    }, { anim: true, on: during(10, 20.9) });
    // The river side: a family under an umbrella, and the sign they're under.
    const fz = h(98.0, 25.4);
    R.thing(99, 26.0, (ctx) => umbrella(ctx, 98.0, 25.4, fz, C.teal), { on: during(10, 17.5) });
    const reader = folk(351, { top: C.blush, bottom: C.teal, style: 'long' });
    const book = (g) => { g.fillStyle = C.coral; g.fillRect(0.2, -0.35, 0.32, 0.24); g.strokeStyle = C.ink; g.lineWidth = 0.02; g.strokeRect(0.2, -0.35, 0.32, 0.24); };
    R.thing(98.4, 26.0, (ctx) => man(ctx, 98.1, 25.7, fz - 0.8 + 0.1, { ...reader, arms: [1.0, 0.9], hold: book }, { pose: 'sit', dir: 'r' }, 0), { on: during(10, 17.5) });
    const sleeper = folk(353, { top: C.navy, bottom: C.coral, style: 'bald' });
    R.thing(99.2, 25.6, (ctx, t) => man(ctx, 98.9, 25.1, h(98.9, 25.1) + 0.2, sleeper, { pose: 'sleep', dir: 'r' }, t), { anim: true, on: during(10, 17.5) });
    const [nsx, nsy] = [105.0, 28.9], nz = h(nsx, nsy);
    R.thing(nsx + 0.1, nsy + 0.1, (ctx) => {
      for (const dx of [-0.6, 0.6]) post(ctx, nsx + dx, nsy, nz, 1.4, C.wood, 0.1);
      notice(ctx, 'x', nsx, nsy + 0.06, nz + 1.55, 1.6, 0.8, [['NO SWIMMING', 0.17, C.white], ['STRONG CURRENTS', 0.12, C.white], ['THIS MEANS YOU, DAVE', 0.1, C.butter]], { board: C.red });
    });
    // A jogger at dawn, up and down the ocean side.
    const jogger = folk(361, { top: C.pink, bottom: C.ink, style: 'pony' });
    R.mover((t) => {
      const k = (t / 10) % 2, u = k < 1 ? k : 2 - k, x = lerp(97.6, 102.0, u), y = lerp(43.4, 43.1, u);
      return { x, y, dir: k < 1 ? 'r' : 'l', back: k >= 1 };
    }, (ctx, t, p) => man(ctx, p.x, p.y, h(p.x, p.y), jogger, { pose: 'run', dir: p.dir, back: p.back }, t), { on: during(5, 8) });
    // Sunset: a couple and someone with a phone up, come for it.
    const sun1 = folk(363, { top: C.coral, bottom: C.navy, style: 'long', dress: true }), sun2 = folk(365, { top: C.navy, bottom: C.ink, style: 'short' });
    const sun3 = folk(367, { top: C.butter, bottom: C.teal, style: 'bun' });
    const phoneUp = (g) => { g.fillStyle = C.ink; g.fillRect(0.1, -1.2, 0.18, 0.3); };
    R.thing(103.6, 33.4, (ctx) => {
      man(ctx, 103.0, 32.9, h(103.0, 32.9), sun1, { pose: 'stand', dir: 'r', back: true }, 0);
      man(ctx, 103.5, 33.2, h(103.5, 33.2), { ...sun2, arms: [2.2, 0.2] }, { pose: 'point', dir: 'r', back: true }, 0);
    }, { anim: true, on: during(19.5, 21.2) });
    R.thing(106.2, 31.6, (ctx) => man(ctx, 106.0, 31.4, h(106.0, 31.4), { ...sun3, arms: [2.4, 2.3], hold: phoneUp }, { pose: 'stand', dir: 'r', back: true }, 0), { anim: true, on: during(19.5, 21.2) });
    // Night: a fisherman with a lantern on the Point's beach, for the king
    // tide.
    const nightFish = during(22, 3.5);
    const nFisher = folk(219, { top: C.navy, bottom: C.ink, hat: 'beanie' });
    const [nfx, nfy] = [104.9, 30.0], nfz = h(nfx, nfy);
    R.thing(nfx + 0.4, nfy + 0.4, (ctx, t) => {
      man(ctx, nfx, nfy, nfz, { ...nFisher, arms: ARMS.fish, hold: rod(nfx, nfy, nfz, 'r', t, 'fish', [107.8, 29.4]) }, { pose: 'stand', dir: 'r' }, t);
      box(ctx, nfx - 0.5, nfy + 0.2, nfz, 0.22, 0.22, 0.32, LIT, { flat: true, lw: 0.03 });
    }, { anim: true, on: nightFish });
    R.light({ at: [nfx - 0.4, nfy + 0.3, nfz + 0.4], r: 1.6, color: LIT, k: (t) => (nightFish(t) ? 0.85 : 0) });

    // ---------- The jetty ----------
    // Rock by rock (each its own thing, so seals and fishermen sort in),
    // drawn only above the water.
    // Most of the day the water's low, so the rock between LOW_CUT and CUT
    // is a still picture too, and the live band is only what the water laps.
    const LOW_CUT = -0.3, low = (t) => level(t) < LOW_CUT - 0.02;
    const lure = (ctx, t, r) => {
      const [X, Y] = P(LURE[0], LURE[1], LURE[2]);
      if (Q.lines) { const [TX, TY] = P(r.x + 0.55, r.y - 0.2, r.top + 0.05); ctx.beginPath(); ctx.moveTo(X - 0.05, Y - 0.1); ctx.quadraticCurveTo(X + 0.2, (Y + TY) / 2, TX, TY); ctx.strokeStyle = alpha(C.ink, 0.75); ctx.lineWidth = 0.025; ctx.stroke(); }
      ctx.save(); ctx.translate(X, Y); ctx.rotate(0.9 + Math.sin(t * 2) * 0.08);
      ctx.beginPath(); ctx.ellipse(0, 0, 0.3, 0.1, 0, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.035 });
      ctx.beginPath(); ctx.ellipse(0.05, 0, 0.22, 0.045, 0, 0, Math.PI * 2); ctx.fillStyle = C.coral; ctx.fill();
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(-0.2, -0.02, 0.035, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-0.3, 0); ctx.lineTo(-0.38, 0.06); ctx.lineTo(-0.32, -0.05); ctx.fillStyle = tint(C.grey, 0.3); ctx.fill();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.beginPath();
      for (const u of [-0.05, 0.22]) { ctx.moveTo(u, 0.08); ctx.lineTo(u, 0.2); ctx.moveTo(u - 0.06, 0.24); ctx.lineTo(u, 0.2); ctx.lineTo(u + 0.06, 0.24); }
      ctx.stroke();
      ctx.restore();
    };
    ROCKS.forEach((r, i) => {
      // The band the water moves on, every frame; above it, still pictures.
      const cut = STONES[i].every(splits);
      const band = (top) => (ctx, t) => {
        const L = level(t);
        for (const s of STONES[i]) drawStone(ctx, s, Math.max(s.zb, L - 0.02), top);
        // The lure, snagged on the side of its rock, out only at low water.
        if (i === LURE_ROCK && L < -0.5) lure(ctx, t, r);
      };
      if (!cut) { R.thing(r.x + 0.7, r.y + 0.7, band(Infinity), { anim: true }); return; }
      R.thing(r.x + 0.7, r.y + 0.7, band(CUT), { anim: true, on: (t) => !low(t) });
      R.thing(r.x + 0.7, r.y + 0.7, band(LOW_CUT), { anim: true, on: low });
      R.thing(r.x + 0.7, r.y + 0.7, (ctx) => { for (const s of STONES[i]) drawStone(ctx, s, LOW_CUT, CUT, true); }, { on: low });
      R.thing(r.x + 0.7, r.y + 0.7, (ctx) => { for (const s of STONES[i]) drawStone(ctx, s, CUT, Infinity, true); });
    });
    // The seals.
    SEALS.forEach((sl, n) => {
      R.mover((t) => sl.at(t), (ctx, t, p) => {
        if (p.mode === 'away') return;
        const L = level(t);
        if (p.mode === 'swim') { sealHead(ctx, p.x, p.y, L, t, p.dir); return; }
        const s = wrap(t);
        let bark = null;
        if (n === 0 && (s % 45) > 40 && (s % 45) < 42.5) bark = 'ORF.';
        if (n === 2 && s > 28.5 && s < 31.5) bark = 'ORF!';
        if (n === 1 && s > 50 && s < 54) bark = 'ORF?';
        const dir = sunsetWatch(t) ? 'r' : sl.dir;
        if (p.mode === 'haul') {
          const za = p.zf[0] === WATER ? L - 0.3 : p.zf[0], zb2 = p.zf[1] === WATER ? L - 0.3 : p.zf[1];
          const z = lerp(za, zb2, p.k);
          wade(ctx, p.x, p.y, z, L, (g) => seal(g, p.x, p.y, z, t, { ...sl, dir: 'l', head: 0.2 }), 0.6);
          return;
        }
        seal(ctx, p.x, p.y, p.z, t, { ...sl, dir, bark });
      }, { bias: 1.6 });
    });
    // The fishermen. Two on the jetty, one off the Point's beach; they walk
    // out from the rental in the small hours and home again at nine.
    const toDoor = [[103.8, 37.8, 0], [102.9, 33.2, 0], [100.2, 31.0, 0], [DOOR[0], DOOR[1], 0]];
    const fromDoor = [[100.2, 31.0, 0], [102.9, 33.2, 0], [103.8, 37.8, 0], [104.3, 40.4, 0]];
    const riverCast = (p) => [p.x + 2.8, p.y - 0.4];
    // The one in teal: shuffled out twice, then gives up and fishes from the beach.
    fisherman(R, folk(211, { top: C.teal, bottom: C.navy, hat: 'beanie', style: 'short' }), [
      RK(7), { until: 11.5, fish: true },
      RK(8), { until: 21.5, fish: true },
      RK(9), { until: 28, fish: true },
      { until: 29.5, say: 'I\'m out.' },
      RK(8, 0.45), RK(7, 0.45), RK(6), RK(5), RK(4, 0.45), RK(3), RK(2), RK(1), RK(0),
      [104.3, 40.4, 0], [105.3, 38.8, 0], { until: 58.2, fish: true },
      ...toDoor, { until: 338, hide: true },
      ...fromDoor, RK(0), RK(1), RK(2), RK(3), RK(4, 0.45), RK(5), RK(6),
    ], riverCast, { name: 'The fisherman in teal' });
    // The one in yellow: shuffled out to the last rock, shares it with a
    // seal, and catches a striper at eight.
    const hasFish = (t) => inside(t, 57, 75);
    fisherman(R, folk(203, { top: C.mustard, bottom: C.navy, hat: 'cap', style: 'curly' }), [
      RK(9), { until: 21.5, fish: true },
      RK(10, 0.3, 0.3), { until: 44, fish: true },
      { until: 50, reel: true, say: 'Fish on!' },
      { until: 57, catch: true, say: 'Striper!' },
      RK(9, 0.2), RK(8, 0.45), RK(7), RK(6), RK(5), RK(4, 0.45), RK(3), RK(2), RK(1), RK(0),
      [104.3, 40.4, 0], ...toDoor, { until: 334, hide: true },
      ...fromDoor, RK(0), RK(1), RK(2), RK(3), RK(4, 0.45), RK(5), RK(6), RK(7), RK(8),
    ], (p) => [p.x + 2.5, p.y - 0.6], { name: 'The fisherman in yellow', fish: hasFish });
    // The one on the Point's beach, wading at first light.
    fisherman(R, folk(207, { top: C.green, bottom: C.brown, hat: 'sun', style: 'bald' }), [
      [106.3, 34.3, 0], { until: 58.2, fish: true },
      [104.2, 33.6, 0], [100.2, 31.0, 0], [DOOR[0], DOOR[1], 0], { until: 346, hide: true },
      [100.2, 31.0, 0], [104.2, 33.6, 0],
    ], (p) => [p.x + 2.6, p.y - 0.2], { name: 'The fisherman on the Point' });

    // ---------- The river mouth ----------
    // The sandbar that shows at low tide (the ground there sits a little
    // deep, so it's drawn at the water line as the tide lets it out), with
    // gulls on it.
    R.rug((ctx, t) => {
      const L = level(t), s = Math.sqrt(clamp((-0.35 - L) / 0.5));
      const ring = (k) => { const pts = []; for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2, r = 1 + 0.12 * Math.sin(3 * a + 1) + 0.07 * Math.sin(5 * a); pts.push([BAR[0] + Math.cos(a) * 3.4 * s * r * k, BAR[1] + Math.sin(a) * 1.5 * s * r * k, L + 0.01]); } return pts; };
      face(ctx, ring(1), mix(LAND.sand, LAND.bed, 0.35), { stroke: alpha(C.white, 0.9), lw: 0.08 });
      if (s > 0.5) face(ctx, ring(0.62), LAND.sand, { stroke: false });
    }, { anim: true, on: (t) => level(t) < -0.35 }).area = [BAR[0] - 4, BAR[1] - 2, BAR[0] + 4, BAR[1] + 2];
    const BAR_GULLS = [[-1.6, -0.2, 'r'], [-0.9, 0.4, 'l'], [0.1, -0.3, 'r'], [0.8, 0.3, 'r'], [1.5, -0.1, 'l']];
    R.thing(BAR[0] + 1, BAR[1] + 1, (ctx, t) => {
      const L = level(t);
      BAR_GULLS.forEach(([dx, dy, dir], i) => {
        const up = i === 2 ? Math.max(0, Math.sin(t * 0.5)) : 0;
        if (up > 0.2) gull(ctx, BAR[0] + dx, BAR[1] + dy, L + up * 2.4, t, { fly: true, dir, scale: 0.8 });
        else gull(ctx, BAR[0] + dx, BAR[1] + dy, L + 0.01, t, { dir, peck: i % 2 === 0, phase: i, scale: 0.8 });
      });
    }, { anim: true, on: (t) => level(t) < -0.6 });
    // The Basin: two kayaks pulled up on the bank, out for a sunset paddle on
    // the evening's water. (The island's heron fishes the Turnpike's creek,
    // and the Sound's channel.)
    const paddle = during(19.65, 20.95);
    const kLooks = [folk(375, { top: C.coral, style: 'pony' }), folk(377, { top: C.teal, style: 'short' })];
    const kCols = [C.mustard, C.coral];
    R.thing(99, 24.2, (ctx) => { kayak(ctx, 98.3, 23.2, h(98.3, 23.2), 0.5, kCols[0], null, 0, false); kayak(ctx, 98.7, 23.9, h(98.7, 23.9), 0.4, kCols[1], null, 0, false); }, { on: (t) => !paddle(t) });
    kLooks.forEach((look, i) => {
      R.mover((t) => {
        const a = t * 0.35 + i * Math.PI;
        return { x: BASIN[0] + Math.cos(a) * 1.4, y: BASIN[1] + Math.sin(a) * 0.7, a: a + Math.PI / 2 };
      }, (ctx, t, p) => {
        const z = float(p.x, p.y, t) - 0.08;
        kayak(ctx, p.x, p.y, z, sunsetWatch(t) ? -0.9 : p.a, kCols[i], look, t, !sunsetWatch(t));
      }, { on: paddle });
    });
    // A lobster boat moored in the river mouth, hauling its traps till two:
    // up comes the trap, out comes a lobster, too short, back it goes. Every
    // fourth one's a keeper.
    const [hx, hy] = [105.0, 19.2];
    const hauler = folk(391, { top: C.mustard, bottom: C.mustard, hat: 'beanie', style: 'short' });
    const hauling = during(6, 14);
    R.mover(() => ({ x: hx, y: hy + 0.6 }), (ctx, t) => {
      boat(ctx, hx, hy, t, { along: 'x', len: 2.8, wid: 1.15, color: tint(C.sky, 0.3), cabin: C.white, stripe: C.navy });
      const deckZ = float(hx, hy, t) - 0.15 + 0.04 * Math.sin(t * 1.7 + hx) + 0.45;
      if (lightsOn(t)) { const [X, Y] = P(hx - 0.3, hy, deckZ + 1.2); ctx.beginPath(); ctx.arc(X, Y, 0.08, 0, Math.PI * 2); ctx.fillStyle = LIT; ctx.fill(); }
      if (!hauling(t)) return;
      const L = level(t), c = wrap(t) % 18, n = Math.floor(wrap(t) / 18);
      // The davit, its line and the trap.
      strut(ctx, [hx + 0.4, hy + 0.45, deckZ], [hx + 0.4, hy + 0.6, deckZ + 1.1], 0.05, C.grey);
      let ty = hy + 0.95, tz = L - 0.7;
      if (c < 5) tz = lerp(L - 0.7, deckZ + 0.35, c / 5);
      else if (c < 7) { tz = deckZ + 0.35; ty = lerp(hy + 0.95, hy + 0.4, (c - 5) / 2); }
      else if (c < 12) { tz = deckZ + 0.05; ty = hy + 0.4; }
      else if (c < 13) { tz = deckZ + 0.35; ty = lerp(hy + 0.4, hy + 0.95, c - 12); }
      else if (c < 16) tz = lerp(deckZ + 0.35, L - 0.7, (c - 13) / 3);
      if (Q.lines) line(ctx, [[hx + 0.4, hy + 0.6, deckZ + 1.1], [hx + 0.4, ty, Math.max(tz + 0.4, L)]], C.ink, 0.02);
      if (tz + 0.4 > L) {
        const zz = Math.max(tz, L);
        box(ctx, hx + 0.1, ty - 0.2, zz, 0.6, 0.4, tz + 0.4 - zz, alpha(C.green, 0.6), { flat: true, lw: 0.035, top: alpha(C.green, 0.35) });
      }
      const opening = c >= 7 && c < 12;
      const lob = (g) => { if (!opening) return; g.fillStyle = mix(C.brown, C.green, 0.3); g.beginPath(); g.ellipse(0.55, -0.35, 0.08, 0.2, 0.3, 0, Math.PI * 2); g.fill(); };
      man(ctx, hx - 0.25, hy + 0.1, deckZ, { ...hauler, arms: opening ? [2.2, 1.0] : [1.1, 1.0], hold: lob }, { pose: 'stand', dir: 'l' }, t);
      if (c >= 8.5 && c < 11.5) talk(ctx, hx - 0.25, hy + 0.1, deckZ + 2.7, n % 4 === 3 ? 'Keeper!' : 'Short.');
    }, { bias: 0.6 });
    // Lobster boats and the whale watch boat, in and out of the channel past
    // the Point: out at dawn and home in the afternoon; the whale watch out
    // at nine and one, and home at noon and at sunset, with its running
    // lights on.
    const BOATS = [
      { trips: [[2, 32, 1], [180, 210, -1]], o: { len: 2.6, wid: 1.1, cabin: C.teal, stripe: C.coral }, crew: [folk(393, { top: C.mustard, bottom: C.mustard, hat: 'beanie' })] },
      { trips: [[14, 44, 1], [245, 275, -1]], o: { len: 2.6, wid: 1.1, cabin: C.white, color: C.butter, stripe: C.teal }, crew: [folk(395, { top: C.coral, bottom: C.navy, hat: 'cap' })] },
      { trips: [[60, 90, 1], [110, 140, -1], [145, 175, 1], [210, 240, -1]], o: { len: 4.2, wid: 1.45, cabin: C.white, color: C.navy, stripe: C.white }, crew: [folk(401, { top: C.white }), folk(403, { top: C.coral, hat: 'sun' }), folk(405, { top: C.teal }), folk(407, { top: C.mustard, hat: 'cap' })] },
    ];
    for (const b of BOATS) {
      R.mover((t) => {
        const s = wrap(t);
        for (const [a, e, d] of b.trips) {
          if (s < a || s >= e) continue;
          const k = (s - a) / (e - a);
          return { x: LANE, y: d > 0 ? -1 + 58 * k : 57 - 58 * k, d };
        }
        return { x: LANE, y: 30, d: 0 };
      }, (ctx, t, p) => {
        if (!p.d || p.y < 0.2 || p.y > 57.8) return;
        ctx.save();
        ctx.globalAlpha *= clamp(Math.min(p.y - 0.2, 57.8 - p.y) / 2.5);
        boat(ctx, p.x, p.y, t, { along: 'y', dir: p.d, ...b.o });
        const deckZ = float(p.x, p.y, t) - 0.15 + 0.04 * Math.sin(t * 1.7 + p.x) + 0.45;
        const len = b.o.len;
        b.crew.forEach((look, i) => {
          const u = b.crew.length === 1 ? -len * 0.36 : -len * 0.4 + i * 0.5;
          man(ctx, p.x + 0.12, p.y + u * p.d, deckZ + (b.crew.length > 1 ? 0.55 : 0), look, turn(t, { pose: b.crew.length > 1 && i % 2 ? 'point' : 'stand', dir: p.d > 0 ? 'l' : 'r', back: p.d < 0, scale: b.crew.length > 1 ? 0.6 : 0.85 }), t);
        });
        // Running lights after dark: red to port, green to starboard, white up top.
        if (lightsOn(t)) {
          const bow = p.y + (len / 2 - 0.2) * p.d;
          for (const [dx, color] of [[-0.3 * p.d, C.red], [0.3 * p.d, C.green]]) { const [X, Y] = P(p.x + dx, bow, deckZ + 0.1); ctx.beginPath(); ctx.arc(X, Y, 0.09, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); }
          const [X, Y] = P(p.x, p.y, deckZ + 1.4); ctx.beginPath(); ctx.arc(X, Y, 0.09, 0, Math.PI * 2); ctx.fillStyle = LIT; ctx.fill();
          glow(ctx, p.x, p.y, deckZ + 0.6, 1.4, LIT, nightK(t) * 0.6);
        }
        ctx.restore();
      }, { bias: 0.5 });
    }

    // ---------- The finds ----------
    // The goose, on the playground's swings.
    R.goose((t) => { const p = gooseSwing(t); return { x: 103.8, y: p.y, z: p.z + 0.04, pose: 'sit', dir: 'l' }; }, { bias: 1 });
    // A lobster buoy, bobbing in the river off the Point, on its own.
    const buoyX = (t) => 109.6 + Math.sin(t / 2) * 0.2;
    R.mover((t) => ({ x: buoyX(t), y: 30.5 }), (ctx, t, p) => lobsterBuoy(ctx, p.x, 30.5, float(p.x, 30.5, t), t));
    R.find({ id: 'buoy', label: 'A lobster buoy', at: (t) => [buoyX(t), 30.5, float(109.6, 30.5, t) + 0.3], r: 0.8 });
    // A lure snagged on the side of a rock near the jetty's end, low enough that
    // it's only out at low water.
    R.find({ id: 'lure', label: 'A lure on the jetty', at: LURE, r: 0.8, when: lowTide, note: 'low tide' });
    // The seal in sunglasses, on the middle rock, all day.
    const s0 = ROCKS[4];
    R.find({ id: 'seal', label: 'A seal wearing sunglasses', at: [s0.x, s0.y, s0.top + 0.4], r: 0.8 });
  },
};
