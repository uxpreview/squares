// Screenshot helper for checking zones while drawing them.
//
//   node tools/shoot.mjs <target> [out.png] [--mobile] [--t=3.5] [--zoom=1.6]
//                        [--at=90] [--storey=up] [--finds] [--landscape]
//                        [--eval="<js>"] [--freeze]
//
// --t: seconds to wait before the shot. --at: the moment of the scene to show,
// in seconds (the evening at the manor is a 180-second loop; 88 is lights out).
// --freeze: stop the scene's clock at --at, to catch an exact moment (a flash
// of lightning lasts a fraction of a second).
// --storey: which floor to show, for places with a floor switch. --finds: ring
// every hidden find. --landscape: a phone on its side (844 x 390). --eval: run
// some JavaScript in the page before the shot, to set up a state (it can use
// await and import(), and window.__squares). For example, the Manor with its
// case solved:
//   --eval="(await import('/src/maps/manor/style.js')).verdict.solved = 0"
// Targets:
//   title                 the title screen
//   maps                  the place picker
//   block                 a map's overview (any map id)
//   block/laundromat      a zone inside a map
//   laundromat            a zone, searching every map for it
//   overview              same as "block" (the old name)
//
// Starts the Vite dev server, opens the page in headless Chromium, goes to the
// target, waits, and saves a PNG. Console errors are printed so broken zones
// are obvious. (A Google Fonts error is expected in sandboxes with no internet.)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const target = args[0] || 'block';
const out = args[1] && !args[1].startsWith('--') ? args[1] : `/tmp/shot-${target.replace(/\//g, '-')}.png`;
const mobile = args.includes('--mobile');
const waitArg = args.find((a) => a.startsWith('--t='));
const wait = waitArg ? parseFloat(waitArg.slice(4)) : 2.5;
const zoomArg = args.find((a) => a.startsWith('--zoom='));
const zoom = zoomArg ? parseFloat(zoomArg.slice(7)) : 1;
const atArg = args.find((a) => a.startsWith('--at='));
const at = atArg ? parseFloat(atArg.slice(5)) : null;
const storeyArg = args.find((a) => a.startsWith('--storey='));
const storey = storeyArg ? storeyArg.slice(9) : null;
const showFinds = args.includes('--finds');
const freeze = args.includes('--freeze');
const landscape = args.includes('--landscape');
const evalArg = args.find((a) => a.startsWith('--eval='));
const setup = evalArg ? evalArg.slice(7) : null;

const server = await createServer({ root, logLevel: 'error', server: { port: 0, hmr: false } });
await server.listen();
const port = server.httpServer.address().port;

const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
const page = await browser.newPage({
  viewport: landscape ? { width: 844, height: 390 } : mobile ? { width: 390, height: 844 } : { width: 1400, height: 1000 },
  deviceScaleFactor: 2,
  ignoreHTTPSErrors: true,
});
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
page.on('response', (r) => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url()); });

// Resolve the target to an address.
let hash = '#/';
let zoneId = null;
if (target === 'title') hash = '#/';
else if (target === 'maps') hash = '#/maps';
else if (target === 'overview') hash = '#/block';
else if (target.includes('/')) { hash = '#/' + target; zoneId = target.split('/')[1]; }
else hash = '#/' + target; // a map id, or a zone id (main.js treats unknown ids as old block links)

await page.goto(`http://localhost:${port}/${hash}`);
await page.waitForFunction(() => window.__squares && window.__squares.world, null, { timeout: 20000 });

// A bare zone id that isn't on the block: find which map has it.
if (!target.includes('/') && !['title', 'maps', 'overview'].includes(target)) {
  const found = await page.evaluate(async (id) => {
    const s = window.__squares;
    if (s.world.id === id) return 'map';
    if (s.world.indexOf(id) >= 0) return s.world.id;
    const { default: maps } = await import('/src/maps/index.js');
    for (const m of maps) {
      const mod = await m.load();
      if (mod.default.zones.some((z) => z.zone.id === id)) return m.id;
    }
    return null;
  }, target);
  if (found && found !== 'map' && found !== 'block') {
    await page.evaluate((h) => { location.hash = h; }, `#/${found}/${target}`);
  }
  if (found && found !== 'map') zoneId = target;
}

await page.waitForTimeout(600);
if (setup) await page.evaluate(`(async () => { ${setup} })()`);
if (storey && !zoneId) {
  await page.evaluate((id) => window.__squares.play.setStorey(id), storey);
  await page.waitForTimeout(1200);
}
await page.evaluate(([z, a, w, f, fr]) => {
  const s = window.__squares;
  if (z !== 1) s.cam.z *= z;
  // Land on the moment asked for when the shot is taken (or stop right on it).
  if (a != null && fr) s.clock.freeze(a);
  else if (a != null) s.clock.set(a - w);
  s.play.debug.finds = f;
}, [zoom, at, wait, showFinds, freeze]);
await page.waitForTimeout(wait * 1000);
await page.screenshot({ path: out });
const stats = await page.evaluate((id) => {
  const s = window.__squares;
  const z = id && s.world.zones.find((x) => x.id === id);
  return z ? { id: z.id, map: s.world.id, items: z.items.length, finds: z.finds.map((f) => f.id).join(',') } : null;
}, zoneId);
console.log('saved', out);
if (stats) console.log(JSON.stringify(stats));
if (errors.length) console.log('CONSOLE ERRORS:\n' + errors.join('\n'));
await browser.close();
await server.close();
