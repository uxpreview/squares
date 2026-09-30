// Marine Park (docs/levels/southie.md): across the road from the row, down to
// Pleasure Bay. The Farragut statue on its circle at the end of East
// Broadway, lawns, the playground, the picnic shelter, the bath house on
// Pleasure Bay Beach. The lawn chair audience fills up all morning facing the
// row, scoring each move; they cheer the truck out at 3; a couch from the
// curb ends up on the lawn with three of them on it. Greybox.
import { C, folk, person } from '../../../engine/art.js';
import { drawLand } from '../../../engine/terrain.js';
import { block, figure, pin } from '../../greybox.js';
import { land, h } from '../land.js';
import { CIRCLE, BATH_HOUSE, PLAYGROUND, SHELTER, GROUND } from '../plan.js';
import { route } from '../../../engine/actors.js';

const G = GROUND;
export default {
  id: 'marine-park',
  name: 'Marine Park',
  blurb: 'Across the road, the neighbors have brought lawn chairs to score the moves. The truck is getting a two.',
  home: [40, 30],
  build(R) {
    drawLand(R, land);
    block(R, CIRCLE[0] - 0.8, CIRCLE[1] - 0.8, 1.6, 1.6, 3.2, C.greyLight, 'FARRAGUT');
    block(R, BATH_HOUSE[0], BATH_HOUSE[1], 5, 3.6, 3, C.white, 'BATH HOUSE');
    block(R, PLAYGROUND[0], PLAYGROUND[1], 4, 4, 1.8, C.coral, 'playground');
    block(R, SHELTER[0], SHELTER[1], 3.6, 3, 2.6, C.wood, 'shelter');
    // The audience, in lawn chairs, facing the row.
    for (let i = 0; i < 6; i++) figure(R, 30.4 + (i % 3) * 1.4, 26 + Math.floor(i / 3) * 2.2 + (i % 2) * 0.4, folk(110 + i), i ? '' : 'audience', { pose: 'sit', dir: 'l', back: true });
    // Trees.
    for (const [x, y] of [[30.6, 5.6], [39, 8.4], [30.8, 36.4], [40.4, 44], [31, 52.4], [38, 50]]) block(R, x, y, 1, 1, 3.4, C.green);
    // Walkers on the Sugar Bowl loop, along the beach.
    for (let i = 0; i < 3; i++) {
      const w = route([[45, 9 + i * 3], [47, 28], [46.2, 49.5]], { speed: 1.1, offset: i * 17, loop: false });
      const look = folk(120 + i);
      R.mover((t) => { const p = w(t); return { ...p, z: h(p.x, p.y) }; }, (ctx, t, p) => person(ctx, p.x, p.y, p.z, { ...look, pose: 'walk', dir: p.dir, back: p.back }, t));
    }
    pin(R, { id: 'kite', label: 'A kite in a tree', at: [39.5, 8.9, G + 3.8], r: 0.7 }, 1);
    pin(R, { id: 'flipflop', label: 'A lost flip-flop', at: [47, 38.5, h(47, 38.5) + 0.05], r: 0.6 }, 2);
    pin(R, { id: 'scorecard', label: 'A scorecard', at: [31.6, 29.4, G + 0.05], r: 0.6 }, 3);
    R.goose([35, 42.4, G + 1.8], { dir: 'l' });
  },
};
