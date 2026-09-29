// The Refuge Beach: the refuge's ocean beach, closed from April to August for
// the piping plovers (docs/levels/plum.md). Miles of beach for six birds on
// one side of a rope, and everyone else packed onto the little bit that's open
// on the other. The ranger keeps moving the rope out a little, and the crowd
// keeps shuffling back.
//
// Greybox: world units, like land.js.
import { C, Q, folk, box } from '../../../engine/art.js';
import { drawLand } from '../../../engine/terrain.js';
import { pin, block } from '../../greybox.js';
import { land, float, h } from '../land.js';
import { level, hour, nightK } from '../tide.js';
import { EVENING } from '../style.js';
import { who, sign, tag, umbrella } from '../kit.js';

// The rope: out across the beach at x, moved a little further out through the day.
const rope = (t) => 30 + 3.2 * Math.max(0, Math.min(1, (hour(t) - 7) / 12));
const shore = (L) => 39.6 + (0.95 - L) / 0.15;
// The crowd on the open side: where they'd like to be, and at least a step
// clear of the rope.
const CROWD = [[31.5, 43.4, 151], [33.2, 44.6, 153], [35, 43.1, 155], [36.8, 44.8, 157], [38.8, 43.6, 159], [41, 44.4, 161], [42.6, 43.2, 163]];

export default {
  id: 'refuge-beach',
  name: 'The Refuge Beach',
  blurb: 'Miles of beach for six plovers on one side of a rope, and everyone else on the other.',
  home: [30, 47],
  build(R) {
    drawLand(R, land, { fade: nightK, inks: EVENING, surf: true });
    block(R, 26.5, 41.2, 0.25, 0.25, 2.2, C.white, 'BEACH CLOSED', { size: 0.4 });

    // The rope and its posts, from the dunes to the water.
    R.mover((t) => ({ x: rope(t), y: 46 }), (ctx, t, p) => {
      const L = level(t);
      for (let y = 40.6; y < shore(L) + 1; y += 1.5) box(ctx, p.x - 0.06, y - 0.06, Math.max(h(p.x, y), L - 0.3), 0.12, 0.12, 1, C.wood, { flat: true });
      if (!Q.lines) return;
      ctx.beginPath();
      for (let y = 40.6; y < shore(L) + 1; y += 0.5) { const z = Math.max(h(p.x, y), L) + 0.85; const X = p.x - y, Y = (p.x + y) / 2 - z * 1.12; y === 40.6 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }
      ctx.strokeStyle = C.coral; ctx.lineWidth = 0.06; ctx.stroke();
    }, { depth: (t) => rope(t) + 40 });

    // The ranger, walking the rope with a spare stake under one arm.
    const ranger = folk(171, { top: C.green, bottom: C.brown });
    const walk = (t) => ({ x: rope(t) - 0.6, y: 42 + Math.abs(((t / 3) % 8) - 4) * 1.6, dir: (t / 3) % 8 < 4 ? 'l' : 'r' });
    R.mover(walk, (ctx, t, p) => {
      const z = h(p.x, p.y);
      who(ctx, p.x, p.y, z, ranger, 'The ranger', { pose: 'carry', dir: p.dir, back: p.dir === 'l' }, t);
      box(ctx, p.x + 0.3, p.y - 0.05, Math.max(z, level(t)) + 1.1, 0.1, 0.1, 1.3, C.wood, { flat: true });
    });

    // The crowd, a step clear of the rope and no more.
    CROWD.forEach(([x, y, s], i) => {
      const look = folk(s);
      R.mover((t) => ({ x: Math.max(x, rope(t) + 1.1 + (i % 3) * 0.5), y }), (ctx, t, p) => {
        const z = h(p.x, p.y);
        if (i % 3 === 0 && level(t) < z - 0.1) umbrella(ctx, p.x - 0.6, p.y - 0.4, z, [C.coral, C.teal, C.mustard][i % 3]);
        who(ctx, p.x, p.y, z, look, i === 2 ? 'Shuffling back' : null, { pose: i % 2 ? 'sit' : 'stand', dir: 'l' }, t);
      });
    });

    // Six plovers, with all the rest of the beach: running at the water's edge.
    for (let i = 0; i < 6; i++) {
      R.mover((t) => {
        const L = level(t), y = shore(L) - 0.4 + Math.sin(t * 1.3 + i) * 0.5;
        return { x: 6 + i * 3.4 + Math.sin(t / 2 + i * 2) * 1.2, y };
      }, (ctx, t, p) => {
        const z = h(p.x, p.y);
        box(ctx, p.x - 0.15, p.y - 0.1, z, 0.3, 0.2, 0.25, C.woodLight, { flat: true });
        if (i === 2 && Q.detail) tag(ctx, p.x, p.y, z + 1, 'Six plovers', { size: 0.34 });
      });
    }

    // The goose, inside the rope with the plovers, trying to look like one.
    R.goose((t) => { const x = 17 + Math.sin(t / 3) * 1.4, y = 43.8; return { x, y, z: float(x, y, t), dir: Math.cos(t / 3) > 0 ? 'r' : 'l', moving: true }; });
    // Things on a tidal beach float or fly: none of them go under.
    pin(R, { id: 'kite', label: 'A kite inside the rope', at: (t) => [20 + Math.sin(t / 2.3) * 0.8, 44 + Math.cos(t / 3.1) * 0.6, 5.2 + Math.sin(t / 1.7) * 0.4], r: 0.9 }, 1);
    pin(R, { id: 'stake', label: 'The ranger\'s spare stake', at: (t) => { const p = walk(t); return [p.x + 0.35, p.y, Math.max(h(p.x, p.y), level(t)) + 1.8]; }, r: 0.8 }, 2);
    pin(R, { id: 'shells', label: 'A bucket of shells', at: (t) => [40.4, 43.6, float(40.4, 43.6, t) + 0.25], r: 0.8 }, 3);
  },
};
