// Aquarium: a dark blue hall of glass. The walls are tanks full of fish, a
// shark does laps, the jellyfish pulse, the octopus is hiding from its keeper,
// and in the kelp forest a school of white fish has one very large member.
import {
  C, box, rect, disc, cylinder, face, poly, paint, person, folk, slab, floor, tiles,
  speech, shade, tint, alpha, dots, Q, label, P, paintText, onLeft, onRight, frame,
  hash, rng, pick, SKIN, goose,
} from '../../../engine/art.js';
import { route, orbit, particles, pulse, clamp, ease } from '../../../engine/actors.js';
import { ZK } from '../../../engine/iso.js';

const lerp = (a, b, k) => a + (b - a) * k;
const memo = (fn) => { let lt = NaN, lp = null; return (t) => (t === lt ? lp : (lt = t, lp = fn(t))); };
const TAU = Math.PI * 2;

// Wall tanks in plane coordinates. Right wall: u = x. Left wall: u = -y. v = height.
const TANKS = {
  A: { side: 'R', u0: 0.6, u1: 9.4, v0: 0.5, v1: 6.3, top: C.teal, bot: C.navy },
  B: { side: 'R', u0: 10.0, u1: 15.4, v0: 0.5, v1: 6.3, top: C.tealLight, bot: C.teal },
  C: { side: 'L', u0: -7.8, u1: -0.6, v0: 0.5, v1: 6.3, top: C.teal, bot: C.navy },
  D: { side: 'L', u0: -15.4, u1: -8.4, v0: 0.5, v1: 6.3, top: C.navy, bot: C.night },
};
const FISHC = [C.mustard, C.coral, C.pink, C.butter, C.sky, C.white, C.coralLight, C.lilac];

// Draw in a wall's plane: (u, v) with v pointing up.
function inPlane(ctx, side, fn) {
  ctx.save();
  if (side === 'R') ctx.transform(1, 0.5, 0, -ZK, 0, 0);
  else ctx.transform(1, -0.5, 0, -ZK, 0, 0);
  fn();
  ctx.restore();
}
const clipTank = (ctx, T) => { ctx.beginPath(); ctx.rect(T.u0, T.v0, T.u1 - T.u0, T.v1 - T.v0); ctx.clip(); };

function fish(ctx, u, v, s, col, dir, t, kind = 0) {
  ctx.save();
  ctx.translate(u, v);
  ctx.scale(dir * s, s);
  const wag = Math.sin(t * 9 + u * 3) * 0.12;
  ctx.beginPath();
  if (kind === 2) {
    // tall angelfish
    ctx.moveTo(0.45, 0); ctx.quadraticCurveTo(0.1, 0.7, -0.35, 0.05); ctx.quadraticCurveTo(0.1, -0.7, 0.45, 0);
  } else {
    ctx.ellipse(0, 0, 0.5, 0.26, 0, 0, TAU);
  }
  ctx.moveTo(-0.35, 0); ctx.lineTo(-0.78, 0.3 + wag); ctx.lineTo(-0.72, -0.28 + wag); ctx.closePath();
  ctx.fillStyle = col;
  ctx.fill();
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.08 / s * 0.5; ctx.stroke(); }
  if (kind === 1) {
    ctx.fillStyle = C.white;
    ctx.fillRect(0.05, -0.24, 0.1, 0.48);
    ctx.fillRect(-0.25, -0.2, 0.09, 0.4);
  }
  ctx.fillStyle = C.ink;
  ctx.beginPath(); ctx.arc(0.27, 0.06, 0.06, 0, TAU); ctx.fill();
  ctx.restore();
}

function shark(ctx, u, v, dir, t) {
  ctx.save();
  ctx.translate(u, v);
  ctx.scale(dir, 1);
  const wag = Math.sin(t * 2.5) * 0.18;
  ctx.beginPath();
  ctx.moveTo(1.6, 0.05);
  ctx.quadraticCurveTo(1.2, 0.55, 0, 0.5);
  ctx.lineTo(-0.3, 1.25); ctx.lineTo(-0.6, 0.45); // dorsal fin
  ctx.quadraticCurveTo(-1.3, 0.3, -1.8, 0.1);
  ctx.lineTo(-2.4, 0.8 + wag); ctx.lineTo(-2.2, 0.0 + wag * 0.5); ctx.lineTo(-2.45, -0.6 + wag); // tail
  ctx.lineTo(-1.8, -0.1);
  ctx.quadraticCurveTo(-0.8, -0.45, 0.3, -0.45);
  ctx.quadraticCurveTo(1.3, -0.4, 1.6, 0.05);
  ctx.closePath();
  paint(ctx, C.grey, { dots: C.navy, density: 0.2, lw: 0.06 });
  ctx.beginPath();
  ctx.moveTo(1.4, -0.12); ctx.quadraticCurveTo(0.4, -0.5, -1.0, -0.25); ctx.quadraticCurveTo(0.3, -0.2, 1.4, -0.12);
  ctx.fillStyle = C.greyLight; ctx.fill();
  ctx.beginPath(); ctx.moveTo(0.2, -0.3); ctx.lineTo(-0.3, -0.85); ctx.lineTo(-0.35, -0.3);
  paint(ctx, shade(C.grey, 0.15), { lw: 0.05 });
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.04;
  ctx.lineWidth = 0.035;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0.75 - i * 0.14, 0.02, 0.18, -0.9, 0.9); ctx.stroke(); }
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(1.05, 0.12, 0.07, 0, TAU); ctx.fill();
  ctx.restore();
}

function seaweed(ctx, u, v, h, t, col = C.green, n = 6) {
  ctx.beginPath();
  ctx.moveTo(u, v);
  for (let i = 1; i <= n; i++) {
    const k = i / n;
    ctx.lineTo(u + Math.sin(t * 1.2 + u * 2 + k * 3) * 0.25 * k, v + h * k);
  }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.22; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = 0.14; ctx.stroke();
}

// Static tank backgrounds: water, sand, rocks, coral.
function tankBack(ctx, T, seed) {
  const r = rng(seed);
  inPlane(ctx, T.side, () => {
    const g = ctx.createLinearGradient(0, T.v1, 0, T.v0);
    g.addColorStop(0, T.top);
    g.addColorStop(1, T.bot);
    ctx.beginPath(); ctx.rect(T.u0, T.v0, T.u1 - T.u0, T.v1 - T.v0);
    ctx.fillStyle = g; ctx.fill();
    if (Q.detail) { ctx.fillStyle = dots(alpha(C.ink, 0.5), 0.15); ctx.fill(); }
    ctx.save();
    clipTank(ctx, T);
    // light rays
    ctx.fillStyle = alpha(C.white, 0.08);
    for (let u = T.u0 + 0.8; u < T.u1; u += 2.1) {
      ctx.beginPath(); ctx.moveTo(u, T.v1); ctx.lineTo(u + 0.7, T.v1); ctx.lineTo(u + 1.6, T.v0); ctx.lineTo(u + 0.3, T.v0); ctx.fill();
    }
    // sand
    ctx.beginPath();
    ctx.moveTo(T.u0, T.v0);
    for (let u = T.u0; u <= T.u1 + 0.5; u += 0.5) ctx.lineTo(u, T.v0 + 0.55 + Math.sin(u * 1.3 + seed) * 0.15);
    ctx.lineTo(T.u1, T.v0);
    ctx.closePath();
    paint(ctx, T === TANKS.D ? shade(C.butter, 0.45) : C.butter, { dots: C.wood, density: 0.25, lw: 0.04 });
    // rocks
    for (let i = 0; i < 4; i++) {
      const u = lerp(T.u0 + 0.6, T.u1 - 0.6, r());
      ctx.beginPath();
      ctx.ellipse(u, T.v0 + 0.55, 0.4 + r() * 0.5, 0.3 + r() * 0.35, 0, 0, TAU);
      paint(ctx, pick(r, [C.grey, shade(C.grey, 0.2), C.purple]), { lw: 0.05 });
    }
    // coral fans
    for (let i = 0; i < 3; i++) {
      const u = lerp(T.u0 + 0.8, T.u1 - 0.8, r());
      const col = pick(r, [C.coral, C.pink, C.mustard, C.lilac]);
      ctx.strokeStyle = col; ctx.lineWidth = 0.12; ctx.lineCap = 'round';
      for (let j = -2; j <= 2; j++) {
        ctx.beginPath(); ctx.moveTo(u, T.v0 + 0.6);
        ctx.quadraticCurveTo(u + j * 0.15, T.v0 + 1.2, u + j * 0.35, T.v0 + 1.6 - Math.abs(j) * 0.2);
        ctx.stroke();
      }
    }
    ctx.restore();
  });
}

function tankFrame(ctx, T) {
  const f = T.side === 'R' ? (a, b, w, h, c, o) => onRight(ctx, a, b, w, h, c, o) : (a, b, w, h, c, o) => onLeft(ctx, -a - w, b, w, h, c, o);
  const w = T.u1 - T.u0, h = T.v1 - T.v0, k = 0.22;
  f(T.u0 - k, T.v0 - k, w + 2 * k, k, C.night, { lw: 0.04 });
  f(T.u0 - k, T.v1, w + 2 * k, k, C.night, { lw: 0.04 });
  f(T.u0 - k, T.v0, k, h, C.night, { lw: 0.04 });
  f(T.u1, T.v0, k, h, C.night, { lw: 0.04 });
}

function glassShine(ctx, T) {
  inPlane(ctx, T.side, () => {
    ctx.fillStyle = alpha(C.white, 0.13);
    for (const du of [0.7, 1.15]) {
      const u = T.u0 + (T.u1 - T.u0) * 0.2 + du;
      ctx.beginPath(); ctx.moveTo(u, T.v1); ctx.lineTo(u + 0.3, T.v1); ctx.lineTo(u - 1.2, T.v0); ctx.lineTo(u - 1.5, T.v0); ctx.fill();
    }
  });
}

function bubbles(ctx, t, u0, u1, v0, v1, n, seed) {
  if (!Q.detail) return;
  ctx.strokeStyle = alpha(C.white, 0.8);
  ctx.lineWidth = 0.04;
  particles(t, n, 4, (k, r) => {
    const u = lerp(u0, u1, r()) + Math.sin(k * 12 + r() * 6) * 0.08;
    const v = lerp(v0, v1, k);
    ctx.beginPath(); ctx.arc(u, v, 0.05 + r() * 0.08, 0, TAU); ctx.stroke();
  }, seed);
}

// Jellyfish billboard at screen (X, Y), pulse 0..1
function jelly(ctx, X, Y, s, col, t, ph) {
  const p = (Math.sin(t * 2.4 + ph) + 1) / 2;
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(s, s);
  ctx.strokeStyle = alpha(col, 0.9);
  ctx.lineWidth = 0.05;
  for (let i = 0; i < 5; i++) {
    const x0 = -0.3 + i * 0.15;
    ctx.beginPath(); ctx.moveTo(x0, 0);
    for (let k = 1; k <= 5; k++) ctx.lineTo(x0 + Math.sin(t * 2 + i + k + ph) * 0.08, k * (0.2 + p * 0.05));
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.42 - p * 0.1, 0.36 + p * 0.1, 0, Math.PI, 0);
  ctx.quadraticCurveTo(0, 0.12, -0.42 + p * 0.1, 0);
  ctx.fillStyle = alpha(col, 0.8);
  ctx.fill();
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.04; ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(-0.1, -0.18, 0.1, 0.06, -0.3, 0, TAU);
  ctx.fillStyle = alpha(C.white, 0.6); ctx.fill();
  ctx.restore();
}

// ---------- Octopus ----------
function octopus(ctx, X, Y, t, o = {}) {
  const s = o.scale || 0.8;
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale((o.dir === 'l' ? -1 : 1) * s, s);
  // arms
  for (let i = 0; i < 6; i++) {
    const a = -0.6 + i * 0.24;
    const len = o.reach && i === 5 ? 1.3 : 0.75;
    ctx.beginPath();
    ctx.moveTo(Math.sin(a) * 0.2, -0.15);
    const w = Math.sin(t * 5 + i * 1.3) * 0.18 * (o.crawl ? 1.5 : 1);
    ctx.quadraticCurveTo(Math.sin(a) * 0.7 + w, 0.05, Math.sin(a) * len + w, o.drape ? 0.55 : 0.02);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.2; ctx.lineCap = 'round'; ctx.stroke();
    ctx.strokeStyle = C.coral; ctx.lineWidth = 0.13; ctx.stroke();
  }
  // head
  ctx.beginPath();
  ctx.ellipse(0.05, -0.55, 0.36, 0.48, 0.2, 0, TAU);
  paint(ctx, C.coral, { dots: C.red, density: 0.25, lw: 0.06 });
  ctx.fillStyle = C.white;
  ctx.beginPath(); ctx.arc(0.15, -0.45, 0.1, 0, TAU); ctx.arc(0.38, -0.42, 0.09, 0, TAU); ctx.fill();
  ctx.fillStyle = C.ink;
  const look = o.shifty ? Math.sin(t * 3) * 0.04 : 0.03;
  ctx.beginPath(); ctx.arc(0.17 + look, -0.45, 0.045, 0, TAU); ctx.arc(0.4 + look, -0.42, 0.045, 0, TAU); ctx.fill();
  ctx.restore();
}

export default {
  id: 'aquarium',
  name: 'Aquarium',
  blurb: 'The shark is on lap nine hundred. The octopus has escaped four times today, and now the keeper has lost it again.',
  describe: 'A dark blue hall walled with glass tanks: the deep, the kelp forest, the shark reef and the coral garden. A tall jellyfish tank glows in the middle, a touch pool sits up front, and kids press their noses to the glass while a keeper counts fish.',

  build(R) {
    // ---------- Floor and walls ----------
    R.floor((ctx) => {
      slab(ctx, C.navy);
      floor(ctx, shade(C.navy, 0.25), { dots: C.night, density: 0.25, stroke: false });
      tiles(ctx, 2, alpha(C.sky, 0.12), 0.03);
    });
    R.walls({ h: 7, left: C.night, right: C.night, cap: C.navy, dotsL: C.navy, dotsR: C.navy, densL: 0.3, densR: 0.3 });

    // Tanks: backgrounds, frames and signs
    R.decor((ctx) => {
      tankBack(ctx, TANKS.A, 1);
      tankBack(ctx, TANKS.B, 2);
      tankBack(ctx, TANKS.C, 3);
      tankBack(ctx, TANKS.D, 4);
      // the lost snorkel, on the sand in the diver's tank
      inPlane(ctx, 'R', () => {
        ctx.beginPath();
        ctx.moveTo(12.3, 1.05); ctx.lineTo(13.2, 1.05); ctx.quadraticCurveTo(13.45, 1.05, 13.45, 1.3); ctx.lineTo(13.45, 1.5);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.17; ctx.lineCap = 'round'; ctx.stroke();
        ctx.strokeStyle = C.coral; ctx.lineWidth = 0.1; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(12.2, 1.12, 0.22, 0.14, 0, 0, TAU); ctx.ellipse(12.66, 1.12, 0.22, 0.14, 0, 0, TAU);
        paint(ctx, C.sky, { lw: 0.05 });
      });
      for (const T of Object.values(TANKS)) tankFrame(ctx, T);
      // signs
      paintText(ctx, 'right', 5.0, 6.62, 'SHARK REEF', 0.34, C.butter);
      paintText(ctx, 'right', 12.7, 6.62, 'CORAL GARDEN', 0.3, C.butter);
      paintText(ctx, 'left', 4.2, 6.62, 'KELP FOREST', 0.32, C.butter);
      paintText(ctx, 'left', 11.9, 6.62, 'THE DEEP', 0.32, C.butter);
      // pillar plaques
      onRight(ctx, 9.45, 2.6, 0.5, 1.4, C.butter, { lw: 0.03 });
      onLeft(ctx, 7.85, 2.6, 0.5, 1.4, C.butter, { lw: 0.03 });
    });

    // No windows in here: the plaque on the pillar gets a clock on the
    // day's time, and when feeding time is.
    const day = R.opts.day;
    R.decor((ctx, t) => {
      const h = day.hour(t);
      const [X, Y] = P(9.7, 0.01, 3.5);
      ctx.save();
      ctx.translate(X, Y);
      ctx.transform(1, 0.5, 0, 1, 0, 0);
      ctx.beginPath(); ctx.arc(0, 0, 0.21, 0, TAU); paint(ctx, C.white, { lw: 0.03 });
      const hA = ((h % 12) / 12) * TAU, mA = (h % 1) * TAU;
      ctx.strokeStyle = C.ink; ctx.lineCap = 'round';
      ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(hA) * 0.11, -Math.cos(hA) * 0.11); ctx.stroke();
      ctx.lineWidth = 0.03; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(mA) * 0.17, -Math.cos(mA) * 0.17); ctx.stroke();
      ctx.restore();
      paintText(ctx, 'right', 9.7, 3.05, 'FEED', 0.12, C.navy);
      paintText(ctx, 'right', 9.7, 2.85, '10:30', 0.1, C.coral, 'Rethink Sans');
    }, { anim: true });

    // The deep tank's treasure chest answers a tap (the octopus isn't in it).
    const chest2 = R.poke({ id: 'deepchest', at: [0.1, 11.1, 1.2], r: 0.8, sound: 'clunk', say: ['Just treasure.', 'Fake gold. Do not tell.', 'No octopus. Only doubloons.'] });

    // Fish, sharks and weeds: animated wall layers
    const shark1 = (t) => { const q = pulse(t, 22); return { u: lerp(-3, 12.5, q), v: 3.4 + Math.sin(q * TAU) * 0.5 }; };
    R.decor((ctx, t) => {
      // Tank A: the shark reef
      const T = TANKS.A;
      inPlane(ctx, 'R', () => {
        ctx.save();
        clipTank(ctx, T);
        for (let i = 0; i < 5; i++) seaweed(ctx, T.u0 + 0.7 + i * 1.9, T.v0 + 0.5, 1.6 + (i % 3) * 0.8, t, i % 2 ? C.green : C.leaf);
        const sh = shark1(t);
        // a school that parts for the shark
        for (let i = 0; i < 14; i++) {
          const base = ((i * 0.63 + t * 0.5) % 9.4) + 0.3;
          const vv = 2.0 + (i % 5) * 0.55 + Math.sin(t * 1.5 + i) * 0.12;
          const d = base - sh.u;
          const push = Math.exp(-(d * d) / 3) * (vv > sh.v ? 1 : -1) * 1.3;
          fish(ctx, base, vv + push, 0.32, FISHC[i % 3 === 0 ? 3 : 4], 1, t);
        }
        for (let i = 0; i < 4; i++) {
          const q = pulse(t + i * 3.1, 14 + i * 2);
          fish(ctx, lerp(9.8, 0.2, q), 1.5 + i * 1.1, 0.5, FISHC[(i + 1) % FISHC.length], -1, t, i % 2 ? 2 : 0);
        }
        shark(ctx, sh.u, sh.v, 1, t);
        bubbles(ctx, t, 1, 9, 0.8, 6.3, 7, 11);
        ctx.restore();
      });
      glassShine(ctx, T);
    }, { anim: true });
    R.decor((ctx, t) => {
      // Tank B: coral garden
      const T = TANKS.B;
      inPlane(ctx, 'R', () => {
        ctx.save();
        clipTank(ctx, T);
        for (let i = 0; i < 4; i++) seaweed(ctx, T.u0 + 0.5 + i * 1.5, T.v0 + 0.5, 1.2 + (i % 2) * 0.9, t, C.leaf);
        for (let i = 0; i < 8; i++) {
          const q = pulse(t + i * 1.7, 9 + (i % 3) * 3);
          const dir = i % 2 ? 1 : -1;
          const u = dir > 0 ? lerp(9.5, 16, q) : lerp(16, 9.5, q);
          fish(ctx, u, 1.6 + (i % 4) * 1.05 + Math.sin(t + i) * 0.15, 0.36, i % 3 === 0 ? C.coral : FISHC[(i + 2) % FISHC.length], dir, t, i % 3 === 0 ? 1 : 0);
        }
        bubbles(ctx, t, 10.5, 15, 0.8, 6.3, 5, 12);
        ctx.restore();
      });
    }, { anim: true });
    // the goose's swim path, shared with its school of fish in tank C
    const gooseAt = memo((t) => {
      const y = 4.2 + Math.sin(t / 5) * 2.6;
      const vy = Math.cos(t / 5);
      return { x: 0.3, y, z: 3.3 + Math.sin(t / 2.3) * 0.7, dir: vy < 0 ? 'r' : 'l', pose: 'swim', vy };
    });
    R.decor((ctx, t) => {
      // Tank C: kelp forest with the goose's school
      const T = TANKS.C;
      inPlane(ctx, 'L', () => {
        ctx.save();
        clipTank(ctx, T);
        for (let i = 0; i < 9; i++) seaweed(ctx, T.u0 + 0.4 + i * 0.85, T.v0 + 0.5, 3.4 + (i % 3) * 1.1, t, i % 2 ? C.green : shade(C.leaf, 0.1), 9);
        const g = gooseAt(t);
        const dir = g.vy < 0 ? 1 : -1;
        // a school of white fish, round and ahead of and behind the goose
        for (let i = 0; i < 14; i++) {
          const back = (i % 2 ? 1 : -1) * (0.55 + (i % 4) * 0.42) + Math.floor(i / 4) * 0.3;
          fish(ctx, -g.y - dir * back, g.z + 0.3 + ((i * 37) % 5 - 2) * 0.34, 0.42 + (i % 3) * 0.07, i % 3 ? C.white : C.greyLight, dir, t);
        }
        for (let i = 0; i < 3; i++) {
          const q = pulse(t + i * 4, 12);
          fish(ctx, lerp(-8.2, -0.2, q), 1.6 + i * 1.5, 0.45, [C.coral, C.lilac, C.sky][i], 1, t, 2);
        }
        bubbles(ctx, t, -7.5, -1, 0.8, 6.3, 6, 13);
        ctx.restore();
      });
      // the goose, swimming with them, inside the glass
      ctx.save();
      poly(ctx, [[0, -T.u1, T.v0], [0, -T.u0, T.v0], [0, -T.u0, T.v1], [0, -T.u1, T.v1]]);
      ctx.clip();
      const g = gooseAt(t);
      goose(ctx, 0.05, g.y, g.z, t, { dir: g.dir, pose: 'swim' });
      ctx.restore();
      // and a few fronds of kelp in front of them all
      inPlane(ctx, 'L', () => {
        ctx.save();
        clipTank(ctx, T);
        for (let i = 0; i < 6; i++) seaweed(ctx, T.u0 + 0.5 + i * 1.3, T.v0 + 0.4, 4.0 + (i % 3) * 0.7, t + 2, shade(C.green, 0.15), 9);
        ctx.restore();
      });
      glassShine(ctx, T);
    }, { anim: true });
    R.decor((ctx, t) => {
      // Tank D: the deep, with an anglerfish
      const T = TANKS.D;
      inPlane(ctx, 'L', () => {
        ctx.save();
        clipTank(ctx, T);
        const q = pulse(t, 18);
        const u = lerp(-15.8, -8, q), v = 3.0 + Math.sin(t * 0.7) * 0.4;
        const glow = (Math.sin(t * 4) + 1) / 2;
        ctx.fillStyle = alpha(C.butter, 0.15 + glow * 0.25);
        ctx.beginPath(); ctx.arc(u + 1.1, v + 0.9, 0.7, 0, TAU); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(u + 0.4, v + 0.5); ctx.quadraticCurveTo(u + 0.9, v + 1.4, u + 1.1, v + 0.9);
        ctx.strokeStyle = C.greyLight; ctx.lineWidth = 0.05; ctx.stroke();
        ctx.beginPath(); ctx.arc(u + 1.1, v + 0.9, 0.12, 0, TAU); ctx.fillStyle = C.butter; ctx.fill();
        ctx.beginPath();
        ctx.ellipse(u, v, 0.8, 0.6, 0, 0, TAU);
        ctx.moveTo(u - 0.7, v); ctx.lineTo(u - 1.2, v + 0.4); ctx.lineTo(u - 1.2, v - 0.4); ctx.closePath();
        paint(ctx, C.purple, { dots: C.night, density: 0.3, lw: 0.05 });
        ctx.fillStyle = C.white;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) { ctx.moveTo(u + 0.25 + i * 0.1, v - 0.05); ctx.lineTo(u + 0.3 + i * 0.1, v - 0.2); ctx.lineTo(u + 0.35 + i * 0.1, v - 0.05); }
        ctx.fill();
        ctx.beginPath(); ctx.arc(u + 0.35, v + 0.25, 0.1, 0, TAU); ctx.fill();
        ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(u + 0.37, v + 0.25, 0.05, 0, TAU); ctx.fill();
        // small glowing fish
        for (let i = 0; i < 5; i++) {
          const qq = pulse(t + i * 2.3, 10);
          fish(ctx, lerp(-8.4, -15.6, qq), 1.8 + i * 0.8, 0.22, alpha(C.mint, 0.9), -1, t);
        }
        // the treasure chest, which burps bubbles (and answers a tap)
        const ck = chest2.k();
        ctx.beginPath(); ctx.rect(-11.6, 0.9, 1.0, 0.55); paint(ctx, C.wood, { dots: C.brown, density: 0.3, lw: 0.04 });
        ctx.save();
        ctx.translate(-11.6, 1.45);
        ctx.rotate(ck * 0.9);
        ctx.beginPath(); ctx.rect(0, 0, 1.0, 0.2); paint(ctx, C.mustard, { lw: 0.04 });
        ctx.restore();
        if (ck > 0.3) for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-11.45 + i * 0.22, 1.5, 0.08, 0, TAU); paint(ctx, C.butter, { lw: 0.03 }); }
        const cq = pulse(t, 7);
        if (cq < 0.4) bubbles(ctx, t, -11.3, -11.0, 1.6, 4.5, 4, 14);
        ctx.restore();
      });
    }, { anim: true });

    // ---------- Floor glow and caustics ----------
    R.rug((ctx) => {
      face(ctx, [[0, 0, 0], [16, 0, 0], [16, 1.6, 0], [1.6, 1.6, 0], [1.6, 16, 0], [0, 16, 0]], alpha(C.teal, 0.28), { stroke: false });
    });
    R.rug((ctx, t) => {
      if (!Q.detail) return;
      ctx.strokeStyle = alpha(C.tealLight, 0.22);
      ctx.lineWidth = 0.06;
      for (let i = 0; i < 12; i++) {
        const cx = 2 + ((i * 3.7 + t * 0.25) % 13), cy = 2 + ((i * 5.3) % 13);
        ctx.beginPath();
        for (let k = 0; k <= 8; k++) {
          const a = (k / 8) * TAU;
          const rr = 0.5 + Math.sin(a * 3 + t * 1.5 + i) * 0.15;
          const [X, Y] = P(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 0.01);
          k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
        }
        ctx.stroke();
      }
    }, { anim: true });

    // ---------- The goose, swimming with the school ----------
    // (drawn in the kelp tank with its school, above; this is where to tap)
    R.goose((t) => { const g = gooseAt(t); return { x: 0.05, y: g.y, z: g.z - 0.25, dir: g.dir, hidden: true }; },
      { kind: 'hard', hint: 'In the kelp forest, one of the school of white fish is much too big.' });
    R.poke({ id: 'shark', at: (t) => { const sh = shark1(t); return [sh.u, 0.15, sh.v]; }, r: 1.2, sound: 'clunk', say: ['Lap nine hundred and one.', "Don't tap the glass.", 'I only eat fish. Mostly.'] });

    // ---------- Diver cleaning the glass in tank B ----------
    const diverAt = (t) => {
      const q = pulse(t, 18);
      const k = q < 0.5 ? q * 2 : 2 - q * 2;
      return { x: lerp(10.9, 14.5, ease(k)), z: 2.0 + Math.sin(t * 0.9) * 0.3, dir: q < 0.5 ? 'r' : 'l' };
    };
    R.mover((t) => ({ ...diverAt(t), y: 0.15 }), (ctx, t, p) => {
      // algae on the glass, except where it has just been cleaned
      const xs = [0, 0.8, 1.6, 2.4, 3.2].map((d) => diverAt(t - d).x);
      const a = Math.min(...xs) - 0.4, b = Math.max(...xs) + 0.4;
      const T = TANKS.B;
      ctx.save();
      poly(ctx, [[T.u0, 0, T.v0], [T.u1, 0, T.v0], [T.u1, 0, T.v1], [T.u0, 0, T.v1]]);
      ctx.clip();
      if (Q.detail) {
        ctx.save();
        poly(ctx, [[T.u0, 0, T.v0], [T.u1, 0, T.v0], [T.u1, 0, T.v1], [T.u0, 0, T.v1]]);
        const band = [[a, 0, p.z + 0.2], [b, 0, p.z + 0.2], [b, 0, p.z + 1.9], [a, 0, p.z + 1.9]];
        band.forEach((pt, i) => { const [X, Y] = P(...pt); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
        ctx.closePath();
        ctx.clip('evenodd');
        for (const [bx, bz, br] of ALGAE) {
          const [X, Y] = P(bx, 0, bz);
          ctx.beginPath(); ctx.ellipse(X, Y, br, br * 0.8, 0.46, 0, TAU);
          ctx.fillStyle = ALGAE_C; ctx.fill();
        }
        ctx.restore();
        // squeaky-clean streaks
        ctx.strokeStyle = alpha(C.white, 0.35); ctx.lineWidth = 0.05;
        for (let i = 0; i < 3; i++) {
          const [x0, y0] = P(a + 0.3 + i * 0.4, 0, p.z + 1.6 - i * 0.2), [x1, y1] = P(a + 1.0 + i * 0.4, 0, p.z + 1.75 - i * 0.2);
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        }
      }
      // air tank, then diver
      const [X, Y] = P(p.x, p.y, p.z);
      ctx.beginPath(); ctx.roundRect(X - (p.dir === 'l' ? -0.1 : 0.45), Y - 1.55, 0.3, 0.75, 0.12);
      paint(ctx, C.mustard, { lw: 0.04 });
      const scrub = Math.sin(t * 7);
      person(ctx, p.x, p.y, p.z, { skin: SKINS[1], hair: C.ink, top: C.night, bottom: C.night, shoes: C.mustard, style: 'short', hat: 'helmet', pose: 'stand', dir: p.dir, arms: [2.2 + scrub * 0.35, -0.6] }, t);
      // mask
      const f = p.dir === 'l' ? -1 : 1;
      ctx.beginPath(); ctx.roundRect(X + f * 0.02 - (f < 0 ? 0.36 : 0), Y - 1.99, 0.34, 0.16, 0.05);
      paint(ctx, alpha(C.sky, 0.8), { lw: 0.04 });
      // sponge
      const hx = X + f * (0.22 + Math.sin(2.2 + scrub * 0.35) * 0.72), hy = Y - 1.53 - Math.cos(2.2 + scrub * 0.35) * 0.72 * -1;
      ctx.beginPath(); ctx.rect(hx - 0.12, hy - 0.1, 0.24, 0.18); paint(ctx, C.butter, { lw: 0.03 });
      // bubbles from the diver
      if (Q.detail) {
        ctx.strokeStyle = alpha(C.white, 0.9); ctx.lineWidth = 0.035;
        particles(t, 5, 2.4, (k, r) => {
          ctx.beginPath(); ctx.arc(X + f * 0.2 + Math.sin(k * 10 + r() * 5) * 0.1, Y - 2.2 - k * 4, 0.05 + k * 0.08, 0, TAU); ctx.stroke();
        }, 21);
      }
      ctx.restore();
    }, { bias: -0.1 });
    R.find({ id: 'snorkel', label: 'A lost snorkel', at: [12.8, 0.05, 1.15], r: 0.8 });
    R.poke({ id: 'diver', at: (t) => { const d = diverAt(t); return [d.x, 0.15, d.z + 1.3]; }, r: 0.9, sound: 'tick', say: ['Glub.', 'Glub glub.', 'Seen my snorkel?'] });

    // ---------- Central jellyfish tank ----------
    const JX = 8.2, JY = 8.2, JR = 1.7, JZ0 = 0.6, JH = 5.0;
    const JELLY = [[0.5, -0.3, 1.8, C.pink, 0], [-0.6, 0.2, 3.1, C.lilac, 1.7], [0.2, 0.7, 4.2, C.butter, 3.1], [-0.3, -0.8, 3.9, C.coralLight, 4.4], [0.8, 0.5, 2.6, C.mint, 5.2]];
    // two kids pressing their faces on the far side of the glass
    const pressKids = [[6.35, 7.25, 301], [7.3, 6.3, 302]];
    pressKids.forEach(([x, y, seed], i) => {
      R.thing(x, y, (ctx, t) => person(ctx, x, y, 0, folk(seed, { scale: 0.7, pose: 'stand', arms: [2.5 + Math.sin(t * 3 + i) * 0.1, -2.5], dir: i ? 'l' : 'r' }), t), { anim: true });
    });
    // (The room's first lesson: tap the jellyfish tank and the jellies dance.)
    const jt = R.poke({ id: 'jellies', at: [JX + 0.8, JY + 0.8, 2.4], r: 1.5, teach: true, hold: 2.5, say: ['Bloop.', 'The jellies say hi.', 'It says no flash. Not no tap.'] });
    // A wooden decoy duck bobbing on the jelly tank's surface (a decoy).
    R.decoy({ id: 'duck', at: [JX, JY, JZ0 + JH + 0.35], r: 0.8, say: ['A wooden duck. Literally a decoy.', 'Still wood.', 'It floats. That is all it does.'] });
    R.thing(JX, JY, (ctx, t) => {
      const go = jt.k();
      cylinder(ctx, JX, JY, 0, JR + 0.25, JZ0, C.navy, { top: C.night });
      label(ctx, JX + 1.3, JY + 1.3, 0.28, 'NO FLASH', 0.22, C.butter);
      const [X, Yb] = P(JX, JY, JZ0);
      const Yt = Yb - JH * ZK;
      const rx = JR * Math.SQRT2, ry = rx / 2;
      // water column
      ctx.beginPath();
      ctx.moveTo(X - rx, Yt); ctx.lineTo(X - rx, Yb);
      ctx.ellipse(X, Yb, rx, ry, 0, Math.PI, 0, true);
      ctx.lineTo(X + rx, Yt);
      ctx.ellipse(X, Yt, rx, ry, 0, 0, Math.PI, true);
      ctx.fillStyle = alpha(C.teal, 0.55);
      ctx.fill();
      if (Q.detail) { ctx.fillStyle = dots(alpha(C.navy, 0.6), 0.12); ctx.fill(); }
      // sand floor
      ctx.beginPath(); ctx.ellipse(X, Yb, rx * 0.97, ry * 0.97, 0, 0, TAU);
      ctx.fillStyle = alpha(C.butter, 0.3); ctx.fill();
      // squished faces on the far glass
      pressKids.forEach(([x, y], i) => {
        const [fx, fy] = P(x + 0.35, y + 0.35, 1.45);
        const cx = fx + (i ? -0.1 : 0.1);
        ctx.beginPath(); ctx.ellipse(cx, fy + 0.05, 0.34, 0.27, 0, 0, TAU);
        paint(ctx, alpha(C.blush, 0.9), { lw: 0.03 });
        ctx.fillStyle = C.ink;
        ctx.beginPath(); ctx.arc(cx - 0.13, fy - 0.03, 0.04, 0, TAU); ctx.arc(cx + 0.13, fy - 0.03, 0.04, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx, fy + 0.1, 0.1, 0.07, 0, 0, TAU); ctx.fillStyle = C.pink; ctx.fill();
        for (const hx of [-0.5, 0.5]) { ctx.beginPath(); ctx.ellipse(cx + hx, fy - 0.4, 0.12, 0.14, 0, 0, TAU); paint(ctx, alpha(C.blush, 0.85), { lw: 0.025 }); }
      });
      // jellies
      JELLY.forEach(([dx, dy, z, col, ph]) => {
        const zz = z + Math.sin(t * 0.5 + ph) * 0.5 + go * Math.sin(t * 5 + ph * 2) * 0.6;
        const [jx, jy] = P(JX + dx + go * Math.cos(t * 3 + ph) * 0.3, JY + dy, JZ0 + zz);
        jelly(ctx, jx, jy, 0.9, col, t * (1 + go * 2), ph);
      });
      // bubbles
      if (Q.detail) {
        ctx.strokeStyle = alpha(C.white, 0.85); ctx.lineWidth = 0.035;
        particles(t, 8, 3.5, (k, r) => {
          const a = r() * TAU, d = r() * JR * 0.8;
          const [bx, by] = P(JX + Math.cos(a) * d, JY + Math.sin(a) * d, JZ0 + k * JH);
          ctx.beginPath(); ctx.arc(bx + Math.sin(k * 9) * 0.05, by, 0.05 + r() * 0.06, 0, TAU); ctx.stroke();
        }, 31);
      }
      // glass
      ctx.beginPath();
      ctx.moveTo(X - rx, Yt); ctx.lineTo(X - rx, Yb);
      ctx.ellipse(X, Yb, rx, ry, 0, Math.PI, 0, true);
      ctx.lineTo(X + rx, Yt);
      if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.06; ctx.stroke(); }
      ctx.fillStyle = alpha(C.white, 0.15);
      ctx.fillRect(X - rx * 0.62, Yt, 0.22, Yb - Yt);
      ctx.fillRect(X - rx * 0.45, Yt, 0.08, Yb - Yt);
      ctx.beginPath(); ctx.ellipse(X, Yt, rx, ry, 0, 0, TAU);
      ctx.fillStyle = alpha(C.tealLight, 0.35); ctx.fill();
      if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.06; ctx.stroke(); }
      // lid ring
      ctx.beginPath(); ctx.ellipse(X, Yt, rx + 0.1, ry + 0.05, 0, 0, TAU);
      ctx.strokeStyle = C.navy; ctx.lineWidth = 0.15; ctx.stroke();
      // the decoy duck, bobbing on top
      const [dX, dY] = P(JX - 0.2, JY + 0.2, JZ0 + JH + 0.02 + Math.sin(t * 1.4) * 0.04);
      decoyDuck(ctx, dX, dY, Math.sin(t * 1.1) * 0.06);
    }, { anim: true });

    // flash photographer, ignoring the sign
    R.thing(11.0, 10.2, (ctx, t) => {
      const q = pulse(t, 5);
      person(ctx, 11.0, 10.2, 0, folk(303, {
        pose: 'point', dir: 'l', back: true, top: C.sky, hat: 'cap',
        hold: (g) => { g.beginPath(); g.rect(0.25, -0.2, 0.4, 0.28); paint(g, C.ink, { lw: 0.02 }); },
      }), t);
      if (q < 0.06) {
        const [X, Y] = P(10.6, 9.8, 1.9);
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU;
          ctx.lineTo(X + Math.cos(a) * (i % 2 ? 0.25 : 0.7), Y + Math.sin(a) * (i % 2 ? 0.25 : 0.7));
        }
        ctx.closePath();
        ctx.fillStyle = alpha(C.white, 0.95); ctx.fill();
      }
      if (Q.detail && q > 0.05 && q < 0.3) speech(ctx, 9.3, 8.9, 6.2, '!!', { size: 0.4 });
    }, { anim: true });

    // ---------- Kids at the wall tanks ----------
    const glassKids = [[0.95, 2.6, 304], [0.95, 5.4, 305], [0.95, 9.4, 306]];
    glassKids.forEach(([x, y, seed], i) => {
      R.thing(x, y, (ctx, t) => {
        person(ctx, x, y, 0, folk(seed, { scale: 0.68 + (i % 2) * 0.05, pose: 'stand', arms: [2.3 + Math.sin(t * 2 + i) * 0.2, -2.4], dir: 'l', back: true }), t);
        // breath fog on the glass
        if (Q.detail) {
          const k = (Math.sin(t * 1.5 + i * 2) + 1) / 2;
          const [X, Y] = P(0.03, y - 0.1, 1.35);
          ctx.beginPath(); ctx.ellipse(X, Y, 0.2 + k * 0.12, 0.15 + k * 0.1, -0.45, 0, TAU);
          ctx.fillStyle = alpha(C.white, 0.15 + k * 0.2); ctx.fill();
        }
      }, { anim: true });
    });
    // the kid who is not ready for the shark
    R.mover((t) => {
      const sh = shark1(t);
      const near = sh.u > 3.0 && sh.u < 6.5;
      const k = clamp((sh.u - 3.0) / 0.6) * clamp((6.8 - sh.u) / 0.8);
      return { x: 5.0, y: 1.05 + k * 1.0, near, k };
    }, (ctx, t, p) => {
      person(ctx, p.x, p.y, p.k > 0.2 ? Math.abs(Math.sin(t * 9)) * 0.2 : 0, folk(307, { scale: 0.7, pose: p.near ? 'cheer' : 'stand', arms: p.near ? undefined : [2.2, -2.3], dir: 'r', back: !p.near, top: C.mustard, style: 'pony', hair: C.mustard }), t);
      if (p.near && Q.detail) speech(ctx, p.x, p.y, 2.2, 'EEK', { size: 0.4 });
    });
    // dad with a kid on his shoulders, pointing at the shark
    R.thing(8.0, 1.8, (ctx, t) => {
      person(ctx, 8.0, 1.8, 0, folk(308, { pose: 'stand', arms: [2.9, -2.9], dir: 'l', back: true, top: C.coral, style: 'short' }), t);
      person(ctx, 8.0, 1.8, 2.0, folk(309, { scale: 0.6, pose: 'point', dir: 'l', back: true, top: C.teal, hat: 'beanie' }), t);
    }, { anim: true });

    // ---------- The octopus and its long-suffering keeper ----------
    // Four escapes today. Now it's hiding in the treasure chest in its own
    // tank, and the keeper is searching the whole hall for it. The chest
    // blows bubbles and an arm tip curls out from under the lid; a tap lifts
    // the lid and it peeks out, shifty.
    const OT = { x0: 2.0, x1: 3.8, y0: 12.3, y1: 13.9, z0: 1.0, z1: 2.3 };
    const CH = { x: 2.9, y: 13.1 };
    const chest = R.poke({ id: 'chest', at: [CH.x, CH.y, 1.4], r: 0.8, sound: 'clunk' });
    R.thing(OT.x1, OT.y1, (ctx, t) => {
      box(ctx, OT.x0, OT.y0, 0, OT.x1 - OT.x0, OT.y1 - OT.y0, OT.z0, C.navy, { top: C.night });
      label(ctx, (OT.x0 + OT.x1) / 2 + 0.9, OT.y1, 0.5, 'OCTOPUS', 0.2, C.butter);
      // back glass and water
      face(ctx, [[OT.x0, OT.y0, OT.z0], [OT.x1, OT.y0, OT.z0], [OT.x1, OT.y0, OT.z1], [OT.x0, OT.y0, OT.z1]], alpha(C.teal, 0.6), { lw: 0.04 });
      face(ctx, [[OT.x0, OT.y0, OT.z0], [OT.x0, OT.y1, OT.z0], [OT.x0, OT.y1, OT.z1], [OT.x0, OT.y0, OT.z1]], alpha(C.teal, 0.7), { lw: 0.04 });
      rect(ctx, OT.x0, OT.y0, OT.x1 - OT.x0, OT.y1 - OT.y0, OT.z0 + 0.02, alpha(C.butter, 0.8), { stroke: false });
      // the chest
      const k = chest.k();
      const cx0 = CH.x - 0.4, cy0 = CH.y - 0.28, ch = 0.36;
      box(ctx, cx0, cy0, OT.z0, 0.8, 0.56, ch, C.wood, { top: C.brown, dots: C.brown, lw: 0.035 });
      face(ctx, [[cx0, cy0 + 0.56, OT.z0 + 0.12], [cx0 + 0.8, cy0 + 0.56, OT.z0 + 0.12]], null, { lw: 0.05, stroke: C.mustard });
      // the lid, hinged at the back, lifting
      const lz = OT.z0 + ch, back = cy0;
      const ly = back + 0.56 * Math.cos(k * 1.3), lzz = lz + 0.56 * Math.sin(k * 1.3);
      face(ctx, [[cx0, back, lz], [cx0 + 0.8, back, lz], [cx0 + 0.8, ly, lzz + 0.1], [cx0, ly, lzz + 0.1]], C.mustard, { lw: 0.035 });
      if (k > 0.05) {
        // up it comes, eyes first (in front of the open lid)
        const [X, Y] = P(CH.x, CH.y + 0.1, OT.z0 + ch - 0.2 + k * 0.35);
        octopus(ctx, X, Y, t, { scale: 0.6, shifty: true, drape: true });
      } else {
        // an arm tip, curling out from under the lid and down the front
        const [X, Y] = P(cx0 + 0.62, cy0 + 0.56, lz + 0.05);
        const w = Math.sin(t * 2.1) * 0.05;
        ctx.beginPath(); ctx.moveTo(X - 0.05, Y - 0.02); ctx.quadraticCurveTo(X + 0.3, Y + 0.02 + w, X + 0.2, Y + 0.3 + w);
        ctx.quadraticCurveTo(X + 0.14, Y + 0.36 + w, X + 0.1, Y + 0.28 + w);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.15; ctx.lineCap = 'round'; ctx.stroke();
        ctx.strokeStyle = C.coral; ctx.lineWidth = 0.09; ctx.stroke();
      }
      // bubbles out of the chest
      if (Q.detail) {
        ctx.strokeStyle = alpha(C.white, 0.85); ctx.lineWidth = 0.03;
        particles(t, 3, 2.2, (q, r) => {
          const [bx, by] = P(CH.x + (r() - 0.5) * 0.3, CH.y, lz + 0.1 + q * (OT.z1 - lz - 0.3));
          ctx.beginPath(); ctx.arc(bx, by, 0.04 + r() * 0.04, 0, TAU); ctx.stroke();
        }, 27);
      }
      // front water and glass
      face(ctx, [[OT.x0, OT.y1, OT.z0], [OT.x1, OT.y1, OT.z0], [OT.x1, OT.y1, OT.z1 - 0.2], [OT.x0, OT.y1, OT.z1 - 0.2]], alpha(C.teal, 0.45), { stroke: false });
      face(ctx, [[OT.x1, OT.y0, OT.z0], [OT.x1, OT.y1, OT.z0], [OT.x1, OT.y1, OT.z1 - 0.2], [OT.x1, OT.y0, OT.z1 - 0.2]], alpha(C.teal, 0.35), { stroke: false });
      rect(ctx, OT.x0, OT.y0, OT.x1 - OT.x0, OT.y1 - OT.y0, OT.z1 - 0.2, alpha(C.tealLight, 0.45), { stroke: false });
      face(ctx, [[OT.x0, OT.y1, OT.z0], [OT.x1, OT.y1, OT.z0], [OT.x1, OT.y1, OT.z1], [OT.x0, OT.y1, OT.z1]], alpha(C.white, 0.08), { lw: 0.04 });
      face(ctx, [[OT.x1, OT.y0, OT.z0], [OT.x1, OT.y1, OT.z0], [OT.x1, OT.y1, OT.z1], [OT.x1, OT.y0, OT.z1]], alpha(C.white, 0.08), { lw: 0.04 });
    }, { anim: true });
    // (A big octopus escapes up the alley too, so this one's the little one.)
    R.find({ id: 'octopus', label: 'A little octopus', kind: 'poke', inside: chest, at: [CH.x, CH.y, 1.55], r: 0.7, hint: 'The octopus tank looks empty. Something in it keeps blowing bubbles.' });
    // the keeper, searching the hall, looking under things
    const search = route([[5.2, 15.1, 2.5], [8.8, 14.0, 2], [9.6, 11.0, 2], [5.4, 11.6, 2]], { speed: 0.7 });
    R.mover(search, (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, folk(310, {
        pose: p.moving ? 'walk' : 'point', dir: p.dir, back: p.back, top: C.teal, bottom: C.navy, hat: 'cap', style: 'pony', hair: C.brown, speed: 8,
      }), t);
      if (!p.moving && Q.detail) speech(ctx, p.x, p.y, 2.8, pulse(t, 9) < 0.5 ? 'OTTO?' : 'not funny, Otto', { size: 0.3 });
    }, { bias: 0.2 });

    R.thing(6.9, 12.2, (ctx) => {
      box(ctx, 6.6, 11.9, 0, 0.6, 0.6, 0.06, C.mustard, { flat: true });
      const [X, Y] = P(6.9, 12.2, 0.06);
      ctx.beginPath(); ctx.moveTo(X - 0.3, Y); ctx.lineTo(X - 0.08, Y - 1.1); ctx.lineTo(X + 0.08, Y - 1.1); ctx.lineTo(X + 0.3, Y);
      paint(ctx, C.mustard, { lw: 0.04 });
      label(ctx, 6.9, 12.2, 0.45, 'WET', 0.16, C.ink, 'Rethink Sans');
    });

    // ---------- Touch pool ----------
    const TP = { x0: 10.8, x1: 14.8, y0: 11.3, y1: 14.3, h: 0.8 };
    const crabAt = (t) => {
      const q = pulse(t, 7);
      const k = q < 0.5 ? ease(q * 2) : ease(2 - q * 2);
      return { x: lerp(11.5, 12.9, k), y: lerp(12.2, 12.6, k), q };
    };
    const hermitAt = (t) => {
      const q = pulse(t, 13);
      const A = [13.25, 12.45], B = [13.85, 13.0];
      const k = q < 0.12 ? ease(q / 0.12) : q < 0.5 ? 1 : q < 0.62 ? 1 - ease((q - 0.5) / 0.12) : 0;
      return { x: lerp(A[0], B[0], k), y: lerp(A[1], B[1], k), dir: q < 0.5 ? 'r' : 'l', moving: (q < 0.12) || (q > 0.5 && q < 0.62) };
    };
    R.find({ id: 'hermit', label: 'A hermit crab', kind: 'hard', r: 0.6, at: (t) => { const h = hermitAt(t); return [h.x, h.y, 0.4]; }, riddle: 'Lying low in the touch pool, house and all.', hint: 'One of the rocks in the touch pool has legs, now and then.' });
    R.poke({ id: 'crab', at: (t) => { const c = crabAt(t); return [c.x, c.y, 0.5]; }, r: 0.6, sound: 'tick', say: ['Pinch.', 'Two fingers PLEASE.', 'Not a hermit. Just cross.'] });
    R.thing(TP.x0, TP.y0, (ctx) => {
      box(ctx, TP.x0, TP.y0, 0, TP.x1 - TP.x0, 0.3, TP.h, C.grey, { top: C.greyLight });
      box(ctx, TP.x0, TP.y0 + 0.3, 0, 0.3, TP.y1 - TP.y0 - 0.3, TP.h, C.grey, { top: C.greyLight });
      rect(ctx, TP.x0 + 0.3, TP.y0 + 0.3, TP.x1 - TP.x0 - 0.3, TP.y1 - TP.y0 - 0.3, 0.2, C.butter, { dots: C.wood, density: 0.25, stroke: false });
      // rocks, starfish, anemones
      const r = rng(41);
      for (let i = 0; i < 6; i++) disc(ctx, 11.3 + r() * 3.0, 11.8 + r() * 2.2, 0.22, 0.2 + r() * 0.25, pick(r, [C.grey, C.purple, shade(C.grey, 0.2)]), { lw: 0.03 });
      for (const [sx, sy, c] of [[13.9, 13.5, C.coral], [11.7, 13.6, C.mustard], [14.2, 12.0, C.pink]]) {
        const [X, Y] = P(sx, sy, 0.22);
        ctx.beginPath();
        for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU - Math.PI / 2; const rr = i % 2 ? 0.1 : 0.28; ctx.lineTo(X + Math.cos(a) * rr, Y + Math.sin(a) * rr * 0.6); }
        ctx.closePath(); paint(ctx, c, { lw: 0.03 });
      }
    }, { depth: TP.x0 + TP.y0 + 0.5 });
    R.thing(TP.x1, TP.y1, (ctx, t) => {
      // crab
      const c = crabAt(t);
      const [X, Y] = P(c.x, c.y, 0.25);
      const pinch = c.q > 0.45 && c.q < 0.55;
      ctx.save();
      ctx.translate(X, Y);
      ctx.strokeStyle = C.red; ctx.lineWidth = 0.06;
      for (let i = 0; i < 3; i++) for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(s * 0.2, -0.1); ctx.lineTo(s * (0.4 + i * 0.05), -0.2 + i * 0.08); ctx.lineTo(s * (0.45 + i * 0.05), 0.02 + i * 0.05); ctx.stroke();
      }
      for (const s of [-1, 1]) {
        const lift = pinch ? 0.25 : 0.05 + Math.sin(t * 6) * 0.04;
        ctx.beginPath(); ctx.arc(s * 0.38, -0.35 - lift, 0.12, 0, TAU); paint(ctx, C.red, { lw: 0.03 });
      }
      ctx.beginPath(); ctx.ellipse(0, -0.15, 0.3, 0.18, 0, 0, TAU); paint(ctx, C.coral, { dots: C.red, density: 0.2, lw: 0.04 });
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(-0.08, -0.34, 0.04, 0, TAU); ctx.arc(0.08, -0.34, 0.04, 0, TAU); ctx.fill();
      ctx.restore();
      // the hermit crab (a find): its shell one of the pool's purple rocks,
      // and now and then it gets up and walks a little way
      const h = hermitAt(t);
      hermitCrab(ctx, h.x, h.y, 0.22, t, h.dir, h.moving);
      // water surface over it
      rect(ctx, TP.x0 + 0.3, TP.y0 + 0.3, TP.x1 - TP.x0 - 0.3, TP.y1 - TP.y0 - 0.3, TP.h - 0.12, alpha(C.water, 0.45), { stroke: false });
      if (Q.detail) {
        ctx.strokeStyle = alpha(C.white, 0.5); ctx.lineWidth = 0.04;
        for (let i = 0; i < 5; i++) {
          const y = 11.9 + i * 0.5, x = 11.3 + ((i * 1.3 + t * 0.3) % 2.8);
          const [a, b] = P(x, y, TP.h - 0.12), [c2, d] = P(x + 0.6, y, TP.h - 0.12);
          ctx.beginPath(); ctx.moveTo(a, b); ctx.quadraticCurveTo((a + c2) / 2, b - 0.08, c2, d); ctx.stroke();
        }
      }
      // anemones
      for (const [ax, ay] of [[14.1, 12.9], [11.4, 12.8]]) {
        const [X2, Y2] = P(ax, ay, 0.25);
        ctx.strokeStyle = C.pink; ctx.lineWidth = 0.07; ctx.lineCap = 'round';
        for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.35 + Math.sin(t * 2 + i) * 0.1; ctx.beginPath(); ctx.moveTo(X2, Y2); ctx.lineTo(X2 + Math.cos(a) * 0.4, Y2 + Math.sin(a) * 0.4); ctx.stroke(); }
      }
      // front walls
      box(ctx, TP.x0, TP.y1 - 0.3, 0, TP.x1 - TP.x0, 0.3, TP.h, C.grey, { top: C.greyLight });
      box(ctx, TP.x1 - 0.3, TP.y0 + 0.3, 0, 0.3, TP.y1 - TP.y0 - 0.6, TP.h, C.grey, { top: C.greyLight });
      label(ctx, (TP.x0 + TP.x1) / 2 + 0.2, TP.y1 + 0.05, 0.4, 'TOUCH POOL', 0.24, C.ink);
    }, { anim: true });
    // sign
    R.thing(TP.x1 + 0.4, TP.y0 - 0.2, (ctx) => {
      box(ctx, TP.x1 + 0.3, TP.y0 - 0.3, 0, 0.08, 0.08, 1.8, C.ink, { flat: true });
      onPost(ctx, TP.x1 + 0.34, TP.y0 - 0.26, 1.7);
    });
    // kids at the touch pool: one gets pinched every time
    R.mover(() => ({ x: 10.3, y: 12.5 }), (ctx, t, p) => {
      const c = crabAt(t);
      const ow = c.q > 0.47 && c.q < 0.65;
      person(ctx, p.x, p.y, ow ? Math.abs(Math.sin((c.q - 0.47) * 30)) * 0.4 : 0, folk(311, { scale: 0.7, pose: ow ? 'cheer' : 'point', dir: 'r', top: C.pink, style: 'curly' }), t);
      if (ow && Q.detail) speech(ctx, p.x, p.y, 2.1, 'OW!', { size: 0.4 });
    });
    R.mover(() => ({ x: 12.7, y: 14.8 }), (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, folk(312, { scale: 0.66, pose: 'point', dir: 'l', back: true, top: C.mustard, hat: 'cap' }), t);
    });

    // ---------- Tour group ----------
    const tour = orbit(JX, JY, 3.4, 3.4, 40, 0);
    const tourists = [[0, 313, 'wave'], [-1.3, 314, 'walk'], [-2.4, 315, 'walk'], [-3.4, 316, 'walk']];
    tourists.forEach(([off, seed, pose], i) => {
      R.mover((t) => tour(t + off), (ctx, t, p) => {
        person(ctx, p.x, p.y, 0, folk(seed, {
          pose, dir: p.dir, back: p.back, scale: i === 3 ? 0.7 : 1, top: i ? undefined : C.red, hat: i ? undefined : 'cap',
          hold: i === 0 ? (g) => { g.beginPath(); g.moveTo(0.1, 0.2); g.lineTo(0.1, -1.6); g.strokeStyle = C.ink; g.lineWidth = 0.05; g.stroke(); g.beginPath(); g.moveTo(0.1, -1.6); g.lineTo(0.6, -1.45); g.lineTo(0.1, -1.3); paint(g, C.mustard, { lw: 0.03 }); } : undefined,
        }), t);
        if (i === 0 && Q.detail && pulse(t, 10) > 0.6) speech(ctx, p.x, p.y, 2.9, 'and on your left, fish', { size: 0.28 });
      });
    });

    // ---------- Bench facing the deep tank ----------
    R.thing(3.9, 11.4, (ctx, t) => {
      box(ctx, 3.0, 9.0, 0, 0.9, 2.4, 0.6, C.wood, { top: C.woodLight });
      person(ctx, 3.35, 9.7, -0.1, folk(317, { pose: 'sit', dir: 'l', back: true, top: C.purple, style: 'long' }), t);
      person(ctx, 3.35, 10.7, -0.1, folk(318, { pose: 'sit', dir: 'l', back: true, top: C.green, style: 'short', arms: [1.2, 1.2] }), t);
      if (Q.detail) {
        const k = pulse(t, 2.5);
        label(ctx, 3.0, 10.2, 2.2 + k * 0.8, '♥', 0.4 + k * 0.2, alpha(C.pink, 1 - k));
      }
    }, { anim: true });

    // ---------- A stroller doing laps ----------
    const stroll = route([[6.6, 15.3, 1.5], [10.2, 15.3, 1.5]], { speed: 0.6, loop: false });
    R.mover(stroll, (ctx, t, p) => {
      const sx = p.x + (p.dir === 'r' ? 0.95 : -0.95);
      box(ctx, sx - 0.4, p.y - 0.35, 0.3, 0.8, 0.7, 0.5, C.coral, { top: C.coralLight });
      const [X, Y] = P(sx, p.y, 0.8);
      ctx.beginPath(); ctx.arc(X, Y - 0.1, 0.45, Math.PI, 0); paint(ctx, C.navy, { lw: 0.04 });
      for (const dx of [-0.3, 0.3]) { const [wx, wy] = P(sx + dx, p.y + 0.35, 0.15); ctx.beginPath(); ctx.arc(wx, wy, 0.14, 0, TAU); paint(ctx, C.ink); }
      person(ctx, p.x, p.y, 0, folk(319, { pose: p.moving ? 'walk' : 'stand', arms: [1.3, 1.3], dir: p.dir, back: p.back, top: C.butter, style: 'bun' }), t);
    });

    // ---------- School group on poufs, and a teacher counting heads ----------
    const pupils = [[12.0, 5.2, 320], [12.7, 5.2, 321], [13.4, 5.2, 322]];
    pupils.forEach(([x, y, seed], i) => {
      R.thing(x, y + 0.3, (ctx, t) => {
        cylinder(ctx, x, y, 0, 0.3, 0.35, [C.coral, C.mustard, C.teal][i], { top: tint([C.coral, C.mustard, C.teal][i], 0.3) });
        const hand = i === 1 && pulse(t, 6) > 0.5;
        person(ctx, x, y + 0.05, -0.05, folk(seed, { scale: 0.6, pose: hand ? 'wave' : 'sit', dir: 'l', back: true, speed: 9 }), t);
      }, { anim: true });
    });
    R.mover(() => ({ x: 13.9, y: 3.9 }), (ctx, t, p) => {
      const q = pulse(t, 6);
      person(ctx, p.x, p.y, 0, folk(323, { pose: q > 0.5 ? 'point' : 'read', dir: 'l', top: C.lilac, style: 'bun', hair: C.grey, hold: q > 0.5 ? undefined : (g) => { g.beginPath(); g.rect(0.0, -0.2, 0.4, 0.5); paint(g, C.white, { lw: 0.02 }); } }), t);
      if (Q.detail) speech(ctx, p.x, p.y, 2.75, q < 0.5 ? '...11, 12, 13' : 'yes, Milo?', { size: 0.28 });
    });

    // ---------- Air: light shafts from the tank tops ----------
    R.air((ctx, t) => {
      if (!Q.detail) return;
      for (let i = 0; i < 3; i++) {
        const k = (Math.sin(t * 0.4 + i * 2) + 1) / 2;
        const x = 3 + i * 4.5;
        face(ctx, [[x, 0.1, 6.3], [x + 1.2, 0.1, 6.3], [x + 2.4, 3.5, 0], [x + 0.6, 3.5, 0]], alpha(C.tealLight, 0.03 + k * 0.03), { stroke: false });
      }
    });
  },
};

const SKINS = [SKIN[0], SKIN[2]];
const ALGAE_C = 'rgba(126,187,104,0.55)';
const ALGAE = (() => {
  const r = rng(77);
  const out = [];
  for (let i = 0; i < 70; i++) out.push([10.1 + r() * 5.2, 1.8 + r() * 4.4, 0.12 + r() * 0.28]);
  return out;
})();

// Little sign on a post, facing +x.
function onPost(ctx, x, y, z) {
  face(ctx, [[x + 0.05, y - 0.55, z - 0.6], [x + 0.05, y + 0.55, z - 0.6], [x + 0.05, y + 0.55, z + 0.2], [x + 0.05, y - 0.55, z + 0.2]], C.butter, { lw: 0.04 });
  ctx.save();
  ctx.translate(x + 0.06, (x + 0.06) / 2);
  paintText(ctx, 'left', y, z - 0.05, 'TWO FINGERS', 0.2, C.coral);
  paintText(ctx, 'left', y, z - 0.35, 'PLEASE', 0.2, C.coral);
  ctx.restore();
}

// A hermit crab in a purple shell that matches the touch pool's rocks. Legs
// and eyes only show while it's walking; stopped, it's one more rock.
function hermitCrab(ctx, x, y, z, t, dir, moving) {
  const [X, Y] = P(x, y, z);
  const f = dir === 'l' ? -1 : 1;
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(f * 0.85, 0.85);
  if (moving) {
    ctx.strokeStyle = C.coral; ctx.lineWidth = 0.05;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(0.1 + i * 0.07, -0.1); ctx.lineTo(0.25 + i * 0.08, 0.0 + Math.sin(t * 10 + i) * 0.03); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(0.32, -0.16, 0.08, 0, TAU); paint(ctx, C.coral, { lw: 0.03 });
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0.3, -0.3, 0.035, 0, TAU); ctx.arc(0.38, -0.29, 0.035, 0, TAU); ctx.fill();
  } else if (Q.detail) {
    // (just the claw tip, peeking)
    ctx.beginPath(); ctx.arc(0.2, -0.06, 0.05, 0, TAU); ctx.fillStyle = C.coral; ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(0.18, -0.05);
  ctx.bezierCurveTo(0.2, -0.5, -0.35, -0.55, -0.35, -0.2);
  ctx.bezierCurveTo(-0.35, -0.02, -0.1, 0.0, 0.18, -0.05);
  paint(ctx, C.purple, { dots: shade(C.purple, 0.35), density: 0.25, lw: 0.04 });
  ctx.beginPath(); ctx.arc(-0.1, -0.23, 0.12, 0, Math.PI * 1.6);
  ctx.strokeStyle = shade(C.purple, 0.35); ctx.lineWidth = 0.035; ctx.stroke();
  ctx.restore();
}

// A wooden decoy duck, painted white with an orange bill, the size of the
// goose: only the wood grain, the flat keel and the screw eye give it away.
function decoyDuck(ctx, X, Y, rock) {
  ctx.save();
  ctx.translate(X, Y);
  ctx.rotate(rock);
  ctx.beginPath(); ctx.ellipse(0, 0.02, 0.55, 0.14, 0, 0, TAU); ctx.fillStyle = alpha(C.white, 0.35); ctx.fill();
  // keel
  ctx.beginPath(); ctx.rect(-0.3, -0.06, 0.6, 0.08); paint(ctx, C.wood, { lw: 0.03 });
  // body and tail
  ctx.beginPath();
  ctx.ellipse(0, -0.22, 0.44, 0.22, -0.06, 0, TAU);
  ctx.moveTo(-0.32, -0.26); ctx.lineTo(-0.56, -0.38); ctx.lineTo(-0.4, -0.14);
  paint(ctx, C.white, { dots: Q.detail ? C.woodLight : null, density: 0.12 });
  // painted wing and grain lines
  ctx.beginPath(); ctx.ellipse(-0.06, -0.24, 0.24, 0.11, -0.15, 0, TAU); paint(ctx, C.greyLight);
  if (Q.detail) {
    ctx.strokeStyle = alpha(C.wood, 0.7); ctx.lineWidth = 0.02;
    for (const dy of [-0.12, -0.32]) { ctx.beginPath(); ctx.moveTo(-0.3, dy); ctx.quadraticCurveTo(0, dy - 0.04, 0.3, dy); ctx.stroke(); }
  }
  // neck, head and bill
  ctx.beginPath(); ctx.moveTo(0.22, -0.3); ctx.quadraticCurveTo(0.3, -0.48, 0.3, -0.62);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.22; ctx.lineCap = 'round'; ctx.stroke();
  ctx.strokeStyle = C.white; ctx.lineWidth = 0.15; ctx.stroke();
  ctx.beginPath(); ctx.arc(0.3, -0.66, 0.13, 0, TAU); paint(ctx, C.white);
  ctx.beginPath(); ctx.moveTo(0.4, -0.7); ctx.lineTo(0.62, -0.64); ctx.lineTo(0.4, -0.6); paint(ctx, C.coral);
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0.33, -0.69, 0.03, 0, TAU); ctx.fill();
  // the screw eye on its back, for the string
  ctx.beginPath(); ctx.arc(-0.05, -0.46, 0.04, 0, TAU); ctx.strokeStyle = C.grey; ctx.lineWidth = 0.025; ctx.stroke();
  ctx.restore();
}
