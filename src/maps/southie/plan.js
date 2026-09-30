// Moving Day: where everything is (docs/levels/southie.md, "Shape"). World
// units: x runs east (toward the lower right of the screen), y runs south
// (toward the lower left), so we're looking northwest from over the harbor:
// the shore across the bottom, Castle Island at the right, the sunset at the
// back left. A person is 2.3 units tall (a unit is about 2.5 feet).
//
//   x  0 ...... 15.5 ...... 28.5 ............ 58 ............. 96
//   y 0   the row      | Farragut | Marine Park | Day Blvd's causeway,
//              | (north of| Road     | (the circle | Castle Island (the
//   10         |  Broadway)|          |  at East    | lot, the stand, the
//   ~~~~~~~~~~~ East Broadway ~~~~~~~~~ Broadway's  | fort)
//   17         | Green    |          |  end), lawns, ---------------------
//              | Yellow   |          |  playground, | Pleasure Bay, ringed
//              | Grey One |          |  bath house, | by its walkway
//   48         | the row  |          |  the beach   |
//              | goes on  |          |              | the Sugar Bowl
//   61 ~~~~~~~~~~~~~ Day Boulevard, the sea wall ~~~~~~~~~~~~~~~~~~~~~~~~~~
//   72 Dorchester Bay, the harbor, to the front edges
//
// The three houses you can step into are nine zones (a floor each), stacked
// FH apart on the ground; everything else is three areas of any shape on the
// land (land.js), which tile the map, water included.

export const W = 96, D = 68;
// The city's ground: sidewalks, the road, the yards.
export const GROUND = 0.4;

// ---------- The row ----------
// The west side of Farragut Road: houses facing east (their fronts at
// FRONT, their porches out to ROW_X1), the yards behind them.
// (Kept inside one of Farragut Road's 16-unit chunks, x 0 to 16, so the
// houses it draws itself never straddle a seam.)
export const ROW_X0 = 0.5, FRONT = 13, ROW_X1 = 15.5;
export const HOUSE_W = ROW_X1 - ROW_X0; // 15: the house and its porches, along x
export const HOUSE_D = 9; // along the road
export const FH = 4.4; // floor to floor
export const FLOORS = 3;
// The three you can step into, north to south: [id, y].
export const HOUSES = [
  ['green', 17],
  ['yellow', 27.5],
  ['grey', 38],
];
// The rest of the row, not enterable (the road area draws them): north of
// East Broadway, and south of the Grey One down toward the shore.
export const OTHER_HOUSES = [1, 49];
// East Broadway, coming in from the west across the row's gap to its end.
export const BROADWAY = [10.8, 15.2];

// ---------- Farragut Road ----------
// Sidewalk, parking, two lanes, parking, sidewalk (the park's side).
export const ROAD = { walk0: 15.5, park0: 17.5, lane0: 19.7, mid: 22, lane1: 24.3, park1: 26.5, walk1: 28.5 };
// Where it runs, north to south, to Day Boulevard at the shore.
export const ROAD_Y = [0, 60];

// ---------- The shore ----------
export const SHORE_Y = 62.5; // the sea wall along Day Boulevard, west of the park
// Day Boulevard: along the shore, up through the park past the circle, then
// out along Pleasure Bay's north shore to Castle Island's lot.
export const DAY_BLVD = [[0, 59.5], [26, 59.6], [30.5, 57], [33.4, 44], [34.4, 30], [35.2, 19], [37.4, 9.6], [43, 5.2], [52, 4.6], [76, 4.6], [80, 6.6]];
// The Farragut statue, on its circle at the end of East Broadway.
export const CIRCLE = [33.2, 12.6, 2.3];

// ---------- Marine Park and Pleasure Bay ----------
export const PARK_X = 28.5;
export const BAY = { x0: 50, y0: 9.5, x1: 74, y1: 49 }; // the water's rough box
export const BEACH_X = 42.5; // the beach starts, going down to the bay
export const BATH_HOUSE = [38.5, 23.5]; // Marine Park's bath house, by the beach
export const PLAYGROUND = [33.5, 40.5];
export const SHELTER = [37, 34.5];
// The Head Island causeway along the bay's south side, out to the Sugar Bowl.
export const HEAD_ISLAND = [[42, 53], [58, 53.3], [68.5, 53]];
export const SUGAR_BOWL = [72, 53, 3.3];
// The walkway down the bay's east side, from Castle Island toward the Sugar Bowl.
export const EAST_WALK = [[78.4, 15], [78.8, 30], [77.8, 45]];

// ---------- Castle Island ----------
export const ISLAND = [87.5, 10.5, 8.5]; // its mound: center and reach
export const FORT = [83.5, 5, 9, 9]; // Fort Independence's box (x, y, w, d)
export const LOT = [72, 6.6, 80, 13.4]; // the parking lot at the causeway's end
export const STAND = [68, 0.8]; // the hot dog stand, north of Day Boulevard
export const MCKAY = [93.4, 13.4]; // the McKay monument, facing the channel

// ---------- The areas ----------
// Each outdoor area is one zone at the map's corner with its boxes as its
// shape, so its file works in these units (like Plum Island's). The houses'
// footprints are left out of Farragut Road's.
const hy = HOUSES.map(([, y]) => y);
export const AREAS = {
  'farragut-road': [
    [0, 0, ROW_X0, D],
    [ROW_X0, 0, ROW_X1, hy[0]],
    [ROW_X0, hy[0] + HOUSE_D, ROW_X1, hy[1]],
    [ROW_X0, hy[1] + HOUSE_D, ROW_X1, hy[2]],
    [ROW_X0, hy[2] + HOUSE_D, ROW_X1, D],
    [ROW_X1, 0, PARK_X, D],
  ],
  'marine-park': [[PARK_X, 0, 58, D]],
  'castle-island': [[58, 0, W, D]],
};

// ---------- The curb ----------
// The hours the curb collector carries each free thing up the Yellow House
// (the couch, the dresser, the TV, the lamp): gone from the curb then, up on
// his floor about half an hour later.
export const CURB = [13.6, 15.2, 16.8, 18.4];
export const CURB_UP = 0.6;

// ---------- The loop ----------
export const LOOP = 360;
