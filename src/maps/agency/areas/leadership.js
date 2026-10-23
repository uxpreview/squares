// Leadership: the quiet end of the floor, nicer carpet. Dana's glass corner
// office (a standing desk that has never stood, a fiddle-leaf fig, a flip
// chart), the CFO's office, the boardroom in the spine (VISION 2030, crossed
// out), the founder's office kept as it was when he "stepped back" to
// Vermont, and the assistants' desks by the windows.
//
// Running gag: every hour Dana rehearses the pitch to her fig, a slide
// further each time (the flip chart turns a page on the hour, her laser
// pointer wanders over it), and every hour the fig droops a little more and
// drops a leaf into its pot. By night it's three leaves on a stick.
// And around her: her assistant guarding the door (watching cats), an intern
// waiting on the sofa for a one-to-one since nine, a man alone in the
// boardroom on a call that never connects, and Bev, who still dusts Walt's
// office every day and putts on his green at lunch.
import { C, Q, HAIR, box, rect, disc, cylinder, face, paint, person, folk, alpha, tint, shade, mix, speech, note, glow, hash, rug, plant as potPlant } from '../../../engine/art.js';
import { ZK } from '../../../engine/iso.js';
import { clamp } from '../../../engine/actors.js';
import { TONE, INK, FABRIC } from '../style.js';
import { floorOf, backWall, sill, pod, staff, room, worker, screen, desk, chair, drawChair, drawChairY, drawMonitor, lettering, glass, plant, papers, onFace, words, DESK } from '../kit.js';
import { bearOClock, H, rushK, seated, nightK, ceo } from '../clock.js';

const P3 = (x, y, z) => [x - y, (x + y) / 2 - z * ZK];
const TOP = DESK.top;

// ---------- Little drawing helpers ----------
// A quad on a face toward +y (running along x) or toward +x (along y).
const qx = (ctx, x0, x1, y, z0, z1, fill, o = { lw: 0.025 }) => face(ctx, [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], fill, o);
const qy = (ctx, x, y0, y1, z0, z1, fill, o = { lw: 0.025 }) => face(ctx, [[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]], fill, o);
// A line through 3D points.
function line3(ctx, pts, color, w) {
  ctx.beginPath();
  pts.forEach((p, i) => { const [X, Y] = P3(...p); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.stroke();
}
// A round thing on a face toward +x (a head on a magazine cover, a wheel).
function dotY(ctx, x, y, z, r, fill, o = { lw: 0.02 }) {
  const pts = [];
  for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; pts.push([x, y + Math.cos(a) * r, z + Math.sin(a) * r]); }
  face(ctx, pts, fill, o);
}
// The day's slide: one more every hour (the fig's line says the same).
const slideAt = (t) => Math.max(1, Math.floor(H(t) - 7));
const SLIDES = ['HELLO!', 'WHO WE ARE', 'THE ASK', 'SYNERGY', 'GROWTH', 'MORE GROWTH', 'THE GOOSE', 'VISION Q4', 'NUMBERS', 'BIG NUMBERS', 'WHY US', 'WHY NOT', 'THANK YOU', 'Q&A', 'BONUS SLIDE', 'ANOTHER ONE', 'STILL HERE'];
// Is Dana at home, rehearsing to the fig? (She's on the level's clock; the
// engine draws her.)
const home = (t) => { const p = ceo(t); return Math.abs(p.x - 3.6) < 0.3 && Math.abs(p.y - 3.4) < 0.3; };

// ---------- Dana's office ----------
// The fig in the back corner. Fifteen big fiddle leaves in the morning; one
// drops on every hour and it bows a little lower each time, yellowing.
const FIG = [6.2, 1.6];
function fig(ctx, t) {
  const [x, y] = FIG;
  const h = H(t), hrs = clamp(h - 8, 0, 13);
  const droop = clamp(hrs / 12);
  const left = Math.max(3, 15 - Math.floor(hrs));
  const fallen = 15 - left;
  const frac = (h - Math.floor(h)) / 0.13; // a leaf on its way down, just after the hour
  const falling = hrs >= 1 && frac < 1 && left > 3 ? 1 : 0;
  cylinder(ctx, x, y, 0, 0.36, 0.62, C.white, { top: shade(C.brown, 0.25) });
  if (Q.detail) qx(ctx, x - 0.28, x + 0.28, y + 0.36, 0.42, 0.48, INK.maple, { stroke: false });
  const green = mix(C.green, C.mustard, droop * 0.5);
  const leafAt = (X, Y, a, s, col) => {
    ctx.save(); ctx.translate(X, Y); ctx.rotate(a);
    ctx.beginPath(); ctx.ellipse(0, -0.25 * s, 0.12 * s, 0.25 * s, 0, 0, Math.PI * 2);
    paint(ctx, col, { lw: 0.025, dots: shade(col, 0.45), density: 0.12 });
    if (Q.detail) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -0.38 * s); ctx.strokeStyle = shade(col, 0.4); ctx.lineWidth = 0.02; ctx.stroke(); }
    ctx.restore();
  };
  // The ones that fell: in the pot first, then round it on the carpet.
  for (let i = 0; i < fallen - falling; i++) {
    const a = i * 2.39, inPot = i < 6;
    const r = inPot ? 0.12 + (i % 3) * 0.06 : 0.5 + (i % 3) * 0.12;
    const [X, Y] = P3(x + Math.cos(a) * r, y + Math.sin(a) * r * (inPot ? 1 : 1.3), inPot ? 0.63 : 0.01);
    ctx.save(); ctx.translate(X, Y); ctx.scale(1, 0.5); ctx.rotate(a);
    ctx.beginPath(); ctx.ellipse(0, 0, 0.11, 0.2, 0, 0, Math.PI * 2);
    paint(ctx, mix(C.mustard, C.brown, (i % 4) * 0.15), { lw: 0.02 });
    ctx.restore();
  }
  // The trunk, bowing over toward the room as the day goes.
  const [BX, BY] = P3(x, y, 0.6);
  const L = (2.2 - droop * 0.4) * ZK;
  const TX = BX + droop * 0.8, TY = BY - L + droop * 0.7;
  const CX = BX - 0.05, CY = BY - L * 0.85;
  const at = (s) => [(1 - s) * (1 - s) * BX + 2 * (1 - s) * s * CX + s * s * TX, (1 - s) * (1 - s) * BY + 2 * (1 - s) * s * CY + s * s * TY];
  ctx.beginPath(); ctx.moveTo(BX, BY); ctx.quadraticCurveTo(CX, CY, TX, TY);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.13; ctx.lineCap = 'round'; ctx.stroke();
  ctx.strokeStyle = C.brown; ctx.lineWidth = 0.07; ctx.stroke();
  // The leaves still on: the top ones, so the bare stick grows from the pot.
  for (let i = 15 - left; i < 15; i++) {
    const s = 0.22 + (0.78 * i) / 14;
    const [X, Y] = at(s);
    const side = i % 2 ? 1 : -1;
    const up = -1.3 * side, hang = 2.5 * side;
    leafAt(X, Y, up + (hang - up) * droop * (0.6 + 0.4 * (1 - s)), 1.55 - droop * 0.2, i % 3 ? green : shade(green, 0.12));
  }
  if (falling) {
    // The hour's leaf, drifting down into the pot.
    const i = 15 - left - 1, s = 0.22 + (0.78 * i) / 14;
    const [X0, Y0] = at(s);
    const [X1, Y1] = P3(x, y, 0.65);
    const k = frac;
    leafAt(X0 + (X1 - X0) * k + Math.sin(k * 9) * 0.25, Y0 + (Y1 - Y0) * k, k * 5, 1.4, mix(green, C.mustard, 0.4));
  }
}

// The flip chart Dana rehearses at: SLIDE n, a word and a chart, and a page
// turning over the top on the hour.
function flipChart(ctx, t) {
  const x0 = 4.35, x1 = 5.45, y = 1.2, mid = (x0 + x1) / 2;
  line3(ctx, [[mid, y - 0.55, 0], [mid, y - 0.05, 2.2]], C.ink, 0.06);
  box(ctx, x0 - 0.05, y, 0.82, x1 - x0 + 0.1, 0.14, 0.06, C.wood, { flat: true, lw: 0.02 });
  qx(ctx, x0 - 0.04, x1 + 0.04, y + 0.01, 0.88, 2.36, C.grey, { lw: 0.03 });
  qx(ctx, x0, x1, y + 0.02, 0.9, 2.3, C.white, { lw: 0.025 });
  const n = slideAt(t);
  lettering(ctx, 'x', mid, y + 0.03, 2.12, `SLIDE ${n}`, 0.17, C.ink, 'Bagel Fat One');
  lettering(ctx, 'x', mid, y + 0.03, 1.86, SLIDES[(n - 1) % SLIDES.length], 0.12, INK.maple);
  if (Q.detail) {
    // A chart that's up and to the right, more each slide.
    for (let i = 0; i < 4; i++) {
      const hh = 0.12 + ((i + 1) / 4) * (0.15 + Math.min(n, 12) * 0.03);
      qx(ctx, x0 + 0.17 + i * 0.2, x0 + 0.3 + i * 0.2, y + 0.03, 1.02, 1.02 + hh, i === 3 ? C.coral : C.teal, { stroke: false });
    }
  }
  // Two legs in front, splayed.
  line3(ctx, [[x0 + 0.05, y + 0.25, 0], [x0 + 0.12, y + 0.05, 2.1]], C.ink, 0.06);
  line3(ctx, [[x1 - 0.05, y + 0.25, 0], [x1 - 0.12, y + 0.05, 2.1]], C.ink, 0.06);
  const f = (H(t) - Math.floor(H(t))) / 0.07;
  if (f < 1 && H(t) > 8) {
    const a = f * Math.PI * 0.95, r = 1.4;
    face(ctx, [[x0, y + 0.04, 2.3], [x1, y + 0.04, 2.3], [x1, y + 0.04 + Math.sin(a) * r, 2.3 - Math.cos(a) * r], [x0, y + 0.04 + Math.sin(a) * r, 2.3 - Math.cos(a) * r]], C.white, { lw: 0.025 });
  }
}

// The standing desk that has never stood: a white top on telescoping legs
// all the way down, a keypad with an UP button nobody's pressed, and a
// sticky note saying so.
function standingDesk(ctx) {
  const x0 = 1.2, x1 = 3.8, y0 = 1.0, y1 = 2.2, top = TOP;
  const leg = shade(C.greyLight, 0.25);
  for (const lx of [x0 + 0.2, x1 - 0.38]) {
    box(ctx, lx - 0.05, y0 + 0.08, 0, 0.26, y1 - y0 - 0.16, 0.06, C.ink, { flat: true, lw: 0.02 });
    box(ctx, lx, (y0 + y1) / 2 - 0.13, 0.06, 0.16, 0.26, 0.55, leg, { flat: true, lw: 0.025 });
    box(ctx, lx + 0.025, (y0 + y1) / 2 - 0.1, 0.61, 0.11, 0.2, top - 0.67, tint(leg, 0.25), { flat: true, lw: 0.02 });
  }
  box(ctx, x0 + 0.15, y1 - 0.3, 0.5, x1 - x0 - 0.3, 0.05, top - 0.56, FABRIC, { flat: true, lw: 0.025 });
  box(ctx, x0, y0, top - 0.06, x1 - x0, y1 - y0, 0.06, C.white, { flat: true, lw: 0.035 });
  // The keypad under the front edge, its arrows.
  box(ctx, x1 - 0.75, y1 - 0.08, top - 0.16, 0.34, 0.08, 0.1, C.ink, { flat: true, lw: 0.02 });
  if (Q.detail) {
    const [X, Y] = P3(x1 - 0.66, y1, top - 0.11);
    ctx.beginPath(); ctx.moveTo(X - 0.05, Y + 0.03); ctx.lineTo(X + 0.05, Y + 0.08); ctx.lineTo(X + 0.01, Y - 0.03); ctx.closePath(); ctx.fillStyle = C.leaf; ctx.fill();
  }
  // The note on the panel.
  qx(ctx, x0 + 1.0, x0 + 1.6, y1 - 0.24, 0.58, 0.98, INK.sticky, { lw: 0.02 });
  lettering(ctx, 'x', x0 + 1.3, y1 - 0.235, 0.86, 'NEVER', 0.11, C.ink);
  lettering(ctx, 'x', x0 + 1.3, y1 - 0.235, 0.7, 'STOOD.', 0.11, C.ink);
  // Her monitor, turned to her chair (its back to us), and a stack of decks.
  box(ctx, 2.05, 1.38, top + 0.04, 0.9, 0.08, 0.6, C.black, { flat: true, lw: 0.025 });
  box(ctx, 2.45, 1.25, top, 0.1, 0.1, 0.06, C.ink, { flat: true, stroke: false });
  papers(ctx, 2.6, 1.85, top, 4);
}

// The gooseneck lamp on her desk: a white puck, a long white S of a neck and
// a little shade with an orange switch for a beak. A goose, for a second.
function gooseneck(ctx) {
  const bx = 1.5, by = 1.5, z = TOP;
  cylinder(ctx, bx, by, z, 0.17, 0.08, C.white);
  const [X0, Y0] = P3(bx, by, z + 0.08);
  ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.bezierCurveTo(X0 + 0.3, Y0 - 0.45, X0 - 0.12, Y0 - 0.9, X0 - 0.34, Y0 - 0.84);
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.15; ctx.stroke();
  ctx.strokeStyle = C.white; ctx.lineWidth = 0.08; ctx.stroke();
  ctx.save(); ctx.translate(X0 - 0.4, Y0 - 0.8); ctx.scale(-1, 1); ctx.rotate(0.45);
  ctx.beginPath(); ctx.ellipse(0, 0, 0.14, 0.1, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.035 });
  ctx.beginPath(); ctx.moveTo(0.11, -0.04); ctx.lineTo(0.3, 0.02); ctx.lineTo(0.11, 0.07); ctx.closePath(); paint(ctx, C.coral, { lw: 0.025 });
  ctx.beginPath(); ctx.arc(0.02, -0.03, 0.025, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
  ctx.restore();
}

// WORLD'S OKAYEST BOSS, on a big white mug.
function bossMug(ctx, x, y, z) {
  box(ctx, x - 0.16, y - 0.16, z, 0.32, 0.32, 0.36, C.white, { flat: true, lw: 0.03 });
  disc(ctx, x, y, z + 0.36, 0.11, C.brown, { stroke: false });
  const [X, Y] = P3(x + 0.16, y, z + 0.18);
  ctx.beginPath(); ctx.arc(X + 0.07, Y, 0.08, -Math.PI / 2, Math.PI / 2); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
  lettering(ctx, 'x', x, y + 0.162, z + 0.28, 'WORLD\'S', 0.06, C.ink);
  lettering(ctx, 'x', x, y + 0.162, z + 0.18, 'OKAYEST', 0.075, C.coral, 'Bagel Fat One');
  lettering(ctx, 'x', x, y + 0.162, z + 0.08, 'BOSS', 0.06, C.ink);
}

// The framed magazine cover of Dana, leaning on her office's side glass.
function cover(ctx) {
  const x = 0.56, y0 = 3.0, y1 = 4.1, z0 = 1.1, z1 = 2.55, my = (y0 + y1) / 2;
  qy(ctx, x, y0 - 0.07, y1 + 0.07, z0 - 0.07, z1 + 0.07, C.mustard, { lw: 0.03 });
  qy(ctx, x + 0.005, y0, y1, z0, z1, C.coral, { lw: 0.02 });
  lettering(ctx, 'y', x + 0.01, my, z1 - 0.18, 'BOLD', 0.3, C.white, 'Bagel Fat One');
  // Dana, arms folded, in purple.
  face(ctx, [[x + 0.01, y0 + 0.2, z0], [x + 0.01, y1 - 0.2, z0], [x + 0.01, y1 - 0.3, z0 + 0.55], [x + 0.01, y0 + 0.3, z0 + 0.55]], C.purple, { lw: 0.02 });
  dotY(ctx, x + 0.012, my, z0 + 0.78, 0.2, C.ink, { stroke: false });
  dotY(ctx, x + 0.014, my - 0.02, z0 + 0.74, 0.16, C.blush);
  lettering(ctx, 'y', x + 0.016, my, z1 - 0.42, 'LOVE THE ENERGY', 0.065, C.white);
  if (Q.detail) { dotY(ctx, x + 0.016, y1 - 0.18, z0 + 0.3, 0.12, C.mustard, { lw: 0.015 }); lettering(ctx, 'y', x + 0.02, y1 - 0.18, z0 + 0.3, 'CEO!', 0.05, C.ink); }
}

// ---------- The CFO's office ----------
// The golden stapler, on a red cushion, the CFO's pride.
function stapler(ctx, x, y, z) {
  box(ctx, x - 0.2, y - 0.3, z, 0.4, 0.6, 0.05, C.red, { flat: true, lw: 0.02, top: tint(C.red, 0.15) });
  const g = C.mustard;
  box(ctx, x - 0.08, y - 0.24, z + 0.05, 0.16, 0.48, 0.05, shade(g, 0.15), { flat: true, lw: 0.02 });
  face(ctx, [[x - 0.07, y - 0.22, z + 0.1], [x + 0.07, y - 0.22, z + 0.1], [x + 0.07, y + 0.22, z + 0.22], [x - 0.07, y + 0.22, z + 0.22]], g, { lw: 0.02 });
  face(ctx, [[x + 0.07, y - 0.22, z + 0.1], [x + 0.07, y + 0.22, z + 0.22], [x + 0.07, y + 0.22, z + 0.13], [x + 0.07, y - 0.22, z + 0.06]], shade(g, 0.1), { lw: 0.02 });
  face(ctx, [[x - 0.07, y + 0.22, z + 0.22], [x + 0.07, y + 0.22, z + 0.22], [x + 0.07, y + 0.22, z + 0.12], [x - 0.07, y + 0.22, z + 0.12]], shade(g, 0.25), { lw: 0.02 });
  if (Q.detail) line3(ctx, [[x - 0.02, y - 0.15, z + 0.13], [x - 0.02, y + 0.12, z + 0.2]], C.butter, 0.03);
}
// A calculator with a paper tape that runs over the desk and down to the floor.
function calculator(ctx, x, y, z) {
  box(ctx, x - 0.18, y - 0.22, z, 0.36, 0.44, 0.08, C.grey, { flat: true, lw: 0.025 });
  cylinder(ctx, x, y - 0.24, z + 0.08, 0.07, 0.12, C.white);
  if (Q.detail) for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
    const [X, Y] = P3(x - 0.1 + j * 0.1, y - 0.1 + i * 0.08, z + 0.085);
    ctx.fillStyle = i === 3 && j === 2 ? C.coral : C.ink; ctx.fillRect(X - 0.025, Y - 0.012, 0.05, 0.025);
  }
  // The tape: from the roll over the desk to its front edge, then down.
  face(ctx, [[x - 0.06, y - 0.2, z + 0.1], [x + 0.06, y - 0.2, z + 0.1], [x + 0.06, 4.2, TOP + 0.005], [x - 0.06, 4.2, TOP + 0.005]], C.white, { lw: 0.015 });
  face(ctx, [[x - 0.06, 4.21, TOP], [x + 0.06, 4.21, TOP], [x + 0.08, 4.25, 0.01], [x - 0.04, 4.25, 0.01]], C.white, { lw: 0.015 });
}
// A Newton's cradle, the outer ball swinging, forever.
function cradle(ctx, x, y, z, t) {
  box(ctx, x - 0.08, y - 0.22, z, 0.16, 0.44, 0.03, C.ink, { flat: true, stroke: false });
  line3(ctx, [[x, y - 0.2, z], [x, y - 0.2, z + 0.32], [x, y + 0.2, z + 0.32], [x, y + 0.2, z]], C.grey, 0.025);
  const sw = Math.sin(t * 4.2), a = Math.max(0, sw) * 0.7, b = Math.max(0, -sw) * 0.7;
  for (let i = 0; i < 5; i++) {
    const by = y - 0.16 + i * 0.08;
    const ang = i === 0 ? -b : i === 4 ? a : 0;
    const bx = by + Math.sin(ang) * 0.2 * (i === 0 ? 1 : 1), bz = z + 0.32 - Math.cos(ang) * 0.2;
    line3(ctx, [[x, by, z + 0.32], [x, bx, bz]], C.grey, 0.012);
    const [X, Y] = P3(x, bx, bz);
    ctx.beginPath(); ctx.arc(X, Y, 0.045, 0, Math.PI * 2); paint(ctx, C.greyLight, { lw: 0.015 });
  }
}

// ---------- Walt's office ----------
// His acoustic guitar on its stand, signed by someone called Dave.
function guitar(ctx, x, y) {
  const [X, Y] = P3(x, y, 0);
  ctx.save(); ctx.translate(X, Y);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-0.3, 0); ctx.lineTo(0, -0.55); ctx.lineTo(0.3, 0); ctx.moveTo(0, -0.55); ctx.lineTo(0.1, -1.7); ctx.stroke();
  ctx.rotate(-0.1);
  // Neck and headstock.
  ctx.beginPath(); ctx.rect(-0.05, -2.45, 0.1, 1.1); paint(ctx, C.brown, { lw: 0.025 });
  ctx.beginPath(); ctx.roundRect(-0.08, -2.7, 0.16, 0.28, 0.04); paint(ctx, shade(C.brown, 0.2), { lw: 0.025 });
  // Body: two bouts and a waist.
  ctx.beginPath(); ctx.arc(0, -0.72, 0.36, 0, Math.PI * 2); ctx.moveTo(0.27, -1.2); ctx.arc(0, -1.2, 0.27, 0, Math.PI * 2);
  paint(ctx, C.wood, { lw: 0.035, dots: shade(C.wood, 0.4), density: 0.1 });
  ctx.beginPath(); ctx.arc(0, -0.72, 0.36, 0, Math.PI * 2); ctx.fillStyle = C.wood; ctx.fill();
  ctx.beginPath(); ctx.arc(0, -1.08, 0.1, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
  ctx.beginPath(); ctx.rect(-0.12, -0.58, 0.24, 0.05); ctx.fillStyle = shade(C.brown, 0.3); ctx.fill();
  if (Q.detail) {
    // Dave's signature, in silver marker.
    ctx.beginPath(); ctx.moveTo(-0.24, -0.78); ctx.bezierCurveTo(-0.15, -0.95, -0.05, -0.6, 0.05, -0.82); ctx.bezierCurveTo(0.12, -0.95, 0.18, -0.7, 0.26, -0.8);
    ctx.strokeStyle = C.white; ctx.lineWidth = 0.035; ctx.stroke();
    ctx.strokeStyle = alpha(C.ink, 0.6); ctx.lineWidth = 0.01;
    ctx.beginPath(); for (const s of [-0.03, 0, 0.03]) { ctx.moveTo(s, -2.4); ctx.lineTo(s, -0.56); } ctx.stroke();
  }
  ctx.restore();
}
// The guitar answering a tap: its strings buzzing and a few notes up.
function strum(ctx, x, y, t, k) {
  if (k < 0.02) return;
  const [X, Y] = P3(x, y, 0);
  ctx.save(); ctx.translate(X, Y); ctx.rotate(-0.1);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.015;
  ctx.beginPath();
  for (const [i, s] of [-0.03, 0, 0.03].entries()) {
    ctx.moveTo(s, -2.4);
    for (let v = 1; v <= 8; v++) ctx.lineTo(s + Math.sin(t * 60 + v * 2 + i) * 0.025 * k, -2.4 + v * 0.23);
  }
  ctx.stroke();
  ctx.restore();
  for (let i = 0; i < 3; i++) {
    const u = ((t * 0.7 + i / 3) % 1);
    note(ctx, x + 0.3 + u * 0.4, y - 0.3 - u * 0.2, 1.6 + u * 1.2 + i * 0.1, alpha(C.ink, k * (1 - u)), 0.6);
  }
}
// A low bookcase against his side glass, a stretch of it: maple syrup tins
// and jugs on the shelves.
function syrupShelf(ctx, y0, y1, seed) {
  const x0 = 0.55, x1 = 1.2, h = 1.3;
  box(ctx, x0, y0, 0, x1 - x0, y1 - y0, 0.1, C.wood, { flat: true, lw: 0.025 });
  box(ctx, x0, y0, 0, 0.08, y1 - y0, h, shade(C.wood, 0.1), { flat: true, lw: 0.025 });
  for (const z of [0.1, 0.65]) {
    let y = y0 + 0.1, i = 0;
    while (y < y1 - 0.25) {
      const r = hash(seed + i, z * 10);
      if (r < 0.6) {
        box(ctx, x0 + 0.2, y, z, 0.22, 0.2, 0.32, INK.maple, { flat: true, lw: 0.02 });
        qy(ctx, x0 + 0.421, y + 0.03, y + 0.17, z + 0.08, z + 0.22, C.white, { lw: 0.01 });
        y += 0.24;
      } else {
        box(ctx, x0 + 0.2, y, z, 0.2, 0.2, 0.28, mix(C.brown, C.mustard, 0.35), { flat: true, lw: 0.02 });
        box(ctx, x0 + 0.27, y + 0.07, z + 0.28, 0.06, 0.06, 0.1, C.white, { flat: true, lw: 0.015 });
        y += 0.24;
      }
      i++;
    }
    box(ctx, x0, y0, z + 0.45, x1 - x0, y1 - y0, 0.06, C.wood, { flat: true, lw: 0.02 });
  }
  box(ctx, x0, y0, h - 0.06, x1 - x0, y1 - y0, 0.08, C.wood, { flat: true, lw: 0.025 });
  box(ctx, x0, y1 - 0.06, 0, x1 - x0, 0.06, h, shade(C.wood, 0.05), { flat: true, lw: 0.02 });
}
// Walt on his tractor, in a frame standing on the bookcase.
function tractorPhoto(ctx) {
  const x = 0.95, y0 = 23.1, y1 = 23.9, z0 = 1.38, z1 = 1.98;
  qy(ctx, x, y0 - 0.05, y1 + 0.05, z0 - 0.05, z1 + 0.05, C.wood, { lw: 0.025 });
  qy(ctx, x + 0.005, y0, y1, z0, z1, C.sky, { lw: 0.015 });
  qy(ctx, x + 0.007, y0, y1, z0, z0 + 0.15, C.leaf, { stroke: false });
  qy(ctx, x + 0.009, y0 + 0.2, y0 + 0.62, z0 + 0.15, z0 + 0.35, C.green, { lw: 0.012 });
  dotY(ctx, x + 0.012, y0 + 0.5, z0 + 0.2, 0.13, C.ink, { stroke: false });
  dotY(ctx, x + 0.012, y0 + 0.22, z0 + 0.12, 0.07, C.ink, { stroke: false });
  dotY(ctx, x + 0.012, y0 + 0.36, z0 + 0.48, 0.07, C.blush, { lw: 0.01 });
  qy(ctx, x + 0.014, y0 + 0.3, y0 + 0.43, z0 + 0.53, z0 + 0.58, C.red, { stroke: false });
}
// His desk, dusty, kept just so: a calendar on March 2021, a nameplate, a
// beige computer whose screensaver still bounces.
const WD = { x0: 1.8, x1: 4.6, y0: 21.2, y1: 22.2, top: 1.15 };
function waltDesk(ctx) {
  const { x0, x1, y0, y1, top } = WD;
  const oak = mix(C.wood, C.brown, 0.4);
  box(ctx, x0 + 0.05, y0 + 0.05, 0, 0.8, y1 - y0 - 0.1, top - 0.08, oak, { flat: true, lw: 0.03 });
  box(ctx, x1 - 0.85, y0 + 0.05, 0, 0.8, y1 - y0 - 0.1, top - 0.08, oak, { flat: true, lw: 0.03 });
  for (const px of [x0 + 0.05, x1 - 0.85]) for (const z of [0.3, 0.65]) {
    qx(ctx, px + 0.1, px + 0.7, y1 - 0.04, z, z + 0.25, tint(oak, 0.1), { lw: 0.02 });
    if (Q.detail) qx(ctx, px + 0.33, px + 0.47, y1 - 0.035, z + 0.1, z + 0.14, C.mustard, { stroke: false });
  }
  box(ctx, x0 + 0.9, y0 + 0.1, 0.78, x1 - x0 - 1.8, y1 - y0 - 0.2, 0.3, shade(oak, 0.2), { flat: true, lw: 0.02 });
  box(ctx, x0, y0, top - 0.08, x1 - x0, y1 - y0, 0.08, oak, { flat: true, lw: 0.035 });
  // Nameplate, calendar, a photo of a fish.
  box(ctx, x0 + 0.3, y1 - 0.25, top, 0.7, 0.1, 0.12, C.mustard, { flat: true, lw: 0.02 });
  lettering(ctx, 'x', x0 + 0.65, y1 - 0.145, top + 0.06, 'WALT. FOUNDER.', 0.05, C.ink);
  face(ctx, [[x0 + 1.25, y1 - 0.3, top], [x0 + 1.65, y1 - 0.3, top], [x0 + 1.6, y1 - 0.45, top + 0.3], [x0 + 1.3, y1 - 0.45, top + 0.3]], C.white, { lw: 0.02 });
  if (Q.detail) { lettering(ctx, 'x', x0 + 1.45, y1 - 0.36, top + 0.2, 'MAR', 0.06, C.red); lettering(ctx, 'x', x0 + 1.45, y1 - 0.38, top + 0.1, '2021', 0.06, C.ink); }
  qx(ctx, x0 + 0.25, x0 + 0.65, y0 + 0.35, top, top + 0.32, C.wood, { lw: 0.02 });
  qx(ctx, x0 + 0.29, x0 + 0.61, y0 + 0.36, top + 0.04, top + 0.28, C.sky, { stroke: false });
  // The beige computer.
  const beige = mix(C.white, C.wood, 0.28);
  box(ctx, x1 - 0.8, y0 + 0.25, top, 0.6, 0.6, 0.55, beige, { flat: true, lw: 0.03 });
  qy(ctx, x1 - 0.195, y0 + 0.32, y0 + 0.78, top + 0.08, top + 0.48, C.navy, { lw: 0.02 });
  box(ctx, x1 - 1.15, y0 + 0.65, top, 0.25, 0.4, 0.04, beige, { flat: true, lw: 0.015 });
}
// The screensaver: PRIMAL's P bouncing round the old screen (it has never
// once hit the corner).
function screensaver(ctx, t) {
  const x = WD.x1 - 0.19, ya = WD.y0 + 0.36, yb = WD.y0 + 0.74, za = WD.top + 0.12, zb = WD.top + 0.44;
  const tri = (v) => { const f = v % 2; return f < 1 ? f : 2 - f; };
  const u = tri(t * 0.23), v = tri(t * 0.31 + 0.4);
  const y = ya + (yb - ya - 0.1) * u, z = za + (zb - za - 0.08) * v;
  qy(ctx, x, y, y + 0.1, z, z + 0.08, [C.coral, C.tealLight, C.mustard, C.pink][Math.floor(t * 0.27) % 4], { stroke: false });
  if (nightK(t) > 0.5) glow(ctx, x, (ya + yb) / 2, (za + zb) / 2, 1, C.tealLight, 0.25);
}
// The drawer in the middle of his desk, sliding out when tapped. Shut, a
// tuft of something hairy pokes out of it.
function drawer(ctx, k) {
  const out = k * 0.55, y = WD.y1 - 0.02 + out, x0 = WD.x0 + 0.95, x1 = WD.x1 - 0.95, z0 = 0.8, z1 = 1.04;
  if (k > 0.02) {
    box(ctx, x0 + 0.05, y - 0.6, z0 + 0.02, x1 - x0 - 0.1, 0.6, z1 - z0 - 0.06, shade(C.brown, 0.3), { flat: true, lw: 0.02 });
    toupee(ctx, (x0 + x1) / 2, y - 0.3, z1 - 0.02);
  }
  box(ctx, x0, y, z0, x1 - x0, 0.05, z1 - z0, mix(C.wood, C.brown, 0.3), { flat: true, lw: 0.025 });
  qx(ctx, (x0 + x1) / 2 - 0.1, (x0 + x1) / 2 + 0.1, y + 0.051, z0 + 0.1, z0 + 0.14, C.mustard, { stroke: false });
  if (k < 0.05) {
    // The tuft, caught in the drawer.
    const [X, Y] = P3((x0 + x1) / 2 + 0.2, y + 0.03, z1);
    ctx.beginPath();
    for (let i = 0; i < 4; i++) { ctx.moveTo(X - 0.06 + i * 0.04, Y); ctx.quadraticCurveTo(X - 0.1 + i * 0.05, Y - 0.12, X - 0.02 + i * 0.06, Y - 0.15); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.lineCap = 'round'; ctx.stroke();
    ctx.strokeStyle = C.brown; ctx.lineWidth = 0.025; ctx.stroke();
  }
}
function toupee(ctx, x, y, z) {
  // A hairpiece: a domed mat of brown hair on a sheet of tissue, combed
  // over, with the swoop at the front and a side parting.
  const hair = C.brown, hi = tint(C.brown, 0.3), lo = shade(C.brown, 0.35);
  const [X, Y] = P3(x, y, z);
  ctx.beginPath(); ctx.ellipse(X, Y, 0.42, 0.17, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.02 });
  ctx.beginPath();
  ctx.moveTo(X - 0.34, Y);
  ctx.bezierCurveTo(X - 0.34, Y - 0.3, X + 0.3, Y - 0.32, X + 0.34, Y - 0.04);
  ctx.quadraticCurveTo(X + 0.4, Y - 0.16, X + 0.3, Y - 0.24); // the swoop
  ctx.quadraticCurveTo(X + 0.42, Y - 0.1, X + 0.34, Y + 0.03);
  ctx.quadraticCurveTo(X, Y + 0.1, X - 0.34, Y);
  ctx.closePath();
  paint(ctx, hair, { lw: 0.03 });
  if (Q.detail) {
    // Combed strands, light on the crown, and the parting.
    ctx.lineCap = 'round';
    ctx.beginPath(); for (let i = 0; i < 5; i++) { const u = -0.24 + i * 0.11; ctx.moveTo(X + u, Y - 0.02); ctx.quadraticCurveTo(X + u + 0.06, Y - 0.22, X + u + 0.2, Y - 0.2); }
    ctx.strokeStyle = hi; ctx.lineWidth = 0.025; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X - 0.12, Y - 0.24); ctx.quadraticCurveTo(X - 0.18, Y - 0.12, X - 0.2, Y - 0.01);
    ctx.strokeStyle = lo; ctx.lineWidth = 0.025; ctx.stroke();
  }
}

// ---------- The boardroom ----------
// The table, in five lengths so the chairs either side sort round it.
const TB = { x0: 3.0, x1: 10.6, y0: 16.3, y1: 17.7, top: 1.05 };
const SEG = (TB.x1 - TB.x0) / 5;
const BOARD_CHAIR = shade(C.navy, 0.15);

export default {
  id: 'leadership',
  name: 'Leadership',
  blurb: 'The CEO rehearses the pitch to her fig every hour, and the fig is losing heart. The founder stepped back to Vermont; his office didn\'t.',
  describe: 'The quiet end of the office floor: the CEO\'s glass corner office, where she rehearses to a tall fig that wilts through the day; the finance director\'s office; a boardroom where one man is on a call; the founder\'s untouched office, dusted daily; and assistants\' desks by the windows.',

  build(R) {
    floorOf(R, 0, 16, { floor: TONE.leadership, name: 'LEADERSHIP', nameAt: [8, 13.2] });
    backWall(R, 0, 16, { left: true });
    sill(R, 0, 16);

    // ---------- Dana's corner office ----------
    room(R, 0.4, 0.4, 7.4, 6.8, null, { door: 5.6, table: false });
    R.rug((ctx) => {
      rug(ctx, 0.9, 0.9, 6.0, 5.4, tint(C.lilac, 0.25), C.purple);
      lettering(ctx, 'x', 3.6, 6.8, 1.7, 'DANA. CEO.', 0.22, alpha(C.ink, 0.55), 'Bagel Fat One');
    });
    R.thing(2.5, 2.2, (ctx) => standingDesk(ctx));
    R.thing(2.25, 3.25, (ctx) => drawChairY(ctx, 2.25, 2.9, 0, shade(C.purple, 0.25), 1, 'all', true));
    R.thing(1.6, 3.15, (ctx) => gooseneck(ctx));
    R.decoy({ id: 'lamp', at: [1.65, 1.6, 1.75], r: 0.6, say: 'A gooseneck lamp. Close, though.' });
    R.light({ at: [1.9, 1.75, 1.6], r: 1.6, color: C.butter, k: (t) => nightK(t) * 0.8 });
    R.thing(3.35, 1.7, (ctx) => bossMug(ctx, 3.35, 1.55, TOP));
    R.find({ id: 'mug', label: 'A "World\'s Okayest Boss" mug', at: [3.35, 1.55, 1.3], r: 0.8 });
    // Steam off her coffee while she's in.
    R.air((ctx, t) => {
      if (!Q.detail || !seated(t, 0.05)) return;
      for (let i = 0; i < 2; i++) {
        const u = (t * 0.5 + i * 0.5) % 1;
        const [X, Y] = P3(3.35, 1.55, TOP + 0.45 + u * 0.6);
        ctx.beginPath(); ctx.moveTo(X, Y); ctx.quadraticCurveTo(X + Math.sin(t * 2 + i) * 0.12, Y - 0.12, X, Y - 0.24);
        ctx.strokeStyle = alpha(C.white, 0.8 * (1 - u)); ctx.lineWidth = 0.04; ctx.lineCap = 'round'; ctx.stroke();
      }
    });
    R.thing(4.9, 1.45, (ctx, t) => flipChart(ctx, t), { anim: true });
    const figPoke = R.poke({ id: 'fig', at: [6.2, 1.6, 1.6], r: 0.9, say: (t) => `Slide ${slideAt(t)}. The fig is not convinced.`, teach: true });
    R.thing(6.2, 1.98, (ctx, t) => fig(ctx, t), { anim: true });
    // Her laser pointer: on the slide, now and then on the fig.
    R.air((ctx, t) => {
      if (!home(t)) return;
      const onFig = Math.sin(t * 0.7) > 0.75 || figPoke.k() > 0.5;
      const [x, y, z] = onFig ? [6.15 + Math.sin(t * 5) * 0.08, 1.7, 1.9 + Math.sin(t * 3.3) * 0.12] : [4.9 + Math.sin(t * 1.7) * 0.35, 1.24, 1.6 + Math.sin(t * 2.3) * 0.3];
      const [X, Y] = P3(x, y, z);
      glow(ctx, x, y, z, 0.35, C.red, 0.7);
      ctx.beginPath(); ctx.arc(X, Y, 0.045, 0, Math.PI * 2); ctx.fillStyle = C.red; ctx.fill();
    });
    R.thing(0.62, 4.15, (ctx) => cover(ctx));
    // A low cabinet under it: awards, books, a Gander Cola for later.
    R.thing(0.8, 6.3, (ctx) => {
      box(ctx, 0.55, 4.5, 0, 0.55, 1.8, 0.8, C.white, { flat: true, lw: 0.03 });
      for (const [y, c, h] of [[4.6, C.teal, 0.42], [4.72, C.coral, 0.36], [4.82, C.navy, 0.44], [4.95, C.mustard, 0.38]]) box(ctx, 0.62, y, 0.8, 0.36, 0.11, h, c, { flat: true, lw: 0.015 });
      cylinder(ctx, 0.82, 5.6, 0.8, 0.07, 0.2, C.red);
      // A crystal award: THOUGHT LEADER 2024.
      face(ctx, [[0.8, 6.0, 0.8], [0.8, 6.2, 0.8], [0.8, 6.15, 1.25], [0.8, 6.05, 1.25]], tint(C.sky, 0.4), { lw: 0.02 });
    });

    // ---------- Dana's assistant, guarding the door ----------
    // Watching cats until Dana walks past, then a spreadsheet; at bear o'clock
    // she only stands up to look: nobody gets past her.
    desk(R, 2.2, 8.3, 1.2, 1.4);
    const ea = { x: 3.95, y: 9.0, dir: 'l', side: 'r', mon: [2.9, 9.0, TOP] };
    worker(R, ea, folk(520, { top: C.teal, bottom: C.ink, style: 'bun', hair: HAIR[1] }), { k: 0.12, window: [4.35, 9.9], at: 'point' });
    screen(R, ea, 'cat', { here: (t) => seated(t, 0.12) });
    R.thing(2.6, 9.6, (ctx) => {
      box(ctx, 2.4, 9.35, TOP, 0.5, 0.08, 0.2, C.white, { flat: true, lw: 0.02 });
      lettering(ctx, 'x', 2.65, 9.43, TOP + 0.1, 'BY APPT ONLY', 0.05, C.red);
      plant(ctx, 2.55, 8.6, TOP, 0.4);
    });
    // The sofa outside her door, and the intern who's been waiting on it for
    // a one-to-one since nine. At bear o'clock he stands on it to look.
    R.thing(1.35, 11.75, (ctx) => {
      const lea = mix(C.brown, C.ink, 0.25);
      box(ctx, 0.5, 9.9, 0, 0.85, 1.8, 0.45, lea, { flat: true, lw: 0.03 });
      box(ctx, 0.5, 9.9, 0.45, 0.25, 1.8, 0.55, lea, { flat: true, lw: 0.03, top: tint(lea, 0.15) });
      for (const y of [9.9, 11.5]) box(ctx, 0.5, y, 0.45, 0.85, 0.2, 0.25, tint(lea, 0.05), { flat: true, lw: 0.03 });
    });
    R.thing(2.4, 11.3, (ctx) => {
      box(ctx, 2.0, 10.2, 0.4, 0.8, 1.1, 0.05, C.white, { flat: true, lw: 0.025 });
      box(ctx, 2.35, 10.7, 0, 0.1, 0.1, 0.4, C.ink, { flat: true, stroke: false });
      // Six copies of the same magazine.
      for (let i = 0; i < 3; i++) box(ctx, 2.15 + i * 0.03, 10.35 + i * 0.05, 0.45 + i * 0.03, 0.35, 0.45, 0.03, C.coral, { flat: true, lw: 0.015 });
      onFace(ctx, 'floor', 2.38, 10.65, 0.55, (c) => words(c, 'BOLD', 0, 0, 0.12, C.white, 'Bagel Fat One'));
    });
    const intern = folk(530, { top: C.sky, bottom: C.navy, style: 'short', hair: HAIR[3], dress: false });
    const folder = (ctx) => { ctx.beginPath(); ctx.rect(-0.05, -0.1, 0.32, 0.4); paint(ctx, C.coral, { lw: 0.025 }); };
    R.mover((t) => {
      if (!seated(t, 0.1)) return { x: 1.0, y: 10.8, gone: true };
      const up = rushK(t, 1.2, 0.3);
      return { x: 1.0, y: 10.8, up };
    }, (ctx, t, p) => {
      if (p.gone) return;
      if (p.up > 0.5) person(ctx, p.x, p.y, 0.45, { ...intern, pose: 'point', dir: 'r' }, t);
      else {
        person(ctx, p.x, p.y, 0.05, { ...intern, pose: 'sit', dir: 'r', hold: folder }, t);
        const s = ((t % 31) + 31) % 31;
        if (s < 3.5 && Q.detail) speech(ctx, p.x, p.y, 2.6, 'Is she free yet?', { size: 0.36 });
      }
    }, { bias: 1.6 });

    // ---------- The spine: awards, values, water ----------
    R.thing(8.0, 7.4, (ctx) => potPlant(ctx, 8.0, 7.4, 0, 0, { kind: 'leafy', scale: 1.25, potColor: C.white }));
    // OUR VALUES, on a stand.
    R.thing(9.9, 10.1, (ctx) => {
      line3(ctx, [[9.9, 10.05, 0], [9.9, 10.05, 0.9]], C.ink, 0.07);
      box(ctx, 9.6, 9.8, 0, 0.6, 0.5, 0.04, C.ink, { flat: true, stroke: false });
      qx(ctx, 9.15, 10.65, 10.05, 0.9, 2.5, C.ink, { lw: 0.03 });
      qx(ctx, 9.2, 10.6, 10.06, 0.95, 2.45, C.white, { lw: 0.02 });
      lettering(ctx, 'x', 9.9, 10.07, 2.2, 'OUR VALUES', 0.16, INK.maple, 'Bagel Fat One');
      lettering(ctx, 'x', 9.9, 10.07, 1.9, '1. BOLD', 0.11, C.ink);
      lettering(ctx, 'x', 9.9, 10.07, 1.68, '2. BOLDER', 0.11, C.ink);
      lettering(ctx, 'x', 9.9, 10.07, 1.46, '3. SYNERGY', 0.11, C.ink);
      lettering(ctx, 'x', 9.9, 10.07, 1.2, '4. TBD', 0.11, alpha(C.ink, 0.5));
    });
    // The awards cabinet: Primal's wins, the last one in 2009. Plaques and
    // framed awards, no cups (a cup here sent players looking for
    // Marketing's participation trophy).
    R.thing(14.4, 8.25, (ctx) => {
      const x0 = 13.3, x1 = 15.5, y0 = 7.6, y1 = 8.25, h = 1.9;
      box(ctx, x0, y0, 0, x1 - x0, y1 - y0, h, C.wood, { flat: true, lw: 0.03 });
      qx(ctx, x0 + 0.08, x1 - 0.08, y1 + 0.001, 0.1, h - 0.1, shade(C.wood, 0.45), { lw: 0.02 });
      for (const z of [0.15, 0.95]) {
        qx(ctx, x0 + 0.08, x1 - 0.08, y1 + 0.002, z, z + 0.04, C.wood, { stroke: false });
        for (let i = 0; i < 4; i++) {
          const x = x0 + 0.35 + i * 0.5, gold = i % 2 ? C.mustard : C.greyLight;
          if ((i + (z > 0.5 ? 1 : 0)) % 3 === 0) {
            // A plaque.
            qx(ctx, x - 0.15, x + 0.15, y1 - 0.2, z + 0.05, z + 0.45, C.wood, { lw: 0.015 });
            qx(ctx, x - 0.09, x + 0.09, y1 - 0.199, z + 0.14, z + 0.36, gold, { lw: 0.01 });
          } else {
            // A framed award: a certificate, its gold seal, its ribbon.
            qx(ctx, x - 0.18, x + 0.18, y1 - 0.2, z + 0.05, z + 0.55, C.black, { lw: 0.015 });
            qx(ctx, x - 0.14, x + 0.14, y1 - 0.199, z + 0.09, z + 0.51, C.white, { stroke: false });
            if (Q.detail) for (const zz of [0.42, 0.35, 0.29]) qx(ctx, x - 0.09, x + 0.09, y1 - 0.198, z + zz, z + zz + 0.018, C.grey, { stroke: false });
            const [X, Y] = P3(x + 0.06, y1 - 0.197, z + 0.18);
            ctx.beginPath(); ctx.arc(X, Y, 0.05, 0, Math.PI * 2); paint(ctx, gold, { lw: 0.012 });
            ctx.beginPath(); ctx.moveTo(X - 0.03, Y + 0.03); ctx.lineTo(X - 0.05, Y + 0.11); ctx.moveTo(X + 0.03, Y + 0.03); ctx.lineTo(X + 0.05, Y + 0.11);
            ctx.strokeStyle = C.red; ctx.lineWidth = 0.025; ctx.stroke();
          }
        }
      }
      lettering(ctx, 'x', (x0 + x1) / 2, y1 + 0.004, 1.75, 'BEST PITCH 2009', 0.07, C.butter);
      glass(ctx, x0 + 0.05, y1 - 0.02, 0.1, x1 - x0 - 0.1, 0.02, h - 0.2, 0.2);
    });
    // The suggestion box, padlocked, its slot taped over.
    R.thing(14.8, 11.0, (ctx) => {
      box(ctx, 14.76, 10.74, 0, 0.08, 0.08, 1.05, C.grey, { flat: true, lw: 0.02 });
      box(ctx, 14.5, 10.55, 1.05, 0.6, 0.45, 0.5, C.wood, { flat: true, lw: 0.03 });
      qx(ctx, 14.56, 15.04, 11.001, 1.4, 1.46, C.ink, { stroke: false });
      lettering(ctx, 'x', 14.8, 11.002, 1.24, 'IDEAS', 0.13, C.white, 'Bagel Fat One');
      // The tape across the slot, and the padlock.
      face(ctx, [[14.5, 10.6, 1.56], [15.1, 10.95, 1.56], [15.1, 11.0, 1.56], [14.5, 10.65, 1.56]], C.butter, { lw: 0.012 });
      box(ctx, 14.95, 11.0, 1.12, 0.12, 0.04, 0.14, C.mustard, { flat: true, lw: 0.015 });
    });

    // ---------- The CFO's office ----------
    // The golden stapler, a calculator whose tape has reached the floor and is
    // heading for the door, and his chair, where the letter he hasn't sent
    // waits while he's at the window.
    room(R, 8.6, 0.4, 15.6, 6.8, null, { door: 12, table: false });
    R.rug((ctx) => {
      rug(ctx, 9.1, 0.9, 6.0, 5.4, tint(C.green, 0.55), shade(C.green, 0.05));
      lettering(ctx, 'x', 10.0, 6.8, 1.7, 'GREG. CFO.', 0.22, alpha(C.ink, 0.55), 'Bagel Fat One');
    });
    // The tape on the floor, a bit longer every hour.
    R.rug((ctx, t) => {
      const len = 0.4 + clamp(H(t) - 8, 0, 13) * 0.17;
      const pts = [];
      for (let u = 0; u <= len; u += 0.1) pts.push([13.55 + Math.sin(u * 3.2) * 0.35 * Math.min(1, u * 2), 4.25 + u, 0.005]);
      line3(ctx, pts, C.ink, 0.17);
      line3(ctx, pts, C.white, 0.12);
    }, { anim: true, step: (t) => Math.floor(clamp(H(t) - 8, 0, 13) * 2) });
    R.thing(9.4, 1.3, (ctx) => {
      box(ctx, 9.0, 0.6, 0, 0.8, 0.7, 1.35, C.grey, { flat: true, lw: 0.03 });
      for (let i = 0; i < 3; i++) {
        qx(ctx, 9.08, 9.72, 1.301, 0.1 + i * 0.42, 0.45 + i * 0.42, tint(C.grey, 0.15), { lw: 0.02 });
        qx(ctx, 9.3, 9.5, 1.302, 0.33 + i * 0.42, 0.4 + i * 0.42, C.white, { lw: 0.01 });
      }
      plant(ctx, 9.4, 0.95, 1.35, 0.6, C.leaf);
    });
    // LINE GO UP, framed, leaning on the back glass.
    R.thing(11.2, 0.6, (ctx) => {
      qx(ctx, 10.5, 11.9, 0.5, 1.15, 2.2, C.ink, { lw: 0.02 });
      qx(ctx, 10.55, 11.85, 0.505, 1.2, 2.15, C.white, { lw: 0.015 });
      line3(ctx, [[10.65, 0.51, 1.3], [10.95, 0.51, 1.45], [11.15, 0.51, 1.38], [11.45, 0.51, 1.7], [11.75, 0.51, 2.0]], C.green, 0.05);
      lettering(ctx, 'x', 11.0, 0.51, 1.95, 'Q4', 0.14, C.ink, 'Bagel Fat One');
    });
    // The shredder, full.
    R.thing(10.4, 1.4, (ctx) => {
      box(ctx, 10.15, 1.05, 0, 0.5, 0.35, 0.6, C.ink, { flat: true, lw: 0.025 });
      box(ctx, 10.1, 1.0, 0.6, 0.6, 0.45, 0.12, C.grey, { flat: true, lw: 0.02 });
      if (Q.detail) for (let i = 0; i < 5; i++) line3(ctx, [[10.2 + i * 0.1, 1.25, 0.72], [10.22 + i * 0.1, 1.25, 0.9 + (i % 2) * 0.08]], C.white, 0.04);
    });
    desk(R, 12.85, 1.2, 1.3, 3.0, mix(C.wood, C.brown, 0.2));
    R.thing(13.5, 2.15, (ctx) => box(ctx, 12.95, 1.3, 0, 1.1, 0.8, TOP - 0.08, shade(C.wood, 0.2), { flat: true, lw: 0.025 }));
    R.thing(13.25, 4.26, (ctx) => drawMonitor(ctx, 13.25, 2.65, TOP, 'off', 0, false));
    R.thing(13.65, 4.3, (ctx) => stapler(ctx, 13.65, 1.7, TOP));
    R.find({ id: 'stapler', label: 'A golden stapler', at: [13.65, 1.7, 1.3], r: 0.8 });
    // The stapler's glint, now and then.
    R.thing(13.66, 4.31, (ctx, t) => {
      const s = ((t % 5) + 5) % 5;
      if (s > 0.6 || !Q.detail) return;
      const [X, Y] = P3(13.6, 1.6, TOP + 0.3);
      const r = Math.sin((s / 0.6) * Math.PI) * 0.16;
      ctx.beginPath(); ctx.moveTo(X - r, Y); ctx.lineTo(X + r, Y); ctx.moveTo(X, Y - r); ctx.lineTo(X, Y + r);
      ctx.strokeStyle = C.white; ctx.lineWidth = 0.035; ctx.lineCap = 'round'; ctx.stroke();
    }, { anim: true });
    R.thing(13.86, 4.32, (ctx, t) => cradle(ctx, 13.86, 3.0, TOP, t), { anim: true });
    R.thing(13.45, 4.28, (ctx) => calculator(ctx, 13.45, 3.7, TOP));
    R.thing(14.1, 4.35, (ctx) => {
      face(ctx, [[14.02, 3.25, TOP], [14.02, 3.95, TOP], [14.08, 3.95, TOP + 0.14], [14.08, 3.25, TOP + 0.14]], C.ink, { lw: 0.02 });
      lettering(ctx, 'y', 14.06, 3.6, TOP + 0.07, 'THE BUCK STOPS', 0.04, C.mustard);
    });
    // A visitor's chair nobody sits in, and his coat on the stand.
    R.thing(14.95, 2.85, (ctx) => drawChair(ctx, 14.85, 2.8, 0, shade(C.green, 0.2), 1, 'all'));
    R.thing(15.05, 6.05, (ctx) => {
      box(ctx, 14.8, 5.8, 0, 0.5, 0.5, 0.05, C.ink, { flat: true, stroke: false });
      line3(ctx, [[15.05, 6.05, 0], [15.05, 6.05, 2.3]], C.ink, 0.06);
      const [X, Y] = P3(15.05, 6.05, 2.15);
      ctx.beginPath(); ctx.moveTo(X - 0.08, Y); ctx.lineTo(X - 0.32, Y + 0.3); ctx.lineTo(X - 0.3, Y + 1.3); ctx.lineTo(X + 0.3, Y + 1.3); ctx.lineTo(X + 0.32, Y + 0.3); ctx.lineTo(X + 0.08, Y); ctx.closePath();
      paint(ctx, mix(C.wood, C.grey, 0.5), { lw: 0.03, dots: shade(C.grey, 0.4), density: 0.15 });
      ctx.beginPath(); ctx.moveTo(X, Y + 0.05); ctx.lineTo(X, Y + 1.25); ctx.strokeStyle = alpha(C.ink, 0.5); ctx.lineWidth = 0.02; ctx.stroke();
    });
    const tie = (ctx, b) => { if (b.back) return; ctx.beginPath(); ctx.moveTo(0.04, b.top + 0.05); ctx.lineTo(0.12, b.top + 0.05); ctx.lineTo(0.13, b.hipY - 0.1); ctx.lineTo(0.08, b.hipY); ctx.lineTo(0.03, b.hipY - 0.1); ctx.closePath(); paint(ctx, C.red, { lw: 0.02 }); };
    worker(R, { x: 12.2, y: 3.2, dir: 'r', side: 'l' }, folk(501, { top: C.white, bottom: C.ink, style: 'bald', wear: tie }), { k: 0.1, via: [[12.2, 7.5], [15.2, 9.5], [15.2, 23.6]], window: [15.4, 24.6] });
    // The letter, on the seat he just left: only while he's at the window.
    R.thing(12.3, 3.35, (ctx, t) => {
      if (!bearOClock(t)) return;
      const x = 12.22, y = 3.2, z = 0.63;
      face(ctx, [[x - 0.24, y - 0.17, z], [x + 0.24, y - 0.17, z], [x + 0.24, y + 0.17, z], [x - 0.24, y + 0.17, z]], C.white, { lw: 0.03 });
      line3(ctx, [[x - 0.24, y - 0.17, z + 0.001], [x, y, z + 0.001], [x + 0.24, y - 0.17, z + 0.001]], alpha(C.ink, 0.6), 0.015);
      disc(ctx, x, y + 0.02, z + 0.002, 0.05, C.red, { lw: 0.01 });
      onFace(ctx, 'floor', x, y + 0.11, z + 0.002, (c) => words(c, 'I QUIT (DRAFT 9)', 0, 0, 0.045, C.ink));
    }, { anim: true });
    R.find({ id: 'letter', label: 'An unsent resignation letter', kind: 'hard', at: [12.22, 3.2, 0.7], r: 0.8, when: bearOClock, note: 'bear o\'clock',
      riddle: 'Keeping his options open, on the seat he just left.', hint: 'When the bear comes, the money man leaves something on his chair.' });

    // ---------- The boardroom ----------
    // VISION 2030, crossed out, a table for fourteen and one man on a call
    // that never connects. The credenza nobody opens is holding an offsite of
    // its own.
    room(R, 1, 14.4, 13.4, 19.8, null, { door: 8, back: true, table: false });
    R.rug((ctx) => {
      rug(ctx, 2.4, 15.2, 8.8, 3.8, tint(C.navy, 0.62), tint(C.navy, 0.35));
      lettering(ctx, 'x', 4.0, 14.4, 1.7, 'BOARDROOM', 0.22, alpha(C.ink, 0.5), 'Bagel Fat One');
    });
    // The whiteboard at the end, on legs (in two halves, either side of the
    // seam at y 16).
    const wb = (y0, y1, words) => R.thing(1.5, y1, (ctx) => {
      line3(ctx, [[1.35, y0 + 0.15, 0], [1.35, y0 + 0.15, 0.7]], C.grey, 0.05);
      line3(ctx, [[1.35, y1 - 0.15, 0], [1.35, y1 - 0.15, 0.7]], C.grey, 0.05);
      box(ctx, 1.28, y0, 0.6, 0.15, y1 - y0, 1.75, C.white, { flat: true, lw: 0.03, right: C.white });
      box(ctx, 1.43, y0, 0.62, 0.12, y1 - y0, 0.04, C.grey, { flat: true, lw: 0.015 });
      words(ctx);
    });
    wb(14.9, 16.0, (ctx) => {
      // A hockey stick, and a marker.
      line3(ctx, [[1.44, 15.85, 0.95], [1.44, 15.5, 1.0], [1.44, 15.25, 1.1], [1.44, 15.05, 1.8]], C.teal, 0.04);
      box(ctx, 1.45, 15.3, 0.66, 0.08, 0.3, 0.05, C.red, { flat: true, lw: 0.01 });
    });
    wb(16.0, 19.3, (ctx) => {
      lettering(ctx, 'y', 1.44, 17.65, 2.0, 'VISION 2030', 0.3, C.ink, 'Bagel Fat One');
      line3(ctx, [[1.445, 18.75, 1.92], [1.445, 16.55, 2.12]], C.red, 0.06);
      lettering(ctx, 'y', 1.44, 17.65, 1.45, 'VISION Q4', 0.3, C.red, 'Bagel Fat One');
      lettering(ctx, 'y', 1.44, 17.65, 1.05, '(ish)', 0.14, C.red);
    });
    // The table, and its chairs either side: empty but for one at the head.
    for (let i = 0; i < 5; i++) {
      const x0 = TB.x0 + i * SEG, x1 = x0 + SEG, cx = (x0 + x1) / 2;
      R.thing(cx, 15.75, (ctx) => drawChairY(ctx, cx, 15.65, 0, BOARD_CHAIR, -1));
      R.thing(x1, TB.y1, (ctx) => {
        if (i === 1 || i === 3) box(ctx, cx - 0.2, (TB.y0 + TB.y1) / 2 - 0.25, 0, 0.4, 0.5, TB.top - 0.08, C.ink, { flat: true, stroke: false });
        box(ctx, x0, TB.y0, TB.top - 0.08, SEG, TB.y1 - TB.y0, 0.08, mix(C.wood, C.brown, 0.35), { flat: true, lw: 0.035, left: shade(C.brown, 0.2), right: shade(C.brown, 0.1) });
        if (Q.detail) {
          // A notepad and a pen at each place, untouched.
          for (const [py, s] of [[TB.y0 + 0.25, -1], [TB.y1 - 0.25, 1]]) {
            rect(ctx, cx - 0.15, py - 0.12, 0.3, 0.24, TB.top, C.white, { lw: 0.015 });
            line3(ctx, [[cx + 0.2, py - 0.1 * s, TB.top + 0.01], [cx + 0.25, py + 0.1 * s, TB.top + 0.01]], C.navy, 0.025);
          }
        }
        if (i === 2) {
          // The pastries nobody's touched (it's a pitch day).
          disc(ctx, cx, 17.0, TB.top, 0.35, C.white, { lw: 0.02 });
          for (let j = 0; j < 5; j++) { const [X, Y] = P3(cx + Math.cos(j * 1.3) * 0.18, 17.0 + Math.sin(j * 1.3) * 0.18, TB.top + 0.05); ctx.beginPath(); ctx.ellipse(X, Y, 0.1, 0.06, 0.3, 0, Math.PI * 2); paint(ctx, C.woodLight, { lw: 0.015 }); }
        }
        if (i === 3) {
          // The conference phone.
          const [X, Y] = P3(cx + 0.3, 17.0, TB.top + 0.03);
          ctx.beginPath(); ctx.moveTo(X, Y - 0.12); ctx.lineTo(X + 0.26, Y + 0.08); ctx.lineTo(X - 0.26, Y + 0.08); ctx.closePath(); paint(ctx, C.ink, { lw: 0.02 });
        }
        if (i === 4) {
          // His laptop, the call on it.
          box(ctx, x1 - 0.65, 16.75, TB.top, 0.4, 0.5, 0.03, C.grey, { flat: true, lw: 0.015 });
          face(ctx, [[x1 - 0.3, 16.75, TB.top + 0.03], [x1 - 0.3, 17.25, TB.top + 0.03], [x1 - 0.38, 17.25, TB.top + 0.38], [x1 - 0.38, 16.75, TB.top + 0.38]], C.ink, { lw: 0.015 });
          if (Q.detail) for (let j = 0; j < 4; j++) {
            const yy = 16.8 + (j % 2) * 0.22, zz = TB.top + 0.07 + Math.floor(j / 2) * 0.15;
            face(ctx, [[x1 - 0.31 - (zz - TB.top) * 0.23, yy, zz], [x1 - 0.31 - (zz - TB.top) * 0.23, yy + 0.18, zz], [x1 - 0.33 - (zz - TB.top) * 0.23, yy + 0.18, zz + 0.12], [x1 - 0.33 - (zz - TB.top) * 0.23, yy, zz + 0.12]], [C.teal, C.coral, C.ink, C.mustard][j], { stroke: false });
          }
        }
      });
      R.thing(cx, 18.65, (ctx) => drawChairY(ctx, cx, 18.3, 0, BOARD_CHAIR, 1));
    }
    // The phone's light, green when someone's on it.
    R.thing(TB.x0 + 3.5 * SEG + 0.31, 17.01, (ctx, t) => {
      if (!seated(t, 0.35) || Math.sin(t * 3) < 0) return;
      const [X, Y] = P3(TB.x0 + 3.5 * SEG + 0.3, 17.0, TB.top + 0.04);
      ctx.beginPath(); ctx.arc(X, Y, 0.04, 0, Math.PI * 2); ctx.fillStyle = C.leaf; ctx.fill();
    }, { anim: true });
    R.thing(2.35, 17.35, (ctx) => drawChairY(ctx, 2.35, 17.0, 0, BOARD_CHAIR, -1));
    // The man at the head of the table, on a call by himself. He doesn't go
    // to the window: he's presenting.
    const caller = { x: 11.25, y: 17.0, dir: 'l', side: 'r' };
    chair(R, caller, BOARD_CHAIR);
    const headset = (ctx, hy, back) => {
      ctx.beginPath(); ctx.arc(0.02, hy, 0.36, Math.PI * 1.1, Math.PI * 1.9); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
      if (back) return;
      ctx.beginPath(); ctx.moveTo(0.3, hy + 0.05); ctx.quadraticCurveTo(0.35, hy + 0.25, 0.2, hy + 0.25); ctx.stroke();
    };
    const callerLook = folk(540, { top: C.white, bottom: C.navy, style: 'bald', face: headset });
    const LINES = ['You\'re on mute.', 'Can you see my screen?', 'Sorry, go ahead.', 'You froze.', 'Is Gary on?', 'Let\'s take this offline.'];
    R.mover((t) => (seated(t, 0.35) ? { x: caller.x, y: caller.y } : { x: caller.x, y: caller.y, gone: true }), (ctx, t, p) => {
      if (p.gone) return;
      const s = ((t % 7) + 7) % 7;
      person(ctx, p.x, p.y, 0.2, { ...callerLook, pose: s < 4 ? 'point' : 'sit', arms: s < 4 ? [1.4 + Math.sin(t * 5) * 0.2, 0.5] : undefined, dir: 'l' }, t);
      if (!Q.detail) return;
      const line = bearOClock(t) ? 'Hold on. There\'s a bear.' : s < 3.5 ? LINES[Math.floor(t / 7) % LINES.length] : null;
      if (line) speech(ctx, p.x, p.y, 2.75, line, { size: 0.36 });
    }, { bias: 0.6 });
    // The credenza nobody opens: a door slid a crack open, a white feather in the gap,
    // another on the carpet. Inside, the offsite planning: a goose and a
    // lantern.
    const CZ = { x0: 10.3, x1: 12.6, y0: 14.7, y1: 15.7, h: 1.45 };
    // A rattle for a second or so every 13, and a honk after it.
    const cyc = (t) => ((t % 13) + 13) % 13;
    const rattleK = (t) => (cyc(t) < 1.2 ? Math.sin(cyc(t) * 38) * (1 - cyc(t) / 1.2) : 0);
    const rattling = (t) => cyc(t) < 1.2;
    const honkNow = (t) => cyc(t) > 0.7 && cyc(t) < 2.3;
    const walnut = mix(C.brown, C.ink, 0.15);
    const credenza = R.poke({ id: 'credenza', at: [11.7, 15.4, 0.8], r: 0.9, say: 'VISION 2030. Do not open until 2030.' });
    R.thing(11.45, 14.75, (ctx) => {
      const { x0, x1, y0, y1, h } = CZ;
      box(ctx, x0, y0, 0, x1 - x0, y1 - y0, h, walnut, { flat: true, lw: 0.03, top: tint(walnut, 0.12) });
      qx(ctx, x0 + 0.06, x1 - 0.06, y1 - 0.05, 0.08, h - 0.08, C.ink, { stroke: false });
      // On top: binders from the last offsite, and a bowl of wax fruit.
      for (let i = 0; i < 4; i++) box(ctx, x0 + 0.2 + i * 0.13, y0 + 0.2, h, 0.11, 0.55, 0.45, [C.red, C.navy, C.red, C.mustard][i], { flat: true, lw: 0.015 });
      lettering(ctx, 'x', x0 + 0.46, y0 + 0.751, h + 0.25, 'OFFSITE', 0.06, C.white);
      disc(ctx, x1 - 0.5, (y0 + y1) / 2, h, 0.25, C.white, { lw: 0.02 });
      for (const [dx, dy, c] of [[-0.08, 0, C.red], [0.08, -0.05, C.leaf], [0, 0.08, C.mustard]]) { const [X, Y] = P3(x1 - 0.5 + dx, (y0 + y1) / 2 + dy, h + 0.08); ctx.beginPath(); ctx.arc(X, Y, 0.08, 0, Math.PI * 2); paint(ctx, c, { lw: 0.015 }); }
    });
    R.goose((t) => ({ x: 11.85, y: 15.2, z: 0.1, dir: 'l', pose: 'sit', hidden: credenza.k() < 0.5 }),
      { scale: 0.75, kind: 'poke', inside: credenza, hint: 'The boardroom\'s cupboard has been planning an offsite of its own.' });
    R.thing(11.45, 15.78, (ctx, t) => {
      const { x0, x1, y1, h } = CZ, k = credenza.k(), w = (x1 - x0) / 2, mid = x0 + w;
      if (k > 0.3) {
        // The lantern, beside the goose.
        cylinder(ctx, x1 - 0.2, y1 - 0.3, 0.1, 0.09, 0.25, C.mustard);
        glow(ctx, x1 - 0.2, y1 - 0.3, 0.25, 0.6, C.butter, k * 0.8);
      }
      // Sliding doors: the left one fixed, the right one slid a crack open
      // (a feather in the gap), or right across in front of the left.
      qx(ctx, x0 + 0.03, mid + 0.02, y1 + 0.01, 0.06, h - 0.06, tint(walnut, 0.1), { lw: 0.03 });
      // Shut, it's ajar a good hand's width; now and then it rattles.
      const rat = k < 0.1 ? rattleK(t) : 0;
      const dx = -0.3 + rat * 0.05 - k * (w - 0.32);
      qx(ctx, mid + dx, x1 - 0.03 + dx, y1 + 0.04, 0.06, h - 0.06, tint(walnut, 0.05), { lw: 0.03 });
      if (Q.detail) {
        qx(ctx, mid - 0.16, mid - 0.1, y1 + 0.02, 0.5, 0.7, C.mustard, { stroke: false });
        qx(ctx, mid + dx + 0.08, mid + dx + 0.14, y1 + 0.05, 0.5, 0.7, C.mustard, { stroke: false });
      }
      if (k < 0.1) {
        // The feather, caught in the gap, sticking well out.
        const [X, Y] = P3(x1 - 0.17, y1 + 0.06, 0.78);
        ctx.save(); ctx.translate(X, Y); ctx.rotate(0.5 + Math.sin(t * 1.3) * 0.08 + rat * 0.15);
        ctx.beginPath(); ctx.ellipse(0, -0.22, 0.1, 0.28, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.025 });
        ctx.beginPath(); ctx.moveTo(0, 0.08); ctx.lineTo(0, -0.46); ctx.strokeStyle = C.grey; ctx.lineWidth = 0.02; ctx.stroke();
        ctx.restore();
        if (rattling(t) && Q.detail) {
          // Thump lines off its top corners, as Marketing's swag closet.
          const [TX, TY] = P3((x0 + x1) / 2, y1, h + 0.25);
          ctx.strokeStyle = C.ink; ctx.lineWidth = 0.04; ctx.lineCap = 'round';
          ctx.beginPath();
          for (const sx of [-1, 1]) { ctx.moveTo(TX + sx * 0.9, TY - 0.05); ctx.lineTo(TX + sx * 1.1, TY - 0.25); ctx.moveTo(TX + sx * 0.95, TY + 0.12); ctx.lineTo(TX + sx * 1.2, TY + 0.04); }
          ctx.stroke();
        }
        if (honkNow(t)) speech(ctx, x1 - 0.3, y1, h + 0.3, 'honk', { size: 0.32 });
      }
      box(ctx, x0 - 0.02, y1 - 0.06, h - 0.07, x1 - x0 + 0.04, 0.12, 0.07, tint(walnut, 0.12), { flat: true, lw: 0.02 });
    }, { anim: true });
    // The other feather, on the carpet.
    R.rug((ctx) => {
      const [X, Y] = P3(11.0, 16.2, 0.01);
      ctx.save(); ctx.translate(X, Y); ctx.scale(1, 0.55); ctx.rotate(1.1);
      ctx.beginPath(); ctx.ellipse(0, 0, 0.07, 0.2, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.02 });
      ctx.restore();
    });

    // ---------- Walt's office, kept as it was ----------
    // He "stepped back" to Vermont in 2021. The putting green, the signed
    // guitar, the maple syrup, the tractor; and Bev, who still dusts it all
    // every day and putts on his green at lunch.
    room(R, 0.4, 20.4, 7.4, 25.6, null, { door: 5, back: true, table: false });
    R.rug((ctx) => {
      // A buffalo check rug under the desk, and the putting green.
      const red = INK.maple, dk = shade(INK.maple, 0.55);
      rect(ctx, 1.2, 20.65, 4.4, 2.0, 0, red, { lw: 0.03 });
      for (let i = 0; i < 11; i++) for (let j = 0; j < 5; j++) if ((i + j) % 2 === 0) rect(ctx, 1.2 + i * 0.4, 20.65 + j * 0.4, 0.4, 0.4, 0, dk, { stroke: false });
      rect(ctx, 1.6, 22.85, 4.7, 2.3, 0, shade(C.green, 0.1), { lw: 0.03 });
      rect(ctx, 1.75, 23.0, 4.4, 2.0, 0, C.leaf, { stroke: false, dots: shade(C.leaf, 0.3), density: 0.12 });
      disc(ctx, 5.4, 24.0, 0.005, 0.11, C.ink, { stroke: false });
      lettering(ctx, 'x', 3.9, 20.4, 1.7, 'WALT. BACK SOON.', 0.22, alpha(C.ink, 0.5), 'Bagel Fat One');
    });
    // The flag in the cup.
    R.thing(5.42, 24.02, (ctx) => {
      line3(ctx, [[5.4, 24.0, 0], [5.4, 24.0, 1.4]], C.ink, 0.04);
      face(ctx, [[5.4, 24.0, 1.4], [5.4, 24.0, 1.1], [5.85, 23.85, 1.25]], C.red, { lw: 0.02 });
    });
    R.thing(3.2, 22.2, (ctx) => waltDesk(ctx));
    R.thing(4.46, 21.96, (ctx, t) => screensaver(ctx, t), { anim: true });
    const drawerPoke = R.poke({ id: 'drawer', at: [3.2, 22.4, 0.95], r: 0.8, say: 'Walt\'s drawer. He\'ll want this back.' });
    R.thing(3.2, 22.85, (ctx) => drawer(ctx, drawerPoke.k()), { anim: true });
    R.find({ id: 'toupee', label: 'A toupee', kind: 'poke', inside: drawerPoke, at: [3.2, 22.45, 1.0], r: 0.8, hint: 'The founder left something in his desk drawer that he used to wear.' });
    // His chair, his fishing hat hung on it.
    R.thing(3.2, 20.95, (ctx) => {
      drawChairY(ctx, 3.2, 20.95, 0, shade(C.brown, 0.15), -1);
      // His fishing hat, on the corner of it.
      const [X, Y] = P3(3.4, 20.62, 1.42);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.22, 0.08, 0, 0, Math.PI * 2); paint(ctx, mix(C.green, C.wood, 0.4), { lw: 0.02 });
      ctx.beginPath(); ctx.ellipse(X, Y - 0.06, 0.13, 0.1, 0, Math.PI, 0); paint(ctx, mix(C.green, C.wood, 0.4), { lw: 0.02 });
    });
    // The syrup shelf, in stretches so whoever's dusting it sorts right.
    for (const [y0, y1, s] of [[21.0, 22.0, 1], [22.0, 23.0, 7], [23.0, 24.0, 13], [24.0, 24.9, 19]]) R.thing(1.2, y1, (ctx) => syrupShelf(ctx, y0, y1, s));
    R.thing(1.0, 23.95, (ctx) => {
      tractorPhoto(ctx);
      // A wheel of cheddar.
      cylinder(ctx, 0.9, 24.4, 1.3, 0.2, 0.14, C.butter, { top: tint(C.butter, 0.2) });
    });
    const guitarPoke = R.poke({ id: 'guitar', at: [6.6, 21.3, 1.3], r: 0.8, say: 'Signed "Dave". Walt says Dave was big.' });
    R.thing(6.6, 21.3, (ctx) => guitar(ctx, 6.6, 21.3));
    R.thing(6.61, 21.31, (ctx, t) => strum(ctx, 6.6, 21.3, t, guitarPoke.k()), { anim: true });
    // Bev: dusting her round (the guitar, the desk, the syrup, the tractor),
    // putting at lunch, to the window at bear o'clock.
    const BEV = [[6.1, 21.95, 'r'], [5.0, 22.8, 'l'], [2.0, 23.0, 'l'], [2.0, 24.35, 'l']];
    const bevLook = folk(550, { top: C.lilac, bottom: C.navy, dress: true, style: 'curly', hair: HAIR[4] });
    const lunch = (t) => { const h = H(t); return h >= 12.1 && h < 13.4; };
    const PUTT = 4.5, cupX = 5.4;
    const putt = (t) => {
      const s = ((t % PUTT) + PUTT) % PUTT, n = Math.floor(t / PUTT) % 4;
      const end = [0.8, 0.9, 1.12, 1][n];
      const k = clamp((s - 0.5) / 2);
      const e = 1 - Math.pow(1 - k, 2);
      return { s, k, sunk: n === 3 && k >= 1, x: 2.9 + (cupX - 2.9) * e * end, y: 24.2 - 0.2 * e * end };
    };
    const bevAt = (t) => {
      if (!seated(t, 0.2)) return { x: 3, y: 23, gone: true };
      let p;
      if (lunch(t)) p = { x: 2.5, y: 24.2, dir: 'r', pose: 'putt' };
      else {
        const dust = 2.6, walk = 2.0, per = dust + walk, n = BEV.length;
        const s = ((t % (per * n)) + per * n) % (per * n), i = Math.floor(s / per), u = s - i * per;
        const a = BEV[i], b = BEV[(i + 1) % n];
        if (u < dust) p = { x: a[0], y: a[1], dir: a[2], pose: 'dust' };
        else {
          const k = (u - dust) / walk;
          p = { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, dir: (b[0] - b[1]) - (a[0] - a[1]) >= 0 ? 'r' : 'l', pose: 'walk' };
        }
      }
      const r = rushK(t, 2.4, 0.5);
      if (r > 0) return { x: p.x + (3.6 - p.x) * r, y: p.y + (25.0 - p.y) * r, dir: 'r', pose: r < 1 ? 'run' : 'point' };
      return p;
    };
    const duster = (a) => (ctx, t) => {
      const hx = 0.22 + Math.sin(a) * 0.72 - 0.35, hy = Math.cos(a) * 0.72 - 0.3;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + 0.25, hy - 0.35); ctx.strokeStyle = C.brown; ctx.lineWidth = 0.05; ctx.stroke();
      ctx.beginPath(); ctx.arc(hx + 0.3 + Math.sin(t * 12) * 0.03, hy - 0.45, 0.14, 0, Math.PI * 2); paint(ctx, C.pink, { lw: 0.02, dots: shade(C.pink, 0.4), density: 0.4 });
    };
    const putter = (sw) => (ctx) => {
      const hx = 0.12 + sw * 0.2, hy = 0.38;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + 0.3 + sw * 0.5, 1.2); ctx.strokeStyle = C.grey; ctx.lineWidth = 0.04; ctx.stroke();
      ctx.beginPath(); ctx.rect(hx + 0.24 + sw * 0.5, 1.15, 0.2, 0.08); paint(ctx, C.ink, { lw: 0.01 });
    };
    R.mover(bevAt, (ctx, t, p) => {
      if (p.gone) return;
      if (p.pose === 'dust') {
        const a = 1.7 + Math.sin(t * 9) * 0.35;
        person(ctx, p.x, p.y, 0, { ...bevLook, pose: 'stand', arms: [a, 0.2], hold: duster(a), dir: p.dir }, t);
      } else if (p.pose === 'putt') {
        const { s, sunk } = putt(t);
        const sw = s < 0.5 ? -Math.sin((s / 0.5) * Math.PI) * 0.4 : 0;
        if (sunk && s > 2.6) person(ctx, p.x, p.y, 0, { ...bevLook, pose: 'cheer', dir: 'r' }, t);
        else person(ctx, p.x, p.y, 0, { ...bevLook, pose: 'stand', arms: [0.35 + sw, 0.3 + sw], hold: putter(sw), dir: 'r' }, t);
      } else person(ctx, p.x, p.y, 0, { ...bevLook, pose: p.pose, dir: p.dir }, t);
    }, { bias: 0.1 });
    // The ball (rolling at lunch), and Walt's putter leaning on the shelf
    // when Bev hasn't got it.
    R.mover((t) => {
      if (!lunch(t) || !seated(t, 0.2)) return { x: 3.0, y: 24.45, rest: true };
      const b = putt(t);
      return { x: b.x, y: b.y, sunk: b.sunk };
    }, (ctx, t, p) => {
      if (p.rest) {
        line3(ctx, [[1.3, 23.3, 0.05], [1.3, 23.15, 1.25]], C.grey, 0.05);
        box(ctx, 1.25, 23.2, 0, 0.3, 0.12, 0.08, C.ink, { flat: true, stroke: false });
      }
      if (p.sunk) return;
      const [X, Y] = P3(p.x, p.y, 0.07);
      ctx.beginPath(); ctx.arc(X, Y, 0.075, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.02 });
    });

    // ---------- The assistants' desks by the front windows ----------
    const front = pod(R, 11.6, 'front', 3);
    staff(R, front, 510, { empty: [2], kinds: ['email', 'golf', 'calendar', 'shop', 'email', 'calendar'] });
  },
};
