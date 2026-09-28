// The ending: find all sixteen geese and the party starts. The clock jumps to
// the party (map.js, finale), the geese come out and conga round Main Street
// (the victory lap, along the street instead of round the plate), the Honks
// play the stage, and the Courier finally hands over the parcel for
// "G. Goose, The Block". It's a single sock: the laundromat's lost one.
//
// The game tells the map how long the lap has been going (fx.parade, seconds;
// 0 before it starts); the map's sky passes it on here every frame, and Main
// Street draws it (conga(R) in its build).
import { C, Q, goose, person, folk, speech, box } from '../../engine/art.js';
import { route } from '../../engine/actors.js';
import { LANES, STAGE, STAGE_Z } from './plan.js';

export const finale = { since: 0 };
// The sky calls this every frame with the game's fx.
export function follow(fx) {
  if (!fx.thumb) finale.since = fx.parade || 0;
}

// The conga: round the stage and out along every arm of Main Street and back,
// on both sides of the road, a goose every 1.6 units.
const S0 = LANES[1], S1 = LANES[2], NEAR = 8, FAR = 73;
const LAP = [
  [S1, NEAR], [S1, S0], [FAR, S0], [FAR, S1], [S1, S1], [S1, FAR],
  [S0, FAR], [S0, S1], [NEAR, S1], [NEAR, S0], [S0, S0], [S0, NEAR],
];
const lap = route(LAP, { speed: 2.2 });
const GAP = 1.6 / 2.2; // seconds between geese
const GEESE = 16;

// The handover, on the front of the stage, over and over while the geese go
// round: the Courier holds out the parcel, a goose takes it, the lid comes
// off, a sock. A 16 second beat.
const HAND = [STAGE[0] + STAGE[2] - 1.1, STAGE[1] + STAGE[3] - 1.1]; // the stage's front corner
const courier = { ...folk(5), top: C.brown, bottom: C.brown, hat: 'cap' };

// Main Street's build calls this. On a street, x and y are the world's.
export function conga(R) {
  const [ox, oy] = R.origin;
  for (let i = 0; i < GEESE; i++) {
    R.mover((t) => {
      if (!finale.since) return { x: -1e4, y: -1e4, out: true };
      const p = lap(finale.since - i * GAP);
      return { ...p, x: p.x - ox, y: p.y - oy };
    }, (ctx, t, p) => {
      if (p.out) return;
      const k = finale.since;
      // Each one joins as the line reaches it: nobody before their turn.
      if (k < i * GAP) return;
      goose(ctx, p.x, p.y, 0, t + i * 0.37, { dir: p.dir, pose: Math.sin(k * 3 + i) > 0.85 ? 'honk' : 'walk' });
    });
  }
  // The Courier and the parcel.
  R.mover(() => (finale.since ? { x: HAND[0] - ox, y: HAND[1] - oy } : { x: -1e4, y: -1e4, out: true }), (ctx, t, p) => {
    if (p.out) return;
    const k = finale.since % 16;
    const x = p.x, y = p.y, z = STAGE_Z;
    person(ctx, x, y, z, { ...courier, pose: k < 5 ? 'carry' : k < 12 ? 'stand' : 'cheer', dir: 'l' }, t);
    // The parcel: in his hands, then open on the deck, then the sock.
    const px = x - 0.9, py = y - 0.4;
    if (k < 5) box(ctx, x - 0.55, y - 0.35, z + 1.05, 0.7, 0.5, 0.45, C.woodLight, { flat: true });
    else {
      box(ctx, px - 0.35, py - 0.25, z, 0.7, 0.5, 0.45, C.woodLight, { flat: true });
      if (k > 7) sock(ctx, px, py, z + 0.45 + Math.min(1, (k - 7) / 1.5) * 0.7);
    }
    if (!Q.detail) return;
    const say = k < 5 ? 'G. Goose?' : k < 8 ? 'Sign here.' : k < 12 ? 'It\'s a sock.' : 'Happy Block Party!';
    speech(ctx, x, y, z + 3, say, { size: 0.5 });
  }, { bias: 0.5 });
}

// The laundromat's lost sock: stripy, one of a pair, now none of a pair.
function sock(ctx, x, y, z) {
  const X = x - y, Y = (x + y) / 2 - z * 1.12;
  ctx.save();
  ctx.translate(X, Y);
  ctx.beginPath();
  ctx.moveTo(-0.15, -0.7);
  ctx.lineTo(0.15, -0.7);
  ctx.lineTo(0.15, -0.05);
  ctx.quadraticCurveTo(0.2, 0.18, 0.5, 0.15);
  ctx.quadraticCurveTo(0.62, 0.3, 0.45, 0.35);
  ctx.lineTo(-0.05, 0.35);
  ctx.quadraticCurveTo(-0.2, 0.3, -0.15, 0.05);
  ctx.closePath();
  ctx.fillStyle = C.white;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = C.coral;
  for (const v of [-0.55, -0.3]) ctx.fillRect(-0.3, v, 0.6, 0.1);
  ctx.fillStyle = C.teal;
  ctx.fillRect(0.1, 0.05, 0.6, 0.4);
  ctx.restore();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.05;
  ctx.stroke();
  ctx.restore();
}
