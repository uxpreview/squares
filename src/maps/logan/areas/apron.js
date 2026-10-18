// The Apron (greybox): outside the gates. Planes nosed in to C13 and C14 on
// their jet bridges (C12's is Flight 1, on the map's clock: day.js), belt
// loaders, a fuel truck, the catering truck lifting its box, the marshaller;
// at the left end the de-icing pad and its two trucks. The bag trains run
// along the service road at the front. Running gags: the marshaller guides
// everything in with full ceremony, and after dark a plane is sprayed orange,
// waits, and is sprayed again.
import { C, folk } from '../../../engine/art.js';
import { ground, block, pin, figure, drawBlock } from '../../greybox.js';
import { TONE, BLOCK, INK, line, run } from '../style.js';
import { plane } from '../kit.js';
import { AIR, FRONT, CHECK, W, GATES, NOSE, PLANE, ROAD } from '../plan.js';
import { dark } from '../clock.js';

export default {
  id: 'apron',
  name: 'The Apron',
  blurb: 'Planes at the gates, bags going into the wrong one, and a marshaller who waves everything in. After dark, the de-icers paint the planes orange.',
  describe: 'The concrete outside the gates: planes nosed in to jet bridges, bag carts, a fuel truck, a catering truck lifting its box to a door, and a marshaller with orange wands. At one end, a de-icing pad with two trucks on long booms. Snow builds up after dark, and the de-icers spray the planes orange.',

  build(R) {
    ground(R, { floor: TONE.apron, grid: 4, name: 'THE APRON', nameAt: [46, 46.6] });
    R.rug((ctx) => {
      // Lead-in lines to each gate, the service road, the de-icing pad's box.
      for (const x of Object.values(GATES)) line(ctx, x - 0.1, NOSE, 0.2, FRONT - NOSE - 2, INK.signal);
      line(ctx, CHECK, ROAD - 0.9, W - CHECK, 1.8, TONE.road);
      for (const [x, y, w, d] of [[33, 33, 18, 0.15], [33, 44.4, 18, 0.15], [33, 33, 0.15, 11.5], [50.9, 33, 0.15, 11.5]]) line(ctx, x, y, w, d, INK.safety);
    });

    // Jet bridges from the gates' glass to the planes' doors.
    for (const x of Object.values(GATES)) run(R, x - 0.8, AIR, 1.6, NOSE - AIR + 0.4, 1.3, BLOCK.wall, null, { z: 1.4 });
    // The planes at C13 and C14 (C12's is Flight 1, drawn by the map's clock).
    plane(R, GATES.C13, NOSE, { livery: 'jetblew' });
    plane(R, GATES.C14, NOSE, { livery: 'northeast' });

    // The hold of C14's plane: the goose is in it, on the bags.
    const hold = R.poke({ id: 'hold', at: [GATES.C14 + 1.7, NOSE + 4.6, 1.2], r: 0.9, say: 'Something in here is honking.' });
    R.thing(GATES.C14 + 1.6, NOSE + 4.6, (ctx) => drawBlock(ctx, GATES.C14 + PLANE.body / 2, NOSE + 3.6, 0.7, 0.2 + hold.k() * 1.2, 1.8, 1.2, C.grey, 'HOLD'), { anim: true });
    R.goose((t) => ({ x: GATES.C14 + 2.6, y: NOSE + 4.8, z: 0.6, dir: 'r', pose: 'sit', hidden: hold.k() < 0.5 }),
      { kind: 'poke', inside: hold, hint: 'One plane\'s hold is honking.' });
    // A belt loader up to it, and a gull on a wing: not the goose.
    block(R, GATES.C14 + 3.4, NOSE + 1, 1.2, 4, 0.9, BLOCK.vehicle, 'LOADER');
    R.decoy({ id: 'gull', at: [GATES.C13 - 4.6, NOSE + 7.4, 1.9], r: 0.8, say: 'A gull, flying standby.' });
    block(R, GATES.C13 - 5, NOSE + 7, 0.8, 0.8, 0.4, C.white, 'GULL', { z: 1.45 });

    // The catering truck, its box raised to C13's door, and the stowaway eating the meals.
    block(R, GATES.C13 + 2.6, NOSE + 0.6, 2.4, 3.6, 1.2, C.white, 'CATERING');
    const meals = R.poke({ id: 'catering', at: [GATES.C13 + 3.8, NOSE + 2.2, 3], r: 0.9, say: 'Is that somebody eating in there?' });
    R.thing(GATES.C13 + 3.8, NOSE + 2.4, (ctx) => drawBlock(ctx, GATES.C13 + 2.7, NOSE + 0.8, 2.2, 2.2, 3, 1.4 - meals.k() * 0.9, BLOCK.wall, meals.k() > 0.5 ? null : 'MEALS'), { anim: true });
    pin(R, { id: 'stowaway', label: 'A stowaway', kind: 'poke', inside: meals, at: [GATES.C13 + 3.8, NOSE + 2.2, 3.6], r: 0.8, hint: 'The catering box is eating its own meals.' }, 1);

    // The pilot doing the walkaround in slippers, by C13's plane.
    figure(R, GATES.C13 - 3.4, NOSE + 11.4, folk(230, { top: C.navy }), 'SLIPPERS');
    pin(R, { id: 'pilot', label: 'A pilot in slippers', at: [GATES.C13 - 3.4, NOSE + 11.4, 2.8], r: 0.9 }, 2);

    // A bag cart parked for the wrong plane, the wedding dress on top.
    block(R, 84.6, 43.4, 3, 1.8, 0.9, C.grey, 'WRONG PLANE');
    block(R, 85.4, 43.8, 1.4, 1, 0.3, C.white, null, { z: 0.9 });
    pin(R, { id: 'dress', label: 'A wedding dress', at: [86.1, 44.3, 1.6], r: 0.8 }, 3);
    block(R, 101.2, NOSE, 2.4, 4, 1.6, BLOCK.vehicle, 'FUEL');

    // The marshaller, waving in whatever comes.
    figure(R, 56, 44, folk(231, { top: INK.safety }), 'MARSHALLER', { pose: 'cheer' });
    // A tug driver asleep (the thing a first visit is nudged to tap).
    block(R, 69, 43.6, 2, 1.4, 1, BLOCK.vehicle, 'TUG');
    R.poke({ id: 'tug', at: [70, 44.3, 1.6], r: 0.9, say: 'Five more minutes.', teach: true });

    // The de-icing pad: two trucks on booms, and the snowman built on the night shift.
    for (const x of [36, 46]) {
      block(R, x, 35, 2.4, 3.6, 1.6, BLOCK.safety, x === 36 ? 'DE-ICER' : null);
      block(R, x + 0.8, 36, 0.6, 0.6, 3.6, C.grey, null, { z: 1.6 });
    }
    R.thing(41.6, 42.2, (ctx, t) => { if (dark(t)) drawBlock(ctx, 41, 41.6, 0, 1.2, 1.2, 1.8, C.white, 'SNOWMAN'); }, { anim: true });
    pin(R, { id: 'snowman', label: 'A snowman in a safety vest', kind: 'hard', when: dark, note: 'after dark', at: [41.6, 42.2, 1.6], r: 0.8, riddle: 'Built on the night shift.', hint: 'Somebody at the de-icing pad had time on their hands after dark.' }, 4);
  },
};
