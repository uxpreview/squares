// The Wedding Field (greybox): the tent in the big lawn north of the barn and
// the house, the woods behind it (its sides down by day, rolled up at six,
// string lights at night), the cake table, the ice swan, the hen coop by the
// house at the field's edge with its hens out on the lawn, the caterers'
// truck, the band, the bar, the row of portable toilets, a square under the
// dance floor with a hatch. Running gags: foul balls from the game (the punch
// bowl at noon, the arch at two, the cake at 3:40, the cake again at six), and
// the ice swan melting all day, a duck by dinner and a puddle by the dancing.
//
// Greybox: the tent's roof is drawn see-through so the plan inside reads; how
// the finished tent opens is the art's (farm.md, gate 2).
import { C, Q, folk } from '../../../engine/art.js';
import { drawLand } from '../../../engine/terrain.js';
import { block, pin, figure, tag, drawBlock, footing } from '../../greybox.js';
import { land } from '../land.js';
import { TENT, COOP } from '../plan.js';
import { during, since, hour, BEATS } from '../clock.js';
import { BLOCK, square, treeAt, crowd, beast, blockWhile } from '../style.js';

export default {
  id: 'wedding-field',
  name: 'The Wedding Field',
  blurb: 'A tent for 250 in the big lawn, a cake in its third repair and an ice swan leaving slowly. Foul balls arrive every few minutes.',
  describe: 'A huge white pole tent on a lawn with woods behind it: round tables, a dance floor, a band, a bar and a three-tier cake. An ice swan melts all day. Hens peck round a coop at the lawn\'s edge, caterers unload a truck, and portable toilets wait in a row. Base balls land from the game next door.',

  build(R) {
    drawLand(R, land);
    // The woods behind the tent.
    for (let x = 2; x < 30; x += 3.4) treeAt(R, x, 16.8 + (x % 2), { h: 6, r: 2 });

    const [x0, y0, x1, y1] = TENT;
    const zt = footing(R, x0, y0, x1 - x0, y1 - y0);
    // The tent's floor, tables, the dance floor, the band and the bar.
    R.floor((ctx) => drawBlock(ctx, x0, y0, zt, x1 - x0, y1 - y0, 0.05, C.white, null));
    for (let i = 0; i < 6; i++) block(R, x0 + 1.6 + (i % 3) * 3.2, y0 + 1.2 + Math.floor(i / 3) * 2.6, 1.6, 1.6, 0.8, C.white, i ? null : 'TABLES');
    block(R, 22.4, 21.2, 3, 1.6, 0.4, C.navy, 'BAND');
    R.poke({ id: 'band', at: [23.9, 22, 1.6], r: 1, say: ['Testing. Testing. Is that a goose?', 'This one\'s for the sheep.'] });
    block(R, 8.6, 21, 2.6, 0.9, 1.1, C.white, 'BAR');
    R.poke({ id: 'bar', at: [9.9, 21.4, 1.3], r: 0.9, say: 'Tonight\'s drink: the Foul Ball.' });
    // A square under the dance floor, with a hatch: a dance card in the 1900s.
    block(R, 16.8, 24.2, 4.4, 3.2, 0.1, C.wood, 'DANCE FLOOR');
    const hatch = square(R, 'hatch', 18.2, 25.1, { s: 1.3, name: 'HATCH', say: ['The 1900s. A dance card.', 'The 1800s. More dancing.', '1690. Nobody danced.', 'Hatch shut.'] });
    pin(R, { id: 'dance-card', label: 'A dance card', kind: 'poke', inside: hatch, layer: 1, at: [18.8, 25.7, 0.3], r: 0.7, hint: 'Under the dance floor, one layer down.' }, 1);

    // The cake table at the tent's open front, its skirt to the ground. The
    // goose is under it. From 3:40 a base ball is in the cake.
    block(R, 12.4, 28, 2.4, 1.2, 1.1, C.white, 'CAKE');
    const skirt = R.poke({ id: 'skirt', at: [13.6, 29.6, zt + 0.2], r: 0.9, say: 'The tablecloth honked.' });
    R.thing(13.6, 29.4, (ctx) => drawBlock(ctx, 12.4, 29.2, zt, 2.4, 0.2, 1 - skirt.k() * 0.7, C.pink, 'SKIRT'), { anim: true });
    R.goose((t) => ({ x: 13.4, y: 28.8, z: zt, dir: 'r', pose: 'sit', hidden: skirt.k() < 0.5 }),
      { kind: 'poke', inside: skirt, hint: 'The cake table\'s cloth goes all the way to the grass. Something\'s under it.' });
    pin(R, { id: 'cake-ball', label: 'A base ball in the cake', when: since(15 + 40 / 60), note: 'from 3:40', at: [13.6, 28.6, zt + 2.1], r: 0.7 }, 2);
    // The ice swan, melting: a swan, a duck by dinner, a puddle by the dancing.
    R.thing(21.6, 28.6, (ctx, t) => {
      const h = hour(t) < 5 ? 24 : hour(t), k = Math.max(0.15, 1 - Math.max(0, h - 10) / 12);
      drawBlock(ctx, 21, 28, zt, 1.2, 1.2, 0.8, C.white, null);
      drawBlock(ctx, 21.2, 28.2, zt + 0.8, 0.8, 0.8, 1.2 * k, C.sky, k > 0.6 ? 'ICE SWAN' : k > 0.3 ? 'ICE DUCK' : 'PUDDLE');
    }, { anim: true });
    R.decoy({ id: 'swan', at: [21.6, 28.6, zt + 1.5], r: 0.8, say: 'A swan. Made of ice. Leaving soon.' });

    // The tent's roof on its poles: see-through here (greybox), its peaks.
    // (Solid from far out, where it's the hero; see-through pinched in.)
    R.air((ctx) => {
      ctx.save();
      if (Q.detail) ctx.globalAlpha = 0.28;
      drawBlock(ctx, x0, y0, zt + 3.2, x1 - x0, y1 - y0, 0.4, C.white, null);
      for (const px of [12, 17, 22]) drawBlock(ctx, px - 1, y0 + 3.7, zt + 3.6, 2, 2, 1.6, C.white, null);
      ctx.restore();
      if (Q.detail) tag(ctx, (x0 + x1) / 2, (y0 + y1) / 2, zt + 5.8, 'THE TENT (sides up at six)', { size: 0.5 });
    });

    // The seating chart on its easel at the tent's front. Table 12 is the Courier's.
    block(R, 16.8, 31.2, 1.2, 0.2, 1.6, C.white, null);
    pin(R, { id: 'chart', label: 'The seating chart', at: [17.4, 31.3, 1.4], r: 0.7 }, 3);

    // The guests: the caterers by day, the tent full from six, dancing after nine.
    crowd(R, [[4, 28, 'carry', 'r'], [6, 29.6, 'carry', 'l'], [11, 23.6, 'stand', 'r']], during(8, 18), { seed: 30, look: (s) => folk(s, { top: C.white, bottom: C.ink }) });
    const tables = [];
    for (let i = 0; i < 6; i++) for (const [dx, dy] of [[-0.5, 0.8], [2.1, 0.8], [0.8, -0.5], [0.8, 2.1]]) tables.push([x0 + 1.6 + (i % 3) * 3.2 + dx, y0 + 1.2 + Math.floor(i / 3) * 2.6 + dy, 'sit', dx > 1 ? 'l' : 'r']);
    crowd(R, tables, during(18, 24.5), { seed: 31 });
    crowd(R, [[17.6, 24.8, 'dance'], [19.4, 25.4, 'dance'], [18.4, 26.6, 'dance'], [20.4, 26.2, 'dance'], [17.4, 26.8, 'dance']], during(20.5, 25), { seed: 32 });

    // The caterers' truck: a lost speech in it.
    blockWhile(R, 1.6, 28.4, 3.2, 1.8, 1.8, C.white, 'CATERERS', during(7, 25));
    R.poke({ id: 'truck', at: [3.2, 30.3, 1.2], r: 0.9, when: during(7, 25), say: 'A lost speech: "Unaccustomed as I am..."' });
    // The portable toilets, and a square by them.
    for (let i = 0; i < 5; i++) block(R, 27.6 + i * 1.2, 20, 1, 1, 2.2, C.sky, i ? null : 'TOILETS');
    square(R, 'toilet-square', 29.4, 23.6, { name: 'SQUARE', say: ['Not the toilets. Dirt.', 'Very old dirt.', '1690. Somebody\'s pot. Not that kind.', 'Filled back in.'] });

    // The hen coop by the house, its nest box (an egg), and the hens. A white
    // hen by the coop answers back: not the goose.
    block(R, COOP[0], COOP[1], COOP[2] - COOP[0], COOP[3] - COOP[1], 1.8, BLOCK.shed, 'COOP');
    const nest = R.poke({ id: 'nest', at: [32.9, 33.2, 0.9], r: 0.8, say: ['Cluck. (That means no.)', 'Empty. Try the lawn.'] });
    R.thing(33.2, 33.2, (ctx) => drawBlock(ctx, 33, 32.6, footing(R, 33, 32.6), 0.6, 1.2, 0.9 + nest.k() * 0.3, BLOCK.wood, 'NEST'), { anim: true });
    // The egg isn't in the nest box: one hen laid it out on the lawn.
    pin(R, { id: 'egg', label: 'An egg', kind: 'hard', at: [28.1, 32.6, 0.6], r: 0.7, riddle: 'One hen didn\'t bother with the nest box.', hint: 'Out on the grass among the hens, by the coop.' }, 4);
    for (const [x, y, dir] of [[28.6, 31.4, 'r'], [29.6, 34.6, 'l'], [27, 33.4, 'r']]) beast(R, x, y, 'hen', null, { pose: 'peck', dir, phase: x });
    beast(R, 31.2, 35.2, 'hen', 'HEN', { pose: 'stand', color: C.white, dir: 'l' });
    R.decoy({ id: 'white-hen', at: [31.2, 35.2, 0.6], r: 0.7, say: 'That\'s a hen. She\'s heard of you.' });

    // Foul balls: the cake at 3:40 (a mark where it lands).
    R.air((ctx, t) => { if (Math.abs(t - BEATS.cake) < 2) tag(ctx, 13.6, 28.6, zt + 3, 'FOUL BALL!', { size: 0.45 }); }, { anim: true });
  },
};
