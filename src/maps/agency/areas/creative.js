// Creative (greybox): mood boards, a wall of rejected logos, the photo set for
// the mascot shoot (a paper backdrop, lights, a stool, TALENT: GOOSE) with
// Kyle the intern in a goose costume as the stand-in, a ping-pong table nobody
// may use until the pitch is done, and Theo kerning GANDER. Running gag: the
// photographer waits all day for the talent; and the kerning, nudged and
// nudged back every hour. Under its front edge, on floor two, Gary's window is
// lit all day: nobody told him about the reorg.
import { C, folk } from '../../../engine/art.js';
import { block, pin, drawBlock, figure } from '../../greybox.js';
import { TONE, INK } from '../style.js';
import { floorOf, backWall, sill, pod, staff } from '../kit.js';
import { bearOClock, H } from '../clock.js';

export default {
  id: 'creative',
  name: 'Creative',
  blurb: 'The photo set is ready for the talent, a goose. Kyle the intern is filling in.',
  describe: 'A design studio\'s stretch of an office floor: desks by the windows, a wall of pinned-up logos, a photo set with a paper backdrop, lights and a stool where an intern in a goose costume sits, a ping-pong table, and a designer at a huge screen moving one letter back and forth.',

  build(R) {
    floorOf(R, 56, 72, { floor: TONE.creative, lit: [64.6], name: 'CREATIVE', nameAt: [64, 13.2] });
    backWall(R, 56, 72);
    sill(R, 56, 72);

    // Desks off the back wall, and between them the wall of rejected logos.
    staff(R, pod(R, 59.4, 'back', 2), 550, { kinds: ['mood', 'mood', 'helvetica', 'mood'] });
    staff(R, pod(R, 68.6, 'back', 2), 555, { empty: [2], kinds: ['logo', 'logo', 'logo', 'logo'] });
    block(R, 62.6, 0.4, 3, 0.3, 2.4, C.white, 'REJECTED LOGOS');
    pin(R, { id: 'logo', label: 'A rejected logo', at: [64.1, 0.6, 1.9], r: 0.7 }, 1);

    // The photo set: the backdrop's drape (the goose is under it), lights,
    // the stool, and Kyle in the goose costume, a decoy.
    block(R, 56.6, 6.4, 6.4, 0.4, 3.6, C.white, 'BACKDROP');
    R.rug((ctx) => drawBlock(ctx, 56.8, 6.8, 0, 6, 3.4, 0.02, C.white, null));
    const drape = R.poke({ id: 'drape', at: [57.8, 7.6, 0.6], r: 0.9, say: 'Something under the drape is honking.' });
    R.thing(57.8, 7.6, (ctx) => drawBlock(ctx, 57, 7, 0, 1.6, 1.2, 0.9 - drape.k() * 0.6, C.greyLight, drape.k() > 0.5 ? null : 'DRAPE'), { anim: true });
    R.goose((t) => ({ x: 57.8, y: 7.7, z: 0, dir: 'r', pose: 'sit', hidden: drape.k() < 0.5 }),
      { kind: 'poke', inside: drape, hint: 'The talent showed up after all. It\'s hiding on the set.' });
    block(R, 62.4, 9.2, 0.5, 0.5, 2.6, C.black, 'LIGHT');
    R.poke({ id: 'strobe', at: [62.65, 9.45, 2.8], r: 0.8, say: 'Flash! Kyle blinked.' });
    block(R, 59.6, 8.8, 0.7, 0.7, 0.8, C.wood, null);
    figure(R, 60, 9.2, folk(560, { top: C.white, bottom: C.white }), 'KYLE (GOOSE SUIT)', { pose: 'sit', z: 0.8 });
    R.decoy({ id: 'kyle', at: [60, 9.2, 2.1], r: 0.8, say: 'That\'s Kyle. He\'s been in that suit since nine.' });
    block(R, 61.4, 10.4, 0.3, 1.2, 1.4, INK.sticky, 'TALENT: GOOSE');
    figure(R, 63.6, 11, folk(561, { top: C.ink }), 'PHOTOGRAPHER', { dir: 'l' });

    // The ping-pong table nobody may use, and the skateboard.
    R.poke({ id: 'pingpong', at: [67, 16, 1], r: 0.9, say: 'Not until after the pitch.' });
    block(R, 64.6, 14.6, 4.8, 2.6, 0.9, C.green, 'PING-PONG');
    pin(R, { id: 'skateboard', label: 'A skateboard', at: [70.8, 16.4, 0.15], r: 0.7 }, 2);
    block(R, 70.2, 16.1, 1.2, 0.5, 0.15, C.coral, null);

    // Desks off the front wall: Theo kerning (the art director moves it back
    // every hour), a Pantone swatch, and at bear o'clock the screen with the
    // forbidden font.
    const front = [...pod(R, 59.6, 'front', 3), ...pod(R, 68.4, 'front', 3)];
    staff(R, front, 565, { empty: [6, 10], kinds: [
      'mood', 'kern', 'mood', 'photos', 'helvetica', 'photos',
      'mood', 'logo', 'mood', (t) => (bearOClock(t) ? 'comic' : 'helvetica'), 'mood', 'photos',
    ] });
    pin(R, { id: 'pantone', label: 'A Pantone swatch', at: [front[4].mon[0] + 0.1, front[4].mon[1] + 0.5, 1.2], r: 0.6 }, 3);
    const cs = front[9];
    pin(R, { id: 'comic-sans', label: 'A document in Comic Sans', kind: 'hard', at: [cs.mon[0] + 0.2, cs.mon[1], 2.3], r: 0.6, when: bearOClock, note: 'bear o\'clock',
      riddle: 'The forbidden font, out while its owner looks at the bear.', hint: 'At bear o\'clock one of Creative\'s screens shows something nobody is supposed to use.' }, 4);
  },
};
