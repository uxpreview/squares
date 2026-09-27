// A blind playtest, from screenshots only (docs/PROCESS.md, step 7).
//
//   node tools/playtest.mjs <level> prepare
//       Takes a clean shot of every area as a player sees it (no rings, no
//       list open) into qa-out/<level>/playtest/, with labels.json: the find
//       labels per area, and nothing about where they are. A whodunit also
//       gets case/: the case file as a player meets it (the suspects, one
//       suspect up close, a wrong accusation, the mystery suspect half-way,
//       and the reveal), for the second part of the test.
//
//   node tools/playtest.mjs <level> check <guesses.json>
//       Scores a playtester's guesses. guesses.json:
//         { "<area id>": { "<label>": [x, y] or null, ... }, ... }
//       x, y are pixels in that area's shot (the .png as saved); null means
//       "couldn't find it". A guess counts if it lands within the find's tap
//       area. Prints a table and writes score.md next to the shots.
//
// The playtester reads labels.json and looks at the shots; it never needs the
// code. Where the finds really are is kept in answers.json: don't give it to them.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const [level, mode, guessFile] = process.argv.slice(2);
const dir = path.join(root, 'qa-out', level || '', 'playtest');
const SCALE = 2; // shots are taken at 2x: pixels in the .png are half a CSS pixel
const VIEW = { width: 1400, height: 1000 };

if (!level || !['prepare', 'check'].includes(mode)) {
  console.log('Usage: node tools/playtest.mjs <level> prepare\n       node tools/playtest.mjs <level> check <guesses.json>');
  process.exit(1);
}

if (mode === 'prepare') {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const server = await createServer({ root, logLevel: 'error', server: { port: 0, hmr: false } });
  await server.listen();
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: SCALE });
  // The list tucked away, as a player hunting would have it.
  await ctx.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('squares.tray.v1', 'hidden'); } catch {} });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${server.httpServer.address().port}/#/${level}`);
  await page.waitForFunction(() => window.__squares && window.__squares.world, null, { timeout: 30000 });
  await page.waitForTimeout(800);
  const zones = await page.evaluate(() => {
    const w = window.__squares.world;
    return w.order.map((i) => ({ id: w.zones[i].id, name: w.zones[i].name }));
  });
  const labels = {}, answers = {};
  for (const z of zones) {
    await page.evaluate((id) => window.__squares.play.enterZone(id, { dur: 0.01 }), z.id);
    await page.waitForTimeout(1500);
    // Changing floors slides the storeys past each other for a while: wait
    // until the floors and the camera are still, or the answers are taken
    // from where the finds were a moment before the shot.
    await page.waitForFunction(() => {
      const s = window.__squares;
      const now = JSON.stringify([s.cam, s.world.zones.map((z) => z.lift)]);
      const still = now === window.__lastPose;
      window.__lastPose = now;
      return still;
    }, null, { polling: 300, timeout: 10000 }).catch(() => {});
    // Freeze the moment: note where everything is, then take the shot.
    const found = await page.evaluate((id) => {
      const s = window.__squares;
      const st = document.getElementById('story');
      if (st) st.hidden = true;
      const zone = s.world.zones.find((x) => x.id === id);
      const t = s.clock.now() + 0.15;
      return zone.finds.map((f) => {
        const [x, y, h] = typeof f.at === 'function' ? f.at(t) : f.at;
        const [sx, sy] = s.camera.toScreen(zone.anchor[0] + x - y, zone.anchor[1] - zone.lift + (x + y) / 2 - h * 1.12);
        return { label: f.goose ? 'The goose' : f.label, sx, sy, r: Math.max(f.r * s.cam.z, 22) };
      });
    }, z.id);
    await page.screenshot({ path: path.join(dir, `${z.id}.png`) });
    labels[z.id] = { name: z.name, shot: `${z.id}.png`, find: found.map((f) => f.label) };
    answers[z.id] = found;
  }
  fs.writeFileSync(path.join(dir, 'labels.json'), JSON.stringify(labels, null, 2));
  fs.writeFileSync(path.join(dir, 'answers.json'), JSON.stringify(answers, null, 2));

  // A whodunit: the case file, step by step, as a player would see it.
  const hasCase = await page.evaluate(() => window.__squares.world.goal === 'case');
  if (hasCase) {
    const cdir = path.join(dir, 'case');
    fs.mkdirSync(cdir, { recursive: true });
    const snap = async (name) => { await page.waitForTimeout(700); await page.screenshot({ path: path.join(cdir, name + '.png') }); };
    const speak = async () => {
      for (let i = 0; i < 14 && !(await page.isVisible('.scene-end')); i++) { await page.click('.lines'); await page.waitForTimeout(150); }
    };
    const plan = await page.evaluate(() => {
      const c = window.__squares.world.map.case;
      const culprit = c.suspects.find((s) => s.id === c.culprit);
      const other = c.suspects.find((s) => s.id !== c.culprit);
      return { culprit: culprit.name, hidden: culprit.hidden ? culprit.hidden.name : culprit.name, other: other.name, clues: culprit.against.map((x) => x.find).filter(Boolean) };
    });
    await page.evaluate(() => { const s = window.__squares; s.play.reset(); s.play.toOverview({ dur: 0.01 }); });
    await page.click('#tally-case');
    await snap('1-the-case-file');
    await page.click(`.suspect >> text=${plan.other}`);
    await snap('2-a-suspect');
    await page.click('.case-accuse');
    await speak();
    await snap('3-accusing-them');
    await page.click('.scene-end .big-btn');
    // Half the clues against the culprit found: what the mystery card looks like then.
    await page.evaluate((keys) => {
      const s = window.__squares, w = s.world;
      for (const key of keys) {
        const [zid, fid] = key.split(':');
        const z = w.zones.find((x) => x.id === zid);
        s.play.markFound(z, z.finds.find((f) => f.id === fid));
      }
    }, plan.clues.slice(0, Math.floor(plan.clues.length / 2)));
    await page.waitForTimeout(400);
    await page.click(`.suspect >> text=${plan.hidden}`);
    await snap('4-the-mystery-suspect');
    await page.evaluate((keys) => {
      const s = window.__squares, w = s.world;
      for (const key of keys) {
        const [zid, fid] = key.split(':');
        const z = w.zones.find((x) => x.id === zid);
        s.play.markFound(z, z.finds.find((f) => f.id === fid));
      }
      s.play.casefile.close();
    }, plan.clues);
    await page.click('#tally-case');
    await snap('5-every-clue-found');
    await page.click(`.suspect >> text=${plan.culprit}`);
    await page.waitForTimeout(400);
    await page.click('.case-accuse');
    await speak();
    await snap('6-naming-them');
    await page.click('.scene-end .big-btn');
    await page.waitForTimeout(3600);
    await snap('7-the-reveal');
  }
  await browser.close();
  await server.close();
  console.log(`Shots and labels.json in ${path.relative(root, dir)}/ (answers.json is for the checker, not the playtester).`);
  process.exit(0);
}

// check
const answers = JSON.parse(fs.readFileSync(path.join(dir, 'answers.json'), 'utf8'));
const guesses = JSON.parse(fs.readFileSync(path.resolve(guessFile), 'utf8'));
const rows = [];
let hits = 0, total = 0;
for (const [id, finds] of Object.entries(answers)) {
  for (const f of finds) {
    total++;
    const g = guesses[id] && guesses[id][f.label];
    let result = 'not found';
    if (Array.isArray(g)) {
      const d = Math.hypot(g[0] / SCALE - f.sx, g[1] / SCALE - f.sy);
      result = d <= f.r ? 'found' : `missed by ${Math.round(d - f.r)}px`;
      if (d <= f.r) hits++;
    }
    rows.push([id, f.label, result]);
  }
}
const md = [`# Playtest score: ${level}`, '', `${hits} of ${total} found.`, '', '| Area | Find | Result |', '| --- | --- | --- |',
  ...rows.map((r) => `| ${r[0]} | ${r[1]} | ${r[2]} |`), ''].join('\n');
fs.writeFileSync(path.join(dir, 'score.md'), md);
for (const r of rows) console.log(`${r[2] === 'found' ? 'FOUND ' : 'MISSED'}  ${r[0].padEnd(16)} ${r[1]}  ${r[2] === 'found' ? '' : '(' + r[2] + ')'}`);
console.log(`\n${hits} of ${total} found. Written to ${path.relative(root, path.join(dir, 'score.md'))}`);
