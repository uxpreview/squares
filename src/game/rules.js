// The rules of finding, in one place.
//
// Hints are earned: a place starts you with a few, and every few finds
// earns another. A hint goes in two steps: a line that points (it costs a
// hint), then a ring near the thing (free, once you've had the line).
//
// A place is finished at every goose and most of its things; the rest are
// for the stubborn (a medal, later).

export const HINTS = { start: 3, every: 3 };

// How many of a place's things finish it (with every goose).
export const MOST = 0.7;
export const need = (things) => Math.ceil(things * MOST);

// The kinds of find (R.find's kind) and the spread every area should have:
// about half spot, a third poke, one or two hard, and the goose never spot.
export const KINDS = ['spot', 'poke', 'hard'];

// Where a find is in its zone, in words: the first step of a hint for a find
// with no line of its own. Rough on purpose (a corner, a wall, high or low).
export function whereIs(zone, f, at) {
  const [x, y, z] = at;
  const fx = x / zone.w, fy = y / zone.d, floor = zone.ground ? zone.ground(x, y) : 0;
  const up = z - floor;
  const height = up > 4 ? 'High up' : up > 1.4 ? 'At about eye height' : 'Down low';
  // The left wall is along x = 0, the right wall along y = 0; the front is
  // far from both. Outdoors (no walls) the same, as sides.
  const L = zone.walls ? 'the left wall' : 'the back left side', Rt = zone.walls ? 'the right wall' : 'the back right side';
  let where;
  if (fx < 0.3 && fy < 0.3) where = zone.walls ? 'in the back corner' : 'right at the back';
  else if (fx < 0.3) where = fy > 0.7 ? `along ${L}, toward the front` : `along ${L}`;
  else if (fy < 0.3) where = fx > 0.7 ? `along ${Rt}, toward the front` : `along ${Rt}`;
  else if (fx > 0.7 && fy > 0.7) where = 'near the front corner';
  else if (fx > 0.7 || fy > 0.7) where = 'toward the front';
  else where = 'somewhere in the middle';
  const thing = f.goose ? 'the goose' : 'it';
  return `${height}, ${where}. Look for ${thing} there.`;
}
