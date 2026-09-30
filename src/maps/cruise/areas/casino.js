// The Casino (greybox). The bow end of the Promenade: slots, the roulette
// wheel, the duty-free, and the gangway desk on the cut side where the pier
// meets the ship at 6pm. Keep the id: it's in links and saves.
import { C, folk } from '../../../engine/art.js';
import { block, pin, figure, paths } from '../../greybox.js';
import { deck } from '../ship.js';
import { INK } from '../style.js';

export default {
  id: 'casino',
  name: 'The Casino',
  blurb: 'Open at 9am, with a queue at 8:59. The man at the roulette wheel has put everything on green since day one.',

  build(R) {
    deck(R, 'casino', 'promenade');
    block(R, 11, 6.4, 5, 1, 2.2, INK.sunYellow, 'SLOTS');
    block(R, 7, 1, 9, 1, 2.2, INK.sunYellow, 'SLOTS');
    block(R, 14.5, 10, 2.6, 1.6, 1, C.green, 'ROULETTE');
    block(R, 3, 9, 3, 2, 1, C.green, 'CARDS');
    block(R, 10.5, 13.2, 3, 1.2, 1.1, C.navy, 'GANGWAY');
    block(R, 20, 4, 3, 3, 2.2, C.sky, 'DUTY FREE');
    figure(R, 17.5, 9, folk(81), 'Croupier', { dir: 'l' });
    figure(R, 12, 12.4, folk(82), 'Security', { dir: 'r' });
    figure(R, 9, 3, folk(83), 'Slots', { dir: 'r', back: true });
    figure(R, 11, 3, folk(84), '', { dir: 'r', back: true });
    figure(R, 2, 5.5, folk(85), '9am queue', { dir: 'r' });
    figure(R, 4, 11, folk(86), 'Cards', { pose: 'sit' });
    pin(R, { id: 'clicker', label: 'The gangway clicker', at: [11.8, 13.7, 1.25] }, 1);
    pin(R, { id: 'handprints', label: 'Sticky handprints on a slot machine', at: [13.8, 7.4, 1.6] }, 2);
    paths(R);
  },
};
