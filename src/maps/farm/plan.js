// The Farm: where everything is. Spencer-Peirce-Little Farm, compressed but
// never rearranged (docs/levels/farm.md, Shape). We're looking northeast from
// over Little's Lane, toward the Great Marsh and the sea. World units: x runs
// northwest (x = 0, the top left of the screen) to southeast (x = W, the
// bottom right); y from the back, northeast (the marsh, y = 0) to the front,
// southwest (High Road, y = D). So east is straight across the screen to the
// right, and the lane, coming in from High Road, runs left to right.
//
//   x  0 ................. 34 ................ 64 ................. 96
//   y 0   The Marsh Edge: the Merrimack's flats | woods, the turnpike | the airfield
//   16    The Wedding Field  | The Ball Field     | The Fields:
//   36    The Barn           | The House          | the stripes, the orchard,
//   54    Little's Lane      | The Paddock        | Bowman's Pond, the track
//   72    High Road, off the front edge, and the meadow (the paper)
//
// Every area sits at the map's corner and takes its box as its shape (as on
// Plum Island and at Logan), so an area file works in the same units as this
// one. About 12 m a unit across the farm; people and animals are drawn at
// their own scale (a person is 2.3 units tall).

export const W = 96, D = 72;
// Where the bands split (y), and the columns (x).
export const MARSH = 16, MID = 36, FRONT = 54;
export const LEFT = 34, RIGHT = 64;

export const AREAS = {
  'marsh-edge': [0, 0, W, MARSH],
  'wedding-field': [0, MARSH, LEFT, MID],
  'ball-field': [LEFT, MARSH, RIGHT, MID],
  fields: [RIGHT, MARSH, W, D],
  barn: [0, MID, LEFT, FRONT],
  house: [LEFT, MID, RIGHT, FRONT],
  'littles-lane': [0, FRONT, LEFT, D],
  paddock: [LEFT, FRONT, RIGHT, D],
};

// ---------- The lane and the drives ----------
// Little's Lane: in from High Road at the front edge, east to the house,
// between a double row of old trees. The barn's on its left as it reaches
// the house, the paddock on its right.
export const LANE = [[12, 73], [24, 62], [33.5, 55.5], [39, 51.2]];
// The loop drive round the carriage barn (the visitor center) and the lot.
export const LOOP_DRIVE = { cx: 21, cy: 48.5, rx: 6.5, ry: 3.2 };
// The parking field: a mown field off the lane where everyone's sent.
export const PARKING = [2, 57, 15, 69];
// The farm track: from the house's yard back along the fields to the marsh.
export const TRACK = [[58, 52], [65.5, 50], [66, 30], [66.5, 17], [70, 12]];
// The Plum Island Turnpike, on its causeway along the back: from the mainland
// (off the left) east toward Plum Island (off the back right).
export const PIKE = [[-1, 10.5], [40, 10.8], [62, 10], [76, 6], [86, -1]];
// The airfield, at the back right: its runway points at the farm.
export const RUNWAY = [86.5, 1, 89.5, 15];

// ---------- The buildings ----------
// The stone house (about 1690), its front (the brick porch) facing the lane
// and the viewer; the wooden wing to its east; the farmhouse behind, across
// the breezeway. [x0, y0, x1, y1].
export const HOUSE = [42, 41, 50, 46];
export const PORCH = [45, 46, 47, 47.4];
export const WING = [50, 41.5, 54, 45.5];
export const FARMHOUSE = [47.5, 36.8, 53, 39.6];
// The ceremony: on the front lawn, the rows either side of a grass aisle,
// facing the porch's door, where the arch stands.
export const AISLE = 46;
export const ARCH = [46, 48.2];
// Cocktail hour: the lawn between the house's west gable and the barn.
export const COCKTAILS = [34.5, 40, 41, 47.5];
// The 1775 barn, northwest of the house; the carriage barn (its end is the
// visitor center), on the loop drive.
export const BARN = [14, 38.5, 28, 44];
export const CARRIAGE = [4, 44.5, 12, 50];
// The paddock: the main gated lot (two donkeys, goats and sheep), its
// shelters, and the pigs' pen beside it.
export const LOT = [38, 57, 54, 68];
export const PEN = [56, 59.5, 62, 66];
export const LOT_GATE = [46, 57, 2.2]; // on the lane's side
export const PEN_GATE = [56, 62.5, 1.6]; // into the lot

// ---------- The wedding ----------
// The tent, in the big lawn north of the barn and the house, the woods behind
// it, its open front toward the barn. [x0, y0, x1, y1].
export const TENT = [8, 20.5, 26, 30];
export const COOP = [30.5, 32, 33, 34.5]; // the hen coop, by the house
// The ball field: home plate by the house's end, the field opening to the
// northeast. The third base line runs back past the wedding (foul territory).
export const HOME = [40, 33];
export const BASES = [[40, 33], [47, 33], [47, 26], [40, 26]];
export const MOUND = [43.5, 29.5];

// ---------- The fields ----------
export const POND = [80, 44, 3.4]; // Bowman's Pond: middle, radius
export const ORCHARD = [68, 38, 76, 50];
export const STRIPES = [[67.5, 17.5, 95, 36.5], [67.5, 52, 95, 72]]; // the leased fields

// ---------- The marsh ----------
// Creeks winding back into the marsh, and the Merrimack's flats at the back left.
export const CREEKS = [
  [[30, 9.6], [27, 6], [30, 2.5], [28, -1]],
  [[54, 9.6], [56.6, 6.4], [53.8, 3], [55.5, -1]],
  [[72, 8.5], [70.4, 4.5], [73, 1], [72, -1]],
];
export const FLATS = (x) => 6.5 - 0.22 * x + 1.1 * Math.sin(x / 3.1); // the flats' edge, y (back left)

// The fences animals on the clock keep to (map.fences): the paddock's main
// lot, with its gate on the lane's side, and the pigs' pen beside it.
const ring = ([x0, y0, x1, y1]) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
export const FENCES = [
  { name: 'the paddock\'s fence', pts: ring(LOT), gates: [LOT_GATE] },
  { name: 'the pigs\' pen', pts: ring(PEN), gates: [PEN_GATE] },
];
