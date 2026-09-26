// Sound, all synthesized: no files to load. Browsers only allow audio after a
// tap or click, so the first sound after page load may be the first you hear.
//
// To add a sound: write a function that takes (audio, t0) and schedules
// oscillators or noise, and add it to SOUNDS.

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

export function play(name) {
  const a = context();
  if (!a || !SOUNDS[name]) return;
  try { SOUNDS[name](a, a.currentTime + 0.01); } catch {}
}

export function setMuted(v) {
  muted = !!v;
  if (muted && ac && ac.state === 'running') ac.suspend();
}

export const isMuted = () => muted;
