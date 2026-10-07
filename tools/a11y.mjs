// Accessibility sweep: axe (the checker most audits use, Lighthouse's
// included) on every screen and state a player meets, on a phone and a
// desktop, against WCAG 2.2 AA and axe's best practices:
//
//   npm run a11y
//   npm run a11y -- --only=picker,case   just some of the states
//
// Prints each problem with where it is, and exits non-zero if there are any.
// Lighthouse only looks at the title; this looks at the picker, a room with
// its list, the whodunit's case file, the trail log, the tide dial, the lift
// on a night plate and the place-complete card too.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const axe = fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.slice(7).split(',') : null;

// [id, address, what to do first]
const STATES = [
  ['title', '#/', null],
  ['picker', '#/maps', null],
  ['overview', '#/block', null],
  ['room', '#/block/laundromat', null],
  ['list', '#/block/laundromat', async (p) => { if (await p.isVisible('#tray-more')) await p.click('#tray-more'); }],
  ['night', '#/manor', null],
  ['case', '#/manor/library', async (p) => { await p.click('#tally-case'); }],
  ['dial', '#/plum/center', null],
  ['trail', '#/cruise/buffet', async (p) => { await p.click('#tally-case'); }],
  ['complete', '#/southie', async (p) => {
    await p.evaluate(() => {
      document.getElementById('complete-title').textContent = 'Moving Day';
      document.getElementById('complete-text').textContent = 'Every goose, found.';
      document.getElementById('complete').hidden = false;
    });
  }],
].filter(([id]) => !only || only.includes(id));

const server = await createServer({ root, logLevel: 'error', server: { port: 0, hmr: false } });
await server.listen();
const base = `http://localhost:${server.httpServer.address().port}/`;
const browser = await chromium.launch();

let problems = 0;
for (const [device, opts] of [
  ['desktop', { viewport: { width: 1400, height: 900 } }],
  ['phone', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
]) {
  const ctx = await browser.newContext(opts);
  for (const [id, hash, setup] of STATES) {
    const page = await ctx.newPage();
    await page.goto(base + hash);
    await page.waitForFunction(() => window.__squares && document.body.dataset.ready, null, { timeout: 30000 });
    await page.waitForTimeout(2500);
    if (setup) { await setup(page); await page.waitForTimeout(800); }
    await page.addScriptTag({ content: axe });
    const found = await page.evaluate(async () => {
      const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } });
      return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n) => n.target.join(' ') + (n.any[0] ? ': ' + n.any[0].message : '')) }));
    });
    const n = found.reduce((a, v) => a + v.nodes.length, 0);
    problems += n;
    console.log(`${n ? 'FAIL' : 'PASS'}  ${device} ${id}${n ? `  (${n})` : ''}`);
    for (const v of found) {
      console.log(`        [${v.impact}] ${v.id}: ${v.help}`);
      for (const node of v.nodes.slice(0, 5)) console.log(`          ${node}`);
    }
    await page.close();
  }
  await ctx.close();
}
await browser.close();
await server.close();
console.log(problems ? `\n${problems} problems` : '\nNo problems found');
process.exit(problems ? 1 : 0);
