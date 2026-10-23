// Pitch Day: everyone on the clock (clock.js) who goes from one area to
// another. The engine draws each of them in whichever area they're in; the
// areas draw everyone who stays put (and the people at desks, who run to the
// windows at bear o'clock: kit.js, worker).
//
//   8:35am  Dana, the CEO, walks the floor to Dev's stand-up, back at 11:30;
//           at 2pm out to Creative and on to the pitch room till 5
//   8:50am  the Courier, with a parcel for "G. Goose, c/o Creative", up the
//           stair to reception, where the sign says BACK IN 5 MINUTES; at
//           5pm he signs for it himself and goes
//   all day Kayleigh from Marketing, to the kitchen for coffee and back
//   3:50pm  the Gander Cola clients, three in red, up to the pitch room; at
//           bear o'clock they go to the window with everyone else
//
// Between floors (the stair inside the building) nobody's drawn: they're on
// floors that aren't on the map.
import { C, folk, person, Q } from '../../engine/art.js';
import { schedule } from '../../engine/actors.js';
import { tag } from '../greybox.js';
import { LOOP, at, ceo } from './clock.js';
import { BD, FLOOR, SPINE, AISLE, DOOR, TOWER, PITCH, D, SILL } from './plan.js';

// The top of the stair, out of the tower's door, and the way down inside.
const TOP = [TOWER.x, TOWER.y + TOWER.r + 0.9, FLOOR];
const INSIDE = [DOOR[0], BD - 6, 3.2];
const FOOT = [DOOR[0], BD + 0.7, 0];
const ROADSIDE = (x) => [x, D + 6, 0];

const courier = schedule([
  ROADSIDE(52),
  { until: at(8.8) },
  [52, AISLE, 0], [DOOR[0], AISLE, 0], FOOT, INSIDE, TOP,
  [TOP[0] - 4, SPINE, FLOOR], [34.9, 15.6, FLOOR],
  { until: at(17.0), pose: 'sit' },
  [TOP[0] - 4, SPINE, FLOOR], [35.6, 9.8, FLOOR], { wait: 4, pose: 'stand', say: 'Signed for it myself.' },
  [TOP[0] - 4, SPINE, FLOOR], TOP, INSIDE, FOOT, [DOOR[0], AISLE, 0], [52, AISLE, 0],
], { loop: LOOP, name: 'The Courier' });

// Kayleigh's coffee runs: Marketing to the kitchen and back.
const MUG = [24.5, SPINE + 2.6, FLOOR], MACHINE = [52.4, 2.6, FLOOR];
const coffee = schedule([
  MUG,
  { speed: 1.6 },
  { until: at(9.0), pose: 'film' },
  [24.5, SPINE, FLOOR], [50, SPINE, FLOOR], MACHINE, { wait: 3, pose: 'stand' }, [50, SPINE, FLOOR], [24.5, SPINE, FLOOR], MUG,
  { until: at(11.6), pose: 'film' },
  [24.5, SPINE, FLOOR], [50, SPINE, FLOOR], MACHINE, { wait: 3, pose: 'stand' }, [50, SPINE, FLOOR], [24.5, SPINE, FLOOR], MUG,
  { until: at(13.9), pose: 'film' },
  [24.5, SPINE, FLOOR], [50, SPINE, FLOOR], MACHINE, { wait: 3, pose: 'stand' }, [50, SPINE, FLOOR], [24.5, SPINE, FLOOR], MUG,
  { until: at(17.05), pose: 'film' },
  [24.5, SPINE, FLOOR], [TOP[0], SPINE, FLOOR], TOP, INSIDE,
  { until: LOOP - 16 },
], { loop: LOOP, name: 'Kayleigh' });

// The clients: up to the pitch room at 3:50, seats along the table's back,
// to the window at bear o'clock (4:25), and down again after.
const clients = [0, 1, 2].map((i) => {
  const seat = [PITCH[0] + 4.6 + i * 2.2, PITCH[1] + 2.2, FLOOR];
  const glass = [PITCH[0] + 4 + i * 1.8, SILL, FLOOR];
  return schedule([
    ROADSIDE(50 + i),
    { speed: 2 },
    { until: at(14.5) + i * 0.6 },
    [50 + i, AISLE, 0], [DOOR[0], AISLE, 0], FOOT, INSIDE, TOP,
    [TOP[0] + 1 + i, SPINE, FLOOR], [seat[0], PITCH[1] - 0.6, FLOOR], seat,
    { until: at(16.42) + i * 0.6, pose: 'sit' },
    glass, { until: at(17.05), pose: 'point' },
    seat, { until: at(17.25), pose: 'stand', say: i === 1 ? 'We love the goose.' : null },
    [seat[0], PITCH[1] - 0.6, FLOOR], [TOP[0] + 1 + i, SPINE, FLOOR], TOP, INSIDE, FOOT, [DOOR[0], AISLE, 0], [50 + i, AISLE, 0],
  ], { loop: LOOP, name: `Client ${i + 1}` });
});

const show = (ctx, t, p, look, name) => {
  person(ctx, p.x, p.y, p.z + (p.pose === 'sit' ? 0.15 : 0), { ...look, pose: p.pose === 'film' ? 'point' : p.pose, dir: p.dir, back: p.back }, t);
  if (name && Q.detail) tag(ctx, p.x, p.y, p.z + (p.pose === 'sit' ? 2.5 : 3), name, { size: 0.32 });
};

export const walkers = [
  {
    id: 'ceo',
    name: 'Dana, the CEO',
    color: C.purple,
    loop: LOOP,
    at: ceo,
    draw(ctx, t, p) { show(ctx, t, p, folk(400, { top: C.purple, bottom: C.ink, hair: C.ink }), 'CEO'); },
  },
  {
    id: 'courier',
    name: 'The Courier',
    color: C.mustard,
    loop: LOOP,
    at: courier,
    draw(ctx, t, p) { show(ctx, t, p, folk(300, { top: C.mustard, bottom: C.brown, hat: 'cap' }), 'COURIER'); },
  },
  {
    id: 'kayleigh',
    name: 'Kayleigh',
    color: C.pink,
    loop: LOOP,
    at: coffee,
    draw(ctx, t, p) { show(ctx, t, p, folk(410, { top: C.pink }), p.pose === 'film' ? null : 'COFFEE'); },
  },
  ...clients.map((at, i) => ({
    id: `client-${i + 1}`,
    name: `Client ${i + 1}`,
    color: C.red,
    loop: LOOP,
    at,
    draw(ctx, t, p) { show(ctx, t, p, folk(420 + i, { top: C.red, bottom: C.ink }), i === 1 ? 'GANDER COLA' : null); },
  })),
];
