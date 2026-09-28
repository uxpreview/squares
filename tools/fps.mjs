// Frames per second on this computer's own graphics, in a real browser window.
//
//   node tools/fps.mjs <place> [more places]    the place, then each of its areas
//   node tools/fps.mjs block --only=laundromat,observatory
//   node tools/fps.mjs manor --size=1440x800 --dpr=2 --secs=3
//
// QA's speed check times the drawing code on a simulated phone; it can't see
// the time the graphics chip then takes to put the picture on screen, which is
// what makes an older laptop lag. This opens a visible window (headless
// browsers don't use the real graphics chip), lets each view settle, and counts
// frames. It builds the site first, so it measures what players get.
//
// Prints each view's frames per second, and how long the drawing code took
// (ms). Many frames per second with little drawing time is smooth; few frames
// with little drawing time means the graphics chip is the bottleneck.
import path from 'node:path';
import { execSync } from 'node:child_process';
import { preview } from 'vite';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const places = args.filter((a) => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const [W, H] = opt('size', '1440x800').split('x').map(Number);
const dpr = +opt('dpr', 2);
const secs = +opt('secs', 3);
const only = opt('only', '').split(',').filter(Boolean);
if (!places.length) { console.log('Usage: node tools/fps.mjs <place> [--only=a,b] [--size=1440x800] [--dpr=2] [--secs=3]'); process.exit(1); }

execSync('npx vite build --logLevel error', { cwd: root, stdio: 'inherit' });
const server = await preview({ root, logLevel: 'error', preview: { port: 0 } });
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: dpr });
await ctx.addInitScript(() => { try { localStorage.clear(); } catch {} });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('  page error: ' + e));

// Go to a view, let it land and settle, then count real frames.
const measure = (hash) => page.evaluate(async ([hash, secs]) => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  location.hash = hash;
  await sleep(400);
  for (let i = 0; i < 150 && !(window.__squares.world && window.__squares.world.id === hash.split('/')[1]); i++) await sleep(100);
  for (let i = 0; i < 100 && window.__squares.camera.flying; i++) await sleep(100);
  await sleep(2500);
  const f = window.__squares.perf;
  f.n = 0; f.total = 0;
  let n = 0;
  const t0 = performance.now();
  await new Promise((done) => {
    const tick = (now) => { n++; if (now - t0 < secs * 1000) requestAnimationFrame(tick); else done(); };
    requestAnimationFrame(tick);
  });
  return { fps: n / secs, ms: f.n ? f.total / f.n : 0 };
}, [hash, secs]);

await page.goto(base + '#/');
await page.waitForFunction(() => window.__squares, null, { timeout: 30000 });
const gpu = await page.evaluate(() => {
  const g = document.createElement('canvas').getContext('webgl');
  const d = g && g.getExtension('WEBGL_debug_renderer_info');
  return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown';
});
console.log(`${W} x ${H} at ${dpr}x, on ${gpu}\n`);

const row = (name, r) => console.log(`${r.fps.toFixed(0).padStart(4)} fps  ${r.ms.toFixed(1).padStart(5)} ms drawing  ${name}`);
const results = [];
for (const place of places) {
  const all = await measure(`#/${place}`);
  const info = await page.evaluate(() => {
    const w = window.__squares.world;
    return { name: w.map.name, areas: w.order.map((i) => [w.zones[i].id, w.zones[i].name]) };
  });
  if (!only.length) { row(`${info.name} (the whole place)`, all); results.push(all.fps); }
  for (const [id, name] of info.areas) {
    if (only.length && !only.includes(id)) continue;
    const r = await measure(`#/${place}/${id}`);
    row(name, r);
    results.push(r.fps);
  }
  console.log('');
}
if (results.length) console.log(`Slowest: ${Math.min(...results).toFixed(0)} fps. Smooth is 60; under 30 feels laggy.`);
await browser.close();
server.httpServer.close();
