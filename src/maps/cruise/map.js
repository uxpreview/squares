// All You Can Eat: day four on a cruise ship, cut open from bow to stern.
// Something from the buffet is going round, and patient zero, a stowaway
// iguana, is loose. A chase (trail.js): follow it sighting by sighting
// through the day, deck to deck (the Manor's storeys, changed from the ship's
// lift), and corner it at the gangway as the ship docks. Everyone is on one
// clock from 7am to 7pm (day.js), and the ship is on a sea that follows the
// day. The brief is docs/levels/cruise.md; the layout is plan.js.
import { AREAS, STOREY, DECK, LOOP, LENGTH, BEAM } from './plan.js';
import { walkers } from './day.js';
import { seaAt, clockLabel, wrap, at, MOMENTS, LIFT_COLORS, CHASE, chase, chaseOpen, caught } from './style.js';
import { backdrop, sky } from './ambient.js';
import trail from './trail.js';
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

// The dial: the ship's clock, and a tap skips to the day's next moment. On
// the chase, while the next sighting's hours aren't now, straight to them
// (its moment: every sighting's note is a moment's label), so a player who
// missed noon isn't six taps from it.
const dial = {
  name: "the ship's clock",
  label: clockLabel,
  level: (t) => wrap(t) / LOOP,
  next(t) {
    const w = wrap(t);
    const want = !caught() && !chaseOpen(chase.step, t) && MOMENTS.find((x) => x.label === CHASE[chase.step].note);
    const m = want || MOMENTS.find((x) => x.at > w + 5) || MOMENTS[0];
    let when = t - w + m.at;
    while (when < t + 5) when += LOOP;
    return { at: when, label: m.label, say: m.say };
  },
};

export default {
  id: 'cruise',
  name: 'All-You-Can-Eat',
  short: 'The ship', // the back button in an area
  tagline: 'Day four at sea. Patient zero is a stowaway iguana, and it is loose.',
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
  // Prev / next: where it started first, then up the ship, then down below.
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
  // A first visit starts where it started: the lettuce on the salad bar,
  // where the first sighting hides.
  invite: { zone: 'buffet', at: [13.1, 8.0, 1.6] },
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
  // A chase: the goal is the iguana's last sighting (trail.js).
  trail,
  // Cornered: the clock goes to just after docking and the camera to the
  // gangway, where the iguana is under a towel and the clicker says 2,400.
  // (Framed close round the gangway desk, at the Casino's stern end.)
  finale: { at: at(18.25), zone: 'casino', near: [AREAS.casino.at[0] + 12, AREAS.casino.at[1] + 13.5], span: 5, hold: 8 },
  words: {
    zone: 'deck',
    invite: 'Start at the buffet',
    hint: 'Patient zero is loose. Follow it.',
    whole: 'The whole ship',
    inside: 'on the ship', // the card: "You found 20 of the 37 things on the ship."
    complete: 'Patient zero was a stowaway iguana. It tried to get off at the gangway. Nobody gets off.',
    describe: 'A cruise ship from above, cut open along its side like a dollhouse, four decks deep with the crew deck under the waterline. The deck in view is solid, the ones above float faintly over it, and a tiny palm island waits ahead. The sea turns from turquoise to gold to pink as the ship nears port.',
  },
  loop: LOOP,
  qa: {
    goosePerZone: false,
    geese: 1,
    things: [2, 5], // (each area on the chase has a sighting too)
    at: 40,
    moments: MOMENTS.map((m) => ({ at: m.at + 3, label: m.label })),
    zoneAt: { pool: 76, cabins: 62, theater: 50, 'sick-bay': 150, port: 168 },
  },
};

export { STOREY };
