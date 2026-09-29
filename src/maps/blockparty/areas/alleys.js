// The back alleys: the narrow lanes between the rooms, off Main Street. Mostly
// quiet: cobbles, bins, washing on lines, a raccoon behind the
// arcade. One hot spot (HOTSPOT in plan.js) gets the detail: out the back of
// the noodle bar, across from the bakery's street door, where the octopus
// (a walker, in day.js) comes three times a day to stare at the noodle bar.
// Its bins are full of fish heads, a crate of squid has come to the wrong
// address, and someone has drawn round a squid in chalk. All three finds are
// there.
//
// Two things to know when dressing it. The rooms' back walls stand in front of
// the far side of each alley (x 18.2 to 20 along y, y 18.2 to 20 along x), so
// on the overview anything low over there hides behind them: keep that side
// for tall things. And the seams (every 16) run down the middle of the right
// hand alleys (x 64) and the front cross alleys (y 64), so props there hug the
// near side.
import {
  C, Q, P, box, rect, disc, cylinder, face, paint, person, folk, speech, shade, tint, mix, alpha,
} from '../../../engine/art.js';
import { particles } from '../../../engine/actors.js';
import { ALLEYS, ALLEY, LOOP } from '../plan.js';
import { STREET, STREET_NIGHT, LIT, printed, board, words, onFloor, cone } from '../style.js';
import { nightK, at } from '../clock.js';

const loopT = (t) => ((t % LOOP) + LOOP) % LOOP;
const readable = () => Q.detail && Q.pxPerUnit >= 12;

// ---------- The ground ----------
// Flat slabs along the walls, a cobbled lane down the middle with a gutter.
function paving(ctx, ink, cell) {
  for (const [x0, y0, x1, y1] of ALLEYS) {
    if (cell && (x1 <= cell[0] || x0 >= cell[2] || y1 <= cell[1] || y0 >= cell[3])) continue; // another piece's

    const w = x1 - x0, d = y1 - y0, alongY = w < d;
    rect(ctx, x0, y0, w, d, 0, ink.alley, { stroke: false });
    if (!Q.detail) continue;
    // The cobbles: rows across the lane, each row's joints staggered.
    const c0 = 0.8, cw = ALLEY - 1.6, run = alongY ? d : w, row = 0.5;
    ctx.beginPath();
    const line = (u0, v0, u1, v1) => {
      const a = alongY ? P(x0 + u0, y0 + v0) : P(x0 + v0, y0 + u0);
      const b = alongY ? P(x0 + u1, y0 + v1) : P(x0 + v1, y0 + u1);
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
    };
    line(c0, 0, c0, run);
    line(c0 + cw, 0, c0 + cw, run);
    for (let i = 0, v = row; v < run; v += row, i++) {
      line(c0, v, c0 + cw, v);
      for (let u = c0 + (i % 2 ? 0.3 : 0.6); u < c0 + cw - 0.1; u += 0.6) line(u, v, u, v + row);
    }
    // The slabs along each side.
    for (let v = 1.2; v < run; v += 1.2) { line(0, v, c0, v); line(c0 + cw, v, ALLEY, v); }
    ctx.strokeStyle = ink.cobble;
    ctx.lineWidth = 0.035;
    ctx.stroke();
    // The gutter down the middle.
    if (alongY) rect(ctx, x0 + ALLEY / 2 - 0.07, y0, 0.14, d, 0, ink.cobble, { stroke: false });
    else rect(ctx, x0, y0 + ALLEY / 2 - 0.07, w, 0.14, 0, ink.cobble, { stroke: false });
  }
}

// Puddles [x, y, size], drains [x, y].
const PUDDLES = [[17.35, 58.5, 0.62], [18.3, 21.5, 0.5], [17.2, 67.6, 0.45], [62.1, 56.2, 0.55], [55.5, 17.1, 0.5], [8.8, 62.2, 0.5], [30.2, 62.3, 0.4], [17.1, 5.8, 0.4]];
const DRAINS = [[18.9, 51.9], [18, 30], [18, 71], [63, 40.5], [63, 26], [40.5, 18], [24, 18], [70, 63]];

function puddle(ctx, x, y, s, night) {
  const water = night ? mix(C.navy, C.lilac, 0.4) : mix(C.sky, STREET.alley, 0.3);
  disc(ctx, x, y, 0.005, s, water, { stroke: false });
  disc(ctx, x + s * 0.55, y - s * 0.3, 0.005, s * 0.55, water, { stroke: false });
  disc(ctx, x - s * 0.3, y + s * 0.5, 0.005, s * 0.45, water, { stroke: false });
  if (!Q.detail) return;
  // A glint: the sky by day, a lamp at night.
  const [X, Y] = P(x - s * 0.2, y - s * 0.1, 0.01);
  ctx.beginPath();
  ctx.ellipse(X, Y, s * 0.45, s * 0.1, -0.15, 0, Math.PI * 2);
  ctx.fillStyle = night ? alpha(LIT, 0.55) : alpha(C.white, 0.7);
  ctx.fill();
}

function drain(ctx, x, y, ink) {
  rect(ctx, x - 0.3, y - 0.3, 0.6, 0.6, 0.006, ink.drain, { lw: 0.03, stroke: ink.cobble });
  if (!Q.detail) return;
  for (let i = 1; i < 5; i++) face(ctx, [[x - 0.3 + i * 0.12, y - 0.26, 0.008], [x - 0.3 + i * 0.12, y + 0.26, 0.008]], null, { stroke: ink.alley, lw: 0.04 });
}

// A squid, drawn round in chalk (by whom, nobody's saying). Along the floor.
function chalkSquid(ctx, night) {
  onFloor(ctx, 18.1, 62.25, -0.12, () => {
    ctx.strokeStyle = night ? alpha(mix(C.lilac, C.white, 0.5), 0.8) : alpha(C.white, 0.9);
    ctx.lineWidth = 0.07;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // The mantle, its fins, and the head.
    ctx.beginPath();
    ctx.moveTo(-1.25, 0);
    ctx.lineTo(-0.95, -0.35);
    ctx.quadraticCurveTo(-0.3, -0.42, 0.25, -0.26);
    ctx.lineTo(0.25, 0.26);
    ctx.quadraticCurveTo(-0.3, 0.42, -0.95, 0.35);
    ctx.closePath();
    ctx.moveTo(-0.95, -0.35); ctx.lineTo(-1.2, -0.55); ctx.lineTo(-1.05, -0.2);
    ctx.moveTo(-0.95, 0.35); ctx.lineTo(-1.2, 0.55); ctx.lineTo(-1.05, 0.2);
    ctx.stroke();
    // Arms, flung out.
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const v = (i / 7 - 0.5) * 0.46, spread = (i / 7 - 0.5) * 1.3;
      ctx.moveTo(0.28, v);
      ctx.bezierCurveTo(0.6, v + spread * 0.2, 0.8, v + spread * 0.5 + Math.sin(i * 2.1) * 0.12, 1.1 + (i % 2) * 0.15, v + spread * 0.75);
    }
    ctx.stroke();
    // Its eye, in a chalk cross.
    ctx.beginPath();
    ctx.moveTo(0.02, -0.12); ctx.lineTo(0.14, 0);
    ctx.moveTo(0.14, -0.12); ctx.lineTo(0.02, 0);
    ctx.stroke();
  });
}

// The find: one tentacle print, big and wet, suckers and all. Printed in the
// night inks too (a lilac sheen), so it still shows after dark.
function tentaclePrint(ctx, night) {
  const wet = night ? mix(C.lilac, C.navy, 0.3) : mix(C.navy, STREET.alley, 0.35);
  const ring = night ? tint(C.lilac, 0.35) : mix(C.sky, C.navy, 0.35);
  onFloor(ctx, 18.2, 59.8, 0.5, () => {
    // A curl: a spine spiralling in, tapering as it goes.
    const N = 24, sp = [];
    for (let i = 0; i <= N; i++) {
      const s = i / N, th = -1.9 + s * 3.9, r = 0.52 - 0.34 * s;
      sp.push([Math.cos(th) * r, Math.sin(th) * r, 0.2 * (1 - 0.8 * s), th]);
    }
    ctx.beginPath();
    sp.forEach(([x, y, w, th], i) => {
      const nx = Math.cos(th), ny = Math.sin(th);
      i ? ctx.lineTo(x + nx * w, y + ny * w) : ctx.moveTo(x + nx * w, y + ny * w);
    });
    for (let i = N; i >= 0; i--) {
      const [x, y, w, th] = sp[i];
      ctx.lineTo(x - Math.cos(th) * w, y - Math.sin(th) * w);
    }
    ctx.closePath();
    ctx.fillStyle = wet;
    ctx.fill();
    // Suckers down the inside of the curl.
    for (let i = 2; i < N - 2; i += 3) {
      const [x, y, w, th] = sp[i];
      const rr = Math.max(0.035, w * 0.42);
      ctx.beginPath();
      ctx.arc(x - Math.cos(th) * w * 0.35, y - Math.sin(th) * w * 0.35, rr, 0, Math.PI * 2);
      ctx.strokeStyle = ring;
      ctx.lineWidth = 0.035;
      ctx.stroke();
    }
    // Drips.
    ctx.fillStyle = wet;
    for (const [x, y, r] of [[0.62, 0.28, 0.06], [0.72, 0.12, 0.04], [-0.1, 0.62, 0.05]]) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // A wet shine along the outside.
    ctx.beginPath();
    ctx.arc(0, 0, 0.6, -1.7, -0.6);
    ctx.strokeStyle = alpha(night ? C.white : tint(C.sky, 0.4), 0.7);
    ctx.lineWidth = 0.04;
    ctx.stroke();
  });
}

// ---------- Props ----------
const pole = (ctx, x, y, h, color = C.ink) => box(ctx, x - 0.05, y - 0.05, 0, 0.1, 0.1, h, color, { flat: true, stroke: false });

// A wheelie bin, back corner (x, y), about 0.9 across. open: its lid up.
function wheelie(ctx, x, y, color, open = false, w = 0.9) {
  if (open) face(ctx, [[x, y, 1.12], [x, y + w, 1.12], [x - 0.2, y + w, 2.0], [x - 0.2, y, 2.0]], shade(color, 0.3));
  cylinder(ctx, x + 0.2, y + w - 0.15, 0, 0.14, 0.12, C.ink, { flat: true });
  box(ctx, x, y, 0.1, w, w, 1.0, color);
  if (!open) box(ctx, x - 0.05, y - 0.05, 1.1, w + 0.1, w + 0.1, 0.1, shade(color, 0.15), { flat: true });
  else rect(ctx, x + 0.08, y + 0.08, w - 0.16, w - 0.16, 1.1, shade(color, 0.6), { stroke: false });
}

// A round metal dustbin. lid: on it, or off (inside showing).
function dustbin(ctx, x, y, r = 0.42, h = 1.05, lid = true) {
  cylinder(ctx, x, y, 0, r, h, C.grey, { top: lid ? tint(C.grey, 0.2) : shade(C.grey, 0.65) });
  if (!Q.detail) return;
  for (const z of [0.3, 0.7]) {
    const [X, Y] = P(x, y, z);
    ctx.beginPath();
    ctx.ellipse(X, Y, r * Math.SQRT2, (r * Math.SQRT2) / 2, 0, 0, Math.PI);
    ctx.strokeStyle = shade(C.grey, 0.4);
    ctx.lineWidth = 0.035;
    ctx.stroke();
  }
  if (lid) {
    const [X, Y] = P(x, y, h + 0.08);
    ctx.beginPath();
    ctx.ellipse(X, Y, 0.14, 0.06, 0, 0, Math.PI * 2);
    paint(ctx, C.greyLight, { lw: 0.03 });
  }
}

// A fish, head or tail up, sticking out of a bin (screen units at X, Y).
function fish(ctx, X, Y, a, s = 1) {
  ctx.save();
  ctx.translate(X, Y);
  ctx.rotate(a);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.ellipse(0, -0.22, 0.09, 0.22, 0, 0, Math.PI * 2);
  paint(ctx, tint(C.grey, 0.35), { lw: 0.03 });
  ctx.beginPath();
  ctx.moveTo(0, -0.42); ctx.lineTo(-0.12, -0.56); ctx.lineTo(0.12, -0.56); ctx.closePath();
  paint(ctx, C.grey, { lw: 0.03 });
  ctx.beginPath();
  ctx.arc(0.02, -0.08, 0.025, 0, Math.PI * 2);
  ctx.fillStyle = C.ink;
  ctx.fill();
  ctx.restore();
}

// A washing line on two poles, from a to b ([x, y]), clothes swaying.
const CLOTHES = [C.white, C.coral, C.sky, C.butter, C.pink, C.teal, C.mustard, C.lilac];
function washing(ctx, t, a, b, seed) {
  const z = 3.2;
  const [ax, ay] = P(a[0], a[1], z), [bx, by] = P(b[0], b[1], z);
  const sag = 0.35, pt = (k) => [ax + (bx - ax) * k, ay + (by - ay) * k + Math.sin(k * Math.PI) * sag];
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + sag * 2, bx, by);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.035;
  ctx.stroke();
  const n = 4;
  for (let i = 0; i < n; i++) {
    const k = (i + 0.7) / (n + 0.4), [X, Y] = pt(k);
    const kind = (seed + i * 3) % 4, color = CLOTHES[(seed * 3 + i) % CLOTHES.length];
    ctx.save();
    ctx.translate(X, Y);
    ctx.rotate(Math.sin(t * 1.6 + i * 1.3 + seed) * 0.08);
    ctx.beginPath();
    if (kind === 0) { // a shirt
      ctx.moveTo(-0.22, 0); ctx.lineTo(0.22, 0); ctx.lineTo(0.42, 0.22); ctx.lineTo(0.3, 0.32); ctx.lineTo(0.22, 0.24);
      ctx.lineTo(0.22, 0.75); ctx.lineTo(-0.22, 0.75); ctx.lineTo(-0.22, 0.24); ctx.lineTo(-0.3, 0.32); ctx.lineTo(-0.42, 0.22);
    } else if (kind === 1) { // trousers
      ctx.moveTo(-0.22, 0); ctx.lineTo(0.22, 0); ctx.lineTo(0.24, 0.9); ctx.lineTo(0.05, 0.9); ctx.lineTo(0, 0.3);
      ctx.lineTo(-0.05, 0.9); ctx.lineTo(-0.24, 0.9);
    } else if (kind === 2) { // a towel
      ctx.rect(-0.25, 0, 0.5, 0.62);
    } else { // two socks
      for (const dx of [-0.16, 0.12]) {
        ctx.moveTo(dx - 0.06, 0); ctx.lineTo(dx + 0.06, 0); ctx.lineTo(dx + 0.06, 0.32); ctx.lineTo(dx + 0.16, 0.36);
        ctx.lineTo(dx + 0.14, 0.44); ctx.lineTo(dx - 0.06, 0.42);
      }
    }
    ctx.closePath();
    paint(ctx, color, { lw: 0.03 });
    if (kind === 2 && Q.detail) {
      ctx.fillStyle = shade(color, 0.25);
      ctx.fillRect(-0.25, 0.46, 0.5, 0.06);
    }
    ctx.restore();
  }
}

// A lamp on a bracket: a pole, an arm out to (lx, ly), a shade. The bulb is
// drawn apart (it lights up), by bulb().
function bracketLamp(ctx, x, y, lx, ly, h = 3.0) {
  pole(ctx, x, y, h + 0.2);
  face(ctx, [[x, y, h + 0.15], [lx, ly, h + 0.15]], null, { lw: 0.06 });
  const [X, Y] = P(lx, ly, h);
  ctx.beginPath();
  ctx.moveTo(X - 0.28, Y + 0.02); ctx.lineTo(X - 0.08, Y - 0.2); ctx.lineTo(X + 0.08, Y - 0.2); ctx.lineTo(X + 0.28, Y + 0.02);
  ctx.closePath();
  paint(ctx, C.teal, { lw: 0.035 });
}
function bulb(ctx, t, x, y, h = 3.0) {
  const [X, Y] = P(x, y, h);
  ctx.beginPath();
  ctx.arc(X, Y + 0.06, 0.09, 0, Math.PI * 2);
  paint(ctx, nightK(t) > 0.3 ? LIT : C.white, { lw: 0.025 });
}

// A cat's head at screen (X, Y), r across. look: -1 left to 1 right.
function catHead(ctx, t, X, Y, r, fur, look, wide = false) {
  const dx = look * r * 0.3;
  ctx.beginPath();
  ctx.moveTo(X - r * 0.9, Y - r * 0.3); ctx.lineTo(X - r * 0.75 + dx * 0.4, Y - r * 1.25); ctx.lineTo(X - r * 0.2, Y - r * 0.8);
  ctx.moveTo(X + r * 0.9, Y - r * 0.3); ctx.lineTo(X + r * 0.75 + dx * 0.4, Y - r * 1.25); ctx.lineTo(X + r * 0.2, Y - r * 0.8);
  paint(ctx, fur, { lw: 0.03 });
  ctx.beginPath();
  ctx.ellipse(X, Y, r, r * 0.85, 0, 0, Math.PI * 2);
  paint(ctx, fur, { lw: 0.035 });
  if (!Q.detail) return;
  // Blinks every few seconds, unless something's worth staring at.
  const blink = !wide && (t % 4.3) < 0.15;
  ctx.fillStyle = C.ink;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.03;
  for (const s of [-1, 1]) {
    const ex = X + s * r * 0.38 + dx, ey = Y - r * 0.1;
    ctx.beginPath();
    if (blink) { ctx.moveTo(ex - r * 0.14, ey); ctx.lineTo(ex + r * 0.14, ey); ctx.stroke(); }
    else { ctx.ellipse(ex, ey, r * (wide ? 0.16 : 0.12), r * (wide ? 0.2 : 0.15), 0, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.beginPath();
  ctx.moveTo(X + dx - r * 0.1, Y + r * 0.2); ctx.lineTo(X + dx + r * 0.1, Y + r * 0.2); ctx.lineTo(X + dx, Y + r * 0.32);
  ctx.closePath();
  ctx.fillStyle = C.pink;
  ctx.fill();
}

// The raccoon behind the arcade, up on its back legs with a slice of pizza
// from the arcade's bins, nibbling and keeping watch.
function raccoon(ctx, t, x, y) {
  const [X, Y0] = P(x, y, 0);
  const k = t % 7, nib = k < 4 ? Math.abs(Math.sin(t * 6)) * 0.05 : 0, look = k < 4 ? 0 : Math.sin((k - 4) * 2) * 0.08;
  const Y = Y0 + nib;
  // The tail, ringed.
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.ellipse(X + 0.3 + i * 0.1, Y - 0.1 - i * 0.04, 0.09, 0.08, 0.4, 0, Math.PI * 2);
    paint(ctx, i % 2 ? C.ink : C.grey, { lw: 0.025 });
  }
  ctx.beginPath();
  ctx.ellipse(X, Y - 0.35, 0.24, 0.35, 0, 0, Math.PI * 2);
  paint(ctx, C.grey, { lw: 0.035 });
  ctx.beginPath();
  ctx.ellipse(X, Y - 0.3, 0.13, 0.22, 0, 0, Math.PI * 2);
  ctx.fillStyle = C.greyLight;
  ctx.fill();
  // The pizza, in both paws.
  ctx.beginPath();
  ctx.moveTo(X - 0.15, Y - 0.62 + nib); ctx.lineTo(X + 0.15, Y - 0.62 + nib); ctx.lineTo(X, Y - 0.35 + nib);
  ctx.closePath();
  paint(ctx, C.mustard, { lw: 0.025 });
  const hx = X + look, hy = Y - 0.82;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(hx + s * 0.12, hy - 0.1); ctx.lineTo(hx + s * 0.2, hy - 0.3); ctx.lineTo(hx + s * 0.24, hy - 0.05);
    paint(ctx, C.grey, { lw: 0.025 });
  }
  ctx.beginPath();
  ctx.ellipse(hx, hy, 0.22, 0.18, 0, 0, Math.PI * 2);
  paint(ctx, C.grey, { lw: 0.035 });
  if (!Q.detail) return;
  // The mask, its eyes (they shine under the lamp at night), its nose.
  ctx.beginPath();
  ctx.ellipse(hx, hy - 0.01, 0.2, 0.06, 0, 0, Math.PI * 2);
  ctx.fillStyle = C.ink;
  ctx.fill();
  ctx.fillStyle = nightK(t) > 0.3 ? LIT : C.white;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(hx + s * 0.08, hy - 0.01, 0.035, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath();
  ctx.arc(hx, hy + 0.11, 0.035, 0, Math.PI * 2);
  ctx.fillStyle = C.ink;
  ctx.fill();
}

// A pigeon, pecking at the day-old bread.
function pigeon(ctx, t, x, y, z) {
  const [X, Y] = P(x, y, z);
  const peck = (t % 2.6) < 0.9 ? Math.abs(Math.sin(t * 9)) : 0;
  ctx.beginPath();
  ctx.ellipse(X, Y - 0.14, 0.2, 0.13, 0, 0, Math.PI * 2);
  paint(ctx, C.grey, { lw: 0.03 });
  ctx.beginPath();
  ctx.moveTo(X + 0.15, Y - 0.12); ctx.lineTo(X + 0.34, Y - 0.2); ctx.lineTo(X + 0.3, Y - 0.06);
  paint(ctx, shade(C.grey, 0.3), { lw: 0.025 });
  const hx = X - 0.2, hy = Y - 0.3 + peck * 0.16;
  ctx.beginPath();
  ctx.arc(hx, hy, 0.08, 0, Math.PI * 2);
  paint(ctx, mix(C.grey, C.purple, 0.3), { lw: 0.025 });
  ctx.beginPath();
  ctx.moveTo(hx - 0.07, hy); ctx.lineTo(hx - 0.15, hy + 0.03); ctx.lineTo(hx - 0.07, hy + 0.04);
  ctx.fillStyle = C.coral;
  ctx.fill();
}

// ---------- Where things go ----------
// Bins round the alleys, on the near side of each lane (see the top), a unit
// clear of the seams and a step clear of the rooms' doors: [x, y, color].
const BINS = [[16.1, 2.1, C.green], [16.1, 3.1, C.navy], [5.1, 16.1, C.green], [52.3, 16.1, C.navy], [53.3, 16.1, C.teal],
  [61.1, 29.4, C.green], [61.1, 50.0, C.navy], [61.1, 51.0, C.green], [16.1, 70.2, C.teal], [5.2, 61.1, C.navy], [27.2, 61.1, C.green], [72.0, 61.1, C.navy]];
// Washing lines, across the lanes (never along a seam): [a, b].
const LINES = [[[16.2, 22.6], [19.45, 22.6]], [[16.2, 68.3], [19.45, 68.3]], [[16.2, 74.2], [19.45, 74.2]],
  [[9.2, 16.2], [9.2, 19.45]], [[29.6, 16.2], [29.6, 19.45]], [[56.4, 16.2], [56.4, 19.45]], [[74.2, 16.2], [74.2, 19.45]]];

export default {
  id: 'alleys',
  name: 'The Alleys',
  blurb: 'Bins, cats and other people\'s washing. The octopus uses them as a shortcut to the noodle bar.',
  shape: ALLEYS,
  home: [18, 56], // the hot spot, where the octopus gets to
  build(R) {
    // The ground, printed by day and again in night inks.
    // (One call: the day everywhere first, then the night over it.)
    printed(R, [paving, (ctx, ink) => {
      const night = ink === STREET_NIGHT;
      for (const [x, y, s] of PUDDLES) puddle(ctx, x, y, s, night);
      for (const [x, y] of DRAINS) drain(ctx, x, y, ink);
      chalkSquid(ctx, night);
      tentaclePrint(ctx, night);
    }]);
    R.find({ id: 'tentacle-print', label: 'A tentacle print', at: [18.2, 59.8, 0.05], r: 0.8 });

    // ---------- Quiet alleys ----------
    for (const [x, y, color] of BINS) R.thing(x + 0.9, y + 0.9, (ctx) => wheelie(ctx, x, y, color));
    for (const [a, b] of LINES) {
      for (const p of [a, b]) R.thing(p[0] + 0.05, p[1] + 0.05, (ctx) => pole(ctx, p[0], p[1], 3.4));
      R.thing(Math.max(a[0], b[0]), Math.max(a[1], b[1]) + 0.1, (ctx, t) => washing(ctx, t, a, b, Math.round(a[0] + a[1])), { anim: true });
    }

    // A dustbin between the disco and the launch pad's fronts. (It had a cat
    // on it: now the hot spot's cat in a bin is the only cat in the alleys.)
    R.thing(26.6, 16.9, (ctx) => dustbin(ctx, 26.3, 16.6, 0.4, 1.0));

    // The raccoon behind the arcade, in the bins, under a lamp.
    R.thing(61.2, 7.9, (ctx) => bracketLamp(ctx, 61.15, 7.85, 61.8, 8.9, 2.8));
    R.thing(62.0, 9.0, (ctx) => wheelie(ctx, 61.1, 8.1, C.green, true));
    R.thing(62.3, 10.3, (ctx) => {
      dustbin(ctx, 61.6, 9.85, 0.38, 0.95, false);
      disc(ctx, 62.5, 9.2, 0.02, 0.36, tint(C.grey, 0.2), { lw: 0.03 }); // its lid, knocked off
      if (!Q.detail) return;
      // What it's been through.
      rect(ctx, 62.3, 11.3, 0.4, 0.3, 0.01, C.white, { lw: 0.025 });
      disc(ctx, 61.5, 11.8, 0.01, 0.12, C.butter, { lw: 0.02 });
      rect(ctx, 62.5, 10.6, 0.25, 0.4, 0.01, C.coralLight, { lw: 0.025 });
    });
    R.thing(62.0, 11.1, (ctx, t) => {
      // A touch bigger than life, so it reads from the lane.
      const [X, Y] = P(61.9, 11);
      ctx.save();
      ctx.translate(X, Y);
      ctx.scale(1.35, 1.35);
      ctx.translate(-X, -Y);
      raccoon(ctx, t, 61.9, 11);
      ctx.restore();
    }, { anim: true });
    R.thing(61.9, 8.95, (ctx, t) => bulb(ctx, t, 61.8, 8.9, 2.8), { anim: true });
    R.light({ at: [61.8, 9.4, 2.6], r: 3.2, color: LIT, k: (t) => nightK(t) * 0.8 });

    // NO BALL GAMES, over a goal with the ball in the back of the net.
    R.thing(17.0, 28.7, (ctx) => {
      const x0 = 16.3, x1 = 16.95, y0 = 27.0, y1 = 28.6, h = 1.0;
      const net = alpha(C.white, 0.35);
      face(ctx, [[x0, y0, 0], [x0, y1, 0], [x0, y1, h * 0.75], [x0, y0, h * 0.75]], net, { stroke: C.white, lw: 0.03 });
      if (Q.detail) {
        for (let i = 1; i < 6; i++) face(ctx, [[x0, y0 + i * 0.27, 0], [x0, y0 + i * 0.27, h * 0.75]], null, { stroke: C.white, lw: 0.02 });
        for (let i = 1; i < 3; i++) face(ctx, [[x0, y0, i * 0.25], [x0, y1, i * 0.25]], null, { stroke: C.white, lw: 0.02 });
      }
      // The ball, in the back of the net.
      const [bx, by] = P(16.55, 27.9, 0.24);
      ctx.beginPath();
      ctx.arc(bx, by, 0.24, 0, Math.PI * 2);
      paint(ctx, C.white, { lw: 0.035 });
      ctx.fillStyle = C.ink;
      for (const [dx, dy, r] of [[0, 0, 0.08], [-0.15, -0.1, 0.05], [0.15, -0.1, 0.05], [0, 0.16, 0.05]]) {
        ctx.beginPath();
        ctx.arc(bx + dx, by + dy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      face(ctx, [[x0, y0, h * 0.75], [x0, y1, h * 0.75], [x1, y1, h], [x1, y0, h]], net, { stroke: C.white, lw: 0.03 });
      for (const y of [y0, y1]) box(ctx, x1 - 0.05, y - 0.05, 0, 0.1, 0.1, h, C.white, { flat: true, lw: 0.03 });
      face(ctx, [[x1, y0, h], [x1, y1, h]], null, { stroke: C.white, lw: 0.1 });
    });
    R.thing(16.35, 28.8, (ctx) => {
      for (const y of [26.9, 28.7]) pole(ctx, 16.25, y, 2.35);
      board(ctx, 'y', 16.26, 27.8, 2.05, 2.2, 0.6, 'NO BALL GAMES', { board: C.white, ink: C.red, size: 0.24 });
    });

    // The octopus's route from the aquarium, signposted by someone who's had
    // enough: up the alley, past the cross alley, clear of the aquarium's own
    // front (which has octopus signs of its own).
    R.thing(16.35, 67.5, (ctx) => {
      pole(ctx, 16.3, 66.6, 2.6);
      board(ctx, 'y', 16.31, 66.6, 2.2, 1.9, 0.6, 'MIND THE OCTOPUS', { board: C.butter, ink: C.navy, size: 0.19 });
    });
    // A lost shoe, behind the arcade's front.
    R.thing(70.6, 17.2, (ctx) => {
      box(ctx, 70.0, 16.75, 0, 0.6, 0.28, 0.16, C.coral, { flat: true, lw: 0.03 });
      box(ctx, 70.0, 16.75, 0.16, 0.24, 0.28, 0.14, C.coral, { flat: true, lw: 0.03 });
      rect(ctx, 70.25, 16.8, 0.3, 0.18, 0.165, C.white, { lw: 0.02 });
    });
    // A traffic cone, from who knows where.
    R.thing(61.8, 69.8, (ctx) => cone(ctx, 61.5, 69.5));

    // ---------- The hot spot ----------
    // Out the back of the noodle bar (its open front runs along x = 16),
    // across the lane from the bakery (its wall along x = 20, its street
    // door at y 58.3). The lane down the middle stays clear: people walk it.
    const octo = (R.walkers || []).find((w) => w.id === 'octopus');
    const octoHere = (t) => {
      if (!octo) return false;
      const p = octo.at(loopT(t));
      return !p.hide && Math.abs(p.x - 18) < 0.8 && Math.abs(p.y - 53) < 2;
    };

    // The noodle bar's bins, one too full to shut: fish heads and tails.
    // A bulb over them, the alley's one light.
    R.thing(16.2, 49.1, (ctx) => bracketLamp(ctx, 16.15, 49.05, 16.85, 49.9));
    R.thing(16.95, 49.95, (ctx) => wheelie(ctx, 16.05, 49.05, C.green));
    R.thing(16.9, 50.9, (ctx) => {
      wheelie(ctx, 16.05, 50.05, C.teal, true, 0.85);
      if (!Q.detail) return;
      const [X, Y] = P(16.47, 50.47, 1.12);
      fish(ctx, X - 0.2, Y + 0.05, -0.5, 0.9);
      fish(ctx, X + 0.18, Y, 0.35);
      fish(ctx, X, Y + 0.12, Math.PI + 0.2, 0.8);
      fish(ctx, X - 0.05, Y - 0.05, 0.05, 1.1);
    });
    R.thing(16.95, 50.95, (ctx, t) => bulb(ctx, t, 16.85, 49.9), { anim: true });
    R.light({ at: [16.9, 50.4, 2.7], r: 3.8, color: LIT, k: (t) => nightK(t) * 0.9 });
    // Flies, round the open bin.
    R.thing(17.0, 51.0, (ctx, t) => {
      if (!Q.detail) return;
      ctx.fillStyle = C.ink;
      for (let i = 0; i < 4; i++) {
        const a = t * (2.4 + i * 0.5) + i * 1.7;
        const [X, Y] = P(16.47 + Math.cos(a) * 0.35, 50.47 + Math.sin(a) * 0.35, 1.7 + Math.sin(t * 3 + i) * 0.2);
        ctx.beginPath();
        ctx.arc(X, Y, 0.035, 0, Math.PI * 2);
        ctx.fill();
      }
    }, { anim: true });

    // The find: the noodle bar's back door key, dropped by the bins, on a
    // fish-shaped keyring. (Nudged a little off [16.8, 51.6] so the octopus,
    // waiting at [18, 53], doesn't stand on it.)
    R.thing(17.25, 51.5, (ctx) => onFloor(ctx, 17.0, 51.4, 0.6, () => {
      ctx.lineWidth = 0.035;
      ctx.strokeStyle = C.ink;
      // The key: a bow, a shaft, two teeth.
      ctx.beginPath();
      ctx.arc(-0.05, 0, 0.13, 0, Math.PI * 2);
      ctx.moveTo(0.08, -0.04); ctx.lineTo(0.42, -0.04); ctx.lineTo(0.42, 0.13); ctx.lineTo(0.35, 0.13); ctx.lineTo(0.35, 0.04);
      ctx.lineTo(0.28, 0.04); ctx.lineTo(0.28, 0.1); ctx.lineTo(0.22, 0.1); ctx.lineTo(0.22, 0.04); ctx.lineTo(0.08, 0.04);
      ctx.closePath();
      ctx.fillStyle = C.mustard;
      ctx.fill('evenodd');
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-0.05, 0, 0.05, 0, Math.PI * 2);
      ctx.fillStyle = STREET.alley;
      ctx.fill();
      ctx.stroke();
      // The ring, and the fish on it.
      ctx.beginPath();
      ctx.arc(-0.2, 0.12, 0.07, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(-0.4, 0.24, 0.16, 0.09, 0.5, 0, Math.PI * 2);
      paint(ctx, C.coral, { lw: 0.03 });
      ctx.beginPath();
      ctx.moveTo(-0.52, 0.17); ctx.lineTo(-0.66, 0.2); ctx.lineTo(-0.6, 0.36); ctx.closePath();
      paint(ctx, C.coral, { lw: 0.03 });
      ctx.beginPath();
      ctx.arc(-0.31, 0.26, 0.022, 0, Math.PI * 2);
      ctx.fillStyle = C.ink;
      ctx.fill();
      // A paper tag on the ring: whose it is.
      ctx.beginPath();
      ctx.rect(-0.3, -0.36, 0.5, 0.22);
      paint(ctx, C.white, { lw: 0.025 });
      ctx.beginPath();
      ctx.moveTo(-0.2, -0.14); ctx.lineTo(-0.2, 0.06);
      ctx.stroke();
      if (!Q.detail) return;
      ctx.save();
      ctx.translate(-0.05, -0.25);
      ctx.scale(1 / 40, 1 / 40);
      ctx.font = '2.5px "Bagel Fat One", "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = C.red;
      ctx.fillText('NOODLES: BACK', 0, 0);
      ctx.restore();
    }));
    R.find({ id: 'noodle-key', label: 'The noodle bar\'s back door key', at: [17.0, 51.4, 0.05], r: 0.8 });

    // A crate of squid, delivered to the noodle bar. It says AQUARIUM on it.
    R.thing(17.0, 53.55, (ctx) => {
      const x = 16.05, y = 52.3, w = 0.95, d = 1.25, h = 0.62;
      box(ctx, x, y, 0, w, d, h, C.woodLight, { top: C.white });
      if (!Q.detail) return;
      for (const u of [0.2, 0.42]) face(ctx, [[x, y + d, u], [x + w, y + d, u]], null, { lw: 0.025, stroke: C.wood });
      // Squid on ice.
      for (const [sx, sy, a] of [[16.35, 52.6, 0.3], [16.7, 52.95, -0.2], [16.4, 53.25, 0.1]]) {
        const [X, Y] = P(sx, sy, h);
        ctx.beginPath();
        ctx.ellipse(X, Y, 0.3, 0.1, a, 0, Math.PI * 2);
        paint(ctx, C.pink, { lw: 0.025 });
        ctx.beginPath();
        ctx.arc(X + Math.cos(a) * 0.12, Y + Math.sin(a) * 0.12, 0.025, 0, Math.PI * 2);
        ctx.fillStyle = C.ink;
        ctx.fill();
      }
      words(ctx, 'x', x + w / 2, y + d, 0.45, 'SQUID', 0.2, C.navy);
      // The label: AQUARIUM, crossed out, and NOODLES? under it.
      face(ctx, [[x + 0.15, y + d, 0.08], [x + 0.8, y + d, 0.08], [x + 0.8, y + d, 0.3], [x + 0.15, y + d, 0.3]], C.white, { lw: 0.02 });
      words(ctx, 'x', x + 0.47, y + d, 0.2, 'AQUARIUM', 0.1, C.ink);
      face(ctx, [[x + 0.2, y + d, 0.14], [x + 0.75, y + d, 0.25]], null, { lw: 0.03, stroke: C.red });
    });

    // The chef's break stool, and the chef on it for a while after the lunch
    // rush (when the octopus tends to turn up).
    R.thing(17.0, 55.35, (ctx) => {
      cylinder(ctx, 16.75, 55.1, 0, 0.25, 0.7, C.red);
      cylinder(ctx, 17.15, 55.75, 0, 0.15, 0.35, C.grey); // an upturned bucket
      cylinder(ctx, 17.12, 55.72, 0.35, 0.07, 0.14, C.white); // a mug on it
    });
    const CHEF = folk(61, { top: C.white, bottom: C.ink, hat: 'chef', style: 'short' });
    const BREAK = [at(14.3), at(15.6)];
    R.mover((t) => ({ x: 16.75, y: 55.1, on: loopT(t) >= BREAK[0] && loopT(t) < BREAK[1] }), (ctx, t, p) => {
      if (!p.on) return;
      const staring = octoHere(t);
      person(ctx, p.x, p.y, 0.7 - 0.73, { ...CHEF, pose: 'sit', dir: 'r' }, t);
      if (staring && readable()) speech(ctx, p.x, p.y, 2.6, 'You\'re not on the menu.', { size: 0.42 });
    }, { bias: 0.1 });

    // The kitchen's extractor, puffing noodle steam over the lane.
    R.thing(16.95, 57.15, (ctx) => {
      box(ctx, 16.05, 56.35, 0, 0.85, 0.8, 0.9, C.greyLight);
      cylinder(ctx, 16.45, 56.75, 0.9, 0.18, 0.7, C.grey);
      box(ctx, 16.22, 56.52, 1.6, 0.46, 0.46, 0.08, shade(C.grey, 0.2), { flat: true });
      if (!Q.detail) return;
      for (let i = 1; i < 5; i++) face(ctx, [[16.15, 57.15, i * 0.17], [16.8, 57.15, i * 0.17]], null, { lw: 0.03, stroke: shade(C.greyLight, 0.35) });
    });
    R.thing(17.0, 57.2, (ctx, t) => {
      if (!Q.detail) return;
      particles(t, 7, 3.2, (k, r) => {
        const drift = k * 1.1 + r() * 0.2;
        const [X, Y] = P(16.45 + drift, 56.75 - drift * 0.4, 1.75 + k * 2.1);
        ctx.beginPath();
        ctx.arc(X + Math.sin(k * 6 + r() * 6) * 0.08, Y, 0.14 + k * 0.32, 0, Math.PI * 2);
        ctx.fillStyle = alpha(C.white, 0.6 * (1 - k));
        ctx.fill();
      }, 7);
    }, { anim: true });

    // The bakery's side: its day-old bread, stacked in trays, and a pigeon
    // helping itself.
    R.thing(19.5, 50.3, (ctx) => {
      const x = 18.65, y = 49.1, w = 0.85, d = 1.2;
      for (let i = 0; i < 4; i++) box(ctx, x, y, i * 0.32, w, d, 0.3, i % 2 ? C.sky : tint(C.sky, 0.25), { flat: true, lw: 0.035 });
      for (const [lx, ly] of [[18.9, 49.35], [19.25, 49.55], [18.95, 49.95]]) {
        const [X, Y] = P(lx, ly, 1.28);
        ctx.beginPath();
        ctx.ellipse(X, Y - 0.06, 0.26, 0.12, 0.45, 0, Math.PI * 2);
        paint(ctx, C.wood, { lw: 0.03 });
      }
      face(ctx, [[18.8, y + d, 0.72], [19.35, y + d, 0.72], [19.35, y + d, 1.02], [18.8, y + d, 1.02]], C.white, { lw: 0.025 });
      words(ctx, 'x', 19.07, y + d, 0.87, 'DAY OLD', 0.11, C.coral);
    });
    R.thing(19.55, 50.35, (ctx, t) => pigeon(ctx, t, 19.25, 49.85, 1.3), { anim: true });

    // A drainpipe down the bakery's wall, into the drain.
    R.thing(19.5, 52.0, (ctx) => {
      cylinder(ctx, 19.4, 51.9, 0.22, 0.08, 3.0, C.grey, { flat: true });
      box(ctx, 19.08, 51.82, 0.02, 0.32, 0.16, 0.22, C.grey, { flat: true, lw: 0.03 });
      box(ctx, 19.25, 51.75, 3.2, 0.3, 0.3, 0.32, C.grey, { flat: true, lw: 0.03 });
      for (const z of [1.2, 2.3]) box(ctx, 19.32, 51.82, z, 0.2, 0.16, 0.06, C.ink, { flat: true, stroke: false });
    });

    // The find: a cat in a bin, lid up on its head, watching the lane (and
    // staring, when the octopus turns up).
    R.thing(19.35, 55.35, (ctx) => dustbin(ctx, 19.05, 55.05, 0.42, 1.0, false));
    R.thing(19.4, 55.4, (ctx, t) => {
      const [X, Y] = P(19.05, 55.05, 1.25);
      const wide = octoHere(t);
      const look = wide ? 1 : Math.sin(t * 0.6) * 0.8;
      const lift = Math.max(0, Math.sin(t * 0.9)) * 0.08;
      // The lid, pushed up and back off the bin by its head.
      ctx.save();
      ctx.translate(X + 0.22, Y - lift - 0.42);
      ctx.rotate(0.55);
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.5, 0.17, 0, 0, Math.PI * 2);
      paint(ctx, tint(C.grey, 0.2), { lw: 0.035 });
      ctx.beginPath();
      ctx.ellipse(0, -0.06, 0.12, 0.05, 0, 0, Math.PI * 2);
      paint(ctx, C.greyLight, { lw: 0.03 });
      ctx.restore();
      // Paws on the rim.
      ctx.fillStyle = C.mustard;
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 0.025;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(X + s * 0.22, Y + 0.2, 0.09, 0.055, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      catHead(ctx, t, X, Y - lift, 0.31, C.mustard, look, wide);
      if (Q.detail) {
        ctx.strokeStyle = shade(C.mustard, 0.35);
        ctx.lineWidth = 0.03;
        ctx.beginPath();
        for (const dx of [-0.08, 0, 0.08]) { ctx.moveTo(X + dx, Y - lift - 0.26); ctx.lineTo(X + dx, Y - lift - 0.15); }
        ctx.stroke();
      }
    }, { anim: true });
    R.find({ id: 'cat-in-a-bin', label: 'A cat in a bin', at: [19.05, 55.05, 1.25], r: 0.8 });
  },
};
