// Kitchen (greybox). Mrs. Hatchett baking a second trifle out of respect, the
// dog stealing sausages every time she turns round, and the hatch down to the
// cellar.
import { C, rect, alpha, box, Q } from '../../../engine/art.js';
import { route } from '../../../engine/actors.js';
import { shell, block, pin, paths, tag } from '../../greybox.js';
import { TONE, blockOf, walls, house, fire, stormWindow, INK } from '../style.js';
import { DOORS } from '../plan.js';

const T = TONE.kitchen, B = blockOf(T);

export default {
  id: 'kitchen',
  name: 'Kitchen',
  blurb: 'Mrs. Hatchett is baking a second trifle, out of respect. The dog steals a sausage every time she turns round.',

  build(R) {
    shell(R, { floor: T, name: 'KITCHEN', walls: walls(T, { doors: DOORS.kitchen || [] }) });
    // The cellar hatch, and flour all over the floor (with webbed footprints in it).
    R.rug((ctx) => {
      rect(ctx, 12.2, 9.5, 2, 5, 0.01, INK.stormNavy, { lw: 0.05 });
      rect(ctx, 7, 11.4, 3.4, 2.2, 0.01, alpha(C.white, 0.85), { stroke: false });
      for (const [x, y] of [[7.6, 12.9], [8.3, 12.3], [9, 12.8], [9.7, 12.2]]) rect(ctx, x, y, 0.3, 0.3, 0.02, alpha(C.ink, 0.45), { stroke: false });
    });
    R.air((ctx) => { if (Q.detail) tag(ctx, 13.2, 12, 0.8, 'TO CELLAR'); });
    paths(R);

    block(R, 4, 0.2, 8, 1.4, 1.4, INK.stormNavy, 'RANGE');
    block(R, 0, 1.5, 0.9, 6, 3.2, B, 'SHELVES');
    stormWindow(R, 'right', 13, 2, 2, 2.6);
    block(R, 5, 6, 6, 3, 1.2, B, 'TABLE');
    block(R, 7.5, 7, 1, 1, 0.5, C.pink, 'TRIFLE II', { z: 1.2 });

    // The dog, on a loop round the table, with a sausage.
    const dog = route([[4.2, 11.2], [4.2, 4.6, 1], [12.6, 4.6], [12.6, 11.2, 2]], { speed: 2.4 });
    R.mover(dog, (ctx, t, p) => {
      box(ctx, p.x - 0.45, p.y - 0.25, 0, 0.9, 0.5, 0.55, C.brown, { flat: true });
      box(ctx, p.x + (p.dir === 'r' ? 0.3 : -0.7), p.y - 0.2, 0.4, 0.4, 0.4, 0.35, C.brown, { flat: true });
    });

    fire(R, 8, 1, 1.5, 31);
    R.light({ at: [8, 7.5, 4.5], r: 4.5, color: INK.candleGold, k: house.lamp });
    R.dark(house.dark);

    pin(R, { id: 'footprints', label: 'Webbed footprints in flour', at: [8.7, 12.6, 0.02], r: 0.9 }, 1);
    pin(R, { id: 'timer', label: 'A kitchen timer', at: [10.4, 7.2, 1.3], r: 0.7 }, 2);
    pin(R, { id: 'sausage', label: 'A sausage on the run', at: (t) => { const p = dog(t); return [p.x + 0.4, p.y + 0.4, 0.6]; }, r: 0.9 }, 3);
  },
};
