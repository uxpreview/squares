// The Block Party's sound: street noise under everything, and cues on the
// day's clock, taken from the day itself so they always land on the picture:
// the bin lorry's horn when it says HONK, the librarian's shush, the sound
// check once the band is on the stage, the crowd when the party starts, the
// rocket going up.
import { LOOP } from './plan.js';
import { at, LAUNCH } from './clock.js';
import { walkers } from './day.js';

const cues = [];
// Every time someone starts to say one of these, play that.
const SAYS = { HONK: 'horn', HOOONK: 'horn', 'Shh!': 'shush', 'One, two, HONK': 'thump' };
for (const w of walkers) {
  let was = null;
  for (let t = 0; t < LOOP; t += 0.25) {
    const say = w.at(t).say || null;
    if (say !== was && SAYS[say]) cues.push({ at: t, name: SAYS[say] });
    was = say;
  }
}
for (const h of [15, 15.8, 16.6, 17.4, 18.2]) cues.push({ at: at(h), name: 'thump' }); // the sound check
for (const h of [19.1, 20.3, 21.4]) cues.push({ at: at(h), name: 'cheer' }); // the party
cues.push({ at: at(LAUNCH), name: 'launch' });

export const sound = { bed: 'street', cues };
