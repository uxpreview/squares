// Kitchen: the servants' side of Gooseworth Manor. Mrs. Hatchett is building
// Trifle II, out of respect, and turns round every few seconds to keep an eye
// on the room. Every time her back is turned, the dog darts out from under the
// table and steals another sausage off the string she hung on the coat stand,
// "out of reach". The string gets shorter and the jumps get higher. The spilled
// flour has webbed footprints in it, the timer on the table goes off at
// midnight (her alibi), and the hatch in the corner goes down to the cellar.
//
// Everything here reads Mrs. Hatchett's evening off the shared clock
// (evening.js), so if her turns change, the dog keeps up.
import {
  C, Q, P, box, rect, disc, cylinder, face, poly, paint, onLeft, onRight, slab,
  mix, shade, tint, alpha, label, paintText, rng,
} from '../../../engine/art.js';
import { clamp } from '../../../engine/actors.js';
import { S, ZK } from '../../../engine/iso.js';
import { INK, MAT, ROOM, house, fire, candle, stormWindow, storm, MIDNIGHT, pastK, webPrint } from '../style.js';
import { DOORS, LOOP } from '../plan.js';

// ---------- Inks (all mixed from the level's six) ----------
const K = ROOM.kitchen;
const TILE = mix(K.wall, INK.bone, 0.55); // glazed bone tiles
const GROUT = mix(K.wall, INK.stormNavy, 0.18);
const RWALL = mix(K.wall, INK.stormNavy, 0.05);
const PLASTER = mix(K.wall, INK.verdigris, 0.1);
const FLAG = K.floor; // stone flags
const JOINT = mix(K.floor, INK.stormNavy, 0.5);
const IRON = mix(INK.stormNavy, C.black, 0.35); // the black-leaded range
const IRON_LIT = mix(IRON, INK.bone, 0.1);
const IRON_TOP = mix(IRON, INK.bone, 0.2);
const COPPER = mix(INK.oxblood, INK.candleGold, 0.5);
const COPPER_HI = mix(INK.candleGold, INK.bone, 0.35);
const COPPER_LO = mix(INK.oxblood, INK.deepPlum, 0.3);
const SAUSAGE = mix(C.pink, INK.oxblood, 0.25);
const SAUSAGE_HI = mix(C.pink, INK.bone, 0.5);
const FLOUR = C.white;
const CHINA = mix(INK.bone, C.white, 0.55);
const SLATE = mix(INK.stormNavy, INK.deepPlum, 0.25);
const PIT = mix(INK.stormNavy, C.black, 0.5);
const SACKING = mix(INK.bone, INK.candleGold, 0.3);
const OLDWOOD = mix(MAT.oak, INK.stormNavy, 0.42); // the cellar hatch, scuffed dark
const SPONGE = mix(INK.candleGold, INK.bone, 0.3);
const SOAKED = mix(SPONGE, INK.oxblood, 0.35);
const GLASS = MAT.glass;
const ENAMEL = mix(INK.verdigris, INK.stormNavy, 0.15); // the timer's case, like the tins round it
const FUR = MAT.fur, FUR_D = MAT.furDark, MUZZLE = mix(MAT.fur, INK.bone, 0.6);
const CAT = C.black;
const TAU = Math.PI * 2;

// ---------- Layout (zone units; x to the lower right, y to the lower left) ----------
const TABLE = { x: 5, y: 6, w: 6, d: 3, h: 1.2 }; // the scrubbed pine table
const HATCH = { x: 12.2, y: 9.5, w: 2, d: 5 }; // the cellar hatch (Jenkins walks down it)
const STAND = [6.0, 10.6]; // the coat stand the sausages hang on
const HOOK = [6.35, 10.6, 2.62]; // ...from this hook
const HOME = [9.9, 9.35]; // the dog's spot, at the table's edge
const BEHIND = [8.45, 11.3]; // round behind Mrs. Hatchett's heels
const HOP = [8.9, 9.75]; // where it jumps up onto the table from
const ONTOP = [8.9, 8.6]; // where it lands
const REST = [9.55, 8.5]; // where it leaves its sausage while it eats
const TRIFLE = [7.4, 7.5];
const TIMER = [10.5, 7.3]; // in among the tins at the busy end of the table
const TIMER_K = 0.62; // drawn at a timer's size, not a clock's
const N0 = 10; // sausages on a fresh string
const LINK = 0.22; // one sausage, on the string
const KNOT = 0.06; // the bit of string at the top
const ON_TABLE = 14.6; // depth of the table: things on it sort after this

// ---------- Small helpers ----------
const wrap = (t) => ((t % LOOP) + LOOP) % LOOP;
const since = (t, a) => wrap(t - a); // seconds since a, going round the loop
const easeOut = (k) => 1 - (1 - clamp(k)) ** 2;
const easeIn = (k) => clamp(k) ** 2;
const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const lerp = (a, b, k) => a + (b - a) * k;

// Walk a polyline of [x, y] points: where you are k of the way along.
function along(pts, k) {
  const seg = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    seg.push(l);
    total += l;
  }
  let d = clamp(k) * total;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i] || i === seg.length - 1) {
      const q = seg[i] ? Math.min(1, d / seg[i]) : 0;
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const dX = (bx - ax) - (by - ay);
      return { x: ax + (bx - ax) * q, y: ay + (by - ay) * q, dir: dX >= 0 ? 'r' : 'l' };
    }
    d -= seg[i];
  }
  return { x: pts[0][0], y: pts[0][1], dir: 'l' };
}
const lengthOf = (pts) => pts.slice(1).reduce((n, p, i) => n + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);

// Draw in a back wall's own plane, as if it were flat paper: 'right' is the
// wall y = at (u runs along x), 'left' the wall x = at (u runs along y, toward
// the back). Local +y is up.
function onWall(ctx, side, u, at, z) {
  const [X, Y] = side === 'right' ? P(u, at, z) : P(at, u, z);
  ctx.translate(X, Y);
  if (side === 'right') ctx.transform(1, 0.5, 0, -ZK, 0, 0);
  else ctx.transform(1, -0.5, 0, -ZK, 0, 0);
}

// Text lying on the floor, running along y (parallel to the left wall).
function floorTextY(ctx, x, y, text, size, color) {
  const [X, Y] = P(x, y, 0.02);
  ctx.save();
  ctx.transform(1, -0.5, 1, 0.5, X, Y);
  const k = 40;
  ctx.scale(1 / k, 1 / k);
  ctx.font = `${size * k}px "Bagel Fat One", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// Upright text in the Rethink face, for small print on signs and labels.
function smallPrint(ctx, X, Y, text, size, color = C.ink, align = 'center', weight = 800) {
  const k = 40;
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(1 / k, 1 / k);
  ctx.font = `${weight} ${size * k}px "Rethink Sans", system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// A sausage: a fat rounded stroke from a to b (screen points).
function banger(ctx, ax, ay, bx, by, w = 0.075, fill = SAUSAGE) {
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.lineCap = 'round';
  if (Q.lines) {
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = w * 2 + 0.05;
    ctx.stroke();
  }
  ctx.strokeStyle = fill;
  ctx.lineWidth = w * 2;
  ctx.stroke();
  if (Q.detail && Math.hypot(bx - ax, by - ay) > 0.1) {
    ctx.beginPath();
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    ctx.moveTo(lerp(ax, mx, 0.4) - w * 0.4, lerp(ay, my, 0.4) - w * 0.2);
    ctx.lineTo(lerp(mx, bx, 0.5) - w * 0.4, lerp(my, by, 0.5) - w * 0.2);
    ctx.strokeStyle = SAUSAGE_HI;
    ctx.lineWidth = w * 0.45;
    ctx.stroke();
  }
}

// A string of n sausages from the hook (X0, Y0) down to (X1, Y1), on a gentle
// curve (bend: how far the middle swings out).
function sausageString(ctx, X0, Y0, X1, Y1, n, bend = 0) {
  const top = [X0, Y0 + KNOT * ZK];
  ctx.beginPath();
  ctx.moveTo(X0, Y0);
  ctx.lineTo(top[0], top[1]);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.03;
  ctx.stroke();
  if (n <= 0) return;
  const cx = (top[0] + X1) / 2 + bend, cy = (top[1] + Y1) / 2;
  const at = (k) => [
    (1 - k) * (1 - k) * top[0] + 2 * (1 - k) * k * cx + k * k * X1,
    (1 - k) * (1 - k) * top[1] + 2 * (1 - k) * k * cy + k * k * Y1,
  ];
  let prev = at(0);
  for (let i = 1; i <= n; i++) {
    const p = at(i / n);
    const dx = p[0] - prev[0], dy = p[1] - prev[1], L = Math.hypot(dx, dy) || 1e-6;
    const g = Math.min(0.035, L * 0.18); // the twist between two
    banger(ctx, prev[0] + (dx / L) * g, prev[1] + (dy / L) * g, p[0] - (dx / L) * g, p[1] - (dy / L) * g, 0.07);
    prev = p;
  }
}

// ---------- The dog ----------
// A scruffy terrier with a red collar, drawn in screen units with its feet at
// (X, Y), facing right (f = 1) or left (f = -1), DS times its drawn size. d is
// its state (see planDog): pose, lift (how far off the ground), sy (a crouch),
// lean, wr (a wriggle), ph (leg swing), wag, bite (sausage in its mouth, as a
// length), cream (on its face), tilt, look, blink, tongue.
// flat: one color and no lines (for its shape in the lightning).
const DS = 1.3;
function drawDog(ctx, X, Y, f, d, t, flat) {
  const pose = d.pose || 'sit';
  const ink = flat || C.ink;
  const lines = !flat && Q.lines, detail = !flat && Q.detail;
  const fill = (c, dc) => {
    if (flat) { ctx.fillStyle = flat; ctx.fill(); return; }
    paint(ctx, c, { dots: dc, density: 0.26, lw: 0.035 });
  };
  const limb = (x0, y0, x1, y1, c, w = 0.12) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineCap = 'round';
    if (lines) { ctx.strokeStyle = ink; ctx.lineWidth = w + 0.06; ctx.stroke(); }
    ctx.strokeStyle = flat || c;
    ctx.lineWidth = w;
    ctx.stroke();
  };
  // A ragged ellipse: fur that has never met a brush.
  const shag = (cx, cy, rx, ry, rot, n = 18, amp = 0.2) => {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU;
      const up = Math.sin(a + rot) < 0.3;
      const r = up && i % 2 ? 1 + amp : 1;
      const px = Math.cos(a) * rx * r, py = Math.sin(a) * ry * r;
      const x = cx + px * Math.cos(rot) - py * Math.sin(rot), y = cy + px * Math.sin(rot) + py * Math.cos(rot);
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath();
  };
  const ear = (ax, ay, rot) => {
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0.04, 0);
    ctx.quadraticCurveTo(-0.14, -0.03, -0.11, 0.2);
    ctx.lineTo(-0.06, 0.17); ctx.lineTo(-0.03, 0.23);
    ctx.quadraticCurveTo(0.03, 0.14, 0.05, 0.1);
    ctx.closePath();
    fill(FUR_D);
    ctx.restore();
  };
  const tuft = (x, y, s = 1) => { // the bit on top that sticks up
    ctx.beginPath();
    ctx.moveTo(x - 0.1 * s, y + 0.04);
    ctx.lineTo(x - 0.08 * s, y - 0.11 * s); ctx.lineTo(x - 0.02 * s, y - 0.02);
    ctx.lineTo(x + 0.01 * s, y - 0.15 * s); ctx.lineTo(x + 0.05 * s, y - 0.02);
    ctx.lineTo(x + 0.1 * s, y - 0.1 * s); ctx.lineTo(x + 0.1 * s, y + 0.04);
    ctx.closePath();
    fill(FUR, FUR_D);
  };
  const tail = (tx, ty, a) => {
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-0.02, -0.12, -0.1, -0.22);
    ctx.lineCap = 'round';
    if (lines) { ctx.strokeStyle = ink; ctx.lineWidth = 0.16; ctx.stroke(); }
    ctx.strokeStyle = flat || FUR;
    ctx.lineWidth = 0.1;
    ctx.stroke();
    ctx.beginPath(); // the tuft on the end
    ctx.moveTo(-0.15, -0.2); ctx.lineTo(-0.11, -0.33); ctx.lineTo(-0.06, -0.21); ctx.lineTo(-0.01, -0.3); ctx.lineTo(-0.05, -0.15);
    ctx.closePath();
    fill(FUR_D);
    ctx.restore();
  };
  const collar = (x0, y0, x1, y1) => {
    if (flat) return;
    limb(x0, y0, x1, y1, INK.oxblood, 0.07);
    if (detail) {
      ctx.beginPath(); ctx.arc((x0 + x1) / 2 + 0.02, (y0 + y1) / 2 + 0.07, 0.04, 0, TAU);
      paint(ctx, MAT.brass, { lw: 0.02 });
    }
  };
  const bite = (mx, my, len, rot = 0) => {
    if (!(len > 0.02)) return;
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(rot);
    if (flat) {
      ctx.beginPath(); ctx.moveTo(-len * 0.45, 0); ctx.lineTo(len * 0.55, 0);
      ctx.lineCap = 'round'; ctx.strokeStyle = flat; ctx.lineWidth = 0.13; ctx.stroke();
    } else banger(ctx, -len * 0.45, 0, len * 0.55, 0, 0.066);
    ctx.restore();
  };
  const cream = (x, y, k) => {
    if (!(k > 0.02) || flat) return;
    ctx.save();
    ctx.globalAlpha *= k;
    ctx.fillStyle = MAT.cream;
    for (const [dx, dy, r] of [[0, 0, 0.09], [0.08, 0.03, 0.075], [-0.08, 0.03, 0.06], [0.03, 0.1, 0.055], [-0.1, -0.1, 0.045]]) {
      ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = MAT.custard;
    ctx.beginPath(); ctx.arc(x + 0.1, y - 0.02, 0.04, 0, TAU); ctx.fill();
    ctx.fillStyle = MAT.trifle;
    ctx.beginPath(); ctx.arc(x - 0.05, y + 0.06, 0.03, 0, TAU); ctx.fill();
    ctx.restore();
  };
  const eye = (ex, ey, r, shut) => {
    ctx.beginPath();
    if (shut) { ctx.moveTo(ex - r, ey); ctx.lineTo(ex + r, ey); ctx.strokeStyle = ink; ctx.lineWidth = 0.025; ctx.stroke(); return; }
    ctx.arc(ex, ey, r, 0, TAU); ctx.fillStyle = ink; ctx.fill();
    ctx.beginPath(); ctx.arc(ex + r * 0.3, ey - r * 0.35, r * 0.38, 0, TAU); ctx.fillStyle = C.white; ctx.fill();
  };
  // Side-on head, facing right, centered at (hx, hy), turned by rot.
  const headSide = (hx, hy, rot, o = {}) => {
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(rot);
    ear(-0.02, -0.14, -0.5); // the far one
    shag(0, 0, 0.18, 0.16, 0, 16, 0.18);
    fill(FUR, FUR_D);
    tuft(-0.02, -0.14, 0.9);
    ctx.beginPath();
    ctx.roundRect(0.05, -0.04, 0.26, 0.16, 0.07);
    fill(MUZZLE);
    ctx.beginPath(); // the beard
    ctx.moveTo(0.06, 0.09); ctx.lineTo(0.08, 0.22); ctx.lineTo(0.13, 0.13); ctx.lineTo(0.18, 0.24); ctx.lineTo(0.22, 0.13); ctx.lineTo(0.28, 0.2); ctx.lineTo(0.29, 0.09);
    ctx.closePath();
    fill(MUZZLE);
    ctx.beginPath();
    ctx.ellipse(0.305, -0.005, 0.05, 0.045, 0, 0, TAU);
    ctx.fillStyle = ink;
    ctx.fill();
    if (detail) {
      eye(0.07, -0.05, 0.033, o.blink);
      ctx.beginPath(); // a wild eyebrow
      ctx.moveTo(-0.02, -0.08); ctx.lineTo(0.06, -0.17); ctx.lineTo(0.08, -0.11); ctx.lineTo(0.15, -0.16); ctx.lineTo(0.12, -0.08);
      ctx.closePath();
      fill(MUZZLE);
    }
    ear(-0.07, -0.13, o.earRot ?? 0.15);
    bite(0.2, 0.11, o.bite || 0, 0.15);
    cream(0.2, 0.06, o.cream || 0);
    if (o.tongue && detail) {
      ctx.beginPath();
      ctx.ellipse(0.25, 0.15 + o.tongue * 0.04, 0.05, 0.035 + o.tongue * 0.035, 0.3, 0, TAU);
      fill(C.pink);
    }
    ctx.restore();
  };
  // Head turned three quarters to the viewer (the innocent look).
  const headFront = (hx, hy, rot, o = {}) => {
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(rot);
    shag(0, 0, 0.21, 0.19, 0, 18, 0.16);
    fill(FUR, FUR_D);
    tuft(0.01, -0.16);
    ear(-0.15, -0.1, 0.3);
    ctx.save(); ctx.scale(-1, 1); ear(-0.21, -0.1, 0.3); ctx.restore();
    ctx.beginPath();
    ctx.ellipse(0.07, 0.08, 0.14, 0.095, 0, 0, TAU);
    fill(MUZZLE);
    ctx.beginPath(); // beard
    ctx.moveTo(-0.05, 0.12); ctx.lineTo(-0.03, 0.25); ctx.lineTo(0.03, 0.16); ctx.lineTo(0.08, 0.27); ctx.lineTo(0.13, 0.16); ctx.lineTo(0.19, 0.24); ctx.lineTo(0.2, 0.1);
    ctx.closePath();
    fill(MUZZLE);
    ctx.beginPath();
    ctx.ellipse(0.1, 0.03, 0.055, 0.045, 0, 0, TAU);
    ctx.fillStyle = ink;
    ctx.fill();
    if (detail) {
      const big = o.look === 'innocent' ? 0.05 : 0.036;
      eye(-0.07, -0.05, big, o.blink);
      eye(0.11, -0.05, big, o.blink);
      // Bushy eyebrows: up in the middle for the innocent look, down when it's plotting.
      const up = o.look === 'innocent' ? 0.06 : o.look === 'perk' ? -0.04 : 0.02;
      for (const [outer, inner] of [[-0.15, -0.02], [0.2, 0.04]]) {
        ctx.beginPath();
        ctx.moveTo(outer, -0.12);
        ctx.lineTo(inner, -0.13 - up);
        ctx.lineTo(inner, -0.1 - up);
        ctx.lineTo(outer, -0.09);
        ctx.closePath();
        fill(MUZZLE);
      }
    }
    bite(0.14, 0.14, o.bite || 0, -0.12);
    cream(0.08, 0.14, o.cream || 0);
    if (o.tongue && detail) {
      ctx.beginPath();
      ctx.ellipse(0.1 + o.tongue * 0.06, 0.17, 0.055, 0.045, 0.2, 0, TAU);
      fill(C.pink);
    }
    ctx.restore();
  };

  // Its shadow stays on the ground when it jumps.
  if (Q.detail && !flat) {
    ctx.beginPath();
    const s = DS / (1 + (d.lift || 0) * 0.6);
    ctx.ellipse(X + (d.sx || 0), Y, 0.42 * s, 0.14 * s, 0, 0, TAU);
    ctx.fillStyle = alpha(C.ink, 0.2);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(X + (d.sx || 0), Y - (d.lift || 0));
  if (d.sy && d.sy !== 1) ctx.scale(1, d.sy);
  ctx.scale(f * DS, DS);
  const wag = d.wag || 0;
  const ph = d.ph || 0;

  if (pose === 'sit') {
    tail(-0.36, -0.06, -1.9 + wag);
    ctx.beginPath(); // haunch
    ctx.ellipse(-0.12, -0.21, 0.28, 0.21, 0, 0, TAU);
    fill(FUR, FUR_D);
    ctx.beginPath(); // back paw
    ctx.ellipse(0.06, -0.03, 0.12, 0.055, 0, 0, TAU);
    fill(FUR_D);
    shag(0.04, -0.47, 0.22, 0.33, -0.34, 18, 0.2); // chest and back
    fill(FUR, FUR_D);
    ctx.beginPath(); // a pale bib
    ctx.ellipse(0.15, -0.5, 0.08, 0.17, -0.3, 0, TAU);
    fill(MUZZLE);
    limb(0.1, -0.42, 0.12, -0.03, FUR);
    limb(0.23, -0.44, 0.26, -0.03, FUR);
    if (detail) {
      ctx.fillStyle = FUR_D;
      for (const px of [0.15, 0.29]) { ctx.beginPath(); ctx.ellipse(px, -0.03, 0.08, 0.045, 0, 0, TAU); ctx.fill(); }
    }
    collar(-0.02, -0.72, 0.26, -0.7);
    headFront(0.13, -0.89, d.tilt || 0, d);
  } else if (pose === 'stand' || pose === 'walk' || pose === 'run') {
    const run = pose === 'run';
    const sw = run ? Math.sin(ph) : pose === 'walk' ? Math.sin(ph) * 0.5 : 0;
    const bob = run ? Math.abs(Math.cos(ph)) * 0.07 : 0;
    const by = -0.5 - bob;
    const reach = run ? 0.75 : 0.45;
    const leg = (x0, a, c) => limb(x0, by + 0.08, x0 + Math.sin(a) * 0.4, by + 0.08 + Math.cos(a) * 0.42, c);
    leg(-0.24, -sw * reach, FUR_D);
    leg(0.3, sw * reach, FUR_D);
    tail(-0.46, by - 0.06, (run ? -0.5 : -0.15) + wag);
    shag(0, by, run ? 0.5 : 0.46, 0.21, run ? 0.04 : 0, 20, 0.2);
    fill(FUR, FUR_D);
    ctx.beginPath(); // pale belly
    ctx.ellipse(0.05, by + 0.12, 0.3, 0.07, 0, 0, TAU);
    fill(MUZZLE);
    leg(-0.32, sw * reach, FUR);
    leg(0.24, -sw * reach, FUR);
    collar(0.36, by - 0.2, 0.42, by + 0.02);
    headSide(run ? 0.56 : 0.5, by - (run ? 0.13 : 0.22), run ? 0.15 : -0.1, { ...d, earRot: run ? -0.6 : 0.15 });
  } else if (pose === 'reach' || pose === 'hang' || pose === 'feast') {
    // Up on its hind legs (reach), off the ground and dangling by its teeth
    // (hang), or with its front paws on the trifle bowl (feast).
    const off = (d.lift || 0) > 0.06;
    if (pose === 'feast') ctx.rotate(d.lean || 0);
    if (d.wr) { ctx.translate(...MOUTH_UP); ctx.rotate(d.wr); ctx.translate(-MOUTH_UP[0], -MOUTH_UP[1]); }
    const kick = off ? Math.sin(t * 17) * 0.14 : 0;
    limb(-0.06, -0.3, off ? -0.13 + kick : -0.11, off ? 0.03 : 0, FUR_D);
    tail(-0.15, -0.3, 2.3 + wag);
    shag(0.03, -0.56, 0.2, 0.37, 0.28, 20, 0.2);
    fill(FUR, FUR_D);
    ctx.beginPath();
    ctx.ellipse(0.13, -0.62, 0.07, 0.18, 0.3, 0, TAU);
    fill(MUZZLE);
    limb(0.04, -0.3, off ? 0.02 - kick : 0.07, off ? 0.05 : 0, FUR);
    limb(0.1, -0.8, 0.32, -0.86, FUR_D);
    limb(0.12, -0.77, 0.28, -0.96, FUR);
    collar(0.02, -0.9, 0.24, -0.84);
    headSide(0.15, -1.03, -0.75, { ...d, earRot: off ? -0.9 : 0.1 });
  }
  ctx.restore();
}

// Where its mouth is, in screen units from its feet (facing right, before
// lift): the find follows it, and the string hangs from it when it bites.
const rot2 = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
function mouthUnscaled(d) {
  const side = (hx, hy, r) => { const [a, b] = rot2(0.2, 0.11, r); return [hx + a, hy + b]; };
  switch (d.pose) {
    case 'run': return side(0.56, -0.63, 0.15);
    case 'stand': case 'walk': return side(0.5, -0.72, -0.1);
    case 'reach': case 'hang': return side(0.15, -1.03, -0.75);
    case 'feast': return rot2(...side(0.15, -1.03, -0.75), d.lean || 0);
    default: { const [a, b] = rot2(0.14, 0.14, d.tilt || 0); return [0.13 + a, -0.89 + b]; }
  }
}
const MOUTH_UP = mouthUnscaled({ pose: 'reach' });
const mouthOf = (d) => mouthUnscaled(d).map((v) => v * DS);
function mouthScreen(d) {
  const f = d.dir === 'l' ? -1 : 1;
  const [X, Y] = P(d.x, d.y, d.z || 0);
  const [mx, my] = mouthOf(d);
  return [X + (d.sx || 0) + f * mx, Y - (d.lift || 0) + my * (d.sy || 1)];
}
// Right under the sausages: up on its hind legs, its mouth is on the string.
const JUMP = [HOOK[0] - HOOK[1] + 11.0 + mouthOf({ pose: 'reach' })[0], 11.0];
// At the trifle, on the table, facing left: nose in the bowl.
const EAT = (() => {
  const [mx, my] = mouthOf({ pose: 'feast', lean: 0.5 });
  const X = TRIFLE[0] - TRIFLE[1] + mx - 0.05;
  const Y = (TRIFLE[0] + TRIFLE[1]) / 2 - 1.2 * ZK - 0.62 - my; // feet, so the mouth is just under the rim
  const s = (Y + 1.2 * ZK) * 2; // x + y of the feet
  return [(s + X) / 2, (s - X) / 2];
})();

// ---------- The evening, as the kitchen sees it ----------
// If the shared clock can't be read, the brief's numbers.
const FALLBACK = {
  away: [[172, 186], [12, 18], [24, 30], [36, 40], [48, 54], [60, 66], [72, 78], [84, 90], [96, 97]],
  leave: 97, back: 166, settle: 172, hang: 169.5, say: [[40, 48]], cellar: [43, 100.3],
};

// Runs of true in a looping list of flags: [start, end] (end may pass the
// length, when a run goes round the end of the loop).
function runs(flags) {
  const N = flags.length, out = [];
  let i = 0;
  while (i < N) {
    if (!flags[i]) { i++; continue; }
    let j = i;
    while (j < N && flags[j]) j++;
    out.push([i, j]);
    i = j;
  }
  if (out.length > 1 && out[0][0] === 0 && out[out.length - 1][1] === N) {
    const last = out.pop();
    out[0] = [last[0], out[0][1] + N];
  }
  return out;
}

function readEvening(R) {
  const h = R.walkers.find((w) => w.id === 'hatchett');
  const j = R.walkers.find((w) => w.id === 'jenkins');
  if (!h) return FALLBACK;
  const [ox, oy] = R.origin;
  const DT = 0.05, N = Math.round(LOOP / DT);
  const here = (p) => R.contains(p.x, p.y, p.z || 0);
  const hs = Array.from({ length: N }, (_, i) => h.at(i * DT));
  const toT = (r) => r.map(([a, b]) => [a * DT, b * DT]);
  // Her back to the room, standing at the range: the dog's chances.
  const away = toT(runs(hs.map((p) => here(p) && !p.moving && !!p.back)));
  const inside = toT(runs(hs.map(here))).sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0];
  const walks = toT(runs(hs.map((p) => here(p) && p.moving)));
  const say = toT(runs(hs.map((p) => here(p) && !!p.say)));
  if (!away.length || !inside) return FALLBACK;
  const back = wrap(inside[0]);
  const out = inside[1];
  const leaving = walks.find((w) => Math.abs(w[1] - out) < 0.2 || Math.abs(w[1] - out + LOOP) < 0.2);
  const arriving = walks.find((w) => Math.abs(wrap(w[0]) - back) < 0.2);
  const leave = leaving ? wrap(leaving[0]) : FALLBACK.leave;
  const settle = arriving ? wrap(arriving[1]) : FALLBACK.settle;
  // She walks past the coat stand on her way back in, and hangs up a fresh string.
  let hang = FALLBACK.hang, best = 1e9;
  for (let s = 0; s <= since(settle, back); s += DT) {
    const p = h.at(back + s);
    const dd = Math.hypot(p.x - ox - STAND[0], p.y - oy - STAND[1]);
    if (dd < best) { best = dd; hang = wrap(back + s); }
  }
  // Jenkins, downstairs under the hatch (drinking, mostly).
  let cellar = FALLBACK.cellar;
  if (j) {
    const below = toT(runs(Array.from({ length: N }, (_, i) => {
      const p = j.at(i * DT);
      return (p.z || 0) < -0.5 && p.x >= ox && p.x < ox + S && p.y >= oy && p.y < oy + S;
    })));
    if (below.length) cellar = below.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0];
  }
  return { away, leave, back, settle, hang, say, cellar, h };
}

// ---------- The dog's evening ----------
// One steal, in seconds (squeezed to fit a short turn):
const STEAL = { peek: 0.5, out: 0.9, up: 0.35, hang: 1.0, down: 0.3, back: 0.9, sit: 0.3 };
const STEAL_T = Object.values(STEAL).reduce((a, b) => a + b, 0);
const OUT = [HOME, BEHIND, JUMP], BACK = [JUMP, BEHIND, HOME];

// How to reach the bottom sausage when n are left: up on its hind legs, or a
// jump (lift, in screen units) that gets higher every time.
function reachFor(n) {
  const bz = HOOK[2] - KNOT - n * LINK + 0.06;
  const need = P(JUMP[0], JUMP[1], 0)[1] - P(HOOK[0], HOOK[1], bz)[1];
  const m = -mouthOf({ pose: 'reach' })[1];
  if (need <= m) return { pose: 'reach', lift: 0, sy: Math.max(0.8, need / m) };
  return { pose: 'hang', lift: need - m, sy: 1 };
}

function planDog(ev) {
  const steals = [];
  for (const [a, b] of ev.away) {
    const W = b - a;
    if (W < 3) continue; // too quick to risk it
    const n = W >= 11 ? 2 : 1;
    const slot = W / n;
    for (let k = 0; k < n; k++) {
      const s0 = a + k * slot;
      const sc = Math.min(1, (slot - 0.4) / STEAL_T);
      const latest = s0 + slot - STEAL_T * sc - 0.1;
      let start = Math.min(s0 + 0.35, latest);
      // At midnight it's caught hanging off the string (the lightning shows it later).
      if (since(MIDNIGHT, s0) < slot) start = clamp(MIDNIGHT - (STEAL.peek + STEAL.out + STEAL.up + 0.55) * sc, s0 + 0.2, latest);
      steals.push({ start: wrap(start), sc });
    }
  }
  // Counting from when the string is hung, each takes the next one up.
  steals.sort((p, q) => since(p.start, ev.hang) - since(q.start, ev.hang));
  steals.forEach((s, i) => {
    s.n = Math.max(1, N0 - i);
    s.reach = reachFor(s.n);
    s.snap = wrap(s.start + (STEAL.peek + STEAL.out + STEAL.up + STEAL.hang) * s.sc);
    s.len = STEAL_T * s.sc;
  });

  // The finale: she runs out at the scream, and the dog has the kitchen to itself.
  const F = { start: ev.leave };
  const last = Math.max(1, N0 - steals.length);
  const seq = [
    ['watch', 1.6], ['go', lengthOf(OUT) / 2.6], ['up', 0.55], ['hang', 1.7], ['down', 0.4],
    ['trot', Math.hypot(HOP[0] - JUMP[0], HOP[1] - JUMP[1]) / 2.2], ['hop', 0.55], ['drop', 0.45], ['step', 0.55],
    ['eat', 0], ['lick', 2.4], ['fetch', 0.7], ['hopdown', 0.55], ['trot2', Math.hypot(HOME[0] - 9.4, HOME[1] - 9.9) / 1.6],
  ];
  const fixed = seq.reduce((n, [, d]) => n + d, 0);
  const room = since(ev.back, ev.leave) - 5; // home before she's back
  seq.find((s) => s[0] === 'eat')[1] = Math.max(6, room - fixed);
  let tt = 0;
  F.phase = seq.map(([name, dur]) => { const p = { name, t0: tt, dur }; tt += dur; return p; });
  F.len = tt;
  F.reach = reachFor(last);
  const phaseOf = (name) => F.phase.find((p) => p.name === name);
  F.snap = wrap(F.start + phaseOf('down').t0);
  F.eat0 = wrap(F.start + phaseOf('eat').t0);
  F.eat1 = wrap(F.start + phaseOf('eat').t0 + phaseOf('eat').dur);
  F.pick = wrap(F.start + phaseOf('fetch').t0 + phaseOf('fetch').dur);
  F.home = wrap(F.start + F.len);

  // When a fresh sausage went into its mouth (a snap, or picking one back up).
  const bites = steals.map((s) => s.snap).concat([F.snap, F.pick]);
  const lastBite = (tt) => bites.reduce((m, b) => Math.min(m, since(tt, b)), 1e9);
  const chewed = (tt) => clamp(0.3 - 0.028 * lastBite(tt), 0.1, 0.3);
  // Cream on its face, from the trifle until it has licked it all off.
  const creamAt = (tt) => {
    const u = since(tt, F.eat0), full = since(F.home, F.eat0) + 1.5;
    if (u < full) return 1;
    return clamp(1 - (u - full) / 8);
  };
  const saying = (tt) => ev.say.some(([a, b]) => since(tt, a) < b - a);

  const sitting = (tt, t, o = {}) => {
    const blink = (t % 4.3) < 0.14;
    const c = creamAt(tt);
    const licking = c > 0 && c < 1;
    return {
      x: HOME[0], y: HOME[1], z: 0, dir: 'l', pose: 'sit', bite: chewed(tt), cream: c,
      wag: Math.sin(t * 5) * 0.25, tilt: saying(tt) ? 0.28 + Math.sin(t * 2) * 0.05 : Math.sin(t * 0.7) * 0.05,
      look: 'innocent', blink, tongue: licking ? (Math.sin(t * 7) + 1) / 2 : 0, ...o,
    };
  };

  function stealPose(s, u, tt, t) {
    let k = u / s.sc;
    const stub = chewed(tt);
    if (k < STEAL.peek) return sitting(tt, t, { look: 'perk', tilt: -0.12, bite: stub, wag: Math.sin(t * 14) * 0.4 });
    k -= STEAL.peek;
    if (k < STEAL.out) {
      const p = along(OUT, smooth(k / STEAL.out));
      return { x: p.x, y: p.y, z: 0, dir: p.dir, pose: 'run', ph: t * 24, bite: stub, wag: 0.2 };
    }
    k -= STEAL.out;
    const rf = s.reach;
    const base = { x: JUMP[0], y: JUMP[1], z: 0, dir: 'l', pose: rf.pose, sy: rf.sy, wag: Math.sin(t * 20) * 0.5 };
    if (k < STEAL.up) return { ...base, lift: rf.lift * easeOut(k / STEAL.up), bite: 0, holding: k / STEAL.up > 0.8 };
    k -= STEAL.up;
    if (k < STEAL.hang) {
      const q = k / STEAL.hang;
      const pull = 0.2 * Math.sin(Math.min(1, q * 3) * Math.PI / 2) + 0.03 * Math.sin(t * 22);
      return { ...base, lift: Math.max(0, rf.lift - pull), sy: rf.sy * (rf.lift > 0 ? 1 : 1 - pull * 0.4), wr: Math.sin(t * 15) * 0.2, bite: 0, holding: true };
    }
    k -= STEAL.hang;
    if (k < STEAL.down) {
      const q = k / STEAL.down;
      return { ...base, lift: rf.lift * (1 - easeIn(q)), bite: 0.3 };
    }
    k -= STEAL.down;
    if (k < STEAL.back) {
      const p = along(BACK, smooth(k / STEAL.back));
      return { x: p.x, y: p.y, z: 0, dir: p.dir, pose: 'run', ph: t * 24, bite: 0.3, wag: 0.2 };
    }
    return sitting(tt, t, { bite: 0.3 });
  }

  function finalePose(u, tt, t) {
    const ph = F.phase.find((p) => u < p.t0 + p.dur) || F.phase[F.phase.length - 1];
    const q = clamp((u - ph.t0) / (ph.dur || 1));
    const rf = F.reach;
    const jump = { x: JUMP[0], y: JUMP[1], z: 0, dir: 'l', pose: rf.pose, sy: rf.sy, wag: Math.sin(t * 20) * 0.5 };
    const onTable = { z: TABLE.h, cream: creamAt(tt) };
    switch (ph.name) {
      case 'watch': return sitting(tt, t, { look: 'perk', tilt: 0.35, wag: 0 });
      case 'go': {
        const p = along(OUT, q);
        return { x: p.x, y: p.y, z: 0, dir: p.dir, pose: 'walk', ph: t * 11, bite: chewed(tt), wag: Math.sin(t * 9) * 0.3 };
      }
      case 'up': return { ...jump, lift: rf.lift * easeOut(q), holding: q > 0.8, bite: 0 };
      case 'hang': {
        const pull = 0.24 * Math.sin(Math.min(1, q * 2.5) * Math.PI / 2) + 0.04 * Math.sin(t * 20);
        return { ...jump, lift: Math.max(0, rf.lift - pull), wr: Math.sin(t * 13) * 0.26, holding: true, bite: 0 };
      }
      case 'down': return { ...jump, lift: rf.lift * (1 - easeIn(q)), bite: 0.3 };
      case 'trot': {
        const p = along([JUMP, HOP], q);
        return { x: p.x, y: p.y, z: 0, dir: p.dir, pose: 'walk', ph: t * 12, bite: 0.3, wag: Math.sin(t * 9) * 0.4 };
      }
      case 'hop': return { x: lerp(HOP[0], ONTOP[0], q), y: lerp(HOP[1], ONTOP[1], q), z: TABLE.h * q + Math.sin(q * Math.PI) * 0.5, dir: 'r', pose: 'run', ph: 1.2, bite: 0.3 };
      case 'drop': return { ...onTable, x: ONTOP[0], y: ONTOP[1], dir: 'r', pose: 'stand', bite: q < 0.5 ? 0.3 : 0, resting: q >= 0.5, wag: Math.sin(t * 9) * 0.4 };
      case 'step': {
        const p = along([ONTOP, EAT], q);
        return { ...onTable, x: p.x, y: p.y, dir: 'l', pose: 'walk', ph: t * 12, resting: true, wag: Math.sin(t * 12) * 0.5 };
      }
      case 'eat': {
        // Face down in it, like his Lordship next door. Up for air now and then.
        const u2 = u - ph.t0, up = (u2 % 7.5) > 6.3;
        return {
          ...onTable, x: EAT[0], y: EAT[1], dir: 'l', pose: 'feast', lean: up ? 0.12 : 0.5 + Math.sin(t * 9) * 0.07,
          resting: true, wag: Math.sin(t * 24) * 0.55, tongue: up ? (Math.sin(t * 8) + 1) / 2 : 0,
        };
      }
      case 'lick': return { ...onTable, x: EAT[0], y: EAT[1], dir: 'l', pose: 'feast', lean: 0.55 + Math.sin(t * 11) * 0.06, resting: true, wag: Math.sin(t * 24) * 0.5, tongue: 1 };
      case 'fetch': {
        const p = along([EAT, [REST[0] - 0.35, REST[1]]], q);
        return { ...onTable, x: p.x, y: p.y, dir: 'r', pose: 'walk', ph: t * 12, resting: q < 0.9, bite: q < 0.9 ? 0 : 0.3 };
      }
      case 'hopdown': return { x: lerp(REST[0] - 0.35, 9.4, q), y: lerp(REST[1], 9.9, q), z: TABLE.h * (1 - q) + Math.sin(q * Math.PI) * 0.35, dir: 'l', pose: 'run', ph: 2.5, bite: 0.3, cream: creamAt(tt) };
      default: {
        const p = along([[9.4, 9.9], HOME], q);
        return { x: p.x, y: p.y, z: 0, dir: p.dir, pose: 'walk', ph: t * 12, bite: 0.3, cream: creamAt(tt) };
      }
    }
  }

  function at(t) {
    const tt = wrap(t);
    for (const s of steals) {
      const u = since(tt, s.start);
      if (u < s.len) return stealPose(s, u, tt, t);
    }
    const u = since(tt, F.start);
    if (u < F.len) return finalePose(u, tt, t);
    return sitting(tt, t);
  }

  // Sausages left on the string: a fresh ten when she hangs it, one fewer at every snap.
  const snaps = steals.map((s) => s.snap).concat([F.snap]);
  const left = (tt) => {
    const u = since(tt, ev.hang);
    return Math.max(0, N0 - snaps.filter((s) => since(s, ev.hang) <= u).length);
  };
  // How long since the string last jumped (a snap, or being hung up).
  const jolt = (tt) => snaps.concat([ev.hang]).reduce((m, s) => Math.min(m, since(tt, s)), 1e9);
  // When it scampers past her heels (and kicks up flour).
  const puffs = [];
  for (const s of steals) {
    puffs.push(wrap(s.start + (STEAL.peek + STEAL.out * 0.55) * s.sc));
    puffs.push(wrap(s.start + (STEAL.peek + STEAL.out + STEAL.up + STEAL.hang + STEAL.down + STEAL.back * 0.45) * s.sc));
  }
  return { at, left, jolt, puffs, steals, F, creamAt };
}

// Trifle II, as it goes together: sponge, a splash of sherry, jelly, custard,
// cream and a cherry, a little more every time her back is turned. Then the
// dog eats it, top down.
const STAGES = ['sponge', 'sherry', 'jelly', 'jelly', 'custard', 'custard', 'cream', 'cream', 'cherry'];
const LAYERS = [['sponge', 0, 0.16], ['jelly', 0.16, 0.32], ['custard', 0.32, 0.46], ['cream', 0.46, 0.6]];
function planTrifle(ev, F) {
  const wins = ev.away.slice().sort((a, b) => since(a[0], F.eat1) - since(b[0], F.eat1));
  const stageOf = (i) => STAGES[Math.min(STAGES.length - 1, Math.floor((i * STAGES.length) / wins.length))];
  return (t) => {
    const tt = wrap(t);
    const e = since(tt, F.eat0), eatLen = since(F.eat1, F.eat0);
    if (e < eatLen) return { h: 0.6 * (1 - e / eatLen), soak: 1, cherry: e < 0.6, swirl: e < eatLen * 0.2, eaten: true };
    const u = since(tt, F.eat1);
    const done = { sponge: 0, sherry: 0, jelly: 0, custard: 0, cream: 0, cherry: 0 };
    const need = { sponge: 0, sherry: 0, jelly: 0, custard: 0, cream: 0, cherry: 0 };
    wins.forEach(([a, b], i) => { need[stageOf(i)]++; });
    wins.forEach(([a, b], i) => {
      const s0 = since(a, F.eat1), s1 = s0 + (b - a);
      const q = clamp((u - s0) / (s1 - s0));
      done[stageOf(i)] += q;
    });
    const k = (name) => (need[name] ? done[name] / need[name] : 1);
    if (since(tt, F.start) < since(F.eat0, F.start)) return { h: 0.6, soak: 1, cherry: true, swirl: true };
    let h;
    if (k('sponge') < 1) h = 0.16 * k('sponge');
    else if (k('jelly') < 1) h = 0.16 + 0.16 * k('jelly');
    else if (k('custard') < 1) h = 0.32 + 0.14 * k('custard');
    else h = 0.46 + 0.14 * k('cream');
    return { h, soak: k('sherry'), cherry: k('cherry') > 0.5, swirl: k('cream') > 0.8, licked: u < 20 && h < 0.01 };
  };
}

// ---------- The props ----------
// The trifle bowl: glass on a foot, with the layers showing through.
function drawTrifle(ctx, x, y, z, s, t, rimOnly) {
  const [X, Yb] = P(x, y, z);
  const r0 = 0.34, r1 = 0.56, H = 0.62, zb = 0.15;
  const Yz = (h) => Yb - (zb + h) * ZK;
  const rAt = (h) => (r0 + (r1 - r0) * (h / H)) * Math.SQRT2;
  const rim = () => {
    ctx.beginPath();
    ctx.ellipse(X, Yz(H), rAt(H), rAt(H) / 2, 0, 0, Math.PI);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.045;
    ctx.stroke();
    if (Q.detail) {
      ctx.beginPath();
      ctx.moveTo(X - rAt(0.1) + 0.12, Yz(0.08));
      ctx.lineTo(X - rAt(H * 0.8) + 0.16, Yz(H * 0.78));
      ctx.strokeStyle = alpha(C.white, 0.75);
      ctx.lineWidth = 0.05;
      ctx.stroke();
    }
  };
  if (rimOnly) { rim(); return; }
  // foot and stem
  ctx.beginPath();
  ctx.ellipse(X, Yb, 0.3 * Math.SQRT2, 0.15 * Math.SQRT2, 0, 0, TAU);
  paint(ctx, tint(GLASS, 0.3), { lw: 0.035 });
  ctx.beginPath();
  ctx.rect(X - 0.07, Yz(0) , 0.14, zb * ZK);
  paint(ctx, tint(GLASS, 0.2), { lw: 0.03 });
  // the bowl, back glass first
  const bowl = () => {
    ctx.beginPath();
    ctx.moveTo(X - rAt(0), Yz(0));
    ctx.lineTo(X - rAt(H), Yz(H));
    ctx.ellipse(X, Yz(H), rAt(H), rAt(H) / 2, 0, Math.PI, TAU);
    ctx.lineTo(X + rAt(0), Yz(0));
    ctx.ellipse(X, Yz(0), rAt(0), rAt(0) / 2, 0, 0, Math.PI);
    ctx.closePath();
  };
  bowl();
  ctx.fillStyle = alpha(tint(GLASS, 0.4), 0.55);
  ctx.fill();
  // the layers, seen through the side
  const band = (a, b, col, dotsC) => {
    if (b - a < 0.005) return;
    ctx.beginPath();
    ctx.moveTo(X - rAt(a), Yz(a));
    ctx.lineTo(X - rAt(b), Yz(b));
    ctx.ellipse(X, Yz(b), rAt(b), rAt(b) / 2, 0, Math.PI, 0, true);
    ctx.lineTo(X + rAt(a), Yz(a));
    ctx.ellipse(X, Yz(a), rAt(a), rAt(a) / 2, 0, 0, Math.PI);
    ctx.closePath();
    paint(ctx, col, { stroke: false, dots: dotsC, density: 0.3 });
  };
  const colors = { sponge: mix(SPONGE, SOAKED, s.soak || 0), jelly: MAT.trifle, custard: MAT.custard, cream: MAT.cream };
  let top = null;
  for (const [name, a, b] of LAYERS) {
    const hi = Math.min(b, s.h);
    if (hi <= a) break;
    band(a, hi, colors[name], name === 'sponge' ? shade(colors.sponge, 0.35) : name === 'jelly' ? shade(MAT.trifle, 0.3) : null);
    top = name;
    // sponge fingers and fruit showing against the glass
    if (Q.detail && name === 'sponge' && hi > 0.08) {
      ctx.fillStyle = mix(colors.sponge, INK.bone, 0.35);
      for (let i = 0; i < 5; i++) {
        const a2 = Math.PI * (0.15 + i * 0.17);
        ctx.beginPath();
        ctx.ellipse(X - Math.cos(a2) * rAt(hi * 0.5) * 0.9, Yz(hi * 0.5) + Math.sin(a2) * rAt(hi * 0.5) * 0.45, 0.07, 0.05, 0, 0, TAU);
        ctx.fill();
      }
    }
    if (Q.detail && name === 'jelly' && hi > 0.2) {
      ctx.fillStyle = alpha(C.white, 0.5);
      ctx.beginPath(); ctx.ellipse(X - rAt(0.24) * 0.55, Yz(0.25) + 0.1, 0.06, 0.03, -0.3, 0, TAU); ctx.fill();
    }
  }
  if (top) {
    const c = colors[top];
    ctx.beginPath();
    ctx.ellipse(X, Yz(s.h), rAt(s.h), rAt(s.h) / 2, 0, 0, TAU);
    paint(ctx, tint(c, 0.25), { stroke: false });
    if (s.eaten && Q.detail) {
      ctx.fillStyle = shade(c, 0.25);
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(X - 0.2 + i * 0.2, Yz(s.h) + (i % 2) * 0.05, 0.09, 0.04, 0, 0, TAU); ctx.fill(); }
    }
    if (s.swirl && top === 'cream') {
      for (let i = 0; i < 7; i++) {
        const a2 = (i / 7) * TAU;
        const bx = X + Math.cos(a2) * rAt(s.h) * 0.62, by = Yz(s.h) + Math.sin(a2) * rAt(s.h) * 0.31;
        ctx.beginPath(); ctx.arc(bx, by - 0.04, 0.075, 0, TAU);
        paint(ctx, MAT.cream, { lw: 0.025 });
      }
    }
    if (s.cherry && top === 'cream') {
      ctx.beginPath(); ctx.arc(X, Yz(s.h) - 0.1, 0.085, 0, TAU);
      paint(ctx, INK.oxblood, { lw: 0.03 });
      ctx.beginPath(); ctx.moveTo(X, Yz(s.h) - 0.18); ctx.quadraticCurveTo(X + 0.05, Yz(s.h) - 0.3, X + 0.12, Yz(s.h) - 0.32);
      ctx.strokeStyle = MAT.leafDark; ctx.lineWidth = 0.025; ctx.stroke();
    }
  } else if (s.licked && Q.detail) {
    // licked clean, nearly
    ctx.strokeStyle = alpha(MAT.custard, 0.8);
    ctx.lineWidth = 0.04;
    ctx.beginPath(); ctx.moveTo(X - 0.3, Yz(0.3)); ctx.lineTo(X - 0.22, Yz(0.12)); ctx.moveTo(X + 0.2, Yz(0.4)); ctx.lineTo(X + 0.26, Yz(0.2)); ctx.stroke();
  }
  // front glass: the outline and the rim
  bowl();
  ctx.fillStyle = alpha(C.white, 0.08);
  ctx.fill();
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.04; ctx.stroke(); }
  ctx.beginPath();
  ctx.ellipse(X, Yz(H), rAt(H), rAt(H) / 2, 0, 0, TAU);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.04;
  ctx.stroke();
  rim();
}

// The kitchen timer: a round wind-up one with twin bells, set for the trifle.
// At midnight it rings (ring: 0..1).
function drawTimer(ctx, x, y, z, t, hand, ring) {
  const [X, Y] = P(x, y, z);
  const shake = ring ? Math.sin(t * 61) * 0.04 * ring : 0;
  ctx.save();
  ctx.translate(X + shake, Y);
  ctx.rotate(ring ? Math.sin(t * 47) * 0.12 * ring : 0);
  ctx.scale(TIMER_K, TIMER_K);
  ctx.fillStyle = C.ink;
  ctx.fillRect(-0.18, -0.07, 0.08, 0.07);
  ctx.fillRect(0.1, -0.07, 0.08, 0.07);
  // the bells, and the hammer between them
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * 0.15, -0.53, 0.11, Math.PI, 0);
    ctx.closePath();
    paint(ctx, MAT.brass, { lw: 0.03, dots: MAT.brassDark, density: 0.3 });
  }
  ctx.beginPath();
  const hx = ring ? Math.sin(t * 70) * 0.09 : 0;
  ctx.moveTo(0, -0.5); ctx.lineTo(hx, -0.64);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.035; ctx.stroke();
  // the case and the face
  ctx.beginPath();
  ctx.arc(0, -0.3, 0.26, 0, TAU);
  paint(ctx, ENAMEL, { lw: 0.05, dots: shade(ENAMEL, 0.4), density: 0.2 });
  ctx.beginPath();
  ctx.arc(0, -0.3, 0.19, 0, TAU);
  paint(ctx, CHINA, { lw: 0.025 });
  if (Q.detail) {
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      ctx.moveTo(Math.sin(a) * 0.15, -0.3 - Math.cos(a) * 0.15);
      ctx.lineTo(Math.sin(a) * 0.18, -0.3 - Math.cos(a) * 0.18);
    }
    ctx.stroke();
    // the part of the dial still to go, in red
    ctx.beginPath();
    ctx.moveTo(0, -0.3);
    ctx.arc(0, -0.3, 0.13, -Math.PI / 2, -Math.PI / 2 + hand, false);
    ctx.closePath();
    ctx.fillStyle = alpha(INK.oxblood, 0.35);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(0, -0.3);
  ctx.lineTo(Math.sin(hand) * 0.15, -0.3 - Math.cos(hand) * 0.15);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.035;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -0.3, 0.03, 0, TAU);
  ctx.fillStyle = C.ink;
  ctx.fill();
  ctx.restore();
}

// A copper pan hanging flat against the chimney breast, from a hook at (u, z).
function hangingPan(ctx, u, at, z, r, swing) {
  ctx.save();
  onWall(ctx, 'right', u, at, z);
  ctx.rotate(-swing);
  ctx.beginPath(); // handle, up to the hook
  ctx.roundRect(-0.045, -0.12 - r * 1.1, 0.09, r * 1.1, 0.03);
  paint(ctx, COPPER_LO, { lw: 0.025 });
  ctx.beginPath();
  ctx.arc(0, -0.12 - r * 2.15, r, 0, TAU);
  paint(ctx, COPPER, { lw: 0.035, dots: COPPER_LO, density: 0.25 });
  if (Q.detail) {
    ctx.beginPath();
    ctx.arc(0, -0.12 - r * 2.15, r * 0.72, 0, TAU);
    ctx.strokeStyle = COPPER_LO;
    ctx.lineWidth = 0.025;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-r * 0.3, -0.12 - r * 2.15 + r * 0.25, r * 0.4, Math.PI * 0.9, Math.PI * 1.4);
    ctx.strokeStyle = COPPER_HI;
    ctx.lineWidth = 0.04;
    ctx.stroke();
  }
  ctx.restore();
}

// A lumpy blob on the floor (spilled flour): center, radii, seed.
function blob(ctx, cx, cy, rx, ry, seed, n = 14) {
  const r = rng(seed);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const k = 0.75 + r() * 0.45;
    pts.push(P(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k, 0.01));
  }
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (i === 0) ctx.moveTo(m[0], m[1]);
    const c = pts[(i + 1) % n], nx = pts[(i + 2) % n];
    ctx.quadraticCurveTo(c[0], c[1], (c[0] + nx[0]) / 2, (c[1] + nx[1]) / 2);
  }
  ctx.closePath();
}

// A jar on a shelf against the left wall, standing at (x, y, z).
function jar(ctx, x, y, z, r, h, color, lid, o = {}) {
  cylinder(ctx, x, y, z, r, h, color, { top: tint(color, 0.25) });
  if (Q.detail && o.label) {
    const [X, Y] = P(x, y, z + h * 0.45);
    ctx.fillStyle = o.label;
    ctx.fillRect(X - r * 1.05, Y - h * 0.22, r * 2.1, h * 0.4);
  }
  if (lid) {
    cylinder(ctx, x, y, z + h, r * 1.05, 0.07, lid, { top: tint(lid, 0.2) });
  }
}

// ---------- The zone ----------
export default {
  id: 'kitchen',
  name: 'Kitchen',
  blurb: 'Mrs. Hatchett is baking a second trifle, out of respect. The dog steals a sausage every time she turns round.',

  build(R) {
    const ev = readEvening(R);
    const dog = planDog(ev);
    const trifleAt = planTrifle(ev, dog.F);

    // ---------- Floor: stone flags ----------
    R.floor((ctx) => {
      slab(ctx, FLAG);
      rect(ctx, 0, 0, S, S, 0, FLAG, { stroke: false });
      if (!Q.detail) return;
      const r = rng(31);
      const stones = [];
      let row = 0;
      for (let y = 0; y < S - 1e-6; y += 1.6, row++) {
        let x = row % 2 ? -0.8 : 0;
        while (x < S) {
          const w = 1.4 + r() * 1.1;
          stones.push([Math.max(0, x), y, Math.min(S, x + w), Math.min(S, y + 1.6), r(), r()]);
          x += w;
        }
      }
      for (const [x0, y0, x1, y1, k, k2] of stones) {
        if (k < 0.35) rect(ctx, x0, y0, x1 - x0, y1 - y0, 0, mix(FLAG, INK.bone, 0.05 + k2 * 0.07), { stroke: false });
        else if (k > 0.78) rect(ctx, x0, y0, x1 - x0, y1 - y0, 0, mix(FLAG, INK.stormNavy, 0.04 + k2 * 0.05), { stroke: false, dots: JOINT, density: 0.12 });
      }
      ctx.beginPath();
      for (const [x0, y0, x1, y1] of stones) {
        const a = P(x0, y0), b = P(x1, y0), c = P(x0, y1);
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
        ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]);
      }
      ctx.strokeStyle = JOINT;
      ctx.lineWidth = 0.045;
      ctx.stroke();
      // A worn patch in front of the range, and soot on the stones by it.
      ctx.beginPath();
      const [sx, sy] = P(8, 2.4);
      ctx.ellipse(sx, sy, 4.2, 1.1, 0, 0, TAU);
      ctx.fillStyle = alpha(INK.stormNavy, 0.08);
      ctx.fill();
    });

    // ---------- Walls: bone tiles with verdigris trim ----------
    R.walls({ left: PLASTER, right: mix(PLASTER, INK.stormNavy, 0.05), cap: INK.bone, cut: INK.stormNavy, doors: DOORS.kitchen || [] });
    const DOOR0 = 11.4, DOOR1 = 13.6, DOOR_H = 3.6; // the dining room door, in the left wall
    const TOPT = 2.3; // where the tiles stop
    R.wall((ctx) => {
      for (const [a, b] of [[0, DOOR0], [DOOR1, S]]) onLeft(ctx, a, 0, b - a, TOPT, TILE, { stroke: false });
      onRight(ctx, 0, 0, S, TOPT, tint(TILE, 0.05), { stroke: false });
      if (Q.detail) {
        ctx.beginPath();
        for (let z = 0.3; z < TOPT; z += 0.5) {
          for (const [a, b] of [[0, DOOR0], [DOOR1, S]]) { const p = P(0, a, z), q = P(0, b, z); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }
          const p = P(0, 0, z), q = P(S, 0, z); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
        }
        for (let u = 0.5; u < S; u += 0.5) {
          if (u <= DOOR0 || u >= DOOR1) { const p = P(0, u, 0.3), q = P(0, u, TOPT); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }
          const p = P(u, 0, 0.3), q = P(u, 0, TOPT); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
        }
        ctx.strokeStyle = GROUT;
        ctx.lineWidth = 0.025;
        ctx.stroke();
      }
      // skirting, a row of green tiles at waist height, and the border on top
      for (const [a, b] of [[0, DOOR0], [DOOR1, S]]) {
        onLeft(ctx, a, 0, b - a, 0.3, K.trim, { stroke: false, dots: shade(K.trim, 0.4), density: 0.2 });
        onLeft(ctx, a, 1.05, b - a, 0.15, K.trim, { stroke: false });
        onLeft(ctx, a, TOPT, b - a, 0.14, K.trim, { stroke: false });
      }
      onRight(ctx, 0, 0, S, 0.3, K.trim, { stroke: false, dots: shade(K.trim, 0.4), density: 0.2 });
      onRight(ctx, 0, 1.05, S, 0.15, K.trim, { stroke: false });
      onRight(ctx, 0, TOPT, S, 0.14, K.trim, { stroke: false });
      // a picture rail near the top
      onLeft(ctx, 0, 5.3, S, 0.08, K.trim, { stroke: false });
      onRight(ctx, 0, 5.3, S, 0.08, K.trim, { stroke: false });
    });

    // The door frame, the mouse hole and the notices on the left wall.
    R.decor((ctx) => {
      onLeft(ctx, DOOR0 - 0.16, 0, 0.16, DOOR_H + 0.16, K.trim, { lw: 0.03 });
      onLeft(ctx, DOOR1, 0, 0.16, DOOR_H + 0.16, K.trim, { lw: 0.03 });
      onLeft(ctx, DOOR0 - 0.16, DOOR_H, DOOR1 - DOOR0 + 0.32, 0.16, K.trim, { lw: 0.03 });
      // the mouse's front door
      ctx.beginPath();
      const a0 = P(0, 9.05, 0), a1 = P(0, 9.55, 0);
      ctx.moveTo(a0[0], a0[1]);
      ctx.lineTo(a0[0], a0[1] - 0.22);
      ctx.quadraticCurveTo((a0[0] + a1[0]) / 2, (a0[1] + a1[1]) / 2 - 0.55, a1[0], a1[1] - 0.22);
      ctx.lineTo(a1[0], a1[1]);
      ctx.closePath();
      paint(ctx, PIT, { lw: 0.03 });
      // The menu slate: somebody has been at it with a beak.
      onLeft(ctx, 8.0, 2.55, 2.4, 1.5, MAT.oak, { lw: 0.04 });
      onLeft(ctx, 8.1, 2.65, 2.2, 1.3, SLATE, { lw: 0.02 });
      if (Q.detail) {
        const chalk = alpha(C.white, 0.85);
        paintText(ctx, 'left', 9.2, 3.72, 'MENU', 0.24, chalk);
        paintText(ctx, 'left', 9.2, 3.38, 'TODAY: TRIFLE', 0.17, chalk, 'Rethink Sans');
        paintText(ctx, 'left', 9.2, 3.1, 'TOMORROW: TRIFLE', 0.17, chalk, 'Rethink Sans');
        paintText(ctx, 'left', 9.2, 2.82, 'SUNDAY: GOOSE', 0.17, chalk, 'Rethink Sans');
        // scratched out
        ctx.beginPath();
        for (let i = 0; i < 4; i++) { const p = P(0, 8.75 + i * 0.08, 2.7 + (i % 2) * 0.22), q = P(0, 9.75 + i * 0.07, 2.95 - (i % 2) * 0.2); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }
        ctx.strokeStyle = chalk;
        ctx.lineWidth = 0.035;
        ctx.stroke();
      }
      // A notice by the door.
      onLeft(ctx, 14.1, 2.2, 1.5, 0.95, CHINA, { lw: 0.035 });
      onLeft(ctx, 14.17, 2.27, 1.36, 0.81, null, { lw: 0.03, stroke: INK.oxblood });
      if (Q.detail) {
        paintText(ctx, 'left', 14.85, 2.87, 'NO GEESE', 0.24, INK.oxblood);
        paintText(ctx, 'left', 14.85, 2.52, 'BEYOND THIS POINT', 0.12, C.ink, 'Rethink Sans');
      }
      // The calendar: today, ringed. HIS 80TH.
      onRight(ctx, 15.2, 2.6, 0.7, 1.0, CHINA, { lw: 0.03 });
      onRight(ctx, 15.26, 3.05, 0.58, 0.48, mix(INK.verdigris, INK.bone, 0.3), { stroke: false });
      if (Q.detail) {
        paintText(ctx, 'right', 15.55, 2.82, 'HIS 80TH', 0.13, INK.oxblood);
        ctx.beginPath(); // a goose on it, naturally
        const g = P(15.55, 0, 3.25);
        ctx.ellipse(g[0], g[1], 0.14, 0.08, 0.4, 0, TAU);
        ctx.fillStyle = C.white;
        ctx.fill();
      }
    });

    // ---------- The range, the chimney breast and the mantel ----------
    const RX = 4, RY = 0.2, RW = 8, RD = 1.4, RH = 1.4;
    R.thing(RX + RW / 2, RY + RD, (ctx) => {
      // the chimney breast behind, up to the ceiling
      box(ctx, 4.5, 0, RH, 7, 0.45, 6 - RH, PLASTER, { left: mix(PLASTER, INK.bone, 0.08), right: shade(PLASTER, 0.12), top: INK.bone, flat: true });
      onRight(ctx, 4.5, RH, 7, 0.9, TILE, { stroke: false }); // (the tiles behind the hob)
      face(ctx, [[4.5, 0.45, RH], [11.5, 0.45, RH], [11.5, 0.45, RH + 0.95], [4.5, 0.45, RH + 0.95]], TILE, { lw: 0.03 });
      if (Q.detail) {
        ctx.beginPath();
        for (let x = 5; x < 11.5; x += 0.5) { const p = P(x, 0.45, RH), q = P(x, 0.45, RH + 0.95); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }
        const p = P(4.5, 0.45, RH + 0.48), q = P(11.5, 0.45, RH + 0.48); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
        ctx.strokeStyle = GROUT; ctx.lineWidth = 0.025; ctx.stroke();
      }
      // the mantel shelf
      box(ctx, 3.85, 0, 2.38, 8.3, 0.7, 0.12, MAT.oak, { top: MAT.oakLight });
      for (const bx of [4.3, 11.5]) box(ctx, bx, 0, 2.05, 0.18, 0.5, 0.33, MAT.oak, { flat: true });
      // the range itself: black iron
      box(ctx, RX, RY, 0, RW, RD, RH, IRON, { left: IRON_LIT, right: IRON, top: IRON_TOP, flat: true });
      const fy = RY + RD + 0.005;
      const onFront = (x0, z0, x1, z1, fill, o) => face(ctx, [[x0, fy, z0], [x1, fy, z0], [x1, fy, z1], [x0, fy, z1]], fill, o);
      onFront(RX, 0, RX + RW, 0.14, mix(IRON, C.black, 0.4), { lw: 0.03 });
      for (const x0 of [4.35, 9.3]) {
        onFront(x0, 0.24, x0 + 2.35, 1.1, IRON, { lw: 0.045 });
        onFront(x0 + 0.12, 0.34, x0 + 2.23, 1.0, null, { lw: 0.025, stroke: IRON_TOP });
        face(ctx, [[x0 + 0.4, fy + 0.02, 0.93], [x0 + 1.95, fy + 0.02, 0.93]], null, { lw: 0.09, stroke: MAT.brass });
        const k = P(x0 + 1.17, fy, 0.62);
        ctx.beginPath(); ctx.arc(k[0], k[1], 0.14, 0, TAU); paint(ctx, MAT.brassDark, { lw: 0.03 });
        if (Q.detail) { ctx.beginPath(); ctx.arc(k[0], k[1], 0.06, 0, TAU); ctx.fillStyle = MAT.brass; ctx.fill(); }
      }
      // the firebox frame (the fire itself flickers, below)
      onFront(6.95, 0.28, 9.05, 1.2, MAT.brassDark, { lw: 0.045 });
      // the brass rail along the front, and tea towels on it
      face(ctx, [[4.1, fy + 0.18, 1.22], [11.9, fy + 0.18, 1.22]], null, { lw: 0.08, stroke: MAT.brass });
      for (const [tx, col] of [[5.1, INK.verdigris], [10.6, INK.oxblood]]) {
        face(ctx, [[tx, fy + 0.19, 1.24], [tx + 0.75, fy + 0.19, 1.24], [tx + 0.78, fy + 0.19, 0.42], [tx - 0.02, fy + 0.19, 0.45]], MAT.linen, { lw: 0.03 });
        if (Q.detail) for (const z of [0.62, 0.72]) face(ctx, [[tx, fy + 0.2, z], [tx + 0.76, fy + 0.2, z]], null, { lw: 0.05, stroke: col });
      }
      // hotplates
      for (const hx of [5.4, 8.0, 10.6]) {
        disc(ctx, hx, 0.95, RH + 0.01, 0.45, mix(IRON, C.black, 0.3), { lw: 0.03 });
        if (Q.detail) disc(ctx, hx, 0.95, RH + 0.012, 0.28, null, { lw: 0.025, stroke: IRON_TOP });
      }
      // the stockpot, the custard pan and the kettle
      cylinder(ctx, 5.4, 0.95, RH, 0.42, 0.62, COPPER, { top: COPPER_LO });
      disc(ctx, 5.4, 0.95, RH + 0.62, 0.33, mix(MAT.custard, INK.bone, 0.2), { stroke: false });
      cylinder(ctx, 8.0, 0.95, RH, 0.3, 0.26, IRON_TOP, { top: MAT.custard });
      face(ctx, [[8.2, 0.9, RH + 0.26], [8.9, 1.6, RH + 0.45]], null, { lw: 0.07, stroke: IRON });
      const sp = P(8.05, 0.95, RH + 0.24), sq = P(7.9, 0.75, RH + 0.95);
      ctx.beginPath(); ctx.moveTo(sp[0], sp[1]); ctx.lineTo(sq[0], sq[1]);
      ctx.strokeStyle = MAT.oak; ctx.lineWidth = 0.06; ctx.lineCap = 'round'; ctx.stroke();
      cylinder(ctx, 10.6, 0.95, RH, 0.3, 0.42, MAT.silver, { top: tint(MAT.silver, 0.2) });
      const kp = P(10.6, 0.95, RH + 0.42);
      ctx.beginPath(); ctx.ellipse(kp[0], kp[1] - 0.12, 0.3, 0.2, 0, Math.PI, TAU); paint(ctx, MAT.silver, { lw: 0.03 });
      const sp1 = P(10.9, 1.1, RH + 0.3), sp2 = P(11.2, 1.3, RH + 0.55);
      ctx.beginPath(); ctx.moveTo(sp1[0], sp1[1]); ctx.lineTo(sp2[0], sp2[1]);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.11; ctx.stroke();
      ctx.strokeStyle = MAT.silver; ctx.lineWidth = 0.06; ctx.stroke();
      ctx.beginPath(); ctx.arc(kp[0], kp[1] - 0.47, 0.05, 0, TAU); ctx.fillStyle = C.ink; ctx.fill();
      // on the mantel: candlesticks (lit, below), tea tins and a china dog
      for (const cx of [4.45, 11.55]) cylinder(ctx, cx, 0.35, 2.5, 0.12, 0.12, MAT.brass, { top: MAT.brassDark });
      [[5.3, INK.verdigris, 0.42], [5.75, INK.oxblood, 0.34], [6.15, MAT.brass, 0.3]].forEach(([cx, col, h]) => cylinder(ctx, cx, 0.35, 2.5, 0.17, h, col, { top: tint(col, 0.25) }));
      if (Q.detail) {
        const tl = P(5.3, 0.52, 2.72);
        smallPrint(ctx, tl[0], tl[1], 'TEA', 0.1, INK.bone);
      }
      // the china dog, who looks a lot more trustworthy than the real one
      const cd = P(10.3, 0.35, 2.5);
      ctx.beginPath(); ctx.ellipse(cd[0], cd[1] - 0.2, 0.16, 0.2, 0, 0, TAU); paint(ctx, CHINA, { lw: 0.03 });
      ctx.beginPath(); ctx.arc(cd[0] + 0.05, cd[1] - 0.46, 0.11, 0, TAU); paint(ctx, CHINA, { lw: 0.03 });
      ctx.beginPath(); ctx.ellipse(cd[0] - 0.05, cd[1] - 0.42, 0.04, 0.09, 0.3, 0, TAU); ctx.fillStyle = INK.oxblood; ctx.fill();
    });
    // The fire in the firebox, flickering, and its glow on the stones.
    R.thing(RX + RW / 2, RY + RD + 0.02, (ctx, t) => {
      const fy = RY + RD + 0.012;
      const inner = [[7.1, fy, 0.38], [8.9, fy, 0.38], [8.9, fy, 1.1], [7.1, fy, 1.1]];
      face(ctx, inner, mix(INK.oxblood, C.black, 0.4), { lw: 0.03 });
      ctx.save();
      poly(ctx, inner);
      ctx.clip();
      for (let i = 0; i < 7; i++) {
        const x = 7.2 + i * 0.26;
        const h = 0.3 + 0.25 * Math.abs(Math.sin(t * (5 + i) + i * 1.9));
        const [X, Y] = P(x, fy, 0.4);
        ctx.beginPath();
        ctx.moveTo(X - 0.14, Y);
        ctx.quadraticCurveTo(X - 0.12, Y - h, X, Y - h - 0.14);
        ctx.quadraticCurveTo(X + 0.12, Y - h, X + 0.14, Y);
        ctx.closePath();
        ctx.fillStyle = i % 2 ? C.coral : INK.candleGold;
        ctx.fill();
      }
      ctx.restore();
      // the grate's bars
      if (Q.detail) for (let x = 7.3; x < 8.9; x += 0.3) face(ctx, [[x, fy + 0.01, 0.38], [x, fy + 0.01, 1.1]], null, { lw: 0.05, stroke: IRON });
    }, { anim: true, depth: RX + RW / 2 + RY + RD + 0.05 });
    fire(R, 8, 1, 1.5, 31);
    candle(R, 4.45, 0.35, 2.62, 84);
    candle(R, 11.55, 0.35, 2.62, 85);

    // Copper pans on the chimney breast: they rattle when the thunder hits.
    const lastBoom = (tt) => {
      let best = { age: 99, big: false };
      for (const s of storm.strikes) { const age = since(tt, s.t); if (age < best.age) best = { age, big: s.big }; }
      return best;
    };
    // (They hang on the chimney breast, so they sort just after the range.)
    const BREAST = RX + RW / 2 + RY + RD;
    const PANS = [[5.2, 0.2], [6.05, 0.26], [7.0, 0.32], [9.0, 0.34], [9.95, 0.27], [10.8, 0.21]];
    R.thing(8, 0.5, (ctx, t) => {
      face(ctx, [[4.9, 0.46, 3.95], [11.1, 0.46, 3.95]], null, { lw: 0.07, stroke: MAT.brass });
      const b = lastBoom(wrap(t));
      const amp = b.age < 4 ? (b.big ? 0.22 : 0.09) * Math.exp(-b.age * 1.1) : 0;
      PANS.forEach(([u, r], i) => hangingPan(ctx, u, 0.47, 3.95, r, amp * Math.sin(b.age * 8 + i * 1.3) + Math.sin(t * 0.8 + i) * 0.01));
    }, { anim: true, depth: BREAST + 0.01 });

    // The clock on the chimney breast. One second of the evening is a minute
    // on it, so it says midnight right when the timer goes off.
    R.thing(8, 0.46, (ctx, t) => {
      const tt = wrap(t);
      ctx.save();
      onWall(ctx, 'right', 8.0, 0.46, 4.9);
      ctx.beginPath(); ctx.arc(0, 0, 0.62, 0, TAU); paint(ctx, MAT.mahogany, { lw: 0.04 });
      ctx.beginPath(); ctx.arc(0, 0, 0.5, 0, TAU); paint(ctx, CHINA, { lw: 0.03 });
      if (Q.detail) {
        ctx.fillStyle = C.ink;
        for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; ctx.beginPath(); ctx.arc(Math.sin(a) * 0.41, Math.cos(a) * 0.41, i % 3 ? 0.025 : 0.045, 0, TAU); ctx.fill(); }
      }
      const m = (tt - MIDNIGHT) / 60;
      ctx.strokeStyle = C.ink;
      ctx.lineCap = 'round';
      ctx.lineWidth = 0.07;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin((m / 12) * TAU) * 0.26, Math.cos((m / 12) * TAU) * 0.26); ctx.stroke();
      ctx.lineWidth = 0.045;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(m * TAU) * 0.4, Math.cos(m * TAU) * 0.4); ctx.stroke();
      ctx.restore();
    }, { anim: true, depth: BREAST + 0.02 });

    // ---------- The bell board: every room in the house can ring for service ----------
    const BELLS = [
      ['LIBRARY', 1.75, 5.35, [[95, 99.5]]],
      ['DINING', 2.6, 5.35, [[2, 5], [150, 153.5]]],
      ['BILLIARDS', 3.45, 5.35, [[58, 61]]],
      ['BEDROOM', 1.75, 4.65, [[120, 122]]],
      ['GUESTS', 2.6, 4.65, [[74, 76.5]]],
      ['HIS LORDSHIP', 3.45, 4.65, [[82.5, 86.5]]],
    ];
    R.decor((ctx) => {
      onRight(ctx, 1.2, 3.95, 2.8, 1.7, MAT.mahogany, { lw: 0.04, dots: MAT.mahoganyDark, density: 0.2 });
      if (Q.detail) {
        for (const [name, u, z] of BELLS) paintText(ctx, 'right', u, z - 0.45, name, name.length > 9 ? 0.085 : 0.1, INK.bone, 'Rethink Sans');
        // under his Lordship's bell, a note
        onRight(ctx, 3.13, 3.6, 0.62, 0.28, CHINA, { lw: 0.02 });
        paintText(ctx, 'right', 3.44, 3.74, 'IGNORE', 0.11, INK.oxblood);
      }
    });
    R.decor((ctx, t) => {
      const tt = wrap(t);
      for (const [, u, z, rings] of BELLS) {
        const on = rings.some(([a, b]) => since(tt, a) < b - a);
        const sw = on ? Math.sin(t * 30) * 0.45 : 0;
        const [X, Y] = P(u, 0.02, z);
        ctx.save();
        ctx.translate(X, Y);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 0.12);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.stroke();
        ctx.translate(0, 0.12);
        ctx.rotate(sw);
        ctx.beginPath();
        ctx.moveTo(-0.13, 0.2); ctx.quadraticCurveTo(-0.12, -0.02, 0, -0.02); ctx.quadraticCurveTo(0.12, -0.02, 0.13, 0.2);
        ctx.closePath();
        paint(ctx, MAT.brass, { lw: 0.025, dots: MAT.brassDark, density: 0.25 });
        ctx.restore();
        if (on && Q.detail) {
          ctx.strokeStyle = INK.candleGold;
          ctx.lineWidth = 0.035;
          for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(X, Y + 0.25, 0.28, s > 0 ? -0.5 : Math.PI - 0.5, s > 0 ? 0.5 : Math.PI + 0.5); ctx.stroke(); }
        }
      }
    }, { anim: true });

    // The utensils, each on its painted outline. The rolling pin's is empty
    // (it turned up in the hall).
    R.decor((ctx) => {
      onRight(ctx, 1.0, 1.55, 2.9, 1.9, MAT.pine, { lw: 0.04, dots: shade(MAT.pine, 0.2), density: 0.15 });
      ctx.save();
      onWall(ctx, 'right', 1.0, 0.01, 1.55);
      const shadow = alpha(C.ink, 0.28);
      const outline = (fn) => { fn(); ctx.fillStyle = shadow; ctx.fill(); };
      // ladle
      outline(() => { ctx.beginPath(); ctx.rect(0.33, 0.8, 0.07, 0.9); ctx.arc(0.365, 0.72, 0.16, 0, TAU); });
      ctx.beginPath(); ctx.rect(0.36, 0.84, 0.07, 0.9); ctx.arc(0.395, 0.76, 0.16, 0, TAU); paint(ctx, MAT.silver, { lw: 0.025 });
      // whisk
      ctx.beginPath(); ctx.ellipse(0.95, 0.95, 0.13, 0.28, 0, 0, TAU); ctx.rect(0.92, 1.2, 0.06, 0.5);
      paint(ctx, MAT.silver, { lw: 0.025 });
      // sieve
      ctx.beginPath(); ctx.arc(1.55, 1.2, 0.3, 0, TAU); paint(ctx, MAT.silver, { lw: 0.03, dots: C.ink, density: 0.15 });
      ctx.beginPath(); ctx.rect(1.52, 1.5, 0.06, 0.25); paint(ctx, MAT.oak, { lw: 0.02 });
      // wooden spoons
      for (const sx of [2.15, 2.45]) { ctx.beginPath(); ctx.rect(sx - 0.03, 0.95, 0.06, 0.8); ctx.ellipse(sx, 0.85, 0.08, 0.14, 0, 0, TAU); paint(ctx, MAT.oakLight, { lw: 0.025 }); }
      // the rolling pin: just its outline
      ctx.beginPath(); ctx.roundRect(0.3, 0.12, 2.2, 0.26, 0.12);
      ctx.fillStyle = shadow; ctx.fill();
      if (Q.detail) {
        ctx.setLineDash([0.06, 0.05]);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
      if (Q.detail) paintText(ctx, 'right', 2.4, 1.8, 'ROLLING PIN', 0.1, INK.bone, 'Rethink Sans');
    });

    // The dresser against the back wall: bread crock, scales, eggs.
    R.thing(2.4, 0.9, (ctx) => {
      box(ctx, 0.95, 0, 0, 2.9, 0.85, 1.15, MAT.oak, { top: MAT.oakLight });
      for (const dx of [1.1, 2.45]) face(ctx, [[dx, 0.86, 0.15], [dx + 1.25, 0.86, 0.15], [dx + 1.25, 0.86, 0.95], [dx, 0.86, 0.95]], null, { lw: 0.03, stroke: shade(MAT.oak, 0.35) });
      for (const dx of [1.7, 3.05]) { const k = P(dx, 0.87, 0.55); ctx.beginPath(); ctx.arc(k[0], k[1], 0.05, 0, TAU); ctx.fillStyle = MAT.brass; ctx.fill(); }
      cylinder(ctx, 1.5, 0.45, 1.15, 0.3, 0.5, CHINA, { top: tint(CHINA, 0.2) });
      if (Q.detail) { const b = P(1.5, 0.75, 1.4); smallPrint(ctx, b[0], b[1], 'BREAD', 0.09, INK.verdigris); }
      // scales
      cylinder(ctx, 2.5, 0.45, 1.15, 0.16, 0.3, MAT.brass, { top: MAT.brassDark });
      disc(ctx, 2.5, 0.45, 1.5, 0.3, MAT.brass, { lw: 0.03 });
      // a bowl of eggs
      cylinder(ctx, 3.35, 0.45, 1.15, 0.26, 0.14, INK.verdigris, { top: shade(INK.verdigris, 0.2) });
      for (const [ex, ey] of [[-0.1, 0], [0.1, -0.02], [0, 0.08]]) {
        const e = P(3.35 + ex, 0.45 + ey, 1.36);
        ctx.beginPath(); ctx.ellipse(e[0], e[1], 0.07, 0.09, 0, 0, TAU); paint(ctx, INK.bone, { lw: 0.02 });
      }
    });

    // A cobweb in the corner, and a spider who comes down for a look.
    R.decor((ctx) => {
      if (!Q.detail) return;
      const c = P(0, 0, 6);
      ctx.strokeStyle = alpha(C.white, 0.55);
      ctx.lineWidth = 0.02;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) { const a = P(0.2 + i * 0.25, 0, 6 - (4 - i) * 0.22); ctx.moveTo(c[0], c[1]); ctx.lineTo(a[0], a[1]); }
      for (let k = 1; k < 4; k++) {
        for (let i = 0; i < 4; i++) {
          const a = P((0.2 + i * 0.25) * k / 4, 0, 6 - (4 - i) * 0.22 * k / 4), b = P((0.2 + (i + 1) * 0.25) * k / 4, 0, 6 - (3 - i) * 0.22 * k / 4);
          ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
        }
      }
      ctx.stroke();
    });
    R.decor((ctx, t) => {
      if (!Q.detail) return;
      const q = (t % 23) / 23;
      const drop = q < 0.35 ? Math.sin((q / 0.35) * Math.PI) * 1.5 : 0;
      const top = P(0.6, 0.05, 5.85), at = P(0.6, 0.05, 5.85 - drop);
      ctx.beginPath(); ctx.moveTo(top[0], top[1]); ctx.lineTo(at[0], at[1]);
      ctx.strokeStyle = alpha(C.white, 0.6); ctx.lineWidth = 0.015; ctx.stroke();
      ctx.beginPath(); ctx.arc(at[0], at[1] + 0.05, 0.06, 0, TAU); ctx.fillStyle = C.ink; ctx.fill();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.018;
      ctx.beginPath();
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { ctx.moveTo(at[0], at[1] + 0.05); ctx.lineTo(at[0] + s * 0.12, at[1] - 0.02 + i * 0.06); }
      ctx.stroke();
    }, { anim: true });

    // ---------- The window, the sink under it, and a black cat ----------
    stormWindow(R, 'right', 13, 2, 2, 2.6);
    R.decor((ctx, t) => {
      // rain running down the glass
      if (!Q.detail) return;
      ctx.save();
      onWall(ctx, 'right', 13, 0.01, 2);
      ctx.beginPath(); ctx.rect(0, 0, 2, 2.6); ctx.clip();
      ctx.strokeStyle = alpha(INK.bone, 0.45);
      ctx.lineWidth = 0.025;
      ctx.beginPath();
      for (let i = 0; i < 9; i++) {
        const x = 0.12 + i * 0.22, sp = 1.3 + (i % 3) * 0.5;
        const y = 2.8 - ((t * sp + i * 0.77) % 3.2);
        ctx.moveTo(x, y); ctx.lineTo(x + 0.03, y - 0.28);
      }
      ctx.stroke();
      ctx.restore();
    }, { anim: true });
    R.thing(14, 1.25, (ctx) => {
      // the sill
      box(ctx, 12.8, 0, 1.9, 2.4, 0.35, 0.1, INK.bone);
      // a deep sink on brick piers, with a drainer
      for (const px of [12.8, 15.0]) box(ctx, px, 0.05, 0, 0.35, 1.0, 0.72, MAT.terracotta, { dotsL: shade(MAT.terracotta, 0.5) });
      box(ctx, 12.75, 0.05, 0.72, 2.6, 1.15, 0.36, CHINA, { top: CHINA, left: tint(CHINA, 0.1) });
      box(ctx, 12.95, 0.2, 0.85, 2.2, 0.85, 0.24, mix(CHINA, INK.stormNavy, 0.18), { flat: true, stroke: false });
      // plates in the sink, waiting for somebody else
      for (let i = 0; i < 3; i++) {
        const p = P(13.4 + i * 0.35, 0.55, 1.12 - i * 0.02);
        ctx.beginPath(); ctx.ellipse(p[0], p[1], 0.26, 0.3, 0.7, 0, TAU); paint(ctx, CHINA, { lw: 0.025 });
        if (Q.detail) { ctx.beginPath(); ctx.ellipse(p[0], p[1], 0.16, 0.19, 0.7, 0, TAU); ctx.strokeStyle = INK.verdigris; ctx.lineWidth = 0.02; ctx.stroke(); }
      }
      // the brass tap
      face(ctx, [[14.0, 0.02, 1.6], [14.0, 0.4, 1.6], [14.0, 0.45, 1.45]], null, { lw: 0.09, stroke: MAT.brass });
      const tp = P(14.0, 0.05, 1.68);
      ctx.beginPath(); ctx.arc(tp[0], tp[1], 0.08, 0, TAU); paint(ctx, MAT.brass, { lw: 0.025 });
      // drainer boards
      box(ctx, 15.35, 0.1, 1.05, 0.6, 1.0, 0.05, MAT.oak, { top: MAT.oakLight });
      // scrubbing brush and soap
      box(ctx, 12.95, 1.0, 1.08, 0.35, 0.15, 0.08, MAT.oak, { flat: true });
      box(ctx, 13.5, 1.0, 1.08, 0.22, 0.14, 0.07, MAT.custard, { flat: true });
    });
    // The drip. Somebody should look at that tap.
    R.thing(14.0, 0.8, (ctx, t) => {
      const q = (t % 1.4) / 1.4;
      const [X, Y0] = P(14.0, 0.45, 1.42);
      const [, Y1] = P(14.0, 0.5, 0.9);
      if (q < 0.25) {
        ctx.beginPath(); ctx.arc(X, Y0 + 0.04, 0.03 + q * 0.12, 0, TAU); ctx.fillStyle = tint(C.water, 0.4); ctx.fill();
      } else if (q < 0.55) {
        const k = (q - 0.25) / 0.3;
        ctx.beginPath(); ctx.ellipse(X, lerp(Y0, Y1, k * k), 0.04, 0.06, 0, 0, TAU); ctx.fillStyle = tint(C.water, 0.4); ctx.fill();
      } else if (q < 0.8 && Q.detail) {
        const k = (q - 0.55) / 0.25;
        ctx.beginPath(); ctx.ellipse(X, Y1, 0.05 + k * 0.2, 0.02 + k * 0.08, 0, 0, TAU);
        ctx.strokeStyle = alpha(C.white, 0.8 * (1 - k)); ctx.lineWidth = 0.025; ctx.stroke();
      }
    }, { anim: true, depth: 15.2 });
    // The cat on the sill. Black on a black night: you only see it when the
    // lightning does (and its eyes, which never close).
    const CATAT = [13.7, 0.2, 2.0];
    R.thing(CATAT[0], CATAT[1] + 0.3, (ctx, t) => {
      const [X, Y] = P(...CATAT);
      const b = lastBoom(wrap(t));
      const puff = b.big && b.age < 1.5 ? 1 + 0.18 * Math.exp(-b.age * 2) : 1;
      ctx.save();
      ctx.translate(X, Y);
      ctx.scale(puff, puff);
      // tail hanging down over the sill
      ctx.beginPath();
      ctx.moveTo(0.18, -0.05);
      ctx.quadraticCurveTo(0.34 + Math.sin(t * 1.3) * 0.06, 0.25, 0.26 + Math.sin(t * 1.3) * 0.1, 0.55);
      ctx.strokeStyle = CAT; ctx.lineWidth = 0.08; ctx.lineCap = 'round'; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0.05, -0.25, 0.24, 0.27, 0, 0, TAU); paint(ctx, CAT, { lw: 0.03, stroke: IRON_TOP });
      ctx.beginPath(); ctx.arc(0.02, -0.6, 0.17, 0, TAU); paint(ctx, CAT, { lw: 0.03, stroke: IRON_TOP });
      ctx.beginPath();
      ctx.moveTo(-0.13, -0.66); ctx.lineTo(-0.1, -0.84); ctx.lineTo(-0.02, -0.72);
      ctx.moveTo(0.06, -0.72); ctx.lineTo(0.14, -0.84); ctx.lineTo(0.17, -0.66);
      paint(ctx, CAT, { lw: 0.03, stroke: IRON_TOP });
      ctx.restore();
    }, { anim: true });

    // ---------- The shelves of jars on the left wall ----------
    R.thing(0.9, 4.5, (ctx) => {
      const y0 = 1.5, y1 = 7.5, x1 = 0.9, h = 3.25;
      box(ctx, 0, y0, 0, x1, 0.1, h, MAT.pine, { flat: true });
      const shelves = [0.12, 0.92, 1.67, 2.42];
      const r = rng(12);
      shelves.forEach((z, i) => {
        box(ctx, 0, y0, z, x1, y1 - y0, 0.08, MAT.pine, { top: tint(MAT.pine, 0.15), dotsL: null, flat: true });
        let y = y0 + 0.25;
        const top = z + 0.08;
        while (y < y1 - 0.3) {
          const k = r();
          if (i === 0) {
            // sacks and a big crock on the bottom shelf
            if (k < 0.5) {
              const p = P(0.45, y + 0.35, top);
              ctx.beginPath(); ctx.roundRect(p[0] - 0.3, p[1] - 0.62, 0.6, 0.62, 0.16);
              paint(ctx, SACKING, { lw: 0.03, dots: shade(SACKING, 0.3), density: 0.25 });
              y += 0.8;
            } else {
              cylinder(ctx, 0.45, y + 0.3, top, 0.28, 0.5, MAT.stone, { top: MAT.stoneDark });
              y += 0.72;
            }
          } else if (i === 3) {
            // bottles and books up top
            if (k < 0.45) {
              cylinder(ctx, 0.45, y + 0.12, top, 0.1, 0.42, mix(INK.candleGold, INK.oxblood, 0.45), { top: C.ink });
              const n = P(0.45, y + 0.12, top + 0.42);
              ctx.beginPath(); ctx.rect(n[0] - 0.03, n[1] - 0.14, 0.06, 0.14); paint(ctx, C.ink, { stroke: false });
              y += 0.32;
            } else {
              const cols = [INK.oxblood, INK.verdigris, INK.deepPlum, MAT.brassDark];
              for (let b = 0; b < 3; b++) box(ctx, 0.2, y + b * 0.13, top, 0.55, 0.12, 0.42 + (b % 2) * 0.08, cols[(b + i) % 4], { flat: true, lw: 0.025 });
              y += 0.5;
            }
          } else {
            const rr = 0.13 + r() * 0.07, hh = 0.3 + r() * 0.22;
            const jam = [MAT.trifle, mix(INK.candleGold, INK.oxblood, 0.2), MAT.leaf, INK.candleGold, MAT.wine];
            jar(ctx, 0.45, y + rr, top, rr, hh, jam[Math.floor(r() * jam.length)], r() < 0.5 ? CHINA : MAT.brass, { label: r() < 0.6 ? CHINA : null });
            y += rr * 2 + 0.06;
          }
        }
      });
      box(ctx, 0, y0, h, x1, y1 - y0, 0.1, MAT.pine, { top: tint(MAT.pine, 0.15) });
      box(ctx, 0, y1 - 0.1, 0, x1, 0.1, h + 0.1, MAT.pine, { flat: true });
      // the jar of spare glass eyes (his Lordship's), looking at you
      jar(ctx, 0.45, 6.9, 1.75, 0.2, 0.45, alpha(GLASS, 0.7), MAT.brass);
      if (Q.detail) {
        for (const [ex, ez] of [[-0.08, 0.1], [0.08, 0.14], [0, 0.26], [-0.07, 0.34], [0.08, 0.36]]) {
          const e = P(0.45, 6.9 + ex, 1.75 + ez);
          ctx.beginPath(); ctx.arc(e[0], e[1], 0.055, 0, TAU); ctx.fillStyle = INK.bone; ctx.fill();
          ctx.beginPath(); ctx.arc(e[0] + 0.015, e[1] + 0.01, 0.025, 0, TAU); ctx.fillStyle = C.ink; ctx.fill();
        }
        const l = P(0.45, 7.12, 2.3);
        smallPrint(ctx, l[0], l[1], 'SPARE EYES', 0.08, C.ink);
      }
      // on top: his Lordship stuffed a trout, of course
      box(ctx, 0.05, 2.2, h + 0.1, 0.8, 2.2, 0.75, alpha(GLASS, 0.35), { flat: true, lw: 0.035, top: alpha(GLASS, 0.3) });
      const f = P(0.45, 3.3, h + 0.45);
      ctx.beginPath(); ctx.ellipse(f[0], f[1], 0.75, 0.2, -0.46, 0, TAU); paint(ctx, MAT.leaf, { lw: 0.03, dots: MAT.leafDark, density: 0.35 });
      ctx.beginPath(); ctx.moveTo(f[0] - 0.62, f[1] + 0.4); ctx.lineTo(f[0] - 0.95, f[1] + 0.35); ctx.lineTo(f[0] - 0.8, f[1] + 0.62); ctx.closePath();
      paint(ctx, MAT.leaf, { lw: 0.03 });
      ctx.beginPath(); ctx.arc(f[0] + 0.5, f[1] - 0.18, 0.05, 0, TAU); ctx.fillStyle = INK.bone; ctx.fill();
    });

    // ---------- The floor: flour, footprints, the NO GEESE mat ----------
    // The doormat by the dining room door. The footprints walk right over it.
    R.rug((ctx) => {
      rect(ctx, 0.2, 11.65, 1.25, 1.7, 0.012, mix(SACKING, INK.candleGold, 0.25), { lw: 0.035, dots: shade(SACKING, 0.35), density: 0.35 });
      rect(ctx, 0.3, 11.75, 1.05, 1.5, 0.013, null, { lw: 0.03, stroke: shade(SACKING, 0.4) });
      floorTextY(ctx, 0.83, 12.5, 'NO GEESE', 0.3, INK.oxblood);
    });
    // The spilled flour, and what walked through it. It's a busy floor: the
    // dog, Mrs. Hatchett's shoes and a dragged sack have all been through, so
    // the webbed prints are one set among several, in the same pressed ink.
    const FLOURED = mix(FLOUR, FLAG, 0.3); // flour on stone, not a white sheet
    const PRESSED = mix(FLOUR, FLAG, 0.62); // a print pressed into it
    const PRESSED_D = mix(FLAG, JOINT, 0.35);
    const DUSTY = (k) => alpha(FLOUR, 0.42 * k); // a floury print on bare stone
    const INFLOUR = [9.6, 12.4]; // where the goose's prints cross the spill
    const PRINTS = [];
    for (let i = 0; i < 15; i++) {
      const x = 10.25 - i * 0.66;
      PRINTS.push([x, 12.5 + (i % 2 ? 0.14 : -0.13) + Math.sin(i * 0.9) * 0.05, Math.PI + (i % 2 ? 0.16 : -0.16)]);
    }
    // Mrs. Hatchett's shoes, across it one way and back the other.
    const SHOES = [];
    for (let i = 0; i < 8; i++) {
      const k = i / 7;
      const x = lerp(10.9, 7.9, k), y = lerp(13.3, 11.0, k);
      const side = i % 2 ? 1 : -1;
      SHOES.push([x + side * 0.08, y - side * 0.1, Math.atan2(11.0 - 13.3, 7.9 - 10.9)]);
    }
    for (let i = 0; i < 4; i++) SHOES.push([8.4 + i * 0.5 + (i % 2) * 0.1, 11.95 + i * 0.28 - (i % 2) * 0.16, 0.5]);
    // The dog, skittering about in it and off to its spot by the table.
    const PAWS = [
      [10.2, 12.9], [9.95, 12.75], [9.75, 12.2], [9.55, 12.35], [9.1, 11.95], [8.95, 12.1],
      [9.3, 11.55], [9.45, 11.3], [9.5, 10.85], [9.7, 10.6], [9.75, 10.15], [9.95, 9.95],
      [8.6, 12.85], [8.35, 12.95],
    ];
    // Lay a print flat on the floor, turned to ang (0 points along +x).
    const flat = (ctx, x, y, ang, fn) => {
      const [X, Y] = P(x, y, 0.015);
      ctx.save();
      ctx.transform(1, 0.5, -1, 0.5, X, Y);
      ctx.rotate(ang);
      fn();
      ctx.restore();
    };
    const shoe = (ctx, x, y, ang, col) => flat(ctx, x, y, ang, () => {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(0.07, 0, 0.13, 0.07, 0, 0, TAU); ctx.fill(); // the sole
      ctx.beginPath(); ctx.ellipse(-0.14, 0, 0.06, 0.06, 0, 0, TAU); ctx.fill(); // the heel
    });
    const paw = (ctx, x, y, ang, col) => flat(ctx, x, y, ang, () => {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(0, 0, 0.055, 0.065, 0, 0, TAU); ctx.fill();
      for (const a of [-0.9, -0.3, 0.3, 0.9]) { ctx.beginPath(); ctx.arc(Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0.025, 0, TAU); ctx.fill(); }
    });
    const inSpill = (x, y) => Math.hypot((x - 9.55) / 1.15, (y - 12.35) / 0.8) < 1;
    R.rug((ctx) => {
      // a sack burst open by a beak, the flour spread about, and a smear where
      // somebody dragged the sack back toward the range
      blob(ctx, 9.55, 12.35, 1.1, 0.7, 7);
      paint(ctx, alpha(FLOURED, 0.9), { stroke: false, dots: PRESSED, density: 0.2 });
      blob(ctx, 10.35, 12.05, 0.45, 0.35, 9);
      paint(ctx, alpha(FLOURED, 0.9), { stroke: false });
      flat(ctx, 10.1, 11.75, -Math.PI / 2 - 0.2, () => {
        ctx.fillStyle = alpha(FLOURED, 0.45);
        ctx.beginPath(); ctx.roundRect(0, -0.24, 1.1, 0.48, 0.22); ctx.fill();
        ctx.strokeStyle = alpha(PRESSED, 0.8);
        ctx.lineWidth = 0.03;
        ctx.beginPath();
        for (const v of [-0.14, -0.04, 0.07, 0.16]) { ctx.moveTo(0.1, v); ctx.lineTo(1.0, v + 0.02); }
        ctx.stroke();
      });
      // Two more floury patches, with no goose in them: where she dusts off
      // her apron by the range, and a spill the dog and the mouse have been
      // through at the end of the table.
      blob(ctx, 6.3, 3.0, 0.75, 0.45, 21);
      paint(ctx, alpha(FLOURED, 0.8), { stroke: false, dots: PRESSED, density: 0.2 });
      blob(ctx, 3.3, 10.1, 0.85, 0.6, 23);
      paint(ctx, alpha(FLOURED, 0.85), { stroke: false, dots: PRESSED, density: 0.2 });
      for (const [x, y, a] of [[5.9, 2.9, 0.3], [6.25, 3.2, 0.3], [6.6, 2.85, -2.8], [6.45, 3.25, 1.9]]) shoe(ctx, x, y, a, PRESSED_D);
      for (const [x, y, a] of [[3.0, 10.4, 0.2], [3.45, 10.25, 0.2], [3.9, 10.5, 0.2]]) shoe(ctx, x, y, a, x < 3.9 ? PRESSED_D : DUSTY(0.9));
      if (Q.detail) {
        for (const [x, y] of [[2.9, 9.8], [3.2, 9.95], [3.6, 9.75], [3.75, 10.0], [4.2, 9.7], [4.6, 9.85]]) paw(ctx, x, y, -0.3, x < 4 ? PRESSED_D : DUSTY(0.8));
        ctx.fillStyle = PRESSED_D; // the mouse, in and out
        for (let i = 0; i < 9; i++) {
          const [X, Y] = P(2.6 + i * 0.16, 10.0 - i * 0.07 + (i % 2) * 0.05, 0.015);
          ctx.beginPath(); ctx.arc(X, Y, 0.022, 0, TAU); ctx.fill();
        }
      }
      if (Q.detail) {
        const r = rng(5);
        ctx.fillStyle = alpha(FLOURED, 0.8);
        for (let i = 0; i < 22; i++) {
          const [X, Y] = P(8.1 + r() * 3.2, 11.3 + r() * 2.2, 0.01);
          ctx.beginPath(); ctx.ellipse(X, Y, 0.03 + r() * 0.06, 0.015 + r() * 0.03, 0, 0, TAU); ctx.fill();
        }
      }
      // everything that walked through it: pressed in where it's in the flour,
      // floury on the stones after, fading as the flour wears off
      const trail = (x, y, x0, y0) => clamp(1 - Math.hypot(x - x0, y - y0) / 4, 0.25, 1);
      SHOES.forEach(([x, y, a], i) => {
        if (inSpill(x, y)) shoe(ctx, x, y, a, PRESSED_D);
        else if (Q.detail) shoe(ctx, x, y, a, DUSTY(trail(x, y, 9.55, 12.35) * (i < 8 ? 1 : 0.8)));
      });
      if (Q.detail) {
        PAWS.forEach(([x, y], i) => {
          const a = -2.4 + Math.sin(i * 2.1) * 0.5;
          if (inSpill(x, y)) paw(ctx, x, y, a, PRESSED_D);
          else paw(ctx, x, y, a, DUSTY(trail(x, y, 9.55, 12.35)));
        });
      }
      // webbed footprints, smaller than a shoe: pressed into the flour, then
      // faintly floury all the way to the dining room door
      for (const [x, y, a] of PRINTS) {
        if (inSpill(x, y)) webPrint(ctx, x, y, a, PRESSED, PRESSED_D, 0.3);
        else {
          const fade = clamp(1 - (8.4 - x) / 9, 0.35, 1);
          webPrint(ctx, x, y, a, DUSTY(0.32 * fade), DUSTY(0.62 * fade), 0.3);
        }
      }
    });
    // The burst flour sack. The hole is beak-shaped.
    R.thing(11.2, 12.4, (ctx) => {
      const [X, Y] = P(10.8, 12.05, 0);
      ctx.beginPath();
      ctx.moveTo(X - 0.55, Y - 0.1);
      ctx.quadraticCurveTo(X - 0.6, Y - 0.55, X - 0.1, Y - 0.62);
      ctx.quadraticCurveTo(X + 0.5, Y - 0.68, X + 0.72, Y - 0.35);
      ctx.quadraticCurveTo(X + 0.8, Y, X + 0.3, Y + 0.12);
      ctx.quadraticCurveTo(X - 0.3, Y + 0.18, X - 0.55, Y - 0.1);
      ctx.closePath();
      paint(ctx, SACKING, { lw: 0.035, dots: shade(SACKING, 0.3), density: 0.25 });
      // the torn end, pouring
      ctx.beginPath();
      ctx.moveTo(X - 0.55, Y - 0.1); ctx.lineTo(X - 0.62, Y - 0.3); ctx.lineTo(X - 0.5, Y - 0.38); ctx.lineTo(X - 0.6, Y - 0.5); ctx.lineTo(X - 0.4, Y - 0.55);
      ctx.lineTo(X - 0.3, Y - 0.1);
      ctx.closePath();
      paint(ctx, FLOUR, { lw: 0.025 });
      if (Q.detail) {
        smallPrint(ctx, X + 0.12, Y - 0.32, 'FLOUR', 0.14, INK.oxblood, 'center', 900);
        ctx.fillStyle = C.ink; // peck marks
        for (const [dx, dy] of [[0.4, -0.5], [0.5, -0.44], [0.46, -0.56]]) { ctx.beginPath(); ctx.moveTo(X + dx, Y + dy); ctx.lineTo(X + dx + 0.05, Y + dy + 0.03); ctx.lineTo(X + dx - 0.01, Y + dy + 0.05); ctx.closePath(); ctx.fill(); }
      }
    });

    // ---------- The cellar hatch ----------
    const { x: hx0, y: hy0, w: hw, d: hd } = HATCH;
    R.rug((ctx) => {
      // the lid, flung open flat on the floor behind it
      rect(ctx, hx0, hy0 - hd - 0.02, hw, hd, 0.012, OLDWOOD, { lw: 0.04, dots: shade(OLDWOOD, 0.3), density: 0.15 });
      if (Q.detail) {
        ctx.beginPath();
        for (let x = hx0 + 0.4; x < hx0 + hw; x += 0.4) { const a = P(x, hy0 - hd, 0.015), b = P(x, hy0 - 0.02, 0.015); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
        ctx.strokeStyle = shade(OLDWOOD, 0.4); ctx.lineWidth = 0.025; ctx.stroke();
      }
      for (const y of [hy0 - hd + 0.6, hy0 - hd / 2, hy0 - 0.6]) rect(ctx, hx0 + 0.1, y - 0.1, hw - 0.2, 0.2, 0.016, IRON, { stroke: false });
      const ring = P(hx0 + hw / 2, hy0 - hd + 0.35, 0.02);
      ctx.beginPath(); ctx.ellipse(ring[0], ring[1], 0.22, 0.11, 0, 0, TAU); ctx.strokeStyle = IRON; ctx.lineWidth = 0.06; ctx.stroke();
      // the frame round the opening
      rect(ctx, hx0 - 0.15, hy0 - 0.15, hw + 0.3, hd + 0.3, 0.01, tint(OLDWOOD, 0.12), { lw: 0.04 });
      rect(ctx, hx0, hy0, hw, hd, 0.012, PIT, { lw: 0.03 });
      // down into the dark: the side wall, and the steps
      ctx.save();
      poly(ctx, [[hx0, hy0, 0.012], [hx0 + hw, hy0, 0.012], [hx0 + hw, hy0 + hd, 0.012], [hx0, hy0 + hd, 0.012]]);
      ctx.clip();
      for (let i = 0; i < 4; i++) {
        const za = -i * 0.5, zb = -(i + 1) * 0.5;
        face(ctx, [[hx0, hy0, za], [hx0, hy0 + hd, za], [hx0, hy0 + hd, zb], [hx0, hy0, zb]], mix(MAT.stoneDark, PIT, 0.25 + i * 0.22), { stroke: false });
        face(ctx, [[hx0, hy0, za], [hx0 + hw, hy0, za], [hx0 + hw, hy0, zb], [hx0, hy0, zb]], mix(MAT.stone, PIT, 0.35 + i * 0.2), { stroke: false });
      }
      const n = 12, run = hd / n;
      for (let k = n - 1; k >= 0; k--) {
        const ya = hy0 + hd - (k + 1) * run, yb = hy0 + hd - k * run, z = -k * 0.1;
        const c = mix(MAT.stone, PIT, Math.min(1, 0.08 + k * 0.085));
        face(ctx, [[hx0 + 0.18, ya, z], [hx0 + hw, ya, z], [hx0 + hw, yb, z], [hx0 + 0.18, yb, z]], c, { stroke: false });
        face(ctx, [[hx0 + 0.18, yb - 0.03, z], [hx0 + hw, yb - 0.03, z]], null, { lw: 0.035, stroke: alpha(INK.bone, 0.45 * (1 - k / n)) });
      }
      ctx.restore();
    });
    // Light from Jenkins's candle, down below.
    const below = house.flicker(77);
    R.light({ at: [hx0 + 1, hy0 + 1.4, -0.2], r: 1.9, color: INK.candleGold, k: (t) => 0.45 + 0.2 * below(t) });
    // The handrail post and a lantern for the stairs, and the sign.
    R.thing(hx0 + hw - 0.1, hy0 + hd, (ctx) => {
      const px = hx0 + hw - 0.12, py = hy0 + hd - 0.25;
      box(ctx, px - 0.07, py - 0.07, 0, 0.14, 0.14, 1.15, MAT.oak, { flat: true });
      cylinder(ctx, px, py, 1.15, 0.1, 0.08, MAT.oakLight, { flat: true });
      // the rail, going down into the dark
      const a = P(px, py, 1.0), b = P(px, py - 1.05, 0);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.lineCap = 'round'; ctx.stroke();
      ctx.strokeStyle = MAT.oak; ctx.lineWidth = 0.055; ctx.stroke();
      // the lantern, hung on the post
      const l = P(px + 0.18, py + 0.18, 0.95);
      ctx.beginPath(); ctx.moveTo(l[0] - 0.1, l[1] - 0.05); ctx.lineTo(l[0], l[1] - 0.3);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.stroke();
      ctx.beginPath(); ctx.rect(l[0] - 0.13, l[1] - 0.05, 0.26, 0.36); paint(ctx, alpha(INK.candleGold, 0.35), { lw: 0.035 });
      ctx.beginPath(); ctx.moveTo(l[0] - 0.17, l[1] - 0.05); ctx.lineTo(l[0], l[1] - 0.2); ctx.lineTo(l[0] + 0.17, l[1] - 0.05); ctx.closePath(); paint(ctx, IRON, { lw: 0.025 });
    });
    {
      const px = hx0 + hw - 0.12 + 0.18, py = hy0 + hd - 0.25 + 0.18;
      R.light({ at: [px, py, 0.72], r: 1.3, color: INK.candleGold, k: house.flicker(78), draw: (ctx, t, k) => {
        const [X, Y] = P(px, py, 0.95);
        ctx.beginPath(); ctx.ellipse(X, Y + 0.14, 0.04, 0.08 * (0.8 + k * 0.3), 0, 0, TAU); ctx.fillStyle = INK.candleGold; ctx.fill();
      } });
    }
    R.thing(hx0 + hw + 0.4, hy0 - 0.2, (ctx) => {
      const sx = hx0 + hw + 0.35, sy = hy0 - 0.35;
      box(ctx, sx - 0.06, sy - 0.06, 0, 0.12, 0.12, 1.55, MAT.oak, { flat: true });
      const [X, Y] = P(sx, sy, 1.55);
      ctx.beginPath(); ctx.roundRect(X - 0.95, Y - 0.62, 1.9, 0.72, 0.06);
      paint(ctx, MAT.pine, { lw: 0.04, dots: shade(MAT.pine, 0.25), density: 0.2 });
      label(ctx, sx, sy, 1.55 + 0.37 / ZK, 'TO CELLAR', 0.3, C.ink);
      smallPrint(ctx, X, Y - 0.12, '(NOT YOU, JENKINS)', 0.15, INK.oxblood);
    });
    // "hic!", up from below, while Jenkins works through the good stuff.
    const HICS = [];
    for (let s = ev.cellar[0] + 13; s < ev.cellar[1] - 3; s += 6.4 + (HICS.length % 3) * 1.1) HICS.push(wrap(s));
    R.air((ctx, t) => {
      if (!Q.detail) return;
      const tt = wrap(t);
      for (const h0 of HICS) {
        const u = since(tt, h0);
        if (u > 1.8) continue;
        const k = u / 1.8;
        const [X, Y] = P(hx0 + 1.1 + Math.sin(u * 3) * 0.15, hy0 + 1.6, 0.4 + k * 1.6);
        ctx.save();
        ctx.globalAlpha *= 1 - k * k;
        smallPrint(ctx, X, Y, 'hic!', 0.3 + k * 0.1, INK.bone, 'center', 900);
        ctx.restore();
      }
    });

    // The crate of empties, on its way back down.
    R.thing(15.45, 7.1, (ctx) => {
      box(ctx, 14.6, 6.3, 0, 0.85, 0.75, 0.45, MAT.oak, { top: shade(MAT.oak, 0.3) });
      for (let i = 0; i < 6; i++) {
        const bx = 14.75 + (i % 3) * 0.26, by = 6.45 + Math.floor(i / 3) * 0.3;
        cylinder(ctx, bx, by, 0.3, 0.08, 0.45 + (i % 2) * 0.05, MAT.wine, { top: C.ink });
      }
      if (Q.detail) { const p = P(15.02, 7.06, 0.24); smallPrint(ctx, p[0], p[1], 'EMPTIES', 0.12, INK.bone); }
    });
    // A milk churn and a sack of potatoes by the sink.
    R.thing(15.3, 3.8, (ctx) => {
      cylinder(ctx, 15.3, 3.2, 0, 0.35, 0.85, MAT.silver, { top: tint(MAT.silver, 0.1) });
      cylinder(ctx, 15.3, 3.2, 0.85, 0.2, 0.25, MAT.silver, { top: shade(MAT.silver, 0.1) });
      const p = P(15.1, 5.2, 0);
      ctx.beginPath(); ctx.roundRect(p[0] - 0.4, p[1] - 0.7, 0.8, 0.72, 0.2);
      paint(ctx, SACKING, { lw: 0.03, dots: shade(SACKING, 0.35), density: 0.25 });
      ctx.fillStyle = MAT.terracotta;
      for (const [dx, dy] of [[-0.15, -0.72], [0.08, -0.76], [0.22, -0.7]]) { ctx.beginPath(); ctx.ellipse(p[0] + dx, p[1] + dy, 0.11, 0.08, 0, 0, TAU); ctx.fill(); }
    });

    // ---------- The table ----------
    const { x: tx, y: ty, w: tw, d: td, h: th } = TABLE;
    R.thing(tx + tw / 2, ty + td / 2, (ctx) => {
      const legs = [[tx + 0.15, ty + 0.15], [tx + tw - 0.3, ty + 0.15], [tx + 0.15, ty + td - 0.3], [tx + tw - 0.3, ty + td - 0.3]];
      for (const [lx, ly] of legs) box(ctx, lx, ly, 0, 0.16, 0.16, th - 0.1, shade(MAT.pine, 0.25), { flat: true });
      box(ctx, tx + 0.1, ty + 0.1, th - 0.38, tw - 0.2, td - 0.2, 0.28, shade(MAT.pine, 0.12), { flat: true }); // the apron
      // a drawer, with a brass knob
      face(ctx, [[8.2, ty + td - 0.09, th - 0.35], [9.8, ty + td - 0.09, th - 0.35], [9.8, ty + td - 0.09, th - 0.13], [8.2, ty + td - 0.09, th - 0.13]], null, { lw: 0.025, stroke: shade(MAT.pine, 0.45) });
      const kn = P(9.0, ty + td - 0.09, th - 0.24);
      ctx.beginPath(); ctx.arc(kn[0], kn[1], 0.05, 0, TAU); ctx.fillStyle = MAT.brass; ctx.fill();
      box(ctx, tx, ty, th - 0.12, tw, td, 0.12, MAT.pine, { top: tint(MAT.pine, 0.2), dotsT: shade(MAT.pine, 0.12), densT: 0.12 });
      if (Q.detail) {
        // scrubbed boards, dusted with flour
        ctx.beginPath();
        for (let y = ty + 0.5; y < ty + td; y += 0.5) { const a = P(tx, y, th), b = P(tx + tw, y, th); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
        ctx.strokeStyle = shade(MAT.pine, 0.18); ctx.lineWidth = 0.02; ctx.stroke();
        const r = rng(3);
        ctx.fillStyle = alpha(FLOUR, 0.85);
        for (let i = 0; i < 26; i++) {
          const [X, Y] = P(tx + 0.3 + r() * (tw - 0.6), ty + 0.3 + r() * (td - 0.6), th + 0.005);
          ctx.beginPath(); ctx.ellipse(X, Y, 0.04 + r() * 0.1, 0.02 + r() * 0.04, 0, 0, TAU); ctx.fill();
        }
      }
      // the sponge, cut into fingers
      box(ctx, 5.5, 6.3, th, 1.1, 0.7, 0.26, SPONGE, { top: tint(SPONGE, 0.25), lw: 0.03 });
      if (Q.detail) for (let i = 1; i < 4; i++) face(ctx, [[5.5 + i * 0.28, 6.3, th + 0.26], [5.5 + i * 0.28, 7.0, th + 0.26]], null, { lw: 0.025, stroke: shade(SPONGE, 0.4) });
      // a bowl of cherries
      cylinder(ctx, 6.1, 7.9, th, 0.3, 0.16, CHINA, { top: tint(CHINA, 0.2) });
      ctx.fillStyle = INK.oxblood;
      for (const [cx, cy] of [[-0.1, 0], [0.1, 0.05], [0, -0.1], [0.05, 0.12]]) { const c = P(6.1 + cx, 7.9 + cy, th + 0.2); ctx.beginPath(); ctx.arc(c[0], c[1], 0.07, 0, TAU); ctx.fill(); }
      // a bowl of whipped cream with the whisk in it, the custard jug and the cooking sherry
      cylinder(ctx, 5.65, 8.25, th, 0.3, 0.2, INK.verdigris, { top: MAT.cream });
      const wk = P(5.7, 8.2, th + 0.2), wk2 = P(5.95, 8.0, th + 0.75);
      ctx.beginPath(); ctx.moveTo(wk[0], wk[1]); ctx.lineTo(wk2[0], wk2[1]);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(wk[0] + 0.03, wk[1] - 0.08, 0.07, 0.13, 0.3, 0, TAU);
      ctx.strokeStyle = MAT.silver; ctx.lineWidth = 0.03; ctx.stroke();
      cylinder(ctx, 9.55, 8.25, th, 0.18, 0.36, CHINA, { top: MAT.custard });
      const jp = P(9.55, 8.25, th + 0.36);
      ctx.beginPath(); ctx.moveTo(jp[0] - 0.22, jp[1] - 0.02); ctx.lineTo(jp[0] - 0.34, jp[1] - 0.08); ctx.lineTo(jp[0] - 0.2, jp[1] + 0.05); ctx.closePath(); paint(ctx, CHINA, { lw: 0.025 });
      cylinder(ctx, 10.3, 6.35, th, 0.13, 0.5, mix(INK.candleGold, INK.oxblood, 0.4), { top: C.ink });
      if (Q.detail) { const sl = P(10.3, 6.48, th + 0.22); ctx.fillStyle = CHINA; ctx.fillRect(sl[0] - 0.12, sl[1] - 0.08, 0.24, 0.13); }
      // eggshells
      ctx.fillStyle = INK.bone;
      for (const [ex, ey] of [[7.5, 8.6], [7.7, 8.7]]) { const e = P(ex, ey, th + 0.02); ctx.beginPath(); ctx.arc(e[0], e[1], 0.08, Math.PI, TAU); ctx.fill(); }
      // the recipe book, open at the only page
      const bk = [[10.0, 8.2, th + 0.02], [10.8, 8.2, th + 0.02], [10.8, 8.75, th + 0.02], [10.0, 8.75, th + 0.02]];
      face(ctx, bk, CHINA, { lw: 0.03 });
      if (Q.detail) face(ctx, [[10.4, 8.2, th + 0.025], [10.4, 8.75, th + 0.025]], null, { lw: 0.02 });
    }, { depth: ON_TABLE });
    // A candle stub on the table, for when the lights go.
    R.thing(5.7, 6.6, (ctx) => {
      cylinder(ctx, 5.7, 6.6, th, 0.16, 0.05, MAT.brass, { top: MAT.brassDark });
    }, { depth: ON_TABLE + 0.05 });
    candle(R, 5.7, 6.6, th + 0.05, 83);
    // A coal scuttle by the range (the fire eats as much as the dog).
    R.thing(12.6, 2.6, (ctx) => {
      const [X, Y] = P(12.5, 2.2, 0);
      ctx.beginPath();
      ctx.moveTo(X - 0.38, Y - 0.05); ctx.lineTo(X - 0.3, Y - 0.62); ctx.lineTo(X + 0.42, Y - 0.78); ctx.lineTo(X + 0.36, Y - 0.05);
      ctx.quadraticCurveTo(X, Y + 0.12, X - 0.38, Y - 0.05);
      paint(ctx, IRON, { lw: 0.035 });
      ctx.fillStyle = mix(IRON, C.black, 0.5);
      for (const [dx, dy] of [[-0.18, -0.62], [0, -0.66], [0.18, -0.7], [-0.06, -0.72], [0.1, -0.78]]) { ctx.beginPath(); ctx.arc(X + dx, Y + dy, 0.08, 0, TAU); ctx.fill(); }
      ctx.beginPath(); ctx.arc(X - 0.02, Y - 0.72, 0.28, Math.PI * 1.1, Math.PI * 1.9);
      ctx.strokeStyle = MAT.brass; ctx.lineWidth = 0.04; ctx.stroke();
    });
    // At the end of the table, a stool.
    R.thing(12.2, 7.9, (ctx) => {
      cylinder(ctx, 11.75, 7.4, 0, 0.3, 0.1, shade(MAT.oak, 0.2), { flat: true });
      for (const a of [0, 2.1, 4.2]) face(ctx, [[11.75 + Math.cos(a) * 0.22, 7.4 + Math.sin(a) * 0.22, 0], [11.75 + Math.cos(a) * 0.12, 7.4 + Math.sin(a) * 0.12, 0.72]], null, { lw: 0.07, stroke: shade(MAT.oak, 0.3) });
      cylinder(ctx, 11.75, 7.4, 0.72, 0.34, 0.1, MAT.oak, { top: MAT.oakLight });
    });

    // Trifle II.
    R.thing(TRIFLE[0], TRIFLE[1], (ctx, t) => drawTrifle(ctx, TRIFLE[0], TRIFLE[1], th, trifleAt(t), t), { anim: true, depth: ON_TABLE + 0.2 });
    // While the dog's head is in it, the near rim goes over its nose.
    R.thing(TRIFLE[0], TRIFLE[1], (ctx, t) => {
      const d = dog.at(t);
      if (d.pose === 'feast') drawTrifle(ctx, TRIFLE[0], TRIFLE[1], th, trifleAt(t), t, true);
    }, { anim: true, depth: EAT[0] + EAT[1] + 0.3 });
    // The jelly, turned out and wobbling (the rest of it is in the trifle).
    R.thing(9.6, 7.1, (ctx, t) => {
      const [X, Y] = P(9.6, 7.1, th);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.42, 0.21, 0, 0, TAU); paint(ctx, CHINA, { lw: 0.03 });
      const w = Math.sin(t * 9) * 0.04 * (0.5 + 0.5 * Math.sin(t * 0.7));
      ctx.save();
      ctx.translate(X, Y - 0.05);
      ctx.transform(1, 0, w, 1, 0, 0);
      ctx.beginPath();
      ctx.moveTo(-0.26, 0); ctx.lineTo(-0.2, -0.36); ctx.quadraticCurveTo(0, -0.46, 0.2, -0.36); ctx.lineTo(0.26, 0);
      ctx.quadraticCurveTo(0, 0.1, -0.26, 0);
      paint(ctx, MAT.trifle, { lw: 0.03, dots: shade(MAT.trifle, 0.3), density: 0.2 });
      if (Q.detail) { ctx.beginPath(); ctx.ellipse(-0.08, -0.25, 0.04, 0.09, 0.2, 0, TAU); ctx.fillStyle = alpha(C.white, 0.6); ctx.fill(); }
      ctx.restore();
    }, { anim: true, depth: ON_TABLE + 0.15 });

    // The kitchen timer (her alibi): it goes off at midnight.
    const ringOf = (tt) => { const u = since(tt, MIDNIGHT); return u < 4 ? 1 : u < 4.4 ? 1 - (u - 4) / 0.4 : 0; };
    const handOf = (tt) => {
      const u = since(tt, MIDNIGHT), rewind = since(ev.settle, MIDNIGHT);
      if (u < rewind) return 0;
      return ((LOOP - u) / 60) * TAU;
    };
    R.thing(TIMER[0], TIMER[1], (ctx, t) => {
      const tt = wrap(t);
      drawTimer(ctx, TIMER[0], TIMER[1], th, t, handOf(tt), ringOf(tt));
    }, { anim: true, depth: TIMER[0] + TIMER[1] });
    R.air((ctx, t) => {
      const k = ringOf(wrap(t));
      if (!(k > 0)) return;
      const [X, Y] = P(TIMER[0], TIMER[1], th);
      ctx.save();
      ctx.globalAlpha *= k;
      ctx.strokeStyle = INK.candleGold;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const r = 0.3 + i * 0.13 + ((t * 3) % 0.13);
        ctx.lineWidth = 0.05 - i * 0.01;
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(X, Y - 0.27, r, s > 0 ? -0.6 : Math.PI - 0.6, s > 0 ? 0.6 : Math.PI + 0.6); ctx.stroke(); }
      }
      if (Q.detail) label(ctx, TIMER[0], TIMER[1], th + 1.05, 'BRRRING!', 0.3, INK.candleGold);
      ctx.restore();
    });
    // Round things round the timer, none of them a timer: the biscuit tin and
    // the raisin canister in the same green enamel, the cocoa tin, the sugar
    // bowl, a jar of jam and an egg in a cup.
    R.thing(9.95, 6.6, (ctx) => { // the biscuit tin, with a ring pressed in its lid
      cylinder(ctx, 9.95, 6.6, th, 0.21, 0.13, ENAMEL, { top: tint(ENAMEL, 0.12) });
      disc(ctx, 9.95, 6.6, th + 0.131, 0.14, null, { lw: 0.02, stroke: shade(ENAMEL, 0.35) });
      if (Q.detail) disc(ctx, 9.95, 6.6, th + 0.132, 0.05, MAT.brass, { lw: 0.015 });
    });
    R.thing(10.8, 7.1, (ctx) => { // the raisins
      cylinder(ctx, 10.8, 7.1, th, 0.12, 0.36, ENAMEL, { top: tint(ENAMEL, 0.12) });
      cylinder(ctx, 10.8, 7.1, th + 0.36, 0.125, 0.05, MAT.brass, { top: MAT.brassDark });
      if (Q.detail) { const p = P(10.8, 7.1, th + 0.2); smallPrint(ctx, p[0], p[1], 'RAISINS', 0.055, INK.bone); }
    });
    R.thing(10.75, 6.7, (ctx) => { // cocoa
      cylinder(ctx, 10.75, 6.7, th, 0.14, 0.24, INK.oxblood, { top: MAT.brass });
      if (Q.detail) { const p = P(10.75, 6.7, th + 0.13); smallPrint(ctx, p[0], p[1], 'COCOA', 0.06, INK.bone); }
    });
    R.thing(10.05, 7.7, (ctx) => { // the sugar bowl, lid on
      cylinder(ctx, 10.05, 7.7, th, 0.14, 0.14, CHINA, { top: CHINA });
      const [X, Y] = P(10.05, 7.7, th + 0.14);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.2, 0.13, 0, Math.PI, TAU); paint(ctx, CHINA, { lw: 0.025 });
      ctx.beginPath(); ctx.arc(X, Y - 0.14, 0.035, 0, TAU); paint(ctx, INK.verdigris, { lw: 0.015 });
      if (Q.detail) { ctx.beginPath(); ctx.ellipse(X, Y + 0.08, 0.2, 0.05, 0, 0, Math.PI); ctx.strokeStyle = INK.verdigris; ctx.lineWidth = 0.02; ctx.stroke(); }
    });
    R.thing(10.8, 7.65, (ctx) => jar(ctx, 10.8, 7.65, th, 0.1, 0.22, MAT.trifle, MAT.brass, { label: CHINA }));
    R.thing(10.35, 8.0, (ctx) => { // an egg in a cup, for later
      cylinder(ctx, 10.35, 8.0, th, 0.07, 0.07, CHINA, { top: CHINA });
      const [X, Y] = P(10.35, 8.0, th + 0.07);
      ctx.beginPath(); ctx.ellipse(X, Y - 0.07, 0.075, 0.1, 0, 0, TAU); paint(ctx, INK.bone, { lw: 0.02 });
    });

    // The light over the table, on a flex from the ceiling.
    R.thing(8, 7.5, (ctx) => {
      const top = P(8, 7.5, 6), bot = P(8, 7.5, 4.75);
      ctx.beginPath(); ctx.moveTo(top[0], top[1]); ctx.lineTo(bot[0], bot[1]);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bot[0] - 0.12, bot[1]); ctx.lineTo(bot[0] + 0.12, bot[1]);
      ctx.lineTo(bot[0] + 0.55, bot[1] + 0.42); ctx.quadraticCurveTo(bot[0], bot[1] + 0.55, bot[0] - 0.55, bot[1] + 0.42);
      ctx.closePath();
      paint(ctx, INK.verdigris, { lw: 0.035, dots: shade(INK.verdigris, 0.4), density: 0.2 });
    }, { depth: ON_TABLE - 0.1 });
    R.light({
      at: [8, 7.5, 4.3], r: 4.6, color: INK.candleGold, k: house.lamp,
      draw: (ctx, t, k) => {
        const [X, Y] = P(8, 7.5, 4.75);
        ctx.beginPath(); ctx.ellipse(X, Y + 0.47, 0.22, 0.08, 0, 0, TAU);
        ctx.fillStyle = k > 0.5 ? INK.candleGold : shade(INK.candleGold, 0.55);
        ctx.fill();
      },
    });

    // ---------- The coat stand, and the sausages hung on it "out of reach" ----------
    R.thing(STAND[0], STAND[1], (ctx, t) => {
      const tt = wrap(t);
      const [sx, sy] = STAND;
      // feet and pole
      for (const a of [0.4, 2.5, 4.6]) face(ctx, [[sx, sy, 0.15], [sx + Math.cos(a) * 0.42, sy + Math.sin(a) * 0.42, 0]], null, { lw: 0.09, stroke: MAT.mahoganyDark });
      box(ctx, sx - 0.05, sy - 0.05, 0, 0.1, 0.1, 2.85, MAT.mahogany, { flat: true });
      cylinder(ctx, sx, sy, 2.85, 0.08, 0.12, MAT.mahoganyDark, { flat: true });
      // her shawl, and the dog's lead (it has never been used)
      const sh = P(sx - 0.25, sy, 2.5);
      ctx.beginPath();
      ctx.moveTo(sh[0] - 0.05, sh[1]); ctx.lineTo(sh[0] + 0.25, sh[1] - 0.08);
      ctx.lineTo(sh[0] + 0.12, sh[1] + 1.05); ctx.lineTo(sh[0] - 0.12, sh[1] + 0.95); ctx.lineTo(sh[0] - 0.3, sh[1] + 1.12);
      ctx.closePath();
      paint(ctx, MAT.velvetDark, { lw: 0.035, dots: MAT.velvet, density: 0.3 });
      const ld = P(sx, sy + 0.12, 2.55);
      ctx.beginPath(); ctx.moveTo(ld[0], ld[1]); ctx.quadraticCurveTo(ld[0] - 0.08, ld[1] + 0.6, ld[0] + 0.06, ld[1] + 0.85);
      ctx.strokeStyle = INK.oxblood; ctx.lineWidth = 0.05; ctx.stroke();
      // the bonnet on top
      const bn = P(sx, sy, 2.97);
      ctx.beginPath(); ctx.ellipse(bn[0], bn[1], 0.3, 0.1, 0, 0, TAU); paint(ctx, mix(INK.candleGold, INK.bone, 0.4), { lw: 0.03 });
      ctx.beginPath(); ctx.arc(bn[0], bn[1] - 0.02, 0.17, Math.PI, TAU); paint(ctx, mix(INK.candleGold, INK.bone, 0.4), { lw: 0.03 });
      // the hook arm
      const [HX, HY] = P(...HOOK);
      const p0 = P(sx, sy, 2.7);
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.quadraticCurveTo(HX, p0[1] - 0.1, HX, HY);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
      // the tag
      if (Q.detail) {
        const tg = P(sx, sy, 1.45);
        ctx.beginPath(); ctx.moveTo(tg[0], tg[1] - 0.25); ctx.lineTo(tg[0] - 0.42, tg[1] - 0.08);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02; ctx.stroke();
        ctx.beginPath(); ctx.roundRect(tg[0] - 0.85, tg[1] - 0.12, 0.82, 0.42, 0.05); paint(ctx, CHINA, { lw: 0.03 });
        smallPrint(ctx, tg[0] - 0.44, tg[1] - 0.01, 'OUT OF', 0.14, C.ink);
        smallPrint(ctx, tg[0] - 0.44, tg[1] + 0.16, 'REACH', 0.14, INK.oxblood);
      }
      // the string
      const n = dog.left(tt);
      const j = dog.jolt(tt);
      const swing = (j < 5 ? 0.32 * Math.sin(j * 6.5) * Math.exp(-j * 1.1) : 0) + Math.sin(t * 1.7) * 0.02;
      const d = dog.at(t);
      if (d.holding && n > 0) {
        const [mx, my] = mouthScreen(d);
        sausageString(ctx, HX, HY, mx, my, n, 0);
      } else {
        const len = (KNOT + n * LINK) * ZK;
        sausageString(ctx, HX, HY, HX + swing, HY + len * (1 - Math.abs(swing) * 0.1), n, swing * 0.35);
      }
    }, { anim: true });

    // ---------- The dog ----------
    const drawTheDog = (ctx, t, d) => {
      const [X, Y] = P(d.x, d.y, d.z || 0);
      drawDog(ctx, X, Y, d.dir === 'l' ? -1 : 1, d, t);
    };
    R.mover((t) => dog.at(t), (ctx, t, d) => drawTheDog(ctx, t, d), { bias: 0.1 });
    // Its sausage, put down safe on the table while it deals with the trifle.
    R.thing(REST[0], REST[1], (ctx, t) => {
      const d = dog.at(t);
      if (!d.resting) return;
      const a = P(REST[0] - 0.15, REST[1] + 0.05, th + 0.07), b = P(REST[0] + 0.15, REST[1] - 0.05, th + 0.07);
      banger(ctx, a[0], a[1], b[0], b[1], 0.07);
    }, { anim: true, depth: REST[0] + REST[1] });
    // Where it was at midnight, when the lightning shows the past.
    const MIDDOG = dog.at(MIDNIGHT);
    R.thing(MIDDOG.x, MIDDOG.y, (ctx, t) => {
      const k = pastK(t);
      if (!(k > 0.02)) return;
      const lines = Q.lines, detail = Q.detail;
      Q.lines = false;
      Q.detail = false;
      ctx.save();
      ctx.globalAlpha *= 0.62 * k;
      const [X, Y] = P(MIDDOG.x, MIDDOG.y, MIDDOG.z || 0);
      drawDog(ctx, X, Y, MIDDOG.dir === 'l' ? -1 : 1, MIDDOG, MIDNIGHT, INK.stormNavy);
      ctx.restore();
      Q.lines = lines;
      Q.detail = detail;
    }, { anim: true, depth: MIDDOG.x + MIDDOG.y + 0.05 });
    // Flour kicked up as it scampers past her heels.
    R.air((ctx, t) => {
      if (!Q.detail) return;
      const tt = wrap(t);
      for (const p0 of dog.puffs) {
        const u = since(tt, p0);
        if (u > 0.9) continue;
        const k = u / 0.9;
        const [X, Y] = P(BEHIND[0], BEHIND[1], 0.1);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + i;
          ctx.beginPath();
          ctx.arc(X + Math.cos(a) * (0.15 + k * 0.5), Y - k * 0.5 - Math.abs(Math.sin(a)) * 0.2, 0.08 + k * 0.14, 0, TAU);
          ctx.fillStyle = alpha(FLOUR, 0.85 * (1 - k) * (1 - 0.8 * house.dark(t)));
          ctx.fill();
        }
      }
    });

    // Steam off the stockpot and the custard, and the kettle, now and then.
    R.air((ctx, t) => {
      if (!Q.detail) return;
      for (const [x, z0, n, seed] of [[5.4, 2.1, 5, 3], [8.0, 1.75, 3, 5]]) {
        for (let i = 0; i < n; i++) {
          const k = ((t * 0.45 + i / n + seed * 0.13) % 1);
          const [X, Y] = P(x + Math.sin(k * 5 + i + seed) * 0.2, 0.95, z0 + k * 1.6);
          ctx.beginPath(); ctx.arc(X, Y, 0.1 + k * 0.25, 0, TAU);
          ctx.fillStyle = alpha(C.white, 0.55 * (1 - k));
          ctx.fill();
        }
      }
      const q = (t % 17) / 17;
      if (q < 0.16) {
        const k = q / 0.16;
        for (let i = 0; i < 5; i++) {
          const kk = (k * 2 + i * 0.2) % 1;
          const [X, Y] = P(11.25 + kk * 0.8, 1.35 + kk * 0.9, 1.97 + kk * 0.5);
          ctx.beginPath(); ctx.arc(X, Y, 0.07 + kk * 0.2, 0, TAU);
          ctx.fillStyle = alpha(C.white, 0.7 * (1 - kk));
          ctx.fill();
        }
      }
    });

    // The cat's eyes, which you can see even in the dark.
    R.air((ctx, t) => {
      const [X, Y] = P(...CATAT);
      const b = lastBoom(wrap(t));
      const puff = b.big && b.age < 1.5 ? 1 + 0.18 * Math.exp(-b.age * 2) : 1;
      const blink = (t % 6.1) < 0.15;
      // it watches the dog
      const d = dog.at(t);
      const look = clamp((P(d.x, d.y)[0] - X) * 0.02, -0.03, 0.03);
      ctx.fillStyle = INK.candleGold;
      for (const ex of [-0.05, 0.09]) {
        ctx.beginPath();
        if (blink) ctx.rect(X + ex * puff - 0.035, Y - 0.62 * puff, 0.07, 0.012);
        else ctx.ellipse(X + ex * puff, Y - 0.62 * puff, 0.035, 0.028, 0, 0, TAU);
        ctx.fill();
      }
      if (!blink && Q.detail) {
        ctx.fillStyle = C.black;
        for (const ex of [-0.05, 0.09]) { ctx.beginPath(); ctx.ellipse(X + ex * puff + look, Y - 0.62 * puff, 0.008, 0.024, 0, 0, TAU); ctx.fill(); }
      }
    });

    // The mouse, out of its hole for crumbs under the table.
    const MOUSE = [[0.3, 9.3], [2.2, 8.85], [3.9, 8.25]];
    const mouseAt = (t) => {
      const q = (t % 26) / 26;
      if (q < 0.08) return { ...along(MOUSE, q / 0.08), moving: true };
      if (q < 0.2) return { x: MOUSE[2][0], y: MOUSE[2][1], dir: 'r', moving: false };
      if (q < 0.28) return { ...along(MOUSE.slice().reverse(), (q - 0.2) / 0.08), moving: true };
      return { x: -5, y: -5, hidden: true };
    };
    R.mover(mouseAt, (ctx, t, p) => {
      if (p.hidden) return;
      const [X, Y] = P(p.x, p.y, 0);
      const f = p.dir === 'l' ? -1 : 1;
      ctx.save();
      ctx.translate(X, Y);
      ctx.scale(f, 1);
      const bob = p.moving ? Math.abs(Math.sin(t * 20)) * 0.03 : 0;
      ctx.beginPath(); ctx.moveTo(-0.16, -0.06); ctx.quadraticCurveTo(-0.35, 0, -0.42, -0.14);
      ctx.strokeStyle = C.pink; ctx.lineWidth = 0.03; ctx.lineCap = 'round'; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, -0.1 - bob, 0.17, 0.1, 0, 0, TAU);
      ctx.moveTo(0.24, -0.1 - bob); ctx.lineTo(0.1, -0.18 - bob); ctx.lineTo(0.12, -0.03 - bob);
      paint(ctx, C.grey, { lw: 0.03 });
      ctx.beginPath(); ctx.arc(0.08, -0.21 - bob, 0.055, 0, TAU); paint(ctx, C.pink, { lw: 0.02 });
      if (!p.moving) { ctx.fillStyle = MAT.custard; ctx.fillRect(0.2, -0.12, 0.09, 0.07); } // a crumb of cheese
      ctx.restore();
    });
    R.thing(1.2, 9.0, (ctx) => {
      // the mousetrap, cheese long gone
      box(ctx, 1.0, 8.75, 0, 0.45, 0.25, 0.04, MAT.oakLight, { flat: true, lw: 0.025 });
      face(ctx, [[1.05, 8.8, 0.05], [1.4, 8.8, 0.05], [1.4, 8.95, 0.05]], null, { lw: 0.02, stroke: MAT.silver });
    });

    // The mop and bucket in the corner (the flour's still there, so: unused).
    R.thing(1.1, 15.3, (ctx) => {
      cylinder(ctx, 0.9, 15.1, 0, 0.3, 0.45, MAT.silver, { top: shade(MAT.silver, 0.3) });
      face(ctx, [[0.9, 15.1, 0.2], [0.3, 15.6, 2.4]], null, { lw: 0.07, stroke: MAT.oak });
      const m = P(0.9, 15.1, 0.35);
      ctx.beginPath(); ctx.ellipse(m[0], m[1], 0.2, 0.12, 0, 0, TAU); paint(ctx, INK.bone, { lw: 0.025 });
    });
    // The dog's bowl.
    R.thing(10.95, 10.3, (ctx) => {
      cylinder(ctx, 10.95, 10.3, 0, 0.26, 0.14, INK.oxblood, { top: shade(INK.oxblood, 0.4) });
      if (Q.detail) { const p = P(10.95, 10.56, 0.07); smallPrint(ctx, p[0], p[1], 'GOOD BOY', 0.07, INK.bone); }
    });

    R.dark(house.dark);

    // ---------- The finds ----------
    R.find({ id: 'footprints', label: 'Webbed footprints in flour', at: [INFLOUR[0], INFLOUR[1], 0.02], r: 0.75 });
    R.find({ id: 'timer', label: 'A kitchen timer', at: [TIMER[0], TIMER[1], th + 0.2], r: 0.6 });
    R.find({
      id: 'sausage', label: 'A stolen sausage', r: 1.1,
      at: (t) => {
        const d = dog.at(t);
        if (d.resting) return [REST[0], REST[1], th + 0.07];
        const [SX, SY] = mouthScreen(d);
        const s = d.x + d.y;
        return [(s + SX) / 2, (s - SX) / 2, (s / 2 - SY) / ZK];
      },
    });
  },
};
