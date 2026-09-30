// A day at Plum Island: everyone on the island's clock (tide.js), driving
// and walking between the areas. The engine draws each of them in whichever
// area they're in; off the map (the mainland, past the back edge) nobody
// draws them. The areas draw everyone who stays put.
//
// The day (hours; the clock is uneven, so at(h) gives the loop time):
//     5am  the Courier crosses the turnpike at first light with a parcel for
//          "G. Goose, Plum Island", and waits for the drawbridge
//   6:30am he parks at the Center and knocks on every door there
//    10am  the greenhead man gets out of his car, and the swarm finds him
//   9:30am the refuge is full; a line of cars waits on Sunset Drive all day,
//          and one car keeps trying
//    11am  the Courier tries the refuge: stuck in the line until 1:30pm
//     2pm  he asks the lifeguards at the Point
//   4:15pm the drawbridge goes up for a sailboat, and the road waits
//  10:25pm the Courier heads for the mainland, and the king tide has the
//          road by the drawbridge: the van stops in the middle of it
//  12:20am Every King Tide Dave drives out of the clam shack's lot, through
//          the flood, windows down, past the van, as he does every king tide
//
// npm run qa checks every walk: never faster than a run (cars included).
import { C, Q, folk, box, disc, alpha } from '../../engine/art.js';
import { schedule } from '../../engine/actors.js';
import { tag } from '../greybox.js';
import { PIKE, BLVD, GATE, SHACK, BRIDGE, LOTS, roadZ, h } from './land.js';
import { LOOP, KING_AT, at, hour, level } from './tide.js';
import { car, who } from './kit.js';

const IN = PIKE + 0.6, OUT = PIKE - 0.6; // the turnpike's lanes: onto the island, and off
const SOUTH = BLVD + 0.5, NORTH = BLVD - 0.5; // the island road's lanes
const OFF = -2.5; // the mainland, past the map's back edge
const DRIVE = 3.2, WALK = 1.3;
const wrap = (t) => (((t % LOOP) + LOOP) % LOOP);
const inside = (t, [a, b]) => { const s = wrap(t); return s >= a && s < b; };

// The drawbridge: up at dawn (for a lobster boat, while the Courier waits)
// and mid-afternoon (a sailboat, while the road waits). 0 down, 1 up.
export const OPENINGS = [[5.35, 5.95], [16.2, 16.9]];
export function bridgeUp(t) {
  const hr = hour(t);
  for (const [a, b] of OPENINGS) {
    if (hr >= a - 0.1 && hr < b + 0.1) return Math.min(1, (hr - a + 0.1) / 0.15, (b + 0.1 - hr) / 0.15);
  }
  return 0;
}
// Where cars wait for it, each side.
const WAIT_MAIN = BRIDGE[0] - 2.2, WAIT_ISLAND = BRIDGE[1] + 2.2;

// Which way something on a walk is heading, along x or y, from a moment ago.
function along(atT, t) {
  const a = atT(t - 0.2), b = atT(t);
  return Math.abs(b.x - a.x) > Math.abs(b.y - a.y) ? 'x' : 'y';
}

// A vehicle on the island's roads: its wheels on the road (up over the
// bridge), and only what's above the water when the road's under.
function vehicle(id, name, color, steps, o = {}) {
  const walk = schedule(steps, { loop: LOOP, name, speed: DRIVE });
  const atT = (t) => { const p = walk(t); return { ...p, z: roadZ(p.x, p.y) }; };
  let lastAlong = o.along || 'y';
  return {
    id, name, loop: LOOP, color,
    away: true, // off to the mainland, past the map's edge, some of the day
    at: atT,
    draw(ctx, t, p) {
      if (p.hide) return;
      if (p.moving) lastAlong = along(atT, t);
      else if (p.along) lastAlong = p.along;
      const L = level(t);
      car(ctx, p.x, p.y, p.z, color, lastAlong, o.label || null, t, L > p.z + 0.02 ? L : null);
      if (p.say && Q.detail) tag(ctx, p.x, p.y, Math.max(p.z, L) + 2.5, p.say, { size: 0.34, fill: alpha(C.white, 0.95) });
    },
  };
}

// ---------- The Courier ----------
// The van: over the turnpike at first light, a wait for the bridge, parked
// at the Center all morning, in the refuge's line at noon, at the Point in
// the afternoon, back at the Center for the evening, and off at 10:25pm,
// straight into the king tide.
export const VAN_STUCK = [OUT, 16.2];
const PARK_CENTER = [57.2, 34.6], PARK_POINT = [98.2, 33.6];
const van = vehicle('van', 'The Courier\'s van', C.brown, [
  [OUT, OFF], { until: 0.5, hide: true },
  [IN, OFF], [IN, WAIT_MAIN], { until: at(6.1), say: 'Bridge is up.' },
  [IN, BLVD - 1], [IN, SOUTH], [PARK_CENTER[0], SOUTH], PARK_CENTER, { until: at(10.75), along: 'y' },
  // Into the refuge's line, the end of it, and nowhere after two hours.
  [PARK_CENTER[0], SOUTH], [GATE + 13.2, SOUTH], { until: at(13.2), say: 'REFUGE FULL?' },
  [GATE + 13.2, NORTH], [PARK_POINT[0], NORTH], PARK_POINT, { until: at(16.6), along: 'y' },
  [PARK_POINT[0], NORTH], [IN + 0.4, NORTH], [PARK_CENTER[0], NORTH], PARK_CENTER, { until: at(22.4), along: 'y' },
  // Off the island before the tide takes the road. Nearly.
  [PARK_CENTER[0], NORTH], [OUT, NORTH], [OUT, WAIT_ISLAND], VAN_STUCK, { until: 332, say: 'Too deep.' },
  [OUT, OFF],
], { label: 'COURIER' });

// The Courier on foot, with the parcel under one arm: round the Center in
// the morning, to the lifeguards at the Point in the afternoon. Nobody's
// G. Goose.
const courierLook = folk(7, { top: C.brown, bottom: C.brown, hat: 'cap' });
function onFoot(id, steps, span) {
  const walk = schedule(steps, { loop: LOOP, name: 'The Courier', speed: WALK });
  return {
    id, name: 'The Courier', loop: LOOP, color: C.brown,
    away: true, // in the van the rest of the day
    at: (t) => { const p = walk(t); return { ...p, z: h(p.x, p.y) }; },
    draw(ctx, t, p) {
      if (!inside(t, span)) return;
      who(ctx, p.x, p.y, p.z, courierLook, 'The Courier', p, t);
      box(ctx, p.x + 0.2, p.y - 0.2, p.z + 1.2, 0.5, 0.4, 0.35, C.woodLight, { flat: true });
      if (p.say && Q.detail) tag(ctx, p.x, p.y, p.z + 3.8, p.say, { size: 0.34, fill: alpha(C.white, 0.95) });
    },
  };
}
const knock = (x, y, s = 3, say = null) => [[x, y], { wait: s, pose: 'carry', say }];
const center = [at(6.5), at(10.6)];
const courierCenter = onFoot('courier', [
  [PARK_CENTER[0] + 1, 33.4], { until: center[0] },
  ...knock(53.4, 32.6, 3, 'G. Goose?'), // the bait shop
  ...knock(50.4, 29.6, 2), ...knock(54.6, 29.4, 2), [58.5, NORTH - 0.9], ...knock(66.2, 29.8, 3, 'G. Goose?'), // the ice cream window
  [62, 38], [62, 43.2], { wait: 5, pose: 'point', say: 'G. Goose?' },
  [62, 38], [PARK_CENTER[0] + 1, 33.4], { until: center[1] },
], center);
const point = [at(14), at(16.5)];
const courierPoint = onFoot('courier-point', [
  [PARK_POINT[0] + 1, 32.6], { until: point[0] },
  [102.4, 34.6], [104.2, 40.2], { wait: 5, pose: 'point', say: 'G. Goose?' },
  [101.2, 37.6], { wait: 2, pose: 'carry', say: 'Never heard of him.' },
  [PARK_POINT[0] + 1, 32.6], { until: point[1] },
], point);

// ---------- Every King Tide Dave ----------
// Parked at the clam shack all day, facing the road. At the king tide he
// drives out through the flood, windows down, past the Courier's van, onto
// the island, and home again once the road's clear.
const DAVE_PARK = [SHACK[0] - 2, SHACK[1] + 1];
const dave = vehicle('dave', 'Every King Tide Dave', C.red, [
  DAVE_PARK, { until: KING_AT + 4, along: 'x' },
  [IN, DAVE_PARK[1]], [IN, 16.6], { wait: 1.5, say: 'Every time!' },
  [IN, BLVD - 1], [IN, SOUTH], [66, SOUTH], { until: 344 },
  [IN, BLVD - 1], [IN, DAVE_PARK[1]],
], { label: 'DAVE' });

// ---------- Traffic ----------
// Beach traffic: in all morning (the lots are full by ten), out before
// dark, waiting for the bridge in the afternoon.
const beachCars = [
  [at(7.6), [LOTS.residents[0] + 1.4, 35.2], C.teal, at(17.4)],
  [at(8.2), [LOTS.private[0] + 1.2, 35.2], C.mustard, at(16.1)],
  [at(8.8), [LOTS.private[0] + 2.8, 35.2], C.sky, at(18)],
  [at(9.4), [LOTS.point[0] + 3.4, 33.6], C.white, at(18.6)],
].map(([t0, [x, y], color, t1], i) => vehicle(`beach-${i}`, 'Beach traffic', color, [
  [IN, OFF], { until: t0, hide: true },
  [IN, BLVD - 1], [IN, SOUTH], [x, SOUTH], [x, y], { until: t1, along: 'y' },
  [x, NORTH], [OUT, NORTH], [OUT, WAIT_ISLAND], { until: Math.max(t1 + 16, at(16.95)) },
  [OUT, OFF],
]));

// The refuge's line: the lots fill by mid-morning and the gate closes, and
// the line waits on Sunset Drive all day. (The Courier joins the end of it
// at eleven.)
export const LINE = [GATE + 2.2, GATE + 4.4, GATE + 6.6, GATE + 8.8, GATE + 11];
const queue = LINE.map((x, i) => vehicle(`line-${i}`, 'The line for the refuge', [C.purple, C.coral, C.greyLight, C.teal, C.mustard][i], [
  [IN, OFF], { until: at(9.2 + i * 0.3), hide: true },
  [IN, BLVD - 1], [IN, SOUTH], [x, SOUTH], { until: at(17.1 + i * 0.2), along: 'x' },
  [x, NORTH], [OUT, NORTH], [OUT, OFF],
], { label: i === 0 ? 'THE LINE' : null }));
// And the one that keeps trying: up the other side to the gate, turned
// round, back to the end of the line, and again.
const tries = [];
for (let k = 0; k < 5; k++) {
  tries.push([GATE + 15.6, NORTH], [GATE + 1.4, NORTH], { wait: 4, say: k % 2 ? 'Just one car?' : 'Still full?' }, [GATE + 15.6, NORTH], [GATE + 15.2, SOUTH], { wait: 7 });
}
const trier = vehicle('trier', 'The car that keeps trying', C.coral, [
  [IN, OFF], { until: at(9.9), hide: true },
  [IN, BLVD - 1], [IN, SOUTH], [GATE + 15.2, SOUTH], { wait: 4 },
  ...tries,
  [IN - 1.4, NORTH], [OUT, NORTH], [OUT, OFF],
], { label: 'STILL TRYING' });

// ---------- The greenhead man ----------
// At ten a swarm of greenheads finds him in the Center's lot and follows him
// all day: across the lot, down the Town Beach and back, through the Center,
// past the refuge's line and out along the Lot 1 boardwalk, where he stops
// with everyone for the sunset. Then it's too dark for the flies, and he
// goes home.
const GH = [at(10), at(21.5)];
const ghSteps = [
  [58.2, 36.4], { until: GH[0], pose: 'stand' },
  { wait: 3, pose: 'point', say: 'What was that?' },
  { speed: 2.4 }, [62, 37.6], [62, 43.4], [70, 45], [92, 45.2], { wait: 3, pose: 'wave' },
  [72, 45.6], [63, 44.4], [62, 38], [61.6, NORTH - 1.2], [GATE + 1, NORTH - 1.2], { wait: 2, pose: 'wave' },
  [44, NORTH - 1.2], [42.4, 34.4], { speed: WALK }, [40, 36.4], [40, 43.6], [40.6, 46], { until: at(19.8), pose: 'wave' },
  { until: at(20.9), pose: 'stand', dir: 'l', back: true },
  [40, 43.6], [40, 36.4], [42, 34.4], { until: GH[1] + 1 },
  [58.2, 36.4],
];
const ghWalk = schedule(ghSteps, { loop: LOOP, name: 'The greenhead man', speed: WALK });
const ghLook = folk(141, { top: C.white, bottom: C.coral });
const greenheadMan = {
  id: 'greenhead', name: 'The greenhead man', loop: LOOP, color: C.coral,
  away: true, // in his car either side of his day
  at: (t) => { const p = ghWalk(t); return { ...p, z: h(p.x, p.y) }; },
  draw(ctx, t, p) {
    if (!inside(t, GH)) return;
    const pose = p.moving ? (p.speed > 2 ? 'run' : 'walk') : p.pose || 'stand';
    who(ctx, p.x, p.y, p.z, ghLook, 'The greenhead man', { ...p, pose }, t);
    if (!Q.detail) return;
    // The swarm, round his head (a dot each; the art makes them flies).
    for (let i = 0; i < 16; i++) {
      const a = t * 6 + i * 2.1, r = 0.5 + (i % 4) * 0.22;
      disc(ctx, p.x + Math.cos(a) * r, p.y + Math.sin(a * 1.1) * r * 0.7, p.z + 2.2 + Math.sin(a * 1.3) * 0.45, 0.07, C.ink, { stroke: false });
    }
    if (p.say) tag(ctx, p.x, p.y, p.z + 3.9, p.say, { size: 0.34, fill: alpha(C.white, 0.95) });
  },
};

export const walkers = [van, courierCenter, courierPoint, dave, ...beachCars, ...queue, trier, greenheadMan];
