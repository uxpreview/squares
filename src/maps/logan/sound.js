// Departures' sound. Inside the terminal (check-in, security, the gates):
// the crowd's chatter and the building's hum, loud in the morning rush, a
// roar at the ground stop, low in the stuck night, with the belts' rollers
// clacking behind the counters and through the X-rays, and at the gates the
// band rehearsing all day (louder once its tuba's back), the game on the
// bar's TV, and at night a hush, everyone asleep across the seats. The
// outdoors comes in muffled. The bag room: motors, rollers, bags thumping
// down the chutes. Outside: the roads and the crowd at the curb, the harbor
// lapping at the dock and the runway's seawall (the sea getting up into a
// surf in the storm), the planes' engines idling at the gates, de-icers
// hissing after dark, and the wind, building from three into the nor'easter
// and easing after eleven.
//
// Cues on the day's clock, taken from the day itself so they land on the
// picture: jets landing and taking off on the runway twice a half minute by
// day (none in the ground stop) and Flight 1 going after midnight; the gate's
// announcement chime; bird control's cannon going BANG (ambient.js, BANGS)
// and every gull for a mile going up; gulls by day; car horns at the curb in
// the rush; the scanner beeping at security; the jam getting whacked in the
// bag room; the tanker's horn as it heads out; the chapel's organ when
// everything's canceled at six; a cheer at the gates when the stop lifts; the
// plows beeping down the runway all night; the water lapping in the dark.
// Every bed and cue sits under a honk (node tools/sound.mjs logan).
import { LOOP, at, hour, flying } from './clock.js';
import { BANGS, isFound } from './ambient.js';

const H = (t) => { const h = hour(t); return h < 4 ? h + 24 : h; }; // 4 to 28
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const within = (h, a, b, r = 0.6) => clamp(Math.min((h - a) / r, (b - h) / r), 0, 1);
const ramp = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
// A level through the day, straight between [hour, level] points.
function curve(pts, h) {
  if (h <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (h <= pts[i][0]) { const [h0, v0] = pts[i - 1], [h1, v1] = pts[i]; return v0 + ((v1 - v0) * (h - h0)) / (h1 - h0); }
  return pts[pts.length - 1][1];
}
// How busy the terminal is: the first wave, the rush, a quiet noon, everyone
// trying to beat the storm, the roar at the ground stop, settling in, a lift
// when it lifts, the small hours.
const BUSY = [[4, 0.35], [5.5, 0.65], [6.5, 1], [10.5, 1], [11.5, 0.6], [14, 0.65], [16.5, 0.85], [18, 1], [19, 0.85], [21, 0.5], [23.3, 0.45], [23.6, 0.75], [24.5, 0.4], [26, 0.25], [28, 0.35]];
// The nor'easter: from three, at full blow by half past five, easing after
// eleven.
const storm = (h) => ramp(15, 17.5, h) * (1 - ramp(23, 25.5, h));

// ---------- Cues ----------
const cues = [];
// Jets on the runway, by day: one lands at the start of every half minute
// and one takes off in the middle (runway.js's traffic), none from the
// ground stop.
for (let t = 0; t < LOOP; t += 30) {
  if (flying(t + 2)) cues.push({ at: t + 2, name: 'jet', level: 0.8, zone: 'runway' });
  if (flying(t + 16)) cues.push({ at: t + 16, name: 'jet', level: 0.8, zone: 'runway' });
}
// Flight 1 to Orlando, at last, rolling down the runway after midnight.
cues.push({ at: at(24.05) + 1, name: 'jet', level: 0.8, zone: 'runway' });
// The announcement chime (bing-bong) at the gates, and at check-in now and
// then. Fewer at night.
for (let t = 9; t < LOOP; t += 31) { const h = H(t); if (h < 25 || t % 2) cues.push({ at: t, name: 'ding', down: true, zone: 'gates' }); }
for (let t = 23; t < LOOP; t += 53) if (H(t) < 24.5) cues.push({ at: t, name: 'ding', down: true, zone: 'check-in' });
// Bird control: BANG, and a second later every gull for a mile going up.
for (const b of BANGS) cues.push({ at: b, name: 'thunder', big: true, level: 0.32, zone: 'runway' }, { at: b + 0.9, name: 'gull', n: 3, zone: 'runway' });
// Gulls on the runway and over the dock, by day.
for (const [h, n, zone] of [[6.3, 1, 'runway'], [7.8, 2, 'curb'], [9.4, 2, 'runway'], [11.2, 1, 'curb'], [12.8, 2, 'runway'], [14.4, 1, 'runway'], [15.6, 2, 'curb']]) cues.push({ at: at(h), name: 'gull', n, zone });
// Car horns at the curb in the morning rush and when everyone tries to beat
// the storm home (the trooper waving them on).
for (let h = 6.2; h < 10.5; h += 0.42) cues.push({ at: at(h), name: 'horn', zone: 'curb' });
for (let h = 16.4; h < 18.2; h += 0.3) cues.push({ at: at(h), name: 'horn', zone: 'curb' });
// The scanner at security beeping at somebody, by day.
for (let t = at(5.2) + 5; t < at(18); t += 41) cues.push({ at: t, name: 'beep', zone: 'security' });
// The jam at the merge in the bag room, whacked.
for (let t = 4; t < LOOP; t += 17) cues.push({ at: t, name: 'clunk', level: 0.8, zone: 'bag-room' });
// The tanker heading out (ambient.js): its horn behind the curb, and at the
// corner for the channel.
cues.push({ at: at(12.6), name: 'shiphorn' }, { at: at(13.85), name: 'shiphorn' });
// Six o'clock, everything canceled: the chime, and the chapel's organ.
cues.push({ at: at(18), name: 'ding', down: true, zone: 'check-in' }, { at: at(18.05), name: 'organ', zone: 'check-in' });
// Half past eleven, the stop lifts: a cheer from the gates.
cues.push({ at: at(23.5) + 0.5, name: 'cheer', zone: 'gates' });
// The plows going down the runway all night (stuck), backing up.
for (let t = at(18.4); t < at(23.4); t += 13) cues.push({ at: t, name: 'beep', zone: 'runway' });
// The de-icers on the apron, after dark, backing up too.
for (let t = at(17.2) + 7; t < at(25); t += 37) cues.push({ at: t, name: 'beep', zone: 'apron' });
// The water lapping at the seawall and the dock in the dark.
for (let t = at(19) + 3; t < LOOP - 6; t += 11) cues.push({ at: t, name: 'lap', zone: Math.round(t / 11) % 2 ? 'runway' : 'curb' });

// ---------- How near a cue is ----------
// Inside or out, and which areas are next to which (a cue next door is
// heard at half strength, one further off at a third). Through the
// terminal's walls it's muffled; through the bag room's floor more so.
const INSIDE = { 'check-in': true, security: true, gates: true, 'bag-room': true };
const NEXT = {
  curb: ['check-in', 'security', 'gates'],
  'check-in': ['curb', 'security', 'bag-room'],
  security: ['curb', 'check-in', 'gates', 'apron'],
  gates: ['curb', 'security', 'apron'],
  'bag-room': ['check-in', 'apron', 'runway'],
  apron: ['security', 'gates', 'bag-room', 'runway'],
  runway: ['apron', 'bag-room'],
};
function cue(q, t, here) {
  const z = here.zone, from = q.zone;
  if (!z) return from ? { level: 0.6 } : {};
  if (from === z) return {};
  const level = !from ? (INSIDE[z] ? 0.7 : 1) : (NEXT[from] || []).includes(z) ? 0.5 : 0.3;
  const through = !from ? !!INSIDE[z] : !!INSIDE[from] !== !!INSIDE[z] || (INSIDE[z] && from === 'bag-room') || z === 'bag-room';
  return { level, muffle: through ? (z === 'bag-room' || from === 'bag-room' ? 0.85 : 0.65) : 0 };
}

// ---------- The beds ----------
// Each area: what it hears, at t.
const AREAS = {
  curb: (h, b, w) => ({
    street: 0.55 + 0.35 * within(h, 6, 18, 1) - 0.25 * within(h, 21, 28, 1),
    crowd: 0.4 * b,
    harbor: 0.45,
    wind: w,
  }),
  'check-in': (h, b, w) => ({
    chatter: 0.8 * b,
    hum: 0.45,
    trains: 0.22 * within(h, 4.5, 23.5),
    street: 0.35, wind: w,
    muffle: 0.7,
  }),
  security: (h, b, w) => ({
    chatter: 0.65 * b,
    hum: 0.45,
    trains: 0.4 * within(h, 4.5, 23.5),
    wind: w,
    muffle: 0.75,
  }),
  gates: (h, b, w) => {
    const tuba = isFound('gates', 'tuba-player');
    return {
      chatter: 0.7 * b,
      hum: 0.45,
      // The band rehearsing, all day: louder with its tuba back.
      garage: (tuba ? 0.7 : 0.42) * within(h, 7.5, 17.5, 0.8),
      // The game on the TV over the bar, from eight.
      radio: 0.3 * within(h, 8, 25),
      // The night: everyone asleep across the seats; a page turning.
      hush: 0.6 * within(h, 21.5, 27.5, 1.5),
      wind: w,
      muffle: 0.7,
    };
  },
  'bag-room': (h, b, w) => ({
    hum: 0.8,
    trains: 0.85,
    tumble: 0.35,
    chatter: 0.15 * b,
    wind: w * 0.6,
    muffle: 0.85,
  }),
  apron: (h, b, w) => ({
    // The planes' engines idling at the gates by day; Flight 1's all night.
    engine: 0.6 * within(h, 5, 18) + 0.2,
    // De-icing after dark: the spray.
    sprinkler: 0.65 * within(h, 17, 25, 0.8),
    street: 0.3 * within(h, 5, 23),
    harbor: 0.15,
    wind: w,
  }),
  runway: (h, b, w, s) => ({
    harbor: 0.75 * (1 - s * 0.5),
    surf: 0.85 * s,
    wind: Math.min(1, w * 1.1),
  }),
};
// The whole airport, from the middle of nowhere in particular.
const WHOLE = (h, b, w, s) => ({ street: 0.35, harbor: 0.4, surf: 0.4 * s, chatter: 0.3 * b, hum: 0.2, wind: w });

function bed(t, here) {
  const h = H(t), b = curve(BUSY, h), s = storm(h), w = 0.28 + 0.72 * s;
  return (AREAS[here.zone] || WHOLE)(h, b, w, s);
}

export const sound = { bed, cue, cues: cues.sort((a, b) => a.at - b.at) };
