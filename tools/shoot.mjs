// Screenshot helper for checking rooms while drawing them.
//
//   node tools/shoot.mjs <roomId|overview> [out.png] [--mobile] [--t=3.5] [--zoom=1.6]
//
// Serves the project locally, opens it in headless Chromium, flies to the room,
// waits, and saves a PNG. Console errors are printed so broken rooms are obvious.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const target = args[0] || 'overview';
const out = args[1] && !args[1].startsWith('--') ? args[1] : `/tmp/shot-${target}.png`;
const mobile = args.includes('--mobile');
const waitArg = args.find((a) => a.startsWith('--t='));
const wait = waitArg ? parseFloat(waitArg.slice(4)) : 2.5;
const zoomArg = args.find((a) => a.startsWith('--zoom='));
const zoom = zoomArg ? parseFloat(zoomArg.slice(7)) : 1;

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  const file = path.join(root, p === '/' ? 'index.html' : p);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? undefined : undefined });
const page = await browser.newPage({
  viewport: mobile ? { width: 390, height: 844 } : { width: 1400, height: 1000 },
  deviceScaleFactor: 2,
  ignoreHTTPSErrors: true,
});
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
page.on('response', (r) => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url()); });

await page.addInitScript(() => { window.__noAutoTour = true; });
const hash = target === 'overview' ? '' : '#' + target;
await page.goto(`http://localhost:${port}/${hash}`);
await page.waitForTimeout(600);
await page.evaluate((z) => {
  const s = window.__squares;
  if (!s) return;
  s.stopTour();
  if (z !== 1) s.cam.z *= z;
}, zoom);
await page.waitForTimeout(wait * 1000);
await page.screenshot({ path: out });
const stats = await page.evaluate(() => {
  const s = window.__squares;
  if (!s) return null;
  return s.rooms.map((r) => ({ id: r.id, items: r.items.length, finds: r.finds.map((f) => f.id).join(',') }));
});
console.log('saved', out);
if (target !== 'overview' && stats) console.log(JSON.stringify(stats.find((s) => s.id === target)));
if (errors.length) console.log('CONSOLE ERRORS:\n' + errors.join('\n'));
await browser.close();
server.close();
