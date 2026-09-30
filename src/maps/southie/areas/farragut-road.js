// Farragut Road (docs/levels/southie.md): the street in front of the row,
// parked both sides, and the rest of the row (not enterable) at both ends,
// East Broadway's end, the yards behind, and the shore road at the bottom.
// The rental truck comes down it at 7am and is stuck by 9, between a car
// parked on the west side and a pickup double-parked on the east, with a
// honking queue behind; the parked car's owner comes back at noon, looks,
// and walks off; at 3pm six neighbors bounce the car sideways and the truck
// gets out, to applause. The curb pile grows all morning and empties up the
// Yellow House all afternoon. The couch hangs on its rope in front of the
// Green House from 9am. Greybox: blocks, pins, the truck and the couch.
import { C, Q, folk, box } from '../../../engine/art.js';
import { drawLand } from '../../../engine/terrain.js';
import { block, figure, pin, tag, drawBlock } from '../../greybox.js';
import { land, h } from '../land.js';
import { ROAD, HOUSES, OTHER_HOUSES, ROW_X0, GROUND, SHORE_Y, CURB, FH } from '../plan.js';
import { hour, at, between, nightK } from '../clock.js';
import { house, stuff, dusk, car, truck } from '../kit.js';
import { finale, beat, playing, HAUL, PIVOT } from '../finale.js';
import { SIDING, INK, CARS } from '../style.js';

const G = GROUND;
const yOf = (id) => HOUSES.find(([k]) => k === id)[1];
// The truck's day: down the road from the north at 7, stuck by 9 in front of
// the Yellow House, out at 3pm, gone south.
const TRUCK_X = ROAD.mid - 1.2, STUCK = 33.5;
function truckY(t) {
  const hr = hour(t);
  if (hr < 7 || hr >= 16.2) return null;
  if (hr < 9) return -8 + (STUCK + 8) * Math.min(1, (hr - 7) / 1.6);
  if (hr < 15.2) return STUCK;
  return STUCK + (72 - STUCK) * ((hr - 15.2) / 1);
}
// The parked car in the way: bounced sideways at 3pm, a little each time.
const blockerX = (t) => { const hr = hour(t); return hr < 15 ? ROAD.park0 + 0.2 : ROAD.park0 + 0.2 - Math.min(1, (hr - 15) / 0.3) * 0.9; };
// The couch on its rope, in front of the Green House: up from the sidewalk at
// 9am, halfway up from 9:20 on, all day and all night.
const COUCH = [16.6, yOf('green') + 1];
function couchZ(t) {
  // (At the end the geese haul it up to the porch, and the house takes it in.)
  if (playing()) return beat(PIVOT) > 0 ? null : G + 6.2 + (2 * FH + 1 - 6.2) * beat(HAUL);
  const hr = hour(t);
  if (hr >= 5 && hr < 9) return null;
  if (hr >= 9 && hr < 9.35) return G + 0.4 + 5.8 * ((hr - 9) / 0.35);
  return G + 6.2 + 0.08 * Math.sin(t * 1.3);
}

export default {
  id: 'farragut-road',
  name: 'Farragut Road',
  blurb: 'One truck, one street built for horses, cars parked on both sides. The truck has been stuck since nine.',
  home: [22, 30],
  build(R) {
    drawLand(R, land);
    // The rest of the row: north of East Broadway, and south of the Grey One.
    OTHER_HOUSES.forEach((y, i) => {
      R.thing(ROW_X0 + 7, y + 4.5, (ctx) => house(ctx, ROW_X0, y, G, SIDING.others[i]));
      // (And printed again in dusk inks after dark.)
      R.thing(ROW_X0 + 7, y + 4.5, (ctx) => house(ctx, ROW_X0, y, G, SIDING.others[i], C.white, dusk), { fade: (t) => Math.round(nightK(t) * 8) / 8 });
    });
    // Parked cars, both sides (not across the chunk seams at y 16, 32, 48).
    const west = [3, 6.2, 9.4, 18.2, 21.4, 25, 28.2, 36, 42, 50, 53.4];
    const east = [2.4, 5.6, 8.8, 12, 20, 23.2, 26.4, 36.4, 41, 44.2, 50.4, 53.6];
    west.forEach((y, i) => R.thing(ROAD.park0 + 1.1, y + 2.8, (ctx) => car(ctx, ROAD.park0 + 1.1, y + 1.4, G, CARS[i % CARS.length], { dir: 1 })));
    east.forEach((y, i) => R.thing(ROAD.park1 - 1.1, y + 2.8, (ctx) => car(ctx, ROAD.park1 - 1.1, y + 1.4, G, CARS[(i + 3) % CARS.length], { dir: -1 })));
    // The car in the truck's way, and the pickup double-parked across from it.
    R.mover((t) => ({ x: blockerX(t) + 0.9, y: STUCK + 2.4 }), (ctx, t, p) => drawBlock(ctx, p.x - 0.9, STUCK + 1, G, 1.8, 2.8, 1.3, C.teal, 'parked'));
    block(R, ROAD.lane1 + 0.2, STUCK + 0.6, 1.9, 3.2, 1.6, C.red, 'pickup');
    // The truck.
    R.mover((t) => { const y = truckY(t); return y == null ? { x: -1e4, y: -1e4 } : { x: TRUCK_X + 1.2, y: y + 7 }; }, (ctx, t, p) => {
      if (p.x < -1e3) return;
      truck(ctx, TRUCK_X + 1.2, p.y - 3.5, G, { dir: 1 });
    });
    // The queue behind it, honking, while it's stuck.
    [24, 19.4].forEach((y, i) => block(R, ROAD.mid - 1.1, y, 2, 3, 1.3, CARS[(i + 5) % CARS.length], i ? '' : 'HONK', { anim: false }));
    // The Storrowed truck, parked, its roof peeled open.
    R.thing(ROAD.park1 - 1.2, 29 + 7, (ctx) => truck(ctx, ROAD.park1 - 1.2, 29 + 3.5, G, { dir: -1, roof: 'peeled' }));
    // The curb pile in front of the Yellow House (it empties up its stairs all afternoon).
    const pileY = yOf('yellow') + 2.4;
    const gone = (hh) => (t) => { const x = hour(t); return x >= 8 && x < hh; };
    [[0, CURB[0], C.purple, 'couch'], [2.2, CURB[1], C.wood, 'dresser'], [3.4, CURB[2], C.greyLight, 'TV'], [4.4, CURB[3], C.mustard, 'lamp']]
      .forEach(([dy, hh, c, n]) => stuff(R, 15.7, pileY + dy, 1.2, 1, 1, c, n, gone(hh), { z: G }));
    stuff(R, 15.7, pileY + 5.6, 1.4, 0.4, 1.8, C.white, 'mattress', between(8, 5), { z: G });
    // NO PARKING signs, and the goose poster on a pole.
    for (const y of [4, 22.6, 43.6]) block(R, ROAD.walk0 + 0.6, y, 0.2, 0.2, 2.4, INK.truck, 'NO PARKING');
    block(R, ROAD.walk1 - 0.8, 46.4, 0.2, 0.2, 2.6, C.white, 'GOOSE?');
    // The couch on the rope.
    R.mover((t) => { const z = couchZ(t); return z == null ? { x: -1e4, y: -1e4 } : { x: COUCH[0] + 0.9, y: COUCH[1] + 2, z }; }, (ctx, t, p) => {
      if (p.x < -1e3) return;
      drawBlock(ctx, COUCH[0], COUCH[1], p.z, 1.6, 2.4, 1, C.coral, 'COUCH');
    });
    // The sea wall along the shore road.
    block(R, 1, SHORE_Y - 0.1, 27, 0.5, 0.7, C.greyLight, '', { z: G - 0.6 });
    figure(R, ROAD.walk1 - 1.2, 38.6, folk(3), 'driver', { dir: 'l' });
    pin(R, { id: 'tag', label: 'A mattress tag', at: [16.2, pileY + 5.9, G + 1.1], r: 0.6 }, 1);
    pin(R, { id: 'mirror', label: 'A snapped-off side mirror', at: [ROAD.lane0 + 0.4, 29.4, G + 0.1], r: 0.6 }, 2);
    pin(R, { id: 'chair', label: 'A lawn chair saving a space', at: [ROAD.park1 - 1, 39, G + 0.6], r: 0.7 }, 3);
    R.goose([ROAD.walk1 - 1, 12.4, G], { dir: 'l' });
  },
};
