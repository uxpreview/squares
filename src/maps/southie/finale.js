// The ending: find every goose and the clock jumps to 9:30pm (map.js,
// finale). The camera goes to the Green House's third floor, where the couch
// has hung on its rope all day. The geese haul it up to the porch, pivot it
// through the porch door ("PIVOT!"), and sit on it; the Courier makes it up
// the last flight with the parcel (day.js): packing tape. "Could've used that
// this morning."
//
// The game tells the map how long the lap has been going (fx.parade, seconds;
// 0 before it starts); the sky passes it on here every frame (follow).
// Farragut Road draws the couch coming up; the Couch (green-3) draws the geese.
// Greybox: the beats and where they happen; the art draws them properly.
export const finale = { since: 0 };
// The haul waits for the camera: the game pauses on the last honk, then
// flies to the house (about four seconds).
const LEAD = 3.8;
export function follow(fx) {
  if (!fx.thumb) finale.since = fx.parade > LEAD ? fx.parade - LEAD : 0;
}
// The beats, in seconds from when the camera's there.
export const HAUL = [0, 3.2]; // the couch up the last of the rope, to the porch rail
export const PIVOT = [3.2, 6]; // over the rail onto the porch, turned, through the door
// How far along a beat is (0 before, 1 after).
export const beat = ([a, b]) => Math.max(0, Math.min(1, (finale.since - a) / (b - a)));
export const playing = () => finale.since > 0;
