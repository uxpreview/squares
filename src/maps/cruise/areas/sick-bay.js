// The Sick Bay: the ship's medical centre at the bow end of the crew deck,
// tapering to the point. Dr. Swabb's desk (he's on the day's clock, at (16, 6)
// most of the day), four beds along the cut side that fill up through the
// morning, a quarantine booth with a porthole in its door, a queue from the
// desk back out through the door that grows every hour (Doreen saved her place
// with a towel at 7am and turns up at 3pm), the little pharmacy at the point,
// and the sign: DAYS WITHOUT AN OUTBREAK: 0.
// The running gag: every couple of hours a crewman climbs his stool and turns
// the 0 into a 1. If Dr. Swabb is at his desk he says "Zero." and the crewman
// turns it back. While the doctor's up at the buffet (11:30 to 4) it climbs
// to 3, and Swabb changes it back on his way in.
// Keep the id: it's in links and saves.
import {
  C, Q, box, rect, disc, cylinder, face, poly, paint, person, folk, tiles, speech, chair, onLeft, paintText,
  alpha, shade, tint, mix, SKIN, HAIR,
} from '../../../engine/art.js';
import { route, particles, pulse, clamp } from '../../../engine/actors.js';
import { ZK } from '../../../engine/iso.js';
import { deck, outline } from '../ship.js';
import { AT } from '../plan.js';
import { INK, MAT, at, wrap, green, queasy } from '../style.js';
import { P, lettering, board, porthole, bucket, cocktail, CREW_LOOK, onY, onX, onBow, farY, words, inked } from '../kit.js';

// ---------- Little drawing helpers (in this area's own units) ----------


// A face at k green, in tenths (so the colour mixes stay few).
const qz = (skin, k) => queasy(skin, Math.round(k * 10) / 10);

// A comic noise, bold and wobbly, rising a little over life k (0..1).
function noise(ctx, x, y, z, text, k, size = 0.4, color = C.ink) {
  if (!Q.detail) return;
  const [X, Y] = P(x, y, z + k * 0.5);
  ctx.save();
  ctx.globalAlpha = clamp(Math.min(k * 5, (1 - k) * 3));
  ctx.translate(X, Y);
  ctx.rotate(Math.sin(k * 20) * 0.06);
  ctx.scale(1 / 40, 1 / 40);
  ctx.font = `${size * 40}px "Bagel Fat One", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 0.1 * 40;
  ctx.strokeStyle = C.white;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
// Where someone's hand is, in screen units, for an arm at angle a (the arm
// nearest us; f is 1 facing right, -1 facing left).
const handAt = (X, Y, f, a, z = 0) => [X + f * (0.22 + Math.sin(a) * 0.72), Y - 1.53 + Math.cos(a) * 0.72 - z * ZK];

// Someone walking a path of points from t0, at a steady pace, then standing
// at the last one. Returns (tt) => { x, y, dir, back, moving, phase } or null
// before they've arrived.
function walkIn(pts, t0, speed = 1.6) {
  const lens = [];
  for (let i = 1; i < pts.length; i++) lens.push(Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = lens.reduce((a, b) => a + b, 0);
  const dur = total / speed;
  return (tt) => {
    if (tt < t0) return null;
    let d = (tt - t0) * speed;
    if (d >= total) return { x: pts[pts.length - 1][0], y: pts[pts.length - 1][1], moving: false, done: true, since: tt - t0 - dur };
    for (let j = 0; j < lens.length; j++) {
      if (d <= lens[j] || j === lens.length - 1) {
        const [ax, ay] = pts[j], [bx, by] = pts[j + 1];
        const k = clamp(d / lens[j]);
        const dX = (bx - ax) - (by - ay), dY = (bx - ax) + (by - ay);
        return { x: ax + (bx - ax) * k, y: ay + (by - ay) * k, dir: dX >= 0 ? 'r' : 'l', back: dY < -0.01, moving: true, phase: tt * 9 };
      }
      d -= lens[j];
    }
    return null;
  };
}

// A hot-water bottle shaped like a lizard, lying flat on a blanket: green
// ribbed rubber, four stubby legs, a tail, painted eyes and a white stopper
// in its neck. k: how squashed (a tap).
function hotWaterLizard(ctx, x, y, z, k) {
  const [X, Y] = P(x, y, z);
  const skin = INK.queasyGreen, dark = shade(INK.queasyGreen, 0.35);
  ctx.save();
  ctx.translate(X, Y);
  ctx.transform(1, 0.5, -1, 0.5, 0, 0); // flat on the bed: u along x, v along y
  ctx.scale(0.8 * (1 + k * 0.12), 0.8 * (1 - k * 0.1));
  ctx.lineCap = 'round';
  // The legs and the tail, under the body.
  for (const [a, b, c, d] of [[0.2, -0.18, 0.32, -0.36], [0.2, 0.18, 0.32, 0.36], [-0.25, -0.18, -0.36, -0.36], [-0.25, 0.18, -0.36, 0.36]]) {
    ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d);
    if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.15; ctx.stroke(); }
    ctx.strokeStyle = skin; ctx.lineWidth = 0.1; ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(-0.4, 0); ctx.quadraticCurveTo(-0.7, 0.05, -0.75, 0.25); ctx.quadraticCurveTo(-0.78, 0.38, -0.66, 0.36);
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.13; ctx.stroke(); }
  ctx.strokeStyle = skin; ctx.lineWidth = 0.08; ctx.stroke();
  // The body, a fat rubber bag, ribbed.
  ctx.beginPath(); ctx.ellipse(-0.04, 0, 0.42, 0.24, 0, 0, Math.PI * 2);
  paint(ctx, skin, { lw: 0.03, dots: dark, density: 0.12 });
  if (Q.detail) {
    ctx.strokeStyle = dark; ctx.lineWidth = 0.02;
    for (let i = -3; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 0.1, -0.17); ctx.lineTo(i * 0.1, 0.17); ctx.stroke(); }
  }
  // The head, and its painted eyes.
  ctx.beginPath(); ctx.ellipse(0.48, 0, 0.16, 0.13, 0, 0, Math.PI * 2);
  paint(ctx, skin, { lw: 0.03 });
  for (const v of [-0.07, 0.07]) {
    ctx.beginPath(); ctx.arc(0.52, v, 0.04, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.012 });
    ctx.beginPath(); ctx.arc(0.53, v, 0.018, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
  }
  ctx.restore();
  // The stopper, standing up out of its neck.
  const [sx, sy] = P(x + 0.26, y, z + 0.05);
  ctx.beginPath(); ctx.roundRect(sx - 0.06, sy - 0.16, 0.12, 0.16, 0.03); paint(ctx, C.white, { lw: 0.015 });
}

// ---------- The cast who stay here ----------

// Where people come in: the door from the Crew Bar, in the wall at x 0.
const DOOR = [0.3, 3.2];
// The queue, from the front (by the doctor) back out through the door.
// Slot 3 is Doreen's: she saved it with a towel at 7am and turns up at 3pm
// (she's on the day's clock at (11.5, 6.5)).
const SLOTS = [
  [14.6, 6.6], [13.55, 6.6], [12.5, 6.6], [11.5, 6.5], [10.45, 6.6], [9.4, 6.6], [8.35, 6.6],
  [7.3, 6.6], [6.25, 6.6], [5.2, 6.5], [4.15, 6.6],
  // Back to the door, zigzagging (in a straight line they'd stand in a column
  // on screen, each one hidden behind the next).
  [3.65, 5.55], [2.25, 5.4], [2.05, 4.05],
];
// Who joins the line, and when (hours). Nobody green before half past nine:
// the first two are here for other reasons.
const LOBSTER = mix(SKIN[0], C.coral, 0.55);
const JACKET = C.coral;
const QUEUE = [
  { slot: 0, h: 7, seed: 201, look: { skin: LOBSTER, style: 'bald', top: C.white, bottom: C.teal, dress: false }, prop: 'sunburn', says: ["I think it's the sun.", 'Aloe? Anyone?'] },
  { slot: 1, h: 8, seed: 202, look: { top: C.sky, bottom: C.navy, dress: false, style: 'short' }, prop: 'can', says: ['It was a dare.', 'Take a gander, they said.'] },
  { slot: 2, h: 9.6, seed: 203, sick: 9.5, look: { top: INK.flamingo, bottom: C.white, style: 'curly', dress: false }, prop: 'bucket' },
  { slot: 4, h: 10.2, seed: 204, sick: 10, look: { top: C.mustard, bottom: C.navy, style: 'short', dress: false }, prop: 'belly' },
  { slot: 5, h: 11, seed: 205, sick: 10.6, look: { top: C.purple, bottom: C.ink, style: 'long', dress: false }, prop: 'bucket' },
  { slot: 6, h: 12, seed: 206, sick: 11.4, look: { top: C.white, bottom: C.navy, style: 'short', dress: false, wear: jacket }, prop: 'belly', says: ['Is this the drill?'] },
  { slot: 7, h: 13, seed: 207, sick: 12, look: { top: C.teal, bottom: C.white, style: 'bun', dress: false }, prop: 'plate', says: ['Just the shrimp.'] },
  { slot: 8, h: 14, seed: 208, sick: 12.4, look: { top: C.white, bottom: C.white, style: 'bald', dress: false }, prop: 'bucket' },
  { slot: 9, h: 15.4, seed: 209, sick: 13, look: { top: C.coral, bottom: C.teal, style: 'pony', dress: false }, prop: 'mermaid' },
  { slot: 10, h: 16, seed: 210, sick: 13.6, look: { top: C.sky, bottom: C.brown, style: 'curly', dress: false, scale: 0.72 }, prop: 'belly' },
  { slot: 11, h: 16.7, seed: 211, sick: 13.8, look: { top: C.pink, bottom: C.navy, style: 'long', dress: false }, prop: 'bucket' },
  { slot: 12, h: 17.3, seed: 212, sick: 14, look: { top: C.mustard, bottom: C.teal, style: 'short', dress: false }, prop: 'belly' },
  { slot: 13, h: 18, seed: 213, sick: 13.2, look: { top: C.navy, bottom: C.ink, style: 'bun', dress: false }, prop: 'bucket' },
];

// A life jacket over someone's torso (from the drill upstairs).
function jacket(ctx, b) {
  const h = b.hipY - b.top;
  ctx.beginPath();
  ctx.roundRect(-0.34, b.top - 0.05, 0.68, h - 0.02, 0.14);
  paint(ctx, JACKET, { lw: 0.03, dots: shade(JACKET, 0.4), density: 0.14 });
  if (!Q.detail) return;
  ctx.fillStyle = C.white;
  ctx.fillRect(-0.34, b.top + h * 0.55, 0.68, 0.05);
}

// The beds, along the cut side: bx is each bed's near-left corner (x), and
// when its patient is sent over from the desk (they fill up by noon).
const BEDS = [
  { bx: 3.0, h: 9.6, seed: 221, blanket: C.sky, eyes: 'shut', tray: 'pudding' },
  { bx: 6.2, h: 10.3, seed: 222, blanket: C.lilac, eyes: 'open', tray: 'spoon', balloon: true },
  { bx: 9.4, h: 11.0, seed: 223, blanket: C.sky, eyes: 'therm', tray: 'juice' },
  { bx: 12.6, h: 11.8, seed: 224, blanket: C.lilac, eyes: 'shut', tray: 'find' },
];
const BED_Y = 12, BED_TOP = 0.7;
// From the doctor to a bed (or a chair between the beds).
const FROM_DESK = [14.4, 7.6];
// Extras on chairs between the beds, by 4pm.
const CHAIRS = [
  { x: 5.25, h: 15.6, seed: 231, top: C.teal },
  { x: 8.45, h: 16.0, seed: 232, top: INK.sunYellow },
  { x: 11.65, h: 16.4, seed: 233, top: C.coral },
];

// ---------- The sign, and the crewman who wants it to say 1 ----------
// Every 40 seconds (two hours) he walks to his stool, climbs it and adds one.
// If the doctor's at his desk, Swabb says "Zero." and the crewman puts it back.
const GAG = 40, FIRST = 2;
const STOOL = { x: 10.7, y: 1.35, h: 0.85 };
const MOP_Y = 2.5;
const mopX = (t) => 5.9 + Math.sin(t * 0.7) * 1.1;
// The digit's card on the sign.
const CARD = { x: 10.25, z: 4.3 };

export default {
  id: 'sick-bay',
  name: 'The Sick Bay',
  blurb: "Dr. Swabb says it's fine. The queue goes out the door, and the sign says DAYS WITHOUT AN OUTBREAK: 0.",

  build(R) {
    deck(R, 'sick-bay', 'crew', { grid: false, name: false });
    const pts = outline(R);

    // Dr. Swabb, from the day's clock: where he is (in this area's units), so
    // the gag can hear him. Null when he's not in the sick bay.
    const swabbWalker = (R.walkers || []).find((w) => w.id === 'swabb');
    const [ox, oy, oz] = AT['sick-bay'];
    const swabbAt = (t) => {
      if (!swabbWalker) return null;
      const p = swabbWalker.at(t);
      if (Math.abs((p.z || 0) - oz) > 0.5) return null;
      const x = p.x - ox, y = p.y - oy;
      if (x < 0.2 || x > 32 || y < 0 || y > 16) return null;
      return { x, y };
    };
    const atDesk = (t) => { const p = swabbAt(t); return !!p && Math.hypot(p.x - 16, p.y - 6) < 0.3; };
    // When he walks back in past the sign (about 4pm), sampled once.
    let PASS = null;
    for (let t = at(15.8); t < at(16.4); t += 0.1) {
      const p = swabbAt(t);
      if (p && p.x > 8.6) { PASS = t; break; }
    }
    if (PASS == null) PASS = 184;

    // The sign's number through the day: +1 each time he climbs up, back to 0
    // each time he's told to, and when Swabb walks past it.
    const events = [];
    const CYCLES = [];
    for (let b = FIRST; b < 240; b += GAG) {
      const told = atDesk(b + 11);
      CYCLES.push({ b, told });
      events.push({ t: b + 4.5, up: true });
      if (told) events.push({ t: b + 16, up: false });
    }
    events.push({ t: PASS + 0.4, up: false });
    events.sort((a, b) => a.t - b.t);
    const digit = (tt) => {
      let n = 0, last = -9;
      for (const e of events) {
        if (e.t > tt) break;
        n = e.up ? n + 1 : 0;
        last = e.t;
      }
      return { n, since: tt - last };
    };

    // ---------- The floor ----------
    // Pale mint lino (not the clue's green), in big tiles.
    R.floor((ctx) => {
      ctx.save();
      poly(ctx, pts.map(([x, y]) => [x, y, 0]));
      ctx.clip();
      rect(ctx, 0, 0, R.W, R.D, 0, tint(C.mint, 0.45), { stroke: false });
      tiles(ctx, 1.6, alpha(C.ink, 0.09), 0.025, 0, 0, R.W, R.D);
      // A darker runner down the corridor, where the queue goes.
      rect(ctx, 0, 1.8, 16, 5.8, 0.002, alpha(C.tealLight, 0.18), { stroke: false });
      ctx.restore();
      poly(ctx, pts.map(([x, y]) => [x, y, 0]));
      ctx.lineWidth = 0.06; ctx.strokeStyle = C.ink; ctx.stroke();
    });
    R.rug((ctx) => {
      // The queue's tape, with its arrows and its promise.
      rect(ctx, 3.8, 7.25, 11.4, 0.14, 0.004, INK.sunYellow, { lw: 0.02 });
      if (Q.detail) {
        for (let x = 5; x < 15; x += 2.2) {
          face(ctx, [[x, 7.6, 0.004], [x + 0.5, 7.85, 0.004], [x, 8.1, 0.004]], INK.sunYellow, { lw: 0.02 });
        }
        paintText(ctx, 'floor', 9.2, 8.35, 'QUEUE HERE. AND HERE. AND OUT THE DOOR.', 0.28, alpha(C.ink, 0.55), 'Rethink Sans');
        // Footprint stickers where the queue stands.
        for (const [x, y] of SLOTS.slice(0, 10)) {
          for (const dy of [-0.14, 0.14]) {
            const [X, Y] = P(x - 0.1, y + dy, 0.004);
            ctx.beginPath(); ctx.ellipse(X, Y, 0.1, 0.05, 0, 0, Math.PI * 2);
            ctx.fillStyle = alpha(C.ink, 0.18); ctx.fill();
          }
        }
      }
      // Doreen's towel, saving her place since 7am, and the note on it.
      const [dx, dy] = SLOTS[3];
      rect(ctx, dx - 0.55, dy - 0.45, 1.1, 0.9, 0.01, INK.flamingo, { lw: 0.025, dots: shade(INK.flamingo, 0.3), density: 0.12 });
      rect(ctx, dx - 0.55, dy - 0.45, 1.1, 0.14, 0.012, C.white, { stroke: false });
      rect(ctx, dx - 0.55, dy + 0.31, 1.1, 0.14, 0.012, C.white, { stroke: false });
      rect(ctx, dx - 0.35, dy - 0.2, 0.7, 0.4, 0.015, C.white, { lw: 0.02 });
      if (Q.detail) {
        paintText(ctx, 'floor', dx, dy - 0.06, 'SAVED', 0.14, INK.funnelRed, 'Rethink Sans');
        paintText(ctx, 'floor', dx, dy + 0.08, 'DOREEN', 0.1, C.ink, 'Rethink Sans');
      }
      // A red cross on the floor by the beds.
      const cx = 16.8, cy = 10.6;
      rect(ctx, cx - 0.9, cy - 0.3, 1.8, 0.6, 0.004, INK.funnelRed, { stroke: false });
      rect(ctx, cx - 0.3, cy - 0.9, 0.6, 1.8, 0.004, INK.funnelRed, { stroke: false });
      // Hazard tape round the quarantine booth.
      ctx.save();
      poly(ctx, [[18.5, 7.5, 0.005], [23.0, 7.5, 0.005], [23.0, 12.0, 0.005], [18.5, 12.0, 0.005]]);
      ctx.clip();
      rect(ctx, 18.5, 7.5, 4.5, 4.5, 0.005, INK.sunYellow, { stroke: false });
      if (Q.detail) {
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.14;
        for (let i = -6; i < 12; i++) {
          const [a, b2] = P(18.5 + i * 0.5, 7.5, 0.005), [c, d] = P(18.5 + i * 0.5 + 5, 12.5, 0.005);
          ctx.beginPath(); ctx.moveTo(a, b2); ctx.lineTo(c, d); ctx.stroke();
        }
      }
      ctx.restore();
      rect(ctx, 18.5, 7.5, 4.5, 4.5, 0.006, null, { lw: 0.03 });
      // Mop streaks, still wet.
      rect(ctx, 4.6, 2.1, 3.0, 0.8, 0.003, alpha(C.white, 0.35), { stroke: false });
      // Shadows under the beds and the desk.
      for (const b of BEDS) rect(ctx, b.bx + 0.1, BED_Y + 0.2, 2.0, 3.0, 0.002, alpha(C.ink, 0.1), { stroke: false });
      rect(ctx, 14.5, 2.9, 3.2, 1.3, 0.002, alpha(C.ink, 0.1), { stroke: false });
    });

    // ---------- The bulkhead (the wall at x 0, by the door) ----------
    R.decor((ctx) => {
      // TAKE A NUMBER, by the door.
      onLeft(ctx, 4.5, 1.6, 0.8, 1.0, INK.funnelRed, { lw: 0.04 });
      onLeft(ctx, 4.62, 1.75, 0.56, 0.3, C.white, { lw: 0.02 });
      if (Q.detail) {
        paintText(ctx, 'left', 4.9, 2.4, 'TAKE A', 0.13, C.white, 'Rethink Sans');
        paintText(ctx, 'left', 4.9, 2.25, 'NUMBER', 0.13, C.white, 'Rethink Sans');
      }
      // The NOW SERVING board (its number blinks, below).
      onLeft(ctx, 5.6, 3.5, 2.4, 1.3, C.ink, { lw: 0.05 });
      if (Q.detail) paintText(ctx, 'left', 6.8, 4.55, 'NOW SERVING', 0.2, C.white, 'Rethink Sans');
      // The eye chart: read it from the tape.
      onLeft(ctx, 10.4, 2.2, 1.6, 2.6, C.white, { lw: 0.04 });
      if (Q.detail) {
        const rows = [['GO', 0.46, 4.4], ['BACK', 0.34, 3.95], ['TO YOUR', 0.24, 3.6], ['CABIN', 0.2, 3.3], ['IT WAS PROBABLY', 0.1, 3.02], ['THE SHRIMP', 0.09, 2.84], ['(or the dessert)', 0.06, 2.62]];
        for (const [s, size, z] of rows) paintText(ctx, 'left', 11.2, z, s, size, C.ink, 'Rethink Sans');
        paintText(ctx, 'left', 11.2, 2.4, 'NEXT', 0.07, INK.funnelRed, 'Rethink Sans');
      }
      // WASH YOUR HANDS.
      onLeft(ctx, 13.2, 2.4, 1.9, 2.2, INK.sunYellow, { lw: 0.04, dots: shade(INK.sunYellow, 0.25), density: 0.1 });
      if (Q.detail) {
        paintText(ctx, 'left', 14.15, 4.2, 'WASH', 0.34, C.ink);
        paintText(ctx, 'left', 14.15, 3.75, 'YOUR HANDS', 0.24, C.ink);
        paintText(ctx, 'left', 14.15, 3.2, 'NOT IN THE', 0.12, INK.funnelRed, 'Rethink Sans');
        paintText(ctx, 'left', 14.15, 3.0, 'CHOCOLATE', 0.12, INK.funnelRed, 'Rethink Sans');
        paintText(ctx, 'left', 14.15, 2.8, 'FOUNTAIN', 0.12, INK.funnelRed, 'Rethink Sans');
      }
      // A first-aid box on the wall, open, empty.
      onLeft(ctx, 8.5, 2.3, 0.9, 0.8, C.white, { lw: 0.03 });
      onLeft(ctx, 8.8, 2.55, 0.3, 0.3, INK.funnelRed, { stroke: false });
    });
    // The ticket machine: a tap and it prints you a number (a big one).
    const ticket = R.poke({ id: 'tickets', at: [0.2, 4.9, 2.0], r: 0.7, hold: 1.5, sound: 'tick', say: ['You are number 2,413.', 'Now serving: 3.', 'Please wait. Forever.'] });
    R.decor((ctx) => {
      const k = ticket.k();
      if (k <= 0) return;
      onLeft(ctx, 4.72, 1.62 - k * 0.45, 0.36, 0.45 * k + 0.02, C.white, { lw: 0.015 });
    }, { anim: true });
    // NOW SERVING: 3, blinking, all day. (He is number 4.)
    R.decor((ctx, t) => {
      if (!Q.detail) return;
      const on = pulse(t, 1.4) < 0.7;
      paintText(ctx, 'left', 6.8, 3.95, on ? '003' : '', 0.62, INK.funnelRed);
      const n = 212 + Math.floor(wrap(t) / 12);
      paintText(ctx, 'left', 4.9, 1.88, String(n), 0.14, C.ink, 'Rethink Sans');
    }, { anim: true });

    // ---------- The far wall ----------
    // The ship draws it as standing pieces (it angles in at the bow), so what
    // hangs on it stands just in front of it.
    const FAR = -0.9;
    const DEEP = shade(INK.sea, 0.35); // the sea through the glass, down here
    R.thing(8, 0.2, (ctx) => {
      porthole(ctx, 1.9, 4.4, 0.45, DEEP);
      porthole(ctx, 4.7, 4.4, 0.45, DEEP);
      // The hand sanitizer: empty since Monday.
      box(ctx, 3.1, 0.02, 1.9, 0.5, 0.3, 0.7, C.white, { flat: true });
      onY(ctx, 3.1, 0.32, 2.5, (g) => {
        words(g, 'SANI', 0.25, 0.18, 0.1, MAT.crewBlue, 'center', 900);
        g.beginPath(); g.rect(0.1, 0.3, 0.3, 0.2); paint(g, alpha(MAT.glass, 0.6), { lw: 0.015 });
      });
      onY(ctx, 2.6, 0.02, 1.7, (g) => {
        g.beginPath(); g.rect(0, 0, 1.5, 0.45); paint(g, C.white, { lw: 0.025 });
        words(g, 'EMPTY SINCE MONDAY', 0.75, 0.23, 0.1, INK.funnelRed, 'center', 900);
      });
      // DAYS WITHOUT AN OUTBREAK (the digit's card is its own item, below).
      onY(ctx, 7.0, 0.02, 5.5, (g) => {
        g.beginPath(); g.roundRect(0, 0, 4.6, 2.3, 0.1);
        paint(g, C.white, { lw: 0.06 });
        g.beginPath(); g.rect(0, 0, 4.6, 0.55); paint(g, INK.funnelRed, { lw: 0.06 });
        words(g, 'SAFETY FIRST', 2.3, 0.29, 0.28, C.white, 'center', 900, 'Bagel Fat One');
        words(g, 'DAYS WITHOUT', 1.55, 0.95, 0.3, C.ink, 'center', 900);
        words(g, 'AN OUTBREAK:', 1.55, 1.35, 0.3, C.ink, 'center', 900);
        words(g, 'PREVIOUS RECORD: 0', 1.55, 1.85, 0.16, INK.funnelRed, 'center', 800);
        // The card's frame, and two hooks.
        g.beginPath(); g.rect(2.95, 0.72, 1.4, 1.4); paint(g, shade(C.white, 0.08), { lw: 0.04 });
        g.fillStyle = MAT.brass;
        for (const u of [3.25, 4.05]) { g.beginPath(); g.arc(u, 0.78, 0.05, 0, Math.PI * 2); g.fill(); }
      });
      // The X-ray lightbox: a ribcage, and a shrimp tower where the stomach goes.
      onY(ctx, 12.0, 0.02, 5.3, (g) => {
        g.beginPath(); g.rect(0, 0, 1.9, 1.7); paint(g, C.ink, { lw: 0.04 });
        g.beginPath(); g.rect(0.1, 0.1, 1.7, 1.5); paint(g, shade(MAT.glass, 0.55), { stroke: false });
        if (!Q.detail) return;
        g.strokeStyle = alpha(C.white, 0.85); g.lineWidth = 0.05; g.lineCap = 'round';
        g.beginPath(); g.moveTo(0.95, 0.2); g.lineTo(0.95, 1.4); g.stroke();
        for (let i = 0; i < 5; i++) {
          const v = 0.3 + i * 0.13;
          g.beginPath(); g.moveTo(0.95, v); g.quadraticCurveTo(0.45, v + 0.02, 0.4, v + 0.14); g.stroke();
          g.beginPath(); g.moveTo(0.95, v); g.quadraticCurveTo(1.45, v + 0.02, 1.5, v + 0.14); g.stroke();
        }
        // The shrimp tower, in the belly.
        g.fillStyle = alpha(C.white, 0.9);
        for (let i = 0; i < 3; i++) {
          g.beginPath(); g.arc(0.95, 1.36 - i * 0.1, 0.16 - i * 0.04, Math.PI, 0); g.fill();
        }
        words(g, '?!', 1.55, 1.35, 0.2, INK.sunYellow, 'center', 900);
      });
      // The doctor's diploma.
      onY(ctx, 14.5, 0.02, 5.0, (g) => {
        g.beginPath(); g.rect(0, 0, 1.3, 1.0); paint(g, MAT.brass, { lw: 0.04 });
        g.beginPath(); g.rect(0.08, 0.08, 1.14, 0.84); paint(g, C.white, { lw: 0.02 });
        words(g, 'DIPLOMA', 0.65, 0.25, 0.12, C.ink, 'center', 900);
        words(g, 'DR. SWABB', 0.65, 0.45, 0.1, C.ink, 'center', 800);
        words(g, 'MEDICINE', 0.65, 0.6, 0.08, C.ink, 'center', 700);
        words(g, '(ONLINE)', 0.65, 0.74, 0.08, INK.funnelRed, 'center', 900);
      });
    }, { depth: FAR });
    // On the bow's angled wall: portholes, the symptoms chart, the pharmacy.
    R.thing(24, 4, (ctx) => {
      for (const x of [18.4, 23.2, 28.6]) {
        onBow(ctx, x, 4.4, (g) => {
          g.beginPath(); g.arc(0, 0, 0.58, 0, Math.PI * 2); paint(g, MAT.brass, { lw: 0.04 });
          g.beginPath(); g.arc(0, 0, 0.45, 0, Math.PI * 2); paint(g, DEEP, { lw: 0.03 });
          g.beginPath(); g.arc(-0.14, -0.14, 0.1, 0, Math.PI * 2); g.fillStyle = alpha(C.white, 0.4); g.fill();
        });
      }
      // The symptoms chart.
      onBow(ctx, 19.6, 5.3, (g) => {
        g.beginPath(); g.rect(0, 0, 2.6, 2.1); paint(g, C.white, { lw: 0.04 });
        g.beginPath(); g.rect(0, 0, 2.6, 0.42); paint(g, MAT.crewBlue, { lw: 0.04 });
        words(g, 'HOW ARE YOU FEELING?', 1.3, 0.22, 0.16, C.white, 'center', 900);
        const rows = [['PINK', 'FINE', INK.flamingo], ['RED', 'SUNBURN', C.coral], ['GREY', 'THE CASINO', C.grey], ['BLUE', 'SEE A PLUMBER', C.sky]];
        rows.forEach(([a, b, c], i) => {
          g.beginPath(); g.arc(0.3, 0.68 + i * 0.36, 0.13, 0, Math.PI * 2); paint(g, c, { lw: 0.02 });
          words(g, b, 0.55, 0.68 + i * 0.36, 0.13, C.ink, 'left', 800);
        });
      });
      // The pharmacy's sign over its shelves.
      onBow(ctx, 24.3, 4.9, (g) => {
        g.beginPath(); g.roundRect(0, 0, 3.0, 0.9, 0.1); paint(g, INK.funnelRed, { lw: 0.04 });
        words(g, 'PHARMACY', 1.5, 0.34, 0.3, C.white, 'center', 900, 'Bagel Fat One');
        words(g, 'WE HAVE: GINGER ALE', 1.5, 0.7, 0.13, C.white, 'center', 800);
      });
    }, { depth: FAR });
    // Fish going past the portholes, now and then.
    R.thing(8, 0.25, (ctx, t) => {
      if (!Q.detail) return;
      const fish = (g, u, v, s, c) => {
        g.save(); g.translate(u, v); g.scale(s, 1);
        g.beginPath(); g.ellipse(0, 0, 0.2, 0.1, 0, 0, Math.PI * 2); g.fillStyle = c; g.fill();
        g.beginPath(); g.moveTo(-0.16, 0); g.lineTo(-0.32, -0.1); g.lineTo(-0.32, 0.1); g.closePath(); g.fill();
        g.fillStyle = C.ink; g.beginPath(); g.arc(0.1, -0.02, 0.025, 0, Math.PI * 2); g.fill();
        g.restore();
      };
      const pass = (period, off) => { const k = pulse(t, period, off) * period / 2.4; return k < 1 ? k : -1; };
      // Straight wall.
      [[1.9, 7, 0, INK.sunYellow], [4.7, 9, 3, INK.flamingo]].forEach(([x, per, off, c]) => {
        const k = pass(per, off);
        if (k < 0) return;
        const [X, Y] = P(x, 0.02, 4.4);
        ctx.save(); ctx.translate(X, Y); ctx.transform(1, 0.5, 0, 1, 0, 0);
        ctx.beginPath(); ctx.arc(0, 0, 0.45, 0, Math.PI * 2); ctx.clip();
        fish(ctx, -0.7 + k * 1.4, Math.sin(k * 6) * 0.06, 1, c);
        ctx.restore();
      });
      // The bow.
      [[18.4, 8, 5, C.coral], [23.2, 11, 1, INK.sunYellow], [28.6, 10, 6, C.sky]].forEach(([x, per, off, c]) => {
        const k = pass(per, off);
        if (k < 0) return;
        onBow(ctx, x, 4.4, (g) => {
          g.beginPath(); g.arc(0, 0, 0.45, 0, Math.PI * 2); g.clip();
          fish(g, 0.7 - k * 1.4, Math.sin(k * 6) * 0.06, -1, c);
        });
      });
    }, { anim: true, depth: -0.85 });

    // The digit card: flips when it changes. A tap puts it up one, for a
    // moment, until somebody puts it back.
    const sign = R.poke({ id: 'sign', at: [9.3, 0.3, 4.3], r: 1.3, hold: 1.8, teach: true, sound: 'clunk', say: ['ONE! A new record!', 'Zero. He says zero.', 'Back to zero.'] });
    R.thing(10.4, 0.3, (ctx, t) => {
      const d = digit(wrap(t)), k = sign.k();
      const n = d.n + (k > 0.5 ? 1 : 0);
      const flip = k > 0 && k < 1 ? Math.abs(Math.cos(k * Math.PI)) : d.since < 0.4 ? Math.abs(Math.cos((d.since / 0.4) * Math.PI)) : 1;
      onY(ctx, CARD.x, 0.05, CARD.z, (g) => {
        g.save();
        g.translate(0.6, 0.6); g.scale(1, Math.max(0.05, flip)); g.translate(-0.6, -0.6);
        g.beginPath(); g.rect(0, 0, 1.2, 1.2); paint(g, C.white, { lw: 0.04 });
        words(g, String(n), 0.6, 0.64, 1.0, n ? C.ink : INK.funnelRed, 'center', 400, 'Bagel Fat One');
        g.restore();
      });
    }, { anim: true, depth: -0.8 });

    // ---------- The doctor's corner ----------
    // A filing cabinet: FORMS, MORE FORMS, BUCKETS.
    R.thing(13.0, 1.1, (ctx) => {
      box(ctx, 12.4, 0.25, 0, 1.2, 0.8, 2.3, MAT.steel, { top: tint(MAT.steel, 0.2) });
      onY(ctx, 12.4, 1.05, 2.3, (g) => {
        ['FORMS', 'MORE FORMS', 'BUCKETS'].forEach((s, i) => {
          if (i === 1) return; // (its own item, below: it opens)
          g.beginPath(); g.rect(0.08, 0.1 + i * 0.73, 1.04, 0.63); paint(g, tint(MAT.steel, 0.15), { lw: 0.02 });
          g.beginPath(); g.rect(0.35, 0.22 + i * 0.73, 0.5, 0.14); paint(g, C.white, { lw: 0.015 });
          words(g, s, 0.6, 0.29 + i * 0.73, 0.07, C.ink, 'center', 900);
          g.beginPath(); g.rect(0.4, 0.48 + i * 0.73, 0.4, 0.06); paint(g, MAT.chrome, { lw: 0.012 });
        });
      });
      // A pot plant on top (leaf green, not the clue's).
      cylinder(ctx, 12.8, 0.6, 2.3, 0.18, 0.25, INK.flamingo);
      for (let i = 0; i < 5; i++) {
        const [X, Y] = P(12.8, 0.6, 2.6);
        ctx.beginPath(); ctx.ellipse(X + (i - 2) * 0.1, Y - 0.1, 0.07, 0.24, (i - 2) * 0.35, 0, Math.PI * 2);
        paint(ctx, C.leaf, { lw: 0.015 });
      }
    });
    // MORE FORMS: the lab's results are filed in it, and one didn't go in
    // all the way (a corner with the red stamp sticks out of the top).
    const files = R.poke({ id: 'files', at: [13.0, 1.4, 1.2], r: 0.75, sound: 'clunk' });
    const FD = { x: 12.48, y: 1.05, z0: 0.84, z1: 1.47, w: 1.04 };
    R.thing(13.0, 1.9, (ctx) => {
      const out = 0.04 + files.k() * 0.66;
      const { x, y, z0, z1, w } = FD;
      // The hole it came out of, then the drawer: front, side, the dark inside.
      if (out > 0.06) onY(ctx, x, y + 0.005, z1, (g) => { g.beginPath(); g.rect(0, 0, w, z1 - z0); g.fillStyle = shade(MAT.steelDark, 0.45); g.fill(); });
      box(ctx, x, y, z0, w, out, z1 - z0, tint(MAT.steel, 0.15), { top: shade(MAT.steelDark, 0.45), flat: true, lw: 0.02 });
      // The lab slip: a corner caught in the top when it's shut; standing up
      // in the files when it's open.
      const sy = y + out - 0.25;
      if (out < 0.3) {
        // (Big and plain: white paper, the lab's blue band, a red LAB stamp.)
        onY(ctx, x, y + out + 0.005, z1, (g) => {
          g.save(); g.translate(0.64, 0.03); g.rotate(-0.14);
          g.beginPath(); g.rect(-0.24, -0.4, 0.48, 0.42); paint(g, C.white, { lw: 0.016 });
          g.fillStyle = MAT.crewBlue; g.fillRect(-0.24, -0.4, 0.48, 0.06);
          g.beginPath(); g.arc(0.02, -0.18, 0.11, 0, Math.PI * 2); g.strokeStyle = INK.funnelRed; g.lineWidth = 0.022; g.stroke();
          words(g, 'LAB', 0.02, -0.18, 0.08, INK.funnelRed, 'center', 900);
          g.restore();
        });
      } else {
        // The other files, a row of folders.
        for (let i = 3; i >= 0; i--) onY(ctx, x + 0.06, sy - 0.12 - i * 0.1, z1 + 0.12, (g) => { g.beginPath(); g.rect(0, 0, w - 0.12, 0.12); paint(g, i % 2 ? C.butter : tint(C.butter, 0.3), { lw: 0.012 }); });
        onY(ctx, x + 0.18, sy, z1 + 0.5, (g) => {
          g.save(); g.rotate(-0.06);
          g.beginPath(); g.rect(0, 0, 0.68, 0.5); paint(g, C.white, { lw: 0.015 });
          g.fillStyle = MAT.crewBlue; g.fillRect(0, 0, 0.68, 0.07);
          words(g, 'LAB RESULT', 0.06, 0.14, 0.06, C.ink, 'left', 900);
          words(g, 'SALMONELLA', 0.06, 0.24, 0.07, C.ink, 'left', 900);
          words(g, '(REPTILE)', 0.06, 0.34, 0.055, INK.funnelRed, 'left', 900);
          // The stamp, and a little lizard doodle in pen.
          g.beginPath(); g.arc(0.56, 0.36, 0.08, 0, Math.PI * 2); g.strokeStyle = INK.funnelRed; g.lineWidth = 0.015; g.stroke();
          words(g, 'LAB', 0.56, 0.36, 0.04, INK.funnelRed, 'center', 900);
          g.strokeStyle = C.ink; g.lineWidth = 0.012; g.lineCap = 'round';
          g.beginPath(); g.ellipse(0.22, 0.43, 0.06, 0.02, 0, 0, Math.PI * 2); g.stroke();
          g.beginPath(); g.arc(0.29, 0.425, 0.018, 0, Math.PI * 2); g.stroke();
          g.beginPath(); g.moveTo(0.16, 0.43); g.quadraticCurveTo(0.11, 0.44, 0.1, 0.47); g.stroke();
          g.restore();
        });
      }
      // The drawer's front: its label and handle.
      onY(ctx, x, y + out, z1, (g) => {
        g.beginPath(); g.rect(0.27, 0.12, 0.5, 0.14); paint(g, C.white, { lw: 0.015 });
        words(g, 'MORE FORMS', 0.52, 0.19, 0.07, C.ink, 'center', 900);
        g.beginPath(); g.rect(0.32, 0.38, 0.4, 0.06); paint(g, MAT.chrome, { lw: 0.012 });
      });
    }, { anim: true, depth: 13.0 + 1.9 });
    R.find({
      id: 'lab-slip', label: 'A lab slip', kind: 'poke', inside: files, at: [13.0, 1.5, 1.85], r: 0.8,
      hint: "Results come back from the lab and get filed. One didn't go in all the way.",
    });

    // The desk chair, pushed back (he never sits down).
    R.thing(16.4, 2.2, (ctx) => chair(ctx, 15.9, 1.4, 0, MAT.crewBlue, 'l'), {});
    // The desk.
    R.thing(16.0, 3.5, (ctx) => {
      const D = { x: 14.4, y: 2.8, w: 3.2, d: 1.2, h: 1.1 };
      box(ctx, D.x, D.y, 0, D.w, D.d, D.h, C.white, { top: tint(MAT.steel, 0.55), dens: 0.15 });
      // A drawer front, and a sticker on it.
      onY(ctx, D.x + 0.2, D.y + D.d + 0.01, 0.95, (g) => {
        for (let i = 0; i < 3; i++) { g.beginPath(); g.rect(0, i * 0.3, 0.9, 0.26); paint(g, tint(MAT.steel, 0.4), { lw: 0.015 }); }
        g.beginPath(); g.arc(2.2, 0.45, 0.24, 0, Math.PI * 2); paint(g, INK.sunYellow, { lw: 0.02 });
        words(g, "IT'S", 2.2, 0.39, 0.09, C.ink, 'center', 900);
        words(g, 'FINE', 2.2, 0.51, 0.09, C.ink, 'center', 900);
      });
      const z = D.h;
      // The computer, at the back left.
      box(ctx, 14.75, 2.9, z, 0.3, 0.25, 0.3, C.grey, { flat: true, lw: 0.02 });
      box(ctx, 14.55, 2.85, z + 0.3, 0.8, 0.12, 0.6, C.grey, { flat: true, lw: 0.025 });
      onY(ctx, 14.6, 2.98, z + 0.85, (g) => {
        g.beginPath(); g.rect(0, 0, 0.7, 0.5); paint(g, MAT.crewBlue, { lw: 0.015 });
        words(g, 'SYMPTOM', 0.35, 0.1, 0.06, C.white, 'center', 900);
        words(g, 'CHECKER', 0.35, 0.18, 0.06, C.white, 'center', 900);
        words(g, 'YOU HAVE:', 0.35, 0.3, 0.05, INK.sunYellow, 'center', 800);
        words(g, 'EVERYTHING', 0.35, 0.39, 0.06, INK.sunYellow, 'center', 900);
      });
      // The IN tray (a tower) and the OUT tray (empty).
      box(ctx, 16.9, 2.9, z, 0.55, 0.45, 0.06, INK.teak, { flat: true, lw: 0.02 });
      for (let i = 0; i < 9; i++) box(ctx, 16.95 + (i % 3) * 0.01, 2.93, z + 0.06 + i * 0.05, 0.45, 0.38, 0.05, i % 2 ? C.white : shade(C.white, 0.06), { flat: true, lw: 0.012 });
      box(ctx, 16.2, 2.85, z, 0.55, 0.35, 0.06, INK.teak, { flat: true, lw: 0.02 });
      // His mug and a jar of lollipops.
      cylinder(ctx, 17.42, 3.86, z, 0.12, 0.24, C.white);
      lettering(ctx, 'x', 17.42, 3.98, z + 0.12, 'OKAYEST', 0.05, INK.funnelRed);
      cylinder(ctx, 14.75, 3.7, z, 0.15, 0.3, alpha(MAT.glass, 0.9), { flat: true });
      for (const [dx, c] of [[-0.06, INK.flamingo], [0.05, INK.sunYellow], [0, C.coral]]) {
        const [X, Y] = P(14.75 + dx, 3.7, z + 0.36);
        inked(ctx, [[X, Y], [X + dx, Y - 0.2]], C.white, 0.02);
        ctx.beginPath(); ctx.arc(X + dx, Y - 0.24, 0.06, 0, Math.PI * 2); paint(ctx, c, { lw: 0.015 });
      }
      // The lab stamp and its ink pad (it's red, like everything else stamped here).
      box(ctx, 15.25, 3.05, z, 0.3, 0.2, 0.03, C.ink, { flat: true, lw: 0.012 });
      cylinder(ctx, 15.55, 3.0, z, 0.07, 0.18, INK.funnelRed, { flat: true });
      // His nameplate, at the front.
      face(ctx, [[15.05, 3.97, z], [15.85, 3.97, z], [15.85, 3.93, z + 0.16], [15.05, 3.93, z + 0.16]], INK.teak, { lw: 0.015 });
      lettering(ctx, 'x', 15.45, 3.98, z + 0.08, 'DR. SWABB', 0.08, C.white);
    });

    // The skeleton by the desk: SKELETON CREW, in a party hat.
    R.thing(18.9, 3.4, (ctx) => {
      disc(ctx, 18.9, 3.4, 0, 0.4, MAT.steelDark);
      face(ctx, [[18.9, 3.4, 0], [18.9, 3.4, 2.4]], null, { lw: 0.06, stroke: MAT.steelDark });
      const BONE = C.white;
      person(ctx, 18.9, 3.4, 0.1, {
        skin: BONE, top: BONE, bottom: BONE, hair: BONE, style: 'bald', hat: 'party', dir: 'l', arms: [0.3, -0.2], scale: 0.95,
        wear(g, b) {
          g.strokeStyle = C.ink; g.lineWidth = 0.025;
          for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-0.22, b.top + 0.12 + i * 0.1); g.quadraticCurveTo(0, b.top + 0.18 + i * 0.1, 0.22, b.top + 0.12 + i * 0.1); g.stroke(); }
          g.beginPath(); g.moveTo(0, b.top + 0.05); g.lineTo(0, b.hipY - 0.1); g.stroke();
        },
        face(g, hy) {
          g.fillStyle = C.ink;
          for (const u of [0.1, 0.24]) { g.beginPath(); g.ellipse(u, hy, 0.055, 0.07, 0, 0, Math.PI * 2); g.fill(); }
          g.fillRect(0.1, hy + 0.14, 0.16, 0.02);
        },
      }, 0);
      board(ctx, 'x', 18.9, 3.9, 0.35, 0.9, 0.3, 'SKELETON CREW', { size: 0.1, board: INK.sunYellow });
    });

    // ---------- The beds ----------
    // A hospital bed: a steel frame on wheels, a white mattress, a pillow, a
    // number on the headboard. (The foot rail is drawn with the tray, in front.)
    for (const [i, b] of BEDS.entries()) {
      const { bx } = b;
      R.thing(bx + 1, BED_Y + 1.5, (ctx) => {
        for (const [dx, dy] of [[0.15, 0.2], [1.75, 0.2], [0.15, 2.7], [1.75, 2.7]]) {
          box(ctx, bx + dx, BED_Y + dy, 0.12, 0.1, 0.1, 0.25, MAT.chrome, { flat: true, lw: 0.015 });
          disc(ctx, bx + dx + 0.05, BED_Y + dy + 0.05, 0.06, 0.07, C.ink, { stroke: false });
        }
        box(ctx, bx, BED_Y, 0.37, 2, 3, 0.1, MAT.chrome, { flat: true, lw: 0.02 });
        box(ctx, bx + 0.05, BED_Y + 0.05, 0.47, 1.9, 2.9, 0.23, C.white, { top: C.white, dens: 0.12 });
        // The headboard.
        box(ctx, bx, BED_Y - 0.12, 0.3, 2, 0.12, 1.2, MAT.chrome, { top: tint(MAT.chrome, 0.3) });
        onY(ctx, bx + 0.8, BED_Y + 0.01, 1.35, (g) => {
          g.beginPath(); g.arc(0.2, 0.2, 0.18, 0, Math.PI * 2); paint(g, C.white, { lw: 0.02 });
          words(g, String(i + 1), 0.2, 0.21, 0.22, C.ink, 'center', 900);
        });
        // The pillow.
        box(ctx, bx + 0.3, BED_Y + 0.15, 0.7, 1.4, 0.7, 0.14, C.white, { flat: true, top: tint(C.white, 0.3), lw: 0.02 });
      });
      // Whoever's in it: a face on the pillow, a blanket to the chin. Before
      // they're sent over, the blanket's folded at the foot.
      const cx = bx + 1;
      const LOOK = folk(b.seed);
      const arrive = walkIn([FROM_DESK, [cx + 0.2, 11.3]], at(b.h) - 4);
      R.thing(cx, BED_Y + 1.55, (ctx, t) => {
        const tt = wrap(t);
        const inBed = tt >= at(b.h);
        if (!inBed) {
          box(ctx, bx + 0.12, BED_Y + 2.1, 0.7, 1.76, 0.75, 0.12, b.blanket, { flat: true, top: tint(b.blanket, 0.2), lw: 0.02 });
          return;
        }
        const k = green(t, at(b.h) - 20);
        const skin = qz(LOOK.skin, k);
        // The face.
        const [X, Y] = P(cx, BED_Y + 0.5, 1.02);
        ctx.beginPath(); ctx.arc(X, Y, 0.3, 0, Math.PI * 2); paint(ctx, skin, { lw: 0.03 });
        ctx.beginPath(); ctx.arc(X, Y - 0.05, 0.32, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath();
        paint(ctx, LOOK.style === 'bald' ? skin : LOOK.hair, { lw: 0.02 });
        if (Q.detail) {
          ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.lineCap = 'round';
          if (b.eyes === 'open') {
            // Wide awake, staring at the ceiling, blinking.
            const blink = pulse(t, 4.2, b.bx) < 0.05;
            for (const u of [-0.09, 0.09]) {
              ctx.beginPath();
              if (blink) { ctx.moveTo(X + u - 0.04, Y); ctx.lineTo(X + u + 0.04, Y); ctx.stroke(); } else { ctx.arc(X + u, Y, 0.035, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill(); }
            }
          } else {
            for (const u of [-0.09, 0.09]) { ctx.beginPath(); ctx.arc(X + u, Y - 0.01, 0.045, 0.2, Math.PI - 0.2); ctx.stroke(); }
          }
          // A queasy wobble of a mouth.
          ctx.beginPath(); ctx.moveTo(X - 0.08, Y + 0.14);
          ctx.quadraticCurveTo(X - 0.04, Y + 0.1, X, Y + 0.14); ctx.quadraticCurveTo(X + 0.04, Y + 0.18, X + 0.08, Y + 0.14);
          ctx.stroke();
          if (b.eyes === 'therm') { // a thermometer in the mouth (not the one you want)
            inked(ctx, [[X + 0.02, Y + 0.14], [X + 0.3, Y + 0.02]], C.white, 0.035);
            ctx.beginPath(); ctx.arc(X + 0.3, Y + 0.02, 0.025, 0, Math.PI * 2); ctx.fillStyle = MAT.chrome; ctx.fill();
          }
        }
        // The blanket, to the chin, and the sheet turned over it.
        const bump = Math.sin(t * 1.3 + bx) * 0.015;
        box(ctx, bx + 0.12, BED_Y + 0.85, 0.7, 1.76, 2.05, 0.2 + bump, b.blanket, { flat: true, top: tint(b.blanket, 0.2), lw: 0.02 });
        box(ctx, bx + 0.12, BED_Y + 0.85, 0.9 + bump, 1.76, 0.28, 0.02, C.white, { flat: true, lw: 0.015 });
      }, { anim: true, depth: bx + 1 + BED_Y + 1.55 });
      // Walking over from the desk, just before.
      R.mover((t) => {
        const tt = wrap(t);
        if (tt >= at(b.h)) return { x: -9, y: -9, gone: true };
        const p = arrive(tt);
        return p || { x: -9, y: -9, gone: true };
      }, (ctx, t, p) => {
        if (p.gone) return;
        const k = green(t, at(b.h) - 20);
        person(ctx, p.x, p.y, 0, { ...LOOK, dress: false, bottom: LOOK.top, skin: qz(LOOK.skin, k), pose: p.moving ? 'walk' : 'stand', dir: p.dir || 'l', back: p.back, arms: [0.9, 0.8], phase: p.phase }, t);
      });
      // The foot rail, the chart hung on it, and the meal tray across the bed.
      R.thing(cx, BED_Y + 1.6, (ctx) => {
        box(ctx, bx, BED_Y + 2.92, 0.3, 2, 0.1, 0.72, MAT.chrome, { flat: true, lw: 0.02 });
        onY(ctx, bx + 1.2, BED_Y + 3.03, 0.95, (g) => {
          g.beginPath(); g.rect(0, 0, 0.45, 0.55); paint(g, MAT.teakDark, { lw: 0.02 });
          g.beginPath(); g.rect(0.05, 0.08, 0.35, 0.42); paint(g, tint(C.butter, 0.4), { lw: 0.012 });
          words(g, 'CHART', 0.22, 0.16, 0.06, C.ink, 'center', 900);
          words(g, i % 2 ? 'SEE ABOVE' : 'GREEN', 0.22, 0.3, 0.05, C.navy, 'center', 900);
        });
        // The tray: a bed table across the blanket, jelly and crackers.
        const tx = bx + 0.25, ty = 13.15, tz = 0.95;
        box(ctx, tx, ty, tz, 1.5, 0.55, 0.05, C.white, { flat: true, top: tint(MAT.steel, 0.6), lw: 0.02 });
        for (const dx of [0.05, 1.4]) box(ctx, tx + dx, ty + 0.45, 0.72, 0.05, 0.05, 0.23, MAT.chrome, { flat: true, lw: 0.012 });
        const zt = tz + 0.05;
        // Crackers, on the right.
        for (let j = 0; j < 3; j++) box(ctx, tx + 1.05 + j * 0.04, ty + 0.12, zt + j * 0.03, 0.25, 0.25, 0.03, C.woodLight, { flat: true, lw: 0.012 });
        const cup = (x, y, fill, h = 0.12) => {
          cylinder(ctx, x, y, zt, 0.11, h, C.white, { flat: true, top: fill });
        };
        if (b.tray === 'pudding' || b.tray === 'find') {
          // A chocolate pudding (the one on bed 4 has the thermometer).
          cup(bx + 0.6, 13.4, C.brown);
          cup(tx + 0.75, 13.35, INK.flamingo);
          if (b.tray === 'find') {
            // The thermometer: a big glass one, standing well up out of the
            // pudding, a red line up its middle and the scale marked on it.
            // (Nothing else on any tray has a stick in it.)
            const [a, c] = P(bx + 0.6, 13.4, zt + 0.1), [d, e] = P(bx + 0.7, 13.36, zt + 0.95);
            const dx = d - a, dy = e - c, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
            inked(ctx, [[a, c], [d, e]], alpha(MAT.glass, 0.95), 0.1);
            // the red line, from the pudding up past halfway
            inked(ctx, [[a + dx * 0.08, c + dy * 0.08], [a + dx * 0.62, c + dy * 0.62]], INK.funnelRed, 0.035);
            if (Q.detail) {
              ctx.strokeStyle = C.ink; ctx.lineWidth = 0.012;
              for (let k = 0; k < 6; k++) {
                const u = 0.2 + k * 0.12, w = k % 2 ? 0.025 : 0.045;
                ctx.beginPath(); ctx.moveTo(a + dx * u + nx * 0.02, c + dy * u + ny * 0.02); ctx.lineTo(a + dx * u + nx * (0.02 + w), c + dy * u + ny * (0.02 + w)); ctx.stroke();
              }
              // a glint down the glass
              ctx.strokeStyle = alpha(C.white, 0.85); ctx.lineWidth = 0.015;
              ctx.beginPath(); ctx.moveTo(a + dx * 0.68 - nx * 0.025, c + dy * 0.68 - ny * 0.025); ctx.lineTo(a + dx * 0.92 - nx * 0.025, c + dy * 0.92 - ny * 0.025); ctx.stroke();
            }
            // the red bulb, just above the pudding
            ctx.beginPath(); ctx.arc(a + dx * 0.06, c + dy * 0.06, 0.055, 0, Math.PI * 2); paint(ctx, INK.funnelRed, { lw: 0.015 });
          }
        } else if (b.tray === 'spoon') {
          // A red jelly and a yellow one.
          cup(tx + 0.35, 13.4, C.red);
          cup(tx + 0.75, 13.35, INK.sunYellow);
        } else {
          // A juice box and its straw, and a jelly.
          box(ctx, tx + 0.25, 13.3, zt, 0.2, 0.15, 0.3, INK.sunYellow, { flat: true, lw: 0.015 });
          const [a, c] = P(tx + 0.32, 13.35, zt + 0.3), [d, e] = P(tx + 0.36, 13.3, zt + 0.55);
          inked(ctx, [[a, c], [d, e]], C.white, 0.03);
          cup(tx + 0.75, 13.35, INK.flamingo);
        }
      }, { depth: bx + 1 + BED_Y + 1.6 });
      // A bucket at the foot of every bed.
      R.thing(bx + 1.5, 15.5, (ctx) => bucket(ctx, bx + 1.5, 15.4, 0, { color: C.grey, name: String(i + 1) }));
      // The drip stand at the head.
      R.thing(bx - 0.3, BED_Y + 0.3, (ctx) => {
        disc(ctx, bx - 0.3, BED_Y + 0.3, 0.02, 0.3, MAT.steelDark, { lw: 0.02 });
        face(ctx, [[bx - 0.3, BED_Y + 0.3, 0], [bx - 0.3, BED_Y + 0.3, 2.9]], null, { lw: 0.05, stroke: MAT.chrome });
        const [X, Y] = P(bx - 0.3, BED_Y + 0.3, 2.85);
        inked(ctx, [[X - 0.25, Y], [X + 0.25, Y]], MAT.chrome, 0.04);
        ctx.beginPath(); ctx.roundRect(X - 0.36, Y + 0.02, 0.26, 0.42, 0.06);
        paint(ctx, alpha(MAT.glass, 0.85), { lw: 0.02 });
        // The tube down to the bed.
        ctx.beginPath(); ctx.moveTo(X - 0.23, Y + 0.44);
        const [bX, bY] = P(bx + 0.4, BED_Y + 1.3, 0.95);
        ctx.quadraticCurveTo(X - 0.3, bY - 0.2, bX, bY);
        ctx.strokeStyle = alpha(C.white, 0.9); ctx.lineWidth = 0.025; ctx.stroke();
      });
    }
    // The drips, all four bags.
    R.thing(8, BED_Y + 0.35, (ctx, t) => {
      if (!Q.detail) return;
      for (const b of BEDS) {
        if (wrap(t) < at(b.h)) continue;
        const [X, Y] = P(b.bx - 0.3, BED_Y + 0.3, 2.85);
        const k = pulse(t, 1.1, b.bx);
        ctx.beginPath(); ctx.arc(X - 0.23, Y + 0.46 + k * 0.18, 0.02, 0, Math.PI * 2);
        ctx.fillStyle = alpha(MAT.glass, 1 - k); ctx.fill();
      }
    }, { anim: true, depth: 8 + BED_Y + 0.35 });
    R.find({ id: 'pudding', label: 'A thermometer in a pudding', kind: 'spot', at: [13.25, 13.38, 1.4], r: 0.8 });

    // A hot-water bottle on bed 2, lizard shaped, green: the decoy.
    const bottle = R.decoy({ id: 'bottle', at: [7.2, 14.1, 1.05], r: 0.65, hold: 0.6, say: ['A hot-water bottle. Not an iguana.', 'Still warm. Still not an iguana.', 'Hands off. It is HIS.'] });
    R.thing(7.2, 14.4, (ctx, t) => hotWaterLizard(ctx, 7.2, 14.1, 0.94, bottle.k()), { anim: true, depth: BEDS[1].bx + 1 + BED_Y + 1.58 });

    // The heart monitor by bed 4: beep, beep, beep.
    R.thing(15.3, 12.6, (ctx) => {
      box(ctx, 14.95, 12.3, 0, 0.7, 0.6, 1.0, MAT.steel, { top: tint(MAT.steel, 0.3) });
      box(ctx, 15.0, 12.35, 1.0, 0.6, 0.35, 0.5, MAT.steelDark, { flat: true, lw: 0.02 });
    });
    R.thing(15.35, 12.75, (ctx, t) => {
      if (!Q.detail) return;
      onY(ctx, 15.05, 12.71, 1.46, (g) => {
        g.beginPath(); g.rect(0.03, 0.04, 0.44, 0.36); g.fillStyle = shade(MAT.crewBlue, 0.4); g.fill();
        const on = wrap(t) >= at(BEDS[3].h);
        g.beginPath();
        for (let i = 0; i <= 24; i++) {
          const u = 0.05 + i * 0.016, ph = (i / 24 + t * 0.9) % 1;
          const v = 0.24 - (on && ph > 0.45 && ph < 0.52 ? (ph < 0.485 ? 0.14 : -0.06) : 0);
          i ? g.lineTo(u, v) : g.moveTo(u, v);
        }
        g.strokeStyle = INK.sunYellow; g.lineWidth = 0.02; g.stroke();
        words(g, on ? 'BEEP' : '---', 0.36, 0.1, 0.05, INK.sunYellow, 'center', 900);
      });
    }, { anim: true });
    // A get-well balloon tied to bed 2, bobbing.
    R.thing(7.9, BED_Y + 0.2, (ctx, t) => {
      const [a, c] = P(8.0, BED_Y - 0.05, 1.5);
      const bob = Math.sin(t * 1.4) * 0.08, sway = Math.sin(t * 0.9) * 0.1;
      const [X, Y] = P(8.2, BED_Y - 0.1, 3.6);
      ctx.beginPath(); ctx.moveTo(a, c); ctx.quadraticCurveTo(a + 0.2, (c + Y) / 2, X + sway, Y + bob + 0.4);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.015; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(X + sway, Y + bob, 0.36, 0.42, 0, 0, Math.PI * 2);
      paint(ctx, INK.flamingo, { lw: 0.03 });
      words(ctx, 'GET', X + sway, Y + bob - 0.1, 0.12, C.white, 'center', 900);
      words(ctx, 'WELL', X + sway, Y + bob + 0.05, 0.12, C.white, 'center', 900);
      words(ctx, 'ish', X + sway, Y + bob + 0.2, 0.08, C.white, 'center', 900);
    }, { anim: true });

    // Chairs between the beds, for the overflow: all taken by 4pm.
    for (const c of CHAIRS) {
      R.thing(c.x + 0.35, 13.7, (ctx) => chair(ctx, c.x, 13.3, 0, tint(MAT.crewBlue, 0.45), 'l'));
      const LOOK = { ...folk(c.seed), top: c.top, dress: false };
      const arrive = walkIn([FROM_DESK, [c.x + 0.4, 11.3], [c.x + 0.4, 13.7]], at(c.h) - 7);
      R.mover((t) => {
        const tt = wrap(t);
        const p = arrive(tt);
        if (!p) return { x: -9, y: -9, gone: true };
        return p;
      }, (ctx, t, p) => {
        if (p.gone) return;
        const skin = qz(LOOK.skin, green(t, at(c.h) - 25));
        if (p.moving) {
          person(ctx, p.x, p.y, 0, { ...LOOK, skin, pose: 'walk', dir: p.dir, back: p.back, phase: p.phase }, t);
          return;
        }
        person(ctx, p.x, p.y, 0.1, { ...LOOK, skin, pose: 'sit', dir: 'l', arms: [0.9, 0.7] }, t);
        bucket(ctx, p.x + 0.35, p.y + 0.55, 0.55, { color: C.grey });
      }, { bias: 0.2 });
    }

    // ---------- The waiting bench, by the door ----------
    R.thing(1.45, 9.9, (ctx) => {
      box(ctx, 0.55, 5.4, 0, 0.35, 4.6, 1.4, MAT.crewBlue, { flat: true });
      box(ctx, 0.9, 5.4, 0, 0.9, 4.6, 0.55, MAT.crewBlue, { top: tint(MAT.crewBlue, 0.25), dens: 0.15 });
    });
    // (The two on it are drawn after the whole bench, or its back hides them.)
    const ON_BENCH = 1.45 + 9.9 + 0.1;
    // The man who's been waiting since Tuesday: a beard to his knees, and
    // ticket number 4. Not green: he came in for a splinter.
    const BEARD = { ...folk(241), skin: SKIN[1], hair: C.white, style: 'bald', top: C.coral, bottom: C.teal, dress: false,
      face(g, hy, back) {
        if (back) return;
        g.beginPath(); g.moveTo(-0.1, hy + 0.1); g.quadraticCurveTo(0.1, hy + 1.1, 0.4, hy + 1.2); g.quadraticCurveTo(0.35, hy + 0.5, 0.34, hy + 0.1); g.closePath();
        paint(g, C.white, { lw: 0.025 });
      },
    };
    R.thing(1.4, 6.6, (ctx, t) => {
      person(ctx, 1.4, 6.6, -0.12, { ...BEARD, pose: 'sit', dir: 'r', arms: [1.2, 0.6] }, t);
      const [X, Y] = P(1.4, 6.6, -0.12);
      const [hx, hy] = handAt(X, Y, 1, 1.2);
      ctx.beginPath(); ctx.rect(hx - 0.02, hy - 0.2, 0.18, 0.22); paint(ctx, C.white, { lw: 0.015 });
      words(ctx, '4', hx + 0.07, hy - 0.09, 0.14, INK.funnelRed, 'center', 900);
      if (pulse(t, 12, 2) < 0.28) speech(ctx, 1.4, 6.6, 2.4, pulse(t, 24, 2) < 0.5 ? 'Since Tuesday.' : "I'm number 4.", { size: 0.32 });
    }, { anim: true, depth: ON_BENCH });
    // A woman knitting a very long scarf while she waits (it's reached the door).
    const KNIT = { ...folk(242), skin: SKIN[4], hair: HAIR[4], style: 'bun', top: C.lilac, bottom: C.navy, dress: false };
    R.thing(1.4, 8.6, (ctx, t) => {
      const k = green(t, at(10.5));
      person(ctx, 1.4, 8.6, -0.12, { ...KNIT, skin: qz(KNIT.skin, k), pose: 'sit', dir: 'r', arms: [1.2 + Math.sin(t * 8) * 0.12, 1.1 - Math.sin(t * 8) * 0.12] }, t);
      const [X, Y] = P(1.4, 8.6, -0.12);
      const [hx, hy] = handAt(X, Y, 1, 1.2);
      inked(ctx, [[hx - 0.2, hy - 0.25], [hx + 0.1, hy + 0.05]], MAT.chrome, 0.025);
      inked(ctx, [[hx + 0.15, hy - 0.25], [hx - 0.1, hy + 0.05]], MAT.chrome, 0.025);
      if (k > 0.5) bucket(ctx, 2.2, 9.4, 0, { color: C.grey });
    }, { anim: true, depth: ON_BENCH + 0.05 });
    R.rug((ctx) => {
      // Her scarf, down off the bench and along the floor to the door.
      const s = [[1.9, 8.5, 0.4], [2.4, 8.0, 0.01], [2.6, 6.8, 0.01], [2.2, 5.2, 0.01], [1.4, 4.4, 0.01], [0.6, 4.2, 0.01]];
      ctx.beginPath();
      s.forEach(([x, y, z], i) => { const [X, Y] = P(x, y, z); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.28; ctx.stroke(); }
      ctx.strokeStyle = INK.flamingo; ctx.lineWidth = 0.22; ctx.stroke();
      if (Q.detail) { ctx.setLineDash([0.08, 0.14]); ctx.strokeStyle = C.white; ctx.lineWidth = 0.22; ctx.stroke(); ctx.setLineDash([]); }
    });

    // ---------- The queue ----------
    for (const q of QUEUE) {
      const [sx, sy] = SLOTS[q.slot];
      const t0 = at(q.h);
      const path = q.slot >= 10 ? [DOOR, [sx, sy]] : [DOOR, [2.4, 4.7], [sx, 4.7], [sx, sy]];
      const arrive = walkIn(path, t0);
      const LOOK = { ...folk(q.seed), ...q.look };
      const sickAt = q.sick != null ? at(q.sick) : null;
      R.mover((t) => {
        const tt = wrap(t);
        const p = arrive(tt);
        if (!p) return { x: -9, y: -9, gone: true };
        return p;
      }, (ctx, t, p) => {
        if (p.gone) return;
        const k = green(t, sickAt);
        const skin = q.look.skin === LOBSTER ? LOBSTER : qz(LOOK.skin, k);
        const f = p.moving && p.dir === 'l' ? -1 : 1;
        let arms;
        if (!p.moving) {
          arms = q.prop === 'bucket' ? [0.7, 0.6] : q.prop === 'belly' ? [0.55, 0.45] : q.prop === 'can' ? [2.4, -0.1] : q.prop === 'plate' || q.prop === 'mermaid' ? [1.5, -0.15] : q.prop === 'sunburn' ? [2.2 + Math.sin(t * 6) * 0.4, -0.2] : undefined;
        }
        // Idle: shifting from foot to foot.
        const sway = p.moving ? 0 : Math.sin(t * 1.3 + q.seed) * 0.04;
        const [X, Y] = P(p.x, p.y, 0);
        ctx.save();
        ctx.translate(X, Y); ctx.rotate(sway); ctx.translate(-X, -Y);
        person(ctx, p.x, p.y, 0, { ...LOOK, skin, top: LOOK.top, pose: p.moving ? 'walk' : 'stand', dir: p.moving ? p.dir : 'r', back: p.moving ? p.back : false, arms, phase: p.phase }, t);
        ctx.restore();
        if (!Q.detail && q.prop !== 'bucket') return;
        const s = LOOK.scale || 1;
        const [hx, hy] = handAt(X, Y, f, arms ? arms[0] : 0.2);
        if (q.prop === 'bucket') bucket(ctx, p.x + 0.3, p.y + 0.25, 0.75 * s, { color: C.grey });
        else if (q.prop === 'can' && !p.moving) {
          // His hand, stuck in a Gander Cola.
          ctx.beginPath(); ctx.roundRect(hx - 0.1, hy - 0.2, 0.2, 0.32, 0.03); paint(ctx, INK.funnelRed, { lw: 0.02 });
          ctx.fillStyle = C.white; ctx.fillRect(hx - 0.1, hy - 0.06, 0.2, 0.04);
        } else if (q.prop === 'plate' && !p.moving) {
          // Still eating the shrimp.
          ctx.beginPath(); ctx.ellipse(hx + 0.05, hy, 0.3, 0.09, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.02 });
          for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(hx - 0.1 + i * 0.09, hy - 0.05, 0.05, Math.PI, 0); paint(ctx, C.coralLight, { lw: 0.012 }); }
        } else if (q.prop === 'mermaid' && !p.moving) {
          cocktail(ctx, p.x + 0.55, p.y - 0.45, 1.15);
        } else if (q.prop === 'sunburn' && !p.moving) {
          // Fanning himself with a menu.
          ctx.beginPath(); ctx.rect(hx - 0.14, hy - 0.3, 0.28, 0.36); paint(ctx, INK.sunYellow, { lw: 0.015 });
        }
        if (q.says && !p.moving && Q.detail) {
          const per = 16 + q.slot, ph = pulse(t, per, q.seed);
          if (ph < 0.22) speech(ctx, p.x, p.y, 2.5 * s + 0.2, q.says[Math.floor(t / per) % q.says.length], { size: 0.3 });
        }
      });
    }

    // ---------- The crewman and the sign ----------
    // A stool under the sign, and a WET FLOOR sign that means it.
    R.thing(STOOL.x, STOOL.y + 0.2, (ctx) => {
      for (const [dx, dy] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) {
        const [a, b] = P(STOOL.x + dx, STOOL.y + dy, 0), [c, d] = P(STOOL.x + dx * 0.6, STOOL.y + dy * 0.6, STOOL.h);
        inked(ctx, [[a, b], [c, d]], INK.funnelRed, 0.05);
      }
      cylinder(ctx, STOOL.x, STOOL.y, STOOL.h - 0.08, 0.28, 0.08, INK.funnelRed);
    });
    R.thing(8.3, 3.1, (ctx) => {
      face(ctx, [[7.9, 2.9, 0], [8.7, 2.9, 0], [8.5, 3.05, 1.1], [8.1, 3.05, 1.1]], INK.sunYellow, { lw: 0.03 });
      face(ctx, [[7.9, 3.3, 0], [8.7, 3.3, 0], [8.5, 3.1, 1.1], [8.1, 3.1, 1.1]], INK.sunYellow, { lw: 0.03, dots: shade(INK.sunYellow, 0.3), density: 0.1 });
      lettering(ctx, 'x', 8.3, 3.31, 0.72, 'CAUTION', 0.12, C.ink);
      lettering(ctx, 'x', 8.3, 3.31, 0.5, 'WET FLOOR', 0.1, C.ink);
      lettering(ctx, 'x', 8.3, 3.31, 0.32, '(AND WORSE)', 0.08, INK.funnelRed);
    });
    // Where the crewman is: mopping, or on his way up to change the number.
    const CREWMAN = { ...folk(251), ...CREW_LOOK, skin: SKIN[3], hair: HAIR[1], style: 'short', hat: 'cap' };
    const up = [STOOL.x, STOOL.y + 0.6];
    const crewAt = (t) => {
      const tt = wrap(t);
      const mop = { x: mopX(tt), y: MOP_Y, moving: true, mop: true, dir: Math.cos(tt * 0.7) > 0 ? 'r' : 'l', phase: tt * 5 };
      const c = CYCLES.find((cy) => tt >= cy.b && tt < cy.b + 24);
      if (!c) return mop;
      const s = tt - c.b;
      const trip = (s0, what) => {
        // Walk over (s0 to s0 + 2.8), climb (to +3.6), change it (to +5.4),
        // look (to +6.2), climb down (to +7), walk back (to +9.8).
        const r = s - s0;
        const from = [mopX(c.b + s0), MOP_Y], back = [mopX(c.b + s0 + 9.8), MOP_Y];
        const walk = (a, b2, k) => {
          const dX = (b2[0] - a[0]) - (b2[1] - a[1]), dY = (b2[0] - a[0]) + (b2[1] - a[1]);
          return { x: a[0] + (b2[0] - a[0]) * k, y: a[1] + (b2[1] - a[1]) * k, moving: true, dir: dX >= 0 ? 'r' : 'l', back: dY < 0, phase: tt * 9 };
        };
        if (r < 2.8) return walk(from, up, r / 2.8);
        if (r < 3.6) { const k = (r - 2.8) / 0.8; return { x: STOOL.x, y: up[1] - k * 0.6, z: k * STOOL.h, dir: 'r', back: true, climb: true }; }
        if (r < 5.4) return { x: STOOL.x, y: STOOL.y, z: STOOL.h, dir: 'r', back: true, reach: true, what, r };
        if (r < 6.2) return { x: STOOL.x, y: STOOL.y, z: STOOL.h, dir: 'l', back: false, look: what };
        if (r < 7) { const k = (r - 6.2) / 0.8; return { x: STOOL.x, y: STOOL.y + k * 0.6, z: (1 - k) * STOOL.h, dir: 'l', climb: true }; }
        if (r < 9.8) return walk(up, back, (r - 7) / 2.8);
        return null;
      };
      return trip(0, 'up') || (c.told && s >= 12 ? trip(12, 'down') : null) || { ...mop, celebrate: !c.told && s < 16 };
    };
    R.mover(crewAt, (ctx, t, p) => {
      const z = p.z || 0;
      const arms = p.reach ? [2.9 + Math.sin(t * 9) * 0.1, -2.7] : p.mop ? [0.9 + Math.sin(t * 5) * 0.25, 0.7] : p.celebrate ? [2.8, -2.8] : undefined;
      const pose = p.moving && !p.mop ? 'walk' : p.celebrate ? 'cheer' : p.mop ? 'walk' : 'stand';
      person(ctx, p.x, p.y, z, { ...CREWMAN, pose, dir: p.dir, back: p.back, arms, phase: p.phase, speed: p.mop ? 3 : 7 }, t);
      if (p.mop) {
        // The mop, swishing.
        const f = p.dir === 'l' ? -1 : 1, [X, Y] = P(p.x, p.y, 0);
        const [hx, hy] = handAt(X, Y, f, arms[0]);
        const sw = Math.sin(t * 5) * 0.3;
        inked(ctx, [[hx, hy], [X + f * (0.7 + sw), Y + 0.1]], INK.teak, 0.05);
        ctx.beginPath(); ctx.ellipse(X + f * (0.75 + sw), Y + 0.12, 0.22, 0.08, 0, 0, Math.PI * 2);
        paint(ctx, C.white, { lw: 0.02, dots: C.grey, density: 0.3 });
      }
      if (!Q.detail) return;
      if (p.look) speech(ctx, p.x, p.y, z + 2.5, p.look === 'up' ? 'A new record!' : 'Zero it is.', { size: 0.32 });
    }, { depth: (t) => { const p = crewAt(t); return p.x + p.y + (p.z ? 0.6 : 0); } });
    // A bucket and a mop bucket, by where he works.
    R.thing(3.3, 2.6, (ctx) => {
      cylinder(ctx, 3.3, 2.4, 0, 0.35, 0.5, INK.sunYellow);
      disc(ctx, 3.3, 2.4, 0.5, 0.27, alpha(C.greyLight, 0.9), { lw: 0.015 });
    });
    // What Swabb says to that, from wherever he is.
    R.air((ctx, t) => {
      if (!Q.detail) return;
      const tt = wrap(t);
      for (const c of CYCLES) {
        if (!c.told) continue;
        const s = tt - (c.b + 10.5);
        if (s < 0 || s > 2.8) continue;
        const p = swabbAt(t);
        if (p) speech(ctx, p.x, p.y, 3.35, pulse(t, 5.6) < 0.5 ? 'Zero.' : "It's ZERO.", { size: 0.4, dx: -0.6 });
      }
      // On his way back in, past the sign.
      const s = tt - PASS;
      if (s > -0.6 && s < 2.4) {
        const p = swabbAt(t);
        if (p) speech(ctx, p.x, p.y, 3.35, 'Zero. Zero.', { size: 0.4, dx: -0.6 });
      }
      // While he's away, the crewman goes for it.
      const c = CYCLES.find((cy) => !cy.told && tt >= cy.b + 10 && tt < cy.b + 14);
      if (c) {
        const p = crewAt(t);
        speech(ctx, p.x, p.y, 2.6, digit(tt).n === 2 ? 'TWO DAYS!' : 'THREE! Nobody tell him.', { size: 0.34 });
      }
    });

    // ---------- The quarantine booth ----------
    // Sealed, with a porthole in its door, and a beacon going round on top.
    // The man inside was put in yesterday for sneezing near the buffet. He
    // caught it anyway, at half past nine.
    const QB = { x: 19, y: 8, w: 3.5, d: 3.5, h: 3.2 };
    R.thing(QB.x + QB.w / 2, QB.y + QB.d / 2, (ctx) => {
      box(ctx, QB.x, QB.y, 0, QB.w, QB.d, QB.h, INK.hullWhite, { top: tint(MAT.steel, 0.5), dens: 0.14 });
      // Its steel corners.
      for (const [x, y] of [[QB.x + QB.w, QB.y + QB.d], [QB.x, QB.y + QB.d], [QB.x + QB.w, QB.y]]) {
        face(ctx, [[x, y, 0], [x, y, QB.h]], null, { lw: 0.08, stroke: MAT.steel });
      }
      // QUARANTINE, along the side.
      onX(ctx, QB.x + QB.w, QB.y + QB.d - 0.2, 2.9, (g) => {
        g.beginPath(); g.rect(0, 0, 3.1, 0.6); paint(g, INK.funnelRed, { lw: 0.03 });
        words(g, 'QUARANTINE', 1.55, 0.32, 0.38, C.white, 'center', 400, 'Bagel Fat One');
        g.beginPath(); g.rect(0.3, 1.0, 2.5, 0.9); paint(g, C.white, { lw: 0.025 });
        words(g, 'DO NOT OPEN', 1.55, 1.2, 0.2, C.ink, 'center', 900);
        words(g, 'NOT EVEN IF HE', 1.55, 1.45, 0.14, INK.funnelRed, 'center', 800);
        words(g, 'ASKS NICELY', 1.55, 1.65, 0.14, INK.funnelRed, 'center', 800);
      });
      // The door, with a porthole, and a slot for the jelly.
      onY(ctx, QB.x + 0.9, QB.y + QB.d, 2.8, (g) => {
        g.beginPath(); g.rect(0, 0, 1.6, 2.8); paint(g, tint(MAT.steel, 0.5), { lw: 0.04 });
        g.beginPath(); g.arc(0.8, 0.75, 0.46, 0, Math.PI * 2); paint(g, MAT.brass, { lw: 0.03 });
        g.beginPath(); g.arc(0.8, 0.75, 0.36, 0, Math.PI * 2); paint(g, shade(MAT.glass, 0.35), { lw: 0.02 });
        g.beginPath(); g.rect(0.45, 1.6, 0.7, 0.16); paint(g, MAT.steelDark, { lw: 0.02 });
        words(g, 'MEALS', 0.8, 1.88, 0.1, C.ink, 'center', 900);
        g.beginPath(); g.rect(1.3, 1.3, 0.12, 0.35); paint(g, MAT.chrome, { lw: 0.015 });
      });
      // A tray of jelly left by the slot.
      // (A steel tray and a proper cup: a white sheet with a red dot read as the lab slip.)
      box(ctx, QB.x + 2.0, QB.y + QB.d + 0.2, 0, 0.6, 0.4, 0.05, MAT.chrome, { flat: true, lw: 0.015 });
      cylinder(ctx, QB.x + 2.3, QB.y + QB.d + 0.4, 0.05, 0.12, 0.16, alpha(MAT.glass, 0.9), { flat: true, top: C.red });
    });
    // His face at the porthole, now and then, and his knocking.
    const PRISONER = { skin: SKIN[5], hair: HAIR[2] };
    const LINES = ['I feel GREAT.', 'Is the buffet open?', 'I only sneezed!', 'Can I have a pudding?'];
    R.thing(QB.x + QB.w / 2, QB.y + QB.d / 2 + 0.05, (ctx, t) => {
      const ph = pulse(t, 13, 4);
      const knock = ph > 0.3 && ph < 0.45;
      const shake = knock ? Math.sin(t * 50) * 0.02 : 0;
      onY(ctx, QB.x + 0.9 + shake, QB.y + QB.d + 0.01, 2.8, (g) => {
        if (ph > 0.75) return;
        g.save();
        g.beginPath(); g.arc(0.8, 0.75, 0.36, 0, Math.PI * 2); g.clip();
        const skin = qz(PRISONER.skin, green(t, at(9.5)));
        const bob = Math.sin(t * 2) * 0.02;
        g.beginPath(); g.arc(0.8, 0.85 + bob, 0.28, 0, Math.PI * 2); paint(g, skin, { lw: 0.02 });
        g.beginPath(); g.arc(0.8, 0.8 + bob, 0.3, Math.PI * 1.05, Math.PI * 1.95); g.closePath(); g.fillStyle = PRISONER.hair; g.fill();
        g.fillStyle = C.ink;
        for (const u of [0.7, 0.9]) { g.beginPath(); g.arc(u, 0.85 + bob, 0.03, 0, Math.PI * 2); g.fill(); }
        // Nose squashed on the glass.
        g.beginPath(); g.ellipse(0.8, 0.95 + bob, 0.07, 0.05, 0, 0, Math.PI * 2); paint(g, tint(skin, 0.25), { lw: 0.012 });
        // Hands flat on the glass.
        for (const u of [0.5, 1.1]) { g.beginPath(); g.ellipse(u, 0.6 + (knock ? Math.sin(t * 25) * 0.04 : 0), 0.09, 0.11, 0, 0, Math.PI * 2); paint(g, skin, { lw: 0.015 }); }
        g.fillStyle = alpha(C.white, 0.35);
        g.beginPath(); g.arc(0.66, 0.6, 0.08, 0, Math.PI * 2); g.fill();
        g.restore();
      });
      if (!Q.detail) return;
      if (knock) noise(ctx, QB.x + 1.7, QB.y + QB.d + 0.2, 3.0, 'KNOCK KNOCK', (ph - 0.3) / 0.15, 0.36);
      if (ph > 0.48 && ph < 0.7) speech(ctx, QB.x + 1.7, QB.y + QB.d, 3.4, LINES[Math.floor(t / 13) % LINES.length], { size: 0.32 });
    }, { anim: true, depth: QB.x + QB.w / 2 + QB.y + QB.d / 2 + 0.05 });
    R.poke({ id: 'booth', at: [QB.x + 1.7, QB.y + QB.d, 1.8], r: 1.0, sound: 'clunk', say: ['Do NOT open.', 'Not even if he asks nicely.', 'He says hi.'] });
    // The beacon on the roof, going round.
    R.thing(QB.x + QB.w / 2, QB.y + QB.d / 2 + 0.1, (ctx, t) => {
      const cx = QB.x + QB.w / 2, cy = QB.y + QB.d / 2;
      cylinder(ctx, cx, cy, QB.h, 0.22, 0.12, MAT.steelDark, { flat: true });
      const a = t * 4;
      const on = Math.cos(a) > 0;
      cylinder(ctx, cx, cy, QB.h + 0.12, 0.17, 0.3, on ? INK.sunYellow : shade(INK.sunYellow, 0.2), { flat: true });
      if (!Q.detail) return;
      const [X, Y] = P(cx, cy, QB.h + 0.27);
      ctx.beginPath(); ctx.moveTo(X, Y);
      ctx.lineTo(X + Math.cos(a) * 1.4 - 0.25, Y + Math.sin(a) * 0.5 - 0.1);
      ctx.lineTo(X + Math.cos(a) * 1.4 + 0.25, Y + Math.sin(a) * 0.5 + 0.1);
      ctx.closePath();
      ctx.fillStyle = alpha(INK.sunYellow, 0.35); ctx.fill();
    }, { anim: true, depth: QB.x + QB.w / 2 + QB.y + QB.d / 2 + 0.1 });

    // ---------- The nurse, round the beds ----------
    const NURSE = { ...folk(261), ...CREW_LOOK, skin: SKIN[2], hair: HAIR[6], style: 'bun', top: C.white, bottom: C.white };
    const round = route([[2.8, 11.0, 3], [6.0, 11.0, 3], [9.2, 11.0, 3], [12.4, 11.0, 3], [16.6, 9.0, 2]], { speed: 1.3, loop: false });
    R.mover(round, (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, { ...NURSE, pose: p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back, arms: p.moving ? undefined : [1.2, 1.0], phase: p.phase }, t);
      const f = p.dir === 'l' ? -1 : 1, [X, Y] = P(p.x, p.y, 0);
      // Her clipboard.
      const [hx, hy] = handAt(X, Y, f, p.moving ? 0.6 : 1.2);
      ctx.beginPath(); ctx.rect(hx - 0.13, hy - 0.3, 0.26, 0.34); paint(ctx, MAT.teakDark, { lw: 0.015 });
      ctx.fillStyle = C.white; ctx.fillRect(hx - 0.1, hy - 0.25, 0.2, 0.26);
      if (!p.moving && Q.detail && pulse(t, 7) < 0.3) speech(ctx, p.x, p.y, 2.6, pulse(t, 21) < 0.33 ? 'Say ahh.' : pulse(t, 21) < 0.66 ? 'Any better?' : "You look great.", { size: 0.3 });
    });

    // ---------- The pharmacy, at the point ----------
    // Shelves of ginger ale, Gander Cola and crackers.
    R.thing(25.8, 6.6, (ctx) => {
      box(ctx, 24.6, 6.0, 0, 2.5, 0.55, 2.3, INK.hullWhite, { top: INK.hullWhite });
      for (let r = 0; r < 3; r++) {
        const z = 0.4 + r * 0.65;
        box(ctx, 24.6, 6.55, z, 2.5, 0.03, 0.04, MAT.teakDark, { flat: true, lw: 0.012 });
        for (let i = 0; i < 7; i++) {
          const x = 24.75 + i * 0.33;
          if (r === 0) box(ctx, x - 0.05, 6.25, z + 0.04, 0.22, 0.2, 0.35, C.woodLight, { flat: true, lw: 0.012 });
          else cylinder(ctx, x + 0.06, 6.35, z + 0.04, 0.08, 0.28, r === 1 ? INK.funnelRed : C.butter, { flat: true, lw: 0.012 });
        }
      }
    });
    R.thing(25.7, 10.2, (ctx) => {
      box(ctx, 24.2, 9.4, 0, 3.0, 0.8, 1.1, INK.hullWhite, { top: tint(MAT.steel, 0.5), dens: 0.14 });
      onY(ctx, 24.4, 10.21, 0.9, (g) => {
        g.beginPath(); g.rect(0, 0, 2.6, 0.5); paint(g, MAT.crewBlue, { lw: 0.02 });
        words(g, "DOCTOR'S ORDERS: GANDER COLA", 1.3, 0.26, 0.13, C.white, 'center', 900);
      });
      // Cans and a bell on the counter.
      for (let i = 0; i < 3; i++) cylinder(ctx, 24.6 + i * 0.22, 9.75, 1.1, 0.08, 0.26, INK.funnelRed, { flat: true, lw: 0.012 });
      cylinder(ctx, 26.9, 9.8, 1.1, 0.12, 0.08, MAT.brass);
    });
    R.poke({ id: 'counter-bell', at: [26.9, 9.8, 1.2], r: 0.6, sound: 'tick', say: ['DING. We have ginger ale.', 'DING. Still ginger ale.'] });
    // The pharmacist, handing out cans, and the customer who wants something else.
    const CHEM = { ...folk(271), ...CREW_LOOK, skin: SKIN[4], hair: HAIR[0], style: 'short' };
    R.thing(25.8, 8.4, (ctx, t) => {
      const ph = pulse(t, 6);
      person(ctx, 25.8, 8.4, 0, { ...CHEM, dir: 'l', arms: ph < 0.4 ? [1.6, 0.2] : [0.3, -0.2] }, t);
      if (ph < 0.4) {
        const [X, Y] = P(25.8, 8.4, 0), [hx, hy] = handAt(X, Y, -1, 1.6);
        ctx.beginPath(); ctx.roundRect(hx - 0.08, hy - 0.18, 0.16, 0.26, 0.03); paint(ctx, INK.funnelRed, { lw: 0.015 });
      }
      if (Q.detail && pulse(t, 18, 3) < 0.2) speech(ctx, 25.8, 8.4, 2.6, 'Take a gander.', { size: 0.3 });
    }, { anim: true });
    const CUSTOMER = { ...folk(272), top: INK.flamingo, bottom: C.white, style: 'long', dress: false };
    R.thing(24.8, 11.0, (ctx, t) => {
      const k = green(t, at(10.8));
      person(ctx, 24.8, 11.0, 0, { ...CUSTOMER, skin: qz(CUSTOMER.skin, k), dir: 'r', back: true, arms: [0.9, 0.5] }, t);
      if (Q.detail && pulse(t, 18, 12) < 0.2) speech(ctx, 24.8, 11.0, 2.6, 'Do you have anything else?', { size: 0.28, dx: 1.5 });
    }, { anim: true });
    // The bucket reserve, at the very point: running low.
    R.thing(29.2, 8.2, (ctx) => {
      for (let i = 0; i < 6; i++) bucket(ctx, 29.2, 8.0, i * 0.2, { color: i % 2 ? C.grey : tint(C.grey, 0.3) });
      // The sign's stick, stuck in the top bucket.
      box(ctx, 29.17, 8.17, 1.3, 0.06, 0.06, 0.8, MAT.teakDark, { flat: true, stroke: false });
      board(ctx, 'x', 29.2, 8.4, 2.3, 1.3, 0.5, '', { board: C.white });
      lettering(ctx, 'x', 29.2, 8.41, 2.42, 'BUCKETS', 0.14, C.ink);
      lettering(ctx, 'x', 29.2, 8.41, 2.22, 'ONE EACH. ONE.', 0.09, INK.funnelRed);
    });

    // ---------- Odds and ends ----------
    // The scales by the eye chart, and what they think of you.
    R.thing(1.6, 14.0, (ctx) => {
      box(ctx, 0.9, 13.2, 0, 1.2, 1.0, 0.12, C.white, { flat: true, top: tint(MAT.steel, 0.5) });
      box(ctx, 0.95, 13.5, 0.12, 0.15, 0.3, 1.6, MAT.steel, { flat: true, lw: 0.02 });
      onX(ctx, 1.1, 13.95, 1.95, (g) => {
        g.beginPath(); g.arc(0.3, 0.1, 0.3, 0, Math.PI * 2); paint(g, C.white, { lw: 0.03 });
        g.strokeStyle = INK.funnelRed; g.lineWidth = 0.03;
        g.beginPath(); g.moveTo(0.3, 0.1); g.lineTo(0.52, -0.02); g.stroke();
        words(g, 'NOPE', 0.3, 0.24, 0.08, C.ink, 'center', 900);
      });
      board(ctx, 'x', 1.5, 14.3, 0.55, 1.0, 0.35, 'NOT TODAY', { size: 0.12, board: INK.sunYellow });
    });
    // A trolley parked behind the booth, loaded with the day's spare buckets.
    R.thing(21.4, 5.2, (ctx) => {
      for (const [dx, dy] of [[0.1, 0.1], [2.2, 0.1], [0.1, 0.7], [2.2, 0.7]]) {
        box(ctx, 20.2 + dx, 4.4 + dy, 0, 0.08, 0.08, 0.75, MAT.chrome, { flat: true, lw: 0.012 });
      }
      box(ctx, 20.2, 4.4, 0.75, 2.4, 0.9, 0.12, MAT.chrome, { flat: true, top: tint(MAT.chrome, 0.3) });
      box(ctx, 20.2, 4.4, 0.3, 2.4, 0.9, 0.04, MAT.chrome, { flat: true });
      for (let i = 0; i < 4; i++) bucket(ctx, 20.6 + i * 0.52, 4.85, 0.87, { color: i % 2 ? C.grey : tint(C.grey, 0.3) });
      for (let i = 0; i < 3; i++) box(ctx, 20.4 + i * 0.7, 4.5, 0.34, 0.55, 0.7, 0.35, C.woodLight, { flat: true, lw: 0.015 });
      lettering(ctx, 'x', 21.4, 5.31, 0.5, 'CRACKERS', 0.12, INK.funnelRed);
    });

    // ---------- The wheelchair ----------
    // A man parked by the red cross since breakfast, asking about lunch.
    R.thing(18.1, 13.2, (ctx) => {
      chair(ctx, 17.6, 12.7, 0, MAT.steelDark, 'l');
      for (const y of [12.65, 13.55]) {
        const [X, Y] = P(17.95, y, 0.45);
        ctx.save(); ctx.translate(X, Y); ctx.transform(-1, 0.5, 0, 1, 0, 0);
        ctx.beginPath(); ctx.arc(0, 0, 0.45, 0, Math.PI * 2); paint(ctx, null, { lw: 0.05, stroke: C.ink });
        ctx.beginPath(); ctx.arc(0, 0, 0.4, 0, Math.PI * 2); paint(ctx, null, { lw: 0.03, stroke: MAT.chrome });
        ctx.restore();
      }
    });
    const WHEELIE = { ...folk(281), top: C.teal, bottom: C.navy, style: 'bald', dress: false };
    R.thing(18.25, 13.4, (ctx, t) => {
      const k = green(t, at(10.4));
      person(ctx, 18.0, 13.1, 0.1, { ...WHEELIE, skin: qz(WHEELIE.skin, k), pose: 'sit', dir: 'l', arms: [1.4 + Math.sin(t * 6) * 0.3, 0.6] }, t);
      const [X, Y] = P(18.0, 13.1, 0.1), [hx, hy] = handAt(X, Y, -1, 1.4 + Math.sin(t * 6) * 0.3);
      ctx.beginPath(); ctx.rect(hx - 0.16, hy - 0.3, 0.3, 0.38); paint(ctx, INK.sunYellow, { lw: 0.015 });
      if (Q.detail) {
        words(ctx, 'MENU', hx - 0.01, hy - 0.2, 0.07, C.ink, 'center', 900);
        if (pulse(t, 15, 7) < 0.22) speech(ctx, 18.0, 13.1, 2.4, k > 0.5 ? 'Is lunch included?' : 'Is it lunch yet?', { size: 0.3 });
      }
    }, { anim: true, depth: 31.5 });
  },
};
