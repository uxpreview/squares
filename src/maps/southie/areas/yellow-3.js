// Southie Christmas: the Yellow House's third floor. Empty before noon: bare
// boards, the last tenant's nail holes, a calendar still on August, one
// lonely curtain (with feet under it), and a box somebody wrote FREE on.
// After noon the new tenant furnishes the whole place from Farragut Road's
// curb, one free thing at a time, in the order the curb loses them: the
// couch (still wet from the rain), the dresser, the TV, the lamp with no
// shade. His friend who came to help sits on each thing as it arrives. By
// night they're both on the couch under the bare bulb, the curb's Christmas
// lights up, delighted.
import {
  C, Q, box, rect, disc, cylinder, face, paint, person, folk, speech, shade, tint, mix, alpha, hash,
  onLeft, onRight, P,
} from '../../../engine/art.js';
import { route, particles, clamp } from '../../../engine/actors.js';
import { apartment, lettering } from '../kit.js';
import { SIDING, TRIM, ROOM, BRAND, lightsOn } from '../style.js';
import { hour } from '../clock.js';
import { CURB, CURB_UP } from '../plan.js';
import { backWindow, says, sofa, crayon } from './yellow-1.js';

// Each free thing is up here half an hour after the curb loses it.
const COUCH = CURB[0] + CURB_UP, DRESSER = CURB[1] + CURB_UP, TV = CURB[2] + CURB_UP, LAMP = CURB[3] + CURB_UP;
// Up here yet (tonight counts)? Not before the morning's empty flat.
const has = (h0) => (t) => { const h = hour(t); return (h >= h0) || h < 5; };
// The first night, from the lamp on.
const night = has(LAMP + 0.5);

// A pigeon, bobbing, at (x, y, z).
function pigeon(ctx, x, y, z, t, o = {}) {
  const [X, Y] = P(x, y, z);
  const bob = o.peck ? Math.max(0, Math.sin(t * 7 + (o.phase || 0))) * 0.12 : Math.sin(t * 5 + (o.phase || 0)) * 0.03;
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(o.dir === 'l' ? -0.8 : 0.8, 0.8);
  ctx.strokeStyle = C.coral; ctx.lineWidth = 0.05;
  ctx.beginPath(); ctx.moveTo(-0.03, -0.18); ctx.lineTo(-0.05, 0); ctx.moveTo(0.06, -0.18); ctx.lineTo(0.07, 0); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -0.3, 0.3, 0.17, -0.1, 0, Math.PI * 2);
  ctx.moveTo(-0.22, -0.32); ctx.lineTo(-0.48, -0.36); ctx.lineTo(-0.26, -0.22);
  paint(ctx, C.grey, { lw: 0.03 });
  ctx.beginPath(); ctx.ellipse(-0.05, -0.33, 0.15, 0.08, -0.2, 0, Math.PI * 2); ctx.fillStyle = shade(C.grey, 0.15); ctx.fill();
  ctx.beginPath(); ctx.arc(0.24, -0.45 + bob, 0.1, 0, Math.PI * 2); paint(ctx, mix(C.grey, C.purple, 0.3), { lw: 0.025 });
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(0.33, -0.46 + bob); ctx.lineTo(0.41, -0.43 + bob); ctx.lineTo(0.33, -0.41 + bob); ctx.fill();
  ctx.fillStyle = C.coral; ctx.beginPath(); ctx.arc(0.27, -0.47 + bob, 0.02, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export default {
  id: 'yellow-3',
  name: 'Southie Christmas',
  blurb: 'Everything on the curb this morning is up here by tonight. The couch is still wet.',
  size: [15, 9],
  build(R) {
    const W = ROOM['yellow-3'];
    apartment(R, { floor: 2, walls: W, floorInk: W.floor, siding: SIDING.yellow, trim: TRIM.yellow });
    const h = hour;

    // ---------- The empty flat ----------
    R.floor((ctx) => {
      if (!Q.detail) return;
      ctx.save(); ctx.globalAlpha *= 0.28;
      for (let y = 2.4; y < 9; y += 0.5) face(ctx, [[0, y, 0.004], [12.5, y, 0.004], [12.5, y + 0.03, 0.004], [0, y + 0.03, 0.004]], C.brown, { stroke: false });
      ctx.restore();
      // Scuffs where a bed and a desk were, for years.
      ctx.save(); ctx.globalAlpha *= 0.18;
      rect(ctx, 5.6, 5.9, 2.4, 2.6, 0.006, C.white, { stroke: false });
      rect(ctx, 9.6, 6.8, 2.2, 1.4, 0.006, C.white, { stroke: false });
      ctx.restore();
    });
    R.decor((ctx) => {
      onLeft(ctx, 0, 0, 9, 0.26, tint(C.white, 0.2), { stroke: false });
      onRight(ctx, 0, 0, 12.5, 0.26, tint(C.white, 0.2), { stroke: false });
      if (!Q.detail) return;
      // The pale squares where pictures hung, and their nail holes.
      ctx.save(); ctx.globalAlpha *= 0.4;
      for (const [u, z, w, hh] of [[1.2, 2.0, 1.0, 1.3], [2.6, 2.3, 0.7, 0.9], [3.6, 1.9, 1.1, 0.8]]) onLeft(ctx, u, z, w, hh, tint(W.left, 0.6), { stroke: false });
      for (const [u, z, w, hh] of [[8.6, 1.8, 1.6, 1.1], [10.8, 2.2, 0.8, 1.0]]) onRight(ctx, u, z, w, hh, tint(W.right, 0.6), { stroke: false });
      ctx.restore();
      ctx.fillStyle = C.ink;
      for (const [u, z] of [[1.7, 3.35], [2.95, 3.25], [4.15, 2.75], [3.3, 3.5], [0.6, 2.4]]) { const [X, Y] = P(0, u, z); ctx.beginPath(); ctx.arc(X, Y, 0.04, 0, Math.PI * 2); ctx.fill(); }
      for (const [u, z] of [[9.4, 2.95], [11.2, 3.25], [9.9, 3.6], [12.0, 1.4]]) { const [X, Y] = P(u, 0, z); ctx.beginPath(); ctx.arc(X, Y, 0.04, 0, Math.PI * 2); ctx.fill(); }
      // A calendar left on August.
      onLeft(ctx, 4.3, 1.4, 0.8, 1.1, C.white, { lw: 0.025 });
      onLeft(ctx, 4.3, 2.05, 0.8, 0.45, tint(C.sky, 0.2), { stroke: false });
      crayon(ctx, [[4.45, 2.2], [4.65, 2.35], [4.85, 2.18], [5.0, 2.3]], C.teal, 0.04);
      lettering(ctx, 'y', 0.005, 4.7, 1.9, 'AUGUST', 0.12, C.ink);
      ctx.strokeStyle = alpha(C.ink, 0.5); ctx.lineWidth = 0.015; ctx.beginPath();
      for (let i = 1; i < 4; i++) { const [a, b] = P(0, 4.35, 1.45 + i * 0.1), [c, d] = P(0, 5.05, 1.45 + i * 0.1); ctx.moveTo(a, b); ctx.lineTo(c, d); }
      ctx.stroke();
      // The last day, circled.
      const [X, Y] = P(0, 4.95, 1.5); ctx.beginPath(); ctx.ellipse(X, Y + 0.05, 0.08, 0.06, 0, 0, Math.PI * 2); ctx.strokeStyle = C.red; ctx.lineWidth = 0.02; ctx.stroke();
      // A phone jack and a light switch.
      onLeft(ctx, 7.9, 1.3, 0.25, 0.4, C.white, { lw: 0.02 });
      onRight(ctx, 8.1, 1.5, 0.25, 0.4, C.white, { lw: 0.02 });
    });
    backWindow(R, 5.3, 1.9, 1.1, 1.4);
    // The lonely curtain: one panel, bunched out from the window, a pair
    // of orange feet under its hem until the couch arrives.
    R.thing(0.95, 7.45, (ctx) => {
      // The rod on two brackets, then the one panel, hanging in folds.
      box(ctx, 0.9, 5.15, 3.72, 0.06, 2.3, 0.06, C.ink, { flat: true, stroke: false });
      for (const u of [5.15, 7.4]) box(ctx, 0, u, 3.72, 0.95, 0.05, 0.05, C.ink, { flat: true, stroke: false });
      const top = 3.7, hem = 0.45, y0 = 6.15, y1 = 7.35, x = 0.92;
      face(ctx, [[x, y0, top], [x, y1, top], [x, y1 + 0.05, hem], [x, y0 - 0.05, hem]], C.pink, { lw: 0.035, dots: shade(C.pink, 0.3), density: 0.15 });
      if (Q.detail) for (const k of [0.2, 0.42, 0.62, 0.82]) face(ctx, [[x, y0 + (y1 - y0) * k, top], [x, y0 - 0.05 + (y1 - y0 + 0.1) * k, hem]], null, { lw: 0.03, stroke: shade(C.pink, 0.3) });
      for (let i = 0; i < 5; i++) { const [X, Y] = P(x, y0 + 0.1 + i * 0.26, top); ctx.beginPath(); ctx.arc(X, Y, 0.05, 0, Math.PI * 2); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02; ctx.stroke(); }
      // The bump the goose makes in it.
      const [X, Y] = P(x + 0.05, 6.8, 0.95);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.34, 0.45, 0, 0, Math.PI * 2); paint(ctx, tint(C.pink, 0.12), { lw: 0.03, dots: shade(C.pink, 0.3), density: 0.12 });
    });
    // The FREE box, left by the last tenant; the sign's still taped on.
    R.thing(6.1, 5.5, (ctx) => {
      box(ctx, 5.0, 4.6, 0, 1.1, 0.9, 0.85, C.woodLight, { flat: true, lw: 0.04, top: tint(C.woodLight, 0.12) });
      if (Q.detail) face(ctx, [[5.0, 5.0, 0.851], [6.1, 5.0, 0.851], [6.1, 5.1, 0.851], [5.0, 5.1, 0.851]], tint(C.butter, 0.3), { stroke: false });
      // The sign: a flap of cardboard propped on top, in marker.
      face(ctx, [[5.05, 5.05, 0.85], [6.05, 5.05, 0.85], [6.0, 5.2, 1.65], [5.1, 5.2, 1.65]], tint(C.woodLight, 0.25), { lw: 0.035 });
      lettering(ctx, 'x', 5.55, 5.14, 1.26, 'FREE', 0.36, C.red, 'Bagel Fat One');
      for (const [u, v] of [[5.12, 1.58], [5.95, 1.58]]) face(ctx, [[u - 0.06, 5.19, v - 0.04], [u + 0.06, 5.19, v - 0.04], [u + 0.06, 5.19, v + 0.05], [u - 0.06, 5.19, v + 0.05]], alpha(tint(C.butter, 0.4), 0.9), { stroke: false });
    });
    // A single sock, and dust bunnies drifting in the draft (all day; he
    // doesn't sweep).
    R.thing(8.8, 7.9, (ctx) => {
      face(ctx, [[8.4, 7.6, 0.02], [8.9, 7.7, 0.02], [8.95, 7.95, 0.02], [8.7, 8.0, 0.02], [8.6, 7.8, 0.02]], C.white, { lw: 0.025 });
      face(ctx, [[8.4, 7.6, 0.03], [8.55, 7.62, 0.03], [8.52, 7.78, 0.03], [8.4, 7.75, 0.03]], C.red, { stroke: false });
    }, { on: (t) => h(t) >= 5 && h(t) < 15 });
    R.thing(12, 9, (ctx, t) => {
      if (!Q.detail) return;
      for (let i = 0; i < 3; i++) {
        const k = ((t * 0.05 + i * 0.37) % 1);
        const x = 3 + k * 8.5, y = 5.8 + i * 0.9 + Math.sin(t * 0.7 + i) * 0.3;
        const [X, Y] = P(x, y, 0.1);
        ctx.beginPath(); ctx.arc(X, Y - Math.abs(Math.sin(t * 3 + i)) * 0.05, 0.1, 0, Math.PI * 2);
        ctx.fillStyle = alpha(C.grey, 0.8); ctx.fill();
      }
    }, { anim: true, depth: 0 });
    // Morning sun through the bay, until the rain comes.
    R.thing(0, 0, (ctx, t) => {
      const k = clamp(Math.min((h(t) - 6.4) / 0.6, (9.7 - h(t)) / 0.5));
      if (k <= 0) return;
      ctx.save(); ctx.globalAlpha *= 0.28 * k;
      face(ctx, [[12.4, 5.2, 0.01], [12.4, 8.2, 0.01], [8.6, 7.4, 0.01], [8.6, 4.4, 0.01]], C.white, { stroke: false });
      ctx.restore();
    }, { anim: true, depth: 0, on: (t) => h(t) > 6.3 && h(t) < 9.8 });
    // The last tenant's robot vacuum, left behind, still on its schedule:
    // across the empty floor, into the FREE box, back, into the box again.
    const vac = route([[7.2, 6.4, 1], [6.3, 5.8, 0.6], [9.8, 7.9], [11.7, 6.1], [8.6, 5.2], [6.3, 5.8, 0.6], [4.2, 7.9], [3.4, 5.9]], { speed: 0.7 });
    R.mover(vac, (ctx, t, p) => {
      const [X, Y] = P(p.x, p.y, 0);
      cylinder(ctx, p.x, p.y, 0, 0.36, 0.14, C.greyLight, { top: shade(C.greyLight, 0.1) });
      if (Q.detail) { ctx.beginPath(); ctx.arc(X, Y - 0.2, 0.06, 0, Math.PI * 2); ctx.fillStyle = Math.sin(t * 6) > 0 ? C.green : C.leaf; ctx.fill(); }
      if (!p.moving && Q.detail) speech(ctx, p.x, p.y, 0.7, 'bonk', { size: 0.3 });
    });
    // A spider on a thread from the ceiling, going up and down all day.
    R.thing(8.2, 7.2, (ctx, t) => {
      const z = 3.0 + Math.sin(t * 0.35) * 0.6;
      const [a, b] = P(8.2, 7.2, 4.4), [X, Y] = P(8.2, 7.2, z);
      ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(X, Y); ctx.strokeStyle = alpha(C.ink, 0.5); ctx.lineWidth = 0.015; ctx.stroke();
      ctx.beginPath(); ctx.arc(X, Y + 0.06, 0.07, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
      if (Q.detail) { ctx.lineWidth = 0.02; ctx.strokeStyle = C.ink; ctx.beginPath(); for (const s of [-1, 1]) for (const d of [0, 0.05]) { ctx.moveTo(X, Y + 0.05 + d); ctx.lineTo(X + s * 0.14, Y + d + (d ? 0.1 : -0.02)); } ctx.stroke(); }
    }, { anim: true });
    // A pigeon that walked in the porch door, pecking at crumbs (until the
    // couch comes up the stairs; then it's out on the rail with its friend).
    R.mover((t) => {
      if (h(t) >= 5 && h(t) < COUCH) {
        const k = (Math.sin(t * 0.18) + 1) / 2;
        return { x: 11.6 - k * 3.4, y: 3.2 + k * 1.6, dir: Math.cos(t * 0.18) > 0 ? 'l' : 'r' };
      }
      return { x: 14.6, y: 1.2, rail: true };
    }, (ctx, t, p) => pigeon(ctx, p.x, p.y, p.rail ? 1.12 : 0, t, { dir: p.dir || 'l', peck: !p.rail, phase: 1 }));
    R.thing(14.7, 3.1, (ctx, t) => pigeon(ctx, 14.62, 2.9, 1.12, t, { dir: 'l', phase: 2 }), { anim: true });

    // ---------- The curb, arriving ----------
    // The couch, still wet: dark and dripping for a couple of hours, a
    // puddle under it.
    R.thing(11.4, 4.2, (ctx) => sofa(ctx, 9.0, 3.0, 2.4, C.purple), { on: (t) => has(COUCH)(t) && !(h(t) >= COUCH && h(t) < COUCH + 2.6) });
    R.thing(11.4, 4.2, (ctx) => sofa(ctx, 9.0, 3.0, 2.4, shade(C.purple, 0.3)), { on: (t) => h(t) >= COUCH && h(t) < COUCH + 2.6 });
    R.thing(10.9, 3.9, (ctx, t) => {
      const k = clamp(1 - (h(t) - COUCH) / 3.2);
      disc(ctx, 10.2, 4.4, 0.006, 0.9 * k + 0.3, alpha(tint(C.sky, 0.3), 0.7), { stroke: false });
    }, { anim: true, on: (t) => h(t) >= COUCH && h(t) < COUCH + 3.2 });
    R.thing(11.6, 4.5, (ctx, t) => {
      const k = clamp(1 - (h(t) - COUCH) / 2.6);
      if (!Q.detail || k <= 0) return;
      ctx.fillStyle = tint(C.sky, 0.2);
      particles(t, Math.round(8 * k), 0.9, (a, r) => {
        const x = 9.1 + r() * 2.2, [X, Y] = P(x, 4.2, 0.45 * (1 - a));
        ctx.beginPath(); ctx.ellipse(X, Y, 0.035, 0.06, 0, 0, Math.PI * 2); ctx.fill();
      }, 7);
    }, { anim: true, on: (t) => h(t) >= COUCH && h(t) < COUCH + 2.6 });
    // The dresser: a drawer missing, a can of Gander Cola on top.
    R.thing(8.3, 3.2, (ctx) => {
      box(ctx, 6.7, 2.2, 0, 1.6, 1.0, 1.35, C.wood, { lw: 0.04, top: C.woodLight });
      for (let i = 0; i < 3; i++) {
        const z = 0.15 + i * 0.4;
        if (i === 1) { face(ctx, [[6.8, 3.2, z], [8.2, 3.2, z], [8.2, 3.2, z + 0.32], [6.8, 3.2, z + 0.32]], C.ink, { lw: 0.025 }); continue; }
        face(ctx, [[6.8, 3.2, z], [8.2, 3.2, z], [8.2, 3.2, z + 0.32], [6.8, 3.2, z + 0.32]], shade(C.wood, 0.08), { lw: 0.025 });
        for (const u of [7.15, 7.85]) { const [X, Y] = P(u, 3.2, z + 0.16); ctx.beginPath(); ctx.arc(X, Y, 0.04, 0, Math.PI * 2); ctx.fillStyle = C.mustard; ctx.fill(); }
      }
      box(ctx, 7.8, 2.5, 1.35, 0.14, 0.14, 0.26, BRAND.can, { flat: true, lw: 0.015 });
      if (Q.detail) lettering(ctx, 'x', 7.87, 2.645, 1.48, 'GC', 0.07, BRAND.ink);
    }, { on: has(DRESSER) });
    // The TV: a big old set on a milk crate, rabbit ears, snow by day and
    // a ballgame (more or less) at night.
    R.thing(12.2, 7.5, (ctx) => {
      box(ctx, 11.35, 6.65, 0, 0.85, 0.8, 0.42, C.teal, { flat: true, lw: 0.03 });
      box(ctx, 11.3, 6.6, 0.42, 0.95, 0.9, 0.85, mix(C.wood, C.brown, 0.4), { lw: 0.04 });
      for (const a of [-0.5, 0.5]) { const [x0, y0] = P(11.78, 7.05, 1.27), [x1, y1] = P(11.78 + a * 0.4, 7.05 - a * 0.4, 1.95); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.035; ctx.stroke(); }
    }, { on: has(TV) });
    R.thing(12.25, 7.55, (ctx, t) => {
      const on = lightsOn(t);
      const q = (u, v) => [11.38 + u * 0.62, 7.505, 0.55 + v * 0.58];
      face(ctx, [q(0, 0), q(1, 0), q(1, 1), q(0, 1)], on ? C.leaf : C.greyLight, { lw: 0.03 });
      if (!Q.detail) return;
      if (on) {
        // A ballgame: the green, a diamond, a little man.
        face(ctx, [q(0.3, 0.2), q(0.5, 0.45), q(0.7, 0.2), q(0.5, 0.05)], C.woodLight, { stroke: false });
        const [X, Y] = P(...q(0.2 + ((t * 0.3) % 0.6), 0.55)); ctx.fillStyle = C.white; ctx.fillRect(X - 0.03, Y - 0.08, 0.06, 0.08);
      } else {
        const f = Math.floor(t * 10);
        for (let i = 0; i < 14; i++) {
          const [X, Y] = P(...q(hash(f, i), hash(i, f)));
          ctx.fillStyle = i % 2 ? C.white : C.grey; ctx.fillRect(X, Y, 0.09, 0.03);
        }
      }
    }, { anim: true, on: has(TV) });
    R.light({ at: [11.8, 7.6, 0.9], r: 1.8, color: C.leaf, k: (t) => (has(TV)(t) && lightsOn(t) ? 0.5 : 0) });
    // The lamp with no shade: a pole, the harp, a bare bulb.
    R.thing(2.6, 6.8, (ctx) => {
      box(ctx, 2.05, 6.25, 0, 0.5, 0.5, 0.08, C.ink, { flat: true, lw: 0.02 });
      box(ctx, 2.27, 6.47, 0.08, 0.06, 0.06, 1.85, C.mustard, { flat: true, lw: 0.02 });
      const [X, Y] = P(2.3, 6.5, 1.95);
      ctx.beginPath(); ctx.moveTo(X - 0.22, Y); ctx.lineTo(X - 0.15, Y - 0.55); ctx.moveTo(X + 0.22, Y); ctx.lineTo(X + 0.15, Y - 0.55); ctx.moveTo(X - 0.15, Y - 0.55); ctx.lineTo(X + 0.15, Y - 0.55);
      ctx.strokeStyle = C.mustard; ctx.lineWidth = 0.04; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(X, Y - 0.35, 0.15, 0.19, 0, 0, Math.PI * 2); paint(ctx, tint(C.butter, 0.4), { lw: 0.03 });
      ctx.fillStyle = C.greyLight; ctx.fillRect(X - 0.07, Y - 0.18, 0.14, 0.16);
    }, { on: has(LAMP) });
    R.light({ at: [2.3, 6.5, 2.3], r: 4.2, color: C.butter, k: (t) => (has(LAMP)(t) && lightsOn(t) ? 0.95 : 0) });
    // A moth that's found the bulb.
    R.thing(2.7, 7.0, (ctx, t) => {
      if (!Q.detail) return;
      const a = t * 4.2, [X, Y] = P(2.3 + Math.cos(a) * 0.35, 6.5 + Math.sin(a) * 0.35, 2.35 + Math.sin(a * 1.7) * 0.15);
      ctx.fillStyle = C.greyLight; ctx.beginPath(); ctx.ellipse(X, Y, 0.07, 0.04, Math.sin(t * 30), 0, Math.PI * 2); ctx.fill();
    }, { anim: true, on: (t) => has(LAMP)(t) && lightsOn(t) });
    // The curb's box of Christmas lights, strung round the back walls for
    // the first night, blinking.
    R.thing(0.05, 9.0, (ctx, t) => {
      const cols = [C.red, C.green, C.mustard, C.sky, C.pink];
      const hang = (a, b, n, off) => {
        ctx.beginPath();
        for (let i = 0; i <= n; i++) { const k = i / n, [X, Y] = P(...a.map((v, j) => v + (b[j] - v) * k)); const sag = Math.sin(((k * 3) % 1) * Math.PI) * 0.18; if (i) ctx.lineTo(X, Y + sag); else ctx.moveTo(X, Y + sag); }
        ctx.strokeStyle = C.green; ctx.lineWidth = 0.025; ctx.stroke();
        for (let i = 1; i < n; i++) {
          const k = i / n, [X, Y] = P(...a.map((v, j) => v + (b[j] - v) * k)), sag = Math.sin(((k * 3) % 1) * Math.PI) * 0.18;
          const lit = (Math.floor(t * 2) + i + off) % 3 !== 0;
          ctx.beginPath(); ctx.arc(X, Y + sag + 0.06, 0.06, 0, Math.PI * 2);
          ctx.fillStyle = lit ? cols[(i + off) % cols.length] : shade(cols[(i + off) % cols.length], 0.5); ctx.fill();
        }
      };
      hang([0, 8.8, 3.9], [0, 0.2, 3.9], 24, 0);
      hang([0.2, 0, 3.9], [12.3, 0, 3.9], 30, 2);
    }, { anim: true, on: night });

    // ---------- The friend who came to help ----------
    // He sits on each thing as it comes in; the couch while it's still wet.
    const pal = folk(64, { style: 'curly', top: C.green, bottom: C.navy, hat: 'beanie' });
    const collector = folk(61);
    R.mover((t) => {
      const x = h(t);
      if (!has(COUCH + 0.15)(t)) return { x: -99, y: -99 };
      return { x: night(t) ? 9.7 : 9.9, y: 3.85 };
    }, (ctx, t, p) => {
      if (p.x < -50) return;
      const x = h(t);
      person(ctx, p.x, p.y, 0.05, { ...pal, pose: 'sit', dir: 'r', arms: [1.0 + Math.sin(t * 0.8) * 0.2, 0.4] }, t);
      if (night(t)) return;
      const line = x < DRESSER ? ['It\'s a little damp.', 'It\'s fine. It\'s fine.'] : x < TV ? ['Nice dresser.', 'Is there a TV?'] : x < LAMP ? ['Is there a lamp?', 'Nice TV.'] : ['Nice lamp.'];
      says(ctx, p.x, p.y, 2.5, t, line, 8, 3.4);
    }, { bias: 2.2 });
    // The new tenant, done carrying, on his couch for his first night.
    R.mover((t) => (night(t) ? { x: 10.7, y: 3.85 } : { x: -99, y: -99 }), (ctx, t, p) => {
      if (p.x < -50) return;
      person(ctx, p.x, p.y, 0.05, { ...collector, pose: 'sit', dir: 'r', arms: [2.5 + Math.sin(t * 1.3) * 0.2, 0.3] }, t);
      says(ctx, p.x, p.y, 2.5, t, ['Merry Christmas!', 'Southie Christmas.', 'All of it. Free.'], 9, 3.4);
    }, { bias: 2.2 });
    R.mover((t) => (night(t) ? { x: 9.7, y: 3.85 } : { x: -99, y: -99 }), (ctx, t, p) => {
      if (p.x < -50) return;
      says(ctx, p.x, p.y, 2.5, t, ['It\'s September.', 'Still a little damp.'], 9, 3.2, 4.5);
    }, { bias: 2.3 });

    // ---------- The goose ----------
    // Behind the curtain all morning (the Courier asks for G. Goose; nobody
    // answers). Once the couch is up, on its arm, next to the new tenant.
    R.goose((t) => (has(COUCH)(t) ? { x: 11.15, y: 3.8, z: 0.9, pose: Math.sin(t * 0.6) > 0.85 ? 'honk' : 'sit', dir: 'l', ahead: 1.6 } : { x: 0.5, y: 6.75, z: 0, pose: 'stand', dir: 'r' }), { bias: 0.9 });

    // ---------- The finds ----------
    // The lamp and the TV count once they're up here (later than one
    // o'clock: the curb gives them up in the afternoon).
    R.find({ id: 'lamp', label: 'A lamp with no shade', at: [2.3, 6.5, 2.2], r: 0.7, when: has(LAMP), note: 'after noon' });
    R.find({ id: 'tv', label: 'A free TV', at: [11.8, 7.05, 0.95], r: 0.8, when: has(TV), note: 'after noon' });
    R.find({ id: 'sign', label: 'A "FREE" sign', at: [5.55, 5.14, 1.25], r: 0.7 });
  },
};
