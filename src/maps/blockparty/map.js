// The Block, connected: the same sixteen rooms as The Block, facing real
// streets, on the day of the Block Party. Main Street crosses the middle (the
// stage at the crossroads), back alleys run between the rest, the pavement
// runs along the front. Inside walls drop to waist height so you can see the
// streets and into every room at once; step into a room and its walls rise.
// The whole block runs through a day in six minutes (day.js).
//
// At gate 2 (the greybox): the streets are blocked out, the rooms are the
// Block's own. It opens from #/blockparty and isn't in the picker; when it
// ships it takes over The Block's id, so saves carry over. The brief is
// docs/levels/block.md; the layout is plan.js.
import { WALL, ZK, SLAB } from '../../engine/iso.js';
import { C, alpha } from '../../engine/art.js';
import { reg } from '../shared.js';
import { sky } from '../block/ambient.js';
import { AT, DOORS, GRID, SIZE, MID, LOOP } from './plan.js';
import { walkers, nightfall, plate, at } from './day.js';

import observatory from '../block/rooms/observatory.js';
import launchpad from '../block/rooms/launchpad.js';
import pool from '../block/rooms/pool.js';
import arcade from '../block/rooms/arcade.js';
import greenhouse from '../block/rooms/greenhouse.js';
import disco from '../block/rooms/disco.js';
import library from '../block/rooms/library.js';
import icerink from '../block/rooms/icerink.js';
import noodles from '../block/rooms/noodles.js';
import bakery from '../block/rooms/bakery.js';
import laundromat from '../block/rooms/laundromat.js';
import ballpit from '../block/rooms/ballpit.js';
import umbrellas from '../block/rooms/umbrellas.js';
import aquarium from '../block/rooms/aquarium.js';
import band from '../block/rooms/band.js';
import trains from '../block/rooms/trains.js';

import mainStreet from './areas/main-street.js';
import alleys from './areas/alleys.js';
import pavement from './areas/pavement.js';

const ROOMS = {
  observatory, launchpad, pool, arcade, greenhouse, disco, library, icerink,
  noodles, bakery, laundromat, ballpit, umbrellas, aquarium, band, trains,
};

// Each room as the Block draws it, with night falling on it too: it darkens
// and its windows glow (day.js).
const withNight = (room) => ({ ...room, build(R) { room.build(R); nightfall(R); } });

const rooms = GRID.flatMap((row, r) => row.map((id, c) => ({
  zone: withNight(ROOMS[id]),
  at: AT[id],
  tag: `Unit ${c + 1}${'ABCD'[r]}`,
  doors: DOORS[id] ? [DOORS[id]] : [],
})));

// Prev / next and the list: the streets first, then the rooms snaking through
// the block along each diagonal band (as on the Block).
const cells = GRID.flatMap((row, r) => row.map((id, c) => ({ id, r, c })));
cells.sort((a, b) => a.c + a.r - (b.c + b.r) || ((a.c + a.r) % 2 ? a.c - b.c : b.c - a.c));

// Registration marks round the sheet, and its caption.
function backdrop(ctx) {
  const top = -WALL * ZK - 7, bottom = SIZE + SLAB * ZK + 6;
  reg(ctx, 0, top);
  reg(ctx, 0, bottom);
  reg(ctx, -SIZE - 6, SIZE / 2);
  reg(ctx, SIZE + 6, SIZE / 2);
  const k = 40;
  ctx.save();
  ctx.translate(-SIZE + 2, SIZE * 0.8);
  ctx.scale(1 / k, 1 / k);
  ctx.font = `${0.9 * k}px "Rethink Sans", system-ui, sans-serif`;
  ctx.fillStyle = alpha(C.ink, 0.55);
  ctx.textBaseline = 'middle';
  ctx.fillText('SQUARES  ·  THE BLOCK PARTY  ·  GREYBOX', 0, 0);
  ctx.restore();
}

export default {
  id: 'blockparty',
  name: 'The Block Party',
  short: 'The Block',
  tagline: 'Sixteen rooms, one street party, a goose in every room.',
  zones: [
    ...rooms,
    { zone: mainStreet, at: [0, 0, 0], tag: 'Outside', h: 3 },
    { zone: alleys, at: [0, 0, 0], tag: 'Outside', h: 3 },
    { zone: pavement, at: [0, 0, 0], tag: 'Outside', h: 3 },
  ],
  order: ['main-street', 'alleys', 'pavement', ...cells.map((c) => c.id)],
  cutaway: { front: true, walls: 1.2 },
  walkers,
  loop: LOOP,
  // The paper changes with the hour: warm at dawn, amber at the party, navy at night.
  plate,
  // A first visit: the invitation points at the stage.
  invite: { zone: 'main-street', at: [MID, MID, 1.2] },
  // As the Block: on a phone held upright the block fills the height and the
  // side rooms are a swipe away; on its side, the width; on a big screen, all of it.
  overview: (portrait, storey, short) => {
    const Y0 = -WALL * ZK - 9, Y1 = SIZE + SLAB * ZK + 7, cy = (Y0 + Y1) / 2;
    if (portrait) return [-1, 1, Y0, Y1];
    if (short) return [-SIZE - 2, SIZE + 2, cy - 1, cy + 1];
    return [-SIZE - 8, SIZE + 8, Y0, Y1];
  },
  backdrop,
  sky,
  words: {
    zone: 'room',
    invite: 'The Block Party is today',
    hint: 'A goose in every room. Step inside.',
    whole: 'The whole block',
    complete: 'Every goose, found. The party can start.',
  },
  // What npm run qa expects: a goose in every room, none on the streets, and
  // the moments the contact sheet shows.
  qa: {
    goosePerZone: false,
    geese: 16,
    things: [3, 4],
    at: at(19.5),
    moments: [{ at: at(6), label: 'Dawn' }, { at: at(12), label: 'Noon' }, { at: at(19.5), label: 'The party' }, { at: at(23), label: 'Night' }],
  },
};
