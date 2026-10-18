// The Curb (greybox): the departures curb and the roads behind it, along the
// back of the whole airport. The water taxi dock on the inner harbor at the
// left end, the central garage and the control tower (the hero) in the middle,
// the Silver Line stop and arrivals pick-up at the right. Running gag: one
// minivan circles the airport all day, waved on every time it stops.
import { C, folk, box } from '../../../engine/art.js';
import { ground, block, pin, figure, tag, drawBlock } from '../../greybox.js';
import { TONE, BLOCK, INK, line, water, run } from '../style.js';
import { W, LAND, DOCK, TOWER } from '../plan.js';

export default {
  id: 'curb',
  name: 'The Curb',
  blurb: 'Departures, where every car stops and a trooper says it can\'t. One minivan has been round eleven times.',
  describe: 'A long curb along the back of the airport: taxis queued, a bus stop, a family unloading a hatchback, a man saying a very long goodbye. A water taxi dock at one end, the garage and the control tower in the middle. A minivan circles all day and never gets to stop.',

  build(R) {
    ground(R, { floor: TONE.curb, grid: false, name: 'THE CURB', nameAt: [30, 9.5] });
    R.rug((ctx) => {
      // The roadway, two lanes, and the water at the dock's corner.
      line(ctx, DOCK[2], 0.6, W - DOCK[2], 6.2, TONE.road);
      for (let x = DOCK[2] + 1; x < W - 1; x += 3) line(ctx, x, 3.6, 1.4, 0.12, C.white);
      water(ctx, DOCK[0], DOCK[1], DOCK[2] - DOCK[0], DOCK[3] - DOCK[1]);
    });

    // The water taxi's dock, on the inner harbor, and its boat.
    run(R, 2, 3, 6, 2.2, 0.35, C.wood, 'WATER TAXI');
    R.mover((t) => ({ x: 4 + Math.sin(t * 0.3) * 0.4, y: 7.5 }), (ctx, t, p) => drawBlock(ctx, p.x - 2, p.y - 1, 0, 4, 2, 0.9, C.white, 'BOAT'));

    // The garage and the tower (the hero), at the back.
    run(R, 34, 0.4, 14, 4.2, 5, INK.concrete, 'CENTRAL GARAGE', { step: 4.7 });
    const { x: tx, y: ty, h: th } = TOWER;
    R.thing(tx + 2, ty + 2, (ctx) => {
      box(ctx, tx, ty, 0, 1.2, 1.6, th, BLOCK.wall, { flat: true });
      box(ctx, tx + 2.8, ty, 0, 1.2, 1.6, th, BLOCK.wall, { flat: true });
      box(ctx, tx + 1.2, ty + 0.3, th * 0.45, 1.6, 1, 1.4, BLOCK.wall, { flat: true });
      box(ctx, tx - 0.6, ty - 0.4, th, 5.2, 2.4, 2.4, BLOCK.machine, { flat: true });
      tag(ctx, tx + 2, ty + 0.8, th + 3.2, 'THE TOWER');
    });

    // The family unloading eleven bags from one hatchback, and their skis.
    block(R, 15, 4.2, 5, 2.2, 1.6, C.teal, 'HATCHBACK');
    for (let i = 0; i < 5; i++) block(R, 15 + i * 1.1, 7.2, 0.9, 0.7, 0.8 + (i % 3) * 0.3, [C.coral, C.navy, C.mustard][i % 3], null);
    figure(R, 21, 8.6, folk(3), 'ELEVEN BAGS');
    figure(R, 13.5, 8.2, folk(8), null);
    pin(R, { id: 'skis', label: 'A pair of skis', at: [21.5, 7.4, 1.2], r: 0.8 }, 1);

    // A gull on a lamppost: not the goose.
    block(R, 25.6, 7, 0.4, 0.4, 4, C.navy, null);
    R.decoy({ id: 'gull', at: [25.8, 7.2, 4.5], r: 0.8, say: 'A gull. Unimpressed.' });
    block(R, 25.4, 6.8, 0.8, 0.8, 0.4, C.white, 'GULL', { z: 4 });

    // The smokers' corner, and the bin a raccoon lives in.
    figure(R, 29, 9.5, folk(14), null);
    figure(R, 30.6, 10.2, folk(21), null);
    const bin = R.poke({ id: 'bin', at: [32.2, 10.4, 0.8], r: 0.8, say: 'Somebody is eating in here.' });
    R.thing(32.2, 10.4, (ctx) => drawBlock(ctx, 31.7, 9.9, 0, 1, 1, 1 + bin.k() * 0.5, C.grey, 'BIN'), { anim: true });
    pin(R, { id: 'raccoon', label: 'A raccoon', kind: 'poke', inside: bin, at: [32.2, 10.4, 1.4], r: 0.7, hint: 'The bin by the smokers is eating somebody\'s pretzel.' }, 2);

    // The man saying goodbye for forty minutes, and the trooper.
    figure(R, 42, 9.2, folk(30), 'GOODBYE');
    figure(R, 43, 9.6, folk(31), null);
    figure(R, 57, 7.4, folk(40, { top: C.navy }), 'TROOPER');
    // The garage's ticket machine (the thing a first visit is nudged to tap).
    block(R, 47.2, 5.2, 0.9, 0.7, 1.4, BLOCK.machine, null);
    R.poke({ id: 'ticket', at: [47.6, 5.5, 1.2], r: 0.8, say: 'Insert ticket. Weep.', teach: true });

    // The taxi queue: the goose is in the back of the second one, meter running.
    for (let i = 0; i < 4; i++) if (i !== 1) block(R, 61 + i * 3.6, 4.2, 3, 1.8, 1.4, BLOCK.vehicle, i === 0 ? 'TAXI' : null);
    const taxi = R.poke({ id: 'taxi', at: [66.2, 5.1, 1.1], r: 1, say: 'Meter\'s running.' });
    R.thing(66.2, 5.1, (ctx) => drawBlock(ctx, 64.6, 4.2, 0, 3, 1.8, 1.4 - taxi.k() * 0.7, BLOCK.vehicle, 'TAXI'), { anim: true });
    R.goose((t) => ({ x: 66.2, y: 5.4, z: 0.3, dir: 'l', pose: 'sit', hidden: taxi.k() < 0.5 }),
      { kind: 'poke', inside: taxi, hint: 'One of the taxis has a very quiet passenger.' });

    // Bollards along the curb, one with a lost glove on it (Boston puts them up).
    for (let x = 74; x <= 86; x += 2.4) block(R, x, 7.1, 0.4, 0.4, 0.9, C.navy, null);
    pin(R, { id: 'glove', label: 'A lost glove', kind: 'hard', at: [83.8, 7.3, 1.1], r: 0.6, riddle: 'Put up where its owner might see it.', hint: 'Somebody found it and left it on a post, as you do here.' }, 3);

    // The Silver Line stop, and arrivals pick-up at the right end.
    run(R, 88, 1.4, 9, 2.4, 2.2, C.grey, 'SILVER LINE');
    block(R, 90, 8.5, 0.3, 0.3, 2.6, C.navy, null);
    figure(R, 98.5, 9.4, folk(50), 'RAY\'S FAMILY');
    figure(R, 100, 9.8, folk(51), null);
    figure(R, 101.2, 9.2, folk(52, { scale: 0.7 }), null);
    block(R, 98, 8.2, 3.2, 0.2, 0.9, C.white, 'WELCOME HOME RAY', { z: 1.6 });
    pin(R, { id: 'family', label: 'Uncle Ray\'s family', after: 'runway:ray', at: [100, 9.8, 2.8], r: 1, riddle: 'Ray\'s box says: meet me at the curb.' }, 4);

    // The minivan, circling the airport all day: along the curb, waved on, round again.
    R.mover((t) => {
      const lap = 52, k = ((t % lap) + lap) % lap / lap;
      return { x: W - 3 - k * (W - 14), y: 2.1 };
    }, (ctx, t, p) => drawBlock(ctx, p.x - 1.6, p.y - 0.9, 0, 3.2, 1.8, 1.6, C.purple, 'MINIVAN'));
  },
};
