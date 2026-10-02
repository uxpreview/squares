// Laundromat, 2am: a washer foaming over, a ceiling fan wearing a sock,
// a vending machine that needs a kick, and people folding a sheet the size of a sail.
//
// The first room retuned for the difficulty rules (session 9): a spread of
// finds (the cat and the sock to spot; the goose under a heap of laundry and
// a teddy in an out-of-order dryer to poke; a coin in the suds, hard), a
// decoy (the kid's swan float), and things that answer a tap.
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

// The lucky coin, at the edge of machine three's suds.
const COIN = [7.3, 3.45];
// Brass buttons washed out with the suds, round the coin.
const BUTTONS = [[6.2, 3.8], [8.4, 3.75], [7.9, 4.25], [5.6, 3.1]];
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
        if (i === 8) return; // the cat's spot
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
        if (i === 3) {
          // a goose plushie going round on delicates (a decoy)
          const [X, Y] = P(x + w / 2, 1.62, 1.05);
          ctx.save();
          ctx.translate(X, Y);
          ctx.rotate(t * speed * 0.6);
          goose(ctx, 0, 0, -0.25, 0, { pose: 'sit', dir: 'r', scale: 0.5 });
          ctx.restore();
        }
      }, { anim: true });
    });

    R.decoy({ id: 'plushie', at: [WASHERS[3].x + 1, 1.6, 1.05], r: 0.9, say: ['A goose plushie. On delicates.', 'Still on delicates.'] });
    // Machine three answers back.
    R.poke({ id: 'three', at: [WASHERS[2].x + 1, 1.6, 1.05], r: 1.0, sound: 'clunk', say: ['Do NOT open.', 'Seriously.', 'It knows what it did.'] });

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

    // Dryers stacked along the left wall. The bottom one at the back has
    // stopped, door shut on a teddy bear: tap it and the door swings open.
    const broke = R.poke({ id: 'dryer', at: [1.8, 8.15, 1.05], r: 1.0, sound: 'clunk' });
    DRYERS.forEach(({ y, z }, i) => {
      R.thing(0.9, y + 1.15 + z * 0.01, (ctx, t) => {
        box(ctx, 0, y, z, 1.8, 2.3, 2.1, C.greyLight, { top: C.white, right: tint(C.greyLight, 0.4) });
        if (i === 0) { brokenDryer(ctx, y, z, broke.k()); return; }
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

    R.find({ id: 'teddy', label: 'A teddy bear', kind: 'poke', inside: broke, at: [1.75, 8.15, 0.85], r: 0.7, hint: "Somebody's teddy is sitting out a very long spin. One of the dryers has stopped." });

    // A cat asleep on the detergent shelf, curled up between the bottles and
    // much the same color as the one beside it, tail going.
    R.thing(8.3, 0.7, (ctx, t) => {
      const [X, Y] = P(8.3, 0.3, 3.68);
      ctx.save();
      ctx.translate(X, Y);
      ctx.scale(0.72, 0.72);
      ctx.beginPath();
      ctx.ellipse(0, -0.28, 0.62, 0.3, 0, 0, Math.PI * 2);
      paint(ctx, C.mustard, { dots: shade(C.mustard, 0.5), density: 0.3 });
      ctx.beginPath();
      ctx.arc(0.45, -0.3, 0.24, 0, Math.PI * 2);
      paint(ctx, C.mustard);
      ctx.beginPath();
      ctx.moveTo(0.31, -0.49); ctx.lineTo(0.37, -0.66); ctx.lineTo(0.47, -0.52);
      ctx.moveTo(0.51, -0.52); ctx.lineTo(0.61, -0.66); ctx.lineTo(0.65, -0.46);
      paint(ctx, C.mustard);
      const sw = Math.sin(t * 2.2) * 0.12;
      ctx.beginPath();
      ctx.moveTo(-0.55, -0.2);
      ctx.quadraticCurveTo(-0.8, 0.0 + sw, -0.75, 0.2 + sw);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.16; ctx.lineCap = 'round'; ctx.stroke();
      ctx.strokeStyle = C.mustard; ctx.lineWidth = 0.09; ctx.stroke();
      ctx.restore();
      // a bottle of the same yellow, in front of its middle
      box(ctx, 7.85, 0.18, 3.65, 0.42, 0.4, 0.67, C.mustard, { lw: 0.03 });
      box(ctx, 7.98, 0.3, 4.32, 0.16, 0.16, 0.12, C.white, { flat: true, lw: 0.02 });
    }, { anim: true });
    R.find({ id: 'cat', label: 'A cat having a nap', kind: 'hard', at: [8.3, 0.3, 3.85], r: 0.7, riddle: 'Sleeping it off with the soap.', hint: 'Look up. Something on the shelf of soap is breathing.' });

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
      // their swan float, along for the ride (a goose lookalike)
      disc(ctx, p.x + 0.25, p.y + 0.25, 1.17, 0.36, C.pink, { lw: 0.04 });
      disc(ctx, p.x + 0.25, p.y + 0.25, 1.18, 0.16, C.sky, { stroke: false });
      goose(ctx, p.x + 0.25, p.y + 0.25, 1.15, 0, { pose: 'swim', dir: p.dir === 'l' ? 'l' : 'r', scale: 0.7 });
      void sX; void sY;
    });
    R.decoy({ id: 'float', at: (t) => { const p = cart(t); return [p.x + 0.25, p.y + 0.25, 1.5]; }, r: 0.8, say: ['A swan float. Not a goose.', 'Still a pool float.', 'Leave the kid alone.'] });
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

    // A lucky coin, nearly lost in machine three's suds (a hard find): small,
    // and a bubble rides over half of it.
    R.rug((ctx, t) => {
      disc(ctx, COIN[0], COIN[1], 0.03, 0.15, C.mustard, { lw: 0.035 });
      disc(ctx, COIN[0], COIN[1], 0.04, 0.07, C.butter, { stroke: false });
      const b = Math.sin(t * 1.3) * 0.05;
      disc(ctx, COIN[0] - 0.12 + b, COIN[1] - 0.1, 0.06, 0.15, C.white, { dots: C.tealLight, density: 0.25, lw: 0.03 });
    }, { anim: true });
    // Brass buttons off somebody's coat, washed out with the suds: the coin
    // hides among them, and they answer a tap.
    for (const [bx, by] of BUTTONS) {
      R.rug((ctx) => {
        disc(ctx, bx, by, 0.03, 0.12, C.mustard, { lw: 0.03 });
        ctx.fillStyle = C.ink;
        for (const d of [-0.03, 0.03]) { const [X, Y] = P(bx + d, by - d, 0.04); ctx.fillRect(X - 0.012, Y - 0.012, 0.024, 0.024); }
      });
    }
    R.poke({ id: 'buttons', at: [BUTTONS[1][0], BUTTONS[1][1], 0.05], r: 0.6, sound: 'tick', say: ['A button. Not lucky.', 'Another button.'] });
    R.find({ id: 'coin', label: 'A lucky coin', kind: 'hard', at: [COIN[0], COIN[1], 0.05], r: 0.6, riddle: "Somebody's luck is all washed up.", hint: 'Machine three has been foaming all night. Look in what it spat out. Not every gold thing is a coin.' });

    // The vending machine answers a tap, if not the way you'd like.
    R.poke({ id: 'snax', at: [13.3, 1.4, 2.2], r: 1.1, sound: 'clunk', say: ['Out of crisps.', 'Still out of crisps.', 'Try a kick.'] });

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

    // The goose, under a heap of laundry in a basket by the chairs. The heap
    // breathes, and an orange foot sticks out. A tap throws the laundry off,
    // and up it sits, honking now and then.
    const heap = R.poke({ id: 'heap', at: [3.45, 6.4, 1.3], r: 1.0, say: 'HONK?' });
    // ...and another heap in a basket by the table that's just washing.
    const heap2 = R.poke({ id: 'washing', at: [12.6, 8.0, 1.3], r: 1.0, say: ['Just washing.', 'Still just washing.'] });
    R.thing(12.7, 8.5, (ctx, t) => {
      box(ctx, 11.9, 7.3, 0, 1.5, 1.4, 0.75, C.sky, { dotsL: C.navy, dens: 0.35 });
      laundryHeap(ctx, t, heap2.k(), 12.6 - 3.45, 8.0 - 6.4, false);
    }, { anim: true });
    R.goose((t) => {
      const k = heap.k();
      return { x: 3.4, y: 6.4, z: 0.1 + 0.62 * k, dir: 'r', hidden: k < 0.3, pose: k > 0.5 && pulse(t, 9) > 0.85 ? 'honk' : 'sit' };
    }, { bias: 0.4, kind: 'poke', inside: heap, hint: 'Two heaps of washing, and one of them is breathing.' });
    R.thing(3.5, 6.9, (ctx, t) => laundryHeap(ctx, t, heap.k(), 0, 0, true), { anim: true, depth: 3.4 + 6.4 + 0.6 });
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

// The stopped dryer: door shut with a paw caught in its seal (k 0), or swung
// open on a teddy bear sitting in the drum (k 1).
function brokenDryer(ctx, y, z, k) {
  const cy = y + 1.15, cz = z + 1.05;
  onPlane(ctx, 'x', 1.8, cy, cz, (g) => {
    g.beginPath();
    g.arc(0, 0, 0.84, 0, Math.PI * 2);
    paint(g, C.greyLight, { lw: 0.05 });
    g.beginPath();
    g.arc(0, 0, 0.7, 0, Math.PI * 2);
    paint(g, k > 0.5 ? C.navy : shade(C.greyLight, 0.25), { lw: 0.04 });
  });
  if (k > 0.5) {
    // the teddy, sat in the drum
    const [X, Y] = P(1.6, cy, cz - 0.25);
    ctx.save();
    ctx.translate(X, Y);
    ctx.beginPath(); ctx.ellipse(0, 0, 0.3, 0.26, 0, 0, Math.PI * 2); paint(ctx, C.wood, { lw: 0.035 });
    ctx.beginPath(); ctx.arc(0, -0.36, 0.2, 0, Math.PI * 2); paint(ctx, C.wood, { lw: 0.035 });
    for (const ex of [-0.15, 0.15]) { ctx.beginPath(); ctx.arc(ex, -0.52, 0.08, 0, Math.PI * 2); paint(ctx, C.wood, { lw: 0.03 }); }
    ctx.fillStyle = C.ink;
    for (const ex of [-0.07, 0.07]) { ctx.beginPath(); ctx.arc(ex, -0.39, 0.025, 0, Math.PI * 2); ctx.fill(); }
    ctx.beginPath(); ctx.arc(0, -0.31, 0.04, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // the door: flat on the front when shut, swung out toward you when open
  const w = 0.72 * Math.cos(k * Math.PI * 0.45);
  onPlane(ctx, k > 0.5 ? 'y' : 'x', 1.8, k > 0.5 ? cy + 0.85 : cy, cz, (g) => {
    g.beginPath();
    g.ellipse(k > 0.5 ? 0.75 * (1 - w / 0.72 * 0.4) : 0, 0, k > 0.5 ? 0.72 : Math.max(0.12, w), 0.8, 0, 0, Math.PI * 2);
    paint(g, C.greyLight, { lw: 0.05 });
    g.beginPath();
    g.ellipse(k > 0.5 ? 0.75 * (1 - w / 0.72 * 0.4) : 0, 0, (k > 0.5 ? 0.5 : Math.max(0.06, w * 0.7)), 0.58, 0, 0, Math.PI * 2);
    paint(g, alpha(C.sky, 0.6), { lw: 0.03 });
  });
  if (k < 0.5) {
    // a brown ear and paw caught in the door's seal: someone's in there (no sign: it's just a stopped dryer)
    const [px, py] = P(1.82, cy - 0.62, cz - 0.35);
    ctx.beginPath(); ctx.ellipse(px, py, 0.22, 0.15, 0.5, 0, Math.PI * 2); paint(ctx, C.wood, { lw: 0.035 });
    ctx.fillStyle = C.brown;
    for (const d of [-0.09, 0.0, 0.09]) { ctx.beginPath(); ctx.arc(px + d, py + 0.06, 0.035, 0, Math.PI * 2); ctx.fill(); }
    const [ex, ey] = P(1.82, cy - 0.5, cz + 0.6);
    ctx.beginPath(); ctx.arc(ex, ey, 0.15, Math.PI * 0.9, Math.PI * 2.1); ctx.closePath(); paint(ctx, C.wood, { lw: 0.035 });
  }
  const [lx, ly] = P(1.81, y + 0.3, z + 1.8);
  ctx.fillStyle = C.red;
  ctx.beginPath(); ctx.arc(lx, ly, 0.07, 0, Math.PI * 2); ctx.fill();
}

// A heap of washing piled on the goose (k 0), or thrown off it and lying
// round the basket (k 1). It breathes while the goose is under it.
// Each piece: its ink, where it sits on the heap, where it lands, its seed.
const PIECES = [
  [C.teal, [3.1, 6.0, 0.95], [5.0, 6.0], 1], [C.coral, [3.9, 6.0, 0.95], [5.4, 6.9], 2], [C.sky, [3.0, 6.8, 0.95], [2.6, 7.9], 3],
  [C.mustard, [3.9, 6.8, 0.95], [4.9, 7.6], 4], [C.purple, [3.5, 6.1, 1.3], [3.9, 7.7], 5], [C.white, [3.4, 6.6, 1.35], [3.2, 8.4], 6],
  [C.pink, [3.45, 6.35, 1.7], [4.4, 8.5], 7],
];
// A crumpled bit of cloth: a lumpy outline round (x, y, z), standing up on
// the heap (flat 0) or lying flat on the floor (flat 1).
function cloth(ctx, x, y, z, r, c, seed, flat) {
  ctx.beginPath();
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2, j = 0.75 + 0.35 * Math.abs(Math.sin(seed * 7.1 + i * 2.3));
    const dx = Math.cos(a) * r * j, dy = Math.sin(a) * r * j;
    // standing: a lump in the screen's plane; flat: in the floor's.
    const [X, Y] = flat > 0.5 ? P(x + dx, y + dy * 0.8, z) : P(x + dx * 0.7, y - dx * 0.7, z + dy * 0.9);
    if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
  }
  ctx.closePath();
  paint(ctx, c, { lw: 0.035, dots: c === C.white ? C.pink : shade(c, 0.35), density: 0.25 });
  // a fold
  const [a0, b0] = flat > 0.5 ? P(x - r * 0.4, y, z) : P(x - r * 0.3, y + r * 0.3, z + r * 0.1);
  const [a1, b1] = flat > 0.5 ? P(x + r * 0.3, y + r * 0.2, z) : P(x + r * 0.2, y - r * 0.2, z - r * 0.25);
  ctx.beginPath(); ctx.moveTo(a0, b0); ctx.lineTo(a1, b1);
  ctx.strokeStyle = alpha(C.ink, 0.6); ctx.lineWidth = 0.03; ctx.stroke();
}
// (dx, dy: where this heap is from the goose's; breathes: the goose's heap,
// gently, as something under it breathes.)
function laundryHeap(ctx, t, k, dx = 0, dy = 0, breathes = false) {
  const breathe = breathes && k < 0.5 ? (Math.sin(t * 2.4) + 1) * 0.035 : 0;
  for (const [c, [hx, hy, hz], [fx, fy], seed] of PIECES) {
    const x = hx + dx + (fx - hx) * k, y = hy + dy + (fy - hy) * k;
    const z = hz * (1 - k) + 0.03 * k + Math.sin(k * Math.PI) * 1.4 + breathe * (hz - 0.8);
    cloth(ctx, x, y, z, 0.48, c, seed + (dx ? 3 : 0), k);
  }
}

function note(ctx, x, y, z, t) {
  const [X, Y] = P(x, y, z);
  ctx.fillStyle = alpha(C.ink, 0.8);
  ctx.beginPath();
  ctx.ellipse(X, Y, 0.1, 0.07, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(X + 0.07, Y - 0.35, 0.04, 0.35);
}
