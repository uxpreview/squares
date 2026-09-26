// The Grounds (greybox). The drive up to the front door, Inspector Pidge's car
// stuck in the mud, the gardener lost in his own (very small) maze, and the
// family crypt. It's outside: the storm rains on it, and the house's front
// wall rises when you step out here.
import { C, rect, disc, onRight, mix } from '../../../engine/art.js';
import { shell, block, pin, paths } from '../../greybox.js';
import { NIGHT, walls, house, lamp, lightsOut, INK } from '../style.js';
import { DOORS } from '../plan.js';

// The maze's hedges: [x0, y0, x1, y1] runs, 1.1 tall.
const HEDGES = [
  [0.5, 7.5, 5, 7.5], [6.6, 7.5, 7, 7.5], [0.5, 7.5, 0.5, 15.2], [0.5, 15.2, 7, 15.2], [7, 7.5, 7, 15.2],
  [2.2, 9, 2.2, 13.6], [2.2, 13.6, 5.4, 13.6], [5.4, 10, 5.4, 13.6],
];

export default {
  id: 'grounds',
  name: 'The Grounds',
  blurb: "Inspector Pidge's car is stuck in the drive. The gardener is lost in his own maze again, and it is not a big maze.",

  build(R) {
    shell(R, {
      floor: NIGHT.lawn, slab: false, grid: false,
      walls: walls(NIGHT.stone, { left: false, right: mix(INK.bone, INK.stormNavy, 0.25), doors: DOORS.grounds || [] }),
    });
    // The drive with its turning circle, and the mud the car is stuck in.
    R.rug((ctx) => {
      rect(ctx, 7.4, 2.5, 2.4, 13.5, 0.01, NIGHT.gravel, { stroke: false });
      disc(ctx, 8.6, 3.6, 0.01, 2.4, NIGHT.gravel, { stroke: false });
      disc(ctx, 12.2, 5.4, 0.02, 2.6, NIGHT.mud, { stroke: false });
    });
    // The house's front windows, lit from inside (until the lights go out).
    R.decor((ctx, t) => {
      const glass = mix(INK.candleGold, INK.stormNavy, lightsOut(t) * 0.8);
      onRight(ctx, 1.6, 2, 2.4, 2.6, glass);
      onRight(ctx, 12, 2, 2.4, 2.6, glass);
    }, { anim: true });
    paths(R);

    for (const [x0, y0, x1, y1] of HEDGES) {
      if (y0 === y1) block(R, x0, y0 - 0.22, x1 - x0, 0.45, 1.1, NIGHT.hedge);
      else block(R, x0 - 0.22, y0, 0.45, y1 - y0, 1.1, NIGHT.hedge);
    }
    block(R, 12, 11, 3.5, 4, 3.4, NIGHT.stone, 'CRYPT');
    block(R, 10.5, 4.2, 3.5, 2.4, 1.3, C.woodLight, "PIDGE'S CAR");
    lamp(R, 5.3, 2.8, { h: 3 });
    R.light({ at: [8, 0.4, 4.4], r: 2.6, color: INK.candleGold, k: house.lamp });

    pin(R, { id: 'parcel', label: 'A soaked parcel for G. Goose', at: [6.6, 1.3, 0.35], r: 0.7 }, 1);
    pin(R, { id: 'compass', label: "The gardener's compass", at: [1.3, 14.3, 0.05], r: 0.8 }, 2);
  },
};
