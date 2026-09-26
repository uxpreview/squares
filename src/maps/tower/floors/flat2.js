// Placeholder floor. Replaced by the real drawing.
import { C, walls, slab, floor, label } from '../../../engine/art.js';

export default {
  id: 'flat2',
  name: '2B, The Family',
  blurb: 'Placeholder floor.',
  build(R) {
    R.floor((ctx) => { slab(ctx, C.greyLight); floor(ctx, C.coral); });
    R.wall((ctx) => walls(ctx, { left: C.white, right: C.greyLight }));
    R.thing(8, 8, (ctx) => label(ctx, 8, 8, 1, '2B, The Family', 0.8));
    R.find({ id: 'a', label: 'A thing', at: [4, 10, 0.3] });
    R.find({ id: 'b', label: 'Another thing', at: [10, 4, 0.3] });
    R.find({ id: 'c', label: 'One more thing', at: [12, 12, 0.3] });
    R.goose([6, 12, 0]);
  },
};
