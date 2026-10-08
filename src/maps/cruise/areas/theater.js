// The Theater. The stern end of the Promenade: the stage against the stern,
// a gilt arch full of bulbs, three rows of red velvet seats, the follow spot
// in its booth by the lift. The Great Gary lost his rabbit on day one and has
// been pulling other things out of the hat ever since; they pile up on the
// stage all day. The kids' slime show at 10, bingo at 3. The rabbit is in a
// lifebuoy by the door. Keep the id: it's in links and saves.
import {
  C, Q, box, rect, disc, cylinder, face, poly, paint, person, folk, speech, label,
  onLeft, onRight, paintText, shade, tint, alpha, glow, SKIN, HAIR,
} from '../../../engine/art.js';
import { route, particles, pulse, clamp } from '../../../engine/actors.js';
import { deck } from '../ship.js';
import { bucket, board, lettering, P, CREW_LOOK } from '../kit.js';
import { INK, MAT, green, queasy, wrap, at } from '../style.js';

// ---------- The plan ----------
// The stage runs along the stern (x 0 to 7, y 3 to 14, a unit high); the arch
// stands at its back so it never hides the act. Seats face it, in three rows
// with a wide aisle from the door at y 12 (the day's walkers cross there).
const ST = { x1: 7, y0: 3, y1: 14, h: 1 };
const ARCH = { x0: 1.05, x1: 1.65, y0: 2.3, y1: 14.8, top: 6.3, under: 5.2 };
const GARY = [3.5, 7];
const TABLE = { x0: 3.95, x1: 5.45, y0: 10.95, y1: 12.1, top: 1.55 };
const ROWS = {
  // (No seats at A 10 and 11: a beanbag there for Tyler, who sits at 10, 10
  // all morning and is too small to see over a seat back.)
  A: { x: 10, seats: [5.0, 5.9, 8.1, 9.05, 11.9, 12.85, 13.8] },
  B: { x: 12, seats: [8.2, 11.9, 12.85, 13.8] },
  C: { x: 14, seats: [5.0, 5.9, 6.8, 7.7, 13.3] },
};
const PILE = [5.3, 4.1];
const CAGE = [9.65, 3.5];
const BOOTH = { x0: 14.2, x1: 16, y1: 2.3, h: 1.6 };
const RABBIT = [14.8, 14.6];
const SPOT = [14.3, 1.1, 2.7]; // the follow spot's lens
const HAT = [GARY[0] + 0.23, GARY[1] - 0.23, 2.3]; // the hat in Gary's far hand
const TRUNKS = [[5.75, 10.1], [5.75, 12.35]]; // Captain Splat's trunks (their back corners)
const LIZARD = [6.2, 5.7]; // the rubber lizard, belly up

// The day's shows (seconds into the loop).
const KIDS = [at(9.3), at(11.1)];
const MATINEE = [at(11.4), at(14.2)];
const BINGO = [at(14.4), at(16.6)];
const PIGEON = at(9); // Pidge searches the hat

// In a window, faded in and out over a second and a half.
const within = (w, a, b) => clamp((w - a) / 1.5) * clamp((b - w) / 1.5);
// A face at k green, in tenths (so the colour mixes stay few).
const qz = (skin, k) => queasy(skin, Math.round(k * 10) / 10);
// A hand's spot in a person's own units, for an arm at angle a (standing or sitting).
const hand = (a, far = false) => [(far ? -0.22 : 0.22) + Math.sin(a) * 0.72, -1.53 + Math.cos(a) * 0.72];
// Draw in someone's own units at (x, y, z), facing f (1 right, -1 left).
function local(ctx, x, y, z, f, fn, s = 1) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(f * s, s);
  fn(ctx);
  ctx.restore();
}
// Flat on the floor at (x, y, z): u runs along x, v along y.
function onFloor(ctx, x, y, z, fn) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.transform(1, 0.5, -1, 0.5, 0, 0);
  fn(ctx);
  ctx.restore();
}
// Words painted on the floor.
function floorText(ctx, x, y, text, size, color) {
  if (!Q.detail) return;
  ctx.save();
  ctx.transform(1, 0.5, -1, 0.5, x - y, (x + y) / 2);
  const k = 40;
  ctx.scale(1 / k, 1 / k);
  ctx.font = `${size * k}px "Rethink Sans", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
// Small upright words.
const small = (ctx, x, y, z, text, size, color = C.ink) => { if (Q.detail) label(ctx, x, y, z, text, size, color, 'Rethink Sans'); };

// ---------- Things out of the hat ----------
// Each drawn in screen units round (0, 0), about 0.4 across.
const THINGS = {
  leg(c) { // a chicken leg, from the buffet
    c.beginPath(); c.ellipse(-0.05, 0, 0.17, 0.12, -0.5, 0, Math.PI * 2); paint(c, MAT.teakDark, { lw: 0.025 });
    c.beginPath(); c.moveTo(0.08, -0.08); c.lineTo(0.22, -0.2); c.lineWidth = 0.07; c.strokeStyle = C.ink; c.stroke();
    c.lineWidth = 0.04; c.strokeStyle = C.white; c.stroke();
    c.beginPath(); c.arc(0.24, -0.23, 0.045, 0, Math.PI * 2); paint(c, C.white, { lw: 0.02 });
  },
  flop(c) { // a flip-flop
    c.beginPath(); c.ellipse(0, 0, 0.1, 0.22, 0.3, 0, Math.PI * 2); paint(c, INK.sunYellow, { lw: 0.025 });
    c.beginPath(); c.moveTo(-0.08, 0.02); c.lineTo(0.02, -0.12); c.lineTo(0.1, 0.0); c.strokeStyle = INK.funnelRed; c.lineWidth = 0.035; c.stroke();
  },
  cola(c) { // a Gander Cola
    c.beginPath(); c.roundRect(-0.08, -0.16, 0.16, 0.3, 0.03); paint(c, INK.funnelRed, { lw: 0.025 });
    c.fillStyle = C.white; c.fillRect(-0.08, -0.04, 0.16, 0.05);
    c.fillStyle = MAT.chrome; c.fillRect(-0.07, -0.16, 0.14, 0.03);
  },
  sock(c) { // somebody's sock
    c.beginPath(); c.moveTo(-0.06, -0.2); c.lineTo(0.06, -0.2); c.lineTo(0.06, 0.02); c.quadraticCurveTo(0.2, 0.04, 0.18, 0.12); c.lineTo(-0.06, 0.12); c.closePath();
    paint(c, C.white, { lw: 0.025 });
    c.fillStyle = C.sky; c.fillRect(-0.06, -0.16, 0.12, 0.04); c.fillRect(-0.06, -0.08, 0.12, 0.04);
  },
  swan(c) { // a towel swan, from the cabins
    c.beginPath(); c.ellipse(0, 0.04, 0.18, 0.09, 0, 0, Math.PI * 2); paint(c, C.white, { lw: 0.025 });
    c.beginPath(); c.moveTo(0.08, 0.0); c.quadraticCurveTo(0.2, -0.22, 0.1, -0.26); c.quadraticCurveTo(0.14, -0.14, 0.04, 0.0); paint(c, C.white, { lw: 0.025 });
  },
  duck(c) { // a rubber duck
    c.beginPath(); c.ellipse(0, 0.04, 0.15, 0.1, 0, 0, Math.PI * 2); paint(c, INK.sunYellow, { lw: 0.025 });
    c.beginPath(); c.arc(0.08, -0.1, 0.08, 0, Math.PI * 2); paint(c, INK.sunYellow, { lw: 0.025 });
    c.beginPath(); c.moveTo(0.14, -0.11); c.lineTo(0.22, -0.09); c.lineTo(0.14, -0.06); c.fillStyle = C.coral; c.fill();
  },
  shrimp(c) { // a shrimp, curled
    c.beginPath(); c.arc(0, 0, 0.13, Math.PI * 0.1, Math.PI * 1.5); c.strokeStyle = C.ink; c.lineWidth = 0.12; c.stroke();
    c.strokeStyle = C.coralLight; c.lineWidth = 0.08; c.stroke();
  },
  plate(c) { // a buffet plate, still loaded
    c.beginPath(); c.ellipse(0, 0.04, 0.22, 0.08, 0, 0, Math.PI * 2); paint(c, C.white, { lw: 0.025 });
    c.beginPath(); c.ellipse(0, -0.02, 0.13, 0.09, 0, Math.PI, 0); paint(c, C.mustard, { lw: 0.02, dots: C.coral, density: 0.4 });
  },
  ball(c) { // a bingo ball
    c.beginPath(); c.arc(0, 0, 0.13, 0, Math.PI * 2); paint(c, C.white, { lw: 0.025 });
    c.beginPath(); c.arc(0, 0, 0.065, 0, Math.PI * 2); paint(c, INK.funnelRed, { stroke: false });
  },
};
const ORDER = ['leg', 'flop', 'cola', 'sock', 'swan', 'duck', 'shrimp', 'plate'];
const LINES = {
  leg: 'From the buffet!', flop: 'Ta-da?', cola: 'Take a gander!', sock: 'Nearly.', swan: 'A rabbit! No.',
  duck: 'Close!', shrimp: 'Do not eat that.', plate: 'Still warm.', ball: 'B four?',
};

// Gary's act, on a ten-second loop: wave the wand, reach in, pull, show it,
// toss it on the pile, bow. At 9am the hat gives up a pigeon instead.
const CYCLE = 10;
function act(w) {
  const n = Math.floor(w / CYCLE), s = w - n * CYCLE;
  const pigeon = w >= PIGEON && w < PIGEON + CYCLE;
  const bingo = w >= BINGO[0] && w < BINGO[1];
  const item = pigeon ? 'pigeon' : bingo ? 'ball' : ORDER[n % ORDER.length];
  let stage, k = 0;
  if (s < 2) { stage = 'wave'; k = s / 2; }
  else if (s < 3) { stage = 'reach'; k = s - 2; }
  else if (s < 3.8) { stage = 'pull'; k = (s - 3) / 0.8; }
  else if (s < 6.5) { stage = 'show'; k = (s - 3.8) / 2.7; }
  else if (s < 7.6) { stage = 'toss'; k = (s - 6.5) / 1.1; }
  else { stage = 'bow'; k = (s - 7.6) / 2.4; }
  return { n, s, stage, k, item, pigeon, bingo };
}
// How many things are on the pile by w (the pigeon's cycle adds none).
function piled(w) {
  let c = 0;
  for (let n = 0; n * CYCLE + 7.6 <= w; n++) if (!(n * CYCLE >= PIGEON && n * CYCLE < PIGEON + CYCLE)) c++;
  return c;
}
const pileItem = (i, w) => ((i * CYCLE >= BINGO[0] && i * CYCLE < BINGO[1]) ? 'ball' : ORDER[i % ORDER.length]);

// The pigeon: out of the hat at 9am, on the hat's rim, then up to the arch
// for the rest of the day. Its spot in the world and whether it's flying.
function pigeonAt(w) {
  const hatW = [GARY[0] + 0.23, GARY[1] - 0.23, 2.2];
  const perch = [ARCH.x1 + 0.05, 8.4, ARCH.top + 0.02];
  const t0 = PIGEON + 3; // out of the hat
  if (w < t0) return null;
  if (w < t0 + 0.5) { const k = (w - t0) / 0.5; return { p: [hatW[0], hatW[1], hatW[2] + Math.sin(k * Math.PI) * 0.6], fly: true, dir: 1 }; }
  if (w < PIGEON + 7.5) return { p: hatW, fly: false, shock: true, dir: 1 };
  if (w < PIGEON + 10) {
    const k = (w - PIGEON - 7.5) / 2.5;
    const x = hatW[0] + (perch[0] - hatW[0]) * k, y = hatW[1] + (perch[1] - hatW[1]) * k;
    const z = hatW[2] + (perch[2] - hatW[2]) * k + Math.sin(k * Math.PI) * 1.2;
    return { p: [x, y, z], fly: true, dir: -1 };
  }
  return { p: perch, fly: false, dir: -1 };
}
// A pigeon (not Pidge): grey, a green-purple neck, orange eye.
function pigeon(ctx, x, y, z, t, o = {}) {
  local(ctx, x, y, z, o.dir || 1, (c) => {
    c.scale(1.3, 1.3);
    if (o.fly) {
      const f = Math.sin(t * 16) * 0.2;
      c.beginPath(); c.moveTo(-0.05, -0.18); c.quadraticCurveTo(-0.3, -0.5 - f, -0.45, -0.3 - f); c.quadraticCurveTo(-0.25, -0.2, -0.05, -0.12);
      paint(c, C.grey, { lw: 0.025 });
    }
    c.beginPath(); c.ellipse(-0.04, -0.14, 0.2, 0.12, -0.15, 0, Math.PI * 2); paint(c, C.grey, { lw: 0.03 });
    c.beginPath(); c.arc(0.14, -0.3, 0.09, 0, Math.PI * 2); paint(c, C.grey, { lw: 0.03 });
    c.beginPath(); c.ellipse(0.1, -0.2, 0.07, 0.05, 0, 0, Math.PI * 2); c.fillStyle = C.teal; c.fill();
    c.beginPath(); c.moveTo(0.22, -0.31); c.lineTo(0.3, -0.29); c.lineTo(0.22, -0.26); c.fillStyle = C.ink; c.fill();
    c.beginPath(); c.arc(0.17, -0.32, o.shock ? 0.04 : 0.025, 0, Math.PI * 2); c.fillStyle = C.coral; c.fill();
    if (!o.fly) { c.strokeStyle = C.coral; c.lineWidth = 0.025; c.beginPath(); c.moveTo(-0.02, -0.03); c.lineTo(-0.02, 0.02); c.moveTo(0.05, -0.03); c.lineTo(0.05, 0.02); c.stroke(); }
  });
  if (o.shock && Q.detail) label(ctx, x, y, z + 0.75, '!', 0.4, INK.funnelRed);
}

// What comes out of the hat when you tap it, a different thing each tap, and
// what Gary says about it (in step: the line is the tap's, the thing too).
const POP = ['duck', 'sock', 'flop', 'cola', 'shrimp', 'leg', 'swan'];
const POP_SAY = ['A duck! Close.', 'A sock. Not a rabbit.', 'A flip-flop. Ta-da?', 'A Gander Cola!', 'A shrimp. Do not eat.', 'From the buffet!', 'A towel swan. Nearly!'];

// Captain Splat's trunk on the stage: at [x0, y0] (its back corner), a lid
// hinged along the back that tips up when tapped (k). kit: the one with the
// slime kit in, oozing out under the lid; the other is full of glitter.
function trunk(ctx, [x0, y0], k, t, kit) {
  const W = 0.7, D = 0.8, H = 0.48, z0 = ST.h, zt = z0 + H, x1 = x0 + W;
  box(ctx, x0, y0, z0, W, D, H, C.navy, { top: C.ink, dotsL: C.ink, dens: 0.25 });
  for (const y of [y0 + 0.14, y0 + D - 0.14]) face(ctx, [[x1 + 0.005, y, z0 + 0.02], [x1 + 0.005, y, zt - 0.02]], null, { lw: 0.05, stroke: MAT.brass });
  lettering(ctx, 'y', x1 + 0.01, y0 + D / 2, z0 + 0.2, 'CAPT. SPLAT', 0.085, MAT.carpetGold);
  if (k > 0.05) {
    if (kit) {
      // the kit: a tub of lime slime, the lid off, a spoon in it, and its label
      cylinder(ctx, x0 + 0.33, y0 + 0.4, zt - 0.12, 0.2, 0.22, C.white, { top: INK.queasyGreen, lw: 0.02 });
      const [X, Y] = P(x0 + 0.33, y0 + 0.4, zt + 0.1);
      ctx.beginPath(); ctx.ellipse(X, Y - 0.04, 0.2, 0.12, 0, Math.PI, 0); ctx.closePath();
      paint(ctx, INK.queasyGreen, { lw: 0.02, dots: shade(INK.queasyGreen, 0.3), density: 0.2 });
      face(ctx, [[x0 + 0.3, y0 + 0.45, zt + 0.08], [x0 + 0.15, y0 + 0.2, zt + 0.4]], null, { lw: 0.05, stroke: INK.teak });
      board(ctx, 'y', x0 + 0.56, y0 + 0.4, zt + 0.0, 0.34, 0.14, 'LIME 10AM', { size: 0.06, edge: 0.012 });
    } else if (Q.detail) {
      // glitter, up in a puff
      for (let i = 0; i < 10; i++) {
        const [X, Y] = P(x0 + 0.15 + ((i * 0.37) % 0.45), y0 + 0.15 + ((i * 0.53) % 0.55), zt + 0.1 + k * (0.2 + (i % 4) * 0.12));
        ctx.fillStyle = [MAT.carpetGold, INK.flamingo, C.sky][i % 3];
        ctx.beginPath(); ctx.arc(X, Y, 0.035 + 0.02 * Math.abs(Math.sin(t * 6 + i)), 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  // The lid, tipped back on its hinge, and the lip along its free edge.
  const b = k * 1.85, xe = x0 + W * Math.cos(b), ze = zt + W * Math.sin(b);
  const lx = xe + Math.sin(b) * 0.08, lz = ze - Math.cos(b) * 0.08;
  face(ctx, [[x0, y0, zt], [x0, y0 + D, zt], [xe, y0 + D, ze], [xe, y0, ze]], shade(C.navy, 0.1), { lw: 0.03, dots: C.ink, density: 0.2 });
  face(ctx, [[xe, y0, ze], [xe, y0 + D, ze], [lx, y0 + D, lz], [lx, y0, lz]], C.navy, { lw: 0.025 });
  const [CX, CY] = P((xe + lx) / 2 + 0.01, y0 + D / 2, (ze + lz) / 2);
  ctx.beginPath(); ctx.rect(CX - 0.05, CY - 0.05, 0.1, 0.1); paint(ctx, MAT.brass, { lw: 0.015 });
  if (!kit) return;
  // The ooze: squeezed out under the lid, down the front.
  const wob = Math.sin(t * 1.7) * 0.015;
  ctx.beginPath();
  const pts = [[y0 + 0.18, 0], [y0 + 0.3, -0.06], [y0 + 0.42, -0.02], [y0 + 0.55, -0.07], [y0 + 0.66, 0]];
  const [SX, SY] = P(x1 + 0.01, pts[0][0], zt - 0.02);
  ctx.moveTo(SX, SY);
  for (const [y, dz] of pts) { const [X, Y] = P(x1 + 0.01, y, zt + 0.02 + dz); ctx.lineTo(X, Y); }
  for (const [y, len] of [[y0 + 0.62, 0.12], [y0 + 0.5, 0.3 + wob], [y0 + 0.4, 0.1], [y0 + 0.27, 0.22 - wob], [y0 + 0.2, 0.06]]) {
    const [X, Y] = P(x1 + 0.01, y, zt - 0.06 - len);
    ctx.lineTo(X + 0.035, Y - 0.02); ctx.arc(X, Y, 0.04, 0, Math.PI); ctx.lineTo(X - 0.035, Y - 0.02);
  }
  ctx.closePath();
  paint(ctx, INK.queasyGreen, { lw: 0.02 });
  if (Q.detail) { ctx.fillStyle = alpha(C.white, 0.6); ctx.beginPath(); ctx.arc(SX - 0.12, SY + 0.1, 0.025, 0, Math.PI * 2); ctx.fill(); }
}

// The Great Gary's rubber lizard, belly up on the stage, legs in the air:
// lizardy and green at a glance, a toy when you look (the shine, the seam,
// the price tag). The decoy.
function rubberLizard(ctx, x, y, z) {
  const g = INK.queasyGreen, belly = tint(INK.queasyGreen, 0.5);
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.beginPath(); ctx.ellipse(-0.05, 0.02, 0.62, 0.12, 0, 0, Math.PI * 2); ctx.fillStyle = alpha(C.ink, 0.15); ctx.fill();
  // the tail, curled round
  ctx.beginPath();
  ctx.moveTo(-0.3, -0.12);
  ctx.bezierCurveTo(-0.6, -0.08, -0.78, -0.2, -0.7, -0.34);
  ctx.bezierCurveTo(-0.64, -0.44, -0.52, -0.38, -0.56, -0.3);
  ctx.lineCap = 'round';
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.13; ctx.stroke(); }
  ctx.strokeStyle = g; ctx.lineWidth = 0.08; ctx.stroke();
  // four stubby legs in the air, round toes
  for (const [lx, a] of [[-0.2, -0.3], [-0.08, 0.15], [0.16, -0.25], [0.28, 0.2]]) {
    const ex = lx + Math.sin(a) * 0.18, ey = -0.2 - Math.cos(a) * 0.18;
    ctx.beginPath(); ctx.moveTo(lx, -0.14); ctx.lineTo(ex, ey);
    if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.11; ctx.stroke(); }
    ctx.strokeStyle = g; ctx.lineWidth = 0.065; ctx.stroke();
    ctx.beginPath(); ctx.arc(ex, ey, 0.05, 0, Math.PI * 2); paint(ctx, g, { lw: 0.02 });
  }
  // the body on its back: green sides, a pale belly with its moulded scales
  ctx.beginPath(); ctx.ellipse(0, -0.1, 0.36, 0.12, 0, 0, Math.PI * 2); paint(ctx, g, { lw: 0.03 });
  ctx.beginPath(); ctx.ellipse(0, -0.14, 0.3, 0.07, 0, 0, Math.PI * 2); paint(ctx, belly, { lw: 0.015 });
  if (Q.detail) {
    ctx.strokeStyle = shade(belly, 0.2); ctx.lineWidth = 0.012;
    ctx.beginPath(); for (const bx of [-0.15, -0.05, 0.05, 0.15]) { ctx.moveTo(bx, -0.19); ctx.lineTo(bx, -0.09); } ctx.stroke();
  }
  // the head, flopped back, a painted eye and a painted grin
  ctx.beginPath(); ctx.ellipse(0.42, -0.06, 0.15, 0.09, 0.2, 0, Math.PI * 2); paint(ctx, g, { lw: 0.03 });
  ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(0.43, -0.1, 0.035, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0.44, -0.1, 0.018, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.015; ctx.beginPath(); ctx.arc(0.48, -0.05, 0.06, 0.2, 1.4); ctx.stroke();
  // the shine of rubber
  ctx.strokeStyle = alpha(C.white, 0.75); ctx.lineWidth = 0.03;
  ctx.beginPath(); ctx.ellipse(-0.05, -0.12, 0.24, 0.07, 0, Math.PI * 1.15, Math.PI * 1.55); ctx.stroke();
  // the price tag, on a string from a leg
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.012;
  ctx.beginPath(); ctx.moveTo(0.28 + Math.sin(0.2) * 0.18, -0.38); ctx.lineTo(0.4, -0.5); ctx.stroke();
  ctx.beginPath(); ctx.rect(0.36, -0.62, 0.2, 0.12); paint(ctx, C.white, { lw: 0.015 });
  ctx.restore();
  if (Q.detail) {
    const [TX, TY] = [X + 0.46, Y - 0.56];
    ctx.save();
    ctx.font = '700 0.07px "Rethink Sans", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = INK.funnelRed; ctx.fillText('99c', TX, TY);
    ctx.restore();
  }
}

// ---------- The house ----------
// A seat, facing the stage: the cushion and its post (drawn before whoever
// sits in it), then the back and the arms (after).
function seatBase(ctx, x, y) {
  box(ctx, x - 0.08, y - 0.08, 0, 0.16, 0.16, 0.4, C.ink, { flat: true, stroke: false });
  box(ctx, x - 0.35, y - 0.38, 0.4, 0.68, 0.76, 0.18, MAT.carpetRed, { top: tint(MAT.carpetRed, 0.12), dens: 0.3 });
}
function seatBack(ctx, x, y, n) {
  box(ctx, x + 0.32, y - 0.38, 0.35, 0.16, 0.76, 0.85, INK.funnelRed, { top: tint(INK.funnelRed, 0.2), dens: 0.3 });
  // A plush roll along the top, and gold piping.
  const [A, B] = P(x + 0.4, y - 0.38, 1.22), [E, F] = P(x + 0.4, y + 0.38, 1.22);
  ctx.beginPath(); ctx.moveTo(A, B); ctx.lineTo(E, F); ctx.lineCap = 'round';
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.26; ctx.stroke(); }
  ctx.strokeStyle = tint(INK.funnelRed, 0.1); ctx.lineWidth = 0.2; ctx.stroke();
  if (Q.detail) face(ctx, [[x + 0.49, y - 0.36, 0.95], [x + 0.49, y + 0.36, 0.95]], null, { lw: 0.025, stroke: MAT.carpetGold });
  for (const dy of [-0.47, 0.39]) {
    box(ctx, x + 0.25, y + dy, 0.35, 0.08, 0.08, 0.4, MAT.teakDark, { flat: true, lw: 0.02 });
    box(ctx, x - 0.3, y + dy, 0.75, 0.62, 0.08, 0.07, MAT.teakDark, { flat: true, lw: 0.02 });
  }
  if (!Q.detail) return;
  face(ctx, [[x + 0.49, y - 0.1, 0.72], [x + 0.49, y + 0.1, 0.72], [x + 0.49, y + 0.1, 0.84], [x + 0.49, y - 0.1, 0.84]], MAT.brass, { lw: 0.015 });
  if (n != null) small(ctx, x + 0.49, y, 0.78, String(n), 0.08);
}

// Someone in a seat (or on a beanbag): o { seat: [x, y], z, look, sick,
// from, to (a window, faded), arms(t, w), prop(c, t, w) in their own units,
// say(w) }. Everyone faces the stage.
function sitter(R, o) {
  const [x, y] = o.seat;
  const look = { ...folk(o.seed), ...(o.look || {}) };
  R.thing(x + 0.05, y, (ctx, t) => {
    const w = wrap(t);
    const a = o.from != null ? within(w, o.from, o.to) : 1;
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha *= a;
    person(ctx, x + 0.05, y, o.z ?? 0, {
      ...look, skin: qz(look.skin, green(t, o.sick)), pose: 'sit', dir: 'l', back: false,
      arms: o.arms ? o.arms(t, w) : undefined,
      face: o.prop || o.face ? (c, hy, back, tt) => { if (o.face) o.face(c, hy, tt, w); if (o.prop) o.prop(c, tt, w); } : undefined,
    }, t);
    ctx.restore();
    if (o.say && Q.detail) { const line = o.say(w); if (line) speech(ctx, x, y, (o.z ?? 0) + 2.5, line, { size: 0.36 }); }
  }, { anim: true });
}

// A plain floor-standing extra who moves only their arms.
const still = (R, x, y, draw) => R.thing(x, y, draw, { anim: true });

export default {
  id: 'theater',
  name: 'The Theater',
  blurb: "The Great Gary's rabbit escaped on day one. He has pulled everything else out of that hat since, and none of it hops.",
  describe: "The stern end of the Promenade. The stage sits at the back under a gilt arch of bulbs, Gary's assistant still sawn in half on it, facing three rows of red velvet seats and a follow spot by the lift. A kids' show fills the seats at ten, bingo at three.",

  build(R) {
    deck(R, 'theater', 'promenade', { floor: MAT.carpetRed, wall: shade(MAT.carpetRed, 0.08), grid: false, name: false });

    // ---------- The carpet ----------
    // Theater carpet: a gold lattice on red, a darker runner up the aisle from
    // the door, the splash mat in front of the stage for the kids' show.
    R.floor((ctx) => {
      if (!Q.detail) return;
      ctx.save();
      poly(ctx, [[0, 0, 0], [16, 0, 0], [16, 16, 0], [0, 16, 0]]);
      ctx.clip();
      ctx.beginPath();
      for (let k = -16; k <= 32; k += 1.4) {
        const a = P(k, 0), b = P(k + 16, 16), c = P(k, 16), d = P(k + 16, 0);
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
        ctx.moveTo(c[0], c[1]); ctx.lineTo(d[0], d[1]);
      }
      ctx.strokeStyle = alpha(MAT.carpetGold, 0.28);
      ctx.lineWidth = 0.035;
      ctx.stroke();
      ctx.fillStyle = alpha(MAT.carpetGold, 0.5);
      for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) {
        const [X, Y] = P(i * 1.4 + 0.7, j * 1.4 + 0.7);
        ctx.beginPath(); ctx.arc(X, Y, 0.06, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    });
    R.rug((ctx) => {
      // The aisle runner, from the door to the front, and the cross aisle.
      const run = [[16, 10.3, 0.005], [16, 13.4, 0.005], [12.7, 11.2, 0.005], [10.8, 11.2, 0.005], [10.8, 7.6, 0.005], [9.4, 7.6, 0.005], [9.4, 6.4, 0.005], [10.8, 6.4, 0.005], [12.7, 8.8, 0.005]];
      face(ctx, run, shade(MAT.carpetRed, 0.25), { lw: 0.03, stroke: MAT.carpetGold, dots: shade(MAT.carpetRed, 0.5), density: 0.12 });
      // Little aisle lights along it.
      if (Q.detail) for (const [x, y] of [[15.2, 10.6], [14, 10], [12.9, 9.2], [15.2, 13.1], [14, 12.3], [12.9, 11.4]]) disc(ctx, x, y, 0.01, 0.07, INK.sunYellow, { lw: 0.015 });
      // The splash mat, and SPLASH ZONE painted on it.
      rect(ctx, 7.35, 8.5, 1.9, 4.2, 0.008, tint(C.sky, 0.35), { lw: 0.03, dots: C.sky, density: 0.15 });
      floorText(ctx, 8.95, 10.6, 'SPLASH ZONE', 0.3, alpha(C.navy, 0.6));
      // Popcorn, everywhere.
      if (Q.detail) {
        const bits = [[9.2, 5.6], [11.1, 9.9], [11.3, 12.2], [13, 7.1], [13.1, 13.5], [8.6, 13.4], [15.2, 7.6], [15.5, 5.2], [10.9, 5.8], [12.8, 10.2], [9.1, 7.2], [14.9, 9.1], [11, 14.4], [13.3, 6.2]];
        for (const [x, y] of bits) disc(ctx, x, y, 0.01, 0.06, C.butter, { lw: 0.012 });
      }
    });
    // The slime that missed, piling up on the mat from 10am (a step: it only
    // changes when a new splat lands).
    const splats = [[8.0, 9.1], [8.6, 11.9], [7.7, 10.4], [9.0, 9.9], [8.2, 12.3], [7.6, 11.4]];
    const landed = (w) => (w < 56 ? 0 : Math.min(splats.length, Math.floor((w - 56) / 4) + 1));
    R.rug((ctx, t) => {
      const n = landed(wrap(t));
      for (let i = 0; i < n; i++) {
        const [x, y] = splats[i];
        onFloor(ctx, x, y, 0.012, (c) => {
          c.beginPath();
          for (let j = 0; j < 10; j++) { const a = (j / 10) * Math.PI * 2, r = j % 2 ? 0.14 : 0.24; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
          c.closePath();
          paint(c, INK.queasyGreen, { lw: 0.02 });
        });
      }
    }, { anim: true, step: (t) => landed(wrap(t)) });

    // ---------- The walls ----------
    R.decor((ctx) => {
      // The backdrop behind the stage: a star cloth, and the billing.
      onLeft(ctx, ARCH.y0, 0, ARCH.y1 - ARCH.y0, 5.6, C.navy, { dots: C.purple, density: 0.3 });
      if (Q.detail) {
        const stars = [[3.4, 3.2], [4.6, 1.8], [5.8, 4.1], [7.4, 2.2], [9.9, 4.2], [11.2, 1.9], [12.6, 3.6], [13.8, 2.4], [8.6, 4.6], [4.1, 4.8], [13.2, 4.8], [6.4, 1.5]];
        ctx.fillStyle = MAT.carpetGold;
        for (const [y, z] of stars) {
          const [X, Y] = P(0, y, z);
          ctx.beginPath();
          for (let j = 0; j < 10; j++) { const a = (j / 10) * Math.PI * 2 - Math.PI / 2, r = j % 2 ? 0.07 : 0.17; ctx.lineTo(X + Math.cos(a) * r, Y + Math.sin(a) * r - (Math.cos(a) * r) * 0.5); }
          ctx.fill();
        }
        paintText(ctx, 'left', 8.5, 3.05, 'THE GREAT GARY', 0.62, MAT.carpetGold);
        // "and Flopsy", with a strip of paper over it.
        paintText(ctx, 'left', 8.5, 2.4, 'AND FLOPSY', 0.4, tint(MAT.carpetGold, 0.2));
        onLeft(ctx, 7.1, 2.25, 2.8, 0.34, C.white, { lw: 0.02 });
        paintText(ctx, 'left', 8.5, 2.42, 'SOLO SHOW', 0.26, C.ink, 'Rethink Sans');
      }
      // The wing, stage left: the stage door and a fuse box.
      onLeft(ctx, 0.4, 0, 1.5, 3.4, shade(MAT.carpetRed, 0.3), { lw: 0.04 });
      if (Q.detail) paintText(ctx, 'left', 1.15, 2.9, 'STAGE DOOR', 0.16, C.white, 'Rethink Sans');
      // Round the near end: an old poster, from when there was a rabbit.
      onLeft(ctx, 15.0, 1.4, 0.9, 1.4, INK.sunYellow, { lw: 0.04, dots: shade(INK.sunYellow, 0.3), density: 0.15 });
      if (Q.detail) {
        paintText(ctx, 'left', 15.45, 2.5, 'GARY', 0.2, INK.funnelRed);
        paintText(ctx, 'left', 15.45, 2.2, '+ RABBIT', 0.14, C.ink, 'Rethink Sans');
        paintText(ctx, 'left', 15.45, 1.75, 'DAY 1', 0.12, C.ink, 'Rethink Sans');
      }

      // The far wall. The wing's pinrail and its ropes.
      onRight(ctx, 3.6, 2.2, 3.2, 0.14, MAT.teakDark, { lw: 0.03 });
      if (Q.detail) {
        ctx.lineWidth = 0.03; ctx.strokeStyle = MAT.canvas;
        for (let i = 0; i < 7; i++) {
          const x = 3.8 + i * 0.45;
          const [A, B] = P(x, 0.02, 2.3), [E, F] = P(x, 0.02, 5.9), [G, H] = P(x + 0.1, 0.02, 1.5);
          ctx.beginPath(); ctx.moveTo(E, F); ctx.lineTo(A, B); ctx.quadraticCurveTo(G + 0.1, H, A + 0.12, B + 0.1); ctx.stroke();
        }
      }
      // Where a lifebuoy should be.
      if (Q.detail) {
        const [X, Y] = P(7.1, 0.02, 3.1);
        ctx.save(); ctx.translate(X, Y); ctx.transform(1, 0.5, 0, 1, 0, 0);
        ctx.setLineDash([0.08, 0.07]);
        ctx.beginPath(); ctx.arc(0, 0, 0.42, 0, Math.PI * 2); ctx.strokeStyle = C.white; ctx.lineWidth = 0.035; ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        paintText(ctx, 'right', 7.1, 2.45, 'LIFEBUOY', 0.14, C.white, 'Rethink Sans');
      }
      // Today in the theater.
      onRight(ctx, 7.8, 2.0, 2.3, 2.7, C.ink, { lw: 0.04 });
      onRight(ctx, 7.9, 2.1, 2.1, 2.5, C.navy, { stroke: false });
      if (Q.detail) {
        paintText(ctx, 'right', 8.95, 4.3, 'TODAY', 0.3, INK.sunYellow);
        const bill = [['8AM  THE GREAT GARY', C.white], ['10AM  SLIME TIME (KIDS)', INK.queasyGreen], ['NOON  THE GREAT GARY', C.white], ['3PM  BINGO WITH KELLY', INK.sunYellow], ['5PM  THE GREAT GARY', C.white]];
        bill.forEach(([s, col], i) => paintText(ctx, 'right', 8.95, 3.8 - i * 0.32, s, 0.15, col, 'Rethink Sans'));
        paintText(ctx, 'right', 8.95, 2.25, '(RABBIT NOT INCLUDED)', 0.12, INK.flamingo, 'Rethink Sans');
      }
      // Over the booth, the house rule.
      onRight(ctx, 14.25, 4.3, 1.6, 0.8, C.white, { lw: 0.03 });
      if (Q.detail) {
        paintText(ctx, 'right', 15.05, 4.85, 'NO FLASH', 0.18, C.ink, 'Rethink Sans');
        paintText(ctx, 'right', 15.05, 4.55, 'THE RABBIT IS SHY', 0.12, C.ink, 'Rethink Sans');
      }
    });

    // ---------- The stage ----------
    // One piece from the stern to the footlights: teak boards, a red velvet
    // skirt with a gold edge, and steps down at the far end.
    R.rug((ctx) => {
      box(ctx, 0, ST.y0, 0, ST.x1, ST.y1 - ST.y0, ST.h, INK.teak, { left: shade(MAT.carpetRed, 0.18), right: MAT.carpetRed, top: INK.teak, dens: 0.3 });
      if (Q.detail) {
        ctx.beginPath();
        for (let y = ST.y0 + 0.55; y < ST.y1; y += 0.55) { const a = P(0, y, ST.h), b = P(ST.x1, y, ST.h); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
        ctx.strokeStyle = alpha(MAT.teakDark, 0.6); ctx.lineWidth = 0.025; ctx.stroke();
        // The skirt's folds, and its gold edge.
        ctx.beginPath();
        for (let y = ST.y0 + 0.4; y < ST.y1; y += 0.5) { const a = P(ST.x1, y, 0.05), b = P(ST.x1, y, 0.85); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
        for (let x = 0.4; x < ST.x1; x += 0.5) { const a = P(x, ST.y1, 0.05), b = P(x, ST.y1, 0.85); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
        ctx.strokeStyle = shade(MAT.carpetRed, 0.35); ctx.lineWidth = 0.03; ctx.stroke();
      }
      face(ctx, [[ST.x1, ST.y0, 0.92], [ST.x1, ST.y1, 0.92], [ST.x1, ST.y1, 1], [ST.x1, ST.y0, 1]], MAT.carpetGold, { lw: 0.02 });
      face(ctx, [[0, ST.y1, 0.92], [ST.x1, ST.y1, 0.92], [ST.x1, ST.y1, 1], [0, ST.y1, 1]], shade(MAT.carpetGold, 0.1), { lw: 0.02 });
      // Tape marks: where Gary stands, and where the rabbit used to.
      if (Q.detail) {
        for (const [x, y, c] of [[GARY[0] + 0.5, GARY[1], C.white], [GARY[0] + 0.2, GARY[1] + 1.2, INK.flamingo]]) {
          face(ctx, [[x - 0.2, y, 1.005], [x + 0.2, y, 1.005]], null, { lw: 0.06, stroke: c });
          face(ctx, [[x, y - 0.2, 1.005], [x, y + 0.2, 1.005]], null, { lw: 0.06, stroke: c });
        }
      }
      floorText(ctx, GARY[0] + 0.25, GARY[1] + 1.65, 'RABBIT', 0.14, alpha(INK.flamingo, 0.9));
    });
    // Steps down, at the far end.
    R.thing(8, ST.y0 + 1, (ctx) => {
      for (let i = 0; i < 3; i++) box(ctx, 7 + i * 0.33, ST.y0 + 0.1, 0, 0.34, 0.9, ST.h - i * 0.33, MAT.carpetRed, { top: shade(MAT.carpetRed, 0.1), lw: 0.03 });
    });
    // The footlights: little brass hoods along the front.
    const FOOT = [];
    for (let y = 3.7; y < 13.8; y += 1.15) FOOT.push(y);
    R.thing(ST.x1, ST.y1 - 0.2, (ctx) => {
      for (const y of FOOT) {
        const [X, Y] = P(6.8, y, 1);
        ctx.beginPath(); ctx.ellipse(X, Y - 0.08, 0.22, 0.13, 0, Math.PI, 0); ctx.closePath();
        paint(ctx, MAT.brass, { lw: 0.025 });
        ctx.beginPath(); ctx.ellipse(X - 0.04, Y - 0.06, 0.1, 0.05, 0, 0, Math.PI * 2); ctx.fillStyle = C.butter; ctx.fill();
      }
    }, { depth: 6.9 + ST.y0 });

    // The arch: gilt pillars, a header with the ship's crest, red drapes tied
    // back, a scalloped valance. It stands at the back of the stage, so it
    // frames the act without ever hiding it.
    R.thing(ARCH.x1, ARCH.y1 + 0.6, (ctx) => {
      const { x0, x1, y0, y1, top, under } = ARCH;
      const gold = MAT.carpetGold;
      // The drapes, behind the pillars.
      for (const [a, b, s] of [[y0 + 0.55, y0 + 1.7, 1], [y1 - 1.7, y1 - 0.55, -1]]) {
        const pts = [[x1 + 0.1, a, under], [x1 + 0.1, b, under]];
        const mid = s > 0 ? a : b;
        pts.push([x1 + 0.1, s > 0 ? b - 0.6 : a + 0.6, 2.4], [x1 + 0.1, mid + s * 0.35, 1.9], [x1 + 0.1, mid, 1]);
        face(ctx, pts, MAT.carpetRed, { lw: 0.04, dots: shade(MAT.carpetRed, 0.5), density: 0.2 });
        if (Q.detail) {
          ctx.beginPath();
          for (let i = 1; i < 4; i++) { const yy = a + ((b - a) * i) / 4; const [A, B] = P(x1 + 0.1, yy, under - 0.1), [E, F] = P(x1 + 0.1, mid + (yy - mid) * 0.3, 2.2); ctx.moveTo(A, B); ctx.lineTo(E, F); }
          ctx.strokeStyle = shade(MAT.carpetRed, 0.35); ctx.lineWidth = 0.03; ctx.stroke();
          const [X, Y] = P(x1 + 0.12, mid + s * 0.4, 2.3);
          ctx.beginPath(); ctx.ellipse(X, Y, 0.12, 0.06, 0.4, 0, Math.PI * 2); paint(ctx, gold, { lw: 0.02 });
        }
      }
      // The pillars and the header.
      for (const y of [y0, y1 - 0.6]) box(ctx, x0, y, ST.h, x1 - x0, 0.6, top - ST.h, gold, { top: tint(gold, 0.25), dens: 0.3 });
      box(ctx, x0, y0, under, x1 - x0, y1 - y0, top - under, gold, { top: tint(gold, 0.25), dens: 0.25 });
      // The valance: a scalloped red swag under the header.
      ctx.beginPath();
      const n = 10;
      const [sx, sy] = P(x1 + 0.02, y0 + 0.6, under);
      ctx.moveTo(sx, sy);
      for (let i = 0; i < n; i++) {
        const ya = y0 + 0.6 + ((y1 - y0 - 1.2) * i) / n, yb = y0 + 0.6 + ((y1 - y0 - 1.2) * (i + 1)) / n;
        const [MX, MY] = P(x1 + 0.02, (ya + yb) / 2, under - 0.75), [BX, BY] = P(x1 + 0.02, yb, under);
        ctx.quadraticCurveTo(MX, MY, BX, BY);
      }
      ctx.closePath();
      paint(ctx, MAT.carpetRed, { lw: 0.035, dots: shade(MAT.carpetRed, 0.5), density: 0.15 });
      // The crest: a gold oval with a B on it.
      if (Q.detail) {
        const [X, Y] = P(x1 + 0.01, (y0 + y1) / 2, (under + top) / 2 + 0.05);
        ctx.beginPath(); ctx.ellipse(X, Y, 0.45, 0.42, 0, 0, Math.PI * 2); paint(ctx, INK.funnelRed, { lw: 0.03 });
        label(ctx, x1 + 0.01, (y0 + y1) / 2, (under + top) / 2 - 0.02, 'B', 0.5, gold);
      }
    });
    // The bulbs round the arch, chasing.
    const BULBS = [];
    for (let z = ST.h + 0.5; z < ARCH.top - 0.2; z += 0.55) { BULBS.push([ARCH.x1 + 0.02, ARCH.y0 + 0.3, z]); BULBS.push([ARCH.x1 + 0.02, ARCH.y1 - 0.3, z]); }
    for (let y = ARCH.y0 + 0.9; y < ARCH.y1 - 0.6; y += 0.6) BULBS.push([ARCH.x1 + 0.02, y, ARCH.under + 0.35]);
    R.thing(ARCH.x1 + 0.01, ARCH.y1 + 0.61, (ctx, t) => {
      const step = Math.floor(t * 5);
      BULBS.forEach(([x, y, z], i) => {
        const on = (i + step) % 3 !== 0;
        const [X, Y] = P(x, y, z);
        ctx.beginPath(); ctx.arc(X, Y, 0.075, 0, Math.PI * 2);
        ctx.fillStyle = on ? C.butter : shade(MAT.carpetGold, 0.3); ctx.fill();
      });
    }, { anim: true });

    // ---------- On the stage ----------
    // The pile: everything that came out of the hat today that wasn't a
    // rabbit, and a card saying so.
    R.thing(PILE[0] + 0.5, PILE[1] + 0.5, (ctx, t) => {
      const w = wrap(t), n = Math.min(piled(w), 18);
      const [X, Y] = P(PILE[0], PILE[1], ST.h);
      if (Q.detail) { ctx.beginPath(); ctx.ellipse(X, Y, 0.55 + n * 0.02, 0.25, 0, 0, Math.PI * 2); ctx.fillStyle = alpha(C.ink, 0.15); ctx.fill(); }
      for (let i = 0; i < n; i++) {
        const row = i < 6 ? 0 : i < 11 ? 1 : i < 15 ? 2 : 3;
        const inRow = [0, 6, 11, 15][row], per = [6, 5, 4, 3][row];
        const col = i - inRow;
        const dx = (col - (per - 1) / 2) * 0.26 + (row % 2) * 0.08;
        ctx.save();
        ctx.translate(X + dx, Y - 0.05 - row * 0.18);
        ctx.rotate(((i * 37) % 7 - 3) * 0.2);
        THINGS[pileItem(i, w)](ctx);
        ctx.restore();
      }
      // The card, on a stick.
      const [A, B] = P(PILE[0] - 0.2, PILE[1] - 0.45, ST.h);
      ctx.beginPath(); ctx.moveTo(A, B); ctx.lineTo(A, B - 1.1); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.04; ctx.stroke();
      ctx.beginPath(); ctx.rect(A - 0.42, B - 1.45, 0.84, 0.38); paint(ctx, C.white, { lw: 0.025 });
      small(ctx, PILE[0] - 0.2, PILE[1] - 0.45, ST.h + 1.2, 'NOT RABBITS', 0.12);
    }, { anim: true });

    // The magic table: a purple cloth to the floor, a deck of cards, a
    // glass of water with a wand in it.
    R.thing(3.2, 8.8, (ctx) => {
      cylinder(ctx, 2.8, 8.4, ST.h, 0.5, 0.95, C.purple, { top: tint(C.purple, 0.2) });
      if (Q.detail) {
        const [X, Y] = P(2.8, 8.4, ST.h + 0.95);
        ctx.fillStyle = MAT.carpetGold;
        for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(X - 0.5 + i * 0.25, Y + 0.45 + Math.sin(i) * 0.1, 0.04, 0, Math.PI * 2); ctx.fill(); }
      }
      box(ctx, 2.6, 8.15, ST.h + 0.95, 0.22, 0.32, 0.06, C.white, { flat: true, lw: 0.02 });
      cylinder(ctx, 3.0, 8.55, ST.h + 0.95, 0.08, 0.22, alpha(MAT.glass, 0.9), { flat: true });
      face(ctx, [[3.0, 8.55, ST.h + 1.05], [3.1, 8.5, ST.h + 1.5]], null, { lw: 0.05 });
    });
    // Flopsy's hutch, door wide open, and the carrot left out for it.
    const HX = 4.7, HY = 8.9;
    R.thing(HX + 0.75, HY + 0.75, (ctx) => {
      box(ctx, HX, HY, ST.h, 0.7, 0.7, 0.6, INK.teak, { top: tint(INK.teak, 0.2) });
      if (Q.detail) {
        ctx.beginPath();
        for (let i = 1; i < 5; i++) { const [A, B] = P(HX + 0.7, HY + i * 0.14, ST.h + 0.08), [E, F] = P(HX + 0.7, HY + i * 0.14, ST.h + 0.52); ctx.moveTo(A, B); ctx.lineTo(E, F); }
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02; ctx.stroke();
      }
      // The door, swung open toward the audience.
      face(ctx, [[HX + 0.7, HY + 0.7, ST.h + 0.06], [HX + 1.05, HY + 1.05, ST.h + 0.06], [HX + 1.05, HY + 1.05, ST.h + 0.5], [HX + 0.7, HY + 0.7, ST.h + 0.5]], alpha(MAT.chrome, 0.7), { lw: 0.02 });
      board(ctx, 'y', HX + 0.71, HY + 0.35, ST.h + 0.72, 0.5, 0.16, 'FLOPSY', { board: MAT.brass, size: 0.09, edge: 0.015 });
      face(ctx, [[HX + 0.9, HY + 0.25, ST.h + 0.03], [HX + 1.25, HY + 0.3, ST.h + 0.03]], null, { lw: 0.09, stroke: C.coral });
      face(ctx, [[HX + 1.25, HY + 0.3, ST.h + 0.03], [HX + 1.38, HY + 0.28, ST.h + 0.08]], null, { lw: 0.05, stroke: C.leaf });
    });

    // The assistant, sawn in half at the 8am show. Gary is looking for the
    // other half of the trick.
    R.thing(4.45, 13.6, (ctx) => {
      for (const x of [2.3, 3.9]) {
        box(ctx, x, 12.9, ST.h, 0.12, 0.6, 0.55, MAT.teakDark, { flat: true, lw: 0.02 });
      }
      box(ctx, 2.05, 12.85, ST.h + 0.55, 2.35, 0.7, 0.62, C.purple, { top: tint(C.purple, 0.25), dotsL: MAT.carpetGold, dens: 0.25 });
      // The saw, stuck in the middle.
      face(ctx, [[3.2, 12.75, ST.h + 1.1], [3.2, 13.65, ST.h + 1.1], [3.2, 13.65, ST.h + 1.5], [3.2, 12.75, ST.h + 1.3]], MAT.chrome, { lw: 0.025 });
      face(ctx, [[3.2, 13.65, ST.h + 1.3], [3.2, 13.95, ST.h + 1.3], [3.2, 13.95, ST.h + 1.6], [3.2, 13.65, ST.h + 1.6]], MAT.teakDark, { lw: 0.025 });
      lettering(ctx, 'x', 2.75, 13.56, ST.h + 0.86, 'BACK AFTER', 0.12, C.white);
      lettering(ctx, 'x', 2.75, 13.56, ST.h + 0.7, 'LUNCH', 0.12, C.white);
    });
    // Tap the box: her feet kick.
    const legs = R.poke({ id: 'assistant', at: [3.2, 13.2, 2.0], r: 0.9, hold: 1.4, say: ['Gary. My legs.', 'Still in half.', 'I want a raise.'] });
    R.thing(4.5, 13.7, (ctx, t) => {
      // Her head out of one end, her feet out of the other, wiggling.
      const [HX, HY] = P(1.95, 13.2, ST.h + 0.86);
      ctx.beginPath(); ctx.arc(HX, HY, 0.24, 0, Math.PI * 2); paint(ctx, SKIN[1], { lw: 0.03 });
      ctx.beginPath(); ctx.arc(HX + 0.02, HY - 0.08, 0.26, Math.PI * 1.1, Math.PI * 1.95); ctx.lineTo(HX - 0.1, HY - 0.02); ctx.fillStyle = HAIR[3]; ctx.fill();
      if (Q.detail) { ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(HX + 0.06, HY + 0.02, 0.03, 0, Math.PI * 2); ctx.arc(HX + 0.16, HY + 0.02, 0.03, 0, Math.PI * 2); ctx.fill(); }
      const lk = legs.k(); // tapped: she kicks
      const wig = Math.sin(t * (5 + 7 * lk)) * (0.25 + 0.3 * lk);
      for (const [dy, ph] of [[-0.14, 0], [0.14, 1.2]]) {
        local(ctx, 4.45, 13.2 + dy, ST.h + 0.86, 1, (c) => {
          c.rotate(-0.6 + wig * Math.sin(t * 3 + ph));
          c.beginPath(); c.ellipse(0.12, 0, 0.16, 0.08, 0, 0, Math.PI * 2); paint(c, INK.flamingo, { lw: 0.025 });
        });
      }
      const w = wrap(t);
      if (Q.detail && pulse(w, 45) > 0.5 && pulse(w, 45) < 0.6) speech(ctx, 1.95, 13.2, ST.h + 1.6, 'Gary. My legs.', { size: 0.34 });
    }, { anim: true });

    // ---------- The Great Gary ----------
    const GARY_LOOK = { skin: SKIN[0], hair: HAIR[0], style: 'short', top: C.purple, bottom: C.ink, hat: 'none' };
    // Tap the hat: something comes out, a different thing each time, never
    // a rabbit. (The one a first visit is nudged to try.)
    const hat = R.poke({ id: 'hat', at: HAT, r: 0.8, hold: 1.4, teach: true, sound: 'pop', say: POP_SAY });
    R.thing(GARY[0], GARY[1], (ctx, t) => {
      const w = wrap(t);
      const a = act(w);
      // The wand arm (near), the hat arm (far).
      let aA = 0.4, aB = 1.25, lean = 0;
      if (a.stage === 'wave') aA = 1.9 + Math.sin(t * 9) * 0.35;
      else if (a.stage === 'reach') aA = 1.9 - a.k * 0.6;
      else if (a.stage === 'pull') aA = 1.3 + a.k * 1.5;
      else if (a.stage === 'show') aA = a.pigeon ? 1.3 : 2.8;
      else if (a.stage === 'toss') aA = 2.8 - a.k * 1.6;
      else { aA = 0.5; lean = Math.sin(clamp(a.k * 2) * Math.PI) * 0.35; }
      const f = 1;
      const [X, Y] = P(GARY[0], GARY[1], ST.h);
      ctx.save();
      ctx.translate(X, Y); ctx.rotate(lean); ctx.translate(-X, -Y);
      // The cape, behind him.
      local(ctx, GARY[0], GARY[1], ST.h, f, (c) => {
        c.beginPath(); c.moveTo(-0.26, -1.62); c.lineTo(-0.62, -0.25); c.quadraticCurveTo(-0.3, -0.12, -0.05, -0.3); c.lineTo(-0.05, -1.62); c.closePath();
        paint(c, INK.funnelRed, { lw: 0.03, dots: shade(INK.funnelRed, 0.4), density: 0.12 });
      });
      person(ctx, GARY[0], GARY[1], ST.h, {
        ...GARY_LOOK, pose: 'stand', dir: 'r', arms: [aA, aB],
        wear(c, b) { // a bow tie and a white shirt front
          c.fillStyle = C.white; c.fillRect(0.02, b.top + 0.02, 0.2, 0.45);
          c.fillStyle = INK.funnelRed; c.beginPath(); c.moveTo(0.04, b.top + 0.02); c.lineTo(0.2, b.top + 0.1); c.lineTo(0.2, b.top - 0.04); c.closePath(); c.fill();
        },
        face(c, hy) { // the moustache
          c.beginPath(); c.ellipse(0.2, hy + 0.14, 0.13, 0.045, 0.15, 0, Math.PI * 2); c.fillStyle = C.ink; c.fill();
        },
      }, t);
      local(ctx, GARY[0], GARY[1], ST.h, f, (c) => {
        // The hat, upside down in his far hand.
        const [hx, hy] = hand(aB, true);
        c.beginPath(); c.rect(hx - 0.2, hy - 0.08, 0.4, 0.42); paint(c, C.black, { lw: 0.03 });
        c.fillStyle = INK.funnelRed; c.fillRect(hx - 0.2, hy + 0.0, 0.4, 0.07);
        c.beginPath(); c.ellipse(hx, hy - 0.08, 0.3, 0.09, 0, 0, Math.PI * 2); paint(c, C.black, { lw: 0.03 });
        c.beginPath(); c.ellipse(hx, hy - 0.08, 0.19, 0.055, 0, 0, Math.PI * 2); c.fillStyle = shade(C.purple, 0.5); c.fill();
        // What a tap pulled out, popping up out of it.
        const hk = hat.k();
        if (hk > 0) {
          c.save();
          c.translate(hx, hy - 0.15 - 0.75 * hk);
          c.rotate(Math.sin(t * 7) * 0.15);
          c.scale(1.4, 1.4);
          THINGS[POP[(hat.taps + POP.length - 1) % POP.length]](c);
          c.restore();
          if (Q.detail) {
            c.fillStyle = INK.sunYellow;
            for (let i = 0; i < 5; i++) { const a = i * 1.26 + t * 2; c.beginPath(); c.arc(hx + Math.cos(a) * 0.45 * hk, hy - 0.5 * hk + Math.sin(a) * 0.3 * hk, 0.04, 0, Math.PI * 2); c.fill(); }
          }
        }
        // The wand, in the near hand.
        const [wx, wy] = hand(aA);
        const ang = aA + Math.PI;
        const ex = wx + Math.sin(aA) * 0.45, ey = wy + Math.cos(aA) * 0.45;
        c.beginPath(); c.moveTo(wx, wy); c.lineTo(ex, ey); c.lineCap = 'butt';
        c.strokeStyle = C.ink; c.lineWidth = 0.09; c.stroke();
        c.beginPath(); c.moveTo(wx + Math.sin(aA) * 0.33, wy + Math.cos(aA) * 0.33); c.lineTo(ex, ey); c.strokeStyle = C.white; c.lineWidth = 0.05; c.stroke();
        void ang;
        // What came out: rising from the hat, then held up, then thrown.
        if (a.item !== 'pigeon') {
          let px = null, py = null;
          if (a.stage === 'pull') { px = hx; py = hy - 0.15 - a.k * 0.4; }
          else if (a.stage === 'show') { const [ix, iy] = hand(aA); px = ix; py = iy - 0.2; }
          if (px != null) { c.save(); c.translate(px, py); THINGS[a.item](c); c.restore(); }
          // Sparkles over the hat while the wand works.
          if (a.stage === 'wave' && Q.detail) {
            particles(t, 6, 0.8, (k, r) => {
              const sx = hx + (r() - 0.5) * 0.6, sy = hy - 0.2 - k * 0.6;
              c.fillStyle = alpha(INK.sunYellow, 1 - k);
              c.beginPath(); c.arc(sx, sy, 0.05 * (1 - k) + 0.02, 0, Math.PI * 2); c.fill();
            }, 5);
          }
        }
      });
      ctx.restore();
      // The toss, in an arc to the pile.
      if (a.stage === 'toss' && a.item !== 'pigeon') {
        const [hx, hy] = hand(2.8 - 0.2);
        const [S0, S1] = [X + hx, Y + hy];
        const [E0, E1] = P(PILE[0], PILE[1], ST.h + 0.25);
        const k = a.k;
        ctx.save();
        ctx.translate(S0 + (E0 - S0) * k, S1 + (E1 - S1) * k - Math.sin(k * Math.PI) * 1.0);
        ctx.rotate(k * 6);
        THINGS[a.item](ctx);
        ctx.restore();
      }
      if (!Q.detail) return;
      if (a.stage === 'show' && !a.pigeon && a.n % 2 === 0) speech(ctx, GARY[0], GARY[1], ST.h + 3.2, LINES[a.item], { size: 0.36 });
      if (a.pigeon && a.s > 3.5 && a.s < 7.5) speech(ctx, GARY[0], GARY[1], ST.h + 3.2, 'Ta... da?', { size: 0.36 });
      if (a.stage === 'bow' && a.k < 0.4 && !a.pigeon) small(ctx, GARY[0] + 0.6, GARY[1] - 0.6, ST.h + 2.9, 'ta-da', 0.2, INK.sunYellow);
    }, { anim: true });

    // The pigeon, and after 9am, the pigeon on the arch for good.
    R.air((ctx, t) => {
      const p = pigeonAt(wrap(t));
      if (p) pigeon(ctx, p.p[0], p.p[1], p.p[2], t, { fly: p.fly, shock: p.shock, dir: p.dir });
    });

    // ---------- The kids' show, 10am ----------
    // The slime table: glitter tubs, a bucket of glue, a spare hat, a wand,
    // a mixing bowl and the day's tub of slime.
    const tub = (ctx, x, y, lid, word, date) => {
      cylinder(ctx, x, y, TABLE.top, 0.17, 0.26, C.white, { top: lid });
      if (!Q.detail) return;
      const [X, Y] = P(x, y, TABLE.top + 0.13);
      ctx.fillStyle = lid; ctx.fillRect(X - 0.2, Y - 0.07, 0.4, 0.14);
      ctx.save();
      ctx.font = '700 0.1px "Rethink Sans", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = C.ink; ctx.fillText(word, X, Y + 0.005);
      if (date) { ctx.font = '700 0.07px "Rethink Sans", sans-serif'; ctx.fillText(date, X, Y + 0.12); }
      ctx.restore();
    };
    R.thing(TABLE.x1, TABLE.y1, (ctx) => {
      const { x0, x1, y0, y1, top } = TABLE;
      for (const [lx, ly] of [[x0 + 0.1, y1 - 0.2], [x1 - 0.2, y1 - 0.2], [x1 - 0.2, y0 + 0.1]]) box(ctx, lx, ly, ST.h, 0.1, 0.1, top - ST.h - 0.08, C.ink, { flat: true, stroke: false });
      box(ctx, x0, y0, top - 0.08, x1 - x0, y1 - y0, 0.08, C.white, { top: tint(C.sky, 0.5), lw: 0.03 });
      // The table's banner.
      face(ctx, [[x1, y0 + 0.05, top - 0.08], [x1, y1 - 0.05, top - 0.08], [x1, y1 - 0.05, top - 0.42], [x1, y0 + 0.05, top - 0.42]], INK.sunYellow, { lw: 0.02 });
      lettering(ctx, 'y', x1 + 0.01, (y0 + y1) / 2, top - 0.25, 'SLIME TIME!', 0.16, C.ink);
      // Along the back: the glitter tubs, and the bowl.
      tub(ctx, 4.2, 11.05, C.sky, 'BLUE');
      tub(ctx, 4.2, 11.5, MAT.carpetGold, 'GOLD');
      tub(ctx, 4.2, 11.95, INK.flamingo, 'PINK');
      // The mixing bowl, scraped clean (the day's slime is packed in a trunk).
      disc(ctx, 4.72, 11.5, TABLE.top + 0.02, 0.24, MAT.chrome, { lw: 0.025 });
      disc(ctx, 4.72, 11.5, TABLE.top + 0.04, 0.17, shade(MAT.chrome, 0.15), { stroke: false });
      // The glue, the spare hat and the wand, round the front.
      bucket(ctx, 5.12, 11.0, TABLE.top, { color: C.white, name: 'GLUE' });
      box(ctx, 5.0, 11.65, TABLE.top, 0.3, 0.3, 0.03, C.black, { flat: true, lw: 0.02 });
      cylinder(ctx, 5.15, 11.8, TABLE.top, 0.12, 0.28, C.black, { flat: true });
      face(ctx, [[4.5, 12.0, TABLE.top + 0.02], [4.9, 11.82, TABLE.top + 0.02]], null, { lw: 0.06 });
    });
    // Captain Splat's two trunks, by the table. One is just glitter. The other
    // has the slime kit in it, and it's leaking (the tell).
    const kitBox = R.poke({ id: 'trunk', at: [TRUNKS[0][0] + 0.35, TRUNKS[0][1] + 0.4, 1.6], r: 0.8, sound: 'clunk', say: ['Lime. Fresh.', 'Still lime.'] });
    const glitter = R.poke({ id: 'trunk-2', at: [TRUNKS[1][0] + 0.35, TRUNKS[1][1] + 0.4, 1.6], r: 0.8, sound: 'clunk', say: ['Just glitter.', 'Glitter. Everywhere.'] });
    R.thing(TRUNKS[0][0] + 0.7, TRUNKS[0][1] + 0.8, (ctx, t) => trunk(ctx, TRUNKS[0], kitBox.k(), t, true), { anim: true });
    R.thing(TRUNKS[1][0] + 0.7, TRUNKS[1][1] + 0.8, (ctx, t) => trunk(ctx, TRUNKS[1], glitter.k(), t, false), { anim: true });
    R.find({
      id: 'slime-kit', label: 'A slime kit', kind: 'poke', inside: kitBox, at: [TRUNKS[0][0] + 0.35, TRUNKS[0][1] + 0.4, 1.75], r: 0.7,
      hint: "The kids' show packed up its slime. Something is leaking.",
    });

    // Captain Splat, the kids' entertainer: goggles, lab coat, slimed. Flings
    // a blob at the splash zone every few seconds.
    const KIDSPOT = [[8.3, 9.3], [8.35, 10.5], [8.4, 11.7]];
    R.thing(3.3, 11.4, (ctx, t) => {
      const w = wrap(t);
      const a = within(w, KIDS[0], KIDS[1]);
      if (a <= 0) return;
      const fling = pulse(w, 4, 2);
      ctx.save();
      ctx.globalAlpha *= a;
      person(ctx, 3.3, 11.4, ST.h, {
        skin: SKIN[3], hair: HAIR[5], style: 'curly', top: C.white, bottom: C.teal, dir: 'r',
        arms: fling < 0.25 ? [1.2 + fling * 8, 0.8] : [1.1 + Math.sin(t * 6) * 0.2, 0.9 - Math.sin(t * 6) * 0.2],
        wear(c, b) { for (const [sx, sy] of [[0.1, b.top + 0.3], [-0.15, b.top + 0.55]]) { c.beginPath(); c.arc(sx, sy, 0.07, 0, Math.PI * 2); c.fillStyle = INK.queasyGreen; c.fill(); } },
        face(c, hy) {
          c.beginPath(); c.ellipse(0.17, hy - 0.02, 0.15, 0.09, 0, 0, Math.PI * 2); paint(c, alpha(C.sky, 0.8), { lw: 0.03 });
          c.beginPath(); c.moveTo(0.02, hy - 0.02); c.lineTo(-0.3, hy - 0.06); c.strokeStyle = C.ink; c.lineWidth = 0.04; c.stroke();
        },
      }, t);
      ctx.restore();
      if (!Q.detail || a < 1) return;
      // The blob in flight.
      if (fling >= 0.25 && fling < 0.55) {
        const k = (fling - 0.25) / 0.3;
        const target = KIDSPOT[Math.floor(w / 4) % 3];
        const [A, B] = P(4.3, 11.3, 2.2), [E, F] = P(target[0] - 0.4, target[1], 0.9);
        const [bx, by] = [A + (E - A) * k, B + (F - B) * k - Math.sin(k * Math.PI) * 1.4];
        ctx.beginPath(); ctx.ellipse(bx, by, 0.13, 0.1, k * 3, 0, Math.PI * 2); paint(ctx, INK.queasyGreen, { lw: 0.02 });
      }
      if (w > KIDS[0] + 3 && w < KIDS[0] + 9) speech(ctx, 3.3, 11.4, ST.h + 3.0, 'Who wants slime?', { size: 0.36 });
      if (w > KIDS[0] + 18 && w < KIDS[0] + 23) speech(ctx, 3.3, 11.4, ST.h + 3.0, 'Lime! Made fresh at 10!', { size: 0.36 });
    }, { anim: true });

    // Tyler's beanbag, in the front row's gap (day.js sits him at 10, 10).
    R.thing(10.2, 10, (ctx) => {
      const [X, Y] = P(10, 10, 0);
      ctx.beginPath(); ctx.ellipse(X, Y - 0.18, 0.5, 0.34, 0, 0, Math.PI * 2);
      paint(ctx, C.teal, { lw: 0.03, dots: shade(C.teal, 0.35), density: 0.15 });
      ctx.beginPath(); ctx.ellipse(X - 0.05, Y - 0.3, 0.3, 0.14, 0, 0, Math.PI * 2);
      ctx.fillStyle = tint(C.teal, 0.25); ctx.fill();
    }, { depth: 19.8 });
    // Beanbags in the splash zone, and the kids on them at 10.
    for (const [[x, y], c] of KIDSPOT.map((p, i) => [p, [INK.sunYellow, INK.flamingo, C.sky][i]])) {
      R.thing(x + 0.2, y, (ctx) => {
        const [X, Y] = P(x, y, 0);
        ctx.beginPath(); ctx.ellipse(X, Y - 0.12, 0.45, 0.28, 0, 0, Math.PI * 2);
        paint(ctx, c, { lw: 0.03, dots: shade(c, 0.35), density: 0.15 });
      }, { depth: x + y - 0.2 });
    }
    const KIDSEAT = [
      { seed: 301, look: { top: C.coral, style: 'bun', hat: 'none', hair: HAIR[0] }, sick: null },
      { seed: 302, look: { top: INK.sunYellow, style: 'pony', hair: HAIR[2] }, sick: null, slimed: true },
      { seed: 303, look: { top: C.teal, style: 'curly', hair: HAIR[3], hat: 'none' }, sick: at(10.8) },
    ];
    KIDSEAT.forEach((k, i) => sitter(R, {
      seat: [KIDSPOT[i][0] - 0.05, KIDSPOT[i][1]], z: -0.2, seed: k.seed, sick: k.sick, from: KIDS[0] + i * 0.8, to: KIDS[1] - i * 0.6,
      look: { ...k.look, scale: 0.7 },
      arms: (t, w) => (pulse(w + i * 1.3, 4, 2) > 0.5 && pulse(w + i * 1.3, 4, 2) < 0.7 ? [2.8, -2.6] : [0.7, 0.5]),
      face: k.slimed ? (c, hy) => { c.beginPath(); c.ellipse(0.02, hy - 0.26, 0.28, 0.12, 0, 0, Math.PI * 2); paint(c, INK.queasyGreen, { lw: 0.02 }); c.beginPath(); c.ellipse(-0.18, hy - 0.05, 0.05, 0.12, 0, 0, Math.PI * 2); c.fill(); } : undefined,
    }));

    // ---------- The seats ----------
    for (const [name, row] of Object.entries(ROWS)) {
      row.seats.forEach((y, i) => {
        R.thing(row.x, y, (ctx) => seatBase(ctx, row.x, y), { depth: row.x + y - 0.3 });
        R.thing(row.x + 0.5, y, (ctx) => seatBack(ctx, row.x, y, i + 1), { depth: row.x + y + 0.45 });
      });
      // The row's letter on the end seat, on the aisle.
      R.thing(row.x + 0.5, row.seats[row.seats.length - 1] + 0.5, (ctx) => {
        const y = row.seats[row.seats.length - 1];
        board(ctx, 'x', row.x + 0.1, y + 0.47, 0.95, 0.28, 0.28, name, { board: MAT.brass, size: 0.18, edge: 0.015 });
      }, { depth: row.x + row.seats[row.seats.length - 1] + 0.6 });
    }
    // A seat saved with a towel since 5am, like the loungers upstairs.
    R.thing(ROWS.A.x + 0.1, 11.9, (ctx) => {
      const x = ROWS.A.x, y = 11.9;
      box(ctx, x - 0.33, y - 0.36, 0.58, 0.64, 0.72, 0.05, INK.flamingo, { flat: true, lw: 0.02 });
      if (Q.detail) for (const k of [-0.15, 0.15]) rect(ctx, x - 0.33, y + k, 0.64, 0.07, 0.635, C.white, { stroke: false });
      face(ctx, [[x + 0.29, y - 0.35, 0.65], [x + 0.29, y + 0.35, 0.65], [x + 0.29, y + 0.35, 1.3], [x + 0.29, y - 0.35, 1.3]], INK.flamingo, { lw: 0.02 });
      board(ctx, 'y', x + 0.28, y, 1.05, 0.44, 0.22, 'SAVED', { size: 0.1, edge: 0.015 });
    }, { depth: ROWS.A.x + 11.9 + 0.1 });

    // ---------- The audience ----------
    const MAT0 = MATINEE[0], MAT1 = MATINEE[1];
    const onStage = (w) => { const a = act(w); return a.stage === 'bow' && a.k < 0.35; };
    const clap = (t, w) => (onStage(w) ? [1.3 + Math.sin(t * 16) * 0.35, 1.1 - Math.sin(t * 16) * 0.35] : [0.5, 0.3]);
    const tubOfCorn = (c) => { c.beginPath(); c.moveTo(0.42, -1.25); c.lineTo(0.72, -1.25); c.lineTo(0.66, -0.9); c.lineTo(0.48, -0.9); c.closePath(); paint(c, INK.funnelRed, { lw: 0.025 }); c.fillStyle = C.white; c.fillRect(0.5, -1.2, 0.04, 0.28); c.fillRect(0.6, -1.2, 0.04, 0.28); c.beginPath(); c.arc(0.51, -1.3, 0.07, 0, Math.PI * 2); c.arc(0.63, -1.32, 0.08, 0, Math.PI * 2); c.fillStyle = C.butter; c.fill(); };
    // The date: Dennis, with the popcorn, green by half past nine.
    sitter(R, {
      seat: [ROWS.A.x, 8.1], seed: 211, sick: at(9.7), look: { style: 'short', top: C.teal },
      arms: (t, w) => (w < at(9.7) && pulse(w, 5) < 0.3 ? [0.9, 0.6] : [0.7, 0.5]),
      prop: (c, t, w) => { if (w < at(9.9)) tubOfCorn(c); },
    });
    sitter(R, {
      seat: [ROWS.A.x, 9.05], seed: 212, look: { dress: true, style: 'long', top: INK.flamingo },
      arms: (t, w) => (w > at(9.9) ? [1.2, 0.4] : pulse(w + 2, 5) < 0.3 ? [1.6, 0.5] : [0.5, 0.4]),
      prop: (c, t, w) => { if (w > at(9.9)) tubOfCorn(c); },
      say: (w) => (w > at(9.9) && w < at(10.2) ? 'More for me, Dennis.' : null),
    });
    // Filming the whole show on his phone, at arm's length.
    sitter(R, {
      seat: [ROWS.A.x, 12.85], seed: 213, sick: at(10.4), look: { style: 'bald', top: INK.sunYellow },
      arms: () => [2.3, 0.6],
      prop: (c, t) => {
        const [hx, hy] = hand(2.3);
        c.beginPath(); c.roundRect(hx - 0.1, hy - 0.2, 0.2, 0.3, 0.03); paint(c, C.ink, { lw: 0.02 });
        c.fillStyle = Math.sin(t * 3) > 0.9 ? C.white : C.sky; c.fillRect(hx - 0.07, hy - 0.17, 0.14, 0.23);
      },
    });
    // Knitting a scarf that gets longer all day.
    sitter(R, {
      seat: [ROWS.B.x, 12.85], seed: 214, sick: at(10.7), look: { style: 'bun', hair: HAIR[4], top: C.lilac, dress: true },
      arms: (t) => [1.1 + Math.sin(t * 8) * 0.12, 0.9 - Math.sin(t * 8) * 0.12],
      prop: (c, t, w) => {
        const [hx, hy] = hand(1.1);
        // It hangs from the needles to the floor, and the rest runs off
        // along the floor beside her seat (along y: a unit there is (1, 0.5)
        // in her mirrored units).
        const len = 0.3 + (w / 240) * 2.2;
        c.lineCap = 'butt';
        const drop = Math.min(len, -hy);
        const pts = [[hx, hy], [hx + 0.04, hy + drop]];
        const rest = (len - drop) / 1.12;
        if (rest > 0) pts.push([hx + 0.04 + rest, hy + drop + rest * 0.5]);
        c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
        c.strokeStyle = C.ink; c.lineWidth = 0.17; c.stroke();
        c.strokeStyle = INK.funnelRed; c.lineWidth = 0.12; c.stroke();
        c.setLineDash([0.06, 0.08]); c.strokeStyle = INK.sunYellow; c.stroke(); c.setLineDash([]);
        c.strokeStyle = MAT.chrome; c.lineWidth = 0.03;
        c.beginPath(); c.moveTo(hx - 0.1, hy - 0.2); c.lineTo(hx + 0.12, hy + 0.1); c.moveTo(hx + 0.1, hy - 0.22); c.lineTo(hx - 0.08, hy + 0.12); c.stroke();
      },
    });
    // Asleep since the 8am show. Sleeps through the pigeon and through bingo.
    sitter(R, {
      seat: [ROWS.C.x, 5.9], seed: 215, look: { style: 'bald', top: C.navy, hair: HAIR[4] },
      arms: () => [0.3, 0.2],
      face: (c, hy, t) => {
        c.beginPath(); c.arc(0.17, hy + 0.02, 0.1, 0, Math.PI * 2); c.fillStyle = SKIN[5]; c.fill();
        c.strokeStyle = C.ink; c.lineWidth = 0.025;
        c.beginPath(); c.moveTo(0.06, hy + 0.03); c.lineTo(0.13, hy + 0.03); c.moveTo(0.2, hy + 0.03); c.lineTo(0.27, hy + 0.03); c.stroke();
        c.beginPath(); c.arc(0.18, hy + 0.16, 0.035 + Math.abs(Math.sin(t)) * 0.02, 0, Math.PI * 2); c.fillStyle = C.ink; c.fill();
        // His newspaper, on his lap.
        c.beginPath(); c.rect(0.25, -1.0, 0.45, 0.14); paint(c, C.white, { lw: 0.02 });
      },
    });
    R.air((ctx, t) => {
      if (!Q.detail) return;
      const k = (t * 0.5) % 1;
      label(ctx, ROWS.C.x - 0.3 * k, 5.9 - 0.4 * k, 2.4 + k * 1.1, 'z', 0.35 + k * 0.25, alpha(C.ink, 1 - k));
    });
    // A plate from the buffet, heaped, on his lap; green by eleven, and then
    // a bucket turns up in the aisle.
    sitter(R, {
      seat: [ROWS.C.x, 7.7], seed: 216, sick: at(10.9), look: { top: C.coral, hat: 'sun' },
      arms: (t, w) => (w < at(10.9) && pulse(w, 3) < 0.4 ? [1.9, 0.9] : [1.0, 0.9]),
      prop: (c, t, w) => {
        c.save(); c.translate(0.62, -1.05); THINGS.plate(c);
        c.beginPath(); c.arc(0.02, -0.14, 0.08, 0, Math.PI * 2); paint(c, MAT.teakDark, { lw: 0.02 });
        c.restore();
        if (w < at(10.9) && pulse(w, 3) < 0.4) { const [hx, hy] = hand(1.9); c.save(); c.translate(hx, hy - 0.1); c.scale(0.8, 0.8); THINGS.leg(c); c.restore(); }
      },
    });
    R.thing(ROWS.C.x + 0.2, 8.45, (ctx, t) => { if (wrap(t) > at(11.1)) bucket(ctx, ROWS.C.x - 0.4, 8.4, 0, { name: 'C7' }); }, { anim: true });

    // The matinee crowd.
    sitter(R, { seat: [ROWS.A.x, 13.8], seed: 221, from: MAT0, to: MAT1, arms: clap, look: { hat: 'sun' } });
    sitter(R, { seat: [ROWS.B.x, 11.9], seed: 222, from: MAT0 + 2, to: MAT1, arms: clap, sick: at(10.2), look: { style: 'curly' } });
    sitter(R, {
      seat: [ROWS.C.x, 13.3], seed: 223, from: MAT0 + 4, to: MAT1 - 3, look: { top: C.mustard },
      arms: (t, w) => (onStage(w) ? clap(t, w) : pulse(w, 6) < 0.3 ? [2.2, 0.5] : [1.2, 0.5]),
      prop: (c, t, w) => { const a = onStage(w) ? 1.3 : pulse(w, 6) < 0.3 ? 2.2 : 1.2; const [hx, hy] = hand(a); c.save(); c.translate(hx, hy - 0.1); c.scale(0.8, 0.8); THINGS.cola(c); c.restore(); },
    });

    // Bingo at three: cards, dabbers, and one very loud winner.
    const dabbing = (i) => (t, w) => (pulse(w + i * 1.7, 3) < 0.12 ? [0.7, 0.9] : [1.25, 0.9]);
    const card = (c) => {
      c.beginPath(); c.rect(0.35, -1.12, 0.46, 0.22); paint(c, C.white, { lw: 0.02 });
      if (!Q.detail) return;
      c.fillStyle = C.purple;
      for (const [u, v] of [[0.44, -1.06], [0.6, -0.98], [0.72, -1.06], [0.52, -0.95]]) { c.beginPath(); c.arc(u, v, 0.03, 0, Math.PI * 2); c.fill(); }
    };
    const dabber = (i) => (c, t, w) => {
      card(c);
      const a = dabbing(i)(t, w)[0];
      const [hx, hy] = hand(a);
      c.beginPath(); c.roundRect(hx - 0.05, hy - 0.2, 0.1, 0.22, 0.03); paint(c, C.purple, { lw: 0.02 });
    };
    const BINGOERS = [
      { seat: [ROWS.A.x, 5.0], seed: 231, sick: at(9.6), look: { style: 'curly', hair: HAIR[4], top: INK.flamingo } },
      { seat: [ROWS.A.x, 5.9], seed: 232, look: { style: 'bald', top: C.sky } },
      { seat: [ROWS.C.x, 5.0], seed: 233, sick: at(10.1), look: { style: 'bun', hair: HAIR[4] } },
      { seat: [ROWS.B.x, 8.2], seed: 234, sick: at(10.5), look: { top: C.mustard, hat: 'sun' } },
    ];
    BINGOERS.forEach((b, i) => sitter(R, { ...b, from: BINGO[0] + i, to: BINGO[1], arms: dabbing(i), prop: dabber(i) }));
    const WIN = at(16.3);
    sitter(R, {
      seat: [ROWS.C.x, 6.8], seed: 235, from: BINGO[0] + 2, to: BINGO[1], look: { style: 'curly', hair: HAIR[4], top: C.purple, dress: true },
      arms: (t, w) => (w > WIN ? [2.9 + Math.sin(t * 10) * 0.15, -2.8] : dabbing(5)(t, w)),
      prop: (c, t, w) => { if (w <= WIN) dabber(5)(c, t, w); },
      say: (w) => (w > WIN && w < WIN + 5 ? 'BINGO!' : null),
    });

    // ---------- Kelly's bingo cage ----------
    const CALLS = ['B 4', 'I 17', 'N 38', 'G 52', 'O 66', 'B 9', 'I 22', 'N 41'];
    const call = (w) => (w < BINGO[0] || w > BINGO[1] ? null : w > at(15) && w < at(15.7) ? 'B 4' : CALLS[Math.floor((w - BINGO[0]) / 6) % CALLS.length]);
    R.thing(CAGE[0] + 0.5, CAGE[1] + 0.45, (ctx) => {
      box(ctx, CAGE[0] - 0.45, CAGE[1] - 0.4, 0, 0.9, 0.8, 0.85, C.navy, { top: MAT.carpetGold });
      lettering(ctx, 'y', CAGE[0] + 0.46, CAGE[1], 0.5, 'BINGO', 0.18, MAT.carpetGold);
      for (const dy of [-0.3, 0.3]) face(ctx, [[CAGE[0], CAGE[1] + dy, 0.85], [CAGE[0], CAGE[1] + dy, 1.5]], null, { lw: 0.05, stroke: MAT.brass });
      // The tray of called balls.
      box(ctx, CAGE[0] + 0.05, CAGE[1] - 0.35, 0.85, 0.35, 0.7, 0.06, MAT.brass, { flat: true, lw: 0.02 });
    });
    // Tap it and it spins, bingo or not.
    const cage = R.poke({ id: 'bingo-cage', at: [CAGE[0], CAGE[1], 1.5], r: 0.8, hold: 1.5, sound: 'tick', say: ['Bingo is at 3.', 'Still not 3.', 'Fine. B 4.'] });
    R.thing(CAGE[0] + 0.55, CAGE[1] + 0.5, (ctx, t) => {
      const w = wrap(t);
      const on = w > BINGO[0] && w < BINGO[1];
      const bk = cage.k();
      const spin = on || bk > 0 ? t * (5 + 9 * bk) : 0.3;
      const [X, Y] = P(CAGE[0], CAGE[1], 1.5);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.42, 0.36, 0, 0, Math.PI * 2); ctx.fillStyle = alpha(MAT.glass, 0.35); ctx.fill();
      // Balls tumbling inside.
      for (let i = 0; i < 7; i++) {
        const a = spin * (0.6 + (i % 3) * 0.2) + i;
        const bx = X + Math.cos(a) * 0.22 * ((i % 2) ? 1 : 0.6), by = Y + 0.12 + Math.abs(Math.sin(a)) * -0.2;
        ctx.beginPath(); ctx.arc(bx, by, 0.07, 0, Math.PI * 2); paint(ctx, [C.white, INK.sunYellow, INK.flamingo][i % 3], { lw: 0.015 });
      }
      ctx.strokeStyle = MAT.brass; ctx.lineWidth = 0.035;
      for (let i = 0; i < 6; i++) {
        const a = spin + (i / 6) * Math.PI;
        ctx.beginPath(); ctx.ellipse(X, Y, Math.abs(Math.cos(a)) * 0.42, 0.36, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.beginPath(); ctx.ellipse(X, Y, 0.42, 0.36, 0, 0, Math.PI * 2); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
      // The crank.
      const ca = spin * 1.0;
      ctx.beginPath(); ctx.moveTo(X + 0.42, Y); ctx.lineTo(X + 0.55 + Math.cos(ca) * 0.15, Y + Math.sin(ca) * 0.15); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
      // Called balls in the tray, and the number on its sign.
      const n = on ? Math.min(6, Math.floor((w - BINGO[0]) / 6) + 1) : 0;
      for (let i = 0; i < n; i++) {
        const [bx, by] = P(CAGE[0] + 0.22, CAGE[1] - 0.25 + i * 0.1, 0.95);
        ctx.beginPath(); ctx.arc(bx, by, 0.06, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.015 });
      }
      const c = call(w);
      face(ctx, [[CAGE[0] - 0.35, CAGE[1] + 0.42, 1.75], [CAGE[0] - 0.35, CAGE[1] + 0.42, 2.5]], null, { lw: 0.05 });
      board(ctx, 'y', CAGE[0] - 0.35, CAGE[1] + 0.42, 2.45, 0.9, 0.5, '', { board: C.ink, edge: 0.025 });
      if (Q.detail) lettering(ctx, 'y', CAGE[0] - 0.34, CAGE[1] + 0.42, 2.45, c || 'BINGO 3PM', c ? 0.3 : 0.13, c ? INK.sunYellow : C.white);
    }, { anim: true });

    // ---------- The back of the house ----------
    // The follow spot's booth, and the LOST poster on it, by the door.
    R.thing(BOOTH.x1, BOOTH.y1, (ctx) => {
      const { x0, x1, y1, h } = BOOTH;
      box(ctx, x0, 0.05, 0, x1 - x0, y1 - 0.05, h, C.ink, { top: shade(MAT.teakDark, 0.2), dotsL: C.navy });
      for (const x of [x0 + 0.1, x1 - 0.15]) box(ctx, x, y1 - 0.12, h, 0.06, 0.06, 0.9, MAT.brass, { flat: true, stroke: false });
      face(ctx, [[x0 + 0.1, y1 - 0.1, h + 0.9], [x1 - 0.1, y1 - 0.1, h + 0.9]], null, { lw: 0.06, stroke: MAT.brass });
      // LOST: ONE RABBIT.
      const px = (x0 + x1) / 2, py = y1 + 0.01;
      board(ctx, 'x', px, py, 0.8, 1.3, 1.25, '', { board: INK.sunYellow, edge: 0.03 });
      lettering(ctx, 'x', px, py, 1.22, 'LOST', 0.34, INK.funnelRed, 'Bagel Fat One');
      lettering(ctx, 'x', px, py, 0.96, 'ONE RABBIT', 0.15);
      lettering(ctx, 'x', px, py, 0.76, 'White. Answers', 0.1);
      lettering(ctx, 'x', px, py, 0.62, 'to Flopsy.', 0.1);
      lettering(ctx, 'x', px, py, 0.4, 'REWARD: 2 FREE SHOWS', 0.08);
      // The follow spot on its stand.
      face(ctx, [[14.6, 1.0, h], [14.6, 1.0, h + 0.95]], null, { lw: 0.06 });
      face(ctx, [[14.4, 0.85, h], [14.6, 1.0, h + 0.95], [14.8, 1.15, h]], null, { lw: 0.04 });
    });
    R.thing(BOOTH.x1 + 0.01, BOOTH.y1 + 0.01, (ctx, t) => {
      // The lamp, aimed at wherever the beam is.
      const [X, Y] = P(14.6, 1.0, BOOTH.h + 1.05);
      const tgt = beamAt(wrap(t));
      const [TX, TY] = P(tgt[0], tgt[1], 1);
      const ang = Math.atan2(TY - Y, TX - X);
      ctx.save(); ctx.translate(X, Y); ctx.rotate(ang);
      ctx.beginPath(); ctx.roundRect(-0.35, -0.16, 0.75, 0.32, 0.08); paint(ctx, C.ink, { lw: 0.02 });
      ctx.beginPath(); ctx.ellipse(0.42, 0, 0.06, 0.18, 0, 0, Math.PI * 2); paint(ctx, C.butter, { lw: 0.02 });
      ctx.restore();
      // The operator: yawning, on his third day of Gary.
      const yawn = pulse(t, 13) < 0.12;
      person(ctx, 15.55, 1.55, BOOTH.h, {
        ...folk(351), ...CREW_LOOK, skin: SKIN[2], hair: HAIR[1], style: 'short', dir: 'l',
        arms: yawn ? [2.9, -2.9] : [1.5, 1.3],
        face(c, hy) {
          c.beginPath(); c.arc(0.1, hy - 0.02, 0.36, Math.PI * 1.05, Math.PI * 1.95); c.strokeStyle = C.ink; c.lineWidth = 0.05; c.stroke();
          c.fillStyle = C.ink; c.fillRect(-0.3, hy - 0.08, 0.1, 0.2);
          if (yawn) { c.beginPath(); c.ellipse(0.2, hy + 0.17, 0.06, 0.08, 0, 0, Math.PI * 2); c.fill(); }
        },
      }, t);
    }, { anim: true });

    // The beam: on Gary, but every minute it goes looking round the house
    // for the rabbit, and gives up just short of it.
    function beamAt(w) {
      const s = w % 60;
      const home = [GARY[0] + 0.3, GARY[1]];
      const path = [home, [9.6, 11.2], [12.2, 14.2], [13.9, 14.0], [12, 9], home];
      if (s < 40) return home;
      const k = (s - 40) / 20 * (path.length - 1);
      const i = Math.min(path.length - 2, Math.floor(k)), f = k - i;
      const e = f * f * (3 - 2 * f);
      return [path[i][0] + (path[i + 1][0] - path[i][0]) * e, path[i][1] + (path[i + 1][1] - path[i][1]) * e];
    }
    R.air((ctx, t) => {
      if (!Q.detail) return;
      const w = wrap(t);
      const [tx, ty] = beamAt(w);
      const onStageNow = tx < ST.x1;
      const z = onStageNow ? ST.h : 0;
      const r = onStageNow ? 1.1 : 0.8;
      const [SX, SY] = P(...SPOT);
      const [CX, CY] = P(tx, ty, z);
      const rx = r * Math.SQRT2, ry = rx / 2;
      ctx.beginPath();
      ctx.moveTo(SX, SY);
      ctx.lineTo(CX - rx, CY);
      ctx.ellipse(CX, CY, rx, ry, 0, Math.PI, 0, true);
      ctx.closePath();
      ctx.fillStyle = alpha(C.butter, 0.14);
      ctx.fill();
      ctx.beginPath(); ctx.ellipse(CX, CY, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = alpha(C.butter, 0.22); ctx.fill();
      // The footlights' glow.
      for (const y of FOOT) glow(ctx, 6.8, y, 1.1, 0.8, C.butter, 0.45 + Math.sin(t * 7 + y) * 0.05);
    });

    // The usher by the door, with a torch, shushing.
    R.thing(15.4, 13.5, (ctx, t) => {
      const sway = Math.sin(t * 0.9) * 0.4;
      person(ctx, 15.4, 13.5, 0, {
        ...folk(361), ...CREW_LOOK, skin: SKIN[4], hair: HAIR[6], style: 'pony', dir: 'l', arms: [1.3 + sway * 0.3, 0.2],
        face(c, hy) { c.beginPath(); c.rect(-0.26, hy - 0.36, 0.56, 0.12); paint(c, INK.funnelRed, { lw: 0.02 }); },
      }, t);
      if (!Q.detail) return;
      const [X, Y] = P(14.4 - sway, 12.9 + sway * 0.5, 0);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.45, 0.22, 0, 0, Math.PI * 2); ctx.fillStyle = alpha(C.butter, 0.3); ctx.fill();
      const w = wrap(t);
      if (pulse(w, 30, 8) < 0.12) speech(ctx, 15.4, 13.5, 2.9, 'Shh.', { size: 0.34 });
    }, { anim: true });

    // A cleaner sweeping the back of the house, all day.
    const sweep = route([[15.35, 4.5, 2], [15.35, 10.6, 2.5]], { speed: 0.5, loop: false, offset: 3 });
    R.mover(sweep, (ctx, t, p) => {
      const sw = p.moving ? Math.sin(t * 6) * 0.3 : 0;
      person(ctx, p.x, p.y, 0, {
        ...folk(371), ...CREW_LOOK, skin: SKIN[1], hair: HAIR[2], style: 'bun',
        pose: p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back, arms: [0.8 + sw * 0.3, 0.6], speed: 4,
        hold(c) {
          c.beginPath(); c.moveTo(0, -0.4); c.lineTo(0.3 + sw, 1.05); c.strokeStyle = C.ink; c.lineWidth = 0.1; c.stroke();
          c.strokeStyle = INK.teak; c.lineWidth = 0.05; c.stroke();
          c.beginPath(); c.rect(0.1 + sw, 1.0, 0.45, 0.12); paint(c, INK.sunYellow, { lw: 0.02 });
        },
      }, t);
    });

    // ---------- The wing ----------
    // The stagehand on the ropes, and the costume rack (a rabbit suit, just
    // in case).
    R.thing(4.2, 1.6, (ctx) => {
      for (const x of [1.3, 3.7]) box(ctx, x, 0.75, 0, 0.08, 0.08, 2.3, MAT.chrome, { flat: true, lw: 0.02 });
      face(ctx, [[1.34, 0.79, 2.3], [3.74, 0.79, 2.3]], null, { lw: 0.06, stroke: MAT.chrome });
      const hang = (x, fill, h, o = {}) => {
        const [X, Y] = P(x, 0.79, 2.25);
        ctx.beginPath(); ctx.moveTo(X - 0.2, Y + 0.1); ctx.lineTo(X + 0.2, Y + 0.1); ctx.lineTo(X + (o.flare || 0.26), Y + h); ctx.lineTo(X - (o.flare || 0.26), Y + h); ctx.closePath();
        paint(ctx, fill, { lw: 0.025, dots: o.dots, density: 0.35 });
      };
      hang(1.7, INK.funnelRed, 1.6, { flare: 0.4 });
      hang(2.2, C.purple, 1.3, { dots: MAT.carpetGold });
      hang(2.7, C.white, 1.7, { flare: 0.22 });
      // The rabbit suit's ears, and its tag.
      const [X, Y] = P(2.7, 0.79, 2.25);
      for (const dx of [-0.1, 0.1]) { ctx.beginPath(); ctx.ellipse(X + dx, Y - 0.25, 0.06, 0.22, dx, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.02 }); }
      small(ctx, 2.95, 0.79, 1.55, 'PLAN B', 0.1);
      hang(3.3, INK.sunYellow, 1.2, { dots: C.white });
    });
    R.thing(5.4, 1.3, (ctx, t) => {
      const pull = pulse(t, 7) < 0.3;
      person(ctx, 5.4, 1.3, 0, {
        ...folk(381), ...CREW_LOOK, top: C.ink, bottom: C.ink, skin: SKIN[0], hair: HAIR[2], style: 'short', hat: 'beanie', dir: 'l',
        arms: pull ? [2.4, 2.2] : [2.8, 2.6],
      }, t);
      // The rope he's hauling, up into the flies.
      const [X, Y] = P(5.4, 1.3, 0);
      const [hx, hy] = hand(pull ? 2.4 : 2.8);
      ctx.beginPath(); ctx.moveTo(X - hx, Y + hy); ctx.lineTo(X - hx + 0.05, Y + hy - 4.5);
      ctx.strokeStyle = MAT.canvas; ctx.lineWidth = 0.04; ctx.stroke();
    }, { anim: true });

    // ---------- The rabbit ----------
    // In a lifebuoy by the door, all day, ten units from the hat. When the
    // spotlight comes looking it flattens its ears.
    R.thing(RABBIT[0] + 0.5, RABBIT[1] + 0.5, (ctx, t) => {
      const [x, y] = RABBIT;
      // The ring, lying flat: its side, then its top in red and white.
      const ring = (z, top) => onFloor(ctx, x, y, z, (c) => {
        for (let i = 0; i < 4; i++) {
          c.beginPath();
          c.arc(0, 0, 0.5, (i * Math.PI) / 2, ((i + 1) * Math.PI) / 2);
          c.arc(0, 0, 0.26, ((i + 1) * Math.PI) / 2, (i * Math.PI) / 2, true);
          c.closePath();
          const col = i % 2 ? C.white : INK.funnelRed;
          paint(c, top ? col : shade(col, 0.25), { lw: 0.025 });
        }
      });
      ring(0.0, false);
      ring(0.14, true);
      // A lettuce leaf from the buffet, nibbled.
      onFloor(ctx, x - 0.7, y + 0.1, 0.01, (c) => { c.beginPath(); c.ellipse(0, 0, 0.2, 0.12, 0.5, 0, Math.PI * 1.6); c.lineTo(0, 0); paint(c, C.leaf, { lw: 0.02 }); });
      // The rabbit, facing the stage.
      const w = wrap(t);
      const b = beamAt(w);
      const hide = Math.hypot(b[0] - x, b[1] - y) < 4;
      const twitch = Math.sin(t * 12) * 0.012;
      local(ctx, x, y, 0.1, -1, (c) => {
        c.beginPath(); c.ellipse(-0.02, -0.2, 0.24, 0.18, 0, 0, Math.PI * 2); paint(c, C.white, { lw: 0.035 });
        c.beginPath(); c.arc(-0.25, -0.22, 0.07, 0, Math.PI * 2); paint(c, C.white, { lw: 0.03 });
        const flick = pulse(t, 5) < 0.06 ? 0.3 : 0;
        for (const [ex, a0] of [[0.1, -0.25], [0.2, 0.15 + flick]]) {
          const a = hide ? a0 - 1.2 : a0;
          c.save(); c.translate(ex, -0.46); c.rotate(a);
          c.beginPath(); c.ellipse(0, -0.14, 0.05, 0.16, 0, 0, Math.PI * 2); paint(c, C.white, { lw: 0.03 });
          c.beginPath(); c.ellipse(0, -0.14, 0.02, 0.1, 0, 0, Math.PI * 2); c.fillStyle = C.pink; c.fill();
          c.restore();
        }
        c.beginPath(); c.arc(0.18, -0.36, 0.12, 0, Math.PI * 2); paint(c, C.white, { lw: 0.035 });
        c.beginPath(); c.arc(0.23, -0.38, 0.022, 0, Math.PI * 2); c.fillStyle = C.ink; c.fill();
        c.beginPath(); c.arc(0.3, -0.33 + twitch, 0.022, 0, Math.PI * 2); c.fillStyle = C.pink; c.fill();
      });
    }, { anim: true });
    R.find({ id: 'rabbit', label: 'A rabbit in a lifebuoy', kind: 'spot', at: [RABBIT[0], RABBIT[1], 0.4], r: 0.75 });

    // ---------- Gary's rubber lizard ----------
    // Out of the hat at some show, belly up on the stage ever since. (The decoy.)
    R.thing(LIZARD[0] + 0.5, LIZARD[1] + 0.3, (ctx) => rubberLizard(ctx, LIZARD[0], LIZARD[1], ST.h));
    R.decoy({ id: 'rubber-lizard', at: [LIZARD[0], LIZARD[1], ST.h + 0.2], r: 0.7, say: ['Rubber lizard. Not an iguana.', 'Squeak.'] });
  },
};
