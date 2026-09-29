// The Turnpike: the Great Marsh behind the town, and the one low road across
// it from the mainland (off the back edge) to the island (docs/levels/plum.md).
// The clam shack by the road, the airfield on the marsh, greenhead traps (the
// flies are winning), and the lot where the Pink House stood: a sign now, and
// people stopping for the photo. Cars in and out all day; at the king tide the
// road goes under, and every time, someone tries it anyway (day.js).
//
// Greybox: world units, like land.js.
import { C, Q, folk, box, alpha, tint, shade } from '../../../engine/art.js';
import { drawLand } from '../../../engine/terrain.js';
import { pin, block, footing } from '../../greybox.js';
import { land, float, h, PIKE, BRIDGE, DECK, PINK, SHACK, AIRFIELD, CREEKS } from '../land.js';
import { level, hour, highTide, sunset, nightK, SUNSET } from '../tide.js';
import { EVENING, GREY } from '../style.js';
import { who, trap, sign, tag, house } from '../kit.js';
import { swim } from '../finale.js';

// The ghost of the Pink House: there at sunset, easing in and out.
const ghost = (t) => {
  const hr = hour(t);
  if (hr < SUNSET[0] || hr >= SUNSET[1]) return 0;
  return 0.55 * Math.min(1, (hr - SUNSET[0]) / 0.3, (SUNSET[1] - hr) / 0.3);
};

export default {
  id: 'turnpike',
  name: 'The Turnpike',
  blurb: 'One low road over the marsh, a clam shack, a little airfield, and the lot where the Pink House stood.',
  home: [PIKE, 11],
  build(R) {
    drawLand(R, land, { fade: nightK, inks: EVENING });
    sign(R, 66, 14.5, 'THE GREAT MARSH', 1.5);

    // The bridge over the Plum Island River: a deck up on piers.
    const [b0, b1] = BRIDGE, x0 = PIKE - 1.5, x1 = PIKE + 1.5;
    R.thing(x0, b0, (ctx) => {
      for (const y of [b0 + 1.2, (b0 + b1) / 2, b1 - 1.2]) box(ctx, PIKE - 0.9, y - 0.3, -1.6, 1.8, 0.6, DECK + 1.3, C.greyLight, { flat: true });
      box(ctx, x0, b0 - 1.5, 0.4, 3, b1 - b0 + 3, DECK - 0.4, GREY.rock, { flat: true, top: shade(C.grey, 0.1) });
      for (const x of [x0, x1 - 0.15]) box(ctx, x, b0 - 1.2, DECK, 0.15, b1 - b0 + 2.4, 0.5, C.white, { flat: true });
      if (Q.detail) tag(ctx, PIKE, (b0 + b1) / 2, DECK + 1.6, 'The bridge', { size: 0.4 });
    });

    // The clam shack, and its queue down the road.
    block(R, SHACK[0] - 1.8, SHACK[1] - 1.4, 3.2, 2.4, 2.2, C.white, 'CLAM SHACK', { top: C.coral });
    const queue = [[53.5, 4.6], [54.4, 5.4], [53.6, 6.2], [54.6, 7]];
    queue.forEach(([x, y], i) => {
      const look = folk(70 + i);
      R.thing(x, y, (ctx, t) => who(ctx, x, y, h(x, y), look, i ? null : 'The queue', { pose: i % 2 ? 'stand' : 'read', dir: 'l', back: true }, t), { anim: true });
    });

    // Where the Pink House stood: the memorial sign on its granite posts, and
    // people stopping for the photo.
    const [px, py] = PINK, gz = footing(R, px - 1, py - 1, 2, 2);
    R.thing(px + 1.2, py + 0.4, (ctx) => {
      box(ctx, px - 1, py, gz, 0.35, 0.35, 1.6, C.grey, { flat: true });
      box(ctx, px + 0.9, py, gz, 0.35, 0.35, 1.6, C.grey, { flat: true });
      box(ctx, px - 0.7, py + 0.05, gz + 0.7, 1.7, 0.2, 0.8, C.white, { flat: true });
      if (Q.detail) tag(ctx, px, py, gz + 2.3, 'NEVER FORGOTTEN', { size: 0.34 });
    });
    for (const [x, y, s] of [[px + 1.5, py + 3, 81], [px - 0.8, py + 3.2, 83]]) {
      const look = folk(s);
      R.thing(x, y, (ctx, t) => who(ctx, x, y, h(x, y), look, s === 81 ? 'Taking the photo' : null, { pose: 'point', dir: 'l', back: true }, t), { anim: true });
    }
    // At sunset the house shimmers back, for a moment.
    R.thing(px + 1.6, py + 1.6, (ctx) => {
      box(ctx, px - 1.8, py - 2.2, gz, 3.4, 2.4, 2.6, GREY.pink, { flat: true, top: tint(GREY.pink, 0.2) });
      box(ctx, px - 1.8, py - 2.2, gz + 2.6, 3.4, 2.4, 0.9, shade(GREY.pink, 0.2), { flat: true });
    }, { fade: ghost });

    // The airfield: a hangar, a windsock, and the little plane going round.
    const [a0, c0, a1, c1] = AIRFIELD;
    block(R, 70.5, 0.3, 3.6, 2.2, 2.4, C.greyLight, 'HANGAR');
    block(R, a1 - 0.2, c1 + 0.6, 0.2, 0.2, 2.6, C.white, 'WINDSOCK', { size: 0.34 });
    R.mover((t) => {
      // Round every 50s: taxi out, take off along the strip, land, taxi back.
      const k = ((t % 50) + 50) % 50;
      const y = (c0 + c1) / 2;
      if (k < 10) return { x: a0 + 2 + k * 0.3, y, z: 0 };
      if (k < 18) { const u = (k - 10) / 8; return { x: a0 + 5 + u * (a1 - a0 - 6), y, z: u * u * 6 }; }
      if (k < 32) return { x: a1 + 20, y, z: 8, gone: true };
      if (k < 40) { const u = (k - 32) / 8; return { x: a1 - 1 - u * (a1 - a0 - 6), y, z: (1 - u) * (1 - u) * 6 }; }
      return { x: a0 + 5 - (k - 40) * 0.3, y, z: 0 };
    }, (ctx, t, p) => {
      if (p.gone) return;
      const z = h(p.x, p.y) + p.z;
      box(ctx, p.x - 0.8, p.y - 0.25, z + 0.2, 1.6, 0.5, 0.45, C.coral, { flat: true });
      box(ctx, p.x - 0.2, p.y - 1.2, z + 0.5, 0.45, 2.4, 0.1, C.white, { flat: true });
      if (Q.detail) tag(ctx, p.x, p.y, z + 1.6, 'Plane', { size: 0.34 });
    });

    // Greenhead traps, out in the marsh.
    for (const [x, y] of [[47, 14], [62.5, 9.5], [66, 15.5], [77.5, 13.5], [51.2, 8]]) trap(R, x, y);

    // The ending: the geese swim out to the Courier's van (finale.js).
    swim(R);

    // The goose, in the clam shack's queue (it's been there since they opened).
    R.goose([55.3, 7.8, h(55.3, 7.8)], { dir: 'l' });
    // A lobster crossing the road, very slowly, both ways.
    pin(R, { id: 'lobster', label: 'A lobster crossing the road', at: (t) => { const x = PIKE + 2.2 * Math.sin(t / 14); return [x, 9.2, float(x, 9.2, t) + 0.2]; }, r: 0.8 }, 1);
    // A car key on a float, bobbing in the creek when there's water in it.
    const [kx, ky] = [70.2, 12];
    pin(R, { id: 'key', label: 'A car key on a float', at: (t) => [kx + 0.3 * Math.sin(t / 2.7), ky + 0.2 * Math.cos(t / 3.1), float(kx, ky, t) + 0.1], r: 0.8, when: highTide, note: 'high tide' }, 2);
    // The Pink House, back for a moment at sunset.
    pin(R, { id: 'pink-house', label: 'The Pink House, back for a moment', at: [px, py - 1, gz + 2], r: 1.1, when: sunset, note: 'sunset' }, 3);
  },
};
