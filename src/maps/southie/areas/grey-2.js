// The New Owners: the Grey One's second floor. Movers in matching shirts, an
// exercise bike with a screen, a smart fridge, a French bulldog in a
// stroller (in a raincoat: it's raining). The bike goes up to the wrong
// floor, down, up again; by night its owner is riding it, looking at the
// harbor.
//
// This file also keeps the Grey One's shared pieces (the other two floors
// import them, so the house is one hand): the hour, a keyframe walker, the
// bike and its trip round the house, the movers' look, the Edison bulb, the
// wide grey boards, and the glass balcony's rails drawn over whoever's out
// on it.
import {
  C, Q, box, rect, disc, cylinder, face, paint, person, folk, speech, label, glow,
  shade, tint, mix, alpha, P, onLeft, onRight, paintText,
} from '../../../engine/art.js';
import { pulse, clamp } from '../../../engine/actors.js';
import { ZK } from '../../../engine/iso.js';
import { apartment, carton, lettering, PORCH, FH, BODY } from '../kit.js';
import { SIDING, TRIM, ROOM, INK } from '../style.js';
import { AFTER, hour, nightK } from '../clock.js';

// ---------- The Grey One's shared pieces ----------

// The hour, 5 to 29 (past midnight runs on), so a day's keys stay in order.
export const H = (t) => { const h = hour(t); return h < 5 ? h + 24 : h; };
export const during = (a, b) => (t) => { const h = H(t); return h >= a && h < b; };

// Someone on keyframes by the hour: [[h, x, y, extra], ...]. Between two
// keys they walk (pose walk, facing the way they go); on two keys at the
// same spot they stand, with that key's extra (pose, dir, say...).
export function track(keys) {
  return (h) => {
    if (h <= keys[0][0]) return at1(keys[0], keys[0], 0);
    let i = 1;
    while (i < keys.length && h > keys[i][0]) i++;
    if (i >= keys.length) return at1(keys[keys.length - 1], keys[keys.length - 1], 0);
    const a = keys[i - 1], b = keys[i];
    return at1(a, b, (h - a[0]) / (b[0] - a[0] || 1));
  };
}
function at1(a, b, k) {
  const moving = a[1] !== b[1] || a[2] !== b[2];
  const x = a[1] + (b[1] - a[1]) * k, y = a[2] + (b[2] - a[2]) * k;
  if (!moving) return { x, y, moving, pose: 'stand', ...(a[3] || {}) };
  const sx = (b[1] - b[2]) - (a[1] - a[2]);
  return { x, y, moving, pose: 'walk', dir: sx >= 0 ? 'r' : 'l', back: (b[1] + b[2]) - (a[1] + a[2]) < -0.01 };
}

// A thick bar with an ink edge, between two points (a bike's frame).
export function bar(ctx, a, b, color, w = 0.12) {
  const [x0, y0] = P(...a), [x1, y1] = P(...b);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
  ctx.lineCap = 'round';
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = w + 0.06; ctx.stroke(); }
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
}
// A circle standing up in the x-z plane (a flywheel).
function ringXZ(ctx, cx, cy, cz, r, n = 18) {
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, [X, Y] = P(cx + Math.cos(a) * r, cy, cz + Math.sin(a) * r);
    i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
  }
  ctx.closePath();
}

// The exercise bike (looks like the famous one; never called it): a black
// frame, a silver flywheel with a red hub, the red knob, and a big screen
// facing the rider. Along x, the rider facing +x. (x, y) its middle.
export function bike(ctx, x, y, z) {
  const K = C.black;
  box(ctx, x - 0.8, y - 0.34, z, 0.16, 0.68, 0.1, K, { flat: true, lw: 0.03 });
  box(ctx, x + 0.64, y - 0.34, z, 0.16, 0.68, 0.1, K, { flat: true, lw: 0.03 });
  bar(ctx, [x - 0.72, y, z + 0.1], [x + 0.72, y, z + 0.1], K, 0.1);
  ringXZ(ctx, x + 0.3, y, z + 0.56, 0.42);
  paint(ctx, tint(C.greyLight, 0.2), { lw: 0.04 });
  ringXZ(ctx, x + 0.3, y, z + 0.56, 0.13);
  paint(ctx, C.red, { lw: 0.03 });
  bar(ctx, [x - 0.6, y, z + 0.1], [x - 0.42, y, z + 1.22], K, 0.15);
  bar(ctx, [x - 0.48, y, z + 0.75], [x + 0.22, y, z + 0.9], K, 0.13);
  box(ctx, x - 0.66, y - 0.14, z + 1.22, 0.46, 0.28, 0.1, K, { flat: true, lw: 0.03 });
  bar(ctx, [x + 0.34, y, z + 0.5], [x + 0.2, y, z + 1.45], K, 0.15);
  bar(ctx, [x + 0.2, y - 0.3, z + 1.45], [x + 0.2, y + 0.3, z + 1.45], K, 0.08);
  for (const s of [-0.3, 0.3]) bar(ctx, [x + 0.2, y + s, z + 1.45], [x + 0.02, y + s, z + 1.38], K, 0.07);
  disc(ctx, x + 0.12, y, z + 1.12, 0.07, C.red, { lw: 0.02 });
  bar(ctx, [x + 0.2, y, z + 1.45], [x + 0.26, y, z + 1.66], K, 0.07);
  box(ctx, x + 0.24, y - 0.44, z + 1.62, 0.06, 0.88, 0.58, K, { flat: true, lw: 0.03 });
  // The water bottle's cage on the front post.
  box(ctx, x + 0.26, y + 0.1, z + 0.86, 0.12, 0.12, 0.05, K, { flat: true, stroke: false });
}
// The bike's water bottle: a tall sports bottle, see-through blue with a
// grip band, a black cap with a white squeeze spout, and a clip on the cap.
export function bottle(ctx, x, y, z) {
  cylinder(ctx, x, y, z, 0.12, 0.52, tint(C.sky, 0.2), { flat: true });
  if (Q.detail) {
    // The grip band round its waist, and a shine.
    const [X, Y] = P(x, y, z + 0.18), rx = 0.12 * Math.SQRT2;
    ctx.fillStyle = C.water; ctx.fillRect(X - rx, Y - 0.12 * ZK, rx * 2, 0.1 * ZK);
    box(ctx, x - 0.03, y - 0.03, z + 0.08, 0.03, 0.03, 0.36, alpha(C.white, 0.75), { flat: true, stroke: false });
  }
  cylinder(ctx, x, y, z + 0.52, 0.1, 0.09, C.black, { flat: true });
  cylinder(ctx, x, y, z + 0.61, 0.045, 0.1, C.white, { flat: true });
  // The clip: a black loop off the cap.
  const [CX, CY] = P(x + 0.12, y + 0.12, z + 0.5);
  ctx.beginPath(); ctx.ellipse(CX + 0.05, CY + 0.03, 0.06, 0.1, 0.4, 0, Math.PI * 2);
  ctx.strokeStyle = C.black; ctx.lineWidth = 0.035; ctx.stroke();
}

// The movers: matching purple shirts with a white patch, coral caps.
const patch = (ctx, b) => {
  if (b.back || !Q.detail) return;
  ctx.fillStyle = C.white; ctx.fillRect(0.02, b.top + 0.18, 0.18, 0.12);
};
export const MOVER = [
  folk(611, { top: C.purple, bottom: C.ink, hat: 'cap', style: 'short', dress: false, wear: patch }),
  folk(622, { top: C.purple, bottom: C.ink, hat: 'cap', style: 'bald', dress: false, wear: patch }),
];
// A clipboard with the work order on it, held out.
export const workOrder = (ctx) => {
  ctx.save(); ctx.rotate(-0.2);
  ctx.fillStyle = C.brown; ctx.fillRect(0.12, -0.3, 0.34, 0.44);
  ctx.fillStyle = C.white; ctx.fillRect(0.16, -0.24, 0.26, 0.34);
  ctx.fillStyle = C.ink; for (let i = 0; i < 3; i++) ctx.fillRect(0.19, -0.19 + i * 0.09, 0.18, 0.025);
  ctx.restore();
};

// ---------- The bike's trip round the house ----------
// Up to the third floor (wrong), down past its own floor to the first (the
// open house, wrong again), up to the second (right). World units within the
// house: x, y as a floor's, z from the ground floor up. [hour, x, y, z]; two
// keys at one spot are a stop.
const F2 = FH * 2;
const SAGA = [
  [13.0, 14.2, 1.4, 0], [13.06, 12.1, 1, 0], [13.3, 7.2, 1, FH], [13.54, 2.2, 1, F2],
  [13.62, 1.8, 2.6, F2], [13.78, 6, 3, F2], [14.05, 6, 3, F2], // the penthouse
  [14.15, 1.8, 2.6, F2], [14.2, 2.2, 1, F2], [14.44, 7.2, 1, FH], [14.68, 12.1, 1, 0],
  [14.73, 12.2, 2.5, 0], [14.86, 7.8, 3, 0], [15.15, 7.8, 3, 0], // the open house
  [15.26, 12.2, 2.5, 0], [15.31, 12.1, 1, 0], [15.55, 7.2, 1, FH], [15.61, 6.8, 2.6, FH],
  [15.8, 11, 6.8, FH], // home
];
export const BIKE_HOME = [11, 6.8];
const CUM = [0];
for (let i = 1; i < SAGA.length; i++) {
  const [, x0, y0, z0] = SAGA[i - 1], [, x1, y1, z1] = SAGA[i];
  CUM.push(CUM[i - 1] + Math.hypot(x1 - x0, y1 - y0, z1 - z0));
}
const TOTAL = CUM[CUM.length - 1];
function alongS(s) {
  s = clamp(s, 0, TOTAL);
  let i = 1;
  while (i < SAGA.length - 1 && CUM[i] < s) i++;
  const a = SAGA[i - 1], b = SAGA[i], L = CUM[i] - CUM[i - 1];
  const k = L > 0 ? (s - CUM[i - 1]) / L : 0;
  return { x: a[1] + (b[1] - a[1]) * k, y: a[2] + (b[2] - a[2]) * k, z: a[3] + (b[3] - a[3]) * k };
}
// Which floor a height in the house is on (a flight belongs to the floor it
// climbs from; its top landing to the floor above).
export const floorAt = (z) => (z >= F2 - 0.05 ? 2 : z >= FH - 0.05 ? 1 : 0);
// What the argument sounds like at each stop, in turns.
const STOPS = {
  2: [['Work order says 3.', 'Not my bike.'], ['It says 3!', 'Could be a 2.']],
  0: [['Is this 2?', "It's 1."], ['Bike not included!', 'Is the bike included?']],
  1: [['It says 2.', 'It was always 2.'], ['Told you. 2.', 'You said 3.']],
};
let lastT = NaN, last = null;
// Where the bike and its two movers are at t: { bike: {x, y, z, carried},
// movers: [{x, y, z, pose, dir}, ...] | null, stop: floor | null, say }.
export function saga(t) {
  if (t === lastT) return last;
  lastT = t;
  const h = H(t);
  if (h < SAGA[0][0]) return (last = null);
  let i = 1;
  while (i < SAGA.length && h > SAGA[i][0]) i++;
  if (i >= SAGA.length) {
    // Home: the movers argue with the work order a while, then go.
    const [x, y] = BIKE_HOME;
    const movers = h < 16.5 ? [{ x: x - 1.2, y: y + 1.4, z: FH, dir: 'r' }, { x: x - 0.5, y: y - 1.3, z: FH, dir: 'l' }] : null;
    return (last = { bike: { x, y, z: FH, carried: false }, movers, stop: 1, since: 15.8 });
  }
  const a = SAGA[i - 1], b = SAGA[i];
  const k = (h - a[0]) / (b[0] - a[0]);
  const s = CUM[i - 1] + k * (CUM[i] - CUM[i - 1]);
  if (CUM[i] === CUM[i - 1]) {
    const [, x, y, z] = a;
    return (last = {
      bike: { x, y, z, carried: false },
      movers: [{ x: x - 0.8, y: y + 1.3, z, dir: 'r' }, { x: x + 1.3, y: y + 0.2, z, dir: 'l' }],
      stop: floorAt(z), since: a[0],
    });
  }
  const sx = (b[1] - b[2]) - (a[1] - a[2]);
  const dir = sx >= 0 ? 'r' : 'l';
  const p = alongS(s);
  const m0 = alongS(s + 0.95), m1 = alongS(s - 0.95);
  return (last = {
    bike: { ...p, carried: true },
    movers: [{ ...m0, dir, pose: 'walk' }, { ...m1, dir, pose: 'walk' }],
    stop: null,
  });
}
// A bike stop's lines, for whoever's saying them: 0 and 1 the movers, and 2
// anyone else there (the owner, the realtor, a visitor).
export function stopLine(t, who) {
  const sg = saga(t);
  if (!sg || sg.stop == null || !sg.movers) return null;
  const e = (H(t) - sg.since) * 16.875; // seconds since they stopped (afternoon hours)
  const set = STOPS[sg.stop][Math.floor(e / 9) % 2];
  const k = e % 9;
  if (who === 0 && k > 0.5 && k < 3) return set[0];
  if (who === 1 && k > 3.5 && k < 6) return set[1];
  return null;
}

// Draw the bike trip's pieces standing on floor f, in that floor's units:
// the bike and each mover as its own mover, so they sort among the room.
export function sagaOn(R, f) {
  const here = (p) => p && floorAt(p.z) === f;
  const local = (p) => ({ x: p.x, y: p.y, z: p.z - f * FH });
  const OFF = { x: -40, y: -40, off: true };
  R.mover((t) => { const sg = saga(t); return sg && here(sg.bike) && !(f === 1 && !sg.bike.carried && sg.stop === 1) ? local(sg.bike) : OFF; },
    (ctx, t, p) => { if (!p.off) bike(ctx, p.x, p.y, p.z + (saga(t).bike.carried ? 0.95 : 0)); },
    { on: (t) => { const sg = saga(t); return !!sg && here(sg.bike); }, depth: (t) => { const sg = saga(t); return sg ? sg.bike.x + sg.bike.y + (sg.bike.x > BODY ? 6 : 0) : 0; } });
  [0, 1].forEach((i) => {
    const pos = (t) => { const sg = saga(t); const m = sg && sg.movers && sg.movers[i]; return m && here(m) ? { ...local(m), dir: m.dir, pose: m.pose } : OFF; };
    R.mover(pos, (ctx, t, p) => {
      if (p.off) return;
      const sg = saga(t);
      const carrying = sg.bike.carried;
      person(ctx, p.x, p.y, p.z, { ...MOVER[i], pose: p.pose || 'stand', dir: p.dir, arms: carrying ? [1.25, 1.25] : undefined, hold: !carrying && i === 0 ? workOrder : undefined }, t);
      const say = stopLine(t, i);
      if (say && Q.detail) speech(ctx, p.x, p.y, p.z + 3.3, say, { size: 0.42 }); // high, clear of the counters
    }, { on: (t) => { const sg = saga(t); const m = sg && sg.movers && sg.movers[i]; return !!m && here(m); }, depth: (t) => { const p = pos(t); return p.off ? 0 : porchDepth(p); } });
  });
}

// A standing thing out on the porch sorts after the porch itself (the kit
// draws the deck and its glass as one thing at 14.8 + 4.3), among the rest
// out there by its own spot.
export const porchDepth = (p) => (p.x > BODY + 0.05 ? 19.2 + (p.x + p.y) / 100 : p.x + p.y);
export function onPorch(R, x, y, draw, o = {}) {
  return R.thing(x, y, draw, { depth: 19.2 + (x + y) / 100, ...o });
}
// The glass balcony's lines, again, over whoever's out on it (the kit's
// glass is under them; only its edges and the black rail go over).
export function rails(R) {
  R.thing(PORCH.x1 - 0.1, PORCH.y1 - 0.05, (ctx) => {
    const x0 = PORCH.x0, x1 = PORCH.x1, y0 = PORCH.y0, y1 = PORCH.y1, Hh = 1.05, rx = x1 - 0.14;
    face(ctx, [[rx, y0, 0], [rx, y1, 0], [rx, y1, Hh], [rx, y0, Hh]], null, { lw: 0.03 });
    face(ctx, [[x0, y1, 0], [rx, y1, 0], [rx, y1, Hh], [x0, y1, Hh]], null, { lw: 0.03 });
    box(ctx, rx - 0.04, y0, Hh, 0.08, y1 - y0, 0.06, C.black, { flat: true, stroke: false });
    box(ctx, x0, y1 - 0.04, Hh, rx - x0, 0.08, 0.06, C.black, { flat: true, stroke: false });
    for (const u of [y0 + 0.1, y1 - 0.15]) box(ctx, rx - 0.06, u, 0, 0.1, 0.1, FH - 0.45, C.black, { flat: true, lw: 0.02 });
  }, { depth: 19.9 });
}

// Wide grey oak boards (every gut-reno has them), faint, on a floor with
// the stairwell's hole in it (x0..x1 along the back, y under 2).
export function boards(R, hole = null) {
  R.rug((ctx) => {
    if (!Q.detail) return;
    ctx.save();
    ctx.globalAlpha *= 0.16;
    ctx.beginPath();
    for (let y = 2.6; y < 9; y += 0.6) {
      const a = P(0, y), b = P(BODY, y);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      for (let x = ((y * 3.7) % 3) + 1; x < BODY; x += 3.4) { const c = P(x, y - 0.6), d = P(x, y); ctx.moveTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); }
    }
    for (const y of [0.6, 1.2, 1.8, 2.0]) {
      const segs = hole ? [[0, hole[0]], [hole[1], BODY]] : [[0, BODY]];
      for (const [x0, x1] of segs) { if (x1 - x0 < 0.1) continue; const a = P(x0, y), b = P(x1, y); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
    }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.035; ctx.stroke();
    ctx.restore();
  });
}

// An Edison bulb on a black cord from the ceiling: its filament glows at
// night (R.light), and it sways when something shakes the house.
export function edison(R, x, y, drop = 1.2, sway = () => 0) {
  R.light({
    at: (t) => [x + sway(t), y, FH - drop - 0.2],
    r: 1.8,
    color: C.butter,
    k: (t) => clamp(nightK(t) * 1.4) * 0.75,
    draw(ctx, t, k) {
      const s = sway(t), bx = x + s;
      const [X0, Y0] = P(x, y, FH), [X1, Y1] = P(bx, y, FH - drop);
      ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.035; ctx.stroke();
      box(ctx, bx - 0.07, y - 0.07, FH - drop - 0.06, 0.14, 0.14, 0.1, C.black, { flat: true, stroke: false });
      const [X, Y] = P(bx, y, FH - drop - 0.22);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.13, 0.17, 0, 0, Math.PI * 2);
      paint(ctx, alpha(k > 0.1 ? C.butter : tint(C.butter, 0.5), 0.85), { lw: 0.025 });
      if (Q.detail) {
        ctx.beginPath(); ctx.moveTo(X - 0.05, Y + 0.06); ctx.lineTo(X - 0.02, Y - 0.06); ctx.lineTo(X + 0.02, Y + 0.02); ctx.lineTo(X + 0.05, Y - 0.06);
        ctx.strokeStyle = k > 0.1 ? C.coral : C.brown; ctx.lineWidth = 0.02; ctx.stroke();
      }
    },
  });
}

// A kitchen along the back wall (x = 0), from y0 to y1: flat white doors,
// a quartz top, uppers, and a subway tile backsplash between.
export function kitchenL(R, y0, y1, o = {}) {
  const top = o.top || tint(C.greyLight, 0.55), door = o.door || C.white;
  R.wall((ctx) => {
    onLeft(ctx, y0, 1.25, y1 - y0, 1.35, tint(C.white, 0.2), { lw: 0.02 });
    if (!Q.detail) return;
    ctx.save(); ctx.globalAlpha *= 0.3;
    for (let z = 1.45; z < 2.6; z += 0.2) face(ctx, [[0, y0, z], [0, y1, z]], null, { lw: 0.015, stroke: C.grey });
    ctx.restore();
  });
  R.thing(0.9, y1, (ctx) => {
    box(ctx, 0, y0, 0, 0.95, y1 - y0, 1.12, door, { flat: true, lw: 0.035 });
    box(ctx, 0, y0 - 0.04, 1.12, 1.02, y1 - y0 + 0.08, 0.13, top, { flat: true, lw: 0.035 });
    if (Q.detail) {
      for (let y = y0 + 0.75; y < y1 - 0.1; y += 0.75) face(ctx, [[0.95, y, 0.08], [0.95, y, 1.05]], null, { lw: 0.02, stroke: C.grey });
      face(ctx, [[0.95, y0, 0.78], [0.95, y1, 0.78]], null, { lw: 0.02, stroke: C.grey });
    }
    if (o.uppers !== false) {
      box(ctx, 0, y0, 2.65, 0.6, y1 - y0, 1.15, door, { flat: true, lw: 0.035 });
      if (Q.detail) for (let y = y0 + 0.75; y < y1 - 0.1; y += 0.75) face(ctx, [[0.6, y, 2.7], [0.6, y, 3.75]], null, { lw: 0.02, stroke: C.grey });
    }
  });
}

// A person seen from the knees up in something (a hot tub, a box): drawn
// only above the line at z0 on their own spot.
export function waist(ctx, x, y, z0, draw) {
  const [, Y] = P(x, y, z0);
  ctx.save();
  ctx.beginPath(); ctx.rect(-400, -400, 800, 400 + Y); ctx.clip();
  draw();
  ctx.restore();
}

// ---------- The New Owners ----------
// The dog's stroller: back and forth across the middle room, all day (you
// walk a French bulldog indoors when it rains; he's in a raincoat anyway).
function strollerAt(t) {
  const h = H(t);
  if (h >= 19 || h < 7.4) return { x: 5.2, y: 3.4, d: 1, moving: false, parked: true };
  const k = pulse(t, 17);
  const X0 = 4.9, X1 = 8.1;
  let x, d, moving = true;
  if (k < 0.42) { x = X0 + (X1 - X0) * (k / 0.42); d = 1; }
  else if (k < 0.5) { x = X1; d = 1; moving = false; }
  else if (k < 0.92) { x = X1 - (X1 - X0) * ((k - 0.5) / 0.42); d = -1; }
  else { x = X0; d = -1; moving = false; }
  return { x, y: 3.4, d, moving };
}
function stroller(ctx, s, t, asleep) {
  const { x, y, d } = s;
  const wob = s.moving ? Math.sin(t * 9) * 0.02 : 0;
  for (const [dx, dy] of [[-0.4, -0.28], [0.4, -0.28], [-0.4, 0.28], [0.4, 0.28]]) {
    const [X, Y] = P(x + dx, y + dy, 0.16);
    ctx.beginPath(); ctx.ellipse(X, Y, 0.12, 0.16, 0, 0, Math.PI * 2); paint(ctx, C.black, { lw: 0.025 });
  }
  bar(ctx, [x - 0.4 * d, y, 0.2], [x - 0.3 * d, y, 0.55], C.greyLight, 0.05);
  bar(ctx, [x + 0.4 * d, y, 0.2], [x + 0.3 * d, y, 0.55], C.greyLight, 0.05);
  // The handle, on the side the pusher's on.
  bar(ctx, [x - 0.45 * d, y, 0.7], [x - 0.85 * d, y, 1.5], C.black, 0.06);
  bar(ctx, [x - 0.85 * d, y - 0.25, 1.5], [x - 0.85 * d, y + 0.25, 1.5], C.black, 0.07);
  box(ctx, x - 0.5, y - 0.3, 0.55 + wob, 1.0, 0.6, 0.45, C.purple, { lw: 0.035, dens: 0.18 });
  // The dog: a fawn head, bat ears, black muzzle, a yellow raincoat.
  const hx = x + 0.2 * d, hz = 1.2 + wob + (asleep ? -0.1 : Math.abs(Math.sin(t * 2.2)) * 0.03);
  box(ctx, x - 0.3, y - 0.22, 0.95 + wob, 0.6, 0.44, 0.14, C.mustard, { flat: true, lw: 0.03 });
  const [X, Y] = P(hx, y, hz);
  ctx.save(); ctx.translate(X, Y); ctx.scale(d, 1);
  ctx.beginPath(); ctx.moveTo(-0.14, -0.12); ctx.lineTo(-0.2, -0.34); ctx.lineTo(-0.03, -0.18); ctx.closePath(); paint(ctx, C.wood, { lw: 0.025 });
  ctx.beginPath(); ctx.moveTo(0.06, -0.18); ctx.lineTo(0.14, -0.36); ctx.lineTo(0.2, -0.12); ctx.closePath(); paint(ctx, C.wood, { lw: 0.025 });
  ctx.beginPath(); ctx.arc(0, 0, 0.2, 0, Math.PI * 2); paint(ctx, C.woodLight, { lw: 0.03 });
  ctx.beginPath(); ctx.ellipse(0.12, 0.06, 0.1, 0.07, 0, 0, Math.PI * 2); paint(ctx, C.ink, { stroke: false });
  ctx.fillStyle = C.ink;
  if (asleep) { ctx.fillRect(-0.06, -0.04, 0.07, 0.02); ctx.fillRect(0.06, -0.04, 0.07, 0.02); }
  else { ctx.beginPath(); ctx.arc(-0.03, -0.03, 0.03, 0, Math.PI * 2); ctx.arc(0.1, -0.03, 0.03, 0, Math.PI * 2); ctx.fill(); }
  if (!asleep && Math.sin(t * 1.3) > 0.3) { ctx.fillStyle = C.pink; ctx.fillRect(0.1, 0.1, 0.06, 0.08); }
  ctx.restore();
  // Front paws over the edge: one yellow boot, one bare paw (the other boot's on the floor).
  const [PX, PY] = P(x + 0.45 * d, y + 0.12, 1.02 + wob);
  ctx.beginPath(); ctx.ellipse(PX, PY, 0.07, 0.1, 0, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.02 });
  const [QX, QY] = P(x + 0.45 * d, y - 0.12, 1.02 + wob);
  ctx.beginPath(); ctx.ellipse(QX, QY, 0.07, 0.09, 0, 0, Math.PI * 2); paint(ctx, C.woodLight, { lw: 0.02 });
}
// A dog's yellow rain boot, fallen over, sole up a little.
function rainBoot(ctx, x, y) {
  box(ctx, x - 0.28, y - 0.13, 0, 0.44, 0.26, 0.24, C.mustard, { flat: true, lw: 0.03, top: tint(C.mustard, 0.2) });
  box(ctx, x + 0.12, y - 0.15, 0, 0.18, 0.3, 0.32, C.mustard, { flat: true, lw: 0.03 });
  box(ctx, x - 0.3, y - 0.14, 0, 0.62, 0.28, 0.05, C.ink, { flat: true, stroke: false });
  if (Q.detail) box(ctx, x + 0.12, y - 0.15, 0.3, 0.18, 0.3, 0.04, C.coral, { flat: true, stroke: false });
}

// The smart speaker's wrong answers, one exchange at a time.
const ASK = [
  ["What's the weather?", 'It is Tuesday.'],
  ['Lights on.', 'Playing whale songs.'],
  ['Call the movers.', 'Calling Mom.'],
  ["Where's my bike?", 'Adding bikes to cart.'],
  ['Set a timer.', 'Ordering eleven tacos.'],
  ['Play rain sounds.', 'It is already raining.'],
];
const TALK = 13;
const talk = (t) => {
  const h = H(t);
  if (h < 7.6 || h >= 19) return null;
  const n = Math.floor(t / TALK), k = t % TALK;
  const [q, a] = ASK[n % ASK.length];
  if (k > 1 && k < 4) return { who: 'owner', text: q };
  if (k > 4.4 && k < 7.8) return { who: 'speaker', text: a };
  return null;
};

// The owner who rides: by the speaker all day, on the bike by night.
const RIDE0 = 19.4, RIDE1 = 24.4;
const OWNER = track([
  [7.5, 7.2, 1.2], [7.62, 2.4, 4.5, { dir: 'l' }], [13.6, 2.4, 4.5, { dir: 'l' }],
  [13.8, 8.6, 6.2, { dir: 'r' }], [14.4, 8.6, 6.2, { dir: 'r', say: 'Is it here yet?' }], [14.6, 2.4, 4.5, { dir: 'l' }],
  [15.8, 2.4, 4.5, { dir: 'l' }], [16.0, 9.2, 7.8, { dir: 'r', say: 'Finally.' }], [16.6, 9.2, 7.8, { dir: 'r' }],
  [16.8, 2.4, 4.5, { dir: 'l' }], [19.2, 2.4, 4.5, { dir: 'l' }], [RIDE0, 10.4, 7.6], [RIDE0 + 0.01, 10.4, 7.6],
]);
const OWNER_LOOK = folk(931, { top: C.teal, bottom: C.ink, style: 'pony', hair: C.brown, dress: false });
const OWNER2_LOOK = folk(932, { top: C.coral, bottom: C.navy, style: 'short', dress: false, hat: 'beanie' });
// The instructor on the screen, cheering at night.
const COACH = ['Feel that hill!', "You've got this!", 'Five more minutes!', 'Look at you go!'];

export default {
  id: 'grey-2',
  name: 'The New Owners',
  blurb: 'The movers match and the dog rides in a stroller. The bike went to the wrong floor twice.',
  size: [15, 9],
  build(R) {
    apartment(R, { floor: 1, walls: ROOM['grey-2'], floorInk: ROOM['grey-2'].floor, siding: SIDING.grey, trim: TRIM.grey, modern: true });
    boards(R, [7.2, BODY]);
    const before = during(5, 12), after = AFTER.when;

    // ---------- The walls ----------
    kitchenL(R, 2.2, 5.6);
    R.decor((ctx) => {
      // A letterboard over the stairwell, and the thermostat that knows everything.
      box(ctx, 9.2, 0, 2.5, 2.2, 0.08, 1.1, C.black, { flat: true, lw: 0.03 });
      paintText(ctx, 'right', 10.3, 3.3, 'HOME SWEET', 0.26, C.white, 'Rethink Sans');
      paintText(ctx, 'right', 10.3, 2.85, 'CONDO', 0.3, C.white, 'Rethink Sans');
      onRight(ctx, 7.6, 2.4, 0.5, 0.5, C.black, { lw: 0.02 });
      if (Q.detail) paintText(ctx, 'right', 7.85, 2.65, '71', 0.22, C.tealLight, 'Rethink Sans');
      // Wall art that's mostly frame.
      onLeft(ctx, 7.7, 1.6, 1.1, 1.5, C.ink);
      onLeft(ctx, 7.8, 1.7, 0.9, 1.3, C.white);
      if (Q.detail) onLeft(ctx, 8.15, 2.2, 0.2, 0.3, C.grey, { stroke: false });
    });

    // ---------- The kitchen ----------
    // The smart fridge (it came with the unit), and its screen.
    R.thing(0.95, 7.4, (ctx) => {
      box(ctx, 0, 6.0, 0, 0.95, 1.4, 3.1, tint(C.greyLight, 0.25), { flat: true, lw: 0.04 });
      face(ctx, [[0.95, 6.7, 0.1], [0.95, 6.7, 3.0]], null, { lw: 0.025 });
      for (const y of [6.55, 6.85]) box(ctx, 0.95, y - 0.03, 1.2, 0.06, 0.06, 0.9, C.grey, { flat: true, stroke: false });
    });
    R.thing(1.0, 7.4, (ctx, t) => {
      const q = [0.96, 6.1], w = 0.5, z0 = 1.7, hh = 0.7;
      face(ctx, [[q[0], q[1], z0], [q[0], q[1] + w, z0], [q[0], q[1] + w, z0 + hh], [q[0], q[1], z0 + hh]], C.navy, { lw: 0.025 });
      const msg = ['HELLO!', 'OUT OF KALE', 'RAIN 100%', 'HI, DOG'][Math.floor(t / 4) % 4];
      lettering(ctx, 'y', 0.97, q[1] + w / 2, z0 + hh / 2, msg, 0.1, C.tealLight);
    }, { anim: true, depth: 8.41 });
    // The coffee machine that needs an app, a bowl of limes, the speaker.
    // All of it sorts in front of the counter (the counter is one thing,
    // sorted at its far end), or the counter paints over it.
    R.thing(0.8, 5.2, (ctx) => {
      box(ctx, 0.15, 4.7, 1.25, 0.6, 0.5, 0.75, C.black, { flat: true, lw: 0.03 });
      box(ctx, 0.75, 4.8, 1.25, 0.1, 0.3, 0.1, C.greyLight, { flat: true, lw: 0.02 });
      disc(ctx, 0.55, 2.8, 1.28, 0.3, C.white, { lw: 0.03 });
      if (Q.detail) for (const [dx, dy] of [[-0.08, -0.05], [0.1, 0.06], [0, 0.12]]) disc(ctx, 0.55 + dx, 2.8 + dy, 1.36, 0.09, C.leaf, { lw: 0.02 });
    }, { depth: 6.6 });
    // The smart speaker: a squat charcoal puck with a light ring on top,
    // right by the owner who asks it things. The ring glows teal all day and
    // a bright bit chases round it when it answers (wrongly).
    const SX = 0.62, SY = 3.65, SZ = 1.25;
    R.thing(SX + 0.4, SY + 0.4, (ctx) => {
      cylinder(ctx, SX, SY, SZ, 0.3, 0.34, shade(C.navy, 0.35), { side: shade(C.navy, 0.45), flat: true });
      if (Q.detail) {
        // The fabric's seam round its middle.
        const [X, Y] = P(SX, SY, SZ + 0.12), rx = 0.3 * Math.SQRT2;
        ctx.beginPath(); ctx.ellipse(X, Y, rx, rx / 2, 0, 0, Math.PI);
        ctx.strokeStyle = alpha(C.grey, 0.5); ctx.lineWidth = 0.02; ctx.stroke();
      }
    }, { depth: 6.62 });
    R.thing(SX + 0.41, SY + 0.41, (ctx, t) => {
      const tk = talk(t), on = tk && tk.who === 'speaker';
      const z = SZ + 0.345, [X, Y] = P(SX, SY, z), rx = 0.22 * Math.SQRT2;
      ctx.beginPath(); ctx.ellipse(X, Y, rx, rx / 2, 0, 0, Math.PI * 2);
      ctx.strokeStyle = C.tealLight; ctx.lineWidth = on ? 0.08 : 0.06; ctx.stroke();
      if (on) {
        const a = t * 6;
        ctx.beginPath(); ctx.ellipse(X, Y, rx, rx / 2, 0, a, a + 1.4);
        ctx.strokeStyle = C.white; ctx.lineWidth = 0.08; ctx.stroke();
      }
      if (Q.detail) glow(ctx, SX, SY, z + 0.05, on ? 0.8 : 0.5, C.tealLight, on ? 0.75 + Math.sin(t * 8) * 0.15 : 0.4);
    }, { anim: true, depth: 6.63 });
    R.find({ id: 'speaker', label: 'A smart speaker', at: [SX, SY, SZ + 0.2], r: 0.88 });
    edison(R, 2.6, 7.2, 1.3); // clear of the speaker
    edison(R, 6.3, 5.8, 1.1);

    // The goose, in a moving box marked DECOR, which it is now.
    const GX = 2.8, GY = 8.0;
    R.goose((t) => ({ x: GX, y: GY, z: 0.3, dir: 'r', pose: pulse(t, 11) > 0.85 ? 'honk' : 'sit' }), { bias: -0.1 });
    R.thing(GX + 0.5, GY + 0.5, (ctx) => {
      const x0 = GX - 0.5, y0 = GY - 0.5, s = 1.0, hh = 0.75;
      face(ctx, [[x0 + s, y0, 0], [x0 + s, y0 + s, 0], [x0 + s, y0 + s, hh], [x0 + s, y0, hh]], shade(C.woodLight, 0.1), { lw: 0.035 });
      face(ctx, [[x0, y0 + s, 0], [x0 + s, y0 + s, 0], [x0 + s, y0 + s, hh], [x0, y0 + s, hh]], shade(C.woodLight, 0.2), { lw: 0.035 });
      face(ctx, [[x0, y0 + s, hh], [x0 + s, y0 + s, hh], [x0 + s, y0 + s + 0.35, hh + 0.3], [x0, y0 + s + 0.35, hh + 0.3]], C.woodLight, { lw: 0.03 });
      face(ctx, [[x0 + s, y0, hh], [x0 + s, y0 + s, hh], [x0 + s + 0.35, y0 + s, hh + 0.3], [x0 + s + 0.35, y0, hh + 0.3]], tint(C.woodLight, 0.1), { lw: 0.03 });
      lettering(ctx, 'x', x0 + s / 2, y0 + s + 0.01, 0.4, 'DECOR', 0.2, C.ink);
    }, { depth: GX + GY + 0.3 });

    // ---------- The middle: the dog, the boxes ----------
    R.mover((t) => { const s = strollerAt(t); return { ...s, x: s.x, y: s.y }; }, (ctx, t, s) => {
      stroller(ctx, s, t, H(t) >= 21 || H(t) < 7.4);
    }, { bias: 0.2 });
    // Whoever's pushing: the other owner, in a beanie, all day.
    R.mover((t) => { const s = strollerAt(t); return { x: s.x - 1.05 * s.d, y: s.y + 0.05, dir: s.d > 0 ? 'r' : 'l', moving: s.moving, parked: s.parked }; }, (ctx, t, p) => {
      if (p.parked) return;
      person(ctx, p.x, p.y, 0, { ...OWNER2_LOOK, pose: p.moving ? 'walk' : 'stand', dir: p.dir, arms: [1.3, 1.3], speed: 5 }, t);
    }, { on: during(7.4, 19) });
    R.thing(7.6, 4.6, (ctx) => rainBoot(ctx, 7.6, 4.6));
    R.find({ id: 'boot', label: "A dog's rain boot", at: [7.6, 4.6, 0.2], r: 0.88 });

    // Their boxes, after noon; the seller's, before.
    R.thing(6.2, 8.5, (ctx) => {
      carton(ctx, 4.7, 7.0, 0, 1.1, 0.8, 0.8, 'KITCHEN');
      carton(ctx, 4.8, 7.7, 0, 0.9, 0.8, 0.7, "DOG'S");
      carton(ctx, 4.8, 7.1, 0.8, 0.9, 0.7, 0.6, 'BIKE STUFF');
      carton(ctx, 5.9, 7.6, 0, 0.9, 0.8, 0.7, 'FRAGILE');
    }, { on: after });
    R.thing(10.4, 7.2, (ctx) => {
      carton(ctx, 8.8, 5.8, 0, 1.0, 0.8, 0.8, 'SELLER');
      carton(ctx, 9.6, 6.4, 0, 0.8, 0.8, 0.7, 'SELLER');
      carton(ctx, 8.9, 5.9, 0.8, 0.8, 0.7, 0.6, 'MISC');
      box(ctx, 9.4, 7.8, 0, 0.5, 1.4, 0.5, C.coral, { lw: 0.03, left: shade(C.coral, 0.25) }); // a rolled rug
    }, { on: before });
    // The seller, taping his last box: off to the Seaport.
    R.mover(() => ({ x: 10.6, y: 5.4 }), (ctx, t, p) => {
      const k = pulse(t, 3);
      person(ctx, p.x, p.y, 0, { ...folk(941, { top: C.sky, dress: false }), dir: 'l', pose: 'stand', arms: [1.1 + Math.sin(k * Math.PI * 2) * 0.35, 0.9] }, t);
      carton(ctx, 9.3, 4.9, 0, 0.8, 0.7, 0.6, null);
      if (Q.detail && t % 16 < 3.5) speech(ctx, p.x, p.y, 2.7, 'Seaport, here I come.', { size: 0.42 });
    }, { on: during(7.2, 11.9) });

    // ---------- The front room: the sofa, the bike's spot ----------
    R.thing(11.6, 4.0, (ctx) => {
      box(ctx, 9.2, 3.0, 0.12, 2.4, 1.0, 0.55, tint(C.navy, 0.35), { lw: 0.035 });
      box(ctx, 9.2, 3.0, 0.67, 2.4, 0.3, 0.7, tint(C.navy, 0.3), { lw: 0.035 });
      box(ctx, 9.2, 3.3, 0.67, 0.25, 0.7, 0.35, tint(C.navy, 0.3), { lw: 0.03 });
      box(ctx, 11.35, 3.3, 0.67, 0.25, 0.7, 0.35, tint(C.navy, 0.3), { lw: 0.03 });
    }, { on: after });
    // A rug, a dog bed, and a floor lamp, after noon.
    R.thing(0, 0, (ctx) => {
      rect(ctx, 8.8, 4.3, 3.4, 1.7, 0.01, tint(C.mint, 0.3), { lw: 0.025 });
      rect(ctx, 9.0, 4.5, 3.0, 1.3, 0.012, null, { lw: 0.02, stroke: C.teal });
    }, { on: after, depth: -1 });
    R.thing(4.3, 6.4, (ctx) => {
      const [X, Y] = P(3.8, 6.0, 0);
      ctx.beginPath(); ctx.ellipse(X, Y - 0.15, 0.75, 0.4, 0, 0, Math.PI * 2); paint(ctx, C.coral, { lw: 0.035, dots: shade(C.coral, 0.3), density: 0.2 });
      ctx.beginPath(); ctx.ellipse(X, Y - 0.2, 0.5, 0.24, 0, 0, Math.PI * 2); paint(ctx, tint(C.coral, 0.5), { lw: 0.025 });
    }, { on: after });
    R.thing(12.1, 3.2, (ctx) => {
      disc(ctx, 12.0, 3.0, 0.02, 0.22, C.black, { lw: 0.02 });
      box(ctx, 11.97, 2.97, 0, 0.06, 0.06, 2.7, C.black, { flat: true, stroke: false });
      const [X, Y] = P(12.0, 3.0, 2.7);
      ctx.beginPath(); ctx.moveTo(X - 0.3, Y + 0.35); ctx.lineTo(X - 0.18, Y - 0.15); ctx.lineTo(X + 0.18, Y - 0.15); ctx.lineTo(X + 0.3, Y + 0.35); ctx.closePath();
      paint(ctx, C.white, { lw: 0.03 });
    }, { on: after });
    R.light({ at: [12.0, 3.0, 2.8], r: 2.2, color: C.butter, k: (t) => (after(t) ? nightK(t) * 0.7 : 0) });
    // The first night: pizza on the boxes, the dog asleep.
    R.mover(() => ({ x: 6.3, y: 6.4 }), (ctx, t, p) => {
      person(ctx, p.x, p.y, 0.1, { ...OWNER2_LOOK, pose: 'sit', dir: 'l', arms: [1.6 + Math.sin(t * 1.5) * 0.3, 0.5] }, t);
      box(ctx, 5.0, 6.0, 0, 0.9, 0.9, 0.7, C.woodLight, { flat: true, lw: 0.03 });
      box(ctx, 4.95, 5.95, 0.7, 1.0, 1.0, 0.08, C.white, { flat: true, lw: 0.03 });
      if (Q.detail) { const [X, Y] = P(5.45, 6.45, 0.79); ctx.beginPath(); ctx.moveTo(X - 0.3, Y); ctx.lineTo(X + 0.25, Y - 0.12); ctx.lineTo(X + 0.2, Y + 0.14); ctx.closePath(); paint(ctx, C.mustard, { lw: 0.02, dots: C.red, density: 0.3 }); }
      if (Q.detail && t % 19 < 3) speech(ctx, p.x, p.y, 2.2, 'First night!', { size: 0.4 });
    }, { on: during(19.2, 29), bias: 0.3 });

    // The bike's mat and water bottle, waiting for a bike that went upstairs.
    R.thing(BIKE_HOME[0], BIKE_HOME[1], (ctx) => rect(ctx, 10.0, 6.3, 2.0, 1.0, 0.02, shade(C.grey, 0.35), { lw: 0.03 }), { on: after, depth: 5 });
    const home = (t) => { const sg = saga(t); return !!sg && sg.stop === 1 && !sg.bike.carried; };
    R.thing(11.4, 7.2, (ctx) => bike(ctx, BIKE_HOME[0], BIKE_HOME[1], 0.02), { on: home });
    R.mover((t) => (home(t) ? { x: 11.3, y: 6.95 } : { x: 11.0, y: 6.55 }), (ctx, t, p) => {
      if (home(t)) bottle(ctx, 11.3, 6.95, 0.86);
      else bottle(ctx, 11.0, 6.55, 0.02);
    }, { on: after, bias: 0.3 });
    R.find({ id: 'bottle', label: "The bike's water bottle", at: (t) => (home(t) ? [11.3, 6.95, 1.1] : [11.0, 6.55, 0.3]), r: 0.88, ...AFTER });

    // The bike's trip, whenever it's on this floor (the stairs up to the
    // penthouse are this floor's), and its movers.
    sagaOn(R, 1);

    // The owner: asks the speaker things all day, waits for the bike, rides
    // it by night looking out at the harbor.
    R.mover((t) => OWNER(H(t)), (ctx, t, p) => {
      const h = H(t);
      if (h >= RIDE0 && h < RIDE1) return;
      person(ctx, p.x, p.y, 0, { ...OWNER_LOOK, pose: p.pose, dir: p.dir, back: p.back }, t);
      const tk = talk(t);
      const say = p.say || (tk && tk.who === 'owner' && !p.moving ? tk.text : null);
      if (say && Q.detail) speech(ctx, p.x, p.y, 2.7, say, { size: 0.42 });
    }, { on: during(7.5, RIDE0) });
    R.mover(() => ({ x: SX, y: SY }), (ctx, t) => {
      const tk = talk(t);
      if (tk && tk.who === 'speaker' && Q.detail) speech(ctx, SX, SY, SZ + 0.45, tk.text, { size: 0.42, fill: tint(C.tealLight, 0.6) });
    }, { on: (t) => !!talk(t), bias: 6 });
    // The ride: pedalling, the screen's glow, the instructor.
    R.mover(() => ({ x: BIKE_HOME[0] - 0.45, y: BIKE_HOME[1] }), (ctx, t, p) => {
      person(ctx, p.x, p.y, 0.62, { ...OWNER_LOOK, pose: 'run', dir: 'r', speed: 11, arms: [1.35, 1.25] }, t);
      if (!Q.detail) return;
      const k = Math.floor(t / 7);
      if (t % 7 < 3) speech(ctx, BIKE_HOME[0] + 0.3, BIKE_HOME[1] - 0.2, 2.3, COACH[k % COACH.length], { size: 0.38, fill: C.black, color: C.white });
      else if (k % 5 === 2 && t % 7 > 3.5 && t % 7 < 6.5) speech(ctx, p.x, p.y, 3.1, 'Best view in Southie.', { size: 0.4 });
    }, { on: during(RIDE0, RIDE1), bias: 0.4 });
    R.light({ at: [BIKE_HOME[0] + 0.3, BIKE_HOME[1], 1.9], r: 2.2, color: C.tealLight, k: (t) => (during(RIDE0, RIDE1)(t) ? 0.55 + Math.sin(t * 5) * 0.08 : 0) });
    // After the ride: asleep on the sofa.
    R.mover(() => ({ x: 10.4, y: 3.6 }), (ctx, t, p) => person(ctx, p.x, p.y, 0.7, { ...OWNER_LOOK, pose: 'sleep' }, t), { on: during(RIDE1, 29) });

    // The designer: two swatches of white against the white wall.
    R.mover(() => ({ x: 1.3, y: 8.4 }), (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, { ...folk(951, { top: C.black, bottom: C.black, style: 'bun', dress: false }), dir: 'l', arms: [2.3, 2.1] }, t);
      onLeft(ctx, 7.85, 2.2, 0.35, 0.45, C.white, { lw: 0.025 });
      onLeft(ctx, 8.4, 2.2, 0.35, 0.45, tint(C.white, 0.4), { lw: 0.025 });
      if (Q.detail && t % 15 < 4) speech(ctx, p.x, p.y, 2.7, 'This white, or this white?', { size: 0.42 });
    }, { on: during(13.4, 18.2) });

    // The movers, once the bike's home: box after box up from the truck.
    [0, 1].forEach((i) => {
      R.mover((t) => {
        const k = pulse(t + i * 5, 10);
        const A = [6.6, 2.6], B = [5.6 + i * 0.8, 6.6];
        const f = k < 0.4 ? k / 0.4 : k < 0.5 ? 1 : k < 0.9 ? 1 - (k - 0.5) / 0.4 : 0;
        return { x: A[0] + (B[0] - A[0]) * f, y: A[1] + (B[1] - A[1]) * f, carry: k < 0.45, moving: (k < 0.4) || (k > 0.5 && k < 0.9), dir: k < 0.45 ? 'l' : 'r' };
      }, (ctx, t, p) => {
        person(ctx, p.x, p.y, 0, { ...MOVER[i], pose: p.moving ? 'walk' : 'stand', dir: p.dir, arms: p.carry ? [1.25, 1.25] : undefined }, t);
        if (p.carry) carton(ctx, p.x - 0.35, p.y - 0.3, 1.25, 0.7, 0.6, 0.55);
      }, { on: during(16.5, 18.6) });
    });

    // ---------- The balcony ----------
    // An olive tree and a moving blanket over the rail, after noon.
    onPorch(R, 13.4, 3.7, (ctx) => {
      box(ctx, 13.0, 3.3, 0, 0.8, 0.8, 0.7, C.white, { lw: 0.03 });
      for (const [dx, dy, dz, r] of [[0, 0, 2.0, 0.55], [-0.3, 0.2, 1.7, 0.4], [0.3, -0.2, 1.75, 0.42], [0.1, 0.1, 2.4, 0.38]]) {
        const [X, Y] = P(13.4 + dx, 3.7 + dy, dz);
        ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2);
        paint(ctx, mix(C.leaf, C.grey, 0.35), { dots: shade(C.leaf, 0.4), density: 0.2 });
      }
      bar(ctx, [13.4, 3.7, 0.7], [13.4, 3.7, 1.6], C.brown, 0.08);
    }, { on: after });
    onPorch(R, 14.6, 1.6, (ctx) => {
      const rx = PORCH.x1 - 0.14;
      face(ctx, [[rx - 0.05, 0.6, 1.12], [rx - 0.05, 2.6, 1.12], [rx - 0.05, 2.6, 0.3], [rx - 0.05, 0.6, 0.3]], C.purple, { lw: 0.03, dots: shade(C.purple, 0.4), density: 0.2 });
      face(ctx, [[rx + 0.05, 0.6, 1.12], [rx + 0.05, 2.6, 1.12], [rx + 0.05, 2.6, 0.45], [rx + 0.05, 0.6, 0.45]], tint(C.purple, 0.15), { lw: 0.03 });
    }, { on: during(13.5, 29) });
    rails(R);
  },
};
