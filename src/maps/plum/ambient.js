// Around Plum Island: what's drawn under the island (the backdrop, over the
// paper, before the areas) and over it (the sky, after everything). The paper
// is the sea (style.js), so the page's marks and words are printed in cream.
//
// Under: the stars, the sunset going down behind Newburyport, Newburyport
// itself across the river (decision 32: a skyline only, printed faint in the
// island's inks, like something across the water), the Salisbury shore and
// its jetty across the river mouth, the full moon for the king tide and its
// path on the sea. Over: clouds, gulls wheeling over the beaches, and the
// banner plane.
//
// Everything is in world units (x along the island, y back to front; see
// land.js) and a pure function of t. The far bank's shapes are built once as
// paths and only filled each frame, in inks mixed into that moment's paper.
import { C, Q, alpha, mix, shade, tint, rng, hash } from '../../engine/art.js';
import { ZK } from '../../engine/iso.js';
import { reg, birds } from '../shared.js';
import { W, D } from './land.js';
import { hour, at, level, nightK } from './tide.js';
import { INK, LAND, LIT, BRAND } from './style.js';
import { follow } from './finale.js';

import { paperAt } from './style.js';
export { paperAt };

// ---------- Geometry helpers (world to page) ----------
const PX = (x, y) => x - y;
const PY = (x, y, z = 0) => (x + y) / 2 - z * ZK;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ramp = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
const qk = (k, n = 32) => Math.round(k * n) / n; // few mixes, so the color cache stays small

// A polygon of 3D points added to a path, always wound the same way so
// overlapping shapes in one path fill as one (nonzero winding).
function poly(p, pts) {
  const s = pts.map(([x, y, z]) => [PX(x, y), PY(x, y, z || 0)]);
  let a = 0;
  for (let i = 0, j = s.length - 1; i < s.length; j = i++) a += s[j][0] * s[i][1] - s[i][0] * s[j][1];
  if (a < 0) s.reverse();
  p.moveTo(s[0][0], s[0][1]);
  for (let i = 1; i < s.length; i++) p.lineTo(s[i][0], s[i][1]);
  p.closePath();
}
// A box's outline as you see it, and its front face (the one facing +y, the
// shaded one in this game's light).
const hex = (x, y, z, w, d, h) => [[x, y + d, z], [x + w, y + d, z], [x + w, y, z], [x + w, y, z + h], [x, y, z + h], [x, y + d, z + h]];
const front = (x, y, z, w, d, h) => [[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]];
// A pitched roof on a box whose top is at zt, ridge along x (gable to the
// right) or along y (gable to the front). Slopes go in `roof`, the gable in
// `sil` (the wall's ink).
function pitched(sil, roof, x, y, w, d, zt, rh, alongY = false) {
  const x2 = x + w, y2 = y + d, zr = zt + rh;
  if (!alongY) {
    const ym = y + d / 2;
    const a = [[x, y2, zt], [x2, y2, zt], [x2, ym, zr], [x, ym, zr]];
    const b = [[x, y, zt], [x2, y, zt], [x2, ym, zr], [x, ym, zr]];
    poly(sil, [[x2, y, zt], [x2, y2, zt], [x2, ym, zr]]);
    poly(roof, a); poly(roof, b);
  } else {
    const xm = x + w / 2;
    poly(sil, [[x, y2, zt], [x2, y2, zt], [xm, y2, zr]]);
    poly(roof, [[x2, y, zt], [x2, y2, zt], [xm, y2, zr], [xm, y, zr]]);
    poly(roof, [[x, y, zt], [x, y2, zt], [xm, y2, zr], [xm, y, zr]]);
  }
}
// A window: a small upright rectangle on a front face (the plane y = fy).
const pane = (p, x, fy, z, w = 0.2, h = 0.36) => poly(p, [[x, fy, z], [x + w, fy, z], [x + w, fy, z + h], [x, fy, z + h]]);
// A disc on a front face (a clock), as a polygon.
function faceDisc(p, cx, fy, cz, r) {
  const pts = [];
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; pts.push([cx + Math.cos(a) * r, fy, cz + Math.sin(a) * r]); }
  poly(p, pts);
}
// Is a page rect in view? (fx.view is the visible page, in world iso units.)
const inView = (fx, X0, Y0, X1, Y1) => !fx || !fx.view || (X1 > fx.view[0] && X0 < fx.view[2] && Y1 > fx.view[1] && Y0 < fx.view[3]);

// ---------- The far bank, built once ----------
// Newburyport sits past the map's back-right corner, behind the marsh and the
// Basin: the brick waterfront (Market Square) along the front, the steeples
// behind it, Federal houses and elms behind those, low hills beyond, and the
// Route 1 bridge far off upriver to Salisbury. Boats moored off the quay.
// Salisbury: the far side of the river mouth, its beach, dunes and a row of
// cottages, with its jetty running out to sea.
const STEEPLES = [
  // x, y, height to the tip, clock
  [89.8, -6.8, 8.6, false],
  [93.4, -8.4, 10.4, true], // the tall one with the clock
  [99.6, -6.4, 9.0, false],
  [102.8, -9.2, 7.4, false],
];
const MASTS = [[96.6, -1.9, 4.4], [98.0, -1.5, 3.4], [99.3, -2.0, 5.0], [101.2, -1.6, 3.8], [102.7, -2.1, 4.6], [104.4, -1.7, 3.2]];
const JETTY = (() => {
  const r = rng(31), out = [];
  for (let i = 0; i < 18; i++) {
    const s = i / 17;
    out.push({
      x: 118.5 + s * 5 + (r() - 0.5) * 0.5, y: 8.3 + s * 17.8 + (r() - 0.5) * 0.4,
      w: 0.9 + r() * 0.6, d: 0.9 + r() * 0.5,
      top: 1.05 + r() * 0.45 - (i % 5 === 3 ? 0.35 : 0), // the odd one tumbled lower
    });
  }
  out[10].top = 1.45; // the fisherman's rock, the driest
  return out.sort((a, b) => a.x + a.y - b.x - b.y);
})();
const FISHER = JETTY.find((b) => b.top === 1.45);
const LAMP = [123.9, 26.6]; // the light on the jetty's end

let GEO = null;
function geo() {
  if (GEO) return GEO;
  const P = () => new Path2D();
  const g = {
    hills: P(), trees: P(),
    bridge: P(), bridgeL: P(), bridgeLit: P(),
    back: P(), backL: P(), backRoof: P(),
    nave: P(), naveL: P(), naveRoof: P(),
    tower: P(), towerL: P(), dark: P(), clock: P(),
    brick: P(), brickL: P(), cornice: P(),
    quay: P(), hulls: P(),
    land: P(), landL: P(), grass: P(), dunes: P(),
    cot: P(), cotL: P(), cotRoof: P(),
    win: [P(), P(), P(), P(), P(), P()],
  };
  const r = rng(11);
  const winAt = (x, fy, z, w, h) => pane(g.win[Math.floor(r() * 6)], x, fy, z, w, h);

  // Low hills beyond the town, tapering into the paper at both ends.
  const hill = [];
  for (let x = 76; x <= 136; x += 2) {
    const k = ramp(76, 90, x) * ramp(136, 122, x);
    hill.push([x, -17, (1.3 + 0.7 * Math.sin(x * 0.21) + 0.4 * Math.sin(x * 0.53 + 1)) * k]);
  }
  hill.push([136, -17, 0], [76, -17, 0]);
  poly(g.hills, hill);
  // Elms among the back houses: round blobs.
  for (let i = 0; i < 9; i++) {
    const x = 85.5 + i * 2.6 + r() * 0.8, y = -11 + r() * 1.2, z = 2 + r() * 0.8, rr = 0.9 + r() * 0.5;
    g.trees.ellipse(PX(x, y), PY(x, y, z), rr * 1.2, rr, 0, 0, Math.PI * 2);
    g.trees.closePath();
  }

  // The Route 1 bridge, far off upriver: a long low deck on piers.
  poly(g.bridge, hex(105, -13, 1.3, 15.5, 0.6, 0.35));
  poly(g.bridgeL, front(105, -13, 1.3, 15.5, 0.6, 0.35));
  for (let x = 105.6; x < 120.5; x += 1.9) { poly(g.bridge, hex(x, -12.9, 0, 0.3, 0.3, 1.3)); poly(g.bridgeL, front(x, -12.9, 0, 0.3, 0.3, 1.3)); }
  for (let x = 105.4; x < 120.5; x += 0.9) pane(g.bridgeLit, x, -12.4, 1.72, 0.12, 0.12);

  // The back row: Federal houses, pitched roofs, staggered.
  for (let x = 85; x < 106; ) {
    const w = 1.3 + r() * 0.7, d = 1.5 + r() * 0.4, y = -9.6 + r() * 0.8, h = 1.5 + r() * 0.8;
    poly(g.back, hex(x, y, 0, w, d, h));
    poly(g.backL, front(x, y, 0, w, d, h));
    pitched(g.back, g.backRoof, x, y, w, d, h, 0.8 + r() * 0.3);
    for (let wx = x + 0.3; wx < x + w - 0.3; wx += 0.55) winAt(wx, y + d, h * 0.45, 0.2, 0.34);
    x += w + 0.5 + r() * 0.7;
  }

  // The churches: a nave behind each tower, then the tower in three stages
  // and a tall thin spire. White clapboard, as Newburyport's are.
  for (const [cx, cy, H, clock] of STEEPLES) {
    const nw = 2.2, nd = 3.2, nh = H * 0.26;
    poly(g.nave, hex(cx - nw / 2, cy - 0.5 - nd, 0, nw, nd, nh));
    poly(g.naveL, front(cx - nw / 2, cy - 0.5 - nd, 0, nw, nd, nh));
    pitched(g.nave, g.naveRoof, cx - nw / 2, cy - 0.5 - nd, nw, nd, nh, 1.2, true);
    const stages = [[0.55, 0, 0.42], [0.42, 0.42, 0.13], [0.3, 0.55, 0.09]];
    for (const [s, z0, hh] of stages) {
      poly(g.tower, hex(cx - s, cy - s, H * z0, s * 2, s * 2, H * hh));
      poly(g.towerL, front(cx - s, cy - s, H * z0, s * 2, s * 2, H * hh));
    }
    // The spire: a four-sided point.
    const s = 0.25, zb = H * 0.64;
    poly(g.tower, [[cx - s, cy + s, zb], [cx + s, cy + s, zb], [cx + s, cy - s, zb], [cx, cy, H]]);
    poly(g.towerL, [[cx - s, cy + s, zb], [cx + s, cy + s, zb], [cx, cy, H]]);
    // Belfry openings, and the clock.
    pane(g.dark, cx - 0.22, cy + 0.42, H * 0.45, 0.16, H * 0.07);
    pane(g.dark, cx + 0.06, cy + 0.42, H * 0.45, 0.16, H * 0.07);
    if (clock) faceDisc(g.clock, cx, cy + 0.55, H * 0.35, 0.34);
    else pane(g.win[Math.floor(r() * 6)], cx - 0.1, cy + 0.55, H * 0.2, 0.2, 0.5);
  }

  // Market Square: the brick waterfront, flat roofs, cornices and chimneys.
  for (let x = 86; x < 105; ) {
    const w = 1.3 + r() * 1.1, d = 1.9, y = -5.6 + r() * 0.3, h = 2 + r() * 1.4;
    poly(g.brick, hex(x, y, 0, w, d, h));
    poly(g.brickL, front(x, y, 0, w, d, h));
    poly(g.cornice, front(x, y, h - 0.14, w, d, 0.14));
    if (r() < 0.6) { const cx = x + 0.2 + r() * (w - 0.5); poly(g.brick, hex(cx, y + 0.4, h, 0.24, 0.24, 0.45)); poly(g.brickL, front(cx, y + 0.4, h, 0.24, 0.24, 0.45)); }
    for (let z = 0.55; z + 0.5 < h; z += 0.7) for (let wx = x + 0.22; wx < x + w - 0.3; wx += 0.48) winAt(wx, y + d, z, 0.2, 0.36);
    x += w + (r() < 0.2 ? 0.35 : 0.02);
  }
  // The quay along the water, and hulls moored off it.
  poly(g.quay, hex(93.5, -3.5, 0, 13, 0.7, 0.28));
  for (const [x, y] of MASTS) poly(g.hulls, hex(x - 0.55, y - 0.2, 0, 1.1, 0.4, 0.26));

  // Salisbury: the land beyond the river mouth, sand along its edges, the
  // grass behind, dunes along the beach and a row of low cottages.
  poly(g.land, hex(117.8, -20, -0.2, 40, 28.4, 0.4));
  poly(g.landL, front(117.8, -20, -0.2, 40, 28.4, 0.4));
  poly(g.grass, [[118.6, -20, 0.2], [158, -20, 0.2], [158, 4.2, 0.2], [118.6, 4.2, 0.2]]);
  const dune = [];
  for (let x = 118.5; x <= 158; x += 0.8) dune.push([x, 5.9, 0.2 + (0.7 + 0.35 * Math.sin(x * 1.3) + 0.25 * Math.sin(x * 0.47)) * ramp(118.5, 119.8, x)]);
  dune.push([158, 5.9, 0.2], [118.5, 5.9, 0.2]);
  poly(g.dunes, dune);
  for (let i = 0; i < 16; i++) {
    const x = 119 + i * 2.4, y = 0.8 + (i % 3) * 0.5, w = 1.5, d = 1.3, h = 0.85;
    poly(g.cot, hex(x, y, 0.2, w, d, h));
    poly(g.cotL, front(x, y, 0.2, w, d, h));
    pitched(g.cot, g.cotRoof, x, y, w, d, 0.2 + h, 0.55);
    winAt(x + 0.35, y + d, 0.45, 0.22, 0.26);
    if (i % 2) winAt(x + 0.95, y + d, 0.45, 0.22, 0.26);
  }
  GEO = g;
  return g;
}

// The far bank's inks at t: each one a little way into that moment's paper,
// fainter at night (so the lit windows carry it).
const BRICK = mix(C.coral, C.brown, 0.5);
function tones(t) {
  const p = paperAt(t);
  const f = 1 - 0.35 * qk(nightK(t), 8);
  const m = (c, k) => mix(p, c, qk(k * f));
  return {
    paper: p,
    hills: m(mix(INK.cream, INK.marsh, 0.5), 0.12),
    trees: m(mix(INK.marsh, INK.cream, 0.3), 0.16),
    house: m(INK.cream, 0.24), houseL: m(INK.cream, 0.14), roof: m(C.navy, 0.14),
    white: m(C.white, 0.46), whiteL: m(C.white, 0.28),
    brick: m(mix(BRICK, INK.cream, 0.45), 0.3), brickL: m(mix(BRICK, INK.cream, 0.2), 0.2), cornice: m(C.navy, 0.16),
    quay: m(INK.cream, 0.2), mast: m(INK.cream, 0.4),
    sand: m(INK.sand, 0.28), sandL: m(INK.sand, 0.16), grass: m(LAND.dune, 0.22), dune: m(mix(LAND.dune, INK.sand, 0.4), 0.3),
    granite: m(tint(INK.shingle, 0.2), 0.42), graniteL: m(INK.shingle, 0.3), graniteT: m(tint(INK.shingle, 0.45), 0.46),
    wet: m(mix(INK.shingle, C.green, 0.4), 0.3), foam: m(C.white, 0.35),
    dark: m(C.ink, 0.25), win: m(C.ink, 0.1),
    figure: mix(p, C.black, qk(0.3 + 0.25 * nightK(t))),
  };
}

function fill(ctx, path, color) { ctx.fillStyle = color; ctx.fill(path); }

// Which of the six window groups are lit at t: most, changing every few
// seconds, one group at a time, so the town twinkles faintly after dark.
const litGroup = (i, t) => hash(i * 17 + 3, Math.floor(t / 4.5 + i * 0.41)) < 0.72;

function newburyport(ctx, t, T, g, n) {
  fill(ctx, g.hills, T.hills);
  fill(ctx, g.trees, T.trees);
  fill(ctx, g.bridge, T.quay);
  fill(ctx, g.bridgeL, T.dark);
  fill(ctx, g.back, T.house); fill(ctx, g.backL, T.houseL); fill(ctx, g.backRoof, T.roof);
  fill(ctx, g.nave, T.white); fill(ctx, g.naveL, T.whiteL); fill(ctx, g.naveRoof, T.roof);
  fill(ctx, g.tower, T.white); fill(ctx, g.towerL, T.whiteL);
  fill(ctx, g.dark, T.dark);
  fill(ctx, g.clock, n > 0.3 ? mix(T.dark, LIT, 0.6) : T.dark);
  fill(ctx, g.brick, T.brick); fill(ctx, g.brickL, T.brickL); fill(ctx, g.cornice, T.cornice);
  fill(ctx, g.quay, T.quay);
  fill(ctx, g.hulls, T.white);
  // Masts, rocking a little on the swell; a riding light on each at night.
  ctx.beginPath();
  for (let i = 0; i < MASTS.length; i++) {
    const [x, y, h] = MASTS[i], X = PX(x, y), Y = PY(x, y, 0.26), a = Math.sin(t * 0.9 + i * 1.7) * 0.05;
    ctx.moveTo(X, Y);
    ctx.lineTo(X + Math.sin(a) * h * ZK, Y - Math.cos(a) * h * ZK);
  }
  ctx.strokeStyle = T.mast;
  ctx.lineWidth = 0.09;
  ctx.stroke();
}

function salisburyLand(ctx, T, g) {
  fill(ctx, g.land, T.sand); fill(ctx, g.landL, T.sandL);
  fill(ctx, g.grass, T.grass);
}
function salisbury(ctx, T, g) {
  fill(ctx, g.dunes, T.dune);
  fill(ctx, g.cot, T.house); fill(ctx, g.cotL, T.houseL); fill(ctx, g.cotRoof, T.roof);
}

// Every window in town and on the Salisbury shore: faint dark by day; after
// dark most of them lit, a group at a time going on and off.
function windows(ctx, t, T, g, n) {
  if (n < 0.3) {
    ctx.fillStyle = T.win;
    for (const p of g.win) ctx.fill(p);
    return;
  }
  const a = qk(0.35 + 0.45 * n, 16);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = litGroup(i, t) ? alpha(LIT, a) : T.dark;
    ctx.fill(g.win[i]);
  }
  ctx.fillStyle = alpha(LIT, a * 0.8);
  ctx.fill(g.bridgeLit);
}

// The Salisbury jetty: tumbled granite in a line out to sea, only what's
// above the tide (the water's the paper here), wet and weedy below the
// ordinary high water mark, a fisherman on the driest rock and a light on
// the end that blinks red at night.
function jetty(ctx, t, T, n) {
  const L = level(t);
  const box3 = (x, y, z0, w, d, top, c, cL, cT) => {
    if (top <= z0) return;
    const h = top - z0;
    ctx.beginPath(); pathPoly(ctx, hex(x, y, z0, w, d, h)); ctx.fillStyle = c; ctx.fill();
    ctx.beginPath(); pathPoly(ctx, front(x, y, z0, w, d, h)); ctx.fillStyle = cL; ctx.fill();
    ctx.beginPath(); pathPoly(ctx, [[x, y, top], [x + w, y, top], [x + w, y + d, top], [x, y + d, top]]); ctx.fillStyle = cT; ctx.fill();
  };
  // The rocks, in four passes (outline, fronts, weed line, tops) rather than
  // four fills a rock: they're faint, so the odd overlap doesn't show. A lick
  // of foam at each one's foot goes under them, coming and going.
  if (Q.detail) {
    ctx.beginPath();
    for (const b of JETTY) {
      if (b.top <= L) continue;
      const f = Math.sin(t * 1.6 + b.x * 3) * 0.3, yy = b.y + b.d + 0.15;
      ctx.moveTo(PX(b.x - 0.2 + f, yy), PY(b.x - 0.2 + f, yy, L));
      ctx.lineTo(PX(b.x + b.w * 0.7 + f, yy), PY(b.x + b.w * 0.7 + f, yy, L));
    }
    ctx.strokeStyle = T.foam; ctx.lineWidth = 0.1; ctx.stroke();
  }
  const up = JETTY.filter((b) => b.top > L);
  const pass = (fn, color) => { ctx.beginPath(); for (const b of up) { const pts = fn(b); if (pts) pathPoly(ctx, pts); } ctx.fillStyle = color; ctx.fill(); };
  pass((b) => hex(b.x, b.y, L, b.w, b.d, b.top - L), T.granite);
  pass((b) => front(b.x, b.y, L, b.w, b.d, b.top - L), T.graniteL);
  if (L < 0.25) pass((b) => (b.top > L ? front(b.x, b.y, L, b.w, b.d, Math.min(0.25, b.top) - L) : null), T.wet);
  pass((b) => [[b.x, b.y, b.top], [b.x + b.w, b.y, b.top], [b.x + b.w, b.y + b.d, b.top], [b.x, b.y + b.d, b.top]], T.graniteT);
  // The light on the end: a post and a lantern.
  const [lx, ly] = LAMP, zt = JETTY[JETTY.length - 1].top;
  box3(lx - 0.15, ly - 0.15, Math.max(L, zt - 0.2), 0.3, 0.3, zt + 2.2, T.white, T.whiteL, T.white);
  box3(lx - 0.28, ly - 0.28, zt + 2.2, 0.56, 0.56, zt + 2.75, T.dark, T.dark, T.dark);
  const blink = n > 0.2 && (t % 5) < 1.3;
  const LX = PX(lx, ly), LY = PY(lx, ly, zt + 2.48);
  if (blink) glowAt(ctx, LX, LY, 3.2, C.coral, n);
  ctx.beginPath(); ctx.arc(LX, LY, 0.2, 0, Math.PI * 2);
  ctx.fillStyle = blink ? tint(C.coral, 0.4) : T.foam; ctx.fill();
  fisherman(ctx, t, T, n, L);
}
function pathPoly(ctx, pts) {
  for (let i = 0; i < pts.length; i++) {
    const [x, y, z] = pts[i];
    if (i) ctx.lineTo(PX(x, y), PY(x, y, z || 0)); else ctx.moveTo(PX(x, y), PY(x, y, z || 0));
  }
  ctx.closePath();
}

// A fisherman in silhouette on the driest rock, facing the sea, casting every
// fourteen seconds, day and night (a headlamp after dark). At the king tide
// the water's at the rock's lip and he hasn't moved.
function fisherman(ctx, t, T, n, L) {
  const b = FISHER, x = b.x + b.w / 2, y = b.y + b.d / 2;
  const X = PX(x, y), Y = PY(x, y, b.top);
  const k = ZK;
  ctx.fillStyle = T.figure;
  ctx.beginPath();
  ctx.rect(X - 0.2, Y - 1.05 * k, 0.16, 1.05 * k); // legs
  ctx.rect(X + 0.04, Y - 1.05 * k, 0.16, 1.05 * k);
  ctx.moveTo(X - 0.32, Y - 1.0 * k); ctx.lineTo(X + 0.32, Y - 1.0 * k); ctx.lineTo(X + 0.26, Y - 1.85 * k); ctx.lineTo(X - 0.26, Y - 1.85 * k); ctx.closePath();
  ctx.moveTo(X + 0.24, Y - 2.1 * k); ctx.arc(X, Y - 2.1 * k, 0.24, 0, Math.PI * 2);
  ctx.rect(X - 0.36, Y - 2.33 * k, 0.72, 0.08); // hat brim
  ctx.rect(X - 0.2, Y - 2.5 * k, 0.4, 0.2);
  ctx.fill();
  // The rod: back over his shoulder, a flick forward, then out over the water.
  const s = t % 14;
  const ang = s < 0.8 ? -0.3 - s * 1.2 : s < 1.2 ? -1.26 + (s - 0.8) * 5.6 : 0.95 + Math.sin(t * 1.3) * 0.03;
  const hx = X - 0.15, hy = Y - 1.55 * k, len = 2.4;
  const tx = hx - Math.sin(ang) * len, ty = hy - Math.cos(ang) * len;
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty);
  ctx.strokeStyle = T.figure; ctx.lineWidth = 0.08; ctx.stroke();
  if (s > 1.2) {
    // The line, sagging to the water a way out in front.
    const wx = x - 2.8, wy = y + 0.9, WX = PX(wx, wy), WY = PY(wx, wy, L);
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo((tx + WX) / 2, (ty + WY) / 2 + 0.8, WX, WY);
    ctx.lineWidth = 0.04; ctx.stroke();
  }
  if (n > 0.3) {
    const HX = X - 0.12, HY = Y - 2.15 * k;
    glowAt(ctx, HX, HY, 1.4, LIT, n * 0.8);
    ctx.beginPath(); ctx.arc(HX, HY, 0.09, 0, Math.PI * 2); ctx.fillStyle = LIT; ctx.fill();
  }
}

// A soft glow at a page point (art.js glow() takes world points; this is the
// same sprite, screened over what's under it).
const sprites = new Map();
function sprite(color) {
  let cv = sprites.get(color);
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, alpha(color, 0.9));
    gr.addColorStop(0.3, alpha(color, 0.45));
    gr.addColorStop(0.65, alpha(color, 0.12));
    gr.addColorStop(1, alpha(color, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
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

// ---------- The sky's dark half: stars, the sun going down, the moon ----------
// The back edges of the map on the page: stars only above them, in the sky
// behind the marsh and the Sound.
const edgeY = (X) => (X < -D ? D / 2 : X < 0 ? -X / 2 : X <= W ? X / 2 : W / 2);
function stars(ctx, t, fx, n) {
  if (n <= 0.02 || !fx || !fx.view) return;
  const [x0, y0, x1, y1] = fx.view, G = 5;
  const gx0 = Math.floor(x0 / G), gx1 = Math.ceil(x1 / G), gy0 = Math.floor(y0 / G), gy1 = Math.ceil(y1 / G);
  if ((gx1 - gx0) * (gy1 - gy0) > 4000) return;
  const paths = [new Path2D(), new Path2D(), new Path2D()];
  for (let gx = gx0; gx <= gx1; gx++) for (let gy = gy0; gy <= gy1; gy++) {
    const r = hash(gx * 7919 + 13, gy * 104729 + 7);
    if (r > 0.32) continue;
    const X = (gx + hash(gx, gy + 99)) * G, Y = (gy + hash(gx + 55, gy)) * G;
    if (Y > edgeY(X) - 4) continue;
    const tw = Math.sin(t * (1.2 + r * 9) + r * 80);
    const b = tw > 0.55 ? 2 : tw > -0.4 ? 1 : 0;
    const s = 0.09 + r * 0.45;
    const p = paths[b];
    if (r < 0.05) {
      // A bright one: a four-pointed sparkle.
      const L = s * 3.2, w = s * 0.55;
      p.moveTo(X, Y - L); p.lineTo(X + w, Y - w); p.lineTo(X + L, Y); p.lineTo(X + w, Y + w);
      p.lineTo(X, Y + L); p.lineTo(X - w, Y + w); p.lineTo(X - L, Y); p.lineTo(X - w, Y - w); p.closePath();
    } else p.rect(X - s / 2, Y - s / 2, s, s);
  }
  const a = [0.3, 0.6, 0.95];
  for (let b = 0; b < 3; b++) { ctx.fillStyle = alpha(b === 2 ? C.butter : C.white, qk(a[b] * n, 16)); ctx.fill(paths[b]); }
}

// The sun going down over the marsh, on the right (plum.md, "Sunset"): a
// striped riso sun sinking behind Newburyport's rooftops at 8:20pm.
const SUN_X = 104.5;
function sun(ctx, t, T) {
  const h = hour(t);
  if (h < 18.2 || h > 21) return;
  // Down onto the rooftops by sunset, then behind them (clipped to the sky
  // above the waterfront, so it never shows below the town).
  const k = ramp(18.2, 20.33, h);
  const Y = h < 20.33 ? 12 + 25 * k : 37 + (h - 20.33) * 40, R = 3.2;
  const glowK = ramp(18.2, 19, h) * (1 - ramp(20.4, 21, h));
  glowAt(ctx, SUN_X, Y, 20, C.mustard, glowK * 0.7);
  glowAt(ctx, SUN_X, Y, 8, C.coral, glowK * 0.6);
  if (h > 20.6) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(SUN_X - 12, (SUN_X - 12) / 2 - 3.8); ctx.lineTo(SUN_X + 12, (SUN_X + 12) / 2 - 3.8);
  ctx.lineTo(SUN_X + 12, 0); ctx.lineTo(SUN_X - 12, 0); ctx.closePath();
  ctx.clip();
  ctx.beginPath(); ctx.arc(SUN_X, Y, R, 0, Math.PI * 2);
  ctx.fillStyle = mix(C.mustard, C.coral, qk(0.15 + 0.7 * k, 16));
  ctx.fill();
  // Stripes cut across its lower half, the paper showing through.
  ctx.fillStyle = T.paper;
  for (const [dy, th] of [[0.5, 0.16], [1.2, 0.24], [1.85, 0.32], [2.45, 0.4]]) {
    const c = Math.sqrt(Math.max(0, R * R - dy * dy)) + 0.05;
    ctx.fillRect(SUN_X - c, Y + dy, c * 2, th);
  }
  ctx.restore();
}

// The full moon for the king tide, over the open sea in front of the refuge
// beach, and its path on the water: glints shivering on the paper below it.
const MOON = [-22, 70];
function moon(ctx, t, n) {
  if (n <= 0.02) return;
  const h = hour(t), hh = h < 12 ? h + 24 : h;
  const rise = ramp(20.5, 24.5, hh) * (1 - ramp(27.5, 29, hh)); // up after dark, down before dawn
  const X = MOON[0] - 3 + rise * 3, Y = MOON[1] + 6 - rise * 6, R = 2.8;
  glowAt(ctx, X, Y, 13, C.butter, n * 0.45);
  ctx.beginPath(); ctx.arc(X, Y, R, 0, Math.PI * 2);
  ctx.fillStyle = mix(C.white, C.butter, 0.25); ctx.fill();
  if (Q.lines) { ctx.strokeStyle = alpha(C.ink, 0.7); ctx.lineWidth = 0.1; ctx.stroke(); }
  // Its seas, faint.
  ctx.beginPath();
  ctx.ellipse(X - 0.8, Y - 0.7, 0.8, 0.6, 0.4, 0, Math.PI * 2);
  ctx.ellipse(X + 0.9, Y + 0.4, 0.6, 0.75, -0.3, 0, Math.PI * 2);
  ctx.ellipse(X - 0.2, Y + 1.3, 0.45, 0.35, 0, 0, Math.PI * 2);
  ctx.fillStyle = alpha(C.grey, 0.35); ctx.fill();
  // The path: dashes widening toward you, each one shivering.
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const d = 5 + i * 1.9, w = 0.6 + i * 0.28;
    const j = Math.sin(t * 2.3 + i * 1.9) * 0.35 * (1 + i * 0.08);
    const len = w * (0.6 + 0.4 * Math.sin(t * 1.7 + i * 2.7));
    ctx.moveTo(X - len + j, Y + d); ctx.lineTo(X + len + j, Y + d);
  }
  ctx.strokeStyle = alpha(C.butter, qk(0.6 * n, 16)); ctx.lineWidth = 0.28; ctx.lineCap = 'round'; ctx.stroke();
  ctx.lineCap = 'butt';
}

// Registration marks round the sheet, and its caption, in cream, over the
// far bank, the stars and the moon.
export function backdrop(ctx, t, world, fx) {
  const ink = INK.cream, n = nightK(t);
  ctx.save();
  const T = tones(t), g = geo();
  stars(ctx, t, fx, n);
  moon(ctx, t, n);
  if (inView(fx, 70, 5, 160, 80)) {
    sun(ctx, t, T);
    salisburyLand(ctx, T, g);
    newburyport(ctx, t, T, g, n);
    salisbury(ctx, T, g);
    windows(ctx, t, T, g, n);
    jetty(ctx, t, T, n);
  }
  reg(ctx, (W - D) / 2, -9, ink);
  reg(ctx, (W - D) / 2, (W + D) / 2 + 8, ink);
  reg(ctx, -D - 6, D / 2, ink);
  reg(ctx, W + 6, W / 2, ink);
  const k = 40;
  ctx.translate(-D + 4, D / 2 + 20);
  ctx.scale(1 / k, 1 / k);
  ctx.font = `${0.9 * k}px "Rethink Sans", system-ui, sans-serif`;
  ctx.fillStyle = alpha(ink, 0.6);
  ctx.textBaseline = 'middle';
  ctx.fillText('SQUARES  ·  PLUM ISLAND  ·  KING TIDE TONIGHT', 0, 0);
  ctx.restore();
}

// ---------- Over the island ----------
// Clouds: a few puffy ones drifting by day, pink at sunset, kept to the open
// paper (in front of the beach and back over the mainland) so they never sit
// on the island.
const CLOUDS = [
  // x0, y, z, scale, speed, x range [a, b]
  [0, 76, 7, 2.0, 0.22, 38, 200],
  [70, 82, 6, 1.5, 0.3, 38, 200],
  [130, 74, 8, 1.7, 0.18, 38, 200],
  [10, -16, 3.5, 1.9, 0.2, -22, 72],
  [55, -20, 5, 1.4, 0.26, -22, 72],
];
const PUFFS = [[1.0, 0], [1.6, -0.35], [1.3, -0.1], [0.9, 0]];
let cloudPath = null;
function cloudShape() {
  if (cloudPath) return cloudPath;
  const p = new Path2D();
  const width = PUFFS.reduce((s, [r]) => s + r * 2, 0);
  let x = -width / 2;
  p.moveTo(x, 0);
  for (const [r, cy] of PUFFS) { p.lineTo(x, cy); p.arc(x + r, cy, r, Math.PI, Math.PI * 2); x += r * 2; }
  p.lineTo(x, 0);
  p.closePath();
  const belly = new Path2D();
  belly.rect(-width / 2 + 0.5, -0.38, width - 1, 0.38);
  cloudPath = { p, belly, width };
  return cloudPath;
}
function clouds(ctx, t, h) {
  const day = ramp(6.3, 8, h) * (1 - ramp(20.5, 21.3, h));
  if (day <= 0) return;
  const pink = qk(ramp(18.6, 20.2, h) * 0.65, 16);
  const body = mix(C.white, C.blush, pink), belly = mix(tint(C.sky, 0.45), C.lilac, pink);
  const { p, belly: bp, width } = cloudShape();
  for (const [x0, y, z, s, v, a, b] of CLOUDS) {
    const span = b - a, u = (((x0 + t * v) % span) + span) % span;
    const x = a + u, fade = day * ramp(0, 14, u) * ramp(span, span - 14, u);
    if (fade <= 0.02) continue;
    ctx.save();
    ctx.globalAlpha *= fade;
    ctx.translate(PX(x, y), PY(x, y, z));
    ctx.scale(s, s);
    if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.2 / s; ctx.lineJoin = 'round'; ctx.stroke(p); }
    ctx.fillStyle = body; ctx.fill(p);
    ctx.fillStyle = belly; ctx.fill(bp);
    ctx.restore();
  }
}

// Gulls wheeling over the beaches: over the Town Beach, the refuge beach and
// the jetty at the Point, white with an ink edge, flapping now and then.
const FLOCKS = [
  // centre x, y, z, count, radius, speed
  [84, 47, 7, 5, 3.6, 0.45],
  [24, 48, 8, 4, 3.2, -0.38],
  [103, 43, 5.5, 3, 2.4, 0.55],
];
function gulls(ctx, t, k) {
  ctx.beginPath();
  for (let f = 0; f < FLOCKS.length; f++) {
    const [cx, cy, cz, count, rad, sp] = FLOCKS[f];
    for (let i = 0; i < count; i++) {
      const a = t * sp + (i / count) * Math.PI * 2 + Math.sin(t * 0.3 + i + f) * 0.5;
      const rr = rad * (0.8 + 0.3 * Math.sin(i * 2.1 + f));
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.8, z = cz + Math.sin(t * 0.7 + i * 1.3) * 0.5;
      const X = PX(x, y), Y = PY(x, y, z);
      // Flap for a bit, glide for a bit.
      const flapping = Math.sin(t * 0.8 + i * 2.3 + f) > 0.2;
      const w = flapping ? Math.sin(t * 9 + i * 1.7) * 0.35 : 0.12;
      ctx.moveTo(X - 0.7, Y - w);
      ctx.quadraticCurveTo(X - 0.3, Y - 0.28, X, Y);
      ctx.quadraticCurveTo(X + 0.3, Y - 0.28, X + 0.7, Y - w);
    }
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = alpha(C.ink, qk(k, 8));
  ctx.lineWidth = 0.24;
  ctx.stroke();
  ctx.strokeStyle = alpha(C.white, qk(k, 8));
  ctx.lineWidth = 0.1;
  ctx.stroke();
  ctx.lineCap = 'butt';
}

// The banner plane (plum.md, "Shared universe"): a yellow Cub towing GANDER
// COLA along the beach, out over the sea in front of the island, left to
// right and back, late morning and mid afternoon. The banner reads the right
// way round both ways (a brand wants to be read). Its shadow runs on the
// sea. Exported for anyone on the beach who wants to point at it.
const RUNS = [[at(10.5), at(13.5)], [at(14.5), at(17.2)]];
const X_FROM = -8, X_TO = 205, PLANE_Z = 12;
export function planeAt(t) {
  for (const [a, b] of RUNS) {
    if (t < a || t > b) continue;
    const half = (b - a) / 2, s = t - a;
    const out = s < half, k = (out ? s : s - half) / half;
    const x = out ? X_FROM + (X_TO - X_FROM) * k : X_TO - (X_TO - X_FROM) * k;
    return { x, y: out ? 61.5 : 64.5, z: PLANE_Z + Math.sin(t * 0.9) * 0.3, dir: out ? 1 : -1 };
  }
  return null;
}
const BANNER = { gap: 3, len: 18, h: 1.7, drop: 0.6 };
const BANNER_TEXT = `${BRAND.name}  ·  ${BRAND.line}`;
function plane(ctx, t) {
  const p = planeAt(t);
  if (!p) return;
  const { x, y, z, dir } = p, L = level(t);
  // The banner trails behind: from its head (nearest the plane) to its tail.
  const head = x - dir * (1.4 + BANNER.gap), tail = head - dir * BANNER.len;
  const x0 = Math.min(head, tail), x1 = Math.max(head, tail);
  const zb = z - BANNER.drop - BANNER.h / 2;
  // Shadows on the sea: the plane's cross and the banner's strip.
  ctx.fillStyle = alpha(C.ink, 0.1);
  ctx.beginPath();
  pathPoly(ctx, [[x0, y, L], [x1, y, L], [x1, y + 0.4, L], [x0, y + 0.4, L]]);
  pathPoly(ctx, [[x - 1.3, y - 0.3, L], [x + 1.3, y - 0.3, L], [x + 1.3, y + 0.3, L], [x - 1.3, y + 0.3, L]]);
  pathPoly(ctx, [[x - 0.4, y - 2.4, L], [x + 0.4, y - 2.4, L], [x + 0.4, y + 2.4, L], [x - 0.4, y + 2.4, L]]);
  ctx.fill();
  // The tow line: a bridle from the tail to the banner's leading pole.
  ctx.beginPath();
  const tx = x - dir * 1.3;
  ctx.moveTo(PX(tx, y), PY(tx, y, z + 0.25));
  ctx.lineTo(PX(head, y), PY(head, y, zb + BANNER.h));
  ctx.moveTo(PX(tx, y), PY(tx, y, z + 0.25));
  ctx.lineTo(PX(head, y), PY(head, y, zb));
  ctx.strokeStyle = alpha(C.ink, 0.7); ctx.lineWidth = 0.05; ctx.stroke();
  // The banner, rippling more toward its tail.
  const N = 12, top = [], bot = [];
  for (let i = 0; i <= N; i++) {
    const f = i / N, bx = head - dir * BANNER.len * f;
    const wv = Math.sin(f * 7 - t * 8) * 0.18 * f;
    top.push([bx, y, zb + BANNER.h + wv]);
    bot.push([bx, y, zb + wv]);
  }
  ctx.beginPath();
  pathPoly(ctx, [...top, ...bot.reverse()]);
  ctx.fillStyle = BRAND.can; ctx.fill();
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.06; ctx.lineJoin = 'round'; ctx.stroke(); }
  // Its lettering, flat on the banner (the plane y = const).
  const u = (x0 + x1) / 2, v = zb + BANNER.h / 2 + Math.sin(3.5 - t * 8) * 0.09;
  ctx.save();
  ctx.transform(1, 0.5, 0, ZK, u - y, (u + y) / 2 - v * ZK);
  const k = 40;
  ctx.scale(1 / k, 1 / k);
  ctx.font = `${1.05 * k}px "Bagel Fat One", "Arial Black", sans-serif`;
  const tw = ctx.measureText(BANNER_TEXT).width / k, fit = Math.min(1, (BANNER.len - 1.2) / tw);
  ctx.scale(fit, 1);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = BRAND.ink;
  ctx.fillText(BANNER_TEXT, 0, 0);
  ctx.restore();
  cub(ctx, x, y, z, dir, t);
}
// The plane: a high-wing taildragger in yellow, nose toward dir.
function cub(ctx, x, y, z, dir, t) {
  const Y = C.mustard, st = { stroke: Q.lines ? C.ink : false };
  const solid = (pts, c) => { ctx.beginPath(); pathPoly(ctx, pts); ctx.fillStyle = c; ctx.fill(); if (st.stroke) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.lineJoin = 'round'; ctx.stroke(); } };
  const blk = (bx, by, bz, w, d, h, c) => {
    solid(front(bx, by, bz, w, d, h), shade(c, 0.22));
    solid([[bx + w, by, bz], [bx + w, by + d, bz], [bx + w, by + d, bz + h], [bx + w, by, bz + h]], shade(c, 0.1));
    solid([[bx, by, bz + h], [bx + w, by, bz + h], [bx + w, by + d, bz + h], [bx, by + d, bz + h]], c);
  };
  const nose = x + dir * 1.3, rear = x - dir * 1.3;
  // Tailplane and fin.
  blk(Math.min(rear, rear + dir * 0.5), y - 0.9, z + 0.3, 0.5, 1.8, 0.06, Y);
  // Wheels.
  ctx.beginPath();
  for (const wy of [y - 0.35, y + 0.35]) { const wx = x + dir * 0.5; ctx.moveTo(PX(wx, wy) + 0.14, PY(wx, wy, z - 0.3)); ctx.arc(PX(wx, wy), PY(wx, wy, z - 0.3), 0.14, 0, Math.PI * 2); }
  ctx.fillStyle = C.ink; ctx.fill();
  // The fuselage, tapering to the tail.
  const fz = z - 0.15;
  solid([[rear, y + 0.12, fz + 0.3], [nose, y + 0.3, fz], [nose, y + 0.3, fz + 0.6], [rear, y + 0.12, fz + 0.55]], shade(Y, 0.2));
  solid([[rear, y - 0.12, fz + 0.55], [nose, y - 0.3, fz + 0.6], [nose, y + 0.3, fz + 0.6], [rear, y + 0.12, fz + 0.55]], Y);
  if (dir > 0) solid([[nose, y - 0.3, fz], [nose, y + 0.3, fz], [nose, y + 0.3, fz + 0.6], [nose, y - 0.3, fz + 0.6]], shade(Y, 0.1));
  // The fin, a little sail at the back.
  solid([[rear, y, fz + 0.5], [rear + dir * 0.6, y, fz + 0.55], [rear, y, fz + 1.2]], tint(Y, 0.1));
  // A window, and the wing on top.
  solid([[x + dir * 0.2, y + 0.3, fz + 0.62], [x + dir * 0.75, y + 0.3, fz + 0.62], [x + dir * 0.7, y + 0.3, fz + 0.95], [x + dir * 0.2, y + 0.3, fz + 0.95]], tint(C.sky, 0.2));
  blk(x + (dir > 0 ? 0 : -0.9), y - 2.5, fz + 0.95, 0.9, 5, 0.1, Y);
  // The prop: a blur that flickers.
  const px = nose + dir * 0.05, s = 0.55 + Math.sin(t * 40) * 0.1;
  ctx.beginPath();
  ctx.moveTo(PX(px, y - s), PY(px, y - s, fz + 0.3 - 0.1));
  ctx.lineTo(PX(px, y + s), PY(px, y + s, fz + 0.3 + 0.1));
  ctx.strokeStyle = alpha(C.ink, 0.45); ctx.lineWidth = 0.1; ctx.stroke();
}

export function sky(ctx, t, world, fx) {
  follow(fx);
  const h = hour(t), n = nightK(t);
  clouds(ctx, t, h);
  if (n < 0.6) {
    gulls(ctx, t, 1 - n / 0.6);
    if (Q.detail) birds(ctx, t, 0, 70);
  }
  plane(ctx, t);
}
