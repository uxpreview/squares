// Arcade: rows of glowing cabinets, a claw machine with a three-try story,
// a dance machine, air hockey, a prize counter, and a ticket machine that
// will not stop paying out.
//
// Retuned for the difficulty rules (session 10): the goose sits among the
// white plush in the claw machine, bonking the claw (hard); the spilled soda
// is a spot find; the golden ticket is in one of the prize counter's two
// drawers (poke); the lost token sits on a cabinet's controls among the gold
// buttons (hard). A pixel goose on the HONK cabinet is the decoy; the claw
// machine, a cabinet and the photo booth answer a tap.
import {
  C, box, rect, disc, cylinder, face, poly, paint, person, folk, slab,
  shelfR, onLeft, onRight, paintText, label, speech, shade, tint, mix, alpha, dots, Q, P, hash, rng,
} from '../../../engine/art.js';
import { route, pulse, clamp, ease } from '../../../engine/actors.js';
import { ZK } from '../../../engine/iso.js';

const SCREEN = [C.teal, C.pink, C.mustard, C.tealLight, C.coral, C.lilac, C.sky];

// ---------- helpers ----------
function plush(ctx, x, y, z, color, s = 1, face2 = true) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.ellipse(0, -0.16, 0.2, 0.17, 0, 0, Math.PI * 2);
  paint(ctx, color, { lw: 0.035 });
  ctx.beginPath();
  ctx.arc(-0.13, -0.47, 0.07, 0, Math.PI * 2);
  ctx.arc(0.13, -0.47, 0.07, 0, Math.PI * 2);
  paint(ctx, shade(color, 0.15), { lw: 0.03 });
  ctx.beginPath();
  ctx.arc(0, -0.38, 0.15, 0, Math.PI * 2);
  paint(ctx, color, { lw: 0.035 });
  if (face2 && Q.detail) {
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(-0.05, -0.4, 0.022, 0, Math.PI * 2);
    ctx.arc(0.05, -0.4, 0.022, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -0.33, 0.05, 0.035, 0, 0, Math.PI * 2);
    ctx.fillStyle = tint(color, 0.5);
    ctx.fill();
  }
  ctx.restore();
}

// Cabinet on the left wall (faces +x). y: start, w along y.
function cabLBody(ctx, y, color, name) {
  box(ctx, 0.05, y, 0, 1.1, 1.25, 2.6, color, { right: shade(color, 0.05) });
  box(ctx, 1.15, y + 0.06, 1.0, 0.42, 1.13, 0.2, C.ink, { top: shade(C.navy, 0.2) });
  face(ctx, [[1.16, y + 0.1, 1.35], [1.16, y + 1.15, 1.35], [1.16, y + 1.15, 2.35], [1.16, y + 0.1, 2.35]], C.ink);
  box(ctx, 0.05, y - 0.02, 2.6, 1.35, 1.29, 0.5, shade(color, 0.25), { right: C.night });
  const [jx, jy] = P(1.36, y + 0.4, 1.2);
  ctx.beginPath(); ctx.moveTo(jx, jy); ctx.lineTo(jx - 0.03, jy - 0.3); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
  ctx.beginPath(); ctx.arc(jx - 0.03, jy - 0.32, 0.07, 0, Math.PI * 2); paint(ctx, C.coral, { lw: 0.02 });
  for (let i = 0; i < 2; i++) {
    const [bx, by] = P(1.36, y + 0.75 + i * 0.22, 1.21);
    button(ctx, bx, by, i ? C.sky : C.teal);
  }
}
// gold: MAZE, the one cabinet with gold buttons (the lost token hides among
// them). Everywhere else a button is plainly a button, so no coin lookalikes.
function cabRBody(ctx, x, color, gold) {
  box(ctx, x, 0.05, 0, 1.25, 1.1, 2.6, color, { left: shade(color, 0.12) });
  box(ctx, x + 0.06, 1.15, 1.0, 1.13, 0.42, 0.2, C.ink, { top: shade(C.navy, 0.2) });
  face(ctx, [[x + 0.1, 1.16, 1.35], [x + 1.15, 1.16, 1.35], [x + 1.15, 1.16, 2.35], [x + 0.1, 1.16, 2.35]], C.ink);
  box(ctx, x - 0.02, 0.05, 2.6, 1.29, 1.35, 0.5, shade(color, 0.25), { left: C.night });
  const [jx, jy] = P(x + 0.85, 1.36, 1.2);
  ctx.beginPath(); ctx.moveTo(jx, jy); ctx.lineTo(jx + 0.03, jy - 0.3); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
  ctx.beginPath(); ctx.arc(jx + 0.03, jy - 0.32, 0.07, 0, Math.PI * 2); paint(ctx, C.coral, { lw: 0.02 });
  for (let i = 0; i < 2; i++) {
    const [bx, by] = P(x + 0.5 - i * 0.22, 1.36, 1.21);
    if (gold) { ctx.beginPath(); ctx.ellipse(bx, by, 0.07, 0.04, 0, 0, Math.PI * 2); paint(ctx, i ? C.mustard : C.pink, { lw: 0.02 }); }
    else button(ctx, bx, by, i ? C.teal : C.pink);
  }
}
// A raised arcade button: a dark side under a domed cap with a shine on it.
function button(ctx, bx, by, color) {
  ctx.beginPath(); ctx.ellipse(bx, by + 0.02, 0.07, 0.04, 0, 0, Math.PI * 2); paint(ctx, C.ink, { lw: 0.02 });
  ctx.beginPath(); ctx.ellipse(bx, by - 0.025, 0.065, 0.037, 0, 0, Math.PI * 2); paint(ctx, color, { lw: 0.02 });
  ctx.beginPath(); ctx.ellipse(bx - 0.02, by - 0.035, 0.022, 0.011, 0, 0, Math.PI * 2); ctx.fillStyle = alpha(C.white, 0.85); ctx.fill();
}

// Animated screen content. at(u, v) maps screen coords (0..1, 0..1, v up) to 3D.
function screen(ctx, at, kind, t, seed, hi) {
  const q = (u0, v0, u1, v1) => [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];
  const flick = 0.85 + 0.15 * Math.sin(t * 23 + seed * 3) * Math.sin(t * 7 + seed);
  const bg = hi ? SCREEN[Math.floor(t * 8) % SCREEN.length] : mix(C.night, SCREEN[seed % SCREEN.length], 0.25 * flick);
  face(ctx, q(0.04, 0.05, 0.96, 0.95), bg, { lw: 0.02 });
  if (!Q.detail) return;
  const c1 = SCREEN[(seed + 1) % SCREEN.length], c2 = SCREEN[(seed + 3) % SCREEN.length];
  if (hi) {
    const [X, Y] = P(...at(0.5, 0.5));
    label(ctx, ...at(0.5, 0.5), 'WOW', 0.32, C.white);
    return;
  }
  if (kind === 0) {
    // invaders marching
    const off = Math.sin(t * 1.5 + seed) * 0.12;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      const u = 0.2 + c * 0.17 + off, v = 0.8 - r * 0.15;
      face(ctx, q(u, v, u + 0.1, v + 0.08), r % 2 ? c1 : c2, { stroke: false });
    }
    const su = 0.5 + Math.sin(t * 2.3 + seed) * 0.3;
    face(ctx, q(su - 0.07, 0.1, su + 0.07, 0.18), C.white, { stroke: false });
    const bv = ((t * 1.3 + seed) % 1) * 0.6 + 0.2;
    face(ctx, q(su - 0.015, bv, su + 0.015, bv + 0.07), C.butter, { stroke: false });
  } else if (kind === 1) {
    // racing: stripes rushing down
    face(ctx, q(0.3, 0.05, 0.7, 0.95), C.grey, { stroke: false });
    for (let i = 0; i < 4; i++) {
      const v = ((i * 0.25 - t * 1.2 + seed) % 1 + 1) % 1;
      face(ctx, q(0.48, v * 0.9 + 0.05, 0.52, Math.min(0.95, v * 0.9 + 0.12)), C.white, { stroke: false });
    }
    const cu = 0.5 + Math.sin(t * 1.7 + seed) * 0.12;
    face(ctx, q(cu - 0.07, 0.12, cu + 0.07, 0.3), c1, { stroke: false });
  } else if (kind === 2) {
    // pong
    const bu = 0.15 + Math.abs(((t * 0.8 + seed) % 2) - 1) * 0.7, bv = 0.15 + Math.abs(((t * 0.55 + seed) % 2) - 1) * 0.7;
    face(ctx, q(0.08, bv - 0.12, 0.12, bv + 0.12), C.white, { stroke: false });
    face(ctx, q(0.88, 0.5 + Math.sin(t * 2) * 0.25 - 0.12, 0.92, 0.5 + Math.sin(t * 2) * 0.25 + 0.12), C.white, { stroke: false });
    face(ctx, q(bu - 0.03, bv - 0.04, bu + 0.03, bv + 0.04), c2, { stroke: false });
  } else if (kind === 4) {
    // HONK: a pixel goose the size of a real one, strutting on the spot
    pixelGoose(ctx, q, t);
  } else {
    // maze with a chomping dot
    for (let i = 0; i < 5; i++) face(ctx, q(0.12 + i * 0.18, 0.48, 0.16 + i * 0.18, 0.52), C.butter, { stroke: false });
    const mu = 0.1 + ((t * 0.3 + seed * 0.1) % 1) * 0.8;
    const [X, Y] = P(...at(mu, 0.5));
    const m = Math.abs(Math.sin(t * 10)) * 0.6;
    ctx.beginPath(); ctx.moveTo(X, Y); ctx.arc(X, Y, 0.12, m, Math.PI * 2 - m); ctx.closePath();
    ctx.fillStyle = C.mustard; ctx.fill();
    face(ctx, q(0.1, 0.15, 0.9, 0.2), c1, { stroke: false });
    face(ctx, q(0.1, 0.8, 0.9, 0.85), c1, { stroke: false });
  }
}

// An 8-bit goose (a decoy), facing right, filling a screen. Rows top down.
// W white, G grey wing, K eye, O orange (beak and feet), A/B feet by frame.
const PIXGOOSE = [
  '......WW....',
  '.....WWWW...',
  '.....WKWWOO.',
  '......WWWOO.',
  '......WW....',
  '......WW....',
  'W....WWW....',
  'WWWWWWWWW...',
  '.WWGGGWWW...',
  '..WWWWWW....',
  '...A..B.....',
  '..AA.BB.....',
];
function pixelGoose(ctx, q, t) {
  const n = PIXGOOSE.length, m = PIXGOOSE[0].length;
  const pu = 0.84 / m, pv = 0.84 / n;
  const step = Math.floor(t * 3) % 2, bob = step ? pv * 0.5 : 0;
  const ink = { W: C.white, G: C.greyLight, K: C.ink, O: C.coral, A: C.coral, B: C.coral };
  PIXGOOSE.forEach((row, j) => {
    for (let i = 0; i < m; i++) {
      let ch = row[i];
      if (ch === '.') continue;
      // the feet take turns
      if ((ch === 'A' && step) || (ch === 'B' && !step)) continue;
      const u = 0.08 + i * pu, v = 0.92 - (j + 1) * pv + (j < 10 ? bob : 0);
      face(ctx, q(u, v, u + pu * 1.02, v + pv * 1.02), ink[ch], { stroke: false });
    }
  });
}

// Claw machine
const MX0 = 10.1, MY0 = 0.35, MW = 2.2, MB = 1.1, MT = 3.4;
const HOME = [MX0 + 0.45, MY0 + MW - 0.45];
const CLAW_T = 8;
// The lost token, on MAZE's controls (right wall, second cabinet).
const TOKEN = [4.25, 1.36, 1.215];
const TARGETS = [[10.85, 0.95], [11.85, 2.05], [11.0, 1.75]];
// White bears drawn in front of the goose (it's TARGETS[1]).
const SNUG = [[11.6, 2.4, MB + 0.05], [12.05, 2.35, MB + 0.08], [12.15, 1.9, MB + 0.05]];
function clawState(t) {
  const n = Math.floor(t / CLAW_T);
  const s = t - n * CLAW_T;
  const att = ((n % 3) + 3) % 3;
  const [tx, ty] = TARGETS[att];
  const top = MT - 0.35, low = MB + 0.75;
  let x = HOME[0], y = HOME[1], z = top, open = 1, carry = false;
  if (s < 2) { const k = ease(s / 2); x = HOME[0] + (tx - HOME[0]) * k; y = HOME[1] + (ty - HOME[1]) * k; }
  else if (s < 3) { x = tx; y = ty; z = top + (low - top) * ease(s - 2); }
  else if (s < 3.5) { x = tx; y = ty; z = low; open = 1 - (s - 3) / 0.5; }
  else if (s < 4.5) { x = tx; y = ty; z = low + (top - low) * ease(s - 3.5); open = 0; carry = att !== 1; }
  else if (s < 6.5) {
    const k = ease((s - 4.5) / 2);
    x = tx + (HOME[0] - tx) * k; y = ty + (HOME[1] - ty) * k; open = 0; carry = att !== 1;
    if (att === 0 && s > 5.3) { carry = false; open = 0.6; }
    if (att === 2 && s > 6.2) { open = (s - 6.2) / 0.3; carry = false; }
  }
  if (att === 1 && s > 3.5 && s < 6.5) open = 0.4 + Math.sin(s * 20) * 0.1; // bonked by the goose
  return { x, y, z, open, carry, att, s };
}

// air hockey
const AX0 = 6.6, AX1 = 10.6, AY0 = 7.3, AY1 = 9.1, AZ = 1.0;
const tri = (t, p) => { const k = ((t / p) % 1 + 1) % 1; return k < 0.5 ? k * 2 : 2 - k * 2; };
const puck = (t) => ({ x: AX0 + 0.45 + tri(t, 2.6) * (AX1 - AX0 - 0.9), y: AY0 + 0.3 + tri(t + 0.4, 1.9) * (AY1 - AY0 - 0.6) });

export default {
  id: 'arcade',
  name: 'Neon Arcade',
  blurb: 'Someone set a high score and will not let anyone forget it. The claw machine is rigged, says everyone who has lost to it.',

  build(R) {
    // Floor: dark carpet with that arcade confetti pattern.
    R.floor((ctx) => {
      slab(ctx, C.greyLight);
      rect(ctx, 0, 0, 16, 16, 0, mix(C.night, C.purple, 0.25), { stroke: false });
      if (!Q.detail) return;
      const r = rng(9);
      const cols = [C.teal, C.pink, C.mustard, C.tealLight, C.coral, C.lilac];
      for (let i = 0; i < 190; i++) {
        const x = 0.3 + r() * 15.4, y = 0.3 + r() * 15.4;
        const k = i % 4;
        // (no gold dots in the carpet: a round gold thing here is the token)
        const c = alpha(k === 0 && cols[i % cols.length] === C.mustard ? C.coral : cols[i % cols.length], 0.75);
        if (k === 0) disc(ctx, x, y, 0.005, 0.12, c, { stroke: false });
        else if (k === 1) face(ctx, [[x, y, 0.005], [x + 0.3, y + 0.05, 0.005], [x + 0.1, y + 0.3, 0.005]], c, { stroke: false });
        else if (k === 2) {
          ctx.beginPath();
          for (let j = 0; j <= 4; j++) { const [X, Y] = P(x + j * 0.12, y + (j % 2) * 0.12, 0.005); j ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
          ctx.strokeStyle = c; ctx.lineWidth = 0.05; ctx.stroke();
        } else rect(ctx, x, y, 0.16, 0.16, 0.005, c, { stroke: false });
      }
    });
    R.walls({ h: 6, left: C.navy, right: C.purple, cap: C.paper, dotsL: C.night, densL: 0.2, dotsR: shade(C.purple, 0.4), densR: 0.15 });

    // Neon: the big sign flickers, stripes glow along the walls.
    R.decor((ctx, t) => {
      const flick = pulse(t, 7.3) > 0.9 && Math.sin(t * 60) > 0;
      ctx.save();
      if (Q.detail) { ctx.shadowColor = C.pink; ctx.shadowBlur = flick ? 2 : 14; }
      paintText(ctx, 'left', 9.0, 4.8, 'ARCADE', 1.5, flick ? shade(C.pink, 0.4) : C.pink);
      if (Q.detail) ctx.shadowColor = C.tealLight;
      paintText(ctx, 'right', 14.3, 5.0, 'PRIZES', 0.9, C.tealLight);
      ctx.restore();
      ctx.lineCap = 'round';
      for (const [plane, z, col] of [['left', 3.4, C.teal], ['right', 3.5, C.pink]]) {
        const a = plane === 'left' ? P(0.01, 0.4, z) : P(0.4, 0.01, z);
        const b = plane === 'left' ? P(0.01, 15.6, z) : P(12.2, 0.01, z);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
        ctx.strokeStyle = alpha(col, 0.35 + 0.1 * Math.sin(t * 3)); ctx.lineWidth = 0.35; ctx.stroke();
        ctx.strokeStyle = tint(col, 0.4); ctx.lineWidth = 0.08; ctx.stroke();
      }
    }, { anim: true });

    // A clock on the right wall with the day's real time on it, in an
    // arcade, where nobody ever looks at it.
    const day = R.opts.day;
    R.decor((ctx) => {
      onRight(ctx, 4.1, 4.15, 2.5, 1.0, C.ink, { lw: 0.05 });
      onRight(ctx, 4.2, 4.25, 2.3, 0.8, C.night, { stroke: false });
      paintText(ctx, 'right', 5.35, 3.85, 'HOME BY 6PM. LOVE, MUM', 0.2, C.white, 'Rethink Sans');
    });
    R.decor((ctx, t) => {
      const h = day.hour(t);
      const m = Math.floor(((h % 1) * 60) / 5) * 5;
      const colon = Math.floor(t * 2) % 2 ? ':' : ' ';
      const text = `${Math.floor(h) % 12 || 12}${colon}${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
      paintText(ctx, 'right', 5.35, 4.64, text, 0.5, h >= 17.5 && h < 19 ? C.coral : C.mint, 'Rethink Sans');
    }, { anim: true });

    // High score board on the left wall.
    R.decor((ctx) => {
      onLeft(ctx, 1.2, 4.0, 3.6, 1.9, C.ink, { lw: 0.05 });
      onLeft(ctx, 1.35, 4.12, 3.3, 1.66, C.night, { stroke: false });
      paintText(ctx, 'left', 3.0, 5.5, 'HIGH SCORES', 0.34, C.mustard);
      paintText(ctx, 'left', 3.0, 5.05, '1. HNK  99999', 0.3, C.white, 'Rethink Sans');
      paintText(ctx, 'left', 3.0, 4.7, '2. ZOE  41200', 0.3, C.tealLight, 'Rethink Sans');
      paintText(ctx, 'left', 3.0, 4.35, '3. DAD    120', 0.3, C.pink, 'Rethink Sans');
    });

    // Left-wall cabinets
    const leftCabs = [[1.6, C.coral, 0], [3.0, C.teal, 1], [4.4, C.mustard, 2], [5.8, C.pink, 3], [7.2, C.lilac, 0], [8.6, C.red, 1]];
    // The last cabinet on the left wants a coin, and says so when tapped.
    const coin = R.poke({ id: 'insert', at: [1.17, 9.15, 1.85], r: 0.9, hold: 2.5, sound: 'tick', say: ['INSERT COIN', 'INSERT COIN. PLEASE.', 'IT IS ONE TOKEN.'] });
    leftCabs.forEach(([y, col, kind], i) => {
      R.thing(1.2, y + 1.25, (ctx) => cabLBody(ctx, y, col));
      R.thing(1.2, y + 1.25, (ctx, t) => {
        const hi = i === 2 && pulse(t, 9) > 0.6 && pulse(t, 9) < 0.85;
        if (i === 5 && coin.k() > 0.05) {
          // tapped: it asks for money, blinking
          const at = (u, v) => [1.17, y + 1.1 - u * 0.95, 1.4 + v * 0.9];
          face(ctx, [at(0.04, 0.05), at(0.96, 0.05), at(0.96, 0.95), at(0.04, 0.95)], C.night, { lw: 0.02 });
          if (Math.floor(t * 3) % 3) {
            label(ctx, ...at(0.5, 0.66), 'INSERT', 0.2, C.butter, 'Rethink Sans');
            label(ctx, ...at(0.5, 0.36), 'COIN', 0.2, C.butter, 'Rethink Sans');
          }
          label(ctx, 1.41, y + 0.63, 2.85, 'VROOM', 0.26, C.butter);
          return;
        }
        screen(ctx, (u, v) => [1.17, y + 1.1 - u * 0.95, 1.4 + v * 0.9], kind, t, i + 2, hi);
        // lit marquee
        const [X, Y] = P(1.41, y + 0.63, 2.85);
        label(ctx, 1.41, y + 0.63, 2.85, ['ZAP', 'VROOM', 'BLIP', 'CHOMP', 'ZAP 2', 'VROOM'][i], 0.26, Math.sin(t * 3 + i) > -0.8 ? C.butter : C.grey);
      }, { anim: true });
    });
    // Right-wall cabinets
    // (The last one plays HONK, starring a pixel goose: a decoy.)
    const rightCabs = [[1.8, C.teal, 2], [3.2, C.coral, 3], [4.6, C.mustard, 0], [6.0, C.lilac, 1], [7.4, C.pink, 4]];
    rightCabs.forEach(([x, col, kind], i) => {
      R.thing(x + 1.25, 1.2, (ctx) => {
        cabRBody(ctx, x, col, i === 1);
        // The lost token, left on MAZE's controls by the joystick: gold, and
        // round, like the buttons next to it (a hard find).
        if (i === 1) {
          disc(ctx, TOKEN[0], TOKEN[1], TOKEN[2], 0.075, C.mustard, { lw: 0.025 });
          disc(ctx, TOKEN[0], TOKEN[1], TOKEN[2] + 0.005, 0.04, null, { lw: 0.015, stroke: shade(C.mustard, 0.4) });
        }
      });
      R.thing(x + 1.25, 1.2, (ctx, t) => {
        screen(ctx, (u, v) => [x + 0.15 + u * 0.95, 1.17, 1.4 + v * 0.9], kind, t, i + 11, false);
        label(ctx, x + 0.63, 1.41, 2.85, ['PONG', 'MAZE', 'ZAP', 'VROOM', 'HONK'][i], 0.26, C.butter);
      }, { anim: true });
    });
    R.decoy({ id: 'pixel', at: [8.03, 1.17, 1.85], r: 0.8, say: ['8-bit. Still not a goose.', 'Game over. Insert goose.'] });
    R.find({ id: 'token', label: 'A lost token', kind: 'hard', at: TOKEN, r: 0.6, riddle: 'One last go, left with the buttons.', hint: 'Not every gold button on the cabinets is a button.' });
    // floor glow in front of every screen
    R.rug((ctx, t) => {
      if (!Q.detail) return;
      leftCabs.forEach(([y], i) => {
        const [X, Y] = P(2.0, y + 0.62, 0.01);
        ctx.beginPath(); ctx.ellipse(X, Y, 1.3, 0.6, 0, 0, Math.PI * 2);
        ctx.fillStyle = alpha(SCREEN[(i + 2) % SCREEN.length], 0.12 + 0.05 * Math.sin(t * 5 + i)); ctx.fill();
      });
      rightCabs.forEach(([x], i) => {
        const [X, Y] = P(x + 0.62, 2.0, 0.01);
        ctx.beginPath(); ctx.ellipse(X, Y, 1.3, 0.6, 0, 0, Math.PI * 2);
        ctx.fillStyle = alpha(SCREEN[(i + 11) % SCREEN.length], 0.12 + 0.05 * Math.sin(t * 4 + i)); ctx.fill();
      });
    }, { anim: true });

    // Players at the cabinets
    const players = [
      [2.15, 2.25, 401, 'l'], [2.15, 7.85, 403, 'l'],
      [2.45, 2.15, 405, 'r', 'R'], [6.6, 2.2, 406, 'r', 'R'],
    ];
    players.forEach(([x, y, seed, dir, side]) => {
      R.mover(() => ({ x, y }), (ctx, t, p) => {
        const mash = Math.sin(t * 2 + seed) > 0.3;
        person(ctx, p.x, p.y, 0, folk(seed, { pose: mash ? 'drum' : 'stand', dir, back: true, speed: 14, arms: mash ? undefined : [1.2, 1.1], scale: seed === 405 ? 0.72 : 1 }), t);
      });
    });

    // The high score kid, and a friend who has heard enough.
    R.mover(() => ({ x: 2.2, y: 5.0 }), (ctx, t, p) => {
      const k = pulse(t, 9);
      const hi = k > 0.6 && k < 0.85;
      person(ctx, p.x, p.y, 0, folk(410, { pose: hi ? 'jump' : 'drum', dir: 'l', back: !hi, scale: 0.72, top: C.mustard, hat: 'cap', speed: hi ? 9 : 14 }), t);
      if (hi && Q.detail) speech(ctx, p.x, p.y, 2.5, 'HIGH SCORE!', { size: 0.5, fill: C.butter });
    });
    R.mover(() => ({ x: 3.0, y: 6.3 }), (ctx, t, p) => {
      const k = pulse(t, 9);
      const hi = k > 0.62 && k < 0.9;
      person(ctx, p.x, p.y, 0, folk(411, { pose: hi ? 'stand' : 'stand', arms: hi ? [2.9, -2.9] : [0.3, -0.2], dir: 'l', scale: 0.74, top: C.teal }), t);
      if (hi && Q.detail && k > 0.72) speech(ctx, p.x, p.y, 2.3, 'AGAIN?', { size: 0.4 });
    });

    // Ticket machine spilling a river of tickets
    const TY = 10.1;
    R.thing(1.2, TY + 1.25, (ctx) => {
      box(ctx, 0.05, TY, 0, 1.1, 1.25, 2.3, C.mustard, { right: tint(C.mustard, 0.1) });
      face(ctx, [[1.16, TY + 0.15, 1.3], [1.16, TY + 1.1, 1.3], [1.16, TY + 1.1, 2.1], [1.16, TY + 0.15, 2.1]], C.night);
      box(ctx, 0.05, TY - 0.02, 2.3, 1.3, 1.29, 0.5, C.coral, { right: C.red });
      label(ctx, 1.36, TY + 0.63, 2.55, 'TICKETS', 0.24, C.white);
      face(ctx, [[1.17, TY + 0.35, 0.95], [1.17, TY + 0.9, 0.95], [1.17, TY + 0.9, 1.05], [1.17, TY + 0.35, 1.05]], C.ink);
    });
    R.thing(1.3, TY + 1.3, (ctx, t) => {
      screen(ctx, (u, v) => [1.18, TY + 1.05 - u * 0.85, 1.35 + v * 0.7], 3, t, 20, false);
    }, { anim: true });
    R.thing(3.0, TY + 1.5, (ctx, t) => {
      // pile on the floor
      const r = rng(4);
      for (let i = 0; i < 26; i++) {
        const a = r() * Math.PI * 2, d = r() * 0.7;
        const x = 1.9 + Math.cos(a) * d, y = TY + 1.0 + Math.sin(a) * d * 0.8;
        const z = 0.02 + (0.7 - d) * 0.35 + r() * 0.05;
        const [X, Y] = P(x, y, z);
        ctx.save(); ctx.translate(X, Y); ctx.rotate(r() * 3);
        ctx.beginPath(); ctx.rect(-0.14, -0.07, 0.28, 0.14); paint(ctx, i % 5 ? C.coral : C.pink, { lw: 0.02 });
        ctx.restore();
      }
      // the ribbon from the slot, up to the kid's hands and back down
      const pts = [[1.2, TY + 0.62, 1.0], [1.7, TY + 0.4, 1.2], [2.3, TY + 0.2, 2.4], [2.6, TY + 0.6, 1.4], [2.1, TY + 0.95, 0.3]];
      const bez = (k) => {
        const n = pts.length - 1;
        const seg = Math.min(n - 1, Math.floor(k * n));
        const q = k * n - seg;
        const a = pts[seg], b = pts[seg + 1];
        return [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q, a[2] + (b[2] - a[2]) * q + Math.sin(q * Math.PI) * 0.15];
      };
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) { const [X, Y] = P(...bez(i / 40)); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
      ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.24; ctx.stroke();
      ctx.strokeStyle = C.coral; ctx.lineWidth = 0.16; ctx.stroke();
      if (Q.detail) {
        // perforations scroll along as the tickets feed out
        ctx.fillStyle = C.red;
        for (let i = 0; i < 30; i++) {
          const k = ((i / 30 + t * 0.05) % 1);
          const [X, Y] = P(...bez(k));
          ctx.beginPath(); ctx.arc(X, Y, 0.035, 0, Math.PI * 2); ctx.fill();
        }
      }
    }, { anim: true });
    R.mover(() => ({ x: 2.45, y: TY + 0.2 }), (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, folk(420, { pose: 'cheer', dir: 'l', scale: 0.72, top: C.green, speed: 4 }), t);
      if (Q.detail && pulse(t, 11) > 0.7) speech(ctx, p.x, p.y, 2.4, "WE'RE RICH", { size: 0.4 });
    });

    // Dance machine against the left wall
    const DY = 12.6;
    R.thing(1.2, DY + 2.6, (ctx) => {
      box(ctx, 0.05, DY, 0, 1.1, 2.6, 3.3, C.purple, { right: shade(C.purple, 0.05) });
      face(ctx, [[1.16, DY + 0.3, 1.5], [1.16, DY + 2.3, 1.5], [1.16, DY + 2.3, 2.9], [1.16, DY + 0.3, 2.9]], C.ink);
      for (const yy of [DY + 0.02, DY + 2.2]) box(ctx, 0.5, yy, 0, 0.8, 0.38, 1.3, C.ink, { flat: true });
      label(ctx, 1.2, DY + 1.3, 3.15, 'DANCE!', 0.34, C.butter);
    });
    R.thing(1.3, DY + 2.7, (ctx, t) => {
      const at = (u, v) => [1.17, DY + 2.25 - u * 1.9, 1.55 + v * 1.3];
      const q = (u0, v0, u1, v1) => [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];
      face(ctx, q(0, 0, 1, 1), mix(C.night, C.purple, 0.3), { lw: 0.02 });
      const cols = [C.pink, C.teal, C.mustard, C.coral];
      for (let lane = 0; lane < 4; lane++) {
        face(ctx, q(0.12 + lane * 0.2, 0.8, 0.28 + lane * 0.2, 0.92), alpha(C.white, 0.6), { stroke: false });
        for (let j = 0; j < 2; j++) {
          const v = ((t * 0.6 + lane * 0.37 + j * 0.5 + hash(lane, j) * 0.3) % 1) * 0.85;
          face(ctx, q(0.12 + lane * 0.2, v, 0.28 + lane * 0.2, v + 0.1), cols[lane], { stroke: false });
        }
      }
      // speaker cones pulsing
      for (const yy of [DY + 0.21, DY + 2.39]) {
        const [X, Y] = P(1.31, yy, 0.8);
        const b = 0.18 + Math.abs(Math.sin(t * 8)) * 0.04;
        ctx.beginPath(); ctx.ellipse(X, Y, b * 0.7, b, 0, 0, Math.PI * 2); paint(ctx, C.grey, { lw: 0.03 });
      }
    }, { anim: true });
    R.rug((ctx, t) => {
      box(ctx, 1.3, DY + 0.3, 0, 2.3, 2.0, 0.22, C.greyLight, { flat: true });
      const beat = Math.floor(t * 4);
      const pads = [[1.55, DY + 1.0], [2.35, DY + 0.45], [2.35, DY + 1.6], [3.1, DY + 1.0]];
      const cols = [C.pink, C.teal, C.mustard, C.coral];
      pads.forEach(([x, y], i) => {
        const on = (beat + i * 3) % 4 === 0 || hash(beat, i) > 0.7;
        rect(ctx, x - 0.25, y - 0.25, 0.5, 0.5, 0.23, on ? cols[i] : shade(cols[i], 0.5), { lw: 0.03 });
      });
    }, { anim: true });
    R.mover(() => ({ x: 2.4, y: DY + 1.3 }), (ctx, t, p) => {
      person(ctx, p.x, p.y, 0.22, folk(430, { pose: 'dance', dir: 'l', scale: 0.72, top: C.pink, style: 'pony', speed: 8 }), t);
    }, { bias: 0.5 });
    R.mover(() => ({ x: 4.3, y: DY + 0.2 }), (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, folk(431, { pose: 'cheer', dir: 'l', scale: 0.74, speed: 6 }), t);
    });
    R.mover(() => ({ x: 4.4, y: DY + 2.4 }), (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, folk(432, { pose: 'stand', dir: 'l', arms: [2.2, 0.3], top: C.sky }), t);
      const [X, Y] = P(p.x, p.y, 2.25);
      ctx.beginPath(); ctx.roundRect(X - 0.62, Y - 0.2, 0.22, 0.36, 0.04); paint(ctx, C.ink, { lw: 0.02 });
      if (Math.sin(t * 3) > 0.5) { ctx.beginPath(); ctx.arc(X - 0.51, Y - 0.13, 0.04, 0, Math.PI * 2); ctx.fillStyle = C.coral; ctx.fill(); }
    });

    // Pinball
    R.thing(4.9, 6.3, (ctx, t) => {
      const x0 = 3.8, x1 = 4.9, y0 = 3.9, y1 = 6.2;
      for (const [lx, ly] of [[x0 + 0.1, y1 - 0.2], [x1 - 0.2, y1 - 0.2], [x1 - 0.2, y0 + 0.4]]) box(ctx, lx, ly, 0, 0.1, 0.1, 0.9, C.ink, { flat: true });
      // tilted playfield box
      const zf = (y) => 0.9 + (y1 - y) * 0.12;
      face(ctx, [[x0, y1, zf(y1) - 0.3], [x1, y1, zf(y1) - 0.3], [x1, y1, zf(y1)], [x0, y1, zf(y1)]], shade(C.coral, 0.25));
      face(ctx, [[x1, y0, zf(y0) - 0.3], [x1, y1, zf(y1) - 0.3], [x1, y1, zf(y1)], [x1, y0, zf(y0)]], shade(C.coral, 0.1));
      face(ctx, [[x0, y0, zf(y0)], [x1, y0, zf(y0)], [x1, y1, zf(y1)], [x0, y1, zf(y1)]], C.navy, { dots: C.purple, density: 0.3 });
      // bumpers and the ball
      for (const [bx, by, c] of [[4.2, 4.6, C.mustard], [4.55, 4.9, C.pink], [4.2, 5.2, C.teal]]) {
        const lit = Math.sin(t * 9 + bx * 7) > 0.4;
        disc(ctx, bx, by, zf(by) + 0.02, 0.14, lit ? tint(c, 0.4) : c, { lw: 0.02 });
      }
      const bx = 4.0 + tri(t, 1.3) * 0.7, by = 4.3 + tri(t + 0.3, 2.1) * 1.5;
      const [X, Y] = P(bx, by, zf(by) + 0.06);
      ctx.beginPath(); ctx.arc(X, Y, 0.07, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.02 });
      // backbox
      box(ctx, x0, y0 - 0.25, zf(y0) - 0.3, x1 - x0, 0.25, 1.6, C.coral);
      face(ctx, [[x0 + 0.1, y0 + 0.01, zf(y0) + 0.3], [x1 - 0.1, y0 + 0.01, zf(y0) + 0.3], [x1 - 0.1, y0 + 0.01, zf(y0) + 1.2], [x0 + 0.1, y0 + 0.01, zf(y0) + 1.2]], Math.sin(t * 4) > 0 ? C.mustard : C.butter, { lw: 0.03 });
      label(ctx, 4.35, y0, zf(y0) + 0.75, 'TILT', 0.3, C.coral);
    }, { anim: true });
    R.mover(() => ({ x: 4.35, y: 6.9 }), (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, folk(440, { pose: 'drum', dir: 'r', back: true, speed: 16, top: C.red, hat: 'beanie' }), t);
    });

    // Air hockey
    R.thing(AX1, AY1, (ctx) => {
      for (const [lx, ly] of [[AX0 + 0.2, AY1 - 0.4], [AX1 - 0.4, AY1 - 0.4], [AX1 - 0.4, AY0 + 0.2]]) box(ctx, lx, ly, 0, 0.2, 0.2, AZ - 0.25, C.ink, { flat: true });
      box(ctx, AX0, AY0, AZ - 0.35, AX1 - AX0, AY1 - AY0, 0.35, C.teal, { top: C.white });
      rect(ctx, AX0 + 0.12, AY0 + 0.12, AX1 - AX0 - 0.24, AY1 - AY0 - 0.24, AZ + 0.01, C.sky, { dots: C.white, density: 0.3, lw: 0.03 });
      face(ctx, [[(AX0 + AX1) / 2, AY0 + 0.12, AZ + 0.02], [(AX0 + AX1) / 2, AY1 - 0.12, AZ + 0.02]], null, { lw: 0.05, stroke: C.coral });
      disc(ctx, (AX0 + AX1) / 2, (AY0 + AY1) / 2, AZ + 0.02, 0.35, null, { lw: 0.04, stroke: C.coral });
      box(ctx, (AX0 + AX1) / 2 - 0.5, AY0 - 0.15, AZ, 1.0, 0.15, 0.55, C.ink);
    });
    R.thing(AX1 + 0.01, AY1 + 0.01, (ctx, t) => {
      const p = puck(t);
      // scoreboard ticks up each time the puck gets past someone
      const sc = Math.floor((t + 0.65) / 2.6);
      label(ctx, (AX0 + AX1) / 2, AY0 - 0.14, AZ + 0.3, `${sc % 7} : ${Math.floor(sc * 0.7) % 7}`, 0.3, C.mustard, 'Rethink Sans');
      const m1 = [AX0 + 0.35, clamp(p.y, AY0 + 0.3, AY1 - 0.3)], m2 = [AX1 - 0.35, clamp(p.y + Math.sin(t * 3) * 0.2, AY0 + 0.3, AY1 - 0.3)];
      disc(ctx, p.x, p.y, AZ + 0.04, 0.14, C.ink, { lw: 0.02 });
      for (const [mx, my] of [m1, m2]) {
        cylinder(ctx, mx, my, AZ, 0.2, 0.08, C.coral);
        cylinder(ctx, mx, my, AZ + 0.08, 0.07, 0.15, C.coral);
      }
    }, { anim: true });
    R.mover(() => ({ x: AX0 - 0.55, y: (AY0 + AY1) / 2 + 0.1 }), (ctx, t, p) => {
      const y = clamp(puck(t).y, AY0 + 0.3, AY1 - 0.3);
      person(ctx, p.x, y + 0.2, 0, folk(450, { pose: 'point', dir: 'r', top: C.coral, style: 'curly', arms: [1.6, 0.4] }), t);
    });
    R.mover(() => ({ x: AX1 + 0.55, y: (AY0 + AY1) / 2 }), (ctx, t, p) => {
      const y = clamp(puck(t).y + Math.sin(t * 3) * 0.2, AY0 + 0.3, AY1 - 0.3);
      person(ctx, p.x, y - 0.2, 0, folk(451, { pose: 'point', dir: 'l', top: C.teal, hat: 'cap', arms: [1.6, 0.4] }), t);
    }, { bias: 1 }); // he stands past the table's end, so he's drawn after it (not sunk into it)

    // Prize counter and shelves of plush
    R.thing(15.9, 1.2, (ctx) => {
      shelfR(ctx, 12.7, 3.2, 3.8, 3, 5, C.purple, (c, x, z, w, r, i) => {
        const cols = [C.pink, C.teal, C.mustard, C.lilac, C.coral, C.sky, C.leaf];
        for (let k = 0; k < 5; k++) plush(c, x + 0.35 + k * 0.62, 0.55, z, cols[(k + i * 2) % cols.length], 0.95 - (i === 2 ? 0.1 : 0));
      });
      // giant bear on top
      plush(ctx, 14.3, 0.6, 3.95, C.mustard, 2.4);
    });
    R.thing(16, 3.7, (ctx) => {
      box(ctx, 12.6, 2.9, 0, 3.4, 0.8, 1.2, C.pink, { top: alpha(C.sky, 0.8) });
      const r = rng(12);
      for (let i = 0; i < 9; i++) {
        const [X, Y] = P(12.9 + i * 0.35, 3.3, 1.2);
        ctx.beginPath(); ctx.arc(X, Y - 0.06, 0.07 + r() * 0.04, 0, Math.PI * 2);
        ctx.fillStyle = [C.coral, C.mustard, C.teal, C.white][i % 4]; ctx.fill();
      }
      label(ctx, 14.3, 3.72, 0.88, 'PRIZES', 0.32, C.white);
    });
    // Two drawers under the counter. One won't quite shut: a gold corner
    // sticks out of it, and the golden ticket is inside (a poke). The other
    // is just raffle stubs.
    const drawers = [
      [R.poke({ id: 'drawer', at: [13.15, 3.72, 0.38], r: 0.8, sound: 'clunk' }), 12.8, true],
      [R.poke({ id: 'stubs', at: [15.25, 3.72, 0.38], r: 0.8, sound: 'clunk', say: ['Raffle stubs. Thousands.', 'Still raffle stubs.'] }), 14.9, false],
    ];
    R.thing(16, 3.75, (ctx) => {
      for (const [d, x0, gold] of drawers) drawer(ctx, x0, d.k(), gold);
    }, { anim: true, depth: 19.75 });
    R.find({ id: 'goldticket', label: 'A golden ticket', kind: 'poke', inside: drawers[0][0], at: [13.15, 4.05, 0.6], r: 0.6, hint: 'The prize counter has two drawers, and one of them will not quite shut.' });
    R.mover(() => ({ x: 14.1, y: 2.2 }), (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, folk(460, { pose: pulse(t, 6) < 0.3 ? 'point' : 'stand', dir: 'l', top: C.teal, hat: 'cap', style: 'bun' }), t);
    });
    // kid counting tickets at the counter, choosing very slowly
    R.mover(() => ({ x: 14.6, y: 4.5 }), (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, folk(461, { pose: 'read', dir: 'r', back: true, scale: 0.7, top: C.lilac }), t);
      if (Q.detail && pulse(t, 13) > 0.75) speech(ctx, p.x, p.y, 2.2, 'HMMMM', { size: 0.38, dx: 0.7 });
    });

    // Claw machine: back half
    R.thing(MX0 + 0.1, MY0 + 0.1, (ctx) => {
      box(ctx, MX0, MY0, 0, MW, MW, MB, C.coral, { top: C.night });
      face(ctx, [[MX0 + 0.25, MY0 + MW + 0.01, 0.25], [MX0 + 0.8, MY0 + MW + 0.01, 0.25], [MX0 + 0.8, MY0 + MW + 0.01, 0.8], [MX0 + 0.25, MY0 + MW + 0.01, 0.8]], C.ink);
      label(ctx, MX0 + 1.5, MY0 + MW + 0.01, 0.6, 'CLAW', 0.32, C.butter);
      face(ctx, [[MX0, MY0, MB], [MX0, MY0 + MW, MB], [MX0, MY0 + MW, MT], [MX0, MY0, MT]], mix(C.night, C.purple, 0.5), { lw: 0.03, dots: C.pink, density: 0.08 });
      face(ctx, [[MX0, MY0, MB], [MX0 + MW, MY0, MB], [MX0 + MW, MY0, MT], [MX0, MY0, MT]], mix(C.night, C.purple, 0.3), { lw: 0.03, dots: C.pink, density: 0.08 });
      // chute box in the front-left corner
      box(ctx, MX0 + 0.05, MY0 + MW - 0.8, MB, 0.75, 0.75, 0.45, C.mustard, { top: C.ink });
    });
    // plush pile (anim: plushes disappear when grabbed)
    const PILE = [];
    { const r = rng(31); for (let i = 0; i < 18; i++) PILE.push([MX0 + 0.95 + (i % 5) * 0.28 + r() * 0.1 - (Math.floor(i / 5) % 2) * 0.14, MY0 + 0.35 + Math.floor(i / 5) * 0.42 + r() * 0.1, MB + 0.05 + r() * 0.12, [C.pink, C.teal, C.mustard, C.lilac, C.coral, C.sky, C.leaf][i % 7]]); }
    for (let i = PILE.length - 1; i >= 0; i--) if (Math.hypot(PILE[i][0] - TARGETS[1][0], PILE[i][1] - TARGETS[1][1]) < 0.45) PILE.splice(i, 1);
    // The goose's end of the machine is all white bears, so it sits among them
    // as one more white toy.
    for (const p of PILE) if (Math.hypot(p[0] - TARGETS[1][0], p[1] - TARGETS[1][1]) < 0.85) p[3] = C.white;
    const nearest = (tx, ty) => PILE.reduce((b, p, i) => (Math.hypot(p[0] - tx, p[1] - ty) < Math.hypot(PILE[b][0] - tx, PILE[b][1] - ty) ? i : b), 0);
    const grabbed = TARGETS.map(([x, y]) => nearest(x, y));
    R.thing(MX0 + 0.6, MY0 + 0.6, (ctx, t) => {
      const st = clawState(t);
      const skip = (st.att === 0 && st.s > 3.5 && st.s < 6.3) || (st.att === 2 && st.s > 3.5) ? grabbed[st.att] : -1;
      const sorted = PILE.map((p, i) => [p, i]).sort((a, b) => a[0][0] + a[0][1] - b[0][0] - b[0][1]);
      for (const [p, i] of sorted) if (i !== skip) plush(ctx, p[0], p[1], p[2], p[3], 0.8);
    }, { anim: true });
    // Claw machine: front half, with the claw itself
    R.thing(MX0 + MW - 0.3, MY0 + MW - 0.3, (ctx, t) => {
      const st = clawState(t);
      const [tx, ty] = TARGETS[st.att];
      // falling plush in the slip attempt
      if (st.att === 0 && st.s > 5.3 && st.s < 6.3) {
        const k = (st.s - 5.3) / 1.0;
        const x = tx + (HOME[0] - tx) * ease(clamp((5.3 - 4.5) / 2));
        const y = ty + (HOME[1] - ty) * ease(clamp((5.3 - 4.5) / 2));
        const z = (MT - 0.35 - 0.45) + (MB + 0.1 - (MT - 0.8)) * clamp(k * k * 1.6);
        plush(ctx, x, y, z, PILE[grabbed[0]][3], 0.8);
      }
      // white bears heaped in front of the goose, up to its chest
      for (const [bx, by, bz] of SNUG) plush(ctx, bx, by, bz, C.white, 0.8);
      // gantry rails
      face(ctx, [[MX0 + 0.1, st.y, MT - 0.15], [MX0 + MW - 0.1, st.y, MT - 0.15]], null, { lw: 0.06, stroke: C.grey });
      box(ctx, st.x - 0.14, st.y - 0.14, MT - 0.25, 0.28, 0.28, 0.12, C.grey);
      face(ctx, [[st.x, st.y, MT - 0.25], [st.x, st.y, st.z + 0.15]], null, { lw: 0.03 });
      const [X, Y] = P(st.x, st.y, st.z);
      if (st.carry) plush(ctx, st.x, st.y, st.z - 0.55, PILE[grabbed[st.att]][3], 0.8);
      ctx.beginPath(); ctx.arc(X, Y - 0.1, 0.1, 0, Math.PI * 2); paint(ctx, C.greyLight, { lw: 0.03 });
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.lineCap = 'round';
      const sp = 0.08 + st.open * 0.2;
      ctx.beginPath();
      for (const d of [-1, 0, 1]) {
        ctx.moveTo(X + d * 0.05, Y - 0.05);
        ctx.quadraticCurveTo(X + d * (sp + 0.08), Y + 0.12, X + d * sp * (d ? 0.6 : 0) , Y + 0.3);
      }
      ctx.stroke();
      // front glass and frame
      face(ctx, [[MX0 + MW, MY0, MB], [MX0 + MW, MY0 + MW, MB], [MX0 + MW, MY0 + MW, MT], [MX0 + MW, MY0, MT]], alpha(C.sky, 0.14), { lw: 0.03 });
      face(ctx, [[MX0, MY0 + MW, MB], [MX0 + MW, MY0 + MW, MB], [MX0 + MW, MY0 + MW, MT], [MX0, MY0 + MW, MT]], alpha(C.sky, 0.14), { lw: 0.03 });
      if (Q.detail) {
        for (const o of [0.3, 0.55]) face(ctx, [[MX0 + o, MY0 + MW, MB + 0.4], [MX0 + o + 0.5, MY0 + MW, MT - 0.3]], null, { lw: 0.06, stroke: alpha(C.white, 0.5) });
      }
      for (const [x, y] of [[MX0, MY0 + MW], [MX0 + MW, MY0 + MW], [MX0 + MW, MY0]]) box(ctx, x - 0.05, y - 0.05, MB, 0.1, 0.1, MT - MB, C.coral, { flat: true, lw: 0.03 });
      box(ctx, MX0 - 0.05, MY0 - 0.05, MT, MW + 0.1, MW + 0.1, 0.55, C.coral);
      const blink = Math.floor(t * 4) % 2;
      for (let i = 0; i < 6; i++) {
        const [bx, by] = P(MX0 + 0.2 + i * 0.36, MY0 + MW + 0.06, MT + 0.28);
        ctx.beginPath(); ctx.arc(bx, by, 0.06, 0, Math.PI * 2); ctx.fillStyle = (i + blink) % 2 ? C.butter : C.white; ctx.fill();
      }
    }, { anim: true });
    // The claw kid: three tries, one miracle.
    R.mover(() => ({ x: 11.0, y: MY0 + MW + 0.8 }), (ctx, t, p) => {
      const st = clawState(t);
      let pose = 'drum', say = null, back = true;
      if (st.s > 6.5 && st.att === 2) { pose = 'jump'; say = 'YES!!'; back = false; }
      else if (st.att === 0 && st.s > 5.4) { pose = 'stand'; say = 'NOOO!'; back = false; }
      else if (st.att === 1 && st.s > 3.6 && st.s < 6.5) { pose = 'stand'; say = 'HUH?'; back = false; }
      else if (st.s < 2 || st.s > 6.5) pose = 'drum';
      else pose = 'stand';
      person(ctx, p.x, p.y, 0, folk(470, { pose, dir: 'r', back, scale: 0.72, top: C.sky, style: 'pony', arms: pose === 'stand' && !say ? [1.3, 1.2] : undefined, speed: 12,
        hold: st.att === 2 && st.s > 6.8 ? (c) => plush(c, 0, 0, 0, PILE[grabbed[2]][3], 0.9) : undefined }), t);
      if (say && Q.detail) speech(ctx, p.x, p.y, 2.3, say, { size: 0.42, fill: say === 'YES!!' ? C.butter : C.white });
    });
    R.mover(() => ({ x: 12.3, y: MY0 + MW + 1.3 }), (ctx, t, p) => {
      const st = clawState(t);
      const win = st.att === 2 && st.s > 6.5;
      person(ctx, p.x, p.y, 0, folk(471, { pose: win ? 'cheer' : 'stand', dir: 'l', scale: 0.74, top: C.coral, arms: win ? undefined : [0.2, 2.6] }), t);
    });
    // The goose, sitting among the white plush and bonking the claw away
    // when it comes for her (a hard find: one more white toy, until it honks).
    R.goose((t) => {
      const st = clawState(t);
      const honk = st.att === 1 && st.s > 3.0 && st.s < 5.5;
      return { x: 11.85, y: 2.05, z: MB + 0.05, dir: 'l', pose: honk ? 'honk' : 'sit' };
    }, { bias: 0.1, scale: 1, kind: 'hard', hint: 'Not every white toy in the claw machine is a prize. One of them bites.' });
    // The machine itself answers back.
    R.poke({ id: 'claw', at: [MX0 + 1.4, MY0 + MW, 0.55], r: 0.8, sound: 'clunk', say: ['RIGGED.', 'Still rigged.', 'Three tries. One miracle.'] });

    // Overflowing bin between the cabinets and the claw
    R.thing(9.75, 2.4, (ctx) => {
      cylinder(ctx, 9.35, 2.0, 0, 0.4, 1.0, C.grey);
      for (const [dx, dy, c] of [[-0.15, 0.05, C.coral], [0.12, -0.1, C.white], [0.05, 0.2, C.teal]]) {
        const [X, Y] = P(9.35 + dx, 2.0 + dy, 1.1);
        ctx.beginPath(); ctx.moveTo(X - 0.1, Y); ctx.lineTo(X + 0.1, Y); ctx.lineTo(X + 0.13, Y - 0.35); ctx.lineTo(X - 0.13, Y - 0.35); ctx.closePath();
        paint(ctx, c, { lw: 0.03 });
      }
      const [X, Y] = P(9.4, 2.75, 0.02);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.14, 0.08, 0.3, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.03 });
    });

    // Bench with a dad who is done for the day
    R.thing(15.2, 13.9, (ctx, t) => {
      box(ctx, 12.8, 13.2, 0.55, 2.4, 0.7, 0.15, C.teal);
      box(ctx, 12.8, 13.1, 0.7, 2.4, 0.12, 0.9, C.teal);
      for (const x of [12.9, 15.0]) box(ctx, x, 13.7, 0, 0.12, 0.12, 0.55, C.ink, { flat: true });
      person(ctx, 13.6, 13.6, 0.2, folk(480, { pose: 'sit', dir: 'r', top: C.navy, style: 'bald', arms: [0.3, 0.2] }), t);
      if (Q.detail) {
        const k = (t * 0.5) % 1;
        label(ctx, 13.4 - k * 0.4, 13.4 - k * 0.4, 2.6 + k, 'z', 0.4 + k * 0.3, alpha(C.white, 1 - k));
      }
      // shopping bag and a balloon tied to the bench
      box(ctx, 14.5, 13.3, 0.7, 0.5, 0.35, 0.55, C.mustard);
      face(ctx, [[15.1, 13.3, 1.6], [15.3 + Math.sin(t) * 0.1, 13.2, 3.6]], null, { lw: 0.02 });
      const [bx, by] = P(15.3 + Math.sin(t) * 0.1, 13.2, 3.85);
      ctx.beginPath(); ctx.ellipse(bx, by, 0.3, 0.36, 0, 0, Math.PI * 2); paint(ctx, C.coral, { dots: C.red, density: 0.2, lw: 0.04 });
    }, { anim: true });

    // Photo booth: two pairs of feet, a curtain, a flash, a strip of photos.
    // A tap sets the flash off (the one a first visit is nudged to tap).
    const booth = R.poke({ id: 'photos', at: [15.0, 11.3, 1.5], r: 1.1, hold: 0.6, teach: true, sound: 'tick', say: ['SAY CHEESE!', 'Blinked. Again.', 'Lovely. Framing that one.'] });
    R.thing(15.9, 11.4, (ctx, t) => {
      const x0 = 14.1, x1 = 15.9, y0 = 9.3, y1 = 11.3;
      box(ctx, x0, y0, 0, x1 - x0, y1 - y0, 3.0, C.teal, { left: shade(C.teal, 0.1) });
      box(ctx, x0 - 0.05, y0 - 0.05, 3.0, x1 - x0 + 0.1, y1 - y0 + 0.1, 0.4, C.mustard);
      label(ctx, (x0 + x1) / 2, y1 + 0.05, 3.2, 'PHOTOS', 0.28, C.ink);
      // opening on the front (+y) face with a flash spilling out
      const k = pulse(t, 4.2);
      const flash = k < 0.08 || booth.k() > 0.3;
      face(ctx, [[x0 + 0.3, y1 + 0.01, 0.35], [x1 - 0.3, y1 + 0.01, 0.35], [x1 - 0.3, y1 + 0.01, 2.6], [x0 + 0.3, y1 + 0.01, 2.6]], flash ? C.white : C.night);
      // two pairs of feet under the curtain
      for (const [fx, c] of [[x0 + 0.6, C.coral], [x0 + 0.95, C.ink], [x0 + 1.25, C.pink], [x0 + 1.5, C.ink]]) {
        const [X, Y] = P(fx, y1 + 0.02, 0.1);
        ctx.beginPath(); ctx.ellipse(X, Y, 0.1, 0.06, 0, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill();
      }
      // curtain with a sway
      const sw = Math.sin(t * 1.6) * 0.06;
      const pts = [];
      for (let i = 0; i <= 8; i++) pts.push([x0 + 0.3 + i * 0.15 + (i % 2 ? sw : 0), y1 + 0.05, 2.6]);
      for (let i = 8; i >= 0; i--) pts.push([x0 + 0.3 + i * 0.15 + sw * 2, y1 + 0.05, 0.55]);
      face(ctx, pts, C.red, { dots: shade(C.red, 0.4), density: 0.25 });
      // tapped: the flash goes off through the curtain
      const bk = booth.k();
      if (bk > 0.05) {
        face(ctx, pts, alpha(C.white, 0.75 * bk), { stroke: false });
        const [FX, FY] = P((x0 + x1) / 2, y1 + 0.1, 1.6);
        ctx.beginPath();
        for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; ctx.moveTo(FX + Math.cos(a) * 1.2, FY + Math.sin(a) * 1.2); ctx.lineTo(FX + Math.cos(a) * (1.2 + bk * 0.6), FY + Math.sin(a) * (1.2 + bk * 0.6)); }
        ctx.strokeStyle = C.butter; ctx.lineWidth = 0.08; ctx.lineCap = 'round'; ctx.stroke();
      }
      // the strip of photos, slides out after each flash
      const out = clamp((k - 0.2) / 0.3) * (1 - clamp((k - 0.9) / 0.1));
      if (out > 0) {
        const [X, Y] = P(x1 + 0.02, y0 + 0.6, 1.2);
        ctx.beginPath(); ctx.rect(X - 0.12, Y, 0.24, out * 0.8); paint(ctx, C.white, { lw: 0.02 });
      }
    }, { anim: true });
    R.mover(() => ({ x: 13.4, y: 11.9 }), (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, folk(540, { pose: pulse(t, 4.2) < 0.1 ? 'cheer' : 'stand', dir: 'r', top: C.purple, style: 'long', hat: 'party', arms: [0.4, 2.6] }), t);
    });

    // Skee-ball lanes: balls roll up the ramp and hop into the rings.
    const SK = [[5.3, 520], [6.3, 521]];
    SK.forEach(([y0, seed], li) => {
      R.thing(15.4, y0 + 0.9, (ctx, t) => {
        const x0 = 12.2, x1 = 15.3, w = 0.85;
        const zr = (x) => 0.55 + clamp((13.6 - x) / 1.4) * 0.9;
        face(ctx, [[x0, y0 + w, 0], [x1, y0 + w, 0], [x1, y0 + w, zr(x1)], [13.6, y0 + w, zr(13.6)], [x0, y0 + w, zr(x0)]], li ? C.teal : C.coral, { dots: shade(li ? C.teal : C.coral, 0.4), density: 0.2 });
        face(ctx, [[x1, y0, 0], [x1, y0 + w, 0], [x1, y0 + w, zr(x1)], [x1, y0, zr(x1)]], shade(li ? C.teal : C.coral, 0.1));
        face(ctx, [[x1, y0, zr(x1)], [x1, y0 + w, zr(x1)], [13.6, y0 + w, zr(13.6)], [13.6, y0, zr(13.6)]], C.woodLight);
        face(ctx, [[13.6, y0, zr(13.6)], [13.6, y0 + w, zr(13.6)], [x0, y0 + w, zr(x0)], [x0, y0, zr(x0)]], shade(C.woodLight, 0.15));
        for (const [cx, rr] of [[12.8, 0.3], [12.5, 0.2]]) disc(ctx, cx, y0 + w / 2, zr(cx) + 0.02, rr, C.night, { lw: 0.03 });
        box(ctx, x0 - 0.2, y0, 0, 0.2, w, 2.6, C.purple);
        face(ctx, [[x0 + 0.01, y0 + 0.1, 1.8], [x0 + 0.01, y0 + w - 0.1, 1.8], [x0 + 0.01, y0 + w - 0.1, 2.4], [x0 + 0.01, y0 + 0.1, 2.4]], C.night);
        const score = (Math.floor((t + li * 1.3) / 2.6) * 30) % 460;
        label(ctx, x0 + 0.02, y0 + w / 2, 2.1, String(score), 0.24, C.mustard, 'Rethink Sans');
        // the ball
        const k = pulse(t, 2.6, li * 1.3);
        if (k < 0.85) {
          const q = k / 0.85;
          const bx = x1 - 0.4 - q * (x1 - 0.4 - 12.8);
          const hop = q > 0.7 ? Math.sin(((q - 0.7) / 0.3) * Math.PI) * 0.5 : 0;
          const [X, Y] = P(bx, y0 + w / 2, zr(bx) + 0.12 + hop);
          ctx.beginPath(); ctx.arc(X, Y, 0.12, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.03 });
        }
      }, { anim: true });
      R.mover(() => ({ x: 15.75, y: y0 + 0.45 }), (ctx, t, p) => {
        const k = pulse(t, 2.6, li * 1.3);
        person(ctx, p.x, p.y, 0, folk(seed, { pose: k > 0.9 || k < 0.05 ? 'point' : 'stand', dir: 'l', back: true, scale: li ? 0.72 : 1, arms: k > 0.9 || k < 0.05 ? undefined : [0.5, -0.3] }), t);
      });
    });

    // Sit-down racing cabinets with two kids neck and neck
    [[5.6, C.red, 530], [7.3, C.mustard, 531]].forEach(([x, col, seed], i) => {
      R.thing(x + 1.4, 12.8, (ctx) => {
        box(ctx, x, 11.6, 0, 1.4, 1.2, 2.2, col, { left: shade(col, 0.1) });
        box(ctx, x - 0.02, 11.6, 2.2, 1.44, 1.3, 0.4, shade(col, 0.3), { left: C.night });
        label(ctx, x + 0.7, 12.9, 2.4, 'TURBO', 0.26, C.butter);
        face(ctx, [[x + 0.15, 12.81, 1.1], [x + 1.25, 12.81, 1.1], [x + 1.25, 12.81, 2.0], [x + 0.15, 12.81, 2.0]], C.ink);
      });
      R.thing(x + 1.4, 12.85, (ctx, t) => {
        screen(ctx, (u, v) => [x + 0.2 + u * 1.0, 12.82, 1.15 + v * 0.8], 1, t, i + 30, false);
      }, { anim: true });
      R.thing(x + 1.3, 14.4, (ctx, t) => {
        box(ctx, x + 0.2, 13.4, 0, 1.0, 1.0, 0.55, C.ink);
        box(ctx, x + 0.2, 14.2, 0.55, 1.0, 0.25, 1.2, C.ink, { top: C.navy });
        const steer = Math.sin(t * 2.2 + i * 2) * 0.5;
        person(ctx, x + 0.7, 13.9, 0.35, folk(seed, { pose: 'sit', dir: 'r', back: true, scale: 0.72, arms: [1.5 + steer * 0.3, 1.5 - steer * 0.3] }), t);
        const [X, Y] = P(x + 0.7, 13.05, 1.25);
        ctx.save(); ctx.translate(X, Y); ctx.rotate(steer);
        ctx.beginPath(); ctx.ellipse(0, 0, 0.26, 0.2, 0, 0, Math.PI * 2); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.08; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-0.26, 0); ctx.lineTo(0.26, 0); ctx.lineWidth = 0.05; ctx.stroke();
        ctx.restore();
      }, { anim: true });
    });

    // Kid strolling with a huge tub of popcorn
    const stroll = route([[4.6, 10.4, 1], [11.6, 10.5], [11.8, 15.2, 1.5], [5.0, 15.3]], { speed: 1.0 });
    R.mover(stroll, (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, folk(490, { pose: p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back, scale: 0.74, top: C.butter, hat: 'party',
        hold: (c) => { c.beginPath(); c.moveTo(-0.1, -0.05); c.lineTo(0.3, -0.05); c.lineTo(0.25, 0.35); c.lineTo(-0.05, 0.35); c.closePath(); paint(c, C.red, { dots: C.white, density: 0.5, lw: 0.02 }); c.beginPath(); c.arc(0.1, -0.08, 0.14, Math.PI, 0); c.fillStyle = C.butter; c.fill(); } }), t);
    });

    // A spilled soda, in plain sight (a spot find).
    R.rug((ctx) => {
      const [X, Y] = P(10.7, 14.6, 0.01);
      ctx.beginPath();
      ctx.ellipse(X + 0.35, Y + 0.1, 0.65, 0.28, 0.1, 0, Math.PI * 2);
      ctx.ellipse(X + 0.75, Y + 0.25, 0.3, 0.14, 0, 0, Math.PI * 2);
      ctx.fillStyle = alpha(C.brown, 0.75);
      ctx.fill();
      // cup on its side
      ctx.save(); ctx.translate(X - 0.1, Y - 0.12); ctx.rotate(-0.25);
      ctx.beginPath(); ctx.moveTo(-0.3, -0.13); ctx.lineTo(0.2, -0.17); ctx.lineTo(0.2, 0.17); ctx.lineTo(-0.3, 0.13); ctx.closePath();
      paint(ctx, C.white, { lw: 0.03 });
      ctx.beginPath(); ctx.rect(-0.2, -0.14, 0.14, 0.28); ctx.fillStyle = C.coral; ctx.fill();
      ctx.beginPath(); ctx.ellipse(0.2, 0, 0.05, 0.17, 0, 0, Math.PI * 2); paint(ctx, C.brown, { lw: 0.02 });
      ctx.beginPath(); ctx.moveTo(0.22, 0); ctx.lineTo(0.55, 0.05); ctx.strokeStyle = C.pink; ctx.lineWidth = 0.05; ctx.stroke();
      ctx.restore();
    });
    R.find({ id: 'soda', label: 'A spilled soda', kind: 'spot', at: [10.8, 14.7, 0.1], r: 0.8 });

  },
};

// A drawer in the prize counter's front (the face at y 3.7), x0 its left
// edge: shut (k 0) or slid out toward you (k 1). gold: the one with the
// golden ticket, a corner of which sticks out of the gap while it's shut.
function drawer(ctx, x0, k, gold) {
  const w = 0.7, z0 = 0.2, h = 0.3, fy = 3.7, d = k * 0.6;
  if (d > 0.02) {
    // the part slid out: the inside, then what's in it
    box(ctx, x0, fy, z0, w, d, h, shade(C.pink, 0.15), { top: C.night, lw: 0.03 });
    if (gold) ticket(ctx, x0 + 0.35, fy + d * 0.5, z0 + h + 0.02, 0.2);
    else for (let i = 0; i < 4; i++) ticket(ctx, x0 + 0.15 + i * 0.14, fy + d * 0.5 + (i % 2) * 0.08, z0 + h + 0.02, 0.1 * i - 0.2, C.coral);
  }
  face(ctx, [[x0, fy + d + 0.01, z0], [x0 + w, fy + d + 0.01, z0], [x0 + w, fy + d + 0.01, z0 + h], [x0, fy + d + 0.01, z0 + h]], tint(C.pink, 0.2), { lw: 0.03 });
  const [X, Y] = P(x0 + w / 2, fy + d + 0.02, z0 + h / 2);
  ctx.beginPath(); ctx.arc(X, Y, 0.05, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.02 });
  if (gold && d <= 0.02) {
    // a gold corner caught in the gap
    // (big enough to read in a still at a phone's framing)
    face(ctx, [[x0 + 0.36, fy + 0.02, z0 + h], [x0 + 0.64, fy + 0.02, z0 + h], [x0 + 0.56, fy + 0.03, z0 + h + 0.17]], C.mustard, { lw: 0.025, dots: C.butter, density: 0.5 });
  }
}
// A ticket lying flat at (x, y, z), turned by a.
function ticket(ctx, x, y, z, a = 0, color = C.mustard) {
  const [X, Y] = P(x, y, z);
  ctx.save(); ctx.translate(X, Y); ctx.rotate(a);
  ctx.beginPath(); ctx.rect(-0.22, -0.08, 0.44, 0.16);
  paint(ctx, color, { dots: color === C.mustard ? C.butter : null, density: 0.5, lw: 0.025 });
  if (color === C.mustard) { ctx.beginPath(); ctx.rect(-0.16, -0.04, 0.32, 0.08); ctx.strokeStyle = shade(C.mustard, 0.35); ctx.lineWidth = 0.015; ctx.stroke(); }
  ctx.restore();
}
