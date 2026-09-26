// Conservatory (greybox). A glass room lit by the lightning, where Lady
// Philippa and the gardener are caught in a new pose with every flash.
import { mix } from '../../../engine/art.js';
import { shell, block, pin, paths } from '../../greybox.js';
import { TONE, blockOf, walls, house, candle, INK } from '../style.js';
import { DOORS } from '../plan.js';

const T = TONE.conservatory, B = blockOf(T);
const GLASS = mix(INK.bone, INK.verdigris, 0.45);

export default {
  id: 'conservatory',
  name: 'Conservatory',
  blurb: 'Lady Philippa and the gardener, caught by the lightning in a new pose every time. Nobody has watered the plants.',

  build(R) {
    shell(R, { floor: T, name: 'CONSERVATORY', walls: walls(T, { left: GLASS, right: GLASS, doors: DOORS.conservatory || [] }) });
    paths(R);

    block(R, 11.2, 1.7, 1.6, 1.6, 5, INK.verdigris, 'PALM');
    block(R, 2.2, 12.2, 1.6, 1.6, 4.5, INK.verdigris, 'PALM');
    block(R, 0.4, 1, 1.2, 5, 0.8, B, 'PLANTS');
    block(R, 7, 9, 4, 1.3, 0.9, B, 'BENCH');
    block(R, 4.5, 5.5, 1, 1, 0.8, INK.oxblood, 'POT');

    candle(R, 9, 9.6, 0.9, 41);
    R.dark(house.dark);

    pin(R, { id: 'love-letters', label: 'Love letters in a flowerpot', at: [5, 6, 0.95], r: 0.7 }, 1);
    pin(R, { id: 'fig-leaf', label: 'A fig leaf, worn once', at: [12.5, 11.5, 0.05], r: 0.8 }, 2);
  },
};
