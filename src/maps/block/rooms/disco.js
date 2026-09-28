// Roller Disco: a mirror ball, a DJ who calls "REVERSE!" at the worst moment,
// a rink full of skaters and one skate that left without its owner.
import {
  C, box, rect, disc, cylinder, face, poly, paint, person, folk, slab, floor,
  onLeft, onRight, speech, paintText, shade, tint, mix, alpha, Q, P, hash,
} from '../../../engine/art.js';
import { particles, pulse, clamp, route } from '../../../engine/actors.js';

const CX = 9.0, CY = 8.6;            // rink centre
const RX = 5.6, RY = 4.8;            // painted rink edge
const CYC = 24, FWD = 18;            // skate forward 18s, then reverse for 6s
const WALLC = mix(C.night, C.navy, 0.35);
const RINK = mix(C.night, C.purple, 0.28);
const GLOWS = [C.white, C.pink, C.butter, C.tealLight, C.lilac, C.coralLight];

// Accumulated "forward time": runs forward, then backward during REVERSE.
const G = (t) => {
  const n = Math.floor(t / CYC), s = t - n * CYC;
  return n * (FWD - (CYC - FWD)) + (s < FWD ? s : FWD - (s - FWD));
};
const reversing = (t) => pulse(t, CYC) * CYC >= FWD;

function lap(rx, ry, period, off = 0) {
  return (t) => {
    const sg = reversing(t) ? -1 : 1;
    const a = ((G(t) + off) / period) * Math.PI * 2;
    const x = CX + Math.cos(a) * rx, y = CY + Math.sin(a) * ry;
    const vx = -Math.sin(a) * rx * sg, vy = Math.cos(a) * ry * sg;
    return { x, y, dir: vx - vy >= 0 ? 'r' : 'l', back: vx + vy < 0, a };
  };
}

function txt(ctx, X, Y, s, size, color = C.ink, font = 'Bagel Fat One') {
  const k = 40;
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(1 / k, 1 / k);
  ctx.font = `${size * k}px "${font}", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(s, 0, 0);
  ctx.restore();
}

function ovalPts(cx, cy, rx, ry, z = 0, n = 48) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, z]);
  }
  return pts;
}

// A roller skate in screen space, facing right, sole at (X, Y).
function skate(ctx, X, Y, s, boot = C.white, wheel = C.coral, spin = 0) {
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(-0.28, -0.12);
  ctx.lineTo(-0.28, -0.72);
  ctx.lineTo(0.02, -0.72);
  ctx.lineTo(0.05, -0.36);
  ctx.quadraticCurveTo(0.38, -0.34, 0.4, -0.12);
  ctx.closePath();
  paint(ctx, boot, { dots: shade(boot, 0.35), density: 0.15, lw: 0.05 });
  ctx.beginPath(); ctx.rect(-0.3, -0.14, 0.72, 0.07); paint(ctx, C.greyLight, { lw: 0.03 });
  if (Q.detail) {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.beginPath();
    for (let i = 0; i < 3; i++) { ctx.moveTo(-0.08, -0.62 + i * 0.1); ctx.lineTo(0.04, -0.58 + i * 0.1); }
    ctx.stroke();
  }
  for (const wx of [-0.18, 0.28]) {
    ctx.beginPath(); ctx.arc(wx, -0.02, 0.1, 0, Math.PI * 2); paint(ctx, wheel, { lw: 0.03 });
    if (Q.detail) {
      ctx.beginPath(); ctx.moveTo(wx, -0.02); ctx.lineTo(wx + Math.cos(spin) * 0.1, -0.02 + Math.sin(spin) * 0.1);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.stroke();
    }
  }
  ctx.restore();
}

// Draw a person with little skate wheels under their feet (pose 'skate').
function skater(ctx, x, y, z, o, t) {
  person(ctx, x, y, z, o, t);
  if (!Q.detail) return;
  const s = o.scale || 1, f = o.dir === 'l' ? -1 : 1;
  const ph = (o.phase || 0) + t * (o.speed || 7);
  const sn = Math.sin(ph);
  const lA = 0.25 + sn * 0.35, lB = -0.25 - sn * 0.1, lean = 0.22;
  const [X, Y] = P(x, y, z);
  for (const [hx, a] of [[-0.12, lA], [0.12, lB]]) {
    const fx = hx + Math.sin(a) * 0.8, fy = -0.8 + Math.cos(a) * 0.8;
    const rx = fx * Math.cos(lean) - fy * Math.sin(lean), ry = fx * Math.sin(lean) + fy * Math.cos(lean);
    const sx = X + rx * f * s, sy = Y + ry * s;
    ctx.fillStyle = o.wheels || C.mustard;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.025;
    for (const d of [-0.1, 0.14]) {
      ctx.beginPath(); ctx.arc(sx + d * f * s, sy + 0.1 * s, 0.07 * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  }
}

// Headphones on a person standing at (x, y, z).
function headphones(ctx, x, y, z, s = 1, f = 1, color = C.pink) {
  const [X, Y] = P(x, y, z);
  const hx = X + 0.02 * f * s, hy = Y - 1.95 * s;
  ctx.beginPath(); ctx.arc(hx, hy, 0.38 * s, Math.PI * 1.05, Math.PI * 1.95);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.12 * s; ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = 0.06 * s; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(hx - 0.02 * f * s, hy + 0.02 * s, 0.12 * s, 0.17 * s, 0, 0, Math.PI * 2);
  paint(ctx, color, { lw: 0.04 });
}

// Five-point star in screen space.
function star(ctx, X, Y, r, color) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2, rr = i % 2 ? r * 0.45 : r;
    const px = X + Math.cos(a) * rr, py = Y + Math.sin(a) * rr;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
  paint(ctx, color, { lw: 0.03 });
}

// A cubby shelf of rental skates on the left wall, one chunk along y.
function cubbies(ctx, y0, y1, seed) {
  const cols = [C.white, C.pink, C.butter, C.tealLight, C.lilac, C.coralLight];
  const W = 1.0, rows = [0.1, 1.1, 2.1], cw = 1.0;
  box(ctx, 0, y0, 0, W, y1 - y0, 0.1, C.wood, { lw: 0.04 });
  for (const z of rows) {
    box(ctx, 0, y0, z, W, y1 - y0, 0.08, C.wood, { flat: true, lw: 0.03 });
    for (let yy = y0; yy < y1 - 0.01; yy += cw) {
      const k = Math.floor(hash(seed + yy * 3, z * 7) * cols.length);
      const lone = seed === 2 && Math.abs(yy - 12.4) < 0.1 && z === 1.1;
      const [X, Y] = P(0.5, yy + cw * 0.5, z + 0.08);
      if (!lone) skate(ctx, X - 0.22, Y - 0.02, 0.62, cols[k], C.coral);
      skate(ctx, X + 0.05, Y + 0.08, 0.62, cols[k], C.coral);
      box(ctx, 0, yy + cw - 0.05, z, W, 0.06, 0.95, C.wood, { flat: true, lw: 0.03 });
    }
  }
  box(ctx, 0, y0, 3.08, W, y1 - y0, 0.12, C.wood, { lw: 0.04 });
}

export default {
  id: 'disco',
  name: 'Roller Disco',
  blurb: 'Every time the DJ yells "REVERSE!" somebody learns about physics. One skate is doing laps on its own.',

  build(R) {
    // ---------- floor and rink ----------
    R.floor((ctx) => {
      slab(ctx, C.navy);
      floor(ctx, C.night, { dots: C.ink, density: 0.35, stroke: false });
      face(ctx, ovalPts(CX, CY, RX + 0.35, RY + 0.35, 0.005), C.pink, { stroke: false });
      face(ctx, ovalPts(CX, CY, RX, RY, 0.01), RINK, { dots: mix(RINK, C.purple, 0.4), density: 0.2, stroke: false });
      face(ctx, ovalPts(CX, CY, RX - 0.4, RY - 0.4, 0.012), null, { lw: 0.06, stroke: C.tealLight });
      face(ctx, ovalPts(CX, CY, 2.4, 1.9, 0.012), mix(RINK, C.navy, 0.5), { lw: 0.06, stroke: C.butter });
      paintText(ctx, 'floor', CX, CY, 'ROLL', 1.1, alpha(C.pink, 0.9));
      if (Q.detail) {
        // lane arrows
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + 0.2;
          const x = CX + Math.cos(a) * (RX - 1.0), y = CY + Math.sin(a) * (RY - 0.9);
          const tx = -Math.sin(a) * 0.4, ty = Math.cos(a) * 0.4;
          face(ctx, [[x + tx, y + ty, 0.013], [x - tx * 0.6 + ty * 0.4, y - ty * 0.6 - tx * 0.4, 0.013], [x - tx * 0.6 - ty * 0.4, y - ty * 0.6 + tx * 0.4, 0.013]], alpha(C.tealLight, 0.5), { stroke: false });
        }
      }
    });

    R.walls({ left: WALLC, right: shade(WALLC, 0.1), cap: C.navy, dotsL: C.night, dotsR: C.night, densL: 0.35, densR: 0.35 });
    R.wall((ctx) => {
      // checker dado along the bottom of both walls
      for (let u = 0; u < 16; u += 0.5) {
        const c = (u * 2) % 2 ? C.pink : C.night;
        onLeft(ctx, u, 0, 0.5, 0.5, c, { stroke: false });
        onRight(ctx, u, 0, 0.5, 0.5, (u * 2) % 2 ? C.night : C.pink, { stroke: false });
      }
    });

    // Neon and signs on the walls (static glow).
    R.decor((ctx) => {
      const neon = (plane, u, v, text, size, color) => {
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
        paintText(ctx, plane, u, v, text, size, color);
        ctx.restore();
        paintText(ctx, plane, u, v, text, size, tint(color, 0.45));
      };
      neon('right', 7.7, 4.95, 'ROLLER', 1.05, C.pink);
      neon('right', 7.7, 3.75, 'DISCO', 1.05, C.tealLight);
      // snack menu
      onLeft(ctx, 1.9, 2.7, 5.3, 2.4, C.ink, { lw: 0.05 });
      neon('left', 4.55, 4.55, 'SNACKS', 0.62, C.butter);
      paintText(ctx, 'left', 4.55, 3.75, 'PIZZA 2   POP 1', 0.34, C.white);
      paintText(ctx, 'left', 4.55, 3.2, 'NACHOS 3   ICE 1', 0.34, C.white);
      // rental sign
      neon('left', 12.4, 4.0, 'SKATE RENTAL', 0.55, C.pink);
      paintText(ctx, 'left', 12.4, 3.45, 'SIZES 1 TO 13', 0.3, C.lilac);
      // a heart and a lightning bolt in neon
      ctx.save();
      ctx.shadowColor = C.coral; ctx.shadowBlur = 12;
      const heart = [];
      for (let a = 0; a < Math.PI * 2; a += 0.2) {
        const hx = 16 * Math.pow(Math.sin(a), 3), hz = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
        heart.push([0, 7.8 + hx * 0.045, 4.6 + hz * 0.045]);
      }
      face(ctx, heart, null, { lw: 0.12, stroke: C.coral });
      ctx.restore();
      ctx.save();
      ctx.shadowColor = C.butter; ctx.shadowBlur = 12;
      face(ctx, [[13.6, 0, 5.2], [13.1, 0, 4.4], [13.6, 0, 4.4], [13.2, 0, 3.6]], null, { lw: 0.12, stroke: C.butter });
      ctx.restore();
      // exit sign
      onRight(ctx, 14.6, 4.6, 1.0, 0.45, C.green, { lw: 0.04 });
      paintText(ctx, 'right', 15.1, 4.82, 'EXIT', 0.3, C.white);
    });

    // The ALL SKATE / REVERSE lightbox, and a string of blinking bulbs.
    R.decor((ctx, t) => {
      const rev = reversing(t);
      const blink = rev && Math.sin(t * 12) > 0;
      onRight(ctx, 12.0, 2.3, 2.6, 0.9, rev ? (blink ? C.coral : C.red) : C.ink, { lw: 0.05 });
      paintText(ctx, 'right', 13.3, 2.75, rev ? 'REVERSE!' : 'ALL SKATE', 0.42, rev ? C.white : C.butter);
      if (!Q.detail) return;
      for (const plane of ['L', 'R']) {
        for (let i = 0; i < 20; i++) {
          const u = 0.4 + i * 0.8;
          const sag = Math.abs(Math.sin((u / 3.2) * Math.PI)) * 0.35;
          const on = Math.sin(t * 3 + i * 1.7 + (plane === 'L' ? 0 : 2)) > -0.2;
          const pt = plane === 'L' ? [0.05, u, 5.8 - sag] : [u, 0.05, 5.8 - sag];
          const [X, Y] = P(...pt);
          ctx.beginPath(); ctx.arc(X, Y + 0.1, 0.1, 0, Math.PI * 2);
          ctx.fillStyle = on ? GLOWS[i % GLOWS.length] : C.navy; ctx.fill();
        }
        const pts = [];
        for (let u = 0; u <= 16; u += 0.4) {
          const sag = Math.abs(Math.sin((u / 3.2) * Math.PI)) * 0.35;
          pts.push(plane === 'L' ? [0.05, u, 5.8 - sag] : [u, 0.05, 5.8 - sag]);
        }
        ctx.beginPath();
        pts.forEach((p, i) => { const [X, Y] = P(...p); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
      }
    }, { anim: true });

    // ---------- moving light from the mirror ball ----------
    const BALL = [CX, CY, 7.4];
    R.rug((ctx, t) => {
      if (!Q.detail) return;
      for (let i = 0; i < 26; i++) {
        const r = 1.2 + hash(i, 3) * 7.5;
        const a = hash(i, 9) * Math.PI * 2 + t * 0.45;
        const x = CX + Math.cos(a) * r, y = CY + Math.sin(a) * r * 0.95;
        if (x < 0.3 || y < 0.3 || x > 15.7 || y > 15.7) continue;
        disc(ctx, x, y, 0.02, 0.22 + hash(i, 5) * 0.12, alpha(GLOWS[i % GLOWS.length], 0.75), { stroke: false });
      }
    }, { anim: true });
    R.decor((ctx, t) => {
      if (!Q.detail) return;
      for (let i = 0; i < 18; i++) {
        const onL = i % 2 === 0;
        const u = ((hash(i, 1) * 16 + t * (0.9 + hash(i, 2) * 0.6)) % 16 + 16) % 16;
        const z = 1.0 + hash(i, 4) * 4.4;
        const r = 0.14 + hash(i, 6) * 0.1;
        const ring = [];
        for (let a = 0; a < Math.PI * 2; a += 0.5) ring.push(onL ? [0, 16 - u + Math.cos(a) * r, z + Math.sin(a) * r] : [u + Math.cos(a) * r, 0, z + Math.sin(a) * r]);
        face(ctx, ring, alpha(GLOWS[i % GLOWS.length], 0.8), { stroke: false });
      }
    }, { anim: true });

    // ---------- the snack counter ----------
    for (let i = 0; i < 5; i++) {
      const y0 = 2 + i, y1 = y0 + 1;
      R.thing(2.2, y1, (ctx) => {
        box(ctx, 1.0, y0, 0, 1.2, 1, 1.25, C.coral, { top: C.white, lw: 0.04 });
        if (Q.detail) face(ctx, [[2.2, y0, 0.55], [2.2, y1, 0.55]], null, { lw: 0.1, stroke: C.butter });
        if (i === 1) {
          // pizza box with slices
          box(ctx, 1.2, y0 + 0.1, 1.25, 0.8, 0.8, 0.08, C.paperDeep, { lw: 0.03 });
          disc(ctx, 1.6, y0 + 0.5, 1.34, 0.34, C.butter, { lw: 0.03 });
          for (const [dx, dy] of [[-0.1, -0.1], [0.12, 0.05], [-0.05, 0.15]]) disc(ctx, 1.6 + dx, y0 + 0.5 + dy, 1.35, 0.06, C.red, { stroke: false });
        }
        if (i === 2 || i === 3) {
          for (let k = 0; k < 3; k++) {
            const cx = 1.4 + (k % 2) * 0.4, cy = y0 + 0.25 + k * 0.25;
            cylinder(ctx, cx, cy, 1.25, 0.1, 0.35, [C.pink, C.teal, C.mustard][k], { top: C.white });
            face(ctx, [[cx, cy, 1.6], [cx + 0.05, cy - 0.05, 1.85]], null, { lw: 0.04, stroke: C.coral });
          }
        }
        if (i === 4) {
          cylinder(ctx, 1.6, y0 + 0.5, 1.25, 0.3, 0.2, C.greyLight, { top: C.white });
          label(ctx, 1.6, y0 + 0.5, 1.9, 'TIPS', 0.24, C.white);
        }
      });
    }
    // popcorn machine with popping kernels
    R.thing(2.2, 3.05, (ctx, t) => {
      box(ctx, 1.2, 2.15, 1.25, 0.8, 0.75, 0.12, C.red, { lw: 0.03 });
      const pts = [[1.2, 2.9, 1.37], [2.0, 2.9, 1.37], [2.0, 2.9, 2.3], [1.2, 2.9, 2.3]];
      face(ctx, [[2.0, 2.15, 1.37], [2.0, 2.9, 1.37], [2.0, 2.9, 2.3], [2.0, 2.15, 2.3]], alpha(C.butter, 0.35), { lw: 0.03 });
      face(ctx, pts, alpha(C.butter, 0.35), { lw: 0.03 });
      face(ctx, [[1.2, 2.15, 1.37], [2.0, 2.15, 1.37], [2.0, 2.9, 1.37], [1.2, 2.9, 1.37]], C.butter, { dots: C.white, density: 0.5, stroke: false });
      box(ctx, 1.15, 2.1, 2.3, 0.9, 0.85, 0.15, C.red, { lw: 0.03 });
      if (!Q.detail) return;
      particles(t, 10, 0.7, (k, r) => {
        const [X, Y] = P(1.3 + r() * 0.6, 2.25 + r() * 0.55, 1.45 + Math.sin(k * Math.PI) * 0.75);
        ctx.beginPath(); ctx.arc(X, Y, 0.06, 0, Math.PI * 2); ctx.fillStyle = C.white; ctx.fill();
      }, 4);
    }, { anim: true });
    // server behind the counter, and a customer counting coins
    R.mover(() => ({ x: 0.55, y: 4.6 }), (ctx, t) => {
      const hand = pulse(t, 4) < 0.5;
      person(ctx, 0.55, 4.6, 0, folk(90, { dir: 'r', pose: hand ? 'point' : 'wave', top: C.red, hat: 'cap', speed: 4 }), t);
    });
    R.mover(() => ({ x: 3.0, y: 5.4 }), (ctx, t) => {
      person(ctx, 3.0, 5.4, 0, folk(91, { dir: 'l', back: true, pose: 'skate', arms: [1.2, 0.3], speed: 1, top: C.lilac, style: 'pony' }), t);
    });

    // snack table with someone who only came for the nachos
    R.thing(3.6, 3.6, (ctx, t) => {
      cylinder(ctx, 3.2, 3.2, 0, 0.12, 1.0, C.grey);
      cylinder(ctx, 3.2, 3.2, 1.0, 0.65, 0.08, C.teal, { top: C.tealLight });
      disc(ctx, 3.1, 3.1, 1.1, 0.3, C.mustard, { lw: 0.03 });
      for (let k = 0; k < 5; k++) disc(ctx, 3.0 + (k % 3) * 0.1, 3.0 + k * 0.05, 1.12, 0.07, C.butter, { stroke: false });
    });
    R.mover(() => ({ x: 3.6, y: 2.5 }), (ctx, t) => {
      const chomp = Math.sin(t * 4) > 0;
      person(ctx, 3.6, 2.5, 0.1, folk(92, { pose: 'sit', dir: 'l', back: false, top: C.butter, arms: [chomp ? 2.3 : 1.2, 0.8], style: 'curly' }), t);
    }, { bias: -0.5 });

    // ---------- skate rental ----------
    for (let i = 0; i < 3; i++) {
      const y0 = 9.4 + i * 2, y1 = y0 + 2;
      R.thing(1.0, y1, (ctx) => cubbies(ctx, y0, y1, i + 1));
    }
    for (let i = 0; i < 3; i++) {
      const y0 = 10 + i * 1.5, y1 = y0 + 1.5;
      R.thing(2.5, y1, (ctx) => {
        box(ctx, 1.7, y0, 0, 0.8, 1.5, 1.2, C.purple, { top: C.lilac, lw: 0.04 });
        if (i === 0) {
          // a sad lost-and-found bin
          box(ctx, 1.8, y0 + 0.2, 1.2, 0.6, 0.7, 0.35, C.paperDeep, { lw: 0.03 });
          label(ctx, 2.1, y0 + 0.55, 1.9, 'LOST', 0.2, C.ink);
        }
        if (i === 2) {
          face(ctx, [[1.9, y0 + 0.4, 1.2], [1.9, y0 + 1.1, 1.2], [1.9, y0 + 1.1, 1.22], [1.9, y0 + 0.4, 1.22]], C.white);
          const [X, Y] = P(2.1, y0 + 0.8, 1.2);
          ctx.beginPath(); ctx.arc(X, Y - 0.1, 0.12, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.03 });
        }
      });
    }
    // attendant handing out skates
    R.mover(() => ({ x: 1.25, y: 11.9 }), (ctx, t) => {
      const give = pulse(t, 5) > 0.6;
      person(ctx, 1.25, 11.9, 0, folk(93, {
        dir: 'r', pose: 'stand', arms: give ? [1.5, 1.4] : [0.2, -0.2], top: C.teal, hair: C.pink, style: 'bun',
        hold: give ? (c) => skate(c, 0.25, 0.05, 0.6, C.lilac, C.teal) : undefined,
      }), t);
    }, { bias: -0.1 });
    // kid lacing up on a bench
    R.thing(3.8, 15.2, (ctx) => {
      box(ctx, 2.9, 12.6, 0.55, 0.8, 2.6, 0.12, C.wood, { lw: 0.04 });
      for (const ly of [12.7, 15.0]) box(ctx, 3.2, ly, 0, 0.12, 0.12, 0.55, C.brown, { flat: true, stroke: false });
      const [X, Y] = P(3.3, 14.8, 0.67);
      skate(ctx, X, Y, 0.55, C.butter, C.pink);
    }, { depth: 17.4 });
    R.mover(() => ({ x: 3.4, y: 13.6 }), (ctx, t) => {
      const tug = Math.sin(t * 6);
      person(ctx, 3.4, 13.6, 0.2, folk(94, { pose: 'sit', dir: 'r', scale: 0.72, top: C.sky, arms: [0.9 + tug * 0.25, 0.7 - tug * 0.2], style: 'pony', hair: C.mustard }), t);
      if (Q.detail) {
        const [X, Y] = P(3.4, 13.6, 0.2);
        ctx.beginPath(); ctx.moveTo(X + 0.55, Y - 0.35); ctx.quadraticCurveTo(X + 0.7, Y - 0.9 - tug * 0.1, X + 0.35, Y - 0.85);
        ctx.strokeStyle = C.white; ctx.lineWidth = 0.04; ctx.stroke();
      }
    }, { depth: 17.5 });

    // ---------- DJ booth ----------
    R.thing(4.4, 1.0, (ctx, t) => speaker(ctx, 3.2, t), { anim: true });
    R.thing(12.2, 0.9, (ctx, t) => speaker(ctx, 11.0, t), { anim: true });
    R.thing(10, 2.5, (ctx, t) => {
      box(ctx, 5.4, 1.4, 0, 4.6, 1.1, 1.3, C.ink, { top: C.navy, lw: 0.05 });
      // glowing stripes on the front, chasing
      for (let i = 0; i < 12; i++) {
        const x = 5.6 + i * 0.36;
        const on = Math.sin(t * 6 - i * 0.7) > 0.2;
        face(ctx, [[x, 2.5, 0.25], [x + 0.2, 2.5, 0.25], [x + 0.2, 2.5, 1.05], [x, 2.5, 1.05]], on ? GLOWS[i % GLOWS.length] : shade(C.purple, 0.4), { stroke: false });
      }
      // decks
      for (const [dx, isPizza] of [[6.5, false], [8.9, true]]) {
        box(ctx, dx - 0.6, 1.5, 1.3, 1.2, 0.9, 0.08, C.grey, { lw: 0.03 });
        disc(ctx, dx, 1.95, 1.39, 0.42, C.black, { lw: 0.03 });
        const a = t * 3.5;
        if (!isPizza) {
          disc(ctx, dx, 1.95, 1.4, 0.14, C.coral, { stroke: false });
          face(ctx, [[dx + Math.cos(a) * 0.18, 1.95 + Math.sin(a) * 0.18, 1.41], [dx + Math.cos(a) * 0.4, 1.95 + Math.sin(a) * 0.4, 1.41]], null, { lw: 0.05, stroke: C.grey });
        } else {
          // the pizza slice, going round and round
          const tip = [dx + Math.cos(a) * 0.05, 1.95 + Math.sin(a) * 0.05, 1.42];
          const c1 = [dx + Math.cos(a + 0.45) * 0.42, 1.95 + Math.sin(a + 0.45) * 0.42, 1.42];
          const c2 = [dx + Math.cos(a - 0.45) * 0.42, 1.95 + Math.sin(a - 0.45) * 0.42, 1.42];
          face(ctx, [tip, c1, c2], C.butter, { lw: 0.03 });
          face(ctx, [c1, c2], null, { lw: 0.09, stroke: C.wood });
          for (const k of [0.45, 0.72]) {
            const m = [dx + Math.cos(a + (k - 0.58) * 0.8) * k * 0.5, 1.95 + Math.sin(a + (k - 0.58) * 0.8) * k * 0.5];
            disc(ctx, m[0], m[1], 1.43, 0.05, C.red, { stroke: false });
          }
        }
      }
      // mixer
      box(ctx, 7.35, 1.6, 1.3, 0.7, 0.7, 0.12, C.grey, { lw: 0.03 });
      for (let i = 0; i < 3; i++) {
        const lv = 0.5 + 0.5 * Math.sin(t * 8 + i * 2);
        face(ctx, [[7.45 + i * 0.2, 2.3, 1.3], [7.45 + i * 0.2, 2.3, 1.3 + lv * 0.3]], null, { lw: 0.06, stroke: i === 1 ? C.coral : C.tealLight });
      }
      // laptop with a sticker
      box(ctx, 5.6, 1.5, 1.3, 0.5, 0.5, 0.05, C.greyLight, { lw: 0.03 });
    }, { anim: true });
    R.find({ id: 'pizza', label: 'A slice of pizza', at: [8.9, 1.95, 1.45], r: 0.7 });

    // The DJ, bobbing, calling out the reverse
    R.mover(() => ({ x: 7.2, y: 0.8 }), (ctx, t) => {
      const beat = Math.abs(Math.sin(t * Math.PI * 2));
      const s = pulse(t, CYC) * CYC;
      const shout = s > FWD - 1.2 && s < FWD + 1.2;
      const z = beat * 0.12;
      person(ctx, 7.2, 0.8, z, {
        skin: '#633F2A', hair: C.ink, style: 'curly', top: C.purple, bottom: C.ink, dir: 'r',
        pose: shout ? 'cheer' : 'stand', arms: shout ? undefined : [1.35 + Math.sin(t * 9) * 0.15, 1.6],
      }, t);
      headphones(ctx, 7.2, 0.8, z, 1, 1, C.mustard);
      if (shout && Q.detail) speech(ctx, 7.0, 0.6, 3.6, 'REVERSE!', { size: 0.55 });
      else if (s > CYC - 1.3 && Q.detail) speech(ctx, 7.0, 0.6, 3.6, 'AND FORWARD!', { size: 0.5 });
      if (Q.detail) {
        // notes drift up out of the booth
        particles(t, 5, 2.6, (k, r) => {
          const [X, Y] = P(6 + r() * 4, 1.9 + k * 0.5, 2.0 + k * 3);
          ctx.save(); ctx.globalAlpha = Math.sin(k * Math.PI);
          noteGlyph(ctx, X + Math.sin(k * 6 + r() * 6) * 0.3, Y, GLOWS[Math.floor(r() * GLOWS.length)]);
          ctx.restore();
        }, 7);
      }
    }, { bias: -0.2 });

    // The goose: dancing behind the booth, in its own headphones.
    const gpos = (t) => {
      const beat = t * 2;
      const hop = Math.abs(Math.sin(beat * Math.PI));
      const big = Math.floor(beat) % 4 === 3;
      return { x: 8.9, y: 0.8, z: hop * (big ? 0.95 : 0.45), dir: Math.floor(beat / 2) % 2 ? 'l' : 'r', pose: big && hop > 0.6 ? 'honk' : 'stand' };
    };
    R.goose(gpos, { bias: 0 });
    R.mover(gpos, (ctx, t, p) => {
      if (p.pose === 'honk') return;
      const f = p.dir === 'l' ? -1 : 1;
      const [X, Y] = P(p.x, p.y, p.z);
      const hx = X + 0.28 * f, hy = Y - 1.07;
      ctx.beginPath(); ctx.arc(hx, hy, 0.17, Math.PI * 1.05, Math.PI * 1.95);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.07; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(hx - 0.02 * f, hy + 0.02, 0.07, 0.1, 0, 0, Math.PI * 2);
      paint(ctx, C.pink, { lw: 0.03 });
    }, { bias: 0.01 });

    // ---------- photo booth between the snacks and the rental desk ----------
    R.thing(1.7, 9.2, (ctx, t) => {
      box(ctx, 0, 7.3, 0, 1.7, 1.8, 3.0, C.pink, { top: C.coral, lw: 0.05 });
      // curtain on the open face (facing +x)
      const flash = pulse(t, 6.5) > 0.9;
      face(ctx, [[1.72, 7.5, 0.45], [1.72, 8.9, 0.45], [1.72, 8.9, 2.6], [1.72, 7.5, 2.6]], flash ? C.white : C.red, { dots: flash ? null : shade(C.red, 0.5), density: 0.3 });
      if (Q.detail) for (let k = 1; k < 5; k++) face(ctx, [[1.73, 7.5 + k * 0.28, 0.45], [1.73, 7.5 + k * 0.28, 2.6]], null, { lw: 0.03, stroke: shade(C.red, 0.4) });
      // feet under the curtain: two pairs, one of them on skates
      const [X, Y] = P(1.8, 8.0, 0.02), [X2, Y2] = P(1.8, 8.6, 0.02);
      ctx.fillStyle = C.ink;
      ctx.beginPath(); ctx.ellipse(X - 0.1, Y, 0.13, 0.07, 0, 0, Math.PI * 2); ctx.ellipse(X + 0.18, Y + 0.05, 0.13, 0.07, 0, 0, Math.PI * 2); ctx.fill();
      skate(ctx, X2 - 0.1, Y2, 0.45, C.white, C.pink);
      skate(ctx, X2 + 0.25, Y2 + 0.08, 0.45, C.white, C.pink);
      // sign and fresh strip of photos
      const [SX, SY] = P(1.8, 8.2, 3.3);
      txt(ctx, SX, SY, 'PHOTOS', 0.36, C.white);
      const k = clamp((pulse(t, 6.5) - 0.92) / 0.08 + (pulse(t, 6.5) < 0.3 ? 1 : 0));
      const [PX, PY] = P(1.75, 9.0, 1.4);
      ctx.beginPath(); ctx.rect(PX - 0.12, PY, 0.24, 0.1 + k * 0.6); paint(ctx, C.white, { lw: 0.03 });
    }, { anim: true });

    // ---------- spectators' bench on the right, and a janitor with a mop ----------
    R.thing(15.4, 1.0, (ctx) => {
      box(ctx, 12.4, 0.2, 0.55, 3.0, 0.8, 0.12, C.teal, { lw: 0.04 });
      for (const lx of [12.5, 15.2]) box(ctx, lx, 0.35, 0, 0.12, 0.12, 0.55, C.ink, { flat: true, stroke: false });
    }, { depth: 13.5 });
    R.mover(() => ({ x: 13.1, y: 0.8 }), (ctx, t) => {
      // a parent holding everyone's coats, filming on a phone
      person(ctx, 13.1, 0.8, 0.2, folk(130, {
        pose: 'sit', dir: 'r', top: C.greyLight, hat: 'beanie', arms: [2.3, 1.0],
        hold: (c) => {
          c.beginPath(); c.roundRect(0.05, -0.95, 0.22, 0.36, 0.04); paint(c, C.ink, { lw: 0.03 });
          if (Math.sin(t * 5) > 0) { c.beginPath(); c.arc(0.16, -0.88, 0.04, 0, Math.PI * 2); c.fillStyle = C.red; c.fill(); }
        },
      }), t);
      const [X, Y] = P(13.1, 0.8, 0.8);
      for (const [dy, c] of [[0, C.coral], [-0.2, C.mustard], [-0.4, C.teal], [-0.58, C.pink]]) {
        ctx.beginPath(); ctx.ellipse(X - 0.1, Y + dy - 0.3, 0.45, 0.13, 0.1, 0, Math.PI * 2); paint(ctx, c, { lw: 0.03 });
      }
    }, { depth: 14 });
    R.mover(() => ({ x: 14.5, y: 0.8 }), (ctx, t) => {
      person(ctx, 14.5, 0.8, 0.2, folk(131, {
        pose: 'sit', dir: 'l', scale: 0.72, top: C.butter, arms: [1.6 + Math.sin(t * 2) * 0.3, 0.5],
        hold: (c) => {
          c.beginPath(); c.moveTo(0.05, 0.2); c.lineTo(0.05, -0.5); c.strokeStyle = C.paper; c.lineWidth = 0.06; c.stroke();
          c.beginPath(); c.arc(0.05, -0.75, 0.32, 0, Math.PI * 2); paint(c, C.pink, { dots: C.white, density: 0.3, lw: 0.04 });
        },
      }), t);
    }, { depth: 15.4 });
    const mop = route([[4.8, 15.0], [9.5, 15.2]], { speed: 0.5, loop: false });
    R.mover(mop, (ctx, t, p) => {
      const sw = Math.sin(t * 4) * 0.35;
      const f = p.dir === 'l' ? -1 : 1;
      const [MX, MY] = P(p.x + 0.3 + sw * 0.3, p.y + 0.4, 0);
      if (Q.detail) { ctx.beginPath(); ctx.ellipse(MX, MY, 0.6, 0.25, 0, 0, Math.PI * 2); ctx.fillStyle = alpha(C.sky, 0.25); ctx.fill(); }
      person(ctx, p.x, p.y, 0, folk(132, { pose: 'walk', dir: p.dir, back: p.back, speed: 3, top: C.teal, bottom: C.teal, hat: 'cap', arms: [1.0 + sw * 0.4, 0.8] }), t);
      const [HX, HY] = P(p.x, p.y, 1.4);
      ctx.beginPath(); ctx.moveTo(HX + f * 0.25, HY); ctx.lineTo(MX, MY - 0.1);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.stroke(); ctx.strokeStyle = C.wood; ctx.lineWidth = 0.05; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(MX, MY - 0.05, 0.3, 0.1, 0, 0, Math.PI * 2); paint(ctx, C.greyLight, { lw: 0.03 });
    });
    // a wet floor sign, placed with great confidence next to a skating rink
    R.thing(10.6, 15.4, (ctx) => {
      const [X, Y] = P(10.6, 15.4, 0);
      ctx.beginPath(); ctx.moveTo(X - 0.4, Y); ctx.lineTo(X - 0.15, Y - 1.1); ctx.lineTo(X + 0.15, Y - 1.1); ctx.lineTo(X + 0.4, Y); ctx.closePath();
      paint(ctx, C.mustard, { lw: 0.05 });
      txt(ctx, X, Y - 0.62, '!', 0.45, C.ink);
      txt(ctx, X, Y - 0.25, 'WET', 0.18, C.ink);
    });

    // ---------- the mirror ball ----------
    R.air((ctx, t) => {
      const [X, Y] = P(...BALL);
      const [TX, TY] = P(BALL[0], BALL[1], 11);
      ctx.beginPath(); ctx.moveTo(TX, TY); ctx.lineTo(X, Y - 0.85);
      ctx.strokeStyle = C.greyLight; ctx.lineWidth = 0.05; ctx.stroke();
      // faint beams to some of the floor spots
      if (Q.detail) {
        for (let i = 0; i < 26; i += 5) {
          const r = 1.2 + hash(i, 3) * 7.5;
          const a = hash(i, 9) * Math.PI * 2 + t * 0.45;
          const x = CX + Math.cos(a) * r, y = CY + Math.sin(a) * r * 0.95;
          if (x < 0.3 || y < 0.3 || x > 15.7 || y > 15.7) continue;
          const [bx, by] = P(x, y, 0);
          ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(bx - 0.25, by); ctx.lineTo(bx + 0.25, by); ctx.closePath();
          ctx.fillStyle = alpha(GLOWS[i % GLOWS.length], 0.07); ctx.fill();
        }
      }
      const R0 = 0.85;
      ctx.beginPath(); ctx.arc(X, Y, R0, 0, Math.PI * 2);
      paint(ctx, C.grey, { lw: 0.06 });
      ctx.save();
      ctx.beginPath(); ctx.arc(X, Y, R0, 0, Math.PI * 2); ctx.clip();
      const rows = 8, cols = 16;
      for (let j = 0; j < rows; j++) {
        const la0 = -Math.PI / 2 + (j / rows) * Math.PI, la1 = la0 + Math.PI / rows;
        const y0 = Y + Math.sin(la0) * R0, y1 = Y + Math.sin(la1) * R0;
        const rr = Math.cos((la0 + la1) / 2) * R0;
        for (let k = 0; k < cols; k++) {
          const p0 = (k / cols) * Math.PI * 2 + t * 1.2, p1 = p0 + (Math.PI * 2) / cols;
          if (Math.cos((p0 + p1) / 2) < 0) continue;
          const x0 = X + Math.sin(p0) * rr, x1 = X + Math.sin(p1) * rr;
          const h = hash(k * 31 + j, Math.floor(t * 6 + k) % 7);
          ctx.fillStyle = h > 0.85 ? C.white : h > 0.6 ? C.greyLight : h > 0.45 ? GLOWS[(k + j) % GLOWS.length] : C.grey;
          ctx.fillRect(Math.min(x0, x1) + 0.015, y0 + 0.015, Math.abs(x1 - x0) - 0.03, y1 - y0 - 0.03);
        }
      }
      ctx.restore();
      ctx.beginPath(); ctx.arc(X, Y, R0, 0, Math.PI * 2);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.06; ctx.stroke();
      if (Q.detail) {
        for (let i = 0; i < 3; i++) {
          const k = pulse(t, 1.3, i * 0.45);
          const a = hash(i, Math.floor(t / 1.3 + i * 0.35)) * Math.PI * 2;
          const s = Math.sin(k * Math.PI) * 0.25;
          if (s > 0.02) star(ctx, X + Math.cos(a) * 1.0, Y + Math.sin(a) * 1.0, s, C.white);
        }
      }
    });

    // ---------- skaters ----------
    const crew = [
      // [rx, ry, period, offset, seed, extra]
      { rx: 4.5, ry: 3.7, per: 7, off: 0, seed: 101, o: { top: C.red, bottom: C.ink, hat: 'helmet', speed: 13, style: 'short' }, speedy: true },
      { rx: 3.5, ry: 2.8, per: 14, off: 1.0, seed: 102, o: { top: C.pink, dress: true, style: 'long', hair: C.mustard } },
      { rx: 4.2, ry: 3.4, per: 14, off: 1.2, seed: 103, o: { top: C.teal, style: 'short' } },
      { rx: 3.9, ry: 3.1, per: 12, off: 5, seed: 104, o: { top: C.butter, style: 'curly', hat: 'none' }, backwards: true },
      { rx: 4.4, ry: 3.6, per: 30, off: 11, seed: 105, o: { top: C.coralLight, hat: 'helmet' }, wobbly: true },
      { rx: 3.7, ry: 3.0, per: 16, off: 8.0, seed: 106, o: { top: C.mustard, scale: 0.72 } },
      { rx: 3.7, ry: 3.0, per: 16, off: 8.5, seed: 107, o: { top: C.sky, scale: 0.72 } },
      { rx: 3.7, ry: 3.0, per: 16, off: 9.0, seed: 108, o: { top: C.pink, scale: 0.72 } },
      { rx: 4.0, ry: 3.3, per: 10, off: 3, seed: 109, o: { top: C.white, bottom: C.purple, style: 'curly', hair: C.ink, hat: 'none' } },
    ];
    crew.forEach((c, i) => {
      const fn = lap(c.rx, c.ry, c.per, c.off);
      R.mover(fn, (ctx, t, p) => {
        let dir = p.dir;
        if (c.backwards) dir = dir === 'l' ? 'r' : 'l';
        const o = folk(c.seed, { pose: 'skate', dir, back: c.backwards ? !p.back : p.back, speed: 6, ...c.o });
        if (c.wobbly) {
          o.arms = [2.2 + Math.sin(t * 7) * 0.9, -2.0 + Math.cos(t * 6) * 0.9];
          o.speed = 3;
        }
        if (i >= 5 && i <= 7 && i > 5) o.arms = [1.5, 0.8]; // conga: hands on the one in front
        if (i === 1 || i === 2) o.arms = [i === 1 ? 1.2 : 1.3, 0.4];
        const z = c.wobbly ? Math.abs(Math.sin(t * 5)) * 0.05 : 0;
        if (c.wobbly && Q.detail) {
          // training walker
          const [X, Y] = P(p.x, p.y, 0);
          const f = dir === 'l' ? -1 : 1;
          ctx.beginPath();
          ctx.moveTo(X + f * 0.1, Y); ctx.lineTo(X + f * 0.2, Y - 1.1); ctx.lineTo(X + f * 0.95, Y - 1.1); ctx.lineTo(X + f * 1.0, Y + 0.05);
          ctx.moveTo(X + f * 0.2, Y - 0.5); ctx.lineTo(X + f * 0.95, Y - 0.5);
          ctx.strokeStyle = C.ink; ctx.lineWidth = 0.12; ctx.stroke();
          ctx.strokeStyle = C.tealLight; ctx.lineWidth = 0.06; ctx.stroke();
        }
        skater(ctx, p.x, p.y, z, o, t);
        if (c.speedy && Q.detail) {
          // speed lines
          const q = fn(t - 0.25);
          for (let k = 0; k < 3; k++) {
            const [X0, Y0] = P(q.x, q.y, 0.8 + k * 0.45);
            const [X1, Y1] = P(p.x + (q.x - p.x) * 0.3, p.y + (q.y - p.y) * 0.3, 0.8 + k * 0.45);
            ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1);
            ctx.strokeStyle = alpha(C.white, 0.6); ctx.lineWidth = 0.05; ctx.stroke();
          }
        }
        if (c.wobbly && reversing(t) && Q.detail) speech(ctx, p.x, p.y, 3.1, 'NOOO', { size: 0.4 });
      });
    });

    // The show-off spinning in the middle
    R.mover(() => ({ x: CX, y: CY }), (ctx, t) => {
      const spin = Math.floor(t * 6) % 2;
      const trick = pulse(t, 8) > 0.8;
      skater(ctx, CX, CY, trick ? Math.sin(pulse(t, 8) * 5 * Math.PI) * 0.4 : 0, folk(110, {
        pose: trick ? 'cheer' : 'skate', dir: spin ? 'l' : 'r', back: Math.floor(t * 3) % 2 === 1, top: C.lilac, bottom: C.pink, style: 'long', hair: C.pink, speed: 10,
        arms: trick ? undefined : [2.8, -2.8],
      }), t);
      if (Q.detail) {
        const [X, Y] = P(CX, CY, 0.05);
        ctx.beginPath(); ctx.ellipse(X, Y, 0.9, 0.45, 0, 0, Math.PI * 2);
        ctx.strokeStyle = alpha(C.white, 0.5); ctx.lineWidth = 0.04; ctx.setLineDash([0.15, 0.15]); ctx.stroke(); ctx.setLineDash([]);
      }
    });

    // A skate with no owner, rolling laps on its own (a find). It ignores REVERSE.
    const lone = (t) => {
      const a = t * 0.22 + 2;
      return { x: CX + Math.cos(a) * 2.5 + Math.sin(t * 0.7) * 0.2, y: CY + Math.sin(a) * 2.0, a };
    };
    R.mover(lone, (ctx, t, p) => {
      const [X, Y] = P(p.x, p.y, 0);
      const vx = -Math.sin(p.a), vy = Math.cos(p.a);
      ctx.save();
      ctx.translate(X, Y);
      ctx.scale(vx - vy >= 0 ? 1 : -1, 1);
      skate(ctx, 0, 0, 0.8, C.lilac, C.teal, t * 8);
      ctx.restore();
      if (Q.detail) {
        const [X2, Y2] = P(p.x, p.y, 0.9);
        const k = pulse(t, 2);
        ctx.fillStyle = alpha(C.white, 0.7 * (1 - k));
        ctx.beginPath(); ctx.arc(X2 - 0.3, Y2 - k * 0.4, 0.05, 0, Math.PI * 2); ctx.fill();
      }
    });
    R.find({ id: 'skate', label: 'A skate with no owner', r: 0.8, at: (t) => { const p = lone(t); return [p.x, p.y, 0.35]; } });

    // ---------- the one who just fell over ----------
    R.mover(() => ({ x: 13.5, y: 11.9 }), (ctx, t) => {
      person(ctx, 13.5, 11.9, 0, folk(120, { pose: 'sit', dir: 'l', top: C.green, style: 'bun', hair: C.coral, arms: [0.3, -0.5] }), t);
      if (!Q.detail) return;
      const [X, Y] = P(13.5, 11.9, 0);
      const hx = X - 0.02, hy = Y - 1.75;
      for (let i = 0; i < 3; i++) {
        const a = t * 4 + (i / 3) * Math.PI * 2;
        const sx = hx + Math.cos(a) * 0.55, sy = hy - 0.45 + Math.sin(a) * 0.18;
        star(ctx, sx, sy, 0.16, i % 2 ? C.butter : C.white);
      }
    });
    // friend offering a hand (and a laugh)
    R.mover(() => ({ x: 14.9, y: 10.6 }), (ctx, t) => {
      const lol = pulse(t, 5) < 0.35;
      skater(ctx, 14.9, 10.6, 0, folk(121, { pose: 'skate', dir: 'l', top: C.coral, speed: 2, arms: [lol ? 2.6 : 0.9, 0.2] }), t);
      if (lol && Q.detail) speech(ctx, 14.9, 10.6, 3.0, 'HA!', { size: 0.45 });
    });
    // the lost earring (a find), glinting on the floor
    R.rug((ctx, t) => {
      const [X, Y] = P(12.9, 12.7, 0.03);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.16, 0.1, 0.3, 0, Math.PI * 2);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.08; ctx.stroke();
      ctx.strokeStyle = C.mustard; ctx.lineWidth = 0.05; ctx.stroke();
      ctx.beginPath(); ctx.arc(X + 0.02, Y + 0.12, 0.06, 0, Math.PI * 2); paint(ctx, C.pink, { lw: 0.02 });
      if (Q.detail) {
        const g = Math.max(0, Math.sin(t * 2.2));
        if (g > 0.3) {
          ctx.beginPath();
          ctx.moveTo(X + 0.15 - g * 0.3, Y - 0.1); ctx.lineTo(X + 0.15 + g * 0.3, Y - 0.1);
          ctx.moveTo(X + 0.15, Y - 0.1 - g * 0.3); ctx.lineTo(X + 0.15, Y - 0.1 + g * 0.3);
          ctx.strokeStyle = C.white; ctx.lineWidth = 0.04; ctx.stroke();
        }
      }
    }, { anim: true });
    R.find({ id: 'earring', label: 'A lost earring', at: [12.9, 12.7, 0.05], r: 0.6 });
  },
};

function label(ctx, x, y, z, text, size, color) {
  const [X, Y] = P(x, y, z);
  txt(ctx, X, Y, text, size, color);
}

function noteGlyph(ctx, X, Y, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.06;
  ctx.beginPath(); ctx.ellipse(X, Y, 0.14, 0.1, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(X + 0.12, Y - 0.02); ctx.lineTo(X + 0.12, Y - 0.5); ctx.lineTo(X + 0.3, Y - 0.38); ctx.stroke();
}

function speaker(ctx, x, t) {
  box(ctx, x, 0.1, 0, 1.2, 0.9, 2.8, C.black, { top: C.ink, lw: 0.05 });
  for (const [z, r] of [[0.8, 0.42], [1.9, 0.3], [2.5, 0.14]]) {
    const beat = Math.abs(Math.sin(t * Math.PI * 2)) * (r > 0.2 ? 0.07 : 0.02);
    const [X, Y] = P(x + 0.6, 1.0, z);
    ctx.beginPath(); ctx.ellipse(X, Y, r + beat, (r + beat) * 1.1, -0.45, 0, Math.PI * 2);
    paint(ctx, C.grey, { lw: 0.04 });
    ctx.beginPath(); ctx.ellipse(X, Y, (r + beat) * 0.4, (r + beat) * 0.45, -0.45, 0, Math.PI * 2);
    paint(ctx, C.ink, { lw: 0.03 });
  }
}
