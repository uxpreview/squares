// Terrain and water (ROADMAP E4): ground with height, and water whose level
// changes with the clock.
//
// A land is the ground of a whole map, in world units: heights sampled on a
// grid (h(x, y) reads between the points), with layers printed on it in turn
// (sand everywhere, then marsh over it, then a road over that), each the
// region where its field is above 0. Their edges are traced between the
// grid's points, like the contour lines on a chart, so they come out smooth.
// Water covers everything lower than its level, level(t), so the shoreline,
// the creeks and the flats move on their own as the tide comes and goes.
//
// A map with a land (map.land) gives each of its zones the ground: R.ground(x, y)
// in the zone's own units, for standing things on. Each zone prints its own
// part with drawLand(R, land): the ground, a still floor layer per 16 x 16
// piece (cached like any still floor), and over each piece the water, redrawn
// as the level moves.
//
// The rule that keeps it simple: ground may climb toward the viewer (down the
// screen, x and y both growing) no steeper than about 0.8 units per unit, so
// it never folds over and hides what's behind it. Then drawing the ground
// first and everything standing on it after, as every zone does, is always
// right. A jetty, a sea wall or a bank of rocks is a thing, not ground.
// steep(land) lists where a land breaks the rule (QA checks it).
//
// The water is printed like a riso ink: see-through, over the ground, so the
// sand shows under the shallows. Deep water takes a second pass.

import { ZK } from './iso.js';
import { C, Q, dots, alpha, mix, shade, tint } from './art.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// A land. o: {
//   w, d:      the map's size in world units (multiples of step)
//   step:      the grid's spacing (default 0.5; it must divide 16)
//   height(x, y):   the ground's height at a point
//   layers:    [{ id, color, field(x, y, h), edge, lw }], printed in order.
//              The first should cover everything (a field above 0 everywhere).
//              edge: an ink for a line round the layer's edge.
//   base:      how deep the plate's sides go (default -3)
//   level(t):  the water's height at t seconds (default: none)
//   top:       the highest the water ever gets (for framing; default 0)
//   lag:       how long sand stays wet after the water leaves it (s, default 18)
//   water:     inks: { color, foam, wet, side, alpha } and, for a second,
//              darker pass where it's deeper than depth: { deep, deepAlpha, depth }
//              (0 deepAlpha for none: the ground's own colors under it can
//              carry the depth, for less drawing)
//   side:      the plate's cut sides: { soil, dots }
//   rim:       false for a land with no cut sides or back edge line: its
//              edges run into the paper (a place printed on the sea, whose
//              deep water is the paper's own color)
//   paper(t):  with no rim, the paper's color at t (under the water where
//              the plate ends, it's printed in it)
// }
// water.color can be a function of t, for water whose ink follows the day.
// water.under: a height the water never drops below (under the lowest tide).
// Ground below it is always under water, so its water is printed opaque, as
// the ground's own inks mixed with the water's, and every chunk prints a
// sliver of the ground behind it too. See-through water from chunk to chunk
// leaves a faint seam where two chunks' edges meet (each edge half covers
// the pixels along it, and two half coats of a see-through ink are lighter
// than one full coat); opaque ink overlapping hides it, so the open sea
// prints in one piece.
export function makeLand(o) {
  const step = o.step || 0.5;
  const nx = Math.round(o.w / step), ny = Math.round(o.d / step);
  const W = nx + 1, N = W * (ny + 1);
  const H = new Float32Array(N);
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) H[j * W + i] = o.height(i * step, j * step);

  // Between the grid's points, the height is read off the cell around them.
  function h(x, y) {
    const fx = clamp(x / step, 0, nx), fy = clamp(y / step, 0, ny);
    const i = Math.min(nx - 1, Math.floor(fx)), j = Math.min(ny - 1, Math.floor(fy));
    const u = fx - i, v = fy - j, k = j * W + i;
    return H[k] * (1 - u) * (1 - v) + H[k + 1] * u * (1 - v) + H[k + W + 1] * u * v + H[k + W] * (1 - u) * v;
  }

  const layers = (o.layers || []).map((L) => {
    const F = new Float32Array(N);
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) F[j * W + i] = L.field(i * step, j * step, H[j * W + i]);
    return { ...L, F };
  });

  // How much the ground turns toward the sides a box shades: toward +y (the
  // face you see on the screen's left, the darker one) most, toward +x (the
  // right) a little. Turned away from you, it catches the light.
  const S = new Float32Array(N);
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      const i0 = Math.max(0, i - 1), i1 = Math.min(nx, i + 1), j0 = Math.max(0, j - 1), j1 = Math.min(ny, j + 1);
      const hx = (H[j * W + i1] - H[j * W + i0]) / ((i1 - i0) * step);
      const hy = (H[j1 * W + i] - H[j0 * W + i]) / ((j1 - j0) * step);
      S[j * W + i] = -hy - 0.45 * hx;
    }
  }

  const water = {
    color: C.water, deep: C.navy, foam: C.white, wet: C.ink, side: C.water,
    alpha: 0.5, deepAlpha: 0.3, depth: 0.8, ...(o.water || {}),
  };
  let peak = -Infinity;
  for (let k = 0; k < N; k++) if (H[k] > peak) peak = H[k];
  return {
    w: o.w, d: o.d, step, nx, ny, W, H, S, h, layers,
    peak, // the highest the ground goes
    base: o.base ?? -3,
    level: o.level || (() => -Infinity),
    top: o.top ?? 0,
    lag: o.lag ?? 18,
    water,
    side: { soil: C.woodLight, dots: C.brown, ...(o.side || {}) },
    rim: o.rim !== false,
    paper: o.paper || null,
    // The water's depth at a point (0 on dry ground), and whether it's under.
    depth: (x, y, t) => Math.max(0, (o.level ? o.level(t) : -Infinity) - h(x, y)),
    wet: (x, y, t) => (o.level ? o.level(t) : -Infinity) > h(x, y),
  };
}

// ---------- Tracing ----------
// Cells [i0, i1) x [j0, j1) of the grid, the region where f > 0: added to a
// path as polygons (whole cells merged into strips along each row), every
// point projected by P(x, y, z) at its height zv(k) (k: a grid point's index),
// or at one height for all (the water's level). Returns how many it added.
const CORNER = [[0, 0], [1, 0], [1, 1], [0, 1]];

function fill(path, land, [i0, j0, i1, j1], f, zv, P) {
  const { W, step } = land;
  let n = 0;
  const pt = (x, y, z, first) => {
    const [X, Y] = P(x, y, z);
    if (first) path.moveTo(X, Y);
    else path.lineTo(X, Y);
  };
  for (let j = j0; j < j1; j++) {
    let run = -1;
    for (let i = i0; i <= i1; i++) {
      const k = j * W + i;
      const whole = i < i1 && f(k) > 0 && f(k + 1) > 0 && f(k + W + 1) > 0 && f(k + W) > 0;
      if (whole) { if (run < 0) run = i; continue; }
      if (run >= 0) {
        for (let a = run; a <= i; a++) pt(a * step, j * step, zv(j * W + a), a === run);
        for (let a = i; a >= run; a--) pt(a * step, (j + 1) * step, zv((j + 1) * W + a), false);
        path.closePath();
        n++;
        run = -1;
      }
      if (i < i1) n += part(path, land, i, j, f, zv, pt);
    }
  }
  return n;
}

// One cell the edge runs through: its corners inside, and where the edge
// crosses its sides (a saddle keeps its two corners joined).
function part(path, land, i, j, f, zv, pt) {
  const { W, step } = land;
  const k0 = j * W + i, ks = [k0, k0 + 1, k0 + W + 1, k0 + W];
  const v = [f(ks[0]), f(ks[1]), f(ks[2]), f(ks[3])];
  if (!(v[0] > 0 || v[1] > 0 || v[2] > 0 || v[3] > 0)) return 0;
  let first = true;
  for (let c = 0; c < 4; c++) {
    const a = v[c], b = v[(c + 1) & 3], [ax, ay] = CORNER[c], [bx, by] = CORNER[(c + 1) & 3];
    if (a > 0) { pt((i + ax) * step, (j + ay) * step, zv(ks[c]), first); first = false; }
    if ((a > 0) !== (b > 0)) {
      const u = a / (a - b), za = zv(ks[c]), zb = zv(ks[(c + 1) & 3]);
      pt((i + ax + (bx - ax) * u) * step, (j + ay + (by - ay) * u) * step, za + (zb - za) * u, first);
      first = false;
    }
  }
  path.closePath();
  return 1;
}

// The edge of the same region, as line segments (for an ink line round it,
// or the foam along a shore). Returns how many.
function edges(path, land, [i0, j0, i1, j1], f, zv, P) {
  const { W, step } = land;
  let n = 0;
  const xs = [];
  for (let j = j0; j < j1; j++) {
    for (let i = i0; i < i1; i++) {
      const k0 = j * W + i, ks = [k0, k0 + 1, k0 + W + 1, k0 + W];
      const v = [f(ks[0]), f(ks[1]), f(ks[2]), f(ks[3])];
      const m = (v[0] > 0) + (v[1] > 0) + (v[2] > 0) + (v[3] > 0);
      if (m === 0 || m === 4) continue;
      xs.length = 0;
      for (let c = 0; c < 4; c++) {
        const a = v[c], b = v[(c + 1) & 3];
        if ((a > 0) === (b > 0)) continue;
        const [ax, ay] = CORNER[c], [bx, by] = CORNER[(c + 1) & 3], u = a / (a - b);
        const za = zv(ks[c]), zb = zv(ks[(c + 1) & 3]);
        xs.push([P((i + ax + (bx - ax) * u) * step, (j + ay + (by - ay) * u) * step, za + (zb - za) * u), a > 0]);
      }
      // From each place it leaves the region to the next place it comes back.
      for (let q = 0; q < xs.length; q++) {
        if (!xs[q][1]) continue;
        const [a] = xs[q], [b] = xs[(q + 1) % xs.length];
        path.moveTo(a[0], a[1]);
        path.lineTo(b[0], b[1]);
        n++;
      }
    }
  }
  return n;
}

// ---------- Printing a zone's part ----------
// Shading on the ground, over each layer: [how far it turns, how much darker
// (below 0: lighter), halftone].
const BANDS = [
  { over: 0.22, k: 0.1 },
  { over: 0.55, k: 0.2, dots: true },
  { under: -0.25, k: -0.1 },
];

// The zone's part of the land: its floor, cut on its own 16 x 16 grid (like
// its chunks), each piece a still floor layer and a moving water layer.
// o: { surf: true for a shore with breaking waves, contours: [heights] for
//      lines under the water (a chart's depth lines), fade: (t) => 0..1 and
//      inks: { layerId: color }, the same ground in other inks printed over
//      it as fade rises (the evening) }
export function drawLand(R, land, o = {}) {
  const [ox, oy, oz] = R.origin;
  const { step } = land;
  // Grid points must land on the zone's corner.
  if (Math.abs(ox / step - Math.round(ox / step)) > 1e-6 || Math.abs(oy / step - Math.round(oy / step)) > 1e-6) {
    throw new Error(`drawLand: a zone at [${ox}, ${oy}] isn't on the land's ${step}-unit grid`);
  }
  // World to the zone's own screen units.
  const P = (x, y, z) => {
    const lx = x - ox, ly = y - oy;
    return [lx - ly, (lx + ly) / 2 - (z - oz) * ZK];
  };
  const pieces = [];
  for (const rect of R.shape) {
    const [rx0, ry0, rx1, ry1] = rect;
    for (let x = Math.floor(rx0 / 16) * 16; x < rx1 - 1e-6; x += 16) {
      for (let y = Math.floor(ry0 / 16) * 16; y < ry1 - 1e-6; y += 16) {
        const r = [Math.max(rx0, x), Math.max(ry0, y), Math.min(rx1, x + 16), Math.min(ry1, y + 16)];
        if (r[2] - r[0] < 1e-6 || r[3] - r[1] < 1e-6) continue;
        const pc = piece(land, r, ox, oy);
        // Whether the zone carries on behind the piece's back edges (where
        // the chunk in front tucks its patch under the one behind).
        const has = (x, y) => R.shape.some((q) => x >= q[0] && x < q[2] && y >= q[1] && y < q[3]);
        pc.behind = { x: has(r[0] - 1e-3, (r[1] + r[3]) / 2), y: has((r[0] + r[2]) / 2, r[1] - 1e-3) };
        pieces.push(pc);
      }
    }
  }
  // Every piece's ground first, then its evening inks, then the water: the
  // room you're in caches its still floor up to the first layer that changes,
  // so the whole ground goes in one picture.
  for (const pc of pieces) {
    const [x0, y0, x1, y1] = pc.rect;
    const g = R.floor((ctx) => {
      if (!pc.ground) pc.ground = ground(land, pc.box, P, o, pc.front);
      paintGround(ctx, pc.ground);
    });
    // Drawn by its own chunk and the ones in front (whose patches tuck under it).
    g.area = [x0, y0, x1 + 0.5, y1 + 0.5];
  }
  if (o.fade && o.inks) {
    // The same ground in other inks, printed over it as fade(t) rises (and
    // skipped while it's 0, all day).
    const alt = { ...land, layers: land.layers.map((L) => ({ ...L, color: o.inks[L.id] || L.color })) };
    for (const pc of pieces) {
      const [x0, y0, x1, y1] = pc.rect;
      const e = R.floor((ctx) => {
        if (!pc.evening) pc.evening = ground(alt, pc.box, P, o, pc.front);
        paintGround(ctx, pc.evening);
      }, { fade: o.fade });
      e.area = [x0, y0, x1 + 0.5, y1 + 0.5];
    }
  }
  for (const pc of pieces) {
    // The water, over it, drawn by its own chunk only: its patch for water
    // reaches up over its back seams, where the surface stands over the
    // ground (see "Chunks" in zone.js). Water printed at the ground's height
    // (water.under) is printed like the ground instead: a floor layer, cut
    // to the ground's own patch, the sliver the chunk tucks under the one
    // behind included.
    const draw = (ctx, t) => paintWater(ctx, land, pc, P, t, o);
    const wv = land.water.under != null ? R.floor(draw, { anim: true }) : R.rug(draw, { anim: true });
    wv.area = pc.rect.slice();
  }
}

// A piece: its cells of the grid, how low and high its ground goes, and
// whether it's on the plate's front edges (its cut sides) or back ones.
function piece(land, rect, ox, oy) {
  const { step, W, H } = land;
  const [x0, y0, x1, y1] = rect;
  const box = [Math.round((ox + x0) / step), Math.round((oy + y0) / step), Math.round((ox + x1) / step), Math.round((oy + y1) / step)];
  const [i0, j0, i1, j1] = box;
  let lo = Infinity, hi = -Infinity;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const z = H[j * W + i]; lo = Math.min(lo, z); hi = Math.max(hi, z); }
  return {
    rect, box, lo, hi,
    front: { x: i1 === land.nx, y: j1 === land.ny },
    back: { x: i0 === 0, y: j0 === 0 },
    ground: null, evening: null, wet: null, sea: null, surf: null,
  };
}

// A piece's ground, traced once: each layer and its shading, the lines round
// the layers that ask for one, and the plate's cut sides.
function ground(land, box, P, o, front) {
  const { H, S } = land;
  const zv = (k) => H[k];
  const fills = [], strokes = [];
  for (const L of land.layers) {
    const F = L.F;
    const base = new Path2D();
    if (!fill(base, land, box, (k) => F[k], zv, P)) continue;
    fills.push({ path: base, color: L.color, dots: L.dots || null, density: L.density });
    if (L.flat) continue;
    for (const b of BANDS) {
      const p = new Path2D();
      const f = b.over != null ? (k) => Math.min(F[k], S[k] - b.over) : (k) => Math.min(F[k], b.under - S[k]);
      if (fill(p, land, box, f, zv, P)) fills.push({ path: p, color: b.k > 0 ? shade(L.color, b.k) : tint(L.color, -b.k), dots: b.dots ? shade(L.color, 0.45) : null });
    }
    if (L.edge) {
      const p = new Path2D();
      if (edges(p, land, box, (k) => F[k], zv, P)) strokes.push({ path: p, color: L.edge, lw: L.lw || 0.05 });
    }
  }
  // Depth lines under the water, like a chart's.
  for (const c of o.contours || []) {
    const p = new Path2D();
    if (edges(p, land, box, (k) => c - H[k], zv, P)) strokes.push({ path: p, color: o.contourInk || alpha(C.ink, 0.25), lw: 0.04, dash: true });
  }
  return { fills, strokes, sides: land.rim ? sides(land, box, P, front) : [], soil: land.side.soil, soilDots: land.side.dots };
}

// The plate's cut sides where a piece meets its front edges: soil, with the
// top layer's color in a band under the ground, and an ink line along the
// top. The face toward +y (the screen's left) is the darker, like a box's.
function sides(land, box, P, front) {
  const [i0, j0, i1, j1] = box;
  const { step, W, H, base } = land;
  const out = [];
  const face = (pts, dark) => {
    // pts: [x, y, z] along the edge, in order.
    const soil = new Path2D(), top = new Path2D(), line = new Path2D();
    const band = 0.3;
    pts.forEach(([x, y, z], k) => { const [X, Y] = P(x, y, z); k ? soil.lineTo(X, Y) : soil.moveTo(X, Y); k ? line.lineTo(X, Y) : line.moveTo(X, Y); });
    // (Its ink line runs along its top and its bottom, not up its ends: the
    // next piece carries on from there.)
    pts.forEach(([x, y], k) => { const [X, Y] = P(x, y, base); k ? line.lineTo(X, Y) : line.moveTo(X, Y); });
    for (let k = pts.length - 1; k >= 0; k--) { const [x, y] = pts[k]; const [X, Y] = P(x, y, base); soil.lineTo(X, Y); }
    soil.closePath();
    pts.forEach(([x, y, z], k) => { const [X, Y] = P(x, y, z); k ? top.lineTo(X, Y) : top.moveTo(X, Y); });
    for (let k = pts.length - 1; k >= 0; k--) { const [x, y, z] = pts[k]; const [X, Y] = P(x, y, z - band); top.lineTo(X, Y); }
    top.closePath();
    // Whichever layer is on top at the edge, in the middle of the face.
    const mid = pts[pts.length >> 1];
    const kMid = Math.round(mid[1] / step) * W + Math.round(mid[0] / step);
    let color = land.side.soil;
    for (const L of land.layers) if (L.F[kMid] > 0) color = L.color;
    out.push({ soil, top, line, color, dark });
  };
  if (front.y) {
    const pts = [];
    for (let i = i0; i <= i1; i++) pts.push([i * step, j1 * step, H[j1 * W + i]]);
    face(pts, true);
  }
  if (front.x) {
    const pts = [];
    for (let j = j0; j <= j1; j++) pts.push([i1 * step, j * step, H[j * W + i1]]);
    face(pts, false);
  }
  return out;
}

function paintGround(ctx, g) {
  for (const f of g.fills) {
    ctx.fillStyle = f.color;
    ctx.fill(f.path);
    if (f.dots && Q.detail) {
      ctx.fillStyle = dots(f.dots, f.density ?? 0.2);
      ctx.fill(f.path);
    }
  }
  if (Q.lines) {
    for (const s of g.strokes) {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.lw;
      if (s.dash) ctx.setLineDash([0.3, 0.25]);
      ctx.stroke(s.path);
      if (s.dash) ctx.setLineDash([]);
    }
  }
  for (const s of g.sides) {
    ctx.fillStyle = s.dark ? shade(g.soil, 0.2) : shade(g.soil, 0.07);
    ctx.fill(s.soil);
    if (Q.detail) {
      ctx.fillStyle = dots(g.soilDots, s.dark ? 0.24 : 0.14);
      ctx.fill(s.soil);
    }
    ctx.fillStyle = s.dark ? shade(s.color, 0.2) : shade(s.color, 0.08);
    ctx.fill(s.top);
    if (Q.lines) {
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 0.06;
      ctx.stroke(s.line);
    }
  }
}

// The water over a piece at t: sand darkened where the tide has just been,
// the water (see-through, so the ground shows under the shallows), a second
// pass where it's deep, the foam along the shore, waves on a surf beach, the
// water's side where the plate is cut, and the plate's back edge at the water.
// The level moves in steps of STEP_L (too small to see), so a piece's water
// is traced again only every few frames, not every frame.
const STEP_L = 0.004;
function paintWater(ctx, land, pc, P, t, o) {
  const L = Math.round(land.level(t) / STEP_L) * STEP_L;
  const ink = land.water;
  const { box, lo, hi } = pc;
  const [i0, j0, i1, j1] = box;
  const { H, W, step } = land;
  const zv = (k) => H[k];
  // Wet sand: between the water and the highest it's been lately.
  const Lw = Math.round((Math.max(L, land.level(t - land.lag)) + 0.08) / STEP_L) * STEP_L;
  if (Lw > lo && L < hi) {
    const key = Math.round(Lw / STEP_L) * 100000 + Math.round(L / STEP_L);
    if (!pc.wet || pc.wet.key !== key) {
      const p = new Path2D();
      pc.wet = { key, path: fill(p, land, box, (k) => Math.min(Lw - H[k], H[k] - L + 0.02), zv, P) ? p : null };
    }
    if (pc.wet.path) {
      ctx.fillStyle = alpha(ink.wet, 0.13);
      ctx.fill(pc.wet.path);
    }
  }
  const U = ink.under;
  if (L > lo) {
    const key = Math.round(L / STEP_L);
    if (!pc.sea || pc.sea.key !== key) {
      // With a floor that's always under (water.under), the see-through
      // water is printed at the ground's own height, where the opaque part
      // lines up with it; otherwise on the water's surface.
      const flat = U != null ? zv : () => L;
      const sea = new Path2D(), deep = new Path2D(), foam = new Path2D();
      // Printed at the ground's height, it's traced past the piece's edges
      // (under(), below).
      const sbox = U != null ? under(land, pc) : box;
      pc.sea = {
        key,
        sea: fill(sea, land, sbox, (k) => L - H[k], flat, P) ? sea : null,
        deep: ink.deepAlpha > 0 && L - ink.depth > lo && fill(deep, land, box, (k) => L - ink.depth - H[k], flat, P) ? deep : null,
        foam: L < hi && edges(foam, land, box, (k) => L - H[k], flat, P) ? foam : null,
      };
    }
    const s = pc.sea;
    if (!s.sides) s.sides = waterSides(land, pc, P, L, land.rim ? 0 : 1);
    // Without a rim, everything under the water where the plate ends is
    // printed in the paper's own color (the deep water is the paper), so the
    // sea runs on past the map with no edge. (Printed at the ground's height,
    // the water already covers that band.)
    if (!land.rim && land.paper && U == null) {
      ctx.fillStyle = land.paper(t);
      for (const { p } of s.sides) ctx.fill(p);
    }
    if (s.sea) {
      ctx.fillStyle = alpha(typeof ink.color === 'function' ? ink.color(t) : ink.color, ink.alpha);
      ctx.fill(s.sea);
    }
    if (s.deep) {
      ctx.fillStyle = alpha(ink.deep, ink.deepAlpha);
      ctx.fill(s.deep);
    }
    if (U != null && lo < U) paintUnder(ctx, land, pc, P, t, o);
    if (s.foam && Q.lines) {
      ctx.strokeStyle = alpha(ink.foam, 0.95);
      ctx.lineWidth = 0.09;
      ctx.stroke(s.foam);
    }
    // Waves coming in: lines of foam that roll up the beach to the shore,
    // only where the beach they roll up is in this piece. Each is the line
    // where the ground is a little under the water, traced once per height
    // (every hundredth of a unit) and kept, flat, then drawn up on the
    // water's surface (a line at one height moves up the screen as a piece).
    if (o.surf && Q.detail && L < hi && L - 0.75 > lo) {
      const cache = pc.surf || (pc.surf = new Map());
      for (let n = 0; n < 3; n++) {
        const k = (((t / 3.6 + n / 3) % 1) + 1) % 1; // 0 out at sea, 1 at the shore
        const c = Math.round((L - (1 - k) * 0.7 - 0.03) * 100) / 100;
        let p = cache.get(c);
        if (p === undefined) {
          if (cache.size > 400) cache.clear();
          p = new Path2D();
          if (!edges(p, land, box, (q) => c - H[q], () => 0, P)) p = null;
          cache.set(c, p);
        }
        if (!p) continue;
        ctx.save();
        ctx.translate(0, -L * ZK);
        ctx.strokeStyle = alpha(ink.foam, Math.min(1, k * 2.2) * 0.85);
        ctx.lineWidth = 0.05 + 0.07 * k;
        ctx.stroke(p);
        ctx.restore();
      }
    }
    // The water's side, where the plate is cut through it.
    if (land.rim) {
      for (const { p, top, along } of s.sides) {
        ctx.fillStyle = alpha(along === 'y' ? shade(ink.side, 0.15) : ink.side, 0.55);
        ctx.fill(p);
        if (Q.lines) {
          ctx.strokeStyle = C.ink;
          ctx.lineWidth = 0.06;
          ctx.stroke(top);
        }
      }
    }
  }
  // The plate's back edges: an ink line along the ground, or the water where it's over it.
  if (Q.lines && land.rim && (pc.back.x || pc.back.y)) {
    ctx.beginPath();
    if (pc.back.y) for (let i = i0; i <= i1; i++) { const [X, Y] = P(i * step, j0 * step, Math.max(H[j0 * W + i], L)); i === i0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }
    if (pc.back.x) for (let j = j0; j <= j1; j++) { const [X, Y] = P(i0 * step, j * step, Math.max(H[j * W + i0], L)); j === j0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.06;
    ctx.stroke();
  }
}

// The grid a piece's water printed at the ground's height is traced over:
// a step past its front edges (so its edge there is its patch's alone: two
// soft edges on one line thin it to a seam), and a step behind its back
// edges where the zone carries on, over the sliver its chunk tucks under the
// one behind (and prints that one's ground in).
function under(land, pc) {
  const [i0, j0, i1, j1] = pc.box;
  return [pc.behind.x ? Math.max(0, i0 - 1) : i0, pc.behind.y ? Math.max(0, j0 - 1) : j0, Math.min(land.nx, i1 + 1), Math.min(land.ny, j1 + 1)];
}

// The water over ground that's always under it (water.under), printed
// opaque: the ground's inks (and its evening inks, as far as the evening's
// in) mixed with the water's at its see-through strength, which is exactly
// what the see-through ink over that ground would make. Traced once, over
// the piece and a step of the ground behind its back edges, so it overlaps
// the chunk behind and the seam between them never shows.
function paintUnder(ctx, land, pc, P, t, o) {
  const ink = land.water;
  if (!pc.under) {
    const U = ink.under, { H } = land;
    if (!land.underF) land.underF = land.layers.map((L) => L.F.map((f, k) => Math.min(f, U - H[k])));
    const cut = (colors) => ({ ...land, layers: land.layers.map((L, n) => ({ ...L, F: land.underF[n], color: colors[L.id] || L.color, edge: null })) });
    const box = under(land, pc);
    const day = ground(cut({}), box, P, {}, pc.front);
    const eve = o.fade && o.inks ? ground(cut(o.inks), box, P, {}, pc.front) : null;
    pc.under = day.fills.map((f, n) => ({ path: f.path, day: f.color, eve: eve ? eve.fills[n].color : f.color }));
  }
  const sea = typeof ink.color === 'function' ? ink.color(t) : ink.color;
  const k = o.fade && o.inks ? Math.round(o.fade(t) * 64) / 64 : 0;
  // Each layer over the first is outlined in its own ink too, a device pixel
  // or so wide: the graphics chip leaves hairline cracks where a layer's
  // pieces meet along its edge, and the layer under it showed through.
  const lw = 1 / (Q.pxPerUnit || 20);
  pc.under.forEach((f, n) => {
    const c = mix(k ? mix(f.day, f.eve, k) : f.day, sea, ink.alpha);
    ctx.fillStyle = c;
    ctx.fill(f.path);
    if (n) { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.stroke(f.path); }
  });
}

// Where a piece's water is cut by the plate's front edges: a band from the
// ground up to the level along each, and its top line.
function waterSides(land, pc, P, L, under = 0) {
  const [i0, j0, i1, j1] = pc.box;
  const { H, W, step } = land;
  const out = [];
  for (const [on, along] of [[pc.front.y, 'y'], [pc.front.x, 'x']]) {
    if (!on) continue;
    const p = new Path2D(), top = new Path2D();
    let open = false, any = false;
    const n = along === 'y' ? i1 - i0 : j1 - j0;
    const at = (q) => (along === 'y' ? [(i0 + q) * step, j1 * step, H[j1 * W + i0 + q]] : [i1 * step, (j0 + q) * step, H[(j0 + q) * W + i1]]);
    // Runs of the edge that are under water, each a band from the ground up to the level.
    let run = [];
    const flush = () => {
      if (run.length < 2) { run = []; return; }
      run.forEach(([x, y], q) => { const [X, Y] = P(x, y, L); q ? p.lineTo(X, Y) : p.moveTo(X, Y); q ? top.lineTo(X, Y) : top.moveTo(X, Y); });
      for (let q = run.length - 1; q >= 0; q--) { const [x, y, z] = run[q]; const [X, Y] = P(x, y, Math.min(z, L) - under); p.lineTo(X, Y); }
      p.closePath();
      any = true;
      run = [];
    };
    for (let q = 0; q <= n; q++) {
      const [x, y, z] = at(q);
      if (z < L) {
        if (!open && q > 0) {
          // Where it goes under, part way along the step.
          const [px, py, pz] = at(q - 1), u = (L - pz) / (z - pz);
          run.push([px + (x - px) * u, py + (y - py) * u, L]);
        }
        run.push([x, y, z]);
        open = true;
      } else if (open) {
        const [px, py, pz] = at(q - 1), u = (L - pz) / (z - pz);
        run.push([px + (x - px) * u, py + (y - py) * u, L]);
        flush();
        open = false;
      }
    }
    flush();
    if (any) out.push({ p, top, along });
  }
  return out;
}

// ---------- Helpers for what stands on it ----------
// Something standing in the water (a wader, a swimmer, a seal on a rock at
// high tide), in the zone's units: drawn only above the water line, with a
// ring of ripples where it meets it. z: where its feet are; L: the water's
// level; draw(ctx): it, drawn as usual. r: the ring's size.
export function wade(ctx, x, y, z, L, draw, r = 0.45) {
  if (!(L > z + 0.02)) { draw(ctx); return; }
  const X = x - y, Y = (x + y) / 2 - L * ZK;
  ctx.save();
  ctx.beginPath();
  ctx.rect(X - 40, Y - 80, 80, 80);
  ctx.clip();
  draw(ctx);
  ctx.restore();
  if (!Q.lines) return;
  ctx.beginPath();
  ctx.ellipse(X, Y, r * 1.4, r * 0.7, 0, 0, Math.PI * 2);
  ctx.strokeStyle = alpha(C.white, 0.9);
  ctx.lineWidth = 0.06;
  ctx.stroke();
}

// Where a land climbs toward the viewer too steeply to draw ground-first (see
// the top of this file): a list of world points, a few units apart.
export function steep(land, max = 0.8) {
  const { nx, ny, W, H, step } = land;
  const out = [];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const rise = (H[(j + 1) * W + i + 1] - H[j * W + i]) / step;
      if (rise <= max) continue;
      const x = (i + 0.5) * step, y = (j + 0.5) * step;
      if (!out.some((p) => Math.abs(p[0] - x) < 3 && Math.abs(p[1] - y) < 3)) out.push([x, y, rise]);
    }
  }
  return out;
}
