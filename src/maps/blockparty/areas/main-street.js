// Main Street: the cross through the middle of the block, and the party being
// built at the crossroads all day. The stage in the middle, bunting going up
// by midday, a bouncy castle that won't stay up, and the bin lorry trying to
// get through (a walker, in day.js). Greybox: the layout, where the finds go
// (numbered pins) and where people stand.
import { C, rect, box, alpha } from '../../../engine/art.js';
import { ground, block, pin } from '../../greybox.js';
import { MAIN_STREET, MAIN, MAIN0, MAIN1, MID, EDGE, STAGE } from '../plan.js';
import { STREET, BLOCK, lampPost, poster, bunting, dusk } from '../style.js';
import { hour, nightK } from '../day.js';

// Lamp posts along both kerbs, a unit clear of the seams (every 16).
const POSTS = [];
for (const u of [8, 24, 56, 72]) {
  POSTS.push([MAIN0 + 0.6, u], [MAIN1 - 0.6, u], [u, MAIN0 + 0.6], [u, MAIN1 - 0.6]);
}

// The bouncy castle, in the front arm: it inflates, sags, inflates, and every
// time it's nearly up someone sits on the pump. 0 flat to 1 up.
function puff(t) {
  const k = (t % 23) / 23;
  return k < 0.8 ? Math.min(1, k / 0.75) * 0.95 : 0.95 * (1 - (k - 0.8) / 0.2);
}
const CASTLE = [MID - 2.1, 54, 4.2, 5];

export default {
  id: 'main-street',
  name: 'Main Street',
  blurb: 'The Block Party is today, and the stage is going up in the middle of the road. The bin lorry would like a word.',
  shape: MAIN_STREET,
  home: [MID, MID + 6], // the stage
  build(R) {
    ground(R, { floor: STREET.road, slab: STREET.slab, grid: false, name: 'Main Street', nameAt: [MID, 12], nameSize: 1.3 });
    // Kerbs and the lines down the middle, both ways, over every seam.
    R.rug((ctx) => {
      for (const [x0, y0, x1, y1] of MAIN_STREET) {
        const along = x1 - x0 < y1 - y0; // this arm runs along y
        if (along) {
          rect(ctx, x0, y0, 0.3, y1 - y0, 0.02, STREET.kerb, { stroke: false });
          rect(ctx, x1 - 0.3, y0, 0.3, y1 - y0, 0.02, STREET.kerb, { stroke: false });
          for (let y = y0 + 0.5; y < y1 - 1; y += 2) if (y < MAIN0 - 1 || y > MAIN1) rect(ctx, MID - 0.1, y, 0.2, 1.1, 0.01, STREET.line, { stroke: false });
        } else {
          rect(ctx, x0, y0, x1 - x0, 0.3, 0.02, STREET.kerb, { stroke: false });
          rect(ctx, x0, y1 - 0.3, x1 - x0, 0.3, 0.02, STREET.kerb, { stroke: false });
          for (let x = x0 + 0.5; x < x1 - 1; x += 2) rect(ctx, x, MID - 0.1, 1.1, 0.2, 0.01, STREET.line, { stroke: false });
        }
      }
      // The crossing: the party's dance floor, chalked out.
      rect(ctx, MAIN0 + 0.8, MAIN0 + 0.8, MAIN - 1.6, MAIN - 1.6, 0.01, alpha(C.mustard, 0.25), { stroke: false });
    });
    // The stage, at the crossroads.
    block(R, ...STAGE, 1.2, BLOCK.party, 'Stage');
    // Bunting, strung across the crossroads from the corners of the rooms,
    // going up as the day goes on (none at dawn, all of it by noon).
    R.thing(MID, MID + 3.5, (ctx, t) => {
      const h = hour(t), up = h < 7 ? 0 : h < 12 ? (h - 7) / 5 : 1;
      const lines = [
        [[MAIN0, MAIN0, 5.8], [MAIN1, MAIN1, 5.8]],
        [[MAIN1, MAIN0, 5.8], [MAIN0, MAIN1, 5.8]],
        [[MAIN0, 6, 5.8], [MAIN1, 6, 5.8]],
        [[MAIN0, EDGE - 8, 5.8], [MAIN1, EDGE - 8, 5.8]],
        [[6, MAIN0, 5.8], [6, MAIN1, 5.8]],
        [[EDGE - 8, MAIN0, 5.8], [EDGE - 8, MAIN1, 5.8]],
      ];
      lines.slice(0, Math.round(up * lines.length)).forEach(([a, b]) => bunting(ctx, a, b, t, 10));
    }, { anim: true, depth: MID * 2 + 9 });
    // The bouncy castle, in the front arm of the road.
    R.thing(CASTLE[0] + CASTLE[2] / 2, CASTLE[1] + CASTLE[3], (ctx, t) => {
      const k = puff(t);
      box(ctx, CASTLE[0], CASTLE[1], 0, CASTLE[2], CASTLE[3], 0.3 + k * 2.2, C.pink, { flat: true, top: C.butter });
      if (k > 0.5) box(ctx, CASTLE[0] - 0.3, CASTLE[1] - 0.3, 0.3 + k * 2.2, 0.8, 0.8, (k - 0.5) * 3, C.blush, { flat: true });
    }, { anim: true });
    block(R, CASTLE[0] + CASTLE[2] + 0.3, CASTLE[1] + 3.8, 0.8, 0.8, 0.7, BLOCK.party, 'Pump');
    // Lamp posts, each with a "Have you seen this goose?" poster; lit at night.
    for (const [x, y] of POSTS) {
      R.thing(x, y, (ctx) => { lampPost(ctx, x, y); poster(ctx, x, y, 2.4); });
      R.light({ at: [x, y, 4.6], r: 3, color: C.butter, k: (t) => nightK(t) });
    }
    // A road sign, a crate of party stuff and a speaker stack by the stage.
    block(R, MAIN0 + 0.4, MID + 3.2, 1.2, 1.2, 1.6, BLOCK.party, 'Speakers');
    block(R, MAIN1 - 1.6, 26, 1.2, 1.8, 0.8, BLOCK.stall, 'Crates');
    dusk(R, nightK);

    pin(R, { id: 'courier-map', label: 'The Courier\'s map', at: [MID - 1.5, 21, 0.05], r: 0.8 }, 1);
    pin(R, { id: 'delivery-slip', label: 'A signed delivery slip', at: [27, MID + 2.8, 0.05], r: 0.8 }, 2);
    pin(R, { id: 'bunting', label: 'A roll of bunting', at: [MAIN1 - 1.2, 25.5, 0.9], r: 0.8 }, 3);
    pin(R, { id: 'lunch', label: 'The Courier\'s lunch', at: [58, MAIN0 + 1.4, 0.05], r: 0.8 }, 4);
  },
};
