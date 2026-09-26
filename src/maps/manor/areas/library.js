// Library (greybox). The hero and the crime scene: two storeys of books, the
// Lord face down in his birthday trifle, a stuffed bear towering over him,
// and Inspector Pidge questioning the bear. Everyone ends up here at the scream.
import { C, rect, shade } from '../../../engine/art.js';
import { shell, block, pin, figure, paths } from '../../greybox.js';
import { TONE, blockOf, walls, house, lamp, candle, fire, stormWindow, CAST, INK } from '../style.js';
import { DOORS } from '../plan.js';

const T = TONE.library, B = blockOf(T);

export default {
  id: 'library',
  name: 'Library',
  blurb: 'Lord Gooseworth, face down in his own birthday trifle. Inspector Pidge is questioning the bear.',

  build(R) {
    shell(R, { floor: T, name: 'LIBRARY', walls: walls(T, { doors: DOORS.library || [] }) });
    R.rug((ctx) => rect(ctx, 4.5, 4.5, 7.5, 7.5, 0.01, shade(T, 0.3), { stroke: false }));
    paths(R);

    // Two storeys of books, a fireplace between them, a gallery at the upper floor.
    block(R, 0, 1, 1.1, 3.6, 12, B, 'BOOKS');
    block(R, 0, 5, 0.9, 3.4, 2.6, INK.stormNavy, 'FIRE');
    block(R, 0, 8.8, 1.1, 6.2, 12, B, 'BOOKS');
    block(R, 1, 0, 5.4, 1.1, 12, B, 'BOOKS');
    stormWindow(R, 'right', 6.8, 1.6, 2.4, 9.2);
    block(R, 9.8, 0, 5.2, 1.1, 12, B, 'BOOKS');
    block(R, 1.1, 1.1, 1.3, 13.9, 0.3, INK.deepPlum, 'GALLERY', { z: 6.8 });
    block(R, 2.4, 1.1, 12.6, 1.3, 0.3, INK.deepPlum, null, { z: 6.8 });

    // The scene: the body on the table, the bear, a side table, chairs by the fire.
    block(R, 6.5, 6.5, 3, 3, 1.1, blockOf(INK.bone), 'BODY IN TRIFLE');
    figure(R, 8.2, 8.6, CAST.lord.look, null, { z: 1.1, pose: 'lie', dir: 'l' });
    block(R, 3, 10, 1.8, 1.8, 4.4, C.brown, 'BEAR');
    block(R, 12, 3.4, 1.2, 1.2, 1.0, B, 'SIDE TABLE');
    block(R, 2.4, 5.2, 1.1, 1.1, 1.1, INK.oxblood);
    block(R, 2.4, 7.2, 1.1, 1.1, 1.1, INK.oxblood);

    // Light: the fire, a lamp, candles by the body.
    fire(R, 1.2, 6.7, 1.2);
    lamp(R, 13.6, 13.2);
    candle(R, 7, 7, 1.1, 11);
    candle(R, 9.1, 7.2, 1.1, 12);
    R.dark(house.dark);

    // Finds
    pin(R, { id: 'feathers', label: 'Goose feathers on the rug', at: [10.8, 11.4, 0.05], r: 0.8 }, 1);
    pin(R, { id: 'pill-bottle', label: 'A pill bottle with beak marks', at: [7.1, 9.2, 1.25], r: 0.7 }, 2);
    pin(R, { id: 'lipstick-glass', label: 'A wine glass with lipstick', at: [12.6, 4, 1.15], r: 0.7 }, 3);
  },
};
