// Observatory: a big silver dome that turns when the astronomer cranks it,
// a planetarium projector spraying stars on the walls, a queue of kids
// waiting behind a goose that will not give up the little telescope, and
// someone who keeps spotting shooting stars one second too late.
import {
  C, box, rect, disc, cylinder, face, poly, paint, person, folk, walls, slab, planks,
  frame, chair, onLeft, onRight, windowR, paintText, label, speech, shade, tint, mix, alpha, Q, P, hash, rng,
} from '../../../engine/art.js';
import { route, pulse, clamp, ease } from '../../../engine/actors.js';
import { ZK } from '../../../engine/iso.js';

// Dome geometry: a drum (cylinder) with a hemisphere on top.
const DX = 6, DY = 6, DR = 3, DH = 2.5, HR = 2.72;
const seen = (n) => n[0] * ZK + n[1] * ZK + n[2] > 0; // does a surface normal face the viewer?
const sph = (a, ph, r = HR) => [DX + r * Math.cos(ph) * Math.cos(a), DY + r * Math.cos(ph) * Math.sin(a), DH + r * Math.sin(ph)];
const nrm = (a, ph) => [Math.cos(ph) * Math.cos(a), Math.cos(ph) * Math.sin(a), Math.sin(ph)];
const cyl = (a, z, r = DR) => [DX + Math.cos(a) * r, DY + Math.sin(a) * r, z];

// The astronomer's 16 second routine drives the dome: it only turns while cranked.
const CYC = 16;
const aim = (n) => 0.75 + Math.sin(n * 1.7) * 0.75 + Math.sin(n * 0.6) * 0.2;
function domeAngle(t) {
  const n = Math.floor(t / CYC);
  const s = t - n * CYC;
  return aim(n - 1) + (aim(n) - aim(n - 1)) * ease(clamp((s - 3.5) / 6));
}
const tubeElev = (t) => 1.12 + Math.sin(t * 0.23) * 0.2;

// Shooting stars: one every 7 seconds, alternating walls.
const SHOT = 7;
function shotInfo(t) {
  const n = Math.floor(t / SHOT);
  const s = t - n * SHOT;
  const left = n % 2 === 0;
  const u0 = left ? 6 + hash(n, 1) * 5 : 7.5 + hash(n, 2) * 4;
  const z0 = 4.6 + hash(n, 3) * 1.0;
  return { n, s, left, u0, z0 };
}

function domePath(ctx) {
  const [X, Y] = P(DX, DY, DH);
  ctx.beginPath();
  ctx.ellipse(X, Y, HR * Math.SQRT2, HR * 1.3246, 0, Math.PI, Math.PI * 2);
  ctx.ellipse(X, Y, HR * Math.SQRT2, HR * Math.SQRT2 / 2, 0, 0, Math.PI);
  ctx.closePath();
}

function cylBand(ctx, a1, a2, z1, z2, fill, o) {
  const pts = [];
  const n = 8;
  for (let i = 0; i <= n; i++) pts.push(cyl(a1 + ((a2 - a1) * i) / n, z1));
  for (let i = n; i >= 0; i--) pts.push(cyl(a1 + ((a2 - a1) * i) / n, z2));
  face(ctx, pts, fill, o);
}

function drawTube(ctx, a, e) {
  const u = [Math.cos(e) * Math.cos(a), Math.cos(e) * Math.sin(a), Math.sin(e)];
  const piv = [DX, DY, DH + 0.6];
  const sExit = -0.6 * u[2] + Math.sqrt(0.36 * u[2] * u[2] + HR * HR - 0.36);
  const at = (s) => P(piv[0] + u[0] * s, piv[1] + u[1] * s, piv[2] + u[2] * s);
  const [ax, ay] = at(sExit - 0.2);
  const [bx, by] = at(5.6);
  const [cx, cy] = at(5.0);
  ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.86; ctx.stroke();
  ctx.strokeStyle = C.white; ctx.lineWidth = 0.72; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
  ctx.strokeStyle = alpha(C.grey, 0.6); ctx.lineWidth = 0.22; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(bx, by);
  ctx.strokeStyle = C.coral; ctx.lineWidth = 0.72; ctx.stroke();
  // lens end
  const ang = Math.atan2(by - ay, bx - ax);
  ctx.beginPath();
  ctx.ellipse(bx, by, 0.2, 0.4, ang, 0, Math.PI * 2);
  paint(ctx, C.night, { lw: 0.05 });
  // little finder scope
  const [fx, fy] = at(3.6);
  const [gx, gy] = at(4.6);
  const off = 0.45;
  ctx.beginPath();
  ctx.moveTo(fx + Math.sin(ang) * off, fy - Math.cos(ang) * off);
  ctx.lineTo(gx + Math.sin(ang) * off, gy - Math.cos(ang) * off);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.26; ctx.stroke();
  ctx.strokeStyle = C.mustard; ctx.lineWidth = 0.14; ctx.stroke();
  return { sExit, u, piv };
}

function drawDome(ctx, t) {
  const a = domeAngle(t);
  const e = tubeElev(t);
  const u = [Math.cos(e) * Math.cos(a), Math.cos(e) * Math.sin(a), Math.sin(e)];
  const sExit = -0.6 * u[2] + Math.sqrt(0.36 * u[2] * u[2] + HR * HR - 0.36);
  const exitN = [u[0] * sExit, u[1] * sExit, 0.6 + u[2] * sExit];
  const front = seen(exitN);
  if (!front) drawTube(ctx, a, e);

  // drum
  cylinder(ctx, DX, DY, 0, DR, DH, C.white, { top: C.greyLight });
  cylBand(ctx, -Math.PI / 4, (3 * Math.PI) / 4, DH - 0.35, DH - 0.12, C.mustard, { lw: 0.04 });
  cylBand(ctx, 1.72, 2.12, 0, 1.95, C.coral, { dots: shade(C.coral, 0.4), density: 0.2 });
  cylBand(ctx, 1.8, 2.04, 1.3, 1.75, C.butter, { lw: 0.03 });
  const [kx, ky] = P(...cyl(2.02, 1.0, DR + 0.02));
  ctx.beginPath(); ctx.arc(kx, ky, 0.07, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
  // rivets
  if (Q.detail) {
    ctx.fillStyle = C.grey;
    for (let i = 0; i < 18; i++) {
      const aa = -Math.PI / 4 + (i / 17) * Math.PI;
      for (const z of [0.25, DH - 0.55]) {
        const [X, Y] = P(...cyl(aa, z, DR + 0.01));
        ctx.beginPath(); ctx.arc(X, Y, 0.045, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  // crank wheel beside the ladder
  const wa = 0.9;
  const wc = cyl(wa, 2.05, DR + 0.08);
  const tang = [-Math.sin(wa), Math.cos(wa), 0];
  const wr = 0.34;
  const spin = a * 14;
  ctx.beginPath();
  for (let i = 0; i <= 20; i++) {
    const b = (i / 20) * Math.PI * 2;
    const p = P(wc[0] + tang[0] * Math.cos(b) * wr, wc[1] + tang[1] * Math.cos(b) * wr, wc[2] + Math.sin(b) * wr);
    i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
  }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.14; ctx.stroke();
  ctx.strokeStyle = C.coral; ctx.lineWidth = 0.08; ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const b = spin + (i / 3) * Math.PI * 2;
    const p0 = P(...wc);
    const p = P(wc[0] + tang[0] * Math.cos(b) * wr, wc[1] + tang[1] * Math.cos(b) * wr, wc[2] + Math.sin(b) * wr);
    ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p[0], p[1]);
  }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();

  // hemisphere
  domePath(ctx);
  paint(ctx, C.greyLight, { stroke: false });
  ctx.save();
  domePath(ctx);
  ctx.clip();
  const [X0, Y0] = P(DX, DY, DH);
  // shadow side (screen left)
  ctx.beginPath();
  ctx.rect(X0 - 5, Y0 - 5, 10, 8);
  ctx.ellipse(X0 + 1.1, Y0 - 0.9, HR * 1.25, HR * 1.25, 0, 0, Math.PI * 2);
  if (Q.detail) { ctx.fillStyle = alpha(C.grey, 0.55); ctx.fill('evenodd'); }
  // highlight
  ctx.beginPath();
  ctx.ellipse(X0 + 1.2, Y0 - 2.3, 0.7, 0.35, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = alpha(C.white, 0.8);
  ctx.fill();
  // panel seams turn with the dome
  if (Q.lines) {
    ctx.strokeStyle = alpha(C.ink, 0.55);
    ctx.lineWidth = 0.035;
    for (let k = 1; k < 8; k++) {
      const aa = a + (k / 8) * Math.PI * 2;
      for (let i = 0; i < 8; i++) {
        const p0 = (i / 8) * (Math.PI / 2), p1 = ((i + 1) / 8) * (Math.PI / 2);
        if (!seen(nrm(aa, (p0 + p1) / 2))) continue;
        const A = P(...sph(aa, p0)), B = P(...sph(aa, p1));
        ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
      }
    }
    for (const ph of [0.45, 0.95]) {
      ctx.beginPath();
      let on = false;
      for (let i = 0; i <= 48; i++) {
        const aa = (i / 48) * Math.PI * 2;
        const p = P(...sph(aa, ph));
        if (seen(nrm(aa, ph))) { on ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); on = true; } else on = false;
      }
      ctx.stroke();
    }
  }
  // the slit, a dark band over the top
  const perp = [-Math.sin(a) * 0.46, Math.cos(a) * 0.46, 0];
  const steps = 12;
  for (let i = 0; i < steps; i++) {
    const p0 = (i / steps) * (Math.PI / 2 + 0.35), p1 = ((i + 1) / steps) * (Math.PI / 2 + 0.35);
    if (!seen(nrm(a, (p0 + p1) / 2))) continue;
    const c0 = sph(a, p0, HR + 0.02), c1 = sph(a, p1, HR + 0.02);
    poly(ctx, [
      [c0[0] - perp[0], c0[1] - perp[1], c0[2]], [c0[0] + perp[0], c0[1] + perp[1], c0[2]],
      [c1[0] + perp[0], c1[1] + perp[1], c1[2]], [c1[0] - perp[0], c1[1] - perp[1], c1[2]],
    ]);
    ctx.fillStyle = C.night;
    ctx.fill();
    ctx.strokeStyle = C.night;
    ctx.lineWidth = 0.03;
    ctx.stroke();
  }
  ctx.restore();
  domePath(ctx);
  paint(ctx, null);
  if (front) drawTube(ctx, a, e);

  // the astronomer's forgotten cocoa, on the ledge
  mug(ctx, 8.7, 5.0, DH, t);
}

function mug(ctx, x, y, z, t) {
  const [X, Y] = P(x, y, z);
  ctx.beginPath();
  ctx.ellipse(X + 0.19, Y - 0.2, 0.1, 0.09, 0, 0, Math.PI * 2);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.stroke();
  ctx.strokeStyle = C.coral; ctx.lineWidth = 0.05; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(X - 0.17, Y - 0.38); ctx.lineTo(X - 0.15, Y); ctx.lineTo(X + 0.15, Y); ctx.lineTo(X + 0.17, Y - 0.38);
  ctx.closePath();
  paint(ctx, C.coral, { lw: 0.04 });
  ctx.beginPath();
  ctx.ellipse(X, Y - 0.38, 0.17, 0.06, 0, 0, Math.PI * 2);
  paint(ctx, C.brown, { lw: 0.04 });
  if (!Q.detail) return;
  ctx.strokeStyle = alpha(C.white, 0.8);
  ctx.lineWidth = 0.04;
  ctx.lineCap = 'round';
  for (let i = 0; i < 2; i++) {
    const k = (t * 0.5 + i * 0.5) % 1;
    ctx.globalAlpha = 1 - k;
    ctx.beginPath();
    for (let j = 0; j <= 6; j++) {
      const yy = Y - 0.45 - k * 0.5 - j * 0.08;
      const xx = X - 0.05 + i * 0.1 + Math.sin(j * 1.2 + t * 3 + i) * 0.05;
      j ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function recliner(ctx, x, y, color) {
  box(ctx, x, y, 0.3, 2.5, 1.0, 0.25, color);
  box(ctx, x + 0.2, y + 0.1, 0, 0.2, 0.8, 0.3, C.ink, { flat: true });
  box(ctx, x + 2.1, y + 0.1, 0, 0.2, 0.8, 0.3, C.ink, { flat: true });
  face(ctx, [[x, y, 0.55], [x, y + 1, 0.55], [x - 0.5, y + 1, 1.4], [x - 0.5, y, 1.4]], tint(color, 0.15), { dots: shade(color, 0.4), density: 0.15 });
}

// A star chart poster: dots joined into a constellation.
function chart(plane, u, z, w, h, seed, color) {
  return (ctx) => {
    frame(ctx, plane, u, z, w, h, color);
    const r = rng(seed);
    const pts = [];
    for (let i = 0; i < 6; i++) pts.push([u + 0.3 + r() * (w - 0.6), z + 0.3 + r() * (h - 0.6)]);
    const at = ([a, b]) => (plane === 'left' ? P(0.01, a, b) : P(a, 0.01, b));
    ctx.beginPath();
    pts.forEach((p, i) => { const [X, Y] = at(p); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    ctx.strokeStyle = alpha(C.white, 0.8);
    ctx.lineWidth = 0.04;
    ctx.stroke();
    for (const p of pts) {
      const [X, Y] = at(p);
      ctx.beginPath(); ctx.arc(X, Y, 0.09, 0, Math.PI * 2); ctx.fillStyle = C.butter; ctx.fill();
    }
  };
}

// 4-point sparkle
function sparkle(ctx, X, Y, s, color) {
  ctx.beginPath();
  ctx.moveTo(X, Y - s); ctx.quadraticCurveTo(X, Y, X + s, Y);
  ctx.quadraticCurveTo(X, Y, X, Y + s); ctx.quadraticCurveTo(X, Y, X - s, Y);
  ctx.quadraticCurveTo(X, Y, X, Y - s);
  ctx.fillStyle = color;
  ctx.fill();
}

const PROJ = [4.4, 12.2, 1.55];

export default {
  id: 'observatory',
  name: 'Observatory',
  blurb: 'Every few seconds a star shoots across the wall and Gary misses it. The goose has had the little telescope for an hour and will not share.',

  build(R) {
    R.floor((ctx) => {
      slab(ctx, C.greyLight);
      planks(ctx, mix(C.purple, C.navy, 0.55), 1);
      // a big round rug with a compass rose under the projector
      disc(ctx, PROJ[0], PROJ[1], 0.01, 3.4, C.navy, { dots: C.ink, density: 0.3 });
      disc(ctx, PROJ[0], PROJ[1], 0.012, 3.0, mix(C.navy, C.purple, 0.4), { stroke: false });
      const cols = [C.butter, C.mustard];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const L = i % 2 ? 1.4 : 2.5;
        face(ctx, [
          [PROJ[0], PROJ[1], 0.02],
          [PROJ[0] + Math.cos(a + 0.35) * 0.5, PROJ[1] + Math.sin(a + 0.35) * 0.5, 0.02],
          [PROJ[0] + Math.cos(a) * L, PROJ[1] + Math.sin(a) * L, 0.02],
        ], cols[i % 2], { lw: 0.03 });
      }
    });

    // Night walls, speckled with painted stars.
    R.wall((ctx) => {
      walls(ctx, { h: 6, left: C.navy, right: C.night, cap: C.paper, dotsL: C.night, densL: 0.12 });
      const r = rng(77);
      for (let i = 0; i < 170; i++) {
        const left = i % 2 === 0;
        const u = 0.2 + r() * 15.6, z = 0.8 + r() * 5.1;
        const [X, Y] = left ? P(0, u, z) : P(u, 0, z);
        const s = 0.03 + r() * r() * 0.08;
        ctx.beginPath();
        ctx.arc(X, Y, s, 0, Math.PI * 2);
        ctx.fillStyle = r() < 0.3 ? C.butter : C.white;
        ctx.fill();
      }
      // a painted crescent moon
      const [mx, my] = P(8.4, 0, 4.7);
      ctx.beginPath();
      ctx.arc(mx, my, 0.75, 0, Math.PI * 2);
      ctx.arc(mx + 0.35, my - 0.2, 0.62, 0, Math.PI * 2, true);
      ctx.fillStyle = C.butter;
      ctx.fill('evenodd');
    });

    R.decor((ctx) => {
      paintText(ctx, 'left', 9.6, 5.3, 'LOOK UP', 1.1, C.butter);
      paintText(ctx, 'right', 14.3, 5.3, 'SHHH', 0.8, C.coral);
      paintText(ctx, 'right', 14.3, 4.75, 'STARS AT WORK', 0.34, C.white, 'Rethink Sans');
    });
    R.decor(chart('left', 4.4, 2.6, 2.6, 2.0, 3, C.teal));
    R.decor(chart('left', 12.6, 2.4, 2.6, 2.2, 8, C.purple));
    R.decor(chart('right', 14.0, 1.6, 1.6, 2.2, 5, C.coral));
    R.decor((ctx) => {
      windowR(ctx, 10.2, 2.0, 2.8, 2.6, C.night, C.greyLight);
      const [X, Y] = P(12.1, 0.01, 4.1);
      ctx.beginPath(); ctx.arc(X, Y, 0.38, 0, Math.PI * 2); paint(ctx, C.butter, { lw: 0.04 });
      ctx.beginPath(); ctx.arc(X - 0.1, Y + 0.05, 0.08, 0, Math.PI * 2); ctx.fillStyle = C.mustard; ctx.fill();
    });

    // Twinkling stars on the walls.
    R.decor((ctx, t) => {
      if (!Q.detail) return;
      for (let i = 0; i < 18; i++) {
        const left = i % 2 === 0;
        const u = 3 + hash(i, 4) * 12.5, z = 3.2 + hash(i, 5) * 2.5;
        const [X, Y] = left ? P(0, u, z) : P(u, 0, z);
        const k = 0.5 + 0.5 * Math.sin(t * (1.5 + hash(i, 6) * 2) + i);
        sparkle(ctx, X, Y, 0.06 + k * 0.16, i % 3 ? C.white : C.butter);
      }
    }, { anim: true });

    // Planetarium spots swept slowly across both walls.
    R.decor((ctx, t) => {
      if (!Q.detail) return;
      for (let i = 0; i < 44; i++) {
        const th = hash(i, 11) * Math.PI * 2 + t * 0.07;
        const el = 0.04 + hash(i, 12) * 0.22;
        const c = Math.cos(th), s = Math.sin(th);
        const sL = c < 0 ? -PROJ[0] / c : Infinity;
        const sR = s < 0 ? -PROJ[1] / s : Infinity;
        const sHit = Math.min(sL, sR);
        if (!isFinite(sHit)) continue;
        const z = PROJ[2] + 0.6 + sHit * el;
        if (z > 5.8 || z < 0.4) continue;
        const x = PROJ[0] + c * sHit, y = PROJ[1] + s * sHit;
        if (x < -0.01 || y < -0.01 || x > 16 || y > 16) continue;
        const [X, Y] = P(Math.max(0, x), Math.max(0, y), z);
        ctx.beginPath();
        ctx.ellipse(X, Y, 0.11, 0.16, sL < sR ? -0.45 : 0.45, 0, Math.PI * 2);
        ctx.fillStyle = alpha(i % 4 ? C.lilac : C.mint, 0.85);
        ctx.fill();
      }
    }, { anim: true });

    // Shooting stars across the back walls.
    R.decor((ctx, t) => {
      const { s, left, u0, z0 } = shotInfo(t);
      if (s > 1.0) return;
      const k = s / 0.9;
      const at = (q) => {
        const u = u0 + q * 5, z = z0 - q * 1.6;
        return left ? P(0, u, z) : P(u, 0, z);
      };
      ctx.lineCap = 'round';
      for (let j = 0; j < 8; j++) {
        const q0 = clamp(k - (j + 1) * 0.06), q1 = clamp(k - j * 0.06);
        const A = at(q0), B = at(q1);
        ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]);
        ctx.strokeStyle = alpha(C.butter, (1 - j / 8) * (1 - clamp((k - 0.85) / 0.2)));
        ctx.lineWidth = 0.16 - j * 0.015;
        ctx.stroke();
      }
      if (k < 1) {
        const [X, Y] = at(k);
        sparkle(ctx, X, Y, 0.35, C.white);
      }
    }, { anim: true });

    // The dome, the telescope, the crank wheel and the forgotten cocoa.
    R.thing(DX + 1, DY + 1, (ctx, t) => drawDome(ctx, t), { anim: true });
    R.find({ id: 'cocoa', label: 'A mug of cocoa', at: [8.7, 5.0, DH + 0.2], r: 0.7 });

    // The astronomer: climbs the ladder, cranks the dome round, has a eureka, climbs down.
    const LB = [9.0, 9.0], LT = [8.18, 8.18, 2.4];
    R.mover((t) => {
      const s = pulse(t, CYC) * CYC;
      let k = 0, pose = 'stand', back = true, say = null;
      if (s < 2.5) { k = (s / 2.5) * 0.5; pose = 'walk'; }
      else if (s < 3.5) { k = 0.5; }
      else if (s < 9.5) { k = 0.5; pose = 'drum'; }
      else if (s < 11) { k = 0.5; pose = 'cheer'; back = false; say = 'EUREKA!'; }
      else if (s < 13.5) { k = 0.5 * (1 - (s - 11) / 2.5); pose = 'walk'; }
      else { k = 0; pose = 'read'; back = false; }
      return { x: LB[0] + (LT[0] - LB[0]) * k + 0.25, y: LB[1] + (LT[1] - LB[1]) * k + 0.25, z: LT[2] * k, pose, back, say };
    }, (ctx, t, p) => {
      // ladder
      const pp = [0.24, -0.24];
      for (const sg of [-1, 1]) {
        face(ctx, [[LB[0] + pp[0] * sg, LB[1] + pp[1] * sg, 0], [LT[0] + pp[0] * sg, LT[1] + pp[1] * sg, LT[2] + 0.3]], null, { lw: 0.16, stroke: C.ink });
        face(ctx, [[LB[0] + pp[0] * sg, LB[1] + pp[1] * sg, 0], [LT[0] + pp[0] * sg, LT[1] + pp[1] * sg, LT[2] + 0.3]], null, { lw: 0.09, stroke: C.wood });
      }
      for (let i = 1; i < 6; i++) {
        const k = i / 6;
        const x = LB[0] + (LT[0] - LB[0]) * k, y = LB[1] + (LT[1] - LB[1]) * k, z = LT[2] * k;
        face(ctx, [[x + pp[0], y + pp[1], z], [x - pp[0], y - pp[1], z]], null, { lw: 0.07, stroke: C.woodLight });
      }
      person(ctx, p.x, p.y, p.z, {
        skin: '#95603F', hair: C.white, style: 'curly', top: C.white, bottom: C.navy, pose: p.pose, back: p.back,
        dir: 'l', speed: p.pose === 'drum' ? 9 : 5,
        hold: p.pose === 'read' ? (c) => { c.beginPath(); c.rect(-0.05, -0.25, 0.32, 0.4); paint(c, C.butter, { lw: 0.03 }); } : undefined,
      }, t);
      if (p.say && Q.detail) speech(ctx, p.x, p.y, p.z + 2.6, p.say, { size: 0.5, fill: C.butter });
    }, { bias: 0.4 });

    // Planetarium projector: a starry ball on a stand, turning slowly.
    R.thing(PROJ[0] + 0.3, PROJ[1] + 0.3, (ctx, t) => {
      box(ctx, PROJ[0] - 0.4, PROJ[1] - 0.4, 0, 0.8, 0.8, 0.25, C.ink, { flat: true });
      cylinder(ctx, PROJ[0], PROJ[1], 0.25, 0.14, PROJ[2] - 0.5, C.grey);
      const [X, Y] = P(PROJ[0], PROJ[1], PROJ[2] + 0.2);
      ctx.beginPath(); ctx.arc(X, Y, 0.62, 0, Math.PI * 2);
      paint(ctx, C.night, { dots: C.navy, density: 0.4 });
      for (let i = 0; i < 14; i++) {
        const a = hash(i, 21) * Math.PI * 2 + t * 0.07 * 2;
        const b = (hash(i, 22) - 0.5) * 2.4;
        const cx = Math.cos(a) * Math.cos(b), cy = Math.sin(b);
        if (Math.sin(a) < 0) continue;
        ctx.beginPath();
        ctx.arc(X + cx * 0.5, Y + cy * 0.45, 0.05, 0, Math.PI * 2);
        ctx.fillStyle = C.butter;
        ctx.fill();
      }
      ctx.beginPath(); ctx.ellipse(X - 0.2, Y - 0.25, 0.16, 0.09, -0.6, 0, Math.PI * 2);
      ctx.fillStyle = alpha(C.white, 0.5); ctx.fill();
    }, { anim: true });

    // Recliners: one stargazer, one sound asleep under the stars.
    R.thing(4.2, 10.2, (ctx, t) => {
      recliner(ctx, 1.6, 9.2, C.purple);
      person(ctx, 3.0, 9.7, 0.62, folk(61, { pose: 'sleep', dir: 'l', top: C.teal }), t);
    }, { anim: true });
    R.thing(3.7, 15.2, (ctx, t) => {
      recliner(ctx, 1.1, 14.2, C.coral);
      person(ctx, 2.5, 14.7, 0.62, folk(62, { pose: 'lie', dir: 'l', top: C.mustard, arms: [Math.PI - 0.4 + Math.sin(t * 2) * 0.2, 0.3] }), t);
    }, { anim: true });

    // Bookshelf of star atlases, globes and brass bits.
    R.thing(1.1, 12.6, (ctx) => {
      box(ctx, 0, 10.6, 0, 1.0, 2.2, 3.2, C.brown, { top: C.wood });
      const r = rng(5);
      for (let s = 0; s < 3; s++) {
        const z = 0.25 + s * 1.0;
        box(ctx, 0.05, 10.65, z, 0.95, 2.1, 0.08, C.wood, { flat: true });
        let yy = 10.75;
        while (yy < 12.6) {
          if (r() < 0.18) {
            const [X, Y] = P(0.55, yy + 0.25, z + 0.38);
            ctx.beginPath(); ctx.arc(X, Y, 0.28, 0, Math.PI * 2);
            paint(ctx, C.teal, { dots: C.green, density: 0.4, lw: 0.03 });
            yy += 0.6;
          } else {
            const bw = 0.13 + r() * 0.12;
            box(ctx, 0.2, yy, z + 0.08, 0.7, bw, 0.5 + r() * 0.3, [C.coral, C.navy, C.mustard, C.teal, C.lilac, C.red][Math.floor(r() * 6)], { flat: true, lw: 0.025 });
            yy += bw + 0.02;
          }
        }
      }
    });

    // Docent at the constellation chart.
    R.mover(() => ({ x: 1.8, y: 13.6 }), (ctx, t, p) => {
      const talk = pulse(t, 11, 2) > 0.6;
      person(ctx, p.x, p.y, 0, folk(71, { pose: talk ? 'point' : 'stand', dir: 'l', hat: 'none', top: C.red, style: 'bun' }), t);
      if (talk && Q.detail) speech(ctx, 1.4, 13.4, 2.7, "THAT'S ORION", { size: 0.42 });
    });

    // The small telescope by the window, currently hogged by a goose on a stool.
    R.thing(12.6, 4.2, (ctx) => {
      const top = [12.3, 3.2, 1.3];
      for (const [fx, fy] of [[11.7, 3.7], [12.9, 3.6], [12.3, 2.6]]) {
        face(ctx, [[fx, fy, 0], top], null, { lw: 0.1, stroke: C.ink });
      }
      const [ax, ay] = P(12.36, 3.78, 1.46), [bx, by] = P(12.2, 2.3, 2.3);
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.34; ctx.stroke();
      ctx.strokeStyle = C.mustard; ctx.lineWidth = 0.24; ctx.stroke();
      box(ctx, 12.05, 4.05, 0, 0.6, 0.6, 0.5, C.wood);
    });
    R.goose((t) => {
      const s = pulse(t, 9);
      return { x: 12.35, y: 4.35, z: 0.5, dir: 'r', pose: s > 0.24 && s < 0.36 ? 'honk' : 'stand' };
    }, { bias: 0.2 });

    // The queue of kids waiting a turn.
    const kids = [[12.45, 5.6], [12.2, 6.8], [12.5, 8.0], [12.25, 9.2]];
    kids.forEach(([x, y], i) => {
      R.mover(() => ({ x, y }), (ctx, t, p) => {
        const s = pulse(t, 9);
        let pose = 'stand';
        if (i === 0) pose = s < 0.22 ? 'point' : 'stand';
        if (i === 1) pose = Math.sin(t * 0.8) > 0.6 ? 'wave' : 'stand';
        if (i === 3) pose = 'sit';
        person(ctx, p.x, p.y, 0, folk(80 + i, { pose, dir: i === 3 ? 'l' : 'r', back: i !== 3, scale: 0.68, hat: i === 2 ? 'beanie' : undefined }), t);
        if (i === 0 && s < 0.22 && Q.detail) speech(ctx, x, y, 2.0, 'MY TURN?', { size: 0.4 });
      });
    });
    R.air((ctx, t) => {
      const s = pulse(t, 9);
      if (s > 0.24 && s < 0.36 && Q.detail) speech(ctx, 12.1, 4.1, 1.9, 'HONK', { size: 0.42, fill: C.butter });
    });
    // Their teacher, counting heads.
    R.mover(() => ({ x: 13.8, y: 8.7 }), (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, folk(90, { pose: Math.sin(t * 0.7) > 0 ? 'point' : 'stand', dir: 'l', top: C.green, style: 'short', hat: 'none' }), t);
    });

    // Orrery on a table, planets going round, Saturn without its ring.
    const OX = 9.9, OY = 12.8;
    R.thing(OX + 1.2, OY + 1.2, (ctx) => {
      box(ctx, OX - 1.2, OY - 1.2, 0, 2.4, 2.4, 1.05, C.brown, { top: C.wood });
      box(ctx, OX - 1.25, OY - 1.25, 1.05, 2.5, 2.5, 0.12, C.wood);
    });
    R.thing(OX + 1.3, OY + 1.3, (ctx, t) => {
      const zb = 1.17;
      disc(ctx, OX, OY, zb + 0.01, 1.05, C.navy, { dots: C.ink, density: 0.2, lw: 0.03 });
      cylinder(ctx, OX, OY, zb, 0.2, 0.25, C.mustard);
      const planets = [[0.35, 3, C.grey, 0.07], [0.55, 5, C.butter, 0.09], [0.75, 8, C.teal, 0.1], [0.92, 12, C.coral, 0.085], [1.05, 19, C.butter, 0.13]];
      const pz = zb + 0.8;
      const list = planets.map(([r, per, col, sz], i) => {
        const a = (t / per) * Math.PI * 2 + i * 1.3;
        return { x: OX + Math.cos(a) * r, y: OY + Math.sin(a) * r, col, sz, i };
      });
      list.push({ x: OX, y: OY, sun: true });
      list.sort((A, B) => A.x + A.y - (B.x + B.y));
      const sunZ = pz + 0.2;
      for (const pl of list) {
        if (pl.sun) {
          face(ctx, [[OX, OY, zb + 0.25], [OX, OY, sunZ]], null, { lw: 0.06, stroke: C.mustard });
          const [X, Y] = P(OX, OY, sunZ);
          ctx.beginPath(); ctx.arc(X, Y, 0.28, 0, Math.PI * 2);
          paint(ctx, C.mustard, { dots: C.coral, density: 0.3, lw: 0.04 });
          continue;
        }
        face(ctx, [[OX, OY, zb + 0.3], [pl.x, pl.y, pz - 0.2]], null, { lw: 0.03, stroke: C.mustard });
        face(ctx, [[pl.x, pl.y, pz - 0.2], [pl.x, pl.y, pz]], null, { lw: 0.03, stroke: C.mustard });
        const [X, Y] = P(pl.x, pl.y, pz);
        ctx.beginPath(); ctx.arc(X, Y, pl.sz, 0, Math.PI * 2);
        paint(ctx, pl.col, { lw: 0.025 });
      }
    }, { anim: true });
    // Kid winding the orrery.
    R.mover(() => ({ x: OX + 1.9, y: OY - 0.2 }), (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, folk(95, { pose: 'drum', dir: 'l', back: true, scale: 0.7, speed: 4, top: C.pink }), t);
    });
    // Saturn's ring, rolled away on the floor.
    R.rug((ctx) => {
      const [X, Y] = P(12.6, 15.0, 0.02);
      ctx.beginPath();
      ctx.ellipse(X, Y, 0.5, 0.22, 0, 0, Math.PI * 2);
      ctx.ellipse(X, Y, 0.3, 0.12, 0, 0, Math.PI * 2);
      paint(ctx, C.mustard, { lw: 0.035, dots: C.coral, density: 0.2 });
      ctx.fillStyle = C.mustard;
    });
    R.find({ id: 'ring', label: "Saturn's missing ring", at: [12.6, 15.0, 0.05], r: 0.7 });

    // Running gag: Gary points at the shooting star just after it's gone.
    R.mover(() => ({ x: 14.6, y: 12.0 }), (ctx, t, p) => {
      const { s, left } = shotInfo(t);
      const look = s > 1.1 && s < 3.0;
      person(ctx, p.x, p.y, 0, folk(101, {
        pose: look ? 'point' : 'stand', dir: look ? (left ? 'l' : 'r') : 'l', back: look,
        top: C.mustard, hat: 'beanie', style: 'short',
        hold: look ? undefined : (c) => { c.beginPath(); c.rect(-0.05, -0.05, 0.3, 0.16); c.rect(0.1, 0.05, 0.12, 0.16); paint(c, C.ink, { lw: 0.02 }); },
      }), t);
      if (look && Q.detail) speech(ctx, p.x, p.y, 2.7, 'LOOK!!', { size: 0.52, fill: C.butter });
    });
    R.mover(() => ({ x: 15.0, y: 13.4 }), (ctx, t, p) => {
      const { s, left } = shotInfo(t);
      const turn = s > 1.6 && s < 3.6;
      person(ctx, p.x, p.y, 0, folk(102, { pose: 'stand', dir: turn ? (left ? 'l' : 'r') : 'l', back: turn, top: C.teal, style: 'long' }), t);
      if (s > 2.3 && s < 3.8 && Q.detail) speech(ctx, p.x, p.y, 2.7, 'WHERE?', { size: 0.44 });
    });

    // Velvet rope for the queue, and a sign.
    R.thing(11.4, 10.2, (ctx) => {
      const posts = [[11.4, 4.8], [11.4, 7.4], [11.4, 10.0]];
      for (let i = 0; i < posts.length - 1; i++) {
        const [a, b] = posts[i], [c, d] = posts[i + 1];
        ctx.beginPath();
        for (let k = 0; k <= 10; k++) {
          const q = k / 10;
          const [X, Y] = P(a + (c - a) * q, b + (d - b) * q, 0.95 - Math.sin(q * Math.PI) * 0.3);
          k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
        }
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.14; ctx.stroke();
        ctx.strokeStyle = C.red; ctx.lineWidth = 0.08; ctx.stroke();
      }
      for (const [x, y] of posts) {
        disc(ctx, x, y, 0.01, 0.22, C.mustard, { lw: 0.03 });
        face(ctx, [[x, y, 0], [x, y, 1.0]], null, { lw: 0.08, stroke: C.mustard });
        const [X, Y] = P(x, y, 1.05);
        ctx.beginPath(); ctx.arc(X, Y, 0.09, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.03 });
      }
    });
    R.thing(11.0, 11.0, (ctx) => {
      face(ctx, [[10.9, 10.9, 0], [10.9, 10.9, 1.4]], null, { lw: 0.08 });
      face(ctx, [[10.9, 10.3, 1.2], [10.9, 11.5, 1.2], [10.9, 11.5, 2.1], [10.9, 10.3, 2.1]], C.white, { lw: 0.04 });
      label(ctx, 10.9, 10.9, 1.8, 'WAIT', 0.3, C.coral);
      label(ctx, 10.9, 10.9, 1.48, 'HERE', 0.3, C.coral);
    });

    // Planet balloons for sale, bobbing on their strings.
    R.mover(() => ({ x: 15.0, y: 5.6 }), (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, folk(130, { pose: 'stand', dir: 'r', top: C.pink, hat: 'party', arms: [2.4, -0.2] }), t);
      const hand = [p.x + 0.3, p.y - 0.3, 2.3];
      const bal = [[C.coral, 0], [C.teal, 1], [C.mustard, 2], [C.lilac, 3]];
      for (const [col, i] of bal) {
        const bx = p.x - 0.5 + i * 0.3 + Math.sin(t * 1.3 + i) * 0.15;
        const by = p.y - 0.4 - i * 0.45;
        const bz = 4.0 + (i % 2) * 0.5 + Math.sin(t * 1.7 + i * 2) * 0.1;
        face(ctx, [hand, [bx, by, bz - 0.3]], null, { lw: 0.025 });
        const [X, Y] = P(bx, by, bz);
        ctx.beginPath(); ctx.arc(X, Y, 0.34, 0, Math.PI * 2);
        paint(ctx, col, { dots: shade(col, 0.35), density: 0.2, lw: 0.04 });
        if (i === 2) {
          ctx.beginPath(); ctx.ellipse(X, Y, 0.62, 0.14, -0.3, 0, Math.PI * 2);
          ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.stroke();
          ctx.strokeStyle = C.butter; ctx.lineWidth = 0.05; ctx.stroke();
        }
      }
    });

    // Radio astronomer at the computer, printout piling up on the floor.
    R.thing(9.9, 1.3, (ctx, t) => {
      box(ctx, 7.2, 0.1, 0, 2.6, 1.1, 1.1, C.teal, { top: tint(C.teal, 0.3) });
      box(ctx, 7.6, 0.2, 1.1, 1.2, 0.5, 0.9, C.greyLight);
      face(ctx, [[7.7, 0.71, 1.2], [8.7, 0.71, 1.2], [8.7, 0.71, 1.9], [7.7, 0.71, 1.9]], C.night, { lw: 0.03 });
      ctx.beginPath();
      for (let i = 0; i <= 20; i++) {
        const q = i / 20;
        const z = 1.55 + Math.sin(q * 18 + t * 4) * 0.12 * Math.sin(q * 3.1) + (Math.sin(t * 7 + q * 40) > 0.95 ? 0.15 : 0);
        const [X, Y] = P(7.8 + q * 0.8, 0.72, z);
        i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      }
      ctx.strokeStyle = C.mint; ctx.lineWidth = 0.04; ctx.stroke();
      box(ctx, 9.0, 0.3, 1.1, 0.6, 0.5, 0.35, C.white);
      // printout curling to the floor
      const pts = [[9.3, 0.8, 1.3], [9.35, 1.3, 1.05], [9.4, 1.5, 0.4], [9.5, 1.9, 0.02], [9.6, 2.9, 0.02]];
      for (let i = 0; i < pts.length - 1; i++) {
        const [a, b] = [pts[i], pts[i + 1]];
        face(ctx, [[a[0] - 0.2, a[1], a[2]], [a[0] + 0.2, a[1], a[2]], [b[0] + 0.2, b[1], b[2]], [b[0] - 0.2, b[1], b[2]]], C.white, { lw: 0.025 });
      }
      chair(ctx, 8.0, 1.6, 0, C.coral, 'l');
      person(ctx, 8.4, 1.95, 0.05, folk(140, { pose: 'sit', dir: 'r', back: true, top: C.lilac, style: 'pony' }), t);
    }, { anim: true });

    // Night guard doing rounds with a torch.
    const guard = route([[5.6, 15.3, 1.5], [11.9, 15.4], [12.0, 10.6, 1.5]], { speed: 0.9, loop: false });
    R.mover(guard, (ctx, t, p) => {
      const f = p.dir === 'r' ? 1 : -1;
      const [X, Y] = P(p.x, p.y, 1.3);
      if (Q.detail) {
        ctx.beginPath();
        ctx.moveTo(X + f * 0.3, Y);
        ctx.lineTo(X + f * 2.6, Y + 0.9);
        ctx.lineTo(X + f * 2.4, Y + 1.8);
        ctx.closePath();
        ctx.fillStyle = alpha(C.butter, 0.35);
        ctx.fill();
      }
      person(ctx, p.x, p.y, 0, folk(110, { pose: p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back, top: C.navy, bottom: C.ink, hat: 'cap', arms: p.moving ? undefined : [1.3, -0.1] }), t);
    });

    // A kid zooming a toy rocket round the front of the dome.
    const zoomer = route([[3.0, 9.4], [7.0, 10.6], [10.6, 9.6], [10.6, 5.6]], { speed: 2.4, loop: false });
    R.mover(zoomer, (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, folk(120, {
        pose: 'run', dir: p.dir, back: p.back, scale: 0.66, top: C.lilac, speed: 11, arms: [Math.PI - 0.4, 0.4],
        hold: (c) => {
          c.save(); c.translate(-0.1, -0.95); c.rotate(0.6);
          c.beginPath(); c.moveTo(0, -0.35); c.lineTo(0.12, -0.1); c.lineTo(0.12, 0.22); c.lineTo(-0.12, 0.22); c.lineTo(-0.12, -0.1); c.closePath();
          paint(c, C.white, { lw: 0.03 });
          c.beginPath(); c.moveTo(-0.08, 0.24); c.lineTo(0, 0.45 + Math.sin(t * 30) * 0.06); c.lineTo(0.08, 0.24); c.fillStyle = C.coral; c.fill();
          c.restore();
        },
      }), t);
    });

    // A tiny alien, peeking over the top of the back wall.
    const alienZ = (t) => 6.3 + Math.max(0, Math.sin(t * 0.9)) * 0.25;
    R.decor((ctx, t) => {
      const x = 5.2;
      const z = alienZ(t);
      const [X, Y] = P(x, -0.3, z);
      ctx.save();
      const [ex, ey] = P(x, -0.45, 6);
      ctx.beginPath();
      ctx.rect(ex - 2, ey - 3, 4, 3 + 0.08);
      ctx.clip();
      // antennae
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.04;
      ctx.beginPath(); ctx.moveTo(X - 0.1, Y - 0.25); ctx.lineTo(X - 0.2, Y - 0.55); ctx.moveTo(X + 0.1, Y - 0.25); ctx.lineTo(X + 0.22, Y - 0.52); ctx.stroke();
      ctx.beginPath(); ctx.arc(X - 0.2, Y - 0.57, 0.06, 0, Math.PI * 2); ctx.arc(X + 0.22, Y - 0.55, 0.06, 0, Math.PI * 2);
      ctx.fillStyle = C.coral; ctx.fill();
      ctx.beginPath(); ctx.ellipse(X, Y, 0.3, 0.3, 0, 0, Math.PI * 2);
      paint(ctx, C.leaf, { lw: 0.04 });
      const look = Math.sin(t * 0.6) * 0.05;
      ctx.fillStyle = C.white;
      ctx.beginPath(); ctx.arc(X - 0.1, Y - 0.02, 0.09, 0, Math.PI * 2); ctx.arc(X + 0.11, Y - 0.02, 0.09, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.ink;
      ctx.beginPath(); ctx.arc(X - 0.1 + look, Y, 0.045, 0, Math.PI * 2); ctx.arc(X + 0.11 + look, Y, 0.045, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // little fingers gripping the wall cap
      ctx.fillStyle = C.leaf;
      for (const dx of [-0.35, 0.35]) {
        const [fx, fy] = P(x + dx, -0.2, 6);
        ctx.beginPath(); ctx.arc(fx, fy, 0.09, 0, Math.PI * 2); paint(ctx, C.leaf, { lw: 0.03 });
      }
    }, { anim: true });
    R.find({ id: 'alien', label: 'A tiny alien', at: (t) => [5.2, -0.3, alienZ(t)], r: 0.7 });
  },
};
