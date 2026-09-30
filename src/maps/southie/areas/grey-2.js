// The New Owners: the Grey One's second floor. Movers in matching shirts, an
// exercise bike with a screen, a smart fridge, a French bulldog in a
// stroller. The bike goes up to the wrong floor, down, up again; by night
// its owner is riding it, looking at the harbor.
import { C, folk } from '../../../engine/art.js';
import { figure, pin } from '../../greybox.js';
import { apartment, stuff } from '../kit.js';
import { SIDING, TRIM, ROOM } from '../style.js';
import { AFTER } from '../clock.js';

export default {
  id: 'grey-2',
  name: 'The New Owners',
  blurb: 'The movers match and the dog rides in a stroller. The bike went to the wrong floor twice.',
  size: [15, 9],
  build(R) {
    apartment(R, { floor: 1, walls: ROOM['grey-2'], floorInk: ROOM['grey-2'].floor, siding: SIDING.grey, trim: TRIM.grey, modern: true, name: 'NEW OWNERS' });
    stuff(R, 10.4, 6.4, 1.6, 0.8, 1.4, C.black, 'bike', AFTER.when);
    stuff(R, 0.5, 6, 0.9, 1.4, 2, C.white, 'smart fridge');
    stuff(R, 6, 3.2, 1.2, 0.8, 1, C.purple, 'dog stroller');
    figure(R, 8, 7.4, folk(91), 'mover');
    figure(R, 4, 5.2, folk(92), 'owner', { dir: 'r' });
    pin(R, { id: 'boot', label: "A dog's rain boot", at: [7.6, 4.6, 0.15], r: 0.6 }, 1);
    pin(R, { id: 'bottle', label: "The bike's water bottle", at: [11.1, 6.6, 1.2], r: 0.6, ...AFTER }, 2);
    pin(R, { id: 'speaker', label: 'A smart speaker', at: [1.4, 3, 1.2], r: 0.6 }, 3);
    R.goose([2.8, 8, 0], { dir: 'r' });
  },
};
