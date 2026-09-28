// The rooms' street fronts: what each room shows the street, drawn in the
// room itself (so it comes and goes with the room), on the street side of its
// door. The rooms are The Block's own files; a front is added to one on this
// map only (map.js), so The Block keeps looking as it did.
//
// A front, at its greybox: a canopy over the door in the room's colors, a step
// and a mat, a sign on a post saying what the room is, an OPEN or CLOSED card
// on its hours, and the doorway glowing at night while it's open. Each room's
// file (fronts/<id>.js) dresses its own.
import { C, box } from '../../../engine/art.js';
import { DOORS } from '../plan.js';
import { FRONT, canopy, doorstep, board } from '../style.js';
import { open, nightK } from '../clock.js';

// Where a room's door is, in the room's own units: which wall, the middle of
// the door along it, and how wide it is. The Observatory has none: you go in
// from the alley along its front, at y = 9.
export function doorOf(id) {
  const d = DOORS[id];
  return d ? { side: d.side, at: d.at, w: d.w ?? 2.2 } : null;
}

// A spot out in the street from a room's door: u along the wall, v out into
// the street (room units; x < 0 behind a left wall, y < 0 behind a right one).
export function outside(id, u, v) {
  const d = doorOf(id);
  return d.side === 'left' ? [-v, u] : [u, -v];
}

// The greybox front.
export function front(R, id, name) {
  const d = doorOf(id);
  const ink = FRONT[id];
  if (!d) {
    // The Observatory: a sign in the alley along its front.
    R.thing(17, 11, (ctx) => signPost(ctx, 17, 11, name, ink));
    return;
  }
  R.thing(...outside(id, d.at, 0.1), (ctx) => {
    doorstep(ctx, d.side, d.at, d.w);
    canopy(ctx, d.side, d.at, d.w + 1, 1.4, ink.stripes);
  });
  const [sx, sy] = outside(id, d.at - d.w / 2 - 1.2, 1.3);
  R.thing(sx, sy, (ctx) => signPost(ctx, sx, sy, name, ink, d.side === 'left' ? 'y' : 'x'));
  // OPEN or CLOSED, on its hours.
  R.thing(sx + 0.01, sy + 0.01, (ctx, t) => {
    const o = open(id, t) > 0.5;
    board(ctx, d.side === 'left' ? 'y' : 'x', sx, sy, 2.2, 1.2, 0.4, o ? 'OPEN' : 'CLOSED', { board: o ? C.butter : C.greyLight, ink: C.ink, size: 0.26, edge: 0.03 });
  }, { anim: true });
  // The doorway glows at night while it's open.
  const [gx, gy] = outside(id, d.at, -0.4);
  R.light({ at: [gx, gy, 1.6], r: 2.6, color: C.butter, k: (t) => nightK(t) * open(id, t) });
}

// A sign on a post: a board with the room's name, the post beside it.
export function signPost(ctx, x, y, name, ink, along = 'y') {
  box(ctx, x - 0.08, y - 0.08, 0, 0.16, 0.16, 3.6, C.ink, { flat: true, stroke: false });
  board(ctx, along, x, y, 3.0, Math.max(1.8, name.length * 0.32), 0.8, name, { board: ink.board, ink: ink.ink, size: 0.42 });
}
