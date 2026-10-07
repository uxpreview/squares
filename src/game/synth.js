// The pieces sounds are built from: envelopes, noise, tones, loops of
// filtered noise, and loops baked once from a recipe (a dryer's thump, a
// crackling fire, a band far off). Shared by audio.js (one-off sounds) and
// beds.js (sounds that loop under a place).

export function envelope(a, t, peak, attack, release) {
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
  return g;
}

// Buffers are made once per sample rate (the live page and QA's offline
// renders can differ).
const made = new Map();
function once(key, a, fn) {
  const k = `${key}@${a.sampleRate}`;
  if (!made.has(k)) made.set(k, fn());
  return made.get(k);
}

// White noise, half a second.
export const noise = (a) => once('noise', a, () => {
  const b = a.createBuffer(1, a.sampleRate * 0.5, a.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
});
// Longer, softer noise (brown-ish), for rain, thunder, traffic and the sea.
export const rumble = (a) => once('rumble', a, () => {
  const b = a.createBuffer(1, a.sampleRate * 4, a.sampleRate);
  const d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04;
    d[i] = last * 3.5;
  }
  return b;
});

export function tone(a, t, hz, type, peak, attack, release, dest = a.destination) {
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

// The same random numbers every time, so a baked loop sounds the same on
// every visit.
export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = Math.imul(s ^ (s >>> 15), 1 | s);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// A loop baked once from a recipe: fill(put, rate, rnd) adds samples with
// put(i, v), which wraps round the end so the loop has no seam.
export function baked(a, key, secs, fill, seed = 1) {
  return once(key, a, () => {
    const n = Math.round(a.sampleRate * secs);
    const b = a.createBuffer(1, n, a.sampleRate);
    const d = b.getChannelData(0);
    const put = (i, v) => { d[((i % n) + n) % n] += v; };
    fill(put, a.sampleRate, seeded(seed), n);
    return b;
  });
}

// A loop of a buffer through a filter, at a level, optionally swelling and
// falling on a slow wobble ([hz, depth]). Returns the sources to start.
export function loop(a, dest, buf, { rate = 1, filter, hz, q = 1, v = 1, swell } = {}) {
  const src = a.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.playbackRate.value = rate;
  let node = src;
  if (filter) {
    const f = a.createBiquadFilter();
    f.type = filter;
    f.frequency.value = hz;
    f.Q.value = q;
    node.connect(f);
    node = f;
  }
  const g = a.createGain();
  g.gain.value = v;
  node.connect(g);
  g.connect(dest);
  const out = [src];
  if (swell) {
    const lfo = a.createOscillator();
    lfo.frequency.value = swell[0];
    const d = a.createGain();
    d.gain.value = v * swell[1];
    lfo.connect(d);
    d.connect(g.gain);
    out.push(lfo);
  }
  return out;
}

// A hit of sound written into a baked loop: a short burst that dies away.
// kind: 'noise' (a click, a splash), or a pitch in Hz (a blip, a note), with
// an optional glide to another pitch.
export function hit(put, rate, rnd, i0, { hz, to, len = 0.1, v = 0.5, decay = 30, wave = 'sine', attack = 0.002 }) {
  const n = Math.round(len * rate), na = Math.max(1, Math.round(attack * rate));
  let ph = 0, lp = 0;
  for (let i = 0; i < n; i++) {
    const s = i / rate;
    const env = Math.min(1, i / na) * Math.exp(-decay * s);
    let x;
    if (!hz) {
      // Noise, softened a little so it isn't a hiss.
      lp += 0.5 * (rnd() * 2 - 1 - lp);
      x = lp;
    } else {
      const f = to ? hz * Math.pow(to / hz, i / n) : hz;
      ph += (2 * Math.PI * f) / rate;
      x = wave === 'square' ? Math.sign(Math.sin(ph)) * 0.6 : wave === 'saw' ? ((ph / Math.PI) % 2) - 1 : Math.sin(ph);
    }
    put(i0 + i, x * env * v);
  }
}
