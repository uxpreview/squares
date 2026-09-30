// The Landlady: the Green House's first floor (docs/levels/southie.md).
// Fifty-two years in the house, not moving. A plastic-covered couch, a police
// scanner, every key on one ring, the Red Sox on the radio. She runs the day
// from her front window: up to every apartment at 11:30 with her clipboard,
// keys handed out from the porch at noon, narrating from the window at night
// (day.js walks her). Greybox: blocks and pins; the art replaces them.
import { C, folk } from '../../../engine/art.js';
import { figure, pin } from '../../greybox.js';
import { apartment, stuff } from '../kit.js';
import { SIDING, TRIM, ROOM } from '../style.js';

export default {
  id: 'green-1',
  name: 'The Landlady',
  blurb: 'Fifty-two years on the first floor and every key on one ring. She is not moving; everyone else is.',
  size: [15, 9],
  build(R) {
    apartment(R, { floor: 0, walls: ROOM['green-1'], floorInk: ROOM['green-1'].floor, siding: SIDING.green, trim: TRIM.green, name: 'LANDLADY', label: 'Green House' });
    stuff(R, 9.2, 2.8, 2.2, 1.2, 1, C.lilac, 'couch (plastic)');
    stuff(R, 11.2, 6.4, 0.8, 0.8, 1.2, C.wood, 'window chair');
    stuff(R, 5, 3, 1.6, 1.2, 1.2, C.wood, 'table');
    stuff(R, 0.4, 2.5, 3.4, 0.9, 1.4, C.white, 'kitchen');
    stuff(R, 0.4, 6, 0.9, 1.4, 1.8, C.white, 'fridge');
    figure(R, 11.6, 5.9, folk(71, { hair: C.greyLight }), 'landlady', { pose: 'sit' });
    pin(R, { id: 'keys', label: 'The ring of spare keys', at: [5.6, 3.4, 1.35], r: 0.7 }, 1);
    pin(R, { id: 'deposits', label: 'A coffee can of deposits', at: [1.6, 2.9, 1.6], r: 0.7 }, 2);
    pin(R, { id: 'scanner', label: 'A police scanner', at: [11.5, 7.2, 1.4], r: 0.7 }, 3);
    R.goose([7.2, 6.6, 0], { dir: 'l' });
  },
};
