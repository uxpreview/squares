// The ending: find all seven geese and the king tide comes in. The clock jumps
// to it (map.js, finale), just after midnight, and the camera goes to the
// turnpike by the drawbridge, where the Courier's van has stopped in the
// middle of the flood (day.js). The geese paddle out to it in a line, round
// it, and sign for the parcel for "G. Goose, Plum Island". It's greenhead fly
// spray. Every King Tide Dave drives past them, windows down (day.js).
//
// The game tells the map how long the lap has been going (fx.parade, seconds;
// 0 before it starts); the sky passes it on here every frame (follow), and the
// Turnpike draws it (swim(R) in its build).
import { C, Q, P, goose, box, face, paint, speech, alpha, tint, shade } from '../../engine/art.js';
import { route } from '../../engine/actors.js';
import { VAN_STUCK, VAN_TOP, scene, courierLook, parcel, walkers } from './day.js';
import { roadZ } from './land.js';
import { level } from './tide.js';
import { who } from './kit.js';

export const finale = { since: 0 };
// The paddle waits for the camera: the game pauses on the last honk, then
// flies to the turnpike (about four seconds).
const LEAD = 3.8;
export function follow(fx) {
  if (!fx.thumb) finale.since = fx.parade > LEAD ? fx.parade - LEAD : 0;
  // The van leaves its driver's seat empty while he's up on the roof.
  scene.finale = finale.since;
}

// Where the van is stuck, and the geese's way out to it: off the island's
// back shore, across the Plum Island River beside the bridge and over the
// flooded marsh, then round and round the van.
export const VAN = VAN_STUCK;
const OUT = [[59.2, 27.4], [58.4, 22.4], [59.4, 18.6]];
const SPEED = 1.6, GAP = 1.4 / SPEED, GEESE = 7;
const out = route(OUT, { speed: SPEED, loop: false });
const OUT_S = (Math.hypot(0.8, 5) + Math.hypot(1, 3.8)) / SPEED; // how long the paddle out takes
const RING = [2.4, 2]; // round the van
const END = OUT[OUT.length - 1];
function swimPath(s) {
  if (s < OUT_S) return out(s);
  // Round the van, counterclockwise from where the paddle out lands.
  const a = Math.atan2((END[1] - VAN[1]) / RING[1], (END[0] - VAN[0]) / RING[0]) + ((s - OUT_S) * SPEED) / RING[0];
  const x = VAN[0] + Math.cos(a) * RING[0], y = VAN[1] + Math.sin(a) * RING[1];
  const vx = -Math.sin(a), vy = Math.cos(a);
  return { x, y, dir: vx - vy >= 0 ? 'r' : 'l', moving: true };
}
const gooseAt = (i) => swimPath(Math.max(0, finale.since - i * GAP));

// The beat, 14 seconds, over and over: he holds the parcel out ("G. Goose?"),
// lowers a clipboard on a string and a goose signs, the lid comes off (spray),
// and he gives it a go.
const BEAT = 14;
const beat = () => finale.since % BEAT;
const SIGN = [4, 6.5], OPEN = [6.5, 10];
// Where he stands on the roof, and where the clipboard hangs, off the van's
// near side, over the water.
const ROOF = roadZ(VAN[0], VAN[1]) + VAN_TOP;
const ME = [VAN[0], VAN[1] - 0.25];
const BOARD = [VAN[0] + 1.35, VAN[1] + 0.1];
// Which goose is nearest the clipboard: it signs.
function signer() {
  let best = 0, d = Infinity;
  for (let i = 0; i < GEESE; i++) {
    if (finale.since < i * GAP) continue;
    const p = gooseAt(i), e = Math.hypot(p.x - BOARD[0], p.y - BOARD[1]);
    if (e < d) { d = e; best = i; }
  }
  return best;
}
// The van's still there (it leaves at 12:50am, whether the geese are done or not).
const vanWalker = walkers.find((w) => w.id === 'van');
const vanHere = (t) => { const p = vanWalker.at(t); return Math.hypot(p.x - VAN[0], p.y - VAN[1]) < 0.1; };

// Ripples round a goose on the water, and its wake.
function ripples(ctx, x, y, L, dir, t, i) {
  if (!Q.lines) return;
  const [X, Y] = P(x, y, L), f = dir === 'l' ? -1 : 1;
  ctx.lineWidth = 0.045;
  for (let k = 0; k < 2; k++) {
    const u = (t * 0.7 + i * 0.13 + k * 0.5) % 1;
    ctx.beginPath();
    ctx.ellipse(X, Y, 0.4 + u * 0.7, (0.4 + u * 0.7) * 0.45, 0, 0, Math.PI * 2);
    ctx.strokeStyle = alpha(C.white, 0.75 * (1 - u));
    ctx.stroke();
  }
  ctx.strokeStyle = alpha(C.white, 0.8);
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  ctx.moveTo(X - f * 0.35, Y - 0.05); ctx.lineTo(X - f * 1.05, Y - 0.28);
  ctx.moveTo(X - f * 0.35, Y + 0.05); ctx.lineTo(X - f * 1.05, Y + 0.3);
  ctx.stroke();
}

// The clipboard, dangling on its string: a sheet with a line to sign, and the
// signature going on as the goose scrawls it (k, 0 to 1).
function clipboard(ctx, hand, t, k) {
  const L = level(t);
  const [X, Y] = P(BOARD[0], BOARD[1], Math.max(L + 0.6, ROOF - 1.2) + Math.sin(t * 2.2) * 0.04);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03;
  ctx.beginPath(); ctx.moveTo(hand[0], hand[1]); ctx.lineTo(X, Y - 0.34); ctx.stroke();
  ctx.save();
  ctx.translate(X, Y);
  ctx.rotate(Math.sin(t * 2.2) * 0.08);
  ctx.scale(1.3, 1.3);
  ctx.beginPath(); ctx.roundRect(-0.24, -0.32, 0.48, 0.62, 0.04); paint(ctx, C.wood, { lw: 0.035 });
  ctx.beginPath(); ctx.rect(-0.19, -0.24, 0.38, 0.48); paint(ctx, C.white, { lw: 0.02 });
  ctx.beginPath(); ctx.rect(-0.08, -0.36, 0.16, 0.08); paint(ctx, C.grey, { lw: 0.02 });
  if (Q.detail) {
    ctx.strokeStyle = alpha(C.ink, 0.35); ctx.lineWidth = 0.02;
    ctx.beginPath();
    for (const yy of [-0.15, -0.08, -0.01]) { ctx.moveTo(-0.13, yy); ctx.lineTo(0.13, yy); }
    ctx.moveTo(-0.14, 0.15); ctx.lineTo(0.14, 0.15);
    ctx.stroke();
    // The signature: a big loop and a flourish, drawn as it's written.
    ctx.strokeStyle = C.navy; ctx.lineWidth = 0.025; ctx.lineCap = 'round';
    ctx.beginPath();
    const n = Math.floor(24 * k);
    for (let j = 0; j <= n; j++) {
      const u = j / 24, sx = -0.13 + u * 0.27, sy = 0.1 - Math.abs(Math.sin(u * Math.PI * 3)) * 0.08 * (1 - u * 0.4);
      j ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// The spray can, plain: green, a white band, GREENHEAD BE GONE close up. In
// the person's own units (or the world's, drawn at a screen point).
function can(g, spray, t) {
  g.beginPath(); g.roundRect(-0.09, -0.36, 0.18, 0.4, 0.04); paint(g, C.green, { lw: 0.03 });
  g.beginPath(); g.rect(-0.09, -0.24, 0.18, 0.13); paint(g, C.white, { lw: 0.02 });
  g.beginPath(); g.rect(-0.04, -0.43, 0.08, 0.07); paint(g, C.greyLight, { lw: 0.02 });
  if (Q.detail && Q.pxPerUnit >= 30) {
    g.save(); g.translate(0, -0.175); g.scale(1 / 40, 1 / 40);
    g.fillStyle = C.green; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '1.6px "Rethink Sans", sans-serif';
    g.fillText('GREENHEAD', 0, -1); g.fillText('BE GONE', 0, 1.2);
    g.restore();
  }
  if (!spray || !Q.detail) return;
  // A puff of it, drifting off.
  g.fillStyle = alpha(C.mint, 0.75);
  g.beginPath();
  for (let i = 0; i < 9; i++) {
    const u = (t * 1.4 + i / 9) % 1, r = 0.05 + u * 0.12;
    const px = 0.08 + u * 0.9, py = -0.44 - u * 0.25 + Math.sin(i * 2.3) * u * 0.25;
    g.moveTo(px + r, py); g.arc(px, py, r, 0, Math.PI * 2);
  }
  g.fill();
}

// The parcel on the roof, a real box: brown card, tape, the label, and the lid
// coming off (k, 0 to 1), with the can rising out of it.
function box3(ctx, x, y, z, k, t, o = {}) {
  const w = 0.62, d = 0.46, hgt = 0.42, card = C.woodLight;
  box(ctx, x - w / 2, y - d / 2, z, w, d, hgt, card, { flat: true, lw: 0.035, left: shade(card, 0.15), right: shade(card, 0.06) });
  if (Q.detail) {
    face(ctx, [[x - 0.2, y + d / 2, z + 0.1], [x + 0.2, y + d / 2, z + 0.1], [x + 0.2, y + d / 2, z + 0.3], [x - 0.2, y + d / 2, z + 0.3]], C.white, { lw: 0.02 });
    if (Q.pxPerUnit >= 26) {
      ctx.save();
      const [X, Y] = P(x, y + d / 2, z + 0.2);
      ctx.translate(X, Y);
      ctx.scale(1 / 40, 1 / 40);
      ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '2.4px "Rethink Sans", sans-serif';
      ctx.fillText('G. GOOSE', 0, -1.3); ctx.fillText('PLUM ISLAND', 0, 1.5);
      ctx.restore();
    }
  }
  if (k > 0 && !o.handed) {
    // The can, rising out of the open box.
    const [X, Y] = P(x, y, z + hgt - 0.3 + Math.min(1, k * 1.6) * 0.6);
    ctx.save(); ctx.translate(X, Y); can(ctx, false, t); ctx.restore();
  }
  // The lid: on, or flipped up and off to the side.
  const lz = k < 1 ? z + hgt + Math.sin(k * Math.PI) * 0.45 - k * hgt : z, lx = x - k * 0.5;
  box(ctx, lx - w / 2 - 0.03, y - d / 2 - 0.03, lz, w + 0.06, d + 0.06, 0.07, tint(card, 0.15), { flat: true, lw: 0.03 });
  if (k > 0.05 && Q.detail) {
    // Ta-da.
    ctx.strokeStyle = C.butter; ctx.lineWidth = 0.05; ctx.lineCap = 'round';
    const [X, Y] = P(x, y, z + hgt + 0.7);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.45, r0 = 0.35 + (t * 3 % 1) * 0.1;
      ctx.moveTo(X + Math.cos(a) * r0, Y + Math.sin(a) * r0); ctx.lineTo(X + Math.cos(a) * (r0 + 0.18), Y + Math.sin(a) * (r0 + 0.18));
    }
    ctx.stroke();
  }
}

export function swim(R) {
  for (let i = 0; i < GEESE; i++) {
    R.mover((t) => {
      if (!finale.since) return { x: -1e4, y: -1e4, out: true };
      return gooseAt(i);
    }, (ctx, t, p) => {
      if (p.out || finale.since < i * GAP) return;
      const L = level(t), k = beat();
      const signing = k >= SIGN[0] && k < SIGN[1] && signer() === i && vanHere(t);
      ripples(ctx, p.x, p.y, L, p.dir, t, i);
      goose(ctx, p.x, p.y, L, t + i * 0.37, { dir: p.dir, pose: signing || Math.sin(finale.since * 3 + i) > 0.8 ? 'honk' : 'swim' });
      if (signing && Q.detail) {
        // A pen in its beak.
        const [X, Y] = P(p.x, p.y, L), f = p.dir === 'l' ? -1 : 1;
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.07; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(X + f * 0.72, Y - 0.62); ctx.lineTo(X + f * 1.02, Y - 0.86); ctx.stroke();
        ctx.strokeStyle = C.coral; ctx.lineWidth = 0.04;
        ctx.beginPath(); ctx.moveTo(X + f * 0.95, Y - 0.8); ctx.lineTo(X + f * 1.02, Y - 0.86); ctx.stroke();
      }
    });
  }
  // The Courier, up on the van's roof, and the whole business of the parcel.
  R.mover(() => (finale.since ? { x: ME[0], y: ME[1] } : { x: -1e4, y: -1e4, out: true }), (ctx, t, p) => {
    if (p.out || !vanHere(t)) return;
    const k = beat(), z = ROOF;
    const holding = k < SIGN[0], signing = k >= SIGN[0] && k < SIGN[1], spraying = k >= OPEN[1];
    let look, pose = 'stand';
    if (holding) { pose = 'carry'; look = { ...courierLook, hold: (g) => parcel(g, {}) }; }
    else if (signing) { pose = 'point'; look = courierLook; }
    else if (spraying) {
      // The can up in his raised hand, and a test squirt.
      const aA = Math.PI - 0.4;
      look = { ...courierLook, arms: [aA, -0.2], hold: (g) => { g.translate(0.15, -0.96); can(g, true, t); } };
    } else { pose = 'cheer'; look = courierLook; }
    who(ctx, p.x, p.y, z, look, null, { pose, dir: 'r' }, t);
    // The parcel on the roof in front of him once it's out of his hands.
    if (!holding) {
      const open = k < OPEN[0] ? 0 : Math.min(1, (k - OPEN[0]) / 1.2);
      box3(ctx, VAN[0] + 0.1, VAN[1] + 0.62, z, spraying ? 1 : open, t, { handed: spraying });
    }
    if (signing) {
      const [X, Y] = P(p.x, p.y, z);
      clipboard(ctx, [X + 0.94, Y - 1.48], t, Math.min(1, (k - SIGN[0]) / 1.8));
    }
    if (!Q.detail || Q.pxPerUnit < 12) return;
    const say = holding ? 'G. Goose?' : signing ? 'Sign here.' : !spraying ? 'Greenhead spray.' : 'Could\'ve used that this afternoon.';
    speech(ctx, p.x, p.y, z + 2.9, say, { size: 0.46 });
  }, { bias: 1 });
}
