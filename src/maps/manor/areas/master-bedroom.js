// Master Bedroom (greybox). The safe, the new will and the Lord's diary, open
// at "the goose is looking at me again". The four-poster has a trapdoor that
// keeps opening on its own.
import { shell, block, pin, paths } from '../../greybox.js';
import { TONE, blockOf, walls, house, candle, stormWindow, INK } from '../style.js';
import { DOORS } from '../plan.js';

const T = TONE['master-bedroom'], B = blockOf(T);

export default {
  id: 'master-bedroom',
  name: 'Master Bedroom',
  blurb: 'The safe, the new will, and the Lord\'s diary open at "the goose is looking at me again". The bed has a trapdoor that keeps opening.',

  build(R) {
    shell(R, { floor: T, name: 'MASTER BEDROOM', walls: walls(T, { doors: DOORS['master-bedroom'] || [] }) });
    paths(R);

    stormWindow(R, 'right', 8.8, 1.8, 1.8, 2.8);
    stormWindow(R, 'right', 14, 1.8, 1.5, 2.8);
    block(R, 2, 2.5, 5, 5.5, 1.2, B, 'FOUR-POSTER (TRAPDOOR)');
    for (const [x, y] of [[2, 2.5], [6.75, 2.5], [2, 7.75], [6.75, 7.75]]) block(R, x, y, 0.25, 0.25, 4.6, INK.oxblood);
    block(R, 11, 0.3, 2, 1.3, 2.2, INK.stormNavy, 'SAFE');
    block(R, 7.7, 2.7, 1, 1, 1.0, B);
    block(R, 12, 10.5, 2, 1.2, 1.2, B, 'DESK');

    R.light({ at: [8.2, 3.2, 1.8], r: 2.6, color: INK.candleGold, k: house.lamp });
    candle(R, 12.5, 11, 1.2, 51);
    R.dark(house.dark);

    pin(R, { id: 'diary', label: "The Lord's diary", at: [8.2, 3.2, 1.1], r: 0.7 }, 1);
    pin(R, { id: 'new-will', label: 'The new will', at: [13, 11.1, 1.3], r: 0.7 }, 2);
  },
};
