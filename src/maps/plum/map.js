// Plum Island: a real barrier island on a July day, where the tide drains the
// marsh at midday and a king tide comes over the road at midnight, and
// nobody on the island is taking it seriously. The first place with ground
// and water (ROADMAP E4, src/engine/terrain.js): the land is one piece
// (land.js), each area prints its part of it, and the tide (tide.js) moves
// every shoreline at once. The brief is docs/levels/plum.md.
//
// Seven areas, laid out as the island is (compressed, never rearranged),
// from Sandy Point at the top left to the Point at the bottom right:
//
//            the refuge (south)    | x 48-70    | x 70-96        | x 96-112
//   back   | The Sound             | The Turnpike                | The
//   island | The Refuge Dunes      | The Center | The Town Beach | North
//   beach  | The Refuge Beach      |            |                | Point
import { W, D, AREAS, PIKE, land } from './land.js';
import { LOOP, KING, KING_AT, at, dial } from './tide.js';
import { walkers } from './day.js';
import { backdrop, sky, paperAt } from './ambient.js';
import { sound as soundBed } from './sound.js';

import sound from './areas/sound.js';
import turnpike from './areas/turnpike.js';
import northPoint from './areas/north-point.js';
import refugeDunes from './areas/refuge-dunes.js';
import center from './areas/center.js';
import refugeBeach from './areas/refuge-beach.js';
import townBeach from './areas/town-beach.js';

const place = (zone, tag) => ({ zone, at: [0, 0, 0], shape: [AREAS[zone.id]], tag, h: 3 });

export default {
  id: 'plum',
  name: 'Plum Island',
  short: 'Plum Island',
  tagline: 'A barrier island, a king tide tonight, and nobody taking it seriously.',
  zones: [
    place(sound, 'The Sound'),
    place(turnpike, 'The Marsh'),
    place(northPoint, 'The North End'),
    place(refugeDunes, 'The Refuge'),
    place(center, 'The Town'),
    place(refugeBeach, 'The Refuge'),
    place(townBeach, 'The Town'),
  ],
  order: ['center', 'town-beach', 'turnpike', 'north-point', 'refuge-dunes', 'refuge-beach', 'sound'],
  // Nothing is cut away in front of the area you're in: it's all open ground,
  // and the cut sliced the tower, umbrellas and people standing in front of
  // an area's edge (the owner's phone pass). No find sits behind anything
  // tall in front of it (the boot moved out from behind the tower for this).
  cutaway: { front: false },
  land,
  walkers,
  loop: LOOP,
  // The paper is the sea, and follows the day: pale at dawn, bright at noon,
  // gold at sunset, deep navy for the king tide (style.js). It's always dark
  // enough that the page's loose words print in cream.
  // In the picker, the sea runs to the card's edges too (bleed).
  plate: { at: (t) => ({ paper: paperAt(t), kind: 'night' }), bleed: true },
  dial,
  invite: { zone: 'center', at: [62, 40, 1.4] },
  // The ending: the clock jumps to the king tide, the camera goes to the
  // turnpike, where the Courier's van is stuck in the flood by the drawbridge.
  finale: { at: KING_AT, zone: 'turnpike', near: [PIKE, 16], hold: 9 },
  sound: soundBed,
  // On a phone held upright the overview fills the height round the Center
  // and the Town Beach, and the island runs off both sides, a swipe along it
  // (decision 16); on its side and on a big screen, the whole island.
  overview: (portrait, storey, short) => {
    const X0 = -D, X1 = W, Y0 = -KING * 1.12 - 4, Y1 = (W + D) / 2 + 2;
    if (portrait) return [34, 36, 12, 74];
    if (short) return [X0 - 2, X1 + 2, (Y0 + Y1) / 2 - 1, (Y0 + Y1) / 2 + 1];
    return [X0 - 2, X1 + 2, Y0, Y1];
  },
  backdrop,
  sky,
  words: {
    zone: 'spot',
    invite: 'King tide tonight',
    hint: 'A goose on every stretch. Step in.',
    whole: 'The whole island',
    complete: 'Every goose, found. Here comes the tide.',
    describe: 'A long, low island in the sea: the refuge\'s dunes and closed beach to the left, the town\'s houses and the lighthouse to the right. Behind it lie the Sound and the marsh, and the one road in, over a drawbridge. At noon the marsh drains to mud, and by midnight the sea is over the road.',
  },
  qa: {
    goosePerZone: true,
    things: [4, 4],
    at: at(12),
    // Timed at low water at noon, and at high water after dark (the evening
    // inks, the lights, the most water on screen).
    speedAt: [at(12), at(23)],
    moments: [
      { at: at(6), label: 'Dawn, going out' },
      { at: at(12), label: 'Low tide' },
      { at: at(17.5), label: 'Coming in' },
      { at: at(20.33), label: 'Sunset' },
      { at: KING_AT, label: 'The king tide' },
    ],
  },
};
