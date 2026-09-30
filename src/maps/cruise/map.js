// All You Can Eat: day four on a cruise ship, cut open from bow to stern.
// Something from the buffet is going round, deck by deck, and you have until
// the ship docks to find patient zero. A whodunit (case.js) on four decks
// (the Manor's storeys, changed from the ship's lift), everyone on one clock
// from 7am to 7pm (day.js), the ship on a sea that follows the day. The brief
// is docs/levels/cruise.md; the layout is plan.js.
import { AREAS, STOREY, DECK, LOOP, LENGTH, BEAM } from './plan.js';
import { walkers } from './day.js';
import { seaAt, clockLabel, wrap, MOMENTS, LIFT_COLORS } from './style.js';
import { backdrop, sky } from './ambient.js';
import cruiseCase from './case.js';
import { sound } from './sound.js';

import waterslide from './areas/waterslide.js';
import pool from './areas/pool.js';
import bridge from './areas/bridge.js';
import cabins from './areas/cabins.js';
import adultsOnly from './areas/adults-only.js';
import theater from './areas/theater.js';
import buffet from './areas/buffet.js';
import casino from './areas/casino.js';
import engineRoom from './areas/engine-room.js';
import crewBar from './areas/crew-bar.js';
import sickBay from './areas/sick-bay.js';
import port from './areas/port.js';

const place = (zone, tag, o = {}) => ({ zone, at: AREAS[zone.id].at, size: AREAS[zone.id].size, tag, ...o });

// The dial: the ship's clock, and a tap skips to the day's next moment.
const dial = {
  name: "the ship's clock",
  label: clockLabel,
  level: (t) => wrap(t) / LOOP,
  next(t) {
    const w = wrap(t);
    const m = MOMENTS.find((x) => x.at > w + 5) || MOMENTS[0];
    let when = t - w + m.at;
    while (when < t + 5) when += LOOP;
    return { at: when, label: m.label, say: m.say };
  },
};

export default {
  id: 'cruise',
  name: 'All-You-Can-Eat',
  short: 'The ship', // the back button in an area
  tagline: 'Day four at sea. Something from the buffet is going round, and nobody is getting off.',
  zones: [
    place(waterslide, 'Sun Deck'),
    place(pool, 'Sun Deck'),
    place(bridge, 'Sun Deck'),
    place(cabins, 'Cabins'),
    place(adultsOnly, 'Cabins'),
    place(theater, 'Promenade'),
    place(buffet, 'Promenade'),
    place(casino, 'Promenade'),
    // (The hull's red bottom hangs 2.7 under the crew deck: its pictures reach further.)
    place(engineRoom, 'Crew only', { reach: 2.2 }),
    place(crewBar, 'Crew only', { reach: 2.2 }),
    place(sickBay, 'Crew only', { reach: 2.2 }),
    place(port, 'The port', { fixed: true, h: 3 }),
  ],
  // Prev / next: the crime scene first, then up the ship, then down below.
  order: [
    'buffet', 'theater', 'casino', 'cabins', 'adults-only', 'pool', 'waterslide', 'bridge',
    'engine-room', 'crew-bar', 'sick-bay', 'port',
  ],
  storeys: [
    { id: 'crew', name: 'Crew only', short: 'Crew', z: DECK.crew },
    { id: 'promenade', name: 'Promenade', z: DECK.promenade },
    { id: 'cabins', name: 'Cabins', z: DECK.cabins },
    { id: 'sun', name: 'Sun Deck', short: 'Sun', z: DECK.sun },
  ],
  storey: 'promenade',
  // The ship's lift panel.
  lift: LIFT_COLORS,
  // Decks above the one you're on lift off and hover, faint, like an
  // exploded drawing of the ship.
  cutaway: { front: true, above: true, walls: 1.2, lift: 14, ghost: 0.09 },
  // The paper is the sea, and it follows the day; it runs to every edge, and
  // to the picker card's edges too.
  plate: { at: (t) => ({ paper: seaAt(t), kind: 'night' }), bleed: true },
  dial,
  // A first visit starts where it started: the salad bar.
  invite: { zone: 'buffet', at: [14, 6, 1.2] },
  // The whole ship on a wide screen; on an upright phone, the middle of the
  // ship to its full height, bow and stern running off the sides; on a phone
  // on its side, the decks filling the height.
  overview: (portrait) => {
    const X0 = -24, X1 = 112, Y0 = -(DECK.sun + 10) * 1.12 - 8, Y1 = (LENGTH + BEAM) / 2 + 10;
    if (portrait) return [23, 37, Y0 + 4, Y1 - 4];
    return [X0, X1, Y0, Y1];
  },
  walkers,
  sound,
  backdrop,
  sky,
  // A whodunit: the goal is naming patient zero (case.js).
  case: cruiseCase,
  words: {
    zone: 'deck',
    invite: 'Start at the buffet',
    hint: 'Find where it began. Name patient zero.',
    whole: 'The whole ship',
    complete: 'Patient zero was a stowaway iguana. It is not getting off either.',
  },
  loop: LOOP,
  qa: {
    goosePerZone: false,
    geese: 1,
    things: [2, 4],
    at: 40,
    moments: MOMENTS.map((m) => ({ at: m.at + 3, label: m.label })),
    zoneAt: { pool: 76, cabins: 62, theater: 50, 'sick-bay': 150, port: 168 },
  },
};

export { STOREY };
