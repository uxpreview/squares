// The Bridge (greybox). The bow end of the Sun Deck: the wheel, the radar,
// the captain's monitors, and a couple doing the famous pose on the very tip
// of the bow all day. Keep the id: it's in links and saves.
import { C, folk } from '../../../engine/art.js';
import { block, pin, figure, paths } from '../../greybox.js';
import { deck } from '../ship.js';
import { INK } from '../style.js';

export default {
  id: 'bridge',
  name: 'The Bridge',
  blurb: 'The captain has been green at the wheel for four days. The first officer steers with one finger while he is not looking.',

  build(R) {
    deck(R, 'bridge', 'sun', { rails: true });
    block(R, 8.5, 3, 3, 1.3, 1.2, INK.teak, 'WHEEL');
    block(R, 4, 0.8, 4.5, 1, 2.2, C.navy, 'MONITORS');
    block(R, 2, 3, 1, 1, 7, C.white, 'RADAR');
    block(R, 12, 2, 1.2, 1.2, 1.1, C.grey, 'CHART');
    figure(R, 13, 5, folk(31), 'First officer', { dir: 'r' });
    figure(R, 19.5, 7.6, folk(32), 'The pose', { dir: 'r' });
    figure(R, 18.7, 8.2, folk(33), '', { dir: 'r' });
    pin(R, { id: 'captain-bucket', label: 'A bucket by the wheel', at: [11.8, 6.4, 0.3] }, 1);
    pin(R, { id: 'patches', label: 'A box of seasickness patches', at: [12.6, 2.6, 1.3] }, 2);
    pin(R, { id: 'camera-still', label: 'A security camera still', at: [5.2, 1.6, 2.4] }, 3);
    paths(R);
  },
};
