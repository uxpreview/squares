// Around Moving Day: what's drawn under the map (the backdrop) and over it
// (the sky). Under: the rest of City Point behind the row (the backs of P
// Street's triple-deckers, porches stacked three high, facing ours across
// the yards, and rooftops beyond), Dorchester Heights' white tower far off at
// the back left, where the sun goes down at 7:20, the Seaport's glass towers
// behind to the north, and the port's cranes behind Castle Island. Over: the
// rain from ten till three, the planes landing at Logan (runway 4R's
// arrivals, low over Pleasure Bay, left to right, about once a minute, their
// shadows on the water), clouds and gulls, and the ending's geese.
//
// World units (plan.js); everything a pure function of t. The far shapes are
// built once as paths and only filled each frame, in inks mixed into that
// moment's paper, so the skyline follows the day for the cost of a few fills.
import { C, Q, alpha, mix, shade, tint, rng, paint, glow } from '../../engine/art.js';
import { ZK } from '../../engine/iso.js';
import { rain } from '../../engine/weather.js';
import { reg, birds, geeseV } from '../shared.js';
import { W, D, HOUSES, HOUSE_D, ROW_X0, ROW_X1 } from './plan.js';
import { rainK, nightK, hour, SUNSET } from './clock.js';
import { paperAt, INK, SIDING, LIT, LAND } from './style.js';
import { follow } from './finale.js';

export { paperAt };
const PX = (x, y) => x - y;
const PY = (x, y, z = 0) => (x + y) / 2 - z * ZK;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ramp = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
const q = (k, n = 24) => Math.round(k * n) / n; // few mixes, so the color cache stays small
// A polygon of 3D points added to a path, always wound the same way.
function poly(p, pts) {
  const s = pts.map(([x, y, z]) => [PX(x, y), PY(x, y, z || 0)]);
  let a = 0;
  for (let i = 0, j = s.length - 1; i < s.length; j = i++) a += s[j][0] * s[i][1] - s[i][0] * s[j][1];
  if (a < 0) s.reverse();
  p.moveTo(s[0][0], s[0][1]);
  for (let i = 1; i < s.length; i++) p.lineTo(s[i][0], s[i][1]);
  p.closePath();
}
// A box's three faces you see: its east face (+x, the lighter), its south
// face (+y, the shaded) and its top.
function boxInto(east, south, top, x, y, z, w, d, h) {
  const x2 = x + w, y2 = y + d, z2 = z + h;
  poly(east, [[x2, y, z], [x2, y2, z], [x2, y2, z2], [x2, y, z2]]);
  poly(south, [[x, y2, z], [x2, y2, z], [x2, y2, z2], [x, y2, z2]]);
  poly(top, [[x, y, z2], [x2, y, z2], [x2, y2, z2], [x, y2, z2]]);
}
const inView = (fx, X0, Y0, X1, Y1) => !fx || !fx.view || (X1 > fx.view[0] && X0 < fx.view[2] && Y1 > fx.view[1] && Y0 < fx.view[3]);

// ---------- Built once ----------
const FH = 4.4, TD = FH * 3 + 0.5; // a triple-decker's floors and its height
// P Street's row: the backs of its houses face ours across the yards (their
// fronts face west, away from us), with their back porches three high.
// (Six of them, down to Day Boulevard: the city stops at the shore, as the
// map does, instead of running on out over the harbor.)
const P_ROW = { x0: -13.5, x1: -1.5 };
const P_HOUSES = Array.from({ length: 6 }, (_, i) => -2.5 + i * 10.4);
// Further west, rooftops fading into the paper a row at a time, each row
// lower than the one in front (distance, not a wall), down to the shore.
const FAR_ROWS = [-29, -44, -59];
const FAR_H = [TD - 2.5, TD - 5, TD - 7.5];
const FAR_BACK = [0.72, 0.8, 0.87]; // how far each row sits back into the paper
// Dorchester Heights: the white marble tower (1902), between
// the last two rows, so the nearer rooftops cover its foot and only the
// tower stands above them, faint. (Really 2.5 km west: compressed.)
const HEIGHTS = { x: -52, y: 22 };
// The Seaport's towers, behind to the north (x, y, w, d, h).
const SEAPORT = [[-36, -66, 7, 6, 30], [-26, -74, 6, 7, 42], [-15, -68, 8, 6, 34], [-4, -78, 7, 7, 48], [7, -70, 6, 6, 28], [16, -76, 7, 6, 38], [-44, -74, 6, 6, 24]];
// The port's container cranes behind Castle Island, booms up.
const CRANES = [58, 67, 76];

let GEO = null;
function geo() {
  if (GEO) return GEO;
  const P = () => new Path2D();
  const g = {
    pE: P(), pS: P(), pT: P(), porch: P(), porchS: P(), pWin: P(),
    far: FAR_ROWS.map(() => ({ e: P(), s: P(), t: P() })),
    towerE: P(), towerS: P(), towerT: P(), cupola: P(),
    seaE: P(), seaS: P(), seaT: P(), seaGrid: P(),
    crane: P(), craneW: P(), quayE: P(), quayS: P(), quayT: P(),
  };
  const r = rng(7);
  // P Street's backs.
  for (const y of P_HOUSES) {
    const { x0, x1 } = P_ROW;
    boxInto(g.pE, g.pS, g.pT, x0, y, 0.4, x1 - x0, 8.8, TD);
    for (let f = 0; f < 3; f++) {
      const z = 0.4 + f * FH;
      // Back porch: a deck, a rail, a post, on the north half of the back.
      boxInto(g.porch, g.porchS, g.porch, x1, y + 0.4, z + 0.5, 1.8, 4, 0.3);
      poly(g.porch, [[x1 + 1.8, y + 0.4, z + 0.8], [x1 + 1.8, y + 4.4, z + 0.8], [x1 + 1.8, y + 4.4, z + 1.6], [x1 + 1.8, y + 0.4, z + 1.6]]);
      // Windows on the back and the south side.
      for (const [u0, u1] of [[5, 6.2], [6.8, 8]]) poly(g.pWin, [[x1, y + u0, z + 1.4], [x1, y + u1, z + 1.4], [x1, y + u1, z + 3.2], [x1, y + u0, z + 3.2]]);
      for (const u of [x0 + 1.5, x0 + 5.5]) poly(g.pWin, [[u, y + 8.8, z + 1.4], [u + 1.2, y + 8.8, z + 1.4], [u + 1.2, y + 8.8, z + 3.2], [u, y + 8.8, z + 3.2]]);
    }
  }
  // Rooftops further west.
  FAR_ROWS.forEach((x, k) => {
    for (let y = -6; y < 52; y += 10.4) {
      const h = FAR_H[k] - 1 + r() * 2;
      boxInto(g.far[k].e, g.far[k].s, g.far[k].t, x, y + r() * 0.8, 0.4, 12, 8.8, h);
    }
  });
  // Dorchester Heights: the tower and its cupola, standing up out of the
  // rooftops (its hill is under them, hidden; drawn, it lay on the roofs
  // like a rug).
  // A slimmer, shorter tower than the greybox's: far off, not a landmark
  // standing over the title.
  const tx = HEIGHTS.x - 1, ty = HEIGHTS.y - 1;
  boxInto(g.towerE, g.towerS, g.towerT, tx, ty, 4, 2, 2, 11);
  boxInto(g.towerE, g.towerS, g.towerT, tx + 0.3, ty + 0.3, 15, 1.4, 1.4, 1.6);
  poly(g.cupola, [[tx + 0.3, ty + 1.7, 16.6], [tx + 1.7, ty + 1.7, 16.6], [tx + 1, ty + 1, 18.8]]);
  poly(g.cupola, [[tx + 1.7, ty + 0.3, 16.6], [tx + 1.7, ty + 1.7, 16.6], [tx + 1, ty + 1, 18.8]]);
  // The Seaport.
  for (const [x, y, w, d, h] of SEAPORT) {
    boxInto(g.seaE, g.seaS, g.seaT, x, y, 0, w, d, h);
    for (let z = 3; z < h - 1; z += 2.4) poly(g.seaGrid, [[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + 0.12], [x + w, y, z + 0.12]]);
  }
  // Cranes: two legs and a cross beam each side, a machinery house on top,
  // the boom raised and pointing north over the channel.
  // The quay they stand on: Conley Terminal's apron, a low slab along the
  // channel.
  boxInto(g.quayE, g.quayS, g.quayT, CRANES[0] - 5, -26.5, -0.8, CRANES[CRANES.length - 1] - CRANES[0] + 13, 7.5, 0.8);
  for (const x of CRANES) {
    const y = -22;
    for (const [dx, dy] of [[0, 0], [2.4, 0], [0, 2.4], [2.4, 2.4]]) boxInto(g.crane, g.crane, g.crane, x + dx, y + dy, 0, 0.3, 0.3, 10);
    boxInto(g.crane, g.crane, g.crane, x - 0.2, y - 0.2, 7.5, 3.1, 0.35, 0.5);
    boxInto(g.crane, g.crane, g.crane, x - 0.2, y + 2.25, 7.5, 3.1, 0.35, 0.5);
    boxInto(g.craneW, g.craneW, g.craneW, x + 0.2, y + 0.2, 10, 2.3, 2.3, 1.2);
    poly(g.crane, [[x + 1.1, y + 1, 10.8], [x + 1.5, y + 1, 10.8], [x + 1.5, y - 7, 14], [x + 1.1, y - 7, 14]]);
  }
  GEO = g;
  return g;
}

// ---------- The day's tones ----------
// How far the far things sit back into the paper, and their night print.
function tone(c, t, back) {
  const n = q(nightK(t));
  return mix(mix(c, C.night, n * 0.55), paperAt(t), back);
}

function sun(ctx, t) {
  const h = hour(t);
  if (h < 16.8 || h > SUNSET + 0.25) return;
  // Down behind Dorchester Heights' tower.
  const k = ramp(16.8, SUNSET + 0.2, h);
  const x = HEIGHTS.x + 4 - k * 3, y = HEIGHTS.y - 6, z = 17 - k * 16;
  const X = PX(x, y), Y = PY(x, y, z);
  ctx.save();
  ctx.fillStyle = alpha(mix(C.butter, C.coral, k), 0.85);
  ctx.beginPath(); ctx.arc(X, Y, 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function stars(ctx, t, fx) {
  const n = nightK(t);
  if (n < 0.3 || !Q.detail) return;
  const [vx0, vy0, vx1, vy1] = fx.view;
  const r = rng(99);
  ctx.save();
  ctx.fillStyle = alpha(C.butter, 0.55 * n);
  for (let i = 0; i < 60; i++) {
    const X = -120 + r() * 260, Y = -60 + r() * 60;
    if (X < vx0 || X > vx1 || Y < vy0 || Y > vy1) continue;
    const tw = 0.5 + 0.5 * Math.sin(t * 2 + i);
    ctx.globalAlpha = 0.4 + 0.6 * tw;
    ctx.fillRect(X, Y, 0.18, 0.18);
  }
  ctx.restore();
}

// ---------- Under ----------
export function backdrop(ctx, t, world, fx) {
  const g = geo(), n = nightK(t);
  ctx.save();
  ctx.lineJoin = 'round';
  stars(ctx, t, fx);
  const fill = (p, c, stroke = null, lw = 0.04) => { ctx.fillStyle = c; ctx.fill(p); if (stroke && Q.lines) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(p); } };
  // The Seaport, faint and blue, behind everything.
  if (inView(fx, -110, -120, 110, 0)) {
    const glass = tint(C.sky, 0.1);
    fill(g.seaS, tone(shade(glass, 0.2), t, 0.62));
    fill(g.seaE, tone(glass, t, 0.62));
    fill(g.seaT, tone(tint(glass, 0.3), t, 0.62));
    if (Q.detail) fill(g.seaGrid, n > 0.5 ? alpha(LIT, 0.35 * n) : tone(shade(glass, 0.3), t, 0.6));
  }
  // The cranes behind Castle Island (far back into the paper: they stand
  // on the port's quay, off the map, and mustn't read as floating).
  if (inView(fx, 20, -60, 110, 40)) {
    fill(g.quayS, tone(shade(LAND.paving, 0.25), t, 0.68));
    fill(g.quayE, tone(shade(LAND.paving, 0.12), t, 0.68));
    fill(g.quayT, tone(LAND.paving, t, 0.68));
    fill(g.crane, tone(C.coral, t, 0.68), tone(C.ink, t, 0.74), 0.04);
    fill(g.craneW, tone(C.white, t, 0.68), tone(C.ink, t, 0.74), 0.04);
    if (n > 0.3) for (const x of CRANES) glow(ctx, x + 1.3, -29, 14.2, 0.8, C.red, n * (0.6 + 0.4 * Math.sin(t * 3 + x)));
  }
  // Rooftops west of the row, fading back row by row, with Dorchester
  // Heights (and the sun going down behind it) between the last two.
  for (let k = FAR_ROWS.length - 1; k >= 0; k--) {
    const f = g.far[k], back = FAR_BACK[k];
    const c = SIDING.others[k % SIDING.others.length];
    fill(f.s, tone(shade(c, 0.2), t, back));
    fill(f.e, tone(c, t, back));
    fill(f.t, tone(C.greyLight, t, back));
    if (k === FAR_ROWS.length - 1 && inView(fx, -140, -30, -40, 60)) {
      sun(ctx, t);
      fill(g.towerS, tone(shade(C.white, 0.18), t, 0.6), tone(C.ink, t, 0.7), 0.035);
      fill(g.towerE, tone(C.white, t, 0.6), tone(C.ink, t, 0.7), 0.035);
      fill(g.towerT, tone(C.white, t, 0.6));
      fill(g.cupola, tone(C.greyLight, t, 0.6), tone(C.ink, t, 0.7), 0.035);
    }
  }
  // P Street's backs, nearest, a little fainter than the row.
  // (Back 0.42: clearly behind the row, and lighter under the title.)
  const pc = SIDING.others[0], pb = 0.42;
  fill(g.pS, tone(shade(pc, 0.22), t, pb), tone(C.ink, t, pb + 0.12), 0.035);
  fill(g.pE, tone(pc, t, pb), tone(C.ink, t, pb + 0.12), 0.035);
  fill(g.pT, tone(C.greyLight, t, pb), tone(C.ink, t, pb + 0.12), 0.035);
  fill(g.pWin, n > 0.4 ? mix(tone(tint(C.sky, 0.3), t, pb), LIT, q(n * 0.8)) : tone(tint(C.sky, 0.3), t, pb));
  fill(g.porchS, tone(shade(C.white, 0.2), t, pb));
  fill(g.porch, tone(C.white, t, pb), tone(C.ink, t, pb + 0.12), 0.03);
  ctx.restore();
  // Print marks, and the caption, in the light ink once the paper's dark.
  const [X0, X1, Y0, Y1] = world.overviewBox(false);
  const ink = n > 0.5 ? C.white : null;
  reg(ctx, (X0 + X1) / 2, Y0 + 1, ink);
  reg(ctx, (X0 + X1) / 2, Y1 - 1, ink);
  const k = 40;
  ctx.save();
  ctx.translate((X0 + X1) / 2, Y1 - 4);
  ctx.scale(1 / k, 1 / k);
  ctx.font = `${0.9 * k}px "Rethink Sans", system-ui, sans-serif`;
  ctx.fillStyle = alpha(n > 0.5 ? C.white : C.ink, 0.55);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SQUARES  ·  MOVING DAY  ·  SOUTH BOSTON, SEPTEMBER 1ST', 0, 0);
  ctx.restore();
}

// ---------- Over ----------
// The planes: on 4R's line (020°: in our units a little east for every unit
// north), over Pleasure Bay, low, coming down. One about every PLANE seconds.
// planeAt(t): where the latest one is ({ x, y, z, s }, s the units along the
// line from over the bay), or null between them. Areas read it to look up.
export const PLANE = 57;
const DIR = [0.34, -0.94];
const OVER = [63, 30]; // where the line crosses Pleasure Bay
export function planeAt(t) {
  const k = ((t % PLANE) + PLANE) % PLANE; // seconds since the last one came in
  const s = -120 + k * 16; // units along the line
  if (s > 140) return null;
  return { x: OVER[0] + DIR[0] * s, y: OVER[1] + DIR[1] * s, z: 22 - s * 0.06, s };
}
// A jet, nose along DIR, gear down, drawn in its own units (u along, v
// across, w up) and projected; a coral cheat line, the fake airline's goose
// on the tail. At night its lights. Shadow: the same shape flat on the water.
const SIDE = [-DIR[1], DIR[0]];
// (Drawn big, 1.8 times its units, so it reads as close overhead.)
const SC = 1.8;
const at3 = (p, u, v, w) => [p.x + (DIR[0] * u + SIDE[0] * v) * SC, p.y + (DIR[1] * u + SIDE[1] * v) * SC, p.z + w * SC];
function plane(ctx, t, p) {
  const n = nightK(t);
  const shapeAt = (pp, flat) => {
    const P = (u, v, w) => { const [x, y, z] = at3(pp, u, v, flat ? 0 : w); return [PX(x, y), PY(x, y, z)]; };
    const path = (pts) => { ctx.beginPath(); pts.forEach(([u, v, w], i) => { const [X, Y] = P(u, v, w); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.closePath(); };
    return { P, path };
  };
  // The shadow on the water, straight under (by day).
  if (n < 0.6) {
    const sp = { ...p, z: 0 };
    const { path } = shapeAt(sp, true);
    ctx.save();
    ctx.fillStyle = alpha(C.ink, 0.1 * (1 - n));
    path([[5.5, 0, 0], [1, 0.55, 0], [0.2, 5, 0], [-1.2, 5, 0], [-0.8, 0.6, 0], [-4.6, 0.5, 0], [-5.4, 1.8, 0], [-6, 1.8, 0], [-5.6, 0, 0], [-6, -1.8, 0], [-5.4, -1.8, 0], [-4.6, -0.5, 0], [-0.8, -0.6, 0], [-1.2, -5, 0], [0.2, -5, 0], [1, -0.55, 0]]);
    ctx.fill();
    ctx.restore();
  }
  const { P, path } = shapeAt(p, false);
  const body = n > 0.5 ? mix(C.white, C.night, 0.5) : C.white;
  const lw = { lw: 0.05 };
  // Far wing, then the fuselage, the near wing, the tail.
  path([[1, 0.4, -0.1], [0.2, 5, 0.1], [-1.2, 5, 0.1], [-0.8, 0.4, -0.1]]);
  paint(ctx, shade(body, 0.12), lw);
  path([[5.8, 0, 0.05], [5.2, 0.5, 0.4], [-4.8, 0.45, 0.35], [-6, 0.1, 0.45], [-6, -0.1, 0.45], [-4.8, -0.45, 0.35], [5.2, -0.5, 0.4]]);
  paint(ctx, body, lw);
  if (Q.detail) {
    ctx.save();
    ctx.strokeStyle = C.coral; ctx.lineWidth = 0.14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(...P(5, -0.45, 0.25)); ctx.lineTo(...P(-4.8, -0.42, 0.22)); ctx.stroke();
    ctx.restore();
  }
  path([[1, -0.4, -0.1], [0.2, -5, 0.1], [-1.2, -5, 0.1], [-0.8, -0.4, -0.1]]);
  paint(ctx, body, lw);
  // Engines under the wings, gear down.
  for (const v of [-2, 2]) { path([[1.2, v - 0.3, -0.35], [1.2, v + 0.3, -0.35], [-0.4, v + 0.3, -0.35], [-0.4, v - 0.3, -0.35]]); paint(ctx, shade(body, 0.2), { lw: 0.04 }); }
  if (Q.detail) {
    ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.08;
    for (const [u, v] of [[3.8, 0], [-0.4, 0.6], [-0.4, -0.6]]) { ctx.beginPath(); ctx.moveTo(...P(u, v, -0.1)); ctx.lineTo(...P(u, v, -0.7)); ctx.stroke(); }
    ctx.restore();
  }
  // The tail fin, and the stabilisers.
  path([[-3.8, 0, 0.45], [-5.9, 0, 0.45], [-6.3, 0, 2.4], [-5.4, 0, 2.4]]);
  paint(ctx, body, lw);
  if (Q.detail) {
    const [X, Y] = P(-5.6, 0, 1.55);
    ctx.save(); ctx.fillStyle = C.coral; ctx.beginPath(); ctx.arc(X, Y, 0.38, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  path([[-5, 0, 0.5], [-5.4, 1.8, 0.5], [-6, 1.8, 0.5], [-5.9, 0, 0.5], [-6, -1.8, 0.5], [-5.4, -1.8, 0.5]]);
  paint(ctx, shade(body, 0.08), lw);
  // After dark: the landing lights and the wingtips.
  if (n > 0.3) {
    const [x, y, z] = at3(p, 5.6, 0, -0.1);
    glow(ctx, x, y, z, 2.2, LIT, n);
    const [ax, ay, az] = at3(p, -0.9, 5, 0.1), [bx, by, bz] = at3(p, -0.9, -5, 0.1);
    const blink = Math.sin(t * 6) > 0 ? 1 : 0.3;
    glow(ctx, ax, ay, az, 0.7, C.green, n * blink);
    glow(ctx, bx, by, bz, 0.7, C.red, n * blink);
  }
}

// Clouds: a few puffy ones drifting by day (grey and lower while it rains,
// pink at sunset), kept to the open paper round the map.
const CLOUDS = [
  // x0, y, z, scale, speed, x range [a, b]
  [0, 84, 8, 2.0, 0.22, -20, 150],
  [70, 90, 7, 1.5, 0.3, -20, 150],
  [30, -30, 16, 2.2, 0.2, -60, 110],
  [90, -26, 12, 1.4, 0.26, -60, 140],
];
const PUFFS = [[1.0, 0], [1.6, -0.35], [1.3, -0.1], [0.9, 0]];
function clouds(ctx, t) {
  const n = nightK(t), r = rainK(t), h = hour(t);
  const pink = h > 17.8 && h < 20.6 ? Math.min(1, (h - 17.8) / 1, (20.6 - h) / 1) : 0;
  let c = mix(C.white, C.grey, q(r));
  c = mix(c, C.blush, q(pink * 0.8));
  c = mix(c, C.night, q(n * 0.7));
  ctx.save();
  ctx.fillStyle = alpha(c, 0.8);
  for (const [x0, y, z, s, v, a, b] of CLOUDS) {
    const span = b - a, x = a + ((((x0 - a + t * v) % span) + span) % span);
    const X = PX(x, y), Y = PY(x, y, z - r * 4);
    ctx.beginPath();
    let dx = -2.2 * s;
    for (const [pr, py] of PUFFS) { ctx.moveTo(X + dx + pr * s, Y + py * s); ctx.arc(X + dx, Y + py * s, pr * s, 0, Math.PI * 2); dx += 1.4 * s; }
    ctx.fill();
  }
  ctx.restore();
}

// Rain doesn't fall indoors: not on the houses (their roofs take it).
const HOUSE_BOXES = HOUSES.map(([, y]) => [ROW_X0, y, ROW_X1, y + HOUSE_D]);
const indoors = (x, y) => HOUSE_BOXES.some(([a, b, c, d]) => x >= a && x < c && y >= b && y < d);
// The ending, from its very first frame (every goose found; the camera's
// still flying to the Green House): finale.js's beats wait for the camera,
// but the couch changes hands now, while there's time for the street's
// picture to catch up (Farragut Road and the Couch, green-3).
let lap = 0;
export const ending = () => lap > 0;
export function sky(ctx, t, world, fx) {
  follow(fx);
  if (!fx.thumb) lap = fx.parade || 0;
  clouds(ctx, t);
  const r = rainK(t);
  if (r > 0.02) {
    const [vx0, vy0, vx1, vy1] = fx.view;
    // The view's box on the ground, roughly (iso back to x, y).
    const cx = (vx0 + vx1) / 2, cy = (vy0 + vy1) / 2 + 8, half = Math.max(vx1 - vx0, (vy1 - vy0) * 2) * 0.7;
    const X = cy + cx / 2, Y = cy - cx / 2;
    // Looking into an apartment, the rain falls past its open front, not
    // across the room: fewer drops, fainter, so the finds stay clear.
    const room = fx.focus && !fx.focus.fixed ? 0.35 : 1;
    rain(ctx, t, {
      area: [X - half, Y - half, X + half, Y + half],
      n: Math.round((Q.detail ? 260 : 160) * r * room),
      top: 16,
      speed: 24,
      color: alpha(nightK(t) > 0.5 ? C.sky : C.navy, 0.35 * (room < 1 ? 0.7 : 1)),
      skip: indoors,
    });
  }
  const p = planeAt(t);
  if (p) plane(ctx, t, p);
  if (rainK(t) < 0.3) birds(ctx, t, 0, 60, 20);
  if (fx.parade) geeseV(ctx, t, fx.parade, world.totalGeese, 60);
}
