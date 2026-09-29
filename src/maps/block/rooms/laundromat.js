// Laundromat, 2am: a washer foaming over, a ceiling fan wearing a sock,
// a vending machine that needs a kick, and people folding a sheet the size of a sail.
import {
  C, box, rect, disc, face, poly, paint, person, folk, slab, checker, chair,
  speech, shade, tint, alpha, dots, Q, label, P, paintText, onLeft, onRight, plant, goose,
} from '../../../engine/art.js';
import { route, particles, pulse, clamp } from '../../../engine/actors.js';
import { ZK } from '../../../engine/iso.js';

// Draw in the plane of a machine front. 'y' plane: u runs along x. 'x' plane: u runs along y.
function onPlane(ctx, plane, x, y, z, fn) {
  const X = x - y, Y = (x + y) / 2 - z * ZK;
  ctx.save();
  if (plane === 'y') ctx.transform(1, 0.5, 0, -ZK, X, Y);
  else ctx.transform(-1, 0.5, 0, -ZK, X, Y);
  fn(ctx);
  ctx.restore();
}

// A round machine door with tumbling laundry. speed 0 = stopped. open = door swung open.
function porthole(ctx, plane, x, y, z, r, t, speed, colors, o = {}) {
  onPlane(ctx, plane, x, y, z, (g) => {
    g.beginPath();
    g.arc(0, 0, r + 0.14, 0, Math.PI * 2);
    paint(g, C.greyLight, { lw: 0.05 });
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    paint(g, o.foam ? C.white : C.navy, { lw: 0.04 });
    if (Q.detail) {
      g.save();
      g.beginPath();
      g.arc(0, 0, r - 0.04, 0, Math.PI * 2);
      g.clip();
      const a0 = t * speed;
      colors.forEach((c, i) => {
        const a = a0 + (i / colors.length) * Math.PI * 2;
        const rr = r * (0.35 + (i % 2) * 0.2);
        g.beginPath();
        g.ellipse(Math.cos(a) * rr, Math.sin(a) * rr - (speed ? 0 : r * 0.35), r * 0.38, r * 0.22, a, 0, Math.PI * 2);
        g.fillStyle = c;
        g.fill();
      });
      if (o.foam) {
        g.fillStyle = dots(C.tealLight, 0.35);
        g.fillRect(-r, -r, r * 2, r * 2);
      }
      // glass shine
      g.beginPath();
      g.ellipse(-r * 0.3, r * 0.35, r * 0.35, r * 0.12, -0.6, 0, Math.PI * 2);
      g.fillStyle = alpha(C.white, 0.45);
      g.fill();
      g.restore();
    }
  });
}

const WASHERS = [0, 1, 2, 3, 4].map((i) => ({ x: 1.0 + i * 2.2, w: 2.0 }));
// Two stacks: the street door is in this wall at y 11.4 to 13.6.
const DRYERS = [];
for (const y of [7.0, 9.4]) for (const z of [0, 2.2]) DRYERS.push({ y, z });
const LOADS = [
  [C.coral, C.mustard, C.teal],
  [C.pink, C.white, C.navy],
  [C.white, C.white, C.sky],
  [C.green, C.mustard, C.red],
  [C.purple, C.blush, C.teal],
];

export default {
  id: 'laundromat',
  name: 'Laundromat',
  blurb: 'Open 24 hours. Machine three has been foaming since midnight and nobody wants to be the one to deal with it.',

  build(R) {
    R.floor((ctx) => {
      slab(ctx, C.greyLight);
      checker(ctx, C.white, C.grey, 1.6);
    });
    R.walls({ left: C.mint, right: C.mint, cap: C.paper, dotsL: C.tealLight, densL: 0.12, dotsR: C.tealLight, densR: 0.12 });

    // Left wall: big night window with a neon sign, and a notice board
    R.decor((ctx, t) => {
      onLeft(ctx, 0.8, 2.3, 5.6, 3.1, C.white);
      onLeft(ctx, 1.0, 2.5, 5.2, 2.7, C.night, { dots: C.navy, density: 0.4 });
      if (Q.detail) {
        // moon and stars through the glass
        const [mx, my] = P(0, 5.3, 4.5);
        ctx.beginPath();
        ctx.arc(mx, my, 0.42, 0, Math.PI * 2);
        ctx.fillStyle = C.butter;
        ctx.fill();
        ctx.fillStyle = C.white;
        for (const [sy, sz] of [[1.6, 4.8], [2.6, 3.4], [3.8, 4.9], [4.4, 3.0], [1.4, 3.1]]) {
          const [sx, sz2] = P(0, sy, sz);
          const tw = 0.05 + 0.04 * Math.sin(t * 3 + sy * 5);
          ctx.fillRect(sx - tw, sz2 - tw, tw * 2, tw * 2);
        }
        // city across the street
        for (let i = 0; i < 6; i++) {
          const y0 = 1.0 + i * 0.87, hh = 0.5 + ((i * 37) % 5) * 0.18;
          onLeft(ctx, y0, 2.5, 0.8, hh, C.navy, { stroke: false });
          if ((i + Math.floor(t / 3)) % 3 === 0) onLeft(ctx, y0 + 0.3, 2.5 + hh - 0.35, 0.2, 0.18, C.butter, { stroke: false });
        }
      }
      face(ctx, [[0, 3.6, 2.5], [0, 3.6, 5.2]], null, { lw: 0.12, stroke: C.white });
      // neon, with the odd flicker
      const flick = Math.sin(t * 23) > 0.93 || (pulse(t, 7) > 0.9 && Math.sin(t * 40) > 0);
      const glow = flick ? alpha(C.pink, 0.35) : C.pink;
      paintText(ctx, 'left', 3.6, 3.5, 'OPEN 24H', 0.9, glow);
    }, { anim: true });
    // Notice board next to the window
    R.decor((ctx) => {
      onLeft(ctx, 6.6, 2.6, 0.001, 0.001, null, { stroke: false });
      onLeft(ctx, 13.9, 2.4, 1.8, 2.2, C.wood, { dots: shade(C.wood, 0.4), density: 0.25 });
      const notes = [[14.05, 3.6, C.butter], [14.9, 3.8, C.white], [14.2, 2.6, C.blush], [15.0, 2.7, C.mint]];
      for (const [y, z, c] of notes) onLeft(ctx, y, z, 0.62, 0.72, c, { lw: 0.03 });
    });

    // Right wall: detergent shelf above the washers and a plea about socks
    R.decor((ctx) => {
      paintText(ctx, 'right', 5.6, 5.2, 'LOST: ONE SOCK. REWARD.', 0.52, C.navy);
      box(ctx, 1.0, 0, 3.55, 10.6, 0.6, 0.1, C.white);
      const bottles = [C.coral, C.teal, C.mustard, C.pink, C.white, C.purple, C.sky, C.coral, C.green, C.mustard, C.teal, C.blush];
      bottles.forEach((c, i) => {
        const x = 1.3 + i * 0.85;
        box(ctx, x, 0.1, 3.65, 0.42, 0.4, 0.55 + (i % 3) * 0.12, c, { lw: 0.03 });
        box(ctx, x + 0.13, 0.22, 4.2 + (i % 3) * 0.12, 0.16, 0.16, 0.12, C.white, { flat: true, lw: 0.02 });
      });
    });

    // Washers along the right wall
    WASHERS.forEach(({ x, w }, i) => {
      R.thing(x + w / 2, 1.2, (ctx, t) => {
        box(ctx, x, 0, 0, w, 1.6, 2.3, C.white, { top: tint(C.greyLight, 0.3) });
        box(ctx, x + 0.1, 0.05, 2.3, w - 0.2, 0.35, 0.35, C.greyLight, { flat: true });
        // little status light
        const on = i === 2 ? Math.sin(t * 8) > 0 : true;
        const [lx, ly] = P(x + w - 0.3, 1.6, 2.0);
        ctx.beginPath();
        ctx.arc(lx, ly, 0.08, 0, Math.PI * 2);
        ctx.fillStyle = on ? (i === 2 ? C.red : C.leaf) : C.grey;
        ctx.fill();
        label(ctx, x + 0.55, 1.62, 2.0, String(i + 1), 0.35, C.ink);
        const speed = i === 2 ? 5 : i === 4 ? 0 : 2.5 + i * 0.4;
        porthole(ctx, 'y', x + w / 2, 1.6, 1.05, 0.66, t, speed, LOADS[i], { foam: i === 2 });
      }, { anim: true });
    });

    // Suds spilling out of machine three
    R.rug((ctx, t) => {
      const cx = WASHERS[2].x + 1, wob = Math.sin(t * 1.3) * 0.08;
      ctx.beginPath();
      const pts = 18;
      for (let k = 0; k <= pts; k++) {
        const a = (k / pts) * Math.PI * 2;
        const rr = 1.5 + Math.sin(a * 4 + t) * 0.18 + wob;
        const [X, Y] = P(cx + Math.cos(a) * rr * 1.1, 2.6 + Math.sin(a) * rr * 0.75, 0.02);
        k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      }
      paint(ctx, C.white, { dots: C.tealLight, density: 0.25, lw: 0.04 });
    }, { anim: true });
    R.air((ctx, t) => {
      if (!Q.detail) return;
      const cx = WASHERS[2].x + 1;
      particles(t, 26, 3.2, (k, r) => {
        const x = cx + (r() - 0.5) * 1.4 + Math.sin(k * 6 + r() * 6) * 0.3;
        const y = 1.7 + r() * 1.8 + k * 0.6;
        const z = 1.1 + k * 3.5 * (0.6 + r() * 0.5);
        const [X, Y] = P(x, y, z);
        const s = (0.12 + r() * 0.16) * (k < 0.85 ? 1 : (1 - k) / 0.15);
        ctx.beginPath();
        ctx.arc(X, Y, s, 0, Math.PI * 2);
        ctx.fillStyle = alpha(C.white, 0.85);
        ctx.fill();
        ctx.strokeStyle = C.tealLight;
        ctx.lineWidth = 0.03;
        ctx.stroke();
      }, 3);
    });

    // Vending machine with a customer who has a plan
    R.thing(13.3, 0.9, (ctx, t) => {
      box(ctx, 12.2, 0, 0, 2.3, 1.4, 3.6, C.coral, { top: C.coralLight });
      face(ctx, [[12.4, 1.41, 1.2], [13.9, 1.41, 1.2], [13.9, 1.41, 3.3], [12.4, 1.41, 3.3]], C.navy, { lw: 0.04 });
      const snacks = [C.mustard, C.teal, C.pink, C.white, C.leaf];
      for (let row = 0; row < 4; row++) for (let c = 0; c < 4; c++) {
        const kick = pulse(t, 6) > 0.62 && row === 1 && c === 2;
        const dz = kick ? Math.min(1.3, (pulse(t, 6) - 0.62) * 8) : 0;
        face(ctx, [[12.55 + c * 0.34, 1.42, 2.95 - row * 0.45 - dz], [12.8 + c * 0.34, 1.42, 2.95 - row * 0.45 - dz], [12.8 + c * 0.34, 1.42, 3.2 - row * 0.45 - dz], [12.55 + c * 0.34, 1.42, 3.2 - row * 0.45 - dz]], snacks[(row + c) % 5], { lw: 0.02 });
      }
      face(ctx, [[12.4, 1.41, 0.3], [13.9, 1.41, 0.3], [13.9, 1.41, 0.8], [12.4, 1.41, 0.8]], C.ink, { lw: 0.03 });
      const blink = Math.sin(t * 5) > 0 ? C.butter : C.mustard;
      face(ctx, [[14.05, 1.41, 2.6], [14.35, 1.41, 2.6], [14.35, 1.41, 3.1], [14.05, 1.41, 3.1]], blink, { lw: 0.03 });
      label(ctx, 13.35, 1.5, 3.9, 'SNAX', 0.45, C.white);
    }, { anim: true });
    R.mover(() => ({ x: 13.4, y: 2.9 }), (ctx, t) => {
      const k = pulse(t, 6);
      const kicking = k > 0.55 && k < 0.65;
      person(ctx, 13.4, 2.9, 0, folk(71, { back: true, dir: 'l', pose: kicking ? 'run' : 'stand', top: C.teal, hat: 'beanie', phase: 1.2 }), t);
      if (Q.detail && k > 0.4 && k < 0.55) speech(ctx, 13.4, 2.9, 3.0, 'come ON...', { size: 0.45 });
      if (Q.detail && k > 0.7 && k < 0.95) speech(ctx, 13.4, 2.9, 3.0, 'YES!', { size: 0.5, fill: C.butter });
    });

    // Dryers stacked along the left wall.
    DRYERS.forEach(({ y, z }, i) => {
      R.thing(0.9, y + 1.15 + z * 0.01, (ctx, t) => {
        box(ctx, 0, y, z, 1.8, 2.3, 2.1, C.greyLight, { top: C.white, right: tint(C.greyLight, 0.4) });
        const open = i === 2;
        const speed = open ? 0 : 3 + (i % 3);
        porthole(ctx, 'x', 1.8, y + 1.15, z + 1.05, 0.7, t, speed, LOADS[(i + 1) % 5]);
        if (open) {
          // door swung open toward the viewer
          onPlane(ctx, 'y', 1.8, y + 1.85, z + 1.05, (g) => {
            g.beginPath();
            g.ellipse(0.75, 0, 0.72, 0.8, 0, 0, Math.PI * 2);
            paint(g, C.greyLight, { lw: 0.05 });
            g.beginPath();
            g.ellipse(0.75, 0, 0.5, 0.58, 0, 0, Math.PI * 2);
            paint(g, alpha(C.sky, 0.6), { lw: 0.03 });
          });
        }
        const [lx, ly] = P(1.81, y + 0.3, z + 1.8);
        ctx.fillStyle = open ? C.grey : C.leaf;
        ctx.beginPath(); ctx.arc(lx, ly, 0.07, 0, Math.PI * 2); ctx.fill();
      }, { anim: true });
    });

    // Cat asleep on top of the dryers, tail going
    R.thing(1.2, 11.2, (ctx, t) => {
      const [X, Y] = P(0.9, 10.8, 4.3);
      ctx.save();
      ctx.translate(X, Y);
      ctx.beginPath();
      ctx.ellipse(0, -0.28, 0.62, 0.3, 0, 0, Math.PI * 2);
      paint(ctx, C.mustard, { dots: shade(C.mustard, 0.5), density: 0.3 });
      ctx.beginPath();
      ctx.arc(0.5, -0.36, 0.24, 0, Math.PI * 2);
      paint(ctx, C.mustard);
      ctx.beginPath();
      ctx.moveTo(0.36, -0.55); ctx.lineTo(0.42, -0.72); ctx.lineTo(0.52, -0.58);
      ctx.moveTo(0.56, -0.58); ctx.lineTo(0.66, -0.72); ctx.lineTo(0.7, -0.52);
      paint(ctx, C.mustard);
      const sw = Math.sin(t * 2.2) * 0.25;
      ctx.beginPath();
      ctx.moveTo(-0.55, -0.25);
      ctx.quadraticCurveTo(-0.95, -0.1 + sw, -1.0, 0.1 + sw);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.16; ctx.lineCap = 'round'; ctx.stroke();
      ctx.strokeStyle = C.mustard; ctx.lineWidth = 0.09; ctx.stroke();
      ctx.restore();
      if (Q.detail) {
        const k = (t * 0.5) % 1;
        label(ctx, 0.9 - k * 0.4, 10.4 - k * 0.4, 5.1 + k, 'z', 0.35 + k * 0.2, alpha(C.ink, 1 - k));
      }
    }, { anim: true });
    R.find({ id: 'cat', label: 'A cat on the dryers', at: [0.9, 10.8, 4.6], r: 0.9 });

    // Plastic chairs under the window, with a sleeper, a reader and a head-bobber
    [1.3, 2.6, 3.9, 5.2].forEach((y, i) => R.thing(1.0, y + 0.4, (ctx) => chair(ctx, 0.6, y, 0, [C.coral, C.mustard, C.teal, C.coral][i], 'r')));
    R.mover(() => ({ x: 1.5, y: 1.7 }), (ctx, t) => {
      person(ctx, 1.4, 1.7, 0.8, folk(81, { pose: 'sit', dir: 'r', arms: [0.2, 0.1], top: C.purple }), t);
      if (Q.detail) { const k = (t * 0.55) % 1; label(ctx, 1.4 - k * 0.4, 1.3 - k * 0.4, 3.3 + k, 'z', 0.4 + k * 0.3, alpha(C.ink, 1 - k)); }
    });
    R.mover(() => ({ x: 1.5, y: 4.3 }), (ctx, t) => {
      person(ctx, 1.4, 4.3, 0.8, folk(82, { pose: 'sit', dir: 'r', arms: [1.0, 1.0], style: 'bun', top: C.blush }), t);
      const [X, Y] = P(1.95, 4.3, 2.35);
      ctx.beginPath();
      ctx.rect(X - 0.05, Y - 0.35, 0.42, 0.5);
      paint(ctx, C.butter, { lw: 0.03 });
    });
    R.mover(() => ({ x: 1.5, y: 5.6 }), (ctx, t) => {
      const bob = Math.sin(t * 7) * 0.05;
      person(ctx, 1.4, 5.6, 0.8 + Math.abs(bob), folk(83, { pose: 'sit', dir: 'r', arms: [0.4 + bob * 4, 0.3], top: C.green, hat: 'cap' }), t);
      if (Q.detail) note(ctx, 1.2, 5.3, 3.2 + (t % 1.2), t);
    });

    // Folding table in the middle
    R.thing(8.8, 7.4, (ctx) => {
      box(ctx, 6.5, 6.2, 1.1, 4.5, 2.4, 0.2, C.white, { top: C.butter });
      for (const [lx, ly] of [[6.6, 6.3], [10.8, 6.3], [6.6, 8.4], [10.8, 8.4]]) box(ctx, lx, ly, 0, 0.14, 0.14, 1.1, C.grey, { flat: true });
      // stacks of folded clothes
      [[6.9, 6.5, [C.coral, C.white, C.teal]], [8.0, 6.6, [C.sky, C.sky, C.navy, C.mustard]], [9.6, 6.5, [C.pink, C.white]]].forEach(([x, y, cs]) => {
        cs.forEach((c, k) => box(ctx, x, y, 1.3 + k * 0.2, 0.9, 0.9, 0.2, c, { lw: 0.03, flat: true }));
      });
      // a basket
      box(ctx, 9.4, 7.6, 1.3, 1.2, 0.9, 0.6, C.teal, { dotsL: C.ink });
      disc(ctx, 10.0, 8.05, 1.95, 0.35, C.white, { lw: 0.03 });
    });

    // Two people folding a bedsheet that will not cooperate
    R.mover(() => ({ x: 8.8, y: 10.4 }), (ctx, t) => {
      const k = pulse(t, 5);
      const snap = Math.sin(k * Math.PI * 2);
      const top = 1.9 + snap * 0.35;
      const pts = [];
      const n = 10;
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        pts.push([7.3 + u * 3.0, 10.4, top + Math.sin(u * Math.PI) * 0.25 * snap]);
      }
      for (let i = n; i >= 0; i--) {
        const u = i / n;
        pts.push([7.3 + u * 3.0, 10.4 + Math.sin(t * 3 + u * 5) * 0.2, 0.4 + Math.sin(u * Math.PI * 2 + t * 4) * 0.12]);
      }
      person(ctx, 7.0, 10.3, 0, folk(91, { pose: 'carry', dir: 'r', arms: [2.1 - snap * 0.3, 2.0], top: C.mustard }), t);
      poly(ctx, pts);
      paint(ctx, C.white, { dots: C.sky, density: 0.35, lw: 0.04 });
      person(ctx, 10.6, 10.5, 0, folk(92, { pose: 'carry', dir: 'l', arms: [2.1 + snap * 0.3, 2.0], top: C.navy, style: 'curly' }), t);
    });

    // Kid riding a rolling laundry cart, pushed round and round
    const cart = route([[4.2, 4.3], [11.5, 4.3], [14.3, 6.5], [14.3, 13.6], [5, 13.6], [3.6, 9.5]], { speed: 1.3 });
    const pusher = route([[4.2, 4.3], [11.5, 4.3], [14.3, 6.5], [14.3, 13.6], [5, 13.6], [3.6, 9.5]], { speed: 1.3, offset: -0.9 });
    R.mover(cart, (ctx, t, p) => {
      const [sX, sY] = P(p.x, p.y, 0);
      box(ctx, p.x - 0.5, p.y - 0.5, 0.35, 1.0, 1.0, 0.8, C.sky, { dotsL: C.navy });
      for (const [wx, wy] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) disc(ctx, p.x + wx, p.y + wy, 0.08, 0.12, C.ink, { stroke: false });
      person(ctx, p.x, p.y, 0.4, folk(95, { pose: 'cheer', dir: p.dir, back: p.back, scale: 0.6, top: C.red, style: 'pony' }), t);
      void sX; void sY;
    });
    R.mover(pusher, (ctx, t, p) => person(ctx, p.x, p.y, 0, folk(96, { pose: 'walk', dir: p.dir, back: p.back, arms: [1.3, 1.3], top: C.lilac }), t));

    // Mopper facing the suds, making no progress
    const mop = route([[5.5, 3.6], [8.5, 3.6]], { speed: 0.6, loop: false });
    R.mover(mop, (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, folk(101, {
        pose: 'walk', dir: p.dir, top: C.navy, hat: 'cap', speed: 4,
        hold: (g) => {
          g.beginPath(); g.moveTo(0, 0); g.lineTo(0.5, 1.2); g.strokeStyle = C.brown; g.lineWidth = 0.08; g.stroke();
          g.beginPath(); g.ellipse(0.55, 1.3, 0.3, 0.12, 0, 0, Math.PI * 2); paint(g, C.greyLight, { lw: 0.03 });
        },
      }), t);
    });

    // Watching machine one like it's television
    R.mover(() => ({ x: 2.2, y: 2.6 }), (ctx, t) => person(ctx, 2.2, 2.6, 0, folk(111, { back: true, dir: 'r', top: C.coral, style: 'long' }), t));
    // A kid with their face on the glass of machine four
    R.mover(() => ({ x: 8.7, y: 2.2 }), (ctx, t) => person(ctx, 8.7, 2.2, 0, folk(112, { back: true, dir: 'l', scale: 0.7, pose: 'cheer', top: C.mustard }), t));
    // Someone pulling warm towels from the open dryer
    R.mover(() => ({ x: 3.0, y: 10.4 }), (ctx, t) => person(ctx, 3.0, 10.4, 0, folk(113, {
      pose: 'carry', dir: 'l', top: C.teal,
      hold: (g) => { g.beginPath(); g.roundRect(-0.1, -0.35, 0.8, 0.55, 0.15); paint(g, C.white, { dots: C.pink, density: 0.3, lw: 0.03 }); },
    }), t));

    // Plants and a trash can
    R.thing(15.2, 1.8, (ctx, t) => plant(ctx, 15.2, 1.8, 0, t, { kind: 'spiky', scale: 1.4, potColor: C.navy }), { anim: true });
    R.thing(4.9, 0.9, (ctx) => {
      box(ctx, 11.55, 0.1, 0, 0.55, 0.9, 1.0, C.grey);
    });

    // A lucky coin on the floor
    R.rug((ctx) => {
      disc(ctx, 12.6, 11.4, 0.02, 0.2, C.mustard, { lw: 0.04 });
      disc(ctx, 12.6, 11.4, 0.03, 0.1, C.butter, { stroke: false });
    });
    R.find({ id: 'coin', label: 'A lucky coin', at: [12.6, 11.4, 0.05], r: 0.7 });

    // Ceiling fan with a red sock stuck to one blade
    const FAN = { x: 8.6, y: 8.2, z: 6.6, period: 6 };
    const sockAt = (t) => {
      const a = (t / FAN.period) * Math.PI * 2;
      return [FAN.x + Math.cos(a) * 1.65, FAN.y + Math.sin(a) * 1.65, FAN.z - 0.15];
    };
    R.air((ctx, t) => {
      const [tx, ty] = P(FAN.x, FAN.y, 9.5);
      const [bx, by] = P(FAN.x, FAN.y, FAN.z + 0.25);
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(bx, by);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.09; ctx.stroke();
      const a0 = (t / FAN.period) * Math.PI * 2;
      for (let i = 0; i < 4; i++) {
        const a = a0 + (i * Math.PI) / 2;
        const ca = Math.cos(a), sa = Math.sin(a), cp = Math.cos(a + 0.18), sp = Math.sin(a + 0.18), cm = Math.cos(a - 0.18), sm = Math.sin(a - 0.18);
        face(ctx, [
          [FAN.x + cm * 0.4, FAN.y + sm * 0.4, FAN.z], [FAN.x + cm * 1.8, FAN.y + sm * 1.8, FAN.z],
          [FAN.x + cp * 1.8, FAN.y + sp * 1.8, FAN.z], [FAN.x + cp * 0.4, FAN.y + sp * 0.4, FAN.z],
        ], C.wood, { lw: 0.04 });
        void ca; void sa;
      }
      disc(ctx, FAN.x, FAN.y, FAN.z + 0.05, 0.4, C.white, { lw: 0.04 });
      // the sock
      const [sx, sy, sz] = sockAt(t);
      const [X, Y] = P(sx, sy, sz);
      ctx.save();
      ctx.translate(X, Y);
      ctx.rotate(Math.sin(t * 6) * 0.3);
      ctx.beginPath();
      ctx.moveTo(-0.1, -0.1); ctx.lineTo(0.1, -0.1); ctx.lineTo(0.1, 0.35); ctx.lineTo(0.3, 0.45); ctx.lineTo(0.3, 0.6); ctx.lineTo(-0.1, 0.55);
      ctx.closePath();
      paint(ctx, C.red, { lw: 0.04 });
      ctx.restore();
    });
    R.find({ id: 'sock', label: 'The missing red sock', at: (t) => { const [x, y, z] = sockAt(t); return [x, y, z - 0.25]; }, r: 1.0 });

    // The goose, sitting in a laundry basket by the chairs, honking now and then
    R.goose((t) => ({ x: 3.4, y: 6.4, z: 0.72, dir: 'r', pose: pulse(t, 9) > 0.85 ? 'honk' : 'sit' }), { bias: 0.4 });
    R.thing(3.5, 6.9, (ctx) => {
      // the basket the goose has claimed
      box(ctx, 2.7, 5.7, 0, 1.5, 1.4, 0.75, C.pink, { dotsL: C.coral, dens: 0.35 });
      disc(ctx, 3.45, 6.4, 0.76, 0.5, C.white, { stroke: false });
    }, { depth: 3.4 + 6.4 + 0.1 });
    // spare laundry spilling out
    R.rug((ctx) => {
      rect(ctx, 4.1, 7.0, 0.8, 0.6, 0.02, C.coral, { lw: 0.03 });
      rect(ctx, 4.4, 6.5, 0.5, 0.4, 0.03, C.teal, { lw: 0.03 });
    });
  },
};

function note(ctx, x, y, z, t) {
  const [X, Y] = P(x, y, z);
  ctx.fillStyle = alpha(C.ink, 0.8);
  ctx.beginPath();
  ctx.ellipse(X, Y, 0.1, 0.07, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(X + 0.07, Y - 0.35, 0.04, 0.35);
}
