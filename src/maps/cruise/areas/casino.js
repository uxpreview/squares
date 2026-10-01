// The Casino. The bow end of the Promenade: gold carpet, chandeliers, banks
// of slot machines, the roulette wheel, a blackjack table, the duty-free and
// a piano bar in the point of the bow, and the atrium's gangway desk on the
// cut side. It opens at 9: the retirees have queued since 7 with their cups
// of coins, and pour in. The man at the roulette wheel has put everything on
// green since day one. At 6pm it comes up. Keep the id: it's in links and saves.
import {
  C, Q, box, rect, disc, cylinder, face, poly, paint, paintText, person, speech, label, hash,
  shade, tint, alpha, dots, SKIN, HAIR,
} from '../../../engine/art.js';
import { route, particles, pulse, clamp } from '../../../engine/actors.js';
import { ZK } from '../../../engine/iso.js';
import { deck, outline } from '../ship.js';
import { board, lettering, porthole, bucket, P, CREW_LOOK } from '../kit.js';
import { INK, MAT, at, wrap, green, queasy, hourOf } from '../style.js';

// ---------- The day in here ----------
const OPEN = at(9); // the doors open (40s)
const SIX = at(18); // green comes up (220s)
const SPIN = 8; // a spin every 8 seconds from opening, landing 5 seconds in
const LAND = 5;
const GREEN_SPIN = Math.ceil((SIX - OPEN - LAND) / SPIN); // the first spin to land at 6pm or after
const GREEN_AT = OPEN + GREEN_SPIN * SPIN + LAND; // when it lands (221s)
const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

// A face at k green, in tenths (so the colour mixes stay few).
const qz = (skin, k) => queasy(skin, Math.round(k * 10) / 10);

// ---------- Where things are ----------
// The slot machines: a bank against the far wall (x 7 to 16) and a bank in
// the middle (x 11 to 16) with an aisle through it where Ray walks back to
// the door at 4pm. Their screens face the cut side (+y).
const TOPPERS = ['SEVEN SEAS', 'LUCKY CLOVER', 'GOLDEN GANDER', 'SHIP HAPPENS', 'LUCKY CLOVER', 'DEEP POCKETS', 'ALL YOU CAN WIN', 'LUCKY CLOVER', 'MAN OVERBOARD'];
const BODIES = [INK.funnelRed, C.navy, C.purple, C.teal];
const FAR = TOPPERS.map((name, i) => ({ x: 7 + i, y: 1.0, w: 0.95, d: 0.8, name, body: BODIES[i % 4], clover: name === 'LUCKY CLOVER' }));
const FRONT = [
  { x: 10.95, y: 6.6, w: 0.9, d: 0.8, name: 'LUCKY CLOVER', body: C.purple, clover: true, lever: true },
  { x: 13.25, y: 6.6, w: 0.9, d: 0.8, name: 'LUCKY CLOVER', body: C.navy, clover: true, prints: true },
  { x: 14.15, y: 6.6, w: 0.9, d: 0.8, name: 'BUFFET BONANZA', body: INK.funnelRed },
  { x: 15.05, y: 6.6, w: 0.9, d: 0.8, name: 'LUCKY CLOVER', body: C.teal, clover: true, lever: true },
];
const seatOf = (m) => [m.x + m.w / 2, m.y + m.d + (m.y < 2 ? 0.9 : 0.8)];

// The queue: the head at the rope, the rest in a line along the wall.
const DOOR_IN = [-0.3, 3.2];
const HEAD = [2.8, 4.5];
const GATE = [3.9, 4.7];
const spot = (i) => (i ? [2.0, 4.9 + i * 1.05] : HEAD);
// The retirees, in queue order: which machine each one makes for.
const RETIREES = [
  { m: FAR[4], sick: at(9.7), look: { hair: HAIR[4], style: 'curly', top: C.lilac, bottom: C.white } },
  { m: FRONT[0], sick: null, run: true, look: { hair: HAIR[4], style: 'bald', top: C.teal, bottom: C.grey, hat: 'sun' } },
  { m: FAR[5], sick: at(10.3), jackpot: true, look: { hair: HAIR[7], style: 'curly', top: C.pink, dress: true } },
  { m: FAR[2], sick: null, look: { hair: HAIR[4], style: 'short', top: C.mustard, bottom: C.navy } },
  { m: FRONT[3], sick: at(10.8), look: { hair: HAIR[4], style: 'bun', top: C.sky, dress: true } },
  { m: FAR[7], sick: at(9.9), run: true, look: { hair: HAIR[4], style: 'bald', top: C.coral, bottom: C.teal } },
  { m: FAR[8], sick: null, look: { hair: HAIR[4], style: 'curly', top: INK.flamingo, dress: true } },
];
// The roulette table (x 16.2 to 18.8, past the seam at 16), its wheel, and
// the two stools in front: Ray's (he's on the clock) and the man's.
const TABLE = { x0: 16.2, x1: 18.8, y0: 10, y1: 11.6, h: 0.95 };
const WHEEL = { x: 18.15, y: 10.8, z: 1.0, r: 0.52 };
const ZERO = [16.5, 10.8];
const MAN = [17.5, 12.1];
const RAY = [16, 12];
// The blackjack table and the gangway desk.
const BJ = { x0: 3, x1: 6, y0: 9, y1: 10.9, h: 0.88 };
const DESK = { x0: 10.5, x1: 13.5, y0: 13.2, y1: 14.4, h: 1.1 };

// ---------- Drawing helpers ----------
// Draw on an upright plane at y (u along x, v up), or flat at height z
// (u along x, v along y).
function onY(ctx, y, fn) {
  ctx.save();
  const [X, Y] = P(0, y, 0);
  ctx.transform(1, 0.5, 0, -ZK, X, Y);
  fn();
  ctx.restore();
}
function onZ(ctx, z, fn) {
  ctx.save();
  ctx.transform(1, 0.5, -1, 0.5, 0, -z * ZK);
  fn();
  ctx.restore();
}
// The left wall (x 0): u along y, v up.
function onL(ctx, fn) {
  ctx.save();
  ctx.transform(-1, 0.5, 0, -ZK, 0, 0);
  fn();
  ctx.restore();
}
// The far wall at the bow, angling in: it runs from (16, 0) to (32, 8), so a
// point x along it sits at y (x - 16) / 2. u along the wall (in units of x).
const bowY = (x) => (x - 16) / 2;
function onBow(ctx, x, z, fn, text = false) {
  ctx.save();
  const [X, Y] = P(x, bowY(x), z);
  ctx.transform(1 - 0.5, 0.5 + 0.25, 0, text ? ZK : -ZK, X, Y);
  fn();
  ctx.restore();
}
// Text flat on a surface at height z, centred on (x, y).
function textFlat(ctx, x, y, z, text, size, color, font = 'Rethink Sans') {
  if (!Q.detail) return;
  ctx.save();
  ctx.transform(1, 0.5, -1, 0.5, x - y, (x + y) / 2 - z * ZK);
  const k = 40;
  ctx.scale(1 / k, 1 / k);
  ctx.font = `700 ${size * k}px "${font}", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
// A path through points, walked from t0 at speed, as a function of the day's w.
function walk(pts, t0, speed) {
  const segs = [];
  let T = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const d = Math.hypot(bx - ax, by - ay) / speed;
    segs.push({ t0: T, d, ax, ay, bx, by });
    T += d;
  }
  const look = (g) => {
    const dx = g.bx - g.ax, dy = g.by - g.ay;
    return { dir: dx - dy >= 0 ? 'r' : 'l', back: dx + dy < -0.01 };
  };
  const f = (w) => {
    const s = w - t0;
    if (s <= 0) return { x: pts[0][0], y: pts[0][1], moving: false, ...look(segs[0]) };
    if (s >= T) { const g = segs[segs.length - 1]; return { x: g.bx, y: g.by, moving: false, done: true, ...look(g) }; }
    const g = segs.find((q) => s < q.t0 + q.d) || segs[segs.length - 1];
    const k = (s - g.t0) / g.d;
    return { x: g.ax + (g.bx - g.ax) * k, y: g.ay + (g.by - g.ay) * k, moving: true, ...look(g) };
  };
  f.T = T;
  return f;
}

// A cup of coins, held.
function coinCup(c) {
  c.beginPath();
  c.moveTo(-0.12, -0.3); c.lineTo(0.12, -0.3); c.lineTo(0.09, 0); c.lineTo(-0.09, 0);
  c.closePath();
  paint(c, C.white, { lw: 0.02 });
  c.beginPath();
  c.ellipse(0, -0.32, 0.13, 0.06, 0, 0, Math.PI * 2);
  paint(c, MAT.brass, { lw: 0.02 });
}
// A black waistcoat and bow tie, for the croupier, the dealer and the pianist.
function waistcoat(color = C.black) {
  return (c, b) => {
    c.beginPath();
    c.moveTo(-0.24, b.top + 0.05); c.lineTo(-0.02, b.top + 0.4); c.lineTo(0.2, b.top + 0.05);
    c.lineTo(0.26, b.hipY); c.lineTo(-0.28, b.hipY);
    c.closePath();
    paint(c, color, { stroke: false });
    c.fillStyle = INK.funnelRed;
    c.beginPath(); c.moveTo(-0.14, b.top + 0.02); c.lineTo(0.12, b.top + 0.14); c.lineTo(0.12, b.top + 0.02); c.lineTo(-0.14, b.top + 0.14); c.fill();
  };
}
// A security cap, navy with a brass badge.
function secCap(c, hy) {
  c.beginPath();
  c.ellipse(0.02, hy - 0.22, 0.32, 0.12, 0, 0, Math.PI * 2);
  paint(c, C.navy, { lw: 0.03 });
  c.beginPath();
  c.ellipse(0.26, hy - 0.15, 0.16, 0.045, 0.2, 0, Math.PI * 2);
  paint(c, C.black, { lw: 0.02 });
  c.fillStyle = MAT.brass;
  c.fillRect(0.04, hy - 0.3, 0.08, 0.08);
}

// A slot machine, standing on the floor, its screen facing the cut side.
function slot(ctx, m) {
  const { x, y, w, d, body } = m, x1 = x + w, y1 = y + d;
  box(ctx, x, y, 0, w, d, 2.15, body, { dens: 0.2 });
  // The topper, a lit sign with the machine's name.
  box(ctx, x - 0.02, y + 0.05, 2.15, w + 0.04, d - 0.1, 0.34, INK.sunYellow, { flat: true, lw: 0.03 });
  lettering(ctx, 'x', x + w / 2, y1 - 0.04, 2.31, m.name, m.name.length > 11 ? 0.085 : 0.1, C.ink);
  // The belly glass, the button deck, the coin tray and the screen.
  face(ctx, [[x + 0.1, y1, 0.35], [x1 - 0.1, y1, 0.35], [x1 - 0.1, y1, 0.8], [x + 0.1, y1, 0.8]], tint(body, 0.35), { lw: 0.025 });
  box(ctx, x + 0.06, y1, 0.88, w - 0.12, 0.22, 0.1, MAT.chrome, { flat: true, lw: 0.025 });
  box(ctx, x + 0.25, y1, 0.2, w - 0.5, 0.12, 0.1, MAT.chrome, { flat: true, lw: 0.02 });
  face(ctx, [[x + 0.08, y1, 1.08], [x1 - 0.08, y1, 1.08], [x1 - 0.08, y1, 1.95], [x + 0.08, y1, 1.95]], MAT.chrome, { lw: 0.03 });
  face(ctx, [[x + 0.13, y1, 1.13], [x1 - 0.13, y1, 1.13], [x1 - 0.13, y1, 1.9], [x + 0.13, y1, 1.9]], shade(C.navy, 0.35), { lw: 0.02 });
  if (Q.detail) {
    // The buttons, and the belly glass's picture: a fan of cards.
    for (let i = 0; i < 3; i++) {
      const [X, Y] = P(x + 0.25 + i * 0.22, y1 + 0.12, 0.98);
      ctx.fillStyle = [INK.funnelRed, INK.sunYellow, C.white][i];
      ctx.beginPath(); ctx.ellipse(X, Y, 0.06, 0.03, 0, 0, Math.PI * 2); ctx.fill();
    }
    lettering(ctx, 'x', x + w / 2, y1 + 0.005, 0.57, m.clover ? '4 LEAF' : 'JACKPOT', 0.09, C.white);
  }
  if (m.lever) {
    const [A, B] = P(x1 + 0.06, y + 0.45, 1.1), [E, F] = P(x1 + 0.06, y + 0.45, 1.95);
    ctx.beginPath(); ctx.moveTo(A, B); ctx.lineTo(E, F);
    ctx.lineCap = 'round';
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.stroke();
    ctx.strokeStyle = MAT.chrome; ctx.lineWidth = 0.05; ctx.stroke();
    ctx.beginPath(); ctx.arc(E, F, 0.09, 0, Math.PI * 2); paint(ctx, INK.funnelRed, { lw: 0.025 });
  }
}

// What's on a slot machine's screen, and its topper lights: reels (spinning
// while someone plays), clover stickers on some, and on one, small green
// handprints at a child's height.
function slotLive(ctx, t, m, playing) {
  const { x, y, w, d } = m, y1 = y + d;
  const w8 = wrap(t);
  // Topper bulbs, chasing.
  for (let i = 0; i < 5; i++) {
    const on = (i + Math.floor(t * 4 + x * 3)) % 3 === 0;
    const [X, Y] = P(x + 0.1 + i * (w - 0.2) / 4, y1 - 0.04, 2.19);
    ctx.fillStyle = on ? C.white : shade(INK.sunYellow, 0.3);
    ctx.beginPath(); ctx.arc(X, Y, 0.035, 0, Math.PI * 2); ctx.fill();
  }
  if (!Q.detail) return;
  const spinning = playing && pulse(t + x * 1.7, 3.4) < 0.35;
  const n = Math.floor((t + x * 1.7) / 3.4);
  onY(ctx, y1 + 0.005, () => {
    for (let j = 0; j < 3; j++) {
      const u0 = x + 0.18 + j * (w - 0.36) / 3, u1 = u0 + (w - 0.36) / 3 - 0.03;
      ctx.beginPath(); ctx.rect(u0, 1.3, u1 - u0, 0.38);
      ctx.fillStyle = C.white; ctx.fill();
      const cu = (u0 + u1) / 2;
      if (spinning) {
        ctx.fillStyle = alpha(C.grey, 0.8);
        for (let k = 0; k < 3; k++) ctx.fillRect(u0 + 0.02, 1.33 + ((t * 3 + k * 0.13 + j * 0.07) % 0.34), u1 - u0 - 0.04, 0.03);
      } else {
        const s = Math.floor(hash(Math.floor(x * 10) + j * 31, n) * 5);
        symbol(ctx, s, cu, 1.49);
      }
    }
    if (m.clover) clover(ctx, x + w - 0.24, 1.78);
    if (m.prints) {
      // Two small hands and a thumb's smear, sticky, low on the glass.
      hand(ctx, x + 0.3, 1.5, -0.2);
      hand(ctx, x + 0.62, 1.63, 0.15);
      ctx.beginPath(); ctx.moveTo(x + 0.44, 1.3); ctx.quadraticCurveTo(x + 0.5, 1.22, x + 0.6, 1.24);
      ctx.strokeStyle = alpha(INK.queasyGreen, 0.8); ctx.lineWidth = 0.035; ctx.lineCap = 'round'; ctx.stroke();
    }
  });
  // A win: coins fountain out of the tray.
  if (playing === 'jackpot') {
    const k = pulse(w8, 37, 5);
    if (k < 0.14) {
      particles(t, 10, 1, (a, r) => {
        const [X, Y] = P(x + 0.2 + r() * 0.5, y1 + 0.15 + a * 0.6, 0.35 + a * 1.6 - a * a * 2.2);
        ctx.beginPath(); ctx.ellipse(X, Y, 0.06, 0.04, 0, 0, Math.PI * 2);
        paint(ctx, MAT.brass, { lw: 0.015 });
      }, 21);
    }
  }
}
// Reel symbols, drawn upright on a screen (v up): cherry, lemon, 7, bar, bell.
function symbol(ctx, s, u, v) {
  ctx.lineWidth = 0.02;
  if (s === 0) {
    for (const du of [-0.035, 0.035]) { ctx.beginPath(); ctx.arc(u + du, v - 0.04, 0.035, 0, Math.PI * 2); ctx.fillStyle = C.red; ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(u - 0.035, v - 0.01); ctx.lineTo(u, v + 0.08); ctx.lineTo(u + 0.035, v - 0.01);
    ctx.strokeStyle = C.brown; ctx.stroke();
  } else if (s === 1) {
    ctx.beginPath(); ctx.ellipse(u, v, 0.065, 0.045, 0, 0, Math.PI * 2); ctx.fillStyle = INK.sunYellow; ctx.fill();
  } else if (s === 2) {
    ctx.beginPath(); ctx.moveTo(u - 0.05, v + 0.07); ctx.lineTo(u + 0.05, v + 0.07); ctx.lineTo(u - 0.01, v - 0.08);
    ctx.strokeStyle = INK.funnelRed; ctx.lineWidth = 0.035; ctx.stroke();
  } else if (s === 3) {
    ctx.fillStyle = C.ink; ctx.fillRect(u - 0.07, v - 0.03, 0.14, 0.06);
  } else {
    ctx.beginPath(); ctx.arc(u, v, 0.055, 0, Math.PI); ctx.lineTo(u - 0.055, v); ctx.fillStyle = MAT.brass; ctx.fill();
  }
}
// A four-leaf clover sticker (leaf green, not the clue colour).
function clover(ctx, u, v) {
  ctx.fillStyle = C.leaf;
  for (const [du, dv] of [[-0.03, 0], [0.03, 0], [0, 0.03], [0, -0.03]]) { ctx.beginPath(); ctx.arc(u + du, v + dv, 0.028, 0, Math.PI * 2); ctx.fill(); }
}
// A small handprint on glass (v up), tilted by a: a palm and four fingers.
function hand(ctx, u, v, a) {
  ctx.save();
  ctx.translate(u, v);
  ctx.rotate(a);
  ctx.fillStyle = alpha(INK.queasyGreen, 0.85);
  ctx.beginPath(); ctx.ellipse(0, 0, 0.065, 0.07, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = alpha(INK.queasyGreen, 0.85); ctx.lineCap = 'round'; ctx.lineWidth = 0.028;
  ctx.beginPath();
  for (const [fu, len] of [[-0.045, 0.07], [-0.015, 0.09], [0.015, 0.09], [0.045, 0.07]]) { ctx.moveTo(fu, 0.05); ctx.lineTo(fu * 1.2, 0.05 + len); }
  ctx.moveTo(0.06, 0); ctx.lineTo(0.11, 0.04);
  ctx.stroke();
  ctx.restore();
}

// A bar stool: a brass post and a red seat, the seat at 0.72.
function stool(ctx, x, y) {
  disc(ctx, x, y, 0, 0.24, MAT.brass, { lw: 0.02 });
  cylinder(ctx, x, y, 0, 0.05, 0.64, MAT.brass, { flat: true, stroke: false });
  cylinder(ctx, x, y, 0.62, 0.27, 0.1, MAT.carpetRed, { flat: true, top: tint(MAT.carpetRed, 0.15) });
}

// A chandelier hanging from the deck above.
function chandelier(ctx, x, y) {
  const top = 7.0, ring = 6.2; // high, so the ring doesn't hang over anyone's head
  const [A, B] = P(x, y, top), [E, F] = P(x, y, ring + 0.35);
  ctx.beginPath(); ctx.moveTo(A, B); ctx.lineTo(E, F);
  ctx.strokeStyle = MAT.brass; ctx.lineWidth = 0.05; ctx.stroke();
  disc(ctx, x, y, top, 0.2, MAT.brass, { lw: 0.02 });
  // The drops, hanging from the ring, then the ring and its candles.
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const [X, Y] = P(x + Math.cos(a) * 0.62, y + Math.sin(a) * 0.62, ring);
    ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X - 0.06, Y + 0.18); ctx.lineTo(X, Y + 0.32); ctx.lineTo(X + 0.06, Y + 0.18); ctx.closePath();
    paint(ctx, tint(MAT.glass, 0.4), { lw: 0.015 });
  }
  const [cx, cy] = P(x, y, ring);
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + 0.45);
  ctx.strokeStyle = MAT.brass; ctx.lineWidth = 0.05; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy + 0.5, 0.09, 0, Math.PI * 2); paint(ctx, tint(MAT.glass, 0.4), { lw: 0.02 });
  ctx.beginPath(); ctx.ellipse(cx, cy, 0.62 * Math.SQRT2, 0.31 * Math.SQRT2, 0, 0, Math.PI * 2);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.stroke();
  ctx.strokeStyle = MAT.brass; ctx.lineWidth = 0.06; ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const px = x + Math.cos(a) * 0.62, py = y + Math.sin(a) * 0.62;
    cylinder(ctx, px, py, ring, 0.035, 0.25, C.white, { flat: true, stroke: false });
    const [X, Y] = P(px, py, ring + 0.3);
    ctx.beginPath(); ctx.ellipse(X, Y, 0.04, 0.07, 0, 0, Math.PI * 2); ctx.fillStyle = C.butter; ctx.fill();
  }
}

// A giant chocolate bar: a long triangular prism along x, no name on it.
function toblong(ctx, x, y, z, len = 0.9, s = 0.24, wrap0 = C.brown) {
  const h = s * 0.9;
  face(ctx, [[x, y + s, z], [x + len, y + s, z], [x + len, y + s / 2, z + h], [x, y + s / 2, z + h]], tint(wrap0, 0.1), { lw: 0.02 });
  face(ctx, [[x + len, y, z], [x + len, y + s, z], [x + len, y + s / 2, z + h]], shade(wrap0, 0.2), { lw: 0.02 });
  if (!Q.detail) return;
  // A gold band round the middle, and the peaks.
  const m = x + len * 0.35;
  face(ctx, [[m, y + s, z], [m + 0.18, y + s, z], [m + 0.18, y + s / 2, z + h], [m, y + s / 2, z + h]], MAT.brass, { stroke: false });
}
// A perfume bottle.
function perfume(ctx, x, y, z, juice) {
  box(ctx, x - 0.07, y - 0.07, z, 0.14, 0.14, 0.2, juice, { flat: true, lw: 0.015 });
  cylinder(ctx, x, y, z + 0.2, 0.035, 0.08, MAT.brass, { flat: true, stroke: false });
}
// A can of Gander Cola.
function can(ctx, x, y, z) {
  cylinder(ctx, x, y, z, 0.09, 0.22, INK.funnelRed, { flat: true, top: MAT.chrome, lw: 0.015 });
  if (Q.detail) { const [X, Y] = P(x, y, z + 0.11); ctx.fillStyle = C.white; ctx.fillRect(X - 0.08, Y - 0.015, 0.16, 0.03); }
}

export default {
  id: 'casino',
  name: 'The Casino',
  blurb: 'Open at 9am, with a queue at 8:59. The man at the roulette wheel has put everything on green since day one.',

  build(R) {
    deck(R, 'casino', 'promenade', { floor: MAT.carpetGold, wall: shade(MAT.carpetRed, 0.05), grid: false, name: false });

    // ---------- The floor ----------
    // Gold carpet with a lattice of red diamonds; marble round the gangway.
    R.floor((ctx) => {
      ctx.save();
      poly(ctx, outline(R).map(([x, y]) => [x, y, 0]));
      ctx.clip();
      poly(ctx, [[0, 0, 0], [R.W, 0, 0], [R.W, R.D, 0], [0, R.D, 0]]);
      if (Q.detail) { ctx.fillStyle = dots(shade(MAT.carpetGold, 0.3), 0.1); ctx.fill(); }
      ctx.beginPath();
      for (let k = -16; k < 32; k += 1.4) {
        const a = P(k, 0), b = P(k + 16, 16), c = P(k, 16), e = P(k + 16, 0);
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
        ctx.moveTo(c[0], c[1]); ctx.lineTo(e[0], e[1]);
      }
      ctx.strokeStyle = alpha(MAT.carpetRed, 0.35); ctx.lineWidth = 0.05; ctx.stroke();
      if (Q.detail) {
        ctx.fillStyle = alpha(MAT.carpetRed, 0.55);
        for (let x = 0.7; x < R.W; x += 1.4) for (let y = 0.7; y < R.D; y += 1.4) {
          const [X, Y] = P(x, y);
          ctx.beginPath(); ctx.moveTo(X, Y - 0.12); ctx.lineTo(X + 0.2, Y); ctx.lineTo(X, Y + 0.12); ctx.lineTo(X - 0.2, Y); ctx.fill();
        }
      }
      // The atrium: marble squares and a brass edge.
      rect(ctx, 8.6, 12.2, 7.4, 3.8, 0.002, C.white, { stroke: false });
      for (let x = 8.6; x < 16; x += 0.925) for (let y = 12.2; y < 16; y += 0.95) {
        if ((Math.round((x - 8.6) / 0.925) + Math.round((y - 12.2) / 0.95)) % 2) rect(ctx, x, y, 0.925, 0.95, 0.003, tint(INK.teak, 0.55), { stroke: false });
      }
      face(ctx, [[8.6, 16, 0.004], [8.6, 12.2, 0.004], [16, 12.2, 0.004]], null, { lw: 0.08, stroke: MAT.brass });
      ctx.restore();
      // The mat at the door, footprints to queue on, and the floor's words.
      rect(ctx, 0.2, 1.9, 1.3, 2.6, 0.005, MAT.carpetRed, { lw: 0.03 });
      textFlat(ctx, 0.85, 3.2, 0.006, 'GOOD LUCK', 0.2, MAT.carpetGold);
      if (Q.detail) {
        ctx.fillStyle = alpha(C.ink, 0.3);
        for (let i = 1; i < 7; i++) for (const dx of [-0.12, 0.12]) {
          const [X, Y] = P(2.0 + dx, 4.9 + i * 1.05);
          ctx.beginPath(); ctx.ellipse(X, Y, 0.07, 0.035, 0, 0, Math.PI * 2); ctx.fill();
        }
      }
      textFlat(ctx, 2.0, 11.6, 0.006, 'QUEUE HERE', 0.26, alpha(C.ink, 0.55));
      textFlat(ctx, 2.0, 12.0, 0.006, '(SINCE 7AM)', 0.18, alpha(C.ink, 0.55));
    });

    // ---------- The walls ----------
    // The bulkhead to the buffet: a clock over the door, a painting of gulls
    // playing poker, and a notice nobody reads.
    R.decor((ctx) => {
      onLeft0(ctx, 6.9, 3.1, 3.6, 1.9, MAT.brass);
      onLeft0(ctx, 7.05, 3.25, 3.3, 1.6, C.green);
      onL(ctx, () => {
        // A green baize table and three gulls round it.
        ctx.beginPath(); ctx.ellipse(8.7, 3.6, 1.1, 0.22, 0, 0, Math.PI * 2);
        paint(ctx, C.brown, { lw: 0.02 });
        for (const [u, s] of [[7.8, 1], [8.7, -1], [9.6, -1]]) {
          ctx.beginPath(); ctx.ellipse(u, 4.1, 0.28, 0.3, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.02 });
          ctx.beginPath(); ctx.arc(u + 0.1 * s, 4.5, 0.14, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.02 });
          ctx.beginPath(); ctx.moveTo(u + 0.2 * s, 4.52); ctx.lineTo(u + 0.38 * s, 4.47); ctx.lineTo(u + 0.2 * s, 4.44); ctx.fillStyle = C.mustard; ctx.fill();
        }
        ctx.fillStyle = C.white;
        for (const u of [8.4, 8.6, 8.9]) ctx.fillRect(u, 3.62, 0.12, 0.16);
      });
      // Notices.
      onLeft0(ctx, 11.6, 1.7, 3.2, 1.2, C.white);
      paintText(ctx, 'left', 13.2, 2.55, 'PLEASE: NO BUCKETS', 0.26, C.ink, 'Rethink Sans');
      paintText(ctx, 'left', 13.2, 2.2, 'AT THE TABLES', 0.26, C.ink, 'Rethink Sans');
      paintText(ctx, 'left', 13.2, 1.9, 'The Management', 0.16, C.ink, 'Rethink Sans');
      onLeft0(ctx, 5.4, 1.6, 1.3, 0.9, INK.sunYellow);
      paintText(ctx, 'left', 6.05, 2.2, 'OPEN', 0.22, C.ink, 'Rethink Sans');
      paintText(ctx, 'left', 6.05, 1.9, '9AM TO ?', 0.2, C.ink, 'Rethink Sans');
    });
    // The clock over the door, keeping the queue honest.
    R.decor((ctx, t) => {
      const h = hourOf(t), cu = 3.2, cv = 4.75;
      onL(ctx, () => {
        ctx.beginPath(); ctx.arc(cu, cv, 0.5, 0, Math.PI * 2); paint(ctx, MAT.brass, { lw: 0.03 });
        ctx.beginPath(); ctx.arc(cu, cv, 0.4, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.02 });
        const ha = ((h % 12) / 12) * Math.PI * 2, ma = ((h % 1)) * Math.PI * 2;
        ctx.lineCap = 'round'; ctx.strokeStyle = C.ink;
        ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(cu, cv); ctx.lineTo(cu - Math.sin(ha) * 0.22, cv + Math.cos(ha) * 0.22); ctx.stroke();
        ctx.lineWidth = 0.03; ctx.beginPath(); ctx.moveTo(cu, cv); ctx.lineTo(cu - Math.sin(ma) * 0.34, cv + Math.cos(ma) * 0.34); ctx.stroke();
      });
    }, { anim: true });

    // The hull (the far wall, drawn by the ship as a standing piece at the bow,
    // so what hangs on it stands just in front): portholes, the ATM, and the
    // big CASINO sign over the far bank of slots.
    R.thing(4, 0.1, (ctx) => {
      for (const x of [1.4, 3.1, 4.8]) porthole(ctx, x, 4.3, 0.42);
      // The ATM, recessed.
      box(ctx, 5.1, 0.05, 0, 1.0, 0.7, 1.95, MAT.chrome, { dens: 0.15 });
      face(ctx, [[5.25, 0.75, 1.1], [5.95, 0.75, 1.1], [5.95, 0.75, 1.6], [5.25, 0.75, 1.6]], C.navy, { lw: 0.02 });
      lettering(ctx, 'x', 5.6, 0.76, 1.78, 'CASH', 0.13, C.ink);
      lettering(ctx, 'x', 5.6, 0.76, 1.44, 'INSUFFICIENT', 0.065, C.white);
      lettering(ctx, 'x', 5.6, 0.76, 1.33, 'FUNDS. TRY', 0.065, C.white);
      lettering(ctx, 'x', 5.6, 0.76, 1.22, 'ROULETTE.', 0.065, INK.sunYellow);
      box(ctx, 5.3, 0.75, 0.95, 0.6, 0.12, 0.06, shade(MAT.chrome, 0.2), { flat: true, lw: 0.02 });
    }, { depth: -0.5 });
    R.thing(11.5, 0.1, (ctx) => {
      face(ctx, [[7.9, 0.02, 3.05], [15.1, 0.02, 3.05], [15.1, 0.02, 5.05], [7.9, 0.02, 5.05]], C.navy, { lw: 0.05 });
      lettering(ctx, 'x', 11.5, 0.03, 4.35, 'CASINO', 0.95, INK.sunYellow, 'Bagel Fat One');
      lettering(ctx, 'x', 11.5, 0.03, 3.55, 'THE HOUSE ALWAYS WINS. SO DOES THE BUFFET.', 0.2, C.white);
    }, { depth: -0.5 });
    // Its bulbs, chasing round the edge.
    R.thing(11.5, 0.12, (ctx, t) => {
      const n = Math.floor(t * 5);
      const bulb = (x, z, i) => {
        const [X, Y] = P(x, 0.03, z);
        ctx.fillStyle = (i + n) % 3 ? shade(INK.sunYellow, 0.25) : C.white;
        ctx.beginPath(); ctx.arc(X, Y, 0.055, 0, Math.PI * 2); ctx.fill();
      };
      let i = 0;
      for (let x = 8.1; x < 15; x += 0.35) { bulb(x, 4.92, i++); }
      for (let z = 4.75; z > 3.1; z -= 0.33) bulb(14.95, z, i++);
      for (let x = 14.8; x > 8; x -= 0.35) bulb(x, 3.18, i++);
      for (let z = 3.35; z < 4.9; z += 0.33) bulb(8.05, z, i++);
    }, { anim: true, depth: -0.4 });
    // The bow's wall, angling in: portholes, and the piano bar's sign.
    R.thing(24, bowY(24) + 0.1, (ctx) => {
      for (const x of [18, 21, 29]) {
        onBow(ctx, x, 4.2, () => {
          ctx.beginPath(); ctx.arc(0, 0, 0.54, 0, Math.PI * 2); paint(ctx, MAT.brass, { lw: 0.04 });
          ctx.beginPath(); ctx.arc(0, 0, 0.42, 0, Math.PI * 2); paint(ctx, INK.sea, { lw: 0.03 });
          ctx.beginPath(); ctx.arc(-0.12, 0.12, 0.1, 0, Math.PI * 2); ctx.fillStyle = alpha(C.white, 0.5); ctx.fill();
        });
      }
      onBow(ctx, 25, 3.3, () => {
        ctx.beginPath(); ctx.rect(-2, -0.75, 4, 1.5); paint(ctx, C.navy, { lw: 0.04 });
      });
      onBow(ctx, 25, 3.3, () => {
        if (!Q.detail) return;
        ctx.scale(1 / 40, 1 / 40);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = INK.sunYellow; ctx.font = '22px "Bagel Fat One", sans-serif';
        ctx.fillText('PIANO BAR', 0, -9);
        ctx.fillStyle = C.white; ctx.font = '700 9px "Rethink Sans", sans-serif';
        ctx.fillText('REQUESTS $5. STOPPING $20.', 0, 14);
      }, true);
    }, { depth: -0.5 });

    // ---------- The chandeliers ----------
    const CHANDELIERS = [[7.4, 7.2], [14.6, 4.9], [21.6, 9.6]];
    for (const [x, y] of CHANDELIERS) R.thing(x, y, (ctx) => chandelier(ctx, x, y));
    // Each one throws a pool of light on the carpet under it.
    R.rug((ctx) => {
      for (const [x, y] of CHANDELIERS) {
        disc(ctx, x, y, 0.004, 1.9, alpha(C.butter, 0.22), { stroke: false });
        disc(ctx, x, y, 0.005, 1.1, alpha(C.white, 0.16), { stroke: false });
      }
    });
    R.air((ctx, t) => {
      if (!Q.detail) return;
      CHANDELIERS.forEach(([x, y], j) => particles(t, 3, 1.4, (k, r) => {
        const a = r() * Math.PI * 2;
        const [X, Y] = P(x + Math.cos(a) * 0.62, y + Math.sin(a) * 0.62, 6.1 + r() * 0.2);
        const s = Math.sin(k * Math.PI) * 0.14;
        ctx.strokeStyle = alpha(C.white, 0.95); ctx.lineWidth = 0.03;
        ctx.beginPath(); ctx.moveTo(X - s, Y); ctx.lineTo(X + s, Y); ctx.moveTo(X, Y - s); ctx.lineTo(X, Y + s); ctx.stroke();
      }, 40 + j));
    });

    // ---------- The rope, and the queue ----------
    // Two brass posts and a velvet rope with a sign on it, unhooked at 9.
    for (const y of [1.6, 6.2]) {
      R.thing(3.4, y, (ctx) => {
        disc(ctx, 3.4, y, 0, 0.2, MAT.brass, { lw: 0.02 });
        cylinder(ctx, 3.4, y, 0, 0.05, 1.0, MAT.brass, { flat: true, stroke: false });
        disc(ctx, 3.4, y, 1.02, 0.08, MAT.brass, { lw: 0.02 });
      });
    }
    R.thing(3.45, 6.25, (ctx, t) => {
      const w = wrap(t);
      ctx.lineCap = 'round';
      const draw = (pts) => {
        ctx.beginPath();
        pts.forEach(([x, y, z], i) => { const [X, Y] = P(x, y, z); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.13; ctx.stroke();
        ctx.strokeStyle = MAT.carpetRed; ctx.lineWidth = 0.08; ctx.stroke();
      };
      if (w < OPEN - 0.6) {
        const pts = [];
        for (let i = 0; i <= 10; i++) { const k = i / 10; pts.push([3.4, 1.6 + 4.6 * k, 0.98 - Math.sin(k * Math.PI) * 0.35]); }
        draw(pts);
        board(ctx, 'x', 3.4, 3.9, 0.45, 0.9, 0.42, '', { board: C.white, edge: 0.03 });
        lettering(ctx, 'x', 3.4, 3.9, 0.52, 'OPENS 9AM', 0.12);
        lettering(ctx, 'x', 3.4, 3.9, 0.36, 'NOT 8:59', 0.09);
      } else {
        // Unhooked: it hangs from the far post, and the sign's on the floor.
        draw([[3.4, 1.6, 0.98], [3.42, 1.75, 0.4], [3.5, 1.95, 0.03], [3.55, 2.5, 0.02]]);
        rect(ctx, 3.55, 2.6, 0.9, 0.42, 0.01, C.white, { lw: 0.02 });
      }
    }, { anim: true });

    // The attendant on the rope: watch, watch, watch, and at 9 he unhooks it
    // and gets out of the way.
    const ROPE_MAN = { skin: SKIN[3], hair: HAIR[6], style: 'short', ...CREW_LOOK, bottom: C.ink };
    R.mover((t) => {
      const w = wrap(t);
      if (w < OPEN - 1.2) return { x: 3.95, y: 3.3, dir: 'l', pose: 'watch' };
      if (w < OPEN) return { x: 3.95, y: 3.3 - (w - OPEN + 1.2) * 0.3, dir: 'l', pose: 'point' };
      const k = clamp((w - OPEN) / 1.2);
      return { x: 3.95 + 0.4 * k, y: 2.94 - 1.5 * k, dir: 'r', pose: k < 1 ? 'walk' : 'stand', back: k < 1 };
    }, (ctx, t, p) => {
      const w = wrap(t);
      person(ctx, p.x, p.y, 0, {
        ...ROPE_MAN, pose: p.pose === 'watch' ? 'stand' : p.pose, dir: p.dir, back: p.back,
        arms: p.pose === 'watch' ? [1.9, 0.2] : p.pose === 'stand' ? [0.3, -0.3] : undefined, wear: waistcoat(C.navy),
      }, t);
      if (Q.detail && w > OPEN - 3.2 && w < OPEN - 0.3) speech(ctx, p.x, p.y, 3.0, 'Not yet.', { size: 0.36 });
    });

    // The retirees: in through the door from 7, one by one, into the queue;
    // at 9 they pour in, each to a machine they've had since Monday, and feed
    // it all day. At 6pm they're up on their feet for the man at the wheel.
    RETIREES.forEach((r, i) => {
      const s = spot(i);
      const tA = 3 + i * 4.4;
      const arrive = walk(i ? [DOOR_IN, [1.3, 3.9], [1.2, s[1]], s] : [DOOR_IN, [1.4, 3.7], HEAD], tA, 1.2);
      const [sx, sy] = seatOf(r.m);
      const far = r.m.y < 2;
      const approach = far ? [[sx, 4.9], [sx, sy]]
        : sx < 12.5 ? [[10.4, 5.1], [10.4, 8.4], [sx, sy]]
          : [[12.65, 5.2], [12.65, 8.5], [sx, sy]];
      const tP = OPEN + i * 0.6;
      const pour = walk([s, ...(i ? [[2.0, 5.0]] : []), GATE, ...approach], tP, r.run ? 2.8 : 2.2);
      r.seated = tP + pour.T;
      const look = { ...r.look, skin: SKIN[(i * 2) % 6], bottom: r.look.bottom || C.white };
      R.thing(sx, sy - 0.08, (ctx) => stool(ctx, sx, sy));
      R.mover((t) => {
        const w = wrap(t);
        if (w < tA) return { x: DOOR_IN[0], y: DOOR_IN[1], hidden: true };
        if (w < tP) {
          const p = arrive(w);
          if (!p.done) return { ...p, pose: 'walk', a: clamp((p.x + 0.3) / 1.1) };
          return { x: p.x, y: p.y, pose: 'stand', dir: 'r', back: i > 0, queue: true };
        }
        if (w < r.seated) { const p = pour(w); return { ...p, pose: r.run ? 'run' : 'walk' }; }
        if (w > GREEN_AT + 1 && w < GREEN_AT + 16) return { x: sx, y: sy + 0.65, pose: 'cheer', dir: 'r', back: false }; // up off the stool
        return { x: sx, y: sy + 0.05, pose: 'sit', dir: 'r', back: true, playing: true };
      }, (ctx, t, p) => {
        if (p.hidden) return;
        const w = wrap(t);
        ctx.save();
        if (p.a != null) ctx.globalAlpha *= p.a;
        const feed = p.playing ? [1.9 + Math.sin(t * 2.4 + i) * 0.35, 0.5] : undefined;
        const win = r.jackpot && p.playing && pulse(w, 37, 5) < 0.14;
        person(ctx, p.x, p.y, 0, {
          ...look, skin: qz(look.skin, green(t, r.sick)), pose: p.pose, dir: p.dir, back: p.back,
          arms: win ? [Math.PI - 0.45 + Math.sin(t * 9) * 0.15, -Math.PI + 0.45] : feed, speed: p.pose === 'run' ? 9 : 6, phase: i * 1.3,
          hold: p.pose === 'cheer' || win ? undefined : coinCup,
        }, t);
        ctx.restore();
        if (!Q.detail) return;
        if (i === 0 && p.queue && w > OPEN - 6.5 && w < OPEN - 3.4) speech(ctx, p.x, p.y, 2.9, "It's 8:59!", { size: 0.36 });
        if (i === 4 && p.queue && w > 18 && w < 22) speech(ctx, p.x, p.y, 2.9, 'I was here first.', { size: 0.32 });
        if (win && pulse(w, 37, 5) > 0.04) speech(ctx, p.x, p.y, 3.1, 'Again!', { size: 0.34 });
      });
    });

    // ---------- The slots ----------
    // Who's playing which machine (and the man asleep at the first one since
    // last night, who never wakes up to play it).
    const playing = (m, w) => {
      const r = RETIREES.find((q) => q.m === m);
      if (!r || w < r.seated || (w > GREEN_AT + 1 && w < GREEN_AT + 16)) return false;
      return r.jackpot ? 'jackpot' : true;
    };
    for (const m of [...FAR, ...FRONT]) {
      const cx = m.x + m.w / 2, cy = m.y + m.d;
      R.thing(cx, cy, (ctx) => slot(ctx, m));
      R.thing(cx, cy + 0.01, (ctx, t) => slotLive(ctx, t, m, playing(m, wrap(t))), { anim: true });
    }
    // Stools at the machines nobody's claimed.
    for (const m of [FRONT[1], FRONT[2], FAR[1], FAR[3], FAR[6]]) {
      const [sx, sy] = seatOf(m);
      R.thing(sx, sy - 0.08, (ctx) => stool(ctx, sx, sy));
    }
    // The sleeper at the first machine: here since last night, in a tux.
    const [zx, zy] = seatOf(FAR[0]);
    R.thing(zx, zy - 0.08, (ctx) => stool(ctx, zx, zy));
    R.thing(zx, zy + 0.05, (ctx, t) => {
      person(ctx, zx, zy + 0.05, 0, {
        skin: SKIN[1], hair: HAIR[1], style: 'short', top: C.black, bottom: C.black, pose: 'sit', dir: 'r', back: true,
        arms: [1.4, 1.2], wear: waistcoat(C.black),
      }, t);
      if (Q.detail) {
        const k = (t * 0.5) % 1;
        label(ctx, zx - 0.3 - 0.4 * k, zy - 0.4 * k, 2.4 + k, 'z', 0.35 + k * 0.2, alpha(C.ink, 1 - k));
      }
    }, { anim: true });

    // Someone at the ATM, whose card it has decided to keep.
    const ATM = { x: 5.6, y: 1.55, look: { skin: SKIN[0], hair: HAIR[2], style: 'pony', top: C.sky, bottom: C.navy } };
    R.thing(ATM.x, ATM.y, (ctx, t) => {
      const w = wrap(t);
      const k = green(t, at(10.1));
      const bang = pulse(w, 23, 4) < 0.15;
      person(ctx, ATM.x, ATM.y, 0, { ...ATM.look, skin: qz(ATM.look.skin, k), pose: 'stand', dir: 'r', back: true, arms: bang ? [2.4 + Math.sin(t * 16) * 0.3, 0.2] : [1.5, 0.2] }, t);
      if (Q.detail && pulse(w, 23, 4) > 0.2 && pulse(w, 23, 4) < 0.36) speech(ctx, ATM.x, ATM.y, 2.9, 'It ate it.', { size: 0.34 });
    }, { anim: true });

    // ---------- The roulette wheel ----------
    const spinAt = (w) => {
      if (w < OPEN) return { idle: true, n: -1, s: 0 };
      const n = Math.min(GREEN_SPIN, Math.floor((w - OPEN) / SPIN));
      return { n, s: w - (OPEN + n * SPIN), green: n === GREEN_SPIN };
    };
    const numberOf = (n) => (n === GREEN_SPIN ? 0 : 1 + Math.floor(hash(n + 11, 5) * 36));
    const pocketOf = (num) => (num === 0 ? 0 : REDS.has(num) ? 1 + 2 * (num % 9) : 2 + 2 * (num % 9));
    const POCKETS = 19, W0 = 9;
    const wheelAngle = (sp) => {
      if (sp.idle) return 0;
      const S = Math.min(sp.s, LAND);
      return sp.n * W0 * LAND * 0.5 + W0 * (S - (S * S) / (2 * LAND));
    };
    // The table: a teak rim, green baize, the numbers.
    R.thing((TABLE.x0 + TABLE.x1) / 2, TABLE.y1, (ctx) => {
      const { x0, x1, y0, y1, h } = TABLE;
      box(ctx, x0, y0, 0, x1 - x0, y1 - y0, h, MAT.teakDark);
      rect(ctx, x0 + 0.1, y0 + 0.1, x1 - x0 - 0.2, y1 - y0 - 0.2, h, MAT.felt, { lw: 0.03 });
      // The bowl the wheel sits in.
      cylinder(ctx, WHEEL.x, WHEEL.y, h, WHEEL.r + 0.12, 0.08, MAT.teakDark, { flat: true });
      if (!Q.detail) return;
      // The layout: zero, then red and black, and the dozens.
      rect(ctx, 16.4, 10.25, 0.25, 1.1, h + 0.001, C.green, { lw: 0.015, stroke: C.white });
      textFlat(ctx, 16.52, 10.8, h + 0.002, '0', 0.16, C.white);
      for (let c = 0; c < 6; c++) for (let rr = 0; rr < 3; rr++) {
        const red = (c + rr) % 2 === 0;
        rect(ctx, 16.65 + c * 0.14, 10.25 + rr * 0.3667, 0.14, 0.3667, h + 0.001, red ? INK.funnelRed : C.black, { lw: 0.012, stroke: C.white });
      }
      rect(ctx, 16.65, 11.35, 0.84, 0.15, h + 0.001, MAT.felt, { lw: 0.012, stroke: C.white });
      // The house's chips, racked by the wheel.
      for (let i = 0; i < 4; i++) cylinder(ctx, 17.7, 10.25 + i * 0.2, h, 0.07, 0.12, [INK.funnelRed, C.white, C.navy, INK.sunYellow][i], { flat: true, lw: 0.012 });
    });
    // The wheel, its ball, the man's chips on zero, and the pile at 6pm.
    R.thing(TABLE.x1 - 0.2, TABLE.y1 + 0.02, (ctx, t) => {
      const w = wrap(t);
      const sp = spinAt(w);
      const th = wheelAngle(sp);
      const z = TABLE.h + 0.09;
      if (!Q.detail) { disc(ctx, WHEEL.x, WHEEL.y, z, WHEEL.r, MAT.teakDark); return; }
      onZ(ctx, z, () => {
        ctx.translate(WHEEL.x, WHEEL.y);
        ctx.beginPath(); ctx.arc(0, 0, WHEEL.r, 0, Math.PI * 2); paint(ctx, MAT.teakDark, { lw: 0.03 });
        for (let k = 0; k < POCKETS; k++) {
          const a0 = th + (k / POCKETS) * Math.PI * 2, a1 = th + ((k + 1) / POCKETS) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(0, 0, WHEEL.r - 0.07, a0, a1);
          ctx.arc(0, 0, WHEEL.r - 0.22, a1, a0, true);
          ctx.closePath();
          ctx.fillStyle = k === 0 ? C.green : k % 2 ? INK.funnelRed : C.black;
          ctx.fill();
        }
        ctx.beginPath(); ctx.arc(0, 0, WHEEL.r - 0.22, 0, Math.PI * 2); paint(ctx, MAT.teakDark, { lw: 0.02 });
        ctx.beginPath(); ctx.arc(0, 0, 0.1, 0, Math.PI * 2); paint(ctx, MAT.brass, { lw: 0.02 });
        ctx.strokeStyle = MAT.brass; ctx.lineWidth = 0.035;
        ctx.beginPath();
        for (let k = 0; k < 4; k++) { const a = th + k * Math.PI / 2; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 0.26, Math.sin(a) * 0.26); }
        ctx.stroke();
        // The ball: round the rim the other way, then into its pocket.
        if (!sp.idle && sp.s > 0.4) {
          const pk = pocketOf(numberOf(sp.n));
          const land = ((pk + 0.5) / POCKETS) * Math.PI * 2;
          const left = Math.max(0, LAND - 0.4 - sp.s);
          const rel = land - 7 * left * left - 3 * left;
          const rr = WHEEL.r - 0.035 - 0.11 * clamp(1 - left / 0.8);
          ctx.beginPath(); ctx.arc(Math.cos(th + rel) * rr, Math.sin(th + rel) * rr, 0.035, 0, Math.PI * 2);
          paint(ctx, C.white, { lw: 0.012 });
        }
      });
      // The man's stack on zero: raked after each spin, straight back on.
      const raked = !sp.idle && !sp.green && sp.s > LAND + 0.3 && sp.s < LAND + 1.4;
      const won = sp.green && sp.s >= LAND;
      if (!raked && !won) {
        for (let i = 0; i < 5; i++) cylinder(ctx, ZERO[0], ZERO[1], TABLE.h + i * 0.045, 0.07, 0.045, i % 2 ? C.white : INK.funnelRed, { flat: true, lw: 0.012 });
      }
      if (won) {
        // Thirty-five to one, pushed across in stacks.
        const k = clamp((sp.s - LAND - 0.8) / 1.2);
        for (let j = 0; j < 9; j++) {
          const x = 17.1 + (j % 3) * 0.2 - (1 - k) * 0.6, y = 11.0 + Math.floor(j / 3) * 0.17;
          for (let i = 0; i < 4 + (j % 3); i++) cylinder(ctx, x, y, TABLE.h + i * 0.045, 0.07, 0.045, [INK.funnelRed, C.white, C.navy][(i + j) % 3], { flat: true, lw: 0.012 });
        }
      }
    }, { anim: true });
    // The board by the wheel: how long since green. It ticks up every spin.
    // It stands off the table's far corner, clear of the croupier behind it.
    const SB = { x: 19.55, y: 9.8 };
    R.thing(SB.x, SB.y, (ctx) => {
      box(ctx, SB.x - 0.05, SB.y - 0.1, 0, 0.1, 0.1, 1.7, MAT.brass, { flat: true, lw: 0.02 });
      board(ctx, 'x', SB.x, SB.y, 2.2, 1.2, 1.1, '', { board: C.ink });
      lettering(ctx, 'x', SB.x, SB.y + 0.01, 2.58, 'SPINS SINCE GREEN', 0.1, C.white);
      lettering(ctx, 'x', SB.x, SB.y + 0.01, 1.8, 'MIN $5. MAX: YOUR CABIN.', 0.07, C.white);
    });
    R.thing(SB.x, SB.y + 0.02, (ctx, t) => {
      const w = wrap(t);
      const sp = spinAt(w);
      let n = 4412 + (sp.idle ? 0 : sp.n + (sp.s >= LAND ? 1 : 0));
      if (sp.green && sp.s >= LAND) n = 0;
      lettering(ctx, 'x', SB.x, SB.y + 0.01, 2.2, n.toLocaleString('en-US'), 0.34, n ? INK.sunYellow : C.leaf, 'Bagel Fat One');
    }, { anim: true });

    // The stools: Ray's (he's on the clock, from 10) and the man's.
    for (const [x, y] of [RAY, MAN]) R.thing(x, y - 0.08, (ctx) => stool(ctx, x, y));

    // The croupier: spins, calls it, rakes it. Polishes the wheel till 9.
    const CROUP = { x: 17.9, y: 9.3 };
    R.thing(CROUP.x, CROUP.y, (ctx, t) => {
      const w = wrap(t);
      const sp = spinAt(w);
      let arms = [0.4, -0.2], pose = 'stand';
      if (sp.idle) arms = [1.3 + Math.sin(t * 5) * 0.3, 0.3];
      else if (sp.s < 0.8) arms = [1.6 - sp.s * 1.5, 0.3];
      else if (sp.s > LAND && sp.s < LAND + 0.4) pose = 'point';
      else if (!sp.green && sp.s > LAND + 0.3 && sp.s < LAND + 1.4) arms = [1.3, 1.1];
      if (sp.green && sp.s > LAND + 1.5) arms = [2.9, -2.9];
      person(ctx, CROUP.x, CROUP.y, 0, {
        skin: SKIN[4], hair: HAIR[0], style: 'bun', ...CREW_LOOK, bottom: C.black, pose, dir: 'l', arms: pose === 'point' ? undefined : arms,
        wear: waistcoat(),
      }, t);
      if (!Q.detail || sp.idle) return;
      if (sp.s > LAND && sp.s < LAND + 1.5) {
        const num = numberOf(sp.n);
        speech(ctx, CROUP.x, CROUP.y, 3.0, num === 0 ? 'Zero. Green.' : `${REDS.has(num) ? 'Red' : 'Black'} ${num}.`, { size: 0.36 });
      }
    }, { anim: true });

    // The man who's put everything on green since day one. Every spin he
    // loses, every spin he bets again. At 6pm it comes up green, and he goes
    // down like a sack of chips.
    const LINES = ['Green is due.', 'Same again.', 'Any minute now.', 'All on green.'];
    const MAN_LOOK = { skin: SKIN[5], hair: HAIR[4], style: 'bald', top: C.brown, bottom: C.grey };
    R.mover((t) => {
      const w = wrap(t);
      if (w >= GREEN_AT + 3.2) return { x: MAN[0] + 0.5, y: MAN[1] + 1.3, pose: 'lie', dir: 'r' };
      if (w >= GREEN_AT + 0.3) return { x: MAN[0], y: MAN[1] + 0.3, pose: 'cheer', dir: 'r', back: false };
      return { x: MAN[0], y: MAN[1] + 0.05, pose: 'sit', dir: 'r', back: true };
    }, (ctx, t, p) => {
      const w = wrap(t);
      const sp = spinAt(w);
      const lost = !sp.idle && !sp.green && sp.s > LAND && sp.s < LAND + 1.2;
      person(ctx, p.x, p.y, 0, {
        ...MAN_LOOK, pose: p.pose, dir: p.dir, back: p.back,
        arms: p.pose === 'sit' ? (lost ? [0.2, 0.1] : [1.5, 1.2]) : undefined,
        face: (c, hy, back) => {
          if (back) { c.fillStyle = HAIR[4]; c.fillRect(-0.3, hy - 0.02, 0.1, 0.16); return; }
          c.fillStyle = alpha(C.grey, 0.8);
          for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(0.05 + (i % 4) * 0.07, hy + 0.14 + Math.floor(i / 4) * 0.06, 0.018, 0, Math.PI * 2); c.fill(); }
        },
      }, t);
      if (!Q.detail) return;
      if (p.pose === 'lie') {
        // Out cold, and happy about it: little stars going round his head.
        for (let i = 0; i < 3; i++) {
          const a = t * 3 + (i * Math.PI * 2) / 3;
          const [X, Y] = P(p.x - 0.9 + Math.cos(a) * 0.4, p.y + 0.9 + Math.sin(a) * 0.4, 0.6);
          ctx.fillStyle = INK.sunYellow; ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02;
          ctx.beginPath();
          for (let k = 0; k < 10; k++) { const r = k % 2 ? 0.05 : 0.12, b2 = (k / 10) * Math.PI * 2; ctx.lineTo(X + Math.cos(b2) * r, Y + Math.sin(b2) * r); }
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      }
      if (sp.green && sp.s > LAND + 1.5 && sp.s < LAND + 3.2) speech(ctx, p.x, p.y, 3.0, 'GREEN!', { size: 0.46 });
      else if (!sp.idle && !sp.green && sp.n % 3 === 1 && sp.s > LAND + 1.5 && sp.s < SPIN) speech(ctx, p.x, p.y, 2.6, LINES[Math.floor(sp.n / 3) % 4], { size: 0.32 });
      else if (sp.idle && w > 12 && w < 16) speech(ctx, p.x, p.y, 2.6, 'Morning. Green, please.', { size: 0.32 });
    }, { bias: 0.1 });
    // At 6pm: chips in the air.
    R.air((ctx, t) => {
      const w = wrap(t);
      if (!Q.detail || w < GREEN_AT + 0.8 || w > GREEN_AT + 6) return;
      particles(t, 18, 1.6, (k, r) => {
        const x = MAN[0] + (r() - 0.5) * 2.4, y = MAN[1] - 0.6 + (r() - 0.5) * 1.6;
        const [X, Y] = P(x, y, 3.8 - k * 3.6);
        ctx.beginPath(); ctx.ellipse(X, Y, 0.08, 0.04 + Math.abs(Math.sin(t * 8 + x)) * 0.04, 0, 0, Math.PI * 2);
        paint(ctx, [INK.funnelRed, C.white, C.navy, INK.sunYellow][Math.floor(r() * 4)], { lw: 0.012 });
      }, 61);
    });

    // ---------- Blackjack ----------
    R.thing((BJ.x0 + BJ.x1) / 2, BJ.y1, (ctx) => {
      const { x0, x1, y0, y1, h } = BJ;
      box(ctx, x0, y0, 0, x1 - x0, y1 - y0, h, MAT.teakDark);
      rect(ctx, x0 + 0.1, y0 + 0.1, x1 - x0 - 0.2, y1 - y0 - 0.2, h, MAT.felt, { lw: 0.03 });
      // The chip rack and the shoe.
      box(ctx, 3.9, 9.12, h, 1.2, 0.3, 0.1, shade(MAT.felt, 0.3), { flat: true, lw: 0.02 });
      for (let i = 0; i < 6; i++) cylinder(ctx, 4.0 + i * 0.2, 9.27, h + 0.1, 0.07, 0.05, [INK.funnelRed, C.white, C.navy, INK.sunYellow, C.purple, C.white][i], { flat: true, lw: 0.01 });
      box(ctx, 5.35, 9.2, h, 0.35, 0.3, 0.2, C.black, { flat: true, lw: 0.02 });
      if (!Q.detail) return;
      textFlat(ctx, 4.5, 10.05, h + 0.001, 'BLACKJACK PAYS 3 TO 2', 0.11, MAT.carpetGold);
      textFlat(ctx, 4.5, 10.3, h + 0.001, 'BUFFET PAYS NOTHING', 0.1, alpha(C.white, 0.7));
      // Everyone's cards, face up, and the dealer's.
      for (const [x, y] of [[3.6, 10.45], [3.78, 10.5], [5.0, 10.45], [5.18, 10.5], [4.4, 9.6], [4.58, 9.62]]) {
        rect(ctx, x, y, 0.16, 0.24, h + 0.002, C.white, { lw: 0.012 });
        const [X, Y] = P(x + 0.08, y + 0.12, h + 0.003);
        ctx.fillStyle = (x * 10) % 2 < 1 ? INK.funnelRed : C.ink; ctx.fillRect(X - 0.03, Y - 0.02, 0.06, 0.04);
      }
      for (let i = 0; i < 6; i++) cylinder(ctx, 5.35, 10.3, h + i * 0.04, 0.07, 0.04, i % 2 ? C.white : C.navy, { flat: true, lw: 0.01 });
    });
    // The dealer, dealing: a card every three seconds, round the table.
    const DEALER = { x: 4.5, y: 8.45 };
    const TARGETS = [[3.7, 10.5], [5.1, 10.5], [4.5, 9.65]];
    R.thing(DEALER.x, DEALER.y, (ctx, t) => {
      const k = pulse(t, 3);
      person(ctx, DEALER.x, DEALER.y, 0, {
        skin: SKIN[2], hair: HAIR[1], style: 'short', ...CREW_LOOK, bottom: C.black, pose: 'stand', dir: 'l',
        arms: [1.2 + (k < 0.25 ? Math.sin(k * 4 * Math.PI) * 0.6 : 0), 1.0], wear: waistcoat(),
      }, t);
    }, { anim: true });
    R.thing(BJ.x1, BJ.y1 + 0.05, (ctx, t) => {
      if (!Q.detail) return;
      const k = pulse(t, 3);
      if (k > 0.3) return;
      const [tx, ty] = TARGETS[Math.floor(t / 3) % 3];
      const u = k / 0.3;
      const x = 5.5 + (tx - 5.5) * u, y = 9.35 + (ty - 9.35) * u, z = BJ.h + 0.05 + Math.sin(u * Math.PI) * 0.3;
      onZ(ctx, z, () => {
        ctx.translate(x, y);
        ctx.rotate(u * 5);
        ctx.beginPath(); ctx.rect(-0.08, -0.12, 0.16, 0.24); paint(ctx, C.white, { lw: 0.015 });
      });
    }, { anim: true });
    // Two players: one going green (and a bucket turns up by his stool), one
    // in sunglasses indoors, winning.
    const BJP = [
      { x: 3.8, y: 11.55, sick: at(9.8), look: { skin: SKIN[1], hair: HAIR[3], style: 'short', top: C.coral, bottom: C.navy, hat: 'cap' } },
      { x: 5.2, y: 11.55, sick: null, shades: true, look: { skin: SKIN[3], hair: HAIR[6], style: 'long', top: C.white, dress: true, face: shadesUp } },
    ];
    for (const b of BJP) {
      R.thing(b.x, b.y - 0.1, (ctx) => stool(ctx, b.x, b.y));
      R.thing(b.x, b.y + 0.05, (ctx, t) => {
        const k = green(t, b.sick);
        person(ctx, b.x, b.y + 0.05, 0, {
          ...b.look, skin: qz(b.look.skin, k), pose: 'sit', dir: 'r', back: true,
          arms: [1.4 + (b.shades ? Math.sin(t * 1.3) * 0.2 : 0), 1.1],
        }, t);
      }, { anim: true });
    }
    R.thing(3.4, 12.4, (ctx, t) => { if (wrap(t) > BJP[0].sick + 8) bucket(ctx, 3.4, 12.3, 0); }, { anim: true });

    // ---------- The duty-free ----------
    // A tall shelf of everything, a glass counter, and the clerk behind it.
    R.thing(21.5, 4.7, (ctx) => {
      box(ctx, 20, 4, 0, 3, 0.6, 2.3, C.white, { dens: 0.15 });
      for (const z of [0.7, 1.3, 1.9]) box(ctx, 20, 4.6, z - 0.05, 3, 0.25, 0.05, MAT.brass, { flat: true, lw: 0.02 });
      // Top shelf: perfume. Middle: chocolate as big as your arm. Bottom: cola.
      for (let i = 0; i < 9; i++) perfume(ctx, 20.2 + i * 0.32, 4.72, 1.9, [INK.flamingo, C.lilac, C.butter, C.sky][i % 4]);
      for (let i = 0; i < 3; i++) toblong(ctx, 20.08 + i * 0.97, 4.62, 1.3, 0.9, 0.24, [C.brown, INK.funnelRed, C.navy][i]);
      for (let i = 0; i < 12; i++) can(ctx, 20.15 + i * 0.24, 4.74, 0.7);
      board(ctx, 'x', 21.5, 4.3, 2.75, 3, 0.55, 'DUTY FREE', { board: INK.funnelRed, ink: C.white, size: 0.34 });
      lettering(ctx, 'x', 21.5, 4.62, 0.38, 'FREE OF DUTY. NOT OF CHARGE.', 0.13, C.ink);
    });
    R.thing(21.5, 7.0, (ctx) => {
      box(ctx, 20, 6.2, 0, 3, 0.8, 1.05, C.white, { dens: 0.12 });
      face(ctx, [[20.1, 7.0, 0.5], [22.9, 7.0, 0.5], [22.9, 7.0, 0.98], [20.1, 7.0, 0.98]], alpha(MAT.glass, 0.9), { lw: 0.02 });
      for (let i = 0; i < 6; i++) perfume(ctx, 20.35 + i * 0.45, 6.85, 0.52, [C.lilac, INK.flamingo, C.butter][i % 3]);
      rect(ctx, 20, 6.2, 3, 0.8, 1.05, alpha(MAT.glass, 0.8), { lw: 0.02 });
      toblong(ctx, 20.3, 6.4, 1.06, 1.3, 0.32, C.brown);
      perfume(ctx, 22.4, 6.6, 1.06, INK.flamingo);
      board(ctx, 'x', 21.5, 7.02, 0.25, 2.4, 0.4, '', { board: INK.sunYellow, edge: 0.02 });
      lettering(ctx, 'x', 21.5, 7.03, 0.31, 'GIANT CHOCOLATE $40', 0.11, C.ink);
      lettering(ctx, 'x', 21.5, 7.03, 0.17, 'BIGGER THAN YOUR HEAD', 0.08, C.ink);
    });
    // The clerk, spritzing perfume at anyone who stands still.
    const CLERK = { x: 21.6, y: 5.55 };
    R.thing(CLERK.x, CLERK.y, (ctx, t) => {
      const k = pulse(t, 7, 2);
      const spray = k < 0.3;
      person(ctx, CLERK.x, CLERK.y, 0, {
        skin: SKIN[2], hair: HAIR[5], style: 'long', top: C.ink, bottom: C.ink, dress: true, pose: 'stand', dir: 'l',
        arms: [spray ? 1.9 : 0.9, 0.3],
        hold: (c) => { c.save(); c.rotate(spray ? -0.4 : 0.6); c.beginPath(); c.roundRect(-0.07, -0.26, 0.16, 0.24, 0.04); paint(c, INK.flamingo, { lw: 0.02 }); c.restore(); },
      }, t);
      if (spray && Q.detail) {
        particles(t, 8, 1.0, (a, r) => {
          const [X, Y] = P(CLERK.x + 0.4 + a * 1.1, CLERK.y + 0.8 + a * 1.4, 1.9 + (r() - 0.5) * a * 0.6);
          ctx.beginPath(); ctx.arc(X, Y, 0.05 + a * 0.12, 0, Math.PI * 2);
          ctx.fillStyle = alpha(C.pink, 0.45 * (1 - a)); ctx.fill();
        }, 71);
      }
    }, { anim: true });
    // A shopper with a chocolate bar as long as her arm, being spritzed.
    const SHOP = { x: 22.3, y: 7.95, look: { skin: SKIN[5], hair: HAIR[2], style: 'curly', top: C.teal, bottom: C.white, hat: 'sun' } };
    R.thing(SHOP.x, SHOP.y, (ctx, t) => {
      const sprayed = pulse(t, 7, 2) < 0.32;
      person(ctx, SHOP.x, SHOP.y, 0, {
        ...SHOP.look, skin: qz(SHOP.look.skin, green(t, at(10.6))), pose: 'stand', dir: 'r', back: !sprayed,
        arms: [1.4, 0.3],
        hold: (c) => {
          c.beginPath(); c.moveTo(-0.2, 0.05); c.lineTo(0.75, -0.2); c.lineTo(0.8, -0.05); c.lineTo(-0.15, 0.2); c.closePath();
          paint(c, C.brown, { lw: 0.02 });
          c.fillStyle = MAT.brass; c.beginPath(); c.moveTo(0.15, -0.04); c.lineTo(0.3, -0.08); c.lineTo(0.34, 0.07); c.lineTo(0.19, 0.11); c.fill();
        },
      }, t);
    }, { anim: true });
    // Gander Cola, stacked in a pyramid by the counter.
    R.thing(20.2, 8.6, (ctx) => {
      const rows = [[5, 0], [4, 1], [3, 2], [2, 3], [1, 4]];
      for (const [n, r] of rows) for (let i = 0; i < n; i++) can(ctx, 19.55 + (i + r * 0.5) * 0.2, 8.3, r * 0.22);
      // its sign, on a stick behind the stack
      box(ctx, 19.97, 8.05, 0, 0.06, 0.06, 1.36, MAT.brass, { flat: true, stroke: false });
      board(ctx, 'x', 20.0, 8.12, 1.55, 1.1, 0.42, '', { board: INK.funnelRed, edge: 0.02 });
      lettering(ctx, 'x', 20.0, 8.13, 1.6, 'GANDER COLA', 0.12, C.white);
      lettering(ctx, 'x', 20.0, 8.13, 1.43, 'Take a gander.', 0.09, C.white);
    });

    // ---------- The piano bar, in the point of the bow ----------
    // A white baby grand: the keyboard toward the pianist, the curved case
    // round to the bow, the lid propped open toward the room.
    R.thing(25.6, 8.6, (ctx) => {
      const top = [[24.6, 7.1], [26.2, 7.1], [26.7, 7.5], [26.6, 8.4], [25.8, 8.7], [24.6, 8.5]];
      const zb = 0.55, zt = 1.05;
      // three legs, on castors
      for (const [lx, ly] of [[24.8, 7.3], [26.3, 7.4], [25.9, 8.4]]) {
        box(ctx, lx - 0.06, ly - 0.06, 0, 0.12, 0.12, zb, C.ink, { flat: true, stroke: false });
        disc(ctx, lx, ly, 0, 0.08, MAT.brass, { stroke: false });
      }
      // the case's sides we can see (facing the room), then its rim
      for (let i = 0; i < top.length; i++) {
        const [ax, ay] = top[i], [bx, by] = top[(i + 1) % top.length];
        const nx = by - ay, ny = ax - bx; // the side's outward direction
        if (nx + ny <= 0) continue;
        face(ctx, [[ax, ay, zb], [bx, by, zb], [bx, by, zt], [ax, ay, zt]], nx > ny ? shade(C.white, 0.12) : C.white, { lw: 0.03 });
      }
      poly(ctx, top.map(([x, y]) => [x, y, zt]));
      paint(ctx, C.white, { lw: 0.03 });
      // inside: the gold frame and the strings
      const inset = top.map(([x, y]) => [25.65 + (x - 25.65) * 0.82, 7.9 + (y - 7.9) * 0.82, zt + 0.005]);
      poly(ctx, inset);
      paint(ctx, MAT.brass, { lw: 0.02 });
      if (Q.detail) {
        ctx.strokeStyle = shade(MAT.brass, 0.35); ctx.lineWidth = 0.012;
        ctx.beginPath();
        for (let k = 0; k < 7; k++) { const y = 7.35 + k * 0.17; const [A, B] = P(24.85, y, zt + 0.01), [E, F] = P(26.25 - Math.abs(k - 3) * 0.08, y, zt + 0.01); ctx.moveTo(A, B); ctx.lineTo(E, F); }
        ctx.stroke();
      }
      // the keyboard, sticking out toward the pianist
      box(ctx, 24.22, 7.25, 0.88, 0.4, 1.1, 0.1, C.ink, { flat: true, lw: 0.02 });
      rect(ctx, 24.27, 7.3, 0.3, 1.0, 0.985, C.white, { lw: 0.012 });
      if (Q.detail) {
        ctx.fillStyle = C.ink;
        for (let k = 0; k < 9; k++) {
          if (k % 7 === 2 || k % 7 === 6) continue;
          const [X, Y] = P(24.38, 7.38 + k * 0.105, 0.99);
          ctx.fillRect(X - 0.05, Y - 0.025, 0.1, 0.05);
        }
      }
      // the lid, hinged on the straight side and held up on its stick
      // (It starts behind the keys, so it never crosses the pianist.)
      const a = 1.2, c = Math.cos(a), sn = Math.sin(a);
      const lid = top.map(([x, y]) => [Math.max(x, 24.95), 7.1 + (y - 7.1) * c, zt + 0.02 + (y - 7.1) * sn]);
      const [px, py] = [25.9, 7.1 + (8.2 - 7.1) * c];
      face(ctx, [[25.9, 8.0, zt], [px, py, zt + (8.2 - 7.1) * sn]], null, { lw: 0.03, stroke: C.ink });
      poly(ctx, lid);
      paint(ctx, shade(C.white, 0.08), { lw: 0.03 });
      // a tip jar with one button in it
      cylinder(ctx, 26.25, 8.25, zt, 0.12, 0.28, alpha(MAT.glass, 0.8), { flat: true });
      label(ctx, 26.25, 8.25, zt + 0.15, 'TIPS', 0.08, C.ink, 'Rethink Sans');
      disc(ctx, 26.25, 8.25, zt + 0.02, 0.04, C.grey, { stroke: false });
    });
    const PIANIST = { x: 24.1, y: 7.8 };
    R.thing(PIANIST.x, PIANIST.y - 0.1, (ctx) => box(ctx, 23.75, 7.35, 0, 0.6, 0.8, 0.66, C.black, { top: shade(C.black, 0.1) }));
    R.thing(PIANIST.x, PIANIST.y, (ctx, t) => {
      person(ctx, PIANIST.x, PIANIST.y, 0, {
        skin: SKIN[0], hair: HAIR[3], style: 'short', top: C.purple, bottom: C.black, pose: 'sit', dir: 'r',
        arms: [1.5 + Math.sin(t * 9) * 0.25, 1.5 + Math.cos(t * 7) * 0.25], wear: waistcoat(C.purple),
      }, t);
      if (!Q.detail) return;
      particles(t, 3, 2.4, (k, r) => {
        const [X, Y] = P(25.2 + k * 0.8 - r() * 0.4, 7.6 - k * 0.6, 1.8 + k * 1.8);
        ctx.fillStyle = alpha(C.ink, 1 - k);
        ctx.beginPath(); ctx.ellipse(X, Y, 0.1, 0.07, -0.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(X + 0.07, Y - 0.35, 0.03, 0.35);
      }, 81);
    }, { anim: true });

    // ---------- The atrium and the gangway desk ----------
    R.thing((DESK.x0 + DESK.x1) / 2, DESK.y1, (ctx) => {
      const { x0, x1, y0, y1, h } = DESK;
      box(ctx, x0, y0, 0, x1 - x0, y1 - y0, h, MAT.teakDark);
      box(ctx, x0 - 0.05, y0 - 0.05, h, x1 - x0 + 0.1, y1 - y0 + 0.1, 0.06, tint(INK.teak, 0.3), { flat: true, lw: 0.03 });
      board(ctx, 'x', (x0 + x1) / 2, y1 + 0.01, 0.62, 1.6, 0.42, '', { board: MAT.brass, edge: 0.02 });
      lettering(ctx, 'x', (x0 + x1) / 2, y1 + 0.02, 0.66, 'GANGWAY', 0.2, C.ink);
      lettering(ctx, 'x', (x0 + x1) / 2, y1 + 0.02, 0.5, 'EVERYONE COUNTED', 0.08, C.ink);
      const z = h + 0.06;
      // The manifest: a page of names, the last one numbered 2400.
      rect(ctx, 12.2, 13.35, 0.5, 0.7, z, C.white, { lw: 0.015 });
      if (Q.detail) {
        ctx.fillStyle = C.grey;
        for (let i = 0; i < 6; i++) { const [X, Y] = P(12.28, 13.42 + i * 0.09, z); ctx.fillRect(X - 0.02, Y - 0.01, 0.26, 0.018); }
        textFlat(ctx, 12.45, 13.97, z + 0.001, '2400. END', 0.07, C.ink);
      }
      // A rubber stamp, a stapler, a pen, a stack of passports, a radio, a mug.
      disc(ctx, 11.1, 13.5, z, 0.12, C.ink, { lw: 0.015 });
      cylinder(ctx, 11.1, 13.5, z, 0.05, 0.22, C.brown, { flat: true, lw: 0.015 });
      disc(ctx, 11.1, 13.5, z + 0.24, 0.08, C.brown, { lw: 0.015 });
      box(ctx, 10.7, 13.95, z, 0.36, 0.12, 0.1, MAT.chrome, { flat: true, lw: 0.015 });
      box(ctx, 10.7, 13.95, z + 0.1, 0.36, 0.12, 0.04, INK.funnelRed, { flat: true, lw: 0.012 });
      face(ctx, [[12.85, 14.1, z + 0.01], [13.25, 13.9, z + 0.01]], null, { lw: 0.04, stroke: C.navy });
      for (let i = 0; i < 5; i++) box(ctx, 12.9, 13.35, z + i * 0.05, 0.3, 0.4, 0.05, i % 2 ? C.navy : shade(C.navy, 0.2), { flat: true, lw: 0.01 });
      box(ctx, 11.0, 13.85, z, 0.16, 0.12, 0.3, C.black, { flat: true, lw: 0.015 });
      face(ctx, [[11.12, 13.9, z + 0.3], [11.12, 13.9, z + 0.55]], null, { lw: 0.025, stroke: C.black });
      cylinder(ctx, 13.3, 14.15, z, 0.08, 0.16, C.white, { flat: true, lw: 0.015 });
      // The tally counter: steel, a ring for your finger, a button on top,
      // and four digits in the window.
      const cx = 11.8, cy = 13.7;
      box(ctx, cx - 0.16, cy - 0.06, z, 0.32, 0.12, 0.2, MAT.chrome, { flat: true, lw: 0.018 });
      cylinder(ctx, cx + 0.06, cy, z + 0.2, 0.04, 0.05, MAT.steel, { flat: true, lw: 0.012 });
      const [RX, RY] = P(cx - 0.2, cy, z + 0.1);
      ctx.beginPath(); ctx.ellipse(RX, RY, 0.07, 0.08, 0, 0, Math.PI * 2);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.035; ctx.stroke();
      ctx.strokeStyle = MAT.steel; ctx.lineWidth = 0.02; ctx.stroke();
      face(ctx, [[cx - 0.12, cy + 0.061, z + 0.05], [cx + 0.12, cy + 0.061, z + 0.05], [cx + 0.12, cy + 0.061, z + 0.15], [cx - 0.12, cy + 0.061, z + 0.15]], C.white, { lw: 0.012 });
      lettering(ctx, 'x', cx, cy + 0.065, z + 0.1, '2401', 0.085, C.ink);
    });
    // The security officer: a puzzle book all day, and at 6pm, at the
    // gangway, stopping anyone from getting off.
    const SEC = { skin: SKIN[3], hair: HAIR[1], style: 'short', top: C.navy, bottom: C.navy };
    const toGangway = walk([[12.1, 12.55], [14.2, 12.7], [14.9, 14.4]], SIX - 2, 1.6);
    R.mover((t) => {
      const w = wrap(t);
      if (w < SIX - 2) return { x: 12.1, y: 12.55, dir: 'l', pose: 'read' };
      const p = toGangway(w);
      return p.done ? { x: p.x, y: p.y, dir: 'l', pose: 'point' } : { ...p, pose: 'walk' };
    }, (ctx, t, p) => {
      const w = wrap(t);
      const look = pulse(w, 19, 3) < 0.15;
      person(ctx, p.x, p.y, 0, {
        ...SEC, pose: p.pose === 'read' && look ? 'stand' : p.pose, dir: p.dir, back: p.back, face: secCap,
        hold: p.pose === 'read' && !look ? (c) => { c.beginPath(); c.rect(-0.05, -0.32, 0.36, 0.26); paint(c, C.white, { lw: 0.02 }); c.fillStyle = C.grey; c.fillRect(0.02, -0.26, 0.22, 0.14); } : undefined,
      }, t);
      if (Q.detail && p.pose === 'point' && w > GREEN_AT + 4 && w < GREEN_AT + 12) speech(ctx, p.x, p.y, 3.8, 'Nobody gets off.', { size: 0.34 }); // over the gangway's sign
    });
    // The gangway: two brass posts, a sign, and at 6pm, yellow tape.
    for (const x of [14.6, 15.9]) {
      R.thing(x, 15.35, (ctx) => {
        disc(ctx, x, 15.3, 0, 0.18, MAT.brass, { lw: 0.02 });
        cylinder(ctx, x, 15.3, 0, 0.06, 3.6, MAT.brass, { flat: true, stroke: false });
      });
    }
    R.thing(15.25, 15.4, (ctx, t) => {
      // (High on its posts, over the security officer's cap when he's there.)
      board(ctx, 'x', 15.25, 15.3, 3.34, 1.5, 0.44, '', { board: C.navy, edge: 0.03 });
      lettering(ctx, 'x', 15.25, 15.31, 3.42, "ALL ASHORE THAT'S", 0.12, C.white);
      lettering(ctx, 'x', 15.25, 15.31, 3.26, 'GOING ASHORE', 0.12, C.white);
      if (wrap(t) < SIX) return;
      for (const [za, zb] of [[1.6, 0.5], [0.5, 1.6]]) {
        const [A, B] = P(14.6, 15.3, za), [E, F] = P(15.9, 15.3, zb);
        ctx.beginPath(); ctx.moveTo(A, B); ctx.lineTo(E, F);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.17; ctx.stroke();
        ctx.strokeStyle = INK.sunYellow; ctx.lineWidth = 0.12; ctx.stroke();
      }
      label(ctx, 15.25, 15.3, 1.05, 'QUARANTINE', 0.12, C.ink, 'Rethink Sans');
    }, { anim: true });
    // A potted palm by the desk (leaf green, like every plant on board).
    R.thing(9.8, 15.2, (ctx, t) => {
      cylinder(ctx, 9.8, 15.2, 0, 0.35, 0.6, MAT.brass, { flat: true });
      const sway = Math.sin(t * 0.8) * 0.05;
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const [A, B] = P(9.8, 15.2, 0.6), [E, F] = P(9.8 + Math.cos(a) * 0.8, 15.2 + Math.sin(a) * 0.6, 1.6 + sway);
        const [M, N] = P(9.8 + Math.cos(a) * 0.35, 15.2 + Math.sin(a) * 0.3, 2.2);
        ctx.beginPath(); ctx.moveTo(A, B); ctx.quadraticCurveTo(M, N, E, F);
        ctx.lineCap = 'round';
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.22; ctx.stroke();
        ctx.strokeStyle = i % 2 ? C.leaf : C.green; ctx.lineWidth = 0.15; ctx.stroke();
      }
    }, { anim: true });

    // ---------- People on the move ----------
    // A cocktail waitress: Green Mermaids, Gander Cola, round and round.
    const tray = (c) => {
      c.beginPath(); c.ellipse(0.3, -0.1, 0.42, 0.1, 0, 0, Math.PI * 2); paint(c, MAT.chrome, { lw: 0.025 });
      for (const gx of [0.1, 0.36]) {
        c.beginPath(); c.moveTo(gx - 0.07, -0.44); c.lineTo(gx - 0.05, -0.12); c.lineTo(gx + 0.05, -0.12); c.lineTo(gx + 0.07, -0.44); c.closePath();
        paint(c, INK.queasyGreen, { lw: 0.02 });
      }
      c.beginPath(); c.rect(0.5, -0.36, 0.13, 0.24); paint(c, INK.funnelRed, { lw: 0.02 });
    };
    const waitress = route([[3.9, 7.4, 1], [7, 5.0], [9.5, 5.0, 1.5], [14.5, 5.0, 1.5], [18.6, 5.2, 1], [19.0, 8.0, 2]], { speed: 1.1, loop: false, offset: 5 });
    R.mover(waitress, (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, {
        skin: SKIN[1], hair: HAIR[0], style: 'pony', top: C.black, bottom: C.black, dress: true,
        pose: p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back, arms: [1.5, 0.2], speed: 6, hold: tray,
      }, t);
    });
    // A steward vacuuming the same stretch of carpet all day.
    const vac = route([[7.0, 9.3], [9.4, 11.6, 1], [7.7, 15.0, 1]], { speed: 0.7, loop: false, offset: 9 });
    R.mover(vac, (ctx, t, p) => {
      const sw = p.moving ? Math.sin(t * 6) * 0.25 : 0;
      person(ctx, p.x, p.y, 0, {
        skin: SKIN[4], hair: HAIR[6], style: 'short', ...CREW_LOOK, pose: p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back,
        arms: [0.9 + sw * 0.4, 0.7], speed: 4,
        hold: (c) => {
          c.beginPath(); c.moveTo(0, -0.3); c.lineTo(0.3 + sw, 1.1);
          c.strokeStyle = C.ink; c.lineWidth = 0.1; c.stroke();
          c.strokeStyle = MAT.steel; c.lineWidth = 0.05; c.stroke();
          c.beginPath(); c.roundRect(0.1 + sw, 1.02, 0.5, 0.16, 0.05); paint(c, INK.funnelRed, { lw: 0.025 });
          c.beginPath(); c.roundRect(0.08, -0.35, 0.22, 0.45, 0.06); paint(c, INK.funnelRed, { lw: 0.025 });
        },
      }, t);
    });

    // ---------- The finds ----------
    // The gangway clicker: 2401, beside a manifest that ends at 2400.
    R.find({ id: 'clicker', label: 'The gangway clicker', at: [11.8, 13.7, 1.3], r: 0.8 });
    // Tyler's hands, on the glass of the second machine in the middle bank.
    R.find({ id: 'handprints', label: 'Sticky handprints on a slot machine', at: [13.75, 7.4, 1.55], r: 0.8 });
  },
};

// A flat panel on the left wall (x 0), from y along it, at height z.
function onLeft0(ctx, y, z, w, h, fill) {
  face(ctx, [[0.01, y, z], [0.01, y + w, z], [0.01, y + w, z + h], [0.01, y, z + h]], fill, { lw: 0.04 });
}

// Sunglasses pushed up on someone's head (we see her from behind).
function shadesUp(c, hy) {
  c.fillStyle = C.black;
  c.beginPath(); c.ellipse(-0.08, hy - 0.26, 0.11, 0.055, 0, 0, Math.PI * 2); c.ellipse(0.16, hy - 0.26, 0.11, 0.055, 0, 0, Math.PI * 2); c.fill();
}
