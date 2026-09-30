// The ship's plan: where every area sits, where the doors and the lift are.
// The areas draw their doors from here and the day (day.js) walks people
// through them and up and down in the lift, so a door is only ever in one place.
//
//   x along the ship, from the stern (0) to the bow (80); y across it, from the
//   far side (0, starboard, the back wall) to the cut side (16, the side
//   facing us, cut away). The bow tapers from x 64 to a point at x 80.
//
//   Sun Deck    The Waterslide 0-24 | The Pool 24-56 | The Bridge 56-80   (open air)
//   Cabins      The Cabins 0-48                | Adults Only 48-80
//   Promenade   The Theater 0-24 | The Buffet 24-56 | The Casino 56-80
//   Crew Only   The Engine Room 0-24 | The Crew Bar 24-56 | The Sick Bay 56-80
//   (the sea)   The Port, a little island off the cut side, by the stern
//
// World units: x runs to the screen's lower right, y to the lower left, z up.
import { WALL, SLAB } from '../../engine/iso.js';

export const STOREY = WALL + SLAB; // deck to deck: 7.1
export const LOOP = 240; // the day, 7am to 7pm, in seconds
export const HOUR = LOOP / 12; // 20 seconds an hour
export const LENGTH = 80, BEAM = 16;
export const BOW = 64; // where the bow starts to taper
export const SEA = -0.6; // the waterline: the crew deck is all below it

// Deck heights (the Manor's storeys).
export const DECK = { crew: -STOREY, promenade: 0, cabins: STOREY, sun: 2 * STOREY };

// Area id -> [x, y, z] of its back corner, and its size.
export const AREAS = {
  waterslide: { at: [0, 0, DECK.sun], size: [24, BEAM] },
  pool: { at: [24, 0, DECK.sun], size: [32, BEAM] },
  bridge: { at: [56, 0, DECK.sun], size: [24, BEAM] },
  cabins: { at: [0, 0, DECK.cabins], size: [48, BEAM] },
  'adults-only': { at: [48, 0, DECK.cabins], size: [32, BEAM] },
  theater: { at: [0, 0, DECK.promenade], size: [24, BEAM] },
  buffet: { at: [24, 0, DECK.promenade], size: [32, BEAM] },
  casino: { at: [56, 0, DECK.promenade], size: [24, BEAM] },
  'engine-room': { at: [0, 0, DECK.crew], size: [24, BEAM] },
  'crew-bar': { at: [24, 0, DECK.crew], size: [32, BEAM] },
  'sick-bay': { at: [56, 0, DECK.crew], size: [24, BEAM] },
  port: { at: [4, 20, SEA], size: [18, 16] },
};
export const AT = Object.fromEntries(Object.entries(AREAS).map(([id, a]) => [id, a.at]));

// The corridor: every deck's doors sit on it, near the far wall.
export const CORRIDOR = 3.2;

// Doors, listed under the area whose wall they're in (a wall belongs to the
// area in front of it). side: 'left' is the wall at the area's own x = 0;
// at: the middle of the door along the wall; w: its width. The Sun Deck's
// rails have wide gaps rather than doors.
export const DOORS = {
  pool: [{ id: 'slide-pool', side: 'left', at: 8, w: 12, h: 1.2 }],
  bridge: [{ id: 'pool-bridge', side: 'left', at: 9, w: 10, h: 1.2 }],
  'adults-only': [{ id: 'cabins-adults', side: 'left', at: CORRIDOR }],
  buffet: [
    { id: 'theater-buffet', side: 'left', at: CORRIDOR },
    { id: 'theater-buffet-2', side: 'left', at: 12, w: 3 },
  ],
  casino: [{ id: 'buffet-casino', side: 'left', at: CORRIDOR, w: 3 }],
  'crew-bar': [{ id: 'engine-crew', side: 'left', at: CORRIDOR }],
  'sick-bay': [{ id: 'crew-sick', side: 'left', at: CORRIDOR }],
};

// Each door in world units: which plane it's in and the middle of the opening.
export const DOOR = {};
for (const [area, list] of Object.entries(DOORS)) {
  const [ox, oy, oz] = AT[area];
  for (const d of list) {
    DOOR[d.id] = d.side === 'left'
      ? { axis: 'x', plane: ox, x: ox, y: oy + d.at, z: oz }
      : { axis: 'y', plane: oy, x: ox + d.at, y: oy, z: oz };
  }
}

// The lift: one shaft through every deck, against the far wall. People step
// in at its doors (LIFT.x, LIFT.y) on one deck and out on another. It's in
// the Engine Room, the Theater, the Cabins and the Waterslide.
export const LIFT = { x: 20, y: 1.4, box: [18.4, 0, 3.2, 2.4] }; // box: x, y, w, d

// The gangway: the Casino's door in the cut side, where the port's pier
// meets the ship at 6pm.
export const GANGWAY = { x: 70, y: BEAM, z: DECK.promenade };

// Where an area's own things go, from world units to its own.
export const local = (area, x, y, z = AT[area][2]) => [x - AT[area][0], y - AT[area][1], z - AT[area][2]];

// The bow's outline on a deck, in world units: the far side runs straight to
// x BOW then in to the point; the cut side the same. inBow(x, y) says whether
// a point is on board there.
export const bowHalf = (x) => (x <= BOW ? BEAM / 2 : (BEAM / 2) * (1 - (x - BOW) / (LENGTH - BOW)));
export const onBoard = (x, y) => x >= 0 && x <= LENGTH && Math.abs(y - BEAM / 2) <= bowHalf(x);
