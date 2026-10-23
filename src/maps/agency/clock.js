// Pitch Day: the clock everything here reads. A Friday at Primal, the last one
// in October, in LOOP seconds (six minutes) from 7am. The clock lingers on
// the working day and hurries through the night (agency.md, Alive):
//
//   loop    hours            what's going on
//   0:00    7am to 8:30      arrivals: the lot fills, the coffee machine
//   0:20    8:30 to noon     work; the bear at 10:15 (the dumpster)
//   1:40    noon to 1:30     lunch; the bear at 1 (Doug's car)
//   2:20    1:30 to 5pm      meetings, the pitch at 4; the bear at 4:30
//   3:20    5pm to 7pm       Friday: everyone down to the fire pit
//   4:00    7pm to 11pm      night: Dev deploying, the cleaner, the bear
//   5:20    11pm to 7am      the night, in forty seconds
//
// The bear's walks are here too, because the whole floor reads them: three
// times a day it comes into the lot and everyone runs to the windows (bear
// o'clock, the level's verb). And the CEO's walks along the spine, which
// flip every screen she passes.
import { schedule } from '../../engine/actors.js';
import { BD, W, D, FLOOR, SPINE, AISLE, ROW_A, ROW_B, DRIVE, DUMPSTER, CEO_CAR, DOUG_CAR, PITCH } from './plan.js';

export const LOOP = 360;
const START = 7;
// The clock's pace: [loop seconds, hour] at each change, straight between.
const PACE = [[0, 7], [20, 8.5], [100, 12], [140, 13.5], [200, 17], [240, 19], [320, 23], [360, 31]];
const wrap = (t) => (((t % LOOP) + LOOP) % LOOP);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

// The hour at t (0 to 24). (Asked thousands of times a frame, so it keeps its
// last answer.)
let lastT = NaN, lastH = 0;
export function hour(t) {
  if (t === lastT) return lastH;
  const s = wrap(t);
  let h = START;
  for (let i = 1; i < PACE.length; i++) {
    const [s0, h0] = PACE[i - 1], [s1, h1] = PACE[i];
    if (s <= s1) { h = (h0 + ((h1 - h0) * (s - s0)) / (s1 - s0)) % 24; break; }
  }
  lastT = t;
  lastH = h;
  return h;
}
// The hour from 7am, 7 to 31, so the night doesn't wrap.
export const H = (t) => { const h = hour(t); return h < START ? h + 24 : h; };

// The loop time at an hour (the first one after 7am).
export function at(h) {
  const hh = h < START ? h + 24 : h;
  for (let i = 1; i < PACE.length; i++) {
    const [s0, h0] = PACE[i - 1], [s1, h1] = PACE[i];
    if (hh <= h1) return s0 + ((s1 - s0) * (hh - h0)) / (h1 - h0);
  }
  return 0;
}

// ---------- The day ----------
// How full the floor is, 0 to 1: arriving from 7:30, everyone in by 8:45,
// gone to the fire pit from 5. Dev stay till midnight (dev(t)).
export function staffed(t) {
  const h = H(t);
  if (h < 7.5 || h >= 17.4) return 0;
  if (h < 8.75) return (h - 7.5) / 1.25;
  if (h > 17) return 1 - (h - 17) / 0.4;
  return 1;
}
// Is a seat taken? Each seat comes in at its own minute and leaves at its own
// (k: 0 to 1, the seat's place in the morning's arrivals).
export const seated = (t, k) => staffed(t) > k * 0.95 + 0.02;
export function dev(t) {
  const h = H(t);
  return h >= 8 && h < 24.2;
}
export const PITCH_AT = at(16), CLIENTS_AT = at(15.83);
// After dark (sunset is about 6pm at the end of October), until the light at
// 7am.
export function nightK(t) {
  const h = H(t);
  if (h >= 19 || h < 7) return 1;
  if (h >= 17.8) return (h - 17.8) / 1.2;
  return 0;
}
export const dark = (t) => nightK(t) >= 0.5;
// The gold hour before sunset, 0 to 1 and back.
export function goldK(t) {
  const h = H(t);
  if (h < 16.6 || h > 18.6) return 0;
  return h < 17.6 ? (h - 16.6) : 1 - (h - 17.6);
}

// ---------- The bear ----------
// Out of the woods three times a day, into the lot, and back. Between visits
// it's away in the woods (hidden). At night it wanders the lot with nobody
// watching. A pure function of t, like everything else.
const OUT = [W + 2, 1]; // the woods at the back right, past the dumpster
const ACROSS = D + 3; // the woods across the road, in front
const DX = (DRIVE[0] + DRIVE[1]) / 2;
const bear = schedule([
  OUT,
  // 10:15: the dumpster, then down the drive and along the lot, a look up at
  // the windows, and home the same way.
  { until: at(9.6) },
  { speed: 2.6 },
  [(DUMPSTER[0] + DUMPSTER[2]) / 2, DUMPSTER[3] + 1.2], { wait: 5, pose: 'dig' },
  [DX, AISLE], [90, AISLE], { wait: 5, pose: 'look' },
  [DX, AISLE], OUT,
  // (Round through the woods, out of sight, to across the road.)
  { speed: 40 }, [W + 2, ACROSS], [DOUG_CAR[0], ACROSS],
  // 1pm: across the road to Doug's car, where Doug is eating his lunch.
  // Doug runs; the bear finishes the sandwich.
  { until: at(12.95) },
  { speed: 2.6 },
  [DOUG_CAR[0], ROW_B[1] + 0.9], { wait: 9, pose: 'eat' },
  [DOUG_CAR[0], ACROSS],
  { speed: 40 }, [CEO_CAR[0], ACROSS],
  // 4:30: across the road to the CEO's car under the pitch room, and up onto
  // its roof. It sits there through the end of the pitch.
  { until: at(16.2) },
  { speed: 2.6 },
  [CEO_CAR[0] + 0.6, ROW_B[1] + 0.9], [CEO_CAR[0] + 1.6, AISLE], [CEO_CAR[0], ROW_A[1] + 0.4],
  { until: at(17.5), pose: 'sit' },
  [CEO_CAR[0] + 1.6, AISLE], [CEO_CAR[0] + 0.6, ROW_B[1] + 0.9], [CEO_CAR[0], ACROSS],
  // 10pm: the lot to itself, end to end.
  { speed: 40 }, [60, ACROSS],
  { until: at(21.8) },
  { speed: 2.6 },
  [60, AISLE], [24, AISLE], { wait: 4, pose: 'look' }, [24, ACROSS],
  { speed: 40 }, [W + 2, ACROSS],
], { loop: LOOP, name: 'The bear' });
// Where the bear is: { x, y, z, dir, pose, moving, away } (away: in the woods,
// not drawn). On the CEO's car it sits up on the roof.
export function bearAt(t) {
  const p = bear(t);
  const away = p.x > W + 1 || p.x < -1 || p.y < 0 || p.y > D + 1;
  if (p.pose === 'sit') return { ...p, x: CEO_CAR[0], y: CEO_CAR[1], z: 1.5, away };
  return { ...p, z: 0, away };
}
// Bear o'clock: the times the floor can see the bear in the lot, in working
// hours. Worked out once from the walk: [from, to] in loop seconds.
export const BEAR_TIMES = (() => {
  const out = [];
  let from = null;
  for (let t = 0; t <= LOOP; t += 0.25) {
    const p = bearAt(t), h = H(t);
    const seen = !p.away && p.y > BD - 1 && h > 8.5 && h < 17.2;
    if (seen && from == null) from = t;
    if (!seen && from != null) { out.push([from, t]); from = null; }
  }
  return out;
})();
// Is it bear o'clock now (the bear in the lot and everyone at the windows)?
export const bearOClock = (t) => { const s = wrap(t); return BEAR_TIMES.some(([a, b]) => s >= a + 2.5 && s < b); };
// How far someone has got to the windows, 0 (at their desk) to 1 (at the
// glass): they set off `delay` seconds after the shout and take `travel`
// seconds to get there, and come back the same way once the bear's gone.
export function rushK(t, travel = 4, delay = 0) {
  const s = wrap(t);
  for (const [a, b] of BEAR_TIMES) {
    if (s < a || s > b + travel + delay + 3) continue;
    const go = clamp((s - a - delay) / travel), back = clamp((s - b - delay) / travel);
    return go * (1 - back);
  }
  return 0;
}

// ---------- The CEO's walks ----------
// Dana walks the floor with a coffee: at 8:35 the length of it to Dev's
// stand-up, where she stays for "a quick sync" till 11:30, and back; at 2pm
// out to Creative's shoot and on to the pitch room, where she stays till the
// pitch is done. Between walks she's in her office rehearsing to her fig. The
// engine draws her (day.js); every screen she's near flips to a spreadsheet
// (watched).
const DOOR_CEO = [5.6, 6.6], HALL_CEO = [5.6, 8.4];
const MID = (PITCH[0] + PITCH[2]) / 2;
export const ceo = schedule([
  [3.6, 3.4, FLOOR],
  { until: at(8.6), pose: 'point' },
  { speed: 2.1 },
  [DOOR_CEO[0], DOOR_CEO[1], FLOOR], [HALL_CEO[0], HALL_CEO[1], FLOOR], [8, SPINE, FLOOR], [94, SPINE, FLOOR],
  { until: at(11.5), pose: 'stand', say: 'Love the energy!' },
  [8, SPINE, FLOOR], [HALL_CEO[0], HALL_CEO[1], FLOOR], [DOOR_CEO[0], DOOR_CEO[1], FLOOR], [3.6, 3.4, FLOOR],
  { until: at(14), pose: 'point' },
  [DOOR_CEO[0], DOOR_CEO[1], FLOOR], [HALL_CEO[0], HALL_CEO[1], FLOOR], [8, SPINE, FLOOR], [61, SPINE, FLOOR],
  [MID, SPINE, FLOOR], [MID - 3, PITCH[1] + 1.2, FLOOR],
  { until: at(17.1), pose: 'point' },
  [MID, SPINE, FLOOR], [8, SPINE, FLOOR], [HALL_CEO[0], HALL_CEO[1], FLOOR], [DOOR_CEO[0], DOOR_CEO[1], FLOOR], [3.6, 3.4, FLOOR],
], { loop: LOOP, name: 'Dana, the CEO' });
// Is the CEO near enough to x to see that screen? Screens flip to work
// before she gets there (someone always sees her coming).
export function watched(x, t) {
  const p = ceo(t);
  if (p.y < 8) return false; // in her office
  return Math.abs(p.x - x) < 6.5;
}

// ---------- The bear watch (the dial) ----------
// The place's own clock, as Plum Island's tide: what the bear's up to, a
// gauge that fills as it gets close, and a tap skips to the next bear o'clock.
const BEAR_DIAL = BEAR_TIMES.map(([a]) => a + 3);
export const dial = {
  name: 'the bear watch',
  label(t) {
    const p = bearAt(t), h = H(t);
    if (!p.away && p.y > BD - 1) return h > 8.5 && h < 17.2 ? 'Bear in the lot!' : 'Bear in the lot (nobody here)';
    if (!p.away) return 'Something by the dumpster';
    const s = wrap(t);
    if (BEAR_DIAL.some((a) => a - s > 0 && a - s < 12)) return 'Something in the woods';
    return 'All quiet in the lot';
  },
  level(t) {
    if (bearOClock(t)) return 1;
    const s = wrap(t);
    let best = 0;
    for (const a of BEAR_DIAL) {
      const d = a - s;
      if (d > 0 && d < 40) best = Math.max(best, 1 - d / 40);
    }
    return best * 0.8;
  },
  next(t) {
    const s = wrap(t);
    let a = BEAR_DIAL.find((v) => v > s + 5);
    let when = t - s + (a ?? BEAR_DIAL[0] + LOOP);
    if (when < t + 5) when += LOOP;
    return { at: when, label: 'bear o\'clock', say: 'BEAR! Everyone to the windows.' };
  },
};
