// The Sick Bay (greybox). The doctor's office at the bow end of the crew
// deck: beds full by noon, a queue down the corridor, a quarantine room, and
// a sign nobody is allowed to change. Keep the id.
import { C, folk } from '../../../engine/art.js';
import { block, pin, figure, paths } from '../../greybox.js';
import { deck } from '../ship.js';
import { INK } from '../style.js';

export default {
  id: 'sick-bay',
  name: 'The Sick Bay',
  blurb: 'Dr. Swabb says it is fine. The sign says DAYS WITHOUT AN OUTBREAK: 0, and nobody is allowed to change it.',

  build(R) {
    deck(R, 'sick-bay', 'crew');
    block(R, 14.5, 2.8, 3, 1.2, 1.1, C.white, 'DESK');
    for (let i = 0; i < 4; i++) block(R, 3 + i * 3.2, 12, 2, 3, 0.7, C.white, i === 0 ? 'BEDS' : '');
    block(R, 19, 8, 3.5, 3.5, 0.2, INK.queasyGreen, 'QUARANTINE');
    block(R, 8, 0.4, 3, 0.4, 2.5, C.coral, 'SIGN');
    block(R, 1, 5, 1, 5, 0.8, C.grey, 'WAITING');
    figure(R, 4, 12.8, folk(111), '', { pose: 'sleep', z: 0.7 });
    figure(R, 7.2, 12.8, folk(112), 'Patients', { pose: 'sleep', z: 0.7 });
    figure(R, 21, 10, folk(113), 'Quarantined', { dir: 'l' });
    figure(R, 1.5, 6, folk(114), 'Queue', { pose: 'sit', z: 0.8 });
    figure(R, 1.5, 8, folk(115), '', { pose: 'sit', z: 0.8 });
    pin(R, { id: 'lab-slip', label: 'A lab slip', at: [16.6, 3.4, 1.2] }, 1);
    pin(R, { id: 'pudding', label: 'A thermometer in a pudding', at: [13.2, 13.4, 0.9] }, 2);
    paths(R);
  },
};
