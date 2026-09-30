// The Sound: Plum Island Sound, behind the refuge (docs/levels/plum.md). At
// low water the flats come out and the clammers walk out onto them; at high
// water they're under again and the kayaks come out from the launch across
// from Lot 1. A sailboat ran aground at dawn, and its owner is waiting it
// out on the hull, reading, all day, aground or afloat. The mainland's marsh
// along the back.
//
// Greybox: the Sound is real ground and water (land.js), everything on it
// blocks and labels. World units, like land.js.
import { C, Q, folk, box } from '../../../engine/art.js';
import { drawLand } from '../../../engine/terrain.js';
import { pin } from '../../greybox.js';
import { land, float, h } from '../land.js';
import { level, lowTide, highTide, nightK } from '../tide.js';
import { EVENING } from '../style.js';
import { boat, who, trap, sign, tag } from '../kit.js';

// The sailboat, aground on the flats south of the channel.
const SAIL = [15.6, 21.8];
// The clammers: where they wait on the back beach, and where they dig.
const CLAMMERS = [
  { home: [11, 26.4], dig: [11.6, 22.8], seed: 41 },
  { home: [14, 26.3], dig: [21.4, 23.2], seed: 44 },
  { home: [28, 26.6], dig: [26.4, 23.4], seed: 47 },
];
// How far out the flats are: 0 under water, 1 dry enough to dig.
const out = (t) => Math.max(0, Math.min(1, (-0.5 - level(t)) / 0.25));
const LAUNCH = [40.2, 26.2];

export default {
  id: 'sound',
  name: 'The Sound',
  blurb: 'Plum Island Sound at low water: clammers out on the mud, a sailboat aground, and its owner still sitting on the hull.',
  home: [24, 17],
  build(R) {
    drawLand(R, land, { fade: nightK, inks: EVENING });
    sign(R, 24, 13.2, 'PLUM ISLAND SOUND', 2.5);
    sign(R, 20, 2.4, 'THE GREAT MARSH', 1.4);

    // The sailboat: sits on the mud at low water, floats at high. Its owner
    // sits on the hull all day either way, reading.
    const owner = folk(52, { top: C.sky });
    R.thing(SAIL[0] + 1.5, SAIL[1] + 0.6, (ctx, t) => {
      boat(ctx, SAIL[0], SAIL[1], t, { along: 'x', len: 3.2, wid: 1.2, mast: 4.2, label: 'Aground since dawn' });
      who(ctx, SAIL[0] + 0.6, SAIL[1] + 0.2, float(SAIL[0], SAIL[1], t) + 0.3, owner, 'Its owner, reading', { pose: 'read' }, t);
    }, { anim: true });

    // Clammers walk out as the flats come out, dig, and walk back as the tide
    // comes in.
    CLAMMERS.forEach((c, i) => {
      const look = folk(c.seed, { top: C.mustard, bottom: C.brown });
      R.mover((t) => {
        const k = out(t), x = c.home[0] + (c.dig[0] - c.home[0]) * k, y = c.home[1] + (c.dig[1] - c.home[1]) * k;
        const moving = k > 0.02 && k < 0.98;
        return { x, y, pose: moving ? 'walk' : k >= 0.98 ? 'carry' : 'stand', dir: level(t + 1) < level(t) ? 'l' : 'r' };
      }, (ctx, t, p) => who(ctx, p.x, p.y, h(p.x, p.y), look, i ? null : 'Clammers', p, t));
    });

    // Kayaks: out on the Sound when there's water, pulled up at the launch
    // when there isn't.
    for (const [cx, cy, r, ph, color] of [[30, 14, 4.5, 0, C.coral], [16, 13.5, 3.5, 2, C.teal]]) {
      const look = folk(60 + ph, { top: C.white });
      R.mover((t) => {
        const wet = level(t) > -0.3;
        if (!wet) return { x: LAUNCH[0] - ph, y: LAUNCH[1], beached: true };
        const a = t / 9 + ph;
        return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.6 };
      }, (ctx, t, p) => {
        const z = p.beached ? h(p.x, p.y) : float(p.x, p.y, t);
        box(ctx, p.x - 1.1, p.y - 0.25, z, 2.2, 0.5, 0.3, color, { flat: true });
        if (!p.beached) who(ctx, p.x, p.y, z + 0.1, look, null, { pose: 'sit' }, t);
        if (Q.detail) tag(ctx, p.x, p.y, z + (p.beached ? 1 : 2.6), p.beached ? 'Kayak, waiting' : 'Kayak', { size: 0.34 });
      });
    }
    sign(R, LAUNCH[0] + 2.4, LAUNCH[1], 'KAYAK LAUNCH', 1.2);

    // A heron in the channel, and greenhead traps on the mainland's marsh.
    R.mover((t) => ({ x: 36 + Math.sin(t / 7) * 1.5, y: 12.6 }), (ctx, t, p) => {
      const z = h(p.x, p.y);
      box(ctx, p.x - 0.2, p.y - 0.2, Math.max(z, level(t) - 0.3), 0.4, 0.4, 1.6, C.greyLight, { flat: true });
      if (Q.detail) tag(ctx, p.x, p.y, Math.max(z, level(t)) + 2.3, 'Heron', { size: 0.34 });
    });
    for (const [x, y] of [[10, 3.2], [24, 3.6], [38, 4.4]]) trap(R, x, y);

    // The goose, on the marsh island in the middle of the Sound (at the king
    // tide the island goes under, and it swims).
    R.goose((t) => { const x = 30 + Math.sin(t / 5) * 0.8; return { x, y: 20.4, z: float(x, 20.4, t), dir: Math.cos(t / 5) > 0 ? 'r' : 'l', pose: level(t) > h(x, 20.4) ? 'swim' : 'walk' }; });
    // Finds: two out only at low water, one afloat only at high.
    pin(R, { id: 'boot', label: 'A clammer\'s lost boot', at: [12.4, 22.2, h(12.4, 22.2) + 0.3], r: 0.8, when: lowTide, note: 'low tide' }, 1);
    pin(R, { id: 'bottle', label: 'A message in a bottle', at: [8, 9.4, h(8, 9.4) + 0.2], r: 0.8, when: lowTide, note: 'low tide' }, 2);
    pin(R, { id: 'paddle', label: 'A kayak paddle', at: (t) => [23 + Math.sin(t / 3) * 0.4, 22.6 + Math.cos(t / 4) * 0.3, float(23, 22.6, t) + 0.1], r: 0.8, when: highTide, note: 'high tide' }, 3);
  },
};
