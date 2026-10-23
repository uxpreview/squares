// Leadership (greybox): the quiet end of the floor. The CEO's glass corner
// office (a standing desk that has never stood, a fiddle-leaf fig), the CFO's
// office, the boardroom in the spine (VISION 2030, crossed out), the founder's
// office kept as it was when he "stepped back" to Vermont, and the assistants'
// desks. Running gag: every hour Dana rehearses the pitch to her fig, a slide
// further each time, and the fig droops a little more.
import { C, folk } from '../../../engine/art.js';
import { block, pin, figure, drawBlock, tag } from '../../greybox.js';
import { TONE, BLOCK, INK } from '../style.js';
import { floorOf, backWall, sill, pod, staff, room, worker } from '../kit.js';
import { bearOClock, H } from '../clock.js';
import { SILL } from '../plan.js';

export default {
  id: 'leadership',
  name: 'Leadership',
  blurb: 'Glass offices, a boardroom and a fig that has heard the pitch eleven times. The founder stepped back to Vermont; his office didn\'t.',
  describe: 'The quiet end of an open office floor: the CEO\'s glass corner office with a standing desk and a tall potted fig, the finance director\'s office, a boardroom with a long table, the founder\'s empty office with a putting green, and two rows of assistants\' desks by the windows.',

  build(R) {
    floorOf(R, 0, 16, { floor: TONE.leadership, name: 'LEADERSHIP', nameAt: [8, 13.2] });
    backWall(R, 0, 16, { left: true });
    sill(R, 0, 16);

    // Dana's corner office: the standing desk, the fig, the mug, the lamp.
    room(R, 0.4, 0.4, 7.4, 6.8, 'DANA', { door: 5.6, table: false });
    block(R, 1.2, 1, 2.6, 1.2, 1.15, BLOCK.desk, 'NEVER STOOD');
    const fig = R.poke({ id: 'fig', at: [6.2, 1.6, 1.6], r: 0.9, say: (t) => `Slide ${Math.max(1, Math.floor(H(t) - 7))}. The fig is not convinced.`, teach: true });
    R.thing(6.2, 1.6, (ctx, t) => drawBlock(ctx, 5.7, 1.1, 0, 1, 1, 2.8 - (H(t) - 7) * 0.08, C.green, 'FIG'), { anim: true });
    pin(R, { id: 'mug', label: 'A "World\'s Okayest Boss" mug', at: [3.3, 1.5, 1.3], r: 0.6 }, 1);
    block(R, 1.4, 1.3, 0.3, 0.3, 0.5, C.grey, null, { z: 1.15 });
    R.decoy({ id: 'lamp', at: [1.55, 1.45, 1.8], r: 0.6, say: 'A gooseneck lamp. Close, though.' });

    // The CFO's office: the golden stapler, and his chair, where the letter
    // he hasn't sent waits while he's at the window.
    room(R, 8.6, 0.4, 15.6, 6.8, 'CFO', { door: 12, table: false });
    block(R, 11, 1, 3.4, 1.2, 1.15, BLOCK.desk, null);
    pin(R, { id: 'stapler', label: 'A golden stapler', at: [13.8, 1.5, 1.3], r: 0.6 }, 2);
    worker(R, { x: 12.4, y: 3.2, dir: 'r', side: 'l' }, folk(501, { top: C.grey, bottom: C.ink }), { k: 0.1, window: [12.4, SILL - 1.1], label: 'CFO' });
    pin(R, { id: 'letter', label: 'An unsent resignation letter', kind: 'hard', at: [12.4, 3.2, 0.85], r: 0.6, when: bearOClock, note: 'bear o\'clock',
      riddle: 'Keeping his options open, on the seat he just left.', hint: 'When the bear comes, the money man leaves something on his chair.' }, 3);

    // The boardroom, across the spine from the offices: VISION 2030, crossed
    // out, and the credenza nobody opens.
    room(R, 1, 14.4, 13.4, 19.8, 'BOARDROOM', { door: 8, back: true });
    block(R, 1.4, 14.8, 0.5, 4.6, 2.4, C.white, 'VISION Q4', { z: 0 });
    const credenza = R.poke({ id: 'credenza', at: [12.2, 15.2, 0.8], r: 0.9, say: 'VISION 2030. Do not open until 2030.' });
    R.thing(12.2, 15.4, (ctx) => drawBlock(ctx, 11, 14.8, 0, 2.2, 0.9, 1 + credenza.k() * 0.3, C.wood, credenza.k() > 0.5 ? 'OPEN' : 'CREDENZA'), { anim: true });
    R.goose((t) => ({ x: 12.1, y: 15.3, z: 0, dir: 'l', pose: 'sit', hidden: credenza.k() < 0.5 }),
      { kind: 'poke', inside: credenza, hint: 'The boardroom\'s cupboard has been planning an offsite of its own.' });

    // Walt's office, kept as it was: the putting green, the signed guitar,
    // and his desk drawer.
    room(R, 0.4, 20.4, 7.4, 25.6, 'WALT', { door: 5, back: true, table: false });
    R.rug((ctx) => drawBlock(ctx, 1, 22.6, 0, 4, 2.4, 0.02, C.leaf, null));
    const guitar = R.poke({ id: 'guitar', at: [6.6, 21.2, 1.4], r: 0.8, say: 'Signed by someone called Dave. Walt says Dave was big.' });
    block(R, 6.3, 20.9, 0.6, 0.6, 1.8, C.brown, 'GUITAR');
    const drawer = R.poke({ id: 'drawer', at: [3.2, 21.4, 0.9], r: 0.8, say: 'Walt\'s drawer. He\'ll want this back.' });
    R.thing(3.2, 21.4, (ctx) => drawBlock(ctx, 1.8, 20.9, 0, 2.8, 1.1, 1.15, BLOCK.desk, drawer.k() > 0.5 ? 'DRAWER OPEN' : 'WALT\'S DESK'), { anim: true });
    pin(R, { id: 'toupee', label: 'A toupee', kind: 'poke', inside: drawer, at: [3.2, 21.6, 1.3], r: 0.6, hint: 'The founder left something in his desk drawer that he used to wear.' }, 4);
    void guitar;

    // The assistants' desks by the front windows.
    const front = pod(R, 11.6, 'front', 3);
    staff(R, front, 510, { empty: [2], kinds: ['calendar', 'calendar', 'golf', 'calendar', 'shop', 'calendar'] });
    tag; INK;
  },
};
