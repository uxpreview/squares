// The Lot (greybox): the parking lot under the windows. Two rows of cars facing
// each other across an aisle, the CEO's across two spaces right under the
// pitch room, Doug in his car (he eats every meal there), a gas car at the
// electric charger, the front door at the foot of the building with a porch
// goose beside it, the road along the front, the drive up the right-hand end
// to the dumpster pen at the edge of the woods. The bear comes and goes from
// here (clock.js). Running gag: the bear's day; and the leaf blower man, who
// blows the same leaves from one end of the lot to the other and back.
import { C, folk, person, Q } from '../../../engine/art.js';
import { route } from '../../../engine/actors.js';
import { ground, block, pin, drawBlock, tag, figure } from '../../greybox.js';
import { TONE, BLOCK, INK } from '../style.js';
import { BD, BW, W, D, ROW_A, ROW_B, AISLE, ROAD, DRIVE, BAY, DUMPSTER, DOOR, CEO_CAR, DOUG_CAR } from '../plan.js';
import { bearAt, at, H, staffed, BEAR_TIMES } from '../clock.js';

// Which bays have a car: most, by day; a few overnight. The walkway to the
// front door (row A) and where people cross from the road (row B) stay clear,
// as do the CEO's two spaces and Doug's.
const keep = (x, row) => {
  if (row === 'a' && Math.abs(x - DOOR[0]) < 2.6) return false;
  if (row === 'a' && Math.abs(x - CEO_CAR[0]) < 2.5) return false;
  if (row === 'b' && x > 48.5 && x < 54) return false;
  if (row === 'b' && Math.abs(x - DOUG_CAR[0]) < 1.3) return false;
  return true;
};
const bays = (row) => {
  const out = [];
  for (let x = 6 + BAY / 2; x < BW - 1; x += BAY) if (keep(x, row)) out.push(x);
  return out;
};

export default {
  id: 'lot',
  name: 'The Lot',
  blurb: 'The CEO parks across two spaces and Doug eats every meal in his car. The bear is a regular.',
  describe: 'A parking lot below the office windows: two rows of cars facing each other, one parked across two spaces, a man eating in his car, an electric charger with a gas car at it, the building\'s front door with a stone goose beside it, a dumpster pen by the woods, and a road along the front. A black bear visits.',

  build(R) {
    ground(R, { floor: TONE.lot, slab: TONE.road, grid: false, name: 'THE LOT', nameAt: [10, AISLE] });
    R.rug((ctx) => {
      // The road, the drive's edges, the bays' lines.
      drawBlock(ctx, 0, ROAD[0], 0, W, ROAD[1] - ROAD[0], 0.01, TONE.road, null);
      for (let x = 2; x < W; x += 4) drawBlock(ctx, x, (ROAD[0] + ROAD[1]) / 2 - 0.08, 0.02, 2, 0.16, 0.005, INK.sticky, null);
      for (let x = 6; x <= BW; x += BAY) {
        drawBlock(ctx, x - 0.04, ROW_A[0], 0.01, 0.08, ROW_A[1] - ROW_A[0], 0.005, C.white, null);
        drawBlock(ctx, x - 0.04, ROW_B[0], 0.01, 0.08, ROW_B[1] - ROW_B[0], 0.005, C.white, null);
      }
      // The walk to the front door.
      drawBlock(ctx, DOOR[0] - 1.4, BD, 0.01, 2.8, ROW_A[1] - BD, 0.005, TONE.walk, null);
    });

    // Cars: row A nose to the building, row B nose to the aisle. Some go home
    // at five (staffed), so the lot empties by night.
    bays('a').forEach((x, i) => {
      const color = BLOCK.car[i % BLOCK.car.length], k = ((i * 7) % 10) / 10;
      R.thing(x, ROW_A[0] + 2.2, (ctx, t) => { if (staffed(t) > k * 0.9 || i % 5 === 0) drawBlock(ctx, x - 0.9, ROW_A[0] + 0.3, 0, 1.8, 3.8, 1.3, color, null); }, { anim: true });
    });
    bays('b').forEach((x, i) => {
      const color = BLOCK.car[(i + 3) % BLOCK.car.length], k = ((i * 3) % 10) / 10;
      R.thing(x, ROW_B[0] + 2.2, (ctx, t) => { if (staffed(t) > k * 0.9 || i % 6 === 0) drawBlock(ctx, x - 0.9, ROW_B[0] + 0.3, 0, 1.8, 3.8, 1.3, color, null); }, { anim: true });
    });

    // The CEO's car, across two spaces (the bear sits on its roof at 4:30).
    block(R, CEO_CAR[0] - 1.6, ROW_A[0] + 0.3, 3.2, 3.8, 1.4, C.black, 'CEO (2 SPACES)');
    pin(R, { id: 'two-spaces', label: 'A car across two spaces', at: [CEO_CAR[0], CEO_CAR[1], 1.6], r: 0.9 }, 1);
    R.poke({ id: 'alarm', at: [60, ROW_A[0] + 2.2, 1.4], r: 0.8, say: 'WEE-OO WEE-OO. Nobody looks up.' });

    // Doug's car, and Doug, eating. At one the bear comes for his sandwich and
    // he ducks under the dashboard.
    block(R, DOUG_CAR[0] - 0.9, ROW_B[0] + 0.3, 1.8, 3.8, 1.3, C.green, null);
    R.thing(DOUG_CAR[0], DOUG_CAR[1] + 0.1, (ctx, t) => {
      const ducked = BEAR_TIMES[1] && ((t % 360) + 360) % 360 > BEAR_TIMES[1][0] && ((t % 360) + 360) % 360 < BEAR_TIMES[1][1] + 2;
      if (!ducked) person(ctx, DOUG_CAR[0], DOUG_CAR[1] + 0.4, 0.4, { ...folk(600, { top: C.brown }), pose: 'sit', dir: 'l' }, t);
      if (Q.detail) tag(ctx, DOUG_CAR[0], DOUG_CAR[1], 2.8, ducked ? 'DOUG (DUCKING)' : 'DOUG (LUNCH)', { size: 0.32 });
    }, { anim: true });
    pin(R, { id: 'doug', label: 'Someone eating lunch in their car', at: [DOUG_CAR[0], DOUG_CAR[1] + 0.4, 1.9], r: 0.8 }, 2);

    // The charger, with a gas car at it.
    block(R, 70.2, BD + 0.2, 0.4, 0.4, 1.6, C.teal, 'EV ONLY');

    // The front door's porch goose (a decoy), dressed for fall.
    block(R, DOOR[0] + 1.8, BD + 0.3, 0.6, 0.6, 0.9, C.grey, 'PORCH GOOSE');
    R.decoy({ id: 'porch-goose', at: [DOOR[0] + 2.1, BD + 0.6, 1.1], r: 0.7, say: 'A porch goose in a raincoat. New England, everybody.' });

    // The leaf pile at the left end (the goose is in it), the BEAR XING sign,
    // the leaf blower man.
    const pile = R.poke({ id: 'leaves', at: [3, AISLE, 0.6], r: 1, say: 'Leaves everywhere. One of them honked.' });
    R.thing(3, AISLE, (ctx) => drawBlock(ctx, 1.6, AISLE - 1.4, 0, 2.8, 2.8, 0.9 - pile.k() * 0.6, INK.maple, pile.k() > 0.5 ? null : 'LEAF PILE'), { anim: true });
    R.goose((t) => ({ x: 3, y: AISLE, z: 0, dir: 'r', pose: 'sit', hidden: pile.k() < 0.5 }),
      { kind: 'poke', inside: pile, hint: 'The leaf blower man built a pile at the end of the lot. Something\'s in it.' });
    block(R, 2.4, ROW_B[1] - 0.6, 0.3, 0.3, 2.2, INK.sticky, 'BEAR XING');
    const blower = route([[8, AISLE + 0.6], [100, AISLE + 0.6]], { speed: 1, loop: false });
    R.mover((t) => (H(t) > 8 && H(t) < 17 ? blower(t) : { x: -10, y: AISLE, gone: true }), (ctx, t, p) => {
      if (p.gone) return;
      person(ctx, p.x, p.y, 0, { ...folk(605, { top: C.mustard, bottom: C.green }), pose: 'carry', dir: p.dir, back: p.back }, t);
      if (Q.detail) tag(ctx, p.x, p.y, 3, 'LEAF BLOWER', { size: 0.3 });
    });

    // The dumpster pen at the edge of the woods, and the raccoon in it.
    block(R, DUMPSTER[0], DUMPSTER[1], DUMPSTER[2] - DUMPSTER[0], 0.3, 1.8, C.wood, null);
    const lid = R.poke({ id: 'dumpster', at: [110, 5, 1.6], r: 0.9, say: 'Something in there is chewing.' });
    R.thing(110, 5.2, (ctx) => drawBlock(ctx, 108.4, 3.6, 0, 3.2, 2.2, 1.5 + lid.k() * 0.4, C.green, lid.k() > 0.5 ? 'LID UP' : 'DUMPSTER'), { anim: true });
    pin(R, { id: 'raccoon', label: 'A raccoon', kind: 'poke', inside: lid, at: [110, 5, 1.9], r: 0.7, hint: 'The bear isn\'t the only one who likes the dumpster.' }, 3);

    // A lost car key, by the road.
    pin(R, { id: 'key', label: 'A lost car key', kind: 'hard', at: [88.4, ROAD[0] - 0.3, 0.05], r: 0.6,
      riddle: 'Somebody is walking home tonight.', hint: 'Look along the curb by the road, toward Dev\'s end, for something small and shiny.' }, 4);

    // The Courier's van, in the aisle with its hazards on, from 8:50 to 5.
    R.thing(54, AISLE, (ctx, t) => { if (H(t) > 8.8 && H(t) < 17.15) drawBlock(ctx, 52.6, AISLE - 1.2, 0, 3.8, 2, 1.9, C.mustard, 'COURIER'); }, { anim: true });

    // The bear.
    R.mover((t) => bearAt(t), (ctx, t, p) => {
      if (p.away) return;
      drawBlock(ctx, p.x - 0.8, p.y - 0.45, p.z, 1.6, 0.9, 1.1, BLOCK.bear, null);
      if (Q.detail) tag(ctx, p.x, p.y, p.z + 1.8, p.pose === 'eat' ? 'BEAR (LUNCH)' : p.pose === 'dig' ? 'BEAR (DUMPSTER)' : p.pose === 'sit' ? 'BEAR (ON CAR)' : 'BEAR', { size: 0.36, fill: INK.sticky });
    }, { bias: 0.2 });
    figure; at; D;
  },
};
