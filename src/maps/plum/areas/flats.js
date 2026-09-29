// The Flats: Plum Island Sound, behind the refuge (docs/levels/plum.md). At
// low water the flats come out and the clammers walk out onto them; at high
// water they're under again and the kayaks come out. A sailboat ran aground
// at dawn, and its owner is waiting it out on the hull, all day.
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
const SAIL = [18, 16.6];
// The clammers: where they wait on the back beach, and where they dig.
const CLAMMERS = [
  { home: [8, 21.3], dig: [8.5, 18.2], seed: 41, name: 'Clammer' },
  { home: [11, 21.4], dig: [12.5, 17.4], seed: 44, name: 'Clammer' },
  { home: [27, 21.2], dig: [26, 17.9], seed: 47, name: 'Clammer' },
];
// How far out the flats are: 0 under water, 1 dry enough to dig.
const out = (t) => Math.max(0, Math.min(1, (-0.5 - level(t)) / 0.25));

export default {
  id: 'flats',
  name: 'The Flats',
  blurb: 'Plum Island Sound at low water: clammers out on the mud, a sailboat aground, and its owner still sitting on the hull.',
  home: [22, 14],
  build(R) {
    drawLand(R, land, { fade: nightK, inks: EVENING });
    sign(R, 22, 12.5, 'PLUM ISLAND SOUND', 2.5);

    // The sailboat: sits on the mud at low water, floats at high. Its owner
    // sits on the hull all day either way.
    const owner = folk(52, { top: C.sky });
    R.thing(SAIL[0] + 1.5, SAIL[1] + 0.6, (ctx, t) => {
      boat(ctx, SAIL[0], SAIL[1], t, { along: 'x', len: 3.2, wid: 1.2, mast: 4.2, label: 'Aground since dawn' });
      who(ctx, SAIL[0] + 0.6, SAIL[1] + 0.2, float(SAIL[0], SAIL[1], t) + 0.3, owner, 'Its owner', { pose: 'sit' }, t);
    }, { anim: true });

    // Clammers walk out as the flats come out, dig, and walk back as the tide
    // comes in.
    for (const c of CLAMMERS) {
      const look = folk(c.seed, { top: C.mustard, bottom: C.brown });
      R.mover((t) => {
        const k = out(t), x = c.home[0] + (c.dig[0] - c.home[0]) * k, y = c.home[1] + (c.dig[1] - c.home[1]) * k;
        const moving = k > 0.02 && k < 0.98;
        return { x, y, pose: moving ? 'walk' : k >= 0.98 ? 'carry' : 'stand', dir: level(t + 1) < level(t) ? 'l' : 'r' };
      }, (ctx, t, p) => who(ctx, p.x, p.y, h(p.x, p.y), look, c.name, p, t));
    }

    // Kayaks: out on the Sound when there's water, pulled up on the back
    // beach when there isn't.
    for (const [cx, cy, r, ph, color] of [[26, 11, 4.5, 0, C.coral], [12, 11.5, 3.5, 2, C.teal]]) {
      const look = folk(60 + ph, { top: C.white });
      R.mover((t) => {
        const wet = level(t) > -0.3;
        if (!wet) return { x: cx - 3, y: 20.6, beached: true };
        const a = t / 9 + ph;
        return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.6 };
      }, (ctx, t, p) => {
        const z = p.beached ? h(p.x, p.y) : float(p.x, p.y, t);
        box(ctx, p.x - 1.1, p.y - 0.25, z, 2.2, 0.5, 0.3, color, { flat: true });
        if (!p.beached) who(ctx, p.x, p.y, z + 0.1, look, null, { pose: 'sit' }, t);
        if (Q.detail) tag(ctx, p.x, p.y, z + (p.beached ? 1 : 2.6), p.beached ? 'Kayak, waiting' : 'Kayak', { size: 0.34 });
      });
    }

    // A heron in the channel, and greenhead traps along the marsh islands.
    R.mover((t) => ({ x: 34 + Math.sin(t / 7) * 1.5, y: 9.5 }), (ctx, t, p) => {
      const z = h(p.x, p.y);
      box(ctx, p.x - 0.2, p.y - 0.2, Math.max(z, level(t) - 0.3), 0.4, 0.4, 1.6, C.greyLight, { flat: true });
      if (Q.detail) tag(ctx, p.x, p.y, Math.max(z, level(t)) + 2.3, 'Heron', { size: 0.34 });
    });
    for (const [x, y] of [[4, 2.5], [17, 2.8], [36, 3.4]]) trap(R, x, y);

    // The goose, on the marsh island in the middle of the Sound: dry at any tide.
    // (At the king tide the island goes under, and it swims.)
    R.goose((t) => { const x = 31 + Math.sin(t / 5) * 0.8; return { x, y: 15.6, z: float(x, 15.6, t), dir: Math.cos(t / 5) > 0 ? 'r' : 'l', pose: level(t) > h(x, 15.6) ? 'swim' : 'walk' }; });
    // Finds: two out only at low water, one afloat only at high.
    pin(R, { id: 'boot', label: 'A clammer\'s lost boot', at: [9.2, 17.6, h(9.2, 17.6) + 0.3], r: 0.8, when: lowTide, note: 'low tide' }, 1);
    pin(R, { id: 'bottle', label: 'A message in a bottle', at: [14, 5.6, h(14, 5.6) + 0.2], r: 0.8, when: lowTide, note: 'low tide' }, 2);
    pin(R, { id: 'paddle', label: 'A kayak paddle', at: (t) => [22 + Math.sin(t / 3) * 0.4, 18.4 + Math.cos(t / 4) * 0.3, float(22, 18.4, t) + 0.1], r: 0.8, when: highTide, note: 'high tide' }, 3);
  },
};
