// Moving Day's clock: six minutes, dawn to dawn, uneven on purpose (like
// Plum Island's), so each side of noon gets two full minutes and the night
// goes by in one (docs/levels/southie.md, "The loop"):
//
//   loop  0:00 to 0:15   5am to 7am    dawn; the trucks arrive
//         0:15 to 2:30   7am to noon   moving out (rain from 10)
//         2:30 to 2:45   noon to 1pm   the handover: the inspection, the keys
//         2:45 to 5:00   1pm to 9pm    moving in (rain stops at 3; sunset 7:20)
//         5:00 to 6:00   9pm to 5am    the first night
//
// Everything reads the hour from here. Hours past midnight run on past 24
// (1am is 25) so the stretches stay in order; hour(t) wraps them back.
import { LOOP } from './plan.js';
export { LOOP };

// [loop seconds, hour], in order; straight lines between.
const KNOTS = [[0, 5], [15, 7], [150, 12], [165, 13], [300, 21], [360, 29]];
const wrap = (t) => (((t % LOOP) + LOOP) % LOOP);
// The hour at t, 0 to 24.
export function hour(t) {
  const s = wrap(t);
  for (let i = 1; i < KNOTS.length; i++) {
    const [t0, h0] = KNOTS[i - 1], [t1, h1] = KNOTS[i];
    if (s <= t1) return (h0 + ((s - t0) / (t1 - t0)) * (h1 - h0)) % 24;
  }
  return 5;
}
// The loop time of an hour (the first one after dawn; 1am is 1 or 25).
export function at(h) {
  let hh = ((h % 24) + 24) % 24;
  if (hh < 5) hh += 24;
  for (let i = 1; i < KNOTS.length; i++) {
    const [t0, h0] = KNOTS[i - 1], [t1, h1] = KNOTS[i];
    if (hh <= h1) return t0 + ((hh - h0) / (h1 - h0)) * (t1 - t0);
  }
  return 0;
}
// Is it between hour a and hour b (b < a runs past midnight)?
export const between = (a, b) => (t) => {
  const h = hour(t);
  return a <= b ? h >= a && h < b : h >= a || h < b;
};

// ---------- Out by noon, in after ----------
// The two sides of the day, for finds with a window (the list says which).
export const BEFORE = { when: between(7, 12), note: 'before noon' };
export const AFTER = { when: between(13, 5), note: 'after noon' };
// Moving out (0 to 1 through the morning) and in (through the afternoon).
export const outK = (t) => Math.max(0, Math.min(1, (hour(t) - 7) / 5));
export const inK = (t) => { const h = hour(t); return h < 5 ? 1 : Math.max(0, Math.min(1, (h - 13) / 6)); };

// ---------- The weather ----------
// Rain from ten till three (it really did, on September 1, 2026): a drizzle
// coming on, heaviest around noon, easing off. 0 dry, 1 pouring.
export function rainK(t) {
  const h = hour(t);
  if (h < 9.6 || h > 15.4) return 0;
  const up = Math.min(1, (h - 9.6) / 1.2), down = Math.min(1, (15.4 - h) / 1.4);
  return Math.min(up, down) * (0.55 + 0.45 * Math.max(0, 1 - Math.abs(h - 12.2) / 2.2));
}
// The road stays wet a while after (puddles): 0 dry, 1 soaked.
export function wetK(t) {
  const h = hour(t);
  if (h < 9.8 || h > 19) return 0;
  return Math.min(1, (h - 9.8) / 1, (19 - h) / 3);
}

// ---------- Day and night ----------
export const SUNSET = 19.33; // 7:20pm, behind Dorchester Heights
// How dark it is outside: 0 by day, 1 at night.
export function nightK(t) {
  const h = hour(t);
  if (h >= 21 || h < 4.5) return 1;
  if (h >= 19.2) return (h - 19.2) / 1.8;
  if (h < 6.2) return 1 - (h - 4.5) / 1.7;
  return 0;
}

// ---------- The lease clock ----------
// Plum Island's dial, made a flip (play.js, map.dial.flip): a tap jumps to
// the matching moment on the other side of noon, and the old picture melts
// away over the new one, so whatever changed jumps out. Before and after are
// paired by how full the apartments are: 7am (the old tenants' things all
// still in) with 9pm (the new ones' all in), down to noon (empty) with 1pm
// (still empty). Flip twice and you're back where you were. From the night
// or the dawn it flips to the morning; from the handover, to the afternoon.
const toAfter = (h) => Math.min(20.9, Math.max(13.1, 21 - (h - 7) * 1.6));  // 7..12 -> 21..13
const toBefore = (h) => Math.min(11.9, Math.max(7.1, 7 + (21 - h) / 1.6));  // 13..21 -> 12..7
export function flipHour(h) {
  if (h >= 7 && h < 12) return toAfter(h);
  if (h >= 13 && h < 21) return toBefore(h);
  if (h >= 12 && h < 13) return 13.6;
  return 7.6;
}
export const dial = {
  name: 'the lease clock',
  flip: true,
  // What time it is (to ten minutes) and what's going on, so a player can
  // tell whether "before noon" is still on.
  label(t) {
    const h = hour(t);
    const phase = h >= 12 && h < 13 ? 'the keys' : h >= 7 && h < 12 ? 'moving out' : h >= 13 && h < 21 ? 'moving in' : h >= 21 || h < 5 ? 'first night' : 'dawn';
    const m = Math.floor((h % 1) * 6) * 10, hh = Math.floor(h), h12 = ((hh + 11) % 12) + 1;
    return `${h12}:${String(m).padStart(2, '0')}${hh < 12 ? 'am' : 'pm'} · ${phase}`;
  },
  // How far through the day it is (the dial's hand), 0 at 5am to 1.
  level: (t) => wrap(t) / LOOP,
  next(t) {
    const h = hour(t), to = flipHour(h);
    const target = at(to);
    // (The same loop, so flipping back and forth never runs the day on.)
    const when = t - wrap(t) + target;
    if (to >= 13) return { at: when, label: 'after', say: 'After. Same apartment, new people. What changed?' };
    return { at: when, label: 'before', say: 'Before. The old tenants, still packing. What changed?' };
  },
};
