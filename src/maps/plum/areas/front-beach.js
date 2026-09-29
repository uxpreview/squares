// The Front Beach: the town beach (docs/levels/plum.md). It fills by noon,
// when the tide's out and the beach is at its widest, and empties as the tide
// comes in and eats it; at the king tide it's gone up to the dunes. A
// lifeguard, surfers, a swarm of greenheads chasing one man up and down, gulls
// after the fries, and a beach house that met the ocean.
//
// Greybox: world units, like land.js.
import { C, Q, folk, box, disc, alpha } from '../../../engine/art.js';
import { drawLand, wade } from '../../../engine/terrain.js';
import { pin, block } from '../../greybox.js';
import { land, float, h } from '../land.js';
import { level, hour, lowTide, nightK } from '../tide.js';
import { EVENING, GREY } from '../style.js';
import { who, sign, tag, umbrella, house } from '../kit.js';

// Where the water's edge is (y) for a level, on this beach (land.js's beach: 0.95
// at the dune toe, down 0.15 a unit).
const TOE = 39.6;
const shore = (L) => TOE + (0.95 - L) / 0.15;
// The crowd: umbrellas and towels on the upper beach, there from mid-morning
// till the tide chases them off (their spot goes under), and back by the dunes.
const SPOTS = [[47.5, 43.6], [50.5, 44.8], [53, 43.2], [55.8, 44.3], [64.5, 43.8], [67.2, 45], [70, 43.5], [72.8, 44.6], [75.4, 43.4], [78, 44.2]];
const busy = (t) => { const hr = hour(t); return hr >= 9.5 && hr < 18.5; };

export default {
  id: 'front-beach',
  name: 'The Front Beach',
  blurb: 'The town beach at low tide: everyone on it by noon, and everyone off it by the time the tide comes back.',
  home: [60, 47],
  build(R) {
    drawLand(R, land, { fade: nightK, inks: EVENING, surf: true });
    sign(R, 62, 42.6, 'TOWN BEACH', 2.4);

    // The lifeguard, up in the chair.
    block(R, 61.4, 44, 1, 1, 2.6, C.white, null, { top: C.coral });
    const guard = folk(101, { top: C.coral, bottom: C.coral });
    R.thing(62.4, 45.1, (ctx, t) => who(ctx, 61.9, 44.5, h(61.9, 44.5) + 2.6, guard, 'Lifeguard', { pose: 'sit', dir: 'r' }, t), { anim: true });

    // Umbrellas and their people, while their spot is dry and the day's on.
    SPOTS.forEach(([x, y], i) => {
      const look = folk(110 + i);
      const on = (t) => busy(t) && level(t) < h(x, y) - 0.1;
      R.thing(x, y + 0.6, (ctx, t) => {
        if (!on(t)) return;
        const z = h(x, y);
        umbrella(ctx, x, y, z, [C.coral, C.mustard, C.teal, GREY.pink][i % 4]);
        who(ctx, x + 0.9, y + 0.5, h(x + 0.9, y + 0.5), look, null, { pose: i % 3 ? 'sit' : 'read', dir: i % 2 ? 'l' : 'r' }, t);
      }, { anim: true });
    });

    // The beach house that met the ocean: tipped off its stilts onto the sand.
    R.thing(49.5, 42.8, (ctx) => {
      const z = h(48.5, 42);
      ctx.save();
      box(ctx, 46.2, 40.6, z - 0.2, 2.8, 2.2, 2, C.greyLight, { flat: true });
      box(ctx, 46.2, 40.6, z + 1.8, 2.8, 2.2, 0.35, GREY.roof[1], { flat: true });
      ctx.restore();
      if (Q.detail) tag(ctx, 47.6, 41.7, z + 3, 'Met the ocean', { size: 0.38 });
    });

    // Surfers, just past the break, wherever it is.
    for (const [x, ph] of [[57, 0], [66, 2.2], [71, 4]]) {
      const look = folk(130 + ph * 3, { top: C.navy, bottom: C.navy });
      R.mover((t) => {
        const L = level(t), y = shore(L) + 2.6 + Math.sin(t / 3 + ph) * 1.2;
        return { x: x + Math.sin(t / 7 + ph) * 1.5, y, surfing: Math.sin(t / 3 + ph) < -0.3 };
      }, (ctx, t, p) => {
        const z = level(t);
        box(ctx, p.x - 0.8, p.y - 0.2, z, 1.6, 0.4, 0.12, C.white, { flat: true });
        who(ctx, p.x, p.y, z + (p.surfing ? 0.12 : -0.9), look, null, { pose: p.surfing ? 'skate' : 'swim' }, t);
      });
    }

    // Greenheads: a swarm that chases one man up and down the beach, all day.
    const chased = folk(141, { top: C.white, bottom: C.coral });
    R.mover((t) => {
      const k = Math.sin(t / 4);
      return { x: 60 + k * 12, y: 42.4 + Math.cos(t / 3) * 0.4, dir: Math.cos(t / 4) > 0 ? 'r' : 'l' };
    }, (ctx, t, p) => {
      const z = h(p.x, p.y);
      who(ctx, p.x, p.y, z, chased, 'Being chased', { pose: 'run', dir: p.dir }, t);
      if (!Q.detail) return;
      for (let i = 0; i < 14; i++) {
        const a = t * 6 + i * 2.1, r = 0.6 + (i % 4) * 0.25;
        disc(ctx, p.x - (p.dir === 'r' ? 1 : -1) * (0.8 + Math.cos(a) * r), p.y + Math.sin(a) * r * 0.6, z + 1.6 + Math.sin(a * 1.3) * 0.5, 0.07, C.ink, { stroke: false });
      }
    });

    // A gull with a stolen fry, going round and round.
    const gull = (t) => ({ x: 69 + Math.cos(t / 2.2) * 3, y: 46 + Math.sin(t / 2.2) * 1.8, z: 3.4 + Math.sin(t * 1.3) * 0.3 });
    R.mover(gull, (ctx, t, p) => {
      box(ctx, p.x - 0.3, p.y - 0.15, p.z, 0.6, 0.3, 0.25, C.white, { flat: true });
      box(ctx, p.x + 0.25, p.y - 0.05, p.z - 0.05, 0.45, 0.1, 0.08, C.mustard, { flat: true });
    }, { bias: 2 });

    // The goose, under an umbrella, on a towel it didn't bring.
    // (When the tide takes its towel, it floats.)
    R.goose((t) => ({ x: 70.8, y: 44.4, z: float(70.8, 44.4, t), pose: level(t) < h(70.8, 44.4) - 0.05 ? 'sit' : 'swim', dir: 'l' }));
    pin(R, { id: 'cooler', label: 'A buried cooler', at: [55, 48.6, h(55, 48.6) + 0.2], r: 0.8, when: lowTide, note: 'low tide' }, 1);
    pin(R, { id: 'fry', label: 'A stolen french fry', at: (t) => { const p = gull(t); return [p.x + 0.5, p.y, p.z]; }, r: 0.9 }, 2);
    // (It floats off when the tide comes up the beach.)
    pin(R, { id: 'board', label: 'A boogie board', at: (t) => [76.4, 42.9, float(76.4, 42.9, t) + 0.15], r: 0.8 }, 3);
  },
};
