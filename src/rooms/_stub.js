// Placeholder room used until the real one is drawn.
import { C, slab, floor, walls, tiles, paintText } from '../art.js';

export default function stub(id, name) {
  return {
    id,
    name,
    blurb: 'Still being painted.',
    build(R) {
      R.floor((ctx) => { slab(ctx); floor(ctx, C.greyLight); tiles(ctx, 2); });
      R.wall((ctx) => walls(ctx));
      R.decor((ctx) => paintText(ctx, 'right', 8, 3.5, name.toUpperCase(), 1.2, C.ink));
    },
  };
}
