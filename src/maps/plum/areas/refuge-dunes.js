// The Refuge Dunes: the Parker River refuge behind its beach (docs/levels/plum.md).
// Lot 1 on the refuge road, the boardwalk over the dunes to the one open
// stretch of sand, the observation tower full of birders, a deer in the scrub,
// greenhead traps along the marsh edge. Every scope swings toward a rare bird.
// It's the goose. By the time they've focused, it's somewhere else.
//
// Greybox: world units, like land.js.
import { C, Q, folk, box, tint } from '../../../engine/art.js';
import { drawLand } from '../../../engine/terrain.js';
import { pin, block, footing } from '../../greybox.js';
import { land, h, LOTS } from '../land.js';
import { nightK } from '../tide.js';
import { EVENING, GREY } from '../style.js';
import { who, sign, tag, trap, car } from '../kit.js';

const [L0, M0, L1, M1] = LOTS[1]; // Lot 1: 34.5, 23.6 to 41, 27.2
const WALK = 38; // the boardwalk, along y, from the lot over the dunes to the beach
const TOWER = [19, 27.2]; // the observation tower's back corner
// The goose's hiding places in the dunes, in turn: it's at each for a while.
const HIDES = [[10, 33.4], [24.5, 32.6], [31, 34.2], [15.5, 31.8]];
const gooseAt = (t) => HIDES[Math.floor((((t / 9) % HIDES.length) + HIDES.length) % HIDES.length)];

export default {
  id: 'refuge-dunes',
  name: 'The Refuge Dunes',
  blurb: 'Every scope on the tower swings toward a rare bird. It\'s a goose, and it\'s already gone.',
  home: [26, 31],
  build(R) {
    drawLand(R, land, { fade: nightK, inks: EVENING });
    sign(R, 12, 25.6, 'REFUGE ROAD', 1.2);
    sign(R, 37.7, 24.8, 'LOT 1', 1.4);

    // Lot 1, full of birders' cars.
    [35.6, 37.1, 38.6, 40.1].forEach((x, i) => R.thing(x + 0.5, 26.4, (ctx) => car(ctx, x, 25.4, h(x, 25.4), GREY.car[(i + 3) % 7], 'y')));
    // The boardwalk: up over the dunes and down to the beach.
    for (let y = M1; y < 40.6; y += 1) {
      const z = Math.max(h(WALK, y), h(WALK, y + 1)) + 0.3;
      R.thing(WALK + 0.7, y + 1, (ctx) => box(ctx, WALK - 0.6, y, z, 1.2, 1, 0.15, tint(C.wood, 0.25), { flat: true }));
    }
    sign(R, WALK, 30, 'BOARDWALK', 1.6);

    // The observation tower, and the birders up top with their scopes.
    const [tx, ty] = TOWER, tz = footing(R, tx, ty, 2.4, 2.4), deck = tz + 5;
    R.thing(tx + 2.4, ty + 2.4, (ctx) => {
      for (const [px, py] of [[tx, ty], [tx + 2.2, ty], [tx, ty + 2.2], [tx + 2.2, ty + 2.2]]) box(ctx, px, py, tz, 0.2, 0.2, 5, C.wood, { flat: true });
      box(ctx, tx - 0.2, ty - 0.2, deck, 2.8, 2.8, 0.25, tint(C.wood, 0.2), { flat: true });
      if (Q.detail) tag(ctx, tx + 1.2, ty + 1.2, deck + 3.6, 'OBSERVATION TOWER', { size: 0.4 });
    });
    const birders = [[tx + 0.5, ty + 0.6, 181, null], [tx + 1.6, ty + 0.7, 183, 'Birders'], [tx + 0.8, ty + 1.9, 185, null], [tx + 2, ty + 1.8, 187, 'Inspector Pidge']];
    birders.forEach(([x, y, s, name]) => {
      const look = folk(s, name === 'Inspector Pidge' ? { top: C.grey, bottom: C.grey } : {});
      R.mover(() => ({ x, y }), (ctx, t, p) => {
        // Every scope points at wherever the goose was a moment ago.
        const [gx] = gooseAt(t - 2);
        who(ctx, x, y, deck + 0.25, look, name, { pose: 'point', dir: gx > x ? 'r' : 'l' }, t);
      }, { bias: 2.6 });
    });
    // More birders on the boardwalk, and a deer in the scrub.
    for (const [x, y, s] of [[WALK + 0.2, 34, 191], [WALK - 0.2, 36.2, 193]]) {
      const look = folk(s);
      R.mover(() => ({ x, y }), (ctx, t) => who(ctx, x, y, Math.max(h(x, y), h(x, y + 1)) + 0.45, look, null, { pose: 'point', dir: 'l' }, t), { bias: 0.8 });
    }

    // Greenhead traps along the marsh edge (the flies are winning).
    for (const [x, y] of [[5, 23.4], [15.5, 23.8], [27.5, 23.2]]) trap(R, x, y);

    // The goose, popping up in the dunes: never where the scopes are pointing.
    R.goose((t) => { const [x, y] = gooseAt(t); return { x, y, z: h(x, y), dir: 'l', pose: (t / 9) % 1 < 0.15 ? 'honk' : 'stand' }; });
    pin(R, { id: 'lens-cap', label: 'A birder\'s lens cap', at: [WALK + 0.3, 32.5, Math.max(h(WALK, 32.5), h(WALK, 33.5)) + 0.5], r: 0.8 }, 1);
    pin(R, { id: 'deer', label: 'A deer in the dunes', at: [11.5, 29.2, h(11.5, 29.2) + 0.9], r: 1 }, 2);
    pin(R, { id: 'checklist', label: 'A checklist, one bird crossed out', at: [tx + 3.3, ty + 1.2, h(tx + 3.3, ty + 1.2) + 0.1], r: 0.8 }, 3);
  },
};
