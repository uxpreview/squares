// The Farm: Spencer-Peirce-Little Farm in Newbury on the third Saturday in
// June, double booked: a wedding, a vintage base ball game, sheep shearing
// and an archaeology dig, all on the same day. One big map (open, as Plum
// Island and Departures are). Its verb is dig: the archaeologists' squares
// are open all over the farm, and a tap takes one down a layer (a poke with
// steps, R.poke({ steps })). The brief is docs/levels/farm.md.
//
// Eight areas, laid out as the farm is (compressed, never rearranged),
// looking northeast from over Little's Lane (plan.js):
//
//          x 0-34             | x 34-64          | x 64-96
//   back   The Marsh Edge: the flats, the woods and the turnpike, the airfield
//   north  The Wedding Field  | The Ball Field   | The Fields
//   middle The Barn           | The House        | (the stripes, the orchard,
//   front  Little's Lane      | The Paddock      |  the pond, the track)
import { W, D, AREAS, LANE, FENCES } from './plan.js';
import { land } from './land.js';
import { LOOP, SPARKLERS, BEATS, at } from './clock.js';
import { paperAt, plateKind } from './style.js';
import { walkers } from './day.js';
import { backdrop, sky } from './ambient.js';

import littlesLane from './areas/littles-lane.js';
import barn from './areas/barn.js';
import paddock from './areas/paddock.js';
import house from './areas/house.js';
import weddingField from './areas/wedding-field.js';
import ballField from './areas/ball-field.js';
import fields from './areas/fields.js';
import marshEdge from './areas/marsh-edge.js';

// h: how tall the area's picture reaches (the tent's peaks, the barn's roof).
const place = (zone, tag, h = 4) => ({ zone, at: [0, 0, 0], shape: [AREAS[zone.id]], tag, h });

export default {
  id: 'farm',
  name: 'The Farm',
  short: 'The Farm',
  subtitle: 'Double Booked',
  tagline: 'A June Saturday booked four times: a wedding, base ball, shearing and a dig.',
  zones: [
    place(marshEdge, 'The Marsh', 5),
    place(weddingField, 'The Wedding', 6),
    place(ballField, 'The Game'),
    place(fields, 'The Fields'),
    place(barn, 'The Barn', 6),
    place(house, 'The House', 7),
    place(littlesLane, 'The Lane', 6),
    place(paddock, 'The Animals'),
  ],
  order: ['house', 'wedding-field', 'barn', 'ball-field', 'littles-lane', 'paddock', 'fields', 'marsh-edge'],
  // One open plate: nothing cut away, every area alive, one list (play.js).
  cutaway: { front: false },
  open: true,
  land,
  walkers,
  // The paddock's fence and the pigs' pen: animals on the clock only leave by
  // their gates (QA's walking check).
  fences: FENCES,
  loop: LOOP,
  // The paper is the June meadow, and follows the day (style.js): pale at
  // dawn, bright all day, gold at sunset behind the barn, dark ink at night.
  plate: { at: (t) => ({ paper: paperAt(t), kind: plateKind(t) }), bleed: true, thumbAt: at(15) },
  invite: { zone: 'house', at: [55, 47.6, 0.9] },
  // The ending: the clock jumps to ten, the sparkler send-off down Little's
  // Lane; the couple run it between two lines of sparklers and the geese run
  // it after them (day.js). The photographer takes the last photo.
  finale: { at: SPARKLERS, zone: 'littles-lane', near: LANE[1], hold: 9 },
  // On a phone held upright the overview fills the height round the house,
  // the ball field and the tent, and the barn and the fields run off the
  // sides, a swipe along them; on its side and on a big screen, the whole farm.
  overview: (portrait, storey, short) => {
    const X0 = -D, X1 = W, Y0 = -6, Y1 = (W + D) / 2 + 2;
    if (portrait) return [-4, 8, 10, 66];
    if (short) return [X0 + 4, X1 - 4, (Y0 + Y1) / 2 - 1, (Y0 + Y1) / 2 + 1];
    return [X0 + 2, X1 - 2, Y0, Y1];
  },
  backdrop,
  sky,
  words: {
    zone: 'area',
    invite: 'Start at the dig',
    hint: 'Tap a square to dig down a layer.',
    open: 'Eight geese loose on a farm that\'s booked four things today. Pinch in and look around.',
    whole: 'The whole farm',
    complete: 'Every goose, found. Sparklers!',
    describe: 'A 1690 stone farmhouse among barns and fields, seen from over the lane: a big white wedding tent behind it, a vintage base ball game beside it, a paddock of donkeys, goats, sheep and pigs in front, and the marsh and the sea beyond. Archaeologists\' squares are open all over the farm.',
  },
  qa: {
    goosePerZone: true,
    things: [4, 4],
    at: at(15),
    // Timed at noon (game one, shearing, the most people about) and at nine
    // (the tent full and lit, the bouquet).
    speedAt: [at(12), at(21)],
    moments: [
      { at: at(7), label: 'Dawn: the tent goes up' },
      { at: at(12), label: 'Noon: shearing, game one' },
      { at: BEATS.ceremony + 1, label: 'The ceremony' },
      { at: BEATS.out, label: 'The last out' },
      { at: SPARKLERS, label: 'Sparklers' },
    ],
  },
};
