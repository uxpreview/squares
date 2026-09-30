// The Engine Room: below the waterline at the stern. Two big diesels, the
// propeller shafts running off through the stern wall, pipes and gauges
// everywhere, a control desk with a phone to the bridge, and a hammock strung
// between two pipes. Crew only, so nobody down here is green.
//
// The running gag, once an hour of the day (20 seconds): the apprentice taps
// the big gauge, and every tap sends the needle up. The alarm goes off; he
// runs to the hammock and pokes the chief engineer, who sleeps on (ear
// defenders). The second engineer tells the bridge the chief is inspecting.
// The apprentice walks back and taps the gauge again. The needle climbs all
// day, and at 6pm, when the ship docks, the telegraph rings STOP and the
// shafts wind down.
// Keep the id: it's in links and saves.
import {
  C, Q, box, rect, disc, cylinder, face, paint, person, speech, alpha, shade, tint, SKIN, HAIR,
} from '../../../engine/art.js';
import { particles, clamp, ease } from '../../../engine/actors.js';
import { ZK } from '../../../engine/iso.js';
import { deck } from '../ship.js';
import { HOUR } from '../plan.js';
import { INK, MAT, at, wrap, hourOf, readable } from '../style.js';
import { P, shape, board, porthole, bucket, onY, onX, inked, hand, words as wordsAt } from '../kit.js';

// The engine room letters a little heavier than the rest of the ship (stencils).
const words = (ctx, s, u, v, size, color = C.ink, align = 'center', weight = 800, font) => wordsAt(ctx, s, u, v, size, color, align, weight, font);
const handAt = (x, y, z, dir, a, s = 1) => hand(x, y, z, dir, a, true, s);

// ---------- The clock down here ----------
// How fast the ship's going (the same rule as the wake in ambient.js): full
// ahead all day, slowing into port from 5pm, stopped at 6.
const way = (t) => {
  const h = hourOf(t);
  if (h < 17) return 1;
  if (h < 18) return 1 - (h - 17);
  return 0;
};
// How far the shafts have turned: the sum of the speed so far, so slowing
// down never makes them jump.
const T17 = at(17), T18 = at(18);
function turned(t) {
  const s = wrap(t);
  if (s < T17) return s;
  if (s < T18) { const d = s - T17; return T17 + d - (d * d) / (2 * (T18 - T17)); }
  return T17 + (T18 - T17) / 2;
}
// Where we are in the hour (the gag's loop, 20 seconds), and the day (0 to 1).
const inHour = (t) => wrap(t) % HOUR;
// The alarm: on for five seconds of every hour.
const ALARM = [4.5, 9.5];
const alarm = (t) => { const s = inHour(t); return s >= ALARM[0] && s < ALARM[1] && way(t) > 0; };
// The apprentice's taps: four, early in the hour.
const TAPS = [0.8, 1.6, 2.4, 3.2];
const tapsSoFar = (s) => TAPS.filter((a) => s >= a).length;

// ---------- Little drawing helpers (in this area's own units) ----------

// A pipe through 3D points: inked, with a shine along its top.
function pipe(ctx, pts3, color, w = 0.3, cap = 'round') {
  const pts = pts3.map((p) => P(...p));
  inked(ctx, pts, color, w, cap);
  if (!Q.detail) return;
  ctx.save();
  ctx.translate(-w * 0.12, -w * 0.2);
  ctx.beginPath();
  pts.forEach(([X, Y], i) => (i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y)));
  ctx.strokeStyle = alpha(C.white, 0.35);
  ctx.lineWidth = w * 0.18;
  ctx.stroke();
  ctx.restore();
}
// A collar round a pipe: a short fat band along it at a point.
function flange(ctx, a, b, w, color = MAT.steelDark) {
  const [X0, Y0] = P(...a), [X1, Y1] = P(...b);
  const dx = X1 - X0, dy = Y1 - Y0, L = Math.hypot(dx, dy) || 1;
  const X = X0, Y = Y0, ux = (dx / L) * 0.07, uy = (dy / L) * 0.07;
  inked(ctx, [[X - ux, Y - uy], [X + ux, Y + uy]], color, w * 1.5, 'butt');
}
// A valve's handwheel, lying flat (seen from above), at (x, y, z).
function handwheel(ctx, x, y, z, r = 0.25, color = C.red) {
  const [X, Y] = P(x, y, z);
  ctx.beginPath();
  ctx.ellipse(X, Y, r * 1.41, r * 0.72, 0, 0, Math.PI * 2);
  ctx.lineWidth = 0.13; ctx.strokeStyle = C.ink; if (Q.lines) ctx.stroke();
  ctx.lineWidth = 0.07; ctx.strokeStyle = color; ctx.stroke();
  if (!Q.detail) return;
  ctx.beginPath();
  ctx.moveTo(X - r * 1.41, Y); ctx.lineTo(X + r * 1.41, Y);
  ctx.moveTo(X, Y - r * 0.72); ctx.lineTo(X, Y + r * 0.72);
  ctx.lineWidth = 0.04; ctx.stroke();
}
// A round gauge in plane units: a brass rim, a white face, ticks, a red
// zone from red (0 to 1) up, and the needle at val (0 to 1), unless it's
// drawn separately (val null).
const SWEEP = [Math.PI * 0.75, Math.PI * 2.25];
const angleOf = (v) => SWEEP[0] + (SWEEP[1] - SWEEP[0]) * v;
function dial(g, u, v, r, val, o = {}) {
  g.beginPath(); g.arc(u, v, r + 0.07, 0, Math.PI * 2);
  paint(g, o.rim || MAT.brass, { lw: 0.025 });
  g.beginPath(); g.arc(u, v, r, 0, Math.PI * 2);
  paint(g, C.white, { lw: 0.02 });
  if (Q.detail) {
    if (o.red != null) {
      g.beginPath(); g.arc(u, v, r * 0.8, angleOf(o.red), SWEEP[1]);
      g.strokeStyle = C.red; g.lineWidth = r * 0.22; g.stroke();
    }
    g.strokeStyle = C.ink; g.lineWidth = 0.015;
    g.beginPath();
    for (let i = 0; i <= 8; i++) {
      const a = angleOf(i / 8);
      g.moveTo(u + Math.cos(a) * r * 0.68, v + Math.sin(a) * r * 0.68);
      g.lineTo(u + Math.cos(a) * r * 0.9, v + Math.sin(a) * r * 0.9);
    }
    g.stroke();
    if (o.label) words(g, o.label, u, v + r * 0.45, r * 0.26, C.ink, 'center', 800);
  }
  if (val != null) needle(g, u, v, r, val);
}
function needle(g, u, v, r, val) {
  const a = angleOf(clamp(val, -0.02, 1.02));
  g.beginPath();
  g.moveTo(u, v); g.lineTo(u + Math.cos(a) * r * 0.85, v + Math.sin(a) * r * 0.85);
  g.strokeStyle = C.red; g.lineWidth = Math.max(0.03, r * 0.08); g.lineCap = 'round'; g.stroke();
  g.beginPath(); g.arc(u, v, r * 0.1, 0, Math.PI * 2);
  g.fillStyle = C.ink; g.fill();
}

// Someone who stays down here, drawn every frame: o.pose(t) returns their
// changing options (arms, pose, dir); o.after draws what they hold or say.
function body(R, x, y, look, o = {}) {
  R.thing(x, y, (ctx, t) => {
    const e = o.pose ? o.pose(t) : {};
    person(ctx, x, y, o.z || 0, { pose: 'stand', dir: 'r', ...look, ...e }, t);
    if (o.after) o.after(ctx, t, e);
  }, { anim: true, ...(o.depth != null ? { depth: o.depth } : {}) });
}

// The looks. Engine crew wear blue boiler suits and white hard hats; nobody
// down here is ever green (they eat in the crew mess).
const SUIT = { top: MAT.crewBlue, bottom: MAT.crewBlue };
const LOOK = {
  chief: { skin: SKIN[1], hair: HAIR[4], style: 'bald', hat: 'none', top: C.white, bottom: MAT.crewBlue },
  apprentice: { skin: SKIN[5], hair: HAIR[3], style: 'short', hat: 'helmet', ...SUIT, scale: 0.94 },
  greaser: { skin: SKIN[3], hair: HAIR[6], style: 'short', hat: 'beanie', top: C.coral, bottom: C.coral },
  second: { skin: SKIN[4], hair: HAIR[1], style: 'short', hat: 'none', top: C.white, bottom: C.navy },
  dealer: { skin: SKIN[2], hair: HAIR[0], style: 'pony', hat: 'none', top: C.white, bottom: MAT.crewBlue },
  player: { skin: SKIN[0], hair: HAIR[5], style: 'curly', hat: 'none', ...SUIT },
  grinder: { skin: SKIN[3], hair: HAIR[1], style: 'short', hat: 'helmet', ...SUIT },
  cook: { skin: SKIN[0], hair: HAIR[2], style: 'short', hat: 'beanie', ...SUIT },
  sunbather: { skin: SKIN[2], hair: HAIR[6], style: 'long', hat: 'none', top: C.white, bottom: MAT.crewBlue },
};
// The chief's beard and ear defenders (he sleeps through everything).
function chiefFace(ctx, hy) {
  // Shut eyes, painted over the open ones.
  ctx.fillStyle = LOOK.chief.skin;
  ctx.beginPath(); ctx.arc(0.1, hy + 0.02, 0.05, 0, Math.PI * 2); ctx.arc(0.24, hy + 0.02, 0.05, 0, Math.PI * 2); ctx.fill();
  if (Q.detail) {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025;
    ctx.beginPath(); ctx.arc(0.1, hy + 0.0, 0.04, 0.2, Math.PI - 0.2); ctx.moveTo(0.28, hy + 0.01); ctx.arc(0.24, hy + 0.0, 0.04, 0.2, Math.PI - 0.2); ctx.stroke();
  }
  // A big grey beard.
  ctx.beginPath();
  ctx.moveTo(-0.12, hy + 0.08);
  ctx.quadraticCurveTo(0.05, hy + 0.55, 0.34, hy + 0.14);
  ctx.quadraticCurveTo(0.2, hy + 0.2, 0.05, hy + 0.12);
  ctx.closePath();
  paint(ctx, C.white, { lw: 0.025 });
  // Ear defenders: a yellow cup, and the band over his head.
  ctx.beginPath(); ctx.arc(0.02, hy - 0.06, 0.34, Math.PI * 1.1, Math.PI * 1.9);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.08; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-0.04, hy + 0.0, 0.12, 0.16, 0, 0, Math.PI * 2);
  paint(ctx, INK.sunYellow, { lw: 0.03 });
}
// Sunglasses, for the engine's own sunbather.
function shades(ctx, hy) {
  ctx.fillStyle = C.black;
  ctx.beginPath(); ctx.ellipse(0.1, hy + 0.02, 0.08, 0.06, 0, 0, Math.PI * 2); ctx.ellipse(0.26, hy + 0.02, 0.08, 0.06, 0, 0, Math.PI * 2); ctx.fill();
}
// A face shield, flipped up and down with the grinding.
function shield(down) {
  return (ctx, hy) => {
    ctx.beginPath();
    if (down) ctx.roundRect(0.0, hy - 0.2, 0.42, 0.46, 0.08);
    else ctx.roundRect(-0.2, hy - 0.62, 0.46, 0.3, 0.08);
    ctx.fillStyle = alpha(C.sky, 0.55); ctx.fill();
    if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke(); }
  };
}

// Someone lying down along x (on a hammock, on an engine): feet at (x, y, z),
// head toward -x. o: person options.
const ALONG_X = Math.atan2(0.5, 1);
function lying(ctx, x, y, z, look, t, o = {}) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.rotate(ALONG_X);
  person(ctx, 0, 0, 0, { ...look, pose: 'lie', dir: 'r', ...o }, t);
  ctx.restore();
}

// ---------- The engines ----------
// Each engine is 7 long (x 3 to 10), 2.6 wide, in four sections of two
// cylinders, each sorted on its own so people can walk between them.
const ENG_X = 3, ENG_W = 7, ENG_D = 2.6, SEG = ENG_W / 4;
const ENGINES = [{ y: 6.2, n: 1, name: 'THE GOOD ONE' }, { y: 10.5, n: 2, name: 'THE OTHER ONE' }];
const BODY = MAT.crewBlue;
const HEAD_Z = 2.6, HEAD_H = 0.38;

function engineSection(ctx, e, i) {
  const y0 = e.y, xa = ENG_X + i * SEG, yF = y0 + ENG_D;
  // The gearbox at the aft end, where the shaft comes out.
  if (i === 0) box(ctx, ENG_X - 0.75, y0 + 0.5, 0.3, 0.75, ENG_D - 1, 1.3, MAT.steelDark, { top: MAT.steel });
  // The skid it's bolted to.
  box(ctx, xa, y0 - 0.15, 0, SEG, ENG_D + 0.3, 0.3, MAT.steelDark, { flat: true, lw: 0.04 });
  // The exhaust manifold runs along the back, lagged in canvas.
  const mz = 3.05, my = y0 + 0.32;
  pipe(ctx, [[i === 0 ? 0.3 : xa, my, mz], [xa + SEG, my, mz]], MAT.canvas, 0.46, 'butt');
  if (Q.detail) for (const k of [0.3, 1.2]) flange(ctx, [xa + k, my, mz], [xa + k + 0.2, my, mz], 0.46, shade(MAT.canvas, 0.25));
  // Crankcase, block, and the two heads of this section.
  box(ctx, xa, y0 + 0.15, 0.3, SEG, ENG_D - 0.3, 1.45, BODY, { dens: 0.2 });
  box(ctx, xa, y0 + 0.4, 1.75, SEG, ENG_D - 0.8, 0.85, tint(BODY, 0.18), { dens: 0.16 });
  for (let k = 0; k < 2; k++) {
    const hx = xa + 0.1 + k * (SEG / 2);
    // the elbow from the head back into the manifold
    pipe(ctx, [[hx + 0.4, y0 + 0.9, HEAD_Z + 0.2], [hx + 0.4, my + 0.1, mz]], MAT.steel, 0.2);
    box(ctx, hx, y0 + 0.62, HEAD_Z, SEG / 2 - 0.2, ENG_D - 1.24, HEAD_H, tint(BODY, 0.38), { flat: true, lw: 0.04 });
    box(ctx, hx + 0.1, y0 + 0.8, HEAD_Z + HEAD_H, SEG / 2 - 0.4, ENG_D - 1.6, 0.14, MAT.steel, { flat: true, lw: 0.03 });
  }
  // Two inspection doors on the crankcase, bolted round.
  onY(ctx, xa, y0 + ENG_D - 0.15, 1.6, (g) => {
    for (let k = 0; k < 2; k++) {
      const u = 0.44 + k * (SEG / 2);
      g.beginPath(); g.ellipse(u, 0.55, 0.3, 0.42, 0, 0, Math.PI * 2);
      paint(g, shade(BODY, 0.12), { lw: 0.025 });
      if (Q.detail) {
        g.fillStyle = MAT.chrome;
        for (let b = 0; b < 8; b++) { const a = (b / 8) * Math.PI * 2; g.beginPath(); g.arc(u + Math.cos(a) * 0.36, 0.55 + Math.sin(a) * 0.49, 0.03, 0, Math.PI * 2); g.fill(); }
      }
    }
    // Section 2 carries the engine's number, stencilled, and what they call it.
    if (i === 1) {
      g.fillStyle = INK.sunYellow;
      g.fillRect(0.12, -0.9, SEG - 0.24, 0.5);
      words(g, `No.${e.n}`, SEG / 2, -0.64, 0.34, C.ink, 'center', 800, 'Bagel Fat One');
    }
    if (i === 2) {
      g.beginPath(); g.rect(0.1, -0.86, SEG - 0.2, 0.36); paint(g, C.white, { lw: 0.02 });
      words(g, e.name, SEG / 2, -0.68, 0.13);
    }
  });
  // A yellow rail along the front, on the skid.
  if (i === 0 || i === 2) railX(ctx, xa, xa + SEG * 2, yF + 0.05, 0.3, 1.0);
  // The forward end: the turbocharger, a snail of hot steel.
  if (i === 3) {
    const tx = ENG_X + ENG_W, ty = y0 + ENG_D / 2;
    cylinder(ctx, tx + 0.35, ty, 1.7, 0.45, 0.8, MAT.steel);
    pipe(ctx, [[tx + 0.35, ty - 0.2, 2.5], [tx + 0.35, ty - 0.7, 3.05], [tx - 0.1, my, mz]], MAT.canvas, 0.36);
    onY(ctx, tx + 0.02, ty + 0.46, 2.35, (g) => words(g, 'HOT', 0.34, 0.1, 0.16, C.red));
  }
}
// A rail of posts and a top bar along x, standing at z.
function railX(ctx, x0, x1, y, z, h) {
  const n = Math.round((x1 - x0) / 1.2);
  for (let k = 0; k <= n; k++) {
    const x = x0 + 0.1 + ((x1 - x0 - 0.2) * k) / n;
    inked(ctx, [P(x, y, z), P(x, y, z + h)], INK.sunYellow, 0.06, 'butt');
  }
  inked(ctx, [P(x0 + 0.1, y, z + h), P(x1 - 0.1, y, z + h)], INK.sunYellow, 0.08);
}

// The rocker arms nodding on top of an engine, as fast as the ship's going.
function rockers(ctx, e, t) {
  if (!Q.detail) return;
  const ph = turned(t) * 9;
  for (let i = 0; i < 8; i++) {
    const hx = ENG_X + 0.1 + i * (SEG / 2) + 0.4;
    for (let k = 0; k < 2; k++) {
      const lift = way(t) > 0 || wrap(t) < T18 ? Math.max(0, Math.sin(ph + i * 2.1 + k * Math.PI)) * 0.12 : 0;
      const x = hx - 0.1 + k * 0.2, y = e.y + ENG_D / 2, z = HEAD_Z + HEAD_H + 0.14;
      inked(ctx, [P(x, y, z), P(x, y, z + 0.1 + lift)], MAT.chrome, 0.05, 'butt');
    }
  }
}

// A propeller shaft from the gearbox out through the stern wall, turning.
function shaft(ctx, yc, t) {
  const z = 0.95, r = 0.26, x1 = ENG_X - 0.75;
  pipe(ctx, [[0, yc, z], [x1, yc, z]], MAT.steel, r * 2.2, 'butt');
  if (Q.detail) {
    // Stripes painted round it, so you can see it turn.
    const ph = (turned(t) * 1.6) % 0.5;
    ctx.save();
    ctx.lineWidth = 0.07; ctx.strokeStyle = shade(MAT.steel, 0.4);
    ctx.beginPath();
    for (let x = ph; x < x1; x += 0.5) {
      const [a, b] = P(x, yc, z + r), [c, d] = P(x + 0.18, yc, z - r);
      ctx.moveTo(a, b); ctx.lineTo(c, d);
    }
    ctx.stroke();
    ctx.restore();
  }
  // The thrust block, and a coupling of bolts that goes round.
  box(ctx, 0.9, yc - 0.45, 0, 0.55, 0.9, 1.25, MAT.steelDark, { top: MAT.steel });
  const [X, Y] = P(1.95, yc, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.transform(1, 0.5, 0, 1, 0, 0);
  ctx.transform(1, 0, -0.9, 1, 0, 0); // the flange faces along the shaft
  ctx.beginPath(); ctx.ellipse(0, 0, 0.26, 0.48, 0, 0, Math.PI * 2);
  paint(ctx, MAT.steel, { lw: 0.03 });
  if (Q.detail) {
    const a0 = turned(t) * 2.2;
    ctx.fillStyle = C.ink;
    for (let b = 0; b < 6; b++) { const a = a0 + (b / 6) * Math.PI * 2; ctx.beginPath(); ctx.arc(Math.cos(a) * 0.17, Math.sin(a) * 0.34, 0.035, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}

// ---------- The gauge panel on the far wall ----------
// x 3 to 8, 0.8 deep, 3.6 tall; its face at y 1.4. The big gauge the
// apprentice taps is at u 2.6, v 0.75 on it (x 5.6, z 2.85).
const PANEL = { x: 3, y: 0.6, w: 5, d: 0.8, h: 3.6 };
const BIG = { u: 2.3, v: 1.62, r: 0.5 };
function panel(ctx) {
  const { x, y, w, d, h } = PANEL, yF = y + d;
  box(ctx, x, y, 0, w, d, h, MAT.steelDark, { top: MAT.steel, dens: 0.14 });
  onY(ctx, x, yF, h, (g) => {
    // The top strip: its name plate.
    g.beginPath(); g.rect(0.2, 0.06, w - 0.4, 0.22); paint(g, C.white, { lw: 0.02 });
    words(g, 'MAIN ENGINES: IF IN DOUBT, TAP IT', w / 2, 0.17, 0.12);
    // A row of little gauges, each happy.
    const small = [['OIL', 0.35], ['FUEL', 0.5], ['TEMP', 0.45], ['RPM', 0.6]];
    small.forEach(([l, v], i) => dial(g, [0.6, 1.3, 3.4, 4.3][i], 0.72, 0.26, v, { label: l, red: 0.85 }));
    // The big one: no needle here (it moves; see gaugeNeedle).
    dial(g, BIG.u, BIG.v, BIG.r, null, { label: 'PRESSURE', red: 0.78 });
    if (Q.detail) {
      words(g, 'NOPE', BIG.u + 0.66, BIG.v + 0.42, 0.11, C.red, 'center', 800);
      // A strip of tape across the glass: TAP ME.
      g.save(); g.translate(BIG.u + 0.05, BIG.v - 0.62); g.rotate(-0.12);
      g.fillStyle = alpha(C.butter, 0.9); g.fillRect(-0.35, -0.08, 0.7, 0.16);
      words(g, 'TAP ME', 0, 0, 0.1);
      g.restore();
    }
    // Switches and lamps lower down.
    g.beginPath(); g.rect(0.25, 2.5, w - 0.5, 0.95); paint(g, shade(MAT.steelDark, 0.15), { lw: 0.02 });
    for (let k = 0; k < 6; k++) {
      const u = 0.55 + k * 0.78;
      g.beginPath(); g.rect(u - 0.12, 2.6, 0.24, 0.34); paint(g, MAT.steel, { lw: 0.02 });
      g.beginPath(); g.moveTo(u, 2.77); g.lineTo(u + (k % 2 ? 0.08 : -0.08), 2.6);
      g.strokeStyle = C.ink; g.lineWidth = 0.05; g.lineCap = 'round'; g.stroke();
    }
    words(g, 'DO NOT TOUCH', w / 2, 3.12, 0.12, C.white);
    words(g, '(EXCEPT TO TAP)', w / 2, 3.28, 0.09, C.white, 'center', 700);
    // Sticky notes from the day shift.
    g.save(); g.translate(3.75, 1.95); g.rotate(0.1);
    g.beginPath(); g.rect(-0.22, -0.22, 0.44, 0.44); paint(g, C.butter, { lw: 0.02 });
    words(g, 'CHIEF', 0, -0.08, 0.08); words(g, 'SAYS FINE', 0, 0.06, 0.07);
    g.restore();
  });
}
// The big needle, which climbs all day and jumps at every tap.
function pressure(t) {
  const s = inHour(t);
  const hourK = Math.floor(wrap(t) / HOUR) / 11; // a little higher every hour
  const taps = tapsSoFar(s) * 0.035;
  const creep = (s / HOUR) * 0.04;
  const quiver = Math.sin(t * 29) * 0.008;
  const v = 0.18 + hourK * 0.62 + taps + creep + quiver;
  // Stopped in port, it sinks.
  return v * (0.25 + 0.75 * way(t));
}
function gaugeNeedle(ctx, t) {
  onY(ctx, PANEL.x, PANEL.y + PANEL.d + 0.01, PANEL.h, (g) => {
    needle(g, BIG.u, BIG.v, BIG.r, pressure(t));
    if (!Q.detail) return;
    // The lamps on the switch strip: green (C.leaf, not the queasy green) and
    // a red one that flashes with the alarm.
    const on = alarm(t) && Math.floor(t * 4) % 2 === 0;
    for (let k = 0; k < 6; k++) {
      const blink = Math.sin(t * (1.3 + k * 0.7) + k * 2) > -0.3;
      g.beginPath(); g.arc(3.3 + k * 0.24, 1.25, 0.07, 0, Math.PI * 2);
      g.fillStyle = k === 3 ? (on ? C.red : shade(C.red, 0.5)) : blink ? C.leaf : shade(C.leaf, 0.5);
      g.fill();
    }
  });
}

// ---------- The alarm ----------
// A red beacon on top of the panel, spinning when the alarm goes.
const BEACON = [7.3, 1.0, PANEL.h];
function beacon(ctx, t) {
  const [x, y, z] = BEACON;
  cylinder(ctx, x, y, z, 0.2, 0.08, MAT.steelDark);
  const on = alarm(t);
  const spin = t * 9;
  cylinder(ctx, x, y, z + 0.08, 0.16, 0.34, on ? C.red : shade(C.red, 0.35), { flat: true });
  if (on && Q.detail) {
    // The lamp's beam, sweeping round.
    const [X, Y] = P(x, y, z + 0.25);
    const dx = Math.cos(spin), dy = Math.sin(spin) * 0.5;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.beginPath();
    ctx.moveTo(X, Y);
    ctx.lineTo(X + dx * 3 - dy * 0.8, Y + dy * 3 + dx * 0.4);
    ctx.lineTo(X + dx * 3 + dy * 0.8, Y + dy * 3 - dx * 0.4);
    ctx.closePath();
    ctx.fillStyle = alpha(C.coralLight, 0.35);
    ctx.fill();
    ctx.restore();
    // Klaxon lines.
    ctx.strokeStyle = C.red; ctx.lineWidth = 0.05; ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      const a = -0.6 + k * 0.6, r0 = 0.35 + ((t * 3) % 0.3);
      ctx.beginPath();
      ctx.moveTo(X + Math.cos(a - Math.PI / 2) * r0, Y - 0.1 + Math.sin(a - Math.PI / 2) * r0);
      ctx.lineTo(X + Math.cos(a - Math.PI / 2) * (r0 + 0.18), Y - 0.1 + Math.sin(a - Math.PI / 2) * (r0 + 0.18));
      ctx.stroke();
    }
  }
}

// ---------- The apprentice ----------
// His hour: tap tap tap tap at the gauge, the alarm, run to the hammock, poke,
// walk back, stare. Points in his route, and when he's at them.
const AT_GAUGE = [4.95, 2.0];
const TO_HAMMOCK = [AT_GAUGE, [11.3, 4.9], [11.75, 10.4], [11.95, 12.05]];
const LEG = { out: [4.5, 8.0], back: [12.2, 17.5] };
function along(pts, k) {
  const lens = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); lens.push(l); total += l; }
  let d = clamp(k) * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const f = lens[i] ? Math.min(1, d / lens[i]) : 0;
      const a = pts[i], b = pts[i + 1];
      const dX = (b[0] - a[0]) - (b[1] - a[1]), dY = (b[0] - a[0]) + (b[1] - a[1]);
      return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, dir: dX >= 0 ? 'r' : 'l', back: dY < -0.01 };
    }
    d -= lens[i];
  }
  return { x: pts[0][0], y: pts[0][1], dir: 'r', back: false };
}
function apprentice(t) {
  const s = inHour(t);
  if (s < LEG.out[0] || s >= LEG.back[1]) {
    // At the gauge, his back to us. Tapping, or staring at it.
    const tap = TAPS.find((a) => s >= a - 0.25 && s < a + 0.15);
    const k = tap != null ? 1 - Math.abs(s - tap) / 0.25 : 0;
    const scratch = s >= LEG.back[1];
    return {
      x: AT_GAUGE[0], y: AT_GAUGE[1], dir: 'r', back: true, pose: 'stand',
      arms: scratch ? [Math.PI - 0.3 + Math.sin(t * 8) * 0.1, -0.15] : s < 3.6 ? [1.95 + k * 0.45, -0.15] : [0.15, -0.15],
    };
  }
  if (s < LEG.out[1]) {
    const p = along(TO_HAMMOCK, ease((s - LEG.out[0]) / (LEG.out[1] - LEG.out[0])));
    return { ...p, pose: 'run', moving: true };
  }
  if (s < LEG.back[0]) {
    // At the hammock: poking the chief, who doesn't move.
    const poke = Math.max(0, Math.sin((s - LEG.out[1]) * 7));
    const say = s >= 8.5 && s < 9.9 ? 'Chief?' : s >= 9.9 && s < 11.5 ? 'CHIEF!' : null;
    return { x: TO_HAMMOCK[3][0], y: TO_HAMMOCK[3][1], dir: 'l', back: false, pose: 'stand', arms: [1.2 + poke * 0.3, 0.3], say };
  }
  const p = along(TO_HAMMOCK, 1 - (s - LEG.back[0]) / (LEG.back[1] - LEG.back[0]));
  const q = along(TO_HAMMOCK, 1 - (s - LEG.back[0] - 0.05) / (LEG.back[1] - LEG.back[0]));
  const dX = (q.x - p.x) - (q.y - p.y), dY = (q.x - p.x) + (q.y - p.y);
  return { x: p.x, y: p.y, dir: dX >= 0 ? 'r' : 'l', back: dY < -0.001, pose: 'walk', moving: true };
}

// ---------- The hammock ----------
// Strung between the pipes at x 10.5 and 15, near the cut side.
const HAM = { x0: 11.2, x1: 14.35, y0: 12.95, y1: 13.95, z: 2.0, sag: 0.7 };
const hamZ = (u) => HAM.z - HAM.sag * Math.sin(Math.PI * u);
function hammock(ctx, t) {
  const sway = Math.sin(t * 0.9) * 0.06;
  const breathe = Math.sin(t * 1.3);
  const X = (u) => HAM.x0 + (HAM.x1 - HAM.x0) * u;
  const N = 12;
  // The ropes from each pipe to the spreader bars.
  for (const [px, u] of [[10.72, 0], [14.8, 1]]) {
    for (const y of [HAM.y0, HAM.y1]) {
      const pts = [P(px, 13.2, 2.45), P(X(u), y + sway, hamZ(u))];
      ctx.beginPath(); ctx.moveTo(...pts[0]); ctx.lineTo(...pts[1]);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.035; ctx.stroke();
    }
  }
  // The bed, in stripes of canvas and sun yellow, the far side first.
  const edge = (y, u) => P(X(u), y + sway, hamZ(u));
  const band = (ya, yb, color) => {
    ctx.beginPath();
    for (let i = 0; i <= N; i++) ctx.lineTo(...edge(ya, i / N));
    for (let i = N; i >= 0; i--) ctx.lineTo(...edge(yb, i / N));
    ctx.closePath();
    paint(ctx, color, { stroke: false });
  };
  const ys = [0, 0.25, 0.5, 0.75, 1].map((k) => HAM.y0 + (HAM.y1 - HAM.y0) * k);
  for (let i = 0; i < 4; i++) band(ys[i], ys[i + 1], i % 2 ? MAT.canvas : INK.sunYellow);
  // The chief, lying in it, feet toward the bow, ear defenders on.
  lying(ctx, 13.95, 13.35 + sway, 1.45 + breathe * 0.015, LOOK.chief, t, { face: chiefFace, arms: [0.5, 0.35] });
  // A mug of coffee on his belly, going up and down, never spilling.
  if (Q.detail) {
    const [mx, my] = P(13.25, 13.35 + sway, 1.8 + breathe * 0.04);
    ctx.beginPath(); ctx.rect(mx - 0.1, my - 0.2, 0.2, 0.22); paint(ctx, C.white, { lw: 0.025 });
    ctx.beginPath(); ctx.arc(mx + 0.12, my - 0.1, 0.06, -1.4, 1.4); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
  }
  // The near lip of the canvas, wrapping over him.
  ctx.beginPath();
  for (let i = 0; i <= N; i++) ctx.lineTo(...P(X(i / N), HAM.y1 + sway, hamZ(i / N)));
  for (let i = N; i >= 0; i--) ctx.lineTo(...P(X(i / N), HAM.y1 + sway + 0.05, hamZ(i / N) + 0.28 * Math.sin(Math.PI * i / N)));
  ctx.closePath();
  paint(ctx, INK.sunYellow, { lw: 0.035 });
  // Spreader bars at each end.
  for (const u of [0, 1]) inked(ctx, [edge(HAM.y0 - 0.05, u), edge(HAM.y1 + 0.05, u)], INK.teak, 0.08);
  // The Zs.
  if (Q.detail) {
    for (let i = 0; i < 3; i++) {
      const k = ((t * 0.5 + i / 3) % 1);
      const [zx, zy] = P(11.6 - k * 0.6, 13.3, 2.6 + k * 1.6);
      ctx.save(); ctx.translate(zx, zy); ctx.scale(1 / 40, 1 / 40);
      ctx.font = `${(0.36 + k * 0.3) * 40}px "Bagel Fat One", sans-serif`;
      ctx.fillStyle = alpha(C.ink, 1 - k); ctx.textAlign = 'center';
      ctx.fillText('z', 0, 0);
      ctx.restore();
    }
  }
}
// A pipe standing from floor to ceiling, with a valve.
function riser(ctx, x, y, color = MAT.steel) {
  pipe(ctx, [[x, y, 0], [x, y, 6.1]], color, 0.42, 'butt');
  box(ctx, x - 0.3, y - 0.3, 0, 0.6, 0.6, 0.12, MAT.steelDark, { flat: true, lw: 0.03 });
  for (const z of [1.4, 2.45, 4.6]) flange(ctx, [x, y, z], [x, y, z + 0.1], 0.42);
  handwheel(ctx, x + 0.32, y + 0.32, 3.4, 0.2);
  pipe(ctx, [[x, y, 3.25], [x + 0.32, y + 0.32, 3.25], [x + 0.32, y + 0.32, 3.4]], MAT.steelDark, 0.1);
}

// ---------- The wrench, and what it's lost among ----------
const WRENCH = [4, 14.8];
function wrench(ctx) {
  const [x, y] = WRENCH, z = 0.05;
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(1, 0.55);
  ctx.rotate(-0.5);
  // The handle and the adjustable jaw at one end.
  ctx.beginPath(); ctx.roundRect(-0.46, -0.07, 0.72, 0.14, 0.07);
  paint(ctx, MAT.chrome, { lw: 0.03 });
  ctx.beginPath();
  ctx.moveTo(0.22, -0.16); ctx.lineTo(0.52, -0.2); ctx.lineTo(0.52, -0.06); ctx.lineTo(0.36, -0.04);
  ctx.lineTo(0.36, 0.04); ctx.lineTo(0.52, 0.06); ctx.lineTo(0.52, 0.2); ctx.lineTo(0.22, 0.16);
  ctx.closePath();
  paint(ctx, MAT.chrome, { lw: 0.03 });
  if (Q.detail) {
    ctx.beginPath(); ctx.ellipse(0.2, 0, 0.05, 0.035, 0, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
    ctx.beginPath(); ctx.arc(-0.38, 0, 0.035, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
// A hex nut lying on the floor.
function nut(ctx, x, y, s = 0.12) {
  const [X, Y] = P(x, y, 0.03);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.lineTo(X + Math.cos(a) * s * 1.4, Y + Math.sin(a) * s * 0.7); }
  ctx.closePath();
  paint(ctx, MAT.steel, { lw: 0.02 });
  ctx.beginPath(); ctx.ellipse(X, Y, s * 0.55, s * 0.28, 0, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
}

export default {
  id: 'engine-room',
  name: 'The Engine Room',
  blurb: 'The engineer sleeps through every alarm. His apprentice keeps tapping a gauge that keeps going up.',

  build(R) {
    deck(R, 'engine-room', 'crew', { name: false, floor: tint(MAT.steel, 0.5), grid: 2 });

    // ---------- The floor: steel plate, a painted walkway, oil ----------
    R.rug((ctx) => {
      // The plate's tread, as a light screen.
      rect(ctx, 0, 0, 16, 16, 0, null, { stroke: false, dots: shade(MAT.steel, 0.2), density: 0.08 });
      // The walkway from the lift to the Crew Bar: keep it clear.
      rect(ctx, 10.3, 1.3, 5.7, 3.9, 0.005, alpha(INK.sunYellow, 0.28), { stroke: false });
      ctx.save();
      ctx.lineWidth = 0.08; ctx.strokeStyle = INK.sunYellow;
      for (const [a, b] of [[[10.3, 1.3], [16, 1.3]], [[10.3, 5.2], [16, 5.2]], [[10.3, 1.3], [10.3, 5.2]]]) {
        ctx.beginPath(); ctx.moveTo(...P(a[0], a[1], 0)); ctx.lineTo(...P(b[0], b[1], 0)); ctx.stroke();
      }
      ctx.restore();
      if (Q.detail) {
        const [X, Y] = P(13.4, 3.3, 0);
        ctx.save(); ctx.translate(X, Y); ctx.transform(1, 0.5, -1, 0.5, 0, 0); ctx.scale(1 / 40, 1 / 40);
        ctx.font = '800 22px "Rethink Sans", sans-serif'; ctx.fillStyle = shade(INK.sunYellow, 0.3);
        ctx.textAlign = 'center'; ctx.fillText('KEEP CLEAR', 0, 0);
        ctx.restore();
      }
      // Hazard stripes round each engine's skid.
      for (const e of ENGINES) {
        rect(ctx, ENG_X - 1, e.y - 0.45, ENG_W + 2, ENG_D + 0.9, 0.004, null, { stroke: INK.sunYellow, lw: 0.07 });
      }
      // Oil stains, and a rag by the wrench.
      for (const [x, y, r] of [[6.5, 9.7, 0.45], [9.2, 9.4, 0.3], [2.2, 13.9, 0.35], [8.6, 14.9, 0.3]]) {
        disc(ctx, x, y, 0.004, r, alpha(C.ink, 0.13), { stroke: false });
      }
      shape(ctx, [[4.6, 15.2, 0.02], [5.3, 15.0, 0.02], [5.5, 15.5, 0.02], [4.9, 15.75, 0.02], [4.5, 15.55, 0.02]], C.red, { lw: 0.025 });
      if (Q.detail) {
        ctx.save();
        shape(ctx, [[4.7, 15.3, 0.03], [5.2, 15.15, 0.03], [5.3, 15.45, 0.03]], null, { stroke: shade(C.red, 0.4), lw: 0.02 });
        ctx.restore();
      }
      // The wrench's look-alikes: nuts, a bolt, a screwdriver.
      for (const [x, y, s] of [[3.2, 14.3, 0.11], [3.5, 15.4, 0.09], [4.8, 14.3, 0.1], [2.9, 15.1, 0.13], [5.8, 14.6, 0.09]]) nut(ctx, x, y, s);
      {
        const a = P(3.0, 14.6, 0.04), b = P(3.0, 15.5, 0.04);
        inked(ctx, [a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]], C.red, 0.1);
        inked(ctx, [[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], b], MAT.chrome, 0.04);
      }
      wrench(ctx);
    });

    // ---------- The far wall (the hull, inside) ----------
    R.decor((ctx) => {
      // Pipes along the top of the wall: the rat's road.
      pipe(ctx, [[0, 0.25, 5.3], [16, 0.25, 5.3]], MAT.steel, 0.42, 'butt');
      pipe(ctx, [[0, 0.2, 5.85], [16, 0.2, 5.85]], C.red, 0.26, 'butt');
      for (let x = 1; x < 16; x += 2.5) flange(ctx, [x, 0.25, 5.3], [x + 0.2, 0.25, 5.3], 0.42);
      // Pipes down to the panel, and to the lift's side.
      pipe(ctx, [[3.4, 0.2, 5.3], [3.4, 0.2, 3.6]], MAT.steel, 0.2);
      pipe(ctx, [[7.7, 0.2, 5.3], [7.7, 0.2, 3.6]], MAT.steel, 0.2);
      pipe(ctx, [[9.6, 0.2, 5.3], [9.6, 0.2, 0]], MAT.steelDark, 0.24);
      handwheel(ctx, 9.6, 0.5, 2.2, 0.2, C.red);
      // Portholes onto the deep sea.
      porthole(ctx, 1.6, 3.4, 0.42, shade(INK.sea, 0.3));
      porthole(ctx, 8.9, 4.2, 0.42, shade(INK.sea, 0.3));
      // By the door to the Crew Bar: the board.
      board(ctx, 'x', 15.0, 0.02, 3.3, 1.7, 1.2, null, { board: C.white });
      lettering(ctx, 15.0, 3.7, 'HOURS SINCE THE', 0.14);
      lettering(ctx, 15.0, 3.5, 'CHIEF WOKE UP', 0.14);
      // A fire extinguisher and a phone to the bridge.
      board(ctx, 'x', 15.0, 0.02, 1.9, 0.9, 0.5, 'EAR PROTECTION', { board: INK.sunYellow, size: 0.11 });
      board(ctx, 'x', 1.6, 0.02, 1.9, 1.5, 0.8, null, { board: C.white });
      lettering(ctx, 1.6, 2.05, 'THE SEA IS', 0.13);
      lettering(ctx, 1.6, 1.8, 'OUTSIDE. KEEP IT', 0.13);
      lettering(ctx, 1.6, 1.58, 'THAT WAY', 0.13);
    });
    // Lettering on the far wall (plane y = 0), a line centred at (x, z).
    function lettering(ctx, x, z, s, size, color = C.ink) {
      onY(ctx, x, 0.03, z, (g) => words(g, s, 0, 0, size, color));
    }

    // ---------- The stern wall (x = 0): the shafts go out through it ----------
    R.decor((ctx) => {
      for (const e of ENGINES) {
        const yc = e.y + ENG_D / 2;
        onX(ctx, 0.02, yc, 0.95, (g) => {
          g.beginPath(); g.arc(0, 0, 0.6, 0, Math.PI * 2); paint(g, MAT.steelDark, { lw: 0.03 });
          if (Q.detail) {
            g.fillStyle = MAT.chrome;
            for (let b = 0; b < 8; b++) { const a = (b / 8) * Math.PI * 2; g.beginPath(); g.arc(Math.cos(a) * 0.48, Math.sin(a) * 0.48, 0.04, 0, Math.PI * 2); g.fill(); }
          }
        });
      }
      // Between them, where the propellers are.
      onX(ctx, 0.02, 10.6, 3.2, (g) => {
        g.beginPath(); g.rect(0, 0, 1.8, 0.95); paint(g, C.white, { lw: 0.025 });
        words(g, 'PROPELLERS', 0.9, 0.22, 0.17);
        words(g, 'OTHER SIDE OF', 0.9, 0.46, 0.12, C.ink, 'center', 700);
        words(g, 'THIS WALL', 0.9, 0.63, 0.12, C.ink, 'center', 700);
        g.beginPath(); g.moveTo(0.5, 0.82); g.lineTo(1.3, 0.82); g.lineTo(1.2, 0.76); g.moveTo(1.3, 0.82); g.lineTo(1.2, 0.88);
        g.strokeStyle = C.red; g.lineWidth = 0.04; g.stroke();
      });
      // The exhaust stacks going up the wall to the funnel.
      for (const e of ENGINES) pipe(ctx, [[0.3, e.y + 0.32, 3.05], [0.3, e.y + 0.32, 6.2]], MAT.canvas, 0.5, 'butt');
      // A pegboard of tools over the bench, with an outline where the wrench goes.
      onX(ctx, 0.02, 2.7, 3.6, (g) => {
        g.beginPath(); g.rect(0, 0, 2.4, 1.4); paint(g, INK.teak, { lw: 0.025, dots: shade(INK.teak, 0.4), density: 0.1 });
        if (!Q.detail) return;
        const tool = (u, v, h, c) => { g.beginPath(); g.roundRect(u - 0.05, v, 0.1, h, 0.04); paint(g, c, { lw: 0.015 }); };
        tool(0.3, 0.2, 0.8, MAT.chrome); tool(0.55, 0.25, 0.6, C.red); tool(0.8, 0.2, 0.7, MAT.chrome);
        // the missing one: just its outline
        g.save(); g.setLineDash([0.05, 0.04]);
        g.beginPath(); g.roundRect(1.2, 0.2, 0.12, 0.85, 0.05); g.strokeStyle = C.white; g.lineWidth = 0.025; g.stroke();
        g.restore();
        tool(1.6, 0.3, 0.55, INK.sunYellow); tool(1.85, 0.2, 0.75, MAT.chrome); tool(2.1, 0.25, 0.6, C.red);
        words(g, 'WHERE IS IT', 1.26, 1.22, 0.09, C.white);
      });
    });

    // The count on the board goes up every hour: someone chalks it on.
    const hoursUp = (t) => 79 + Math.floor(wrap(t) / HOUR);
    R.decor((ctx, t) => lettering(ctx, 15.0, 3.02, String(hoursUp(t)), 0.5, C.red), { anim: true });
    body(R, 15.1, 1.05, { skin: SKIN[4], hair: HAIR[0], style: 'bun', hat: 'none', top: C.white, bottom: C.navy }, {
      pose: (t) => {
        const s = inHour(t);
        return { dir: 'r', back: true, arms: s < 1.6 ? [2.75 + Math.sin(t * 14) * 0.08, -0.1] : s < 6 ? [0.2, 0.9] : [0.15, -0.15] };
      },
    });

    // ---------- The engines ----------
    for (const e of ENGINES) {
      for (let i = 0; i < 4; i++) R.thing(ENG_X + (i + 0.5) * SEG, e.y + ENG_D, (ctx) => engineSection(ctx, e, i));
      R.thing(ENG_X + ENG_W, e.y + ENG_D, (ctx, t) => rockers(ctx, e, t), { anim: true, depth: ENG_X + ENG_W + e.y + ENG_D + 0.02 });
      const yc = e.y + ENG_D / 2;
      R.thing(1.2, yc + 0.3, (ctx, t) => shaft(ctx, yc, t), { anim: true });
    }
    // A heat shimmer off the turbos.
    R.air((ctx, t) => {
      if (!Q.detail || way(t) < 0.1) return;
      for (const e of ENGINES) {
        particles(t, 3, 2.2, (k, r) => {
          const [X, Y] = P(10.35 + (r() - 0.5) * 0.3, e.y + ENG_D / 2, 2.6 + k * 1.6);
          ctx.beginPath();
          ctx.moveTo(X - 0.15, Y); ctx.quadraticCurveTo(X, Y - 0.12 + Math.sin(t * 6 + r() * 6) * 0.05, X + 0.15, Y);
          ctx.strokeStyle = alpha(C.white, 0.5 * (1 - k)); ctx.lineWidth = 0.04; ctx.stroke();
        }, e.n * 17);
      }
    });

    // ---------- The panel, the big gauge, the alarm ----------
    R.thing(PANEL.x + PANEL.w / 2, PANEL.y + PANEL.d, panel);
    R.thing(PANEL.x + PANEL.w / 2, PANEL.y + PANEL.d, gaugeNeedle, { anim: true, depth: PANEL.x + PANEL.w / 2 + PANEL.y + PANEL.d + 0.01 });
    R.thing(BEACON[0], BEACON[1] + 0.3, beacon, { anim: true, depth: PANEL.x + PANEL.w / 2 + PANEL.y + PANEL.d + 0.02 });
    R.light({ at: [BEACON[0], BEACON[1] + 1, BEACON[2]], r: 5, color: C.red, k: (t) => (alarm(t) ? 0.35 + 0.35 * Math.abs(Math.sin(t * 9)) : 0) });
    // A second beacon over the hammock, for all the good it does.
    R.light({ at: [12.8, 13.2, 5.6], r: 3.5, color: C.red, k: (t) => (alarm(t) ? 0.3 + 0.3 * Math.abs(Math.cos(t * 9)) : 0) });

    // The apprentice, and what he says at the hammock.
    R.mover(apprentice, (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, { ...LOOK.apprentice, pose: p.pose, dir: p.dir, back: p.back, arms: p.arms, speed: 11 }, t);
      if (p.say && readable()) speech(ctx, p.x, p.y, 2.9, p.say, { size: 0.42 });
    });

    // ---------- The hammock ----------
    R.thing(10.5, 13.2, (ctx) => riser(ctx, 10.5, 13.2));
    R.thing(12.8, 14.0, hammock, { anim: true });
    R.thing(15.0, 13.2, (ctx) => {
      riser(ctx, 15.0, 13.2, MAT.steelDark);
      // The tag on the pipe.
      onY(ctx, 14.62, 13.52, 3.0, (g) => {
        g.beginPath(); g.rect(0, 0, 0.8, 0.5); paint(g, C.white, { lw: 0.02 });
        words(g, 'CHIEF', 0.4, 0.14, 0.12); words(g, 'DO NOT', 0.4, 0.29, 0.09, C.red); words(g, 'WAKE', 0.4, 0.4, 0.09, C.red);
      });
    });

    // ---------- The control desk, and the phone to the bridge ----------
    R.thing(13.7, 8.9, (ctx) => {
      box(ctx, 12.0, 7.8, 0, 3.4, 1.0, 1.0, MAT.steel, { top: MAT.steelDark });
      // The sloping console, facing the chair.
      face(ctx, [[12.05, 7.85, 1.0], [15.35, 7.85, 1.0], [15.35, 7.85, 1.6], [12.05, 7.85, 1.6]], MAT.steelDark);
      face(ctx, [[12.05, 7.85, 1.6], [15.35, 7.85, 1.6], [15.35, 8.75, 1.35], [12.05, 8.75, 1.35]], shade(MAT.steel, 0.1));
      // A little screen: a drawing of two engines, and ALL FINE.
      onY(ctx, 12.4, 7.86, 2.35, (g) => {
        g.beginPath(); g.rect(0, 0, 1.2, 0.72); paint(g, C.night, { lw: 0.03 });
        g.fillStyle = tint(C.teal, 0.2);
        g.fillRect(0.12, 0.14, 0.95, 0.12); g.fillRect(0.12, 0.34, 0.95, 0.12);
        words(g, 'ALL FINE', 0.6, 0.6, 0.12, C.leaf);
      });
      box(ctx, 12.35, 7.82, 1.0, 1.5, 0.3, 0.6, MAT.steelDark, { flat: true, lw: 0.03 });
      // The red phone.
      box(ctx, 14.6, 8.3, 1.45, 0.45, 0.35, 0.12, C.red, { flat: true, lw: 0.03 });
      // Knobs.
      if (Q.detail) for (let k = 0; k < 5; k++) disc(ctx, 13.1 + k * 0.28, 8.45, 1.5, 0.06, k % 2 ? C.white : C.ink, { lw: 0.015 });
    });
    // The console's lamps.
    R.thing(13.7, 8.9, (ctx, t) => {
      if (!Q.detail) return;
      for (let k = 0; k < 6; k++) {
        const on = Math.sin(t * (2 + k) + k) > 0;
        disc(ctx, 12.3 + k * 0.22, 8.3, 1.46, 0.05, alarm(t) && k > 3 ? C.red : on ? INK.sunYellow : shade(INK.sunYellow, 0.5), { stroke: false });
      }
    }, { anim: true, depth: 13.7 + 8.9 + 0.01 });
    // The second engineer, on the phone to the bridge, covering for the chief.
    const PHONE = [
      [4.6, 6.5, 'Engine room.'], [6.5, 8.4, 'Alarm? What alarm?'], [12.0, 14.1, 'Chief is inspecting.'],
      [14.1, 16.2, 'Lying down, yes.'],
    ];
    R.thing(13.2, 9.95, (ctx) => box(ctx, 12.9, 9.65, 0, 0.6, 0.6, 0.72, MAT.steelDark, { top: C.red }));
    body(R, 13.2, 9.95, LOOK.second, {
      depth: 13.2 + 9.95 + 0.01,
      pose: (t) => {
        const s = inHour(t);
        const onPhone = s >= 4.4 && s < 16.4;
        return { pose: 'sit', dir: 'r', back: true, z: 0, arms: onPhone ? [2.5, 0.6] : [0.9, 0.7] };
      },
      after(ctx, t) {
        const s = inHour(t);
        const onPhone = s >= 4.4 && s < 16.4;
        if (onPhone && Q.detail) {
          // The handset at his ear.
          const [hx, hy] = handAt(13.2, 9.95, 0, 'r', 2.5);
          const [X, Y] = P(13.2, 9.95, 0);
          inked(ctx, [[hx, hy], [X + 0.3, Y - 1.95]], C.red, 0.1);
        }
        const line = PHONE.find(([a, b]) => s >= a && s < b);
        if (line && readable()) speech(ctx, 13.2, 9.95, 2.6, line[2], { size: 0.42 });
      },
    });

    // ---------- The telegraph: FULL AHEAD, until the port ----------
    const ORDERS = ['STOP', 'SLOW', 'HALF', 'FULL'];
    const order = (t) => { const h = hourOf(t); return h < 17 ? 3 : h < 17.5 ? 2 : h < 18 ? 1 : 0; };
    R.thing(15.4, 9.9, (ctx) => {
      cylinder(ctx, 15.4, 9.6, 0, 0.25, 1.4, MAT.brass);
      cylinder(ctx, 15.4, 9.6, 1.4, 0.35, 0.12, shade(MAT.brass, 0.2));
    });
    R.thing(15.4, 9.95, (ctx, t) => {
      onY(ctx, 15.4, 9.96, 2.4, (g) => {
        g.beginPath(); g.arc(0, 0.45, 0.5, Math.PI, 0); g.closePath();
        paint(g, C.white, { lw: 0.03 });
        g.beginPath(); g.arc(0, 0.45, 0.58, Math.PI, 0); g.strokeStyle = MAT.brass; g.lineWidth = 0.1; g.stroke();
        if (Q.detail) ORDERS.forEach((w, i) => {
          const a = Math.PI + (i + 0.5) * (Math.PI / 4);
          words(g, w, Math.cos(a) * 0.34, 0.45 + Math.sin(a) * 0.32, 0.07, i === 0 ? C.red : C.ink);
        });
        const a = Math.PI + (order(t) + 0.5) * (Math.PI / 4);
        g.beginPath(); g.moveTo(0, 0.45); g.lineTo(Math.cos(a) * 0.5, 0.45 + Math.sin(a) * 0.5);
        g.strokeStyle = C.ink; g.lineWidth = 0.07; g.lineCap = 'round'; g.stroke();
      });
      // It rings when the order changes.
      const s = wrap(t);
      const ringing = [at(17), at(17.5), at(18)].some((m) => s >= m && s < m + 2);
      if (ringing && Q.detail) {
        const [X, Y] = P(15.4, 9.96, 2.9);
        ctx.strokeStyle = MAT.brass; ctx.lineWidth = 0.05;
        for (const f of [-1, 1]) {
          ctx.beginPath(); ctx.arc(X, Y, 0.6 + (t * 2 % 0.3), f < 0 ? Math.PI * 0.9 : -0.4, f < 0 ? Math.PI * 1.4 : 0.1); ctx.stroke();
        }
      }
    }, { anim: true, depth: 15.4 + 9.95 + 0.02 });

    // ---------- The greaser, oiling the turbos at the forward end ----------
    R.mover((t) => {
      const cycle = 14, s = ((t % cycle) + cycle) % cycle;
      const Y1 = 8.25, Y2 = 11.25, X = 11.0;
      if (s < 3) return { x: X, y: Y1, dir: 'l', back: true, oil: true };
      if (s < 5) return { x: X, y: Y1 + (Y2 - Y1) * (s - 3) / 2, dir: 'l', back: false, moving: true };
      if (s < 8) return { x: X, y: Y2, dir: 'l', back: true, oil: true };
      if (s < 10) return { x: X, y: Y2 - (Y2 - Y1) * (s - 8) / 2, dir: 'r', back: true, moving: true };
      return { x: X, y: Y1, dir: 'r', back: false, wipe: true };
    }, (ctx, t, p) => {
      const squeeze = p.oil ? Math.max(0, Math.sin(t * 6)) : 0;
      person(ctx, p.x, p.y, 0, {
        ...LOOK.greaser, pose: p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back,
        arms: p.oil ? [1.9 + squeeze * 0.2, 0.4] : p.wipe ? [2.9 + Math.sin(t * 5) * 0.15, 0.2] : undefined,
        hold: (g) => { // the oil can with its long spout
          g.beginPath(); g.ellipse(0.1, 0.05, 0.13, 0.1, 0, 0, Math.PI * 2); paint(g, MAT.brass, { lw: 0.02 });
          g.beginPath(); g.moveTo(0.18, 0.0); g.lineTo(0.5, -0.25); g.strokeStyle = C.ink; g.lineWidth = 0.03; g.stroke();
        },
      }, t);
      if (p.oil && Q.detail && squeeze > 0.6) {
        const [hx, hy] = handAt(p.x, p.y, 0, p.dir, 1.9 + squeeze * 0.2);
        ctx.fillStyle = C.black;
        ctx.beginPath(); ctx.arc(hx + (p.dir === 'l' ? -0.45 : 0.45), hy - 0.1 + squeeze * 0.15, 0.04, 0, Math.PI * 2); ctx.fill();
      }
    });

    // ---------- The card game, in the stern corner ----------
    const CY = 3.3;
    R.thing(1.8, CY + 0.45, (ctx) => {
      // An upturned crate for a table, and two paint tins for stools.
      box(ctx, 1.35, CY - 0.45, 0, 0.9, 0.9, 0.85, INK.teak, { top: tint(INK.teak, 0.2) });
      if (Q.detail) {
        rect(ctx, 1.5, CY - 0.3, 0.25, 0.35, 0.86, C.white, { lw: 0.015 });
        rect(ctx, 1.85, CY - 0.15, 0.25, 0.35, 0.86, C.white, { lw: 0.015 });
        // the pot: washers instead of chips
        for (const [x, y] of [[1.7, CY + 0.2], [1.8, CY + 0.25], [1.75, CY + 0.15]]) disc(ctx, x, y, 0.87, 0.07, MAT.chrome, { lw: 0.015 });
      }
    });
    for (const [x, y] of [[0.6, CY], [2.9, CY]]) R.thing(x, y + 0.3, (ctx) => cylinder(ctx, x, y, 0, 0.3, 0.6, INK.sunYellow));
    const CARDS = [[14, 15.8, 'Got any sevens?', 0], [15.8, 17.6, 'Go fish.', 1]];
    const cardsIn = (g) => { // a fan of cards
      for (let k = 0; k < 3; k++) { g.save(); g.rotate(-0.4 + k * 0.3); g.beginPath(); g.rect(-0.06, -0.3, 0.14, 0.22); paint(g, C.white, { lw: 0.015 }); g.restore(); }
    };
    body(R, 0.6, CY, LOOK.dealer, {
      pose: (t) => ({ pose: 'sit', dir: 'r', z: 0, arms: [1.3 + Math.max(0, Math.sin(t * 0.8)) * 0.3, 1.1], hold: cardsIn }),
      z: 0.2,
      after(ctx, t) { const s = inHour(t); const l = CARDS.find(([a, b, , w]) => w === 0 && s >= a && s < b); if (l && readable()) speech(ctx, 0.6, CY, 2.7, l[2], { size: 0.4 }); },
    });
    body(R, 2.9, CY, LOOK.player, {
      pose: (t) => ({ pose: 'sit', dir: 'l', z: 0, arms: [1.2, 1.0], hold: cardsIn }),
      z: 0.2,
      after(ctx, t) { const s = inHour(t); const l = CARDS.find(([a, b, , w]) => w === 1 && s >= a && s < b); if (l && readable()) speech(ctx, 2.9, CY, 2.7, l[2], { size: 0.4 }); },
    });

    // ---------- The workbench on the stern wall, and the grinder ----------
    const BY = 14.1;
    R.thing(0.5, BY + 1.6, (ctx) => {
      box(ctx, 0.05, BY - 0.3, 0, 0.9, 1.9, 1.1, INK.teak, { top: tint(INK.teak, 0.15) });
      // The vice.
      box(ctx, 0.3, BY + 0.5, 1.1, 0.4, 0.45, 0.3, C.red, { flat: true, lw: 0.03 });
      box(ctx, 0.35, BY + 0.6, 1.4, 0.3, 0.25, 0.12, MAT.steel, { flat: true, lw: 0.02 });
      // A coffee can of bolts, a tin of grease.
      cylinder(ctx, 0.5, BY - 0.05, 1.1, 0.15, 0.3, MAT.steel);
      cylinder(ctx, 0.55, BY + 1.3, 1.1, 0.14, 0.14, INK.sunYellow);
    });
    const grinding = (t) => (t % 6) < 3.8;
    body(R, 1.75, BY + 0.7, LOOK.grinder, {
      pose: (t) => ({ dir: 'l', back: true, arms: grinding(t) ? [1.45 + Math.sin(t * 20) * 0.04, 1.3] : [0.3, -0.1], face: shield(grinding(t)) }),
      after(ctx, t) {
        if (!grinding(t) || !Q.detail) return;
        // Sparks off the vice, toward us.
        const [X, Y] = P(0.55, BY + 0.7, 1.5);
        particles(t, 12, 0.5, (k, r) => {
          const a = -Math.PI + 0.2 + r() * 1.3, v = 1.0 + r() * 1.0;
          const sx = X + Math.cos(a) * v * k, sy = Y - 0.2 + Math.sin(a) * v * k * 0.4 + k * k * 1.2;
          ctx.fillStyle = k < 0.5 ? C.butter : INK.sunYellow;
          ctx.beginPath(); ctx.arc(sx, sy, 0.045 * (1 - k * 0.6), 0, Math.PI * 2); ctx.fill();
        }, 7);
      },
    });

    // ---------- Oil drums by the far wall ----------
    for (const [x, y, c] of [[8.65, 1.75, C.red], [9.5, 1.95, INK.sunYellow], [8.9, 2.65, MAT.crewBlue]]) {
      R.thing(x, y + 0.4, (ctx) => {
        cylinder(ctx, x, y, 0, 0.38, 1.3, c);
        if (!Q.detail) return;
        for (const z of [0.4, 0.9]) { const [a, b] = P(x, y, z); ctx.beginPath(); ctx.ellipse(a, b, 0.54, 0.27, 0, 0, Math.PI); ctx.strokeStyle = shade(c, 0.4); ctx.lineWidth = 0.03; ctx.stroke(); }
        disc(ctx, x + 0.15, y - 0.1, 1.31, 0.06, shade(c, 0.4), { stroke: false });
      });
    }
    R.thing(8.9, 3.0, (ctx) => onY(ctx, 8.55, 3.04, 1.0, (g) => words(g, 'NOT SOUP', 0.35, 0, 0.1, C.white)));

    // ---------- The leak, and its bucket ----------
    R.thing(0.5, 12.9, (ctx) => bucket(ctx, 0.5, 12.6, 0, { color: C.grey, name: 'LEAK (SMALL)' }));
    R.thing(0.5, 12.95, (ctx, t) => {
      if (!Q.detail) return;
      const k = (t % 1.3) / 1.3;
      const [X, Y] = P(0.35, 12.4, 0.62 - k * 0.2);
      ctx.fillStyle = tint(INK.sea, 0.2);
      ctx.beginPath(); ctx.arc(X, Y, 0.05, 0, Math.PI * 2); ctx.fill();
      // A ring where it lands.
      if (k > 0.8) { const [a, b] = P(0.5, 12.6, 0.4); ctx.strokeStyle = alpha(C.white, 0.7); ctx.lineWidth = 0.02; ctx.beginPath(); ctx.ellipse(a, b, 0.15 * (k - 0.6) * 3, 0.07 * (k - 0.6) * 3, 0, 0, Math.PI * 2); ctx.stroke(); }
    }, { anim: true, depth: 0.5 + 12.9 + 0.01 });

    // ---------- The crew mess annex: toasties on engine No. 2 ----------
    R.thing(7.45, 13.55, (ctx) => {
      // A hot plate bolted to the engine's front, and a sign.
      box(ctx, 6.75, 13.1, 1.25, 1.35, 0.45, 0.08, MAT.steelDark, { flat: true, lw: 0.03 });
      for (let k = 0; k < 3; k++) box(ctx, 6.9 + k * 0.42, 13.18, 1.33, 0.32, 0.28, 0.08, C.butter, { top: INK.sunYellow, flat: true, lw: 0.02 });
      onY(ctx, 6.75, 13.56, 1.2, (g) => {
        g.beginPath(); g.rect(0, 0, 1.35, 0.46); paint(g, C.white, { lw: 0.02 });
        words(g, 'CREW MESS (ANNEX)', 0.675, 0.14, 0.1);
        words(g, "WE DON'T EAT UPSTAIRS", 0.675, 0.32, 0.075, C.red);
      });
    });
    R.thing(7.8, 14.9, (ctx) => cylinder(ctx, 7.8, 14.6, 0, 0.3, 0.6, C.grey));
    body(R, 7.8, 14.6, LOOK.cook, {
      z: 0.2,
      pose: (t) => ({ pose: 'sit', dir: 'l', back: true, z: 0.2, arms: [1.6 + Math.max(0, Math.sin(t * 2.2)) * 0.5, 0.5], hold: (g) => {
        g.beginPath(); g.moveTo(0.1, 0); g.lineTo(0.45, -0.2); g.strokeStyle = C.ink; g.lineWidth = 0.04; g.stroke();
        g.beginPath(); g.rect(0.4, -0.3, 0.18, 0.12); paint(g, MAT.chrome, { lw: 0.015 });
      } }),
      depth: 7.8 + 14.6,
    });
    R.air((ctx, t) => {
      if (!Q.detail) return;
      particles(t, 5, 2.4, (k, r) => {
        const [X, Y] = P(6.95 + r() * 1.0, 13.3, 1.45 + k * 1.3);
        ctx.fillStyle = alpha(C.white, 0.55 * (1 - k));
        ctx.beginPath(); ctx.arc(X + Math.sin(k * 6 + r() * 6) * 0.1, Y, 0.08 + k * 0.12, 0, Math.PI * 2); ctx.fill();
      }, 23);
    });

    // ---------- The crew's own sun deck: on top of engine No. 1 ----------
    // A towel on the warmest spot on the ship, and someone on it in shades.
    R.thing(6.0, ENGINES[0].y + ENG_D, (ctx, t) => {
      const e = ENGINES[0], z = HEAD_Z + HEAD_H + 0.16;
      // (A crew-issue towel: the pink ones are the Pool's.)
      rect(ctx, 3.6, e.y + 0.75, 2.6, 1.0, z, MAT.crewBlue, { lw: 0.025 });
      if (Q.detail) for (let k = 0; k < 3; k++) rect(ctx, 3.8 + k * 0.8, e.y + 0.75, 0.25, 1.0, z + 0.005, C.white, { stroke: false });
      lying(ctx, 6.0, e.y + 1.3, z + 0.02, LOOK.sunbather, t, { face: shades, arms: [3.0, 2.9] });
    }, { depth: ENG_X + ENG_W + ENGINES[0].y + ENG_D + 0.03 });

    // ---------- The ship's cat, and the rat on the pipes ----------
    const rat = (t) => {
      const s = ((t % 18) + 18) % 18;
      // runs the length of the wall pipe, stops to look, runs back
      const x = s < 6 ? 0.8 + (s / 6) * 8.6 : s < 9 ? 9.4 : s < 15 ? 9.4 - ((s - 9) / 6) * 8.6 : 0.8;
      const moving = (s < 6) || (s >= 9 && s < 15);
      return { x, y: 0.3, z: 5.52, dir: s < 7.5 ? 'r' : 'l', moving };
    };
    R.thing(0.4, 0.5, (ctx, t) => {
      const p = rat(t);
      const [X, Y] = P(p.x, p.y, p.z);
      const f = p.dir === 'l' ? -1 : 1, b = p.moving ? Math.abs(Math.sin(t * 20)) * 0.04 : 0;
      ctx.save(); ctx.translate(X, Y - b); ctx.scale(f * 1.5, 1.5);
      ctx.beginPath(); ctx.moveTo(-0.2, -0.06); ctx.quadraticCurveTo(-0.45, -0.2, -0.55, 0.0);
      ctx.strokeStyle = C.pink; ctx.lineWidth = 0.03; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, -0.1, 0.22, 0.1, 0, 0, Math.PI * 2); paint(ctx, C.brown, { lw: 0.025 });
      ctx.beginPath(); ctx.ellipse(0.22, -0.12, 0.09, 0.06, 0.2, 0, Math.PI * 2); paint(ctx, C.brown, { lw: 0.025 });
      ctx.beginPath(); ctx.arc(0.18, -0.2, 0.04, 0, Math.PI * 2); paint(ctx, C.pink, { lw: 0.015 });
      ctx.restore();
    }, { anim: true, depth: 1 });
    // The cat, asleep on the warm turbo, one eye on the rat.
    R.thing(10.35, ENGINES[0].y + ENG_D / 2 + 0.5, (ctx, t) => {
      const e = ENGINES[0];
      const [X, Y] = P(10.35, e.y + ENG_D / 2, 2.5);
      const p = rat(t);
      const look = p.x > 6 ? 1 : -1;
      ctx.save(); ctx.translate(X, Y);
      ctx.beginPath(); ctx.ellipse(0, -0.14, 0.3, 0.15, 0, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.025, dots: shade(C.mustard, 0.3), density: 0.2 });
      const hx = 0.24 * look;
      ctx.beginPath(); ctx.arc(hx, -0.28, 0.12, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.025 });
      ctx.beginPath(); ctx.moveTo(hx - 0.1, -0.35); ctx.lineTo(hx - 0.07, -0.47); ctx.lineTo(hx - 0.01, -0.38);
      ctx.moveTo(hx + 0.1, -0.35); ctx.lineTo(hx + 0.07, -0.47); ctx.lineTo(hx + 0.01, -0.38); paint(ctx, C.mustard, { lw: 0.02 });
      if (Q.detail) { ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(hx + 0.05 * look, -0.28, 0.022, 0, Math.PI * 2); ctx.fill(); }
      // the tail, flicking
      const w = Math.sin(t * 3) * 0.12;
      ctx.beginPath(); ctx.moveTo(-0.26 * look, -0.1); ctx.quadraticCurveTo(-0.5 * look, -0.1 + w, -0.45 * look, -0.35 + w);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.lineCap = 'round'; if (Q.lines) ctx.stroke();
      ctx.strokeStyle = C.mustard; ctx.lineWidth = 0.06; ctx.stroke();
      ctx.restore();
    }, { anim: true, depth: ENG_X + ENG_W + ENGINES[0].y + ENG_D + 0.04 });

    // A fish looking in at the porthole.
    R.decor((ctx, t) => {
      const s = ((t % 11) + 11) % 11;
      if (s > 5) return;
      const x = 8.9 - 0.7 + (s / 5) * 1.4;
      const [X, Y] = P(8.9, 0, 4.2);
      ctx.save();
      ctx.translate(X, Y);
      ctx.transform(1, 0.5, 0, 1, 0, 0);
      ctx.beginPath(); ctx.arc(0, 0, 0.4, 0, Math.PI * 2); ctx.clip();
      const u = x - 8.9, v = Math.sin(s * 2) * 0.06;
      ctx.beginPath(); ctx.ellipse(u, v, 0.22, 0.12, 0, 0, Math.PI * 2);
      ctx.moveTo(u - 0.18, v); ctx.lineTo(u - 0.36, v - 0.12); ctx.lineTo(u - 0.36, v + 0.12); ctx.closePath();
      paint(ctx, C.coral, { lw: 0.02 });
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(u + 0.12, v - 0.03, 0.025, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }, { anim: true });

    // A leaky joint over the panel, puffing.
    R.air((ctx, t) => {
      if (!Q.detail) return;
      particles(t, 6, 1.6, (k, r) => {
        const [X, Y] = P(3.4 + k * 0.4, 0.35 + k * 1.2, 5.1 - k * 0.3);
        ctx.fillStyle = alpha(C.white, 0.5 * (1 - k));
        ctx.beginPath(); ctx.arc(X + r() * 0.2, Y, 0.1 + k * 0.2, 0, Math.PI * 2); ctx.fill();
      }, 31);
    });

    // ---------- Finds ----------
    R.find({ id: 'hammock', label: 'A hammock between two pipes', at: [13, 13.5, 1.15], r: 1.4 });
    R.find({ id: 'wrench', label: 'A lost wrench', at: [4, 14.8, 0.05], r: 0.7 });
  },
};
