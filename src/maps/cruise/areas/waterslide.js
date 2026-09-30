// The Waterslide (greybox). The stern end of the Sun Deck: the corkscrew
// slide, the big red funnel, mini golf, the splash pool, lifeboats on the
// far rail. The lift comes up here. Keep the id: it's in links and saves.
import { C, folk } from '../../../engine/art.js';
import { block, pin, figure, paths } from '../../greybox.js';
import { deck, lifeboat } from '../ship.js';
import { INK } from '../style.js';

export default {
  id: 'waterslide',
  name: 'The Waterslide',
  blurb: 'A big man is stuck in the corkscrew again. The queue at the top is being very patient about it.',

  build(R) {
    deck(R, 'waterslide', 'sun', { rails: true });
    R.thing(4, 0.6, (ctx) => lifeboat(ctx, 2, 0.1, 2.2, 4.5));
    block(R, 9.5, 3, 4.5, 4.5, 11, INK.funnelRed, 'FUNNEL');
    block(R, 2, 4, 3, 3, 8.5, C.sky, 'SLIDE TOWER');
    block(R, 2, 9, 5, 4, 0.4, C.water, 'SPLASH POOL');
    block(R, 9.5, 10, 5.5, 4.5, 0.2, C.leaf, 'MINI GOLF');
    figure(R, 3, 8, folk(11), 'Lifeguard');
    figure(R, 4.5, 5.5, folk(12), 'Queue', { z: 8.5 });
    figure(R, 3.5, 5.5, folk(13), '', { z: 8.5 });
    figure(R, 12, 13, folk(14), 'Golfer');
    pin(R, { id: 'shed-skin', label: 'A patch of shed skin', at: [4.2, 6.3, 8.6] }, 1);
    pin(R, { id: 'flip-flop', label: 'A flip-flop on the funnel', at: [11.7, 5.2, 11.2] }, 2);
    paths(R);
  },
};
