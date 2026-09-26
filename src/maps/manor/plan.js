// The house plan: where every area sits, where the doors and stairs are. The
// areas draw their doors from here and the evening (evening.js) walks people
// through them, so a door can only ever be in one place.
//
//   Upstairs   (library void)   Master Bedroom
//              Taxidermy Room   Guest Rooms
//   Ground     Library          Dining Room      Kitchen
//              Billiard Room    Grand Hall       Conservatory
//   Cellar                                       Cellar (under the kitchen)
//   Outside                     The Grounds (in front of the hall)
//
// World units: x runs to the screen's lower right, y to the lower left, z up.
// Every area is 16 x 16. The library is two storeys tall.
import { S, WALL, SLAB } from '../../engine/iso.js';

export const STOREY = WALL + SLAB; // floor to floor: 7.1
export const LOOP = 180; // the evening, in seconds

// Area id -> [x, y, z] of its back corner.
export const AT = {
  library: [0, 0, 0],
  'dining-room': [S, 0, 0],
  kitchen: [2 * S, 0, 0],
  'billiard-room': [0, S, 0],
  'grand-hall': [S, S, 0],
  conservatory: [2 * S, S, 0],
  grounds: [S, 2 * S, 0],
  'master-bedroom': [S, 0, STOREY],
  'taxidermy-room': [0, S, STOREY],
  'guest-rooms': [S, S, STOREY],
  cellar: [2 * S, 0, -STOREY],
};

// The house's footprint (x0, y0, x1, y1) and the lawn it stands on. The lawn
// stops flush with the house on the right, where the cut through the ground
// shows the cellar.
export const HOUSE = [0, 0, 3 * S, 2 * S];
export const LAWN = [-14, -12, 3 * S, 2 * S + 22];
export const DEPTH = 10; // how deep the cut through the ground goes

// Doors, listed under the area whose wall they're in (a wall belongs to the
// room in front of it). side: 'left' is the wall at x = 0, 'right' the wall
// at y = 0; at: the middle of the door along the wall; w: its width.
export const DOORS = {
  'dining-room': [{ id: 'dining-library', side: 'left', at: 10 }],
  kitchen: [{ id: 'kitchen-dining', side: 'left', at: 12.5 }],
  'billiard-room': [{ id: 'billiard-library', side: 'right', at: 10 }],
  'grand-hall': [
    { id: 'hall-billiard', side: 'left', at: 8 },
    { id: 'hall-dining', side: 'right', at: 13.5 },
  ],
  conservatory: [
    { id: 'conservatory-hall', side: 'left', at: 8 },
    { id: 'conservatory-kitchen', side: 'right', at: 8 },
  ],
  grounds: [{ id: 'front-door', side: 'right', at: 8, w: 2.6, h: 4 }],
  'guest-rooms': [
    { id: 'guest-taxidermy', side: 'left', at: 4.5 },
    { id: 'guest-master', side: 'right', at: 13.5 },
  ],
};

// Each door in world units: which plane it's in (x = plane or y = plane) and
// the middle of the opening.
export const DOOR = {};
for (const [area, list] of Object.entries(DOORS)) {
  const [ox, oy, oz] = AT[area];
  for (const d of list) {
    DOOR[d.id] = d.side === 'left'
      ? { axis: 'x', plane: ox, x: ox, y: oy + d.at, z: oz }
      : { axis: 'y', plane: oy, x: ox + d.at, y: oy, z: oz };
  }
}

// Stairs, world units: the grand staircase climbs from the hall to the
// upstairs landing; the cellar steps go down through a hatch in the kitchen.
export const STAIRS = {
  grand: { bottom: [27.6, 17.6, 0], top: [17.2, 17.6, STOREY], box: [17.5, 16.4, 9.5, 2.4] }, // box: x, y, w, d
  cellar: { top: [45.2, 14.4, 0], bottom: [45.2, 9.3, -STOREY], box: [44.2, 9.5, 2, 5] },
};

// Where an area's own things go, from world units to its own.
export const local = (area, x, y, z = AT[area][2]) => [x - AT[area][0], y - AT[area][1], z - AT[area][2]];
