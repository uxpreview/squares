// UX (greybox): the usability lab at the back (an observation room and a test
// room either side of a one-way mirror, with Inspector Pidge as participant
// 4), a wall of sticky notes, a card sort spread over the floor, a persona
// poster (BRENDA, 42, BUSY) and a real Brenda, and the journey map that runs
// along the spine and out into Dev. Running gag: Pidge has been looking for
// the Buy button since nine; and the sticky notes spread all day.
import { C, folk } from '../../../engine/art.js';
import { block, pin, drawBlock, figure } from '../../greybox.js';
import { TONE, BLOCK, INK } from '../style.js';
import { floorOf, backWall, sill, pod, staff, room } from '../kit.js';
import { bearOClock, H } from '../clock.js';

export default {
  id: 'ux',
  name: 'UX',
  blurb: 'Participant 4 has been looking for the Buy button since nine. The sticky notes are spreading.',
  describe: 'A user research team\'s stretch of an office floor: a lab of two small rooms either side of a one-way mirror, a wall covered in sticky notes, index cards sorted into piles on the floor, a poster of a made-up customer next to a real one, and desks by the windows.',

  build(R) {
    floorOf(R, 72, 88, { floor: TONE.ux, name: 'UX', nameAt: [80, 13.2] });
    backWall(R, 72, 88);
    sill(R, 72, 88);

    // The lab: the observation room (researchers and their sandwiches), the
    // one-way mirror, and the test room, where Pidge is participant 4.
    room(R, 72.4, 0.4, 79.8, 6.8, 'OBSERVATION', { door: 76, table: false });
    block(R, 73.6, 2.6, 4.6, 1.2, 1.15, BLOCK.desk, null);
    figure(R, 74.6, 4.6, folk(570), 'RESEARCHER', { pose: 'sit', dir: 'r', back: true });
    figure(R, 77.2, 4.6, folk(571), null, { pose: 'sit', dir: 'r', back: true });
    const mirror = R.poke({ id: 'mirror', at: [80.1, 3.6, 1.6], r: 0.9, say: 'One-way mirror. Participant 4 is waving at it.' });
    R.thing(80.1, 3.6, (ctx) => drawBlock(ctx, 79.9, 0.6, 0, 0.4, 6, 2.4, mirror.k() > 0.5 ? C.sky : C.grey, mirror.k() > 0.5 ? 'SEE-THROUGH' : 'MIRROR'), { anim: true });
    room(R, 80.4, 0.4, 87.6, 6.8, 'TEST ROOM', { door: 84, table: false });
    block(R, 82.6, 1, 3, 1.2, 1.15, BLOCK.desk, 'BUY BUTTON?');
    figure(R, 84, 2.8, folk(572, { top: C.grey, bottom: C.grey }), 'PARTICIPANT 4', { pose: 'sit', dir: 'l', back: true });
    pin(R, { id: 'pidge', label: 'Inspector Pidge', kind: 'poke', inside: mirror, at: [84, 2.8, 2.2], r: 0.8, hint: 'Participant 4 is a detective. Look through the mirror.' }, 1);

    // The sticky-note wall, spreading by the hour, and the goose drawn on
    // one (a decoy). The wrong-color note turns up at bear o'clock.
    R.thing(76.6, 8.6, (ctx, t) => {
      const k = Math.min(1, Math.max(0, (H(t) - 8.5) / 9));
      drawBlock(ctx, 73, 8.4, 0, 4 + k * 6, 0.3, 2.4, INK.sticky, 'STICKY NOTES');
    }, { anim: true });
    R.poke({ id: 'stickies', at: [75, 8.7, 1.6], r: 0.9, say: 'Insight: users want things.' });
    R.decoy({ id: 'sticky-goose', at: [77.6, 8.7, 2], r: 0.6, say: 'A user persona. Name: Goose. Goals: bread.' });

    // The card sort, and the goose filed under Misc.
    R.rug((ctx) => drawBlock(ctx, 73.4, 14.4, 0, 6.6, 3.8, 0.03, C.white, 'CARD SORT'));
    R.goose([76.8, 16.6, 0], { kind: 'hard', dir: 'l', pose: 'sit', hint: 'Someone sorted a goose into the pile marked Misc.' });

    // Brenda, the persona, and Brenda, the person.
    block(R, 81.6, 14.6, 0.3, 1.6, 2.4, C.white, 'BRENDA, 42, BUSY');
    pin(R, { id: 'brenda', label: 'A persona named Brenda', at: [81.75, 15.4, 1.8], r: 0.7 }, 2);
    figure(R, 83.2, 15.8, folk(573, { top: C.coral }), 'BRENDA', { dir: 'l' });

    // Desks off the front wall: the eye-tracking glasses, and a sticky note
    // in the wrong color on a chair at bear o'clock.
    const front = [...pod(R, 75.6, 'front', 3), ...pod(R, 84.4, 'front', 3)];
    staff(R, front, 575, { empty: [3, 9], texts: ['SURVEY', 'PROTOTYPE', 'NOTES', 'SURVEY', 'PERSONAS', 'NOTES', 'PROTOTYPE', 'HEATMAP', 'NOTES', 'SURVEY', 'PROTOTYPE', 'NOTES'] });
    pin(R, { id: 'eye-tracker', label: 'A pair of eye-tracking glasses', at: [front[6].mon[0] - 0.2, front[6].mon[1] + 0.5, 1.25], r: 0.6 }, 3);
    pin(R, { id: 'wrong-sticky', label: 'A sticky note in the wrong color', kind: 'hard', at: [front[10].x, front[10].y, 0.85], r: 0.6, when: bearOClock, note: 'bear o\'clock',
      riddle: 'One of these is not like the others, on a seat left in a hurry.', hint: 'At bear o\'clock, look on the chairs by UX\'s front windows for a note that isn\'t yellow.' }, 4);
  },
};
