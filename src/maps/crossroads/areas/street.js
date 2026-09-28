// The street at the Crossroads: one area in the shape of a cross, drawn in
// pieces (see "Chunks" in src/engine/zone.js). A test bed: the lines painted
// down the middle and the zebra crossing run over the seams between pieces,
// lamp posts and trees stand by them, and the goose walks right across.
import { C, rect, box, disc, alpha } from '../../../engine/art.js';
import { route } from '../../../engine/actors.js';
import { ground, block, pin } from '../../greybox.js';
import { S } from '../../../engine/iso.js';
import { STREET, EDGE, MID, ROAD } from '../plan.js';

export default {
  id: 'street',
  name: 'High Street',
  blurb: 'The only crossroads in town with a goose on patrol.',
  shape: STREET,
  build(R) {
    ground(R, { floor: C.grey, slab: C.greyLight, grid: false, name: 'High Street', nameAt: [MID, 9] });
    // Down the middle, both ways, dashed, over every seam.
    R.rug((ctx) => {
      for (let x = 0.5; x < EDGE; x += 2) if (x < S - 0.5 || x > S + ROAD) rect(ctx, x, MID - 0.1, 1.1, 0.2, 0.01, C.white, { stroke: false });
      for (let y = 0.5; y < EDGE; y += 2) if (y < S - 0.5 || y > S + ROAD) rect(ctx, MID - 0.1, y, 0.2, 1.1, 0.01, C.white, { stroke: false });
      // A zebra crossing on the seam at x = 32.
      for (let i = 0; i < 6; i++) rect(ctx, 31 + (i % 2) * 0, S + 0.3 + i * 0.95, 2.4, 0.5, 0.01, C.white, { stroke: false });
      // A shadow that crosses the seam at y = 32: see-through, so a doubled seam would show.
      disc(ctx, MID, 32, 0, 1.6, alpha(C.ink, 0.18), { stroke: false });
    });
    // Lamp posts and a tree, a unit clear of the seams.
    for (const [x, y] of [[S + 0.6, 3], [S + 0.6, 29], [4, S + 0.6], [29, S + 0.6], [35, S + ROAD - 0.6]]) {
      R.thing(x, y, (ctx) => {
        box(ctx, x - 0.15, y - 0.15, 0, 0.3, 0.3, 4.2, C.navy, { flat: true });
        box(ctx, x - 0.35, y - 0.35, 4.2, 0.7, 0.7, 0.4, C.butter, { flat: true });
      });
    }
    block(R, S + ROAD - 2.2, 34, 1.6, 1.6, 2.6, C.green, 'Tree');
    // The goose, walking the arm along x, over the seams at 16 and 32.
    const walk = route([[2, MID + 1.3], [36, MID + 1.3]], { speed: 1.1, loop: false });
    R.goose((t) => ({ ...walk(t), z: 0 }));
    pin(R, { id: 'cone', label: 'A traffic cone', at: [S + 1.5, 24, 0.4], r: 0.8 }, 1);
    block(R, S + 1, 23.5, 1, 1, 0.8, C.coral, null);
  },
};
