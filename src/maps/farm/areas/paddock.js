// The Paddock (greybox): the rescue animals as the owner knows them (farm.md,
// decision 17): two donkeys (one is Roger), goats and sheep together in the
// main gated lot with their shelters, and two big pigs in a pen of their own
// beside it. The weekend volunteers feeding and mucking out, kids at the
// fence, the camera on a pole that streams the paddock live. Running gags:
// the goats eat the wedding's welcome sign one letter at a time, and Roger
// gets out at two for the photos and the ceremony (day.js).
import { C, folk } from '../../../engine/art.js';
import { drawLand } from '../../../engine/terrain.js';
import { block, pin, figure, tag, drawBlock, footing } from '../../greybox.js';
import { land } from '../land.js';
import { LOT, PEN, LOT_GATE, PEN_GATE, FENCES } from '../plan.js';
import { hour } from '../clock.js';
import { BLOCK, square, beast, fence } from '../style.js';
import { roger, inPaddock } from '../day.js';

// The welcome sign, by the hour: the goats eat it a letter at a time.
const SIGN = [[0, 'WELCOME TO OUR WEDDING'], [10, 'WELCOME TO OUR WEDD'], [12, 'WELCOME TO OUR WED'], [14, 'WELCOME TO'], [16, 'WELCOME'], [19, 'WEL'], [21, 'W']];
const sign = (t) => { const h = hour(t) < 5 ? 24 : hour(t); return SIGN.filter(([a]) => h >= a).pop()[1]; };

export default {
  id: 'paddock',
  name: 'The Paddock',
  blurb: 'Two donkeys, the goats and sheep, and two big pigs next door. The goats are eating the wedding\'s welcome sign.',
  describe: 'A fenced paddock with two shelters: two donkeys, a mixed crowd of goats and sheep, and next to it a pen with two big pigs. Volunteers carry buckets, children lean on the fence, and a camera on a pole streams it all live. A welcome sign on the fence gets shorter all day.',

  build(R) {
    drawLand(R, land);
    fence(R, FENCES[0].pts, { gates: [LOT_GATE] });
    fence(R, FENCES[1].pts, { gates: [PEN_GATE] });

    // The shelters, and a goose weathervane on one: not the goose.
    block(R, 39.2, 58, 4, 2.2, 1.8, BLOCK.shed, 'SHELTER');
    block(R, 49.5, 58, 4, 2.2, 1.8, BLOCK.shed, 'SHELTER');
    block(R, 51.3, 58.9, 0.3, 0.3, 0.9, C.ink, null, { z: footing(R, 49.5, 58, 4, 2.2) + 1.8 });
    R.decoy({ id: 'weathervane', at: [51.5, 59, 3.2], r: 0.8, say: 'Points where the wind goes. Unlike some.' });

    // Roger's friend, the goats and sheep. The goose lies with the sheep.
    beast(R, 44, 63.4, 'donkey', 'ROGER\'S FRIEND', { pose: 'graze', dir: 'l' });
    for (const [x, y, pose, dir] of [[48.5, 62, 'graze', 'r'], [50.8, 65.6, 'stand', 'l'], [41.6, 66.4, 'walk', 'r']]) beast(R, x, y, 'goat', null, { pose, dir, phase: x });
    for (const [x, y] of [[45.6, 66.6], [46.9, 67.3], [44.4, 67.4], [47.9, 66.2]]) beast(R, x, y, 'sheep', null, { pose: 'lie', wool: 1, dir: 'l' });
    R.goose([46.2, 66, 0.5], { kind: 'hard', pose: 'sit', dir: 'l', hint: 'White on white, lying down with the flock.' });

    // The goats at the sign on the lane side, and the centerpiece one's eating.
    R.thing(41.5, 57.1, (ctx, t) => {
      drawBlock(ctx, 39.6, 56.8, footing(R, 39.6, 56.8), 4.2, 0.2, 1.1, C.white, null);
      tag(ctx, 41.7, 56.9, footing(R, 41.7, 56.9) + 1.5, sign(t), { size: 0.3 });
    }, { anim: true });
    beast(R, 42.6, 58.2, 'goat', 'GOAT', { pose: 'graze', dir: 'l' });
    beast(R, 47.2, 64.8, 'goat', null, { pose: 'graze', dir: 'r' });
    pin(R, { id: 'centerpiece', label: 'A centerpiece', at: [48.1, 65, 0.4], r: 0.7 }, 1);

    // The feed bin (a carrot in it), and the volunteers.
    const bin = R.poke({ id: 'bin', at: [52.6, 66.3, 0.7], r: 0.9, say: 'Donkey breakfast. Donkey lunch.' });
    R.thing(52.6, 66.3, (ctx) => drawBlock(ctx, 52, 65.8, footing(R, 52, 65.8, 1.2, 1), 1.2, 1, 1 + bin.k() * 0.4, BLOCK.machine, 'FEED'), { anim: true });
    pin(R, { id: 'carrot', label: 'A carrot', kind: 'poke', inside: bin, at: [52.6, 66.3, 1.2], r: 0.7, hint: 'Where the donkeys\' food is kept.' }, 2);
    figure(R, 50.4, 63.2, folk(801, { top: C.teal }), 'VOLUNTEER', { pose: 'carry' });
    R.poke({ id: 'volunteer', at: [50.4, 63.2, 1.4], r: 0.9, say: ['That\'s Roger. He\'s not in the mood.', 'The goats ate the T. And the O.'] });
    figure(R, 40.4, 61.3, folk(802, { top: C.coral }), null, { pose: 'carry', dir: 'l' });

    // Roger answers a tap while he's home (he's on the clock, day.js).
    R.poke({ id: 'roger', at: (t) => { const p = roger(t); return [p.x, p.y, 1.4]; }, r: 1, when: inPaddock, say: 'Not in the mood.' });

    // The pigs in their pen; one wears a boutonniere.
    beast(R, 58, 61.6, 'pig', 'PIGS', { pose: 'lie', dir: 'r' });
    beast(R, 60.2, 64.4, 'pig', null, { pose: 'stand', dir: 'l' });
    pin(R, { id: 'pig', label: 'A pig in a boutonniere', at: [59.6, 64.3, 1], r: 0.8 }, 3);

    // Kids at the fence, and the livestream camera on its pole.
    figure(R, 37.2, 63.5, folk(803, { scale: 0.7 }), null, { dir: 'r' });
    figure(R, 37.3, 65.2, folk(804, { scale: 0.7 }), null, { dir: 'r', pose: 'wave' });
    block(R, 54.8, 56.2, 0.25, 0.25, 3.6, C.grey, 'LIVE CAM');
    R.poke({ id: 'camera', at: [54.9, 56.3, 3.4], r: 0.8, say: 'LIVE. 4 watching. 3 are goats.' });

    // A square outside the lot: a milk bottle in the 1900s (the Littles' dairy).
    const milk = square(R, 'paddock-square', 36, 69.2, { name: 'SQUARE' });
    pin(R, { id: 'milk', label: 'A milk bottle', kind: 'poke', inside: milk, layer: 1, at: [36.7, 69.9, 0.3], r: 0.7, hint: 'One layer down by the paddock, from the Littles\' dairy.' }, 4);
    square(R, 'paddock-square-2', 57.2, 69.4, { name: 'SQUARE', say: ['Dirt. Very old dirt.', 'A button. Somebody\'s Sunday best.', '1690. Clay. Lots of clay.', 'Filled back in.'] });
  },
};
