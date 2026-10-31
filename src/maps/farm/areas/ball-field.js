// The Ball Field (greybox): a vintage base ball game on 1860s rules (no
// gloves, underhand pitching, a ball caught on one bound is out, players call
// their own outs), the home team (the Clamdiggers, lettering on the shirts)
// against the visitors, lawn chairs round the field, a chalk scoreboard kept
// by a kid, the umpire in a top hat, the groom on the mound (day.js). Running
// gag: the groom pitches game one, runs off at 3:50 buttoning his shirt, is
// back at 4:40 in his suit for extra innings, and at six the last out is
// caught on one bound off the wedding cake.
import { C, Q, folk, goose } from '../../../engine/art.js';
import { drawLand } from '../../../engine/terrain.js';
import { block, pin, figure, tag, drawBlock, footing } from '../../greybox.js';
import { land } from '../land.js';
import { BASES } from '../plan.js';
import { during, BEATS } from '../clock.js';
import { square, treeAt, crowd } from '../style.js';

const game = during(11, 18);
const home = (s) => folk(s, { top: C.white, bottom: C.navy, hat: 'cap', hatColor: C.navy });

export default {
  id: 'ball-field',
  name: 'The Ball Field',
  blurb: 'Base ball by the rules of 1860: no gloves, underhand, out on one bound. The home team\'s pitcher is getting married at four.',
  describe: 'A mown diamond with fans in lawn chairs along the baselines, players in old-fashioned uniforms and caps, an umpire in a top hat and a chalk scoreboard kept by a kid. Woods behind the outfield. The pitcher leaves in the afternoon and comes back in a suit.',

  build(R) {
    drawLand(R, land);
    for (let x = 36; x < 64; x += 3.6) treeAt(R, x, 15.8 + (x % 3) * 0.4, { h: 6, r: 2 });

    // The bases and home plate.
    for (const [x, y] of BASES) block(R, x - 0.3, y - 0.3, 0.6, 0.6, 0.1, C.white, null);

    // The game, eleven till six: the home team in the field.
    crowd(R, [[47.4, 32.2], [47.6, 26.8], [40.6, 26.6], [44.6, 24.6], [52.6, 21.4], [56.6, 25.8], [48.8, 18.8]].map(([x, y]) => [x, y, 'stand', 'l']), game, { seed: 40, look: home });
    // The batter, a visitor (the art gives him a bat).
    crowd(R, [[39.6, 33.8, 'point', 'r']], game, { seed: 41, look: (s) => folk(s, { top: C.red, hat: 'cap', hatColor: C.red }) });
    figure(R, 39, 34.6, folk(402, { top: C.ink, hat: 'none' }), 'UMPIRE', { dir: 'r' });
    R.poke({ id: 'umpire', at: [39, 34.6, 1.4], r: 0.9, say: ['Fair. Probably.', 'One bound. Off a cake counts.'] });
    // The fans in lawn chairs along both lines.
    const fans = [];
    for (let i = 0; i < 7; i++) fans.push([41.6 + i * 1.5, 35.2, 'sit', 'l']);
    for (let i = 0; i < 5; i++) fans.push([37.6, 23 + i * 1.6, 'sit', 'r']);
    crowd(R, fans, during(10.8, 18.2), { seed: 42, back: true });
    // The goose in a lawn chair among the fans, all day.
    R.goose([45.9, 35.6, 0.6], { kind: 'hard', pose: 'sit', dir: 'l', hint: 'Along the first base line, one fan is very white and very quiet.' });

    // The scoreboard and the kid keeping it.
    block(R, 35.4, 18.6, 2.4, 0.3, 2, C.ink, 'SCORE');
    R.poke({ id: 'scoreboard', at: [36.6, 18.8, 1.6], r: 1, say: 'HOME 7, VISITORS 7. Low on chalk.' });
    figure(R, 36.6, 19.6, folk(403, { scale: 0.7 }), null, { dir: 'l' });
    // A kid in a goose costume, the team's mascot: not the goose.
    R.thing(38.4, 36, (ctx, t) => { goose(ctx, 38.4, 36, footing(R, 38.4, 36), t, { scale: 1.8, dir: 'r' }); if (Q.detail) tag(ctx, 38.4, 36, 3.2, 'MASCOT', { size: 0.3 }); }, { anim: true });
    R.decoy({ id: 'mascot', at: [38.4, 36, 1.2], r: 0.9, say: 'That\'s Owen.' });

    // The players' bench: a fake beard on a string, a bag (a glove in it,
    // against the rules), a broken bat.
    block(R, 51.6, 34.4, 3.4, 0.6, 0.6, C.wood, 'BENCH');
    pin(R, { id: 'beard', label: 'A fake beard', at: [52.4, 34.7, 0.9], r: 0.7 }, 1);
    const bag = R.poke({ id: 'bag', at: [55.8, 35, 0.4], r: 0.8, say: 'A bag. It smells of leather and secrets.' });
    R.thing(55.8, 35, (ctx) => drawBlock(ctx, 55.2, 34.6, footing(R, 55.2, 34.6), 1.2, 0.8, 0.6 + bag.k() * 0.3, C.navy, 'BAG'), { anim: true });
    pin(R, { id: 'glove', label: 'A glove', kind: 'poke', inside: bag, at: [55.8, 35, 0.7], r: 0.7, hint: 'Somebody packed something the rules don\'t allow.' }, 2);
    pin(R, { id: 'bat', label: 'A broken bat', at: [42.2, 34.4, 0.15], r: 0.7 }, 3);

    // A square in foul territory: an 1860s base ball in the 1800s.
    const foul = square(R, 'foul-square', 35.8, 29.6, { name: 'SQUARE' });
    pin(R, { id: 'old-ball', label: 'An 1860s base ball', kind: 'poke', inside: foul, layer: 2, at: [36.5, 30.3, 0.3], r: 0.7, hint: 'Two layers down, in foul territory.' }, 4);
    square(R, 'outfield-square', 58.6, 19.4, { name: 'SQUARE', say: ['The 1900s. A bottle cap.', 'The 1800s. A marble.', '1690. Careful.', 'Filled back in.'] });

    // The last out at six: caught on one bound off the wedding cake.
    R.air((ctx, t) => { if (Math.abs(t - BEATS.out) < 2.5) tag(ctx, 40, 26, 4, 'OUT! (off the cake)', { size: 0.5 }); }, { anim: true });
  },
};
