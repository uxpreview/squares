// The Refuge Beach: the refuge's ocean beach, closed from April to August for
// the piping plovers (docs/levels/plum.md). Miles of empty sand for six birds
// on one side of a rope, and everyone else packed onto the open stretch at
// the Lot 1 boardwalk on the other. The plover warden, a volunteer, moves the
// rope out a little every hour, and the crowd shuffles back each time, towels
// and all (the sleeper gets dragged, the umbrella gets carried). Sandy Point
// at the far end is a state beach, open, with its own roped nest, a kite and
// a man fishing the surf. After dark it's the quietest place on the island:
// the warden's headlamp on her last round, then nothing but the tide.
//
// World units, like land.js (the area's box is x 0 to 48, y 44 to 58).
import { C, Q, folk, person, box, disc, paint, paintText, mix, tint, shade, alpha } from '../../../engine/art.js';
import { ZK } from '../../../engine/iso.js';
import { drawLand, wade } from '../../../engine/terrain.js';
import { land, float, h } from '../land.js';
import { LOOP, level, hour, at, nightK, sunsetWatch, lowTide } from '../tide.js';
import { EVENING, INK, LIT, BRAND } from '../style.js';
import { umbrella, board, boat } from '../kit.js';
import { aside } from '../swarm.js';

const P = (x, y, z) => [x - y, (x + y) / 2 - z * ZK];
const wrap = (t) => (((t % LOOP) + LOOP) % LOOP);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (k) => k * k * (3 - 2 * k);
// A flat shape through world points, filled and outlined.
function shape(ctx, pts, fill, o) {
  ctx.beginPath();
  pts.forEach((p, i) => { const [X, Y] = P(...p); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
  ctx.closePath();
  paint(ctx, fill, o);
}
const between = (t, a, b) => { const hr = hour(t); return hr >= a && hr < b; };

// ---------- The rope ----------
// Across the beach at x, moved out toward the crowd a step every hour from
// 7am to 7pm (each move takes a couple of seconds), and back overnight.
const rope = (t) => 33.4 + 0.36 * Math.max(0, Math.min(12, Math.floor(hour(t) - 7) + Math.min(1, ((hour(t) % 1) / 0.15))));
// The same hourly steps for anyone following the rope, a little late (delay,
// in hours) and a little slower (dur): how many steps so far, and whether
// they're in the middle of one.
function steps(t, delay = 0, dur = 0.15) {
  const hr = hour(t) - 7 - delay, n = Math.floor(hr), f = hr - n;
  const v = Math.max(0, Math.min(12, n + Math.min(1, f / dur)));
  return { v, moving: n >= 0 && n < 12 && f < dur };
}
// Where the water's edge is along the beach at x, for a level L: the first
// spot out from the dunes where the ground dips under it.
// (Remembered for the current level, by the half unit along x: many things
// ask every frame.)
const edges = new Map();
let edgeL = NaN;
function edge(x, L) {
  if (L !== edgeL) { edges.clear(); edgeL = L; }
  const key = Math.round(x * 2);
  let y = edges.get(key);
  if (y === undefined) {
    const xx = key / 2;
    y = 57.5;
    for (let yy = 44; yy < 57.5; yy += 0.25) if (h(xx, yy) < L) { y = yy; break; }
    edges.set(key, y);
  }
  return y;
}

// ---------- Inks ----------
const PLOVER = mix(INK.sand, C.grey, 0.5);
const CHALK = shade(C.green, 0.55);
const STAKE = tint(C.woodLight, 0.25);
const SANDPILE = shade(INK.sand, 0.12);
const WETSAND = mix(INK.sand, C.brown, 0.18);

// ---------- Small pieces ----------
// A piping plover: sand on top, white below, a black collar, orange legs and
// bill. Runs, stops, runs. o: { dir, run, sit }
function plover(ctx, x, y, z, t, o = {}) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(o.dir === 'l' ? -1.45 : 1.45, 1.45);
  if (Q.detail) {
    ctx.beginPath(); ctx.ellipse(0, 0, 0.17, 0.06, 0, 0, Math.PI * 2);
    ctx.fillStyle = alpha(C.ink, 0.16); ctx.fill();
  }
  const by = o.sit ? -0.1 : -0.21;
  if (!o.sit) {
    const s = o.run ? Math.sin(t * 34) * 0.07 : 0;
    ctx.beginPath(); ctx.moveTo(-0.02, by + 0.05); ctx.lineTo(-0.02 + s, 0); ctx.moveTo(0.04, by + 0.05); ctx.lineTo(0.04 - s, 0);
    ctx.strokeStyle = C.coral; ctx.lineWidth = 0.035; ctx.stroke();
  }
  ctx.beginPath(); ctx.ellipse(0, by, 0.17, 0.1, -0.08, 0, Math.PI * 2);
  paint(ctx, PLOVER, { lw: 0.025 });
  ctx.beginPath(); ctx.ellipse(0.03, by + 0.045, 0.12, 0.05, 0, 0, Math.PI * 2);
  paint(ctx, C.white, { stroke: false });
  ctx.beginPath(); ctx.arc(0.13, by - 0.1, 0.075, 0, Math.PI * 2);
  paint(ctx, PLOVER, { lw: 0.025 });
  // The collar, the bill and an eye.
  ctx.beginPath(); ctx.moveTo(0.06, by - 0.04); ctx.quadraticCurveTo(0.12, by - 0.01, 0.19, by - 0.05);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.035; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0.19, by - 0.12); ctx.lineTo(0.27, by - 0.1); ctx.lineTo(0.19, by - 0.08); ctx.closePath();
  ctx.fillStyle = C.coral; ctx.fill();
  if (Q.detail) { ctx.beginPath(); ctx.arc(0.15, by - 0.12, 0.018, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill(); }
  ctx.restore();
}

// Someone on the beach, cut at the waterline when they're in it.
function guy(ctx, x, y, z, look, o, t) {
  const L = level(t);
  const draw = (g) => person(g, x, y, z, { ...look, ...o }, t);
  if (L > z + 0.05) wade(ctx, x, y, z, L, draw);
  else draw(ctx);
}
// Things held out in front (person's hold): a rolled towel, a clipboard, a
// book, a bucket.
const roll = (color) => (g) => { g.beginPath(); g.roundRect(-0.1, -0.1, 0.52, 0.22, 0.1); paint(g, color, { lw: 0.04 }); };
const clipboard = (g) => {
  g.beginPath(); g.rect(-0.02, -0.26, 0.3, 0.38); paint(g, C.wood, { lw: 0.035 });
  g.beginPath(); g.rect(0.03, -0.2, 0.2, 0.28); paint(g, C.white, { stroke: false });
};
const book = (color) => (g) => { g.beginPath(); g.rect(-0.02, -0.22, 0.28, 0.3); paint(g, color, { lw: 0.035 }); };
const pail = (g) => { g.beginPath(); g.moveTo(-0.05, -0.1); g.lineTo(0.25, -0.1); g.lineTo(0.2, 0.18); g.lineTo(0, 0.18); g.closePath(); paint(g, C.coral, { lw: 0.035 }); };
// Arms forward, walking: carrying something.
const carrying = (hold, dir, back) => ({ pose: 'walk', arms: [1.25, 1.1], hold, dir, back });

// A towel lying on the sand, w along x and d along y from (x, y), with a stripe.
function towel(ctx, x, y, z, w, d, color) {
  shape(ctx, [[x, y, z + 0.02], [x + w, y, z + 0.02], [x + w, y + d, z + 0.02], [x, y + d, z + 0.02]], color, { lw: 0.03 });
  if (Q.detail) shape(ctx, [[x + w * 0.2, y, z + 0.02], [x + w * 0.32, y, z + 0.02], [x + w * 0.32, y + d, z + 0.02], [x + w * 0.2, y + d, z + 0.02]], C.white, { stroke: false });
}
// A towel for someone lying down: long across the screen, so along (1, -1).
function bed(ctx, x, y, z, color) {
  const a = 0.62, b = 0.36;
  shape(ctx, [[x - a - b, y + a - b, z + 0.02], [x + a - b, y - a - b, z + 0.02], [x + a + b, y - a + b, z + 0.02], [x - a + b, y + a + b, z + 0.02]], color, { lw: 0.03 });
  if (Q.detail) {
    const s = 0.3;
    shape(ctx, [[x + s - b, y - s - b, z + 0.02], [x + s + 0.12 - b, y - s - 0.12 - b, z + 0.02], [x + s + 0.12 + b, y - s - 0.12 + b, z + 0.02], [x + s + b, y - s + b, z + 0.02]], C.white, { stroke: false });
  }
}
// A low beach chair, facing the sea (lower left), striped.
function chair(ctx, x, y, z, color) {
  if (Q.lines) {
    ctx.beginPath();
    for (const [dx, dy] of [[-0.3, -0.25], [0.3, -0.25], [-0.3, 0.25], [0.3, 0.25]]) { const [a, b] = P(x + dx, y + dy, z), [c, e] = P(x + dx, y + dy, z + 0.32); ctx.moveTo(a, b); ctx.lineTo(c, e); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
  }
  shape(ctx, [[x - 0.34, y - 0.28, z + 0.32], [x + 0.34, y - 0.28, z + 0.32], [x + 0.34, y + 0.3, z + 0.3], [x - 0.34, y + 0.3, z + 0.3]], color, { lw: 0.03 });
  shape(ctx, [[x - 0.34, y - 0.28, z + 0.32], [x + 0.34, y - 0.28, z + 0.32], [x + 0.34, y - 0.5, z + 1.05], [x - 0.34, y - 0.5, z + 1.05]], tint(color, 0.15), { lw: 0.03 });
  if (Q.detail) shape(ctx, [[x - 0.06, y - 0.28, z + 0.33], [x + 0.08, y - 0.28, z + 0.33], [x + 0.08, y - 0.5, z + 1.05], [x - 0.06, y - 0.5, z + 1.05]], C.white, { stroke: false });
}
// The brand's one appearance here: a Gander Cola cooler.
function cooler(ctx, x, y, z) {
  box(ctx, x - 0.3, y - 0.2, z, 0.6, 0.4, 0.4, BRAND.can, { flat: true, lw: 0.035 });
  box(ctx, x - 0.32, y - 0.22, z + 0.4, 0.64, 0.44, 0.07, BRAND.ink, { flat: true, lw: 0.03 });
  if (Q.detail) {
    ctx.save();
    const [dx, dy] = P(0, y + 0.2, 0);
    ctx.translate(dx, dy);
    paintText(ctx, 'right', x, z + 0.2, 'GANDER', 0.13, BRAND.ink, 'Bagel Fat One');
    ctx.restore();
  }
}
// A board with several rows of lettering: rows [text, dz, size, ink].
function plaque(ctx, along, x, y, z, w, hgt, rows, o = {}) {
  board(ctx, along, x, y, z, w, hgt, null, o);
  if (!Q.detail) return;
  ctx.save();
  const [dx, dy] = along === 'x' ? P(0, y, 0) : P(x, 0, 0);
  ctx.translate(dx, dy);
  for (const [text, dz, size, ink] of rows) paintText(ctx, along === 'x' ? 'right' : 'left', along === 'x' ? x : y, z + dz, text, size, ink || o.ink || C.ink, o.font || 'Rethink Sans');
  ctx.restore();
}
// A post, for fences, ropes and signs.
const post = (ctx, x, y, z, hgt, color = C.wood) => box(ctx, x - 0.05, y - 0.05, z, 0.1, 0.1, hgt, color, { flat: true, lw: 0.025 });

// A plover hide: a little canvas tent the volunteers watch the nests from,
// a flap on the front (k: 0 shut, 1 rolled up) and a slit to look through.
// It stands in the king tide like anything else: only what's above the water.
const CANVAS = mix(INK.sand, C.green, 0.35);
function hide(ctx, x, y, t, k, inside) {
  const g = h(x, y), L = level(t), zb = Math.max(g, L - 0.02), top = g + 1.2;
  const x0 = x - 0.55, y0 = y - 0.5, x1 = x + 0.55, y1 = y + 0.5;
  box(ctx, x0, y0, zb, 1.1, 1.0, top - zb, CANVAS, { flat: true, lw: 0.035, left: shade(CANVAS, 0.12), right: shade(CANVAS, 0.25) });
  // The roof, up to a point.
  shape(ctx, [[x1, y0, top], [x1, y1, top], [x, y, top + 0.45]], shade(CANVAS, 0.3), { lw: 0.03 });
  shape(ctx, [[x0, y1, top], [x1, y1, top], [x, y, top + 0.45]], tint(CANVAS, 0.1), { lw: 0.03 });
  // The slit, and the doorway: dark inside, the flap rolled up k of the way.
  const d0 = x - 0.3, d1 = x + 0.3, dz0 = Math.max(g + 0.05, zb), dz1 = g + 0.78;
  shape(ctx, [[x0 + 0.12, y1, g + 0.86], [x1 - 0.12, y1, g + 0.86], [x1 - 0.12, y1, g + 0.94], [x0 + 0.12, y1, g + 0.94]], C.ink, { stroke: false });
  if (dz1 > dz0) {
    shape(ctx, [[d0, y1, dz0], [d1, y1, dz0], [d1, y1, dz1], [d0, y1, dz1]], shade(CANVAS, 0.7), { lw: 0.025 });
    if (inside) inside(ctx, g);
    const fz = Math.max(dz0, dz1 - (dz1 - dz0) * (1 - k));
    if (fz < dz1 - 0.02) shape(ctx, [[d0, y1 + 0.01, fz], [d1, y1 + 0.01, fz], [d1, y1 + 0.01, dz1], [d0, y1 + 0.01, dz1]], shade(CANVAS, 0.06), { lw: 0.025 });
    if (k > 0.1) {
      const [a, b] = P(d0, y1 + 0.02, fz), [c, e] = P(d1, y1 + 0.02, fz);
      ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, e);
      ctx.strokeStyle = shade(CANVAS, 0.35); ctx.lineWidth = 0.09; ctx.lineCap = 'round'; ctx.stroke();
    }
  }
  plaque(ctx, 'x', x, y1 + 0.01, g + 1.08, 0.8, 0.18, [['PLOVER WATCH', 0, 0.075]], { board: C.white, edge: 0.02 });
}

// ---------- Coming and going ----------
// Everyone walks down Lot 1's boardwalk in the morning and back up it after
// the sunset. visit() says where someone is: walking in from the foot of the
// boardwalk to their spot, at their spot, walking out, or away.
const FOOT = [40, 44.05];
function visit(spot, arr, leave, t, foot = FOOT) {
  const T = wrap(t), [bx, by] = spot(t);
  const tA = at(arr), tL = at(leave);
  const dur = Math.hypot(bx - foot[0], by - foot[1]) / 1.2 + 0.4;
  if (T < tA || T >= tL + dur) return { x: bx, y: by, phase: 'away' };
  if (T < tA + dur || T >= tL) {
    const inn = T < tA + dur, k = clamp(inn ? (T - tA) / dur : (T - tL) / dur, 0, 1);
    const [x0, y0, x1, y1] = inn ? [foot[0], foot[1], bx, by] : [bx, by, foot[0], foot[1]];
    const dX = (x1 - x0) - (y1 - y0), dY = (x1 - x0) + (y1 - y0);
    return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k, phase: inn ? 'in' : 'out', dir: dX >= 0 ? 'r' : 'l', back: dY < 0 };
  }
  return { x: bx, y: by, phase: 'here' };
}
// A group on the open stretch: its spot follows the rope back, step by step
// (f: how much of each step reaches them; the crowd squeezes up toward the
// Center's end), and it gives the greenhead man a wide berth.
const LEAVE = 20.9; // the sunset's over
function crowd(g, t) {
  const st = steps(t, g.lag, 0.22);
  const p = visit((tt) => [g.x + 0.36 * g.f * steps(tt, g.lag, 0.22).v, g.y], g.arr, LEAVE + g.lag * 0.5, t);
  p.moving = st.moving;
  p.watch = sunsetWatch(t);
  p.ax = 0; p.ay = 0; p.swat = false;
  if (p.phase === 'here') {
    const a = aside(p.x, p.y, t, 4);
    p.ax = a.dx; p.ay = Math.max(44.4 - p.y, a.dy); p.swat = a.k > 0.3;
  }
  return p;
}
// A pose for someone at their spot: facing the marsh at sunset, swatting
// greenheads when he's near, otherwise whatever they're doing.
const WATCH = { pose: 'stand', dir: 'r', back: true };
const SWAT = (dir) => ({ pose: 'wave', dir, speed: 16 });

export default {
  id: 'refuge-beach',
  name: 'The Refuge Beach',
  blurb: 'Three miles of beach for six plovers, and a rope. Everyone else gets the other side, and it shrinks every hour.',
  home: [30, 47],
  build(R) {
    drawLand(R, land, { fade: nightK, inks: EVENING, surf: true });

    // ================= The closed beach =================
    // Symbolic fencing along the dune toe: posts and a string, the whole way.
    // (Posts on the chunk seams at 16 and 32, so no span crosses one.)
    const FY = 44.35;
    for (let x = 10; x < 32; x += 2) {
      const x1 = x + 2;
      R.thing(x1, FY + 0.05, (ctx) => {
        const z0 = h(x, FY), z1 = h(x1, FY);
        post(ctx, x, FY, z0, 0.75);
        if (Q.lines) {
          const [a, b] = P(x, FY, z0 + 0.62), [c, e] = P(x1, FY, z1 + 0.62), [m, n] = P(x + 1, FY, (z0 + z1) / 2 + 0.52);
          ctx.beginPath(); ctx.moveTo(a, b); ctx.quadraticCurveTo(m, n, c, e);
          ctx.strokeStyle = C.white; ctx.lineWidth = 0.04; ctx.stroke();
        }
        // A little AREA CLOSED card on every other post.
        if (x % 4 === 2) plaque(ctx, 'x', x, FY + 0.06, z0 + 0.5, 0.42, 0.28, [['AREA', 0.06, 0.08], ['CLOSED', -0.05, 0.08]], { board: C.white, edge: 0.025 });
      });
    }
    R.thing(32.05, FY + 0.05, (ctx) => post(ctx, 32, FY, h(32, FY), 0.75));

    // The big sign, for the whole three miles.
    R.thing(26.5 + 1.4, 44.3, (ctx) => {
      const z = h(26.5, 44.2);
      post(ctx, 25.4, 44.2, z, 2.2); post(ctx, 27.6, 44.2, z, 2.2);
      plaque(ctx, 'x', 26.5, 44.26, z + 1.75, 2.8, 1.25, [
        ['BEACH  CLOSED', 0.3, 0.34, C.coral],
        ['PLOVERS  NESTING', -0.06, 0.2],
        ['NO  EXCEPTIONS', -0.34, 0.2],
      ], { board: C.white, font: 'Bagel Fat One' });
    });
    // And a town sign for the town that has the beach.
    R.thing(14 + 0.9, 44.5, (ctx) => {
      const z = h(14, 44.4);
      post(ctx, 13.4, 44.4, z, 1.6); post(ctx, 14.6, 44.4, z, 1.6);
      plaque(ctx, 'x', 14, 44.46, z + 1.3, 1.6, 0.8, [['PLOVER  BEACH', 0.14, 0.2, C.white], ['POP.  6', -0.18, 0.2, C.white]], { board: C.green, font: 'Bagel Fat One' });
    });
    // By the rope, facing the crowd.
    R.thing(31.8, 44.5, (ctx) => {
      const z = h(31, 44.4);
      post(ctx, 30.5, 44.4, z, 1.2); post(ctx, 31.5, 44.4, z, 1.2);
      plaque(ctx, 'x', 31, 44.46, z + 1.0, 1.3, 0.6, [['SYMBOLIC FENCE', 0.12, 0.15], ['REAL FINE', -0.12, 0.15, C.coral]], { board: C.white });
    });

    // A nest in its wire cage, a plover sitting tight on it.
    const NEST = [18.6, 45];
    R.thing(NEST[0] + 0.5, NEST[1] + 0.5, (ctx) => {
      const [nx, ny] = NEST, z = h(nx, ny);
      const cage = [[nx - 0.5, ny - 0.5], [nx + 0.5, ny - 0.5], [nx + 0.5, ny + 0.5], [nx - 0.5, ny + 0.5]];
      for (const [x, y] of cage.slice(0, 2)) post(ctx, x, y, z, 0.7, C.grey);
      plover(ctx, nx, ny, z, 0, { sit: true, dir: 'r' });
      for (const [x, y] of cage.slice(2)) post(ctx, x, y, z, 0.7, C.grey);
      if (Q.lines) {
        ctx.strokeStyle = alpha(C.ink, 0.55); ctx.lineWidth = 0.02; ctx.beginPath();
        for (const zz of [0.25, 0.5, 0.7]) cage.forEach(([x, y], i) => { const [X, Y] = P(x, y, z + zz); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
        ctx.closePath(); ctx.stroke();
      }
    });

    // The other five plovers, and all the rest of the beach: running the
    // water's edge, stopping dead, running again.
    for (let i = 0; i < 5; i++) {
      const x0 = 11 + i * 4.1, per = 1.3 + i * 0.13;
      R.mover((t) => {
        const u = (t + i * 1.7) / per, n = Math.floor(u), f = u - n;
        const run = f < 0.45, go = n + Math.min(1, f / 0.45);
        const span = 3.2, s = (go * 0.55) % (span * 2), back = s > span;
        const x = x0 + (back ? span * 2 - s : s);
        const L = level(t), y = clamp(edge(x, L) - 0.35 + Math.sin(t * 0.9 + i * 2) * 0.45, 44.3, 56);
        return { x, y, run, dir: back ? 'l' : 'r' };
      }, (ctx, t, p) => plover(ctx, p.x, p.y, h(p.x, p.y), t, { run: p.run, dir: p.dir }));
    }

    // Two plover hides inside the rope, where the volunteers watch the nests.
    // In one, a birder with binoculars counting plovers. The other has been
    // taken over by the goose, sitting on what it is sure is a nest: its
    // tail pokes out of the side and an orange foot out under the flap, and
    // the plovers aren't fooled. Tap the flap and it rolls up.
    const HB = [21.2, 45.3], HA = [23.4, 45.3];
    const birder = R.poke({ id: 'hide', at: [HB[0], HB[1] + 0.4, h(...HB) + 0.6], r: 0.8, hold: 2.2, say: ['Shh. Counting plovers.', 'Still six. Shh.', 'You made me lose count.'] });
    const nest = R.poke({ id: 'goose-hide', at: [HA[0], HA[1] + 0.4, h(...HA) + 0.6], r: 0.8, sound: 'clunk', say: 'HONK?' });
    R.thing(HB[0], HB[1], (ctx, t) => hide(ctx, HB[0], HB[1], t, birder.k(), (g, gz) => {
      // Binoculars at the slit, always; a face behind them with the flap up.
      const k = birder.k(), [X, Y] = P(HB[0], HB[1] + 0.5, gz + 0.9);
      if (k > 0.3) { const [fx, fy] = P(HB[0], HB[1] + 0.5, gz + 0.5); g.beginPath(); g.arc(fx, fy, 0.16, 0, Math.PI * 2); paint(g, C.blush, { lw: 0.025 }); }
      for (const dx of [-0.09, 0.09]) { g.beginPath(); g.arc(X + dx, Y, 0.065, 0, Math.PI * 2); paint(g, C.ink, { lw: 0.02 }); if (Q.detail) { g.beginPath(); g.arc(X + dx - 0.02, Y - 0.02, 0.02, 0, Math.PI * 2); g.fillStyle = C.white; g.fill(); } }
    }), { anim: true, depth: HB[0] + HB[1] });
    R.thing(HA[0], HA[1], (ctx, t) => {
      const k = nest.k();
      hide(ctx, HA[0], HA[1], t, k);
      if (k > 0.4) return;
      // The tell: a white tail tip out through the right side, a foot under the flap.
      // (Both drawn on the ground's planes, so they stick out of the tent, not onto it.)
      const g = h(...HA), xr = HA[0] + 0.55, ty = HA[1] - 0.1, wag = 0.03 * Math.sin(t * 1.6);
      shape(ctx, [[xr, ty - 0.2, g + 0.58], [xr + 0.28, ty - 0.12, g + 0.66 + wag], [xr + 0.5, ty - 0.06, g + 0.78 + wag], [xr + 0.36, ty + 0.02, g + 0.6 + wag], [xr, ty + 0.12, g + 0.36]], C.white, { lw: 0.035 });
      if (Q.detail) shape(ctx, [[xr + 0.3, ty - 0.08, g + 0.68 + wag], [xr + 0.5, ty - 0.06, g + 0.78 + wag], [xr + 0.38, ty - 0.01, g + 0.64 + wag]], C.greyLight, { stroke: false });
      // A webbed foot, flat on the sand, three toes spread toward you.
      const fx = HA[0] + 0.12, fy = HA[1] + 0.5, fz = Math.max(g, level(t)) + 0.02;
      shape(ctx, [[fx - 0.04, fy, fz], [fx - 0.2, fy + 0.3, fz], [fx - 0.06, fy + 0.26, fz], [fx + 0.02, fy + 0.38, fz], [fx + 0.1, fy + 0.25, fz], [fx + 0.26, fy + 0.28, fz], [fx + 0.06, fy, fz]], C.coral, { lw: 0.03 });
    }, { anim: true, depth: HA[0] + HA[1] });
    // The goose, on its nest in the doorway, honking now and then once it's
    // been found out. At the king tide it floats in there.
    R.goose((t) => {
      const k = nest.k(), x = HA[0], y = HA[1] + 0.42, g = h(x, y), wet = level(t) > g + 0.05;
      return { x, y, z: float(x, y, t), dir: 'l', hidden: k < 0.3, pose: wet ? 'swim' : k > 0.6 && Math.sin(t / 1.7) > 0.7 ? 'honk' : 'sit' };
    }, { kind: 'poke', inside: nest, hint: 'Two hides for watching the plovers, and one of them has feet.' });

    // A sandcastle inside the rope (built at dawn, before the rope moved),
    // with its moat and a flag. The footprints go back to where the crowd was.
    const CASTLE = [29.4, 45];
    R.thing(CASTLE[0] + 0.5, CASTLE[1] + 0.5, (ctx) => {
      const [cx, cy] = CASTLE, z = h(cx, cy);
      disc(ctx, cx, cy, z + 0.01, 0.55, shade(INK.sand, 0.22), { lw: 0.03 });
      disc(ctx, cx, cy, z + 0.02, 0.42, SANDPILE, { lw: 0.03 });
      const tower = (x, y, s, tall) => {
        box(ctx, x - s, y - s, z, s * 2, s * 2, tall, WETSAND, { flat: true, lw: 0.03, left: shade(WETSAND, 0.2), right: shade(WETSAND, 0.08) });
        if (Q.detail) for (const [dx, dy] of [[-s, -s], [s - 0.06, -s], [-s, s - 0.06], [s - 0.06, s - 0.06]]) box(ctx, x + dx, y + dy, z + tall, 0.06, 0.06, 0.07, WETSAND, { flat: true, lw: 0.02 });
      };
      tower(cx - 0.18, cy - 0.18, 0.12, 0.42);
      box(ctx, cx - 0.22, cy - 0.22, z, 0.44, 0.44, 0.24, WETSAND, { flat: true, lw: 0.03, left: shade(WETSAND, 0.2), right: shade(WETSAND, 0.08) });
      tower(cx + 0.16, cy - 0.16, 0.1, 0.34);
      tower(cx - 0.16, cy + 0.16, 0.1, 0.34);
      tower(cx + 0.14, cy + 0.14, 0.12, 0.3);
      tower(cx, cy, 0.1, 0.58);
      post(ctx, cx, cy, z + 0.58, 0.3, C.white);
      shape(ctx, [[cx, cy, z + 0.88], [cx + 0.26, cy - 0.02, z + 0.8], [cx, cy, z + 0.72]], C.coral, { lw: 0.025 });
    });
    R.thing(CASTLE[0] + 0.8, CASTLE[1] + 0.6, (ctx) => {
      if (!Q.detail) return;
      ctx.fillStyle = alpha(shade(INK.sand, 0.4), 0.55);
      for (let k = 0; k < 9; k++) {
        const x = CASTLE[0] + 0.8 + k * 0.45, y = CASTLE[1] + 0.35 + Math.sin(k * 1.3) * 0.15 + (k % 2) * 0.12;
        const [X, Y] = P(x, y, h(x, y));
        ctx.beginPath(); ctx.ellipse(X, Y, 0.07, 0.035, 0, 0, Math.PI * 2); ctx.fill();
      }
    }, { on: (t) => level(t) < 0.55 });

    // ================= The rope =================
    // Posts every 1.2 units from the dunes into the water, the rope sagging
    // between them. Each span is its own thing, so people sort in front of
    // it or behind it properly. On the second post, a sign for the crowd.
    const RY = 44.2, SPAN = 1.2;
    for (let k = 0; k < 7; k++) {
      const y0 = RY + k * SPAN, y1 = y0 + SPAN;
      R.mover((t) => ({ x: rope(t), y: y1 }), (ctx, t, p) => {
        const L = level(t), end = edge(p.x, L) + 1.2;
        if (y0 > end) return;
        const z0 = h(p.x, y0);
        post(ctx, p.x, y0, Math.max(z0, L - 0.2), 0.95 - Math.max(0, L - 0.2 - z0));
        if (k === 3) plaque(ctx, 'y', p.x + 0.07, y0 + 0.1, z0 + 0.62, 0.9, 0.42, [['KEEP OUT', 0.07, 0.13, C.coral], ['(ROPE MAY MOVE)', -0.1, 0.08]], { board: C.white, edge: 0.03 });
        if (y1 <= end && k === 6) post(ctx, p.x, y1, Math.max(h(p.x, y1), L - 0.2), 0.95);
        if (!Q.lines) return;
        const za = Math.max(z0, L) + 0.85, zb = Math.max(h(p.x, y1), L) + 0.85;
        const [a, b] = P(p.x, y0, za), [c, e] = P(p.x, y1, zb), [m, n] = P(p.x, (y0 + y1) / 2, (za + zb) / 2 - 0.14);
        ctx.beginPath(); ctx.moveTo(a, b); ctx.quadraticCurveTo(m, n, c, e);
        ctx.strokeStyle = C.coral; ctx.lineWidth = 0.06; ctx.stroke();
      }, { depth: (t) => rope(t) + y1 });
    }

    // The warden's spare stake: a fresh one, lying on the sand by the rope's
    // top end with its coral flag, a coil of rope beside it. It moves up with
    // the rope, and floats when the king tide gets to it.
    const stakeAt = (t) => { const x = rope(t) - 1.2, y = 44.5; return [x, y, float(x, y, t)]; };
    R.mover((t) => { const [x, y] = stakeAt(t); return { x: x + 0.5, y }; }, (ctx, t) => {
      const [x, y, z] = stakeAt(t);
      if (Q.detail) { const [X, Y] = P(x + 0.4, y + 0.25, z); ctx.beginPath(); ctx.ellipse(X, Y, 0.26, 0.12, 0, 0, Math.PI * 2); ctx.strokeStyle = C.coral; ctx.lineWidth = 0.05; ctx.stroke(); ctx.beginPath(); ctx.ellipse(X, Y, 0.15, 0.07, 0, 0, Math.PI * 2); ctx.stroke(); }
      box(ctx, x - 0.45, y - 0.06, z, 0.9, 0.12, 0.12, STAKE, { flat: true, lw: 0.03 });
      shape(ctx, [[x - 0.45, y - 0.06, z], [x - 0.45, y + 0.06, z], [x - 0.62, y, z + 0.06]], shade(STAKE, 0.15), { lw: 0.03 });
      box(ctx, x + 0.28, y - 0.08, z, 0.1, 0.16, 0.14, C.coral, { flat: true, lw: 0.025 });
    });

    // The plover warden, a volunteer in a vest with a clipboard: in down the
    // boardwalk at 6:15, then all day on the rope. At the top of each hour she
    // carries it out a step; then she walks it, points at anyone too close,
    // and counts plovers. After the sunset she does one last round of the
    // fence with her headlamp on, and goes home.
    const wardenLook = folk(171, { top: C.teal, bottom: C.brown, hat: 'sun', style: 'pony' });
    const vest = (g, b) => {
      const top = b.top + 0.05, bot = b.hipY + 0.02;
      g.beginPath();
      if (b.back) g.rect(-0.3, top, 0.6, bot - top);
      else { g.rect(-0.3, top, 0.2, bot - top); g.rect(0.12, top, 0.18, bot - top); }
      paint(g, C.mustard, { lw: 0.035 });
      if (Q.detail) { g.beginPath(); g.rect(-0.3, top + (bot - top) * 0.55, 0.6, 0.07); g.fillStyle = C.white; g.fill(); }
    };
    const W_IN = 6.25, W_OFF = LEAVE;
    // Her last round: along the beach to the big sign, a last count, back, and
    // up the boardwalk.
    const round = (() => {
      const pts = [[33.4 + 0.36 * 12 - 0.6, 46.3, 0], [31, 46.1, 0], [25.4, 45.7, 3], [31, 46.1, 0], [36.6, 45.4, 0], [FOOT[0], 44.6, 0], [FOOT[0], FOOT[1], 0]];
      const segs = []; let T = 0;
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay, wait] = pts[i - 1], [bx, by] = pts[i];
        if (wait) { segs.push({ t0: T, t1: T + wait, ax, ay, bx: ax, by: ay }); T += wait; }
        const d = Math.hypot(bx - ax, by - ay) / 1.1;
        segs.push({ t0: T, t1: T + d, ax, ay, bx, by }); T += d;
      }
      return { dur: T, at: (s) => {
        const g = segs.find((q) => s < q.t1) || segs[segs.length - 1];
        const k = clamp((s - g.t0) / (g.t1 - g.t0), 0, 1), dx = g.bx - g.ax, dy = g.by - g.ay;
        const moving = Math.abs(dx) + Math.abs(dy) > 0.01;
        return { x: g.ax + dx * k, y: g.ay + dy * k, moving, dir: moving ? (dx - dy >= 0 ? 'r' : 'l') : 'l', back: moving ? dx + dy < 0 : true };
      } };
    })();
    const wardenAt = (t) => {
      const T = wrap(t), tIn = at(W_IN), tOff = at(W_OFF), x = rope(t) - 0.6;
      if (T < tIn || T >= tOff + round.dur) return { x, y: 46.3, hide: true };
      if (T >= tOff) return { ...round.at(T - tOff), lamp: true };
      const k = (T - tIn) / 3.5;
      if (k < 1) return { x: FOOT[0] + (x - FOOT[0]) * k, y: FOOT[1] + (46.3 - FOOT[1]) * k, moving: true, dir: 'l', back: false };
      if (sunsetWatch(t)) return { x, y: 46.3, ...WATCH };
      const st = steps(t);
      if (st.moving) return { x, y: 46.3, carry: true, dir: 'r' };
      // The rest of the hour: point, walk it out, count, walk back, count.
      const hr = hour(t), f = hr - Math.floor(hr), g = f < 0.15 ? 0 : (f - 0.15) / 0.85;
      if (hr < 7) return { x, y: 46.3, pose: 'read', dir: 'l' };
      if (g < 0.12) return { x, y: 46.3, pose: 'point', dir: 'r' };
      if (g < 0.4) return { x, y: 46.3 + 1.7 * ease((g - 0.12) / 0.28), moving: true, dir: 'l', back: false };
      if (g < 0.6) return { x, y: 48, pose: 'read', dir: 'l' };
      if (g < 0.88) return { x, y: 48 - 1.7 * ease((g - 0.6) / 0.28), moving: true, dir: 'r', back: true };
      return { x, y: 46.3, pose: 'read', dir: 'r' };
    };
    R.mover(wardenAt, (ctx, t, p) => {
      if (p.hide) return;
      const z = h(p.x, p.y);
      const o = p.carry ? { pose: 'walk', arms: [1.3, 1.2], dir: 'r' }
        : p.moving ? { pose: 'walk', dir: p.dir, back: p.back, hold: clipboard, arms: [0.1, 1.0] }
        : { pose: p.pose || 'stand', dir: p.dir, back: p.back, hold: p.pose === 'read' ? clipboard : null };
      guy(ctx, p.x, p.y, z, { ...wardenLook, wear: vest }, o, t);
      // The headlamp, and its patch of sand ahead of her.
      if (p.lamp) {
        const k = nightK(t);
        if (k > 0.2) {
          const fx = p.dir === 'r' ? 1 : -1, fy = p.back ? -1 : 1;
          const [hx, hy] = P(p.x, p.y, z + 2.05);
          const [ax, ay] = P(p.x + (fx > 0 ? 1.3 : -0.2) , p.y + (fy > 0 ? 1.3 : -0.2), z);
          ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ax - 0.5, ay); ctx.lineTo(ax + 0.5, ay); ctx.closePath();
          ctx.fillStyle = alpha(LIT, 0.22 * k); ctx.fill();
          disc(ctx, p.x, p.y, z + 2.05, 0.06, LIT, { stroke: false });
        }
      }
    });
    R.light({ at: (t) => { const p = wardenAt(t); return [p.x, p.y, h(p.x, p.y) + 1.6]; }, r: 1.8, color: LIT, k: (t) => { const p = wardenAt(t); return p.lamp && !p.hide ? nightK(t) * 0.8 : 0; } });

    // ================= The open stretch =================
    // The foot of Lot 1's boardwalk, down onto the sand.
    R.thing(FOOT[0] + 0.7, 45, (ctx) => {
      for (let k = 0; k < 4; k++) {
        const y = 44 + k * 0.25, z = h(FOOT[0], y) + 0.18 - k * 0.04;
        box(ctx, FOOT[0] - 0.65, y, z - 0.1, 1.3, 0.22, 0.1, C.woodLight, { flat: true, lw: 0.03 });
      }
    });
    // The warden's chalkboard, by the boardwalk. Tap it and you're counted.
    const count = R.poke({ id: 'chalkboard', teach: true, at: [41.4, 44.6, h(41.4, 44.4) + 0.62], r: 0.9, sound: 'tick', say: ['Counted you. People: 213.', 'Still 213. Plovers: still 6.', 'You only count once.'] });
    R.thing(41.9, 44.7, (ctx) => {
      const x = 41.4, y = 44.4, z = h(x, y), you = count.k() > 0.5;
      post(ctx, x - 0.5, y + 0.15, z, 1.05, C.wood); post(ctx, x + 0.5, y + 0.15, z, 1.05, C.wood);
      plaque(ctx, 'x', x, y + 0.2, z + 0.62, 1.1, 0.9, [
        ['PLOVERS: 6', 0.24, 0.15, C.white],
        [you ? 'PEOPLE: 213' : 'PEOPLE: 212', 0.02, 0.15, you ? C.coral : C.white],
        ['ROPE: MOVING', -0.22, 0.14, C.mustard],
      ], { board: CHALK });
    }, { anim: true });

    // A shell collection, in a shoebox on a towel with its card: the SHELL
    // MUSEUM, shut between visitors. Beside it, the curator's lunchbox, which
    // is just lunch. Tap a lid and it opens. (The towel floats when the king
    // tide comes up the beach.)
    const SHELLS = [45.2, 44.3];
    const shellInks = [C.white, C.blush, tint(C.coral, 0.3), C.navy, C.butter];
    const museum = R.poke({ id: 'museum', at: [SHELLS[0] - 0.35, SHELLS[1], h(...SHELLS) + 0.25], r: 0.55, sound: 'clunk' });
    const lunch = R.poke({ id: 'lunchbox', at: [SHELLS[0] + 0.42, SHELLS[1], h(...SHELLS) + 0.25], r: 0.45, hold: 2, sound: 'clunk', say: ['Sandwiches. Sandier than planned.', 'Still sandwiches.'] });
    // A box with a lid hinged at the back: shut, the lid is its top; open, it
    // stands up behind, and what's in it shows.
    const lidBox = (ctx, x0, y0, z, w, d, hh, color, lidColor, k, inside) => {
      box(ctx, x0, y0, z, w, d, hh, color, { flat: true, lw: 0.03 });
      const top = z + hh, x1 = x0 + w, y1 = y0 + d;
      const lid = () => shape(ctx, [[x0, y0, top], [x1, y0, top], [x1, y0 + d * (1 - k), top + d * k], [x0, y0 + d * (1 - k), top + d * k]], lidColor, { lw: 0.03 });
      const open = () => { shape(ctx, [[x0, y0, top], [x1, y0, top], [x1, y1, top], [x0, y1, top]], shade(color, 0.55), { lw: 0.02 }); if (k > 0.3) inside(top); };
      if (k < 0.5) { open(); lid(); } else { lid(); open(); }
    };
    R.thing(SHELLS[0] + 0.7, SHELLS[1] + 0.4, (ctx, t) => {
      const [sx, sy] = SHELLS, z = float(sx, sy, t) + (level(t) > h(sx, sy) ? 0.03 * Math.sin(t * 1.7) : 0);
      towel(ctx, sx - 0.65, sy - 0.3, z, 1.3, 0.6, C.sky);
      if (Q.detail) plaque(ctx, 'x', sx - 0.35, sy - 0.27, z + 0.42, 0.62, 0.2, [['SHELL MUSEUM', 0, 0.065]], { board: C.white, edge: 0.02 });
      lidBox(ctx, sx - 0.6, sy - 0.17, z, 0.5, 0.34, 0.2, C.white, C.white, museum.k(), (top) => {
        shellInks.forEach((ink, k) => {
          const [X, Y] = P(sx - 0.52 + k * 0.085, sy - 0.02 + (k % 2) * 0.08, top);
          ctx.beginPath(); ctx.moveTo(X - 0.06, Y); ctx.lineTo(X, Y - 0.08); ctx.lineTo(X + 0.06, Y); ctx.quadraticCurveTo(X, Y + 0.04, X - 0.06, Y);
          paint(ctx, ink, { lw: 0.018 });
        });
      });
      lidBox(ctx, sx + 0.25, sy - 0.12, z, 0.34, 0.24, 0.18, C.red, C.red, lunch.k(), (top) => {
        const [X, Y] = P(sx + 0.42, sy, top);
        ctx.beginPath(); ctx.moveTo(X - 0.1, Y + 0.02); ctx.lineTo(X + 0.1, Y + 0.02); ctx.lineTo(X, Y - 0.08); ctx.closePath();
        paint(ctx, C.butter, { lw: 0.02 });
      });
    }, { anim: true });
    // Its curator, a kid, walking to the water's edge for more and back.
    const kidLook = folk(88, { scale: 0.7, hat: 'sun', top: C.pink });
    R.mover((t) => {
      const p = visit(() => [46.2, 44.4], 9.4, LEAVE, t);
      if (p.phase !== 'here') return p;
      if (sunsetWatch(t)) return { ...p, ...WATCH };
      const s = (t % 16) / 16, L = level(t), wy = Math.max(45.2, edge(46.9, L) - 0.35);
      if (s < 0.2) return { ...p, pose: 'sit', dir: 'l' };
      if (s < 0.45) { const k = ease((s - 0.2) / 0.25); return { x: 46.2 + 0.7 * k, y: 44.4 + (wy - 44.4) * k, phase: 'here', pose: 'walk', dir: 'l' }; }
      if (s < 0.62) return { x: 46.9, y: wy, phase: 'here', pose: 'point', dir: 'l' };
      const k = ease(clamp((s - 0.62) / 0.3, 0, 1));
      return { x: 46.9 - 0.7 * k, y: wy + (44.4 - wy) * k, phase: 'here', pose: 'walk', dir: 'r', back: true, hold: book(C.white) };
    }, (ctx, t, p) => {
      if (p.phase === 'away') return;
      guy(ctx, p.x, p.y, h(p.x, p.y), kidLook, { pose: p.pose || 'walk', dir: p.dir, back: p.back, hold: p.hold || null, arms: p.hold ? [1.2, 1.1] : undefined }, t);
    });

    // --- The nappers: one asleep on a towel, one reading beside him. At each
    // step back, the reader gets up and drags the towel, sleeper and all.
    {
      const g = { x: 34.6, y: 45.35, f: 1, lag: 0.08, arr: 8.3 };
      const sleeper = folk(31, { top: C.coral, bottom: C.teal, style: 'bald' }), friend = folk(33, { top: C.mustard, bottom: C.navy, style: 'long' });
      R.mover((t) => crowd(g, t), (ctx, t, p) => {
        if (p.phase === 'away') return;
        if (p.phase !== 'here') {
          guy(ctx, p.x, p.y, h(p.x, p.y), sleeper, carrying(roll(C.purple), p.dir, p.back), t);
          guy(ctx, p.x + 0.5, p.y - 0.5, h(p.x + 0.5, p.y - 0.5), friend, { pose: 'walk', dir: p.dir, back: p.back, hold: book(C.teal), arms: [1.0, 0.3] }, t);
          return;
        }
        const z = h(p.x, p.y);
        bed(ctx, p.x, p.y, z, C.purple);
        if (p.watch) guy(ctx, p.x, p.y, z, sleeper, { pose: 'sit', dir: 'r', back: true }, t);
        else guy(ctx, p.x + 0.2, p.y - 0.2, z, sleeper, { pose: 'sleep', dir: 'r' }, t);
        const fx = p.moving ? p.x + 0.95 : p.x + 0.35 + p.ax, fy = p.moving ? p.y - 0.95 : p.y - 0.95 + p.ay;
        const o = p.watch ? WATCH : p.moving ? { pose: 'walk', arms: [1.3, 1.2], dir: 'l', back: true } : p.swat ? SWAT('l') : { pose: 'sit', dir: 'l', hold: book(C.teal), arms: [1.0, 0.9] };
        guy(ctx, fx, fy, h(fx, fy), friend, o, t);
      });
    }

    // --- The family under the umbrella: Dad on his phone, Mum on the towel,
    // a kid digging to China. At each step back, Dad pulls up the umbrella
    // and carries it, the kid brings the bucket.
    {
      const g = { x: 36.9, y: 45.05, f: 0.85, lag: 0.14, arr: 8.8 };
      const dad = folk(41, { top: C.white, bottom: C.coral, style: 'short', hat: 'cap' }), mum = folk(43, { top: C.teal, style: 'bun' }), kid = folk(45, { scale: 0.65, top: C.mustard, bottom: C.navy });
      R.mover((t) => crowd(g, t), (ctx, t, p) => {
        if (p.phase === 'away') return;
        if (p.phase !== 'here') {
          const z = h(p.x, p.y);
          guy(ctx, p.x, p.y, z, dad, { pose: 'walk', arms: [1.3, 1.2], dir: p.dir, back: p.back }, t);
          umbrella(ctx, p.x + 0.35, p.y - 0.1, z + 0.55, C.coral, { towel: false });
          guy(ctx, p.x - 0.5, p.y + 0.6, h(p.x - 0.5, p.y + 0.6), mum, carrying(roll(C.pink), p.dir, p.back), t);
          guy(ctx, p.x + 0.6, p.y + 0.7, h(p.x + 0.6, p.y + 0.7), kid, carrying(pail, p.dir, p.back), t);
          return;
        }
        const z = h(p.x, p.y), ax = p.ax, ay = p.ay;
        towel(ctx, p.x - 0.3, p.y - 0.1, z, 1.3, 0.8, C.pink);
        // The kid's hole and its pile.
        const kx = p.x + 0.7, ky = p.y + 1.05;
        if (!p.moving) {
          disc(ctx, kx - 0.35, ky - 0.1, h(kx, ky) + 0.01, 0.22, shade(INK.sand, 0.3), { lw: 0.025 });
          { const [X, Y] = P(kx + 0.42, ky - 0.08, h(kx, ky)); ctx.beginPath(); ctx.ellipse(X, Y, 0.3, 0.2, 0, Math.PI, 0); ctx.closePath(); paint(ctx, SANDPILE, { lw: 0.025 }); }
        }
        if (p.moving) {
          guy(ctx, p.x + 1.1, p.y + 0.1, z, dad, { pose: 'walk', arms: [1.3, 1.2], dir: 'r' }, t);
          umbrella(ctx, p.x + 1.45, p.y - 0.05, z + 0.5, C.coral, { towel: false });
          guy(ctx, p.x + 0.4, p.y + 0.35, z, mum, carrying(roll(C.pink), 'r', false), t);
          guy(ctx, kx + 0.3, ky, h(kx, ky), kid, carrying(pail, 'r', false), t);
          return;
        }
        umbrella(ctx, p.x, p.y - 0.25, z, C.coral, { towel: false });
        guy(ctx, p.x + 0.35 + ax * 0.6, p.y + 0.3 + ay * 0.6, z, mum, p.watch ? WATCH : p.swat ? SWAT('r') : { pose: 'sit', dir: 'l' }, t);
        guy(ctx, kx + ax, ky + ay, h(kx, ky), kid, p.watch ? WATCH : p.swat ? SWAT('l') : { pose: 'sit', dir: 'l', arms: [1.2 + Math.sin(t * 6) * 0.5, 0.5] }, t);
        guy(ctx, p.x + 1.2 + ax, p.y - 0.1 + ay, z, dad, p.watch ? WATCH : p.swat ? SWAT('r') : { pose: 'read', dir: 'l', hold: book(C.ink) }, t);
      });
    }

    // --- The couple and their cooler (the brand's one appearance).
    {
      const g = { x: 39.7, y: 45.8, f: 0.65, lag: 0.2, arr: 9.2 };
      const a = folk(51, { top: C.red, style: 'curly' }), b = folk(53, { top: C.sky, style: 'long', dress: false });
      R.mover((t) => crowd(g, t), (ctx, t, p) => {
        if (p.phase === 'away') return;
        if (p.phase !== 'here' || p.moving) {
          const dir = p.phase === 'here' ? 'r' : p.dir, back = p.phase === 'here' ? false : p.back;
          const x = p.phase === 'here' ? p.x + 0.4 : p.x, y = p.y, z = h(x, y);
          if (p.phase === 'here') towel(ctx, p.x - 0.8, p.y - 0.45, h(p.x, p.y), 1.6, 0.9, C.teal);
          guy(ctx, x, y, z, a, { pose: 'walk', arms: [1.3, 1.2], dir, back }, t);
          cooler(ctx, x + 0.45, y + 0.1, z + 0.7);
          guy(ctx, x - 0.4, y + 0.6, h(x - 0.4, y + 0.6), b, carrying(roll(C.teal), dir, back), t);
          return;
        }
        const z = h(p.x, p.y);
        towel(ctx, p.x - 0.8, p.y - 0.45, z, 1.6, 0.9, C.teal);
        cooler(ctx, p.x + 1.1, p.y - 0.2, h(p.x + 1.1, p.y - 0.2));
        guy(ctx, p.x - 0.35 + p.ax, p.y + p.ay, z, a, p.watch ? WATCH : p.swat ? SWAT('r') : { pose: 'sit', dir: 'l' }, t);
        guy(ctx, p.x + 0.35 + p.ax, p.y + 0.1 + p.ay, z, b, p.watch ? WATCH : p.swat ? SWAT('l') : { pose: 'sit', dir: 'l', hold: book(C.coral), arms: [1.0, 0.9] }, t);
      });
    }

    // --- A man in a beach chair with the paper, who folds the chair and
    // moves it every hour without once looking up.
    {
      const g = { x: 42.7, y: 45.2, f: 0.5, lag: 0.26, arr: 8.6 };
      const man = folk(61, { top: C.green, bottom: C.ink, style: 'bald' });
      R.mover((t) => crowd(g, t), (ctx, t, p) => {
        if (p.phase === 'away') return;
        const z = h(p.x, p.y);
        if (p.phase !== 'here' || p.moving) {
          const dir = p.phase === 'here' ? 'r' : p.dir, back = p.phase === 'here' ? false : p.back;
          guy(ctx, p.x, p.y, z, man, { pose: 'walk', dir, back, hold: book(C.white), arms: [1.2, 0.2] }, t);
          box(ctx, p.x - 0.35, p.y + 0.15, z + 0.35, 0.7, 0.1, 0.9, C.sky, { flat: true, lw: 0.03 });
          return;
        }
        if (p.watch) { chair(ctx, p.x, p.y, z, C.sky); guy(ctx, p.x + 0.5, p.y - 0.4, z, man, WATCH, t); return; }
        if (p.swat) { chair(ctx, p.x, p.y, z, C.sky); guy(ctx, p.x + p.ax, p.y + p.ay, h(p.x + p.ax, p.y + p.ay), man, SWAT('r'), t); return; }
        chair(ctx, p.x, p.y, z, C.sky);
        guy(ctx, p.x, p.y - 0.05, z + 0.3, man, { pose: 'sit', dir: 'l', hold: book(C.white), arms: [1.1, 1.0] }, t);
      });
    }

    // --- Frisbee, across the open stretch, which gets narrower every hour.
    {
      const ga = { x: 42.6, y: 46.6, f: 0.4, lag: 0.3, arr: 10 }, gb = { x: 45.6, y: 46.6, f: 0.2, lag: 0.32, arr: 10.1 };
      const la = folk(71, { top: C.purple, bottom: C.teal, hat: 'cap' }), lb = folk(73, { top: C.coral, style: 'pony' });
      const PER = 2.8;
      const play = (t) => between(t, 10.4, 18.5) && !sunsetWatch(t);
      const disc0 = (t) => { const pa = crowd(ga, t), pb = crowd(gb, t); return { pa, pb, ok: play(t) && pa.phase === 'here' && pb.phase === 'here' && !pa.swat && !pb.swat && !pa.moving && !pb.moving }; };
      const flight = (t) => { const u = (t / PER) % 2, toB = u < 1, k = u % 1; return { toB, k }; };
      const player = (g, look, isA) => R.mover((t) => crowd(g, t), (ctx, t, p) => {
        if (p.phase === 'away') return;
        const z = h(p.x, p.y);
        if (p.phase !== 'here') { guy(ctx, p.x, p.y, z, look, { pose: 'walk', dir: p.dir, back: p.back }, t); return; }
        let o;
        if (p.watch) o = WATCH;
        else if (p.swat) o = SWAT(isA ? 'r' : 'l');
        else if (p.moving) o = { pose: 'walk', dir: 'r' };
        else if (!play(t)) o = { pose: 'sit', dir: 'l' };
        else {
          const { toB, k } = flight(t), mine = toB === isA;
          o = { pose: mine && k < 0.18 ? 'point' : !mine && k > 0.55 && k < 0.75 ? 'jump' : 'stand', dir: isA ? 'r' : 'l', back: !isA };
        }
        guy(ctx, p.x + p.ax, p.y + p.ay, h(p.x + p.ax, p.y + p.ay), look, o, t);
      });
      player(ga, la, true);
      player(gb, lb, false);
      R.mover((t) => {
        const { pa, pb, ok } = disc0(t);
        const { toB, k } = flight(t), [s, e] = toB ? [pa, pb] : [pb, pa], q = clamp(k / 0.7, 0, 1);
        return { x: s.x + (e.x - s.x) * q, y: s.y + (e.y - s.y) * q + 0.02, q, ok };
      }, (ctx, t, p) => {
        if (!p.ok) return;
        const z = h(p.x, p.y) + 1.5 + Math.sin(Math.PI * p.q) * 0.9 - (p.q >= 1 ? 0.2 : 0);
        disc(ctx, p.x, p.y, z, 0.16, C.mustard, { lw: 0.03 });
      });
    }

    // --- A kid at the water's edge, in when the wave goes out, shrieking out
    // when it comes in.
    {
      const i = 0;
      const look = folk(81 + i * 2, { scale: 0.68, top: [C.tealLight, C.red][i], style: ['curly', 'pony'][i] });
      const x0 = 43.7 + i * 1.3;
      R.mover((t) => visit((tt) => {
        const x = x0 + Math.sin(tt * 0.3 + i) * 0.5;
        return [x, clamp(edge(x, level(tt)) - 0.1 + Math.sin(tt * 1.1 + i * 1.7) * 0.5, 44.6, 55)];
      }, 10.3 + i * 0.1, 18.6, t), (ctx, t, p) => {
        if (p.phase === 'away') return;
        const z = h(p.x, p.y);
        const run = Math.cos(t * 1.1 + i * 1.7) < 0;
        guy(ctx, p.x, p.y, z, look, p.phase === 'here' ? { pose: run ? 'run' : 'jump', dir: run ? 'r' : 'l', back: run } : { pose: 'run', dir: p.dir, back: p.back }, t);
      });
    }

    // ================= Sandy Point =================
    // The state beach at the tip: open, a few people, and its own little
    // roped square round a nest (three eggs, while the sand's dry).
    const SP = [11.6, 44.05]; // where they come down from the refuge road
    const NEST2 = [9.5, 44.9];
    R.thing(NEST2[0] + 0.7, NEST2[1] + 0.6, (ctx) => {
      const [nx, ny] = NEST2, pts = [[nx - 0.65, ny - 0.5], [nx + 0.65, ny - 0.5], [nx + 0.65, ny + 0.5], [nx - 0.65, ny + 0.5]];
      for (const [x, y] of pts) post(ctx, x, y, h(x, y), 0.7);
      if (Q.lines) {
        ctx.beginPath();
        pts.forEach(([x, y], i) => { const [X, Y] = P(x, y, h(x, y) + 0.55); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
        ctx.closePath(); ctx.strokeStyle = C.white; ctx.lineWidth = 0.04; ctx.stroke();
      }
      plaque(ctx, 'x', nx, ny + 0.52, h(nx, ny + 0.5) + 0.5, 0.6, 0.3, [['NEST', 0, 0.13, C.coral]], { board: C.white, edge: 0.025 });
    });
    R.thing(NEST2[0], NEST2[1], (ctx) => {
      const [nx, ny] = NEST2, z = h(nx, ny);
      disc(ctx, nx, ny, z + 0.01, 0.18, shade(INK.sand, 0.25), { stroke: false });
      for (const [dx, dy] of [[-0.06, 0], [0.06, -0.03], [0.02, 0.07]]) { const [X, Y] = P(nx + dx, ny + dy, z + 0.04); ctx.beginPath(); ctx.ellipse(X, Y, 0.05, 0.035, 0, 0, Math.PI * 2); paint(ctx, tint(INK.sand, 0.4), { lw: 0.015 }); }
    }, { on: (t) => level(t) < h(NEST2[0], NEST2[1]) - 0.02 });

    // Someone in a beach chair under a teal umbrella, facing the sea all day
    // and the marsh for ten minutes.
    [[11.8, 45.1, 101, C.mustard]].forEach(([x, y, s, c], i) => {
      const look = folk(s);
      R.mover((t) => visit(() => [x, y], 8.9 + i * 0.2, LEAVE, t, SP), (ctx, t, p) => {
        if (p.phase === 'away') return;
        const z = h(p.x, p.y);
        if (p.phase !== 'here') { guy(ctx, p.x, p.y, z, look, { pose: 'walk', dir: p.dir, back: p.back, hold: i ? null : roll(c) }, t); return; }
        if (i === 0 && !sunsetWatch(t)) umbrella(ctx, x - 0.2, y - 0.5, z, C.teal, { towel: false });
        chair(ctx, x, y, z, c);
        if (sunsetWatch(t)) guy(ctx, x + 0.5, y - 0.4, z, look, WATCH, t);
        else guy(ctx, x, y - 0.05, z + 0.3, look, { pose: 'sit', dir: 'l', hold: i ? book(C.purple) : null, arms: i ? [1.0, 0.9] : undefined }, t);
      });
    });

    // A kid with a kite, which does most of the work: a goose kite, wings out,
    // up over the dunes. It's been up since Tuesday: when the kid goes home,
    // the string stays tied to a stake in the sand. (A decoy: it answers back.)
    {
      const look = folk(111, { scale: 0.72, top: C.coral, hat: 'cap' });
      const STK = [13.0, 45.3];
      const kid = (t) => visit((tt) => [13.4 + Math.sin(tt * 0.2) * 0.4, 45.6], 10, 18.4, t, SP);
      const kiteAt = (t) => [11.8 + Math.sin(t * 0.8) * 0.5, 43.2, h(13.4, 45.6) + 5.6 + Math.sin(t * 1.3) * 0.4];
      R.thing(STK[0] + 0.1, STK[1] + 0.1, (ctx) => post(ctx, STK[0], STK[1], h(...STK), 0.4, STAKE));
      R.mover(kid, (ctx, t, p) => {
        if (p.phase === 'away') return;
        const z = h(p.x, p.y);
        if (p.phase !== 'here') { guy(ctx, p.x, p.y, z, look, { pose: 'walk', dir: p.dir, back: p.back }, t); return; }
        guy(ctx, p.x, p.y, z, look, { pose: 'point', dir: 'r', back: true, arms: [2.4, 0.3] }, t);
      });
      // The kite and its string (from the kid's hand, or the stake).
      R.mover(() => ({ x: STK[0], y: STK[1] }), (ctx, t) => {
        const p = kid(t), [kx, ky, kz] = kiteAt(t);
        const [hx, hy] = p.phase === 'here' ? P(p.x + 0.2, p.y - 0.2, h(p.x, p.y) + 1.9) : P(STK[0], STK[1], h(...STK) + 0.4);
        const [KX, KY] = P(kx, ky, kz);
        if (Q.lines) {
          ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo((hx + KX) / 2 + 0.3, (hy + KY) / 2 + 0.6, KX, KY + 0.15);
          ctx.strokeStyle = alpha(C.ink, 0.6); ctx.lineWidth = 0.02; ctx.stroke();
        }
        const tilt = Math.sin(t * 1.1) * 0.15, flap = Math.sin(t * 2.3) * 0.08;
        ctx.save(); ctx.translate(KX, KY); ctx.rotate(tilt); ctx.scale(-1.3, 1.3);
        // Tail ribbons first, then the wings, the body, the neck and head.
        if (Q.detail) {
          ctx.beginPath(); ctx.moveTo(-0.4, 0.02);
          for (let k = 1; k <= 6; k++) ctx.lineTo(-0.4 - k * 0.1, 0.05 + k * 0.12 + Math.sin(t * 4 + k) * 0.06);
          ctx.strokeStyle = C.coral; ctx.lineWidth = 0.04; ctx.stroke();
        }
        ctx.beginPath(); ctx.moveTo(-0.15, -0.02); ctx.lineTo(0.05, -0.55 - flap); ctx.lineTo(0.2, -0.04); ctx.closePath();
        paint(ctx, C.greyLight, { lw: 0.03 });
        ctx.beginPath(); ctx.ellipse(0, 0, 0.42, 0.14, 0, 0, Math.PI * 2);
        ctx.moveTo(-0.32, -0.02); ctx.lineTo(-0.5, -0.12); ctx.lineTo(-0.4, 0.07);
        paint(ctx, C.white, { lw: 0.03 });
        ctx.beginPath(); ctx.moveTo(-0.12, 0.04); ctx.lineTo(0.08, 0.5 + flap); ctx.lineTo(0.22, 0.04); ctx.closePath();
        paint(ctx, C.white, { lw: 0.03 });
        ctx.beginPath(); ctx.moveTo(0.3, -0.03); ctx.quadraticCurveTo(0.5, -0.1, 0.62, -0.08);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.14; ctx.lineCap = 'round'; ctx.stroke();
        ctx.strokeStyle = C.white; ctx.lineWidth = 0.08; ctx.stroke();
        ctx.beginPath(); ctx.arc(0.64, -0.08, 0.08, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.025 });
        ctx.beginPath(); ctx.moveTo(0.7, -0.11); ctx.lineTo(0.86, -0.07); ctx.lineTo(0.7, -0.04); ctx.closePath(); paint(ctx, C.coral, { lw: 0.02 });
        ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0.66, -0.1, 0.018, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
      R.decoy({ id: 'kite', at: kiteAt, r: 0.9, say: ['A goose kite. Higher than the goose.', 'Still a kite.', 'Up since Tuesday.'] });
    }

    // A man surfcasting from the water's edge, dawn to dusk: casts, waits,
    // reels in nothing, casts again.
    {
      const look = folk(121, { top: C.tealLight, bottom: C.brown, hat: 'beanie' });
      const spot = (tt) => { const x = 14.6; return [x, clamp(edge(x, level(tt)) - 0.45, 44.6, 55)]; };
      R.mover((t) => visit(spot, 5.3, LEAVE, t, SP), (ctx, t, p) => {
        if (p.phase === 'away') return;
        const z = h(p.x, p.y);
        if (p.phase !== 'here') { guy(ctx, p.x, p.y, z, look, { pose: 'walk', dir: p.dir, back: p.back }, t); return; }
        if (sunsetWatch(t)) { guy(ctx, p.x, p.y, z, look, WATCH, t); return; }
        const c = (t % 11) / 11, casting = c < 0.12;
        guy(ctx, p.x, p.y, z, look, { pose: 'stand', dir: 'l', arms: casting ? [2.6 - c * 14, 2.2 - c * 12] : [1.3, 1.1] }, t);
        if (!Q.lines) return;
        // The rod up over his shoulder, and the line out into the surf.
        const [hx, hy] = P(p.x, p.y + 0.3, z + 1.35), bend = casting ? -1 : 1;
        const rx = hx - 0.9 * bend, ry = hy - 1.6 + (casting ? 0.3 : 0);
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(rx, ry); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
        const L = level(t), [wx, wy] = P(p.x - 0.4, Math.min(57, p.y + 3.2), L);
        ctx.beginPath(); ctx.moveTo(rx, ry); ctx.quadraticCurveTo((rx + wx) / 2, (ry + wy) / 2 + 0.5, wx, wy);
        ctx.strokeStyle = alpha(C.ink, 0.45); ctx.lineWidth = 0.02; ctx.stroke();
        if (c > 0.2) disc(ctx, p.x - 0.4, Math.min(57, p.y + 3.2), L + 0.03 + Math.sin(t * 2) * 0.02, 0.06, C.coral, { lw: 0.02 });
      });
    }

    // A seal off the point, which comes up every so often to see what all
    // the fuss is about, and goes back down.
    R.mover((t) => ({ x: 8.6 + Math.sin(t / 9) * 0.6, y: 50.2 }), (ctx, t, p) => {
      const c = (t % 13) / 13;
      if (c > 0.55) return;
      const up = Math.min(1, c / 0.06, (0.55 - c) / 0.06), L = level(t);
      const [X, Y] = P(p.x, p.y, L);
      ctx.save(); ctx.translate(X, Y);
      ctx.beginPath(); ctx.rect(-1, -1, 2, 1); ctx.clip();
      const sy = 0.34 * (1 - up);
      ctx.beginPath(); ctx.ellipse(0, -0.2 + sy, 0.2, 0.26, 0, 0, Math.PI * 2);
      paint(ctx, shade(C.grey, 0.35), { lw: 0.035 });
      ctx.beginPath(); ctx.ellipse(0.14, -0.28 + sy, 0.1, 0.07, 0, 0, Math.PI * 2);
      paint(ctx, shade(C.grey, 0.2), { lw: 0.03 });
      if (Q.detail) {
        ctx.fillStyle = C.ink;
        ctx.beginPath(); ctx.arc(0.04, -0.34 + sy, 0.03, 0, Math.PI * 2); ctx.arc(0.13, -0.36 + sy, 0.03, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      if (Q.lines && up > 0.5) { ctx.beginPath(); ctx.ellipse(X, Y, 0.34, 0.14, 0, 0, Math.PI * 2); ctx.strokeStyle = alpha(C.white, 0.8); ctx.lineWidth = 0.035; ctx.stroke(); }
    });

    // ================= Offshore =================
    // A lobster boat working a line of traps, buoy to buoy, dawn to dusk.
    const BUOYS = [[19.4, 54.9, C.coral], [24.4, 55.4, C.mustard], [29, 54.7, C.coral]];
    for (const [bx, by, c] of BUOYS) {
      R.mover(() => ({ x: bx, y: by }), (ctx, t) => {
        const z = float(bx, by, t) + Math.sin(t * 2 + bx) * 0.05;
        box(ctx, bx - 0.1, by - 0.1, z - 0.05, 0.2, 0.2, 0.32, c, { flat: true, lw: 0.025 });
        if (Q.detail) box(ctx, bx - 0.1, by - 0.1, z + 0.1, 0.2, 0.2, 0.07, C.white, { flat: true, stroke: false });
      });
    }
    const lobsterman = folk(131, { top: C.mustard, bottom: C.mustard, hat: 'beanie' });
    const boatAt = (t) => {
      const order = [0, 1, 2, 1], u = t / 12, n = Math.floor(u), f = u - n;
      const a = BUOYS[order[n % 4]], b = BUOYS[order[(n + 1) % 4]];
      const k = f < 0.55 ? 0 : ease((f - 0.55) / 0.45);
      return { x: a[0] + 0.3 + (b[0] - a[0]) * k, y: a[1] - 1.1 + (b[1] - a[1]) * k, haul: f < 0.55, dir: b[0] >= a[0] ? 1 : -1 };
    };
    R.mover(boatAt, (ctx, t, p) => {
      if (!between(t, 5.2, 20.6)) return;
      boat(ctx, p.x, p.y, t, { along: 'x', len: 2.6, wid: 1, dir: p.dir, color: C.white, stripe: C.coral, cabin: C.white });
      const z = float(p.x, p.y, t) - 0.15 + 0.04 * Math.sin(t * 1.7 + p.x) + 0.45;
      person(ctx, p.x + 0.55 * p.dir, p.y + 0.15, z, { ...lobsterman, pose: p.haul ? 'carry' : 'stand', arms: p.haul ? [1.4 + Math.sin(t * 3) * 0.4, 1.4 - Math.sin(t * 3) * 0.4] : undefined, dir: 'l' }, t);
    });

    // A sand dollar, out on the flats: the falling tide leaves it on the wet
    // sand at midday, pale and flat and about the size of a cookie, and the
    // rising tide takes it back.
    const SD = [24.6, 49.1], sdz = h(...SD);
    R.thing(SD[0] + 0.2, SD[1] + 0.2, (ctx) => {
      const [X, Y] = P(SD[0], SD[1], sdz + 0.01);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.2, 0.1, 0, 0, Math.PI * 2);
      paint(ctx, mix(C.white, INK.sand, 0.3), { lw: 0.02, stroke: shade(INK.sand, 0.35) });
      if (!Q.detail) return;
      ctx.fillStyle = shade(INK.sand, 0.3);
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k * Math.PI * 2) / 5;
        ctx.beginPath(); ctx.ellipse(X + Math.cos(a) * 0.075, Y + Math.sin(a) * 0.037, 0.035, 0.012, a, 0, Math.PI * 2); ctx.fill();
      }
    }, { on: (t) => level(t) < sdz - 0.02 });

    // ================= The finds =================
    R.find({ id: 'sandcastle', label: 'A sandcastle inside the rope', at: [CASTLE[0], CASTLE[1], h(CASTLE[0], CASTLE[1]) + 0.35], r: 0.8 });
    R.find({ id: 'stake', label: 'The warden\'s spare stake', at: (t) => { const [x, y, z] = stakeAt(t); return [x, y, z + 0.1]; }, r: 0.8 });
    R.find({ id: 'shells', label: 'A shell collection', kind: 'poke', inside: museum, at: [SHELLS[0] - 0.35, SHELLS[1], h(SHELLS[0], SHELLS[1]) + 0.22], r: 0.6, hint: 'A kid has been collecting all day. The exhibit is shut between visitors.' });
    R.find({ id: 'sanddollar', label: 'A sand dollar', kind: 'hard', when: lowTide, note: 'low tide', at: [SD[0], SD[1], sdz + 0.05], r: 0.6, riddle: 'Small change, out where the sea was.', hint: 'When the water is all the way out, something round and pale is lying on the wet sand. It is worth nothing.' });
  },
};
