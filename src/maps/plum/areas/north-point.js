// The North Point: the island's tip at the mouth of the Merrimack
// (docs/levels/plum.md). The lighthouse on the river side and the playground
// across from it, the Point's lot, the Basin behind, the lifeguard stands
// (the only lifeguards on the island) with a chalkboard of today's tides,
// lobster boats and the whale watch boat through the river mouth, and the
// jetty out into the Atlantic. At dawn the fishermen cast off the Point and
// the jetty on the falling tide; as the water drops, two or three seals haul
// out on the rocks, one spot at a time, until the last fisherman is on the
// last rock with a seal.
//
// Greybox: world units, like land.js.
import { C, Q, folk, box, cylinder } from '../../../engine/art.js';
import { drawLand } from '../../../engine/terrain.js';
import { pin, block, footing } from '../../greybox.js';
import { land, float, h, BASIN, LOTS } from '../land.js';
import { level, hour, lowTide, nightK } from '../tide.js';
import { EVENING, GREY } from '../style.js';
import { who, sign, tag, boat, car, house } from '../kit.js';

// The jetty: big rocks in a line out from the island's north-east corner,
// lower as it goes (the far ones go under at high water).
const ROCKS = Array.from({ length: 11 }, (_, i) => ({ x: 104.6 + i * 0.2, y: 41.4 + i * 1.4, top: 1.7 - i * 0.12 }));
// Seals: how many are out (0 to 3), more as the tide drops, and gone again
// when it's back up the rocks. The first (in sunglasses) stays all day.
const seals = (t) => Math.round(3 * Math.max(0, Math.min(1, (0.3 - level(t)) / 0.9)));
const SEAL_ROCKS = [4, 6, 8];
// The fishermen: out from 5 to 9am, one of them one rock past the last seal.
const dawn = (t) => { const hr = hour(t); return hr >= 5 && hr < 9; };
const LIGHT = [101.8, 28.6];
const guards = (t) => { const hr = hour(t); return hr >= 9 && hr < 17.5; };

export default {
  id: 'north-point',
  name: 'The North Point',
  blurb: 'The lighthouse, the only lifeguards on the island, and a jetty the seals are slowly taking over.',
  home: [103, 36],
  build(R) {
    drawLand(R, land, { fade: nightK, inks: EVENING, surf: true });
    sign(R, 104, 6, 'THE MERRIMACK', 2);
    sign(R, BASIN[0], BASIN[1], 'THE BASIN', 1.2);

    // The lighthouse on the river side, and the playground across the road.
    const lz = footing(R, LIGHT[0] - 0.9, LIGHT[1] - 0.9, 1.8, 1.8);
    R.thing(LIGHT[0] + 0.9, LIGHT[1] + 0.9, (ctx) => {
      cylinder(ctx, LIGHT[0], LIGHT[1], lz, 0.9, 7, C.white, { flat: true });
      cylinder(ctx, LIGHT[0], LIGHT[1], lz + 7, 0.65, 1.2, C.coral, { flat: true });
      if (Q.detail) tag(ctx, LIGHT[0], LIGHT[1], lz + 9.2, 'PLUM ISLAND LIGHT', { size: 0.42 });
    });
    block(R, 102.6, 33.8, 2.6, 1.2, 1.8, C.mustard, 'PLAYGROUND', { size: 0.4 });
    const [l0, m0] = LOTS.point;
    [l0 + 0.4, l0 + 3.2].forEach((x, i) => R.thing(x + 0.5, m0 + 2.4, (ctx) => car(ctx, x, m0 + 1.4, h(x, m0 + 1.4), GREY.car[(i + 5) % 7], 'y')));
    house(R, 97, 27.4, 2.4, 2, GREY.house[4], { ridge: 'x' });

    // The lifeguard stands, ocean side and river side, and their chalkboard
    // of today's tides.
    for (const [x, y, s, name] of [[103.2, 42.4, 101, 'Lifeguard'], [99.6, 24.8, 103, null]]) {
      block(R, x - 0.5, y - 0.5, 1, 1, 2.4, C.white, null, { top: C.coral });
      const look = folk(s, { top: C.coral, bottom: C.coral });
      R.thing(x + 0.6, y + 0.6, (ctx, t) => { if (guards(t)) who(ctx, x, y, h(x, y) + 2.4, look, name, { pose: 'sit', dir: 'r' }, t); }, { anim: true });
    }
    block(R, 101.8, 41.6, 1.4, 0.2, 1.4, C.ink, null);
    sign(R, 102.5, 41.7, 'TODAY: LOW 12PM · KING TIDE 12:15AM', 2);

    // The jetty, rock by rock (each its own thing, so seals sort in). Only
    // what's above the water is drawn.
    ROCKS.forEach((r, i) => {
      R.thing(r.x + 0.7, r.y + 0.7, (ctx, t) => {
        const z0 = Math.max(h(r.x, r.y) - 0.3, level(t) - 0.02);
        if (z0 < r.top) box(ctx, r.x - 0.7, r.y - 0.7, z0, 1.4, 1.4, r.top - z0, GREY.rock, { flat: true });
        if (i === 0 && Q.detail) tag(ctx, r.x, r.y, r.top + 2.8, 'THE JETTY', { size: 0.42 });
      }, { anim: true });
    });
    // Seals, from the middle of the jetty outward, as the tide lets them.
    SEAL_ROCKS.forEach((ri, n) => {
      const r = ROCKS[ri];
      R.mover(() => ({ x: r.x, y: r.y }), (ctx, t) => {
        if (n > 0 && n >= seals(t)) return;
        const z = Math.max(r.top, level(t) - 0.2);
        box(ctx, r.x - 0.45, r.y - 0.25, z, 0.9, 0.5, 0.4, C.grey, { flat: true });
        if (n === 0) box(ctx, r.x - 0.1, r.y + 0.2, z + 0.25, 0.35, 0.1, 0.1, C.ink, { flat: true });
      }, { bias: 0.8 });
    });
    // The fishermen: one on the Point's beach, one on the jetty, a rock past
    // the last seal.
    const fisher = folk(201, { top: C.mustard, bottom: C.navy });
    R.mover((t) => { const r = ROCKS[Math.min(10, SEAL_ROCKS[Math.max(0, seals(t) - 1)] + 1)]; return { x: r.x, y: r.y, top: r.top }; }, (ctx, t, p) => {
      if (dawn(t)) who(ctx, p.x, p.y, p.top, fisher, 'The fisherman', { pose: 'point', dir: 'r' }, t);
    }, { bias: 0.8 });
    const fisher2 = folk(205, { top: C.teal, bottom: C.navy });
    R.thing(107.2, 36.6, (ctx, t) => { if (dawn(t)) who(ctx, 107.2, 36.6, h(107.2, 36.6), fisher2, null, { pose: 'point', dir: 'r' }, t); }, { anim: true });

    // Lobster boats and the whale watch boat, in and out of the river mouth.
    for (const [ph, o] of [[0, { cabin: C.teal, label: 'Lobster boat' }], [17, { cabin: C.coral, label: null }], [31, { cabin: C.white, len: 4, wid: 1.4, color: C.navy, label: 'Whale watch' }]]) {
      R.mover((t) => { const k = Math.sin((t + ph) / 12); return { x: 104 + k * 6.5, y: 15.6 + Math.cos((t + ph) / 12) * 1.6 }; }, (ctx, t, p) => boat(ctx, p.x, p.y, t, { along: 'x', len: 2.6, wid: 1.1, ...o }));
    }

    // The goose, on the playground's swings.
    R.goose((t) => ({ x: 103.8, y: 35.2, z: footing(R, 102.6, 33.8, 2.6, 1.2) + 1 + Math.abs(Math.sin(t * 1.4)) * 0.3, pose: 'sit', dir: 'r' }), { bias: 1 });
    // A lobster buoy, bobbing off the Point.
    pin(R, { id: 'buoy', label: 'A lobster buoy', at: (t) => [109.6 + Math.sin(t / 2) * 0.2, 30.5, float(109.6, 30.5, t) + 0.3], r: 0.8 }, 1);
    // A lure snagged on the side of a rock near the end of the jetty, low
    // enough that it's only out at low water.
    const snag = ROCKS[9];
    pin(R, { id: 'lure', label: 'A lure on the jetty', at: [snag.x + 0.72, snag.y, -0.5], r: 0.8, when: lowTide, note: 'low tide' }, 2);
    // The seal in sunglasses: always the first one out.
    const s0 = ROCKS[SEAL_ROCKS[0]];
    pin(R, { id: 'seal', label: 'A seal wearing sunglasses', at: [s0.x, s0.y, s0.top + 0.6], r: 0.8 }, 3);
  },
};
