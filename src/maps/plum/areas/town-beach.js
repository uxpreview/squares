// The Town Beach: north from the Center to the Point (docs/levels/plum.md).
// Rows of beach houses, the ones on the front up on pilings behind sandbags;
// umbrellas, surfers, a gull after the fries, and the crowd filling the beach
// by noon and gone by dark. One house's stairs end a foot above the sand,
// and every summer its owner nails on another step, with a porch full of
// people ignoring the warning sign. At sunset everyone on the beach turns
// round to face the marsh, backs to the tide climbing the sand behind them.
// The greenhead man runs up and down it all morning (day.js).
//
// Greybox: world units, like land.js.
import { C, Q, folk, box, tint } from '../../../engine/art.js';
import { drawLand } from '../../../engine/terrain.js';
import { pin, block, footing } from '../../greybox.js';
import { land, float, h, BLVD } from '../land.js';
import { level, hour, lowTide, nightK, sunsetWatch } from '../tide.js';
import { EVENING, GREY } from '../style.js';
import { who, sign, tag, umbrella, house } from '../kit.js';

// Where the water's edge is (y) for a level, on this beach (land.js: 0.95 at
// the dune toe, down 0.25 a unit).
const TOE = 43.3;
const shore = (L) => TOE + (0.95 - L) / 0.25;
// The crowd: umbrellas and towels, from mid-morning till the tide chases
// them off (their spot goes under), and a few back for the sunset.
const SPOTS = [[71.6, 44.6], [74.4, 45.6], [77, 44.4], [79.8, 45.4], [85.4, 44.6], [88, 45.8], [90.6, 44.4], [93.4, 45.2]];
const busy = (t) => { const hr = hour(t); return hr >= 9.5 && hr < 18.5; };
// The stubborn house, on the front row.
const STUB = [81.4, 39];

export default {
  id: 'town-beach',
  name: 'The Town Beach',
  blurb: 'Rows of houses on the dunes, a beach full by noon, and a set of stairs that never quite reaches the sand.',
  home: [83, 42],
  build(R) {
    drawLand(R, land, { fade: nightK, inks: EVENING, surf: true });
    sign(R, 88, BLVD - 1.6, 'NORTHERN BLVD', 1.3);

    // Rows of houses: behind the boulevard, two rows in front of it, and the
    // front row up on pilings on the dunes.
    for (let i = 0; i < 7; i++) house(R, 71 + i * 3.4, 27.8, 2.4, 1.8, (i + 1), { h: 1.8, ridge: 'x' });
    for (let i = 0; i < 7; i++) house(R, 70.6 + i * 3.5, 32.6, 2.6, 2.2, i, { ridge: i % 2 ? 'x' : 'y' });
    for (let i = 0; i < 6; i++) house(R, 72.2 + i * 3.8, 35.8, 2.6, 2.2, (i + 3), { ridge: i % 2 ? 'y' : 'x' });
    const FRONT = [71.2, 74.6, 78, STUB[0], 86.2, 89.6, 93];
    FRONT.forEach((x, i) => house(R, x, 39, 2.8, 2.2, (i + 2), { stilts: 1.1, ridge: 'y', label: x === STUB[0] ? 'THE STUBBORN HOUSE' : null }));
    // Sandbags along the front row's toe.
    for (let x = 70.6; x < 95.6; x += 1.2) {
      if (x > STUB[0] - 1 && x < STUB[0] + 3) continue; // (not under the stairs)
      const y = 42.6, z = footing(R, x, y, 1, 0.6);
      R.thing(x + 1, y + 0.6, (ctx) => box(ctx, x, y, z, 1, 0.6, 0.4, tint(C.woodLight, 0.2), { flat: true }));
    }
    // Its stairs: down from the deck toward the sand, ending a foot short;
    // its owner nailing on another step.
    const [sx, sy] = STUB, deck = footing(R, sx, sy, 2.8, 2.2) + 1.1;
    // (A porch out front, on posts.)
    R.thing(sx + 2.8, sy + 3.2, (ctx) => {
      for (const px of [sx + 0.1, sx + 2.6]) box(ctx, px, sy + 3, deck - 1.6, 0.15, 0.15, 1.6, C.wood, { flat: true });
      box(ctx, sx, sy + 2.2, deck - 0.15, 2.8, 1, 0.15, tint(C.wood, 0.2), { flat: true });
    });
    for (let k = 0; k < 5; k++) {
      const y = sy + 3.2 + k * 0.55, z = deck - 0.35 * (k + 1);
      R.thing(sx + 1.6, y + 0.55, (ctx) => box(ctx, sx + 0.8, y, z, 0.8, 0.55, 0.12, tint(C.wood, 0.2), { flat: true }));
    }
    sign(R, sx + 3.4, sy + 4.4, 'DANGER: ERODING DUNE', 1.6);
    const owner = folk(251, { top: C.mustard });
    R.thing(sx + 1.2, sy + 6.4, (ctx, t) => {
      const x = sx + 1.2, y = sy + 6.2;
      who(ctx, x, y, h(x, y), owner, 'Another step', { pose: Math.sin(t * 5) > 0 ? 'point' : 'stand', dir: 'l' }, t);
    }, { anim: true });
    // The porch, full of people ignoring the sign.
    [[sx + 0.5, sy + 2.6, 253], [sx + 1.5, sy + 2.9, 255], [sx + 2.3, sy + 2.5, 257]].forEach(([x, y, s], i) => {
      const look = folk(s);
      R.mover(() => ({ x, y }), (ctx, t) => {
        const hr = hour(t);
        if (hr < 9 || hr > 22.5) return;
        who(ctx, x, y, deck, look, i === 1 ? 'The porch' : null, { pose: i === 1 ? 'cheer' : 'sit', dir: 'l' }, t);
      }, { bias: 2 });
    });

    // Umbrellas and their people, while their spot is dry and the day's on;
    // at sunset, the ones still here stand and face the marsh.
    SPOTS.forEach(([x, y], i) => {
      const look = folk(110 + i);
      R.thing(x, y + 0.6, (ctx, t) => {
        const z = h(x, y);
        if (!(level(t) < z - 0.1)) return;
        const watch = sunsetWatch(t) && i % 2 === 0;
        if (!busy(t) && !watch) return;
        if (busy(t)) umbrella(ctx, x, y, z, [C.coral, C.mustard, C.teal, GREY.pink][i % 4]);
        who(ctx, x + 0.9, y + 0.5, h(x + 0.9, y + 0.5), look, watch && i === 4 ? 'Watching the sunset' : null, { pose: watch ? 'stand' : i % 3 ? 'sit' : 'read', dir: watch ? 'r' : i % 2 ? 'l' : 'r', back: watch }, t);
      }, { anim: true });
    });

    // Surfers, just past the break, wherever it is.
    for (const [x, ph] of [[76, 0], [84, 2.2], [91, 4]]) {
      const look = folk(130 + ph * 3, { top: C.navy, bottom: C.navy });
      R.mover((t) => {
        const L = level(t), y = Math.min(56, shore(L) + 2.4 + Math.sin(t / 3 + ph) * 1);
        return { x: x + Math.sin(t / 7 + ph) * 1.5, y, surfing: Math.sin(t / 3 + ph) < -0.3, on: busy(t) || hour(t) < 8 };
      }, (ctx, t, p) => {
        if (!p.on) return;
        const z = level(t);
        box(ctx, p.x - 0.8, p.y - 0.2, z, 1.6, 0.4, 0.12, C.white, { flat: true });
        who(ctx, p.x, p.y, z + (p.surfing ? 0.12 : -0.9), look, null, { pose: p.surfing ? 'skate' : 'swim' }, t);
      });
    }

    // A gull with a stolen fry, going round and round.
    const gull = (t) => ({ x: 88 + Math.cos(t / 2.2) * 3, y: 47 + Math.sin(t / 2.2) * 1.6, z: 3.4 + Math.sin(t * 1.3) * 0.3 });
    R.mover(gull, (ctx, t, p) => {
      box(ctx, p.x - 0.3, p.y - 0.15, p.z, 0.6, 0.3, 0.25, C.white, { flat: true });
      box(ctx, p.x + 0.25, p.y - 0.05, p.z - 0.05, 0.45, 0.1, 0.08, C.mustard, { flat: true });
    }, { bias: 2 });

    // The goose, under an umbrella, on a towel it didn't bring (when the tide
    // takes the towel, it floats).
    const [gx, gy] = [SPOTS[5][0] + 0.2, SPOTS[5][1] + 0.3];
    R.goose((t) => ({ x: gx, y: gy, z: float(gx, gy, t), pose: level(t) < h(gx, gy) - 0.05 ? 'sit' : 'swim', dir: 'l' }));
    pin(R, { id: 'cooler', label: 'A buried cooler', at: [84.2, 49.2, h(84.2, 49.2) + 0.2], r: 0.8, when: lowTide, note: 'low tide' }, 1);
    pin(R, { id: 'fry', label: 'A stolen french fry', at: (t) => { const p = gull(t); return [p.x + 0.5, p.y, p.z]; }, r: 0.9 }, 2);
    // (It floats off when the tide comes up the beach.)
    pin(R, { id: 'board', label: 'A boogie board', at: (t) => [76.2, 44, float(76.2, 44, t) + 0.15], r: 0.8 }, 3);
  },
};
