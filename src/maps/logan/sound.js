// Departures' sound (greybox): the terminal's hum and chatter indoors, the
// wind, the harbor and the roads outside, and cues on the day's clock: a jet
// landing or taking off every half minute by day (none in the ground stop),
// the gate's chime, gulls on the runway. The art session tunes it; every bed
// and cue sits under a honk (node tools/sound.mjs logan).
import { LOOP, at, stopped, dark, flying } from './clock.js';

const cues = [];
// Jets on the runway, every thirty seconds, from 5am till the ground stop
// (runway.js), and Flight 1 taking off at the end of the night.
for (let t = 4; t < LOOP; t += 30) if (flying(t)) cues.push({ at: t, name: 'jet' });
cues.push({ at: at(24.1), name: 'jet' });
// The gate's chime before an announcement.
for (let t = 11; t < LOOP; t += 37) cues.push({ at: t, name: 'ding', zone: 'gates' });
// Gulls on the runway, by day.
for (const h of [6.5, 9, 12.4, 14.8]) cues.push({ at: at(h), name: 'gull', n: 2, zone: 'runway' });

// Each area: how much of the terminal, the roads and the harbor it hears.
const AREAS = {
  curb: { road: 1, harbor: 0.4, inside: 0 },
  'check-in': { road: 0.2, harbor: 0, inside: 1 },
  security: { road: 0, harbor: 0, inside: 1 },
  gates: { road: 0, harbor: 0, inside: 1 },
  'bag-room': { road: 0, harbor: 0, inside: 0.6, belts: 1 },
  apron: { road: 0, harbor: 0.3, inside: 0 },
  runway: { road: 0, harbor: 1, inside: 0 },
};
const WHOLE = { road: 0.3, harbor: 0.4, inside: 0.3 };

function bed(t, here) {
  const a = AREAS[here.zone] || WHOLE;
  return {
    street: a.road * (dark(t) ? 0.5 : 1),
    harbor: a.harbor * 0.8,
    wind: 0.5 + (stopped(t) ? 0.3 : 0),
    chatter: a.inside * 0.7,
    hum: (a.belts || 0) * 0.8 + a.inside * 0.2,
  };
}

export const sound = { bed, cues };
