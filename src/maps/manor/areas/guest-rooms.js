// Guest Rooms: the top of the grand staircase, the upstairs corridor, and two
// guest bedrooms, the Brigadier's (left) and Dr. Crane's (right). The two of
// them sneak into each other's rooms to search the luggage, and pass in the
// corridor at 75 s pretending not to (they both start whistling). Whatever they
// throw over their shoulders lands on the clock, so both rooms are tidy until
// 82 s and a mess from then until the evening starts again.
import {
  C, Q, box, rect, disc, cylinder, face, poly, paint, P, onLeft, onRight, planks, slab, speech, note, glow,
  mix, shade, tint, alpha, hash,
} from '../../../engine/art.js';
import { ZK } from '../../../engine/iso.js';
import { clamp } from '../../../engine/actors.js';
import { INK, MAT, ROOM, house, storm, lightsOut, isSolved, stormWindow, drapes, painting } from '../style.js';
import { DOORS, LOOP } from '../plan.js';

// ---------- The room's inks ----------
const RM = ROOM['guest-rooms'];
const PAPER2 = mix(RM.wall, INK.deepPlum, 0.16); // the wallpaper's second stripe
const OLIVE = mix(INK.verdigris, INK.candleGold, 0.3); // the Brigadier's army kit
const KHAKI = mix(INK.bone, INK.candleGold, 0.4); // his pith helmet, his maps
const IRON = INK.stormNavy;
const GOLD = MAT.brass;
const AMBER = mix(INK.oxblood, INK.candleGold, 0.45); // brown glass
const TAN = shade(mix(INK.oxblood, INK.candleGold, 0.5), 0.15); // Rupert's scuffed leather case
const WALNUT = mix(INK.oxblood, INK.candleGold, 0.2);
const GREY = mix(INK.bone, INK.stormNavy, 0.45); // Dr. Crane's socks, the mouse
const MINT = mix(INK.verdigris, INK.bone, 0.35); // Dr. Crane's side: surgery green
const CAT = mix(INK.candleGold, INK.oxblood, 0.35); // Dr. Crane's ginger tom

// ---------- The plan ----------
const HOLE = [1.5, 0.4, 11, 2.8]; // the stairwell: x0, y0, x1, y1
const RUN = 9.5 / 12, RISE = 7.1 / 12; // one step of the grand staircase
const PART = 1.2; // the low walls between the corridor and the rooms
const DOORLIST = DOORS['guest-rooms'];

// ---------- Time ----------
const lt = (t) => ((t % LOOP) + LOOP) % LOOP;
// 0 before t0, rising to 1 over d seconds, then 1 until the evening loops.
const since = (t, t0, d = 1e-3) => clamp((lt(t) - t0) / d);
// Speech and small words only once you're close enough to read them.
const readable = () => Q.detail && Q.pxPerUnit >= 14;

// ---------- Drawing helpers ----------
// Draw in a flat plane's own 2D coordinates: 'x' is the plane x = k (a = -y,
// b = -z), 'y' is the plane y = k (a = x, b = -z), 'z' is the level z = k
// (a = x, b = y). Handy for anything painted on a face: labels, portraits, rugs.
function flat(ctx, kind, k, fn) {
  ctx.save();
  if (kind === 'x') ctx.transform(1, -0.5, 0, ZK, k, k / 2);
  else if (kind === 'y') ctx.transform(1, 0.5, 0, ZK, -k, k / 2);
  else ctx.transform(1, 0.5, -1, 0.5, 0, -k * ZK);
  fn(ctx);
  ctx.restore();
}

// Words centred on (a, b), in whatever plane flat() has set up (or on screen).
function words(ctx, text, a, b, size, color = C.ink, sans = false) {
  ctx.save();
  ctx.translate(a, b);
  ctx.scale(1 / 40, 1 / 40);
  ctx.font = sans ? `700 ${size * 40}px "Rethink Sans", system-ui, sans-serif` : `${size * 40}px "Bagel Fat One", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// Upright words with an ink outline, facing the viewer (sound effects).
function shout(ctx, x, y, z, text, size, color = INK.bone) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(1 / 40, 1 / 40);
  ctx.font = `${size * 40}px "Bagel Fat One", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.min(0.09, size * 0.22) * 40;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = C.ink;
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// A line through 3D points, and the same with an ink outline (rails, rods, stems).
function line3(ctx, pts, color = C.ink, lw = 0.05) {
  ctx.beginPath();
  pts.forEach(([x, y, z], i) => {
    const X = x - y, Y = (x + y) / 2 - z * ZK;
    if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
  });
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.stroke();
}
function rod(ctx, pts, color, lw = 0.06) {
  if (Q.lines) line3(ctx, pts, C.ink, lw + 0.05);
  line3(ctx, pts, color, lw);
}
const dot = (ctx, X, Y, r, color) => {
  ctx.beginPath();
  ctx.arc(X, Y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
};

// A candle flame that flickers and stays lit when the lights go out. The
// candle itself is drawn with its furniture (candlestick), so people walking
// past sort in front of it properly.
function flame(R, x, y, z, seed, r = 1.9) {
  R.light({
    at: [x, y, z + 0.2], r, color: INK.candleGold, k: house.flicker(seed),
    draw: (ctx, t, k) => {
      const [X, Y] = P(x, y, z);
      ctx.beginPath();
      ctx.ellipse(X, Y - 0.12, 0.065, 0.12 * (0.8 + k * 0.3), 0, 0, Math.PI * 2);
      ctx.fillStyle = INK.candleGold;
      ctx.fill();
      if (Q.detail) dot(ctx, X, Y - 0.08, 0.028, INK.bone);
    },
  });
}
function candlestick(ctx, x, y, z, h = 0.3) {
  const [X, Y] = P(x, y, z);
  ctx.beginPath();
  ctx.ellipse(X, Y, 0.13, 0.065, 0, 0, Math.PI * 2);
  paint(ctx, GOLD, { lw: 0.03 });
  ctx.beginPath();
  ctx.rect(X - 0.05, Y - h * ZK, 0.1, h * ZK);
  paint(ctx, INK.bone, { lw: 0.03 });
}

// ---------- The walls ----------
// Door openings on a side, as [from, to, height] along the wall.
const gapsOn = (side) => DOORLIST.filter((d) => d.side === side).map((d) => {
  const w = d.w ?? 2.2;
  return [d.at - w / 2, d.at + w / 2, d.h ?? 3.6];
});
// The stretches of a wall between its doors.
function stretches(side) {
  const out = [];
  let u = 0;
  for (const [a, b] of gapsOn(side).sort((p, q) => p[0] - q[0])) {
    if (a > u) out.push([u, a]);
    u = b;
  }
  if (u < 16) out.push([u, 16]);
  return out;
}

// Striped paper above a dado rail, a skirting board and door frames. (Done
// here rather than with the style sheet's stripes() and trim(), which run the
// whole length of a wall and would paint across the doorways.)
function papering(R) {
  R.wall((ctx) => {
    if (!Q.detail) return;
    for (const side of ['left', 'right']) {
      const f = side === 'left' ? onLeft : onRight;
      const gaps = gapsOn(side);
      for (let u = 0.3; u < 15.8; u += 0.9) {
        const gap = gaps.find(([a, b]) => u + 0.32 > a - 0.35 && u < b + 0.35);
        const z0 = gap ? gap[2] + 0.3 : 1.42;
        f(ctx, u, z0, 0.32, 6 - z0, PAPER2, { stroke: false });
        // a small sprig in every other stripe
        if ((Math.round(u / 0.9) % 2) === 0) {
          for (let z = z0 + 0.5; z < 5.8; z += 1.1) f(ctx, u + 0.1, z, 0.12, 0.12, shade(PAPER2, 0.25), { stroke: false });
        }
      }
    }
  });
  R.decor((ctx) => {
    for (const side of ['left', 'right']) {
      const f = side === 'left' ? onLeft : onRight;
      for (const [a, b] of stretches(side)) {
        f(ctx, a, 0, b - a, 0.3, RM.trim, { lw: 0.03 });
        f(ctx, a, 1.3, b - a, 0.1, RM.trim, { stroke: false });
      }
      for (const [a, b, h] of gapsOn(side)) {
        f(ctx, a - 0.2, 0, 0.2, h + 0.1, MAT.mahogany, { lw: 0.03 });
        f(ctx, b, 0, 0.2, h + 0.1, MAT.mahogany, { lw: 0.03 });
        f(ctx, a - 0.32, h, b - a + 0.64, 0.28, MAT.mahogany, { lw: 0.03 });
      }
    }
  });
}

// The low walls: papered on the room side, cut through at waist height like
// the house's other inside walls when you look in from outside.
function lowWallX(ctx, a, b, end) {
  const y0 = 6.4, y1 = 6.6, H = PART;
  face(ctx, [[a - 0.01, y1, 0], [b + 0.01, y1, 0], [b + 0.01, y1, H], [a - 0.01, y1, H]], RM.wall, { stroke: false, dots: shade(RM.wall, 0.3), density: 0.1 });
  face(ctx, [[a - 0.01, y1 + 0.005, 0], [b + 0.01, y1 + 0.005, 0], [b + 0.01, y1 + 0.005, 0.28], [a - 0.01, y1 + 0.005, 0.28]], RM.trim, { stroke: false });
  face(ctx, [[a - 0.01, y0, H], [b + 0.01, y0, H], [b + 0.01, y1, H], [a - 0.01, y1, H]], INK.stormNavy, { stroke: false });
  if (end) face(ctx, [[b, y0, 0], [b, y1, 0], [b, y1, H], [b, y0, H]], shade(RM.wall, 0.3), { lw: 0.04 });
  line3(ctx, [[a, y1, 0], [b, y1, 0]], C.ink, 0.04);
  line3(ctx, [[a, y1, 0.28], [b, y1, 0.28]], C.ink, 0.025);
  line3(ctx, [[a, y1, H], [b, y1, H]], C.ink, 0.05);
  line3(ctx, [[a, y0, H], [b, y0, H]], C.ink, 0.04);
}
function lowWallY(ctx, a, b, end) {
  const x0 = 7.9, x1 = 8.1, H = PART;
  face(ctx, [[x1, a - 0.01, 0], [x1, b + 0.01, 0], [x1, b + 0.01, H], [x1, a - 0.01, H]], shade(RM.wall, 0.08), { stroke: false, dots: shade(RM.wall, 0.35), density: 0.1 });
  face(ctx, [[x1 + 0.005, a - 0.01, 0], [x1 + 0.005, b + 0.01, 0], [x1 + 0.005, b + 0.01, 0.28], [x1 + 0.005, a - 0.01, 0.28]], RM.trim, { stroke: false });
  face(ctx, [[x0, a - 0.01, H], [x1, a - 0.01, H], [x1, b + 0.01, H], [x0, b + 0.01, H]], INK.stormNavy, { stroke: false });
  if (end) face(ctx, [[x0, b, 0], [x1, b, 0], [x1, b, H], [x0, b, H]], shade(RM.wall, 0.25), { lw: 0.04 });
  line3(ctx, [[x1, a, 0], [x1, b, 0]], C.ink, 0.04);
  line3(ctx, [[x1, a, 0.28], [x1, b, 0.28]], C.ink, 0.025);
  line3(ctx, [[x1, a, H], [x1, b, H]], C.ink, 0.05);
  line3(ctx, [[x0, a, H], [x0, b, H]], C.ink, 0.04);
}

// ---------- The stairwell ----------
// A slot in the floor along the back wall. You can only see a couple of units
// down into it from here: the top steps, the stair carpet with its brass rods,
// and the far wall getting darker as it goes down to the hall.
function stairwell(ctx) {
  const [x0, y0, x1, y1] = HOLE;
  const wall = mix(ROOM['grand-hall'].wall, INK.stormNavy, 0.25);
  ctx.save();
  poly(ctx, [[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]]);
  ctx.clip();
  face(ctx, [[x0, y0, 0.3], [x1, y0, 0.3], [x1, y0, -3], [x0, y0, -3]], wall, { stroke: false, dots: shade(wall, 0.45), density: 0.2 });
  if (Q.detail) {
    for (let x = x0 + 0.4; x < x1; x += 0.9) face(ctx, [[x, y0, 0.3], [x + 0.3, y0, 0.3], [x + 0.3, y0, -3], [x, y0, -3]], shade(wall, 0.12), { stroke: false });
  }
  for (let i = 1; i <= 4; i++) face(ctx, [[x0, y0, -i * 0.45], [x1, y0, -i * 0.45], [x1, y0, -3], [x0, y0, -3]], alpha(INK.stormNavy, 0.24), { stroke: false });
  // The handrail on the far wall, running down with the stairs.
  const slope = RISE / RUN;
  rod(ctx, [[x0 - 0.3, y0 + 0.05, 1.0 + 0.3 * slope], [x1, y0 + 0.05, 1.0 - (x1 - x0) * slope]], MAT.mahogany, 0.07);
  for (let k = 5; k >= 0; k--) {
    const xa = x0 + k * RUN, xb = xa + RUN, z = -k * RISE, dim = Math.min(0.8, k * 0.15);
    const tread = mix(tint(MAT.mahogany, 0.18), INK.stormNavy, dim), riser = mix(MAT.mahoganyDark, INK.stormNavy, dim + 0.1);
    const carpet = mix(tint(MAT.velvet, 0.12), INK.stormNavy, dim);
    rect(ctx, xa, y0, RUN, y1 - y0, z, tread, { lw: 0.03 });
    rect(ctx, xa, y0 + 0.45, RUN, y1 - y0 - 0.9, z, carpet, { stroke: false });
    face(ctx, [[xb, y0, z], [xb, y1, z], [xb, y1, z - RISE], [xb, y0, z - RISE]], riser, { lw: 0.03 });
    face(ctx, [[xb, y0 + 0.45, z], [xb, y1 - 0.45, z], [xb, y1 - 0.45, z - RISE], [xb, y0 + 0.45, z - RISE]], shade(carpet, 0.3), { stroke: false });
    line3(ctx, [[xb + 0.03, y0 + 0.4, z - RISE + 0.04], [xb + 0.03, y1 - 0.4, z - RISE + 0.04]], mix(GOLD, INK.stormNavy, dim), 0.05);
  }
  ctx.restore();
}

// The banister along the open sides of the stairwell, with a big newel post
// at the top of the stairs.
function newel(ctx, x, y, h, s = 0.2) {
  box(ctx, x - s / 2, y - s / 2, 0, s, s, h, MAT.mahogany, { lw: 0.035, dotsL: MAT.mahoganyDark });
  box(ctx, x - s / 2 - 0.04, y - s / 2 - 0.04, h, s + 0.08, s + 0.08, 0.07, MAT.mahoganyDark, { flat: true, lw: 0.03 });
  const [X, Y] = P(x, y, h + 0.07);
  ctx.beginPath();
  ctx.ellipse(X, Y - 0.1, s * 0.55, s * 0.6, 0, 0, Math.PI * 2);
  paint(ctx, GOLD, { lw: 0.03 });
  if (Q.detail) dot(ctx, X - s * 0.2, Y - 0.16, 0.035, INK.bone);
}
function banister(ctx) {
  const [x0, y0, x1, y1] = HOLE;
  const H = 1.02;
  box(ctx, x1, y0, 0, 0.14, y1 - y0 + 0.14, 0.14, MAT.mahogany, { flat: true, lw: 0.03 });
  box(ctx, x0, y1, 0, x1 - x0 + 0.14, 0.14, 0.14, MAT.mahogany, { flat: true, lw: 0.03 });
  if (Q.detail) {
    ctx.beginPath();
    for (let y = y0 + 0.28; y < y1 - 0.05; y += 0.3) {
      const a = P(x1 + 0.07, y, 0.14), b = P(x1 + 0.07, y, H);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    }
    for (let x = x0 + 0.3; x < x1 - 0.05; x += 0.3) {
      const a = P(x, y1 + 0.07, 0.14), b = P(x, y1 + 0.07, H);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    }
    ctx.lineCap = 'butt';
    if (Q.lines) {
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 0.1;
      ctx.stroke();
    }
    ctx.strokeStyle = INK.bone;
    ctx.lineWidth = 0.055;
    ctx.stroke();
  } else {
    face(ctx, [[x0, y1 + 0.07, 0.14], [x1, y1 + 0.07, 0.14], [x1, y1 + 0.07, H], [x0, y1 + 0.07, H]], alpha(INK.bone, 0.45), { stroke: false });
  }
  newel(ctx, x1 + 0.07, y0 - 0.02, 1.2);
  box(ctx, x1 - 0.02, y0, H, 0.18, y1 - y0 + 0.16, 0.09, MAT.mahogany, { flat: true, lw: 0.03 });
  box(ctx, x0, y1 - 0.02, H, x1 - x0 + 0.16, 0.18, 0.09, MAT.mahogany, { flat: true, lw: 0.03 });
  newel(ctx, x1 + 0.07, y1 + 0.07, 1.22);
  newel(ctx, x0 - 0.04, y1 + 0.05, 1.4, 0.27);
}

// ---------- Rugs ----------
function runner(ctx, x0, y0, x1, y1) {
  rect(ctx, x0, y0, x1 - x0, y1 - y0, 0.01, GOLD, { lw: 0.03 });
  rect(ctx, x0 + 0.1, y0 + 0.1, x1 - x0 - 0.2, y1 - y0 - 0.2, 0.012, MAT.velvet, { stroke: false, dots: shade(MAT.velvet, 0.35), density: 0.12 });
  if (!Q.detail) return;
  const along = x1 - x0 > y1 - y0;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  ctx.beginPath();
  if (along) {
    for (let x = x0 + 0.6; x < x1 - 0.3; x += 0.8) {
      const pts = [[x - 0.26, cy], [x, cy - 0.3], [x + 0.26, cy], [x, cy + 0.3]].map(([a, b]) => P(a, b, 0.015));
      pts.forEach(([X, Y], i) => (i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y)));
      ctx.closePath();
    }
  } else {
    for (let y = y0 + 0.6; y < y1 - 0.3; y += 0.8) {
      const pts = [[cx, y - 0.26], [cx - 0.3, y], [cx, y + 0.26], [cx + 0.3, y]].map(([a, b]) => P(a, b, 0.015));
      pts.forEach(([X, Y], i) => (i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y)));
      ctx.closePath();
    }
  }
  ctx.strokeStyle = alpha(INK.candleGold, 0.8);
  ctx.lineWidth = 0.04;
  ctx.stroke();
}

// The Brigadier's rug: the regiment's colours, crossed sabres, and a
// scorch where he knocked his pipe out. (His tiger is in the taxidermy
// room, "shot" by him; it was already stuffed.)
function brigRug(ctx) {
  flat(ctx, 'z', 0.012, (g) => {
    const x0 = 4.2, y0 = 9.05, x1 = 6.6, y1 = 11.35;
    g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0);
    paint(g, OLIVE, { lw: 0.04, dots: shade(OLIVE, 0.35), density: 0.14 });
    g.beginPath(); g.rect(x0 + 0.16, y0 + 0.16, x1 - x0 - 0.32, y1 - y0 - 0.32);
    g.strokeStyle = INK.oxblood; g.lineWidth = 0.12; g.stroke();
    g.beginPath(); g.rect(x0 + 0.3, y0 + 0.3, x1 - x0 - 0.6, y1 - y0 - 0.6);
    g.strokeStyle = GOLD; g.lineWidth = 0.04; g.stroke();
    // the crest: crossed sabres over a laurel ring
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    g.beginPath(); g.arc(cx, cy, 0.5, 0, Math.PI * 2);
    g.strokeStyle = GOLD; g.lineWidth = 0.07; g.stroke();
    g.beginPath();
    g.moveTo(cx - 0.45, cy - 0.45); g.lineTo(cx + 0.45, cy + 0.45);
    g.moveTo(cx + 0.45, cy - 0.45); g.lineTo(cx - 0.45, cy + 0.45);
    g.lineCap = 'round';
    g.strokeStyle = C.ink; g.lineWidth = 0.1; g.stroke();
    g.strokeStyle = MAT.silver; g.lineWidth = 0.05; g.stroke();
    // the scorch
    g.beginPath(); g.ellipse(x1 - 0.55, y0 + 0.6, 0.16, 0.1, 0.4, 0, Math.PI * 2);
    g.fillStyle = alpha(C.ink, 0.45); g.fill();
    // a fringe at each end
    g.beginPath();
    for (let y = y0 + 0.08; y < y1; y += 0.16) { g.moveTo(x0, y); g.lineTo(x0 - 0.14, y); g.moveTo(x1, y); g.lineTo(x1 + 0.14, y); }
    g.strokeStyle = KHAKI; g.lineWidth = 0.03; g.stroke();
  });
}

// Dr. Crane's rug, surgery green, under his luggage.
function craneRug(ctx) {
  const x0 = 9.3, y0 = 12.1, x1 = 12.9, y1 = 15.5;
  rect(ctx, x0, y0, x1 - x0, y1 - y0, 0.01, mix(INK.verdigris, INK.stormNavy, 0.35), { lw: 0.03 });
  rect(ctx, x0 + 0.22, y0 + 0.22, x1 - x0 - 0.44, y1 - y0 - 0.44, 0.012, MINT, { stroke: false, dots: shade(MINT, 0.3), density: 0.12 });
  if (!Q.detail) return;
  flat(ctx, 'z', 0.014, (g) => {
    g.beginPath();
    g.ellipse((x0 + x1) / 2, (y0 + y1) / 2, 1.0, 0.9, 0, 0, Math.PI * 2);
    g.strokeStyle = mix(INK.verdigris, INK.stormNavy, 0.3); g.lineWidth = 0.08; g.stroke();
    g.beginPath();
    for (const [a, b] of [[x0 + 0.5, y0 + 0.5], [x1 - 0.5, y0 + 0.5], [x0 + 0.5, y1 - 0.5], [x1 - 0.5, y1 - 0.5]]) {
      g.moveTo(a + 0.18, b); g.arc(a, b, 0.18, 0, Math.PI * 2);
    }
    g.stroke();
  });
}

// ---------- Furniture: the landing ----------
function landingTable(ctx) {
  for (const [x, y] of [[0.62, 0.22], [0.62, 1.28]]) box(ctx, x - 0.04, y - 0.04, 0, 0.08, 0.08, 0.92, MAT.mahogany, { flat: true, lw: 0.03 });
  box(ctx, 0.04, 0.14, 0.2, 0.6, 1.2, 0.06, MAT.mahogany, { flat: true, lw: 0.03 });
  box(ctx, 0.02, 0.1, 0.92, 0.72, 1.3, 0.1, MAT.mahogany, { lw: 0.035, dotsL: MAT.mahoganyDark });
  // the guest book, open
  rect(ctx, 0.2, 0.7, 0.38, 0.42, 1.03, INK.bone, { lw: 0.025 });
  if (Q.detail) line3(ctx, [[0.2, 0.91, 1.035], [0.58, 0.91, 1.035]], shade(INK.bone, 0.4), 0.02);
  candlestick(ctx, 0.36, 0.34, 1.02, 0.34);
  // a vase of roses nobody has watered since the Lord's last birthday
  const [X, Y] = P(0.38, 1.2, 1.02);
  ctx.beginPath();
  ctx.moveTo(X - 0.1, Y); ctx.quadraticCurveTo(X - 0.2, Y - 0.25, X - 0.07, Y - 0.42);
  ctx.lineTo(X + 0.07, Y - 0.42); ctx.quadraticCurveTo(X + 0.2, Y - 0.25, X + 0.1, Y);
  ctx.closePath();
  paint(ctx, INK.verdigris, { lw: 0.03, dots: shade(INK.verdigris, 0.4), density: 0.2 });
  const heads = [[-0.3, -0.62], [0.05, -0.8], [0.32, -0.6]];
  ctx.beginPath();
  for (const [hx, hy] of heads) { ctx.moveTo(X, Y - 0.4); ctx.quadraticCurveTo(X + hx * 0.4, Y - 0.75, X + hx, Y + hy); }
  ctx.strokeStyle = mix(INK.verdigris, INK.stormNavy, 0.4); ctx.lineWidth = 0.035; ctx.stroke();
  for (const [hx, hy] of heads) {
    ctx.beginPath();
    ctx.ellipse(X + hx, Y + hy, 0.08, 0.06, 0.4, 0, Math.PI * 2);
    paint(ctx, shade(MAT.velvet, 0.25), { lw: 0.025 });
  }
}

// The corner by the Lord's door, where the house puts what it has nowhere
// else for: a golf bag, a hatbox, and Rupert's suitcase, shut. Nearly: the
// lid won't close over the family silver, so a couple of forks, a candlestick
// and the teapot's spout stick out of the crack (and one of his socks).
const CASE = { x0: 14.8, y0: 2.4, w: 1.1, d: 0.7, h: 0.3, lift: 0.13, th: 0.12 };
// k: 0 shut (nearly), 1 sprung open. Tapped, the lid flies up and the silver
// goes everywhere.
function silverCase(ctx, k = 0) {
  const { x0, y0, w, d, h, lift, th } = CASE;
  const x1 = x0 + w, y1 = y0 + d;
  // The lid, hinged along the back: from resting on the silver to flung back.
  const b0 = Math.atan2(lift, d), b = b0 + (1.85 - b0) * k;
  const lidAt = (x, r, z) => [x, y0 + r * Math.cos(b), h + z + r * Math.sin(b)];
  const lid = () => {
    const top = [lidAt(x0, 0, th), lidAt(x1, 0, th), lidAt(x1, d, th), lidAt(x0, d, th)];
    face(ctx, [lidAt(x1, 0, 0), lidAt(x1, d, 0), lidAt(x1, d, th), lidAt(x1, 0, th)], shade(TAN, 0.1), { lw: 0.03 });
    face(ctx, [lidAt(x0, d, 0), lidAt(x1, d, 0), lidAt(x1, d, th), lidAt(x0, d, th)], shade(TAN, 0.24), { lw: 0.03, dots: shade(TAN, 0.5), density: 0.18 });
    if (k > 0.5) {
      // flung open: you see its lining
      face(ctx, [lidAt(x0, 0, 0), lidAt(x1, 0, 0), lidAt(x1, d, 0), lidAt(x0, d, 0)], MAT.velvetDark, { lw: 0.03 });
      return;
    }
    face(ctx, top, TAN, { lw: 0.03 });
    // its straps, unbuckled, and the handle
    for (const x of [x0 + 0.25, x0 + w - 0.3]) {
      face(ctx, [lidAt(x, 0, th + 0.002), lidAt(x + 0.08, 0, th + 0.002), lidAt(x + 0.08, d, th + 0.002), lidAt(x, d, th + 0.002)], shade(TAN, 0.4), { stroke: false });
      if (k < 0.05) face(ctx, [[x, y1 + 0.004, h + lift + th], [x + 0.08, y1 + 0.004, h + lift + th], [x + 0.09, y1 + 0.004, h + lift - 0.1], [x + 0.01, y1 + 0.004, h + lift - 0.1]], shade(TAN, 0.4), { stroke: false });
    }
    const [HX, HY] = P(...lidAt(x0 + w / 2, d + 0.005, th / 2));
    ctx.beginPath(); ctx.ellipse(HX, HY, 0.12, 0.07, 0, 0, Math.PI);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.06; ctx.stroke(); ctx.strokeStyle = shade(TAN, 0.3); ctx.lineWidth = 0.03; ctx.stroke();
  };
  // (Open, the lid stands behind everything; shut, it lies on top.)
  if (k > 0.5) lid();
  box(ctx, x0, y0, 0, w, d, h, TAN, { lw: 0.035, dotsL: shade(TAN, 0.5) });
  // the label on the end
  face(ctx, [[x1, y0 + 0.2, 0.06], [x1, y0 + 0.5, 0.06], [x1, y0 + 0.5, 0.24], [x1, y0 + 0.2, 0.24]], shade(INK.bone, 0.12), { lw: 0.02 });
  if (readable()) flat(ctx, 'x', x1 + 0.005, (g) => words(g, 'R.G.', -(y0 + 0.35), -0.15, 0.1, C.ink, true));
  if (k > 0.05) {
    silverHeap(ctx, k);
    if (k <= 0.5) lid();
    return;
  }
  // the crack under the lid
  const gap = shade(INK.deepPlum, 0.4);
  face(ctx, [[x0, y1, h], [x1, y1, h], [x1, y1, h + lift], [x0, y1, h + lift]], gap, { stroke: false });
  face(ctx, [[x1, y0, h], [x1, y1, h], [x1, y1, h + lift]], gap, { stroke: false });
  // what's sticking out of it: two forks...
  for (const x of [x0 + 0.16, x0 + 0.3]) {
    rod(ctx, [[x, y1 - 0.05, h + 0.05], [x + 0.01, y1 + 0.14, h + 0.04]], MAT.silver, 0.035);
    if (Q.detail) {
      for (const dx of [-0.035, 0, 0.035]) line3(ctx, [[x + 0.01 + dx, y1 + 0.13, h + 0.04], [x + 0.01 + dx, y1 + 0.24, h + 0.035]], MAT.silver, 0.018);
    }
  }
  // ...a candlestick, on its side, its cup poking out...
  rod(ctx, [[x0 + 0.5, y1 - 0.06, h + 0.06], [x0 + 0.54, y1 + 0.12, h + 0.06]], MAT.silver, 0.05);
  { const [X, Y] = P(x0 + 0.55, y1 + 0.15, h + 0.06);
    ctx.beginPath(); ctx.ellipse(X, Y, 0.07, 0.05, -0.4, 0, Math.PI * 2); paint(ctx, MAT.silver, { lw: 0.02 });
    rod(ctx, [[x0 + 0.55, y1 + 0.15, h + 0.06], [x0 + 0.57, y1 + 0.3, h + 0.06]], INK.bone, 0.04); }
  // ...the teapot's spout, curling up out of the crack...
  { const [X, Y] = P(x0 + 0.78, y1, h + 0.05);
    ctx.beginPath(); ctx.moveTo(X - 0.03, Y); ctx.quadraticCurveTo(X + 0.04, Y - 0.02, X + 0.1, Y - 0.14);
    ctx.lineCap = 'round';
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.075; ctx.stroke(); ctx.strokeStyle = MAT.silver; ctx.lineWidth = 0.04; ctx.stroke(); }
  // ...and a green sock, hanging down the front
  face(ctx, [[x0 + 0.95, y1 + 0.004, h + 0.06], [x0 + 1.04, y1 + 0.004, h + 0.06], [x0 + 1.04, y1 + 0.004, 0.08], [x0 + 1.08, y1 + 0.004, 0.02], [x0 + 0.95, y1 + 0.004, 0.02]], INK.verdigris, { lw: 0.02 });
  lid();
}
// A fork, lying flat at (x, y, z), turned by r.
function fork(ctx, x, y, z, r, s = 1) {
  flat(ctx, 'z', z, (g) => {
    g.save(); g.translate(x, y); g.rotate(r); g.scale(s, s);
    g.beginPath(); g.moveTo(-0.22, 0); g.lineTo(0.06, 0);
    g.lineCap = 'round'; g.strokeStyle = C.ink; g.lineWidth = 0.06; g.stroke(); g.strokeStyle = MAT.silver; g.lineWidth = 0.035; g.stroke();
    g.beginPath(); g.ellipse(0.09, 0, 0.05, 0.045, 0, 0, Math.PI * 2); paint(g, MAT.silver, { lw: 0.015 });
    g.beginPath(); for (const dy of [-0.03, 0, 0.03]) { g.moveTo(0.12, dy); g.lineTo(0.22, dy); }
    g.strokeStyle = C.ink; g.lineWidth = 0.02; g.stroke();
    g.restore();
  });
}
// The family silver, heaped in the open case, and the forks that flew out.
function silverHeap(ctx, k) {
  const { x0, y0, w, d, h } = CASE;
  rect(ctx, x0 + 0.06, y0 + 0.06, w - 0.12, d - 0.12, h + 0.002, shade(INK.deepPlum, 0.35), { lw: 0.02 });
  const z = h + 0.01;
  // the teapot, on its side
  { const [X, Y] = P(x0 + 0.8, y0 + 0.32, z + 0.1);
    ctx.beginPath(); ctx.ellipse(X, Y, 0.17, 0.12, 0, 0, Math.PI * 2); paint(ctx, MAT.silver, { lw: 0.025, dots: shade(MAT.silver, 0.35), density: 0.12 });
    ctx.beginPath(); ctx.moveTo(X + 0.14, Y - 0.02); ctx.quadraticCurveTo(X + 0.24, Y - 0.04, X + 0.3, Y - 0.16);
    ctx.lineCap = 'round'; ctx.strokeStyle = C.ink; ctx.lineWidth = 0.07; ctx.stroke(); ctx.strokeStyle = MAT.silver; ctx.lineWidth = 0.035; ctx.stroke();
    ctx.beginPath(); ctx.arc(X - 0.17, Y, 0.07, Math.PI * 0.5, Math.PI * 1.5); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke(); }
  // the candlestick, the sauce boat, spoons and forks
  rod(ctx, [[x0 + 0.15, y0 + 0.2, z + 0.04], [x0 + 0.55, y0 + 0.5, z + 0.04]], MAT.silver, 0.06);
  disc(ctx, x0 + 0.13, y0 + 0.18, z + 0.04, 0.09, MAT.silver, { lw: 0.02 });
  for (const [x, y, r] of [[0.25, 0.45, 0.3], [0.45, 0.2, -0.6], [0.6, 0.55, 1.2], [0.95, 0.55, 2.6], [0.35, 0.58, -1.4]]) fork(ctx, x0 + x, y0 + y, z + 0.06, r, 0.9);
  for (const [x, y] of [[0.68, 0.3], [0.2, 0.32]]) { const [X, Y] = P(x0 + x, y0 + y, z + 0.08); ctx.beginPath(); ctx.ellipse(X, Y, 0.06, 0.04, 0.4, 0, Math.PI * 2); paint(ctx, MAT.silver, { lw: 0.015 }); }
  // Rupert's sock, on top of it all
  flat(ctx, 'z', z + 0.1, (g) => { g.save(); g.translate(x0 + 0.95, y0 + 0.22); g.rotate(0.6); sockShape(g, INK.verdigris); g.restore(); });
  // forks everywhere: out over the edge and across the floor
  const e = clamp(k * 1.4);
  for (const [x, y, r] of [[14.35, 3.3, 0.4], [15.05, 3.45, -1.1], [15.55, 3.35, 2.2], [14.55, 2.9, 1.7]]) {
    fork(ctx, x0 + w / 2 + (x - x0 - w / 2) * e, y0 + d / 2 + (y - y0 - d / 2) * e, 0.02 + Math.sin(e * Math.PI) * 0.5, r + e * 3);
  }
}
// A golf bag beside the suitcase: two woods in knitted covers, and an iron.
function golfBag(ctx) {
  const x = 14.5, y = 2.4, h = 0.9, r = 0.17;
  const cloth = mix(KHAKI, INK.oxblood, 0.3);
  const [X, Y] = P(x, y, h);
  // the clubs first, so the bag's rim sits over their shafts
  ctx.beginPath();
  for (const dx of [-0.1, 0.02, 0.13]) { ctx.moveTo(X + dx, Y); ctx.lineTo(X + dx * 1.3, Y - 0.34); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(X + 0.15, Y - 0.38); ctx.lineTo(X + 0.32, Y - 0.35); ctx.lineTo(X + 0.3, Y - 0.29); ctx.lineTo(X + 0.16, Y - 0.32); ctx.closePath();
  paint(ctx, MAT.silver, { lw: 0.018 });
  for (const [dx, c] of [[-0.13, INK.oxblood], [0.03, INK.verdigris]]) {
    ctx.beginPath(); ctx.roundRect(X + dx - 0.075, Y - 0.5, 0.15, 0.18, 0.06); paint(ctx, c, { lw: 0.02 });
    if (Q.detail) dot(ctx, X + dx, Y - 0.52, 0.045, INK.bone);
  }
  tin(ctx, x, y, 0, r, h, shade(cloth, 0.12), shade(cloth, 0.5));
  // a leather base and rim, and a strap
  band(ctx, x, y, 0.02, r + 0.002, 0.14, WALNUT);
  band(ctx, x, y, h - 0.1, r + 0.002, 0.1, WALNUT);
  line3(ctx, [[x + 0.1, y + 0.13, 0.25], [x + 0.14, y + 0.12, 0.7]], shade(WALNUT, 0.3), 0.04);
}
// A hatbox on the floor in front of it all, ribboned.
function cornerHatbox(ctx) {
  const x = 15.65, y = 3.65, c = mix(INK.verdigris, INK.stormNavy, 0.35);
  cylinder(ctx, x, y, 0, 0.25, 0.22, c, { lw: 0.03 });
  band(ctx, x, y, 0.08, 0.251, 0.05, INK.bone);
  cylinder(ctx, x, y, 0.2, 0.265, 0.06, shade(c, 0.1), { lw: 0.03 });
}

// A potted palm by the Lord's door. Nobody in this house waters anything.
function deadPalm(ctx) {
  const [X, Y] = P(15.3, 1.55, 0);
  const brown = mix(MAT.leaf, MAT.fur, 0.6), straw = mix(MAT.leaf, INK.candleGold, 0.55);
  ctx.beginPath();
  ctx.moveTo(X - 0.3, Y - 0.6); ctx.lineTo(X + 0.3, Y - 0.6); ctx.lineTo(X + 0.22, Y); ctx.lineTo(X - 0.22, Y);
  ctx.closePath();
  paint(ctx, MAT.terracotta, { lw: 0.03, dots: shade(MAT.terracotta, 0.4), density: 0.2 });
  ctx.beginPath(); ctx.ellipse(X, Y - 0.6, 0.3, 0.1, 0, 0, Math.PI * 2); paint(ctx, shade(MAT.terracotta, 0.2), { lw: 0.03 });
  ctx.beginPath(); ctx.ellipse(X, Y - 0.6, 0.23, 0.07, 0, 0, Math.PI * 2); ctx.fillStyle = MAT.furDark; ctx.fill();
  ctx.beginPath(); ctx.moveTo(X, Y - 0.62); ctx.quadraticCurveTo(X + 0.06, Y - 1.0, X + 0.02, Y - 1.3);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.stroke(); ctx.strokeStyle = MAT.fur; ctx.lineWidth = 0.06; ctx.stroke();
  // fronds, drooping all the way down
  for (const [dx, drop, c] of [[-0.62, 0.55, brown], [0.6, 0.62, straw], [-0.38, 0.95, straw], [0.36, 0.98, brown], [0.08, 0.35, straw]]) {
    ctx.beginPath();
    ctx.moveTo(X + 0.02, Y - 1.3);
    ctx.quadraticCurveTo(X + dx * 0.7, Y - 1.55, X + dx, Y - 1.3 + drop);
    ctx.quadraticCurveTo(X + dx * 0.6, Y - 1.3 + drop * 0.4, X + 0.02, Y - 1.24);
    paint(ctx, c, { lw: 0.025 });
  }
  // and a card in the pot
  ctx.beginPath(); ctx.moveTo(X - 0.12, Y - 0.62); ctx.lineTo(X - 0.16, Y - 0.95); ctx.strokeStyle = MAT.fur; ctx.lineWidth = 0.03; ctx.stroke();
  ctx.beginPath(); ctx.rect(X - 0.42, Y - 1.14, 0.5, 0.22); paint(ctx, INK.bone, { lw: 0.02 });
  if (Q.detail) words(ctx, 'WATER ME', X - 0.17, Y - 1.03, 0.085, INK.oxblood, true);
}

// ---------- Furniture: the Brigadier's room ----------
function brigBedHead(ctx) {
  const x0 = 0.52, x1 = 2.98, y = 11.02, top = 1.45;
  for (const x of [x0, x1]) box(ctx, x - 0.05, y - 0.05, 0, 0.1, 0.1, top, IRON, { flat: true, lw: 0.03 });
  if (Q.detail) {
    ctx.beginPath();
    for (let x = x0 + 0.3; x < x1 - 0.1; x += 0.3) {
      const a = P(x, y, 0.9), b = P(x, y, top - 0.1);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    }
    ctx.strokeStyle = IRON; ctx.lineWidth = 0.04; ctx.stroke();
  }
  rod(ctx, [[x0, y, top - 0.1], [x1, y, top - 0.1]], IRON, 0.06);
  rod(ctx, [[x0, y, 0.9], [x1, y, 0.9]], IRON, 0.05);
  for (const x of [x0, x1]) {
    const [X, Y] = P(x, y, top);
    ctx.beginPath(); ctx.arc(X, Y - 0.05, 0.08, 0, Math.PI * 2); paint(ctx, GOLD, { lw: 0.03 });
  }
}
function brigBedBody(ctx) {
  const x0 = 0.5, x1 = 3.0, y0 = 11.0, y1 = 15.0;
  for (const [x, y] of [[x0 + 0.06, y1 - 0.06], [x1 - 0.06, y1 - 0.06], [x1 - 0.06, y0 + 0.08]]) box(ctx, x - 0.04, y - 0.04, 0, 0.08, 0.08, 0.45, IRON, { flat: true, stroke: false });
  box(ctx, x0, y0, 0.4, x1 - x0, y1 - y0, 0.1, IRON, { flat: true, lw: 0.03 });
  box(ctx, x0 + 0.05, y0 + 0.05, 0.5, x1 - x0 - 0.1, y1 - y0 - 0.1, 0.27, INK.bone, { lw: 0.035 });
  const fold = 12.3;
  box(ctx, x0 - 0.03, fold, 0.44, x1 - x0 + 0.06, y1 - fold + 0.03, 0.39, OLIVE, { lw: 0.035, dotsL: shade(OLIVE, 0.5) });
  rect(ctx, x0 - 0.03, fold, x1 - x0 + 0.06, 0.24, 0.832, INK.bone, { lw: 0.03 });
  // regimental stripes across the blanket, over the top and down the side
  for (const y of [13.9, 14.15]) {
    rect(ctx, x0 - 0.03, y, x1 - x0 + 0.06, 0.12, 0.834, INK.oxblood, { stroke: false });
    face(ctx, [[x1 + 0.031, y, 0.44], [x1 + 0.031, y + 0.12, 0.44], [x1 + 0.031, y + 0.12, 0.83], [x1 + 0.031, y, 0.83]], shade(INK.oxblood, 0.1), { stroke: false });
  }
  box(ctx, x0 + 0.35, y0 + 0.15, 0.77, x1 - x0 - 0.7, 0.85, 0.15, INK.bone, { lw: 0.035, top: tint(INK.bone, 0.3) });
}
function brigBedFoot(ctx) {
  const x0 = 0.52, x1 = 2.98, y = 14.98, top = 1.15;
  for (const x of [x0, x1]) box(ctx, x - 0.05, y - 0.05, 0, 0.1, 0.1, top, IRON, { flat: true, lw: 0.03 });
  rod(ctx, [[x0, y, top - 0.08], [x1, y, top - 0.08]], IRON, 0.06);
  for (const x of [x0, x1]) {
    const [X, Y] = P(x, y, top);
    ctx.beginPath(); ctx.arc(X, Y - 0.05, 0.08, 0, Math.PI * 2); paint(ctx, GOLD, { lw: 0.03 });
  }
}

// The kitbag Dr. Crane is going through, open on the bed.
function kitbag(ctx) {
  box(ctx, 1.2, 12.55, 0.8, 1.45, 0.85, 0.34, OLIVE, { lw: 0.035, dotsL: shade(OLIVE, 0.5) });
  rect(ctx, 1.32, 12.66, 1.2, 0.62, 1.141, shade(OLIVE, 0.55), { lw: 0.025 });
  // what's left in it: a shirt, some socks
  rect(ctx, 1.45, 12.78, 0.5, 0.4, 1.15, INK.bone, { lw: 0.02 });
  rect(ctx, 2.0, 12.75, 0.35, 0.3, 1.155, INK.oxblood, { lw: 0.02 });
  for (const x of [1.55, 2.3]) face(ctx, [[x, 13.401, 0.8], [x + 0.1, 13.401, 0.8], [x + 0.1, 13.401, 1.14], [x, 13.401, 1.14]], RM.trim, { stroke: false });
  flat(ctx, 'y', 13.405, (g) => words(g, '1974', 1.93, -0.96, 0.16, INK.bone));
}

function brigNightstand(ctx) {
  box(ctx, 3.05, 10.3, 0, 0.8, 0.8, 0.88, MAT.mahogany, { lw: 0.035, dotsL: MAT.mahoganyDark });
  face(ctx, [[3.12, 11.101, 0.55], [3.78, 11.101, 0.55], [3.78, 11.101, 0.8], [3.12, 11.101, 0.8]], shade(MAT.mahogany, 0.1), { lw: 0.025 });
  const [KX, KY] = P(3.45, 11.1, 0.67); dot(ctx, KX, KY, 0.04, GOLD);
  candlestick(ctx, 3.25, 10.5, 0.88, 0.3);
  // his photo of himself, 1974
  face(ctx, [[3.4, 10.62, 0.88], [3.78, 10.62, 0.88], [3.78, 10.58, 1.3], [3.4, 10.58, 1.3]], GOLD, { lw: 0.03 });
  face(ctx, [[3.45, 10.625, 0.93], [3.73, 10.625, 0.93], [3.73, 10.59, 1.25], [3.45, 10.59, 1.25]], KHAKI, { stroke: false });
  if (Q.detail) {
    const [X, Y] = P(3.59, 10.61, 1.13);
    dot(ctx, X, Y, 0.07, SKIN_B);
    ctx.beginPath(); ctx.ellipse(X, Y + 0.05, 0.08, 0.03, 0, 0, Math.PI * 2); ctx.fillStyle = INK.bone; ctx.fill();
  }
  // the pipe, still going, in its ashtray
  const [AX, AY] = P(3.62, 10.95, 0.88);
  ctx.beginPath(); ctx.ellipse(AX, AY, 0.14, 0.07, 0, 0, Math.PI * 2); paint(ctx, shade(INK.bone, 0.35), { lw: 0.025 });
  ctx.beginPath(); ctx.moveTo(AX - 0.16, AY - 0.02); ctx.quadraticCurveTo(AX - 0.02, AY + 0.04, AX + 0.05, AY - 0.06);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
  ctx.beginPath(); ctx.rect(AX + 0.02, AY - 0.16, 0.09, 0.12); paint(ctx, WALNUT, { lw: 0.02 });
}
const SKIN_B = mix(INK.bone, INK.oxblood, 0.25);

// The campaign trunk, locked. (Dr. Crane hasn't got to it yet.)
function trunk(ctx) {
  const x0 = 5.5, y0 = 12.5, w = 1.5, d = 1.0, h = 0.66;
  box(ctx, x0, y0, 0, w, d, h, MAT.oak, { lw: 0.04, dotsL: shade(MAT.oak, 0.45) });
  line3(ctx, [[x0, y0 + d, h - 0.15], [x0 + w, y0 + d, h - 0.15], [x0 + w, y0, h - 0.15]], shade(MAT.oak, 0.5), 0.03);
  // brass corners and a lock
  for (const [a, b] of [[x0, x0 + 0.14], [x0 + w - 0.14, x0 + w]]) {
    face(ctx, [[a, y0 + d, 0], [b, y0 + d, 0], [b, y0 + d, 0.14], [a, y0 + d, 0.14]], GOLD, { lw: 0.02 });
    face(ctx, [[a, y0 + d, h - 0.14], [b, y0 + d, h - 0.14], [b, y0 + d, h], [a, y0 + d, h]], GOLD, { lw: 0.02 });
  }
  face(ctx, [[x0 + w, y0 + 0.4, h - 0.28], [x0 + w, y0 + 0.6, h - 0.28], [x0 + w, y0 + 0.6, h - 0.06], [x0 + w, y0 + 0.4, h - 0.06]], GOLD, { lw: 0.02 });
  flat(ctx, 'y', y0 + d + 0.005, (g) => {
    words(g, '1974', x0 + w / 2, -0.28, 0.3, INK.bone);
    if (readable()) words(g, 'BRIG. SNORT', x0 + w / 2, -0.07, 0.1, INK.bone, true);
  });
  // his greatcoat, folded on the lid, and his swagger stick
  const coat = mix(OLIVE, INK.stormNavy, 0.25);
  box(ctx, x0 + 0.15, y0 + 0.15, h, 0.8, 0.62, 0.12, coat, { lw: 0.03, dotsL: shade(coat, 0.5) });
  if (Q.detail) for (const y of [y0 + 0.32, y0 + 0.6]) { const [X, Y] = P(x0 + 0.95, y, h + 0.07); dot(ctx, X, Y, 0.03, GOLD); }
  rod(ctx, [[x0 + 1.08, y0 + 0.2, h + 0.03], [x0 + 1.32, y0 + 0.85, h + 0.03]], WALNUT, 0.045);
}
// A flintlock on its side, so its profile faces up: walnut stock, a polished
// barrel, and a dusty cork jammed in the muzzle since 1974. Drawn at scale s
// with the breech at (ox, oy), the muzzle pointing along +x.
function pistol(ctx, ox, oy, z, s = 0.6) {
  const L = (w) => ({ lw: (w * 0.85) / s });
  flat(ctx, 'z', z, (g) => {
    g.save();
    g.translate(ox, oy); g.scale(s, s); g.translate(-6.24, -12.98);
    // stock and grip
    g.beginPath();
    g.moveTo(6.24, 12.9); g.lineTo(5.96, 12.89);
    g.quadraticCurveTo(5.8, 12.93, 5.72, 13.2);
    g.lineTo(5.8, 13.3); g.lineTo(5.93, 13.25);
    g.quadraticCurveTo(5.99, 13.08, 6.24, 13.07);
    g.closePath();
    paint(g, WALNUT, L(0.028));
    // barrel, polished
    g.beginPath(); g.rect(6.2, 12.92, 0.54, 0.13); paint(g, MAT.silver, L(0.028));
    // lock plate, the cock, the trigger guard
    g.beginPath(); g.rect(6.02, 12.94, 0.2, 0.09); paint(g, MAT.silver, L(0.022));
    g.beginPath(); g.moveTo(6.06, 12.94); g.lineTo(6.02, 12.82); g.lineTo(6.12, 12.8); g.lineTo(6.14, 12.94); paint(g, MAT.silver, L(0.022));
    g.beginPath(); g.arc(6.04, 13.1, 0.07, 0, Math.PI); g.strokeStyle = GOLD; g.lineWidth = 0.03 / s; g.stroke();
    // brass fittings
    g.beginPath(); g.rect(6.66, 12.91, 0.07, 0.15); paint(g, GOLD, L(0.022));
    g.beginPath(); g.rect(5.72, 13.17, 0.1, 0.13); paint(g, GOLD, L(0.022));
    // the cork, dusty, in the muzzle (a touch big, so it reads close up)
    g.beginPath(); g.roundRect(6.73, 12.905, 0.23, 0.16, 0.05); paint(g, MAT.oakLight, L(0.03));
    if (Q.detail) {
      dot(g, 6.8, 12.95, 0.018, shade(MAT.oakLight, 0.45));
      dot(g, 6.89, 13.0, 0.016, shade(MAT.oakLight, 0.45));
      dot(g, 6.79, 13.02, 0.014, shade(MAT.oakLight, 0.45));
      g.beginPath(); g.moveTo(6.26, 12.945); g.lineTo(6.6, 12.945); g.strokeStyle = C.white; g.lineWidth = 0.02 / s; g.stroke();
    }
    g.restore();
  });
}

function wardrobe(ctx) {
  const x0 = 0.05, y0 = 6.75, w = 1.0, d = 2.2, h = 2.85;
  box(ctx, x0, y0, 0, w, d, h, MAT.mahogany, { lw: 0.04, dotsL: MAT.mahoganyDark });
  box(ctx, x0 - 0.04, y0 - 0.05, h, w + 0.1, d + 0.12, 0.15, MAT.mahoganyDark, { flat: true, lw: 0.035 });
  const X1 = x0 + w + 0.005;
  // (the shut door is drawn on its own, wardrobeDoor(), so it can swing open)
  // the open door: inside, the same uniform three times
  face(ctx, [[X1, 6.82, 0.15], [X1, 7.9, 0.15], [X1, 7.9, 2.7], [X1, 6.82, 2.7]], shade(MAT.mahoganyDark, 0.55), { lw: 0.03 });
  flat(ctx, 'x', X1 + 0.002, (g) => {
    g.beginPath(); g.moveTo(-6.85, -2.45); g.lineTo(-7.88, -2.45); g.strokeStyle = GOLD; g.lineWidth = 0.03; g.stroke();
    for (let i = 0; i < 3; i++) {
      const a = -(7.05 + i * 0.3);
      g.beginPath();
      g.moveTo(a - 0.16, -2.32); g.lineTo(a + 0.16, -2.32); g.lineTo(a + 0.2, -1.3); g.lineTo(a - 0.2, -1.3);
      g.closePath();
      paint(g, INK.oxblood, { lw: 0.02 });
      g.beginPath(); g.moveTo(a, -2.45); g.lineTo(a, -2.32); g.strokeStyle = C.ink; g.lineWidth = 0.02; g.stroke();
      if (Q.detail) for (let k = 0; k < 3; k++) dot(g, a, -2.1 + k * 0.22, 0.025, INK.candleGold);
    }
  });
  box(ctx, x0 + w, 6.72, 0.12, 0.95, 0.06, 2.58, MAT.mahogany, { lw: 0.03 });
  face(ctx, [[x0 + w + 0.12, 6.785, 0.35], [x0 + w + 0.85, 6.785, 0.35], [x0 + w + 0.85, 6.785, 2.4], [x0 + w + 0.12, 6.785, 2.4]], mix(MAT.glass, INK.bone, 0.35), { lw: 0.025 });
  if (Q.detail) line3(ctx, [[x0 + w + 0.3, 6.79, 1.9], [x0 + w + 0.6, 6.79, 2.25]], INK.bone, 0.05);
}

// The wardrobe's other door, which swings open when you tap it: inside, his
// dress uniform, and nobody. k: 0 shut, 1 open (60 degrees).
function wardrobeDoor(ctx, k) {
  const X1 = 1.055, a = k * 1.05, hy = 8.85, w = 0.9;
  if (k > 0.01) {
    // the dark inside, and the dress uniform on its hanger
    face(ctx, [[X1, 7.95, 0.18], [X1, hy, 0.18], [X1, hy, 2.65], [X1, 7.95, 2.65]], shade(MAT.mahoganyDark, 0.6), { lw: 0.03 });
    flat(ctx, 'x', X1 + 0.002, (g) => {
      g.beginPath(); g.moveTo(-8.0, -2.45); g.lineTo(-8.8, -2.45); g.strokeStyle = GOLD; g.lineWidth = 0.03; g.stroke();
      const c = -8.4;
      g.beginPath(); g.moveTo(c - 0.2, -2.3); g.lineTo(c + 0.2, -2.3); g.lineTo(c + 0.24, -1.1); g.lineTo(c - 0.24, -1.1); g.closePath();
      paint(g, INK.stormNavy, { lw: 0.02 });
      g.fillStyle = GOLD; g.fillRect(c - 0.22, -2.3, 0.44, 0.07);
      if (Q.detail) for (let i = 0; i < 4; i++) dot(g, c, -2.1 + i * 0.22, 0.025, GOLD);
    });
  }
  // hinged at the back edge, so it swings toward you and out of the way
  const h0 = hy - w;
  const fx = X1 + w * Math.sin(a), fy = h0 + w * Math.cos(a);
  face(ctx, [[X1, h0, 0.18], [fx, fy, 0.18], [fx, fy, 2.65], [X1, h0, 2.65]], shade(MAT.mahogany, 0.08 + k * 0.1), { lw: 0.03 });
  const kx = X1 + (w - 0.07) * Math.sin(a), ky = h0 + (w - 0.07) * Math.cos(a);
  const [KX, KY] = P(kx, ky, 1.4); dot(ctx, KX, KY, 0.045, GOLD);
}

function washstand(ctx, x0, y0, w, d) {
  box(ctx, x0, y0, 0, w, d, 0.86, MAT.mahogany, { lw: 0.035, dotsL: MAT.mahoganyDark });
  box(ctx, x0 - 0.03, y0 - 0.03, 0.86, w + 0.06, d + 0.06, 0.1, MAT.marble, { lw: 0.035, dotsL: MAT.marbleVein });
}
function basinAndJug(ctx, x, y) {
  disc(ctx, x, y, 0.965, 0.3, INK.bone, { lw: 0.03 });
  disc(ctx, x, y, 0.97, 0.2, mix(INK.bone, INK.verdigris, 0.35), { stroke: false });
  const [X, Y] = P(x + 0.05, y + 0.05, 0.97);
  ctx.beginPath();
  ctx.moveTo(X - 0.1, Y); ctx.quadraticCurveTo(X - 0.18, Y - 0.25, X - 0.08, Y - 0.42);
  ctx.lineTo(X - 0.1, Y - 0.5); ctx.lineTo(X + 0.12, Y - 0.52); ctx.lineTo(X + 0.08, Y - 0.42);
  ctx.quadraticCurveTo(X + 0.18, Y - 0.25, X + 0.1, Y);
  ctx.closePath();
  paint(ctx, INK.bone, { lw: 0.03, dots: MAT.marbleVein, density: 0.15 });
  ctx.beginPath(); ctx.arc(X + 0.14, Y - 0.3, 0.09, -Math.PI / 2, Math.PI / 2);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
}
function brigWashstand(ctx) {
  washstand(ctx, 0.05, 9.2, 0.8, 1.4);
  basinAndJug(ctx, 0.45, 9.62);
  // shaving mug and brush, and a tin of moustache wax
  const [X, Y] = P(0.45, 10.2, 0.96);
  ctx.beginPath(); ctx.rect(X - 0.08, Y - 0.18, 0.16, 0.18); paint(ctx, INK.bone, { lw: 0.025 });
  ctx.beginPath(); ctx.ellipse(X, Y - 0.26, 0.07, 0.09, 0, 0, Math.PI * 2); paint(ctx, INK.bone, { lw: 0.02 });
  const [WX, WY] = P(0.45, 10.45, 0.96);
  ctx.beginPath(); ctx.ellipse(WX, WY - 0.03, 0.1, 0.05, 0, 0, Math.PI * 2); paint(ctx, INK.oxblood, { lw: 0.02 });
}

function desk(ctx) {
  const x0 = 5.0, y0 = 6.8, w = 2.3, d = 1.0, h = 1.05;
  for (const [x, y] of [[x0 + 0.08, y0 + d - 0.08], [x0 + w - 0.08, y0 + d - 0.08], [x0 + w - 0.08, y0 + 0.08]]) box(ctx, x - 0.05, y - 0.05, 0, 0.1, 0.1, h - 0.12, MAT.mahogany, { flat: true, lw: 0.03 });
  box(ctx, x0, y0, h - 0.34, w, d, 0.22, MAT.mahogany, { lw: 0.035, dotsL: MAT.mahoganyDark });
  box(ctx, x0 - 0.03, y0 - 0.03, h - 0.12, w + 0.06, d + 0.06, 0.1, MAT.mahogany, { lw: 0.035 });
  // The whole regiment's worth of kit, laid out to be polished on Sunday.
  // The campaign map, and toy soldiers still fighting 1974.
  rect(ctx, 5.12, 6.98, 0.95, 0.5, h - 0.015, KHAKI, { lw: 0.025 });
  if (Q.detail) {
    flat(ctx, 'z', h - 0.01, (g) => {
      g.beginPath();
      g.moveTo(5.2, 7.4); g.quadraticCurveTo(5.5, 7.08, 6.0, 7.2);
      g.strokeStyle = INK.stormNavy; g.lineWidth = 0.025; g.stroke();
      g.beginPath(); g.moveTo(5.3, 7.44); g.lineTo(5.9, 7.06); g.lineTo(5.83, 7.16); g.moveTo(5.9, 7.06); g.lineTo(5.78, 7.07);
      g.strokeStyle = INK.oxblood; g.lineWidth = 0.035; g.stroke();
    });
    for (let i = 0; i < 4; i++) {
      const [X, Y] = P(5.3 + i * 0.2, 7.2 + (i % 2) * 0.1, h);
      ctx.fillStyle = INK.oxblood; ctx.fillRect(X - 0.03, Y - 0.14, 0.06, 0.12);
      dot(ctx, X, Y - 0.17, 0.035, KHAKI);
    }
  }
  // an inkwell and a quill, on the corner of the map
  const [IX, IY] = P(5.22, 7.02, h);
  ctx.beginPath(); ctx.rect(IX - 0.06, IY - 0.1, 0.12, 0.1); paint(ctx, IRON, { lw: 0.02 });
  ctx.beginPath(); ctx.moveTo(IX, IY - 0.08); ctx.quadraticCurveTo(IX + 0.1, IY - 0.3, IX + 0.2, IY - 0.42);
  ctx.strokeStyle = INK.bone; ctx.lineWidth = 0.04; ctx.stroke();
  // his sabre, in its scabbard, along the back
  const sz = h + 0.04;
  rod(ctx, [[5.5, 6.93, sz], [6.72, 6.93, sz]], mix(C.black, WALNUT, 0.35), 0.08);
  rod(ctx, [[5.5, 6.93, sz], [5.62, 6.93, sz]], MAT.silver, 0.07);
  rod(ctx, [[6.6, 6.93, sz], [6.72, 6.93, sz]], MAT.silver, 0.075);
  rod(ctx, [[6.75, 6.93, sz], [6.97, 6.93, sz]], WALNUT, 0.055);
  line3(ctx, [[6.74, 6.87, sz], [6.74, 7.03, sz], [6.86, 7.07, sz], [6.99, 6.97, sz]], GOLD, 0.03);
  { const [X, Y] = P(7.0, 6.93, sz); dot(ctx, X, Y, 0.045, GOLD); }
  // a telescope, lying across the middle
  rod(ctx, [[6.15, 7.26, h + 0.06], [6.48, 7.24, h + 0.06]], GOLD, 0.11);
  rod(ctx, [[6.48, 7.24, h + 0.05], [6.72, 7.22, h + 0.05]], MAT.brassDark, 0.085);
  rod(ctx, [[6.72, 7.22, h + 0.045], [6.9, 7.21, h + 0.045]], GOLD, 0.065);
  if (Q.detail) {
    for (const x of [6.25, 6.4]) { const [a, b] = [P(x, 7.25, h + 0.02), P(x, 7.25, h + 0.1)]; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.strokeStyle = MAT.brassDark; ctx.lineWidth = 0.025; ctx.stroke(); }
    const [X, Y] = P(6.14, 7.26, h + 0.06); dot(ctx, X, Y, 0.045, mix(MAT.glass, INK.stormNavy, 0.4));
  }
  // a hip flask, standing at the back
  { const [X, Y] = P(7.13, 7.14, h);
    ctx.beginPath(); ctx.roundRect(X - 0.07, Y - 0.24, 0.14, 0.24, 0.04); paint(ctx, MAT.silver, { lw: 0.025, dots: shade(MAT.silver, 0.35), density: 0.12 });
    ctx.beginPath(); ctx.rect(X - 0.03, Y - 0.3, 0.06, 0.06); paint(ctx, GOLD, { lw: 0.02 }); }
  // the bugle, lying at the front, and his medals in their case
  flat(ctx, 'z', h + 0.01, (g) => {
    g.beginPath(); g.ellipse(5.4, 7.66, 0.2, 0.09, 0, 0, Math.PI * 2);
    g.strokeStyle = C.ink; g.lineWidth = 0.075; g.stroke(); g.strokeStyle = GOLD; g.lineWidth = 0.04; g.stroke();
    g.beginPath(); g.moveTo(5.55, 7.6); g.lineTo(5.78, 7.5); g.lineTo(5.8, 7.78); g.lineTo(5.55, 7.68); g.closePath();
    paint(g, GOLD, { lw: 0.025, dots: MAT.brassDark, density: 0.15 });
    g.beginPath(); g.moveTo(5.2, 7.62); g.lineTo(5.12, 7.6); g.strokeStyle = GOLD; g.lineWidth = 0.035; g.stroke();
  });
  rect(ctx, 5.86, 7.5, 0.48, 0.3, h, MAT.mahoganyDark, { lw: 0.025 });
  rect(ctx, 5.9, 7.54, 0.4, 0.22, h + 0.002, MAT.velvetDark, { stroke: false });
  for (let i = 0; i < 3; i++) {
    const x = 5.98 + i * 0.12;
    rect(ctx, x - 0.035, 7.56, 0.07, 0.08, h + 0.004, [INK.verdigris, INK.bone, INK.deepPlum][i], { stroke: false });
    disc(ctx, x, 7.69, h + 0.005, 0.04, GOLD, { lw: 0.015 });
  }
  // and the duelling pistol, freshly cleaned, at the front corner
  pistol(ctx, 6.85, 7.5, h + 0.005);
}
function brigChair(ctx) {
  const x0 = 5.85, y0 = 8.0, s = 0.72;
  for (const [x, y] of [[x0 + 0.06, y0 + s - 0.06], [x0 + s - 0.06, y0 + s - 0.06], [x0 + s - 0.06, y0 + 0.06]]) box(ctx, x - 0.04, y - 0.04, 0, 0.08, 0.08, 0.7, MAT.mahogany, { flat: true, stroke: false });
  box(ctx, x0, y0, 0.7, s, s, 0.1, MAT.mahogany, { lw: 0.03 });
  rect(ctx, x0 + 0.06, y0 + 0.06, s - 0.12, s - 0.12, 0.801, MAT.velvet, { lw: 0.02 });
  box(ctx, x0, y0 + s - 0.1, 0.8, s, 0.1, 0.8, MAT.mahogany, { lw: 0.03 });
  face(ctx, [[x0 + 0.1, y0 + s + 0.001, 0.95], [x0 + s - 0.1, y0 + s + 0.001, 0.95], [x0 + s - 0.1, y0 + s + 0.001, 1.48], [x0 + 0.1, y0 + s + 0.001, 1.48]], MAT.velvet, { lw: 0.02 });
}
// His dress hat, hung on the bedpost: a black bicorne with a great white plume
// he swears is ostrich (a red herring: it's the only goose-white thing in here).
function plumedHat(ctx) {
  const [X, Y] = P(2.98, 14.98, 1.17);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(1.45, 1.45);
  // the plume, curling up and over, feather by feather
  for (const [a, l, c] of [[-0.6, 0.45, shade(INK.bone, 0.06)], [-0.2, 0.58, INK.bone], [0.2, 0.5, tint(INK.bone, 0.3)], [0.55, 0.38, shade(INK.bone, 0.03)]]) {
    ctx.save();
    ctx.translate(0.02, -0.16);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.quadraticCurveTo(-0.14, -l * 0.6, 0.04, -l); ctx.quadraticCurveTo(0.16, -l * 0.55, 0, 0);
    paint(ctx, c, { lw: 0.022 });
    if (Q.detail) { ctx.beginPath(); ctx.moveTo(0.01, -0.02); ctx.quadraticCurveTo(-0.02, -l * 0.6, 0.04, -l + 0.03); ctx.strokeStyle = shade(INK.bone, 0.3); ctx.lineWidth = 0.012; ctx.stroke(); }
    ctx.restore();
  }
  // the hat: a crescent, points down, with a gold cockade
  ctx.beginPath();
  ctx.moveTo(-0.34, 0.06); ctx.quadraticCurveTo(-0.18, -0.26, 0, -0.24); ctx.quadraticCurveTo(0.18, -0.26, 0.34, 0.06);
  ctx.quadraticCurveTo(0, -0.04, -0.34, 0.06);
  paint(ctx, C.black, { lw: 0.03 });
  ctx.beginPath(); ctx.moveTo(-0.3, 0.03); ctx.quadraticCurveTo(0, -0.07, 0.3, 0.03); ctx.strokeStyle = GOLD; ctx.lineWidth = 0.025; ctx.stroke();
  dot(ctx, 0.02, -0.14, 0.06, GOLD);
  dot(ctx, 0.02, -0.14, 0.03, INK.oxblood);
  ctx.restore();
}
// His boots, lined up by the bed as if on parade.
function boots(ctx) {
  for (const x of [1.25, 1.62]) {
    const [X, Y] = P(x, 15.45, 0);
    ctx.beginPath();
    ctx.moveTo(X - 0.08, Y - 0.62); ctx.lineTo(X + 0.08, Y - 0.62); ctx.lineTo(X + 0.08, Y - 0.12);
    ctx.lineTo(X + 0.24, Y - 0.08); ctx.lineTo(X + 0.24, Y); ctx.lineTo(X - 0.09, Y);
    ctx.closePath();
    paint(ctx, C.black, { lw: 0.03 });
    if (Q.detail) dot(ctx, X - 0.02, Y - 0.5, 0.025, INK.bone);
  }
}

// The Brigadier's parrot, in the regiment's colours. It only knows one word.
function parrot(ctx, t, upset, socked) {
  const x = 2.2, y = 8.2;
  disc(ctx, x, y, 0.02, 0.3, MAT.mahoganyDark, { lw: 0.03 });
  rod(ctx, [[x, y, 0.02], [x, y, 1.8]], GOLD, 0.05);
  rod(ctx, [[x - 0.38, y, 1.8], [x + 0.38, y, 1.8]], MAT.mahogany, 0.06);
  const [CX, CY] = P(x + 0.34, y, 1.8);
  ctx.beginPath(); ctx.moveTo(CX - 0.09, CY - 0.1); ctx.lineTo(CX + 0.09, CY - 0.1); ctx.lineTo(CX + 0.06, CY); ctx.lineTo(CX - 0.06, CY); ctx.closePath();
  paint(ctx, GOLD, { lw: 0.02 });
  const [X, Y] = P(x - 0.05, y, 1.84);
  const flap = upset ? Math.sin(t * 24) : 0;
  const hop = upset ? Math.abs(Math.sin(t * 9)) * 0.1 : Math.sin(t * 2.2) * 0.015;
  ctx.save();
  ctx.translate(X, Y - hop);
  ctx.beginPath(); ctx.moveTo(-0.02, -0.14); ctx.lineTo(0.1, 0.52); ctx.lineTo(-0.04, 0.55); ctx.lineTo(-0.14, -0.1); ctx.closePath();
  paint(ctx, INK.verdigris, { lw: 0.03 });
  ctx.beginPath(); ctx.moveTo(0.02, 0.1); ctx.lineTo(0.03, 0.5); ctx.strokeStyle = INK.candleGold; ctx.lineWidth = 0.03; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -0.3, 0.17, 0.27, 0.12, 0, Math.PI * 2);
  paint(ctx, INK.oxblood, { lw: 0.035, dots: shade(INK.oxblood, 0.4), density: 0.12 });
  ctx.save();
  ctx.translate(-0.07, -0.42);
  ctx.rotate(-0.2 - Math.max(0, flap) * 1.1);
  ctx.beginPath(); ctx.ellipse(-0.02, 0.14, 0.09, 0.22, 0.25, 0, Math.PI * 2);
  paint(ctx, INK.verdigris, { lw: 0.03 });
  ctx.restore();
  ctx.beginPath(); ctx.arc(0.06, -0.63, 0.13, 0, Math.PI * 2); paint(ctx, INK.oxblood, { lw: 0.035 });
  ctx.beginPath(); ctx.ellipse(0.12, -0.62, 0.065, 0.075, 0, 0, Math.PI * 2); ctx.fillStyle = INK.bone; ctx.fill();
  dot(ctx, 0.12, -0.64, 0.024, C.ink);
  const open = upset ? 0.05 + 0.04 * Math.sin(t * 17) : 0.005;
  ctx.beginPath(); ctx.moveTo(0.17, -0.67); ctx.quadraticCurveTo(0.31, -0.66, 0.26, -0.52 - open * 0.3); ctx.lineTo(0.18, -0.58); ctx.closePath();
  paint(ctx, C.ink, { stroke: false });
  ctx.beginPath(); ctx.moveTo(0.18, -0.57 + open); ctx.lineTo(0.25, -0.53 + open); ctx.lineTo(0.18, -0.52 + open); ctx.closePath();
  paint(ctx, C.ink, { stroke: false });
  if (socked) {
    // the Brigadier's sock, pulled down over its head like a nightcap
    ctx.beginPath();
    ctx.moveTo(-0.08, -0.66); ctx.quadraticCurveTo(0.05, -0.82, 0.2, -0.7);
    ctx.lineTo(0.12, -0.9); ctx.quadraticCurveTo(-0.05, -1.05, -0.28, -0.92); ctx.lineTo(-0.3, -0.82); ctx.lineTo(-0.12, -0.84);
    ctx.closePath();
    paint(ctx, OLIVE, { lw: 0.03 });
    ctx.beginPath(); ctx.moveTo(-0.06, -0.72); ctx.lineTo(0.16, -0.76); ctx.strokeStyle = INK.oxblood; ctx.lineWidth = 0.035; ctx.stroke();
  } else {
    ctx.beginPath(); ctx.rect(-0.03, -0.83, 0.17, 0.09); paint(ctx, INK.oxblood, { lw: 0.025 });
    ctx.fillStyle = INK.candleGold; ctx.fillRect(-0.03, -0.77, 0.17, 0.025);
  }
  ctx.restore();
}

// ---------- Furniture: Dr. Crane's room ----------
function craneBedHead(ctx) {
  const x0 = 13.05, x1 = 15.45, y = 11.02, top = 1.95;
  for (const x of [x0, x1]) box(ctx, x - 0.05, y - 0.05, 0, 0.1, 0.1, top, GOLD, { flat: true, lw: 0.03 });
  const arch = [];
  for (let i = 0; i <= 12; i++) {
    const k = i / 12;
    arch.push([x0 + (x1 - x0) * k, y, top - 0.12 + Math.sin(k * Math.PI) * 0.28]);
  }
  if (Q.detail) {
    ctx.beginPath();
    for (let i = 1; i < 8; i++) {
      const x = x0 + ((x1 - x0) * i) / 8, zt = top - 0.12 + Math.sin((i / 8) * Math.PI) * 0.28;
      const a = P(x, y, 0.95), b = P(x, y, zt);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    }
    ctx.strokeStyle = shade(GOLD, 0.2); ctx.lineWidth = 0.04; ctx.stroke();
  }
  rod(ctx, arch, GOLD, 0.06);
  rod(ctx, [[x0, y, 0.95], [x1, y, 0.95]], GOLD, 0.05);
  for (const x of [x0, x1]) {
    const [X, Y] = P(x, y, top);
    ctx.beginPath(); ctx.arc(X, Y - 0.06, 0.09, 0, Math.PI * 2); paint(ctx, GOLD, { lw: 0.03 });
  }
  // his stethoscope, hung on the bedpost
  const [SX, SY] = P(x0, y, top - 0.05);
  ctx.beginPath();
  ctx.moveTo(SX - 0.08, SY + 0.02); ctx.quadraticCurveTo(SX - 0.2, SY + 0.35, SX - 0.05, SY + 0.55);
  ctx.moveTo(SX + 0.08, SY + 0.02); ctx.quadraticCurveTo(SX + 0.16, SY + 0.35, SX - 0.05, SY + 0.55);
  ctx.quadraticCurveTo(SX - 0.12, SY + 0.85, SX + 0.02, SY + 1.02);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.075; ctx.stroke();
  ctx.strokeStyle = mix(C.ink, INK.stormNavy, 0.5); ctx.lineWidth = 0.035; ctx.stroke();
  ctx.beginPath(); ctx.arc(SX + 0.03, SY + 1.08, 0.09, 0, Math.PI * 2); paint(ctx, MAT.silver, { lw: 0.03 });
  dot(ctx, SX + 0.01, SY + 1.06, 0.03, INK.bone);
}
function craneBedBody(ctx, t) {
  const x0 = 13.0, x1 = 15.5, y0 = 11.0, y1 = 15.0;
  for (const [x, y] of [[x0 + 0.06, y1 - 0.06], [x1 - 0.06, y1 - 0.06], [x1 - 0.06, y0 + 0.08]]) box(ctx, x - 0.04, y - 0.04, 0, 0.08, 0.08, 0.45, GOLD, { flat: true, stroke: false });
  box(ctx, x0, y0, 0.4, x1 - x0, y1 - y0, 0.1, shade(GOLD, 0.2), { flat: true, lw: 0.03 });
  box(ctx, x0 + 0.05, y0 + 0.05, 0.5, x1 - x0 - 0.1, y1 - y0 - 0.1, 0.27, INK.bone, { lw: 0.035 });
  const fold = 12.35;
  box(ctx, x0 - 0.03, fold, 0.44, x1 - x0 + 0.06, y1 - fold + 0.03, 0.39, MINT, { lw: 0.035, dotsL: shade(MINT, 0.45) });
  rect(ctx, x0 - 0.03, fold, x1 - x0 + 0.06, 0.24, 0.832, INK.bone, { lw: 0.03 });
  if (Q.detail) {
    // a patchwork quilt
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if ((i + j) % 2) rect(ctx, x0 + 0.02 + i * 0.62, fold + 0.3 + j * 0.6, 0.6, 0.58, 0.834, mix(MINT, INK.bone, 0.45), { stroke: false });
      }
    }
  }
  // the pillow, until the Brigadier gets to it
  if (lt(t) < 94.0) box(ctx, x0 + 0.35, y0 + 0.15, 0.77, x1 - x0 - 0.7, 0.85, 0.15, INK.bone, { lw: 0.035, top: tint(INK.bone, 0.3) });
}
function craneBedFoot(ctx) {
  const x0 = 13.05, x1 = 15.45, y = 14.98, top = 1.3;
  for (const x of [x0, x1]) box(ctx, x - 0.05, y - 0.05, 0, 0.1, 0.1, top, GOLD, { flat: true, lw: 0.03 });
  rod(ctx, [[x0, y, top - 0.1], [x1, y, top - 0.1]], GOLD, 0.06);
  rod(ctx, [[x0, y, 0.9], [x1, y, 0.9]], GOLD, 0.045);
  for (const x of [x0, x1]) {
    const [X, Y] = P(x, y, top);
    ctx.beginPath(); ctx.arc(X, Y - 0.06, 0.085, 0, Math.PI * 2); paint(ctx, GOLD, { lw: 0.03 });
  }
}

// ---------- Dr. Crane's luggage ----------
// A heap by his travelling chest: a carpet bag on the chest, a valise with a
// hatbox on it, his gladstone (pyjamas), and the medical bag, which is the
// same shape as the gladstone but black, with a little red cross on its side
// and the empty heart-pill bottle poking out of its mouth.

// A gladstone-shaped bag standing on the floor: a box body, and a roof that
// closes to a brass-framed ridge along x (or gapes open, o.open).
function gladstone(ctx, x0, y0, w, d, h, color, o = {}) {
  const x1 = x0 + w, y1 = y0 + d, yc = (y0 + y1) / 2, hb = h * 0.62, gap = o.open ? 0.07 : 0;
  box(ctx, x0, y0, 0, w, d, hb, color, { lw: 0.03, dotsL: shade(color, 0.5), dens: 0.18 });
  // the roof: the back slope, the mouth (if open), then the front slope
  face(ctx, [[x0, y0, hb], [x1, y0, hb], [x1, yc - gap, h], [x0, yc - gap, h]], shade(color, 0.05), { lw: 0.03 });
  if (o.open) face(ctx, [[x0 + 0.04, yc - gap, h], [x1 - 0.04, yc - gap, h], [x1 - 0.04, yc + gap, h], [x0 + 0.04, yc + gap, h]], mix(INK.deepPlum, C.black, 0.5), { stroke: false });
  if (o.inside) o.inside(yc);
  face(ctx, [[x0, y1, hb], [x1, y1, hb], [x1, yc + gap, h], [x0, yc + gap, h]], shade(color, 0.14), { lw: 0.03 });
  face(ctx, [[x1, y0, hb], [x1, y1, hb], [x1, yc + gap, h], [x1, yc - gap, h]], shade(color, 0.08), { lw: 0.03 });
  for (const s of o.open ? [-gap, gap] : [0]) line3(ctx, [[x0, yc + s, h], [x1, yc + s, h]], GOLD, 0.035);
  // the handle, and the clasp
  const [HX, HY] = P(x0 + w / 2, yc - gap, h);
  ctx.beginPath(); ctx.ellipse(HX, HY, 0.13, 0.1, 0, Math.PI, 0);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.065; ctx.stroke(); ctx.strokeStyle = shade(color, 0.2); ctx.lineWidth = 0.035; ctx.stroke();
  const [LX, LY] = P(x0 + w / 2, yc + gap + 0.02, h - 0.03); dot(ctx, LX, LY, 0.035, GOLD);
}

function carpetBag(ctx) {
  const x0 = 8.75, y0 = 14.85, w = 0.72, d = 0.34, z = 0.62, h = 0.4;
  box(ctx, x0, y0, z, w, d, h, MAT.velvet, { lw: 0.03, dotsL: shade(MAT.velvet, 0.5) });
  if (Q.detail) {
    flat(ctx, 'y', y0 + d + 0.004, (g) => {
      g.fillStyle = alpha(INK.candleGold, 0.7);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
        const a = x0 + 0.12 + i * 0.16 + (j % 2) * 0.08, b = -(z + 0.12 + j * 0.16);
        g.beginPath(); g.moveTo(a, b - 0.05); g.lineTo(a + 0.04, b); g.lineTo(a, b + 0.05); g.lineTo(a - 0.04, b); g.fill();
      }
    });
  }
  line3(ctx, [[x0, y0 + d / 2, z + h], [x0 + w, y0 + d / 2, z + h]], GOLD, 0.05);
  for (const x of [x0 + 0.22, x0 + 0.5]) {
    const [X, Y] = P(x, y0 + d / 2, z + h);
    ctx.beginPath(); ctx.ellipse(X, Y, 0.09, 0.14, 0, Math.PI, 0);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.06; ctx.stroke(); ctx.strokeStyle = WALNUT; ctx.lineWidth = 0.03; ctx.stroke();
  }
}

// A band round an upright cylinder (a hatbox's ribbon).
function band(ctx, cx, cy, z, r, h, color) {
  const X = cx - cy, Yb = (cx + cy) / 2 - z * ZK, Yt = Yb - h * ZK, rx = r * Math.SQRT2, ry = rx / 2;
  ctx.beginPath();
  ctx.ellipse(X, Yb, rx, ry, 0, Math.PI, 0, true);
  ctx.lineTo(X + rx, Yt);
  ctx.ellipse(X, Yt, rx, ry, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function valise(ctx) {
  const x0 = 9.95, y0 = 14.95, w = 1.05, d = 0.68, h = 0.3;
  box(ctx, x0, y0, 0, w, d, h, WALNUT, { lw: 0.035, dotsL: shade(WALNUT, 0.5) });
  line3(ctx, [[x0, y0 + d, h - 0.1], [x0 + w, y0 + d, h - 0.1], [x0 + w, y0, h - 0.1]], shade(WALNUT, 0.45), 0.025);
  for (const x of [x0 + 0.22, x0 + w - 0.3]) face(ctx, [[x, y0 + d + 0.004, 0], [x + 0.08, y0 + d + 0.004, 0], [x + 0.08, y0 + d + 0.004, h], [x, y0 + d + 0.004, h]], shade(WALNUT, 0.4), { stroke: false });
  // a hatbox on top: ribboned, and empty (his top hat is on the skeleton)
  const hx = 10.42, hy = 15.28;
  cylinder(ctx, hx, hy, h, 0.27, 0.3, INK.deepPlum, { lw: 0.03 });
  band(ctx, hx, hy, h + 0.12, 0.271, 0.05, INK.bone);
  cylinder(ctx, hx, hy, h + 0.27, 0.285, 0.06, shade(INK.deepPlum, 0.1), { lw: 0.03 });
}

// His gladstone: his pyjamas are in this one (a leg hangs out of the end).
function craneGladstone(ctx) {
  const x0 = 10.62, y0 = 13.86, w = 0.66, d = 0.4, h = 0.42;
  gladstone(ctx, x0, y0, w, d, h, MAT.furDark);
  const stripes = mix(MINT, INK.bone, 0.4);
  face(ctx, [[x0 + w + 0.004, y0 + 0.1, 0.24], [x0 + w + 0.004, y0 + 0.28, 0.24], [x0 + w + 0.004, y0 + 0.3, 0.02], [x0 + w + 0.004, y0 + 0.12, 0.02]], stripes, { lw: 0.02 });
  if (Q.detail) for (const u of [0.15, 0.22]) line3(ctx, [[x0 + w + 0.006, y0 + u, 0.23], [x0 + w + 0.006, y0 + u + 0.02, 0.03]], MINT, 0.025);
}

// The medical bag: black, open, with a red cross on a little enamel badge at
// the end, and the empty bottle of heart pills poking out of its mouth.
function doctorsBag(ctx) {
  const x0 = 10.25, y0 = 14.36, w = 0.66, d = 0.38, h = 0.4;
  gladstone(ctx, x0, y0, w, d, h, C.black, {
    open: true,
    inside: (yc) => {
      // the bottle, tipped in the mouth, cap up
      const [BX, BY] = P(x0 + 0.42, yc, h - 0.06);
      ctx.save();
      ctx.translate(BX, BY);
      ctx.rotate(0.4);
      ctx.beginPath(); ctx.roundRect(-0.065, -0.3, 0.13, 0.3, 0.03); paint(ctx, AMBER, { lw: 0.025 });
      ctx.beginPath(); ctx.rect(-0.045, -0.36, 0.09, 0.06); paint(ctx, INK.bone, { lw: 0.02 });
      ctx.beginPath(); ctx.rect(-0.055, -0.24, 0.11, 0.12); paint(ctx, INK.bone, { stroke: false });
      if (Q.detail) {
        words(ctx, 'HEART', 0, -0.2, 0.035, INK.oxblood, true);
        words(ctx, 'PILLS', 0, -0.155, 0.035, INK.oxblood, true);
      }
      ctx.restore();
      // and a thermometer
      if (Q.detail) line3(ctx, [[x0 + 0.18, yc, h - 0.04], [x0 + 0.12, yc - 0.03, h + 0.2]], INK.bone, 0.03);
    },
  });
  // the red cross, on the end facing us
  const [CX, CY] = P(x0 + w + 0.005, y0 + d / 2, 0.14);
  ctx.beginPath(); ctx.ellipse(CX, CY - 0.04, 0.07, 0.085, -0.45, 0, Math.PI * 2); paint(ctx, INK.bone, { lw: 0.02 });
  flat(ctx, 'x', x0 + w + 0.006, (g) => {
    const a = -(y0 + d / 2), b = -0.18;
    g.fillStyle = INK.oxblood;
    g.fillRect(a - 0.045, b - 0.015, 0.09, 0.03);
    g.fillRect(a - 0.015, b - 0.045, 0.03, 0.09);
  });
}

function craneNightstand(ctx, t) {
  box(ctx, 12.1, 10.35, 0, 0.8, 0.8, 0.88, MAT.mahogany, { lw: 0.035, dotsL: MAT.mahoganyDark });
  const out = 0.42 * since(t, 88.0, 0.4);
  if (out > 0.01) {
    box(ctx, 12.18, 11.15, 0.52, 0.64, out, 0.24, MAT.mahogany, { lw: 0.03 });
    rect(ctx, 12.24, 11.15, 0.52, out - 0.05, 0.761, shade(MAT.mahoganyDark, 0.5), { stroke: false });
  } else {
    face(ctx, [[12.18, 11.151, 0.52], [12.82, 11.151, 0.52], [12.82, 11.151, 0.76], [12.18, 11.151, 0.76]], shade(MAT.mahogany, 0.1), { lw: 0.025 });
  }
  const [KX, KY] = P(12.5, 11.15 + out, 0.64); dot(ctx, KX, KY, 0.04, GOLD);
  candlestick(ctx, 12.75, 10.55, 0.88, 0.3);
}
// What's on his bedside table, at its own small size: a snuff box, a pill
// box, a tin of boot polish and his pocket watch, all shut, and one tin that
// is open and empty with its plain lid off beside it (his mints).
// A small round tin, with a fine outline (cylinder() draws a thick one).
function tin(ctx, cx, cy, z, r, h, side, top) {
  const X = cx - cy, Yb = (cx + cy) / 2 - z * ZK, Yt = Yb - h * ZK, rx = r * Math.SQRT2, ry = rx / 2;
  ctx.beginPath();
  ctx.moveTo(X - rx, Yt); ctx.lineTo(X - rx, Yb);
  ctx.ellipse(X, Yb, rx, ry, 0, Math.PI, 0, true);
  ctx.lineTo(X + rx, Yt);
  ctx.closePath();
  paint(ctx, side, { lw: 0.015 });
  ctx.beginPath(); ctx.ellipse(X, Yt, rx, ry, 0, 0, Math.PI * 2);
  paint(ctx, top, { lw: 0.015 });
}
function craneTins(ctx) {
  const z = 0.88;
  // the snuff box
  box(ctx, 12.14, 10.9, z, 0.17, 0.13, 0.05, MAT.silver, { lw: 0.02, flat: true });
  if (Q.detail) { const [X, Y] = P(12.225, 10.965, z + 0.05); dot(ctx, X, Y, 0.022, MAT.brassDark); }
  // the pill box, at the back
  tin(ctx, 12.2, 10.52, z, 0.055, 0.04, shade(MAT.silver, 0.12), MAT.silver);
  { const [X, Y] = P(12.2, 10.52, z + 0.04); dot(ctx, X, Y, 0.02, GOLD); }
  // the empty tin (you can see its bottom), and its lid
  disc(ctx, 12.53, 10.79, z + 0.005, 0.09, MAT.silver, { lw: 0.015 });
  if (Q.detail) disc(ctx, 12.53, 10.79, z + 0.006, 0.065, shade(MAT.silver, 0.1), { stroke: false });
  tin(ctx, 12.43, 11.0, z, 0.09, 0.05, shade(MAT.silver, 0.12), MAT.silver);
  disc(ctx, 12.43, 11.0, z + 0.05, 0.074, shade(MAT.silver, 0.5), { stroke: false });
  disc(ctx, 12.443, 11.013, z + 0.05, 0.06, shade(MAT.silver, 0.18), { stroke: false });
  // the boot polish: a dark lid with a brass rim
  tin(ctx, 12.65, 10.97, z, 0.09, 0.045, mix(C.black, INK.stormNavy, 0.45), mix(C.black, INK.stormNavy, 0.3));
  if (Q.detail) disc(ctx, 12.65, 10.97, z + 0.046, 0.062, null, { lw: 0.012, stroke: GOLD });
  // the pocket watch, and its chain
  disc(ctx, 12.84, 11.02, z + 0.01, 0.07, GOLD, { lw: 0.02 });
  disc(ctx, 12.84, 11.02, z + 0.012, 0.05, INK.bone, { stroke: false });
  if (Q.detail) {
    line3(ctx, [[12.79, 10.96, z + 0.01], [12.72, 10.84, z], [12.82, 10.76, z]], GOLD, 0.018);
    // and three collar studs
    for (const [x, y] of [[12.24, 10.83], [12.31, 10.85], [12.28, 10.79]]) { const [X, Y] = P(x, y, z); dot(ctx, X, Y, 0.018, INK.bone); }
  }
}

// His bedside lamp, electric. The Brigadier's sock ends up on it.
function craneLamp(ctx, t) {
  const x = 12.35, y = 10.62, z = 0.88;
  disc(ctx, x, y, z + 0.02, 0.14, GOLD, { lw: 0.03 });
  rod(ctx, [[x, y, z], [x, y, z + 0.62]], GOLD, 0.035);
  const [X, Y] = P(x, y, z + 0.62);
  const on = house.lamp(t) > 0.5;
  ctx.beginPath();
  ctx.moveTo(X - 0.17, Y - 0.32); ctx.lineTo(X + 0.17, Y - 0.32); ctx.lineTo(X + 0.27, Y); ctx.lineTo(X - 0.27, Y);
  ctx.closePath();
  paint(ctx, on ? mix(INK.bone, INK.candleGold, 0.5) : shade(MINT, 0.3), { lw: 0.035 });
  if (lt(t) >= 90.6) {
    // Dr. Crane's sock, flung over the shade, its foot dangling
    ctx.beginPath();
    ctx.moveTo(X - 0.08, Y - 0.38); ctx.quadraticCurveTo(X + 0.08, Y - 0.44, X + 0.19, Y - 0.34);
    ctx.lineTo(X + 0.28, Y + 0.1); ctx.lineTo(X + 0.46, Y + 0.16); ctx.lineTo(X + 0.44, Y + 0.3); ctx.lineTo(X + 0.14, Y + 0.24);
    ctx.lineTo(X + 0.06, Y - 0.22);
    ctx.closePath();
    paint(ctx, CRANE_SOCK, { lw: 0.03 });
    ctx.fillStyle = INK.bone;
    ctx.beginPath(); ctx.moveTo(X + 0.2, Y - 0.2); ctx.lineTo(X + 0.24, Y - 0.04); ctx.lineTo(X + 0.12, Y - 0.06); ctx.lineTo(X + 0.08, Y - 0.2); ctx.fill();
  }
}
const CRANE_SOCK = mix(INK.stormNavy, INK.verdigris, 0.25);

function craneWashstand(ctx) {
  washstand(ctx, 13.3, 6.72, 1.6, 0.78);
  // a shaving mirror on a stand behind it
  rod(ctx, [[14.1, 6.9, 0.96], [14.1, 6.9, 1.3]], GOLD, 0.035);
  const [MX, MY] = P(14.1, 6.9, 1.62);
  ctx.beginPath(); ctx.ellipse(MX, MY, 0.26, 0.32, 0, 0, Math.PI * 2); paint(ctx, GOLD, { lw: 0.03 });
  ctx.beginPath(); ctx.ellipse(MX, MY, 0.2, 0.26, 0, 0, Math.PI * 2); paint(ctx, mix(MAT.glass, INK.bone, 0.3), { stroke: false });
  if (Q.detail) { ctx.beginPath(); ctx.moveTo(MX - 0.1, MY + 0.08); ctx.lineTo(MX + 0.06, MY - 0.14); ctx.strokeStyle = INK.bone; ctx.lineWidth = 0.04; ctx.stroke(); }
  basinAndJug(ctx, 13.7, 7.1);
  // tooth glass, and a folded towel
  const [GX, GY] = P(14.55, 7.0, 0.96);
  ctx.beginPath(); ctx.rect(GX - 0.07, GY - 0.2, 0.14, 0.2); paint(ctx, alpha(MAT.glass, 0.8), { lw: 0.02 });
  line3(ctx, [[14.55, 7.0, 1.0], [14.6, 6.98, 1.28]], INK.oxblood, 0.035);
  face(ctx, [[14.93, 6.9, 0.95], [14.93, 7.35, 0.95], [14.93, 7.35, 0.45], [14.93, 6.9, 0.45]], INK.bone, { lw: 0.02 });
  if (Q.detail) line3(ctx, [[14.935, 6.9, 0.55], [14.935, 7.35, 0.55]], MINT, 0.05);
}

// A glass-fronted cabinet of specimens (kept low, so it doesn't hide the
// corridor behind it), and a big jar of spare glass eyes on top: the Lord
// bought them in bulk.
const SPEC_H = 1.3;
function specimens(ctx) {
  const x0 = 8.15, y0 = 7.0, w = 0.85, d = 2.4, h = SPEC_H;
  box(ctx, x0, y0, 0, w, d, h, MAT.mahogany, { lw: 0.04, dotsL: MAT.mahoganyDark });
  box(ctx, x0 - 0.04, y0 - 0.05, h, w + 0.1, d + 0.12, 0.1, MAT.mahoganyDark, { flat: true, lw: 0.035 });
  const X1 = x0 + w + 0.005;
  face(ctx, [[X1, y0 + 0.1, 0.4], [X1, y0 + d - 0.1, 0.4], [X1, y0 + d - 0.1, h - 0.06], [X1, y0 + 0.1, h - 0.06]], mix(MAT.glass, INK.stormNavy, 0.6), { lw: 0.03 });
  const jars = [MINT, INK.bone, AMBER, mix(INK.verdigris, INK.stormNavy, 0.2), INK.oxblood];
  flat(ctx, 'x', X1 + 0.002, (g) => {
    for (const [z, row] of [[0.43, 0], [0.84, 1]]) {
      g.beginPath(); g.moveTo(-(y0 + 0.1), -z); g.lineTo(-(y0 + d - 0.1), -z);
      g.strokeStyle = MAT.mahoganyDark; g.lineWidth = 0.04; g.stroke();
      for (let i = 0; i < 4; i++) {
        const a = -(y0 + 0.4 + i * 0.52), c = jars[(i + row * 2) % jars.length];
        const hh = 0.24 + ((i + row) % 3) * 0.04;
        g.beginPath(); g.roundRect(a - 0.14, -z - hh, 0.28, hh, 0.05);
        paint(g, alpha(c, 0.85), { lw: 0.02 });
        g.beginPath(); g.rect(a - 0.1, -z - hh - 0.05, 0.2, 0.05); paint(g, GOLD, { lw: 0.015 });
        if (Q.detail && c === INK.bone) {
          for (const [ex, ey] of [[-0.05, -0.08], [0.05, -0.15]]) { dot(g, a + ex, -z + ey, 0.04, C.white); dot(g, a + ex + 0.01, -z + ey, 0.018, INK.stormNavy); }
        }
      }
    }
    g.beginPath(); g.moveTo(-(y0 + d / 2), -0.4); g.lineTo(-(y0 + d / 2), -(h - 0.06));
    g.strokeStyle = MAT.mahogany; g.lineWidth = 0.05; g.stroke();
  });
  face(ctx, [[X1, y0 + 0.1, 0.06], [X1, y0 + d / 2 - 0.03, 0.06], [X1, y0 + d / 2 - 0.03, 0.34], [X1, y0 + 0.1, 0.34]], shade(MAT.mahogany, 0.08), { lw: 0.025 });
  face(ctx, [[X1, y0 + d / 2 + 0.03, 0.06], [X1, y0 + d - 0.1, 0.06], [X1, y0 + d - 0.1, 0.34], [X1, y0 + d / 2 + 0.03, 0.34]], shade(MAT.mahogany, 0.08), { lw: 0.025 });
}
function eyeJar(ctx, t, look) {
  const [X, Y] = P(8.58, 8.2, SPEC_H + 0.1);
  ctx.beginPath(); ctx.roundRect(X - 0.3, Y - 0.62, 0.6, 0.62, 0.1);
  paint(ctx, alpha(MAT.glass, 0.6), { lw: 0.035 });
  for (let i = 0; i < 4; i++) {
    const ex = X - 0.15 + (i % 2) * 0.3 + Math.sin(t * 0.7 + i * 2) * 0.03;
    const ey = Y - 0.16 - Math.floor(i / 2) * 0.25 + Math.sin(t * 1.1 + i) * 0.04;
    dot(ctx, ex, ey, 0.1, C.white);
    const lx = look != null ? look : Math.sin(t * 0.4 + i * 1.7);
    dot(ctx, ex + lx * 0.045, ey + 0.01, 0.048, INK.verdigris);
    dot(ctx, ex + lx * 0.05, ey + 0.01, 0.022, C.ink);
  }
  ctx.beginPath(); ctx.ellipse(X, Y - 0.64, 0.28, 0.08, 0, 0, Math.PI * 2); paint(ctx, GOLD, { lw: 0.03 });
  if (Q.detail) {
    ctx.beginPath(); ctx.rect(X - 0.18, Y - 0.44, 0.36, 0.16); paint(ctx, INK.bone, { lw: 0.02 });
    words(ctx, 'SPARE EYES', X, Y - 0.36, 0.06, INK.oxblood, true);
    ctx.beginPath(); ctx.moveTo(X + 0.2, Y - 0.55); ctx.lineTo(X + 0.2, Y - 0.1); ctx.strokeStyle = alpha(INK.bone, 0.6); ctx.lineWidth = 0.04; ctx.stroke();
  }
}

// A side table with a tonic on the boil: a spirit lamp, a flask, a rack of tubes.
function tonicTable(ctx) {
  const x0 = 8.35, y0 = 10.3, w = 1.0, d = 1.0, h = 0.95;
  for (const [x, y] of [[x0 + 0.08, y0 + d - 0.08], [x0 + w - 0.08, y0 + d - 0.08], [x0 + w - 0.08, y0 + 0.08]]) box(ctx, x - 0.04, y - 0.04, 0, 0.08, 0.08, h - 0.08, MAT.mahogany, { flat: true, lw: 0.03 });
  box(ctx, x0, y0, h - 0.08, w, d, 0.08, MAT.mahogany, { lw: 0.035 });
  // a rack of test tubes
  box(ctx, x0 + 0.12, y0 + 0.62, h, 0.5, 0.18, 0.1, MAT.oak, { flat: true, lw: 0.02 });
  for (let i = 0; i < 4; i++) {
    const [X, Y] = P(x0 + 0.2 + i * 0.12, y0 + 0.71, h + 0.1);
    ctx.beginPath(); ctx.roundRect(X - 0.035, Y - 0.3, 0.07, 0.34, 0.03);
    paint(ctx, [MINT, INK.oxblood, INK.candleGold, INK.verdigris][i], { lw: 0.02 });
  }
}
function tonic(ctx, t) {
  const x = 8.95, y = 10.62, h = 0.95;
  const [X, Y] = P(x, y, h);
  // tripod and spirit lamp
  ctx.beginPath(); ctx.moveTo(X - 0.18, Y); ctx.lineTo(X - 0.12, Y - 0.34); ctx.moveTo(X + 0.18, Y); ctx.lineTo(X + 0.12, Y - 0.34);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.035; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(X, Y - 0.05, 0.1, 0.06, 0, 0, Math.PI * 2); ctx.rect(X - 0.1, Y - 0.14, 0.2, 0.09); paint(ctx, alpha(MAT.glass, 0.9), { lw: 0.025 });
  // the flask: a round belly and a neck, bubbling green
  ctx.beginPath();
  ctx.moveTo(X - 0.05, Y - 0.82); ctx.lineTo(X - 0.05, Y - 0.6);
  ctx.arc(X, Y - 0.46, 0.2, -Math.PI / 2 - 0.25, Math.PI * 1.5 + 0.25, true);
  ctx.lineTo(X + 0.05, Y - 0.82);
  ctx.closePath();
  paint(ctx, alpha(MAT.glass, 0.55), { lw: 0.03 });
  ctx.beginPath(); ctx.arc(X, Y - 0.46, 0.17, 0.15, Math.PI - 0.15); ctx.closePath();
  paint(ctx, INK.verdigris, { stroke: false });
  if (Q.detail) {
    for (let i = 0; i < 4; i++) {
      const k = ((t * 0.9 + i * 0.27) % 1);
      dot(ctx, X - 0.08 + i * 0.05, Y - 0.38 - k * 0.3, 0.025 + k * 0.012, alpha(INK.bone, 0.85 * (1 - k)));
    }
    for (let i = 0; i < 3; i++) {
      const k = ((t * 0.35 + i / 3) % 1);
      dot(ctx, X + Math.sin(t * 1.3 + i * 2) * 0.08 * k, Y - 0.9 - k * 0.7, 0.06 + k * 0.1, alpha(INK.bone, 0.35 * (1 - k)));
    }
  }
  ctx.beginPath(); ctx.rect(X + 0.12, Y - 0.52, 0.22, 0.14); paint(ctx, INK.bone, { lw: 0.02 });
  if (Q.detail) words(ctx, 'TONIC', X + 0.23, Y - 0.45, 0.06, INK.oxblood, true);
}

// The skeleton model, used as a hat stand: top hat, scarf, umbrella.
function skeleton(ctx, t, look, gloved, chatter) {
  const x = 15.25, y = 8.7;
  disc(ctx, x, y, 0.02, 0.32, IRON, { lw: 0.03 });
  rod(ctx, [[x, y, 0.02], [x, y, 1.05]], IRON, 0.05);
  const [X, Y] = P(x, y, 1.05);
  const B = INK.bone;
  const bone = (pts, w = 0.07) => {
    ctx.beginPath();
    pts.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)));
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = w + 0.05; ctx.stroke(); }
    ctx.strokeStyle = B; ctx.lineWidth = w; ctx.stroke();
  };
  ctx.save();
  ctx.translate(X, Y);
  ctx.rotate(Math.sin(t * 0.9) * 0.03);
  // legs, dangling
  bone([[-0.1, 0.02], [-0.13, 0.55], [-0.12, 1.08], [-0.02, 1.1]]);
  bone([[0.1, 0.02], [0.13, 0.55], [0.14, 1.08], [0.24, 1.1]]);
  // pelvis
  ctx.beginPath(); ctx.moveTo(-0.2, -0.1); ctx.quadraticCurveTo(0, 0.2, 0.2, -0.1); ctx.quadraticCurveTo(0, -0.02, -0.2, -0.1);
  paint(ctx, B, { lw: 0.03 });
  // spine and ribs
  bone([[0, -0.05], [0, -0.95]], 0.06);
  if (Q.detail) {
    for (let i = 0; i < 4; i++) {
      const yy = -0.5 - i * 0.12, ww = 0.2 - Math.abs(i - 1.5) * 0.02;
      ctx.beginPath(); ctx.ellipse(0, yy, ww, 0.06, 0, 0, Math.PI);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.07; ctx.stroke(); ctx.strokeStyle = B; ctx.lineWidth = 0.035; ctx.stroke();
    }
  } else {
    ctx.beginPath(); ctx.ellipse(0, -0.68, 0.2, 0.22, 0, 0, Math.PI * 2); paint(ctx, B, { lw: 0.03 });
  }
  bone([[-0.26, -0.93], [0.26, -0.93]], 0.05);
  // arms: the left hangs with the umbrella, the right waves (in a glove, later)
  bone([[-0.26, -0.93], [-0.3, -0.5], [-0.3, -0.1]]);
  const wave = Math.sin(t * 1.4) * 0.15;
  const hx = 0.46, hy = -0.62 + wave * 0.3;
  bone([[0.26, -0.93], [0.38, -0.62], [hx, hy - 0.28]]);
  if (gloved) {
    ctx.beginPath(); ctx.ellipse(hx, hy - 0.36, 0.1, 0.12, 0.2, 0, Math.PI * 2); paint(ctx, mix(INK.bone, INK.candleGold, 0.25), { lw: 0.03 });
    for (let i = 0; i < 4; i++) bone([[hx - 0.06 + i * 0.04, hy - 0.44], [hx - 0.09 + i * 0.05, hy - 0.58]], 0.035);
  } else if (Q.detail) {
    for (let i = 0; i < 3; i++) bone([[hx, hy - 0.3], [hx - 0.04 + i * 0.04, hy - 0.42]], 0.02);
  }
  // the umbrella, hooked on the left wrist
  ctx.beginPath(); ctx.moveTo(-0.3, -0.12); ctx.lineTo(-0.34, 0.95); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-0.44, 0.1); ctx.quadraticCurveTo(-0.36, 0.5, -0.34, 0.9); ctx.quadraticCurveTo(-0.26, 0.5, -0.22, 0.1); ctx.closePath();
  paint(ctx, C.black, { lw: 0.025 });
  // the scarf
  ctx.beginPath(); ctx.moveTo(-0.16, -1.02); ctx.lineTo(0.16, -1.02); ctx.lineTo(0.14, -0.9); ctx.lineTo(-0.14, -0.9); ctx.closePath();
  paint(ctx, MINT, { lw: 0.025 });
  ctx.beginPath(); ctx.moveTo(0.06, -0.94); ctx.lineTo(0.14, -0.5); ctx.lineTo(0.02, -0.5); ctx.lineTo(-0.02, -0.92); ctx.closePath();
  paint(ctx, MINT, { lw: 0.025 });
  if (Q.detail) { ctx.fillStyle = INK.bone; ctx.fillRect(0.03, -0.66, 0.1, 0.04); ctx.fillRect(0.01, -0.76, 0.1, 0.04); }
  // skull
  const sx = look * 0.05;
  ctx.beginPath(); ctx.arc(sx, -1.2, 0.18, 0, Math.PI * 2); paint(ctx, B, { lw: 0.035 });
  for (const ex of [-0.07, 0.07]) dot(ctx, sx + ex + look * 0.03, -1.22, 0.05, C.ink);
  ctx.beginPath(); ctx.moveTo(sx + look * 0.03, -1.17); ctx.lineTo(sx - 0.02 + look * 0.03, -1.12); ctx.lineTo(sx + 0.02 + look * 0.03, -1.12); ctx.fillStyle = C.ink; ctx.fill();
  const jaw = chatter ? 0.03 + 0.04 * Math.abs(Math.sin(t * 40)) : 0;
  ctx.beginPath(); ctx.roundRect(sx - 0.1, -1.07 + jaw, 0.2, 0.08, 0.03); paint(ctx, B, { lw: 0.03 });
  if (Q.detail) { ctx.beginPath(); for (let i = -2; i <= 2; i++) { ctx.moveTo(sx + i * 0.035, -1.07 + jaw); ctx.lineTo(sx + i * 0.035, -1.02 + jaw); } ctx.strokeStyle = C.ink; ctx.lineWidth = 0.015; ctx.stroke(); }
  // Dr. Crane's top hat
  ctx.beginPath(); ctx.ellipse(sx, -1.33, 0.25, 0.06, 0, 0, Math.PI * 2); paint(ctx, C.black, { lw: 0.03 });
  ctx.beginPath(); ctx.rect(sx - 0.15, -1.68, 0.3, 0.35); paint(ctx, C.black, { lw: 0.03 });
  ctx.fillStyle = MINT; ctx.fillRect(sx - 0.15, -1.42, 0.3, 0.05);
  ctx.restore();
}

// The cat on Dr. Crane's bed: asleep, pleased to see him, less so the Brigadier.
function cat(ctx, t, mood) {
  const [X, Y] = P(14.55, 13.75, 0.84);
  ctx.save();
  ctx.translate(X, Y);
  if (mood === 'hiss') {
    // back arched, tail up, facing the Brigadier (to its left)
    const puff = 1 + Math.sin(t * 30) * 0.03;
    ctx.beginPath();
    for (const lx of [-0.24, -0.12, 0.14, 0.26]) { ctx.moveTo(lx, 0); ctx.lineTo(lx, -0.2); }
    ctx.strokeStyle = CAT; ctx.lineWidth = 0.07; ctx.lineCap = 'round'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0.3, -0.25); ctx.quadraticCurveTo(0.5, -0.6, 0.38, -0.8);
    ctx.strokeStyle = CAT; ctx.lineWidth = 0.08; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-0.3, -0.18);
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI + (i / 10) * Math.PI;
      const r = (i % 2 ? 0.34 : 0.4) * puff;
      ctx.lineTo(Math.cos(a) * r * 0.95, -0.2 + Math.sin(a) * r * 0.9);
    }
    ctx.closePath();
    paint(ctx, CAT, { lw: 0.03 });
    ctx.beginPath(); ctx.arc(-0.36, -0.38, 0.15, 0, Math.PI * 2); paint(ctx, CAT, { lw: 0.03 });
    ctx.beginPath(); ctx.moveTo(-0.46, -0.46); ctx.lineTo(-0.47, -0.62); ctx.lineTo(-0.36, -0.52); ctx.lineTo(-0.3, -0.62); ctx.lineTo(-0.26, -0.47); ctx.fillStyle = CAT; ctx.fill();
    ctx.beginPath(); ctx.ellipse(-0.43, -0.32, 0.05, 0.04, 0, 0, Math.PI * 2); ctx.fillStyle = INK.oxblood; ctx.fill();
    dot(ctx, -0.4, -0.42, 0.03, INK.candleGold);
    dot(ctx, -0.31, -0.42, 0.03, INK.candleGold);
  } else {
    const breathe = 1 + Math.sin(t * 1.6) * 0.025;
    ctx.beginPath(); ctx.ellipse(0, -0.14, 0.34 * breathe, 0.19 * breathe, 0, 0, Math.PI * 2); paint(ctx, CAT, { lw: 0.03 });
    const flick = Math.sin(t * 3) > 0.7 ? 0.08 : 0;
    ctx.beginPath(); ctx.moveTo(0.3, -0.08); ctx.quadraticCurveTo(0.3, 0.1, 0.02 - flick, 0.06 + flick * 0.5);
    ctx.strokeStyle = CAT; ctx.lineWidth = 0.08; ctx.lineCap = 'round'; ctx.stroke();
    const up = mood === 'purr' ? -0.08 : 0;
    ctx.beginPath(); ctx.arc(-0.26, -0.2 + up, 0.14, 0, Math.PI * 2); paint(ctx, CAT, { lw: 0.03 });
    ctx.beginPath(); ctx.moveTo(-0.36, -0.28 + up); ctx.lineTo(-0.38, -0.42 + up); ctx.lineTo(-0.28, -0.33 + up); ctx.lineTo(-0.2, -0.43 + up); ctx.lineTo(-0.16, -0.3 + up); ctx.fillStyle = CAT; ctx.fill();
    if (mood === 'purr') { dot(ctx, -0.3, -0.26, 0.028, INK.candleGold); dot(ctx, -0.21, -0.26, 0.028, INK.candleGold); }
    else if (Q.detail) { ctx.beginPath(); ctx.moveTo(-0.34, -0.2); ctx.lineTo(-0.28, -0.19); ctx.moveTo(-0.24, -0.19); ctx.lineTo(-0.18, -0.2); ctx.strokeStyle = INK.candleGold; ctx.lineWidth = 0.02; ctx.stroke(); }
  }
  ctx.restore();
}

// Dr. Crane's travelling chest.
function craneChest(ctx) {
  const x0 = 8.4, y0 = 14.6, w = 1.45, d = 0.9, h = 0.62;
  box(ctx, x0, y0, 0, w, d, h, mix(C.black, INK.stormNavy, 0.35), { lw: 0.04, dotsL: C.ink });
  line3(ctx, [[x0, y0 + d, h - 0.14], [x0 + w, y0 + d, h - 0.14], [x0 + w, y0, h - 0.14]], shade(INK.stormNavy, 0.3), 0.03);
  for (const x of [x0 + 0.25, x0 + w - 0.35]) face(ctx, [[x, y0 + d + 0.004, 0], [x + 0.1, y0 + d + 0.004, 0], [x + 0.1, y0 + d + 0.004, h], [x, y0 + d + 0.004, h]], GOLD, { stroke: false });
  flat(ctx, 'y', y0 + d + 0.006, (g) => words(g, 'DR. M. CRANE', x0 + w / 2, -0.26, 0.11, INK.bone, true));
}

// ---------- Things that get thrown ----------
// Something thrown over a searcher's shoulder at t0: it flies from `from` to
// `to` in a hop, spinning, then lies where it landed until the evening loops.
// o: { t0, from, to, dur, hop, spin, fly(ctx, X, Y, angle), rest(ctx, t, age),
//      floor (lies flat: drawn with the rugs), depth (for resting on furniture) }
function toss(R, o) {
  const dur = o.dur ?? 0.7, hop = o.hop ?? 1.1;
  const [x0, y0, z0] = o.from, [x1, y1, z1] = o.to;
  R.mover((t) => {
    const s = lt(t) - o.t0, k = s / dur;
    if (s < 0 || k >= 1) return { x: x1, y: y1, off: true };
    return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k, z: z0 + (z1 - z0) * k + Math.sin(k * Math.PI) * hop, k };
  }, (ctx, t, p) => {
    if (p.off) return;
    const [X, Y] = P(p.x, p.y, p.z);
    o.fly(ctx, X, Y, p.k * (o.spin ?? 7));
  }, { bias: 0.4 });
  if (!o.rest) return;
  const age = (t) => lt(t) - o.t0 - dur;
  const draw = (ctx, t) => { if (age(t) >= 0) o.rest(ctx, t, age(t)); };
  if (o.floor) R.rug(draw, { anim: true });
  else R.thing(x1, y1, draw, { anim: true, depth: o.depth });
}

const spun = (ctx, X, Y, a, fn) => {
  ctx.save();
  ctx.translate(X, Y);
  ctx.rotate(a);
  fn(ctx);
  ctx.restore();
};
function sockShape(ctx, color, stripe) {
  ctx.beginPath();
  ctx.moveTo(-0.07, -0.22); ctx.lineTo(0.07, -0.22); ctx.lineTo(0.07, 0.04); ctx.lineTo(0.2, 0.08); ctx.lineTo(0.18, 0.18); ctx.lineTo(-0.07, 0.12);
  ctx.closePath();
  paint(ctx, color, { lw: 0.03 });
  if (stripe) { ctx.fillStyle = stripe; ctx.fillRect(-0.07, -0.16, 0.14, 0.04); }
}
function paperShape(ctx, color = INK.bone) {
  ctx.beginPath(); ctx.rect(-0.16, -0.12, 0.32, 0.24); paint(ctx, color, { lw: 0.025 });
  if (Q.detail) { ctx.beginPath(); for (let i = 0; i < 3; i++) { ctx.moveTo(-0.1, -0.06 + i * 0.06); ctx.lineTo(0.1, -0.06 + i * 0.06); } ctx.strokeStyle = alpha(C.ink, 0.5); ctx.lineWidth = 0.015; ctx.stroke(); }
}
function helmetShape(ctx) {
  ctx.beginPath(); ctx.ellipse(0, 0, 0.34, 0.12, 0, 0, Math.PI * 2); paint(ctx, shade(KHAKI, 0.15), { lw: 0.03 });
  ctx.beginPath(); ctx.ellipse(0, -0.02, 0.22, 0.24, 0, Math.PI, 0); ctx.closePath(); paint(ctx, KHAKI, { lw: 0.03, dots: shade(KHAKI, 0.3), density: 0.12 });
  ctx.fillStyle = INK.oxblood; ctx.fillRect(-0.22, -0.09, 0.44, 0.06);
  dot(ctx, 0, -0.27, 0.035, GOLD);
}
function teddyShape(ctx) {
  const fur = MAT.fur;
  ctx.beginPath(); ctx.ellipse(0, -0.14, 0.13, 0.15, 0, 0, Math.PI * 2); paint(ctx, fur, { lw: 0.025 });
  for (const ex of [-0.13, 0.13]) { ctx.beginPath(); ctx.arc(ex, -0.04, 0.05, 0, Math.PI * 2); paint(ctx, fur, { lw: 0.02 }); }
  ctx.beginPath(); ctx.arc(0, -0.36, 0.11, 0, Math.PI * 2); paint(ctx, fur, { lw: 0.025 });
  for (const ex of [-0.08, 0.08]) { ctx.beginPath(); ctx.arc(ex, -0.46, 0.04, 0, Math.PI * 2); paint(ctx, fur, { lw: 0.02 }); }
  dot(ctx, -0.04, -0.37, 0.018, C.ink); dot(ctx, 0.04, -0.37, 0.018, C.ink);
  ctx.beginPath(); ctx.ellipse(0, -0.44, 0.11, 0.05, 0, Math.PI, 0); ctx.closePath(); paint(ctx, OLIVE, { lw: 0.02 });
}

// ---------- The area ----------
export default {
  id: 'guest-rooms',
  name: 'Guest Rooms',
  blurb: "Dr. Crane and the Brigadier are each searching the other's luggage. When they pass in the corridor, they both start whistling.",

  build(R) {
    const [OX, OY, OZ] = R.origin;
    const walker = (id) => R.walkers.find((w) => w.id === id);
    const craneW = walker('crane'), brigW = walker('brigadier');
    // Where someone is in this area right now (its own units), or null.
    const spot = (w, t) => {
      if (!w) return null;
      const p = w.at(t);
      const x = p.x - OX, y = p.y - OY, z = (p.z || 0) - OZ;
      return x >= 0 && x < 16 && y >= 0 && y < 16 && z > -0.3 && z < 3 ? { ...p, x, y, z } : null;
    };
    const crane = (t) => spot(craneW, t), brig = (t) => spot(brigW, t);
    const inBrigRoom = (p) => !!p && p.x < 7.9 && p.y > 6.6;
    const inCraneRoom = (p) => !!p && p.x > 8.1 && p.y > 6.6;
    const inHall = (p) => !!p && p.y <= 6.4;

    // ---------- Floor, walls and what's on them ----------
    R.floor((ctx) => {
      slab(ctx, RM.floor);
      planks(ctx, RM.floor, 0.8);
      stairwell(ctx);
    });
    R.walls({
      left: tint(RM.wall, 0.06), right: shade(RM.wall, 0.04), cap: INK.bone, cut: INK.stormNavy,
      dotsL: shade(RM.wall, 0.25), densL: 0.1, dotsR: shade(RM.wall, 0.3), densR: 0.12,
      doors: DOORLIST,
    });
    papering(R);

    // The landing window, over the stairs: the storm, the rain running down it.
    stormWindow(R, 'right', 4.3, 2.0, 3.4, 2.7);
    drapes(R, 'right', 4.05, 2.0, 3.9, 2.7, MAT.velvetDark);
    R.decor((ctx, t) => {
      if (!Q.detail) return;
      ctx.save();
      poly(ctx, [[4.3, 0, 2.0], [7.7, 0, 2.0], [7.7, 0, 4.7], [4.3, 0, 4.7]]);
      ctx.clip();
      ctx.beginPath();
      for (let i = 0; i < 9; i++) {
        const u = 4.45 + ((i * 1.37) % 3.1);
        const k = (t * (0.5 + hash(i, 3) * 0.4) + hash(i, 7)) % 1;
        const z = 4.8 - k * 3.0;
        const [ax, ay] = P(u, 0, z), [bx, by] = P(u - 0.02, 0, z - 0.3);
        ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
      }
      ctx.strokeStyle = alpha(INK.bone, 0.45);
      ctx.lineWidth = 0.04;
      ctx.stroke();
      ctx.restore();
    }, { anim: true });
    // The sill
    R.decor((ctx) => { box(ctx, 4.1, 0, 1.78, 3.8, 0.16, 0.08, MAT.mahogany, { flat: true, lw: 0.03 }); });

    // Sconces: electric, so they go out with the rest of the house. Their glow
    // is part of the wall (a halo on the paper), so when the walls are cut down
    // in the overview it goes with them, instead of hanging in the next room.
    const sconce = (side, u, z) => {
      const f = side === 'left' ? onLeft : onRight;
      const at = side === 'left' ? [0.34, u, z] : [u, 0.34, z];
      R.decor((ctx, t) => {
        glow(ctx, at[0], at[1], z + 0.1, 2.4, INK.candleGold, 0.85 * house.lamp(t));
        f(ctx, u - 0.1, z - 0.42, 0.2, 0.5, GOLD, { lw: 0.03 });
        const base = side === 'left' ? [0.02, u, z - 0.2] : [u, 0.02, z - 0.2];
        rod(ctx, [base, [at[0], at[1], z - 0.2], [at[0], at[1], z - 0.05]], GOLD, 0.035);
        const [X, Y] = P(...at);
        const on = house.lamp(t) > 0.5;
        ctx.beginPath();
        ctx.moveTo(X - 0.15, Y - 0.24); ctx.quadraticCurveTo(X - 0.16, Y + 0.02, X, Y + 0.02); ctx.quadraticCurveTo(X + 0.16, Y + 0.02, X + 0.15, Y - 0.24);
        ctx.closePath();
        paint(ctx, on ? tint(INK.candleGold, 0.45) : mix(INK.candleGold, INK.stormNavy, 0.55), { lw: 0.03 });
      }, { anim: true });
    };
    sconce('right', 2.6, 3.3);
    sconce('right', 11.7, 3.3);
    sconce('left', 10.8, 3.3);

    // Great-Aunt Goose, in oils (the family has always had a goose problem).
    // She gets the monocle once the case is solved.
    painting(R, 'right', 9.0, 2.35, 1.5, 1.8, mix(INK.deepPlum, INK.stormNavy, 0.35), (ctx) => {
      flat(ctx, 'y', 0.004, (g) => {
        g.save();
        g.beginPath(); g.rect(9.0, -4.15, 1.5, 1.8); g.clip();
        // a velvet shawl, the body, and a long neck up to a proud profile
        g.beginPath(); g.ellipse(9.95, -2.35, 0.7, 0.42, 0, Math.PI, 0); g.closePath();
        paint(g, MAT.velvetDark, { lw: 0.03 });
        g.beginPath(); g.ellipse(9.98, -2.62, 0.44, 0.26, -0.15, 0, Math.PI * 2);
        paint(g, C.white, { lw: 0.03, dots: C.greyLight, density: 0.12 });
        g.beginPath(); g.moveTo(9.8, -2.72); g.quadraticCurveTo(10.02, -3.2, 9.7, -3.55);
        g.lineCap = 'round';
        g.strokeStyle = C.ink; g.lineWidth = 0.27; g.stroke();
        g.strokeStyle = C.white; g.lineWidth = 0.19; g.stroke();
        g.beginPath(); g.arc(9.66, -3.66, 0.18, 0, Math.PI * 2); paint(g, C.white, { lw: 0.03 });
        g.beginPath(); g.moveTo(9.52, -3.73); g.lineTo(9.22, -3.64); g.lineTo(9.52, -3.56); g.closePath(); paint(g, C.coral, { lw: 0.025 });
        // her eye: beady, and fixed on the stairs (the portrait whose eyes
        // follow you is the Lord's, down in the hall)
        g.beginPath(); g.arc(9.64, -3.71, 0.065, 0, Math.PI * 2); paint(g, INK.bone, { lw: 0.02 });
        dot(g, 9.61, -3.7, 0.032, C.ink);
        // a lace cap and a string of pearls
        g.beginPath(); g.ellipse(9.72, -3.83, 0.17, 0.08, 0.35, Math.PI, 0); g.closePath(); paint(g, INK.bone, { lw: 0.02 });
        g.fillStyle = INK.bone;
        for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(9.74 + i * 0.07, -3.2 + Math.sin((i / 4) * Math.PI) * 0.06, 0.024, 0, Math.PI * 2); g.fill(); }
        // and, once the case is solved, the family monocle
        if (isSolved()) {
          g.beginPath(); g.arc(9.64, -3.71, 0.1, 0, Math.PI * 2); g.strokeStyle = INK.candleGold; g.lineWidth = 0.03; g.stroke();
          g.beginPath(); g.moveTo(9.73, -3.66); g.quadraticCurveTo(9.9, -3.4, 9.86, -3.1); g.lineWidth = 0.015; g.stroke();
        }
        g.restore();
      });
    }, { anim: true });
    R.decor((ctx) => {
      onRight(ctx, 9.35, 1.92, 0.8, 0.2, GOLD, { lw: 0.025, dots: MAT.brassDark, density: 0.2 });
      if (Q.detail) flat(ctx, 'y', 0.004, (g) => words(g, 'GREAT-AUNT GOOSE', 9.75, -2.02, 0.07, INK.stormNavy, true));
    });

    // Plaques over the two doors.
    R.decor((ctx) => {
      onLeft(ctx, 3.55, 4.05, 1.9, 0.5, GOLD, { lw: 0.03, dots: MAT.brassDark, density: 0.2 });
      onRight(ctx, 12.55, 4.05, 1.9, 0.5, GOLD, { lw: 0.03, dots: MAT.brassDark, density: 0.2 });
      flat(ctx, 'x', 0.004, (g) => {
        words(g, 'TAXIDERMY', -4.5, -4.37, 0.2, INK.stormNavy);
        if (Q.detail) words(g, 'KNOCK AND BE STUFFED', -4.5, -4.17, 0.085, INK.stormNavy, true);
      });
      flat(ctx, 'y', 0.004, (g) => {
        words(g, 'HIS LORDSHIP', 13.5, -4.37, 0.18, INK.stormNavy);
        if (Q.detail) words(g, 'DO NOT DISTURB', 13.5, -4.17, 0.09, INK.stormNavy, true);
      });
    });

    // The Brigadier's wall: the regiment in 1974, all with the same moustache,
    // a mirror, crossed sabres, and a calendar he never turned over.
    R.decor((ctx) => {
      onLeft(ctx, 11.6, 1.95, 2.9, 1.35, GOLD, { lw: 0.03, dots: MAT.brassDark, density: 0.2 });
      onLeft(ctx, 11.72, 2.07, 2.66, 1.11, KHAKI, { stroke: false, dots: shade(KHAKI, 0.3), density: 0.15 });
      flat(ctx, 'x', 0.004, (g) => {
        for (let i = 0; i < 5; i++) {
          const a = -(12.0 + i * 0.52), b = -2.84 + (i % 2) * 0.04;
          g.beginPath(); g.moveTo(a - 0.2, -2.26); g.lineTo(a - 0.18, b + 0.2); g.lineTo(a + 0.18, b + 0.2); g.lineTo(a + 0.2, -2.26); g.closePath();
          paint(g, INK.oxblood, { lw: 0.015 });
          dot(g, a - 0.06, b + 0.3, 0.025, INK.candleGold); dot(g, a + 0.06, b + 0.3, 0.025, INK.candleGold);
          g.beginPath(); g.arc(a, b, 0.14, 0, Math.PI * 2); paint(g, SKIN_B, { lw: 0.015 });
          dot(g, a - 0.05, b - 0.03, 0.018, C.ink); dot(g, a + 0.05, b - 0.03, 0.018, C.ink);
          // the moustache: the same one, five times
          g.beginPath();
          g.moveTo(a, b + 0.03); g.quadraticCurveTo(a - 0.12, b + 0.0, a - 0.2, b + 0.08); g.quadraticCurveTo(a - 0.1, b + 0.1, a, b + 0.06);
          g.quadraticCurveTo(a + 0.1, b + 0.1, a + 0.2, b + 0.08); g.quadraticCurveTo(a + 0.12, b + 0.0, a, b + 0.03);
          paint(g, INK.bone, { lw: 0.012 });
        }
      });
      onLeft(ctx, 12.75, 2.1, 0.62, 0.2, INK.bone, { lw: 0.02 });
      flat(ctx, 'x', 0.006, (g) => words(g, '1974', -13.06, -2.2, 0.15, INK.stormNavy));
      // the mirror over the washstand
      flat(ctx, 'x', 0.004, (g) => {
        g.beginPath(); g.ellipse(-9.9, -2.05, 0.42, 0.55, 0, 0, Math.PI * 2); paint(g, GOLD, { lw: 0.03 });
        g.beginPath(); g.ellipse(-9.9, -2.05, 0.34, 0.47, 0, 0, Math.PI * 2); paint(g, mix(MAT.glass, INK.bone, 0.25), { stroke: false });
        g.beginPath(); g.moveTo(-10.05, -1.85); g.lineTo(-9.8, -2.3); g.strokeStyle = INK.bone; g.lineWidth = 0.05; g.stroke();
        // crossed sabres above it
        g.beginPath(); g.moveTo(-10.5, -2.75); g.lineTo(-9.3, -3.7); g.moveTo(-9.3, -2.75); g.lineTo(-10.5, -3.7);
        g.lineCap = 'round'; g.strokeStyle = C.ink; g.lineWidth = 0.1; g.stroke(); g.strokeStyle = MAT.silver; g.lineWidth = 0.055; g.stroke();
        g.beginPath(); g.moveTo(-10.4, -2.95); g.lineTo(-10.28, -2.7); g.moveTo(-9.4, -2.95); g.lineTo(-9.52, -2.7);
        g.strokeStyle = GOLD; g.lineWidth = 0.08; g.stroke();
      });
      // the calendar
      onLeft(ctx, 15.0, 1.95, 0.75, 1.0, INK.bone, { lw: 0.03 });
      flat(ctx, 'x', 0.004, (g) => {
        g.fillStyle = INK.oxblood; g.fillRect(-15.75, -2.95, 0.75, 0.22);
        words(g, '1974', -15.375, -2.58, 0.2, INK.stormNavy);
        if (Q.detail) {
          g.fillStyle = alpha(INK.stormNavy, 0.5);
          for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) g.fillRect(-15.66 + c * 0.12, -2.36 + r * 0.11, 0.07, 0.05);
        }
      });
    });

    // A mousehole in the skirting, by the Lord's door.
    R.decor((ctx) => {
      flat(ctx, 'y', 0.004, (g) => {
        g.beginPath(); g.moveTo(15.25, 0); g.lineTo(15.25, -0.14); g.arc(15.45, -0.14, 0.2, Math.PI, 0); g.lineTo(15.65, 0); g.closePath();
        paint(g, C.black, { lw: 0.025 });
      });
    });

    // ---------- Rugs ----------
    R.rug((ctx) => {
      runner(ctx, 0.35, 1.5, 1.42, 3.85);
      runner(ctx, 0.55, 3.85, 15.2, 5.15);
      brigRug(ctx);
      craneRug(ctx);
    });

    // ---------- The low walls ----------
    R.thing(0, 6.4, (ctx) => lowWallX(ctx, 0, 3, true), { depth: 6.4 });
    R.thing(5, 6.4, (ctx) => lowWallX(ctx, 5, 11, true), { depth: 11.4 });
    R.thing(13, 6.4, (ctx) => lowWallX(ctx, 13, 16, true), { depth: 19.4 });
    for (let a = 6.6; a < 16 - 1e-6; a += 1) {
      const b = Math.min(16, a + 1);
      R.thing(8, (a + b) / 2, (ctx) => lowWallY(ctx, a, b, b >= 16 - 1e-6), { depth: 8 + (a + b) / 2 });
    }
    // Door frames on the low walls, cut through like the walls.
    R.thing(3, 6.6, (ctx) => {
      for (const x of [2.85, 5.0, 10.85, 13.0]) {
        box(ctx, x, 6.35, 0, 0.15, 0.3, PART + 0.01, MAT.mahogany, { top: INK.stormNavy, flat: true, lw: 0.03 });
      }
    }, { depth: 6.9 });

    // ---------- The landing and the corridor ----------
    R.thing(1.5, 2.8, banister, { depth: 4.2 });
    R.thing(0.4, 0.7, landingTable, { depth: 1.1 });
    flame(R, 0.36, 0.34, 1.36, 61);
    // A warm light coming up the stairwell from the hall below.
    R.light({ at: [6.2, 1.6, -0.6], r: 3.4, color: INK.candleGold, k: (t) => 0.5 * house.lamp(t) });
    R.thing(14.5, 2.4, golfBag, { depth: 16.9 });
    // Rupert's suitcase: tap it and it springs open. The silver's inside.
    const suitcase = R.poke({ id: 'suitcase', at: [15.35, 2.75, 0.45], r: 0.8, sound: 'clunk', say: ['It was never going to shut.', 'Nope. Still not shutting.'] });
    R.thing(15.35, 2.75, (ctx) => silverCase(ctx, suitcase.k()), { anim: true, depth: 18.1 });
    R.thing(15.65, 3.65, cornerHatbox, { depth: 19.3 });
    R.thing(15.3, 1.55, deadPalm, { depth: 16.85 });
    R.rug((ctx) => {
      flat(ctx, 'z', 0.02, (g) => {
        for (const [x, y, r] of [[14.2, 1.85, 0.6], [15.75, 2.1, -0.4]]) {
          g.save(); g.translate(x, y); g.rotate(r);
          g.beginPath(); g.ellipse(0, 0, 0.26, 0.08, 0, 0, Math.PI * 2);
          paint(g, mix(MAT.leaf, MAT.fur, 0.6), { lw: 0.02 });
          g.restore();
        }
      });
    });

    // The mouse: out of its hole, over to Rupert's case, back with a spoon.
    const RUNS = [9, 24, 37, 111, 125, 139, 158];
    const LEG = [[15.45, 0.1], [14.1, 0.95], [14.1, 3.3], [14.72, 3.32]];
    R.mover((t) => {
      const tt = lt(t);
      const r = RUNS.find((s) => tt >= s && tt < s + 8);
      if (r == null) return { x: 15.45, y: 0.05, hid: true };
      const s = tt - r;
      const path = s < 3.9 ? LEG : LEG.slice().reverse();
      let k = s < 2.4 ? s / 2.4 : s < 3.9 ? 1 : s < 6.3 ? (s - 3.9) / 2.4 : 1;
      if (s >= 6.3) return { x: 15.45, y: 0.05, hid: true };
      const segs = path.length - 1;
      const f = Math.min(segs - 1e-6, k * segs), i = Math.floor(f), u = f - i;
      const [ax, ay] = path[i], [bx, by] = path[i + 1];
      return { x: ax + (bx - ax) * u, y: ay + (by - ay) * u, dir: (bx - ax) - (by - ay) >= 0 ? 1 : -1, spoon: s >= 3.9, still: s >= 2.4 && s < 3.9 };
    }, (ctx, t, p) => {
      if (p.hid) return;
      const [X, Y] = P(p.x, p.y, 0);
      ctx.save();
      ctx.translate(X, Y);
      ctx.scale(p.dir * 1.3, 1.3);
      const bob = p.still ? Math.sin(t * 20) * 0.01 : Math.abs(Math.sin(t * 24)) * 0.03;
      if (p.spoon) { ctx.beginPath(); ctx.moveTo(-0.5, -0.02); ctx.lineTo(0.12, -0.06); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.06; ctx.stroke(); ctx.strokeStyle = MAT.silver; ctx.lineWidth = 0.03; ctx.stroke(); ctx.beginPath(); ctx.ellipse(-0.55, -0.01, 0.08, 0.05, 0, 0, Math.PI * 2); paint(ctx, MAT.silver, { lw: 0.02 }); }
      ctx.beginPath(); ctx.moveTo(-0.14, -0.06); ctx.quadraticCurveTo(-0.3, -0.02, -0.34, -0.12); ctx.strokeStyle = C.pink; ctx.lineWidth = 0.025; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, -0.08 - bob, 0.15, 0.08, 0, 0, Math.PI * 2); paint(ctx, GREY, { lw: 0.025 });
      ctx.beginPath(); ctx.arc(0.1, -0.13 - bob, 0.045, 0, Math.PI * 2); paint(ctx, GREY, { lw: 0.02 });
      dot(ctx, 0.16, -0.09 - bob, 0.018, C.ink);
      ctx.restore();
    }, { bias: 0.2 });

    // The bat that lives behind the drapes: hangs there, and does laps of the
    // landing while the lights are out.
    const HANG = [8.35, 0.2, 4.55];
    const batAt = (t) => {
      const tt = lt(t);
      if (tt < 82.2 || tt > 95.4) return null;
      const s = tt - 82.2;
      const a = s * 1.25;
      const loop = [6 + Math.cos(a) * 4.2, 4.2 + Math.sin(a) * 1.6, 3.6 + Math.sin(a * 2) * 0.5];
      const e = Math.min(1, s / 0.8, (95.4 - tt) / 0.8);
      return HANG.map((h, i) => h + (loop[i] - h) * e).concat([Math.cos(a) < 0 ? 1 : -1]);
    };
    const drawBat = (ctx, X, Y, t, flying, dir = 1) => {
      ctx.save();
      ctx.translate(X, Y);
      if (flying) {
        ctx.scale(dir, 1);
        const w = Math.sin(t * 26) * 0.18;
        ctx.beginPath();
        ctx.moveTo(0, -0.05); ctx.quadraticCurveTo(-0.2, -0.25 - w, -0.42, -0.08 - w); ctx.lineTo(-0.3, -0.02); ctx.lineTo(-0.2, 0.04); ctx.lineTo(-0.08, 0.02);
        ctx.lineTo(0.08, 0.02); ctx.lineTo(0.2, 0.04); ctx.lineTo(0.3, -0.02); ctx.lineTo(0.42, -0.08 - w); ctx.quadraticCurveTo(0.2, -0.25 - w, 0, -0.05);
        paint(ctx, IRON, { lw: 0.025, stroke: mix(IRON, INK.bone, 0.45) });
        dot(ctx, 0, -0.06, 0.08, IRON);
        dot(ctx, -0.03, -0.08, 0.016, INK.candleGold); dot(ctx, 0.03, -0.08, 0.016, INK.candleGold);
      } else {
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 0.05); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(0, 0.2, 0.08, 0.16, 0, 0, Math.PI * 2); paint(ctx, IRON, { lw: 0.02 });
        ctx.beginPath(); ctx.moveTo(-0.05, 0.34); ctx.lineTo(-0.08, 0.42); ctx.lineTo(0, 0.37); ctx.lineTo(0.08, 0.42); ctx.lineTo(0.05, 0.34); ctx.fillStyle = IRON; ctx.fill();
      }
      ctx.restore();
    };
    R.decor((ctx, t) => {
      if (batAt(t)) return;
      const [X, Y] = P(...HANG);
      drawBat(ctx, X, Y, t, false);
    }, { anim: true });
    R.air((ctx, t) => {
      const b = batAt(t);
      if (!b) return;
      const [X, Y] = P(b[0], b[1], b[2]);
      drawBat(ctx, X, Y, t, true, b[3]);
    });

    // ---------- The Brigadier's room ----------
    R.thing(0.55, 7.85, wardrobe, { depth: 8.4 });
    const ward = R.poke({ id: 'wardrobe', at: [1.1, 8.4, 1.4], r: 0.9, sound: 'clunk', say: ['Nobody in here.', 'Still nobody. Just 1974.'] });
    R.thing(0.6, 7.9, (ctx) => wardrobeDoor(ctx, ward.k()), { anim: true, depth: 8.45 });
    // A spider, going up and down on a thread from the top of the wardrobe.
    R.thing(1.2, 8.7, (ctx, t) => {
      if (!Q.detail) return;
      const drop = 0.45 + (Math.sin(t * 0.6) * 0.5 + 0.5) * 0.9;
      const [AX, AY] = P(1.2, 8.7, 2.98), [BX, BY] = P(1.2, 8.7, 2.98 - drop);
      ctx.beginPath(); ctx.moveTo(AX, AY); ctx.lineTo(BX, BY); ctx.strokeStyle = alpha(INK.bone, 0.7); ctx.lineWidth = 0.012; ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < 4; i++) { const s = (i - 1.5) * 0.05; ctx.moveTo(BX - 0.02, BY + s); ctx.lineTo(BX - 0.1, BY + s + 0.03); ctx.moveTo(BX + 0.02, BY + s); ctx.lineTo(BX + 0.1, BY + s + 0.03); }
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.012; ctx.stroke();
      dot(ctx, BX, BY + 0.02, 0.045, C.ink);
    }, { anim: true, depth: 10 });
    R.thing(0.45, 9.9, brigWashstand, { depth: 10.35 });
    R.thing(3.45, 10.7, brigNightstand, { depth: 14.15 });
    flame(R, 3.25, 10.5, 1.18, 62);
    R.thing(1.75, 11.02, brigBedHead, { depth: 12.75 });
    R.thing(1.75, 13, brigBedBody, { depth: 14.75 });
    R.thing(1.93, 12.95, kitbag, { depth: 14.9 });
    R.thing(1.75, 15, brigBedFoot, { depth: 16.75 });
    R.thing(2.98, 15.0, plumedHat, { depth: 16.8 });
    R.decoy({ id: 'plume', at: [2.98, 14.98, 1.55], r: 0.6, say: ['Ostrich. He insists.', 'Ostrich. He still insists.'] });
    R.thing(1.43, 15.45, boots, { depth: 16.9 });
    R.thing(6.2, 13, trunk, { depth: 19.25 });
    R.thing(6.15, 7.3, desk, { depth: 14.4 });
    R.thing(6.2, 8.35, brigChair, { depth: 14.6 });
    // The parrot: says "1974!" now and then, and raises the alarm about Dr. Crane.
    const SOCK_ON_PARROT = 85.3 + 0.7;
    R.thing(2.2, 8.2, (ctx, t) => parrot(ctx, t, inBrigRoom(crane(t)), lt(t) >= SOCK_ON_PARROT), { anim: true, depth: 10.6 });

    // ---------- Dr. Crane's room ----------
    R.thing(8.58, 8.2, specimens, { depth: 18 });
    R.thing(8.58, 8.2, (ctx, t) => {
      const b = brig(t), c = crane(t);
      const p = inCraneRoom(b) ? b : inCraneRoom(c) ? c : null;
      eyeJar(ctx, t, p ? clamp(((p.x - p.y) - (8.58 - 8.2)) / 4, -1, 1) : null);
    }, { anim: true, depth: 18.1 });
    R.thing(8.85, 10.8, tonicTable, { depth: 19.65 });
    R.thing(8.95, 10.62, (ctx, t) => tonic(ctx, t), { anim: true, depth: 19.8 });
    R.light({ at: [8.95, 10.62, 1.1], r: 1.2, color: INK.candleGold, k: house.flicker(64) });
    R.thing(14.1, 7.1, craneWashstand, { depth: 21.2 });
    const GLOVE_ON = 88.9 + 0.8;
    // The skeleton (the one a new player is shown): tap it and its teeth chatter.
    const bones = R.poke({ id: 'skeleton', at: [15.25, 8.7, 1.5], r: 1.0, hold: 1.4, teach: true, sound: 'clunk', say: ['Nobody home.', 'Rattle.', "He's a hat stand now."] });
    R.thing(15.25, 8.7, (ctx, t) => {
      const b = brig(t);
      const look = inCraneRoom(b) ? clamp(((b.x - b.y) - (15.25 - 8.7)) / 5, -1, 1) : Math.sin(t * 0.3) * 0.4;
      skeleton(ctx, t, look, lt(t) >= GLOVE_ON, storm.flash(t) > 0.15 || bones.k() > 0.05);
    }, { anim: true, depth: 23.95 });
    R.thing(12.5, 10.75, craneNightstand, { anim: true, depth: 23.25 });
    flame(R, 12.75, 10.55, 1.18, 63);
    R.thing(12.5, 10.95, craneTins, { depth: 23.27 });
    R.thing(12.35, 10.62, craneLamp, { anim: true, depth: 23.3 });
    R.light({ at: [12.35, 10.62, 1.4], r: 2.6, color: INK.candleGold, k: (t) => house.lamp(t) * (lt(t) >= 90.6 ? 0.45 : 1) });
    R.thing(14.25, 11.02, craneBedHead, { depth: 25.3 });
    R.thing(14.25, 13, craneBedBody, { anim: true, depth: 27.25 });
    R.thing(14.55, 13.75, (ctx, t) => {
      const b = brig(t), c = crane(t);
      cat(ctx, t, inCraneRoom(b) ? 'hiss' : inCraneRoom(c) ? 'purr' : 'sleep');
    }, { anim: true, depth: 28.3 });
    R.thing(14.25, 15, craneBedFoot, { depth: 29.25 });
    R.thing(9.1, 15.05, craneChest, { depth: 24.15 });
    R.thing(9.1, 15.0, carpetBag, { depth: 24.2 });
    R.thing(10.58, 14.55, doctorsBag, { depth: 25.1 });
    R.thing(10.48, 15.3, valise, { depth: 25.8 });
    R.thing(10.95, 14.06, craneGladstone, { depth: 24.95 });

    // ---------- The search: what flies out of the luggage, and when ----------
    // Dr. Crane in the Brigadier's room (from 81.5 s), at the kitbag on the bed,
    // throwing things over his shoulder.
    const KIT = [1.95, 12.95, 1.2];
    toss(R, {
      t0: 82.4, from: KIT, to: [1.2, 15.0, 1.1], hop: 0.9,
      fly: (ctx, X, Y, a) => spun(ctx, X, Y, a, (g) => { g.beginPath(); g.roundRect(-0.2, -0.12, 0.4, 0.24, 0.06); paint(g, INK.bone, { lw: 0.025 }); }),
      rest: (ctx) => {
        // his long johns, over the foot of the bed
        face(ctx, [[0.85, 14.98, 1.12], [1.55, 14.98, 1.12], [1.55, 15.04, 0.62], [1.35, 15.04, 0.66], [1.2, 15.04, 0.5], [1.0, 15.04, 0.66], [0.85, 15.04, 0.6]], INK.bone, { lw: 0.025 });
        if (Q.detail) { line3(ctx, [[1.2, 15.05, 1.08], [1.2, 15.05, 0.78]], alpha(C.ink, 0.5), 0.02); for (const z of [1.02, 0.94, 0.86]) { const [X, Y] = P(1.2, 15.05, z); dot(ctx, X, Y, 0.018, INK.oxblood); } }
      },
      depth: 16.8,
    });
    toss(R, {
      t0: 84.1, from: [1.75, 11.55, 0.98], to: [4.9, 14.9, 0.12], hop: 1.3, spin: 9,
      fly: (ctx, X, Y, a) => spun(ctx, X, Y, a, helmetShape),
      rest: (ctx, t, age) => {
        const [X, Y] = P(4.9, 14.9, 0.12);
        spun(ctx, X, Y, Math.sin(age * 7) * 0.4 * Math.exp(-age * 1.5), helmetShape);
      },
    });
    // the pith helmet sits on his pillow until then
    R.thing(1.75, 11.55, (ctx, t) => {
      if (lt(t) >= 84.1) return;
      const [X, Y] = P(1.75, 11.55, 0.98);
      spun(ctx, X, Y, 0, helmetShape);
    }, { anim: true, depth: 14.8 });
    toss(R, {
      t0: 85.3, from: KIT, to: [2.2, 8.2, 2.5], hop: 1.2, dur: 0.7,
      fly: (ctx, X, Y, a) => spun(ctx, X, Y, a, (g) => sockShape(g, OLIVE, INK.oxblood)),
    });
    toss(R, {
      t0: 86.6, from: KIT, to: [4.6, 14.0, 0.02], hop: 1.0, spin: 3, floor: true,
      fly: (ctx, X, Y, a) => { spun(ctx, X - 0.2, Y, a, paperShape); spun(ctx, X + 0.2, Y + 0.1, -a, paperShape); },
      rest: (ctx) => {
        for (const [x, y, r] of [[4.4, 13.7, 0.3], [5.1, 14.45, -0.5], [4.25, 15.25, 1.1]]) {
          flat(ctx, 'z', 0.02, (g) => {
            g.save(); g.translate(x, y); g.rotate(r);
            g.beginPath(); g.rect(-0.22, -0.3, 0.44, 0.6); paint(g, INK.bone, { lw: 0.02 });
            if (Q.detail) { g.beginPath(); for (let i = 0; i < 5; i++) { g.moveTo(-0.15, -0.2 + i * 0.1); g.lineTo(0.15, -0.2 + i * 0.1); } g.strokeStyle = alpha(C.ink, 0.45); g.lineWidth = 0.02; g.stroke(); }
            g.restore();
          });
        }
      },
    });
    toss(R, {
      t0: 88.0, from: KIT, to: [4.55, 14.3, 0], hop: 1.1,
      fly: (ctx, X, Y, a) => spun(ctx, X, Y + 0.2, a, teddyShape),
      rest: (ctx) => { const [X, Y] = P(4.55, 14.3, 0); spun(ctx, X, Y, 0, teddyShape); },
    });
    toss(R, {
      t0: 89.3, from: KIT, to: [1.1, 14.0, 0.85], hop: 0.8,
      fly: (ctx, X, Y, a) => spun(ctx, X, Y, a, (g) => { g.beginPath(); g.rect(-0.16, -0.2, 0.32, 0.4); paint(g, GOLD, { lw: 0.025 }); g.fillStyle = KHAKI; g.fillRect(-0.11, -0.15, 0.22, 0.3); }),
      rest: (ctx) => {
        rect(ctx, 0.8, 13.75, 0.55, 0.45, 0.85, GOLD, { lw: 0.025 });
        rect(ctx, 0.87, 13.82, 0.41, 0.31, 0.852, KHAKI, { stroke: false });
        if (Q.detail) flat(ctx, 'z', 0.853, (g) => words(g, '1974', 1.075, 14.0, 0.1, INK.oxblood));
      },
      depth: 15.2,
    });
    toss(R, {
      t0: 90.6, from: KIT, to: [5.5, 15.35, 0.02], hop: 1.2, spin: 4, floor: true,
      fly: (ctx, X, Y, a) => spun(ctx, X, Y, a, (g) => paperShape(g, KHAKI)),
      rest: (ctx) => {
        flat(ctx, 'z', 0.02, (g) => {
          g.save(); g.translate(5.55, 15.3); g.rotate(-0.2);
          g.beginPath(); g.rect(-0.55, -0.35, 1.1, 0.7); paint(g, KHAKI, { lw: 0.025 });
          if (Q.detail) {
            g.beginPath(); g.moveTo(-0.45, 0.2); g.quadraticCurveTo(-0.1, -0.2, 0.3, 0.05); g.strokeStyle = INK.stormNavy; g.lineWidth = 0.025; g.stroke();
            g.beginPath(); g.moveTo(0.2, -0.15); g.lineTo(0.34, -0.01); g.moveTo(0.34, -0.15); g.lineTo(0.2, -0.01); g.strokeStyle = INK.oxblood; g.lineWidth = 0.04; g.stroke();
          }
          words(g, '1974', -0.2, 0.2, 0.14, INK.oxblood);
          g.restore();
        });
      },
    });
    toss(R, {
      t0: 92.0, from: KIT, to: [2.45, 14.35, 0.85], hop: 0.9,
      fly: (ctx, X, Y, a) => spun(ctx, X, Y, a, (g) => { g.beginPath(); g.roundRect(-0.14, -0.2, 0.28, 0.4, 0.1); paint(g, INK.oxblood, { lw: 0.025 }); }),
      rest: (ctx) => { flat(ctx, 'z', 0.86, (g) => { g.beginPath(); g.roundRect(2.2, 14.15, 0.5, 0.36, 0.1); paint(g, INK.oxblood, { lw: 0.025 }); g.beginPath(); g.rect(2.62, 14.25, 0.12, 0.16); paint(g, INK.oxblood, { lw: 0.02 }); }); },
      depth: 15.4,
    });
    toss(R, {
      t0: 93.4, from: KIT, to: [4.3, 15.55, 0.02], hop: 1.1, floor: true,
      fly: (ctx, X, Y, a) => spun(ctx, X, Y, a, (g) => { g.beginPath(); g.moveTo(-0.2, 0); g.lineTo(0.12, 0); g.strokeStyle = GOLD; g.lineWidth = 0.05; g.stroke(); g.beginPath(); g.moveTo(0.1, 0); g.lineTo(0.24, -0.1); g.lineTo(0.24, 0.1); g.closePath(); paint(g, GOLD, { lw: 0.02 }); }),
      rest: (ctx) => {
        flat(ctx, 'z', 0.03, (g) => {
          g.beginPath(); g.moveTo(3.95, 15.5); g.lineTo(4.45, 15.5); g.quadraticCurveTo(4.6, 15.5, 4.55, 15.65); g.lineTo(4.1, 15.65);
          g.strokeStyle = C.ink; g.lineWidth = 0.08; g.stroke(); g.strokeStyle = GOLD; g.lineWidth = 0.045; g.stroke();
          g.beginPath(); g.moveTo(4.45, 15.45); g.lineTo(4.7, 15.3); g.lineTo(4.7, 15.72); g.closePath(); paint(g, GOLD, { lw: 0.02 });
        });
      },
    });

    // The Brigadier in Dr. Crane's room (from 87.5 s), at the bedside table.
    const DRAWER = [12.5, 11.4, 0.7];
    toss(R, {
      t0: 88.9, from: DRAWER, to: [15.7, 8.1, 1.75], hop: 1.2, dur: 0.8, spin: 10,
      fly: (ctx, X, Y, a) => spun(ctx, X, Y, a, (g) => { g.beginPath(); g.ellipse(0, 0, 0.1, 0.14, 0, 0, Math.PI * 2); paint(g, mix(INK.bone, INK.candleGold, 0.25), { lw: 0.025 }); }),
    });
    toss(R, {
      t0: 89.9, from: DRAWER, to: [12.35, 10.62, 1.5], hop: 0.9,
      fly: (ctx, X, Y, a) => spun(ctx, X, Y, a, (g) => sockShape(g, CRANE_SOCK, INK.bone)),
    });
    toss(R, {
      t0: 90.9, from: DRAWER, to: [11.2, 13.3, 0.02], hop: 1.0, spin: 3, floor: true,
      fly: (ctx, X, Y, a) => { spun(ctx, X - 0.2, Y, a, paperShape); spun(ctx, X + 0.2, Y + 0.1, -a, paperShape); },
      rest: (ctx) => {
        for (const [x, y, r] of [[11.0, 12.8, 0.4], [11.85, 13.55, -0.3], [10.35, 13.4, 0.9]]) {
          flat(ctx, 'z', 0.02, (g) => {
            g.save(); g.translate(x, y); g.rotate(r);
            g.beginPath(); g.rect(-0.2, -0.28, 0.4, 0.56); paint(g, INK.bone, { lw: 0.02 });
            if (Q.detail) { words(g, 'Rx', -0.08, -0.16, 0.12, INK.oxblood); g.beginPath(); g.moveTo(-0.12, 0.02); g.quadraticCurveTo(0, -0.04, 0.12, 0.04); g.moveTo(-0.12, 0.12); g.quadraticCurveTo(0, 0.06, 0.1, 0.14); g.strokeStyle = alpha(C.ink, 0.5); g.lineWidth = 0.02; g.stroke(); }
            g.restore();
          });
        }
      },
    });
    // a bandage, unrolling across the floor
    toss(R, {
      t0: 91.9, from: DRAWER, to: [12.4, 12.0, 0.08], hop: 0.4, dur: 0.4,
      fly: (ctx, X, Y) => { ctx.beginPath(); ctx.ellipse(X, Y, 0.1, 0.12, 0, 0, Math.PI * 2); paint(ctx, INK.bone, { lw: 0.025 }); },
      rest: (ctx, t, age) => {
        const k = clamp(age / 1.4);
        const ex = 12.4 - 0.1 * k, ey = 12.0 + 3.3 * k;
        flat(ctx, 'z', 0.015, (g) => {
          g.beginPath(); g.moveTo(12.4, 12.0); g.quadraticCurveTo(12.75, 12.0 + 1.6 * k, ex, ey);
          g.strokeStyle = C.ink; g.lineWidth = 0.19; g.lineCap = 'butt'; g.stroke();
          g.strokeStyle = INK.bone; g.lineWidth = 0.14; g.stroke();
        });
        const [X, Y] = P(ex, ey, 0.1);
        ctx.beginPath(); ctx.ellipse(X, Y, 0.1, 0.12, 0, 0, Math.PI * 2); paint(ctx, INK.bone, { lw: 0.025 });
      },
      floor: true,
    });
    toss(R, {
      t0: 92.9, from: DRAWER, to: [11.3, 12.6, 0.08], hop: 1.0,
      fly: (ctx, X, Y, a) => spun(ctx, X, Y, a, (g) => { for (const dx of [-0.12, 0.12]) { g.beginPath(); g.roundRect(dx - 0.06, -0.1, 0.12, 0.2, 0.03); paint(g, AMBER, { lw: 0.02 }); } }),
      rest: (ctx) => {
        for (const [x, y, r] of [[11.3, 12.6, 0.9], [10.8, 12.95, -0.4], [11.75, 13.1, 1.8]]) {
          const [X, Y] = P(x, y, 0.08);
          spun(ctx, X, Y, r, (g) => { g.beginPath(); g.roundRect(-0.07, -0.13, 0.14, 0.26, 0.04); paint(g, AMBER, { lw: 0.02 }); g.fillStyle = INK.bone; g.fillRect(-0.07, -0.13, 0.14, 0.05); });
        }
      },
      depth: 24,
    });
    toss(R, {
      t0: 94.0, from: [14.25, 11.6, 0.9], to: [12.6, 15.3, 0.1], hop: 1.2, spin: 5,
      fly: (ctx, X, Y, a) => spun(ctx, X, Y, a, (g) => { g.beginPath(); g.roundRect(-0.3, -0.14, 0.6, 0.28, 0.12); paint(g, INK.bone, { lw: 0.03 }); }),
      rest: (ctx) => { box(ctx, 12.25, 15.0, 0, 0.75, 0.55, 0.14, INK.bone, { lw: 0.03, top: tint(INK.bone, 0.3) }); },
      depth: 27.4,
    });
    // a jar of leeches, which lands on its side and lets them out
    toss(R, {
      t0: 95.0, from: DRAWER, to: [9.75, 13.7, 0.12], hop: 1.2, spin: 6,
      fly: (ctx, X, Y, a) => spun(ctx, X, Y, a, (g) => { g.beginPath(); g.roundRect(-0.12, -0.16, 0.24, 0.32, 0.05); paint(g, alpha(MAT.glass, 0.8), { lw: 0.025 }); }),
      rest: (ctx, t, age) => {
        const [X, Y] = P(9.75, 13.7, 0.12);
        spun(ctx, X, Y, 1.4, (g) => { g.beginPath(); g.roundRect(-0.12, -0.17, 0.24, 0.34, 0.05); paint(g, alpha(MAT.glass, 0.8), { lw: 0.025 }); g.fillStyle = GOLD; g.fillRect(-0.1, -0.23, 0.2, 0.06); });
        for (let i = 0; i < 3; i++) {
          const d = Math.min(1.6, age * 0.05) * (0.6 + i * 0.25);
          const a = -0.9 + i * 0.7;
          const [LX, LY] = P(9.75 + Math.cos(a) * d * 0.7, 13.7 + Math.sin(a) * d, 0.02);
          const s = 1 + Math.sin(t * 5 + i * 2) * 0.25;
          ctx.beginPath(); ctx.ellipse(LX, LY, 0.1 * s, 0.035 / s, a * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = mix(INK.stormNavy, INK.verdigris, 0.3); ctx.fill();
        }
      },
      depth: 23.45,
    });

    // ---------- Lights, sounds and speech ----------
    R.air((ctx, t) => {
      const tt = lt(t);
      const c = crane(t), b = brig(t);
      const talk = readable();
      // Creeping along the corridor, both whistling, eyes on the ceiling.
      for (const p of [c, b]) {
        if (!p || !inHall(p) || !p.moving || tt < 64 || tt > 84) continue;
        for (let i = 0; i < 2; i++) {
          const k = (t * 0.7 + i * 0.5) % 1;
          const nx = p.x + 0.45 + k * 0.35, ny = p.y - 0.45 - k * 0.35, nz = 2.3 + k * 0.9;
          ctx.save();
          ctx.globalAlpha *= 1 - k * k;
          note(ctx, nx, ny, nz, C.ink, 1.25);
          note(ctx, nx, ny, nz, INK.bone, 0.95);
          ctx.restore();
        }
      }
      if (talk) {
        if (c && tt >= 73.6 && tt < 75.4) speech(ctx, c.x, c.y, 3.35, 'Brigadier.', { size: 0.42, dx: 0.9 });
        if (b && tt >= 75.9 && tt < 77.8) speech(ctx, b.x, b.y, 3.35, 'Doctor.', { size: 0.42, dx: 0.8 });
      }
      // The creaky board halfway along the corridor.
      for (const p of [c, b]) {
        if (p && Math.abs(p.x - 9.0) < 0.35 && Math.abs(p.y - 4.5) < 0.5 && Q.detail) shout(ctx, 9.0, 4.5, 0.55 + (p.x % 0.35), 'CREAK', 0.34);
      }
      if (!talk) return;
      // The parrot (who does a very good impression of the maid), and the cat.
      if (tt >= 95.3 && tt < 97.4) speech(ctx, 2.2, 8.2, 2.75, 'AAAAH!', { size: 0.4, dx: 0.4 });
      else if (inBrigRoom(c)) {
        const s = Math.floor(tt / 1.6) % 3;
        speech(ctx, 2.2, 8.2, 2.75, s === 1 ? '1974!' : 'INTRUDER!', { size: 0.4, dx: 0.4 });
      } else if (tt % 16 > 13.5 && tt % 16 < 15.2) speech(ctx, 2.2, 8.2, 2.75, '1974!', { size: 0.4, dx: 0.4 });
      if (inCraneRoom(b)) speech(ctx, 14.55, 13.75, 1.75, 'HSSS!', { size: 0.4, dx: 0.3 });
      else if (inCraneRoom(c)) shout(ctx, 14.9, 13.4, 1.5 + Math.sin(t * 3) * 0.05, 'prrr', 0.26);
      else {
        // asleep: z's drifting up
        for (let i = 0; i < 2; i++) {
          const k = (t * 0.35 + i * 0.5) % 1;
          const [X, Y] = P(14.3 - k * 0.4, 13.5 - k * 0.4, 1.3 + k * 0.9);
          const s = 0.1 + k * 0.07;
          ctx.save();
          ctx.globalAlpha *= 1 - k;
          ctx.beginPath();
          ctx.moveTo(X - s, Y - s); ctx.lineTo(X + s, Y - s); ctx.lineTo(X - s, Y + s); ctx.lineTo(X + s, Y + s);
          ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.strokeStyle = C.ink; ctx.lineWidth = 0.09; ctx.stroke();
          ctx.strokeStyle = INK.bone; ctx.lineWidth = 0.045; ctx.stroke();
          ctx.restore();
        }
      }
    });
    // The Brigadier's pipe, still smouldering on his bedside table.
    R.air((ctx, t) => {
      if (!Q.detail) return;
      for (let i = 0; i < 3; i++) {
        const k = (t * 0.25 + i / 3) % 1;
        const [X, Y] = P(3.68, 10.95, 1.02 + k * 1.2);
        ctx.beginPath();
        ctx.arc(X + Math.sin(t * 1.2 + i * 2.1) * 0.12 * k, Y, 0.05 + k * 0.1, 0, Math.PI * 2);
        ctx.fillStyle = alpha(INK.bone, 0.4 * (1 - k));
        ctx.fill();
      }
    });
    // Everything on the Brigadier's desk is freshly polished: a glint now and
    // then, on a different piece each time (so it doesn't point at any one).
    const GLINTS = [[6.3, 7.24, 1.14], [7.0, 6.93, 1.12], [5.7, 7.6, 1.07], [7.13, 7.14, 1.25], [7.02, 7.52, 1.07], [6.66, 6.93, 1.12]];
    R.air((ctx, t) => {
      if (!Q.detail || lightsOut(t) > 0) return;
      const k = (t % 3.2) / 3.2;
      if (k > 0.18) return;
      const s = Math.sin((k / 0.18) * Math.PI) * 0.12;
      const [X, Y] = P(...GLINTS[Math.floor(t / 3.2) % GLINTS.length]);
      ctx.beginPath();
      ctx.moveTo(X - s, Y); ctx.lineTo(X, Y - s * 0.25); ctx.lineTo(X + s, Y); ctx.lineTo(X, Y + s * 0.25); ctx.closePath();
      ctx.moveTo(X, Y - s); ctx.lineTo(X + s * 0.25, Y); ctx.lineTo(X, Y + s); ctx.lineTo(X - s * 0.25, Y); ctx.closePath();
      ctx.fillStyle = C.white;
      ctx.fill();
    });

    R.dark(house.dark);

    // ---------- The finds ----------
    R.find({ id: 'doctors-bag', label: "Dr. Crane's medical bag", kind: 'spot', at: [10.58, 14.55, 0.28], r: 0.6 });
    R.find({
      id: 'mint-tin', label: 'An empty tin of mints', kind: 'hard', at: [12.45, 10.95, 0.93], r: 0.6,
      riddle: "Not snuff, not polish, not pills. By a doctor's bed.",
      hint: 'Whoever swapped the pills kept the mints close. Only one tin up here has its lid off.',
    });
    R.find({
      id: 'silver', label: 'The family silver, half packed', kind: 'poke', inside: suitcase, at: [15.35, 2.75, 0.4], r: 0.7,
      hint: 'A man leaving in a hurry packs the silver, and never quite gets the lid shut.',
    });
    R.find({ id: 'pistol', label: 'A duelling pistol', kind: 'spot', at: [6.85, 7.58, 1.08], r: 0.6 });
  },
};
