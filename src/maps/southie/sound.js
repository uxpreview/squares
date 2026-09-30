// Moving Day's sound: the street under everything (traffic far off, people
// about), and cues on the day's clock, taken from the day itself so they land
// on the picture: the queue behind the stuck truck honking from nine till
// three, the truck backing out after, the rain coming and going from ten till
// three, the neighbors cheering the truck out, gulls by day, and the planes
// coming in low over Pleasure Bay (ambient.js), one every minute. Every cue
// sits well under a honk (loudness() in audio.js).
import { LOOP, at, hour, rainK } from './clock.js';
import { PLANE } from './ambient.js';

const cues = [];
// Gulls, through the day.
for (const [h, n] of [[6.4, 1], [8.3, 2], [16.2, 1], [17.6, 2], [18.9, 1]]) cues.push({ at: at(h), name: 'gull', n });
// The queue behind the truck, honking, while it's stuck (farragut-road.js).
for (let h = 9.1; h < 15; h += 0.55) cues.push({ at: at(h), name: 'horn' });
// The rain (clock.js), a shower at a time.
for (let t = at(9.8); t < at(15.2); t += 8.5) if (rainK(t) > 0.15) cues.push({ at: t, name: 'shower' });
// Three o'clock: the neighbors bounce the car aside, a cheer, and the truck backs out.
cues.push({ at: at(15.25), name: 'cheer' }, { at: at(15.45), name: 'beep' });
// The planes, as each comes over (about when it crosses the street).
for (let t = PLANE * 0.45; t < LOOP; t += PLANE) if (hour(t) < 23 && hour(t) > 5.8) cues.push({ at: t, name: 'jet' });

export const sound = { bed: 'street', cues: cues.sort((a, b) => a.at - b.at) };
