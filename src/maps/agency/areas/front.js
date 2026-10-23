// Front of house (greybox): the middle of the floor. The stair arrives in the
// octagon tower at the back (the hero), reception (BACK IN 5 MINUTES, all
// day, and the Courier on the couch with his parcel), the kitchen (the fridge,
// the coffee machine QA broke, a cake for Steve), and at the front the pitch
// room, a glass box set up for Gander Cola. Running gag: NO SIGNAL, since nine;
// and Steve's cake, a slice an hour, though nobody here is called Steve.
import { C, folk, cylinder } from '../../../engine/art.js';
import { block, pin, drawBlock, tag } from '../../greybox.js';
import { TONE, BLOCK, INK, BRAND } from '../style.js';
import { floorOf, backWall, sill, pod, staff, room, worker, drawTower } from '../kit.js';
import { bearOClock, H } from '../clock.js';
import { TOWER, PITCH, SILL, DOOR } from '../plan.js';

export default {
  id: 'front',
  name: 'Front of house',
  blurb: 'Reception is back in five minutes, and has been all day. The pitch room\'s screen says NO SIGNAL.',
  describe: 'The middle of an office floor: an eight-sided stair tower with a pointed roof at the back, a reception desk with nobody at it and a man waiting on the couch, a kitchen with a fridge, a coffee machine and a cake, and a glass pitch room with a long table and a big screen.',

  build(R) {
    floorOf(R, 32, 56, { floor: TONE.front, door: DOOR[0], name: 'FRONT OF HOUSE', nameAt: [37, 13.2] });
    backWall(R, 32, 56);
    sill(R, 32, 56);

    // The stair tower: an octagon (a drum, in the greybox) with a pointed
    // roof, and the call button nobody should press.
    R.thing(TOWER.x + TOWER.r * 0.7, TOWER.y + TOWER.r * 0.7, (ctx, t) => drawTower(ctx, t), { anim: true });
    R.poke({ id: 'call', at: [TOWER.x + 1.6, TOWER.y + TOWER.r + 0.3, 1.3], r: 0.7, say: 'Floors 1 and 2 are closed. Don\'t ask.' });

    // Reception: the desk, the bell (the thing a first visit is nudged to
    // tap), and in the receptionist's chair, the goose, covering.
    block(R, 33, 8.2, 4, 1.2, 1.15, BLOCK.desk, 'BACK IN 5 MINUTES');
    R.poke({ id: 'bell', at: [36.4, 8.8, 1.3], r: 0.8, say: 'Ding. Back in 5 minutes.', teach: true });
    block(R, 33.3, 6.5, 0.8, 0.8, 0.75, BLOCK.chair, null);
    R.goose([33.7, 6.9, 0.75], { kind: 'hard', dir: 'r', hint: 'Somebody is covering reception, and doing a better job than the sign.' });

    // The couch, where the Courier waits all day (day.js), and the earbud in
    // its cushions.
    const couch = R.poke({ id: 'couch', at: [33.8, 15.4, 0.8], r: 0.9, say: 'Crumbs, a pen, forty cents.' });
    R.thing(33.8, 16, (ctx) => drawBlock(ctx, 33.2, 14.4, 0, 1.2, 3.4, 0.8 + couch.k() * 0.1, C.teal, couch.k() > 0.5 ? 'CUSHIONS UP' : 'COUCH'), { anim: true });
    pin(R, { id: 'earbud', label: 'A lost earbud', kind: 'poke', inside: couch, at: [33.8, 15, 0.95], r: 0.6, hint: 'Somebody lost something small down the side of the couch.' }, 1);

    // The kitchen: the counter, the coffee machine, the fridge and its note,
    // the island with Steve's cake, Gander Cola on the counter.
    block(R, 48.6, 0.4, 5.6, 1.2, 1.15, BLOCK.kitchen, 'KITCHEN');
    R.poke({ id: 'coffee', at: [52.4, 1, 1.6], r: 0.8, say: 'OUT OF ORDER. Filed by QA.' });
    block(R, 52, 0.6, 0.8, 0.8, 0.9, C.black, null, { z: 1.15 });
    const fridge = R.poke({ id: 'fridge', at: [55.2, 1.7, 1.4], r: 0.8, say: 'Labeled food only. This means you, Greg.' });
    R.thing(55.2, 1.2, (ctx) => drawBlock(ctx, 54.6, 0.4, 0, 1.2, 1.4, 2.4, C.white, fridge.k() > 0.5 ? 'GANDER COLA' : 'FRIDGE'), { anim: true });
    pin(R, { id: 'note', label: 'A passive-aggressive note', at: [50.4, 1.0, 1.5], r: 0.6 }, 2);
    block(R, 49.6, 3.6, 4.4, 1.6, 1.15, BLOCK.kitchen, 'ISLAND');
    R.thing(51.6, 4.4, (ctx, t) => drawBlock(ctx, 51, 3.9, 1.15, 1.2, 1, 0.4, C.pink, `STEVE ${Math.max(0, 8 - Math.floor(H(t) - 9))}/8`), { anim: true });
    pin(R, { id: 'cake', label: 'A slice of Steve\'s cake', at: [50.2, 4.6, 1.3], r: 0.6 }, 3);
    block(R, 53.4, 3.9, 0.3, 0.3, 0.6, BRAND.can, null, { z: 1.15 });
    R.decoy({ id: 'cola', at: [53.55, 4.05, 1.6], r: 0.6, say: 'A Gander Cola. Wrong kind of gander.' });
    tag; // (the notice board's poster is on the kitchen wall, at the art)

    // The pitch room: long table, the big screen (NO SIGNAL till 3:58), Raj
    // and his cables. At bear o'clock he leaves the adapter that works on the
    // table.
    room(R, PITCH[0], PITCH[1], PITCH[2], PITCH[3], 'PITCH ROOM', { door: 47.7, back: true, table: false });
    block(R, 43, 21.6, 9.4, 2, 1.15, BLOCK.wood, 'PITCH TABLE');
    R.thing(40.6, 22, (ctx, t) => {
      const on = H(t) >= 15.97 && H(t) < 17.3;
      drawBlock(ctx, 40.4, 20.2, 0, 0.3, 3.6, 2.6, on ? C.red : C.ink, on ? 'GANDER COLA' : 'NO SIGNAL');
    }, { anim: true });
    worker(R, { x: 41.8, y: 22.6, dir: 'l', side: 'r' }, folk(540, { top: C.teal }), { k: 0.05, pose: 'stand', window: [42.4, SILL], label: 'RAJ (IT)' });
    pin(R, { id: 'adapter', label: 'An adapter that works', kind: 'hard', at: [44, 22.6, 1.3], r: 0.6, when: bearOClock, note: 'bear o\'clock',
      riddle: 'The one everyone\'s been looking for since nine.', hint: 'When the bear comes, the IT man puts down what he was holding on the big table.' }, 4);

    // A peninsula of desks by the front windows, west of the pitch room.
    staff(R, pod(R, 36, 'front', 3), 545, { empty: [3], kinds: ['email', 'sheet', 'email', 'shop', 'email', 'calendar'] });
  },
};
