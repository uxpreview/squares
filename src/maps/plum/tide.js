// A day at Plum Island, and its tide: the clock everything here reads. The
// whole island runs dawn to dawn in LOOP seconds (six minutes), starting at
// 5am. The clock isn't even (plum.md, Mechanic): it lingers on low water and
// high water, slows for sunset, and hurries through the small hours, so each
// tide window lasts two full minutes.
//
//   loop    hours            the water
//   0:00    5am  to 7am      falling: fishermen on the jetty, seals arriving
//   0:30    7am  to 3:30pm   low water: the flats and the sandbars out
//   2:30    3:30pm to 7pm    rising: kayaks out, the sailboat floats
//   3:10    7pm  to 9pm      sunset (8:20pm), the Pink House back for a moment
//   3:45    9pm  to 1:30am   high water, the king tide just after midnight;
//                            the road floods at the island end, 10:35 to 12:50
//   5:45    1:30am to 5am    the night drains away in fifteen seconds
//
// One tide a day, easier to read than the real two (decision 4). The king
// tide at midnight is true to July (decision 26).

export const LOOP = 360;
const DAWN = 5;
// The clock's pace: [loop seconds, hour] at each change, straight between.
const PACE = [[0, 5], [30, 7], [150, 15.5], [190, 19], [225, 21], [345, 25.5], [360, 29]];
const wrap = (t) => (((t % LOOP) + LOOP) % LOOP);

// The hour at t (0 to 24).
export function hour(t) {
  const s = wrap(t);
  for (let i = 1; i < PACE.length; i++) {
    const [s0, h0] = PACE[i - 1], [s1, h1] = PACE[i];
    if (s <= s1) return (h0 + ((h1 - h0) * (s - s0)) / (s1 - s0)) % 24;
  }
  return DAWN;
}
// The loop time at an hour (the first one after dawn).
export function at(h) {
  let hh = h < DAWN ? h + 24 : h;
  for (let i = 1; i < PACE.length; i++) {
    const [s0, h0] = PACE[i - 1], [s1, h1] = PACE[i];
    if (hh <= h1) return s0 + ((s1 - s0) * (hh - h0)) / (h1 - h0);
  }
  return 0;
}
// How many loop seconds an hour lasts around h (for anything timed in hours).
export const HOUR = 15;

// The tide: its level at each turn, [loop seconds, level], eased between.
export const LOW = -0.9, KING = 0.8;
export const KING_AT = 312; // just after midnight
const TURNS = [[0, 0.1], [40, LOW], [110, LOW], [KING_AT, KING], [LOOP, 0.1]];
export function level(t) {
  const s = wrap(t);
  for (let i = 1; i < TURNS.length; i++) {
    const [s0, a] = TURNS[i - 1], [s1, b] = TURNS[i];
    if (s <= s1) return a + ((b - a) * (1 - Math.cos((Math.PI * (s - s0)) / (s1 - s0)))) / 2;
  }
  return TURNS[0][1];
}
export const rising = (t) => level(t + 0.5) > level(t);

// What's out and what's under. The flats are at -0.45: a low-tide find sits
// on them while they're well clear (from 0:25 to 2:45, 140 seconds); a
// high-tide one floats while there's water enough (3:46 to 5:51, 125
// seconds). Both windows are over two minutes (decision 5).
export const lowTide = (t) => level(t) < -0.6;
export const highTide = (t) => level(t) > 0.15;
// Sunset over the marsh, 8:20pm. The Pink House flickers back three times
// across it, a second each (7:55, 8:20 and 8:45pm); tapping the lot counts
// from 7:40 to 9pm, about 23 seconds (decision 25).
export const SUNSET = 20.33;
export const FLICKERS = [19.92, 20.33, 20.75];
export const PINK_WINDOW = [19.67, 21];
export const pinkWindow = (t) => { const h = hour(t); return h >= PINK_WINDOW[0] && h < PINK_WINDOW[1]; };
export function flicker(t) {
  const s = wrap(t);
  let k = 0;
  for (const h of FLICKERS) {
    const d = Math.abs(s - at(h));
    if (d < 0.7) k = Math.max(k, Math.min(1, (0.7 - d) / 0.2));
  }
  return k;
}
// Watching the sunset: everyone on the island turns to face the marsh.
export const sunsetWatch = (t) => { const h = hour(t); return h >= 19.8 && h < 20.9; };
// The turnpike's low spot, by the drawbridge (land.js): under from about
// 10:35pm to 12:50am.
export const DIP = 0.6;
export const flooded = (t) => level(t) > DIP;

// How dark it is: 0 by day, 1 at night.
export function nightK(t) {
  const h = hour(t);
  if (h >= 21.6 || h < 4) return 1;
  if (h >= 20.4) return (h - 20.4) / 1.2;
  if (h < 5.3) return 1 - (h - 4) / 1.3;
  return 0;
}

// The dial (play.js): the tide, what it says now, and where a tap skips to.
// Low water lands at noon; high water at 11pm, just as the road goes under.
// On the way up it stops at sunset first (7:50pm, the Pink House's window),
// so skipping never jumps over it (gate 3).
const LOW_AT = at(12), SUNSET_AT = at(19.83), HIGH_AT = at(23);
export const dial = {
  name: 'the tide',
  label(t) {
    const L = level(t);
    if (L < -0.6) return 'Low tide';
    if (L > 0.62) return 'King tide';
    if (L > 0.15) return 'High tide';
    return rising(t) ? 'Tide coming in' : 'Tide going out';
  },
  level: (t) => (level(t) - LOW) / (KING - LOW),
  next(t) {
    const L = level(t);
    const up = L < -0.6 || (rising(t) && L <= 0.15);
    const dusk = up && wrap(t) < SUNSET_AT - 5;
    const target = dusk ? SUNSET_AT : up ? HIGH_AT : LOW_AT;
    let when = t - wrap(t) + target;
    while (when < t + 5) when += LOOP;
    if (dusk) return { at: when, label: 'sunset', say: 'Sunset. Everyone turns to watch the marsh, backs to the tide.' };
    return up
      ? { at: when, label: 'high tide', say: 'High tide. The marsh is filling up, and so is the road.' }
      : { at: when, label: 'low tide', say: 'Low tide. The flats are out.' };
  },
};
