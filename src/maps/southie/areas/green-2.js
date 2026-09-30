// The Roommates: the Green House's second floor. Before noon, four guys
// moving out (a futon, a beer pong table, a TV on a milk crate, pizza boxes,
// a poster over a hole in the wall). The landlady lifts the poster at 11:40;
// the deposit goes back in her can. After noon, a night-shift nurse moves in
// and sleeps through everything.
import { C, folk } from '../../../engine/art.js';
import { figure, pin } from '../../greybox.js';
import { apartment, stuff } from '../kit.js';
import { SIDING, TRIM, ROOM } from '../style.js';
import { BEFORE, AFTER, between } from '../clock.js';

const out = BEFORE.when, inn = AFTER.when;
export default {
  id: 'green-2',
  name: 'The Roommates',
  blurb: 'Four guys, one futon, and a poster over a hole in the wall. The landlady knows about the hole.',
  size: [15, 9],
  build(R) {
    apartment(R, { floor: 1, walls: ROOM['green-2'], floorInk: ROOM['green-2'].floor, siding: SIDING.green, trim: TRIM.green, name: 'ROOMMATES' });
    stuff(R, 9, 3, 2.4, 1.1, 0.8, C.navy, 'futon', out);
    stuff(R, 4.6, 4.4, 3, 1.4, 1.1, C.green, 'beer pong', out);
    stuff(R, 11.4, 6.6, 0.8, 1.2, 1.4, C.greyLight, 'TV on a crate', out);
    stuff(R, 1, 3, 1.4, 1.4, 1.6, C.wood, 'pizza boxes', out);
    stuff(R, 9.4, 3, 2.2, 1.6, 0.7, C.white, 'bed (nurse)', inn);
    stuff(R, 1, 5.6, 1.2, 1.2, 1.2, C.wood, 'boxes', inn);
    figure(R, 7.4, 6.6, folk(12), 'roommate', { dir: 'l' });
    figure(R, 3, 7.2, folk(19), 'roommate');
    pin(R, { id: 'ball', label: 'A ping-pong ball', at: [2.2, 2.4, 0.3], r: 0.6, ...BEFORE }, 1);
    pin(R, { id: 'hole', label: 'The hole behind the poster', at: [0, 7.8, 2.2], r: 0.8, ...BEFORE }, 2);
    pin(R, { id: 'mask', label: 'A sleep mask', at: [10.4, 3.6, 0.9], r: 0.6, ...AFTER }, 3);
    R.goose([6.2, 7.6, 0], { dir: 'r' });
  },
};
