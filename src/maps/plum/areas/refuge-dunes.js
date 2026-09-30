// The Refuge Dunes: the Parker River refuge behind its beach
// (docs/levels/plum.md). The refuge road, Lot 1 and its boardwalk over the
// dunes, Hellcat's boardwalk out to the observation tower on the marsh side,
// full of birders (and Inspector Pidge with a borrowed scope), a deer in the
// scrub, greenhead traps along the marsh edge. At the north end, the
// gatehouse: the lots fill by mid-morning, the ranger hangs "REFUGE FULL",
// and the line of cars waits all day (day.js). Bikes sail past it. Every
// scope on the tower swings toward a rare bird; it's the goose; by the time
// they've focused, it's somewhere else.
//
// Greybox: world units, like land.js.
import { C, Q, folk, box, tint, alpha } from '../../../engine/art.js';
import { drawLand } from '../../../engine/terrain.js';
import { pin, block, footing } from '../../greybox.js';
import { land, h, LOTS, GATE, BLVD, TRACK, lineDist } from '../land.js';
import { hour, nightK } from '../tide.js';
import { EVENING, GREY } from '../style.js';
import { who, sign, tag, trap, car } from '../kit.js';

const [L0, M0, L1, M1] = LOTS.lot1;
const WALK = 40; // Lot 1's boardwalk, along y, from the lot over the dunes to the beach
const TOWER = [18.6, 28.4]; // the observation tower's back corner, at the end of Hellcat's boardwalk
// The goose's hiding places in the dunes, in turn: it's at each for a while.
const HIDES = [[22.5, 39.6], [28.5, 38.6], [33, 40.2], [25.5, 37.8]];
const gooseAt = (t) => HIDES[Math.floor((((t / 9) % HIDES.length) + HIDES.length) % HIDES.length)];
// The gate closes when the lots are full.
const full = (t) => { const hr = hour(t); return hr >= 9.3 && hr < 17; };
// The refuge road's middle at x (the gravel track), for the bikes.
const trackY = (x) => { let best = BLVD, d = Infinity; for (let y = 29; y < 36; y += 0.1) { const e = lineDist(x, y, TRACK); if (e < d) { d = e; best = y; } } return best; };

export default {
  id: 'refuge-dunes',
  name: 'The Refuge Dunes',
  blurb: 'A gate with a line of cars, a boardwalk to a tower full of birders, and a rare bird that\'s only a goose.',
  home: [30, 34],
  build(R) {
    drawLand(R, land, { fade: nightK, inks: EVENING });
    sign(R, 14, 31.4, 'REFUGE ROAD', 1.2);
    sign(R, 39.7, M0 - 0.4, 'LOT 1', 1.4);

    // The gatehouse, its ranger, and the sign that goes up when the lots fill.
    block(R, GATE - 1.2, BLVD - 2.6, 1.6, 1.2, 2, C.white, null, { top: C.green });
    const ranger = folk(171, { top: C.green, bottom: C.brown, hat: 'cap' });
    R.thing(GATE - 0.4, BLVD - 1.2, (ctx, t) => who(ctx, GATE - 0.6, BLVD - 1.3, h(GATE - 0.6, BLVD - 1.3), ranger, 'The ranger', { pose: full(t) ? 'point' : 'wave', dir: 'r' }, t), { anim: true });
    R.thing(GATE + 0.4, BLVD + 1.8, (ctx, t) => {
      const z = footing(R, GATE, BLVD + 1.4);
      box(ctx, GATE - 0.05, BLVD + 1.4, z, 0.1, 0.1, 1.6, C.wood, { flat: true });
      if (Q.detail) tag(ctx, GATE, BLVD + 1.4, z + 2, full(t) ? 'REFUGE FULL' : 'PARKER RIVER REFUGE · $5', { size: 0.4, fill: full(t) ? alpha(C.coral, 0.95) : C.white });
    }, { anim: true });

    // Bikes, sailing past the line and into the refuge.
    for (const ph of [0, 21, 37]) {
      const look = folk(221 + ph);
      R.mover((t) => {
        const k = (((t + ph) % 44) + 44) % 44 / 44, x = 47.4 - k * 40;
        return { x, y: trackY(x) + 0.5, on: full(t) };
      }, (ctx, t, p) => {
        if (!p.on) return;
        const z = h(p.x, p.y);
        box(ctx, p.x - 0.6, p.y - 0.1, z + 0.3, 1.2, 0.2, 0.3, C.teal, { flat: true });
        who(ctx, p.x, p.y, z + 0.4, look, ph ? null : 'Bikes go in', { pose: 'sit', dir: 'l' }, t);
      });
    }

    // Lot 1, full of birders' cars.
    [37, 38.5, 40.4, 41.9].forEach((x, i) => R.thing(x + 0.5, M0 + 2.6, (ctx, t) => { if (hour(t) >= 7 && hour(t) < 19.5) car(ctx, x, M0 + 1.6, h(x, M0 + 1.6), GREY.car[(i + 3) % 7], 'y'); }, { anim: true }));
    // Its boardwalk: up over the dunes and down to the beach.
    for (let y = M1; y < 43.6; y += 1) {
      const z = Math.max(h(WALK, y), h(WALK, y + 1)) + 0.3;
      R.thing(WALK + 0.7, y + 1, (ctx) => box(ctx, WALK - 0.6, y, z, 1.2, 1, 0.15, tint(C.wood, 0.25), { flat: true }));
    }

    // Hellcat: its little lot, the boardwalk back across the scrub, and the
    // observation tower at the end, full of birders with their scopes.
    const [tx, ty] = TOWER, tz = footing(R, tx, ty, 2.4, 2.4), deck = tz + 5;
    block(R, 23.4, 34, 4.4, 2, 0.05, C.greyLight, 'HELLCAT', { size: 0.4 });
    for (let x = tx + 2.6; x < 26.4; x += 1) {
      const z = Math.max(h(x, 29.4), h(x + 1, 29.4)) + 0.3;
      R.thing(x + 1, 30.1, (ctx) => box(ctx, x, 28.9, z, 1, 1.2, 0.15, tint(C.wood, 0.25), { flat: true }));
    }
    R.thing(tx + 2.4, ty + 2.4, (ctx) => {
      for (const [px, py] of [[tx, ty], [tx + 2.2, ty], [tx, ty + 2.2], [tx + 2.2, ty + 2.2]]) box(ctx, px, py, tz, 0.2, 0.2, 5, C.wood, { flat: true });
      box(ctx, tx - 0.2, ty - 0.2, deck, 2.8, 2.8, 0.25, tint(C.wood, 0.2), { flat: true });
      if (Q.detail) tag(ctx, tx + 1.2, ty + 1.2, deck + 3.6, 'OBSERVATION TOWER', { size: 0.4 });
    });
    const birders = [[tx + 0.5, ty + 0.6, 181, null], [tx + 1.6, ty + 0.7, 183, 'Birders'], [tx + 0.8, ty + 1.9, 185, null], [tx + 2, ty + 1.8, 187, 'Inspector Pidge']];
    birders.forEach(([x, y, s, name]) => {
      const look = folk(s, name === 'Inspector Pidge' ? { top: C.grey, bottom: C.grey } : {});
      R.mover(() => ({ x, y }), (ctx, t) => {
        const hr = hour(t);
        if (hr < 5.5 || hr > 21) return;
        // Every scope points at wherever the goose was a moment ago.
        const [gx] = gooseAt(t - 2);
        who(ctx, x, y, deck + 0.25, look, name, { pose: 'point', dir: gx > x ? 'r' : 'l' }, t);
      }, { bias: 2.6 });
    });
    // More birders on Lot 1's boardwalk.
    for (const [x, y, s] of [[WALK + 0.2, 38.4, 191], [WALK - 0.2, 40.6, 193]]) {
      const look = folk(s);
      R.mover(() => ({ x, y }), (ctx, t) => {
        const hr = hour(t);
        if (hr < 6 || hr > 20.5) return;
        who(ctx, x, y, Math.max(h(x, y), h(x, y + 1)) + 0.45, look, null, { pose: 'point', dir: 'l' }, t);
      }, { bias: 0.8 });
    }

    // Greenhead traps along the marsh edge (the flies are winning).
    for (const [x, y] of [[8.4, 29.8], [26, 28.8], [33.4, 29]]) trap(R, x, y);

    // The goose, popping up in the dunes: never where the scopes are pointing.
    R.goose((t) => { const [x, y] = gooseAt(t); return { x, y, z: h(x, y), dir: 'l', pose: (t / 9) % 1 < 0.15 ? 'honk' : 'stand' }; });
    pin(R, { id: 'lens-cap', label: 'A birder\'s lens cap', at: [WALK + 0.3, 39.6, Math.max(h(WALK, 39.6), h(WALK, 40.6)) + 0.5], r: 0.8 }, 1);
    pin(R, { id: 'deer', label: 'A deer in the dunes', at: [10.5, 35.6, h(10.5, 35.6) + 0.9], r: 1 }, 2);
    pin(R, { id: 'checklist', label: 'A checklist, one bird crossed out', at: [tx + 3.3, ty + 1.2, h(tx + 3.3, ty + 1.2) + 0.1], r: 0.8 }, 3);
  },
};
