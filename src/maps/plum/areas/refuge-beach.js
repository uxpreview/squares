// The Refuge Beach: the refuge's ocean beach, closed from April to August for
// the piping plovers (docs/levels/plum.md). Miles of empty sand for six birds
// on one side of a rope, and everyone else packed onto the open stretch at
// the Lot 1 boardwalk on the other. The plover warden, a volunteer, moves the
// rope out a little every hour, and the crowd shuffles back each time, towels
// and all. Sandy Point at the far end is a state beach, open, with its own
// roped nests.
//
// Greybox: world units, like land.js.
import { C, Q, folk, box } from '../../../engine/art.js';
import { drawLand } from '../../../engine/terrain.js';
import { pin, block } from '../../greybox.js';
import { land, float, h } from '../land.js';
import { level, hour, nightK, sunsetWatch } from '../tide.js';
import { EVENING } from '../style.js';
import { who, sign, tag, umbrella } from '../kit.js';

// The rope: across the beach at x, moved out toward the crowd a step every
// hour from 7am to 7pm, and back first thing.
const rope = (t) => 33.4 + 0.36 * Math.max(0, Math.min(12, Math.floor(hour(t) - 7) + Math.min(1, ((hour(t) % 1) / 0.15))));
const TOE = 43.3;
const shore = (L) => TOE + (0.95 - L) / 0.25;
// The crowd on the open side: where they'd like to be, and a step clear of the rope.
const CROWD = [[35.2, 44.8, 151], [36.8, 46, 153], [38.4, 44.6, 155], [40.2, 46.2, 157], [42, 44.9, 159], [44, 45.8, 161], [46, 44.7, 163]];
const busy = (t) => { const hr = hour(t); return hr >= 8.5 && hr < 18.5; };

export default {
  id: 'refuge-beach',
  name: 'The Refuge Beach',
  blurb: 'Miles of beach for six plovers on one side of a rope, and everyone else on the other.',
  home: [30, 47],
  build(R) {
    drawLand(R, land, { fade: nightK, inks: EVENING, surf: true });
    block(R, 26.5, 44.2, 0.25, 0.25, 2.2, C.white, 'BEACH CLOSED', { size: 0.4 });
    block(R, 14, 44.4, 0.25, 0.25, 2.2, C.white, 'PLOVERS NESTING', { size: 0.4 });

    // The rope and its posts, from the dunes to the water.
    R.mover((t) => ({ x: rope(t), y: 47 }), (ctx, t, p) => {
      const L = level(t);
      for (let y = 43.6; y < shore(L) + 1; y += 1.5) box(ctx, p.x - 0.06, y - 0.06, Math.max(h(p.x, y), L - 0.3), 0.12, 0.12, 1, C.wood, { flat: true });
      if (!Q.lines) return;
      ctx.beginPath();
      for (let y = 43.6; y < shore(L) + 1; y += 0.5) { const z = Math.max(h(p.x, y), L) + 0.85; const X = p.x - y, Y = (p.x + y) / 2 - z * 1.12; y === 43.6 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }
      ctx.strokeStyle = C.coral; ctx.lineWidth = 0.06; ctx.stroke();
    }, { depth: (t) => rope(t) + 44 });

    // The plover warden, a volunteer, walking the rope with a spare stake.
    const warden = folk(171, { top: C.white, bottom: C.brown, hat: 'cap' });
    const walk = (t) => ({ x: rope(t) - 0.6, y: 44.4 + Math.abs(((t / 3) % 6) - 3) * 1.1, dir: (t / 3) % 6 < 3 ? 'l' : 'r' });
    R.mover(walk, (ctx, t, p) => {
      if (!busy(t)) return;
      const z = h(p.x, p.y);
      who(ctx, p.x, p.y, z, warden, 'The plover warden', { pose: 'carry', dir: p.dir, back: p.dir === 'l' }, t);
      box(ctx, p.x + 0.3, p.y - 0.05, Math.max(z, level(t)) + 1.1, 0.1, 0.1, 1.3, C.wood, { flat: true });
    });

    // The crowd, a step clear of the rope and no more.
    CROWD.forEach(([x, y, s], i) => {
      const look = folk(s);
      R.mover((t) => ({ x: Math.max(x, rope(t) + 1.1 + (i % 3) * 0.5), y }), (ctx, t, p) => {
        const z = h(p.x, p.y);
        if (!(level(t) < z - 0.1)) return;
        const watch = sunsetWatch(t);
        if (!busy(t) && !watch) return;
        if (i % 3 === 0 && busy(t)) umbrella(ctx, p.x - 0.6, p.y - 0.4, z, [C.coral, C.teal, C.mustard][i % 3]);
        who(ctx, p.x, p.y, z, look, i === 2 ? 'Shuffling back' : null, { pose: watch ? 'stand' : i % 2 ? 'sit' : 'stand', dir: watch ? 'r' : 'l', back: watch }, t);
      });
    });

    // Six plovers, with all the rest of the beach: running at the water's edge.
    for (let i = 0; i < 6; i++) {
      R.mover((t) => {
        const L = level(t), y = Math.min(56, shore(L) - 0.4 + Math.sin(t * 1.3 + i) * 0.5);
        return { x: 13 + i * 3 + Math.sin(t / 2 + i * 2) * 1.2, y };
      }, (ctx, t, p) => {
        const z = h(p.x, p.y);
        box(ctx, p.x - 0.15, p.y - 0.1, z, 0.3, 0.2, 0.25, C.woodLight, { flat: true });
        if (i === 2 && Q.detail) tag(ctx, p.x, p.y, z + 1, 'Six plovers', { size: 0.34 });
      });
    }

    // Sandy Point, the island's tip: a state beach, open, a few people, and
    // its own little roped square round a nest.
    sign(R, 7.6, 44.2, 'SANDY POINT', 1.8);
    for (const [x, y, s] of [[9.6, 45.2, 261], [10.8, 44.8, 263]]) {
      const look = folk(s);
      R.thing(x, y, (ctx, t) => { if (busy(t) && level(t) < h(x, y) - 0.1) who(ctx, x, y, h(x, y), look, null, { pose: 'sit', dir: 'l' }, t); }, { anim: true });
    }
    R.thing(8.4, 46.2, (ctx) => {
      for (const [x, y] of [[6.6, 44.6], [8.2, 44.6], [6.6, 46], [8.2, 46]]) box(ctx, x - 0.05, y - 0.05, h(x, y), 0.1, 0.1, 0.7, C.wood, { flat: true });
    });

    // The goose, inside the rope with the plovers, trying to look like one.
    R.goose((t) => { const x = 22 + Math.sin(t / 3) * 1.4, y = 45.4; return { x, y, z: float(x, y, t), dir: Math.cos(t / 3) > 0 ? 'r' : 'l', moving: true }; });
    // A sandcastle inside the rope, up by the dunes (the king tide gets it
    // every night, and someone builds it again).
    pin(R, { id: 'sandcastle', label: 'A sandcastle inside the rope', at: [29.4, 44.3, h(29.4, 44.3) + 0.3], r: 0.8 }, 1);
    // The warden's spare stake, stuck in the sand by the top of the rope.
    R.mover((t) => ({ x: rope(t) - 0.5, y: 43.9 }), (ctx, t, p) => box(ctx, p.x - 0.05, p.y - 0.05, h(p.x, p.y), 0.1, 0.1, 1.3, C.wood, { flat: true }));
    pin(R, { id: 'stake', label: 'The warden\'s spare stake', at: (t) => { const x = rope(t) - 0.5; return [x, 43.9, h(x, 43.9) + 1.3]; }, r: 0.8 }, 2);
    pin(R, { id: 'shells', label: 'A shell collection', at: [45.2, 44.3, h(45.2, 44.3) + 0.2], r: 0.8 }, 3);
  },
};
