// The Fields (greybox): the leased fields in long stripes (strawberries in
// June), the farm track, the tractor, Bowman's Pond with its Canada geese, the
// orchard, the walking trail with dog walkers (day.js), a scarecrow. Running
// gags: the scarecrow gets dressed in everyone's lost things through the day,
// and the tractor needs to get past the wedding and waits all afternoon.
import { C, Q, folk, paint } from '../../../engine/art.js';
import { drawLand } from '../../../engine/terrain.js';
import { ZK } from '../../../engine/iso.js';
import { block, pin, figure, tag, drawBlock, footing } from '../../greybox.js';
import { land, LEVEL } from '../land.js';
import { POND, ORCHARD } from '../plan.js';
import { hour, during } from '../clock.js';
import { BLOCK, INK, square, treeAt, crowd } from '../style.js';

// The scarecrow's outfit, by the hour: whatever's been lost today.
const DRESS = [[0, 'SCARECROW'], [12, 'IN A BALL CAP'], [15, '+ A FLEECE'], [18, '+ A SHAWL'], [21, '+ A TIE']];
const dressed = (t) => { const h = hour(t) < 5 ? 24 : hour(t); return DRESS.filter(([a]) => h >= a).pop()[1]; };

// A Canada goose: a brown body, a black neck and a white chin strap.
function canada(ctx, x, y, z, t, ph) {
  const X = x - y, Y = (x + y) / 2 - z * ZK + Math.sin(t * 1.3 + ph) * 0.03;
  ctx.beginPath();
  ctx.ellipse(X, Y - 0.1, 0.42, 0.2, 0, 0, Math.PI * 2);
  paint(ctx, C.brown);
  ctx.beginPath();
  ctx.moveTo(X + 0.25, Y - 0.2);
  ctx.lineTo(X + 0.36, Y - 0.72);
  ctx.lineWidth = 0.12;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(X + 0.4, Y - 0.74, 0.09, 0, Math.PI * 2);
  paint(ctx, C.black);
}

export default {
  id: 'fields',
  name: 'The Fields',
  blurb: 'Long stripes of strawberries, an orchard, a pond full of Canada geese, and a tractor that has been waiting since noon.',
  describe: 'Long striped fields of crops running back toward the marsh, a farm track along them, an orchard, and a small pond with Canada geese and lily pads. Strawberry pickers bend over the rows, dog walkers follow the trail, a scarecrow wears more lost things as the day goes on, and a tractor waits at the track for the wedding to move.',

  build(R) {
    drawLand(R, land);

    // The orchard.
    for (let x = ORCHARD[0] + 1; x < ORCHARD[2]; x += 2.6) for (let y = ORCHARD[1] + 1; y < ORCHARD[3]; y += 2.8) treeAt(R, x, y, { h: 3, r: 1.1, color: INK.pasture });

    // Bowman's Pond: the Canada geese, the goose swimming with them, an
    // egret, lily pads (a frog on one).
    const [px, py] = POND;
    const flock = [[78.8, 43.2], [80.6, 42.8], [81.4, 44.8], [79.4, 45.2]];
    R.thing(px, py, (ctx, t) => flock.forEach(([x, y], i) => canada(ctx, x, y, LEVEL, t, i)), { anim: true });
    R.goose((t) => ({ x: 80.2 + Math.sin(t * 0.2) * 0.4, y: 44 + Math.cos(t * 0.2) * 0.3, z: LEVEL, dir: 'l', pose: 'swim' }),
      { kind: 'hard', hint: 'Bowman\'s Pond has one goose that isn\'t Canadian.' });
    block(R, 77.2, 45.6, 0.3, 0.3, 1.2, C.white, 'EGRET', { z: LEVEL });
    R.decoy({ id: 'egret', at: [77.3, 45.7, 1.2], r: 0.8, say: 'Different department.' });
    R.rug((ctx) => { for (const [x, y] of [[82, 42.2], [82.8, 43.4], [78, 41.8]]) { ctx.beginPath(); ctx.ellipse(x - y, (x + y) / 2 - LEVEL * ZK, 0.4, 0.2, 0, 0, Math.PI * 2); paint(ctx, C.green, { lw: 0.03 }); } });
    pin(R, { id: 'frog', label: 'A frog', at: [82, 42.2, LEVEL + 0.1], r: 0.6 }, 1);

    // The strawberry pickers, and a basket.
    crowd(R, [[72, 56.6, 'sit', 'r'], [75.4, 60.4, 'sit', 'l'], [80.6, 57.6, 'sit', 'r']], during(7, 19), { seed: 50 });
    pin(R, { id: 'basket', label: 'A strawberry basket', at: [73.2, 57.2, 0.6], r: 0.7 }, 2);

    // The scarecrow, wearing the day's lost things. A sneaker in its coat.
    R.thing(86, 28, (ctx, t) => { drawBlock(ctx, 85.7, 27.7, footing(R, 85.7, 27.7), 0.6, 0.6, 2.6, INK.earth, null); if (Q.detail) tag(ctx, 86, 28, 3.6, dressed(t), { size: 0.32 }); }, { anim: true });
    const coat = R.poke({ id: 'scarecrow', at: [86, 28, 1.8], r: 0.9, say: 'The coat\'s pocket has something in it.' });
    pin(R, { id: 'sneaker', label: 'A lost sneaker', kind: 'poke', inside: coat, at: [86.3, 28.2, 1.6], r: 0.6, hint: 'The scarecrow has been collecting.' }, 3);

    // The tractor, waiting at the track to get past the wedding.
    block(R, 64.6, 49.6, 1.8, 2.6, 1.8, C.red, 'TRACTOR');
    figure(R, 66.8, 49.4, folk(501, { hat: 'cap' }), null, { dir: 'l' });
    R.poke({ id: 'driver', at: [66.8, 49.4, 1.4], r: 0.9, say: ['Still waiting.', 'Since noon. Still waiting.'] });

    // A square: a coin from the 1600s, in the 1690 layer. Another, empty.
    const coin = square(R, 'fields-square', 88.4, 40.2, { name: 'SQUARE' });
    pin(R, { id: 'coin', label: 'A coin from the 1600s', kind: 'poke', inside: coin, layer: 3, at: [89.1, 40.9, 0.2], r: 0.6, hint: 'The bottom of the square east of the pond.' }, 4);
    square(R, 'fields-square-2', 70.6, 65.4, { name: 'SQUARE', say: ['A strawberry. Today\'s.', 'A plow blade. The 1800s.', '1690. Careful.', 'Filled back in.'] });
  },
};
