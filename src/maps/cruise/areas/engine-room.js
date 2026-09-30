// The Engine Room (greybox). Below the waterline at the stern: two big
// engines, the shafts, pipes and gauges, and a hammock. The lift comes all the
// way down here. Keep the id: it's in links and saves.
import { C, folk } from '../../../engine/art.js';
import { block, pin, figure, paths } from '../../greybox.js';
import { deck } from '../ship.js';

export default {
  id: 'engine-room',
  name: 'The Engine Room',
  blurb: 'The engineer sleeps through every alarm. His apprentice keeps tapping a gauge that keeps going up.',

  build(R) {
    deck(R, 'engine-room', 'crew');
    block(R, 2, 6.2, 8, 2.6, 3, C.grey, 'ENGINE');
    block(R, 2, 10.5, 8, 2.6, 3, C.grey, 'ENGINE');
    block(R, 12, 0.6, 5, 0.8, 3, C.navy, 'GAUGES');
    block(R, 13, 11.2, 0.4, 0.4, 3.2, C.grey, 'PIPE');
    block(R, 18, 11.2, 0.4, 0.4, 3.2, C.grey, '');
    block(R, 13.4, 11.9, 4.6, 1.2, 0.2, C.white, 'HAMMOCK', { z: 1.1 });
    figure(R, 15.5, 12.5, folk(91), 'Engineer', { pose: 'sleep', z: 1.3 });
    figure(R, 14, 2.4, folk(92), 'Apprentice', { dir: 'r', back: true });
    pin(R, { id: 'hammock', label: 'A hammock between two pipes', at: [15.7, 12.5, 1.6] }, 1);
    pin(R, { id: 'wrench', label: 'A lost wrench', at: [9, 14.6, 0.05] }, 2);
    paths(R);
  },
};
