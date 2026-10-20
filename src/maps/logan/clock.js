// The day before Thanksgiving at Logan: the clock everything here reads. The
// whole airport runs in LOOP seconds (six minutes), starting at 4am. The clock
// isn't even (logan.md, Alive): it lingers on the morning rush and the stuck
// night, and hurries through the small hours.
//
//   loop    hours              what's going on
//   0:00    4am  to 6am        the first wave; the Courier off the water taxi
//   0:20    6am  to 11am       the rush: the queue out the door
//   1:40    11am to 2pm        a quiet hour, the board going yellow
//   2:20    2pm  to 6pm        snow from 3, sunset at 4:15, the ground stop at 6
//   3:10    6pm  to 11:30pm    stuck: everything canceled, de-icing, the plows
//   4:50    11:30pm to 12:30am the ground stop lifts; Flight 1 goes at midnight
//   5:30    12:30am to 4am     the night, in thirty seconds

export const LOOP = 360;
const DAWN = 4;
// The clock's pace: [loop seconds, hour] at each change, straight between.
const PACE = [[0, 4], [20, 6], [100, 11], [140, 14], [190, 18], [290, 23.5], [330, 24.5], [360, 28]];
const wrap = (t) => (((t % LOOP) + LOOP) % LOOP);

// The hour at t (0 to 24). (Asked thousands of times a frame, by everything
// that comes and goes with the day, so it keeps its last answer.)
let lastT = NaN, lastH = 0;
export function hour(t) {
  if (t === lastT) return lastH;
  const s = wrap(t);
  let h = DAWN;
  for (let i = 1; i < PACE.length; i++) {
    const [s0, h0] = PACE[i - 1], [s1, h1] = PACE[i];
    if (s <= s1) { h = (h0 + ((h1 - h0) * (s - s0)) / (s1 - s0)) % 24; break; }
  }
  lastT = t;
  lastH = h;
  return h;
}

// The loop time at an hour (the first one after 4am).
export function at(h) {
  const hh = h < DAWN ? h + 24 : h;
  for (let i = 1; i < PACE.length; i++) {
    const [s0, h0] = PACE[i - 1], [s1, h1] = PACE[i];
    if (hh <= h1) return s0 + ((s1 - s0) * (hh - h0)) / (h1 - h0);
  }
  return 0;
}

// The ending's moment: the ground stop has lifted, and Flight 1 is holding
// short at the runway's end (day.js) while the geese cross.
export const FLIGHT1 = at(23.95);

// After dark (sunset is 4:15pm), until the first light at 6:30am.
export const dark = (t) => { const h = hour(t); return h >= 16.6 || h < 6.5; };
// The ground stop: nothing lands or takes off.
export const stopped = (t) => { const h = hour(t); return h >= 18 && h < 23.5; };
// Planes landing and taking off: from 5am till the ground stop. After it,
// Flight 1 is the only one that goes (day.js).
export const flying = (t) => { const h = hour(t); return h >= 5 && h < 18; };
// How hard it's snowing, 0 to 1: from 3pm, heavy by half past five, easing
// after eleven, gone by one.
export function snowK(t) {
  let h = hour(t);
  if (h < DAWN) h += 24;
  if (h < 15 || h >= 25) return 0;
  if (h < 17.5) return 0.15 + 0.85 * ((h - 15) / 2.5);
  if (h < 23) return 1;
  return 1 - (h - 23) / 2;
}

// How dark it is, 0 to 1, for printing the night: dusk from sunset (4:15pm)
// to full dark by half past five, and the first light from 5:30am, gone by
// seven. The terminal stays lit; outside, the ground and what stands on it
// print in their night inks (style.js, dusk).
export function nightK(t) {
  const h = hour(t);
  if (h >= 17.5 || h < 5.5) return 1;
  if (h >= 16.2) return (h - 16.2) / 1.3;
  if (h < 7) return 1 - (h - 5.5) / 1.5;
  return 0;
}
// Lights on (the windows, the apron's floodlights, the runway's edges).
export const lightsOn = (t) => nightK(t) >= 0.3;
// Sunset, 0 to 1 and back: a pink harbor for a moment at 4:15pm, through the
// snow.
export function sunsetK(t) {
  const h = hour(t);
  if (h < 15.6 || h > 17) return 0;
  return h < 16.25 ? (h - 15.6) / 0.65 : 1 - (h - 16.25) / 0.75;
}
// How much snow is lying outside, 0 to 1: it starts to stick at half past
// three, covers everything by eight and stays; the night's thirty seconds
// clear it for the morning (the loop starts again at 4am).
export function settle(t) {
  let h = hour(t);
  if (h < DAWN) h += 24;
  if (h < 15.5) return 0;
  if (h < 20) return (h - 15.5) / 4.5;
  if (h < 26) return 1;
  return Math.max(0, 1 - (h - 26) / 1.5);
}
