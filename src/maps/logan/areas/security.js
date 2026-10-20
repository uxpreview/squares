// Security: the checkpoint, roof off. The queue in its rope maze at the back,
// the grey trays (they stack up all day), the divest table, two X-ray belts
// running forward with their tunnels and screens (the level's hero toy: tap a
// screen and it shows what's in its tunnel right now, a new bag every four
// seconds), the body scanner between them, the sniffer dog, the bin of things
// that aren't coming back, and the bench for putting your shoes (and your
// life) back on.
//
// Running gags. The man in the scanner: hands up since 6am, because the sign
// says WAIT and the officer's stool says BACK IN 5 MIN. His arms droop through
// the day, someone hands him a coffee at two, and by night he has a blanket
// round his shoulders. And the snow globes: confiscated all day into the bin
// (the tally board says DAYS WITHOUT A SNOW GLOBE: 0) while outside the real
// snow starts at three; after dark the officer sits at the glass shaking one,
// watching it come down.
//
// The checkpoint stays lit at night, in its day inks. World units, like
// plan.js (this area sits at the map's corner).
import {
  C, Q, P, box, rect, disc, cylinder, face, paint, person, goose, label, tiles,
  alpha, tint, shade, mix, rng, pick, rigid,
} from '../../../engine/art.js';
import { clamp, pulse, route } from '../../../engine/actors.js';
import { INK, SIGN, BRAND, GLASS, RUBBER } from '../style.js';
import { look, bag, lettering, board, zzz, lieAlong, coatOver, asleep, turkeyMan, TURKEY, lowWall, glassWall, spans, inHand } from '../kit.js';
import { LAND, AIR, CHECK, SEC } from '../plan.js';
import { hour, nightK, LOOP } from '../clock.js';
import { XRAY } from '../day.js';

const TUN0 = 19.6; // where the tunnels start (y)

// What's in each X-ray's tunnel right now: a new bag every four seconds. The
// Courier's parcel rides lane A's belt on the map's clock (day.js draws it),
// and while it's in the tunnel the screen shows what it is (XRAY).
const BAGS = ['SOCKS', 'A LOAF OF BREAD', 'TWELVE SHAMPOOS', 'A TURKEY', 'A SNOW GLOBE', 'ANOTHER TURKEY', 'A TUBA MUTE', 'A SWORD?'];
const nth = (t, lane) => Math.floor(t / 4 + lane * 3);
const mod = (a, n) => ((a % n) + n) % n;
const inTunnel = (t, lane) => {
  const s = mod(t, LOOP);
  if (lane === 0 && s >= XRAY.from && s < XRAY.to) return XRAY.what;
  return BAGS[mod(nth(t, lane), 8)];
};
// Where the parcel is on lane A's belt (y), or null: it goes on at the
// belt's start and waits at its end for the Courier (day.js).
const PARCEL_V = 2.2 / (XRAY.to - XRAY.from), PARCEL_ON = XRAY.from - (TUN0 - 17.9) / PARCEL_V;
function parcelY(t) {
  const s = mod(t, LOOP);
  if (s < PARCEL_ON || s > PARCEL_ON + 12) return null;
  return Math.min(24.3, 17.9 + (s - PARCEL_ON) * PARCEL_V);
}

// ---------- The plan ----------
const X0 = CHECK, X1 = SEC, Y0 = LAND, Y1 = AIR; // 30..52, 12..30
const LANES = [36.4, 45.2]; // each belt's back edge (x); 1.6 wide
const BELT_Z = 0.62; // the rubber's top (the parcel day.js draws rides on it)
const SEG = [[17.4, 19.6], [21.8, 24.6]]; // the belt before and after the tunnel
const TUN = [TUN0, 21.8];
const SPEED = 0.55; // units a second: a bag's four seconds in a 2.2 tunnel
const MON = [{ x: 35.0, lane: 0, id: 'xray-a' }, { x: 48.0, lane: 1, id: 'xray-b' }];
const MON_Y = 20.86; // the screens' face
const SCAN = { x: 42.2, y: 22.2 }; // the man in the scanner
const BIN = [49.4, 22.4, 1.6, 1.4, 1.0];
const PILE = { x: 33.4, y: 28.0 }; // the shoes; the goose at (33.6, 28.2)
const TRAYS = [30.9, 23.85]; // the stack of trays nobody takes back

// ---------- Inks ----------
const FLOOR = mix(C.greyLight, C.grey, 0.3);
const STEEL = mix(C.greyLight, C.white, 0.3);
const STEEL_D = shade(C.grey, 0.25);
const MACHINE = tint(C.grey, 0.45);
// (The belts' RUBBER is the style sheet's, as at check-in and the bag room.)
const TRAY = C.grey;
const BEZEL = mix(C.ink, C.grey, 0.25);

const XR = { bg: C.night, ghost: alpha(C.mint, 0.3), mid: alpha(C.tealLight, 0.55), hi: C.mint, metal: C.white };

// ---------- The clock ----------
// The hour, running past midnight (1am is 25), so the night stays in order.
const hh = (t) => { const h = hour(t); return h < 4 ? h + 24 : h; };
const between = (a, b) => (t) => { const h = hh(t); return h >= a && h < b; };
// The checkpoint's open from 4am; the ground stop at six empties it by a
// quarter past, and after that it's the night shift: asleep.
const DAY = between(4, 18.25);
const NIGHT = (t) => !DAY(t);
// How many are in the queue (the rope maze holds 22).
function crowd(t) {
  const h = hh(t);
  if (h < 5) return 3;
  if (h < 6) return 6;
  if (h < 7) return 11;
  if (h < 10.5) return 22;
  if (h < 12) return 14;
  if (h < 15) return 8;
  if (h < 18.25) return 12;
  return 0;
}

// ---------- Small helpers ----------
const TAU = Math.PI * 2;
// Lettering in the current (already transformed) frame, its middle at (a, b).
function words(ctx, text, a, b, size, color, o = {}) {
  if (!Q.detail) return;
  const k = 40;
  ctx.save();
  ctx.translate(a, b);
  ctx.scale(1 / k, 1 / k);
  const font = o.font || 'Rethink Sans';
  ctx.font = `${o.weight ?? (font === 'Rethink Sans' ? 700 : 400)} ${size * k}px "${font}", system-ui, sans-serif`;
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
// Draw flat on an upright face, its middle at (x, y, z): one facing +y (the
// lower left) or +x (the lower right). In draw, a runs along the face (left
// to right on screen) and b runs down, in screen units.
function onY(ctx, x, y, z, draw) {
  const [X, Y] = P(x, y, z);
  ctx.save(); ctx.transform(1, 0.5, 0, 1, X, Y); draw(ctx); ctx.restore();
}
function onX(ctx, x, y, z, draw) {
  const [X, Y] = P(x, y, z);
  ctx.save(); ctx.transform(1, -0.5, 0, 1, X, Y); draw(ctx); ctx.restore();
}
// Where a standing person's near hand is (screen units), with that arm at a.
function hand(x, y, z, dir, a, s = 1) {
  const [X, Y] = P(x, y, z), f = dir === 'l' ? -1 : 1;
  return [X + f * s * (0.22 + Math.sin(a) * 0.72), Y + s * (-1.53 + Math.cos(a) * 0.72)];
}
// A security officer: the kit's look, with a badge.
const badge = (ctx, b) => {
  if (!Q.detail || b.back) return;
  ctx.beginPath(); ctx.arc(0.1, b.shoulderY + 0.22, 0.06, 0, TAU); paint(ctx, C.butter, { lw: 0.02 });
};
const officer = (seed, extra = {}) => look(seed, 'tsa', { wear: badge, ...extra });
// A shuttle back and forth along a path, pausing at each end. Returns (t) =>
// { x, y, dir, back, moving, out } (out: on the way from the first point).
function shuttle(pts, speed, pause, offset = 0) {
  const segs = [];
  let L = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    segs.push([pts[i - 1], pts[i], L, l]);
    L += l;
  }
  const leg = L / speed + pause, T = 2 * leg;
  return (t) => {
    let s = mod(t + offset, T);
    const out = s < leg;
    if (!out) s -= leg;
    const moving = s >= pause;
    const d = moving ? (s - pause) * speed : 0;
    const dist = out ? d : L - d;
    let sg = segs[segs.length - 1];
    for (const g of segs) if (dist <= g[2] + g[3]) { sg = g; break; }
    const k = sg[3] ? clamp((dist - sg[2]) / sg[3]) : 0;
    const [a, b] = sg;
    const dx = (b[0] - a[0]) * (out ? 1 : -1), dy = (b[1] - a[1]) * (out ? 1 : -1);
    return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, out, moving, dir: dx - dy >= 0 ? 'r' : 'l', back: dx + dy < -0.01 };
  };
}

// ---------- Props ----------
// A stanchion post: a chrome pole on a heavy round foot.
function post(ctx, x, y) {
  disc(ctx, x, y, 0.01, 0.17, STEEL_D, { lw: 0.02 });
  cylinder(ctx, x, y, 0, 0.045, 0.95, STEEL, { flat: true, lw: 0.02 });
  disc(ctx, x, y, 0.97, 0.07, STEEL, { lw: 0.02 });
}
// The belt between two posts: along x at y, or along y at x. A length of one
// (open) has no inked ends, so lengths laid end to end read as one belt.
function strapX(ctx, a, b, y, open = false) {
  face(ctx, [[a, y, 0.76], [b, y, 0.76], [b, y, 0.88], [a, y, 0.88]], INK.cranberry, open ? { stroke: false } : { lw: 0.018 });
  if (!open || !Q.lines) return;
  ctx.beginPath();
  for (const z of [0.76, 0.88]) { const [ax, ay] = P(a, y, z), [bx, by] = P(b, y, z); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.018; ctx.stroke();
}
function strapY(ctx, a, b, x) {
  face(ctx, [[x, a, 0.76], [x, b, 0.76], [x, b, 0.88], [x, a, 0.88]], shade(INK.cranberry, 0.12), { lw: 0.018 });
}
// A grey tray, and what's in it.
function tray(ctx, x, y, z, stuff, s = 1) {
  const w = 0.9 * s, d = 0.64 * s;
  box(ctx, x - w / 2, y - d / 2, z, w, d, 0.11, TRAY, { flat: true, lw: 0.022 });
  rect(ctx, x - w / 2 + 0.06, y - d / 2 + 0.06, w - 0.12, d - 0.12, z + 0.112, shade(TRAY, 0.15), { stroke: false });
  if (stuff) stuff(ctx, x, y, z + 0.115);
}
// Things that go in trays.
const IN_TRAY = [
  // a pair of sneakers
  (ctx, x, y, z) => { for (const k of [-0.13, 0.13]) { box(ctx, x - 0.24, y + k - 0.08, z, 0.48, 0.16, 0.14, C.white, { flat: true, lw: 0.018 }); box(ctx, x - 0.24, y + k - 0.08, z + 0.14, 0.2, 0.16, 0.06, C.coral, { flat: true, lw: 0.015 }); } },
  // a laptop, out of its bag as the sign says
  (ctx, x, y, z) => box(ctx, x - 0.3, y - 0.2, z, 0.6, 0.4, 0.04, C.greyLight, { flat: true, lw: 0.018 }),
  // a puffy coat, folded badly
  (ctx, x, y, z) => { box(ctx, x - 0.32, y - 0.22, z, 0.64, 0.44, 0.2, C.navy, { lw: 0.02, dens: 0.2 }); box(ctx, x - 0.1, y - 0.22, z + 0.2, 0.42, 0.44, 0.08, tint(C.navy, 0.1), { flat: true, lw: 0.018 }); },
  // keys, a phone and a belt
  (ctx, x, y, z) => { box(ctx, x - 0.25, y - 0.12, z, 0.16, 0.26, 0.03, C.ink, { flat: true, lw: 0.015 }); disc(ctx, x + 0.12, y + 0.06, z + 0.01, 0.12, null, { lw: 0.035, stroke: C.brown }); disc(ctx, x + 0.08, y - 0.12, z + 0.01, 0.05, C.mustard, { lw: 0.015 }); },
];
// A shoe, in screen units at (X, Y), turned ang. kind: sneaker, boot or heel.
function shoe(ctx, X, Y, col, ang, kind, s = 1) {
  ctx.save();
  ctx.translate(X, Y); ctx.rotate(ang); ctx.scale(s, s);
  ctx.beginPath();
  if (kind === 'boot') {
    ctx.moveTo(-0.17, 0.06); ctx.lineTo(-0.17, -0.24); ctx.lineTo(-0.03, -0.24); ctx.lineTo(-0.01, -0.07);
    ctx.quadraticCurveTo(0.17, -0.07, 0.19, 0.06); ctx.closePath();
  } else if (kind === 'heel') {
    ctx.moveTo(-0.17, -0.1); ctx.quadraticCurveTo(0.02, -0.04, 0.19, 0.03); ctx.lineTo(0.19, 0.06); ctx.lineTo(-0.1, 0.0);
    ctx.lineTo(-0.13, 0.09); ctx.lineTo(-0.17, 0.09); ctx.closePath();
  } else {
    ctx.moveTo(-0.18, 0.05); ctx.lineTo(-0.17, -0.08); ctx.quadraticCurveTo(-0.05, -0.14, 0.02, -0.06);
    ctx.quadraticCurveTo(0.16, -0.05, 0.19, 0.05); ctx.closePath();
  }
  paint(ctx, col, { lw: 0.022 });
  if (kind !== 'heel' && Q.detail) {
    ctx.beginPath(); ctx.rect(-0.18, 0.025, 0.37, 0.045);
    ctx.fillStyle = kind === 'sneaker' ? C.white : shade(col, 0.45); ctx.fill();
  }
  ctx.restore();
}
// A snow globe, in screen units: a glass ball on a little base, a fir tree
// inside, flakes (swirling while it's shaken: t, or still).
function globe(ctx, X, Y, s, t = null, seed = 1) {
  ctx.save();
  ctx.translate(X, Y); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(-0.13, 0); ctx.lineTo(0.13, 0); ctx.lineTo(0.1, -0.09); ctx.lineTo(-0.1, -0.09); ctx.closePath();
  paint(ctx, seed % 2 ? C.wood : C.red, { lw: 0.02 });
  ctx.beginPath(); ctx.arc(0, -0.22, 0.15, 0, TAU);
  paint(ctx, alpha(tint(C.sky, 0.3), 0.85), { lw: 0.02 });
  ctx.beginPath(); ctx.moveTo(0, -0.31); ctx.lineTo(0.06, -0.14); ctx.lineTo(-0.06, -0.14); ctx.closePath();
  ctx.fillStyle = C.green; ctx.fill();
  if (Q.detail) {
    ctx.fillStyle = C.white;
    for (let i = 0; i < 5; i++) {
      const a = i * 1.7 + seed + (t == null ? 0 : t * 3.1), r = 0.04 + ((i * 37) % 9) / 90;
      ctx.beginPath(); ctx.arc(Math.cos(a) * r, -0.22 + Math.sin(a * 1.3) * r, 0.018, 0, TAU); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(-0.05, -0.27, 0.035, 0, TAU); ctx.fillStyle = alpha(C.white, 0.7); ctx.fill();
  }
  ctx.restore();
}
// A little bottle standing at (X, Y) in screen units (a shampoo, the hot
// sauce): a body with a label, a neck, a cap. h: its body's height.
function bottle(ctx, X, Y, body, label, cap, s = 1, h = 0.2) {
  ctx.save();
  ctx.translate(X, Y); ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(-0.05, 0); ctx.lineTo(-0.05, -h); ctx.quadraticCurveTo(-0.05, -h - 0.05, -0.02, -h - 0.06);
  ctx.lineTo(-0.02, -h - 0.09); ctx.lineTo(0.02, -h - 0.09); ctx.lineTo(0.02, -h - 0.06);
  ctx.quadraticCurveTo(0.05, -h - 0.05, 0.05, -h); ctx.lineTo(0.05, 0); ctx.closePath();
  paint(ctx, body, { lw: 0.014 });
  if (label) { ctx.beginPath(); ctx.rect(-0.05, -h * 0.75, 0.1, h * 0.45); paint(ctx, label, { lw: 0.01 }); }
  ctx.beginPath(); ctx.rect(-0.03, -h - 0.15, 0.06, 0.06); paint(ctx, cap, { lw: 0.012 });
  ctx.restore();
}
// The goose's foot, sticking out of something: orange, webbed.
function gooseFoot(ctx, X, Y, t) {
  // (now and then it flexes its toes)
  const flex = Math.max(0, Math.sin(t * 2.3)) > 0.9 ? 0.14 : 0;
  ctx.save();
  ctx.translate(X, Y); ctx.rotate(-flex * 0.5); ctx.scale(1.3, 1.3);
  // the leg, out of the heap
  ctx.beginPath(); ctx.moveTo(-0.22, -0.1); ctx.lineTo(0.0, 0.0);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.lineCap = 'round'; ctx.stroke();
  ctx.strokeStyle = C.coral; ctx.lineWidth = 0.055; ctx.stroke();
  // three toes, webbed between, splayed
  const tips = [[0.3, -0.13 - flex * 0.3], [0.36, 0.02], [0.27, 0.16 + flex * 0.3]];
  ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.lineTo(...tips[0]);
  ctx.quadraticCurveTo(0.24, -0.04, tips[1][0], tips[1][1]);
  ctx.quadraticCurveTo(0.24, 0.07, tips[2][0], tips[2][1]);
  ctx.closePath();
  paint(ctx, C.coral, { lw: 0.03 });
  ctx.beginPath(); for (const [a, b] of tips) { ctx.moveTo(0.02, 0); ctx.lineTo(a * 0.95, b * 0.95); }
  ctx.strokeStyle = shade(C.coral, 0.4); ctx.lineWidth = 0.022; ctx.stroke();
  ctx.fillStyle = C.ink;
  for (const [a, b] of tips) { ctx.beginPath(); ctx.arc(a, b, 0.022, 0, TAU); ctx.fill(); }
  ctx.restore();
}

// ---------- The X-ray pictures ----------
// What's on a screen: the bag's ghost and the thing inside it as a blue-green
// negative, in a frame a by b around (0, 0) (w wide, h tall).
function xrayThing(ctx, name, t) {
  const fill = (c = XR.mid) => { ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = XR.hi; ctx.lineWidth = 0.018; ctx.stroke(); };
  const dot = (x, y, r, c = XR.metal) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = c; ctx.fill(); };
  ctx.beginPath();
  switch (name) {
    case 'SOCKS':
      for (const [x, s] of [[-0.14, 1], [0.12, -1]]) {
        ctx.beginPath();
        ctx.moveTo(x - 0.06, -0.2); ctx.lineTo(x + 0.06, -0.2); ctx.lineTo(x + 0.06, 0.02);
        ctx.quadraticCurveTo(x + 0.06 + 0.16 * s, 0.03, x + 0.07 + 0.17 * s, 0.1);
        ctx.lineTo(x - 0.06, 0.1); ctx.closePath();
        fill();
      }
      break;
    case 'A LOAF OF BREAD':
      ctx.moveTo(-0.3, 0.12); ctx.lineTo(-0.3, -0.04); ctx.quadraticCurveTo(-0.28, -0.17, -0.12, -0.16);
      ctx.quadraticCurveTo(0, -0.22, 0.12, -0.16); ctx.quadraticCurveTo(0.28, -0.17, 0.3, -0.04); ctx.lineTo(0.3, 0.12); ctx.closePath();
      fill();
      ctx.strokeStyle = alpha(C.white, 0.5); ctx.lineWidth = 0.012;
      ctx.beginPath(); for (let x = -0.2; x < 0.25; x += 0.08) { ctx.moveTo(x, -0.14); ctx.lineTo(x - 0.03, 0.12); } ctx.stroke();
      // the parcel's string, both ways
      ctx.strokeStyle = XR.metal; ctx.lineWidth = 0.014;
      ctx.beginPath(); ctx.moveTo(-0.36, -0.02); ctx.lineTo(0.36, -0.02); ctx.moveTo(0.02, -0.24); ctx.lineTo(0.02, 0.16); ctx.stroke();
      break;
    case 'TWELVE SHAMPOOS':
      for (let i = 0; i < 12; i++) {
        const x = -0.27 + (i % 4) * 0.18, y = -0.17 + Math.floor(i / 4) * 0.13;
        ctx.beginPath(); ctx.roundRect(x - 0.05, y - 0.03, 0.1, 0.11, 0.025); fill();
        dot(x, y - 0.05, 0.022);
      }
      break;
    case 'A TURKEY':
    case 'ANOTHER TURKEY': {
      const m = name === 'A TURKEY' ? 1 : -1;
      ctx.save(); ctx.scale(m, 1);
      // the drumsticks, bones and all
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.ellipse(s * 0.2, -0.13, 0.11, 0.07, s * -0.7, 0, TAU); fill();
        dot(s * 0.29, -0.21, 0.035); dot(s * 0.32, -0.18, 0.035);
      }
      ctx.beginPath(); ctx.ellipse(0, 0.02, 0.3, 0.17, 0, 0, TAU); fill(alpha(C.tealLight, 0.7));
      ctx.strokeStyle = alpha(C.white, 0.6); ctx.lineWidth = 0.014;
      ctx.beginPath();
      for (const r of [0.08, 0.14, 0.2]) { ctx.moveTo(-r, 0.02); ctx.quadraticCurveTo(0, -0.12 + r * 0.2, r, 0.02); }
      ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-0.22, 0.06, 0.08, 0.05, 0.5, 0, TAU); fill();
      ctx.restore();
      break;
    }
    case 'A SNOW GLOBE':
      ctx.moveTo(-0.14, 0.15); ctx.lineTo(0.14, 0.15); ctx.lineTo(0.11, 0.06); ctx.lineTo(-0.11, 0.06); ctx.closePath(); fill();
      ctx.beginPath(); ctx.arc(0, -0.07, 0.15, 0, TAU); fill(alpha(C.tealLight, 0.3));
      ctx.beginPath(); ctx.moveTo(0, -0.16); ctx.lineTo(0.06, 0.0); ctx.lineTo(-0.06, 0.0); ctx.closePath(); fill(alpha(C.mint, 0.7));
      for (let i = 0; i < 6; i++) { const a = i * 1.1 + t * 2.4; dot(Math.cos(a) * 0.1, -0.07 + Math.sin(a * 1.3) * 0.09, 0.012); }
      break;
    case 'A TUBA MUTE':
      ctx.moveTo(-0.04, -0.2); ctx.lineTo(0.04, -0.2); ctx.quadraticCurveTo(0.06, -0.02, 0.17, 0.08);
      ctx.quadraticCurveTo(0.17, 0.16, 0, 0.16); ctx.quadraticCurveTo(-0.17, 0.16, -0.17, 0.08);
      ctx.quadraticCurveTo(-0.06, -0.02, -0.04, -0.2); fill();
      ctx.beginPath(); ctx.rect(-0.09, -0.04, 0.18, 0.03); ctx.fillStyle = XR.metal; ctx.fill();
      break;
    case 'A SWORD?':
      ctx.save(); ctx.rotate(-0.5);
      ctx.beginPath(); ctx.moveTo(-0.36, 0); ctx.lineTo(0.18, -0.025); ctx.lineTo(0.18, 0.025); ctx.closePath(); fill(XR.metal);
      ctx.beginPath(); ctx.rect(0.17, -0.09, 0.035, 0.18); fill(XR.metal);
      ctx.beginPath(); ctx.rect(0.2, -0.02, 0.12, 0.04); fill();
      dot(0.34, 0, 0.03);
      ctx.restore();
      break;
    case 'JUST THE STUFFING':
      // where the turkey was, and what's left of it
      ctx.setLineDash([0.03, 0.03]);
      ctx.beginPath(); ctx.ellipse(0, 0.02, 0.3, 0.17, 0, 0, TAU); ctx.strokeStyle = XR.ghost; ctx.lineWidth = 0.016; ctx.stroke();
      ctx.setLineDash([]);
      for (let i = 0; i < 14; i++) dot(-0.15 + ((i * 37) % 30) / 100, -0.06 + ((i * 53) % 16) / 100, 0.025, XR.mid);
      break;
    case 'A GRAVY BOAT':
      ctx.moveTo(-0.26, -0.04); ctx.quadraticCurveTo(-0.1, 0.16, 0.16, 0.06); ctx.lineTo(0.3, -0.08); ctx.lineTo(0.16, -0.04); ctx.lineTo(-0.26, -0.04); fill();
      ctx.beginPath(); ctx.arc(-0.28, 0.02, 0.06, -1.5, 1.5); ctx.strokeStyle = XR.hi; ctx.lineWidth = 0.02; ctx.stroke();
      break;
    default:
  }
}
// A whole screen, w by h: the bag's ghost, the thing, a caption.
function xrayScreen(ctx, name, w, h, t, lane) {
  ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.fillStyle = XR.bg; ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.clip();
  // The bag: its outline, its handle and its wheels.
  ctx.beginPath(); ctx.roundRect(-w * 0.37, -h * 0.33, w * 0.74, h * 0.6, 0.06);
  ctx.fillStyle = alpha(C.teal, 0.22); ctx.fill();
  ctx.strokeStyle = XR.ghost; ctx.lineWidth = 0.02; ctx.stroke();
  ctx.beginPath(); ctx.rect(-0.08, -h * 0.33 - 0.07, 0.16, 0.07); ctx.stroke();
  ctx.save(); ctx.translate(0, -h * 0.03); ctx.scale(w / 1.3, w / 1.3); xrayThing(ctx, name, t); ctx.restore();
  if (Q.detail) {
    // the scan lines
    ctx.fillStyle = alpha(C.mint, 0.06);
    for (let y = -h / 2; y < h / 2; y += 0.06) ctx.fillRect(-w / 2, y, w, 0.025);
  }
  ctx.restore();
  words(ctx, name, 0, h * 0.39, 0.115, XR.hi);
  words(ctx, `LANE ${lane + 1}`, -w / 2 + 0.06, -h / 2 + 0.07, 0.065, alpha(C.mint, 0.7), { align: 'left' });
}

// ---------- The scanner's man ----------
// Hands up since six: his arms droop through the day; from two he's holding a
// coffee someone gave him; from seven a blanket; asleep on his feet after
// eleven, until the morning shift, when up they go again.
function scanArms(t) {
  const h = hh(t);
  if (h >= 6 && h < 19) {
    const k = clamp((h - 6) / 13);
    return Math.PI - 0.25 - k * 0.75 + Math.sin(t * 9) * 0.03 * k;
  }
  // the night: still up, just, swaying as he dozes
  return 2.0 + Math.sin(t * 0.8) * 0.05;
}
const MAN = { ...look(130, 'traveler', { top: C.teal, bottom: C.navy, hair: C.greyLight, style: 'bald', dress: false }), hat: undefined, shoes: C.white };
function scanMan(ctx, t) {
  const a = scanArms(t), h = hh(t), cold = h >= 19 || h < 6;
  const { x, y } = SCAN;
  person(ctx, x, y, 0, {
    ...MAN, pose: 'stand', dir: 'l', arms: [a, -a],
    wear: cold ? (c, b) => {
      // the blanket round his shoulders, plaid
      c.beginPath();
      c.moveTo(-0.38, b.shoulderY - 0.06); c.lineTo(0.38, b.shoulderY - 0.06); c.lineTo(0.46, b.hipY + 0.16); c.lineTo(-0.46, b.hipY + 0.16); c.closePath();
      paint(c, INK.cranberry, { lw: 0.03 });
      if (Q.detail) {
        c.strokeStyle = alpha(C.navy, 0.7); c.lineWidth = 0.05;
        c.beginPath();
        for (const u of [-0.24, 0.0, 0.24]) { c.moveTo(u, b.shoulderY - 0.05); c.lineTo(u * 1.2, b.hipY + 0.15); }
        for (const v of [0.25, 0.55]) { c.moveTo(-0.42, b.shoulderY + v); c.lineTo(0.42, b.shoulderY + v); }
        c.stroke();
      }
    } : null,
  }, 0);
  // The coffee in his raised hand, from two till the blanket.
  if (h >= 14 && h < 19) {
    const [hx, hy] = hand(x, y, 0, 'l', a);
    ctx.beginPath(); ctx.moveTo(hx - 0.09, hy - 0.26); ctx.lineTo(hx + 0.09, hy - 0.26); ctx.lineTo(hx + 0.07, hy - 0.04); ctx.lineTo(hx - 0.07, hy - 0.04); ctx.closePath();
    paint(ctx, C.white, { lw: 0.02 });
    ctx.beginPath(); ctx.rect(hx - 0.08, hy - 0.19, 0.16, 0.07); ctx.fillStyle = C.brown; ctx.fill();
  }
  if (h >= 23 || h < 5.5) zzz(ctx, x, y, 2.5, t);
}

// ---------- The dog ----------
// A beagle in a sniffer's vest, in screen units at (x, y, z). pose: walk,
// sniff, sit, sleep (on its back, legs in the air).
function dog(ctx, x, y, z, t, o = {}) {
  const [X, Y] = P(x, y, z);
  const f = o.dir === 'l' ? -1 : 1, pose = o.pose || 'stand';
  ctx.save();
  ctx.translate(X, Y); ctx.scale(f, 1);
  if (Q.detail) { ctx.beginPath(); ctx.ellipse(0, 0, 0.42, 0.13, 0, 0, TAU); ctx.fillStyle = alpha(C.ink, 0.16); ctx.fill(); }
  ctx.lineCap = 'round';
  const leg = (x0, y0, x1, y1) => {
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.11; ctx.stroke();
    ctx.strokeStyle = C.white; ctx.lineWidth = 0.06; ctx.stroke();
  };
  if (pose === 'sleep') {
    for (const [lx, d] of [[-0.2, -0.1], [-0.08, 0.06], [0.12, -0.06], [0.22, 0.08]]) leg(lx, -0.2, lx + d, -0.42 + Math.sin(t * 2 + lx * 9) * 0.015);
    ctx.beginPath(); ctx.ellipse(0, -0.16, 0.34, 0.14, 0, 0, TAU); paint(ctx, C.white, { lw: 0.03 });
    ctx.beginPath(); ctx.ellipse(0.02, -0.22, 0.16, 0.06, 0, 0, TAU); ctx.fillStyle = C.blush; ctx.fill();
    ctx.beginPath(); ctx.arc(0.38, -0.12, 0.13, 0, TAU); paint(ctx, C.wood, { lw: 0.03 });
    ctx.beginPath(); ctx.ellipse(0.4, -0.01, 0.07, 0.12, 0.3, 0, TAU); paint(ctx, C.brown, { lw: 0.025 });
    ctx.beginPath(); ctx.ellipse(0.47, -0.18, 0.04, 0.05, 0, 0, TAU); ctx.fillStyle = C.pink; ctx.fill();
    ctx.restore();
    return;
  }
  const sw = pose === 'walk' ? Math.sin(t * 11) * 0.09 : 0;
  const sit = pose === 'sit';
  // legs
  if (sit) { leg(-0.16, -0.2, -0.24, -0.02); leg(0.18, -0.34, 0.2, 0); leg(0.26, -0.34, 0.28, 0); }
  else for (const [lx, s] of [[-0.2, 1], [-0.12, -1], [0.16, -1], [0.24, 1]]) leg(lx, -0.34, lx + sw * s, 0);
  // tail, wagging
  const wag = Math.sin(t * (pose === 'sniff' ? 16 : 9)) * 0.35;
  ctx.beginPath(); ctx.moveTo(-0.3, sit ? -0.28 : -0.44); ctx.quadraticCurveTo(-0.42, sit ? -0.42 : -0.6, -0.38 + wag * 0.2, sit ? -0.56 : -0.74);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.09; ctx.stroke(); ctx.strokeStyle = C.white; ctx.lineWidth = 0.05; ctx.stroke();
  // body, with the saddle and the vest
  ctx.save();
  if (sit) { ctx.translate(-0.04, 0.04); ctx.rotate(-0.5); }
  ctx.beginPath(); ctx.ellipse(0, -0.44, 0.33, 0.15, 0, 0, TAU); paint(ctx, C.white, { lw: 0.03 });
  ctx.beginPath(); ctx.ellipse(-0.08, -0.52, 0.2, 0.08, 0, 0, TAU); ctx.fillStyle = C.wood; ctx.fill();
  ctx.beginPath(); ctx.roundRect(-0.06, -0.59, 0.2, 0.26, 0.05); paint(ctx, C.navy, { lw: 0.02 });
  if (Q.detail) { ctx.beginPath(); ctx.rect(-0.03, -0.5, 0.14, 0.05); ctx.fillStyle = INK.signal; ctx.fill(); }
  ctx.restore();
  // head: down at the floor when sniffing
  const sniff = pose === 'sniff' ? Math.sin(t * 14) * 0.02 : 0;
  const [hx, hy] = pose === 'sniff' ? [0.42, -0.2 + sniff] : sit ? [0.3, -0.78] : [0.38, -0.62];
  ctx.beginPath(); ctx.ellipse(hx + 0.1, hy + 0.04, 0.1, 0.07, 0, 0, TAU); paint(ctx, C.white, { lw: 0.025 });
  ctx.beginPath(); ctx.arc(hx, hy, 0.12, 0, TAU); paint(ctx, C.wood, { lw: 0.03 });
  ctx.beginPath(); ctx.arc(hx + 0.19, hy + 0.03, 0.03, 0, TAU); ctx.fillStyle = C.ink; ctx.fill();
  ctx.beginPath(); ctx.ellipse(hx - 0.06, hy + 0.08, 0.06, 0.12, 0.25, 0, TAU); paint(ctx, C.brown, { lw: 0.022 });
  ctx.beginPath(); ctx.arc(hx + 0.05, hy - 0.03, 0.022, 0, TAU); ctx.fillStyle = C.ink; ctx.fill();
  ctx.restore();
}

// ---------- The queue ----------
// The rope maze: three lanes snaking from check-in's side (lane 1, along the
// wall) to the ID desk at the end of lane 3. Each slot fills as the queue
// grows, front first.
const LANE_Y = [13.1, 14.15, 15.15];
const ROPES = [
  // [y, posts]: each rope's posts along x (the gaps are the turns)
  [13.6, [30.7, 32.0, 34, 36, 38, 40, 42, 44, 46, 47.8]],
  [14.65, [32.6, 34.6, 36.6, 38.6, 40.6, 42.6, 44.6, 46.6, 48.0, 50.4]],
  [15.65, [30.7, 32.0, 34, 36, 38, 40.3]],
];
const SLOTS = [
  [39.2, 2], [37.3, 2], [35.4, 2], [33.5, 2],
  [33.9, 1], [35.8, 1], [37.7, 1], [39.6, 1], [41.5, 1], [43.4, 1], [45.3, 1], [47.2, 1],
  [48.0, 0], [46.2, 0], [44.3, 0], [42.4, 0], [40.5, 0], [38.6, 0], [36.7, 0], [34.9, 0], [33.0, 0], [31.2, 0],
];

export default {
  id: 'security',
  name: 'Security',
  blurb: 'Shoes off, laptops out, turkeys on the X-ray. One man has had his hands up since six, and nobody has told him he can go.',
  describe: 'A security checkpoint with its roof off: a queue in a rope maze, grey trays piling up, two X-ray belts, a body scanner, a sniffer dog, a bench for shoes and a bin of confiscated snow globes. The queue thins at dusk, and by night the checkpoint is asleep.',

  build(R) {
    // Grandma's turkey goes home once she's found (check-in): the screen
    // can show a turkey no more, just what she left behind.
    const homeTurkey = () => R.found('check-in:grandma');
    const shown = (t, lane) => {
      const name = inTunnel(t, lane);
      if (lane === 0 && homeTurkey()) {
        if (name === 'A TURKEY') return 'JUST THE STUFFING';
        if (name === 'ANOTHER TURKEY') return 'A GRAVY BOAT';
      }
      return name;
    };

    // ---------- The floor ----------
    R.floor((ctx) => {
      rect(ctx, X0, Y0, X1 - X0, Y1 - Y0, 0, FLOOR, { stroke: false });
      if (!Q.detail) return;
      // Big vinyl tiles, every other one a shade off, and the grout.
      for (let x = X0; x < X1; x += 2) for (let y = Y0; y < Y1; y += 2) if (((x - X0) / 2 + (y - Y0) / 2) % 2) rect(ctx, x, y, 2, 2, 0, alpha(C.ink, 0.04), { stroke: false });
      tiles(ctx, 1, alpha(C.ink, 0.06), 0.02, X0, Y0, X1 - X0, Y1 - Y0);
    });
    R.rug((ctx) => {
      // Soft shadows under the machines and the bench.
      for (const x0 of LANES) rect(ctx, x0 - 0.45, TUN[0] - 0.1, 2.5, 2.5, 0.004, alpha(C.ink, 0.12), { stroke: false });
      rect(ctx, 30.9, 26.1, 4.6, 1.3, 0.004, alpha(C.ink, 0.1), { stroke: false });
      // The scanner's mat, its footprints, and where to wait for it.
      rect(ctx, 40.5, 20.4, 3.4, 3.6, 0.005, mix(INK.tarmac, C.ink, 0.2), { stroke: false });
      rect(ctx, 40.65, 20.55, 3.1, 3.3, 0.006, mix(INK.tarmac, C.grey, 0.25), { stroke: false });
      for (const [fx, fy] of [[41.85, 22.0], [42.45, 22.4], [41.85, 20.9], [42.45, 21.1]]) {
        rect(ctx, fx - 0.12, fy - 0.2, 0.24, 0.4, 0.008, INK.signal, { stroke: false });
      }
      rect(ctx, 40.5, 19.6, 3.4, 0.14, 0.006, INK.signal, { stroke: false });
      // The point of no return.
      rect(ctx, X0 + 0.4, 25.0, X1 - X0 - 0.8, 0.16, 0.006, INK.signal, { stroke: false });
      // Arrows down the queue's lanes.
      if (Q.detail) {
        const arrow = (x, y, d) => face(ctx, [[x - 0.25 * d, y - 0.22, 0.007], [x + 0.25 * d, y, 0.007], [x - 0.25 * d, y + 0.22, 0.007]], alpha(C.ink, 0.18), { stroke: false });
        for (const x of [32.1, 41.5, 49.0]) arrow(x, LANE_Y[0], 1);
        for (const x of [49.3, 32.2]) arrow(x, LANE_Y[1], -1);
        arrow(31.8, LANE_Y[2], 1);
      }
    });
    R.rug((ctx) => {
      ctx.save();
      paintText(ctx, 42.6, 25.6, 'POINT OF NO RETURN', 0.42, alpha(shade(INK.signal, 0.35), 0.85));
      paintText(ctx, 42.2, 19.3, 'WAIT HERE', 0.3, alpha(C.ink, 0.45));
      ctx.restore();
    });

    // ---------- The walls ----------
    // The terminal's landside wall along the back, waist high (no doors here:
    // the queue comes in from check-in), and the airside glass along the
    // front, the apron and its de-icers through it: the kit's, the same from
    // check-in to the gates.
    lowWall(R, X0, X1, Y0);
    glassWall(R, X0, X1, Y1);

    // ---------- The queue ----------
    // The ropes, in short lengths each sorted at its middle, and the posts on
    // their own spots, so the queue sorts round them: whoever stands in front
    // of a rope is drawn after it, whoever's behind before. (Sorted at the
    // far end of a whole length between two posts, a rope and a post behind
    // someone were painted across them.)
    ROPES.forEach(([y, xs]) => {
      for (let i = 1; i < xs.length; i++) {
        for (const [a, b] of spans(xs[i - 1], xs[i], 0.8)) R.thing((a + b) / 2, y, (ctx) => strapX(ctx, a, b, y, true));
      }
      for (const x of xs) R.thing(x, y, (ctx) => post(ctx, x, y));
    });
    // The ends of the maze: closed at the far end, open at check-in's.
    R.thing(50.4, 14.65, (ctx) => { strapY(ctx, Y0 + 0.5, 14.65, 50.4); post(ctx, 50.4, Y0 + 0.5); });
    R.thing(30.7, 15.65, (ctx) => strapY(ctx, 13.6, 15.65, 30.7));
    // Who's in it, by the hour (still, so a crowd is cheap). Each one is drawn
    // with the rope in front of their knees, so it never slips behind them.
    SLOTS.forEach(([x, lane], i) => {
      const y = LANE_Y[lane], dir = lane === 1 ? 'l' : 'r', back = lane === 1;
      const on = (t) => crowd(t) > i;
      const [ry, rxs] = ROPES[lane];
      const rope = (ctx) => strapX(ctx, Math.max(rxs[0], x - 0.62), Math.min(rxs[rxs.length - 1], x + 0.62), ry, true);
      if (i === 6) {
        // The man in the inflatable turkey, from ten till half past eleven
        // (check-in's queue before, the gates after: kit.js, TURKEY), seen
        // from behind: the fan of feathers, the turkey's head up over his.
        const his = (t) => on(t) && between(...TURKEY.security)(t);
        R.thing(x, y, (ctx) => { turkeyMan(ctx, x, y, 0, { dir, back }); rope(ctx); }, { on: his });
        R.thing(x, y, (ctx) => { person(ctx, x, y, 0, { ...look(206), pose: 'stand', dir, back }, 0); rope(ctx); }, { on: (t) => on(t) && !his(t) });
        return;
      }
      let lk = look(200 + i * 3), extra = {}, kit = null;
      if (i >= 13 && i <= 15) {
        // a family in matching sweatshirts
        lk = look(240 + i, 'traveler', { top: INK.cranberry, hat: 'beanie', dress: false });
        if (i === 14) extra = { scale: 0.7 };
      }
      if (i === 3) kit = { kind: 'duffel', color: C.teal }; // laundry going home
      else if (i === 9) extra = { pose: 'carry', hold: (c) => { c.beginPath(); c.ellipse(0.12, 0.05, 0.3, 0.09, 0, 0, TAU); paint(c, C.wood, { lw: 0.025 }); c.beginPath(); c.ellipse(0.12, 0.0, 0.26, 0.06, 0, 0, TAU); paint(c, C.mustard, { lw: 0.02 }); } }; // a pie
      else if (i === 11) extra = { pose: 'read' }; // on the phone
      else if (i % 3 === 0) kit = { kind: 'case', color: pick(rng(i), [C.ink, C.navy, C.black, C.purple, C.teal]) };
      R.thing(x, y, (ctx) => {
        if (kit) bag(ctx, x + (dir === 'l' ? -0.5 : 0.5), y + 0.12, 0, { handle: kit.kind === 'case', tag: C.white, ...kit });
        person(ctx, x, y, 0, { ...lk, pose: 'stand', dir, back, ...extra }, 0);
        rope(ctx);
      }, { on });
    });
    // After the ground stop, one man is still in line, asleep on his case.
    R.thing(39.2, 15.15, (ctx) => {
      bag(ctx, 39.2, 15.2, 0, { kind: 'case', color: C.mustard, tag: C.white });
      person(ctx, 39.15, 15.15, -0.05, { ...look(233), pose: 'sit', dir: 'r', arms: [0.4, 0.2] }, 0);
      strapX(ctx, 38.55, 39.8, ROPES[2][0], true);
    }, { on: NIGHT });
    R.air((ctx, t) => { if (NIGHT(t)) zzz(ctx, 39.3, 15.1, 1.9, t + 1.3); }, { on: NIGHT });

    // The wait, from here: a sign over the maze's door, by the hour.
    const WAITS = [[4, 6, '5 MIN'], [6, 7, '40 MIN'], [7, 10.5, '2 HOURS'], [10.5, 12, '1 HOUR'], [12, 15, '30 MIN'], [15, 18.25, '90 MIN'], [18.25, 28.1, 'UNTIL SPRING']];
    for (const [a, b, wait] of WAITS) {
      R.thing(35.4, 12.7, (ctx) => {
        for (const e of [32.7, 34.5]) box(ctx, e - 0.02, 12.68, 3.95, 0.04, 0.04, 1.3, C.ink, { flat: true, stroke: false });
        board(ctx, 'x', 33.6, 12.7, 3.55, 3.2, 0.95, [['WAIT FROM HERE', 0.22], [wait, 0.36, null, 'Bagel Fat One']], { even: true });
      }, { on: between(a, b) });
    }

    // The ID desk at the end of the maze: a lectern, its blacklight, and the
    // officer reading every boarding pass like a ransom note.
    R.thing(41.1, 15.45, (ctx) => {
      box(ctx, 40.5, 14.85, 0, 0.6, 0.6, 1.0, MACHINE, { lw: 0.03 });
      face(ctx, [[40.45, 14.8, 1.0], [41.15, 14.8, 1.0], [41.15, 15.5, 1.18], [40.45, 15.5, 1.18]], BEZEL, { lw: 0.025 });
      box(ctx, 40.6, 14.9, 1.1, 0.25, 0.2, 0.14, C.purple, { flat: true, lw: 0.02 });
    });
    R.thing(41.75, 15.2, (ctx) => person(ctx, 41.75, 15.2, 0, {
      ...officer(140), pose: 'read', dir: 'l',
      hold: (c) => { c.beginPath(); c.rect(-0.05, -0.22, 0.3, 0.2); paint(c, C.white, { lw: 0.02 }); c.beginPath(); c.arc(0.02, -0.05, 0.11, 0, TAU); paint(c, alpha(C.sky, 0.5), { lw: 0.03 }); },
    }, 0), { on: DAY });
    R.thing(41.2, 15.5, (ctx) => board(ctx, 'x', 40.8, 15.47, 0.62, 0.62, 0.32, [['CLOSED', 0.16]], { board: C.white, ink: C.red, even: true }), { on: NIGHT });

    // ---------- The trays and the divest table ----------
    // The trays nobody takes back stack up all day, by the table: by night
    // it's a tower.
    const STACKS = [[4, 6, 5], [6, 8, 9], [8, 10.5, 14], [10.5, 13, 18], [13, 15.5, 22], [15.5, 18.25, 26], [18.25, 23.5, 31], [23.5, 28.1, 35]];
    for (const [a, b, n] of STACKS) {
      R.thing(TRAYS[0] + 0.5, TRAYS[1] + 0.45, (ctx) => {
        const r = rng(n);
        for (let i = 0; i < n; i++) {
          // (It leans toward check-in, away from the rules board: leaning
          // the other way, from where we look, it covered them.)
          const lean = n > 25 ? Math.pow(i / n, 2) * 0.4 : 0;
          tray(ctx, TRAYS[0] + (r() - 0.5) * 0.08 - lean, TRAYS[1] + (r() - 0.5) * 0.06, i * 0.11, null, 1.08);
        }
        if (Q.detail) onY(ctx, TRAYS[0], TRAYS[1] + 0.35, 0.25, (c) => { c.beginPath(); c.rect(-0.28, -0.13, 0.56, 0.26); paint(c, C.white, { lw: 0.015 }); words(c, n > 25 ? 'PLEASE' : 'TAKE', 0, -0.05, 0.08, C.ink); words(c, n > 25 ? 'TAKE ONE' : 'ONE', 0, 0.06, 0.08, C.ink); });
      }, { on: between(a, b) });
    }
    // The table, in two lengths (a seam runs through it), with what's been
    // taken off.
    const TBL = [30.8, 20.4, 33.2, 21.6, 0.9];
    const tablePiece = (ctx, a, b) => {
      for (const lx of [a + 0.08, b - 0.16]) for (const ly of [TBL[1] + 0.08, TBL[3] - 0.16]) box(ctx, lx, ly, 0, 0.08, 0.08, TBL[4] - 0.08, STEEL_D, { flat: true, lw: 0.018 });
      box(ctx, a, TBL[1], TBL[4] - 0.08, b - a, TBL[3] - TBL[1], 0.08, STEEL, { flat: true, lw: 0.03 });
    };
    R.thing(32, TBL[3], (ctx) => {
      tablePiece(ctx, TBL[0], 32);
      // A coat, shrugged off.
      box(ctx, 30.9, 20.55, TBL[4], 0.36, 0.8, 0.22, C.mustard, { lw: 0.02, dens: 0.18 });
      if (Q.detail) for (const v of [0.2, 0.4, 0.6]) face(ctx, [[30.9, 20.55 + v, TBL[4] + 0.225], [31.26, 20.55 + v, TBL[4] + 0.225]], null, { lw: 0.015, stroke: shade(C.mustard, 0.4) });
      // The tray with the socks: one rolled round a tiny bottle of hot sauce,
      // its red cap peeking out of the cuff.
      tray(ctx, 31.62, 21.0, TBL[4], (c, x, y, z) => {
        box(c, x - 0.3, y - 0.2, z, 0.12, 0.25, 0.03, C.ink, { flat: true, lw: 0.015 });
        disc(c, x - 0.12, y + 0.18, z + 0.01, 0.07, C.mustard, { lw: 0.015 });
        // the other sock, flat
        face(c, [[x - 0.08, y - 0.22, z + 0.01], [x + 0.28, y - 0.2, z + 0.01], [x + 0.28, y - 0.08, z + 0.01], [x - 0.08, y - 0.1, z + 0.01]], C.teal, { lw: 0.015 });
        // the rolled one, and the bottle
        box(c, x - 0.04, y - 0.06, z, 0.3, 0.16, 0.13, C.teal, { flat: true, lw: 0.018 });
        if (Q.detail) for (const u of [0.04, 0.12, 0.2]) face(c, [[x - 0.04 + u, y + 0.101, z], [x - 0.01 + u, y + 0.101, z], [x - 0.01 + u, y + 0.101, z + 0.13], [x - 0.04 + u, y + 0.101, z + 0.13]], C.white, { stroke: false });
        // the bottle, poking up out of the cuff: a flame on its label, a red cap
        const [bX, bY] = P(x + 0.2, y, z + 0.03);
        bottle(c, bX, bY, alpha(C.white, 0.95), C.coral, C.red, 1.1, 0.2);
        if (Q.detail) { c.beginPath(); c.moveTo(bX - 0.025, bY - 0.1); c.quadraticCurveTo(bX, bY - 0.2, bX + 0.02, bY - 0.13); c.quadraticCurveTo(bX + 0.03, bY - 0.09, bX - 0.025, bY - 0.1); c.fillStyle = C.mustard; c.fill(); }
        // and the sock's cuff round its foot
        c.beginPath(); c.ellipse(bX, bY - 0.02, 0.09, 0.04, 0, 0, TAU); paint(c, C.teal, { lw: 0.014 });
      }, 0.92);
    });
    R.thing(TBL[2], TBL[3], (ctx) => {
      tablePiece(ctx, 32, TBL[2]);
      tray(ctx, 32.6, 21.0, TBL[4], IN_TRAY[3], 0.92);
      box(ctx, 32.2, 20.5, TBL[4] + 0.12, 0.7, 0.46, 0.04, C.greyLight, { flat: true, lw: 0.018 });
    });
    // The rules, on a board at the table's end.
    R.thing(30.4, 22.7, (ctx) => {
      box(ctx, 30.35, 21.8, 0, 0.07, 0.07, 1.45, C.ink, { flat: true, lw: 0.015 });
      disc(ctx, 30.39, 21.84, 0.01, 0.2, STEEL_D, { lw: 0.02 });
      board(ctx, 'y', 30.4, 21.85, 1.85, 1.75, 0.8, [['SHOES OFF. BELTS OFF.', 0.11], ['LAPTOPS OUT.', 0.11], ['DIGNITY: IN THE TRAY.', 0.11]], { even: true });
    });
    // At the table: a man whose trousers need their belt back, and a woman
    // getting her laptop out of a bag that was packed around it.
    R.thing(32.0, 22.8, (ctx, t) => {
      const k = pulse(t, 5.5), slip = k < 0.75 ? k / 0.75 : 1 - (k - 0.75) / 0.25, hitch = k > 0.75 ? Math.sin((k - 0.75) * 4 * Math.PI) * 0.3 : 0;
      person(ctx, 32.0, 22.8, 0, {
        ...look(150, 'traveler', { top: C.red, bottom: C.navy, dress: false }), pose: 'stand', dir: 'r', arms: [0.25 + hitch, -0.25 - hitch], shoes: C.white,
        wear: (c, b) => {
          // his boxers, hearts and all, showing more and more
          const y0 = b.hipY - 0.07, y1 = b.hipY + 0.02 + slip * 0.16;
          c.beginPath(); c.rect(-0.29, y0, 0.58, y1 - y0); paint(c, C.pink, { lw: 0.02 });
          if (Q.detail) { c.fillStyle = C.red; for (const [u, v] of [[-0.15, 0.4], [0.05, 0.7], [0.2, 0.3]]) { c.beginPath(); c.arc(u, y0 + (y1 - y0) * v, 0.025, 0, TAU); c.fill(); } }
        },
      }, t);
    }, { anim: true, on: DAY });
    R.thing(32.6, 19.9, (ctx) => person(ctx, 32.6, 19.9, 0, {
      ...look(151), pose: 'carry', dir: 'r',
      hold: (c) => { c.beginPath(); c.rect(-0.05, -0.12, 0.5, 0.06); paint(c, C.greyLight, { lw: 0.02 }); },
    }, 0), { on: DAY });

    // ---------- The X-ray belts ----------
    // Each lane: the belt in two lengths with its tunnel between, a screen on
    // a pole beside it, and the bags riding through, one every four seconds
    // (with a tray of shoes and laptops between each). The Courier's parcel
    // rides lane A on the map's clock (day.js), so the belt is drawn before
    // it and the tunnel just after it, and the bags keep out of its way.
    const scr = [];
    LANES.forEach((x0, lane) => {
      const cx = x0 + 0.8;
      // The bags on the belt right now: bag n is in the tunnel while
      // t / 4 + lane * 3 is between n and n + 1.
      const riding = (t) => {
        const u = t / 4 + lane * 3, out = [], py = lane === 0 ? parcelY(t) : null;
        for (let n = Math.floor(u) - 2; n <= Math.floor(u) + 1; n++) {
          out.push({ n, y: TUN[0] + (u - n) * 2.2, tray: false });
          out.push({ n, y: TUN[0] + (u - n - 0.5) * 2.2, tray: true });
        }
        return py == null ? out : out.filter((it) => Math.abs(it.y - py) > 1.1);
      };
      // (Rigid: each of the eight things that ride, and each tray, is one
      // picture, stamped as it rides.)
      const drawRider = (ctx, it) => {
        const ti = mod(it.n * 3 + lane, IN_TRAY.length), k = mod(it.n, 8);
        rigid(ctx, `xray|${it.tray ? 't' + ti : k}`, cx, it.y, BELT_Z, (g) => rider(g, it, ti, k));
      };
      const rider = (ctx, it, ti, k) => {
        const z = BELT_Z, y = it.y;
        if (it.tray) { tray(ctx, cx, y, z, IN_TRAY[ti]); return; }
        if (k === 0) tray(ctx, cx, y, z, IN_TRAY[0]);
        else if (k === 1) bag(ctx, cx, y, z, { kind: 'duffel', color: C.brown, along: 'y' });
        else if (k === 2) bag(ctx, cx, y, z, { kind: 'case', color: C.purple, lie: true, along: 'y', tag: C.white });
        else if (k === 3 || k === 5) {
          // a cooler: what a frozen turkey flies in
          box(ctx, cx - 0.34, y - 0.24, z, 0.68, 0.48, 0.38, k === 3 ? C.white : C.red, { lw: 0.022, dens: 0.15 });
          box(ctx, cx - 0.36, y - 0.26, z + 0.38, 0.72, 0.52, 0.08, k === 3 ? C.teal : C.white, { flat: true, lw: 0.02 });
        } else if (k === 4) bag(ctx, cx, y - 0.05, z, { kind: 'pack', color: C.green });
        else if (k === 6) bag(ctx, cx, y, z, { kind: 'case', color: C.ink, lie: true, along: 'y', s: 0.8, tag: C.coral });
        else bag(ctx, cx, y, z, { kind: 'skis', color: C.navy, along: 'y', s: 0.55 });
      };
      // The tunnel sorts just after the parcel at its mouth; the belt's
      // lengths sort before the parcel anywhere on them, their bags after.
      const TD = cx + TUN[1] + 0.01;
      SEG.forEach(([y0, y1], si) => {
        const dep = si === 0 ? x0 + y0 + 0.3 : TD - 0.2;
        // The frame, still: legs, the bed, the rubber, both rails.
        R.thing(x0 + 1.6, y1, (ctx) => {
          for (const ly of [y0 + 0.15, y1 - 0.25]) for (const lx of [x0 + 0.12, x0 + 1.4]) box(ctx, lx, ly, 0, 0.08, 0.08, BELT_Z - 0.14, STEEL_D, { flat: true, lw: 0.018 });
          box(ctx, x0, y0, BELT_Z - 0.14, 1.6, y1 - y0, 0.14, STEEL_D, { flat: true, lw: 0.03 });
          rect(ctx, x0 + 0.08, y0, 1.44, y1 - y0, BELT_Z, RUBBER, { stroke: false });
          for (const rx of [x0, x0 + 1.52]) box(ctx, rx, y0, BELT_Z - 0.02, 0.08, y1 - y0 - (si ? 0.08 : 0), 0.08, STEEL, { flat: true, lw: 0.018 });
          if (si === 1) box(ctx, x0, y1 - 0.08, BELT_Z - 0.14, 1.6, 0.08, 0.3, STEEL, { flat: true, lw: 0.02 });
        }, { depth: dep });
        // Its slats, rolling forward.
        R.thing(x0 + 1.6, y1, (ctx, t) => {
          if (!Q.detail) return;
          ctx.beginPath();
          const off = mod(t * SPEED, 0.36);
          for (let y = y0 + off; y < y1 - 0.05; y += 0.36) { const [ax, ay] = P(x0 + 0.1, y, BELT_Z), [bx, by] = P(x0 + 1.5, y, BELT_Z); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); }
          ctx.strokeStyle = alpha(C.ink, 0.45); ctx.lineWidth = 0.02; ctx.stroke();
        }, { anim: true, depth: dep + 0.01 });
        // What's riding on it (after the tunnel, on the length in front of it).
        R.thing(x0 + 1.6, y1, (ctx, t) => {
          const list = riding(t).filter((it) => (si === 0 ? it.y > y0 + 0.3 && it.y < TUN[0] + 0.1 : it.y > TUN[1] + 0.15 && it.y < y1 - 0.3));
          if (si === 1) {
            // the lead curtain at the tunnel's mouth, pushed aside by what's coming out
            const py = lane === 0 ? parcelY(t) : null;
            const near = (py != null && py > TUN[1] - 0.4 && py < TUN[1] + 0.6) || riding(t).some((it) => it.y > TUN[1] - 0.4 && it.y < TUN[1] + 0.5);
            for (let i = 0; i < 6; i++) {
              const xa = x0 + 0.08 + i * 0.24, sw = near ? 0.25 + Math.sin(t * 7 + i) * 0.06 : 0.02;
              face(ctx, [[xa, TUN[1] + 0.01, 1.5], [xa + 0.22, TUN[1] + 0.01, 1.5], [xa + 0.22, TUN[1] + sw, BELT_Z + 0.05], [xa, TUN[1] + sw, BELT_Z + 0.05]], alpha(C.ink, 0.75), { lw: 0.012 });
            }
            // the X-ray's lamp, on while it looks
            const on = Math.sin(t * 5) > -0.3;
            disc(ctx, x0 + 0.3, TUN[1] - 0.3, 2.13, 0.08, on ? C.red : shade(C.red, 0.4), { lw: 0.015 });
          }
          list.sort((a, b) => a.y - b.y);
          for (const it of list) drawRider(ctx, it);
        }, { anim: true, depth: si === 0 ? dep + 0.02 : TD + 0.01 });
      });
      // The tunnel: a box with a hood, its mouth and its curtain toward you,
      // on a base set back under the belt (so it never paints over the belt
      // in front of it).
      R.thing(x0 + 1.9, TUN[1], (ctx) => {
        box(ctx, x0 - 0.3, TUN[0], 0, 2.2, TUN[1] - TUN[0] - 0.7, BELT_Z - 0.14, shade(MACHINE, 0.2), { flat: true, lw: 0.03 });
        box(ctx, x0 - 0.3, TUN[0], BELT_Z - 0.14, 2.2, TUN[1] - TUN[0], 1.85 - BELT_Z + 0.14, MACHINE, { lw: 0.035 });
        box(ctx, x0 - 0.22, TUN[0] + 0.08, 1.85, 2.04, TUN[1] - TUN[0] - 0.16, 0.18, INK.harbor, { lw: 0.03 });
        face(ctx, [[x0 + 0.04, TUN[1] + 0.002, BELT_Z - 0.02], [x0 + 1.56, TUN[1] + 0.002, BELT_Z - 0.02], [x0 + 1.56, TUN[1] + 0.002, 1.55], [x0 + 0.04, TUN[1] + 0.002, 1.55]], C.ink, { lw: 0.02 });
        // a hazard band under its mouth
        if (Q.detail) {
          for (let i = 0; i < 11; i++) {
            const xa = x0 - 0.3 + i * 0.2;
            face(ctx, [[xa, TUN[1] + 0.003, BELT_Z - 0.12], [xa + 0.1, TUN[1] + 0.003, BELT_Z - 0.12], [xa + 0.16, TUN[1] + 0.003, BELT_Z - 0.02], [xa + 0.06, TUN[1] + 0.003, BELT_Z - 0.02]], i % 2 ? C.ink : INK.signal, { stroke: false });
          }
        }
        lettering(ctx, 'x', x0 + 0.8, TUN[1] + 0.003, 1.7, `LANE ${lane + 1}`, 0.15, C.white, 'Bagel Fat One');
        lettering(ctx, 'y', x0 + 1.903, (TUN[0] + TUN[1]) / 2, 1.25, 'NOSY 3000', 0.3, shade(MACHINE, 0.45), 'Bagel Fat One');
        lettering(ctx, 'y', x0 + 1.903, (TUN[0] + TUN[1]) / 2, 0.9, 'SEES ALL. JUDGES SOME.', 0.12, shade(MACHINE, 0.5));
      }, { depth: TD });

      // The screen, on a pole by the belt, and its console.
      const m = MON[lane], mx = m.x;
      const screen = R.poke({ id: m.id, at: [mx, MON_Y, 2.6], r: 0.9, hold: 8, sound: 'tick', say: (t) => `On the screen: ${shown(t, lane).toLowerCase()}.` });
      scr.push(screen);
      R.thing(mx + 0.8, MON_Y, (ctx) => {
        box(ctx, mx - 0.5, 20.3, 0, 1.0, 0.8, 1.0, MACHINE, { lw: 0.03 });
        face(ctx, [[mx - 0.5, 20.3, 1.0], [mx + 0.5, 20.3, 1.0], [mx + 0.5, 21.1, 0.92], [mx - 0.5, 21.1, 0.92]], BEZEL, { lw: 0.025 });
        if (Q.detail) {
          disc(ctx, mx + 0.25, 20.85, 0.95, 0.09, C.red, { lw: 0.015 });
          box(ctx, mx - 0.3, 20.55, 0.96, 0.04, 0.04, 0.16, C.ink, { flat: true, stroke: false });
        }
        box(ctx, mx - 0.06, 20.6, 1.0, 0.12, 0.12, 0.95, C.ink, { flat: true, lw: 0.02 });
        box(ctx, mx - 0.8, 20.56, 1.95, 1.6, 0.3, 1.3, BEZEL, { flat: true, lw: 0.035 });
      }, { depth: mx + 0.8 + MON_Y });
      R.thing(mx + 0.8, MON_Y, (ctx, t) => {
        const k = screen.k();
        onY(ctx, mx, MON_Y + 0.003, 2.6, (c) => {
          const w = 1.4, h = 1.2;
          // Asleep: a screen saver bouncing about, the bag behind it dim.
          c.save();
          c.globalAlpha *= 0.32 + 0.68 * k;
          xrayScreen(c, shown(t, lane), w, h, t, lane);
          c.restore();
          if (k < 0.99) {
            c.save();
            c.globalAlpha *= 1 - k;
            c.beginPath(); c.rect(-w / 2, -h / 2, w, h); c.fillStyle = alpha(XR.bg, 0.4); c.fill();
            const tri = (v) => 2 * Math.abs(v - Math.floor(v + 0.5));
            words(c, `LANE ${lane + 1}`, -0.36 + tri(t * 0.13 + lane * 0.3) * 0.72, -0.45 + tri(t * 0.17 + lane * 0.5) * 0.8, 0.16, C.tealLight, { font: 'Bagel Fat One' });
            c.restore();
          }
          // The turkey's gone home: a note on the screen says so.
          if (lane === 0 && homeTurkey()) {
            c.beginPath(); c.rect(0.4, -0.62, 0.34, 0.26); paint(c, C.butter, { lw: 0.012 });
            words(c, 'TURKEY', 0.57, -0.54, 0.055, C.ink);
            words(c, 'GONE HOME', 0.57, -0.45, 0.05, C.ink);
          }
        });
        // An alarm lamp on top for anything alarming.
        const name = shown(t, lane), bad = /TURKEY|SWORD|GLOBE/.test(name);
        disc(ctx, mx + 0.55, 20.71, 3.26, 0.1, bad && Math.sin(t * 9) > 0 ? C.red : shade(C.red, 0.45), { lw: 0.015 });
      }, { anim: true, depth: mx + 0.8 + MON_Y + 0.02 });
      R.light({ at: [mx, MON_Y + 0.3, 2.6], r: 2.4, color: C.tealLight, k: (t) => nightK(t) * 0.45 });
    });
    // The frozen turkey, on lane A's screen (when it's in the tunnel: look).
    R.find({ id: 'turkey', label: 'A frozen turkey', kind: 'poke', inside: scr[0], at: [MON[0].x, MON_Y, 2.6], r: 0.8, hint: 'One of the X-ray screens is showing dinner.' });

    // Lane A's operator, deep in the crossword (an empty stool after six).
    R.thing(34.1, 21.5, (ctx) => {
      cylinder(ctx, 34.1, 21.5, 0, 0.05, 0.7, C.ink, { flat: true, stroke: false });
      cylinder(ctx, 34.1, 21.5, 0.7, 0.24, 0.08, C.ink, { flat: true, lw: 0.02 });
    });
    R.thing(34.1, 21.55, (ctx) => person(ctx, 34.1, 21.5, -0.02, {
      ...officer(160), pose: 'sit', dir: 'r', arms: [1.05, 0.95],
      hold: (c) => { c.beginPath(); c.rect(-0.08, -0.32, 0.42, 0.5); paint(c, C.white, { lw: 0.02 }); if (Q.detail) { c.fillStyle = C.ink; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j * 3) % 4) c.fillRect(-0.02 + i * 0.08, -0.25 + j * 0.08, 0.06, 0.06); } },
    }, 0), { on: DAY });
    // Loading lane A: a woman heaving a bag onto the belt.
    R.thing(35.5, 18.3, (ctx, t) => {
      const k = pulse(t, 4.6), up = Math.sin(clamp(k * 1.4) * Math.PI) * 0.5;
      person(ctx, 35.5, 18.3, 0, {
        ...look(152), pose: 'carry', dir: 'r', arms: [1.0 + up, 1.0 + up],
        hold: (c) => { c.beginPath(); c.roundRect(0.0, -0.1 - up * 0.4, 0.5, 0.3, 0.1); paint(c, C.coral, { lw: 0.025 }); },
      }, t);
    }, { anim: true, on: DAY });
    // Off lane A to the bench: arms full, shoes still in hand. (Clear of the
    // belt's end, where the Courier collects his parcel: there his "It's
    // bread?" covered her.)
    R.thing(34.6, 24.4, (ctx) => person(ctx, 34.6, 24.4, 0, {
      ...look(153), pose: 'carry', dir: 'l', shoes: C.white,
      hold: (c) => { c.beginPath(); c.rect(-0.05, -0.05, 0.5, 0.08); paint(c, C.greyLight, { lw: 0.02 }); c.beginPath(); c.roundRect(0.0, -0.32, 0.45, 0.26, 0.08); paint(c, C.purple, { lw: 0.02 }); shoe(c, 0.22, -0.36, C.brown, 0, 'boot', 0.8); },
    }, 0), { on: DAY });
    // Loading lane B: a laptop, and someone holding one boot.
    R.thing(44.3, 18.4, (ctx) => person(ctx, 44.3, 18.4, 0, {
      ...look(154), pose: 'carry', dir: 'r',
      hold: (c) => { c.beginPath(); c.rect(0.0, -0.08, 0.48, 0.06); paint(c, C.greyLight, { lw: 0.02 }); },
    }, 0), { on: DAY });
    R.thing(44.0, 17.1, (ctx) => person(ctx, 44.0, 17.1, 0, {
      ...look(155, 'traveler', { dress: false }), pose: 'stand', dir: 'r', arms: [2.2, -0.2], shoes: C.white,
      hold: (c) => shoe(c, 0.3, -0.7, C.brown, -0.4, 'boot', 1.1),
    }, 0), { on: DAY });
    // Lane B's operator: points at anything worth pointing at. Asleep on his
    // stool at night.
    R.thing(49.3, 20.5, (ctx, t) => {
      const name = shown(t, 1), bad = /TURKEY|SWORD|GLOBE/.test(name);
      person(ctx, 49.3, 20.5, 0, { ...officer(161), pose: bad ? 'point' : 'stand', dir: 'l', arms: bad ? [1.5 + Math.sin(t * 8) * 0.12, -0.2] : [0.35, -0.35] }, t);
      if (bad && Q.detail) label(ctx, 49.0, 20.2, 2.95, '!', 0.4, C.red);
    }, { anim: true, on: DAY });
    R.thing(49.3, 20.5, (ctx) => {
      cylinder(ctx, 49.3, 20.5, 0, 0.05, 0.7, C.ink, { flat: true, stroke: false });
      cylinder(ctx, 49.3, 20.5, 0.7, 0.24, 0.08, C.ink, { flat: true, lw: 0.02 });
      person(ctx, 49.3, 20.5, -0.02, { ...officer(161), pose: 'sit', dir: 'l', arms: [0.3, 0.15] }, 0);
    }, { on: NIGHT });
    R.air((ctx, t) => zzz(ctx, 49.2, 20.4, 2.3, t), { on: NIGHT });

    // ---------- The body scanner ----------
    // Two curved walls and an arch at the back; the near one's glass. The
    // sign says WAIT. Nobody has said anything else.
    R.thing(40.9, 23.0, (ctx) => {
      box(ctx, 40.6, 21.4, 0, 0.3, 1.6, 3.0, MACHINE, { flat: true, lw: 0.035 });
      face(ctx, [[40.901, 21.6, 0.4], [40.901, 22.8, 0.4], [40.901, 22.8, 2.7], [40.901, 21.6, 2.7]], tint(C.sky, 0.45), { lw: 0.02 });
      box(ctx, 40.6, 21.4, 2.78, 0.3, 1.6, 0.22, INK.harbor, { flat: true, lw: 0.025 });
      box(ctx, 40.6, 21.25, 3.0, 3.2, 0.3, 0.26, INK.harbor, { flat: true, lw: 0.035 });
      lettering(ctx, 'x', 42.2, 21.551, 3.13, 'HANDS UP. WAIT.', 0.17, C.ink);
    });
    R.thing(SCAN.x, SCAN.y, (ctx, t) => {
      // the scan's light sweeping the back wall
      const k = pulse(t, 2.6), z = 0.4 + Math.abs(Math.sin(k * Math.PI)) * 2.3;
      face(ctx, [[40.905, 21.6, z], [40.905, 22.8, z], [40.905, 22.8, z + 0.07], [40.905, 21.6, z + 0.07]], alpha(C.tealLight, 0.9), { stroke: false });
      scanMan(ctx, t);
    }, { anim: true });
    R.thing(43.8, 23.0, (ctx) => {
      // the near wall: a frame round a glass panel
      box(ctx, 43.5, 21.4, 0, 0.3, 1.6, 0.35, MACHINE, { flat: true, lw: 0.03 });
      for (const y of [21.4, 22.85]) box(ctx, 43.5, y, 0.35, 0.3, 0.15, 2.65, MACHINE, { flat: true, lw: 0.03 });
      face(ctx, [[43.8, 21.55, 0.35], [43.8, 22.85, 0.35], [43.8, 22.85, 3.0], [43.8, 21.55, 3.0]], GLASS, { lw: 0.02 });
      face(ctx, [[43.5, 23.0, 0.35], [43.8, 23.0, 0.35], [43.8, 23.0, 3.0], [43.5, 23.0, 3.0]], MACHINE, { lw: 0.02 });
      box(ctx, 43.5, 21.4, 3.0, 0.3, 1.6, 0.26, INK.harbor, { flat: true, lw: 0.03 });
      // its little screen: a figure with its hands up, and OK
      onY(ctx, 43.65, 23.003, 2.05, (c) => {
        c.beginPath(); c.rect(-0.13, -0.2, 0.26, 0.4); paint(c, C.ink, { lw: 0.015 });
        c.strokeStyle = C.mint; c.lineWidth = 0.025; c.lineCap = 'round';
        c.beginPath(); c.arc(0, -0.08, 0.03, 0, TAU); c.moveTo(0, -0.05); c.lineTo(0, 0.04); c.moveTo(-0.07, -0.13); c.lineTo(0, -0.03); c.lineTo(0.07, -0.13); c.moveTo(-0.04, 0.12); c.lineTo(0, 0.04); c.lineTo(0.04, 0.12); c.stroke();
        words(c, 'OK', 0, 0.16, 0.06, C.mint);
      });
    });
    R.find({ id: 'hands-up', label: 'Someone with their hands up', at: [SCAN.x, SCAN.y, 2.8], r: 0.9 });
    // The officer who'd tell him: back in five minutes, since six.
    R.thing(44.5, 23.8, (ctx) => {
      cylinder(ctx, 44.5, 23.8, 0, 0.05, 0.72, C.ink, { flat: true, stroke: false });
      cylinder(ctx, 44.5, 23.8, 0.72, 0.24, 0.08, C.ink, { flat: true, lw: 0.02 });
      cylinder(ctx, 44.42, 23.72, 0.8, 0.07, 0.17, C.white, { flat: true, lw: 0.015 });
      post(ctx, 45.0, 24.3);
      board(ctx, 'x', 45.0, 24.3, 1.25, 0.9, 0.5, [['BACK IN', 0.13], ['5 MIN', 0.2, null, 'Bagel Fat One']], { board: C.white, ink: C.ink, even: true });
    });
    // Waiting for the scanner: one taps her foot, one checks his watch.
    R.thing(42.6, 19.4, (ctx, t) => person(ctx, 42.6, 19.4, Math.max(0, Math.sin(t * 9)) * 0.04, { ...look(156), pose: 'stand', dir: 'l', arms: [0.7, 0.7] }, t), { anim: true, on: DAY });
    R.thing(42.4, 18.2, (ctx) => person(ctx, 42.4, 18.2, 0, { ...look(157), pose: 'stand', dir: 'l', arms: [1.9, -0.2], shoes: C.grey }, 0), { on: DAY });

    // ---------- The sniffer dog ----------
    const sniffer = route([[47.7, 17.7, 2.2], [49.5, 17.7], [49.5, 19.2, 2.6], [47.7, 19.2]], { speed: 0.6 });
    const HANDLER = officer(162, { top: C.navy });
    R.mover((t) => (DAY(t) ? sniffer(t) : { x: 48.4, y: 18.6, sleep: true }), (ctx, t, p) => {
      if (p.sleep) {
        rect(ctx, 47.95, 18.25, 0.9, 0.7, 0.01, C.blush, { lw: 0.02 });
        dog(ctx, 48.4, 18.6, 0.03, t, { pose: 'sleep', dir: 'r' });
        zzz(ctx, 48.6, 18.5, 0.6, t + 0.6);
        return;
      }
      const hx = p.x - 0.5, hy = p.y - 0.75;
      person(ctx, hx, hy, 0, { ...HANDLER, pose: p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back, arms: p.moving ? undefined : [0.9, -0.2], speed: 5 }, t);
      // the lead
      const [ax, ay] = hand(hx, hy, 0, p.dir, 0.9), [bx, by] = P(p.x + (p.dir === 'l' ? -0.2 : 0.2), p.y, 0.55);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + bx) / 2, Math.max(ay, by) + 0.3, bx, by);
      ctx.strokeStyle = C.red; ctx.lineWidth = 0.035; ctx.stroke();
      dog(ctx, p.x, p.y, 0, t, { pose: p.moving ? 'walk' : 'sniff', dir: p.dir });
    });
    R.poke({
      id: 'dog', at: (t) => { const p = DAY(t) ? sniffer(t) : { x: 48.4, y: 18.6 }; return [p.x, p.y, 0.6]; }, r: 0.8, sound: 'tick',
      say: (t) => (DAY(t) ? ['Good boy. He found a sandwich.', 'He smells pie. Everywhere.', 'Very good boy. Very.'] : ['Off duty. Belly rubs only.', 'Snoring. Good boy.']),
    });

    // ---------- The bin of things that aren't coming back ----------
    // A clear box: shampoo, a sword, a can of Gander Cola, and snow globes,
    // more by the hour.
    const GLOBES = [[4, 8, 2], [8, 11, 5], [11, 14, 8], [14, 16, 11], [16, 18.25, 14], [18.25, 28.1, 18]];
    const [bx, by, bw, bd, bh] = BIN;
    for (const [a, b, n] of GLOBES) {
      R.thing(bx + bw, by + bd, (ctx) => {
        // the back of the box, seen through the front
        face(ctx, [[bx, by, 0], [bx + bw, by, 0], [bx + bw, by + bd, 0], [bx, by + bd, 0]], shade(FLOOR, 0.15), { stroke: false });
        face(ctx, [[bx, by, 0], [bx + bw, by, 0], [bx + bw, by, bh], [bx, by, bh]], alpha(C.sky, 0.25), { lw: 0.015 });
        face(ctx, [[bx, by, 0], [bx, by + bd, 0], [bx, by + bd, bh], [bx, by, bh]], alpha(C.sky, 0.2), { lw: 0.015 });
        // The tally on its stick at the back.
        box(ctx, bx + 0.79, by + 0.08, bh, 0.04, 0.04, 0.75, C.ink, { flat: true, stroke: false });
        board(ctx, 'x', bx + 0.8, by + 0.1, bh + 0.95, 1.3, 0.5, [['DAYS WITHOUT A', 0.11], ['SNOW GLOBE: 0', 0.16, null, 'Bagel Fat One']], { board: C.white, ink: C.red, even: true });
        // The sword, point down, its hilt up out of the top.
        face(ctx, [[bx + 0.45, by + 0.5, 0.05], [bx + 0.55, by + 0.5, 0.05], [bx + 0.62, by + 0.5, 1.25], [bx + 0.48, by + 0.5, 1.25]], C.greyLight, { lw: 0.018 });
        box(ctx, bx + 0.32, by + 0.45, 1.25, 0.46, 0.1, 0.06, C.mustard, { flat: true, lw: 0.015 });
        box(ctx, bx + 0.5, by + 0.47, 1.31, 0.08, 0.06, 0.3, C.brown, { flat: true, lw: 0.015 });
        disc(ctx, bx + 0.54, by + 0.5, 1.63, 0.06, C.mustard, { lw: 0.015 });
        // Shampoos and a can, in a heap.
        const r = rng(9);
        for (let i = 0; i < 12; i++) {
          const x = bx + 0.2 + r() * (bw - 0.4), y = by + 0.2 + r() * (bd - 0.4), z = r() * 0.25;
          const [X, Y] = P(x, y, z);
          bottle(ctx, X, Y, pick(r, [C.teal, C.pink, C.butter, C.coral, C.white, C.lilac]), C.white, pick(r, [C.ink, C.white, C.red]), 1.2, 0.16);
        }
        { const [X, Y] = P(bx + 1.2, by + 0.9, 0.2); ctx.beginPath(); ctx.roundRect(X - 0.08, Y - 0.24, 0.16, 0.24, 0.03); paint(ctx, BRAND.can, { lw: 0.015 }); ctx.beginPath(); ctx.rect(X - 0.08, Y - 0.15, 0.16, 0.05); ctx.fillStyle = BRAND.ink; ctx.fill(); }
        // The snow globes, piling up.
        const g = rng(n + 3);
        for (let i = 0; i < n; i++) {
          const inside = i < 14;
          const x = inside ? bx + 0.25 + (i % 4) * 0.36 + g() * 0.06 : bx + bw + 0.25 + (i - 14) * 0.3;
          const y = inside ? by + 0.3 + Math.floor(i / 4) % 3 * 0.38 + g() * 0.05 : by + bd + 0.15 - (i - 14) * 0.25;
          const z = inside ? 0.4 + Math.floor(i / 12) * 0.3 : 0;
          const [X, Y] = P(x, y, z);
          globe(ctx, X, Y, 1.25, null, i);
        }
        // the front glass, and the plate that says so
        face(ctx, [[bx, by + bd, 0], [bx + bw, by + bd, 0], [bx + bw, by + bd, bh], [bx, by + bd, bh]], GLASS, { lw: 0.025 });
        face(ctx, [[bx + bw, by, 0], [bx + bw, by + bd, 0], [bx + bw, by + bd, bh], [bx + bw, by, bh]], alpha(tint(C.sky, 0.3), 0.36), { lw: 0.025 });
        for (const [rx, ry, rw, rd] of [[bx - 0.03, by - 0.03, bw + 0.06, 0.08], [bx - 0.03, by + bd - 0.05, bw + 0.06, 0.08], [bx - 0.03, by, 0.08, bd], [bx + bw - 0.05, by, 0.08, bd]]) box(ctx, rx, ry, bh, rw, rd, 0.05, STEEL, { flat: true, lw: 0.018 });
        board(ctx, 'x', bx + bw / 2, by + bd + 0.005, 0.32, 1.35, 0.32, [['NOT COMING BACK', 0.15]], { even: true });
      }, { on: between(a, b) });
    }
    R.poke({ id: 'bin', at: [50.2, 23.1, 1.2], r: 0.9, teach: true, sound: 'clunk', say: ['Not one of these is coming back.', 'Shampoo, a sword, snow globes.', 'Somebody will miss that sword.'] });
    // The officer at the bin, one globe at a time: holds it up, gives it a
    // shake, and in it goes. The girl it belonged to watches.
    R.thing(48.7, 23.3, (ctx, t) => {
      const k = pulse(t, 7) * 7;
      const a = k < 2 ? 2.4 : k < 4 ? 2.3 + Math.sin(t * 22) * 0.25 : k < 5 ? 2.3 - (k - 4) * 1.4 : k < 6.2 ? 0.5 : 0.5 + (k - 6.2) * 2.4;
      person(ctx, 48.7, 23.3, 0, { ...officer(163), pose: 'stand', dir: 'r', arms: [a, -0.2] }, t);
      if (k < 4 || k > 6.2) {
        const [X, Y] = hand(48.7, 23.3, 0, 'r', a);
        globe(ctx, X, Y + 0.12, 1.3, k >= 2 && k < 4 ? t : null, 7);
      } else if (k < 5) {
        const q = k - 4, [X0g, Y0g] = hand(48.7, 23.3, 0, 'r', 2.3), [X1g, Y1g] = P(bx + 0.6, by + 0.7, bh + 0.2);
        globe(ctx, X0g + (X1g - X0g) * q, Y0g + (Y1g - Y0g) * q - Math.sin(q * Math.PI) * 0.6 + 0.12, 1.3, t, 7);
      }
    }, { anim: true, on: DAY });
    // (She watches from the bin's other side: by the officer, from where we
    // look the floodlight mast's lamp outside the glass stood over her.)
    R.thing(51.65, 23.6, (ctx) => {
      bag(ctx, 51.65, 23.6, 0, { kind: 'pack', color: C.pink });
      const [X, Y] = P(51.65, 23.6, 0.56);
      globe(ctx, X - 0.05, Y + 0.05, 1.1, null, 4);
    }, { on: DAY });
    R.thing(51.5, 24.1, (ctx) => person(ctx, 51.5, 24.1, 0, { ...look(158), top: C.purple, pose: 'stand', dir: 'l', scale: 0.7, arms: [1.3, 1.1] }, 0), { on: DAY });
    // After dark, the same officer sits at the glass with one of them,
    // watching the real thing come down.
    R.thing(46.2, 28.2, (ctx, t) => {
      box(ctx, 45.9, 27.9, 0, 0.6, 0.6, 0.45, C.woodLight, { flat: true, lw: 0.02 });
      const a = 2.5 + Math.sin(t * 2.2) * 0.12;
      person(ctx, 46.2, 28.2, -0.3, { ...officer(163), pose: 'sit', dir: 'r', back: true, arms: [a, -a + 0.4] }, 0);
      const [X, Y] = hand(46.2, 28.2, -0.3, 'r', a);
      globe(ctx, X, Y + 0.1, 1.3, t, 7);
    }, { anim: true, on: NIGHT });

    // ---------- The skier ----------
    // Being wanded in his ski boots and goggles, arms out; once his skis are
    // found he's got them back, and the wand goes off on the bindings.
    const SKI = look(131, 'traveler', { top: C.mustard, bottom: C.ink, hat: 'helmet', dress: false });
    const goggles = (c, hy, back) => {
      if (back) return;
      c.beginPath(); c.roundRect(-0.02, hy - 0.1, 0.36, 0.17, 0.07); paint(c, C.coral, { lw: 0.03 });
      c.beginPath(); c.roundRect(0.02, hy - 0.07, 0.28, 0.11, 0.05); c.fillStyle = alpha(C.butter, 0.8); c.fill();
    };
    R.thing(47.6, 26.2, (ctx, t) => {
      const back = R.found('skier');
      const [X, Y] = P(47.6, 26.2, 0);
      person(ctx, 47.6, 26.2, 0, { ...SKI, pose: 'stand', dir: 'r', arms: back ? [0.75, -0.2] : [1.57, -1.57], face: goggles }, t);
      // the boots: big, red, buckled
      for (const dx of [-0.13, 0.13]) {
        ctx.beginPath(); ctx.roundRect(X + dx - 0.12, Y - 0.42, 0.25, 0.44, 0.06); paint(ctx, C.red, { lw: 0.03 });
        if (Q.detail) { ctx.fillStyle = C.greyLight; for (const v of [0.12, 0.22, 0.32]) ctx.fillRect(X + dx - 0.12, Y - v, 0.25, 0.035); }
      }
      if (back) {
        // his skis, red with a white stripe, held upright
        for (const dx of [0.5, 0.64]) {
          ctx.beginPath(); ctx.moveTo(X + dx - 0.06, Y + 0.02); ctx.lineTo(X + dx + 0.06, Y + 0.02); ctx.lineTo(X + dx + 0.06, Y - 2.55); ctx.quadraticCurveTo(X + dx, Y - 2.75, X + dx - 0.06, Y - 2.6); ctx.closePath();
          paint(ctx, C.red, { lw: 0.03 });
          ctx.fillStyle = C.white; ctx.fillRect(X + dx - 0.015, Y - 2.4, 0.03, 2.3);
          ctx.fillStyle = C.ink; ctx.fillRect(X + dx - 0.06, Y - 1.0, 0.12, 0.12);
        }
      }
      if (DAY(t) && Q.detail) {
        const k = pulse(t, 3.2);
        if (k > 0.55 && k < 0.85) words(ctx, 'BEEP', X + (back ? 1.0 : 0.62), Y - (back ? 1.05 : 0.3), 0.22, C.red, { font: 'Bagel Fat One' });
      }
    }, { anim: true });
    R.find({ id: 'skier', label: 'The skier', after: 'curb:skis', at: [47.6, 26.2, 1.8], r: 0.9, riddle: 'Tag: Salt Lake City. Clunks when he walks.' });
    // The officer with the wand: up and down, again and again. At night he's
    // sat down; the skier hasn't been told he can put his arms down either.
    // (He works from the skier's left: on his right, from where we look, the
    // apron's floodlight mast outside the glass stood in front of him.)
    const WX = 46.6, WY = 26.75;
    R.thing(WX, WY, (ctx, t) => {
      const a = 1.2 + Math.sin(t * 2) * 0.55;
      person(ctx, WX, WY, 0, { ...officer(164), pose: 'stand', dir: 'r', arms: [a, -0.2] }, t);
      const [hx, hy] = hand(WX, WY, 0, 'r', a), dx = Math.sin(a) * 0.5, dy = Math.cos(a) * 0.5;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + dx, hy + dy); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.lineCap = 'round'; ctx.stroke();
      ctx.beginPath(); ctx.arc(hx + dx, hy + dy, 0.07, 0, TAU); ctx.fillStyle = INK.signal; ctx.fill();
    }, { anim: true, on: DAY });
    R.thing(WX + 0.1, WY + 0.25, (ctx) => {
      box(ctx, WX - 0.2, WY - 0.05, 0, 0.6, 0.6, 0.45, C.woodLight, { flat: true, lw: 0.02 });
      person(ctx, WX + 0.1, WY + 0.25, -0.3, { ...officer(164), pose: 'sit', dir: 'r', arms: [0.4, 0.3] }, 0);
    }, { on: NIGHT });
    R.air((ctx, t) => zzz(ctx, WX, WY + 0.15, 1.9, t + 2.1), { on: NIGHT });

    // ---------- The bench, and the shoes ----------
    // PUT YOUR LIFE BACK TOGETHER HERE: a long bench, in two lengths (a seam).
    const benchPiece = (ctx, a, b, ends) => {
      for (const lx of ends) for (const ly of [26.3, 27.0]) box(ctx, lx, ly, 0, 0.08, 0.08, 0.38, STEEL_D, { flat: true, lw: 0.018 });
      box(ctx, a, 26.2, 0.38, b - a, 1.0, 0.14, C.ink, { lw: 0.03 });
      box(ctx, a, 26.2, 0.52, b - a, 0.18, 0.5, shade(C.ink, 0.1), { flat: true, lw: 0.025 });
    };
    R.thing(32, 27.2, (ctx) => benchPiece(ctx, 31, 32, [31.1]));
    R.thing(35.4, 27.2, (ctx) => benchPiece(ctx, 32, 35.4, [33.6, 35.2]));
    R.thing(36.4, 26.8, (ctx) => {
      // its sign, a sandwich board at the end
      face(ctx, [[35.7, 26.55, 0], [36.5, 26.55, 0], [36.5, 26.75, 1.25], [35.7, 26.75, 1.25]], SIGN.board, { lw: 0.03 });
      onY(ctx, 36.1, 26.66, 0.72, (c) => {
        words(c, 'PUT YOUR', 0, -0.32, 0.12, SIGN.ink);
        words(c, 'LIFE BACK', 0, -0.13, 0.12, SIGN.ink);
        words(c, 'TOGETHER', 0, 0.06, 0.12, SIGN.ink);
        words(c, 'HERE', 0, 0.27, 0.14, SIGN.ink, { font: 'Bagel Fat One' });
      });
    });
    // On the bench by day: grandpa doing up his laces, a teenager with one
    // shoe on; by night, someone asleep along it.
    R.thing(32.6, 26.65, (ctx) => person(ctx, 32.6, 26.65, -0.18, { ...look(170, 'traveler', { hair: C.greyLight, style: 'bald' }), pose: 'sit', dir: 'r', arms: [0.6, 0.45] }, 0), { on: DAY, depth: 35.4 + 27.2 + 0.05 });
    R.thing(34.6, 26.65, (ctx) => person(ctx, 34.6, 26.65, -0.18, { ...look(171), pose: 'sit', dir: 'l', arms: [1.0, 1.0], shoes: C.white }, 0), { on: DAY, depth: 35.4 + 27.2 + 0.06 });
    R.thing(33.4, 26.7, (ctx) => {
      lieAlong(ctx, 34.7, 26.75, 0.55, asleep({ ...look(172), wear: coatOver(C.green) }));
    }, { on: NIGHT, depth: 35.4 + 27.2 + 0.05 });
    // A dad hopping about with one shoe on.
    R.thing(38.4, 26.6, (ctx, t) => {
      const z = Math.abs(Math.sin(t * 4.2)) * 0.12;
      person(ctx, 38.4, 26.6, z, {
        ...look(173, 'traveler', { dress: false }), pose: 'skate', dir: 'l', speed: 4, arms: [2.1 + Math.sin(t * 4.2) * 0.25, -1.3 + Math.sin(t * 4.2 + 1) * 0.3],
        hold: (c) => shoe(c, 0.2, -0.6, C.brown, 0.6, 'sneaker', 1.1),
      }, t);
    }, { anim: true, on: DAY });

    // The shoes: forty pairs in a heap in front of the bench, and an orange
    // webbed foot that isn't a shoe. Tap the heap and they fly.
    const r = rng(77);
    const COLS = [C.ink, C.navy, C.brown, C.white, C.grey, C.black, C.mustard, C.teal, C.wood, C.purple, C.greyLight];
    const KINDS = ['sneaker', 'sneaker', 'boot', 'heel'];
    const nest = [];
    for (let i = 0; i < 30; i++) {
      const a = r() * TAU, d = 0.3 + Math.sqrt(r()) * 0.7;
      const x = PILE.x + Math.cos(a) * d * 1.05, y = PILE.y + Math.sin(a) * d * 0.62;
      nest.push({ x, y, z: 0.03 + (1 - d * d) * 0.42 * (0.5 + r() * 0.5), col: pick(r, COLS), ang: (r() - 0.5) * 2.4, kind: pick(r, KINDS) });
    }
    nest.sort((p, q) => p.x + p.y - q.x - q.y);
    const drawShoes = (ctx, list) => { for (const s of list) { const [X, Y] = P(s.x, s.y, s.z); shoe(ctx, X, Y, s.col, s.ang, s.kind); } };
    const GX = 33.6, GY = 28.2;
    R.thing(PILE.x, PILE.y, (ctx) => {
      ctx.beginPath(); const [X, Y] = P(PILE.x, PILE.y, 0); ctx.ellipse(X, Y, 1.45, 0.62, 0, 0, TAU); ctx.fillStyle = alpha(C.ink, 0.14); ctx.fill();
      drawShoes(ctx, nest.filter((s) => s.x + s.y < GX + GY));
    }, { depth: GX + GY - 0.4 });
    R.thing(PILE.x + 0.8, PILE.y + 0.5, (ctx) => drawShoes(ctx, nest.filter((s) => s.x + s.y >= GX + GY)), { depth: GX + GY + 0.5 });
    // The lid: the shoes over the goose, in screen units round it.
    const [GXs, GYs] = P(GX, GY, 0);
    const lid = [];
    const rl = rng(31);
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 4 - (row > 2 ? 1 : 0); col++) {
        const X = GXs - 0.5 + col * 0.33 + (row % 2) * 0.16 + (rl() - 0.5) * 0.06, Y = GYs - 0.05 - row * 0.24 + (rl() - 0.5) * 0.05;
        // (flung sideways off the goose, to land on the heap either side)
        const side = X < GXs + 0.12 ? -1 : 1;
        lid.push({ X, Y, col: pick(rl, COLS), ang: (rl() - 0.5) * 2, kind: pick(rl, KINDS), fx: side * (0.75 + rl() * 0.45), fy: 0.08 + rl() * 0.25 + row * 0.04 });
      }
    }
    lid.sort((p, q) => q.Y - p.Y);
    lid.reverse();
    const shoes = R.poke({ id: 'shoes', at: [PILE.x, PILE.y, 0.5], r: 0.9, sound: 'pop', say: 'Forty pairs, and one is honking.' });
    R.thing(PILE.x + 0.9, PILE.y + 0.6, (ctx, t) => {
      const k = shoes.k();
      if (k < 0.5) {
        gooseFoot(ctx, ...P(34.3, 28.05, 0.02), t);
        // and now and then, a beak up out of the top
        const peek = pulse(t, 8.5);
        if (peek > 0.82 && peek < 0.97) {
          const up = Math.sin(((peek - 0.82) / 0.15) * Math.PI) * 0.22, [X, Y] = [GXs + 0.18, GYs - 1.25 - up];
          ctx.beginPath(); ctx.arc(X, Y, 0.12, 0, TAU); paint(ctx, C.white, { lw: 0.03 });
          ctx.beginPath(); ctx.moveTo(X + 0.08, Y - 0.05); ctx.lineTo(X + 0.3, Y + 0.01); ctx.lineTo(X + 0.08, Y + 0.06); paint(ctx, C.coral, { lw: 0.025 });
          ctx.beginPath(); ctx.arc(X + 0.03, Y - 0.03, 0.03, 0, TAU); ctx.fillStyle = C.ink; ctx.fill();
        }
      }
      const lift = (g, e) => {
        const arc = Math.sin(e * Math.PI) * 0.5;
        for (const s of lid) shoe(g, s.X + s.fx * e, s.Y + s.fy * e - arc, s.col, s.ang + e * 2.2, s.kind);
      };
      // (Shut or open, the shoes on top are one picture; flying off, live.)
      const e = clamp(k);
      if (e === 0 || e === 1) rigid(ctx, `shoe-lid|${e}`, 0, 0, 0, (g) => lift(g, e));
      else lift(ctx, e);
    }, { anim: true, depth: GX + GY + 0.6 });
    R.goose((t) => ({ x: GX, y: GY, z: 0.1, dir: 'r', pose: pulse(t, 6) > 0.8 ? 'honk' : 'sit', hidden: shoes.k() < 0.5 }),
      { kind: 'poke', inside: shoes, hint: 'Somebody\'s shoes are honking.' });
    // Another heap, boots this time, at the bench's other end: just boots.
    const boots = [];
    const rb = rng(55);
    for (let i = 0; i < 14; i++) {
      const a = rb() * TAU, d = Math.sqrt(rb());
      boots.push({ x: 37.0 + Math.cos(a) * d * 0.7, y: 27.9 + Math.sin(a) * d * 0.42, z: 0.03 + (1 - d * d) * 0.3, col: pick(rb, [C.brown, C.ink, C.wood, C.black, C.navy]), ang: (rb() - 0.5) * 1.6, kind: 'boot' });
    }
    boots.sort((p, q) => p.x + p.y - q.x - q.y);
    R.thing(37.7, 28.3, (ctx) => {
      const [X, Y] = P(37.0, 27.9, 0); ctx.beginPath(); ctx.ellipse(X, Y, 1.0, 0.42, 0, 0, TAU); ctx.fillStyle = alpha(C.ink, 0.12); ctx.fill();
      drawShoes(ctx, boots);
    });
    R.poke({ id: 'boots', at: [37.0, 27.9, 0.35], r: 0.8, sound: 'clunk', say: ['Boots. Very damp ones.', 'Smells like November.'] });

    // ---------- People about the place ----------
    // Bringing the trays back from lane A's end to the stack, all day.
    const runner = shuttle([[35.0, 25.3], [32.1, 24.95]], 0.8, 2.6);
    R.mover((t) => (DAY(t) ? runner(t) : { x: -1e4, y: -1e4, gone: true }), (ctx, t, p) => {
      if (p.gone) return;
      person(ctx, p.x, p.y, 0, {
        ...officer(165), pose: p.moving ? 'walk' : p.out ? 'carry' : 'stand', dir: p.dir, back: p.back, speed: 6,
        ...(p.out ? { arms: [1.2, 1.2], hold: (c) => { for (let i = 0; i < 5; i++) { c.beginPath(); c.rect(-0.1, -0.06 - i * 0.07, 0.62, 0.06); paint(c, TRAY, { lw: 0.015 }); } } } : {}),
      }, t);
    });
    // At night: the janitor, mopping the same strip of floor, and his sign.
    const mopper = shuttle([[37.8, 25.9], [45.4, 25.9]], 0.4, 3);
    R.mover((t) => (NIGHT(t) ? mopper(t) : { x: -1e4, y: -1e4, gone: true }), (ctx, t, p) => {
      if (p.gone) return;
      const sw = Math.sin(t * 3) * 0.35, [X, Y] = P(p.x, p.y, 0), f = p.dir === 'l' ? -1 : 1;
      const mx = X + f * 0.55 + sw, my = Y + 0.12;
      person(ctx, p.x, p.y, 0, { ...look(180, 'traveler', { top: C.teal, bottom: C.navy, hat: 'cap', dress: false }), pose: p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back, arms: [1.0, 0.7], speed: 3 }, t);
      const [hx, hy] = hand(p.x, p.y, 0, p.dir, 1.0);
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(mx, my - 0.1); ctx.strokeStyle = C.wood; ctx.lineWidth = 0.06; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(mx, my, 0.26, 0.1, 0, 0, TAU); paint(ctx, C.greyLight, { lw: 0.02 });
      if (Q.detail) { ctx.beginPath(); ctx.ellipse(mx - sw * 0.5, my + 0.05, 0.6, 0.18, 0, 0, TAU); ctx.fillStyle = alpha(C.white, 0.25); ctx.fill(); }
    });
    R.thing(41.6, 26.7, (ctx) => {
      face(ctx, [[41.3, 26.6, 0], [41.9, 26.6, 0], [41.9, 26.75, 0.9], [41.3, 26.75, 0.9]], INK.signal, { lw: 0.03 });
      onY(ctx, 41.6, 26.69, 0.48, (c) => { words(c, 'CAUTION', 0, -0.12, 0.09, C.ink); words(c, 'WET', 0, 0.02, 0.1, C.ink); words(c, 'FLOOR', 0, 0.14, 0.1, C.ink); });
      cylinder(ctx, 37.2, 26.15, 0, 0.3, 0.45, INK.signal, { flat: true, lw: 0.025 });
    }, { on: NIGHT });
    // By the glass by day, on his case: a man putting his shoes back on,
    // holding up the second one. It's a red high heel. (The heap's mixed.)
    // (Back from the glass, so his feet don't poke through it.)
    R.thing(43.4, 28.1, (ctx) => {
      bag(ctx, 42.75, 27.85, 0, { kind: 'pack', color: C.navy });
      bag(ctx, 43.4, 28.1, 0, { kind: 'case', lie: true, color: C.teal, along: 'x', tag: C.white });
      const a = 2.45;
      person(ctx, 43.4, 28.1, 0.26 - 0.71, {
        ...look(174, 'traveler', { dress: false, top: C.mustard }), pose: 'sit', dir: 'r', arms: [a, 0.5], shoes: C.white,
        hold: inHand(a, (c) => shoe(c, 0.12, -0.12, C.red, 0, 'heel', 1.9)),
      }, 0);
      if (Q.detail) label(ctx, 43.8, 27.8, 2.0, '?', 0.42, C.ink);
    }, { on: DAY });
    // Stuck for the night by the glass: a mother and her boy, asleep on a
    // blanket.
    R.thing(40.1, 28.3, (ctx) => {
      rect(ctx, 37.5, 26.6, 2.6, 1.7, 0.01, C.purple, { lw: 0.02 });
      lieAlong(ctx, 39.2, 26.95, 0.05, asleep({ ...look(182), scale: 0.7 }));
      lieAlong(ctx, 40.0, 27.75, 0.05, asleep({ ...look(181), wear: coatOver(C.lilac) }));
    }, { on: NIGHT });

    // The tiny bottle of hot sauce, in a sock, in a tray, on the table.
    R.find({ id: 'hot-sauce', label: 'A tiny bottle of hot sauce', kind: 'hard', at: [31.85, 21.0, 1.05], r: 0.6, riddle: 'Under three ounces, technically.', hint: 'Somebody packed a sock with something spicy on the tray table.' });

    // ---------- The poster ----------
    // HAVE YOU SEEN THIS GOOSE? On an easel at the end of the maze: a goose,
    // drawn as carefully as the real one, with a mugshot's height lines.
    R.thing(51.0, 14.45, (ctx) => {
      for (const ly of [13.45, 14.35]) face(ctx, [[50.95, ly, 1.55], [50.95, ly + 0.06, 1.55], [50.7, ly + 0.06, 0], [50.7, ly, 0]], C.wood, { lw: 0.018 });
      face(ctx, [[50.95, 13.88, 1.8], [50.95, 13.94, 1.8], [50.3, 13.94, 0], [50.3, 13.88, 0]], shade(C.wood, 0.2), { lw: 0.018 });
      face(ctx, [[51.0, 14.45, 1.5], [51.0, 13.35, 1.5], [51.0, 13.35, 3.1], [51.0, 14.45, 3.1]], C.ink, { lw: 0.03 });
      onX(ctx, 51.003, 13.9, 2.3, (c) => {
        c.beginPath(); c.rect(-0.5, -0.84, 1.0, 1.68); paint(c, C.white, { lw: 0.02 });
        words(c, 'HAVE YOU SEEN', 0, -0.7, 0.1, C.red, { font: 'Bagel Fat One' });
        words(c, 'THIS GOOSE?', 0, -0.57, 0.13, C.red, { font: 'Bagel Fat One' });
        // height lines behind her
        c.strokeStyle = alpha(C.ink, 0.35); c.lineWidth = 0.012;
        c.beginPath(); for (let v = -0.4; v <= 0.38; v += 0.13) { c.moveTo(-0.42, v); c.lineTo(0.42, v); } c.stroke();
        c.save(); c.translate(0.02, 0.38); goose(c, 0, 0, 0, 0, { pose: 'stand', dir: 'l', scale: 0.72 }); c.restore();
        // and a guilty eyebrow
        c.beginPath(); c.moveTo(-0.26, -0.48); c.lineTo(-0.15, -0.44); c.strokeStyle = C.ink; c.lineWidth = 0.025; c.stroke();
        words(c, 'DO NOT FEED. DO NOT LET HER FLY.', 0, 0.55, 0.05, C.ink);
        words(c, 'REWARD: ONE BREAD ROLL', 0, 0.68, 0.07, C.ink);
      });
    });
    R.decoy({ id: 'poster', at: [50.9, 13.9, 2.3], r: 0.8, say: 'A poster. Even she looks guilty.' });
  },
};

// Lettering flat on the floor, its middle at (x, y).
function paintText(ctx, x, y, text, size, color) {
  if (!Q.detail) return;
  ctx.save();
  ctx.transform(1, 0.5, -1, 0.5, x - y, (x + y) / 2);
  words(ctx, text, 0, 0, size, color, { font: 'Bagel Fat One' });
  ctx.restore();
}
