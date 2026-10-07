// How loud a place's sound is, against a honk.
//
//   node tools/sound.mjs           every bed there is
//   node tools/sound.mjs <place>   that place's beds, its loudest mixes and its cues
//   node tools/sound.mjs <place> --wav
//                                  also a sound file per area (and the overview), to
//                                  listen to: six seconds at morning, afternoon and
//                                  night, a honk in each to compare, in qa-out/sound/<place>/
//
// Levels are in dB (0 is as loud as a sound can be); "under" is how far under
// a honk. The rules are in tools/sound.js; QA runs the same check.
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { soundInPage, RULES } from './sound.js';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const place = process.argv.slice(2).find((a) => !a.startsWith('--'));

const server = await createServer({ root, logLevel: 'error', server: { port: 0, hmr: false } });
await server.listen();
const base = `http://localhost:${server.httpServer.address().port}/`;
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(base + (place ? '#/' + place : ''));
  if (place) await page.waitForFunction(() => window.__squares && window.__squares.world, null, { timeout: 30000 });
  else await page.waitForTimeout(500);
  const r = await page.evaluate(soundInPage, { all: !place, RULES });
  if (process.argv.includes('--json')) { console.log(JSON.stringify(r)); process.exit(0); }
  const h = r.honk;
  const row = (name, l, [rr, bb] = []) => {
    const ur = h.rms - l.rms, ub = h.band - l.band;
    const flag = rr != null && (ur < rr || ub < bb) ? '  << too loud' : '';
    return `  ${name.padEnd(28)} ${l.rms.toFixed(1).padStart(6)} ${l.band.toFixed(1).padStart(7)} ${ur.toFixed(1).padStart(8)} ${ub.toFixed(1).padStart(9)}${flag}`;
  };
  console.log(`\nA honk: ${h.rms} dB, ${h.band} in its range, peak ${h.peak}.\n`);
  console.log(`  ${'Bed'.padEnd(28)} ${'level'.padStart(6)} ${'range'.padStart(7)} ${'under'.padStart(8)} ${'(range)'.padStart(9)}`);
  for (const [n, l] of Object.entries(r.beds)) console.log(row(n, l, RULES.bed));
  if (r.mixes.length) {
    console.log(`\n  The loudest mixes (should be ${RULES.mix[0]} and ${RULES.mix[1]} under):`);
    for (const x of r.mixes) console.log(row(`${x.here.zone || 'overview ' + (x.here.storey || '')}`, x.level, RULES.mix) + `   ${Object.entries(x.mix).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(', ')}`);
  }
  if (Object.keys(r.cues).length) {
    console.log(`\n  Cues (peaks should be ${RULES.cue} under a honk's ${h.peak}):`);
    for (const [n, l] of Object.entries(r.cues)) console.log(`  ${n.padEnd(28)} peak ${l.peak.toFixed(1).padStart(6)}  ${(h.peak - l.peak).toFixed(1)} under${h.peak - l.peak < RULES.cue ? '  << too loud' : ''}`);
  }
  if (place && process.argv.includes('--wav')) {
    const dir = path.join(root, 'qa-out/sound', place);
    fs.mkdirSync(dir, { recursive: true });
    const spots = await page.evaluate(() => {
      const w = window.__squares.world;
      return [...(w.storeys.length ? w.storeys.map((s) => ({ zone: null, storey: s.id, name: 'overview-' + s.id })) : [{ zone: null, storey: null, name: 'overview' }]),
        ...w.zones.map((z) => ({ zone: z.id, storey: null, name: z.id }))];
    });
    for (const spot of spots) {
      const pcm = await page.evaluate(async (spot) => {
        const { render } = await import('/src/game/audio.js');
        const m = window.__squares.world.map, loop = m.loop || 180, out = [];
        for (const k of [1 / 6, 1 / 2, 5 / 6]) {
          const b = m.sound.bed, lv = typeof b === 'function' ? b(loop * k, spot) : { [b]: 1 };
          const { samples, rate } = await render(lv, 6, { honk: 3 });
          out.push(Array.from(samples.subarray(rate * 0.5), (x) => Math.max(-32767, Math.min(32767, Math.round(x * 32767)))));
        }
        return out.flat();
      }, spot);
      fs.writeFileSync(path.join(dir, spot.name + '.wav'), wav(pcm, 44100));
    }
    console.log(`\n${spots.length} files to listen to in ${path.relative(root, dir)}/ (each: morning, afternoon, night).`);
  }
  console.log(r.problems.length ? `\n${r.problems.length} problems:\n  ${r.problems.join('\n  ')}` : '\nAll under the honk.');
} finally {
  await browser.close();
  await server.close();
}

// A mono 16-bit WAV file from samples.
function wav(pcm, rate) {
  const b = Buffer.alloc(44 + pcm.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + pcm.length * 2, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(pcm.length * 2, 40);
  pcm.forEach((v, i) => b.writeInt16LE(v, 44 + i * 2));
  return b;
}
