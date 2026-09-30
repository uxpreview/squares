// Southie Christmas: the Yellow House's third floor. Empty before noon (the
// tenant's out on the street, eyeing the curb). After noon he furnishes the
// whole place from Farragut Road's curb, one free thing at a time, in the
// order they disappear from it (day.js carries them up).
import { C, folk } from '../../../engine/art.js';
import { figure, pin } from '../../greybox.js';
import { apartment, stuff } from '../kit.js';
import { SIDING, TRIM } from '../style.js';
import { AFTER, hour } from '../clock.js';
import { CURB, CURB_UP } from '../plan.js';

// Each free thing arrives at its hour (the curb loses it at the same time).
const arrived = (h) => (t) => { const x = hour(t); return x >= h || x < 5; };
export default {
  id: 'yellow-3',
  name: 'Southie Christmas',
  blurb: 'Everything on the curb this morning is up here by tonight. The couch is still wet.',
  size: [15, 9],
  build(R) {
    apartment(R, { floor: 2, siding: SIDING.yellow, trim: TRIM.yellow, name: 'SOUTHIE XMAS' });
    stuff(R, 9, 3, 2.4, 1.2, 1, C.purple, 'curb couch', arrived(CURB[0] + CURB_UP));
    stuff(R, 5, 3.2, 1.6, 1.2, 1.2, C.wood, 'curb dresser', arrived(CURB[1] + CURB_UP));
    stuff(R, 11.4, 6.6, 0.9, 0.9, 1.2, C.greyLight, 'curb TV', arrived(CURB[2] + CURB_UP));
    stuff(R, 2, 6.2, 0.6, 0.6, 2.2, C.mustard, 'lamp', arrived(CURB[3] + CURB_UP));
    figure(R, 7.4, 7.4, folk(61), 'collector');
    pin(R, { id: 'lamp', label: 'A lamp with no shade', at: [2.3, 6.5, 2.2], r: 0.6, ...AFTER }, 1);
    pin(R, { id: 'tv', label: 'A free TV', at: [11.8, 7, 1.3], r: 0.7, ...AFTER }, 2);
    pin(R, { id: 'sign', label: 'A "FREE" sign', at: [5.8, 3.8, 1.3], r: 0.6 }, 3);
    R.goose([3.6, 3.8, 0], { dir: 'r' });
  },
};
