// Moving Day's sound: the road and the harbor under everything (traffic
// coming and going on Farragut Road, Pleasure Bay lapping at the seawall,
// the wind out on Castle Island), birds in Marine Park at dawn and crickets
// at night, kids in the park by day, and the rain from ten till three. In an
// apartment the outdoors goes muffled and you hear the apartment: a fridge,
// the ball game on a radio, the open house, the builders. And cues on the
// day's clock, taken from the day itself so they land on the picture: the
// queue behind the stuck truck honking from nine till three, the truck
// backing out after, the neighbors cheering the truck out, gulls by day,
// and the planes coming in low over Pleasure Bay (ambient.js), one every
// minute. Every bed and cue sits under a honk (node tools/sound.mjs southie).
import { LOOP, at, hour, rainK, nightK } from './clock.js';
import { PLANE } from './ambient.js';

const cues = [];
// Gulls, through the day.
for (const [h, n] of [[6.4, 1], [8.3, 2], [16.2, 1], [17.6, 2], [18.9, 1]]) cues.push({ at: at(h), name: 'gull', n });
// The queue behind the truck, honking, while it's stuck (farragut-road.js).
for (let h = 9.1; h < 15; h += 0.55) cues.push({ at: at(h), name: 'horn', zone: 'farragut-road' });
// Three o'clock: the neighbors bounce the car aside, a cheer, and the truck backs out.
cues.push({ at: at(15.25), name: 'cheer', zone: 'farragut-road' }, { at: at(15.45), name: 'beep', zone: 'farragut-road' });
// The planes, as each comes over (about when it crosses the street).
for (let t = PLANE * 0.45; t < LOOP; t += PLANE) if (hour(t) < 23 && hour(t) > 5.8) cues.push({ at: t, name: 'jet' });

const within = (h, a, b, ramp = 0.6) => Math.max(0, Math.min(1, (h - a) / ramp, (b - h) / ramp));

// Outdoors: how near the road, the water and the park are.
const OUT = {
  'farragut-road': { road: 1, water: 0.3, park: 0.6 },
  'marine-park': { road: 0.6, water: 0.6, park: 1 },
  'castle-island': { road: 0.3, water: 1, park: 0.5, wind: 0.9 },
};
const WHOLE = { road: 0.8, water: 0.5, park: 0.6 };
// The apartments: what's going on inside, by the hour.
const IN = {
  'green-1': () => ({ hum: 0.5, radio: 0.7 }), // the landlady, fifty-two years, the game on
  'yellow-2': (h) => ({ hum: 0.5, radio: 0.5 * within(h, 13, 23) }),
  'grey-1': (h) => ({ hum: 0.3, chatter: 0.5 * within(h, 9, 17) }), // the open house
  'grey-2': (h) => ({ reno: 0.4 * within(h, 8, 16) }),
  'grey-3': (h) => ({ reno: within(h, 8, 16) }), // the builders, upstairs
};

function bed(t, here) {
  const h = hour(t), n = nightK(t), rain = rainK(t);
  const inside = here.zone && !OUT[here.zone];
  const a = OUT[here.zone] || WHOLE;
  const out = {
    street: a.road * (0.5 + 0.5 * within(h, 7, 21)),
    harbor: a.water,
    wind: a.wind || 0.4,
    birds: a.park * within(h, 5, 8.5),
    kids: a.park * 0.6 * within(h, 9.5, 18) * (1 - rain),
    night: a.park * 0.8 * n,
    rain,
  };
  if (!inside) return out;
  for (const k of Object.keys(out)) out[k] *= 0.8;
  return { hum: 0.4, ...out, ...(IN[here.zone] ? IN[here.zone](h) : {}), muffle: 0.7 };
}

export const sound = { bed, cues: cues.sort((a, b) => a.at - b.at) };
