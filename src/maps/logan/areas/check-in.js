// Check-in (greybox): the ticketing hall, roof off, walls low. The queue
// snakes through the rope maze from the curb's doors to the counters; behind
// the counters the bag belt runs along the hall and turns forward through the
// flaps into the bag room. Our Lady of the Airways, the chapel, in the front
// corner. Running gag: the man at the scale, two pounds over, wearing more of
// his clothes every hour.
import { C, folk } from '../../../engine/art.js';
import { ground, block, pin, figure, drawBlock } from '../../greybox.js';
import { TONE, BLOCK, INK, line, run } from '../style.js';
import { LAND, AIR, CHECK } from '../plan.js';
import { hour } from '../clock.js';

export default {
  id: 'check-in',
  name: 'Check-in',
  blurb: 'The queue goes out the door and the kiosks can\'t help. One man is two pounds over and wearing the difference.',
  describe: 'A ticketing hall with its roof off: a long queue snaking through a rope maze to a row of counters, bag scales, kiosks, and a belt carrying bags away behind the counters. A small chapel in one corner. The queue grows all day, and one man at a scale puts on more and more clothes.',

  build(R) {
    ground(R, { floor: TONE.hall, grid: 2, name: 'CHECK-IN', nameAt: [8, 28.6] });
    R.rug((ctx) => {
      // The rope maze, five rows.
      for (let i = 0; i < 5; i++) line(ctx, 5, 13.9 + i * 0.95, 19, 0.08, INK.cranberry);
      // The carpet in the chapel.
      line(ctx, 0.6, 23.6, 6, 5.8, TONE.terminal);
    });
    // The low wall on the curb side, with its doors, and the airside one.
    for (const [x0, x1] of [[0, 3], [6, 17], [20, CHECK]]) run(R, x0, LAND, x1 - x0, 0.4, 1.1, BLOCK.wall, null);

    // The counters, the agents behind them, the belt behind them.
    run(R, 4, 19.4, 20, 1, 1.1, BLOCK.desk, 'COUNTERS', { step: 2 });
    for (let x = 6; x < 24; x += 4) figure(R, x, 21.2, folk(60 + x), null, { dir: 'l', back: true });
    run(R, 3, 22.4, 24, 1.1, 0.6, BLOCK.belt, 'BELT');
    run(R, 25.9, 23.5, 1.1, AIR - 23.5, 0.6, BLOCK.belt, null);
    block(R, 25.6, AIR - 0.6, 1.7, 0.5, 1.6, C.ink, 'FLAPS');

    // The queue: a crowd in the rope maze, growing by the hour, and the goose in it.
    const crowd = [[6, 14.4], [8.5, 14.4], [11, 14.4], [13.5, 14.4], [19, 14.4], [22, 15.4], [19.5, 15.4], [14, 15.4], [9, 15.4],
      [7, 16.3], [12, 16.3], [18, 17.2], [10, 17.2], [6.5, 18.1]];
    crowd.forEach(([x, y], i) => figure(R, x, y, folk(70 + i), null, { dir: i % 2 ? 'l' : 'r' }));
    R.goose([16.2, 16.3, 0], { dir: 'l', kind: 'hard', hint: 'It\'s been in line since five, like everyone else.' });
    // A goose-shaped neck pillow on one of them: not the goose.
    R.decoy({ id: 'pillow', at: [11, 14.4, 2.3], r: 0.7, say: 'A neck pillow. Goose-shaped, sadly.' });

    // Grandma, back in line for the third time with an empty roasting pan.
    figure(R, 22, 16.3, folk(90, { hair: C.greyLight }), 'GRANDMA');
    block(R, 21.4, 16.8, 1.2, 0.8, 0.3, C.grey, null, { z: 1.2 });
    pin(R, { id: 'grandma', label: 'The turkey\'s owner', after: 'security:turkey', at: [22, 16.3, 2.7], r: 0.9, riddle: 'On the X-ray: a 22-pound turkey, basted.' }, 1);

    // The man at the scale: two pounds over, putting on a layer an hour.
    R.thing(9.6, 18.6, (ctx, t) => {
      const layers = Math.max(0, Math.floor(hour(t) - 5));
      drawBlock(ctx, 9.1, 18.2, 0, 1, 1, 1.2 + Math.min(layers, 14) * 0.06, C.coral, layers ? `${layers} LAYERS` : 'THE SCALE');
    }, { anim: true });
    const bag = R.poke({ id: 'scale-bag', at: [11.2, 18.9, 0.9], r: 0.8, say: 'Two pounds over.' });
    R.thing(11.2, 18.9, (ctx) => drawBlock(ctx, 10.6, 18.5, 0.4, 1.2, 0.8, 0.6 + bag.k() * 0.4, C.navy, 'SCALE'), { anim: true });
    pin(R, { id: 'underpants', label: 'A pair of lucky underpants', kind: 'poke', inside: bag, at: [11.2, 18.9, 1.6], r: 0.7, hint: 'The bag on the scale has one more thing he could wear.' }, 2);

    // The kiosks nobody can work (the thing a first visit is nudged to tap), and a passport under one.
    for (let y = 14; y < 18; y += 1.6) block(R, 27, y, 0.8, 1, 1.5, BLOCK.machine, y === 14 ? 'KIOSKS' : null);
    R.poke({ id: 'kiosk', at: [27.4, 15.1, 1.3], r: 0.9, say: 'Please see an agent.', teach: true });
    pin(R, { id: 'passport', label: 'A lost passport', kind: 'hard', at: [28.4, 17.6, 0.1], r: 0.6, riddle: 'Dropped where the machines aren\'t helping.', hint: 'Look down by the kiosks.' }, 3);

    // Our Lady of the Airways: the chapel, in the front corner.
    for (const [x, y, w, d] of [[0.4, 23.2, 6.6, 0.3], [6.7, 23.2, 0.3, 2.6], [6.7, 27.6, 0.3, 2.2]]) run(R, x, y, w, d, 1.3, BLOCK.wall, null);
    block(R, 1, 23.6, 1.6, 0.6, 1.1, C.woodLight, 'CHAPEL');
    R.poke({ id: 'chapel', at: [6.85, 26.7, 1.2], r: 0.8, say: 'Quiet, please. Someone wants row one.' });
    for (const [x, y] of [[2.5, 26], [4.5, 26]]) block(R, x - 0.8, y, 1.6, 0.5, 0.5, C.wood, null);
    figure(R, 3.6, 27.4, folk(95), null, { pose: 'sit', back: true });
    pin(R, { id: 'praying', label: 'Someone praying for an upgrade', at: [3.6, 27.4, 1.9], r: 0.9 }, 4);
  },
};
