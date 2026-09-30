// The Roof Deck: the Grey One's third floor, the penthouse, and its deck on
// the roof (the outside draws it: a hot tub, a fire table, a view of Castle
// Island). A new owner's first day. Every time a plane comes over, the wine
// glasses rattle and the conversation stops mid-word, then carries on.
import { C, folk } from '../../../engine/art.js';
import { figure, pin } from '../../greybox.js';
import { apartment, stuff } from '../kit.js';
import { SIDING, TRIM } from '../style.js';

export default {
  id: 'grey-3',
  name: 'The Roof Deck',
  blurb: 'A hot tub, a fire table and a view of Castle Island. Every minute a plane comes over and everyone stops mid-word.',
  size: [15, 9],
  build(R) {
    apartment(R, { floor: 2, siding: SIDING.grey, trim: TRIM.grey, floorInk: C.greyLight, name: 'ROOF DECK' });
    stuff(R, 8.6, 3, 2.8, 1.2, 0.9, C.greyLight, 'sectional');
    stuff(R, 1, 3, 2.6, 1, 1.3, C.white, 'kitchen');
    stuff(R, 5.2, 5.4, 1.6, 1.6, 0.6, C.coral, 'fire table');
    figure(R, 11.4, 8, folk(101), 'owner', { dir: 'l' });
    figure(R, 7.6, 7.6, folk(102), 'guest');
    pin(R, { id: 'glass', label: 'A wine glass on the railing', at: [14.6, 1.6, 1.2], r: 0.6, out: true }, 1);
    pin(R, { id: 'umbrella', label: 'A golf umbrella', at: [13.5, 3.9, 0.4], r: 0.7, out: true }, 2);
    pin(R, { id: 'binoculars', label: 'A pair of binoculars', at: [10, 3.6, 1.0], r: 0.6 }, 3);
    R.goose([4, 8.2, 0], { dir: 'r' });
  },
};
