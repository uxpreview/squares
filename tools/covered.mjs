// People drawn inside solid things, and finds painted over by their own
// furniture (see covered.js). QA runs the same check; this runs it alone.
//
//   node tools/covered.mjs <level> [--at=20,90,200] [--shots]
// --shots saves a close-up of each (as drawn, then with it on top) to qa-out/covered/.
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { coveredInPage } from './covered.js';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const level = args.find((a) => !a.startsWith('--'));
if (!level) { console.log('Usage: node tools/covered.mjs <level> [--at=20,90,200]'); process.exit(1); }
const at = args.find((a) => a.startsWith('--at='));

const server = await createServer({ root, logLevel: 'error', server: { port: 0, hmr: false } });
await server.listen();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.goto(`http://localhost:${server.httpServer.address().port}/#/${level}`);
await page.waitForFunction(() => window.__squares && window.__squares.world, null, { timeout: 30000 });
await page.waitForTimeout(600);
const loop = await page.evaluate(() => { const w = window.__squares.world; return w.map.loop || (w.walkers[0] && w.walkers[0].loop) || 60; });
const moments = at ? at.slice(5).split(',').map(Number) : [0.1, 0.35, 0.6, 0.85].map((f) => +(f * loop).toFixed(1));
const shots = args.includes('--shots');
const r = await page.evaluate(coveredInPage, { moments, shots });
if (shots) {
  const dir = path.join(root, 'qa-out', 'covered', level);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  [...r.people, ...r.finds].forEach((x, i) => x.shots.forEach((d, j) => fs.writeFileSync(path.join(dir, `${i}-${j ? 'on-top' : 'drawn'}.png`), Buffer.from(d.split(',')[1], 'base64'))));
  console.log('Close-ups in ' + path.relative(root, dir));
}
console.log(`${level}: ${r.counted.people} heads and ${r.counted.finds} finds checked at ${moments.join(', ')}s`);
r.people.forEach((p, i) => console.log(`  ${i} person  ${p.zone} at ${p.t}s, head ${Math.round(p.share * 100)}% covered: ${p.what}`));
r.finds.forEach((f, i) => console.log(`  ${i + r.people.length} find    ${f.zone} at ${f.t}s, ${f.label} (${f.id}) painted over: ${f.what}`));
if (!r.people.length && !r.finds.length) console.log('  nothing covered');
await browser.close();
await server.close();
