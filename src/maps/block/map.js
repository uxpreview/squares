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
  tagline: 'Sixteen rooms. One loose goose in each.',
  zones,
  order,
  // A first visit: the invitation (words.invite, words.hint) is pinned to the
  // top of the laundromat's back walls, in the middle of the block, so it
  // doesn't cover the room; the ring pings in the middle of its floor.
  invite: { zone: 'laundromat', pin: [0, 0, WALL] },
  cutaway: { front: true },
  // On a phone the block fills the screen instead of floating in paper: held
  // upright, the print fills the height (its marks just inside the top and
  // bottom, clear of the text) and the side rooms run off the edges, a swipe
  // away; on its side, the rooms fill the width. (A box narrowed the other way
  // is what makes the framing fill.) On a big screen, the whole print.
  overview: (portrait, storey, short) => {
    const Y0 = -WALL * ZK - 9, Y1 = EXTENT + SLAB * ZK + 7, cy = (Y0 + Y1) / 2;
    if (portrait) return [-1, 1, Y0, Y1];
    if (short) return [-EXTENT - 2, EXTENT + 2, cy - 1, cy + 1];
    return [-EXTENT - 8, EXTENT + 8, Y0, Y1];
  },
  backdrop,
  sky,
  words: {
    zone: 'room',
    invite: 'Pick a room, any room',
    hint: 'Tap one to step inside.',
    whole: 'The whole block',
    complete: 'Every goose, found. The block thanks you.',
  },
};
