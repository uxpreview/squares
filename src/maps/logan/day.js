// The day before Thanksgiving at Logan: everyone on the airport's clock
// (clock.js) who goes from one area to another. The engine draws each of them
// in whichever area they're in. The areas draw everyone who stays put.
//
//    5am   the Courier steps off the water taxi with a parcel for "G. Goose,
//          Flight 1" and joins the check-in queue
//    8:30  a family running late bursts in from the curb, cuts every line and
//          sprints to C14, where it says DELAYED. They camp there all day
//    9:41  the Courier's parcel goes through the X-ray (it's a loaf of bread)
//   11:15  he's at C12 on his folding stool, waiting for Flight 1 to Orlando,
//          ON TIME all day; a beanie over his cap once it snows; asleep by nine
//   all day bag trains, four trips, from the bag room along the service road
//          to C14 and C13 and back; an airport cart beeps up and down the
//          concourse with an old man in the back who just likes the ride
//   11:30pm the ground stop lifts. A tug pushes Flight 1 back from C12 and
//          tows it down the runway to its end. The Courier wakes up
//   11:57  Flight 1 holds at the runway's end (the ending: finale.js), the
//          Courier at C12's window holding up his parcel
//   12:01am it takes off, gear up, out over the pier and the harbor
//   12:30  the Courier runs for the last water taxi home, to try again
//          tomorrow
//
// Where they walk, for the areas to keep clear (x, y; see each walk below):
// the Courier from the dock (6.4, 4.4) over the road to check-in's door
// (18.6, 12), the queue at (15.6 to 17.2, 17.1), along y 19 past the kiosks to
// X-ray lane A's start (37.2, 16.6), round it by x 39.4 to its end (37.6,
// 25.5), along y 25.7 to his stool at C12 (59, 24.2) and the window (58.4,
// 29.1); home by x 53.4, y 16.4 and y 13.1. The family runs the same way (y
// 13 in check-in, y 16.6 in security, y 25.9 down the concourse) to C14
// (89.6, 24.6). The cart drives y 16.9 from x 54.5 to 100.5. The bag train
// runs two lanes, y 47.2 out and y 45.9 back, from x 14 in the bag room to
// x 99.5, through a door in the bag room's right wall. Flight 1 parks with
// its nose at (62, 33), its door at (63.2, 36), the pushback tug at its nose.
//
// npm run qa checks every walk: never faster than a run (planes taxi at a
// run, toy planes).
import { C, Q, P, SKIN, HAIR, folk, person, face, paint, speech, glow, alpha, mix, tint, shade, paintText, rigid } from '../../engine/art.js';
import { schedule } from '../../engine/actors.js';
import { INK, LIVERY, RAMP, LIT, dusk, nightPrint } from './style.js';
import { solid, hexa, frame, tug, cart, bag, look, plane, shutEyes, zzz, asleep as asleep_, lieAlong } from './kit.js';
import { GATES, NOSE, PLANE, CENTER } from './plan.js';
import { LOOP, at, hour, lightsOn, settle } from './clock.js';
import { finale, ending, LINEUP, ROLL_AT, radio, radioBubble, crossers } from './finale.js';

const wrap = (t) => (((t % LOOP) + LOOP) % LOOP);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const same = (c) => c;
// Speech only close up, where it can be read.
const near = () => Q.detail && Q.pxPerUnit >= 12;
const say = (ctx, x, y, z, text, o = {}) => { if (text && near()) speech(ctx, x, y, z, text, { size: 0.42, ...o }); };
// One of a list of lines, said for `on` seconds every `every`.
function lines(t, list, every, on, off = 0) {
  const k = (((t + off) % every) + every) % every;
  return k < on ? list[Math.floor((t + off) / every) % list.length] : null;
}
// Which way someone faces on the screen, walking or driving (hx, hy).
const facing = (hx, hy) => ({ dir: hx - hy >= 0 ? 'r' : 'l', back: hx + hy < -0.01 });
// ---------- The Courier ----------
// The shared universe's delivery man: a mustard jacket, brown trousers, his
// brown cap and his satchel, and the parcel for G. Goose, Flight 1.
const BROWN = C.brown;
const SKIN_C = SKIN[2];
// The brown paper the parcel's wrapped in.
const KRAFT = mix(C.wood, C.woodLight, 0.55);
// His cap, brown with a butter badge; and from three, when it snows, a
// cranberry beanie pulled on over it (the brim still showing).
function cap(g, hy, back) {
  g.beginPath();
  g.arc(0.02, hy - 0.04, 0.33, Math.PI, 0);
  if (!back) g.rect(0.14, hy - 0.08, 0.32, 0.07);
  paint(g, shade(BROWN, 0.1), { lw: 0.05 });
  if (Q.detail && !back) { g.fillStyle = C.butter; g.fillRect(-0.02, hy - 0.27, 0.12, 0.08); }
}
function beanie(g, hy, back) {
  if (!back) { g.beginPath(); g.rect(0.14, hy - 0.08, 0.32, 0.07); paint(g, shade(BROWN, 0.1), { lw: 0.04 }); }
  g.beginPath();
  g.arc(0.02, hy - 0.06, 0.35, Math.PI, 0);
  g.closePath();
  paint(g, INK.cranberry, { lw: 0.05, dots: Q.detail ? shade(INK.cranberry, 0.45) : null, density: 0.2 });
  g.beginPath(); g.rect(-0.34, hy - 0.12, 0.72, 0.1); paint(g, tint(INK.cranberry, 0.2), { lw: 0.04 });
  g.beginPath(); g.arc(0.02, hy - 0.44, 0.09, 0, Math.PI * 2); paint(g, C.white, { lw: 0.035 });
}
// The satchel's strap across him, the bag at his hip.
function satchel(g, b) {
  if (!Q.detail) return;
  if (!b.back) {
    g.strokeStyle = shade(BROWN, 0.3); g.lineWidth = 0.07;
    g.beginPath(); g.moveTo(0.2, b.top + 0.08); g.lineTo(-0.22, b.hipY - 0.12); g.stroke();
  }
  g.beginPath(); g.roundRect(-0.42, b.hipY - 0.26, 0.24, 0.24, 0.04); paint(g, BROWN, { lw: 0.03 });
  // The jacket's zip.
  if (!b.back) { g.strokeStyle = shade(C.mustard, 0.4); g.lineWidth = 0.025; g.beginPath(); g.moveTo(0.06, b.top + 0.05); g.lineTo(0.06, b.hipY); g.stroke(); }
}
const courierLook = folk(300, { skin: SKIN_C, hair: HAIR[1], style: 'short', top: C.mustard, bottom: BROWN, dress: false, shoes: C.black, wear: satchel });
const courierFace = (snow, asleep) => (g, hy, back) => {
  if (asleep && !back) shutEyes(g, hy, SKIN_C);
  if (snow) beanie(g, hy, back); else cap(g, hy, back);
};

// The parcel, in his own units (facing right; the engine flips him when he
// faces left, so the label's flipped back): brown paper, string both ways,
// the label, and once it's been through the X-ray, a strip of red tape.
export function parcel(g, o = {}) {
  g.beginPath(); g.rect(-0.14, -0.2, 0.5, 0.34); paint(g, KRAFT, { lw: 0.035 });
  g.beginPath(); g.moveTo(-0.14, -0.2); g.lineTo(-0.04, -0.29); g.lineTo(0.46, -0.29); g.lineTo(0.36, -0.2); g.closePath();
  paint(g, tint(KRAFT, 0.3), { lw: 0.035 });
  if (!Q.detail) return;
  // The string, round both ways and over the top.
  g.strokeStyle = shade(KRAFT, 0.55); g.lineWidth = 0.022;
  g.beginPath();
  g.moveTo(0.06, -0.2); g.lineTo(0.06, 0.14);
  g.moveTo(-0.14, -0.04); g.lineTo(0.36, -0.04);
  g.moveTo(0.06, -0.2); g.lineTo(0.16, -0.29);
  g.moveTo(-0.09, -0.245); g.lineTo(0.41, -0.245);
  g.stroke();
  if (o.taped) { g.fillStyle = alpha(C.red, 0.85); g.beginPath(); g.moveTo(0.22, -0.2); g.lineTo(0.36, -0.2); g.lineTo(0.36, -0.08); g.closePath(); g.fill(); }
  // The label.
  g.beginPath(); g.rect(0.12, 0.0, 0.2, 0.11); paint(g, C.white, { lw: 0.015 });
  if (Q.pxPerUnit < 34) { g.fillStyle = C.ink; g.fillRect(0.14, 0.03, 0.15, 0.018); g.fillRect(0.14, 0.07, 0.11, 0.018); return; }
  g.save();
  g.translate(0.22, 0.055);
  if (o.flip) g.scale(-1, 1);
  g.scale(1 / 40, 1 / 40);
  g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '1.7px "Rethink Sans", sans-serif';
  g.fillText('G. GOOSE', 0, -1);
  g.fillText('FLIGHT 1', 0, 1.1);
  g.restore();
}

// His day. The X-ray: the parcel goes on lane A's belt at 9:41 and he
// collects it at the far end (XRAY, below, for Security's screen).
const ARRIVE = at(5), XRAY_IN = at(9 + 41 / 60), XRAY_OUT = 89;
const DOCK = [6.4, 4.4];
const S12 = [59.0, 24.2], W12 = [58.4, 29.1]; // his stool at C12, and the window
const T_WAKE = 293, T_HOME = 330;
const courierWalk = schedule([
  DOCK, { until: ARRIVE, hide: true },
  // Off the water taxi, over the road, in the door and into the queue.
  // (The queue doesn't move. That's the joke.)
  [9.8, 4.4], [12.4, 8.8], [18.6, 11.0], [18.6, 13.2], [17.0, 17.2], { until: 64, pose: 'queue' },
  // Late for security: along the queue's lane, past the kiosks, to lane A.
  { speed: 1.8 },
  [24, 17.1], [26.4, 19.0], [33.8, 19.0], [35.4, 16.8], [37.2, 16.6], { until: XRAY_IN + 0.4, pose: 'place', dir: 'l', back: false },
  { speed: 1.3 },
  [39.4, 16.8], [39.4, 24.9], [37.6, 25.5], { until: XRAY_OUT + 3.4, pose: 'collect', dir: 'r', back: true },
  // To C12, and his stool, for Flight 1, ON TIME.
  { speed: 1.6 },
  [41.2, 25.8], [53.2, 25.7], S12, { until: T_WAKE, pose: 'sit', dir: 'l', back: false },
  // Awake: it's going! To the window.
  { speed: 3 },
  W12, { until: T_HOME, pose: 'window', dir: 'l', back: false },
  // The last water taxi.
  { speed: 2.5 },
  [53.4, 25.6], [53.4, 16.4], [30.6, 16.4], [29.0, 13.1], [18.6, 13.1], [18.6, 11.0], [12.4, 8.8], [9.8, 4.4], DOCK,
  { wait: 0.6, pose: 'board' }, { until: LOOP, hide: true },
], { loop: LOOP, name: 'The Courier', speed: 1.3 });
const T_STOOL = 106; // when he gets to C12 (the stool unfolds)
// The parcel rides lane A's belt on its own: in the tunnel from 81.3s to
// 84.3s (Security can show the loaf on its screen then: XRAY).
const BELT = [37.2, 17.9, 24.3], BELT_V = 0.73;
export const XRAY = { lane: 'a', from: XRAY_IN + (19.6 - BELT[1]) / BELT_V, to: XRAY_IN + (21.8 - BELT[1]) / BELT_V, what: 'A LOAF OF BREAD' };
const parcelWalk = schedule([
  [BELT[0], BELT[1]], { until: XRAY_IN }, { speed: BELT_V }, [BELT[0], BELT[2]], { until: LOOP - 4 }, { speed: 2 },
], { loop: LOOP, name: 'The parcel' });

function courierDraw(ctx, t, p) {
  if (p.hide) return;
  const s = wrap(t), h = hour(t);
  let a = 1;
  if (s < ARRIVE + 0.6) a = clamp((s - ARRIVE) / 0.6);
  if (p.pose === 'board') a = clamp((LOOP - 1 - s) / 0.6);
  if (a <= 0) return;
  const has = !(s >= XRAY_IN && s < XRAY_OUT);
  const taped = s >= XRAY_OUT;
  const flip = p.dir === 'l';
  const snow = h >= 15 || h < 3;
  let pose = p.moving ? (p.speed > 2.2 ? 'run' : 'walk') : 'stand';
  let arms = null, hold = null, z = 0, line = null, asleep = false, sayZ = 2.9;
  const pk = (o = {}) => (g) => parcel(g, { flip, taped, ...o });
  if (p.moving) {
    if (has) hold = (g) => { g.translate(-0.3, 0.22); pk()(g); };
    if (p.speed > 2.2 && s > T_HOME) line = s < T_HOME + 4 ? 'The water taxi!' : null;
  } else if (p.pose === 'queue') {
    pose = 'carry'; hold = pk();
    // He checks his watch now and then.
    if ((s % 13) < 1.3) arms = [2.3, 1.1];
    line = lines(t, ['Is this the line for Flight 1?', 'G. Goose? Anybody?', 'It moved! No.', 'Still Flight 1. Still on time.'], 11, 3.2, 2);
  } else if (p.pose === 'place') {
    if (has) { pose = 'carry'; arms = [1.0, 0.9]; hold = (g) => { g.translate(0.05, 0.12); pk()(g); }; } else arms = [0.6, 0.4];
    line = s > XRAY_IN - 2.5 ? 'Careful with it.' : null;
  } else if (p.pose === 'collect') {
    if (has) { pose = 'carry'; hold = pk(); line = s < XRAY_OUT + 3.4 ? 'It\'s bread?' : null; }
  } else if (p.pose === 'sit') {
    pose = 'sit'; z = -0.3; sayZ = 2.5;
    arms = [0.75, 0.65];
    hold = (g) => { g.translate(-0.12, 0.28); pk()(g); };
    asleep = s >= at(21) || h < 4;
    if (asleep) arms = [0.35, 0.25];
    else if (h < 18) line = lines(t, ['On time, it says.', 'Any minute now.', 'Passenger Goose?', 'Flight 1. Still on time.'], 12, 3.4, 4);
    else line = lines(t, ['Everything canceled. Except us.', 'Still on time!', 'They can\'t cancel us.'], 12, 3.4, 4);
  } else if (p.pose === 'window') {
    // Holding the parcel up to the glass as Flight 1 goes without him.
    const going = ending(t) ? finale.since < ROLL_AT + 14 : s < 323;
    if (going) {
      pose = 'stand'; arms = [Math.PI - 0.38, -Math.PI + 0.38];
      const bob = Math.sin(t * 9) * 0.04;
      hold = (g) => { g.translate(-0.44, -1.19 + bob); pk()(g); };
      sayZ = 3.6;
      line = s < 298.5 ? 'Wait!' : s > 300.5 && s < 306 ? 'Parcel for G. Goose!' : s > 313 && s < 317.5 ? 'Flight 1!' : null;
    } else { pose = 'carry'; hold = pk(); line = s < 327.5 ? 'Tomorrow, then.' : null; }
  } else if (p.pose === 'board') {
    pose = 'carry'; hold = pk();
  }
  const a0 = ctx.globalAlpha;
  if (a < 1) ctx.globalAlpha = a0 * a;
  person(ctx, p.x, p.y, z, {
    ...courierLook, pose, dir: p.dir, back: p.back, hold,
    ...(arms ? { arms } : {}),
    face: courierFace(snow, asleep),
  }, asleep ? 0 : t);
  ctx.globalAlpha = a0;
  if (asleep) zzz(ctx, p.x, p.y, 2.3, t);
  say(ctx, p.x, p.y, sayZ, line);
}

// His folding stool at C12: unfolded when he sits down, knocked over when he
// jumps up for Flight 1, and left there for the night.
function stoolDraw(ctx, t) {
  const s = wrap(t);
  if (s < T_STOOL) return;
  const [x, y] = S12;
  const legs = shade(C.grey, 0.2), seat = C.navy;
  const line = (a, b, w) => { const [ax, ay] = P(...a), [bx, by] = P(...b); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineWidth = w; ctx.stroke(); };
  ctx.lineCap = 'round';
  if (s >= T_WAKE) {
    // On its side.
    ctx.strokeStyle = C.ink;
    line([x - 0.3, y + 0.1, 0.05], [x + 0.3, y + 0.5, 0.05], 0.09);
    line([x - 0.3, y + 0.5, 0.05], [x + 0.3, y + 0.1, 0.05], 0.09);
    ctx.strokeStyle = legs;
    line([x - 0.3, y + 0.1, 0.05], [x + 0.3, y + 0.5, 0.05], 0.05);
    line([x - 0.3, y + 0.5, 0.05], [x + 0.3, y + 0.1, 0.05], 0.05);
    face(ctx, [[x + 0.3, y + 0.05, 0.02], [x + 0.36, y + 0.55, 0.02], [x + 0.36, y + 0.55, 0.42], [x + 0.3, y + 0.05, 0.42]], seat, { lw: 0.03 });
    return;
  }
  const k = clamp((s - T_STOOL) / 0.6), top = 0.12 + 0.38 * k, wd = 0.08 + 0.2 * k;
  // Two pairs of legs crossed in an X, and the canvas seat slung over them.
  for (const dy of [-0.2, 0.2]) {
    ctx.strokeStyle = C.ink;
    line([x - wd, y + dy, 0], [x + wd, y + dy, top], 0.09);
    line([x + wd, y + dy, 0], [x - wd, y + dy, top], 0.09);
    ctx.strokeStyle = legs;
    line([x - wd, y + dy, 0], [x + wd, y + dy, top], 0.05);
    line([x + wd, y + dy, 0], [x - wd, y + dy, top], 0.05);
  }
  face(ctx, [[x - wd, y - 0.24, top], [x + wd, y - 0.24, top], [x + wd, y + 0.24, top - 0.03], [x - wd, y + 0.24, top - 0.03]], seat, { lw: 0.03 });
}

// ---------- Flight 1 ----------
// Spite's yellow toy plane (the kit's, decision 10), parked at C12 all day
// with its door open, ON TIME and never boarding. At 11:30pm a tug pushes it
// back, and, tail first, round onto the runway and down to its end; it holds
// there (the ending), then takes off to the left, gear up, out over the pier
// and the harbor, lights blinking, and fades into the snow. It's back at C12
// by morning (out of sight: the trip back is hidden).
//
// It turns as it goes, so it's drawn here rather than with the kit's plane
// (which points along x or y): the same toy, in a frame that can point any
// way. And it's drawn in pieces, each piece one walker on the clock, so the
// people round it sort in front of or behind each piece and no piece is cut
// off by an area's edge. If the Apron calls flight1AtGate(R) in its build,
// the parked plane is the kit's (drawn once and cached) and the pieces only
// draw it once it moves.
const R0 = PLANE.body / 2, HC = 0.62 + R0, SP = PLANE.span / 2;
const BODY = [[0, 0.22, -0.28], [-0.55, 0.62, -0.12], [-1.6, 0.92, -0.02], [-2.6, 1, 0], [-4.6, 1, 0], [-6.6, 1, 0], [-8.6, 1, 0], [-10.2, 0.8, 0.28], [-11.7, 0.52, 0.62], [-13, 0.24, 0.9]];
const RING = [[-0.42, 1], [0.42, 1], [1, 0.42], [1, -0.42], [0.42, -1], [-0.42, -1], [-1, -0.42], [-1, 0.42]];
function section(u) {
  for (let i = 1; i < BODY.length; i++) {
    const [u0, s0, r0] = BODY[i - 1], [u1, s1, r1] = BODY[i];
    if (u >= u1) { const k = (u0 - u) / (u0 - u1); return [s0 + (s1 - s0) * k, r0 + (r1 - r0) * k]; }
  }
  return [BODY[BODY.length - 1][1], BODY[BODY.length - 1][2]];
}
// A frame for something pointing any way on the ground (f, a unit vector): u
// along it (+ toward its front), v across it, + toward the side you see (as
// the kit's frame does), h up from z.
function aframe(x, y, z, fx, fy) {
  let sx = -fy, sy = fx;
  if (sx + sy < 0) { sx = -sx; sy = -sy; }
  const at = (u, v) => [x + u * fx + v * sx, y + u * fy + v * sy];
  const pt = (u, v, h) => { const [a, b] = at(u, v); return [a, b, z + h]; };
  return { at, pt, fx, fy, sx, sy };
}
// A box in such a frame.
function rbox(ctx, F, u0, u1, v0, v1, h0, h, color, o = {}) {
  const a = [F.pt(u0, v0, h0), F.pt(u1, v0, h0), F.pt(u1, v1, h0), F.pt(u0, v1, h0)];
  solid(ctx, hexa(a, a.map((p) => [p[0], p[1], p[2] + h]), color, o.top ? { top: o.top } : {}), { ink: o.ink, lw: o.lw });
}
const thick = (F, pts, d) => pts.map((p) => [p[0] + F.sx * d, p[1] + F.sy * d, p[2]]);

// The shadow's outline (the kit's planeShadow), cut into pieces that tile it:
// the body's strip under each length, each wing, each tailplane. Each piece
// is drawn by the piece of plane over it, just before it.
function coreW(u) {
  if (u > -1.6) return R0 * (-u / 1.6);
  if (u > -8.4) return R0;
  if (u > -11.1) return R0 + (R0 * 0.6 - R0) * ((-8.4 - u) / 2.7);
  return R0 * 0.6;
}
function coreShadow(u0, u1) {
  const us = [u0, ...[-1.6, -8.4, -11.1].filter((u) => u < u0 && u > u1), u1];
  return [...us.map((u) => [u, coreW(u)]), ...us.slice().reverse().map((u) => [u, -coreW(u)])];
}
const wingShadow = (k) => [[-5.2, k * R0], [-8.2, k * SP], [-9.5, k * SP], [-8.4, k * R0]];
const stabShadow = (k) => [[-11.1, k * R0 * 0.6], [-12.6, k * 3.1], [-13, k * 3.1], [-13, k * R0 * 0.6]];

// Flight 1 in pieces, posed by q: { x, y (its nose), fx, fy (the way it
// points), air, gear, door, lit, night, alpha, t }. Returns { id: { draw } }.
function flightParts(q) {
  const L = LIVERY.spite, body = L.body;
  const ink = q.night ? dusk : same, lit = q.lit, t = q.t;
  const F = aframe(q.x, q.y, q.air, q.fx, q.fy);
  // The shadow: on the ground under it, falling back and paling as it climbs.
  const back = q.air * 0.5;
  const G = aframe(q.x + back * 0.4, q.y + back, 0.012, q.fx, q.fy);
  const shade0 = Math.max(0, 0.16 - q.air * 0.012) * clamp(1 - q.air / 3.5);
  const shadow = (pts) => (ctx) => {
    if (shade0 < 0.01) return;
    face(ctx, pts.map(([u, v]) => G.pt(u, v, 0)), alpha(C.ink, shade0), { stroke: false });
  };
  const parts = {};
  const part = (id, draw) => { parts[id] = draw; };

  part('gear', (ctx) => {
    if (!q.gear) return;
    for (const [u, v] of [[-1.7, 0], [-7.4, -1.1], [-7.4, 1.1]]) {
      rbox(ctx, F, u - 0.05, u + 0.05, v - 0.04, v + 0.04, 0.15, HC - R0 - 0.1, C.grey, { lw: 0.015 });
      rbox(ctx, F, u - 0.17, u + 0.17, v - 0.1, v + 0.1, 0, 0.32, C.ink, { lw: 0.015 });
    }
  });
  // A wing, its engine under it, and its winglet. side: 1 on the side you
  // see, -1 the far one.
  const wing = (side) => (ctx) => {
    shadow(wingShadow(side))(ctx);
    // The engine first (it hangs under the wing).
    const v = side * 3.4, h = HC - R0 - 0.1, r = 0.55;
    const pod = (u, s) => RING.map(([a, b]) => F.pt(u, v + a * r * s, h + b * r * s));
    const rings = [pod(-4.3, 0.9), pod(-4.6, 1), pod(-6.2, 1), pod(-6.8, 0.6)];
    const faces = [];
    for (let i = 0; i < rings.length - 1; i++) for (let k = 0; k < 8; k++) faces.push({ pts: [rings[i][k], rings[i][(k + 1) % 8], rings[i + 1][(k + 1) % 8], rings[i + 1][k]], fill: mix(body, C.grey, 0.35) });
    faces.push({ pts: [...rings[0]].reverse(), fill: C.ink, flat: true });
    faces.push({ pts: rings[rings.length - 1], fill: C.grey });
    const pylon = [F.pt(-4.9, v - 0.08, h + r * 0.6), F.pt(-6.2, v - 0.08, h + r * 0.6), F.pt(-6.4, v - 0.08, HC - R0 * 0.5), F.pt(-5.2, v - 0.08, HC - R0 * 0.5)];
    solid(ctx, hexa(pylon, thick(F, pylon, 0.16), mix(body, C.grey, 0.25)), { ink });
    solid(ctx, faces, { ink });
    if (side > 0 && Q.detail) {
      const band = [F.pt(-4.75, v + r * 1.01, h + 0.15), F.pt(-5.15, v + r * 1.01, h + 0.15), F.pt(-5.15, v + r * 1.01, h - 0.25), F.pt(-4.75, v + r * 1.01, h - 0.25)];
      face(ctx, band, ink(L.stripe), { stroke: false });
    }
    // Snow kicked up behind the engine on the roll.
    if (q.roll && q.air < 0.8 && Q.detail) {
      const puff = 0.45 * clamp(settle(t) * 2) * clamp(1 - q.air / 0.8);
      for (let i = 0; i < 8; i++) {
        const k = (t * 1.8 + i / 8) % 1;
        const [X, Y] = P(...G.pt(-7 - k * 5, v + Math.sin(i * 2.7) * (0.25 + k * 0.9), 0.15 + k * 0.5));
        const rr = 0.08 + k * 0.22;
        ctx.fillStyle = alpha(C.white, puff * (1 - k));
        ctx.beginPath(); ctx.arc(X, Y, rr, 0, Math.PI * 2); ctx.fill();
      }
    }
    const v0 = side * R0 * 0.7, v1 = side * SP, h0 = HC - R0 * 0.55, h1 = HC - R0 * 0.2;
    const a = [F.pt(-5.1, v0, h0), F.pt(-8.2, v0, h0), F.pt(-9.5, v1, h1), F.pt(-8.2, v1, h1)];
    const b = a.map((p, i) => [p[0], p[1], p[2] + (i < 2 ? 0.26 : 0.12)]);
    solid(ctx, hexa(a, b, mix(body, C.grey, 0.18), { top: body }), { ink });
    const tip = [F.pt(-8.15, v1, h1 + 0.1), F.pt(-9.45, v1, h1 + 0.1), F.pt(-9.6, v1, h1 + 0.9), F.pt(-9.05, v1, h1 + 0.9)];
    solid(ctx, hexa(tip, thick(F, tip, 0.12), L.tail), { ink });
    if (lit && Q.detail) {
      glow(ctx, ...F.pt(-9.3, v1, h1 + 0.2), 0.9, side > 0 ? C.green : C.red, 0.8);
      // The strobe, a white flash now and then.
      if ((t * 1.1 + (side > 0 ? 0.5 : 0)) % 1 < 0.07) glow(ctx, ...F.pt(-9.5, v1, h1 + 0.3), 1.6, C.white, 0.95);
    }
  };
  const stab = (side) => (ctx) => {
    shadow(stabShadow(side))(ctx);
    const v0 = side * R0 * 0.3, v1 = side * 3.1, hh = HC + 0.62;
    const a = [F.pt(-11.1, v0, hh), F.pt(-12.7, v0, hh), F.pt(-13, v1, hh + 0.25), F.pt(-12.3, v1, hh + 0.25)];
    solid(ctx, hexa(a, a.map((p, i) => [p[0], p[1], p[2] + (i < 2 ? 0.16 : 0.08)]), mix(body, C.grey, 0.1), { top: body }), { ink });
  };
  part('wingNear', wing(1));
  part('wingFar', wing(-1));
  part('stabNear', stab(1));
  part('stabFar', stab(-1));

  // The body, in lengths between its sections.
  const ring = (u, s, rise) => RING.map(([v, h]) => F.pt(u, v * R0 * s, HC + rise + h * R0 * s * 1.04));
  const side = (u, h) => { const [sc, rise] = section(u); return F.pt(u, R0 * sc * 1.012, HC + rise + h * sc); };
  for (let i = 0; i < BODY.length - 1; i++) {
    const [u0, s0, r0] = BODY[i], [u1, s1, r1] = BODY[i + 1];
    const A = ring(u0, s0, r0), B = ring(u1, s1, r1);
    const faces = [];
    for (let k = 0; k < 8; k++) {
      const low = k >= 3 && k <= 6;
      faces.push({ pts: [A[k], A[(k + 1) % 8], B[(k + 1) % 8], B[k]], fill: low ? mix(body, C.grey, 0.22) : body, dots: low ? shade(body, 0.45) : null });
    }
    faces.push({ pts: [...A].reverse(), fill: body, ghost: i > 0 });
    faces.push({ pts: B, fill: body, ghost: i < BODY.length - 2 });
    part('b' + i, (ctx) => {
      shadow(coreShadow(u0, u1))(ctx);
      solid(ctx, faces, { ink });
      if (!Q.detail) return;
      const ua = Math.min(u0, -0.9), ub = Math.max(u1, -10.4);
      if (ua > ub) {
        face(ctx, [side(ua, -0.2), side(ub, -0.2), side(ub, -0.42), side(ua, -0.42)], ink(L.stripe), { stroke: false });
        for (let u = -3.3; u > -10.2; u -= 0.62) {
          if (u > ua || u < ub) continue;
          face(ctx, [side(u, 0.28), side(u - 0.26, 0.28), side(u - 0.26, 0.02), side(u, 0.02)], ink(lit ? LIT : shade(C.sky, 0.35)), { stroke: false });
        }
      }
      if (u0 >= -1.6 && u1 <= -0.55) {
        const top = (u, v, h) => F.pt(u, v, HC + h);
        face(ctx, [top(-0.75, 0.86, 0.32), top(-1.25, 1.02, 0.32), top(-1.3, 0.98, 0.62), top(-0.86, 0.6, 0.62)], ink(lit ? LIT : C.ink), { lw: 0.02 });
        face(ctx, [top(-0.86, 0.6, 0.62), top(-1.3, 0.98, 0.62), top(-1.32, 0.3, 0.95), top(-0.98, 0.2, 0.86)], ink(lit ? tint(LIT, 0.3) : C.navy), { lw: 0.02 });
        if (L.nose) face(ctx, [side(-0.6, -0.2), side(-1.6, -0.2), side(-1.6, -0.42), side(-0.6, -0.42)], ink(L.stripe), { stroke: false });
      }
      if (u0 > -3.2 && u1 < -2.4) {
        // The front door: open at the gate (the jet bridge's), shut after.
        face(ctx, [side(-2.75, 0.46), side(-3.25, 0.46), side(-3.25, -0.48), side(-2.75, -0.48)], ink(q.door > 0.5 ? C.ink : body), { lw: 0.025 });
      }
      if (u0 > -4.4 && u1 < -3.2) {
        const dd = (u, h) => F.pt(u, R0 * 1.02, HC + h);
        face(ctx, [dd(-3.5, -0.62), dd(-4.4, -0.62), dd(-4.4, -1.05), dd(-3.5, -1.05)], ink(mix(body, C.grey, 0.22)), { lw: 0.025 });
      }
      if (i === 4 && lit) {
        // The beacon on top, blinking red.
        if (Math.sin(t * 6) > 0.4) glow(ctx, ...F.pt(-5.6, 0, HC + R0 * 1.1), 1.1, C.red, 0.9);
      }
      if (i === 1) {
        // The taxi light, on the runway ahead of the nose, while it holds and
        // rolls; and the radio, over the cockpit.
        if (lit && q.lamp) glow(ctx, ...G.pt(3.2, 0, 0), 3.4, LIT, 0.5 * q.alpha);
        radioBubble(ctx, ...F.pt(-1.1, 0, HC + R0 + 0.4), q.radio);
      }
    });
  }
  part('fin', (ctx) => {
    const hb = HC + R0 * 0.62, w = 0.09;
    const fin = [F.pt(-9.7, -w, hb), F.pt(-12.9, -w, hb + 0.7), F.pt(-13.2, -w, hb + 3.2), F.pt(-12.2, -w, hb + 3.2)];
    solid(ctx, hexa(fin, thick(F, fin, 2 * w), L.tail), { ink });
    if (lit) glow(ctx, ...F.pt(-13.1, 0, hb + 3.25), 0.7, C.white, 0.6);
    if (!Q.detail) return;
    // The name up the fin, where it points along x or y (in a turn, the
    // fin's plain yellow).
    const ax = Math.abs(F.fx) > 0.995, ay = Math.abs(F.fy) > 0.995;
    if (!ax && !ay) return;
    const along = ax ? 'x' : 'y';
    ctx.save();
    const [fx, fy, fz] = F.pt(-12.15, w * 1.5, hb + 1.85);
    const [dx, dy] = along === 'y' ? P(0, fy, 0) : P(fx, 0, 0);
    ctx.translate(dx, dy);
    paintText(ctx, along === 'y' ? 'right' : 'left', along === 'y' ? fx : fy, fz, L.name, 0.34, ink(L.logo), 'Bagel Fat One');
    ctx.restore();
  });
  return parts;
}

// Its day. At the gate (nose at C12, pointing at the terminal), pushed
// straight back, then round a curve tail first onto the runway's centerline,
// towed down it to the end, held, and away.
const GATE = [GATES.C12, NOSE];
const P_PUSH = 289.5; // 11:30pm, as the ground stop lifts
const PUSH_TO = NOSE + 6, PUSH_V = 1.8;
const ARC_R = CENTER - PUSH_TO, ARC_V = 2.4; // the curve, tail first, onto the centerline
const TOW_V = 3.3;
const T_C = P_PUSH + (PUSH_TO - NOSE) / PUSH_V;
const T_D = T_C + (ARC_R * Math.PI / 2) / ARC_V;
const T_E = T_D + (LINEUP[0] - (GATE[0] + ARC_R)) / TOW_V; // lined up
const T_ROLL = at(24.05); // 12:01am
// The takeoff, from the line-up, tau seconds after it starts rolling: up to
// speed in two seconds, off the ground past the middle of the runway, gear
// up, climbing out over the pier, fading into the snow past the end of it.
function takeoff(tau) {
  const s = tau < 2 ? 0.875 * tau * tau : 3.5 + 3.5 * (tau - 2);
  const x = LINEUP[0] - s, d = Math.max(0, 58 - x);
  const air = (0.11 * d * d) / (d + 4);
  return { x, y: LINEUP[1], fx: -1, fy: 0, air, gear: air < 1.2, alpha: clamp((x + 2) / 12), roll: true, lamp: air < 2, hidden: x <= -2 };
}
const T_GONE = T_ROLL + 2 + (LINEUP[0] + 2 - 3.5) / 3.5; // its nose at x -2

// Its pose at t (as on the clock, or as the ending holds it).
function flightPose(t) {
  const s = wrap(t);
  let q;
  if (ending(t)) {
    const tau = finale.since - ROLL_AT;
    q = tau < 0 ? { x: LINEUP[0], y: LINEUP[1], fx: -1, fy: 0, lamp: true } : takeoff(tau);
    q.radio = radio(finale.since);
  } else if (s < P_PUSH) {
    q = { x: GATE[0], y: GATE[1], fx: 0, fy: -1, door: 1, gate: true };
  } else if (s < T_C) {
    q = { x: GATE[0], y: NOSE + (s - P_PUSH) * PUSH_V, fx: 0, fy: -1 };
  } else if (s < T_D) {
    const phi = ((s - T_C) * ARC_V) / ARC_R;
    q = { x: GATE[0] + ARC_R * (1 - Math.cos(phi)), y: PUSH_TO + ARC_R * Math.sin(phi), fx: -Math.sin(phi), fy: -Math.cos(phi) };
  } else if (s < T_E) {
    q = { x: GATE[0] + ARC_R + (s - T_D) * TOW_V, y: CENTER, fx: -1, fy: 0 };
  } else if (s < T_ROLL) {
    q = { x: LINEUP[0], y: LINEUP[1], fx: -1, fy: 0, lamp: s > T_E + 1 };
    q.radio = s > T_E + 0.5 && s < T_ROLL - 2.4 ? { tower: true, text: 'Tower: Flight 1, hold short.' }
      : s > T_ROLL - 2.2 && s < T_ROLL + 0.6 ? { tower: true, text: 'Tower: Cleared for takeoff.' } : null;
  } else if (s < T_GONE) {
    q = takeoff(s - T_ROLL);
    q.radio = s < T_ROLL + 4 && s > T_ROLL + 1 ? { text: 'Happy Thanksgiving, Boston!' } : null;
  } else q = { ...takeoff(T_GONE - T_ROLL), hidden: true, back: true };
  const night = nightPrint(t);
  return { air: 0, gear: true, door: 0, alpha: 1, lit: night || !q.gate, night, t, ...q };
}
// One pose and one set of pieces a frame, whoever asks.
let poseT = NaN, poseS = NaN, poseQ = null, partsQ = null;
function pose(t) {
  if (t !== poseT || finale.since !== poseS) { poseT = t; poseS = finale.since; poseQ = flightPose(t); partsQ = null; }
  return poseQ;
}
function partsNow(t) {
  const q = pose(t);
  if (!partsQ) partsQ = flightParts(q);
  return partsQ;
}

// The pieces, each a walker: where it stands (u, v in the plane's frame,
// v + on the plane's left, so a piece keeps to its own side through a turn)
// and where the kit would sort it (so the plane sorts as the kit's does).
const PIECES = [
  { id: 'gear', u: -4.6, v: 0, ku: -4.6, kv: 0 },
  { id: 'wingL', u: -7.5, v: SP / 2, wing: 1 },
  { id: 'wingR', u: -7.5, v: -SP / 2, wing: -1 },
  { id: 'stabL', u: -12.5, v: 1.6, stab: 1 },
  { id: 'stabR', u: -12.5, v: -1.6, stab: -1 },
  ...BODY.slice(0, -1).map(([u0], i) => ({ id: 'b' + i, u: (u0 + BODY[i + 1][0]) / 2, v: 0, ku: (u0 + BODY[i + 1][0]) / 2, kv: 0 })),
  { id: 'fin', u: -12.2, v: 0, ku: -12.2, kv: 0.4 },
];
// Where piece pc stands, and how far ahead of that it sorts, with Flight 1
// posed by q. (Its left side is +v when it's the side you see.)
function pieceAt(pc, q) {
  const F = aframe(q.x, q.y, 0, q.fx, q.fy);
  const left = -q.fy * F.sx + q.fx * F.sy > 0 ? 1 : -1; // is its left the side you see?
  const v = pc.v * left;
  let ku = pc.ku, kv = pc.kv, id = pc.id;
  if (pc.wing) { const nearSide = pc.wing * left > 0; ku = nearSide ? -7.4 : -7.6; kv = nearSide ? SP / 2 : -SP / 2; id = nearSide ? 'wingNear' : 'wingFar'; }
  if (pc.stab) { const nearSide = pc.stab * left > 0; ku = nearSide ? -12.4 : -12.6; kv = nearSide ? 1.6 : -1.6; id = nearSide ? 'stabNear' : 'stabFar'; }
  const [x, y] = F.at(pc.u, v), [kx, ky] = F.at(ku, kv);
  // Kept on the map (at the far end of the runway, flying out over the
  // water, it's past the edge), and above everything once it's flying.
  const cx = Math.max(0.1, x);
  return { x: cx, y, ahead: kx + ky - cx - y + (q.air > 0.3 ? 200 : 0), part: id };
}
// Back at the gate overnight, out of sight: each piece slides from where it
// vanished to where it parks.
const GONE_AT = PIECES.map((pc) => pieceAt(pc, flightPose(T_GONE - 0.01)));
const PARK_AT = PIECES.map((pc) => pieceAt(pc, flightPose(0)));
let gateHook = false;
// For the Apron's build: Flight 1 parked at C12, as the kit draws parked
// planes (cached, with its night print), while it's there.
export function flight1AtGate(R) {
  gateHook = true;
  plane(R, GATE[0], GATE[1], { livery: 'spite', door: 1, on: (t) => !ending(t) && wrap(t) < P_PUSH });
}
const flightWalkers = PIECES.map((pc, n) => ({
  id: n ? `flight-1-${pc.id}` : 'flight-1',
  name: 'Flight 1',
  ghost: n > 0,
  color: INK.signal,
  loop: LOOP,
  at(t) {
    const q = pose(t);
    if (q.back && !ending(t)) {
      const k = clamp((wrap(t) - T_GONE) / (LOOP - T_GONE)), a = GONE_AT[n], b = PARK_AT[n];
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, ahead: 0, hidden: true };
    }
    return { ...pieceAt(pc, q), hidden: q.hidden };
  },
  draw(ctx, t, p) {
    const q = pose(t);
    if (p.hidden || q.hidden || (gateHook && q.gate)) return;
    const draw = partsNow(t)[p.part];
    if (!draw) return;
    const a0 = ctx.globalAlpha;
    if (q.alpha < 1) ctx.globalAlpha = a0 * q.alpha;
    draw(ctx);
    ctx.globalAlpha = a0;
  },
}));

// ---------- The pushback tug ----------
// Low and yellow, at Flight 1's nose all day (nobody in it), its driver
// aboard from 11:20. It pushes the plane back, nose to nose, and tows it down
// the runway; then it backs off, leaves the runway and waits on the service
// road out of the wings' way, and drives back to C12 in the small hours.
function pushTug(ctx, x, y, hx, hy, o, t) {
  const F = aframe(x, y, 0, hx, hy), ink = o.ink || same, col = RAMP.tug;
  const depth = (u, v) => { const [a, b] = F.at(u, v); return a + b; };
  const byDepth = (list) => list.sort((a, b) => depth(a[0], a[1]) - depth(b[0], b[1]));
  // The tow bar, out to the nose gear.
  if (o.bar) {
    const [ax, ay] = P(...F.pt(0.72, 0, 0.3)), [bx, by] = P(...F.pt(3.3, 0, 0.32));
    ctx.lineCap = 'round';
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.13; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = ink(INK.signal); ctx.lineWidth = 0.06; ctx.stroke();
  }
  for (const [u, v] of byDepth([[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]])) rbox(ctx, F, u - 0.17, u + 0.17, v - 0.09, v + 0.09, 0, 0.32, C.ink, { lw: 0.02 });
  rbox(ctx, F, -0.7, 0.7, -0.52, 0.52, 0.18, 0.36, ink(col), { lw: 0.04 });
  rbox(ctx, F, 0.25, 0.7, -0.52, 0.52, 0.54, 0.14, ink(shade(col, 0.08)), { lw: 0.035 });
  if (o.driver) {
    const [px, py] = F.at(-0.25, 0), f = facing(hx, hy);
    person(ctx, px, py, 0.22, { ...o.driver, pose: 'sit', dir: f.dir, back: f.back, scale: 0.82 }, t);
  }
  // The roof on its posts, and snow on it.
  for (const [u, v] of byDepth([[-0.62, -0.46], [-0.62, 0.46]])) rbox(ctx, F, u - 0.035, u + 0.035, v - 0.035, v + 0.035, 0.54, 1.12, C.ink, { lw: 0.01 });
  rbox(ctx, F, -0.74, 0.08, -0.54, 0.54, 1.66, 0.08, ink(col), { lw: 0.03 });
  const snow = settle(t);
  if (snow > 0.02) face(ctx, [F.pt(-0.7, -0.5, 1.75), F.pt(0.04, -0.5, 1.75), F.pt(0.04, 0.5, 1.75), F.pt(-0.7, 0.5, 1.75)], alpha(C.white, 0.9 * snow), { lw: 0.015 });
  if (o.lights && Q.detail) {
    // An amber beacon on the roof, and the headlamps.
    const on = (t * 1.6) % 1 < 0.5;
    if (on) glow(ctx, ...F.pt(-0.33, 0, 1.85), 1.2, C.mustard, 0.85);
    for (const v of [-0.34, 0.34]) glow(ctx, ...F.pt(0.72, v, 0.42), 0.6, LIT, 0.8);
  }
}
// A path of straight runs with rounded corners (every corner square), walked
// by distance: at(s) gives the point and the way it's heading.
function track(pts, r, closed = false) {
  const n = pts.length, segs = [];
  const unit = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); return [dx / l, dy / l, l]; };
  const cut = pts.map((p, i) => {
    if (!closed && (i === 0 || i === n - 1)) return 0;
    const [ax, ay] = unit(pts[(i - 1 + n) % n], p), [bx, by] = unit(p, pts[(i + 1) % n]);
    return ax * bx + ay * by > 0.99 ? 0 : r;
  });
  const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const a = pts[i], j = (i + 1) % n, b = pts[j];
    const [dx, dy, l] = unit(a, b);
    segs.push({ line: true, a: [a[0] + dx * cut[i], a[1] + dy * cut[i]], d: [dx, dy], len: l - cut[i] - cut[j] });
    if (cut[j] > 0) {
      const [ex, ey] = unit(b, pts[(j + 1) % n]);
      segs.push({ line: false, a: [b[0] - dx * cut[j], b[1] - dy * cut[j]], d: [dx, dy], e: [ex, ey], r: cut[j], len: (cut[j] * Math.PI) / 2 });
    }
  }
  let len = 0;
  for (const g of segs) { g.s0 = len; len += g.len; }
  const at = (s) => {
    s = closed ? ((s % len) + len) % len : clamp(s, 0, len);
    let g = segs[segs.length - 1];
    for (const sg of segs) if (s < sg.s0 + sg.len) { g = sg; break; }
    const k = s - g.s0;
    if (g.line) return { x: g.a[0] + g.d[0] * k, y: g.a[1] + g.d[1] * k, hx: g.d[0], hy: g.d[1] };
    const f = k / g.r, c = Math.cos(f), sn = Math.sin(f);
    return { x: g.a[0] + g.r * (g.d[0] * sn + g.e[0] * (1 - c)), y: g.a[1] + g.r * (g.d[1] * sn + g.e[1] * (1 - c)), hx: g.d[0] * c + g.e[0] * sn, hy: g.d[1] * c + g.e[1] * sn };
  };
  // How far along the path the point nearest (x, y) is.
  const find = (x, y) => { let best = 0, bd = Infinity; for (let s = 0; s <= len; s += 0.02) { const p = at(s), d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = s; } } return best; };
  return { at, len, find };
}
// Keyframes [t, value] walked straight between: how far along a path
// something is at t (flat where it waits).
function ramp(keys) {
  return (t) => {
    const s = wrap(t);
    for (let i = 1; i < keys.length; i++) {
      const [t0, v0] = keys[i - 1], [t1, v1] = keys[i];
      if (s <= t1) return { v: t1 > t0 ? v0 + ((v1 - v0) * (s - t0)) / (t1 - t0) : v1, moving: v1 !== v0 };
    }
    return { v: keys[keys.length - 1][1], moving: false };
  };
}
// After the tow: back off the nose, round off the runway, wait on the
// service road clear of the wings, and back to C12 at night.
const TUG_STAND = [GATE[0], NOSE - 1.7];
const TUG_DRIVER = look(512, 'ramp', { hat: 'beanie' });
const TUG_OFF = 1.1; // how far it backs off the nose
const tugAway = track([[LINEUP[0] - 1.7 - TUG_OFF, CENTER], [LINEUP[0] - 1.7 - TUG_OFF + 0.9, CENTER], [LINEUP[0] - 1.7 - TUG_OFF + 0.9, 45.7], [57.1, 45.7], [57.1, 30.4], [GATE[0], 30.4], TUG_STAND], 0.9);
const TUG_WAIT = tugAway.find(85, 45.7);
const T_UNHOOK = T_E + 0.5, T_BACKED = T_UNHOOK + TUG_OFF / 1.0, T_PARKED = T_BACKED + TUG_WAIT / 3.0;
const T_TUG_BACK = 340, T_TUG_HOME = T_TUG_BACK + (tugAway.len - TUG_WAIT) / 2.5;
function tugPose(t) {
  const s = wrap(t);
  if (s < P_PUSH) return { x: TUG_STAND[0], y: TUG_STAND[1], hx: 0, hy: 1, bar: true, driver: s > 283 };
  if (s < T_UNHOOK) {
    // Nose to nose. (The ending starts after it's unhooked.)
    const g = pose(t);
    return { x: g.x + 1.7 * g.fx, y: g.y + 1.7 * g.fy, hx: -g.fx, hy: -g.fy, bar: true, driver: true, moving: true };
  }
  if (s < T_BACKED) return { x: LINEUP[0] - 1.7 - (s - T_UNHOOK), y: CENTER, hx: 1, hy: 0, driver: true, moving: true };
  let d;
  if (s < T_PARKED) d = (s - T_BACKED) * 3.0;
  else if (s < T_TUG_BACK) d = TUG_WAIT;
  else d = Math.min(tugAway.len, TUG_WAIT + (s - T_TUG_BACK) * 2.5);
  const p = tugAway.at(d);
  return { ...p, driver: true, moving: s < T_PARKED || (s >= T_TUG_BACK && s < T_TUG_HOME) };
}
const pushback = {
  id: 'pushback',
  name: 'The pushback tug',
  color: INK.signal,
  loop: LOOP,
  at: (t) => tugPose(t),
  draw(ctx, t, p) {
    const night = nightPrint(t);
    pushTug(ctx, p.x, p.y, p.hx, p.hy, { ink: night ? dusk : same, bar: p.bar, driver: p.driver ? TUG_DRIVER : null, lights: lightsOn(t) && p.driver }, t);
  },
};

// ---------- The bag train ----------
// A tug and three carts (the kit's), four trips a day from the bag room out
// along the service road (y 47.2) to the far end and back (y 45.9), stopping
// at C14 and C13; parked in the bag room for the night. Lights on after
// dark; snow on the canopies once it's settling. Each piece is a walker, so
// the carts follow the tug round the turns and sort on their own.
const LANE_OUT = 47.2, LANE_BACK = 45.9, BAG_DOOR = 30;
const loopTrack = track([[24, LANE_OUT], [99.5, LANE_OUT], [99.5, LANE_BACK], [14, LANE_BACK], [14, LANE_OUT]], 0.6, true);
const LP = loopTrack.len;
const S14 = loopTrack.find(GATES.C14 - 1, LANE_BACK), S13 = loopTrack.find(GATES.C13 - 1, LANE_BACK);
const TRAIN_V = 3.2, TRIPS = [4, 76, 148, 220];
const trainKeys = [[0, 0]];
TRIPS.forEach((t0, k) => {
  const base = k * LP;
  const t1 = t0 + S14 / TRAIN_V, t2 = t1 + 8 + (S13 - S14) / TRAIN_V, t3 = t2 + 8 + (LP - S13) / TRAIN_V;
  trainKeys.push([t0, base], [t1, base + S14], [t1 + 8, base + S14], [t2, base + S13], [t2 + 8, base + S13], [t3, base + LP]);
});
trainKeys.push([LOOP, TRIPS.length * LP]);
const trainS = ramp(trainKeys);
const CARS = [0, 3.4, 6.0, 8.6]; // how far behind the tug's middle each one is
const TRAIN_DRIVER = look(520, 'ramp');
const trainWalkers = CARS.map((back, i) => ({
  id: i ? `train-cart-${i}` : 'train',
  name: 'The bag train',
  ghost: i > 0,
  color: INK.safety,
  loop: LOOP,
  at(t) {
    const r = trainS(t), p = loopTrack.at(r.v - back);
    return { x: p.x, y: p.y, hx: p.hx, hy: p.hy, moving: r.moving, s: r.v - back };
  },
  draw(ctx, t, p) {
    const along = Math.abs(p.hx) >= Math.abs(p.hy) ? 'x' : 'y';
    const dir = (along === 'x' ? p.hx : p.hy) >= 0 ? 1 : -1;
    // Outside it prints in the night's inks; in the bag room it's lit.
    const ink = p.x > BAG_DOOR + 0.5 && nightPrint(t) ? dusk : same;
    const F = frame(p.x, p.y, 0, along, dir);
    const snow = settle(t);
    if (!i) {
      // (Rigid: the tug and each cart are one picture each, stamped as they go.)
      rigid(ctx, `train-tug|${along}${dir}|${ink === dusk}`, p.x, p.y, 0, (g) => tug(g, p.x, p.y, 0, along, dir, { driver: TRAIN_DRIVER, ink }, p.moving ? t : 0));
      if (snow > 0.02) face(ctx, [F.pt(-0.68, -0.48, 1.77), F.pt(0.06, -0.48, 1.77), F.pt(0.06, 0.48, 1.77), F.pt(-0.68, 0.48, 1.77)], alpha(C.white, 0.9 * snow), { lw: 0.015 });
      if (lightsOn(t) && Q.detail) {
        if ((t * 1.6 + 0.3) % 1 < 0.5) glow(ctx, ...F.pt(-0.3, 0, 1.86), 1.1, C.mustard, 0.8);
        for (const v of [-0.32, 0.32]) glow(ctx, ...F.pt(0.72, v, 0.42), 0.6, LIT, 0.8);
      }
      return;
    }
    // The load: seeded by the trip, all aboard on the way out. C14 takes the
    // first cart's, C13 the second's; the third comes back full (wrong plane).
    const trip = ((Math.floor(p.s / LP) % 4) + 4) % 4, k = ((p.s % LP) + LP) % LP;
    const empty = (i === 1 && k > S14 + 0.6) || (i === 2 && k > S13 + 0.6);
    rigid(ctx, `train-cart|${along}${dir}|${ink === dusk}|${empty}|${trip * 3 + i + 2}`, p.x, p.y, 0, (g) => cart(g, p.x, p.y, 0, along, dir, { ink, empty, bags: trip * 3 + i + 2 }));
    if (snow > 0.02) face(ctx, [F.pt(-1.08, -0.6, 1.53), F.pt(1.08, -0.6, 1.53), F.pt(1.08, 0.6, 1.53), F.pt(-1.08, 0.6, 1.53)], alpha(C.white, 0.9 * snow), { lw: 0.015 });
  },
}));

// ---------- The family running late ----------
// Mum, Dad and the kid riding a rolling case, in matching teal sweatshirts.
// They burst in from the curb at 8:30, cut through the check-in hall and the
// security line, and sprint down the concourse to C14: DELAYED. They camp on
// their bags all day, sleep on the floor all night, and get on the first
// flight out at 5am (out of sight, back to the curb to do it all again).
const C14 = [89.6, 24.6];
const T_RUN = 60, FAM_GONE = 16.2;
const famWalk = schedule([
  C14, { until: at(5), pose: 'sleep' },
  [90.8, 28.4], [GATES.C14, 29.4], [GATES.C14, 30.6],
  { speed: 3.4 },
  [5.5, 8.0], { until: T_RUN, hide: true },
  { speed: 3 },
  [5.0, 11.4], [5.0, 13.0], [29.0, 13.0], [30.4, 16.5], [35.4, 16.6], { wait: 3, pose: 'shoes', dir: 'r', back: true },
  [39.4, 16.6], [39.4, 25.6], [53.0, 25.9], [88.2, 25.9], C14, { until: at(21), pose: 'camp', dir: 'l', back: false },
  { until: LOOP, pose: 'sleep' },
], { loop: LOOP, name: 'The family running late', speed: 1.3 });
const T_C14 = 96.7;
const TEAL = C.teal;
const tee = (g, b) => {
  if (!Q.detail || b.back) return;
  g.fillStyle = C.white; g.fillRect(-0.2, b.top + 0.28, 0.4, 0.07);
};
const DAD = folk(431, { top: TEAL, bottom: C.navy, hair: HAIR[2], style: 'short', dress: false, wear: tee });
const MUM = folk(432, { top: TEAL, bottom: C.ink, hair: HAIR[5], style: 'pony', dress: false, wear: tee });
const KID = folk(433, { top: TEAL, bottom: C.coral, hair: HAIR[3], style: 'curly', dress: false, wear: tee });
const KID_CASE = C.red;
function famDraw(ctx, t, p) {
  const s = wrap(t);
  if (p.hide || (s >= FAM_GONE && s < T_RUN)) return;
  let a = 1;
  if (s >= T_RUN && s < T_RUN + 0.5) a = (s - T_RUN) / 0.5;
  if (s < FAM_GONE) a = clamp((30 - p.y) / 0.8);
  if (a <= 0) return;
  const a0 = ctx.globalAlpha;
  if (a < 1) ctx.globalAlpha = a0 * a;
  const items = [];
  const who = (x, y, z, lk, o) => items.push([x + y, () => person(ctx, x, y, z, { ...lk, ...o }, o.still ? 0 : t)]);
  const kit = (x, y, z, o) => items.push([x + y, () => bag(ctx, x, y, z, o)]);
  let line = null, lz = 3;
  if (p.moving) {
    // The way they're going, for who runs where.
    const q = famWalk(t + 0.05), r = famWalk(t - 0.05);
    let mx = q.x - r.x, my = q.y - r.y;
    const ml = Math.hypot(mx, my) || 1; mx /= ml; my /= ml;
    let nx = -my, ny = mx;
    if (nx + ny > 0) { nx = -nx; ny = -ny; } // Mum on the far side
    const pose2 = p.speed > 2.2 ? 'run' : 'walk', f = facing(mx, my);
    const along = Math.abs(mx) >= Math.abs(my) ? 'x' : 'y';
    const cx = p.x - mx * 1.0, cy = p.y - my * 1.0;
    who(p.x, p.y, 0, DAD, { pose: pose2, dir: f.dir, back: f.back, arms: pose2 === 'run' ? [-0.7, 0.9 + Math.sin(t * 9) * 0.5] : null });
    // (Mum just off Dad's shoulder: beside him she ran through the check-in
    // glass and the band's front row.)
    who(p.x - mx * 0.5 + nx * 0.35, p.y - my * 0.5 + ny * 0.35, 0, MUM, { pose: pose2, dir: f.dir, back: f.back, phase: 2 });
    kit(cx, cy, 0.06, { kind: 'case', lie: true, color: KID_CASE, along, tag: C.mustard });
    who(cx, cy, -0.17, KID, { pose: 'sit', dir: f.dir, back: f.back, scale: 0.62, arms: [Math.PI - 0.5, -Math.PI + 0.5] });
    // The strap from the case to Dad's hand.
    items.push([p.x + p.y - 0.01, () => {
      const [ax, ay] = P(cx + mx * 0.3, cy + my * 0.3, 0.3), [bx, by] = P(p.x - mx * 0.25, p.y - my * 0.25, 0.95);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.04; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    }]);
    if (pose2 === 'run') line = lines(t, ['Excuse us!', 'Sorry! Late!', 'Coming through!', 'Gate C14!'], 3.6, 1.8);
  } else if (p.pose === 'shoes') {
    who(p.x, p.y, 0, DAD, { pose: 'point', dir: 'r', back: true });
    who(p.x - 0.6, p.y + 0.7, 0, MUM, { pose: 'carry', dir: 'r', back: true });
    kit(p.x + 0.9, p.y + 0.5, 0.06, { kind: 'case', lie: true, color: KID_CASE, along: 'x', tag: C.mustard });
    who(p.x + 0.9, p.y + 0.5, -0.17, KID, { pose: 'sit', dir: 'r', back: false, scale: 0.62 });
    line = 'Shoes off! Go, go!';
  } else if (p.pose === 'camp') {
    // On their bags at C14.
    kit(C14[0] - 0.7, C14[1] - 0.2, 0, { kind: 'duffel', color: C.navy, along: 'x', tag: false });
    who(C14[0] - 0.7, C14[1] - 0.2, -0.36, DAD, { pose: 'sit', dir: 'l', arms: [0.5, 0.3] });
    kit(C14[0] + 0.9, C14[1] + 0.5, 0, { kind: 'case', lie: true, color: C.purple, along: 'x' });
    who(C14[0] + 0.9, C14[1] + 0.5, -0.48, MUM, { pose: 'sit', dir: 'l', arms: [0.6, 0.5] });
    kit(C14[0] + 0.3, C14[1] - 0.6, 0.06, { kind: 'case', lie: true, color: KID_CASE, along: 'x', tag: C.mustard });
    who(C14[0] + 0.3, C14[1] - 0.6, -0.17, KID, { pose: 'sit', dir: 'l', scale: 0.62, arms: [0.3 + Math.sin(t * 2) * 0.3, 0.2] });
    if (s < T_C14 + 4) line = 'Delayed?!';
    else if (hour(t) >= 18 && hour(t) < 18.4) line = 'Canceled?!';
    else line = lines(t, ['Are we there yet?', 'We ran for this.', 'Four hours, it says.', 'Can I have a donut?', 'Camping, then.'], 13, 3.4, 6);
    lz = 2.7;
  } else {
    // Asleep across the floor (lying along it, as everyone at the gates
    // does), the kid on the case.
    kit(C14[0] + 0.3, C14[1] - 0.6, 0.06, { kind: 'case', lie: true, color: KID_CASE, along: 'x', tag: C.mustard });
    items.push([C14[0] - 0.4 + C14[1] + 0.1, () => lieAlong(ctx, C14[0] - 0.4, C14[1] + 0.1, 0, asleep_(DAD), 0, { along: 'x', head: -1 })]);
    items.push([C14[0] - 1.2 + C14[1] + 1.3, () => lieAlong(ctx, C14[0] - 1.2, C14[1] + 1.3, 0, asleep_(MUM), 0, { along: 'x', head: 1 })]);
    items.push([C14[0] + 0.3 + C14[1] - 0.6, () => lieAlong(ctx, C14[0] + 0.3, C14[1] - 0.6, 0.15, { ...asleep_(KID), scale: 0.62 }, 0, { along: 'x', head: -1 })]);
    items.push([C14[0] + C14[1] + 2, () => { zzz(ctx, C14[0] - 2.2, C14[1] - 0.3, 0.6, t); zzz(ctx, C14[0] + 0.6, C14[1] + 0.9, 0.6, t, 0.5); }]);
  }
  items.sort((a1, b1) => a1[0] - b1[0]);
  for (const [, d] of items) d();
  ctx.globalAlpha = a0;
  say(ctx, p.x, p.y, lz, line);
}

// ---------- The airport cart ----------
// Beep beep: an electric cart up and down the concourse all day, an old man
// in the back seat (facing backward) who just likes the ride. Parked at the
// far end at night, both of them asleep in it.
const CART_Y = 16.9, CART_A = 54.5, CART_B = 100.5;
const cartSteps = [[CART_B, CART_Y], { until: 20, pose: 'park' }, { speed: 2.2 }];
for (let k = 0; k < 4; k++) cartSteps.push([CART_A, CART_Y], { wait: 4, pose: 'end', end: 'a' }, [CART_B, CART_Y], { wait: 4, pose: 'end', end: 'b' });
cartSteps.push({ until: LOOP, pose: 'park' });
const cartWalk = schedule(cartSteps, { loop: LOOP, name: 'The airport cart' });
const OLD = folk(611, { skin: SKIN[0], hair: HAIR[4], style: 'bald', top: C.brown, bottom: C.grey, dress: false, face: (g, hy, back) => {
  // A tweed cap and his glasses.
  g.beginPath(); g.arc(0.02, hy - 0.08, 0.32, Math.PI, 0); if (!back) g.rect(0.14, hy - 0.12, 0.3, 0.06);
  paint(g, mix(C.brown, C.grey, 0.4), { lw: 0.04 });
  if (!back && Q.detail) { g.strokeStyle = C.ink; g.lineWidth = 0.025; g.beginPath(); g.arc(0.1, hy + 0.02, 0.07, 0, Math.PI * 2); g.arc(0.25, hy + 0.02, 0.07, 0, Math.PI * 2); g.stroke(); }
} });
const CART_DRIVER = look(612, 'agent');
function cartDraw(ctx, t, p) {
  const d = p.dir === 'r' ? 1 : -1, F = frame(p.x, p.y, 0, 'x', d);
  const asleep = p.pose === 'park' && (wrap(t) > at(21) || wrap(t) < 18);
  const body = C.white;
  // The far wheels, the chassis and its stripe, the hood. (Rigid: one
  // picture each way it faces, under the people, and one of its roof.)
  rigid(ctx, `airport-cart|${d}`, p.x, p.y, 0, (g) => {
    for (const u of [-0.8, 0.8]) for (const v of [-0.55, 0.55]) F.lbox(g, u - 0.18, u + 0.18, v - 0.08, v + 0.08, 0, 0.34, C.ink, { flat: true, lw: 0.02 });
    F.lbox(g, -1.25, 1.25, -0.6, 0.6, 0.22, 0.34, body, { lw: 0.04, dots: shade(body, 0.4) });
    if (Q.detail) F.lface(g, [[-1.25, 0.6, 0.36], [1.25, 0.6, 0.36], [1.25, 0.6, 0.46], [-1.25, 0.6, 0.46]], C.navy, { stroke: false });
    F.lbox(g, 0.85, 1.25, -0.6, 0.6, 0.56, 0.36, body, { lw: 0.035 });
  });
  // Two benches back to back: the driver facing forward, the old man backward.
  const seat = (u0, u1, bu) => { F.lbox(ctx, u0, u1, -0.55, 0.55, 0.56, 0.2, C.navy, { flat: true, lw: 0.03 }); F.lbox(ctx, bu - 0.05, bu + 0.05, -0.55, 0.55, 0.76, 0.5, C.navy, { flat: true, lw: 0.03 }); };
  const front = () => {
    seat(0.15, 0.75, 0.1);
    const [x, y] = F.at(0.42, 0);
    person(ctx, x, y, -0.02, { ...(asleep ? asleep_(CART_DRIVER) : CART_DRIVER), pose: 'sit', dir: d > 0 ? 'r' : 'l', arms: [1.2, 1.1] }, asleep ? 0 : t);
  };
  const rear = () => {
    seat(-0.85, -0.25, -0.2);
    const [x, y] = F.at(-0.55, 0);
    const wave = p.pose === 'end' && !asleep;
    person(ctx, x, y, -0.02, { ...(asleep ? asleep_(OLD) : OLD), pose: 'sit', dir: d > 0 ? 'l' : 'r', arms: wave ? [Math.PI - 0.5 + Math.sin(t * 8) * 0.3, 0.4] : [0.6, 0.5] }, asleep ? 0 : t);
  };
  // Whichever bench is further back on the screen first.
  if (d > 0) { rear(); front(); } else { front(); rear(); }
  // The roof on its posts, and the beacon, flashing while it goes.
  rigid(ctx, `airport-cart-roof|${d}`, p.x, p.y, 0, (g) => {
    for (const u of [-1.1, 1.1]) for (const v of [-0.55, 0.55]) F.lbox(g, u - 0.03, u + 0.03, v - 0.03, v + 0.03, 0.56, 1.9, C.ink, { flat: true, stroke: false });
    F.lbox(g, -1.25, 1.25, -0.66, 0.66, 2.46, 0.08, body, { flat: true, lw: 0.03 });
    F.lbox(g, -0.12, 0.12, -0.12, 0.12, 2.54, 0.16, C.mustard, { flat: true, lw: 0.02 });
  });
  if (p.moving && Q.detail && (t * 2.2) % 1 < 0.5) glow(ctx, ...F.pt(0, 0, 2.66), 1.4, C.mustard, 0.9);
  let line = null;
  if (p.moving) line = lines(t, ['BEEP BEEP', 'BEEP BEEP', 'Coming through!'], 5, 1.5);
  else if (p.pose === 'end') line = p.end === 'a' ? 'Again!' : lines(t, ['Once more.', 'Again!', 'Gate C14, please.'], 49.8, 49.8);
  if (asleep) zzz(ctx, p.x, p.y, 2.3, t);
  say(ctx, p.x, p.y, 3.3, line);
}

export const walkers = [
  {
    id: 'courier',
    name: 'The Courier',
    color: C.mustard,
    loop: LOOP,
    at: courierWalk,
    draw: courierDraw,
  },
  {
    id: 'parcel',
    name: 'The Courier\'s parcel',
    ghost: true,
    loop: LOOP,
    at: parcelWalk,
    draw(ctx, t, p) {
      const s = wrap(t);
      if (s < XRAY_IN || s >= XRAY_OUT) return;
      // On the belt, label up, riding through the X-ray.
      const [X, Y] = P(p.x, p.y, 0.62);
      ctx.save();
      ctx.translate(X - 0.1, Y + 0.02);
      parcel(ctx, {});
      ctx.restore();
    },
  },
  {
    id: 'stool',
    name: 'The Courier\'s stool',
    ghost: true,
    loop: LOOP,
    bias: -0.05,
    at: () => ({ x: S12[0], y: S12[1], moving: false }),
    draw: stoolDraw,
  },
  ...flightWalkers,
  pushback,
  ...trainWalkers,
  {
    id: 'family',
    name: 'The family running late',
    color: TEAL,
    loop: LOOP,
    at: famWalk,
    draw: famDraw,
  },
  {
    id: 'cart',
    name: 'The airport cart',
    color: C.white,
    loop: LOOP,
    at: cartWalk,
    draw: cartDraw,
  },
  ...crossers,
];
