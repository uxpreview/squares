// The ending: find every goose and most of the things and the clock jumps to
// half past four (map.js, finale: FIN_AT), bear o'clock at the pitch. The
// bear has just sat down on the roof of the CEO's car under the pitch room
// (the lot draws it), and everyone's at the window, the Gander Cola clients
// too (day.js). Then the front door opens and the seven geese come out in a
// line, at a good clip (it's nearly five): down the
// walk, along the aisle past the bear (who watches them go, and lets them),
// between two parked cars, across the road and into the woods. The bear
// gets down and goes home the same way, a little behind them. From the
// window, the middle client: "We love the goose."
//
// The game tells the map how long the ending has been going (fx.parade,
// seconds; 0 before it starts); the sky passes it on here every frame
// (follow). day.js draws the geese (one walker each, so they sort with the
// cars they squeeze between) and holds the clients at the glass.
import { goose } from '../../engine/art.js';
import { LOOP, at } from './clock.js';
import { DOOR, BD, AISLE, D, BAY } from './plan.js';

// Where the game jumps the clock: the bear has just sat down on the car
// (clock.js). As early as that, so the geese are mostly across by five, when
// the lot starts to empty.
export const FIN_AT = at(16.5);

export const finale = { since: 0 };
// The walk waits for the camera: the game pauses on the last honk, then
// flies to the lot (about four seconds).
const LEAD = 3.8;
export function follow(fx) {
  if (fx && !fx.thumb) finale.since = fx.parade > LEAD ? fx.parade - LEAD : 0;
}

const wrap = (t) => (((t % LOOP) + LOOP) % LOOP);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
// Is the ending playing now? Only just after the jump: the clock reads
// FIN_AT when it jumps and the camera takes two seconds to get here. (Back
// at a finished place at some other hour, nobody walks out of the door.)
const LAST = 60, START = FIN_AT + 2;
export function ending(t) {
  const s = finale.since;
  if (!(s > 0) || s > LAST) return false;
  const d = wrap(t - s - START);
  return d < 1.5 || d > LOOP - 1.5;
}
// How long the clients stay at the glass (the card is up long before).
export const AT_GLASS = 22;

// ---------- The walk ----------
// Out of the door, down the walk to the aisle, along it to the line between
// two bays in the back row (a goose fits between parked cars; the bear's way
// home is the gap for people, further along), down between the cars and
// across the road. Past y = D no area draws them: the sky does (beyond()),
// under its trees, so they walk in among them and fade into the wood.
export const GEESE = 7;
const GAP = 6 + 17 * BAY; // the line between two bays, just right of the walk
const WAY = [[DOOR[0], BD + 0.45], [DOOR[0], AISLE - 0.7], [GAP, AISLE + 0.5], [GAP, D + 0.3], [GAP + 0.8, D + 4]];
const LEN = [0];
for (let i = 1; i < WAY.length; i++) LEN.push(LEN[i - 1] + Math.hypot(WAY[i][0] - WAY[i - 1][0], WAY[i][1] - WAY[i - 1][1]));
const WALK = 2.4, SPACE = 1.05, T0 = 0.8;
// When the last goose is across the road: map.js's hold waits about that
// long (and a beat), so the card comes once they're in the trees.
export const CROSSED = T0 + (LEN[3] + (GEESE - 1) * SPACE) / WALK;
// The window's line, in seconds of the ending: once the line's half out.
export const SAY = { text: 'We love the goose.', from: 6.5, to: 15 };

// Where goose i is, s seconds into the ending: { x, y, z, dir, pose, a }
// (a: how much of it shows, as it comes out of the door and goes into the
// trees).
export function gooseAt(i, s) {
  const d = Math.max(0, s - T0) * WALK - i * SPACE;
  if (d <= 0) return { x: WAY[0][0], y: WAY[0][1], z: 0, a: 0, dir: 'l', pose: 'stand' };
  let k = 1;
  while (k < WAY.length - 1 && LEN[k] < d) k++;
  const [x0, y0] = WAY[k - 1], [x1, y1] = WAY[k];
  const u = clamp((d - LEN[k - 1]) / (LEN[k] - LEN[k - 1]));
  const x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u;
  const dir = (x1 - x0) - (y1 - y0) >= 0 ? 'r' : 'l';
  // The leader honks once at the bear as it goes past the car.
  const honk = i === 0 && d > LEN[2] - 1.6 && d < LEN[2] - 0.6;
  const a = clamp(d / 0.5) * clamp((D + 4.2 - y) / 3);
  return { x, y, z: 0, a, dir, pose: honk ? 'honk' : 'walk', moving: true };
}

// One goose of the line, as gooseAt says.
export function drawGoose(ctx, t, i, p) {
  if (!(p.a > 0.01)) return;
  const a0 = ctx.globalAlpha;
  if (p.a < 1) ctx.globalAlpha = a0 * p.a;
  goose(ctx, p.x, p.y, p.z, t + i * 0.37, { dir: p.dir, pose: p.pose, phase: i * 0.9 });
  ctx.globalAlpha = a0;
}
// The ones already across the road, for the sky to draw under its trees.
export function beyond(ctx, t) {
  if (!ending(t)) return;
  for (let i = GEESE - 1; i >= 0; i--) {
    const p = gooseAt(i, finale.since);
    if (p.y > D) drawGoose(ctx, t, i, p);
  }
}
