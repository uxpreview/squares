// The Bridge: the bow end of the Sun Deck, open air, tapering to the point.
// The wheel and the helm console, the radar mast with its lookout and horn,
// the captain's monitors (CCTV of every deck), the side console, the flags,
// and at the very tip a couple doing the famous pose all day, with a queue
// of couples waiting their turn. Captain Stubbs (on the day's clock) stands
// at the wheel, green; the first officer steers with one finger.
// Keep the id: it's in links and saves.
import {
  C, Q, box, rect, disc, cylinder, face, poly, paint, person, folk, planks, plant, alpha, shade, tint, SKIN, HAIR,
} from '../../../engine/art.js';
import { route, particles, pulse, ease, clamp } from '../../../engine/actors.js';
import { ZK } from '../../../engine/iso.js';
import { deck, outline, lifeboat } from '../ship.js';
import { HOUR } from '../plan.js';
import { INK, MAT, at, wrap, hourOf, green, queasy, COSTUME, CHASE, chase, chaseOpen, caught } from '../style.js';
import { P, lettering, board, lifebuoy, bucket, gull, CREW_LOOK, onY, onX, words, inked, hand } from '../kit.js';

// ---------- Little drawing helpers (in this area's own units) ----------
// Someone who stays on the bridge, drawn every frame. o.pose(t) returns the
// person's changing options (arms, pose, dir); o.after draws what they hold.
function body(R, x, y, look, o = {}) {
  R.thing(x, y, (ctx, t) => {
    const e = o.pose ? o.pose(t) : {};
    const k = green(t, o.sick);
    const z = o.z || 0;
    person(ctx, x, y, z, { pose: 'stand', dir: 'r', ...look, skin: queasy(look.skin, k), ...e }, t);
    if (o.after) o.after(ctx, t, e, z);
  }, { anim: true, ...(o.depth != null ? { depth: o.depth } : {}) });
}

// A white peaked cap for the officers (the captain's, from the style sheet).
const CAP = COSTUME.captain.face;

// A Green Mermaid held in the hand (person units: the hand's at the origin).
function mermaidInHand(ctx) {
  ctx.beginPath();
  ctx.moveTo(-0.07, -0.34); ctx.lineTo(-0.05, 0); ctx.lineTo(0.05, 0); ctx.lineTo(0.07, -0.34);
  ctx.closePath();
  paint(ctx, INK.queasyGreen, { lw: 0.02 });
  if (!Q.detail) return;
  ctx.beginPath();
  ctx.moveTo(-0.02, -0.5); ctx.quadraticCurveTo(0.1, -0.58, 0.22, -0.48); ctx.closePath();
  paint(ctx, INK.flamingo, { lw: 0.015 });
}

// ---------- The wheel ----------
function wheel(ctx, cx, y, cz, r, ang) {
  onY(ctx, cx, y, cz, (g) => {
    g.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const a = ang + (i * Math.PI) / 4, c = Math.cos(a), s = Math.sin(a);
      g.beginPath(); g.moveTo(c * 0.1, s * 0.1); g.lineTo(c * (r + 0.3), s * (r + 0.3));
      if (Q.lines) { g.strokeStyle = C.ink; g.lineWidth = 0.13; g.stroke(); }
      g.strokeStyle = INK.teak; g.lineWidth = 0.07; g.stroke();
      g.beginPath(); g.moveTo(c * (r + 0.1), s * (r + 0.1)); g.lineTo(c * (r + 0.3), s * (r + 0.3));
      if (Q.lines) { g.strokeStyle = C.ink; g.lineWidth = 0.17; g.stroke(); }
      g.strokeStyle = MAT.teakDark; g.lineWidth = 0.11; g.stroke();
    }
    g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2);
    if (Q.lines) { g.strokeStyle = C.ink; g.lineWidth = 0.2; g.stroke(); }
    g.strokeStyle = MAT.teakDark; g.lineWidth = 0.13; g.stroke();
    g.strokeStyle = MAT.brass; g.lineWidth = 0.03; g.stroke();
    g.beginPath(); g.arc(0, 0, 0.15, 0, Math.PI * 2);
    paint(g, MAT.brass, { lw: 0.03 });
  });
}


// ---------- The monitors ----------
// The CCTV bank: a steel panel of six screens over a desk, with printouts and
// sticky notes along the strip between the rows. Top left at (4, 1.6, 3.7).
const MON = { x: 4, y: 1.6, top: 3.7 };
const SCREENS = [
  ['CAM 1 BUFFET', 0.2, 0.25], ['CAM 2 POOL', 1.65, 0.25], ['CAM 3 CASINO', 3.1, 0.25],
  ['CAM 4 CABIN 7', 0.2, 1.7], ['CAM 5 ENGINES', 1.65, 1.7], ['CAM 6 SICK BAY', 3.1, 1.7],
];
const SW = 1.25, SH = 0.62;

// A printed frame taped to the panel: a grainy grey picture, a time in the
// corner. u, v: top left (panel units); art(g) draws the picture in it.
function printout(g, u, v, w, h, time, art) {
  g.save();
  g.translate(u, v);
  g.beginPath(); g.rect(0, 0, w, h);
  paint(g, C.white, { lw: 0.02 });
  g.beginPath(); g.rect(0.04, 0.04, w - 0.08, h - 0.12);
  paint(g, C.grey, { stroke: false });
  g.save(); g.clip(); art(g, w - 0.08, h - 0.12); g.restore();
  if (Q.detail) {
    g.beginPath(); g.rect(0.04, 0.04, w - 0.08, h - 0.12);
    g.fillStyle = shade(C.grey, 0.1); g.globalAlpha = 0.5; g.fill(); g.globalAlpha = 1;
    // the grain
    g.beginPath(); g.rect(0.04, 0.04, w - 0.08, h - 0.12);
    paint(g, null, { stroke: false, dots: C.ink, density: 0.18 });
    words(g, time, w - 0.08, 0.1, 0.075, C.white, 'right', 800);
    // a piece of tape at the top
    g.save(); g.translate(w / 2, 0); g.rotate(-0.08);
    g.fillStyle = alpha(C.butter, 0.75); g.fillRect(-0.13, -0.04, 0.26, 0.08);
    g.restore();
  }
  g.restore();
}
function sticky(g, u, v, s, color, lines, tilt) {
  g.save();
  g.translate(u + s / 2, v + s / 2);
  g.rotate(tilt);
  g.beginPath(); g.rect(-s / 2, -s / 2, s, s);
  paint(g, color, { lw: 0.02 });
  lines.forEach((l, i) => words(g, l, 0, (i - (lines.length - 1) / 2) * 0.09, 0.065, C.ink, 'center', 800));
  g.restore();
}

// A bit of paper taped up between the screens, in colour (not a camera
// still): u, v its top left, tilted; art(g, w, h) draws on it.
function taped(g, u, v, w, h, tilt, art) {
  g.save();
  g.translate(u + w / 2, v + h / 2); g.rotate(tilt); g.translate(-w / 2, -h / 2);
  g.beginPath(); g.rect(0, 0, w, h);
  paint(g, C.white, { lw: 0.02 });
  if (Q.detail) {
    g.save(); g.beginPath(); g.rect(0.03, 0.03, w - 0.06, h - 0.06); g.clip(); art(g, w, h); g.restore();
    g.save(); g.translate(w / 2, 0); g.rotate(-0.08);
    g.fillStyle = alpha(C.butter, 0.75); g.fillRect(-0.13, -0.04, 0.26, 0.08);
    g.restore();
  }
  g.restore();
}

// ---------- The stress gecko ----------
// A squeezy rubber gecko, green, sitting up on the console: big painted eyes,
// splayed toes, a curl of a tail. k: how squeezed (0..1).
function stressGecko(ctx, x, y, z, k) {
  const [X, Y] = P(x, y, z);
  const sq = 1 - k * 0.35;
  const skin = INK.queasyGreen, dark = shade(INK.queasyGreen, 0.35);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(1 + k * 0.25, sq);
  // The tail, curling up behind.
  ctx.beginPath();
  ctx.moveTo(-0.12, -0.06); ctx.quadraticCurveTo(-0.42, -0.02, -0.4, -0.2); ctx.quadraticCurveTo(-0.38, -0.3, -0.3, -0.26);
  ctx.lineCap = 'round';
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.stroke(); }
  ctx.strokeStyle = skin; ctx.lineWidth = 0.06; ctx.stroke();
  // Legs, splayed, round toe pads.
  for (const [a, b, c] of [[-0.1, -0.05, -0.2], [0.1, -0.06, 0.2]]) {
    ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, 0);
    if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.08; ctx.stroke(); }
    ctx.strokeStyle = dark; ctx.lineWidth = 0.05; ctx.stroke();
    ctx.beginPath(); ctx.arc(c, 0, 0.035, 0, Math.PI * 2); paint(ctx, skin, { lw: 0.012 });
  }
  // The body, a fat squeezy bean.
  ctx.beginPath(); ctx.ellipse(0, -0.14, 0.17, 0.13, 0, 0, Math.PI * 2);
  paint(ctx, skin, { lw: 0.025, dots: dark, density: 0.12 });
  // The head, big, and the eyes on top of it.
  ctx.beginPath(); ctx.ellipse(0.13, -0.3, 0.14, 0.11, -0.2, 0, Math.PI * 2);
  paint(ctx, skin, { lw: 0.025 });
  const pop = 1 + k * 0.6;
  for (const u of [0.06, 0.2]) {
    ctx.beginPath(); ctx.arc(u, -0.39, 0.05 * pop, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.015 });
    ctx.beginPath(); ctx.arc(u + 0.01, -0.39, 0.022 * pop, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
  }
  if (Q.detail) {
    ctx.beginPath(); ctx.arc(0.15, -0.28, 0.06, 0.3, Math.PI - 0.3);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.015; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-0.06, -0.2, 0.05, 0.025, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = alpha(C.white, 0.5); ctx.fill();
  }
  ctx.restore();
}

// ---------- The Lizard Cam ----------
// Security put it up this morning: a plan of the ship, deck by deck, and a
// green dot where the iguana is (the sighting the player is on, style.js's
// chase). Caught, the dot sits at the Casino. A hint for anyone who looks.
const LC = { x: 4.5, y: 1.3, top: 5.6, w: 3.5, h: 1.6 };
const DECKS = [
  ['SUN', [['waterslide', 0, 16, 'THE WATERSLIDE'], ['pool', 16, 48, 'THE POOL'], ['bridge', 48, 80, 'THE BRIDGE']]],
  ['CABINS', [['cabins', 0, 48, 'THE CABINS'], ['adults-only', 48, 80, 'ADULTS ONLY']]],
  ['PROM', [['theater', 0, 16, 'THE THEATER'], ['buffet', 16, 48, 'THE BUFFET'], ['casino', 48, 80, 'THE CASINO']]],
  ['CREW', [['engine-room', 0, 16, 'THE ENGINE ROOM'], ['crew-bar', 16, 48, 'THE CREW BAR'], ['sick-bay', 48, 80, 'THE SICK BAY']]],
];
function lizardCam(g, t) {
  const { w: W, h: H } = LC;
  const lit = tint(C.sky, 0.2), dim = shade(C.sky, 0.35);
  g.beginPath(); g.rect(0, 0, W, H);
  g.fillStyle = C.night; g.fill();
  g.save(); g.clip();
  const got = caught();
  const zone = got ? 'casino' : CHASE[chase.step].zone;
  const live = !got && chaseOpen(chase.step, t);
  // The ship, a strip a deck, the bow tapering to the right.
  const u = (x) => 0.62 + (x / 80) * (W - 0.75);
  const S0 = 0.3, SH = 0.2, GAP = 0.27;
  const hull = (v0) => {
    g.beginPath();
    g.moveTo(u(0), v0); g.lineTo(u(62), v0); g.lineTo(u(80), v0 + SH / 2); g.lineTo(u(62), v0 + SH); g.lineTo(u(0), v0 + SH);
    g.closePath();
  };
  let dot = null;
  DECKS.forEach(([name, areas], d) => {
    const v0 = S0 + d * GAP;
    hull(v0);
    g.fillStyle = alpha(lit, 0.14); g.fill();
    g.save(); g.clip();
    for (const [id, x0, x1] of areas) {
      if (id === zone) {
        g.fillStyle = alpha(INK.queasyGreen, got || live ? 0.4 : 0.22);
        g.fillRect(u(x0), v0, u(x1) - u(x0), SH);
        dot = [u((x0 + Math.min(x1, 70)) / 2), v0 + SH / 2, areas.find((a) => a[0] === id)[3]];
      }
      if (x0 > 0) { g.fillStyle = dim; g.fillRect(u(x0) - 0.01, v0, 0.02, SH); }
    }
    g.restore();
    hull(v0);
    g.strokeStyle = lit; g.lineWidth = 0.02; g.stroke();
    words(g, name, 0.55, v0 + SH / 2 + 0.005, 0.075, lit, 'right', 800);
  });
  // The dot: blinking while it's there, a ping going out from it.
  if (dot) {
    const [X, Y] = dot;
    const k = (t * 0.8) % 1;
    if (!got) {
      g.beginPath(); g.arc(X, Y, 0.06 + k * 0.2, 0, Math.PI * 2);
      g.strokeStyle = alpha(INK.queasyGreen, 1 - k); g.lineWidth = 0.025; g.stroke();
    }
    if (got || Math.sin(t * 7) > -0.4) {
      g.beginPath(); g.arc(X, Y, 0.075, 0, Math.PI * 2);
      g.fillStyle = INK.queasyGreen; g.fill();
      g.strokeStyle = C.white; g.lineWidth = 0.015; g.stroke();
    }
  }
  // The title, and what it says underneath.
  words(g, 'LIZARD CAM', 0.1, 0.14, 0.15, C.butter, 'left', 900);
  if (Math.sin(t * 3) > 0) { g.beginPath(); g.arc(W - 0.12, 0.13, 0.04, 0, Math.PI * 2); g.fillStyle = C.red; g.fill(); }
  words(g, 'LIVE', W - 0.2, 0.14, 0.08, C.white, 'right', 900);
  if (got) {
    if (Math.sin(t * 5) > -0.5) words(g, 'CAUGHT', W / 2, H - 0.16, 0.2, C.butter, 'center', 900, 'Bagel Fat One');
  } else if (dot) {
    words(g, `${live ? "IT'S IN" : 'HEADED FOR'}: ${dot[2]}`, W / 2, H - 0.15, 0.1, live ? INK.queasyGreen : lit, 'center', 900);
  }
  // A roll of interference, like the rest.
  const sv = ((t * 0.25) % 1) * (H + 0.2) - 0.1;
  g.fillStyle = alpha(C.white, 0.06); g.fillRect(0, sv, W, 0.1);
  g.restore();
}

// The still pictures: what's taped up between the screens (drawn once).
function monitorPanel(ctx) {
  box(ctx, MON.x, 0.9, 0, 4.5, 0.7, MON.top, MAT.steelDark, { top: MAT.steel, dens: 0.18 });
  // The desk in front, teak topped.
  box(ctx, MON.x - 0.1, 1.6, 0, 4.7, 1.0, 1.05, MAT.steel, { top: INK.teak });
  onY(ctx, MON.x, MON.y, MON.top, (g) => {
    // Bezels for the six screens.
    for (const [, u, v] of SCREENS) {
      g.beginPath(); g.rect(u - 0.06, v - 0.06, SW + 0.12, SH + 0.12);
      paint(g, C.black, { lw: 0.03 });
    }
    // The strip between the rows: the stills and the notes.
    sticky(g, 0.18, 1.06, 0.36, C.butter, ["IT'S", 'FINE'], -0.1);
    // The 6:52 still: the salad bar, a green blur in one of the bowls.
    printout(g, 0.9, 1.0, 0.6, 0.5, '06:52', (p, w, h) => {
      p.fillStyle = C.greyLight; p.fillRect(0, h * 0.55, w, h * 0.12); // the counter
      p.strokeStyle = C.white; p.lineWidth = 0.02; // the sneeze guard
      p.beginPath(); p.moveTo(0, h * 0.3); p.lineTo(w, h * 0.3); p.stroke();
      p.fillStyle = shade(C.grey, 0.3);
      for (let i = 0; i < 4; i++) { p.beginPath(); p.ellipse(0.08 + i * 0.13, h * 0.55, 0.05, 0.022, 0, 0, Math.PI * 2); p.fill(); }
      p.fillStyle = alpha(INK.queasyGreen, 0.45);
      p.beginPath(); p.ellipse(0.35, h * 0.47, 0.1, 0.05, -0.2, 0, Math.PI * 2); p.fill();
      p.fillStyle = alpha(INK.queasyGreen, 0.9);
      p.beginPath(); p.ellipse(0.33, h * 0.48, 0.055, 0.03, -0.2, 0, Math.PI * 2); p.fill();
    });
    // The rest of the strip is anything but photos (the 6:52 still is the
    // only grey picture up here): a postcard, the crossword, a kid's drawing.
    taped(g, 1.72, 1.02, 0.6, 0.46, 0.06, (p, w, h) => { // a postcard from the port
      p.fillStyle = C.sky; p.fillRect(0, 0, w, h * 0.6);
      p.fillStyle = C.teal; p.fillRect(0, h * 0.6, w, h * 0.2);
      p.fillStyle = C.butter; p.fillRect(0, h * 0.8, w, h * 0.2);
      p.strokeStyle = C.brown; p.lineWidth = 0.03;
      p.beginPath(); p.moveTo(w * 0.62, h * 0.86); p.quadraticCurveTo(w * 0.55, h * 0.5, w * 0.62, h * 0.25); p.stroke();
      p.fillStyle = C.leaf;
      for (const a of [-2.6, -1.9, -1.2, -0.5]) { p.beginPath(); p.ellipse(w * 0.62 + Math.cos(a) * 0.08, h * 0.25 + Math.sin(a) * 0.03 + 0.02, 0.09, 0.025, a + 1.57, 0, Math.PI * 2); p.fill(); }
      words(p, 'WISH YOU', w * 0.28, 0.08, 0.06, C.white, 'center', 900);
      words(p, 'WERE HERE', w * 0.28, 0.15, 0.06, C.white, 'center', 900);
    });
    sticky(g, 2.44, 1.1, 0.34, INK.flamingo, ['LEFT =', 'PORT'], 0.12);
    taped(g, 2.92, 1.0, 0.54, 0.5, -0.05, (p, w, h) => { // the crossword, one clue done
      const n = 6, s = Math.min(w, h - 0.08) / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        if ((i * 7 + j * 3) % 5 === 0) { p.fillStyle = C.ink; p.fillRect(0.04 + i * s, 0.04 + j * s, s, s); }
      }
      p.strokeStyle = alpha(C.ink, 0.5); p.lineWidth = 0.008;
      for (let i = 0; i <= n; i++) {
        p.beginPath(); p.moveTo(0.04 + i * s, 0.04); p.lineTo(0.04 + i * s, 0.04 + n * s);
        p.moveTo(0.04, 0.04 + i * s); p.lineTo(0.04 + n * s, 0.04 + i * s); p.stroke();
      }
      words(p, 'AHOY', 0.04 + s * 2.5, 0.04 + s * 1.5, 0.05, C.navy, 'center', 900);
    });
    taped(g, 3.6, 1.04, 0.52, 0.46, 0.1, (p, w, h) => { // a kid's drawing of the captain, green
      p.strokeStyle = C.navy; p.lineWidth = 0.02; p.lineCap = 'round';
      p.beginPath(); p.moveTo(w * 0.5, h * 0.42); p.lineTo(w * 0.5, h * 0.72);
      p.moveTo(w * 0.32, h * 0.5); p.lineTo(w * 0.68, h * 0.5);
      p.moveTo(w * 0.5, h * 0.72); p.lineTo(w * 0.38, h * 0.92); p.moveTo(w * 0.5, h * 0.72); p.lineTo(w * 0.62, h * 0.92);
      p.stroke();
      p.beginPath(); p.arc(w * 0.5, h * 0.3, 0.07, 0, Math.PI * 2); p.fillStyle = INK.queasyGreen; p.fill(); p.stroke();
      p.fillStyle = C.white; p.fillRect(w * 0.38, h * 0.1, w * 0.24, 0.04);
      words(p, 'MY CAPTAN', w * 0.5, h - 0.03, 0.05, C.red, 'center', 900);
    });
    words(g, 'EVERY DECK, EVERY MINUTE', 2.25, 0.1, 0.1, C.butter, 'center', 800);
  });
  // The Lizard Cam: a bigger screen on top of the bank, put up this morning.
  box(ctx, LC.x - 0.12, LC.y - 0.25, MON.top, LC.w + 0.24, 0.25, LC.h + 0.3, C.black, { top: MAT.steelDark, flat: true });
  onY(ctx, LC.x, LC.y, LC.top + 0.1, (g) => {
    g.save(); g.translate(LC.w / 2 + 0.95, -0.02); g.rotate(0.06);
    g.beginPath(); g.rect(-0.62, -0.1, 1.24, 0.22); paint(g, C.white, { lw: 0.02 });
    words(g, 'TEMPORARY. DO NOT TOUCH', 0, 0.01, 0.07, INK.funnelRed, 'center', 900);
    g.restore();
  });
  // Things on the desk: a keyboard in front of the officer's stool (at the
  // desk's aft end, so the captain's words never land on his face), a phone,
  // a joystick, the popcorn.
  rect(ctx, 4.05, 1.8, 1.4, 0.4, 1.06, C.black, { lw: 0.02 });
  if (Q.detail) for (let i = 0; i < 6; i++) rect(ctx, 4.13 + i * 0.22, 1.86, 0.16, 0.28, 1.07, C.greyLight, { stroke: false });
  cylinder(ctx, 7.2, 2.0, 1.05, 0.12, 0.08, C.black);
  face(ctx, [[7.2, 2.0, 1.13], [7.2, 2.0, 1.45]], null, { lw: 0.06 });
  disc(ctx, 7.2, 2.0, 1.47, 0.07, C.red, { lw: 0.02 });
  box(ctx, 6.4, 1.8, 1.05, 0.4, 0.55, 0.12, C.black, { flat: true });
  // The popcorn (another bucket), striped, at his elbow.
  cylinder(ctx, 5.95, 2.25, 1.05, 0.2, 0.36, C.white);
  const [px, py] = P(5.95, 2.25, 1.05);
  if (Q.detail) {
    ctx.fillStyle = C.red;
    for (const dx of [-0.2, 0.04]) ctx.fillRect(px + dx, py - 0.4, 0.1, 0.36);
    for (let i = 0; i < 7; i++) {
      ctx.beginPath(); ctx.arc(px - 0.2 + i * 0.07, py - 0.46 - (i % 2) * 0.06, 0.06, 0, Math.PI * 2);
      paint(ctx, C.butter, { lw: 0.015 });
    }
  }
}

// The live pictures on the six screens. hr: the hour of the day.
function cctv(g, i, t, hr) {
  const [name, u, v] = SCREENS[i];
  g.save();
  g.translate(u, v);
  g.beginPath(); g.rect(0, 0, SW, SH);
  g.fillStyle = C.night; g.fill();
  if (!Q.detail) { g.restore(); return; }
  g.save(); g.clip();
  const lit = tint(C.sky, 0.2), dim = shade(C.sky, 0.35);
  const head = (x, y, sick, r = 0.035) => {
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
    g.fillStyle = sick ? INK.queasyGreen : lit; g.fill();
  };
  if (i === 0) { // the buffet: the queue greener by the hour, the salad bar taped off at 1
    g.fillStyle = dim; g.fillRect(0.1, 0.16, 1.05, 0.1);
    for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(0.2 + k * 0.17, 0.16, 0.05, 0.02, 0, 0, Math.PI * 2); g.fillStyle = lit; g.fill(); }
    const n = clamp(Math.floor((hr - 9) / 0.7), 0, 8);
    for (let k = 0; k < 8; k++) head(0.1 + k * 0.14, 0.44 + Math.sin(t * 3 + k) * 0.01, k < n);
    if (hr >= 13) {
      g.strokeStyle = INK.sunYellow; g.lineWidth = 0.03;
      g.beginPath(); g.moveTo(0.05, 0.12); g.lineTo(1.2, 0.3); g.moveTo(0.05, 0.3); g.lineTo(1.2, 0.12); g.stroke();
    }
  } else if (i === 1) { // the pool: a towel on every lounger, nobody on any
    g.fillStyle = shade(C.teal, 0.2); g.fillRect(0.3, 0.08, 0.66, 0.26);
    g.strokeStyle = alpha(lit, 0.6); g.lineWidth = 0.015;
    g.beginPath(); for (let k = 0; k < 3; k++) { const x = 0.35 + ((t * 0.08 + k * 0.2) % 0.55); g.moveTo(x, 0.2); g.lineTo(x + 0.06, 0.2); } g.stroke();
    const towels = [C.coral, INK.sunYellow, C.pink, C.white, C.teal];
    for (let k = 0; k < 5; k++) {
      g.fillStyle = dim; g.fillRect(0.12 + k * 0.21, 0.42, 0.14, 0.08);
      g.fillStyle = towels[k]; g.fillRect(0.14 + k * 0.21, 0.43, 0.08, 0.06);
    }
    if (hr >= 10 && hr < 11) { // the drill: one passenger listening, in a life jacket
      head(1.12, 0.22, false, 0.03);
      g.fillStyle = C.coral; g.fillRect(1.09, 0.25, 0.06, 0.05);
    }
  } else if (i === 2) { // the casino: the wheel spins all day, and at six it's green
    const stop = hr >= 18;
    const a = stop ? 0.26 : t * 4;
    for (let k = 0; k < 12; k++) {
      g.beginPath(); g.moveTo(0.36, 0.32);
      g.arc(0.36, 0.32, 0.22, a + (k * Math.PI) / 6, a + ((k + 1) * Math.PI) / 6);
      g.fillStyle = k === 0 ? MAT.felt : k % 2 ? C.red : C.black; g.fill();
    }
    g.beginPath(); g.arc(0.36, 0.32, 0.07, 0, Math.PI * 2); g.fillStyle = lit; g.fill();
    head(0.85, 0.3, false); g.fillStyle = dim; g.fillRect(0.8, 0.34, 0.1, 0.16);
    if (stop && Math.sin(t * 8) > -0.3) words(g, 'GREEN!', 0.92, 0.12, 0.14, C.butter, 'center', 900);
  } else if (i === 3) { // cabin 7: a new thing out the door every hour
    g.fillStyle = dim; g.fillRect(0, 0.46, SW, 0.16);
    for (let k = 0; k < 4; k++) { g.fillStyle = k === 1 ? lit : shade(C.sky, 0.55); g.fillRect(0.1 + k * 0.3, 0.12, 0.16, 0.3); }
    words(g, '7', 0.48, 0.08, 0.07, C.butter, 'center', 800);
    const s = pulse(t, HOUR) * HOUR;
    if (s < 3) {
      const k = s / 3, what = Math.floor(wrap(t) / HOUR) % 4;
      const x = 0.48 + k * 0.7, y = 0.36 - Math.sin(k * Math.PI) * 0.22;
      g.fillStyle = [C.coral, INK.sunYellow, C.purple, lit][what];
      if (what === 3) head(x, y, false, 0.05); // Ray
      else g.fillRect(x - 0.06, y - 0.04, 0.12, 0.08);
    }
  } else if (i === 4) { // the engine room: the engineer asleep through the alarm
    g.strokeStyle = dim; g.lineWidth = 0.05;
    g.beginPath(); g.moveTo(0.2, 0); g.lineTo(0.2, SH); g.moveTo(1.0, 0); g.lineTo(1.0, SH); g.stroke();
    const sw = Math.sin(t * 1.2) * 0.04;
    g.strokeStyle = lit; g.lineWidth = 0.02;
    g.beginPath(); g.moveTo(0.2, 0.25); g.quadraticCurveTo(0.6 + sw, 0.55, 1.0, 0.25); g.stroke();
    head(0.45 + sw, 0.38, false);
    words(g, 'z', 0.55 + sw, 0.22 - ((t * 0.5) % 1) * 0.1, 0.08, lit);
    if (pulse(t, 5) < 0.4) { g.beginPath(); g.arc(1.12, 0.1, 0.05, 0, Math.PI * 2); g.fillStyle = C.red; g.fill(); }
  } else { // the sick bay: the sign stays at 0, the line grows by the hour
    g.fillStyle = C.white; g.fillRect(0.08, 0.06, 0.34, 0.2);
    words(g, '0', 0.25, 0.165, 0.16, C.red, 'center', 900);
    const n = clamp(Math.floor(hr - 8.5), 0, 9);
    for (let k = 0; k < n; k++) head(0.52 + k * 0.08, 0.42 + Math.sin(t * 2 + k) * 0.01, k % 3 !== 2);
  }
  // A roll of interference down each screen, and the red REC dot.
  const sv = ((t * 0.25 + i * 0.37) % 1) * (SH + 0.2) - 0.1;
  g.fillStyle = alpha(C.white, 0.08); g.fillRect(0, sv, SW, 0.08);
  if (Math.sin(t * 3 + i) > 0) { g.beginPath(); g.arc(SW - 0.07, 0.07, 0.025, 0, Math.PI * 2); g.fillStyle = C.red; g.fill(); }
  words(g, name, 0.05, SH - 0.06, 0.06, C.butter, 'left', 800);
  g.restore();
  g.restore();
}

// ---------- The mast ----------
// The yardarm and the horn sit above the lookout's head (his nest is at 4.2).
const MAST = { x: 2.5, y: 3.5 }, YARD = 6.75, HORN = 7.0;
function mast(ctx) {
  const { x, y } = MAST;
  box(ctx, x - 0.55, y - 0.55, 0, 1.1, 1.1, 0.5, INK.hullWhite);
  box(ctx, x - 0.25, y - 0.25, 0.5, 0.5, 0.5, 6.7, INK.hullWhite, { dens: 0.14 });
  // The yardarm, across the ship.
  box(ctx, x - 0.08, y - 1.4, YARD, 0.16, 2.8, 0.14, INK.hullWhite, { flat: true });
  // Ladder rungs up the front.
  if (Q.detail) for (let z = 0.8; z < 4.2; z += 0.35) face(ctx, [[x + 0.25, y - 0.15, z], [x + 0.25, y + 0.15, z]], null, { lw: 0.05, stroke: MAT.steelDark });
  // The ship's horn, pointing at the bow.
  const [a, b] = P(x + 0.25, y, HORN - 0.15), [c, d] = P(x + 1.3, y, HORN);
  ctx.beginPath();
  ctx.moveTo(a, b - 0.1); ctx.lineTo(c, d - 0.3); ctx.lineTo(c, d + 0.3); ctx.lineTo(a, b + 0.1); ctx.closePath();
  paint(ctx, INK.funnelRed, { lw: 0.04 });
  ctx.beginPath(); ctx.ellipse(c, d, 0.1, 0.3, 0, 0, Math.PI * 2);
  paint(ctx, shade(INK.funnelRed, 0.4), { lw: 0.04 });
  // The radar's pedestal, and a light at the top.
  cylinder(ctx, x, y, 7.2, 0.3, 0.25, MAT.steel);
  // A lifebuoy on the far rail, and the ship's name on another.
  lifebuoy(ctx, 0.9, 0.6, 0.38);
}

// ---------- Moving a layout along ----------
// The forward half (from the wheel to the point) was drawn when the Bridge
// began at world x 56; it now begins at 48, so that half sits DX further
// along. shifted(R, DX) is R with everything moved DX along x: its places,
// its finds and its drawing, so the forward half keeps its own numbers.
const DX = 8;
function shifted(R, dx) {
  const [ox, oy] = P(dx, 0, 0);
  const moved = (draw) => (ctx, t) => { ctx.save(); ctx.translate(ox, oy); draw(ctx, t); ctx.restore(); };
  return {
    rug: (draw, o) => R.rug(moved(draw), o),
    air: (draw, o) => R.air(moved(draw), o),
    thing: (x, y, draw, o = {}) => R.thing(x + dx, y, moved(draw), o.depth != null ? { ...o, depth: o.depth + dx } : o),
    mover: (pos, draw, o) => R.mover(
      (t) => { const p = pos(t); return { ...p, x: p.x + dx }; },
      (ctx, t, p) => { ctx.save(); ctx.translate(ox, oy); draw(ctx, t, { ...p, x: p.x - dx }); ctx.restore(); },
      o,
    ),
    find: (f) => R.find({ ...f, at: [f.at[0] + dx, f.at[1], f.at[2]] }),
    poke: (o) => R.poke({ ...o, at: [o.at[0] + dx, o.at[1], o.at[2]] }),
    decoy: (o) => R.decoy({ ...o, at: [o.at[0] + dx, o.at[1], o.at[2]] }),
  };
}

// ---------- The build ----------
export default {
  id: 'bridge',
  name: 'The Bridge',
  blurb: 'The captain is green at the wheel, so the first officer steers with one finger. The couple on the bow have had their arms out since breakfast.',

  build(R) {
    deck(R, 'bridge', 'sun', { rails: true, grid: false, name: false });
    const pts = outline(R);

    // ---------- The deck ----------
    R.floor((ctx) => {
      ctx.save();
      poly(ctx, pts.map(([x, y]) => [x, y, 0]));
      ctx.clip();
      planks(ctx, INK.teak, 0.7, 0, 0, R.W, R.D);
      ctx.restore();
      poly(ctx, pts.map(([x, y]) => [x, y, 0]));
      ctx.lineWidth = 0.06; ctx.strokeStyle = C.ink; ctx.stroke();
    });

    // ---------- Aft of the helm: the officers' end ----------
    // (x 0 to 8, drawn straight onto R; everything forward of here is on S.)
    // A lifeboat on its davits, reserved with a towel since 5am, like the loungers.
    R.thing(3, 1.4, (ctx) => {
      for (const dx of [1.0, 5.0]) {
        box(ctx, dx - 0.1, 0.1, 0, 0.2, 0.2, 3.3, INK.hullWhite, { flat: true });
        const [a, b] = P(dx, 0.2, 3.3), [c, d] = P(dx, 0.75, 3.3);
        inked(ctx, [[a, b], [c, d]], INK.hullWhite, 0.12);
        const [e, f] = P(dx, 0.75, 2.95);
        ctx.beginPath(); ctx.moveTo(c, d); ctx.lineTo(e, f); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
      }
      lifeboat(ctx, 0.8, 0.15, 2.0, 4.4);
      box(ctx, 2.1, 0.35, 3.26, 1.3, 0.8, 0.05, INK.flamingo, { flat: true, lw: 0.02 });
      face(ctx, [[2.1, 1.15, 3.3], [3.4, 1.15, 3.3], [3.4, 1.18, 2.8], [2.1, 1.18, 2.8]], INK.flamingo, { lw: 0.02 });
      board(ctx, 'x', 3.0, 1.37, 2.55, 0.9, 0.35, 'RESERVED', { size: 0.14, board: C.white, edge: 0.03 });
    });
    // Life jackets, one each. The box says so.
    R.thing(3.2, 5.4, (ctx) => {
      box(ctx, 2.0, 4.5, 0, 1.6, 0.9, 0.8, INK.sunYellow, { top: tint(INK.sunYellow, 0.3) });
      for (let i = 0; i < 3; i++) box(ctx, 2.15 + i * 0.48, 4.62, 0.8, 0.4, 0.6, 0.18, C.coral, { flat: true, lw: 0.02 });
      lettering(ctx, 'x', 2.8, 5.41, 0.52, 'LIFE JACKETS', 0.14);
      lettering(ctx, 'x', 2.8, 5.41, 0.3, 'QTY 2,400', 0.12, INK.funnelRed);
    });
    // The ship's bell: rung on the hour.
    const BELL = { x: 6.8, y: 5.6 };
    const ringing = (t) => { const s = pulse(t, HOUR) * HOUR; return s < 2.5 ? s : -1; };
    const ding = R.poke({ id: 'bell', at: [BELL.x, BELL.y - 0.7, 2.0], r: 0.7, hold: 1.6, sound: 'tick', say: ['DING.', 'DING DING.', 'That means lunch. Or a fire.'] });
    R.thing(BELL.x, BELL.y, (ctx) => {
      face(ctx, [[BELL.x, BELL.y, 0], [BELL.x, BELL.y, 2.4]], null, { lw: 0.08, stroke: MAT.teakDark });
      face(ctx, [[BELL.x, BELL.y, 2.4], [BELL.x, BELL.y - 0.8, 2.4]], null, { lw: 0.08, stroke: MAT.teakDark });
    });
    R.thing(BELL.x, BELL.y + 0.05, (ctx, t) => {
      const s = ringing(t), d = ding.k();
      const sw = s >= 0 ? Math.sin(s * 9) * 0.35 * (1 - s / 2.5) : d > 0 ? Math.sin(t * 9) * 0.35 * d : 0;
      const [X, Y] = P(BELL.x, BELL.y - 0.7, 2.35);
      ctx.save(); ctx.translate(X, Y); ctx.rotate(sw);
      // A ship's bell (a dome, a flared lip, the clapper and its rope), not a
      // lampshade: the shape is what reads when you pinch in.
      ctx.beginPath(); ctx.arc(0, 0.02, 0.06, Math.PI, 0); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-0.12, 0.08); ctx.quadraticCurveTo(-0.13, 0.04, 0, 0.04); ctx.quadraticCurveTo(0.13, 0.04, 0.12, 0.08);
      ctx.quadraticCurveTo(0.14, 0.34, 0.2, 0.42); ctx.quadraticCurveTo(0.3, 0.5, 0.26, 0.52);
      ctx.lineTo(-0.26, 0.52); ctx.quadraticCurveTo(-0.3, 0.5, -0.2, 0.42); ctx.quadraticCurveTo(-0.14, 0.34, -0.12, 0.08);
      ctx.closePath();
      paint(ctx, MAT.brass, { lw: 0.03 });
      ctx.beginPath(); ctx.moveTo(-0.24, 0.47); ctx.lineTo(0.24, 0.47); ctx.strokeStyle = shade(MAT.brass, 0.35); ctx.lineWidth = 0.025; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0.58, 0.05, 0, Math.PI * 2); paint(ctx, shade(MAT.brass, 0.3), { lw: 0.02 });
      inked(ctx, [[0, 0.62], [0.02, 0.9], [-0.03, 1.05]], C.white, 0.04);
      ctx.restore();
    }, { anim: true });
    R.air((ctx, t) => {
      const s = ringing(t), d = ding.k();
      if ((s < 0 && d <= 0) || !Q.detail) return;
      const [X, Y] = P(BELL.x, BELL.y - 0.7, 2.35);
      ctx.globalAlpha = s >= 0 ? 1 - s / 2.5 : d;
      words(ctx, 'DING', X - 0.8, Y - 0.2 - (s >= 0 ? s : (t * 0.6) % 1) * 0.3, 0.34, C.white, 'center', 900);
      ctx.globalAlpha = 1;
    });
    // A telescope on the far rail, and a kid on tiptoe looking for land.
    R.thing(6.6, 1.3, (ctx) => {
      for (const [dx, dy] of [[-0.25, -0.15], [0.25, -0.15], [0, 0.25]]) face(ctx, [[6.6 + dx, 1.3 + dy, 0], [6.6, 1.3, 1.3]], null, { lw: 0.05, stroke: MAT.steelDark });
      const [a, b] = P(6.2, 1.5, 1.35), [c, d] = P(7.1, 0.9, 1.6);
      inked(ctx, [[a, b], [c, d]], MAT.brass, 0.14);
    });
    body(R, 5.9, 1.9, folk(58, { scale: 0.7, top: INK.sunYellow }), {
      sick: at(13.8), pose: () => ({ back: true, dir: 'r', arms: [1.6, 1.4], scale: 0.7 }),
    });
    // Shuffleboard: the officers' court, taken over by a retired couple who
    // read "(AND COUPLES)" on the sign as an invitation. He slides a disc
    // every eight seconds; she keeps score, and cheers when it's a ten.
    const SH = { y: 6.4, x0: 2.3, x1: 7.7 }, SLIDE = 8;
    const STOPS = [6.45, 7.05, 6.2, 7.45, 6.7, 6.35, 5.6];
    const goOf = (t) => Math.floor(wrap(t) / SLIDE);
    const stopOf = (n) => STOPS[n % STOPS.length];
    const slideOf = (t) => (wrap(t) % SLIDE) / SLIDE;
    const ten = (x) => x > 6.25 && x < 6.75;
    R.rug((ctx) => {
      rect(ctx, SH.x0, SH.y - 0.55, SH.x1 - SH.x0, 1.1, 0.004, tint(INK.teak, 0.14), { lw: 0.035, stroke: C.white });
      // The scoring triangle at the far end, its bands, and the ten-off strip.
      const L = (a, b) => face(ctx, [[a[0], a[1], 0.006], [b[0], b[1], 0.006]], null, { lw: 0.03, stroke: C.white });
      L([6.0, SH.y], [7.2, SH.y - 0.5]); L([6.0, SH.y], [7.2, SH.y + 0.5]); L([7.2, SH.y - 0.5], [7.2, SH.y + 0.5]);
      L([6.75, SH.y - 0.31], [6.75, SH.y + 0.31]); L([6.4, SH.y - 0.17], [6.4, SH.y + 0.17]);
      if (!Q.detail) return;
      const flat = (s, x, y, size, color) => {
        const [X, Y] = P(x, y, 0.006);
        ctx.save(); ctx.transform(1, 0.5, -1, 0.5, X, Y);
        words(ctx, s, 0, 0, size, color, 'center', 900);
        ctx.restore();
      };
      flat('10', 6.55, SH.y, 0.16, C.white);
      flat('8', 6.95, SH.y, 0.16, C.white);
      flat('10 OFF', 7.45, SH.y, 0.13, INK.funnelRed);
      flat('OFFICERS ONLY', 4.1, SH.y, 0.24, alpha(C.white, 0.85));
    });
    // The discs: this go sliding, the last two where they stopped.
    R.thing(SH.x1, SH.y, (ctx, t) => {
      const n = goOf(t), k = slideOf(t);
      const at_ = (m) => [stopOf(m), SH.y + (((m * 37) % 7) - 3) * 0.07];
      for (const m of [n - 2, n - 1]) {
        if (m < 0) continue;
        const [x, y] = at_(m);
        disc(ctx, x, y, 0.01, 0.2, m % 2 ? C.red : INK.sunYellow, { lw: 0.025 });
      }
      const [sx, sy] = at_(n);
      const q = ease(clamp((k - 0.08) / 0.4));
      if (k >= 0.08) disc(ctx, SH.x0 + 0.5 + (sx - SH.x0 - 0.5) * q, SH.y + (sy - SH.y) * q, 0.01, 0.2, n % 2 ? C.red : INK.sunYellow, { lw: 0.025 });
    }, { anim: true, depth: SH.x1 + SH.y - 0.6 });
    // Him, with the cue.
    const SB = { x: 1.6, y: 6.4 };
    body(R, SB.x, SB.y, folk(67, { style: 'bald', hair: HAIR[4], hat: 'cap', top: C.sky, bottom: C.white, dress: false }), {
      sick: at(14.6),
      pose: (t) => ({ dir: 'r', arms: slideOf(t) < 0.1 ? [1.75, 1.6] : [1.35, 1.2] }),
      after: (ctx, t, e) => {
        const [hx, hy] = hand(SB.x, SB.y, 0, 'r', e.arms[0]);
        const push = slideOf(t) < 0.1 ? 0.45 : 0;
        const [tx, ty] = P(SB.x + 1.0 + push, SB.y, 0.05);
        inked(ctx, [[hx, hy], [tx, ty]], MAT.chrome, 0.05);
        ctx.beginPath(); ctx.ellipse(tx, ty, 0.16, 0.07, 0, 0, Math.PI * 2); paint(ctx, MAT.steelDark, { lw: 0.02 });
      },
    });
    // Her, at the side with the score on a slate.
    const SC = { x: 5.0, y: 5.15 };
    body(R, SC.x, SC.y, folk(68, { hair: HAIR[4], style: 'bun', hat: 'sun', top: C.lilac, bottom: C.navy, dress: false }), {
      pose: (t) => {
        const k = slideOf(t);
        if (k > 0.5 && k < 0.66 && ten(stopOf(goOf(t)))) return { dir: 'l', pose: 'cheer' };
        return { dir: 'l', arms: [1.2, 1.0] };
      },
      after: (ctx, t, e) => {
        if (e.pose === 'cheer') return;
        const [hx, hy] = hand(SC.x, SC.y, 0, 'l', 1.2);
        ctx.beginPath(); ctx.rect(hx - 0.22, hy - 0.3, 0.3, 0.24); paint(ctx, C.night, { lw: 0.02 });
        if (Q.detail) words(ctx, 'HIM 40', hx - 0.07, hy - 0.2, 0.06, C.white, 'center', 800);
        if (Q.detail) words(ctx, 'ME 380', hx - 0.07, hy - 0.11, 0.06, C.white, 'center', 800);
      },
    });

    // The officers' lounge: two off shift, playing cards, one winning every hand.
    R.thing(4.4, 12.6, (ctx) => {
      cylinder(ctx, 4.4, 12.4, 0, 0.1, 0.9, MAT.steelDark);
      cylinder(ctx, 4.4, 12.4, 0.9, 0.65, 0.08, INK.hullWhite);
      board(ctx, 'x', 1.6, 14.7, 1.45, 1.8, 0.5, "OFFICERS' LOUNGE", { size: 0.15, board: C.navy, ink: C.white });
      face(ctx, [[1.6, 14.7, 0], [1.6, 14.7, 1.2]], null, { lw: 0.07, stroke: MAT.steelDark });
    });
    // Their deck chairs: a navy cushion on chrome legs, the back behind them
    // (she faces the bow, so hers is at the low x; he faces across, so his is
    // at the low y).
    for (const [x, y, d, back] of [[3.2, 12.0, 15.0, 'x'], [5.6, 13.0, 18.6, 'y']]) {
      R.thing(x, y, (ctx) => {
        for (const [dx, dy] of [[-0.3, -0.3], [0.22, -0.3], [-0.3, 0.22], [0.22, 0.22]]) box(ctx, x + dx, y + dy, 0, 0.08, 0.08, 0.62, MAT.chrome, { flat: true, lw: 0.02 });
        if (back === 'x') box(ctx, x - 0.36, y - 0.34, 0.62, 0.1, 0.68, 0.8, INK.hullWhite, { flat: true, lw: 0.025 });
        else box(ctx, x - 0.34, y - 0.36, 0.62, 0.68, 0.1, 0.8, INK.hullWhite, { flat: true, lw: 0.025 });
        box(ctx, x - 0.34, y - 0.34, 0.6, 0.68, 0.68, 0.12, C.navy, { top: tint(C.navy, 0.25), lw: 0.025 });
      }, { depth: d });
    }
    body(R, 3.2, 12.0, { ...folk(59), ...CREW_LOOK, face: CAP }, {
      pose: (t) => ({ pose: 'sit', dir: 'r', arms: [1.3 + (pulse(t, 3) < 0.2 ? 0.6 : 0), 1.1] }), depth: 15.1,
    });
    // He wins a hand every nine seconds: arms up, still sitting.
    body(R, 5.6, 13.0, { ...folk(60), ...CREW_LOOK, face: CAP }, {
      pose: (t) => ({ pose: 'sit', dir: 'l', arms: pulse(t, 9) < 0.2 ? [Math.PI - 0.45 + Math.sin(t * 14) * 0.12, -Math.PI + 0.45] : [1.2, 1.0] }), depth: 18.7,
    });
    R.thing(4.4, 12.5, (ctx, t) => { // the cards on the table, and one on its way across
      if (!Q.detail) return;
      for (const [x, y] of [[4.0, 12.2], [4.8, 12.6], [4.4, 12.3]]) rect(ctx, x - 0.12, y - 0.08, 0.24, 0.16, 0.99, C.white, { lw: 0.015 });
      const k = pulse(t, 3);
      if (k < 0.3) {
        const q = k / 0.3;
        const [X, Y] = P(3.5 + q * 1.8, 12.1 + q * 0.7, 1.6 + Math.sin(q * Math.PI) * 0.6);
        ctx.fillStyle = C.white; ctx.fillRect(X - 0.1, Y - 0.07, 0.2, 0.14);
      }
    }, { anim: true, depth: 17 });
    // (In the corner, clear of the lounge's sign.)
    R.thing(0.55, 15.5, (ctx, t) => plant(ctx, 0.55, 15.5, 0, t, { kind: 'palm', scale: 1.2, potColor: INK.hullWhite, leaf: C.leaf }), { anim: true });
    // At the gap from the pool.
    R.thing(1.3, 3.4, (ctx) => {
      face(ctx, [[1.3, 3.4, 0], [1.3, 3.4, 1.4]], null, { lw: 0.08, stroke: MAT.steelDark });
      board(ctx, 'x', 1.3, 3.45, 1.7, 1.5, 0.7, '', { board: C.white });
      lettering(ctx, 'x', 1.3, 3.46, 1.84, 'BRIDGE. CREW ONLY', 0.15, INK.funnelRed);
      lettering(ctx, 'x', 1.3, 3.46, 1.58, '(AND COUPLES)', 0.12, C.ink);
    });

    // ---------- Forward: the helm, the monitors, the bow ----------
    // This part was laid out when the Bridge began 8 further forward (at the
    // wheel), so it's drawn through S, which moves all of it 8 along.
    const S = shifted(R, DX);
    S.rug((ctx) => {
      // A rubber mat where the captain stands (worn through at the bucket).
      rect(ctx, 8.3, 4.6, 5.4, 2.6, 0, MAT.crewBlue, { dots: shade(MAT.crewBlue, 0.4), density: 0.25, lw: 0.03 });
      // A compass rose painted on the open deck.
      disc(ctx, 4.6, 11.4, 0, 1.7, alpha(C.white, 0.35), { lw: 0.04 });
      disc(ctx, 4.6, 11.4, 0, 1.2, null, { lw: 0.03 });
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4, L = i % 2 ? 0.9 : 1.6;
        const tip = [4.6 + Math.cos(a) * L, 11.4 + Math.sin(a) * L, 0];
        const s1 = [4.6 + Math.cos(a + 0.5) * 0.3, 11.4 + Math.sin(a + 0.5) * 0.3, 0];
        const s2 = [4.6 + Math.cos(a - 0.5) * 0.3, 11.4 + Math.sin(a - 0.5) * 0.3, 0];
        face(ctx, [s1, tip, s2, [4.6, 11.4, 0]], i % 2 ? INK.hullWhite : INK.funnelRed, { lw: 0.025 });
      }
      // The line past which nobody may pose. (Everybody does.) Its words are
      // painted toward the near end, where nobody stands on them.
      face(ctx, [[17.6, 4.95, 0], [17.6, 11.05, 0]], null, { lw: 0.14, stroke: INK.sunYellow });
      if (Q.detail) {
        for (const [line, dx] of [['NO POSING', -1.05], ['PAST THIS LINE', -0.55]]) {
          const [X, Y] = P(17.6 + dx, 9.6, 0);
          ctx.save();
          ctx.transform(1, -0.5, 1, 0.5, X, Y);
          words(ctx, line, 0, 0, 0.36, INK.sunYellow, 'center', 900);
          ctx.restore();
        }
      }
      // A coil of rope by the cleat.
      for (let i = 0; i < 3; i++) disc(ctx, 3.9, 6.9, 0.02 + i * 0.03, 0.42 - i * 0.1, C.butter, { lw: 0.025 });
    });

    // ---------- The radar mast ----------
    S.thing(MAST.x + 0.55, MAST.y + 0.55, (ctx) => mast(ctx));
    // The horn's pull cord, hanging beside the mast to a wooden toggle. A
    // tap toots the horn, and the lookout right under it jumps.
    const toot = S.poke({ id: 'horn', at: [MAST.x + 0.8, MAST.y, 1.4], r: 0.8, hold: 1.8, sound: 'clunk', say: ['BWAAAMP.', 'Sorry. SORRY.', 'Every deck heard that.'] });
    S.thing(MAST.x + 0.8, MAST.y + 0.1, (ctx) => {
      const pull = toot.k() * 0.3;
      const [a, b] = P(MAST.x + 0.8, MAST.y, HORN - 0.2), [c, d] = P(MAST.x + 0.8, MAST.y, 1.5 - pull);
      ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d - 0.2);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.stroke();
      ctx.beginPath(); ctx.roundRect(c - 0.06, d - 0.22, 0.12, 0.3, 0.05);
      paint(ctx, MAT.teakDark, { lw: 0.02 });
      board(ctx, 'y', MAST.x + 0.8, MAST.y, 1.0 - pull, 0.7, 0.22, 'HORN', { size: 0.12, board: INK.sunYellow, edge: 0.02 });
    }, { anim: true, depth: 7.5 });
    // The radar turns, with a gull riding it round.
    S.thing(MAST.x + 0.6, MAST.y + 0.6, (ctx, t) => {
      const a = t * 1.6, L = 1.3, { x, y } = MAST;
      const c = Math.cos(a) * L, s = Math.sin(a) * L;
      face(ctx, [[x - c, y - s, 7.5], [x + c, y + s, 7.5], [x + c, y + s, 7.8], [x - c, y - s, 7.8]], MAT.chrome, { lw: 0.04 });
      if (Q.detail) gull(ctx, x + c * 0.85, y + s * 0.85, 7.8, t, { dir: -Math.sin(a) * L - Math.cos(a) * L > 0 ? 'r' : 'l', scale: 0.8 });
    }, { anim: true });
    // The lookout in the crow's nest, sweeping the sea with binoculars.
    S.thing(MAST.x + 0.8, MAST.y + 0.8, (ctx, t) => {
      const { x, y } = MAST, z = 4.2;
      const [X, Yb] = P(x, y + 0.35, z), Yt = Yb - 0.75 * ZK, rx = 0.8 * Math.SQRT2, ry = rx / 2;
      ctx.beginPath(); ctx.ellipse(X, Yt, rx, ry, 0, Math.PI, 0);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
      const dir = pulse(t, 14) < 0.5 ? 'r' : 'l';
      const jump = toot.k() * (0.3 + Math.abs(Math.sin(t * 9)) * 0.15);
      person(ctx, x + 0.2, y + 0.55, z + jump, { ...folk(51), ...CREW_LOOK, face: CAP, pose: 'stand', dir, arms: jump > 0.2 ? [2.9, -2.9] : [2.6, 2.5] }, t);
      if (Q.detail && jump <= 0.2) {
        const f = dir === 'l' ? -1 : 1, [px, py] = P(x + 0.2, y + 0.55, z);
        for (const dx of [0.36, 0.5]) { ctx.beginPath(); ctx.ellipse(px + f * dx, py - 1.98, 0.07, 0.09, 0, 0, Math.PI * 2); paint(ctx, C.black, { lw: 0.02 }); }
      }
      ctx.beginPath();
      ctx.moveTo(X - rx, Yt); ctx.lineTo(X - rx, Yb);
      ctx.ellipse(X, Yb, rx, ry, 0, Math.PI, 0, true);
      ctx.lineTo(X + rx, Yt);
      ctx.ellipse(X, Yt, rx, ry, 0, 0, Math.PI, false);
      ctx.closePath();
      paint(ctx, INK.hullWhite, { dots: shade(INK.hullWhite, 0.4), density: 0.18, lw: 0.05 });
    }, { anim: true });
    // Signal flags on the halyard, from the yardarm down to the cleat.
    S.thing(3.6, 6.6, (ctx, t) => {
      const a = [MAST.x, MAST.y + 1.4, YARD + 0.05], b = [3.9, 6.6, 0.3];
      const [A, B] = P(...a), [E, F] = P(...b);
      ctx.beginPath(); ctx.moveTo(A, B); ctx.lineTo(E, F); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
      box(ctx, 3.75, 6.5, 0, 0.3, 0.2, 0.3, MAT.steelDark, { flat: true });
      const cols = [[INK.sunYellow, INK.sea], [C.white, C.red], [C.navy, C.white], [C.red, INK.sunYellow], [C.white, C.navy]];
      for (let i = 0; i < 5; i++) {
        const k = 0.1 + i * 0.17;
        const p = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
        const fl = Math.sin(t * 7 + i * 1.3) * 0.12;
        const q = [[p[0], p[1], p[2]], [p[0] - 0.55, p[1] + fl, p[2] + fl * 0.5], [p[0] - 0.55, p[1] + fl, p[2] - 0.45 + fl * 0.5], [p[0], p[1], p[2] - 0.45]];
        face(ctx, q, cols[i][0], { lw: 0.025 });
        if (Q.detail) {
          const m = (u, v) => [p[0] - 0.55 * u, p[1] + fl * u, p[2] - 0.45 * v + fl * 0.5 * u];
          face(ctx, [m(0.3, 0.3), m(0.7, 0.3), m(0.7, 0.7), m(0.3, 0.7)], cols[i][1], { stroke: false });
        }
      }
    }, { anim: true });

    // ---------- The monitors ----------
    S.thing(6.25, 2.6, (ctx) => monitorPanel(ctx));
    S.thing(6.25, 2.6, (ctx, t) => {
      const hr = hourOf(t);
      onY(ctx, MON.x, MON.y, MON.top, (g) => { for (let i = 0; i < 6; i++) cctv(g, i, t, hr); });
    }, { anim: true, depth: 8.86 });
    // The Lizard Cam, live: drawn from the chase, so it's always animated.
    S.thing(6.25, 2.6, (ctx, t) => onY(ctx, LC.x, LC.y + 0.005, LC.top, (g) => lizardCam(g, t)), { anim: true, depth: 8.87 });
    S.find({
      id: 'camera-still', label: 'A camera still', kind: 'hard', at: [5.2, 1.6, 2.45], r: 0.8,
      riddle: 'Taped up where the captain watches TV.',
      hint: 'Every picture on the monitors moves but one. It says 6:52.',
    });
    // The officer on the monitors, on a stool, eating popcorn: it's the best
    // show on the ship.
    S.thing(4.75, 3.1, (ctx) => {
      cylinder(ctx, 4.75, 3.3, 0, 0.3, 0.72, MAT.steel);
    });
    S.poke({ id: 'popcorn', at: [4.75, 3.35, 1.4], r: 0.8, say: ['Best show on the ship.', 'Keep an eye on the lizard cam.', 'Shh. Cabin 7 is on.'] });
    body(S, 4.75, 3.35, { ...folk(52), ...CREW_LOOK, hair: HAIR[3], style: 'curly' }, {
      pose: (t) => {
        const k = pulse(t, 2.6);
        return { pose: 'sit', back: true, dir: 'r', arms: [k < 0.3 ? 2.9 : 0.9, 0.6] };
      },
    });

    // ---------- The helm ----------
    S.thing(10, 4.3, (ctx) => {
      box(ctx, 8.5, 3, 0, 3, 1.3, 1.1, INK.hullWhite, { top: INK.teak });
      face(ctx, [[8.5, 4.3, 1.1], [11.5, 4.3, 1.1], [11.5, 3, 1.65], [8.5, 3, 1.65]], MAT.steelDark, { lw: 0.05 });
      face(ctx, [[11.5, 4.3, 1.1], [11.5, 3, 1.1], [11.5, 3, 1.65]], shade(INK.hullWhite, 0.15));
      const pp = (u, w, dz = 0.01) => [8.5 + u, 4.3 - 1.3 * w, 1.1 + 0.55 * w + dz];
      // Gauges along the panel, and the radar scope.
      for (const u of [0.4, 2.2, 2.7]) {
        const [X, Y] = P(...pp(u, 0.55));
        ctx.beginPath(); ctx.ellipse(X, Y, 0.2, 0.14, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.03 });
      }
      const [SX, SY] = P(...pp(1.0, 0.5));
      ctx.beginPath(); ctx.ellipse(SX, SY, 0.34, 0.22, 0, 0, Math.PI * 2); paint(ctx, C.night, { lw: 0.04 });
      // The front: a sticker, and a brass plate.
      onY(ctx, 8.6, 4.3, 0.95, (g) => {
        g.beginPath(); g.rect(0, 0, 1.15, 0.36); paint(g, INK.sunYellow, { lw: 0.02 });
        words(g, "HOW'S MY STEERING?", 0.575, 0.12, 0.09, C.ink, 'center', 900);
        words(g, 'CALL 1-800-AHOY', 0.575, 0.25, 0.08, C.ink, 'center', 700);
        g.beginPath(); g.rect(1.9, 0.05, 0.8, 0.26); paint(g, MAT.brass, { lw: 0.02 });
        words(g, 'HELM', 2.3, 0.18, 0.13, C.ink, 'center', 900);
      });
    });
    // The engine telegraph: FULL AHEAD all day, STOP at six.
    S.thing(7.95, 3.85, (ctx) => {
      cylinder(ctx, 7.95, 3.7, 0, 0.13, 1.2, MAT.brass);
      onY(ctx, 7.95, 3.88, 1.5, (g) => {
        g.beginPath(); g.arc(0, 0, 0.36, 0, Math.PI * 2); paint(g, MAT.brass, { lw: 0.04 });
        g.beginPath(); g.arc(0, 0, 0.29, 0, Math.PI * 2); paint(g, C.white, { lw: 0.02 });
        g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 0.29, Math.PI * 1.05, Math.PI * 1.45); g.closePath();
        g.fillStyle = alpha(C.red, 0.35); g.fill();
        words(g, 'AHEAD', -0.04, -0.12, 0.07, C.ink, 'center', 800);
        words(g, 'STOP', 0, 0.16, 0.07, C.red, 'center', 800);
      });
    });
    // What moves at the helm: the wheel (the captain isn't steering it), the
    // radar scope, the blinking lights, the telegraph's handle.
    const STEER = 9;
    const steer = (t) => { // 0..1: how far the first officer's finger is in
      const k = pulse(t, STEER);
      return k < 0.55 ? 0 : k < 0.62 ? (k - 0.55) / 0.07 : k < 0.8 ? 1 : k < 0.87 ? 1 - (k - 0.8) / 0.07 : 0;
    };
    const wheelAng = (t) => {
      const k = pulse(t, STEER);
      return k < 0.62 ? (k / 0.62) * 0.5 : k < 0.8 ? 0.5 * (1 - ease((k - 0.62) / 0.18)) : 0;
    };
    // A tap spins it: the first thing on the bridge that answers back.
    const spin = S.poke({ id: 'wheel', at: [10, 4.45, 1.5], r: 1.1, hold: 1.6, teach: true, sound: 'clunk', say: ['Hard to port!', 'Wheee.', 'Hands off. That is the ship.'] });
    S.thing(10, 4.5, (ctx, t) => {
      wheel(ctx, 10, 4.45, 1.5, 0.72, wheelAng(t) + spin.k() * ((t * 7) % (Math.PI / 4))); // (eight spokes: a turn of a spoke looks like a full spin)
      if (!Q.detail) return;
      const pp = (u, w, dz = 0.02) => [8.5 + u, 4.3 - 1.3 * w, 1.1 + 0.55 * w + dz];
      const [SX, SY] = P(...pp(1.0, 0.5));
      const a = t * 2.4;
      ctx.beginPath(); ctx.moveTo(SX, SY); ctx.lineTo(SX + Math.cos(a) * 0.3, SY + Math.sin(a) * 0.19);
      ctx.strokeStyle = C.tealLight; ctx.lineWidth = 0.03; ctx.stroke();
      if (Math.sin(a * 0.5) > 0.6) { ctx.beginPath(); ctx.arc(SX + 0.15, SY - 0.05, 0.03, 0, Math.PI * 2); ctx.fillStyle = C.butter; ctx.fill(); }
      const blinks = [C.red, C.butter, C.tealLight, C.red, C.butter];
      blinks.forEach((col, i) => {
        if (Math.sin(t * (2 + i * 0.7) + i) < -0.2) return;
        const [X, Y] = P(...pp(1.6 + i * 0.12, 0.25));
        ctx.beginPath(); ctx.arc(X, Y, 0.045, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
      });
      // The telegraph's handle: ahead all day, stop as she docks.
      const h = hourOf(t);
      const ang = h < 17.5 ? -2.1 : h < 18 ? -2.1 + ((h - 17.5) / 0.5) * 2.1 + Math.PI * 0 : 0;
      onY(ctx, 7.95, 3.9, 1.5, (g) => {
        g.save(); g.rotate(ang + Math.PI / 2);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -0.33);
        g.strokeStyle = C.ink; g.lineWidth = 0.06; g.stroke();
        g.restore();
        g.beginPath(); g.arc(0, 0, 0.05, 0, Math.PI * 2); g.fillStyle = MAT.brass; g.fill();
      });
    }, { anim: true });

    // The first officer: coffee in one hand, one finger on the wheel with the
    // other whenever the ship starts to wander. Nobody mentions it.
    const FO = { x: 12.1, y: 5.1 };
    body(S, FO.x, FO.y, { skin: SKIN[4], hair: HAIR[0], style: 'pony', ...CREW_LOOK, face: CAP }, {
      pose: (t) => {
        const s = steer(t);
        return { dir: 'l', arms: [0.15 + s * 2.05, 1.25 - s * 0.2] };
      },
      after: (ctx, t, e) => {
        const [mx, my] = hand(FO.x, FO.y, 0, 'l', e.arms[1], false);
        ctx.beginPath(); ctx.rect(mx - 0.08, my - 0.2, 0.16, 0.2); paint(ctx, C.white, { lw: 0.025 });
        if (Q.detail) {
          ctx.beginPath(); ctx.arc(mx + 0.1, my - 0.1, 0.06, -1.2, 1.2); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.stroke();
          const k = (t * 0.7) % 1; // steam
          ctx.beginPath(); ctx.arc(mx - 0.02 + Math.sin(t * 3) * 0.04, my - 0.3 - k * 0.3, 0.05 + k * 0.04, 0, Math.PI * 2);
          ctx.fillStyle = alpha(C.white, 0.7 * (1 - k)); ctx.fill();
          if (steer(t) > 0.9) { // the one finger
            const [fx, fy] = hand(FO.x, FO.y, 0, 'l', e.arms[0]);
            inked(ctx, [[fx, fy], [fx - 0.14, fy - 0.08]], SKIN[4], 0.05);
          }
        }
      },
    });

    // ---------- The side console: the clutter, and the patches ----------
    S.thing(13.6, 3.4, (ctx) => {
      box(ctx, 11.8, 1.8, 0, 1.8, 1.6, 1.1, INK.hullWhite, { top: C.paper });
      // A chart, the ship's line drawn on it in pencil.
      rect(ctx, 11.9, 1.9, 1.6, 1.4, 1.101, tint(C.sky, 0.3), { lw: 0.02 });
      if (Q.detail) {
        face(ctx, [[12.0, 3.1, 1.102], [12.6, 2.5, 1.102], [13.3, 2.2, 1.102]], null, { lw: 0.02, stroke: C.grey });
        disc(ctx, 13.35, 2.05, 1.102, 0.12, C.butter, { lw: 0.015 });
      }
      // The mug.
      cylinder(ctx, 12.1, 2.15, 1.1, 0.1, 0.2, C.white);
      // A box of tea (a blue box, but not that one).
      box(ctx, 13.0, 1.95, 1.1, 0.3, 0.22, 0.2, C.tealLight, { flat: true });
      lettering(ctx, 'x', 13.15, 2.17, 1.2, 'TEA', 0.09);
      // Binoculars.
      cylinder(ctx, 12.55, 2.0, 1.1, 0.07, 0.2, C.black);
      cylinder(ctx, 12.7, 2.1, 1.1, 0.07, 0.2, C.black);
      // A tin of crackers.
      cylinder(ctx, 12.2, 3.05, 1.1, 0.17, 0.18, INK.funnelRed, { top: C.butter });
      // The manual.
      box(ctx, 12.95, 2.75, 1.1, 0.45, 0.34, 0.1, C.navy, { flat: true });
      if (Q.detail) rect(ctx, 13.05, 2.82, 0.25, 0.2, 1.201, C.white, { stroke: false });
    });
    // The drawer on its end, never quite shut: the captain's patches are in
    // it (a blue corner shows in the gap, and he's stuck a used one on the front).
    const DR = { x: 13.6, y0: 2.0, y1: 3.2, z0: 0.5, z1: 0.92 };
    const drawer = S.poke({ id: 'drawer', at: [14.05, 2.6, 0.75], r: 0.7, sound: 'clunk' });
    S.thing(14.4, 3.3, (ctx) => {
      const out = 0.2 + drawer.k() * 0.6;
      const { x, y0, y1, z0, z1 } = DR;
      // What's out of the console: its side, its front, and the dark inside.
      box(ctx, x - 0.02, y0, z0, out + 0.02, y1 - y0, z1 - z0, INK.hullWhite, { top: shade(MAT.steelDark, 0.4), flat: true, lw: 0.025 });
      // The box of patches: just its lid's corner in the gap; all of it, open.
      if (out < 0.4) {
        rect(ctx, x, 2.25, out - 0.04, 0.6, z1 + 0.005, C.sky, { lw: 0.015 });
      } else {
        const bx = x + out - 0.62;
        box(ctx, bx, 2.3, z1 - 0.18, 0.5, 0.62, 0.3, C.sky, { flat: true, lw: 0.02 });
        onX(ctx, bx + 0.5, 2.92, z1 + 0.1, (g) => {
          words(g, 'SEASICK', 0.31, 0.08, 0.085, C.navy, 'center', 900);
          words(g, '500', 0.31, 0.19, 0.1, C.navy, 'center', 900);
        });
      }
      // The front: a handle, and a used patch stuck on it.
      onX(ctx, x + out, y1, z1, (g) => {
        g.beginPath(); g.rect(0.42, 0.12, 0.36, 0.06); paint(g, MAT.chrome, { lw: 0.012 });
        g.beginPath(); g.arc(0.95, 0.26, 0.08, 0, Math.PI * 2); paint(g, tint(C.butter, 0.4), { lw: 0.012 });
        g.fillStyle = C.sky; g.fillRect(0.93, 0.2, 0.04, 0.12); g.fillRect(0.89, 0.24, 0.12, 0.04);
      });
    }, { anim: true, depth: 17.75 });
    S.find({
      id: 'patches', label: 'A box of seasickness patches', kind: 'poke', inside: drawer, at: [14.1, 2.6, 0.9], r: 0.8,
      hint: "The captain keeps his cure close to hand. One drawer won't quite shut.",
    });
    // A stress toy on the console, a rubber gecko the captain squeezes. Not an
    // iguana. Tapped, it squeaks.
    const squeak = S.decoy({ id: 'gecko', at: [12.45, 2.55, 1.25], r: 0.55, hold: 0.5, say: ['A stress gecko. Not an iguana.', 'SQUEAK.', 'The captain needs that.'] });
    S.thing(12.6, 2.7, (ctx, t) => stressGecko(ctx, 12.45, 2.55, 1.1, squeak.k()), { anim: true, depth: 17.4 });

    // ---------- The buckets by the wheel ----------
    // The captain's: plain, a gold anchor on it.
    S.thing(11.8, 6.4, (ctx) => {
      bucket(ctx, 11.8, 6.4, 0, { color: C.greyLight });
      const [X, Y] = P(11.8, 6.4, 0.2);
      ctx.save(); ctx.translate(X, Y + 0.18); ctx.scale(0.6, 0.6);
      ctx.strokeStyle = MAT.brass; ctx.lineWidth = 0.07; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -0.28); ctx.lineTo(0, 0.12);
      ctx.moveTo(-0.12, -0.18); ctx.lineTo(0.12, -0.18);
      ctx.moveTo(-0.18, 0.0); ctx.quadraticCurveTo(0, 0.24, 0.18, 0.0);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -0.32, 0.05, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    });
    S.find({ id: 'captain-bucket', label: 'A bucket by the wheel', kind: 'spot', at: [11.8, 6.4, 0.3], r: 0.8 });
    // A fire bucket, full of sand.
    S.thing(10.4, 7.4, (ctx) => {
      bucket(ctx, 10.4, 7.4, 0, { color: INK.funnelRed });
      disc(ctx, 10.4, 7.4, 0.38, 0.24, C.butter, { dots: C.wood, density: 0.4, lw: 0.02 });
      const [X, Y] = P(10.4, 7.4, 0.2);
      words(ctx, 'FIRE', X, Y + 0.1, 0.13, C.white, 'center', 900);
    });
    // An ice bucket on a stand, with something fizzy for the couples, by the
    // far rail ahead of the helm (away from the wheel, so "a bucket by the
    // wheel" is one bucket, and out of the queue).
    const ICE = { x: 15.0, y: 5.4 };
    S.thing(ICE.x, ICE.y, (ctx) => {
      for (const [dx, dy] of [[-0.2, -0.1], [0.2, -0.1], [0, 0.2]]) face(ctx, [[ICE.x + dx, ICE.y + dy, 0], [ICE.x, ICE.y, 0.9]], null, { lw: 0.05, stroke: MAT.chrome });
      cylinder(ctx, ICE.x, ICE.y, 0.9, 0.24, 0.34, MAT.chrome);
      const [X, Y] = P(ICE.x - 0.05, ICE.y - 0.05, 1.2);
      ctx.beginPath(); ctx.moveTo(X - 0.05, Y); ctx.lineTo(X - 0.1, Y - 0.45); ctx.lineTo(X - 0.04, Y - 0.5); ctx.lineTo(X + 0.03, Y - 0.05); ctx.closePath();
      paint(ctx, C.navy, { lw: 0.02 });
      ctx.beginPath(); ctx.rect(X - 0.12, Y - 0.56, 0.08, 0.08); ctx.fillStyle = MAT.brass; ctx.fill();
    });

    // ---------- Signs ----------
    // A chalkboard by the helm: the day's conditions.
    S.thing(6.6, 5.7, (ctx) => {
      face(ctx, [[5.9, 5.4, 0], [6.1, 5.62, 1.4]], null, { lw: 0.06, stroke: MAT.teakDark });
      face(ctx, [[7.3, 5.4, 0], [7.1, 5.62, 1.4]], null, { lw: 0.06, stroke: MAT.teakDark });
      board(ctx, 'x', 6.6, 5.62, 0.95, 1.3, 0.95, '', { board: C.night, edge: 0.06 });
      lettering(ctx, 'x', 6.6, 5.63, 1.26, 'TODAY: SUNNY', 0.15, C.white);
      lettering(ctx, 'x', 6.6, 5.63, 1.0, 'SEAS: CALM', 0.15, C.white);
      lettering(ctx, 'x', 6.6, 5.63, 0.74, 'CAPTAIN: GREEN', 0.15, INK.sunYellow);
    });
    // The pose queue's sign.
    S.thing(9.2, 13.4, (ctx) => {
      face(ctx, [[9.2, 13.4, 0], [9.2, 13.4, 1.4]], null, { lw: 0.08, stroke: MAT.steelDark });
      board(ctx, 'x', 9.2, 13.45, 1.7, 1.9, 0.9, '', { board: INK.flamingo });
      lettering(ctx, 'x', 9.2, 13.46, 1.95, 'THE POSE', 0.26, C.white, 'Bagel Fat One');
      lettering(ctx, 'x', 9.2, 13.46, 1.6, 'WAIT FROM HERE: 40 MIN', 0.12, C.ink);
      lettering(ctx, 'x', 9.2, 13.46, 1.42, 'ARMS OUT. NO REFUNDS.', 0.1, C.ink);
    });
    // A mop bucket (yellow) and the deckhand mopping round the compass rose.
    S.thing(4.0, 14.4, (ctx) => {
      box(ctx, 3.6, 14.1, 0.1, 0.8, 0.6, 0.6, INK.sunYellow, { flat: true });
      for (const [wx, wy] of [[3.7, 14.7], [4.3, 14.7]]) disc(ctx, wx, wy, 0.05, 0.08, C.black, { stroke: false });
      rect(ctx, 3.7, 14.2, 0.6, 0.4, 0.701, shade(C.sky, 0.2), { lw: 0.02 });
    });
    const mopper = route([[1.8, 12.6, 1.5], [7.2, 13.8], [6.2, 9.0, 1], [2.6, 9.4]], { speed: 0.55 });
    S.mover(mopper, (ctx, t, p) => {
      const arms = [0.95, 0.75];
      person(ctx, p.x, p.y, 0, { ...folk(53), ...CREW_LOOK, bottom: C.navy, pose: p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back, arms, speed: 5 }, t);
      const f = p.dir === 'l' ? -1 : 1;
      const [hx, hy] = hand(p.x, p.y, 0, p.dir, arms[0]);
      const [X, Y] = P(p.x, p.y, 0);
      const mx = X + f * (1.05 + Math.sin(t * 5) * 0.2), my = Y + 0.12;
      inked(ctx, [[hx, hy - 0.3], [mx, my - 0.1]], MAT.teakDark, 0.05);
      ctx.beginPath(); ctx.ellipse(mx, my, 0.28, 0.1, 0, 0, Math.PI * 2); paint(ctx, C.greyLight, { lw: 0.025 });
    });

    // ---------- People ----------
    // A signalman at the far rail, semaphoring the port: probably "NO".
    const SIG = { x: 9.2, y: 1.05 };
    const LETTERS = [[2.4, -2.4], [1.57, -0.8], [3.0, -1.57], [0.8, -2.4], [2.4, -0.8], [1.57, -1.57]];
    body(S, SIG.x, SIG.y, { ...folk(54), ...CREW_LOOK, face: CAP }, {
      pose: (t) => ({ back: true, dir: 'r', arms: LETTERS[Math.floor(pulse(t, 1.3 * LETTERS.length) * LETTERS.length)] }),
      after: (ctx, t, e) => {
        [[e.arms[0], true, C.red, INK.sunYellow], [e.arms[1], false, INK.sunYellow, C.red]].forEach(([a, near, c1, c2]) => {
          const [hx, hy] = hand(SIG.x, SIG.y, 0, 'r', a, near);
          const dx = Math.sin(a) * 0.3, dy = Math.cos(a) * 0.3;
          const fx = hx + dx, fy = hy + dy;
          inked(ctx, [[hx, hy], [fx, fy]], C.white, 0.03);
          ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + 0.3, fy); ctx.lineTo(fx + 0.3, fy + 0.3); ctx.lineTo(fx, fy + 0.3); ctx.closePath();
          paint(ctx, c1, { lw: 0.02 });
          ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + 0.3, fy + 0.3); ctx.lineTo(fx, fy + 0.3); ctx.closePath();
          paint(ctx, c2, { stroke: false });
        });
      },
    });
    // A passenger at the far rail, very green, very still, facing the horizon.
    body(S, 17.2, 5.1, folk(55, { hat: 'sun' }), { sick: at(11.6), pose: () => ({ back: true, dir: 'r', arms: [0.9, 0.8] }) });
    // A tourist taking a selfie with the captain behind her. (Clear of where
    // Pidge stands to question the captain at 2pm.)
    const SELF = { x: 9.4, y: 8.6 };
    body(S, SELF.x, SELF.y, folk(56, { top: C.coral, hat: 'sun', dress: true }), {
      sick: at(12.8),
      pose: () => ({ dir: 'l', arms: [2.7, 0.3] }),
      after: (ctx, t) => {
        const [hx, hy] = hand(SELF.x, SELF.y, 0, 'l', 2.7);
        ctx.beginPath(); ctx.rect(hx - 0.1, hy - 0.2, 0.2, 0.3); paint(ctx, C.black, { lw: 0.02 });
        if (pulse(t, 6, 1) < 0.05) { ctx.beginPath(); ctx.arc(hx, hy - 0.05, 0.3, 0, Math.PI * 2); ctx.fillStyle = alpha(C.white, 0.8); ctx.fill(); }
      },
    });

    // The queue for the pose: three couples, getting greener, one practising.
    const Q_ = [
      [16.0, 9.6, 61, { sick: at(12) }], [15.3, 10.2, 62, {}],
      [13.8, 10.7, 63, { practise: true }], [13.1, 11.3, 64, { sick: at(12.5) }],
      [11.4, 11.6, 65, { mermaid: true, sick: at(13.5) }], [10.7, 12.2, 66, { watch: true }],
    ];
    for (const [x, y, seed, o] of Q_) {
      body(S, x, y, folk(seed), {
        sick: o.sick,
        pose: (t) => {
          if (o.practise) return pulse(t, 7) < 0.45 ? { arms: [1.75, -1.9] } : {};
          if (o.watch) return pulse(t, 5) < 0.4 ? { arms: [1.4, 1.2] } : {};
          if (o.mermaid) return { arms: [1.1, 0.2] };
          return {};
        },
        after: o.mermaid ? (ctx, t) => {
          const [hx, hy] = hand(x, y, 0, 'r', 1.1);
          ctx.save(); ctx.translate(hx, hy); mermaidInHand(ctx); ctx.restore();
        } : null,
      });
    }

    // The ship's photographer, flashing away at the pose: prints $39.99.
    const PH = { x: 19.2, y: 9.8 };
    body(S, PH.x, PH.y, { ...folk(57), ...CREW_LOOK, top: C.navy, bottom: C.navy }, {
      pose: () => ({ dir: 'r', arms: [2.3, 2.1] }),
      after: (ctx, t) => {
        const [X, Y] = P(PH.x, PH.y, 0);
        ctx.beginPath(); ctx.rect(X + 0.3, Y - 2.1, 0.32, 0.22); paint(ctx, C.black, { lw: 0.02 });
        ctx.beginPath(); ctx.arc(X + 0.5, Y - 1.99, 0.06, 0, Math.PI * 2); ctx.fillStyle = C.grey; ctx.fill();
        const k = pulse(t, 4.5);
        if (k < 0.06) {
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI) / 4, r = i % 2 ? 0.25 : 0.55;
            ctx.lineTo(X + 0.62 + Math.cos(a) * r, Y - 2.05 + Math.sin(a) * r);
          }
          ctx.closePath(); ctx.fillStyle = alpha(C.white, 0.9); ctx.fill();
        }
      },
    });

    // The couple on the very tip of the bow, arms out, all day, through spray,
    // wind and a gull. She's in front; he's holding on.
    const HER = { x: 19.5, y: 7.6 }, HIM = { x: 18.7, y: 8.2 };
    S.poke({ id: 'pose', at: [19.3, 7.7, 1.5], r: 0.9, say: ["I'm flying!", 'We paid for forty minutes.', 'Is there a gull on him?'] });
    S.thing(HER.x, HER.y, (ctx, t) => {
      person(ctx, HIM.x, HIM.y, 0, { skin: SKIN[0], hair: HAIR[1], style: 'short', top: C.white, bottom: C.navy, dir: 'r', arms: [1.0, 0.85] }, t);
      const k = green(t, at(13.3));
      person(ctx, HER.x, HER.y, 0, {
        skin: queasy(SKIN[1], k), hair: HAIR[2], style: 'long', top: INK.flamingo, dress: true, dir: 'r',
        arms: [1.72 + Math.sin(t * 1.3) * 0.04, -1.85 - Math.sin(t * 1.1) * 0.04],
        wear(g, b) { // a scarf, streaming back in the wind
          if (!Q.detail) return;
          g.beginPath();
          g.moveTo(-0.05, b.top + 0.05);
          for (let i = 1; i <= 6; i++) g.lineTo(-0.2 * i, b.top + 0.05 + Math.sin(t * 8 - i) * 0.06 * i * 0.4 - i * 0.02);
          g.lineCap = 'round';
          g.strokeStyle = C.ink; g.lineWidth = 0.15; g.stroke();
          g.strokeStyle = INK.sunYellow; g.lineWidth = 0.1; g.stroke();
        },
      }, t);
    }, { anim: true });
    // The jackstaff on the point, its flag snapping.
    S.thing(22.9, 8.05, (ctx, t) => {
      face(ctx, [[22.9, 8, 0], [22.9, 8, 2.4]], null, { lw: 0.07, stroke: C.ink });
      const fl = (u) => Math.sin(t * 9 - u * 5) * 0.12 * u;
      const q = [[22.9, 8, 2.4], [22.3, 8 + fl(0.6), 2.4], [21.7, 8 + fl(1.2), 2.35], [21.7, 8 + fl(1.2), 1.85], [22.3, 8 + fl(0.6), 1.9], [22.9, 8, 1.9]];
      face(ctx, q, INK.flamingo, { lw: 0.03 });
      if (Q.detail) face(ctx, [[22.6, 8 + fl(0.3), 2.3], [22.0, 8 + fl(0.9), 2.28], [22.0, 8 + fl(0.9), 2.0], [22.6, 8 + fl(0.3), 2.02]], INK.sunYellow, { stroke: false });
    }, { anim: true });

    // The gull: circles the bow all morning, lands on his head at one, stays.
    const LAND0 = at(12.6), LAND = at(13);
    S.mover((t) => {
      const tt = wrap(t);
      if (tt >= LAND) return { x: HIM.x, y: HIM.y, z: 2.0, sit: true };
      const a = t * 0.8;
      const cx = 19 + Math.cos(a) * 2.6, cy = 8 + Math.sin(a) * 1.8, cz = 4.8 + Math.sin(t * 1.7) * 0.3;
      const dir = -2.6 * Math.sin(a) - 1.8 * Math.cos(a) > 0 ? 'r' : 'l';
      if (tt < LAND0) return { x: cx, y: cy, z: cz, dir };
      const k = ease((tt - LAND0) / (LAND - LAND0));
      return { x: cx + (HIM.x - cx) * k, y: cy + (HIM.y - cy) * k, z: cz + (2.0 - cz) * k, dir };
    }, (ctx, t, p) => {
      if (p.sit) gull(ctx, p.x + 0.02, p.y, p.z, t, { dir: 'r', peck: true, scale: 0.9, phase: 2 });
      else gull(ctx, p.x, p.y, p.z, t, { fly: true, dir: p.dir, scale: 0.9 });
    }, { bias: 0.6 });

    // ---------- Weather and noise ----------
    // Spray at the bow, and every so often a proper wave over the couple.
    S.air((ctx, t) => {
      if (!Q.detail) return;
      ctx.fillStyle = alpha(C.white, 0.85);
      particles(t, 12, 1.3, (k, r) => {
        const [X, Y] = P(23.6 - k * (1 + r() * 2.5), 8 + (r() - 0.5) * 2.2, -0.4 + Math.sin(k * Math.PI) * (0.8 + r() * 1.2));
        ctx.globalAlpha = 1 - k;
        ctx.beginPath(); ctx.arc(X, Y, 0.07 + r() * 0.07, 0, Math.PI * 2); ctx.fill();
      }, 7);
      const w = pulse(t, 14);
      if (w > 0.86) {
        const q = (w - 0.86) / 0.14;
        particles(q * 3, 16, 3, (k0, r, i) => {
          const d = 1.5 + r() * 4.5;
          const [X, Y] = P(23.5 - q * d, 8 + (r() - 0.5) * 3, Math.sin(q * Math.PI) * (2 + r() * 2.2));
          ctx.globalAlpha = 1 - q * 0.8;
          ctx.beginPath(); ctx.arc(X, Y, 0.1 + (i % 3) * 0.05, 0, Math.PI * 2); ctx.fill();
        }, 11);
      }
      ctx.globalAlpha = 1;
      // Wind, streaming back over the bow.
      ctx.strokeStyle = alpha(C.white, 0.55); ctx.lineWidth = 0.04; ctx.lineCap = 'round';
      particles(t, 5, 2.2, (k, r) => {
        const x = 24 - k * 12, y = 5.5 + r() * 5, z = 2.6 + r() * 1.8;
        const [A, B] = P(x, y, z), [E, F] = P(x - 1.2, y, z + Math.sin(t * 4 + y) * 0.1);
        ctx.globalAlpha = Math.sin(k * Math.PI);
        ctx.beginPath(); ctx.moveTo(A, B); ctx.lineTo(E, F); ctx.stroke();
      }, 5);
      ctx.globalAlpha = 1;
    });
    // A gull wheeling round the mast.
    S.air((ctx, t) => {
      const a = t * 0.6 + 2;
      gull(ctx, MAST.x + 2 + Math.cos(a) * 3, MAST.y + 3 + Math.sin(a) * 2.5, 9 + Math.sin(t) * 0.4, t, { fly: true, dir: Math.sin(a) < 0 ? 'r' : 'l', scale: 0.8, phase: 1 });
    });
    // The horn: at seven as the buffet opens, and at six as she docks.
    S.air((ctx, t) => {
      const tt = wrap(t);
      const tooted = toot.k();
      let blast = tt < 3.5 ? tt / 3.5 : tt >= at(18) && tt < at(18) + 4 ? (tt - at(18)) / 4 : -1;
      if (blast < 0 && tooted > 0) blast = (t * 0.5) % 1;
      if (blast < 0) return;
      const [X, Y] = P(MAST.x + 1.35, MAST.y, HORN);
      ctx.strokeStyle = alpha(C.white, 0.9); ctx.lineWidth = 0.08;
      for (let i = 0; i < 3; i++) {
        const k = (blast * 3 + i / 3) % 1;
        ctx.globalAlpha = 1 - k;
        ctx.beginPath(); ctx.arc(X + 0.2 + k * 1.2, Y, 0.3 + k * 0.9, -0.9, 0.9); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (Q.detail) {
        const [bx, by] = P(MAST.x + 3.2, MAST.y, HORN + 1.2);
        words(ctx, 'BWAAAAMP', bx, by, 0.55 + Math.sin(t * 30) * 0.02, C.white, 'center', 900);
      }
    });
  },
};
