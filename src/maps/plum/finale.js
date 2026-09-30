// The ending: find all seven geese and the king tide comes in. The clock jumps
// to it (map.js, finale), just after midnight, and the camera goes to the
// turnpike by the drawbridge, where the Courier's van has stopped in the
// middle of the flood (day.js). The geese paddle out to it in a line, round
// it, and sign for the parcel for "G. Goose, Plum Island". It's greenhead fly
// spray. Every King Tide Dave drives past them, windows down (day.js).
//
// The game tells the map how long the lap has been going (fx.parade, seconds;
// 0 before it starts); the sky passes it on here every frame (follow), and the
// Turnpike draws it (swim(R) in its build). Greybox: the moves, not the art.
import { C, Q, goose, box, speech } from '../../engine/art.js';
import { route } from '../../engine/actors.js';
import { VAN_STUCK } from './day.js';
import { level } from './tide.js';
import { who } from './kit.js';

export const finale = { since: 0 };
// The paddle waits for the camera: the game pauses on the last honk, then
// flies to the turnpike (about four seconds).
const LEAD = 3.8;
export function follow(fx) {
  if (!fx.thumb) finale.since = fx.parade > LEAD ? fx.parade - LEAD : 0;
}

// Where the van is stuck, and the geese's way out to it: off the island's
// back shore, across the Plum Island River beside the bridge and over the
// flooded marsh, then round and round the van.
export const VAN = VAN_STUCK;
const OUT = [[59.2, 27.4], [58.4, 22.4], [59.4, 18.6]];
const SPEED = 1.6, GAP = 1.4 / SPEED, GEESE = 7;
const out = route(OUT, { speed: SPEED, loop: false });
const OUT_S = (Math.hypot(0.8, 5) + Math.hypot(1, 3.8)) / SPEED; // how long the paddle out takes
const RING = [2.4, 2]; // round the van
const END = OUT[OUT.length - 1];
function swimPath(s) {
  if (s < OUT_S) return out(s);
  // Round the van, counterclockwise from where the paddle out lands.
  const a = Math.atan2((END[1] - VAN[1]) / RING[1], (END[0] - VAN[0]) / RING[0]) + ((s - OUT_S) * SPEED) / RING[0];
  const x = VAN[0] + Math.cos(a) * RING[0], y = VAN[1] + Math.sin(a) * RING[1];
  const vx = -Math.sin(a), vy = Math.cos(a);
  return { x, y, dir: vx - vy >= 0 ? 'r' : 'l', moving: true };
}

export function swim(R) {
  for (let i = 0; i < GEESE; i++) {
    R.mover((t) => {
      if (!finale.since) return { x: -1e4, y: -1e4, out: true };
      return swimPath(Math.max(0, finale.since - i * GAP));
    }, (ctx, t, p) => {
      if (p.out || finale.since < i * GAP) return;
      goose(ctx, p.x, p.y, level(t), t + i * 0.37, { dir: p.dir, pose: Math.sin(finale.since * 3 + i) > 0.8 ? 'honk' : 'swim' });
    });
  }
  // The Courier, up on the van's roof, holding out the parcel; a goose signs,
  // the lid comes off: greenhead spray. A 14 second beat, over and over.
  const look = { top: C.brown, bottom: C.brown, hat: 'cap', skin: undefined };
  R.mover(() => (finale.since ? { x: VAN[0], y: VAN[1] } : { x: -1e4, y: -1e4, out: true }), (ctx, t, p) => {
    if (p.out) return;
    const k = finale.since % 14, z = 1.8;
    who(ctx, p.x, p.y, z, look, null, { pose: k < 4 ? 'carry' : k < 9 ? 'stand' : 'cheer', dir: 'l' }, t);
    if (k < 4) box(ctx, p.x - 0.5, p.y - 0.35, z + 1.05, 0.7, 0.5, 0.45, C.woodLight, { flat: true });
    else {
      box(ctx, p.x - 1, p.y - 0.3, z, 0.7, 0.5, 0.45, C.woodLight, { flat: true });
      if (k > 6) box(ctx, p.x - 0.8, p.y - 0.1, z + 0.45, 0.2, 0.2, Math.min(0.7, (k - 6) * 0.5), C.green, { flat: true });
    }
    if (!Q.detail) return;
    const say = k < 4 ? 'G. Goose?' : k < 6.5 ? 'Sign here.' : k < 10 ? 'Greenhead spray.' : 'Could\'ve used that this afternoon.';
    speech(ctx, p.x, p.y, z + 3, say, { size: 0.5 });
  }, { bias: 1 });
}
