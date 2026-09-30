// The Cabins (greybox). A corridor of cabins, doors open, 1 to 12, with the
// honeymoon suite at the stern. Cabin 7 is a divorce, live. Chad is carried
// home to cabin 12 at 11. Keep the id: it's in links and saves.
import { C, folk } from '../../../engine/art.js';
import { block, pin, figure, paths, tag } from '../../greybox.js';
import { deck } from '../ship.js';
import { INK } from '../style.js';

export default {
  id: 'cabins',
  name: 'The Cabins',
  blurb: 'Cabin 7 is getting divorced with the door open. Every hour something new goes out into the corridor.',

  build(R) {
    deck(R, 'cabins', 'cabins');
    // Cabins along the cut side, 4 wide, beds against the cut; the honeymoon
    // suite is two wide.
    for (let n = 2; n <= 12; n++) {
      const x = n * 4;
      if (n < 12) block(R, x - 0.1, 8.5, 0.2, 7.5, 3, C.white, '');
    }
    for (let n = 1; n <= 12; n++) {
      if (n === 1) continue;
      const x = n * 4 - 4;
      block(R, x + 0.6, 13, 2.8, 2.4, 0.7, C.white, n === 7 ? 'CABIN 7' : n === 12 ? 'CABIN 12' : '');
    }
    block(R, 1, 12, 6, 3.4, 0.8, INK.flamingo, 'HONEYMOON');
    R.air((ctx) => { tag(ctx, 26, 8.4, 3.6, 'CABINS 1 TO 12', { size: 0.4 }); });
    block(R, 33, 5.5, 1.5, 1, 1, C.grey, 'TRAYS');
    figure(R, 2.5, 10, folk(41), 'Honeymooners', { pose: 'sit' });
    figure(R, 4, 10, folk(42), '', { pose: 'sit' });
    figure(R, 13, 13, folk(43), 'Napping', { pose: 'sleep', z: 0.7 });
    pin(R, { id: 'chad-bucket', label: 'A bucket outside cabin 12', at: [44.6, 8, 0.3] }, 1);
    pin(R, { id: 'garland', label: 'A nibbled flower garland', at: [3, 13.4, 0.9] }, 2);
    pin(R, { id: 'towel-monkey', label: 'A towel monkey', at: [34.5, 14.3, 1.1] }, 3);
    paths(R);
  },
};
