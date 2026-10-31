// The Farm: everyone on the farm's clock (clock.js) who goes from one area to
// another, people and animals. The engine draws each of them in whichever
// area they're in; the areas draw everyone who stays put.
//
//   9am     the Courier up the lane with a parcel for "G. Goose": the
//           shearing ("We're shearing."), the dugout, the dig; by six he's
//           at table 12, and he catches the bouquet at nine
//   11am    the groom on the mound; off at 3:45 buttoning his shirt, at the
//           arch for four, back at 4:40 in his suit for extra innings, the
//           last out at six, then the tent
//   2pm     the bride out for her photos on the lane; her heel in the West
//           Front's square at half past three, the arch at four
//   2pm     Roger gets out for the photos, stands behind the couple at the
//           ceremony, and is home by dark
//   3pm     the half-sheared sheep gets away from the shearer and joins the
//           bridesmaids for the rest of the day
//   all day the car cat tries every car door in the parking field, and at
//           seven one's open: she's asleep on the getaway truck's dashboard
//           by nine; the other cat walks the stone walls; a dog walker and
//           her dog go round the fields
//   10pm    the couple run the lane between the sparklers (the ending)
//
// npm run qa checks every walk: through gates, never through the paddock's
// fences, never faster than a run.
import { C, folk, person } from '../../engine/art.js';
import { animal } from '../../engine/animals.js';
import { schedule } from '../../engine/actors.js';
import { tag } from '../greybox.js';
import { h as ground } from './land.js';
import { LOT } from './plan.js';
import { LOOP, at, hour } from './clock.js';

const tagged = (ctx, p, name, z = 3) => tag(ctx, p.x, p.y, p.z + z, name, { size: 0.32 });
// On the ground: a schedule's heights are over the land's (a cat up on a
// dashboard is 1.65 over it).
const grounded = (s) => {
  let lastT = NaN, last = null;
  return (t) => {
    if (t === lastT) return last;
    const p = s(t);
    lastT = t;
    return (last = { ...p, z: (p.z || 0) + ground(p.x, p.y) });
  };
};

const courier = schedule([
  [14, 71],
  { until: at(8) },
  [24, 62], [30, 57], [21, 45.4], { until: at(10.5), say: 'We\'re shearing.' },
  [33, 40], [40, 36.5], [51.5, 36], { until: at(12.5), say: 'We\'re batting.' },
  [56, 39], [56.8, 44.4], { until: at(15), say: 'We\'re in 1788.' },
  [56, 40], [41, 39.5], [33, 36], [20, 31], [20, 27.2], { until: at(23.5), pose: 'sit' },
  { speed: 1.8 },
  [20, 31], [30, 37], [31, 52], [24, 62],
], { loop: LOOP, name: 'The Courier' });

// Roger: home in the paddock, out through the gate at two for the photos,
// behind the couple at four, home by dark.
export const roger = schedule([
  [44, 61.5],
  { until: at(13.8) },
  [46, 59], [46, 55.5], [33.5, 55.5], [26.6, 60.6], { until: at(15.4), pose: 'stand' },
  [33.5, 55.5], [39, 51.2], [48.4, 48.2], { until: at(17) },
  [46.6, 48.9], [46.6, 55.5], [46, 59],
], { loop: LOOP, name: 'Roger' });
const [lx0, ly0, lx1, ly1] = LOT;
export const inPaddock = (t) => { const p = roger(t); return p.x > lx0 && p.x < lx1 && p.y > ly0 && p.y < ly1; };

// The half-sheared sheep: by the shearer, then away at three to the wedding.
const sheep = schedule([
  [20.6, 43],
  { until: at(15), pose: 'lie' },
  { speed: 2.4 },
  [21, 46], [33, 47.8], [40.4, 48.9], { until: at(17) },
  { speed: 1.3 },
  [37.6, 44.6], { until: at(18) },
  [33, 37], [24.6, 30.4], { until: at(24.5) },
  [30, 36], [30, 45], [21, 45.6],
], { loop: LOOP, name: 'The sheep' });

// The car cat: round the parking field's cars, a door at a time, then asleep
// on the getaway truck's dashboard.
const carSteps = [[5, 62.2]];
let tc = 4;
const doors = [[8, 62.2], [11, 62.2], [14, 62.4], [11, 66.6], [8, 66.6], [5, 66.6], [5, 62.2]];
while (tc < at(18.6) - 12) {
  for (const d of doors) { carSteps.push(d); tc += 5; carSteps.push({ until: tc, pose: 'sit' }); tc += 2.5; }
}
carSteps.push([16.6, 66.2], [18.4, 66.2, 1.62], { until: at(24.5), pose: 'lie' }, [16.6, 66.2, 0]);
const carCat = schedule(carSteps, { loop: LOOP, name: 'The car cat' });

// The other cat, along the stone walls between the barn and the house.
const wallSteps = [[30.4, 47]];
for (let t = 10; t < LOOP - 40; t += 40) wallSteps.push([33.4, 41.2], { until: t + 10, pose: 'sit' }, [37.6, 36.9], { until: t + 24, pose: 'lie' }, [30.4, 47], { until: t + 36 });
const wallCat = schedule(wallSteps, { loop: LOOP, name: 'The barn cat' });

// A dog walker and her dog round the fields' trail, dawn to dark.
const lap = [[94, 20.5], [94, 51.4], [67.6, 51.4], [67.6, 20.5]];
const walkSteps = [[67.6, 20.5]];
for (let i = 0; i < 3; i++) walkSteps.push(...lap);
const walk = schedule(walkSteps, { loop: LOOP, name: 'The dog walker' });

// The groom: the mound, the arch, the mound, the tent, the lane.
const groom = schedule([
  [52.8, 35.6],
  { until: at(11) },
  [43.5, 29.8], { until: at(15.7) },
  { speed: 3 },
  [40, 34], [38.6, 40], [39.6, 47.6], [45.4, 48.6], { until: at(16 + 40 / 60) },
  [39.6, 47.6], [38.6, 40], [40, 34], [43.5, 29.8], { until: at(18) },
  { speed: 1.3 },
  [34, 28.6], [22, 27.4], { until: at(21.3) },
  { speed: 2.6 },
  [29, 31], [31, 40], [31, 52], [25.4, 60.6], [17, 68], [13.6, 71.2], { until: LOOP - 24 },
  { speed: 3 },
  [24, 62], [31, 52], [38.6, 40],
], { loop: LOOP, name: 'The groom' });

// The bride: the farmhouse, the lane, the heel, the arch, the tent, the lane.
const bride = schedule([
  [50.8, 40.4],
  { until: at(13.3) },
  [41, 39.6], [37.6, 46], [38.8, 51.2], [33.5, 55.5], [27.6, 60.4], { until: at(15.2) },
  [33.5, 55.5], [39.4, 51.4], { until: at(15.85), say: 'My heel. It\'s in the 1800s.' },
  [46.6, 48.6], { until: at(17) },
  [38.6, 44.2], { until: at(18) },
  [33, 37], [20, 31], [17.8, 27.4], { until: at(21.3) },
  { speed: 2.6 },
  [28.4, 31.4], [30.6, 40], [30.6, 52], [25, 61], [16.4, 68.6], [14.4, 71.6], { until: LOOP - 24 },
  { speed: 3 },
  [24, 62], [33.5, 55.5], [38.8, 51.2], [37.6, 46], [41, 39.6],
], { loop: LOOP, name: 'The bride' });

// The groom's uniform till 3:45, then his suit; the bride's sweatshirt over
// her dress till two.
const late = (h0) => (t) => { const h = hour(t); return h >= h0 || h < 5; };
const suited = late(15.7), dressed = late(14);

export const walkers = [
  {
    id: 'courier', name: 'The Courier', color: C.mustard, loop: LOOP, at: grounded(courier),
    draw(ctx, t, p) {
      person(ctx, p.x, p.y, p.z, { ...folk(300, { top: C.mustard, bottom: C.brown, hat: 'cap' }), pose: p.moving ? 'walk' : p.pose === 'sit' ? 'sit' : 'carry', dir: p.dir, back: p.back }, t);
      tagged(ctx, p, 'COURIER');
    },
  },
  {
    id: 'groom', name: 'The groom', color: C.navy, loop: LOOP, at: grounded(groom),
    draw(ctx, t, p) {
      const suit = suited(t);
      person(ctx, p.x, p.y, p.z, { ...folk(310, { top: suit ? C.ink : C.white, bottom: C.navy, hat: suit ? 'none' : 'cap', hatColor: C.navy }), pose: p.pose, dir: p.dir, back: p.back }, t);
      tagged(ctx, p, 'GROOM');
    },
  },
  {
    id: 'bride', name: 'The bride', color: C.pink, loop: LOOP, at: grounded(bride),
    draw(ctx, t, p) {
      person(ctx, p.x, p.y, p.z, { ...folk(311, { top: dressed(t) ? C.white : C.grey, dress: true, style: 'bun' }), pose: p.pose, dir: p.dir, back: p.back }, t);
      tagged(ctx, p, 'BRIDE');
    },
  },
  {
    id: 'roger', name: 'Roger', animal: true, color: C.grey, loop: LOOP, at: grounded(roger),
    draw(ctx, t, p) { animal(ctx, p.x, p.y, p.z, { kind: 'donkey', pose: p.pose === 'stand' && !p.moving ? 'graze' : p.pose, dir: p.dir }, t); tagged(ctx, p, 'ROGER', 2.4); },
  },
  {
    id: 'sheep', name: 'The half-sheared sheep', animal: true, color: C.white, loop: LOOP, at: grounded(sheep),
    draw(ctx, t, p) { animal(ctx, p.x, p.y, p.z, { kind: 'sheep', wool: 0.5, pose: p.pose, dir: p.dir }, t); tagged(ctx, p, 'HALF SHEARED', 1.8); },
  },
  {
    id: 'car-cat', name: 'The car cat', animal: true, color: C.coral, loop: LOOP, at: grounded(carCat),
    draw(ctx, t, p) { animal(ctx, p.x, p.y, p.z, { kind: 'cat', pose: p.pose, dir: p.dir }, t); tagged(ctx, p, 'CAR CAT', 1.2); },
  },
  {
    id: 'wall-cat', name: 'The barn cat', animal: true, color: C.ink, loop: LOOP, at: grounded(wallCat),
    draw(ctx, t, p) { animal(ctx, p.x, p.y, p.z, { kind: 'cat', color: C.ink, pose: p.pose, dir: p.dir }, t); },
  },
  {
    id: 'dog-walker', name: 'The dog walker', color: C.teal, loop: LOOP, at: grounded(walk),
    draw(ctx, t, p) { person(ctx, p.x, p.y, p.z, { ...folk(320, { top: C.teal }), pose: p.pose, dir: p.dir, back: p.back }, t); },
  },
  {
    id: 'dog', name: 'The dog', animal: true, color: C.brown, loop: LOOP, at: grounded((t) => walk(t + 1.4)),
    draw(ctx, t, p) { animal(ctx, p.x, p.y, p.z, { kind: 'dog', pose: p.moving ? 'walk' : 'sit', dir: p.dir }, t); },
  },
];
