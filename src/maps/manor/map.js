// Gooseworth Manor: a murder mystery in one house, on a stormy night. Three
// storeys (cellar, ground floor, upstairs) shown one at a time with a floor
// switch; inside walls drop to waist height so you can see into every room;
// everyone moves between rooms on one clock (evening.js). The brief is
// docs/levels/manor.md; the layout is plan.js.
import { WALL } from '../../engine/iso.js';
import { PAPER } from './style.js';
import { AT, STOREY, LOOP } from './plan.js';
import { walkers } from './evening.js';
import { backdrop, sky, PLATE } from './ambient.js';

import library from './areas/library.js';
import diningRoom from './areas/dining-room.js';
import kitchen from './areas/kitchen.js';
import billiardRoom from './areas/billiard-room.js';
import grandHall from './areas/grand-hall.js';
import conservatory from './areas/conservatory.js';
import grounds from './areas/grounds.js';
import masterBedroom from './areas/master-bedroom.js';
import taxidermyRoom from './areas/taxidermy-room.js';
import guestRooms from './areas/guest-rooms.js';
import cellar from './areas/cellar.js';

const place = (zone, tag, o = {}) => ({ zone, at: AT[zone.id], tag, ...o });

export default {
  id: 'manor',
  name: 'Gooseworth Manor',
  tagline: 'A stormy night, a body in the trifle, six suspects and a goose.',
  zones: [
    place(library, 'Ground floor', { h: STOREY + WALL }), // two storeys tall
    place(diningRoom, 'Ground floor'),
    place(kitchen, 'Ground floor'),
    place(billiardRoom, 'Ground floor'),
    place(grandHall, 'Ground floor'),
    place(conservatory, 'Ground floor'),
    place(grounds, 'Outside', { fixed: true }),
    place(masterBedroom, 'Upstairs'),
    place(taxidermyRoom, 'Upstairs'),
    place(guestRooms, 'Upstairs'),
    place(cellar, 'Cellar'),
  ],
  // Prev / next: arrive at the front door, the ground floor, up, then down.
  order: [
    'grounds', 'grand-hall', 'library', 'dining-room', 'kitchen', 'conservatory', 'billiard-room',
    'guest-rooms', 'master-bedroom', 'taxidermy-room', 'cellar',
  ],
  storeys: [
    { id: 'cellar', name: 'Cellar', z: -STOREY },
    { id: 'ground', name: 'Ground floor', short: 'Ground', z: 0 },
    { id: 'up', name: 'Upstairs', z: STOREY },
  ],
  storey: 'ground',
  cutaway: { front: true, above: true, walls: 1.2, lift: 16, ghost: 0.05 },
  plate: { paper: PAPER, kind: 'night' },
  // The whole plate on a wide screen; on a phone, the house and its lawn, with
  // the plate's far corners running off the sides; on a phone held sideways,
  // just the house.
  overview: (portrait, storey, short) => {
    if (portrait) return [-35, 50, PLATE[1] + 4, PLATE[3] + 4];
    if (short) return [-42, 56, -42, 52];
    return [PLATE[0] - 4, PLATE[2] + 4, PLATE[1] - 6, PLATE[3] + 10];
  },
  walkers,
  backdrop,
  sky,
  words: {
    zone: 'room',
    hint: 'Tap a room to step inside, or change floors.',
    whole: 'The whole house',
    complete: 'You found the goose. Whether it did it is another matter.',
  },
  loop: LOOP, // the evening repeats every 3 minutes
  // What npm run qa expects of this level (the default is the Block's one
  // goose and three things per area), and which moments the contact sheet shows.
  qa: {
    goosePerZone: false,
    geese: 1,
    things: [1, 4],
    at: 70,
    moments: [{ at: 20, label: 'Dinner' }, { at: 88, label: 'Lights out' }, { at: 118, label: 'Everyone in the library' }],
    zoneAt: { library: 118, 'dining-room': 20, 'guest-rooms': 76 },
  },
};
