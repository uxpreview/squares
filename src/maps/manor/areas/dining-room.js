// Dining Room (greybox). The birthday dinner, frozen mid-toast, with an empty
// chair at the head of the table. The Brigadier's war story keeps going after
// everyone has left.
import { shell, block, pin, paths } from '../../greybox.js';
import { TONE, blockOf, walls, house, candle, stormWindow, INK } from '../style.js';
import { DOORS } from '../plan.js';

const T = TONE['dining-room'], B = blockOf(T);

export default {
  id: 'dining-room',
  name: 'Dining Room',
  blurb: 'The birthday dinner, frozen mid-toast, with an empty chair at the head. The Brigadier is still telling his war story, now to nobody.',

  build(R) {
    shell(R, { floor: T, name: 'DINING ROOM', walls: walls(T, { doors: DOORS['dining-room'] || [] }) });
    paths(R);

    block(R, 4, 0.2, 6, 0.9, 1.1, B, 'SIDEBOARD');
    stormWindow(R, 'right', 1, 1.8, 2, 2.8);
    stormWindow(R, 'right', 11, 1.8, 2.4, 2.8);
    // The table, seats on both sides, and the Lord's empty chair at the head.
    block(R, 3, 6, 10, 3.4, 1.2, B, 'TABLE');
    for (const x of [4.5, 7, 9.5, 12]) {
      block(R, x - 0.4, 4.8, 0.8, 0.8, 0.75, INK.oxblood);
      block(R, x - 0.4, 9.8, 0.8, 0.8, 0.75, INK.oxblood);
    }
    block(R, 13.6, 7.3, 0.8, 0.8, 2.2, INK.oxblood, 'EMPTY CHAIR');

    candle(R, 5.5, 7.7, 1.2, 21);
    candle(R, 8, 7.7, 1.2, 22);
    candle(R, 10.5, 7.7, 1.2, 23);
    R.light({ at: [8, 7.7, 5], r: 5.5, color: INK.candleGold, k: house.lamp });
    R.dark(house.dark);

    pin(R, { id: 'false-tooth', label: 'A false tooth in the soup', at: [5.5, 6.8, 1.3], r: 0.7 }, 1);
    pin(R, { id: 'goose-place', label: 'A place set for the goose', at: [11.8, 8.8, 1.25], r: 0.7 }, 2);
  },
};
