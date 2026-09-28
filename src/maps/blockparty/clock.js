// A day on the Block: the clock everything reads. The whole block runs dawn to
// dawn in LOOP seconds (six minutes), an hour every 15 seconds, starting at
// 5am. Rooms, streets and people all ask it what time it is.
import { LOOP } from './plan.js';

export const HOUR = LOOP / 24; // seconds in an hour: 15
const DAWN = 5; // the loop starts at 5am
export const hour = (t) => (DAWN + ((((t % LOOP) + LOOP) % LOOP) / HOUR)) % 24;
// The loop time at a given hour (the first one after dawn).
export const at = (h) => ((((h - DAWN) % 24) + 24) % 24) * HOUR;

// How dark it is outside: 0 by day, 1 at night.
export function nightK(t) {
  const h = hour(t);
  if (h >= 22 || h < 4) return 1;
  if (h >= 19.5) return (h - 19.5) / 2.5;
  if (h < 5.5) return 1 - (h - 4) / 1.5;
  return 0;
}

// Each room's hours: when it's open (lights on, the sign says so) and its
// rush, when it's busiest. [from, to] in hours, and they can run past
// midnight ([20, 4]). The rooms' own stories set them: the bakery at 5am, the
// Lido at noon, the laundromat at 2am, the stars at night.
export const HOURS = {
  observatory: { open: [20, 4.5], rush: [23, 2] }, // stargazing
  launchpad: { open: [8, 22], rush: [19.5, 21.2] }, // the countdown, and the launch at the party's height
  pool: { open: [8, 19], rush: [11.5, 14.5] }, // the Lido at noon
  arcade: { open: [12, 24], rush: [16, 19] }, // after school
  greenhouse: { open: [6, 18], rush: [7, 10] }, // the morning watering
  disco: { open: [20, 3], rush: [22, 1] }, // Saturday night
  library: { open: [9, 18], rush: [10, 12.5] }, // story time
  icerink: { open: [10, 21], rush: [14, 17] }, // the afternoon skate
  noodles: { open: [11, 23.5], rush: [12, 14] }, // the lunch rush
  bakery: { open: [4, 14], rush: [5, 8] }, // the dawn queue
  laundromat: { open: [0, 24], rush: [1, 3] }, // the 2am crowd
  ballpit: { open: [9, 18], rush: [9.5, 12] }, // the toddlers' morning
  umbrellas: { open: [9, 18], rush: [15, 17] }, // the afternoon downpour, indoors
  aquarium: { open: [9, 18], rush: [10.5, 13] }, // feeding time
  band: { open: [13, 23], rush: [15, 18] }, // the sound check
  trains: { open: [10, 20], rush: [17, 19] }, // the evening timetable
};

// How far into a stretch of hours [a, b] the hour h is, 0 outside to 1
// inside, easing over half an hour at each end.
export function within([a, b], h, ramp = 0.5) {
  if (b - a >= 24) return 1; // all day
  const len = (((b - a) % 24) + 24) % 24 || 24;
  const into = (((h - a) % 24) + 24) % 24;
  if (into > len) return 0;
  return Math.min(1, into / ramp, (len - into) / ramp);
}
// Is a room open at t (0 to 1), and how busy (0 to 1)?
export const open = (id, t) => within(HOURS[id].open, hour(t));
export const rush = (id, t) => within(HOURS[id].rush, hour(t));

// The rocket launches at the party's height (the Launch Pad's front, and the
// sound).
export const LAUNCH = 20.8;
