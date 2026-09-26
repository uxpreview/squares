// Billiard Room (greybox). Rupert losing at cards to the chauffeur, betting
// something more absurd every round.
import { shell, block, pin, figure, paths } from '../../greybox.js';
import { TONE, blockOf, walls, house, stormWindow, CAST, INK } from '../style.js';
import { DOORS } from '../plan.js';

const T = TONE['billiard-room'], B = blockOf(T);

export default {
  id: 'billiard-room',
  name: 'Billiard Room',
  blurb: 'Rupert is losing at cards to the chauffeur. So far he has bet his car, his shoes and the house.',

  build(R) {
    shell(R, { floor: T, name: 'BILLIARD ROOM', walls: walls(T, { doors: DOORS['billiard-room'] || [] }) });
    paths(R);

    stormWindow(R, 'left', 1.5, 2, 2, 2.6);
    stormWindow(R, 'left', 12.5, 2, 2, 2.6);
    block(R, 3, 4.5, 6.5, 3.5, 1.0, INK.verdigris, 'BILLIARDS');
    block(R, 10.5, 10.5, 2.5, 2.5, 1.0, B, 'CARDS');
    block(R, 9.4, 11.4, 0.8, 0.8, 0.75, INK.oxblood);
    block(R, 13.4, 11.4, 0.8, 0.8, 0.75, INK.oxblood);
    figure(R, 13.8, 11.8, CAST.chauffeur.look, CAST.chauffeur.name, { pose: 'sit', dir: 'l', back: true });

    R.light({ at: [6.2, 6.2, 3.8], r: 4, color: INK.candleGold, k: house.lamp });
    R.light({ at: [11.8, 11.8, 3.4], r: 3, color: INK.candleGold, k: house.lamp });
    R.dark(house.dark);

    pin(R, { id: 'pawn-ticket', label: 'A pawn ticket', at: [11.2, 11.2, 1.05], r: 0.7 }, 1);
    pin(R, { id: 'shoes', label: "Rupert's shoes", at: [12.2, 13.8, 0.15], r: 0.8 }, 2);
  },
};
