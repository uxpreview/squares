// The Buffet (greybox). The crime scene, in the middle of the Promenade: the
// queue at the doors, the salad bar, the butter swan, the shrimp tower, the
// chocolate fountain, the carving station. Keep the id.
import { C, folk } from '../../../engine/art.js';
import { block, pin, figure, paths } from '../../greybox.js';
import { deck } from '../ship.js';
import { INK } from '../style.js';

export default {
  id: 'buffet',
  name: 'The Buffet',
  blurb: 'All you can eat, 7am to midnight. When the doors opened at seven, something had already been at the salad bar.',

  build(R) {
    deck(R, 'buffet', 'promenade');
    block(R, 11, 7.3, 7, 1.4, 1.1, C.leaf, 'SALAD BAR');
    block(R, 23.5, 5.4, 4, 1.2, 1.1, INK.teak, 'CARVING');
    block(R, 7.5, 8.5, 2, 1.5, 1.1, C.white, 'BUTTER SWAN');
    block(R, 19, 9, 2, 2, 3, INK.flamingo, 'SHRIMP TOWER');
    block(R, 26, 10.5, 1.6, 1.6, 2, C.brown, 'FOUNTAIN');
    block(R, 4, 2, 10, 1.2, 1.1, C.grey, 'HOT TRAYS');
    for (let i = 0; i < 4; i++) block(R, 6 + i * 5.5, 12.8, 2.4, 1.6, 0.9, C.white, i === 0 ? 'TABLES' : '');
    figure(R, 3, 12.6, folk(71), 'Queue', { dir: 'r' });
    figure(R, 1.8, 13.4, folk(72), '', { dir: 'r' });
    figure(R, 22, 13, folk(73), 'Breakfast', { pose: 'sit' });
    figure(R, 29, 8, folk(74), 'Waiter', { dir: 'l' });
    pin(R, { id: 'tongs', label: "Doreen's tongs", at: [15.2, 7.9, 1.25] }, 1);
    pin(R, { id: 'queue-ticket', label: 'A queue ticket', at: [3.4, 14.4, 0.05] }, 2);
    pin(R, { id: 'butter-prints', label: 'Claw prints in the butter', at: [8.5, 9.2, 1.5] }, 3);
    pin(R, { id: 'shrimp', label: 'A shrimp on a toothpick', at: [20, 10, 3.3] }, 4);
    paths(R);
  },
};
