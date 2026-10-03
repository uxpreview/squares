// The Town Beach: north from the Center to the Point (docs/levels/plum.md).
// Four rows of beach houses, the front row up on pilings behind sandbags and
// rip-rap; umbrellas, surfers, a volleyball net, a gull with somebody's fry,
// and the crowd walking in by noon and out by dark. One house's stairs end a
// foot above the sand, and every summer its owner nails on another step:
// today he carries the plank down, hammers all day, stands on it, finds it's
// still a foot short, paints another tally on the stringer, and at the king
// tide sits on his new bottom step with a lantern, because tonight, for once,
// the stairs reach something. At sunset everyone on the beach turns round to
// face the marsh, backs to the tide climbing the sand behind them. The
// greenhead man runs up and down it all morning (swarm.js), and everyone he
// passes steps aside, swatting.
//
// World units, like land.js (the area sits at the map's corner).
import { C, Q, P, folk, person, box, face, disc, paint, speech, alpha, tint, shade, mix } from '../../../engine/art.js';
import { drawLand } from '../../../engine/terrain.js';
import { clamp } from '../../../engine/actors.js';
import { land, float, h } from '../land.js';
import { level, hour, at, lowTide, nightK, sunsetWatch, LOOP } from '../tide.js';
import { EVENING, INK, LIT, lightsOn, BRAND } from '../style.js';
import { who, umbrella, house, houses, board, signpost, nightGlow, footing, stay, printed, printedRow } from '../kit.js';
import { aside } from '../swarm.js';

const wrap = (t) => (((t % LOOP) + LOOP) % LOOP);
// Where the water's edge is (y) for a level, on this beach (land.js: 0.95 at
// the dune toe, down 0.25 a unit).
const TOE = 43.3;
const shore = (L) => TOE + (0.95 - L) / 0.25;
// Which way someone faces, walking (dx, dy).
const facing = (dx, dy) => ({ dir: dx - dy >= 0 ? 'r' : 'l', back: dx + dy < -0.01 });
// A walk along a path of [x, y] (or [x, y, z]) points: its length, and where
// you are d along it.
const plen = (pts) => { let l = 0; for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return l; };
function along(pts, d) {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d <= l || i === pts.length - 1) {
      const k = l ? clamp(d / l) : 1;
      return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, z: a[2] != null ? a[2] + (b[2] - a[2]) * k : null, ...facing(b[0] - a[0], b[1] - a[1]) };
    }
    d -= l;
  }
  return null;
}
// Walking pts from loop second s0 at a stroll: where, at loop second s (or null).
function trip(s, s0, pts, speed = 1.3) {
  const d = (s - s0) * speed;
  if (d < 0 || d > plen(pts)) return null;
  return along(pts, d);
}
const between = (hr, a, b) => (a <= b ? hr >= a && hr < b : hr >= a || hr < b);

// The inks the art adds, all from the plate's own.
const WOOD = C.wood, NEW_WOOD = tint(C.woodLight, 0.4);
const BAG = mix(INK.sand, C.brown, 0.38);
// A sandbag: a fat pillow of burlap, added to the current path (a whole row
// is filled and outlined at once: dozens of bags, a handful of strokes).
function bagPath(ctx, x, y, z) {
  const w = 0.9, d = 0.5, hh = 0.26;
  const [a, b] = P(x, y + d, z), [c, e] = P(x + w, y + d, z), [f, g] = P(x + w, y, z);
  const [m, n] = P(x + w, y, z + hh), [o, q] = P(x, y, z + hh), [r, u] = P(x, y + d, z + hh);
  ctx.moveTo(a, b); ctx.lineTo(c, e); ctx.lineTo(f, g);
  ctx.quadraticCurveTo(f + 0.05, (g + n) / 2, m, n);
  ctx.quadraticCurveTo((m + o) / 2, (n + q) / 2 - 0.08, o, q);
  ctx.lineTo(r, u);
  ctx.quadraticCurveTo(a - 0.05, (b + u) / 2, a, b);
  ctx.closePath();
}
// Its front seam, catching the light (also added to the current path).
function seamPath(ctx, x, y, z) {
  const w = 0.9, d = 0.5, hh = 0.26;
  const [r, u] = P(x, y + d, z + hh), [m, n] = P(x + w, y, z + hh);
  const [s1, s2] = P(x + 0.08, y + d, z + hh * 0.92), [s3, s4] = P(x + w - 0.05, y + d, z + hh * 0.92);
  ctx.moveTo(r, u); ctx.lineTo(s1, s2); ctx.quadraticCurveTo((s1 + s3) / 2, (s2 + s4) / 2 - 0.06, s3, s4); ctx.lineTo(m, n);
}
// A pile of rip-rap: lumpy six-sided rocks, their sides and tops each drawn
// as one path. rocks: [[x, y, z, r, h, seed], ...], back to front.
function riprap(ctx, rocks, col) {
  const sides = [[], []], tops = [];
  for (const [x, y, z, r, hh, seed] of rocks) {
    const pts = [];
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + seed, rr = r * (0.75 + 0.25 * Math.abs(Math.sin(seed * 3.1 + k * 1.7)));
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    for (let k = 0; k < 6; k++) {
      const [ax, ay] = pts[k], [bx, by] = pts[(k + 1) % 6];
      const nx = by - ay, ny = ax - bx; // outward
      if (nx + ny <= 0) continue;
      sides[nx - ny > 0 ? 0 : 1].push([[ax, ay, z], [bx, by, z], [bx, by, z + hh * 0.8], [ax, ay, z + hh * 0.8]]);
    }
    tops.push(pts.map(([px, py], k) => [px * 0.9 + x * 0.1, py * 0.9 + y * 0.1, z + hh * (0.8 + 0.2 * (k % 2))]));
  }
  const many = (list, fill, o) => {
    ctx.beginPath();
    for (const pts of list) { pts.forEach((pt, i) => { const [X, Y] = P(...pt); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.closePath(); }
    paint(ctx, fill, o);
  };
  many(sides[0], shade(col, 0.12), { lw: 0.03 });
  many(sides[1], shade(col, 0.24), { lw: 0.03 });
  many(tops, col, { lw: 0.03 });
}
// A rail: a white stroke with an ink edge, from a to b.
function rail(ctx, a, b, color = C.white, w = 0.09) {
  const [x0, y0] = P(...a), [x1, y1] = P(...b);
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
  ctx.strokeStyle = C.ink; ctx.lineWidth = w + 0.06; ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
}
// A post: one thick stroke with an ink edge (cheaper than a box).
function post(ctx, x, y, z0, z1, color, w = 0.14) {
  const [a, b] = P(x, y, z0), [c, d] = P(x, y, z1);
  ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d);
  ctx.strokeStyle = C.ink; ctx.lineWidth = w + 0.06; ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
}
const ROCK = mix(INK.shingle, C.brown, 0.14);
const PAINT = C.white;

// Held things, for person(): drawn in the person's own units, facing right,
// from (0.35, shoulder + 0.3). The near hand's at (0.22 + 0.72 sin a, -1.53 +
// 0.72 cos a) for an arm at angle a.
const HOLD0 = [0.35, -1.23];
const hand = (a) => [0.22 + 0.72 * Math.sin(a) - HOLD0[0], -1.53 + 0.72 * Math.cos(a) - HOLD0[1]];
function hammer(a) {
  return (ctx) => {
    const [hx, hy] = hand(a), ux = Math.sin(a), uy = Math.cos(a);
    ctx.lineCap = 'round';
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.11;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + ux * 0.42, hy + uy * 0.42); ctx.stroke();
    ctx.strokeStyle = C.wood; ctx.lineWidth = 0.06; ctx.stroke();
    // The head, across the handle's end.
    const ex = hx + ux * 0.44, ey = hy + uy * 0.44;
    ctx.beginPath(); ctx.moveTo(ex - uy * 0.15, ey + ux * 0.15); ctx.lineTo(ex + uy * 0.12, ey - ux * 0.12);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.13; ctx.stroke();
  };
}
const plank = (ctx) => {
  ctx.beginPath(); ctx.rect(-0.95, -0.12, 2.1, 0.13);
  paint(ctx, NEW_WOOD, { lw: 0.04 });
};
const mug = (color) => (ctx) => {
  ctx.beginPath(); ctx.rect(0.22, 0.2, 0.16, 0.18);
  paint(ctx, color, { lw: 0.035 });
};
const book = (color) => (ctx) => {
  ctx.beginPath(); ctx.moveTo(0.12, 0.05); ctx.lineTo(0.4, -0.05); ctx.lineTo(0.42, 0.25); ctx.lineTo(0.14, 0.33); ctx.closePath();
  paint(ctx, color, { lw: 0.035 });
};
const lantern = (lit) => (ctx) => {
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.035;
  ctx.beginPath(); ctx.moveTo(0.3, 0.1); ctx.lineTo(0.3, 0.2); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(0.18, 0.2, 0.24, 0.3, 0.05);
  paint(ctx, lit ? LIT : C.greyLight, { lw: 0.035 });
};
// A paper boat of fries.
const fries = (ctx) => {
  ctx.fillStyle = C.mustard; ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025;
  for (const [dx, dh] of [[0.2, 0.16], [0.27, 0.2], [0.34, 0.15]]) { ctx.beginPath(); ctx.rect(dx, 0.08 - dh, 0.05, dh); ctx.fill(); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(0.15, 0.06); ctx.lineTo(0.45, 0.06); ctx.lineTo(0.4, 0.22); ctx.lineTo(0.2, 0.22); ctx.closePath();
  paint(ctx, C.red, { lw: 0.035 });
};
// A metal detector: the stick down from the hand, the coil on the sand,
// swinging side to side.
function detector(sw) {
  return (ctx) => {
    const [hx, hy] = hand(0.9), cx = 0.95 + sw * 0.25, cy = 1.2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.07;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(cx, cy); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx + 0.05, cy + 0.02, 0.2, 0.07, 0, 0, Math.PI * 2);
    paint(ctx, C.grey, { lw: 0.04 });
  };
}
// A tool belt, over the torso.
const belt = (ctx, b) => {
  ctx.beginPath(); ctx.rect(-0.3, b.hipY - 0.16, 0.6, 0.14);
  paint(ctx, C.brown, { lw: 0.03 });
  if (!Q.detail) return;
  ctx.beginPath(); ctx.rect(0.06, b.hipY - 0.06, 0.18, 0.2);
  paint(ctx, shade(C.brown, 0.15), { lw: 0.03 });
};

// A bubble over someone, small, only close up.
function say(ctx, x, y, z, text) {
  if (Q.detail) speech(ctx, x, y, z, text, { size: 0.38 });
}

// ---------- The crowd ----------
// Umbrella spots, as the greybox had them. Each family walks in (from the
// Center along the sand, or down the beach path between the houses), sets up
// and sits all day; the ones marked stay stand for the sunset, facing the
// marsh, before they go.
const SPOTS = [[71.6, 44.6], [74.4, 45.6], [77, 44.4], [79.8, 45.4], [85.4, 44.6], [88, 45.8], [90.6, 44.4], [93.4, 45.2]];
const COLORS = [C.coral, C.mustard, C.teal, C.pink, C.coral, C.teal, C.mustard, C.purple];
const ARRIVE = [8.6, 9.6, 9.1, 10.3, 8.9, 10.7, 9.4, 11.3]; // hours: full by noon
const LEAVE = [20.9, 18.1, 20.9, 18.9, 20.9, 17.8, 20.9, 18.5]; // the 20.9s stay for the sunset
const POSE = ['sit', 'lie', 'read', 'sit', 'lie', 'read', 'sit', 'lie'];
// The beach path, down the gap between two front-row houses.
const PATH = [[85.3, 38.8], [85.3, 43.5]];
const FROM_CENTER = [70.3, 44.3];

// The stubborn house, on the front row, and its stairs.
const STUB = [81.4, 39];
const FRONT = [71.2, 74.6, 78, STUB[0], 86.2, 89.6, 93];

// The gull's loop (kept from the greybox), and which way it's facing on screen.
const gull = (t) => ({ x: 88 + Math.cos(t / 2.2) * 3, y: 47 + Math.sin(t / 2.2) * 1.6, z: 3.4 + Math.sin(t * 1.3) * 0.3 });
const gullFace = (t) => { const a = t / 2.2; return (-3 * Math.sin(a) - 1.6 * Math.cos(a)) >= 0 ? 1 : -1; };
// The fry, sticking out of its beak: a screen offset from the gull, turned
// back into world units (at the same height).
const GULL = 1.35; // drawn a size up, so the fry reads
const FRY_OFF = [0.62 * GULL, -0.1 * GULL];
const fryAt = (t) => {
  const p = gull(t), dX = FRY_OFF[0] * gullFace(t), dY = FRY_OFF[1];
  return [p.x + dY + dX / 2, p.y + dY - dX / 2, p.z];
};

export default {
  id: 'town-beach',
  name: 'The Town Beach',
  blurb: 'Rows of houses on the dunes, a beach full by noon, and a set of stairs that never quite reaches the sand.',
  home: [81.5, 45],
  build(R) {
    drawLand(R, land, { fade: nightK, inks: EVENING, surf: true });

    // ---------- The houses ----------
    // Behind the boulevard, two rows in front of it, and the front row up on
    // pilings on the dune, each with a deck out front, towels on the rail and
    // a porch light by the door.
    // (The three back rows: nobody walks between them, so each chunk's houses
    // are one picture; kit's houses().)
    const back = [];
    for (let i = 0; i < 7; i++) back.push([71 + i * 3.4, 27.8, 2.4, 1.8, (i + 1), { h: 1.8, ridge: 'x' }]);
    for (let i = 0; i < 7; i++) back.push([70.6 + i * 3.5, 32.6, 2.6, 2.2, i, { ridge: i % 2 ? 'x' : 'y' }]);
    for (let i = 0; i < 6; i++) back.push([72.2 + i * 3.8, 35.8, 2.6, 2.2, (i + 3), { ridge: i % 2 ? 'y' : 'x' }]);
    houses(R, back);
    FRONT.forEach((x, i) => house(R, x, 39, 2.8, 2.2, (i + 2), { stilts: 1.1, ridge: 'y' }));
    // (The two decks past the path dry one big towel each on a line, drawn
    // with the finds below: one has somebody changing behind it.)
    const TOWELS = [[C.coral, C.white], [C.teal], [C.mustard, C.pink], null, [C.sky], [C.purple], [C.white, C.teal]];
    // (Decks, sandbags and rip-rap: one picture per chunk each, kit's printedRow().)
    const decks = [], bags = [], rocksRow = [];
    FRONT.forEach((x, i) => {
      if (x === STUB[0]) return;
      const y = 41.2, z0 = footing(R, x, 39, 2.8, 2.2) + 1.1, gz = footing(R, x, y + 0.7, 2.8, 0);
      decks.push([x + 2.8, y + 0.72, (ctx, ink, night) => {
        for (const px of [x + 0.18, x + 2.62]) post(ctx, px, y + 0.58, gz - 0.2, z0 - 0.1, ink(shade(C.wood, 0.15)));
        const deckC = ink(tint(C.wood, 0.15));
        face(ctx, [[x, y + 0.7, z0 - 0.12], [x + 2.8, y + 0.7, z0 - 0.12], [x + 2.8, y + 0.7, z0], [x, y + 0.7, z0]], shade(deckC, 0.2), { lw: 0.035 });
        face(ctx, [[x, y, z0], [x + 2.8, y, z0], [x + 2.8, y + 0.7, z0], [x, y + 0.7, z0]], deckC, { lw: 0.035 });
        // The rail, and its balusters.
        if (Q.detail) {
          ctx.strokeStyle = ink(shade(C.white, 0.3)); ctx.lineWidth = 0.035; ctx.beginPath();
          for (let u = 0.25; u < 2.8; u += 0.28) { const [a, b] = P(x + u, y + 0.7, z0), [c, d] = P(x + u, y + 0.7, z0 + 0.66); ctx.moveTo(a, b); ctx.lineTo(c, d); }
          ctx.stroke();
        }
        rail(ctx, [x, y + 0.7, z0 + 0.7], [x + 2.8, y + 0.7, z0 + 0.7], ink(C.white));
        // Beach towels drying over it.
        (TOWELS[i] || []).forEach((col, k) => {
          const u = 0.35 + k * 1.2;
          face(ctx, [[x + u, y + 0.73, z0 + 0.72], [x + u + 0.7, y + 0.73, z0 + 0.72], [x + u + 0.7, y + 0.73, z0 + 0.12], [x + u, y + 0.73, z0 + 0.12]], ink(col), { lw: 0.03 });
          if (Q.detail) face(ctx, [[x + u, y + 0.74, z0 + 0.3], [x + u + 0.7, y + 0.74, z0 + 0.3], [x + u + 0.7, y + 0.74, z0 + 0.22], [x + u, y + 0.74, z0 + 0.22]], ink(C.white), { stroke: false });
        });
        // The porch light by the door: off by day, on in the night's print.
        face(ctx, [[x + 1.82, y, z0 + 1.2], [x + 1.96, y, z0 + 1.2], [x + 1.96, y, z0 + 1.4], [x + 1.82, y, z0 + 1.4]], night ? LIT : C.greyLight, { lw: 0.025 });
        if (night) disc(ctx, x + 1.89, y, z0 + 1.3, 0.3, alpha(LIT, 0.3), { stroke: false });
      }, x > PATH[0][0] ? 'past the path' : '']);
    });

    // Sandbags along the front row's toe, two courses (not under the stairs),
    // with rip-rap piled in front at the north end, where the dune's gone
    // lower. One sandbag has an opinion.
    for (let x0 = 70.6; x0 < 95.6; x0 += 4.8) {
      const low = [], high = [];
      for (let x = x0; x < Math.min(x0 + 4.8, 95.4); x += 0.95) {
        if (x > STUB[0] - 1 && x < STUB[0] + 3) continue;
        const z = footing(R, x, 42.65, 0.9, 0.5);
        low.push([x, 42.65, z]);
        if (x + 1.4 < 95.4 && !(x + 0.5 > STUB[0] - 1 && x < STUB[0] + 3)) high.push([x + 0.48, 42.6, z + 0.26]);
      }
      bags.push([x0 + 4.8, 43.2, (ctx, ink) => {
        for (const [row, col] of [[low, ink(BAG)], [high, ink(tint(BAG, 0.08))]]) {
          ctx.beginPath();
          for (const b of row) bagPath(ctx, ...b);
          paint(ctx, col, { dots: shade(col, 0.45), density: 0.14, lw: 0.035 });
          if (!Q.detail) continue;
          ctx.beginPath();
          for (const b of row) seamPath(ctx, ...b);
          ctx.strokeStyle = tint(col, 0.25); ctx.lineWidth = 0.04; ctx.stroke();
        }
        if (x0 < 76 && x0 + 4.8 > 76) board(ctx, 'x', 76.6, 43.16, footing(R, 75.4, 42.65, 0.9, 0.5) + 0.14, 1.9, 0.2, 'NICE TRY, OCEAN', { board: ink(BAG), edge: 0.001, ink: C.navy, size: 0.17 });
      }]);
    }
    for (let x0 = 86.2; x0 < 91; x0 += 3) {
      const rocks = [];
      for (let k = 0; k < 4; k++) {
        const x = x0 + 0.35 + k * 0.72, y = 43.45 + ((k * 5) % 3) * 0.12;
        rocks.push([x, y, footing(R, x - 0.3, y - 0.3, 0.6, 0.6) - 0.05, 0.3 + ((k * 7) % 3) * 0.05, 0.3 + (k % 2) * 0.1, x0 + k]);
      }
      rocksRow.push([x0 + 3, 43.9, (ctx, ink) => riprap(ctx, rocks, ink(ROCK))]);
    }
    printedRow(R, decks);
    printedRow(R, bags);
    printedRow(R, rocksRow);

    // ---------- The stubborn house: porch, stairs, sign ----------
    const [sx, sy] = STUB, deck = footing(R, sx, sy, 2.8, 2.2) + 1.1;
    const SX0 = sx + 0.8, SX1 = sx + 1.6; // the stairs' sides
    const RUN = 0.6, RISE = 0.3, Y0 = sy + 3.2; // they start at the porch's front
    const tread = (k) => ({ y: Y0 + k * RUN, z: deck - RISE * (k + 1) }); // k: 0 to 4, and 5, the new one
    const NEW_Z = tread(4).z - 0.3;
    const porchG = footing(R, sx, sy + 3.2, 2.8, 0);
    const lampAt = [[sx + 1.75, sy + 2.2, deck + 1.25], [sx + 1.89, sy + 2.2, deck + 1.25], [sx + 1.89, sy + 2.2, deck + 1.45], [sx + 1.75, sy + 2.2, deck + 1.45]];
    printed(R, sx + 2.8, sy + 3.25, (ctx, ink) => {
      for (const px of [sx + 0.18, sx + 2.68]) post(ctx, px, sy + 3.08, porchG - 0.2, deck - 0.15, ink(shade(C.wood, 0.15)));
      box(ctx, sx, sy + 2.2, deck - 0.15, 2.8, 1, 0.15, ink(tint(C.wood, 0.2)), { flat: true, lw: 0.04 });
      // Its rail, open where the stairs go down.
      for (const [u0, u1] of [[0, 0.8], [1.6, 2.8]]) {
        if (Q.detail) {
          ctx.strokeStyle = shade(C.white, 0.3); ctx.lineWidth = 0.035; ctx.beginPath();
          for (let u = u0 + 0.12; u < u1; u += 0.26) { const [a, b] = P(sx + u, sy + 3.2, deck), [c, d] = P(sx + u, sy + 3.2, deck + 0.66); ctx.moveTo(a, b); ctx.lineTo(c, d); }
          ctx.stroke();
        }
        rail(ctx, [sx + u0, sy + 3.2, deck + 0.7], [sx + u1, sy + 3.2, deck + 0.7], ink(C.white));
      }
      // What the owner thinks of it all, on the rail.
      board(ctx, 'x', sx + 2.35, sy + 3.24, deck + 0.4, 0.85, 0.36, 'STILL HERE', { board: ink(C.white), size: 0.16, ink: C.navy });
      // The porch light, off.
      face(ctx, lampAt, ink(C.greyLight), { lw: 0.025 });
    });
    // Three porch chairs, facing the sea (behind whoever sits in them).
    R.thing(sx + 2.6, sy + 2.35, (ctx) => {
      for (const [cx, col] of [[sx + 0.25, C.teal], [sx + 1.2, C.coral], [sx + 2.05, C.mustard]]) {
        face(ctx, [[cx, sy + 2.3, deck + 0.4], [cx + 0.55, sy + 2.3, deck + 0.4], [cx + 0.55, sy + 2.3, deck + 0.95], [cx, sy + 2.3, deck + 0.95]], shade(col, 0.1), { lw: 0.03 });
        face(ctx, [[cx, sy + 2.3, deck + 0.4], [cx + 0.55, sy + 2.3, deck + 0.4], [cx + 0.55, sy + 2.8, deck + 0.4], [cx, sy + 2.8, deck + 0.4]], col, { lw: 0.03 });
        face(ctx, [[cx, sy + 2.8, deck], [cx + 0.55, sy + 2.8, deck], [cx + 0.55, sy + 2.8, deck + 0.4], [cx, sy + 2.8, deck + 0.4]], shade(col, 0.22), { lw: 0.03 });
      }
    });
    R.thing(sx + 2.8, sy + 3.26, (ctx) => face(ctx, lampAt, LIT, { lw: 0.025 }), { on: lightsOn });
    nightGlow(R, sx + 1.4, sy + 2.8, deck + 1.1, 2.4, LIT, 0.7);
    // Planks under the house, where the owner keeps next year. (His toolbox
    // is out on the sand by the stairs: a find's in it.)
    R.thing(sx + 2.6, sy + 2.3, (ctx) => {
      const z = footing(R, sx + 1.6, sy + 1.6, 1, 0.6);
      for (let k = 0; k < 3; k++) box(ctx, sx + 1.4 + k * 0.05, sy + 1.6, z + k * 0.08, 1.2, 0.4, 0.08, k ? NEW_WOOD : WOOD, { flat: true, lw: 0.025 });
    });
    // A flag on the porch corner, flying.
    R.thing(sx + 2.75, sy + 3.2, (ctx, t) => {
      const x = sx + 2.72, y = sy + 3.12, z = deck;
      box(ctx, x - 0.03, y - 0.03, z, 0.06, 0.06, 2, C.white, { flat: true, lw: 0.025 });
      const pts = [];
      for (let k = 0; k <= 4; k++) pts.push([x - k * 0.22, y + Math.sin(t * 5 - k) * 0.05 * k, z + 1.95 - Math.sin(t * 5 - k + 1) * 0.03 * k]);
      const top = pts.map(([a, b, c]) => [a, b, c]), bot = pts.map(([a, b, c]) => [a, b, c - 0.5]).reverse();
      face(ctx, [...top, ...bot], C.coral, { lw: 0.03 });
      if (Q.detail) face(ctx, [...pts.slice(0, 3).map(([a, b, c]) => [a, b, c - 0.02]), ...pts.slice(0, 3).map(([a, b, c]) => [a, b, c - 0.24]).reverse()], C.navy, { stroke: false });
    }, { anim: true });

    // The stairs: stringers, rails, five treads, and posts under all but the
    // last. The tally of summers is painted on the stringer.
    const last = tread(4);
    printed(R, SX1, last.y + RUN, (ctx, ink) => {
      const str = (x, fill) => face(ctx, [[x, Y0, deck + 0.02], [x, last.y + RUN, last.z + 0.02], [x, last.y + RUN, last.z - 0.28], [x, Y0, deck - 0.3]], fill, { lw: 0.035 });
      for (const k of [1, 3]) {
        const tk = tread(k), g = footing(R, SX0, tk.y + 0.3, 0.8, 0);
        for (const px of [SX0 + 0.08, SX1 - 0.08]) post(ctx, px, tk.y + 0.36, g - 0.2, tk.z - 0.1, shade(C.wood, 0.15), 0.12);
      }
      str(SX0, ink(shade(WOOD, 0.2)));
      for (let k = 0; k < 5; k++) {
        const tk = tread(k);
        box(ctx, SX0, tk.y, tk.z - 0.1, SX1 - SX0, RUN, 0.1, ink(tint(WOOD, 0.15 - k * 0.02)), { flat: true, lw: 0.03 });
      }
      str(SX1, ink(WOOD));
      // Rails: a post at each end, a rail between.
      for (const x of [SX0, SX1]) {
        for (const [y, z] of [[Y0 + 0.1, deck], [last.y + RUN - 0.1, last.z]]) post(ctx, x, y, z, z + 0.85, ink(C.white), 0.07);
        rail(ctx, [x, Y0 + 0.1, deck + 0.85], [x, last.y + RUN - 0.1, last.z + 0.85], ink(C.white), 0.07);
      }
      if (Q.detail) {
        // The tally: four strokes and one across, a summer each.
        ctx.strokeStyle = PAINT; ctx.lineWidth = 0.05; ctx.lineCap = 'round'; ctx.beginPath();
        const ty = (k) => Y0 + 0.9 + k * 0.16, tz = (y) => deck - (y - Y0) * (RISE / RUN) - 0.1;
        for (let k = 0; k < 4; k++) { const y = ty(k), [a, b] = P(SX1 + 0.005, y, tz(y) - 0.02), [c, d] = P(SX1 + 0.005, y, tz(y) - 0.2); ctx.moveTo(a, b); ctx.lineTo(c, d); }
        const [a, b] = P(SX1 + 0.005, ty(-0.4), tz(ty(-0.4)) - 0.18), [c, d] = P(SX1 + 0.005, ty(3.4), tz(ty(3.4)) - 0.04);
        ctx.moveTo(a, b); ctx.lineTo(c, d);
        ctx.stroke();
      }
    });
    // The sixth tally, painted this evening.
    R.thing(SX1 + 0.01, last.y + RUN, (ctx) => {
      if (!Q.detail) return;
      const y = Y0 + 0.9 + 4.6 * 0.16, z = deck - (y - Y0) * (RISE / RUN) - 0.1;
      face(ctx, [[SX1 + 0.005, y, z - 0.02], [SX1 + 0.005, y, z - 0.2]], null, { lw: 0.05, stroke: PAINT });
    }, { on: (t) => wrap(t) >= at(18.3) });
    // This summer's step, nailed on in the afternoon: fresh wood, still a
    // foot short of the sand.
    R.thing(SX1, last.y + RUN * 2, (ctx) => {
      const y = last.y + RUN;
      for (const x of [SX0, SX1]) face(ctx, [[x, y - 0.3, last.z - 0.1], [x, y + RUN, NEW_Z + 0.02], [x, y + RUN, NEW_Z - 0.22], [x, y - 0.3, last.z - 0.28]], NEW_WOOD, { lw: 0.03 });
      box(ctx, SX0, y, NEW_Z - 0.1, SX1 - SX0, RUN, 0.1, tint(NEW_WOOD, 0.1), { flat: true, lw: 0.03 });
    }, { on: (t) => wrap(t) >= at(15.5) });
    // The gap, in shadow on the sand under the bottom step.
    R.rug((ctx) => disc(ctx, (SX0 + SX1) / 2, last.y + RUN * 0.8, h((SX0 + SX1) / 2, last.y + RUN * 0.8) + 0.01, 0.42, alpha(C.ink, 0.14), { stroke: false }));
    // The signs everyone on the porch is ignoring.
    signpost(R, sx - 0.55, sy + 3.5, 'DANGER: ERODING DUNE', { w: 2.6, h: 0.5, size: 0.18, board: C.mustard, post: 1.3 });
    signpost(R, SX1 + 0.7, last.y + RUN * 1.7, 'MIND THE GAP', { w: 1.5, h: 0.38, size: 0.16, post: 0.6 });
    // The path down between the houses, a strip of boards over the dune.
    R.rug((ctx) => {
      for (let y = PATH[0][1]; y < PATH[1][1] - 0.1; y += 0.5) {
        const z = h(PATH[0][0], y + 0.25) + 0.03;
        face(ctx, [[PATH[0][0] - 0.45, y, z], [PATH[0][0] + 0.45, y, z], [PATH[0][0] + 0.45, y + 0.42, z], [PATH[0][0] - 0.45, y + 0.42, z]], tint(C.woodLight, 0.25), { lw: 0.03 });
      }
    });
    signpost(R, PATH[1][0] - 0.55, PATH[1][1] - 0.6, 'NO GREENHEADS', { along: 'y', w: 1.9, h: 0.42, size: 0.17, post: 1.1 });

    // ---------- The owner, and his step ----------
    // His day, in hours: coffee on the bottom step; the plank down from under
    // the house; hammering (lunch on the step); the new step, and standing on
    // it; the gap; the tally; the sunset; the porch; and at the king tide, his
    // new step, with a lantern, just clear of the water.
    const ownerLook = folk(251, { top: C.mustard, bottom: C.navy, hair: C.grey, style: 'bald', hat: 'cap' });
    const onStep = (k, z = tread(k).z) => ({ x: (SX0 + SX1) / 2, y: tread(k).y + 0.3, z: z - 0.8, pose: 'sit', dir: 'l', ahead: 2 });
    const WORK = [SX0 - 0.6, last.y + RUN * 1.2];
    const PILE = [sx + 2.4, sy + 2.9];
    const down = [[PILE[0], PILE[1]], [SX1 + 0.55, Y0 + 0.6], [SX1 + 0.55, last.y + RUN * 2.2], [SX0 - 0.6, last.y + RUN * 2.2], WORK];
    const stairsUp = [[(SX0 + SX1) / 2, tread(3).y + 0.3, tread(3).z], [(SX0 + SX1) / 2, Y0 + 0.1, deck], [sx + 1.2, sy + 2.6, deck]];
    // (Porch sitters sort between the house and the porch rail in front of them.)
    const PORCH_D = sx + sy + 5.1, porchAhead = (x) => PORCH_D - (x + sy + 2.55);
    const porchSeat = { x: sx + 1.47, y: sy + 2.55, z: deck - 0.35, pose: 'sit', dir: 'l', ahead: porchAhead(sx + 1.47) };
    const owner = (t) => {
      const s = wrap(t), hr = hour(t);
      let p;
      if (hr >= 5 && hr < 7.3) p = { ...onStep(4), hold: mug(C.white) };
      else if (hr >= 7.3 && hr < 8.3) {
        const s0 = at(7.3), back = at(7.75);
        p = s < back ? trip(s, s0, [...down].reverse()) || { x: PILE[0], y: PILE[1] } : trip(s, back, down) || { x: WORK[0], y: WORK[1] };
        p = { ...p, pose: s < back ? 'walk' : 'carry', hold: s < back ? null : plank };
      } else if ((hr >= 8.3 && hr < 12) || (hr >= 12.8 && hr < 15.5)) {
        const k = (t * 1.6) % 1, a = k < 0.25 ? 2.6 - k * 5.6 : 1.2 + (k - 0.25) * 1.9;
        p = { x: WORK[0], y: WORK[1], pose: 'stand', arms: [a, 0.4], hold: hammer(a), dir: 'r', bang: k < 0.25 };
      } else if (hr >= 12 && hr < 12.8) p = { ...onStep(4), hold: book(C.white) };
      else if (hr >= 15.5 && hr < 16.6) p = { x: (SX0 + SX1) / 2, y: last.y + RUN * 1.5, z: NEW_Z, pose: 'cheer', dir: 'l', ahead: 2, say: 'Nailed it.' };
      else if (hr >= 16.6 && hr < 17.6) p = { x: WORK[0] - 0.2, y: WORK[1] + 0.4, pose: 'point', dir: 'r', say: 'Hm.' };
      else if (hr >= 17.6 && hr < 19.8) p = { x: SX1 + 0.6, y: Y0 + 1.3, pose: 'point', dir: 'l', hold: mug(C.white) };
      else if (hr >= 19.8 && hr < 20.9) p = { x: (SX0 + SX1) / 2, y: tread(3).y + 0.3, z: tread(3).z, pose: 'stand', dir: 'r', back: true, ahead: 2 };
      else if (hr >= 20.9 && hr < 21.25) {
        const q = trip(s, at(20.9), stairsUp, 0.9);
        p = q ? { ...q, pose: 'walk', ahead: 2.5 } : porchSeat;
      } else if (between(hr, 21.25, 23.6)) p = porchSeat;
      else if (hr >= 23.6 && hr < 23.95) {
        const q = trip(s, at(23.6), [[sx + 1.2, sy + 2.6, deck], [(SX0 + SX1) / 2, Y0 + 0.1, deck], [(SX0 + SX1) / 2, last.y + RUN * 1.5, NEW_Z]], 0.9);
        p = q ? { ...q, pose: 'walk', ahead: 2 } : { ...onStep(5, NEW_Z) };
      } else p = { ...onStep(5, NEW_Z), hold: lantern(lightsOn(t)), lamp: true, say: s > 300 && s < 322 ? 'Told you it\'d reach.' : null };
      if (p.z == null) p.z = h(p.x, p.y);
      // The swarm, if it comes by his work.
      if (!p.ahead) {
        const a = aside(p.x, p.y, t);
        if (a.k > 0) { p = { ...p, x: p.x + a.dx, y: p.y + a.dy, z: h(p.x + a.dx, p.y + a.dy) }; if (a.k > 0.5) p = { ...p, pose: 'wave', arms: null, hold: null }; }
      }
      return p;
    };
    R.mover(owner, (ctx, t, p) => {
      who(ctx, p.x, p.y, p.z, { ...ownerLook, wear: belt, hold: p.hold || undefined, arms: p.arms || undefined }, null, p, t);
      if (!Q.detail) return;
      if (p.bang) say(ctx, p.x + 0.5, p.y - 0.6, p.z + 1.7, 'BANG');
      if (p.say) say(ctx, p.x, p.y, p.z + 2.9, p.say);
    });
    R.light({ at: (t) => { const p = owner(t); return [p.x, p.y, p.z + 1.3]; }, r: 1.8, color: LIT, k: (t) => (owner(t).lamp ? nightK(t) * 0.8 : 0) });

    // The porch, full of people ignoring the sign: a reader, a toaster and
    // a waver, from nine till the small hours, up for the sunset.
    // (The middle chair is the owner's, from the evening.)
    const porchHours = (t) => between(hour(t), 9, 1.5);
    stay(R, sx + 0.52, sy + 2.55, folk(253, { hat: 'sun' }), { z: deck - 0.35, pose: 'sit', dir: 'l', arms: [1.0, 1.0], hold: book(C.coral), hours: (t) => porchHours(t) && !sunsetWatch(t), sun: false, depth: sx + sy + 2.55 + 0.52 + porchAhead(sx + 0.52) });
    stay(R, sx + 0.52, sy + 2.75, folk(253, { hat: 'sun' }), { z: deck, pose: 'stand', dir: 'r', back: true, hours: (t) => porchHours(t) && sunsetWatch(t), sun: false, depth: sx + sy + 2.55 + 0.52 + porchAhead(sx + 0.52) });
    [[sx + 2.32, 257, 'sit']].forEach(([x, seed, role]) => {
      const i = 2;
      const look = folk(seed);
      R.mover(() => ({ x, y: sy + 2.55, ahead: porchAhead(x) }), (ctx, t) => {
        const hr = hour(t);
        if (!between(hr, 9, 1.5)) return;
        const y = sy + 2.55;
        if (sunsetWatch(t)) { who(ctx, x, y + 0.2, deck, look, null, { pose: 'stand', dir: 'r', back: true }, t); return; }
        const cheer = i === 2 && Math.sin(t * 0.7 + 1) > 0.85;
        who(ctx, x, y, deck - 0.35, { ...look, hold: role === 'read' ? book(C.coral) : undefined, arms: role === 'read' ? [1.0, 1.0] : undefined }, null, { pose: cheer ? 'wave' : 'sit', dir: 'l' }, t);
        if (i === 2 && hr > 10 && hr < 18 && (t % 23) < 3) say(ctx, x, y, deck + 2.3, 'What erosion?');
      });
    });
    // And one more, standing at the rail with a drink, all day.
    const toaster = folk(259, { top: C.white, bottom: C.coral });
    stay(R, sx + 0.4, sy + 3.0, toaster, { z: deck, pose: 'stand', dir: 'l', hold: mug(C.coral), hours: (t) => between(hour(t), 10, 23), depth: sx + 1.2 + sy + 3.0 + 2.5 });

    // ---------- The beach ----------
    // Umbrellas, and the families under them.
    SPOTS.forEach(([x, y], i) => {
      const z = h(x, y), seat = i === 5 ? [x - 1.1, y + 0.6] : [x + 0.9, y + 0.5];
      const pose = POSE[i];
      const lie = pose === 'lie';
      const here = lie ? [x + 0.35, y + 0.25] : seat;
      const pts = [...(x < 80 ? [FROM_CENTER] : PATH), here];
      const dur = plen(pts) / 1.3;
      const aS = at(ARRIVE[i]), set = aS + dur, lS = at(LEAVE[i]), gone = lS + dur;
      const down = at(Math.min(LEAVE[i], 19.8));
      const look = folk(110 + i * 3, i === 3 ? { hat: 'sun' } : i === 6 ? { top: C.white } : {});
      // The umbrella and its things, while they're set up.
      R.thing(x + 0.2, y + 0.6, (ctx) => {
        if (i === 1) {
          // A cooler (the beach's one Gander Cola is on the goose's deck).
          box(ctx, x + 0.95, y - 0.35, z, 0.6, 0.4, 0.38, C.sky, { flat: true, lw: 0.03, top: C.white });
        }
        if (i === 3) {
          // The wagon they hauled it all down in.
          box(ctx, x - 1.05, y + 0.1, z + 0.12, 0.7, 0.45, 0.3, C.teal, { flat: true, lw: 0.03 });
          for (const [wx, wy] of [[x - 0.95, y + 0.55], [x - 0.5, y + 0.55]]) disc(ctx, wx, wy, z + 0.1, 0.09, C.ink, { stroke: false });
          box(ctx, x - 0.95, y + 0.15, z + 0.42, 0.3, 0.3, 0.2, C.white, { flat: true, lw: 0.025 });
        }
        umbrella(ctx, x, y, z, COLORS[i]);
        if (!lie) {
          // A low beach chair.
          box(ctx, seat[0] - 0.25, seat[1] - 0.25, z + 0.2, 0.5, 0.5, 0.08, tint(COLORS[(i + 2) % 8], 0.2), { flat: true, lw: 0.03 });
          face(ctx, [[seat[0] - 0.25, seat[1] - 0.25, z + 0.28], [seat[0] + 0.25, seat[1] - 0.25, z + 0.28], [seat[0] + 0.25, seat[1] - 0.45, z + 0.9], [seat[0] - 0.25, seat[1] - 0.45, z + 0.9]], tint(COLORS[(i + 2) % 8], 0.35), { lw: 0.03 });
        }
      }, { on: (t) => { const s = wrap(t); return s >= set && s < down && level(t) < z - 0.1; } });
      // Sitting there, with nobody swatting past: a still picture. (The
      // fries family, who shout at the gull, are always live.)
      const quiet = (t) => { const s = wrap(t); return i !== 6 && s >= set && s < lS && !(sunsetWatch(t) && LEAVE[i] > 20) && aside(here[0], here[1], t).k === 0; };
      if (i !== 6) {
        const sit = pose === 'read' ? 'sit' : pose, pz = z - (pose === 'lie' ? -0.05 : 0.35);
        R.thing(here[0], here[1], (ctx) => person(ctx, here[0], here[1], pz, { ...look, pose: sit, dir: i % 2 ? 'l' : 'r', ...(pose === 'read' ? { arms: [1.0, 1.0], hold: book(COLORS[(i + 3) % 8]) } : {}) }, 0), { on: quiet, depth: here[0] + here[1] + 0.1 + (lie ? 0.1 : 0) });
      }
      R.mover((t) => {
        const s = wrap(t);
        if (s < aS || s >= gone || quiet(t)) return { x, y, off: true };
        if (s < set) return { ...trip(s, aS, pts), pose: 'carry', walking: true };
        if (s >= lS) return { ...trip(s, lS, [...pts].reverse()), pose: 'walk', walking: true };
        if (sunsetWatch(t) && LEAVE[i] > 20) return { x: seat[0], y: seat[1], pose: 'stand', dir: 'r', back: true };
        return { x: here[0], y: here[1], pose, dir: i % 2 ? 'l' : 'r', seated: true, ahead: lie ? 0.1 : 0 };
      }, (ctx, t, p) => {
        if (p.off) return;
        let { x: px, y: py, pose: ps } = p;
        let hold, arms;
        // Stepping aside for the swarm, swatting.
        const a = aside(px, py, t);
        if (a.k > 0.5) { px += a.dx; py += a.dy; ps = 'wave'; } else if (a.k > 0) { px += a.dx; py += a.dy; }
        const up = ps !== 'sit' && ps !== 'read' && ps !== 'lie';
        const pz = h(px, py) - (up ? 0 : ps === 'lie' ? -0.05 : 0.35);
        if (ps === 'read') { ps = 'sit'; arms = [1.0, 1.0]; hold = book(COLORS[(i + 3) % 8]); }
        // The fry boat, on the towel under the gull's loop.
        if (i === 6 && p.seated && ps !== 'wave') {
          const shout = (t % 11) < 2.2;
          if (shout) { ps = 'stand'; arms = [2.6, 0.2]; }
          else hold = fries;
          who(ctx, px, py, shout ? h(px, py) : pz, { ...look, hold, arms }, null, { pose: ps, dir: 'l' }, t);
          if (shout) say(ctx, px, py, h(px, py) + 2.8, 'My fry!');
          return;
        }
        who(ctx, px, py, pz, { ...look, hold, arms }, null, { pose: ps, dir: p.dir, back: p.back }, t);
        // The wagon, hauled behind on the way in and out.
        if (i === 3 && p.walking) {
          const bx = px + (p.dir === 'r' ? -0.8 : 0.8) * (p.back ? -0.6 : 1), by = py + (p.back ? 0.6 : -0.5);
          box(ctx, bx - 0.35, by - 0.22, h(bx, by) + 0.12, 0.7, 0.45, 0.3, C.teal, { flat: true, lw: 0.03 });
        }
      }, { bias: 0.1 });
    });

    // The volleyball net, and a game that's been 14 to 14 since ten.
    const NET = [73.8, 46.6, 48.8], netZ = h(NET[0], 47.7);
    R.thing(NET[0] + 0.1, NET[2] + 0.1, (ctx) => {
      for (const y of [NET[1], NET[2]]) box(ctx, NET[0] - 0.05, y - 0.05, h(NET[0], y) - 0.1, 0.1, 0.1, 2.4, C.white, { flat: true, lw: 0.03 });
      const zt = netZ + 2.2;
      face(ctx, [[NET[0], NET[1], zt], [NET[0], NET[2], zt], [NET[0], NET[2], zt - 0.55], [NET[0], NET[1], zt - 0.55]], alpha(C.white, 0.35), { lw: 0.03 });
      face(ctx, [[NET[0], NET[1], zt], [NET[0], NET[2], zt]], null, { lw: 0.08, stroke: C.white });
      if (Q.detail) {
        ctx.strokeStyle = alpha(C.ink, 0.35); ctx.lineWidth = 0.02; ctx.beginPath();
        for (let y = NET[1] + 0.2; y < NET[2]; y += 0.2) { const [a, b] = P(NET[0], y, zt), [c, d] = P(NET[0], y, zt - 0.55); ctx.moveTo(a, b); ctx.lineTo(c, d); }
        ctx.stroke();
      }
    }, { on: (t) => level(t) < netZ - 0.3 });
    const game = (t) => between(hour(t), 9.8, 17.8) && level(t) < netZ - 0.3;
    const PERIOD = 2.8;
    [[72.4, 47.5, 'r', 311], [75.3, 47.9, 'l', 313]].forEach(([x, y, dir, seed], i) => {
      const look = folk(seed, { top: i ? C.coral : C.teal, bottom: C.navy });
      R.mover(() => ({ x, y }), (ctx, t) => {
        if (!game(t)) return;
        const a = aside(x, y, t);
        const k = ((t / PERIOD) + i * 0.5) % 1;
        const pose = a.k > 0.5 ? 'wave' : k < 0.12 ? 'jump' : 'stand';
        who(ctx, x + a.dx, y + a.dy, h(x + a.dx, y + a.dy), look, null, { pose, dir }, t);
      });
    });
    R.mover((t) => {
      const k = (t / PERIOD) % 1, q = k < 0.5 ? k * 2 : 2 - k * 2;
      const x = 72.7 + (75.0 - 72.7) * q, y = 47.5 + 0.4 * q;
      return { x, y, z: h(x, y) + 2.1 + Math.sin(q * Math.PI) * 1.8 };
    }, (ctx, t, p) => {
      if (!game(t)) return;
      disc(ctx, p.x, p.y, h(p.x, p.y) + 0.02, 0.18, alpha(C.ink, 0.15), { stroke: false });
      const [X, Y] = P(p.x, p.y, p.z);
      ctx.beginPath(); ctx.arc(X, Y, 0.2, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.035 });
      if (Q.detail) { ctx.beginPath(); ctx.arc(X, Y, 0.2, 0.4, 1.6); ctx.strokeStyle = C.mustard; ctx.lineWidth = 0.05; ctx.stroke(); }
    }, { bias: 0.5 });

    // Kids and a sandcastle low on the beach: one pats it, one runs to the
    // sea for water, over and over, until the tide takes it anyway.
    const CASTLE = [79.6, 48.2], castleZ = h(...CASTLE);
    R.thing(CASTLE[0] + 0.6, CASTLE[1] + 0.6, (ctx) => {
      const [x, y] = CASTLE, z = castleZ, sand = shade(INK.sand, 0.08);
      disc(ctx, x, y, z + 0.02, 0.8, alpha(shade(INK.sand, 0.2), 0.5), { stroke: false });
      box(ctx, x - 0.45, y - 0.45, z, 0.9, 0.9, 0.35, sand, { flat: true, lw: 0.03 });
      for (const [dx, dy] of [[-0.45, -0.45], [0.2, -0.45], [-0.45, 0.2], [0.2, 0.2]]) box(ctx, x + dx, y + dy, z + 0.35, 0.25, 0.25, 0.3, tint(sand, 0.08), { flat: true, lw: 0.03 });
      box(ctx, x - 0.15, y - 0.15, z + 0.35, 0.3, 0.3, 0.55, tint(sand, 0.12), { flat: true, lw: 0.03 });
      box(ctx, x - 0.01, y - 0.01, z + 0.9, 0.02, 0.02, 0.4, C.ink, { flat: true, stroke: false });
      face(ctx, [[x, y, z + 1.3], [x + 0.3, y, z + 1.2], [x, y, z + 1.1]], C.coral, { lw: 0.02 });
      box(ctx, x + 0.6, y + 0.3, z, 0.22, 0.22, 0.2, C.mustard, { flat: true, lw: 0.025 });
    }, { on: (t) => { const s = wrap(t); return s >= at(9.8) && level(t) < castleZ - 0.02; } });
    const kidA = folk(321, { top: C.pink }), kidB = folk(323, { top: C.mustard, bottom: C.teal });
    const kids = (t) => between(hour(t), 9.8, 18.4) && level(t) < castleZ - 0.02;
    R.mover(() => ({ x: CASTLE[0] - 0.6, y: CASTLE[1] + 0.7 }), (ctx, t) => {
      if (!kids(t)) return;
      const x = CASTLE[0] - 0.6, y = CASTLE[1] + 0.7;
      who(ctx, x, y, h(x, y) - 0.2, kidA, null, { pose: 'drum', dir: 'r', scale: 0.7 }, t);
    });
    R.mover((t) => {
      const k = (t / 7) % 1, q = k < 0.5 ? k * 2 : 2 - k * 2, y0 = CASTLE[1] + 0.8, y1 = Math.max(y0, shore(level(t)) - 0.3);
      return { x: CASTLE[0] + 0.9, y: y0 + (y1 - y0) * q, out: k < 0.5 };
    }, (ctx, t, p) => {
      if (!kids(t)) return;
      const L = level(t), z = h(p.x, p.y);
      who(ctx, p.x, p.y, z, { ...kidB, hold: mug(C.teal) }, null, { pose: 'run', dir: p.out ? 'l' : 'r', back: !p.out, scale: 0.7 }, t);
      if (L > z - 0.05 && Q.detail) disc(ctx, p.x, p.y, L + 0.01, 0.35, null, { lw: 0.04, stroke: alpha(C.white, 0.9) });
    });

    // A man with a metal detector, sweeping the low beach while it's out,
    // who stops to dig a unit or two from the cooler and never looks round.
    const detect = (t) => {
      const s = wrap(t), s0 = at(7.4), len = 92;
      if (s < s0 || s > s0 + len) return null;
      const u = (s - s0) / len; // there and back, with a stop to dig
      const lerp = (a, b, k) => a + (b - a) * k;
      const x = u < 0.35 ? lerp(77.2, 86.6, u / 0.35) : u < 0.5 ? 86.6 : u < 0.7 ? lerp(86.6, 91.2, (u - 0.5) / 0.2) : lerp(91.2, 77.2, (u - 0.7) / 0.3);
      const dig = u >= 0.35 && u < 0.5, backW = u >= 0.7;
      return { x, y: 48.1, dig, dir: backW ? 'l' : 'r' };
    };
    const detLook = folk(331, { top: C.sky, bottom: C.brown, hat: 'sun' });
    R.mover((t) => detect(t) || { x: 80, y: 48.1, off: true }, (ctx, t, p) => {
      if (p.off || level(t) > h(p.x, p.y) - 0.05) return;
      const z = h(p.x, p.y);
      if (p.dig) {
        who(ctx, p.x, p.y, z, detLook, null, { pose: 'point', dir: 'r' }, t);
        disc(ctx, p.x + 0.7, p.y - 0.2, z + 0.02, 0.28, shade(INK.sand, 0.3), { lw: 0.03 });
        if ((t % 6) < 2) say(ctx, p.x, p.y, z + 2.8, 'Beep!');
        return;
      }
      who(ctx, p.x, p.y, z, { ...detLook, hold: detector(Math.sin(t * 2.4)), arms: [0.9, -0.1] }, null, { pose: 'walk', dir: p.dir }, t);
    });

    // Surfers, just past the break, wherever it is.
    for (const [x, ph, col] of [[76, 0, C.coral], [84, 2.2, C.white], [91, 4, C.mustard]]) {
      const look = folk(130 + ph * 3, { top: C.navy, bottom: C.navy });
      R.mover((t) => {
        const L = level(t), y = Math.min(56, shore(L) + 2.4 + Math.sin(t / 3 + ph) * 1);
        return { x: x + Math.sin(t / 7 + ph) * 1.5, y, surfing: Math.sin(t / 3 + ph) < -0.3, on: between(hour(t), 5.8, 19.6) };
      }, (ctx, t, p) => {
        if (!p.on) return;
        const z = level(t);
        // A board with a point, along x.
        face(ctx, [[p.x - 0.8, p.y - 0.18, z + 0.04], [p.x + 0.45, p.y - 0.2, z + 0.04], [p.x + 0.85, p.y, z + 0.04], [p.x + 0.45, p.y + 0.2, z + 0.04], [p.x - 0.8, p.y + 0.18, z + 0.04]], col, { lw: 0.035 });
        if (Q.detail) face(ctx, [[p.x - 0.75, p.y, z + 0.05], [p.x + 0.8, p.y, z + 0.05]], null, { lw: 0.03, stroke: shade(col, 0.3) });
        if (p.surfing) {
          who(ctx, p.x, p.y, z + 0.06, look, null, { pose: 'skate' }, t);
          if (Q.detail) disc(ctx, p.x - 0.9, p.y, z + 0.02, 0.35, null, { lw: 0.05, stroke: alpha(C.white, 0.9) });
        } else who(ctx, p.x, p.y, z - 0.9, look, null, { pose: 'swim' }, t);
      });
    }

    // Plovers, running up and down the waterline with the surf.
    for (const [x0, ph] of [[78.6, 0], [79.3, 1.3], [80.1, 2.5]]) {
      R.mover((t) => {
        const L = level(t);
        return { x: x0 + Math.sin(t / 5 + ph) * 0.9, y: shore(L) - 0.35 + Math.sin(t * 1.1 + ph) * 0.45, L };
      }, (ctx, t, p) => {
        if (!between(hour(t), 5.5, 20.6)) return;
        const z = Math.max(h(p.x, p.y), p.L), [X, Y] = P(p.x, p.y, z);
        const f = Math.cos(t * 1.1 + ph) > 0 ? 1 : -1, leg = Math.sin(t * 16 + ph) * 0.05;
        ctx.save(); ctx.translate(X, Y); ctx.scale(f, 1);
        if (Q.detail) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.beginPath(); ctx.moveTo(-0.02, -0.1); ctx.lineTo(-0.02 + leg, 0); ctx.moveTo(0.04, -0.1); ctx.lineTo(0.04 - leg, 0); ctx.stroke(); }
        ctx.beginPath(); ctx.ellipse(0, -0.16, 0.14, 0.08, -0.1, 0, Math.PI * 2); paint(ctx, tint(INK.sand, 0.1), { lw: 0.025 });
        ctx.beginPath(); ctx.arc(0.11, -0.24, 0.055, 0, Math.PI * 2); paint(ctx, tint(INK.sand, 0.1), { lw: 0.025 });
        ctx.restore();
      });
    }

    // The gull, going round and round with somebody's fry.
    R.mover(gull, (ctx, t, p) => {
      const f = gullFace(t), flap = Math.sin(t * 8);
      disc(ctx, p.x, p.y, Math.max(h(p.x, p.y), level(t)) + 0.02, 0.3, alpha(C.ink, 0.12), { stroke: false });
      const [X, Y] = P(p.x, p.y, p.z);
      ctx.save(); ctx.translate(X, Y); ctx.scale(f * GULL, GULL);
      const wing = (dx, lift, col) => { ctx.beginPath(); ctx.moveTo(-0.12 + dx, -0.06); ctx.lineTo(-0.2 + dx, -0.12 - lift); ctx.lineTo(-0.55 + dx, -0.06 - lift * 1.3); ctx.lineTo(0.1 + dx, -0.02); ctx.closePath(); paint(ctx, col, { lw: 0.03 }); };
      wing(0.05, 0.3 + flap * 0.28, C.grey);
      ctx.beginPath(); ctx.ellipse(0, 0, 0.3, 0.12, -0.08, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.035 });
      ctx.beginPath(); ctx.moveTo(-0.26, -0.02); ctx.lineTo(-0.44, -0.06); ctx.lineTo(-0.28, 0.06); ctx.closePath(); paint(ctx, C.greyLight, { lw: 0.03 });
      ctx.beginPath(); ctx.arc(0.28, -0.1, 0.1, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.035 });
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0.31, -0.13, 0.022, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0.36, -0.12); ctx.lineTo(0.5, -0.09); ctx.lineTo(0.36, -0.06); ctx.closePath(); paint(ctx, C.mustard, { lw: 0.025 });
      // The fry, crosswise in the beak: fat, golden, unmistakable.
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0.4, -0.2); ctx.lineTo(0.84, -0.0);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.17; ctx.stroke();
      ctx.strokeStyle = C.butter; ctx.lineWidth = 0.1; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0.46, -0.19); ctx.lineTo(0.8, -0.03); ctx.strokeStyle = C.mustard; ctx.lineWidth = 0.04; ctx.stroke();
      wing(-0.05, 0.22 + flap * 0.32, tint(C.grey, 0.35));
      ctx.restore();
    }, { bias: 2 });

    // A fire pit on the sand after the sunset, till the king tide puts it out.
    const PIT = [93.3, 44.3], pitZ = h(...PIT);
    let floodS = at(21);
    while (floodS < 330 && level(floodS) < pitZ - 0.02) floodS += 0.5;
    const fireOn = (t) => { const s = wrap(t); return s >= at(20.95) && s < floodS; };
    // (The ring and the logs go down in the evening, once the purple
    // umbrella's family has packed up: by day they'd be lying in it.)
    const pitUp = (t) => wrap(t) >= at(19.9) && level(t) < pitZ - 0.02;
    R.thing(PIT[0] + 0.6, PIT[1] + 0.6, (ctx) => {
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2, x = PIT[0] + Math.cos(a) * 0.45, y = PIT[1] + Math.sin(a) * 0.45;
        box(ctx, x - 0.1, y - 0.1, h(x, y) - 0.02, 0.2, 0.2, 0.14, tint(ROCK, 0.1), { flat: true, lw: 0.025 });
      }
      box(ctx, PIT[0] - 0.3, PIT[1] - 0.06, pitZ, 0.6, 0.12, 0.1, shade(C.brown, 0.2), { flat: true, lw: 0.025 });
    }, { on: pitUp });
    R.light({ at: [PIT[0], PIT[1], pitZ + 0.5], r: 2.6, color: C.mustard, k: (t) => (fireOn(t) ? 0.75 + 0.2 * Math.sin(t * 13) * Math.sin(t * 7) : 0) });
    R.mover(() => ({ x: PIT[0], y: PIT[1] + 0.1 }), (ctx, t) => {
      const s = wrap(t);
      if (fireOn(t)) {
        const [X, Y] = P(PIT[0], PIT[1], pitZ + 0.1);
        for (const [dx, hh, col, sp] of [[-0.14, 0.5, C.coral, 11], [0.12, 0.42, C.coral, 9], [0, 0.34, C.mustard, 13], [0.02, 0.2, C.butter, 17]]) {
          const fl = hh * (0.8 + 0.25 * Math.sin(t * sp + dx * 9));
          ctx.beginPath(); ctx.moveTo(X + dx - 0.14, Y); ctx.quadraticCurveTo(X + dx - 0.1, Y - fl * 0.6, X + dx + Math.sin(t * sp) * 0.04, Y - fl); ctx.quadraticCurveTo(X + dx + 0.1, Y - fl * 0.6, X + dx + 0.14, Y); ctx.closePath();
          paint(ctx, col, { stroke: false });
        }
      } else if (s >= floodS && s < floodS + 5 && Q.detail) {
        // Hiss.
        const k = (s - floodS) / 5;
        for (let i = 0; i < 4; i++) disc(ctx, PIT[0] - k * 0.4 * i, PIT[1] - k * 0.4 * i, level(t) + 0.4 + k * 1.8 + i * 0.35, 0.18 + k * 0.25, alpha(C.white, 0.5 * (1 - k)), { stroke: false });
      }
    }, { bias: 0.3 });
    // (The one behind the fire sits against the sandbags, so sorts in front of them.)
    [[PIT[0] - 0.1, PIT[1] - 0.8, 'l', 347, false, 1.6], [PIT[0] - 1.15, PIT[1] - 0.2, 'r', 341, true, 0], [PIT[0] + 1.1, PIT[1] - 0.1, 'l', 345, false, 0]].forEach(([x, y, dir, seed, stick, lift]) => {
      const look = folk(seed);
      R.mover(() => ({ x, y }), (ctx, t) => {
        const s = wrap(t);
        if (s < at(20.95) || s >= floodS + 5) return;
        const z = h(x, y);
        if (s >= floodS) { who(ctx, x, y, z, look, null, { pose: 'wave', dir }, t); return; }
        const marsh = (ctx2) => { ctx2.strokeStyle = C.ink; ctx2.lineWidth = 0.035; ctx2.beginPath(); ctx2.moveTo(0.4, -0.05); ctx2.lineTo(1.05, 0.2); ctx2.stroke(); ctx2.beginPath(); ctx2.arc(1.08, 0.2, 0.06, 0, Math.PI * 2); paint(ctx2, C.white, { lw: 0.02 }); };
        // (Sitting on a log, so drawn as is: they're dry, whatever their knees say.)
        person(ctx, x, y, z - 0.35, { ...look, hold: stick ? marsh : undefined, pose: 'sit', dir }, t);
      }, { bias: lift });
      R.thing(x - 0.1 + lift / 2, y - 0.1 + lift / 2, (ctx) => box(ctx, x - 0.3, y - 0.15, h(x, y) - 0.02, 0.6, 0.3, 0.42, shade(C.brown, 0.1), { flat: true, lw: 0.03, top: C.woodLight }), { on: pitUp });
    });

    // ---------- The finds ----------
    // The goose: two decks past the path dry a big striped towel each on a
    // line, and there are feet under both. Under one, somebody changing (his
    // head's over the top, and he minds); under the other, orange ones, and a
    // white tail out the side. Tap that towel and it drops: the goose has
    // hopped up on the rail.
    const deckZ = (x) => footing(R, x, 39, 2.8, 2.2) + 1.1;
    const TY = 41.95; // the towels hang just in front of the rail
    const towelLine = (ctx, x0, x1, z0) => {
      for (const px of [x0 - 0.05, x1 + 0.05]) post(ctx, px, TY, z0 + 0.66, z0 + 1.62, C.white, 0.05);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.lineCap = 'round';
      const [a, b] = P(x0 - 0.05, TY, z0 + 1.56), [c, d] = P(x1 + 0.05, TY, z0 + 1.56);
      ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke();
    };
    // A big beach towel, hanging from zt down to zb, with two white stripes
    // and its fold over the line.
    const bigTowel = (ctx, x0, x1, zt, zb, col) => {
      face(ctx, [[x0, TY, zt], [x1, TY, zt], [x1, TY, zb], [x0, TY, zb]], col, { lw: 0.035 });
      const hh = zt - zb;
      if (hh > 0.4) {
        for (const k of [0.18, 0.66]) {
          const z1 = zb + hh * k;
          face(ctx, [[x0, TY + 0.005, z1], [x1, TY + 0.005, z1], [x1, TY + 0.005, z1 + 0.11], [x0, TY + 0.005, z1 + 0.11]], C.white, { stroke: false });
        }
      }
      face(ctx, [[x0, TY + 0.005, zt], [x1, TY + 0.005, zt], [x1, TY + 0.005, zt - 0.09], [x0, TY + 0.005, zt - 0.09]], shade(col, 0.18), { stroke: false });
    };
    const TOP = 1.5, BOT = 0.38;

    // The other towel, with somebody changing behind it, all day.
    const HX = FRONT[4], hz0 = deckZ(HX), hx0 = HX + 1.45, hx1 = HX + 2.55;
    const changer = folk(271, { top: C.teal, bottom: C.teal, style: 'curly' });
    R.thing(HX + 2.85, TY, (ctx, t) => {
      person(ctx, hx0 + 0.55, TY - 0.32, hz0, { ...changer, pose: 'stand', dir: 'l' }, t);
      towelLine(ctx, hx0, hx1, hz0);
      bigTowel(ctx, hx0, hx1, hz0 + TOP, hz0 + BOT, C.mustard);
    }, { anim: true, depth: HX + 2.8 + 41.92 + 0.05 });
    R.poke({ id: 'changing', at: [(hx0 + hx1) / 2, TY, hz0 + 1.1], r: 0.9, say: ['Do you MIND?', 'Still changing!', 'Get your own towel.'] });

    // The goose's towel.
    const GX = FRONT[5], gz0 = deckZ(GX), gx0 = GX + 1.45, gx1 = GX + 2.55;
    const drop = R.poke({ id: 'towel', at: [(gx0 + gx1) / 2, TY, gz0 + 0.9], r: 0.9 });
    // Its feet, on the deck under the towel's hem (the tell).
    const webbed = (ctx, x, z) => {
      const [X, Y] = P(x, TY + 0.02, z);
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(X, Y - 0.04); ctx.lineTo(X, Y - (BOT + 0.02) * 1.12);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.12; ctx.stroke();
      ctx.strokeStyle = C.coral; ctx.lineWidth = 0.07; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X - 0.06, Y - 0.08); ctx.lineTo(X + 0.24, Y - 0.04); ctx.lineTo(X + 0.18, Y + 0.08); ctx.lineTo(X - 0.08, Y + 0.04); ctx.closePath();
      paint(ctx, C.coral, { lw: 0.03 });
    };
    R.thing(GX + 2.85, TY, (ctx, t) => {
      const k = drop.k();
      towelLine(ctx, gx0, gx1, gz0);
      if (k < 0.3) {
        webbed(ctx, gx0 + 0.42, gz0);
        webbed(ctx, gx0 + 0.68, gz0);
        // A white tail out the side, twitching now and then.
        const w = Math.sin(t * 0.9) > 0.8 ? 0.06 * Math.sin(t * 14) : 0;
        face(ctx, [[gx0 + 0.02, TY, gz0 + 0.6], [gx0 + 0.02, TY, gz0 + 0.92], [gx0 - 0.38, TY, gz0 + 0.98 + w]], C.white, { lw: 0.035, dots: Q.detail ? C.grey : null, density: 0.1 });
      }
      // Down it comes: the line's empty and the towel's a heap on the deck.
      const zt = gz0 + TOP - k * 1.25;
      bigTowel(ctx, gx0, gx1, zt, Math.max(gz0 + 0.02, zt - (TOP - BOT)), C.coral);
    }, { anim: true, depth: GX + 2.8 + 41.92 + 0.05 });
    // A can of Gander Cola on the rail, by the line.
    R.thing(GX + 2.8, TY, (ctx) => box(ctx, GX + 2.68, TY - 0.1, gz0 + 0.72, 0.12, 0.12, 0.22, BRAND.can, { flat: true, lw: 0.025, top: C.greyLight }), { depth: GX + 2.8 + 41.92 + 0.04 });
    R.goose((t) => {
      const k = drop.k();
      return { x: gx0 + 0.6, y: TY - 0.05, z: gz0 + 0.72, hidden: k < 0.3, pose: Math.sin(t * 1.4) > 0.55 ? 'honk' : 'stand', dir: 'r' };
    }, { bias: 1.3, kind: 'poke', inside: drop, hint: 'Somebody on a deck is drying off behind a towel. Look at the feet under them.' });

    // The pool float: a goose ring, left on the sand by the volleyball, and
    // afloat when the tide comes up to it (on its string, so it stays).
    const GF = [77.6, 46.9];
    const ring = (t) => {
      const wet = level(t) > h(...GF), z = float(GF[0], GF[1], t);
      return { x: GF[0] + (wet ? Math.sin(t / 3) * 0.25 : 0), y: GF[1] + (wet ? Math.cos(t / 4) * 0.15 : 0), z: z + (wet ? 0.03 * Math.sin(t * 1.6) : 0) };
    };
    R.mover(ring, (ctx, t, p) => {
      const { x, y, z } = p;
      disc(ctx, x, y, z + 0.02, 0.62, shade(C.white, 0.16), { lw: 0.035 });
      disc(ctx, x, y, z + 0.16, 0.62, C.white, { lw: 0.035 });
      disc(ctx, x - 0.02, y - 0.02, z + 0.17, 0.26, alpha(C.ink, 0.28), { lw: 0.03 });
      // A tail at the back.
      face(ctx, [[x - 0.5, y + 0.1, z + 0.22], [x - 0.5, y - 0.1, z + 0.22], [x - 0.85, y, z + 0.42]], C.white, { lw: 0.03 });
      // Its neck and head, up off the front: a painted eye, a cheerful beak.
      const [X, Y] = P(x + 0.42, y - 0.12, z + 0.2);
      ctx.beginPath(); ctx.moveTo(X - 0.05, Y); ctx.quadraticCurveTo(X + 0.18, Y - 0.35, X + 0.08, Y - 0.72);
      ctx.lineCap = 'round'; ctx.strokeStyle = C.ink; ctx.lineWidth = 0.24; ctx.stroke();
      ctx.strokeStyle = C.white; ctx.lineWidth = 0.17; ctx.stroke();
      ctx.beginPath(); ctx.arc(X + 0.1, Y - 0.78, 0.14, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.035 });
      ctx.beginPath(); ctx.moveTo(X + 0.2, Y - 0.82); ctx.lineTo(X + 0.44, Y - 0.76); ctx.lineTo(X + 0.2, Y - 0.7); ctx.closePath(); paint(ctx, C.coral, { lw: 0.025 });
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(X + 0.13, Y - 0.83, 0.03, 0, Math.PI * 2); ctx.fill();
      if (Q.detail) { ctx.fillStyle = alpha(C.pink, 0.8); ctx.beginPath(); ctx.arc(X + 0.06, Y - 0.74, 0.04, 0, Math.PI * 2); ctx.fill(); }
      // Its string, to a peg in the sand.
      if (Q.lines) {
        const [a, b] = P(x - 0.3, y + 0.5, z + 0.12), [c, d] = P(GF[0] - 0.8, GF[1] + 1.1, h(GF[0] - 0.8, GF[1] + 1.1));
        ctx.beginPath(); ctx.moveTo(a, b); ctx.quadraticCurveTo((a + c) / 2, Math.max(b, d) + 0.2, c, d); ctx.strokeStyle = alpha(C.ink, 0.5); ctx.lineWidth = 0.02; ctx.stroke();
      }
    }, { bias: 0.2 });
    R.decoy({ id: 'float', at: (t) => { const p = ring(t); return [p.x + 0.2, p.y, p.z + 0.4]; }, r: 0.8, say: ['A pool float. Squeaks, doesn\'t honk.', 'Still a float.', 'Mostly hot air.'] });

    // The owner's toolbox, out by the stairs: everything he needs, and the
    // one thing he's never used. (Nudged out from under the umbrella in
    // front: at [84.2, 43.4] its canopy hid it.)
    const TB = [84.0, 44.0], tbz = footing(R, TB[0] - 0.3, TB[1] - 0.18, 0.6, 0.36), tbTop = tbz + 0.3;
    const tools = R.poke({ id: 'toolbox', at: [TB[0], TB[1], tbz + 0.25], r: 0.75, sound: 'clunk', say: 'Nails. So many nails.' });
    R.thing(TB[0] + 0.35, TB[1] + 0.2, (ctx) => {
      const k = tools.k(), a = k * 1.9, x0 = TB[0] - 0.3, x1 = TB[0] + 0.3, y0 = TB[1] - 0.18, d = 0.36;
      const lid = () => {
        if (k < 0.05) { box(ctx, x0, y0, tbTop, x1 - x0, d, 0.06, C.red, { flat: true, lw: 0.03 }); return; }
        const yf = y0 + d * Math.cos(a), zf = tbTop + 0.06 + d * Math.sin(a);
        face(ctx, [[x0, y0, tbTop + 0.06], [x1, y0, tbTop + 0.06], [x1, yf, zf], [x0, yf, zf]], k > 0.5 ? shade(C.red, 0.25) : C.red, { lw: 0.03 });
      };
      if (k > 0.5) lid();
      box(ctx, x0, y0, tbz, x1 - x0, d, 0.3, C.red, { flat: true, lw: 0.03, top: shade(C.red, 0.55) });
      if (k > 0.05) {
        // Inside: a heap of nails, and the tape measure, still in its wrapper.
        if (Q.detail) for (let i = 0; i < 6; i++) disc(ctx, x0 + 0.08 + i * 0.07, y0 + 0.08 + (i % 2) * 0.12, tbTop + 0.01, 0.03, C.greyLight, { stroke: false });
        const [X, Y] = P(TB[0] + 0.08, TB[1] + 0.02, tbTop + 0.12 * k);
        ctx.beginPath(); ctx.arc(X, Y, 0.19, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.03 });
        ctx.beginPath(); ctx.arc(X, Y, 0.05, 0, Math.PI * 2); paint(ctx, C.ink, { stroke: false });
        ctx.beginPath(); ctx.rect(X + 0.1, Y + 0.06, 0.18, 0.05); paint(ctx, tint(C.butter, 0.3), { lw: 0.02 });
      }
      if (k <= 0.5) lid();
      // The handle, while it's shut.
      if (k < 0.05) {
        const [a1, b1] = P(TB[0] - 0.12, TB[1], tbTop + 0.07), [c1, d1] = P(TB[0] + 0.12, TB[1], tbTop + 0.07);
        ctx.beginPath(); ctx.moveTo(a1, b1); ctx.quadraticCurveTo((a1 + c1) / 2, b1 - 0.2, c1, d1); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
      }
    }, { anim: true });
    R.find({ id: 'tape', label: 'A tape measure', kind: 'poke', inside: tools, at: [TB[0] + 0.08, TB[1] + 0.02, tbTop + 0.1], r: 0.85, hint: 'Whoever built those stairs never measured them. What he\'d need is still in his toolbox.' });

    // The stairs answer back (the thing a new visitor's nudged to tap first).
    R.poke({ id: 'stairs', at: [(SX0 + SX1) / 2, tread(2).y + 0.3, tread(2).z + 0.3], r: 1.0, sound: 'clunk', teach: true, say: ['Six summers. Still a foot short.', 'Next summer. Definitely.', 'Mind the gap.'] });

    // A cooler buried to its lid in the wet sand low on the beach, only
    // while the tide's right out, a shovel stuck in beside it (somebody gave
    // up). The man with the metal detector digs a little way off, every day.
    const CO = [84.2, 49.2], coZ = h(...CO);
    R.thing(CO[0] + 0.5, CO[1] + 0.4, (ctx) => {
      const [x, y] = CO, z = coZ, wet = shade(INK.sand, 0.22), dug = shade(INK.sand, 0.32);
      // The hole it's still mostly in.
      disc(ctx, x, y + 0.05, z + 0.01, 0.62, dug, { lw: 0.03, stroke: shade(dug, 0.25) });
      // The cooler: a white lid on a teal body, a hand's width of it out.
      box(ctx, x - 0.42, y - 0.26, z - 0.1, 0.84, 0.52, 0.25, C.teal, { lw: 0.04, top: C.white, dotsL: shade(C.teal, 0.5), dens: 0.14 });
      box(ctx, x - 0.45, y - 0.29, z + 0.15, 0.9, 0.58, 0.08, C.white, { flat: true, lw: 0.035 });
      // Wet sand banked against its front, in lumps, nearly to the lid.
      const bank = (pts) => face(ctx, pts, wet, { lw: 0.03, stroke: shade(wet, 0.3) });
      bank([[x - 0.5, y + 0.3, z], [x + 0.5, y + 0.3, z], [x + 0.46, y + 0.27, z + 0.12], [x + 0.2, y + 0.27, z + 0.18], [x - 0.05, y + 0.27, z + 0.09], [x - 0.3, y + 0.27, z + 0.16], [x - 0.5, y + 0.27, z + 0.07]]);
      bank([[x + 0.46, y + 0.3, z], [x + 0.46, y - 0.3, z], [x + 0.44, y - 0.28, z + 0.06], [x + 0.44, y - 0.05, z + 0.14], [x + 0.44, y + 0.2, z + 0.08]]);
      disc(ctx, x - 0.1, y - 0.05, z + 0.24, 0.13, tint(wet, 0.2), { stroke: false });
      // The shovel.
      box(ctx, x + 0.62, y - 0.42, z - 0.1, 0.05, 0.05, 0.75, C.coral, { flat: true, lw: 0.025 });
      face(ctx, [[x + 0.5, y - 0.4, z - 0.05], [x + 0.78, y - 0.4, z - 0.05], [x + 0.78, y - 0.4, z + 0.2], [x + 0.5, y - 0.4, z + 0.2]], C.mustard, { lw: 0.025 });
    }, { on: lowTide });
    R.find({ id: 'cooler', label: 'A buried cooler', kind: 'hard', at: [CO[0], CO[1], coZ + 0.1], r: 0.8, when: lowTide, note: 'low tide', riddle: 'Lunch, buried below the high-water mark.', hint: 'The man with the metal detector keeps beeping, and digging in the wrong spot.' });

    // The fry, in the gull's beak.
    R.find({ id: 'fry', label: 'A stolen french fry', at: fryAt, r: 0.9 });

    // A boogie board, left on the sand by the umbrellas (it floats off when
    // the tide comes up the beach). Nudged half a unit left, clear of the pole.
    const BB = [75.9, 44.1];
    R.mover((t) => ({ x: BB[0], y: BB[1], z: float(BB[0], BB[1], t) + (level(t) > h(...BB) ? 0.03 * Math.sin(t * 1.7) : 0) }), (ctx, t, p) => {
      const { x, y, z } = p, c = [[x - 0.28, y - 0.45], [x + 0.28, y - 0.45], [x + 0.3, y + 0.38], [x + 0.18, y + 0.47], [x - 0.18, y + 0.47], [x - 0.3, y + 0.38]];
      face(ctx, c.map(([a, b]) => [a, b, z + 0.02]), shade(C.navy, 0.1), { lw: 0.03 });
      face(ctx, c.map(([a, b]) => [a, b, z + 0.08]), C.sky, { lw: 0.04 });
      if (Q.detail) {
        face(ctx, [[x - 0.2, y - 0.3, z + 0.085], [x + 0.2, y - 0.3, z + 0.085], [x + 0.2, y - 0.18, z + 0.085], [x - 0.2, y - 0.18, z + 0.085]], C.coral, { stroke: false });
        // Its leash, curled on the sand.
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.beginPath();
        const [a, b] = P(x + 0.2, y + 0.47, z + 0.06); ctx.moveTo(a, b);
        for (let k = 1; k <= 8; k++) { const [m, n] = P(x + 0.35 + Math.sin(k) * 0.15, y + 0.5 + k * 0.05, z + 0.03); ctx.lineTo(m, n); }
        ctx.stroke();
      }
    }, { bias: -0.2 });
    R.find({ id: 'board', label: 'A boogie board', at: (t) => [BB[0], BB[1], float(BB[0], BB[1], t) + 0.1], r: 0.8 });
  },
};

