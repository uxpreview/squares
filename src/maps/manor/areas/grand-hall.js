// Grand Hall (greybox). Everyone arrives here: the staircase up, the Lord's
// portrait (its eyes follow you), and a suit of armor that moves when nobody
// is looking. The goose is here too, looking innocent by the coats.
import { frame, disc, shade } from '../../../engine/art.js';
import { shell, block, drawBlock, pin, stairs, paths } from '../../greybox.js';
import { TONE, blockOf, walls, house, INK } from '../style.js';
import { DOORS } from '../plan.js';

const T = TONE['grand-hall'], B = blockOf(T);
// Where the armor stands, in turn: it moves whenever you look away.
const ARMOR = [[3.5, 12.8], [6, 13.4], [2.6, 9.6]];

export default {
  id: 'grand-hall',
  name: 'Grand Hall',
  blurb: 'The suit of armor keeps moving when nobody is looking. The portrait of the Lord is watching you, which is rude for a painting.',

  build(R) {
    shell(R, { floor: T, name: 'GRAND HALL', walls: walls(T, { doors: DOORS['grand-hall'] || [] }) });
    R.decor((ctx) => frame(ctx, 'left', 3.2, 2.2, 2.2, 2.4, INK.oxblood));
    R.rug((ctx) => disc(ctx, 8, 9.5, 0.01, 3.2, shade(T, 0.3), { stroke: false }));
    paths(R);

    stairs(R, 1.5, 0.4, 9.5, 2.4, { up: '-x', rise: 7.1, steps: 12, color: B, name: 'STAIRS UP' });
    block(R, 0.6, 10, 0.8, 0.8, 3.3, INK.deepPlum, 'CLOCK');
    block(R, 14.2, 12.2, 0.5, 0.5, 2.4, B, 'COATS');
    R.mover((t) => {
      const [x, y] = ARMOR[Math.floor(t / 17) % ARMOR.length];
      return { x, y };
    }, (ctx, t, p) => drawBlock(ctx, p.x - 0.5, p.y - 0.5, 0, 1, 1, 2.6, INK.bone, 'ARMOR'));

    R.goose([12.3, 13.4, 0], { dir: 'l' });

    R.light({ at: [8, 9, 5.2], r: 5, color: INK.candleGold, k: house.lamp });
    R.dark(house.dark);

    pin(R, { id: 'rolling-pin', label: "Mrs. Hatchett's rolling pin", at: [8, 5.5, 0.1], r: 0.8 }, 1);
  },
};
