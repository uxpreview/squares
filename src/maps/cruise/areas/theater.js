// The Theater (greybox). The stern end of the Promenade: the stage, rows of
// red seats, the kids' slime show at 10, bingo at 3, and a magician whose
// rabbit got out. The lift's lobby is in the corner. Keep the id.
import { C, folk } from '../../../engine/art.js';
import { block, pin, figure, paths } from '../../greybox.js';
import { deck } from '../ship.js';
import { INK } from '../style.js';

export default {
  id: 'theater',
  name: 'The Theater',
  blurb: "The Great Gary's rabbit escaped on day one. He has been pulling other things out of the hat ever since.",

  build(R) {
    deck(R, 'theater', 'promenade');
    block(R, 1, 3, 6, 11, 1, INK.funnelRed, 'STAGE');
    for (const x of [9, 11.8, 14.6]) {
      block(R, x, 5, 1, 3.8, 0.8, INK.funnelRed, x === 9 ? 'SEATS' : '');
      block(R, x, 10.8, 1, 3.8, 0.8, INK.funnelRed, '');
    }
    block(R, 4, 11, 1.4, 1, 0.3, C.white, 'SLIME TABLE', { z: 1 });
    figure(R, 3.5, 7, folk(61), 'The Great Gary', { z: 1, dir: 'r' });
    figure(R, 11.8, 12, folk(62, { scale: 0.7 }), 'Kids', { pose: 'sit' });
    figure(R, 14.6, 13, folk(63, { scale: 0.7 }), '', { pose: 'sit' });
    pin(R, { id: 'slime-kit', label: 'A slime kit', at: [4.7, 11.5, 1.4] }, 1);
    pin(R, { id: 'rabbit', label: 'A rabbit in a lifebuoy', at: [21.5, 14, 0.4] }, 2);
    paths(R);
  },
};
