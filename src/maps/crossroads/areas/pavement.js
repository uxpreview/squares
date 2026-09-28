// The pavement at the Crossroads: an L along the two front edges, one area
// drawn in pieces, with people walking its length.
import { C } from '../../../engine/art.js';
import { ground, block, pin } from '../../greybox.js';
import { EDGE, PAVE, PAVEMENT } from '../plan.js';

export default {
  id: 'pavement',
  name: 'The Pavement',
  blurb: 'Somebody has chalked a hopscotch that goes on for forty squares.',
  shape: PAVEMENT,
  build(R) {
    ground(R, { floor: C.greyLight, slab: C.grey, grid: 1, name: 'Pavement', nameAt: [20, EDGE + PAVE / 2] });
    block(R, EDGE + 2, 10, 1.4, 1.4, 1.1, C.teal, 'Bin');
    block(R, 10, EDGE + 2, 1.4, 1.4, 1.1, C.teal, 'Bin');
    R.goose([EDGE + 2.5, EDGE + 2.5], { dir: 'r' });
    pin(R, { id: 'chalk', label: 'A stick of chalk', at: [24, EDGE + 3, 0.1], r: 0.8 }, 1);
  },
};
