// The Center: where the turnpike lands (docs/levels/plum.md). The lot by the
// beach path fills by noon, and one car circles it all day looking for a
// space; houses in rows behind the dunes and up on stilts along them; the
// beach sticker booth. The Courier knocks on every door here, all day
// (day.js), and nobody is G. Goose.
//
// Greybox: world units, like land.js.
import { C, Q, folk, box, tint } from '../../../engine/art.js';
import { drawLand } from '../../../engine/terrain.js';
import { pin, block } from '../../greybox.js';
import { land, h, PIKE, LOTS } from '../land.js';
import { hour, nightK } from '../tide.js';
import { EVENING, GREY } from '../style.js';
import { who, sign, tag, house, car } from '../kit.js';

const [L0, M0, L1, M1] = LOTS[0]; // the lot: 55.8, 29 to 63.5, 33
// Houses: behind the boulevard (on the river side), in a row between it and
// the dunes, and up on stilts along the dunes, facing the sea.
const RIVER_SIDE = [46, 50, 64.5, 68.5, 72.5, 76.5];
const ROW = [45.5, 48.6, 51.7, 65.4, 68.5, 71.6, 74.7, 77.8];
const STILTS = [45.4, 48.6, 51.8, 65.8, 69, 72.2, 75.4, 78.4];
// Cars parked in the lot all day (the rest arrive by noon, day.js).
const PARKED = [56.7, 58, 61.9, 63];

export default {
  id: 'center',
  name: 'The Center',
  blurb: 'Where the turnpike lands: one parking lot, full by noon, one car still circling it.',
  home: [60, 30],
  build(R) {
    drawLand(R, land, { fade: nightK, inks: EVENING });
    sign(R, 70, 26.3, 'NORTHERN BLVD', 1.4);

    RIVER_SIDE.forEach((x, i) => house(R, x, 22.9, 2.4, 1.8, GREY.house[(i + 2) % 6], { h: 1.8, ridge: 'x' }));
    ROW.forEach((x, i) => house(R, x, 27.2, 2.6, 2.2, GREY.house[i % 6], { ridge: i % 2 ? 'x' : 'y' }));
    STILTS.forEach((x, i) => house(R, x, 33.1, 2.8, 2.4, GREY.house[(i + 3) % 6], { stilts: 1.1, ridge: 'y', label: i === 3 ? 'On stilts' : null }));

    // The lot, its booth, and the cars that got a space.
    block(R, 55.6, 26.9, 1.4, 1.2, 1.6, C.white, 'STICKERS', { top: C.coral, size: 0.34 });
    const attendant = folk(91, { top: C.coral });
    R.thing(57.3, 28.6, (ctx, t) => who(ctx, 57.3, 28.6, h(57.3, 28.6), attendant, 'Stickers, $25', { pose: 'wave', dir: 'r' }, t), { anim: true });
    PARKED.forEach((x, i) => {
      const y = 30.2;
      R.thing(x + 0.5, y + 1, (ctx) => car(ctx, x, y, h(x, y), GREY.car[i % 7], 'y'));
    });
    // The car that circles the lot all day, looking for a space.
    R.mover((t) => {
      const path = [[L0 - 0.4, 32.4], [L1 + 0.4, 32.4], [L1 + 0.4, 28.4], [L0 - 0.4, 28.4]];
      const lens = path.map((p, i) => Math.hypot(path[(i + 1) % 4][0] - p[0], path[(i + 1) % 4][1] - p[1]));
      const lap = lens.reduce((a, b) => a + b), s = ((t * 1.6) % lap + lap) % lap;
      let u = s, i = 0;
      while (u > lens[i]) u -= lens[i++];
      const [ax, ay] = path[i], [bx, by] = path[(i + 1) % 4], k = u / lens[i];
      return { x: ax + (bx - ax) * k, y: ay + (by - ay) * k, along: Math.abs(bx - ax) > 0.1 ? 'x' : 'y' };
    }, (ctx, t, p) => car(ctx, p.x, p.y, h(p.x, p.y), C.mustard, p.along, 'Still circling', t));

    // The beach path: over the dunes from the lot to the sand.
    for (let y = 33.2; y < 40.4; y += 1) {
      const z = h(60.2, y + 0.5);
      R.thing(60.9, y + 1, (ctx) => box(ctx, 59.6, y, z + 0.15, 1.2, 1, 0.15, tint(C.wood, 0.2), { flat: true }));
    }
    sign(R, 60.2, 36.6, 'BEACH', 1.8);

    // People: unloading, arriving, a kid with a board.
    for (const [x, y, s, pose, name] of [[57.2, 32.9, 93, 'carry', 'Unloading'], [62.6, 33.4, 95, 'walk', null], [64.2, 29.6, 97, 'read', 'Reading the rules']]) {
      const look = folk(s);
      R.thing(x, y, (ctx, t) => who(ctx, x, y, h(x, y), look, name, { pose, dir: 'r' }, t), { anim: true });
    }

    // The goose, up on the roof of a house on stilts.
    const [gx, gy] = [STILTS[4] + 1.4, 34.3];
    // (It sorts in front of the house it's standing on.)
    R.goose((t) => ({ x: gx, y: gy, z: h(gx, gy) + 1.1 + 2.2 + 0.9, dir: 'r', pose: Math.sin(t / 2) > 0.7 ? 'honk' : 'stand' }), { bias: 3.5 });
    pin(R, { id: 'ticket', label: 'A parking ticket', at: [58.2, 30.5, h(58, 30.2) + 1.3], r: 0.8 }, 1);
    pin(R, { id: 'sticker', label: 'A beach sticker from 1998', at: [63, 31.3, h(63, 30.2) + 0.5], r: 0.8 }, 2);
    pin(R, { id: 'leash', label: 'A leash with no dog', at: [59.3, 37.5, h(59.3, 37.5) + 0.6], r: 0.8 }, 3);
  },
};
