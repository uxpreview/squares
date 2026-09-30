// Plum Island's sound: the surf and the wind in the grass under everything
// (the island bed), and cues on the day's clock, taken from the day itself
// so they land on the picture: gulls by day, the drawbridge's bell as it
// lifts, the little plane from the airfield taking off, Dave's horn as he
// drives through the flood, and after dark the water lapping and crickets
// in the marsh. Every cue sits well under a honk (loudness() in audio.js).
import { LOOP, KING_AT, at } from './tide.js';
import { OPENINGS } from './day.js';

const cues = [];
// Gulls, through the day.
for (const [h, n] of [[6.2, 1], [8.1, 2], [9.7, 2], [11.4, 1], [13.1, 1], [14.6, 2], [16.4, 2], [18.2, 1]]) cues.push({ at: at(h), name: 'gull', n });
// The drawbridge's bell, as each opening starts (day.js).
for (const [a] of OPENINGS) cues.push({ at: at(a - 0.1), name: 'bridgebell' });
// The airfield's plane takes off every 50 seconds (the Turnpike), by day.
for (let t = 8; t < at(20); t += 50) cues.push({ at: t, name: 'prop' });
// Dave, through the flood, horn going (day.js: out at the king tide).
cues.push({ at: KING_AT + 5, name: 'horn' });
// After dark: the water lapping, and crickets in the marsh.
for (let t = at(21.8); t < LOOP - 12; t += 9) cues.push({ at: t, name: 'lap' });
for (let t = at(22) + 4; t < LOOP - 14; t += 13) cues.push({ at: t, name: 'crickets' });

export const sound = { bed: 'island', cues };
