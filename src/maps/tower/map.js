// The Walk-Up: a four-floor apartment building, pulled apart so you can see
// in. Tap a floor and the ones above lift out of the way.
import { S, ZK, SLAB } from '../../engine/iso.js';
import { FLOOR } from './layout.js';
import { backdrop, sky } from './ambient.js';

import lobby from './floors/lobby.js';
import flat2 from './floors/flat2.js';
import flat3 from './floors/flat3.js';
import roof from './floors/roof.js';

// Bottom to top.
const FLOORS = [
  [lobby, 'Ground floor'],
  [flat2, 'Floor 2'],
  [flat3, 'Floor 3'],
  [roof, 'Roof'],
];

export default {
  id: 'tower',
  name: 'The Walk-Up',
  tagline: 'Four floors of neighbors. One goose per floor.',
  zones: FLOORS.map(([zone, tag], i) => ({ zone, at: [0, 0, i * FLOOR], tag })),
  order: FLOORS.map(([zone]) => zone.id),
  cutaway: { above: true },
  overview: (portrait) => {
    const top = -(FLOORS.length - 1) * FLOOR * ZK - 6 * ZK - 8;
    const pad = portrait ? 3 : 14;
    return [-S - 4 - pad, S + 4 + pad, top, S + SLAB * ZK + 11];
  },
  backdrop,
  sky,
  words: {
    zone: 'floor',
    hint: 'Tap a floor to step inside. Pinch or scroll to zoom.',
    whole: 'The whole building',
    complete: 'Every goose in the building, found. The super is thrilled.',
  },
};
