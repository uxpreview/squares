// The Center: where the turnpike lands (docs/levels/plum.md). Plum Island
// Boulevard, the residents-only lot (tickets for everyone else), a $20 lot
// across the path with a hand-painted sign, the bait shop with the tide
// times chalked on its board, the ice cream window, king tide warnings
// everyone walks past, the little jetty, and the Center's beach, where
// there's no lifeguard. The greenhead man's swarm finds him in the lot at
// ten (day.js); the Courier knocks on every door here all morning.
//
// Greybox: world units, like land.js.
import { C, Q, folk, box, tint } from '../../../engine/art.js';
import { drawLand } from '../../../engine/terrain.js';
import { pin, block } from '../../greybox.js';
import { land, h, PIKE, BLVD, LOTS } from '../land.js';
import { hour, level, nightK, sunsetWatch } from '../tide.js';
import { EVENING, GREY } from '../style.js';
import { who, sign, tag, house, car, umbrella } from '../kit.js';

const PATH = PIKE; // the beach path, over the dunes from between the lots
const busy = (t) => { const hr = hour(t); return hr >= 9 && hr < 18.8; };
// Cars that stay all day in the lots (the rest come and go, day.js), and
// arrive by nine.
const PARKED = [[55.9, 35.2, 0], [58.6, 35.2, 3], [67.6, 35.2, 5]];
// The jetty's rocks, out from the beach.
const JETTY = Array.from({ length: 7 }, (_, i) => ({ x: 56.6 + i * 0.22, y: 43.4 + i * 1.2, top: 1.35 - i * 0.14 }));

export default {
  id: 'center',
  name: 'The Center',
  blurb: 'Where the turnpike lands: a lot for residents, a lot for $20, the bait shop\'s tide board, and nobody reading it.',
  home: [60, 36],
  build(R) {
    drawLand(R, land, { fade: nightK, inks: EVENING, surf: true });
    sign(R, 57.2, BLVD - 1.6, 'PLUM ISLAND BLVD', 1.3);
    sign(R, 50.6, BLVD - 1.6, 'SUNSET DR', 1.3);

    // Houses behind the boulevard and between the lots and the dunes.
    [[49.2, 27.7], [53.4, 27.6]].forEach(([x, y], i) => house(R, x, y, 2.4, 1.8, (i + 2), { h: 1.8, ridge: 'x' }));
    [[48.6, 36.2], [51.6, 36.6], [65.4, 38.8]].forEach(([x, y], i) => house(R, x, y, 2.4, 2.2, (i + 4), { ridge: i % 2 ? 'x' : 'y' }));

    // The bait shop and its board: today's tides, chalked up, and the king
    // tide at the bottom in capitals.
    block(R, 51.6, 32.8, 3, 2.2, 2.1, C.white, 'BAIT', { top: C.teal });
    block(R, 54.9, 33.6, 0.2, 1.2, 1.5, C.ink, null);
    sign(R, 55, 34.2, 'LOW 12PM · KING TIDE 12:15AM', 2.2);
    // The ice cream window, and its line.
    block(R, 64.8, 28.2, 2.6, 1.6, 2, C.white, 'ICE CREAM', { top: C.pink, size: 0.4 });
    [[65.6, 30.2, 231], [66.8, 30.3, 233], [68, 30.1, 235]].forEach(([x, y, s], i) => {
      const look = folk(s);
      R.thing(x, y, (ctx, t) => {
        const hr = hour(t);
        if (hr < 11 + i * 0.5 || hr > 21.5) return;
        who(ctx, x, y, h(x, y), look, i ? null : 'The line', { pose: i === 1 ? 'read' : 'stand', dir: 'l', back: true }, t);
      }, { anim: true });
    });

    // The lots: residents only (tickets for everyone else), and $20 across the path.
    const [r0, s0] = LOTS.residents, [p0, q0] = LOTS.private;
    sign(R, r0 + 2.6, s0 + 4.6, 'RESIDENTS ONLY', 1.6);
    sign(R, p0 + 4.6, q0 - 0.2, '$20 ALL DAY', 1.6);
    PARKED.forEach(([x, y, c]) => {
      R.thing(x + 0.5, y + 1, (ctx, t) => { const hr = hour(t); if (hr < 8.6 || hr > 19) return; car(ctx, x, y, h(x, y), GREY.car[c], 'y'); }, { anim: true });
    });

    // The warnings: a sign for tonight, and one the town put up for 2030.
    sign(R, PATH - 1.6, 38.4, 'KING TIDE TONIGHT', 1.8);
    sign(R, 57.4, 42.4, '2030 CAME EARLY', 1.6);

    // The beach path: over the dunes from between the lots to the sand.
    for (let y = 37.4; y < 43.4; y += 1) {
      const z = Math.max(h(PATH, y), h(PATH, y + 1));
      R.thing(PATH + 0.7, y + 1, (ctx) => box(ctx, PATH - 0.6, y, z + 0.1, 1.2, 1, 0.15, tint(C.wood, 0.2), { flat: true }));
    }
    sign(R, PATH + 1.4, 42.6, 'NO LIFEGUARD ON DUTY', 1.6);

    // The little jetty: rocks out from the beach, the far ones under at high
    // water (only what's above the water is drawn).
    JETTY.forEach((r, i) => {
      R.thing(r.x + 0.6, r.y + 0.6, (ctx, t) => {
        const z0 = Math.max(h(r.x, r.y) - 0.3, level(t) - 0.02);
        if (z0 < r.top) box(ctx, r.x - 0.6, r.y - 0.6, z0, 1.2, 1.2, r.top - z0, GREY.rock, { flat: true });
        if (i === 0 && Q.detail) tag(ctx, r.x, r.y, r.top + 2, 'THE LITTLE JETTY', { size: 0.36 });
      }, { anim: true });
    });

    // The Center's beach: umbrellas while it's dry and the day's on, and
    // everyone turned round to face the marsh at sunset.
    [[51, 45], [54, 44.6], [59.8, 45.4], [65, 44.8], [67.6, 45.8]].forEach(([x, y], i) => {
      const look = folk(240 + i);
      R.thing(x, y + 0.6, (ctx, t) => {
        const z = h(x, y), dry = level(t) < z - 0.1;
        if (!dry) return;
        if (busy(t)) umbrella(ctx, x, y, z, [C.coral, C.mustard, C.teal][i % 3]);
        if (busy(t) || sunsetWatch(t)) {
          const watch = sunsetWatch(t);
          who(ctx, x + 0.9, y + 0.5, h(x + 0.9, y + 0.5), look, watch && i === 2 ? 'Watching the sunset' : null, { pose: watch ? 'stand' : i % 2 ? 'sit' : 'read', dir: watch ? 'r' : i % 2 ? 'l' : 'r', back: watch }, t);
        }
      }, { anim: true });
    });

    // The goose, at the back of the ice cream line.
    R.goose((t) => ({ x: 69.2, y: 30, z: h(69.2, 30), dir: 'l', pose: Math.sin(t / 2) > 0.8 ? 'honk' : 'stand' }));
    // A parking ticket on a windshield in the residents' lot.
    pin(R, { id: 'ticket', label: 'A parking ticket', at: [PARKED[0][0], PARKED[0][1] - 0.2, h(55.9, 35.2) + 1.3], r: 0.8 }, 1);
    // A beach sticker from 1998, on a bumper in the $20 lot.
    pin(R, { id: 'sticker', label: 'A beach sticker from 1998', at: [PARKED[2][0], PARKED[2][1] + 1, h(67.6, 35.2) + 0.5], r: 0.8 }, 2);
    // A leash with no dog, tied to the path's rail.
    pin(R, { id: 'leash', label: 'A leash with no dog', at: [PATH + 0.8, 40.6, h(PATH + 0.8, 40.6) + 0.6], r: 0.8 }, 3);
  },
};
