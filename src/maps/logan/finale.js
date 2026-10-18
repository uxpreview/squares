// The ending: find every goose and most of the things and the clock jumps to
// 11:57pm (map.js, finale). The ground stop has lifted, and Flight 1 to
// Orlando, de-iced and finally boarded, is lined up at the runway's end, its
// lights blinking (day.js). The tower tells it to hold. The seven geese cross
// the runway in front of its nose in single file, from the grass on the apron
// side to the seawall, hop down into the harbor and paddle clear of the wings.
// Only then is it cleared, and it goes, out over the pier. The geese watch it
// off, honking, and paddle away. The Courier is at C12's window, holding up
// his parcel: Flight 1 is leaving without him.
//
// The game tells the map how long the ending has been going (fx.parade,
// seconds; 0 before it starts); the sky passes it on here every frame
// (follow). day.js reads it: Flight 1 holds until the geese are clear
// (ROLL_AT), then rolls. The geese are drawn by the Runway (crossing(R) in its
// build, one mover a goose, so they sort with the plane); if the Runway
// doesn't call it, a walker on the map's clock draws them instead.
import { C, Q, P, goose, speech, alpha } from '../../engine/art.js';
import { CENTER } from './plan.js';
import { LOOP, FLIGHT1 } from './clock.js';

export const finale = { since: 0 };
// The crossing waits for the camera: the game pauses on the last honk, then
// flies to the runway (about four seconds).
const LEAD = 3.8;
export function follow(fx) {
  if (fx && !fx.thumb) finale.since = fx.parade > LEAD ? fx.parade - LEAD : 0;
}

const wrap = (t) => (((t % LOOP) + LOOP) % LOOP);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
// Is the ending playing now? Only just after the game jumped the clock to it:
// the clock reads FLIGHT1 when it jumps, and the camera takes two seconds to
// get here, so the ending starts with the clock at FLIGHT1 + 2. (Coming back
// to a finished place at some other hour, the ending doesn't play over the
// morning traffic: the geese only cross at 11:57pm.)
const LAST = 60, START = FLIGHT1 + 2;
export function ending(t) {
  const s = finale.since;
  if (!(s > 0) || s > LAST) return false;
  const d = wrap(t - s - START);
  return d < 1.5 || d > LOOP - 1.5;
}

// ---------- The crossing ----------
// Flight 1's nose, holding at the runway's end (it points down the runway, to
// the left, and takes off that way).
export const LINEUP = [89, CENTER];
export const GEESE = 7;
// The column waits on the grass between the apron and the runway, leader at
// FROM and the rest behind it, then marches: along the grass to FROM, across
// the runway to the seawall's edge (EDGE), a hop down into the harbor
// (DOWN), and out past the wingtips (y 59.25) to a line of spots.
const FROM = [85.4, 48.7], EDGE = [83.4, 56.7], DOWN = [83.3, 57.7];
const WATER = -0.6; // the harbor's surface, at the foot of the seawall
const WALK = 2.0, PADDLE = 2.0, SPACE = 1.1, T0 = 0.4, HOP = 0.5;
const CROSS = Math.hypot(EDGE[0] - FROM[0], EDGE[1] - FROM[1]);
const SPOT = (i) => [80.6 + i * 1.0, 60.25];
const outFor = (i) => Math.hypot(SPOT(i)[0] - DOWN[0], SPOT(i)[1] - DOWN[1]) / PADDLE;
// When goose i is in the water and clear of the wings.
const clearAt = (i) => T0 + (CROSS + i * SPACE) / WALK + HOP + outFor(i);
let last = 0;
for (let i = 0; i < GEESE; i++) last = Math.max(last, clearAt(i));
// Every goose clear of the wings: the tower clears Flight 1, and it rolls.
export const SETTLED = last + 0.3;
export const ROLL_AT = SETTLED + 2.2;
// Up and away (day.js's takeoff is about 12 seconds to the air), and the
// geese paddle off home.
const AWAY = ROLL_AT + 16;

// Where goose i is, s seconds into the ending: { x, y, z, dir, pose, a, swim }.
export function gooseAt(i, s) {
  const d = Math.max(0, s - T0) * WALK - i * SPACE; // along its way, from FROM
  if (d < 0) {
    // Waiting its turn on the grass, the column stretching back toward the
    // plane's far wing.
    return { x: FROM[0] - d, y: FROM[1], z: 0, dir: 'l', pose: s > T0 ? 'walk' : 'stand', a: 1 };
  }
  if (d < CROSS) {
    const k = d / CROSS;
    return { x: FROM[0] + (EDGE[0] - FROM[0]) * k, y: FROM[1] + (EDGE[1] - FROM[1]) * k, z: 0, dir: 'l', pose: 'walk', a: 1 };
  }
  const h = (d - CROSS) / WALK; // seconds since it reached the edge
  if (h < HOP) {
    const k = h / HOP;
    return { x: EDGE[0] + (DOWN[0] - EDGE[0]) * k, y: EDGE[1] + (DOWN[1] - EDGE[1]) * k, z: WATER * k + Math.sin(k * Math.PI) * 0.5, dir: 'l', pose: 'stand', a: 1, hop: k };
  }
  const p = h - HOP, out = outFor(i), [sx, sy] = SPOT(i);
  if (p < out) {
    const k = p / out;
    const x = DOWN[0] + (sx - DOWN[0]) * k, y = DOWN[1] + (sy - DOWN[1]) * k;
    return { x, y, z: WATER, dir: (sx - DOWN[0]) - (sy - DOWN[1]) >= 0 ? 'r' : 'l', pose: 'swim', a: 1, swim: true, moving: true, splash: p };
  }
  if (s < AWAY) {
    // Bobbing in a line, watching Flight 1 go (to the left), honking it off.
    const rolling = s > ROLL_AT && s < ROLL_AT + 12;
    const honk = rolling && Math.sin((s - ROLL_AT) * 4 + i * 1.7) > 0.3;
    return { x: sx, y: sy + Math.sin(s * 1.3 + i) * 0.05, z: WATER, dir: 'l', pose: honk ? 'honk' : 'swim', a: 1, swim: true };
  }
  // Paddling off into the outer harbor, out of the picture.
  const k = s - AWAY;
  return { x: sx + k * 0.25, y: sy + k * 0.55, z: WATER, dir: 'l', pose: 'swim', a: clamp(1 - k / 4), swim: true, moving: true };
}

// Rings round a goose on the water, its wake, and the splash as it lands.
function ripples(ctx, p, t, i) {
  if (!Q.lines) return;
  const [X, Y] = P(p.x, p.y, p.z), f = p.dir === 'l' ? -1 : 1;
  ctx.lineWidth = 0.045;
  for (let k = 0; k < 2; k++) {
    const u = (t * 0.7 + i * 0.13 + k * 0.5) % 1;
    ctx.beginPath();
    ctx.ellipse(X, Y, 0.4 + u * 0.7, (0.4 + u * 0.7) * 0.45, 0, 0, Math.PI * 2);
    ctx.strokeStyle = alpha(C.white, 0.7 * (1 - u) * p.a);
    ctx.stroke();
  }
  if (p.moving) {
    ctx.strokeStyle = alpha(C.white, 0.75 * p.a);
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    ctx.moveTo(X - f * 0.35, Y - 0.05); ctx.lineTo(X - f * 1.05, Y - 0.28);
    ctx.moveTo(X - f * 0.35, Y + 0.05); ctx.lineTo(X - f * 1.05, Y + 0.3);
    ctx.stroke();
  }
  if (p.splash != null && p.splash < 0.7 && Q.detail) {
    // Drops thrown up by the landing.
    const k = p.splash / 0.7;
    ctx.fillStyle = alpha(C.white, 1 - k);
    ctx.beginPath();
    for (let j = 0; j < 6; j++) {
      const a = (j / 6) * Math.PI * 2 + i;
      const r = 0.25 + k * 0.6, lift = Math.sin(k * Math.PI) * 0.5;
      const dx = Math.cos(a) * r, dy = Math.sin(a) * r * 0.5 - lift;
      ctx.moveTo(X + dx + 0.06, Y + dy); ctx.arc(X + dx, Y + dy, 0.06, 0, Math.PI * 2);
    }
    ctx.fill();
  }
}

// One crossing goose, as gooseAt says, s seconds in.
function drawCrosser(ctx, t, i, p) {
  if (p.a <= 0.01) return;
  const a0 = ctx.globalAlpha;
  if (p.a < 1) ctx.globalAlpha = a0 * p.a;
  if (p.swim) ripples(ctx, p, t, i);
  goose(ctx, p.x, p.y, p.z, t + i * 0.37, { dir: p.dir, pose: p.pose, phase: i * 0.9 });
  ctx.globalAlpha = a0;
}

// ---------- The radio ----------
// The tower and Flight 1, as the ending goes: a line, or null. The tower's
// lines print in its own navy bubble (day.js draws them over the cockpit).
export function radio(s) {
  if (s > 0.3 && s < 4.1) return { tower: true, text: 'Tower: Flight 1, hold for geese.' };
  if (s > 4.4 && s < 7.6) return { text: 'Holding for geese.' };
  if (s > SETTLED - 1.2 && s < SETTLED + 1.4) return { tower: true, text: 'Tower: Geese are clear.' };
  if (s > SETTLED + 1.6 && s < ROLL_AT + 1.8) return { tower: true, text: 'Tower: Cleared for takeoff.' };
  if (s > ROLL_AT + 2.2 && s < ROLL_AT + 5.6) return { text: 'Happy Thanksgiving, Boston!' };
  return null;
}
// A line from the radio over a point (the cockpit), close up only.
export function radioBubble(ctx, x, y, z, line) {
  if (!line || !Q.detail || Q.pxPerUnit < 12) return;
  speech(ctx, x, y, z, line.text, line.tower ? { size: 0.42, fill: C.navy, color: C.white } : { size: 0.42 });
}

// ---------- Drawing them ----------
// Called by the Runway in its build: one mover a goose, so each sorts with
// Flight 1's pieces round it. While the ending isn't playing they wait,
// unseen, where the column starts.
let hooked = false;
export function crossing(R) {
  hooked = true;
  for (let i = 0; i < GEESE; i++) {
    R.mover((t) => (ending(t) ? gooseAt(i, finale.since) : { x: FROM[0] + i * SPACE, y: FROM[1], idle: true }), (ctx, t, p) => {
      if (!p.idle) drawCrosser(ctx, t, i, p);
    });
  }
}
// If the Runway doesn't, they're drawn here instead, as one walker on the
// map's clock (day.js adds it): all seven at once, sorted as one.
export const crossers = [{
  id: 'crossing',
  name: 'The geese crossing',
  ghost: true,
  loop: LOOP,
  at: () => ({ x: 83.6, y: 55.2, moving: false }),
  draw(ctx, t) {
    if (hooked || !ending(t)) return;
    const s = finale.since;
    const list = [];
    for (let i = 0; i < GEESE; i++) list.push([i, gooseAt(i, s)]);
    list.sort((a, b) => a[1].x + a[1].y - b[1].x - b[1].y);
    for (const [i, p] of list) drawCrosser(ctx, t, i, p);
  },
}];
