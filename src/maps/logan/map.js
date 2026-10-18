// Departures: Boston Logan on the day before Thanksgiving, where every flight is
// late, every bag is lost, a nor'easter arrives at dusk and there's a goose on
// the runway. One big map from the start (ROADMAP 19's direction): the curb to
// the runway in view and alive at once, one list. Its verb is reunite: five
// lost bags, each with an owner elsewhere in the airport (a find that comes
// `after` another, src/game/case.js). The brief is docs/levels/logan.md.
//
// Seven areas, laid out as Logan is (compressed, never rearranged), looking
// west from over the outer harbor (plan.js):
//
//            x 0-30         | x 30-52    | x 52-104
//   landside | The Curb (the water taxi, the tower and garage, the Silver Line)
//   terminal | Check-in     | Security   | The Gates
//   airside  | The Bag Room | The Apron (the de-icing pad, the planes)
//   front    | The Runway (the light pier over the water, the runway)
import { W, D, AREAS } from './plan.js';
import { LOOP, FLIGHT1, at } from './clock.js';
import { paperAt } from './style.js';
import { walkers } from './day.js';
import { backdrop, sky } from './ambient.js';
import { sound as soundBed } from './sound.js';

import curb from './areas/curb.js';
import checkIn from './areas/check-in.js';
import security from './areas/security.js';
import gates from './areas/gates.js';
import bagRoom from './areas/bag-room.js';
import apron from './areas/apron.js';
import runway from './areas/runway.js';

const place = (zone, tag) => ({ zone, at: [0, 0, 0], shape: [AREAS[zone.id]], tag, h: 3 });

export default {
  id: 'logan',
  name: 'Departures',
  short: 'Departures',
  subtitle: 'Boston Logan',
  tagline: 'The day before Thanksgiving: every flight late, every bag lost, a goose on the runway.',
  zones: [
    place(curb, 'Landside'),
    place(checkIn, 'Terminal C'),
    place(security, 'Terminal C'),
    place(gates, 'Terminal C'),
    place(bagRoom, 'Airside'),
    place(apron, 'Airside'),
    place(runway, 'Airside'),
  ],
  order: ['security', 'check-in', 'gates', 'curb', 'bag-room', 'apron', 'runway'],
  // Nothing is cut away: it's one open plate, the terminal's roof off and its
  // walls low (decision 16).
  cutaway: { front: false },
  // One big map: nothing to step into, every area alive, one list (play.js).
  open: true,
  walkers,
  loop: LOOP,
  // The paper is the harbor, and it follows the day (style.js, paperAt): a
  // grey dawn, a bright cold morning, slate with the snow, pink at sunset,
  // navy all night. It's dark enough all day that the page's loose words
  // print in cream.
  plate: { at: (t) => ({ paper: paperAt(t), kind: 'night' }), bleed: true, thumbAt: at(10.5) },
  invite: { zone: 'security', at: [39, 20.7, 1.9] },
  // The ending: the clock jumps to Flight 1 holding short at the runway's
  // end, the camera goes there, and the geese cross in front of it.
  finale: { at: FLIGHT1, zone: 'runway', near: [86, 52.75], hold: 9 },
  sound: soundBed,
  // On a phone held upright the overview fills the height round the terminal
  // and the airport runs off both sides, a swipe along it (decision 18); on
  // its side and on a big screen, the whole airport.
  overview: (portrait, storey, short) => {
    const X0 = -D, X1 = W, Y0 = -12, Y1 = (W + D) / 2 + 2;
    if (portrait) return [18, 22, Y0 + 4, Y1];
    if (short) return [X0 - 2, X1 + 2, (Y0 + Y1) / 2 - 1, (Y0 + Y1) / 2 + 1];
    return [X0 - 2, X1 + 2, Y0, Y1];
  },
  backdrop,
  sky,
  words: {
    zone: 'area',
    invite: 'Start at security',
    hint: 'Tap an X-ray to see what\'s packed.',
    open: 'Seven geese loose in the airport, and five lost bags. Pinch in and look around.',
    whole: 'The whole airport',
    complete: 'Every goose, found. Flight 1 is cleared.',
    describe: 'An airport on a slab of land in the harbor, seen from over the water: the curb and a control tower at the back, the terminal with its roof off (check-in, security, the gates), then the bag room, planes at their gates, and a runway along the water. Snow starts in the afternoon and the night is spent waiting.',
  },
  qa: {
    goosePerZone: true,
    things: [4, 4],
    at: at(10.5),
    // Timed in the morning rush, and in the stuck night (the snow, the most
    // people waiting).
    speedAt: [at(10.5), at(21)],
    moments: [
      { at: at(5), label: 'The first wave' },
      { at: at(10.5), label: 'The rush' },
      { at: at(16.2), label: 'Sunset, the snow' },
      { at: at(21), label: 'Ground stop' },
      { at: FLIGHT1, label: 'Flight 1' },
    ],
  },
};
