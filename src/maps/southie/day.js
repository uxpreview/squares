// Moving Day: everyone on the day's clock (clock.js), walking between the
// street and the apartments. The engine draws each of them in whichever area
// they're in, so someone walks in a front door, up the stairs through the
// first floor, and turns up on their own. The areas draw everyone who stays
// put (the audience, the line, the spotters).
//
// The day (hours; the clock is uneven, so at(h) gives the loop time):
//    7am   the movers start carrying out, house by house
//    8am   the Courier double-parks on Farragut Road with a parcel for
//          "G. Goose, Third Floor, Farragut Road", and climbs every house's
//          stairs to every third floor, and is sent away from each
//  11:30am the landlady climbs the Green House with her clipboard (the
//          inspection; the poster at 11:40)
//   noon   she hands out keys from the Green House's porch
//    1pm   the Courier goes for a hot dog at Castle Island
//    2pm   the curb collector starts carrying the curb up the Yellow House
//   9:30pm the Courier makes it up the Green House's last flight (the ending)
//
// Greybox: the walks are the level's, the look is placeholder.
import { C, Q, folk, person, box } from '../../engine/art.js';
import { schedule } from '../../engine/actors.js';
import { tag } from '../greybox.js';
import { HOUSES, ROW_X0, FH, GROUND, ROAD, STAND } from './plan.js';
import { FLIGHTS, HALL, BODY, DOOR } from './kit.js';
import { LOOP, at } from './clock.js';
import { CURB } from './plan.js';

const G = GROUND;
const HY = Object.fromEntries(HOUSES);
const hallY = (id) => HY[id] + (HALL.y0 + HALL.y1) / 2;
// Points on the way up a house (world units): the curb in front of it, its
// front door, the top of each flight, and a spot in the middle of each floor.
const curb = (id, dx = 0) => [ROAD.walk0 + 0.8 + dx, HY[id] + DOOR.y, G];
const door = (id) => [ROW_X0 + BODY - 0.4, hallY(id), G];
const landing = (id, f) => [ROW_X0 + FLIGHTS[f - 1][1], hallY(id), G + f * FH];
const room = (id, f) => [ROW_X0 + 6, HY[id] + 4, G + f * FH];
// Up from the curb to floor f's room, and back down (steps for schedule()).
function up(id, f) {
  const s = [door(id)];
  for (let i = 1; i <= f; i++) s.push(landing(id, i));
  s.push(room(id, f));
  return s;
}
function down(id, f) {
  const s = [];
  for (let i = f; i >= 1; i--) s.push(landing(id, i));
  s.push(door(id), curb(id));
  return s;
}

function walker(id, name, seed, steps, o = {}) {
  const look = folk(seed, o.look || {});
  const at = schedule(steps, { loop: LOOP, name, speed: o.speed || 1.3 });
  return {
    id,
    name,
    color: o.color || C.coral,
    loop: LOOP,
    at,
    draw(ctx, t, p) {
      person(ctx, p.x, p.y, p.z, { ...look, pose: p.pose, dir: p.dir, back: p.back }, t);
      if (p.carry && Q.detail) box(ctx, p.x - 0.35, p.y - 0.35, p.z + 1.3, 0.7, 0.7, 0.6, C.woodLight, { flat: true });
      if (Q.detail) tag(ctx, p.x, p.y, p.z + 3, name, { size: 0.34 });
    },
  };
}

// Out on a floor's porch.
const PORCH = (id, f) => [ROW_X0 + BODY + 1.2, HY[id] + 2.4, G + f * FH];

// The Courier: every third floor, then lunch, then the Green House at the end.
const VAN = [ROAD.lane1 + 1, 45, G];
const courier = walker('courier', 'Courier', 7, [
  VAN, { until: at(7.6) },
  curb('grey'), ...up('grey', 2), { wait: 3, say: 'G. Goose?' }, ...down('grey', 2),
  ...up('yellow', 2), { wait: 3, say: 'G. Goose?' }, ...down('yellow', 2),
  ...up('green', 2), { wait: 3, say: 'G. Goose?' }, ...down('green', 2),
  VAN, { until: at(12.6) },
  [40, 5.5, G], [STAND[0] + 12, STAND[1] + 3, G], { until: at(16.6), say: 'One with everything.' },
  [40, 5.5, G], VAN, { until: at(20.1) },
  curb('green'), ...up('green', 2), PORCH('green', 2), { until: at(23.5), say: 'G. Goose?' }, room('green', 2), ...down('green', 2),
], { color: C.brown, speed: 1.7, look: { top: C.brown, bottom: C.brown } });

// The landlady: the inspection at 11:30, keys on the porch at noon.
const landlady = walker('landlady', 'Landlady', 71, [
  room('green', 0), { until: at(10.9) },
  door('green'), landing('green', 1), room('green', 1), { until: at(11.45), say: 'What is this.' },
  landing('green', 2), room('green', 2), { until: at(11.85) },
  landing('green', 2), landing('green', 1), door('green'), PORCH('green', 0), { until: at(12.95), say: 'Next.' },
  door('green'),
], { color: C.purple, look: { hair: C.greyLight } });

// Movers, one pair a house: out before noon, in after.
function trips(id, f, seed, name) {
  const steps = [curb(id, 0.4), { until: at(7.4) }];
  for (let k = 0; k < 2; k++) steps.push(...up(id, f), { wait: 2 }, ...down(id, f).map((p) => p), { wait: 2, carry: true });
  steps.push({ until: at(13.4) });
  for (let k = 0; k < 2; k++) steps.push(...up(id, f), { wait: 2 }, ...down(id, f), { wait: 2 });
  return walker(`mover-${id}`, name, seed, steps, { color: C.teal });
}

// The curb collector: the free things up the Yellow House, one at a time.
const collector = (() => {
  const steps = [curb('yellow', 1.2), { until: at(13.1) }];
  for (const h of CURB) steps.push({ until: at(h) }, ...up('yellow', 2), { wait: 1.5 }, ...down('yellow', 2));
  return walker('collector', 'Collector', 61, steps, { color: C.mustard, speed: 2.6 });
})();

export const walkers = [
  courier,
  landlady,
  trips('green', 1, 12, 'Roommate'),
  trips('yellow', 0, 42, 'Dad'),
  trips('grey', 1, 91, 'Mover'),
  collector,
];
