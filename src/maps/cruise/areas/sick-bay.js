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
    block(R, 6.5, 2.8, 3, 1.2, 1.1, C.white, 'DESK');
    for (let i = 0; i < 3; i++) block(R, 1.5 + i * 3.2, 12, 2, 3, 0.7, C.white, i === 0 ? 'BEDS' : '');
    block(R, 11, 9, 4, 4, 0.2, INK.queasyGreen, 'QUARANTINE');
    block(R, 1, 0.4, 3, 0.4, 2.5, C.coral, 'SIGN');
    figure(R, 2.5, 12.8, folk(111), '', { pose: 'sleep', z: 0.7 });
    figure(R, 5.7, 12.8, folk(112), 'Patients', { pose: 'sleep', z: 0.7 });
    figure(R, 13, 11, folk(113), 'Quarantined', { dir: 'l' });
    pin(R, { id: 'lab-slip', label: 'A lab slip', at: [8.6, 3.4, 1.2] }, 1);
    pin(R, { id: 'pudding', label: 'A thermometer in a pudding', at: [8.2, 13.4, 0.9] }, 2);
    paths(R);
  },
};
