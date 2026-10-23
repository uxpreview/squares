// Dev and QA (greybox): standing desks at every height, hoodies on every
// chair, the server closet blinking, the big screen with the deploy's
// progress bar under a sign that says NO DEPLOYS ON FRIDAYS, and QA's corner
// with its bug board. Dev stay till midnight. Running gag: the deploy reaches
// 99% at five to five and starts again; and QA files a bug on everything,
// the bear included.
import { C, folk } from '../../../engine/art.js';
import { block, pin, drawBlock, figure } from '../../greybox.js';
import { TONE, BLOCK } from '../style.js';
import { floorOf, backWall, sill, pod, staff } from '../kit.js';
import { bearOClock, H, dev } from '../clock.js';

// The deploy's progress: up all day, 99% at 4:55, back to 0, and on into the
// night.
export function deploy(t) {
  const h = H(t);
  if (h < 8.5) return 0;
  if (h < 16.92) return Math.min(99, Math.floor(((h - 8.5) / 8.42) * 99));
  return Math.min(99, Math.floor(((h - 16.92) / 8) * 60));
}

export default {
  id: 'dev-qa',
  name: 'Dev and QA',
  blurb: 'NO DEPLOYS ON FRIDAYS, says the sign over the deploy. QA has filed a bug about the bear.',
  describe: 'The developers\' end of an office floor: standing desks at all heights, hoodies on chairs, a blinking server closet, a big screen with a progress bar creeping along, and a testing corner with a board full of bug reports. The developers are still there long after dark.',

  build(R) {
    floorOf(R, 88, 104, { floor: TONE['dev-qa'], end: true, name: 'DEV AND QA', nameAt: [95, 13.2] });
    backWall(R, 88, 104);
    sill(R, 88, 104, { end: true });

    // Standing desks off the back wall (Dev stay late).
    staff(R, pod(R, 92, 'back', 2), 580, { kinds: ['code', 'code', 'terminal', 'code'], each: () => ({ always: dev, pose: 'stand' }) });
    // The server closet: the goose is in there.
    const closet = R.poke({ id: 'servers', at: [101.8, 4.6, 1.4], r: 0.9, say: 'Warm in here. Something is nesting on the router.' });
    R.thing(102, 2.4, (ctx, t) => drawBlock(ctx, 100.2, 0.4, 0, 3.4, 4, 2.8, closet.k() > 0.5 ? C.green : (Math.floor(t * 2) % 2 ? C.navy : C.ink), closet.k() > 0.5 ? 'OPEN' : 'SERVERS'), { anim: true });
    R.goose((t) => ({ x: 101.6, y: 4.6, z: 0, dir: 'l', pose: 'sit', hidden: closet.k() < 0.5 }),
      { kind: 'poke', inside: closet, hint: 'The server closet is running warm. Something likes it there.' });

    // The deploy screen, and the sign.
    R.poke({ id: 'deploy', at: [95.4, 8.6, 1.6], r: 0.9, say: (t) => `Deploying. ${deploy(t)}%. Do not touch.` });
    R.thing(95.4, 8.6, (ctx, t) => drawBlock(ctx, 93, 8.4, 0, 5, 0.4, 2.8, C.ink, `DEPLOYING ${deploy(t)}%`), { anim: true });
    block(R, 98.4, 8.4, 2.4, 0.3, 2.4, C.red, 'NO DEPLOYS ON FRIDAYS');

    // The rubber duck, the energy drinks, the plush goose from an old client.
    block(R, 90.6, 14.6, 4, 1.6, 1.15, BLOCK.desk, null);
    pin(R, { id: 'duck', label: 'A rubber duck', at: [91.4, 15.2, 1.4], r: 0.6 }, 1);
    R.thing(93.6, 15.4, (ctx, t) => drawBlock(ctx, 93.2, 15, 1.15, 0.9, 0.9, 0.3 + Math.min(0.9, (H(t) - 8) * 0.08), C.green, 'CANS'), { anim: true });
    pin(R, { id: 'energy', label: 'A pyramid of energy drinks', at: [93.65, 15.45, 2.2], r: 0.7 }, 2);
    block(R, 96, 15, 0.7, 0.7, 0.7, C.white, 'PLUSH', { z: 0 });
    R.decoy({ id: 'plush', at: [96.35, 15.35, 0.9], r: 0.6, say: 'A plush goose from an old client. They went with another agency.' });

    // QA's corner: the bug board (the bear's bug is on it), and Priya on a
    // chair, testing the ceiling.
    const board = R.poke({ id: 'bugs', at: [101.8, 20.8, 1.6], r: 0.9, say: 'BUG #411: coffee machine. BUG #412: see below.' });
    R.thing(101.8, 20.8, (ctx) => drawBlock(ctx, 101.6, 18.8, 0, 0.4, 4, 2.4 + board.k() * 0.1, C.white, board.k() > 0.5 ? 'BUGS (OPEN)' : 'BUG BOARD'), { anim: true });
    pin(R, { id: 'bear-bug', label: 'A bug report about a bear', kind: 'poke', inside: board, at: [101.7, 21.4, 1.4], r: 0.6, hint: 'QA has filed something about the visitor in the lot. It\'s on their board.' }, 3);
    block(R, 99.4, 19.4, 0.8, 0.8, 0.75, BLOCK.chair, null);
    figure(R, 99.8, 19.8, folk(585, { top: C.mustard }), 'QA (ON A CHAIR)', { z: 0.75, pose: 'cheer' });

    // Desks off the front wall, and at bear o'clock the cat video.
    const front = [...pod(R, 91.6, 'front', 3), ...pod(R, 96.4, 'front', 2)];
    staff(R, front, 590, { empty: [2], kinds: ['code', 'code', 'code', 'terminal', 'code', 'email', 'code', (t) => (bearOClock(t) ? 'cat' : 'terminal'), 'terminal', 'code'], each: () => ({ always: dev }) });
    const cat = front[7];
    pin(R, { id: 'cat-video', label: 'A cat video', kind: 'hard', at: [cat.mon[0] + 0.2, cat.mon[1], 2.3], r: 0.6, when: bearOClock, note: 'bear o\'clock',
      riddle: 'Left playing on a screen while its owner watches something bigger.', hint: 'At bear o\'clock one of Dev\'s screens stops pretending to be code.' }, 4);
  },
};
