// The Open House: the Grey One's first floor. A gut-renovated condo, staged
// for a showing: fake lemons, a bowl nobody's allowed to use, a realtor,
// booties at the door. Twenty people at the 1pm showing, all measuring.
// Everyone must wear the booties; the landlady walks through in her shoes.
import { C, folk } from '../../../engine/art.js';
import { figure, pin } from '../../greybox.js';
import { apartment, stuff } from '../kit.js';
import { SIDING, TRIM } from '../style.js';

export default {
  id: 'grey-1',
  name: 'The Open House',
  blurb: 'Luxury living, parking not included. Booties on, please (not you, apparently).',
  size: [15, 9],
  build(R) {
    apartment(R, { floor: 0, siding: SIDING.grey, trim: TRIM.grey, floorInk: C.greyLight, name: 'OPEN HOUSE', label: 'The Grey One' });
    stuff(R, 1, 3, 3, 1, 1.3, C.white, 'island (quartz)');
    stuff(R, 9, 3.2, 2.4, 1.2, 0.9, C.greyLight, 'staged sofa');
    stuff(R, 5.2, 5, 1.6, 1.6, 1, C.wood, 'table');
    figure(R, 11.4, 7.4, folk(81), 'realtor', { dir: 'l' });
    figure(R, 7.6, 7.4, folk(82), 'looking');
    pin(R, { id: 'lemon', label: 'A plastic lemon', at: [5.9, 5.7, 1.15], r: 0.6 }, 1);
    pin(R, { id: 'tag', label: "A realtor's name tag", at: [2.4, 3.4, 1.4], r: 0.6 }, 2);
    pin(R, { id: 'booties', label: 'A pair of shoe booties', at: [11.6, 2.8, 0.15], r: 0.6 }, 3);
    R.goose([3.4, 7.4, 0], { dir: 'r' });
  },
};
