// The Family: the Yellow House's first floor. Before noon, a family moving
// out to the suburbs, the kids hiding in boxes, a height chart on the kitchen
// door frame. After noon, a retired couple moving in from the suburbs ("We
// sold the house in Braintree."). The hamster is loose all morning, in a
// different box every time a lid opens; after noon they find it and keep it.
import { C, folk } from '../../../engine/art.js';
import { figure, pin } from '../../greybox.js';
import { apartment, stuff } from '../kit.js';
import { SIDING, TRIM, ROOM } from '../style.js';
import { BEFORE, AFTER } from '../clock.js';

const out = BEFORE.when, inn = AFTER.when;
// The hamster: a different box every twenty seconds.
const BOXES = [[5.2, 3.4], [6.8, 5.2], [2.2, 6.6], [9.6, 6.4]];
const hamster = (t) => { const [x, y] = BOXES[Math.floor(t / 20) % BOXES.length]; return [x + 0.5, y + 0.5, 1.1]; };
export default {
  id: 'yellow-1',
  name: 'The Family',
  blurb: 'Moving out to the suburbs, moving in from the suburbs. The hamster has not decided.',
  size: [15, 9],
  build(R) {
    apartment(R, { floor: 0, walls: ROOM['yellow-1'], floorInk: ROOM['yellow-1'].floor, siding: SIDING.yellow, trim: TRIM.yellow, name: 'THE FAMILY', label: 'Yellow House' });
    for (const [x, y] of BOXES) stuff(R, x, y, 1, 1, 1, C.woodLight, 'box', out);
    stuff(R, 9.2, 3, 2.4, 1.2, 1, C.teal, 'sofa (new)', inn);
    stuff(R, 4.4, 7.2, 0.2, 1.6, 3.2, C.white, 'height chart');
    figure(R, 7.6, 7.2, folk(41, { scale: 0.7 }), 'kid', { dir: 'l' });
    figure(R, 11, 7.6, folk(42), 'dad');
    pin(R, { id: 'hamster', label: 'A runaway hamster', at: hamster, r: 0.7, ...BEFORE }, 1);
    pin(R, { id: 'drawing', label: 'A crayon drawing of the house', at: [0, 4.6, 2], r: 0.7 }, 2);
    pin(R, { id: 'glasses', label: 'A pair of reading glasses', at: [10.2, 3.6, 1.05], r: 0.6, ...AFTER }, 3);
    R.goose([3.2, 3.6, 0], { dir: 'r' });
  },
};
