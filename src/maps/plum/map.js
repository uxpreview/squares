// Plum Island: a real barrier island on a summer day, where the tide drains
// and floods the marsh on the clock, a king tide is coming tonight, and
// nobody is taking it seriously. The first place with ground and water
// (ROADMAP E4, src/engine/terrain.js): the land is one piece (land.js), each
// area prints its part of it, and the tide (tide.js) moves every shoreline
// at once. The brief is docs/levels/plum.md.
//
// Seven areas, laid out as the island is (compressed, never rearranged):
//
//            refuge (south)      town            north end
//   back   | The Flats        | The Turnpike  |
//   island | The Refuge Dunes | The Center    | The North Point
//   front  | The Refuge Beach | The Front Beach|
import { W, D, AREAS, PIKE, land } from './land.js';
import { LOOP, KING, at, nightK, dial } from './tide.js';
import { walkers } from './day.js';
import { backdrop, sky, paperAt } from './ambient.js';

import flats from './areas/flats.js';
import turnpike from './areas/turnpike.js';
import northPoint from './areas/north-point.js';
import refugeDunes from './areas/refuge-dunes.js';
import center from './areas/center.js';
import refugeBeach from './areas/refuge-beach.js';
import frontBeach from './areas/front-beach.js';

const place = (zone, tag) => ({ zone, at: [0, 0, 0], shape: [AREAS[zone.id]], tag, h: 3 });

export default {
  id: 'plum',
  name: 'Plum Island',
  short: 'Plum Island',
  tagline: 'A barrier island, a king tide tonight, and nobody taking it seriously.',
  zones: [
    place(flats, 'The Sound'),
    place(turnpike, 'The Marsh'),
    place(northPoint, 'The North End'),
    place(refugeDunes, 'The Refuge'),
    place(center, 'The Town'),
    place(refugeBeach, 'The Refuge'),
    place(frontBeach, 'The Town'),
  ],
  order: ['front-beach', 'center', 'turnpike', 'flats', 'refuge-dunes', 'refuge-beach', 'north-point'],
  cutaway: { front: true },
  land,
  walkers,
  loop: LOOP,
  // The paper follows the day: a warm dawn, bleached noon, gold at sunset, a
  // deep blue evening for the king tide (style.js, DAY).
  plate: { at: (t) => ({ paper: paperAt(t), kind: nightK(t) > 0.5 ? 'night' : '' }) },
  dial,
  invite: { zone: 'front-beach', at: [60, 47, 0.3] },
  // The ending: the clock jumps to the king tide, the camera goes to the
  // turnpike, where the Courier's van is stuck in the flood.
  finale: { at: at(20.5), zone: 'turnpike', near: [PIKE, 9], hold: 9 },
  sound: { bed: 'surf', cues: [{ at: at(6.2), name: 'gull' }, { at: at(9.7), name: 'gull', n: 2 }, { at: at(13.1), name: 'gull' }, { at: at(16.4), name: 'gull', n: 2 }] },
  // On a phone held upright the overview frames the town, its beach and the
  // turnpike (the island runs off both sides, a swipe away, and the Sound and
  // the open sea off the top and bottom); on its side and on a big screen,
  // the whole island.
  overview: (portrait, storey, short) => {
    const X0 = -D, X1 = W, Y0 = -KING * 1.12 - 6, Y1 = (W + D) / 2 + 5;
    if (portrait) return [27, 29, 14, 70];
    if (short) return [X0 - 2, X1 + 2, (Y0 + Y1) / 2 - 1, (Y0 + Y1) / 2 + 1];
    return [X0 - 4, X1 + 4, Y0, Y1];
  },
  backdrop,
  sky,
  words: {
    zone: 'spot',
    invite: 'King tide tonight',
    hint: 'A goose on every stretch. Step in.',
    whole: 'The whole island',
    complete: 'Every goose, found. Here comes the tide.',
  },
  qa: {
    goosePerZone: true,
    things: [3, 3],
    at: at(12.5),
    moments: [
      { at: at(7), label: 'Morning, going out' },
      { at: at(12.5), label: 'Low tide' },
      { at: at(17), label: 'Coming in' },
      { at: at(20.5), label: 'The king tide' },
      { at: at(23.5), label: 'Night' },
    ],
  },
};

