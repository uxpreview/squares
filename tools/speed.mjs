// How fast a place draws, area by area, with the CPU slowed 4x on a phone
// (the same setup as QA's speed check), and where the time goes.
//
//   node tools/speed.mjs <level>            both ways: walked (as QA does) and fresh
//   node tools/speed.mjs <level> --fresh    each area opened on its own and left to settle
//   node tools/speed.mjs <level> --walk     every area in turn on one page, as QA does
//   node tools/speed.mjs <level> --frames=12 --only=library,study
//   node tools/speed.mjs <level> --live     with the room's caches off, to compare
//
// Prints each view's average frame (ms) and its parts: the room you're in,
// the other rooms, refreshing their pictures, the backdrop and the sky.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const exe = fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {};

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const level = args.find((a) => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const frames = +opt('frames', 12);
const only = opt('only', '').split(',').filter(Boolean);
const modes = args.includes('--fresh') ? ['fresh'] : args.includes('--walk') ? ['walk'] : ['walk', 'fresh'];
if (!level) { console.log('Usage: node tools/speed.mjs <level> [--fresh | --walk] [--frames=12] [--only=a,b]'); process.exit(1); }

const server = await createServer({ root, logLevel: 'error', server: { port: 0, hmr: false } });
await server.listen();
const base = `http://localhost:${server.httpServer.address().port}/`;
const gpu = await chromium.launch({ ...exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });

async function open(hash) {
  const ctx = await gpu.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  await ctx.addInitScript(() => { try { localStorage.clear(); } catch {} });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('  page error: ' + e));
  await p.goto(base + '#/' + hash);
  await p.waitForFunction(() => window.__squares && window.__squares.world, null, { timeout: 30000 });
  if (args.includes('--live')) await p.evaluate(() => { window.__squares.renderer.caching = false; });
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  return { ctx, p };
}

// Let it land, settle (walls up, floors in place), give it two seconds to
// draw its neighbors and cache the backdrop, then average the next frames.
// Real frames: a headless browser paints slowly, and drawing back to back
// only piles up work for its GPU. The parts are running averages.
async function measure(p, label) {
  await p.waitForFunction(() => !window.__squares.camera.flying, null, { timeout: 30000 }).catch(() => {});
  await p.evaluate(() => window.__squares.renderer.settleNow());
  await p.waitForTimeout(2000);
  await p.evaluate(() => { const f = window.__squares.perf; f.n = 0; f.total = 0; f.worst = 0; });
  await p.waitForFunction((n) => window.__squares.perf.n >= n, frames, { timeout: 60000 }).catch(() => {});
  const r = await p.evaluate(() => { const f = window.__squares.perf; return { ms: f.n ? f.total / f.n : f.ms, n: f.n, worst: f.worst, focus: f.focus, zones: f.zones, snap: f.snap, back: f.back, sky: f.sky }; });
  const part = (k) => `${k} ${r[k].toFixed(1).padStart(4)}`;
  console.log(`${r.ms.toFixed(1).padStart(6)} ms  (worst ${r.worst.toFixed(0).padStart(3)}, ${r.n} frames)  ${['focus', 'zones', 'snap', 'back', 'sky'].map(part).join('  ')}  ${label}`);
  return r;
}

const { ctx: c0, p: p0 } = await open(level);
const info = await p0.evaluate(() => {
  const w = window.__squares.world;
  return { order: w.order.map((i) => w.zones[i].id), names: Object.fromEntries(w.zones.map((z) => [z.id, z.name])), storeys: w.map.storeys ? w.storeys.map((s) => ({ id: s.id, name: s.name })).reverse() : [] };
});
const ids = info.order.filter((id) => !only.length || only.includes(id));

if (modes.includes('walk')) {
  console.log('\nWalked, as QA does (one page, every floor then every area):');
  if (!only.length) {
    for (const s of info.storeys.length ? info.storeys : [{ id: null, name: 'The whole place' }]) {
      if (s.id) await p0.evaluate((i) => window.__squares.play.setStorey(i), s.id);
      await measure(p0, `${s.name} (overview)`);
    }
  }
  for (const id of ids) {
    await p0.evaluate((i) => window.__squares.play.enterZone(i, { dur: 0.01 }), id);
    await measure(p0, info.names[id]);
  }
}
await c0.close();

if (modes.includes('fresh')) {
  console.log('\nFresh (each area opened on its own):');
  for (const id of ids) {
    const { ctx, p } = await open(`${level}/${id}`);
    await measure(p, info.names[id]);
    await ctx.close();
  }
}

await gpu.close();
await server.close();
