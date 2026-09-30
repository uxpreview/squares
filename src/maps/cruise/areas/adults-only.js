// Adults Only (greybox). The quiet deck at the bow end of the cabins: the spa,
// a hot tub, loungers, a Serenity sign, and the loudest people on the ship.
// Keep the id: it's in links and saves.
import { C, folk } from '../../../engine/art.js';
import { block, pin, figure, paths } from '../../greybox.js';
import { deck } from '../ship.js';
import { INK } from '../style.js';

export default {
  id: 'adults-only',
  name: 'Adults Only',
  blurb: 'The Serenity deck is the loudest place on the ship. The attendant shushing everyone is the loudest of all.',

  build(R) {
    deck(R, 'adults-only', 'cabins');
    block(R, 3, 6, 2.2, 1, 0.9, C.white, 'SPA');
    block(R, 3, 9, 2.2, 1, 0.9, C.white, '');
    block(R, 6.5, 10, 4, 4, 0.8, C.water, 'HOT TUB');
    block(R, 17, 7, 2.5, 1.2, 0.6, C.white, 'GLORIA');
    block(R, 12, 1, 5, 0.6, 3, INK.sunYellow, 'SERENITY');
    for (let i = 0; i < 3; i++) block(R, 12 + i * 3, 12.5, 1.1, 2.4, 0.5, INK.flamingo, i === 0 ? 'LOUNGERS' : '');
    figure(R, 4, 5.5, folk(51), 'Seaweed wrap', { pose: 'sleep', z: 0.9 });
    figure(R, 8, 11, folk(52), 'Hot tub', { pose: 'swim' });
    figure(R, 22, 6, folk(53), 'On the phone', { dir: 'l' });
    figure(R, 11, 5, folk(54), 'Attendant', { dir: 'r' });
    pin(R, { id: 'spa-card', label: "Gloria's spa card", at: [19.6, 6.4, 0.7] }, 1);
    pin(R, { id: 'dnd-sign', label: 'A Do Not Disturb sign', at: [10.4, 13.9, 1] }, 2);
    paths(R);
  },
};
