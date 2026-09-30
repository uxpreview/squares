// The Crew Bar (greybox). The crew's own party under the buffet: fairy
// lights, karaoke, laundry carts for seats, the galley's stores, the crew
// mess. Nobody down here goes green: the crew don't eat the buffet. Keep the id.
import { C, folk } from '../../../engine/art.js';
import { block, pin, figure, paths } from '../../greybox.js';
import { deck } from '../ship.js';
import { INK } from '../style.js';

export default {
  id: 'crew-bar',
  name: 'The Crew Bar',
  blurb: 'Below the waterline, the crew are having a much better party. None of them eat at the buffet.',

  build(R) {
    deck(R, 'crew-bar', 'crew');
    block(R, 3, 9, 6, 1.4, 1.2, INK.teak, 'CREW BAR');
    block(R, 14, 0.3, 9, 1.1, 3, C.grey, 'STORES');
    block(R, 24, 9, 4, 3, 0.6, INK.flamingo, 'KARAOKE');
    block(R, 12, 12, 2, 1.4, 1.2, C.white, 'LAUNDRY');
    block(R, 16, 12.5, 2, 1.4, 1.2, C.white, '');
    block(R, 27, 1, 4, 3, 1, C.white, 'CREW MESS');
    figure(R, 25.5, 10.5, folk(101), 'Karaoke', { pose: 'dance', z: 0.6 });
    figure(R, 6, 11, folk(102), 'Barman', { dir: 'l' });
    figure(R, 11, 7, folk(103), 'Dancing', { pose: 'dance' });
    figure(R, 13, 13, folk(104), 'On a cart', { pose: 'sit', z: 1.2 });
    pin(R, { id: 'plastic-shrimp', label: 'A box of plastic shrimp', at: [21.5, 1, 1.7] }, 1);
    pin(R, { id: 'spoon-ball', label: 'A disco ball made of spoons', at: [14, 7, 5] }, 2);
    paths(R);
  },
};
