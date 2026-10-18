// Around Departures: what's drawn under the airport (the backdrop, over the
// paper, before the areas) and over it (the sky, after everything). The paper
// is the harbor (style.js, paperAt), so the water is never painted and the
// page's marks and words print in cream.
//
// Under: Boston across the inner harbor, in its real order left to right as
// the screen shows it (logan.md, Shape): Spectacle Island far off, Castle
// Island's star fort and Conley Terminal's cranes and boxes, the Seaport's
// glass, the Financial District's towers with the Custom House's clock tower
// among them, the North End and the Old North Church, the Charles, Charlestown
// with the Bunker Hill Monument and Old Ironsides at the Navy Yard, and the
// Zakim Bridge behind. Printed in the harbor's far inks: pale by day, the
// windows lit gold after dark (the offices emptying as the night goes on),
// snow on every roof as it settles, the whole city fading into the nor'easter.
// A low sun sinks behind the towers at four. Boats on the clock: two water
// taxis to the airport's dock, a tug pushing a barge of road salt for the
// storm, a tanker heading out at midday, and in front of the runway a lobster
// boat hauling its traps and one sailboat out anyway.
//
// Over: the snow (light from 3pm, the nor'easter blowing it sideways by dusk,
// easing after eleven), gulls (scattering when bird control's cannon goes
// BANG, and following the lobster boat), far planes on approach and climbing
// out by day, and the geese's parade at the end.
//
// World units (plan.js): y < 0 is west, across the inner harbor; x < 0 is
// south, toward South Boston. Everything is a pure function of t. The far
// shapes are built once as paths and only filled each frame, in inks mixed
// into that moment's paper.
import { C, Q, alpha, mix, shade, tint, rng, hash, person, folk } from '../../engine/art.js';
import { ZK } from '../../engine/iso.js';
import { reg, birds, geeseV } from '../shared.js';
import { W, D, CENTER, LAND, AIR, FRONT, CHECK } from './plan.js';
import { LOOP, hour, at, snowK, nightK, settle, flying } from './clock.js';
import { INK, LIT, LIVERY, paperAt } from './style.js';
import { follow } from './finale.js';

// ---------- Geometry (world to page) ----------
const PX = (x, y) => x - y;
const PY = (x, y, z = 0) => (x + y) / 2 - z * ZK;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ramp = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
const qk = (k, n = 16) => Math.round(k * n) / n; // few mixes, so the color cache stays small
const mod = (v, m) => ((v % m) + m) % m;
const lerp = (a, b, k) => a + (b - a) * k;

// A polygon of 3D points added to a path, always wound the same way so
// overlapping shapes in one path fill as one.
function poly(p, pts) {
  const s = pts.map(([x, y, z]) => [PX(x, y), PY(x, y, z || 0)]);
  let a = 0;
  for (let i = 0, j = s.length - 1; i < s.length; j = i++) a += s[j][0] * s[i][1] - s[i][0] * s[j][1];
  if (a < 0) s.reverse();
  p.moveTo(s[0][0], s[0][1]);
  for (let i = 1; i < s.length; i++) p.lineTo(s[i][0], s[i][1]);
  p.closePath();
}
// A box's outline as you see it, its front (+y, the shaded face) and its top.
const hexOf = (x, y, z, w, d, h) => [[x, y + d, z], [x + w, y + d, z], [x + w, y, z], [x + w, y, z + h], [x, y, z + h], [x, y + d, z + h]];
const frontOf = (x, y, z, w, d, h) => [[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]];
const topOf = (x, y, z, w, d) => [[x, y, z], [x + w, y, z], [x + w, y + d, z], [x, y + d, z]];
// Is a page rect in view? (fx.view is the visible page, in world iso units.)
const inView = (fx, X0, Y0, X1, Y1) => !fx || !fx.view || (X1 > fx.view[0] && X0 < fx.view[2] && Y1 > fx.view[1] && Y0 < fx.view[3]);

// A soft glow at a page point, screened over what's under it.
const sprites = new Map();
function sprite(color) {
  let cv = sprites.get(color);
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const g = cv.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, alpha(color, 0.9));
    gr.addColorStop(0.3, alpha(color, 0.45));
    gr.addColorStop(0.65, alpha(color, 0.12));
    gr.addColorStop(1, alpha(color, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    sprites.set(color, cv);
  }
  return cv;
}
function glowAt(ctx, X, Y, r, color, k = 1) {
  if (!(k > 0.01)) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha *= Math.min(1, k);
  ctx.drawImage(sprite(color), X - r, Y - r, r * 2, r * 2);
  ctx.restore();
}
const glow3 = (ctx, x, y, z, r, color, k) => glowAt(ctx, PX(x, y), PY(x, y, z), r, color, k);

// ---------- The city's inks ----------
// What each building is made of (before it's printed far off): pale glass,
// darker glass, concrete, cream stone, brick, granite, white paint.
const MAT = {
  glass: tint(C.sky, 0.2),
  blue: mix(C.navy, C.sky, 0.5),
  stone: INK.concrete,
  cream: mix(INK.concrete, C.white, 0.55),
  brick: mix(C.coral, C.brown, 0.45),
  granite: C.greyLight,
  dark: mix(C.grey, C.navy, 0.35),
  white: C.white,
  grass: mix(C.leaf, INK.concrete, 0.35),
  land: mix(INK.concrete, C.grey, 0.3),
  rust: mix(C.brown, C.coral, 0.35),
};
// How far back into the paper each depth sits: the waterfront, the towers,
// the low city behind. The snow pushes everything further back.
const BACK = { near: 0.6, mid: 0.66, far: 0.74 };
const YARD = [C.coral, C.teal, C.mustard, C.navy, C.green, C.red];

// Every ink the skyline needs at t, worked out only when the moment's paper,
// dark, snow or settled snow changes.
let toneKey = '', TONES = null;
function tones(t) {
  const p = paperAt(t), n = qk(nightK(t), 8), s = qk(snowK(t), 8), w = qk(settle(t), 8);
  const key = p + n + ',' + s + ',' + w;
  if (key === toneKey) return TONES;
  toneKey = key;
  const far = (c, b) => mix(mix(c, C.night, n * 0.5), p, qk(clamp(b + s * 0.18, 0, 0.92), 32));
  const T = { paper: p, n, s, w, mat: {} };
  for (const [name, c] of Object.entries(MAT)) {
    T.mat[name] = {};
    for (const [lvl, b] of Object.entries(BACK)) {
      const top = far(tint(c, 0.12), b), snow = far(C.white, b - 0.1);
      T.mat[name][lvl] = {
        e: far(c, b),
        s: far(shade(c, 0.2), b),
        t: mix(top, snow, qk(w * 0.85, 8)),
        win: far(shade(c, name === 'glass' || name === 'blue' ? 0.3 : 0.22), b),
        off: far(shade(c, 0.55), b),
        line: far(C.ink, b + 0.08),
      };
    }
  }
  T.yard = YARD.map((c) => ({ e: far(c, 0.7), s: far(shade(c, 0.2), 0.7), t: mix(far(tint(c, 0.15), 0.7), far(C.white, 0.62), qk(w * 0.85, 8)) }));
  T.coral = far(C.coral, 0.5);
  T.ink = far(C.ink, 0.66); T.inkNear = far(C.ink, 0.55);
  // The ground the city stands on, barely off the paper, and its seawall.
  T.ground = mix(far(MAT.land, 0.86), far(C.white, 0.8), qk(w * 0.8, 8));
  T.wall = far(C.grey, 0.66);
  T.grass = mix(far(MAT.grass, 0.68), far(C.white, 0.62), qk(w * 0.85, 8));
  T.cable = n > 0.4 ? alpha(tint(C.sky, 0.4), 0.85) : far(C.white, 0.36);
  T.glints = alpha(LIT, qk(0.5 * n, 8));
  TONES = T;
  return T;
}

// ---------- The far shore, built once ----------
// A group of boxes printed as one: their outlines as you see them (filled in
// the lit side's ink), their fronts and their tops (the snow lands there),
// and their windows in two halves that light up apart. kind: 'office' (lit
// in the evening and emptying out), 'home' (lit late) or null.
function group(mat, lvl, kind = 'home') {
  const P = () => new Path2D();
  return { mat, lvl, kind, sil: P(), s: P(), t: P(), win: [P(), P()], extra: [], n: 0, key: -Infinity, box: [Infinity, Infinity, -Infinity, -Infinity], id: 0 };
}
function addBox(g, x, y, z, w, d, h, o = {}) {
  poly(g.sil, hexOf(x, y, z, w, d, h));
  poly(g.s, frontOf(x, y, z, w, d, h));
  poly(g.t, topOf(x, y, z + h, w, d));
  if (o.windows !== false) panes(g, x, y, z, w, d, h, o);
  // The page box it covers (for culling).
  const b = g.box;
  b[0] = Math.min(b[0], PX(x, y + d)); b[2] = Math.max(b[2], PX(x + w, y));
  b[1] = Math.min(b[1], PY(x, y, z + h)); b[3] = Math.max(b[3], PY(x + w, y + d, z));
  g.key = Math.max(g.key, x + w / 2 + y + d);
  g.n++;
}
// Windows on a box's two faces you see: a pane every col along and every row
// up, each in one of the group's two halves.
let paneSeed = 1;
function panes(g, x, y, z, w, d, h, o = {}) {
  const col = o.col || 0.62, row = o.row || 0.92, pw = o.pw || 0.22, ph = o.ph || 0.36;
  const z0 = z + (o.z0 ?? 0.45), z1 = z + h - (o.cap ?? 0.45);
  const seed = paneSeed++;
  let k = 0;
  for (let zz = z0; zz + ph <= z1; zz += row) {
    for (let u = x + 0.2; u + pw <= x + w - 0.15; u += col) poly(g.win[hash(seed, k++) < 0.5 ? 0 : 1], [[u, y + d, zz], [u + pw, y + d, zz], [u + pw, y + d, zz + ph], [u, y + d, zz + ph]]);
    for (let v = y + 0.2; v + pw <= y + d - 0.15; v += col) poly(g.win[hash(seed, k++) < 0.5 ? 0 : 1], [[x + w, v, zz], [x + w, v + pw, zz], [x + w, v + pw, zz + ph], [x + w, v, zz + ph]]);
  }
}

// The land each part of the city stands on: its top (a little above the
// water) and the granite faces that look at you, along the water.
function landInto(L, pts, z = 0.35) {
  poly(L.top, pts.map(([x, y]) => [x, y, z]));
  let area = 0;
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; area += a[0] * b[1] - b[0] * a[1]; }
  const sg = area > 0 ? 1 : -1;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const nx = (b[1] - a[1]) * sg, ny = -(b[0] - a[0]) * sg;
    if (nx + ny <= 0) continue;
    poly(L.side, [[a[0], a[1], 0], [b[0], b[1], 0], [b[0], b[1], z], [a[0], a[1], z]]);
  }
}

// Fort Independence on Castle Island (as Moving Day drew it, far off): five
// granite curtain walls with an arrowhead bastion at each corner.
const FORT = { c: [-23.6, 14.2], R: 2.3, z: 0.55, h: 1.15 };
function fortOutline() {
  const ang = [54, 126, 198, 270, 342].map((d) => (d * Math.PI) / 180);
  const V = ang.map((a) => [FORT.c[0] + FORT.R * Math.cos(a), FORT.c[1] + FORT.R * Math.sin(a)]);
  const dir = (a, b) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; };
  const add = (p, v, k) => [p[0] + v[0] * k, p[1] + v[1] * k];
  const out = [];
  V.forEach((v, i) => {
    const up = dir(v, V[(i + 4) % 5]), un = dir(v, V[(i + 1) % 5]);
    const np = [-up[1], up[0]], nn = [un[1], -un[0]];
    const cp = add(v, up, 0.55), cn = add(v, un, 0.55);
    out.push(cp, add(cp, np, 0.28), add(v, [Math.cos(ang[i]), Math.sin(ang[i])], 0.7), add(cn, nn, 0.28), cn);
  });
  return { out, inner: V.map(([x, y]) => [FORT.c[0] + (x - FORT.c[0]) * 0.62, FORT.c[1] + (y - FORT.c[1]) * 0.62]) };
}

// How far back the city's ground goes (y): off the top of the page, mostly.
const LAND_BACK = -44;
// The Zakim: a cable-stayed bridge over the Charles, running along x behind
// Charlestown, two inverted-Y towers and their fans of cables.
const ZAK = { y: -32.3, x0: 35, x1: 67, deck: 2.4, towers: [44.5, 57.5], top: 10.4 };
// The Bunker Hill Monument on Breed's Hill.
const HILL = { c: [70, -24.5], r: 4.2, h: 1.5 };
const OBELISK = { x: 69.6, y: -24.9, w: 0.8, h: 8.6 };
// The Custom House Tower among the Financial District's towers.
const CUSTOM = { x: 4.9, y: -20.1, base: 2.6, top: 9.8 };
// The Old North Church's steeple in the North End.
const OLDNORTH = { x: 33.2, y: -21.2 };
// Conley Terminal's cranes on the quay, booms up.
const CRANES = [0.4, 3.6, 6.8];

let GEO = null;
function geo() {
  if (GEO) return GEO;
  const P = () => new Path2D();
  const r = rng(29);
  const groups = [];
  const G = (mat, lvl, kind) => { const g = group(mat, lvl, kind); g.id = groups.length; groups.push(g); return g; };
  const one = (mat, lvl, kind, x, y, z, w, d, h, o) => { const g = G(mat, lvl, kind); addBox(g, x, y, z, w, d, h, o); return g; };
  // y given as the box's front (the side facing the water), for the rows.
  const front = (mat, lvl, kind, x, yf, w, d, h, o) => one(mat, lvl, kind, x, yf - d, 0.35, w, d, h, o);

  // The land.
  const land = { top: P(), side: P(), grass: P(), grassSide: P() };
  landInto(land, [[-17, -15.6], [-17, 9.6], [-90, 9.6], [-90, -15.6]]); // South Boston
  landInto(land, [[-90, -16.8], [-15.6, -16.8], [-15, -16], [46, -16], [49, LAND_BACK], [-90, LAND_BACK]]); // downtown and the North End
  landInto(land, [[50, -14], [88, -14], [92, LAND_BACK], [57, LAND_BACK]]); // Charlestown
  // Castle Island's mound, and Breed's Hill.
  const mound = [];
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; mound.push([FORT.c[0] + Math.cos(a) * 4.3, FORT.c[1] + Math.sin(a) * 4.7]); }
  landInto({ top: land.grass, side: land.grassSide }, mound, 0.55);
  const hill = [];
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; hill.push([HILL.c[0] + Math.cos(a) * HILL.r, HILL.c[1] + Math.sin(a) * HILL.r * 0.8]); }
  landInto({ top: land.grass, side: land.grassSide }, hill, HILL.h);

  // ----- Castle Island and Fort Independence -----
  const fort = { side: P(), sideS: P(), top: P(), lawn: P(), trees: P(), treesFront: P(), flag: P() };
  {
    const { out, inner } = fortOutline(), z0 = FORT.z, z1 = FORT.z + FORT.h;
    let area = 0;
    for (let i = 0; i < out.length; i++) { const a = out[i], b = out[(i + 1) % out.length]; area += a[0] * b[1] - b[0] * a[1]; }
    const sg = area > 0 ? 1 : -1, faces = [];
    for (let i = 0; i < out.length; i++) {
      const a = out[i], b = out[(i + 1) % out.length];
      const nx = (b[1] - a[1]) * sg, ny = -(b[0] - a[0]) * sg;
      if (nx + ny <= 0) continue;
      faces.push({ k: a[0] + a[1] + b[0] + b[1], ny: ny / Math.hypot(nx, ny), pts: [[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]] });
    }
    faces.sort((a, b) => a.k - b.k);
    for (const f of faces) poly(f.ny > 0.5 ? fort.sideS : fort.side, f.pts);
    poly(fort.top, out.map(([x, y]) => [x, y, z1]));
    poly(fort.lawn, inner.map(([x, y]) => [x, y, z1 - 0.02]));
    // Trees round the fort, and the flag.
    for (const [dx, dy] of [[-3.2, -1.5], [-2.6, 2.6], [1.2, 3.4], [2.9, 1.4], [-3.6, 0.8]]) {
      const x = FORT.c[0] + dx, y = FORT.c[1] + dy;
      const tp = dx + dy > 0 ? fort.treesFront : fort.trees;
      tp.ellipse(PX(x, y), PY(x, y, 1.05), 0.75, 0.5, 0, 0, Math.PI * 2); tp.closePath();
    }
    poly(fort.flag, [[FORT.c[0], FORT.c[1], z1 + 2.6], [FORT.c[0], FORT.c[1] + 0.9, z1 + 2.6], [FORT.c[0], FORT.c[1] + 0.9, z1 + 2.1], [FORT.c[0], FORT.c[1], z1 + 2.1]]);
  }

  // ----- Conley Terminal: the quay, the boxes, the cranes -----
  const yard = { sil: YARD.map(() => P()), s: YARD.map(() => P()), t: YARD.map(() => P()) };
  for (let y = -1.4; y < 8; y += 1.25) {
    for (let x = -29.5; x < -21.5; x += 2.75) {
      if (r() < 0.15) continue;
      const n = 1 + Math.floor(r() * 3);
      for (let j = 0; j < n; j++) {
        const c = Math.floor(r() * YARD.length), z = 0.35 + j * 0.62;
        poly(yard.sil[c], hexOf(x, y, z, 2.55, 1.0, 0.62));
        poly(yard.s[c], frontOf(x, y, z, 2.55, 1.0, 0.62));
        poly(yard.t[c], topOf(x, y, z + 0.62, 2.55, 1.0));
      }
    }
  }
  const crane = { body: P(), house: P(), boom: P() };
  for (const y of CRANES) {
    const xw = -17.6, xl = -19.8; // the waterside legs and the landside
    for (const [lx, ly] of [[xw, y], [xl, y], [xw, y + 1.4], [xl, y + 1.4]]) poly(crane.body, hexOf(lx - 0.09, ly - 0.09, 0.35, 0.18, 0.18, 6.3));
    poly(crane.body, hexOf(xl - 0.1, y - 0.1, 5.7, xw - xl + 0.2, 0.2, 0.4));
    poly(crane.body, hexOf(xl - 0.1, y + 1.3, 5.7, xw - xl + 0.2, 0.2, 0.4));
    poly(crane.body, hexOf(xl - 0.1, y - 0.1, 2.4, 0.2, 1.7, 0.3));
    poly(crane.house, hexOf(xl - 0.3, y - 0.05, 6.5, xw - xl + 0.6, 1.5, 0.9));
    // The boom raised (they're idle: the ship's not in), its stay back to
    // the house, and the girder back over the boxes.
    poly(crane.boom, [[xw - 0.1, y + 0.85, 7.0], [xw + 0.3, y + 0.85, 7.0], [xw + 2.1, y + 0.85, 12.6], [xw + 1.7, y + 0.85, 12.6]]);
    poly(crane.boom, [[xw - 0.1, y + 0.55, 7.0], [xw - 0.1, y + 0.85, 7.0], [xw + 1.7, y + 0.85, 12.6], [xw + 1.7, y + 0.55, 12.6]]);
    poly(crane.boom, [[xl, y + 0.7, 7.4], [xl + 0.2, y + 0.7, 7.4], [xw + 1.9, y + 0.7, 12.5], [xw + 1.7, y + 0.7, 12.5]]);
    poly(crane.boom, hexOf(xl - 3.2, y + 0.5, 6.9, 3.2, 0.4, 0.3));
  }

  // ----- The Seaport: glass along South Boston's waterfront -----
  // (Along x = -17, facing the airport, so x here is the box's back.)
  for (const [x, y, w, d, h, mat] of [
    [-27.8, -14.6, 2.8, 2.6, 6.4, 'stone'], [-27.4, -10.8, 2.6, 2.6, 5.2, 'glass'], [-27.2, -7.4, 2.6, 2.4, 4.2, 'cream'],
    [-24.2, -14.6, 3.0, 2.6, 10.6, 'blue'], [-20.6, -15.2, 3.0, 2.4, 6.8, 'glass'], [-23.8, -10.8, 3.0, 2.6, 6.4, 'stone'],
    [-20.4, -11.8, 3.0, 2.4, 9.0, 'glass'], [-20.2, -8.4, 2.8, 2.6, 5.4, 'cream'], [-23.6, -7.2, 2.8, 2.4, 4.2, 'glass'],
  ]) one(mat, 'mid', 'office', x, y, 0.35, w, d, h);
  // The ICA, its gallery cantilevered out over the harborwalk.
  one('stone', 'mid', 'office', -19.8, -5.0, 0.35, 1.7, 1.9, 0.9, { windows: false });
  one('blue', 'mid', 'office', -19.8, -5.3, 1.25, 3.0, 2.5, 1.0, { windows: false });

  // ----- Downtown: the low city behind, then the towers -----
  // Far rows of low buildings behind the towers, in short runs of one stuff
  // each (drawn whole, back to front, so the runs overlap the right way).
  const onHill = (x, y) => ((x - HILL.c[0]) / (HILL.r + 0.6)) ** 2 + ((y - HILL.c[1]) / (HILL.r * 0.8 + 0.6)) ** 2 < 1;
  const runs = (y0, x0, x1, lvl, mats, hs) => {
    for (let x = x0; x < x1;) {
      const g = G(mats[Math.floor(r() * mats.length)], lvl, 'home');
      for (let k = 0; k < 3 && x < x1; k++) {
        const w = 1.6 + r() * 1.4, d = 1.8 + r() * 0.8, h = hs[0] + r() * (hs[1] - hs[0]), y = y0 - d - r() * 0.6;
        if (!onHill(x + w / 2, y + d / 2)) addBox(g, x, y, 0.35, w, d, h, { col: 0.7, row: 1.0 });
        x += w + 0.25 + r() * 0.5;
      }
      x += 0.2;
    }
  };
  // South Boston behind the Seaport and the port: rows of low houses along
  // y, facing the water.
  for (const x0 of [-34]) {
    for (let y = -14.5; y < 8.5;) {
      const g = G(r() < 0.5 ? 'cream' : r() < 0.5 ? 'brick' : 'granite', 'far', 'home');
      for (let k = 0; k < 3 && y < 8.5; k++) { const d = 1.4 + r() * 0.9, w = 1.8 + r() * 0.6; addBox(g, x0 - w, y, 0.35, w, d, 1.5 + r() * 1.0, { col: 0.6, row: 0.8 }); y += d + 0.25 + r() * 0.4; }
    }
  }
  runs(-28, -36, 44, 'far', ['stone', 'cream', 'brick', 'glass'], [2.0, 4.8]);
  // Charlestown's rows behind the hill, and the Zakim behind them all.
  runs(-28.4, 55, 87, 'far', ['brick', 'stone', 'cream'], [1.4, 2.4]);
  const back = groups.length; // everything from here is sorted by depth
  { const g = G('stone', 'mid', null); g.key = -16; g.extra.push('port'); g.box = [-40, -32, -8, 0]; }

  // The Financial District, the tallest at the back. [x, y front, w, d, h, stuff]
  for (const [x, yf, w, d, h, mat] of [
    [-14.2, -23.0, 2.8, 2.8, 13.2, 'glass'], // Millennium Tower
    [-10.4, -24.2, 3.0, 3.0, 10.4, 'stone'],
    [-6.0, -25.0, 3.0, 3.0, 15.6, 'blue'], // Winthrop Center, the tallest
    [-2.2, -24.0, 2.8, 2.8, 13.6, 'glass'],
    [1.6, -24.6, 3.0, 3.0, 11.4, 'stone'],
    [5.6, -24.0, 2.6, 2.6, 12.6, 'blue'],
    [9.4, -24.4, 2.8, 2.8, 9.6, 'glass'],
    [13.0, -23.6, 2.6, 2.8, 8.4, 'cream'],
    [16.6, -24.2, 2.6, 2.6, 6.8, 'stone'],
    [20.4, -24.4, 2.4, 2.4, 5.6, 'glass'],
    // The middle row.
    [-16.8, -19.2, 3.4, 2.6, 11.0, 'stone'], // the Federal Reserve
    [-12.8, -19.4, 2.8, 2.8, 9.2, 'glass'],
    [-3.6, -19.2, 2.6, 2.4, 7.2, 'cream'],
    [-0.6, -19.6, 3.0, 3.0, 12.2, 'blue'],
    [7.6, -19.4, 2.8, 2.8, 7.8, 'cream'], // 60 State
    [11.0, -19.0, 2.6, 2.4, 5.2, 'stone'],
  ]) front(mat, 'mid', 'office', x, yf, w, d, h);
  // International Place: two round towers.
  for (const [cx, cy, rr, h] of [[-8.2, -20.8, 1.25, 11.6], [-5.6, -22.2, 1.0, 14.2]]) {
    const g = G('glass', 'mid', 'office');
    const hi = Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 0.35 + h]; });
    poly(g.sil, silRound(cx, cy, rr, 0.35, 0.35 + h));
    poly(g.s, frontRound(cx, cy, rr, 0.35, 0.35 + h));
    poly(g.t, hi);
    // Bands of windows round the half you see.
    for (let z = 0.8; z < h - 0.3; z += 0.92) {
      for (let i = 0; i < 6; i++) {
        const a = Math.PI * (-0.18 + i * 0.17), b = a + 0.1;
        poly(g.win[hash(g.id, i + z * 10) < 0.5 ? 0 : 1], [[cx + Math.cos(a) * rr * 1.01, cy + Math.sin(a) * rr * 1.01, z], [cx + Math.cos(b) * rr * 1.01, cy + Math.sin(b) * rr * 1.01, z], [cx + Math.cos(b) * rr * 1.01, cy + Math.sin(b) * rr * 1.01, z + 0.34], [cx + Math.cos(a) * rr * 1.01, cy + Math.sin(a) * rr * 1.01, z + 0.34]]);
      }
    }
    g.key = cx + cy + rr; g.box = [PX(cx - rr, cy + rr), PY(cx, cy, 0.35 + h), PX(cx + rr, cy - rr), PY(cx + rr, cy + rr)];
  }
  // The Custom House: a granite base, the tower, the clock, the pyramid.
  {
    const g = G('granite', 'mid', 'office'), { x, y, base, top } = CUSTOM;
    addBox(g, x - 1.5, y - 1.2, 0.35, 3.0, 2.6, base - 0.35, { col: 0.6 });
    addBox(g, x - 0.7, y - 0.7, base, 1.4, 1.4, top - base, { col: 0.45, row: 0.8, pw: 0.16 });
    addBox(g, x - 0.8, y - 0.8, top, 1.6, 1.6, 0.8, { windows: false });
    g.pyr = [[x - 0.8, y + 0.8, top + 0.8], [x + 0.8, y + 0.8, top + 0.8], [x + 0.8, y - 0.8, top + 0.8], [x, y, top + 2.3]];
    g.key = x + y + 1.5;
    g.extra.push('custom');
  }
  // City Hall's concrete, wider at the top, and Faneuil Hall.
  { const g = G('stone', 'mid', 'office'); addBox(g, 14.2, -21.2, 0.35, 4.0, 2.4, 1.9, { windows: false }); addBox(g, 13.9, -21.5, 2.25, 4.6, 3.0, 0.8, { col: 0.5, row: 0.5, z0: 0.2, cap: 0.2 }); }
  { const g = front('brick', 'near', 'home', 19.2, -18.4, 3.2, 1.5, 1.5, { col: 0.5 }); addBox(g, 20.55, -19.4, 1.85, 0.5, 0.5, 0.6, { windows: false }); }
  // The waterfront: Russia Wharf, Harbor Towers on the water's edge, Rowes
  // Wharf and its arch, the hotel on Long Wharf, the Aquarium, the wharves.
  for (const [x, yf, w, d, h, mat] of [
    [-14.6, -16.0, 2.8, 2.2, 3.4, 'brick'],
    [-10.8, -15.4, 2.0, 2.0, 8.0, 'stone'], [-8.1, -15.4, 2.0, 2.0, 8.6, 'stone'], // Harbor Towers
    [0.8, -16.0, 3.4, 2.4, 2.4, 'brick'],
    [4.8, -15.2, 2.6, 1.8, 1.7, 'dark'],
    [8.2, -16.0, 3.0, 2.2, 2.8, 'brick'], [12.0, -16.0, 2.6, 2.2, 2.4, 'cream'], [15.4, -16.0, 3.0, 2.0, 2.0, 'brick'],
  ]) front(mat, 'near', mat === 'stone' ? 'home' : 'office', x, yf, w, d, h, { col: 0.55, row: 0.8 });
  { const g = front('brick', 'near', 'office', -5.4, -16, 5.6, 2.4, 3.6, { col: 0.55, row: 0.8 }); g.extra.push('rowes'); }

  // ----- The North End: brick, the Old North Church, the wharves -----
  for (const [y0, x0, x1] of [[-21.4, 23.5, 43.5], [-18.4, 23.2, 43.5]]) {
    for (let x = x0; x < x1;) {
      const g = G(r() < 0.7 ? 'brick' : 'cream', 'near', 'home');
      for (let k = 0; k < 2 && x < x1; k++) {
        const w = 1.3 + r() * 1.1, d = 1.6 + r() * 0.5;
        if (Math.abs(x + w / 2 - OLDNORTH.x) < 1.6 && y0 < -20) { x += w + 0.3; continue; }
        addBox(g, x, y0 - d, 0.35, w, d, 1.5 + r() * 1.1, { col: 0.55, row: 0.75 });
        x += w + 0.2 + r() * 0.3;
      }
    }
  }
  // The waterfront: wharves and their warehouses.
  for (const [x, w, h, mat] of [[19.2, 2.4, 2.2, 'brick'], [22.2, 3.0, 2.6, 'cream'], [25.8, 2.4, 2.0, 'brick'], [29, 2.8, 2.4, 'brick'], [32.6, 2.2, 1.8, 'granite'], [35.6, 3.2, 2.2, 'brick'], [39.6, 2.6, 1.9, 'cream'], [42.8, 2.4, 2.2, 'brick']]) front(mat, 'near', 'home', x, -16, w, 1.9, h, { col: 0.55, row: 0.75 });
  { // The Old North Church: a brick tower, the white stages, the spire.
    const g = G('brick', 'near', null), { x, y } = OLDNORTH;
    addBox(g, x - 0.5, y - 0.5, 0.35, 1.0, 1.0, 4.4, { windows: false });
    g.key = x + y + 0.9; g.extra.push('steeple');
  }

  // ----- Charlestown: the Navy Yard, Old Ironsides, the monument -----
  for (const [x, w, h, mat] of [[60.2, 4.0, 2.2, 'granite'], [64.8, 3.4, 3.0, 'brick'], [68.8, 4.0, 2.4, 'granite'], [73.6, 3.0, 2.0, 'brick'], [77.4, 3.6, 2.6, 'brick'], [81.8, 3.0, 1.8, 'granite']]) front(mat, 'near', 'office', x, -14.4, w, 2.4, h, { col: 0.55, row: 0.75 });
  for (const [y0, x0, x1] of [[-20.8, 53, 65.5], [-20.8, 75, 87], [-17.6, 52, 88]]) {
    for (let x = x0; x < x1;) {
      const g = G(r() < 0.75 ? 'brick' : 'cream', 'near', 'home');
      for (let k = 0; k < 3 && x < x1; k++) { const w = 1.2 + r() * 0.8; addBox(g, x, y0 - 1.6, 0.35, w, 1.6, 1.4 + r() * 0.9, { col: 0.5, row: 0.7 }); x += w + 0.2 + r() * 0.3; }
    }
  }
  { const g = G('granite', 'near', null); g.key = OBELISK.x + OBELISK.y + 0.8; g.extra.push('obelisk'); g.box = [PX(OBELISK.x, OBELISK.y + 1), PY(OBELISK.x, OBELISK.y, 12), PX(OBELISK.x + 1, OBELISK.y), PY(OBELISK.x + 1, OBELISK.y + 1, 0)]; }
  { const g = G('granite', 'near', null); g.key = 56 - 12.4 + 0.5; g.extra.push('ironsides'); g.box = [PX(53, -12), PY(53, -13, 6), PX(59, -14), PY(59, -12, 0)]; }
  { const g = G('white', 'far', null); g.key = ZAK.x0 + ZAK.y - 40; g.extra.push('zakim'); g.box = [PX(ZAK.x0, ZAK.y + 2), PY(ZAK.x0, ZAK.y, ZAK.top + 1), PX(ZAK.x1, ZAK.y - 2), PY(ZAK.x1, ZAK.y + 2, 0)]; }

  const front0 = groups.slice(back).sort((a, b) => a.key - b.key);
  const sorted = [...groups.slice(0, back), ...front0];
  for (const g of sorted) if (!isFinite(g.box[0])) g.box = [-200, -200, 200, 200];

  // The Zakim: deck, towers, cables, built once.
  const zak = { deck: P(), deckS: P(), legs: P(), cables: P(), piers: P(), lamps: P() };
  {
    const { y, x0, x1, deck, towers, top } = ZAK;
    const dz = (x) => deck * ramp(x0, x0 + 4, x) * ramp(x1, x1 - 4, x) + 0.35;
    for (let x = x0; x < x1; x += 1) {
      const a = dz(x), b = dz(x + 1);
      poly(zak.deck, [[x, y - 0.7, a + 0.3], [x + 1, y - 0.7, b + 0.3], [x + 1, y + 0.7, b + 0.3], [x, y + 0.7, a + 0.3]]);
      poly(zak.deckS, [[x, y + 0.7, a], [x + 1, y + 0.7, b], [x + 1, y + 0.7, b + 0.3], [x, y + 0.7, a + 0.3]]);
      if (Math.round(x) % 3 === 0 && a > 0.8) poly(zak.piers, hexOf(x, y - 0.15, 0.35, 0.3, 0.3, a - 0.35));
      zak.lamps.rect(PX(x + 0.5, y + 0.7) - 0.06, PY(x + 0.5, y + 0.7, (a + b) / 2 + 0.55) - 0.06, 0.12, 0.12);
    }
    for (const tx of towers) {
      // The inverted Y: two legs splayed across the deck, joining above it,
      // one shaft to a point.
      const j = deck + 4.6;
      for (const s of [-1, 1]) poly(zak.legs, [[tx - 0.2, y + s * 1.5, 0.35], [tx + 0.2, y + s * 1.5, 0.35], [tx + 0.2, y + s * 0.1, j], [tx - 0.2, y + s * 0.1, j]]);
      poly(zak.legs, [[tx - 0.22, y, j - 0.3], [tx + 0.22, y, j - 0.3], [tx + 0.12, y, top - 0.6], [tx, y, top], [tx - 0.12, y, top - 0.6]]);
      // The fans: from the shaft down to the deck either way.
      for (let i = 0; i < 7; i++) {
        const zc = j + 0.4 + i * 0.6;
        for (const s of [-1, 1]) {
          const xd = tx + s * (1.2 + i * 0.95);
          zak.cables.moveTo(PX(tx, y), PY(tx, y, zc));
          zak.cables.lineTo(PX(xd, y), PY(xd, y, dz(xd) + 0.3));
        }
      }
    }
  }

  // Old Ironsides at Pier 1: the pier, the black hull, three masts.
  const ship = { pier: P(), hull: P(), band: P(), masts: P() };
  poly(ship.pier, hexOf(52.8, -14.2, 0, 6.4, 1.0, 0.35));
  poly(ship.hull, [[53.3, -12.4, 0], [57.5, -12.4, 0], [58.6, -12.85, 0.45], [58.4, -12.4, 0.75], [57.6, -12.0, 0.85], [53.2, -12.0, 0.85], [53.0, -12.4, 0.75]]);
  poly(ship.band, [[53.3, -12.0, 0.5], [57.6, -12.0, 0.5], [57.6, -12.0, 0.62], [53.3, -12.0, 0.62]]);
  for (const [x, h] of [[54.4, 4.6], [55.8, 5.2], [57.1, 4.4]]) {
    ship.masts.moveTo(PX(x, -12.3), PY(x, -12.3, 0.85)); ship.masts.lineTo(PX(x, -12.3), PY(x, -12.3, h));
    for (const k of [0.62, 0.8, 0.95]) { const w = 0.9 * (1.1 - k); ship.masts.moveTo(PX(x, -12.3 - w), PY(x, -12.3 - w, h * k)); ship.masts.lineTo(PX(x, -12.3 + w), PY(x, -12.3 + w, h * k)); }
  }
  // The bowsprit.
  ship.masts.moveTo(PX(58.4, -12.4), PY(58.4, -12.4, 0.8)); ship.masts.lineTo(PX(60, -12.6), PY(60, -12.6, 1.6));

  // Where the city's lights fall on the water at night: dashes along the
  // shore, under the brightest parts.
  const glints = [];
  for (let i = 0; i < 46; i++) {
    const k = r();
    if (k < 0.33) glints.push([-17 + 0.6 + r() * 1.6, -15 + r() * 22, r()]); // along South Boston
    else if (k < 0.85) glints.push([-14 + r() * 58, -15.2 + r() * 1.8, r()]); // downtown and the North End
    else glints.push([52 + r() * 34, -13.2 + r() * 1.6, r()]); // Charlestown
  }

  GEO = { land, fort, yard, crane, groups: sorted, zak, ship, glints };
  return GEO;
}
// A round tower's outline as you see it (the near half of its round, its
// sides, the top's far half), and its front (the half facing you).
function silRound(cx, cy, r, z0, z1) {
  const pts = [];
  // The near half at its foot, from the left-most point round the front to
  // the right-most; then the far half of its top, back round.
  for (let i = 0; i <= 8; i++) { const a = Math.PI * (0.75 - i * 0.125); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z0]); }
  for (let i = 0; i <= 8; i++) { const a = Math.PI * (-0.25 - i * 0.125); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z1]); }
  return pts;
}
function frontRound(cx, cy, r, z0, z1) {
  const lo = [], hi = [];
  for (let i = 0; i <= 6; i++) { const a = Math.PI * (0.75 - i * 0.0833); lo.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z0]); hi.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z1]); }
  return [...lo, ...hi.reverse()];
}

// ---------- Lights in the windows ----------
// How many windows are lit after dark: the offices empty as the evening goes
// on (everyone left early for Thanksgiving), homes stay lit late.
function litShare(kind, t) {
  const h = hour(t), hh = h < 4 ? h + 24 : h;
  if (kind === 'office') return hh < 7 ? 0.25 + 0.3 * ramp(5, 7, hh) : 0.85 - 0.55 * ramp(17, 23, hh) - 0.15 * ramp(24, 27, hh);
  return hh < 7 ? 0.25 + 0.35 * ramp(5, 7, hh) : 0.8 - 0.25 * ramp(22, 26, hh);
}

// A group of buildings, still: walls, roofs, windows (lit or not), outline,
// and its landmark's still pieces. Each group re-rolls which of its windows
// are lit every twenty seconds, a quarter of the city at a time.
function drawGroup(ctx, g, T, t, lit) {
  const M = T.mat[g.mat][g.lvl];
  ctx.fillStyle = M.e; ctx.fill(g.sil);
  ctx.fillStyle = M.s; ctx.fill(g.s);
  ctx.fillStyle = M.t; ctx.fill(g.t);
  if (Q.detail && g.kind) {
    if (lit > 0) {
      const slot = Math.floor(t / 20 + (g.id % 4) / 4), share = litShare(g.kind, Math.floor(t / 5) * 5);
      for (let i = 0; i < 2; i++) {
        ctx.fillStyle = hash(g.id * 7 + i, slot) < share ? alpha(LIT, qk(0.45 + 0.4 * lit, 8)) : M.off;
        ctx.fill(g.win[i]);
      }
    } else if (g.kind === 'office') {
      ctx.fillStyle = M.win;
      ctx.fill(g.win[0]); ctx.fill(g.win[1]);
    }
  }
  if (Q.lines) { ctx.strokeStyle = M.line; ctx.lineWidth = 0.035; ctx.stroke(g.sil); }
  for (const e of g.extra) EXTRA[e].still(ctx, g, T, t, lit, M);
}
// The landmarks' own pieces: still (painted with the rest of the shore) and
// live (drawn over it every frame: what moves, and the glows).
const none = () => {};
const EXTRA = {
  // Conley Terminal: the boxes, the cranes in front of them, red lights
  // blinking on their booms at night.
  port: {
    still(ctx, g, T) {
      const Y = GEO.yard;
      for (let c = 0; c < YARD.length; c++) {
        ctx.fillStyle = T.yard[c].e; ctx.fill(Y.sil[c]);
        ctx.fillStyle = T.yard[c].s; ctx.fill(Y.s[c]);
        ctx.fillStyle = T.yard[c].t; ctx.fill(Y.t[c]);
      }
      const Cr = GEO.crane;
      ctx.fillStyle = T.coral; ctx.fill(Cr.body); ctx.fill(Cr.boom);
      ctx.fillStyle = T.mat.white.mid.e; ctx.fill(Cr.house);
      if (Q.lines) { ctx.strokeStyle = T.ink; ctx.lineWidth = 0.03; ctx.stroke(Cr.house); }
    },
    live(ctx, g, T, t, lit) {
      if (lit) for (const y of CRANES) glow3(ctx, -15.7, y + 0.7, 12.7, 0.9, C.red, lit * (0.55 + 0.45 * Math.sin(t * 3 + y)));
    },
  },
  // The Custom House: the pyramid and finial still; the clock (telling the
  // airport's time, lit at night) live.
  custom: {
    still(ctx, g, T, t, lit, M) {
      const { x, y, top } = CUSTOM;
      const p = new Path2D(); poly(p, g.pyr.slice(0, 3).concat([g.pyr[3]]));
      const pf = new Path2D(); poly(pf, [g.pyr[0], g.pyr[1], g.pyr[3]]);
      ctx.fillStyle = M.e; ctx.fill(p); ctx.fillStyle = M.s; ctx.fill(pf);
      if (Q.lines) { ctx.strokeStyle = M.line; ctx.lineWidth = 0.035; ctx.stroke(p); }
      ctx.beginPath(); ctx.moveTo(PX(x, y), PY(x, y, top + 2.3)); ctx.lineTo(PX(x, y), PY(x, y, top + 2.9));
      ctx.strokeStyle = M.line; ctx.lineWidth = 0.06; ctx.stroke();
    },
    live(ctx, g, T, t, lit) {
      const { x, y, top } = CUSTOM, M = T.mat[g.mat][g.lvl];
      const h = hour(t), hands = [[((h % 12) / 12) * Math.PI * 2, 0.15], [(h % 1) * Math.PI * 2, 0.24]];
      for (const [cx, cy, along] of [[x, y + 0.81, 1], [x + 0.81, y, -1]]) {
        ctx.save();
        ctx.transform(along, 0.5, 0, -ZK, PX(cx, cy), PY(cx, cy, top + 0.4));
        ctx.beginPath(); ctx.arc(0, 0, 0.3, 0, Math.PI * 2);
        ctx.fillStyle = lit > 0.3 ? alpha(LIT, 0.9) : T.mat.white.mid.e; ctx.fill();
        if (Q.lines) { ctx.strokeStyle = M.line; ctx.lineWidth = 0.03; ctx.stroke(); }
        if (Q.detail) {
          ctx.beginPath();
          for (const [a, r] of hands) { ctx.moveTo(0, 0); ctx.lineTo(Math.sin(a) * r * along, Math.cos(a) * r); }
          ctx.strokeStyle = M.line; ctx.lineWidth = 0.035; ctx.stroke();
        }
        ctx.restore();
      }
      if (lit > 0.3) glow3(ctx, x, y, top + 0.4, 1.6, LIT, lit * 0.6);
    },
  },
  // Rowes Wharf: the great arch through the middle (lit at night), and the
  // rotunda's dome over it.
  rowes: {
    still(ctx, g, T, t, lit, M) {
      const x = -2.5, y = -16;
      ctx.beginPath();
      ctx.moveTo(PX(x - 0.75, y), PY(x - 0.75, y, 0.35));
      ctx.lineTo(PX(x - 0.75, y), PY(x - 0.75, y, 1.9));
      for (let i = 0; i <= 8; i++) { const a = Math.PI * (1 - i / 8); const u = x + Math.cos(a) * 0.75; ctx.lineTo(PX(u, y), PY(u, y, 1.9 + Math.sin(a) * 0.75)); }
      ctx.lineTo(PX(x + 0.75, y), PY(x + 0.75, y, 0.35));
      ctx.closePath();
      ctx.fillStyle = lit > 0.3 ? alpha(LIT, 0.55) : M.off; ctx.fill();
      const dx = x + 0.2, dy = y - 1.2, z = 3.95;
      ctx.beginPath(); ctx.ellipse(PX(dx, dy), PY(dx, dy, z), 0.8, 0.8 * ZK, 0, Math.PI, 0); ctx.closePath();
      ctx.fillStyle = T.mat.white.near.e; ctx.fill();
      if (Q.lines) { ctx.strokeStyle = M.line; ctx.lineWidth = 0.035; ctx.stroke(); }
    },
    live: none,
  },
  // The Old North Church: two white stages and the spire; at night two
  // lanterns in it (one if by land, two if by sea).
  steeple: {
    still(ctx, g, T, t, lit) {
      const { x, y } = OLDNORTH, Wm = T.mat.white.near;
      const p = new Path2D(), s = new Path2D(), tp = new Path2D();
      for (const [w, z, h] of [[0.84, 4.75, 1.1], [0.62, 5.85, 0.8]]) { poly(p, hexOf(x - w / 2, y - w / 2, z, w, w, h)); poly(s, frontOf(x - w / 2, y - w / 2, z, w, w, h)); poly(tp, topOf(x - w / 2, y - w / 2, z + h, w, w)); }
      const b = 0.26, zb = 6.65, zt = 9.4;
      poly(p, [[x - b, y + b, zb], [x + b, y + b, zb], [x + b, y - b, zb], [x, y, zt]]);
      poly(s, [[x - b, y + b, zb], [x + b, y + b, zb], [x, y, zt]]);
      ctx.fillStyle = Wm.e; ctx.fill(p); ctx.fillStyle = Wm.s; ctx.fill(s); ctx.fillStyle = Wm.t; ctx.fill(tp);
      if (Q.lines) { ctx.strokeStyle = Wm.line; ctx.lineWidth = 0.03; ctx.stroke(p); }
      if (lit > 0.3) for (const dx of [-0.17, 0.17]) { const X = PX(x + dx, y + 0.43), Y = PY(x + dx, y + 0.43, 5.25); ctx.fillStyle = LIT; ctx.fillRect(X - 0.07, Y - 0.12, 0.14, 0.22); }
    },
    live(ctx, g, T, t, lit) {
      if (lit > 0.3) for (const dx of [-0.17, 0.17]) glow3(ctx, OLDNORTH.x + dx, OLDNORTH.y + 0.43, 5.25, 0.9, LIT, lit * 0.8);
    },
  },
  // The Bunker Hill Monument, floodlit at night.
  obelisk: {
    still(ctx, g, T) {
      const { x, y, w, h } = OBELISK, z = HILL.h, Gm = T.mat.granite.near;
      const p = new Path2D(), s = new Path2D();
      const k = 0.18; // it narrows going up
      const lo = [[x, y + w, z], [x + w, y + w, z], [x + w, y, z]], hi = [[x + k, y + w - k, z + h], [x + w - k, y + w - k, z + h], [x + w - k, y + k, z + h]];
      poly(p, [lo[0], lo[1], lo[2], hi[2], [x + w / 2, y + w / 2, z + h + 0.7], hi[0]]);
      poly(s, [lo[0], lo[1], hi[1], hi[0]]);
      ctx.fillStyle = Gm.e; ctx.fill(p); ctx.fillStyle = Gm.s; ctx.fill(s);
      if (Q.lines) { ctx.strokeStyle = Gm.line; ctx.lineWidth = 0.035; ctx.stroke(p); }
    },
    live(ctx, g, T, t, lit) {
      const { x, y, w, h } = OBELISK;
      if (lit > 0.3) glow3(ctx, x + w / 2, y + w / 2, HILL.h + h * 0.5, 3.2, C.white, lit * 0.3);
    },
  },
  // Old Ironsides at the Navy Yard: riding lights on her masts at night.
  ironsides: {
    still(ctx, g, T) {
      const S = GEO.ship, Gm = T.mat.granite.near;
      ctx.fillStyle = Gm.s; ctx.fill(S.pier);
      ctx.fillStyle = T.inkNear; ctx.fill(S.hull);
      ctx.fillStyle = T.mat.white.near.e; ctx.fill(S.band);
      ctx.strokeStyle = T.inkNear; ctx.lineWidth = 0.06; ctx.stroke(S.masts);
    },
    live(ctx, g, T, t, lit) {
      if (lit > 0.3 && Q.detail) for (const [mx, h] of [[54.4, 4.6], [55.8, 5.2], [57.1, 4.4]]) glow3(ctx, mx, -12.3, h, 0.5, LIT, lit * 0.7);
    },
  },
  // The Zakim: lit blue at night, towers and all, a line of lamps along it.
  zakim: {
    still(ctx, g, T, t, lit) {
      const Z = GEO.zak, Wm = T.mat.white.far, Sm = T.mat.stone.far;
      ctx.fillStyle = Sm.s; ctx.fill(Z.piers);
      ctx.lineWidth = 0.035; ctx.strokeStyle = T.cable; ctx.stroke(Z.cables);
      ctx.fillStyle = Sm.e; ctx.fill(Z.deck); ctx.fillStyle = Sm.s; ctx.fill(Z.deckS);
      ctx.fillStyle = Wm.e; ctx.fill(Z.legs);
      if (Q.lines) { ctx.strokeStyle = Wm.line; ctx.lineWidth = 0.03; ctx.stroke(Z.legs); }
      if (lit > 0.3) { ctx.fillStyle = alpha(LIT, 0.8); ctx.fill(Z.lamps); }
    },
    live(ctx, g, T, t, lit) {
      if (lit > 0.3) for (const tx of ZAK.towers) glow3(ctx, tx, ZAK.y, ZAK.top - 3, 3.2, C.sky, lit * 0.55);
    },
  },
};

// ---------- Under: the far shore ----------
// Its still part: the land, Castle Island and the fort, and the city back
// to front with all its windows.
function shoreStill(ctx, t, fx, T, lit) {
  const g = geo(), Gr = T.mat.grass.mid;
  ctx.fillStyle = T.ground; ctx.fill(g.land.top);
  ctx.fillStyle = T.wall; ctx.fill(g.land.side);
  ctx.fillStyle = T.grass; ctx.fill(g.land.grass);
  ctx.fillStyle = T.wall; ctx.fill(g.land.grassSide);
  if (inView(fx, -46, -20, -20, 6)) {
    const F = g.fort, Gm = T.mat.granite.mid;
    ctx.fillStyle = T.mat.grass.mid.e; ctx.fill(F.trees);
    ctx.fillStyle = Gm.e; ctx.fill(F.side); ctx.fillStyle = Gm.s; ctx.fill(F.sideS);
    ctx.fillStyle = Gm.t; ctx.fill(F.top);
    ctx.fillStyle = Gr.t; ctx.fill(F.lawn);
    if (Q.lines) { ctx.strokeStyle = Gm.line; ctx.lineWidth = 0.035; ctx.stroke(F.top); }
    ctx.fillStyle = T.mat.grass.mid.e; ctx.fill(F.treesFront);
    const fx0 = FORT.c[0], fy0 = FORT.c[1], z1 = FORT.z + FORT.h;
    ctx.beginPath(); ctx.moveTo(PX(fx0, fy0), PY(fx0, fy0, z1)); ctx.lineTo(PX(fx0, fy0), PY(fx0, fy0, z1 + 2.7));
    ctx.strokeStyle = Gm.line; ctx.lineWidth = 0.05; ctx.stroke();
  }
  for (const gr of g.groups) {
    const b = gr.box;
    if (inView(fx, b[0], b[1], b[2], b[3])) drawGroup(ctx, gr, T, t, lit);
  }
}

// The still part only changes when its inks step with the day, its windows
// re-roll (every five seconds) or the snow settles, so it's painted into a
// picture of its own at the camera's scale, with a margin round the view,
// and stamped every frame. It's painted again when any of that changes, the
// zoom changes, or a pan runs past the margin. (A thumbnail draws it
// straight.)
const SHORE_BOX = [-100, -80, 130, 46]; // the far shore's page box, iso units
let shot = null; // { cv, key, box }
const clip = (a, b) => { const r = [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])]; return r[2] > r[0] && r[3] > r[1] ? r : null; };
function farShore(ctx, t, fx, T) {
  const n = nightK(t), lit = n > 0.3 ? qk(n, 8) : 0;
  const m = ctx.getTransform(), k = m.a, view = fx && fx.view;
  const direct = () => { shoreStill(ctx, t, fx, T, lit); shoreLive(ctx, t, fx, T, lit); };
  if (!view || fx.thumb || Math.abs(m.b) > 1e-6 || Math.abs(m.d - k) > 1e-6 || k < 0.5) return direct();
  const need = clip(SHORE_BOX, view);
  if (need) {
    const key = toneKey + '|' + Math.floor(t / 5) + '|' + lit + '|' + Q.detail + Q.lines + '|' + k.toFixed(5);
    const inside = shot && shot.key === key && need[0] >= shot.box[0] && need[1] >= shot.box[1] && need[2] <= shot.box[2] && need[3] <= shot.box[3];
    if (!inside) {
      const w = view[2] - view[0], h = view[3] - view[1];
      let box = clip(SHORE_BOX, [view[0] - w * 0.5, view[1] - h * 0.5, view[2] + w * 0.5, view[3] + h * 0.5]);
      // Whole device pixels, so the picture stamps back sharp.
      box = [Math.floor(box[0] * k) / k, Math.floor(box[1] * k) / k, Math.ceil(box[2] * k) / k, Math.ceil(box[3] * k) / k];
      const W = Math.round((box[2] - box[0]) * k), H = Math.round((box[3] - box[1]) * k);
      if (W * H > 24e6 || W < 1 || H < 1) return direct();
      const cv = (shot && shot.cv) || document.createElement('canvas');
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      const g = cv.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, W, H);
      g.setTransform(k, 0, 0, k, -box[0] * k, -box[1] * k);
      g.lineJoin = 'round';
      shoreStill(g, t, { view: box }, T, lit);
      shot = { cv, key, box };
    }
    ctx.drawImage(shot.cv, shot.box[0], shot.box[1], shot.cv.width / k, shot.cv.height / k);
  }
  shoreLive(ctx, t, fx, T, lit);
}
// Its live part, over the still one: the fort's flag, the landmarks' lights
// and clock, and the city's lights on the water.
function shoreLive(ctx, t, fx, T, lit) {
  const g = geo();
  if (inView(fx, -46, -20, -20, 6)) {
    // The flag, flying harder as the wind gets up.
    const wave = Math.sin(t * (2 + 4 * snowK(t))) * 0.12;
    ctx.save(); ctx.translate(0, wave);
    ctx.fillStyle = T.coral; ctx.fill(g.fort.flag);
    ctx.restore();
  }
  for (const gr of g.groups) {
    if (!gr.extra.length) continue;
    const b = gr.box;
    if (inView(fx, b[0], b[1], b[2], b[3])) for (const e of gr.extra) EXTRA[e].live(ctx, gr, T, t, lit);
  }
  // The city's lights on the water.
  if (lit && Q.detail) {
    ctx.beginPath();
    for (const [x, y, k] of g.glints) {
      const X = PX(x, y) + Math.sin(t * 1.3 + k * 20) * 0.25, Y = PY(x, y) + 0.5 + k * 0.6, w = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t * 2.1 + k * 31));
      ctx.moveTo(X - w, Y); ctx.lineTo(X + w, Y);
    }
    ctx.strokeStyle = T.glints; ctx.lineWidth = 0.12; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineCap = 'butt';
  }
}

// The sun going down behind the towers at sunset (4:15pm), pale through the
// snow: drawn before the city, so it sinks behind it.
function sun(ctx, t) {
  const h = hour(t);
  if (h < 15.2 || h > 16.5) return;
  // Down behind the towers, onto the city's far edge (y = LAND_BACK).
  const k = ramp(15.2, 16.4, h);
  const X = 30 - k * 3, Y = -46 + k * 22, R = 3.4;
  const a = (1 - 0.5 * snowK(t)) * ramp(15.2, 15.5, h);
  ctx.save();
  // Only the sky over the city's far edge: it never shows below the shore.
  ctx.beginPath(); ctx.moveTo(X - 30, (X - 30) / 2 + LAND_BACK); ctx.lineTo(X + 30, (X + 30) / 2 + LAND_BACK); ctx.lineTo(X + 30, Y - 40); ctx.lineTo(X - 30, Y - 40); ctx.closePath(); ctx.clip();
  glowAt(ctx, X, Y, 18, mix(C.butter, C.coral, qk(k, 8)), a * 0.6);
  ctx.globalAlpha *= a * 0.85;
  ctx.beginPath(); ctx.arc(X, Y, R, 0, Math.PI * 2);
  ctx.fillStyle = mix(C.butter, C.coral, qk(0.2 + 0.6 * k, 8)); ctx.fill();
  // Stripes cut across its lower half, the paper showing through.
  ctx.fillStyle = paperAt(t);
  for (const [dy, th] of [[0.6, 0.16], [1.3, 0.24], [1.95, 0.32], [2.55, 0.4]]) {
    const c = Math.sqrt(Math.max(0, R * R - dy * dy)) + 0.05;
    ctx.fillRect(X - c, Y + dy, c * 2, th);
  }
  ctx.restore();
}

// A few stars in the small hours, once the snow has gone.
function stars(ctx, t, fx) {
  const n = nightK(t), s = snowK(t), k = n * (1 - ramp(0, 0.1, s));
  if (k < 0.2 || !Q.detail || !fx || !fx.view) return;
  const [vx0, vy0, vx1, vy1] = fx.view;
  const r = rng(99);
  ctx.save();
  for (let i = 0; i < 70; i++) {
    const X = -80 + r() * 200, Y = -60 + r() * 45, ph = r() * 9;
    if (Y > X / 2 - 22 || Y > -X / 2 - 22) continue; // only above the city and the islands
    if (X < vx0 || X > vx1 || Y < vy0 || Y > vy1) continue;
    ctx.fillStyle = alpha(i % 9 ? C.white : C.butter, qk(k * (0.35 + 0.4 * (0.5 + 0.5 * Math.sin(t * 2 + ph))), 8));
    ctx.fillRect(X, Y, 0.16, 0.16);
  }
  ctx.restore();
}

// ---------- Boats ----------
// Each boat is drawn in its own frame: u along it (toward its bow), v
// across, h up, at (x, y) heading a (an angle in the map's x, y). Headings
// are rounded to a few dozen, so the inks stay few.
const STEP = (Math.PI * 2) / 96;
function boatFrame(x, y, a, z = 0) {
  const q = Math.round(a / STEP) * STEP, c = Math.cos(q), s = Math.sin(q);
  return { F: (u, v, h) => [x + u * c - v * s, y + u * s + v * c, z + h], c, s };
}
// A prism on a boat: its outline (convex, [u, v]) from h0 to h1. The sides
// that face you, shaded the more they face the front, then the top.
function prism(ctx, F, pts, h0, h1, col, ink, o = {}) {
  const lo = pts.map(([u, v]) => F(u, v, h0)), hi = pts.map(([u, v]) => F(u, v, h1));
  let area = 0;
  for (let i = 0; i < lo.length; i++) { const a = lo[i], b = lo[(i + 1) % lo.length]; area += a[0] * b[1] - b[0] * a[1]; }
  const sg = area > 0 ? 1 : -1;
  ctx.lineWidth = o.lw || 0.04;
  ctx.strokeStyle = ink(C.ink);
  ctx.lineJoin = 'round';
  for (let i = 0; i < lo.length; i++) {
    const j = (i + 1) % lo.length, a = lo[i], b = lo[j];
    const nx = (b[1] - a[1]) * sg, ny = -(b[0] - a[0]) * sg;
    if (nx + ny <= 1e-6) continue;
    const k = Math.round((0.04 + 0.18 * (ny / Math.hypot(nx, ny))) * 20) / 20;
    ctx.beginPath(); pathPts(ctx, [a, b, hi[j], hi[i]]);
    ctx.fillStyle = ink(shade(o.side || col, Math.max(0, k))); ctx.fill();
    if (Q.lines) ctx.stroke();
  }
  if (o.top !== false) {
    ctx.beginPath(); pathPts(ctx, hi);
    ctx.fillStyle = ink(o.top || col); ctx.fill();
    if (Q.lines) ctx.stroke();
  }
}
function pathPts(ctx, pts) {
  pts.forEach(([x, y, z], i) => (i ? ctx.lineTo(PX(x, y), PY(x, y, z)) : ctx.moveTo(PX(x, y), PY(x, y, z))));
  ctx.closePath();
}
// A hull's outline: a square stern, straight sides, a pointed bow.
const hullPts = (L, B, bow = 0.3) => [[-L / 2, -B / 2], [L / 2 - L * bow, -B / 2], [L / 2, 0], [L / 2 - L * bow, B / 2], [-L / 2, B / 2]];
const rectPts = (u0, u1, v0, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];

// The inks a boat is printed in: a little way into the paper (the inner
// harbor) or full strength (in front of the runway), dusk inks at night.
function boatInk(t, back) {
  const p = paperAt(t), n = qk(nightK(t), 8), s = qk(snowK(t) * 0.15, 8), b = qk(back + s, 16);
  return (c) => mix(mix(c, C.night, n * 0.42), p, b);
}
// The wake behind a moving boat and a curl at its bow, on the water: each
// arm of the V a run of short, wobbling wavelets that fade as they spread
// (one straight line an arm read as stiff white spokes).
function wake(ctx, F, L, B, k, t, back) {
  if (!Q.detail || k <= 0.05) return;
  const A = 0.55 * (1 - back);
  const seg = (a, b, al, w) => {
    ctx.beginPath(); ctx.moveTo(PX(a[0], a[1]), PY(a[0], a[1])); ctx.lineTo(PX(b[0], b[1]), PY(b[0], b[1]));
    ctx.strokeStyle = alpha(C.white, al); ctx.lineWidth = w; ctx.stroke();
  };
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    // The V, in five wavelets from the stern outward.
    for (let i = 0; i < 5; i++) {
      const u0 = i / 5, u1 = u0 + 0.13, wob = Math.sin(t * 3 + i * 1.7) * 0.06;
      const at = (u) => F(-L / 2 - 2.8 * k * u, s * (B * 0.4 + 1.2 * k * u) + wob, 0);
      seg(at(u0), at(u1), A * (1 - u0 * 0.8), 0.08 - i * 0.008);
    }
    // The bow's curl, short.
    seg(F(L / 2 - 0.15, s * 0.22, 0), F(L / 2 - 0.7, s * (B * 0.5 + 0.18), 0), A * 0.8, 0.07);
  }
  // Foam in the boat's track, broken.
  for (let i = 0; i < 3; i++) {
    const u = (i + ((t * 1.3) % 1)) / 3, x = -L / 2 - 0.3 - 1.8 * k * u;
    seg(F(x, Math.sin(t * 3 + i) * 0.1, 0), F(x - 0.35 * k, Math.sin(t * 3 + i + 0.6) * 0.1, 0), A * (1 - u * 0.7), 0.09);
  }
  ctx.lineCap = 'butt';
}
// Running lights after dark: red to port, green to starboard, white up top.
function runLights(ctx, F, L, B, h, n) {
  if (n < 0.3) return;
  const pairs = [[F(L * 0.2, -B / 2, h), C.red], [F(L * 0.2, B / 2, h), C.green], [F(-L * 0.1, 0, h + 0.9), C.white]];
  for (const [[x, y, z], c] of pairs) glow3(ctx, x, y, z, 0.7, c, n * 0.9);
}

// Going back and forth between two points: travel, wait, travel back, wait.
// Turns round while it waits. Returns { x, y, a, k } (k: how fast, 0..1).
function shuttle(t, A, B, speed, waitA, waitB, phase = 0) {
  const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy), go = L / speed;
  const T = go * 2 + waitA + waitB, s = mod(t + phase, T);
  const out = Math.atan2(dy, dx), home = out + Math.PI;
  const ease = (k) => k * k * (3 - 2 * k);
  if (s < go) { const k = ease(s / go); return { x: A[0] + dx * k, y: A[1] + dy * k, a: out, k: Math.sin(Math.PI * s / go) }; }
  if (s < go + waitB) { const k = ease((s - go) / waitB); return { x: B[0], y: B[1], a: out + Math.PI * k, k: 0 }; }
  if (s < go * 2 + waitB) { const u = s - go - waitB, k = ease(u / go); return { x: B[0] - dx * k, y: B[1] - dy * k, a: home, k: Math.sin(Math.PI * u / go) }; }
  const k = ease((s - go * 2 - waitB) / waitA);
  return { x: A[0], y: A[1], a: home + Math.PI * k, k: 0 };
}
// Along a path (a list of points) at a speed from a start time; null before
// it starts and after it ends. The heading looks a little ahead, so corners
// turn smoothly.
function along(t, pts, speed, t0) {
  const segs = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(l); total += l; }
  const s = (t - t0) * speed;
  if (s < 0 || s > total) return null;
  const pos = (d) => {
    d = clamp(d, 0, total);
    for (let i = 0; i < segs.length; i++) {
      if (d <= segs[i] || i === segs.length - 1) { const k = segs[i] ? d / segs[i] : 0; return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)]; }
      d -= segs[i];
    }
    return pts[pts.length - 1];
  };
  const [x, y] = pos(s), [ax, ay] = pos(s - 1.5), [bx, by] = pos(s + 1.5);
  return { x, y, a: Math.atan2(by - ay, bx - ax), k: 1 };
}

const bob = (t, x) => Math.sin(t * 1.6 + x * 0.7) * 0.04;

// The water taxis: yellow, from Rowes Wharf and from the Seaport to the
// airport's dock. They pull up outside it (the Curb's boat has the berth)
// and head back. Till one in the morning.
const TAXI_A = [[-2.5, -15.0], [4.6, -1.7]];
const TAXI_B = [[-15.8, -9.2], [7.0, -2.6]];
function taxiAt(t, i) {
  const h = hour(t);
  if (h >= 1 && h < 5) return null;
  return i === 0 ? shuttle(t, TAXI_A[0], TAXI_A[1], 0.75, 8, 7, 0) : shuttle(t, TAXI_B[0], TAXI_B[1], 0.9, 9, 6, 23);
}
function waterTaxi(ctx, t, p, ink, n) {
  const { F } = boatFrame(p.x, p.y, p.a, bob(t, p.x));
  wake(ctx, F, 3, 1.15, p.k, t, 0.15);
  prism(ctx, F, hullPts(3, 1.15, 0.28), 0, 0.42, INK.signal, ink, { top: C.white, side: INK.signal });
  prism(ctx, F, rectPts(-0.7, 0.55, -0.42, 0.42), 0.42, 1.08, C.white, ink, { top: INK.signal });
  // A band of windows round the cabin.
  const band = [F(0.55, 0.43, 0.68), F(-0.7, 0.43, 0.68), F(-0.7, 0.43, 0.92), F(0.55, 0.43, 0.92)];
  ctx.beginPath(); pathPts(ctx, band); ctx.fillStyle = n > 0.3 ? alpha(LIT, 0.85) : ink(C.navy); ctx.fill();
  runLights(ctx, F, 3, 1.15, 0.5, n);
}

// The tug and its barge of road salt, from the Charlestown side to Conley
// and back, once a day: the tug pushes from behind.
const TUG = [[-7, -10.6], [77, -9.4]];
function tugAt(t) { return shuttle(t, TUG[0], TUG[1], 0.52, 12, 12, 140); }
function tugAndBarge(ctx, t, p, ink, n) {
  const { F } = boatFrame(p.x, p.y, p.a, bob(t, p.x) * 0.5);
  const bargeAt = (u, v, h) => F(u + 2.2, v, h);
  // Draw the far one first: the barge is ahead, the tug behind.
  const order = [[barge, F(2.2, 0, 0)], [tug, F(-2.2, 0, 0)]].sort((a, b) => a[1][0] + a[1][1] - b[1][0] - b[1][1]);
  wake(ctx, F, 7.8, 2.4, p.k, t, 0.2);
  for (const [fn] of order) fn();
  function barge() {
    prism(ctx, bargeAt, rectPts(-3.6, 3.6, -1.25, 1.25), 0, 0.42, MAT.rust, ink, { top: shade(MAT.rust, 0.1) });
    // The salt: a long white heap.
    const ridge = [[-3, 0, 1.25], [3, 0, 1.25]].map(([u, v, h]) => bargeAt(u, v, h + 0.42));
    for (const s of [-1, 1]) {
      const pts = [bargeAt(-3.3, s * 1.0, 0.42), bargeAt(3.3, s * 1.0, 0.42), ridge[1], ridge[0]];
      const nrm = bargeAt(0, s, 0), c0 = bargeAt(0, 0, 0);
      if ((nrm[0] - c0[0]) + (nrm[1] - c0[1]) <= 0) continue;
      ctx.beginPath(); pathPts(ctx, pts); ctx.fillStyle = ink(mix(C.white, C.greyLight, s > 0 ? 0.5 : 0.1)); ctx.fill();
      if (Q.lines) { ctx.strokeStyle = ink(C.ink); ctx.lineWidth = 0.035; ctx.stroke(); }
    }
    for (const u of [-1, 1]) {
      const nrm = bargeAt(u, 0, 0), c0 = bargeAt(0, 0, 0);
      if ((nrm[0] - c0[0]) + (nrm[1] - c0[1]) <= 0) continue;
      ctx.beginPath(); pathPts(ctx, [bargeAt(u * 3.3, -1.0, 0.42), bargeAt(u * 3.3, 1.0, 0.42), ridge[u > 0 ? 1 : 0]]);
      ctx.fillStyle = ink(C.greyLight); ctx.fill();
      if (Q.lines) ctx.stroke();
    }
  }
  function tug() {
    const tugAt = (u, v, h) => F(u - 2.3, v, h);
    prism(ctx, tugAt, hullPts(2.4, 1.15, 0.35), 0, 0.5, C.red, ink, { top: shade(C.red, 0.2) });
    prism(ctx, tugAt, rectPts(-0.6, 0.35, -0.38, 0.38), 0.5, 1.5, C.white, ink, { top: C.ink });
    const band = [tugAt(0.36, 0.38, 1.1), tugAt(0.36, -0.38, 1.1), tugAt(0.36, -0.38, 1.35), tugAt(0.36, 0.38, 1.35)];
    ctx.beginPath(); pathPts(ctx, band); ctx.fillStyle = n > 0.3 ? alpha(LIT, 0.85) : ink(C.navy); ctx.fill();
    prism(ctx, tugAt, rectPts(-0.85, -0.6, -0.15, 0.15), 1.2, 1.95, C.ink, ink, { top: C.red });
    runLights(ctx, tugAt, 2.4, 1.15, 1.6, n);
  }
}

// The tanker heading out at midday: down from the Mystic past Charlestown,
// along the airport's back, round the corner by the dock and out the
// channel past Castle Island to sea.
const TANKER_PATH = [[118, -7.2], [-4, -7.2], [-8.5, -4.5], [-10, 2], [-10, 80]];
const TANKER_T0 = at(9.6);
function tankerAt(t) { return along(t, TANKER_PATH, 1.9, TANKER_T0); }
function tanker(ctx, t, p, ink, n) {
  const { F } = boatFrame(p.x, p.y, p.a, bob(t, p.x) * 0.3);
  const L = 13.5, B = 2.5;
  wake(ctx, F, L, B, 1, t, 0.2);
  prism(ctx, F, hullPts(L, B, 0.14), 0, 0.3, C.red, ink, { top: false });
  prism(ctx, F, hullPts(L, B, 0.14), 0.3, 1.1, C.ink, ink, { top: mix(C.green, C.grey, 0.5) });
  // Things on deck, back to front: the pipe run, the bridge and the funnel.
  const parts = [
    { u: 1.5, d: () => prism(ctx, F, rectPts(-3.5, 5.2, -0.14, 0.14), 1.1, 1.4, C.grey, ink) },
    { u: 5.6, d: () => prism(ctx, F, rectPts(5.2, 6.6, -0.9, 0.9), 1.1, 1.55, C.ink, ink, { top: mix(C.green, C.grey, 0.5) }) },
    { u: -5.2, d: () => {
      prism(ctx, F, rectPts(-6.6, -4.4, -1.05, 1.05), 1.1, 3.2, C.white, ink);
      prism(ctx, F, rectPts(-4.75, -4.4, -1.35, 1.35), 2.75, 3.05, C.white, ink);
      const band = [F(-4.39, 1.06, 2.75), F(-4.39, -1.06, 2.75), F(-4.39, -1.06, 2.98), F(-4.39, 1.06, 2.98)];
      ctx.beginPath(); pathPts(ctx, band); ctx.fillStyle = n > 0.3 ? alpha(LIT, 0.85) : ink(C.navy); ctx.fill();
    } },
    { u: -6.3, d: () => { prism(ctx, F, rectPts(-6.6, -5.9, -0.35, 0.35), 3.2, 4.1, C.ink, ink, { top: C.ink }); prism(ctx, F, rectPts(-6.62, -5.88, -0.37, 0.37), 3.65, 3.85, INK.cranberry, ink, { top: false }); } },
  ];
  parts.sort((a, b) => { const A = F(a.u, 0, 0), B2 = F(b.u, 0, 0); return A[0] + A[1] - B2[0] - B2[1]; });
  for (const q of parts) q.d();
  runLights(ctx, F, L, B, 1.3, n);
  if (n > 0.3) { const [x, y, z] = F(-5.5, 0, 3.4); glow3(ctx, x, y, z, 1.4, LIT, n * 0.5); }
}

// The lobster boat, out in front of the runway by day: from buoy to buoy,
// hauling each trap, gulls after it. Its buoys bob there all day.
const BUOYS = [[56, 65.6], [68, 64.4], [80, 66.8], [92, 64.8], [103, 67.4]];
const LOBSTER = { t0: at(5.2), wait: 9, speed: 0.95, transit: 1.9 };
function lobsterAt(t) {
  // In from far out on the left, along the buoys, and away out to sea.
  const pts = [[-34, 84], ...BUOYS.map(([x, y]) => [x - 1.8, y + 0.8]), [170, 92]];
  let s = t - LOBSTER.t0;
  if (s < 0) return null;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const go = Math.hypot(x1 - x0, y1 - y0) / (i === 1 || i === pts.length - 1 ? LOBSTER.transit : LOBSTER.speed);
    if (s < go) { const k = s / go; return { x: lerp(x0, x1, k), y: lerp(y0, y1, k), a: Math.atan2(y1 - y0, x1 - x0), k: Math.sin(Math.PI * k), haul: false }; }
    s -= go;
    if (i < pts.length - 1) {
      if (s < LOBSTER.wait) { const a = Math.atan2(y1 - y0, x1 - x0); return { x: x1, y: y1, a, k: 0, haul: true, s }; }
      s -= LOBSTER.wait;
    }
  }
  return null;
}
function lobsterBoat(ctx, t, p, ink) {
  const { F } = boatFrame(p.x, p.y, p.a, bob(t, p.x));
  wake(ctx, F, 3.2, 1.2, p.k, t, 0);
  prism(ctx, F, hullPts(3.2, 1.25, 0.3), 0, 0.5, C.white, ink, { top: C.greyLight, side: C.white });
  // A navy stripe along the side you see.
  const sd = p.a > -Math.PI * 0.75 && p.a < Math.PI * 0.25 ? 1 : -1;
  ctx.beginPath(); pathPts(ctx, [F(-1.6, sd * 0.63, 0.32), F(1.1, sd * 0.63, 0.32), F(1.1, sd * 0.63, 0.42), F(-1.6, sd * 0.63, 0.42)]);
  ctx.fillStyle = ink(C.navy); ctx.fill();
  // The wheelhouse forward, the lobsterman aft at the hauler.
  const crew = () => { const [x, y, z] = F(-0.9, 0, 0.5); person(ctx, x, y, z, { ...folk(612, { top: INK.safety, bottom: INK.safety, hat: 'beanie' }), pose: p.haul ? 'carry' : 'stand', dir: 'l', scale: 0.62 }, p.haul ? t : 0); };
  const house = () => prism(ctx, F, rectPts(0.1, 0.95, -0.45, 0.45), 0.5, 1.25, C.white, ink, { top: C.navy });
  const a = F(-0.9, 0, 0), b = F(0.5, 0, 0);
  if (a[0] + a[1] < b[0] + b[1]) { crew(); house(); } else { house(); crew(); }
  if (p.haul && Q.detail) {
    // A trap coming up over the side, dripping.
    const up = clamp((p.s - 1.5) / 4, 0, 1) * (p.s < LOBSTER.wait - 1.5 ? 1 : 0);
    const [x, y, z] = F(-0.9, sd * 0.85, 0.1 + up * 0.7);
    ctx.beginPath(); ctx.rect(PX(x, y) - 0.25, PY(x, y, z) - 0.25, 0.5, 0.3);
    ctx.fillStyle = ink(C.mustard); ctx.fill();
    if (Q.lines) { ctx.strokeStyle = ink(C.ink); ctx.lineWidth = 0.03; ctx.stroke(); }
  }
}
function buoys(ctx, t, ink) {
  for (let i = 0; i < BUOYS.length; i++) {
    const [x, y] = BUOYS[i], z = Math.sin(t * 1.8 + i * 1.3) * 0.08;
    const X = PX(x, y), Y = PY(x, y, z);
    ctx.beginPath(); ctx.ellipse(X, Y - 0.15, 0.16, 0.24, 0, 0, Math.PI * 2);
    ctx.fillStyle = ink(C.coral); ctx.fill();
    ctx.fillStyle = ink(C.mustard); ctx.fillRect(X - 0.16, Y - 0.2, 0.32, 0.1);
    if (Q.lines) { ctx.strokeStyle = ink(C.ink); ctx.lineWidth = 0.03; ctx.stroke(); }
  }
}

// One sailboat out anyway, late morning to early afternoon, tacking back and
// forth on the outer harbor off the light pier.
const SAIL = [[-40, 96], [12, 72], [26, 80], [40, 70], [54, 79], [66, 71], [80, 78], [150, 108]];
function sailAt(t) { const p = along(t, SAIL, 1.5, at(8)); if (p) p.k = 0.7; return p; }
function sailboat(ctx, t, p, ink) {
  const { F, c, s } = boatFrame(p.x, p.y, p.a, bob(t, p.x));
  wake(ctx, F, 2.2, 0.8, 0.5, t, 0);
  prism(ctx, F, hullPts(2.2, 0.8, 0.35), 0, 0.3, C.white, ink, { top: C.woodLight });
  // The sail: a triangle from the mast, heeled over a little in the wind.
  const heel = 0.25, side = (s > c ? -1 : 1);
  const m0 = F(0.2, 0, 0.3), m1 = F(0.2, side * heel, 3.2), b = F(-0.95, side * 0.25, 0.55);
  ctx.beginPath(); pathPts(ctx, [m0, m1, b]);
  ctx.fillStyle = ink(C.white); ctx.fill();
  if (Q.lines) { ctx.strokeStyle = ink(C.ink); ctx.lineWidth = 0.035; ctx.stroke(); }
  const j = F(1.05, 0, 0.35);
  ctx.beginPath(); pathPts(ctx, [m1, F(0.25, side * heel * 0.4, 0.9), j]);
  ctx.fillStyle = ink(INK.cranberry); ctx.fill();
  if (Q.lines) ctx.stroke();
}

function harbor(ctx, t, fx) {
  const n = nightK(t);
  const inner = boatInk(t, 0.18), outer = boatInk(t, 0);
  const list = [];
  for (const i of [0, 1]) { const p = taxiAt(t, i); if (p) list.push({ k: p.x + p.y, d: () => waterTaxi(ctx, t, p, inner, n) }); }
  const tg = tugAt(t);
  list.push({ k: tg.x + tg.y, d: () => tugAndBarge(ctx, t, tg, inner, n) });
  const tk = tankerAt(t);
  if (tk) list.push({ k: tk.x + tk.y, d: () => tanker(ctx, t, tk, inner, n) });
  const lb = lobsterAt(t);
  if (lb) list.push({ k: lb.x + lb.y, d: () => lobsterBoat(ctx, t, lb, outer) });
  const sb = sailAt(t);
  if (sb) list.push({ k: sb.x + sb.y, d: () => sailboat(ctx, t, sb, outer) });
  list.sort((a, b) => a.k - b.k);
  for (const b of list) b.d();
  if (inView(fx, -50, 55, 45, 90)) buoys(ctx, t, outer);
}

// Registration marks round the sheet, and its caption, in cream.
export function backdrop(ctx, t, world, fx) {
  seen = world;
  const T = tones(t);
  ctx.save();
  ctx.lineJoin = 'round';
  stars(ctx, t, fx);
  if (inView(fx, 10, -60, 60, 10)) sun(ctx, t);
  farShore(ctx, t, fx, T);
  harbor(ctx, t, fx);
  ctx.restore();
  const ink = alpha(INK.snow, 0.7);
  reg(ctx, (W - D) / 2, -40, ink);
  reg(ctx, (W - D) / 2, (W + D) / 2 + 8, ink);
  reg(ctx, -D - 6, D / 2, ink);
  reg(ctx, W + 6, W / 2, ink);
  const k = 40;
  ctx.save();
  ctx.translate(-D + 4, D / 2 + 22);
  ctx.scale(1 / k, 1 / k);
  ctx.font = `${0.9 * k}px "Rethink Sans", system-ui, sans-serif`;
  ctx.fillStyle = ink;
  ctx.textBaseline = 'middle';
  ctx.fillText('GOOSE AT LARGE  ·  DEPARTURES  ·  BOSTON LOGAN', 0, 0);
  ctx.restore();
}

// ---------- Bird control ----------
// The cannon on the runway goes BANG every so often by day, and every gull
// for a mile lifts off and settles again. bangs: the loop times; bangAge(t):
// seconds since the last one (Infinity if none today yet). The runway can
// read it to empty its gulls; sound.js plays the BANG.
export const BANGS = [at(6.9), at(8.6), at(10.2), at(11.9), at(13.6), at(15.2)];
export function bangAge(t) {
  const s = mod(t, LOOP);
  let best = Infinity;
  for (const b of BANGS) if (s >= b) best = Math.min(best, s - b);
  return best;
}
const BURST = 14; // how long the gulls are up

// ---------- Over: gulls ----------
// Gulls wheeling over the water by day: off the dock, off the light pier,
// and after the lobster boat while it hauls. After a BANG, a crowd of them
// up off the runway, scattering, wheeling and coming back down.
function gullPath(ctx, X, Y, t, i) {
  const flapping = Math.sin(t * 0.8 + i * 2.3) > 0.1;
  const w = flapping ? Math.sin(t * 9 + i * 1.7) * 0.32 : 0.1;
  ctx.moveTo(X - 0.6, Y - w);
  ctx.quadraticCurveTo(X - 0.25, Y - 0.24, X, Y);
  ctx.quadraticCurveTo(X + 0.25, Y - 0.24, X + 0.6, Y - w);
}
function gulls(ctx, t, k) {
  if (k <= 0.02) return;
  ctx.beginPath();
  const flocks = [[2, -5, 4.5, 4, 2.6, 0.5], [4, 60.5, 5, 3, 2.2, -0.42]];
  const lb = lobsterAt(t);
  if (lb && lb.haul) flocks.push([lb.x, lb.y, 2.6, 5, 1.8, 0.7]);
  let i = 0;
  for (const [cx, cy, cz, count, rad, sp] of flocks) {
    for (let j = 0; j < count; j++, i++) {
      const a = t * sp + (j / count) * Math.PI * 2 + Math.sin(t * 0.3 + j) * 0.5, rr = rad * (0.8 + 0.3 * Math.sin(j * 2.1 + cx));
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.8, z = cz + Math.sin(t * 0.7 + j * 1.3) * 0.5;
      gullPath(ctx, PX(x, y), PY(x, y, z), t, i);
    }
  }
  // The BANG: up off the far end of the runway.
  const age = bangAge(t);
  if (age < BURST) {
    const up = ramp(0, 2.2, age) * (1 - ramp(BURST - 4, BURST, age));
    for (let j = 0; j < 14; j++, i++) {
      const hx = 86 + hash(j, 1) * 14, hy = CENTER - 2 + hash(j, 2) * 4;
      const a = hash(j, 3) * Math.PI * 2 + age * (0.5 + hash(j, 4) * 0.4) * (j % 2 ? 1 : -1);
      const rr = (1.5 + hash(j, 5) * 4) * up;
      const x = hx + Math.cos(a) * rr, y = hy + Math.sin(a) * rr * 0.7, z = 0.4 + up * (4 + hash(j, 6) * 5);
      gullPath(ctx, PX(x, y), PY(x, y, z), t, i);
    }
  }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = alpha(C.ink, qk(k, 8)); ctx.lineWidth = 0.22; ctx.stroke();
  ctx.strokeStyle = alpha(C.white, qk(k, 8)); ctx.lineWidth = 0.1; ctx.stroke();
  ctx.lineCap = 'butt';
}

// ---------- Over: far planes ----------
// Small and far, by day: arrivals coming in high over the city, descending
// to the left (gear down, landing lights on) toward the approach, and
// departures climbing away to the right after taking off over the pier.
// None start in the ground stop. They shrink as they go away and grow as
// they come in.
const LANES = [
  // every, phase, takes, from [X, Y, z], to [X, Y, z], scale from, to, gear, liveries
  { every: 30, phase: 6, takes: 26, from: [138, -42, 16], to: [-92, -6, 8], s: [0.24, 0.42], gear: true, liveries: ['jetblew', 'northeast', 'moving', 'spite'] },
  { every: 30, phase: 21, takes: 24, from: [-96, 8, 7], to: [150, -62, 20], s: [0.4, 0.2], gear: false, liveries: ['northeast', 'moving', 'jetblew'] },
];
// Moving Day's planes (white, a coral cheat line and the goose on the tail)
// land here too.
const FAR_LIVERY = { ...LIVERY, moving: { body: C.white, tail: C.coral, stripe: C.coral } };
// A page point and height to the world (for a plane's frame).
const toWorld = (X, Y, z) => { const s = 2 * (Y + z * ZK); return [(s + X) / 2, (s - X) / 2, z]; };
function farPlanes(ctx, t, fx) {
  for (const L of LANES) {
    const s0 = Math.floor((t - L.phase) / L.every);
    for (const s of [s0, s0 - 1]) {
      const start = s * L.every + L.phase, k = (t - start) / L.takes;
      if (k < 0 || k > 1 || !flying(start)) continue;
      const from = toWorld(...L.from), to = toWorld(...L.to);
      const p = [lerp(from[0], to[0], k), lerp(from[1], to[1], k), lerp(from[2], to[2], k)];
      const X = PX(p[0], p[1]), Y = PY(p[0], p[1], p[2]);
      if (fx && fx.view && (X < fx.view[0] - 6 || X > fx.view[2] + 6 || Y < fx.view[1] - 6 || Y > fx.view[3] + 6)) continue;
      const dir = [to[0] - from[0], to[1] - from[1]], len = Math.hypot(dir[0], dir[1]);
      const climb = (to[2] - from[2]) / len;
      farPlane(ctx, t, p, [dir[0] / len, dir[1] / len], lerp(L.s[0], L.s[1], k), {
        livery: FAR_LIVERY[L.liveries[mod(s, L.liveries.length)]], gear: L.gear, pitch: climb * 3, landing: L.gear,
      });
    }
  }
}
// A jet in its own units (u along, v across, w up), scaled and projected.
function farPlane(ctx, t, p, dir, sc, o) {
  const n = nightK(t), side = [-dir[1], dir[0]];
  const P = (u, v, w) => { const x = p[0] + (dir[0] * u + side[0] * v) * sc, y = p[1] + (dir[1] * u + side[1] * v) * sc, z = p[2] + (w + u * o.pitch * 0.1) * sc; return [PX(x, y), PY(x, y, z)]; };
  const path = (pts) => { ctx.beginPath(); pts.forEach(([u, v, w], i) => { const [X, Y] = P(u, v, w); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.closePath(); };
  const Lv = o.livery || FAR_LIVERY.jetblew;
  const ink = (c) => (n > 0.5 ? mix(c, C.night, 0.45) : c);
  const body = ink(Lv.body), lw = 0.18 * sc;
  const paint = (c) => { ctx.fillStyle = c; ctx.fill(); if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke(); } };
  // Which wing is nearer: the one on the side toward you.
  const near = side[0] + side[1] > 0 ? 1 : -1;
  const wing = (v) => { path([[1, 0.4 * v, -0.1], [0.2, 5 * v, 0.1], [-1.2, 5 * v, 0.1], [-0.8, 0.4 * v, -0.1]]); paint(v === near ? body : ink(shade(Lv.body, 0.12))); };
  wing(-near);
  // The body: its back, then the side toward you, round from belly to back.
  path([[5.9, 0, 0.05], [5.2, 0.65, 0.45], [-4.8, 0.6, 0.5], [-6.1, 0.12, 0.55], [-6.1, -0.12, 0.55], [-4.8, -0.6, 0.5], [5.2, -0.65, 0.45]]);
  paint(body);
  const sd = near * 0.65;
  path([[5.9, 0, 0.05], [5.3, sd, -0.42], [-4.6, sd * 0.92, -0.38], [-6.1, sd * 0.2, 0.3], [-4.8, sd * 0.92, 0.5], [5.2, sd, 0.45]]);
  paint(ink(shade(Lv.body, 0.1)));
  // The cheat line along the side.
  if (Q.detail) {
    ctx.beginPath(); const [a0, a1] = P(5, sd * 1.01, 0.02), [b0, b1] = P(-4.6, sd * 0.93, 0.05);
    ctx.moveTo(a0, a1); ctx.lineTo(b0, b1);
    ctx.strokeStyle = ink(Lv.stripe); ctx.lineWidth = 0.22 * sc; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineCap = 'butt';
  }
  wing(near);
  for (const v of [-2, 2]) { path([[1.2, v - 0.3, -0.35], [1.2, v + 0.3, -0.35], [-0.4, v + 0.3, -0.35], [-0.4, v - 0.3, -0.35]]); paint(ink(shade(Lv.body, 0.2))); }
  if (o.gear) {
    ctx.beginPath();
    for (const [u, v] of [[3.8, 0], [-0.4, 0.6], [-0.4, -0.6]]) { const [x0, y0] = P(u, v, -0.1), [x1, y1] = P(u, v, -0.75); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.22 * sc; ctx.stroke();
  }
  // The fin in the airline's color, and the tailplane.
  path([[-3.8, 0, 0.45], [-5.9, 0, 0.45], [-6.3, 0, 2.5], [-5.4, 0, 2.5]]);
  paint(ink(Lv.tail));
  path([[-5, 0, 0.5], [-5.4, 1.8, 0.5], [-6, 1.8, 0.5], [-5.9, 0, 0.5], [-6, -1.8, 0.5], [-5.4, -1.8, 0.5]]);
  paint(ink(shade(Lv.body, 0.08)));
  // Lights: landing lights (coming in, and climbing out after dark), the
  // wingtips, the beacon and the strobes.
  if (o.landing || n > 0.3) { const [X, Y] = P(5.8, 0, -0.1); glowAt(ctx, X, Y, 6 * sc + 1.2 + n, LIT, o.landing ? 0.35 + 0.65 * n : n * 0.8); }
  if (n > 0.2) {
    const blink = Math.sin(t * 6) > 0 ? 1 : 0.25;
    const [ax, ay] = P(-0.9, 5, 0.1), [bx, by] = P(-0.9, -5, 0.1), [cx, cy] = P(-1, 0, 0.5);
    glowAt(ctx, ax, ay, 0.8, C.green, n * blink); glowAt(ctx, bx, by, 0.8, C.red, n * blink);
    if (Math.sin(t * 3.1) > 0.6) glowAt(ctx, cx, cy, 0.9, C.red, n);
  }
}

// ---------- Over: the snow ----------
// Flakes on a tiling of the view, so there are about as many on screen
// whatever the zoom and they move with the map when it pans. Each tile drops
// its own flakes, each one living a few seconds: it fades in, falls and is
// blown sideways (to the right, in off the sea: light at three, a gale by
// dusk, easing after eleven), and fades out, so nothing repeats and nothing
// pops at a tile's edge.
const FLAKES = 9, MAXN = 120, LIFE = 2.6;
// Indoors (the terminal, roof off, and the bag room under the gates) it
// doesn't snow: a flake whose spot at head height is over their floor isn't
// drawn, so the hall reads as inside and the snow as out.
const INDOORS = [[0, LAND, W, AIR], [0, AIR, CHECK, FRONT]];
const HEAD = 1.4 * ZK;
function indoors(X, Y) {
  const sum = 2 * (Y + HEAD), x = (sum + X) / 2, y = (sum - X) / 2;
  return INDOORS.some(([x0, y0, x1, y1]) => x > x0 && x < x1 && y > y0 && y < y1);
}
function windAt(t) {
  let h = hour(t);
  if (h < 4) h += 24;
  return 0.06 + 0.5 * ramp(15.5, 17.6, h) * (1 - ramp(23, 25, h));
}
function snow(ctx, t, fx) {
  const s = snowK(t);
  if (s < 0.01 || !fx || !fx.view) return;
  const [vx0, vy0, vx1, vy1] = fx.view;
  const area = (vx1 - vx0) * (vy1 - vy0);
  // The tile, so a full view holds about MAXN flakes, in steps.
  const P = Math.pow(2, Math.round(Math.log2(Math.sqrt((area * FLAKES) / MAXN)) * 4) / 4);
  const css = (Q.pxPerUnit || 20) / (Q.dpr || 1);
  const n = Math.round(FLAKES * (0.3 + 0.7 * s));
  // How fast they go, in tiles a second, and a streak along it.
  const vx = windAt(t), vy = 0.4, sl = Math.hypot(vx, vy), ux = vx / sl, uy = vy / sl;
  const len = (0.4 + vx * 9) / css, big = 1 + 0.6 * s;
  const paths = [new Path2D(), new Path2D(), new Path2D(), new Path2D()]; // small faint, small, big faint, big
  const tx0 = Math.floor(vx0 / P) - 1, tx1 = Math.floor(vx1 / P), ty0 = Math.floor(vy0 / P) - 1, ty1 = Math.floor(vy1 / P);
  for (let a = tx0; a <= tx1; a++) {
    for (let b = ty0; b <= ty1; b++) {
      const seed = a * 7919 + b * 104729;
      for (let i = 0; i < n; i++) {
        const ph = hash(seed + i, 5) * LIFE, c = Math.floor((t + ph) / LIFE), age = t + ph - c * LIFE;
        const f = 0.75 + 0.5 * hash(seed + i, c * 3 + 1);
        const X = (a + hash(seed + i, c * 3 + 2)) * P + vx * P * age * f + Math.sin(t * 1.4 + i) * 0.04 * P;
        const Y = (b + hash(seed + i, c * 3 + 3)) * P + vy * P * age * f;
        if (X < vx0 - 1 || X > vx1 + 1 || Y < vy0 - 1 || Y > vy1 + 1 || indoors(X, Y)) continue;
        const fade = Math.min(age, LIFE - age) < 0.45, k = (hash(seed + i, 9) > 0.72 ? 2 : 0) + (fade ? 0 : 1);
        const L = len * (k > 1 ? 1.3 : 1);
        paths[k].moveTo(X, Y); paths[k].lineTo(X - ux * L, Y - uy * L);
      }
    }
  }
  ctx.save();
  ctx.lineCap = 'round';
  [[1.8, 0.4], [1.8, 0.85], [2.6 * big, 0.4], [2.6 * big, 0.88]].forEach(([w, a], k) => {
    ctx.strokeStyle = alpha(C.white, a); ctx.lineWidth = w / css; ctx.stroke(paths[k]);
  });
  ctx.restore();
}

// The world the page last drew, so the sound can ask whether a find's been
// found (the band gets its tuba back).
let seen = null;
export const isFound = (zone, find) => !!(seen && seen.found && seen.found.is(zone, find));

export function sky(ctx, t, world, fx) {
  follow(fx);
  seen = world;
  const [X0, X1] = world.overviewBox(false);
  const n = nightK(t);
  if (Q.detail) farPlanes(ctx, t, fx);
  if (n < 0.6 && Q.detail) {
    gulls(ctx, t, 1 - n / 0.6);
    birds(ctx, t, 0, (X1 - X0) / 2);
  }
  if (Q.detail) snow(ctx, t, fx);
  if (fx.parade) geeseV(ctx, t, fx.parade, world.totalGeese, (X1 - X0) / 2);
}
