// Cellar (greybox). Wine racks, Jenkins packing (and drinking the best wine,
// since nobody's paying him anyway), a secret passage behind a barrel, and a
// poster of a missing goose. You can see into it through the cut in the ground.
import { onLeft, frame } from '../../../engine/art.js';
import { shell, block, pin, stairs, paths } from '../../greybox.js';
import { TONE, blockOf, walls, house, candle, NIGHT, INK } from '../style.js';
import { DOORS } from '../plan.js';

const T = TONE.cellar, B = blockOf(T);

export default {
  id: 'cellar',
  name: 'Cellar',
  blurb: 'Jenkins is packing, and drinking the best wine, since nobody is paying him anyway. There is a draft behind that barrel.',

  build(R) {
    shell(R, { floor: T, name: 'CELLAR', walls: walls(T, { left: NIGHT.stone, right: NIGHT.stone, doors: DOORS.cellar || [] }) });
    R.decor((ctx) => {
      onLeft(ctx, 10.6, 0, 1.8, 2.4, INK.stormNavy);
      frame(ctx, 'right', 12, 2, 2, 2, INK.candleGold);
    });
    paths(R);

    stairs(R, 12.2, 9.5, 2, 5, { up: '+y', rise: 7.1, steps: 12, color: B, name: 'UP TO KITCHEN' });
    block(R, 0, 1, 1.2, 8, 3.6, INK.oxblood, 'WINE');
    block(R, 3, 0, 8, 1.2, 3.6, INK.oxblood, 'WINE');
    block(R, 1.4, 10.8, 1.4, 1.4, 1.6, B, 'BARREL');
    block(R, 5, 6, 2, 1.2, 0.8, INK.stormNavy, 'SUITCASE');

    R.light({ at: [8, 8, 5], r: 4, color: INK.candleGold, k: house.lamp });
    candle(R, 2.1, 11.5, 1.6, 71);
    R.dark(house.dark);

    pin(R, { id: 'resignation', label: "Jenkins's resignation letter", at: [6.2, 6.6, 0.95], r: 0.7 }, 1);
    pin(R, { id: 'poster', label: 'A poster about a missing goose', at: [13, 0.05, 3], r: 0.8 }, 2);
  },
};
