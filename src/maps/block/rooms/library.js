// Library: a rolling ladder with a thrill-seeker on it, a librarian who shushes
// everything (including the weather), story time, and a goose doing its homework.
import {
  C, box, rect, disc, cylinder, face, paint, person, folk, slab, planks,
  onLeft, onRight, speech, paintText, shade, tint, mix, alpha, Q, P, rng, pick, CLOTH, lamp,
} from '../../../engine/art.js';
import { route, particles, pulse, clamp, ease } from '../../../engine/actors.js';
import { ZK } from '../../../engine/iso.js';

const H = 7;                      // tall walls for tall shelves
const SH = 5.7;                   // shelf height
const LOOP = 16;                  // the shush cycle
const WALLC = mix(C.teal, C.paper, 0.55);

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

// Books on a shelf, with the odd leaning one and gaps.
function fillL(ctx, y, z, w, r, row) {
  let yy = y + 0.1;
  while (yy < y + w - 0.25) {
    if (r() < 0.07) { yy += 0.3; continue; }
    const bw = 0.14 + r() * 0.16, bh = 0.5 + r() * 0.26;
    const c = pick(r, CLOTH);
    if (r() < 0.1 && yy < y + w - 0.7) {
      face(ctx, [[0.25, yy, z], [0.25, yy + bh, z], [0.25, yy + bh, z + bw], [0.25, yy, z + bw]], null);
      box(ctx, 0.2, yy, z, 0.7, bh * 0.9, bw, c, { flat: true, lw: 0.03 });
      yy += bh * 0.9 + 0.03;
      continue;
    }
    box(ctx, 0.2, yy, z, 0.7, bw, bh, c, { flat: true, lw: 0.03 });
    if (Q.detail && r() < 0.4) face(ctx, [[0.9, yy + 0.02, z + bh * 0.7], [0.9, yy + bw - 0.02, z + bh * 0.7]], null, { lw: 0.03, stroke: C.butter });
    yy += bw + 0.015;
  }
}
function fillR(ctx, x, z, w, r) {
  let xx = x + 0.1;
  while (xx < x + w - 0.25) {
    if (r() < 0.07) { xx += 0.3; continue; }
    const bw = 0.14 + r() * 0.16, bh = 0.5 + r() * 0.26;
    const c = pick(r, CLOTH);
    box(ctx, xx, 0.2, z, bw, 0.7, bh, c, { flat: true, lw: 0.03 });
    if (Q.detail && r() < 0.4) face(ctx, [[xx + 0.02, 0.9, z + bh * 0.7], [xx + bw - 0.02, 0.9, z + bh * 0.7]], null, { lw: 0.03, stroke: C.butter });
    xx += bw + 0.015;
  }
}
function bookcaseL(ctx, y, w, seed, ends = [false, false]) {
  const r = rng(seed);
  const n = 6;
  onLeft(ctx, y, 0.3, w, SH - 0.3, shade(C.brown, 0.35), { stroke: false });
  box(ctx, 0, y, 0, 1.1, w, 0.3, C.brown);
  for (let i = 0; i < n; i++) {
    const z = 0.3 + (i * (SH - 0.3)) / n;
    box(ctx, 0, y, z, 1.1, w, 0.08, C.wood, { flat: true, lw: 0.03 });
    fillL(ctx, y, z + 0.08, w, r, i);
  }
  if (ends[0]) box(ctx, 0, y, 0, 1.1, 0.1, SH, C.brown, { lw: 0.03 });
  else box(ctx, 0.98, y - 0.05, 0, 0.12, 0.1, SH, C.brown, { lw: 0.03, flat: true });
  if (ends[1]) box(ctx, 0, y + w - 0.1, 0, 1.1, 0.1, SH, C.brown, { lw: 0.03 });
  box(ctx, 0, y - 0.05, SH, 1.2, w + 0.1, 0.2, C.brown);
}
function bookcaseR(ctx, x, w, seed, ends = [false, false]) {
  const r = rng(seed);
  const n = 6;
  onRight(ctx, x, 0.3, w, SH - 0.3, shade(C.brown, 0.3), { stroke: false });
  box(ctx, x, 0, 0, w, 1.1, 0.3, C.brown);
  for (let i = 0; i < n; i++) {
    const z = 0.3 + (i * (SH - 0.3)) / n;
    box(ctx, x, 0, z, w, 1.1, 0.08, C.wood, { flat: true, lw: 0.03 });
    fillR(ctx, x, z + 0.08, w, r);
  }
  if (ends[0]) box(ctx, x, 0, 0, 0.1, 1.1, SH, C.brown, { lw: 0.03 });
  else box(ctx, x - 0.05, 0.98, 0, 0.1, 0.12, SH, C.brown, { lw: 0.03, flat: true });
  if (ends[1]) box(ctx, x + w - 0.1, 0, 0, 0.1, 1.1, SH, C.brown, { lw: 0.03 });
  box(ctx, x - 0.05, 0, SH, w + 0.1, 1.2, 0.2, C.brown);
}

// A flat book lying on a surface, cover color c.
function flatBook(ctx, x, y, z, w, d, c, h = 0.12) {
  box(ctx, x, y, z, w, d, h, C.white, { top: c, lw: 0.03, flat: true });
}

function armchair(ctx, x, y, color) {
  // faces +x
  box(ctx, x, y, 0, 1.2, 1.2, 0.75, color, { lw: 0.04 });
  box(ctx, x - 0.05, y, 0.75, 0.35, 1.2, 1.0, color, { lw: 0.04 });
  box(ctx, x + 0.3, y - 0.05, 0.75, 0.9, 0.25, 0.35, shade(color, 0.05), { lw: 0.04 });
  box(ctx, x + 0.3, y + 1.0, 0.75, 0.9, 0.25, 0.35, shade(color, 0.05), { lw: 0.04 });
}

function cat(ctx, x, y, z, t) {
  const [X, Y] = P(x, y, z);
  const br = 1 + Math.sin(t * 1.8) * 0.04;
  ctx.save();
  ctx.translate(X, Y);
  // tail curled round the front
  ctx.beginPath();
  ctx.moveTo(0.35, -0.12);
  ctx.quadraticCurveTo(0.5, 0.1, 0.0, 0.05);
  ctx.quadraticCurveTo(-0.35, 0.02, -0.4, -0.08);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.14; ctx.lineCap = 'round'; ctx.stroke();
  ctx.strokeStyle = C.mustard; ctx.lineWidth = 0.08; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0.05, -0.22, 0.42, 0.24 * br, 0, 0, Math.PI * 2);
  paint(ctx, C.mustard, { dots: C.coral, density: 0.3, lw: 0.04 });
  if (Q.detail) {
    ctx.strokeStyle = shade(C.mustard, 0.4); ctx.lineWidth = 0.04; ctx.beginPath();
    for (const sx of [-0.05, 0.1, 0.25]) { ctx.moveTo(sx, -0.44); ctx.lineTo(sx + 0.04, -0.3); }
    ctx.stroke();
  }
  // head tucked in
  ctx.beginPath(); ctx.arc(-0.3, -0.2, 0.17, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.04 });
  ctx.beginPath(); ctx.moveTo(-0.44, -0.28); ctx.lineTo(-0.42, -0.45); ctx.lineTo(-0.32, -0.34); ctx.moveTo(-0.26, -0.35); ctx.lineTo(-0.18, -0.48); ctx.lineTo(-0.15, -0.3);
  paint(ctx, C.mustard, { lw: 0.03 });
  if (Q.detail) {
    ctx.beginPath(); ctx.moveTo(-0.38, -0.2); ctx.lineTo(-0.32, -0.18); ctx.moveTo(-0.26, -0.18); ctx.lineTo(-0.2, -0.2);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
    const k = (t * 0.5) % 1;
    txt(ctx, X * 0 - 0.4 - k * 0.4, -0.6 - k * 0.7, 'z', 0.25 + k * 0.15, alpha(C.ink, 1 - k));
  }
  ctx.restore();
}

// Paper airplane at screen point, pointing along (dx, dy).
function plane(ctx, X, Y, dx, dy, s = 1) {
  const a = Math.atan2(dy, dx);
  ctx.save();
  ctx.translate(X, Y);
  ctx.rotate(a);
  ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(0.45, 0); ctx.lineTo(-0.35, -0.28); ctx.lineTo(-0.2, 0); ctx.closePath();
  paint(ctx, C.white, { lw: 0.035 });
  ctx.beginPath(); ctx.moveTo(0.45, 0); ctx.lineTo(-0.35, 0.18); ctx.lineTo(-0.2, 0); ctx.closePath();
  paint(ctx, C.greyLight, { lw: 0.035 });
  ctx.restore();
}

// On a day (the Block Party): the sky by the hour, and the clock's hands on it.
const SKY = [[0, C.night], [4.5, C.night], [6, C.blush], [8, C.sky], [17, C.sky], [19, C.pink], [20.5, C.purple], [21.5, C.night], [24, C.night]];
function skyAt(h) {
  for (let i = 1; i < SKY.length; i++) {
    const [h0, c0] = SKY[i - 1], [h1, c1] = SKY[i];
    if (h <= h1) return mix(c0, c1, Math.round(((h - h0) / (h1 - h0)) * 20) / 20);
  }
  return C.night;
}
function clockHands(ctx, h) {
  const [X, Y] = P(10, 0, 6.15);
  ctx.save();
  ctx.translate(X, Y);
  ctx.transform(1, 0.5, 0, 1, 0, 0);
  ctx.strokeStyle = C.ink; ctx.lineCap = 'round';
  const hand = (turns, len, lw) => {
    const a = turns * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(a) * len, -Math.cos(a) * len);
    ctx.lineWidth = lw; ctx.stroke();
  };
  hand((h % 12) / 12, 0.18, 0.06);
  hand(h % 1, 0.27, 0.04);
  ctx.restore();
}

export default {
  id: 'library',
  name: 'Library',
  blurb: 'The librarian has shushed three children, one ladder and a thunderstorm. The goose is studying swans, for reasons.',

  build(R) {
    // On a day (the Block Party): the door onto Main Street, the sky in the
    // window, and the librarian away shushing the sound check.
    const day = R.opts.day;
    // ---------- floor ----------
    R.floor((ctx) => {
      slab(ctx, C.greyLight);
      planks(ctx, C.woodLight, 0.7);
      // runner carpet down the middle
      rect(ctx, 2.6, 4.3, 10, 1.6, 0.01, C.red, { dots: shade(C.red, 0.4), density: 0.15, stroke: false });
      rect(ctx, 2.8, 4.5, 9.6, 1.2, 0.012, null, { lw: 0.05, stroke: C.mustard });
    });
    R.walls({ h: H, left: WALLC, right: shade(WALLC, 0.06), cap: C.paper, dotsL: shade(WALLC, 0.25), dotsR: shade(WALLC, 0.3), densL: 0.12, densR: 0.12 });
    R.decor((ctx) => {
      // frieze above the shelves
      onLeft(ctx, 0, SH + 0.3, 16, 0.9, C.navy, { stroke: false });
      onRight(ctx, 0, SH + 0.3, 16, 0.9, C.navy, { stroke: false });
      paintText(ctx, 'left', 8, SH + 0.75, 'QUIET PLEASE', 0.6, C.butter);
      paintText(ctx, 'right', 4.2, SH + 0.75, 'FICTION', 0.55, C.butter);
      paintText(ctx, 'right', 14.0, SH + 0.75, 'ATLASES', 0.5, C.butter);
      // clock over the window
      const [X, Y] = P(10, 0, 6.15);
      ctx.save();
      ctx.translate(X, Y);
      ctx.transform(1, 0.5, 0, 1, 0, 0);
      ctx.beginPath(); ctx.arc(0, 0, 0.36, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.05 });
      if (!day) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -0.26); ctx.moveTo(0, 0); ctx.lineTo(0.18, 0.06); ctx.stroke(); }
      ctx.restore();
    });

    // ---------- the rainy window on the right wall ----------
    const WX0 = 8.2, WX1 = 11.8, WZ0 = 1.6, WZ1 = 5.3;
    const flashAt = (t) => { const s = pulse(t, LOOP) * LOOP; return (s > 13 && s < 13.12) || (s > 13.25 && s < 13.4); };
    R.decor((ctx, t) => {
      onRight(ctx, WX0 - 0.2, WZ0 - 0.2, WX1 - WX0 + 0.4, WZ1 - WZ0 + 0.4, C.white, { lw: 0.05 });
      const flash = flashAt(t);
      const sky = day ? mix(skyAt(day.hour(t)), C.grey, 0.3) : mix(C.navy, C.grey, 0.35);
      onRight(ctx, WX0, WZ0, WX1 - WX0, WZ1 - WZ0, flash ? C.white : sky, { dots: flash ? null : C.navy, density: 0.25, lw: 0.04 });
      if (Q.detail) {
        // rooftops outside
        face(ctx, [[WX0, 0, WZ0], [WX0, 0, 2.6], [8.9, 0, 2.6], [8.9, 0, 3.1], [9.6, 0, 3.1], [9.6, 0, 2.3], [10.6, 0, 2.3], [10.9, 0, 2.9], [11.2, 0, 2.3], [WX1, 0, 2.3], [WX1, 0, WZ0]], flash ? C.greyLight : mix(C.navy, C.ink, 0.3), { stroke: false });
        ctx.save();
        const [a0, b0] = P(WX0, 0, WZ1), [a1] = P(WX1, 0, WZ1);
        ctx.beginPath();
        const p1 = P(WX0, 0, WZ0), p2 = P(WX1, 0, WZ0), p3 = P(WX1, 0, WZ1), p4 = P(WX0, 0, WZ1);
        ctx.moveTo(...p1); ctx.lineTo(...p2); ctx.lineTo(...p3); ctx.lineTo(...p4); ctx.closePath();
        ctx.clip();
        ctx.strokeStyle = alpha(C.sky, 0.8);
        ctx.lineWidth = 0.035;
        ctx.beginPath();
        for (let i = 0; i < 22; i++) {
          const u = WX0 + ((i * 0.37) % 1) * (WX1 - WX0) + (i % 3) * 0.1;
          const zz = WZ1 + 0.5 - ((t * 5 + i * 0.83) % (WZ1 - WZ0 + 1.2));
          const [x0, y0] = P(u, 0, zz), [x1, y1] = P(u - 0.15, 0, zz - 0.55);
          ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
        }
        ctx.stroke();
        // drops sliding down the glass
        for (let i = 0; i < 6; i++) {
          const u = WX0 + 0.3 + i * 0.58;
          const k = pulse(t, 3 + (i % 3), i * 0.7);
          const [X, Y] = P(u, 0, WZ1 - 0.2 - k * (WZ1 - WZ0 - 0.3));
          ctx.beginPath(); ctx.moveTo(X, Y - k * 0.5); ctx.lineTo(X, Y);
          ctx.strokeStyle = alpha(C.white, 0.5); ctx.lineWidth = 0.04; ctx.stroke();
          ctx.beginPath(); ctx.arc(X, Y, 0.06, 0, Math.PI * 2); ctx.fillStyle = alpha(C.white, 0.85); ctx.fill();
        }
        ctx.restore();
        if (flash) {
          face(ctx, [[10.4, 0, 5.3], [10.0, 0, 4.4], [10.4, 0, 4.4], [9.9, 0, 3.4]], null, { lw: 0.08, stroke: C.mustard });
        }
      }
      // mullions
      face(ctx, [[(WX0 + WX1) / 2, 0, WZ0], [(WX0 + WX1) / 2, 0, WZ1]], null, { lw: 0.12, stroke: C.white });
      face(ctx, [[WX0, 0, (WZ0 + WZ1) / 2 + 0.4], [WX1, 0, (WZ0 + WZ1) / 2 + 0.4]], null, { lw: 0.12, stroke: C.white });
      if (day) clockHands(ctx, day.hour(t));
    }, { anim: true });
    // thunder word, outside the room's back
    R.air((ctx, t) => {
      const s = pulse(t, LOOP) * LOOP;
      if (s < 13 || s > 14.6 || !Q.detail) return;
      const k = (s - 13) / 1.6;
      const [X, Y] = P(10, 0.2, 5.9 + k * 0.4);
      txt(ctx, X + Math.sin(t * 60) * 0.05, Y, 'RUMBLE', 0.55, alpha(C.navy, 1 - k * 0.8));
    });

    // Window seat with a cat asleep on a stack of books and a reader watching the rain.
    R.thing(11.9, 0.95, (ctx) => {
      box(ctx, WX0 - 0.1, 0, 0, WX1 - WX0 + 0.2, 0.95, 0.85, C.brown, { top: C.wood, lw: 0.04 });
      box(ctx, WX0 + 0.2, 0.05, 0.85, 1.6, 0.8, 0.18, C.pink, { dots: C.white, density: 0.3, lw: 0.04 });
      box(ctx, WX0 + 1.9, 0.05, 0.85, 1.6, 0.8, 0.18, C.pink, { dots: C.white, density: 0.3, lw: 0.04 });
      const cs = [C.navy, C.coral, C.teal, C.mustard, C.purple];
      for (let i = 0; i < 5; i++) flatBook(ctx, 8.55 + (i % 2) * 0.06, 0.2 + (i % 3) * 0.03, 1.03 + i * 0.13, 0.7, 0.55, cs[i], 0.13);
    });
    R.thing(9.0, 0.9, (ctx, t) => cat(ctx, 8.95, 0.5, 1.68, t), { anim: true, depth: 12.0 });
    R.mover(() => ({ x: 11.0, y: 0.6 }), (ctx, t) => {
      const s = pulse(t, LOOP) * LOOP;
      const jump = s > 13 && s < 14.2;
      person(ctx, 11.0, 0.6, 0.95 + (jump ? Math.sin((s - 13) / 1.2 * Math.PI) * 0.3 : 0), folk(201, {
        pose: jump ? 'cheer' : 'sit', dir: 'l', style: 'long', top: C.sky, hair: C.brown,
        arms: jump ? undefined : [1.1, 1.0],
        hold: jump ? undefined : (c) => { c.beginPath(); c.moveTo(-0.05, -0.2); c.lineTo(0.25, 0.1); c.lineTo(0.55, -0.2); c.lineTo(0.55, 0.1); c.lineTo(0.25, 0.4); c.lineTo(-0.05, 0.1); c.closePath(); paint(c, C.coral, { lw: 0.03 }); },
      }), t);
    }, { depth: 12.1 });

    // ---------- bookcases ----------
    for (let i = 0; i < 8; i++) {
      const y = 0.4 + i * 1.95;
      // (on a day, two cases make way for the door onto Main Street, y 11.4 to 13.6)
      if (day && i === 6) continue;
      const w = day && i === 5 ? 0.95 : 1.95;
      R.thing(1.1, y + w, (ctx) => bookcaseL(ctx, y, w, 300 + i, [i === 0 || (day && i === 7), i === 7 || (day && i === 5)]));
    }
    for (const [x, w, seed, e0, e1] of [[1.2, 2.2, 401, true, false], [3.4, 2.2, 402, false, false], [5.6, 2.2, 403, false, true], [12.3, 1.85, 404, true, false], [14.15, 1.85, 405, false, true]]) {
      R.thing(x + w, 1.1, (ctx) => bookcaseR(ctx, x, w, seed, [e0, e1]));
    }

    // ---------- the rolling ladder, and the person riding it ----------
    // 0-7 browsing near the back, 7.4-9.4 WHEEE to the front, 9.4-14 browsing, 14-16 a sheepish roll back.
    const run = day ? 6.4 : 9.6; // (on a day it stops short of the door)
    const ladderY = (t) => {
      const s = pulse(t, LOOP) * LOOP;
      if (s < 7.4) return 3.2;
      if (s < 9.4) return 3.2 + ease((s - 7.4) / 2) * run;
      if (s < 14) return 3.2 + run;
      return 3.2 + run - ease((s - 14) / 2) * run;
    };
    R.air((ctx) => {
      // brass rail across the shelf tops
      face(ctx, [[1.25, 0.5, 5.45], [1.25, 15.6, 5.45]], null, { lw: 0.16, stroke: C.ink });
      face(ctx, [[1.25, 0.5, 5.45], [1.25, 15.6, 5.45]], null, { lw: 0.08, stroke: C.mustard });
    }, { anim: false });
    R.mover((t) => ({ x: 2.4, y: ladderY(t) }), (ctx, t, p) => {
      const y = p.y;
      for (const dy of [-0.4, 0.4]) {
        face(ctx, [[1.3, y + dy, 5.45], [2.55, y + dy, 0.15]], null, { lw: 0.16, stroke: C.ink });
        face(ctx, [[1.3, y + dy, 5.45], [2.55, y + dy, 0.15]], null, { lw: 0.09, stroke: C.wood });
        const [wx, wy] = P(2.6, y + dy, 0.1);
        ctx.beginPath(); ctx.arc(wx, wy, 0.12, 0, Math.PI * 2); paint(ctx, C.ink);
      }
      for (let z = 0.5; z < 5.2; z += 0.5) {
        const x = 1.3 + (1 - z / 5.3) * 1.25;
        face(ctx, [[x, y - 0.4, z], [x, y + 0.4, z]], null, { lw: 0.09, stroke: C.brown });
      }
      const s = pulse(t, LOOP) * LOOP;
      const zoom = s > 7.4 && s < 9.8;
      person(ctx, 2.0, y, 2.0, {
        skin: '#E3A97F', hair: C.red, style: 'pony', top: C.mustard, bottom: C.navy, dir: 'l', back: !zoom,
        pose: zoom ? 'cheer' : 'point', arms: zoom ? undefined : [2.4 + Math.sin(t * 2) * 0.2, 0.2], speed: 10,
      }, t);
      if (zoom && Q.detail) {
        speech(ctx, 2.0, y, 5.0, 'WHEEE!', { size: 0.5 });
        for (let k = 1; k < 4; k++) {
          const [X0, Y0] = P(2.3, y - 0.4 - k * 0.3, 0.8 + k * 0.9);
          ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X0 + 0.6, Y0 - 0.3);
          ctx.strokeStyle = alpha(C.ink, 0.5); ctx.lineWidth = 0.05; ctx.stroke();
        }
      }
    }, { bias: 0.2 });

    // ---------- circulation desk and the librarian ----------
    R.thing(15.6, 4.6, (ctx) => {
      box(ctx, 12.0, 3.6, 0, 3.6, 1.0, 1.25, C.wood, { top: C.woodLight, lw: 0.05 });
      ctx.save();
      ctx.translate(-4.6, 2.3);
      paintText(ctx, 'right', 13.8, 0.65, 'RETURNS', 0.5, C.white);
      ctx.restore();
      // monitor, bell, stamp, a pile of returns
      box(ctx, 14.6, 3.8, 1.25, 0.7, 0.3, 0.6, C.greyLight, { lw: 0.03 });
      box(ctx, 14.62, 3.78, 1.33, 0.66, 0.02, 0.45, C.navy, { flat: true, stroke: false });
      cylinder(ctx, 12.5, 4.2, 1.25, 0.14, 0.1, C.mustard);
      cylinder(ctx, 13.2, 4.1, 1.25, 0.08, 0.22, C.brown, { top: C.red });
      for (let i = 0; i < 4; i++) flatBook(ctx, 13.6 + (i % 2) * 0.05, 3.85, 1.25 + i * 0.13, 0.6, 0.5, CLOTH[i + 3], 0.13);
    });
    // Who gets shushed, and when.
    const shush = (t) => {
      const s = pulse(t, LOOP) * LOOP;
      if (s > 5 && s < 6.6) return { dir: 'l', target: 'story' };
      if (s > 9.6 && s < 11.2) return { dir: 'l', target: 'ladder' };
      if (s > 13.8 && s < 15.4) return { dir: 'r', target: 'sky' };
      return null;
    };
    const her = day && R.walkers.find((w) => w.id === 'librarian');
    R.mover(() => ({ x: 13.6, y: 2.8 }), (ctx, t) => {
      if (her && !her.at(t).hide) return; // out shushing the sound check
      const sh = shush(t);
      person(ctx, 13.6, 2.8, 0, {
        skin: '#F7DCC4', hair: C.greyLight, style: 'bun', top: C.purple, bottom: C.ink, dress: true,
        dir: sh ? sh.dir : 'l', pose: sh ? 'point' : 'stand', arms: sh ? [1.9, 2.9] : [1.0, 0.9],
        hold: sh ? undefined : (c) => { c.beginPath(); c.rect(0.0, -0.1, 0.45, 0.3); paint(c, C.teal, { lw: 0.03 }); },
      }, t);
      // specs on a chain
      if (Q.detail) {
        const [X, Y] = P(13.6, 2.8, 0);
        const f = (sh ? sh.dir : 'l') === 'l' ? -1 : 1;
        ctx.beginPath(); ctx.arc(X + f * 0.12, Y - 1.93, 0.08, 0, Math.PI * 2); ctx.arc(X + f * 0.28, Y - 1.93, 0.08, 0, Math.PI * 2);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
      }
      if (sh && Q.detail) speech(ctx, 13.4, 2.6, 3.4, 'SHH!', { size: 0.62, fill: C.butter });
    }, { bias: -0.3 });

    // ---------- story time ----------
    const RUG = [10.8, 10.6];
    R.rug((ctx) => {
      disc(ctx, RUG[0], RUG[1], 0.01, 2.7, C.mustard, { lw: 0.05 });
      disc(ctx, RUG[0], RUG[1], 0.012, 2.2, C.coral, { dots: shade(C.coral, 0.4), density: 0.15, stroke: false });
      disc(ctx, RUG[0], RUG[1], 0.014, 1.5, C.butter, { stroke: false });
      disc(ctx, RUG[0], RUG[1], 0.016, 0.8, C.teal, { stroke: false });
    });
    const roar = (t) => { const s = pulse(t, LOOP) * LOOP; return s > 2.8 && s < 4.8; };
    R.thing(11.9, 9.0, (ctx) => {
      // storyteller's chair
      box(ctx, 10.3, 8.0, 0, 1.0, 1.0, 0.8, C.green, { lw: 0.04 });
      box(ctx, 10.25, 8.0, 0.8, 0.25, 1.0, 1.2, C.green, { lw: 0.04 });
    }, { depth: 18.5 });
    R.mover(() => ({ x: 10.9, y: 8.6 }), (ctx, t) => {
      const r = roar(t);
      person(ctx, 10.9, 8.6, 0.1, {
        skin: '#95603F', hair: C.ink, style: 'curly', top: C.coral, bottom: C.navy, dir: 'l',
        pose: r ? 'cheer' : 'sit', arms: r ? [2.9, -2.6] : [1.3, 1.1], speed: 8,
        hold: r ? undefined : (c) => {
          c.beginPath(); c.moveTo(-0.3, -0.25); c.lineTo(0.2, -0.05); c.lineTo(0.7, -0.25); c.lineTo(0.7, 0.2); c.lineTo(0.2, 0.4); c.lineTo(-0.3, 0.2); c.closePath();
          paint(c, C.white, { lw: 0.04 });
          c.beginPath(); c.moveTo(0.2, -0.05); c.lineTo(0.2, 0.4); c.stroke();
          c.beginPath(); c.arc(0.45, 0.02, 0.1, 0, Math.PI * 2); c.fillStyle = C.green; c.fill();
        },
      }, t);
      if (r && Q.detail) speech(ctx, 10.7, 8.4, 3.6, 'ROAR!', { size: 0.62, fill: C.coralLight });
    }, { depth: 19 });
    const kids = [[9.4, 11.0, 211, C.pink], [10.6, 11.6, 212, C.mustard], [11.9, 11.2, 213, C.sky], [9.9, 12.6, 214, C.green], [11.3, 12.8, 215, C.lilac]];
    kids.forEach(([x, y, seed, top], i) => {
      R.mover(() => ({ x, y }), (ctx, t) => {
        const r = roar(t);
        const s = pulse(t, LOOP) * LOOP;
        const scared = r && s > 3.1;
        if (i === 4) {
          // this one is watching the goose instead
          person(ctx, x, y, 0, folk(seed, { pose: 'sit', dir: 'l', scale: 0.68, top }), t);
          return;
        }
        person(ctx, x, y, scared ? Math.abs(Math.sin(t * 9 + i)) * 0.3 : 0, folk(seed, { pose: scared ? 'cheer' : 'sit', dir: i % 2 ? 'l' : 'r', back: true, scale: 0.68, top, speed: 10 }), t);
      });
    });
    // one kid has fallen asleep on the rug
    R.mover(() => ({ x: 12.6, y: 12.4 }), (ctx, t) => {
      person(ctx, 12.6, 12.4, 0, folk(216, { pose: 'sleep', dir: 'r', scale: 0.66, top: C.teal }), t);
    });

    // ---------- the reading table, and the goose ----------
    R.thing(6.9, 8.1, (ctx) => {
      const lw = 0.14;
      for (const [lx, ly] of [[3.3, 6.7], [6.6, 6.7], [3.3, 7.9], [6.6, 7.9]]) box(ctx, lx, ly, 0, lw, lw, 1.05, C.brown, { flat: true });
      box(ctx, 3.2, 6.6, 1.05, 3.6, 1.5, 0.15, C.wood, { lw: 0.04 });
      // green bankers' lamps
      for (const lx of [4.2, 6.0]) {
        box(ctx, lx - 0.15, 6.8, 1.2, 0.3, 0.3, 0.05, C.mustard, { lw: 0.03 });
        face(ctx, [[lx, 6.95, 1.25], [lx, 6.95, 1.75]], null, { lw: 0.05, stroke: C.mustard });
        const [X, Y] = P(lx, 6.95, 1.85);
        ctx.beginPath(); ctx.ellipse(X, Y, 0.35, 0.16, 0, Math.PI, 0); ctx.closePath(); paint(ctx, C.green, { lw: 0.04 });
      }
      // piles of books
      for (let i = 0; i < 6; i++) flatBook(ctx, 3.5 + (i % 2) * 0.06, 7.3, 1.2 + i * 0.13, 0.7, 0.55, CLOTH[i], 0.13);
      flatBook(ctx, 4.6, 7.5, 1.2, 0.7, 0.5, C.navy);
    }, { depth: 13.0 });
    // chairs at the table
    for (const [cx, cy] of [[3.8, 8.4], [5.6, 8.4]]) {
      R.thing(cx + 0.8, cy + 0.8, (ctx) => {
        box(ctx, cx, cy, 0.8, 0.8, 0.8, 0.12, C.brown, { lw: 0.03 });
        box(ctx, cx, cy + 0.7, 0.8, 0.8, 0.12, 0.9, C.brown, { lw: 0.03 });
        for (const [lx, ly] of [[cx + 0.65, cy + 0.65], [cx + 0.05, cy + 0.65], [cx + 0.65, cy + 0.05]]) box(ctx, lx, ly, 0, 0.08, 0.08, 0.8, C.ink, { flat: true, stroke: false });
      }, { depth: cy + cx + 1.7 });
    }
    // student asleep face-down on the table
    R.mover(() => ({ x: 4.2, y: 8.7 }), (ctx, t) => {
      person(ctx, 4.2, 8.7, 0.1, folk(221, { pose: 'sit', dir: 'r', back: true, top: C.pink, style: 'short', hair: C.brown, arms: [2.9, 2.6] }), t);
      if (Q.detail) {
        const k = (t * 0.6) % 1;
        const [X, Y] = P(4.2, 8.5, 2.4 + k);
        txt(ctx, X - k * 0.4, Y, 'z', 0.4 + k * 0.2, alpha(C.ink, 1 - k));
      }
    }, { depth: 13.4 });
    // the goose's chair, open book, and the goose itself
    R.thing(7.7, 7.6, (ctx) => {
      for (const [lx, ly] of [[7.2, 7.05], [7.6, 7.05], [7.2, 7.45], [7.6, 7.45]]) face(ctx, [[lx, ly, 0], [7.4 + (lx - 7.4) * 0.5, 7.25 + (ly - 7.25) * 0.5, 0.8]], null, { lw: 0.07, stroke: C.ink });
      cylinder(ctx, 7.4, 7.25, 0.72, 0.36, 0.1, C.red);
    }, { depth: 14.5 });
    R.goose((t) => {
      const s = pulse(t, 7) * 7;
      return { x: 7.4, y: 7.25, z: 0.82, dir: 'l', pose: s > 5.6 && s < 6.2 ? 'peck' : 'stand' };
    }, { bias: 0.2 });
    R.thing(6.9, 7.5, (ctx, t) => {
      // open book in front of the goose, pages turning now and then
      const bx = 6.2, by = 7.2, z = 1.21;
      face(ctx, [[bx - 0.35, by - 0.3, z], [bx + 0.35, by - 0.3, z], [bx + 0.35, by + 0.3, z], [bx - 0.35, by + 0.3, z]], C.navy, { lw: 0.03 });
      face(ctx, [[bx - 0.3, by - 0.27, z + 0.03], [bx, by - 0.27, z + 0.03], [bx, by + 0.27, z + 0.03], [bx - 0.3, by + 0.27, z + 0.03]], C.white, { lw: 0.03 });
      face(ctx, [[bx, by - 0.27, z + 0.03], [bx + 0.3, by - 0.27, z + 0.03], [bx + 0.3, by + 0.27, z + 0.03], [bx, by + 0.27, z + 0.03]], C.white, { lw: 0.03 });
      const k = clamp((pulse(t, 7) * 7 - 5.6) / 0.6);
      if (k > 0 && k < 1) {
        const a = k * Math.PI;
        const ex = bx + Math.cos(a) * 0.3, ez = z + 0.03 + Math.sin(a) * 0.3;
        face(ctx, [[bx, by - 0.27, z + 0.03], [ex, by - 0.27, ez], [ex, by + 0.27, ez], [bx, by + 0.27, z + 0.03]], C.greyLight, { lw: 0.03 });
      }
      if (Q.detail) {
        const [X, Y] = P(bx - 0.15, by, z);
        txt(ctx, X, Y - 0.02, 'SWANS', 0.12, C.ink);
        ctx.strokeStyle = C.grey; ctx.lineWidth = 0.02; ctx.beginPath();
        for (let i = 0; i < 3; i++) { const [a1, b1] = P(bx + 0.07, by - 0.2 + i * 0.15, z + 0.04); const [a2, b2] = P(bx + 0.25, by - 0.2 + i * 0.15, z + 0.04); ctx.moveTo(a1, b1); ctx.lineTo(a2, b2); }
        ctx.stroke();
      }
      // a highlighter, for the important swan facts
      face(ctx, [[bx + 0.2, by + 0.45, z + 0.02], [bx + 0.55, by + 0.3, z + 0.02]], null, { lw: 0.08, stroke: C.pink });
    }, { anim: true, depth: 14.6 });

    // ---------- the book cart and the overdue book ----------
    const cartR = route([[3.4, 5.1, 2], [10.8, 5.1, 2]], { speed: 0.55, loop: false });
    const cartAt = (t) => {
      const p = cartR(t);
      const f = p.dir === 'r' ? 1 : -1;
      return { ...p, cx: p.x + f * 0.55, cy: p.y - f * 0.55 };
    };
    R.mover(cartAt, (ctx, t, p) => {
      const drawCart = () => {
        const x0 = p.cx - 0.6, y0 = p.cy - 0.35;
        for (const [wx, wy] of [[x0 + 0.1, y0 + 0.6], [x0 + 1.1, y0 + 0.6], [x0 + 1.1, y0 + 0.1]]) {
          const [X, Y] = P(wx, wy, 0.1); ctx.beginPath(); ctx.arc(X, Y, 0.1, 0, Math.PI * 2); paint(ctx, C.ink);
        }
        box(ctx, x0, y0, 0.2, 1.2, 0.7, 0.08, C.teal, { lw: 0.03 });
        for (let i = 0; i < 5; i++) box(ctx, x0 + 0.1 + i * 0.2, y0 + 0.1, 0.28, 0.16, 0.5, 0.45, CLOTH[(i * 5) % CLOTH.length], { flat: true, lw: 0.02 });
        box(ctx, x0, y0, 0.95, 1.2, 0.7, 0.08, C.teal, { lw: 0.03 });
        for (let i = 0; i < 4; i++) box(ctx, x0 + 0.1 + i * 0.24, y0 + 0.1, 1.03, 0.2, 0.5, 0.42, CLOTH[(i * 3 + 2) % CLOTH.length], { flat: true, lw: 0.02 });
        for (const [lx, ly] of [[x0, y0 + 0.62], [x0 + 1.12, y0 + 0.62], [x0 + 1.12, y0]]) box(ctx, lx, ly, 0.1, 0.08, 0.08, 1.0, C.ink, { flat: true, stroke: false });
        // the overdue book, lying on top with its red tag
        flatBook(ctx, p.cx - 0.3, p.cy - 0.2, 1.46, 0.55, 0.4, C.butter, 0.1);
        const [TX, TY] = P(p.cx + 0.25, p.cy + 0.2, 1.5);
        ctx.beginPath(); ctx.moveTo(TX, TY); ctx.lineTo(TX + 0.12, TY + 0.25);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
        const sw = Math.sin(t * 3) * 0.1;
        ctx.save(); ctx.translate(TX + 0.12, TY + 0.25); ctx.rotate(sw);
        ctx.beginPath(); ctx.moveTo(-0.12, 0); ctx.lineTo(0.12, 0); ctx.lineTo(0.12, 0.3); ctx.lineTo(0, 0.38); ctx.lineTo(-0.12, 0.3); ctx.closePath();
        paint(ctx, C.red, { lw: 0.03 });
        ctx.restore();
      };
      const drawPusher = () => person(ctx, p.x, p.y, 0, folk(231, { pose: p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back, top: C.green, hat: 'none', style: 'pony', speed: 5, arms: [1.3, 1.2] }), t);
      if (p.dir === 'r') { drawPusher(); drawCart(); } else { drawCart(); drawPusher(); }
    });
    R.find({ id: 'overdue', label: 'An overdue book', r: 0.8, at: (t) => { const p = cartAt(t); return [p.cx, p.cy, 1.6]; } });

    // ---------- grandpa, looking everywhere for the glasses on his head ----------
    const gramps = route([[5.2, 10.3, 1.6], [7.8, 10.2], [8.0, 11.9, 1.4], [5.0, 12.0]], { speed: 0.55 });
    R.mover(gramps, (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, {
        skin: '#F4CDAA', hair: C.white, style: 'bald', top: C.brown, bottom: C.grey, dir: p.dir, back: p.back,
        pose: p.moving ? 'walk' : 'point', speed: 4, arms: p.moving ? [0.3, -0.2] : [1.6, 0.3],
      }, t);
      // the glasses, pushed up on his head
      const [X, Y] = P(p.x, p.y, 0);
      ctx.beginPath(); ctx.ellipse(X - 0.14, Y - 2.26, 0.13, 0.09, 0, 0, Math.PI * 2); ctx.ellipse(X + 0.18, Y - 2.26, 0.13, 0.09, 0, 0, Math.PI * 2);
      ctx.fillStyle = alpha(C.sky, 0.6); ctx.fill();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.045; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X - 0.01, Y - 2.27); ctx.lineTo(X + 0.05, Y - 2.27); ctx.stroke();
      if (!p.moving && Q.detail) speech(ctx, p.x, p.y, 3.2, 'MY GLASSES?', { size: 0.4 });
    });
    R.find({ id: 'glasses', label: 'A pair of reading glasses', r: 0.7, at: (t) => { const p = gramps(t); return [p.x + 0.5, p.y + 0.5, 1.5]; } });

    // ---------- the wobbling tower of books ----------
    const TOWER = [6.9, 13.9];
    R.mover(() => ({ x: TOWER[0], y: TOWER[1] }), (ctx, t) => {
      const [X, Y] = P(TOWER[0], TOWER[1], 0);
      const r = rng(77);
      const nerve = 0.5 + 0.5 * Math.sin(t * 0.7);
      const amp = 0.04 + nerve * 0.1;
      let y = Y;
      for (let i = 0; i < 17; i++) {
        const k = i / 16;
        const off = Math.sin(t * 2.6) * amp * k * k * 6 + (r() - 0.5) * 0.08;
        const w = 0.75 + r() * 0.35, h = 0.17 + r() * 0.06;
        const tilt = Math.sin(t * 2.6) * amp * k * 0.6 + (r() - 0.5) * 0.08;
        ctx.save();
        ctx.translate(X + off, y - h / 2);
        ctx.rotate(tilt);
        ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h);
        const c = pick(r, CLOTH);
        paint(ctx, c, { lw: 0.035 });
        ctx.beginPath(); ctx.rect(-w / 2 + 0.05, -h / 2 + 0.03, 0.08, h - 0.06); ctx.fillStyle = C.white; ctx.fill();
        ctx.restore();
        y -= h;
      }
    });
    // the kid building it, on a step stool, with one more book
    R.mover(() => ({ x: 7.9, y: 14.5 }), (ctx, t) => {
      const nerve = 0.5 + 0.5 * Math.sin(t * 0.7);
      box(ctx, 7.5, 14.1, 0, 0.8, 0.8, 0.5, C.red, { lw: 0.04 });
      person(ctx, 7.9, 14.5, 0.5, folk(241, {
        pose: 'stand', dir: 'l', scale: 0.72, top: C.butter, hat: 'none', style: 'curly', hair: C.brown,
        arms: nerve > 0.7 ? [2.4 + Math.sin(t * 12) * 0.2, -2.4] : [2.7, 2.5],
        hold: (c) => { c.beginPath(); c.rect(-0.1, -1.0, 0.7, 0.2); paint(c, C.coral, { lw: 0.04 }); },
      }), t);
      if (nerve > 0.8 && Q.detail) speech(ctx, 7.7, 14.3, 2.9, 'STEADY...', { size: 0.4 });
    });

    // ---------- reading nook: armchairs and lamps ----------
    R.thing(4.1, 13.2, (ctx) => armchair(ctx, 2.9, 12.0, C.red));
    R.thing(4.1, 15.4, (ctx) => armchair(ctx, 2.9, 14.2, C.teal));
    R.thing(3.3, 13.8, (ctx, t) => lamp(ctx, 3.3, 13.7, t, C.butter), { anim: true }); // it flickers
    R.mover(() => ({ x: 3.7, y: 12.6 }), (ctx, t) => {
      const turn = pulse(t, 5) > 0.85;
      person(ctx, 3.7, 12.6, 0.15, folk(251, {
        pose: 'sit', dir: 'r', top: C.lilac, style: 'long', hair: C.ink, arms: [turn ? 1.6 : 1.1, 1.0],
        hold: (c) => { c.beginPath(); c.rect(0, -0.3, 0.5, 0.6); paint(c, C.green, { lw: 0.03 }); },
      }), t);
    }, { depth: 17.4 });
    R.mover(() => ({ x: 3.7, y: 14.8 }), (ctx, t) => {
      person(ctx, 3.7, 14.8, 0.15, folk(252, { pose: 'sit', dir: 'r', top: C.mustard, style: 'bald', arms: [0.2, 0.1] }), t);
      const [X, Y] = P(3.7, 14.8, 0.15);
      // a book tented over his face
      ctx.beginPath(); ctx.moveTo(X - 0.3, Y - 1.8); ctx.lineTo(X + 0.08, Y - 2.2); ctx.lineTo(X + 0.46, Y - 1.8); ctx.lineTo(X + 0.38, Y - 1.8); ctx.lineTo(X + 0.08, Y - 2.1); ctx.lineTo(X - 0.22, Y - 1.8); ctx.closePath();
      paint(ctx, C.navy, { lw: 0.04 });
      ctx.beginPath(); ctx.moveTo(X - 0.22, Y - 1.8); ctx.lineTo(X + 0.08, Y - 2.1); ctx.lineTo(X + 0.38, Y - 1.8); ctx.closePath();
      paint(ctx, C.white, { lw: 0.03 });
      if (Q.detail) {
        const k = (t * 0.5) % 1;
        txt(ctx, X + 0.3 + k * 0.3, Y - 2.4 - k * 0.8, 'Z', 0.35 + k * 0.2, alpha(C.ink, 1 - k));
      }
    }, { depth: 19.6 });

    // ---------- the paper airplane (a find), and the kid who threw it ----------
    const flight = (t) => {
      const w = 0.42;
      return {
        x: 8.8 + Math.sin(t * w) * 4.2,
        y: 8.8 + Math.sin(t * w * 2) * 2.6,
        z: 4.6 + Math.sin(t * w * 3) * 0.9,
      };
    };
    R.air((ctx, t) => {
      const p = flight(t), q = flight(t + 0.05);
      const [X, Y] = P(p.x, p.y, p.z), [X2, Y2] = P(q.x, q.y, q.z);
      if (Q.detail) {
        ctx.beginPath();
        for (let k = 0; k <= 10; k++) {
          const r = flight(t - k * 0.12);
          const [a, b] = P(r.x, r.y, r.z);
          k ? ctx.lineTo(a, b) : ctx.moveTo(a, b);
        }
        ctx.strokeStyle = alpha(C.ink, 0.25); ctx.lineWidth = 0.04; ctx.setLineDash([0.12, 0.12]); ctx.stroke(); ctx.setLineDash([]);
      }
      plane(ctx, X, Y, X2 - X, Y2 - Y, 1);
    });
    R.find({ id: 'plane', label: 'A paper airplane', r: 0.9, at: (t) => { const p = flight(t); return [p.x, p.y, p.z]; } });
    R.mover(() => ({ x: 13.4, y: 14.4 }), (ctx, t) => {
      const p = flight(t);
      const look = p.x - p.y > 0 ? 'r' : 'l';
      person(ctx, 13.4, 14.4, 0, folk(261, { pose: 'cheer', dir: look, scale: 0.72, top: C.coral, hat: 'cap', speed: 6 }), t);
    });

    // ---------- globe, and a new-books display ----------
    R.thing(14.6, 10.4, (ctx, t) => {
      const x = 14.6, y = 10.4;
      box(ctx, x - 0.35, y - 0.35, 0, 0.7, 0.7, 0.12, C.brown, { lw: 0.03 });
      face(ctx, [[x, y, 0.12], [x, y, 1.3]], null, { lw: 0.1, stroke: C.brown });
      const [X, Y] = P(x, y, 1.75);
      ctx.beginPath(); ctx.arc(X, Y, 0.48, 0, Math.PI * 2); paint(ctx, C.sky, { lw: 0.05 });
      ctx.save(); ctx.beginPath(); ctx.arc(X, Y, 0.48, 0, Math.PI * 2); ctx.clip();
      for (let i = 0; i < 3; i++) {
        const a = t * 0.8 + i * 2.1;
        const cx = X + Math.sin(a) * 0.42, vis = Math.cos(a);
        if (vis > -0.2) {
          ctx.beginPath(); ctx.ellipse(cx, Y - 0.12 + i * 0.12, 0.16 * Math.max(0.2, vis), 0.14, 0, 0, Math.PI * 2);
          ctx.fillStyle = C.green; ctx.fill();
        }
      }
      ctx.restore();
      ctx.beginPath(); ctx.arc(X, Y, 0.58, Math.PI * 0.6, Math.PI * 1.9); ctx.strokeStyle = C.mustard; ctx.lineWidth = 0.06; ctx.stroke();
    }, { anim: true });
    R.thing(15.2, 14.6, (ctx) => {
      box(ctx, 13.9, 13.4, 0, 1.3, 1.2, 1.0, C.navy, { top: C.butter, lw: 0.04 });
      for (let i = 0; i < 3; i++) {
        const [X, Y] = P(14.2 + i * 0.4, 13.8 + i * 0.1, 1.0);
        ctx.save(); ctx.translate(X, Y); ctx.rotate(-0.1);
        ctx.beginPath(); ctx.rect(-0.18, -0.55, 0.36, 0.5); paint(ctx, [C.coral, C.teal, C.pink][i], { lw: 0.03 });
        ctx.restore();
      }
      const [X, Y] = P(14.55, 14.6, 0.5);
      txt(ctx, X, Y, 'NEW!', 0.3, C.butter);
    });
  },
};
