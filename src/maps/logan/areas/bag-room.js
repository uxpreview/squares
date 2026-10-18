// The Bag Room (greybox): where the bags go, airside of check-in. The belt
// comes through the flaps from the counters into the sorting loop; handlers
// load the carts that the bag trains take to the planes. The jam at the merge,
// the lost-and-found cage, a pet crate. Running gags: the pink bag that rides
// the loop all day and nobody claims, and the handler who throws every bag
// marked FRAGILE the hardest.
import { C, folk } from '../../../engine/art.js';
import { ground, block, pin, figure, drawBlock } from '../../greybox.js';
import { TONE, BLOCK, INK, run } from '../style.js';
import { AIR } from '../plan.js';

// The sorting loop: a rectangle of belt, gone round at a walking pace.
const LOOPBOX = [6, 33.6, 24, 39.4];
const PERIM = 2 * (LOOPBOX[2] - LOOPBOX[0] + LOOPBOX[3] - LOOPBOX[1]);
function onLoop(t, offset, speed = 1.1) {
  const [x0, y0, x1, y1] = LOOPBOX, a = x1 - x0, b = y1 - y0;
  let s = (((t * speed + offset) % PERIM) + PERIM) % PERIM;
  if (s < a) return [x0 + s, y0];
  s -= a; if (s < b) return [x1, y0 + s];
  s -= b; if (s < a) return [x1 - s, y1];
  s -= a; return [x0, y1 - s];
}
// The FRAGILE bag's flight, from the handler to the cart, every six seconds.
function thrown(t) {
  const k = ((t % 6) + 6) % 6 / 6;
  const u = Math.min(1, k * 1.6);
  return [12 + u * 6, 42.4 + u * 2.6, 0.9 + Math.sin(u * Math.PI) * 2.6];
}

export default {
  id: 'bag-room',
  name: 'The Bag Room',
  blurb: 'Where your bag goes when you hand it over. One pink bag has been round the loop since breakfast.',
  describe: 'A big room of belts under the terminal: bags pour in through rubber flaps and ride a loop while handlers sort them onto carts. A supervisor whacks a jam at the merge. A wire cage holds the lost and found. One bright pink bag rides the loop all day.',

  build(R) {
    ground(R, { floor: TONE.bags, grid: 2, name: 'THE BAG ROOM', nameAt: [14, 47] });

    // The belt from the counters, and the sorting loop.
    block(R, 25.9, AIR, 1.1, 3.6, 0.6, BLOCK.belt, null);
    const [x0, y0, x1, y1] = LOOPBOX;
    for (const [x, y, w, d] of [[x0 - 0.6, y0 - 0.6, x1 - x0 + 1.2, 1.2], [x0 - 0.6, y1 - 0.6, x1 - x0 + 1.2, 1.2], [x0 - 0.6, y0 + 0.6, 1.2, y1 - y0 - 1.2], [x1 - 0.6, y0 + 0.6, 1.2, y1 - y0 - 1.2]]) {
      run(R, x, y, w, d, 0.6, BLOCK.belt, null, { step: 2 });
    }
    run(R, x0 + 3, y0 + 1.6, x1 - x0 - 6, y1 - y0 - 3.2, 0.3, C.greyLight, 'SORTING');

    // Bags riding the loop, the pink one among them, and the hunting decoy someone checked.
    for (let i = 0; i < 7; i++) {
      const off = i * (PERIM / 7.3);
      R.mover((t) => { const [x, y] = onLoop(t, off); return { x, y }; },
        (ctx, t, p) => drawBlock(ctx, p.x - 0.5, p.y - 0.35, 0.6, 1, 0.7, 0.6, [C.navy, C.grey, C.teal, C.brown][i % 4], null));
    }
    R.mover((t) => { const [x, y] = onLoop(t, 13); return { x, y }; }, (ctx, t, p) => drawBlock(ctx, p.x - 0.55, p.y - 0.4, 0.6, 1.1, 0.8, 0.7, C.pink, 'PINK BAG'));
    R.mover((t) => { const [x, y] = onLoop(t, 30); return { x, y }; }, (ctx, t, p) => drawBlock(ctx, p.x - 0.5, p.y - 0.3, 0.6, 1, 0.6, 0.5, C.white, 'DECOY'));
    R.decoy({ id: 'hunting-decoy', at: (t) => { const [x, y] = onLoop(t, 30); return [x, y, 1.1]; }, r: 0.8, say: 'A hunting decoy. Literally a decoy.' });
    // The tuba, riding the loop in its case.
    R.mover((t) => { const [x, y] = onLoop(t, 46); return { x, y }; }, (ctx, t, p) => drawBlock(ctx, p.x - 0.8, p.y - 0.5, 0.6, 1.6, 1, 0.9, C.black, 'TUBA'));
    pin(R, { id: 'tuba', label: 'A tuba', at: (t) => { const [x, y] = onLoop(t, 46); return [x, y, 1.6]; }, r: 0.9 }, 1);

    // The jam at the merge, and the supervisor whacking it (the thing a first visit is nudged to tap).
    block(R, 24.6, 33, 1.6, 1.4, 1.2, C.coral, 'JAM');
    figure(R, 27.6, 34.6, folk(200, { top: INK.safety }), 'WHACK', { pose: 'point', dir: 'l' });
    R.poke({ id: 'jam', at: [25.4, 33.7, 1.4], r: 0.9, say: 'WHACK. That did it.', teach: true });

    // Handlers loading the carts, the one who throws FRAGILE, and the bag in the air.
    for (const [x, y, s] of [[10.6, 42, 210], [21, 43.6, 211], [24, 41.6, 212]]) figure(R, x, y, folk(s, { top: INK.safety }), null);
    figure(R, 11.6, 42.2, folk(213, { top: INK.safety }), 'THROWS FRAGILE', { pose: 'cheer' });
    R.mover((t) => { const [x, y, z] = thrown(t); return { x, y, z }; }, (ctx, t, p) => drawBlock(ctx, p.x - 0.5, p.y - 0.35, p.z, 1, 0.7, 0.6, C.mustard, 'FRAGILE'));
    pin(R, { id: 'fragile', label: 'A bag marked fragile', at: (t) => { const [x, y, z] = thrown(t); return [x, y, z + 0.4]; }, r: 0.9 }, 2);
    for (let i = 0; i < 3; i++) block(R, 16 + i * 3.4, 44.8, 2.8, 1.8, 0.9, C.grey, i === 0 ? 'CARTS' : null);

    // False teeth, fallen out of somebody's bag under the loop.
    pin(R, { id: 'teeth', label: 'A set of false teeth', kind: 'hard', at: [20.4, 40.8, 0.1], r: 0.6, riddle: 'Somebody\'s Thanksgiving is going to be quiet.', hint: 'Look on the floor just in front of the loop.' }, 3);

    // A pet crate, very cross.
    const crate = R.poke({ id: 'crate', at: [4.6, 36.4, 0.8], r: 0.8, say: 'Hsssss.' });
    R.thing(4.6, 36.4, (ctx) => drawBlock(ctx, 3.8, 35.8, 0, 1.6, 1.2, 1 - crate.k() * 0.4, C.wood, 'CRATE'), { anim: true });
    pin(R, { id: 'cat', label: 'A cat', kind: 'poke', inside: crate, at: [4.6, 36.4, 1.2], r: 0.7, hint: 'Something in a crate by the loop is not happy about flying.' }, 4);

    // The lost-and-found cage: everything nobody came back for since 1987, and the goose.
    run(R, 1, 40.6, 6.6, 0.3, 2, C.grey, 'LOST + FOUND');
    run(R, 1, 40.9, 0.3, 5.4, 2, C.grey, null);
    const cage = R.poke({ id: 'cage', at: [4.6, 44.6, 1.2], r: 1, say: 'Unclaimed since 1987.' });
    R.thing(4.6, 46.4, (ctx) => drawBlock(ctx, 1.4, 46.2, 0, 6.2, 0.3, 2 - cage.k() * 1.6, C.grey, null), { anim: true });
    R.goose((t) => ({ x: 4.2, y: 43.8, z: 0.6, dir: 'r', pose: 'sit', hidden: cage.k() < 0.5 }),
      { kind: 'poke', inside: cage, hint: 'Unclaimed, and quite happy about it.' });
    block(R, 2, 42, 4, 2.6, 0.6, C.mustard, null);
  },
};
