// Pitch Day's sound (greybox): the office's chatter, hum and keyboards on the
// top floor, the woods' birds and the road outside, and cues on the day's
// clock: a notification ping running round the floor when someone spots the
// bear, the coffee machine's sad gurgle, the leaf blower. The art session
// tunes it; every bed and cue sits under a honk (node tools/sound.mjs agency).
import { staffed, dev, dark, BEAR_TIMES } from './clock.js';

const cues = [];
// Bear o'clock: someone sees it, and the pings run round the floor.
for (const [a] of BEAR_TIMES) for (let i = 0; i < 3; i++) cues.push({ at: a + 0.4 + i * 0.5, name: 'ding' });

// Each area: how much of the office and of the outdoors it hears.
const OFFICE = { inside: 1, out: 0.2 };
const AREAS = { lot: { inside: 0.15, out: 1 } };
const WHOLE = { inside: 0.5, out: 0.5 };

function bed(t, here) {
  const a = AREAS[here.zone] || (here.zone ? OFFICE : WHOLE);
  const busy = Math.max(staffed(t), dev(t) ? 0.25 : 0);
  return {
    chatter: a.inside * 0.8 * busy,
    hum: a.inside * 0.35,
    bleeps: a.inside * 0.3 * busy,
    birds: a.out * (dark(t) ? 0.1 : 0.6),
    street: a.out * 0.35,
    night: a.out * (dark(t) ? 0.5 : 0),
  };
}

export const sound = { bed, cues };
