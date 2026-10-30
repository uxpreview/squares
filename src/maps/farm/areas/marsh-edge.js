// The Marsh Edge (greybox): the Plum Island Turnpike on its causeway, beach
// traffic all day, the refuge's visitor center and the bird center with
// birders and scopes, the Great Marsh and its creeks, salt hay on staddles,
// the Merrimack's flats at the back left, greenhead traps, the woods, and the
// airfield (its runway pointing at the farm) with a hangar, a windsock and a
// small plane. Running gags: a plane takes off on the hour, low over the farm
// (at 4:02 over the vows; ambient.js), and the birders swing every scope at
// the goose and miss it.
import { C, folk } from '../../../engine/art.js';
import { drawLand } from '../../../engine/terrain.js';
import { block, pin, figure, drawBlock, footing } from '../../greybox.js';
import { land } from '../land.js';
import { PIKE } from '../plan.js';
import { during } from '../clock.js';
import { BLOCK, square, treeAt } from '../style.js';

// A point along the turnpike, u from 0 (the mainland) to 1 (Plum Island).
function along(u) {
  const segs = [];
  let L = 0;
  for (let i = 1; i < PIKE.length; i++) { const l = Math.hypot(PIKE[i][0] - PIKE[i - 1][0], PIKE[i][1] - PIKE[i - 1][1]); segs.push(l); L += l; }
  let d = u * L;
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i]) { const k = d / segs[i]; return [PIKE[i][0] + (PIKE[i + 1][0] - PIKE[i][0]) * k, PIKE[i][1] + (PIKE[i + 1][1] - PIKE[i][1]) * k]; }
    d -= segs[i];
  }
  return PIKE[PIKE.length - 1];
}

export default {
  id: 'marsh-edge',
  name: 'The Marsh Edge',
  blurb: 'The turnpike to Plum Island, the Great Marsh and the airfield next door. A plane takes off on the hour, right over the vows.',
  describe: 'A causeway road across salt marsh, busy with beach traffic, with a refuge visitor center and birders at their scopes beside it. Creeks wind through the marsh grass, salt hay sits on stilts, and mud flats open toward the river. To the right a grass airfield with a hangar and a windsock; a small plane takes off every hour.',

  build(R) {
    drawLand(R, land);
    // The woods between the farm and the turnpike.
    for (let x = 28; x < 64; x += 3.2) treeAt(R, x, 13.4 + (x % 2) * 1.4, { h: 6, r: 2 });
    // The kite stuck in one.
    pin(R, { id: 'kite', label: 'A kite in a tree', at: [44.8, 14.2, 5.6], r: 0.8 }, 1);

    // Beach traffic on the turnpike, by day, both ways.
    R.mover((t) => { const [x, y] = along(((t * 0.012) % 1 + 1) % 1); return { x, y }; }, (ctx, t, p) => { if (during(6, 21)(t)) drawBlock(ctx, p.x - 1, p.y - 0.5, footing(R, p.x, p.y), 2, 1, 1, C.red, 'DAVE'); });
    R.mover((t) => { const [x, y] = along(1 - (((t * 0.015 + 0.4) % 1) + 1) % 1); return { x, y }; }, (ctx, t, p) => { if (during(7, 22)(t)) drawBlock(ctx, p.x - 1, p.y - 0.5, footing(R, p.x, p.y), 2, 1, 1, C.teal, null); });

    // The refuge's visitor center and the bird center, north of the road.
    block(R, 5, 6.8, 5, 2.6, 2.4, BLOCK.wood, 'REFUGE');
    block(R, 13, 6.6, 4, 2.4, 2.2, BLOCK.wood, 'BIRD CENTER');
    // The birders and their scopes.
    figure(R, 20.6, 9.4, folk(201, { hat: 'sun' }), 'BIRDERS', { pose: 'read', dir: 'r' });
    figure(R, 22.4, 9.2, folk(202, { hat: 'cap' }), null, { pose: 'read', dir: 'r' });
    block(R, 21.4, 8.8, 0.2, 0.2, 1.5, C.ink, null);
    R.poke({ id: 'scope', at: [21.5, 8.9, 1.6], r: 0.8, say: ['Swing. Miss. Swing. Miss.', 'A goose! No. A gull.'] });
    pin(R, { id: 'thermos', label: 'A birder\'s thermos', at: [23.4, 9.8, 0.75], r: 0.6 }, 2);

    // Salt hay on staddles out in the marsh (a hay fork in one), and a
    // greenhead trap (the first flies are out).
    block(R, 44, 4.4, 1.8, 1.8, 1.4, BLOCK.hay, 'STADDLE');
    const hay = R.poke({ id: 'staddle', at: [50.9, 6.1, 1.2], r: 1, say: 'Salt hay. Very salty. Very hay.' });
    R.thing(50.9, 6.1, (ctx) => drawBlock(ctx, 50, 5.2, footing(R, 50, 5.2, 1.8, 1.8), 1.8, 1.8, 1.4 - hay.k() * 0.6, BLOCK.hay, 'STADDLE'), { anim: true });
    pin(R, { id: 'fork', label: 'A hay fork', kind: 'poke', inside: hay, at: [50.9, 6.1, 1], r: 0.6, hint: 'Out in the marsh, the haystacks on stilts.' }, 3);
    block(R, 60, 7.4, 1, 1, 1.6, C.navy, 'TRAP');
    pin(R, { id: 'trap', label: 'A greenhead trap', at: [60.5, 7.9, 1.5], r: 0.8 }, 4);
    // A Canada goose on the marsh: not the goose.
    block(R, 37.4, 6, 0.8, 0.5, 0.7, C.brown, 'CANADA GOOSE');
    R.decoy({ id: 'canada', at: [37.8, 6.2, 0.6], r: 0.8, say: 'She\'s not from around here.' });

    // The airfield: the runway, the windsock, the hangar (a plane in it, the
    // goose in its cockpit).
    block(R, 84.4, 13.2, 0.2, 0.2, 2.2, C.white, 'WINDSOCK');
    R.poke({ id: 'windsock', at: [84.5, 13.3, 2], r: 0.8, say: 'Wind: from the wedding. Carrying cake.' });
    block(R, 91, 5, 4, 4.6, 0.1, C.grey, null);
    const door = R.poke({ id: 'hangar', at: [93, 9.7, 1.6], r: 1.1, say: 'The hangar door rolls up. Someone\'s in the cockpit.' });
    R.thing(93, 7.3, (ctx) => {
      const z = footing(R, 91, 5, 4, 4.6);
      drawBlock(ctx, 91, 5, z, 4, 4.6, 2.8, BLOCK.shed, 'HANGAR');
      drawBlock(ctx, 91.2, 9.6, z + door.k() * 2.4, 3.6, 0.15, 2.6 - door.k() * 2.4, C.grey, null);
    }, { anim: true });
    R.goose((t) => ({ x: 93, y: 9.2, z: 1.2, dir: 'l', pose: 'sit', hidden: door.k() < 0.5 }),
      { kind: 'poke', inside: door, hint: 'The plane in the hangar has a passenger who never booked.' });

    // A square by the turnpike, empty.
    square(R, 'pike-square', 25.6, 13.4, { name: 'SQUARE', say: ['Dirt. Very old dirt.', 'Salt. The marsh was here.', '1690. Marsh, still.', 'Filled back in.'] });
    square(R, 'woods-square', 66.4, 13.6, { name: 'SQUARE', say: ['A pine cone.', 'A horseshoe nail.', '1690. Careful.', 'Filled back in.'] });
  },
};
