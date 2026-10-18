// Security (greybox): the checkpoint, roof off. The line and the grey trays at
// the back, two X-ray belts running forward with a monitor each (the level's
// hero toy: tap one and it shows what's in its tunnel now), the body scanner
// between them, the shoes-off bench and the bin of things that aren't coming
// back. Running gag: the man in the scanner, hands up since 6am.
import { C, folk } from '../../../engine/art.js';
import { ground, block, pin, figure, drawBlock } from '../../greybox.js';
import { TONE, BLOCK, INK, line, run } from '../style.js';
import { LAND, CHECK, SEC } from '../plan.js';

// What's in each X-ray's tunnel right now: a new bag every few seconds.
const BAGS = ['SOCKS', 'A LOAF OF BREAD', 'TWELVE SHAMPOOS', 'A TURKEY', 'A SNOW GLOBE', 'ANOTHER TURKEY', 'A TUBA MUTE', 'A SWORD?'];
const inTunnel = (t, lane) => BAGS[Math.floor(t / 4 + lane * 3) % BAGS.length];

export default {
  id: 'security',
  name: 'Security',
  blurb: 'Shoes off, laptops out, turkeys on the X-ray. One man has had his hands up since six.',
  describe: 'A security checkpoint with its roof off: a line, stacks of grey trays, two X-ray belts with screens, a body scanner between them, a bench for putting shoes back on, and a bin of things that are not coming back. A man stands in the scanner with his hands up all day.',

  build(R) {
    ground(R, { floor: TONE.hall, grid: 2, name: 'SECURITY', nameAt: [37, 28.6] });
    R.rug((ctx) => {
      for (let i = 0; i < 3; i++) line(ctx, CHECK + 2, 13.6 + i * 1, 17, 0.08, INK.cranberry);
      line(ctx, CHECK + 1, 24.6, SEC - CHECK - 2, 0.1, INK.signal);
    });
    run(R, CHECK, LAND, SEC - CHECK, 0.4, 1.1, BLOCK.wall, null);

    // The line.
    [[33, 13.5], [36, 13.5], [39, 13.5], [42, 13.5], [46, 14.5], [43, 14.5], [40, 14.5], [36.5, 14.5], [34, 15.5], [38, 15.5]]
      .forEach(([x, y], i) => figure(R, x, y, folk(110 + i), null, { dir: i < 4 || i > 7 ? 'r' : 'l' }));
    // The trays, stacked taller all day, and the tray table.
    R.thing(31.6, 17.5, (ctx, t) => drawBlock(ctx, 31, 17, 0, 1.2, 1, 0.8 + ((t / 30) % 1) * 1.6, C.grey, 'TRAYS'), { anim: true });
    block(R, 30.8, 20.4, 2.4, 1.2, 0.9, BLOCK.desk, null);
    pin(R, { id: 'hot-sauce', label: 'A tiny bottle of hot sauce', kind: 'hard', at: [31.8, 21, 1.05], r: 0.6, riddle: 'Under three ounces, technically.', hint: 'Somebody packed a sock with something spicy on the tray table.' }, 1);

    // Two X-ray belts, running forward, each with its tunnel and its monitor.
    const lanes = [36.4, 45.2].map((x, lane) => {
      run(R, x, 17.4, 1.6, 7.2, 0.8, BLOCK.belt, null);
      block(R, x - 0.3, 19.6, 2.2, 2.2, 2, BLOCK.machine, lane ? null : 'X-RAY');
      const mx = lane ? x + 2.6 : x - 1, scr = R.poke({ id: `xray-${lane ? 'b' : 'a'}`, at: [mx, 20.7, 1.9], r: 0.9, say: (t) => `On the screen: ${inTunnel(t, lane).toLowerCase()}.`, hold: 4 });
      R.thing(mx, 20.7, (ctx, t) => {
        drawBlock(ctx, mx - 0.4, 20.3, 1.2, 0.8, 0.2, 1 + scr.k() * 0.2, scr.k() > 0.5 ? C.tealLight : C.ink, scr.k() > 0.5 ? inTunnel(t, lane) : 'SCREEN');
      }, { anim: true });
      block(R, mx - 0.4, 20.3, 0.8, 0.8, 1.2, C.grey, null);
      return scr;
    });
    // The turkey, on the first monitor (when it's in the tunnel, so: open it and look).
    pin(R, { id: 'turkey', label: 'A frozen turkey', kind: 'poke', inside: lanes[0], at: [35.4, 20.7, 2.6], r: 0.8, hint: 'One of the X-ray screens is showing dinner.' }, 2);

    // The body scanner between the belts, and the man inside it, hands up since six.
    block(R, 40.6, 21.2, 0.4, 2, 2.6, BLOCK.machine, 'SCANNER');
    block(R, 43.4, 21.2, 0.4, 2, 2.6, BLOCK.machine, null);
    figure(R, 42.2, 22.2, folk(130), null, { pose: 'cheer' });
    pin(R, { id: 'hands-up', label: 'Someone with their hands up', at: [42.2, 22.2, 3.1], r: 0.9 }, 3);

    // The skier, being wanded in ski boots.
    figure(R, 47.6, 26.2, folk(131, { top: C.mustard }), 'SKI BOOTS');
    figure(R, 49.2, 26.6, folk(132, { top: C.navy }), null, { dir: 'l', pose: 'point' });
    pin(R, { id: 'skier', label: 'The skier', after: 'curb:skis', at: [47.6, 26.2, 2.8], r: 0.9, riddle: 'Tag: Salt Lake City. Clunks when he walks.' }, 4);

    // The bench for shoes, and the pile of them the goose is nesting in.
    run(R, 31, 26.2, 4.4, 1, 0.5, C.wood, 'SHOES BACK ON');
    const shoes = R.poke({ id: 'shoes', at: [33.4, 28, 0.5], r: 0.9, say: 'Forty pairs, and one is honking.' });
    R.thing(33.4, 28, (ctx) => drawBlock(ctx, 32.4, 27.4, 0, 2, 1.2, 0.7 - shoes.k() * 0.4, C.brown, 'SHOES'), { anim: true });
    R.goose((t) => ({ x: 33.6, y: 28.2, z: 0, dir: 'r', pose: 'sit', hidden: shoes.k() < 0.5 }),
      { kind: 'poke', inside: shoes, hint: 'Somebody\'s shoes are honking.' });

    // The bin of things that aren't coming back (the thing a first visit is nudged to tap).
    block(R, 49.4, 22.4, 1.6, 1.4, 1, C.grey, 'NOT COMING BACK');
    R.poke({ id: 'bin', at: [50.2, 23.1, 1.2], r: 0.9, say: 'Not one of these is coming back.', teach: true });
    // A sniffer dog, and the poster: not the goose.
    block(R, 47.6, 18.6, 1.2, 0.6, 0.7, C.brown, 'DOG');
    block(R, 50.8, 13.4, 0.2, 1, 1.4, C.white, 'WANTED', { z: 1.6 });
    R.decoy({ id: 'poster', at: [50.9, 13.9, 2.3], r: 0.8, say: 'A poster. Even she looks guilty.' });
  },
};
