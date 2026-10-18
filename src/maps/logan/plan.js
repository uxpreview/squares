// Departures: where everything is. Boston Logan, compressed but never
// rearranged (docs/levels/logan.md, Shape). World units: x runs along the
// airport, south (the water taxi, x = 0, the top left of the screen) to north
// (x = W, the bottom right); y from the back (the roads, downtown across the
// inner harbor behind them, y = 0) to the front (the runway and the outer
// harbor, y = D). We're looking west from over the water.
//
//   x  0 ............. 30 ............ 52 .......................... 104
//   y 0   The Curb: the water taxi | the garage, the tower | the Silver Line
//   12    Check-in        | Security       | The Gates (C12, C13, C14)
//   30    The Bag Room    | The Apron: the de-icing pad | three planes
//   48    The Runway: the light pier over the water | the runway ........
//   60    the harbor, and the paper: the plate is the water
//
// Every area sits at the map's corner and takes its box as its shape (as on
// Plum Island), so an area file works in the same units as this one.

export const W = 104, D = 60;
// Where the bands split (y), and the terminal's areas (x).
export const LAND = 12, AIR = 30, FRONT = 48;
export const CHECK = 30, SEC = 52;

export const AREAS = {
  curb: [0, 0, W, LAND],
  'check-in': [0, LAND, CHECK, AIR],
  security: [CHECK, LAND, SEC, AIR],
  gates: [SEC, LAND, W, AIR],
  'bag-room': [0, AIR, CHECK, FRONT],
  apron: [CHECK, AIR, W, FRONT],
  runway: [0, FRONT, W, D],
};

// Where the harbor bites into the land: the water taxi's corner at the back
// left, and in front the water under the light pier and along the seawall.
export const DOCK = [0, 0, 9, LAND];
export const SHORE = 16; // the runway's land starts here (x); water to its left
export const SEAWALL = 57; // the front edge of the land (y); water in front
// The runway itself, and its centerline.
export const STRIP = [18, 50.5, 102, 55];
export const CENTER = 52.75;

// The gates, along the airside glass, and the planes nosed in to them. Flight
// 1 to Orlando is at C12 (it never boards); the band's flight is at C13, the
// bride's at C14.
export const GATES = { C12: 62, C13: 78, C14: 94 };
// A toy plane (decision 10): nose at y NOSE, about 13 long and 13 across.
export const NOSE = 33;
export const PLANE = { len: 13, span: 13, body: 2.4 };
// The service road along the front of the apron, where the bag trains run.
export const ROAD = 46.8;

// The tower (the hero), by the garage at the back: two pylons, the cab on top.
export const TOWER = { x: 52, y: 1, h: 15 };
