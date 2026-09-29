// The North Point: the island's tip at the mouth of the Merrimack
// (docs/levels/plum.md). The lighthouse, the playground across from it, the
// Point's lot, lobster boats in and out of the river, a sandbar the seals
// take over at low water, and the jetty. The seals take more of the jetty as
// the tide drops, and the fisherman who was there first ends up on the last
// rock.
//
// Greybox: world units, like land.js.
import { C, Q, folk, box, cylinder } from '../../../engine/art.js';
import { drawLand, wade } from '../../../engine/terrain.js';
import { pin, block, footing } from '../../greybox.js';
import { land, float, h, BAR, LOTS } from '../land.js';
import { level, lowTide, nightK } from '../tide.js';
import { EVENING, GREY } from '../style.js';
import { who, sign, tag, boat, car, house } from '../kit.js';

// The jetty: big rocks in a line out from the tip, lower as it goes (the far
// ones go under at high water).
const ROCKS = Array.from({ length: 12 }, (_, i) => ({ x: 98.2 + i * 0.28, y: 38.6 + i * 1.7, top: 1.7 - i * 0.12 }));
// How many seals are out on the jetty: more as the tide drops.
const seals = (t) => Math.round(1 + 6 * Math.max(0, Math.min(1, (0.5 - level(t)) / 1.3)));
const LIGHT = [93.2, 30.8];

export default {
  id: 'north-point',
  name: 'The North Point',
  blurb: 'The lighthouse, the jetty and the seals, who take a bit more of it every time the tide goes out.',
  home: [94, 36],
  build(R) {
    drawLand(R, land, { fade: nightK, inks: EVENING, surf: true });
    sign(R, 95, 8, 'THE MERRIMACK', 2);

    // The lighthouse, and the Point's lot across the road from it.
    const lz = footing(R, LIGHT[0] - 0.9, LIGHT[1] - 0.9, 1.8, 1.8);
    R.thing(LIGHT[0] + 0.9, LIGHT[1] + 0.9, (ctx) => {
      cylinder(ctx, LIGHT[0], LIGHT[1], lz, 0.9, 7, C.white, { flat: true });
      cylinder(ctx, LIGHT[0], LIGHT[1], lz + 7, 0.65, 1.2, C.coral, { flat: true });
      if (Q.detail) tag(ctx, LIGHT[0], LIGHT[1], lz + 9.2, 'LIGHTHOUSE', { size: 0.45 });
    });
    const [L0, M0, L1, M1] = LOTS[2];
    [85.6, 87.1, 88.6].forEach((x, i) => R.thing(x + 0.5, M0 + 2.4, (ctx) => car(ctx, x, M0 + 1.4, h(x, M0 + 1.4), GREY.car[(i + 5) % 7], 'y')));
    // The playground across from it.
    block(R, 85.2, 33.2, 2.6, 1.2, 1.8, C.mustard, 'PLAYGROUND', { size: 0.4 });
    // The last houses on the boulevard.
    [80.6, 83.4].forEach((x, i) => house(R, x, 27.4, 2.4, 2.2, GREY.house[(i + 4) % 6], { ridge: 'x' }));

    // The jetty, rock by rock (each its own thing, so seals sort in). Only
    // what's above the water is drawn: the sea is printed before anything
    // standing in it, so a rock's foot would show through it otherwise.
    ROCKS.forEach((r, i) => {
      R.thing(r.x + 0.7, r.y + 0.7, (ctx, t) => {
        const z0 = Math.max(h(r.x, r.y) - 0.3, level(t) - 0.02);
        if (z0 < r.top) box(ctx, r.x - 0.7, r.y - 0.7, z0, 1.4, 1.4, r.top - z0, GREY.rock, { flat: true });
        if (i === 0 && Q.detail) tag(ctx, r.x, r.y, r.top + 2.8, 'THE JETTY', { size: 0.42 });
      }, { anim: true });
    });
    // Seals, from the middle of the jetty outward, as the tide lets them; and
    // the fisherman, one rock past the last seal.
    for (let n = 0; n < 7; n++) {
      R.mover((t) => { const r = ROCKS[3 + n]; return { x: r.x, y: r.y, on: n < seals(t) }; }, (ctx, t, p) => {
        if (!p.on) return;
        const r = ROCKS[3 + n], z = Math.max(r.top, level(t) - 0.2);
        box(ctx, r.x - 0.45, r.y - 0.25, z, 0.9, 0.5, 0.4, C.grey, { flat: true });
      }, { bias: 0.8 });
    }
    const fisher = folk(201, { top: C.mustard, bottom: C.navy });
    R.mover((t) => { const r = ROCKS[Math.min(11, 3 + seals(t))]; return { x: r.x, y: r.y }; }, (ctx, t, p) => {
      const r = ROCKS.find((q) => q.x === p.x);
      who(ctx, p.x, p.y, r.top, fisher, 'The fisherman', { pose: 'point', dir: 'r' }, t);
    }, { bias: 0.8 });

    // The sandbar in the river: seals on it at low water.
    R.mover(() => ({ x: BAR[0], y: BAR[1] }), (ctx, t) => {
      if (!(level(t) < h(BAR[0], BAR[1]) - 0.05)) return;
      for (let i = 0; i < 4; i++) box(ctx, BAR[0] - 1.8 + i * 1.1, BAR[1] - 0.3 + (i % 2) * 0.5, h(BAR[0], BAR[1]), 0.9, 0.5, 0.4, C.grey, { flat: true });
      if (Q.detail) tag(ctx, BAR[0], BAR[1], h(BAR[0], BAR[1]) + 1.6, 'Seals, sunbathing', { size: 0.36 });
    });
    // Lobster boats in and out of the river.
    for (const [ph, color] of [[0, C.teal], [22, C.coral]]) {
      R.mover((t) => { const k = Math.sin((t + ph) / 11); return { x: 94 + k * 11, y: 17 + Math.cos((t + ph) / 11) * 2, dir: Math.cos((t + ph) / 11) > 0 ? 'x' : 'x' }; }, (ctx, t, p) => boat(ctx, p.x, p.y, t, { along: 'x', len: 2.6, wid: 1.1, cabin: color, label: 'Lobster boat' }));
    }

    // The goose, on the playground's swings.
    R.goose((t) => ({ x: 86.4, y: 34.6, z: footing(R, 85.2, 33.2, 2.6, 1.2) + 1 + Math.abs(Math.sin(t * 1.4)) * 0.3, pose: 'sit', dir: 'r' }), { bias: 1 });
    // A lobster buoy, bobbing in the river mouth.
    pin(R, { id: 'buoy', label: 'A lobster buoy', at: (t) => [101.5 + Math.sin(t / 2) * 0.2, 27.5, float(101.5, 27.5, t) + 0.3], r: 0.8 }, 1);
    // A lure snagged on the side of a rock near the end of the jetty, low
    // enough that it's only out at low water.
    const snag = ROCKS[10];
    pin(R, { id: 'lure', label: 'A lure on the jetty', at: [snag.x + 0.72, snag.y, -0.5], r: 0.8, when: lowTide, note: 'low tide' }, 2);
    // The seal in sunglasses: always the first one out, near the start of the jetty.
    pin(R, { id: 'seal', label: 'A seal wearing sunglasses', at: [ROCKS[3].x, ROCKS[3].y, ROCKS[3].top + 0.6], r: 0.8 }, 3);
  },
};
