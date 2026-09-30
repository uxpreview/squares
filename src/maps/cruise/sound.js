// The ship's sound: the sea washing past the hull under everything (the surf
// bed), and cues on the day's clock, from sounds the game already has (a
// ship's own horn is for later; this round the other level owns src/game/):
// gulls following the ship, the lifeboat drill's alarm (seven short bells and
// a long one), the limbo's cheers at noon, the bingo caller's ding, the crew
// party going off at 3, the horn as the ship comes into port, and the island's
// band playing the welcome to nobody. Every cue sits under a honk (QA checks).
import { at } from './style.js';

const cues = [];
for (const h of [7.4, 8.8, 10.9, 12.6, 14.2, 15.9, 17.3]) cues.push({ at: at(h), name: 'gull', n: 2 });
// The drill: seven short, one long.
for (let i = 0; i < 7; i++) cues.push({ at: at(10) + i * 0.45, name: 'bell' });
cues.push({ at: at(10) + 3.6, name: 'bridgebell' });
// The limbo, and bingo.
cues.push({ at: at(12.4), name: 'cheer' }, { at: at(12.9), name: 'cheer' });
for (const h of [15.05, 15.3, 15.55]) cues.push({ at: at(h), name: 'ding' });
cues.push({ at: at(15.9), name: 'cheer' }); // the crew party goes off
// Into port: the horn, then the welcome.
cues.push({ at: at(17.8), name: 'horn' }, { at: at(18.05), name: 'fanfare' });

export const sound = { bed: 'surf', cues };
