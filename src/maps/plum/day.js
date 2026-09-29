// A day at Plum Island: everyone on the island's clock (tide.js), driving
// and walking between the areas. The engine draws each of them in whichever
// area they're in; off the map (the mainland, past the back edge) nobody
// draws them.
//
// The day, in hours (15 seconds each, from 5am):
//     7am  the Courier drives over the turnpike with a parcel for "G. Goose,
//          Plum Island", parks at the Center, and knocks on every door
//     9am  beach traffic: the lot's full, so they park on the boulevard
//   5:30pm the beach traffic goes home (before the tide gets the road)
//   7:25pm the Courier gives up and heads for the mainland, and the king tide
//          has the turnpike: the van stops in the middle of it
//     8pm  Every King Tide Dave drives in through the flood, and stalls
//          halfway, windows down, as he does every king tide
//  10:50pm the water's off the road and they both get going
//
// npm run qa checks every walk: never faster than a run (cars included).
import { C, Q, folk, box, alpha } from '../../engine/art.js';
import { schedule } from '../../engine/actors.js';
import { tag } from '../greybox.js';
import { PIKE, roadZ, h } from './land.js';
import { LOOP, at, level } from './tide.js';
import { car, who } from './kit.js';

const IN = PIKE + 0.6, OUT = PIKE - 0.6; // the two lanes of the turnpike
const OFF = -2.5; // the mainland, past the map's back edge
const DRIVE = 3.2, WALK = 1.3;

// Which way something on a walk is heading, along x or y, from a moment ago.
function along(at, t) {
  const a = at(t - 0.2), b = at(t);
  return Math.abs(b.x - a.x) > Math.abs(b.y - a.y) ? 'x' : 'y';
}

// A vehicle on the island's roads: its wheels on the road (up over the
// bridge), and only what's above the water when the road's under.
function vehicle(id, name, color, steps, label) {
  const walk = schedule(steps, { loop: LOOP, name, speed: DRIVE });
  const atT = (t) => { const p = walk(t); return { ...p, z: roadZ(p.x, p.y) }; };
  let lastAlong = 'y';
  return {
    id, name, loop: LOOP, color,
    away: true, // off to the mainland, past the map's edge, some of the day
    at: atT,
    draw(ctx, t, p) {
      if (p.hide) return;
      if (p.moving) lastAlong = along(atT, t);
      const L = level(t);
      car(ctx, p.x, p.y, p.z, color, lastAlong, label, t, L > p.z + 0.02 ? L : null);
    },
  };
}

// The Courier's van: over the bridge in the morning, parked at the Center all
// day, and out again at dusk, straight into the king tide.
const van = vehicle('van', 'The Courier\'s van', C.brown, [
  [OUT, OFF], { until: at(7), hide: true },
  [IN, OFF], [IN, 26], [59.3, 28.3], [59.3, 30.2],
  { until: at(19.4) },
  [59.3, 28.3], [OUT, 26], [OUT, 9.6],
  // Stopped where the water's too deep to go on.
  { until: at(22.85) },
  [OUT, OFF],
], 'COURIER');

// Every King Tide Dave: he drives in through the flood at the king tide,
// every time, and stalls halfway, windows down.
const dave = vehicle('dave', 'Every King Tide Dave', C.red, [
  [IN, OFF], { until: at(20.05), hide: true },
  [IN, 6.4],
  { until: at(22.9) },
  [IN, OFF],
], 'DAVE');

// Beach traffic: the lot's full by nine, so they park on the boulevard.
const beach = [[at(9), 61.6, C.teal], [at(9.6), 63.6, C.mustard]].map(([t0, x, color], i) => vehicle(`beach-${i}`, 'Beach traffic', color, [
  [IN, OFF], { until: t0, hide: true },
  [IN, 25.3], [x, 25.3], [x, 24.2],
  { until: at(17.4 + i * 0.4) },
  [x, 25.3], [OUT, 25.3], [OUT, OFF],
]));

// The Courier on foot: out of the van, door to door (the Center's houses,
// the beach, the Point), a parcel under one arm, and back to the van at
// dusk. Nobody's G. Goose.
const knock = (x, y, s = 3) => [[x, y], { wait: s, pose: 'carry' }];
const courierSteps = [
  [60.2, 31.6], { until: at(7.2), hide: true },
  ...knock(53, 29.8), ...knock(49.9, 29.8), ...knock(46.8, 29.8),
  [46.6, 26.2], ...knock(47.2, 25.1), ...knock(51.2, 25.1),
  [58, 26.2], [66, 26.2], ...knock(65.7, 25.1), ...knock(69.7, 25.1), ...knock(73.7, 25.1), ...knock(77.7, 25.1),
  [80, 26.4], [86, 27.2], ...knock(91.8, 29.5, 8),
  [86, 27.2], [79.1, 26.4], ...knock(79.1, 29.8), ...knock(76, 29.8), ...knock(72.9, 29.8), ...knock(69.8, 29.8), ...knock(66.7, 29.8),
  [60.2, 32.8], [60.2, 40.4], [61.2, 43.2], { wait: 12, pose: 'point', say: 'G. Goose?' },
  [60.2, 40.4], [60.2, 32.8], [60.2, 31.6], { until: at(19.35) },
];
const courierWalk = schedule(courierSteps, { loop: LOOP, name: 'The Courier', speed: WALK });
const courierLook = folk(7, { top: C.brown, bottom: C.brown, hat: 'cap' });
const courier = {
  id: 'courier', name: 'The Courier', loop: LOOP, color: C.brown,
  away: true, // in the van, some of the day
  at: (t) => { const p = courierWalk(t); return { ...p, z: h(p.x, p.y) }; },
  draw(ctx, t, p) {
    // In the van (with the parcel) until morning, and again after dusk.
    const hr = ((t % LOOP) + LOOP) % LOOP;
    if (p.hide || hr < at(7.2) || hr > at(19.36)) return;
    who(ctx, p.x, p.y, p.z, courierLook, 'The Courier', p, t);
    box(ctx, p.x + 0.2, p.y - 0.2, p.z + 1.2, 0.5, 0.4, 0.35, C.woodLight, { flat: true });
    if (p.say && Q.detail) tag(ctx, p.x, p.y, p.z + 3.8, p.say, { size: 0.34, fill: alpha(C.white, 0.95) });
  },
};

export const walkers = [van, dave, ...beach, courier];
