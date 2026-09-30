// The Turnpike: the Great Marsh behind the town, and the one road across it
// from the mainland (off the back edge) to the island (docs/levels/plum.md).
// South of the road: the refuge's visitor center and the airfield at the
// mainland end, and mid-causeway the lot where the Pink House stood, a sign
// now, with people still stopping for the photo. North of it: the clam shack
// (Every King Tide Dave's truck parked at it all day, facing the road), the
// greenhead traps (the flies are winning), the Plum Island River behind the
// town, and a restaurant deck at the island end facing the sunset. The
// drawbridge goes up for boats and the road waits; at the king tide the
// road floods by it.
//
// Greybox: world units, like land.js.
import { C, Q, folk, box, tint, shade } from '../../../engine/art.js';
import { drawLand } from '../../../engine/terrain.js';
import { pin, block, footing } from '../../greybox.js';
import { land, float, h, PIKE, RIVER, BRIDGE, DECK, PINK, SHACK, AIRFIELD, VISITOR, DECK_AT, PANNES, LOW_SPOT } from '../land.js';
import { hour, nightK, flicker, pinkWindow, highTide, sunsetWatch } from '../tide.js';
import { EVENING, GREY } from '../style.js';
import { bridgeUp, OPENINGS } from '../day.js';
import { who, trap, sign, tag, boat } from '../kit.js';
import { swim } from '../finale.js';

export default {
  id: 'turnpike',
  name: 'The Turnpike',
  blurb: 'One low road over the marsh, a clam shack, a drawbridge, and the lot where the Pink House stood.',
  home: [PIKE, 12],
  build(R) {
    drawLand(R, land, { fade: nightK, inks: EVENING });
    sign(R, 80, 9, 'THE GREAT MARSH', 1.5);
    sign(R, 84, RIVER, 'PLUM ISLAND RIVER', 1.2);
    sign(R, PIKE - 2.6, 3.4, 'PLUM ISLAND TPKE', 1.6);
    // The warnings nobody reads, either side of the low spot.
    sign(R, PIKE + 2.4, LOW_SPOT[1] + 0.2, 'TURN AROUND, DON\'T DROWN', 1.8);
    sign(R, PIKE - 2.4, LOW_SPOT[0] - 0.6, 'KING TIDE TONIGHT', 1.8);

    // The mainland end: the refuge's visitor center.
    block(R, VISITOR[0], VISITOR[1], 3, 1.6, 1.8, C.greyLight, 'VISITOR CENTER', { top: C.green, size: 0.36 });

    // The airfield: a hangar, a windsock, and the little plane going round.
    const [a0, c0, a1, c1] = AIRFIELD;
    block(R, 50, c1 + 0.6, 3.4, 2, 2.2, C.greyLight, 'PLUM ISLAND AIRPORT', { size: 0.36 });
    block(R, a1 - 0.4, c0 - 0.9, 0.2, 0.2, 2.4, C.white, 'WINDSOCK', { size: 0.32 });
    R.mover((t) => {
      // Round every 50s: taxi out, take off along the strip toward the
      // Sound, gone a while, land, taxi back.
      const k = ((t % 50) + 50) % 50, y = (c0 + c1) / 2;
      if (k < 8) return { x: a1 - 1.5 - k * 0.3, y, z: 0 };
      if (k < 15) { const u = (k - 8) / 7; return { x: a1 - 3.9 - u * (a1 - a0 - 5), y, z: u * u * 5 }; }
      if (k < 30) return { x: a0, y, z: 5, gone: true };
      if (k < 38) { const u = (k - 30) / 8; return { x: a0 + 1 + u * (a1 - a0 - 5), y, z: (1 - u) * (1 - u) * 5 }; }
      return { x: a1 - 4 + (k - 38) * 0.2, y, z: 0 };
    }, (ctx, t, p) => {
      if (p.gone) return;
      const z = h(p.x, p.y) + p.z;
      box(ctx, p.x - 0.8, p.y - 0.25, z + 0.2, 1.6, 0.5, 0.45, C.coral, { flat: true });
      box(ctx, p.x - 0.2, p.y - 1.2, z + 0.5, 0.45, 2.4, 0.1, C.white, { flat: true });
      if (Q.detail) tag(ctx, p.x, p.y, z + 1.6, 'Plane', { size: 0.34 });
    });

    // Where the Pink House stood: the memorial sign on its granite posts,
    // and people stopping for the photo, all day.
    const [px, py] = PINK, gz = footing(R, px - 1.2, py - 1.2, 2.4, 2.4);
    R.thing(px + 1.2, py + 0.4, (ctx) => {
      box(ctx, px - 1, py, gz, 0.35, 0.35, 1.6, C.grey, { flat: true });
      box(ctx, px + 0.9, py, gz, 0.35, 0.35, 1.6, C.grey, { flat: true });
      box(ctx, px - 0.7, py + 0.05, gz + 0.7, 1.7, 0.2, 0.8, GREY.pink, { flat: true });
      if (Q.detail) tag(ctx, px, py, gz + 2.3, 'THE PINK HOUSE', { size: 0.34 });
    });
    const photo = [[px + 1.6, py + 2.8, 81, 'Stopping for the photo'], [px - 0.6, py + 3, 83, null]];
    for (const [x, y, s, name] of photo) {
      const look = folk(s);
      R.thing(x, y, (ctx, t) => {
        const hr = hour(t);
        if (hr < 6.5 || hr > 21) return;
        who(ctx, x, y, h(x, y), look, name, { pose: 'point', dir: 'l', back: true }, t);
      }, { anim: true });
    }
    // At sunset the house flickers back, three times, a second each.
    R.thing(px + 1.8, py + 1.4, (ctx) => {
      box(ctx, px - 1.8, py - 2.4, gz, 3.4, 2.4, 2.6, GREY.pink, { flat: true, top: tint(GREY.pink, 0.2) });
      box(ctx, px - 1.8, py - 2.4, gz + 2.6, 3.4, 2.4, 0.9, shade(GREY.pink, 0.2), { flat: true });
    }, { fade: flicker });

    // The clam shack, its queue, and the poster in its window. Dave's truck is
    // parked on its lot all day, facing the road (day.js).
    const [sx, sy] = SHACK;
    block(R, sx - 0.4, sy - 2, 3, 2.2, 2.2, C.white, 'CLAM SHACK', { top: C.coral });
    sign(R, sx + 1.1, sy + 0.4, 'HAVE YOU SEEN THIS GOOSE?', 1.2);
    const queue = [[sx - 0.2, sy + 1], [sx + 0.9, sy + 1.4], [sx + 1.9, sy + 1.2]];
    queue.forEach(([x, y], i) => {
      const look = folk(70 + i);
      R.thing(x, y, (ctx, t) => {
        const hr = hour(t);
        if (hr < 10.5 || hr > 20.5) return;
        who(ctx, x, y, h(x, y), look, i ? null : 'The queue', { pose: i % 2 ? 'stand' : 'read', dir: 'l', back: true }, t);
      }, { anim: true });
    });

    // The drawbridge: piers in the river, a deck in two leaves that lift for
    // boats, and the memorial flags at its mainland end.
    const [b0, b1] = BRIDGE, mid = (b0 + b1) / 2, L = mid - b0;
    R.thing(PIKE - 1.5, b0, (ctx) => {
      for (const y of [b0 + 0.3, b1 - 0.9]) box(ctx, PIKE - 1.2, y, -1.6, 2.4, 0.6, DECK + 1.5, C.greyLight, { flat: true });
      if (Q.detail) tag(ctx, PIKE + 1.6, mid, DECK + 2.2, 'DRAWBRIDGE', { size: 0.4 });
    });
    R.thing(PIKE + 1.5, b1, (ctx, t) => {
      const k = bridgeUp(t);
      // Each leaf, hinged at its end: flat across when down, standing up when up.
      for (const [y0, s] of [[b0, 1], [b1, -1]]) {
        const len = L * (1 - k) + 0.3 * k, rise = 0.25 * (1 - k) + L * 0.9 * k;
        const y = s > 0 ? y0 : y0 - len;
        box(ctx, PIKE - 1.4, y, DECK - 0.25, 2.8, len, rise, GREY.rock, { flat: true, top: shade(C.grey, 0.1) });
      }
    }, { anim: true });
    for (let i = 0; i < 3; i++) {
      const x = PIKE - 2.4 - i * 0.6, y = b0 - 1.4;
      R.thing(x, y, (ctx) => {
        const z = h(x, y);
        box(ctx, x - 0.04, y - 0.04, z, 0.08, 0.08, 2.2, C.white, { flat: true });
        box(ctx, x - 0.03, y, z + 1.6, 0.06, 0.7, 0.45, [C.red, C.navy, C.coral][i], { flat: true });
      });
    }
    // The boats it opens for: a lobster boat at dawn, a sailboat in the afternoon.
    for (const [[a, b], o] of OPENINGS.map((w, i) => [w, i ? { mast: 3.6, len: 2.8, color: C.white, label: 'A sailboat' } : { cabin: C.teal, len: 2.6, label: 'Lobster boat' }])) {
      R.mover((t) => {
        const hr = hour(t);
        if (hr < a - 0.2 || hr > b + 0.2) return { x: 70, y: RIVER, away: true };
        const u = (hr - (a - 0.2)) / (b - a + 0.4);
        return { x: 94 - u * 45, y: RIVER };
      }, (ctx, t, p) => { if (!p.away) boat(ctx, p.x, p.y, t, { along: 'x', wid: 1, ...o }); });
    }

    // The restaurant deck at the island end, facing the marsh and the sunset.
    const [dx, dy] = DECK_AT;
    R.thing(dx + 1.8, dy + 1.1, (ctx) => {
      for (const [x, y] of [[dx - 1.7, dy - 1], [dx + 1.5, dy - 1], [dx - 1.7, dy + 0.8], [dx + 1.5, dy + 0.8]]) box(ctx, x, y, -1, 0.2, 0.2, 2.1, C.wood, { flat: true });
      box(ctx, dx - 1.8, dy - 1.1, 1.1, 3.6, 2.2, 0.15, tint(C.wood, 0.25), { flat: true });
      if (Q.detail) tag(ctx, dx, dy, 4.2, 'THE DECK', { size: 0.38 });
    });
    [[dx - 1.1, dy - 0.4, 211], [dx, dy + 0.3, 213], [dx + 0.9, dy - 0.5, 215], [dx + 1.2, dy + 0.5, 217]].forEach(([x, y, s], i) => {
      const look = folk(s);
      R.mover(() => ({ x, y }), (ctx, t) => {
        const hr = hour(t);
        if (hr < 11.5 || hr > 23) return;
        const watch = sunsetWatch(t);
        who(ctx, x, y, 1.25, look, i === 1 ? (watch ? 'Watching the sunset' : 'Dinner') : null, { pose: watch ? 'point' : i % 2 ? 'sit' : 'stand', dir: watch ? 'r' : 'l', back: watch }, t);
      }, { bias: 1.5 });
    });

    // Greenhead traps, blue boxes on legs out in the marsh.
    for (const [x, y] of [[53.8, 16.6], [70.5, 4.8], [78.4, 17.2], [86.6, 3.6], [92.2, 12.2], [55.2, 20.6]]) trap(R, x, y);

    // The ending: the geese paddle out to the Courier's van (finale.js).
    swim(R);

    // The goose, at the end of the clam shack's queue (it's been there since
    // they opened).
    R.goose([sx + 3, sy + 1.6, h(sx + 3, sy + 1.6)], { dir: 'l' });
    // A lobster crossing the road, very slowly, both ways.
    pin(R, { id: 'lobster', label: 'A lobster crossing the road', at: (t) => { const x = PIKE + 2.1 * Math.sin(t / 14); return [x, 8.4, float(x, 8.4, t) + 0.2]; }, r: 0.8 }, 1);
    // A car key on a float, bobbing in a salt panne when there's water in it.
    const [kx, ky] = PANNES[0];
    pin(R, { id: 'key', label: 'A car key on a float', at: (t) => [kx + 0.3 * Math.sin(t / 2.7), ky + 0.2 * Math.cos(t / 3.1), float(kx, ky, t) + 0.1], r: 0.8, when: highTide, note: 'high tide' }, 2);
    // The Pink House, back for a moment at sunset.
    pin(R, { id: 'pink-house', label: 'The Pink House, back for a moment', at: [px, py - 1.2, gz + 2], r: 1.1, when: pinkWindow, note: 'sunset' }, 3);
  },
};
