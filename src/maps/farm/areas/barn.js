// The Barn (greybox): the 1775 barn on shearing day (the shearer with his
// clippers, a pen of woolly sheep and a pen of bald ones, families on hay
// bales, a wool table), the carriage barn's end, which is the visitor center
// (the museum, the double-booked calendar and the display case), the loop
// drive and the lot, barn cats, swallows. Running gags: shearing, one sheep an
// hour, and at three one gets away half done and joins the wedding (day.js);
// and the display case fills up as you dig things up.
import { C, folk } from '../../../engine/art.js';
import { drawLand } from '../../../engine/terrain.js';
import { block, pin, figure, tag, drawBlock, footing } from '../../greybox.js';
import { land } from '../land.js';
import { BARN, CARRIAGE } from '../plan.js';
import { during, BEATS } from '../clock.js';
import { BLOCK, INK, square, beast, crowd, blockWhile } from '../style.js';

// Every dig find on the farm, for the display case ('zone:find').
const DUG = ['littles-lane:horseshoe', 'barn:pipe', 'paddock:milk', 'house:bottle', 'house:bone', 'wedding-field:dance-card', 'ball-field:old-ball', 'fields:coin'];

export default {
  id: 'barn',
  name: 'The Barn',
  blurb: 'Shearing day in the 1775 barn: woolly sheep in, bald sheep out, one an hour. The visitor center has the calendar that started all this.',
  describe: 'A long white barn with its roof off: a shearer at work between a pen of woolly sheep and a pen of bald ones, families on hay bales, a table piled with fleeces. Beside it a carriage barn that is now the visitor center, a loop drive and a small lot. In the afternoon one sheep gets away half sheared.',

  build(R) {
    drawLand(R, land);

    // The barn, its roof off (an open plate): a low wall round its floor.
    const [x0, y0, x1, y1] = BARN;
    const z = footing(R, x0, y0, x1 - x0, y1 - y0);
    R.floor((ctx) => drawBlock(ctx, x0, y0, z, x1 - x0, y1 - y0, 0.12, BLOCK.hay, null));
    block(R, x0, y0 - 0.4, x1 - x0, 0.4, 2.6, BLOCK.wood, '1775 BARN', { z });
    block(R, x0 - 0.4, y0 - 0.4, 0.4, y1 - y0 + 0.4, 2.6, BLOCK.wood, null, { z });
    // A beam across it, high up, where the swallows nest (and a cat sits).
    block(R, x0, 40.6, x1 - x0, 0.25, 0.25, BLOCK.trunk, null, { z: z + 3 });

    // The pens: woolly in, bald out.
    block(R, 15, 39, 0.2, 4.4, 0.9, BLOCK.fence, 'WOOLLY', { z });
    for (const [x, y] of [[15.8, 40], [17, 41.6], [16, 43]]) beast(R, x, y, 'sheep', null, { z, wool: 1, pose: 'stand' });
    block(R, 24.6, 39, 0.2, 4.4, 0.9, BLOCK.fence, 'BALD', { z });
    for (const [x, y] of [[25.6, 40.2], [26.8, 41.8], [25.6, 43.2]]) beast(R, x, y, 'sheep', null, { z, wool: 0, pose: 'graze', phase: x });
    // The shearer, from ten, with a sheep half done; families on bales.
    const shearing = during(10, 18);
    figure(R, 19.5, 41.4, folk(701, { top: C.navy }), 'SHEARER');
    R.poke({ id: 'shearer', at: [19.5, 41.4, 1.4], r: 0.9, say: ['One an hour. Two if they cooperate.', 'She went that way. Half done.'] });
    for (let i = 0; i < 3; i++) block(R, 18 + i * 1.6, 38.8, 1.2, 0.8, 0.6, BLOCK.hay, i ? null : 'BALES', { z });
    crowd(R, [[18.6, 39.2, 'sit'], [20.2, 39.2, 'sit'], [21.8, 39.2, 'cheer']], shearing, { seed: 71, dir: 'r' });
    pin(R, { id: 'sock', label: 'A sock being knitted', at: [20.6, 39.6, 1.3], r: 0.6 }, 1);
    // The wool table, the shears on it.
    block(R, 21.4, 42.4, 2.4, 1, 0.9, C.white, 'WOOL TABLE', { z });
    pin(R, { id: 'shears', label: 'A pair of shears', at: [22.9, 42.9, 1.05], r: 0.6 }, 2);
    // The goose is in a wool sack, head out.
    const sack = R.poke({ id: 'sack', at: [23.4, 43.6, 0.7], r: 0.9, say: 'This sack is warm. And honking.' });
    R.thing(23.4, 43.6, (ctx) => drawBlock(ctx, 22.9, 43.1, z, 1, 1, 1.2 - sack.k() * 0.5, BLOCK.hay, 'SACK'), { anim: true });
    R.goose((t) => ({ x: 23.4, y: 43.6, z: z + 0.5, dir: 'r', pose: 'sit', hidden: sack.k() < 0.5 }),
      { kind: 'poke', inside: sack, hint: 'One of the wool sacks is lumpier than the others.' });
    // A fleece that fell in a goose shape: not the goose.
    block(R, 17.4, 43.2, 1, 0.6, 0.15, INK.cream, 'FLEECE', { z });
    R.decoy({ id: 'fleece', at: [17.9, 43.5, 0.3], r: 0.8, say: 'It just landed like that.' });
    // A barn cat on the beam: two eyes in the dark.
    pin(R, { id: 'cat', label: 'A barn cat', kind: 'hard', at: [26.2, 40.7, z + 3.3], r: 0.6, riddle: 'Two eyes in the rafters, watching the swallows.', hint: 'Look up, along the barn\'s beam.' }, 3);

    // The carriage barn's end: the visitor center, its calendar and the case.
    const [cx0, cy0, cx1, cy1] = CARRIAGE;
    block(R, cx0, cy0, cx1 - cx0, cy1 - cy0, 2.8, BLOCK.wood, 'VISITOR CENTER');
    block(R, 5, 50.1, 1.4, 0.2, 1.2, C.white, null, { z: 0.8 });
    R.poke({ id: 'calendar', at: [5.7, 50.2, 1.4], r: 0.8, say: 'SATURDAY: wedding. SATURDAY: base ball. SATURDAY: shearing. SATURDAY: dig. Someone has a lot of pens.' });
    block(R, 8.4, 50.1, 2.2, 0.6, 1, C.sky, null);
    R.poke({ id: 'case', at: [9.5, 50.4, 1], r: 0.9, say: 'The display case: everything dug up today, labeled. "Hair restorer, 1870s. It didn\'t."' });
    // How many dig finds are in the case so far (the art fills its shelves).
    R.thing(9.5, 50.4, (ctx) => { const n = DUG.filter((k) => R.found(k)).length; tag(ctx, 9.5, 50.4, 1.9, `CASE ${n}/${DUG.length}`, { size: 0.32 }); }, { anim: true });

    // The lot by the visitor center, and a square on the lawn beside it.
    for (let i = 0; i < 3; i++) blockWhile(R, 2.5 + i * 3, 38.6, 1.8, 3, 1.3, [C.teal, BLOCK.vehicle, C.white][i], i ? null : 'LOT', during(8, 24));
    const pipe = square(R, 'barn-square', 2.6, 51.4, { name: 'SQUARE' });
    pin(R, { id: 'pipe', label: 'A clay pipe', kind: 'poke', inside: pipe, layer: 2, at: [3.3, 52.1, 0.3], r: 0.7, hint: 'Two layers down by the visitor center, from when merchants smoked here.' }, 4);
    square(R, 'barn-square-2', 30.2, 50.6, { name: 'SQUARE', say: ['Dirt. Very old dirt.', 'A nail. The 1800s had nails.', '1690. A stone. A very proud stone.', 'Filled back in.'] });

    // The flock waiting outside before ten, and the sheared ones after.
    R.air((ctx, t) => { if (t > BEATS.sheep && t < BEATS.sheep + 6) tag(ctx, 17, 45, 3, 'ONE GOT AWAY', { size: 0.4 }); }, { anim: true });
  },
};
