// The House (greybox): the 1690 stone and brick house (the brick porch and
// gable ends, the big central chimney), the wooden wing, the farmhouse behind
// it through the breezeway, the well pump by the kitchen. The ceremony on the
// front lawn at four (the owner's photos): rows of chairs either side of a
// grass aisle, the flower arch at the porch door, the house behind the
// couple. Cocktail hour at five on the lawn toward the barn, with the
// ten-minute tours. The dig in its real places round the house (the East and
// West Yards, the scullery, the Flower Garden, the East and West Fronts),
// Boardman's privy, the trench with its layers, the sifting screens, the old
// maples. Running gags: the heel in the 1800s at half past three, and the
// ten-minute tour that goes in at five and comes out at quarter to six.
import { C, folk, box } from '../../../engine/art.js';
import { drawLand } from '../../../engine/terrain.js';
import { block, pin, figure, tag, drawBlock, footing } from '../../greybox.js';
import { land } from '../land.js';
import { HOUSE, PORCH, WING, FARMHOUSE, AISLE, ARCH, COCKTAILS } from '../plan.js';
import { during, since } from '../clock.js';
import { BLOCK, INK, EARTH, square, treeAt, crowd, guest } from '../style.js';

export default {
  id: 'house',
  name: 'The House',
  blurb: 'The stone house from 1690, a wedding on its front lawn and a dig in its yard. The sign says DO NOT STAND IN THE 1800s.',
  describe: 'A stone house with a brick porch and a big chimney, a wooden wing and a farmhouse behind. On the front lawn, rows of white chairs face a flower arch at the porch door; at four the guests sit for the ceremony. Archaeologists\' squares and a long trench are open round the yard, with sifting screens and an old outhouse.',

  build(R) {
    drawLand(R, land);
    const zh = footing(R, HOUSE[0], HOUSE[1], HOUSE[2] - HOUSE[0], HOUSE[3] - HOUSE[1]);

    // The stone house, its roof (which lifts, for the attic) and chimney.
    block(R, HOUSE[0], HOUSE[1], HOUSE[2] - HOUSE[0], HOUSE[3] - HOUSE[1], 3.4, BLOCK.stone, null, { z: zh });
    const roof = R.poke({ id: 'roof', at: [46, 43.5, zh + 4.4], r: 1.4, say: 'The attic. A name on a beam.' });
    R.thing(46, 43.5, (ctx) => {
      const up = roof.k() * 2.2;
      drawBlock(ctx, HOUSE[0] - 0.2, HOUSE[1] - 0.2, zh + 3.4 + up, HOUSE[2] - HOUSE[0] + 0.4, HOUSE[3] - HOUSE[1] + 0.4, 1.5, BLOCK.machine, '1690 HOUSE');
      box(ctx, 45.4, 42.9, zh + 3.4 + up, 1.2, 1.2, 2.6, BLOCK.brick, { flat: true });
    }, { anim: true, depth: HOUSE[2] + HOUSE[3] - 0.2 });
    pin(R, { id: 'signature', label: 'An old signature', kind: 'poke', inside: roof, at: [44, 42.4, zh + 3.6], r: 0.7, hint: 'Up under the old house\'s roof, someone signed a beam.' }, 1);
    block(R, PORCH[0], PORCH[1], PORCH[2] - PORCH[0], PORCH[3] - PORCH[1], 2.8, BLOCK.brick, 'PORCH', { z: zh });
    block(R, WING[0], WING[1], WING[2] - WING[0], WING[3] - WING[1], 2.6, BLOCK.wood, 'WING', { z: zh });
    block(R, FARMHOUSE[0], FARMHOUSE[1], FARMHOUSE[2] - FARMHOUSE[0], FARMHOUSE[3] - FARMHOUSE[1], 2.8, BLOCK.wood, 'FARMHOUSE');
    block(R, 49.2, 39.6, 1, 1.4, 2, BLOCK.wood, null);
    // A cast-iron goose doorstop on the porch step: not the goose.
    block(R, 47.5, 47.5, 0.5, 0.3, 0.5, C.ink, null, { z: zh });
    R.decoy({ id: 'doorstop', at: [47.7, 47.6, zh + 0.5], r: 0.7, say: 'Heavier than you.' });
    // The well pump by the kitchen.
    block(R, 54.4, 40, 0.4, 0.4, 1.3, C.navy, 'PUMP');
    R.poke({ id: 'pump', at: [54.6, 40.2, 1.3], r: 0.8, say: 'Squeak. Squeak. Water, 1690 style.' });

    // The ceremony: two blocks of chairs either side of the aisle, the arch.
    // (A chair a seat, so whoever sits on one sorts in front of it.)
    for (let row = 0; row < 4; row++) for (let i = 0; i < 4; i++) {
      block(R, AISLE - 5.4 + i * 1.2, 49.6 + row * 1.1, 0.9, 0.5, 0.5, C.white, row || i ? null : 'CHAIRS');
      block(R, AISLE + 1 + i * 1.2, 49.6 + row * 1.1, 0.9, 0.5, 0.5, C.white, null);
    }
    block(R, ARCH[0] - 1.3, ARCH[1] - 0.1, 0.25, 0.25, 2.8, C.pink, 'ARCH');
    block(R, ARCH[0] + 1.1, ARCH[1] - 0.1, 0.25, 0.25, 2.8, C.pink, null);
    // The guests, seated at four, facing the porch (backs to us).
    const ceremony = during(15.9, 17);
    const seats = [];
    for (let row = 0; row < 4; row++) for (let i = 0; i < 4; i++) {
      seats.push([AISLE - 4.95 + i * 1.2, 50.4 + row * 1.1, 'sit', 'r']);
      seats.push([AISLE + 1.45 + i * 1.2, 50.4 + row * 1.1, 'sit', 'r']);
    }
    crowd(R, seats.filter((s, i) => i % 4 !== 3), ceremony, { seed: 90, back: true });
    figure(R, 46, 47.8, folk(901, { top: C.ink }), null, { dir: 'l' });

    // Cocktail hour on the lawn toward the barn, five till six.
    const [ax0, ay0, ax1, ay1] = COCKTAILS;
    block(R, ax0 + 0.4, ay0 + 0.6, 2.4, 0.9, 1.1, C.white, 'BAR');
    // (Clear of the house's gable: anyone with less than 4.6 between their x
    // and y stands behind it, from here.)
    const mingle = [];
    for (let y = ay0 + 1.8; y < ay1; y += 1.05) for (let x = ax0 + 0.6 + ((y * 2) % 1); x < ax1; x += 1.1) if (x - y < -4.8 && mingle.length < 22) mingle.push([x, y, mingle.length % 3 ? 'stand' : 'wave', mingle.length % 2 ? 'l' : 'r']);
    crowd(R, mingle, during(17, 18), { seed: 91 });
    // The tour guide, on the hour from eleven to four, and the ten-minute tours.
    figure(R, 43.5, 47.6, folk(902, { top: C.green }), 'TOURS', { dir: 'r' });
    R.poke({ id: 'guide', at: [43.5, 47.6, 1.4], r: 0.9, say: ['Next tour on the hour. Mind the 1800s.', 'Ten-minute tour. Minute fifty.'] });

    // The dig. The sign, and the trench with its layers.
    block(R, 57.4, 49.8, 1.6, 0.2, 1.1, C.white, 'DO NOT STAND IN THE 1800s', { size: 0.3 });
    R.poke({ id: 'dig-sign', at: [58.2, 49.9, 1], r: 0.8, say: ['DO NOT STAND IN THE 1800s.', 'The Pawtucket and Penacook lived here first.'] });
    R.thing(58, 47.4, (ctx) => {
      const z = footing(R, 55, 46.4, 6, 1.6);
      drawBlock(ctx, 55, 46.4, z - 0.9, 6, 1.6, 0.3, EARTH[3], null);
      drawBlock(ctx, 55, 46.4, z - 0.6, 6, 1.6, 0.3, EARTH[2], null);
      drawBlock(ctx, 55, 46.4, z - 0.3, 6, 1.6, 0.3, EARTH[1], 'THE TRENCH');
    });
    // Squares in the real places: the West Yard by the scullery (a bone from
    // the 1788 dinner, in 1690), the East Yard (hair restorer, the 1800s),
    // the Flower Garden, the West Front (where the heel goes in at 3:30).
    // (Out past the house's west end: behind it, the house would hide it.)
    const scullery = square(R, 'scullery', 35.2, 37, { name: 'SCULLERY' });
    pin(R, { id: 'bone', label: 'A bone from a 1788 dinner', kind: 'hard', inside: scullery, layer: 3, at: [35.9, 37.7, 0.2], r: 0.7, riddle: 'Three layers down, where the dishes were done.', hint: 'The bottom of the square by the scullery, under the old house\'s back.' }, 2);
    const east = square(R, 'east-yard', 57.4, 41.6, { name: 'EAST YARD' });
    pin(R, { id: 'bottle', label: 'A hair restorer bottle', kind: 'poke', inside: east, layer: 2, at: [58.1, 42.3, 0.3], r: 0.7, hint: 'Two layers down in the yard east of the house.' }, 3);
    square(R, 'flower-garden', 55, 51.6, { name: 'FLOWER GARDEN', teach: true, say: ['The 1900s. A seed packet.', 'The 1800s. Somebody\'s good soil.', '1690. Careful.', 'Filled back in.'] });
    square(R, 'west-front', 38.6, 50.4, { name: 'WEST FRONT', say: ['The 1900s.', 'The 1800s. Somebody\'s heel is in here.', '1690. Careful.', 'Filled back in.'] });
    // (The heel stays in the square; the shoe came off on the lawn.)
    pin(R, { id: 'heel', label: 'A bride\'s shoe', when: since(15.5), note: 'from half past three', at: [36.8, 48.6, 0.8], r: 0.7 }, 4);

    // Boardman's privy (about 1800), the sifting screens, the maples.
    block(R, 57.6, 36.8, 1.6, 1.6, 2.2, BLOCK.wood, 'PRIVY 1800');
    block(R, 59.5, 40, 1.4, 0.3, 1.4, C.grey, 'SCREEN');
    const screen = R.poke({ id: 'screen', at: [60.4, 43.3, 0.9], r: 0.9, say: 'Shake, shake. Feet.' });
    R.thing(60.4, 43.6, (ctx, t) => drawBlock(ctx, 59.6 + Math.sin(t * 30) * 0.05 * screen.k(), 43.4, footing(R, 59.6, 43.4), 1.6, 0.3, 1.5 - screen.k() * 0.6, C.grey, 'SCREEN'), { anim: true });
    R.goose((t) => ({ x: 60.4, y: 42.8, z: 0.6, dir: 'l', pose: 'stand', hidden: screen.k() < 0.5 }),
      { kind: 'poke', inside: screen, hint: 'Behind one of the sifting screens, two orange feet.' });
    figure(R, 58.4, 44.6, folk(903, { top: C.mustard, hat: 'sun' }), 'ARCHAEOLOGIST', { pose: 'point', dir: 'l' });
    figure(R, 56.2, 38.9, folk(904), null, { pose: 'sit', dir: 'l' });
    treeAt(R, 40.6, 36.9, { h: 6, r: 2.2 });
    treeAt(R, 61.6, 52.4, { h: 6, r: 2.2 });
    treeAt(R, 62, 37.6, { h: 5.5, r: 2 });
  },
};
