// Little's Lane (greybox): the lane in from High Road under its double row of
// old trees, the farm's sign, and the parking field off it, where a
// volunteer with three flags sends everyone (wedding, base ball, sheep) to the
// same spot. From two, the bride's photos on the lane, the official backdrop.
// The getaway truck with cans on strings. Running gags: the photographer,
// with a goose in every shot (it's gone when she turns; Roger walks in
// instead), and the car cat, trying every door in the parking field (day.js).
// At ten the sparkler send-off runs down the lane (the ending).
import { C, folk } from '../../../engine/art.js';
import { drawLand } from '../../../engine/terrain.js';
import { block, pin, figure, tag, drawBlock, footing } from '../../greybox.js';
import { land } from '../land.js';
import { LANE, PARKING } from '../plan.js';
import { during, since } from '../clock.js';
import { BLOCK, INK, square, treeAt, crowd, blockWhile, guest } from '../style.js';

// The lane's double row of trees: every few units along it, either side.
function trees(R) {
  for (let i = 1; i < LANE.length; i++) {
    const [ax, ay] = LANE[i - 1], [bx, by] = LANE[i];
    const L = Math.hypot(bx - ax, by - ay), nx = -(by - ay) / L, ny = (bx - ax) / L;
    for (let u = 2; u < L; u += 4.2) {
      for (const side of [-2.6, 2.6]) {
        const x = ax + ((bx - ax) * u) / L + nx * side, y = ay + ((by - ay) * u) / L + ny * side;
        if (R.shape.some(([x0, y0, x1, y1]) => x > x0 + 0.5 && x < x1 - 0.5 && y > y0 + 0.5 && y < y1 - 0.5)) treeAt(R, x, y, { h: 5, r: 1.7 });
      }
    }
  }
}

export default {
  id: 'littles-lane',
  name: 'Little\'s Lane',
  blurb: 'The lane in from High Road, the parking field, and the bride\'s photos under the trees. Every photo has a goose in it.',
  describe: 'A gravel lane under a double row of old trees, running in from the road to the farmhouse, with a mown parking field beside it and a volunteer waving three colored flags. A pickup with cans on strings waits for the couple. The bride poses for photos here in the afternoon; at ten the guests line it with sparklers.',

  build(R) {
    drawLand(R, land);
    trees(R);

    // The farm's sign at the lane's mouth.
    block(R, 15.2, 69.2, 0.3, 2, 1.4, C.white, 'FARM SIGN');
    R.poke({ id: 'sign', at: [15.3, 70.2, 1], r: 0.9, say: 'Since 1635. Booked solid.' });

    // The parking field: cars from nine till midnight, and the volunteer.
    const parked = during(9, 24);
    for (let i = 0; i < 7; i++) {
      const x = PARKING[0] + 1 + (i % 4) * 3, y = PARKING[1] + 2 + Math.floor(i / 4) * 5;
      blockWhile(R, x, y, 1.8, 3, 1.3, [BLOCK.vehicle, C.teal, C.coral, C.white][i % 4], i === 0 ? 'CARS' : null, parked);
    }
    figure(R, 8.5, 66.5, folk(601, { top: C.mustard }), 'PARKING');
    R.poke({ id: 'volunteer', at: [8.5, 66.5, 1.4], r: 0.9, say: ['Wedding, base ball or sheep? Same field.', 'Follow the flag. Any flag.'] });
    pin(R, { id: 'flag', label: 'A parking flag', at: [5, 58.2, 0.8], r: 0.7 }, 1);

    // The getaway truck, cans on strings, a tarp over its bed. The goose is
    // under the tarp; its tail shows.
    block(R, 17, 64.5, 2, 2, 1.6, C.white, 'GETAWAY');
    const tarp = R.poke({ id: 'tarp', at: [18, 67.4, 1.1], r: 0.95, say: 'Something under here honked.' });
    R.thing(18, 67.6, (ctx) => drawBlock(ctx, 17, 66.5, footing(R, 17, 66.5, 2, 2.4), 2, 2.4, 0.9 + (1 - tarp.k()) * 0.4, tarp.k() > 0.5 ? C.white : C.teal, 'TARP'), { anim: true });
    R.goose((t) => ({ x: 18, y: 67.6, z: 0.9, dir: 'l', pose: 'sit', hidden: tarp.k() < 0.5 }),
      { kind: 'poke', inside: tarp, hint: 'The getaway truck is carrying more than cans.' });

    // A lawn goose in a veil: not the goose.
    block(R, 20.2, 69.2, 0.8, 0.5, 0.7, C.white, 'VEIL GOOSE');
    R.decoy({ id: 'lawn-goose', at: [20.6, 69.4, 0.6], r: 0.8, say: 'Here comes the... no.' });

    // The bride's photos on the lane, two till four, and the photographer.
    const photos = during(14, 15.6);
    crowd(R, [[26.5, 61.4, 'stand', 'l'], [27.3, 62.4, 'stand', 'l'], [23.2, 63.5, 'wave', 'r']], photos, { seed: 61, look: (s) => guest(s, { top: C.pink, dress: true }) });
    figure(R, 21.2, 59.6, folk(612, { top: C.ink }), 'PHOTOGRAPHER', { dir: 'r' });
    R.poke({ id: 'photographer', at: [21.2, 59.6, 1.4], r: 0.9, say: ['One more.', 'Was that a goose?', 'One MORE.'] });

    // A square by the lane: a draft horse's shoe in the 1900s. Beside it the
    // spoil heap, where something round fell during the photos.
    const shoe = square(R, 'lane-square', 28.5, 65, { name: 'SQUARE' });
    pin(R, { id: 'horseshoe', label: 'A draft horse\'s shoe', kind: 'poke', inside: shoe, layer: 1, at: [29.2, 65.7, 0.3], r: 0.7, hint: 'One layer down by the lane, from when the Littles kept draft horses.' }, 2);
    block(R, 27.6, 67.3, 1.2, 1, 0.5, INK.earth, 'SPOIL');
    pin(R, { id: 'ring', label: 'A wedding ring', kind: 'hard', when: since(14), note: 'from two', at: [28.2, 67.8, 0.55], r: 0.7, riddle: 'Something round fell where the photographer said one more.', hint: 'It rolled off the lane into a heap of dug earth.' }, 3);
    square(R, 'lane-square-2', 3.5, 70, { name: 'SQUARE', say: ['Dirt. Very old dirt.', 'More dirt. The 1800s had plenty.', '1690. Still dirt.', 'Filled back in.'] });

    // A gatepost by the paddock's corner, where the bouquet lands from two.
    block(R, 31.6, 59.4, 0.4, 0.4, 1.3, BLOCK.fence, null);
    pin(R, { id: 'bouquet', label: 'A bouquet', when: since(14), note: 'from two', at: [31.8, 59.6, 1.5], r: 0.7 }, 4);

    // The send-off at ten: guests in two lines down the lane, sparklers up.
    crowd(R, [[21, 60.5], [23.5, 58.5], [26, 56.6], [28.5, 55.2], [17.5, 67.2], [20, 65.4], [22.5, 63.2], [25, 61.3]].map(([x, y]) => [x, y, 'cheer', 'r']), during(21.9, 22.5), { seed: 62 });
    R.air((ctx, t) => { if (during(21.9, 22.5)(t)) tag(ctx, 22, 62, 4, 'SPARKLERS', { size: 0.5 }); }, { anim: true });
  },
};
