// Apartment 3A: four roommates who share nothing but a flat. A tuba that
// knocks the yogi over, a cook who sets off the smoke alarm on schedule, a DJ
// in giant headphones, and a bath the goose has claimed, overflowing into 2B.
import {
  C, box, rect, disc, cylinder, face, paint, person, folk, walls, slab, planks, tiles, checker,
  speech, shade, tint, alpha, mix, Q, label, P, paintText, onLeft, onRight, windowL, windowR,
  frame, note, rug, chair, table, lamp,
} from '../../../engine/art.js';
import { route, particles, pulse, clamp, ease } from '../../../engine/actors.js';
import { ZK } from '../../../engine/iso.js';

const GINGER = mix(C.mustard, C.coral, 0.45);
const BRASS = C.mustard;
const TUB = { x0: 0.3, y0: 0.3, x1: 4.0, y1: 2.4, h: 1.15 };
const SMOKE_T = 12; // the cooking disaster loop
const TUBA_T = 8; // the PARP loop

// Draw in the plane of a surface. 'y' plane: u runs along x. 'x' plane: u runs along y. v is up.
function onPlane(ctx, plane, x, y, z, fn) {
  const X = x - y, Y = (x + y) / 2 - z * ZK;
  ctx.save();
  if (plane === 'y') ctx.transform(1, 0.5, 0, -ZK, X, Y);
  else ctx.transform(-1, 0.5, 0, -ZK, X, Y);
  fn(ctx);
  ctx.restore();
}

// Text on a wall-like plane that is not the room's back wall.
function textY(ctx, yPlane, u, v, text, size, color) {
  ctx.save();
  ctx.translate(-yPlane, yPlane / 2);
  paintText(ctx, 'right', u, v, text, size, color);
  ctx.restore();
}

// Draw something at a person's near hand, in that person's local (flipped, scaled) space.
function atHand(ctx, x, y, z, dir, s, arm, fn, lift = 0) {
  const X = x - y, Y = (x + y) / 2 - z * ZK;
  const shoulderY = -0.8 - 0.85 + 0.12;
  const hx = 0.22 + Math.sin(arm) * 0.72, hy = shoulderY + Math.cos(arm) * 0.72;
  ctx.save();
  ctx.translate(X, Y - lift);
  ctx.scale(dir === 'l' ? -s : s, s);
  ctx.translate(hx, hy);
  fn(ctx);
  ctx.restore();
}

// Giant headphones over a standing person's head.
function headphones(ctx, x, y, z, dir, lift = 0) {
  const X = x - y, Y = (x + y) / 2 - z * ZK - lift;
  const hy = Y - 1.95;
  const f = dir === 'l' ? -1 : 1;
  ctx.beginPath();
  ctx.arc(X + 0.02 * f, hy - 0.02, 0.43, Math.PI * 1.05, Math.PI * 1.95);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.16;
  ctx.stroke();
  ctx.strokeStyle = C.coral;
  ctx.lineWidth = 0.08;
  ctx.stroke();
  for (const dx of [-0.4, 0.42]) {
    ctx.beginPath();
    ctx.ellipse(X + dx * f, hy + 0.04, 0.17, 0.25, 0, 0, Math.PI * 2);
    paint(ctx, dx < 0 ? C.coral : C.navy, { lw: 0.05 });
  }
}

// A plant that has given up.
function sadPlant(ctx, x, y, z, t, s = 1, leaf = C.wood) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(-0.28, -0.5); ctx.lineTo(0.28, -0.5); ctx.lineTo(0.2, 0); ctx.lineTo(-0.2, 0);
  ctx.closePath();
  paint(ctx, C.coralLight, { dots: C.coral, density: 0.25, lw: 0.05 });
  const droop = Math.sin(t * 0.8 + x) * 0.05;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const side = i % 2 ? 1 : -1;
    const hgt = 0.6 + (i % 3) * 0.2;
    ctx.beginPath();
    ctx.moveTo(0, -0.5);
    ctx.quadraticCurveTo(side * 0.1, -0.5 - hgt, side * (0.35 + i * 0.08), -0.5 - hgt * 0.35 + droop);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.09;
    ctx.stroke();
    ctx.strokeStyle = i === 3 ? C.brown : C.mustard;
    ctx.lineWidth = 0.05;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(side * (0.38 + i * 0.08), -0.5 - hgt * 0.3 + droop, 0.07, 0.14, side * 0.4, 0, Math.PI * 2);
    paint(ctx, i === 2 ? leaf : C.brown, { lw: 0.03 });
  }
  ctx.restore();
}

// A little pile of soap bubbles (for the bath).
function foam(ctx, blobs, t) {
  for (const [x, y, z, r, ph] of blobs) {
    const [X, Y] = P(x, y, z);
    const rr = r * (1 + Math.sin(t * 2 + ph) * 0.06);
    ctx.beginPath();
    ctx.arc(X, Y - rr * 0.6, rr, 0, Math.PI * 2);
    paint(ctx, C.white, { dots: Q.detail ? C.sky : null, density: 0.18, lw: 0.04, stroke: C.grey });
  }
  if (!Q.detail) return;
  ctx.fillStyle = alpha(C.white, 0.9);
  for (const [x, y, z, r] of blobs) {
    if (r < 0.2) continue;
    const [X, Y] = P(x, y, z);
    ctx.beginPath();
    ctx.arc(X - r * 0.35, Y - r * 1.0, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }
}

function tuba(ctx) {
  // body coil
  ctx.beginPath();
  ctx.ellipse(-0.05, 0.25, 0.3, 0.38, 0, 0, Math.PI * 2);
  paint(ctx, BRASS, { dots: shade(BRASS, 0.4), density: 0.25, lw: 0.05 });
  ctx.beginPath();
  ctx.ellipse(-0.05, 0.25, 0.14, 0.2, 0, 0, Math.PI * 2);
  paint(ctx, tint(BRASS, 0.3), { lw: 0.04 });
  // valves
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.rect(0.14 + i * 0.08, -0.05, 0.05, 0.22);
    paint(ctx, C.greyLight, { lw: 0.02 });
  }
  // bell, flaring up
  ctx.beginPath();
  ctx.moveTo(0.05, -0.05);
  ctx.lineTo(0.02, -0.7);
  ctx.quadraticCurveTo(0.0, -0.95, -0.25, -1.1);
  ctx.lineTo(0.55, -1.1);
  ctx.quadraticCurveTo(0.28, -0.95, 0.26, -0.7);
  ctx.lineTo(0.22, -0.05);
  ctx.closePath();
  paint(ctx, BRASS, { dots: shade(BRASS, 0.4), density: 0.2, lw: 0.05 });
  ctx.beginPath();
  ctx.ellipse(0.15, -1.1, 0.4, 0.09, 0, 0, Math.PI * 2);
  paint(ctx, shade(BRASS, 0.35), { lw: 0.05 });
}

export default {
  id: 'flat3',
  name: '3A, The Roommates',
  blurb: 'Four roommates, one bathroom, zero agreements. The goose has taken the bath and 2B would like a word about the ceiling.',

  build(R) {
    // ---------- Shell ----------
    R.floor((ctx) => {
      slab(ctx, C.greyLight);
      planks(ctx, C.woodLight, 1);
    });
    R.wall((ctx) => walls(ctx, {
      left: C.blush, right: C.butter, cap: C.paper,
      dotsL: C.pink, densL: 0.12, dotsR: C.mustard, densR: 0.14,
    }));

    // Floors of the different "rooms"
    R.rug((ctx) => {
      // bathroom tiles
      rect(ctx, 0, 0, 5.2, 5.4, 0.005, C.mint, { stroke: false });
      tiles(ctx, 0.65, alpha(C.teal, 0.5), 0.03, 0, 0, 5.2, 5.4);
      // kitchen lino
      checker(ctx, C.white, C.greyLight, 0.8, 5.2, 0, 7.2, 3.6);
      rect(ctx, 5.2, 0, 7.2, 3.6, 0.005, null, { lw: 0.04 });
      // living room rugs, none of which match
      rug(ctx, 2.6, 10.0, 3.8, 5.0, C.teal, C.coral);
      disc(ctx, 14.1, 9.9, 0.01, 1.7, C.mustard, { dots: C.coral, density: 0.2, lw: 0.04 });
      disc(ctx, 14.1, 9.9, 0.012, 1.1, C.butter, { stroke: false });
      // yoga mat
      rect(ctx, 6.2, 8.3, 1.4, 3.4, 0.02, C.purple, { dots: C.lilac, density: 0.25, lw: 0.04 });
    });

    // ---------- Walls: bathroom tiles, windows, posters, the chore wheel ----------
    R.decor((ctx) => {
      // bathroom wall tiles
      onRight(ctx, 0, 0, 5.2, 3.0, C.mint, { dots: C.tealLight, density: 0.12 });
      onLeft(ctx, 0, 0, 5.4, 3.0, C.mint, { dots: C.tealLight, density: 0.12 });
      if (Q.detail) {
        for (let z = 0.6; z < 3; z += 0.6) {
          face(ctx, [[0, 0, z], [5.2, 0, z]], null, { lw: 0.02, stroke: C.teal });
          face(ctx, [[0, 0, z], [0, 5.4, z]], null, { lw: 0.02, stroke: C.teal });
        }
      }
      // little frosted bathroom window and a shampoo shelf
      windowR(ctx, 1.2, 3.4, 1.8, 1.4, C.mint, C.white);
      onRight(ctx, 0.9, 2.7, 2.6, 0.12, C.white);
      [[1.0, 0.5, C.pink], [1.35, 0.35, C.teal], [1.65, 0.55, C.mustard], [2.1, 0.3, C.coral], [2.5, 0.45, C.purple], [2.9, 0.4, C.green]].forEach(([x, h, c]) => {
        box(ctx, x, 0.02, 2.82, 0.24, 0.2, h, c, { flat: true, lw: 0.03 });
      });
      // mirror by the loo
      onLeft(ctx, 2.95, 3.4, 1.2, 1.3, C.white);
      onLeft(ctx, 3.05, 3.5, 1.0, 1.1, C.sky, { dots: C.white, density: 0.3 });

      // kitchen: backsplash, upper cabinets, the alarm
      onRight(ctx, 5.4, 1.3, 4.9, 1.1, C.white, { dots: C.greyLight, density: 0.3 });
      // right-wall window over dead plants
      windowR(ctx, 12.8, 2.35, 2.5, 2.3, C.sky, C.white);
      // a painted sign by the window
      paintText(ctx, 'right', 14.05, 5.25, 'APT 3A', 0.5, C.coral);

      // left wall: band poster
      frame(ctx, 'left', 6.9, 2.9, 2.5, 2.5, C.coral, (g) => {
        paintText(g, 'left', 8.15, 4.8, 'THE LEAKS', 0.42, C.white);
        paintText(g, 'left', 8.15, 4.25, 'REUNION', 0.3, C.ink);
        paintText(g, 'left', 8.15, 3.85, 'TOUR', 0.3, C.ink);
        // a big drip
        face(g, [[0, 7.9, 3.2], [0, 8.4, 3.2], [0, 8.15, 3.75]], C.sky, { lw: 0.04 });
        const [X, Y] = P(0, 8.15, 3.2);
        g.beginPath();
        g.ellipse(X, Y + 0.05, 0.25, 0.2, -0.46, 0, Math.PI * 2);
        paint(g, C.sky, { lw: 0.04 });
      });
      // left wall: window and the front door
      windowL(ctx, 12.2, 2.2, 1.8, 2.3, C.sky, C.white);
      onLeft(ctx, 14.3, 0, 1.5, 3.3, C.ink);
      onLeft(ctx, 14.42, 0, 1.26, 3.18, C.night, { dots: C.navy, density: 0.4, stroke: false });
      paintText(ctx, 'left', 15.05, 3.65, '3A', 0.4, C.navy);
      paintText(ctx, 'left', 10.6, 5.3, 'CHORES', 0.45, C.navy);
      // sticky notes of passive aggression
      [[5.6, 2.4, C.butter], [5.95, 2.1, C.pink], [5.7, 1.8, C.mint]].forEach(([y, z, c]) => onLeft(ctx, y, z, 0.35, 0.35, c, { lw: 0.03 }));
    });

    // The chore wheel: it spins sometimes, nobody reads it
    R.decor((ctx, t) => {
      const k = pulse(t, 9);
      const spin = k < 0.25 ? ease(k / 0.25) * Math.PI * 3.5 : Math.PI * 3.5;
      const a0 = Math.floor(t / 9) * Math.PI * 3.5 + spin;
      onPlane(ctx, 'x', 0, 10.6, 3.9, (g) => {
        g.beginPath();
        g.arc(0, 0, 0.95, 0, Math.PI * 2);
        paint(g, C.white, { lw: 0.06 });
        const cols = [C.coral, C.teal, C.mustard, C.lilac];
        const words = ['DISHES', 'BINS', 'BATH', 'CAT'];
        for (let i = 0; i < 4; i++) {
          const a = a0 + (i * Math.PI) / 2;
          g.beginPath();
          g.moveTo(0, 0);
          g.arc(0, 0, 0.85, a, a + Math.PI / 2);
          g.closePath();
          paint(g, cols[i], { lw: 0.03 });
          if (Q.detail) {
            g.save();
            g.rotate(a + Math.PI / 4);
            g.scale(1 / 40, 1 / 40);
            g.font = '9px "Bagel Fat One", "Arial Black", sans-serif';
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            g.fillStyle = C.ink;
            g.fillText(words[i], 20, 0);
            g.restore();
          }
        }
        g.beginPath();
        g.arc(0, 0, 0.1, 0, Math.PI * 2);
        paint(g, C.ink);
        // pointer
        g.beginPath();
        g.moveTo(-0.14, 1.12); g.lineTo(0.14, 1.12); g.lineTo(0, 0.82);
        g.closePath();
        paint(g, C.red, { lw: 0.03 });
      });
    }, { anim: true });

    // Smoke alarm on the right wall, blinking and then panicking
    R.decor((ctx, t) => {
      const k = pulse(t, SMOKE_T);
      const loud = k > 0.45 && k < 0.85;
      onPlane(ctx, 'y', 7.8, 0, 5.05, (g) => {
        g.beginPath();
        g.ellipse(0, 0, 0.36, 0.22, 0, 0, Math.PI * 2);
        paint(g, C.white, { lw: 0.05 });
        const on = loud ? Math.sin(t * 20) > 0 : pulse(t, 2) < 0.12;
        g.beginPath();
        g.arc(0.14, 0.02, 0.07, 0, Math.PI * 2);
        g.fillStyle = on ? C.red : shade(C.red, 0.5);
        g.fill();
      });
      if (loud && Q.detail && k > 0.5) speech(ctx, 8.4, 0, 5.4, 'BEEP BEEP BEEP', { size: 0.42, fill: C.butter });
    }, { anim: true });

    // A roof pigeon peering in through the kitchen window
    R.decor((ctx, t) => {
      if (!Q.detail) return;
      const k = pulse(t, 14);
      const x = 13.2 + clamp((k - 0.1) * 5) * 1.3 - clamp((k - 0.7) * 5) * 1.3;
      const bob = Math.abs(Math.sin(t * 5)) * 0.05;
      onPlane(ctx, 'y', x, 0, 2.45 + bob, (g) => {
        g.beginPath();
        g.ellipse(0, 0.25, 0.3, 0.2, 0, 0, Math.PI * 2);
        g.arc(0.25, 0.48, 0.12, 0, Math.PI * 2);
        g.fillStyle = alpha(C.navy, 0.55);
        g.fill();
        g.beginPath();
        g.arc(0.29, 0.5, 0.03, 0, Math.PI * 2);
        g.fillStyle = C.coral;
        g.fill();
      });
    }, { anim: true });

    // ---------- Bathroom ----------
    // The tub, brimming
    const T = TUB;
    R.thing(1.0, 1.0, (ctx) => {
      box(ctx, T.x0, T.y0, 0.2, T.x1 - T.x0, T.y1 - T.y0, T.h - 0.2, C.white, { top: C.white });
      for (const [fx, fy] of [[T.x0 + 0.3, T.y1 - 0.2], [T.x1 - 0.3, T.y1 - 0.2], [T.x1 - 0.3, T.y0 + 0.2]]) {
        cylinder(ctx, fx, fy, 0, 0.14, 0.22, BRASS, { flat: true });
      }
      // taps on the wall end
      box(ctx, T.x0 + 0.05, 1.2, T.h, 0.3, 0.12, 0.35, C.grey, { flat: true });
      // shower curtain rail and bunched curtain
      const rail = [P(T.x0, T.y1, 3.7), P(T.x1, T.y1, 3.7), P(T.x1, T.y0, 3.7)];
      ctx.beginPath();
      rail.forEach(([X, Y], i) => (i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y)));
      ctx.strokeStyle = C.grey;
      ctx.lineWidth = 0.07;
      ctx.stroke();
      // the curtain, bunched up at the far end
      for (let i = 0; i < 4; i++) {
        const y = T.y0 + i * 0.16;
        face(ctx, [[T.x1, y, 3.7], [T.x1, y + 0.2, 3.7], [T.x1 + 0.05, y + 0.25, 1.7], [T.x1 + 0.05, y + 0.02, 1.7]], i % 2 ? C.lilac : C.white, { lw: 0.03 });
      }
    });
    // The water surface and rising bubbles
    R.thing(1.05, 1.05, (ctx, t) => {
      rect(ctx, T.x0 + 0.15, T.y0 + 0.15, T.x1 - T.x0 - 0.3, T.y1 - T.y0 - 0.3, T.h, C.water, { dots: C.teal, density: 0.2, lw: 0.03 });
      foam(ctx, [
        [0.9, 0.7, T.h, 0.34, 0], [1.4, 0.6, T.h, 0.28, 1], [0.7, 1.4, T.h, 0.3, 2], [3.3, 0.7, T.h, 0.36, 3],
        [3.6, 1.2, T.h, 0.26, 4], [2.9, 0.55, T.h, 0.25, 5], [2.0, 0.55, T.h, 0.22, 6],
      ], t);
    }, { anim: true });
    // A rubber duck bobbing in there too (the goose is ignoring it)
    R.mover((t) => ({ x: 1.5 + Math.sin(t * 0.7) * 0.3, y: 1.0, z: T.h + Math.sin(t * 2) * 0.03 }), (ctx, t, p) => {
      const [X, Y] = P(p.x, p.y, p.z);
      ctx.beginPath();
      ctx.ellipse(X, Y - 0.1, 0.22, 0.13, 0, 0, Math.PI * 2);
      ctx.arc(X + 0.12, Y - 0.3, 0.1, 0, Math.PI * 2);
      paint(ctx, C.mustard, { lw: 0.035 });
      ctx.beginPath();
      ctx.moveTo(X + 0.2, Y - 0.3); ctx.lineTo(X + 0.32, Y - 0.27); ctx.lineTo(X + 0.2, Y - 0.24);
      ctx.fillStyle = C.coral;
      ctx.fill();
    }, { depth: 2.15 });

    // THE GOOSE: has taken the bath and will not be leaving
    const gooseAt = (t) => ({ x: 2.7 + Math.sin(t * 0.5) * 0.25, y: 1.5, z: T.h - 0.05, dir: Math.sin(t * 0.25) > -0.6 ? 'r' : 'l', pose: 'swim' });
    R.goose(gooseAt, { bias: -2 });
    // ...wearing a shower cap, obviously
    R.mover(gooseAt, (ctx, t, p) => {
      const [X, Y] = P(p.x, p.y, p.z);
      const f = p.dir === 'l' ? -1 : 1;
      const hx = X + 0.26 * f, hy = Y - 0.05 - 0.62 - 0.1;
      ctx.beginPath();
      ctx.ellipse(hx, hy, 0.19, 0.12, 0, Math.PI, 0);
      ctx.lineTo(hx + 0.2, hy + 0.02);
      ctx.lineTo(hx - 0.2, hy + 0.02);
      ctx.closePath();
      paint(ctx, C.pink, { dots: C.white, density: 0.45, lw: 0.035 });
    }, { bias: -1.95 });

    // Foam spilling over the front of the tub, and water running down the side
    R.thing(4.3, 2.5, (ctx, t) => {
      foam(ctx, [
        [0.9, 2.35, T.h - 0.05, 0.3, 0], [1.5, 2.4, T.h - 0.1, 0.24, 1], [2.1, 2.35, T.h - 0.02, 0.33, 2],
        [2.75, 2.4, T.h - 0.12, 0.22, 3], [3.4, 2.35, T.h - 0.05, 0.3, 4], [3.9, 2.0, T.h - 0.05, 0.26, 5],
        [1.2, 2.45, 0.55, 0.16, 6], [2.5, 2.45, 0.35, 0.14, 7], [3.7, 2.45, 0.7, 0.12, 8],
      ], t);
      if (!Q.detail) return;
      // streams down the front face
      ctx.lineCap = 'round';
      for (const sx of [0.8, 1.8, 3.1]) {
        const off = (t * 1.4 + sx) % 1;
        ctx.strokeStyle = alpha(C.water, 0.8);
        ctx.lineWidth = 0.1;
        face(ctx, [[sx, T.y1 + 0.02, T.h - 0.2], [sx + 0.05, T.y1 + 0.02, 0.05]], null, { lw: 0.1, stroke: alpha(C.water, 0.7) });
        const [X, Y] = P(sx + 0.03, T.y1 + 0.02, (1 - off) * (T.h - 0.2));
        ctx.beginPath();
        ctx.arc(X, Y, 0.06, 0, Math.PI * 2);
        ctx.fillStyle = C.white;
        ctx.fill();
      }
    }, { anim: true });

    // Bubbles drifting up out of the bath
    R.air((ctx, t) => {
      const n = Q.detail ? 18 : 6;
      particles(t, n, 4.5, (q, r) => {
        const x = T.x0 + 0.4 + r() * (T.x1 - T.x0 - 0.8) + q * (r() - 0.3) * 2;
        const y = T.y0 + 0.3 + r() * (T.y1 - T.y0 - 0.6) + q * r() * 1.5;
        const z = T.h + 0.3 + q * (3 + r() * 2.5);
        const [X, Y] = P(x + Math.sin(q * 8 + r() * 6) * 0.2, y, z);
        const rad = 0.07 + r() * 0.13;
        ctx.beginPath();
        ctx.arc(X, Y, rad, 0, Math.PI * 2);
        ctx.fillStyle = alpha(C.white, 0.35 * (1 - q));
        ctx.fill();
        ctx.strokeStyle = alpha(C.teal, 0.8 * (1 - q));
        ctx.lineWidth = 0.03;
        ctx.stroke();
      }, 5);
    });

    // The puddle, creeping out of the bathroom, with a crack leading down to 2B
    R.rug((ctx, t) => {
      const g = Math.sin(t * 0.4) * 0.12;
      const pts = [
        [0.6, 2.5], [4.1, 2.5], [4.9, 3.1], [5.8 + g, 4.4], [5.6, 5.6 + g], [4.6 + g, 6.4], [3.4, 6.9 + g],
        [2.4, 6.2], [1.6 + g, 5.0], [0.8, 4.4], [0.5, 3.2],
      ];
      ctx.beginPath();
      pts.forEach(([x, y], i) => {
        const [X, Y] = P(x, y, 0.02);
        i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      });
      ctx.closePath();
      paint(ctx, alpha(C.water, 0.7), { dots: C.white, density: 0.08, lw: 0.04, stroke: C.teal });
      // crack in the floor where it all drains down to 2B
      face(ctx, [[3.4, 5.2, 0.03], [3.8, 5.6, 0.03], [3.6, 5.9, 0.03], [4.1, 6.3, 0.03]], null, { lw: 0.08, stroke: C.ink });
      if (!Q.detail) return;
      // ripples where drops land
      particles(t, 5, 1.6, (k, r) => {
        const x = 1.2 + r() * 3.8, y = 2.8 + r() * 3;
        const [X, Y] = P(x, y, 0.03);
        ctx.beginPath();
        ctx.ellipse(X, Y, 0.1 + k * 0.5, (0.1 + k * 0.5) / 2, 0, 0, Math.PI * 2);
        ctx.strokeStyle = alpha(C.white, 1 - k);
        ctx.lineWidth = 0.05;
        ctx.stroke();
      }, 31);
      // swirl into the crack
      const [X, Y] = P(3.7, 5.7, 0.03);
      ctx.beginPath();
      ctx.ellipse(X, Y, 0.35, 0.17, 0, t * 3, t * 3 + 4);
      ctx.strokeStyle = alpha(C.white, 0.8);
      ctx.lineWidth = 0.05;
      ctx.stroke();
    }, { anim: true });

    // Toilet against the left wall, with a toilet-roll pyramid
    R.thing(1.2, 4.1, (ctx) => {
      box(ctx, 0.1, 3.15, 0.8, 0.45, 0.9, 1.1, C.white);
      cylinder(ctx, 0.95, 3.6, 0, 0.3, 0.45, C.white);
      disc(ctx, 0.95, 3.6, 0.8, 0.46, C.white, { lw: 0.05 });
      disc(ctx, 0.95, 3.6, 0.82, 0.32, C.sky, { lw: 0.03 });
      for (const [dx, dy, dz] of [[0, 0, 0], [0, 0.34, 0], [0, 0.17, 0.3]]) cylinder(ctx, 0.3, 4.45 + dy, dz, 0.15, 0.3, C.white, { flat: true });
    });

    // Waiting for the bathroom, very urgently
    R.mover((t) => ({ x: 5.9, y: 3.7, z: Math.abs(Math.sin(t * 7)) * 0.12 }), (ctx, t, p) => {
      person(ctx, p.x, p.y, p.z, folk(301, { pose: 'stand', dir: 'l', back: true, arms: [0.9 + Math.sin(t * 7) * 0.2, -0.4], top: C.pink, style: 'bun', hair: C.brown }), t);
      atHand(ctx, p.x, p.y, p.z, 'l', 1, 0.9 + Math.sin(t * 7) * 0.2, (g) => {
        g.beginPath();
        g.roundRect(-0.1, -0.05, 0.5, 0.7, 0.05);
        paint(g, C.teal, { dots: C.white, density: 0.3, lw: 0.04 });
      }, 0);
      const k = pulse(t, 10);
      if (Q.detail && k > 0.05 && k < 0.35) speech(ctx, p.x - 0.4, p.y - 0.3, 2.9, 'HURRY UP!', { size: 0.42 });
    }, { bias: 0 });

    // The mopper, fighting a losing battle
    const mop = route([[3.6, 5.8], [5.6, 5.0, 0.6], [4.4, 3.3], [2.5, 4.8, 0.6]], { speed: 0.7 });
    R.mover(mop, (ctx, t, p) => {
      const arm = 0.85 + Math.sin(t * 6) * 0.15;
      atHand(ctx, p.x, p.y, 0, p.dir, 0.95, arm, (g) => {
        g.beginPath();
        g.moveTo(-0.1, -0.3);
        g.lineTo(0.35, 1.2);
        g.strokeStyle = C.brown;
        g.lineWidth = 0.08;
        g.stroke();
        g.beginPath();
        g.ellipse(0.38, 1.3, 0.28, 0.1, 0, 0, Math.PI * 2);
        paint(g, C.greyLight, { lw: 0.04 });
      });
      person(ctx, p.x, p.y, 0, folk(302, { pose: p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back, arms: [arm, arm - 0.3], scale: 0.95, top: C.green, hat: 'beanie' }), t);
    });

    // ---------- Kitchen ----------
    // Counter, stove, sink with a dish mountain, upper cabinets
    R.thing(5.4, 1.3, (ctx) => {
      box(ctx, 5.4, 0, 0, 1.6, 1.3, 1.3, C.teal, { top: C.white });
      box(ctx, 8.4, 0, 0, 1.9, 1.3, 1.3, C.teal, { top: C.white });
      box(ctx, 7.0, 0, 0, 1.4, 1.3, 1.3, C.greyLight, { top: C.ink });
      // oven door
      face(ctx, [[7.15, 1.3, 0.2], [8.25, 1.3, 0.2], [8.25, 1.3, 0.95], [7.15, 1.3, 0.95]], C.navy, { lw: 0.04 });
      for (const [bx, by] of [[7.35, 0.35], [8.05, 0.35], [7.35, 0.95], [8.05, 0.95]]) disc(ctx, bx, by, 1.31, 0.2, C.grey, { lw: 0.03 });
      // cupboard doors
      for (const x of [5.5, 6.25, 8.5, 9.4]) face(ctx, [[x, 1.3, 0.15], [x + 0.65, 1.3, 0.15], [x + 0.65, 1.3, 1.1], [x, 1.3, 1.1]], null, { lw: 0.03 });
      // sink and the dishes nobody washed
      rect(ctx, 9.0, 0.25, 1.0, 0.8, 1.31, C.grey, { lw: 0.03 });
      for (let i = 0; i < 9; i++) disc(ctx, 9.5 + Math.sin(i * 1.7) * 0.08, 0.65 + Math.cos(i * 2.3) * 0.06, 1.35 + i * 0.12, 0.34 - (i % 3) * 0.03, i % 3 === 1 ? C.coralLight : C.white, { lw: 0.03 });
      cylinder(ctx, 9.2, 0.35, 2.45, 0.12, 0.25, C.teal, { flat: true });
      // toaster and a kettle
      box(ctx, 5.6, 0.3, 1.3, 0.7, 0.45, 0.45, C.grey);
      cylinder(ctx, 6.6, 0.55, 1.3, 0.22, 0.5, C.red);
      // upper cabinets
      box(ctx, 5.4, 0, 3.4, 1.5, 0.7, 1.2, C.tealLight);
      box(ctx, 8.8, 0, 3.4, 1.5, 0.7, 1.2, C.tealLight);
      // cereal boxes on top
      box(ctx, 5.6, 0.1, 4.6, 0.5, 0.25, 0.7, C.coral, { flat: true });
      box(ctx, 6.2, 0.1, 4.6, 0.45, 0.25, 0.55, C.mustard, { flat: true });
      box(ctx, 9.2, 0.1, 4.6, 0.8, 0.3, 0.3, C.purple, { flat: true });
    });

    // The pan, the pancake and its occasional flight
    R.mover((t) => ({ x: 7.75, y: 1.1 }), (ctx, t) => {
      const k = pulse(t, SMOKE_T);
      disc(ctx, 7.4, 0.95, 1.36, 0.36, C.ink, { lw: 0.04 });
      face(ctx, [[7.6, 1.2, 1.4], [8.2, 1.9, 1.45]], null, { lw: 0.1, stroke: C.ink });
      let pz = 1.42, px = 7.4, py = 0.95, burnt = clamp(k * 1.4);
      if (k > 0.86 && k < 0.98) {
        const q = (k - 0.86) / 0.12;
        pz = 1.42 + Math.sin(q * Math.PI) * 2.6;
      }
      const [X, Y] = P(px, py, pz);
      ctx.save();
      ctx.translate(X, Y);
      if (pz > 1.43) ctx.scale(1, Math.cos(t * 12));
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.36, 0.18, 0, 0, Math.PI * 2);
      paint(ctx, mix(C.butter, C.black, burnt * 0.75), { lw: 0.03 });
      ctx.restore();
    }, { bias: -0.2 });

    // The cook, flipping with confidence and no success
    R.mover((t) => ({ x: 6.7, y: 2.1 }), (ctx, t) => {
      const k = pulse(t, SMOKE_T);
      const flip = k > 0.84 && k < 0.98;
      const arm = flip ? 2.4 : 1.2 + Math.sin(t * 3) * 0.1;
      person(ctx, 6.7, 2.1, 0, folk(303, { pose: 'stand', dir: 'r', back: true, hat: 'chef', top: C.white, bottom: C.navy, arms: [arm, 1.0] }), t);
      atHand(ctx, 6.7, 2.1, 0, 'r', 1, arm, (g) => {
        g.beginPath();
        g.moveTo(0, 0); g.lineTo(0.1, 0.5);
        g.strokeStyle = C.ink; g.lineWidth = 0.07; g.stroke();
        g.beginPath();
        g.roundRect(0.0, 0.45, 0.25, 0.2, 0.04);
        paint(g, C.grey, { lw: 0.03 });
      });
    });

    // Chair plus roommate on it, fanning the alarm with a tea towel
    R.thing(9.9, 3.2, (ctx) => chair(ctx, 9.1, 2.4, 0, C.coral, 'r'));
    R.mover((t) => ({ x: 9.55, y: 2.8 }), (ctx, t) => {
      const k = pulse(t, SMOKE_T);
      const fast = k > 0.45 && k < 0.9;
      const arm = Math.PI - 0.7 + Math.sin(t * (fast ? 14 : 5)) * 0.55;
      person(ctx, 9.55, 2.8, 0.95, folk(304, { pose: 'stand', dir: 'l', back: true, arms: [arm, -1.9], top: C.sky, style: 'curly', hair: C.ink }), t);
      atHand(ctx, 9.55, 2.8, 0.95, 'l', 1, arm, (g) => {
        g.rotate(Math.sin(t * (fast ? 14 : 5)) * 0.5);
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(0.4, -0.3, 0.7, -0.1);
        g.lineTo(0.75, 0.5);
        g.quadraticCurveTo(0.4, 0.3, 0.05, 0.55);
        g.closePath();
        paint(g, C.white, { dots: C.red, density: 0.35, lw: 0.04 });
      });
    }, { bias: 1.5 });

    // Smoke, thicker as the pancake gets worse
    R.air((ctx, t) => {
      const k = pulse(t, SMOKE_T);
      const I = k < 0.75 ? 0.25 + (k / 0.75) * 0.75 : 1 - ((k - 0.75) / 0.25) * 0.8;
      const n = Q.detail ? 14 : 5;
      particles(t, n, 3.2, (q, r) => {
        const x = 7.4 + (r() - 0.3) * 0.8 + q * 1.2 * (r() - 0.2);
        const y = 0.95 + q * (0.8 + r() * 1.5);
        const z = 1.6 + q * (3.2 + r() * 1.6);
        const rad = 0.18 + q * 0.5 * (0.5 + I);
        const [X, Y] = P(x, y, z);
        ctx.beginPath();
        ctx.arc(X, Y, rad, 0, Math.PI * 2);
        ctx.fillStyle = alpha(mix(C.grey, C.ink, 0.3), 0.7 * I * (1 - q * 0.8));
        ctx.fill();
      }, 9);
    });

    // Fridge with a cat on top guarding the last slice of pizza
    R.thing(12.0, 1.6, (ctx) => {
      box(ctx, 10.5, 0.1, 0, 1.6, 1.5, 3.5, C.mint, { top: tint(C.mint, 0.3) });
      face(ctx, [[10.55, 1.6, 2.3], [12.05, 1.6, 2.3]], null, { lw: 0.04 });
      face(ctx, [[11.85, 1.6, 2.5], [11.85, 1.6, 3.1]], null, { lw: 0.09 });
      face(ctx, [[11.85, 1.6, 0.8], [11.85, 1.6, 1.9]], null, { lw: 0.09 });
      // fridge notes and magnets
      face(ctx, [[10.7, 1.6, 2.55], [11.5, 1.6, 2.55], [11.5, 1.6, 3.2], [10.7, 1.6, 3.2]], C.white, { lw: 0.03 });
      textY(ctx, 1.6, 11.1, 3.0, 'LABEL', 0.18, C.red);
      textY(ctx, 1.6, 11.1, 2.75, 'YOUR FOOD', 0.14, C.ink);
      face(ctx, [[10.8, 1.6, 1.2], [11.4, 1.6, 1.2], [11.4, 1.6, 1.8], [10.8, 1.6, 1.8]], C.butter, { lw: 0.03 });
      textY(ctx, 1.6, 11.1, 1.55, 'MINE', 0.2, C.coral);
      for (const [mx, mz, c] of [[11.6, 3.3, C.red], [10.65, 1.95, C.teal], [11.3, 0.9, C.purple]]) {
        const [X, Y] = P(mx, 1.6, mz);
        ctx.beginPath();
        ctx.arc(X, Y, 0.07, 0, Math.PI * 2);
        ctx.fillStyle = c;
        ctx.fill();
      }
    });
    R.mover((t) => ({ x: 11.0, y: 0.7 }), (ctx, t) => {
      const [X, Y] = P(11.0, 0.8, 3.5);
      // tail hanging over the front, swishing
      const sw = Math.sin(t * 1.8) * 0.25;
      ctx.beginPath();
      ctx.moveTo(X - 0.35, Y - 0.12);
      ctx.bezierCurveTo(X - 0.55, Y + 0.2, X - 0.4 + sw, Y + 0.5, X - 0.45 + sw * 1.4, Y + 0.85);
      ctx.lineCap = 'round';
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.16; ctx.stroke();
      ctx.strokeStyle = GINGER; ctx.lineWidth = 0.09; ctx.stroke();
      // loaf body
      ctx.beginPath();
      ctx.ellipse(X, Y - 0.22, 0.46, 0.26, 0, 0, Math.PI * 2);
      paint(ctx, GINGER, { dots: shade(GINGER, 0.4), density: 0.25, lw: 0.05 });
      // head and ears
      const hx = X + 0.36, hy = Y - 0.44;
      ctx.beginPath();
      ctx.moveTo(hx - 0.17, hy - 0.08); ctx.lineTo(hx - 0.13, hy - 0.3); ctx.lineTo(hx - 0.02, hy - 0.16);
      ctx.moveTo(hx + 0.04, hy - 0.16); ctx.lineTo(hx + 0.15, hy - 0.3); ctx.lineTo(hx + 0.18, hy - 0.08);
      paint(ctx, GINGER, { lw: 0.04 });
      ctx.beginPath();
      ctx.arc(hx, hy, 0.19, 0, Math.PI * 2);
      paint(ctx, GINGER, { lw: 0.05 });
      if (Q.detail) {
        // eyes: slits, glancing at the pizza
        const look = pulse(t, 5) > 0.6 ? 0.04 : 0;
        ctx.fillStyle = C.ink;
        ctx.fillRect(hx - 0.1 + look, hy - 0.03, 0.07, 0.025);
        ctx.fillRect(hx + 0.04 + look, hy - 0.03, 0.07, 0.025);
      }
    }, { bias: 3 });
    // The last slice of pizza (a find)
    R.thing(11.9, 1.3, (ctx) => {
      const [X, Y] = P(11.75, 1.15, 3.52);
      ctx.beginPath();
      ctx.moveTo(X - 0.3, Y - 0.05); ctx.lineTo(X + 0.3, Y - 0.12); ctx.lineTo(X + 0.05, Y + 0.18);
      ctx.closePath();
      paint(ctx, C.butter, { lw: 0.04 });
      ctx.beginPath();
      ctx.moveTo(X - 0.3, Y - 0.05); ctx.lineTo(X + 0.3, Y - 0.12);
      ctx.strokeStyle = C.wood; ctx.lineWidth = 0.1; ctx.stroke();
      ctx.fillStyle = C.red;
      for (const [dx, dy] of [[-0.08, 0], [0.1, -0.02], [0.03, 0.08]]) { ctx.beginPath(); ctx.arc(X + dx, Y + dy, 0.045, 0, Math.PI * 2); ctx.fill(); }
    }, { depth: 20 });
    R.find({ id: 'pizza', label: 'The last slice of pizza', at: [11.75, 1.15, 3.55], r: 0.7 });

    // Windowsill of dying plants, plus one thriving goldfish (a find)
    R.thing(15.4, 0.6, (ctx, t) => {
      box(ctx, 12.6, 0, 2.05, 2.9, 0.55, 0.15, C.white);
      sadPlant(ctx, 13.1, 0.28, 2.2, t, 0.9);
      sadPlant(ctx, 14.75, 0.28, 2.2, t, 1.05, C.mustard);
      sadPlant(ctx, 15.25, 0.3, 2.2, t, 0.7);
    }, { anim: true });
    R.mover((t) => ({ x: 14.0, y: 0.45 }), (ctx, t) => {
      const [X, Y] = P(13.95, 0.3, 2.2);
      ctx.beginPath();
      ctx.arc(X, Y - 0.3, 0.3, 0, Math.PI * 2);
      paint(ctx, alpha(C.sky, 0.75), { lw: 0.04 });
      ctx.beginPath();
      ctx.ellipse(X, Y - 0.5, 0.2, 0.05, 0, 0, Math.PI * 2);
      ctx.fillStyle = alpha(C.white, 0.7);
      ctx.fill();
      const fx = Math.sin(t * 1.3) * 0.13;
      const fl = Math.cos(t * 1.3) > 0 ? 1 : -1;
      ctx.save();
      ctx.translate(X + fx, Y - 0.28 + Math.sin(t * 2.1) * 0.04);
      ctx.scale(fl, 1);
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.1, 0.06, 0, 0, Math.PI * 2);
      ctx.moveTo(-0.08, 0); ctx.lineTo(-0.18, -0.06); ctx.lineTo(-0.18, 0.06);
      paint(ctx, C.coral, { lw: 0.025 });
      ctx.restore();
    }, { bias: 2 });
    R.find({ id: 'fish', label: 'A goldfish', at: [13.95, 0.3, 2.5], r: 0.7 });

    // ---------- DJ corner ----------
    // Speakers either side
    for (const sy of [5.9, 10.0]) {
      R.thing(1.0, sy + 0.8, (ctx, t) => {
        box(ctx, 0.15, sy, 0, 0.85, 0.8, 2.2, C.ink, { top: C.navy });
        const beat = pulse(t, 0.5);
        const pump = beat < 0.2 ? 1 - beat / 0.2 : 0;
        onPlane(ctx, 'x', 1.0, sy + 0.4, 1.3, (g) => {
          g.beginPath(); g.arc(0, 0, 0.32 + pump * 0.05, 0, Math.PI * 2); paint(g, C.grey, { lw: 0.04 });
          g.beginPath(); g.arc(0, 0, 0.12, 0, Math.PI * 2); paint(g, C.navy, { lw: 0.03 });
        });
        onPlane(ctx, 'x', 1.0, sy + 0.4, 0.55, (g) => {
          g.beginPath(); g.arc(0, 0, 0.18, 0, Math.PI * 2); paint(g, C.grey, { lw: 0.03 });
        });
        if (Q.detail && pump > 0) {
          for (let i = 0; i < 2; i++) {
            const [X, Y] = P(1.05, sy + 0.4, 1.3);
            ctx.beginPath();
            ctx.arc(X, Y, 0.5 + (1 - pump) * 0.6 + i * 0.3, -0.9, 0.5);
            ctx.strokeStyle = alpha(C.coral, pump);
            ctx.lineWidth = 0.06;
            ctx.stroke();
          }
        }
      }, { anim: true });
    }

    // DJ in enormous headphones, nodding
    R.mover((t) => ({ x: 1.2, y: 8.3 }), (ctx, t) => {
      person(ctx, 1.2, 8.3, 0, folk(305, { pose: 'drum', dir: 'r', speed: 9, top: C.purple, hair: C.pink, style: 'short', bottom: C.ink }), t + 0);
      headphones(ctx, 1.2, 8.3, 0, 'r', 0);
    });

    // DJ desk: two turntables, a mixer, a laptop. One turntable is playing a sock.
    const TT = [2.5, 9.05, 1.23];
    R.thing(3.1, 9.8, (ctx, t) => {
      table(ctx, 1.9, 6.8, 1.2, 3.0, 1.1, C.navy);
      for (const [cx, cy] of [[2.5, 7.55], [TT[0], TT[1]]]) {
        box(ctx, cx - 0.5, cy - 0.55, 1.1, 1.0, 1.1, 0.12, C.greyLight, { flat: true });
        disc(ctx, cx, cy, 1.23, 0.42, C.ink, { lw: 0.03 });
        disc(ctx, cx, cy, 1.24, 0.12, cy > 8 ? C.mustard : C.coral, { stroke: false });
        if (Q.detail) {
          const a = t * 4;
          face(ctx, [[cx, cy, 1.25], [cx + Math.cos(a) * 0.38, cy + Math.sin(a) * 0.38, 1.25]], null, { lw: 0.03, stroke: C.grey });
        }
      }
      // mixer with blinking levels
      box(ctx, 2.2, 8.15, 1.1, 0.6, 0.35, 0.1, C.grey, { flat: true });
      for (let i = 0; i < 4; i++) {
        const on = Math.sin(t * 9 + i * 1.3) > 0;
        disc(ctx, 2.35 + i * 0.1, 8.33, 1.21, 0.035, on ? C.leaf : C.red, { stroke: false });
      }
    }, { anim: true });
    // The sock on the turntable (a find)
    const sockAt = (t) => {
      const a = t * 3;
      return [TT[0] + Math.cos(a) * 0.24, TT[1] + Math.sin(a) * 0.24, TT[2] + 0.02];
    };
    R.thing(3.15, 9.85, (ctx, t) => {
      const [x, y, z] = sockAt(t);
      const [X, Y] = P(x, y, z);
      ctx.save();
      ctx.translate(X, Y);
      ctx.rotate(t * 3);
      ctx.beginPath();
      ctx.roundRect(-0.1, -0.28, 0.2, 0.4, 0.08);
      ctx.roundRect(-0.1, 0.02, 0.34, 0.16, 0.08);
      paint(ctx, C.red, { lw: 0.035 });
      ctx.fillStyle = C.white;
      ctx.fillRect(-0.1, -0.2, 0.2, 0.07);
      ctx.restore();
    }, { anim: true });
    R.find({ id: 'sock', label: 'A lone sock', at: (t) => sockAt(t), r: 0.7 });

    // A dancer who cannot hear any of it
    R.mover((t) => ({ x: 4.4, y: 8.4 }), (ctx, t) => person(ctx, 4.4, 8.4, 0, folk(306, { pose: 'dance', dir: 'l', speed: 5, top: C.mustard, style: 'pony' }), t));

    // ---------- Living room ----------
    // Mismatched sofa with the roommate who is always asleep
    R.thing(4.9, 13.9, (ctx, t) => {
      box(ctx, 3.3, 10.6, 0, 1.5, 3.1, 0.75, C.purple);
      box(ctx, 3.1, 10.5, 0, 0.45, 3.3, 1.8, shade(C.purple, 0.1));
      box(ctx, 3.3, 10.35, 0, 1.5, 0.35, 1.2, C.green);
      box(ctx, 3.3, 13.7, 0, 1.5, 0.35, 1.2, C.coral);
      box(ctx, 3.6, 10.75, 0.75, 1.1, 1.4, 0.2, C.mustard, { flat: true });
      box(ctx, 3.6, 12.2, 0.75, 1.1, 1.4, 0.2, C.teal, { flat: true });
      person(ctx, 4.1, 11.3, 0.9, folk(307, { pose: 'sleep', dir: 'r', top: C.blush, bottom: C.navy }), t);
    }, { anim: true });

    // Pointing at the chore wheel, at length
    R.mover((t) => ({ x: 2.0, y: 11.6 }), (ctx, t) => {
      person(ctx, 2.0, 11.6, 0, folk(308, { pose: 'point', dir: 'l', top: C.red, hat: 'cap', style: 'short' }), t);
      const k = pulse(t, 11, 6);
      if (Q.detail && k < 0.28) speech(ctx, 1.9, 11.4, 2.9, 'IT SAYS YOU!', { size: 0.42 });
    }, { bias: -0.5 });

    // The neighbor from 2B at the door, with a pot full of your bathwater
    R.thing(0.5, 14.3, (ctx) => {
      // the door, swung open into the room
      face(ctx, [[0, 14.3, 0], [1.35, 14.3, 0], [1.35, 14.3, 3.15], [0, 14.3, 3.15]], C.wood, { dots: C.brown, density: 0.2 });
      disc(ctx, 1.15, 14.3, 1.5, 0.06, BRASS, { lw: 0.02 });
    });
    R.mover((t) => ({ x: 1.1, y: 15.1 }), (ctx, t) => {
      person(ctx, 1.1, 15.1, 0, folk(309, { pose: 'carry', dir: 'r', top: C.navy, style: 'long', hair: HAIR_GREY, bottom: C.brown }), t);
      const [X, Y] = P(1.1, 15.1, 0);
      const px = X + 0.6, py = Y - 1.25;
      ctx.beginPath();
      ctx.rect(px - 0.3, py - 0.3, 0.6, 0.45);
      paint(ctx, C.grey, { dots: C.ink, density: 0.2, lw: 0.04 });
      ctx.beginPath();
      ctx.ellipse(px, py - 0.3, 0.3, 0.08, 0, 0, Math.PI * 2);
      paint(ctx, C.water, { lw: 0.03 });
      const k = pulse(t, 13, 4);
      if (Q.detail && k > 0.5 && k < 0.82) speech(ctx, 1.4, 15.3, 3.0, 'IT IS RAINING IN 2B', { size: 0.4, dx: 1.2 });
    }, { bias: 0.5 });

    // Pizza box tower, wobbling to the bass
    R.thing(6.5, 15.3, (ctx, t) => {
      const beat = pulse(t, 0.5);
      for (let i = 0; i < 11; i++) {
        const wob = Math.sin(i * 1.9) * 0.1 + (i > 5 ? Math.sin(t * 2.2) * (i - 5) * 0.02 : 0) + (beat < 0.15 ? i * 0.004 : 0);
        box(ctx, 5.3 + wob, 14.1 - wob * 0.5, i * 0.2, 1.1, 1.1, 0.19, i % 4 === 2 ? C.white : C.woodLight, { lw: 0.035 });
      }
      label(ctx, 5.85, 14.65, 2.4, 'PIZZA', 0.28, C.red);
    }, { anim: true });

    // Yogi in tree pose, until the tuba happens
    R.mover((t) => ({ x: 6.9, y: 10.1 }), (ctx, t) => {
      const k = pulse(t, TUBA_T);
      let a = Math.sin(t * 2.3) * 0.04;
      if (k > 0.6 && k < 0.68) a = -ease((k - 0.6) / 0.08) * 1.3;
      else if (k >= 0.68 && k < 0.88) a = -1.3;
      else if (k >= 0.88) a = -1.3 * (1 - ease((k - 0.88) / 0.12));
      const [X, Y] = P(6.9, 10.1, 0);
      ctx.save();
      ctx.translate(X, Y);
      ctx.rotate(a);
      person(ctx, 0, 0, 0, folk(310, { pose: 'stand', dir: 'l', top: C.leaf, bottom: C.purple, style: 'bun', hair: C.ink, arms: [Math.PI - 0.12, -Math.PI + 0.12] }), t);
      ctx.restore();
    });

    // Tuba player, sight-reading and losing
    R.mover((t) => ({ x: 11.8, y: 11.6 }), (ctx, t) => {
      const k = pulse(t, TUBA_T);
      const parp = k > 0.55 && k < 0.72;
      const puff = parp ? 1.1 : 1;
      person(ctx, 11.8, 11.6, 0, folk(311, {
        pose: 'stand', dir: 'l', top: C.coral, bottom: C.ink, style: 'curly', hair: C.brown, scale: 1,
        arms: [1.3, 1.1], hold: (g) => { g.scale(puff, puff); tuba(g); },
      }), t);
      if (Q.detail && parp) speech(ctx, 11.4, 12.2, 3.8, 'PARP!', { size: 0.6, fill: C.butter });
    });
    // Music stand, with a solo nobody asked for
    R.thing(10.9, 12.3, (ctx) => {
      face(ctx, [[10.9, 12.3, 0], [10.9, 12.3, 1.7]], null, { lw: 0.07 });
      face(ctx, [[10.6, 12.1, 0], [10.9, 12.3, 0.4], [11.2, 12.5, 0]], null, { lw: 0.05 });
      face(ctx, [[10.9, 11.8, 1.6], [10.9, 12.8, 1.6], [10.75, 12.8, 2.4], [10.75, 11.8, 2.4]], C.white, { lw: 0.04 });
      if (Q.detail) for (let i = 0; i < 4; i++) face(ctx, [[10.87 - i * 0.04, 11.9, 1.75 + i * 0.15], [10.87 - i * 0.04, 12.7, 1.75 + i * 0.15]], null, { lw: 0.02 });
    });
    // Notes blown at the yogi
    R.air((ctx, t) => {
      const k0 = pulse(t, TUBA_T);
      const loud = k0 > 0.55 && k0 < 0.75;
      const n = Q.detail ? 8 : 3;
      particles(t, n, 2.6, (q, r) => {
        const x = 11.3 - q * (3 + r() * 1.5);
        const y = 11.9 - q * (1 + r() * 1.2);
        const z = 2.5 + q * 1.2 + Math.sin(q * 6 + r() * 6) * 0.3;
        const cols = [C.navy, C.coral, C.purple];
        note(ctx, x, y, z, alpha(cols[Math.floor(r() * 3)], 1 - q), (loud ? 1.8 : 1.0) * (0.8 + r() * 0.4));
      }, 12);
    });

    // TV on a crate, a gamer on a beanbag
    R.thing(15.4, 8.0, (ctx, t) => {
      box(ctx, 13.5, 7.2, 0, 1.8, 0.8, 0.9, C.woodLight, { dotsL: C.wood });
      label(ctx, 14.4, 8.0, 0.45, 'ORANGES', 0.22, C.coral);
      box(ctx, 13.4, 7.35, 0.9, 2.0, 0.35, 1.3, C.ink, { top: C.night });
      face(ctx, [[13.55, 7.71, 1.02], [15.25, 7.71, 1.02], [15.25, 7.71, 2.08], [13.55, 7.71, 2.08]], C.teal, { lw: 0.03 });
      if (Q.detail) {
        const bx = 13.8 + pulse(t, 2) * 1.2;
        face(ctx, [[bx, 7.72, 1.2], [bx + 0.2, 7.72, 1.2], [bx + 0.2, 7.72, 1.5], [bx, 7.72, 1.5]], C.mustard, { stroke: false });
        face(ctx, [[14.9, 7.72, 1.6], [15.1, 7.72, 1.6], [15.1, 7.72, 1.9], [14.9, 7.72, 1.9]], Math.sin(t * 8) > 0 ? C.coral : C.pink, { stroke: false });
      }
    }, { anim: true });
    R.thing(14.5, 10.4, (ctx, t) => {
      const [X, Y] = P(14.3, 9.9, 0);
      ctx.beginPath();
      ctx.ellipse(X, Y - 0.3, 0.8, 0.45, 0, 0, Math.PI * 2);
      paint(ctx, C.red, { dots: shade(C.red, 0.5), density: 0.25 });
      person(ctx, 14.3, 9.9, 0.35, folk(312, { pose: 'sit', dir: 'r', back: true, top: C.tealLight, style: 'short', hair: C.mustard, arms: [1.2 + Math.sin(t * 12) * 0.1, 1.1] }), t);
    }, { anim: true });

    // Laundry rack in the middle of everything
    R.thing(12.4, 14.3, (ctx, t) => {
      for (const x of [9.4, 12.3]) {
        face(ctx, [[x, 13.5, 0], [x, 13.85, 1.6], [x, 14.2, 0]], null, { lw: 0.06, stroke: C.grey });
      }
      face(ctx, [[9.4, 13.85, 1.6], [12.3, 13.85, 1.6]], null, { lw: 0.05, stroke: C.grey });
      face(ctx, [[9.4, 13.6, 0.9], [12.3, 13.6, 0.9]], null, { lw: 0.04, stroke: C.grey });
      const items = [
        [9.7, C.red, 's'], [10.1, C.white, 't'], [10.8, C.teal, 's'], [11.1, C.mustard, 't'], [11.9, C.purple, 's'],
      ];
      for (const [ix, c, kind] of items) {
        const sw = Math.sin(t * 1.5 + ix) * 0.06;
        const [X, Y] = P(ix, 13.85, 1.6);
        ctx.save();
        ctx.translate(X, Y);
        ctx.rotate(sw);
        ctx.beginPath();
        if (kind === 's') { ctx.roundRect(-0.08, 0, 0.16, 0.5, 0.06); ctx.roundRect(-0.08, 0.36, 0.28, 0.14, 0.06); }
        else { ctx.moveTo(-0.3, 0); ctx.lineTo(0.3, 0); ctx.lineTo(0.38, 0.25); ctx.lineTo(0.22, 0.25); ctx.lineTo(0.22, 0.8); ctx.lineTo(-0.22, 0.8); ctx.lineTo(-0.22, 0.25); ctx.lineTo(-0.38, 0.25); ctx.closePath(); }
        paint(ctx, c, { lw: 0.035 });
        ctx.restore();
      }
    }, { anim: true });
    // ...and someone proudly hanging enormous underpants
    R.mover((t) => ({ x: 8.7, y: 14.5 }), (ctx, t) => {
      const up = Math.sin(t * 1.2) * 0.1;
      person(ctx, 8.7, 14.5, 0, folk(313, { pose: 'stand', dir: 'r', top: C.white, bottom: C.teal, style: 'bald', arms: [Math.PI - 0.45 + up, -Math.PI + 0.45 - up] }), t);
      const [X, Y] = P(8.7, 14.5, 2.7);
      ctx.beginPath();
      ctx.moveTo(X - 0.55, Y - 0.2); ctx.lineTo(X + 0.55, Y - 0.2); ctx.lineTo(X + 0.45, Y + 0.35);
      ctx.lineTo(X + 0.1, Y + 0.45); ctx.lineTo(X, Y + 0.2); ctx.lineTo(X - 0.1, Y + 0.45); ctx.lineTo(X - 0.45, Y + 0.35);
      ctx.closePath();
      paint(ctx, C.pink, { dots: C.white, density: 0.5, lw: 0.04 });
    });

    // Breakfast table: cereal, earmuffs, and a very long stare at the tuba
    R.thing(12.4, 6.9, (ctx) => {
      cylinder(ctx, 11.4, 6.0, 0, 0.12, 1.1, C.ink, { flat: true });
      disc(ctx, 11.4, 6.0, 0, 0.45, C.ink, { stroke: false });
      cylinder(ctx, 11.4, 6.0, 1.05, 0.95, 0.1, C.white, { top: C.pink });
      disc(ctx, 11.2, 6.3, 1.16, 0.25, C.white, { lw: 0.03 });
      disc(ctx, 11.2, 6.3, 1.17, 0.17, C.butter, { dots: C.coral, density: 0.4, stroke: false });
      box(ctx, 11.5, 5.5, 1.15, 0.35, 0.18, 0.6, C.mustard, { flat: true, lw: 0.03 });
      cylinder(ctx, 11.8, 6.4, 1.15, 0.1, 0.3, C.white, { flat: true });
    });
    R.thing(12.8, 5.2, (ctx) => chair(ctx, 11.7, 4.3, 0, C.teal, 'l'));
    R.mover((t) => ({ x: 12.1, y: 4.75 }), (ctx, t) => {
      const spoon = pulse(t, 2.2) < 0.4;
      person(ctx, 12.1, 4.75, 0.8, folk(314, { pose: 'sit', dir: 'l', top: C.navy, bottom: C.grey, style: 'long', hair: C.mustard, arms: [spoon ? 2.0 : 1.3, 0.6] }), t);
      // earmuffs
      const [X, Y] = P(12.1, 4.75, 0.8);
      const hy = Y - 1.95 + 0.0;
      ctx.beginPath();
      ctx.arc(X - 0.02, hy + 0.35, 0.4, Math.PI * 1.1, Math.PI * 1.9);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.07; ctx.stroke();
      for (const dx of [-0.36, 0.36]) {
        ctx.beginPath();
        ctx.arc(X + dx, hy + 0.42, 0.15, 0, Math.PI * 2);
        paint(ctx, C.pink, { dots: C.white, density: 0.4, lw: 0.04 });
      }
    }, { bias: 0.3 });
    R.thing(11.3, 7.5, (ctx) => chair(ctx, 10.2, 6.6, 0, C.mustard, 'r'));

    // Mismatched armchair in the front corner, with a guitar nobody plays
    R.thing(15.6, 15.4, (ctx, t) => {
      box(ctx, 13.9, 13.6, 0, 1.8, 1.7, 0.8, C.green, { dotsT: C.leaf });
      box(ctx, 13.6, 13.5, 0, 0.45, 1.9, 2.0, shade(C.green, 0.1));
      box(ctx, 14.05, 13.3, 0, 1.65, 0.4, 1.25, C.pink);
      box(ctx, 14.3, 13.75, 0.8, 1.2, 1.35, 0.25, C.coral, { flat: true });
      box(ctx, 14.05, 15.2, 0, 1.65, 0.4, 1.25, C.pink);
      // guitar leaning on the arm
      const [X, Y] = P(13.6, 15.9, 0);
      ctx.save();
      ctx.translate(X, Y);
      ctx.rotate(-0.25);
      ctx.beginPath();
      ctx.ellipse(0, -0.45, 0.36, 0.42, 0, 0, Math.PI * 2);
      ctx.ellipse(0, -1.0, 0.28, 0.3, 0, 0, Math.PI * 2);
      paint(ctx, C.wood, { dots: C.brown, density: 0.2, lw: 0.04 });
      ctx.beginPath();
      ctx.arc(0, -0.75, 0.1, 0, Math.PI * 2);
      paint(ctx, C.ink, { stroke: false });
      ctx.beginPath();
      ctx.rect(-0.06, -2.2, 0.12, 1.0);
      paint(ctx, C.brown, { lw: 0.03 });
      ctx.restore();
    });

    // The robot vacuum: the only one in 3A who does any chores
    const robo = route([[13.2, 2.8], [15.3, 3.6, 0.8], [14.6, 6.6], [12.9, 6.9, 0.6], [13.6, 4.8]], { speed: 0.9 });
    R.mover(robo, (ctx, t, p) => {
      const bump = p.moving ? 0 : Math.sin(t * 20) * 0.04;
      cylinder(ctx, p.x + bump, p.y, 0, 0.42, 0.14, C.greyLight, { top: C.ink });
      disc(ctx, p.x + bump, p.y, 0.15, 0.14, pulse(t, 1) < 0.5 ? C.leaf : C.teal, { stroke: false });
      if (Q.detail && !p.moving) label(ctx, p.x, p.y, 0.9, 'bonk', 0.3, C.navy);
    });

    // A vacuum cleaner, still in its box, still on the chore wheel
    R.thing(9.8, 6.4, (ctx) => {
      box(ctx, 8.9, 5.5, 0, 0.9, 0.9, 1.3, C.woodLight, { dotsL: C.wood });
      label(ctx, 9.35, 6.4, 0.75, 'VAC', 0.3, C.navy);
      face(ctx, [[9.8, 5.6, 0.9], [9.8, 6.0, 0.9], [9.8, 6.0, 1.25], [9.8, 5.6, 1.25]], C.butter, { lw: 0.03 });
    });

    // Floor lamp by the sofa, and a big sad corner plant
    R.thing(2.9, 15.2, (ctx, t) => lamp(ctx, 2.9, 15.2, t, C.teal), { anim: true });
    R.thing(15.2, 2.2, (ctx, t) => sadPlant(ctx, 15.2, 2.2, 0, t, 1.8, C.leaf), { anim: true });
  },
};

const HAIR_GREY = '#B9B5AE';
