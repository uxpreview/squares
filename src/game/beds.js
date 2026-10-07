// Beds: sounds that loop under a place while you're there (the street, the
// sea, rain, a dryer's thump, a band down the road). A place mixes several at
// once and changes the mix with its clock and with where you are (a map's
// sound.bed, see audio.js mix()).
//
// Each bed is (audio, dest) => stop(). Beds marked room are what a room
// sounds like inside; every other bed is outdoors and is muffled when you
// step inside. Every bed sits well under a honk at full level: QA measures
// each one (loudness() in audio.js), and LEVEL is where to turn one up or
// down.
import { noise, rumble, baked, loop, hit } from './synth.js';

export const BEDS = {};

// How loud each bed is at full level (a gain), set by measuring each one
// against a honk (node tools/sound.mjs): 12 to 20 dB under it, the steady
// beds nearer 12, the ticks and drips further down.
const LEVEL = {
  street: 0.015, surf: 0.0168, wind: 0.0138, rain: 0.0146, harbor: 0.0194, night: 0.0421,
  birds: 0.0259, crowd: 0.0124, kids: 0.0106, playroom: 0.0106, groove: 0.0208, garage: 0.021, disco: 0.0207,
  steel: 0.023, hum: 0.00604, hush: 0.0333, chatter: 0.0124, fire: 0.0237, clock: 0.107,
  drip: 0.0272, tumble: 0.0192, bubbles: 0.0305, bleeps: 0.0185, splash: 0.0615, oven: 0.0137,
  sizzle: 0.00467, sprinkler: 0.00643, rink: 0.0175, trains: 0.021, downpour: 0.0148,
  engine: 0.00307, slots: 0.0217, clink: 0.0664, monitor: 0.00904, radio: 0.0128, reno: 0.0561,
  radar: 0.0152,
};

function def(name, build, o = {}) {
  const fn = (a, dest) => {
    const out = a.createGain();
    const v = LEVEL[name] || 0.02, t = a.currentTime;
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(v, t + 0.5);
    out.connect(dest);
    const srcs = build(a, out).flat();
    // Baked loops start at a random point, so two of a kind don't line up.
    for (const s of srcs) {
      if (s.buffer) s.start(t, Math.random() * s.buffer.duration);
      else s.start(t);
    }
    return () => {
      const t1 = a.currentTime;
      out.gain.cancelScheduledValues(t1);
      out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), t1);
      out.gain.exponentialRampToValueAtTime(0.0001, t1 + 0.6);
      for (const s of srcs) s.stop(t1 + 0.7);
      setTimeout(() => { try { out.disconnect(); } catch {} }, 1000);
    };
  };
  fn.room = !!o.room;
  BEDS[name] = fn;
}

// A steady hum under a few harmonics (mains, a motor, a fridge).
function hum(a, dest, hz = 60, v = 1) {
  const g = a.createGain();
  g.gain.value = v;
  g.connect(dest);
  return [[1, 0.5], [2, 0.3], [3, 0.12]].map(([m, k]) => {
    const o = a.createOscillator();
    o.frequency.value = hz * m;
    const og = a.createGain();
    og.gain.value = k;
    o.connect(og);
    og.connect(g);
    return o;
  });
}

// ---------- Outdoors ----------

// Traffic far off (a low rumble) and people about (a murmur that comes and
// goes), well below a honk's pitch.
def('street', (a, out) => [
  loop(a, out, rumble(a), { filter: 'lowpass', hz: 260 }),
  loop(a, out, rumble(a), { rate: 1.7, filter: 'bandpass', hz: 480, q: 1.3, v: 0.35, swell: [0.13, 0.57] }),
]);
// The sea: waves breaking and drawing back every six seconds or so, and
// spray over it.
def('surf', (a, out) => [
  loop(a, out, rumble(a), { filter: 'lowpass', hz: 520, v: 0.6, swell: [0.16, 0.75] }),
  loop(a, out, noise(a), { filter: 'highpass', hz: 3800, v: 0.05 }),
]);
// Wind in the grass or round the house, gusting every half a minute or so.
def('wind', (a, out) => [
  loop(a, out, rumble(a), { rate: 2.2, filter: 'bandpass', hz: 380, q: 0.8, v: 0.6, swell: [0.035, 0.67] }),
]);
// Rain: two bands of soft noise.
def('rain', (a, out) => [
  loop(a, out, rumble(a), { filter: 'bandpass', hz: 480, q: 0.9 }),
  loop(a, out, noise(a), { filter: 'bandpass', hz: 3600, q: 1.1, v: 0.35 }),
]);
// Water lapping at a seawall or a riverbank: a small wave every three
// seconds, and the slap of it.
def('harbor', (a, out) => [
  loop(a, out, rumble(a), { filter: 'lowpass', hz: 300, v: 0.7, swell: [0.33, 0.8] }),
  loop(a, out, rumble(a), { rate: 1.3, filter: 'bandpass', hz: 900, q: 2, v: 0.2, swell: [0.27, 0.95] }),
]);
// Crickets after dark: chirps of three or four pulses, here and there.
def('night', (a, out) => [
  loop(a, out, baked(a, 'night', 5, (put, r, rnd) => {
    for (let k = 0; k < 14; k++) {
      const at = rnd() * 5, hz = 4000 + rnd() * 900, v = 0.2 + rnd() * 0.5, n = 3 + Math.floor(rnd() * 2);
      for (let i = 0; i < n; i++) hit(put, r, rnd, Math.round((at + i * 0.045) * r), { hz, len: 0.03, v, decay: 60 });
    }
  }, 7)),
]);
// Birds in the morning: a few short tweets, rising.
def('birds', (a, out) => [
  loop(a, out, baked(a, 'birds', 7, (put, r, rnd) => {
    for (let k = 0; k < 6; k++) {
      const at = rnd() * 7, base = 2400 + rnd() * 1400, n = 2 + Math.floor(rnd() * 4), v = 0.2 + rnd() * 0.4;
      for (let i = 0; i < n; i++) hit(put, r, rnd, Math.round((at + i * 0.11) * r), { hz: base, to: base * 1.4, len: 0.07, v, decay: 30 });
    }
  }, 11)),
]);
// A crowd: lots of people talking at once, swelling now and then.
const crowd = (a, out) => [
  loop(a, out, rumble(a), { rate: 1.8, filter: 'bandpass', hz: 440, q: 1.1, swell: [0.17, 0.35] }),
  loop(a, out, rumble(a), { rate: 2.1, filter: 'bandpass', hz: 640, q: 1.5, v: 0.35, swell: [0.11, 0.5] }),
];
def('crowd', crowd);
// Children playing: the same, higher and bouncier.
const kids = (a, out) => [
  loop(a, out, rumble(a), { rate: 2.6, filter: 'bandpass', hz: 720, q: 1.6, swell: [0.3, 0.5] }),
];
def('kids', kids);

// ---------- Music, far off and near ----------

// A band at 120 beats a minute, two bars: kick, snare, a walking bass line.
// mix: [kick, snare, bass, hats].
function band(key, notes, [kick, snare, bass, hats], seed) {
  return (a) => baked(a, key, 4, (put, r, rnd) => {
    for (let b = 0; b < 8; b++) {
      const i = Math.round(b * 0.5 * r);
      if (kick) hit(put, r, rnd, i, { hz: 110, to: 45, len: 0.25, v: kick, decay: 14 });
      if (snare && b % 2 === 1) hit(put, r, rnd, i, { len: 0.15, v: snare, decay: 25 });
      if (hats) hit(put, r, rnd, Math.round((b * 0.5 + 0.25) * r), { len: 0.03, v: hats, decay: 120 });
      if (bass) hit(put, r, rnd, i, { hz: notes[b], len: 0.45, v: bass, decay: 4, wave: 'saw' });
    }
  }, seed);
}
const A = [55, 55, 65.4, 73.4, 55, 55, 82.4, 73.4];
const partyBand = band('groove', A, [0.9, 0.35, 0.25, 0.1], 3);
const discoBand = band('disco', [55, 110, 55, 110, 49, 98, 49, 98], [1, 0.2, 0.3, 0.25], 5);
// The band on the stage, from down the street.
def('groove', (a, out) => [loop(a, out, partyBand(a), { filter: 'lowpass', hz: 700 })]);
// The band rehearsing, from in the room with them.
def('garage', (a, out) => [loop(a, out, partyBand(a), { filter: 'lowpass', hz: 2400 })], { room: true });
// Four on the floor.
def('disco', (a, out) => [loop(a, out, discoBand(a), { filter: 'lowpass', hz: 2600 })], { room: true });
// Steel drums by the pool: a calypso tune, bell-like notes with their
// overtones, in C.
def('steel', (a, out) => [
  loop(a, out, baked(a, 'steel', 4, (put, r, rnd) => {
    const C = 261.63, tune = [[0, 1], [0.375, 5 / 4], [0.75, 3 / 2], [1.25, 5 / 4], [1.5, 1], [2, 4 / 3], [2.375, 5 / 3], [2.75, 4 / 3], [3.25, 9 / 8], [3.5, 1]];
    for (const [at, m] of tune) {
      for (const [k, v] of [[1, 0.5], [2, 0.18], [3.9, 0.06]]) hit(put, r, rnd, Math.round(at * r), { hz: C * m * k, len: 0.5, v, decay: 6 + k * 2 });
      hit(put, r, rnd, Math.round(at * r), { hz: C * m / 2, len: 0.4, v: 0.15, decay: 6 }); // the bass pan
    }
  }, 13), { filter: 'lowpass', hz: 3000 }),
]);

// ---------- Rooms ----------

def('hum', (a, out) => [hum(a, out), loop(a, out, rumble(a), { filter: 'lowpass', hz: 160, v: 0.5 })], { room: true });
// The library: a hush, and a page turning now and then.
def('hush', (a, out) => [
  hum(a, out, 60, 0.15),
  loop(a, out, baked(a, 'hush', 9, (put, r, rnd) => {
    for (const at of [1.2, 5.8]) hit(put, r, rnd, Math.round(at * r), { len: 0.3, v: 0.25, decay: 12, attack: 0.05 });
  }, 17), { filter: 'highpass', hz: 1800 }),
], { room: true });
def('chatter', crowd, { room: true });
def('playroom', kids, { room: true });
// A fire crackling in the grate.
def('fire', (a, out) => [
  loop(a, out, rumble(a), { filter: 'lowpass', hz: 380, v: 0.6, swell: [0.4, 0.3] }),
  loop(a, out, baked(a, 'fire', 5, (put, r, rnd) => {
    for (let k = 0; k < 40; k++) hit(put, r, rnd, Math.round(rnd() * 5 * r), { len: 0.04, v: 0.1 + rnd() * rnd() * 0.9, decay: 90 + rnd() * 150 });
  }, 19), { filter: 'highpass', hz: 900 }),
], { room: true });
// A grandfather clock: tick, tock.
def('clock', (a, out) => [
  loop(a, out, baked(a, 'clock', 2, (put, r, rnd) => {
    hit(put, r, rnd, 0, { hz: 2400, len: 0.04, v: 0.5, decay: 160 });
    hit(put, r, rnd, 0, { len: 0.02, v: 0.3, decay: 250 });
    hit(put, r, rnd, r, { hz: 1700, len: 0.04, v: 0.45, decay: 160 });
    hit(put, r, rnd, r, { len: 0.02, v: 0.25, decay: 250 });
  }, 23)),
], { room: true });
// Water dripping in the cellar, with an echo.
def('drip', (a, out) => [
  loop(a, out, baked(a, 'drip', 7, (put, r, rnd) => {
    for (let k = 0; k < 5; k++) {
      const at = rnd() * 7, hz = 700 + rnd() * 500;
      for (const [d, v] of [[0, 0.6], [0.13, 0.2], [0.27, 0.08]]) hit(put, r, rnd, Math.round((at + d) * r), { hz, to: hz * 2.2, len: 0.06, v, decay: 50 });
    }
  }, 29)),
  loop(a, out, rumble(a), { filter: 'lowpass', hz: 120, v: 0.3 }),
], { room: true });
// The dryers: a thump as the clothes fall, round and round, and the motor.
def('tumble', (a, out) => [
  hum(a, out, 50, 0.4),
  loop(a, out, baked(a, 'tumble', 2.6, (put, r, rnd) => {
    for (const at of [0, 1.3, 0.55, 1.95]) {
      hit(put, r, rnd, Math.round(at * r), { hz: 75, to: 40, len: 0.22, v: at % 1.3 ? 0.4 : 0.8, decay: 16 });
      hit(put, r, rnd, Math.round(at * r), { len: 0.3, v: 0.15, decay: 10 });
    }
  }, 31), { filter: 'lowpass', hz: 900 }),
], { room: true });
// Bubbles rising in a tank, and the pump.
def('bubbles', (a, out) => [
  loop(a, out, rumble(a), { filter: 'lowpass', hz: 300, v: 0.4 }),
  loop(a, out, baked(a, 'bubbles', 5, (put, r, rnd) => {
    for (let k = 0; k < 30; k++) { const hz = 400 + rnd() * 600; hit(put, r, rnd, Math.round(rnd() * 5 * r), { hz, to: hz * 1.7, len: 0.05, v: 0.15 + rnd() * 0.3, decay: 60 }); }
  }, 37)),
], { room: true });
// Arcade machines: little runs of square-wave blips from all over.
def('bleeps', (a, out) => [
  hum(a, out, 60, 0.3),
  loop(a, out, baked(a, 'bleeps', 6, (put, r, rnd) => {
    for (let k = 0; k < 9; k++) {
      const at = rnd() * 6, base = 300 + rnd() * 500, n = 3 + Math.floor(rnd() * 4), up = rnd() < 0.5;
      for (let i = 0; i < n; i++) hit(put, r, rnd, Math.round((at + i * 0.07) * r), { hz: base * Math.pow(up ? 1.26 : 0.8, i), len: 0.06, v: 0.25, decay: 20, wave: 'square' });
    }
  }, 41), { filter: 'lowpass', hz: 2200 }),
], { room: true });
// A pool: water churning, and a splash now and then.
def('splash', (a, out) => [
  loop(a, out, noise(a), { filter: 'bandpass', hz: 1600, q: 0.6, v: 0.05, swell: [0.2, 0.5] }),
  loop(a, out, baked(a, 'splash', 6, (put, r, rnd) => {
    for (let k = 0; k < 5; k++) hit(put, r, rnd, Math.round(rnd() * 6 * r), { len: 0.6, v: 0.25 + rnd() * 0.35, decay: 7, attack: 0.01 });
  }, 43), { filter: 'highpass', hz: 700 }),
]);
// A gas oven roaring, and its fan.
def('oven', (a, out) => [
  loop(a, out, rumble(a), { rate: 1.4, filter: 'bandpass', hz: 260, q: 0.7 }),
  hum(a, out, 100, 0.3),
], { room: true });
// A wok on the go.
def('sizzle', (a, out) => [
  loop(a, out, noise(a), { filter: 'highpass', hz: 3200, swell: [0.45, 0.5] }),
  loop(a, out, baked(a, 'sizzle', 3, (put, r, rnd) => {
    for (let k = 0; k < 50; k++) hit(put, r, rnd, Math.round(rnd() * 3 * r), { len: 0.01, v: 0.3 + rnd() * 0.5, decay: 400 });
  }, 47), { filter: 'highpass', hz: 2500 }),
], { room: true });
// Sprinklers sweeping in the greenhouse.
def('sprinkler', (a, out) => [loop(a, out, noise(a), { filter: 'bandpass', hz: 5200, q: 0.7, swell: [0.25, 0.9] })], { room: true });
// Skates on ice: long scrapes, and the chiller's hum.
def('rink', (a, out) => [
  hum(a, out, 60, 0.4),
  loop(a, out, baked(a, 'rink', 5, (put, r, rnd) => {
    for (let k = 0; k < 6; k++) hit(put, r, rnd, Math.round(rnd() * 5 * r), { len: 0.6, v: 0.2 + rnd() * 0.3, decay: 4, attack: 0.15 });
  }, 53), { filter: 'bandpass', hz: 4200, q: 1.2 }),
], { room: true });
// A model railway: clickety-clack.
def('trains', (a, out) => [
  hum(a, out, 50, 0.3),
  loop(a, out, baked(a, 'trains', 1.6, (put, r, rnd) => {
    for (const at of [0, 0.12, 0.8, 0.92]) hit(put, r, rnd, Math.round(at * r), { len: 0.03, v: 0.5, decay: 150 });
  }, 59), { filter: 'bandpass', hz: 3000, q: 1.5 }),
], { room: true });
// The umbrella shop's indoor downpour.
def('downpour', (a, out) => [
  loop(a, out, rumble(a), { filter: 'bandpass', hz: 480, q: 0.9 }),
  loop(a, out, noise(a), { filter: 'bandpass', hz: 3600, q: 1.1, v: 0.35 }),
], { room: true });
// A ship's engines: a deep throb you feel through the deck. (Not muffled:
// it's in the ship itself.)
def('engine', (a, out) => {
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 180;
  lp.connect(out);
  const oscs = [[48, 'sawtooth'], [49.2, 'square'], [24, 'sine']].map(([hz, type]) => {
    const o = a.createOscillator();
    o.type = type;
    o.frequency.value = hz;
    o.connect(lp);
    return o;
  });
  return [oscs, loop(a, out, rumble(a), { filter: 'lowpass', hz: 140, v: 0.8, swell: [1.6, 0.25] })];
}, { room: true });
// A casino: slot machines chiming and paying out.
def('slots', (a, out) => [
  hum(a, out, 60, 0.3),
  loop(a, out, baked(a, 'slots', 5, (put, r, rnd) => {
    for (let k = 0; k < 5; k++) {
      const at = rnd() * 5, n = 2 + Math.floor(rnd() * 5);
      for (let i = 0; i < n; i++) hit(put, r, rnd, Math.round((at + i * 0.09) * r), { hz: rnd() < 0.5 ? 1760 : 2350, len: 0.25, v: 0.25, decay: 14 });
    }
  }, 61)),
], { room: true });
// Cutlery and plates at a buffet.
def('clink', (a, out) => [
  loop(a, out, baked(a, 'clink', 4, (put, r, rnd) => {
    for (let k = 0; k < 14; k++) hit(put, r, rnd, Math.round(rnd() * 4 * r), { hz: 2800 + rnd() * 2600, len: 0.1, v: 0.1 + rnd() * 0.25, decay: 45 });
  }, 67)),
], { room: true });
// A heart monitor.
def('monitor', (a, out) => [
  hum(a, out, 60, 0.6),
  loop(a, out, baked(a, 'monitor', 1, (put, r, rnd) => hit(put, r, rnd, 0, { hz: 1960, len: 0.14, v: 0.35, decay: 3 }), 71)),
], { room: true });
// A ball game on the radio in the kitchen: a voice going on, and the crowd.
def('radio', (a, out) => [
  loop(a, out, rumble(a), { rate: 1.6, filter: 'bandpass', hz: 700, q: 2.5, swell: [2.7, 0.7] }),
  loop(a, out, rumble(a), { rate: 2.2, filter: 'bandpass', hz: 1600, q: 1, v: 0.25, swell: [0.09, 0.8] }),
], { room: true });
// Builders at work: a hammer, three or four blows at a time.
def('reno', (a, out) => [
  loop(a, out, baked(a, 'reno', 6, (put, r, rnd) => {
    for (const at of [0.4, 2.9]) {
      for (let i = 0; i < 3 + Math.floor(rnd() * 2); i++) {
        const t = Math.round((at + i * 0.42) * r);
        hit(put, r, rnd, t, { hz: 190, to: 95, len: 0.12, v: 0.6, decay: 30 });
        hit(put, r, rnd, t, { len: 0.05, v: 0.4, decay: 80 });
      }
    }
  }, 73), { filter: 'lowpass', hz: 2500 }),
], { room: true });
// The ship's radar: a slow ping.
def('radar', (a, out) => [
  hum(a, out, 60, 0.4),
  loop(a, out, baked(a, 'radar', 4, (put, r, rnd) => hit(put, r, rnd, 0, { hz: 1480, len: 1.4, v: 0.3, decay: 3 }), 79)),
], { room: true });
