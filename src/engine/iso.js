// World geometry. Everything is measured in "units".
// A zone (a room, a floor, a stretch of beach) is S x S units of floor.
// Maps place zones anywhere in 3D; see src/engine/world.js.
//
// Axes: x runs toward the screen's lower-right, y toward the lower-left, z is up.
// The two back walls of a zone sit on its planes x = 0 (left wall) and y = 0 (right wall).

export const S = 16;        // zone floor size
export const WALL = 6;      // default back wall height
export const SLAB = 1.1;    // thickness of the floor slab under each zone
export const ZK = 1.12;     // how tall one unit of z looks on screen

// 3D -> 2D (iso space, 1 unit wide). The camera scales this to pixels.
export const isoX = (x, y) => x - y;
export const isoY = (x, y, z = 0) => (x + y) / 2 - z * ZK;

// 2D iso -> 3D point on the floor (z = 0)
export const unproject = (X, Y) => [Y + X / 2, Y - X / 2];

// A zone's picture in its own iso space (anchored at its back corner), with
// headroom above the walls for tall props like the rocket and the water tower.
export function zoneBounds(w = S, d = S, h = WALL) {
  return {
    x0: -d - 1.5,
    x1: w + 1.5,
    y0: -h * ZK - 9,
    y1: (w + d) / 2 + SLAB * ZK + 1.5,
  };
}
