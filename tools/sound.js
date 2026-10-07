// How loud a place's sound is against a honk, measured in the page (QA's
// sound check and tools/sound.mjs). Every bed alone, the place's mix at a
// dozen moments in every area and on the overview, and every cue at its
// level. The honk must stand out over all of it:
//   a bed alone   12 dB under a honk, and 20 under in the honk's range
//   the mix        9 dB under, and 18 under in the honk's range
//   a cue          peaks 4 dB under a honk's peak (but a cue marked loud,
//                  a big thunderclap, is meant to make you jump)
export const RULES = { bed: [12, 20], mix: [9, 18], cue: 4 };

// Runs in the page (page.evaluate(soundInPage, { all, RULES })). all: measure
// every bed there is, not only the place's.
export async function soundInPage({ all = false, moments = 12, RULES } = {}) {
  const audio = await import('/src/game/audio.js');
  const w = window.__squares && window.__squares.world, m = w && w.map, s = m && m.sound;
  const honk = await audio.loudness('honk', {}, 0.02, 0.6);
  const out = { honk, beds: {}, mixes: [], cues: {}, problems: [] };
  const loop = (m && m.loop) || 180;
  // The places to listen from: the overview on each floor, then every area.
  const spots = [];
  if (s && s.bed) {
    const storeys = w.storeys && w.storeys.length ? w.storeys.map((x) => x.id) : [null];
    for (const st of storeys) spots.push({ zone: null, storey: st });
    for (const z of w.zones) spots.push({ zone: z.id, storey: null });
  }
  // The mixes, and every bed any of them uses.
  const used = new Set();
  const seen = new Map();
  if (s && typeof s.bed === 'function') {
    for (let i = 0; i < moments; i++) {
      const t = ((i + 0.5) / moments) * loop;
      for (const here of spots) {
        const lv = s.bed(t, here) || {};
        const mixLv = {};
        for (const [k, v] of Object.entries(lv)) {
          if (k === 'muffle' || !(v > 0)) continue;
          if (!audio.bedNames().includes(k)) out.problems.push(`The mix names a bed that doesn't exist: "${k}".`);
          else { used.add(k); mixLv[k] = v; }
        }
        const key = JSON.stringify(Object.entries(mixLv).map(([k, v]) => [k, Math.round(v * 20) / 20]).sort());
        if (!seen.has(key)) seen.set(key, { mix: mixLv, t, here });
      }
    }
  } else if (s && s.bed) used.add(s.bed);
  const names = all ? audio.bedNames() : [...used];
  for (const n of names) out.beds[n] = await audio.loudness(n, null, 1, 4);
  // The loudest mixes (by their beds' total), measured.
  const est = (mx) => Object.entries(mx).reduce((a, [k, v]) => a + (out.beds[k] ? Math.pow(10, out.beds[k].rms / 10) * v * v : 0), 0);
  const top = [...seen.values()].sort((a, b) => est(b.mix) - est(a.mix)).slice(0, 4);
  for (const x of top) out.mixes.push({ ...x, level: await audio.loudness(x.mix, null, 1, 4) });
  // Cues, each at full level.
  for (const q of (s && s.cues) || []) {
    if (q.loud || out.cues[q.name]) continue;
    const l = await audio.loudness(q.name, q, 0, 7), k = q.level == null ? 0 : 20 * Math.log10(q.level);
    out.cues[q.name] = { rms: l.rms + k, band: l.band + k, peak: Math.round((l.peak + k) * 10) / 10 };
  }
  // Against the rules.
  const [bR, bB] = RULES.bed, [mR, mB] = RULES.mix;
  for (const [n, l] of Object.entries(out.beds)) {
    if (!l) continue;
    if (l.rms > honk.rms - bR) out.problems.push(`The ${n} bed is ${(honk.rms - l.rms).toFixed(1)} dB under a honk (it should be ${bR}).`);
    if (l.band > honk.band - bB) out.problems.push(`The ${n} bed is ${(honk.band - l.band).toFixed(1)} dB under a honk in the honk's range (it should be ${bB}).`);
  }
  for (const x of out.mixes) {
    const l = x.level, where = x.here.zone || `the overview${x.here.storey ? ` (${x.here.storey})` : ''}`;
    if (l.rms > honk.rms - mR) out.problems.push(`The mix in ${where} is ${(honk.rms - l.rms).toFixed(1)} dB under a honk (it should be ${mR}).`);
    if (l.band > honk.band - mB) out.problems.push(`The mix in ${where} is ${(honk.band - l.band).toFixed(1)} dB under a honk in the honk's range (it should be ${mB}).`);
  }
  for (const [n, l] of Object.entries(out.cues)) {
    if (l && l.peak > honk.peak - RULES.cue) out.problems.push(`The ${n} cue peaks ${(honk.peak - l.peak).toFixed(1)} dB under a honk (it should be ${RULES.cue}).`);
  }
  return out;
}
