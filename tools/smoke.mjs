// Smoke test: clicks through the game the way a player would and checks that
// each step worked. Run it after any change to the engine, the screens or the
// save format:
//
//   npm run smoke
//
// Prints PASS / FAIL per step and exits non-zero if anything failed.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const server = await createServer({ root, logLevel: 'error', server: { port: 0, hmr: false } });
await server.listen();
const base = `http://localhost:${server.httpServer.address().port}/`;
const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});

let failed = 0;
const errors = [];
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failed++;
}
const wait = (page, ms) => page.waitForTimeout(ms);
const S = (page, fn, arg) => page.evaluate(fn, arg);
const ready = (page) => page.waitForFunction(() => window.__squares && window.__squares.world, null, { timeout: 20000 });

async function fresh(viewport, init) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push(m.text()); });
  return page;
}

// Where a find is on screen right now.
const findOnScreen = (page, zoneId, findId) => S(page, ([z, f]) => {
  const s = window.__squares;
  const zone = s.world.zones.find((x) => x.id === z);
  const find = zone.finds.find((x) => x.id === f);
  const t = performance.now() / 1000;
  const [x, y, h] = typeof find.at === 'function' ? find.at(t) : find.at;
  const X = zone.anchor[0] + (x - y), Y = zone.anchor[1] + (x + y) / 2 - h * 1.12;
  return s.camera.toScreen(X, Y);
}, [zoneId, findId]);

// ---------- 1. A returning v1 player, desktop ----------
{
  const page = await fresh({ width: 1400, height: 1000 }, () => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.clear();
      localStorage.setItem('squares.found.v1', JSON.stringify(['laundromat:goose', 'laundromat:sock']));
      sessionStorage.setItem('seeded', '1');
    }
  });
  await page.goto(base);
  await ready(page);
  await wait(page, 400);
  check('title screen shows', await page.isVisible('#title'));
  check('old v1 save carried over', (await page.textContent('#title-progress')).includes('1 goose'));

  await page.click('#title-play');
  await wait(page, 300);
  check('Play opens the picker', (await S(page, () => location.hash)) === '#/maps' && await page.isVisible('#places'));
  const listed = await S(page, async () => (await import('/src/maps/index.js')).default.filter((m) => !m.hidden).length);
  const cards = await page.$$('.place-card');
  check('picker lists every place (and no hidden ones)', cards.length === listed, `${cards.length} cards, ${listed} places`);
  await wait(page, 800);
  check('picker draws map pictures', (await page.$$('.place-pic canvas')).length === listed);

  await page.click('.place-card >> nth=0');
  await wait(page, 1600);
  check('a card opens its place', (await S(page, () => location.hash)) === '#/block' && await page.isVisible('.tally'));
  check('tallies count the old save', (await page.textContent('#tally-geese')) === '1/16' && (await page.textContent('#tally-things')) === '1/48');

  // Tap the laundromat's floor to go in.
  const [lx, ly] = await S(page, () => {
    const s = window.__squares, z = s.world.zones.find((x) => x.id === 'laundromat');
    return s.camera.toScreen(z.anchor[0], z.anchor[1] + 12);
  });
  await page.mouse.click(lx, ly);
  await wait(page, 1900);
  check('tapping a room goes inside', (await S(page, () => location.hash)) === '#/block/laundromat');
  check('room bar names the room', (await page.textContent('#room-name')) === 'Laundromat');

  const [fx, fy] = await findOnScreen(page, 'laundromat', 'coin');
  await page.mouse.click(fx, fy);
  await wait(page, 300);
  check('tapping a hidden thing circles it', (await page.textContent('#tally-things')) === '2/48');

  await page.keyboard.press('ArrowRight');
  await wait(page, 1500);
  check('arrow keys step to the next room', (await S(page, () => location.hash)) !== '#/block/laundromat');

  await page.keyboard.press('Escape');
  await wait(page, 200);
  await page.keyboard.press('Escape'); // closes the story if it was open, else goes up
  await wait(page, 1600);
  const h = await S(page, () => location.hash);
  if (h !== '#/block') { await page.keyboard.press('Escape'); await wait(page, 1600); }
  check('Escape goes back up to the whole map', (await S(page, () => location.hash)) === '#/block' && await S(page, () => document.body.dataset.mode) === 'overview');

  await page.click('#to-places');
  await wait(page, 400);
  check('Places button returns to the picker', (await S(page, () => location.hash)) === '#/maps');

  await page.goBack();
  await wait(page, 1600);
  check('browser back returns to the map', (await S(page, () => location.hash)).startsWith('#/block'));

  await page.goto(base + '#/');
  await ready(page);
  await wait(page, 400);
  check('title offers to continue where you were', (await page.textContent('#title-play-label')) === 'Continue');

  const saved = await S(page, () => JSON.parse(localStorage.getItem('squares.save.v2')));
  check('progress saved in the v2 format', saved && saved.v === 2 && saved.found.block.includes('laundromat:coin'));

  await page.click('.title .sound-btn');
  check('sound toggle remembers', (await S(page, () => JSON.parse(localStorage.getItem('squares.save.v2')).settings.sound)) === false);
  await page.close();
}

// ---------- 2. Deep links, the building, finishing a place (phone) ----------
{
  const page = await fresh({ width: 390, height: 844 }, () => localStorage.clear());
  await page.goto(base + '#laundromat');
  await ready(page);
  await wait(page, 600);
  check('old #room links still work', (await S(page, () => location.hash)) === '#/block/laundromat' && await page.isVisible('#roombar'));

  await page.goto(base + '#/tower/flat2');
  await ready(page);
  await wait(page, 1800);
  check('deep link into a floor', (await S(page, () => location.hash)) === '#/tower/flat2');
  const veils = await S(page, () => window.__squares.world.zones.map((z) => Math.round(z.veil * 100) / 100));
  check('floors above lift out of the way', veils[0] === 0 && veils[1] === 0 && veils[2] > 0.9 && veils[3] > 0.9, veils.join(','));

  // Tap the faded floor above (its front corner peeks in at the top) to go up.
  const up = await S(page, () => {
    const s = window.__squares, z = s.world.zones.find((x) => x.id === 'flat3');
    return s.camera.toScreen(z.anchor[0] + 0, z.anchor[1] - z.lift + 14.5);
  });
  if (up[1] > 90) {
    await page.mouse.click(up[0], up[1]);
    await wait(page, 1800);
    check('tapping a faded floor above goes up to it', (await S(page, () => location.hash)) === '#/tower/flat3');
  } else {
    check('faded floor above is on screen to tap', false, 'y=' + Math.round(up[1]));
  }

  await page.click('#all');
  await wait(page, 1700);
  const back = await S(page, () => window.__squares.world.zones.map((z) => z.veil));
  check('floors settle back in the overview', back.every((v) => v < 0.05), back.join(','));

  // Find every goose in the building.
  await S(page, () => {
    const s = window.__squares;
    for (const z of s.world.zones) s.play.markFound(z, z.finds.find((f) => f.goose));
  });
  await wait(page, 5200);
  check('finishing a place shows the complete card', await page.isVisible('#complete'));
  await page.click('#complete-next');
  await wait(page, 500);
  check('complete card leads to the picker', (await S(page, () => location.hash)) === '#/maps');

  // Finish The Block too, and the picker should say so on its card.
  await page.goto(base + '#/block');
  await ready(page);
  await wait(page, 800);
  await S(page, () => {
    const s = window.__squares;
    for (const z of s.world.zones) s.play.markFound(z, z.finds.find((f) => f.goose));
  });
  await wait(page, 5200);
  await page.click('#complete-next');
  await wait(page, 1300);
  check('picker marks the place complete', (await page.textContent('.place-card >> nth=0')).includes('Complete'));
  await page.close();
}

// ---------- 3. A house: floors, walls down, people walking room to room (desktop) ----------
{
  const page = await fresh({ width: 1400, height: 1000 }, () => localStorage.clear());
  await page.goto(base + '#/manor');
  await ready(page);
  await wait(page, 1200);
  const floors = await page.$$eval('#storeys button', (bs) => bs.map((b) => [b.textContent, b.getAttribute('aria-pressed')]));
  check('a house shows a floor switch, top floor first', floors.length === 3 && floors[0][0] === 'Upstairs' && floors[1][1] === 'true', JSON.stringify(floors));
  const lifted = () => S(page, () => Object.fromEntries(window.__squares.world.zones.map((z) => [z.id, Math.round(z.veil * 100) / 100])));
  let v = await lifted();
  check('on the ground floor, the floor above is lifted away', v['guest-rooms'] > 0.9 && v['grand-hall'] === 0 && v.grounds === 0, JSON.stringify(v));

  // Tap the middle of the dining room's floor: the ghost of the bedroom above must not steal it.
  const [dx, dy] = await S(page, () => {
    const s = window.__squares, z = s.world.zones.find((x) => x.id === 'dining-room');
    return s.camera.toScreen(z.anchor[0], z.anchor[1] + 8);
  });
  await page.mouse.click(dx, dy);
  await wait(page, 1800);
  check('tapping a room under a lifted floor goes into that room', (await S(page, () => location.hash)) === '#/manor/dining-room');
  const walls = await S(page, () => Object.fromEntries(window.__squares.world.zones.map((z) => [z.id, Math.round(z.wallK * 100) / 100])));
  check('its walls rise; the rooms around keep theirs down', walls['dining-room'] === 1 && walls['grand-hall'] === 0 && walls.kitchen === 0, JSON.stringify(walls));

  await page.click('#storeys button >> text=Upstairs');
  await wait(page, 1800);
  v = await lifted();
  check('the floor switch goes up a floor', (await S(page, () => location.hash)) === '#/manor' && v['guest-rooms'] < 0.05, JSON.stringify(v));
  await page.click('#storeys button >> text=Cellar');
  await wait(page, 1800);
  v = await lifted();
  check('and down to the cellar, lifting everything above', v['grand-hall'] > 0.9 && v['guest-rooms'] > 0.9 && v.cellar === 0 && v.grounds === 0, JSON.stringify(v));

  const people = await S(page, () => {
    const w = window.__squares.world;
    const inside = (z, p) => p.x >= z.ox && p.x < z.ox + z.w && p.y >= z.oy && p.y < z.oy + z.d && p.z >= z.oz - 0.01 && p.z < z.oz + z.span - 0.01;
    let twice = 0;
    for (const k of w.walkers) {
      for (let t = 0; t < 180; t += 3.7) {
        const p = k.at(t);
        if (w.zones.filter((z) => inside(z, p)).length > 1) twice++;
      }
    }
    return { n: w.walkers.length, twice };
  });
  check('people walk the house, each in one room at a time', people.n > 0 && people.twice === 0, JSON.stringify(people));
  await page.close();
}

check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
await server.close();
console.log(failed ? `\n${failed} failed` : '\nAll good');
process.exit(failed ? 1 : 0);
