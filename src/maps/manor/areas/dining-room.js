// Dining Room: Lord Gooseworth's 80th birthday dinner, frozen mid-toast, with
// his tall chair empty at the head of the table. From 28 seconds the Brigadier
// tells his war story ("In 1974...") while everyone else gets up and leaves:
// chairs pushed back, napkins dropped, Rupert's chair still spinning, even the
// ancestors walk out of their portraits. Only the stuffed fox at the table (and
// deaf Great-Uncle Monty, in his frame) keep listening politely. The candles
// burn down and the glasses empty over the loop; Jenkins renews the candles
// when dinner comes round again. When the case is solved, the goose takes the
// Lord's chair, wearing his monocle.
import {
  C, SKIN, Q, box, rect, disc, cylinder, face, paint, planks, onLeft, onRight, slab, P,
  person, goose, note, speech, mix, shade, tint, alpha, hash,
} from '../../../engine/art.js';
import { particles, clamp } from '../../../engine/actors.js';
import { ZK } from '../../../engine/iso.js';
import {
  INK, NIGHT, MAT, ROOM, house, storm, lightsOut, stormWindow, verdict, isSolved, pastK,
  drapes, stripes, trim, painting, monocleGoose, lordGhost, MIDNIGHT, webPrint,
} from '../style.js';
import { DOORS, LOOP } from '../plan.js';

// ---------- The room's inks ----------
const RC = ROOM['dining-room'];
const WALL = RC.wall, WOOD = RC.trim, OAK = RC.floor;
const WAINSCOT = mix(WALL, MAT.oak, 0.38);
const CLOTH = MAT.linen;
const CLOTH_SIDE = shade(MAT.linen, 0.12);
const SILVER = MAT.silver;
const GLASS = alpha(MAT.glass, 0.5);
const SOUP = mix(MAT.oak, INK.oxblood, 0.45); // oxtail
const WAX = INK.bone;
const FLAME = INK.candleGold;
const FUR = MAT.fur, FUR_DARK = MAT.furDark;
const BOTTLE = mix(INK.verdigris, INK.stormNavy, 0.55);
const FLAGS = [INK.oxblood, INK.candleGold, INK.verdigris, INK.deepPlum];

// ---------- The layout (the greybox's) ----------
const TX0 = 3, TX1 = 13, TY0 = 6, TY1 = 9.4, TZ = 1.2; // the table
const SPLIT = 8.7; // the table is drawn in two halves, so the diners sort around it
const BACK = 5.2, FRONT = 10.2; // the two rows of seats
const HEAD = [14.05, 7.7]; // the Lord's chair
const SEAT_Z = 0.84, THRONE_Z = 0.9;
const CANDELABRA = [[5.6, 7.72], [8, 7.72]];
const STAND = [10.5, 7.7]; // the trifle's stand, now just the 80 candles
const TOOTH = [5.5, 6.8]; // Mr. Todd's soup bowl
const TUREEN = [4.85, 0.62]; // the soup tureen on the sideboard, with the false tooth in it
const GRAVY = [4.25, 7.72]; // the goose gravy boat, on the runner (a red herring)
const GOOSE_PLACE = [11.8, 8.78];

const mod = (a, n = LOOP) => ((a % n) + n) % n;
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = (k) => 1 - (1 - k) * (1 - k);
const smooth = (k) => k * k * (3 - 2 * k);

// ---------- Small drawing kit ----------
// A box standing on the floor plan corners pts ([x, y] around it), from z0 to
// z1: the sides that face us and the top. Chairs being pushed about, and
// spun, are drawn with this. o: { top, dotsT, flat, lw }
function prism(ctx, pts, z0, z1, color, o = {}) {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
    area += ax * by - bx * ay;
  }
  const sg = area > 0 ? 1 : -1;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
    const nx = (by - ay) * sg, ny = -(bx - ax) * sg;
    if (nx + ny <= 1e-6) continue; // faces away from us
    // Faces turned toward +y are the shaded ones, as in box(). (Stepped, so
    // a spinning chair doesn't mint a new color every frame.)
    const k = Math.round(clamp(ny / (Math.abs(nx) + Math.abs(ny))) * 3) / 3;
    face(ctx, [[ax, ay, z0], [bx, by, z0], [bx, by, z1], [ax, ay, z1]], shade(color, 0.1 + 0.12 * k), {
      dots: o.flat || k < 0.6 ? null : shade(color, 0.55), density: 0.2, lw: o.lw,
    });
  }
  face(ctx, pts.map(([x, y]) => [x, y, z1]), o.top || color, { lw: o.lw, dots: o.dotsT || null, density: 0.2 });
}

// Parts of a piece of furniture in its own frame (u: the way it faces, v:
// across), turned by angle a (0 faces +x, PI/2 faces +y) and stood at (cx, cy).
// part: [u0, u1, v0, v1, z0, z1, kind]. Drawn back to front; between(ctx) is
// drawn among them at depth d (someone sitting in it, between its arms).
function furniture(ctx, parts, cx, cy, a, paintPart, between = null, d = 0) {
  const c = Math.cos(a), s = Math.sin(a);
  const at = (u, v) => [cx + u * c - v * s, cy + u * s + v * c];
  const list = parts.map((p) => {
    const [u0, u1, v0, v1] = p;
    const mid = at((u0 + u1) / 2, (v0 + v1) / 2);
    return { p, pts: [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)], d: mid[0] + mid[1] + p[4] * 0.01 };
  });
  list.sort((m, n) => m.d - n.d);
  let done = !between;
  for (const m of list) {
    if (!done && m.d > d) { between(ctx); done = true; }
    paintPart(ctx, m.pts, m.p);
  }
  if (!done) between(ctx);
}

// A dining chair.
const CHAIR = [
  [-0.4, -0.31, -0.37, -0.28, 0, 1.96, 'wood'], // back legs, running up into the back
  [-0.4, -0.31, 0.28, 0.37, 0, 1.96, 'wood'],
  [0.29, 0.37, -0.37, -0.29, 0, 0.72, 'wood'], // front legs
  [0.29, 0.37, 0.29, 0.37, 0, 0.72, 'wood'],
  [-0.4, 0.4, -0.4, 0.4, 0.72, SEAT_Z, 'seat'],
  [-0.4, -0.31, -0.37, 0.37, 1.74, 1.98, 'wood'], // top rail
  [-0.38, -0.33, -0.26, 0.26, 1.0, 1.72, 'pad'], // the upholstered back
];
const CHAIR_BASE = CHAIR.filter((p) => p[5] <= SEAT_Z + 0.01);
const CHAIR_BACK = CHAIR.filter((p) => p[5] > SEAT_Z + 0.01);
function chairPaint(ctx, pts, p) {
  const kind = p[6];
  if (kind === 'seat') prism(ctx, pts, p[4], p[5], WOOD, { top: MAT.velvet, dotsT: MAT.velvetDark, lw: 0.04 });
  else if (kind === 'pad') prism(ctx, pts, p[4], p[5], MAT.velvet, { lw: 0.04 });
  else prism(ctx, pts, p[4], p[5], WOOD, { flat: true, lw: 0.035 });
}
function drawChair(ctx, x, y, a, parts = CHAIR) {
  if (Q.detail && parts !== CHAIR_BACK) disc(ctx, x, y, 0.005, 0.44, alpha(C.ink, 0.12), { stroke: false });
  furniture(ctx, parts, x, y, a, chairPaint);
}

// Lord Gooseworth's chair: taller than the rest, with arms and a crest.
const THRONE_TOP = 2.66;
const THRONE = [
  [-0.46, -0.34, -0.46, -0.34, 0, THRONE_TOP - 0.04, 'wood'], // back posts
  [-0.46, -0.34, 0.34, 0.46, 0, THRONE_TOP - 0.04, 'wood'],
  [0.34, 0.46, -0.46, -0.34, 0, 1.36, 'wood'], // front posts, up into the arms
  [0.34, 0.46, 0.34, 0.46, 0, 1.36, 'wood'],
  [-0.46, 0.46, -0.46, 0.46, 0.5, 0.7, 'wood'], // seat rail
  [-0.36, 0.44, -0.36, 0.36, 0.7, THRONE_Z, 'cushion'],
  [-0.34, 0.34, -0.46, -0.36, 1.2, 1.36, 'arm'],
  [-0.34, 0.34, 0.36, 0.46, 1.2, 1.36, 'arm'],
  [-0.44, -0.37, -0.34, 0.34, THRONE_Z, THRONE_TOP - 0.2, 'pad'],
  [-0.48, -0.34, -0.5, 0.5, THRONE_TOP - 0.2, THRONE_TOP, 'wood'], // crest rail
];
function thronePaint(ctx, pts, p) {
  const kind = p[6];
  if (kind === 'cushion') prism(ctx, pts, p[4], p[5], MAT.velvet, { dotsT: MAT.velvetDark });
  else if (kind === 'arm') prism(ctx, pts, p[4], p[5], MAT.mahoganyDark, { top: MAT.velvet });
  else if (kind === 'pad') {
    prism(ctx, pts, p[4], p[5], MAT.velvet, { top: MAT.velvetDark });
    // Brass studs on the front of the back; the family crest (a goose, of
    // all things) on the back of it. Whichever side is turned our way.
    const front = [pts[1], pts[2]], rear = [pts[0], pts[3]];
    const nx = pts[1][0] - pts[0][0], ny = pts[1][1] - pts[0][1]; // the way it faces
    if (nx + ny > 0.01) {
      if (!Q.detail) return;
      ctx.fillStyle = MAT.brass;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const k = (i + 0.5) / 4, z = 1.15 + j * 0.34 + (i % 2) * 0.17;
        const [sx, sy] = P(lerp(front[0][0], front[1][0], k), lerp(front[0][1], front[1][1], k), z);
        ctx.beginPath(); ctx.arc(sx, sy, 0.035, 0, Math.PI * 2); ctx.fill();
      }
    } else if (nx + ny < -0.01) {
      const [ax, ay] = rear[0], [bx, by] = rear[1];
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      const len = Math.hypot(bx - ax, by - ay), hx = (bx - ax) / len, hy = (by - ay) / len;
      const oval = [];
      for (let i = 0; i < 16; i++) {
        const th = (i / 16) * Math.PI * 2;
        oval.push([mx + hx * Math.cos(th) * 0.24, my + hy * Math.cos(th) * 0.24, 1.78 + Math.sin(th) * 0.36]);
      }
      face(ctx, oval, MAT.brass, { dots: MAT.brassDark, density: 0.3, lw: 0.035 });
      // The goose, in relief.
      const [X0, Y0] = P(mx, my, 1.78);
      ctx.save();
      ctx.transform(hx - hy, (hx + hy) / 2, 0, ZK, X0, Y0);
      ctx.fillStyle = MAT.brassDark;
      ctx.beginPath();
      ctx.ellipse(0.02, 0.08, 0.13, 0.08, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0.1, 0.04); ctx.quadraticCurveTo(0.16, -0.1, 0.09, -0.2);
      ctx.lineWidth = 0.045; ctx.strokeStyle = MAT.brassDark; ctx.lineCap = 'round'; ctx.stroke();
      ctx.beginPath(); ctx.arc(0.09, -0.21, 0.045, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0.12, -0.23); ctx.lineTo(0.21, -0.2); ctx.lineTo(0.12, -0.18); ctx.fill();
      ctx.restore();
    }
  } else prism(ctx, pts, p[4], p[5], MAT.mahoganyDark, { lw: 0.045 });
}

// Draw on the right wall (y = 0) in its own flat units: (u, -z).
function onWallR(ctx, draw) {
  ctx.save();
  ctx.transform(1, 0.5, 0, ZK, 0, 0);
  draw(ctx);
  ctx.restore();
}
// And on the left wall (x = 0), reading from the front of the room to the back:
// (-y, -z).
function onWallL(ctx, draw) {
  ctx.save();
  ctx.transform(1, -0.5, 0, ZK, 0, 0);
  draw(ctx);
  ctx.restore();
}

// Upright text on a card standing across the room (the plane y = const),
// facing us. (The engine's paintText only does the walls and the floor.)
function cardText(ctx, x, y, z, text, size, color = C.ink, weight = 700) {
  ctx.save();
  ctx.transform(1, 0.5, 0, ZK, x - y, (x + y) / 2 - z * ZK);
  const k = 40;
  ctx.scale(1 / k, 1 / k);
  ctx.font = `${weight} ${size * k}px "Rethink Sans", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
// The same on a back wall: 'right' (u runs along x) or 'left' (u runs along y).
function wallText(ctx, side, u, z, text, size, color = C.ink, font = '700 %px "Rethink Sans", system-ui, sans-serif') {
  ctx.save();
  if (side === 'right') ctx.transform(1, 0.5, 0, ZK, u, u / 2 - z * ZK);
  else ctx.transform(1, -0.5, 0, ZK, -u, u / 2 - z * ZK);
  const k = 40;
  ctx.scale(1 / k, 1 / k);
  ctx.font = font.replace('%', String(size * k));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
const DISPLAY = '%px "Bagel Fat One", "Arial Black", sans-serif';

// ---------- Tableware ----------
// A place card: a little upright card with a name on it.
function placeCard(ctx, x, y, name, w = 0.56) {
  face(ctx, [[x - w / 2, y, TZ], [x + w / 2, y, TZ], [x + w / 2, y, TZ + 0.2], [x - w / 2, y, TZ + 0.2]], INK.bone, { lw: 0.025 });
  if (Q.detail) cardText(ctx, x, y, TZ + 0.1, name, 0.09);
}
// A plate, and a soup bowl on it (o.bowl: false for none; o.soup: what's in it).
function plate(ctx, x, y, o = {}) {
  const r = o.r || 0.3, z = TZ + 0.005;
  disc(ctx, x, y, z, r, C.white, { lw: 0.03 });
  if (Q.detail) disc(ctx, x, y, z + 0.004, r * 0.74, null, { stroke: MAT.brass, lw: 0.02 });
  if (o.bowl === false) return;
  cylinder(ctx, o.bx ?? x, o.by ?? y, z, 0.18, 0.1, C.white, { top: o.soup || SOUP });
  disc(ctx, o.bx ?? x, o.by ?? y, z + 0.1, 0.18, null, { lw: 0.025 });
}
// Fork on one side of a place, knife and spoon on the other (lying along y).
function cutlery(ctx, x, y) {
  if (!Q.detail) return;
  const z = TZ + 0.008;
  for (const [dx, len] of [[-0.42, 0.34], [0.41, 0.34], [0.5, 0.3]]) {
    face(ctx, [[x + dx, y - len / 2, z], [x + dx, y + len / 2, z]], null, { stroke: shade(SILVER, 0.3), lw: 0.035 });
  }
}
// A wine glass, and what's left in it (0..1). tip: 0 upright, 1 on its side.
function wineGlass(ctx, x, y, level = 0.8, o = {}) {
  const [bx, by] = P(x, y, TZ);
  ctx.save();
  ctx.translate(bx, by);
  if (o.tip) ctx.rotate(-o.tip * 1.35);
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.1, 0.045, 0, 0, Math.PI * 2);
  paint(ctx, GLASS, { lw: 0.02 });
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(0, -0.28);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-0.13, -0.6);
  ctx.quadraticCurveTo(-0.14, -0.28, 0, -0.28);
  ctx.quadraticCurveTo(0.14, -0.28, 0.13, -0.6);
  ctx.closePath();
  paint(ctx, GLASS, { lw: 0.025 });
  if (level > 0.02) {
    ctx.save();
    ctx.clip();
    ctx.fillStyle = o.wine || MAT.wine;
    ctx.fillRect(-0.2, -0.28 - 0.3 * level, 0.4, 0.4);
    ctx.restore();
  }
  ctx.restore();
}
// A candle standing at (x, y, z), h tall (it burns down).
function wax(ctx, x, y, z, h) {
  const [bx, by] = P(x, y, z);
  ctx.beginPath();
  ctx.rect(bx - 0.055, by - h * ZK, 0.11, h * ZK);
  paint(ctx, WAX, { lw: 0.025 });
  if (Q.detail && h > 0.15) {
    ctx.beginPath(); // a drip
    ctx.ellipse(bx + 0.045, by - h * ZK + 0.1, 0.022, 0.07, 0, 0, Math.PI * 2);
    ctx.fillStyle = shade(WAX, 0.12);
    ctx.fill();
  }
}
function flame(ctx, x, y, z, k, s = 1) {
  const [fx, fy] = P(x, y, z);
  ctx.beginPath();
  ctx.ellipse(fx, fy - 0.1 * s, 0.055 * s, 0.12 * s * (0.8 + k * 0.3), 0, 0, Math.PI * 2);
  ctx.fillStyle = FLAME;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(fx, fy - 0.07 * s, 0.025 * s, 0.05 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = INK.bone;
  ctx.fill();
}
// A wisp of steam rising from (x, y, z): n particles, k how strong.
function steam(ctx, t, x, y, z, k, seed) {
  if (!(k > 0.03) || !Q.detail) return;
  ctx.save();
  ctx.lineCap = 'round';
  particles(t, 3, 2.4, (q, r) => {
    const [sx, sy] = P(x + (r() - 0.5) * 0.15, y + (r() - 0.5) * 0.15, z + q * 1.0);
    const sway = Math.sin(q * 6 + r() * 6) * 0.08;
    ctx.beginPath();
    ctx.moveTo(sx + sway, sy);
    ctx.quadraticCurveTo(sx - sway * 2, sy - 0.15, sx + sway, sy - 0.3);
    ctx.strokeStyle = alpha(C.white, 0.55 * k * Math.sin(q * Math.PI));
    ctx.lineWidth = 0.06;
    ctx.stroke();
  }, seed);
  ctx.restore();
}

// ---------- The evening, as this room sees it ----------
// When a diner gets up from their seat and sits back down, read off the
// level's shared clock, so if the evening changes the chairs follow.
function seatClock(R, id, sx, sy) {
  const [ox, oy] = R.origin;
  const wk = R.walkers.find((w) => w.id === id);
  const c = { up: null, down: null };
  if (wk) {
    const on = (t) => { const p = wk.at(t); return !p.moving && Math.abs(p.x - ox - sx) < 0.1 && Math.abs(p.y - oy - sy) < 0.1; };
    let prev = on(LOOP - 0.05);
    for (let t = 0; t < LOOP; t += 0.05) {
      const o = on(t);
      if (o && !prev && c.down == null) c.down = t;
      if (!o && prev && c.up == null) c.up = t;
      prev = o;
    }
  }
  if (c.up == null || c.down == null) { c.up = 1e6; c.down = 0; } // never leaves
  c.seated = (t) => mod(t - c.down) < mod(t - c.up);
  c.since = (t) => mod(t - c.up); // seconds since they got up
  c.till = (t) => mod(c.down - t); // seconds until they sit again
  // How much of their wine is left: they sip while they sit, and it's
  // topped up when they sit down.
  c.wine = (t, rate = 0.012) => Math.max(0.12, 0.95 - rate * (c.seated(t) ? mod(t - c.down) : mod(c.up - c.down)));
  return c;
}
// Where someone on the evening's clock is at t, in this room's units.
function walkerAt(R, id) {
  const [ox, oy] = R.origin;
  const wk = R.walkers.find((w) => w.id === id);
  return (t) => { if (!wk) return null; const p = wk.at(t); return { ...p, x: p.x - ox, y: p.y - oy }; };
}
// When Jenkins, coming back for the second trifle, passes each of xs (he
// renews the candles on his way along the table).
function passTimes(R, xs) {
  const j = walkerAt(R, 'jenkins');
  const out = xs.map(() => null);
  let prev = j(150);
  for (let t = 150.05; t < 180; t += 0.05) {
    const p = j(t);
    if (p && prev && p.moving && p.y > 10.5 && p.y < 13) xs.forEach((x, i) => { if (out[i] == null && (prev.x - x) * (p.x - x) <= 0) out[i] = t; });
    prev = p;
  }
  return out.map((v) => v ?? 165);
}
// Out of the frame (1) or in it (0): leaves at `leave`, back at `back`.
function away(t, leave, back, dur = 1.6) {
  const s = mod(t);
  if (s < leave || s >= back + dur) return 0;
  if (s < back) return clamp((s - leave) / dur);
  return 1 - (s - back) / dur;
}
// How strongly the soup steams: at dinner, cooling off once people leave.
function steamK(t) {
  const s = mod(t);
  if (s >= 160) return clamp((s - 160) / 4);
  if (s < 30) return 1;
  return clamp(1 - (s - 30) / 25);
}

export default {
  id: 'dining-room',
  name: 'Dining Room',
  blurb: 'Lord Gooseworth\'s 80th birthday dinner, minus Lord Gooseworth. The Brigadier is telling his war story to a stuffed fox.',

  build(R) {
    const clock = {
      philippa: seatClock(R, 'philippa', 7, BACK),
      rupert: seatClock(R, 'rupert', 9.5, BACK),
      brigadier: seatClock(R, 'brigadier', 4.5, FRONT),
      crane: seatClock(R, 'crane', 7, FRONT),
    };
    // (Jenkins renews things as he passes: the candles, and a new balloon.)
    const renew = passTimes(R, [CANDELABRA[0][0], CANDELABRA[1][0], STAND[0], 4.3, 8.9, 13.5]);
    const burn = (t, i, full = 0.5, stub = 0.08) => lerp(full, stub, clamp(mod(t - renew[i]) / 150));

    floorAndRug(R);
    wallsAndWindows(R);
    portraits(R);
    banner(R);
    leftWall(R);
    rightWallBits(R);

    // The tureen's lid: tap it (the false tooth is in the soup).
    const tureen = R.poke({ id: 'tureen', at: [TUREEN[0], TUREEN[1], 1.6], r: 0.7, sound: 'clunk', say: ['Oxtail.', 'Still oxtail.'] });
    sideboard(R, burn, tureen);
    fireplace(R);
    table(R, clock, burn);
    chairs(R, clock);
    fox(R);
    throne(R, renew[5]);
    corners(R);
    chandelier(R);
    napkins(R, clock);
    mouse(R);

    R.dark(house.dark);

    // ---------- Things that answer a tap ----------
    // The Brigadier, mid-story: the teach poke (while he's in his seat).
    const brig = walkerAt(R, 'brigadier');
    R.poke({
      id: 'brigadier', teach: true, r: 0.9, sound: 'pop',
      at: (t) => { const p = brig(t); return p ? [p.x, p.y, 1.5] : [4.5, FRONT, 1.5]; },
      when: (t) => clock.brigadier.seated(t),
      say: ['In 1974...', 'Where was I? Ah. 1974.', 'Do sit down. It gets good.'],
    });
    // The Lord's stuffed pheasant, in the middle of the table.
    R.poke({ id: 'pheasant', at: [9.25, 7.7, TZ + 0.4], r: 0.6, say: ["It's a pheasant. Calm down.", 'Still a pheasant.'] });
    R.decoy({ id: 'gravy-boat', at: [GRAVY[0], GRAVY[1], TZ + 0.3], r: 0.6, say: ['Gravy boat. Goose-shaped. Gravy.', 'Still gravy.'] });

    // ---------- Finds ----------
    R.find({
      id: 'false-tooth', label: 'A false tooth', kind: 'poke', inside: tureen, at: [TUREEN[0], TUREEN[1], 1.55], r: 0.7,
      hint: 'At "In 1974" something flew out of the Brigadier. Where would soup hide it?',
    });
    R.find({ id: 'goose-place', label: 'A place set for the goose', kind: 'spot', at: [11.8, 8.8, 1.25], r: 0.8, hint: 'Somebody laid a place for a guest who eats breadcrumbs.' });
  },
};

// ---------- Floor, rug and the goose's trail ----------
function floorAndRug(R) {
  R.floor((ctx) => {
    slab(ctx, OAK);
    planks(ctx, OAK, 0.7);
  });
  // Soup, flung from the Brigadier's bowl at "In 1974", in a line over the
  // table and across the floor to the tureen (the tureen's tell).
  R.rug((ctx) => {
    for (const [y, s] of [[5.55, 1.1], [4.6, 1.0], [3.6, 0.9], [2.65, 0.85], [1.75, 0.8], [1.25, 0.7]]) splat(ctx, 4.9 + (y % 1) * 0.12, y, 0.012, s, -0.45);
  });
  // A big rug under the table: oxblood field, a gold border, a medallion.
  const RX0 = 2.1, RX1 = 14.1, RY0 = 3.9, RY1 = 11.5;
  R.rug((ctx) => {
    rect(ctx, RX0, RY0, RX1 - RX0, RY1 - RY0, 0.01, MAT.brassDark, { lw: 0.04, dots: shade(MAT.brassDark, 0.35), density: 0.2 });
    rect(ctx, RX0 + 0.4, RY0 + 0.4, RX1 - RX0 - 0.8, RY1 - RY0 - 0.8, 0.012, MAT.velvet, { stroke: false, dots: MAT.velvetDark, density: 0.25 });
    const cx = (RX0 + RX1) / 2, cy = (RY0 + RY1) / 2;
    face(ctx, [[cx - 4.6, cy, 0.014], [cx, cy - 2.6, 0.014], [cx + 4.6, cy, 0.014], [cx, cy + 2.6, 0.014]], MAT.velvetDark, { stroke: MAT.brass, lw: 0.05 });
    face(ctx, [[cx - 2.2, cy, 0.016], [cx, cy - 1.2, 0.016], [cx + 2.2, cy, 0.016], [cx, cy + 1.2, 0.016]], MAT.brassDark, { stroke: false, dots: MAT.velvetDark, density: 0.3 });
    if (!Q.detail) return;
    // A line inside the border, and fringe on the short ends.
    rect(ctx, RX0 + 0.62, RY0 + 0.62, RX1 - RX0 - 1.24, RY1 - RY0 - 1.24, 0.013, null, { stroke: MAT.brass, lw: 0.035 });
    ctx.beginPath();
    for (let y = RY0 + 0.1; y < RY1; y += 0.22) {
      for (const [x0, x1] of [[RX0, RX0 - 0.25], [RX1, RX1 + 0.25]]) {
        const a = P(x0, y, 0.01), b = P(x1, y, 0.01);
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      }
    }
    ctx.strokeStyle = MAT.custard;
    ctx.lineWidth = 0.04;
    ctx.stroke();
    // The table's shadow.
    rect(ctx, TX0 + 0.15, TY0 + 0.2, TX1 - TX0, TY1 - TY0 + 0.15, 0.018, alpha(C.ink, 0.2), { stroke: false });
    // Confetti and crumbs from the party.
    for (let i = 0; i < 46; i++) {
      const x = 3 + hash(i, 1) * 11, y = 4.3 + hash(i, 2) * 7;
      if (x > TX0 && x < TX1 && y > TY0 && y < TY1) continue;
      const [sx, sy] = P(x, y, 0.02);
      ctx.fillStyle = i % 4 === 3 ? INK.bone : FLAGS[i % 4];
      ctx.fillRect(sx - 0.05, sy - 0.025, 0.1, 0.05);
    }
  });

  // The goose's trail: floury webbed prints from the kitchen door (the
  // kitchen's left wall, y 12.5) to the library door (ours, y 10). They show
  // up faintly, and every lightning flash (which shows the past) lights them.
  const pts = [[16.2, 12.5], [14.2, 12.55], [12, 12.25], [9.5, 11.85], [7, 11.6], [4.5, 11.35], [2.6, 10.9], [1.2, 10.25], [-0.2, 10]];
  const prints = [];
  let side = 1, step = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const len = Math.hypot(bx - ax, by - ay), dir = Math.atan2(by - ay, bx - ax);
    for (let d = 0; d < len; d += 0.42) {
      const k = d / len;
      const x = lerp(ax, bx, k) - Math.sin(dir) * 0.1 * side, y = lerp(ay, by, k) + Math.cos(dir) * 0.1 * side;
      side = -side;
      if (x < 0.15 || x > 15.9) continue;
      if (hash(step++, 77) < 0.12) continue; // scuffed out by someone's shoe
      prints.push([x, y, dir, x / 16]); // fainter as the flour runs out
    }
  }
  R.rug((ctx) => {
    if (!Q.detail) return;
    for (const [x, y, dir, a] of prints) webPrint(ctx, x, y, dir, alpha(C.white, 0.12 + 0.3 * a), alpha(C.white, 0.2 + 0.4 * a), 0.36);
  });
  R.rug((ctx, t) => {
    const k = pastK(t);
    if (!(k > 0.02) || !Q.detail) return;
    for (const [x, y, dir] of prints) webPrint(ctx, x, y, dir, alpha(C.white, 0.6 * k), alpha(C.white, 0.85 * k), 0.38);
  }, { anim: true });
}

// ---------- Walls, windows, the doorway ----------
function wallsAndWindows(R) {
  R.walls({
    left: WALL, right: shade(WALL, 0.06), cap: INK.bone, cut: INK.stormNavy,
    doors: DOORS['dining-room'] || [],
  });
  stripes(R, 'left', shade(WALL, 0.07), { z: 1.3, step: 0.7, w: 0.26 });
  stripes(R, 'right', shade(WALL, 0.12), { z: 1.3, step: 0.7, w: 0.26 });
  R.wall((ctx) => {
    // Wainscot below the dado rail, panelled.
    onLeft(ctx, 0, 0, 16, 1.3, WAINSCOT, { stroke: false });
    onRight(ctx, 0, 0, 16, 1.3, shade(WAINSCOT, 0.06), { stroke: false });
    if (!Q.detail) return;
    for (let u = 0.3; u < 15.5; u += 1.6) {
      if (u < 11.3 && u + 1.3 > 8.7) continue; // (the library door)
      onLeft(ctx, u, 0.45, 1.3, 0.62, null, { stroke: shade(WAINSCOT, 0.3), lw: 0.03 });
    }
    for (let u = 0.3; u < 15.5; u += 1.6) onRight(ctx, u, 0.45, 1.3, 0.62, null, { stroke: shade(WAINSCOT, 0.35), lw: 0.03 });
  });
  trim(R, 'left', WOOD, { dado: 1.25 });
  trim(R, 'right', WOOD, { dado: 1.25 });
  R.decor((ctx) => { // cobwebs in the corners, up by the ceiling
    if (!Q.detail) return;
    ctx.strokeStyle = alpha(INK.bone, 0.75);
    ctx.lineWidth = 0.018;
    for (const [side, u] of [['right', 0], ['left', 0], ['right', 16]]) {
      const dir = u === 0 ? 1 : -1;
      const pt = (a, r) => side === 'right' ? P(u + dir * r * Math.cos(a), 0, 5.62 - r * Math.sin(a)) : P(0, u + r * Math.cos(a), 5.62 - r * Math.sin(a));
      ctx.beginPath();
      for (let i = 0; i <= 4; i++) {
        const a = (i / 4) * (Math.PI / 2);
        const [x0, y0] = pt(a, 0), [x1, y1] = pt(a, 1.1);
        ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
      }
      for (const r of [0.35, 0.65, 0.95]) {
        for (let i = 0; i <= 8; i++) {
          const [x, y] = pt((i / 8) * (Math.PI / 2), r * (i % 2 ? 0.92 : 1));
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
      }
      ctx.stroke();
    }
  });
  R.decor((ctx) => { // the cornice
    onLeft(ctx, 0, 5.7, 16, 0.3, WOOD, { stroke: false });
    onRight(ctx, 0, 5.7, 16, 0.3, WOOD, { stroke: false });
    if (!Q.detail) return;
    onLeft(ctx, 0, 5.62, 16, 0.08, MAT.brass, { stroke: false });
    onRight(ctx, 0, 5.62, 16, 0.08, MAT.brass, { stroke: false });
  });

  // The storm windows, in velvet drapes.
  stormWindow(R, 'right', 1, 1.8, 2, 2.8);
  stormWindow(R, 'right', 11, 1.8, 2.4, 2.8);
  // Rain running down the glass, and a bat crossing it in some flashes.
  R.decor((ctx, t) => {
    const f = Math.round(storm.flash(t) * 8) / 8; // (stepped: mix() keeps every color it makes)
    onWallR(ctx, (g) => {
      if (Q.detail) {
        g.strokeStyle = alpha(mix(INK.bone, NIGHT.flash, f), 0.35 + 0.4 * f);
        g.lineWidth = 0.035;
        g.beginPath();
        for (const [u0, w] of [[1, 2], [11, 2.4]]) {
          for (let i = 0; i < 7; i++) {
            const u = u0 + 0.15 + hash(i, u0) * (w - 0.3);
            const z = 4.5 - mod(t * (0.9 + hash(i, 3) * 0.7) + hash(i, 9) * 3, 2.8);
            g.moveTo(u, -z); g.lineTo(u - 0.04, -z + 0.28);
          }
        }
        g.stroke();
      }
      // The bat: on every other strike, flapping across the far window.
      const s = storm.strike(t);
      if (s && s.i % 2 === 1 && s.age < 0.9 && f > 0.15) {
        const q = s.age / 0.9;
        const u = 11.2 + q * 2.1, z = 3.6 + Math.sin(q * 9) * 0.15;
        const flap = Math.sin(t * 40) * 0.12;
        g.fillStyle = INK.stormNavy;
        g.beginPath();
        g.moveTo(u, -z);
        g.quadraticCurveTo(u - 0.2, -z - 0.18 - flap, u - 0.42, -z - flap);
        g.quadraticCurveTo(u - 0.2, -z + 0.02, u, -z + 0.06);
        g.quadraticCurveTo(u + 0.2, -z + 0.02, u + 0.42, -z - flap);
        g.quadraticCurveTo(u + 0.2, -z - 0.18 - flap, u, -z);
        g.fill();
      }
    });
  }, { anim: true });
  drapes(R, 'right', 1, 1.8, 2, 2.8);
  drapes(R, 'right', 11, 1.8, 2.4, 2.8);
}

// ---------- The ancestors ----------
// A painted bust, in a wall's flat units, standing on (0, 0) (the bottom of
// its shoulders). o: { coat, skin, hair: 'chops' | 'tall' | 'tufts', collar }
function bust(g, o, t = 0) {
  g.beginPath(); // shoulders
  g.ellipse(0, 0, o.w || 0.46, 0.4, 0, Math.PI, Math.PI * 2);
  g.closePath();
  g.fillStyle = o.coat;
  g.fill();
  g.strokeStyle = C.ink; g.lineWidth = 0.03; g.stroke();
  g.beginPath(); // collar
  g.moveTo(-0.12, -0.38); g.lineTo(0, -0.18); g.lineTo(0.12, -0.38);
  g.closePath();
  g.fillStyle = o.collar || INK.bone;
  g.fill();
  g.save();
  g.translate(0, -0.42);
  g.rotate(o.nod || 0);
  if (o.hair === 'tall') { // piled up, and up
    g.beginPath();
    g.ellipse(0, -0.42, 0.2, 0.36, 0, 0, Math.PI * 2);
    g.fillStyle = INK.bone; g.fill(); g.stroke();
  }
  g.beginPath(); // head
  g.ellipse(0, -0.2, 0.17, 0.2, 0, 0, Math.PI * 2);
  g.fillStyle = o.skin; g.fill(); g.stroke();
  g.fillStyle = C.ink;
  g.beginPath();
  g.arc(-0.06, -0.22, 0.022, 0, Math.PI * 2);
  g.arc(0.06, -0.22, 0.022, 0, Math.PI * 2);
  g.fill();
  if (o.hair === 'chops') { // mutton chops, the family's
    g.fillStyle = INK.bone;
    g.beginPath();
    g.ellipse(-0.15, -0.1, 0.08, 0.12, 0.3, 0, Math.PI * 2);
    g.ellipse(0.15, -0.1, 0.08, 0.12, -0.3, 0, Math.PI * 2);
    g.fill();
  } else if (o.hair === 'tufts') { // eyebrows you could lose a spoon in, and tufts
    g.fillStyle = INK.bone;
    g.beginPath();
    g.ellipse(-0.17, -0.3, 0.07, 0.05, 0, 0, Math.PI * 2);
    g.ellipse(0.17, -0.3, 0.07, 0.05, 0, 0, Math.PI * 2);
    g.ellipse(-0.07, -0.27, 0.05, 0.02, -0.3, 0, Math.PI * 2);
    g.ellipse(0.07, -0.27, 0.05, 0.02, 0.3, 0, Math.PI * 2);
    g.fill();
  }
  if (o.trumpet) { // an ear trumpet, pointed at the Brigadier
    g.beginPath();
    g.moveTo(-0.15, -0.2);
    g.lineTo(-0.5, -0.06); g.lineTo(-0.5, -0.36);
    g.closePath();
    g.fillStyle = MAT.brass; g.fill(); g.stroke();
    g.beginPath();
    g.ellipse(-0.5, -0.21, 0.05, 0.15, 0, 0, Math.PI * 2);
    g.fillStyle = MAT.brassDark; g.fill(); g.stroke();
  }
  g.restore();
  if (o.pearls) {
    g.fillStyle = INK.bone;
    for (let i = 0; i < 7; i++) {
      g.beginPath();
      g.arc(-0.15 + i * 0.05, -0.33 + Math.sin((i / 6) * Math.PI) * 0.06, 0.02, 0, Math.PI * 2);
      g.fill();
    }
  }
}
function portraits(R) {
  const frames = [
    // Sir Ambrose, who walks out of his frame at 31 seconds.
    { u: 4.35, z: 2.75, w: 1.25, h: 1.55, ground: mix(INK.verdigris, INK.stormNavy, 0.55), leave: 31, back: 166, dir: -1,
      look: { coat: INK.oxblood, skin: SKIN[1], hair: 'chops' } },
    // The first Lady Gooseworth, at 38.
    { u: 6.25, z: 2.5, w: 1.7, h: 2.0, ground: mix(INK.deepPlum, INK.stormNavy, 0.3), leave: 38, back: 170, dir: 1,
      look: { coat: INK.deepPlum, skin: SKIN[0], hair: 'tall', pearls: true, w: 0.52 } },
    // Great-Uncle Monty, who is deaf, and stays.
    { u: 8.65, z: 2.75, w: 1.25, h: 1.55, ground: mix(INK.oxblood, INK.stormNavy, 0.6),
      look: { coat: INK.verdigris, skin: SKIN[5], hair: 'tufts', trumpet: true } },
  ];
  for (const f of frames) {
    painting(R, 'right', f.u, f.z, f.w, f.h, f.ground, (ctx, t) => {
      onWallR(ctx, (g) => {
        g.save();
        g.beginPath();
        g.rect(f.u, -(f.z + f.h), f.w, f.h);
        g.clip();
        // a painted chair back, which stays when they go
        g.fillStyle = shade(f.ground, 0.35);
        g.fillRect(f.u + f.w * 0.2, -(f.z + f.h * 0.72), f.w * 0.6, f.h * 0.72);
        let dx = 0, bob = 0, nod = 0;
        if (f.leave != null) {
          const k = away(t, f.leave, f.back);
          dx = f.dir * smooth(k) * (f.w * 0.5 + 0.6);
          if (k > 0 && k < 1) bob = Math.abs(Math.sin(t * 9)) * 0.05;
        } else {
          // Nodding along, politely, from the start of the story until dinner.
          const s = mod(t);
          if (s > 28 && s < 164) nod = Math.pow(Math.max(0, Math.sin(t * 2.2)), 3) * 0.14;
        }
        g.translate(f.u + f.w / 2 + dx, -(f.z + 0.05) - bob);
        bust(g, { ...f.look, nod: f.look.trumpet ? nod : 0 }, t);
        g.restore();
      });
      // Monty didn't catch that.
      if (f.look.trumpet && Q.detail) {
        const s = mod(t);
        const say = s > 31 && s < 33 ? 'EH?' : s > 41.5 && s < 43.5 ? 'WHAT?' : s > 49.5 && s < 51 ? 'EH?' : null;
        if (say) speech(ctx, f.u + 0.1, -0.1, f.z + f.h + 0.1, say, { size: 0.36 });
      }
      // Gone: a note in the empty frame.
      if (f.leave != null && Q.detail && away(t, f.leave, f.back) > 0.99 && f.dir > 0) {
        onRight(ctx, f.u + f.w / 2 - 0.36, f.z + f.h * 0.45, 0.72, 0.3, INK.bone, { lw: 0.02 });
        wallText(ctx, 'right', f.u + f.w / 2, f.z + f.h * 0.45 + 0.15, 'BACK SOON', 0.12);
      }
    }, { anim: f.leave != null || !!f.look.trumpet });
  }
}

// ---------- The birthday banner ----------
function banner(R) {
  const u0 = 4.0, u1 = 10.0, z0 = 5.48, sag = 0.3;
  const zAt = (u) => z0 - sag * Math.sin(((u - u0) / (u1 - u0)) * Math.PI);
  const letters = 'HAPPY 80TH';
  const step = (u1 - u0) / letters.length;
  const LOOSE = 8; // the T, hanging on by one corner
  const flag = (ctx, i, t) => {
    const ch = letters[i];
    if (ch === ' ') return;
    const a = u0 + step * i + 0.04, b = a + step - 0.08, m = (a + b) / 2;
    const za = zAt(a), zb = zAt(b);
    const col = FLAGS[i % FLAGS.length];
    if (i === LOOSE) {
      // Swings from its left corner.
      const sw = Math.sin(t * 1.7) * 0.25 + 0.9;
      onWallR(ctx, (g) => {
        g.save();
        g.translate(a, -za);
        g.rotate(sw);
        g.beginPath();
        g.moveTo(0, 0); g.lineTo(b - a, 0); g.lineTo((b - a) / 2, 0.5);
        g.closePath();
        g.fillStyle = col; g.fill();
        g.strokeStyle = C.ink; g.lineWidth = 0.025; g.stroke();
        g.restore();
      });
      return;
    }
    const zm = (za + zb) / 2;
    face(ctx, [[a, 0, za], [b, 0, zb], [m, 0, zm - 0.52]], col, { lw: 0.025 });
    wallText(ctx, 'right', m, zm - 0.2, ch, 0.24, col === INK.candleGold ? INK.oxblood : INK.bone, DISPLAY);
  };
  R.decor((ctx) => {
    // The string.
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) {
      const u = lerp(u0 - 0.1, u1 + 0.1, i / 20);
      const [sx, sy] = P(u, 0, zAt(u) + 0.02);
      i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy);
    }
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.03;
    ctx.stroke();
    for (let i = 0; i < letters.length; i++) if (i !== LOOSE) flag(ctx, i, 0);
  });
  R.decor((ctx, t) => flag(ctx, LOOSE, t), { anim: true });
}

// ---------- The left wall: the library door, the swordfish, a still life ----------
function leftWall(R) {
  R.decor((ctx) => {
    // The library door's frame, and a sign.
    onLeft(ctx, 8.7, 0, 0.2, 3.8, WOOD, { lw: 0.03 });
    onLeft(ctx, 11.1, 0, 0.2, 3.8, WOOD, { lw: 0.03 });
    onLeft(ctx, 8.6, 3.6, 2.8, 0.24, WOOD, { lw: 0.03 });
    onLeft(ctx, 9.3, 4.05, 1.4, 0.4, MAT.brass, { dots: MAT.brassDark, density: 0.2, lw: 0.03 });
    wallText(ctx, 'left', 10, 4.25, 'LIBRARY', 0.2, INK.stormNavy, DISPLAY);
    if (Q.detail) {
      onLeft(ctx, 11.45, 2.35, 0.8, 0.42, INK.bone, { lw: 0.02 });
      wallText(ctx, 'left', 11.85, 2.62, 'QUIET', 0.12);
      wallText(ctx, 'left', 11.85, 2.46, 'PLEASE', 0.12);
    }
  });
  // The family arms: a goose, of course, and the motto.
  R.decor((ctx) => {
    onWallL(ctx, (g) => {
      const u = -7.55, z = 3.35;
      g.strokeStyle = C.ink; g.lineWidth = 0.03;
      g.beginPath(); // the shield, quartered
      g.moveTo(u - 0.42, -z - 0.5); g.lineTo(u + 0.42, -z - 0.5); g.lineTo(u + 0.42, -z + 0.05);
      g.quadraticCurveTo(u + 0.4, -z + 0.45, u, -z + 0.6); g.quadraticCurveTo(u - 0.4, -z + 0.45, u - 0.42, -z + 0.05);
      g.closePath();
      g.fillStyle = INK.oxblood; g.fill();
      g.save(); g.clip();
      g.fillStyle = MAT.brass;
      g.fillRect(u, -z - 0.5, 0.42, 0.52); g.fillRect(u - 0.42, -z + 0.02, 0.42, 0.6);
      g.restore();
      g.stroke();
      g.fillStyle = C.white; // the goose, rampant
      g.beginPath(); g.ellipse(u - 0.02, -z + 0.02, 0.2, 0.12, -0.3, 0, Math.PI * 2); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(u + 0.1, -z - 0.05); g.quadraticCurveTo(u + 0.2, -z - 0.25, u + 0.12, -z - 0.36);
      g.lineWidth = 0.08; g.strokeStyle = C.white; g.lineCap = 'round'; g.stroke();
      g.beginPath(); g.arc(u + 0.12, -z - 0.38, 0.06, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(u + 0.17, -z - 0.4); g.lineTo(u + 0.3, -z - 0.36); g.lineTo(u + 0.17, -z - 0.34);
      g.fillStyle = C.coral; g.fill();
      g.lineWidth = 0.03; g.strokeStyle = C.ink;
      g.beginPath(); // the motto's scroll
      g.moveTo(u - 0.6, -z + 0.72); g.lineTo(u + 0.6, -z + 0.72); g.lineTo(u + 0.52, -z + 0.9); g.lineTo(u - 0.52, -z + 0.9);
      g.closePath();
      g.fillStyle = INK.bone; g.fill(); g.stroke();
    });
    if (Q.detail) wallText(ctx, 'left', 7.55, 3.35 - 0.81, 'SEMPER ANSER', 0.11, INK.oxblood);
  });
  // A still life, over the fire's side of the room: a trifle, naturally.
  painting(R, 'left', 12.3, 2.4, 2.2, 1.6, mix(INK.verdigris, INK.stormNavy, 0.45), (ctx) => {
    onWallL(ctx, (g) => {
      const cu = -13.4, cz = 2.75; // (the left wall's flat units run -y)
      g.fillStyle = shade(MAT.mahogany, 0.2); // a table edge
      g.fillRect(-14.5, -2.75, 2.2, 0.35);
      g.beginPath(); // the glass bowl, with its layers
      g.moveTo(cu - 0.5, -cz - 0.75); g.lineTo(cu + 0.5, -cz - 0.75); g.lineTo(cu + 0.38, -cz); g.lineTo(cu - 0.38, -cz);
      g.closePath();
      g.fillStyle = MAT.trifle; g.fill();
      g.fillStyle = MAT.custard;
      g.fillRect(cu - 0.46, -cz - 0.55, 0.92, 0.22);
      g.fillStyle = MAT.cream;
      g.beginPath();
      g.ellipse(cu, -cz - 0.78, 0.52, 0.14, 0, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.arc(cu + 0.05, -cz - 0.97, 0.07, 0, Math.PI * 2);
      g.fillStyle = INK.oxblood; g.fill();
      g.strokeStyle = C.ink; g.lineWidth = 0.03;
      g.beginPath();
      g.moveTo(cu - 0.5, -cz - 0.75); g.lineTo(cu - 0.38, -cz); g.lineTo(cu + 0.38, -cz); g.lineTo(cu + 0.5, -cz - 0.75);
      g.stroke();
    });
  });
  // A swordfish over the fireplace (the Lord caught it; it's the only thing in
  // the house he didn't stuff himself), in a party hat, with a glass eye that
  // catches the lightning.
  R.decor((ctx, t) => {
    const f = storm.flash(t);
    onWallL(ctx, (g) => {
      const u = -4.7, z = 3.75;
      g.strokeStyle = C.ink; g.lineWidth = 0.03; g.lineJoin = 'round';
      g.beginPath(); // the board it's mounted on
      g.roundRect(u - 0.95, -z - 0.32, 1.9, 0.62, 0.28);
      g.fillStyle = MAT.mahogany; g.fill(); g.stroke();
      g.beginPath(); // the bill
      g.moveTo(u - 0.5, -z - 0.02); g.lineTo(u - 1.35, -z + 0.02); g.lineTo(u - 0.5, -z + 0.06);
      g.closePath();
      g.fillStyle = MAT.silver; g.fill(); g.stroke();
      g.beginPath(); // the sail on its back, and the tail
      g.moveTo(u - 0.3, -z - 0.14); g.quadraticCurveTo(u - 0.1, -z - 0.62, u + 0.3, -z - 0.14);
      g.moveTo(u + 0.5, -z); g.lineTo(u + 0.82, -z - 0.32); g.lineTo(u + 0.72, -z); g.lineTo(u + 0.82, -z + 0.3);
      g.closePath();
      g.fillStyle = INK.verdigris; g.fill(); g.stroke();
      g.beginPath(); // the body: dark back, pale belly
      g.ellipse(u, -z, 0.56, 0.18, 0, 0, Math.PI * 2);
      g.fillStyle = mix(INK.verdigris, INK.stormNavy, 0.45); g.fill(); g.stroke();
      g.beginPath();
      g.ellipse(u + 0.02, -z + 0.07, 0.46, 0.08, 0, 0, Math.PI);
      g.fillStyle = MAT.silver; g.fill();
      g.fillStyle = C.ink; // glass eye
      g.beginPath(); g.arc(u - 0.36, -z - 0.03, 0.045, 0, Math.PI * 2); g.fill();
      g.fillStyle = f > 0.2 ? C.white : alpha(C.white, 0.7);
      g.beginPath(); g.arc(u - 0.35, -z - 0.045, f > 0.2 ? 0.03 : 0.014, 0, Math.PI * 2); g.fill();
      g.beginPath(); // the party hat, at an angle
      g.moveTo(u - 0.5, -z - 0.12); g.lineTo(u - 0.32, -z - 0.62); g.lineTo(u - 0.18, -z - 0.14);
      g.closePath();
      g.fillStyle = INK.oxblood; g.fill(); g.stroke();
      g.fillStyle = INK.candleGold;
      g.beginPath(); g.arc(u - 0.32, -z - 0.64, 0.06, 0, Math.PI * 2); g.fill();
    });
  }, { anim: true });
}

// ---------- The right wall's odds and ends ----------
function rightWallBits(R) {
  // A barometer that has only ever read STORMY, and at midnight reads MURDER.
  const u = 15.15, z = 3.2;
  R.decor((ctx, t) => {
    onWallR(ctx, (g) => {
      g.strokeStyle = C.ink; g.lineWidth = 0.03;
      g.beginPath(); // the case: a neck and a round dial
      g.roundRect(u - 0.12, -z - 1.3, 0.24, 0.9, 0.1);
      g.fillStyle = MAT.mahogany; g.fill(); g.stroke();
      g.beginPath();
      g.arc(u, -z, 0.5, 0, Math.PI * 2);
      g.fillStyle = MAT.mahogany; g.fill(); g.stroke();
      g.beginPath();
      g.arc(u, -z, 0.4, 0, Math.PI * 2);
      g.fillStyle = INK.bone; g.fill();
      g.strokeStyle = MAT.brass; g.lineWidth = 0.05; g.stroke();
      const s = mod(t);
      let a = 0.42 + Math.sin(t * 3.1) * 0.02; // STORMY, trembling
      if (s > 86 && s < 150) a = lerp(0.42, 1.18, smooth(clamp((s - 86) / 1.5)) * (1 - smooth(clamp((s - 130) / 12)))) + Math.sin(t * 13) * 0.015;
      g.save();
      g.translate(u, -z);
      g.rotate(a);
      g.beginPath();
      g.moveTo(0, 0.08); g.lineTo(0.025, 0); g.lineTo(0, -0.34); g.lineTo(-0.025, 0);
      g.closePath();
      g.fillStyle = C.ink; g.fill();
      g.restore();
      g.beginPath(); g.arc(u, -z, 0.04, 0, Math.PI * 2); g.fillStyle = MAT.brass; g.fill();
    });
    if (!Q.detail) return;
    for (const [lab, a] of [['FAIR', -1.05], ['RAIN', -0.35], ['STORMY', 0.42], ['MURDER', 1.18]]) {
      wallText(ctx, 'right', u + Math.sin(a) * 0.26, z + Math.cos(a) * 0.26, lab, 0.06, a > 1 ? INK.oxblood : C.ink);
    }
  }, { anim: true });
}

// The Brigadier's false tooth, standing up in the soup at (bx, by) on the
// screen, with a ring spreading where it landed.
function falseTooth(ctx, bx, by, t) {
  if (Q.detail) {
    const k = mod(t * 0.6, 1);
    ctx.beginPath();
    ctx.ellipse(bx, by, 0.05 + k * 0.12, (0.05 + k * 0.12) * 0.5, 0, 0, Math.PI * 2);
    ctx.strokeStyle = alpha(C.white, 0.6 * (1 - k));
    ctx.lineWidth = 0.02;
    ctx.stroke();
  }
  ctx.beginPath(); // the gum it's set in
  ctx.ellipse(bx, by - 0.02, 0.14, 0.07, 0, Math.PI, Math.PI * 2);
  ctx.closePath();
  paint(ctx, C.pink, { lw: 0.025 });
  ctx.beginPath(); // the tooth, a big molar
  ctx.moveTo(bx - 0.1, by - 0.07);
  ctx.lineTo(bx - 0.12, by - 0.27);
  ctx.quadraticCurveTo(bx - 0.12, by - 0.38, bx - 0.04, by - 0.36);
  ctx.quadraticCurveTo(bx, by - 0.32, bx + 0.04, by - 0.36);
  ctx.quadraticCurveTo(bx + 0.12, by - 0.38, bx + 0.12, by - 0.27);
  ctx.lineTo(bx + 0.1, by - 0.07);
  ctx.closePath();
  paint(ctx, C.white, { lw: 0.03 });
  ctx.beginPath(); // a gold filling
  ctx.arc(bx + 0.03, by - 0.22, 0.03, 0, Math.PI * 2);
  ctx.fillStyle = MAT.brass;
  ctx.fill();
}

// A splat of soup at (x, y, z), stretched along the way it flew (a, on the
// screen): the trail from the Brigadier's bowl to the tureen.
function splat(ctx, x, y, z, s, a = -2.2) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.rotate(a);
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.13 * s, 0.065 * s, 0, 0, Math.PI * 2);
  ctx.moveTo(0.2 * s, 0); ctx.arc(0.17 * s, 0, 0.035 * s, 0, Math.PI * 2);
  ctx.moveTo(-0.17 * s, 0.03 * s); ctx.arc(-0.2 * s, 0.03 * s, 0.025 * s, 0, Math.PI * 2);
  paint(ctx, SOUP, { lw: 0.015 });
  ctx.restore();
}

// A gravy boat shaped like a goose, white china with an orange beak for a
// spout: the Lord had everything made in goose. A red herring.
function gravyBoat(ctx, x, y) {
  disc(ctx, x, y, TZ + 0.005, 0.26, SILVER, { lw: 0.02 }); // its saucer
  const [bx, by] = P(x, y, TZ + 0.02);
  const white = mix(C.white, INK.bone, 0.25);
  // The tail (the handle), up at the back.
  ctx.beginPath();
  ctx.moveTo(bx + 0.14, by - 0.12); ctx.quadraticCurveTo(bx + 0.3, by - 0.2, bx + 0.28, by - 0.3); ctx.lineTo(bx + 0.18, by - 0.2);
  ctx.closePath();
  paint(ctx, white, { lw: 0.02 });
  // The body, a boat.
  ctx.beginPath();
  ctx.moveTo(bx - 0.2, by - 0.16);
  ctx.quadraticCurveTo(bx - 0.18, by + 0.02, bx, by + 0.01);
  ctx.quadraticCurveTo(bx + 0.2, by, bx + 0.22, by - 0.15);
  ctx.closePath();
  paint(ctx, white, { lw: 0.022 });
  ctx.beginPath(); // gravy, in it
  ctx.ellipse(bx + 0.01, by - 0.155, 0.19, 0.04, 0, 0, Math.PI * 2);
  ctx.fillStyle = mix(MAT.oak, C.ink, 0.35);
  ctx.fill();
  // The neck and head, rising from the front: the beak is the spout.
  ctx.beginPath();
  ctx.moveTo(bx - 0.17, by - 0.14); ctx.quadraticCurveTo(bx - 0.22, by - 0.3, bx - 0.17, by - 0.42);
  ctx.lineCap = 'round';
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.stroke(); }
  ctx.strokeStyle = white; ctx.lineWidth = 0.065; ctx.stroke();
  ctx.beginPath(); ctx.arc(bx - 0.16, by - 0.44, 0.065, 0, Math.PI * 2); paint(ctx, white, { lw: 0.02 });
  ctx.beginPath(); ctx.moveTo(bx - 0.21, by - 0.46); ctx.lineTo(bx - 0.33, by - 0.42); ctx.lineTo(bx - 0.21, by - 0.41);
  ctx.closePath(); paint(ctx, INK.candleGold, { lw: 0.015 });
  ctx.fillStyle = C.ink;
  ctx.beginPath(); ctx.arc(bx - 0.17, by - 0.46, 0.014, 0, Math.PI * 2); ctx.fill();
}

// ---------- The sideboard ----------
function sideboard(R, burn, tureen) {
  R.thing(7, 1.1, (ctx, t) => {
    for (const lx of [4.1, 9.8]) box(ctx, lx, 0.95, 0, 0.1, 0.1, 0.18, WOOD, { flat: true });
    box(ctx, 4, 0.2, 0.18, 6, 0.9, 0.88, WOOD);
    box(ctx, 3.92, 0.14, 1.06, 6.16, 1.02, 0.08, shade(WOOD, 0.08));
    if (Q.detail) {
      // Cupboard doors and drawers on its front.
      for (let i = 0; i < 3; i++) {
        const x0 = 4.15 + i * 1.95;
        face(ctx, [[x0, 1.1, 0.3], [x0 + 1.75, 1.1, 0.3], [x0 + 1.75, 1.1, 0.8], [x0, 1.1, 0.8]], null, { stroke: shade(WOOD, 0.45), lw: 0.03 });
        face(ctx, [[x0, 1.1, 0.86], [x0 + 1.75, 1.1, 0.86], [x0 + 1.75, 1.1, 1.0], [x0, 1.1, 1.0]], null, { stroke: shade(WOOD, 0.45), lw: 0.03 });
        disc(ctx, x0 + 0.88, 1.1, 0.93, 0.035, MAT.brass, { stroke: false });
      }
    }
    const Z = 1.14;
    // The soup tureen. Its lid sits crooked, soup dribbled down the side
    // (the tell): the Brigadier's false tooth flew in at "In 1974", and
    // Jenkins just put the lid back on. Tap it and the lid slides off.
    const [TX, TYY] = TUREEN;
    const k = tureen.k();
    cylinder(ctx, TX, TYY, Z, 0.32, 0.32, SILVER);
    const [tx, ty] = P(TX, TYY, Z + 0.32);
    // Where the soup landed when it hit: a splash up the wall behind.
    {
      const [wx, wy] = P(TX + 0.15, 0.02, Z + 0.95);
      ctx.beginPath();
      ctx.ellipse(wx, wy, 0.3, 0.2, -0.4, 0, Math.PI * 2);
      for (const [dx, dy, r] of [[-0.38, -0.16, 0.06], [0.34, -0.3, 0.05], [0.2, 0.28, 0.045], [-0.3, 0.22, 0.04], [0.05, -0.36, 0.035]]) { ctx.moveTo(wx + dx + r, wy + dy); ctx.arc(wx + dx, wy + dy, r, 0, Math.PI * 2); }
      paint(ctx, alpha(SOUP, 0.9), { lw: 0.015 });
      ctx.fillStyle = alpha(SOUP, 0.9);
      for (const [dx, len] of [[-0.12, 0.35], [0.1, 0.25]]) ctx.fillRect(wx + dx, wy + 0.1, 0.04, len);
    }
    // A dribble of soup down its side, and a drip on the sideboard.
    face(ctx, [[TX + 0.1, TYY + 0.3, Z + 0.32], [TX + 0.14, TYY + 0.27, Z + 0.32], [TX + 0.13, TYY + 0.28, Z + 0.1], [TX + 0.1, TYY + 0.3, Z + 0.06]], SOUP, { lw: 0.012 });
    disc(ctx, TX + 0.2, TYY + 0.42, Z + 0.003, 0.06, SOUP, { stroke: false });
    if (k > 0.02) {
      // The soup, and the tooth standing up in it.
      ctx.beginPath();
      ctx.ellipse(tx, ty, 0.42, 0.21, 0, 0, Math.PI * 2);
      paint(ctx, SOUP, { lw: 0.025, dots: shade(SOUP, 0.3), density: 0.15 });
      falseTooth(ctx, tx + 0.06, ty + 0.02, t);
    }
    // The ladle, sticking up out of it at an angle.
    face(ctx, [[4.95, 0.6, Z + 0.25], [5.35, 0.85, Z + 0.95]], null, { stroke: C.ink, lw: 0.075 });
    face(ctx, [[4.95, 0.6, Z + 0.25], [5.35, 0.85, Z + 0.95]], null, { stroke: SILVER, lw: 0.045 });
    // The lid: knocked well askew on top (shut), slid off to the left and
    // tipped (open). Shut, it's propped up on one side, the soup showing dark
    // under it.
    if (k < 0.02) {
      ctx.beginPath();
      ctx.ellipse(tx, ty, 0.42, 0.21, 0, 0, Math.PI * 2);
      paint(ctx, shade(SOUP, 0.35), { lw: 0.025 });
    }
    ctx.save();
    ctx.translate(tx - 0.62 * k - 0.08 * (1 - k), ty - 0.16 * (1 - k) + 0.3 * k);
    ctx.rotate(-0.42 * (1 - k) - 0.55 * k);
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.45, 0.24, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
    paint(ctx, tint(SILVER, 0.2), { lw: 0.03 });
    ctx.beginPath(); ctx.arc(0, -0.26, 0.06, 0, Math.PI * 2); paint(ctx, SILVER, { lw: 0.02 });
    ctx.restore();
    // The cloche. At lights out it lifts a crack, and someone looks out.
    disc(ctx, 6.3, 0.62, Z, 0.45, SILVER, { lw: 0.03 });
    const lift = lightsOut(t) ? 0.12 : 0;
    const [cx, cy] = P(6.3, 0.62, Z + 0.02 + lift);
    if (lift) {
      ctx.fillStyle = C.black;
      ctx.fillRect(cx - 0.4, cy - 0.14, 0.8, 0.14);
    }
    ctx.beginPath();
    ctx.ellipse(cx, cy, 0.46, 0.46, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
    paint(ctx, SILVER, { lw: 0.03, dots: shade(SILVER, 0.3), density: 0.12 });
    ctx.beginPath(); ctx.arc(cx, cy - 0.5, 0.06, 0, Math.PI * 2); paint(ctx, SILVER, { lw: 0.02 });
    // The decanters on a tray, and a 1974 from the cellar.
    disc(ctx, 7.6, 0.62, Z, 0.42, SILVER, { lw: 0.03 });
    for (const [dx, dy, lvl] of [[7.4, 0.52, 0.6], [7.8, 0.72, 0.25]]) {
      const [bx, by] = P(dx, dy, Z);
      ctx.beginPath();
      ctx.moveTo(bx - 0.06, by - 0.55); ctx.lineTo(bx - 0.06, by - 0.42);
      ctx.quadraticCurveTo(bx - 0.2, by - 0.35, bx - 0.18, by - 0.02);
      ctx.lineTo(bx + 0.18, by - 0.02);
      ctx.quadraticCurveTo(bx + 0.2, by - 0.35, bx + 0.06, by - 0.42);
      ctx.lineTo(bx + 0.06, by - 0.55);
      ctx.closePath();
      paint(ctx, GLASS, { lw: 0.025 });
      ctx.save(); ctx.clip();
      ctx.fillStyle = MAT.wine; ctx.fillRect(bx - 0.2, by - 0.4 * lvl, 0.4, 0.5);
      ctx.restore();
      ctx.beginPath(); ctx.arc(bx, by - 0.6, 0.05, 0, Math.PI * 2); paint(ctx, GLASS, { lw: 0.02 });
    }
    const [wx, wy] = P(8.35, 0.55, Z);
    ctx.beginPath();
    ctx.moveTo(wx - 0.1, wy); ctx.lineTo(wx - 0.1, wy - 0.42); ctx.quadraticCurveTo(wx - 0.1, wy - 0.52, wx - 0.035, wy - 0.58);
    ctx.lineTo(wx - 0.035, wy - 0.72); ctx.lineTo(wx + 0.035, wy - 0.72); ctx.lineTo(wx + 0.035, wy - 0.58);
    ctx.quadraticCurveTo(wx + 0.1, wy - 0.52, wx + 0.1, wy - 0.42); ctx.lineTo(wx + 0.1, wy);
    ctx.closePath();
    paint(ctx, BOTTLE, { lw: 0.025 });
    ctx.fillStyle = INK.bone;
    ctx.fillRect(wx - 0.09, wy - 0.3, 0.18, 0.13);
    if (Q.detail) cardText(ctx, 8.35, 0.55, Z + 0.21, '1974', 0.07, INK.oxblood);
    // The Brigadier's present: his memoirs, all nine volumes of 1974.
    for (let i = 0; i < 9; i++) {
      box(ctx, 9.1, 0.42, Z + i * 0.075, 0.55, 0.42, 0.075, FLAGS[(i + 1) % FLAGS.length], { flat: true, lw: 0.02, top: INK.bone });
    }
    box(ctx, 9.34, 0.42, Z, 0.07, 0.42, 0.7, INK.oxblood, { flat: true, stroke: false }); // the ribbon
    if (Q.detail) {
      for (let i = 0; i < 9; i++) cardText(ctx, 9.375, 0.84, Z + i * 0.075 + 0.037, '1974', 0.05, INK.bone);
    }
    const [rx, ry] = P(9.375, 0.63, Z + 0.7);
    ctx.beginPath();
    ctx.ellipse(rx - 0.1, ry - 0.05, 0.1, 0.06, 0.4, 0, Math.PI * 2);
    ctx.ellipse(rx + 0.1, ry - 0.05, 0.1, 0.06, -0.4, 0, Math.PI * 2);
    paint(ctx, INK.oxblood, { lw: 0.02 });
    // Two candlesticks, burning down with the rest.
    for (const [x, i] of [[5.6, 3], [8.85, 4]]) {
      cylinder(ctx, x, 0.45, Z, 0.1, 0.03, MAT.brass, { flat: true });
      const [sx, sy] = P(x, 0.45, Z);
      ctx.fillStyle = MAT.brass;
      ctx.fillRect(sx - 0.03, sy - 0.5, 0.06, 0.5);
      ctx.beginPath(); ctx.ellipse(sx, sy - 0.5, 0.09, 0.04, 0, 0, Math.PI * 2); paint(ctx, MAT.brass, { lw: 0.02 });
      wax(ctx, x, 0.45, Z + 0.45, burn(t, i, 0.45));
    }
  }, { anim: true });
  // Two eyes under the cloche, shining in the dark.
  R.light({
    at: [6.3, 0.62, 1.3], r: 0.5, color: INK.candleGold, k: (t) => lightsOut(t) * (hash(Math.floor(t * 0.7), 8) > 0.2 ? 1 : 0),
    draw: (ctx, t, k) => {
      if (!(k > 0.5)) return;
      const [cx, cy] = P(6.3, 0.62, 1.16 + 0.12);
      ctx.fillStyle = INK.candleGold;
      ctx.beginPath(); ctx.arc(cx - 0.08, cy - 0.06, 0.032, 0, Math.PI * 2); ctx.arc(cx + 0.06, cy - 0.06, 0.032, 0, Math.PI * 2); ctx.fill();
    },
  });
  // Steam off the tureen at dinner, and the candles' light.
  R.thing(4.85, 0.9, (ctx, t) => steam(ctx, t, 4.85, 0.62, 1.8, steamK(t), 11), { anim: true });
  for (const [x, i] of [[5.6, 3], [8.85, 4]]) {
    R.light({
      at: [x, 0.45, 2.1], r: 1.5, color: INK.candleGold, k: house.flicker(40 + i),
      draw: (ctx, t, k) => flame(ctx, x, 0.45, 1.14 + 0.45 + burn(t, i, 0.45) + 0.02, k),
    });
  }
}

// ---------- The fireplace ----------
function fireplace(R) {
  const y0 = 3.1, y1 = 6.3;
  R.thing(0.9, 4.7, (ctx) => {
    box(ctx, 0.3, y0 + 0.25, 0, 0.62, y1 - y0 - 0.5, 0.05, MAT.stoneDark, { flat: true }); // hearth
    box(ctx, 0, y0, 0, 0.32, y1 - y0, 1.42, MAT.marble, { dotsL: MAT.marbleVein, right: shade(MAT.marble, 0.06) });
    // The opening.
    face(ctx, [[0.32, 3.85, 0], [0.32, 5.55, 0], [0.32, 5.55, 0.95], [0.32, 3.85, 0.95]], C.black, { lw: 0.04 });
    face(ctx, [[0.32, 3.85, 0.95], [0.32, 5.55, 0.95], [0.32, 5.55, 1.05], [0.32, 3.85, 1.05]], MAT.brass, { lw: 0.02 });
    // Logs on the grate.
    for (const [yy, zz] of [[4.35, 0.14], [4.95, 0.14], [4.65, 0.28]]) {
      const [lx, ly] = P(0.25, yy, zz);
      ctx.beginPath();
      ctx.ellipse(lx, ly, 0.34, 0.1, -0.46, 0, Math.PI * 2);
      paint(ctx, shade(MAT.oak, 0.4), { lw: 0.025 });
    }
    // The mantel, and what's on it.
    box(ctx, 0, y0 - 0.15, 1.42, 0.5, y1 - y0 + 0.3, 0.12, MAT.marble, { right: shade(MAT.marble, 0.08) });
    const Z = 1.54;
    // A carriage clock (it has stopped, at midnight).
    box(ctx, 0.12, 4.52, Z, 0.25, 0.36, 0.34, MAT.brass, { flat: true, lw: 0.025 });
    const [cx, cy] = P(0.37, 4.7, Z + 0.18);
    ctx.beginPath(); ctx.ellipse(cx, cy, 0.1, 0.12, -0.46, 0, Math.PI * 2); paint(ctx, INK.bone, { lw: 0.02 });
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 0.01, cy - 0.09); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02; ctx.stroke();
    // Birthday cards, standing open along the mantel.
    for (const [yy, col] of [[3.1, INK.verdigris], [3.65, INK.bone], [5.45, INK.candleGold], [5.95, INK.deepPlum]]) {
      face(ctx, [[0.3, yy, Z], [0.2, yy + 0.2, Z], [0.2, yy + 0.2, Z + 0.34], [0.3, yy, Z + 0.34]], shade(col, 0.15), { lw: 0.02 });
      face(ctx, [[0.2, yy + 0.2, Z], [0.3, yy + 0.4, Z], [0.3, yy + 0.4, Z + 0.34], [0.2, yy + 0.2, Z + 0.34]], col, { lw: 0.02 });
    }
    // A brass fender, and the fire irons on their stand.
    face(ctx, [[0.95, y0 + 0.5, 0.12], [0.95, y1 - 0.5, 0.12]], null, { stroke: MAT.brass, lw: 0.06 });
    cylinder(ctx, 0.6, 6.75, 0, 0.14, 0.04, C.ink, { flat: true });
    face(ctx, [[0.6, 6.75, 0.04], [0.6, 6.75, 1.25]], null, { stroke: C.ink, lw: 0.05 });
    for (const [dy, len] of [[-0.12, 0.95], [0.12, 0.85], [0, 1.0]]) {
      face(ctx, [[0.6, 6.75, 1.2], [0.6, 6.75 + dy, 1.2 - len]], null, { stroke: shade(C.grey, 0.3), lw: 0.035 });
      const [hx, hy] = P(0.6, 6.75, 1.22);
      ctx.beginPath(); ctx.arc(hx + dy * 0.5, hy, 0.045, 0, Math.PI * 2); paint(ctx, MAT.brass, { lw: 0.015 });
    }
  });
  // The fire: its light, and the flames (drawn with the light, so they burn
  // on when the lights go out).
  R.light({ at: [0.6, 4.7, 0.5], r: 3.2, color: INK.candleGold, k: house.flicker(3) });
  R.light({
    at: [0.6, 4.7, 0.4], r: 1.5, color: C.coral, k: house.flicker(4),
    draw: (ctx, t) => {
      for (let i = 0; i < 5; i++) {
        const yy = 4.1 + i * 0.3;
        const h = 0.3 + 0.18 * Math.abs(Math.sin(t * (5 + i) + i * 1.7));
        const [fx, fy] = P(0.22, yy, 0.25);
        const tip = fx + Math.sin(t * 7 + i) * 0.06;
        ctx.beginPath();
        ctx.moveTo(tip, fy - h);
        ctx.bezierCurveTo(fx + 0.16, fy - h * 0.45, fx + 0.15, fy + 0.02, fx, fy + 0.02);
        ctx.bezierCurveTo(fx - 0.15, fy + 0.02, fx - 0.16, fy - h * 0.45, tip, fy - h);
        ctx.closePath();
        ctx.fillStyle = i % 2 ? C.coral : INK.candleGold;
        ctx.fill();
      }
    },
  });
}

// ---------- The table ----------
function table(R, clock, burn) {
  const items = [];
  const add = (x, y, draw) => items.push({ x, y, draw });

  // The places. Back row: the diner sits at y 5.2 and their glass and card
  // are on their side of the plate; front row the other way round.
  const seat = (x, row, o = {}) => {
    const back = row === 'back';
    const px = o.px ?? x, py = o.py ?? (back ? 6.62 : 8.78);
    const gy = back ? 6.25 : 8.4, cy = back ? 6.16 : 8.32;
    if (o.card) add(px, cy, (ctx) => placeCard(ctx, px, cy, o.card));
    const gx = px + (o.gdx ?? 0.4);
    if (o.glass) add(gx, gy, (ctx, t) => o.glass(ctx, gx, gy, t));
    add(px, py, (ctx, t) => {
      plate(ctx, px, py, o.plate);
      cutlery(ctx, px, py);
      if (o.extra) o.extra(ctx, t, px, py);
    });
  };
  const glassOf = (c) => (ctx, x, y, t) => wineGlass(ctx, x, y, c.wine(t));

  // Mr. Todd, the fox: a guest of honour, stuffed. (The Brigadier's false
  // tooth flew past him into the tureen at "In 1974".)
  seat(4.5, 'back', {
    px: 5.3, py: 6.72, card: 'MR. TODD',
    plate: { bx: TOOTH[0], by: TOOTH[1] },
    glass: (ctx, x, y) => wineGlass(ctx, x, y, 0.92),
  });
  // Lady Philippa: no glass (it's in the library), just the ring it left.
  seat(7, 'back', {
    card: 'LADY P.',
    extra: (ctx) => {
      if (!Q.detail) return;
      disc(ctx, 7.42, 6.28, TZ + 0.004, 0.09, null, { stroke: alpha(MAT.wine, 0.8), lw: 0.03 });
      // A rose from the gardener.
      face(ctx, [[6.45, 6.95, TZ + 0.01], [6.75, 6.75, TZ + 0.01]], null, { stroke: MAT.leafDark, lw: 0.04 });
      disc(ctx, 6.42, 6.98, TZ + 0.03, 0.07, INK.oxblood, { lw: 0.02 });
    },
  });
  // Rupert: his cards under the plate, and a glass he knocks over when he
  // bolts (at 44 seconds). The wine spreads.
  seat(9.5, 'back', {
    card: 'RUPERT',
    glass: (ctx, x, y, t) => {
      const c = clock.rupert;
      const tip = c.seated(t) ? 0 : easeOut(clamp(c.since(t) / 0.35));
      if (tip > 0) {
        const r = 0.08 + 0.4 * easeOut(clamp(c.since(t) / 8));
        disc(ctx, x + 0.05, y + 0.35, TZ + 0.006, r, alpha(MAT.wine, 0.85), { stroke: false });
      }
      wineGlass(ctx, x, y, tip > 0 ? 0 : c.wine(t), { tip });
    },
    extra: (ctx) => {
      if (!Q.detail) return;
      for (let i = 0; i < 4; i++) {
        const [cx, cy] = P(9.05, 6.98, TZ + 0.01);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-0.5 + i * 0.25);
        ctx.fillStyle = INK.bone; ctx.fillRect(-0.05, -0.18, 0.1, 0.16);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.015; ctx.strokeRect(-0.05, -0.18, 0.1, 0.16);
        ctx.fillStyle = i % 2 ? INK.oxblood : C.ink; ctx.fillRect(-0.02, -0.14, 0.04, 0.04);
        ctx.restore();
      }
    },
  });
  // Mr. Bear, who couldn't come (he's in the library, being questioned).
  seat(12, 'back', {
    card: 'MR. BEAR', plate: { bowl: false, r: 0.34 },
    extra: (ctx) => {
      cylinder(ctx, 12.12, 6.66, TZ + 0.01, 0.13, 0.2, MAT.custard, { top: MAT.brass });
      face(ctx, [[12.12, 6.66, TZ + 0.25], [12.3, 6.5, TZ + 0.45]], null, { stroke: MAT.oak, lw: 0.04 });
    },
  });
  // The Brigadier: soup, and the Battle of 1974, fought in salt and pepper.
  seat(4.5, 'front', {
    card: 'BRIG. SNORT', glass: glassOf(clock.brigadier),
    extra: (ctx) => {
      if (!Q.detail) return;
      for (let i = 0; i < 3; i++) {
        cylinder(ctx, 5.3, 8.62 + i * 0.22, TZ, 0.05, 0.12, C.white, { top: SILVER });
        cylinder(ctx, 6.05, 8.62 + i * 0.22, TZ, 0.05, 0.12, shade(SILVER, 0.2), { top: C.ink });
      }
      disc(ctx, 5.68, 8.5, TZ + 0.05, 0.12, MAT.oakLight, { lw: 0.02 }); // a roll, as a hill
      face(ctx, [[5.68, 8.5, TZ + 0.1], [5.68, 8.5, TZ + 0.38]], null, { lw: 0.02 });
      face(ctx, [[5.68, 8.5, TZ + 0.38], [5.84, 8.5, TZ + 0.33], [5.68, 8.5, TZ + 0.28]], INK.oxblood, { lw: 0.015 });
      ctx.fillStyle = MAT.leaf; // peas, advancing
      for (let i = 0; i < 7; i++) {
        const [sx, sy] = P(5.45 + hash(i, 5) * 0.45, 8.62 + hash(i, 6) * 0.5, TZ + 0.02);
        ctx.beginPath(); ctx.arc(sx, sy, 0.035, 0, Math.PI * 2); ctx.fill();
      }
    },
  });
  // Dr. Crane: soup, and his pill box, open.
  seat(7, 'front', {
    card: 'DR. CRANE', glass: glassOf(clock.crane),
    extra: (ctx) => {
      box(ctx, 7.42, 8.98, TZ, 0.18, 0.12, 0.05, SILVER, { flat: true, lw: 0.015 });
    },
  });
  // Inspector Pidge's place, untouched: he hasn't made it to dinner.
  seat(9.5, 'front', {
    card: 'INSP. PIDGE', plate: { bowl: false },
    glass: (ctx, x, y) => wineGlass(ctx, x, y, 0),
  });
  // A place set for the goose: a bowl of breadcrumbs, a glass of water, a
  // very small napkin, and a card.
  seat(12, 'front', {
    px: GOOSE_PLACE[0], py: GOOSE_PLACE[1], gdx: 0.52,
    plate: { soup: MAT.oakLight },
    glass: (ctx, x, y) => wineGlass(ctx, x, y, 0.8, { wine: alpha(INK.verdigris, 0.45) }),
    extra: (ctx, t, px, py) => {
      // Breadcrumbs, heaped up in the bowl and spilling onto the plate.
      const [bx, by] = P(px, py, TZ + 0.1);
      ctx.beginPath();
      ctx.moveTo(bx - 0.25, by);
      ctx.quadraticCurveTo(bx - 0.2, by - 0.22, bx, by - 0.24);
      ctx.quadraticCurveTo(bx + 0.2, by - 0.22, bx + 0.25, by);
      ctx.closePath();
      paint(ctx, MAT.oakLight, { dots: MAT.brassDark, density: 0.45, lw: 0.025 });
      if (Q.detail) {
        ctx.fillStyle = MAT.brassDark;
        for (let i = 0; i < 10; i++) {
          const [cx, cy] = P(px - 0.28 + hash(i, 12) * 0.56, py - 0.05 + hash(i, 13) * 0.3, TZ + 0.012);
          ctx.fillRect(cx - 0.025, cy - 0.02, 0.05, 0.04);
        }
      }
      // The very small napkin, folded into a mitre.
      const [nx, ny] = P(px - 0.5, py + 0.08, TZ);
      ctx.beginPath();
      ctx.moveTo(nx - 0.09, ny); ctx.lineTo(nx - 0.09, ny - 0.13); ctx.lineTo(nx, ny - 0.24); ctx.lineTo(nx + 0.09, ny - 0.13); ctx.lineTo(nx + 0.09, ny);
      ctx.closePath();
      paint(ctx, C.white, { lw: 0.022 });
      ctx.beginPath(); ctx.moveTo(nx, ny - 0.24); ctx.lineTo(nx, ny);
      ctx.strokeStyle = C.greyLight; ctx.lineWidth = 0.015; ctx.stroke();
    },
  });
  // Its card, a cut above the rest: gilt-edged.
  add(GOOSE_PLACE[0], 8.3, (ctx) => {
    const [x, y, w] = [GOOSE_PLACE[0] - 0.1, 8.3, 0.66];
    face(ctx, [[x - w / 2 - 0.03, y, TZ], [x + w / 2 + 0.03, y, TZ], [x + w / 2 + 0.03, y, TZ + 0.27], [x - w / 2 - 0.03, y, TZ + 0.27]], MAT.brass, { lw: 0.025 });
    face(ctx, [[x - w / 2, y, TZ + 0.03], [x + w / 2, y, TZ + 0.03], [x + w / 2, y, TZ + 0.24], [x - w / 2, y, TZ + 0.24]], INK.bone, { stroke: false });
    if (Q.detail) cardText(ctx, x, y, TZ + 0.135, 'G. GOOSE', 0.11, INK.oxblood);
  });
  // His Lordship's place, at the head: a card, and his glass, untouched.
  add(12.55, 7.7, (ctx) => {
    // A birthday card behind his plate (facing his empty chair, and us).
    face(ctx, [[12.1, 7.48, TZ], [12.1, 7.92, TZ], [12.1, 7.92, TZ + 0.36], [12.1, 7.48, TZ + 0.36]], INK.bone, { lw: 0.02 });
    if (Q.detail) {
      ctx.save();
      ctx.transform(1, -0.5, 0, ZK, 12.1 - 7.7, (12.1 + 7.7) / 2 - (TZ + 0.18) * ZK);
      ctx.scale(1 / 40, 1 / 40);
      ctx.font = '11px "Bagel Fat One", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = INK.oxblood;
      ctx.fillText('80!', 0, 0);
      ctx.restore();
    }
    disc(ctx, 12.55, 7.7, TZ + 0.005, 0.34, MAT.brass, { lw: 0.03 });
    disc(ctx, 12.55, 7.7, TZ + 0.008, 0.26, C.white, { lw: 0.02 });
  });
  add(12.35, 7.25, (ctx) => wineGlass(ctx, 12.35, 7.25, 0.9));

  // Down the middle: two candelabras, a pineapple, a stuffed pheasant, and
  // the stand where the trifle was (it's in the library, with the Lord in it),
  // with its 80 candles still burning.
  CANDELABRA.forEach(([x, y], i) => add(x, y, (ctx, t) => {
    cylinder(ctx, x, y, TZ, 0.17, 0.05, SILVER);
    const [bx, by] = P(x, y, TZ);
    ctx.fillStyle = SILVER;
    ctx.fillRect(bx - 0.04, by - 0.85, 0.08, 0.82);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.strokeRect(bx - 0.04, by - 0.85, 0.08, 0.82);
    face(ctx, [[x - 0.4, y, TZ + 0.78], [x + 0.4, y, TZ + 0.78]], null, { stroke: C.ink, lw: 0.07 });
    face(ctx, [[x - 0.4, y, TZ + 0.78], [x + 0.4, y, TZ + 0.78]], null, { stroke: SILVER, lw: 0.04 });
    for (const dx of [-0.4, 0, 0.4]) {
      const z = TZ + 0.8 + (dx ? 0 : 0.12);
      disc(ctx, x + dx, y, z, 0.07, SILVER, { lw: 0.02 });
      wax(ctx, x + dx, y, z, burn(t, i, dx ? 0.5 : 0.56));
    }
  }));
  add(GRAVY[0], GRAVY[1], (ctx) => gravyBoat(ctx, GRAVY[0], GRAVY[1]));
  // The soup's flight, across the cloth from the Brigadier's bowl.
  add(4.95, 6.1, (ctx) => {
    for (const [y, s] of [[8.25, 1.3], [7.05, 1.1], [6.25, 1.0]]) splat(ctx, 4.95, y, TZ + 0.006, s, -0.45);
  });
  add(6.8, 7.72, (ctx) => { // the pineapple, on a silver stand
    cylinder(ctx, 6.8, 7.72, TZ, 0.2, 0.28, SILVER);
    const [px, py] = P(6.8, 7.72, TZ + 0.3);
    ctx.beginPath(); ctx.ellipse(px, py - 0.22, 0.17, 0.24, 0, 0, Math.PI * 2);
    paint(ctx, MAT.brass, { dots: MAT.brassDark, density: 0.4, lw: 0.025 });
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(px - 0.05, py - 0.42); ctx.lineTo(px + (i - 2) * 0.1, py - 0.72 - (i % 2) * 0.1); ctx.lineTo(px + 0.05, py - 0.42);
      paint(ctx, MAT.leaf, { lw: 0.015 });
    }
  });
  add(9.25, 7.7, (ctx) => { // a stuffed pheasant, the Lord's own work
    const [px, py] = P(9.25, 7.7, TZ);
    ctx.fillStyle = MAT.mahoganyDark; // its little plinth
    ctx.fillRect(px - 0.25, py - 0.1, 0.5, 0.1);
    ctx.beginPath(); // tail
    ctx.moveTo(px + 0.05, py - 0.28); ctx.lineTo(px + 0.72, py - 0.62); ctx.lineTo(px + 0.7, py - 0.54); ctx.lineTo(px + 0.1, py - 0.18);
    paint(ctx, MAT.brassDark, { lw: 0.02 });
    ctx.beginPath(); // body
    ctx.ellipse(px, py - 0.28, 0.26, 0.17, -0.2, 0, Math.PI * 2);
    paint(ctx, MAT.fur, { dots: FUR_DARK, density: 0.35, lw: 0.025 });
    ctx.beginPath(); // neck and head
    ctx.ellipse(px - 0.22, py - 0.5, 0.08, 0.13, 0.3, 0, Math.PI * 2);
    paint(ctx, INK.verdigris, { lw: 0.02 });
    ctx.fillStyle = INK.oxblood;
    ctx.beginPath(); ctx.ellipse(px - 0.25, py - 0.56, 0.04, 0.05, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.ink;
    ctx.beginPath(); ctx.moveTo(px - 0.3, py - 0.55); ctx.lineTo(px - 0.38, py - 0.52); ctx.lineTo(px - 0.3, py - 0.5); ctx.fill();
  });
  add(STAND[0], STAND[1], (ctx, t) => { // the empty trifle stand
    const [x, y] = STAND;
    cylinder(ctx, x, y, TZ, 0.18, 0.04, GLASS);
    const [sx, sy] = P(x, y, TZ);
    ctx.fillStyle = GLASS;
    ctx.fillRect(sx - 0.035, sy - 0.4, 0.07, 0.38);
    disc(ctx, x, y, TZ + 0.38, 0.46, alpha(INK.bone, 0.75), { lw: 0.03 });
    disc(ctx, x + 0.08, y - 0.05, TZ + 0.39, 0.22, MAT.custard, { stroke: false }); // what's left
    disc(ctx, x - 0.18, y + 0.1, TZ + 0.39, 0.09, MAT.trifle, { stroke: false });
    // The 8 and the 0, still burning.
    const h = burn(t, 2, 0.34, 0.12);
    const z = TZ + 0.4;
    for (const [dx, ch] of [[-0.12, '8'], [0.16, '0']]) {
      const [cx, cy] = P(x + dx, y, z);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, h / 0.34);
      ctx.font = '0.42px "Bagel Fat One", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.lineWidth = 0.05;
      ctx.strokeStyle = C.ink;
      ctx.strokeText(ch, 0, 0.04);
      ctx.fillStyle = INK.candleGold;
      ctx.fillText(ch, 0, 0.04);
      ctx.restore();
    }
    if (Q.detail) {
      face(ctx, [[x - 0.3, y + 0.52, TZ], [x + 0.3, y + 0.52, TZ], [x + 0.3, y + 0.52, TZ + 0.18], [x - 0.3, y + 0.52, TZ + 0.18]], INK.bone, { lw: 0.02 });
      cardText(ctx, x, y + 0.52, TZ + 0.09, 'TRIFLE II: SOON', 0.065);
    }
  });

  // The two halves: legs, cloth, runner, then everything on it, back to front,
  // then the steam off the soup.
  const bowls = [
    [TOOTH[0], TOOTH[1]], [7, 6.62], [9.5, 6.62], [4.5, 8.78], [7, 8.78],
  ];
  const half = (x0, x1, last) => {
    const mine = items.filter((it) => (it.x < SPLIT) === !last).sort((a, b) => a.x + a.y - (b.x + b.y));
    const hot = bowls.filter(([x]) => (x < SPLIT) === !last);
    return (ctx, t) => {
      for (const lx of [x0 + 0.35, x1 - 0.35]) box(ctx, lx - 0.07, TY1 - 0.42, 0, 0.14, 0.14, 0.8, WOOD, { flat: true });
      if (last) box(ctx, TX1 - 0.42, TY0 + 0.28, 0, 0.14, 0.14, 0.8, WOOD, { flat: true });
      // The cloth: the top (no outline where the halves meet), the scalloped
      // front, and the end.
      const top = [[x0, TY0, TZ], [x1, TY0, TZ], [x1, TY1, TZ], [x0, TY1, TZ]];
      face(ctx, top, CLOTH, { stroke: false, dots: shade(CLOTH, 0.12), density: 0.08 });
      const edges = last ? [[top[0], top[1]], [top[1], top[2]]] : [[top[3], top[0]], [top[0], top[1]]];
      for (const [a, b] of edges) face(ctx, [a, b], null, { lw: 0.04 });
      const hem = [];
      for (let x = x0; x <= x1 + 1e-6; x += 0.25) hem.push([x, TY1, 0.72 + (Math.round((x - TX0) / 0.25) % 2 ? 0.06 : 0)]);
      face(ctx, [[x0, TY1, TZ], [x1, TY1, TZ], ...hem.reverse()], CLOTH_SIDE, { dots: shade(CLOTH, 0.4), density: 0.15, lw: 0.04 });
      if (Q.detail) {
        for (let x = x0 + 0.5; x < x1; x += 1) face(ctx, [[x, TY1, TZ - 0.05], [x, TY1, 0.8]], null, { stroke: shade(CLOTH, 0.25), lw: 0.02 });
      }
      if (last) face(ctx, [[TX1, TY0, TZ], [TX1, TY1, TZ], [TX1, TY1, 0.74], [TX1, TY0, 0.74]], shade(CLOTH, 0.05), { lw: 0.04 });
      // The runner.
      face(ctx, [[x0, 7.3, TZ + 0.003], [x1, 7.3, TZ + 0.003], [x1, 8.14, TZ + 0.003], [x0, 8.14, TZ + 0.003]], MAT.velvetDark, { stroke: false, dots: shade(MAT.velvetDark, 0.4), density: 0.2 });
      if (Q.detail) for (const ry of [7.36, 8.08]) face(ctx, [[x0, ry, TZ + 0.004], [x1, ry, TZ + 0.004]], null, { stroke: MAT.brass, lw: 0.03 });
      for (const it of mine) it.draw(ctx, t);
      const k = steamK(t);
      hot.forEach(([x, y], i) => steam(ctx, t, x, y, TZ + 0.12, k, 20 + i * 7 + (last ? 50 : 0)));
    };
  };
  R.thing(SPLIT, TY0, half(TX0, SPLIT, false), { depth: 13.4, anim: true });
  R.thing(TX1, TY0, half(SPLIT, TX1, true), { depth: 18.4, anim: true });

  // The candles' light (the flames go with it, so they burn through the dark).
  CANDELABRA.forEach(([x, y], i) => {
    R.light({
      at: [x, y, TZ + 1.4], r: 2.2, color: INK.candleGold, k: house.flicker(21 + i),
      draw: (ctx, t, k) => {
        for (const dx of [-0.4, 0, 0.4]) flame(ctx, x + dx, y, TZ + 0.8 + (dx ? 0 : 0.12) + burn(t, i, dx ? 0.5 : 0.56), k);
      },
    });
  });
  R.light({
    at: [STAND[0], STAND[1], TZ + 0.9], r: 1.6, color: INK.candleGold, k: house.flicker(23),
    draw: (ctx, t, k) => {
      const z = TZ + 0.4 + burn(t, 2, 0.34, 0.12) * 1.02;
      flame(ctx, STAND[0] - 0.12, STAND[1], z, k, 0.8);
      flame(ctx, STAND[0] + 0.16, STAND[1], z, k, 0.8);
    },
  });
}

// ---------- The chairs ----------
function chairs(R, clock) {
  const diners = [
    { id: 'philippa', x: 7, y: BACK, a: Math.PI / 2 },
    { id: 'rupert', x: 9.5, y: BACK, a: Math.PI / 2, spin: true },
    { id: 'brigadier', x: 4.5, y: FRONT, a: -Math.PI / 2 },
    { id: 'crane', x: 7, y: FRONT, a: -Math.PI / 2 },
  ];
  const empty = [
    { x: 4.5, y: BACK, a: Math.PI / 2 }, // Mr. Todd's
    { x: 12, y: BACK, a: Math.PI / 2 }, // Mr. Bear's
    { x: 9.5, y: FRONT, a: -Math.PI / 2 }, // the Inspector's
    { x: 12, y: FRONT, a: -Math.PI / 2, cushions: true }, // the goose's, with cushions
  ];
  // The front row's backs are between us and whoever sits there, so they're
  // drawn after them; the seats, before.
  for (const e of empty) {
    if (e.y === BACK) R.thing(e.x, e.y, (ctx) => drawChair(ctx, e.x, e.y, e.a), { depth: e.x + e.y - 0.02 });
    else {
      R.thing(e.x, e.y, (ctx) => {
        drawChair(ctx, e.x, e.y, e.a, CHAIR_BASE);
        if (e.cushions) {
          box(ctx, e.x - 0.3, e.y - 0.32, SEAT_Z, 0.6, 0.6, 0.14, MAT.velvet, { top: tint(MAT.velvet, 0.12), lw: 0.03 });
          box(ctx, e.x - 0.25, e.y - 0.3, SEAT_Z + 0.14, 0.5, 0.5, 0.14, INK.verdigris, { lw: 0.03 });
        }
      }, { depth: e.x + e.y - 0.02 });
      R.thing(e.x, e.y, (ctx) => drawChair(ctx, e.x, e.y, e.a, CHAIR_BACK), { depth: e.x + e.y + 0.02 });
    }
  }
  for (const d of diners) {
    const c = clock[d.id];
    const pos = (t) => {
      if (c.seated(t)) return { x: d.x, y: d.y, a: d.a };
      const k = Math.min(easeOut(clamp(c.since(t) / 0.5)), clamp(c.till(t) / 0.6));
      const out = d.y === BACK ? -1 : 1;
      if (d.spin) {
        // Rupert bolts, and his chair spins on, and on.
        const turn = (Math.PI * 4 + 0.7) * (1 - Math.exp(-c.since(t) / 2.6));
        return { x: d.x + 0.25 * k, y: d.y + out * 0.95 * k, a: d.a + turn * k };
      }
      return { x: d.x, y: d.y + out * 0.62 * k, a: d.a + 0.24 * k * (hash(d.x * 7, 3) - 0.5) };
    };
    if (d.spin) {
      R.mover(pos, (ctx, t, p) => {
        drawChair(ctx, p.x, p.y, p.a);
        if (c.seated(t) || !Q.detail) return;
        const v = ((Math.PI * 4 + 0.7) / 2.6) * Math.exp(-c.since(t) / 2.6); // how fast it's turning
        if (v < 0.25) return;
        const [cx, cy] = P(p.x, p.y, 1.05);
        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = alpha(C.ink, Math.min(0.7, v / 4));
        ctx.lineWidth = 0.04;
        for (const off of [0, Math.PI]) {
          ctx.beginPath();
          ctx.ellipse(cx, cy, 0.85, 0.42, 0, p.a + off, p.a + off + Math.min(1.8, v * 0.4));
          ctx.stroke();
        }
        ctx.restore();
      }, { bias: -0.02 });
    } else if (d.y === BACK) R.mover(pos, (ctx, t, p) => drawChair(ctx, p.x, p.y, p.a), { bias: -0.02 });
    else {
      R.mover(pos, (ctx, t, p) => drawChair(ctx, p.x, p.y, p.a, CHAIR_BASE), { bias: -0.02 });
      R.mover(pos, (ctx, t, p) => drawChair(ctx, p.x, p.y, p.a, CHAIR_BACK), { bias: 0.02 });
    }
  }
}

// ---------- Napkins: dropped as each diner gets up ----------
function napkins(R, clock) {
  const spots = [
    ['philippa', 7, BACK, 7.55, 4.35], ['rupert', 9.5, BACK, 10.3, 4.1],
    ['brigadier', 4.5, FRONT, 3.8, 11.25], ['crane', 7, FRONT, 7.6, 11.1],
  ];
  for (const [id, sx, sy, nx, ny] of spots) {
    const c = clock[id];
    R.mover((t) => {
      if (c.seated(t)) return { x: nx, y: ny, hide: true };
      const k = clamp(c.since(t) / 0.5);
      return { x: lerp(sx, nx, k), y: lerp(sy, ny, k), z: 0.85 * (1 - k * k), k };
    }, (ctx, t, p) => {
      if (p.hide) return;
      if (p.k < 1) {
        const [X, Y] = P(p.x, p.y, p.z);
        ctx.save();
        ctx.translate(X, Y);
        ctx.rotate(Math.sin(t * 14) * 0.4);
        ctx.beginPath();
        ctx.moveTo(-0.2, 0); ctx.lineTo(0.2, -0.08); ctx.lineTo(0.16, 0.12); ctx.lineTo(-0.16, 0.14);
        ctx.closePath();
        paint(ctx, C.white, { lw: 0.025 });
        ctx.restore();
        return;
      }
      const [X, Y] = P(p.x, p.y, 0.02);
      ctx.beginPath();
      ctx.moveTo(X - 0.32, Y); ctx.lineTo(X - 0.05, Y - 0.13); ctx.lineTo(X + 0.3, Y - 0.04);
      ctx.lineTo(X + 0.2, Y + 0.1); ctx.lineTo(X - 0.1, Y + 0.14);
      ctx.closePath();
      paint(ctx, C.white, { lw: 0.025 });
      if (Q.detail) {
        ctx.beginPath(); ctx.moveTo(X - 0.1, Y - 0.05); ctx.lineTo(X + 0.12, Y + 0.05);
        ctx.strokeStyle = C.greyLight; ctx.lineWidth = 0.02; ctx.stroke();
      }
    }, { bias: 0.1 });
  }
}

// ---------- Mr. Todd, the stuffed fox, the one guest who listens ----------
function fox(R) {
  const x = 4.5, y = BACK, z = SEAT_Z;
  R.thing(x, y, (ctx, t) => {
    const s = mod(t);
    // Polite little nods, from "In 1974" until dinner comes round again.
    const nod = s > 28 && s < 164 ? Math.pow(Math.max(0, Math.sin(t * 2.4)), 3) * 0.16 : 0;
    const f = storm.flash(t);
    const [X0, Y0] = P(x, y, z);
    ctx.save();
    ctx.translate(X0, Y0);
    ctx.scale(-1.3, 1.3); // facing left, across the table at the Brigadier
    ctx.lineWidth = 0.03;
    // Tail, curled round the seat.
    ctx.beginPath();
    ctx.moveTo(-0.15, -0.1);
    ctx.quadraticCurveTo(-0.62, -0.05, -0.5, 0.18);
    ctx.quadraticCurveTo(-0.3, 0.12, -0.05, 0.05);
    paint(ctx, FUR, { dots: FUR_DARK, density: 0.3, lw: 0.03 });
    ctx.beginPath(); ctx.ellipse(-0.52, 0.14, 0.08, 0.06, 0.4, 0, Math.PI * 2); ctx.fillStyle = INK.bone; ctx.fill();
    // Body, sitting up.
    ctx.beginPath();
    ctx.moveTo(-0.22, 0);
    ctx.quadraticCurveTo(-0.3, -0.45, -0.08, -0.72);
    ctx.lineTo(0.12, -0.72);
    ctx.quadraticCurveTo(0.26, -0.4, 0.22, 0);
    ctx.closePath();
    paint(ctx, FUR, { dots: FUR_DARK, density: 0.25, lw: 0.03 });
    // Chest, and a napkin tucked in.
    ctx.beginPath();
    ctx.ellipse(0.06, -0.38, 0.1, 0.24, 0, 0, Math.PI * 2);
    ctx.fillStyle = INK.bone; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-0.08, -0.6); ctx.lineTo(0.2, -0.6); ctx.lineTo(0.06, -0.32);
    ctx.closePath();
    paint(ctx, C.white, { lw: 0.02 });
    // Front legs.
    ctx.fillStyle = FUR_DARK;
    ctx.fillRect(0.02, -0.25, 0.06, 0.25);
    ctx.fillRect(0.12, -0.25, 0.06, 0.25);
    // Head, nodding.
    ctx.translate(0.04, -0.74);
    ctx.rotate(nod);
    ctx.beginPath(); // ears
    ctx.moveTo(-0.14, -0.1); ctx.lineTo(-0.1, -0.36); ctx.lineTo(0.0, -0.14);
    ctx.moveTo(0.02, -0.14); ctx.lineTo(0.1, -0.38); ctx.lineTo(0.15, -0.1);
    paint(ctx, FUR, { lw: 0.025 });
    ctx.beginPath(); // head and snout
    ctx.moveTo(-0.16, -0.05);
    ctx.quadraticCurveTo(-0.15, -0.2, 0.04, -0.2);
    ctx.quadraticCurveTo(0.16, -0.18, 0.2, -0.08);
    ctx.lineTo(0.42, 0.0);
    ctx.quadraticCurveTo(0.3, 0.08, 0.1, 0.08);
    ctx.quadraticCurveTo(-0.14, 0.08, -0.16, -0.05);
    paint(ctx, FUR, { lw: 0.03 });
    ctx.beginPath(); // white cheek
    ctx.moveTo(0.1, 0.08); ctx.quadraticCurveTo(0.26, 0.05, 0.4, 0.01); ctx.quadraticCurveTo(0.25, -0.02, 0.1, 0.0);
    ctx.fillStyle = INK.bone; ctx.fill();
    ctx.beginPath(); ctx.arc(0.42, -0.005, 0.03, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill(); // nose
    // A glass eye, which catches the lightning.
    ctx.beginPath(); ctx.arc(0.12, -0.08, 0.035, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
    ctx.beginPath(); ctx.arc(0.13, -0.09, f > 0.2 ? 0.03 : 0.012, 0, Math.PI * 2); ctx.fillStyle = C.white; ctx.fill();
    // Party hat.
    ctx.beginPath();
    ctx.moveTo(-0.12, -0.17); ctx.lineTo(-0.02, -0.55); ctx.lineTo(0.1, -0.18);
    ctx.closePath();
    paint(ctx, INK.candleGold, { dots: INK.oxblood, density: 0.4, lw: 0.025 });
    ctx.restore();
  }, { depth: x + y, anim: true });
}

// ---------- The Lord's chair, and the goose in it ----------
function throne(R, newBalloon) {
  const [x, y] = HEAD;
  const BALLOONS = [
    { dx: 0.35, dy: -0.5, z: 3.45, col: INK.oxblood, ph: 0 },
    { dx: 0.2, dy: 0.45, z: 3.85, col: INK.candleGold, ph: 2, text: '80' },
    { dx: 0.6, dy: 0.1, z: 3.1, col: INK.verdigris, ph: 4 },
  ];
  R.thing(x, y, (ctx, t) => {
    const solved = isSolved();
    const since = verdict.solved > 0 ? t - verdict.solved : 99;
    const arriving = solved && since >= 0 && since < 1.5;
    // Normally the chair faces the table; solved, it has spun round to face
    // us (square on, so its arms are either side of whoever's in it).
    const TURNED = Math.PI / 4;
    let a = Math.PI;
    if (solved) a = arriving ? lerp(Math.PI * 5, TURNED, easeOut(clamp(since / 1.1))) : TURNED;
    const c = Math.cos(a), s = Math.sin(a);
    // The goose, sitting where the Lord sat (between the arms). While the
    // chair spins it only shows when the seat is turned our way.
    const seatX = x + 0.04 * c, seatY = y + 0.04 * s;
    const facing = Math.cos(a - TURNED) > 0.3;
    const sit = solved && (!arriving || facing) ? (g) => monocleGoose(g, seatX, seatY, THRONE_Z, t, { pose: 'sit', dir: 'l', scale: 1.45 }) : null;
    furniture(ctx, THRONE, x, y, a, thronePaint, sit, seatX + seatY + 0.2);
    // The crest over the back, with finials on the posts.
    const cx = x - 0.41 * c, cy = y - 0.41 * s;
    const arch = [];
    for (let i = 0; i <= 12; i++) {
      const th = (i / 12) * Math.PI;
      const v = Math.cos(th) * 0.42;
      arch.push([cx - v * s, cy + v * c, THRONE_TOP + Math.sin(th) * 0.42 * (1 - 0.35 * Math.abs(Math.cos(th)))]);
    }
    face(ctx, arch, MAT.brass, { dots: MAT.brassDark, density: 0.3, lw: 0.035 });
    const [kx, ky] = P(cx, cy, THRONE_TOP + 0.5);
    ctx.beginPath(); ctx.arc(kx, ky, 0.09, 0, Math.PI * 2); paint(ctx, MAT.brass, { lw: 0.02 });
    for (const sg of [-1, 1]) {
      const [bx, by] = P(x - 0.4 * c - sg * 0.4 * s, y - 0.4 * s + sg * 0.4 * c, THRONE_TOP + 0.03);
      ctx.beginPath(); ctx.arc(bx, by - 0.06, 0.08, 0, Math.PI * 2); paint(ctx, MAT.brass, { lw: 0.02 });
    }
    // Balloons, tied to the back.
    for (const b of BALLOONS) {
      const bz = b.z + Math.sin(t * 1.3 + b.ph) * 0.08;
      const bx = x + b.dx + Math.sin(t * 0.9 + b.ph) * 0.05, by = y + b.dy;
      const [ax, ay] = P(x - 0.4 * c, y - 0.4 * s, THRONE_TOP);
      const [px, py] = P(bx, by, bz);
      // The 80 goes pop at midnight, and hangs there limp until Jenkins
      // brings a new one for the second trifle.
      const popped = b.text && mod(t - MIDNIGHT) < mod(newBalloon - MIDNIGHT);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      if (popped) {
        const [lx, ly] = P(x - 0.4 * c + 0.1, y - 0.4 * s + 0.1, THRONE_TOP - 0.9);
        ctx.quadraticCurveTo(ax + 0.1, (ay + ly) / 2, lx, ly);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(lx, ly + 0.04, 0.07, 0.05, 0.5, 0, Math.PI * 2); ctx.fillStyle = b.col; ctx.fill(); // what's left of it
        continue;
      }
      ctx.quadraticCurveTo((ax + px) / 2 + 0.15, (ay + py) / 2, px, py + 0.34);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02; ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(px, py, 0.3, 0.36, 0, 0, Math.PI * 2);
      paint(ctx, b.col, { lw: 0.03 });
      ctx.beginPath(); ctx.moveTo(px - 0.05, py + 0.4); ctx.lineTo(px, py + 0.34); ctx.lineTo(px + 0.05, py + 0.4); ctx.fillStyle = b.col; ctx.fill();
      ctx.beginPath(); ctx.ellipse(px - 0.1, py - 0.14, 0.05, 0.09, 0.4, 0, Math.PI * 2); ctx.fillStyle = alpha(C.white, 0.6); ctx.fill();
      if (b.text) {
        ctx.save();
        ctx.translate(px, py + 0.02);
        ctx.font = '0.3px "Bagel Fat One", sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = INK.oxblood;
        ctx.fillText(b.text, 0, 0);
        ctx.restore();
      }
    }
  }, { depth: x + y, anim: true });

  // Solved: a warm light on the chair (it shows even with the lights out)...
  R.light({ at: [x, y, 1.6], r: 2.6, color: INK.candleGold, k: () => (isSolved() ? 0.75 : 0) });
  // ...and his ghost appears behind it in the lightning, furious.
  R.thing(x, y - 0.8, (ctx, t) => {
    if (!isSolved()) return;
    lordGhost(ctx, x + 0.2, y - 1.05, 0, t, pastK(t), 'l');
  }, { anim: true });

  // The bang, in the dark, over everything.
  const pop = BALLOONS.find((b) => b.text);
  R.air((ctx, t) => {
    const q = mod(t - MIDNIGHT) / 0.9;
    if (q >= 1) return;
    const [px, py] = P(x + pop.dx, y + pop.dy, pop.z);
    ctx.save();
    ctx.globalAlpha = 1 - q;
    ctx.fillStyle = pop.col;
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * Math.PI * 2;
      ctx.fillRect(px + Math.cos(ang) * q * 0.9 - 0.05, py + Math.sin(ang) * q * 0.6 + q * q * 0.8 - 0.03, 0.1, 0.06);
    }
    ctx.translate(px, py - 0.5 - q * 0.3);
    ctx.font = '0.55px "Bagel Fat One", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 0.08; ctx.strokeStyle = C.ink; ctx.strokeText('POP!', 0, 0);
    ctx.fillStyle = INK.candleGold; ctx.fillText('POP!', 0, 0);
    ctx.restore();
  });

  // The arrival: a spotlight, and a burst of feathers.
  R.air((ctx, t) => {
    if (!isSolved() || !(verdict.solved > 0)) return;
    const since = t - verdict.solved;
    if (since < 0 || since > 1.5) return;
    const k = since < 0.2 ? since / 0.2 : since > 1.1 ? 1 - (since - 1.1) / 0.4 : 1;
    const [tx, ty] = P(x, y, 6.5), [fx, fy] = P(x, y, 0);
    ctx.beginPath();
    ctx.moveTo(tx - 0.25, ty); ctx.lineTo(tx + 0.25, ty); ctx.lineTo(fx + 1.1, fy); ctx.lineTo(fx - 1.1, fy);
    ctx.closePath();
    ctx.fillStyle = alpha(INK.bone, 0.28 * k);
    ctx.fill();
    ctx.beginPath(); ctx.ellipse(fx, fy, 1.1, 0.5, 0, 0, Math.PI * 2); ctx.fillStyle = alpha(INK.bone, 0.3 * k); ctx.fill();
    for (let i = 0; i < 16; i++) {
      const ang = hash(i, 31) * Math.PI * 2, sp = 0.8 + hash(i, 32) * 1.4;
      const q = since / 1.5;
      const [px, py] = P(x + Math.cos(ang) * sp * q, y + Math.sin(ang) * sp * q, 1.6 + Math.sin(q * Math.PI) * 1.2 - q * 0.8);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(t * 5 + i);
      ctx.beginPath(); ctx.ellipse(0, 0, 0.13, 0.05, 0, 0, Math.PI * 2);
      ctx.fillStyle = alpha(C.white, 1 - q * 0.6); ctx.fill();
      ctx.strokeStyle = alpha(C.ink, 0.6 * (1 - q)); ctx.lineWidth = 0.015; ctx.stroke();
      ctx.restore();
    }
  });
}

// ---------- The corners: a peacock, a palm, the dinner gong, the leak ----------
function corners(R) {
  // A stuffed peacock in the back corner, tail up, every eye on the table.
  R.thing(1.1, 1.3, (ctx, t) => {
    const f = storm.flash(t);
    box(ctx, 0.75, 0.95, 0, 0.7, 0.7, 0.55, MAT.mahoganyDark);
    const [bx, by] = P(1.1, 1.3, 0.55);
    for (let i = 0; i < 11; i++) {
      const a = Math.PI + 0.25 + (i / 10) * (Math.PI - 0.5);
      const ex = bx + Math.cos(a) * 1.25, ey = by - 0.3 + Math.sin(a) * 1.3;
      ctx.beginPath();
      ctx.moveTo(bx, by - 0.3);
      ctx.lineTo(ex + Math.sin(a) * 0.14, ey - Math.cos(a) * 0.14);
      ctx.lineTo(ex - Math.sin(a) * 0.14, ey + Math.cos(a) * 0.14);
      ctx.closePath();
      paint(ctx, i % 2 ? INK.verdigris : shade(INK.verdigris, 0.15), { lw: 0.02 });
      ctx.beginPath(); ctx.arc(ex, ey, 0.11, 0, Math.PI * 2); ctx.fillStyle = MAT.brass; ctx.fill();
      ctx.beginPath(); ctx.arc(ex, ey, 0.055, 0, Math.PI * 2); ctx.fillStyle = f > 0.2 ? C.white : INK.stormNavy; ctx.fill();
    }
    ctx.beginPath(); // body
    ctx.ellipse(bx + 0.05, by - 0.3, 0.22, 0.3, 0.2, 0, Math.PI * 2);
    paint(ctx, mix(INK.stormNavy, INK.verdigris, 0.45), { lw: 0.03 });
    ctx.beginPath(); // neck
    ctx.moveTo(bx + 0.1, by - 0.5); ctx.quadraticCurveTo(bx + 0.28, by - 0.8, bx + 0.2, by - 1.0);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.16; ctx.lineCap = 'round'; ctx.stroke();
    ctx.strokeStyle = mix(INK.stormNavy, INK.verdigris, 0.6); ctx.lineWidth = 0.1; ctx.stroke();
    ctx.beginPath(); ctx.arc(bx + 0.22, by - 1.02, 0.09, 0, Math.PI * 2); paint(ctx, mix(INK.stormNavy, INK.verdigris, 0.6), { lw: 0.02 });
    ctx.beginPath(); ctx.moveTo(bx + 0.3, by - 1.04); ctx.lineTo(bx + 0.42, by - 1.0); ctx.lineTo(bx + 0.3, by - 0.98); ctx.fillStyle = MAT.custard; ctx.fill();
    ctx.fillStyle = C.ink; // its crest
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.015;
    for (const dx of [-0.05, 0.02, 0.09]) {
      ctx.beginPath(); ctx.moveTo(bx + 0.2, by - 1.1); ctx.lineTo(bx + 0.2 + dx, by - 1.28); ctx.stroke();
      ctx.beginPath(); ctx.arc(bx + 0.2 + dx, by - 1.3, 0.025, 0, Math.PI * 2); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(bx + 0.25, by - 1.04, 0.022, 0, Math.PI * 2); ctx.fillStyle = f > 0.2 ? C.white : C.ink; ctx.fill();
  }, { anim: true });

  // A palm by the far window.
  R.thing(15.3, 1.0, (ctx, t) => {
    const [px, py] = P(15.3, 1.0, 0);
    ctx.save();
    ctx.translate(px, py);
    const sway = Math.sin(t * 1.1) * 0.04;
    ctx.beginPath();
    ctx.moveTo(-0.3, -0.62); ctx.lineTo(0.3, -0.62); ctx.lineTo(0.22, 0); ctx.lineTo(-0.22, 0);
    ctx.closePath();
    paint(ctx, MAT.brass, { dots: MAT.brassDark, density: 0.3 });
    ctx.translate(0, -0.6);
    ctx.rotate(sway);
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.42;
      ctx.save();
      ctx.rotate(a + Math.PI / 2);
      ctx.beginPath();
      ctx.ellipse(0, -0.75, 0.13, 0.78, 0, 0, Math.PI * 2);
      paint(ctx, i % 2 ? MAT.leaf : MAT.leafDark, { dots: shade(MAT.leaf, 0.45), density: 0.15, lw: 0.03 });
      ctx.restore();
    }
    ctx.restore();
  }, { anim: true });

  // The dinner gong. At 146 seconds it sounds by itself, and everyone drifts
  // back for the second trifle.
  const gx = 15.2, gy = 14.5;
  R.thing(gx, gy + 0.6, (ctx, t) => {
    const s = mod(t);
    const hit = s > 146 && s < 149 ? s - 146 : -1;
    for (const py of [gy - 0.55, gy + 0.55]) box(ctx, gx - 0.06, py - 0.06, 0, 0.12, 0.12, 2.05, WOOD, { flat: true });
    box(ctx, gx - 0.07, gy - 0.62, 2.0, 0.14, 1.24, 0.12, WOOD);
    const wob = hit >= 0 ? Math.sin(hit * 30) * 0.05 * (1 - hit / 3) : 0;
    const pts = [];
    for (let i = 0; i < 20; i++) {
      const th = (i / 20) * Math.PI * 2;
      pts.push([gx + wob, gy + Math.cos(th) * 0.45, 1.3 + Math.sin(th) * 0.45]);
    }
    face(ctx, [[gx, gy - 0.2, 2.0], [gx, gy - 0.2, 1.72]], null, { lw: 0.02 });
    face(ctx, [[gx, gy + 0.2, 2.0], [gx, gy + 0.2, 1.72]], null, { lw: 0.02 });
    face(ctx, pts, MAT.brass, { dots: MAT.brassDark, density: 0.3, lw: 0.035 });
    const [cx, cy] = P(gx + wob, gy, 1.3);
    ctx.beginPath(); ctx.ellipse(cx, cy, 0.14, 0.18, -0.46, 0, Math.PI * 2); paint(ctx, MAT.brassDark, { lw: 0.02 });
    // The beater, on a hook, swinging in to strike.
    const sw = hit >= 0 && hit < 0.6 ? Math.sin((hit / 0.6) * Math.PI) * 0.6 : 0;
    const [hx, hy] = P(gx + 0.1, gy + 0.62, 1.9);
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(0.15 + sw);
    ctx.strokeStyle = WOOD; ctx.lineWidth = 0.05;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 0.7); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0.75, 0.09, 0, Math.PI * 2); paint(ctx, INK.bone, { lw: 0.02 });
    ctx.restore();
  }, { anim: true });
  R.air((ctx, t) => {
    const s = mod(t);
    if (s < 146.2 || s > 149 || !Q.detail) return;
    const q = (s - 146.2) / 2.8;
    const [bx, by] = P(gx, gy, 2.6 + q * 1.2);
    ctx.save();
    ctx.globalAlpha = 1 - q;
    ctx.translate(bx, by);
    ctx.font = '0.8px "Bagel Fat One", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 0.1; ctx.strokeStyle = C.ink; ctx.strokeText('BONG', 0, 0);
    ctx.fillStyle = INK.candleGold; ctx.fillText('BONG', 0, 0);
    ctx.restore();
  });

  // The gramophone plays through dinner and the story, runs down when the
  // lights go, and scratches to a stop at the scream (95 seconds). Jenkins
  // winds it up again for the second trifle.
  const [px, py] = [3.4, 14.1];
  const playing = (t) => { const s = mod(t); return s < 80 || s > 163; };
  R.thing(px, py, (ctx, t) => {
    const s = mod(t);
    cylinder(ctx, px, py, 0, 0.08, 0.7, WOOD, { flat: true });
    cylinder(ctx, px, py, 0.7, 0.5, 0.08, WOOD);
    box(ctx, px - 0.3, py - 0.3, 0.78, 0.6, 0.6, 0.26, MAT.mahogany);
    disc(ctx, px, py, 1.045, 0.26, C.black, { lw: 0.02 });
    const spin = playing(t) ? t * 4 : s < 82 ? 80 * 4 + (s - 80) * 2 : 0;
    const [rx, ry] = P(px + Math.cos(spin) * 0.18, py + Math.sin(spin) * 0.18, 1.05);
    const [cx, cy] = P(px, py, 1.05);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(rx, ry); ctx.strokeStyle = C.grey; ctx.lineWidth = 0.02; ctx.stroke();
    disc(ctx, px, py, 1.05, 0.06, INK.oxblood, { stroke: false });
    // the horn, a brass flower turned to the room
    const [hx, hy] = P(px + 0.18, py - 0.18, 1.1);
    const droop = s > 80 && s < 163 ? 0.12 : 0;
    ctx.beginPath();
    ctx.moveTo(hx - 0.04, hy);
    ctx.quadraticCurveTo(hx + 0.05, hy - 0.45, hx + 0.32, hy - 0.8 + droop);
    ctx.lineTo(hx + 0.62, hy - 0.62 + droop);
    ctx.quadraticCurveTo(hx + 0.2, hy - 0.4, hx + 0.08, hy);
    ctx.closePath();
    paint(ctx, MAT.brass, { dots: MAT.brassDark, density: 0.3, lw: 0.025 });
    ctx.beginPath();
    ctx.ellipse(hx + 0.47, hy - 0.71 + droop, 0.36, 0.22, -0.55, 0, Math.PI * 2);
    paint(ctx, MAT.brass, { lw: 0.03 });
    ctx.beginPath();
    ctx.ellipse(hx + 0.47, hy - 0.71 + droop, 0.24, 0.13, -0.55, 0, Math.PI * 2);
    ctx.fillStyle = MAT.brassDark;
    ctx.fill();
  }, { anim: true });
  R.air((ctx, t) => {
    if (!Q.detail) return;
    const s = mod(t);
    if (playing(t)) {
      particles(t, 3, 3, (q, r) => {
        note(ctx, px + 0.5 + q * 0.5 + r() * 0.3, py - 0.4 - q * 0.8, 2.1 + q * 1.6 + Math.sin(q * 8 + r() * 6) * 0.1, alpha(C.ink, Math.sin(q * Math.PI) * 0.8), 0.9);
      }, 5);
    } else if (s > 95 && s < 96.4) {
      const q = (s - 95) / 1.4;
      const [bx, by] = P(px, py, 2.4 + q * 0.6);
      ctx.save();
      ctx.globalAlpha = 1 - q * q;
      ctx.translate(bx, by);
      ctx.rotate(-0.12);
      ctx.font = '0.5px "Bagel Fat One", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 0.08; ctx.strokeStyle = C.ink; ctx.strokeText('SKRRITCH', 0, 0);
      ctx.fillStyle = INK.bone; ctx.fillText('SKRRITCH', 0, 0);
      ctx.restore();
    }
  });

  // The roof leaks into the champagne bucket.
  const bx = 1.3, by = 14.2;
  R.thing(bx, by, (ctx, t) => {
    cylinder(ctx, bx, by, 0, 0.3, 0.55, SILVER);
    const [nx, ny] = P(bx + 0.05, by - 0.05, 0.55);
    ctx.save();
    ctx.translate(nx, ny);
    ctx.rotate(0.35);
    ctx.fillStyle = BOTTLE;
    ctx.fillRect(-0.07, -0.4, 0.14, 0.4);
    ctx.fillStyle = MAT.brass;
    ctx.fillRect(-0.05, -0.47, 0.1, 0.1);
    ctx.restore();
    const q = mod(t, 2.3) / 2.3;
    if (q > 0.62 && Q.detail) { // ripples
      const k = (q - 0.62) / 0.38;
      disc(ctx, bx - 0.1, by + 0.08, 0.5, 0.05 + k * 0.14, null, { stroke: alpha(C.white, 1 - k), lw: 0.02 });
    }
  }, { anim: true });
  R.thing(bx - 0.1, by + 0.08, (ctx, t) => {
    const q = mod(t, 2.3) / 2.3;
    if (q > 0.62) return;
    const z = 5.9 - (q / 0.62) * (q / 0.62) * 5.4;
    const [dx, dy] = P(bx - 0.1, by + 0.08, z);
    ctx.beginPath();
    ctx.moveTo(dx, dy - 0.14); ctx.quadraticCurveTo(dx + 0.06, dy, dx, dy + 0.03); ctx.quadraticCurveTo(dx - 0.06, dy, dx, dy - 0.14);
    paint(ctx, alpha(NIGHT.flash, 0.85), { lw: 0.015 });
  }, { depth: bx + by + 0.2, anim: true });
}

// ---------- The chandelier (and its spider) ----------
function chandelier(R) {
  const x = 8, y = 7.7, z = 5.45;
  const ARMS = 6;
  R.thing(x, y, (ctx, t) => {
    const on = house.lamp(t) > 0.5;
    const sway = Math.sin(t * 0.8) * 0.04;
    // chain
    face(ctx, [[x, y, 6.2], [x, y, z + 0.35]], null, { lw: 0.04 });
    // the spider, going down for a look at the candles, and back up
    const q = mod(t + 7, 26);
    let sz = z - 0.35;
    if (q < 7) sz -= (q / 7) * 1.7;
    else if (q < 12) sz -= 1.7 + Math.sin((q - 7) * 3) * 0.05;
    else if (q < 12.6) sz -= 1.7 * (1 - (q - 12) / 0.6);
    const [hx, hy] = P(x + 0.3, y + 0.3, z - 0.3);
    const [sx, sy] = P(x + 0.3 + sway, y + 0.3, sz);
    if (Q.detail) {
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(sx, sy);
      ctx.strokeStyle = alpha(C.ink, 0.5); ctx.lineWidth = 0.01; ctx.stroke();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.018;
      ctx.beginPath();
      for (const sg of [-1, 1]) for (let i = 0; i < 4; i++) {
        ctx.moveTo(sx, sy); ctx.lineTo(sx + sg * 0.12, sy - 0.06 + i * 0.04); ctx.lineTo(sx + sg * 0.16, sy + 0.02 + i * 0.03);
      }
      ctx.stroke();
      ctx.beginPath(); ctx.ellipse(sx, sy, 0.06, 0.07, 0, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
    }
    // the body and arms
    const [bx, by] = P(x, y, z);
    ctx.beginPath(); ctx.ellipse(bx, by, 0.22, 0.32, 0, 0, Math.PI * 2); paint(ctx, MAT.brass, { dots: MAT.brassDark, density: 0.3, lw: 0.03 });
    for (let i = 0; i < ARMS; i++) {
      const a = (i / ARMS) * Math.PI * 2 + 0.3;
      const ax = x + Math.cos(a) * 0.85, ay = y + Math.sin(a) * 0.85;
      const [ex, ey] = P(ax, ay, z + 0.15);
      ctx.beginPath(); ctx.moveTo(bx, by + 0.1); ctx.quadraticCurveTo((bx + ex) / 2, by + 0.35, ex, ey);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.07; ctx.stroke();
      ctx.strokeStyle = MAT.brass; ctx.lineWidth = 0.04; ctx.stroke();
      // a crystal drop under each arm
      const [dx, dy] = P(ax, ay, z - 0.12);
      ctx.beginPath(); ctx.moveTo(dx + sway, dy - 0.12); ctx.lineTo(dx + 0.05 + sway, dy); ctx.lineTo(dx + sway, dy + 0.1); ctx.lineTo(dx - 0.05 + sway, dy);
      ctx.closePath();
      paint(ctx, alpha(INK.bone, 0.8), { lw: 0.015 });
      // its bulb
      ctx.beginPath(); ctx.ellipse(ex, ey - 0.1, 0.06, 0.09, 0, 0, Math.PI * 2);
      paint(ctx, on ? INK.bone : shade(INK.bone, 0.35), { lw: 0.015 });
    }
    const [cx, cy] = P(x, y, z - 0.5);
    ctx.beginPath(); ctx.moveTo(cx + sway, cy - 0.3); ctx.lineTo(cx + 0.09 + sway, cy); ctx.lineTo(cx + sway, cy + 0.14); ctx.lineTo(cx - 0.09 + sway, cy);
    ctx.closePath();
    paint(ctx, alpha(INK.bone, 0.85), { lw: 0.02 });
  }, { depth: 40, anim: true });
  R.light({ at: [x, y, z], r: 5.5, color: INK.candleGold, k: house.lamp });
}

// ---------- A mouse, out while nobody's about ----------
function mouse(R) {
  const HOLE = [0.15, 13.4];
  const runs = [[55, 71], [118, 136]]; // when it comes out: nobody's about
  const path = [HOLE, [1.2, 13.05], [2.4, 12.6], [3.15, 12.42]];
  // Its hole in the skirting, with its own doormat, and the bread roll it's
  // after (the Brigadier's, dropped mid-story).
  R.decor((ctx) => {
    onWallL(ctx, (g) => {
      g.beginPath();
      g.moveTo(-13.58, 0); g.lineTo(-13.58, -0.16); g.arc(-13.4, -0.16, 0.18, Math.PI, 0); g.lineTo(-13.22, 0);
      g.closePath();
      g.fillStyle = C.black; g.fill();
    });
  });
  R.rug((ctx) => { if (Q.detail) rect(ctx, 0.04, 13.15, 0.3, 0.5, 0.015, INK.oxblood, { lw: 0.015 }); });
  R.thing(3.45, 12.5, (ctx) => {
    const [bx, by] = P(3.45, 12.5, 0);
    ctx.beginPath(); ctx.ellipse(bx, by - 0.08, 0.2, 0.12, 0.1, 0, Math.PI * 2);
    paint(ctx, MAT.oakLight, { dots: MAT.brassDark, density: 0.3, lw: 0.025 });
    ctx.beginPath(); ctx.moveTo(bx - 0.08, by - 0.16); ctx.lineTo(bx + 0.02, by - 0.02);
    ctx.strokeStyle = shade(MAT.oakLight, 0.3); ctx.lineWidth = 0.02; ctx.stroke();
  });
  const len = [];
  let total = 0;
  for (let i = 1; i < path.length; i++) { const d = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); len.push(d); total += d; }
  const along = (d) => {
    for (let i = 0; i < len.length; i++) {
      if (d <= len[i]) { const k = d / len[i]; return [lerp(path[i][0], path[i + 1][0], k), lerp(path[i][1], path[i + 1][1], k), Math.atan2(path[i + 1][1] - path[i][1], path[i + 1][0] - path[i][0])]; }
      d -= len[i];
    }
    const n = path.length - 1;
    return [path[n][0], path[n][1], Math.atan2(path[n][1] - path[n - 1][1], path[n][0] - path[n - 1][0])];
  };
  R.mover((t) => {
    const s = mod(t);
    for (const [a, b] of runs) {
      if (s < a || s > b) continue;
      const run = total / 2.2; // seconds each way
      const q = s - a;
      if (q < run) { const [x, y, d] = along(q * 2.2); return { x, y, d, moving: true }; }
      if (q > b - a - run) { const [x, y, d] = along((b - a - q) * 2.2); return { x, y, d: d + Math.PI, moving: true }; }
      const [x, y, d] = along(total);
      return { x, y, d, moving: false, nibble: true };
    }
    return { x: HOLE[0], y: HOLE[1], hide: true };
  }, (ctx, t, p) => {
    if (p.hide) return;
    const [X, Yp] = P(p.x, p.y, 0);
    const dirX = Math.cos(p.d) - Math.sin(p.d); // screen direction it faces
    ctx.save();
    ctx.translate(X, Yp);
    ctx.scale(dirX >= 0 ? 1.35 : -1.35, 1.35);
    const hop = p.moving ? Math.abs(Math.sin(t * 22)) * 0.03 : 0;
    ctx.beginPath(); ctx.moveTo(-0.14, -0.04); ctx.quadraticCurveTo(-0.3, 0, -0.34, -0.1); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -0.08 - hop, 0.15, 0.08, 0, 0, Math.PI * 2); paint(ctx, C.grey, { lw: 0.02 });
    ctx.beginPath(); ctx.arc(0.08, -0.16 - hop, 0.05, 0, Math.PI * 2); paint(ctx, C.grey, { lw: 0.015 });
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0.19, -0.08 - hop + (p.nibble ? Math.sin(t * 20) * 0.01 : 0), 0.018, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (p.nibble && Q.detail) { // crumbs flying
      ctx.fillStyle = MAT.oakLight;
      for (let i = 0; i < 3; i++) {
        const k = mod(t * 1.7 + i / 3, 1);
        const [cx, cy] = P(p.x + 0.15 + k * 0.2, p.y + (i - 1) * 0.12, 0.12 + Math.sin(k * Math.PI) * 0.25);
        ctx.fillRect(cx - 0.02, cy - 0.02, 0.04, 0.04);
      }
    }
  });
}
