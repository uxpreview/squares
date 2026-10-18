// The ending (a stub for the art session; the cast's artist fills it in):
// find every goose and most of the things and the clock jumps to 11:57pm
// (map.js, finale). The ground stop has lifted and Flight 1 to Orlando,
// de-iced and finally boarded, is lined up at the runway's end (day.js). The
// geese cross the runway in a line in front of it, and the plane waits for
// them, as the tower says it must. The Courier watches from C12's window.
//
// The game tells the map how long the ending has been going (fx.parade,
// seconds; 0 before it starts); the sky passes it on here every frame
// (follow), and the Runway draws the geese (crossing(R) in its build), so
// they sort with the plane.
export const finale = { since: 0 };
// The crossing waits for the camera: the game pauses on the last honk, then
// flies to the runway (about four seconds).
const LEAD = 3.8;
export function follow(fx) {
  if (fx && !fx.thumb) finale.since = fx.parade > LEAD ? fx.parade - LEAD : 0;
}
// The geese crossing in front of Flight 1, drawn by the Runway.
export function crossing(R) { // eslint-disable-line no-unused-vars
}
