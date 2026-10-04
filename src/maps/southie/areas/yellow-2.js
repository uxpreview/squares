// The Overlap: the Yellow House's second floor. The old tenant hasn't
// finished leaving and the new one (a grad student) has arrived: two of
// everything (two couches facing off, two toasters, two microwaves, two of
// the same poster, two cats), one apartment, a standoff at the kitchen table
// over a lease they've both signed.
// From ten he has one box left, and it's the last box every time you look:
// he keeps finding one more thing to put in it. His clock stopped at 11:58.
// At noon the box goes, and so does he. She gets the toaster.
import {
  C, Q, box, rect, disc, face, paint, person, folk, speech, shade, tint, mix, alpha,
  onLeft, onRight, P, chair, table, plant, goose,
} from '../../../engine/art.js';
import { schedule, particles, clamp } from '../../../engine/actors.js';
import { apartment, carton, lettering, cat } from '../kit.js';
import { SIDING, TRIM, ROOM, BRAND, lightsOn } from '../style.js';
import { BEFORE, AFTER, hour, at } from '../clock.js';
import { LOOP } from '../plan.js';
import { oldSide, newSide, tapeLabel, backWindow, says, sofa, tailOut, footOut } from './yellow-1.js';


// A toaster on its side of the kitchen, popping now and then.
function toaster(ctx, x, y, z, t, color, every, off) {
  const p = (t + off) % every, pop = p < 1.2 ? Math.min(1, p / 0.12) * 0.22 : 0;
  // The toast first, so the toaster's front covers its bottom.
  for (const u of [x + 0.15, x + 0.33]) box(ctx, u, y + 0.12, z + 0.1 + pop, 0.08, 0.3, 0.3, C.wood, { flat: true, lw: 0.02, top: C.woodLight });
  box(ctx, x, y, z, 0.55, 0.55, 0.36, color, { flat: true, lw: 0.03 });
  for (const u of [x + 0.15, x + 0.33]) rect(ctx, u, y + 0.12, 0.08, 0.3, z + 0.361, C.ink, { stroke: false });
  if (Q.detail) box(ctx, x + 0.55, y + 0.2, z + 0.12, 0.03, 0.12, 0.1, C.ink, { flat: true, stroke: false });
}

// The lease, signed twice (both names on the line, one on top of the
// other).
function lease(ctx, x, y, z) {
  rect(ctx, x - 0.32, y - 0.4, 0.64, 0.8, z, C.white, { lw: 0.02 });
  if (!Q.detail) return;
  ctx.strokeStyle = alpha(C.ink, 0.5); ctx.lineWidth = 0.02; ctx.beginPath();
  for (let i = 0; i < 5; i++) { const [a, b] = P(x - 0.22, y - 0.3 + i * 0.1, z), [c, d] = P(x + 0.22, y - 0.3 + i * 0.1, z); ctx.moveTo(a, b); ctx.lineTo(c, d); }
  ctx.stroke();
  // The two signatures, scrawled over each other.
  const sig = (dy, col) => {
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) { const [a, b] = P(x - 0.22 + i * 0.045, y + 0.22 + dy + Math.sin(i * 1.9) * 0.05, z); if (i) ctx.lineTo(a, b); else ctx.moveTo(a, b); }
    ctx.strokeStyle = col; ctx.lineWidth = 0.03; ctx.stroke();
  };
  sig(0, C.navy); sig(0.03, C.red);
}

// The stopped clock face on the back wall (y = 0) at x, z: h:m.
function clockR(ctx, x, z, r, h, m, col = C.white) {
  const [X, Y] = P(x, 0, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.transform(1, 0.5, 0, 1, 0, 0);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); paint(ctx, col, { lw: 0.05 });
  const hA = ((h % 12) + m / 60) / 12 * Math.PI * 2, mA = (m / 60) * Math.PI * 2;
  ctx.strokeStyle = C.ink; ctx.lineCap = 'round';
  ctx.lineWidth = 0.08; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(hA) * r * 0.5, -Math.cos(hA) * r * 0.5); ctx.stroke();
  ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(mA) * r * 0.8, -Math.cos(mA) * r * 0.8); ctx.stroke();
  ctx.restore();
}

// A manila folder flat on the table, its back corner at (x, y), z its
// top: the cover flips over to the left as k goes 0 to 1. inside(ctx) draws
// what's in it (under the cover).
function folder(ctx, x, y, z, k, inside) {
  const w = 0.7, d = 0.8, col = tint(C.mustard, 0.45);
  rect(ctx, x, y, w, d, z, shade(col, 0.08), { lw: 0.02 });
  if (inside) inside(ctx);
  // The cover, hinged along its back edge (x), swinging up and over.
  const a = k * Math.PI, cx = Math.cos(a) * w, cz = Math.sin(a) * w;
  face(ctx, [[x, y, z + 0.012], [x, y + d, z + 0.012], [x + cx, y + d, z + 0.012 + cz], [x + cx, y, z + 0.012 + cz]], col, { lw: 0.02 });
  if (k < 0.5) {
    // The tab, and LEASE on both (same handwriting).
    face(ctx, [[x + w, y + 0.1, z + 0.013], [x + w + 0.1, y + 0.15, z + 0.013], [x + w + 0.1, y + 0.4, z + 0.013], [x + w, y + 0.45, z + 0.013]], col, { lw: 0.015 });
    if (Q.detail) lettering(ctx, 'y', x + w * 0.5, y + d / 2, z + 0.014, 'LEASE', 0.1, C.ink);
  }
}
// A blue plastic laundry basket, its back corner at (x, y), a heap of
// clothes on top that flies off as k goes 0 to 1. o.goose: the goose is in
// it (a tail tip out of the clothes and a foot out of a hole in the weave).
const BASKET = { w: 1.1, d: 0.95, h: 0.55 };
function basket(ctx, x, y, k, o = {}) {
  const { w, d, h } = BASKET, col = C.sky;
  box(ctx, x, y, 0, w, d, h, col, { lw: 0.035, top: shade(col, 0.35), dots: shade(col, 0.3), density: 0.15 });
  // The weave: rows of holes on both faces we see.
  if (Q.detail) {
    ctx.fillStyle = shade(col, 0.45);
    for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) {
      const z = 0.17 + r * 0.2;
      const [X, Y] = P(x + 0.18 + i * 0.25, y + d, z); ctx.beginPath(); ctx.ellipse(X, Y, 0.06, 0.035, 0, 0, Math.PI * 2); ctx.fill();
      if (i < 3) { const [U, V] = P(x + w, y + 0.2 + i * 0.27, z); ctx.beginPath(); ctx.ellipse(U, V, 0.06, 0.035, 0, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  // The heap: a few shirts and a towel, lifted and tossed back.
  const up = k * 0.9, out = k * 0.5;
  const heap = [[0.08, 0.1, 0.5, 0.4, C.pink], [0.5, 0.15, 0.5, 0.45, C.mustard], [0.15, 0.5, 0.55, 0.38, C.coral], [0.55, 0.55, 0.45, 0.35, C.green]];
  heap.forEach(([u, v, a, b, c], i) => {
    const dx = (i % 2 ? 1 : -1) * out, dz = up * (1 - i * 0.15);
    box(ctx, x + u + dx, y + v - out * 0.3, h - 0.05 + dz, a, b, 0.14, c, { flat: true, lw: 0.02 });
  });
  if (o.goose && k < 0.3) {
    const [a, b] = P(x + w * 0.35, y + d * 0.4, h + 0.18);
    tailOut(ctx, a, b, -1, 1.2);
    const [fx, fy] = P(x + 0.43, y + d + 0.01, 0.17);
    footOut(ctx, fx, fy, -1, 1.2);
  }
}
const BASKETS = [[6.9, 7.0], [8.25, 7.0]]; // the goose is in the first
const TABLE_Z = 1.205;
const FOLDERS = [[1.45, 3.65], [2.45, 3.65]]; // his, hers (the lease is in hers)

// Where the last box is, and where he stands to put one more thing in it.
const LAST = { x: 5.4, y: 4.4, w: 1, h: 1 };
const DROP = [6.85, 4.7];
// The morning's trips for one more thing: where it is, and what it is.
const TRIPS = [
  [[1.6, 6.3], 'pan'], [[8.3, 6.0], 'pillow'], [[7.6, 7.9], 'plant'], [[1.7, 1.2], 'mug'], [[8.3, 6.0], 'lamp'], [[9.6, 2.6], 'remote'],
];

export default {
  id: 'yellow-2',
  name: 'The Overlap',
  blurb: 'The lease says noon, it is 11:58, and there has been one box left since ten. Flip the clock to see what he took.',
  size: [15, 9],
  build(R) {
    const W = ROOM['yellow-2'];
    apartment(R, { floor: 1, walls: W, floorInk: W.floor, siding: SIDING.yellow, trim: TRIM.yellow });
    const old = oldSide, neu = newSide;
    const h = hour;

    // ---------- The floor and the walls ----------
    R.floor((ctx) => {
      if (!Q.detail) return;
      ctx.save(); ctx.globalAlpha *= 0.22;
      for (let y = 2.5; y < 9; y += 0.55) face(ctx, [[0, y, 0.004], [12.5, y, 0.004], [12.5, y + 0.03, 0.004], [0, y + 0.03, 0.004]], C.brown, { stroke: false });
      ctx.restore();
      // A strip of tape across the floor: his side, her side.
      face(ctx, [[4.9, 2.1, 0.006], [5.05, 2.1, 0.006], [5.05, 9, 0.006], [4.9, 9, 0.006]], alpha(C.mustard, 0.8), { stroke: false });
    });
    // Two rugs, overlapping.
    R.rug((ctx) => {
      rect(ctx, 8.7, 4.1, 3.2, 2.2, 0.008, C.teal, { dots: shade(C.teal, 0.4), density: 0.18, lw: 0.02 });
    }, { on: old });
    R.rug((ctx) => {
      rect(ctx, 9.3, 3.5, 2.6, 2.0, 0.012, C.coral, { dots: shade(C.coral, 0.35), density: 0.15, lw: 0.02 });
      if (Q.detail) rect(ctx, 9.55, 3.75, 2.1, 1.5, 0.013, null, { lw: 0.03, stroke: C.white });
    });
    R.decor((ctx) => {
      onLeft(ctx, 0, 0, 9, 0.28, tint(C.white, 0.2), { stroke: false });
      onRight(ctx, 0, 0, 12.5, 0.28, tint(C.white, 0.2), { stroke: false });
    });
    // Two of the same poster (water lilies), one each. His comes down at
    // noon and leaves a paler square.
    const lilies = (ctx, y0) => {
      onLeft(ctx, y0, 1.9, 1.2, 1.5, C.ink, { lw: 0.03 });
      onLeft(ctx, y0 + 0.08, 1.98, 1.04, 1.34, tint(C.teal, 0.35), { stroke: false });
      if (!Q.detail) return;
      for (const [u, v, c] of [[0.25, 0.35, C.pink], [0.6, 0.55, C.mint], [0.8, 0.3, C.pink], [0.45, 0.95, C.mint], [0.8, 1.05, C.lilac]]) {
        const [X, Y] = P(0, y0 + 0.08 + u, 1.98 + v); ctx.beginPath(); ctx.ellipse(X, Y, 0.16, 0.08, -0.45, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill();
      }
    };
    R.decor((ctx) => lilies(ctx, 3.0));
    R.thing(0.01, 1.8, (ctx) => lilies(ctx, 1.4), { on: (t) => h(t) < 12 && h(t) >= 5 });
    R.thing(0.01, 1.8, (ctx) => onLeft(ctx, 1.4, 1.9, 1.2, 1.5, alpha(C.white, 0.35), { stroke: false }), { on: (t) => !(h(t) < 12 && h(t) >= 5) });
    backWindow(R, 5.9, 1.95, 1.1, 1.3);
    // His clock, stopped at 11:58 all morning. It goes with him at noon,
    // and leaves a clean circle on the wall (and its nail).
    R.thing(9.8, 0.02, (ctx) => clockR(ctx, 9.8, 2.9, 0.45, 11, 58), { on: old });
    R.thing(9.8, 0.02, (ctx) => {
      const [X, Y] = P(9.8, 0, 2.9);
      ctx.save(); ctx.translate(X, Y); ctx.transform(1, 0.5, 0, 1, 0, 0);
      ctx.beginPath(); ctx.arc(0, 0, 0.45, 0, Math.PI * 2); ctx.fillStyle = tint(W.right, 0.55); ctx.fill();
      ctx.strokeStyle = alpha(shade(W.right, 0.3), 0.6); ctx.lineWidth = 0.02; ctx.stroke();
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0, -0.38, 0.035, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }, { on: (t) => !old(t) });

    // ---------- The kitchen ----------
    // The fridge, and her mini fridge next to it.
    R.thing(1.3, 1.4, (ctx) => {
      box(ctx, 0.08, 0.2, 0, 1.15, 1.15, 3.0, C.white, { lw: 0.045 });
      face(ctx, [[1.23, 0.25, 1.9], [1.23, 1.35, 1.9]], null, { lw: 0.04 });
      box(ctx, 1.23, 1.15, 1.2, 0.08, 0.1, 0.6, C.greyLight, { flat: true, lw: 0.02 });
    });
    R.thing(1.2, 2.25, (ctx) => {
      box(ctx, 0.1, 1.45, 0, 0.8, 0.75, 0.95, C.purple, { lw: 0.035 });
      if (Q.detail) lettering(ctx, 'x', 0.5, 2.21, 0.6, 'MINE', 0.14, C.white);
    });
    // The counter along the back wall, crowded: his microwave on her
    // microwave, two coffee makers, his toaster.
    R.thing(1.1, 8.8, (ctx) => {
      box(ctx, 0, 5.6, 0, 1.1, 3.2, 1.15, tint(C.mint, 0.3), { lw: 0.04, top: C.greyLight });
      if (Q.detail) for (const u of [6.6, 7.7]) face(ctx, [[1.1, u, 0.15], [1.1, u, 1.0]], null, { lw: 0.025 });
      rect(ctx, 0.2, 6.2, 0.7, 0.75, 1.151, shade(C.grey, 0.15), { lw: 0.025 });
      box(ctx, 0.05, 6.5, 1.15, 0.12, 0.08, 0.5, C.greyLight, { flat: true, lw: 0.02 });
    });
    R.thing(1.0, 8.7, (ctx) => {
      for (const [z, col] of [[1.15, C.white], [1.72, C.black]]) {
        box(ctx, 0.15, 7.75, z, 0.8, 0.95, 0.57, col, { flat: true, lw: 0.03 });
        face(ctx, [[0.95, 7.85, z + 0.1], [0.95, 8.4, z + 0.1], [0.95, 8.4, z + 0.47], [0.95, 7.85, z + 0.47]], shade(C.grey, 0.3), { lw: 0.02 });
      }
      for (const [y, col] of [[5.7, C.red], [7.1, C.black]]) {
        box(ctx, 0.2, y, 1.15, 0.5, 0.45, 0.65, col, { flat: true, lw: 0.025 });
        box(ctx, 0.55, y + 0.1, 1.15, 0.25, 0.25, 0.25, alpha(C.brown, 0.8), { flat: true, lw: 0.02 });
      }
    });
    R.thing(0.95, 5.4, (ctx, t) => toaster(ctx, 0.3, 4.95, 1.15, t, C.greyLight, 9, 0), { anim: true });
    R.thing(1.2, 4.5, (ctx) => box(ctx, 0, 3.9, 0, 1.1, 1.7, 1.15, tint(C.mint, 0.3), { lw: 0.04, top: C.greyLight }));
    // Her toaster, on a milk crate on the floor, because the counter's full.
    R.thing(1.85, 7.85, (ctx) => {
      box(ctx, 1.1, 7.0, 0, 0.75, 0.8, 0.3, C.teal, { flat: true, lw: 0.03 });
      if (Q.detail) for (const u of [7.2, 7.4, 7.6]) face(ctx, [[1.1, u, 0.04], [1.85, u, 0.04]], null, { lw: 0.025, stroke: shade(C.teal, 0.4) });
    });
    R.thing(1.95, 7.95, (ctx, t) => toaster(ctx, 1.2, 7.12, 0.3, t, C.coral, 11, 5), { anim: true });
    R.thing(0.95, 5.4, (ctx) => tapeLabel(ctx, 'y', 0.86, 5.22, 1.34, 'YOURS NOW', 0.1), { on: neu });

    // The kitchen table: the standoff, the lease on it.
    R.thing(0.6, 3.6, (ctx) => chair(ctx, 0.35, 3.4, 0, C.wood, 'r'), { depth: 3.9 });
    R.thing(3.5, 4.7, (ctx) => {
      table(ctx, 1.2, 3.0, 2.2, 1.6, 1.2, C.wood);
      disc(ctx, 1.7, 3.35, 1.21, 0.12, C.white, { lw: 0.02 });
      disc(ctx, 3.0, 3.3, 1.21, 0.12, C.pink, { lw: 0.02 });
    });
    // Two matching folders on it, LEASE on both. The lease is in hers; his
    // has a pizza menu. A tap flips a cover open.
    const fHis = R.poke({ id: 'folder', at: [FOLDERS[0][0] + 0.35, FOLDERS[0][1] + 0.4, 1.3], r: 0.55, sound: 'tick', say: ['A pizza menu.', 'Still a pizza menu.'] });
    const fHers = R.poke({ id: 'folder2', at: [FOLDERS[1][0] + 0.35, FOLDERS[1][1] + 0.4, 1.3], r: 0.55, sound: 'tick' });
    R.thing(3.5, 4.75, (ctx) => {
      folder(ctx, FOLDERS[0][0], FOLDERS[0][1], TABLE_Z, fHis.k(), (c) => {
        const [x, y] = FOLDERS[0];
        rect(c, x + 0.1, y + 0.1, 0.5, 0.6, TABLE_Z + 0.006, C.red, { lw: 0.015 });
        if (Q.detail) lettering(c, 'y', x + 0.35, y + 0.4, TABLE_Z + 0.008, 'PIZZA', 0.09, C.white);
      });
      folder(ctx, FOLDERS[1][0], FOLDERS[1][1], TABLE_Z, fHers.k(), (c) => lease(c, FOLDERS[1][0] + 0.35, FOLDERS[1][1] + 0.4, TABLE_Z + 0.006));
    }, { anim: true });
    R.thing(4.3, 4.3, (ctx) => {
      box(ctx, 3.45, 3.4, 0.8, 0.8, 0.8, 0.15, C.coral);
      box(ctx, 4.1, 3.4, 0.8, 0.15, 0.8, 0.9, C.coral);
      for (const [lx, ly] of [[3.5, 3.45], [3.5, 4.05], [4.1, 4.05]]) box(ctx, lx, ly, 0, 0.1, 0.1, 0.8, C.ink, { flat: true, stroke: false });
    });

    // ---------- The front room: two couches, facing off ----------
    // Hers facing out, his facing hers (you see the back of it). His goes at
    // noon.
    R.thing(11.2, 4.2, (ctx) => sofa(ctx, 9.0, 3.0, 2.2, C.coral));
    R.thing(11.2, 6.9, (ctx) => {
      const x = 9.0, y = 5.6, w = 2.2, d = 1.2, col = C.teal;
      box(ctx, x, y, 0, w, d, 0.5, shade(col, 0.12), { lw: 0.04 });
      box(ctx, x + 0.25, y, 0.5, w - 0.5, d - 0.3, 0.22, tint(col, 0.08), { lw: 0.03 });
      box(ctx, x, y + d - 0.32, 0.5, w, 0.32, 0.75, col, { lw: 0.04 });
      box(ctx, x, y, 0.5, 0.26, d - 0.3, 0.4, col, { lw: 0.035 });
      box(ctx, x + w - 0.26, y, 0.5, 0.26, d - 0.3, 0.4, col, { lw: 0.035 });
    }, { on: old });
    // Her things, after noon, where his were: a desk by the bay with her
    // laptop on it, and a big plant.
    R.thing(10.9, 7.2, (ctx) => {
      table(ctx, 9.3, 6.1, 1.6, 0.95, 1.15, C.white);
      chair(ctx, 9.6, 7.15, 0, C.mustard, 'l');
    }, { on: neu });
    R.thing(10.95, 7.25, (ctx, t) => {
      box(ctx, 9.7, 6.35, 1.15, 0.7, 0.5, 0.04, C.greyLight, { flat: true, lw: 0.02 });
      face(ctx, [[9.7, 6.35, 1.19], [10.4, 6.35, 1.19], [10.4, 6.3, 1.65], [9.7, 6.3, 1.65]], lightsOn(t) ? tint(C.sky, 0.5) : C.greyLight, { lw: 0.02 });
    }, { anim: true, step: (t) => (lightsOn(t) ? 1 : 0), on: neu });
    R.thing(12.2, 7.9, (ctx, t) => {
      box(ctx, 11.5, 7.3, 0, 0.6, 0.6, 0.55, C.coral, { flat: true, lw: 0.03 });
      plant(ctx, 11.8, 7.6, 0.05, t, { kind: 'palm', scale: 1.3, pot: false });
    }, { anim: true, on: neu });
    // Two floor lamps.
    const floorLamp = (x, y, shadeCol) => (ctx) => {
      box(ctx, x - 0.2, y - 0.2, 0, 0.4, 0.4, 0.06, C.ink, { flat: true, stroke: false });
      box(ctx, x - 0.03, y - 0.03, 0.06, 0.06, 0.06, 2.3, C.ink, { flat: true, stroke: false });
      const [X, Y] = P(x, y, 2.45);
      ctx.beginPath(); ctx.moveTo(X - 0.28, Y - 0.3); ctx.lineTo(X + 0.28, Y - 0.3); ctx.lineTo(X + 0.42, Y + 0.25); ctx.lineTo(X - 0.42, Y + 0.25); ctx.closePath();
      paint(ctx, shadeCol, { lw: 0.035 });
    };
    R.thing(12.0, 2.7, floorLamp(11.8, 2.5, C.butter));
    R.thing(12.0, 7.4, floorLamp(11.8, 7.2, C.mint), { on: old });
    R.light({ at: [11.8, 2.5, 2.4], r: 3, color: C.butter, k: (t) => (lightsOn(t) ? 0.7 : 0) });
    // Two TVs, back to back on one stand (hers is a laptop, really).
    R.thing(12.3, 5.3, (ctx) => {
      box(ctx, 11.7, 3.95, 0, 0.6, 1.3, 0.7, C.wood, { lw: 0.035 });
      box(ctx, 11.8, 4.05, 0.7, 0.18, 1.1, 0.7, C.black, { flat: true, lw: 0.03 });
    }, { on: old });

    // The cats: his on the back of his couch, hers on her couch, glaring.
    R.mover(() => ({ x: 10.2, y: 6.85 }), (ctx, t) => {
      if (!old(t)) return;
      const cross = Math.sin(t * 0.45) > 0.2;
      cat(ctx, 10.2, 6.6, 1.25, t, { color: C.ink, eyes: C.mustard, dir: 'r', cross, phase: 1 });
      if (cross && Q.detail && Math.sin(t * 0.45) > 0.6) speech(ctx, 10.2, 6.6, 2.35, 'Hsss', { size: 0.34 });
    }, { depth: 18.6 });
    R.mover(() => ({ x: 10.4, y: 3.9 }), (ctx, t) => {
      const cross = old(t) && Math.sin(t * 0.45 + 2) > 0.2;
      cat(ctx, 10.4, 3.75, 0.72, t, { color: C.mustard, eyes: C.green, dir: 'l', cross, phase: 3 });
    }, { depth: 15.9 });

    // ---------- The middle room ----------
    // Her boxes of books, stacked, which she unpacks through the afternoon.
    const books = (x, y, words, until) => R.thing(x + 0.9, y + 0.7, (ctx) => {
      let z = 0;
      for (const w of words) { carton(ctx, x, y, z, 0.9, 0.7, 0.55, w); z += 0.55; }
    }, { on: (t) => { const x = h(t); return x >= 5 && x < until; } });
    books(7.2, 2.4, ['BOOKS', 'BOOKS', 'THESIS'], 16);
    books(3.3, 7.7, ['BOOKS (HEAVY)', 'MORE BOOKS'], 18.5);
    books(7.3, 3.4, ['NOTES'], 20);
    // Her bookshelf, filling up after noon.
    R.thing(7.3, 8.9, (ctx, t) => {
      const x0 = 5.6, y0 = 8.4;
      box(ctx, x0, y0, 0, 1.7, 0.5, 2.6, C.white, { lw: 0.04 });
      const full = clamp((h(t) - 13) / 6) + (h(t) < 5 ? 1 : 0);
      for (let s = 0; s < 4; s++) {
        const z = 0.1 + s * 0.62;
        box(ctx, x0 + 0.05, y0 + 0.02, z, 1.6, 0.46, 0.05, C.greyLight, { flat: true, stroke: false });
        const n = Math.floor(clamp(full * 4 - s) * 9);
        for (let i = 0; i < n; i++) box(ctx, x0 + 0.12 + i * 0.16, y0 + 0.1, z + 0.05, 0.12, 0.35, 0.36 + ((i * 7) % 3) * 0.05, [C.coral, C.navy, C.teal, C.mustard, C.purple][(i + s) % 5], { flat: true, lw: 0.012 });
      }
    }, { anim: true, step: (t) => Math.floor((clamp((h(t) - 13) / 6) + (h(t) < 5 ? 1 : 0)) * 36) });
    // Two of the same laundry basket, of course, side by side, a heap on
    // each. The goose is in the first: its tail out of the heap, a foot out
    // of the weave. A tap throws the clothes off.
    const hide = R.poke({ id: 'basket', at: [BASKETS[0][0] + 0.55, BASKETS[0][1] + 0.48, 0.7], r: 0.75, sound: 'pop', say: 'HONK.' });
    const twin = R.poke({ id: 'basket2', at: [BASKETS[1][0] + 0.55, BASKETS[1][1] + 0.48, 0.7], r: 0.75, sound: 'pop', say: ['Just laundry.', 'Still just laundry.'] });
    BASKETS.forEach(([x, y], i) => {
      const pk = i ? twin : hide;
      R.thing(x + BASKET.w, y + BASKET.d, (ctx) => basket(ctx, x, y, pk.k(), { goose: !i }), { anim: true });
    });
    // His bike (before noon), her bike (all day), both against the stairs rail.
    const bike = (x, col) => (ctx) => {
      for (const u of [x, x + 1.35]) {
        const [X, Y] = P(u, 2.35, 0.45);
        ctx.beginPath(); ctx.ellipse(X, Y, 0.45, 0.5, 0.45, 0, Math.PI * 2); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.07; ctx.stroke();
      }
      const pts = [[x, 0.45], [x + 0.55, 1.05], [x + 1.1, 1.05], [x + 1.35, 0.45], [x + 0.7, 0.45], [x + 0.55, 1.05]];
      ctx.beginPath(); pts.forEach(([u, z], i) => { const [a, b] = P(u, 2.35, z); if (i) ctx.lineTo(a, b); else ctx.moveTo(a, b); });
      ctx.strokeStyle = col; ctx.lineWidth = 0.08; ctx.stroke();
      box(ctx, x + 0.45, 2.3, 1.1, 0.3, 0.12, 0.06, C.ink, { flat: true, stroke: false });
    };
    R.thing(6.6, 2.4, bike(4.9, C.teal), { on: old });

    // ---------- The last box ----------
    // The pile in it grows through the morning: one more thing a trip.
    R.thing(LAST.x + 1, LAST.y + 1, (ctx, t) => {
      const x = h(t);
      box(ctx, LAST.x, LAST.y, 0, 1, 1, 1, C.woodLight, { flat: true, lw: 0.04, top: shade(C.woodLight, 0.55) });
      if (Q.detail) lettering(ctx, 'x', LAST.x + 0.5, LAST.y + 1.01, 0.5, 'LAST BOX', 0.17, C.ink);
      const n = x < 10 ? 1 : Math.min(TRIPS.length + 1, 1 + Math.floor((x - 10) / 0.33));
      const cx = LAST.x + 0.5, cy = LAST.y + 0.5;
      // What's in it: a sweater first, then the trips' things.
      box(ctx, LAST.x + 0.1, LAST.y + 0.1, 0.85, 0.8, 0.8, 0.2, C.red, { flat: true, lw: 0.02 });
      if (n > 1) box(ctx, cx - 0.05, cy - 0.4, 1.0, 0.1, 0.1, 0.55, C.ink, { flat: true, stroke: false });
      if (n > 1) disc(ctx, cx + 0.05, cy - 0.35, 1.55, 0.2, C.ink, { lw: 0.02 });
      if (n > 2) box(ctx, cx - 0.35, cy - 0.2, 1.0, 0.7, 0.45, 0.3, C.pink, { flat: true, lw: 0.025 });
      if (n > 3) { box(ctx, cx - 0.2, cy + 0.05, 1.25, 0.3, 0.3, 0.3, C.coral, { flat: true, lw: 0.02 }); const [X, Y] = P(cx - 0.05, cy + 0.2, 1.6); ctx.beginPath(); ctx.arc(X, Y - 0.2, 0.28, 0, Math.PI * 2); paint(ctx, C.green, { lw: 0.025 }); }
      if (n > 4) { const [X, Y] = P(cx + 0.3, cy + 0.3, 1.1); ctx.beginPath(); ctx.roundRect(X - 0.1, Y - 0.25, 0.26, 0.25, 0.08); paint(ctx, C.white, { lw: 0.02 }); }
      if (n > 5) { box(ctx, cx + 0.15, cy - 0.3, 1.3, 0.06, 0.06, 1.1, C.ink, { flat: true, stroke: false }); const [X, Y] = P(cx + 0.18, cy - 0.27, 2.5); ctx.beginPath(); ctx.moveTo(X - 0.2, Y - 0.2); ctx.lineTo(X + 0.2, Y - 0.2); ctx.lineTo(X + 0.32, Y + 0.18); ctx.lineTo(X - 0.32, Y + 0.18); ctx.closePath(); paint(ctx, C.mint, { lw: 0.025 }); }
    }, { anim: true, on: (t) => { const x = h(t); return x >= 5 && x < 11.88; } });

    // The old tenant: at the table from seven, arguing; from ten, back and
    // forth for one more thing; at noon, gone with the box.
    const steps = [[0.8, 3.8], { until: at(9.8), sit: true }, [DROP[0], DROP[1]], { until: at(10) + 1 }];
    for (const [pt, what] of TRIPS) steps.push([pt[0], pt[1]], { wait: 1.2, got: what }, [DROP[0], DROP[1]], { wait: 1.5, drop: true });
    steps.push({ until: at(11.88), drop: true }, { wait: 0.6, lift: true }, [7.3, 1.0], { until: at(12.3) }, [0.8, 3.8]);
    const himAt = schedule(steps, { loop: LOOP, name: 'old tenant', speed: 1.4 });
    const him = folk(51, { style: 'short', hair: C.ink, top: C.navy, bottom: C.grey, skin: mix(C.blush, C.wood, 0.3) });
    R.mover((t) => {
      const x = h(t);
      if (x < 5 || x >= 12.2) return { x: -99, y: -99 };
      return himAt(t);
    }, (ctx, t, p) => {
      if (p.x < -50) return;
      const x = h(t);
      if (p.sit) {
        person(ctx, p.x, p.y, 0.25, { ...him, pose: 'sit', dir: 'r', arms: [1.6, 1.2] }, t);
        says(ctx, p.x, p.y, 3.0, t, ['I was here first.', 'Technically.', 'My name is on it.'], 8, 3.4);
        return;
      }
      const carrying = p.moving && Math.hypot(p.x - DROP[0], p.y - DROP[1]) > 0.2 && x > 10 && x < 11.88;
      const lifting = p.lift || (x >= 11.88 && x < 12.5);
      person(ctx, p.x, p.y, 0, {
        ...him, pose: p.moving ? 'walk' : (p.got || p.drop || lifting ? 'carry' : 'stand'), dir: p.dir, back: p.back, phase: (p.phase || 0) + t * 6,
        hold: carrying || p.got ? (c) => { c.beginPath(); c.arc(0.25, -0.05, 0.14, 0, Math.PI * 2); paint(c, C.mustard, { lw: 0.02 }); } : lifting ? (c) => { c.beginPath(); c.rect(-0.1, -0.35, 0.8, 0.6); paint(c, C.woodLight, { lw: 0.03 }); } : null,
      }, t);
      if (p.drop) says(ctx, p.x, p.y, 2.8, t, ['One more thing.', 'Last one.', 'OK, this is the last one.', 'Almost done!'], 5, 2.6);
      else if (p.got) speech(ctx, p.x, p.y, 2.8, `The ${p.got}!`, { size: 0.4 });
    });

    // The grad student: at the table all morning (the lease, the clock),
    // unpacking books all afternoon, pizza on the floor at night.
    const her = folk(52, { style: 'long', hair: C.brown, top: C.mustard, bottom: C.navy, skin: mix(C.wood, C.brown, 0.3) });
    const herAfternoon = schedule([
      [3.8, 3.8], { until: at(13.2) },
      [6.4, 3.4], { wait: 3, pose: 'carry' }, [6.5, 6.2], { wait: 4, pose: 'read' },
      [4.3, 6.9], { wait: 3, pose: 'carry' }, [6.5, 6.2], { wait: 4, pose: 'read' },
      [8.1, 4.2], { wait: 3, pose: 'carry' }, [6.5, 6.2], { wait: 4, pose: 'read' },
      [6.4, 3.4], { wait: 3, pose: 'carry' }, [6.5, 6.2], { wait: 4, pose: 'read' },
      [8.1, 4.2], { wait: 3, pose: 'carry' }, [6.5, 6.2], { wait: 4, pose: 'read' },
      [4.3, 6.9], { wait: 3, pose: 'carry' }, [6.5, 6.2], { wait: 4, pose: 'read' },
      [9.4, 5.0], { until: at(20.4), pose: 'stand' },
      [8.2, 6.0], { until: at(4.3), night: true },
    ], { loop: LOOP, name: 'grad student', speed: 1.1 });
    R.mover((t) => {
      const x = h(t);
      if (x >= 5 && x < 13) return { x: 3.8, y: 3.8, sit: true };
      return herAfternoon(t);
    }, (ctx, t, p) => {
      const x = h(t);
      if (p.sit) {
        person(ctx, p.x, p.y, 0.25, { ...her, pose: 'sit', dir: 'l', arms: x < 12 ? [1.6, 1.2] : [0.6, 0.5] }, t);
        if (x >= 10 && x < 12) says(ctx, p.x, p.y, 3.0, t, ['It\'s 11:58.', 'It\'s still 11:58.', 'Your clock stopped.'], 7, 3, 3.5);
        else if (x < 10) says(ctx, p.x, p.y, 3.0, t, ['The lease says noon.', 'I signed it too.'], 8, 3.4, 4);
        else if (x < 13) says(ctx, p.x, p.y, 3.0, t, ['Finally.'], 9, 3);
        return;
      }
      if (p.night) {
        person(ctx, p.x, p.y, -0.3, { ...her, pose: 'sit', dir: 'r', arms: [1.2 + Math.sin(t * 1.4) * 0.3, 0.4] }, t);
        return;
      }
      person(ctx, p.x, p.y, 0, { ...her, pose: p.moving ? 'walk' : p.pose, dir: p.dir, back: p.back, phase: t * 6 }, t);
      if (!p.moving && p.pose === 'read') says(ctx, p.x, p.y, 2.8, t, ['Alphabetical.', 'No, by color.'], 11, 3);
      if (!p.moving && p.pose === 'stand') says(ctx, p.x, p.y, 2.8, t, ['Two toasters. Nice.'], 13, 3);
    }, { bias: 0.8 });

    // His friend who said he'd help: asleep on her couch all morning (his
    // head on its far arm, so his feet don't run into the TVs).
    R.mover(() => ({ x: 10.1, y: 3.95 }), (ctx, t) => {
      const x = h(t);
      if (x < 5 || x >= 11) return;
      person(ctx, 10.15, 3.8, 0.78, { ...folk(55, { style: 'curly', top: C.green, bottom: C.ink }), pose: 'lie', dir: 'r' }, t);
      if (Q.detail) says(ctx, 9.9, 3.9, 1.9, t, ['zzz', 'Five more minutes.'], 10, 3.5);
    }, { depth: 16.2 });

    // Her friends, after noon: one building the flat-pack bookshelf's twin
    // (step 1 of 94), and at night two on the floor round the pizza.
    const pals = [folk(57, { style: 'bun', top: C.teal, bottom: C.navy }), folk(58, { style: 'short', hat: 'beanie', top: C.coral })];
    R.mover(() => ({ x: 4.6, y: 6.6 }), (ctx, t) => {
      const x = h(t);
      if (x >= 14 && x < 20.4) {
        person(ctx, 4.6, 6.6, -0.3, { ...pals[0], pose: 'sit', dir: 'r', arms: [1.3 + Math.sin(t * 5) * 0.4, 1.0] }, t);
        says(ctx, 4.6, 6.6, 2.2, t, ['Step 1 of 94.', 'Are there supposed to be extra screws?'], 12, 3.2);
      } else if (x >= 20.4 || x < 5) {
        person(ctx, 7.0, 5.6, -0.3, { ...pals[0], pose: 'sit', dir: 'r', arms: [1.4 + Math.sin(t * 1.1) * 0.4, 0.4] }, t);
        person(ctx, 8.9, 6.3, -0.3, { ...pals[1], pose: 'sit', dir: 'l', arms: [1.2, 0.5] }, t);
        says(ctx, 7.0, 5.6, 2.2, t, ['To the overlap!', 'Whose toaster is this?'], 10, 3.2);
      }
    }, { depth: 11 });
    R.thing(5.6, 7.5, (ctx) => {
      for (const [x, y, w, d] of [[4.9, 6.5, 1.3, 0.6], [4.6, 7.3, 1.5, 0.4]]) box(ctx, x, y, 0, w, d, 0.06, C.woodLight, { flat: true, lw: 0.02 });
      if (Q.detail) rect(ctx, 5.3, 7.4, 0.5, 0.35, 0.065, C.white, { lw: 0.015 });
    }, { on: (t) => { const x = h(t); return x >= 14 && x < 20.4; } });
    R.thing(8.4, 6.4, (ctx) => {
      box(ctx, 7.4, 5.7, 0, 1.1, 1.1, 0.1, C.white, { flat: true, lw: 0.03 });
      if (Q.detail) { disc(ctx, 7.8, 6.2, 0.11, 0.35, C.mustard, { lw: 0.02 }); for (const [u, v] of [[7.7, 6.1], [7.9, 6.3], [7.75, 6.35]]) disc(ctx, u, v, 0.12, 0.06, C.red, { stroke: false }); }
      box(ctx, 8.1, 5.9, 0.1, 0.12, 0.12, 0.22, BRAND.can, { flat: true, lw: 0.015 });
    }, { on: (t) => { const x = h(t); return x >= 20.4 || x < 5; } });

    // ---------- Out on the porch: two grills ----------
    R.thing(14.2, 2.8, (ctx) => {
      box(ctx, 13.5, 2.1, 0, 0.7, 0.6, 0.8, C.ink, { flat: true, lw: 0.03 });
      box(ctx, 13.45, 2.05, 0.8, 0.8, 0.7, 0.3, C.black, { flat: true, lw: 0.03 });
    });
    R.thing(14.2, 4.0, (ctx) => {
      box(ctx, 13.5, 3.3, 0, 0.7, 0.6, 0.8, C.red, { flat: true, lw: 0.03 });
      box(ctx, 13.45, 3.25, 0.8, 0.8, 0.7, 0.3, shade(C.red, 0.2), { flat: true, lw: 0.03 });
    }, { on: old });

    // ---------- The goose ----------
    // In the first laundry basket, where each of them assumes it belongs to
    // the other one.
    R.goose((t) => {
      const k = hide.k();
      return { x: BASKETS[0][0] + 0.55, y: BASKETS[0][1] + 0.48, z: 0.2 + 0.45 * k, pose: k > 0.5 && Math.sin(t * 0.5) > 0.8 ? 'honk' : 'sit', dir: 'l', hidden: k < 0.3 };
    }, { bias: 1.5, kind: 'poke', inside: hide, hint: 'Two of everything here. One of the laundry baskets has a tail.' }); // in front of its basket (sorted at the basket's near corner), or the basket paints over it

    // The other goose: a ceramic one, on the tape line down the middle of
    // the floor, half on his side and half on hers.
    R.thing(5.3, 5.85, (ctx) => {
      const x = 4.97, y = 5.55;
      disc(ctx, x, y, 0, 0.32, C.navy, { lw: 0.025 });
      box(ctx, x - 0.2, y - 0.2, 0, 0.4, 0.4, 0.12, C.navy, { flat: true, lw: 0.02 });
      goose(ctx, x, y, 0.12, 0, { pose: 'stand', dir: 'r', scale: 0.62 });
      // The glaze's shine, and a strip of tape across its back.
      const [X, Y] = P(x, y, 0.55);
      ctx.beginPath(); ctx.ellipse(X - 0.08, Y - 0.04, 0.07, 0.03, -0.4, 0, Math.PI * 2); ctx.fillStyle = C.white; ctx.fill();
      ctx.save(); ctx.globalAlpha *= 0.9;
      ctx.beginPath(); ctx.moveTo(X - 0.03, Y - 0.2); ctx.lineTo(X + 0.03, Y + 0.12); ctx.strokeStyle = C.mustard; ctx.lineWidth = 0.08; ctx.stroke();
      ctx.restore();
    });
    R.decoy({ id: 'ceramic', at: [4.97, 5.55, 0.6], r: 0.6, say: ["We're working out custody.", 'Ceramic. And contested.'] });

    // The standoff: tap whoever's at the table (her, all day).
    R.poke({
      id: 'standoff', teach: true, r: 0.9, sound: 'pop', say: ['Mine.', 'Also mine.', 'We both signed it.'],
      at: (t) => { const x = h(t); if (x >= 5 && x < 13) return [3.8, 3.8, 2.0]; const p = herAfternoon(t); return [p.x, p.y, p.night ? 1.4 : 1.7]; },
    });

    // ---------- The finds ----------
    R.find({ id: 'toaster', label: 'A toaster on a milk crate', at: [1.47, 7.4, 0.45], r: 0.88 });
    R.find({ id: 'lease', label: 'A lease signed twice', kind: 'poke', inside: fHers, at: [FOLDERS[1][0] + 0.35, FOLDERS[1][1] + 0.4, TABLE_Z + 0.05], r: 0.55, hint: 'Two matching folders on the table. Only one has the paperwork.' });
    // (In his arms for its last minute, on the way to the stairs.)
    R.find({ id: 'lastbox', label: 'The last box', at: (t) => { if (h(t) < 11.88) return [5.9, 4.9, 1.2]; const p = himAt(t); return [p.x, p.y, 1.5]; }, r: 0.8, ...BEFORE });
    R.find({
      id: 'clock', label: 'Something he took with him', kind: 'hard', at: [9.8, 0, 2.9], r: 0.75,
      riddle: 'It said 11:58 all morning. Flip back.', hint: 'High on the wall by the stairs, a circle cleaner than the rest.', ...AFTER,
    });
  },
};
