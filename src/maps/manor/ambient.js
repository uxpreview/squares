// Around the manor: the night it's printed in, the lawn it stands on (cut
// open on two sides like a slice of cake, which is where you see the cellar),
// the tower and chimneys that make its silhouette, the storm trees, the rain,
// and the lightning. The backdrop is drawn under the rooms, the sky over them.
import { ZK } from '../../engine/iso.js';
import { C, Q, box, face, poly, paint, alpha, mix, shade, hash, dots } from '../../engine/art.js';
import { rain, bolt } from '../../engine/weather.js';
import { reg, geeseV } from '../shared.js';
import { HOUSE, LAWN, DEPTH } from './plan.js';
import { INK, NIGHT, storm, lightsOut } from './style.js';

const P3 = (x, y, z = 0) => [x - y, (x + y) / 2 - z * ZK];

// The printed image area, in world iso units: the night, on the paper.
export const PLATE = [-74, -52, 66, 68];

const [LX0, LY0, LX1, LY1] = LAWN;
const [HX0, HY0, HX1, HY1] = HOUSE;
const inHouse = (x, y) => x >= HX0 && x <= HX1 && y >= HY0 && y <= HY1;
const behind = (x, y) => x < HX0 || y < HY0;

// The tower's lightning rod: where the big strikes land.
const TOWER = { x: -3.6, y: -3.6, top: 27.5 };
const ROD = P3(TOWER.x, TOWER.y, TOWER.top + 2.6);

// ---------- Backdrop ----------
export function backdrop(ctx, t, world, fx) {
  plate(ctx, t);
  clouds(ctx, t, 0);
  rain(ctx, t, { area: LAWN, n: 120, top: 22, seed: 5, color: NIGHT.rain, skip: (x, y) => inHouse(x, y) || !behind(x, y) });
  lawn(ctx);
  // Everything that stands on the lawn behind the house, back to front.
  const things = [
    [TOWER.x + TOWER.y, () => tower(ctx, t)],
    [22.5 - 0.7, () => chimney(ctx, 21.5, -1.4, 2, 1.4, 17)],
    [-0.7 + 24, () => chimney(ctx, -1.4, 23, 1.4, 2, 17)],
    [41 - 0.6, () => chimney(ctx, 40.5, -1.2, 1.5, 1.2, 9)],
    ...TREES.map((tr) => [tr[0] + tr[1], () => stormTree(ctx, t, ...tr)]),
    [-7.5 + 41.5, () => greenhouse(ctx)],
  ].sort((a, b) => a[0] - b[0]);
  for (const [, draw] of things) draw();
}

// The night: a storm-navy panel on the paper, with registration marks and a caption.
function plate(ctx) {
  const [X0, Y0, X1, Y1] = PLATE;
  ctx.beginPath();
  ctx.roundRect(X0, Y0, X1 - X0, Y1 - Y0, 3);
  ctx.fillStyle = NIGHT.plate;
  ctx.fill();
  if (Q.detail) {
    ctx.fillStyle = dots(NIGHT.plateDots, 0.22);
    ctx.fill();
  }
  reg(ctx, (X0 + X1) / 2, Y0 - 4);
  reg(ctx, (X0 + X1) / 2, Y1 + 8);
  reg(ctx, X0 - 4, (Y0 + Y1) / 2);
  reg(ctx, X1 + 4, (Y0 + Y1) / 2);
  const k = 40;
  ctx.save();
  ctx.translate((X0 + X1) / 2, Y1 + 3.6);
  ctx.scale(1 / k, 1 / k);
  ctx.font = `${1.1 * k}px "Rethink Sans", system-ui, sans-serif`;
  ctx.fillStyle = alpha(C.ink, 0.55);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GOOSEWORTH MANOR  ·  A DARK AND STORMY NIGHT', 0, 0);
  ctx.restore();
}

// The lawn: its top, the house's footings (seen when the floors lift away),
// and the two cut faces of earth at the front, down to DEPTH.
function lawn(ctx) {
  const top = [[LX0, LY0], [LX1, LY0], [LX1, LY1], [LX0, LY1]];
  poly(ctx, top.map(([x, y]) => [x, y, 0]));
  paint(ctx, NIGHT.lawn, { dots: NIGHT.lawnDots, density: 0.12, stroke: false });
  // The house's footings: dark earth where the ground floor sits.
  poly(ctx, [[HX0, HY0, -1.1], [HX1, HY0, -1.1], [HX1, HY1, -1.1], [HX0, HY1, -1.1]]);
  paint(ctx, NIGHT.earthDark, { stroke: false });
  face(ctx, [[HX0, HY0, 0], [HX1, HY0, 0], [HX1, HY0, -1.1], [HX0, HY0, -1.1]], NIGHT.earth, { stroke: false });
  face(ctx, [[HX0, HY0, 0], [HX0, HY1, 0], [HX0, HY1, -1.1], [HX0, HY0, -1.1]], shade(NIGHT.earth, 0.2), { stroke: false });
  // The drive runs out to the edge of the lawn.
  poly(ctx, [[23.4, 48, 0], [25.8, 48, 0], [25.8, LY1, 0], [23.4, LY1, 0]]);
  paint(ctx, NIGHT.gravel, { stroke: false });
  // The cut: the right face (where the cellar shows) and the front face.
  const right = [[LX1, LY0, 0], [LX1, LY1, 0], [LX1, LY1, -DEPTH], [LX1, LY0, -DEPTH]];
  const front = [[LX0, LY1, 0], [LX1, LY1, 0], [LX1, LY1, -DEPTH], [LX0, LY1, -DEPTH]];
  face(ctx, right, NIGHT.earth, { dots: shade(NIGHT.earth, 0.5), density: 0.2 });
  face(ctx, front, shade(NIGHT.earth, 0.25), { dots: shade(NIGHT.earth, 0.6), density: 0.25 });
  if (!Q.detail) return;
  // Strata in the cut, and the odd bone.
  ctx.lineWidth = 0.08;
  for (const [z, c] of [[-2.2, INK.oxblood], [-5.4, INK.deepPlum], [-8.1, INK.oxblood]]) {
    face(ctx, [[LX1, LY0, z], [LX1, LY1, z]], null, { stroke: alpha(c, 0.7), lw: 0.1 });
    face(ctx, [[LX0, LY1, z], [LX1, LY1, z]], null, { stroke: alpha(c, 0.7), lw: 0.1 });
  }
  for (let i = 0; i < 9; i++) {
    const x = LX0 + 4 + hash(3, i) * (LX1 - LX0 - 8), z = -1.5 - hash(4, i) * (DEPTH - 3);
    const [X, Y] = P3(x, LY1, z);
    ctx.beginPath();
    ctx.ellipse(X, Y, 0.55, 0.18, hash(5, i) * 3, 0, Math.PI * 2);
    ctx.fillStyle = alpha(INK.bone, 0.55);
    ctx.fill();
  }
}

// The tower at the back corner: the tallest thing, with lit windows and a
// lightning rod that the big strikes hit.
function tower(ctx, t) {
  const x = -6.6, y = -6.6, w = 5.8, h = 21.5;
  const stone = mix(NIGHT.stone, INK.stormNavy, 0.25);
  box(ctx, x, y, 0, w, w, h, stone, { dotsL: shade(stone, 0.5) });
  const lit = mix(INK.candleGold, INK.stormNavy, lightsOut(t) * 0.7);
  for (const z of [13.5, 17.2]) {
    face(ctx, [[x + 1.6, y + w, z], [x + 2.9, y + w, z], [x + 2.9, y + w, z + 2], [x + 1.6, y + w, z + 2]], lit);
    face(ctx, [[x + w, y + 1.6, z], [x + w, y + 2.9, z], [x + w, y + 2.9, z + 2], [x + w, y + 1.6, z + 2]], lit);
  }
  // A pointed roof, and the rod.
  const cx = x + w / 2, cy = y + w / 2;
  const tip = [cx, cy, TOWER.top];
  face(ctx, [[x - 0.4, y + w + 0.4, h], [x + w + 0.4, y + w + 0.4, h], tip], shade(INK.deepPlum, 0.1), { dots: shade(INK.deepPlum, 0.5), density: 0.2 });
  face(ctx, [[x + w + 0.4, y - 0.4, h], [x + w + 0.4, y + w + 0.4, h], tip], INK.deepPlum);
  face(ctx, [[cx, cy, TOWER.top], [cx, cy, TOWER.top + 2.6]], null, { lw: 0.12 });
}

function chimney(ctx, x, y, w, d, h) {
  const brick = mix(INK.oxblood, INK.stormNavy, 0.35);
  box(ctx, x, y, 0, w, d, h, brick, { dotsL: shade(brick, 0.5) });
  box(ctx, x - 0.15, y - 0.15, h, w + 0.3, d + 0.3, 0.35, shade(brick, 0.1));
  for (let i = 0; i < 2; i++) box(ctx, x + 0.25 + i * (w / 2), y + d / 2 - 0.2, h + 0.35, 0.4, 0.4, 0.6, INK.oxblood);
}

// Big dark trees, thrashing in the wind. [x, y, scale]
const TREES = [
  [-9, 4, 2.2], [-10, 17, 1.9], [-9.5, 29, 2.3], [6, -8.5, 2.1], [19, -9, 1.8], [31, -8.5, 2.2], [44, -8, 1.7],
  [-8, 44, 1.6],
];
function stormTree(ctx, t, x, y, s) {
  const [X, Y] = P3(x, y);
  const gust = Math.sin(t * 0.7 + x) * 0.5 + 0.5;
  const sway = Math.sin(t * 2.6 + x * 0.3 + y) * 0.05 + gust * 0.08;
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(-0.18, 0); ctx.lineTo(-0.1, -2.6); ctx.lineTo(0.1, -2.6); ctx.lineTo(0.18, 0);
  paint(ctx, shade(C.brown, 0.35));
  ctx.rotate(sway);
  for (const [bx, by, br] of [[0, -3.4, 1.3], [-0.9, -2.8, 0.9], [0.9, -2.9, 0.95], [0.2, -4.4, 0.9]]) {
    ctx.beginPath();
    ctx.arc(bx + sway * 6, by, br, 0, Math.PI * 2);
    paint(ctx, NIGHT.leaf, { dots: shade(NIGHT.leaf, 0.45), density: 0.28 });
  }
  ctx.restore();
}

function greenhouse(ctx) {
  const x = -12, y = 36, w = 8, d = 11, h = 3.2;
  const glass = alpha(mix(INK.bone, INK.verdigris, 0.5), 0.55);
  box(ctx, x, y, 0, w, d, h, glass, { flat: true, left: glass, right: alpha(mix(INK.bone, INK.verdigris, 0.35), 0.6), top: glass });
  face(ctx, [[x, y + d, h], [x + w, y + d, h], [x + w / 2, y + d, h + 1.8]], glass);
  face(ctx, [[x + w / 2, y, h + 1.8], [x + w / 2, y + d, h + 1.8], [x + w, y + d, h], [x + w, y, h]], alpha(mix(INK.bone, INK.verdigris, 0.3), 0.6));
}

// Low, heavy clouds along the top of the plate, drifting.
function clouds(ctx, t, layer) {
  const [X0, Y0, X1, Y1] = PLATE;
  const cloud = mix(INK.stormNavy, INK.deepPlum, 0.45);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(X0, Y0, X1 - X0, Y1 - Y0, 3);
  ctx.clip();
  for (let i = 0; i < 7; i++) {
    const span = X1 - X0 + 40;
    const X = X0 - 20 + ((hash(i, layer + 1) * span + t * (0.5 + hash(i, 9) * 0.6)) % span);
    const Y = Y0 + 4 + hash(i, layer + 2) * 7;
    const s = 5 + hash(i, 3) * 5;
    ctx.beginPath();
    ctx.ellipse(X, Y, s * 1.6, s * 0.45, 0, 0, Math.PI * 2);
    ctx.ellipse(X - s * 0.7, Y - s * 0.25, s * 0.8, s * 0.4, 0, 0, Math.PI * 2);
    ctx.ellipse(X + s * 0.6, Y - s * 0.3, s, s * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = cloud;
    ctx.fill();
  }
  ctx.restore();
}

// ---------- Sky ----------
// Rain in front of the house, the lightning (a bolt and a flash of cold light
// over everything), and the victory lap.
export function sky(ctx, t, world, fx) {
  ctx.save();
  if (fx.cut) ctx.clip(fx.cut, 'evenodd'); // keep the weather out of the room you're in
  rain(ctx, t, { area: LAWN, n: 260, top: 22, seed: 8, color: NIGHT.rain, skip: (x, y) => inHouse(x, y) || behind(x, y) });
  ctx.restore();
  const s = storm.strike(t);
  if (s && !fx.thumb) {
    const k = storm.flash(t);
    // Big strikes hit the tower's rod; small ones fork down out of the clouds.
    if (s.big) bolt(ctx, [PLATE[0] + 20 + s.x * 90, PLATE[1] + 8], ROD, s.i + 1, k);
    else {
      const X = PLATE[0] + 12 + s.x * (PLATE[2] - PLATE[0] - 24);
      bolt(ctx, [X, PLATE[1] + 8], [X + (s.y - 0.5) * 16, PLATE[1] + 30 + s.y * 14], s.i + 7, k * 0.8);
    }
    // The flash lights the night, not the paper around it.
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(PLATE[0], PLATE[1], PLATE[2] - PLATE[0], PLATE[3] - PLATE[1], 3);
    ctx.fillStyle = alpha(NIGHT.flash, 0.4 * k);
    ctx.fill();
    ctx.restore();
  }
  if (fx.parade) geeseV(ctx, t, fx.parade, world.totalGeese, 60, 24);
}
