// Pitch Day's sound. On the top floor: the office's chatter and keyboards
// all working day, a hum under it (the server closet louder in Dev and QA),
// low at night with Dev still typing. Outside, and muffled through the
// glass: the woods' birds by day (most in the morning), the road, the leaf
// blower man in the lot all day (a little motor and the rush of air), the
// fire pit crackling from five, crickets at night.
//
// Cues on the day's clock: the notification pings running round the floor
// at bear o'clock; the coffee machine QA broke, clunking in the kitchen all
// morning; the photo set's strobe charging in Creative; the deploy starting
// over at five to five; and the doorbell when the pizza comes for Dev at
// eight. Every bed and cue sits under a honk (node tools/sound.mjs agency).
import { H, at, staffed, dev, nightK, BEAR_TIMES } from './clock.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ramp = (a, b, v) => clamp((v - a) / (b - a));
// Something on between hours a and b, easing in and out over r hours.
const within = (h, a, b, r = 0.4) => clamp(Math.min((h - a) / r, (b - h) / r));

// ---------- Cues ----------
const cues = [];
// Bear o'clock: someone sees it, and the pings run round the floor.
for (const [a] of BEAR_TIMES) for (let i = 0; i < 3; i++) cues.push({ at: a + 0.4 + i * 0.5, name: 'ding' });
// The coffee machine in the kitchen: clunk. Every half minute or so, all
// morning, as people try it anyway.
for (let t = at(8.6); t < at(12); t += 23) cues.push({ at: t, name: 'clunk', level: 0.6, zone: 'front' });
// The strobe on the photo set, charging for a shot that never comes.
for (let t = at(9.3) + 4; t < at(16.5); t += 29) cues.push({ at: t, name: 'beep', zone: 'creative' });
// The deploy at 99%, at five to five: and it starts over.
cues.push({ at: at(16.92), name: 'clunk', level: 0.7, zone: 'dev-qa' });
// The pizza, at Dev's end of the floor, at eight (day.js).
cues.push({ at: at(19.95), name: 'ding', down: true, zone: 'dev-qa' });

// ---------- The beds ----------
// Each area: how much of the office and of the outdoors it hears, and how
// muffled the outdoors is there (through the glass).
const OFFICE = { inside: 1, out: 0.45, muffle: 0.6 };
const AREAS = { lot: { inside: 0.12, out: 1, muffle: 0.75 } };
const WHOLE = { inside: 0.55, out: 0.7, muffle: 0.2 };

function bed(t, here) {
  const z = here.zone, a = AREAS[z] || (z ? OFFICE : WHOLE);
  const h = H(t), n = nightK(t);
  const busy = staffed(t), late = dev(t) && busy < 0.3;
  const lot = z === 'lot' ? 1 : z ? 0.15 : 0.45;
  // Dev's corner keeps typing long after the floor's gone home.
  const devHere = z === 'dev-qa' ? 1 : z ? 0 : 0.4;
  return {
    chatter: a.inside * 0.75 * busy,
    bleeps: a.inside * 0.3 * busy + (late ? 0.3 * devHere : 0),
    hum: a.inside * (z === 'dev-qa' ? 0.55 : 0.35),
    birds: a.out * 0.6 * within(h, 6.8, 18, 0.8) * (1 - 0.5 * ramp(9, 12, h)),
    street: a.out * (n > 0.5 ? 0.15 : 0.35),
    // The leaf blower in the lot, by day: a motor and its rush of air.
    engine: lot * 0.5 * within(h, 8.4, 16.9, 0.2),
    sprinkler: lot * 0.4 * within(h, 8.4, 16.9, 0.2),
    // The fire pit, off in the wood behind, from five.
    fire: (z === 'lot' ? 0.35 : z ? 0 : 0.3) * within(h, 17.1, 23.5, 0.6),
    night: a.out * 0.55 * n,
    muffle: a.muffle,
  };
}

export const sound = { bed, cues };
