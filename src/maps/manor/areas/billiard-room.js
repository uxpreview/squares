// Billiard Room: a gentlemen's den in dark green, and a card game that only
// ever goes one way. While he waits, the chauffeur plays patience (and cheats
// at it). Rupert sits down at 76 seconds and bets his car keys; the chauffeur
// stakes Rupert's shoes, won off him last night; "I bet the house!" adds the
// deeds. The lights go out, the big flash at 85 shows four aces, and the
// chauffeur takes the lot. Then he deals himself another game of patience.
import {
  C, Q, box, rect, cylinder, face, paint, P, planks, slab, shade, tint, mix, alpha, speech, hash, onLeft, onRight,
  note, plant,
} from '../../../engine/art.js';
import { clamp, ease, particles } from '../../../engine/actors.js';
import { ZK } from '../../../engine/iso.js';
import { tag } from '../../greybox.js';
import {
  INK, MAT, ROOM, house, storm, stormWindow, drapes, painting, lamp, candle, fire, drawCast, dressed,
} from '../style.js';
import { DOORS, LOOP } from '../plan.js';

// ---------- Inks ----------
const RC = ROOM['billiard-room'];
const WALL_L = RC.wall, WALL_R = shade(RC.wall, 0.1);
const WOOD = MAT.mahogany, WOOD_D = RC.trim, OAK = RC.floor;
const BAIZE = mix(INK.verdigris, C.green, 0.45);
const LEATHER = mix(INK.oxblood, MAT.oak, 0.3);
const MANILA = mix(INK.bone, INK.candleGold, 0.38);
const SLATE = mix(C.ink, INK.verdigris, 0.22);
const CHALK = alpha(INK.bone, 0.92);
const ANTLER = mix(INK.bone, MAT.oak, 0.35);
const TIGER = INK.bone; // the zebra (stripes in ink)
const GLASS = alpha(MAT.glass, 0.5);
const PINE = MAT.pine;
const SMOKE = INK.bone;

// ---------- Drawing helpers ----------
// Draw in screen units at a point in the room, like a person or the goose.
function sprite(ctx, x, y, z, fn) {
  ctx.save();
  ctx.translate(x - y, (x + y) / 2 - z * ZK);
  fn(ctx);
  ctx.restore();
}
// Draw flat on the plane x = px (the left wall, or something standing proud of
// it). Local x runs to the right as you look at it, local y runs down; (u, z)
// is the local origin, u measured along the wall.
function onX(ctx, px, u, z, fn) {
  ctx.save();
  ctx.transform(1, -0.5, 0, ZK, px - u, (px + u) / 2 - z * ZK);
  fn(ctx);
  ctx.restore();
}
// The same on the plane y = py (the right wall).
function onY(ctx, py, u, z, fn) {
  ctx.save();
  ctx.transform(1, 0.5, 0, ZK, u - py, (u + py) / 2 - z * ZK);
  fn(ctx);
  ctx.restore();
}
// Flat on a level surface at height z (the floor, a table top), centred on
// (x, y) and turned by rot. Local x runs along the room's x, local y along y.
function onFlat(ctx, x, y, z, rot, fn) {
  ctx.save();
  ctx.transform(1, 0.5, -1, 0.5, x - y, (x + y) / 2 - z * ZK);
  if (rot) ctx.rotate(rot);
  fn(ctx);
  ctx.restore();
}
// Words in local units, centred on (x, y). o.max: squeeze them into that width.
// (Drawn at 400x and scaled down: the canvas won't draw fonts under a few
// pixels at their real size, so tiny labels would come out too big.)
function words(ctx, s, x, y, size, color, o = {}) {
  const k = 400;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1 / k, 1 / k);
  ctx.font = `${size * k}px ${o.font || '"Bagel Fat One", "Arial Black", sans-serif'}`;
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = 'middle';
  if (o.max) {
    const w = ctx.measureText(s).width / k;
    if (w > o.max) ctx.scale(o.max / w, 1);
  }
  ctx.fillStyle = color;
  ctx.fillText(s, 0, 0);
  ctx.restore();
}
const SANS = '700 "Rethink Sans", system-ui, sans-serif';
// A thick stroke with an ink edge (cues, antlers, chains), through screen points.
function rod(ctx, pts, color, w) {
  ctx.beginPath();
  pts.forEach(([X, Y], i) => (i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y)));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (Q.lines) {
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = w + 0.05;
    ctx.stroke();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
}
function dot(ctx, X, Y, r, color) {
  ctx.beginPath();
  ctx.arc(X, Y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}
function ball(ctx, x, y, z, r, color) {
  const [X, Y] = P(x, y, z + r);
  ctx.beginPath();
  ctx.arc(X, Y, r, 0, Math.PI * 2);
  paint(ctx, color, { lw: 0.02 });
  if (Q.detail) dot(ctx, X - r * 0.35, Y - r * 0.35, r * 0.3, alpha(C.white, 0.7));
}

// ---------- The evening ----------
const lt = (t) => ((t % LOOP) + LOOP) % LOOP;
const span = (tt, a, b) => clamp((tt - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
function hop(a, b, k, h = 0.7) {
  const e = ease(k);
  return [lerp(a[0], b[0], e), lerp(a[1], b[1], e), lerp(a[2], b[2], e) + Math.sin(Math.PI * k) * h];
}
// Names and speech only once you're close enough to read them (as evening.js).
const readable = () => Q.detail && Q.pxPerUnit >= 14;

// The game, in seconds into the evening. Rupert sits down at 76.6 and runs for
// the library at 97 (evening.js); the reveal is the big strike during the
// blackout, so the four aces turn up in a flash of lightning.
const REVEAL = (storm.strikes.find((s) => s.big && s.t > 82 && s.t < 90) || { t: 85.3 }).t;
const T = {
  gather: 68.6, // patience swept up: Rupert's on his way
  shuffle: [70.4, 75.2],
  deal: [76.8, 77.9],
  keys: [78.3, 78.9], // Rupert's car keys, into the pot
  shoes: [79.3, 80.0], // the chauffeur stakes Rupert's shoes, won last night
  deeds: [80.9, 81.6], // "I bet the house!"
  reveal: REVEAL, // four aces
  sweep: REVEAL + 1.05, // and he takes the lot
  collect: [89.3, 90.3],
  shuffle2: [90.3, 95.0],
  stash: 97.6, // the winnings go in the crate
  lay: [99, 101.4], // and patience again
};
const LINES = [
  [T.sweep + 1.3, 91.4, 'Four aces, sir.'],
  [91.6, 95.4, 'Double or nothing?'],
];
const saying = (tt) => LINES.find(([a, b]) => tt >= a && tt < b);

// ---------- The card table ----------
const TOP = 1.03; // the baize
const CANDLE = [12.86, 12.86]; // on the near corner, by the pot
const LAMP_Z = 3.1; // the billiard lamp's bar, low over the table
const DECK = [12.72, 12.02];
const SLEEVE = [13.3, 11.55, 1.4];
// Patience: six piles, clear of the pawn ticket in the far corner.
const TAB = [[11.55, 12.22], [11.9, 12.22], [12.25, 12.22], [11.55, 12.62], [11.9, 12.62], [12.25, 12.62]];
const RUP_CARD = (j) => [10.95, 11.98 + j * 0.16];
const OWN_CARD = (j) => [12.5, 11.4 + j * 0.16];
const RUP_HAND = [10.5, 11.9, 1.2];
const POT = { keys: [11.78, 12.42, TOP], shoes: [12.22, 12.66, TOP], deeds: [12.12, 12.08, TOP] };
const CRATE = { x: 14.6, y: 10.3, w: 1.0, d: 1.05, h: 0.9 };
const WON = { keys: [15.32, 11.1, 0.92], deeds: [15.02, 10.9, 0.98] };
const SHOES = [12.2, 13.8, 0];
const PM = 4.2; // a patience move every few seconds
const cheatMove = (j) => ((j % 5) + 5) % 5 === 3; // one card in five comes out of his sleeve
const faceOf = (j) => ({ red: hash(j + 50, 3) > 0.5, ace: cheatMove(j) });
const inPatience = (tt) => tt >= T.lay[1] || tt < T.gather;
function patience(tt) {
  const pt = (tt - T.lay[1] + LOOP) % LOOP;
  const m = Math.floor(pt / PM), f = (pt % PM) / PM;
  return { m, f, done: f >= 0.42 ? m + 1 : m };
}
// The last card to land on pile i after n moves (or the one it was dealt).
const topOf = (i, n) => { const j = n - 1 - ((((n - 1 - i) % 6) + 6) % 6); return j >= 0 ? faceOf(j) : faceOf(-1 - i); };

// Every card on the table right now: [x, y, z, rot, face]. face is null for
// a card lying face down, or { red, ace }.
function cardsAt(tt) {
  const out = [];
  const put = (x, y, z, rot, f) => out.push([x, y, z, rot, f]);
  const deck = (n = 3) => { for (let i = 0; i < n; i++) put(DECK[0], DECK[1], TOP + i * 0.014, 0.08, null); };
  const fly = (a, b, k, f, h = 0.35) => {
    const p = hop([a[0], a[1], a[2] ?? TOP], [b[0], b[1], TOP], k, h);
    put(p[0], p[1], p[2], (1 - k) * 0.9, f);
  };
  if (inPatience(tt)) {
    const { m, f, done } = patience(tt);
    deck();
    for (let i = 0; i < 6; i++) {
      put(TAB[i][0] - 0.04, TAB[i][1] - 0.03, TOP, 0.05, faceOf(-20 - i));
      put(TAB[i][0], TAB[i][1], TOP + 0.012, 0, topOf(i, done));
    }
    if (f >= 0.1 && f < 0.42) fly(cheatMove(m) ? SLEEVE : DECK, TAB[m % 6], span(f, 0.1, 0.42), faceOf(m));
    return out;
  }
  if (tt < T.shuffle[0]) {
    // Rupert's on his way: sweep the piles into the deck.
    const n = Math.floor(((T.gather - T.lay[1] + LOOP) % LOOP) / PM);
    deck();
    for (let i = 0; i < 6; i++) {
      const k = span(tt, T.gather + i * 0.14, T.gather + i * 0.14 + 0.45);
      if (k < 1) put(lerp(TAB[i][0], DECK[0], ease(k)), lerp(TAB[i][1], DECK[1], ease(k)), TOP + 0.03, 0, topOf(i, n));
    }
    return out;
  }
  if (tt < T.deal[0] || (tt >= T.collect[1] && tt < T.lay[0])) {
    const riffle = (tt >= T.shuffle[0] && tt < T.shuffle[1]) || (tt >= T.shuffle2[0] && tt < T.shuffle2[1]);
    if (!riffle) { deck(); return out; }
    // Two half decks and cards flicking between them.
    for (const s of [-1, 1]) for (let i = 0; i < 2; i++) put(DECK[0], DECK[1] + s * 0.2, TOP + i * 0.014, 0.08, null);
    for (let i = 0; i < 2; i++) {
      const k = (tt * 3.1 + i * 0.5) % 1;
      const s = Math.floor(tt * 3.1 + i * 0.5) % 2 ? 1 : -1;
      fly([DECK[0], DECK[1] + s * 0.2, TOP + 0.03], [DECK[0], DECK[1] - s * 0.2], k, null, 0.28);
    }
    return out;
  }
  if (tt < T.lay[0]) {
    // The hand: four cards each, dealt from the deck; his turn up at the reveal.
    deck(2);
    const up = tt >= T.reveal;
    for (let c = 0; c < 8; c++) {
      const mine = c % 2 === 1, j = c >> 1;
      const to = mine ? OWN_CARD(j) : RUP_CARD(j);
      const f = mine && up ? { red: j % 2 === 1, ace: true } : null;
      const rot = mine ? (up ? -0.35 + j * 0.24 : -0.15) : 0.3;
      const k0 = span(tt, T.deal[0] + c * 0.13, T.deal[0] + c * 0.13 + 0.3);
      const k1 = span(tt, T.collect[0] + c * 0.08, T.collect[0] + c * 0.08 + 0.4);
      if (k0 <= 0) continue;
      if (k0 < 1) fly(DECK, to, k0, null, 0.25);
      else if (k1 <= 0) put(to[0], to[1], TOP + (mine && up ? 0.02 * j : 0), rot, f);
      else if (k1 < 1) put(lerp(to[0], DECK[0], ease(k1)), lerp(to[1], DECK[1], ease(k1)), TOP + 0.03, rot * (1 - k1), f);
    }
    return out;
  }
  // Patience laid out again, a card at a time.
  deck();
  for (let i = 0; i < 6; i++) {
    const k = span(tt, T.lay[0] + i * 0.36, T.lay[0] + i * 0.36 + 0.3);
    if (k <= 0) continue;
    if (k < 1) fly(DECK, TAB[i], k, faceOf(-1 - i));
    else {
      put(TAB[i][0] - 0.04, TAB[i][1] - 0.03, TOP, 0.05, faceOf(-20 - i));
      put(TAB[i][0], TAB[i][1], TOP + 0.012, 0, faceOf(-1 - i));
    }
  }
  return out;
}

// A playing card lying flat.
function card(ctx, [x, y, z, rot, f]) {
  onFlat(ctx, x, y, z, rot, (g) => {
    g.beginPath();
    g.rect(-0.13, -0.19, 0.26, 0.38);
    paint(g, f ? INK.bone : INK.oxblood, { lw: 0.022 });
    if (!Q.detail) return;
    if (f) {
      g.beginPath();
      g.arc(0, 0, f.ace ? 0.08 : 0.045, 0, Math.PI * 2);
      g.fillStyle = f.red ? INK.oxblood : C.ink;
      g.fill();
    } else {
      g.strokeStyle = alpha(INK.bone, 0.75);
      g.lineWidth = 0.02;
      g.strokeRect(-0.085, -0.145, 0.17, 0.29);
    }
  });
}

// Where the pot's things are. null: not here (still in Rupert's pockets, or
// packed away in the crate). The fourth number fades them into the crate.
function potThing(tt, bet, pot, won, lag) {
  if (tt < bet[0] || tt >= T.stash + lag + 0.5) return null;
  if (tt < bet[1]) return [...hop(RUP_HAND, pot, span(tt, bet[0], bet[1]), 0.55), 1];
  if (tt < T.sweep + lag) return [...pot, 1];
  if (tt < T.sweep + lag + 0.7) return [...hop(pot, won, span(tt, T.sweep + lag, T.sweep + lag + 0.7), 1.3), 1];
  if (tt < T.stash + lag) return [...won, 1];
  const k = span(tt, T.stash + lag, T.stash + lag + 0.5);
  return [won[0], won[1], won[2] - k * 0.35, 1 - k];
}
const keysAt = (tt) => potThing(tt, T.keys, POT.keys, WON.keys, 0);
const deedsAt = (tt) => potThing(tt, T.deeds, POT.deeds, WON.deeds, 0.25);
// Rupert's shoes: by the chauffeur's chair, except while they're the stake.
function shoesAt(tt) {
  const back = T.sweep + 0.55;
  if (tt >= T.shoes[0] && tt < T.shoes[1]) return hop(SHOES, POT.shoes, span(tt, T.shoes[0], T.shoes[1]), 0.95);
  if (tt >= T.shoes[1] && tt < back) return POT.shoes;
  if (tt >= back && tt < back + 0.7) return hop(POT.shoes, SHOES, span(tt, back, back + 0.7), 0.9);
  return SHOES;
}

// The chauffeur's arms, [near, far] (see person() in art.js: 0 hangs down,
// about 1.5 reaches straight out).
function armsAt(tt) {
  const rest = [0.95, 0.8];
  if (inPatience(tt)) {
    const { m, f } = patience(tt);
    const k = Math.sin(Math.PI * span(f, 0.02, 0.42));
    return cheatMove(m) ? [0.95, 0.8 + k * 0.85] : [0.95 + k * 0.6, 0.8];
  }
  const riffle = (tt >= T.shuffle[0] && tt < T.shuffle[1]) || (tt >= T.shuffle2[0] && tt < T.shuffle2[1]);
  if (riffle) return [1.15 + Math.sin(tt * 19) * 0.14, 1.1 + Math.cos(tt * 19) * 0.14];
  if (tt >= T.deal[0] && tt < T.deal[1] + 0.2) return [1.1 + Math.abs(Math.sin(tt * 24)) * 0.45, 1.0];
  if (tt >= T.gather && tt < T.gather + 1.2) return [1.45, 1.3];
  if (tt >= T.shoes[0] - 0.2 && tt < T.shoes[1]) return [0.6, 0.8]; // reaching down for the shoes
  if (tt >= T.reveal - 0.1 && tt < T.reveal + 0.9) return [1.55, 1.35];
  if (tt >= T.sweep && tt < T.sweep + 1.3) return [1.6 - span(tt, T.sweep, T.sweep + 1.3) * 0.7, 1.4 - span(tt, T.sweep, T.sweep + 1.3) * 0.6];
  if (tt >= T.collect[0] && tt < T.collect[1]) return [1.35, 1.2];
  if (tt >= T.lay[0] && tt < T.lay[1]) return [1.1 + Math.abs(Math.sin(tt * 9)) * 0.4, 0.9];
  return rest;
}

// ---------- Things on the table and in the pot ----------
// Rupert's shiny two-tone brogues: one shoe, side on, toe to the left.
function brogue(ctx, X, Y) {
  ctx.save();
  ctx.translate(X, Y);
  ctx.beginPath();
  ctx.moveTo(0.25, 0);
  ctx.lineTo(-0.2, 0);
  ctx.quadraticCurveTo(-0.28, 0, -0.27, -0.05);
  ctx.lineTo(0.25, -0.05);
  ctx.closePath();
  paint(ctx, C.ink, { lw: 0.02 });
  // The upper, in bone.
  ctx.beginPath();
  ctx.moveTo(0.25, -0.045);
  ctx.lineTo(0.24, -0.21);
  ctx.quadraticCurveTo(0.14, -0.24, 0.04, -0.2);
  ctx.quadraticCurveTo(-0.08, -0.17, -0.16, -0.12);
  ctx.quadraticCurveTo(-0.28, -0.09, -0.27, -0.045);
  ctx.closePath();
  paint(ctx, INK.bone, { lw: 0.025 });
  // Toe cap and heel in oxblood, with the punched brogue line.
  ctx.beginPath();
  ctx.moveTo(-0.27, -0.045);
  ctx.quadraticCurveTo(-0.28, -0.09, -0.16, -0.12);
  ctx.lineTo(-0.1, -0.045);
  ctx.closePath();
  paint(ctx, INK.oxblood, { lw: 0.02 });
  ctx.beginPath();
  ctx.moveTo(0.25, -0.045);
  ctx.lineTo(0.245, -0.16);
  ctx.quadraticCurveTo(0.16, -0.12, 0.13, -0.045);
  ctx.closePath();
  paint(ctx, INK.oxblood, { lw: 0.02 });
  if (Q.detail) {
    ctx.fillStyle = C.ink;
    for (const [dx, dy] of [[-0.02, -0.17], [0.03, -0.18], [0.08, -0.19]]) ctx.fillRect(dx, dy, 0.025, 0.02);
    dot(ctx, -0.21, -0.1, 0.022, C.white); // the shine
  }
  ctx.restore();
}
function pairOfShoes(ctx, x, y, z) {
  const [X, Y] = P(x, y, z);
  brogue(ctx, X + 0.14, Y - 0.07);
  brogue(ctx, X - 0.06, Y + 0.05);
}
// Rupert's car keys: two keys on a ring, and a leather fob.
function carKeys(ctx, x, y, z) {
  sprite(ctx, x, y, z, (g) => {
    g.beginPath();
    g.roundRect(0.02, -0.12, 0.16, 0.1, 0.03);
    paint(g, INK.oxblood, { lw: 0.02 });
    dot(g, 0.1, -0.07, 0.025, MAT.brass);
    g.beginPath();
    g.arc(-0.03, -0.1, 0.06, 0, Math.PI * 2);
    g.strokeStyle = C.ink;
    g.lineWidth = 0.04;
    g.stroke();
    g.strokeStyle = MAT.brass;
    g.lineWidth = 0.018;
    g.stroke();
    for (const [dx, a] of [[-0.12, -0.5], [-0.05, 0.3]]) {
      g.save();
      g.translate(dx, -0.06);
      g.rotate(a);
      g.beginPath();
      g.arc(0, 0, 0.045, 0, Math.PI * 2);
      g.rect(-0.018, 0, 0.036, 0.17);
      g.rect(0.012, 0.09, 0.03, 0.03);
      g.rect(0.012, 0.14, 0.025, 0.03);
      paint(g, MAT.brass, { lw: 0.018 });
      g.restore();
    }
  });
}
// The deeds to the manor: a scroll with a ribbon and a big red seal.
function deedScroll(ctx, x, y, z) {
  sprite(ctx, x, y, z, (g) => {
    g.beginPath();
    g.roundRect(-0.32, -0.16, 0.64, 0.13, 0.06);
    paint(g, INK.bone, { lw: 0.022, dots: MANILA, density: 0.3 });
    for (const s of [-1, 1]) {
      g.beginPath();
      g.ellipse(s * 0.32, -0.095, 0.035, 0.07, 0, 0, Math.PI * 2);
      paint(g, MANILA, { lw: 0.02 });
    }
    g.fillStyle = INK.oxblood;
    g.fillRect(-0.04, -0.16, 0.06, 0.13);
    g.beginPath();
    g.moveTo(-0.01, -0.04); g.lineTo(-0.07, 0.07); g.lineTo(0.05, 0.07);
    g.closePath();
    paint(g, INK.oxblood, { lw: 0.015 });
    g.beginPath();
    g.arc(-0.01, 0.0, 0.07, 0, Math.PI * 2);
    paint(g, mix(INK.oxblood, C.red, 0.4), { lw: 0.02 });
    if (Q.detail) dot(g, -0.01, 0, 0.03, INK.oxblood);
  });
}
// A pawnshop ticket: a manila tag with a number and a string.
function pawnTicket(ctx) {
  onFlat(ctx, 11.2, 11.2, TOP + 0.005, -0.45, (g) => {
    if (Q.detail) {
      g.beginPath();
      g.moveTo(-0.26, 0);
      g.bezierCurveTo(-0.42, -0.02, -0.4, 0.2, -0.52, 0.16);
      g.bezierCurveTo(-0.62, 0.12, -0.55, -0.05, -0.66, -0.08);
      g.strokeStyle = INK.oxblood;
      g.lineWidth = 0.025;
      g.stroke();
    }
    g.beginPath();
    g.moveTo(-0.28, -0.07); g.lineTo(-0.2, -0.15); g.lineTo(0.28, -0.15); g.lineTo(0.28, 0.15); g.lineTo(-0.2, 0.15); g.lineTo(-0.28, 0.07);
    g.closePath();
    paint(g, MANILA, { lw: 0.025 });
    g.beginPath();
    g.arc(-0.2, 0, 0.035, 0, Math.PI * 2);
    paint(g, INK.bone, { lw: 0.015 });
    if (!Q.detail) return;
    // (His alibi is the date: the case file says it's dated tomorrow.)
    words(g, 'No 73', -0.01, -0.06, 0.1, C.ink);
    words(g, 'TOMORROW', 0.04, 0.07, 0.06, INK.oxblood);
    dot(g, 0.22, -0.07, 0.03, alpha(INK.oxblood, 0.8)); // the pawnbroker's stamp
  });
}

// ---------- Furniture ----------
// A leather club chair against the back wall, facing +y (toward you).
function clubChair(ctx, x, y, color = LEATHER) {
  const w = 1.4, d = 1.3, lit = tint(color, 0.12), dark = shade(color, 0.35);
  for (const [fx, fy] of [[x + 0.1, y + d - 0.2], [x + w - 0.2, y + d - 0.2], [x + w - 0.2, y + 0.12]]) {
    box(ctx, fx, fy, 0, 0.1, 0.1, 0.14, C.ink, { flat: true, stroke: false });
  }
  box(ctx, x, y, 0.14, w, d, 0.5, color, { dotsL: dark });
  box(ctx, x, y, 0.64, w, 0.36, 1.0, color, { top: lit, dotsL: dark });
  box(ctx, x, y + 0.3, 0.64, 0.28, d - 0.3, 0.4, color, { top: lit });
  box(ctx, x + 0.28, y + 0.36, 0.64, w - 0.56, d - 0.4, 0.13, lit, { flat: true });
  box(ctx, x + w - 0.28, y + 0.3, 0.64, 0.28, d - 0.3, 0.4, color, { top: lit });
  if (!Q.detail) return;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    const [X, Y] = P(x + 0.35 + i * 0.35, y + 0.36, 1.0 + j * 0.3);
    dot(ctx, X, Y, 0.035, dark);
  }
}
// A leather card chair. facing: 'px' (back at the low-x side, facing +x) or
// 'nx'. part: 'seat' (and legs), 'back' or both.
function cardChair(ctx, x, y, facing, part = 'all') {
  const dark = shade(LEATHER, 0.35);
  if (part !== 'back') {
    for (const [lx, ly] of [[x + 0.05, y + 0.05], [x + 0.67, y + 0.05], [x + 0.05, y + 0.67], [x + 0.67, y + 0.67]]) {
      box(ctx, lx, ly, 0, 0.08, 0.08, 0.72, WOOD_D, { flat: true });
    }
    box(ctx, x, y, 0.72, 0.8, 0.8, 0.14, LEATHER, { top: tint(LEATHER, 0.1), dotsL: dark });
  }
  if (part !== 'seat') {
    const bx = facing === 'px' ? x - 0.04 : x + 0.68;
    box(ctx, bx, y + 0.04, 0.86, 0.16, 0.72, 0.62, LEATHER, { top: WOOD, dotsL: dark });
    if (Q.detail) {
      for (let i = 0; i < 3; i++) {
        const [X, Y] = P(bx + (facing === 'px' ? 0.16 : 0), y + 0.2 + i * 0.2, 1.22);
        dot(ctx, X, Y, 0.03, MAT.brass);
      }
    }
  }
}

// ---------- Creatures ----------
// The club's white cat (every den needs one to stroke): sitting, side on,
// facing right. o: { look (-1..1), swipe (0..1) }
function whiteCat(ctx, X, Y, t, o = {}) {
  const fur = INK.bone, sheen = C.ink;
  ctx.save();
  ctx.translate(X, Y);
  const sw = Math.sin(t * 2.3) * 0.12;
  ctx.beginPath();
  ctx.moveTo(-0.22, -0.08);
  ctx.quadraticCurveTo(-0.52, -0.02, -0.46 + sw * 0.4, -0.36 + sw);
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.12;
  ctx.stroke();
  ctx.strokeStyle = sheen;
  ctx.lineWidth = 0.06;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-0.08, -0.18, 0.22, 0.18, 0, 0, Math.PI * 2);
  ctx.ellipse(0.1, -0.28, 0.13, 0.2, 0.3, 0, Math.PI * 2);
  paint(ctx, fur, { lw: 0.04, stroke: sheen });
  // The front paw: tucked, or out batting the ball.
  const s = o.swipe || 0;
  ctx.beginPath();
  ctx.moveTo(0.12, -0.2);
  ctx.lineTo(0.16 + s * 0.28, -0.03 - s * 0.05);
  ctx.strokeStyle = fur;
  ctx.lineWidth = 0.08;
  ctx.stroke();
  const hx = 0.2 + (o.look || 0) * 0.04, hy = -0.52;
  ctx.beginPath();
  ctx.arc(hx, hy, 0.15, 0, Math.PI * 2);
  ctx.moveTo(hx - 0.13, hy - 0.05); ctx.lineTo(hx - 0.1, hy - 0.26); ctx.lineTo(hx - 0.01, hy - 0.13);
  ctx.moveTo(hx + 0.13, hy - 0.05); ctx.lineTo(hx + 0.1, hy - 0.26); ctx.lineTo(hx + 0.01, hy - 0.13);
  paint(ctx, fur, { lw: 0.04, stroke: sheen });
  if (Q.detail) {
    const blink = (t % 5.3) < 0.15;
    for (const ex of [-0.055, 0.055]) {
      if (blink) { ctx.fillStyle = INK.candleGold; ctx.fillRect(hx + ex - 0.035, hy - 0.01, 0.07, 0.015); continue; }
      dot(ctx, hx + ex, hy, 0.04, INK.candleGold);
      ctx.fillStyle = C.ink;
      ctx.fillRect(hx + ex - 0.008 + (o.look || 0) * 0.015, hy - 0.03, 0.016, 0.06);
    }
  }
  ctx.restore();
}
function mouse(ctx, X, Y, dir, t, moving) {
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(dir, 1);
  const b = moving ? Math.abs(Math.sin(t * 22)) * 0.03 : 0;
  ctx.beginPath();
  ctx.moveTo(-0.12, -0.05);
  ctx.quadraticCurveTo(-0.26, -0.02, -0.3, -0.12);
  ctx.strokeStyle = C.pink;
  ctx.lineWidth = 0.02;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, -0.07 - b, 0.13, 0.07, 0, 0, Math.PI * 2);
  ctx.moveTo(0.19, -0.07 - b);
  ctx.lineTo(0.08, -0.12 - b);
  ctx.lineTo(0.08, -0.02 - b);
  paint(ctx, C.grey, { lw: 0.02 });
  dot(ctx, 0.06, -0.14 - b, 0.035, C.pink);
  if (Q.detail) dot(ctx, 0.13, -0.09 - b, 0.012, C.ink);
  ctx.restore();
}

// ---------- The stag over the fireplace ----------
function stagHead(ctx) {
  ctx.beginPath();
  ctx.moveTo(-0.5, -0.45);
  ctx.quadraticCurveTo(0, -0.62, 0.5, -0.45);
  ctx.lineTo(0.46, 0.25);
  ctx.quadraticCurveTo(0.3, 0.62, 0, 0.72);
  ctx.quadraticCurveTo(-0.3, 0.62, -0.46, 0.25);
  ctx.closePath();
  paint(ctx, WOOD, { dots: MAT.mahoganyDark, density: 0.2 });
  for (const s of [-1, 1]) {
    rod(ctx, [[0.14 * s, -0.36], [0.42 * s, -0.78], [0.62 * s, -1.28], [0.58 * s, -1.76]], ANTLER, 0.1);
    rod(ctx, [[0.36 * s, -0.66], [0.78 * s, -0.84]], ANTLER, 0.07);
    rod(ctx, [[0.6 * s, -1.12], [0.98 * s, -1.3]], ANTLER, 0.065);
    rod(ctx, [[0.61 * s, -1.48], [0.9 * s, -1.78]], ANTLER, 0.055);
    rod(ctx, [[0.59 * s, -1.62], [0.42 * s, -1.96]], ANTLER, 0.055);
  }
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(0.38 * s, -0.28, 0.22, 0.09, 0.5 * s, 0, Math.PI * 2);
    paint(ctx, shade(MAT.fur, 0.12), { lw: 0.03 });
  }
  ctx.beginPath();
  ctx.moveTo(-0.27, -0.38);
  ctx.quadraticCurveTo(0, -0.52, 0.27, -0.38);
  ctx.quadraticCurveTo(0.31, 0.08, 0.14, 0.5);
  ctx.quadraticCurveTo(0, 0.62, -0.14, 0.5);
  ctx.quadraticCurveTo(-0.31, 0.08, -0.27, -0.38);
  paint(ctx, MAT.fur, { dots: shade(MAT.fur, 0.4), density: 0.15, lw: 0.035 });
  ctx.beginPath();
  ctx.ellipse(0, 0.47, 0.12, 0.08, 0, 0, Math.PI * 2);
  paint(ctx, C.ink, { lw: 0.02 });
  // A little brass plate with his name on it.
  ctx.beginPath();
  ctx.roundRect(-0.2, 0.55, 0.4, 0.12, 0.03);
  paint(ctx, MAT.brass, { lw: 0.02 });
  if (Q.detail) words(ctx, 'NIGEL', 0, 0.612, 0.085, C.ink, { font: SANS });
}
function stagEyes(ctx, look) {
  for (const s of [-1, 1]) {
    const ex = 0.15 * s, ey = -0.12;
    dot(ctx, ex, ey, 0.07, INK.bone);
    ctx.lineWidth = 0.02;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    dot(ctx, ex + look * 0.035, ey + 0.01, 0.038, C.ink);
    dot(ctx, ex + look * 0.035 - 0.012, ey - 0.012, 0.012, C.white);
  }
}

// ---------- The walls ----------
const DOOR_GAPS = (side) => (DOORS['billiard-room'] || []).filter((d) => d.side === side)
  .map((d) => [d.at - (d.w ?? 2.2) / 2, d.at + (d.w ?? 2.2) / 2, d.h ?? 3.6]);
// Runs along a wall that skip its doors below the lintel: [u0, u1] pieces at height z.
function pieces(side, u0, u1, z) {
  let out = [[u0, u1]];
  for (const [a, b, h] of DOOR_GAPS(side)) {
    if (z >= h) continue;
    out = out.flatMap(([p, q]) => (q <= a || p >= b ? [[p, q]] : [[p, Math.min(q, a)], [Math.max(p, b), q]].filter(([m, n]) => n - m > 0.01)));
  }
  return out;
}

export default {
  id: 'billiard-room',
  name: 'Billiard Room',
  blurb: 'Rupert is losing at cards to the chauffeur. So far he has bet his car, his shoes and the house.',

  build(R) {
    const [ox, oy, oz] = R.origin;

    // ---------- Floor and walls ----------
    R.floor((ctx) => {
      slab(ctx, OAK);
      planks(ctx, OAK, 0.8);
    });
    R.walls({
      left: WALL_L, right: WALL_R, cap: INK.bone, cut: INK.stormNavy,
      dotsL: shade(WALL_L, 0.4), dotsR: shade(WALL_R, 0.4), densL: 0.12, densR: 0.12,
      doors: DOORS['billiard-room'] || [],
    });
    // Striped paper above mahogany panelling, both walls, around the door.
    R.wall((ctx) => {
      for (const side of ['left', 'right']) {
        const f = side === 'left' ? onLeft : onRight;
        const stripe = shade(side === 'left' ? WALL_L : WALL_R, 0.2);
        if (Q.detail) {
          for (let u = 0.3; u < 16; u += 0.8) {
            for (const [a, b] of pieces(side, u, u + 0.3, 1.35)) f(ctx, a, 1.35, b - a, 6 - 1.35, stripe, { stroke: false });
            for (const [a, b, h] of DOOR_GAPS(side)) if (side === 'right' && u < b && u + 0.3 > a) f(ctx, Math.max(u, a), h, Math.min(u + 0.3, b) - Math.max(u, a), 6 - h, stripe, { stroke: false });
          }
        }
        for (const [a, b] of pieces(side, 0, 16, 0)) {
          f(ctx, a, 0, b - a, 1.25, WOOD_D, { stroke: false, dots: shade(WOOD_D, 0.45), density: 0.16 });
          f(ctx, a, 1.2, b - a, 0.14, WOOD, { stroke: false });
          f(ctx, a, 0, b - a, 0.2, shade(WOOD_D, 0.25), { stroke: false });
          if (!Q.detail) continue;
          for (let u = a + 0.2; u + 1.2 < b; u += 1.5) {
            f(ctx, u, 0.35, 1.2, 0.7, null, { lw: 0.03, stroke: tint(WOOD_D, 0.2) });
          }
        }
      }
    });

    // ---------- The left wall: windows, cue rack, fireplace, scoreboard ----------
    stormWindow(R, 'left', 1.5, 2, 2, 2.6);
    stormWindow(R, 'left', 12.5, 2, 2, 2.6);
    // Rain running down the glass.
    R.decor((ctx, t) => {
      if (!Q.detail) return;
      for (const u of [1.5, 12.5]) {
        for (let i = 0; i < 6; i++) {
          const k = (t * (0.35 + hash(i, u) * 0.3) + hash(i, 7)) % 1;
          const y = u + 0.15 + hash(i, u + 1) * 1.7, z = 4.5 - k * 2.4;
          face(ctx, [[0, y, z], [0, y, z + 0.28]], null, { lw: 0.035, stroke: alpha(INK.bone, 0.45 * (1 - k * 0.6)) });
        }
      }
    }, { anim: true });
    drapes(R, 'left', 1.5, 2, 2, 2.6, MAT.velvet);
    drapes(R, 'left', 12.5, 2, 2, 2.6, MAT.velvet);
    // A bat asleep under the pelmet; the lightning wakes it every time.
    R.decor((ctx, t) => {
      const k = storm.flash(t);
      const s = storm.strike(t);
      const up = s && s.age < 1.2 ? 1 : 0;
      const [X, Y] = P(0.08, 14.95, 4.9);
      ctx.save();
      ctx.translate(X, Y);
      ctx.fillStyle = C.ink;
      ctx.fillRect(-0.03, -0.04, 0.02, 0.06);
      ctx.fillRect(0.01, -0.04, 0.02, 0.06);
      ctx.beginPath();
      if (up) {
        const fl = Math.sin(t * 30) * 0.06;
        ctx.moveTo(0, 0.05);
        ctx.quadraticCurveTo(-0.3, -0.05 + fl, -0.42, 0.1 + fl);
        ctx.lineTo(-0.3, 0.14); ctx.lineTo(-0.22, 0.1); ctx.lineTo(-0.1, 0.22);
        ctx.lineTo(0, 0.3);
        ctx.lineTo(0.1, 0.22); ctx.lineTo(0.22, 0.1); ctx.lineTo(0.3, 0.14);
        ctx.lineTo(0.42, 0.1 + fl);
        ctx.quadraticCurveTo(0.3, -0.05 + fl, 0, 0.05);
      } else {
        ctx.ellipse(0, 0.17, 0.08, 0.14, 0, 0, Math.PI * 2);
      }
      paint(ctx, mix(C.ink, INK.deepPlum, 0.35), { lw: 0.02 });
      ctx.beginPath();
      ctx.arc(0, 0.3, 0.055, 0, Math.PI * 2);
      paint(ctx, mix(C.ink, INK.deepPlum, 0.35), { lw: 0.02 });
      if (Q.detail) {
        const o = up ? 0.035 : 0.022;
        dot(ctx, -0.022, 0.31, o * 0.6, up || k > 0.2 ? INK.candleGold : alpha(INK.candleGold, 0.4));
        dot(ctx, 0.022, 0.31, o * 0.6, up || k > 0.2 ? INK.candleGold : alpha(INK.candleGold, 0.4));
      }
      ctx.restore();
    }, { anim: true });

    // The scoreboard, chalked: billiards and cards, all evening.
    R.decor((ctx) => {
      onX(ctx, 0, 11.5, 3.25, (g) => {
        g.beginPath();
        g.rect(-0.08, -0.08, 1.76, 1.46);
        paint(g, WOOD, { lw: 0.04, dots: MAT.mahoganyDark, density: 0.2 });
        g.beginPath();
        g.rect(0.04, 0.04, 1.52, 1.22);
        paint(g, SLATE, { lw: 0.02, dots: shade(SLATE, 0.4), density: 0.15 });
        if (!Q.detail) return;
        words(g, 'SCORE', 0.8, 0.2, 0.17, CHALK, { font: SANS, max: 0.9 });
        g.fillStyle = CHALK;
        g.fillRect(0.2, 0.33, 1.2, 0.02);
        words(g, 'RUPERT', 0.14, 0.55, 0.15, CHALK, { font: SANS, align: 'left', max: 0.8 });
        words(g, '0', 1.42, 0.55, 0.26, CHALK, { align: 'right' });
        words(g, 'CHAUFFEUR', 0.14, 0.88, 0.15, CHALK, { font: SANS, align: 'left', max: 0.8 });
        words(g, '147', 1.44, 0.88, 0.26, CHALK, { align: 'right', max: 0.5 });
        // tally marks for the cards
        g.strokeStyle = CHALK;
        g.lineWidth = 0.025;
        g.beginPath();
        for (let i = 0; i < 9; i++) {
          const x = 0.2 + i * 0.1 + Math.floor(i / 5) * 0.08;
          if (i % 5 === 4) { g.moveTo(x - 0.44, 1.18); g.lineTo(x, 1.06); } else { g.moveTo(x, 1.04); g.lineTo(x, 1.2); }
        }
        g.stroke();
      });
      // House rules, in brass, above it.
      onX(ctx, 0, 11.4, 4.35, (g) => {
        g.beginPath();
        g.rect(0, 0, 1.55, 0.6);
        paint(g, MAT.brass, { lw: 0.035, dots: MAT.brassDark, density: 0.2 });
        g.beginPath();
        g.rect(0.07, 0.06, 1.41, 0.48);
        paint(g, INK.bone, { lw: 0.02 });
        if (!Q.detail) return;
        words(g, 'HOUSE RULE', 0.775, 0.17, 0.12, INK.oxblood, { font: SANS, max: 1.2 });
        words(g, 'NO BETTING', 0.775, 0.31, 0.13, C.ink, { max: 1.3 });
        words(g, 'THE HOUSE', 0.775, 0.45, 0.13, C.ink, { max: 1.3 });
      });
    });

    // ---------- The right wall: a painting, signs, antlers, the door ----------
    // Geese playing poker. The one with the monocle has four aces.
    painting(R, 'right', 1.2, 2.55, 4.6, 2.0, mix(INK.deepPlum, INK.stormNavy, 0.35), (ctx) => {
      onY(ctx, 0, 1.2, 4.55, (g) => {
        // lamp and its glow
        g.beginPath();
        g.ellipse(2.3, 0.75, 1.2, 0.5, 0, 0, Math.PI * 2);
        g.fillStyle = alpha(INK.candleGold, 0.18);
        g.fill();
        g.beginPath();
        g.moveTo(2.15, 0.2); g.lineTo(2.45, 0.2); g.lineTo(2.6, 0.42); g.lineTo(2.0, 0.42);
        g.closePath();
        paint(g, INK.candleGold, { lw: 0.025 });
        g.fillStyle = C.ink;
        g.fillRect(2.29, 0, 0.02, 0.2);
        const goose = (x, y, s, mono) => {
          g.save();
          g.translate(x, y);
          g.scale(s, s);
          g.beginPath();
          g.ellipse(0, 0.25, 0.32, 0.26, 0, 0, Math.PI * 2);
          paint(g, C.white, { lw: 0.03 });
          g.beginPath();
          g.moveTo(-0.05, 0.05);
          g.quadraticCurveTo(-0.1, -0.25, 0.02, -0.38);
          g.lineWidth = 0.13;
          g.strokeStyle = C.ink;
          g.stroke();
          g.lineWidth = 0.08;
          g.strokeStyle = C.white;
          g.stroke();
          g.beginPath();
          g.arc(0.03, -0.4, 0.11, 0, Math.PI * 2);
          paint(g, C.white, { lw: 0.03 });
          g.beginPath();
          g.moveTo(0.1, -0.43); g.lineTo(0.3, -0.38); g.lineTo(0.1, -0.35);
          paint(g, C.coral, { lw: 0.02 });
          dot(g, 0.05, -0.43, 0.022, C.ink);
          if (mono) {
            g.beginPath();
            g.arc(0.05, -0.43, 0.05, 0, Math.PI * 2);
            g.strokeStyle = INK.candleGold;
            g.lineWidth = 0.02;
            g.stroke();
          }
          g.restore();
        };
        goose(0.8, 0.85, 1, false);
        goose(3.8, 0.85, -1, false);
        goose(2.3, 0.6, 1.05, true);
        // the table, and everyone's cards
        g.beginPath();
        g.ellipse(2.3, 1.45, 1.6, 0.35, 0, 0, Math.PI * 2);
        paint(g, BAIZE, { lw: 0.03 });
        g.fillStyle = WOOD;
        g.fillRect(1.0, 1.72, 0.1, 0.25);
        g.fillRect(3.5, 1.72, 0.1, 0.25);
        const fan = (x, y, n, a0) => {
          for (let i = 0; i < n; i++) {
            g.save();
            g.translate(x, y);
            g.rotate(a0 + i * 0.25);
            g.beginPath();
            g.rect(-0.07, -0.2, 0.14, 0.2);
            paint(g, INK.bone, { lw: 0.015 });
            dot(g, 0, -0.12, 0.03, i % 2 ? INK.oxblood : C.ink);
            g.restore();
          }
        };
        fan(1.05, 1.1, 3, -0.3);
        fan(3.55, 1.1, 3, -0.3);
        fan(2.3, 1.05, 4, -0.38);
        // a pile of chips in the middle
        for (let i = 0; i < 4; i++) {
          g.beginPath();
          g.ellipse(2.05 + i * 0.16, 1.42 - (i % 2) * 0.04, 0.07, 0.03, 0, 0, Math.PI * 2);
          paint(g, [INK.oxblood, INK.bone, INK.candleGold, C.navy][i], { lw: 0.012 });
        }
      });
    });
    R.decor((ctx) => {
      // NO SMOKING, right above the cigar.
      onY(ctx, 0, 3.3, 2.02, (g) => {
        g.beginPath();
        g.roundRect(0, 0, 1.3, 0.46, 0.06);
        paint(g, INK.bone, { lw: 0.03 });
        g.beginPath();
        g.roundRect(0.05, 0.05, 1.2, 0.36, 0.04);
        g.strokeStyle = INK.oxblood;
        g.lineWidth = 0.03;
        g.stroke();
        if (Q.detail) words(g, 'NO SMOKING', 0.65, 0.235, 0.17, INK.oxblood, { font: SANS, max: 1.05 });
      });
      // The door's surround.
      for (const [a, b, h] of DOOR_GAPS('right')) {
        onRight(ctx, a - 0.28, 0, 0.28, h + 0.3, WOOD, { dots: MAT.mahoganyDark, density: 0.2, lw: 0.035 });
        onRight(ctx, b, 0, 0.28, h + 0.3, WOOD, { dots: MAT.mahoganyDark, density: 0.2, lw: 0.035 });
        onRight(ctx, a - 0.4, h + 0.3, b - a + 0.8, 0.22, WOOD, { lw: 0.035 });
        onRight(ctx, (a + b) / 2 - 0.18, h + 0.05, 0.36, 0.45, MAT.brass, { lw: 0.03 });
      }
      // Antlers on shields, the Lord's, from before he got into geese.
      for (const [x, z, s] of [[7.35, 3.3, 0.8], [12.45, 3.5, 0.75], [13.95, 3.3, 0.9], [15.35, 3.5, 0.75]]) {
        const [X, Y] = P(x, 0, z);
        ctx.save();
        ctx.translate(X, Y);
        ctx.scale(s, s);
        ctx.beginPath();
        ctx.ellipse(0, 0.1, 0.24, 0.3, 0, 0, Math.PI * 2);
        paint(ctx, WOOD, { lw: 0.035 });
        for (const k of [-1, 1]) {
          rod(ctx, [[0.06 * k, -0.05], [0.3 * k, -0.4], [0.42 * k, -0.85]], ANTLER, 0.08);
          rod(ctx, [[0.24 * k, -0.3], [0.55 * k, -0.45]], ANTLER, 0.06);
          rod(ctx, [[0.36 * k, -0.62], [0.62 * k, -0.8]], ANTLER, 0.05);
        }
        ctx.beginPath();
        ctx.ellipse(0, 0, 0.1, 0.07, 0, 0, Math.PI * 2);
        paint(ctx, ANTLER, { lw: 0.025 });
        ctx.restore();
      }
      // A mouse hole in the skirting.
      onY(ctx, 0, 7.4, 0.32, (g) => {
        g.beginPath();
        g.moveTo(0, 0.32);
        g.lineTo(0, 0.14);
        g.arc(0.15, 0.14, 0.15, Math.PI, 0);
        g.lineTo(0.3, 0.32);
        g.closePath();
        paint(g, C.black, { lw: 0.02 });
      });
    });

    // ---------- Along the back walls (drawn before anything that stands up) ----------
    R.rug((ctx) => {
      // A rug under the card game.
      rect(ctx, 8.9, 9.5, 6.4, 5.7, 0.01, INK.oxblood, { lw: 0.03 });
      rect(ctx, 9.25, 9.85, 5.7, 5.0, 0.012, mix(INK.deepPlum, INK.stormNavy, 0.4), { stroke: false, dots: INK.deepPlum, density: 0.25 });
      if (Q.detail) {
        rect(ctx, 9.55, 10.15, 5.1, 4.4, 0.013, null, { lw: 0.04, stroke: INK.candleGold });
        for (let i = 0; i < 12; i++) {
          const x = 9.2 + i * 0.5;
          face(ctx, [[x, 15.2, 0.01], [x - 0.05, 15.45, 0.01]], null, { lw: 0.03, stroke: INK.bone });
        }
      }
      // A zebra, formerly. Flat, with his head still on, and still cross about it.
      onFlat(ctx, 2.15, 10.3, 0.015, 0.2, (g) => {
        g.beginPath();
        g.moveTo(-0.55, -1.2);
        g.lineTo(-0.35, -0.8); g.lineTo(-1.05, -0.95); g.lineTo(-0.95, -0.55); g.lineTo(-0.5, -0.45);
        g.lineTo(-0.55, 0.5); g.lineTo(-1.1, 0.6); g.lineTo(-0.95, 1.0); g.lineTo(-0.45, 0.85);
        g.lineTo(0, 1.25);
        g.lineTo(0.45, 0.85); g.lineTo(0.95, 1.0); g.lineTo(1.1, 0.6); g.lineTo(0.55, 0.5);
        g.lineTo(0.5, -0.45); g.lineTo(0.95, -0.55); g.lineTo(1.05, -0.95); g.lineTo(0.35, -0.8);
        g.lineTo(0.55, -1.2);
        g.quadraticCurveTo(0, -1.45, -0.55, -1.2);
        g.closePath();
        paint(g, TIGER, { lw: 0.04, dots: shade(TIGER, 0.3), density: 0.15 });
        if (Q.detail) {
          g.strokeStyle = C.ink;
          g.lineWidth = 0.07;
          g.lineCap = 'round';
          g.beginPath();
          for (let i = 0; i < 6; i++) {
            const v = -0.9 + i * 0.32;
            g.moveTo(-0.45, v); g.quadraticCurveTo(-0.25, v + 0.08, -0.15, v - 0.02);
            g.moveTo(0.45, v); g.quadraticCurveTo(0.25, v + 0.08, 0.15, v - 0.02);
          }
          g.stroke();
          // the tail
          g.beginPath();
          g.moveTo(0, -1.35);
          g.quadraticCurveTo(0.4, -1.8, 0.1, -2.1);
          g.lineWidth = 0.12;
          g.strokeStyle = C.ink;
          g.stroke();
          g.lineWidth = 0.07;
          g.strokeStyle = TIGER;
          g.stroke();
        }
      });
      // His head, still snarling at whoever steps on him.
      sprite(ctx, 1.88, 11.62, 0.02, (g) => {
        g.beginPath();
        g.ellipse(0, -0.2, 0.34, 0.26, 0, 0, Math.PI * 2);
        g.moveTo(-0.3, -0.36); g.lineTo(-0.24, -0.52); g.lineTo(-0.12, -0.42);
        g.moveTo(0.3, -0.36); g.lineTo(0.24, -0.52); g.lineTo(0.12, -0.42);
        paint(g, TIGER, { lw: 0.035, dots: shade(TIGER, 0.3), density: 0.15 });
        g.beginPath();
        g.ellipse(0, -0.08, 0.17, 0.12, 0, 0, Math.PI * 2);
        paint(g, INK.bone, { lw: 0.025 });
        g.beginPath();
        g.ellipse(0, -0.02, 0.1, 0.06, 0, 0, Math.PI * 2);
        paint(g, INK.oxblood, { lw: 0.02 });
        dot(g, 0, -0.15, 0.04, C.ink);
        if (!Q.detail) return;
        g.fillStyle = C.white;
        g.beginPath();
        g.moveTo(-0.07, -0.06); g.lineTo(-0.05, 0.02); g.lineTo(-0.03, -0.06);
        g.moveTo(0.07, -0.06); g.lineTo(0.05, 0.02); g.lineTo(0.03, -0.06);
        g.fill();
        for (const s of [-1, 1]) {
          dot(g, s * 0.13, -0.27, 0.045, INK.candleGold);
          dot(g, s * 0.13, -0.27, 0.02, C.ink);
          g.beginPath();
          g.moveTo(s * 0.2, -0.36); g.lineTo(s * 0.28, -0.3);
          g.moveTo(s * 0.26, -0.18); g.lineTo(s * 0.33, -0.16);
          g.strokeStyle = C.ink;
          g.lineWidth = 0.035;
          g.stroke();
        }
      });
      // Soft shadows under the furniture.
      ctx.fillStyle = alpha(C.ink, 0.16);
      for (const [x, y, w, d] of [[2.7, 4.2, 7.1, 4.1], [10.3, 10.3, 2.9, 2.9], [6.6, 12.8, 1.6, 0.9], [9.3, 11.3, 1.0, 1.0], [13.3, 11.3, 1.0, 1.0], [14.5, 10.2, 1.2, 1.25]]) {
        face(ctx, [[x, y, 0.005], [x + w, y, 0.005], [x + w, y + d, 0.005], [x, y + d, 0.005]], alpha(C.ink, 0.16), { stroke: false });
      }
      // The standard lamp's foot.
      cylinder(ctx, 9.05, 13.6, 0, 0.3, 0.07, MAT.brassDark, { flat: true });
      // Rupert's IOUs, screwed up and thrown away.
      if (Q.detail) {
        [[8.75, 12.3, 0.11], [9.7, 12.85, 0.1], [8.3, 13.0, 0.09], [10.1, 13.75, 0.11]].forEach(([x, y, r], n) => {
          const [X, Y] = P(x, y, r);
          ctx.beginPath();
          for (let i = 0; i < 9; i++) {
            const a = (i / 9) * Math.PI * 2, q = r * (0.75 + hash(n, i) * 0.55);
            i ? ctx.lineTo(X + Math.cos(a) * q, Y + Math.sin(a) * q * 0.85) : ctx.moveTo(X + Math.cos(a) * q, Y + Math.sin(a) * q * 0.85);
          }
          ctx.closePath();
          paint(ctx, INK.bone, { lw: 0.02, dots: MANILA, density: 0.35 });
          ctx.beginPath();
          ctx.moveTo(X - r * 0.6, Y - r * 0.3); ctx.lineTo(X - r * 0.1, Y + r * 0.1); ctx.lineTo(X + r * 0.2, Y - r * 0.45);
          ctx.moveTo(X - r * 0.1, Y + r * 0.1); ctx.lineTo(X + r * 0.1, Y + r * 0.6);
          ctx.strokeStyle = alpha(C.ink, 0.45);
          ctx.lineWidth = 0.015;
          ctx.stroke();
        });
        onFlat(ctx, 8.35, 14.1, 0.012, 0.4, (g) => {
          g.beginPath();
          g.rect(-0.2, -0.13, 0.4, 0.26);
          paint(g, INK.bone, { lw: 0.02 });
          words(g, 'IOU', 0, 0, 0.12, INK.oxblood);
        });
      }

      // The fireplace: marble, with the stag over it and candles on the mantel.
      rect(ctx, 0.55, 6.55, 1.0, 2.9, 0.02, MAT.stone, { lw: 0.03, dots: MAT.stoneDark, density: 0.12 });
      box(ctx, 0, 6.7, 0, 0.55, 2.6, 1.55, MAT.marble, { top: MAT.marble, dotsL: MAT.marbleVein, dotsR: MAT.marbleVein });
      onX(ctx, 0.551, 8.62, 1.02, (g) => {
        g.beginPath();
        g.moveTo(0, 1.02);
        g.lineTo(0, 0.25);
        g.quadraticCurveTo(0.62, -0.12, 1.24, 0.25);
        g.lineTo(1.24, 1.02);
        g.closePath();
        paint(g, C.black, { lw: 0.03 });
        g.fillStyle = shade(INK.oxblood, 0.4);
        g.fillRect(0.2, 0.75, 0.84, 0.18);
      });
      // the grate
      for (let i = 0; i < 5; i++) face(ctx, [[0.62, 7.62 + i * 0.19, 0.05], [0.62, 7.62 + i * 0.19, 0.38]], null, { lw: 0.04, stroke: C.ink });
      face(ctx, [[0.64, 7.55, 0.38], [0.64, 8.45, 0.38]], null, { lw: 0.05, stroke: C.ink });
      box(ctx, -0.05, 6.5, 1.55, 0.8, 3.0, 0.14, MAT.marble, { top: tint(MAT.marble, 0.2) });
      // brass fender, poker and scuttle
      face(ctx, [[1.45, 6.7, 0.15], [1.45, 9.3, 0.15]], null, { lw: 0.06, stroke: MAT.brass });
      face(ctx, [[0.7, 6.7, 0.15], [1.45, 6.7, 0.15]], null, { lw: 0.06, stroke: MAT.brass });
      face(ctx, [[0.7, 9.3, 0.15], [1.45, 9.3, 0.15]], null, { lw: 0.06, stroke: MAT.brass });
      cylinder(ctx, 0.95, 6.1, 0, 0.26, 0.45, MAT.brassDark, { top: C.black });
      rod(ctx, [P(0.9, 9.75, 0), P(0.9, 9.75, 1.3)], MAT.brassDark, 0.05);
      for (const [dy, len] of [[-0.08, 1.0], [0.08, 0.9]]) rod(ctx, [P(0.95, 9.75 + dy, 1.2), P(1.0, 9.75 + dy * 2, 1.2 - len)], C.ink, 0.04);
      // on the mantel: a clock that stopped at midnight, and two candlesticks
      box(ctx, 0.2, 7.75, 1.69, 0.3, 0.5, 0.42, WOOD, { top: tint(WOOD, 0.1) });
      const [cX, cY] = P(0.5, 8.0, 1.9);
      ctx.beginPath();
      ctx.arc(cX, cY, 0.13, 0, Math.PI * 2);
      paint(ctx, INK.bone, { lw: 0.025 });
      rod(ctx, [[cX, cY], [cX, cY - 0.1]], C.ink, 0.015);
      for (const y of [7.05, 8.95]) {
        cylinder(ctx, 0.4, y, 1.69, 0.08, 0.05, MAT.brass, { flat: true });
        rod(ctx, [P(0.4, y, 1.72), P(0.4, y, 1.82)], MAT.brass, 0.05);
      }
      // the stag
      const [sX, sY] = P(0.1, 8, 3.3);
      ctx.save();
      ctx.translate(sX, sY);
      stagHead(ctx);
      ctx.restore();

      // The cue rack: seven cues and the one Rupert snapped.
      box(ctx, 0, 4.5, 0.4, 0.12, 1.7, 3.3, WOOD, { flat: true });
      box(ctx, 0, 4.45, 0.3, 0.42, 1.8, 0.14, WOOD_D);
      for (let i = 0; i < 8; i++) {
        const y = 4.62 + i * 0.21;
        if (i === 5) {
          rod(ctx, [P(0.3, y, 0.44), P(0.28, y, 1.9)], WOOD_D, 0.055);
          rod(ctx, [P(0.3, y, 1.9), P(0.36, y - 0.05, 2.02)], MAT.oakLight, 0.04);
          continue;
        }
        rod(ctx, [P(0.3, y, 0.44), P(0.28, y, 1.5)], WOOD_D, 0.06);
        rod(ctx, [P(0.28, y, 1.5), P(0.22, y, 3.45)], MAT.oakLight, 0.045);
        rod(ctx, [P(0.22, y, 3.45), P(0.22, y, 3.52)], mix(C.sky, INK.bone, 0.4), 0.045);
      }
      box(ctx, 0, 4.45, 3.0, 0.32, 1.8, 0.12, WOOD_D);
      // the snapped half, on the floor
      rod(ctx, [P(0.75, 6.3, 0.03), P(1.4, 5.3, 0.03)], MAT.oakLight, 0.045);

      // Ringside seats for watching Rupert lose, and the cigar someone left.
      clubChair(ctx, 1.1, 0.55);
      clubChair(ctx, 5.2, 0.55);
      cylinder(ctx, 3.95, 1.25, 0, 0.1, 0.9, WOOD_D, { flat: true });
      cylinder(ctx, 3.95, 1.25, 0.0, 0.3, 0.06, WOOD_D, { flat: true });
      cylinder(ctx, 3.95, 1.25, 0.9, 0.45, 0.08, WOOD, { top: tint(WOOD, 0.1) });
      cylinder(ctx, 3.85, 1.2, 0.98, 0.17, 0.04, MAT.silver, { top: shade(MAT.silver, 0.2) });
      rod(ctx, [P(3.8, 1.18, 1.04), P(4.1, 1.35, 1.04)], mix(MAT.oak, C.ink, 0.3), 0.06);
      dot(ctx, ...P(4.12, 1.36, 1.04), 0.035, C.coral);
      // a brandy glass
      const [gX, gY] = P(4.15, 1.05, 0.98);
      ctx.beginPath();
      ctx.ellipse(gX, gY - 0.2, 0.1, 0.11, 0, 0, Math.PI * 2);
      paint(ctx, GLASS, { lw: 0.02 });
      ctx.fillStyle = alpha(MAT.brassDark, 0.8);
      ctx.fillRect(gX - 0.08, gY - 0.2, 0.16, 0.08);

      // The sideboard: a gramophone and the Lord's decanter.
      box(ctx, 12.3, 0.08, 0, 3.4, 0.85, 1.15, WOOD, { top: tint(WOOD, 0.08), dotsL: MAT.mahoganyDark });
      if (Q.detail) {
        for (const x of [12.45, 13.6, 14.75]) face(ctx, [[x, 0.93, 0.15], [x + 1.0, 0.93, 0.15], [x + 1.0, 0.93, 0.95], [x, 0.93, 0.95]], null, { lw: 0.03, stroke: shade(WOOD, 0.3) });
        for (const x of [13.35, 13.75, 14.5, 14.9]) dot(ctx, ...P(x, 0.93, 0.62), 0.035, MAT.brass);
      }
      box(ctx, 12.7, 0.2, 1.15, 0.8, 0.62, 0.32, WOOD_D, { top: WOOD });
      face(ctx, [[12.8, 0.3, 1.475], [13.4, 0.3, 1.475], [13.4, 0.72, 1.475], [12.8, 0.72, 1.475]], C.black, { lw: 0.02 });
      // the horn
      {
        const [bX, bY] = P(13.3, 0.35, 1.55);
        const [mX, mY] = P(13.75, 0.75, 2.55);
        ctx.beginPath();
        ctx.moveTo(bX - 0.04, bY);
        ctx.quadraticCurveTo(bX + 0.1, bY - 0.5, mX - 0.45, mY + 0.2);
        ctx.lineTo(mX + 0.25, mY - 0.35);
        ctx.quadraticCurveTo(bX + 0.25, bY - 0.35, bX + 0.06, bY);
        ctx.closePath();
        paint(ctx, MAT.brass, { lw: 0.03, dots: MAT.brassDark, density: 0.25 });
        ctx.beginPath();
        ctx.ellipse(mX - 0.1, mY - 0.08, 0.4, 0.2, -0.65, 0, Math.PI * 2);
        paint(ctx, MAT.brassDark, { lw: 0.03 });
      }
      // a decanter and a lamp at the far end
      {
        const [dX, dY] = P(15.2, 0.45, 1.15);
        ctx.beginPath();
        ctx.moveTo(dX - 0.06, dY - 0.55);
        ctx.lineTo(dX - 0.06, dY - 0.4);
        ctx.quadraticCurveTo(dX - 0.2, dY - 0.3, dX - 0.18, dY);
        ctx.lineTo(dX + 0.18, dY);
        ctx.quadraticCurveTo(dX + 0.2, dY - 0.3, dX + 0.06, dY - 0.4);
        ctx.lineTo(dX + 0.06, dY - 0.55);
        ctx.closePath();
        paint(ctx, GLASS, { lw: 0.02 });
        ctx.fillStyle = alpha(MAT.brassDark, 0.85);
        ctx.fillRect(dX - 0.17, dY - 0.16, 0.34, 0.15);
        dot(ctx, dX, dY - 0.6, 0.06, GLASS);
      }
      rod(ctx, [P(14.6, 0.45, 1.15), P(14.6, 0.45, 1.75)], MAT.brass, 0.05);
      {
        const [lX, lY] = P(14.6, 0.45, 1.75);
        ctx.beginPath();
        ctx.moveTo(lX - 0.32, lY + 0.08);
        ctx.quadraticCurveTo(lX, lY - 0.3, lX + 0.32, lY + 0.08);
        ctx.closePath();
        paint(ctx, INK.verdigris, { lw: 0.025 });
      }
    });

    // The stag's glass eyes follow the money.
    R.rug((ctx, t) => {
      const tt = lt(t);
      const look = tt > 70 && tt < 99 ? 0.9 : Math.sin(t * 0.37) * 0.8;
      const [sX, sY] = P(0.1, 8, 3.3);
      ctx.save();
      ctx.translate(sX, sY);
      stagEyes(ctx, look);
      ctx.restore();
    }, { anim: true });
    // The gramophone plays on, lights or no lights.
    R.rug((ctx, t) => {
      const a = t * 4;
      const [rX, rY] = P(13.1, 0.51, 1.48);
      dot(ctx, rX + Math.cos(a) * 0.12, rY + Math.sin(a) * 0.06, 0.04, INK.oxblood);
      if (!Q.detail) return;
      for (let i = 0; i < 3; i++) {
        const k = ((t * 0.3 + i / 3) % 1);
        note(ctx, 13.95 + k * 0.6 + Math.sin(k * 6 + i) * 0.15, 0.85 + k * 0.2, 2.5 + k * 1.6, alpha(INK.bone, 0.9 * (1 - k)), 0.7);
      }
    }, { anim: true });
    // Cigar smoke, curling up past the NO SMOKING sign.
    R.rug((ctx, t) => {
      if (!Q.detail) return;
      particles(t, 9, 5.5, (k, r) => {
        const x = 4.1 + Math.sin(k * 5 + r() * 6) * 0.25 * k + k * 0.4;
        const [X, Y] = P(x, 1.36, 1.1 + k * 2.6);
        ctx.beginPath();
        ctx.arc(X, Y, 0.05 + k * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = alpha(SMOKE, 0.32 * (1 - k));
        ctx.fill();
      }, 11);
    }, { anim: true });

    // ---------- The billiard table ----------
    const REDS = [];
    for (let r = 0; r < 5; r++) for (let j = 0; j <= r; j++) REDS.push([7.55 + r * 0.2, 6.25 + (j - r / 2) * 0.23]);
    const COLOURS = [[4.55, 6.95, INK.candleGold], [4.55, 6.25, MAT.oak], [4.55, 5.55, MAT.leaf], [6.25, 6.25, C.navy], [7.3, 6.25, C.pink], [9.0, 6.25, C.ink]];
    // The cat bats the cue ball at the far cushion, and it comes back.
    const CAT = [3.72, 7.25];
    const cueBall = (t) => {
      const k = ((t % 7.4) + 7.4) % 7.4;
      const a = [4.1, 7.2], b = [4.1, 5.0];
      if (k < 0.6) return { p: a, swipe: span(k, 0.35, 0.6) };
      if (k < 2.4) { const s = span(k, 0.6, 2.4); return { p: [a[0], lerp(a[1], b[1], s * (1.3 - 0.3 * s))], swipe: 1 - span(k, 0.6, 0.9) }; }
      if (k < 4.8) { const s = span(k, 2.4, 4.8); return { p: [a[0], lerp(b[1], a[1], 1 - (1 - s) * (1 - s))], swipe: 0 }; }
      return { p: a, swipe: 0 };
    };
    R.thing(6.25, 6.25, (ctx, t) => {
      const on = house.lamp(t) > 0.5;
      const x0 = 3, y0 = 4.5, x1 = 9.5, y1 = 8;
      // six turned legs
      for (const [lx, ly] of [[x0 + 0.35, y0 + 0.35], [6.25, y0 + 0.35], [x1 - 0.35, y0 + 0.35], [x0 + 0.35, y1 - 0.35], [6.25, y1 - 0.35], [x1 - 0.35, y1 - 0.35]]) {
        cylinder(ctx, lx, ly, 0, 0.17, 0.5, WOOD_D, { flat: true });
        cylinder(ctx, lx, ly, 0.2, 0.24, 0.12, WOOD, { flat: true });
      }
      box(ctx, x0, y0, 0.5, x1 - x0, y1 - y0, 0.4, WOOD, { dotsL: MAT.mahoganyDark });
      if (Q.detail) {
        for (let i = 0; i < 3; i++) face(ctx, [[x0 + 0.3 + i * 2.1, y1, 0.58], [x0 + 2.2 + i * 2.1, y1, 0.58], [x0 + 2.2 + i * 2.1, y1, 0.82], [x0 + 0.3 + i * 2.1, y1, 0.82]], null, { lw: 0.03, stroke: tint(WOOD, 0.2) });
      }
      box(ctx, x0 - 0.05, y0 - 0.05, 0.88, x1 - x0 + 0.1, y1 - y0 + 0.1, 0.12, WOOD, { top: tint(WOOD, 0.1), flat: true });
      rect(ctx, x0 + 0.3, y0 + 0.3, x1 - x0 - 0.6, y1 - y0 - 0.6, 1.0, shade(BAIZE, 0.2), { lw: 0.03 });
      rect(ctx, x0 + 0.4, y0 + 0.4, x1 - x0 - 0.8, y1 - y0 - 0.8, 1.0, BAIZE, { stroke: false, dots: shade(BAIZE, 0.25), density: 0.12 });
      if (on) {
        ctx.fillStyle = alpha(INK.candleGold, 0.16);
        for (const x of [4.4, 6.25, 8.1]) {
          const [X, Y] = P(x, 6.25, 1.0);
          ctx.beginPath();
          ctx.ellipse(X, Y, 1.3, 0.62, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (Q.detail) {
        face(ctx, [[4.55, y0 + 0.4, 1.0], [4.55, y1 - 0.4, 1.0]], null, { lw: 0.02, stroke: alpha(INK.bone, 0.5) });
        for (const x of [4.3, 5.6, 6.9, 8.2]) {
          dot(ctx, ...P(x, y0 + 0.14, 1.0), 0.03, INK.bone);
          dot(ctx, ...P(x, y1 - 0.14, 1.0), 0.03, INK.bone);
        }
      }
      // pockets
      for (const [px, py] of [[x0 + 0.32, y0 + 0.32], [6.25, y0 + 0.26], [x1 - 0.32, y0 + 0.32], [x0 + 0.32, y1 - 0.32], [6.25, y1 - 0.26], [x1 - 0.32, y1 - 0.32]]) {
        const [X, Y] = P(px, py, 1.0);
        ctx.beginPath();
        ctx.ellipse(X, Y, 0.2, 0.1, 0, 0, Math.PI * 2);
        paint(ctx, C.black, { lw: 0.03, stroke: MAT.brass });
      }
      // the balls
      for (const [bx, by] of REDS) ball(ctx, bx, by, 1.0, 0.11, INK.oxblood);
      for (const [bx, by, c] of COLOURS) ball(ctx, bx, by, 1.0, 0.11, c);
      const cb = cueBall(t);
      ball(ctx, cb.p[0], cb.p[1], 1.0, 0.11, C.white);
      // chalk and Inspector Pidge's evidence marker (he thinks it was the black)
      box(ctx, 3.05, 4.62, 1.0, 0.12, 0.12, 0.1, mix(C.sky, C.white, 0.2), { flat: true, lw: 0.02 });
      box(ctx, 9.3, 7.65, 1.0, 0.12, 0.12, 0.1, mix(C.sky, C.white, 0.2), { flat: true, lw: 0.02 });
      {
        const [X, Y] = P(8.75, 6.75, 1.0);
        ctx.beginPath();
        ctx.moveTo(X - 0.14, Y); ctx.lineTo(X - 0.05, Y - 0.24); ctx.lineTo(X + 0.08, Y - 0.24); ctx.lineTo(X + 0.14, Y);
        ctx.closePath();
        paint(ctx, INK.candleGold, { lw: 0.02 });
        if (Q.detail) words(ctx, '1', X, Y - 0.1, 0.13, C.ink);
      }
      // the cat
      const [cX, cY] = P(CAT[0], CAT[1], 1.0);
      whiteCat(ctx, cX, cY, t, { swipe: cb.swipe, look: cb.p[1] < 6.5 ? -1 : 0.5 });
      // A spider, lowering itself off the lamp and scuttling back up.
      {
        const k = ((t % 15.7) + 15.7) % 15.7;
        const drop = k < 11 ? 1.4 * (k / 11) : 1.4 * (1 - clamp((k - 11) / 1.1));
        const [X0, Y0] = P(8.62, 6.4, LAMP_Z + 0.05);
        const [X, Y] = P(8.62, 6.4, LAMP_Z - 0.1 - drop * 0.7);
        ctx.beginPath();
        ctx.moveTo(X0, Y0);
        ctx.lineTo(X, Y);
        ctx.strokeStyle = alpha(INK.bone, 0.55);
        ctx.lineWidth = 0.015;
        ctx.stroke();
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 0.02;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const a = 0.35 + i * 0.3 + Math.sin(t * 8 + i) * 0.05;
          ctx.moveTo(X, Y); ctx.lineTo(X - Math.cos(a) * 0.13, Y + Math.sin(a) * 0.1 - 0.02);
          ctx.moveTo(X, Y); ctx.lineTo(X + Math.cos(a) * 0.13, Y + Math.sin(a) * 0.1 - 0.02);
        }
        ctx.stroke();
        dot(ctx, X, Y, 0.06, C.ink);
      }
      // The lamp, low over the table: three green shades on a mahogany bar.
      for (const x of [4.9, 7.6]) rod(ctx, [P(x, 6.25, LAMP_Z + 0.18), P(x, 6.25, 5.95)], C.ink, 0.025);
      box(ctx, 3.95, 6.05, LAMP_Z, 4.6, 0.4, 0.18, WOOD_D, { top: WOOD });
      for (const x of [4.35, 6.25, 8.15]) {
        const [X, Yt] = P(x, 6.25, LAMP_Z);
        const Yb = Yt + 0.42 * ZK;
        ctx.beginPath();
        ctx.moveTo(X - 0.15, Yt); ctx.lineTo(X + 0.15, Yt); ctx.lineTo(X + 0.44, Yb); ctx.lineTo(X - 0.44, Yb);
        ctx.closePath();
        paint(ctx, INK.verdigris, { lw: 0.03, dots: shade(INK.verdigris, 0.45), density: 0.2 });
        ctx.beginPath();
        ctx.ellipse(X, Yb, 0.44, 0.13, 0, 0, Math.PI * 2);
        paint(ctx, on ? INK.candleGold : shade(INK.candleGold, 0.6), { lw: 0.03, stroke: MAT.brassDark });
      }
    }, { anim: true });
    R.light({ at: [6.25, 6.25, LAMP_Z - 0.5], r: 4.4, color: INK.candleGold, k: house.lamp });

    // A mouse, out for the crumbs by the armchair.
    R.mover((t) => {
      const k = ((t % 23) + 23) % 23;
      const hole = [7.55, 0.12], crumb = [6.95, 2.55];
      if (k < 3 || k >= 11) return { x: hole[0], y: hole[1], hidden: true };
      if (k < 5) { const s = span(k, 3, 5); return { x: lerp(hole[0], crumb[0], s), y: lerp(hole[1], crumb[1], s), dir: -1, moving: true }; }
      if (k < 9) return { x: crumb[0], y: crumb[1], dir: -1, moving: false, nibble: true };
      const s = span(k, 9, 11);
      return { x: lerp(crumb[0], hole[0], s), y: lerp(crumb[1], hole[1], s), dir: 1, moving: true };
    }, (ctx, t, p) => {
      if (p.hidden) return;
      const [X, Y] = P(p.x, p.y, 0);
      if (Q.detail && p.nibble) dot(ctx, X - 0.22, Y - 0.02, 0.03, MANILA);
      mouse(ctx, X, Y + (p.nibble ? Math.sin(t * 18) * 0.01 : 0), p.dir, t, p.moving);
    });

    // ---------- The card table ----------
    // A standard lamp at Rupert's shoulder (it goes out with the rest), and a
    // candle by the pot (it doesn't: the game goes on in the dark).
    lamp(R, 9.05, 13.6, { h: 2.75, r: 3.6 });
    R.thing(11.75, 11.75, (ctx, t) => {
      const tt = lt(t);
      const x0 = 10.5, y0 = 10.5, s = 2.5;
      for (const [lx, ly] of [[x0 + 0.15, y0 + 0.15], [x0 + s - 0.3, y0 + 0.15], [x0 + 0.15, y0 + s - 0.3], [x0 + s - 0.3, y0 + s - 0.3]]) {
        box(ctx, lx, ly, 0, 0.15, 0.15, 0.8, WOOD_D, { flat: true });
      }
      box(ctx, x0 + 0.1, y0 + 0.1, 0.78, s - 0.2, s - 0.2, 0.18, WOOD, { dotsL: MAT.mahoganyDark });
      box(ctx, x0, y0, 0.95, s, s, 0.07, WOOD, { top: tint(WOOD, 0.1), flat: true });
      rect(ctx, x0 + 0.18, y0 + 0.18, s - 0.36, s - 0.36, 1.021, BAIZE, { lw: 0.02, dots: shade(BAIZE, 0.25), density: 0.12 });
      pawnTicket(ctx);
      for (const c of cardsAt(tt)) card(ctx, c);
      // the candle's brass saucer (the flame is a light, so it burns in the dark)
      cylinder(ctx, CANDLE[0], CANDLE[1], TOP, 0.13, 0.03, MAT.brass, { flat: true });
    }, { anim: true, depth: 23.2 });
    candle(R, CANDLE[0], CANDLE[1], TOP + 0.03, 7, { r: 2.4 });

    // Rupert's chair (he's on the evening's clock; the engine sits him in it).
    R.thing(9.8, 11.8, (ctx) => cardChair(ctx, 9.4, 11.4, 'px'), { depth: 21.2 });

    // The chauffeur, serene, winning. He tips his cap to anyone passing.
    const CAP = dressed('chauffeur').face;
    const passes = [];
    for (const w of R.walkers) {
      if (w.ghost || w.id === 'rupert') continue;
      let best = null;
      for (let s = 0; s <= LOOP; s += 0.25) {
        const p = w.at(s);
        const lx = p.x - ox, ly = p.y - oy;
        if (lx >= 0 && lx < 16 && ly >= 0 && ly < 16 && Math.abs((p.z || 0) - oz) < 1) {
          const d = Math.hypot(lx - 13.8, ly - 11.8);
          if (!best || d < best.d) best = { d, s };
        } else if (best) {
          passes.push(best.s);
          best = null;
        }
      }
      if (best) passes.push(best.s);
    }
    const capTip = (tt) => passes.reduce((m, s) => Math.max(m, Math.sin(Math.PI * span(tt, s - 0.7, s + 0.7))), 0);
    R.thing(13.8, 11.8, (ctx, t) => {
      const tt = lt(t);
      cardChair(ctx, 13.4, 11.4, 'nx', 'seat');
      const arms = armsAt(tt);
      const k = capTip(tt);
      const o = { arms };
      if (k > 0.01) {
        o.arms = [lerp(arms[0], 2.75, k), arms[1]];
        o.face = (g, hy, back, tq) => {
          g.save();
          g.translate(0.02, hy - 0.24);
          g.rotate(-0.4 * k);
          g.translate(-0.02, -(hy - 0.24) - 0.22 * k);
          CAP(g, hy, back, tq);
          g.restore();
        };
      }
      drawCast(ctx, 'chauffeur', { x: 13.8, y: 11.8, z: 0, pose: 'sit', dir: 'l', back: true }, t, o);
      cardChair(ctx, 13.4, 11.4, 'nx', 'back');
      if (!readable()) return;
      const line = saying(tt);
      if (line) speech(ctx, 13.8, 11.8, 2.45, line[2], { size: 0.5, dx: 1.2 });
      else tag(ctx, 13.8, 11.8, 2.3, 'The chauffeur', { size: 0.34 });
    }, { anim: true });

    // His winnings: a crate of everything Rupert has lost so far.
    R.thing(CRATE.x + 0.5, CRATE.y + 0.5, (ctx) => {
      const { x, y, w, d, h } = CRATE;
      face(ctx, [[x, y, h], [x + w, y, h], [x + w, y + d, h], [x, y + d, h]], shade(PINE, 0.55), { lw: 0.03 });
      // sticking out of it: golf clubs, a racket, his rocking horse, a trophy
      const [gX, gY] = P(x + 0.3, y + 0.3, h);
      ctx.save();
      ctx.translate(gX, gY);
      ctx.rotate(-0.25);
      ctx.beginPath();
      ctx.roundRect(-0.14, -1.0, 0.28, 1.0, 0.08);
      paint(ctx, INK.oxblood, { lw: 0.03, dots: shade(INK.oxblood, 0.4), density: 0.2 });
      for (const [cx, a] of [[-0.08, -0.2], [0.02, 0], [0.1, 0.25]]) {
        rod(ctx, [[cx, -0.95], [cx + Math.sin(a) * 0.4, -1.4]], MAT.silver, 0.035);
        rod(ctx, [[cx + Math.sin(a) * 0.4, -1.4], [cx + Math.sin(a) * 0.4 + 0.1, -1.38]], MAT.silver, 0.06);
      }
      ctx.restore();
      const [rX, rY] = P(x + 0.75, y + 0.3, h);
      ctx.save();
      ctx.translate(rX, rY);
      ctx.rotate(0.35);
      rod(ctx, [[0, 0], [0, -0.45]], WOOD_D, 0.06);
      ctx.beginPath();
      ctx.ellipse(0, -0.72, 0.18, 0.26, 0, 0, Math.PI * 2);
      paint(ctx, INK.bone, { lw: 0.035 });
      if (Q.detail) {
        ctx.strokeStyle = alpha(C.ink, 0.4);
        ctx.lineWidth = 0.012;
        ctx.beginPath();
        for (let i = -2; i <= 2; i++) { ctx.moveTo(i * 0.06, -0.95); ctx.lineTo(i * 0.06, -0.49); ctx.moveTo(-0.16, -0.72 + i * 0.08); ctx.lineTo(0.16, -0.72 + i * 0.08); }
        ctx.stroke();
      }
      ctx.restore();
      const [hX, hY] = P(x + 0.55, y + 0.7, h);
      ctx.beginPath();
      ctx.moveTo(hX - 0.12, hY);
      ctx.quadraticCurveTo(hX - 0.2, hY - 0.4, hX + 0.05, hY - 0.55);
      ctx.lineTo(hX + 0.3, hY - 0.42);
      ctx.lineTo(hX + 0.28, hY - 0.32);
      ctx.lineTo(hX + 0.08, hY - 0.35);
      ctx.lineTo(hX + 0.12, hY);
      ctx.closePath();
      paint(ctx, INK.bone, { lw: 0.03 });
      ctx.beginPath();
      ctx.moveTo(hX - 0.1, hY - 0.08);
      ctx.quadraticCurveTo(hX - 0.2, hY - 0.35, hX + 0.03, hY - 0.52);
      ctx.strokeStyle = INK.oxblood;
      ctx.lineWidth = 0.07;
      ctx.stroke();
      dot(ctx, hX + 0.1, hY - 0.44, 0.025, C.ink);
      // the front of the crate, stencilled
      const light = tint(PINE, 0.1), dark = shade(PINE, 0.2);
      face(ctx, [[x, y + d, 0], [x + w, y + d, 0], [x + w, y + d, h], [x, y + d, h]], dark, { lw: 0.03, dots: shade(PINE, 0.45), density: 0.15 });
      face(ctx, [[x + w, y, 0], [x + w, y + d, 0], [x + w, y + d, h], [x + w, y, h]], light, { lw: 0.03 });
      if (Q.detail) {
        for (const z of [0.3, 0.6]) {
          face(ctx, [[x, y + d, z], [x + w, y + d, z]], null, { lw: 0.02, stroke: shade(PINE, 0.4) });
          face(ctx, [[x + w, y, z], [x + w, y + d, z]], null, { lw: 0.02, stroke: shade(PINE, 0.4) });
        }
        onX(ctx, x + w, y + d - 0.05, 0.62, (g) => words(g, 'WINNINGS', 0.47, 0.17, 0.14, C.ink));
      }
      // his top hat, on top
      cylinder(ctx, x + 0.72, y + 0.8, h, 0.2, 0.04, C.ink, { flat: true });
      cylinder(ctx, x + 0.72, y + 0.8, h + 0.04, 0.13, 0.28, C.ink, { flat: true, top: shade(C.ink, 0.2) });
    });

    // The pot: Rupert's keys and the deeds, then the chauffeur's crate.
    const potDepth = (fn) => (t) => {
      const p = fn(lt(t));
      if (!p) return 0;
      return p[0] > 14 ? 27.2 : Math.max(p[0] + p[1], 23.3);
    };
    for (const [fn, draw] of [[keysAt, carKeys], [deedsAt, deedScroll]]) {
      R.mover((t) => {
        const p = fn(lt(t));
        return p ? { x: p[0], y: p[1], z: p[2], a: p[3] } : { x: -1e4, y: -1e4, out: true };
      }, (ctx, t, p) => {
        if (p.out) return;
        ctx.save();
        ctx.globalAlpha *= p.a;
        draw(ctx, p.x, p.y, p.z);
        ctx.restore();
      }, { depth: potDepth(fn) });
    }
    // Rupert's shoes: the chauffeur's stake. He won them last night.
    R.mover((t) => {
      const [x, y, z] = shoesAt(lt(t));
      return { x, y, z };
    }, (ctx, t, p) => pairOfShoes(ctx, p.x, p.y, p.z));

    // Rupert, having lost everything, gets a little storm of his own.
    const rupert = R.walkers.find((w) => w.id === 'rupert');
    R.thing(0, 0, (ctx, t) => {
      const tt = lt(t);
      if (!rupert || tt < T.sweep + 1.5 || tt > 97.2) return;
      const p = rupert.at(t);
      if (p.pose !== 'sit' || !R.contains(p.x, p.y, p.z || 0)) return;
      const x = p.x - ox, y = p.y - oy;
      const [X, Y] = P(x, y, 3.45 + Math.sin(t * 2) * 0.05);
      ctx.beginPath();
      ctx.arc(X - 0.22, Y, 0.18, 0, Math.PI * 2);
      ctx.arc(X + 0.05, Y - 0.1, 0.24, 0, Math.PI * 2);
      ctx.arc(X + 0.3, Y + 0.02, 0.16, 0, Math.PI * 2);
      paint(ctx, mix(C.grey, INK.stormNavy, 0.35), { lw: 0.03 });
      if (!Q.detail) return;
      ctx.strokeStyle = alpha(C.sky, 0.9);
      ctx.lineWidth = 0.03;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const k = (t * 1.6 + i * 0.27) % 1;
        const dx = -0.25 + i * 0.17;
        ctx.moveTo(X + dx, Y + 0.18 + k * 0.5);
        ctx.lineTo(X + dx - 0.03, Y + 0.28 + k * 0.5);
      }
      ctx.stroke();
    }, { anim: true, depth: 1000 });

    // ---------- Around the room ----------
    // The drinks trolley, by Rupert's elbow. The port is nearly gone.
    R.thing(7.4, 13.2, (ctx) => {
      const x = 6.7, y = 12.9, w = 1.4, d = 0.6;
      for (const [wx, wy] of [[x + 0.1, y + d - 0.05], [x + w - 0.1, y + d - 0.05], [x + w - 0.1, y + 0.08]]) {
        const [X, Y] = P(wx, wy, 0.08);
        ctx.beginPath();
        ctx.arc(X, Y, 0.08, 0, Math.PI * 2);
        paint(ctx, C.ink, { stroke: false });
      }
      rect(ctx, x, y, w, d, 0.38, GLASS, { lw: 0.03, stroke: MAT.brassDark });
      // bottles on the lower tier
      for (const [bx, c] of [[x + 0.3, INK.verdigris], [x + 0.6, MAT.wine]]) {
        cylinder(ctx, bx, y + 0.3, 0.38, 0.09, 0.4, c, { flat: true });
        cylinder(ctx, bx, y + 0.3, 0.78, 0.035, 0.15, c, { flat: true });
      }
      for (const [px, py] of [[x, y + d], [x + w, y + d], [x + w, y], [x, y]]) rod(ctx, [P(px, py, 0.1), P(px, py, 1.08)], MAT.brass, 0.04);
      rect(ctx, x, y, w, d, 1.0, GLASS, { lw: 0.03, stroke: MAT.brassDark });
      rod(ctx, [P(x - 0.15, y + 0.05, 1.05), P(x - 0.15, y + d - 0.05, 1.05)], MAT.brass, 0.05);
      // the port (a finger left), the whisky, three glasses and a siphon
      const [pX, pY] = P(x + 0.35, y + 0.3, 1.0);
      ctx.beginPath();
      ctx.arc(pX, pY - 0.22, 0.2, 0, Math.PI * 2);
      paint(ctx, GLASS, { lw: 0.025 });
      ctx.beginPath();
      ctx.arc(pX, pY - 0.22, 0.2, 0.35, Math.PI - 0.35);
      ctx.closePath();
      ctx.fillStyle = MAT.wine;
      ctx.fill();
      rod(ctx, [[pX, pY - 0.42], [pX, pY - 0.55]], GLASS, 0.07);
      if (Q.detail) {
        ctx.beginPath();
        ctx.roundRect(pX - 0.1, pY - 0.28, 0.2, 0.08, 0.02);
        paint(ctx, MAT.silver, { lw: 0.012 });
        words(ctx, 'PORT', pX, pY - 0.24, 0.05, C.ink, { font: SANS });
      }
      box(ctx, x + 0.65, y + 0.15, 1.0, 0.28, 0.28, 0.42, GLASS, { flat: true, left: GLASS, right: GLASS, top: GLASS, lw: 0.02 });
      box(ctx, x + 0.67, y + 0.17, 1.0, 0.24, 0.24, 0.22, alpha(MAT.brassDark, 0.8), { flat: true, stroke: false });
      for (const gx of [x + 1.05, x + 1.25]) {
        const [X, Y] = P(gx, y + 0.42, 1.0);
        ctx.beginPath();
        ctx.moveTo(X - 0.07, Y - 0.18); ctx.lineTo(X + 0.07, Y - 0.18); ctx.lineTo(X + 0.05, Y); ctx.lineTo(X - 0.05, Y);
        ctx.closePath();
        paint(ctx, GLASS, { lw: 0.018 });
      }
      cylinder(ctx, x + 1.2, y + 0.15, 1.0, 0.08, 0.45, INK.verdigris, { flat: true });
      cylinder(ctx, x + 1.2, y + 0.15, 1.45, 0.06, 0.1, MAT.silver, { flat: true });
    });

    // A potted palm in the corner, for the draught to rustle.
    R.thing(1.2, 15.1, (ctx, t) => plant(ctx, 1.2, 15.1, 0, t, { kind: 'palm', scale: 1.5, potColor: MAT.brassDark, leaf: MAT.leaf }), { anim: true });

    // ---------- Lights ----------
    // The fire, and the flames in it (drawn as a light, so they burn in the dark).
    fire(R, 0.9, 8.0, 0.5, 5, 3.4);
    R.light({
      at: [0.45, 8, 0.3], r: 0,
      draw: (ctx, t) => {
        for (let i = 0; i < 5; i++) {
          const y = 7.62 + i * 0.19;
          const h = 0.3 + 0.28 * Math.abs(Math.sin(t * (4.3 + i * 0.7) + i * 2)) + hash(i, Math.floor(t * 9)) * 0.1;
          const [X, Y] = P(0.45, y, 0.35);
          const sway = Math.sin(t * 7 + i) * 0.04;
          ctx.beginPath();
          ctx.moveTo(X - 0.12, Y);
          ctx.quadraticCurveTo(X - 0.13, Y - h * 0.55, X + sway, Y - h * ZK);
          ctx.quadraticCurveTo(X + 0.13, Y - h * 0.55, X + 0.12, Y);
          ctx.closePath();
          ctx.fillStyle = i % 2 ? INK.candleGold : C.coral;
          ctx.fill();
        }
        if (!Q.detail) return;
        particles(t, 5, 1.6, (k, r) => {
          const [X, Y] = P(0.45, 7.7 + r() * 0.6, 0.6 + k * 1.1);
          dot(ctx, X + Math.sin(k * 9 + r() * 6) * 0.08, Y, 0.025, alpha(INK.candleGold, 1 - k));
        }, 4);
      },
    });
    candle(R, 0.4, 7.05, 1.82, 3);
    candle(R, 0.4, 8.95, 1.82, 4);
    R.light({ at: [14.6, 0.45, 1.6], r: 2.2, color: INK.candleGold, k: house.lamp });

    R.dark((t) => house.dark(t));

    // ---------- Finds ----------
    R.find({ id: 'pawn-ticket', label: 'A pawn ticket', at: [11.2, 11.2, 1.05], r: 0.7 });
    R.find({ id: 'shoes', label: "Rupert's shoes", at: (t) => { const [x, y, z] = shoesAt(lt(t)); return [x, y, z + 0.14]; }, r: 0.8 });
  },
};
