// The Gates: the concourse, roof off, the airside glass low. Three gates along
// the glass, C12 (Flight 1 to Orlando: ON TIME all day, never boards), C13
// (the band's flight to New York, and Inspector Pidge, waiting for Monday's)
// and C14 (the bride's). The departures board at the back, the food court and
// the bar, rows of seats facing the gates, a charging pole with nine people
// round it.
//
// Running gags: the board's delays grow by the hour and at six they all turn
// CANCELED, except Flight 1. The Marching Ducks rehearse all day with a hole
// where the tuba goes (find the tuba in the bag room and the hole fills). The
// man at the bar lines up another empty every hour since eight. And by night
// the gates are a campsite: everyone asleep across the seats, a tent at C14,
// the band asleep on their cases, the charging pole a campfire.
//
// Built in world units (plan.js AREAS: x 52 to 104, y 12 to 30). The area is
// drawn in 16-unit pieces (zone.js, chunks), with seams at x 64, 80 and 96 and
// y 16: long things are split at them and people stand clear of them.
import {
  C, Q, P, box, rect, disc, cylinder, face, paint, person, folk, shade, tint, mix, alpha,
  label, speech, note, goose as gooseArt,
} from '../../../engine/art.js';
import { route, pulse, particles } from '../../../engine/actors.js';
import { ZK, SLAB } from '../../../engine/iso.js';
import { INK, SIGN, BRAND, LIT, BAGS, PINK, TONE } from '../style.js';
import { look, stay, bag, roller, nightGlow } from '../kit.js';
import { LAND, AIR, SEC, W, GATES } from '../plan.js';
import { hour } from '../clock.js';

const TAU = Math.PI * 2;

// ---------- The clock, for this concourse ----------
// The hour, running on past midnight (4 to 28) so the night is one stretch.
const hrs = (t) => { const h = hour(t); return h < 4 ? h + 24 : h; };
// The seats are busy by day; after the ground stop, by half past seven,
// everyone's asleep across them till the loop comes back round to 4am.
const DAYS = (t) => hrs(t) < 19.5;
const CAMP = (t) => !DAYS(t);

// The board's line for the hour: everything later and later, then canceled
// at six, except Flight 1. lag: how far behind this flight already is.
function delay(t, lag = 0) {
  const h = hrs(t);
  if (h >= 18) return 'CANCELED';
  const d = Math.floor(h - 6) + lag;
  return d < 1 ? 'ON TIME' : `DELAYED ${d}H`;
}
// Flight 1: on time, all day. After it finally goes (just after midnight)
// the board admits it.
const flightOne = (t) => (hrs(t) >= 24.06 ? 'DEPARTED' : 'ON TIME');

// ---------- Inks ----------
const CARPET = TONE.terminal;
const WEAVE = shade(CARPET, 0.13);
const WALK = tint(CARPET, 0.18);
const TERRAZZO = tint(INK.concrete, 0.45);
const WALL = tint(INK.snow, 0.15);
const FRAME = shade(C.grey, 0.25);
const GLASS = alpha(tint(C.sky, 0.25), 0.4);
const SEAT = mix(C.navy, C.grey, 0.18);
const DESK = tint(C.navy, 0.08);
const BRASS = INK.signal;
const COAT = mix(C.wood, C.greyLight, 0.45); // Pidge's trench coat
const OK = tint(C.leaf, 0.2); // ON TIME, on the board
const BAD = C.coral; // CANCELED

// ---------- Small helpers ----------
// The seams between the area's pieces, along x.
const SEAMS = [64, 80, 96];
// [a, b] in pieces at most step long, cut at the seams, so each sorts on its
// own and none straddles a seam.
function spans(a, b, step = 3) {
  const cuts = [a, ...SEAMS.filter((s) => s > a + 1e-6 && s < b - 1e-6), b];
  const out = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const p = cuts[i], q = cuts[i + 1], n = Math.max(1, Math.ceil((q - p) / step - 1e-6));
    for (let k = 0; k < n; k++) out.push([p + ((q - p) * k) / n, p + ((q - p) * (k + 1)) / n]);
  }
  return out;
}
// Words on an upright plane: along 'x' (the plane y = y, read from the front)
// or 'y' (the plane x = x, read from the right). o: { align, weight, font }
function words(ctx, along, x, y, z, text, size, color, o = {}) {
  if (!Q.detail) return;
  ctx.save();
  ctx.transform(1, along === 'x' ? 0.5 : -0.5, 0, ZK, x - y, (x + y) / 2 - z * ZK);
  const k = 40;
  ctx.scale(1 / k, 1 / k);
  const font = o.font || 'Rethink Sans';
  ctx.font = `${o.weight || (font === 'Rethink Sans' ? 700 : 400)} ${size * k}px "${font}", system-ui, sans-serif`;
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
// A flat panel on the plane y = y (facing the front), x0..x1, z0..z1.
const panel = (ctx, x0, x1, y, z0, z1, fill, o) => face(ctx, [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], fill, o);
// A line in 3D.
function line3(ctx, a, b, color = C.ink, lw = 0.05) {
  const [ax, ay] = P(...a), [bx, by] = P(...b);
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();
}
// Someone lying along a row (head toward -x, feet at x, y) on a seat or the
// floor at height z: the engine's 'lie', turned to run with the row.
function lieAlong(ctx, x, y, z, lk, t = 0, o = {}) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y); ctx.rotate(Math.atan2(0.5, 1) * (o.flip ? -1 : 1)); ctx.translate(-X, -Y);
  person(ctx, x, y, z, { ...lk, pose: o.pose || 'lie', dir: o.flip ? 'l' : 'r', ...(o.arms ? { arms: o.arms } : {}) }, t);
  ctx.restore();
}
// A coat (or a blanket) over whoever's lying down: over the legs and hips,
// as a person's wear.
const coatOver = (color) => (ctx, b) => {
  ctx.beginPath();
  ctx.roundRect(-0.36, b.hipY - 0.45, 0.72, 1.3, 0.16);
  paint(ctx, color, { lw: 0.04, dots: Q.detail ? shade(color, 0.45) : null, density: 0.15 });
};
// Eyes shut (a face callback): two short strokes over the open eyes.
function shut(ctx, hy, back) {
  if (back || !Q.detail) return;
  ctx.fillStyle = SKIN_SHUT;
  ctx.beginPath(); ctx.arc(0.1, hy + 0.02, 0.05, 0, TAU); ctx.arc(0.24, hy + 0.02, 0.05, 0, TAU); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03;
  ctx.beginPath(); ctx.moveTo(0.06, hy + 0.03); ctx.lineTo(0.14, hy + 0.03); ctx.moveTo(0.2, hy + 0.03); ctx.lineTo(0.28, hy + 0.03); ctx.stroke();
}
const SKIN_SHUT = mix(C.blush, C.woodLight, 0.4);

// ---------- Things people hold (a person's hold: drawn at the chest, facing right) ----------
// In the hand at the end of an arm raised a (the person's near arm, arms[0]):
// a hold is drawn from the chest, so it's moved out to the hand.
const inHand = (a, draw) => (ctx, t) => {
  ctx.save(); ctx.translate(-0.13 + Math.sin(a) * 0.72, -0.3 + Math.cos(a) * 0.72);
  draw(ctx, t);
  ctx.restore();
};
function phoneHeld(ctx) {
  ctx.beginPath(); ctx.roundRect(-0.08, -0.26, 0.16, 0.26, 0.03); paint(ctx, C.black, { lw: 0.02 });
  ctx.fillStyle = tint(C.sky, 0.4); ctx.fillRect(-0.05, -0.23, 0.1, 0.18);
}
function bookHeld(ctx) {
  ctx.beginPath(); ctx.moveTo(-0.12, -0.24); ctx.lineTo(0.12, -0.3); ctx.lineTo(0.12, 0.02); ctx.lineTo(-0.12, 0.08); ctx.closePath();
  paint(ctx, C.teal, { lw: 0.025 });
  ctx.fillStyle = C.white; ctx.fillRect(-0.09, -0.21, 0.04, 0.26);
}
function cupHeld(ctx) {
  // The donut stand's iced coffee, pink and orange, in November.
  ctx.beginPath(); ctx.moveTo(-0.1, -0.3); ctx.lineTo(-0.07, 0.04); ctx.lineTo(0.07, 0.04); ctx.lineTo(0.1, -0.3); ctx.closePath();
  paint(ctx, mix(C.brown, C.white, 0.45), { lw: 0.025 });
  ctx.fillStyle = PINK; ctx.fillRect(-0.09, -0.17, 0.18, 0.07);
  ctx.fillStyle = INK.safety; ctx.fillRect(-0.1, -0.33, 0.2, 0.05);
  ctx.strokeStyle = INK.safety; ctx.lineWidth = 0.03; ctx.beginPath(); ctx.moveTo(0.02, -0.33); ctx.lineTo(0.07, -0.49); ctx.stroke();
}
function laptopHeld(ctx) {
  ctx.beginPath(); ctx.moveTo(-0.2, 0.22); ctx.lineTo(0.3, 0.22); ctx.lineTo(0.26, 0.18); ctx.lineTo(-0.2, 0.18); ctx.closePath();
  paint(ctx, C.grey, { lw: 0.02 });
  ctx.beginPath(); ctx.moveTo(0.26, 0.18); ctx.lineTo(0.38, -0.12); ctx.lineTo(0.34, -0.14); ctx.lineTo(0.22, 0.18); ctx.closePath();
  paint(ctx, shade(C.grey, 0.3), { lw: 0.02 });
}
function knitHeld(ctx) {
  // Two needles and a scarf long enough to reach the floor.
  ctx.strokeStyle = C.greyLight; ctx.lineWidth = 0.025;
  ctx.beginPath(); ctx.moveTo(-0.1, -0.3); ctx.lineTo(0.2, -0.05); ctx.moveTo(0.22, -0.32); ctx.lineTo(-0.06, -0.04); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0.0, -0.12); ctx.lineTo(0.16, -0.12); ctx.lineTo(0.2, 0.75); ctx.lineTo(0.02, 0.75); ctx.closePath();
  paint(ctx, C.coral, { lw: 0.025, dots: Q.detail ? C.mustard : null, density: 0.35 });
}
function donutHeld(ctx) {
  ctx.beginPath(); ctx.arc(0, -0.06, 0.13, 0, TAU); ctx.arc(0, -0.06, 0.045, 0, TAU, true);
  paint(ctx, PINK, { lw: 0.025 });
}
// A neck pillow (not goose shaped: that's at check-in).
function neckPillow(ctx, b) {
  ctx.beginPath(); ctx.ellipse(0.02, b.top + 0.02, 0.32, 0.12, 0, 0, TAU);
  paint(ctx, C.purple, { lw: 0.03 });
}
// A matching family sweatshirt: a turkey in a circle.
function gobble(ctx, b) {
  if (b.back || !Q.detail) return;
  ctx.beginPath(); ctx.arc(0.04, b.top + 0.36, 0.13, 0, TAU); paint(ctx, C.white, { lw: 0.02 });
  ctx.beginPath(); ctx.arc(0.04, b.top + 0.38, 0.06, 0, TAU); ctx.fillStyle = C.brown; ctx.fill();
  ctx.fillStyle = C.coral; ctx.fillRect(-0.04, b.top + 0.27, 0.16, 0.04);
}
// Shorts and a sun hat, for Orlando, in a snowstorm.
const shorts = (ctx, b) => { if (!Q.detail) return; ctx.fillStyle = C.tealLight; ctx.fillRect(-0.28, b.hipY - 0.06, 0.56, 0.22); };

// ---------- The Marching Ducks ----------
// Cranberry jackets with white cross-belts, white trousers, tall hats with
// plumes. Each player carries their instrument as a face callback (drawn
// over the head, in the player's own units, facing right).
function shako(ctx, hy) {
  ctx.beginPath(); ctx.rect(-0.21, hy - 0.8, 0.46, 0.56); paint(ctx, INK.cranberry, { lw: 0.035 });
  ctx.fillStyle = C.white; ctx.fillRect(-0.21, hy - 0.36, 0.46, 0.07);
  ctx.beginPath(); ctx.moveTo(0.1, hy - 0.25); ctx.lineTo(0.42, hy - 0.2); ctx.lineTo(0.25, hy - 0.29); ctx.closePath(); paint(ctx, C.black, { lw: 0.02 });
  ctx.beginPath(); ctx.arc(0.06, hy - 0.58, 0.07, 0, TAU); ctx.fillStyle = BRASS; ctx.fill();
  ctx.beginPath(); ctx.ellipse(-0.02, hy - 0.96, 0.07, 0.18, 0.15, 0, TAU); paint(ctx, C.white, { lw: 0.03 });
}
function uniform(ctx, b) {
  if (!Q.detail) return;
  ctx.strokeStyle = C.white; ctx.lineWidth = 0.06;
  ctx.beginPath(); ctx.moveTo(-0.2, b.top + 0.12); ctx.lineTo(0.2, b.hipY - 0.06); ctx.moveTo(0.2, b.top + 0.12); ctx.lineTo(-0.2, b.hipY - 0.06); ctx.stroke();
  ctx.fillStyle = BRASS; ctx.beginPath(); ctx.arc(0, b.top + 0.42, 0.05, 0, TAU); ctx.fill();
}
const HORN = shade(BRASS, 0.08);
const brassLine = (ctx, pts, lw = 0.07) => {
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = C.ink; ctx.lineWidth = lw + 0.05; ctx.stroke();
  ctx.strokeStyle = HORN; ctx.lineWidth = lw; ctx.stroke();
};
const bell = (ctx, x, y, r) => {
  ctx.beginPath(); ctx.moveTo(x - r * 1.4, y - 0.04); ctx.lineTo(x, y - r); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 1.4, y + 0.04); ctx.closePath();
  paint(ctx, HORN, { lw: 0.03 });
  ctx.beginPath(); ctx.ellipse(x, y, r * 0.3, r, 0, 0, TAU); paint(ctx, tint(BRASS, 0.3), { lw: 0.03 });
};
const INSTRUMENT = {
  trumpet: (ctx, hy, t) => { const b = Math.sin(t * 6) * 0.03; brassLine(ctx, [[0.28, hy + 0.12], [0.8, hy + 0.06 + b]]); bell(ctx, 0.92, hy + 0.06 + b, 0.11); },
  mellophone: (ctx, hy, t) => { const b = Math.sin(t * 5 + 1) * 0.03; brassLine(ctx, [[0.28, hy + 0.12], [0.7, hy + 0.1 + b]], 0.08); bell(ctx, 0.88, hy + 0.1 + b, 0.17); },
  trombone: (ctx, hy, t) => {
    const s = 0.22 + Math.sin(t * 3.2) * 0.2;
    brassLine(ctx, [[0.28, hy + 0.12], [0.62, hy + 0.12]], 0.05);
    brassLine(ctx, [[0.5, hy + 0.12], [0.9 + s, hy + 0.12], [0.9 + s, hy + 0.24], [0.5, hy + 0.24]], 0.04);
    brassLine(ctx, [[0.42, hy + 0.04], [0.0, hy + 0.0]], 0.05);
    bell(ctx, 0.66, hy + 0.0, 0.13);
  },
  clarinet: (ctx, hy, t) => {
    const b = Math.sin(t * 4) * 0.02;
    ctx.beginPath(); ctx.moveTo(0.26, hy + 0.12); ctx.lineTo(0.52, hy + 0.78 + b);
    ctx.lineCap = 'round'; ctx.strokeStyle = C.black; ctx.lineWidth = 0.07; ctx.stroke();
    ctx.beginPath(); ctx.arc(0.53, hy + 0.82 + b, 0.06, 0, TAU); ctx.fillStyle = C.black; ctx.fill();
  },
};
// The tuba, round the player (wear) and its bell up over his head (face).
// ghost: only its outline, dotted, where it would be: the hole in the band.
const dotted = (ctx) => {
  ctx.setLineDash([0.09, 0.07]); ctx.lineWidth = 0.05; ctx.strokeStyle = alpha(C.ink, 0.85); ctx.stroke(); ctx.setLineDash([]);
};
function sousaphoneCoil(ctx, b, ghost = false) {
  ctx.beginPath(); ctx.ellipse(0.02, b.hipY - 0.35, 0.46, 0.3, 0.25, 0, TAU);
  if (ghost) { if (Q.detail) dotted(ctx); return; }
  ctx.lineWidth = 0.17; ctx.strokeStyle = C.ink; ctx.stroke();
  ctx.lineWidth = 0.11; ctx.strokeStyle = HORN; ctx.stroke();
}
function sousaphoneBell(ctx, hy, t, ghost = false) {
  const p = ghost ? 1 : 1 + Math.max(0, Math.sin(t * 3)) * 0.06;
  if (ghost) {
    if (!Q.detail) return;
    ctx.beginPath(); ctx.moveTo(-0.3, hy + 0.7); ctx.lineTo(-0.36, hy + 0.1); ctx.lineTo(-0.12, hy - 0.42); dotted(ctx);
  } else brassLine(ctx, [[-0.3, hy + 0.7], [-0.36, hy + 0.1], [-0.12, hy - 0.42]], 0.12);
  ctx.save(); ctx.translate(0.12, hy - 0.62); ctx.scale(p, p);
  ctx.beginPath(); ctx.moveTo(-0.3, 0.26); ctx.lineTo(0.05, -0.42); ctx.lineTo(0.42, 0.18); ctx.closePath();
  if (ghost) dotted(ctx); else paint(ctx, HORN, { lw: 0.035 });
  ctx.beginPath(); ctx.ellipse(0.24, -0.12, 0.2, 0.36, -0.55, 0, TAU);
  if (ghost) { dotted(ctx); ctx.restore(); return; }
  paint(ctx, tint(BRASS, 0.35), { lw: 0.035 });
  ctx.beginPath(); ctx.ellipse(0.25, -0.12, 0.11, 0.22, -0.55, 0, TAU); ctx.fillStyle = shade(BRASS, 0.35); ctx.fill();
  ctx.restore();
}
// Puffed cheeks, the tuba player's, playing the air.
function cheeks(ctx, hy, back) {
  if (back) return;
  ctx.beginPath(); ctx.arc(0.27, hy + 0.12, 0.09, 0, TAU); paint(ctx, C.blush, { lw: 0.02 });
}
// A snare at the waist (hold), sticks going (the 'drum' pose's arms).
function snareHeld(ctx) {
  ctx.save(); ctx.translate(0.05, 0.25);
  ctx.beginPath(); ctx.ellipse(0, 0, 0.32, 0.1, 0, 0, TAU); paint(ctx, C.white, { lw: 0.03 });
  ctx.beginPath(); ctx.rect(-0.32, 0, 0.64, 0.2); paint(ctx, INK.cranberry, { lw: 0.03 });
  ctx.beginPath(); ctx.ellipse(0, 0, 0.32, 0.1, 0, 0, TAU); paint(ctx, C.white, { lw: 0.03 });
  ctx.restore();
}
// The bass drum, its head toward you, with a duck on it.
function bassHeld(ctx) {
  ctx.beginPath(); ctx.arc(-0.05, 0.1, 0.46, 0, TAU); paint(ctx, INK.cranberry, { lw: 0.04 });
  ctx.beginPath(); ctx.arc(-0.05, 0.1, 0.38, 0, TAU); paint(ctx, C.white, { lw: 0.03 });
  if (!Q.detail) return;
  ctx.beginPath(); ctx.ellipse(-0.06, 0.16, 0.16, 0.1, 0, 0, TAU); ctx.arc(0.07, 0.0, 0.07, 0, TAU); ctx.fillStyle = BRASS; ctx.fill();
  ctx.beginPath(); ctx.moveTo(0.13, -0.01); ctx.lineTo(0.22, 0.02); ctx.lineTo(0.13, 0.04); ctx.fillStyle = INK.safety; ctx.fill();
}
// Cymbals, crashing together and apart.
function cymbalsHeld(ctx, t) {
  const k = Math.abs(Math.sin(t * 2.4)) * 0.22;
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(0.1 + s * (0.05 + k), -0.2, 0.06, 0.3, 0, 0, TAU); paint(ctx, HORN, { lw: 0.03 });
  }
}
// The color guard's flag, up on its pole, flying back over her shoulder.
function flagHeld(ctx, t) {
  ctx.beginPath(); ctx.moveTo(0.05, 0.5); ctx.lineTo(-0.08, -2.5); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.08; ctx.stroke();
  ctx.strokeStyle = C.white; ctx.lineWidth = 0.04; ctx.stroke();
  const w = Math.sin(t * 4) * 0.1;
  ctx.beginPath(); ctx.moveTo(-0.08, -2.5);
  ctx.quadraticCurveTo(-0.6, -2.62 + w, -1.2, -2.45 - w); ctx.lineTo(-1.2, -1.75 - w);
  ctx.quadraticCurveTo(-0.6, -1.9 + w, -0.07, -1.78); ctx.closePath();
  paint(ctx, INK.cranberry, { lw: 0.035 });
  // A duck on it.
  ctx.beginPath(); ctx.ellipse(-0.62, -2.1, 0.17, 0.11, 0, 0, TAU); ctx.arc(-0.45, -2.27, 0.08, 0, TAU); ctx.fillStyle = BRASS; ctx.fill();
}
// The drum major's mace, twirled.
function maceHeld(ctx, t) {
  ctx.save(); ctx.translate(0, -0.2); ctx.rotate(Math.sin(t * 2) * 0.5 - 0.4);
  ctx.beginPath(); ctx.moveTo(0, 0.5); ctx.lineTo(0, -1.0); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.08; ctx.stroke();
  ctx.strokeStyle = C.white; ctx.lineWidth = 0.04; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -1.05, 0.11, 0, TAU); paint(ctx, BRASS, { lw: 0.03 });
  ctx.restore();
}

// ---------- The furniture ----------
// A row of airport seats along x, facing the gates (+y), backs at y: n seats
// from x0, each CW wide, on a beam with T-legs.
const CW = 0.9, ROW_D = 0.9;
function seats(ctx, x0, n, y) {
  const x1 = x0 + n * CW;
  // The beam and its legs.
  box(ctx, x0 + 0.15, y + 0.42, 0.34, x1 - x0 - 0.3, 0.1, 0.1, FRAME, { flat: true, lw: 0.025 });
  for (const lx of [x0 + 0.3, x1 - 0.3]) {
    box(ctx, lx - 0.05, y + 0.15, 0, 0.1, 0.62, 0.05, FRAME, { flat: true, lw: 0.02 });
    box(ctx, lx - 0.04, y + 0.43, 0.05, 0.08, 0.08, 0.3, FRAME, { flat: true, lw: 0.02 });
  }
  for (let i = 0; i < n; i++) {
    const a = x0 + i * CW + 0.05, w = CW - 0.1;
    box(ctx, a, y, 0.66, w, 0.14, 0.9, SEAT, { lw: 0.03, top: tint(SEAT, 0.12), dens: 0.15 });
    box(ctx, a, y + 0.12, 0.58, w, 0.74, 0.14, SEAT, { lw: 0.03, top: tint(SEAT, 0.22), flat: true });
  }
  for (let i = 0; i <= n; i++) {
    const ax = x0 + i * CW;
    box(ctx, ax - 0.03, y + 0.62, 0.6, 0.06, 0.06, 0.36, FRAME, { flat: true, stroke: false });
    box(ctx, ax - 0.05, y + 0.14, 0.94, 0.1, 0.66, 0.06, FRAME, { flat: true, lw: 0.02 });
  }
}

// A low wall along x (the landside wall), in pieces. paint: [x, z, text,
// size, color, font] lettered along its face; each piece letters its own
// part of it (clipped to its face), so the words run across the joins.
function lowWall(R, x0, x1, y, d, h, color, lettered = []) {
  for (const [a, b] of spans(x0, x1, 3)) {
    R.thing((a + b) / 2, y + d, (ctx) => {
      box(ctx, a, y, 0, b - a, d, h, color, { lw: 0.035, top: tint(color, 0.4), flat: true });
      panel(ctx, a, b, y + d + 0.005, 0.5, 0.62, INK.cranberry, { stroke: false });
      if (!Q.detail) return;
      ctx.save();
      const pts = [[a, y + d, 0], [b, y + d, 0], [b, y + d, h], [a, y + d, h]].map((q) => P(...q));
      ctx.beginPath(); pts.forEach(([X, Y], i) => (i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y))); ctx.closePath(); ctx.clip();
      for (const [x, z, text, size, ink, font] of lettered) words(ctx, 'x', x, y + d + 0.01, z, text, size, ink, { font });
      ctx.restore();
    });
  }
}
// The airside glass: a low sill, a band of glass, a rail, mullions.
function glassWall(R, x0, x1) {
  for (const [a, b] of spans(x0, x1, 2)) {
    R.thing((a + b) / 2, AIR, (ctx) => {
      box(ctx, a, AIR - 0.4, 0, b - a, 0.4, 0.3, tint(INK.concrete, 0.2), { lw: 0.03, flat: true });
      // The glass, seen through, with a glint.
      panel(ctx, a, b, AIR - 0.05, 0.3, 1.1, GLASS, { stroke: false });
      if (Q.detail) {
        const m = a + (b - a) * 0.3;
        face(ctx, [[m, AIR - 0.04, 0.4], [m + 0.25, AIR - 0.04, 0.4], [m + 0.55, AIR - 0.04, 1.0], [m + 0.3, AIR - 0.04, 1.0]], alpha(C.white, 0.35), { stroke: false });
      }
      box(ctx, a, AIR - 0.3, 1.08, b - a, 0.25, 0.06, FRAME, { flat: true, lw: 0.025 });
      box(ctx, a, AIR - 0.3, 0.3, 0.06, 0.25, 0.8, FRAME, { flat: true, lw: 0.02 });
      box(ctx, b - 0.06, AIR - 0.3, 0.3, 0.06, 0.25, 0.8, FRAME, { flat: true, lw: 0.02 });
    });
  }
}

// A stool at the bar.
function stool(ctx, x, y) {
  box(ctx, x - 0.04, y - 0.04, 0, 0.08, 0.08, 0.78, C.ink, { flat: true, stroke: false });
  disc(ctx, x, y, 0.02, 0.25, FRAME, { lw: 0.02 });
  cylinder(ctx, x, y, 0.72, 0.28, 0.1, INK.cranberry, { flat: true });
}
// A pint glass on the bar: full (amber) or empty (a little foam left).
function pint(ctx, x, y, z, full) {
  box(ctx, x - 0.08, y - 0.08, z, 0.16, 0.16, 0.34, full ? C.mustard : tint(C.sky, 0.55), { flat: true, lw: 0.018, top: full ? C.white : tint(C.sky, 0.75) });
  if (full) box(ctx, x - 0.08, y - 0.08, z + 0.27, 0.16, 0.16, 0.07, C.white, { flat: true, lw: 0.015 });
  else if (Q.detail) panel(ctx, x - 0.08, x + 0.08, y + 0.081, z + 0.24, z + 0.3, C.white, { stroke: false });
}
// A bottle on a shelf.
function bottle(ctx, x, y, z, color, h = 0.5) {
  box(ctx, x - 0.08, y - 0.08, z, 0.16, 0.16, h, color, { flat: true, lw: 0.015 });
  box(ctx, x - 0.03, y - 0.03, z + h, 0.06, 0.06, 0.16, color, { flat: true, lw: 0.015 });
}
// The decoy: a frosted bottle with a white goose on it, on the top shelf.
function gooseBottle(ctx, x, y, z) {
  const fr = alpha(tint(C.sky, 0.55), 0.92);
  box(ctx, x - 0.17, y - 0.12, z, 0.34, 0.24, 0.72, fr, { lw: 0.025, top: tint(C.sky, 0.6) });
  box(ctx, x - 0.06, y - 0.05, z + 0.72, 0.12, 0.1, 0.2, fr, { lw: 0.02 });
  box(ctx, x - 0.07, y - 0.06, z + 0.9, 0.14, 0.12, 0.06, C.navy, { flat: true, lw: 0.015 });
  gooseArt(ctx, x + 0.02, y + 0.14, z + 0.14, 0, { pose: 'stand', dir: 'r', scale: 0.48 });
  words(ctx, 'x', x, y + 0.13, z + 0.08, 'VODKA', 0.07, C.navy);
}
// A bag-tag ticket, as a reunited bag's trace (unused here) or a lost one.
// A seat-saving coat thrown over a seat.
function coatOnSeat(ctx, x, y, color) {
  face(ctx, [[x - 0.35, y + 0.15, 0.74], [x + 0.35, y + 0.15, 0.74], [x + 0.38, y + 0.8, 0.72], [x - 0.3, y + 0.86, 0.7]], color, { lw: 0.03 });
  face(ctx, [[x - 0.35, y + 0.08, 0.76], [x + 0.35, y + 0.08, 0.76], [x + 0.32, y + 0.1, 1.5], [x - 0.32, y + 0.1, 1.5]], tint(color, 0.08), { lw: 0.03 });
}
// An instrument case, lying (on a seat, or a pillow on the floor).
function instCase(ctx, x, y, z, w = 0.8, d = 0.4, h = 0.26) {
  box(ctx, x - w / 2, y - d / 2, z, w, d, h, C.black, { lw: 0.025, top: shade(C.grey, 0.5), flat: true });
  if (Q.detail) box(ctx, x - 0.1, y + d / 2 - 0.02, z + 0.08, 0.2, 0.04, 0.06, BRASS, { flat: true, stroke: false });
}

// ---------- The cast ----------
// A seated traveler: look, plus what they're doing.
const DOING = {
  phone: { arms: [2.0, 0.9], hold: inHand(2.0, phoneHeld) },
  read: { arms: [1.5, 1.3], hold: inHand(1.5, bookHeld) },
  coffee: { arms: [2.1, 0.4], hold: inHand(2.1, cupHeld) },
  laptop: { arms: [0.9, 0.8], hold: laptopHeld },
  knit: { arms: [1.0, 0.9], hold: knitHeld },
  donut: { arms: [2.2, 0.4], hold: inHand(2.2, donutHeld) },
  doze: { arms: [0.3, 0.2], face: shut },
  pillow: { arms: [0.3, 0.2], face: shut, wear: neckPillow },
  arms: { arms: [0.35, 0.3] },
};
function sitter(seed, doing = 'phone', extra = {}) {
  return look(seed, 'traveler', { ...DOING[doing], ...extra });
}

export default {
  id: 'gates',
  name: 'The Gates',
  blurb: 'Every flight is delayed except Flight 1 to Orlando, which is on time and never boards. A marching band is short one tuba.',
  describe: 'A long carpeted concourse with its roof off: rows of seats facing three gates along the windows, a departures board, donuts, a lobster stand and a bar, and a crowd round one charging pole. A high school band rehearses at one gate. After the storm, everyone camps out across the seats.',

  build(R) {
    // ---------- The floor ----------
    R.floor((ctx) => {
      // The slab's cut sides, where the plate ends (the far end) or the
      // apron's lower ground starts (the glass).
      face(ctx, [[W, LAND, 0], [W, AIR, 0], [W, AIR, -SLAB], [W, LAND, -SLAB]], shade(CARPET, 0.25));
      face(ctx, [[SEC, AIR, 0], [W, AIR, 0], [W, AIR, -SLAB], [SEC, AIR, -SLAB]], shade(CARPET, 0.4), { dots: shade(CARPET, 0.7), density: 0.25 });
      rect(ctx, SEC, LAND, W - SEC, AIR - LAND, 0, CARPET, { stroke: false });
      // The walkway along the gates, a shade lighter, edged in signal yellow.
      rect(ctx, SEC, 22.8, W - SEC, 3.6, 0.003, WALK, { stroke: false });
      rect(ctx, SEC, 26.35, W - SEC, 0.1, 0.004, INK.signal, { stroke: false });
      // The carpet's pattern: little diamonds in rows, the airport's own.
      if (Q.detail) {
        ctx.beginPath();
        let j = 0;
        for (let y = LAND + 0.7; y < AIR; y += 1.4, j++) {
          for (let x = SEC + 0.7 + (j % 2) * 0.7; x < W - 0.2; x += 1.4) {
            const d = 0.2;
            const a = P(x - d, y), b = P(x, y - d), c = P(x + d, y), e = P(x, y + d);
            ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(e[0], e[1]); ctx.closePath();
          }
        }
        ctx.fillStyle = WEAVE;
        ctx.fill();
      }
      // The food court's terrazzo, and the bar's boards.
      rect(ctx, SEC, LAND, 11.6, 4.9, 0.005, TERRAZZO, { stroke: false, dots: shade(TERRAZZO, 0.3), density: 0.12 });
      rect(ctx, SEC, LAND + 4.9, 11.6, 0.12, 0.006, shade(TERRAZZO, 0.3), { stroke: false });
      rect(ctx, 86.8, LAND, 14.6, 4.6, 0.005, C.woodLight, { stroke: false });
      if (Q.detail) {
        ctx.beginPath();
        for (let y = LAND + 0.6; y < LAND + 4.6; y += 0.6) { const a = P(86.8, y, 0.006), b = P(101.4, y, 0.006); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
        ctx.strokeStyle = shade(C.woodLight, 0.25); ctx.lineWidth = 0.025; ctx.stroke();
        ctx.beginPath();
        for (let x = SEC + 1.2; x < SEC + 11.6; x += 1.2) { const a = P(x, LAND, 0.006), b = P(x, LAND + 4.9, 0.006); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
        for (let y = LAND + 1.2; y < LAND + 4.9; y += 1.2) { const a = P(SEC, y, 0.006), b = P(SEC + 11.6, y, 0.006); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
        ctx.strokeStyle = shade(TERRAZZO, 0.18); ctx.lineWidth = 0.025; ctx.stroke();
      }
      rect(ctx, 86.8, LAND + 4.6, 14.6, 0.1, 0.006, shade(C.wood, 0.3), { stroke: false });
    });
    // Painted on the walkway at each gate: its number, big, the way you'd
    // read it walking past.
    R.rug((ctx) => {
      for (const [g, x] of Object.entries(GATES)) {
        if (!Q.detail) continue;
        ctx.save();
        ctx.transform(1, 0.5, -1, 0.5, x + 1.6 - 25.4, (x + 1.6 + 25.4) / 2);
        ctx.scale(1 / 40, 1 / 40);
        ctx.font = '40px "Bagel Fat One", system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = alpha(C.white, 0.42);
        ctx.fillText(g, 0, 0);
        ctx.restore();
      }
    });

    // ---------- The walls ----------
    // Landside, low, with the airport's welcome painted on it.
    lowWall(R, SEC, W, LAND, 0.4, 1.1, WALL, [
      [79.5, 0.86, 'WELCOME TO BOSTON', 0.34, INK.cranberry, 'Bagel Fat One'],
      [79.5, 0.3, 'NOW PLEASE LEAVE', 0.2, C.navy, 'Rethink Sans'],
    ]);
    // Airside, the glass, with the jet bridges' doors at the gates.
    for (const [x0, x1] of [[SEC, 60.6], [63.4, 76.6], [79.4, 92.6], [95.4, W]]) glassWall(R, x0, x1);
    // The doors' jambs, and the gate's number on a plate.
    for (const [g, x] of Object.entries(GATES)) {
      for (const [jx, side] of [[x - 1.4, -1], [x + 1.4, 1]]) {
        R.thing(jx, AIR, (ctx) => {
          box(ctx, jx - 0.12, AIR - 0.5, 0, 0.24, 0.5, 1.6, FRAME, { lw: 0.03, flat: true });
          if (side < 0) {
            panel(ctx, jx - 0.45, jx + 0.15, AIR + 0.01, 1.05, 1.5, SIGN.board, { lw: 0.025 });
            words(ctx, 'x', jx - 0.15, AIR + 0.02, 1.27, g, 0.28, SIGN.ink);
          }
        });
      }
    }

    // ---------- The departures board ----------
    // Black, with yellow letters, legs under it. Flight 1 on time at the top;
    // under it, everything else.
    const BX0 = 66, BX1 = 74, BY = 12.5, BF = 13.1, BZ0 = 1.3, BZ1 = 4.3;
    const FLIGHTS = [
      { code: 'SP 1', to: 'ORLANDO', gate: 'C12', one: true },
      { code: 'JB 404', to: 'NEW YORK', gate: 'C13', lag: 0 },
      { code: 'NE 1125', to: 'PHILADELPHIA', gate: 'C14', lag: 1 },
      { code: 'SP 2', to: 'ORLANDO', gate: 'C12', lag: 3 },
      { code: 'JB 88', to: 'BUFFALO', gate: 'C15', lag: 2 },
      { code: 'NE 7', to: 'NANTUCKET', gate: 'C16', lag: 1 },
    ];
    const rowZ = (i) => BZ1 - 0.78 - i * 0.42;
    R.thing((BX0 + BX1) / 2, BF, (ctx) => {
      for (const lx of [BX0 + 0.7, BX1 - 0.9]) box(ctx, lx, BY + 0.15, 0, 0.2, 0.3, BZ0, C.ink, { flat: true, lw: 0.025 });
      box(ctx, BX0, BY, BZ0, BX1 - BX0, BF - BY, BZ1 - BZ0, SIGN.board, { lw: 0.05, flat: true, top: shade(C.grey, 0.4) });
      panel(ctx, BX0 + 0.12, BX1 - 0.12, BF + 0.005, BZ1 - 0.5, BZ1 - 0.12, INK.signal, { stroke: false });
      words(ctx, 'x', BX0 + 2.0, BF + 0.01, BZ1 - 0.31, 'DEPARTURES', 0.3, SIGN.board, { font: 'Bagel Fat One' });
      words(ctx, 'x', BX1 - 1.5, BF + 0.01, BZ1 - 0.31, '(EVENTUALLY)', 0.17, SIGN.board);
      panel(ctx, BX0 + 0.12, BX1 - 0.12, BF + 0.004, rowZ(0) - 0.19, rowZ(0) + 0.19, shade(C.grey, 0.62), { stroke: false });
      FLIGHTS.forEach((f, i) => {
        const z = rowZ(i), ink = f.one ? C.white : INK.signal;
        words(ctx, 'x', BX0 + 0.3, BF + 0.01, z, f.code, 0.2, ink, { align: 'left' });
        words(ctx, 'x', BX0 + 1.6, BF + 0.01, z, f.to, 0.2, ink, { align: 'left' });
        words(ctx, 'x', BX0 + 4.0, BF + 0.01, z, f.gate, 0.2, ink, { align: 'left' });
        if (Q.detail) for (let k = 0; k < 18; k++) panel(ctx, BX0 + 4.75 + k * 0.165, BX0 + 4.88 + k * 0.165, BF + 0.004, z - 0.15, z + 0.15, shade(C.grey, 0.75), { stroke: false });
      });
    });
    // The statuses, live: each hour they flip on, and a tap flips one more.
    const board = R.poke({ id: 'board', at: [70, 12.9, 2.6], r: 1.2, hold: 1.4, sound: 'tick', teach: true, say: (t) => (delay(t) === 'CANCELED' ? 'Canceled. All of it.' : 'Delayed. Again.') });
    R.thing((BX0 + BX1) / 2, BF + 0.02, (ctx, t) => {
      if (!Q.detail) return;
      const k = board.k(), flipped = 1 + (board.taps % 5);
      const turning = Math.floor(hrs(t)) !== Math.floor(hrs(t - 0.6));
      FLIGHTS.forEach((f, i) => {
        const z = rowZ(i);
        const text = f.one ? flightOne(t) : delay(t, f.lag + board.taps);
        const color = text === 'ON TIME' || text === 'DEPARTED' ? OK : text === 'CANCELED' ? BAD : INK.signal;
        // (A split flap: squashed as it turns over.)
        let sq = 1;
        if (k > 0.02 && i === flipped) sq = Math.abs(Math.cos(k * Math.PI));
        else if (turning && !f.one) sq = Math.abs(Math.cos(((t * 1.6) % 1) * Math.PI));
        ctx.save();
        const [X, Y] = P(BX0 + 4.75, BF + 0.01, z);
        ctx.translate(X, Y); ctx.scale(1, Math.max(0.08, sq)); ctx.translate(-X, -Y);
        words(ctx, 'x', BX0 + 4.75, BF + 0.012, z, text, 0.2, color, { align: 'left' });
        ctx.restore();
      });
    }, { anim: true });
    nightGlow(R, 70, 13.6, 2.6, 5, LIT, 0.45);

    // ---------- The food court ----------
    // The donut stand (pink and orange, like the one on every corner in
    // Boston), a fridge of Gander Cola, and the $19 lobster roll.
    R.thing(55.1, 12.9, (ctx) => {
      // The back counter: coffee urns and trays of donuts.
      box(ctx, 53.0, 12.4, 0, 4.2, 0.5, 1.2, C.white, { lw: 0.03, top: tint(PINK, 0.4), flat: true });
      panel(ctx, 53.0, 57.2, 12.905, 0.2, 0.45, INK.safety, { stroke: false });
      for (const ux of [53.5, 54.3]) cylinder(ctx, ux, 12.65, 1.2, 0.2, 0.55, FRAME, { top: C.grey, flat: true });
      for (let i = 0; i < 4; i++) {
        const tx = 55.0 + i * 0.52;
        box(ctx, tx, 12.45, 1.2, 0.45, 0.4, 0.05, C.greyLight, { flat: true, lw: 0.015 });
        if (Q.detail) for (const [dx, dy] of [[0.12, 0.12], [0.32, 0.12], [0.12, 0.3], [0.32, 0.3]]) disc(ctx, tx + dx, 12.45 + dy, 1.27, 0.08, [PINK, C.brown, INK.safety, C.white][(i + dx * 10) % 4 | 0], { lw: 0.012 });
      }
      // The sign over it, on two posts.
      for (const px of [53.3, 56.9]) box(ctx, px, 12.5, 1.2, 0.08, 0.08, 1.1, C.ink, { flat: true, stroke: false });
      box(ctx, 53.0, 12.45, 2.25, 4.2, 0.2, 0.95, C.white, { lw: 0.035, flat: true });
      words(ctx, 'x', 55.1, 12.66, 2.86, 'DON', 0.5, PINK, { font: 'Bagel Fat One', align: 'right' });
      words(ctx, 'x', 55.1, 12.66, 2.86, 'UTS', 0.5, INK.safety, { font: 'Bagel Fat One', align: 'left' });
      words(ctx, 'x', 55.1, 12.66, 2.45, 'BOSTON RUNS ON DELAYS', 0.17, C.brown);
    }, { depth: 53.0 + 12.6 });
    // The counter, in three pieces (so the queue in front of it and the
    // man behind it each sort right), each drawing its own share.
    for (const [a, b] of spans(53.0, 57.2, 1.45)) {
      R.thing((a + b) / 2, 14.5, (ctx) => {
        box(ctx, a, 13.7, 0, b - a, 0.8, 1.1, C.white, { lw: 0.035, top: C.greyLight, flat: true });
        panel(ctx, a, b, 14.505, 0.15, 0.35, PINK, { stroke: false });
        panel(ctx, a, b, 14.505, 0.35, 0.55, INK.safety, { stroke: false });
        // The case of donuts on top, glass to the front.
        const c0 = Math.max(a, 53.4), c1 = Math.min(b, 55.8);
        if (c1 > c0) box(ctx, c0, 13.8, 1.1, c1 - c0, 0.55, 0.42, alpha(tint(C.sky, 0.5), 0.5), { lw: 0.025, flat: true });
        if (Q.detail) for (let i = 0; i < 7; i++) {
          const dx = 53.65 + i * 0.32;
          if (dx >= a && dx < b) disc(ctx, dx, 14.12, 1.16, 0.11, [PINK, C.brown, INK.safety, C.white][i % 4], { lw: 0.012 });
        }
        // The register.
        if (a <= 56.2 && b > 56.2) box(ctx, 56.2, 13.85, 1.1, 0.5, 0.4, 0.28, C.grey, { lw: 0.02, flat: true });
      });
    }
    // Gander Cola, in a fridge between the stands.
    R.thing(57.75, 13.2, (ctx) => {
      box(ctx, 57.42, 12.5, 0, 0.66, 0.7, 2.1, BRAND.can, { lw: 0.035, flat: true });
      panel(ctx, 57.5, 58.0, 13.205, 0.25, 1.7, alpha(tint(C.sky, 0.55), 0.85), { lw: 0.02 });
      if (Q.detail) for (let s = 0; s < 4; s++) for (let i = 0; i < 3; i++) panel(ctx, 57.57 + i * 0.15, 57.67 + i * 0.15, 13.21, 0.35 + s * 0.35, 0.58 + s * 0.35, BRAND.can, { lw: 0.01 });
      panel(ctx, 57.42, 58.08, 13.205, 1.75, 2.05, BRAND.can, { stroke: false });
      words(ctx, 'x', 57.75, 13.21, 1.92, 'GANDER', 0.12, BRAND.ink, { font: 'Bagel Fat One' });
    });
    // The lobster stand: a shack's shingles, a red lobster on the sign, the price.
    R.thing(60.45, 12.9, (ctx) => {
      box(ctx, 58.3, 12.4, 0, 4.3, 0.5, 1.2, C.wood, { lw: 0.03, top: C.woodLight, flat: true });
      // A tank of lobsters, not looking forward to it.
      box(ctx, 60.6, 12.45, 1.2, 1.4, 0.4, 0.6, alpha(C.water, 0.6), { lw: 0.025, flat: true });
      if (Q.detail) for (const lx of [60.9, 61.5]) disc(ctx, lx, 12.65, 1.28, 0.12, C.red, { lw: 0.015 });
      for (const px of [58.6, 62.3]) box(ctx, px, 12.5, 1.2, 0.08, 0.08, 1.1, C.ink, { flat: true, stroke: false });
      box(ctx, 58.3, 12.45, 2.25, 4.3, 0.2, 0.95, C.navy, { lw: 0.035, flat: true });
      // The lobster, on the sign.
      if (Q.detail) {
        const [lx, ly] = P(59.1, 12.66, 2.72);
        ctx.save(); ctx.translate(lx, ly); ctx.transform(1, 0.5, 0, ZK, 0, 0);
        ctx.beginPath(); ctx.ellipse(0, 0, 0.32, 0.14, 0, 0, TAU); paint(ctx, C.red, { lw: 0.02 });
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(0.38, s * 0.16, 0.14, 0.08, s * 0.5, 0, TAU); paint(ctx, C.red, { lw: 0.02 }); }
        ctx.restore();
      }
      words(ctx, 'x', 60.85, 12.66, 2.9, 'LOBSTER ROLL', 0.24, C.white, { font: 'Bagel Fat One' });
      words(ctx, 'x', 60.85, 12.66, 2.52, '$19  ·  CHOWDAH $14', 0.18, INK.signal);
    }, { depth: 58.3 + 12.6 });
    for (const [a, b] of spans(58.3, 62.6, 1.45)) {
      R.thing((a + b) / 2, 14.5, (ctx) => {
        box(ctx, a, 13.7, 0, b - a, 0.8, 1.1, C.white, { lw: 0.035, top: C.greyLight, flat: true });
        // Shingles on its front.
        if (Q.detail) for (let r = 0; r < 4; r++) for (let i = 0; i < 9; i++) {
          const x = 58.35 + i * 0.47 + (r % 2) * 0.22;
          const x0 = Math.max(x, a + 0.03), x1 = Math.min(x + 0.42, b - 0.03);
          if (x1 <= x0 || x + 0.42 > 62.6) continue;
          panel(ctx, x0, x1, 14.505, 0.1 + r * 0.24, 0.32 + r * 0.24, r % 2 ? tint(C.wood, 0.2) : C.wood, { lw: 0.012 });
        }
        if (a <= 58.5 && b > 58.5) box(ctx, 58.5, 13.85, 1.1, 0.5, 0.4, 0.28, C.grey, { lw: 0.02, flat: true });
        if (a <= 61.85 && b > 61.85) {
          // A board of specials propped on the counter.
          panel(ctx, 61.25, 62.45, 14.3, 1.1, 1.8, C.ink, { lw: 0.02 });
          words(ctx, 'x', 61.85, 14.31, 1.6, 'MARKET PRICE:', 0.12, C.white);
          words(ctx, 'x', 61.85, 14.31, 1.35, 'OUCH', 0.2, INK.signal, { font: 'Bagel Fat One' });
        }
      });
    }
    nightGlow(R, 55.1, 13.0, 2.7, 3, PINK, 0.5);
    nightGlow(R, 60.4, 13.0, 2.7, 3, LIT, 0.4);
    // The pickup table, and the $19 lobster roll on it (a find).
    const ROLL = [60.1, 15.25];
    R.thing(ROLL[0], ROLL[1] + 0.45, (ctx) => {
      box(ctx, ROLL[0] - 0.05, ROLL[1] - 0.05, 0, 0.1, 0.1, 1.0, C.ink, { flat: true, stroke: false });
      disc(ctx, ROLL[0], ROLL[1], 0.01, 0.3, C.ink, { stroke: false });
      cylinder(ctx, ROLL[0], ROLL[1], 0.98, 0.48, 0.07, C.white, { flat: true });
      // The paper boat, the split-top bun, the lobster, a leaf, a pickle and the price flag.
      const z = 1.05;
      box(ctx, ROLL[0] - 0.36, ROLL[1] - 0.17, z, 0.72, 0.34, 0.07, tint(C.sky, 0.6), { lw: 0.02, flat: true });
      box(ctx, ROLL[0] - 0.3, ROLL[1] - 0.12, z + 0.07, 0.6, 0.24, 0.13, C.woodLight, { lw: 0.025, top: C.wood });
      box(ctx, ROLL[0] - 0.27, ROLL[1] - 0.06, z + 0.2, 0.54, 0.12, 0.05, C.leaf, { flat: true, lw: 0.015 });
      for (let i = 0; i < 4; i++) {
        const [X, Y] = P(ROLL[0] - 0.2 + i * 0.13, ROLL[1] + (i % 2) * 0.03, z + 0.27);
        ctx.beginPath(); ctx.ellipse(X, Y, 0.1, 0.07, 0.3, 0, TAU); paint(ctx, i % 2 ? C.coral : tint(C.red, 0.15), { lw: 0.018 });
      }
      box(ctx, ROLL[0] + 0.38, ROLL[1] - 0.1, z, 0.12, 0.2, 0.08, C.green, { flat: true, lw: 0.015 });
      line3(ctx, [ROLL[0] + 0.1, ROLL[1], z + 0.25], [ROLL[0] + 0.12, ROLL[1], z + 0.62], C.ink, 0.02);
      const [fx, fy] = P(ROLL[0] + 0.12, ROLL[1], z + 0.62);
      ctx.beginPath(); ctx.rect(fx, fy - 0.01, 0.34, 0.16); paint(ctx, C.white, { lw: 0.015 });
      label(ctx, ROLL[0] + 0.12 + 0.17 * 0.7, ROLL[1] - 0.17 * 0.7, z + 0.55, '$19', 0.1, C.red, 'Rethink Sans');
    });
    R.find({ id: 'lobster-roll', label: 'A $19 lobster roll', at: [ROLL[0], ROLL[1], 1.25], r: 0.8 });

    // The food court's people: two behind the counters, a queue for donuts,
    // and a woman who has just been told the price.
    const donutGuy = look(201, 'traveler', { top: INK.safety, hat: 'cap', bottom: C.brown, dress: false });
    R.thing(55.1, 13.3, (ctx, t) => {
      const k = pulse(t, 5);
      const give = k > 0.55 && k < 0.85;
      person(ctx, 55.1, 13.3, 0, { ...donutGuy, pose: 'stand', dir: 'l', arms: give ? [1.6, 0.3] : [0.5 + Math.sin(t * 3) * 0.2, 0.4], hold: give ? inHand(1.6, donutHeld) : null }, t);
    }, { anim: true });
    R.air((ctx, t) => {
      // Steam off the coffee urns.
      if (!Q.detail) return;
      particles(t, 4, 2.2, (k, r) => {
        const [X, Y] = P(53.5 + r() * 0.8, 12.65, 1.9 + k * 1.1);
        ctx.beginPath(); ctx.arc(X + Math.sin(k * 6 + r() * 6) * 0.08, Y, 0.06 + k * 0.1, 0, TAU);
        ctx.fillStyle = alpha(C.white, 0.6 * (1 - k)); ctx.fill();
      }, 7);
    });
    stay(R, 59.6, 13.2, look(202, 'traveler', { top: C.white, hat: 'chef', bottom: C.navy, dress: false, arms: [0.9, 0.5] }), { dir: 'l' });
    const queue = [[53.9, 15.2, 203], [55.1, 15.35, 204], [56.3, 15.2, 205]];
    queue.forEach(([x, y, s], i) => stay(R, x, y, look(s, 'traveler', i === 1 ? DOING.coffee : {}), { dir: 'r', back: true }));
    stay(R, 58.9, 15.35, look(206, 'traveler', { top: C.teal, style: 'bun' }), { pose: 'point', dir: 'r' });

    // ---------- The seats ----------
    // Two rows facing the gates, in runs that stop short of the seams, each
    // run in pieces of up to three seats (each sorts on its own). Whoever
    // sits in a seat is drawn just after its piece.
    const ROWS = [18.4, 21.2];
    const RUNS = [[54.4, 10], [70.2, 10], [80.8, 6], [89.0, 7], [96.8, 6]];
    const pieceOf = {};
    RUNS.forEach(([x0, n], ri) => {
      for (const y of ROWS) {
        for (let i = 0; i < n; i += 3) {
          const m = Math.min(3, n - i), a = x0 + i * CW;
          const depth = a + (m * CW) / 2 + y + ROW_D;
          for (let k = 0; k < m; k++) pieceOf[`${ri}.${y}.${i + k}`] = depth;
          R.thing(a + (m * CW) / 2, y + ROW_D, (ctx) => seats(ctx, a, m, y));
        }
      }
    });
    // A seat's middle (x, the sitter's y) and the depth to draw its sitter at.
    const seat = (run, row, i) => {
      const y = ROWS[row];
      return { x: RUNS[run][0] + (i + 0.5) * CW, y: y + 0.5, depth: pieceOf[`${run}.${y}.${i}`] + 0.02 };
    };
    // Someone in a seat (on: when they're there).
    const sit = (run, row, i, lk, on = DAYS, o = {}) => {
      const s = seat(run, row, i);
      stay(R, s.x, s.y, lk, { pose: 'sit', dir: 'l', depth: s.depth, on, ...o });
    };
    // Something left on a seat: a coat, a bag, a case.
    const onSeat = (run, row, i, draw, on = DAYS) => {
      const s = seat(run, row, i);
      R.thing(s.x, s.y, (ctx) => draw(ctx, s.x, ROWS[row]), { depth: s.depth, on });
    };
    // Asleep across seats i0..i1 (feet at i1's end), under a coat.
    const sleepAcross = (run, row, i0, i1, lk, coat, on = CAMP) => {
      const a = seat(run, row, i1), x = a.x + CW * 0.42;
      let depth = a.depth;
      for (let i = i0; i <= i1; i++) depth = Math.max(depth, seat(run, row, i).depth);
      R.thing(x, a.y, (ctx) => lieAlong(ctx, x, a.y + 0.05, 0.78, { ...lk, wear: coatOver(coat), face: shut }), { depth, on });
    };

    // By day.
    const orlando = (seed, o = {}) => look(seed, 'traveler', { hat: 'sun', top: [C.pink, C.coral, C.mustard][seed % 3], wear: shorts, ...o });
    sit(0, 0, 0, sitter(301, 'phone'));
    onSeat(0, 0, 1, (ctx, x, y) => coatOnSeat(ctx, x, y, C.teal));
    sit(0, 0, 2, orlando(302, DOING.coffee));
    sit(0, 0, 3, orlando(303, { ...DOING.donut, scale: 0.7 }));
    sit(0, 0, 4, orlando(304, DOING.read));
    sit(0, 0, 6, sitter(305, 'laptop'));
    sit(0, 0, 7, sitter(306, 'doze'));
    sit(0, 0, 9, sitter(307, 'knit', { hair: C.greyLight, style: 'bun' }));
    onSeat(0, 1, 0, (ctx, x, y) => bag(ctx, x, y + 0.5, 0.72, { kind: 'duffel', color: C.green, lie: true }));
    sit(0, 1, 1, sitter(310, 'phone'));
    sit(0, 1, 2, sitter(311, 'pillow'));
    sit(0, 1, 4, sitter(312, 'read'));
    sit(0, 1, 6, sitter(313, 'coffee'));
    sit(0, 1, 8, sitter(314, 'phone', { scale: 0.7 }));
    sit(1, 0, 0, sitter(320, 'phone'));
    sit(1, 0, 1, sitter(321, 'doze'));
    sit(1, 0, 3, sitter(322, 'read'));
    sit(1, 0, 4, sitter(323, 'phone'));
    sit(1, 0, 6, sitter(324, 'coffee'));
    sit(1, 0, 7, sitter(325, 'laptop'));
    sit(1, 0, 9, sitter(326, 'phone'));
    // The band's cases, on the seats behind them all day.
    for (let i = 3; i < 10; i++) onSeat(1, 1, i, (ctx, x, y) => instCase(ctx, x, y + 0.5, 0.73, 0.7, 0.42, i % 3 ? 0.24 : 0.36), (t) => true);
    sit(2, 0, 0, sitter(330, 'phone'));
    // The family in matching sweatshirts.
    const family = { top: C.mustard, wear: gobble };
    sit(2, 0, 2, sitter(331, 'phone', family));
    sit(2, 0, 3, sitter(332, 'donut', { ...family, scale: 0.7 }));
    sit(2, 0, 4, sitter(333, 'read', family));
    sit(2, 1, 0, sitter(334, 'doze'));
    // The student going home with a term's laundry.
    sit(2, 1, 1, sitter(335, 'phone', { top: C.green, hat: 'beanie' }));
    onSeat(2, 1, 2, (ctx, x, y) => {
      const [X, Y] = P(x, y + 0.45, 0.72);
      ctx.beginPath(); ctx.ellipse(X, Y - 0.42, 0.42, 0.48, 0, 0, TAU); paint(ctx, C.white, { lw: 0.035, dots: Q.detail ? C.grey : null, density: 0.2 });
      ctx.beginPath(); ctx.moveTo(X - 0.08, Y - 0.88); ctx.lineTo(X, Y - 1.02); ctx.lineTo(X + 0.08, Y - 0.88); paint(ctx, C.white, { lw: 0.03 });
      if (Q.detail) { ctx.beginPath(); ctx.ellipse(X + 0.18, Y - 0.3, 0.12, 0.06, 0.4, 0, TAU); ctx.fillStyle = C.pink; ctx.fill(); }
    });
    sit(2, 1, 4, sitter(336, 'phone'));
    onSeat(2, 1, 5, (ctx, x, y) => coatOnSeat(ctx, x, y, C.red));
    sit(3, 0, 0, sitter(340, 'read'));
    sit(3, 0, 1, sitter(341, 'phone'));
    sit(3, 0, 3, sitter(342, 'knit'));
    sit(3, 0, 5, sitter(343, 'doze'));
    sit(3, 0, 6, sitter(344, 'phone'));
    sit(3, 1, 0, sitter(345, 'laptop'));
    sit(3, 1, 2, sitter(346, 'coffee'));
    sit(3, 1, 3, sitter(347, 'phone'));
    sit(3, 1, 5, sitter(348, 'pillow'));
    sit(4, 0, 0, sitter(350, 'phone'));
    sit(4, 0, 1, sitter(351, 'coffee'));
    sit(4, 0, 3, sitter(352, 'doze'));
    sit(4, 0, 4, sitter(353, 'read'));
    sit(4, 1, 1, sitter(354, 'phone'));
    sit(4, 1, 2, sitter(355, 'donut', { scale: 0.7 }));
    sit(4, 1, 4, sitter(356, 'laptop'));
    onSeat(4, 1, 5, (ctx, x, y) => coatOnSeat(ctx, x, y, C.purple));

    // By night: the campsite. Everyone across three seats, under their coat.
    const sleeper = (seed) => look(seed, 'traveler');
    const COATS = [C.navy, INK.cranberry, C.teal, C.mustard, C.purple, C.green, C.red, C.grey];
    let ci = 0;
    const camp = (run, row, i0, i1, seed) => sleepAcross(run, row, i0, i1, sleeper(seed), COATS[ci++ % COATS.length]);
    camp(0, 0, 0, 2, 401); camp(0, 0, 4, 6, 402);
    sit(0, 0, 8, sitter(403, 'pillow'), CAMP);
    camp(0, 1, 0, 2, 404); camp(0, 1, 6, 8, 406);
    // The one still awake, lit by a phone.
    sit(0, 1, 4, sitter(405, 'phone'), CAMP);
    camp(1, 0, 0, 2, 407); camp(1, 0, 3, 5, 408); camp(1, 0, 7, 9, 409);
    camp(2, 0, 0, 1, 410); camp(2, 0, 2, 4, 411);
    camp(2, 1, 0, 2, 412);
    onSeat(2, 1, 4, (ctx, x, y) => coatOnSeat(ctx, x, y, C.red), CAMP);
    camp(3, 0, 0, 2, 413); camp(3, 0, 4, 6, 414);
    camp(3, 1, 1, 3, 415);
    sit(3, 1, 5, sitter(416, 'pillow'), CAMP);
    camp(4, 0, 0, 2, 417); camp(4, 0, 3, 5, 418);
    camp(4, 1, 0, 2, 419);
    // The sign at the end of the seats, which everyone's ignoring.
    R.thing(103.2, 19.9, (ctx) => {
      box(ctx, 103.15, 19.75, 0, 0.1, 0.1, 1.2, C.ink, { flat: true, stroke: false });
      disc(ctx, 103.2, 19.8, 0.01, 0.25, C.ink, { stroke: false });
      face(ctx, [[103.2, 19.2, 1.0], [103.2, 20.4, 1.0], [103.2, 20.4, 1.9], [103.2, 19.2, 1.9]], SIGN.board, { lw: 0.03 });
      words(ctx, 'y', 103.21, 19.8, 1.7, 'PLEASE DO NOT', 0.13, SIGN.ink);
      words(ctx, 'y', 103.21, 19.8, 1.48, 'SLEEP ACROSS', 0.13, SIGN.ink);
      words(ctx, 'y', 103.21, 19.8, 1.26, 'THE SEATS', 0.13, SIGN.ink);
    });

    // ---------- The charging pole ----------
    // Two outlets, nine phones. By night it's the campfire.
    const POLE = [67.6, 19.4];
    const chargers = [
      [66.5, 18.5, 501, 'r', false], [68.7, 18.4, 502, 'l', true], [67.8, 17.9, 503, 'l', true],
      [69.2, 19.7, 504, 'l', false], [66.1, 19.8, 505, 'r', false], [66.3, 20.9, 506, 'r', false],
      [68.9, 20.9, 508, 'l', false],
    ];
    R.thing(POLE[0] + 0.25, POLE[1] + 0.25, (ctx) => {
      const [x, y] = POLE;
      box(ctx, x - 0.25, y - 0.25, 0, 0.5, 0.5, 1.7, C.greyLight, { lw: 0.035, top: C.mustard });
      box(ctx, x - 0.3, y - 0.3, 1.7, 0.6, 0.6, 0.35, C.mustard, { lw: 0.035, flat: true });
      words(ctx, 'x', x, y + 0.31, 1.87, 'CHARGE', 0.13, C.ink);
      // A lightning bolt on its side.
      if (Q.detail) {
        const pts = [[x + 0.31, y - 0.05, 1.98], [x + 0.31, y + 0.1, 1.86], [x + 0.31, y + 0.0, 1.86], [x + 0.31, y + 0.12, 1.72], [x + 0.31, y - 0.1, 1.88], [x + 0.31, y + 0.02, 1.88]];
        face(ctx, pts, C.ink, { stroke: false });
      }
      // Two outlets a side, and the cables to everybody's phones.
      for (const z of [0.9, 1.25]) {
        panel(ctx, x - 0.12, x + 0.12, y + 0.255, z - 0.1, z + 0.1, C.white, { lw: 0.015 });
        face(ctx, [[x + 0.255, y - 0.12, z - 0.1], [x + 0.255, y + 0.12, z - 0.1], [x + 0.255, y + 0.12, z + 0.1], [x + 0.255, y - 0.12, z + 0.1]], C.white, { lw: 0.015 });
      }
    });
    // The cables: out to everybody's phones by day, down to the phones on
    // the floor by night.
    const cable = (ctx, [x, y], [cx, cy, cz]) => {
      const [ax, ay] = P(x + (cx > x ? 0.25 : -0.1), y + (cy > y ? 0.25 : -0.1), 1.1);
      const [bx, by] = P(cx, cy, cz);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + bx) / 2, Math.max(ay, by) + 0.35, bx, by); ctx.stroke();
    };
    const FLOOR_PHONES = [[66.6, 19.9], [68.6, 20.1], [68.2, 21.6], [66.2, 18.6]];
    R.thing(POLE[0] + 0.26, POLE[1] + 0.26, (ctx) => {
      if (!Q.detail) return;
      ctx.lineWidth = 0.03; ctx.strokeStyle = C.ink;
      for (const [cx, cy] of chargers) cable(ctx, POLE, [cx + (cx > POLE[0] ? -0.2 : 0.25), cy, 1.05]);
    }, { on: DAYS });
    R.rug((ctx) => {
      ctx.lineWidth = 0.03; ctx.strokeStyle = C.ink;
      for (const [px, py] of FLOOR_PHONES) {
        if (Q.detail) cable(ctx, POLE, [px, py, 0.02]);
        rect(ctx, px - 0.1, py - 0.16, 0.2, 0.32, 0.02, C.black, { lw: 0.015 });
        rect(ctx, px - 0.07, py - 0.12, 0.14, 0.24, 0.025, tint(C.sky, 0.45), { stroke: false });
      }
    }, { on: CAMP });
    R.poke({ id: 'charge', at: [POLE[0], POLE[1], 1.5], r: 0.8, sound: 'tick', say: ['Two outlets. Nine phones.', 'Everyone is on one percent.', 'Please share. Nobody shares.'] });
    chargers.forEach(([x, y, s, dir, back], i) => {
      if (i === 3) return; // (the one waving his phone for a signal is live, below)
      stay(R, x, y, look(s, 'traveler', { ...DOING.phone, ...(i === 4 ? { arms: [1.5, 1.3] } : {}) }), { dir, back, on: DAYS });
    });
    R.thing(69.2, 19.7, (ctx, t) => {
      const a = 2.5 + Math.sin(t * 1.3) * 0.5;
      person(ctx, 69.2, 19.7, 0, { ...look(504, 'traveler', { hold: null }), pose: 'stand', dir: 'l', arms: [a, 0.3] }, t);
      if (!Q.detail) return;
      // (His hand, up at the end of his arm: he faces left.)
      const [X, Y] = P(69.2, 19.7, 0);
      const hx = X - (0.22 + Math.sin(a) * 0.72), hy = Y - 1.53 + Math.cos(a) * 0.72;
      ctx.beginPath(); ctx.roundRect(hx - 0.08, hy - 0.26, 0.16, 0.26, 0.03); paint(ctx, C.black, { lw: 0.02 });
      ctx.fillStyle = tint(C.sky, 0.4); ctx.fillRect(hx - 0.05, hy - 0.23, 0.1, 0.18);
    }, { anim: true, on: DAYS });
    // Two more, on their cases on the floor, and a man with his own power strip.
    stay(R, 67.0, 20.6, look(507, 'traveler', DOING.phone), { pose: 'sit', dir: 'r', z: -0.35, on: DAYS });
    R.thing(67.0, 20.62, (ctx) => bag(ctx, 67.0, 20.55, 0, { kind: 'case', color: C.purple, lie: true }), { depth: 87.55, on: DAYS });
    stay(R, 65.7, 19.0, look(509, 'traveler', { arms: [1.4, 1.2], hold: (ctx) => {
      ctx.beginPath(); ctx.rect(-0.05, -0.12, 0.5, 0.12); paint(ctx, C.white, { lw: 0.02 });
      for (let i = 0; i < 4; i++) { ctx.fillStyle = [C.coral, C.teal, C.black, C.purple][i]; ctx.fillRect(-0.02 + i * 0.12, -0.3, 0.08, 0.18); }
    } }), { dir: 'r', on: DAYS });
    // By night: asleep round it like a campfire, phones glowing.
    stay(R, 66.2, 19.5, look(501, 'traveler', DOING.doze), { pose: 'sit', dir: 'r', z: -0.35, on: CAMP });
    R.thing(66.2, 19.52, (ctx) => bag(ctx, 66.2, 19.45, 0, { kind: 'case', color: C.navy, lie: true }), { depth: 85.6, on: CAMP });
    stay(R, 69.0, 19.6, look(502, 'traveler', DOING.doze), { pose: 'sit', dir: 'l', z: -0.35, on: CAMP });
    R.thing(69.0, 19.62, (ctx) => bag(ctx, 69.0, 19.55, 0, { kind: 'duffel', color: C.teal, lie: true }), { depth: 88.5, on: CAMP });
    R.thing(69.9, 21.2, (ctx) => lieAlong(ctx, 69.9, 21.2, 0, { ...sleeper(503), wear: coatOver(C.coral), face: shut }), { on: CAMP });
    R.thing(66.9, 18.3, (ctx) => lieAlong(ctx, 66.9, 18.3, 0, { ...sleeper(505), wear: coatOver(C.navy), face: shut }), { on: CAMP });
    R.thing(67.4, 21.9, (ctx) => lieAlong(ctx, 67.4, 21.9, 0, { ...sleeper(506), wear: coatOver(C.mustard), face: shut }), { on: CAMP });
    R.light({ at: [67.6, 19.9, 0.4], r: 3, color: tint(C.sky, 0.3), k: (t) => (CAMP(t) ? 0.5 + Math.sin(t * 2) * 0.08 : 0) });

    // ---------- The gates ----------
    // A desk at each, an agent behind it (back to you, facing the seats), the
    // gate's screen by its door.
    const GATE = {
      C12: { to: 'ORLANDO', status: flightOne, seed: 601 },
      C13: { to: 'NEW YORK', status: (t) => delay(t, 0), seed: 602 },
      C14: { to: 'PHILADELPHIA', status: (t) => delay(t, 1), seed: 603 },
    };
    for (const [g, x] of Object.entries(GATES)) {
      const G = GATE[g];
      for (const [a, b] of [[x - 1.6, x], [x, x + 1.6]]) {
        R.thing((a + b) / 2, 27.6, (ctx) => {
          box(ctx, a, 26.6, 0, b - a, 1.0, 1.05, DESK, { lw: 0.035, top: tint(DESK, 0.2) });
          box(ctx, a - 0.05, 26.55, 1.05, b - a + 0.1, 1.1, 0.06, C.grey, { flat: true, lw: 0.025 });
          panel(ctx, a, b, 27.605, 0.75, 0.82, INK.cranberry, { stroke: false });
          // Its screens, turned to the agent (and so to you).
          const mx = a + (b - a) * 0.5;
          box(ctx, mx - 0.05, 27.0, 1.11, 0.1, 0.1, 0.18, C.ink, { flat: true, stroke: false });
          box(ctx, mx - 0.32, 26.98, 1.27, 0.64, 0.08, 0.42, C.black, { flat: true, lw: 0.02 });
          panel(ctx, mx - 0.27, mx + 0.27, 27.065, 1.31, 1.65, tint(C.sky, 0.3), { stroke: false });
        });
      }
      R.thing(x, 27.62, (ctx) => {
        words(ctx, 'x', x - 0.2, 27.62, 0.42, `${g}  ${G.to}`, 0.16, C.white);
      }, { depth: x + 28.45 });
      stay(R, x - 1.3, 28.25, look(G.seed, 'agent', { top: C.navy, arms: [0.9, 0.7] }), { dir: 'r', back: true });
      // The gate's screen on a post by the door.
      // (Right of the door, past the desk's lettering: left of C12's door is
      // the Courier's spot at the window.)
      const sx = x + 3.4;
      R.thing(sx, 29.2, (ctx) => {
        box(ctx, sx - 0.05, 29.1, 0, 0.1, 0.1, 1.3, C.ink, { flat: true, stroke: false });
        disc(ctx, sx, 29.15, 0.01, 0.22, C.ink, { stroke: false });
        box(ctx, sx - 0.7, 29.05, 1.3, 1.4, 0.12, 0.85, SIGN.board, { flat: true, lw: 0.03 });
        panel(ctx, sx - 0.64, sx + 0.64, 29.175, 1.88, 2.1, INK.signal, { stroke: false });
        words(ctx, 'x', sx, 29.18, 1.99, g, 0.16, SIGN.board);
        words(ctx, 'x', sx, 29.18, 1.72, G.to, 0.16, SIGN.ink);
      });
      R.thing(sx, 29.22, (ctx, t) => {
        const s = G.status(t);
        words(ctx, 'x', sx, 29.19, 1.45, s, 0.15, s === 'ON TIME' || s === 'DEPARTED' ? OK : s === 'CANCELED' ? BAD : INK.signal);
      }, { anim: true });
    }
    nightGlow(R, GATES.C12 + 3.4, 29.2, 1.7, 2, OK, 0.5);
    // C12's agent pages the goose, now and then, all day and all night.
    R.air((ctx, t) => {
      if (!Q.detail) return;
      const k = pulse(t, 26, 9);
      if (k < 0.8) return;
      speech(ctx, GATES.C12 - 1.3, 28.25, 2.9, k < 0.9 ? 'Passenger Goose?' : 'Final call, Goose.', { size: 0.34 });
    });
    // The microphone on C12's desk, on a gooseneck, naturally.
    R.thing(GATES.C12 + 0.02, 27.12, (ctx) => {
      const [x, y] = [GATES.C12, 27.1];
      disc(ctx, x, y, 1.12, 0.12, C.ink, { stroke: false });
      ctx.beginPath();
      const a = P(x, y, 1.12), b = P(x, y - 0.1, 1.45), c = P(x - 0.05, y - 0.35, 1.52);
      ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(b[0], b[1], c[0], c[1]);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.lineCap = 'round'; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(c[0], c[1], 0.08, 0.06, 0.4, 0, TAU); paint(ctx, C.grey, { lw: 0.025 });
    }, { depth: GATES.C12 + 28.5 });
    R.poke({ id: 'mic', at: [GATES.C12, 27.1, 1.5], r: 0.8, sound: 'tick', say: ['Final call for passenger Goose.', 'Goose, party of one?', 'Flight 1. On time. Boarding... soon.'] });
    // C12's boarding lane for Group 1, empty but for one man in a sun hat
    // who has been ready since four. He boards at last when Flight 1 does,
    // at half past eleven at night; the Courier doesn't.
    const BOARDED = (t) => hrs(t) >= 23.4;
    const lane = (y) => (ctx) => {
      for (const px of [55.7, 57.9]) {
        disc(ctx, px, y, 0.01, 0.16, C.ink, { stroke: false });
        box(ctx, px - 0.04, y - 0.04, 0, 0.08, 0.08, 0.95, FRAME, { flat: true, stroke: false });
      }
      line3(ctx, [55.7, y, 0.88], [57.9, y, 0.88], INK.cranberry, 0.06);
    };
    R.thing(57.9, 26.1, lane(26.1));
    R.thing(57.9, 27.9, lane(27.9), { depth: 57.9 + 27.9 + 0.1 });
    for (const done of [false, true]) {
      R.thing(55.7, 26.15, (ctx) => {
        box(ctx, 55.65, 26.05, 0.95, 0.1, 0.1, 0.4, C.ink, { flat: true, stroke: false });
        face(ctx, [[55.7, 25.6, 1.3], [55.7, 26.6, 1.3], [55.7, 26.6, 1.9], [55.7, 25.6, 1.9]], SIGN.board, { lw: 0.025 });
        words(ctx, 'y', 55.71, 26.1, 1.72, 'GROUP 1', 0.15, SIGN.ink);
        words(ctx, 'y', 55.71, 26.1, 1.48, done ? 'BOARDED!' : 'BOARDING SOON', done ? 0.13 : 0.1, done ? OK : SIGN.ink);
      }, { on: (t) => BOARDED(t) === done });
    }
    stay(R, 57.0, 27.2, orlando(604, { arms: [0.3, 0.3], top: C.coral, face: (ctx, hy, back) => {
      if (back || !Q.detail) return;
      // (Sunglasses: it's Orlando.)
      ctx.fillStyle = C.black; ctx.fillRect(0.04, hy - 0.04, 0.26, 0.09);
    } }), { dir: 'l', on: DAYS });
    R.thing(57.6, 27.1, (ctx) => lieAlong(ctx, 57.6, 27.1, 0, { ...orlando(604), wear: coatOver(C.coral), face: shut }), { on: (t) => CAMP(t) && !BOARDED(t) });
    // C13: the band's banner, taped to the window, facing out.
    R.thing(73.6, AIR + 0.02, (ctx) => {
      panel(ctx, 70.8, 76.0, AIR + 0.01, 0.38, 1.02, C.white, { lw: 0.03 });
      words(ctx, 'x', 73.4, AIR + 0.02, 0.8, 'GO MARCHING DUCKS!', 0.24, INK.cranberry, { font: 'Bagel Fat One' });
      words(ctx, 'x', 73.4, AIR + 0.02, 0.52, 'WORCESTER TO NEW YORK', 0.13, C.navy);
    }, { depth: 76.6 + AIR + 0.2 });
    // The quiet zone, which is where the band is rehearsing.
    R.thing(72.6, 26.3, (ctx) => {
      box(ctx, 72.55, 26.25, 0, 0.1, 0.1, 1.2, C.ink, { flat: true, stroke: false });
      disc(ctx, 72.6, 26.3, 0.01, 0.22, C.ink, { stroke: false });
      panel(ctx, 72.0, 73.2, 26.36, 1.15, 1.85, C.white, { lw: 0.03 });
      words(ctx, 'x', 72.6, 26.37, 1.62, 'QUIET', 0.2, C.navy, { font: 'Bagel Fat One' });
      words(ctx, 'x', 72.6, 26.37, 1.34, 'ZONE', 0.2, C.navy, { font: 'Bagel Fat One' });
    });

    // ---------- The Marching Ducks ----------
    // Twelve kids from Worcester in cranberry, on their way to the parade,
    // rehearsing all day in a block facing their director, with a gap in the
    // middle of the front row where the tuba goes. Find the tuba (in the bag
    // room) and then him, and the hole is filled. By night, asleep on their
    // cases.
    const BAND = [
      // [x, y, seed, instrument]
      [73.5, 23.0, 701, 'trumpet'], [74.65, 23.0, 702, 'trumpet'], [75.8, 23.0, 711, 'mellophone'],
      [76.95, 23.0, 704, 'trombone'], [78.1, 23.0, 705, 'trombone'], [79.2, 23.0, 706, 'clarinet'],
      // (The front row, with a gap in the middle the size of a tuba.)
      [72.5, 24.6, 707, 'mace'], [73.6, 24.6, 708, 'cymbals'], [74.7, 24.6, 709, 'snare'],
      [79.2, 24.7, 710, 'bass'], [80.5, 23.2, 714, 'flag'],
    ];
    const TUBA = [77.0, 24.6];
    const kid = (seed, o = {}) => look(seed, 'band', { hat: 'none', wear: uniform, scale: 0.86, ...o });
    for (const [x, y, s, what] of BAND) {
      const step = (s % 2) * 1.6;
      R.thing(x, y, (ctx, t) => {
        // (Marking time: a little bob on the beat.)
        const z = Math.abs(Math.sin(t * 3.2 + step)) * 0.05;
        let o;
        if (INSTRUMENT[what]) o = { arms: what === 'clarinet' ? [1.0, 0.8] : [1.9, 1.7], face: (c, hy, back) => { shako(c, hy); INSTRUMENT[what](c, hy, t); } };
        else if (what === 'snare') o = { pose: 'drum', hold: snareHeld, face: shako };
        else if (what === 'bass') o = { pose: 'drum', hold: bassHeld, face: shako };
        else if (what === 'flag') o = { arms: [2.5, 2.3], hold: (c) => flagHeld(c, t), face: shako };
        else if (what === 'cymbals') o = { arms: [1.4 + Math.abs(Math.sin(t * 2.4)) * 0.4, 1.2], hold: (c) => cymbalsHeld(c, t), face: shako };
        else o = { arms: [2.2, 0.3], hold: (c) => maceHeld(c, t), face: (c, hy) => { shako(c, hy); c.beginPath(); c.ellipse(-0.02, hy - 1.05, 0.11, 0.28, 0.1, 0, TAU); paint(c, BRASS, { lw: 0.03 }); } };
        person(ctx, x, y, z, { ...kid(s), pose: 'stand', dir: 'r', ...o }, t);
      }, { anim: true, on: DAYS });
    }
    // The tuba player: arms round nothing, cheeks puffed, playing the air.
    // Reunited, round his sousaphone, the band complete.
    R.thing(TUBA[0], TUBA[1], (ctx, t) => {
      const z = Math.abs(Math.sin(t * 3.2)) * 0.05;
      const has = R.found('tuba-player');
      person(ctx, TUBA[0], TUBA[1], z, {
        ...kid(712, { scale: 0.92 }), pose: 'stand', dir: 'r',
        arms: has ? [1.5, 1.2] : [1.25 + Math.sin(t * 3.2) * 0.08, 1.05],
        wear: (c, b) => { uniform(c, b); sousaphoneCoil(c, b, !has); },
        face: (c, hy, back) => { shako(c, hy); cheeks(c, hy, back); sousaphoneBell(c, hy, t, !has); },
      }, t);
    }, { anim: true, on: DAYS });
    // Their director, back to you, baton up.
    R.thing(82.4, 23.9, (ctx, t) => person(ctx, 82.4, 23.9, 0, { ...look(713, 'traveler', { top: C.navy, style: 'bald', hat: 'none' }), pose: 'wave', dir: 'l', back: true, speed: 5 }, t), { anim: true, on: DAYS });
    // The music, rising off them (fuller once the tuba's back).
    R.air((ctx, t) => {
      if (!Q.detail || !DAYS(t)) return;
      const full = R.found('tuba-player');
      particles(t, full ? 9 : 6, 3, (k, r, i) => {
        const x = 74.2 + r() * 5.6, y = 23 + r() * 1.6;
        const big = full && i < 3;
        note(ctx, big ? TUBA[0] + (r() - 0.5) : x, big ? TUBA[1] : y, 2.6 + k * 2 + (big ? 0.3 : 0), alpha(big ? INK.cranberry : C.ink, 1 - k), big ? 1.6 : 1);
      }, 11);
      if (full && pulse(t, 2.4) < 0.35) label(ctx, TUBA[0] + 0.5, TUBA[1] - 0.5, 4.6, 'OOM-PAH', 0.32, INK.cranberry, 'Bagel Fat One');
    });
    // Their director answers a tap (clear of the tuba player, so a tap on one
    // is never taken for the other).
    R.poke({ id: 'director', at: [82.4, 23.9, 2.0], r: 0.8, sound: 'tick', when: DAYS, say: ['From the top. Again.', 'And... wait for the tuba.', 'Quiet zone? We ARE quiet.'] });
    // (By night he's asleep at the front of the heap, and the find goes with him.)
    R.find({ id: 'tuba-player', label: 'The tuba player', after: 'bag-room:tuba', at: (t) => (DAYS(t) ? [TUBA[0], TUBA[1], 1.4] : [80.1, 25.6, 0.45]), r: 0.9, riddle: 'Tag: Marching Ducks, row 30. Big lungs.' });
    // By night: asleep in a heap on their cases, still in their hats.
    const BUNK = [[74.6, 23.1], [77.6, 23.1], [80.0 - 0.6, 23.1], [74.1, 24.3], [77.1, 24.3], [79.5, 24.3], [74.6, 25.4], [77.4, 25.4]];
    BUNK.forEach(([x, y], i) => {
      R.thing(x, y, (ctx) => {
        instCase(ctx, x - 2.0, y, 0, 0.7, 0.45, 0.22);
        lieAlong(ctx, x, y, 0.02, { ...kid(720 + i), face: (c, hy) => { shut(c, hy); shako(c, hy); } });
      }, { on: CAMP });
    });
    R.thing(81.2, 25.6, (ctx, t) => {
      const has = R.found('tuba-player');
      instCase(ctx, 79.2, 25.6, 0, 0.7, 0.45, 0.22);
      lieAlong(ctx, 81.2, 25.6, 0.02, { ...kid(712, { scale: 0.92 }), arms: has ? [1.4, 1.2] : [0.3, 0.2], wear: (c, b) => { uniform(c, b); if (has) sousaphoneCoil(c, b); }, face: (c, hy) => { shut(c, hy); if (has) sousaphoneBell(c, hy, 0); } });
    }, { anim: true, on: CAMP });
    R.thing(82.6, 24.2, (ctx) => lieAlong(ctx, 82.6, 24.2, 0, { ...look(713, 'traveler', { top: C.navy, style: 'bald', hat: 'none' }), wear: coatOver(C.navy), face: shut }), { on: CAMP });

    // ---------- Inspector Pidge ----------
    // At C13 behind a newspaper with two eyeholes, waiting for Monday's
    // flight. A tap lowers the paper.
    const pidge = folk(19, {
      skin: C.grey, style: 'bald', top: COAT, bottom: shade(COAT, 0.3),
      wear(ctx, b) {
        ctx.beginPath(); ctx.ellipse(0.02, b.top + 0.02, 0.27, 0.09, 0, 0, TAU);
        paint(ctx, C.tealLight, { lw: 0.03, dots: C.purple, density: 0.35 });
        ctx.fillStyle = shade(COAT, 0.45); ctx.fillRect(-0.29, b.hipY - 0.16, 0.58, 0.08);
      },
      face(ctx, hy, back) {
        if (!back) {
          ctx.beginPath(); ctx.arc(0.22, hy, 0.055, 0, TAU); ctx.fillStyle = C.coral; ctx.fill();
          ctx.beginPath(); ctx.arc(0.225, hy, 0.028, 0, TAU); ctx.fillStyle = C.ink; ctx.fill();
          ctx.beginPath(); ctx.moveTo(0.3, hy); ctx.lineTo(0.54, hy + 0.08); ctx.lineTo(0.3, hy + 0.13); ctx.closePath();
          paint(ctx, shade(C.grey, 0.55), { lw: 0.03 });
        }
        const check = mix(C.greyLight, C.brown, 0.45);
        for (const s of [1, -1]) {
          ctx.beginPath();
          ctx.moveTo(0.02 + s * 0.26, hy - 0.14); ctx.quadraticCurveTo(0.02 + s * 0.5, hy - 0.12, 0.02 + s * 0.58, hy + 0.04); ctx.lineTo(0.02 + s * 0.24, hy - 0.04); ctx.closePath();
          paint(ctx, shade(check, 0.15), { lw: 0.04 });
        }
        ctx.beginPath(); ctx.arc(0.02, hy - 0.06, 0.33, Math.PI, 0); ctx.closePath();
        paint(ctx, check, { dots: Q.detail ? C.ink : null, density: 0.3, lw: 0.05 });
      },
    });
    const PS = seat(1, 1, 1);
    stay(R, PS.x, PS.y, { ...pidge, arms: [1.25, 1.1] }, { pose: 'sit', dir: 'l', depth: PS.depth });
    const paper = R.poke({ id: 'newspaper', at: [PS.x, PS.y + 0.5, 1.9], r: 0.8, sound: 'pop', say: 'Shh. Undercover.' });
    R.thing(PS.x, PS.y + 0.55, (ctx, t) => {
      const k = paper.k(), y = PS.y + 0.55;
      const z0 = 1.05 - k * 0.42, z1 = 2.25 - k * 1.0, x0 = PS.x - 0.62, x1 = PS.x + 0.5;
      panel(ctx, x0, x1, y, z0, z1, C.white, { lw: 0.03 });
      if (!Q.detail) return;
      const h = z1 - z0;
      words(ctx, 'x', (x0 + x1) / 2, y + 0.01, z1 - h * 0.12, 'THE DAILY HONK', 0.12, C.ink, { font: 'Bagel Fat One' });
      words(ctx, 'x', (x0 + x1) / 2, y + 0.01, z1 - h * 0.3, 'GOOSE LOOSE?', 0.14, C.ink);
      for (let i = 0; i < 4; i++) for (const [a, b] of [[0.06, 0.5], [0.58, 1.06]]) {
        const zz = z1 - h * (0.45 + i * 0.12);
        panel(ctx, x0 + a, x0 + b, y + 0.008, zz - 0.02, zz + 0.02, C.grey, { stroke: false });
      }
      // Two eyeholes, an orange eye in one, blinking.
      if (k < 0.3) {
        for (const ex of [PS.x - 0.05, PS.x + 0.18]) {
          const [X, Y] = P(ex, y + 0.01, 1.78);
          ctx.beginPath(); ctx.ellipse(X, Y, 0.075, 0.06, 0, 0, TAU); ctx.fillStyle = C.ink; ctx.fill();
        }
        if (pulse(t, 4.5) < 0.93) {
          const [X, Y] = P(PS.x + 0.18, y + 0.012, 1.78);
          ctx.beginPath(); ctx.arc(X, Y, 0.04, 0, TAU); ctx.fillStyle = C.coral; ctx.fill();
        }
      }
    }, { anim: true, depth: PS.depth + 0.6 });
    R.find({ id: 'pidge', label: 'Inspector Pidge', kind: 'poke', inside: paper, at: [PS.x, PS.y, 1.8], r: 0.8, hint: 'Someone at C13 is reading the same page very slowly.' });

    // ---------- The bar ----------
    // The Holding Pattern: the same man on the same stool since eight, an
    // empty more for every hour, and a goose on the stool next to him that
    // has ordered another.
    const BACK = [[88.2, 95.4], [96.6, 100.4]];
    let bi = 0;
    for (const [x0, x1] of BACK) for (const [a, b] of spans(x0, x1, 2.4)) {
      const seed = bi++;
      R.thing((a + b) / 2, 12.95, (ctx) => {
        box(ctx, a, 12.45, 0, b - a, 0.5, 1.0, C.brown, { lw: 0.03, top: C.wood });
        // (Against the wall: drawn before anyone standing in front of any of it.)
        for (const z of [1.5, 2.15]) box(ctx, a, 12.42, z, b - a, 0.36, 0.06, C.wood, { flat: true, lw: 0.02 });
        for (const px of [a + 0.05, b - 0.1]) box(ctx, px, 12.45, 1.0, 0.05, 0.05, 1.8, C.ink, { flat: true, stroke: false });
        if (!Q.detail) return;
        let r = seed * 31 + 7;
        const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
        for (const z of [1.0, 1.56, 2.21]) {
          for (let x = a + 0.22; x < b - 0.15; x += 0.24 + rnd() * 0.08) {
            if (z > 2 && x > 97.2 && x < 98.0) continue; // (the goose bottle's spot)
            bottle(ctx, x, 12.62, z, [C.green, C.brown, C.mustard, C.red, tint(C.sky, 0.2), C.purple, C.teal][Math.floor(rnd() * 7)], 0.28 + rnd() * 0.18);
          }
        }
      }, { depth: a + 12.6 });
    }
    // Its sign, up over the shelves.
    R.thing(91.8, 12.7, (ctx) => {
      for (const px of [89.0, 94.6]) box(ctx, px, 12.5, 2.8, 0.06, 0.06, 0.5, C.ink, { flat: true, stroke: false });
      box(ctx, 88.6, 12.45, 3.2, 6.4, 0.18, 0.8, C.navy, { lw: 0.035, flat: true });
      words(ctx, 'x', 91.8, 12.64, 3.68, 'THE HOLDING PATTERN', 0.34, INK.signal, { font: 'Bagel Fat One' });
      words(ctx, 'x', 91.8, 12.64, 3.36, 'COCKTAILS · SINCE GATE C11 CLOSED', 0.13, C.white);
    });
    nightGlow(R, 91.8, 13.2, 3.4, 4, INK.signal, 0.4);
    // The TV over the end of the bar: the storm on the radar.
    R.thing(98.6, 12.7, (ctx) => {
      box(ctx, 98.55, 12.5, 2.8, 0.06, 0.06, 0.4, C.ink, { flat: true, stroke: false });
      box(ctx, 97.4, 12.45, 3.15, 2.2, 0.14, 1.2, C.black, { lw: 0.03, flat: true });
    });
    R.thing(98.6, 12.72, (ctx, t) => {
      panel(ctx, 97.5, 99.5, 12.595, 3.25, 4.25, tint(C.green, 0.25), { stroke: false });
      if (!Q.detail) return;
      // The coast, and the nor'easter's swirl coming up it.
      face(ctx, [[97.5, 12.6, 3.25], [98.1, 12.6, 3.25], [98.0, 12.6, 3.7], [98.3, 12.6, 4.25], [97.5, 12.6, 4.25]], tint(C.green, 0.55), { stroke: false });
      const k = Math.min(1, Math.max(0, (hrs(t) - 12) / 6));
      const [X, Y] = P(99.0 - k * 0.6, 12.6, 3.5 + k * 0.4);
      ctx.save(); ctx.translate(X, Y); ctx.transform(1, 0.5, 0, ZK, 0, 0);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(0, 0, 0.12 + i * 0.12, t * 1.5 + i, t * 1.5 + i + 4.4);
        ctx.strokeStyle = [C.red, INK.signal, C.leaf][i]; ctx.lineWidth = 0.07; ctx.stroke();
      }
      ctx.restore();
      words(ctx, 'x', 98.5, 12.61, 3.38, hrs(t) < 15 ? "NOR'EASTER COMING" : "NOR'EASTER HERE", 0.1, C.white);
    }, { anim: true });
    // The decoy, on the top shelf.
    R.thing(97.6, 12.95, (ctx) => gooseBottle(ctx, 97.6, 12.7, 2.21), { depth: 97.6 + 12.95 + 0.05 });
    R.decoy({ id: 'vodka', at: [97.6, 12.8, 2.6], r: 0.7, say: ['A goose on a bottle. Wrong goose.', 'Still a bottle.', 'It is not even a good goose.'] });
    // The bar itself, with a gap at the seam for the bartender.
    for (const [x0, x1] of [[88.2, 95.4], [96.6, 100.4]]) for (const [a, b] of spans(x0, x1, 2.4)) {
      R.thing((a + b) / 2, 14.45, (ctx) => {
        box(ctx, a, 13.55, 0, b - a, 0.9, 1.12, shade(C.wood, 0.15), { lw: 0.035, top: C.brown, dens: 0.15 });
        box(ctx, a - 0.04, 13.5, 1.12, b - a + 0.08, 1.0, 0.08, C.brown, { lw: 0.03, top: tint(C.brown, 0.15), flat: true });
        panel(ctx, a, b, 14.455, 0.18, 0.24, BRASS, { stroke: false });
      });
    }
    // The bartender, polishing, pouring, and bringing the goose another.
    const tender = look(801, 'traveler', { top: C.white, bottom: C.ink, style: 'short', hat: 'none', dress: false });
    const tend = route([[89.4, 13.05, 7], [92.3, 13.05, 5], [94.8, 13.05, 5], [99.2, 13.05, 4]], { speed: 1.1 });
    R.mover(tend, (ctx, t, p) => {
      const pour = !p.moving && Math.abs(p.x - 92.3) < 0.05;
      person(ctx, p.x, p.y, 0, { ...tender, pose: p.moving ? 'walk' : 'stand', dir: p.moving ? p.dir : 'l', back: p.moving && p.back, arms: p.moving ? undefined : pour ? [1.7, 1.2] : [1.0 + Math.sin(t * 5) * 0.3, 0.9] }, t);
    });
    // The stools, and who's on them.
    const STOOLS = [89.0, 90.2, 92.3, 94.6, 97.4, 99.4];
    for (const sx of STOOLS) R.thing(sx, 15.0, (ctx) => stool(ctx, sx, 15.0), { depth: sx + 15.0 - 0.1 });
    // Since eight: a pint, lifted now and then; asleep on the bar by night.
    const regular = look(802, 'traveler', { top: C.green, hat: 'beanie', style: 'short', dress: false });
    R.thing(90.2, 15.0, (ctx, t) => {
      const asleep = CAMP(t);
      const sip = !asleep && pulse(t, 7) > 0.7;
      person(ctx, 90.2, 15.0, 0.08, { ...regular, pose: 'sit', dir: 'r', back: true, arms: asleep ? [1.7, 1.6] : sip ? [2.6, 1.2] : [1.4, 1.2] }, t);
      if (asleep && Q.detail) {
        const k = (t * 0.6) % 1;
        label(ctx, 90.0 - k * 0.3, 14.6 - k * 0.3, 2.6 + k, 'z', 0.4 + k * 0.3, alpha(C.ink, 1 - k));
      }
    }, { anim: true, depth: 90.2 + 15.0 + 0.05 });
    // His empties, one more an hour from eight in the morning.
    for (let i = 0; i < 16; i++) {
      const gx = 88.45 + (i % 8) * 0.23, gy = i < 8 ? 14.2 : 13.85;
      R.thing(gx, gy + 0.4, (ctx) => pint(ctx, gx, gy, 1.2, false), { depth: 88.2 + 14.45 + 0.4 + gx * 0.001, on: (t) => hrs(t) >= 8 + i });
    }
    R.thing(90.3, 14.5, (ctx) => pint(ctx, 90.3, 13.95, 1.2, true), { depth: 90.3 + 14.45 + 0.4 });
    // The goose's drink: a tall one with an umbrella, and the empties.
    R.thing(92.3, 14.5, (ctx) => {
      pint(ctx, 91.9, 13.9, 1.2, false);
      pint(ctx, 92.05, 14.15, 1.2, false);
      box(ctx, 92.38, 13.88, 1.2, 0.16, 0.16, 0.36, C.pink, { flat: true, lw: 0.015 });
      line3(ctx, [92.46, 13.96, 1.5], [92.6, 13.9, 1.82], C.ink, 0.02);
      const [X, Y] = P(92.6, 13.9, 1.84);
      ctx.beginPath(); ctx.moveTo(X - 0.18, Y + 0.03); ctx.quadraticCurveTo(X, Y - 0.16, X + 0.18, Y + 0.03); ctx.closePath();
      paint(ctx, C.mustard, { lw: 0.02 });
    }, { depth: 92.3 + 14.45 + 0.4 });
    R.goose([92.3, 15.0, 0.8], { dir: 'r', pose: 'sit', kind: 'hard', bias: 0.1, hint: 'Final call, and it\'s ordered another.' });
    // Its disguise: a beanie, like everyone else at the bar.
    R.thing(92.3, 15.0, (ctx) => {
      const [X, Y] = P(92.3, 15.0, 0.8);
      ctx.beginPath(); ctx.arc(X + 0.28, Y - 0.85, 0.135, Math.PI, 0); ctx.closePath(); paint(ctx, INK.cranberry, { lw: 0.025 });
      ctx.fillStyle = C.white; ctx.fillRect(X + 0.14, Y - 0.87, 0.28, 0.05);
      ctx.beginPath(); ctx.arc(X + 0.28, Y - 1.0, 0.05, 0, TAU); paint(ctx, C.white, { lw: 0.02 });
    }, { depth: 92.3 + 15.0 + 0.15 });
    stay(R, 94.6, 15.0, look(803, 'traveler', { top: C.red, style: 'bald', arms: [1.3, 1.1] }), { pose: 'sit', dir: 'r', back: true, z: 0.08, depth: 94.6 + 15.05 });
    stay(R, 97.4, 15.0, look(804, 'traveler', { top: C.purple, style: 'long', wear: neckPillow, arms: [1.5, 1.2] }), { pose: 'sit', dir: 'r', back: true, z: 0.08, depth: 97.4 + 15.05 });
    R.thing(99.4, 15.05, (ctx) => {
      face(ctx, [[99.1, 15.0, 0.84], [99.7, 15.0, 0.84], [99.75, 15.0, 0.2], [99.05, 15.0, 0.25]], C.navy, { lw: 0.03 });
    }, { depth: 99.4 + 15.0 + 0.05 });
    // Happy hour, on a chalkboard.
    R.thing(87.4, 15.4, (ctx) => {
      face(ctx, [[86.8, 15.4, 0], [88.0, 15.4, 0], [87.9, 15.4, 1.5], [86.9, 15.4, 1.5]], C.wood, { lw: 0.03 });
      panel(ctx, 87.0, 87.8, 15.41, 0.35, 1.35, C.ink, { stroke: false });
      words(ctx, 'x', 87.4, 15.42, 1.15, 'HAPPY', 0.14, C.white);
      words(ctx, 'x', 87.4, 15.42, 0.95, 'HOUR', 0.14, C.white);
      words(ctx, 'x', 87.4, 15.42, 0.72, '8AM TO', 0.11, INK.signal);
      words(ctx, 'x', 87.4, 15.42, 0.53, 'WHENEVER', 0.11, INK.signal);
    });

    // ---------- C14: the bride ----------
    // Asleep on her suitcase in sweatpants and a tiny veil. Reunited with
    // her dress, she's up, in it.
    const BRIDE = [99.4, 23.9];
    const bride = look(901, 'traveler', { top: tint(C.pink, 0.4), bottom: C.grey, style: 'bun', hair: C.brown, hat: 'none', dress: false });
    const veil = (long) => (ctx, hy) => {
      // Tulle from a comb at the top of her head, falling behind it.
      ctx.beginPath();
      ctx.moveTo(0.0, hy - 0.33); ctx.quadraticCurveTo(-0.62, hy - 0.3, long ? -0.66 : -0.6, long ? hy + 1.2 : hy + 0.42);
      ctx.lineTo(long ? -0.12 : -0.2, long ? hy + 1.05 : hy + 0.3); ctx.quadraticCurveTo(-0.3, hy, 0.0, hy - 0.33); ctx.closePath();
      ctx.fillStyle = alpha(C.white, 0.9); ctx.fill();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.stroke();
      if (Q.detail) { ctx.strokeStyle = alpha(C.grey, 0.8); ctx.beginPath(); ctx.moveTo(-0.2, hy - 0.2); ctx.lineTo(-0.38, hy + 0.3); ctx.stroke(); }
      for (const dx of [-0.08, 0.04, 0.16]) { ctx.beginPath(); ctx.arc(dx, hy - 0.34, 0.045, 0, TAU); paint(ctx, C.white, { lw: 0.018 }); }
    };
    R.thing(BRIDE[0] + 0.9, BRIDE[1] + 0.5, (ctx, t) => {
      const has = R.found('bride');
      bag(ctx, BRIDE[0], BRIDE[1], 0, { kind: 'case', color: C.navy, lie: true, s: 2.2, along: 'x', tag: C.white });
      if (Q.detail) {
        const [X, Y] = P(BRIDE[0] + 0.7, BRIDE[1] + 0.52, 0.32);
        ctx.beginPath(); ctx.rect(X, Y, 0.3, 0.14); paint(ctx, C.white, { lw: 0.015 });
        label(ctx, BRIDE[0] + 0.7 + 0.1, BRIDE[1] + 0.52 - 0.1, 0.24, '12F', 0.09, C.ink, 'Rethink Sans', 'left');
      }
      if (has) {
        // The empty garment bag over the case, and her, up, in the dress.
        face(ctx, [[BRIDE[0] - 0.6, BRIDE[1] - 0.2, 0.62], [BRIDE[0] + 0.5, BRIDE[1] - 0.2, 0.62], [BRIDE[0] + 0.6, BRIDE[1] + 0.55, 0.3], [BRIDE[0] - 0.5, BRIDE[1] + 0.55, 0.3]], C.greyLight, { lw: 0.025 });
        person(ctx, BRIDE[0] + 0.2, BRIDE[1] + 0.65, 0, { ...bride, top: C.white, dress: true, pose: 'wave', dir: 'l', face: veil(true), hold: (c) => {
          for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(0.05 + (i % 2) * 0.1, -0.05 - Math.floor(i / 2) * 0.1, 0.07, 0, TAU); paint(c, [C.pink, C.white, C.coral, C.pink][i], { lw: 0.015 }); }
        } }, t);
      } else {
        lieAlong(ctx, BRIDE[0] + 1.05, BRIDE[1], 0.62, { ...bride, face: (c, hy, back) => { shut(c, hy, back); veil(false)(c, hy, back); } }, t, { pose: 'sleep' });
      }
    }, { anim: true });
    R.find({ id: 'bride', label: 'The bride', kind: 'hard', after: 'apron:dress', at: [BRIDE[0], BRIDE[1], 1.1], r: 0.8, riddle: 'Tag: Something borrowed, seat 12F.', hint: 'Someone by C14 is wearing a tiny veil with sweatpants.' });

    // ---------- C14 after the ground stop ----------
    // A tent, and Friendsgiving on a blanket (clear of the late family's
    // camp at C14, day.js, at 89.6, 24.6).
    R.thing(102.4, 28.0, (ctx) => {
      // A dome tent, its door toward you, feet out of it.
      const [cx, cy] = [101.6, 27.2];
      const [X, Y] = P(cx, cy, 0);
      const rx = 1.3, ry = 0.62, h = 1.45;
      ctx.beginPath(); ctx.ellipse(X, Y, rx, h, 0, Math.PI, 0); ctx.ellipse(X, Y, rx, ry, 0, 0, Math.PI);
      paint(ctx, C.teal, { lw: 0.035, dots: Q.detail ? shade(C.teal, 0.45) : null, density: 0.15 });
      ctx.beginPath(); ctx.ellipse(X + 0.35, Y, rx * 0.55, h * 0.98, 0, Math.PI * 1.02, Math.PI * 1.98);
      ctx.strokeStyle = tint(C.teal, 0.45); ctx.lineWidth = 0.05; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(X - 0.42, Y + 0.32, 0.42, 0.95, 0, Math.PI, 0); ctx.closePath(); paint(ctx, C.ink, { lw: 0.02 });
      for (const dx of [-0.6, -0.3]) { ctx.beginPath(); ctx.ellipse(X + dx, Y + 0.42, 0.12, 0.07, 0, 0, TAU); paint(ctx, C.red, { lw: 0.015 }); }
    }, { on: CAMP });
    R.light({ at: [101.6, 27.2, 0.6], r: 2.2, color: LIT, k: (t) => (CAMP(t) ? 0.55 : 0) });
    R.thing(86.0, 24.9, (ctx) => {
      // Friendsgiving: a picnic blanket, a pie, a supermarket chicken.
      const x0 = 83.6, y0 = 23.3;
      rect(ctx, x0, y0, 2.4, 1.6, 0.01, C.white, { lw: 0.025 });
      if (Q.detail) for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) rect(ctx, x0 + i * 0.4, y0 + j * 0.4, 0.4, 0.4, 0.012, alpha(C.red, 0.75), { stroke: false });
      disc(ctx, x0 + 0.7, y0 + 0.8, 0.03, 0.3, C.woodLight, { lw: 0.02 });
      disc(ctx, x0 + 0.7, y0 + 0.8, 0.05, 0.2, C.brown, { lw: 0.015 });
      const [X, Y] = P(x0 + 1.6, y0 + 0.7, 0.05);
      ctx.beginPath(); ctx.ellipse(X, Y - 0.15, 0.3, 0.2, 0, 0, TAU); paint(ctx, C.brown, { lw: 0.025, dots: Q.detail ? shade(C.brown, 0.4) : null });
      for (const [dx, dy] of [[0.3, 0.3], [1.9, 1.2], [0.4, 1.3]]) disc(ctx, x0 + dx, y0 + dy, 0.02, 0.18, C.white, { lw: 0.015 });
    }, { depth: 83.6 + 23.3 + 0.2, on: CAMP });
    stay(R, 83.2, 24.0, look(960, 'traveler', DOING.donut), { pose: 'sit', dir: 'r', z: -0.4, on: CAMP });
    stay(R, 84.8, 23.1, look(961, 'traveler', DOING.coffee), { pose: 'sit', dir: 'l', z: -0.4, on: CAMP });
    stay(R, 86.4, 24.0, look(962, 'traveler', DOING.arms), { pose: 'sit', dir: 'l', z: -0.4, on: CAMP });
    stay(R, 85.2, 25.4, look(963, 'traveler', { arms: [2.8, -2.6], hold: inHand(2.8, cupHeld) }), { dir: 'r', on: CAMP });
    R.thing(87.5, 23.6, (ctx) => {
      box(ctx, 86.9, 23.0, 0, 0.9, 0.6, 0.55, C.woodLight, { lw: 0.025 });
      words(ctx, 'x', 87.35, 23.61, 0.38, 'FRIENDSGIVING', 0.09, C.ink);
      words(ctx, 'x', 87.35, 23.61, 0.22, 'GATE C14', 0.09, C.red);
    }, { on: CAMP });
    R.light({ at: [84.6, 24.1, 0.8], r: 1.6, color: LIT, k: (t) => (CAMP(t) ? 0.45 + Math.sin(t * 9) * 0.06 : 0) });
    // A kid in a sleeping bag in the aisle, wriggling.
    R.thing(92.6, 20.3, (ctx, t) => {
      const w = Math.sin(t * 1.7) * 0.05;
      const [X, Y] = P(91.9, 20.3, 0.18);
      ctx.save(); ctx.translate(X, Y); ctx.rotate(Math.atan2(0.5, 1) + w);
      ctx.beginPath(); ctx.roundRect(-0.75, -0.24, 1.5, 0.48, 0.24); paint(ctx, C.coral, { lw: 0.035, dots: Q.detail ? C.mustard : null, density: 0.3 });
      ctx.beginPath(); ctx.arc(-0.78, -0.02, 0.2, 0, TAU); paint(ctx, SKIN_SHUT, { lw: 0.03 });
      ctx.beginPath(); ctx.arc(-0.8, -0.1, 0.2, Math.PI * 1.05, Math.PI * 1.95); ctx.fillStyle = C.brown; ctx.fill();
      ctx.restore();
    }, { anim: true, on: CAMP });

    // ---------- Passing through ----------
    // A man in an inflatable turkey costume, waddling up and down between
    // C12 and the band (clear of the Courier's stool at C12).
    const turkeyAt = (t) => {
      const k = pulse(t, 22) * 22;
      const a = 63.8, b = 69.8, L = b - a, v = 0.9, T = L / v, y = 25.3;
      if (k < 3) return { x: a, y, moving: false, dir: 'r' };
      if (k < 3 + T) return { x: a + (k - 3) * v, y, moving: true, dir: 'r' };
      if (k < 6 + T) return { x: b, y, moving: false, dir: 'l' };
      return { x: Math.max(a, b - (k - 6 - T) * v), y, moving: true, dir: 'l' };
    };
    R.mover(turkeyAt, (ctx, t, p) => {
      if (!DAYS(t)) return;
      const f = p.dir === 'l' ? -1 : 1;
      const [X, Y] = P(p.x, p.y, 0);
      const bob = p.moving ? Math.abs(Math.sin(t * 6)) * 0.06 : 0;
      // The tail fan behind him.
      for (let i = 0; i < 5; i++) {
        const a = Math.PI + (i + 0.5) * (Math.PI / 5);
        ctx.beginPath(); ctx.ellipse(X - f * 0.3 + Math.cos(a) * 0.55, Y - 1.4 - bob + Math.sin(a) * 0.55, 0.15, 0.42, a + Math.PI / 2, 0, TAU);
        paint(ctx, [C.brown, C.mustard, C.coral, C.mustard, C.brown][i], { lw: 0.03 });
      }
      person(ctx, p.x, p.y, bob, {
        ...look(972, 'traveler', { bottom: C.navy, hat: 'none', style: 'short' }), pose: p.moving ? 'walk' : 'stand', dir: p.dir, speed: 9, arms: [0.4, 0.3],
        wear: (c, b) => { c.beginPath(); c.ellipse(0.02, b.hipY - 0.35, 0.55, 0.62, 0, 0, TAU); paint(c, C.brown, { lw: 0.04, dots: Q.detail ? shade(C.brown, 0.4) : null, density: 0.2 }); },
        face: (c, hy, back) => {
          // The turkey's own head and wattle, up on a neck over his.
          c.beginPath(); c.moveTo(0.1, hy - 0.2); c.quadraticCurveTo(0.3, hy - 0.6, 0.25, hy - 0.85);
          c.strokeStyle = C.ink; c.lineWidth = 0.17; c.lineCap = 'round'; c.stroke(); c.strokeStyle = tint(C.brown, 0.3); c.lineWidth = 0.1; c.stroke();
          c.beginPath(); c.arc(0.27, hy - 0.9, 0.12, 0, TAU); paint(c, tint(C.brown, 0.3), { lw: 0.025 });
          c.beginPath(); c.moveTo(0.36, hy - 0.92); c.lineTo(0.48, hy - 0.88); c.lineTo(0.36, hy - 0.84); c.fillStyle = C.mustard; c.fill();
          c.beginPath(); c.ellipse(0.38, hy - 0.78, 0.04, 0.09, 0, 0, TAU); c.fillStyle = C.red; c.fill();
        },
      }, t);
    });
    // A kid being a plane, round and round the turkey.
    const zoom = (t) => { const a = (t / 6) * TAU; return { x: 67.4 + Math.cos(a) * 1.6, y: 24.3 + Math.sin(a) * 0.75, dir: -Math.sin(a) * 1.6 - Math.cos(a) * 0.75 >= 0 ? 'r' : 'l', back: -Math.sin(a) * 1.6 + Math.cos(a) * 0.75 < 0 }; };
    R.mover(zoom, (ctx, t, p) => {
      if (!DAYS(t)) return;
      person(ctx, p.x, p.y, 0, { ...look(973, 'traveler', { top: C.sky, hat: 'none' }), pose: 'run', dir: p.dir, back: p.back, scale: 0.62, speed: 12, arms: [1.55, -1.55] }, t);
    });
    // Someone with a case, up and down the aisle between the rows looking
    // for a free seat (every empty one has a coat on it). The airport cart
    // has the lane behind the seats (day.js, y 16.9).
    const walker = (t) => {
      const a = 70.8, b = 95.6, y = 20.25, v = 1.0, T = (b - a) / v, k = pulse(t, 2 * T + 8) * (2 * T + 8);
      if (k < T) return { x: a + k * v, y, moving: true, dir: 'r', back: false };
      if (k < T + 4) return { x: b, y, moving: false, dir: 'l', back: false };
      if (k < 2 * T + 4) return { x: b - (k - T - 4) * v, y, moving: true, dir: 'l', back: true };
      return { x: a, y, moving: false, dir: 'r', back: false };
    };
    R.mover(walker, (ctx, t, p) => { if (DAYS(t)) roller(ctx, p, look(974, 'traveler'), t, { color: BAGS[4] }); });
    // The night cleaner, polishing round the seats at the far end.
    const polish = (t) => {
      const k = pulse(t, 24) * 24, L = 4.4;
      const x = k < 12 ? 97.4 + (k / 12) * L : 97.4 + L - ((k - 12) / 12) * L;
      return { x, y: 20.2 + Math.sin(t * 2) * 0.12, dir: k < 12 ? 'r' : 'l', moving: true };
    };
    R.mover(polish, (ctx, t, p) => {
      const f = p.dir === 'r' ? 1 : -1;
      const mx = p.x + f * 0.8, my = p.y + 0.05;
      const [hx, hy] = P(p.x + f * 0.25, p.y, 1.1);
      const [mX, mY] = P(mx, my, 0.3);
      if (f < 0) { cylinder(ctx, mx, my, 0, 0.32, 0.25, C.grey, { flat: true }); }
      person(ctx, p.x, p.y, 0, { ...look(975, 'traveler', { top: C.teal, bottom: C.navy, hat: 'cap' }), pose: 'walk', dir: p.dir, speed: 3, arms: [0.9, 0.8] }, t);
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(mX, mY); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
      if (f > 0) cylinder(ctx, mx, my, 0, 0.32, 0.25, C.grey, { flat: true });
      if (Q.detail) {
        const [sx, sy] = P(mx, my, 0.02);
        ctx.beginPath(); ctx.ellipse(sx, sy, 0.6 + Math.sin(t * 20) * 0.04, 0.3, 0, 0, TAU);
        ctx.strokeStyle = alpha(C.white, 0.6); ctx.lineWidth = 0.03; ctx.stroke();
      }
    });
  },
};
