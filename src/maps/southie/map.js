// Moving Day: September 1st in South Boston, when every lease turns over at
// once. The row of triple-deckers on Farragut Road, across from Marine Park,
// everyone out by noon and in by night, one truck, one rope, one couch, a
// goose in every apartment. The brief is docs/levels/southie.md.
//
// Looking northwest from over the harbor (plan.js): the row and the road at
// the left, the park in the middle, Pleasure Bay and Castle Island at the
// right, the shore across the bottom. Three houses you can step into, a zone
// per floor, stacked; their outsides (R.shell) show on the overview and fade
// away when you step in, and only the floors above you in that house lift
// (cutaway.above 'column', engine E11). The road, the park and the island
// are areas of any shape on the land (land.js).
import { W, D, HOUSES, ROW_X0, FH, GROUND, AREAS } from './plan.js';
import { land } from './land.js';
import { LOOP, at, dial } from './clock.js';
import { walkers } from './day.js';
import { backdrop, sky, paperAt } from './ambient.js';
import { kindAt } from './style.js';
import { sound as soundBed } from './sound.js';

import green1 from './areas/green-1.js';
import green2 from './areas/green-2.js';
import green3 from './areas/green-3.js';
import yellow1 from './areas/yellow-1.js';
import yellow2 from './areas/yellow-2.js';
import yellow3 from './areas/yellow-3.js';
import grey1 from './areas/grey-1.js';
import grey2 from './areas/grey-2.js';
import grey3 from './areas/grey-3.js';
import farraguteRoad from './areas/farragut-road.js';
import marinePark from './areas/marine-park.js';
import castleIsland from './areas/castle-island.js';

const FLOORS = { green: [green1, green2, green3], yellow: [yellow1, yellow2, yellow3], grey: [grey1, grey2, grey3] };
// (Short, so the room bar has room for the apartment's name beside it.)
const NAMES = { green: 'Green House', yellow: 'Yellow House', grey: 'Grey One' };
const ORD = ['1st', '2nd', '3rd'];
// A floor of a house: stacked on the ground, standing on the land without
// printing it, only as tall as its floor (so each point is in one floor).
const floorOf = (id, y, f) => ({
  zone: FLOORS[id][f],
  at: [ROW_X0, y, GROUND + f * FH],
  tag: `${NAMES[id]}, ${ORD[f]}`,
  h: FH,
  span: FH,
  land: false,
});
// (Open: nothing tall stands in front of the road, the park or the island,
// so what's in front of the one you're in isn't cut away.)
const area = (zone, tag) => ({ zone, at: [0, 0, 0], shape: AREAS[zone.id], tag, h: 3, fixed: true, open: true });

export default {
  id: 'southie',
  name: 'Moving Day',
  short: 'Moving Day',
  tagline: 'Everyone out by noon, everyone in by night, one truck, and a goose in every apartment.',
  zones: [
    ...HOUSES.flatMap(([id, y]) => [0, 1, 2].map((f) => floorOf(id, y, f))),
    area(farraguteRoad, 'Outside'),
    area(marinePark, 'Outside'),
    area(castleIsland, 'Outside'),
  ],
  order: ['green-1', 'green-2', 'green-3', 'yellow-1', 'yellow-2', 'yellow-3', 'grey-1', 'grey-2', 'grey-3', 'farragut-road', 'marine-park', 'castle-island'],
  cutaway: { front: true, above: 'column' },
  land,
  walkers,
  loop: LOOP,
  // In the picker, the card is printed on the paper too, at 9:30 in the
  // morning: the truck just stuck, the curb filling, before the rain.
  plate: { at: (t) => ({ paper: paperAt(t), kind: kindAt(t) }), bleed: true, thumbAt: at(9.5) },
  dial,
  invite: { zone: 'green-2', at: [ROW_X0 + 13.6, 21.5, GROUND + FH + 2.2] },
  // The ending: the clock jumps to 9:30pm, the camera goes to the Green
  // House's third floor, and the geese bring the couch in (finale.js).
  finale: { at: at(21.5), zone: 'green-3', hold: 10 },
  // On a phone held upright the overview frames the row and the road at full
  // height, and the park and Castle Island run off to the right, a swipe away.
  overview: (portrait, storey, short) => {
    const X0 = -D + 6, X1 = W + 2, Y0 = -16, Y1 = (W + D) / 2 + 2;
    if (portrait) return [-16, -12, -10, 50];
    if (short) return [X0, X1, (Y0 + Y1) / 2 - 1, (Y0 + Y1) / 2 + 1];
    return [X0, X1, Y0, Y1];
  },
  sound: soundBed,
  backdrop,
  sky,
  words: {
    zone: 'apartment',
    invite: 'Everybody moves today',
    hint: 'Tap a house to open it.',
    whole: 'The whole street',
    complete: 'Every goose, moved in. The couch made it.',
    describe: 'South Boston from over the harbor: the green, yellow and grey triple-deckers in a row along Farragut Road at the left, the street jammed with parked cars and moving trucks, then Marine Park, Pleasure Bay and Castle Island\'s fort by the port\'s cranes. The day runs from dawn through a rainy noon to a night of lit windows.',
  },
  qa: {
    goosePerZone: true,
    things: [4, 4],
    // (9am: the old tenants' things all still in, so the playtest's one tap
    // on the lease clock flips to 5pm, the new ones' mostly in: before and after.)
    at: at(9),
    speedAt: [at(11), at(21.5)],
    moments: [
      { at: at(7.5), label: 'Seven: the trucks' },
      { at: at(11.5), label: 'Rain, the inspection' },
      { at: at(12.4), label: 'Noon: the keys' },
      { at: at(16), label: 'Moving in' },
      { at: at(19.3), label: 'Sunset' },
      { at: at(22), label: 'First night' },
    ],
  },
};
