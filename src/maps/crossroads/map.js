// The Crossroads: a hidden test bed for areas of any shape (ROADMAP E5).
// Four rooms round a cross of street, an L of pavement along the front, and
// people walking out of one room, down the street and into another. The
// street and the pavement are one area each, drawn in pieces sorted in with
// the rooms, so the street runs behind the rooms at the back and in front of
// the one at the front. Opens from #/crossroads; it isn't in the picker.
import { C, person, folk } from '../../engine/art.js';
import { schedule } from '../../engine/actors.js';
import { ROOMS, MID, EDGE, PAVE } from './plan.js';
import { north, east, west, south } from './areas/rooms.js';
import street from './areas/street.js';
import pavement from './areas/pavement.js';
import { tag } from '../greybox.js';

const LOOP = 120;
const look = (seed, name) => ({ look: folk(seed), name });

// People on one clock: out of a room's open front, along the street, into another.
const walks = [
  { ...look(3, 'Pat'), steps: [[8, 8], { wait: 4 }, [8, MID - 1], [27, MID - 1], [27, 28], { wait: 6 }, [27, MID + 1], [8, MID + 1]] },
  { ...look(11, 'Dee'), steps: [[EDGE + 2.5, 3], [EDGE + 2.5, EDGE + 2.5], [3, EDGE + 2.5], { wait: 3 }, [EDGE + 2.5, EDGE + 2.5]] },
  { ...look(17, 'Lou'), steps: [[MID + 1, 2], { wait: 2 }, [MID + 1, 36], { wait: 2 }] },
];

const walkers = walks.map((w, i) => {
  const at = schedule(w.steps, { loop: LOOP, name: w.name });
  return {
    id: w.name.toLowerCase(),
    name: w.name,
    color: [C.coral, C.teal, C.purple][i],
    loop: LOOP,
    at,
    draw(ctx, t, p) {
      person(ctx, p.x, p.y, p.z, { ...w.look, pose: p.pose, dir: p.dir, back: p.back }, t);
      tag(ctx, p.x, p.y, p.z + 3, w.name, { size: 0.34 });
    },
  };
});

export default {
  id: 'crossroads',
  name: 'The Crossroads',
  tagline: 'A test bed: areas of any shape, and people walking between them.',
  zones: [
    { zone: north, at: [...ROOMS.north, 0], tag: 'North' },
    { zone: east, at: [...ROOMS.east, 0], tag: 'East' },
    { zone: west, at: [...ROOMS.west, 0], tag: 'West' },
    { zone: south, at: [...ROOMS.south, 0], tag: 'South' },
    { zone: street, at: [0, 0, 0], tag: 'Outside', h: 3 },
    { zone: pavement, at: [0, 0, 0], tag: 'Outside', h: 3 },
  ],
  order: ['north', 'east', 'street', 'west', 'south', 'pavement'],
  cutaway: { front: true },
  walkers,
  invite: { zone: 'street' },
  words: {
    zone: 'area',
    invite: 'Try the street',
    hint: 'Behind the rooms, and in front.',
    whole: 'The whole crossroads',
    complete: 'Every goose at the crossroads, found.',
  },
  qa: { things: [1, 1], at: 20 },
};
