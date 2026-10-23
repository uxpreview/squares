// Pitch Day: where everything is. Primal's top floor, in a building in the
// woods (docs/levels/agency.md, Shape). World units: x runs along the
// building, from the quiet end (Leadership, x = 0, the top left of the
// screen) to Dev and QA (the bottom right); y from the woods at the back
// (y = 0) to the road in front (y = D). We're looking at it from over the
// parking lot.
//
//   x  0 ... 16 ... 32 ........ 56 ... 72 ... 88 ... 104 .. 118
//   y 0   Leadership | Marketing | Front of house | Creative | UX | Dev, QA | the drive
//   26    ...................... the lot ....................................
//   40    ...................... the road ...................................
//   44
//
// The office is the top floor, at z FLOOR, standing on two empty storeys that
// aren't on the map (place.below): each of the six stretches of floor draws
// their outside under its own front edge. Every area sits at the map's corner
// and takes its box as its shape, so an area file works in the same units as
// this one.

export const W = 118, D = 44;
// The building, and how high its top floor stands (two storeys of 3.2).
export const BW = 104, BD = 26, FLOOR = 6.4, STOREY = 3.2;
// The floor's three bands: desks off the back wall, the spine (walking, the
// glass rooms), desks off the front wall.
export const BACK = 8, FRONT = 18;
// Where people walk along the spine.
export const SPINE = 13;
// Where people stand at the front windows at bear o'clock.
export const SILL = BD - 0.7;

// Each team's stretch of floor, left to right, and the lot (an L: in front,
// and the drive up the right-hand end).
export const SLICE = { leadership: [0, 16], marketing: [16, 32], front: [32, 56], creative: [56, 72], ux: [72, 88], 'dev-qa': [88, 104] };
export const AREAS = {
  ...Object.fromEntries(Object.entries(SLICE).map(([id, [a, b]]) => [id, [[a, 0, b, BD]]])),
  lot: [[0, BD, W, D], [BW, 0, W, BD]],
};

// The lot: two rows of cars facing each other across an aisle, the road
// along the front, the drive up the right to the dumpster pen.
export const ROW_A = [BD + 1, BD + 5.4]; // nose to the building
export const AISLE = BD + 7.2;
export const ROW_B = [BD + 9, BD + 13.4];
export const ROAD = [40, D];
export const DRIVE = [106.5, 114.5];
export const BAY = 2.4; // a parking space's width
export const DUMPSTER = [107, 2.5, 113, 7.5];
// The front door, at the foot of the building under the front of house.
export const DOOR = [44, BD];

// The front of house: the stair tower (the hero, an octagon) at the back,
// reception, the kitchen, and the pitch room at the front.
export const TOWER = { x: 44, y: 4, r: 3, h: 8.5 };
export const PITCH = [40, 18.4, 55.4, 25.6];

// The CEO's car, across two spaces right under the pitch room.
export const CEO_CAR = [49.5, ROW_A[0] + 2.2];
// Doug's car, where he eats lunch at one.
export const DOUG_CAR = [21.5, ROW_B[0] + 2.2];
