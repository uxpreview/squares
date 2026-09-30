// The Roof Deck: the Grey One's third floor, the penthouse. A new owner's
// first day: a sectional, a wine fridge, floor-to-ceiling windows, and out
// on the glass balcony a hot tub (yes, on the balcony) and a fire table.
// The planes landing at Logan come in low over Pleasure Bay about once a
// minute: every time, the wine glasses rattle and the conversation stops
// mid-word, then carries on.
import {
  C, Q, box, rect, disc, cylinder, face, paint, person, folk, speech, glow,
  shade, tint, mix, alpha, P, onLeft, onRight, paintText, hash,
} from '../../../engine/art.js';
import { pulse } from '../../../engine/actors.js';
import { ZK } from '../../../engine/iso.js';
import { apartment, lettering, PORCH } from '../kit.js';
import { SIDING, TRIM, ROOM, paperAt } from '../style.js';
import { rainK, nightK } from '../clock.js';
import { planeAt } from '../ambient.js';
import { H, during, track, boards, edison, kitchenL, sagaOn, saga, porchDepth, onPorch, rails, waist, bar } from './grey-2.js';

// ---------- The planes ----------
// Where a plane is on its way in: 'before' (a sentence starts), 'over' (it
// stops, the glasses rattle), 'after' (it carries on), or nothing.
function planeK(t) {
  const p = planeAt(t);
  if (!p || p.s < -75 || p.s >= 105) return null;
  return p.s < -30 ? 'before' : p.s < 60 ? 'over' : 'after';
}
const over = (t) => planeK(t) === 'over';
const rattle = (t) => (over(t) ? Math.sin(t * 70) * 0.035 : 0);
const LINES = [
  ["So we're thinking of...", '...a boat.'],
  ['You barely hear the...', '...planes.'],
  ["It's so peaceful up...", '...here.'],
  ['Cheers to the new...', '...place!'],
  ['Honestly? Worth every...', '...penny.'],
];
const PLANE = 57;
// What the owner is saying now: the start, the dots, the end.
function ownerLine(t) {
  const k = planeK(t);
  if (!k) return null;
  const [a, b] = LINES[Math.floor(t / PLANE) % LINES.length];
  return k === 'before' ? a : k === 'over' ? '. . .' : b;
}

// ---------- The owner ----------
// A robe and a coffee by the west window, the Courier at the door, the hot
// tub filling, the rain; the party from one, out on the balcony from half
// past three, and asleep on the chaise.
const OWNER = track([
  [7.0, 1.6, 7.0, { dir: 'l' }], [7.6, 1.6, 7.0, { dir: 'l' }], [7.7, 7.2, 5.0, { dir: 'l' }], [8.4, 7.2, 5.0, { dir: 'l' }],
  [8.55, 12.0, 1.2], [8.62, 13.0, 1.8, { dir: 'r' }], [9.55, 13.0, 1.8, { dir: 'r', say: 'Can I get in yet?' }],
  [9.62, 12.0, 1.2], [9.8, 9.4, 4.9, { pose: 'sit', dir: 'r', z: 0.05 }], [12.8, 9.4, 4.9, { pose: 'sit', dir: 'r', z: 0.05 }],
  [12.95, 4.5, 3.6, { dir: 'l' }], [15.35, 4.5, 3.6, { dir: 'l' }],
  [15.55, 12.0, 1.2], [15.62, 13.0, 1.9, { dir: 'r' }], [24.2, 13.0, 1.9, { dir: 'r' }],
  [24.3, 12.0, 1.2], [24.45, 9.3, 5.1, { pose: 'sleep', z: 0.75 }], [29, 9.3, 5.1, { pose: 'sleep', z: 0.75 }],
]);
const ROBE = { ...folk(1011, { style: 'short', hair: C.ink }), top: tint(C.sky, 0.45), dress: true, bottom: C.white };
const PARTY = { ...ROBE, top: C.white, bottom: C.sky, dress: false };

// Holding things: a wine glass (it rattles), a coffee cup.
const wine = (ctx, t) => {
  const j = rattle(t);
  ctx.save(); ctx.translate(0.55 + j, -0.08 + Math.abs(j) * 0.5);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.035;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -0.2); ctx.moveTo(-0.08, 0); ctx.lineTo(0.08, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-0.1, -0.42); ctx.quadraticCurveTo(-0.1, -0.18, 0, -0.2); ctx.quadraticCurveTo(0.1, -0.18, 0.1, -0.42); ctx.closePath();
  paint(ctx, alpha(C.white, 0.6), { lw: 0.03 });
  ctx.fillStyle = C.red; ctx.beginPath(); ctx.moveTo(-0.08, -0.3); ctx.quadraticCurveTo(0, -0.18, 0.08, -0.3); ctx.closePath(); ctx.fill();
  ctx.restore();
};
const coffee = (ctx) => { ctx.fillStyle = C.white; ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.fillRect(0.45, -0.3, 0.2, 0.24); ctx.strokeRect(0.45, -0.3, 0.2, 0.24); };
const tick = (ctx, x, y, z) => {
  const [X, Y] = P(x, y, z);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03;
  ctx.beginPath(); ctx.moveTo(X - 0.3, Y - 0.1); ctx.lineTo(X - 0.18, Y - 0.05); ctx.moveTo(X + 0.3, Y - 0.1); ctx.lineTo(X + 0.18, Y - 0.05);
  ctx.moveTo(X - 0.28, Y - 0.28); ctx.lineTo(X - 0.17, Y - 0.2); ctx.moveTo(X + 0.28, Y - 0.28); ctx.lineTo(X + 0.17, Y - 0.2); ctx.stroke();
};

// ---------- The view in the windows ----------
// The day's paper, a little bluer: grey in the rain, pink at sunset, navy at night.
const skyAt = (t) => mix(tint(C.sky, 0.15), paperAt(t), 0.5);
const skyStep = (t) => Math.round(H(t) * 4);

// The golf umbrella: open over the hot tub in the rain, while anyone's in
// it; otherwise furled, leaning on the rail.
const tubbing = during(13.2, 26);
const umbrellaUp = (t) => tubbing(t) && rainK(t) > 0.03;
const TUB = [13.5, 2.9], TUB_R = 0.78;

export default {
  id: 'grey-3',
  name: 'The Roof Deck',
  blurb: 'A hot tub on the balcony and a view of Castle Island. Every minute a plane comes over and everyone stops mid-word.',
  size: [15, 9],
  build(R) {
    apartment(R, { floor: 2, walls: ROOM['grey-3'], floorInk: ROOM['grey-3'].floor, siding: SIDING.grey, trim: TRIM.grey, modern: true });
    boards(R, [2.2, 7.5]);

    // ---------- The windows, floor to ceiling ----------
    // West (the back wall): City Point's roofs and Dorchester Heights' white
    // tower, where the sun goes down. North (the side): the Seaport's towers.
    R.decor((ctx, t) => {
      const sky = skyAt(t), n = nightK(t);
      const roof = mix(C.grey, C.night, n * 0.6), lit = n > 0.3;
      onLeft(ctx, 5.4, 0.1, 3.4, 4.2, C.black, { lw: 0.03 });
      onLeft(ctx, 5.5, 0.2, 3.2, 4.0, sky, { lw: 0.02 });
      for (const [y, w, hh] of [[5.5, 0.8, 1.1], [6.3, 0.6, 1.4], [6.9, 0.9, 0.9], [7.8, 0.9, 1.25]]) onLeft(ctx, y, 0.2, w, hh, roof, { stroke: false });
      onLeft(ctx, 7.45, 0.2, 0.22, 1.9, tint(C.white, 0.1), { lw: 0.015 });
      face(ctx, [[0, 7.42, 2.1], [0, 7.7, 2.1], [0, 7.56, 2.4]], tint(C.white, 0.1), { lw: 0.015 });
      if (lit && Q.detail) for (const [y, z] of [[5.7, 0.8], [6.5, 1.1], [7.1, 0.5], [8.1, 0.9], [8.3, 0.6]]) onLeft(ctx, y, z, 0.12, 0.12, C.butter, { stroke: false });
      onLeft(ctx, 7.08, 0.2, 0.06, 4.0, C.black, { stroke: false });
      onRight(ctx, 7.9, 0.1, 4.4, 4.2, C.black, { lw: 0.03 });
      onRight(ctx, 8.0, 0.2, 4.2, 4.0, sky, { lw: 0.02 });
      const tower = mix(tint(C.sky, 0.1), C.navy, 0.25 + n * 0.5);
      for (const [x, w, hh] of [[8.3, 0.5, 2.4], [8.9, 0.7, 3.2], [9.8, 0.4, 1.8], [10.4, 0.8, 2.8], [11.4, 0.5, 2.1]]) onRight(ctx, x, 0.2, w, hh, tower, { stroke: false });
      if (lit && Q.detail) for (const [x, z] of [[8.5, 1.4], [9.1, 2.3], [9.3, 1.0], [10.6, 2.0], [10.9, 1.2], [11.6, 0.9]]) onRight(ctx, x, z, 0.12, 0.12, C.butter, { stroke: false });
      onRight(ctx, 10.07, 0.2, 0.06, 4.0, C.black, { stroke: false });
    }, { anim: true, step: skyStep });

    // ---------- The kitchen ----------
    kitchenL(R, 2.3, 4.25, { door: C.ink, top: tint(C.greyLight, 0.5) });
    // The wine fridge: glass, bottle ends, a blue light; they clink when a plane's over.
    R.thing(0.95, 5.3, (ctx) => box(ctx, 0, 4.4, 0, 0.92, 0.85, 3.0, C.black, { flat: true, lw: 0.035 }));
    R.thing(0.96, 5.31, (ctx, t) => {
      face(ctx, [[0.93, 4.5, 0.2], [0.93, 5.15, 0.2], [0.93, 5.15, 2.85], [0.93, 4.5, 2.85]], mix(C.navy, C.sky, 0.3), { lw: 0.02 });
      if (!Q.detail) return;
      const j = rattle(t);
      for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) {
        const [X, Y] = P(0.94, 4.62 + c * 0.2, 0.4 + r * 0.42 + (c % 2 ? j : -j));
        ctx.beginPath(); ctx.arc(X, Y, 0.07, 0, Math.PI * 2);
        ctx.fillStyle = (r + c) % 3 ? C.red : C.butter; ctx.fill();
      }
      if (over(t)) tick(ctx, 0.95, 4.82, 3.2);
    }, { anim: true });
    // The island, and what's on it (the party's, after one).
    R.thing(4.0, 4.0, (ctx) => {
      box(ctx, 1.6, 3.0, 0, 2.4, 1.0, 1.3, tint(C.white, 0.3), { flat: true, lw: 0.04, left: C.ink, right: shade(C.ink, 0.1) });
    });
    for (const x of [2.1, 3.0]) R.thing(x + 0.3, 4.7, (ctx) => {
      box(ctx, x - 0.02, 4.4, 0, 0.08, 0.08, 0.95, C.woodLight, { flat: true, stroke: false });
      box(ctx, x - 0.25, 4.15, 0.95, 0.5, 0.5, 0.1, C.woodLight, { flat: true, lw: 0.02 });
    });
    R.thing(4.01, 4.01, (ctx, t) => {
      const j = rattle(t);
      rect(ctx, 2.0, 3.25, 1.0, 0.55, 1.31, C.wood, { lw: 0.025 });
      if (Q.detail) for (const [dx, dy, c] of [[0.2, 0.15, C.butter], [0.5, 0.3, C.mustard], [0.75, 0.15, C.white]]) disc(ctx, 2.0 + dx, 3.25 + dy, 1.36, 0.1, c, { lw: 0.015 });
      for (const [x, y] of [[3.3, 3.3], [3.6, 3.6], [3.8, 3.25]]) {
        const [X, Y] = P(x + j, y, 1.3);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03;
        ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X, Y - 0.2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(X - 0.09, Y - 0.42); ctx.quadraticCurveTo(X - 0.09, Y - 0.2, X, Y - 0.2); ctx.quadraticCurveTo(X + 0.09, Y - 0.2, X + 0.09, Y - 0.42); ctx.closePath();
        paint(ctx, alpha(C.white, 0.6), { lw: 0.025 });
      }
      cylinder(ctx, 2.9, 3.55, 1.3, 0.1, 0.55, C.green, { flat: true });
      if (over(t)) tick(ctx, 3.6, 3.4, 1.9);
    }, { anim: true, on: during(13, 29) });
    const sway = (t) => (over(t) ? Math.sin(t * 6) * 0.12 : 0);
    edison(R, 2.3, 3.5, 1.2, sway);
    edison(R, 3.4, 3.5, 1.2, (t) => sway(t + 0.4));
    edison(R, 6.0, 6.2, 1.0, (t) => sway(t + 0.8));

    // ---------- The living room: the sectional, the table, the rug ----------
    R.rug((ctx) => {
      rect(ctx, 4.6, 4.8, 3.2, 3.0, 0.01, tint(C.lilac, 0.6), { lw: 0.025 });
      rect(ctx, 4.85, 5.05, 2.7, 2.5, 0.012, null, { lw: 0.02, stroke: tint(C.lilac, 0.2) });
    });
    const OAT = mix(C.woodLight, C.white, 0.62);
    R.thing(11.4, 4.2, (ctx) => {
      box(ctx, 8.6, 3.0, 0.12, 2.8, 1.2, 0.6, OAT, { lw: 0.035 });
      box(ctx, 8.6, 3.0, 0.72, 2.8, 0.4, 0.7, shade(OAT, 0.06), { lw: 0.035 });
      box(ctx, 11.1, 3.4, 0.72, 0.3, 0.8, 0.28, shade(OAT, 0.06), { lw: 0.03 });
    });
    R.thing(9.8, 5.6, (ctx) => {
      box(ctx, 8.6, 4.2, 0.12, 1.2, 1.4, 0.6, OAT, { lw: 0.035 });
      box(ctx, 8.6, 4.2, 0.72, 0.4, 1.4, 0.7, shade(OAT, 0.06), { lw: 0.035 });
    });
    // The binoculars, left on the sectional (for the planes, and the harbor).
    R.thing(10.3, 3.9, (ctx) => {
      for (const dy of [-0.12, 0.12]) {
        const [X, Y] = P(10.0, 3.7 + dy, 0.78);
        ctx.save(); ctx.translate(X, Y);
        ctx.beginPath(); ctx.roundRect(-0.2, -0.3, 0.26, 0.3, 0.08); paint(ctx, C.black, { lw: 0.03 });
        ctx.beginPath(); ctx.ellipse(0.02, -0.15, 0.09, 0.12, 0, 0, Math.PI * 2); paint(ctx, tint(C.sky, 0.2), { lw: 0.02 });
        ctx.restore();
      }
      const [X, Y] = P(10.0, 3.7, 0.95); ctx.fillStyle = C.grey; ctx.fillRect(X - 0.25, Y - 0.04, 0.2, 0.06);
    });
    R.find({ id: 'binoculars', label: 'A pair of binoculars', at: [10.0, 3.7, 0.95], r: 0.7 });
    R.thing(6.8, 7.0, (ctx) => {
      box(ctx, 5.2, 5.4, 0, 1.6, 1.6, 0.5, C.ink, { lw: 0.035, top: shade(C.greyLight, 0.2) });
      for (const [x, y] of [[5.6, 5.8], [5.8, 5.7], [6.4, 6.6]]) cylinder(ctx, x, y, 0.5, 0.08, 0.2, C.white, { flat: true });
    }, { on: (t) => H(t) >= 12.2 });
    // Before that it's a flat box and a bag of screws.
    R.thing(6.9, 7.1, (ctx) => {
      box(ctx, 5.0, 5.6, 0, 1.9, 1.4, 0.25, C.woodLight, { flat: true, lw: 0.03 });
      lettering(ctx, 'x', 5.95, 7.01, 0.13, 'SOME ASSEMBLY', 0.1, C.ink);
    }, { on: (t) => H(t) < 12.2 });
    R.thing(6.81, 7.01, (ctx, t) => {
      rect(ctx, 5.6, 6.1, 0.8, 0.5, 0.51, C.woodLight, { lw: 0.02 });
      cylinder(ctx, 6.2, 5.8, 0.5, 0.1, 0.55, C.red, { flat: true });
      if (nightK(t) > 0.2 && Q.detail) glow(ctx, 5.7, 5.75, 0.9, 1.0, C.butter, 0.6 + Math.sin(t * 7) * 0.1);
    }, { anim: true, on: during(13, 29) });

    // The goose, in an empty wine crate, honking at every plane.
    const GX = 4.0, GY = 8.2;
    R.goose((t) => ({ x: GX, y: GY, z: 0.25, dir: 'r', pose: over(t) ? 'honk' : 'sit' }), { bias: -0.1 });
    R.thing(GX + 0.5, GY + 0.5, (ctx) => {
      const x0 = GX - 0.5, y0 = GY - 0.5, s = 1.0, hh = 0.55;
      face(ctx, [[x0 + s, y0, 0], [x0 + s, y0 + s, 0], [x0 + s, y0 + s, hh], [x0 + s, y0, hh]], C.wood, { lw: 0.035 });
      face(ctx, [[x0, y0 + s, 0], [x0 + s, y0 + s, 0], [x0 + s, y0 + s, hh], [x0, y0 + s, hh]], shade(C.wood, 0.15), { lw: 0.035 });
      if (Q.detail) for (const z of [0.18, 0.36]) {
        face(ctx, [[x0, y0 + s, z], [x0 + s, y0 + s, z]], null, { lw: 0.02, stroke: C.brown });
        face(ctx, [[x0 + s, y0, z], [x0 + s, y0 + s, z]], null, { lw: 0.02, stroke: C.brown });
      }
      lettering(ctx, 'x', x0 + s / 2, y0 + s + 0.01, 0.28, 'RED', 0.16, C.brown);
    }, { depth: GX + GY + 0.3 });

    // A robot vacuum, bumping round the rug all day.
    R.mover((t) => {
      const a = t * 0.3;
      return { x: 7.3 + Math.cos(a) * 1.9, y: 8.0 + Math.sin(a) * 0.6, a };
    }, (ctx, t, p) => {
      cylinder(ctx, p.x, p.y, 0, 0.32, 0.14, C.black, { flat: true });
      const [X, Y] = P(p.x, p.y, 0.15);
      ctx.fillStyle = pulse(t, 1.2) < 0.5 ? C.tealLight : C.teal; ctx.beginPath(); ctx.arc(X, Y, 0.06, 0, Math.PI * 2); ctx.fill();
    });

    // ---------- The people inside ----------
    const courier = R.walkers.find((w) => w.id === 'courier');
    const courierHere = (t) => { if (!courier) return false; const c = courier.at(t); return R.contains(c.x, c.y, c.z || 0) && !c.moving; };
    R.mover((t) => OWNER(H(t)), (ctx, t, p) => {
      const h = H(t);
      if (h >= 15.5 && h < 24.3 && p.x > 12.2) return; // out on the balcony: drawn out there
      const z = p.z || 0;
      const look = h < 12.8 ? ROBE : PARTY;
      const hold = p.pose === 'sleep' ? undefined : h < 12.8 ? coffee : wine;
      person(ctx, p.x, p.y, z, { ...look, pose: p.pose, dir: p.dir, back: p.back, hold, arms: hold && p.pose !== 'sit' ? [1.2, 0.15] : undefined }, t);
      let say = p.say;
      if (courierHere(t) && h < 9) say = 'No geese here.';
      const sg = saga(t);
      if (sg && sg.stop === 2 && sg.movers && h > 13.6) { const e = (h - sg.since) * 16.875; if (e % 9 > 6 && e % 9 < 8.8) say = 'Not my bike.'; }
      if (!say && ((h >= 12.95 && h < 15.35) || p.pose === 'sit')) say = ownerLine(t);
      if (say && Q.detail) speech(ctx, p.x, p.y, z + 2.6, say, { size: 0.42 });
    }, { on: during(7, 29), depth: (t) => { const p = OWNER(H(t)); return p.pose === 'sleep' || p.pose === 'sit' ? 15.7 : porchDepth(p); } });

    // The party: guests at the island and the wine fridge, two on the sectional.
    const GUESTS = [
      { at: [1.9, 4.95], dir: 'r', look: folk(1021, { dress: true, top: C.coral }), talk: true },
      { at: [1.5, 5.6], dir: 'l', look: folk(1022, { top: C.mustard, dress: false }), pour: true },
      { at: [10.2, 3.75], sit: true, dir: 'l', look: folk(1023, { top: C.teal, dress: false, style: 'bun' }) },
      { at: [11.0, 3.75], sit: true, dir: 'l', look: folk(1024, { top: C.purple, dress: false }) },
    ];
    GUESTS.forEach((g, i) => {
      R.mover(() => ({ x: g.at[0], y: g.at[1] }), (ctx, t, p) => {
        const h = H(t);
        const asleep = h >= 24.5;
        const z = g.sit ? 0.05 : 0;
        if (asleep && !g.sit) return;
        person(ctx, p.x, p.y, g.sit && asleep ? 0.75 : z, { ...g.look, pose: asleep ? 'sleep' : g.sit ? 'sit' : 'stand', dir: g.dir, hold: asleep ? undefined : wine, arms: asleep ? undefined : [1.2, 0.15] }, t);
        let say = null;
        const k = planeK(t);
        if (k === 'over' && (g.talk || i === 3)) say = '. . .';
        else if (g.talk && k === 'after') say = 'Wait, what?';
        else if (g.pour && t % 19 < 3 && !k) say = 'Red or red?';
        else if (i === 2 && t % 23 < 3 && !k) say = 'Is that Castle Island?';
        if (say && Q.detail) speech(ctx, p.x, p.y, z + 2.6, say, { size: 0.4 });
      }, { on: during(13, 29), bias: g.sit ? 2 : 0 });
    });
    // The caterer, doing laps with tiny food.
    R.mover((t) => {
      const k = pulse(t, 18), pts = [[7.8, 6.0], [10.6, 6.3], [11.4, 7.8], [8.0, 8.3], [7.8, 6.0]];
      const f = k * 4, i = Math.floor(f), e = f - i, a = pts[i], b = pts[i + 1];
      return { x: a[0] + (b[0] - a[0]) * e, y: a[1] + (b[1] - a[1]) * e, dir: (b[0] - a[0]) - (b[1] - a[1]) >= 0 ? 'r' : 'l' };
    }, (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, { ...folk(1031, { top: C.black, bottom: C.black, dress: false }), pose: 'walk', dir: p.dir, arms: [2.2, 0.15], hold: (c) => { c.fillStyle = C.greyLight; c.strokeStyle = C.ink; c.lineWidth = 0.03; c.beginPath(); c.ellipse(0.3, -0.85, 0.35, 0.08, 0, 0, Math.PI * 2); c.fill(); c.stroke(); c.fillStyle = C.coral; c.fillRect(0.12, -0.97, 0.08, 0.08); c.fillRect(0.36, -0.98, 0.08, 0.08); } }, t);
      if (Q.detail && over(t)) speech(ctx, p.x, p.y, 2.6, '. . .', { size: 0.4 });
    }, { on: during(13, 20) });

    // The morning: two delivery guys building the coffee table (step one of
    // many), and a wine person stocking the fridge before the party.
    R.mover(() => ({ x: 7.9, y: 6.9 }), (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, { ...folk(1071, { top: C.coral, hat: 'cap', dress: false }), pose: 'sit', dir: 'l', arms: [1.3 + Math.sin(t * 6) * 0.3, 0.6] }, t);
      for (const [x, y] of [[6.9, 7.3], [7.2, 7.8]]) box(ctx, x, y, 0, 0.9, 0.12, 0.05, C.woodLight, { flat: true, lw: 0.02 });
      if (Q.detail) for (let i = 0; i < 4; i++) { const [X, Y] = P(7.3 + i * 0.12, 7.0 + (i % 2) * 0.15, 0.02); ctx.fillStyle = C.grey; ctx.fillRect(X, Y, 0.06, 0.03); }
    }, { on: during(8, 12.2) });
    R.mover(() => ({ x: 9.5, y: 6.4 }), (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, { ...folk(1072, { top: C.coral, hat: 'cap', dress: false }), dir: 'l', arms: [1.4, 1.4], hold: (c) => { c.fillStyle = C.white; c.strokeStyle = C.ink; c.lineWidth = 0.03; c.fillRect(0.2, -0.45, 0.7, 0.5); c.strokeRect(0.2, -0.45, 0.7, 0.5); c.fillStyle = C.ink; c.fillRect(0.3, -0.35, 0.3, 0.2); } }, t);
      if (Q.detail && t % 15 < 3.5) speech(ctx, p.x, p.y, 2.7, 'Step 1 of 94.', { size: 0.42 });
    }, { on: during(8, 12.2) });
    R.mover(() => ({ x: 1.6, y: 4.95 }), (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, { ...folk(1081, { top: C.purple, style: 'long', dress: false }), dir: 'l', arms: [1.6 + Math.sin(t * 2) * 0.3, 0.2] }, t);
      if (Q.detail && t % 17 < 3.5) speech(ctx, p.x, p.y, 2.7, 'Organizing them by vibe.', { size: 0.42 });
    }, { on: during(10.2, 12.9) });

    // The bike, up here by mistake for a while.
    sagaOn(R, 2);

    // ---------- The balcony ----------
    // The hot tub: cedar sides, the water (rougher when a plane's over), steam at dusk.
    onPorch(R, TUB[0], TUB[1], (ctx, t) => {
      cylinder(ctx, TUB[0], TUB[1], 0, TUB_R, 0.85, C.wood, { top: mix(C.water, C.tealLight, 0.3) });
      if (!Q.detail) return;
      const rough = over(t) ? 3 : 1;
      ctx.strokeStyle = alpha(C.white, 0.75); ctx.lineWidth = 0.03;
      for (let i = 0; i < 3; i++) {
        const [X, Y] = P(TUB[0] + Math.sin(t * rough + i * 2) * 0.25, TUB[1] + Math.cos(t * 0.7 * rough + i) * 0.25, 0.86);
        ctx.beginPath(); ctx.ellipse(X, Y, 0.18 + i * 0.06, 0.05, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }, { anim: true });
    // Two in the tub from one o'clock (in the rain, under the golf umbrella).
    const TUBBERS = [
      { at: [13.15, 2.6], dir: 'r', look: folk(1041, { top: C.pink, dress: false, style: 'long' }) },
      { at: [13.85, 3.25], dir: 'l', look: folk(1042, { dress: false, style: 'bald', top: tint(C.coral, 0.2) }) },
    ];
    TUBBERS.forEach((g, i) => onPorch(R, g.at[0], g.at[1], (ctx, t) => {
      const up = i === 0 && umbrellaUp(t);
      waist(ctx, g.at[0], g.at[1], 0.84, () => person(ctx, g.at[0], g.at[1], -0.5, { ...g.look, pose: 'stand', dir: g.dir, arms: up ? [2.8, 0.2] : [1.2, 0.2], hold: up ? undefined : wine }, t));
      const k = planeK(t);
      if (Q.detail && k === 'over' && i === 1) speech(ctx, g.at[0], g.at[1], 2.2, '. . .', { size: 0.4 });
      else if (Q.detail && i === 1 && !k && t % 17 < 3) speech(ctx, g.at[0], g.at[1], 2.2, H(t) < 15.4 ? "It's fine, we're already wet." : 'Is it always this loud?', { size: 0.38, dx: -1.2 });
    }, { anim: true, on: tubbing }));
    // Steam off the water in the evening.
    onPorch(R, TUB[0] + 0.1, TUB[1] + 0.1, (ctx, t) => {
      if (!Q.detail) return;
      ctx.fillStyle = alpha(C.white, 0.35);
      for (let i = 0; i < 6; i++) {
        const k = ((t * 0.25 + i / 6) % 1);
        const [X, Y] = P(TUB[0] + (hash(i, 3) - 0.5) * 1.1, TUB[1] + (hash(i, 7) - 0.5) * 1.1, 0.9 + k * 1.6);
        ctx.beginPath(); ctx.arc(X + Math.sin(t + i) * 0.1, Y, 0.12 + k * 0.2, 0, Math.PI * 2);
        ctx.globalAlpha = 0.6 * (1 - k); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }, { anim: true, on: during(17, 27) });
    // The golf umbrella.
    onPorch(R, 13.4, 4.1, (ctx, t) => {
      if (umbrellaUp(t)) {
        const c = [TUB[0] - 0.2, TUB[1] - 0.1], z = 2.3, n = 8, r = 1.05;
        bar(ctx, [c[0], c[1], 0.9], [c[0], c[1], z + 0.4], C.ink, 0.05);
        const [ax, ay] = P(c[0], c[1], z + 0.55);
        for (let i = 0; i < n; i++) {
          const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
          const [x0, y0] = P(c[0] + Math.cos(a0) * r, c[1] + Math.sin(a0) * r, z);
          const [x1, y1] = P(c[0] + Math.cos(a1) * r, c[1] + Math.sin(a1) * r, z);
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(x0, y0); ctx.lineTo(x1, y1); ctx.closePath();
          paint(ctx, i % 2 ? C.red : C.white, { lw: 0.035 });
        }
      } else {
        // Furled, leaning on the rail: the canopy wrapped round the shaft, the hook up top.
        const a = [13.25, 4.12, 0.02], b = [13.62, 4.12, 1.55];
        const L = (k) => [a[0] + (b[0] - a[0]) * k, a[1], a[2] + (b[2] - a[2]) * k];
        bar(ctx, a, b, C.ink, 0.05);
        const pts = [L(0.12), L(0.45), L(0.78)].map((q) => P(...q));
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0] - 0.2, pts[1][1]); ctx.lineTo(pts[2][0], pts[2][1]); ctx.lineTo(pts[1][0] + 0.2, pts[1][1]); ctx.closePath();
        paint(ctx, C.red, { lw: 0.035 });
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0] - 0.07, pts[1][1]); ctx.lineTo(pts[2][0], pts[2][1]); ctx.lineTo(pts[1][0] + 0.07, pts[1][1]); ctx.closePath();
        paint(ctx, C.white, { stroke: false });
        const [HX, HY] = P(...b);
        ctx.beginPath(); ctx.arc(HX + 0.12, HY, 0.12, Math.PI, 0.1); ctx.strokeStyle = C.black; ctx.lineWidth = 0.08; ctx.stroke();
      }
    }, { anim: true });
    R.find({ id: 'umbrella', label: 'A golf umbrella', at: (t) => (umbrellaUp(t) ? [13.3, 2.8, 2.5] : [13.42, 4.12, 0.8]), r: 0.9, out: true });

    // The fire table, lit once the rain's done.
    onPorch(R, 13.85, 0.85, (ctx) => {
      box(ctx, 13.5, 0.5, 0, 0.7, 0.7, 0.62, shade(C.greyLight, 0.25), { lw: 0.035, dots: C.grey });
      box(ctx, 13.6, 0.6, 0.62, 0.5, 0.5, 0.08, alpha(tint(C.sky, 0.4), 0.5), { flat: true, lw: 0.02 });
    });
    onPorch(R, 13.86, 0.86, (ctx, t) => {
      for (let i = 0; i < 3; i++) {
        const [X, Y] = P(13.72 + i * 0.13, 0.85 - i * 0.05, 0.66);
        const hh = 0.28 + Math.sin(t * 9 + i * 2) * 0.08;
        ctx.beginPath(); ctx.moveTo(X - 0.07, Y); ctx.quadraticCurveTo(X - 0.06, Y - hh * 0.6, X, Y - hh); ctx.quadraticCurveTo(X + 0.06, Y - hh * 0.6, X + 0.07, Y); ctx.closePath();
        paint(ctx, i % 2 ? C.butter : C.coral, { lw: 0.02 });
      }
      if (Q.detail) glow(ctx, 13.85, 0.85, 1.0, 1.6, C.coral, 0.4 + nightK(t) * 0.4);
    }, { anim: true, on: during(15.4, 26) });

    // Out there: the owner and a friend with wine, from half past three.
    const BAL = [
      { at: [13.0, 1.9], dir: 'r', owner: true },
      { at: [14.3, 1.75], dir: 'l', look: folk(1051, { top: C.green, dress: false, style: 'curly' }) },
    ];
    BAL.forEach((g) => onPorch(R, g.at[0], g.at[1], (ctx, t) => {
      person(ctx, g.at[0], g.at[1], 0, { ...(g.owner ? PARTY : g.look), dir: g.dir, hold: wine, arms: [1.2, over(t) && !g.owner ? 2.9 : 0.15] }, t);
      const say = g.owner ? ownerLine(t) : planeK(t) === 'over' ? '. . .' : null;
      if (say && Q.detail) speech(ctx, g.at[0], g.at[1], 2.6, say, { size: 0.42, dx: g.owner ? -0.6 : 0.6 });
    }, { anim: true, on: during(15.62, 24.2) }));
    // The morning: the installer filling the tub with a hose (then it rains).
    onPorch(R, 14.25, 3.95, (ctx, t) => {
      person(ctx, 14.25, 3.95, 0, { ...folk(1061, { top: C.teal, hat: 'cap', dress: false }), dir: 'l', arms: [1.4, 0.3] }, t);
      if (!Q.detail) return;
      ctx.fillStyle = alpha(C.sky, 0.9);
      for (let i = 0; i < 8; i++) {
        const k = (t * 1.5 + i / 8) % 1;
        const [X, Y] = P(14.0 - k * 0.5, 3.7 - k * 0.8, 1.2 + Math.sin(k * Math.PI) * 0.4 - k * 0.4);
        ctx.beginPath(); ctx.arc(X, Y, 0.05, 0, Math.PI * 2); ctx.fill();
      }
      if (t % 14 < 3) speech(ctx, 14.25, 3.95, 2.6, 'Warm by five. Ish.', { size: 0.4 });
    }, { anim: true, on: during(7.6, 9.6) });
    // A wine glass someone left on the railing (it rattles with the rest).
    onPorch(R, 14.62, 1.6, (ctx, t) => {
      const j = rattle(t), rx = PORCH.x1 - 0.14;
      const [X, Y] = P(rx, 1.6 + j, 1.12);
      ctx.save(); ctx.translate(X, Y);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.04;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -0.26); ctx.moveTo(-0.11, 0); ctx.lineTo(0.11, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-0.15, -0.6); ctx.quadraticCurveTo(-0.15, -0.24, 0, -0.26); ctx.quadraticCurveTo(0.15, -0.24, 0.15, -0.6); ctx.closePath();
      paint(ctx, alpha(C.white, 0.7), { lw: 0.035 });
      ctx.fillStyle = C.red; ctx.beginPath(); ctx.moveTo(-0.13, -0.42); ctx.quadraticCurveTo(0, -0.25, 0.13, -0.42); ctx.closePath(); ctx.fill();
      ctx.restore();
      if (over(t) && Q.detail) tick(ctx, rx, 1.6, 1.75);
    }, { anim: true, depth: 19.95 });
    R.find({ id: 'glass', label: 'A wine glass on the railing', at: [PORCH.x1 - 0.14, 1.6, 1.4], r: 0.85, out: true });

    // String lights between the posts, lit at dusk.
    onPorch(R, 14.6, 2.2, (ctx, t) => {
      const rx = PORCH.x1 - 0.14, n = 11, on = nightK(t) > 0.15;
      const pts = [];
      for (let i = 0; i <= n; i++) { const k = i / n; pts.push([rx - 0.05, 0.15 + k * 4.05, 3.75 - Math.sin(k * Math.PI) * 0.5]); }
      ctx.beginPath(); pts.forEach((q, i) => { const [X, Y] = P(...q); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
      for (let i = 1; i < n; i++) {
        const [X, Y] = P(pts[i][0], pts[i][1], pts[i][2] - 0.12);
        ctx.beginPath(); ctx.arc(X, Y, 0.07, 0, Math.PI * 2); paint(ctx, on ? C.butter : tint(C.butter, 0.6), { lw: 0.02 });
        if (on && Q.detail && i % 2) glow(ctx, pts[i][0], pts[i][1], pts[i][2] - 0.12, 0.7, C.butter, nightK(t) * 0.8);
      }
    }, { anim: true, depth: 19.19 });
    // Rain on the balcony (the roof keeps it off everywhere else).
    onPorch(R, 14.7, 4.3, (ctx, t) => {
      const r = rainK(t);
      if (r < 0.02 || !Q.detail) return;
      ctx.strokeStyle = alpha(C.navy, 0.35); ctx.lineWidth = 0.03;
      ctx.beginPath();
      const n = Math.round(22 * r);
      for (let i = 0; i < n; i++) {
        const x = 12.7 + hash(i, 1) * 2.0, y = 0.1 + hash(i, 2) * 4.2, z = 4.6 - ((t * 9 + hash(i, 3) * 4.6) % 4.6);
        const [X, Y] = P(x, y, z);
        ctx.moveTo(X, Y); ctx.lineTo(X - 0.04, Y + 0.3);
      }
      ctx.stroke();
    }, { anim: true, depth: 19.97, on: (t) => rainK(t) > 0.02 });
    rails(R);
  },
};
