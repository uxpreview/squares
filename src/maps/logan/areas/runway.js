// The Runway (greybox): along the front of the airport, on the harbor. The
// runway's land starts at the shore (x 16); left of it, the approach light
// pier walks out over the water on the runway's line, a plane spotter on its
// end. Planes land over the harbor and take off on the clock (none in the
// ground stop). The windsock, the fire crew's truck, bird control's cannon,
// gulls on the runway and the goose among them. Running gag: after dark a line
// of plows sweeps the runway side by side, again and again.
import { C, folk } from '../../../engine/art.js';
import { ground, block, pin, figure, drawBlock } from '../../greybox.js';
import { TONE, INK, line, water, run } from '../style.js';
import { drawPlane } from '../kit.js';
import { W, D, FRONT, SHORE, SEAWALL, STRIP, CENTER } from '../plan.js';
import { dark, stopped, flying } from '../clock.js';

// Planes on the runway by day: one lands every 30 seconds (rolling out to the
// right), and between them one takes off (to the left, over the pier). None
// from the ground stop on: the night's only flight is Flight 1 (day.js).
function traffic(t) {
  if (!flying(t)) return null;
  const k = ((t % 30) + 30) % 30;
  if (k < 12) return { x: STRIP[0] + (k / 12) * 60, z: Math.max(0, 3 - k * 0.6), name: 'LANDING' };
  if (k >= 15 && k < 27) { const u = (k - 15) / 12; return { x: STRIP[2] - 14 - u * 70, z: Math.max(0, (u - 0.6) * 9), name: 'TAKEOFF' }; }
  return null;
}
// The plows after dark: five side by side, down the runway and back.
function plows(t) {
  const k = ((t % 40) + 40) % 40 / 40;
  const u = k < 0.5 ? k * 2 : 2 - k * 2;
  return STRIP[0] + 4 + u * (STRIP[2] - STRIP[0] - 12);
}

export default {
  id: 'runway',
  name: 'The Runway',
  blurb: 'The one runway, its end out on a pier over the harbor. The gulls own it, the plows sweep it, and the goose thinks it\'s cleared for takeoff.',
  describe: 'A runway along the water, its end on a pier of lights walking out over the harbor, with a plane spotter at the end. Planes land and take off, a windsock turns, a fire truck waits, and gulls stand about on the grass. After dark, a line of snowplows sweeps the runway back and forth.',

  build(R) {
    ground(R, { floor: TONE.grass, grid: false, name: 'THE RUNWAY', nameAt: [66, 49.6] });
    R.rug((ctx) => {
      // The harbor under the pier and along the seawall.
      water(ctx, 0, FRONT, SHORE, D - FRONT);
      water(ctx, SHORE, SEAWALL, W - SHORE, D - SEAWALL);
      // The runway, its centerline and its numbers.
      line(ctx, STRIP[0], STRIP[1], STRIP[2] - STRIP[0], STRIP[3] - STRIP[1], TONE.strip);
      for (let x = STRIP[0] + 5; x < STRIP[2] - 5; x += 3) line(ctx, x, CENTER - 0.08, 1.6, 0.16, C.white);
    });
    // The seawall, the numbers at each end.
    run(R, SHORE, SEAWALL - 0.4, W - SHORE, 0.4, 0.3, C.grey, null);
    block(R, STRIP[0] + 0.6, CENTER - 0.8, 1.6, 1.6, 0.05, C.white, '33L');
    block(R, STRIP[2] - 2.2, CENTER - 0.8, 1.6, 1.6, 0.05, C.white, '15R');

    // The approach light pier, out over the water on the runway's line.
    for (let x = 1; x < SHORE; x += 2) {
      block(R, x, CENTER - 0.3, 0.6, 0.6, 0.6, C.grey, null);
      block(R, x - 0.2, CENTER - 1.2, 1, 2.4, 0.15, INK.signal, null, { z: 0.6 });
    }
    run(R, 0.6, CENTER - 0.6, SHORE - 0.6, 1.2, 0.15, C.wood, 'LIGHT PIER', { z: 0.45 });
    figure(R, 3.4, CENTER + 0.3, folk(250, { top: C.mustard }), 'SPOTTER', { z: 0.6 });
    pin(R, { id: 'spotter', label: 'A plane spotter', at: [3.4, CENTER + 0.3, 3.4], r: 0.9 }, 1);
    // A seal on the rocks by the seawall, and a swan in the harbor in November: not the goose.
    block(R, 22, SEAWALL + 0.6, 2, 1.2, 0.4, C.grey, null);
    pin(R, { id: 'seal', label: 'A seal', at: [23, SEAWALL + 1.2, 0.7], r: 0.8 }, 2);
    block(R, 22.4, SEAWALL + 0.8, 1.2, 0.6, 0.5, C.brown, 'SEAL', { z: 0.4 });
    R.decoy({ id: 'swan', at: [44, SEAWALL + 1.6, 0.5], r: 0.8, say: 'A swan. In November. Lost.' });
    block(R, 43.6, SEAWALL + 1.4, 0.8, 0.5, 0.6, C.white, 'SWAN');

    // Uncle Ray: a box that fell off a cart, by the seawall. He always wanted to see the runway.
    block(R, 58, SEAWALL - 1.6, 1, 0.8, 0.6, C.woodLight, null);
    pin(R, { id: 'ray', label: 'Uncle Ray', kind: 'hard', at: [58.5, SEAWALL - 1.2, 0.8], r: 0.7, riddle: 'Fell off a cart. Very calm about it.', hint: 'A box near the seawall has a name on it.' }, 3);

    // The windsock (the thing a first visit is nudged to tap), bird control's cannon.
    block(R, 64, FRONT + 1, 0.3, 0.3, 3, C.navy, null);
    R.thing(64.6, FRONT + 1.2, (ctx, t) => drawBlock(ctx, 64.3, FRONT + 1, 2.6, 1.4 + Math.sin(t) * 0.3, 0.5, 0.5, INK.safety, 'WINDSOCK'), { anim: true });
    R.poke({ id: 'windsock', at: [65, FRONT + 1.2, 3], r: 0.9, say: 'Wind: yes.', teach: true });
    block(R, 36, FRONT + 0.8, 1.4, 1, 0.9, C.grey, 'BIRD CANNON');
    R.poke({ id: 'cannon', at: [36.7, FRONT + 1.3, 1.1], r: 0.9, say: 'BANG. Every gull gone. Nearly.', sound: 'nope' });

    // The fire crew's truck, and the dalmatian in the cab.
    const truck = R.poke({ id: 'fire-truck', at: [80, FRONT + 1.6, 1.4], r: 0.9, say: 'Drill in five. Or ten.' });
    R.thing(80, FRONT + 1.4, (ctx) => drawBlock(ctx, 78, FRONT + 0.6, 0, 4, 1.8, 1.8 - truck.k() * 0.6, C.red, 'FIRE'), { anim: true });
    pin(R, { id: 'dalmatian', label: 'A dalmatian', kind: 'poke', inside: truck, at: [80, FRONT + 1.6, 2.2], r: 0.7, hint: 'The fire truck\'s cab has a spotty passenger.' }, 4);

    // Gulls on the runway's far end, and the goose walking the centerline among them.
    [[88, 51.4], [90.4, 53.8], [93, 51.2], [95.6, 54], [97.4, 51.8], [99, 53.6], [91.6, 50.8]].forEach(([x, y]) => block(R, x, y, 0.6, 0.4, 0.5, C.white, null));
    R.goose((t) => ({ x: 92 + Math.sin(t * 0.25) * 4, y: CENTER, z: 0, dir: Math.cos(t * 0.25) > 0 ? 'r' : 'l', moving: true }),
      { kind: 'hard', hint: 'Cleared for takeoff, it thinks.' });

    // Traffic by day, the plows after dark.
    R.mover((t) => { const p = traffic(t); return p ? { x: p.x, y: CENTER, z: p.z, name: p.name } : { x: -50, y: CENTER, z: 0, gone: true }; },
      (ctx, t, p) => { if (!p.gone) drawPlane(ctx, p.x, CENTER, 0, 'x', { z: p.z, livery: p.name === 'LANDING' ? 'jetblew' : 'northeast', dir: p.name === 'LANDING' ? 1 : -1 }); });
    R.mover((t) => ({ x: plows(t), y: CENTER, on: dark(t) && stopped(t) }), (ctx, t, p) => {
      if (!p.on) return;
      for (let i = 0; i < 5; i++) drawBlock(ctx, p.x + i * 0.7, STRIP[1] + 0.2 + i * 0.9, 0, 1.4, 0.8, 1, INK.safety, i === 2 ? 'PLOWS' : null);
    });
  },
};
