// The Block Party's sound: the street under everything, changing with the
// day (birds at dawn, quieter and crickets after dark, the crowd and the band
// on the stage at the party, loudest on Main Street where the stage is); in a
// room the street goes muffled and you hear the room (the dryers, the oven,
// the band rehearsing), as busy as its hours. And cues on the day's clock,
// taken from the day itself so they always land on the picture: the bin
// lorry's horn when it says HONK, the librarian's shush, the sound check once
// the band is on the stage, the crowd when the party starts, the rocket going
// up. Every bed and cue sits well under a honk (node tools/sound.mjs block).
import { LOOP } from './plan.js';
import { at, hour, nightK, open, rush, within, LAUNCH } from './clock.js';
import { walkers } from './day.js';

const cues = [];
// Every time someone starts to say one of these, play that (from where they are).
const SAYS = { HONK: 'horn', HOOONK: 'horn', 'Shh!': 'shush', 'One, two, HONK': 'thump' };
for (const w of walkers) {
  let was = null;
  for (let t = 0; t < LOOP; t += 0.25) {
    const say = w.at(t).say || null;
    if (say !== was && SAYS[say]) cues.push({ at: t, name: SAYS[say], ...(say === 'Shh!' ? { zone: 'library' } : {}) });
    was = say;
  }
}
for (const h of [15, 15.8, 16.6, 17.4, 18.2]) cues.push({ at: at(h), name: 'thump' }); // the sound check
for (const h of [19.1, 20.3, 21.4]) cues.push({ at: at(h), name: 'cheer' }); // the party
cues.push({ at: at(LAUNCH), name: 'launch' });

// What each room sounds like inside, by its hours (clock.js).
const ROOMS = {
  observatory: (t) => ({ hum: 0.5 * open('observatory', t) }),
  launchpad: () => ({ hum: 0.6 }),
  pool: (t) => ({ splash: (0.3 + 0.7 * rush('pool', t)) * open('pool', t), playroom: 0.7 * rush('pool', t) }),
  arcade: (t) => ({ bleeps: open('arcade', t), playroom: 0.4 * rush('arcade', t) }),
  greenhouse: (t) => ({ sprinkler: rush('greenhouse', t), hum: 0.25 }),
  disco: (t) => ({ disco: open('disco', t), chatter: 0.6 * rush('disco', t) }),
  library: (t) => ({ hush: 1, playroom: 0.3 * rush('library', t) }), // story time
  icerink: (t) => ({ rink: open('icerink', t), chatter: 0.4 * rush('icerink', t) }),
  noodles: (t) => ({ sizzle: open('noodles', t), chatter: (0.3 + 0.7 * rush('noodles', t)) * open('noodles', t) }),
  bakery: (t) => ({ oven: open('bakery', t), chatter: 0.7 * rush('bakery', t) }),
  laundromat: (t) => ({ tumble: 0.45 + 0.55 * rush('laundromat', t) }),
  ballpit: (t) => ({ playroom: (0.2 + 0.8 * rush('ballpit', t)) * open('ballpit', t) }),
  umbrellas: (t) => ({ downpour: rush('umbrellas', t), hum: 0.3 }), // the afternoon downpour, indoors
  aquarium: () => ({ bubbles: 1 }),
  band: (t) => ({ garage: within([11, 14.4], hour(t), 0.3) }), // practice, until the amps go out to the stage
  trains: (t) => ({ trains: open('trains', t) }),
};
// How near the stage each street is.
const STREETS = { 'main-street': 1, alleys: 0.5, pavement: 0.7 };

function bed(t, here) {
  const h = hour(t), n = nightK(t);
  const party = within([18.8, 22.5], h, 0.6), band = within([19, 22.2], h, 0.4);
  const out = {
    street: 1 - 0.55 * n,
    birds: 0.6 * within([5, 8.5], h, 0.7),
    night: 0.6 * n * (1 - party),
  };
  const room = ROOMS[here.zone];
  const near = room ? 0.6 : here.zone ? STREETS[here.zone] ?? 1 : 0.8;
  out.crowd = 0.8 * party * near;
  out.groove = band * near;
  if (!room) return out;
  for (const k of Object.keys(out)) out[k] *= 0.8;
  return { ...out, ...room(t), muffle: 0.75 };
}

export const sound = { bed, cues };
