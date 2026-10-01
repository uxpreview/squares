// A pinched-in tour of an area: what a player sees after zooming in two or
// three times and looking around. The area's own framing hides a lot (cars
// that are only blocks, someone drawn inside a bench, seams in the water);
// this shows it. Use it at the art director's pass and before a level goes to
// the owner (PROCESS.md, "Look closer").
//
//   node tools/tour.mjs <map>/<zone> [--zoom=3] [--at=55,165,270] [--out=dir]
//                       [--desktop] [--eval="<js>"]
//
// Tiles the area's phone framing with screens zoomed in by --zoom (3 is about
// what a pinch gives), at each moment in --at (seconds of the scene, frozen),
// and saves each tile as <out>/<zone>-t<at>-<row><col>.png. The find list and
// the room bar are left out of each shot. Default out: qa-out/tour/.
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
if (!target || !target.includes('/')) {
  console.log('usage: node tools/tour.mjs <map>/<zone> [--zoom=3] [--at=55,165] [--out=dir] [--desktop] [--eval="js"]');
  process.exit(1);
}
const zoom = parseFloat(opt('zoom', '3'));
const times = opt('at', '').split(',').filter(Boolean).map(Number);
const out = opt('out', 'qa-out/tour');
const setup = opt('eval', null);
const desktop = args.includes('--desktop');
const zone = target.split('/')[1];
fs.mkdirSync(out, { recursive: true });

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const server = await createServer({ root, server: { port: 0 }, logLevel: 'silent' });
await server.listen();
const port = server.httpServer.address().port;
const browser = await chromium.launch();
const vw = desktop ? 1400 : 390, vh = desktop ? 1000 : 844;
const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`http://localhost:${port}/#/${target}`);
await page.waitForFunction(() => window.__squares && window.__squares.world, null, { timeout: 30000 });
await page.waitForTimeout(2500);
if (setup) await page.evaluate(`(async () => { ${setup} })()`);

// The part of the screen the picture has (the top bar and the find list
// cover the rest), measured from the page.
const box = await page.evaluate(() => {
  const r = (sel) => { const e = document.querySelector(sel); return e && !e.hidden ? e.getBoundingClientRect() : null; };
  const story = document.getElementById('story'); if (story) story.style.display = 'none';
  const top = Math.max(0, ...['#to-places', '.tally', '#dial'].map(r).filter((b) => b && b.height).map((b) => b.bottom));
  const low = r('#roombar') || r('#tray');
  return { top: top + 6, bottom: low && low.height ? low.top - 6 : innerHeight };
});
const base = await page.evaluate(() => ({ ...window.__squares.cam }));
const z = base.z * zoom;
const ph = box.bottom - box.top;
// The framed picture in world units, tiled by zoomed screens.
const W0 = vw / base.z, H0 = ph / base.z, w = vw / z, h = ph / z;
const nx = Math.max(1, Math.round(W0 / w)), ny = Math.max(1, Math.round(H0 / h));
// Screen y to world y at the base framing, and back at the zoomed one.
const mid = (box.top + box.bottom) / 2 - vh / 2;
const list = times.length ? times : [await page.evaluate(() => window.__squares.clock.t ?? 0)];
let n = 0;
for (const t of list) {
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = base.x - W0 / 2 + (i + 0.5) * (W0 / nx);
    const y = base.y + (box.top + (j + 0.5) * (ph / ny) - vh / 2) / base.z - mid / z;
    await page.evaluate(([x, y, z, t, fr]) => {
      const s = window.__squares;
      s.cam.x = x; s.cam.y = y; s.cam.z = z;
      if (fr) s.clock.freeze(t);
    }, [x, y, z, t, times.length > 0]);
    await page.waitForTimeout(600);
    await page.evaluate(() => new Promise((r) => { window.__squares.renderer.refreshAll(); requestAnimationFrame(() => requestAnimationFrame(r)); }));
    const file = path.join(out, `${zone}-t${t}-${j}${i}.png`);
    await page.screenshot({ path: file, clip: { x: 0, y: box.top, width: vw, height: ph } });
    n++;
  }
}
console.log(`${target}: ${nx} x ${ny} tiles at ${zoom}x, ${n} shots in ${out}`);
if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'));
await browser.close();
await server.close();
