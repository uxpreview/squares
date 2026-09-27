// Grand Hall: where everyone arrives, and where nobody stays. Plum damask,
// a marble floor, the grand staircase up to the landing, and the Lord's
// portrait over it all, watching (its eyes follow you). The suit of armor
// moves whenever nobody is looking: at every flash of lightning, and in the
// dark. The grandfather clock counts down to midnight and strikes it. And in
// every flash the late Lord's ghost appears, pointing furiously at the goose,
// who is standing with the coats in a borrowed scarf. Nobody notices, except
// the cat.
import {
  C, Q, P, SKIN, HAIR, box, rect, disc, face, poly, paint, onLeft, onRight, paintText, label, speech, slab, tiles, plant,
  mix, shade, tint, alpha, hash,
} from '../../../engine/art.js';
import { clamp, particles } from '../../../engine/actors.js';
import { ZK } from '../../../engine/iso.js';
import {
  INK, MAT, ROOM, NIGHT, CAST, house, storm, lightsOut, lastStrike, MIDNIGHT, pastK, candle, painting, lordGhost,
} from '../style.js';
import { DOORS, LOOP } from '../plan.js';

// ---------- Inks ----------
const HALL = ROOM['grand-hall'];
const WALL = HALL.wall, WALL_R = shade(HALL.wall, 0.1);
const DAMASK = mix(HALL.wall, INK.deepPlum, 0.6);
const WOOD = HALL.trim, WOOD_D = MAT.mahoganyDark, WOOD_L = tint(HALL.trim, 0.2);
const TILE_L = MAT.marble, TILE_D = mix(MAT.marbleVein, INK.deepPlum, 0.35);
const BORDER = mix(TILE_D, INK.stormNavy, 0.25);
const GOLD = MAT.brass, GOLD_D = MAT.brassDark;
const RUNNER = MAT.velvet;
const LINE = { lw: 0.035 };

// ---------- Where things are ----------
// The door openings in the back walls, as [from, to, height] along each wall.
const OPEN = { left: [], right: [] };
for (const d of DOORS['grand-hall'] || []) OPEN[d.side].push([d.at - (d.w ?? 2.2) / 2, d.at + (d.w ?? 2.2) / 2, d.h ?? 3.6]);

// The grand staircase (fixed: people walk up it from (11.6, 1.6) to (1.2, 1.6)
// at 7.1 up). Twelve steps over (x0, y0, w, d), climbing toward the left wall.
const ST = { x0: 1.5, y0: 0.4, w: 9.5, d: 2.4, n: 12, rise: 7.1 };
const STEP = ST.w / ST.n;
const SY = ST.y0 + ST.d; // the open side, facing the room
const stepX = (i) => ST.x0 + ST.w - (i + 1) * STEP; // back edge of step i (0 is the bottom)
const stepZ = (i) => (ST.rise * (i + 1)) / ST.n; // its tread
const SLOPE = (stepZ(ST.n - 1) - stepZ(0)) / (ST.w - STEP);
const pitch = (x) => stepZ(0) + (ST.x0 + ST.w - x) * SLOPE; // the line along the nosings
const RAIL = 1.05; // handrail over the nosings
const RUN = [0.85, 2.35]; // the stair carpet (people walk up the middle, y 1.6)

// ---------- Little helpers ----------
// Flat art on a plane facing the room: (0, 0) is the world point (x, y, z),
// x runs to the viewer's right, y runs down, in units. side 'left': a plane
// facing +x (like the left wall); 'right': facing +y (like the right wall).
function flat(ctx, side, x, y, z, draw) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  if (side === 'left') ctx.transform(1, -0.5, 0, ZK, X, Y);
  else ctx.transform(1, 0.5, 0, ZK, X, Y);
  draw(ctx);
  ctx.restore();
}
// The same, on a back wall at (u along it, z up).
const onWall = (ctx, side, u, z, draw) => flat(ctx, side, side === 'left' ? 0 : u, side === 'left' ? u : 0, z, draw);

// A band painted along a back wall from z0 to z1, around its doors.
function band(ctx, side, z0, z1, fill, o) {
  const f = side === 'left' ? onLeft : onRight;
  let u = 0;
  for (const [a, b, h] of OPEN[side]) {
    if (a > u) f(ctx, u, z0, a - u, z1 - z0, fill, o);
    if (z1 > h) f(ctx, a, Math.max(z0, h), b - a, z1 - Math.max(z0, h), fill, o);
    u = b;
  }
  if (u < 16) f(ctx, u, z0, 16 - u, z1 - z0, fill, o);
}
const inDoor = (side, u0, u1) => OPEN[side].find(([a, b]) => u1 > a && u0 < b);

// An upright line with an ink edge (balusters, poles, stair rods).
function stick(ctx, a, b, color, w = 0.08) {
  const [X0, Y0] = P(...a), [X1, Y1] = P(...b);
  ctx.beginPath();
  ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1);
  ctx.lineCap = 'round';
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = w + 0.06; ctx.stroke(); }
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
}
const ellipse = (ctx, X, Y, rx, ry, rot = 0) => { ctx.beginPath(); ctx.ellipse(X, Y, rx, ry, rot, 0, Math.PI * 2); };

// ---------- The floor ----------
function marble(ctx) {
  slab(ctx, BORDER);
  rect(ctx, 0, 0, 16, 16, 0, BORDER, { stroke: false, dots: shade(BORDER, 0.4), density: 0.12 });
  const n = 10, s = 1.5, o = 0.5;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const dark = (i + j) % 2;
      rect(ctx, o + i * s, o + j * s, s, s, 0, dark ? TILE_D : TILE_L, { stroke: false, dots: dark ? shade(TILE_D, 0.4) : null, density: 0.1 });
    }
  }
  rect(ctx, o, o, n * s, n * s, 0, null, { lw: 0.05, stroke: shade(BORDER, 0.35) });
  if (!Q.detail) return;
  tiles(ctx, s, alpha(C.ink, 0.16), 0.02, o, o, n * s, n * s);
  // Veins through the marble, wandering across a tile or two.
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let k = 0; k < 30; k++) {
    const i = Math.floor(hash(k, 3) * n), j = Math.floor(hash(k, 4) * n);
    const dark = (i + j) % 2;
    let x = o + i * s + 0.1, y = o + j * s + hash(k, 5) * s;
    ctx.beginPath();
    let [X, Y] = P(x, y);
    ctx.moveTo(X, Y);
    for (let m = 1; m <= 5; m++) {
      x += s / 5;
      y = Math.min(o + n * s - 0.05, Math.max(o + 0.05, y + (hash(k, 10 + m) - 0.5) * 0.5));
      [X, Y] = P(x, y);
      ctx.lineTo(X, Y);
    }
    ctx.strokeStyle = alpha(dark ? tint(TILE_D, 0.35) : MAT.marbleVein, 0.7);
    ctx.lineWidth = 0.028;
    ctx.stroke();
  }
}

// ---------- The walls ----------
function damask(ctx, side) {
  if (!Q.detail) return;
  const f = side === 'left' ? onLeft : onRight;
  const ink = side === 'left' ? DAMASK : shade(DAMASK, 0.08);
  for (let u = 0.25; u < 16; u += 0.8) {
    const door = inDoor(side, u, u + 0.3);
    const z0 = door ? door[2] + 0.4 : 1.4;
    f(ctx, u, z0, 0.3, 6 - z0, ink, { stroke: false });
    // A small fleur between the stripes, every other row.
    for (let z = z0 + 0.5; z < 5.8; z += 1.1) {
      if (inDoor(side, u + 0.4, u + 0.8) && z < 4.2) continue;
      onWall(ctx, side, u + 0.55, z, (g) => {
        g.beginPath();
        g.moveTo(0, -0.14); g.lineTo(0.07, 0); g.lineTo(0, 0.14); g.lineTo(-0.07, 0);
        g.closePath();
        g.fillStyle = ink;
        g.fill();
      });
    }
  }
}

// Mahogany panelling to the dado, a skirting, and casings round the doors. On
// the stair wall the panelling climbs with the stairs.
const DADO = 1.3, RAKE = 0.7;
function wainscot(ctx, side) {
  const f = side === 'left' ? onLeft : onRight;
  band(ctx, side, 0, DADO, WOOD, { dots: shade(WOOD, 0.5), density: 0.14, stroke: false });
  if (side === 'right') {
    // A dado rail that climbs with the stairs.
    const top = (x) => pitch(x) + RAKE;
    const x1 = ST.x0 + (ST.w - (6 - RAKE - stepZ(0)) / SLOPE); // where it meets the ceiling
    face(ctx, [[11.2, 0, DADO], [11.2, 0, top(11.2)], [x1, 0, 5.9], [x1, 0, 6], [11.2, 0, top(11.2) + 0.14], [11.2, 0, DADO + 0.14]], WOOD_L, { lw: 0.03, stroke: WOOD_D });
  }
  if (Q.detail) {
    for (let u = 0.2; u < 15.6; u += 1.6) {
      if (inDoor(side, u - 0.3, u + 1.6)) continue;
      f(ctx, u, 0.5, 1.3, 0.6, shade(WOOD, 0.1), { lw: 0.03, stroke: WOOD_D });
    }
  }
  band(ctx, side, 0, 0.32, WOOD_D, { stroke: false });
  band(ctx, side, DADO - 0.04, DADO + 0.1, WOOD_L, { stroke: false });
  for (const [a, b, h] of OPEN[side]) {
    f(ctx, a - 0.24, 0, 0.24, h + 0.24, WOOD, LINE);
    f(ctx, b, 0, 0.24, h + 0.24, WOOD, LINE);
    f(ctx, a - 0.38, h + 0.24, b - a + 0.76, 0.18, WOOD_D, LINE);
  }
}

// ---------- The staircase ----------
// One piece, drawn before anyone standing on it; the balustrade is separate
// and drawn after them, since it's in front.
function staircase(ctx) {
  // The landing at the top, and the nook under it.
  box(ctx, 0.05, 0.1, 6.0, ST.x0 - 0.05, SY - 0.1, 1.1, WOOD, { top: WOOD_L });
  // The stepped side, panelled, with a cupboard under the stairs.
  const side = [[ST.x0 + ST.w, SY, 0]];
  for (let i = 0; i < ST.n; i++) side.push([stepX(i) + STEP, SY, stepZ(i)], [stepX(i), SY, stepZ(i)]);
  side.push([ST.x0, SY, 0]);
  face(ctx, side, WOOD_D, { dots: shade(WOOD_D, 0.5), density: 0.2 });
  // The string under the steps.
  const s0 = ST.x0 + ST.w, s1 = ST.x0 + STEP, zs = pitch(s1);
  face(ctx, [[s0, SY, 0], [s0, SY, 0.1], [s1, SY, zs - 0.62], [ST.x0, SY, zs - 0.62], [ST.x0, SY, zs - 1.05], [s1, SY, zs - 1.05], [s0 - 0.58, SY, 0]], WOOD, LINE);
  if (Q.detail) {
    for (const [a, b] of [[4.1, 5.9], [6.1, 7.7], [7.9, 9.2]]) {
      const top = (x) => pitch(x) - 1.4;
      face(ctx, [[a, SY, 0.45], [b, SY, 0.45], [b, SY, top(b)], [a, SY, top(a)]], shade(WOOD_D, 0.12), { lw: 0.03, stroke: shade(WOOD_D, 0.35) });
    }
  }
  // The cupboard under the stairs (it is not a secret passage).
  face(ctx, [[2.1, SY, 0], [3.7, SY, 0], [3.7, SY, 2.9], [2.1, SY, 2.9]], WOOD_D, LINE);
  face(ctx, [[2.3, SY, 0], [3.5, SY, 0], [3.5, SY, 2.7], [2.3, SY, 2.7]], shade(WOOD, 0.15), { lw: 0.03, dots: shade(WOOD, 0.5), density: 0.2 });
  disc(ctx, 3.3, SY + 0.02, 1.25, 0.07, GOLD, { lw: 0.02 });
  // A mouse hole in the skirting.
  flat(ctx, 'right', 8.7, SY + 0.01, 0, (g) => {
    g.beginPath();
    g.moveTo(-0.2, 0); g.lineTo(-0.2, -0.12); g.arc(0, -0.12, 0.2, Math.PI, 0); g.lineTo(0.2, 0);
    g.closePath();
    g.fillStyle = C.black;
    g.fill();
  });

  // Treads and risers, back to front, with the carpet and its brass rods.
  for (let i = ST.n - 1; i >= 0; i--) {
    const x0 = stepX(i), x1 = x0 + STEP, z = stepZ(i), zb = i ? stepZ(i - 1) : 0;
    face(ctx, [[x1, 0.1, zb], [x1, SY, zb], [x1, SY, z], [x1, 0.1, z]], WOOD, LINE);
    face(ctx, [[x0, 0.1, z], [x1, 0.1, z], [x1, SY, z], [x0, SY, z]], WOOD_L, LINE);
    face(ctx, [[x1, RUN[0], zb], [x1, RUN[1], zb], [x1, RUN[1], z], [x1, RUN[0], z]], shade(RUNNER, 0.18), { lw: 0.03, dots: shade(RUNNER, 0.5), density: 0.18 });
    face(ctx, [[x0, RUN[0], z], [x1, RUN[0], z], [x1, RUN[1], z], [x0, RUN[1], z]], RUNNER, { lw: 0.03, dots: shade(RUNNER, 0.45), density: 0.12 });
    if (Q.detail) {
      // Gold edging down the carpet, and a brass rod in each step's corner.
      ctx.beginPath();
      for (const yy of [RUN[0] + 0.12, RUN[1] - 0.12]) {
        const a = P(x0, yy, z), b = P(x1, yy, z), c = P(x1, yy, zb);
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]);
      }
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 0.035;
      ctx.stroke();
      stick(ctx, [x0 + 0.04, RUN[0] - 0.08, z + 0.04], [x0 + 0.04, RUN[1] + 0.08, z + 0.04], GOLD, 0.05);
    }
  }
}

function balustrade(ctx) {
  const Y = SY - 0.16;
  const rail = (x) => pitch(x) + RAIL;
  // Balusters, two to a step.
  for (let i = ST.n - 1; i >= 0; i--) {
    for (const f of [0.3, 0.75]) {
      const x = stepX(i) + STEP * f;
      stick(ctx, [x, Y, stepZ(i)], [x, Y, rail(x)], WOOD_D, 0.06);
    }
  }
  // The handrail, and a newel post at each end.
  const top = ST.x0 + 0.25;
  stick(ctx, [ST.x0 + ST.w + 0.1, Y, rail(ST.x0 + ST.w + 0.1)], [top, Y, rail(top)], WOOD, 0.16);
  box(ctx, top - 0.2, Y - 0.2, stepZ(ST.n - 1), 0.4, 0.4, 1.3, WOOD_D);
  disc(ctx, top, Y, stepZ(ST.n - 1) + 1.3, 0.24, WOOD, LINE);
  const nx = ST.x0 + ST.w + 0.15;
  box(ctx, nx - 0.22, Y - 0.22, 0, 0.44, 0.44, 1.85, WOOD_D, { top: WOOD });
  box(ctx, nx - 0.3, Y - 0.3, 1.85, 0.6, 0.6, 0.14, WOOD);
  face(ctx, [[nx + 0.22, Y - 0.12, 0.4], [nx + 0.22, Y + 0.12, 0.4], [nx + 0.22, Y + 0.12, 1.5], [nx + 0.22, Y - 0.12, 1.5]], shade(WOOD, 0.2), { lw: 0.03 });
}

// ---------- The rug ----------
// Flat shapes lying level (on the floor, or a table at z), in world units,
// centred on (x, y).
function onFloor(ctx, x, y, draw, z = 0.01) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.transform(1, 0.5, -1, 0.5, X, Y);
  draw(ctx);
  ctx.restore();
}
const RUG = { x: 8, y: 9.5, r: 3.2 };
function rug(ctx) {
  const { x, y, r } = RUG;
  if (Q.detail) {
    // The fringe.
    ctx.beginPath();
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      const p = P(x + Math.cos(a) * (r - 0.05), y + Math.sin(a) * (r - 0.05), 0.01), q = P(x + Math.cos(a) * (r + 0.16), y + Math.sin(a) * (r + 0.16), 0.01);
      ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
    }
    ctx.strokeStyle = INK.bone;
    ctx.lineWidth = 0.035;
    ctx.stroke();
  }
  disc(ctx, x, y, 0.01, r, RUNNER, { dots: shade(RUNNER, 0.5), density: 0.14, lw: 0.05 });
  disc(ctx, x, y, 0.01, r - 0.42, GOLD, { stroke: false });
  disc(ctx, x, y, 0.01, r - 0.52, INK.deepPlum, { dots: shade(INK.deepPlum, 0.5), density: 0.16, stroke: false });
  onFloor(ctx, x, y, (g) => {
    // Leaves round the field, and dots round the border.
    for (let i = 0; i < 12; i++) {
      g.save();
      g.rotate((i / 12) * Math.PI * 2);
      g.beginPath();
      g.ellipse(1.85, 0, 0.36, 0.13, 0, 0, Math.PI * 2);
      g.fillStyle = i % 2 ? MAT.velvet : GOLD_D;
      g.fill();
      g.restore();
    }
    if (Q.detail) {
      g.fillStyle = INK.bone;
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        g.beginPath();
        g.arc(Math.cos(a) * (r - 0.22), Math.sin(a) * (r - 0.22), 0.06, 0, Math.PI * 2);
        g.fill();
      }
    }
  });
  // The family crest: a gold G on bone.
  disc(ctx, x, y, 0.01, 1.2, GOLD, { lw: 0.04 });
  disc(ctx, x, y, 0.01, 1.02, INK.bone, { stroke: false, dots: tint(GOLD, 0.4), density: 0.2 });
  paintText(ctx, 'floor', x + 0.05, y + 0.1, 'G', 1.5, MAT.velvet);
}

// ---------- Portraits ----------
// Sitters, painted in a frame's own units: (0, 0) is the middle of the
// canvas, y runs down. Their eyes are painted separately (they move).
const SKIN_L = CAST.lord.look.skin;
function head(g, x, y, rx, ry, skin) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  paint(g, skin, { lw: 0.035 });
}
function whites(g, eyes, rx = 0.08, ry = 0.05) {
  for (const [ex, ey] of eyes) {
    g.beginPath();
    g.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2);
    g.fillStyle = INK.bone;
    g.fill();
  }
}
function chops(g, x, y, s) { // white mutton chops, the family look (y: the top of them)
  g.beginPath();
  g.moveTo(x - 0.42 * s, y);
  g.quadraticCurveTo(x - 0.46 * s, y + 0.42 * s, x - 0.16 * s, y + 0.36 * s);
  g.quadraticCurveTo(x, y + 0.2 * s, x + 0.16 * s, y + 0.36 * s);
  g.quadraticCurveTo(x + 0.46 * s, y + 0.42 * s, x + 0.42 * s, y);
  g.lineTo(x + 0.3 * s, y + 0.02 * s);
  g.quadraticCurveTo(x + 0.28 * s, y + 0.22 * s, x + 0.1 * s, y + 0.18 * s);
  g.lineTo(x - 0.1 * s, y + 0.18 * s);
  g.quadraticCurveTo(x - 0.28 * s, y + 0.22 * s, x - 0.3 * s, y + 0.02 * s);
  g.closePath();
  paint(g, INK.bone, { lw: 0.025 * s + 0.01 });
}
function brows(g, x, y, s) { // bushy, and cross
  g.beginPath();
  g.moveTo(x - 0.3 * s, y - 0.1 * s); g.lineTo(x - 0.05 * s, y + 0.02 * s);
  g.moveTo(x + 0.3 * s, y - 0.1 * s); g.lineTo(x + 0.05 * s, y + 0.02 * s);
  g.strokeStyle = INK.bone;
  g.lineWidth = 0.07 * s;
  g.lineCap = 'round';
  g.stroke();
}
const LORD_EYES = [[-0.17, -0.36], [0.17, -0.36]];
function lordArt(g) {
  g.beginPath(); // a velvet swag behind him
  g.moveTo(-1, -1.15); g.lineTo(-0.1, -1.15); g.quadraticCurveTo(-0.5, -0.5, -1, 0.05); g.closePath();
  paint(g, MAT.velvet, { stroke: false });
  g.beginPath(); // coat
  g.moveTo(-0.98, 1.15); g.quadraticCurveTo(-0.92, 0.25, 0, 0.18); g.quadraticCurveTo(0.92, 0.25, 0.98, 1.15);
  g.closePath();
  paint(g, MAT.velvetDark, { lw: 0.04 });
  g.beginPath(); // cravat
  g.moveTo(-0.2, 0.18); g.lineTo(0.2, 0.18); g.lineTo(0.1, 0.62); g.lineTo(0, 0.72); g.lineTo(-0.1, 0.62);
  g.closePath();
  paint(g, INK.bone, { lw: 0.03 });
  g.beginPath(); // a medal for taxidermy
  g.arc(0.45, 0.62, 0.1, 0, Math.PI * 2);
  paint(g, GOLD, { lw: 0.03 });
  head(g, -0.46, -0.28, 0.08, 0.13, SKIN_L); // ears
  head(g, 0.46, -0.28, 0.08, 0.13, SKIN_L);
  head(g, 0, -0.3, 0.45, 0.53, SKIN_L);
  g.beginPath(); // a shine on the dome
  g.ellipse(-0.14, -0.66, 0.14, 0.05, -0.35, 0, Math.PI * 2);
  g.fillStyle = alpha(C.white, 0.7);
  g.fill();
  chops(g, 0, -0.22, 1);
  whites(g, LORD_EYES, 0.13, 0.085);
  for (const [ex, ey] of LORD_EYES) { // heavy lids: suspicious
    g.beginPath();
    g.ellipse(ex, ey, 0.13, 0.085, 0, Math.PI * 1.08, Math.PI * 1.92);
    g.strokeStyle = C.ink; g.lineWidth = 0.03; g.stroke();
  }
  brows(g, 0, -0.5, 1.1);
  g.beginPath(); // nose
  g.ellipse(0, -0.2, 0.075, 0.11, 0, 0, Math.PI * 2);
  paint(g, mix(SKIN_L, INK.oxblood, 0.35), { lw: 0.03 });
  g.beginPath(); // a frown, under the chops' mustache
  g.moveTo(-0.1, 0.06); g.quadraticCurveTo(0, 0.01, 0.1, 0.06);
  g.strokeStyle = C.ink; g.lineWidth = 0.035; g.stroke();
}
const UNCLE_EYES = [[-0.13, -0.18], [0.13, -0.18]];
function uncleArt(g) { // Great-Uncle Algernon: a mustache, a collar, a nose
  g.beginPath();
  g.moveTo(-0.6, 0.75); g.quadraticCurveTo(-0.55, 0.2, 0, 0.16); g.quadraticCurveTo(0.55, 0.2, 0.6, 0.75);
  g.closePath();
  paint(g, INK.verdigris, { lw: 0.035 });
  g.fillStyle = INK.bone;
  g.fillRect(-0.16, 0.12, 0.32, 0.14);
  head(g, 0, -0.16, 0.3, 0.36, SKIN[1]);
  g.beginPath();
  g.ellipse(0, -0.44, 0.3, 0.12, 0, Math.PI, 0);
  g.fillStyle = HAIR[4]; g.fill();
  whites(g, UNCLE_EYES, 0.065, 0.04);
  g.beginPath();
  g.arc(0, -0.04, 0.08, 0, Math.PI * 2);
  paint(g, mix(SKIN[1], INK.oxblood, 0.5), { lw: 0.03 });
  g.beginPath(); // the mustache, both ways at once
  g.moveTo(0, 0.05); g.quadraticCurveTo(-0.25, -0.02, -0.4, 0.12); g.quadraticCurveTo(-0.2, 0.12, 0, 0.1);
  g.quadraticCurveTo(0.2, 0.12, 0.4, 0.12); g.quadraticCurveTo(0.25, -0.02, 0, 0.05);
  paint(g, HAIR[4], { lw: 0.025 });
}
const AGATHA_EYES = [[-0.12, -0.1], [0.12, -0.1]];
function agathaArt(g) { // Lady Agatha, with a stuffed bird in her hair
  g.beginPath();
  g.moveTo(-0.6, 0.7); g.quadraticCurveTo(-0.5, 0.22, 0, 0.2); g.quadraticCurveTo(0.5, 0.22, 0.6, 0.7);
  g.closePath();
  paint(g, INK.deepPlum, { lw: 0.035 });
  g.fillStyle = INK.bone;
  for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(-0.18 + i * 0.06, 0.26 + Math.sin((i / 6) * Math.PI) * 0.06, 0.03, 0, Math.PI * 2); g.fill(); }
  g.beginPath(); // a tower of hair
  g.ellipse(0, -0.42, 0.3, 0.34, 0, 0, Math.PI * 2);
  paint(g, HAIR[4], { lw: 0.03 });
  head(g, 0, -0.08, 0.26, 0.3, SKIN[0]);
  whites(g, AGATHA_EYES, 0.06, 0.035);
  g.beginPath();
  g.ellipse(0, 0.1, 0.05, 0.025, 0, 0, Math.PI * 2);
  g.fillStyle = INK.oxblood; g.fill();
  g.beginPath(); // the bird (stuffed, of course)
  g.ellipse(0.12, -0.66, 0.13, 0.08, -0.3, 0, Math.PI * 2);
  paint(g, INK.verdigris, { lw: 0.025 });
  g.beginPath();
  g.moveTo(0.24, -0.72); g.lineTo(0.34, -0.7); g.lineTo(0.24, -0.66);
  g.fillStyle = GOLD; g.fill();
}
const BABY_EYES = [[-0.11, -0.08], [0.11, -0.08]];
function babyArt(g) { // the Lord, aged one, already with the chops
  g.beginPath();
  g.moveTo(-0.55, 0.75); g.quadraticCurveTo(-0.45, 0.2, 0, 0.18); g.quadraticCurveTo(0.45, 0.2, 0.55, 0.75);
  g.closePath();
  paint(g, INK.bone, { lw: 0.035, dots: tint(INK.verdigris, 0.3), density: 0.2 });
  head(g, 0, -0.12, 0.34, 0.34, SKIN_L);
  chops(g, 0, -0.04, 0.8);
  whites(g, BABY_EYES, 0.06, 0.04);
  brows(g, 0, -0.2, 0.7);
  g.beginPath();
  g.arc(0, 0.06, 0.05, 0.1, Math.PI - 0.1, true);
  g.strokeStyle = C.ink; g.lineWidth = 0.03; g.stroke();
}
function bearArt(g) { // the Lord and his best friend, 1974 (before the stuffing)
  g.beginPath();
  g.moveTo(-1.1, 0.75); g.lineTo(-1.1, 0.35); g.quadraticCurveTo(0, 0.2, 1.1, 0.4); g.lineTo(1.1, 0.75);
  g.closePath();
  paint(g, mix(INK.verdigris, INK.stormNavy, 0.4), { stroke: false });
  for (const [tx, s] of [[-0.85, 0.5], [-0.62, 0.38], [0.9, 0.45]]) {
    g.beginPath();
    g.moveTo(tx - 0.16 * s * 2, 0.4); g.lineTo(tx, 0.4 - s * 1.4); g.lineTo(tx + 0.16 * s * 2, 0.4);
    g.fillStyle = mix(INK.verdigris, INK.stormNavy, 0.6); g.fill();
  }
  g.beginPath(); // the bear
  g.ellipse(0.3, 0.12, 0.34, 0.5, 0, 0, Math.PI * 2);
  paint(g, MAT.fur, { lw: 0.03 });
  head(g, 0.3, -0.45, 0.22, 0.2, MAT.fur);
  head(g, 0.14, -0.62, 0.07, 0.07, MAT.fur);
  head(g, 0.46, -0.62, 0.07, 0.07, MAT.fur);
  head(g, 0.3, -0.39, 0.09, 0.07, tint(MAT.fur, 0.35));
  g.fillStyle = C.ink;
  for (const ex of [0.22, 0.38]) { g.beginPath(); g.arc(ex, -0.5, 0.025, 0, Math.PI * 2); g.fill(); }
  g.beginPath(); // the Lord, tiny, arm in arm
  g.moveTo(-0.38, 0.62); g.lineTo(-0.36, 0.05); g.lineTo(-0.08, 0.05); g.lineTo(-0.06, 0.62);
  g.closePath();
  paint(g, MAT.velvetDark, { lw: 0.03 });
  head(g, -0.22, -0.1, 0.13, 0.15, SKIN_L);
  chops(g, -0.22, -0.08, 0.35);
  g.beginPath(); // the bear's arm round his shoulders
  g.moveTo(0.05, -0.02); g.quadraticCurveTo(-0.2, -0.06, -0.36, 0.08);
  g.strokeStyle = C.ink; g.lineWidth = 0.13; g.lineCap = 'round'; g.stroke();
  g.strokeStyle = MAT.fur; g.lineWidth = 0.08; g.stroke();
}
// Where each portrait hangs: side, canvas (u, z, w, h), ground, art, its
// eyes (in its own units) and a brass plaque.
const PORTRAITS = [
  { side: 'left', u: 3.3, z: 2.3, w: 2.0, h: 2.3, ground: mix(INK.stormNavy, INK.deepPlum, 0.45), art: lordArt, eyes: LORD_EYES, pupil: 0.062, plaque: 'LORD GOOSEWORTH', lord: true },
  { side: 'right', u: 9.3, z: 2.95, w: 1.2, h: 1.5, ground: mix(INK.oxblood, INK.stormNavy, 0.55), art: uncleArt, eyes: UNCLE_EYES, pupil: 0.032, plaque: 'UNCLE ALGERNON' },
  { side: 'right', u: 7.2, z: 4.4, w: 1.2, h: 1.35, ground: mix(INK.verdigris, INK.stormNavy, 0.55), art: agathaArt, eyes: AGATHA_EYES, pupil: 0.03 },
  { side: 'left', u: 11.3, z: 3.0, w: 1.15, h: 1.4, ground: mix(INK.deepPlum, INK.stormNavy, 0.3), art: babyArt, eyes: BABY_EYES, pupil: 0.03, plaque: 'THE LORD, AGED 1' },
  { side: 'left', u: 12.9, z: 2.25, w: 2.2, h: 1.5, ground: mix(INK.verdigris, INK.stormNavy, 0.62), art: bearArt, eyes: [], plaque: 'BEST FRIENDS, 1974' },
];
const mid = (p) => [p.u + p.w / 2, p.z + p.h / 2];
function hangPortraits(R) {
  for (const p of PORTRAITS) {
    const [cu, cz] = mid(p);
    painting(R, p.side, p.u, p.z, p.w, p.h, p.ground, (ctx) => onWall(ctx, p.side, cu, cz, p.art));
    if (!p.plaque) continue;
    R.decor((ctx) => {
      const f = p.side === 'left' ? onLeft : onRight;
      const w = Math.min(p.w, p.plaque.length * 0.105 + 0.2);
      f(ctx, cu - w / 2, p.z - 0.52, w, 0.24, GOLD, { lw: 0.025 });
      if (Q.detail) paintText(ctx, p.side, cu, p.z - 0.4, p.plaque, 0.15, C.ink, 'Rethink Sans');
    });
  }
}

// Where the painted eyes look, as (-1..1, -1..1) across their whites. The
// Lord's slide slowly side to side and snap to look straight out at you when
// lightning strikes. The others watch whoever is walking through.
const flashing = (t) => storm.flash(t) > 0.04 || pastK(t) > 0.05;
function lordLook(t) {
  if (flashing(t)) return [0, 0];
  return [clamp(Math.sin(t * 0.45) * 1.7, -1, 1), 0.25 + Math.sin(t * 0.23) * 0.2];
}
function makeWatchers(R) {
  const [ox, oy, oz] = R.origin;
  let at = -1, here = [];
  const people = (t) => {
    if (t === at) return here;
    at = t;
    here = [];
    for (const w of R.walkers) {
      if (w.ghost) continue;
      const p = w.at(t);
      if (R.contains(p.x, p.y, p.z || 0)) here.push([p.x - ox, p.y - oy, (p.z || 0) - oz]);
    }
    return here;
  };
  return (p, t) => {
    if (p.lord) return lordLook(t);
    if (flashing(t)) return [0, 0];
    const [cu, cz] = mid(p);
    const [X, Y] = p.side === 'left' ? P(0, cu, cz) : P(cu, 0, cz);
    let best = null, d = Infinity;
    for (const [x, y, z] of people(t)) {
      const [wx, wy] = P(x, y, z + 2);
      const dd = Math.hypot(wx - X, wy - Y);
      if (dd < d) { d = dd; best = [wx - X, wy - Y]; }
    }
    if (!best) { const [lx, ly] = lordLook(t - 1.5); return [lx * 0.6, ly]; }
    return [clamp(best[0] / 4, -1, 1), clamp(best[1] / 5, -0.3, 1)];
  };
}
function pupils(ctx, p, look, t) {
  if (!p.eyes.length) return;
  const [cu, cz] = mid(p);
  const blink = p.lord && (t % 6.3) < 0.14;
  onWall(ctx, p.side, cu, cz, (g) => {
    for (const [ex, ey] of p.eyes) {
      const rx = p.pupil * 1.9, ry = p.pupil * 1.2;
      if (blink) {
        g.beginPath();
        g.ellipse(ex, ey, rx + 0.01, ry + 0.012, 0, 0, Math.PI * 2);
        g.fillStyle = SKIN_L;
        g.fill();
        continue;
      }
      g.beginPath();
      g.arc(ex + look[0] * (rx - p.pupil), ey + look[1] * (ry - p.pupil * 0.6), p.pupil, 0, Math.PI * 2);
      g.fillStyle = C.ink;
      g.fill();
    }
  });
}

// ---------- On the walls ----------
const BOAR = { u: 8, z: 5.05 };
function boar(ctx) { // over the billiard room door: stuffed, and dressed for the party
  const f = onLeft;
  f(ctx, BOAR.u - 0.5, BOAR.z - 0.6, 1.0, 1.15, WOOD, { lw: 0.04, dots: shade(WOOD, 0.5), density: 0.2 });
  const [X, Y] = P(0.3, BOAR.u, BOAR.z);
  ctx.save();
  ctx.translate(X, Y);
  const fur = MAT.furDark;
  ctx.beginPath(); // ears
  ctx.moveTo(-0.34, -0.2); ctx.lineTo(-0.3, -0.52); ctx.lineTo(-0.12, -0.28);
  ctx.moveTo(0.34, -0.2); ctx.lineTo(0.3, -0.52); ctx.lineTo(0.12, -0.28);
  paint(ctx, fur, { lw: 0.035 });
  ellipse(ctx, 0, -0.08, 0.36, 0.3);
  paint(ctx, fur, { lw: 0.04, dots: shade(fur, 0.5), density: 0.25 });
  ellipse(ctx, 0, 0.14, 0.2, 0.14);
  paint(ctx, mix(fur, INK.bone, 0.3), { lw: 0.035 });
  ctx.fillStyle = C.ink;
  for (const dx of [-0.07, 0.07]) { ellipse(ctx, dx, 0.15, 0.03, 0.045); ctx.fill(); }
  ctx.beginPath(); // tusks
  ctx.moveTo(-0.17, 0.2); ctx.quadraticCurveTo(-0.3, 0.12, -0.26, -0.02);
  ctx.moveTo(0.17, 0.2); ctx.quadraticCurveTo(0.3, 0.12, 0.26, -0.02);
  ctx.strokeStyle = INK.bone; ctx.lineWidth = 0.05; ctx.lineCap = 'round'; ctx.stroke();
  for (const dx of [-0.14, 0.14]) { // glass eyes
    ellipse(ctx, dx, -0.13, 0.055, 0.055);
    paint(ctx, GOLD, { lw: 0.025 });
    ctx.beginPath(); ctx.arc(dx, -0.13, 0.025, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
  }
  ctx.beginPath(); // a party hat, for the birthday
  ctx.moveTo(-0.02, -0.34); ctx.lineTo(0.2, -0.84); ctx.lineTo(0.3, -0.27);
  ctx.closePath();
  paint(ctx, C.pink, { lw: 0.035, dots: GOLD, density: 0.4 });
  ctx.beginPath(); ctx.arc(0.2, -0.86, 0.06, 0, Math.PI * 2); ctx.fillStyle = GOLD; ctx.fill();
  ctx.restore();
}
function signs(ctx) {
  // No betting (the billiard room is through here).
  onLeft(ctx, 7.05, 4.12, 1.9, 0.28, GOLD, { lw: 0.03 });
  if (Q.detail) paintText(ctx, 'left', 8, 4.26, 'NO BETTING, RUPERT', 0.15, C.ink, 'Rethink Sans');
  // Tonight's menu, over the dining room door.
  onRight(ctx, 12.95, 4.25, 1.1, 1.45, GOLD, { lw: 0.03 });
  onRight(ctx, 13.05, 4.35, 0.9, 1.25, INK.bone, { lw: 0.02 });
  if (Q.detail) {
    paintText(ctx, 'right', 13.5, 5.38, 'MENU', 0.19, INK.oxblood);
    const lines = ['SOUP', 'ROAST GOOSE', 'BEEF', 'TRIFLE'];
    lines.forEach((s, i) => paintText(ctx, 'right', 13.5, 5.1 - i * 0.2, s, 0.12, C.ink, 'Rethink Sans'));
    face(ctx, [[13.12, 0, 4.9], [13.88, 0, 4.9]], null, { lw: 0.03, stroke: INK.oxblood }); // (crossed out)
  }
}
// A candle sconce on a wall: a brass plate and a cup (the candle is a light).
function sconce(ctx, side, u) {
  const f = side === 'left' ? onLeft : onRight;
  f(ctx, u - 0.15, 2.0, 0.3, 0.75, GOLD, { lw: 0.03, dots: GOLD_D, density: 0.3 });
  const [x, y] = side === 'left' ? [0.18, u] : [u, 0.18];
  disc(ctx, x, y, 2.42, 0.13, GOLD, { lw: 0.03 });
  stick(ctx, side === 'left' ? [0.02, u, 2.25] : [u, 0.02, 2.25], [x, y, 2.4], GOLD, 0.04);
}
const SCONCES = [['left', 6.12], ['right', 11.78], ['right', 15.3]];

// ---------- The grandfather clock ----------
const CLOCK = { x: 1.0, y: 10.4 };
const BONGS = 12, BONG_EVERY = 0.8;
const loopT = (t) => ((t % LOOP) + LOOP) % LOOP;
// The midnight strike: which bong (0..11) and how long ago, or null.
function sinceBong(t) {
  const tt = loopT(t) - MIDNIGHT;
  if (tt < 0 || tt > BONGS * BONG_EVERY + 1.5) return null;
  const k = Math.min(BONGS - 1, Math.floor(tt / BONG_EVERY));
  return { k, age: tt - k * BONG_EVERY };
}
const clockShake = (t) => { const b = sinceBong(t); return b && b.age < 0.6 ? Math.sin(b.age * 70) * 0.05 * Math.exp(-b.age * 6) : 0; };
// Minutes past eleven: ten to twelve as the evening starts, midnight at
// MIDNIGHT (the murder), and on it goes.
const minutes = (t) => 50 + (loopT(t) * 10) / MIDNIGHT;
function hand(g, a, len, w) {
  g.beginPath();
  g.moveTo(-Math.sin(a) * 0.05, Math.cos(a) * 0.05);
  g.lineTo(Math.sin(a) * len, -Math.cos(a) * len);
  g.strokeStyle = C.ink; g.lineWidth = w; g.lineCap = 'round'; g.stroke();
}
function grandfather(ctx, t) {
  const { x, y } = CLOCK;
  ctx.save();
  ctx.translate(clockShake(t), 0);
  box(ctx, x - 0.45, y - 0.45, 0, 0.9, 0.9, 0.55, WOOD_D, { top: WOOD });
  box(ctx, x - 0.35, y - 0.35, 0.55, 0.7, 0.7, 1.75, WOOD);
  flat(ctx, 'left', x + 0.35, y, 1.45, (g) => { // the trunk's window, and the pendulum
    g.beginPath(); g.roundRect(-0.24, -0.62, 0.48, 1.18, 0.2);
    paint(g, mix(INK.stormNavy, INK.deepPlum, 0.3), { lw: 0.03 });
    g.save();
    g.translate(0, -0.55);
    g.rotate(Math.sin(t * Math.PI) * 0.16);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 0.88);
    g.strokeStyle = GOLD; g.lineWidth = 0.035; g.stroke();
    g.beginPath(); g.arc(0, 0.9, 0.11, 0, Math.PI * 2);
    paint(g, GOLD, { lw: 0.025 });
    g.restore();
    g.beginPath(); g.moveTo(-0.17, -0.32); g.lineTo(-0.08, -0.5); g.moveTo(-0.17, -0.1); g.lineTo(-0.02, -0.4);
    g.strokeStyle = alpha(C.white, 0.35); g.lineWidth = 0.025; g.stroke();
  });
  box(ctx, x - 0.45, y - 0.45, 2.3, 0.9, 0.9, 0.85, WOOD_D, { top: WOOD });
  flat(ctx, 'left', x + 0.45, y, 2.72, (g) => { // the dial
    g.beginPath(); g.arc(0, 0, 0.36, 0, Math.PI * 2); paint(g, GOLD, { lw: 0.03 });
    g.beginPath(); g.arc(0, 0, 0.29, 0, Math.PI * 2); paint(g, INK.bone, { lw: 0.02 });
    if (Q.detail) {
      g.fillStyle = C.ink;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2, r = i % 3 ? 0.025 : 0.04;
        g.beginPath(); g.arc(Math.sin(a) * 0.235, -Math.cos(a) * 0.235, r, 0, Math.PI * 2); g.fill();
      }
    }
    const m = minutes(t);
    hand(g, (((11 + m / 60) % 12) / 12) * Math.PI * 2, 0.14, 0.05);
    hand(g, ((m % 60) / 60) * Math.PI * 2, 0.24, 0.03);
    g.beginPath(); g.arc(0, 0, 0.035, 0, Math.PI * 2); g.fillStyle = GOLD; g.fill();
  });
  box(ctx, x - 0.4, y - 0.4, 3.15, 0.8, 0.8, 0.12, WOOD);
  for (const [dx, dy] of [[0.3, -0.3], [0.3, 0.3], [-0.3, 0.3]]) {
    const [X, Y] = P(x + dx, y + dy, 3.35);
    ctx.beginPath(); ctx.arc(X, Y, 0.075, 0, Math.PI * 2); paint(ctx, GOLD, { lw: 0.025 });
  }
  ctx.restore();
}
// BONG, twelve times, rising off the clock.
function bongs(ctx, t) {
  const tt = loopT(t) - MIDNIGHT;
  if (tt < 0 || tt > BONGS * BONG_EVERY + 1.6) return;
  for (let k = 0; k < BONGS; k++) {
    const age = tt - k * BONG_EVERY;
    if (age < 0 || age > 1.6) continue;
    const q = age / 1.6;
    const [X, Y] = P(CLOCK.x + 0.4, CLOCK.y + (k % 2 ? -0.6 : 0.6), 3.8 + q * 1.4);
    ctx.save();
    ctx.globalAlpha *= 1 - q * q;
    ctx.translate(X, Y);
    ctx.rotate((k % 2 ? 1 : -1) * 0.12);
    for (const [o, c] of [[0.05, C.ink], [0, INK.bone]]) {
      ctx.font = `${0.5 * 40}px "Bagel Fat One", "Arial Black", sans-serif`;
      ctx.save(); ctx.scale(1 / 40, 1 / 40);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = c; ctx.fillText('BONG', o * 40, o * 40);
      ctx.restore();
    }
    ctx.restore();
  }
}

// ---------- The cat on the clock ----------
// The only one in the house who sees the ghost: every flash puts its fur on
// end. The midnight bongs make it jump, twelve times.
function catNow(t) {
  const b = sinceBong(t);
  const fright = clamp(Math.max(pastK(t) * 1.3, b && b.age < 0.7 ? 1 - b.age / 0.7 : 0));
  const hop = b ? Math.sin(clamp(b.age / 0.4) * Math.PI) * 0.3 : 0;
  return { x: CLOCK.x, y: CLOCK.y, z: 3.27 + hop, fright };
}
const CAT = mix(C.black, INK.deepPlum, 0.2);
function cat(ctx, t) {
  const c = catNow(t), k = c.fright;
  const [X, Y] = P(c.x, c.y, c.z);
  ctx.save();
  ctx.translate(X, Y);
  const ry = 0.26 + k * 0.08;
  // tail: hanging down the clock's face and swishing, or straight up in a fright
  ctx.beginPath();
  if (k > 0.3) { ctx.moveTo(-0.16, -0.2); ctx.quadraticCurveTo(-0.34, -0.5, -0.26, -0.86); }
  else { const s = Math.sin(t * 1.7) * 0.12; ctx.moveTo(-0.1, -0.05); ctx.quadraticCurveTo(0.05 + s, 0.25, 0.12 + s * 1.5, 0.52); }
  ctx.lineCap = 'round';
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.13 + k * 0.08; ctx.stroke(); }
  ctx.strokeStyle = CAT; ctx.lineWidth = 0.08 + k * 0.08; ctx.stroke();
  // body, with its fur on end when it's scared
  ctx.beginPath();
  if (k > 0.3) {
    for (let i = 0; i <= 18; i++) {
      const a = (i / 18) * Math.PI * 2, r = i % 2 ? 1 : 1.18;
      const px = Math.cos(a) * 0.22 * r, py = -ry - 0.02 + Math.sin(a) * ry * r;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
  } else ctx.ellipse(0, -ry, 0.2, ry, 0, 0, Math.PI * 2);
  paint(ctx, CAT, { lw: 0.035 });
  const hy = -ry * 2 - 0.08;
  ctx.beginPath(); // head and ears
  ctx.arc(0.07, hy, 0.15, 0, Math.PI * 2);
  ctx.moveTo(-0.06, hy - 0.08); ctx.lineTo(-0.03, hy - 0.28); ctx.lineTo(0.06, hy - 0.13);
  ctx.moveTo(0.1, hy - 0.13); ctx.lineTo(0.2, hy - 0.28); ctx.lineTo(0.21, hy - 0.06);
  paint(ctx, CAT, { lw: 0.035 });
  if (Q.detail) catEyes(ctx, 0.07, hy, k, t);
  ctx.restore();
}
function catEyes(ctx, x, y, k, t) {
  const blink = k < 0.2 && (t % 5.3) < 0.15;
  for (const dx of [-0.055, 0.075]) {
    ctx.beginPath();
    if (blink) { ctx.moveTo(x + dx - 0.035, y); ctx.lineTo(x + dx + 0.035, y); ctx.strokeStyle = INK.candleGold; ctx.lineWidth = 0.02; ctx.stroke(); continue; }
    ctx.ellipse(x + dx, y, 0.035 + k * 0.02, 0.028 + k * 0.03, 0, 0, Math.PI * 2);
    ctx.fillStyle = INK.candleGold; ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + dx + 0.005, y, 0.008 + k * 0.01, 0.024 + k * 0.02, 0, 0, Math.PI * 2);
    ctx.fillStyle = C.black; ctx.fill();
  }
}

// ---------- The suit of armor ----------
// Its three spots (from the greybox), and its plinth at the first, where a
// sign tells it to stay.
const SPOT = { A: [3.5, 12.8], B: [6, 13.4], C: [2.6, 9.6] };
const PLINTH_H = 0.28;
// Its evening. It only ever moves when nobody can see: in a flash of
// lightning, or in the dark. In the blackout it sneaks over to the clock
// (the big flash at 85 catches it on tiptoe), and midnight's first BONG
// sends it clanking back to its plinth.
const [S0, S1, S2, S3, , S5, S6, S7] = storm.strikes.map((s) => s.t);
const ARMOR = [
  { t: 0, at: 'A', pose: 'sword', dir: 'r' },
  { t: S0, at: 'C', pose: 'scratch', dir: 'l' },
  { t: S1, at: 'B', pose: 'teacup', dir: 'r' },
  { t: S2, at: 'A', pose: 'salute', dir: 'r' },
  { t: S3, at: 'B', pose: 'sword', dir: 'l' },
  { t: 82.3, from: 'B', to: 'C', dur: 4, pose: 'tiptoe' },
  { t: 86.3, at: 'C', pose: 'peer', dir: 'l' },
  { t: MIDNIGHT, from: 'C', to: 'A', dur: 1.1, pose: 'run' },
  { t: MIDNIGHT + 1.1, at: 'A', pose: 'sword', dir: 'r' },
  { t: S5, at: 'C', pose: 'teacup', dir: 'l' },
  { t: S6, at: 'B', pose: 'scratch', dir: 'r' },
  { t: S7, at: 'A', pose: 'sword', dir: 'r' },
];
function armorAt(t) {
  const tt = loopT(t);
  let s = ARMOR[0];
  for (const a of ARMOR) if (a.t <= tt) s = a;
  if (s.from) {
    const q = clamp((tt - s.t) / s.dur);
    const [x0, y0] = SPOT[s.from], [x1, y1] = SPOT[s.to];
    const up = s.to === 'A' ? PLINTH_H * clamp((q - 0.8) / 0.2) + Math.sin(clamp((q - 0.7) / 0.3) * Math.PI) * 0.35 : 0;
    return { x: x0 + (x1 - x0) * q, y: y0 + (y1 - y0) * q, z: up, pose: s.pose, dir: (x1 - x0) - (y1 - y0) >= 0 ? 'r' : 'l' };
  }
  const [x, y] = SPOT[s.at];
  return { x, y, z: s.at === 'A' ? PLINTH_H : 0, pose: s.pose, dir: s.dir };
}
const STEEL = MAT.silver, STEEL_D = shade(MAT.silver, 0.3), STEEL_L = tint(MAT.silver, 0.55);
// A jointed limb in plate: two segments, a round cop at the joint.
function plate(ctx, x0, y0, x1, y1, x2, y2, w) {
  ctx.beginPath();
  ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = w + 0.08; ctx.stroke(); }
  ctx.strokeStyle = STEEL; ctx.lineWidth = w; ctx.stroke();
  ctx.beginPath(); ctx.arc(x1, y1, w * 0.6, 0, Math.PI * 2);
  paint(ctx, STEEL_L, { lw: 0.03 });
}
const fist = (ctx, x, y) => { ctx.beginPath(); ctx.arc(x, y, 0.085, 0, Math.PI * 2); paint(ctx, STEEL_D, { lw: 0.03 }); };
function sword(ctx, x, y0, y1, tilt = 0) { // hilt at y0, point at y1
  ctx.save();
  ctx.translate(x, y0);
  ctx.rotate(tilt);
  const L = y1 - y0;
  ctx.beginPath(); ctx.moveTo(-0.04, 0.12); ctx.lineTo(0.04, 0.12); ctx.lineTo(0.015, L); ctx.lineTo(-0.015, L); ctx.closePath();
  paint(ctx, STEEL_L, { lw: 0.03 });
  ctx.fillStyle = GOLD;
  ctx.fillRect(-0.19, 0.08, 0.38, 0.06);
  ctx.fillStyle = WOOD_D; ctx.fillRect(-0.03, -0.1, 0.06, 0.18);
  ctx.beginPath(); ctx.arc(0, -0.12, 0.05, 0, Math.PI * 2); ctx.fillStyle = GOLD; ctx.fill();
  ctx.restore();
}
function teacup(ctx, x, y) {
  ellipse(ctx, x, y + 0.07, 0.14, 0.04); paint(ctx, INK.bone, { lw: 0.025 });
  ctx.beginPath(); ctx.moveTo(x - 0.08, y - 0.08); ctx.lineTo(x + 0.08, y - 0.08); ctx.lineTo(x + 0.06, y + 0.05); ctx.lineTo(x - 0.06, y + 0.05); ctx.closePath();
  paint(ctx, INK.bone, { lw: 0.025 });
  ctx.fillStyle = GOLD; ctx.fillRect(x - 0.08, y - 0.08, 0.16, 0.025);
  ctx.beginPath(); ctx.arc(x + 0.1, y - 0.02, 0.035, -1.2, 1.2); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02; ctx.stroke();
}
function armor(ctx, t, p) {
  const [X, Y] = P(p.x, p.y, p.z);
  const pose = p.pose;
  const walk = pose === 'tiptoe' ? Math.sin(t * 6) : pose === 'run' ? Math.sin(t * 15) : 0;
  ctx.save();
  ctx.translate(X, Y);
  if (Q.detail) { ellipse(ctx, 0, 0, 0.42, 0.17); ctx.fillStyle = alpha(C.ink, 0.2); ctx.fill(); }
  ctx.scale(p.dir === 'l' ? -1 : 1, 1);
  const lean = { peer: 0.2, run: 0.22, tiptoe: 0.1 }[pose] || 0;
  const lift = pose === 'tiptoe' ? 0.14 + Math.abs(walk) * 0.08 : pose === 'run' ? Math.abs(walk) * 0.14 : 0;
  ctx.translate(0, -lift);
  // Far arm, behind the body.
  const sh = -1.62;
  if (pose === 'sword') plate(ctx, -0.27, sh, -0.2, -1.25, 0.0, -1.02, 0.15);
  else if (pose === 'salute') { plate(ctx, -0.27, sh, -0.38, -1.25, -0.36, -0.95, 0.15); sword(ctx, -0.36, -1.02, -0.02, 0.08); fist(ctx, -0.36, -0.95); }
  else if (pose === 'teacup') plate(ctx, -0.27, sh, -0.1, -1.2, 0.3, -1.22, 0.15);
  else if (pose === 'tiptoe') { plate(ctx, -0.27, sh, -0.52, -1.85, -0.62, -1.55, 0.15); fist(ctx, -0.62, -1.55); }
  else if (pose === 'run') plate(ctx, -0.27, sh, -0.3 - walk * 0.3, -1.2, -0.1 - walk * 0.4, -1.0, 0.15);
  else { plate(ctx, -0.27, sh, -0.52, -1.28, -0.26, -1.0, 0.15); fist(ctx, -0.26, -1.0); }
  // Legs, on tiptoe when sneaking.
  ctx.rotate(lean);
  const legs = pose === 'tiptoe' || pose === 'run' ? [walk * 0.45, -walk * 0.45] : [0.05, -0.05];
  legs.forEach((a, i) => {
    const hx = i ? 0.12 : -0.12, knee = Math.max(0, a) * (pose === 'run' ? 0.9 : 1.2);
    const kx = hx + Math.sin(a) * 0.42, ky = -0.88 + Math.cos(a) * 0.42;
    const fx = kx + Math.sin(a - knee) * 0.44, fy = ky + Math.cos(a - knee) * 0.44 - 0.02;
    plate(ctx, hx, -0.88, kx, ky, fx, fy, 0.19);
    ctx.beginPath(); // a pointed sabaton
    ctx.moveTo(fx - 0.09, fy + 0.02); ctx.quadraticCurveTo(fx, fy - 0.12, fx + 0.1, fy - 0.03); ctx.lineTo(fx + 0.24, fy + 0.03); ctx.lineTo(fx - 0.09, fy + 0.05);
    paint(ctx, STEEL_D, { lw: 0.03 });
  });
  if (pose !== 'sword' && pose !== 'salute') { // its sword, in the scabbard at its hip
    ctx.beginPath(); ctx.moveTo(-0.24, -0.98); ctx.lineTo(-0.44, -0.3);
    ctx.lineCap = 'round';
    if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.14; ctx.stroke(); }
    ctx.strokeStyle = WOOD_D; ctx.lineWidth = 0.08; ctx.stroke();
    ctx.fillStyle = GOLD; ctx.fillRect(-0.3, -1.1, 0.14, 0.05);
  }
  // Skirt of plates, breastplate, pauldrons.
  ctx.beginPath(); ctx.moveTo(-0.26, -1.0); ctx.lineTo(0.26, -1.0); ctx.lineTo(0.32, -0.78); ctx.lineTo(-0.32, -0.78); ctx.closePath();
  paint(ctx, STEEL_D, { lw: 0.035 });
  ctx.beginPath();
  ctx.moveTo(-0.3, -1.72); ctx.quadraticCurveTo(-0.38, -1.2, -0.24, -0.98); ctx.lineTo(0.24, -0.98); ctx.quadraticCurveTo(0.4, -1.2, 0.3, -1.72);
  ctx.closePath();
  paint(ctx, STEEL, { lw: 0.04, dots: STEEL_D, density: 0.14 });
  ctx.beginPath(); ctx.moveTo(0.05, -1.68); ctx.quadraticCurveTo(0.12, -1.3, 0.05, -1.02);
  ctx.strokeStyle = STEEL_D; ctx.lineWidth = 0.03; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0.18, -1.6); ctx.quadraticCurveTo(0.26, -1.4, 0.2, -1.2);
  ctx.strokeStyle = alpha(C.white, 0.75); ctx.lineWidth = 0.04; ctx.stroke();
  for (const px of [-0.3, 0.3]) { ellipse(ctx, px, -1.66, 0.17, 0.12); paint(ctx, STEEL_L, { lw: 0.035 }); }
  // Helmet (tilted when puzzled), visor, plume.
  ctx.save();
  ctx.translate(0.02, -1.78);
  ctx.rotate(pose === 'scratch' ? 0.16 + Math.sin(t * 9) * 0.02 : pose === 'peer' ? 0.12 : 0);
  ctx.beginPath(); ctx.roundRect(-0.21, -0.54, 0.44, 0.56, [0.2, 0.2, 0.08, 0.08]);
  paint(ctx, STEEL, { lw: 0.04 });
  ctx.fillStyle = C.ink;
  ctx.fillRect(0.0, -0.33, 0.21, 0.04); // the eye slit
  if (Q.detail) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0.1 + i * 0.045, -0.16, 0.012, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(-0.21, -0.25); ctx.lineTo(0.23, -0.25);
  ctx.strokeStyle = STEEL_D; ctx.lineWidth = 0.03; ctx.stroke();
  const sway = Math.sin(t * 2.1 + p.x) * 0.08;
  ctx.beginPath(); ctx.moveTo(0.0, -0.52);
  ctx.quadraticCurveTo(-0.1, -0.85 + sway, -0.45, -0.72 + sway);
  ctx.quadraticCurveTo(-0.28, -0.62, -0.08, -0.5);
  paint(ctx, RUNNER, { lw: 0.03 });
  ctx.restore();
  // Near arm, and whatever it's up to.
  if (pose === 'sword') {
    sword(ctx, 0.02, -1.08, -0.04);
    plate(ctx, 0.27, sh, 0.24, -1.25, 0.04, -1.04, 0.16);
    fist(ctx, 0.03, -1.03);
  } else if (pose === 'salute') {
    plate(ctx, 0.27, sh, 0.55, -1.86, 0.2, -2.12, 0.16); fist(ctx, 0.2, -2.12);
  } else if (pose === 'scratch') {
    const s = Math.sin(t * 9) * 0.03;
    plate(ctx, 0.27, sh, 0.5, -2.02, 0.16 + s, -2.36, 0.16); fist(ctx, 0.16 + s, -2.36);
  } else if (pose === 'teacup') {
    plate(ctx, 0.27, sh, 0.33, -1.24, 0.5, -1.36, 0.16);
    teacup(ctx, 0.5, -1.47); fist(ctx, 0.46, -1.37);
    ctx.beginPath(); ctx.moveTo(0.54, -1.4); ctx.lineTo(0.66, -1.5); // the little finger, out
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.07; ctx.stroke();
    ctx.strokeStyle = STEEL; ctx.lineWidth = 0.035; ctx.stroke();
  } else if (pose === 'peer') {
    plate(ctx, 0.27, sh, 0.52, -1.84, 0.3, -2.1, 0.16); fist(ctx, 0.3, -2.1);
  } else if (pose === 'tiptoe') {
    plate(ctx, 0.27, sh, 0.55, -1.85, 0.66, -1.55, 0.16); fist(ctx, 0.66, -1.55);
  } else {
    plate(ctx, 0.27, sh, 0.3 + walk * 0.3, -1.2, 0.1 + walk * 0.4, -1.0, 0.16);
  }
  ctx.restore();
}
// ---------- The coats, and the goose among them ----------
// (Both nudged together from the greybox: the stand a unit toward the goose,
// the goose half a unit toward the stand, so it stands under the coats.)
const COATS = { x: 13.3, y: 12.75 };
const GOOSE = { x: 12.9, y: 13.6 };
function coat(ctx, x, y, z, color, len, o = {}) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.beginPath();
  ctx.moveTo(-0.06, 0);
  ctx.quadraticCurveTo(-0.28, 0.02, -0.29, 0.28);
  ctx.lineTo(-0.35, len); ctx.quadraticCurveTo(0, len + 0.06, 0.35, len);
  ctx.lineTo(0.29, 0.28);
  ctx.quadraticCurveTo(0.28, 0.02, 0.06, 0);
  ctx.closePath();
  paint(ctx, color, { lw: 0.035, dots: shade(color, 0.5), density: 0.16 });
  ctx.beginPath(); // the opening and the collar
  ctx.moveTo(0, 0.12); ctx.lineTo(0.02, len);
  ctx.moveTo(-0.14, 0.06); ctx.lineTo(0, 0.3); ctx.lineTo(0.14, 0.06);
  ctx.strokeStyle = shade(color, 0.45); ctx.lineWidth = 0.03; ctx.stroke();
  if (o.buttons && Q.detail) {
    ctx.fillStyle = o.buttons;
    for (let i = 0; i < 4; i++) for (const bx of [-0.08, 0.1]) { ctx.beginPath(); ctx.arc(bx, 0.42 + i * 0.2, 0.025, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}
function coatStand(ctx) {
  const { x, y } = COATS;
  for (const a of [0.5, 2.6, 4.7]) stick(ctx, [x, y, 0.3], [x + Math.cos(a) * 0.45, y + Math.sin(a) * 0.45, 0.02], WOOD_D, 0.07);
  coat(ctx, x - 0.3, y, 2.12, INK.oxblood, 1.45, { buttons: GOLD }); // the Brigadier's greatcoat
  const [SX, SY2] = P(x, y - 0.3, 2.1); // Lady Philippa's fur stole
  ctx.beginPath();
  ctx.moveTo(SX - 0.1, SY2); ctx.quadraticCurveTo(SX - 0.32, SY2 + 0.4, SX - 0.2, SY2 + 0.95);
  ctx.lineTo(SX + 0.02, SY2 + 0.9); ctx.quadraticCurveTo(SX - 0.08, SY2 + 0.45, SX + 0.1, SY2 + 0.02);
  ctx.moveTo(SX + 0.1, SY2); ctx.quadraticCurveTo(SX + 0.3, SY2 + 0.3, SX + 0.24, SY2 + 0.7); ctx.lineTo(SX + 0.08, SY2 + 0.66);
  paint(ctx, MAT.fur, { lw: 0.035, dots: MAT.furDark, density: 0.3 });
  stick(ctx, [x, y, 0], [x, y, 2.4], WOOD_D, 0.11);
  for (const [dx, dy] of [[0.3, 0], [0, 0.3], [-0.3, 0], [0, -0.3]]) { // brass hooks
    stick(ctx, [x, y, 2.2], [x + dx, y + dy, 2.28], GOLD, 0.04);
    const [HX, HY] = P(x + dx, y + dy, 2.28);
    ctx.beginPath(); ctx.arc(HX, HY - 0.05, 0.05, Math.PI * 0.5, Math.PI * 2.1); ctx.strokeStyle = GOLD; ctx.lineWidth = 0.035; ctx.stroke();
  }
  coat(ctx, x + 0.3, y, 2.12, mix(C.grey, INK.bone, 0.25), 1.05); // Dr. Crane's
  const [TX, TY] = P(x, y, 2.45); // a top hat, on top
  ctx.beginPath(); ctx.ellipse(TX, TY, 0.26, 0.08, 0, 0, Math.PI * 2); paint(ctx, C.black, { lw: 0.03 });
  ctx.beginPath(); ctx.rect(TX - 0.16, TY - 0.42, 0.32, 0.42); paint(ctx, C.black, { lw: 0.03 });
  ctx.fillStyle = INK.oxblood; ctx.fillRect(TX - 0.16, TY - 0.12, 0.32, 0.07);
  if (Q.detail) { // the empty hook's tag: the scarf that should be on it
    const [KX, KY] = P(x, y + 0.3, 2.2);
    ctx.fillStyle = INK.bone; ctx.fillRect(KX - 0.07, KY + 0.02, 0.14, 0.1);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.015; ctx.strokeRect(KX - 0.07, KY + 0.02, 0.14, 0.1);
  }
}
// The goose, playing coat: it turns to look at the coats now and then, and
// pecks at its scarf. When the ghost appears and points at it, it looks the
// other way.
function gooseAt(t) {
  const g = { x: GOOSE.x, y: GOOSE.y, z: 0, dir: 'l', pose: 'stand' };
  if (pastK(t) > 0.02 || pastK(t - 0.8) > 0.02) return { ...g, dir: 'r' };
  if (t % 13 < 1.4) return { ...g, pose: 'peck' };
  if ((t + 5) % 9 < 1.8) return { ...g, dir: 'r' };
  return g;
}
const SCARF = INK.oxblood, SCARF_B = INK.stormNavy;
function scarf(ctx, t, p) { // the Brigadier's regimental scarf, off the empty hook
  const [X, Y] = P(p.x, p.y, 0);
  const down = p.pose === 'peck' && Math.sin(t * 5) > 0;
  const [wx, wy] = down ? [0.3, -0.6] : [0.28, -0.68];
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(p.dir === 'l' ? -1 : 1, 1);
  const band = (pts, w) => {
    ctx.beginPath();
    pts.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)));
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = w + 0.05; ctx.stroke(); }
    ctx.strokeStyle = SCARF; ctx.lineWidth = w; ctx.stroke();
    if (Q.detail) { ctx.setLineDash([0.05, 0.07]); ctx.strokeStyle = SCARF_B; ctx.lineWidth = w; ctx.stroke(); ctx.setLineDash([]); }
  };
  const sw = Math.sin(t * 1.3) * 0.03;
  band([[wx - 0.06, wy + 0.02], [wx - 0.3, wy + 0.06], [-0.22, -0.5 + sw]], 0.1); // one end over its back
  band([[wx - 0.1, wy - 0.02], [wx + 0.12, wy + 0.02]], 0.14); // round the neck
  band([[wx + 0.08, wy + 0.04], [wx + 0.12, wy + 0.3], [wx + 0.1 + sw, wy + 0.46]], 0.1); // one down its front
  if (Q.detail) {
    ctx.strokeStyle = SCARF; ctx.lineWidth = 0.02; // fringe
    ctx.beginPath();
    for (let i = 0; i < 4; i++) { const fx = wx + 0.06 + sw + i * 0.03; ctx.moveTo(fx, wy + 0.5); ctx.lineTo(fx, wy + 0.58); }
    ctx.stroke();
    ctx.fillStyle = INK.bone; // a cloakroom ticket: it has been checked in as a coat
    ctx.fillRect(wx + 0.16, wy + 0.16, 0.13, 0.1);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.015; ctx.strokeRect(wx + 0.16, wy + 0.16, 0.13, 0.1);
    ctx.fillStyle = C.ink; ctx.fillRect(wx + 0.2, wy + 0.19, 0.05, 0.04);
  }
  ctx.restore();
}

// ---------- By the door ----------
const BRELLY = { x: 14.9, y: 14.1 };
function umbrellaStand(ctx) {
  const { x, y } = BRELLY;
  const brolly = (tip, top, color) => {
    const [A, B] = [P(...tip), P(...top)];
    const nx = -(B[1] - A[1]), ny = B[0] - A[0], l = Math.hypot(nx, ny);
    ctx.beginPath();
    ctx.moveTo(A[0], A[1]);
    ctx.lineTo(B[0] + (nx / l) * 0.12, B[1] + (ny / l) * 0.12);
    ctx.lineTo(B[0] - (nx / l) * 0.12, B[1] - (ny / l) * 0.12);
    ctx.closePath();
    paint(ctx, color, { lw: 0.035 });
    ctx.beginPath(); ctx.arc(B[0] + 0.06, B[1] - 0.12, 0.07, Math.PI, Math.PI * 2.2); ctx.strokeStyle = WOOD_D; ctx.lineWidth = 0.05; ctx.stroke();
  };
  brolly([x, y, 0.2], [x - 0.25, y - 0.1, 1.35], C.black);
  stick(ctx, [x + 0.05, y, 0.2], [x + 0.28, y + 0.05, 1.2], WOOD_D, 0.05); // a cane
  const [CX, CY] = P(x + 0.28, y + 0.05, 1.22); ctx.beginPath(); ctx.arc(CX, CY, 0.06, 0, Math.PI * 2); ctx.fillStyle = GOLD; ctx.fill();
  brolly([x, y + 0.05, 0.2], [x + 0.05, y + 0.3, 1.25], INK.verdigris);
  const [X, Y] = P(x, y, 0);
  ctx.beginPath(); // the stand, a brass pot
  ctx.moveTo(X - 0.34, Y - 0.72); ctx.lineTo(X - 0.3, Y); ctx.ellipse(X, Y, 0.3, 0.13, 0, Math.PI, 0, true); ctx.lineTo(X + 0.34, Y - 0.72);
  ctx.closePath();
  paint(ctx, GOLD, { lw: 0.035, dots: GOLD_D, density: 0.3 });
  ctx.beginPath(); ctx.ellipse(X, Y - 0.72, 0.34, 0.14, 0, 0, Math.PI * 2); paint(ctx, GOLD_D, { lw: 0.035 });
}
function doormat(ctx) {
  rect(ctx, 6.9, 14.75, 2.2, 0.9, 0.01, MAT.oak, { lw: 0.04, dots: shade(MAT.oak, 0.45), density: 0.35 });
  rect(ctx, 7.02, 14.87, 1.96, 0.66, 0.01, null, { lw: 0.03, stroke: shade(MAT.oak, 0.4) });
  paintText(ctx, 'floor', 8, 15.22, 'NO GEESE', 0.42, INK.oxblood);
}
// Drips off the umbrellas, into a puddle that keeps rippling.
function puddle(ctx, t) {
  const [X, Y] = P(BRELLY.x - 0.45, BRELLY.y + 0.35, 0.01);
  ellipse(ctx, X, Y, 0.5, 0.18);
  ctx.fillStyle = alpha(mix(INK.bone, INK.verdigris, 0.3), 0.45);
  ctx.fill();
  if (!Q.detail) return;
  const q = (t % 2.3) / 2.3;
  ellipse(ctx, X - 0.1, Y, 0.06 + q * 0.3, 0.025 + q * 0.11);
  ctx.strokeStyle = alpha(C.white, 0.8 * (1 - q)); ctx.lineWidth = 0.025; ctx.stroke();
}

// ---------- The hall table ----------
// Where everything long gets put down on the way in: spare candles, a telescope, the evening paper, and Mrs. Hatchett's rolling pin
// (a find), which has to be picked out from the rest. Flour on its handles
// says whose it is.
const TABLE = { x: 0.08, y: 11.9, w: 0.85, d: 3.2, h: 1.12 };
const PIN = { a: [0.5, 13.5], b: [0.66, 14.15] };
// Something round lying on the table top, from a to b ([x, y]), at height z.
const along = (a, b, k, z) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, z];
function rollingPin(ctx) {
  const z = TABLE.h + 0.075, { a, b } = PIN;
  if (Q.detail) { // a dusting of flour where it was put down
    const [mx, my] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    onFloor(ctx, mx + 0.06, my, (g) => {
      g.rotate(Math.atan2(b[1] - a[1], b[0] - a[0]));
      g.fillStyle = alpha(INK.bone, 0.3);
      g.beginPath(); g.ellipse(0, 0, 0.4, 0.1, 0, 0, Math.PI * 2); g.fill();
    }, TABLE.h + 0.005);
  }
  stick(ctx, along(a, b, 0, z), along(a, b, 0.22, z), MAT.oak, 0.055); // the handles
  stick(ctx, along(a, b, 0.78, z), along(a, b, 1, z), MAT.oak, 0.055);
  stick(ctx, along(a, b, 0.2, z), along(a, b, 0.8, z), MAT.pine, 0.15); // the barrel
  if (!Q.detail) return;
  ctx.fillStyle = C.white;
  for (const k of [0.03, 0.09, 0.15, 0.27, 0.31, 0.72, 0.85, 0.92, 0.97]) { // floury fingers, mostly on the handles
    const [X, Y] = P(...along(a, b, k, z + 0.03));
    ctx.beginPath(); ctx.arc(X + (hash(k * 100, 1) - 0.5) * 0.07, Y + (hash(k * 100, 2) - 0.5) * 0.05, 0.012 + hash(k * 100, 3) * 0.014, 0, Math.PI * 2); ctx.fill();
  }
}
// The look-alikes: long, round, and not a rolling pin once you look.
function tableClutter(ctx, z0) {
  // Spare candles, tied in a bundle.
  for (const dx of [-0.07, 0, 0.07]) stick(ctx, [0.36 + dx, 12.95, z0 + 0.04], [0.36 + dx, 13.45, z0 + 0.04], INK.bone, 0.05);
  stick(ctx, [0.27, 13.2, z0 + 0.08], [0.45, 13.2, z0 + 0.08], INK.oxblood, 0.035);
  // A brass telescope, for looking at the weather.
  const ta = [0.76, 12.9], tb = [0.7, 13.5], tz = z0 + 0.07;
  stick(ctx, along(ta, tb, 0, tz), along(ta, tb, 0.35, tz), GOLD, 0.06);
  stick(ctx, along(ta, tb, 0.3, tz), along(ta, tb, 0.65, tz), GOLD, 0.09);
  stick(ctx, along(ta, tb, 0.62, tz), along(ta, tb, 1, tz), GOLD, 0.13);
  for (const k of [0.33, 0.64]) stick(ctx, along(ta, tb, k, tz), along(ta, tb, k + 0.03, tz), GOLD_D, k < 0.5 ? 0.09 : 0.13);
  const [LX, LY] = P(...along(ta, tb, 1.02, tz)); // the big lens, catching the candles
  ctx.beginPath(); ctx.ellipse(LX, LY, 0.045, 0.065, 0.5, 0, Math.PI * 2); paint(ctx, MAT.glass, { lw: 0.02 });
  // The evening paper, rolled up (the print shows at the ends).
  const na = [0.3, 13.6], nb = [0.33, 14.15], nz = z0 + 0.065;
  stick(ctx, along(na, nb, 0, nz), along(na, nb, 1, nz), INK.bone, 0.13);
  if (Q.detail) {
    const [X0, Y0] = P(...along(na, nb, 0.08, nz + 0.02)), [X1, Y1] = P(...along(na, nb, 0.92, nz + 0.02));
    ctx.save();
    ctx.setLineDash([0.035, 0.025]);
    ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1);
    ctx.strokeStyle = alpha(C.ink, 0.45); ctx.lineWidth = 0.04; ctx.stroke();
    ctx.restore();
  }
}
function hallTable(ctx) {
  const { x, y, w, d, h } = TABLE;
  for (const yy of [y + 0.14, y + d - 0.14]) {
    stick(ctx, [x + 0.15, yy, 0], [x + 0.15, yy, h - 0.2], WOOD_D, 0.08);
    stick(ctx, [x + w - 0.1, yy, 0.02], [x + w - 0.16, yy, h - 0.2], WOOD_D, 0.09);
  }
  box(ctx, x + 0.06, y + 0.06, h - 0.32, w - 0.12, d - 0.12, 0.24, WOOD_D);
  box(ctx, x, y, h - 0.08, w, d, 0.08, WOOD, { top: WOOD_L });
  // A three-armed candelabra (its candles are lights).
  const cx = x + 0.4, cy = y + 0.55;
  disc(ctx, cx, cy, h, 0.14, GOLD, { lw: 0.03 });
  stick(ctx, [cx, cy, h], [cx, cy, h + 0.55], GOLD, 0.06);
  ctx.beginPath();
  for (let i = 0; i <= 12; i++) { const k = i / 12, [X, Y] = P(cx, cy - 0.3 + k * 0.6, h + 0.55 + Math.sin(k * Math.PI) * -0.12); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
  ctx.strokeStyle = GOLD; ctx.lineWidth = 0.05; ctx.stroke();
  for (const dy of [-0.3, 0, 0.3]) disc(ctx, cx, cy + dy, h + 0.56, 0.07, GOLD, { lw: 0.02 });
  tableClutter(ctx, h);
  // A quill in its ink, then the pin, the post on a silver tray, and the guest book.
  const [IX, IY] = P(0.2, 14.25, h);
  ctx.beginPath(); ctx.rect(IX - 0.06, IY - 0.1, 0.12, 0.1); paint(ctx, C.ink, { lw: 0.02 });
  ctx.beginPath(); ctx.moveTo(IX, IY - 0.08); ctx.quadraticCurveTo(IX + 0.14, IY - 0.35, IX + 0.08, IY - 0.55); ctx.quadraticCurveTo(IX + 0.02, IY - 0.35, IX, IY - 0.08);
  paint(ctx, INK.bone, { lw: 0.02 });
  rollingPin(ctx);
  const sx = x + 0.42, sy = 14.47;
  disc(ctx, sx, sy, h + 0.01, 0.25, MAT.silver, { lw: 0.03 });
  for (const [dx, dy, a] of [[-0.05, -0.04, 0.2], [0.06, 0.05, -0.3]]) {
    onFloor(ctx, sx + dx, sy + dy, (g) => {
      g.rotate(a);
      g.fillStyle = INK.bone; g.fillRect(-0.16, -0.1, 0.32, 0.2);
      g.strokeStyle = C.ink; g.lineWidth = 0.015; g.strokeRect(-0.16, -0.1, 0.32, 0.2);
    }, h + 0.03);
  }
  const [WX, WY] = P(sx + 0.06, sy + 0.05, h + 0.02); ctx.beginPath(); ctx.arc(WX, WY - 0.02, 0.035, 0, Math.PI * 2); ctx.fillStyle = INK.oxblood; ctx.fill();
  const bx = x + 0.44, by = 14.86;
  onFloor(ctx, bx, by, (g) => {
    g.save();
    g.fillStyle = INK.oxblood; g.fillRect(-0.24, -0.2, 0.48, 0.4);
    g.fillStyle = INK.bone; g.fillRect(-0.21, -0.17, 0.2, 0.34); g.fillRect(0.01, -0.17, 0.2, 0.34);
    g.strokeStyle = alpha(C.ink, 0.5); g.lineWidth = 0.015;
    g.beginPath();
    for (let i = 0; i < 5; i++) { g.moveTo(-0.18, -0.12 + i * 0.06); g.lineTo(-0.04, -0.12 + i * 0.06); g.moveTo(0.04, -0.12 + i * 0.06); g.lineTo(0.18 - (i === 4 ? 0.08 : 0), -0.12 + i * 0.06); }
    g.stroke();
    g.restore();
  }, h + 0.02);
}

// The stick stand at the end of the table: more long wooden things, and
// the nearest thing to a rolling pin in the house (the croquet mallet).
const STAND = { x: 1.3, y: 11.7 };
function stickStand(ctx) {
  const { x, y } = STAND;
  const crook = (tx, ty, tz, color) => { // a walking stick, with its crook
    stick(ctx, [x, y, 0.2], [tx, ty, tz], color, 0.05);
    const [CX, CY] = P(tx, ty, tz);
    ctx.beginPath(); ctx.arc(CX + 0.08, CY, 0.08, Math.PI, Math.PI * 2);
    if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.11; ctx.stroke(); }
    ctx.strokeStyle = color; ctx.lineWidth = 0.05; ctx.stroke();
  };
  crook(x - 0.2, y - 0.1, 1.45, WOOD_D);
  // A cricket bat, blade down, grip up.
  const [BX, BY] = P(x + 0.05, y - 0.12, 1.0);
  ctx.beginPath(); ctx.moveTo(BX - 0.1, BY + 0.4); ctx.lineTo(BX - 0.1, BY); ctx.quadraticCurveTo(BX, BY - 0.08, BX + 0.1, BY); ctx.lineTo(BX + 0.1, BY + 0.4); ctx.closePath();
  paint(ctx, MAT.pine, { lw: 0.03 });
  stick(ctx, [x + 0.05, y - 0.12, 1.02], [x + 0.05, y - 0.12, 1.42], INK.oxblood, 0.06);
  // The croquet mallet: a wooden roller too, but on one long handle.
  const mt = [x + 0.18, y + 0.05, 1.55];
  stick(ctx, [x + 0.05, y, 0.2], mt, MAT.oak, 0.045);
  stick(ctx, [mt[0] - 0.2, mt[1] + 0.12, mt[2]], [mt[0] + 0.2, mt[1] - 0.12, mt[2]], MAT.oak, 0.14);
  stick(ctx, [mt[0] - 0.14, mt[1] + 0.084, mt[2]], [mt[0] - 0.1, mt[1] + 0.06, mt[2]], INK.verdigris, 0.14);
  stick(ctx, [mt[0] + 0.1, mt[1] - 0.06, mt[2]], [mt[0] + 0.14, mt[1] - 0.084, mt[2]], INK.verdigris, 0.14);
  // A shooting stick, its leather seat folded up.
  stick(ctx, [x, y + 0.05, 0.2], [x + 0.25, y + 0.12, 1.3], shade(WOOD_D, 0.2), 0.05);
  const [SX, SY2] = P(x + 0.25, y + 0.12, 1.3);
  ctx.beginPath(); ctx.moveTo(SX - 0.12, SY2 + 0.02); ctx.lineTo(SX + 0.12, SY2 - 0.02); ctx.lineTo(SX + 0.06, SY2 - 0.12); ctx.lineTo(SX - 0.06, SY2 - 0.1); ctx.closePath();
  paint(ctx, INK.oxblood, { lw: 0.025 });
  crook(x + 0.1, y + 0.22, 1.25, C.black);
  const [X, Y] = P(x, y, 0);
  ctx.beginPath(); // the stand, a tall glazed pot with a gold band
  ctx.moveTo(X - 0.3, Y - 0.8); ctx.lineTo(X - 0.27, Y); ctx.ellipse(X, Y, 0.27, 0.12, 0, Math.PI, 0, true); ctx.lineTo(X + 0.3, Y - 0.8);
  ctx.closePath();
  paint(ctx, INK.stormNavy, { lw: 0.035, dots: INK.deepPlum, density: 0.3 });
  ctx.fillStyle = GOLD; ctx.fillRect(X - 0.29, Y - 0.62, 0.58, 0.06);
  ctx.beginPath(); ctx.ellipse(X, Y - 0.8, 0.3, 0.12, 0, 0, Math.PI * 2); paint(ctx, mix(INK.stormNavy, C.black, 0.4), { lw: 0.035 });
}

// ---------- The chandelier ----------
const CHAND = { x: 8, y: 9.5, z: 4.75 };
// It sways in the draft, and swings for a few seconds after a big thunderclap.
function chandSway(t) {
  const i = lastStrike(t), s = i >= 0 ? storm.strikes[i] : null;
  const age = s ? loopT(t) - s.t : 99;
  const kick = s && s.big && age < 5 ? Math.exp(-age * 0.9) * Math.sin(age * 4.5) * 0.07 : 0;
  return Math.sin(t * 1.1) * 0.015 + kick;
}
function chandelier(ctx, t) {
  const { x, y, z } = CHAND;
  const [AX, AY] = P(x, y, 6);
  const lit = house.lamp(t) > 0.5;
  ctx.save();
  ctx.translate(AX, AY); ctx.rotate(chandSway(t)); ctx.translate(-AX, -AY);
  stick(ctx, [x, y, 6], [x, y, z + 0.4], GOLD_D, 0.04);
  if (Q.detail) {
    for (let zz = z + 0.5; zz < 5.95; zz += 0.16) { const [X, Y] = P(x, y, zz); ellipse(ctx, X, Y, 0.035, 0.06); ctx.strokeStyle = GOLD_D; ctx.lineWidth = 0.02; ctx.stroke(); }
  }
  const arms = [];
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.2; arms.push([a, Math.cos(a) + Math.sin(a)]); }
  arms.sort((a, b) => a[1] - b[1]);
  const arm = ([a]) => {
    const ex = x + Math.cos(a) * 0.95, ey = y + Math.sin(a) * 0.95;
    const [X0, Y0] = P(x, y, z + 0.12), [X1, Y1] = P(ex, ey, z - 0.02), [X2, Y2] = P(ex, ey, z + 0.2);
    ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.quadraticCurveTo(X1, Y1 + 0.15, X1, Y1); ctx.lineTo(X2, Y2);
    ctx.lineCap = 'round';
    if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.stroke(); }
    ctx.strokeStyle = GOLD; ctx.lineWidth = 0.05; ctx.stroke();
    ctx.fillStyle = INK.bone; ctx.fillRect(X2 - 0.04, Y2 - 0.26, 0.08, 0.26);
    ctx.beginPath(); ctx.ellipse(X2, Y2 - 0.33, 0.06, 0.09, 0, 0, Math.PI * 2);
    ctx.fillStyle = lit ? INK.candleGold : shade(INK.bone, 0.35); ctx.fill();
    if (lit && Q.detail) { ctx.beginPath(); ctx.arc(X2, Y2 - 0.33, 0.03, 0, Math.PI * 2); ctx.fillStyle = C.white; ctx.fill(); }
  };
  arms.filter((a) => a[1] < 0).forEach(arm);
  const [CX, CY] = P(x, y, z);
  ctx.beginPath(); ctx.ellipse(CX, CY, 1.34, 0.67, 0, 0, Math.PI * 2);
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.14; ctx.stroke(); }
  ctx.strokeStyle = GOLD; ctx.lineWidth = 0.08; ctx.stroke();
  // The column and its finial.
  ctx.beginPath(); ctx.moveTo(CX - 0.1, CY - 0.5); ctx.lineTo(CX + 0.1, CY - 0.5); ctx.lineTo(CX + 0.18, CY + 0.2); ctx.lineTo(CX, CY + 0.62); ctx.lineTo(CX - 0.18, CY + 0.2);
  ctx.closePath();
  paint(ctx, GOLD, { lw: 0.035, dots: GOLD_D, density: 0.3 });
  arms.filter((a) => a[1] >= 0).forEach(arm);
  // Crystal drops, catching the light.
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const [X, Y] = P(x + Math.cos(a) * 0.95, y + Math.sin(a) * 0.95, z - 0.05);
    const len = 0.18 + (i % 2) * 0.1;
    ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X, Y + len);
    ctx.strokeStyle = alpha(INK.bone, 0.8); ctx.lineWidth = 0.015; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(X, Y + len + 0.05, 0.035, 0.06, 0, 0, Math.PI * 2);
    const glint = Q.detail && hash(i, Math.floor(t * 3)) > 0.8;
    ctx.fillStyle = glint || storm.flash(t) > 0.3 ? C.white : MAT.glass; ctx.fill();
  }
  ctx.restore();
  // A spider, going up and down on its thread.
  if (Q.detail) {
    const drop = (1 - Math.cos((t / 17) * Math.PI * 2)) * 0.95;
    const [SX, SY] = P(x, y, z - 0.6), [BX, BY] = P(x, y, z - 0.62 - drop);
    ctx.beginPath(); ctx.moveTo(SX, SY); ctx.lineTo(BX, BY);
    ctx.strokeStyle = alpha(INK.bone, 0.6); ctx.lineWidth = 0.01; ctx.stroke();
    ctx.strokeStyle = C.black; ctx.lineWidth = 0.018;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const ly = BY + 0.01 + (i - 1.5) * 0.028, w = 0.1 + Math.sin(t * 8 + i) * 0.01;
      ctx.moveTo(BX - w, ly + 0.03); ctx.lineTo(BX - 0.04, ly); ctx.lineTo(BX + 0.04, ly); ctx.lineTo(BX + w, ly + 0.03);
    }
    ctx.stroke();
    ctx.beginPath(); ctx.arc(BX, BY + 0.03, 0.05, 0, Math.PI * 2); ctx.fillStyle = C.black; ctx.fill();
  }
}
// Dust, turning slowly in the chandelier's light.
function dust(ctx, t) {
  const k = house.lamp(t);
  if (!Q.detail || k < 0.5) return;
  particles(t, 12, 9, (q, r) => {
    const x = CHAND.x + (r() - 0.5) * 3.4, y = CHAND.y + (r() - 0.5) * 3.4;
    const z = 0.8 + r() * 3 + Math.sin(q * Math.PI * 2) * 0.3;
    const [X, Y] = P(x + Math.sin(t * 0.3 + r() * 6) * 0.2, y, z);
    ctx.beginPath(); ctx.arc(X, Y, 0.03, 0, Math.PI * 2);
    ctx.fillStyle = alpha(INK.bone, 0.55 * Math.sin(q * Math.PI)); ctx.fill();
  }, 7);
}

// ---------- The Lord's ghost ----------
// In every flash of lightning he appears by the coats, leaning in and
// pointing furiously at the goose. Nobody notices. (The cat does.)
const GHOST = { x: 11.3, y: 15.15, z: 0.1, lean: 0.3 };
const PALE = mix(INK.bone, NIGHT.flash, 0.5);
function ghost(ctx, t) {
  const k = pastK(t);
  if (k < 0.03) return;
  const [X, Y] = P(GHOST.x, GHOST.y, GHOST.z + 0.35);
  ctx.save();
  ctx.translate(X + Math.sin(t * 47) * 0.03, Y);
  ctx.rotate(GHOST.lean);
  ctx.translate(-X, -Y);
  lordGhost(ctx, GHOST.x, GHOST.y, GHOST.z, t, k, 'r');
  // Cross, and saying so.
  ctx.translate(X, Y - (GHOST.z + Math.sin(t * 2.2) * 0.12) * ZK);
  ctx.globalAlpha *= 0.85 * k;
  ctx.strokeStyle = PALE; ctx.lineWidth = 0.05; ctx.lineCap = 'round';
  ctx.beginPath();
  for (const [a, r0] of [[-0.5, 0.12], [0.1, 0.12], [0.7, 0.12]]) {
    const cx = 0.42, cy = -2.55;
    ctx.moveTo(cx + Math.sin(a) * r0, cy - Math.cos(a) * r0); ctx.lineTo(cx + Math.sin(a) * (r0 + 0.16), cy - Math.cos(a) * (r0 + 0.16));
  }
  ctx.stroke();
  ctx.save();
  ctx.scale(1 / 40, 1 / 40);
  ctx.font = `${0.55 * 40}px "Bagel Fat One", "Arial Black", sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = PALE;
  ctx.fillText('OI!', 1.25 * 40, -2.2 * 40);
  ctx.restore();
  ctx.restore();
}

// ---------- The dinner gong ----------
// It shivers along with the clock at midnight.
const GONG = { x: 15.2, y: 1.35 };
function gong(ctx, t) {
  const { x, y } = GONG;
  for (const dx of [-0.48, 0.48]) {
    box(ctx, x + dx - 0.12, y - 0.2, 0, 0.24, 0.4, 0.08, WOOD_D);
    stick(ctx, [x + dx, y, 0.05], [x + dx, y, 1.78], WOOD_D, 0.09);
  }
  stick(ctx, [x - 0.55, y, 1.72], [x + 0.55, y, 1.72], WOOD, 0.1);
  const b = sinceBong(t);
  const shiver = b ? Math.sin(b.age * 40) * 0.06 * Math.exp(-b.age * 3) : 0;
  flat(ctx, 'right', x, y, 1.0, (g) => {
    g.rotate(shiver);
    g.beginPath(); g.moveTo(-0.22, -0.4); g.lineTo(-0.3, -0.72); g.moveTo(0.22, -0.4); g.lineTo(0.3, -0.72);
    g.strokeStyle = C.ink; g.lineWidth = 0.025; g.stroke();
    g.beginPath(); g.arc(0, 0, 0.44, 0, Math.PI * 2);
    paint(g, GOLD, { lw: 0.035 });
    g.beginPath(); g.arc(0, 0, 0.3, 0, Math.PI * 2); g.arc(0, 0, 0.18, 0, Math.PI * 2);
    g.strokeStyle = GOLD_D; g.lineWidth = 0.025; g.stroke();
    g.beginPath(); g.arc(0, 0, 0.1, 0, Math.PI * 2); paint(g, GOLD_D, { lw: 0.02 });
    g.beginPath(); g.arc(-0.12, -0.14, 0.2, Math.PI * 1.1, Math.PI * 1.5);
    g.strokeStyle = alpha(C.white, 0.6 + storm.flash(t) * 0.4); g.lineWidth = 0.04; g.stroke();
  });
  stick(ctx, [x + 0.5, y + 0.05, 1.3], [x + 0.62, y + 0.12, 0.72], WOOD_D, 0.04); // the beater, hung up
  const [MX, MY] = P(x + 0.62, y + 0.12, 0.66);
  ctx.beginPath(); ctx.arc(MX, MY, 0.09, 0, Math.PI * 2); paint(ctx, INK.bone, { lw: 0.025 });
}

// ---------- The tea trolley ----------
// Tea, and the birthday cake (eighty candles, give or take), waiting to be
// wheeled in. A slice has gone missing. The crumbs lead to the coats.
const TROLLEY = { x: 14.75, y: 10.6 };
function trolley(ctx, t, armorHasCup) {
  const { x, y } = TROLLEY;
  const x0 = x - 0.5, y0 = y - 0.4, w = 1.0, d = 0.8;
  for (const [lx, ly] of [[x0 + 0.06, y0 + d - 0.06], [x0 + w - 0.06, y0 + d - 0.06], [x0 + w - 0.06, y0 + 0.06], [x0 + 0.06, y0 + 0.06]]) {
    stick(ctx, [lx, ly, 0.08], [lx, ly, 0.95], WOOD_D, 0.05);
    const [WX, WY] = P(lx, ly, 0.05); ctx.beginPath(); ctx.arc(WX, WY, 0.06, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
  }
  box(ctx, x0, y0, 0.32, w, d, 0.05, WOOD, { top: WOOD_L });
  // The lower shelf: a teapot and cups (one is off with the armor).
  const cups = [[x0 + 0.2, y0 + 0.2], [x0 + 0.2, y0 + 0.55], [x0 + 0.75, y0 + 0.62], [x0 + 0.55, y0 + 0.62]];
  cups.forEach(([cx, cy], i) => {
    disc(ctx, cx, cy, 0.38, 0.1, INK.bone, { lw: 0.02 });
    if (i === 3 && armorHasCup) return;
    const [CX, CY] = P(cx, cy, 0.38);
    ctx.beginPath(); ctx.rect(CX - 0.06, CY - 0.1, 0.12, 0.1); paint(ctx, INK.bone, { lw: 0.02 });
  });
  const [TX, TY] = P(x0 + 0.65, y0 + 0.22, 0.37);
  ctx.beginPath(); ctx.ellipse(TX, TY - 0.14, 0.16, 0.14, 0, 0, Math.PI * 2); paint(ctx, INK.verdigris, { lw: 0.025 });
  ctx.beginPath(); ctx.moveTo(TX + 0.12, TY - 0.14); ctx.lineTo(TX + 0.26, TY - 0.26); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
  box(ctx, x0, y0, 0.9, w, d, 0.06, WOOD, { top: WOOD_L });
  stick(ctx, [x0 - 0.05, y0 + 0.05, 1.12], [x0 - 0.05, y0 + d - 0.05, 1.12], GOLD, 0.04); // handle
  // The cake: two tiers, a gold 80, a missing slice (on the plate, crumbs).
  const cx = x - 0.05, cy = y + 0.02;
  const tier = (z, r, h) => {
    const [X, Yb] = P(cx, cy, z), Yt = Yb - h * ZK, rx = r * Math.SQRT2, ry = rx / 2;
    ctx.beginPath(); ctx.moveTo(X - rx, Yt); ctx.lineTo(X - rx, Yb); ctx.ellipse(X, Yb, rx, ry, 0, Math.PI, 0, true); ctx.lineTo(X + rx, Yt); ctx.closePath();
    paint(ctx, INK.bone, { lw: 0.03, dots: shade(INK.bone, 0.2), density: 0.2 });
    ctx.beginPath(); // raspberry drips down the icing
    for (let i = 0; i <= 8; i++) { const a = Math.PI - (i / 8) * Math.PI, px = X + Math.cos(a) * rx, py = Yt + Math.sin(a) * ry; i ? ctx.lineTo(px, py + (i % 2 ? 0.08 : 0.02)) : ctx.moveTo(px, py); }
    ctx.strokeStyle = MAT.trifle; ctx.lineWidth = 0.05; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(X, Yt, rx, ry, 0, 0, Math.PI * 2); paint(ctx, tint(INK.bone, 0.3), { lw: 0.03 });
    return [X, Yt, rx, ry];
  };
  const [BX, BY] = tier(0.97, 0.36, 0.26);
  if (Q.detail) {
    ctx.save(); ctx.translate(BX, BY + 0.26); ctx.scale(1 / 40, 1 / 40);
    ctx.font = `${0.2 * 40}px "Bagel Fat One", "Arial Black", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = GOLD;
    ctx.fillText('80', 0, 0); ctx.restore();
  }
  const [UX, UY, urx, ury] = tier(1.23, 0.23, 0.2);
  // Candles, a lot of them.
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.3, rr = i % 2 ? 0.6 : 0.85;
    const px = UX + Math.cos(a) * urx * rr, py = UY + Math.sin(a) * ury * rr;
    ctx.fillStyle = [INK.bone, GOLD, MAT.trifle][i % 3];
    ctx.fillRect(px - 0.015, py - 0.16, 0.03, 0.16);
    const fl = 0.7 + 0.3 * hash(i, Math.floor(t * 12));
    ctx.beginPath(); ctx.ellipse(px, py - 0.2, 0.022, 0.045 * fl, 0, 0, Math.PI * 2); ctx.fillStyle = INK.candleGold; ctx.fill();
  }
  // The slice, gone, and the plate it was on.
  disc(ctx, x0 + 0.2, y0 + 0.62, 0.96, 0.13, INK.bone, { lw: 0.02 });
  if (Q.detail) { ctx.fillStyle = MAT.custard; for (let i = 0; i < 4; i++) { const [PX, PY] = P(x0 + 0.16 + hash(i, 5) * 0.1, y0 + 0.58 + hash(i, 6) * 0.1, 0.97); ctx.fillRect(PX, PY, 0.03, 0.02); } }
}
// Crumbs from the trolley to the coats.
function crumbs(ctx) {
  if (!Q.detail) return;
  const [ax, ay] = [TROLLEY.x - 0.6, TROLLEY.y + 0.5], [bx, by] = [GOOSE.x + 0.3, GOOSE.y - 0.3];
  ctx.fillStyle = MAT.custard;
  for (let i = 0; i < 14; i++) {
    const k = i / 13, wob = (hash(i, 31) - 0.5) * 0.35;
    const [X, Y] = P(ax + (bx - ax) * k + wob, ay + (by - ay) * k - wob, 0.01);
    ctx.beginPath(); ctx.ellipse(X, Y, 0.035 + hash(i, 32) * 0.03, 0.02, 0, 0, Math.PI * 2); ctx.fill();
  }
  const [NX, NY] = P(NIBBLE[0] + 0.12, NIBBLE[1] + 0.02, 0.01); // the lump the mouse comes out for
  ctx.beginPath(); ctx.ellipse(NX, NY - 0.02, 0.07, 0.04, 0, 0, Math.PI * 2); paint(ctx, MAT.custard, { lw: 0.02 });
}

// ---------- The mouse ----------
// Out of its hole under the stairs to nibble a lump of dropped cake, and
// back. It stays in when anyone's about.
const HOLE = [8.7, 2.95], NIBBLE = [7.45, 4.95], MOUSE_EVERY = 20;
function mouseTimes(R) {
  const [ox, oy] = R.origin, safe = [];
  for (let c = 0; c * MOUSE_EVERY < LOOP; c++) {
    let ok = true;
    for (let t = c * MOUSE_EVERY; t < c * MOUSE_EVERY + 11 && ok; t += 0.5) {
      for (const w of R.walkers) {
        if (w.ghost) continue;
        const p = w.at(t);
        if (R.contains(p.x, p.y, p.z || 0) && (p.z || 0) < 0.5 && Math.hypot(p.x - ox - 8, p.y - oy - 4.2) < 3.4) ok = false;
      }
    }
    safe.push(ok);
  }
  return (t) => {
    const tt = loopT(t), c = Math.floor(tt / MOUSE_EVERY), s = tt - c * MOUSE_EVERY;
    const at = (q, a, b) => ({ x: a[0] + (b[0] - a[0]) * q, y: a[1] + (b[1] - a[1]) * q });
    if (!safe[c] || s > 9.2) return { ...at(0, HOLE, HOLE), hide: true };
    if (s < 2.4) return { ...at(0, HOLE, HOLE), peek: true, dir: 'l' };
    if (s < 3.5) return { ...at((s - 2.4) / 1.1, HOLE, NIBBLE), run: true, dir: 'l' };
    if (s < 8.1) return { ...at(0, NIBBLE, NIBBLE), nibble: true, dir: 'r' };
    return { ...at((s - 8.1) / 1.1, NIBBLE, HOLE), run: true, dir: 'r' };
  };
}
function mouse(ctx, t, p) {
  if (p.hide || !Q.detail) return;
  const [X, Y] = P(p.x, p.y, 0);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(p.dir === 'l' ? -1 : 1, 1);
  const grey = mix(MAT.stone, INK.deepPlum, 0.25);
  if (!p.peek) {
    const bob = p.run ? Math.abs(Math.sin(t * 30)) * 0.03 : 0;
    ctx.beginPath(); ctx.moveTo(-0.12, -0.05); ctx.quadraticCurveTo(-0.3, -0.02 + Math.sin(t * 6) * 0.04, -0.36, -0.1);
    ctx.strokeStyle = C.pink; ctx.lineWidth = 0.02; ctx.stroke();
    ellipse(ctx, 0, -0.07 - bob, 0.13, 0.075); paint(ctx, grey, { lw: 0.025 });
  }
  const nib = p.nibble ? Math.sin(t * 20) * 0.015 : 0;
  ellipse(ctx, 0.12, -0.1 + nib, 0.065, 0.055); paint(ctx, grey, { lw: 0.025 });
  ctx.beginPath(); ctx.arc(0.09, -0.17 + nib, 0.035, 0, Math.PI * 2); paint(ctx, C.pink, { lw: 0.02 });
  ctx.fillStyle = C.ink;
  ctx.beginPath(); ctx.arc(0.19, -0.1 + nib, 0.015, 0, Math.PI * 2); ctx.arc(0.14, -0.11 + nib, 0.012, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ---------- Footprints ----------
// Mud from the drive, tracked in by whoever comes through the front door:
// the gardener's boots, and Inspector Pidge's feet (a pigeon's, three toes).
// They dry up over half a minute.
function makePrints(R) {
  const [ox, oy, oz] = R.origin, prints = [];
  for (const w of R.walkers) {
    if (w.ghost || !['gardener', 'pidge'].includes(w.id)) continue;
    let wet = false, was = false, side = 1, last = null;
    for (let t = 0; t < LOOP; t += 0.05) {
      const p = w.at(t), inside = R.contains(p.x, p.y, p.z || 0);
      const x = p.x - ox, y = p.y - oy;
      if (inside && !was) wet = y > 14; // came in at the front door
      was = inside;
      if (!inside || !wet || !p.moving || (p.z || 0) - oz > 0.2) { last = null; continue; }
      if (last && Math.hypot(x - last[0], y - last[1]) < 0.36) continue;
      const dx = last ? x - last[0] : 0, dy = last ? y - last[1] : -1, l = Math.hypot(dx, dy) || 1;
      side = -side;
      prints.push({ x: x - (dy / l) * 0.09 * side, y: y + (dx / l) * 0.09 * side, a: Math.atan2(dy, dx), t, bird: w.id === 'pidge' });
      last = [x, y];
    }
  }
  return (ctx, t) => {
    if (!Q.detail) return;
    const now = loopT(t);
    for (const f of prints) {
      const age = (now - f.t + LOOP) % LOOP;
      if (age > 32) continue;
      onFloor(ctx, f.x, f.y, (g) => {
        g.rotate(f.a);
        g.globalAlpha *= 0.6 * (1 - age / 32);
        g.fillStyle = NIGHT.mud; g.strokeStyle = NIGHT.mud;
        if (f.bird) {
          g.lineWidth = 0.035; g.lineCap = 'round';
          g.beginPath();
          for (const a of [-0.5, 0, 0.5]) { g.moveTo(0, 0); g.lineTo(Math.cos(a) * 0.16, Math.sin(a) * 0.16); }
          g.moveTo(0, 0); g.lineTo(-0.08, 0);
          g.stroke();
        } else {
          g.beginPath(); g.ellipse(0.04, 0, 0.1, 0.055, 0, 0, Math.PI * 2); g.fill();
          g.beginPath(); g.ellipse(-0.12, 0, 0.045, 0.045, 0, 0, Math.PI * 2); g.fill();
        }
      });
    }
  };
}

// ---------- The birthday ----------
// HAPPY 80TH along the banister, and a pair of foil balloons on the newel.
const BUNTING = 'HAPPY 80TH';
function bunting(ctx, t) {
  const Y = SY - 0.1, rail = (x) => pitch(x) + RAIL;
  const pts = [];
  for (let i = 0; i < BUNTING.length; i++) pts.push(10.2 - (BUNTING.length - 1 - i) * 0.66); // reads down the stairs
  ctx.beginPath();
  pts.forEach((x, i) => {
    const [X, Yy] = P(x, Y, rail(x) - 0.05);
    if (!i) { ctx.moveTo(X, Yy); return; }
    const [PX, PY] = P(pts[i - 1], Y, rail(pts[i - 1]) - 0.05);
    ctx.quadraticCurveTo((X + PX) / 2, (Yy + PY) / 2 + 0.22, X, Yy);
  });
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.stroke();
  const cols = [RUNNER, GOLD, INK.verdigris, INK.bone];
  [...BUNTING].forEach((ch, i) => {
    if (ch === ' ') return;
    const x = pts[i], [X, Yy] = P(x, Y, rail(x) - 0.05);
    const sw = Math.sin(t * 2.3 + i) * 0.05;
    ctx.save(); ctx.translate(X, Yy); ctx.rotate(sw);
    ctx.beginPath(); ctx.moveTo(-0.2, 0); ctx.lineTo(0.2, 0); ctx.lineTo(0, 0.5); ctx.closePath();
    const c = cols[i % cols.length];
    paint(ctx, c, { lw: 0.025 });
    if (Q.detail) {
      ctx.scale(1 / 40, 1 / 40);
      ctx.font = `${0.22 * 40}px "Bagel Fat One", "Arial Black", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = c === INK.bone || c === GOLD ? C.ink : INK.bone;
      ctx.fillText(ch, 0, 0.16 * 40);
    }
    ctx.restore();
  });
}
function balloons(ctx, t) {
  const bx = ST.x0 + ST.w + 0.15, by = SY - 0.16;
  const [KX, KY] = P(bx, by, 2.0);
  const list = [['8', -0.55, 3.55, GOLD], ['0', 0.05, 3.35, GOLD], ['', 0.5, 3.9, RUNNER]];
  list.forEach(([ch, dx, z, c], i) => {
    const bob = Math.sin(t * 1.3 + i * 2) * 0.1, sway = Math.sin(t * 0.9 + i) * 0.1;
    const [X, Y] = P(bx + dx * 0.7 + sway, by - dx * 0.7, z + bob);
    ctx.beginPath(); ctx.moveTo(KX, KY); ctx.quadraticCurveTo((KX + X) / 2 + 0.2, (KY + Y) / 2, X, Y + 0.3);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02; ctx.stroke();
    ctx.save(); ctx.translate(X, Y); ctx.rotate(sway * 0.8);
    if (ch) {
      ctx.scale(1 / 40, 1 / 40);
      ctx.font = `${0.8 * 40}px "Bagel Fat One", "Arial Black", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 0.1 * 40; ctx.strokeStyle = C.ink; ctx.lineJoin = 'round';
      ctx.strokeText(ch, 0, 0); ctx.fillStyle = c; ctx.fillText(ch, 0, 0);
      ctx.fillStyle = alpha(C.white, 0.6); ctx.fillText(ch, -0.03 * 40, -0.04 * 40);
      ctx.fillStyle = c; ctx.fillText(ch, 0.01 * 40, 0.02 * 40);
    } else {
      ellipse(ctx, 0, 0, 0.26, 0.32); paint(ctx, c, { lw: 0.035 });
      ellipse(ctx, -0.08, -0.12, 0.06, 0.09); ctx.fillStyle = alpha(C.white, 0.5); ctx.fill();
    }
    ctx.restore();
  });
  // The tie, round the newel's cap.
  ctx.beginPath(); ctx.arc(KX, KY, 0.05, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
}

function plinth(ctx) {
  const [x, y] = SPOT.A;
  box(ctx, x - 0.5, y - 0.5, 0, 1.0, 1.0, PLINTH_H, WOOD_D, { top: WOOD });
  flat(ctx, 'right', x - 0.25, y + 0.5, PLINTH_H * 0.5, (g) => {
    g.fillStyle = GOLD;
    g.fillRect(0, -0.09, 0.5, 0.18);
    if (!Q.detail) return;
    g.scale(1 / 40, 1 / 40);
    g.font = `${0.14 * 40}px "Bagel Fat One", "Arial Black", sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = C.ink;
    g.fillText('STAY.', 0.25 * 40, 0.01 * 40);
  });
}

export default {
  id: 'grand-hall',
  name: 'Grand Hall',
  blurb: 'The suit of armor keeps moving when nobody is looking. The portrait of the Lord is watching you, which is rude for a painting.',

  build(R) {
    R.floor(marble);
    R.walls({
      left: WALL, right: WALL_R, cap: INK.bone, cut: INK.stormNavy,
      dotsL: shade(WALL, 0.35), dotsR: shade(WALL_R, 0.35), densL: 0.1, densR: 0.1,
      doors: DOORS['grand-hall'] || [],
    });
    R.wall((ctx) => { damask(ctx, 'left'); damask(ctx, 'right'); });
    R.decor((ctx) => { wainscot(ctx, 'left'); wainscot(ctx, 'right'); });
    R.rug(rug);

    // The family, on the walls, watching. A picture light over his Lordship.
    hangPortraits(R);
    const look = makeWatchers(R);
    R.decor((ctx, t) => { for (const p of PORTRAITS) pupils(ctx, p, look(p, t), t); }, { anim: true });
    const LORD = PORTRAITS[0], [lu, lz] = mid(LORD);
    R.decor((ctx) => {
      box(ctx, 0.02, lu - 0.45, lz + LORD.h / 2 + 0.3, 0.3, 0.9, 0.09, GOLD);
      stick(ctx, [0.02, lu, lz + LORD.h / 2 + 0.22], [0.2, lu, lz + LORD.h / 2 + 0.33], GOLD, 0.04);
    });
    R.light({ at: [0.5, lu, lz + 0.8], r: 2.2, color: INK.candleGold, k: (t) => house.lamp(t) * 0.55 });
    // In the dark, his eyes catch the candlelight.
    R.light({
      at: [0.1, lu, lz + 0.3], r: 0.7, color: INK.candleGold, k: (t) => lightsOut(t) * 0.8,
      draw: (ctx, t, k) => {
        if (k < 0.05) return;
        const [lx, ly] = lordLook(t);
        onWall(ctx, 'left', lu, lz, (g) => {
          g.fillStyle = INK.candleGold;
          for (const [ex, ey] of LORD.eyes) { g.beginPath(); g.arc(ex + lx * 0.04, ey + ly * 0.02, 0.028, 0, Math.PI * 2); g.fill(); }
        });
      },
    });
    R.decor(boar);
    R.decor(signs);
    R.decor((ctx) => { for (const [s, u] of SCONCES) sconce(ctx, s, u); });
    SCONCES.forEach(([s, u], i) => candle(R, s === 'left' ? 0.18 : u, s === 'left' ? u : 0.18, 2.45, 30 + i, { r: 1.6 }));

    R.thing(2, 1, staircase, { depth: 1.2 });
    R.thing(ST.x0 + ST.w, SY, balustrade, { depth: 13.3 });

    // The clock (and the cat on it), counting down to midnight.
    R.thing(CLOCK.x, CLOCK.y, grandfather, { anim: true });
    R.thing(CLOCK.x + 0.01, CLOCK.y + 0.01, cat, { anim: true });
    R.air(bongs);
    R.light({
      at: (t) => { const c = catNow(t); return [c.x, c.y, c.z + 0.75]; }, r: 0.45, color: INK.candleGold,
      k: (t) => lightsOut(t) * 0.7,
      draw: (ctx, t, k) => {
        if (k < 0.05 || !Q.detail) return;
        const c = catNow(t), [X, Y] = P(c.x, c.y, c.z);
        ctx.save();
        ctx.translate(X, Y);
        catEyes(ctx, 0.07, -(0.26 + c.fright * 0.08) * 2 - 0.08, c.fright, t);
        ctx.restore();
      },
    });

    // The suit of armor, and the plinth it's meant to stay on.
    R.thing(SPOT.A[0], SPOT.A[1], plinth);
    R.mover(armorAt, armor, { bias: 0.05 });

    // The coats, and the goose pretending to be one.
    R.thing(COATS.x, COATS.y, coatStand);
    R.goose(gooseAt, {});
    R.mover(gooseAt, scarf, { bias: 0.01 });
    R.thing(BRELLY.x, BRELLY.y, umbrellaStand);
    R.rug(puddle, { anim: true });
    R.rug(doormat);

    // The hall table (candles, the post, the guest book, and everything long
    // left on it by the door), its stick stand, and a palm in the corner.
    R.thing(TABLE.x + TABLE.w, TABLE.y + TABLE.d / 2, hallTable);
    R.find({ id: 'rolling-pin', label: "Mrs. Hatchett's rolling pin", at: [0.58, 13.82, TABLE.h + 0.08], r: 0.6 });
    R.thing(STAND.x, STAND.y, stickStand);
    [-0.3, 0, 0.3].forEach((dy, i) => candle(R, TABLE.x + 0.4, TABLE.y + 0.55 + dy, TABLE.h + 0.6, 40 + i, { r: 1.5 }));
    R.thing(0.8, 3.0, (ctx, t) => plant(ctx, 0.8, 3.0, 0, t, { kind: 'palm', scale: 1.25, potColor: GOLD, leaf: MAT.leaf }), { anim: true });

    // The birthday: bunting on the banister, balloons on the newel, and the
    // cake on the tea trolley (a slice gone; crumbs to the coats).
    R.thing(ST.x0 + ST.w, SY, bunting, { anim: true, depth: 13.35 });
    R.thing(ST.x0 + ST.w + 0.2, SY + 0.1, balloons, { anim: true, depth: 14.3 });
    R.thing(TROLLEY.x, TROLLEY.y, (ctx, t) => trolley(ctx, t, armorAt(t).pose === 'teacup'), { anim: true });
    R.light({ at: [TROLLEY.x - 0.05, TROLLEY.y + 0.02, 1.9], r: 1.9, color: INK.candleGold, k: house.flicker(55) });
    R.rug(crumbs);

    // The gong, the mouse, and mud on the marble.
    R.thing(GONG.x, GONG.y, gong, { anim: true });
    R.mover(mouseTimes(R), mouse, { bias: 0.02 });
    R.rug(makePrints(R), { anim: true });

    // The chandelier, and the dust in its light.
    R.thing(CHAND.x, CHAND.y, chandelier, { anim: true });
    R.air(dust);
    R.light({ at: [CHAND.x, CHAND.y, CHAND.z - 0.2], r: 5.5, color: INK.candleGold, k: house.lamp });

    // In every flash, his Lordship. Drawn as a light: he glows, even in the dark.
    R.light({ at: [GHOST.x + 0.4, GHOST.y, 1.5], r: 1.7, color: PALE, k: (t) => pastK(t) * 0.45, draw: (ctx, t) => ghost(ctx, t) });
    R.dark(house.dark);
    // @@more
  },
};
