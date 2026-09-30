// The Pool (greybox). The middle of the Sun Deck: the pool, loungers in rows,
// the pool bar, the lifeboat drill along the far rail at 10, the limbo at noon.
// The iguana has a lounger. Keep the id: it's in links and saves.
import { C, folk } from '../../../engine/art.js';
import { block, pin, figure, paths } from '../../greybox.js';
import { deck, lifeboat } from '../ship.js';
import { lounger, cocktail, bucket, towelAnimal, lifebuoy, porthole, board, passenger, gull } from '../kit.js';
import { INK } from '../style.js';

export default {
  id: 'pool',
  name: 'The Pool',
  blurb: 'Every lounger has had a towel on it since 5am and nobody on it. At the lifeboat drill, only one passenger is listening.',

  build(R) {
    deck(R, 'pool', 'sun', { rails: true });
    R.thing(8, 0.6, (ctx) => { lifeboat(ctx, 2, 0.1, 2.2, 4.5); lifeboat(ctx, 26, 0.1, 2.2, 4.5); });
    block(R, 12, 5, 12, 6, 0.3, C.water, 'POOL');
    block(R, 19, 1.3, 6, 1.5, 1.2, INK.teak, 'POOL BAR');
    block(R, 27, 4, 3, 3, 0.6, C.water, 'HOT TUB');
    block(R, 8.5, 7, 0.2, 2, 1.6, INK.sunYellow, 'LIMBO');
    for (let i = 0; i < 8; i++) R.thing(2.5 + i * 3.4, 13.8, (ctx) => lounger(ctx, 2 + i * 3.4, 12.6, 0, { towel: i % 2 ? INK.flamingo : C.sky }));
    R.thing(22, 2, (ctx) => { cocktail(ctx, 21, 2, 1.2); cocktail(ctx, 23.4, 2.2, 1.2); bucket(ctx, 26, 4, 0, { name: 'CHAD' }); towelAnimal(ctx, 20, 2, 1.2, 'elephant'); board(ctx, 'x', 22, 1.2, 2.4, 3, 0.7, 'GREEN MERMAIDS $14', { board: INK.sunYellow }); });
    R.decor((ctx) => { lifebuoy(ctx, 10, 3); porthole(ctx, 14, 3); });
    passenger(R, 6, 10, 5, { sick: 60, pose: 'stand' });
    R.thing(4, 9, (ctx, t) => gull(ctx, 4, 9, 0, t, { peck: true }), { anim: true });
    figure(R, 28, 5.5, folk(21), 'Hot tub', { pose: 'swim' });
    figure(R, 16, 8, folk(22), 'Swimmer', { pose: 'swim' });
    figure(R, 21, 1, folk(23), 'Barman', { dir: 'l' });
    figure(R, 30, 9, folk(24), 'Lifeguard');
    pin(R, { id: 'bar-tab', label: "Chad's bar tab", at: [22.5, 2.1, 1.3] }, 1);
    pin(R, { id: 'towel', label: 'A lounger reserved since day one', at: [2.5, 13.8, 0.6] }, 2);
    // The goose: at its muster station in a life jacket, the only one listening.
    R.goose([15.5, 2.6, 0], { dir: 'l' });
    paths(R);
  },
};
