// Conservatory: a glass room on the side of the house, out in the storm. It's
// lit by lightning: every flash (the storm's, and the far-off sheet lightning
// only this glass catches) lights it cold white, throws the roof's glazing
// bars across the floor, and finds Lady Philippa and the gardener in a new
// pose. evening.js does the poses, on exactly these flashes; this room does
// the flashbulb. Around them, a room full of witnesses: a fern that has seen
// things, a gnome that can't look, goldfish in the front row, and glass that
// steams up while they're in. Nobody has watered the plants since Easter.
import {
  C, Q, P, SKIN, box, rect, disc, cylinder, face, paint, onLeft, onRight, slab, tiles, paintText, speech, note,
  mix, shade, tint, alpha, hash, dots,
} from '../../../engine/art.js';
import { clamp } from '../../../engine/actors.js';
import { ZK } from '../../../engine/iso.js';
import { INK, MAT, ROOM, NIGHT, house, storm, sheet, candle, lightsOut } from '../style.js';
import { DOORS, LOOP } from '../plan.js';

// ---------- Inks ----------
const RC = ROOM.conservatory;
const BAR = RC.trim; // white-painted glazing bars
const GLASS = mix(mix(RC.wall, INK.verdigris, 0.25), INK.stormNavy, 0.55); // the glass, with the night behind it
const GLASS_DOT = mix(RC.wall, INK.stormNavy, 0.85);
const BRICK = mix(RC.floor, INK.oxblood, 0.35);
const TILE_B = mix(RC.floor, INK.bone, 0.16);
const TILE_E = shade(RC.floor, 0.2);
const INSET = mix(INK.verdigris, RC.floor, 0.2); // little glazed squares where the tiles meet
const LEAF = MAT.leaf, LEAF_D = MAT.leafDark;
const LUSH = mix(MAT.leaf, C.green, 0.4); // the one plant that gets any water
const WILT = mix(MAT.leaf, MAT.oakLight, 0.55); // yellowing
const DEAD = mix(MAT.oak, INK.deepPlum, 0.3); // brown and crisp
const WICKER = MAT.oakLight;
const WATER = mix(INK.verdigris, INK.stormNavy, 0.4);
const FISH = mix(INK.candleGold, INK.oxblood, 0.35);
const MUD = mix(NIGHT.mud, RC.floor, 0.2);
const ORCHID = mix(INK.deepPlum, INK.bone, 0.55);
const SLATE = shade(INK.stormNavy, 0.15);
const TWINE = mix(INK.bone, MAT.oak, 0.35);
const IRON = mix(C.ink, INK.stormNavy, 0.4);

// ---------- The clock ----------
const mod = (t) => ((t % LOOP) + LOOP) % LOOP;
// Sheet lightning is far off, so it's a little dimmer than the storm's own strikes.
const SHEET_K = 0.7;
const flashK = (t) => Math.max(storm.flash(t), SHEET_K * sheet.flash(t));
// For the room's own light (the floor, the flashbulb): the storm's strikes
// already light the whole plate from the sky, so they add less here.
const roomK = (t) => Math.max(0.6 * storm.flash(t), SHEET_K * sheet.flash(t));
const strikeNow = (t) => storm.strike(t) || sheet.strike(t);
// Every flash this glass sees, in order: the poses change on these.
const FLASH_T = [...storm.strikes, ...sheet.strikes].map((s) => s.t).sort((a, b) => a - b);
function lastFlash(t) {
  const tt = mod(t);
  let last = FLASH_T[FLASH_T.length - 1] - LOOP;
  for (const f of FLASH_T) {
    if (f > tt) break;
    last = f;
  }
  return last;
}

// ---------- Walls ----------
const SILL = 0.92, TRANSOM = 3.6, TOP = 5.82;
// A point on a back wall: u along it, z up. Left is the plane x = 0, right y = 0.
const WP = (side, u, z) => (side === 'left' ? [-u, u / 2 - z * ZK] : [u, u / 2 - z * ZK]);
function wquad(p, side, u, z, w, h) {
  const a = WP(side, u, z), b = WP(side, u + w, z), c = WP(side, u + w, z + h), d = WP(side, u, z + h);
  p.moveTo(a[0], a[1]); p.lineTo(b[0], b[1]); p.lineTo(c[0], c[1]); p.lineTo(d[0], d[1]); p.closePath();
}
function wline(p, side, pts) {
  pts.forEach(([u, z], i) => {
    const [X, Y] = WP(side, u, z);
    if (i) p.lineTo(X, Y);
    else p.moveTo(X, Y);
  });
}

// One glass wall: its bays either side of the door, and the shapes of its
// panes, bars and Gothic tracery, made once and reused every frame.
function glassWall(side) {
  const d = (DOORS.conservatory || []).find((x) => x.side === side);
  const door = d ? { a: d.at - (d.w ?? 2.2) / 2, b: d.at + (d.w ?? 2.2) / 2, h: d.h ?? 3.6 } : null;
  const split = (u0, u1) => {
    const n = Math.max(1, Math.round((u1 - u0) / 1.4));
    return Array.from({ length: n }, (_, i) => [u0 + ((u1 - u0) * i) / n, u0 + ((u1 - u0) * (i + 1)) / n]);
  };
  const bays = door ? [...split(0, door.a), ...split(door.b, 16)] : split(0, 16);
  const panes = new Path2D(), bars = new Path2D(), tracery = new Path2D();
  // A pointed arch across a bay, springing at z0 with its point at z1.
  const arch = (a, b, z0, z1) => {
    const hw = (b - a) / 2, th = 1.1, pts = [];
    for (let i = 0; i <= 6; i++) {
      const s = i / 6;
      pts.push([a + (hw * (1 - Math.cos(th * s))) / (1 - Math.cos(th)), z0 + ((z1 - z0) * Math.sin(th * s)) / Math.sin(th)]);
    }
    for (let i = 5; i >= 0; i--) pts.push([b - (pts[i][0] - a), pts[i][1]]);
    wline(tracery, side, pts);
  };
  for (const [a, b] of bays) {
    wquad(panes, side, a + 0.05, SILL, b - a - 0.1, TRANSOM - SILL - 0.05);
    wquad(panes, side, a + 0.05, TRANSOM + 0.05, b - a - 0.1, TOP - TRANSOM - 0.05);
    arch(a + 0.05, b - 0.05, 4.45, 5.62);
  }
  if (door) {
    wquad(panes, side, door.a + 0.08, door.h + 0.12, door.b - door.a - 0.16, TOP - door.h - 0.12);
    arch(door.a + 0.08, door.b - 0.08, 4.3, 5.66);
  }
  const edges = [...new Set(bays.flatMap(([a, b]) => [a, b]).map((u) => Math.round(u * 1000) / 1000))];
  for (const u of edges) {
    const jamb = door && (Math.abs(u - door.a) < 0.01 || Math.abs(u - door.b) < 0.01);
    const w = jamb ? 0.16 : 0.1;
    wquad(bars, side, clamp(u - w / 2, 0, 16 - w), jamb ? 0 : SILL, w, TOP - (jamb ? 0 : SILL));
  }
  for (const [a, b] of bays) wquad(bars, side, a, TRANSOM - 0.05, b - a, 0.1);
  wquad(bars, side, 0, TOP, 16, 6 - TOP);
  if (door) {
    wquad(bars, side, door.a, door.h, door.b - door.a, 0.12);
    wquad(bars, side, (door.a + door.b) / 2 - 0.04, door.h, 0.08, TOP - door.h);
  }
  return { side, door, bays, panes, bars, tracery };
}

function strokeTracery(ctx, g) {
  if (Q.lines) {
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.1;
    ctx.stroke(g.tracery);
  }
  ctx.strokeStyle = BAR;
  ctx.lineWidth = 0.06;
  ctx.stroke(g.tracery);
}

// The glass wall as it stands: a brick dwarf wall, a sill, the night through
// the glass, beads of rain, reflections, and the bars over it all.
function paintGlass(ctx, g) {
  const f = g.side === 'left' ? onLeft : onRight;
  const runs = g.door ? [[0, g.door.a], [g.door.b, 16]] : [[0, 16]];
  for (const [a, b] of runs) f(ctx, a, 0, b - a, 0.8, BRICK, { dots: shade(BRICK, 0.5), density: 0.2 });
  if (Q.detail) {
    ctx.beginPath();
    for (const [a, b] of runs) {
      for (const z of [0.27, 0.54]) wline(ctx, g.side, [[a, z], [b, z]]);
      for (let row = 0; row < 3; row++) {
        for (let u = a + (row % 2 ? 0.2 : 0.42); u < b - 0.05; u += 0.44) wline(ctx, g.side, [[u, row * 0.27], [u, row * 0.27 + 0.27]]);
      }
    }
    ctx.strokeStyle = shade(BRICK, 0.45);
    ctx.lineWidth = 0.025;
    ctx.stroke();
  }
  for (const [a, b] of runs) f(ctx, a, 0.8, b - a, SILL - 0.8, BAR, { lw: 0.03 });
  ctx.fillStyle = GLASS;
  ctx.fill(g.panes);
  if (Q.detail) {
    ctx.fillStyle = dots(GLASS_DOT, 0.3);
    ctx.fill(g.panes);
    // A pale reflection across each pane, and beads of rain stuck to the glass.
    ctx.beginPath();
    for (const [a, b] of g.bays) {
      const w = b - a;
      wline(ctx, g.side, [[a + 0.15, SILL + 0.2], [a + 0.38, SILL + 0.2], [a + w * 0.85, TRANSOM - 0.3], [a + w * 0.62, TRANSOM - 0.3]]);
      ctx.closePath();
      wline(ctx, g.side, [[a + w * 0.5, SILL + 0.2], [a + w * 0.58, SILL + 0.2], [a + w * 0.95, TRANSOM - 1.3], [a + w * 0.87, TRANSOM - 1.3]]);
      ctx.closePath();
    }
    ctx.fillStyle = alpha(INK.bone, 0.07);
    ctx.fill();
    ctx.beginPath();
    g.bays.forEach(([a, b], i) => {
      for (let k = 0; k < 4; k++) {
        const [X, Y] = WP(g.side, a + 0.15 + hash(i * 7 + k, 3) * (b - a - 0.3), SILL + 0.2 + hash(i * 7 + k, 5) * (TOP - SILL - 0.5));
        ctx.moveTo(X + 0.035, Y);
        ctx.arc(X, Y, 0.035, 0, Math.PI * 2);
      }
    });
    ctx.fillStyle = alpha(INK.bone, 0.45);
    ctx.fill();
  }
  ctx.fillStyle = BAR;
  ctx.fill(g.bars);
  if (Q.lines) {
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.025;
    ctx.stroke(g.bars);
  }
  strokeTracery(ctx, g);
}

// A glazed door, folded back flat against the wall beside its opening.
function doorLeaf(ctx, side, u, w, h) {
  const f = side === 'left' ? onLeft : onRight;
  f(ctx, u, 0, w, h, BAR, { lw: 0.03 });
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 3; j++) {
      f(ctx, u + 0.14 + i * ((w - 0.28) / 2 + 0.02), 0.95 + j * ((h - 1.1) / 3), (w - 0.28) / 2 - 0.02, (h - 1.1) / 3 - 0.08, GLASS, { lw: 0.02 });
    }
  }
  f(ctx, u + 0.14, 0.15, w - 0.28, 0.65, shade(BAR, 0.08), { lw: 0.02 });
  const [X, Y] = WP(side, u + w - 0.22, 1.75);
  ctx.beginPath();
  ctx.arc(X, Y, 0.06, 0, Math.PI * 2);
  paint(ctx, MAT.brass, { lw: 0.02 });
}

// ---------- Small things ----------
// A flowerpot standing at (x, y, z): r its radius at the rim, h its height.
// Returns the middle of its soil, on screen, for the plant to grow from.
function pot(ctx, x, y, z, r, h, color = MAT.terracotta) {
  const [X, Y] = P(x, y, z);
  const rx = r * Math.SQRT2, ry = rx / 2, H = h * ZK, bx = rx * 0.74;
  ctx.beginPath();
  ctx.moveTo(X - rx, Y - H);
  ctx.lineTo(X - bx, Y);
  ctx.ellipse(X, Y, bx, bx / 2, 0, Math.PI, 0, true);
  ctx.lineTo(X + rx, Y - H);
  ctx.ellipse(X, Y - H, rx, ry, 0, 0, Math.PI, false);
  ctx.closePath();
  paint(ctx, color, { dots: shade(color, 0.5), density: 0.18, lw: 0.035 });
  // the rim, and the soil inside it
  ctx.beginPath();
  ctx.ellipse(X, Y - H, rx * 1.06, ry * 1.1, 0, 0, Math.PI * 2);
  paint(ctx, tint(color, 0.12), { lw: 0.035 });
  ctx.beginPath();
  ctx.ellipse(X, Y - H, rx * 0.84, ry * 0.8, 0, 0, Math.PI * 2);
  ctx.fillStyle = NIGHT.earthDark;
  ctx.fill();
  return [X, Y - H];
}

// A leaf blade in screen units, from (X0, Y0) out along angle a (0 is right,
// -PI/2 straight up), L long, its tip dropping by droop. Serrated edges read as
// the leaflets of a palm or a fern.
function frond(ctx, X0, Y0, a, L, droop, w, color, lw = 0.035) {
  const ca = Math.cos(a), sa = Math.sin(a);
  const cx = X0 + ca * L * 0.55, cy = Y0 + sa * L * 0.55 - L * 0.18;
  const ex = X0 + ca * L, ey = Y0 + sa * L + droop;
  const n = 12, s1 = [], s2 = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n, u = 1 - s;
    const x = u * u * X0 + 2 * u * s * cx + s * s * ex, y = u * u * Y0 + 2 * u * s * cy + s * s * ey;
    const tx = 2 * u * (cx - X0) + 2 * s * (ex - cx), ty = 2 * u * (cy - Y0) + 2 * s * (ey - cy);
    const tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl;
    const ww = w * Math.sin(Math.PI * Math.min(1, 0.12 + s)) * (i % 2 ? 1 : 0.45);
    s1.push([x + nx * ww, y + ny * ww]);
    s2.push([x - nx * ww * 0.8, y - ny * ww * 0.8]);
  }
  ctx.beginPath();
  ctx.moveTo(X0, Y0);
  for (const [x, y] of s1) ctx.lineTo(x, y);
  for (let i = s2.length - 1; i >= 0; i--) ctx.lineTo(s2[i][0], s2[i][1]);
  ctx.closePath();
  paint(ctx, color, { dots: shade(color, 0.45), density: 0.14, lw });
  if (Q.detail && L > 0.6) {
    ctx.beginPath();
    ctx.moveTo(X0, Y0);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.strokeStyle = shade(color, 0.35);
    ctx.lineWidth = 0.025;
    ctx.stroke();
  }
}

// A fern growing from (X, Y): n fronds fanned over the top, drooping.
function fern(ctx, X, Y, s, color, droop, t, spread = 1) {
  const sway = Math.sin(t * 1.3 + X * 0.7) * 0.04;
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.42 * spread + sway;
    const L = s * (0.55 + 0.12 * ((i * 5) % 3));
    frond(ctx, X, Y, a, L, droop * s * (Math.abs(i - 3) * 0.3 + 0.3), s * 0.1, i % 2 ? color : shade(color, 0.12), 0.025);
  }
}

// An orchid: strap leaves, one arching stem, and whatever flowers it has left.
function orchid(ctx, X, Y, s, t, flowers = 2) {
  for (const [dx, a, c] of [[-0.1, -0.35, LEAF_D], [0.1, 0.3, LEAF], [0, 0.05, shade(LEAF, 0.1)]]) {
    ctx.beginPath();
    ctx.ellipse(X + dx * s, Y - 0.05 * s, 0.24 * s, 0.07 * s, a, 0, Math.PI * 2);
    paint(ctx, c, { lw: 0.02 });
  }
  const sw = Math.sin(t * 1.1 + X) * 0.03;
  const ex = X + (0.34 + sw) * s, ey = Y - 0.72 * s;
  ctx.beginPath();
  ctx.moveTo(X, Y - 0.05 * s);
  ctx.quadraticCurveTo(X + 0.05 * s, Y - 0.95 * s, ex, ey);
  ctx.strokeStyle = LEAF_D;
  ctx.lineWidth = 0.03;
  ctx.stroke();
  for (let k = 0; k < flowers; k++) {
    const fx = ex - k * 0.14 * s, fy = ey - 0.08 * s + k * 0.1 * s;
    ctx.beginPath();
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.moveTo(fx + Math.cos(a) * 0.07 * s + 0.045 * s, fy + Math.sin(a) * 0.07 * s);
      ctx.arc(fx + Math.cos(a) * 0.07 * s, fy + Math.sin(a) * 0.07 * s, 0.045 * s, 0, Math.PI * 2);
    }
    paint(ctx, ORCHID, { lw: 0.015 });
    ctx.beginPath();
    ctx.arc(fx, fy, 0.03 * s, 0, Math.PI * 2);
    ctx.fillStyle = INK.oxblood;
    ctx.fill();
  }
}

function cactus(ctx, X, Y, s) {
  ctx.beginPath();
  ctx.roundRect(X - 0.13 * s, Y - 0.5 * s, 0.26 * s, 0.52 * s, 0.13 * s);
  paint(ctx, LEAF_D, { dots: shade(LEAF_D, 0.4), density: 0.2, lw: 0.025 });
  if (Q.detail) {
    ctx.beginPath();
    for (const dx of [-0.06, 0, 0.06]) {
      ctx.moveTo(X + dx * s, Y - 0.44 * s);
      ctx.lineTo(X + dx * s, Y - 0.02 * s);
    }
    ctx.strokeStyle = shade(LEAF_D, 0.3);
    ctx.lineWidth = 0.015;
    ctx.stroke();
  }
  // It's the only thing on the staging that's fine: cacti don't need watering.
  ctx.beginPath();
  for (let p = 0; p < 5; p++) {
    const a = (p / 5) * Math.PI * 2;
    ctx.moveTo(X + Math.cos(a) * 0.06 * s + 0.04 * s, Y - 0.53 * s + Math.sin(a) * 0.04 * s);
    ctx.arc(X + Math.cos(a) * 0.06 * s, Y - 0.53 * s + Math.sin(a) * 0.04 * s, 0.04 * s, 0, Math.PI * 2);
  }
  paint(ctx, mix(INK.oxblood, C.pink, 0.4), { lw: 0.015 });
}

// Dead sticks, and the one leaf still hanging on.
function sticks(ctx, X, Y, s) {
  ctx.beginPath();
  ctx.moveTo(X, Y); ctx.lineTo(X - 0.08 * s, Y - 0.55 * s); ctx.lineTo(X - 0.18 * s, Y - 0.7 * s);
  ctx.moveTo(X - 0.06 * s, Y - 0.42 * s); ctx.lineTo(X + 0.1 * s, Y - 0.62 * s);
  ctx.moveTo(X + 0.03, Y); ctx.lineTo(X + 0.14 * s, Y - 0.45 * s);
  ctx.strokeStyle = DEAD;
  ctx.lineWidth = 0.03;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(X + 0.13 * s, Y - 0.56 * s, 0.035 * s, 0.07 * s, 0.4, 0, Math.PI * 2);
  paint(ctx, WILT, { lw: 0.015 });
}

function geranium(ctx, X, Y, s, t) {
  const sw = Math.sin(t * 1.5 + X) * 0.02;
  for (let i = 0; i < 6; i++) {
    const a = Math.PI + (i / 5) * Math.PI;
    ctx.beginPath();
    ctx.arc(X + Math.cos(a) * 0.17 * s, Y - 0.08 * s + Math.sin(a) * 0.12 * s + (i === 0 || i === 5 ? 0.06 * s : 0), 0.09 * s, 0, Math.PI * 2);
    paint(ctx, i % 2 ? WILT : LEAF, { lw: 0.02 });
  }
  // one flower head, hanging its head
  ctx.beginPath();
  ctx.moveTo(X, Y - 0.15 * s);
  ctx.quadraticCurveTo(X + 0.1 * s, Y - 0.5 * s, X + (0.26 + sw) * s, Y - 0.34 * s);
  ctx.strokeStyle = LEAF_D;
  ctx.lineWidth = 0.02;
  ctx.stroke();
  ctx.beginPath();
  for (const [dx, dy] of [[0, 0], [0.05, 0.04], [-0.04, 0.04], [0.01, 0.08]]) {
    ctx.moveTo(X + (0.26 + sw + dx) * s + 0.04 * s, Y + (-0.32 + dy) * s);
    ctx.arc(X + (0.26 + sw + dx) * s, Y + (-0.32 + dy) * s, 0.04 * s, 0, Math.PI * 2);
  }
  paint(ctx, INK.oxblood, { lw: 0.015 });
}

// A snake plant: spiky, upright, and doing fine on neglect.
function snake(ctx, X, Y, s) {
  for (const [dx, h, a] of [[-0.1, 0.55, -0.2], [0.1, 0.62, 0.15], [0, 0.75, 0], [-0.03, 0.45, -0.45], [0.06, 0.48, 0.45]]) {
    ctx.save();
    ctx.translate(X + dx * s, Y);
    ctx.rotate(a * 0.5);
    ctx.beginPath();
    ctx.moveTo(-0.045 * s, 0);
    ctx.quadraticCurveTo(-0.06 * s, -h * s * 0.6, 0, -h * s);
    ctx.quadraticCurveTo(0.06 * s, -h * s * 0.6, 0.045 * s, 0);
    ctx.closePath();
    paint(ctx, LEAF_D, { dots: MAT.brassDark, density: 0.2, lw: 0.02, stroke: MAT.brassDark });
    ctx.restore();
  }
}

// A glass bell jar over the one seedling it was meant to save. It catches the lightning.
function cloche(ctx, X, Y, t) {
  ctx.beginPath();
  ctx.moveTo(X, Y); ctx.lineTo(X - 0.05, Y - 0.12);
  ctx.moveTo(X, Y); ctx.lineTo(X + 0.04, Y - 0.1);
  ctx.strokeStyle = WILT;
  ctx.lineWidth = 0.025;
  ctx.stroke();
  const k = flashK(t);
  ctx.beginPath();
  ctx.moveTo(X - 0.2, Y);
  ctx.lineTo(X - 0.2, Y - 0.22);
  ctx.bezierCurveTo(X - 0.2, Y - 0.46, X + 0.2, Y - 0.46, X + 0.2, Y - 0.22);
  ctx.lineTo(X + 0.2, Y);
  ctx.closePath();
  ctx.fillStyle = alpha(mix(INK.bone, NIGHT.flash, k), 0.18 + 0.5 * k);
  ctx.fill();
  ctx.strokeStyle = alpha(INK.bone, 0.75);
  ctx.lineWidth = 0.025;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(X, Y - 0.42, 0.04, 0, Math.PI * 2);
  ctx.fillStyle = alpha(INK.bone, 0.8);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(X - 0.12, Y - 0.08);
  ctx.quadraticCurveTo(X - 0.14, Y - 0.3, X - 0.04, Y - 0.36);
  ctx.strokeStyle = alpha(C.white, 0.6);
  ctx.lineWidth = 0.02;
  ctx.stroke();
}

// What's on the staging: three steps, back (highest) to front.
const STAGING = [
  { x: 0.3, z: 1.22, pots: [{ y: 1.6, kind: 'fern', c: WILT }, { y: 2.8, kind: 'orchid', n: 1 }, { y: 4.0, kind: 'fern', c: DEAD }, { y: 5.3, kind: 'sticks' }] },
  { x: 0.78, z: 0.82, pots: [{ y: 1.5, kind: 'cactus' }, { y: 2.55, kind: 'geranium' }, { y: 3.65, kind: 'orchid', n: 2 }, { y: 4.75, kind: 'snake' }, { y: 5.6, kind: 'fern', c: WILT, r: 0.17 }] },
  { x: 1.24, z: 0.42, pots: [{ y: 1.8, kind: 'sticks', r: 0.16 }, { y: 3.05, kind: 'fern', c: LEAF_D }, { y: 4.3, kind: 'cloche' }, { y: 5.4, kind: 'geranium', r: 0.17 }] },
];

function staging(ctx, t) {
  const wood = MAT.oak;
  for (const st of STAGING) {
    box(ctx, st.x, 1, st.z - 0.07, 0.46, 5, 0.07, wood, { lw: 0.04 });
    for (const ly of [1.08, 3.45, 5.85]) box(ctx, st.x + 0.36, ly, 0, 0.07, 0.07, st.z - 0.07, shade(wood, 0.25), { flat: true, lw: 0.03 });
    for (const p of st.pots) {
      const x = st.x + 0.23;
      if (p.kind === 'cloche') {
        const [X, Y] = P(x, p.y, st.z);
        cloche(ctx, X, Y, t);
        continue;
      }
      const [X, Y] = pot(ctx, x, p.y, st.z, p.r || 0.2, 0.26);
      if (p.kind === 'fern') fern(ctx, X, Y, 0.7, p.c, p.c === DEAD ? 0.9 : 0.5, t);
      else if (p.kind === 'orchid') orchid(ctx, X, Y, 1, t, p.n);
      else if (p.kind === 'cactus') cactus(ctx, X, Y, 1);
      else if (p.kind === 'sticks') sticks(ctx, X, Y, 1);
      else if (p.kind === 'geranium') geranium(ctx, X, Y, 1, t);
      else if (p.kind === 'snake') snake(ctx, X, Y, 1);
    }
  }
  // the near end frame
  face(ctx, [[0.3, 6, 1.22], [1.7, 6, 0.42], [1.7, 6, 0.35], [0.3, 6, 1.15]], shade(wood, 0.1), { lw: 0.03 });
}

// A watering can, bone dry. web: nobody has picked it up in a long time.
function wateringCan(ctx, t, x, y, color, flip = 1, web = false) {
  const [X, Y] = P(x, y, 0);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(flip, 1);
  if (Q.detail) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.36, 0.13, 0, 0, Math.PI * 2);
    ctx.fillStyle = alpha(C.ink, 0.18);
    ctx.fill();
  }
  // spout, behind the body
  ctx.beginPath();
  ctx.moveTo(0.12, -0.12); ctx.lineTo(0.5, -0.52); ctx.lineTo(0.54, -0.48); ctx.lineTo(0.16, -0.06);
  ctx.closePath();
  paint(ctx, shade(color, 0.12), { lw: 0.025 });
  ctx.beginPath();
  ctx.ellipse(0.53, -0.53, 0.06, 0.08, -0.8, 0, Math.PI * 2);
  paint(ctx, shade(color, 0.2), { lw: 0.025 });
  // body
  ctx.beginPath();
  ctx.moveTo(-0.22, -0.4);
  ctx.lineTo(-0.22, -0.02);
  ctx.ellipse(0, -0.02, 0.22, 0.08, 0, Math.PI, 0, true);
  ctx.lineTo(0.22, -0.4);
  ctx.ellipse(0, -0.4, 0.22, 0.08, 0, 0, Math.PI, false);
  ctx.closePath();
  paint(ctx, color, { dots: shade(color, 0.45), density: 0.2, lw: 0.03 });
  ctx.beginPath();
  ctx.ellipse(0, -0.4, 0.22, 0.08, 0, 0, Math.PI * 2);
  paint(ctx, tint(color, 0.15), { lw: 0.025 });
  // handle
  ctx.beginPath();
  ctx.moveTo(-0.2, -0.36);
  ctx.bezierCurveTo(-0.3, -0.72, 0.08, -0.74, 0.1, -0.44);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.08;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.045;
  ctx.stroke();
  if (web && Q.detail) {
    // a web from the handle to the spout, and its spider on a thread
    ctx.beginPath();
    for (const [a, b] of [[[-0.05, -0.66], [0.5, -0.5]], [[-0.05, -0.66], [0.3, -0.25]], [[0.08, -0.5], [0.44, -0.44]], [[0.02, -0.6], [0.36, -0.34]]]) {
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
    }
    ctx.strokeStyle = alpha(INK.bone, 0.55);
    ctx.lineWidth = 0.012;
    ctx.stroke();
    const sy = -0.36 + Math.sin(t * 0.9) * 0.1 + Math.max(0, Math.sin(t * 0.23)) * 0.12;
    ctx.beginPath();
    ctx.moveTo(0.34, -0.47);
    ctx.lineTo(0.34, sy);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0.34, sy + 0.035, 0.035, 0, Math.PI * 2);
    ctx.fillStyle = C.ink;
    ctx.fill();
    ctx.beginPath();
    for (const s of [-1, 1]) {
      for (const k of [0, 1]) {
        ctx.moveTo(0.34, sy + 0.035);
        ctx.lineTo(0.34 + s * 0.07, sy + 0.005 + k * 0.06);
      }
    }
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.012;
    ctx.stroke();
  }
  ctx.restore();
}

// Floor drawing: build a path in floor units (x, y at height z), then paint it
// in screen units so outlines keep their weight.
function onFloor(ctx, z, fn) {
  ctx.save();
  ctx.translate(0, -z * ZK);
  ctx.transform(1, 0.5, -1, 0.5, 0, 0);
  fn();
  ctx.restore();
}

// ---------- The big things ----------
// A glazed jardiniere for the tall palm: verdigris, with a bone band.
function jardiniere(ctx, x, y, r, h) {
  const [X, Y] = pot(ctx, x, y, 0, r, h, INK.verdigris);
  const [Xb, Yb] = P(x, y, h * 0.55);
  ctx.beginPath();
  ctx.ellipse(Xb, Yb, r * Math.SQRT2 * 0.93, r * 0.66, 0, 0.08, Math.PI - 0.08);
  ctx.strokeStyle = INK.bone;
  ctx.lineWidth = 0.1;
  ctx.stroke();
  return [X, Y];
}

// The tall palm (a kentia) by the kitchen door, its lower fronds giving up.
const PALM_A = [
  { a: -1.95, l: 2.3, d: 0.3, w: 0.32, c: LEAF_D },
  { a: -1.3, l: 2.5, d: 0.2, w: 0.34, c: LEAF },
  { a: -2.65, l: 2.3, d: 0.9, w: 0.3, c: WILT },
  { a: -0.55, l: 2.3, d: 0.8, w: 0.32, c: LEAF_D },
  { a: 2.95, l: 2.0, d: 1.7, w: 0.27, c: DEAD },
  { a: 0.15, l: 2.1, d: 1.5, w: 0.3, c: WILT },
  { a: 2.35, l: 1.9, d: 1.2, w: 0.3, c: LEAF },
  { a: 0.8, l: 1.8, d: 1.1, w: 0.3, c: LEAF },
  { a: 1.62, l: 1.35, d: 1.0, w: 0.27, c: DEAD },
];
function palmTall(ctx, t) {
  const x = 12, y = 2.5;
  const [X, Y] = jardiniere(ctx, x, y, 0.74, 0.95);
  const H = 2.75 * ZK, lean = 0.22;
  ctx.beginPath();
  ctx.moveTo(X - 0.17, Y);
  ctx.quadraticCurveTo(X - 0.1, Y - H * 0.5, X + lean - 0.1, Y - H);
  ctx.lineTo(X + lean + 0.1, Y - H);
  ctx.quadraticCurveTo(X + 0.1, Y - H * 0.5, X + 0.17, Y);
  ctx.closePath();
  paint(ctx, MAT.oak, { dots: shade(MAT.oak, 0.5), density: 0.2, lw: 0.04 });
  if (Q.detail) {
    ctx.beginPath();
    for (let i = 1; i < 9; i++) {
      const k = i / 9, cx = X + lean * k * k;
      ctx.moveTo(cx - 0.15, Y - H * k + 0.05);
      ctx.lineTo(cx + 0.15, Y - H * k - 0.03);
    }
    ctx.strokeStyle = shade(MAT.oak, 0.4);
    ctx.lineWidth = 0.025;
    ctx.stroke();
  }
  const sway = Math.sin(t * 0.9 + 1.3) * 0.035 + Math.sin(t * 2.1) * 0.012;
  ctx.save();
  ctx.translate(X + lean, Y - H);
  ctx.rotate(sway);
  for (const f of PALM_A) frond(ctx, 0, 0, f.a, f.l, f.d, f.w, f.c);
  ctx.restore();
}

// The bushy palm by the hall door: three stems from one pot.
const PALM_B = [
  { dx: -0.55, dy: -1.9, fr: [[-2.3, 1.5, 0.6, WILT], [-1.5, 1.6, 0.3, LEAF_D], [-3.0, 1.3, 1.1, DEAD], [2.4, 1.2, 1.0, WILT]] },
  { dx: 0.55, dy: -1.55, fr: [[-0.8, 1.5, 0.5, LEAF], [0.2, 1.4, 1.0, WILT], [-1.4, 1.2, 0.3, LEAF_D], [1.2, 1.1, 0.9, LEAF]] },
  { dx: 0.05, dy: -2.6, fr: [[-1.9, 1.7, 0.4, LEAF], [-1.1, 1.8, 0.4, LEAF_D], [-2.8, 1.5, 1.0, WILT], [-0.3, 1.6, 0.9, LEAF], [2.0, 1.3, 1.3, DEAD]] },
];
function palmBushy(ctx, t) {
  const [X, Y] = pot(ctx, 3, 13, 0, 0.7, 0.85, MAT.terracotta);
  const sway = Math.sin(t * 1.05 + 4) * 0.04;
  for (const st of PALM_B) {
    ctx.beginPath();
    ctx.moveTo(X + st.dx * 0.25, Y);
    ctx.quadraticCurveTo(X + st.dx * 0.4, Y + st.dy * 0.5, X + st.dx + sway * 4, Y + st.dy);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.12;
    ctx.stroke();
    ctx.strokeStyle = LEAF_D;
    ctx.lineWidth = 0.07;
    ctx.stroke();
  }
  for (const st of PALM_B) {
    ctx.save();
    ctx.translate(X + st.dx + sway * 4, Y + st.dy);
    ctx.rotate(sway);
    for (const [a, l, d, c] of st.fr) frond(ctx, 0, 0, a, l, d, 0.27, c);
    ctx.restore();
  }
}

// The potting bench, against the glass: pots, compost, a seed tray of the
// departed, and the chalkboard that explains everything.
function pottingBench(ctx, t) {
  const x0 = 1.95, x1 = 6.4, y0 = 0.14, y1 = 1.22, top = 1.02, wood = MAT.pine;
  const legs = (ly) => {
    for (const lx of [x0 + 0.05, (x0 + x1) / 2, x1 - 0.15]) box(ctx, lx, ly, 0, 0.1, 0.1, top - 0.08, shade(wood, 0.3), { flat: true, lw: 0.03 });
  };
  legs(y0 + 0.02);
  box(ctx, x0 + 0.05, y0 + 0.05, 0.26, x1 - x0 - 0.1, y1 - y0 - 0.1, 0.06, shade(wood, 0.12), { lw: 0.03 });
  // Under it: pots on their sides, and a sack of the good stuff.
  box(ctx, x0 + 0.2, y0 + 0.2, 0.32, 0.9, 0.7, 0.42, mix(MAT.oakLight, INK.bone, 0.3), { lw: 0.03, top: mix(MAT.oakLight, INK.bone, 0.45) });
  ctx.save();
  ctx.translate(-(y0 + 0.9), (y0 + 0.9) / 2);
  paintText(ctx, 'right', x0 + 0.65, 0.53, 'MANURE', 0.15, shade(MAT.oak, 0.3));
  ctx.restore();
  for (let i = 0; i < 3; i++) {
    const [X, Y] = P(3.9 + i * 0.35, 0.75, 0.32);
    ctx.beginPath();
    ctx.ellipse(X, Y - 0.2, 0.17, 0.2, 0, 0, Math.PI * 2);
    paint(ctx, shade(MAT.terracotta, i * 0.06), { lw: 0.03 });
    ctx.beginPath();
    ctx.ellipse(X - 0.03, Y - 0.2, 0.1, 0.13, 0, 0, Math.PI * 2);
    ctx.fillStyle = shade(MAT.terracotta, 0.4);
    ctx.fill();
  }
  legs(y1 - 0.12);
  box(ctx, x0, y0, top - 0.08, x1 - x0, y1 - y0, 0.08, wood, { lw: 0.04 });
  box(ctx, x0, y0 - 0.06, top, x1 - x0, 0.06, 0.26, shade(wood, 0.08), { lw: 0.03 });

  // The chalkboard, leant on the glass.
  face(ctx, [[4.95, 0.28, top], [6.35, 0.28, top], [6.35, 0.1, 2.15], [4.95, 0.1, 2.15]], MAT.oak, { lw: 0.035 });
  face(ctx, [[5.03, 0.27, top + 0.08], [6.27, 0.27, top + 0.08], [6.27, 0.11, 2.07], [5.03, 0.11, 2.07]], SLATE, { dots: shade(SLATE, 0.3), density: 0.2, lw: 0.02 });
  ctx.save();
  ctx.translate(-0.19, 0.095);
  paintText(ctx, 'right', 5.65, 1.83, 'LAST WATERED:', 0.15, alpha(INK.bone, 0.9));
  paintText(ctx, 'right', 5.65, 1.43, 'EASTER', 0.3, alpha(INK.bone, 0.9));
  ctx.restore();

  // A sack of compost, slumped, spilling.
  const [SX, SY] = P(2.5, 0.65, top);
  ctx.beginPath();
  ctx.moveTo(SX - 0.4, SY + 0.05);
  ctx.bezierCurveTo(SX - 0.5, SY - 0.45, SX - 0.3, SY - 0.75, SX - 0.05, SY - 0.72);
  ctx.bezierCurveTo(SX + 0.2, SY - 0.7, SX + 0.35, SY - 0.4, SX + 0.4, SY + 0.05);
  ctx.closePath();
  paint(ctx, mix(MAT.oakLight, INK.deepPlum, 0.15), { dots: shade(MAT.oakLight, 0.45), density: 0.25, lw: 0.035 });
  ctx.beginPath();
  ctx.ellipse(SX + 0.42, SY + 0.02, 0.28, 0.1, 0, 0, Math.PI * 2);
  ctx.fillStyle = NIGHT.earthDark;
  ctx.fill();
  // Pots, stacked the way nobody stacks pots.
  for (let i = 0; i < 4; i++) {
    const [X, Y] = P(3.45, 0.7, top + i * 0.13);
    ctx.beginPath();
    ctx.moveTo(X - 0.26 + i * 0.02, Y - 0.2);
    ctx.lineTo(X - 0.19, Y);
    ctx.lineTo(X + 0.19, Y);
    ctx.lineTo(X + 0.26 - i * 0.02, Y - 0.2);
    ctx.closePath();
    paint(ctx, shade(MAT.terracotta, 0.04 * (3 - i)), { lw: 0.025 });
  }
  // A seed tray of seedlings that didn't make it.
  box(ctx, 3.85, 0.5, top, 0.9, 0.62, 0.1, MAT.oak, { lw: 0.025, top: NIGHT.earthDark });
  if (Q.detail) {
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        const [X, Y] = P(3.98 + i * 0.2, 0.6 + j * 0.2, top + 0.1);
        ctx.moveTo(X, Y);
        ctx.quadraticCurveTo(X, Y - 0.14, X + 0.07, Y - 0.1);
      }
    }
    ctx.strokeStyle = DEAD;
    ctx.lineWidth = 0.02;
    ctx.stroke();
  }
  // The lantern's frame (the flame is a candle, lit below).
  box(ctx, 4.36, 0.52, top, 0.3, 0.3, 0.05, IRON, { flat: true, lw: 0.02 });
  box(ctx, 4.36, 0.52, top + 0.56, 0.3, 0.3, 0.05, IRON, { flat: true, lw: 0.02 });
  for (const [lx, ly] of [[4.36, 0.82], [4.64, 0.82]]) {
    face(ctx, [[lx, ly, top + 0.05], [lx, ly, top + 0.56]], null, { lw: 0.025, stroke: IRON });
  }
  // A trowel and a ball of twine at the front edge.
  const [TX, TY] = P(5.2, 1.05, top);
  ctx.beginPath();
  ctx.moveTo(TX - 0.35, TY - 0.02); ctx.lineTo(TX - 0.1, TY - 0.08); ctx.lineTo(TX - 0.08, TY - 0.02);
  ctx.closePath();
  paint(ctx, MAT.silver, { lw: 0.02 });
  ctx.beginPath();
  ctx.roundRect(TX - 0.1, TY - 0.08, 0.28, 0.07, 0.03);
  paint(ctx, MAT.oak, { lw: 0.02 });
  const [BX, BY] = P(2.95, 1.0, top);
  ctx.beginPath();
  ctx.arc(BX, BY - 0.1, 0.1, 0, Math.PI * 2);
  paint(ctx, TWINE, { lw: 0.02 });
  // seed packets
  for (const [px, c] of [[4.95, C.coral], [5.3, INK.candleGold], [5.65, INK.verdigris]]) {
    const [X, Y] = P(px + 0.9, 0.95, top);
    ctx.beginPath();
    ctx.rect(X - 0.1, Y - 0.2, 0.18, 0.2);
    paint(ctx, c, { lw: 0.02 });
  }
}

// A marble pedestal with a flowerpot on it. The plant died, so the pot's
// been put to use: love letters, tied with a ribbon (the find).
function letterStand(ctx) {
  box(ctx, 4.6, 5.6, 0, 0.8, 0.8, 0.1, MAT.marble, { lw: 0.035 });
  cylinder(ctx, 5, 6, 0.1, 0.19, 0.34, MAT.marble);
  if (Q.detail) {
    for (const dx of [-0.12, 0, 0.12]) {
      face(ctx, [[5 + dx * 0.7, 6 - dx * 0.7, 0.12], [5 + dx * 0.7, 6 - dx * 0.7, 0.42]], null, { lw: 0.015, stroke: MAT.marbleVein });
    }
  }
  box(ctx, 4.66, 5.66, 0.44, 0.68, 0.68, 0.08, MAT.marble, { lw: 0.035 });
  const [X, Y] = pot(ctx, 5, 6, 0.52, 0.3, 0.38, MAT.terracotta);
  // the plant that was
  ctx.beginPath();
  ctx.moveTo(X + 0.12, Y); ctx.lineTo(X + 0.2, Y - 0.62); ctx.lineTo(X + 0.3, Y - 0.72);
  ctx.moveTo(X + 0.18, Y - 0.45); ctx.lineTo(X + 0.08, Y - 0.58);
  ctx.strokeStyle = DEAD;
  ctx.lineWidth = 0.03;
  ctx.stroke();
  // the letters: a bundle of envelopes, fanned out of the pot
  const env = (dx, dy, a, heart) => {
    ctx.save();
    ctx.translate(X + dx, Y + dy);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.rect(-0.26, -0.5, 0.52, 0.38);
    paint(ctx, MAT.paper, { lw: 0.03 });
    ctx.beginPath();
    ctx.moveTo(-0.26, -0.5); ctx.lineTo(0, -0.3); ctx.lineTo(0.26, -0.5);
    ctx.strokeStyle = shade(MAT.paper, 0.35);
    ctx.lineWidth = 0.025;
    ctx.stroke();
    if (heart) {
      // a heart doodled on the top one, in her lipstick red
      ctx.beginPath();
      ctx.moveTo(0.11, -0.19);
      ctx.bezierCurveTo(-0.03, -0.27, -0.01, -0.39, 0.11, -0.32);
      ctx.bezierCurveTo(0.23, -0.39, 0.25, -0.27, 0.11, -0.19);
      ctx.fillStyle = INK.oxblood;
      ctx.fill();
    }
    ctx.restore();
  };
  env(-0.13, 0.02, -0.34, false);
  env(0.14, 0.0, 0.3, false);
  env(0, 0.08, -0.04, true);
  // the ribbon round them, tied in a bow at the side
  ctx.beginPath();
  ctx.rect(X - 0.27, Y - 0.1, 0.54, 0.06);
  paint(ctx, INK.oxblood, { lw: 0.02 });
  const bx = X - 0.17, by = Y - 0.08;
  ctx.beginPath();
  ctx.ellipse(bx - 0.08, by - 0.02, 0.08, 0.045, -0.5, 0, Math.PI * 2);
  ctx.ellipse(bx + 0.08, by - 0.02, 0.08, 0.045, 0.5, 0, Math.PI * 2);
  paint(ctx, INK.oxblood, { lw: 0.02 });
  ctx.beginPath();
  ctx.moveTo(bx, by); ctx.lineTo(bx - 0.08, by + 0.15);
  ctx.moveTo(bx, by); ctx.lineTo(bx + 0.06, by + 0.14);
  ctx.strokeStyle = INK.oxblood;
  ctx.lineWidth = 0.035;
  ctx.stroke();
}

// The wicker loveseat: camelback, velvet cushions, one knocked askew.
function bench(ctx) {
  const x0 = 7.05, x1 = 10.95, dark = shade(WICKER, 0.3);
  for (const [lx, ly] of [[7.2, 9.1], [10.7, 9.1]]) box(ctx, lx, ly, 0, 0.1, 0.1, 0.4, dark, { flat: true, lw: 0.03 });
  // the camelback: a woven panel along the back
  const back = [];
  for (let i = 0; i <= 12; i++) {
    const x = x0 + ((x1 - x0) * i) / 12;
    back.push([x, 9.2, 1.5 + 0.35 * Math.sin((Math.PI * i) / 12)]);
  }
  face(ctx, [[x0, 9.2, 0.7], [x1, 9.2, 0.7], ...back.slice().reverse()], WICKER, { dots: shade(WICKER, 0.45), density: 0.2, lw: 0.04 });
  if (Q.detail) {
    ctx.beginPath();
    for (let i = -6; i < 16; i++) {
      for (const s of [1, -1]) {
        const xa = x0 + i * 0.3, xb = xa + s * 0.9;
        const za = 0.72, zb = 1.62;
        const [A, B] = [P(xa, 9.2, za), P(xb, 9.2, zb)];
        ctx.moveTo(A[0], A[1]);
        ctx.lineTo(B[0], B[1]);
      }
    }
    ctx.save();
    const clip = new Path2D();
    back.forEach(([x, y, z], i) => { const [X, Y] = P(x, y, z); if (i) clip.lineTo(X, Y); else clip.moveTo(X, Y); });
    for (const [x, y, z] of [[x1, 9.2, 0.7], [x0, 9.2, 0.7]]) { const [X, Y] = P(x, y, z); clip.lineTo(X, Y); }
    ctx.clip(clip);
    ctx.strokeStyle = alpha(shade(WICKER, 0.45), 0.6);
    ctx.lineWidth = 0.02;
    ctx.stroke();
    ctx.restore();
  }
  // a rolled rim along the top of the back
  ctx.beginPath();
  back.forEach(([x, y, z], i) => { const [X, Y] = P(x, y, z); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.16;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.strokeStyle = tint(WICKER, 0.15);
  ctx.lineWidth = 0.1;
  ctx.stroke();
  // seat
  box(ctx, x0, 9.2, 0.38, x1 - x0, 1.1, 0.36, WICKER, { dotsL: shade(WICKER, 0.5), lw: 0.04 });
  if (Q.detail) {
    ctx.beginPath();
    for (let x = x0 + 0.12; x < x1; x += 0.16) {
      const [A, B] = [P(x, 10.3, 0.4), P(x, 10.3, 0.72)];
      ctx.moveTo(A[0], A[1]);
      ctx.lineTo(B[0], B[1]);
    }
    ctx.strokeStyle = alpha(shade(WICKER, 0.5), 0.55);
    ctx.lineWidth = 0.02;
    ctx.stroke();
  }
  for (const [lx, ly] of [[7.2, 10.12], [10.7, 10.12]]) box(ctx, lx, ly, 0, 0.1, 0.1, 0.4, dark, { flat: true, lw: 0.03 });
  // cushions: one straight, one knocked askew
  box(ctx, 7.35, 9.3, 0.74, 1.6, 0.95, 0.15, MAT.velvet, { top: tint(MAT.velvet, 0.12), lw: 0.035 });
  face(ctx, [[9.1, 9.28, 0.74], [10.7, 9.4, 0.74], [10.62, 10.3, 0.8], [9.02, 10.2, 0.8]], shade(MAT.velvet, 0.2), { lw: 0.03 });
  face(ctx, [[9.1, 9.28, 0.9], [10.7, 9.4, 0.9], [10.62, 10.3, 0.96], [9.02, 10.2, 0.96]], tint(MAT.velvet, 0.1), { lw: 0.035 });
  // arms, rolled
  for (const ax of [7.0, 10.68]) {
    box(ctx, ax, 9.15, 0.74, 0.32, 1.15, 0.42, WICKER, { dotsL: shade(WICKER, 0.5), lw: 0.035 });
    const [X, Y] = P(ax + 0.16, 10.3, 1.16);
    ctx.beginPath();
    ctx.ellipse(X, Y, 0.2, 0.12, 0, 0, Math.PI * 2);
    paint(ctx, tint(WICKER, 0.1), { lw: 0.03 });
  }
  // a saucer for the candle
  disc(ctx, 9.0, 9.6, 0.92, 0.14, MAT.silver, { lw: 0.02 });
}

// The goldfish pond, with a fountain in the middle.
const POND = { x: 9.8, y: 5.4, r: 1.8, h: 0.45 };

function pondAndFountain(ctx, t, watch) {
  const { x: cx, y: cy, r, h } = POND;
  cylinder(ctx, cx, cy, 0, r, h, MAT.stone, { top: tint(MAT.stone, 0.12) });
  const [X, Y] = P(cx, cy, h);
  const rw = (r - 0.22) * Math.SQRT2;
  if (Q.detail) {
    ctx.beginPath();
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      ctx.moveTo(X + Math.cos(a) * rw, Y + (Math.sin(a) * rw) / 2);
      ctx.lineTo(X + Math.cos(a) * r * Math.SQRT2, Y + (Math.sin(a) * r * Math.SQRT2) / 2);
    }
    ctx.strokeStyle = shade(MAT.stone, 0.3);
    ctx.lineWidth = 0.02;
    ctx.stroke();
  }
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(X, Y + 0.03, rw, rw / 2, 0, 0, Math.PI * 2);
  paint(ctx, WATER, { dots: shade(WATER, 0.45), density: 0.22, lw: 0.035 });
  ctx.clip();
  // the inside of the rim, in shadow at the back
  ctx.beginPath();
  ctx.ellipse(X, Y - 0.12, rw, rw / 2, 0, Math.PI, 0);
  ctx.ellipse(X, Y + 0.03, rw, rw / 2, 0, 0, Math.PI, true);
  ctx.fillStyle = alpha(C.ink, 0.25);
  ctx.fill();
  const S = (x, y) => P(x, y, h - 0.02);
  // lily pads
  for (const [lx, ly, lr, flower] of [[cx + 0.95, cy + 0.5, 0.3, false], [cx - 1.0, cy - 0.2, 0.26, true], [cx + 0.2, cy - 1.15, 0.24, false]]) {
    const [PX, PY] = S(lx, ly);
    ctx.beginPath();
    ctx.moveTo(PX, PY);
    ctx.ellipse(PX, PY, lr * 1.4, lr * 0.7, 0, 0.35, Math.PI * 2 - 0.1);
    ctx.closePath();
    paint(ctx, LEAF, { dots: shade(LEAF, 0.4), density: 0.15, lw: 0.025 });
    if (flower) {
      ctx.beginPath();
      for (let p = 0; p < 6; p++) {
        const a = (p / 6) * Math.PI * 2;
        ctx.moveTo(PX + Math.cos(a) * 0.08, PY - 0.08 + Math.sin(a) * 0.04);
        ctx.ellipse(PX + Math.cos(a) * 0.08, PY - 0.08 + Math.sin(a) * 0.04, 0.07, 0.04, a, 0, Math.PI * 2);
      }
      paint(ctx, mix(INK.bone, C.pink, 0.35), { lw: 0.015 });
    }
  }
  // the frog on the near pad, croaking now and then
  {
    const [FX, FY] = S(cx + 0.95, cy + 0.5);
    const croak = Math.max(0, Math.sin(((t % 5) / 5) * Math.PI * 2 * 2.5)) * (t % 5 < 1 ? 1 : 0);
    ctx.beginPath();
    ctx.ellipse(FX + 0.05, FY - 0.1, 0.13, 0.09, 0, 0, Math.PI * 2);
    paint(ctx, mix(MAT.leaf, INK.candleGold, 0.2), { lw: 0.02 });
    if (croak > 0.05) {
      ctx.beginPath();
      ctx.arc(FX + 0.14, FY - 0.06, 0.04 + 0.05 * croak, 0, Math.PI * 2);
      paint(ctx, INK.bone, { lw: 0.015 });
    }
    ctx.beginPath();
    ctx.arc(FX - 0.02, FY - 0.19, 0.035, 0, Math.PI * 2);
    ctx.arc(FX + 0.1, FY - 0.19, 0.035, 0, Math.PI * 2);
    paint(ctx, mix(MAT.leaf, INK.candleGold, 0.2), { lw: 0.015 });
  }
  // goldfish: round and round, or lined up at the near edge to watch the show
  for (let i = 0; i < 4; i++) {
    const a = t * (0.5 + i * 0.13) * (i % 2 ? 1 : -1) + i * 1.7;
    const rr = 0.75 + i * 0.17;
    let fx = cx + Math.cos(a) * rr, fy = cy + Math.sin(a) * rr * 0.9;
    let dirX = -Math.sin(a) * (i % 2 ? 1 : -1), dirY = Math.cos(a) * (i % 2 ? 1 : -1);
    if (watch > 0) {
      const ga = 1.75 + (i - 1.5) * 0.3;
      const gx = cx + Math.cos(ga) * 1.2 + Math.sin(t * 2 + i) * 0.04, gy = cy + Math.sin(ga) * 1.2;
      fx += (gx - fx) * watch;
      fy += (gy - fy) * watch;
      dirX += (Math.cos(ga) - dirX) * watch;
      dirY += (Math.sin(ga) - dirY) * watch;
    }
    const [FX, FY] = S(fx, fy);
    const sx = dirX - dirY, sy = (dirX + dirY) / 2, sl = Math.hypot(sx, sy) || 1;
    const ang = Math.atan2(sy / sl, sx / sl);
    ctx.save();
    ctx.translate(FX, FY);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.12, 0.055, 0, 0, Math.PI * 2);
    ctx.moveTo(-0.1, 0);
    ctx.lineTo(-0.2, -0.06 + Math.sin(t * 9 + i) * 0.02);
    ctx.lineTo(-0.2, 0.06 + Math.sin(t * 9 + i) * 0.02);
    ctx.closePath();
    ctx.fillStyle = FISH;
    ctx.fill();
    ctx.restore();
  }
  // ripples where the fountain's water lands
  if (Q.detail) {
    for (let i = 0; i < 2; i++) {
      const k = ((t * 0.7 + i * 0.5) % 1);
      ctx.beginPath();
      ctx.ellipse(X, Y, (0.45 + k * 0.9) * Math.SQRT2, ((0.45 + k * 0.9) * Math.SQRT2) / 2, 0, 0, Math.PI * 2);
      ctx.strokeStyle = alpha(INK.bone, 0.45 * (1 - k));
      ctx.lineWidth = 0.03;
      ctx.stroke();
    }
  }
  ctx.restore();

  // The fountain: a pedestal, a shallow bowl, a jet, and water over the lip.
  cylinder(ctx, cx, cy, h - 0.05, 0.3, 0.12, MAT.stone, { top: tint(MAT.stone, 0.1) });
  cylinder(ctx, cx, cy, h, 0.14, 0.95, MAT.stone, { top: tint(MAT.stone, 0.1) });
  cylinder(ctx, cx, cy, 0.85, 0.22, 0.1, MAT.stone, { top: tint(MAT.stone, 0.1) });
  const bz = 1.4;
  const [BX, BY] = P(cx, cy, bz);
  const br = 0.7 * Math.SQRT2;
  ctx.beginPath();
  ctx.moveTo(BX - br, BY);
  ctx.bezierCurveTo(BX - br * 0.8, BY + 0.4, BX - 0.2, BY + 0.45, BX, BY + 0.45);
  ctx.bezierCurveTo(BX + 0.2, BY + 0.45, BX + br * 0.8, BY + 0.4, BX + br, BY);
  ctx.closePath();
  paint(ctx, MAT.stone, { dots: MAT.stoneDark, density: 0.25, lw: 0.035 });
  ctx.beginPath();
  ctx.ellipse(BX, BY, br, br / 2, 0, 0, Math.PI * 2);
  paint(ctx, tint(MAT.stone, 0.15), { lw: 0.035 });
  ctx.beginPath();
  ctx.ellipse(BX, BY + 0.02, br * 0.84, br * 0.4, 0, 0, Math.PI * 2);
  paint(ctx, tint(WATER, 0.15), { lw: 0.02 });
  // water spilling over the front of the bowl
  ctx.save();
  ctx.setLineDash([0.1, 0.14]);
  ctx.lineDashOffset = -t * 1.6;
  ctx.beginPath();
  for (let i = 0; i < 9; i++) {
    const a = 0.15 + (i / 8) * (Math.PI - 0.3);
    const x1 = BX + Math.cos(a) * br, y1 = BY + (Math.sin(a) * br) / 2;
    const x2 = X + Math.cos(a) * br * 1.12, y2 = Y + (Math.sin(a) * br * 1.12) / 2;
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(x1 + Math.cos(a) * 0.15, y1 + 0.05, x2, y2);
  }
  ctx.strokeStyle = alpha(INK.bone, 0.6);
  ctx.lineWidth = 0.035;
  ctx.stroke();
  ctx.restore();
  // the jet, and its drops falling back into the bowl
  const top = P(cx, cy, bz + 0.95);
  ctx.beginPath();
  ctx.moveTo(BX, BY);
  ctx.lineTo(top[0], top[1]);
  ctx.strokeStyle = alpha(INK.bone, 0.75);
  ctx.lineWidth = 0.05;
  ctx.stroke();
  if (Q.detail) {
    ctx.fillStyle = alpha(INK.bone, 0.8);
    for (let i = 0; i < 8; i++) {
      const k = ((t * 1.3 + i / 8) % 1);
      const a = (i / 8) * Math.PI * 2;
      const d = k * 0.5;
      const zz = bz + 0.95 + Math.sin(k * Math.PI) * 0.18 - k * k * 0.9;
      const [DX, DY] = P(cx + Math.cos(a) * d, cy + Math.sin(a) * d, zz);
      ctx.beginPath();
      ctx.arc(DX, DY, 0.03, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// The rose bush that was "pruned nightly". It has never met a pair of shears.
const ROSE = { x: 14.9, y: 9.6 };
function roseBush(ctx, t) {
  const bx = ROSE.x, by = ROSE.y;
  box(ctx, bx - 0.6, by - 0.6, 0, 1.2, 1.2, 0.62, mix(INK.verdigris, INK.bone, 0.35), { dotsL: shade(INK.verdigris, 0.3), lw: 0.04 });
  for (const [fx, fy] of [[bx - 0.6, by - 0.6], [bx + 0.6, by - 0.6], [bx - 0.6, by + 0.6], [bx + 0.6, by + 0.6]]) {
    const [X, Y] = P(fx, fy, 0.72);
    ctx.beginPath();
    ctx.arc(X, Y, 0.08, 0, Math.PI * 2);
    paint(ctx, INK.bone, { lw: 0.02 });
  }
  ctx.save();
  ctx.translate(-(by + 0.6), (by + 0.6) / 2);
  paintText(ctx, 'right', bx, 0.42, 'PRUNED', 0.17, INK.oxblood);
  paintText(ctx, 'right', bx, 0.22, 'NIGHTLY', 0.17, INK.oxblood);
  ctx.restore();
  const [X, Y] = P(bx, by, 0.62);
  const sw = Math.sin(t * 1.2 + 2) * 0.05;
  // stems every which way
  const stems = [];
  for (let i = 0; i < 13; i++) {
    // (not too far to the left: the fig leaf is on the floor over there)
    const a = -Math.PI / 2 - 1.15 + hash(i, 61) * 2.85;
    const L = 0.9 + hash(i, 62) * 1.5;
    const ex = X + Math.cos(a) * L + sw * L, ey = Y + Math.sin(a) * L * 0.9 + (Math.abs(a + Math.PI / 2) > 1.1 ? 0.5 : 0);
    const cx = X + Math.cos(a) * L * 0.4 + (hash(i, 63) - 0.5) * 0.8, cy = Y - L * 0.6;
    stems.push([cx, cy, ex, ey]);
  }
  ctx.beginPath();
  for (const [cx, cy, ex, ey] of stems) {
    ctx.moveTo(X, Y);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
  }
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.07;
  ctx.stroke();
  ctx.strokeStyle = LEAF_D;
  ctx.lineWidth = 0.035;
  ctx.stroke();
  // leaves along the stems, and roses at the ends
  ctx.beginPath();
  stems.forEach(([cx, cy, ex, ey], i) => {
    for (const k of [0.45, 0.7, 0.88]) {
      const u = 1 - k;
      const lx = u * u * X + 2 * u * k * cx + k * k * ex, ly = u * u * Y + 2 * u * k * cy + k * k * ey;
      const o = (i + k * 10) % 2 ? 0.08 : -0.08;
      ctx.moveTo(lx + o + 0.07, ly);
      ctx.ellipse(lx + o, ly, 0.07, 0.045, o * 4, 0, Math.PI * 2);
    }
  });
  paint(ctx, LEAF_D, { lw: 0.015 });
  stems.forEach(([cx, cy, ex, ey], i) => {
    if (i % 2) return;
    ctx.beginPath();
    ctx.arc(ex, ey, 0.12, 0, Math.PI * 2);
    paint(ctx, INK.oxblood, { dots: shade(INK.oxblood, 0.5), density: 0.2, lw: 0.025 });
    if (Q.detail) {
      ctx.beginPath();
      ctx.arc(ex, ey, 0.06, 0.5, 5.5);
      ctx.strokeStyle = shade(INK.oxblood, 0.4);
      ctx.lineWidth = 0.02;
      ctx.stroke();
    }
  });
}

// The only happy plant in the room: it's under the leak in the roof.
const LEAK = { x: 14.2, y: 6.6 };
function monstera(ctx, t, bounce) {
  const [X, Y] = pot(ctx, LEAK.x, LEAK.y, 0, 0.45, 0.55, MAT.terracotta);
  const LEAVES = [
    [-0.7, -0.75, -0.9, 0.42], [0.7, -0.7, 0.85, 0.42], [-0.45, -1.35, -0.45, 0.46], [0.5, -1.4, 0.4, 0.46], [0.02, -1.95, 0, 0.5],
  ];
  const sw = Math.sin(t * 1.2 + 5) * 0.02;
  for (const [dx, dy, a, s] of LEAVES) {
    const top = dy < -1.9;
    const lx = X + dx + sw, ly = Y + dy + (top ? bounce : 0);
    ctx.beginPath();
    ctx.moveTo(X, Y);
    ctx.quadraticCurveTo(X + dx * 0.3, Y + dy * 0.6, lx, ly);
    ctx.strokeStyle = LEAF_D;
    ctx.lineWidth = 0.04;
    ctx.stroke();
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(a + (top ? bounce * 2 : 0));
    ctx.beginPath();
    ctx.moveTo(0, 0.05);
    ctx.bezierCurveTo(-0.62 * s * 1.6, 0, -0.55 * s * 1.6, -0.95 * s * 1.6, 0, -1.0 * s * 1.6);
    ctx.bezierCurveTo(0.55 * s * 1.6, -0.95 * s * 1.6, 0.62 * s * 1.6, 0, 0, 0.05);
    paint(ctx, LUSH, { dots: shade(LUSH, 0.4), density: 0.12, lw: 0.03 });
    if (Q.detail) {
      ctx.beginPath();
      for (const k of [0.3, 0.55, 0.78]) {
        const yy = -k * s * 1.6;
        for (const sd of [-1, 1]) {
          ctx.moveTo(sd * 0.45 * s * 1.6 * Math.sin(Math.PI * (k * 0.9 + 0.05)), yy);
          ctx.lineTo(sd * 0.22 * s * 1.6 * Math.sin(Math.PI * (k * 0.9 + 0.05)), yy + 0.03);
        }
      }
      ctx.strokeStyle = shade(LUSH, 0.45);
      ctx.lineWidth = 0.035;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -0.95 * s * 1.6);
      ctx.strokeStyle = tint(LUSH, 0.25);
      ctx.lineWidth = 0.02;
      ctx.stroke();
    }
    ctx.restore();
  }
}

// The garden gnome. While the two of them are in here it covers its eyes, and
// like them, it only changes pose in a flash.
function gnome(ctx, x, y, covering) {
  const [X, Y] = P(x, y, 0);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(-1.3, 1.3);
  if (Q.detail) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.3, 0.12, 0, 0, Math.PI * 2);
    ctx.fillStyle = alpha(C.ink, 0.2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(-0.09, -0.03, 0.1, 0.05, 0, 0, Math.PI * 2);
  ctx.ellipse(0.11, -0.03, 0.1, 0.05, 0, 0, Math.PI * 2);
  ctx.fillStyle = C.ink;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-0.2, -0.05);
  ctx.quadraticCurveTo(-0.26, -0.42, -0.11, -0.5);
  ctx.lineTo(0.13, -0.5);
  ctx.quadraticCurveTo(0.28, -0.42, 0.21, -0.05);
  ctx.closePath();
  paint(ctx, INK.verdigris, { dots: shade(INK.verdigris, 0.4), density: 0.15, lw: 0.03 });
  ctx.fillStyle = C.ink;
  ctx.fillRect(-0.22, -0.2, 0.44, 0.05);
  ctx.fillStyle = MAT.brass;
  ctx.fillRect(-0.04, -0.21, 0.08, 0.07);
  // beard, face, nose
  ctx.beginPath();
  ctx.moveTo(-0.13, -0.56);
  ctx.quadraticCurveTo(-0.14, -0.3, 0.01, -0.22);
  ctx.quadraticCurveTo(0.16, -0.3, 0.15, -0.56);
  ctx.closePath();
  paint(ctx, INK.bone, { lw: 0.025 });
  ctx.beginPath();
  ctx.arc(0.01, -0.62, 0.12, 0, Math.PI * 2);
  paint(ctx, SKIN[0], { lw: 0.025 });
  ctx.beginPath();
  ctx.arc(0.05, -0.58, 0.05, 0, Math.PI * 2);
  paint(ctx, mix(SKIN[0], INK.oxblood, 0.35), { lw: 0.02 });
  // hat, its tip flopped over
  ctx.beginPath();
  ctx.moveTo(-0.15, -0.66);
  ctx.quadraticCurveTo(-0.08, -0.98, 0.1, -1.04);
  ctx.lineTo(0.14, -0.98);
  ctx.quadraticCurveTo(0.08, -0.9, 0.17, -0.66);
  ctx.closePath();
  paint(ctx, INK.oxblood, { dots: shade(INK.oxblood, 0.4), density: 0.15, lw: 0.025 });
  const arm = (x0, y0, x1, y1) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineCap = 'round';
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.12;
    ctx.stroke();
    ctx.strokeStyle = INK.verdigris;
    ctx.lineWidth = 0.07;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x1, y1, 0.055, 0, Math.PI * 2);
    paint(ctx, SKIN[0], { lw: 0.02 });
  };
  if (covering) {
    arm(-0.17, -0.44, -0.05, -0.66);
    arm(0.19, -0.44, 0.08, -0.66);
  } else {
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(-0.03, -0.65, 0.018, 0, Math.PI * 2);
    ctx.arc(0.07, -0.65, 0.018, 0, Math.PI * 2);
    ctx.fill();
    arm(-0.18, -0.42, -0.1, -0.28);
    arm(0.2, -0.42, 0.12, -0.28);
  }
  ctx.restore();
}

// A fern that has clearly seen things. Wide eyes, fronds swept back, and a
// flinch at every flash.
function witnessFern(ctx, t, startle, tremble) {
  const x = 6.3, y = 13.6;
  box(ctx, x - 0.3, y - 0.3, 0, 0.6, 0.6, 0.36, MAT.oak, { lw: 0.035 });
  const [X0, Y] = pot(ctx, x, y, 0.36, 0.3, 0.34, MAT.terracotta);
  const X = X0 + (tremble ? Math.sin(t * 47) * 0.012 : 0);
  const fr = (i) => {
    const a = -Math.PI / 2 - 0.25 + (i - 3.5) * 0.34 * (1 - startle * 0.45) - startle * 0.1;
    frond(ctx, X, Y, a, 0.85 + (i % 3) * 0.1 + startle * 0.2, (1 - startle) * (0.22 + Math.abs(i - 3.5) * 0.09), 0.13, i % 2 ? LEAF : WILT, 0.03);
  };
  for (let i = 0; i < 8; i++) if (i !== 3 && i !== 4) fr(i);
  const er = 0.15 * (1 + startle * 0.4);
  for (const dx of [-0.15, 0.15]) {
    ctx.beginPath();
    ctx.ellipse(X + dx, Y - 0.44, er, er * 1.2, 0, 0, Math.PI * 2);
    paint(ctx, INK.bone, { lw: 0.035 });
    ctx.beginPath();
    ctx.arc(X + dx + 0.05, Y - 0.48, 0.05 * (1 - startle * 0.4), 0, Math.PI * 2);
    ctx.fillStyle = C.ink;
    ctx.fill();
  }
  fr(3);
  fr(4);
}

// A Persian rug in front of the loveseat: the stage the two of them pose on.
function stageRug(ctx) {
  const x0 = 6.6, y0 = 10.7, w = 5.0, d = 2.5;
  const flat = (fn) => onFloor(ctx, 0.012, () => { ctx.beginPath(); fn(); });
  flat(() => ctx.rect(x0, y0, w, d));
  paint(ctx, INK.bone, { lw: 0.03 });
  flat(() => ctx.rect(x0 + 0.2, y0 + 0.2, w - 0.4, d - 0.4));
  paint(ctx, MAT.velvetDark, { dots: shade(MAT.velvetDark, 0.45), density: 0.18, stroke: false });
  flat(() => ctx.rect(x0 + 0.34, y0 + 0.34, w - 0.68, d - 0.68));
  ctx.strokeStyle = INK.candleGold;
  ctx.lineWidth = 0.04;
  ctx.stroke();
  // the medallion, and a little one in each corner
  const cx = x0 + w / 2, cy = y0 + d / 2;
  flat(() => {
    ctx.moveTo(cx - 1.1, cy); ctx.lineTo(cx, cy - 0.72); ctx.lineTo(cx + 1.1, cy); ctx.lineTo(cx, cy + 0.72); ctx.closePath();
  });
  paint(ctx, INK.deepPlum, { lw: 0.03, stroke: INK.candleGold });
  flat(() => {
    ctx.moveTo(cx - 0.5, cy); ctx.lineTo(cx, cy - 0.33); ctx.lineTo(cx + 0.5, cy); ctx.lineTo(cx, cy + 0.33); ctx.closePath();
  });
  paint(ctx, INK.verdigris, { lw: 0.02, stroke: INK.candleGold });
  flat(() => {
    for (const [px, py] of [[x0 + 0.75, y0 + 0.6], [x0 + w - 0.75, y0 + 0.6], [x0 + 0.75, y0 + d - 0.6], [x0 + w - 0.75, y0 + d - 0.6]]) {
      ctx.moveTo(px - 0.25, py); ctx.lineTo(px, py - 0.17); ctx.lineTo(px + 0.25, py); ctx.lineTo(px, py + 0.17); ctx.closePath();
    }
  });
  ctx.fillStyle = INK.candleGold;
  ctx.fill();
  if (!Q.detail) return;
  // fringe on the short ends
  flat(() => {
    for (let j = 0.1; j < d; j += 0.16) {
      ctx.moveTo(x0, y0 + j); ctx.lineTo(x0 - 0.14, y0 + j);
      ctx.moveTo(x0 + w, y0 + j); ctx.lineTo(x0 + w + 0.14, y0 + j);
    }
  });
  ctx.strokeStyle = INK.bone;
  ctx.lineWidth = 0.02;
  ctx.stroke();
}

// A brass birdcage on a stand, and a canary who sings through the whole
// affair. It flaps at every flash. (The talking bird is the Brigadier's
// parrot, upstairs; this one keeps its opinions to itself.)
const PARROT = mix(INK.candleGold, INK.bone, 0.25);
const CAGE = { x: 15.2, y: 4.9 };
// When it sings (seconds into the evening): a long song while the two of
// them are out here, and a verse now and then all night.
const PARROT_LINES = [[62, 94, 'song'], [22, 25.5, 'song'], [138, 141.5, 'song']];
function parrotSays(t) {
  const tt = mod(t);
  for (const [a, b, line] of PARROT_LINES) if (tt >= a && tt < b) return line;
  return null;
}
function birdcage(ctx, t, x, y, flap, line) {
  const [X, Y] = P(x, y, 0);
  const brass = MAT.brass, dark = MAT.brassDark;
  // stand: three feet and a pole
  ctx.beginPath();
  ctx.moveTo(X - 0.38, Y + 0.06); ctx.lineTo(X, Y - 0.3); ctx.lineTo(X + 0.38, Y + 0.06);
  ctx.moveTo(X + 0.05, Y + 0.16); ctx.lineTo(X, Y - 0.3);
  ctx.moveTo(X, Y - 0.3); ctx.lineTo(X, Y - 1.95);
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.11;
  ctx.stroke();
  ctx.strokeStyle = dark;
  ctx.lineWidth = 0.06;
  ctx.stroke();
  const base = Y - 1.95, top = base - 0.95, rx = 0.46, ry = 0.15;
  // the cage floor, and the bars at the back
  ctx.beginPath();
  ctx.ellipse(X, base, rx, ry, 0, 0, Math.PI * 2);
  paint(ctx, dark, { lw: 0.03 });
  ctx.beginPath();
  for (let i = 0; i < 9; i++) {
    const bx = X + Math.cos(Math.PI + (i / 8) * Math.PI) * rx;
    ctx.moveTo(bx, base - Math.sin((i / 8) * Math.PI) * ry);
    ctx.lineTo(bx, top);
  }
  ctx.strokeStyle = alpha(dark, 0.8);
  ctx.lineWidth = 0.02;
  ctx.stroke();
  // the perch, and the canary on it
  ctx.beginPath();
  ctx.moveTo(X - 0.35, base - 0.35);
  ctx.lineTo(X + 0.35, base - 0.35);
  ctx.strokeStyle = MAT.oak;
  ctx.lineWidth = 0.04;
  ctx.stroke();
  const py = base - 0.37, bob = Math.abs(Math.sin(t * 3)) * 0.02 * (line ? 3 : 1);
  ctx.save();
  ctx.translate(X - 0.02, py - bob);
  // tail
  ctx.beginPath();
  ctx.moveTo(-0.05, -0.05); ctx.lineTo(-0.16, 0.26); ctx.lineTo(-0.04, 0.26); ctx.lineTo(0.04, -0.02);
  ctx.closePath();
  paint(ctx, MAT.brassDark, { lw: 0.02 });
  // wings out when it flaps
  if (flap > 0.05) {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, -0.2);
      ctx.lineTo(s * (0.2 + 0.18 * flap), -0.32 - 0.15 * flap);
      ctx.lineTo(s * 0.12, -0.08);
      ctx.closePath();
      paint(ctx, shade(PARROT, 0.15), { lw: 0.02 });
    }
  }
  ctx.beginPath();
  ctx.ellipse(0, -0.16, 0.1, 0.16, 0.15, 0, Math.PI * 2);
  paint(ctx, PARROT, { dots: shade(PARROT, 0.4), density: 0.15, lw: 0.025 });
  ctx.beginPath();
  ctx.arc(0.04, -0.34, 0.085, 0, Math.PI * 2);
  paint(ctx, PARROT, { lw: 0.025 });
  // beak: open when it talks
  ctx.beginPath();
  ctx.moveTo(0.1, -0.37); ctx.quadraticCurveTo(0.2, -0.36, 0.15, -0.27 + (line ? 0.03 : 0)); ctx.lineTo(0.1, -0.31);
  ctx.closePath();
  paint(ctx, INK.bone, { lw: 0.015 });
  if (line) {
    ctx.beginPath();
    ctx.moveTo(0.1, -0.28); ctx.lineTo(0.16, -0.24); ctx.lineTo(0.09, -0.25);
    paint(ctx, INK.bone, { lw: 0.012 });
  }
  ctx.beginPath();
  ctx.arc(0.06, -0.36, 0.025, 0, Math.PI * 2);
  ctx.fillStyle = C.ink;
  ctx.fill();
  ctx.restore();
  // the front bars, the dome and the ring
  ctx.beginPath();
  for (let i = 0; i < 9; i++) {
    const bx = X + Math.cos(Math.PI - (i / 8) * Math.PI) * rx;
    ctx.moveTo(bx, base + Math.sin((i / 8) * Math.PI) * ry);
    ctx.lineTo(bx, top);
    ctx.quadraticCurveTo(bx * 0.6 + X * 0.4, top - 0.3, X, top - 0.38);
  }
  ctx.strokeStyle = brass;
  ctx.lineWidth = 0.028;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(X, base, rx, ry, 0, 0, Math.PI);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.07;
  ctx.stroke();
  ctx.strokeStyle = brass;
  ctx.lineWidth = 0.04;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(X, top, rx, ry, 0, 0, Math.PI * 2);
  ctx.strokeStyle = brass;
  ctx.lineWidth = 0.03;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(X, top - 0.45, 0.07, 0, Math.PI * 2);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.05;
  ctx.stroke();
  ctx.strokeStyle = brass;
  ctx.lineWidth = 0.025;
  ctx.stroke();
}

// Potted plants standing on the floor, in their varying states of despair.
function floorPlant(ctx, t, x, y, kind, s = 1) {
  const [X, Y] = pot(ctx, x, y, 0, 0.36 * s, 0.46 * s, kind === 'agave' ? mix(INK.bone, MAT.stone, 0.4) : MAT.terracotta);
  const sw = Math.sin(t * 1.1 + x + y) * 0.03;
  if (kind === 'fern') fern(ctx, X, Y, 1.1 * s, WILT, 0.6, t, 1.1);
  else if (kind === 'aspidistra') {
    // tall dark straps, one of them snapped over
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.2 + sw;
      const L = (0.95 + (i % 3) * 0.2) * s;
      ctx.save();
      ctx.translate(X, Y);
      ctx.rotate(a + Math.PI / 2);
      ctx.beginPath();
      if (i === 5) {
        ctx.moveTo(-0.03, 0); ctx.lineTo(-0.05, -L * 0.55); ctx.lineTo(0.25 * s, -L * 0.3); ctx.lineTo(0.03, -L * 0.5); ctx.lineTo(0.03, 0);
      } else ctx.ellipse(0, -L * 0.5, 0.075 * s, L * 0.5, 0, 0, Math.PI * 2);
      paint(ctx, i % 2 ? LEAF_D : i === 5 ? DEAD : shade(LEAF_D, 0.1), { lw: 0.02 });
      ctx.restore();
    }
  } else if (kind === 'agave') {
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      const L = (0.45 + (i % 2) * 0.15 + (Math.abs(i - 4) < 2 ? 0.2 : 0)) * s;
      ctx.beginPath();
      ctx.moveTo(X - Math.sin(a) * 0.06 * s, Y + Math.cos(a) * 0.03);
      ctx.lineTo(X + Math.cos(a) * L, Y + Math.sin(a) * L * 0.85);
      ctx.lineTo(X + Math.sin(a) * 0.06 * s, Y - Math.cos(a) * 0.03);
      ctx.closePath();
      paint(ctx, mix(MAT.leaf, MAT.stone, 0.35), { lw: 0.02 });
    }
  } else if (kind === 'lily') {
    for (const [a, L] of [[-2.3, 0.6], [-0.9, 0.62], [-1.6, 0.75], [-2.7, 0.45], [-0.4, 0.48]]) {
      ctx.save();
      ctx.translate(X, Y);
      ctx.rotate(a + Math.PI / 2 + sw);
      ctx.beginPath();
      ctx.ellipse(0, -L * 0.55 * s, 0.14 * s, L * 0.5 * s, 0, 0, Math.PI * 2);
      paint(ctx, L > 0.6 ? LEAF : WILT, { dots: shade(LEAF, 0.4), density: 0.12, lw: 0.02 });
      ctx.restore();
    }
    // one white flower, drooping
    ctx.beginPath();
    ctx.moveTo(X, Y);
    ctx.quadraticCurveTo(X + 0.05, Y - 0.8 * s, X + 0.28 * s, Y - 0.62 * s);
    ctx.strokeStyle = LEAF_D;
    ctx.lineWidth = 0.025;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(X + 0.3 * s, Y - 0.55 * s, 0.07 * s, 0.13 * s, -0.5, 0, Math.PI * 2);
    paint(ctx, INK.bone, { lw: 0.02 });
  } else sticks(ctx, X, Y, 1.4 * s);
}

// Terracotta pots, stacked up and tipped over.
function potStack(ctx, x, y) {
  for (let i = 0; i < 4; i++) {
    const [X, Y] = P(x, y, i * 0.16);
    ctx.beginPath();
    ctx.moveTo(X - 0.34 + i * 0.01, Y - 0.26);
    ctx.lineTo(X - 0.25, Y);
    ctx.lineTo(X + 0.25, Y);
    ctx.lineTo(X + 0.34 - i * 0.01, Y - 0.26);
    ctx.closePath();
    paint(ctx, shade(MAT.terracotta, 0.05 * (3 - i)), { dots: shade(MAT.terracotta, 0.5), density: 0.15, lw: 0.025 });
  }
  const [X, Y] = P(x + 0.75, y + 0.35, 0);
  ctx.beginPath();
  ctx.ellipse(X, Y - 0.2, 0.22, 0.2, 0.5, 0, Math.PI * 2);
  paint(ctx, MAT.terracotta, { lw: 0.025 });
  ctx.beginPath();
  ctx.ellipse(X + 0.05, Y - 0.22, 0.12, 0.13, 0.5, 0, Math.PI * 2);
  ctx.fillStyle = shade(MAT.terracotta, 0.45);
  ctx.fill();
}

// The hall door's doorstop: a tortoise. The Lord stuffed him too. His glass
// eye catches the lightning.
function tortoise(ctx, t, x, y) {
  const [X, Y] = P(x, y, 0);
  if (Q.detail) {
    ctx.beginPath();
    ctx.ellipse(X, Y, 0.38, 0.13, 0, 0, Math.PI * 2);
    ctx.fillStyle = alpha(C.ink, 0.2);
    ctx.fill();
  }
  ctx.beginPath();
  for (const lx of [-0.2, 0.18]) {
    ctx.moveTo(X + lx + 0.07, Y - 0.04);
    ctx.ellipse(X + lx, Y - 0.04, 0.07, 0.06, 0, 0, Math.PI * 2);
  }
  ctx.moveTo(X + 0.42, Y - 0.16);
  ctx.ellipse(X + 0.34, Y - 0.16, 0.1, 0.075, -0.3, 0, Math.PI * 2);
  paint(ctx, mix(MAT.leaf, MAT.stone, 0.45), { lw: 0.025 });
  ctx.beginPath();
  ctx.ellipse(X, Y - 0.12, 0.32, 0.22, 0, Math.PI, 0);
  ctx.closePath();
  paint(ctx, MAT.oak, { dots: MAT.furDark, density: 0.25, lw: 0.03 });
  if (Q.detail) {
    ctx.beginPath();
    for (const [a, b] of [[-0.18, -0.26], [0.02, -0.33], [0.2, -0.24]]) {
      ctx.moveTo(X + a + 0.07, Y + b);
      ctx.arc(X + a, Y + b, 0.07, 0, Math.PI * 2);
    }
    ctx.strokeStyle = shade(MAT.oak, 0.45);
    ctx.lineWidth = 0.02;
    ctx.stroke();
  }
  const k = flashK(t);
  ctx.beginPath();
  ctx.arc(X + 0.37, Y - 0.19, 0.03 + 0.02 * k, 0, Math.PI * 2);
  ctx.fillStyle = k > 0.1 ? C.white : C.ink;
  ctx.fill();
}

// A wheelbarrow of everything that's died in here.
function wheelbarrow(ctx) {
  const [X0, Y0] = P(1.4, 15.1, 0);
  ctx.save();
  ctx.translate(X0, Y0);
  ctx.scale(1.35, 1.35);
  const X = 0, Y = 0;
  ctx.beginPath();
  ctx.moveTo(X - 0.8, Y - 0.2); ctx.lineTo(X - 1.3, Y - 0.05);
  ctx.moveTo(X - 0.8, Y - 0.35); ctx.lineTo(X - 1.3, Y - 0.2);
  ctx.moveTo(X - 0.6, Y - 0.25); ctx.lineTo(X - 0.62, Y);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.07;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(X - 0.85, Y - 0.72); ctx.lineTo(X + 0.55, Y - 0.72); ctx.lineTo(X + 0.35, Y - 0.25); ctx.lineTo(X - 0.7, Y - 0.25);
  ctx.closePath();
  paint(ctx, INK.verdigris, { dots: shade(INK.verdigris, 0.45), density: 0.2, lw: 0.035 });
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const lx = X - 0.7 + i * 0.2, ly = Y - 0.75 - Math.sin(i * 1.7) * 0.06;
    ctx.moveTo(lx + 0.14, ly);
    ctx.ellipse(lx, ly, 0.14, 0.08, i * 0.7, 0, Math.PI * 2);
  }
  paint(ctx, DEAD, { lw: 0.02 });
  ctx.beginPath();
  ctx.ellipse(X + 0.42, Y - 0.12, 0.12, 0.16, 0, 0, Math.PI * 2);
  paint(ctx, C.ink);
  ctx.restore();
}

// Champagne on ice, and two glasses: one standing, one fallen.
function champagne(ctx) {
  cylinder(ctx, 11.7, 9.7, 0, 0.2, 0.42, MAT.silver, { top: shade(MAT.silver, 0.25) });
  const [X, Y] = P(11.7, 9.7, 0.4);
  ctx.save();
  ctx.translate(X, Y);
  ctx.rotate(0.35);
  ctx.beginPath();
  ctx.roundRect(-0.09, -0.45, 0.18, 0.45, 0.06);
  ctx.rect(-0.035, -0.68, 0.07, 0.25);
  paint(ctx, mix(INK.verdigris, INK.stormNavy, 0.6), { lw: 0.025 });
  ctx.fillStyle = INK.candleGold;
  ctx.fillRect(-0.04, -0.7, 0.08, 0.1);
  ctx.fillStyle = INK.bone;
  ctx.fillRect(-0.085, -0.3, 0.17, 0.12);
  ctx.restore();
  for (const [gx, gy, fallen] of [[12.2, 10.05, false], [11.95, 10.5, true]]) {
    const [GX, GY] = P(gx, gy, 0);
    ctx.save();
    ctx.translate(GX, GY);
    if (fallen) ctx.rotate(1.35);
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(0, -0.22);
    ctx.moveTo(-0.07, 0); ctx.lineTo(0.07, 0);
    ctx.strokeStyle = alpha(INK.bone, 0.9);
    ctx.lineWidth = 0.025;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -0.26, 0.11, 0.05, 0, 0, Math.PI);
    ctx.closePath();
    ctx.fillStyle = alpha(INK.bone, 0.45);
    ctx.fill();
    ctx.strokeStyle = alpha(INK.bone, 0.9);
    ctx.stroke();
    ctx.restore();
  }
}

// The fig leaf, on the floor, with the string it was tied on with.
function figLeaf(ctx) {
  const x = 12.5, y = 11.5, rot = 0.65;
  const lobes = [[0, 0.36], [0.95, 0.3], [-0.95, 0.3], [1.85, 0.2], [-1.85, 0.2]];
  const r = (a) => 0.14 + lobes.reduce((m, [c, h]) => Math.max(m, h * Math.exp(-(((a - c) / 0.3) ** 2))), 0);
  onFloor(ctx, 0.03, () => {
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const a = -2.75 + (i / 60) * 5.5;
      const rr = r(a) * 1.15;
      if (i) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.lineTo(-0.12, 0);
    ctx.closePath();
  });
  paint(ctx, LEAF, { dots: shade(LEAF, 0.4), density: 0.16, lw: 0.035 });
  onFloor(ctx, 0.03, () => {
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    for (const [c] of lobes) {
      ctx.moveTo(-0.08, 0);
      ctx.lineTo(Math.cos(c) * r(c) * 0.95, Math.sin(c) * r(c) * 0.95);
    }
  });
  ctx.strokeStyle = shade(LEAF, 0.4);
  ctx.lineWidth = 0.025;
  ctx.stroke();
  // the stalk, and the string round it: a loop that went round someone's waist
  onFloor(ctx, 0.03, () => {
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(-0.1, 0);
    ctx.lineTo(-0.3, 0.02);
    ctx.bezierCurveTo(-0.55, 0.3, -0.95, 0.35, -1.0, 0.0);
    ctx.bezierCurveTo(-1.05, -0.35, -0.6, -0.42, -0.34, -0.1);
    ctx.moveTo(-0.3, 0.02);
    ctx.lineTo(-0.42, 0.18);
    ctx.moveTo(-0.3, 0.02);
    ctx.lineTo(-0.44, -0.02);
  });
  ctx.strokeStyle = TWINE;
  ctx.lineWidth = 0.03;
  ctx.stroke();
}

// ---------- The room ----------
export default {
  id: 'conservatory',
  name: 'Conservatory',
  blurb: 'Every flash of lightning catches Lady Philippa and the gardener in a new pose. They say they were pruning.',

  build(R) {
    const [ox, oy] = R.origin;

    // Who's in here, on the evening's clock: the two of them together (both
    // here and standing still), and Lady Philippa at all. Worked out once over
    // the loop, so the room can react without any state.
    const DT = 0.25, N = Math.round(LOOP / DT);
    const who = (id) => R.walkers.find((w) => w.id === id);
    const phil = who('philippa'), gard = who('gardener');
    const here = (w, t) => {
      if (!w) return null;
      const p = w.at(t);
      return R.contains(p.x, p.y, p.z || 0) ? p : null;
    };
    const together = new Float32Array(N), philIn = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const a = here(phil, i * DT), b = here(gard, i * DT);
      together[i] = a && b && !a.moving && !b.moving ? 1 : 0;
      philIn[i] = a ? 1 : 0;
    }
    // How steamed up it is (the glass, the thermometer), and how closely the
    // goldfish are watching: each rises while they're together, and settles after.
    const ease = (rise, fall) => {
      const out = new Float32Array(N);
      let v = 0;
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < N; i++) {
          v = clamp(v + (together[i] ? DT / rise : -DT / fall));
          out[i] = v;
        }
      }
      return out;
    };
    const heat = ease(18, 40), watch = ease(2.5, 4);
    const at = (arr, t) => {
      const x = mod(t) / DT, i = Math.floor(x) % N, j = (i + 1) % N;
      return arr[i] + (arr[j] - arr[i]) * (x - Math.floor(x));
    };
    const step = (arr, t) => arr[Math.floor(mod(t) / DT) % N];
    // Things that, like the two of them, only change in a flash.
    const caught = (arr, t) => step(arr, lastFlash(t) + 0.1);
    const startle = (t) => Math.exp(-(mod(t) - lastFlash(t)) * 2.2);

    // The muddy prints the gardener leaves coming in from outside: each one
    // appears as he steps on it, and they dry up and go before the loop ends.
    const prints = [];
    {
      const path = [[-0.2, 8], [1.3, 8], [9.1, 11.7]];
      let foot = 0;
      for (let s = 0; s < path.length - 1; s++) {
        const [ax, ay] = path[s], [bx, by] = path[s + 1];
        const L = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / L, uy = (by - ay) / L;
        for (let d = s ? 0.21 : 0.3; d < L; d += 0.42) {
          const sd = foot++ % 2 ? 1 : -1;
          prints.push({ x: ax + ux * d - uy * sd * 0.12, y: ay + uy * d + ux * sd * 0.12, a: Math.atan2(uy, ux), t: gard ? Infinity : 0 });
        }
      }
      if (gard) {
        for (let t = 30; t < 70; t += 0.05) {
          const p = gard.at(t);
          const lx = p.x - ox, ly = p.y - oy;
          for (const pr of prints) if (pr.t === Infinity && Math.hypot(pr.x - lx, pr.y - ly) < 0.3) pr.t = t;
        }
        for (const pr of prints) if (pr.t === Infinity) pr.t = 50;
      }
    }

    const GL = { left: glassWall('left'), right: glassWall('right') };
    const FLOOR = new Path2D();
    [P(0, 0), P(16, 0), P(16, 16), P(0, 16)].forEach(([X, Y], i) => (i ? FLOOR.lineTo(X, Y) : FLOOR.moveTo(X, Y)));
    FLOOR.closePath();

    // ---------- Floor ----------
    R.floor((ctx) => {
      slab(ctx, shade(RC.floor, 0.05));
      rect(ctx, 0, 0, 16, 16, 0, TILE_E, { stroke: false });
      rect(ctx, 1, 1, 14, 14, 0, RC.floor, { stroke: false });
      ctx.beginPath();
      for (let i = 1; i < 15; i++) {
        for (let j = 1; j < 15; j++) {
          if ((i + j) % 2) continue;
          const q =[P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)];
          ctx.moveTo(q[0][0], q[0][1]);
          for (let k = 1; k < 4; k++) ctx.lineTo(q[k][0], q[k][1]);
          ctx.closePath();
        }
      }
      ctx.fillStyle = TILE_B;
      ctx.fill();
      if (!Q.detail) return;
      rect(ctx, 0, 0, 16, 16, 0, null, { dots: shade(RC.floor, 0.45), density: 0.08, stroke: false });
      tiles(ctx, 1, alpha(C.ink, 0.14), 0.025);
      ctx.beginPath();
      for (let i = 2; i < 15; i += 2) {
        for (let j = 2; j < 15; j += 2) {
          const q = [P(i - 0.13, j - 0.13), P(i + 0.13, j - 0.13), P(i + 0.13, j + 0.13), P(i - 0.13, j + 0.13)];
          ctx.moveTo(q[0][0], q[0][1]);
          for (let k = 1; k < 4; k++) ctx.lineTo(q[k][0], q[k][1]);
          ctx.closePath();
        }
      }
      ctx.fillStyle = INSET;
      ctx.fill();
    });

    // ---------- Walls: glass, in the storm ----------
    R.walls({ left: GLASS, right: GLASS, cap: BAR, cut: INK.stormNavy, doors: DOORS.conservatory });
    R.wall((ctx) => {
      paintGlass(ctx, GL.left);
      paintGlass(ctx, GL.right);
    });

    // Rain running down the glass, the lightning through it, and the glass
    // steaming up while the two of them are in here (with a heart drawn in it).
    R.wall((ctx, t) => {
      const k = flashK(t);
      const fog = at(heat, t);
      for (const side of ['left', 'right']) {
        const g = GL[side];
        if (k > 0.02) {
          ctx.fillStyle = alpha(NIGHT.flash, 0.85 * k);
          ctx.fill(g.panes);
        }
        if (fog > 0.01) {
          // steam creeping up the glass, thickest low down, with clear
          // trickles where drops have run down through it
          ctx.save();
          ctx.clip(g.panes);
          ctx.beginPath();
          wquad(ctx, side, 0, SILL, 16, (TOP - SILL) * Math.min(1, fog * 1.3));
          ctx.fillStyle = alpha(INK.bone, 0.3 * fog);
          ctx.fill();
          ctx.beginPath();
          wquad(ctx, side, 0, SILL, 16, (TRANSOM - SILL) * Math.min(1, fog * 1.6));
          ctx.fillStyle = alpha(INK.bone, 0.25 * fog);
          ctx.fill();
          if (fog > 0.3 && Q.detail) {
            ctx.beginPath();
            g.bays.forEach(([a, b], i) => {
              for (let j = 0; j < 2; j++) {
                const u = a + 0.2 + hash(i * 3 + j, side === 'left' ? 51 : 53) * (b - a - 0.4);
                const z0 = SILL + 0.6 + hash(i * 3 + j, 55) * 1.8 * fog;
                wline(ctx, side, [[u, z0], [u + 0.03, (z0 + SILL) / 2], [u, SILL]]);
              }
            });
            ctx.strokeStyle = alpha(GLASS, 0.75 * fog);
            ctx.lineWidth = 0.05;
            ctx.stroke();
          }
          ctx.restore();
        }
      }
      // A bolt, seen through the glass, when the storm strikes.
      const s = storm.strike(t);
      if (s && s.age < 0.45) {
        const side = s.i % 2 ? 'left' : 'right';
        const g = GL[side];
        const u0 = 2 + s.x * 12;
        const pts = [[u0, TOP]];
        for (let i = 1; i <= 7; i++) pts.push([u0 + (hash(s.i + 3, i) - 0.5) * 1.6 + i * 0.12, TOP - (i / 7) * (TOP - 1.6)]);
        ctx.save();
        ctx.clip(g.panes);
        ctx.beginPath();
        wline(ctx, side, pts);
        wline(ctx, side, [pts[3], [pts[3][0] + 1.1, pts[3][1] - 1.2]]);
        ctx.lineJoin = 'round';
        ctx.strokeStyle = alpha(C.white, 0.35 * (1 - s.age / 0.45));
        ctx.lineWidth = 0.3;
        ctx.stroke();
        ctx.strokeStyle = alpha(C.white, 1 - s.age / 0.45);
        ctx.lineWidth = 0.08;
        ctx.stroke();
        ctx.restore();
      }
      if (k > 0.02) {
        for (const side of ['left', 'right']) strokeTracery(ctx, GL[side]);
      }
      if (Q.detail) {
        // Rain on the glass: streaks sliding down, each with a bead at its foot.
        ctx.beginPath();
        const beads = [];
        for (const side of ['left', 'right']) {
          const { bays } = GL[side];
          for (let i = 0; i < 13; i++) {
            const bay = bays[Math.floor(hash(i, side === 'left' ? 31 : 37) * bays.length)];
            const u = bay[0] + 0.18 + hash(i, side === 'left' ? 41 : 43) * (bay[1] - bay[0] - 0.36);
            const upper = hash(i, 45) > 0.6;
            const z0 = upper ? TRANSOM + 0.1 : SILL + 0.1, z1 = upper ? TOP - 0.1 : TRANSOM - 0.1;
            const span = z1 - z0, v = 0.35 + hash(i, 47) * 0.8;
            const z = z1 - ((t * v + hash(i, 49) * span) % span);
            const top = Math.min(z1, z + 0.45);
            const [X0, Y0] = WP(side, u + Math.sin(z * 4 + i) * 0.03, top);
            const [X1, Y1] = WP(side, u, z);
            ctx.moveTo(X0, Y0);
            ctx.lineTo(X1, Y1);
            beads.push(X1, Y1);
          }
        }
        ctx.strokeStyle = alpha(INK.bone, 0.38);
        ctx.lineWidth = 0.03;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.beginPath();
        for (let i = 0; i < beads.length; i += 2) {
          ctx.moveTo(beads[i] + 0.045, beads[i + 1]);
          ctx.arc(beads[i], beads[i + 1], 0.045, 0, Math.PI * 2);
        }
        ctx.fillStyle = alpha(INK.bone, 0.6);
        ctx.fill();
      }
      // The heart, drawn with a finger in the steam (and running a little).
      if (fog > 0.55) {
        const v = clamp((fog - 0.55) / 0.3);
        const hu = 12.55, hz = 2.35, s2 = 0.42;
        const H = (u, z) => WP('right', hu + u * s2, hz + z * s2);
        ctx.beginPath();
        const pts = [];
        for (let i = 0; i <= 24; i++) {
          const a = (i / 24) * Math.PI * 2;
          const hx = 16 * Math.sin(a) ** 3 / 16, hy = (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 16;
          pts.push(H(hx, hy));
        }
        pts.forEach(([X, Y], i) => (i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y)));
        const [A0, A1] = [H(-0.2, -0.95), H(-0.2, -1.5)];
        ctx.moveTo(A0[0], A0[1]);
        ctx.lineTo(A1[0], A1[1]);
        ctx.strokeStyle = alpha(GLASS, 0.9 * v);
        ctx.lineWidth = 0.08;
        ctx.stroke();
      }
      // A snail, taking the whole evening to climb one pane.
      if (Q.detail) {
        const k2 = mod(t) / LOOP;
        const su = 14.0, sz = 1.1 + k2 * 3.9;
        ctx.beginPath();
        wline(ctx, 'right', [[su, 1.05], [su + 0.05, sz - 0.1]]);
        ctx.strokeStyle = alpha(INK.bone, 0.3);
        ctx.lineWidth = 0.05;
        ctx.stroke();
        const [X, Y] = WP('right', su + 0.02, sz);
        ctx.beginPath();
        ctx.ellipse(X, Y + 0.02, 0.05, 0.14, 0, 0, Math.PI * 2);
        paint(ctx, MAT.stone, { lw: 0.015 });
        ctx.beginPath();
        ctx.arc(X + 0.03, Y + 0.06, 0.08, 0, Math.PI * 2);
        paint(ctx, MAT.oak, { lw: 0.015 });
      }
    }, { anim: true });

    // ---------- On the walls ----------
    R.decor((ctx) => {
      // the doors, folded back flat against the glass
      for (const side of ['left', 'right']) {
        const g = GL[side];
        if (g.door) doorLeaf(ctx, side, g.door.b + 0.08, 2.0, g.door.h - 0.12);
      }
      // The gardener's map of his own maze, pinned to the glass. It's four
      // hedges long. He still needs the map.
      onLeft(ctx, 2.25, 2.3, 1.0, 0.95, MAT.paper, { lw: 0.025 });
      if (Q.detail) {
        ctx.beginPath();
        for (const [u0, z0, u1, z1] of [
          [2.4, 2.4, 3.1, 2.4], [3.1, 2.4, 3.1, 3.0], [3.1, 3.0, 2.4, 3.0], [2.4, 3.0, 2.4, 2.58],
          [2.58, 2.58, 2.92, 2.58], [2.92, 2.58, 2.92, 2.82], [2.92, 2.82, 2.58, 2.82],
        ]) wline(ctx, 'left', [[u0, z0], [u1, z1]]);
        ctx.strokeStyle = MAT.leafDark;
        ctx.lineWidth = 0.035;
        ctx.stroke();
        const [MX, MY] = WP('left', 2.75, 2.7);
        ctx.beginPath();
        ctx.arc(MX, MY, 0.04, 0, Math.PI * 2);
        ctx.fillStyle = INK.oxblood;
        ctx.fill();
        paintText(ctx, 'left', 2.75, 3.13, 'MY MAZE', 0.09, C.ink);
      }
      // A tool rack over the potting bench: shears, a hand fork, a trowel, twine.
      onRight(ctx, 2.1, 2.55, 2.7, 0.16, MAT.oak, { lw: 0.03 });
      const tool = (pts, color) => {
        ctx.beginPath();
        wline(ctx, 'right', pts);
        ctx.closePath();
        paint(ctx, color, { lw: 0.02 });
      };
      tool([[2.4, 2.55], [2.47, 2.55], [2.62, 1.95], [2.55, 1.93]], MAT.silver);
      tool([[2.62, 2.55], [2.55, 2.55], [2.4, 1.95], [2.47, 1.93]], MAT.silver);
      tool([[2.36, 2.72], [2.66, 2.72], [2.62, 2.5], [2.4, 2.5]], INK.oxblood);
      tool([[3.05, 2.55], [3.15, 2.55], [3.15, 2.2], [3.05, 2.2]], MAT.oak);
      tool([[2.95, 2.2], [3.25, 2.2], [3.2, 1.85], [3.0, 1.85]], MAT.silver);
      tool([[3.6, 2.55], [3.7, 2.55], [3.7, 2.2], [3.6, 2.2]], MAT.oak);
      for (let i = 0; i < 3; i++) tool([[3.5 + i * 0.1, 2.2], [3.54 + i * 0.1, 2.2], [3.54 + i * 0.1, 1.85], [3.5 + i * 0.1, 1.85]], MAT.silver);
      {
        const [X, Y] = WP('right', 4.3, 2.25);
        ctx.beginPath();
        ctx.arc(X, Y, 0.17, 0, Math.PI * 2);
        paint(ctx, TWINE, { lw: 0.02 });
        ctx.beginPath();
        ctx.arc(X, Y, 0.08, 0, Math.PI * 2);
        ctx.strokeStyle = shade(TWINE, 0.3);
        ctx.lineWidth = 0.02;
        ctx.stroke();
      }
      if (Q.detail) {
        // cobwebs in the corner of the rack
        ctx.beginPath();
        const c0 = WP('right', 4.8, 2.71);
        for (const [u, z] of [[4.8, 3.3], [4.5, 3.2], [4.3, 2.75]]) {
          const [X, Y] = WP('right', u, z);
          ctx.moveTo(c0[0], c0[1]);
          ctx.lineTo(X, Y);
        }
        for (const k of [0.4, 0.75]) {
          const pts = [[4.8, 2.71 + 0.59 * k], [4.8 - 0.3 * k, 2.71 + 0.49 * k], [4.8 - 0.5 * k, 2.71 + 0.04 * k]];
          wline(ctx, 'right', pts);
        }
        ctx.strokeStyle = alpha(INK.bone, 0.5);
        ctx.lineWidth = 0.012;
        ctx.stroke();
      }

      // The grapevine: planted in a trough by the far corner, up a bar and
      // along the top of the glass, dropping leaves and a few grapes.
      const vine = [[15.3, 0.7], [15.25, 2], [15.35, 3.5], [15.2, 5.2], [14.6, 5.62], [13.4, 5.5], [12.2, 5.68], [11, 5.5], [9.9, 5.64]];
      ctx.beginPath();
      wline(ctx, 'right', vine);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 0.13;
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.strokeStyle = MAT.oak;
      ctx.lineWidth = 0.08;
      ctx.stroke();
      const vleaves = [];
      for (let i = 0; i < vine.length - 1; i++) {
        const [u0, z0] = vine[i], [u1, z1] = vine[i + 1];
        for (const k of [0.3, 0.75]) {
          const u = u0 + (u1 - u0) * k, z = z0 + (z1 - z0) * k;
          const drop = z > 5 ? -0.25 - hash(i, k * 10) * 0.35 : 0;
          vleaves.push([u + (hash(i, k * 7) - 0.5) * 0.3, z + drop, hash(i, k * 13)]);
        }
      }
      for (const [u, z, h] of vleaves) {
        const [X, Y] = WP('right', u, z);
        const c = h < 0.35 ? DEAD : h < 0.65 ? WILT : LEAF;
        ctx.beginPath();
        for (const [dx, dy] of [[0, -0.1], [-0.1, 0], [0.1, 0], [0, 0.06]]) {
          ctx.moveTo(X + dx + 0.1, Y + dy);
          ctx.arc(X + dx, Y + dy, 0.1, 0, Math.PI * 2);
        }
        paint(ctx, c, { lw: 0.02 });
      }
      for (const [u, z] of [[13.9, 5.1], [11.6, 5.2], [10.3, 5.15]]) {
        const [X, Y] = WP('right', u, z);
        ctx.beginPath();
        for (const [dx, dy] of [[0, 0], [-0.06, 0.08], [0.06, 0.08], [0, 0.16], [-0.06, 0.24], [0.06, 0.24], [0, 0.32]].map(([a, b]) => [a * 0.8, b * 0.8])) {
          ctx.moveTo(X + dx + 0.045, Y + dy);
          ctx.arc(X + dx, Y + dy, 0.045, 0, Math.PI * 2);
        }
        paint(ctx, INK.deepPlum, { lw: 0.012 });
      }
    });

    // The thermometer, and what it makes of the two of them.
    R.decor((ctx, t) => {
      const u = 4.6, h = at(heat, t);
      onLeft(ctx, u - 0.25, 1.95, 0.5, 2.0, MAT.oak, { lw: 0.03 });
      onLeft(ctx, u - 0.05, 2.2, 0.1, 1.6, INK.bone, { lw: 0.02 });
      onLeft(ctx, u - 0.035, 2.12, 0.07, 0.25 + h * 1.4, INK.oxblood, { stroke: false });
      const [X, Y] = WP('left', u, 2.12);
      ctx.beginPath();
      ctx.arc(X, Y, 0.09, 0, Math.PI * 2);
      paint(ctx, INK.oxblood, { lw: 0.02 });
      if (Q.detail) {
        ctx.beginPath();
        for (let i = 0; i < 7; i++) wline(ctx, 'left', [[u - 0.18, 2.35 + i * 0.22], [u - 0.08, 2.35 + i * 0.22]]);
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 0.015;
        ctx.stroke();
        paintText(ctx, 'left', u, 3.86, 'HOT', 0.1, INK.oxblood);
      }
    }, { anim: true });

    // A hanging basket of ivy, swinging a little in the draught.
    R.decor((ctx, t) => {
      const sw = Math.sin(t * 0.8) * 0.04;
      const [BX, BY] = WP('left', 11.4, 4.75);
      const [X, Y] = P(0.6, 11.4, 4.1);
      ctx.beginPath();
      ctx.moveTo(BX, BY);
      ctx.lineTo(BX + 0.62, BY + 0.3);
      ctx.strokeStyle = IRON;
      ctx.lineWidth = 0.05;
      ctx.stroke();
      ctx.save();
      ctx.translate(BX + 0.6, BY + 0.3);
      ctx.rotate(sw);
      const dx = X - (BX + 0.6), dy = Y - (BY + 0.3);
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(dx - 0.35, dy - 0.05);
      ctx.moveTo(0, 0); ctx.lineTo(dx + 0.35, dy - 0.05);
      ctx.strokeStyle = IRON;
      ctx.lineWidth = 0.02;
      ctx.stroke();
      for (let i = 0; i < 5; i++) {
        const sx = dx - 0.3 + i * 0.15, L = 0.6 + hash(i, 71) * 0.8;
        ctx.beginPath();
        ctx.moveTo(sx, dy);
        ctx.quadraticCurveTo(sx + Math.sin(t * 1.2 + i) * 0.06, dy + L * 0.5, sx - 0.05, dy + L);
        ctx.strokeStyle = LEAF_D;
        ctx.lineWidth = 0.025;
        ctx.stroke();
        ctx.beginPath();
        for (let j = 1; j <= 3; j++) {
          const ly = dy + (L * j) / 3.3, lx = sx + (j % 2 ? 0.05 : -0.05);
          ctx.moveTo(lx + 0.05, ly);
          ctx.arc(lx, ly, 0.05, 0, Math.PI * 2);
        }
        paint(ctx, i % 2 ? WILT : LEAF, { lw: 0.012 });
      }
      ctx.beginPath();
      ctx.moveTo(dx - 0.36, dy - 0.05);
      ctx.bezierCurveTo(dx - 0.33, dy + 0.3, dx + 0.33, dy + 0.3, dx + 0.36, dy - 0.05);
      ctx.closePath();
      paint(ctx, WICKER, { dots: shade(WICKER, 0.45), density: 0.25, lw: 0.025 });
      ctx.restore();
    }, { anim: true });

    // "PRUNING IN PROGRESS": hung on the hall door while she's in here.
    R.decor((ctx, t) => {
      if (!step(philIn, t)) return;
      const g = GL.left;
      if (!g.door) return;
      const m = (g.door.a + g.door.b) / 2, zt = g.door.h;
      ctx.save();
      ctx.translate(0.1, 0.05);
      ctx.beginPath();
      wline(ctx, 'left', [[m - 0.5, zt - 0.62], [m, zt - 0.05], [m + 0.5, zt - 0.62]]);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 0.02;
      ctx.stroke();
      onLeft(ctx, m - 0.75, zt - 1.12, 1.5, 0.52, INK.bone, { lw: 0.03 });
      paintText(ctx, 'left', m, zt - 0.73, 'PRUNING IN', 0.16, INK.oxblood);
      paintText(ctx, 'left', m, zt - 0.95, 'PROGRESS', 0.16, INK.oxblood);
      ctx.restore();
    }, { anim: true });

    // ---------- On the floor ----------
    R.rug((ctx) => {
      // the doormat at the hall door
      onFloor(ctx, 0.01, () => {
        ctx.beginPath();
        ctx.rect(0.3, 6.95, 1.2, 2.1);
      });
      paint(ctx, mix(MAT.oakLight, MAT.oak, 0.3), { dots: shade(MAT.oak, 0.3), density: 0.3, lw: 0.03 });
      ctx.save();
      ctx.translate(0, -0.01 * ZK);
      ctx.transform(1, 0.5, -1, 0.5, 0, 0);
      ctx.translate(0.9, 8);
      ctx.rotate(-Math.PI / 2);
      ctx.scale(1 / 40, 1 / 40);
      ctx.font = `${0.26 * 40}px "Bagel Fat One", "Arial Black", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = shade(MAT.oak, 0.45);
      ctx.fillText('WIPE YOUR', 0, -0.17 * 40);
      ctx.fillText('BOOTS', 0, 0.17 * 40);
      ctx.restore();
      // a puddle round the one happy plant: the leak overflows its pot
      disc(ctx, LEAK.x - 0.35, LEAK.y + 0.7, 0.005, 0.6, alpha(WATER, 0.55), { stroke: false });
      disc(ctx, LEAK.x - 0.2, LEAK.y + 0.6, 0.006, 0.2, alpha(INK.bone, 0.25), { stroke: false });
      stageRug(ctx);
      // fallen leaves and petals: the plants have been dropping them for years
      if (!Q.detail) return;
      const spots = [
        [1.9, 1.3, 4.6, 2, 18], [10.6, 3.4, 3, 1.4, 10], [1.8, 11.2, 3, 3, 10], [13.2, 12.4, 2.6, 2.6, 8], [0.4, 13.6, 2.2, 1.8, 6],
        [4.2, 12.9, 1.6, 1.2, 5], [12.8, 7.2, 1.6, 1.6, 6],
      ];
      for (const [color, n0] of [[DEAD, 0], [WILT, 1]]) {
        onFloor(ctx, 0.01, () => {
          ctx.beginPath();
          spots.forEach(([x0, y0, w, d, n], si) => {
            for (let i = n0; i < n; i += 2) {
              const lx = x0 + hash(si * 31 + i, 81) * w, ly = y0 + hash(si * 31 + i, 83) * d, a = hash(si * 31 + i, 85) * 6;
              ctx.moveTo(lx + Math.cos(a) * 0.13, ly + Math.sin(a) * 0.13);
              ctx.ellipse(lx, ly, 0.13, 0.06, a, 0, Math.PI * 2);
            }
          });
        });
        paint(ctx, color, { lw: 0.015 });
      }
      onFloor(ctx, 0.01, () => {
        ctx.beginPath();
        for (let i = 0; i < 9; i++) {
          const lx = ROSE.x - 1.2 + hash(i, 87) * 2.2, ly = ROSE.y + 0.7 + hash(i, 89) * 1.3;
          ctx.moveTo(lx + 0.07, ly);
          ctx.arc(lx, ly, 0.07, 0, Math.PI * 2);
        }
      });
      paint(ctx, INK.oxblood, { lw: 0.012 });
      // the mouse's seed packet, torn open
      onFloor(ctx, 0.01, () => {
        ctx.beginPath();
        ctx.rect(3.7, 1.55, 0.3, 0.2);
      });
      paint(ctx, INK.candleGold, { lw: 0.015 });
      onFloor(ctx, 0.01, () => {
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const lx = 3.9 + hash(i, 91) * 0.6, ly = 1.7 + hash(i, 93) * 0.5;
          ctx.moveTo(lx + 0.025, ly);
          ctx.arc(lx, ly, 0.025, 0, Math.PI * 2);
        }
      });
      ctx.fillStyle = shade(MAT.oakLight, 0.3);
      ctx.fill();
    });

    // Lightning through the glass roof: the floor lit cold, with the shadows of
    // the roof's glazing bars thrown across it (a new angle for every strike).
    R.rug((ctx, t) => {
      const k = roomK(t);
      if (k < 0.02) return;
      const s = strikeNow(t);
      ctx.fillStyle = alpha(NIGHT.flash, 0.62 * k);
      ctx.fill(FLOOR);
      if (!Q.detail || !s) return;
      ctx.save();
      ctx.clip(FLOOR);
      const dx = (s.x - 0.5) * 1.6, dy = (s.y - 0.5) * 1.6;
      ctx.beginPath();
      for (let u = 1.38; u < 17; u += 1.38) {
        const a = P(u + dx, -1), b = P(u + dx, 17);
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
      }
      for (const v of [4.1, 8.2, 12.3]) {
        const a = P(-1, v + dy), b = P(17, v + dy);
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
      }
      ctx.strokeStyle = alpha(INK.stormNavy, 0.72 * k);
      ctx.lineWidth = 0.2;
      ctx.stroke();
      ctx.restore();
    }, { anim: true });

    // The gardener's muddy boots, past the mat.
    R.rug((ctx, t) => {
      const tt = mod(t);
      const fade = 1 - clamp((tt - 150) / 28);
      if (fade <= 0) return;
      onFloor(ctx, 0.01, () => {
        ctx.beginPath();
        for (const pr of prints) {
          if (tt < pr.t) continue;
          const c = Math.cos(pr.a), s = Math.sin(pr.a);
          ctx.moveTo(pr.x + c * 0.1 + 0.08 * c, pr.y + s * 0.1 + 0.08 * s);
          ctx.ellipse(pr.x + c * 0.05, pr.y + s * 0.05, 0.1, 0.06, pr.a, 0, Math.PI * 2);
          ctx.moveTo(pr.x - c * 0.12 + 0.05 * c, pr.y - s * 0.12 + 0.05 * s);
          ctx.ellipse(pr.x - c * 0.12, pr.y - s * 0.12, 0.05, 0.05, pr.a, 0, Math.PI * 2);
        }
      });
      ctx.fillStyle = alpha(MUD, 0.75 * fade);
      ctx.fill();
    }, { anim: true });

    // The sign, knocked down when she runs out, and left where it fell.
    R.rug((ctx, t) => {
      if (step(philIn, t)) return;
      onFloor(ctx, 0.01, () => {
        ctx.beginPath();
        ctx.rect(1.7, 9.25, 1.1, 0.42);
      });
      paint(ctx, INK.bone, { lw: 0.025 });
      if (Q.detail) {
        onFloor(ctx, 0.01, () => {
          ctx.beginPath();
          for (let i = 0; i < 3; i++) {
            ctx.moveTo(1.82, 9.35 + i * 0.1);
            ctx.lineTo(2.65 - i * 0.2, 9.35 + i * 0.1);
          }
        });
        ctx.strokeStyle = INK.oxblood;
        ctx.lineWidth = 0.03;
        ctx.stroke();
      }
    }, { anim: true });

    // ---------- Standing things, back to front ----------
    // A rake and a broom, leant in the corner.
    R.thing(0.6, 0.6, (ctx) => {
      face(ctx, [[0.45, 0.35, 0], [0.12, 0.12, 2.5]], null, { lw: 0.07, stroke: MAT.oak });
      face(ctx, [[0.62, 0.3, 0], [0.18, 0.08, 2.3]], null, { lw: 0.07, stroke: shade(MAT.oak, 0.2) });
      const [X, Y] = P(0.12, 0.12, 2.5);
      ctx.beginPath();
      ctx.rect(X - 0.28, Y - 0.06, 0.56, 0.08);
      paint(ctx, MAT.silver, { lw: 0.02 });
      ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        ctx.moveTo(X - 0.25 + i * 0.083, Y + 0.02);
        ctx.lineTo(X - 0.25 + i * 0.083, Y + 0.16);
      }
      ctx.strokeStyle = MAT.silver;
      ctx.lineWidth = 0.025;
      ctx.stroke();
      const [BX, BY] = P(0.62, 0.3, 0);
      ctx.beginPath();
      ctx.moveTo(BX - 0.2, BY);
      ctx.lineTo(BX - 0.1, BY - 0.4);
      ctx.lineTo(BX + 0.1, BY - 0.4);
      ctx.lineTo(BX + 0.2, BY);
      ctx.closePath();
      paint(ctx, mix(MAT.oakLight, MAT.oak, 0.4), { lw: 0.025 });
    });
    R.thing(4.2, 1.25, (ctx, t) => pottingBench(ctx, t));
    R.thing(0.9, 6.7, (ctx, t) => tortoise(ctx, t, 0.6, 6.5), { anim: true });
    R.thing(1.7, 6.1, (ctx, t) => staging(ctx, t), { anim: true });
    // The vine's trough, in the far corner of the right-hand glass.
    R.thing(15.3, 0.7, (ctx) => {
      box(ctx, 14.7, 0.1, 0, 1.2, 0.55, 0.5, MAT.oak, { lw: 0.035, top: NIGHT.earthDark });
    });
    R.thing(12.6, 3.3, (ctx, t) => palmTall(ctx, t), { anim: true });
    R.thing(POND.x + 0.2, POND.y + 0.2, (ctx, t) => pondAndFountain(ctx, t, at(watch, t)), { anim: true });
    // A little sign on a stake by the pond.
    R.thing(11.75, 6.6, (ctx) => {
      face(ctx, [[11.75, 6.6, 0], [11.75, 6.6, 0.95]], null, { lw: 0.05, stroke: MAT.oak });
      face(ctx, [[11.3, 6.6, 0.6], [12.2, 6.6, 0.6], [12.2, 6.6, 1.0], [11.3, 6.6, 1.0]], MAT.pine, { lw: 0.025 });
      ctx.save();
      ctx.translate(-6.6, 3.3);
      paintText(ctx, 'right', 11.75, 0.8, 'NO FISHING', 0.13, C.ink);
      ctx.restore();
    });
    R.thing(5.4, 6.4, (ctx) => letterStand(ctx));
    R.thing(2.4, 5.4, (ctx, t) => wateringCan(ctx, t, 2.4, 5.2, MAT.silver, 1, true), { anim: true });
    R.thing(7.5, 3.8, (ctx, t) => {
      floorPlant(ctx, t, 7.7, 3.1, 'dead', 0.75);
      floorPlant(ctx, t, 7.2, 3.6, 'fern', 0.7);
    }, { anim: true });
    // The canary: it flaps at every flash, and sings while they prune.
    R.thing(15.3, 5.1, (ctx, t) => birdcage(ctx, t, CAGE.x, CAGE.y, startle(t), parrotSays(t)), { anim: true });
    // The drip from the leak lands on the one happy plant's top leaf, which bounces.
    const DRIP = 1.6;
    const bounce = (t) => {
      const age = t % (DRIP / 2);
      return Math.exp(-age * 7) * Math.sin(age * 26) * 0.06;
    };
    R.thing(LEAK.x + 0.4, LEAK.y + 0.4, (ctx, t) => monstera(ctx, t, bounce(t)), { anim: true });
    R.thing(9.2, 10.3, (ctx) => bench(ctx));
    R.thing(12.2, 10.2, (ctx) => champagne(ctx));
    R.thing(0.9, 10.3, (ctx, t) => floorPlant(ctx, t, 0.9, 10.3, 'aspidistra', 1.15), { anim: true });
    R.thing(ROSE.x + 0.6, ROSE.y + 0.6, (ctx, t) => roseBush(ctx, t), { anim: true });
    R.thing(12.5, 11.5, (ctx) => figLeaf(ctx));
    R.thing(15.4, 12.0, (ctx, t) => floorPlant(ctx, t, 15.4, 12.0, 'lily', 1.0), { anim: true });
    R.thing(4.7, 12.4, (ctx, t) => floorPlant(ctx, t, 4.7, 12.4, 'fern', 1.0), { anim: true });
    R.thing(3.6, 13.7, (ctx, t) => palmBushy(ctx, t), { anim: true });
    R.thing(6.3, 13.9, (ctx, t) => witnessFern(ctx, t, startle(t), step(together, t) > 0), { anim: true });
    R.thing(12.4, 13.5, (ctx, t) => gnome(ctx, 12.4, 13.5, caught(together, t) > 0), { anim: true });
    R.thing(15.1, 14.2, (ctx, t) => floorPlant(ctx, t, 15.1, 14.2, 'agave', 1.2), { anim: true });
    R.thing(4.9, 15.0, (ctx, t) => wateringCan(ctx, t, 4.9, 15.0, INK.verdigris, -1, false));
    R.thing(13.6, 15.5, (ctx) => potStack(ctx, 13.3, 15.3));
    R.thing(1.6, 15.3, (ctx) => wheelbarrow(ctx));

    // The mouse under the potting bench, making a run for the spilled seeds.
    R.mover((t) => {
      const k = t % 11;
      const home = [3.3, 0.9], seeds = [4.05, 1.85];
      if (k < 3.5) return { x: home[0], y: home[1], dir: 'r', still: true };
      if (k < 3.9) { const q = (k - 3.5) / 0.4; return { x: home[0] + (seeds[0] - home[0]) * q, y: home[1] + (seeds[1] - home[1]) * q, dir: 'l', run: true }; }
      if (k < 8.5) return { x: seeds[0], y: seeds[1], dir: 'l', nibble: true };
      if (k < 8.9) { const q = (k - 8.5) / 0.4; return { x: seeds[0] + (home[0] - seeds[0]) * q, y: seeds[1] + (home[1] - seeds[1]) * q, dir: 'r', run: true }; }
      return { x: home[0], y: home[1], dir: 'r', still: true };
    }, (ctx, t, p) => {
      if (!Q.detail) return;
      const [X, Y] = P(p.x, p.y, 0);
      const f = p.dir === 'l' ? -1 : 1;
      const hop = p.run ? Math.abs(Math.sin(t * 30)) * 0.04 : 0;
      const nib = p.nibble ? Math.sin(t * 18) * 0.015 : 0;
      ctx.save();
      ctx.translate(X, Y - hop);
      ctx.scale(f, 1);
      ctx.beginPath();
      ctx.moveTo(-0.12, -0.04);
      ctx.quadraticCurveTo(-0.3, -0.02, -0.34, -0.12);
      ctx.strokeStyle = MAT.furDark;
      ctx.lineWidth = 0.02;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, -0.07, 0.14, 0.075, 0, 0, Math.PI * 2);
      ctx.ellipse(0.14 + nib, -0.09, 0.06, 0.05, 0.3, 0, Math.PI * 2);
      paint(ctx, mix(MAT.stone, MAT.fur, 0.3), { lw: 0.02 });
      ctx.beginPath();
      ctx.arc(0.1, -0.15, 0.04, 0, Math.PI * 2);
      paint(ctx, mix(MAT.stone, C.pink, 0.3), { lw: 0.015 });
      ctx.restore();
    });

    // ---------- Lights ----------
    candle(R, 9.0, 9.6, 0.92, 41);
    candle(R, 4.51, 0.67, 1.07, 44, { r: 1.5 });
    // The flashbulb: every flash lights the two of them up, cold, mid-pose.
    R.light({ at: [8.6, 11.2, 1.3], r: 9.5, color: NIGHT.flash, k: (t) => 0.9 * roomK(t) });
    R.dark(house.dark);

    // ---------- In the air ----------
    // The leak: a drip every so often from the glass roof.
    R.air((ctx, t) => {
      if (!Q.detail) return;
      for (let i = 0; i < 2; i++) {
        const k = ((t / DRIP + i * 0.5) % 1);
        const z = 6.8 - 4.05 * k * k;
        const [X, Y] = P(LEAK.x, LEAK.y, z);
        ctx.beginPath();
        ctx.moveTo(X, Y - 0.12);
        ctx.quadraticCurveTo(X + 0.05, Y, X, Y + 0.02);
        ctx.quadraticCurveTo(X - 0.05, Y, X, Y - 0.12);
        ctx.fillStyle = alpha(INK.bone, 0.8);
        ctx.fill();
      }
    });
    // Two moths, round and round the candle.
    R.air((ctx, t) => {
      if (!Q.detail) return;
      const [CX, CY] = P(9.0, 9.6, 1.5);
      for (let i = 0; i < 2; i++) {
        const a = t * (2.3 + i * 0.8) + i * 2.4;
        const X = CX + Math.cos(a) * (0.32 + i * 0.12), Y = CY + Math.sin(a * 1.3) * 0.16 - i * 0.12;
        const fl = 0.3 + 0.7 * Math.abs(Math.sin(t * 24 + i * 2));
        ctx.beginPath();
        ctx.moveTo(X, Y);
        ctx.lineTo(X - 0.1, Y - 0.07 * fl);
        ctx.lineTo(X - 0.07, Y + 0.02);
        ctx.moveTo(X, Y);
        ctx.lineTo(X + 0.1, Y - 0.07 * fl);
        ctx.lineTo(X + 0.07, Y + 0.02);
        ctx.fillStyle = mix(INK.bone, MAT.oak, 0.25);
        ctx.fill();
      }
    });

    // The canary's song: notes drifting up out of the cage.
    R.air((ctx, t) => {
      if (!parrotSays(t) || !Q.detail) return;
      for (let i = 0; i < 3; i++) {
        const k = (t * 0.6 + i / 3) % 1;
        ctx.save();
        ctx.globalAlpha *= 1 - k;
        note(ctx, CAGE.x - 0.2 - k * 0.5, CAGE.y - 0.2 + (i - 1) * 0.3, 3.0 + k * 1.3, INK.candleGold, 0.8);
        ctx.restore();
      }
    });

    // ---------- Finds ----------
    R.find({ id: 'love-letters', label: 'Love letters in a flowerpot', at: [5, 6, 1.0], r: 0.7 });
    R.find({ id: 'fig-leaf', label: 'A fig leaf, worn once', at: [12.5, 11.5, 0.05], r: 0.8 });
  },
};
