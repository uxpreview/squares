// The Gates (greybox): the concourse, roof off, the airside glass low. Three
// gates along the glass, C12 (Flight 1 to Orlando: ON TIME all day, never
// boards), C13 (the band's flight to New York, and Inspector Pidge, waiting for
// Monday's) and C14 (the bride's). The departures board at the back, the food
// court and the bar, rows of seats. Running gags: the board's delays grow by
// the hour, and the band rehearses with a hole where the tuba goes.
import { C, folk } from '../../../engine/art.js';
import { ground, block, pin, figure, drawBlock } from '../../greybox.js';
import { TONE, BLOCK, INK, line, run } from '../style.js';
import { LAND, AIR, SEC, W, GATES } from '../plan.js';
import { hour } from '../clock.js';

// The board's line for the hour: everything later and later, then canceled
// at six, except Flight 1.
function delay(t) {
  const h = hour(t);
  if (h >= 18 && h < 23.6) return 'CANCELED';
  if (h < 9 && h >= 4) return 'ON TIME';
  return `DELAYED ${Math.max(1, Math.round(((h + 24 - 9) % 24) * 0.7))}H`;
}

export default {
  id: 'gates',
  name: 'The Gates',
  blurb: 'Every flight is delayed except Flight 1 to Orlando, which is on time and never boards. A marching band is short one tuba.',
  describe: 'A long concourse with its roof off: rows of seats facing three gates along the windows, a departures board, a food court and a bar, and a charging pole with a crowd round it. A high school marching band rehearses at one gate. As the night goes on, everyone falls asleep across the seats.',

  build(R) {
    ground(R, { floor: TONE.terminal, grid: 2, name: 'THE GATES', nameAt: [76, 16.6] });
    R.rug((ctx) => line(ctx, SEC + 1, 25.4, W - SEC - 2, 0.1, INK.signal));
    run(R, SEC, LAND, W - SEC, 0.4, 1.1, BLOCK.wall, null);
    // The airside glass, low, with the jet bridges' doors.
    for (const [x0, x1] of [[SEC, 60.6], [63.4, 76.6], [79.4, 92.6], [95.4, W]]) run(R, x0, AIR - 0.4, x1 - x0, 0.4, 1, BLOCK.wall, null);

    // The departures board (the thing a first visit is nudged to tap): it flips one more delay.
    R.thing(70, 13, (ctx, t) => drawBlock(ctx, 66, 12.6, 0, 8, 0.6, 3.6, C.ink, `FLIGHT 1 ON TIME · ALL ELSE ${delay(t)}`, { size: 0.36 }), { anim: true });
    R.poke({ id: 'board', at: [70, 12.9, 2.6], r: 1.2, say: (t) => (delay(t) === 'CANCELED' ? 'Canceled. All of it.' : 'Delayed. Again.'), teach: true });

    // The food court: the donut lookalike and the $19 lobster roll.
    block(R, 53.4, 12.8, 4, 1.6, 1.4, C.pink, 'DONUTS');
    block(R, 58, 12.8, 4, 1.6, 1.4, C.coral, 'LOBSTER ROLL $19');
    block(R, 59.4, 15.2, 1.4, 1, 1, C.white, null);
    pin(R, { id: 'lobster-roll', label: 'A $19 lobster roll', at: [60.1, 15.6, 1.3], r: 0.7 }, 1);

    // The bar: the same man on the same stool since eight, and the goose between two of them.
    run(R, 88, 12.8, 12, 1.4, 1.2, C.wood, 'BAR');
    block(R, 97, 12.6, 2, 0.4, 0.6, C.white, null, { z: 1.8 });
    R.decoy({ id: 'vodka', at: [97.6, 12.8, 2.6], r: 0.7, say: 'A goose on a bottle. Wrong goose.' });
    figure(R, 90, 15, folk(140), 'SINCE 8AM', { pose: 'sit', back: true });
    figure(R, 94.6, 15, folk(141), null, { pose: 'sit', back: true });
    R.goose([92.3, 15, 0.8], { dir: 'r', pose: 'sit', kind: 'hard', hint: 'Final call, and it\'s ordered another.' });

    // Rows of seats facing the gates, and the charging pole with nine people round it.
    for (const y of [18.4, 21.2]) for (const [x0, x1] of [[54, 66], [70, 86], [89, 102]]) run(R, x0, y, x1 - x0, 0.9, 0.7, BLOCK.seat, null, { step: 2 });
    block(R, 67.6, 19.4, 0.8, 0.8, 1.6, C.mustard, 'CHARGING');
    [[66.4, 19], [69.4, 19.2], [66.8, 20.8], [69, 21], [68, 22.2]].forEach(([x, y], i) => figure(R, x, y, folk(150 + i), null));

    // C12: Flight 1 to Orlando. The gate desk's microphone, and the Courier's seat.
    run(R, GATES.C12 - 2, 26.6, 4, 1, 1.1, BLOCK.desk, 'C12 ORLANDO', { step: 2 });
    R.poke({ id: 'mic', at: [GATES.C12, 27.1, 1.5], r: 0.8, say: 'Final call for passenger Goose.' });

    // C13: the band, rehearsing with a hole where the tuba goes; Pidge behind his newspaper.
    run(R, GATES.C13 - 2, 26.6, 4, 1, 1.1, BLOCK.desk, 'C13 NEW YORK', { step: 2 });
    [[74, 23.2], [76, 23.2], [78, 23.2], [80, 23.2], [75, 24.6], [79, 24.6], [81, 24.6]]
      .forEach(([x, y], i) => figure(R, x, y, folk(160 + i, { top: INK.cranberry }), i === 0 ? 'THE BAND' : null, { pose: 'drum' }));
    figure(R, 77, 24.6, folk(170, { top: INK.cranberry }), 'NO TUBA', { pose: 'carry' });
    pin(R, { id: 'tuba-player', label: 'The tuba player', after: 'bag-room:tuba', at: [77, 24.6, 2.8], r: 0.9, riddle: 'Tag: Marching Ducks, row 30. Big lungs.' }, 2);
    figure(R, 71.6, 22.2, folk(171), null, { pose: 'sit' });
    const paper = R.poke({ id: 'newspaper', at: [71.6, 22.2, 1.9], r: 0.8, say: 'Shh. Undercover.' });
    R.thing(71.6, 22.4, (ctx) => drawBlock(ctx, 71, 22.6, 1.2 + paper.k() * 1.2, 1.2, 0.2, 1.1, C.white, paper.k() > 0.5 ? null : 'NEWS'), { anim: true });
    pin(R, { id: 'pidge', label: 'Inspector Pidge', kind: 'poke', inside: paper, at: [71.6, 22.2, 1.8], r: 0.8, hint: 'Someone at C13 is reading the same page very slowly.' }, 3);

    // C14: the bride, asleep on her bag in sweatpants and a tiny veil.
    run(R, GATES.C14 - 2, 26.6, 4, 1, 1.1, BLOCK.desk, 'C14', { step: 2 });
    block(R, 98.6, 23.4, 1.6, 1, 0.6, C.navy, null);
    figure(R, 99.4, 23.9, folk(180, { top: C.grey }), null, { pose: 'sit' });
    pin(R, { id: 'bride', label: 'The bride', kind: 'hard', after: 'apron:dress', at: [99.4, 23.9, 1.9], r: 0.8, riddle: 'Tag: Something borrowed, seat 12F.', hint: 'Someone by C14 is wearing a tiny veil with sweatpants.' }, 4);
  },
};
