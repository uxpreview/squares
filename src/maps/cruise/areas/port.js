// The Port (greybox). A tiny palm island off the ship's cut side: a pier,
// the tiki hut gift shop, a steel band, a welcome banner, the harbourmaster
// with the yellow flag. The Courier's tender boat circles it all day. Keep the id.
import { C, Q, folk, disc } from '../../../engine/art.js';
import { block, pin, figure, drawBlock } from '../../greybox.js';
import { INK, hourOf } from '../style.js';

// The tender boat, circling between the pier and the ship, never let alongside.
const tender = (t) => {
  const a = t * 0.35;
  return { x: 9 + Math.cos(a) * 7.5, y: 8 + Math.sin(a) * 6.5, z: 0 };
};

export default {
  id: 'port',
  name: 'The Port',
  blurb: 'The island has been getting ready all day. At six the ship arrives, the yellow flag goes up, and the band plays the welcome anyway.',

  build(R) {
    R.floor((ctx) => {
      disc(ctx, 10, 9.5, 0.3, 5.5, INK.sunYellow);
      disc(ctx, 10.5, 10, 0.4, 3.5, C.leaf);
    });
    block(R, 8.5, 0, 1.4, 5, 0.6, INK.teak, 'PIER');
    block(R, 11, 8, 3, 3, 2.5, INK.teak, 'GIFT SHOP');
    block(R, 7, 10, 0.5, 0.5, 5, C.brown, 'PALM');
    block(R, 9, 0.4, 0.2, 0.2, 4, C.white, 'FLAG');
    R.thing(9.2, 0.6, (ctx, t) => {
      const up = hourOf(t) >= 17.9 ? 1 : 0.15;
      drawBlock(ctx, 9.3, 0.4, 0.6 + 3.2 * up, 1, 0.1, 0.7, INK.sunYellow, '');
    }, { anim: true });
    figure(R, 9.5, 12.5, folk(121), 'Steel band', { pose: 'drum' });
    figure(R, 8.5, 1.5, folk(122), 'Harbourmaster', { dir: 'r' });
    R.mover(tender, (ctx, t, p) => {
      drawBlock(ctx, p.x - 1.2, p.y - 0.6, -0.1, 2.4, 1.2, 0.7, C.white, Q.detail ? 'TENDER' : '');
    });
    pin(R, { id: 'parcel', label: 'A parcel for G. Goose', at: (t) => { const p = tender(t); return [p.x, p.y, 1]; } }, 1);
    pin(R, { id: 'coconut', label: 'A coconut with a face', at: [13.4, 12.2, 0.6] }, 2);
  },
};
