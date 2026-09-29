// The Block Party: sixteen rooms on a city block, facing real streets, on the
// day of the party. Main Street crosses the middle (the stage at the
// crossroads), back alleys run between the rest, the pavement runs along the
// front. Inside walls drop to waist height so you can see the streets and
// into every room at once; step into a room and its walls rise. The whole
// block runs through a day in six minutes (day.js).
//
// It took over the flat Block's id, so saves carried over (#/blockparty
// redirects here). Each room is a file in rooms/, with its street front in
// fronts/. The brief is docs/levels/block.md; the layout is plan.js; the
// colors are style.js.
import { WALL, ZK, SLAB } from '../../engine/iso.js';
import { C, alpha } from '../../engine/art.js';
import { reg, birds } from '../shared.js';
import { blimp, plane } from './ambient.js';
import { AT, DOORS, GRID, SIZE, MID, LOOP } from './plan.js';
import { walkers, nightfall, plate } from './day.js';
import { hour, at, nightK, open, rush, LAUNCH } from './clock.js';
import { follow } from './finale.js';
import { sound } from './sound.js';
import * as FRONTS from './fronts/index.js';

import observatory from './rooms/observatory.js';
import launchpad from './rooms/launchpad.js';
import pool from './rooms/pool.js';
import arcade from './rooms/arcade.js';
import greenhouse from './rooms/greenhouse.js';
import disco from './rooms/disco.js';
import library from './rooms/library.js';
import icerink from './rooms/icerink.js';
import noodles from './rooms/noodles.js';
import bakery from './rooms/bakery.js';
import laundromat from './rooms/laundromat.js';
import ballpit from './rooms/ballpit.js';
import umbrellas from './rooms/umbrellas.js';
import aquarium from './rooms/aquarium.js';
import band from './rooms/band.js';
import trains from './rooms/trains.js';

import mainStreet from './areas/main-street.js';
import alleys from './areas/alleys.js';
import pavement from './areas/pavement.js';

const ROOMS = {
  observatory, launchpad, pool, arcade, greenhouse, disco, library, icerink,
  noodles, bakery, laundromat, ballpit, umbrellas, aquarium, band, trains,
};

// Each room with its street front (fronts/) and the night on it (it stays
// lit: day.js).
const onTheStreet = (room) => ({ ...room, build(R) { room.build(R); FRONTS[room.id](R); nightfall(R); } });

// What a room can ask about the day: the hour (0 to 24), how dark it is
// outside, whether it's open and how busy (0 to 1), and when the rocket goes.
const dayFor = (id) => ({ hour, nightK, open: (t) => open(id, t), rush: (t) => rush(id, t), launch: at(LAUNCH) });

// How far past its corners a room's picture reaches, for the few fronts whose
// signs hang further out over the street than the usual 1.5 (measured by
// QA's pictures check, which fails if anything is cut off).
const REACH = { disco: 4, arcade: 3.6, library: 2.2 };

const rooms = GRID.flatMap((row, r) => row.map((id, c) => ({
  zone: onTheStreet(ROOMS[id]),
  at: AT[id],
  tag: `Unit ${c + 1}${'ABCD'[r]}`,
  doors: DOORS[id] ? [DOORS[id]] : [],
  // Its picture reaches past its corners far enough for its street front's
  // signs, which hang out over the street (block.md, decision 35).
  reach: REACH[id],
  // The day, for the room file (R.opts.day).
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

// Over the block: the blimp, birds by day, the paper plane, and the finale's
// clock. The blimp flies top right to bottom left over the back rows (the
// Launch Pad and the Lido), well above the stage when you're on Main Street,
// and under the title when you're not.
function sky(ctx, t, world, fx) {
  follow(fx);
  blimp(ctx, t);
  if (nightK(t) < 0.5) {
    birds(ctx, t, 0, SIZE);
    birds(ctx, t + 17, 1, SIZE);
  }
  plane(ctx, t, SIZE);
}

export default {
  id: 'block',
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
  // A first visit: the invitation points at the stage (the ring), pinned
  // beside it over the back arm of Main Street, so the stage and its BLOCK
  // PARTY backdrop still show; on a phone, where the stage is in the thick of
  // it, it pins by the back corner instead, on the Observatory (block.md,
  // decisions 18 and 34).
  invite: { zone: 'main-street', at: [MID, MID, 1.4], pin: [MID, 17, 0], phone: { zone: 'observatory', pin: [0, 0, WALL - 2] } },
  // The ending: the clock jumps to the party, the camera goes to the stage,
  // and the geese conga off it (finale.js); the card comes after a while.
  finale: { at: at(19.8), zone: 'main-street', near: [MID + 3, MID], hold: 12 },
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
