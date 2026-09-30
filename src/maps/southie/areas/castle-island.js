// Castle Island (docs/levels/southie.md): Day Boulevard's causeway along
// Pleasure Bay's north shore to the lot, the hot dog stand and its line (a
// lookalike, no name), Fort Independence, the McKay monument facing the
// channel, plane spotters by the fence, Conley Terminal's containers behind,
// the walkway down the bay's east side and the Sugar Bowl at its tip.
// Whatever the time and the weather, the hot dog line is the same length.
// A plane comes over every minute or so, low (ambient.js), and everyone on
// the island looks up. Greybox.
import { C, folk, person } from '../../../engine/art.js';
import { drawLand } from '../../../engine/terrain.js';
import { block, figure, pin } from '../../greybox.js';
import { route } from '../../../engine/actors.js';
import { land, h } from '../land.js';
import { FORT, LOT, STAND, MCKAY, SUGAR_BOWL, EAST_WALK, GROUND } from '../plan.js';
import { CARS } from '../style.js';

const G = GROUND;
const gz = (x, y) => h(x, y);
export default {
  id: 'castle-island',
  name: 'Castle Island',
  blurb: 'The hot dog line is the same length at noon, in the rain and at midnight. Every minute a plane comes over and everyone looks up.',
  home: [92, 12],
  build(R) {
    drawLand(R, land);
    // Fort Independence on its mound, and the McKay monument.
    block(R, FORT[0], FORT[1], FORT[2], FORT[3], 3.6, C.greyLight, 'FORT INDEPENDENCE', { z: gz(FORT[0] + 5, FORT[1] + 5) - 0.3 });
    block(R, MCKAY[0], MCKAY[1], 0.8, 0.8, 5.4, C.greyLight, 'McKAY', { z: gz(MCKAY[0], MCKAY[1]) });
    // The hot dog stand, and its line.
    block(R, STAND[0], STAND[1], 3.4, 2.4, 2.4, C.white, 'HOT DOGS');
    for (let i = 0; i < 8; i++) figure(R, STAND[0] + 3.9 + i * 0.75, STAND[1] + 2.6 + (i % 2) * 0.3, folk(130 + i), i ? '' : 'the line', { dir: 'l' });
    // The lot, and cars in it.
    for (let i = 0; i < 5; i++) block(R, LOT[0] + 0.6 + i * 2.1, LOT[1] + 1, 1.7, 2.6, 1.3, CARS[(i + 2) % CARS.length]);
    // Containers at Conley Terminal, behind the fence.
    for (let i = 0; i < 6; i++) block(R, 59 + (i + (i > 2 ? 1.6 : 0)) * 3.2, 0.2, 2.8, 1.4, 1.4 + (i % 3) * 1.4, [C.coral, C.teal, C.navy][i % 3]);
    // Plane spotters at the fence, and Inspector Pidge among them.
    for (let i = 0; i < 3; i++) figure(R, 60.5 + i * 1.6, 7.4, folk(140 + i), i === 1 ? 'spotters' : '', { dir: 'l', back: true });
    figure(R, 65.6, 7.6, folk(149), 'Pidge', { dir: 'l', back: true });
    // Walkers on the east walkway and round the Sugar Bowl.
    for (let i = 0; i < 3; i++) {
      const w = route([...EAST_WALK, [SUGAR_BOWL[0] + 1, SUGAR_BOWL[1] - 1.8]], { speed: 1.15, offset: i * 21, loop: false });
      const look = folk(150 + i);
      R.mover((t) => { const p = w(t); return { ...p, z: gz(p.x, p.y) }; }, (ctx, t, p) => person(ctx, p.x, p.y, p.z, { ...look, pose: 'walk', dir: p.dir, back: p.back }, t));
    }
    pin(R, { id: 'relish', label: 'A relish packet', at: [STAND[0] + 4.2, STAND[1] + 4.2, G + 0.05], r: 0.6 }, 1);
    pin(R, { id: 'logbook', label: "A plane spotter's logbook", at: [62.4, 8.4, G + 0.05], r: 0.6 }, 2);
    pin(R, { id: 'earbud', label: 'A lost earbud', at: [SUGAR_BOWL[0] - 1, SUGAR_BOWL[1] + 1, gz(SUGAR_BOWL[0] - 1, SUGAR_BOWL[1] + 1) + 0.05], r: 0.6 }, 3);
    R.goose([STAND[0] + 9.6, STAND[1] + 3.4, G], { dir: 'l' });
  },
};
