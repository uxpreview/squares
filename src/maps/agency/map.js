// Pitch Day: Primal, a digital agency, on the day of the big pitch. Seven
// geese loose on the top floor, everyone pretending to work, and a bear in
// the parking lot that nobody can stop looking at. One big map (ROADMAP 19's
// direction): the whole floor and the lot in view and alive at once, one
// list. Its verb is bear o'clock: three times a day the bear comes into the
// lot, everyone runs to the windows, and what they leave behind at their
// desks can be found (a find's `when`, and the bear watch, the place's dial).
// The brief is docs/levels/agency.md.
//
// Seven areas (plan.js): six stretches of the top floor, which stands at z
// FLOOR on two empty storeys drawn from the outside (place.below), and the
// lot in front of it.
//
//   x  0 ... 16 ... 32 ......... 56 ... 72 ... 88 ... 104 .. 118
//      Leadership | Marketing | Front of house | Creative | UX | Dev, QA | drive
//      ...................... The Lot ......................................
import { W, D, FLOOR, AREAS } from './plan.js';
import { LOOP, at, dial } from './clock.js';
import { PAPER } from './style.js';
import { walkers } from './day.js';
import { backdrop, sky } from './ambient.js';
import { sound as soundBed } from './sound.js';

import leadership from './areas/leadership.js';
import marketing from './areas/marketing.js';
import front from './areas/front.js';
import creative from './areas/creative.js';
import ux from './areas/ux.js';
import devQa from './areas/dev-qa.js';
import lot from './areas/lot.js';

// The office's stretches stand on its two empty floors (below); h: how tall
// an area's picture reaches (the stair tower is 10.5 high).
const office = (zone, h = 3) => ({ zone, at: [0, 0, FLOOR], shape: AREAS[zone.id], tag: 'Top floor', h, below: FLOOR, fixed: true, open: true });

export default {
  id: 'agency',
  name: 'Pitch Day',
  short: 'Pitch Day',
  subtitle: 'Primal, a digital agency',
  tagline: 'The pitch is at four. Seven geese are loose on the floor, and there\'s a bear in the lot.',
  zones: [
    office(leadership),
    office(marketing),
    office(front, 11),
    office(creative),
    office(ux),
    office(devQa),
    { zone: lot, at: [0, 0, 0], shape: AREAS.lot, tag: 'Outside', h: 3, fixed: true, open: true },
  ],
  order: ['front', 'creative', 'ux', 'dev-qa', 'marketing', 'leadership', 'lot'],
  // One storey: the office and the lot show together (the floors under the
  // office aren't on the map).
  storeys: [{ id: 'all', name: '', z: 0 }],
  // Nothing is cut away: it's one open plate, the roof off and the walls low.
  cutaway: { front: false },
  open: true,
  walkers,
  loop: LOOP,
  plate: { paper: PAPER, thumbAt: at(10.8) },
  dial,
  invite: { zone: 'front', at: [36.4, 8.8, 1.3] },
  // The ending: bear o'clock at the pitch. The clock jumps to the bear on
  // the CEO's car under the pitch room, everyone (the clients too) at the
  // window, and the geese walk out of the front door past it into the woods.
  finale: { at: at(16.6), zone: 'lot', near: [47, 30], span: 14, hold: 12 },
  sound: soundBed,
  // On a phone held upright the overview fills the height round the front of
  // house and Creative, and the floor runs off both sides; on its side and
  // on a big screen, the whole building and the lot.
  overview: (portrait, storey, short) => {
    const X0 = -D, X1 = W, Y0 = -20, Y1 = (W + D) / 2 + 2;
    if (portrait) return [26, 34, Y0 + 2, Y1];
    if (short) return [X0 - 2, X1 + 2, (Y0 + Y1) / 2 - 1, (Y0 + Y1) / 2 + 1];
    return [X0 - 2, X1 + 2, Y0, Y1];
  },
  backdrop,
  sky,
  words: {
    zone: 'area',
    invite: 'Start at reception',
    hint: 'Ring the bell. Nobody comes.',
    open: 'Seven geese loose on the top floor, and a bear due in the lot. Pinch in and look around.',
    whole: 'The whole office',
    complete: 'Every goose, found. Primal wins the account.',
    describe: 'An office building in autumn woods, seen from over its parking lot: the top floor with its roof off, open desks by the windows, glass meeting rooms, a kitchen and an eight-sided stair tower, standing on two dark empty floors. Below, a lot full of cars and a road. A bear visits now and then.',
  },
  qa: {
    goosePerZone: true,
    things: [4, 4],
    at: at(10.8),
    speedAt: [at(10.8), at(16.6)],
    moments: [
      { at: at(8), label: 'Arrivals' },
      { at: at(10.8), label: 'Bear o\'clock, morning' },
      { at: at(13.1), label: 'Bear o\'clock, lunch' },
      { at: at(16.6), label: 'The pitch, and the bear' },
      { at: at(21), label: 'Night, Dev deploying' },
    ],
  },
};
