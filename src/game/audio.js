// Sound, all synthesized: no files to load. Browsers only allow audio after a
// tap or click, so the first sound after page load may be the first you hear.
//
// To add a sound: write a function that takes (audio, t0, o) and schedules
// oscillators or noise, and add it to SOUNDS. A place can also have a bed (a
// sound that loops under everything while you're there, like rain: BEDS) and
// cues on its clock (thunder after lightning): see sound in a map.js.

let ac = null;
let muted = false;

function context() {
  if (muted) return null;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    return ac;
  } catch {
    return null;
  }
}

function envelope(a, t, peak, attack, release) {
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
  return g;
}

let noiseBuf = null;
function noise(a) {
  if (noiseBuf) return noiseBuf;
  noiseBuf = a.createBuffer(1, a.sampleRate * 0.5, a.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}
// Longer, softer noise (brown-ish), for rain and thunder.
let rumbleBuf = null;
function rumble(a) {
  if (rumbleBuf) return rumbleBuf;
  rumbleBuf = a.createBuffer(1, a.sampleRate * 4, a.sampleRate);
  const d = rumbleBuf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04;
    d[i] = last * 3.5;
  }
  return rumbleBuf;
}
function tone(a, t, hz, type, peak, attack, release, dest = a.destination) {
  const o = a.createOscillator();
  o.type = type;
  o.frequency.value = hz;
  const g = envelope(a, t, peak, attack, release);
  o.connect(g);
  g.connect(dest);
  o.start(t);
  o.stop(t + attack + release + 0.05);
  return o;
}

const SOUNDS = {
  // Two detuned buzzy oscillators through a nasal band-pass. Twice.
  honk(a, t0) {
    for (const at of [0, 0.3]) {
      const t = t0 + at;
      const f = a.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1150;
      f.Q.value = 2.2;
      const g = envelope(a, t, 0.22, 0.03, 0.23);
      f.connect(g);
      g.connect(a.destination);
      for (const [type, hz] of [['sawtooth', 430], ['square', 436]]) {
        const o = a.createOscillator();
        o.type = type;
        o.frequency.setValueAtTime(hz, t);
        o.frequency.exponentialRampToValueAtTime(hz * 0.7, t + 0.24);
        o.connect(f);
        o.start(t);
        o.stop(t + 0.28);
      }
    }
  },
  // A lorry's horn, two low blasts, down the street: muffled and well under
  // a goose's honk, so nobody mistakes one for the other.
  horn(a, t0) {
    for (const [at, len] of [[0, 0.22], [0.32, 0.5]]) {
      const t = t0 + at;
      const f = a.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 600;
      const g = envelope(a, t, 0.03, 0.02, len);
      f.connect(g);
      g.connect(a.destination);
      for (const hz of [196, 247]) {
        const o = a.createOscillator();
        o.type = 'square';
        o.frequency.value = hz;
        o.connect(f);
        o.start(t);
        o.stop(t + len + 0.05);
      }
    }
  },
  // Shh! A librarian: soft hiss, high and breathy.
  shush(a, t0) {
    const src = a.createBufferSource();
    src.buffer = noise(a);
    src.loop = true;
    const f = a.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 3400;
    f.Q.value = 1.1;
    const g = envelope(a, t0, 0.06, 0.08, 0.7);
    src.connect(f);
    f.connect(g);
    g.connect(a.destination);
    src.start(t0);
    src.stop(t0 + 0.9);
  },
  // The sound check: a kick drum, one, two, and a bass note.
  thump(a, t0) {
    for (const at of [0, 0.45]) {
      const o = a.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(120, t0 + at);
      o.frequency.exponentialRampToValueAtTime(42, t0 + at + 0.18);
      const g = envelope(a, t0 + at, 0.07, 0.005, 0.25);
      o.connect(g);
      g.connect(a.destination);
      o.start(t0 + at);
      o.stop(t0 + at + 0.3);
    }
    tone(a, t0 + 0.9, 55, 'triangle', 0.04, 0.01, 0.6);
  },
  // A crowd cheering, some way off: a swell of voices, and a whistle.
  cheer(a, t0) {
    const src = a.createBufferSource();
    src.buffer = rumble(a);
    const f = a.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1100;
    f.Q.value = 0.8;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.08, t0 + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.2);
    src.connect(f);
    f.connect(g);
    g.connect(a.destination);
    src.start(t0);
    src.stop(t0 + 2.3);
    const w = a.createOscillator();
    w.type = 'sine';
    w.frequency.setValueAtTime(1800, t0 + 0.3);
    w.frequency.exponentialRampToValueAtTime(2600, t0 + 0.6);
    const wg = envelope(a, t0 + 0.3, 0.03, 0.02, 0.35);
    w.connect(wg);
    wg.connect(a.destination);
    w.start(t0 + 0.3);
    w.stop(t0 + 0.7);
  },
  // A rocket going up: a roar that rises and fades.
  launch(a, t0) {
    const src = a.createBufferSource();
    src.buffer = rumble(a);
    const f = a.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(300, t0);
    f.frequency.exponentialRampToValueAtTime(2400, t0 + 2.5);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.08, t0 + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.6);
    src.connect(f);
    f.connect(g);
    g.connect(a.destination);
    src.start(t0);
    src.stop(t0 + 3.7);
  },
  // A felt-tip loop: a short burst of filtered noise that sweeps up.
  pen(a, t0) {
    const src = a.createBufferSource();
    src.buffer = noise(a);
    const f = a.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.4;
    f.frequency.setValueAtTime(1800, t0);
    f.frequency.exponentialRampToValueAtTime(4200, t0 + 0.32);
    const g = envelope(a, t0, 0.09, 0.04, 0.3);
    src.connect(f);
    f.connect(g);
    g.connect(a.destination);
    src.start(t0);
    src.stop(t0 + 0.4);
  },
  // A soft wooden tick for buttons.
  tick(a, t0) {
    const o = a.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(1400, t0);
    o.frequency.exponentialRampToValueAtTime(700, t0 + 0.05);
    const g = envelope(a, t0, 0.05, 0.005, 0.06);
    o.connect(g);
    g.connect(a.destination);
    o.start(t0);
    o.stop(t0 + 0.08);
  },
  // Thunder: a low roll of filtered noise, with a crack up front for a big strike.
  thunder(a, t0, o = {}) {
    const big = !!o.big;
    const src = a.createBufferSource();
    src.buffer = rumble(a);
    const f = a.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(big ? 900 : 420, t0);
    f.frequency.exponentialRampToValueAtTime(140, t0 + 2.6);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(big ? 0.5 : 0.22, t0 + (big ? 0.06 : 0.35));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (big ? 3.4 : 2.6));
    src.connect(f);
    f.connect(g);
    g.connect(a.destination);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + 3.6);
    if (big) {
      const c = a.createBufferSource();
      c.buffer = noise(a);
      const hp = a.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1800;
      const cg = envelope(a, t0, 0.12, 0.005, 0.25);
      c.connect(hp);
      hp.connect(cg);
      cg.connect(a.destination);
      c.start(t0);
      c.stop(t0 + 0.3);
    }
  },
  // A lift arriving at a floor: one soft chime going up, two (falling) going down.
  ding(a, t0, o = {}) {
    const notes = o.down ? [1175, 932] : [1175];
    notes.forEach((hz, i) => {
      for (const [r, v] of [[1, 0.05], [2.76, 0.008], [5.4, 0.003]]) tone(a, t0 + i * 0.24, hz * r, 'sine', v, 0.004, 0.8 / r + 0.2);
    });
  },
  // A grandfather clock's chime: a few bell partials, ringing out.
  bell(a, t0) {
    for (const [r, v] of [[1, 0.06], [2.01, 0.025], [2.76, 0.018], [5.4, 0.008]]) tone(a, t0, 196 * r, 'sine', v, 0.004, 2.4 / r + 0.4);
  },
  // The lights going out: a thunk, and a fizz from the fuse box.
  clunk(a, t0) {
    const o = tone(a, t0, 90, 'sine', 0.14, 0.004, 0.18);
    o.frequency.exponentialRampToValueAtTime(40, t0 + 0.18);
    const src = a.createBufferSource();
    src.buffer = noise(a);
    const f = a.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 3200;
    f.Q.value = 3;
    const g = envelope(a, t0 + 0.02, 0.05, 0.01, 0.3);
    src.connect(f);
    f.connect(g);
    g.connect(a.destination);
    src.start(t0 + 0.02);
    src.stop(t0 + 0.4);
  },
  // A rubber stamp coming down on a case file.
  stamp(a, t0) {
    const o = tone(a, t0, 150, 'sine', 0.2, 0.003, 0.14);
    o.frequency.exponentialRampToValueAtTime(55, t0 + 0.12);
    const src = a.createBufferSource();
    src.buffer = noise(a);
    const f = a.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 2400;
    const g = envelope(a, t0, 0.08, 0.002, 0.06);
    src.connect(f);
    f.connect(g);
    g.connect(a.destination);
    src.start(t0);
    src.stop(t0 + 0.1);
  },
  // Someone playing the organ somewhere in the house: the famous spooky
  // opening (A, G, A... G, F, E, D, C sharp, D), far off and quiet.
  organ(a, t0) {
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    const out = a.createGain();
    out.gain.value = 0.5;
    lp.connect(out);
    out.connect(a.destination);
    const A = 440, notes = [[0, 0.14, A], [0.16, 0.14, A * 8 / 9], [0.32, 0.9, A],
      [1.5, 0.16, A * 8 / 9], [1.68, 0.16, A * 4 / 5], [1.86, 0.16, A * 3 / 4], [2.04, 0.16, A * 2 / 3], [2.22, 0.5, A * 5 / 8], [2.8, 1.6, A * 2 / 3]];
    for (const [at, len, hz] of notes) {
      for (const [m, type, v] of [[1, 'square', 0.012], [0.5, 'triangle', 0.03], [2, 'triangle', 0.012]]) tone(a, t0 + at, hz * m, type, v, 0.02, len, lp);
    }
  },
  // Dun, dun, DUNNN: an organ sting for the moment the case closes.
  sting(a, t0) {
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1400;
    lp.connect(a.destination);
    [[0, 0.18, 196], [0.26, 0.18, 196], [0.52, 1.6, 185]].forEach(([at, len, hz]) => {
      for (const [m, type, v] of [[1, 'square', 0.035], [2, 'triangle', 0.05], [0.5, 'triangle', 0.06]]) tone(a, t0 + at, hz * m, type, v, 0.02, len, lp);
    });
  },
  // Three rising notes: a place is complete.
  fanfare(a, t0) {
    [523.25, 659.25, 783.99, 1046.5].forEach((hz, i) => {
      const t = t0 + i * 0.11;
      const o = a.createOscillator();
      o.type = 'triangle';
      o.frequency.value = hz;
      const g = envelope(a, t, 0.12, 0.01, i === 3 ? 0.6 : 0.16);
      o.connect(g);
      g.connect(a.destination);
      o.start(t);
      o.stop(t + 0.8);
    });
  },
};

// The tide rushing in or out (skipping ahead on the dial): a long, soft wash
// of noise that swells and falls away, sweeping down.
SOUNDS.tide = (a, t0) => {
  const src = a.createBufferSource();
  src.buffer = rumble(a);
  src.playbackRate.value = 1.6;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 0.9;
  f.frequency.setValueAtTime(900, t0);
  f.frequency.exponentialRampToValueAtTime(260, t0 + 1.8);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.09, t0 + 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2);
  src.connect(f);
  f.connect(g);
  g.connect(a.destination);
  src.start(t0);
  src.stop(t0 + 2.1);
};

// A gull, far off: two or three falling cries.
SOUNDS.gull = (a, t0, o = {}) => {
  const n = o.n || 3;
  for (let i = 0; i < n; i++) {
    const t = t0 + i * 0.26;
    const osc = a.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1500 - i * 60, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.2);
    const f = a.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1800;
    f.Q.value = 3;
    const g = envelope(a, t, 0.02, 0.02, 0.18);
    osc.connect(f);
    f.connect(g);
    g.connect(bus(a));
    osc.start(t);
    osc.stop(t + 0.25);
  }
};

// Beds: sounds that loop under a place while you're in it. Each returns a stop().
const BEDS = {
  // Rain on the windows: two bands of soft noise, drifting a little.
  rain(a) {
    const out = a.createGain();
    out.gain.setValueAtTime(0.0001, a.currentTime);
    out.gain.exponentialRampToValueAtTime(0.05, a.currentTime + 2);
    out.connect(bus(a));
    const srcs = [[700, 0.8, 1], [2600, 1.2, 0.35]].map(([hz, q, v], i) => {
      const src = a.createBufferSource();
      src.buffer = i ? noise(a) : rumble(a);
      src.loop = true;
      const f = a.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = hz;
      f.Q.value = q;
      const g = a.createGain();
      g.gain.value = v;
      src.connect(f);
      f.connect(g);
      g.connect(out);
      src.start();
      return src;
    });
    return () => {
      const t = a.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value, t);
      out.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      for (const s of srcs) s.stop(t + 0.7);
    };
  },
};

// Street noise: traffic far off (a low rumble) and people about (a murmur that
// comes and goes), soft, under everything. The murmur sits well below a
// honk's pitch, and the whole bed about 12 dB under a honk (loudness(), below).
BEDS.street = (a) => {
  const out = a.createGain();
  out.gain.setValueAtTime(0.0001, a.currentTime);
  out.gain.exponentialRampToValueAtTime(0.018, a.currentTime + 2);
  out.connect(bus(a));
  const srcs = [];
  // Traffic: brown noise, low.
  const road = a.createBufferSource();
  road.buffer = rumble(a);
  road.loop = true;
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 260;
  road.connect(lp);
  lp.connect(out);
  srcs.push(road);
  // People: a band of voice-ish noise, swelling slowly.
  const talk = a.createBufferSource();
  talk.buffer = rumble(a);
  talk.loop = true;
  talk.playbackRate.value = 1.7;
  const bp = a.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 480;
  bp.Q.value = 1.3;
  const tg = a.createGain();
  tg.gain.value = 0.35;
  const lfo = a.createOscillator();
  lfo.frequency.value = 0.13;
  const lg = a.createGain();
  lg.gain.value = 0.2;
  lfo.connect(lg);
  lg.connect(tg.gain);
  talk.connect(bp);
  bp.connect(tg);
  tg.connect(out);
  srcs.push(talk, lfo);
  for (const s of srcs) s.start();
  return () => {
    const t = a.currentTime;
    out.gain.cancelScheduledValues(t);
    out.gain.setValueAtTime(out.gain.value, t);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    for (const s of srcs) s.stop(t + 0.7);
  };
};
// The sea: waves breaking and drawing back (low noise that swells every few
// seconds), and a hiss of spray over it. Well under a honk, like the street.
BEDS.surf = (a) => {
  const out = a.createGain();
  out.gain.setValueAtTime(0.0001, a.currentTime);
  out.gain.exponentialRampToValueAtTime(0.02, a.currentTime + 2);
  out.connect(bus(a));
  const srcs = [];
  const wash = a.createBufferSource();
  wash.buffer = rumble(a);
  wash.loop = true;
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 520;
  const swell = a.createGain();
  swell.gain.value = 0.6;
  const lfo = a.createOscillator();
  lfo.frequency.value = 0.16; // a wave every six seconds or so
  const lg = a.createGain();
  lg.gain.value = 0.45;
  lfo.connect(lg);
  lg.connect(swell.gain);
  wash.connect(lp);
  lp.connect(swell);
  swell.connect(out);
  srcs.push(wash, lfo);
  const spray = a.createBufferSource();
  spray.buffer = noise(a);
  spray.loop = true;
  const hp = a.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 3800;
  const sg = a.createGain();
  sg.gain.value = 0.05;
  spray.connect(hp);
  hp.connect(sg);
  sg.connect(out);
  srcs.push(spray);
  for (const s of srcs) s.start();
  return () => {
    const t = a.currentTime;
    out.gain.cancelScheduledValues(t);
    out.gain.setValueAtTime(out.gain.value, t);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    for (const s of srcs) s.stop(t + 0.7);
  };
};

let bedName = null, bedStop = null;

// Beds play through one gain, so a honk can duck them: the bed dips for about
// a second under every honk, then comes back.
const buses = new WeakMap();
function bus(a) {
  let g = buses.get(a);
  if (!g) { g = a.createGain(); g.connect(a.destination); buses.set(a, g); }
  return g;
}
function duck(a, t) {
  const g = bus(a).gain;
  g.cancelScheduledValues(t);
  g.setValueAtTime(g.value, t);
  g.setTargetAtTime(0.35, t, 0.03);
  g.setTargetAtTime(1, t + 0.7, 0.25);
}

export function play(name, o) {
  const a = context();
  if (!a || !SOUNDS[name]) return;
  try {
    if (name === 'honk') duck(a, a.currentTime);
    SOUNDS[name](a, a.currentTime + 0.01, o);
  } catch {}
}

// The bed to loop now (a key of BEDS), or null for quiet. Keeps it going
// across mute and unmute.
export function bed(name) {
  if (name === bedName && (bedStop || muted)) return;
  if (bedStop) { try { bedStop(); } catch {} bedStop = null; }
  bedName = name || null;
  const a = bedName && BEDS[bedName] ? context() : null;
  if (a) { try { bedStop = BEDS[bedName](a); } catch { bedStop = null; } }
}

// After a tap: browsers only let sound start from one, so start what's waiting.
export function wake() {
  if (muted) return;
  const a = context();
  if (a && bedName && !bedStop) bed(bedName);
}

export function setMuted(v) {
  muted = !!v;
  if (muted && ac && ac.state === 'running') ac.suspend();
  if (!muted && bedName) { const name = bedName; bedName = null; if (bedStop) { try { bedStop(); } catch {} bedStop = null; } bed(name); }
}

export const isMuted = () => muted;

// For QA: does this sound (or bed) exist and build without an error? Runs it
// silently on an offline context. Returns null, or what went wrong.
export async function check(name, o) {
  const fn = SOUNDS[name] || BEDS[name];
  if (!fn) return `there's no sound called "${name}"`;
  try {
    const a = new OfflineAudioContext(1, 44100 * 4, 44100);
    const stop = fn(a, 0.01, o);
    if (typeof stop === 'function') stop();
    await a.startRendering();
    return null;
  } catch (e) {
    return String(e && e.message ? e.message : e);
  }
}

// For QA: how loud a sound (or bed) is between from and to seconds: its RMS
// and peak, and its RMS in the honk's range (a band round 1150 Hz), which is
// what a bed must stay well under so the geese stand out.
export async function loudness(name, o, from = 0, to = 2) {
  const fn = SOUNDS[name] || BEDS[name];
  if (!fn) return null;
  const rate = 44100, a = new OfflineAudioContext(1, Math.ceil(rate * to), rate);
  fn(a, 0.01, o);
  const d = (await a.startRendering()).getChannelData(0);
  const w = 2 * Math.PI * 1150 / rate, al = Math.sin(w) / (2 * 1.2), c = Math.cos(w), a0 = 1 + al;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, sum = 0, band = 0, peak = 0, n = 0;
  for (let i = 0; i < d.length; i++) {
    const x = d[i], y = (al * x - al * x2 + 2 * c * y1 - (1 - al) * y2) / a0;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    if (i < from * rate) continue;
    sum += x * x; band += y * y; peak = Math.max(peak, Math.abs(x)); n++;
  }
  const db = (v) => Math.round(20 * Math.log10(Math.sqrt(v / n) + 1e-9) * 10) / 10;
  return { rms: db(sum), band: db(band), peak: Math.round(20 * Math.log10(peak + 1e-9) * 10) / 10 };
}
