// World geometry. Everything in the map is measured in "units".
// A room is S x S units of floor. Rooms sit on a GRID x GRID block, PITCH apart.
//
// Axes: x runs toward the screen's lower-right, y toward the lower-left, z is up.
// The two back walls of every room sit on the planes x = 0 (left wall) and y = 0 (right wall).

export const S = 16;        // room floor size
export const WALL = 6;      // default back wall height
export const SLAB = 1.1;    // thickness of the floor slab under each room
export const GAP = 5;       // space between rooms
export const PITCH = S + GAP;
export const GRID = 4;      // rooms per side
export const ZK = 1.12;     // how tall one unit of z looks on screen

// 3D -> 2D (iso space, 1 unit wide). The camera scales this to pixels.
export const isoX = (x, y) => x - y;
export const isoY = (x, y, z = 0) => (x + y) / 2 - z * ZK;

// 2D iso -> 3D point on the floor (z = 0)
export const unproject = (X, Y) => [Y + X / 2, Y - X / 2];

// Room-local bounds in iso space, including room for tall props above the walls.
export const ROOM_BOUNDS = {
  x0: -S - 1.5,
  x1: S + 1.5,
  y0: -WALL * ZK - 9,
  y1: S + SLAB * ZK + 1.5,
};
