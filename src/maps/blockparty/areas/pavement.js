// The pavement: along the two front edges of the block, where the queue for
// the party forms. It starts at the stage end at noon and by evening reaches
// right round the corner, and nobody knows what it's for. A hot dog cart, a
// newsstand, a busker. Greybox: the layout, where the finds go (numbered pins).
import { C, folk, person } from '../../../engine/art.js';
import { ground, block, pin } from '../../greybox.js';
import { PAVEMENT, EDGE, SIZE, LANES } from '../plan.js';
import { STREET, BLOCK, lampPost } from '../style.js';
import { hour, nightK } from '../day.js';

const LANE = LANES[4]; // the middle of the pavement, 83
// The queue, front to back: along the left-hand front from Main Street, then
// round the corner and up the right-hand front.
const QUEUE = [];
for (let x = 46.5; x < EDGE + 1; x += 1.3) QUEUE.push([x, LANE + 0.9]);
for (let y = EDGE - 1; y > 30; y -= 1.3) QUEUE.push([LANE + 0.9, y]);
const FOLK = QUEUE.map((_, i) => folk(100 + i * 3));
// How long it is: nobody at dawn, from noon it grows, gone after the party.
function queueLength(t) {
  const h = hour(t);
  if (h < 11 || h >= 22) return 0;
  if (h >= 19) return Math.round(QUEUE.length * (1 - (h - 19) / 3));
  return Math.round(QUEUE.length * Math.min(1, (h - 11) / 7));
}

export default {
  id: 'pavement',
  name: 'The Pavement',
  blurb: 'The queue for the party goes right round the block. Nobody in it knows what it\'s for.',
  shape: PAVEMENT,
  home: [EDGE + 2, EDGE - 8], // the front corner
  build(R) {
    ground(R, { floor: STREET.pavement, slab: STREET.slab, grid: 1, name: null });
    // The queue: one person per spot, as many as the hour says. Each is its
    // own thing, so it sorts in with the carts and the lamp posts.
    QUEUE.forEach(([x, y], i) => {
      R.thing(x, y, (ctx, t) => {
        if (i >= queueLength(t)) return;
        person(ctx, x, y, 0, { ...FOLK[i], pose: 'stand', dir: y > EDGE ? 'l' : 'r', back: y < EDGE, phase: i }, t);
      }, { anim: true });
    });
    block(R, EDGE + 1, 12, 2.2, 1.4, 1.6, BLOCK.stall, 'Hot dogs');
    block(R, 60, EDGE + 1.2, 2.4, 1.4, 2.2, BLOCK.stall, 'Newsstand');
    block(R, EDGE + 2.2, 57, 1, 1, 0.5, C.wood, 'Busker');
    for (const [x, y] of [[EDGE + 0.6, 8], [EDGE + 0.6, 24], [EDGE + 0.6, 72], [8, EDGE + 0.6], [24, EDGE + 0.6], [72, EDGE + 0.6]]) {
      R.thing(x, y, (ctx) => lampPost(ctx, x, y));
      R.light({ at: [x, y, 4.6], r: 3, color: C.butter, k: (t) => nightK(t) });
    }
    R.dark((t) => nightK(t) * 0.5); // greybox night

    pin(R, { id: 'sorry-card', label: 'A "Sorry we missed you" card', at: [EDGE + 0.7, 40, 0.05], r: 0.8 }, 1);
    pin(R, { id: 'newspaper', label: 'Tomorrow\'s newspaper', at: [61.2, EDGE + 1.1, 2.3], r: 0.8 }, 2);
    pin(R, { id: 'queue-ticket', label: 'A queue ticket', at: [30, SIZE - 1, 0.05], r: 0.8 }, 3);
  },
};
