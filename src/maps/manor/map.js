// Gooseworth Manor: a murder mystery in one house, on a stormy night. Three
// storeys (cellar, ground floor, upstairs) shown one at a time with a floor
// switch; inside walls drop to waist height so you can see into every room;
// everyone moves between rooms on one clock (evening.js). The brief is
// docs/levels/manor.md; the layout is plan.js.
import { WALL } from '../../engine/iso.js';
import { INK, NIGHT, storm, MIDNIGHT } from './style.js';
import { AT, STOREY, LOOP } from './plan.js';
import { walkers } from './evening.js';
import { backdrop, sky, PLATE } from './ambient.js';
import manorCase from './case.js';

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
  short: 'The Manor', // the back button in a room
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
  // The lift that changes floors: a brass plate (its lamp is the coral one).
  lift: { plate: INK.candleGold, ink: NIGHT.plate },
  cutaway: { front: true, above: true, walls: 1.2, lift: 16, ghost: 0.05 },
  // Printed on the night itself: it runs to every edge of the screen.
  plate: { paper: NIGHT.plate, kind: 'night' },
  // A first visit: the invitation (words.invite, words.hint) points at the
  // body, face down in the trifle on the library table.
  invite: { zone: 'library', at: [8, 8, 1.3] },
  // The whole picture on a wide screen; on a phone, the house edge to edge,
  // the lawn's far corners running off the sides; on a phone held sideways,
  // the rooms filling the height. The night runs on past all of it.
  overview: (portrait, storey, short) => {
    if (portrait) return [-31, 46, PLATE[1] + 4, PLATE[3] + 4];
    if (short) return [-40, 54, -24, 46];
    return [PLATE[0] - 2, PLATE[2] + 2, PLATE[1] - 2, PLATE[3] + 2];
  },
  walkers,
  backdrop,
  sky,
  // A whodunit: the goal is solving the case, not finding the goose (case.js).
  case: manorCase,
  // Rain all night, and on the clock: thunder after every strike (sooner and
  // louder for the big ones), someone at the organ, the lights going out, the
  // grandfather clock striking midnight.
  sound: {
    bed: 'rain',
    cues: [
      ...storm.strikes.map((s) => ({ at: s.t + (s.big ? 0.3 : 1.1), name: 'thunder', big: s.big })),
      { at: 57, name: 'organ' },
      { at: 82, name: 'clunk' },
      { at: MIDNIGHT, name: 'bell' },
      { at: MIDNIGHT + 1.7, name: 'bell' },
      { at: MIDNIGHT + 3.4, name: 'bell' },
    ],
  },
  words: {
    zone: 'room',
    invite: 'Start with the body',
    hint: 'Find the evidence. Name the killer.',
    whole: 'The whole house',
    complete: 'The goose did it. It has taken his chair, wearing the monocle it ordered by post.',
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
