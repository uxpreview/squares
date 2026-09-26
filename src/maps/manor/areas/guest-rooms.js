// Guest Rooms (greybox). The landing at the top of the stairs, a corridor, and
// two rooms: the Brigadier's and Dr. Crane's. Each is searching the other's
// luggage, and they creep past each other in the corridor pretending not to.
import { C, rect, paintText, alpha } from '../../../engine/art.js';
import { shell, block, pin, paths } from '../../greybox.js';
import { TONE, blockOf, walls, house, candle, INK } from '../style.js';
import { DOORS } from '../plan.js';

const T = TONE['guest-rooms'], B = blockOf(T);
const WALL = 1.2; // the low partitions inside

export default {
  id: 'guest-rooms',
  name: 'Guest Rooms',
  blurb: 'Dr. Crane and the Brigadier are each searching the other\'s luggage. They keep passing in the corridor, pretending not to.',

  build(R) {
    shell(R, { floor: T, name: 'GUEST ROOMS', nameAt: [8, 15.5], nameSize: 0.8, walls: walls(T, { doors: DOORS['guest-rooms'] || [] }) });
    // The stairwell, and the rooms' names on the floor.
    R.rug((ctx) => {
      rect(ctx, 1.5, 0.4, 9.5, 2.4, 0.01, INK.stormNavy, { lw: 0.05 });
      paintText(ctx, 'floor', 4, 8.6, 'BRIGADIER', 0.55, alpha(C.ink, 0.35));
      paintText(ctx, 'floor', 12, 8.6, 'DR. CRANE', 0.55, alpha(C.ink, 0.35));
    });
    paths(R);

    block(R, 1.5, 2.8, 9.5, 0.2, 1.0, B, 'STAIRS DOWN');
    for (const [x0, x1] of [[0, 3], [5, 11], [13, 16]]) block(R, x0, 6.4, x1 - x0, 0.2, WALL, B);
    block(R, 7.9, 6.6, 0.2, 9.4, WALL, B);
    block(R, 0.5, 11, 2.5, 4, 0.9, INK.oxblood, 'BED');
    block(R, 5.5, 12.5, 1.5, 1, 0.7, B, 'CHEST');
    block(R, 13, 11, 2.5, 4, 0.9, INK.oxblood, 'BED');
    block(R, 10, 12.7, 1, 0.6, 0.6, C.ink, 'BAG');
    block(R, 13, 4, 1.4, 1, 0.7, C.brown, 'SUITCASE');

    R.light({ at: [8, 4.5, 3], r: 3.6, color: INK.candleGold, k: house.lamp });
    candle(R, 3.5, 11, 0.9, 61);
    candle(R, 12.5, 11, 0.9, 62);
    R.dark(house.dark);

    pin(R, { id: 'doctors-bag', label: "Dr. Crane's bag", at: [10.5, 13, 0.7], r: 0.7 }, 1);
    pin(R, { id: 'mint-tin', label: 'An empty tin of mints', at: [6, 5.2, 0.05], r: 0.7 }, 2);
    pin(R, { id: 'silver', label: 'The family silver, half packed', at: [13.7, 4.5, 0.8], r: 0.8 }, 3);
    pin(R, { id: 'pistol', label: 'A duelling pistol', at: [6.2, 13, 0.8], r: 0.7 }, 4);
  },
};
