// Observatory: a big silver dome that turns when the astronomer cranks it,
// a planetarium projector spraying stars on the walls, a queue of kids
// waiting for the little telescope, and someone who keeps spotting shooting
// stars one second too late.
//
// Retuned in session 10: the goose has shut itself in the dome with the big
// telescope (poke: a feather in the door's seal; tap the door). Saturn's ring
// is in one of the orrery's two drawers (poke), the cocoa on the ledge (spot),
// the tiny alien bobs up at the window now and then (hard). Cygnus on the
// star chart is the decoy, and the projector is the room's first thing to tap.
import {
  C, box, rect, disc, cylinder, face, poly, paint, person, folk, slab, planks,
  frame, chair, onLeft, onRight, windowR, paintText, label, speech, shade, tint, mix, alpha, Q, P, hash, rng, SKIN,
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

function drawDome(ctx, t, door = 0) {
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
  domeDoor(ctx, door);
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

// The dome's door: shut, with a white feather caught in its seal (k 0), or
// swung out on its hinge (the left edge) onto the dark inside (k 1).
const DOOR_A = [1.72, 2.12];
function domeDoor(ctx, k) {
  if (k < 0.02) {
    cylBand(ctx, DOOR_A[0], DOOR_A[1], 0, 1.95, C.coral, { dots: shade(C.coral, 0.4), density: 0.2 });
    cylBand(ctx, 1.8, 2.04, 1.3, 1.75, C.butter, { lw: 0.03 });
    const [kx, ky] = P(...cyl(1.79, 1.0, DR + 0.02));
    ctx.beginPath(); ctx.arc(kx, ky, 0.07, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
    // somebody in there is moulting
    const [fx, fy] = P(...cyl(1.735, 0.42, DR + 0.03));
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(-0.5);
    ctx.beginPath();
    ctx.moveTo(0, 0.12); ctx.quadraticCurveTo(0.2, -0.05, 0.08, -0.32); ctx.quadraticCurveTo(-0.08, -0.08, 0, 0.12);
    paint(ctx, C.white, { lw: 0.03 });
    ctx.beginPath(); ctx.moveTo(0, 0.14); ctx.lineTo(0.07, -0.25);
    ctx.strokeStyle = C.greyLight; ctx.lineWidth = 0.02; ctx.stroke();
    ctx.restore();
    return;
  }
  // the doorway: dark inside, the big telescope's pier in the gloom
  cylBand(ctx, DOOR_A[0], DOOR_A[1], 0, 1.95, C.night, { lw: 0.04 });
  cylBand(ctx, 1.86, 1.98, 0, 1.6, shade(C.grey, 0.45), { stroke: false });
  // the door, swung out on its hinge
  const H = cyl(DOOR_A[1], 0), E = cyl(DOOR_A[0], 0);
  const w = Math.hypot(E[0] - H[0], E[1] - H[1]);
  const shut = [(E[0] - H[0]) / w, (E[1] - H[1]) / w];
  const out = [Math.cos(DOOR_A[1]), Math.sin(DOOR_A[1])];
  const th = k * 1.1, c = Math.cos(th), s = Math.sin(th);
  const d = [shut[0] * c + out[0] * s, shut[1] * c + out[1] * s];
  const at = (u, z) => [H[0] + d[0] * w * u, H[1] + d[1] * w * u, z];
  face(ctx, [at(0, 0), at(1, 0), at(1, 1.95), at(0, 1.95)], C.coral, { dots: shade(C.coral, 0.4), density: 0.2 });
  face(ctx, [at(0.2, 1.3), at(0.8, 1.3), at(0.8, 1.75), at(0.2, 1.75)], C.butter, { lw: 0.03 });
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

// Draw in the plane of the left wall (x = 0): u runs along y, v up.
function onLeftWall(ctx, y, z, fn) {
  const [X, Y] = P(0, y, z);
  ctx.save();
  ctx.transform(-1, 0.5, 0, -ZK, X, Y);
  fn(ctx);
  ctx.restore();
}

// Cygnus, the swan, the way old star atlases draw it: a white bird the size
// of the goose painted over its stars, which twinkle. (A decoy.)
const CYG = { y: 4.4, z: 2.6, w: 2.6, h: 2.0 };
const CYG_STARS = [[1.75, 0.55], [1.25, 0.72], [0.85, 0.95], [0.62, 1.32], [0.48, 1.5], [1.55, 1.0], [1.05, 0.42], [2.0, 0.82]];
function cygnus(ctx, t) {
  const { y, z, w, h } = CYG;
  onLeft(ctx, y - 0.12, z - 0.12, w + 0.24, h + 0.24, C.ink);
  onLeft(ctx, y, z, w, h, C.night, { dots: C.navy, density: 0.35 });
  onLeftWall(ctx, y, z, (g) => {
    // the swan: body, long neck, head and beak, facing along the wall
    g.beginPath();
    g.moveTo(2.15, 0.85);
    g.quadraticCurveTo(2.0, 0.45, 1.45, 0.38);
    g.quadraticCurveTo(0.95, 0.35, 0.82, 0.62);
    g.quadraticCurveTo(0.72, 0.85, 0.66, 1.15);
    g.quadraticCurveTo(0.6, 1.42, 0.46, 1.52);
    g.quadraticCurveTo(0.36, 1.62, 0.5, 1.7);
    g.quadraticCurveTo(0.66, 1.74, 0.76, 1.56);
    g.quadraticCurveTo(0.9, 1.25, 1.02, 0.98);
    g.quadraticCurveTo(1.5, 1.08, 1.9, 1.0);
    g.closePath();
    paint(g, C.white, { lw: 0.04, dots: C.greyLight, density: 0.25 });
    // a wing line
    g.beginPath(); g.moveTo(1.15, 0.72); g.quadraticCurveTo(1.55, 0.8, 1.95, 0.9);
    g.strokeStyle = alpha(C.ink, 0.6); g.lineWidth = 0.03; g.stroke();
    // beak and eye
    g.beginPath(); g.moveTo(0.42, 1.6); g.lineTo(0.2, 1.54); g.lineTo(0.42, 1.52); g.closePath();
    paint(g, C.coral, { lw: 0.025 });
    g.beginPath(); g.arc(0.55, 1.63, 0.03, 0, Math.PI * 2); g.fillStyle = C.ink; g.fill();
    // the constellation, joined up over it
    g.beginPath();
    for (const i of [0, 1, 2, 3, 4]) { const [u, v] = CYG_STARS[i]; i ? g.lineTo(u, v) : g.moveTo(u, v); }
    g.moveTo(...CYG_STARS[6]); g.lineTo(...CYG_STARS[1]); g.lineTo(...CYG_STARS[5]);
    g.strokeStyle = alpha(C.mustard, 0.8); g.lineWidth = 0.025; g.stroke();
  });
  // its stars, twinkling (drawn in screen space so they stay round)
  CYG_STARS.forEach(([u, v], i) => {
    const [X, Y] = P(0.01, y + u, z + v);
    const k = 0.5 + 0.5 * Math.sin(t * (2 + i * 0.37) + i * 1.9);
    sparkle(ctx, X, Y, 0.07 + k * 0.1, i % 3 ? C.butter : C.white);
  });
  paintText(ctx, 'left', y + w / 2, z + 0.2, 'CYGNUS', 0.24, C.butter, 'Rethink Sans');
}

// A tiny alien out in the night, bobbing up at the bottom of the window's
// left pane to watch the stargazers, then ducking again. s: 0 gone, 1 up.
const ALIEN = { x: 10.8, z: 2.0, period: 13 };
const alienUp = (t) => {
  const s = ((t + 4) % ALIEN.period);
  return s < 2 ? 0 : s < 2.6 ? ease((s - 2) / 0.6) : s < 7.4 ? 1 : s < 8 ? 1 - ease((s - 7.4) / 0.6) : 0;
};
function alien(ctx, t) {
  const k = alienUp(t);
  if (k <= 0) return;
  // only inside the pane: it's out there, not in here
  ctx.save();
  const A = P(10.2, 0.01, 2.0), B = P(11.6, 0.01, 2.0), D = P(11.6, 0.01, 3.3), E = P(10.2, 0.01, 3.3);
  ctx.beginPath(); ctx.moveTo(...A); ctx.lineTo(...B); ctx.lineTo(...D); ctx.lineTo(...E); ctx.closePath();
  ctx.clip();
  const sway = Math.sin(t * 0.8) * 0.12;
  const [X, Y] = P(ALIEN.x + sway, 0.01, ALIEN.z - 0.3 + k * 0.55);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.035;
  ctx.beginPath(); ctx.moveTo(X - 0.08, Y - 0.18); ctx.lineTo(X - 0.15, Y - 0.38); ctx.moveTo(X + 0.08, Y - 0.18); ctx.lineTo(X + 0.16, Y - 0.36); ctx.stroke();
  ctx.beginPath(); ctx.arc(X - 0.15, Y - 0.4, 0.045, 0, Math.PI * 2); ctx.arc(X + 0.16, Y - 0.38, 0.045, 0, Math.PI * 2);
  ctx.fillStyle = C.coral; ctx.fill();
  ctx.beginPath(); ctx.ellipse(X, Y, 0.21, 0.22, 0, 0, Math.PI * 2);
  paint(ctx, C.leaf, { lw: 0.035 });
  const look = Math.sin(t * 0.6) * 0.035;
  ctx.fillStyle = C.white;
  ctx.beginPath(); ctx.arc(X - 0.075, Y - 0.02, 0.065, 0, Math.PI * 2); ctx.arc(X + 0.08, Y - 0.02, 0.065, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.ink;
  ctx.beginPath(); ctx.arc(X - 0.075 + look, Y - 0.01, 0.032, 0, Math.PI * 2); ctx.arc(X + 0.08 + look, Y - 0.01, 0.032, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // little fingers on the sill
  if (k > 0.6) {
    for (const dx of [-0.22, 0.22]) {
      const [fx, fy] = P(ALIEN.x + sway + dx, 0.02, ALIEN.z + 0.02);
      ctx.beginPath(); ctx.arc(fx, fy, 0.06, 0, Math.PI * 2); paint(ctx, C.leaf, { lw: 0.025 });
    }
  }
}

const PROJ = [4.4, 12.2, 1.55];
// The Great Bear's seven stars, as the show throws them on the left wall (y, z).
const BEAR = [[10.3, 4.5], [9.6, 4.3], [8.9, 4.0], [8.2, 3.7], [7.7, 2.9], [8.7, 2.6], [9.1, 3.3]];

// The orrery's table, and the two drawers in its front (the face toward you).
const OX = 9.9, OY = 12.8;
const DRAW = [{ x: OX - 0.95 }, { x: OX + 0.05 }];
function ringShape(ctx, X, Y, s = 1) {
  ctx.beginPath();
  ctx.ellipse(X, Y, 0.42 * s, 0.17 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(X, Y, 0.26 * s, 0.09 * s, 0, 0, Math.PI * 2);
  paint(ctx, C.mustard, { lw: 0.035, dots: C.coral, density: 0.2 });
}
// A drawer pulled out k of the way. 'ring': Saturn's ring is in it, so when
// shut it sits a little proud with a gold edge showing; 'moons': spare moons.
function drawer(ctx, x, y, k, what) {
  const out = (what === 'ring' ? 0.1 : 0) + k * 0.65;
  if (out > 0.05) {
    // the tray: its floor, contents, then its side and front
    face(ctx, [[x + 0.05, y, 0.48], [x + 0.85, y, 0.48], [x + 0.85, y + out, 0.48], [x + 0.05, y + out, 0.48]], shade(C.wood, 0.3), { lw: 0.02 });
    if (what === 'ring') {
      if (k > 0.3) ringShape(ctx, ...P(x + 0.45, y + out - 0.3, 0.6), 0.85);
    } else if (k > 0.3) {
      [[0.25, 0.25, C.greyLight], [0.5, 0.4, C.white], [0.7, 0.2, C.grey]].forEach(([u, v, c]) => {
        const [X, Y] = P(x + u, y + v * out, 0.6);
        ctx.beginPath(); ctx.arc(X, Y, 0.1, 0, Math.PI * 2); paint(ctx, c, { lw: 0.025 });
      });
    }
    box(ctx, x + 0.85, y, 0.42, 0.05, out, 0.32, C.wood, { lw: 0.02 });
  }
  box(ctx, x, y + out, 0.42, 0.9, 0.06, 0.46, C.woodLight, { lw: 0.03 });
  const [hx, hy] = P(x + 0.45, y + out + 0.07, 0.66);
  ctx.beginPath(); ctx.ellipse(hx, hy, 0.12, 0.05, 0, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.025 });
  if (what === 'ring' && k <= 0.3) {
    // shut, or nearly: the ring's gold edge sticks up over the drawer front
    const [X, Y] = P(x + 0.5, y + out, 0.9);
    ctx.beginPath(); ctx.ellipse(X, Y, 0.3, 0.09, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.stroke();
    ctx.strokeStyle = C.mustard; ctx.lineWidth = 0.06; ctx.stroke();
  }
}

// The sky by the hour: navy night, a blush dawn, day blue, the party's pink
// sunset, a purple dusk. Steps of a twentieth keep the color mixes few.
const SKY = [[0, C.night], [4.5, C.night], [6, C.blush], [8, C.sky], [17, C.sky], [19, C.pink], [20.5, C.purple], [21.5, C.night], [24, C.night]];
function skyAt(h) {
  for (let i = 1; i < SKY.length; i++) {
    const [h0, c0] = SKY[i - 1], [h1, c1] = SKY[i];
    if (h <= h1) return mix(c0, c1, Math.round(((h - h0) / (h1 - h0)) * 20) / 20);
  }
  return C.night;
}
// The window on the right wall, repainted with that sky: the sun by day, the
// moon and a star by night.
function skyWindow(ctx, h) {
  const x = 10.2, z = 2.0, w = 2.8, hh = 2.6;
  const sky = skyAt(h);
  onRight(ctx, x, z, w, hh, sky, { lw: 0.03 });
  const dark = h < 5.5 || h > 20.5;
  const [X, Y] = P(dark ? 12.1 : 11.0, 0.01, dark ? 4.1 : 3.2 + Math.sin(((h - 6) / 14) * Math.PI) * 1.1);
  ctx.beginPath(); ctx.arc(X, Y, dark ? 0.38 : 0.34, 0, Math.PI * 2);
  paint(ctx, dark ? C.butter : C.mustard, { lw: 0.04 });
  if (dark) {
    ctx.beginPath(); ctx.arc(X - 0.1, Y + 0.05, 0.08, 0, Math.PI * 2); ctx.fillStyle = C.mustard; ctx.fill();
    for (const [u, v] of [[10.7, 4.3], [11.3, 2.6], [12.7, 2.9]]) {
      const [sx, sy] = P(u, 0.01, v);
      ctx.beginPath(); ctx.arc(sx, sy, 0.05, 0, Math.PI * 2); ctx.fillStyle = C.white; ctx.fill();
    }
  }
  face(ctx, [[x + w / 2, 0, z], [x + w / 2, 0, z + hh]], null, { lw: 0.1, stroke: C.greyLight });
  face(ctx, [[x, 0, z + hh / 2], [x + w, 0, z + hh / 2]], null, { lw: 0.1, stroke: C.greyLight });
}

export default {
  id: 'observatory',
  name: 'Observatory',
  blurb: 'Every few seconds a star shoots across the wall and Gary misses it. Somebody has locked themselves in the dome with the big telescope and will not share.',

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
    R.walls({ h: 6, left: C.navy, right: C.night, cap: C.paper, dotsL: C.night, densL: 0.12 });
    R.wall((ctx) => {
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
    R.decor((ctx, t) => cygnus(ctx, t), { anim: true });
    R.decoy({ id: 'cygnus', at: [0.05, CYG.y + 1.2, CYG.z + 1.0], r: 0.9, say: ['Cygnus. A swan. In stars.', 'Still a constellation.', 'Ask again in a million years.'] });
    R.decor(chart('left', 12.6, 2.4, 2.6, 2.2, 8, C.purple));
    R.decor(chart('right', 14.0, 1.6, 1.6, 2.2, 5, C.coral));
    R.decor((ctx) => {
      windowR(ctx, 10.2, 2.0, 2.8, 2.6, C.night, C.greyLight);
      const [X, Y] = P(12.1, 0.01, 4.1);
      ctx.beginPath(); ctx.arc(X, Y, 0.38, 0, Math.PI * 2); paint(ctx, C.butter, { lw: 0.04 });
      ctx.beginPath(); ctx.arc(X - 0.1, Y + 0.05, 0.08, 0, Math.PI * 2); ctx.fillStyle = C.mustard; ctx.fill();
    });
    // The window shows the real sky outside.
    const day = R.opts.day;
    R.decor((ctx, t) => skyWindow(ctx, day.hour(t)), { anim: true });
    // ...and, now and then, who's out there watching (a hard find).
    R.decor((ctx, t) => alien(ctx, t), { anim: true });
    R.find({
      id: 'alien', label: 'A tiny alien', kind: 'hard', r: 0.6, when: (t) => alienUp(t) > 0.5, note: 'now and then',
      at: (t) => [ALIEN.x + Math.sin(t * 0.8) * 0.12, 0.05, ALIEN.z + 0.25],
      riddle: 'Someone out there is watching the watchers.',
      hint: 'Keep an eye on the window. Something out there keeps ducking.',
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

    // The planetarium projector is the room's first thing to tap: the show
    // starts, the stars on the walls sweep round and blaze, and the room
    // goes OOOOH.
    const show = R.poke({ id: 'projector', at: [PROJ[0], PROJ[1], PROJ[2] + 0.2], r: 1.0, teach: true, hold: 6, say: ['OOOOH.', 'AAAAH.', 'ENCORE!'] });

    // Planetarium spots swept slowly across both walls.
    R.decor((ctx, t) => {
      if (!Q.detail) return;
      const k = show.k();
      for (let i = 0; i < 44; i++) {
        const th = hash(i, 11) * Math.PI * 2 + t * 0.07 + k * 1.5;
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
        if (k > 0.3 && i % 2) { sparkle(ctx, X, Y, 0.18 + k * 0.22 + Math.sin(t * 6 + i) * 0.06, i % 4 === 1 ? C.butter : C.white); continue; }
        ctx.beginPath();
        ctx.ellipse(X, Y, 0.11 * (1 + k), 0.16 * (1 + k), sL < sR ? -0.45 : 0.45, 0, Math.PI * 2);
        ctx.fillStyle = alpha(i % 4 ? C.lilac : C.mint, 0.85);
        ctx.fill();
      }
    }, { anim: true });
    // The show itself: the Great Bear thrown big across the left wall, and a
    // shower of shooting stars over the right one, while it runs.
    R.decor((ctx, t) => {
      const k = show.k();
      if (k < 0.05) return;
      const pts = BEAR.map(([u, v]) => P(0.01, u, v));
      ctx.lineCap = 'round';
      ctx.beginPath();
      [0, 1, 2, 3, 4, 5, 6, 3].forEach((i, j) => (j ? ctx.lineTo(...pts[i]) : ctx.moveTo(...pts[i])));
      ctx.strokeStyle = alpha(C.butter, 0.7 * k); ctx.lineWidth = 0.07; ctx.stroke();
      pts.forEach(([X, Y], i) => sparkle(ctx, X, Y, (0.22 + 0.1 * Math.sin(t * 5 + i)) * k, i % 2 ? C.white : C.butter));
      paintText(ctx, 'left', 7.9, 2.3, 'THE GREAT BEAR', 0.28, alpha(C.butter, k), 'Rethink Sans');
      for (let j = 0; j < 3; j++) {
        const q = ((t * 0.9 + j / 3) % 1);
        const u0 = 3 + j * 4 + hash(Math.floor(t * 0.9 + j / 3), j) * 2, z0 = 5.6 - j * 0.3;
        const A = P(u0 + q * 3, 0.01, z0 - q * 1.2), B = P(u0 + q * 3 - 0.9, 0.01, z0 - q * 1.2 + 0.36);
        ctx.beginPath(); ctx.moveTo(...A); ctx.lineTo(...B);
        ctx.strokeStyle = alpha(C.butter, k * (1 - q)); ctx.lineWidth = 0.1; ctx.stroke();
        sparkle(ctx, A[0], A[1], 0.2 * k * (1 - q), C.white);
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
    // Tap the door and it swings open on the goose, who has had the big
    // telescope to itself all night.
    const door = R.poke({ id: 'dome', at: cyl(1.92, 1.0, DR + 0.1), r: 0.9, sound: 'clunk', say: 'HONK!' });
    R.thing(DX + 1, DY + 1, (ctx, t) => drawDome(ctx, t, door.k()), { anim: true });
    R.find({ id: 'cocoa', label: 'A mug of cocoa', at: [8.7, 5.0, DH + 0.2], r: 0.7 });
    const GZ = cyl(1.92, 0, DR + 0.05);
    R.goose((t) => {
      const k = door.k();
      const s = pulse(t, 7);
      return { x: GZ[0], y: GZ[1], z: 0, dir: 'r', hidden: k < 0.3, pose: k > 0.5 && s > 0.2 && s < 0.34 ? 'honk' : 'stand' };
    }, { bias: 0.5, kind: 'poke', inside: door, hint: 'Somebody is hogging the big telescope. Knock on the dome.' });
    R.air((ctx, t) => {
      const s = pulse(t, 7);
      if (door.k() > 0.5 && s > 0.2 && s < 0.34 && Q.detail) speech(ctx, GZ[0], GZ[1], 1.7, 'NOT SHARING', { size: 0.38, fill: C.butter });
    });

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
        skin: SKIN[3], hair: C.white, style: 'curly', top: C.white, bottom: C.navy, pose: p.pose, back: p.back,
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
      const k = show.k();
      if (k > 0) {
        // the show's on: the ball glows and throws its light about
        ctx.beginPath(); ctx.arc(X, Y, 0.62 + k * 0.4 + Math.sin(t * 8) * 0.05, 0, Math.PI * 2);
        ctx.fillStyle = alpha(C.butter, 0.3 * k); ctx.fill();
        ctx.lineCap = 'round';
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + t * 0.6;
          ctx.beginPath(); ctx.moveTo(X + Math.cos(a) * 0.75, Y + Math.sin(a) * 0.6);
          ctx.lineTo(X + Math.cos(a) * (0.75 + k * 0.5), Y + Math.sin(a) * (0.6 + k * 0.4));
          ctx.strokeStyle = alpha(C.butter, 0.8 * k); ctx.lineWidth = 0.06; ctx.stroke();
        }
      }
      ctx.beginPath(); ctx.arc(X, Y, 0.62, 0, Math.PI * 2);
      paint(ctx, k > 0.5 ? C.navy : C.night, { dots: C.navy, density: 0.4 });
      // a big friendly switch on its stand, so it says "tap me"
      const [sx, sy] = P(PROJ[0] + 0.15, PROJ[1] + 0.15, 0.75);
      ctx.beginPath(); ctx.arc(sx, sy, 0.13, 0, Math.PI * 2); paint(ctx, k > 0.5 ? C.leaf : C.coral, { lw: 0.04 });
      for (let i = 0; i < 14; i++) {
        const a = hash(i, 21) * Math.PI * 2 + t * 0.07 * 2 + k * 3;
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

    // The small telescope by the window, a kid on the stool having their turn.
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
    R.mover(() => ({ x: 12.35, y: 4.35 }), (ctx, t, p) => {
      person(ctx, p.x, p.y, 0.5, folk(79, { pose: 'stand', dir: 'r', back: true, scale: 0.62, top: C.coral, arms: [2.3, 2.1] }), t);
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
      if (s > 0.24 && s < 0.36 && Q.detail) speech(ctx, 12.1, 4.1, 2.4, 'OOOH', { size: 0.4, fill: C.butter });
    });
    // Their teacher, counting heads.
    R.mover(() => ({ x: 13.8, y: 8.7 }), (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, folk(90, { pose: Math.sin(t * 0.7) > 0 ? 'point' : 'stand', dir: 'l', top: C.green, style: 'short', hat: 'none' }), t);
    });

    // Orrery on a table, planets going round, Saturn without its ring.
    // Two drawers in the table's front. Spare moons in one; in the other,
    // Saturn's ring, too big for it: the drawer won't shut and a gold edge
    // shows at the top.
    const moons = R.poke({ id: 'moons', at: [DRAW[0].x + 0.45, OY + 1.3, 0.65], r: 0.55, sound: 'clunk', say: ['Spare moons. No rings.', 'Still moons.', 'Moon count: correct.'] });
    const ringDrawer = R.poke({ id: 'drawer', at: [DRAW[1].x + 0.45, OY + 1.3, 0.65], r: 0.55, sound: 'clunk' });
    R.thing(OX + 1.2, OY + 1.2, (ctx) => {
      box(ctx, OX - 1.2, OY - 1.2, 0, 2.4, 2.4, 1.05, C.brown, { top: C.wood });
      box(ctx, OX - 1.25, OY - 1.25, 1.05, 2.5, 2.5, 0.12, C.wood);
      // the drawers' holes, dark behind them
      for (const { x } of DRAW) face(ctx, [[x, OY + 1.2, 0.42], [x + 0.9, OY + 1.2, 0.42], [x + 0.9, OY + 1.2, 0.88], [x, OY + 1.2, 0.88]], C.ink, { lw: 0.02 });
    });
    R.thing(OX + 1.2, OY + 1.25, (ctx) => {
      drawer(ctx, DRAW[0].x, OY + 1.2, moons.k(), 'moons');
      drawer(ctx, DRAW[1].x, OY + 1.2, ringDrawer.k(), 'ring');
    }, { anim: true });
    R.find({ id: 'ring', label: "Saturn's missing ring", kind: 'poke', inside: ringDrawer, at: [DRAW[1].x + 0.45, OY + 1.65, 0.85], r: 0.6, hint: "Saturn on the orrery is bald. One of the table's drawers won't quite shut." });
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
    // The orrery answers a tap.
    R.poke({ id: 'orrery', at: [OX, OY, 2.1], r: 0.9, sound: 'tick', say: ['Tick. Tick. Tick.', 'Saturn looks a bit bare.', 'Do not touch the sun.'] });

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
    R.poke({ id: 'queue', at: [10.9, 10.9, 1.65], r: 0.7, sound: 'tick', say: ['WAIT HERE.', 'NO, HERE.', 'QUEUE TIME: ONE HOUR.'] });

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
    R.poke({ id: 'computer', at: [8.2, 0.7, 1.55], r: 0.8, sound: 'tick', say: ['SIGNAL DETECTED.', 'DECODING...', 'IT SAYS: HI.'] });

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

  },
};
