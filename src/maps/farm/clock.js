// The Farm: the clock everything here reads. The whole Saturday runs in LOOP
// seconds (six minutes), starting at 5am. It isn't even (farm.md, Alive): it
// slows for the afternoon and the evening and hurries through the night.
//
//   loop    hours            what's going on
//   0:00    5am  to 8am      dawn over Plum Island; the tent goes up, the dig opens
//   0:25    8am  to 1pm      the farm fills: the Courier, shearing, game one
//   1:30    1pm  to 4pm      game two; the bride at two; the heel, the cake
//   2:50    4pm  to 6pm      the ceremony (the plane at 4:02), cocktail hour,
//                            extra innings, the last out off the cake at six
//   3:40    6pm  to 10pm     dinner, sunset behind the barn, the sparklers at ten
//   4:50    10pm to 1am      the tent glowing, fireflies, backfilling by headlamp
//   5:40    1am  to 5am      the night, in twenty seconds

export const LOOP = 360;
const DAWN = 5;
// The clock's pace: [loop seconds, hour] at each change, straight between.
const PACE = [[0, 5], [25, 8], [90, 13], [170, 16], [220, 18], [290, 22], [340, 25], [360, 29]];
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

// The loop time at an hour (the first one after 5am).
export function at(h) {
  const hh = h < DAWN ? h + 24 : h;
  for (let i = 1; i < PACE.length; i++) {
    const [s0, h0] = PACE[i - 1], [s1, h1] = PACE[i];
    if (hh <= h1) return s0 + ((s1 - s0) * (hh - h0)) / (h1 - h0);
  }
  return 0;
}

// From hour a to hour b (b < a runs past midnight).
export const during = (a, b) => (t) => {
  const h = hour(t);
  return a <= b ? h >= a && h < b : h >= a || h < b;
};
// From hour a till dawn (things that arrive and stay: the heel, the ball in
// the cake, the ring).
export const since = (a) => during(a, DAWN);

// The day's beats, as loop times.
export const BEATS = {
  courier: at(9),
  shearing: at(10),
  game: at(11),
  bride: at(14),
  sheep: at(15), // the half-sheared sheep gets away
  heel: at(15.5),
  cake: at(15 + 40 / 60),
  groom: at(15 + 50 / 60), // runs off the mound
  ceremony: at(16),
  plane: at(16 + 2 / 60), // over the vows
  cocktails: at(17),
  extra: at(16 + 40 / 60), // the groom back for extra innings
  out: at(18), // the last out, off the cake
  sunset: at(20 + 25 / 60),
  bouquet: at(21),
  sparklers: at(22.15), // the couple on the lane, between the lines
};
// The ending's moment: the sparkler send-off down Little's Lane.
export const SPARKLERS = BEATS.sparklers;

// Sunset is about 8:25pm, first light about 4:45am.
export const dark = (t) => { const h = hour(t); return h >= 20.7 || h < 4.9; };
// How much of the night is in the plate, 0 (day) to 1 (night).
export function nightK(t) {
  let h = hour(t);
  if (h < DAWN) h += 24;
  if (h < 6) return 1 - (h - 5);
  if (h < 20.2) return 0;
  if (h < 21.4) return (h - 20.2) / 1.2;
  return 1;
}
