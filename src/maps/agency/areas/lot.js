// The Lot: the parking lot under the windows. Two rows of cars facing each
// other across an aisle, the CEO's black SUV across two spaces right under the
// pitch room, Doug in his car (he eats every meal there), a gas car parked at
// the electric charger, the Courier's van in the aisle with its hazards on,
// the front door with a concrete porch goose in a raincoat, the road along
// the front, the drive up the right-hand end to the dumpster pen at the edge
// of the woods. The bear comes and goes from here (clock.js).
//
// Running gags: the bear's day (the dumpster at 10:15, Doug's sandwich at
// one, the CEO's roof at 4:30, the empty lot at night); the leaf blower man,
// who blows the same leaves from one end of the lot to the other and back,
// and freezes whenever the bear's about. The little story: an electric car
// waits behind the gas car at the charger all day, blinker on, and gets the
// spot at five.
import { C, Q, P, box, rect, face, paint, person, folk, alpha, tint, shade, mix, hash, speech, label, glow, rigid, dots } from '../../../engine/art.js';
import { route, clamp } from '../../../engine/actors.js';
import { ZK, SLAB } from '../../../engine/iso.js';
import { INK, TONE, BLOCK } from '../style.js';
import { car, bear, lettering, maple, pine } from '../kit.js';
import { STONE, PRIMAL } from '../style.js';
import { BD, BW, W, D, ROW_A, ROW_B, AISLE, ROAD, DRIVE, BAY, DUMPSTER, DOOR, CEO_CAR, DOUG_CAR } from '../plan.js';
import { bearAt, at, H, staffed, BEAR_TIMES, nightK, LOOP } from '../clock.js';

const wrap = (t) => (((t % LOOP) + LOOP) % LOOP);
const between = (t, h0, h1) => { const h = H(t); return h >= h0 && h < h1; };

// ---------- Where things are ----------
const ASPHALT = INK.asphalt, ROADC = TONE.road, CONCRETE = tint(C.greyLight, 0.1);
const VERGE = mix(INK.leaves, C.brown, 0.18);
const LEAFS = [INK.maple, C.mustard, INK.leaves, C.brown, C.coral];
// The leaf pile, nudged a little off the chunk seam at y 32.
const PILE = [3, AISLE + 0.4];
const BLOW_Y = AISLE + 1.0; // the leaf blower's line, in front of the van
const EV_BAY = 69.6, CHARGER = [71.05, 26.45];
const VAN = { x0: 52.6, x1: 56.4, y0: 32.25, y1: 34.0 };
// The dumpster, at the front of its pen so the bear can get its head in.
const DUMP = { x0: 107.9, x1: 111.3, y0: 4.6, y1: 7.0, h: 1.45 };
const KEY = [88.4, ROAD[0] - 0.3, 0.05];
const PORCH = [DOOR[0] + 2.1, BD + 0.6];
const CURB = ROAD[0] - 0.5;
// Lamp posts: along the curb, and two up the drive. [x, y, arm toward]
const LAMPS = [[12, CURB + 0.25, 'y'], [36, CURB + 0.25, 'y'], [60, CURB + 0.25, 'y'], [84, CURB + 0.25, 'y'], [101, CURB + 0.25, 'y'], [105.4, 17, 'x'], [105.4, 5, 'x']];
const lampK = (t) => clamp((nightK(t) - 0.35) / 0.3);

// Which bays have a car: most, by day; a few overnight. The walkway to the
// front door (row A) and where people cross from the road (row B) stay clear,
// as do the CEO's two spaces, Doug's, and the charger's bay (drawn on its own).
const keep = (x, row) => {
  if (row === 'a' && Math.abs(x - DOOR[0]) < 2.6) return false;
  if (row === 'a' && Math.abs(x - CEO_CAR[0]) < 2.5) return false;
  if (row === 'a' && Math.abs(x - EV_BAY) < 1) return false;
  if (row === 'b' && x > 48.5 && x < 54) return false;
  if (row === 'b' && Math.abs(x - DOUG_CAR[0]) < 1.3) return false;
  return true;
};
const bays = (row) => {
  const out = [];
  for (let x = 6 + BAY / 2; x < BW - 1; x += BAY) if (keep(x, row)) out.push(x);
  return out;
};

// ---------- Small pieces ----------
function leaf(ctx, X, Y, s, rot, color) {
  ctx.beginPath(); ctx.ellipse(X, Y, 0.11 * s, 0.055 * s, rot, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
}
// A flat band of paint on the ground from (x0, y0) to (x1, y1), w wide.
function stripe(ctx, x0, y0, x1, y1, w, color) {
  const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = (-dy / l) * w / 2, ny = (dx / l) * w / 2;
  face(ctx, [[x0 + nx, y0 + ny, 0.01], [x1 + nx, y1 + ny, 0.01], [x1 - nx, y1 - ny, 0.01], [x0 - nx, y0 - ny, 0.01]], color, { stroke: false });
}

// A car along x (the kit's car runs along y): for the road, the electric
// car waiting in the aisle. The +x end and the +y side are the ones we see.
// dir 1: its front toward +x. o: { riders: [{ v, top, skin, hair, lift }] }
function autoX(ctx, x, y, z, color, dir, o = {}) {
  const L = 2.8, Wd = 1.5;
  const at2 = (u, v) => [x + u * dir, y + v];
  const lface = (pts, col, op) => face(ctx, pts.map(([u, v, h]) => [...at2(u, v), z + h]), col, op);
  const lbox = (u0, u1, v0, v1, h0, h, col, op) => {
    const [ax, ay] = at2(u0, v0), [bx, by] = at2(u1, v1);
    box(ctx, Math.min(ax, bx), Math.min(ay, by), z + h0, Math.abs(bx - ax), Math.abs(by - ay), h, col, op);
  };
  const near = Wd / 2, endU = dir > 0 ? L / 2 : -L / 2, front = dir > 0;
  const glassC = mix(tint(C.sky, 0.25), color, 0.12);
  const cb0 = -0.95, cb1 = 0.55, rf0 = -0.78, rf1 = 0.22, cw = 0.63, h0 = 0.78, h1 = 1.3;
  if (!Q.detail) {
    lbox(-L / 2, L / 2, -Wd / 2, Wd / 2, 0.2, 0.6, color, { flat: true, lw: 0.045 });
    lbox(cb0, cb1, -cw, cw, h0, h1 - h0, glassC, { flat: true, top: tint(color, 0.08), lw: 0.04 });
    return;
  }
  for (const u of [-0.9, 0.9]) for (const v of [-0.5, 0.5]) lbox(u - 0.27, u + 0.27, v - 0.12, v + 0.12, 0, 0.42, C.ink, { flat: true, lw: 0.02 });
  lbox(-L / 2, L / 2, -Wd / 2, Wd / 2, 0.22, 0.56, color, { flat: true, lw: 0.045 });
  lface([[-L / 2, near, 0.22], [L / 2, near, 0.22], [L / 2, near, 0.33], [-L / 2, near, 0.33]], shade(color, 0.35), { stroke: false });
  // The wheels on the side we see.
  const disk = (u, r, col, lw) => { const pts = []; for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; pts.push([u + Math.cos(a) * r, near + 0.01, 0.24 + Math.sin(a) * r]); } lface(pts, col, { lw }); };
  for (const u of [-0.9, 0.9]) { disk(u, 0.24, C.ink, 0.02); disk(u, 0.1, C.greyLight, 0.015); }
  for (const v of [-0.48, 0.48]) lface([[endU, v - 0.16, 0.56], [endU, v + 0.16, 0.56], [endU, v + 0.16, 0.7], [endU, v - 0.16, 0.7]], front ? tint(C.butter, 0.5) : C.red, { lw: 0.02 });
  const dark = mix(C.ink, color, 0.2);
  lface([[cb0, -cw, h0], [cb1, -cw, h0], [rf1, -cw, h1], [rf0, -cw, h1]], dark, { lw: 0.03 });
  lface(front ? [[cb0, -cw, h0], [cb0, cw, h0], [rf0, cw, h1], [rf0, -cw, h1]] : [[cb1, -cw, h0], [cb1, cw, h0], [rf1, cw, h1], [rf1, -cw, h1]], dark, { lw: 0.03 });
  lface([[cb0, -cw, h0], [cb1, -cw, h0], [cb1, cw, h0], [cb0, cw, h0]], dark, { stroke: false });
  for (const r of o.riders || []) {
    const [SX, SY] = P(...at2(0.05, r.v || 0), z + h0 + 0.18);
    ctx.beginPath(); ctx.ellipse(SX, SY, 0.22, 0.16, 0, 0, Math.PI * 2); paint(ctx, r.top || C.navy, { lw: 0.02 });
    const [HX, HY] = P(...at2(0.05, r.v || 0), z + h0 + 0.37 + (r.lift || 0));
    ctx.beginPath(); ctx.arc(HX, HY, 0.15, 0, Math.PI * 2); paint(ctx, r.skin || mix(C.woodLight, C.brown, 0.3), { lw: 0.02 });
    ctx.beginPath(); ctx.arc(HX, HY - 0.03, 0.16, Math.PI * 1.05, Math.PI * 1.95); paint(ctx, r.hair || C.ink, { stroke: false });
  }
  const pane = alpha(glassC, 0.55);
  lface(front ? [[cb1, -cw, h0], [cb1, cw, h0], [rf1, cw, h1], [rf1, -cw, h1]] : [[cb0, -cw, h0], [cb0, cw, h0], [rf0, cw, h1], [rf0, -cw, h1]], pane, { lw: 0.03 });
  lface([[cb0, cw, h0], [cb1, cw, h0], [rf1, cw, h1], [rf0, cw, h1]], pane, { lw: 0.03 });
  const pil = (u0, u1) => lface([[u0 - 0.05, cw + 0.006, h0], [u0 + 0.05, cw + 0.006, h0], [u1 + 0.05, cw + 0.006, h1], [u1 - 0.05, cw + 0.006, h1]], color, { lw: 0.02 });
  pil(cb0 + 0.04, rf0 + 0.04); pil(-0.2, -0.2); pil(cb1 - 0.04, rf1 - 0.04);
  lface([[rf0, -cw, h1], [rf1, -cw, h1], [rf1, cw, h1], [rf0, cw, h1]], tint(color, 0.08), { lw: 0.04 });
}

// A lamp post: a concrete foot, a tall grey pole, an arm out over the lot
// (toward -y, or +x up the drive), the head.
function lampHead(x, y, arm) { return arm === 'y' ? [x, y - 1.15] : [x + 1.15, y]; }
function lampPost(ctx, x, y, arm) {
  const pole = shade(C.grey, 0.3);
  box(ctx, x - 0.2, y - 0.2, 0, 0.4, 0.4, 0.3, CONCRETE, { flat: true, lw: 0.025 });
  box(ctx, x - 0.06, y - 0.06, 0.3, 0.12, 0.12, 4.3, pole, { flat: true, lw: 0.025 });
  if (arm === 'y') box(ctx, x - 0.04, y - 1.0, 4.5, 0.08, 1.0, 0.08, pole, { flat: true, lw: 0.02 });
  else box(ctx, x, y - 0.04, 4.5, 1.0, 0.08, 0.08, pole, { flat: true, lw: 0.02 });
  const [hx, hy] = lampHead(x, y, arm);
  box(ctx, hx - 0.25, hy - 0.2, 4.38, 0.5, 0.4, 0.2, pole, { flat: true, lw: 0.025, top: tint(pole, 0.15) });
}

// The porch goose: concrete, standing on a little plinth by the front door,
// dressed for the weather in a yellow raincoat and a sou'wester, as porch
// geese in New England are. (A decoy, so it's drawn as a goose first.)
function porchGoose(ctx, x, y) {
  const [X, Y] = P(x, y, 0);
  const stone = C.greyLight, coat = C.mustard;
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(-1.05, 1.05);
  if (Q.detail) { ctx.beginPath(); ctx.ellipse(0, 0.02, 0.42, 0.17, 0, 0, Math.PI * 2); ctx.fillStyle = alpha(C.ink, 0.2); ctx.fill(); }
  // The plinth.
  ctx.beginPath(); ctx.ellipse(0, -0.02, 0.3, 0.12, 0, 0, Math.PI * 2); ctx.rect(-0.3, -0.16, 0.6, 0.14); paint(ctx, shade(stone, 0.2), { lw: 0.03 });
  ctx.beginPath(); ctx.ellipse(0, -0.16, 0.3, 0.12, 0, 0, Math.PI * 2); paint(ctx, stone, { lw: 0.03 });
  const by = -0.52;
  // Its tail, then the body in its coat.
  ctx.beginPath(); ctx.moveTo(-0.3, by - 0.05); ctx.lineTo(-0.56, by - 0.22); ctx.lineTo(-0.38, by + 0.08); ctx.closePath(); paint(ctx, stone, { lw: 0.04 });
  ctx.beginPath(); ctx.ellipse(0, by, 0.42, 0.25, -0.12, 0, Math.PI * 2); paint(ctx, coat, { dots: Q.detail ? shade(coat, 0.4) : null, density: 0.12, lw: 0.05 });
  // The coat's hem and buttons, and the feet poking out under it.
  ctx.beginPath(); ctx.moveTo(-0.34, by + 0.14); ctx.quadraticCurveTo(0, by + 0.3, 0.36, by + 0.08); ctx.strokeStyle = shade(coat, 0.35); ctx.lineWidth = 0.03; ctx.stroke();
  ctx.fillStyle = C.ink;
  for (const [bx, bb] of [[0.18, -0.08], [0.22, 0.04]]) { ctx.beginPath(); ctx.arc(bx, by + bb, 0.025, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = shade(stone, 0.15);
  for (const fx of [-0.06, 0.1]) { ctx.beginPath(); ctx.ellipse(fx, -0.2, 0.08, 0.035, 0, 0, Math.PI * 2); ctx.fill(); }
  // Neck and head, in stone.
  const nx = 0.28, ny = by - 0.64;
  ctx.beginPath(); ctx.moveTo(0.2, by - 0.12); ctx.quadraticCurveTo(0.36, by - 0.32, nx, ny);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.21; ctx.lineCap = 'round'; ctx.stroke();
  ctx.strokeStyle = stone; ctx.lineWidth = 0.14; ctx.stroke();
  // The coat's collar, up.
  ctx.beginPath(); ctx.ellipse(0.22, by - 0.16, 0.13, 0.08, -0.5, 0, Math.PI * 2); paint(ctx, coat, { lw: 0.03 });
  ctx.beginPath(); ctx.arc(nx, ny, 0.12, 0, Math.PI * 2); paint(ctx, stone, { lw: 0.04 });
  ctx.beginPath(); ctx.moveTo(nx + 0.08, ny - 0.04); ctx.lineTo(nx + 0.3, ny + 0.02); ctx.lineTo(nx + 0.08, ny + 0.06); paint(ctx, mix(C.coral, stone, 0.55), { lw: 0.03 });
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(nx + 0.03, ny - 0.02, 0.025, 0, Math.PI * 2); ctx.fill();
  // The sou'wester: a dome, and a brim that's longer at the back.
  ctx.beginPath(); ctx.ellipse(nx - 0.04, ny - 0.07, 0.22, 0.07, -0.15, 0, Math.PI * 2); paint(ctx, coat, { lw: 0.03 });
  ctx.beginPath(); ctx.arc(nx, ny - 0.08, 0.12, Math.PI, 0); ctx.closePath(); paint(ctx, coat, { lw: 0.03 });
  ctx.restore();
}
function pumpkin(ctx, x, y, s = 1) {
  const [X, Y] = P(x, y, 0.16 * s);
  const orange = mix(C.mustard, C.coral, 0.55);
  ctx.beginPath(); ctx.ellipse(X, Y, 0.22 * s, 0.16 * s, 0, 0, Math.PI * 2); paint(ctx, orange, { lw: 0.03, dots: Q.detail ? shade(orange, 0.4) : null, density: 0.12 });
  if (Q.detail) { ctx.beginPath(); ctx.ellipse(X, Y, 0.08 * s, 0.16 * s, 0, 0, Math.PI * 2); ctx.strokeStyle = shade(orange, 0.3); ctx.lineWidth = 0.02; ctx.stroke(); }
  ctx.beginPath(); ctx.rect(X - 0.025, Y - 0.22 * s, 0.05, 0.08 * s); paint(ctx, C.green, { lw: 0.015 });
}
function mums(ctx, x, y, color) {
  box(ctx, x - 0.2, y - 0.2, 0, 0.4, 0.4, 0.35, INK.maple, { flat: true, lw: 0.025 });
  const [X, Y] = P(x, y, 0.45);
  ctx.beginPath(); ctx.ellipse(X, Y, 0.32, 0.2, 0, 0, Math.PI * 2); paint(ctx, color, { lw: 0.03, dots: Q.detail ? shade(color, 0.35) : null, density: 0.3 });
}

// A sign on a post, a panel facing the lot (+y), words in lines.
function postSign(ctx, x, y, z0, w, h, panel, lines, ink = C.ink) {
  box(ctx, x - 0.04, y - 0.04, 0, 0.08, 0.08, z0 + h, shade(C.grey, 0.3), { flat: true, stroke: false });
  face(ctx, [[x - w / 2, y + 0.05, z0], [x + w / 2, y + 0.05, z0], [x + w / 2, y + 0.05, z0 + h], [x - w / 2, y + 0.05, z0 + h]], panel, { lw: 0.03 });
  lines.forEach(([text, size, font], i) => lettering(ctx, 'x', x, y + 0.06, z0 + h - (i + 0.6) * (h / lines.length), text, size, ink, font || 'Rethink Sans'));
}

// The sign at the foot of the drive: a low charcoal slab on a stone base,
// PRIMAL on it, in a bed of clipped shrubs under a red Japanese maple (the
// real office's sign, by its drive under big red maples).
const MONUMENT = [116.6, 38.2];
function monument(ctx) {
  const [x, y] = MONUMENT, slab = mix(C.ink, C.grey, 0.25);
  for (const [dx, dy] of [[-1.05, 0.15], [1.05, 0.1], [-0.6, 0.55], [0.6, 0.55]]) {
    const [X, Y] = P(x + dx, y + dy, 0.25);
    ctx.beginPath(); ctx.ellipse(X, Y, 0.42, 0.28, 0, 0, Math.PI * 2);
    paint(ctx, mix(C.green, INK.pine, 0.4), { lw: 0.03, dots: Q.detail ? shade(C.green, 0.4) : null, density: 0.3 });
  }
  box(ctx, x - 1.1, y - 0.25, 0, 2.2, 0.5, 0.3, STONE, { flat: true, lw: 0.03 });
  box(ctx, x - 0.95, y - 0.15, 0.3, 1.9, 0.3, 0.95, slab, { flat: true, lw: 0.035 });
  lettering(ctx, 'x', x, y + 0.16, 0.85, 'PRIMAL', 0.36, C.white, 'Bagel Fat One');
  face(ctx, [[x - 0.55, y + 0.16, 0.5], [x + 0.55, y + 0.16, 0.5], [x + 0.55, y + 0.16, 0.54], [x - 0.55, y + 0.16, 0.54]], PRIMAL, { stroke: false });
}

// The staff-made BEAR XING sign: a diamond of yellow card taped to a broom
// handle stuck in a traffic cone, the bear drawn in marker.
function bearXing(ctx, x, y) {
  const cone = mix(C.coral, C.mustard, 0.25);
  box(ctx, x - 0.3, y - 0.3, 0, 0.6, 0.6, 0.06, cone, { flat: true, lw: 0.025 });
  const [bx, by] = P(x, y, 0.06), [tx, ty] = P(x, y, 0.8);
  ctx.beginPath(); ctx.moveTo(bx - 0.3, by); ctx.lineTo(tx - 0.06, ty); ctx.lineTo(tx + 0.06, ty); ctx.lineTo(bx + 0.3, by); ctx.closePath(); paint(ctx, cone, { lw: 0.03 });
  ctx.beginPath(); ctx.moveTo(bx - 0.19, by - 0.3); ctx.lineTo(bx + 0.19, by - 0.3); ctx.lineTo(bx + 0.15, by - 0.42); ctx.lineTo(bx - 0.15, by - 0.42); ctx.closePath(); ctx.fillStyle = C.white; ctx.fill();
  // The broom handle, a little crooked.
  const [hx, hy] = P(x, y, 0.7), [ex, ey] = P(x + 0.08, y, 2.7);
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ex, ey); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.12; ctx.stroke(); ctx.strokeStyle = C.wood; ctx.lineWidth = 0.07; ctx.stroke();
  const zc = 2.2, r = 0.6, yy = y + 0.06, cx = x + 0.06;
  face(ctx, [[cx - r, yy, zc], [cx, yy, zc + r], [cx + r, yy, zc], [cx, yy, zc - r]], INK.sticky, { lw: 0.05 });
  face(ctx, [[cx - r + 0.1, yy + 0.005, zc], [cx, yy + 0.005, zc + r - 0.1], [cx + r - 0.1, yy + 0.005, zc], [cx, yy + 0.005, zc - r + 0.1]], null, { lw: 0.025 });
  lettering(ctx, 'x', cx, yy + 0.01, zc + 0.24, 'BEAR', 0.16, C.ink, 'Bagel Fat One');
  lettering(ctx, 'x', cx, yy + 0.01, zc - 0.26, 'XING', 0.16, C.ink, 'Bagel Fat One');
  // The bear, in marker, in the sign's plane.
  ctx.save();
  ctx.transform(1, 0.5, 0, ZK, cx - yy, (cx + yy) / 2 - zc * ZK);
  ctx.fillStyle = C.ink;
  ctx.beginPath(); ctx.ellipse(-0.02, 0, 0.17, 0.08, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0.17, -0.05, 0.06, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-0.15, 0.03, 0.04, 0.08); ctx.fillRect(0.08, 0.03, 0.04, 0.08);
  ctx.restore();
  // Tape at two corners.
  if (Q.detail) for (const s of [-1, 1]) face(ctx, [[cx + s * 0.32, yy + 0.02, zc + 0.36], [cx + s * 0.48, yy + 0.02, zc + 0.28], [cx + s * 0.44, yy + 0.02, zc + 0.2], [cx + s * 0.28, yy + 0.02, zc + 0.28]], alpha(C.white, 0.8), { stroke: false });
}

// The leaf pile: a mound, leaves of every color on it, a rake stuck in, and a
// white feather on top that isn't a leaf.
const PILE_LEAVES = Array.from({ length: 46 }, (_, i) => {
  const a = hash(i, 11) * Math.PI * 2, rr = Math.sqrt(hash(i, 12)) * 1.2;
  const dx = Math.cos(a) * rr, dy = Math.sin(a) * rr * 0.8;
  return { dx, dy, z: 0.95 * (1 - (rr / 1.3) ** 2) + 0.05, rot: hash(i, 13) * 6, c: LEAFS[Math.floor(hash(i, 14) * LEAFS.length)], s: 0.9 + hash(i, 15) * 0.6 };
}).sort((p, q) => (p.dx + p.dy) - (q.dx + q.dy) || p.z - q.z);
const dotsOf = () => dots(shade(INK.leaves, 0.45), 0.2);
function leafPile(ctx) {
  const [px, py] = PILE, [X, Y] = P(px, py, 0);
  // The rake, leaning in.
  const [r0x, r0y] = P(px + 0.6, py - 0.3, 0.4), [r1x, r1y] = P(px + 1.1, py - 0.5, 2.1);
  ctx.beginPath(); ctx.moveTo(r0x, r0y); ctx.lineTo(r1x, r1y); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.12; ctx.lineCap = 'round'; ctx.stroke(); ctx.strokeStyle = C.wood; ctx.lineWidth = 0.07; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(X, Y, 1.8, 0.8, 0, 0, Math.PI * 2); ctx.fillStyle = alpha(C.ink, 0.18); ctx.fill();
  // The mound: lumps, outlined together (ink under, fill over).
  const lumps = [[0, -0.55, 0.75], [-0.85, -0.25, 0.55], [0.85, -0.25, 0.55], [-0.45, -0.15, 0.6], [0.45, -0.15, 0.6], [-0.3, -0.8, 0.5], [0.35, -0.85, 0.45], [0, -0.1, 0.6]];
  const mound = (lw) => { for (const [lx, ly, r] of lumps) { ctx.beginPath(); ctx.arc(X + lx, Y + ly, r + lw, 0, Math.PI * 2); ctx.fill(); } };
  ctx.fillStyle = C.ink; mound(0.05);
  ctx.fillStyle = shade(INK.leaves, 0.12); mound(0);
  if (Q.detail) { ctx.fillStyle = dotsOf(); mound(0); }
  if (!Q.detail) return;
  for (const l of PILE_LEAVES) { const [lx, ly] = P(px + l.dx * 0.85, py + l.dy * 0.85, l.z * 0.8); leaf(ctx, lx, ly, l.s * 1.5, l.rot, l.c); }
  // The feather.
  const [fx, fy] = P(px + 0.1, py - 0.1, 1.05);
  ctx.beginPath(); ctx.moveTo(fx - 0.15, fy + 0.05); ctx.quadraticCurveTo(fx, fy - 0.2, fx + 0.18, fy - 0.12); ctx.quadraticCurveTo(fx + 0.02, fy - 0.02, fx - 0.15, fy + 0.05); paint(ctx, C.white, { lw: 0.025 });
}

// The dumpster pen: a wooden fence on three sides, the gate swung open.
function fence(ctx, x0, y0, x1, y1) {
  const w = Math.max(0.12, x1 - x0), d = Math.max(0.12, y1 - y0);
  box(ctx, x0, y0, 0, w, d, 1.75, C.wood, { flat: true, lw: 0.035, top: C.woodLight });
  if (!Q.detail) return;
  ctx.strokeStyle = alpha(shade(C.wood, 0.5), 0.8); ctx.lineWidth = 0.025; ctx.beginPath();
  if (w > d) for (let x = x0 + 0.35; x < x0 + w - 0.1; x += 0.35) { const [a, b] = P(x, y0 + d, 0), [c, e] = P(x, y0 + d, 1.75); ctx.moveTo(a, b); ctx.lineTo(c, e); }
  else for (let y = y0 + 0.35; y < y0 + d - 0.1; y += 0.35) { const [a, b] = P(x0 + w, y, 0), [c, e] = P(x0 + w, y, 1.75); ctx.moveTo(a, b); ctx.lineTo(c, e); }
  ctx.stroke();
}
function dumpsterBody(ctx) {
  const { x0, x1, y0, y1, h } = DUMP, g = shade(C.green, 0.12);
  if (Q.detail) for (const [cx, cy] of [[x0 + 0.3, y1 - 0.3], [x1 - 0.3, y1 - 0.3], [x0 + 0.3, y0 + 0.3], [x1 - 0.3, y0 + 0.3]]) box(ctx, cx - 0.1, cy - 0.1, 0, 0.2, 0.2, 0.15, C.ink, { flat: true, stroke: false });
  box(ctx, x0, y0, 0.15, x1 - x0, y1 - y0, h - 0.15, g, { lw: 0.045, dens: 0.15, top: shade(C.ink, 0.1) });
  // Fork pockets on the side, a rim, and its stencil.
  box(ctx, x1, y0 + 0.4, 0.75, 0.06, 0.45, 0.25, shade(g, 0.3), { flat: true, lw: 0.02 });
  box(ctx, x1, y1 - 0.85, 0.75, 0.06, 0.45, 0.25, shade(g, 0.3), { flat: true, lw: 0.02 });
  face(ctx, [[x0, y1 + 0.005, h - 0.18], [x1, y1 + 0.005, h - 0.18], [x1, y1 + 0.005, h], [x0, y1 + 0.005, h]], tint(g, 0.12), { lw: 0.025 });
  lettering(ctx, 'x', (x0 + x1) / 2, y1 + 0.01, 0.72, 'NO BEARS', 0.36, C.white, 'Bagel Fat One');
  // The latch, hanging open.
  if (Q.detail) { const [lx, ly] = P(x1 - 0.5, y1 + 0.02, h - 0.1), [mx, my] = P(x1 - 0.42, y1 + 0.02, h - 0.55); ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(mx, my); ctx.strokeStyle = C.greyLight; ctx.lineWidth = 0.06; ctx.stroke(); }
}
// The lid, a degrees open on its hinge at the back; and the raccoon, when
// it's open, up on the rim with a crust.
function dumpsterLid(ctx, a, t, coon) {
  const { x0, x1, y0, y1, h } = DUMP, dep = y1 - y0 + 0.08;
  const yf = y0 + Math.cos(a) * dep, zf = h + Math.sin(a) * dep;
  const lid = shade(C.green, 0.25);
  const lidFace = () => face(ctx, [[x0 - 0.04, y0, h], [x1 + 0.04, y0, h], [x1 + 0.04, yf, zf], [x0 - 0.04, yf, zf]], lid, { lw: 0.04, dots: Q.detail ? shade(lid, 0.5) : null, density: 0.12 });
  if (a > 0.25) {
    // The lid up behind; inside, bags and a box.
    lidFace();
    if (Q.detail) {
      const [bx, by] = P(x0 + 1.0, y0 + 1.2, h - 0.05); ctx.beginPath(); ctx.ellipse(bx, by, 0.4, 0.22, 0, 0, Math.PI * 2); paint(ctx, C.black, { lw: 0.02 });
      const [cx, cy] = P(x1 - 0.9, y0 + 1.0, h - 0.05); ctx.beginPath(); ctx.ellipse(cx, cy, 0.35, 0.2, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.02 });
    }
    if (coon) raccoon(ctx, t);
  } else {
    lidFace();
    // Shut, or nearly: two eyes in the gap.
    if (Q.detail && (t % 4.5) > 0.25) for (const ex of [-0.12, 0.12]) {
      const [X, Y] = P(x0 + 1.5 + ex * 1.3, y1 + 0.02, h + 0.12);
      ctx.beginPath(); ctx.arc(X, Y, 0.06, 0, Math.PI * 2); ctx.fillStyle = C.butter; ctx.fill(); ctx.beginPath(); ctx.arc(X, Y, 0.025, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
    }
  }
}
function raccoon(ctx, t) {
  const { x0, y1, h } = DUMP;
  const x = x0 + 1.5, y = y1 - 0.15, chew = Math.abs(Math.sin(t * 6)) * 0.03;
  const fur = C.grey;
  // (Drawn half again as big as it measures, so it reads over the rim.)
  const [AX, AY] = P(x, y, h);
  ctx.save(); ctx.translate(AX, AY); ctx.scale(1.6, 1.6); ctx.translate(-AX, -AY);
  // The ringed tail, up behind it.
  const [tx, ty] = P(x - 0.5, y - 0.4, h + 0.1);
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(tx - i * 0.05, ty - i * 0.14, 0.09, 0.09, 0, 0, Math.PI * 2); paint(ctx, i % 2 ? C.ink : fur, { lw: 0.02 }); }
  const [X, Y] = P(x, y, h + 0.2);
  ctx.beginPath(); ctx.ellipse(X, Y + 0.12, 0.26, 0.16, 0, Math.PI, 0); paint(ctx, fur, { lw: 0.03 });
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(X + s * 0.15, Y - 0.17, 0.07, 0, Math.PI * 2); paint(ctx, fur, { lw: 0.025 }); }
  ctx.beginPath(); ctx.arc(X, Y - chew, 0.2, 0, Math.PI * 2); paint(ctx, fur, { lw: 0.03 });
  // The mask, its eyes, its nose.
  ctx.beginPath(); ctx.ellipse(X, Y - 0.02 - chew, 0.19, 0.06, 0, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
  ctx.fillStyle = C.white; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(X + s * 0.08, Y - 0.03 - chew, 0.03, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(X, Y + 0.09 - chew, 0.08, 0.05, 0, 0, Math.PI * 2); ctx.fillStyle = C.white; ctx.fill();
  ctx.beginPath(); ctx.arc(X, Y + 0.07 - chew, 0.025, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
  // Paws on the rim, and a pizza crust.
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(X + s * 0.18, Y + 0.24, 0.07, 0.045, 0, 0, Math.PI * 2); paint(ctx, C.ink, { lw: 0.015 }); }
  ctx.beginPath(); ctx.ellipse(X + 0.06, Y + 0.2, 0.17, 0.05, -0.2, 0, Math.PI * 2); paint(ctx, C.woodLight, { lw: 0.02 });
  ctx.restore();
}

// The Courier's van, PARCELS (EVENTUALLY), parked in the aisle: its cab
// toward -x, its back doors toward us.
function van(ctx) {
  const { x0, x1, y0, y1 } = VAN, cab = 1.0, Hb = 2.4, Hc = 1.7, yel = C.mustard;
  if (Q.detail) for (const wx of [x0 + 0.7, x1 - 0.75]) box(ctx, wx - 0.3, y0 + 0.08, 0, 0.6, y1 - y0 - 0.16, 0.42, C.ink, { flat: true, lw: 0.02 });
  box(ctx, x0, y0, 0.3, cab, y1 - y0, Hc - 0.3, yel, { flat: true, lw: 0.04, top: tint(yel, 0.15) });
  face(ctx, [[x0 + 0.08, y1 + 0.005, 0.95], [x0 + cab - 0.08, y1 + 0.005, 0.95], [x0 + cab - 0.08, y1 + 0.005, Hc - 0.1], [x0 + 0.32, y1 + 0.005, Hc - 0.1]], tint(C.sky, 0.25), { lw: 0.03 });
  box(ctx, x0 + cab, y0, 0.3, x1 - x0 - cab, y1 - y0, Hb - 0.3, yel, { lw: 0.045, dens: 0.12, top: tint(yel, 0.2) });
  face(ctx, [[x0, y1 + 0.01, 0.42], [x1, y1 + 0.01, 0.42], [x1, y1 + 0.01, 0.6], [x0, y1 + 0.01, 0.6]], C.ink, { stroke: false });
  lettering(ctx, 'x', (x0 + cab + x1) / 2, y1 + 0.02, 1.72, 'PARCELS', 0.46, C.ink, 'Bagel Fat One');
  lettering(ctx, 'x', (x0 + cab + x1) / 2, y1 + 0.02, 1.2, '(EVENTUALLY)', 0.22, C.ink);
  // The back doors.
  face(ctx, [[x1 + 0.01, y0 + 0.1, 0.4], [x1 + 0.01, y1 - 0.1, 0.4], [x1 + 0.01, y1 - 0.1, Hb - 0.08], [x1 + 0.01, y0 + 0.1, Hb - 0.08]], shade(yel, 0.06), { lw: 0.03 });
  face(ctx, [[x1 + 0.015, (y0 + y1) / 2, 0.4], [x1 + 0.015, (y0 + y1) / 2, Hb - 0.08]], null, { lw: 0.03 });
  if (!Q.detail) return;
  for (const wx of [x0 + 0.7, x1 - 0.75]) {
    const pts = []; for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; pts.push([wx + Math.cos(a) * 0.26, y1 + 0.015, 0.26 + Math.sin(a) * 0.26]); }
    face(ctx, pts, C.ink, { lw: 0.02 });
  }
  // A parcel with a goose's address on it, on the dash.
  box(ctx, x0 + 0.25, y1 - 0.55, Hc - 0.55, 0.3, 0.3, 0.22, C.woodLight, { flat: true, lw: 0.02 });
}

// ---------- The area ----------
export default {
  id: 'lot',
  name: 'The Lot',
  blurb: 'The CEO parks across two spaces and Doug eats every meal in his car. The bear drops by three times a day; the leaves never leave.',
  describe: 'A parking lot under the office: two rows of cars, a van with its hazards on, an electric charger, a stone goose by the door, a dumpster pen by the woods and a road. A man blows leaves to and fro. A black bear visits; at night lamps light the empty lot.',

  build(R) {
    const shape = R.shape;
    const has = (x, y) => shape.some((r) => x >= r[0] && x < r[2] && y >= r[1] && y < r[3]);

    // ---------- The ground ----------
    R.floor((ctx) => {
      const cut = mix(C.brown, INK.leaves, 0.35);
      for (const [x0, y0, x1, y1] of shape) {
        if (!has(x1 + 0.01, (y0 + y1) / 2)) face(ctx, [[x1, y0, 0], [x1, y1, 0], [x1, y1, -SLAB], [x1, y0, -SLAB]], shade(cut, 0.12));
        if (!has((x0 + x1) / 2, y1 + 0.01)) face(ctx, [[x0, y1, 0], [x1, y1, 0], [x1, y1, -SLAB], [x0, y1, -SLAB]], shade(cut, 0.3), { dots: shade(cut, 0.6), density: 0.25 });
        rect(ctx, x0, y0, x1 - x0, y1 - y0, 0, VERGE, { stroke: false, dots: Q.detail ? shade(VERGE, 0.3) : null, density: 0.12 });
      }
      // The lot's asphalt (the left end is a leafy island), the drive, the road.
      rect(ctx, 5.2, BD, BW + 2.5 - 5.2, ROAD[0] - BD, 0, ASPHALT, { stroke: false, dots: Q.detail ? shade(ASPHALT, 0.35) : null, density: 0.1 });
      rect(ctx, DRIVE[0], 0, DRIVE[1] - DRIVE[0], ROAD[0], 0, ASPHALT, { stroke: false, dots: Q.detail ? shade(ASPHALT, 0.35) : null, density: 0.1 });
      rect(ctx, 0, ROAD[0], W, ROAD[1] - ROAD[0], 0, ROADC, { stroke: false, dots: Q.detail ? shade(ROADC, 0.35) : null, density: 0.12 });
      // The sidewalk along the building, and the curb along the road.
      rect(ctx, 0, BD, BW, 1, 0.01, CONCRETE, { stroke: false });
      face(ctx, [[0, BD + 1, 0.01], [BW, BD + 1, 0.01]], null, { lw: 0.04, stroke: shade(CONCRETE, 0.3) });
      rect(ctx, 0, CURB, BW + 2.5, 0.5, 0.01, CONCRETE, { stroke: false });
      rect(ctx, DRIVE[1], CURB, W - DRIVE[1], 0.5, 0.01, CONCRETE, { stroke: false });
      face(ctx, [[0, ROAD[0], 0.01], [W, ROAD[0], 0.01]], null, { lw: 0.05, stroke: shade(CONCRETE, 0.35) });
      if (Q.detail) for (let x = 0.6; x < BW; x += 1.6) face(ctx, [[x, BD, 0.012], [x, BD + 1, 0.012]], null, { lw: 0.02, stroke: shade(CONCRETE, 0.15) });
    });

    R.rug((ctx) => {
      const paintW = alpha(C.white, 0.85);
      // Bay lines.
      for (let x = 6; x <= BW + 0.01; x += BAY) {
        stripe(ctx, x, ROW_A[0], x, ROW_A[1], 0.09, paintW);
        stripe(ctx, x, ROW_B[0], x, ROW_B[1], 0.09, paintW);
      }
      // The walk to the front door, and the crosswalk over the aisle.
      rect(ctx, DOOR[0] - 1.4, BD + 1, 2.8, ROW_A[1] - BD - 1, 0.01, CONCRETE, { stroke: false });
      face(ctx, [[DOOR[0] - 1.4, BD + 1, 0.012], [DOOR[0] - 1.4, ROW_A[1], 0.012]], null, { lw: 0.03, stroke: shade(CONCRETE, 0.3) });
      face(ctx, [[DOOR[0] + 1.4, BD + 1, 0.012], [DOOR[0] + 1.4, ROW_A[1], 0.012]], null, { lw: 0.03, stroke: shade(CONCRETE, 0.3) });
      for (let x = DOOR[0] - 1.25; x < DOOR[0] + 1.3; x += 0.55) stripe(ctx, x, ROW_A[1] + 0.15, x, ROW_B[0] - 0.15, 0.28, paintW);
      // The road's lines.
      for (let x = 1; x < W; x += 3.2) stripe(ctx, x, (ROAD[0] + ROAD[1]) / 2, x + 1.8, (ROAD[0] + ROAD[1]) / 2, 0.14, INK.sticky);
      stripe(ctx, 0, ROAD[0] + 0.35, W, ROAD[0] + 0.35, 0.07, paintW);
      stripe(ctx, 0, ROAD[1] - 0.35, W, ROAD[1] - 0.35, 0.07, paintW);
      // Arrows in the aisle that don't agree.
      const arrow = (x, y, s) => face(ctx, [[x - 0.9 * s, y - 0.12, 0.01], [x + 0.3 * s, y - 0.12, 0.01], [x + 0.3 * s, y - 0.4, 0.01], [x + 0.95 * s, y, 0.01], [x + 0.3 * s, y + 0.4, 0.01], [x + 0.3 * s, y + 0.12, 0.01], [x - 0.9 * s, y + 0.12, 0.01]], paintW, { stroke: false });
      arrow(26, AISLE, 1); arrow(80, AISLE, -1); arrow(92, AISLE, 1);
      // The charger's bay, painted.
      rect(ctx, EV_BAY - 1.15, ROW_A[0] + 0.05, 2.3, ROW_A[1] - ROW_A[0] - 0.1, 0.01, alpha(C.green, 0.75), { stroke: false });
      if (Q.detail) {
        const [bx, by] = [EV_BAY, ROW_A[1] - 0.6];
        face(ctx, [[bx - 0.1, by - 0.5, 0.012], [bx + 0.3, by - 0.5, 0.012], [bx + 0.05, by, 0.012], [bx + 0.25, by, 0.012], [bx - 0.2, by + 0.5, 0.012], [bx - 0.02, by + 0.05, 0.012], [bx - 0.25, by + 0.05, 0.012]], C.white, { stroke: false });
      }
      // A speed bump up the drive, and SLOW.
      for (let i = 0; i < 6; i++) rect(ctx, DRIVE[0] + i * (DRIVE[1] - DRIVE[0]) / 6, 13.5, (DRIVE[1] - DRIVE[0]) / 6, 0.5, 0.02, i % 2 ? C.ink : INK.sticky, { stroke: false });
      paintText(ctx, (DRIVE[0] + DRIVE[1]) / 2, 21.5, 'SLOW', 1.1);
      if (!Q.detail) return;
      // Oil stains, a drain, a manhole.
      for (let i = 0; i < 16; i++) {
        const x = 8 + hash(i, 21) * 92, y = hash(i, 22) < 0.5 ? ROW_A[1] - 0.5 - hash(i, 23) : ROW_B[0] + 0.3 + hash(i, 23);
        const [X, Y] = P(x, y, 0.01);
        ctx.beginPath(); ctx.ellipse(X, Y, 0.3 + hash(i, 24) * 0.3, 0.14 + hash(i, 24) * 0.12, 0, 0, Math.PI * 2); ctx.fillStyle = alpha(C.ink, 0.22); ctx.fill();
      }
      for (const x of [30, 78]) rect(ctx, x, CURB - 0.05, 0.9, 0.45, 0.012, shade(ASPHALT, 0.45), { lw: 0.02 });
      { const [X, Y] = P(64, ROAD[0] + 1.2, 0.01); ctx.beginPath(); ctx.ellipse(X, Y, 0.8, 0.4, 0, 0, Math.PI * 2); paint(ctx, shade(ROADC, 0.25), { lw: 0.025 }); }
      // Muddy paw prints from the woods to the dumpster, and down the drive.
      ctx.fillStyle = alpha(C.ink, 0.3);
      const prints = (ax, ay, bx, by) => {
        const n = Math.floor(Math.hypot(bx - ax, by - ay) / 0.55);
        for (let i = 0; i < n; i++) {
          const k = i / n, s = i % 2 ? 0.18 : -0.18;
          const [X, Y] = P(ax + (bx - ax) * k + s * 0.7, ay + (by - ay) * k - s * 0.7, 0.012);
          ctx.beginPath(); ctx.ellipse(X, Y, 0.09, 0.05, 0, 0, Math.PI * 2); ctx.fill();
        }
      };
      prints(117.5, 1.6, 110.4, 8.4); prints(110.6, 9.2, 110.8, 25);
      // Fallen leaves: on the islands, along the curbs, a few out on the lot.
      for (let i = 0; i < 150; i++) {
        let x, y;
        const r = hash(i, 31);
        if (r < 0.25) { x = hash(i, 32) * 5.2; y = BD + hash(i, 33) * 13.5; }
        else if (r < 0.45) { x = hash(i, 32) * BW; y = CURB - hash(i, 33) * 0.6; }
        else if (r < 0.6) { x = hash(i, 32) * BW; y = BD + 1 + hash(i, 33) * 0.5; }
        else if (r < 0.75) { x = BW + hash(i, 32) * (W - BW); y = hash(i, 33) * ROAD[0]; }
        else { x = 5 + hash(i, 32) * 100; y = BD + 1 + hash(i, 33) * 13; }
        const [X, Y] = P(x, y, 0.012);
        leaf(ctx, X, Y, 1 + hash(i, 34), hash(i, 35) * 6, LEAFS[i % LEAFS.length]);
      }
    });
    function paintText(ctx, u, v, text, size) {
      ctx.save();
      ctx.transform(1, 0.5, -1, 0.5, u - v, (u + v) / 2);
      ctx.scale(1 / 40, 1 / 40);
      ctx.font = `${size * 40}px "Bagel Fat One", "Arial Black", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = alpha(C.white, 0.8);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }

    // The night: a veil of navy on the ground, pools of lamplight in it.
    // (Baked when its strength steps, rather than drawn every frame.)
    R.rug((ctx, t) => {
      const k = nightK(t);
      if (k < 0.02) return;
      ctx.save();
      ctx.globalAlpha *= 0.32 * k;
      for (const [x0, y0, x1, y1] of shape) rect(ctx, x0, y0, x1 - x0, y1 - y0, 0.02, C.night, { stroke: false });
      ctx.restore();
      const lk = lampK(t);
      if (lk > 0.02) for (const [x, y, arm] of LAMPS) {
        const [hx, hy] = lampHead(x, y, arm), [X, Y] = P(hx, hy, 0.02);
        ctx.beginPath(); ctx.ellipse(X, Y, 3, 1.5, 0, 0, Math.PI * 2); ctx.fillStyle = alpha(C.butter, 0.22 * lk); ctx.fill();
      }
    }, { anim: true, step: (t) => Math.round(nightK(t) * 12) });

    // ---------- Islands, trees, lamps ----------
    R.thing(1.8, 28.6, (ctx) => maple(ctx, 1.8, 28.6, 0, 1.15, INK.maple));
    R.thing(105.2, 10.2, (ctx) => maple(ctx, 105.2, 10.2, 0, 1, tint(INK.maple, 0.25)));
    R.thing(116.9, 14.5, (ctx) => pine(ctx, 116.9, 14.5, 0, 1.2));
    R.thing(116.6, 21, (ctx) => maple(ctx, 116.6, 21, 0, 1.05, C.mustard));
    R.thing(116.3, 31, (ctx) => pine(ctx, 116.3, 31, 0, 1));
    R.thing(117.3, 35.8, (ctx) => maple(ctx, 117.3, 35.8, 0, 0.75, INK.maple));
    R.thing(MONUMENT[0], MONUMENT[1] + 0.7, (ctx) => monument(ctx));
    for (const [x, y, arm] of LAMPS) {
      R.thing(x, y + 0.2, (ctx) => lampPost(ctx, x, y, arm));
      const [hx, hy] = lampHead(x, y, arm);
      // The lit head, faded in after dark; its glow goes on the light layer.
      R.thing(x, y + 0.21, (ctx) => box(ctx, hx - 0.22, hy - 0.17, 4.36, 0.44, 0.34, 0.04, C.butter, { flat: true, stroke: false, left: C.butter, right: C.butter }), { fade: lampK });
      R.light({ at: [hx, hy, 4.3], r: 3.2, color: C.butter, k: lampK });
    }

    // ---------- The rows ----------
    // Row A nose to the building, row B nose to the aisle. Most go home at
    // five (staffed), so the lot empties by night; the rest stay over. A car
    // that's there all loop is a still; the others fade in and out.
    const parked = (x, y, dir, color, leaves, gone) => {
      const draw = (ctx) => car(ctx, x, y, 0, color, { dir, leaves });
      R.thing(x, y + 1.5, draw, gone ? { fade: (t) => (gone(t) ? 0 : 1) } : {});
    };
    bays('a').forEach((x, i) => {
      const color = BLOCK.car[i % BLOCK.car.length], k = ((i * 7) % 10) / 10;
      const stays = i % 5 === 0 || Math.abs(x - 60) < 0.5;
      parked(x, ROW_A[0] + 2.2, -1, color, i % 3 === 0, stays ? null : (t) => !(staffed(t) > k * 0.9));
    });
    bays('b').forEach((x, i) => {
      const color = BLOCK.car[(i + 3) % BLOCK.car.length], k = ((i * 3) % 10) / 10;
      parked(x, ROW_B[0] + 2.2, 1, color, i % 4 === 1, i % 6 === 0 ? null : (t) => !(staffed(t) > k * 0.9));
    });

    // The car alarm: on a car in row A. Tapped, it flashes and wails for a
    // few seconds; nobody looks up.
    const alarm = R.poke({ id: 'alarm', at: [60, ROW_A[0] + 2.2, 1.4], r: 0.8, say: 'WEE-OO WEE-OO. Nobody looks up.', hold: 3 });
    R.thing(60, ROW_A[0] + 3.75, (ctx, t) => {
      const on = (t * 4) % 1 < 0.5, y = ROW_A[0] + 2.2 + 1.41;
      for (const v of [-0.48, 0.48]) {
        face(ctx, [[60 + v - 0.16, y, 0.56], [60 + v + 0.16, y, 0.56], [60 + v + 0.16, y, 0.7], [60 + v - 0.16, y, 0.7]], on ? C.mustard : C.red, { lw: 0.02 });
        if (on) glow(ctx, 60 + v, y, 0.63, 0.9, C.mustard, 0.9);
      }
      if (!Q.detail) return;
      // Sound lines, out from the roof.
      const [X, Y] = P(60, ROW_A[0] + 2.2, 1.6);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const r = 0.3 + (((t * 2) + i / 3) % 1) * 0.6;
        for (const a of [0, Math.PI]) { ctx.beginPath(); ctx.arc(X, Y, r, a - 0.6, a + 0.6); ctx.stroke(); }
      }
    }, { anim: true, on: () => alarm.k() > 0.01 });

    // ---------- The CEO's car ----------
    // A black SUV across two spaces, right under the pitch room, a vanity
    // plate on it; two RESERVED signs in front, both hers. (At 4:30 the bear
    // sits on its roof, through the end of the pitch.)
    const [cx, cy] = CEO_CAR;
    R.thing(cx, cy + 1.75, (ctx) => {
      car(ctx, cx, cy, 0, C.black, { dir: -1, tall: true, long: 3.4, wide: 2.6 });
      const y = cy + 1.71;
      face(ctx, [[cx - 0.3, y, 0.3], [cx + 0.3, y, 0.3], [cx + 0.3, y, 0.5], [cx - 0.3, y, 0.5]], C.white, { lw: 0.02 });
      lettering(ctx, 'x', cx, y + 0.005, 0.4, 'DANA 1', 0.13, C.navy, 'Bagel Fat One');
    });
    // One sign at the head of each of her two bays.
    const [ra, rb] = [cx - BAY / 2, cx + BAY / 2];
    R.thing(ra, BD + 0.5, (ctx) => postSign(ctx, ra, BD + 0.45, 1.25, 0.7, 0.6, C.white, [['RESERVED', 0.15, 'Bagel Fat One'], ['CEO', 0.17, 'Bagel Fat One']], C.navy));
    R.thing(rb, BD + 0.5, (ctx) => postSign(ctx, rb, BD + 0.45, 1.25, 0.7, 0.6, C.white, [['RESERVED', 0.15, 'Bagel Fat One'], ['ALSO CEO', 0.14, 'Bagel Fat One']], C.navy));
    R.find({ id: 'two-spaces', label: 'A car across two spaces', at: [cx, cy, 1.0], r: 0.9 });

    // ---------- Doug ----------
    // Doug's in his car all day: breakfast, lunch, a second lunch (he always
    // packs two), chips, dinner, then asleep at the wheel. At one the bear
    // comes for his sandwich and he ducks under the dashboard.
    const [dx, dy] = DOUG_CAR;
    const meal = (t) => {
      const h = H(t), s = wrap(t), w = BEAR_TIMES[1];
      if (w && s > w[0] - 1 && s < w[1] + 2) return 'duck';
      if (h >= 21 || h < 7.3) return 'sleep';
      if (h < 11) return 'breakfast';
      if (w && s <= w[0]) return 'lunch';
      if (h < 15.5) return 'second';
      if (h < 18.2) return 'chips';
      return 'pizza';
    };
    R.thing(dx, dy + 1.5, (ctx, t) => {
      const m = meal(t), eating = m !== 'sleep' && m !== 'duck';
      const bite = eating ? Math.max(0, Math.sin(t * 2.2)) : 0;
      car(ctx, dx, dy, 0, C.green, { dir: 1 });
      // A coffee cup forgotten on the roof, all day.
      box(ctx, dx - 0.15, dy - 0.45, 1.31, 0.18, 0.18, 0.24, C.white, { flat: true, lw: 0.02 });
      // Doug, in his open window (the near one), napkin tucked in.
      const win = [[0.63, -0.95, 0.78], [0.63, 0.55, 0.78], [0.63, 0.22, 1.3], [0.63, -0.78, 1.3]].map(([v, u, z]) => [dx + v + 0.01, dy + u, z]);
      if (m !== 'duck') {
        ctx.save();
        face(ctx, win, alpha(C.ink, 0.6), { lw: 0.03 });
        ctx.clip();
        const slump = m === 'sleep' ? 0.12 : 0;
        const [SX, SY] = P(dx + 0.6, dy - 0.2, 0.9 - slump);
        ctx.beginPath(); ctx.ellipse(SX, SY, 0.32, 0.2, 0, Math.PI, 0); ctx.lineTo(SX + 0.32, SY + 0.3); ctx.lineTo(SX - 0.32, SY + 0.3); ctx.closePath(); paint(ctx, C.brown, { lw: 0.025 });
        if (m !== 'sleep') { ctx.beginPath(); ctx.moveTo(SX - 0.1, SY - 0.17); ctx.lineTo(SX + 0.1, SY - 0.17); ctx.lineTo(SX, SY + 0.1); ctx.closePath(); paint(ctx, C.white, { lw: 0.02 }); }
        const [HX, HY] = P(dx + 0.6, dy - 0.2, 1.1 - slump + bite * 0.03);
        ctx.beginPath(); ctx.arc(HX, HY, 0.17, 0, Math.PI * 2); paint(ctx, mix(C.woodLight, C.brown, 0.25), { lw: 0.025 });
        ctx.beginPath(); ctx.arc(HX, HY - 0.03, 0.18, Math.PI * 1.05, Math.PI * 1.95); paint(ctx, C.brown, { stroke: false });
        ctx.fillStyle = C.ink;
        if (m === 'sleep') { ctx.fillRect(HX + 0.02, HY + 0.01, 0.07, 0.02); ctx.fillRect(HX + 0.11, HY + 0.01, 0.07, 0.02); }
        else { ctx.beginPath(); ctx.arc(HX + 0.05, HY + 0.01, 0.025, 0, Math.PI * 2); ctx.arc(HX + 0.13, HY + 0.01, 0.025, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(HX + 0.1, HY + 0.1, 0.04, 0.02 + bite * 0.03, 0, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }
      if (!Q.detail) return;
      const [X, Y] = P(dx + 0.66, dy + 0.05, 1.02 + bite * 0.06);
      if (m === 'duck') {
        // Just the top of his head, under the window.
        const [hx, hy] = P(dx + 0.62, dy - 0.2, 0.8);
        ctx.beginPath(); ctx.arc(hx, hy, 0.15, Math.PI, 0); paint(ctx, C.brown, { lw: 0.02 });
        label(ctx, dx + 0.6, dy - 0.2, 1.9, '!', 0.5, C.red);
      } else if (m === 'sleep') {
        const k = (t * 0.6) % 1;
        label(ctx, dx + 0.6 - 0.3 * k, dy - 0.3 - 0.3 * k, 1.5 + k, 'z', 0.3 + k * 0.2, alpha(C.ink, 1 - k));
      } else {
        ctx.save(); ctx.translate(X, Y); ctx.scale(1.5, 1.5); ctx.translate(-X, -Y);
        if (m === 'breakfast') {
          ctx.beginPath(); ctx.arc(X, Y, 0.13, 0, Math.PI * 2); paint(ctx, C.woodLight, { lw: 0.02 });
          ctx.beginPath(); ctx.arc(X, Y - 0.02, 0.1, Math.PI * 1.1, Math.PI * 1.9); ctx.lineWidth = 0.06; ctx.strokeStyle = C.pink; ctx.stroke();
          ctx.beginPath(); ctx.arc(X, Y, 0.04, 0, Math.PI * 2); ctx.fillStyle = shade(C.green, 0.4); ctx.fill();
        } else if (m === 'lunch' || m === 'second') {
          ctx.beginPath(); ctx.moveTo(X - 0.18, Y + 0.08); ctx.lineTo(X + 0.18, Y + 0.08); ctx.lineTo(X, Y - 0.16); ctx.closePath(); paint(ctx, C.butter, { lw: 0.025 });
          ctx.beginPath(); ctx.moveTo(X - 0.16, Y + 0.06); ctx.lineTo(X + 0.16, Y + 0.06); ctx.strokeStyle = C.leaf; ctx.lineWidth = 0.05; ctx.stroke();
          ctx.beginPath(); ctx.arc(X + 0.04, Y - 0.12, 0.05, 0, Math.PI * 2); ctx.fillStyle = mix(C.green, C.ink, 0.6); ctx.fill();
        } else if (m === 'chips') {
          ctx.beginPath(); ctx.rect(X - 0.1, Y - 0.14, 0.2, 0.26); paint(ctx, C.red, { lw: 0.02 });
          ctx.fillStyle = C.mustard; ctx.beginPath(); ctx.arc(X - 0.02, Y - 0.16, 0.05, 0, Math.PI * 2); ctx.arc(X + 0.05, Y - 0.15, 0.04, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.beginPath(); ctx.moveTo(X - 0.16, Y - 0.08); ctx.lineTo(X + 0.16, Y - 0.08); ctx.lineTo(X, Y + 0.16); ctx.closePath(); paint(ctx, C.mustard, { lw: 0.025 });
          ctx.fillStyle = C.red; for (const [a, b] of [[-0.06, -0.03], [0.05, -0.02], [0, 0.06]]) { ctx.beginPath(); ctx.arc(X + a, Y + b, 0.03, 0, Math.PI * 2); ctx.fill(); }
        }
        ctx.restore();
      }
      // Steam off the morning's coffee.
      if (m === 'breakfast') for (let i = 0; i < 2; i++) { const k = ((t * 0.5) + i / 2) % 1; const [sx, sy] = P(dx - 0.06, dy - 0.36, 1.6 + k * 0.6); ctx.beginPath(); ctx.arc(sx + Math.sin(k * 6 + i) * 0.05, sy, 0.05 + k * 0.05, 0, Math.PI * 2); ctx.fillStyle = alpha(C.white, 0.7 * (1 - k)); ctx.fill(); }
    }, { anim: true });
    R.find({ id: 'doug', label: 'Someone eating lunch in their car', at: [dx + 0.3, dy + 0.1, 1.3], r: 0.8 });

    // ---------- The charger ----------
    // A gas car at the electric charger all day, sticky notes piling up on its
    // back window; an electric car waits behind it in the aisle, nose to the
    // bay, blinker on (queuing, straight: only the CEO parks badly).
    // At five the gas car goes, the electric car pulls in and charges all
    // night. (The cable, meanwhile, lies on the ground, not plugged in.)
    const GAS = [8.1, 17.15], EV_IN = [8.2, 8.6], PULL = [17.2, 17.32];
    const gasHere = (t) => between(t, GAS[0], GAS[1]);
    const evWaits = (t) => between(t, EV_IN[1], PULL[0]);
    const evCharging = (t) => H(t) >= PULL[1];
    const EVC = C.teal, EVY = VAN.y0 + 0.85, EVW = ROW_A[1] + 1.0;
    R.thing(CHARGER[0], CHARGER[1] + 0.2, (ctx) => {
      const [x, y] = CHARGER;
      box(ctx, x - 0.25, y - 0.2, 0, 0.5, 0.4, 0.1, CONCRETE, { flat: true, lw: 0.02 });
      box(ctx, x - 0.18, y - 0.14, 0.1, 0.36, 0.28, 1.5, C.white, { flat: true, lw: 0.03, top: C.teal });
      face(ctx, [[x - 0.12, y + 0.145, 1.05], [x + 0.12, y + 0.145, 1.05], [x + 0.12, y + 0.145, 1.4], [x - 0.12, y + 0.145, 1.4]], C.ink, { lw: 0.02 });
      face(ctx, [[x - 0.18, y + 0.145, 0.25], [x + 0.18, y + 0.145, 0.25], [x + 0.18, y + 0.145, 0.42], [x - 0.18, y + 0.145, 0.42]], C.teal, { stroke: false });
    });
    R.thing(68.3, BD + 0.5, (ctx) => postSign(ctx, 68.3, BD + 0.45, 1.3, 0.7, 0.55, C.green, [['EV', 0.2, 'Bagel Fat One'], ['ONLY', 0.17, 'Bagel Fat One']], C.white));
    // The cable, lying on the ground with its plug, while nobody's charging.
    R.thing(CHARGER[0] + 0.3, BD + 1.6, (ctx) => {
      const [x, y] = CHARGER;
      const pts = [[x + 0.15, y + 0.15, 0.7], [x + 0.3, y + 0.3, 0.05], [x + 0.6, y + 0.8, 0.03], [x + 0.2, y + 1.2, 0.03], [x - 0.2, y + 1.0, 0.03], [x - 0.35, y + 1.45, 0.03]];
      ctx.beginPath(); pts.forEach((p, i) => { const [X, Y] = P(...p); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.09; ctx.lineJoin = 'round'; ctx.stroke();
      box(ctx, x - 0.45, y + 1.4, 0, 0.2, 0.14, 0.12, C.teal, { flat: true, lw: 0.02 });
    }, { fade: (t) => (evCharging(t) ? 0 : 1) });
    // The gas car: red, a spoiler, twin pipes.
    R.thing(EV_BAY, ROW_A[0] + 3.7, (ctx) => {
      const y = ROW_A[0] + 2.2;
      car(ctx, EV_BAY, y, 0, C.red, { dir: -1 });
      box(ctx, EV_BAY - 0.7, y + 1.15, 0.8, 1.4, 0.12, 0.22, C.black, { flat: true, lw: 0.02 });
      for (const v of [-0.3, 0.3]) { const [X, Y] = P(EV_BAY + v, y + 1.42, 0.28); ctx.beginPath(); ctx.ellipse(X, Y, 0.07, 0.05, 0, 0, Math.PI * 2); paint(ctx, C.greyLight, { lw: 0.02 }); }
    }, { fade: (t) => (gasHere(t) ? 1 : 0) });
    // Notes on its back window, one more an hour.
    R.thing(EV_BAY, ROW_A[0] + 3.71, (ctx, t) => {
      const n = clamp(Math.floor((H(t) - 9.2) / 1.1) + 1, 0, 6), y = ROW_A[0] + 2.2;
      const cols = [INK.sticky, C.pink, INK.sticky, C.tealLight, INK.sticky, C.coralLight];
      for (let i = 0; i < n; i++) {
        const v = -0.45 + (i % 3) * 0.33 + (i > 2 ? 0.12 : 0), s = i > 2 ? 0.55 : 0.12;
        const q = (vv, ss) => [EV_BAY + vv, y + 0.95 - 0.17 * ss - 0.01, 0.78 + 0.52 * ss];
        face(ctx, [q(v, s), q(v + 0.22, s), q(v + 0.22, s + 0.35), q(v, s + 0.35)], cols[i], { lw: 0.015 });
      }
    }, { anim: true, on: gasHere });
    // The electric car: arriving, waiting with its blinker, pulling in.
    R.mover((t) => {
      if (between(t, EV_IN[0], EV_IN[1])) {
        const k = (H(t) - EV_IN[0]) / (EV_IN[1] - EV_IN[0]);
        return { x: 106 - (106 - EV_BAY) * (1 - (1 - k) ** 2), y: EVY, along: 'x' };
      }
      if (between(t, PULL[0], PULL[1])) {
        const k = (H(t) - PULL[0]) / (PULL[1] - PULL[0]);
        return { x: EV_BAY, y: EVW + (ROW_A[0] + 2.2 - EVW) * k, along: 'y' };
      }
      return { x: EV_BAY, y: EVY, gone: true };
    }, (ctx, t, p) => {
      if (p.gone) return;
      if (p.along === 'x') rigid(ctx, 'lot-ev-x', p.x, p.y, 0, (g) => autoX(g, p.x, p.y, 0, EVC, -1, { riders: [{ v: 0.25, top: C.lilac }] }));
      else rigid(ctx, 'lot-ev-y', p.x, p.y, 0, (g) => car(g, p.x, p.y, 0, EVC, { dir: -1, riders: [{ front: true, v: 0.25, top: C.lilac }] }));
    }, { bias: 0.8 });
    R.thing(EV_BAY, EVW + 1.5, (ctx) => car(ctx, EV_BAY, EVW, 0, EVC, { dir: -1, riders: [{ front: true, v: 0.25, top: C.lilac }] }), { fade: (t) => (evWaits(t) ? 1 : 0) });
    R.thing(EV_BAY + 0.5, EVW + 1.51, (ctx, t) => {
      if ((t * 1.5) % 1 > 0.5) return;
      const y = EVW + 1.41;
      face(ctx, [[EV_BAY + 0.32, y, 0.56], [EV_BAY + 0.64, y, 0.56], [EV_BAY + 0.64, y, 0.7], [EV_BAY + 0.32, y, 0.7]], C.mustard, { lw: 0.02 });
      glow(ctx, EV_BAY + 0.48, y, 0.63, 0.8, C.mustard, 0.9);
    }, { anim: true, on: evWaits });
    // Charging, all night: plugged in at last.
    R.thing(EV_BAY, ROW_A[0] + 3.7, (ctx) => {
      car(ctx, EV_BAY, ROW_A[0] + 2.2, 0, EVC, { dir: -1 });
      const [x, y] = CHARGER;
      const pts = [[x + 0.15, y + 0.15, 0.7], [x - 0.1, y + 0.6, 0.15], [x - 0.6, y + 1.0, 0.5]];
      ctx.beginPath(); pts.forEach((pp, i) => { const [X, Y] = P(...pp); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.09; ctx.stroke();
    }, { fade: (t) => (evCharging(t) ? 1 : 0) });
    R.thing(CHARGER[0], CHARGER[1] + 0.21, (ctx, t) => {
      const [x, y] = CHARGER, k = 0.5 + Math.sin(t * 2) * 0.5;
      face(ctx, [[x - 0.1, y + 0.15, 1.1], [x + 0.1, y + 0.15, 1.1], [x + 0.1, y + 0.15, 1.1 + 0.25 * k + 0.03], [x - 0.1, y + 0.15, 1.1 + 0.25 * k + 0.03]], C.leaf, { stroke: false });
      glow(ctx, x, y + 0.15, 1.25, 0.7, C.leaf, 0.7);
    }, { anim: true, on: evCharging });

    // ---------- The Courier's van ----------
    // In the aisle with its hazards on, from 8:50 to five.
    const vanHere = (t) => between(t, 8.8, 17.15);
    R.thing((VAN.x0 + VAN.x1) / 2, VAN.y1 + 0.05, van, { fade: (t) => (vanHere(t) ? 1 : 0) });
    R.thing(VAN.x1 + 0.05, VAN.y1 + 0.06, (ctx, t) => {
      if ((t * 1.2) % 1 > 0.5) return;
      const { x0, x1, y0, y1 } = VAN;
      for (const [x, y, z] of [[x1 + 0.02, y0 + 0.25, 0.75], [x1 + 0.02, y1 - 0.25, 0.75], [x0 + 0.12, y1 + 0.02, 0.85], [x1 - 0.12, y1 + 0.02, 0.85]]) {
        const [X, Y] = P(x, y, z);
        ctx.beginPath(); ctx.arc(X, Y, 0.08, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.02 });
        glow(ctx, x, y, z, 0.8, C.mustard, 0.9);
      }
    }, { anim: true, on: vanHere });

    // ---------- The front door ----------
    // The porch goose in its raincoat (a decoy), pumpkins, a pot of mums each
    // side of the door, a bench.
    R.thing(PORCH[0], PORCH[1] + 0.1, (ctx) => { porchGoose(ctx, PORCH[0], PORCH[1]); pumpkin(ctx, PORCH[0] + 0.55, PORCH[1] + 0.25, 1); pumpkin(ctx, PORCH[0] + 0.85, PORCH[1] - 0.05, 0.7); });
    R.decoy({ id: 'porch-goose', at: [PORCH[0], PORCH[1], 0.75], r: 0.7, say: 'Porch goose in a raincoat. New England.' });
    R.thing(DOOR[0] - 1.9, BD + 0.45, (ctx) => mums(ctx, DOOR[0] - 1.9, BD + 0.3, C.mustard));
    R.thing(DOOR[0] + 1.9, BD + 0.45, (ctx) => mums(ctx, DOOR[0] + 1.9, BD + 0.3, INK.maple));
    R.thing(30, BD + 0.5, (ctx) => {
      box(ctx, 29, BD + 0.15, 0, 0.1, 0.4, 0.45, C.ink, { flat: true, stroke: false });
      box(ctx, 30.9, BD + 0.15, 0, 0.1, 0.4, 0.45, C.ink, { flat: true, stroke: false });
      box(ctx, 28.9, BD + 0.1, 0.45, 2.2, 0.5, 0.1, C.wood, { flat: true, lw: 0.025 });
      box(ctx, 28.9, BD + 0.05, 0.55, 2.2, 0.08, 0.5, C.wood, { flat: true, lw: 0.025 });
    });

    // Someone on a call, pacing the sidewalk since nine. He never sees the bear.
    const pace = route([[33.6, BD + 0.55, 2.5], [41.2, BD + 0.55, 2.5]], { speed: 0.7, loop: false });
    const lines = ['Can you hear me now?', 'You\'re on mute.', 'Let\'s take it offline.', 'Sorry, it\'s windy here.', 'Love that. Circle back?'];
    const caller = folk(612, { top: C.white, bottom: C.navy, style: 'short', hair: C.ink, skin: C.blush, dress: false });
    R.mover((t) => (between(t, 9, 17.1) ? pace(t) : { x: 37, y: BD + 0.55, gone: true }), (ctx, t, p) => {
      if (p.gone) return;
      person(ctx, p.x, p.y, 0, {
        ...caller, pose: p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back, speed: 5, arms: [0.45, -0.1],
        wear: (c, b) => { if (b.back) return; c.beginPath(); c.moveTo(0.06, b.top + 0.04); c.lineTo(0.16, b.top + 0.04); c.lineTo(0.13, b.top + 0.5); c.lineTo(0.09, b.top + 0.5); c.closePath(); c.fillStyle = C.red; c.fill(); },
        face: (c, hy) => { c.beginPath(); c.roundRect(0.24, hy - 0.16, 0.1, 0.24, 0.03); c.fillStyle = C.ink; c.fill(); },
      }, t);
      if (!Q.detail) return;
      const b = bearAt(t);
      const near = !b.away && Math.hypot(b.x - p.x, b.y - p.y) < 17;
      if (near) speech(ctx, p.x, p.y, 2.7, 'No, it\'s fine. It\'s a bear.', { size: 0.36 });
      else if (t % 15 < 3.5) speech(ctx, p.x, p.y, 2.7, lines[Math.floor(t / 15) % lines.length], { size: 0.36 });
    }, { bias: 0.1 });

    // ---------- The left end: the leaf pile, the BEAR XING sign ----------
    const pile = R.poke({ id: 'leaves', at: [PILE[0], PILE[1], 0.6], r: 1, say: 'Leaves everywhere. One of them honked.' });
    R.thing(PILE[0], PILE[1] + 1.2, leafPile, { fade: () => 1 - pile.k() });
    // The pile rustles now and then: something's in there.
    R.thing(PILE[0], PILE[1] + 1.21, (ctx, t) => {
      const k = (t % 6.5) / 0.7;
      if (k > 1 || !Q.detail) return;
      for (let i = 0; i < 3; i++) {
        const [X, Y] = P(PILE[0] - 0.3 + i * 0.3, PILE[1] + 0.2 - i * 0.2, 1.0 + Math.sin(k * Math.PI) * (0.4 + i * 0.15));
        leaf(ctx, X, Y, 1.4, t * 8 + i, LEAFS[i]);
      }
    }, { anim: true, on: () => pile.k() < 0.5 });
    // Tapped: the leaves fly and lie flat around it (sorted behind the goose).
    R.thing(PILE[0], PILE[1] - 1.6, (ctx) => {
      if (!Q.detail) return;
      const k = pile.k();
      for (const [i, l] of PILE_LEAVES.entries()) {
        const sp = 1 + k * 0.9;
        const [X, Y] = P(PILE[0] + l.dx * sp, PILE[1] + l.dy * sp, 0.02 + l.z * (1 - k) * 0.4);
        leaf(ctx, X, Y, l.s * 1.4, l.rot + i, l.c);
      }
      // A burst for the first second after it opens.
      const age = pile.open ? (performance.now() - pile.since) / 1000 : 9;
      if (age < 1.3) for (let i = 0; i < 18; i++) {
        const a = hash(i, 41) * Math.PI * 2, v = 1 + hash(i, 42) * 1.6;
        const [X, Y] = P(PILE[0] + Math.cos(a) * v * age, PILE[1] + Math.sin(a) * v * age, 0.5 + age * 3 - age * age * 2.6);
        leaf(ctx, X, Y, 1.6, age * 10 + i, LEAFS[i % LEAFS.length]);
      }
    }, { anim: true, on: () => pile.k() > 0.01 });
    R.goose(() => ({ x: PILE[0], y: PILE[1], z: 0, dir: 'r', pose: 'sit', hidden: pile.k() < 0.5 }),
      { kind: 'poke', inside: pile, hint: 'The leaf blower man built a pile at the end of the lot. Something\'s in it.' });
    R.thing(2.4, ROW_B[1] - 0.4, (ctx) => bearXing(ctx, 2.4, ROW_B[1] - 0.6));
    // His leaf bags, by the pile: still empty.
    R.thing(4.3, 30.9, (ctx) => {
      for (const [x, y] of [[3.6, 29.9], [4.4, 30.3]]) {
        box(ctx, x - 0.25, y - 0.25, 0, 0.5, 0.5, 0.95, C.woodLight, { flat: true, lw: 0.03, top: shade(C.woodLight, 0.25) });
        if (Q.detail) lettering(ctx, 'x', x, y + 0.26, 0.55, 'LEAVES', 0.13, C.brown, 'Bagel Fat One');
      }
    });

    // ---------- The leaf blower man ----------
    // From 8 to 5 he blows the same leaves from one end of the lot to the
    // other and back. Whenever the bear's out he stops, hands up, and backs
    // away if it's close; then carries on from where he stopped. (How long
    // the bear has kept him frozen so far, by the quarter second, so his walk
    // stays a pure function of t.)
    const BLOW0 = at(8);
    const blowPath = route([[8, BLOW_Y], [100, BLOW_Y]], { speed: 1, loop: false });
    const FROZE = (() => {
      const out = new Float32Array(LOOP * 4 + 2);
      let acc = 0;
      for (let i = 0; i < out.length; i++) { const s = i / 4; const h = H(s); if (!bearAt(s).away && h >= 8 && h < 17) acc += 0.25; out[i] = acc; }
      return out;
    })();
    const blowerAt = (t) => {
      if (!between(t, 8, 17)) return { x: 8, y: BLOW_Y, gone: true };
      const s = wrap(t), base = blowPath(s - BLOW0 - FROZE[Math.floor(s * 4)]);
      const b = bearAt(t);
      if (b.away) return base;
      const d = Math.hypot(b.x - base.x, b.y - base.y), side = base.x >= b.x ? 1 : -1;
      const x = base.x + side * clamp((10 - d) / 10) * 3;
      return { x, y: base.y, dir: (b.x - b.y) > (x - base.y) ? 'r' : 'l', frozen: true };
    };
    const blowerLook = folk(605, { top: INK.sticky, bottom: C.green, hat: 'cap', hatColor: INK.maple, skin: mix(C.woodLight, C.brown, 0.35), dress: false, style: 'short' });
    R.mover(blowerAt, (ctx, t, p) => {
      if (p.gone) return;
      const sx = p.dir === 'r' ? 1 : -1;
      // The leaves he's pushing: a drift on the ground ahead, and the ones in the air.
      if (Q.detail) {
        for (let i = 0; i < 8; i++) {
          const [X, Y] = P(p.x + sx * (p.frozen ? 1.6 : 3.0) + sx * hash(i, 51) * 1.1, p.y + (hash(i, 52) - 0.7) * 1.2, 0.02);
          leaf(ctx, X, Y, 1.5, hash(i, 53) * 6, LEAFS[i % LEAFS.length]);
        }
        if (!p.frozen) for (let i = 0; i < 9; i++) {
          const k = ((t * 0.9) + i / 9) % 1;
          const [X, Y] = P(p.x + sx * (0.8 + k * 2.6), p.y + (hash(i, 54) - 0.7) * 1.3, Math.sin(k * Math.PI) * (0.3 + hash(i, 55) * 0.9));
          leaf(ctx, X, Y, 1.5, t * 7 + i, LEAFS[i % LEAFS.length]);
        }
      }
      person(ctx, p.x, p.y, 0, {
        ...blowerLook, pose: p.frozen ? 'stand' : 'walk', dir: p.dir, back: false, speed: 6,
        arms: p.frozen ? [Math.PI - 0.5, -(Math.PI - 0.5)] : [1.0, 0.5],
        // The engine on his back, and the tube.
        wear: (c, b) => { c.beginPath(); c.roundRect(-0.6, b.top + 0.05, 0.3, 0.6, 0.08); paint(c, INK.maple, { lw: 0.03 }); },
        hold: p.frozen ? null : (c) => { c.beginPath(); c.moveTo(-0.15, -0.05); c.lineTo(0.6, 0.75); c.strokeStyle = C.ink; c.lineWidth = 0.14; c.lineCap = 'round'; c.stroke(); c.strokeStyle = C.grey; c.lineWidth = 0.08; c.stroke(); },
        face: (c, hy, back) => { if (back) return; c.beginPath(); c.arc(-0.05, hy, 0.1, 0, Math.PI * 2); c.fillStyle = C.red; c.fill(); },
      }, t);
      if (p.frozen && Q.detail) label(ctx, p.x, p.y, 2.9, '!', 0.45, C.red);
    }, { bias: 0.1 });

    // ---------- The dumpster pen ----------
    const [px0, py0, px1, py1] = DUMPSTER;
    R.thing(108.5, py0 + 0.1, (ctx) => fence(ctx, px0, py0 - 0.12, 110, py0));
    R.thing(111, py0 + 0.1, (ctx) => fence(ctx, 110, py0 - 0.12, 111.9, py0));
    R.thing(112.5, py0 + 0.1, (ctx) => fence(ctx, 112.1, py0 - 0.12, px1, py0));
    R.thing(px0, (py0 + py1) / 2, (ctx) => fence(ctx, px0 - 0.12, py0, px0, py1));
    R.thing(px1, py1, (ctx) => {
      fence(ctx, px1 - 0.12, py0, px1, py1);
      // LATCH THE LID on its outside.
      face(ctx, [[px1 + 0.01, 4.1, 0.75], [px1 + 0.01, 6.4, 0.75], [px1 + 0.01, 6.4, 1.5], [px1 + 0.01, 4.1, 1.5]], C.white, { lw: 0.03 });
      lettering(ctx, 'y', px1 + 0.02, 5.25, 1.27, 'LATCH THE LID', 0.22, C.ink, 'Bagel Fat One');
      lettering(ctx, 'y', px1 + 0.02, 5.25, 0.95, 'BEARS. RACCOONS. DOUG.', 0.13, C.red);
    });
    R.thing((DUMP.x0 + DUMP.x1) / 2, DUMP.y1, dumpsterBody);
    // Bags and boxes outside it, and the recycling.
    R.thing(112.3, py1 + 0.9, (ctx) => {
      for (const [x, y, s] of [[111.9, py1 + 0.5, 1], [112.6, py1 + 0.8, 0.8]]) { const [X, Y] = P(x, y, 0.3 * s); ctx.beginPath(); ctx.ellipse(X, Y, 0.38 * s, 0.32 * s, 0, 0, Math.PI * 2); paint(ctx, C.black, { lw: 0.03 }); ctx.beginPath(); ctx.arc(X, Y - 0.32 * s, 0.07, 0, Math.PI * 2); paint(ctx, C.black, { lw: 0.02 }); }
    });
    R.thing(107.6, py1 + 0.9, (ctx) => { for (let i = 0; i < 4; i++) box(ctx, 107.1 + i * 0.03, py1 + 0.25 - i * 0.02, i * 0.09, 0.9, 0.9, 0.08, i % 2 ? C.white : tint(C.woodLight, 0.3), { flat: true, lw: 0.02 }); });
    R.thing(105.9, 6.4, (ctx) => { box(ctx, 105.5, 5.6, 0, 0.8, 0.8, 1.1, C.navy, { flat: true, lw: 0.03, top: shade(C.navy, 0.2) }); lettering(ctx, 'x', 105.9, 6.41, 0.6, 'RECYCLE', 0.15, C.white, 'Bagel Fat One'); });
    // The lid: tapped open, or propped by the bear while it's digging.
    const lid = R.poke({ id: 'dumpster', at: [109.6, 5.8, 1.6], r: 0.9, say: 'Something in there is chewing.' });
    R.thing((DUMP.x0 + DUMP.x1) / 2, DUMP.y1 + 0.02, (ctx, t) => {
      const b = bearAt(t), dig = !b.away && b.pose === 'dig';
      const k = lid.k();
      const a = Math.max(0.15 + k * 1.4, dig ? 0.7 + Math.abs(Math.sin(t * 5)) * 0.08 : 0);
      dumpsterLid(ctx, a, t, k > 0.5);
      // The bear rummaging: things fly out over its shoulders.
      if (dig && Q.detail) for (let i = 0; i < 4; i++) {
        const q = ((t * 0.9) + i / 4) % 1, sx = (hash(i, 71) - 0.5) * 2.4;
        const [X, Y] = P(DUMP.x0 + 1.7 + sx * q, DUMP.y1 - 0.4 + q * 0.8, DUMP.h + 0.3 + q * 2.2 - q * q * 2.6);
        ctx.save(); ctx.translate(X, Y); ctx.rotate(t * 6 + i);
        ctx.beginPath(); ctx.rect(-0.1, -0.06, 0.2, 0.12); paint(ctx, [C.white, C.red, INK.sticky, C.woodLight][i], { lw: 0.02 });
        ctx.restore();
      }
    }, { anim: true });
    R.find({ id: 'raccoon', label: 'A raccoon', kind: 'poke', inside: lid, at: [DUMP.x0 + 1.5, DUMP.y1 - 0.2, 1.75], r: 0.8, hint: 'The bear isn\'t the only one who likes the dumpster.' });

    // ---------- A lost car key, on the curb ----------
    R.thing(KEY[0], KEY[1] + 0.1, (ctx) => {
      const [X, Y] = P(...KEY);
      ctx.beginPath(); ctx.arc(X - 0.1, Y, 0.07, 0, Math.PI * 2); ctx.strokeStyle = C.greyLight; ctx.lineWidth = 0.035; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X - 0.04, Y + 0.01); ctx.lineTo(X + 0.18, Y + 0.06); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.07; ctx.stroke(); ctx.strokeStyle = C.greyLight; ctx.lineWidth = 0.04; ctx.stroke();
      ctx.beginPath(); ctx.roundRect(X - 0.26, Y - 0.05, 0.12, 0.09, 0.03); paint(ctx, C.ink, { lw: 0.015 });
      ctx.beginPath(); ctx.arc(X - 0.2, Y - 0.005, 0.02, 0, Math.PI * 2); ctx.fillStyle = C.red; ctx.fill();
    });
    R.thing(KEY[0], KEY[1] + 0.11, (ctx, t) => {
      const k = (t % 5) / 0.5;
      if (k > 1) return;
      const [X, Y] = P(KEY[0] + 0.05, KEY[1], 0.15), r = Math.sin(k * Math.PI) * 0.14;
      ctx.beginPath(); ctx.moveTo(X - r, Y); ctx.lineTo(X + r, Y); ctx.moveTo(X, Y - r); ctx.lineTo(X, Y + r);
      ctx.strokeStyle = C.white; ctx.lineWidth = 0.03; ctx.stroke();
    }, { anim: true, on: () => Q.detail });
    R.find({ id: 'key', label: 'A lost car key', kind: 'hard', at: KEY, r: 0.6,
      riddle: 'Somebody is walking home tonight.', hint: 'Look along the curb by the road, toward Dev\'s end, for something small and shiny.' });

    // ---------- The road ----------
    // A car now and then each way. (None while someone's crossing to the
    // lot: the Courier in the morning, the clients at four.)
    const ROAD_CARS = [C.red, C.navy, C.white, C.teal, C.mustard, C.grey, C.purple];
    const crossing = (tc) => R.walkers.some((w) => [-2, 0, 2].some((d) => { const q = w.at(tc + d); return q && q.y > ROAD[0] - 1 && q.y < D + 2 && Math.abs(q.x - 51) < 6; }));
    [{ y: ROAD[0] + 1.1, dir: 1, period: 34, off: 0, seed: 1 }, { y: ROAD[1] - 1.1, dir: -1, period: 27, off: 11, seed: 2 }].forEach((ln) => {
      const speed = 8, from = ln.dir > 0 ? -10 : W + 10, run = (W + 20) / speed;
      R.mover((t) => {
        const s = t + ln.off, n = Math.floor(s / ln.period), ph = s - n * ln.period;
        if (ph > run) return { x: from, y: ln.y, gone: true };
        if (crossing(t - ph + Math.abs(51 - from) / speed)) return { x: from, y: ln.y, gone: true };
        return { x: from + ln.dir * ph * speed, y: ln.y, n, dir: ln.dir > 0 ? 'r' : 'l' };
      }, (ctx, t, p) => {
        if (p.gone) return;
        const color = ROAD_CARS[Math.floor(hash(p.n, ln.seed) * ROAD_CARS.length)];
        rigid(ctx, `lot-road|${color}|${ln.dir}`, p.x, p.y, 0, (g) => autoX(g, p.x, p.y, 0, color, ln.dir, { riders: [{ v: -0.25, top: ROAD_CARS[(p.n + 3) % ROAD_CARS.length] }] }));
        const nk = nightK(t);
        if (nk > 0.3) glow(ctx, p.x + ln.dir * 2.2, p.y, 0.5, 2, C.butter, nk * 0.8);
      }, { bias: 0.8 });
    });

    // ---------- The bear ----------
    // Its day is on the clock (clock.js). Up on the CEO's roof it sorts in
    // front of the car.
    R.mover((t) => { const p = bearAt(t); return p.pose === 'sit' ? { ...p, ahead: 2.8 } : !p.away && p.pose === 'dig' ? { ...p, y: p.y - 1.2 } : p; }, (ctx, t, p) => {
      if (p.away) return;
      bear(ctx, p.x, p.y, p.z, t, { pose: p.moving ? 'walk' : (p.pose === 'stand' ? 'look' : p.pose), dir: p.dir, run: p.moving });
    }, { bias: 0.2 });

    // ---------- Leaves on the wind ----------
    R.air((ctx, t) => {
      if (!Q.detail) return;
      for (let i = 0; i < 9; i++) {
        const life = 11 + hash(i, 61) * 6, k = ((t + hash(i, 62) * life) % life) / life;
        const x = 4 + hash(i, 63) * 100 + k * 14, y = BD + 2 + hash(i, 64) * 12 + Math.sin(k * 9 + i) * 0.6;
        const [X, Y] = P(x, y, 4.5 * (1 - k) + Math.sin(k * 14 + i) * 0.25);
        leaf(ctx, X, Y, 1.6, t * 3 + i, LEAFS[i % LEAFS.length]);
      }
    });
  },
};
