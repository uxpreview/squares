// The Couch: the Green House's third floor. Before noon, the last tenant
// leaving everything ("It's all yours."). After noon, a couple from out of
// state moving in, measuring the stairwell, measuring it again. Their couch
// doesn't fit the stairs, so it goes up the front on a rope from the porch at
// 9am and hangs halfway up all day (Farragut Road draws it); the ending brings
// it in (finale.js).
import { C, folk } from '../../../engine/art.js';
import { figure, pin } from '../../greybox.js';
import { apartment, stuff } from '../kit.js';
import { SIDING, TRIM, ROOM } from '../style.js';
import { BEFORE, AFTER } from '../clock.js';
import { goose as drawGoose } from '../../../engine/art.js';
import { drawBlock } from '../../greybox.js';
import { playing, beat, PIVOT, finale } from '../finale.js';

const out = BEFORE.when, inn = AFTER.when;
export default {
  id: 'green-3',
  name: 'The Couch',
  blurb: 'The couch does not fit up the stairs, so it has been on a rope since nine. They have measured the stairwell six times.',
  size: [15, 9],
  build(R) {
    apartment(R, { floor: 2, walls: ROOM['green-3'], floorInk: ROOM['green-3'].floor, siding: SIDING.green, trim: TRIM.green, name: 'THE COUCH' });
    stuff(R, 9, 3, 2.4, 1.4, 1.1, C.coral, 'old armchair', out);
    stuff(R, 4.8, 3, 1.4, 1.4, 1.2, C.wood, 'left behind', out);
    stuff(R, 5, 4.6, 2.6, 2.2, 1, C.woodLight, 'boxes', inn);
    stuff(R, 13, 0.4, 1.4, 3.4, 0.2, C.greyLight, 'rope pulley (porch)');
    figure(R, 13.2, 2, folk(33), 'pulling', { dir: 'r' });
    figure(R, 3.4, 7.2, folk(34), 'measuring');
    pin(R, { id: 'tape', label: 'A tape measure', at: [2.6, 8.4, 0.2], r: 0.6 }, 1);
    pin(R, { id: 'leg', label: "The couch's missing leg", at: [10.6, 7.6, 0.2], r: 0.6 }, 2);
    pin(R, { id: 'plan', label: 'A floor plan on a napkin', at: [6, 5.4, 1.05], r: 0.6, ...AFTER }, 3);
    R.goose([1.6, 4.4, 0], { dir: 'r' });
    // The ending: the couch comes over the porch rail, the geese pulling,
    // gets turned (PIVOT!), and they sit on it, out on the porch where the
    // street can see (finale.js).
    R.mover(() => ({ x: 14, y: 4.4 }), (ctx, t) => {
      if (!playing()) return;
      const k = beat(PIVOT);
      if (k <= 0) return;
      const x = 15 - 1.2 * k;
      drawBlock(ctx, x - 1.2, 0.8, 0, 1.2, 2.6, 1, C.coral, k < 1 ? 'PIVOT!' : 'COUCH');
      for (let i = 0; i < 12; i++) {
        const sit = k >= 1 && i < 4;
        const gx = sit ? x - 0.9 + (i % 2) * 0.5 : 12.9 + (i % 3) * 0.6, gy = sit ? 1.2 + Math.floor(i / 2) * 1.1 : 3.4 + Math.floor(i / 3) * 0.28;
        drawGoose(ctx, gx, gy, sit ? 1 : 0, t + i, { dir: 'r', pose: sit ? 'sit' : k < 1 ? 'walk' : 'honk', scale: 0.8 });
      }
    }, { anim: true });
  },
};
