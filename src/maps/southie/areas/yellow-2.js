// The Overlap: the Yellow House's second floor. The old tenant hasn't
// finished leaving and the new one has arrived: two of everything, one
// apartment, a standoff at the kitchen table. At 11:58 the old tenant has one
// box left, and it's the last box every time you look, until it's gone.
import { C, folk } from '../../../engine/art.js';
import { figure, pin } from '../../greybox.js';
import { apartment, stuff } from '../kit.js';
import { SIDING, TRIM } from '../style.js';
import { BEFORE } from '../clock.js';

export default {
  id: 'yellow-2',
  name: 'The Overlap',
  blurb: 'The lease says noon and it is 11:58. There has been one box left since ten.',
  size: [15, 9],
  build(R) {
    apartment(R, { floor: 1, siding: SIDING.yellow, trim: TRIM.yellow, name: 'THE OVERLAP' });
    stuff(R, 1.2, 3, 2.2, 1.6, 1.2, C.wood, 'kitchen table');
    stuff(R, 9, 3, 2, 1.2, 1, C.coral, 'her couch');
    stuff(R, 9, 5.6, 2, 1.2, 1, C.teal, 'his couch');
    stuff(R, 5.4, 4.4, 1, 1, 1, C.woodLight, 'last box', BEFORE.when);
    figure(R, 0.8, 5.4, folk(51), 'leaving', { dir: 'r' });
    figure(R, 3.8, 5.4, folk(52), 'arriving', { dir: 'l' });
    pin(R, { id: 'toaster', label: 'A second toaster', at: [1.4, 7.4, 0.4], r: 0.6 }, 1);
    pin(R, { id: 'lease', label: 'A lease signed twice', at: [2.8, 4.2, 1.25], r: 0.6 }, 2);
    pin(R, { id: 'lastbox', label: 'The last box', at: [5.9, 4.9, 1.2], r: 0.7, ...BEFORE }, 3);
    R.goose([7.4, 7.4, 0], { dir: 'l' });
  },
};
