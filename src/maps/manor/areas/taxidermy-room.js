// Taxidermy Room (greybox). The dark-humor centerpiece: stuffed everything,
// one empty stand marked GOOSE, and an owl that turns its head when you look
// away.
import { shell, block, pin, paths } from '../../greybox.js';
import { TONE, blockOf, walls, house, lamp, stormWindow, INK } from '../style.js';
import { C } from '../../../engine/art.js';
import { DOORS } from '../plan.js';

const T = TONE['taxidermy-room'], B = blockOf(T);

export default {
  id: 'taxidermy-room',
  name: 'Taxidermy Room',
  blurb: 'Stuffed everything, and one empty stand marked GOOSE. The owl turns its head whenever you look away.',

  build(R) {
    shell(R, { floor: T, name: 'TAXIDERMY', walls: walls(T, { doors: DOORS['taxidermy-room'] || [] }) });
    paths(R);

    stormWindow(R, 'left', 8, 2, 2, 2.6);
    block(R, 1, 1, 1.4, 1.4, 3.6, C.brown, 'STAG');
    block(R, 4.5, 0.6, 2, 1.2, 1.3, C.brown, 'BOAR');
    block(R, 0.6, 5, 1.4, 1.4, 2.2, C.brown, 'BEAR CUB');
    block(R, 9.5, 0.6, 1, 0.8, 1.0, C.coral, 'FOX');
    block(R, 0.6, 14, 1, 1, 2.0, INK.verdigris, 'PEACOCK');
    block(R, 7.5, 5.5, 1.2, 1.2, 0.8, INK.bone, 'GOOSE (EMPTY)');
    block(R, 12.35, 2.35, 0.3, 0.3, 2.2, B);
    block(R, 12.2, 2.2, 0.6, 0.6, 0.8, C.brown, 'OWL', { z: 2.2 });
    block(R, 2, 11.5, 2, 1.2, 1.1, B, 'DESK');

    lamp(R, 6, 10);
    R.dark(house.dark);

    pin(R, { id: 'order-form', label: 'An order form for a goose', at: [3, 12.1, 1.2], r: 0.7 }, 1);
    pin(R, { id: 'empty-stand', label: 'An empty stand marked GOOSE', at: [8.1, 6.1, 0.95], r: 0.8 }, 2);
    pin(R, { id: 'owl', label: 'The owl that turns its head', at: [12.5, 2.5, 3.1], r: 0.8 }, 3);
  },
};
