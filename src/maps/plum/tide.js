// A day at Plum Island, and its tide: the clock everything here reads. The
// whole island runs dawn to dawn in LOOP seconds (six minutes, like the Block
// Party), an hour every 15 seconds, starting at 5am.
//
// One tide a day, easier to read than the real two (plum.md, decision 4):
// going out all morning, low water at midday (the flats out, the beach at
// its widest), coming in all afternoon, and the king tide at 8:30pm, when it
// takes the turnpike. Then it drains away through the night.
//
//     5am  half tide, going out           (t = 0)
//   8:30am low enough to walk the flats    (t = 52)
//    noon  low tide
//   3:50pm the flats go under again        (t = 162)
//   5:50pm high enough to float a paddle   (t = 193)
//   7:15pm the turnpike goes under         (t = 214)
//   8:30pm the king tide                   (t = 233)
//  10:45pm the turnpike comes back out     (t = 267)
//   1:40am low enough the paddle's aground (t = 310)
//     4am  going out

export const LOOP = 360;
export const HOUR = LOOP / 24; // 15 seconds
const DAWN = 5;
export const hour = (t) => (DAWN + ((((t % LOOP) + LOOP) % LOOP) / HOUR)) % 24;
// The loop time at an hour (the first one after dawn).
export const at = (h) => ((((h - DAWN) % 24) + 24) % 24) * HOUR;

// The tide: its level at each turn (hours, from 5am round to 5am), eased
// between them.
export const LOW = -0.9, KING = 0.8;
const TURNS = [[5, -0.1], [11, LOW], [14, LOW], [20.5, KING], [29, -0.1]];
export function level(t) {
  let h = hour(t);
  if (h < DAWN) h += 24;
  for (let i = 1; i < TURNS.length; i++) {
    const [h0, a] = TURNS[i - 1], [h1, b] = TURNS[i];
    if (h <= h1) return a + ((b - a) * (1 - Math.cos((Math.PI * (h - h0)) / (h1 - h0)))) / 2;
  }
  return TURNS[0][1];
}
export const rising = (t) => level(t + 0.5) > level(t);

// What's out and what's under. The flats are at -0.45: a low-tide find sits
// on them while they're well clear; a high-tide one floats while there's
// water enough (plum.md, decision 5).
export const lowTide = (t) => level(t) < -0.6;
export const highTide = (t) => level(t) > 0.2;
// Sunset, 7:30 to 9:30pm: the Pink House comes back for a moment (the
// dial's high tide lands in it, at 8pm).
export const SUNSET = [19.5, 21.5];
export const sunset = (t) => { const h = hour(t); return h >= SUNSET[0] && h < SUNSET[1]; };
// The turnpike's crown (land.js): under water at the king tide.
export const ROAD = 0.65;
export const flooded = (t) => level(t) > ROAD;

// How dark it is: 0 by day, 1 at night (the king tide is at dusk).
export function nightK(t) {
  const h = hour(t);
  if (h >= 22 || h < 3.5) return 1;
  if (h >= 20.25) return (h - 20.25) / 1.75;
  if (h < 5) return 1 - (h - 3.5) / 1.5;
  return 0;
}

// The dial (play.js): the tide, what it says now, and where a tap skips to.
// Low water lands at 12:30pm; high water at 8pm, the king tide rising over
// the turnpike at sunset (and the Pink House back for a moment).
export const dial = {
  name: 'the tide',
  label(t) {
    const L = level(t);
    if (L < -0.6) return 'Low tide';
    if (L > 0.62) return 'King tide';
    if (L > 0.2) return 'High tide';
    return rising(t) ? 'Tide coming in' : 'Tide going out';
  },
  level: (t) => (level(t) - LOW) / (KING - LOW),
  next(t) {
    const L = level(t);
    const up = L < -0.6 || (rising(t) && L <= 0.2);
    const target = at(up ? 20 : 12.5);
    let when = t - (((t % LOOP) + LOOP) % LOOP) + target;
    while (when < t + 5) when += LOOP;
    return up
      ? { at: when, label: 'high tide', say: 'High tide. The marsh is filling up, and so is the road.' }
      : { at: when, label: 'low tide', say: 'Low tide. The flats are out.' };
  },
};
