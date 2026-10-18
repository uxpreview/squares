// The day before Thanksgiving at Logan: everyone on the airport's clock
// (clock.js) who goes from one area to another. The engine draws each of them
// in whichever area they're in. The areas draw everyone who stays put.
//
//   5am    the Courier steps off the water taxi with a parcel for "G. Goose,
//          Flight 1", into the check-in queue
//   9am    through security; the parcel goes through the X-ray (bread)
//  11:20am at C12 for Flight 1 to Orlando, ON TIME all day, and he waits
//  11:30pm the ground stop lifts; Flight 1 pushes back from C12 and taxis
//  11:57pm holding short at the runway's end while the geese cross (the
//          ending), then it goes, out over the pier and the harbor
//   midnight the Courier, at C12's window as it leaves without him, heads
//          back to the water taxi to try again tomorrow
//   all day bag trains from the bag room along the service road to the
//          planes and back
//
// npm run qa checks every walk: never faster than a run (planes taxi slowly).
import { C, folk, person } from '../../engine/art.js';
import { schedule } from '../../engine/actors.js';
import { tag, drawBlock } from '../greybox.js';
import { INK, BLOCK } from './style.js';
import { drawPlane } from './kit.js';
import { GATES, NOSE, ROAD, CENTER, STRIP } from './plan.js';
import { LOOP, at, hour } from './clock.js';

const courier = schedule([
  [6, 6.2],
  { until: at(5) },
  [19.4, 11.4], [18.6, 13], [17, 17.2],
  { until: at(9) },
  [33, 17.6], { until: at(9.8) },
  [36.4 - 0.6, 18], [41.6, 24.6], { until: at(10.6) },
  [GATES.C12 - 3, 24], { until: at(24) },
  { speed: 1.8 },
  [19.4, 11.4], [6, 6.2],
], { loop: LOOP, name: 'The Courier' });

// The bag train: a tug and three carts, the bag room to the planes and back.
const TRAIN = 90; // four trips a day's loop
const train = schedule([
  [18, ROAD],
  { wait: 10 },
  { speed: 2.6 },
  [GATES.C14 - 4, ROAD], { wait: 12 },
  [GATES.C13 - 4, ROAD], { wait: 10 },
], { loop: TRAIN, name: 'The bag train' });

// Flight 1 to Orlando: parked at C12 all day, and the day's last flight.
const flight = schedule([
  [GATES.C12, NOSE],
  { until: at(23.5) },
  { speed: 1.4 },
  [GATES.C12, NOSE + 1.5],
  { speed: 3 },
  [GATES.C12, ROAD - 6.5], [STRIP[2] - 13, ROAD - 6.5], [STRIP[2] - 13, CENTER],
  { until: at(24.05) },
  { speed: 3.5 },
  [0, CENTER],
  { until: LOOP - 22 },
], { loop: LOOP, name: 'Flight 1' });
// After takeoff it's gone till 4am (the trip back to C12 is out of sight).
const gone = (t) => { const h = hour(t); return h >= 1.3 && h < 4; };

export const walkers = [
  {
    id: 'courier',
    name: 'The Courier',
    color: C.mustard,
    loop: LOOP,
    at: courier,
    draw(ctx, t, p) {
      person(ctx, p.x, p.y, p.z, { ...folk(300, { top: C.mustard, bottom: C.brown, hat: 'cap' }), pose: p.moving ? 'walk' : 'carry', dir: p.dir, back: p.back }, t);
      tag(ctx, p.x, p.y, p.z + 3, 'COURIER', { size: 0.34 });
    },
  },
  {
    id: 'train',
    name: 'The bag train',
    color: INK.safety,
    loop: TRAIN,
    at: (t) => train(t),
    draw(ctx, t, p) {
      drawBlock(ctx, p.x - 1, p.y - 0.7, 0, 2, 1.4, 1.1, BLOCK.vehicle, 'BAG TRAIN');
      for (let i = 1; i <= 3; i++) drawBlock(ctx, p.x - 1 - i * 2.8 * (p.dir === 'l' ? -1 : 1), p.y - 0.7, 0, 2.4, 1.4, 0.9, C.grey, null);
    },
  },
  {
    id: 'flight-1',
    name: 'Flight 1',
    color: INK.cranberry,
    loop: LOOP,
    away: true,
    at: flight,
    draw(ctx, t, p) {
      if (gone(t)) return;
      // At the gate and taxiing out it points at the gate; on the runway, down
      // it, lifting off past the middle.
      const onRunway = p.y > ROAD - 1;
      const z = onRunway && p.moving ? Math.max(0, (60 - p.x) * 0.12) : 0;
      drawPlane(ctx, p.x, p.y, 0, onRunway ? 'x' : 'y', { z, livery: 'spite', t, lit: true });
    },
  },
];
