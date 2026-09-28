// The back alleys: the narrow lanes between the rooms, off Main Street. Bins,
// a cat, washing strung between the walls, and the octopus, escaped from the
// aquarium again, heading up the alley for the noodle bar (it walks, in
// day.js). Greybox: the layout, where the finds go (numbered pins).
import { C, rect, alpha } from '../../../engine/art.js';
import { ground, block, pin } from '../../greybox.js';
import { ALLEYS, ALLEY } from '../plan.js';
import { STREET, BLOCK, dusk } from '../style.js';
import { nightK } from '../day.js';

// Bins against the alley walls, clear of the lanes down the middle and a unit
// clear of the seams (every 16).
const BINS = [[16.2, 27], [16.2, 70], [61.2, 9], [63.6, 52], [8, 16.2], [26, 16.2], [53, 16.2], [72, 63.6], [28, 63.6]];
// Washing lines strung across the alleys, high up: [x0, y0, x1, y1].
const LINES = [[6, 16, 6, 20], [30, 16, 30, 20], [55, 61, 55, 65], [16, 42, 20, 42], [61, 25, 65, 25]];
const CLOTHES = [C.white, C.coral, C.sky, C.butter, C.pink];

export default {
  id: 'alleys',
  name: 'The Alleys',
  blurb: 'Bins, cats and other people\'s washing. The octopus uses them as a shortcut.',
  shape: ALLEYS,
  home: [18, 53], // where the octopus gets to
  build(R) {
    ground(R, { floor: STREET.alley, slab: STREET.slab, grid: 1, name: null });
    // Cobbles down the middle of each lane.
    R.rug((ctx) => {
      for (const [x0, y0, x1, y1] of ALLEYS) {
        if (x1 - x0 < y1 - y0) rect(ctx, x0 + 1.4, y0, ALLEY - 2.8, y1 - y0, 0.01, alpha(STREET.cobble, 0.6), { stroke: false });
        else rect(ctx, x0, y0 + 1.4, x1 - x0, ALLEY - 2.8, 0.01, alpha(STREET.cobble, 0.6), { stroke: false });
      }
    });
    for (const [x, y] of BINS) block(R, x, y, 1.2, 1.2, 1.3, BLOCK.street, null);
    for (const [x0, y0, x1, y1] of LINES) {
      R.thing((x0 + x1) / 2, (y0 + y1) / 2, (ctx, t) => {
        const P = (x, y, z) => [x - y, (x + y) / 2 - z * 1.12];
        const [ax, ay] = P(x0, y0, 5.4), [bx, by] = P(x1, y1, 5.4);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + 0.5, bx, by);
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 0.04;
        ctx.stroke();
        for (let i = 1; i < 4; i++) {
          const k = i / 4, X = ax + (bx - ax) * k, Y = ay + (by - ay) * k + Math.sin(k * Math.PI) * 0.37;
          const sway = Math.sin(t * 1.6 + i + x0) * 0.08;
          ctx.fillStyle = CLOTHES[(i + x0) % CLOTHES.length];
          ctx.fillRect(X - 0.3 + sway, Y, 0.6, 0.8);
        }
      }, { anim: true, depth: (x0 + x1 + y0 + y1) / 2 + 3 });
    }
    // The cat, on a bin.
    block(R, 26.3, 16.5, 0.6, 0.6, 0.6, C.mustard, 'Cat', { z: 1.3 });
    // A raccoon, in the bins behind the arcade.
    block(R, 61.9, 11, 0.8, 0.8, 0.6, C.grey, 'Raccoon');
    dusk(R, nightK, 0.62);

    pin(R, { id: 'tentacle-print', label: 'A tentacle print', at: [18.8, 60, 0.05], r: 0.8 }, 1);
    pin(R, { id: 'noodle-key', label: 'The noodle bar\'s back door key', at: [17, 49, 0.05], r: 0.8 }, 2);
    pin(R, { id: 'cat-in-a-bin', label: 'A cat in a bin', at: [16.8, 70.6, 1.35], r: 0.8 }, 3);
  },
};

