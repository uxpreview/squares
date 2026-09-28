// The Block, connected: the same sixteen rooms as The Block, facing real
// streets, on the day of the Block Party. Main Street crosses the middle (the
// stage at the crossroads), back alleys run between the rest, the pavement
// runs along the front. Inside walls drop to waist height so you can see the
// streets and into every room at once; step into a room and its walls rise.
// The whole block runs through a day in six minutes (day.js).
//
// The rooms are the Block's own files, each with a street front added here
// (fronts/). It opens from #/blockparty and isn't in the picker; when it
// ships it takes over The Block's id, so saves carry over. The brief is
// docs/levels/block.md; the layout is plan.js; the colors are style.js.
import { WALL, ZK, SLAB } from '../../engine/iso.js';
import { C, alpha } from '../../engine/art.js';
import { reg, birds } from '../shared.js';
import { blimp, plane } from '../block/ambient.js';
import { AT, DOORS, GRID, SIZE, MID, LOOP } from './plan.js';
import { walkers, nightfall, plate } from './day.js';
import { hour, at, nightK, open, rush, LAUNCH } from './clock.js';
import { follow } from './finale.js';
import { sound } from './sound.js';
import * as FRONTS from './fronts/index.js';

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

// Each room as the Block draws it, with its street front (fronts/) and the
// night on it (it stays lit: day.js).
const onTheStreet = (room) => ({ ...room, build(R) { room.build(R); FRONTS[room.id](R); nightfall(R); } });

// What a room can ask about the day: the hour (0 to 24), how dark it is
// outside, whether it's open and how busy (0 to 1), and when the rocket goes.
const dayFor = (id) => ({ hour, nightK, open: (t) => open(id, t), rush: (t) => rush(id, t), launch: at(LAUNCH) });

const rooms = GRID.flatMap((row, r) => row.map((id, c) => ({
  zone: onTheStreet(ROOMS[id]),
  at: AT[id],
  tag: `Unit ${c + 1}${'ABCD'[r]}`,
  doors: DOORS[id] ? [DOORS[id]] : [],
  // The day, for a room file that wants it (R.opts.day): on The Block it's
  // absent, so the room draws as it always has.
  opts: { day: dayFor(id) },
})));

// Prev / next and the list: the streets first, then the rooms snaking through
// the block along each diagonal band (as on the Block).
const cells = GRID.flatMap((row, r) => row.map((id, c) => ({ id, r, c })));
cells.sort((a, b) => a.c + a.r - (b.c + b.r) || ((a.c + a.r) % 2 ? a.c - b.c : b.c - a.c));

// Registration marks round the sheet, and its caption, printed in the light
// ink after dark (like the Manor's words on its night).
function backdrop(ctx, t) {
  const night = nightK(t) > 0.5;
  const top = -WALL * ZK - 7, bottom = SIZE + SLAB * ZK + 6;
  ctx.save();
  reg(ctx, 0, top, night ? C.paper : null);
  reg(ctx, 0, bottom, night ? C.paper : null);
  reg(ctx, -SIZE - 6, SIZE / 2, night ? C.paper : null);
  reg(ctx, SIZE + 6, SIZE / 2, night ? C.paper : null);
  const k = 40;
  ctx.translate(-SIZE + 2, SIZE * 0.8);
  ctx.scale(1 / k, 1 / k);
  ctx.font = `${0.9 * k}px "Rethink Sans", system-ui, sans-serif`;
  ctx.fillStyle = alpha(night ? C.paper : C.ink, 0.55);
  ctx.textBaseline = 'middle';
  ctx.fillText('SQUARES  ·  THE BLOCK PARTY  ·  16 ROOMS, 16 GEESE, 1 SOCK', 0, 0);
  ctx.restore();
}

// Over the block: the blimp (on a path that keeps clear of the title, top
// left), birds by day, the paper plane, and the finale's clock.
function sky(ctx, t, world, fx) {
  follow(fx);
  blimp(ctx, t, { along: 'y', at: SIZE * 0.66, from: -40, to: SIZE + 30 });
  if (nightK(t) < 0.5) {
    birds(ctx, t, 0, SIZE);
    birds(ctx, t + 17, 1, SIZE);
  }
  plane(ctx, t, SIZE);
}

export default {
  id: 'blockparty',
  name: 'The Block Party',
  short: 'The Block Party',
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
  // A first visit: the invitation points at the stage; on a phone, where the
  // stage is in the thick of it, it pins by the back corner instead, on the
  // Observatory (block.md, decision 18).
  invite: { zone: 'main-street', at: [MID, MID, 1.4], phone: { zone: 'observatory', pin: [0, 0, WALL - 2] } },
  // The ending: the clock jumps to the party and the geese conga (finale.js).
  finale: { at: at(19.8) },
  sound,
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
