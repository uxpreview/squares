// Plum Island's sound: the surf, loudest on the beaches and a little louder
// as the tide comes in; the wind in the dune grass; water lapping on the
// river side; a beach full of people by day at the Center and the Town
// Beach; birds in the marsh at dawn; crickets after dark; the road on the
// Turnpike. And cues on the day's clock, taken from the day itself so they
// land on the picture: gulls by day, the drawbridge's bell as it lifts, the
// little plane from the airfield taking off, Dave's horn as he drives
// through the flood, and after dark the water lapping. Every bed and cue
// sits under a honk (node tools/sound.mjs plum).
import { LOOP, KING_AT, at, hour, level, nightK, LOW, KING } from './tide.js';
import { OPENINGS } from './day.js';

const cues = [];
// Gulls, through the day.
for (const [h, n] of [[6.2, 1], [8.1, 2], [9.7, 2], [11.4, 1], [13.1, 1], [14.6, 2], [16.4, 2], [18.2, 1]]) cues.push({ at: at(h), name: 'gull', n });
// The drawbridge's bell, as each opening starts (day.js).
for (const [a] of OPENINGS) cues.push({ at: at(a - 0.1), name: 'bridgebell', zone: 'turnpike' });
// The airfield's plane takes off every 50 seconds (the Turnpike), by day.
for (let t = 8; t < at(20); t += 50) cues.push({ at: t, name: 'prop', zone: 'turnpike' });
// Dave, through the flood, horn going (day.js: out at the king tide).
cues.push({ at: KING_AT + 5, name: 'horn', zone: 'turnpike' });
// After dark: the water lapping.
for (let t = at(21.8); t < LOOP - 12; t += 9) cues.push({ at: t, name: 'lap' });

// Each area: how near the surf, the river and the beach crowd are, and how
// much marsh (birds at dawn, crickets at night) is round it.
const AREAS = {
  center: { surf: 1, river: 0, crowd: 1, marsh: 0.3 },
  'town-beach': { surf: 1, river: 0, crowd: 0.8, marsh: 0.3 },
  'refuge-beach': { surf: 1, river: 0, crowd: 0.1, marsh: 0.4 },
  'north-point': { surf: 0.8, river: 0.5, crowd: 0.2, marsh: 0.3 },
  'refuge-dunes': { surf: 0.55, river: 0, crowd: 0, marsh: 1, wind: 1 },
  turnpike: { surf: 0.25, river: 0.5, crowd: 0, marsh: 1, road: 0.5 },
  sound: { surf: 0.15, river: 1, crowd: 0, marsh: 1 },
};
const WHOLE = { surf: 0.7, river: 0.2, crowd: 0.3, marsh: 0.6, road: 0.15 };

const within = (h, a, b, ramp = 0.6) => Math.max(0, Math.min(1, (h - a) / ramp, (b - h) / ramp));

function bed(t, here) {
  const a = AREAS[here.zone] || WHOLE, h = hour(t), n = nightK(t);
  const tide = (level(t) - LOW) / (KING - LOW); // 0 at low water, 1 at the king tide
  const day = within(h, 9.5, 17.5);
  return {
    surf: a.surf * (0.75 + 0.25 * tide),
    wind: a.wind || 0.6,
    harbor: a.river * 0.8,
    kids: a.crowd * day,
    street: (a.road || 0) * within(h, 7, 20),
    birds: a.marsh * 0.8 * within(h, 5, 8.5),
    night: (0.4 + 0.6 * a.marsh) * n,
  };
}

export const sound = { bed, cues };
