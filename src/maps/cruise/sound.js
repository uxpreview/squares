// The ship's sound: the sea washing past the hull and the wind on the open
// decks, the engines' throb (felt everywhere, loudest down in the engine
// room), the steel band by the pool all day, splashes on the Sun Deck, and
// each room's own inside: the buffet's crowd and cutlery, the casino's
// slots, the spa's bubbles, the sick bay's monitor, the bridge's radar, the
// crew party at three. Coming into port the sea goes quiet and the harbor
// comes in. And cues on the day's clock: gulls following the ship, the
// lifeboat drill's alarm (seven short bells and a long one), the limbo's
// cheers at noon, the bingo caller's ding, the crew party going off at 3,
// the ship's own horn as it comes into port, and the island's band playing
// the welcome to nobody. Every bed and cue sits under a honk (node
// tools/sound.mjs cruise).
import { at, hourOf } from './style.js';

const cues = [];
for (const h of [7.4, 8.8, 10.9, 12.6, 14.2, 15.9, 17.3]) cues.push({ at: at(h), name: 'gull', n: 2 });
// The drill: seven short, one long (rung from the bridge, heard all over).
for (let i = 0; i < 7; i++) cues.push({ at: at(10) + i * 0.45, name: 'bell' });
cues.push({ at: at(10) + 3.6, name: 'bridgebell' });
// The limbo, and bingo.
cues.push({ at: at(12.4), name: 'cheer', zone: 'pool' }, { at: at(12.9), name: 'cheer', zone: 'pool' });
for (const h of [15.05, 15.3, 15.55]) cues.push({ at: at(h), name: 'ding', zone: 'theater' });
cues.push({ at: at(15.9), name: 'cheer', zone: 'crew-bar' }); // the crew party goes off
// Into port: the horn, then the welcome.
cues.push({ at: at(17.8), name: 'shiphorn' }, { at: at(18.05), name: 'fanfare', zone: 'port', level: 0.4 });

const within = (h, a, b, ramp = 0.4) => Math.max(0, Math.min(1, (h - a) / ramp, (b - h) / ramp));

// Each deck, outdoors: the sea, the wind, the engines.
const DECKS = {
  sun: { surf: 1, wind: 0.6, engine: 0.1 },
  cabins: { surf: 0.6, wind: 0.3, engine: 0.25 },
  promenade: { surf: 0.6, wind: 0.3, engine: 0.2 },
  crew: { surf: 0.4, wind: 0, engine: 0.6 },
};
const DECK = {
  waterslide: 'sun', pool: 'sun', bridge: 'sun', cabins: 'cabins', 'adults-only': 'cabins',
  theater: 'promenade', buffet: 'promenade', casino: 'promenade',
  'engine-room': 'crew', 'crew-bar': 'crew', 'sick-bay': 'crew',
};
// Each area's own, by the hour (and how muffled the sea is from it).
const AREAS = {
  waterslide: (h) => ({ splash: 1, kids: 0.5, steel: 0.6 * within(h, 9, 17) }),
  pool: (h) => ({ splash: 0.8, kids: 0.35, steel: 0.7 * within(h, 9, 17) }),
  bridge: () => ({ radar: 1, muffle: 0.5 }),
  cabins: () => ({ hum: 0.5, muffle: 0.6 }),
  'adults-only': () => ({ bubbles: 0.7, chatter: 0.2, muffle: 0.6 }),
  theater: () => ({ chatter: 0.6, muffle: 0.7 }),
  buffet: (h) => ({ chatter: 0.4 + 0.6 * within(h, 7, 10, 0.6), clink: 1, muffle: 0.7 }),
  casino: () => ({ slots: 1, chatter: 0.4, muffle: 0.7 }),
  'engine-room': () => ({ engine: 1, muffle: 0.8 }),
  'crew-bar': (h) => ({ chatter: 0.3 + 0.5 * within(h, 15.9, 19), garage: within(h, 15.9, 19), muffle: 0.8 }),
  'sick-bay': () => ({ monitor: 1, hum: 0.4, muffle: 0.8 }),
};

function bed(t, here) {
  const h = hourOf(t), docked = within(h, 17.7, 30, 0.5);
  if (here.zone === 'port') return { harbor: 1, crowd: 0.5 * docked, street: 0.4, steel: 0.6 * docked };
  const d = DECKS[DECK[here.zone] || here.storey] || DECKS.promenade;
  const out = { surf: d.surf * (1 - 0.7 * docked), wind: d.wind * (1 - 0.6 * docked), engine: d.engine * (1 - 0.6 * docked), harbor: 0.5 * docked };
  const own = AREAS[here.zone];
  if (!own) return { ...out, muffle: 0.2 }; // a deck, cut open
  return { ...out, ...own(h) };
}

export const sound = { bed, cues };
