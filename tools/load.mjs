// How fast the title shows on a slow phone connection, from a production build.
//   npm run build && node tools/load.mjs [--runs=3] [--hash=#/maps]
// Throttled like Lighthouse's phone test (slow 4G: 150 ms round trips,
// 1.6 Mbit/s down) and a 4x slower processor. Reports, in ms from the
// request: the title on screen (its wordmark in its own font), the map drawn
// behind it, and every place loaded.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const runs = +(args.find((a) => a.startsWith('--runs='))?.split('=')[1] || 3);
const hash = args.find((a) => a.startsWith('--hash='))?.split('=')[1] || '#/';

// The build, zipped as the host zips it (vite preview doesn't).
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]);
  try {
    let body = await readFile(join('dist', path === '/' ? 'index.html' : path));
    const type = TYPES[extname(path)] || (path === '/' ? 'text/html' : 'application/octet-stream');
    const headers = { 'content-type': type };
    if (/text|javascript|json|svg/.test(type)) { body = gzipSync(body, { level: 9 }); headers['content-encoding'] = 'gzip'; }
    res.writeHead(200, headers).end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, r));
const url = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch();
const rows = [];
for (let i = 0; i < runs; i++) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  let bytes = 0;
  cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength; });
  const t0 = Date.now();
  await page.goto(url + hash, { waitUntil: 'commit' });
  const title = await page.waitForFunction(() => {
    const w = document.getElementById('wordmark');
    return !document.getElementById('title').hidden && w.getBoundingClientRect().width > 0 && document.fonts.check('20px "Bagel Fat One"') && performance.now();
  }, null, { polling: 16, timeout: 30000 }).then((h) => h.jsonValue());
  const map = await page.waitForFunction(() => window.__squares?.world && window.__squares.renderer.perf && performance.now(), null, { polling: 16, timeout: 30000 }).then((h) => h.jsonValue());
  rows.push({ title: Math.round(title), map: Math.round(map), kb: Math.round(bytes / 1024) });
  await page.close();
}
console.log(rows.map((r, i) => `run ${i + 1}: title ${r.title} ms, map ${r.map} ms (${r.kb} KB over the wire by then)`).join('\n'));
await browser.close();
server.close();
