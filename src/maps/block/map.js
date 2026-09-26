// The Block: sixteen rooms on a 4 x 4 plate, one loose goose in each.
import { WALL, ZK, SLAB } from '../../engine/iso.js';
import { GRID, PITCH, EXTENT } from './layout.js';
import { backdrop, sky } from './ambient.js';

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

// Grid order: four rows of four, starting at the back corner.
// Row A is the top of the map, row D the front.
const ROOMS = [
  observatory, launchpad, pool, arcade,
  greenhouse, disco, library, icerink,
  noodles, bakery, laundromat, ballpit,
  umbrellas, aquarium, band, trains,
];

const zones = ROOMS.map((zone, i) => {
  const col = i % GRID, row = Math.floor(i / GRID);
  return { zone, at: [col * PITCH, row * PITCH, 0], tag: `Unit ${col + 1}${'ABCD'[row]}` };
});

// Prev / next and the list snake through the block along each diagonal band.
const order = ROOMS.map((r, i) => i).sort((a, b) => {
  const ca = a % GRID, ra = Math.floor(a / GRID), cb = b % GRID, rb = Math.floor(b / GRID);
  const da = ca + ra, db = cb + rb;
  return da - db || (da % 2 ? ca - cb : cb - ca);
}).map((i) => ROOMS[i].id);

export default {
  id: 'block',
  name: 'The Block',
  tagline: 'Sixteen rooms. One loose goose.',
  zones,
  order,
  cutaway: { front: true },
  // Portrait phones are width-bound: let the print marks fall off the sides so
  // the rooms themselves get the extra size.
  overview: (portrait) => {
    const pad = portrait ? 1.5 : 8;
    return [-EXTENT - pad, EXTENT + pad, -WALL * ZK - 9, EXTENT + SLAB * ZK + 7];
  },
  backdrop,
  sky,
  words: {
    zone: 'room',
    hint: 'Tap a room to step inside. Pinch or scroll to zoom.',
    whole: 'The whole block',
    complete: 'Every goose, found. The block thanks you.',
  },
};
