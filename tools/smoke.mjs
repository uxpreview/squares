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
  // (A place loads the first time its card needs a picture: the Manor takes a moment.)
  const drawn = await page.waitForFunction((n) => document.querySelectorAll('.place-pic canvas').length === n, listed, { timeout: 8000 }).then(() => true, () => false);
  check('picker draws map pictures', drawn, `${(await page.$$('.place-pic canvas')).length} of ${listed}`);

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

  const saved = await S(page, () => JSON.parse(localStorage.getItem('squares.save.v3')));
  check('progress saved in the v3 format', saved && saved.v === 3 && saved.found.block.includes('laundromat:coin'));

  await page.click('.title .sound-btn');
  check('sound toggle remembers', (await S(page, () => JSON.parse(localStorage.getItem('squares.save.v3')).settings.sound)) === false);
  await page.close();
}

// ---------- 1b. A returning v2 player: their save carries over to v3 ----------
{
  const page = await fresh({ width: 1400, height: 1000 }, () => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.clear();
      localStorage.setItem('squares.save.v2', JSON.stringify({ v: 2, found: { block: ['pool:goose', 'pool:float'] }, settings: { sound: false }, last: { map: 'block', zone: 'pool' } }));
      sessionStorage.setItem('seeded', '1');
    }
  });
  await page.goto(base);
  await ready(page);
  await wait(page, 400);
  check('a v2 save carries over (finds, settings, where you were)', (await page.textContent('#title-progress')).includes('1 goose') &&
    (await page.textContent('#title-play-label')) === 'Continue' &&
    (await S(page, () => window.__squares.store.settings.sound)) === false);
  await page.close();
}

// ---------- 2. Deep links, the building, finishing a place (phone) ----------
{
  const page = await fresh({ width: 390, height: 844 }, () => localStorage.clear());
  await page.goto(base + '#laundromat');
  await ready(page);
  await wait(page, 600);
  check('old #room links still work', (await S(page, () => location.hash)) === '#/block/laundromat' && await page.isVisible('#roombar'));

  // The room bar rides just above the list, never on it, however the list got there.
  const barGap = () => S(page, () => {
    const bar = document.getElementById('roombar').getBoundingClientRect(), t = document.getElementById('tray');
    return Math.round((t.dataset.state === 'hidden' ? document.getElementById('tray-pill') : t).getBoundingClientRect().top - bar.bottom);
  });
  await page.click('#tray-hide');
  await wait(page, 700);
  const tucked = await barGap();
  await page.click('#tray-pill');
  await wait(page, 700);
  const shown = await barGap();
  check('the room bar sits just above the list, tucked away or not', tucked >= 6 && shown >= 6, `tucked ${tucked}px, shown ${shown}px`);

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

  check('in a room, back says where it goes', (await page.textContent('#to-places-label')) === 'The Walk-Up');
  await page.click('#to-places');
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
  await wait(page, 1600);

  // A first visit: a card pinned to a room says where to start, with a ring on the room.
  check('a first visit invites you into a room', await page.isVisible('#invite') && await page.isVisible('#invite-ring'));
  const ring = await S(page, () => {
    const s = window.__squares, r = document.getElementById('invite-ring').getBoundingClientRect();
    const [X, Y] = s.camera.toWorld(r.x + r.width / 2, r.y + r.height / 2);
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, zone: s.world.zones[s.world.zoneAt(X, Y)]?.id };
  });
  check('its ring is on screen, on the room it names', ring.x > 0 && ring.x < 390 && ring.y > 0 && ring.y < 844 && ring.zone === 'laundromat', JSON.stringify(ring));
  await page.click('#invite');
  await wait(page, 1800);
  check('tapping the invitation steps into its room', (await S(page, () => location.hash)) === '#/block/laundromat');
  await page.click('#to-places');
  await wait(page, 1800);
  check('once you have been in a room, the invitation is gone', !(await page.isVisible('#invite')) && (await S(page, () => location.hash)) === '#/block');
  // Rooms that still hide a goose honk now and then.
  const honked = await page.waitForFunction(() => window.__squares.play.debug.calls > 0, null, { timeout: 9000 }).then(() => true, () => false);
  check('on the whole map, rooms still hiding a goose honk', honked);

  // On a phone the map fills the screen: The Block runs off the sides, a swipe away.
  const swipe = await S(page, () => { const r = window.__squares.camera.range(); return r ? r.x1 - r.x0 : 0; });
  check('on a phone the map fills the screen, running off the sides', swipe > 20, 'room to swipe: ' + Math.round(swipe));
  // Soft edges: from the left edge, drag further left and it gives; let go and it springs back.
  const offBy = () => S(page, () => { const s = window.__squares, c = s.camera.clamp(s.cam); return Math.hypot(c.x - s.cam.x, c.y - s.cam.y); });
  await S(page, () => { const s = window.__squares; s.camera.jumpTo(s.camera.clamp({ x: -1e3, y: s.cam.y, z: s.cam.z })); });
  await page.mouse.move(60, 420);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) { await page.mouse.move(60 + i * 30, 420); await wait(page, 16); }
  const past = await offBy();
  await wait(page, 150);
  await page.mouse.up();
  await wait(page, 1400);
  const after = await offBy();
  check('dragged past its edge the map gives, and springs back', past > 1 && after < 0.01, `past ${past.toFixed(1)}, after ${after.toFixed(3)}`);
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
  // A clean save once; reloads keep what the test did (for "a solved case stays solved").
  const page = await fresh({ width: 1400, height: 1000 }, () => {
    if (!sessionStorage.getItem('seeded')) { localStorage.clear(); sessionStorage.setItem('seeded', '1'); }
  });
  await page.goto(base + '#/manor');
  await ready(page);
  await wait(page, 1200);
  // The page is night from the first frame (index.html), the same night the map prints on.
  const early = await S(page, async () => {
    const html = await (await fetch('index.html')).text();
    const m = html.match(/plates = \{ manor: '(#[0-9A-Fa-f]{6})'/);
    return [m && m[1], window.__squares.world.map.plate.paper];
  });
  check("index.html paints the page in the Manor's plate before it draws", early[0] === early[1], JSON.stringify(early));
  const floors = () => page.$$eval('#floors .lift-floor', (bs) => bs.map((b) => b.textContent));
  const lit = () => page.$$eval('#floors .lift-floor[aria-current]', (bs) => bs.map((b) => b.textContent).join());
  check('a house has a lift with every floor, top to bottom, the one you are on lit',
    (await floors()).join() === 'Upstairs,Ground,Cellar' && (await lit()) === 'Ground', JSON.stringify([await floors(), await lit()]));
  check('a first visit invites you in before your first find', await page.isVisible('#invite') &&
    (await page.textContent('#invite-title')) === (await S(page, () => window.__squares.world.map.words.invite)));
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
  // Settled in a room, its floor and walls, and its still furniture, draw from caches.
  await page.waitForFunction(() => { const z = window.__squares.play.focus; return z && z.chunks[0].bd && z.chunks[0].stills; }, null, { timeout: 15000 }).catch(() => {});
  const cached = await S(page, () => { const c = window.__squares.play.focus?.chunks[0]; return { bd: !!(c && c.bd), stills: c && c.stills ? c.stills.spots.filter(Boolean).length : 0 }; });
  check('settled in a room, its floor, walls and still furniture are cached', cached.bd && cached.stills > 5, JSON.stringify(cached));

  check('in a room, the lift steps out', !(await page.isVisible('#floors')));
  await page.click('#to-places');
  await wait(page, 1800);
  check('back from a room goes out to the whole house', (await S(page, () => location.hash)) === '#/manor');
  await page.click('#floors [data-storey="up"]');
  await wait(page, 1800);
  v = await lifted();
  check('the lift goes up a floor, and lights it', v['guest-rooms'] < 0.05 && (await lit()) === 'Upstairs', JSON.stringify(v));
  await page.click('#floors [data-storey="cellar"]');
  await wait(page, 1800);
  v = await lifted();
  check('and straight down to the cellar, lifting everything above', v['grand-hall'] > 0.9 && v['guest-rooms'] > 0.9 && v.cellar === 0 && v.grounds === 0 &&
    (await lit()) === 'Cellar', JSON.stringify(v));
  check("a whodunit's goose never honks from its room", (await S(page, () => window.__squares.play.debug.calls)) === 0);

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

  // ---------- 4. A whodunit: evidence, the case file, accusing, the reveal ----------
  await page.click('#floors [data-storey="ground"]');
  await wait(page, 1200);
  check('a whodunit shows a Case button instead of the things tally',
    await page.isVisible('#tally-case') && !(await page.isVisible('#tally-things-pill')) && (await page.textContent('#tally-case-count')) === '0/17');
  await S(page, () => window.__squares.play.enterZone('library', { dur: 0.01 }));
  await wait(page, 900);
  check('the find list marks evidence', (await page.$$('#tray .find-mark.is-evidence')).length >= 3);
  const [ex, ey] = await findOnScreen(page, 'library', 'lipstick-glass');
  await S(page, () => { document.getElementById('story').hidden = true; });
  await page.mouse.click(ex, ey);
  await wait(page, 400);
  check('tapping evidence counts it on the Case button', (await page.textContent('#tally-case-count')) === '1/17');
  check('your first evidence says what the Case button is for', (await page.textContent('#toast')).includes('Tap Case'));
  await page.click('#to-places');
  await wait(page, 1600);
  check('after your first find, the invitation steps out', (await S(page, () => document.body.dataset.mode)) === 'overview' && !(await page.isVisible('#invite')));

  await page.click('#tally-case');
  await wait(page, 700);
  const cards = await page.$$eval('.suspect', (bs) => bs.map((b) => b.querySelector('.suspect-name').textContent));
  check('the case file lists the suspects, the culprit as a mystery', cards.length === 7 && cards.includes('Someone else?') && !cards.includes('The goose'), cards.join(', '));
  const speak = async () => { for (let i = 0; i < 12 && !(await page.isVisible('.scene-end')); i++) { await page.click('.lines'); await wait(page, 120); } };
  await page.click('.suspect >> text=Jenkins');
  await wait(page, 500);
  await page.click('.case-accuse');
  await speak();
  check('a wrong accusation plays their alibi and clears them', await page.isVisible('.scene-end .stamp.is-cleared') &&
    (await S(page, () => JSON.parse(localStorage.getItem('squares.save.v3')).cases.manor.accused)).includes('jenkins'));
  await page.click('.scene-end .big-btn');
  await wait(page, 500);
  await page.click('.suspect >> text=Someone else?');
  await wait(page, 500);
  await page.click('.case-accuse');
  await speak();
  check("the culprit can't be named without the clues", (await page.$$('.scene-end .stamp')).length === 0 && !(await S(page, () => JSON.parse(localStorage.getItem('squares.save.v3')).cases.manor.solved)));
  await page.click('.scene-end .big-btn');
  await wait(page, 400);
  await S(page, () => {
    const s = window.__squares, w = s.world;
    for (const key of ['library:feathers', 'library:pill-bottle', 'kitchen:footprints', 'taxidermy-room:order-form', 'taxidermy-room:empty-stand', 'master-bedroom:diary']) {
      const [zid, fid] = key.split(':');
      const z = w.zones.find((x) => x.id === zid);
      s.play.markFound(z, z.finds.find((f) => f.id === fid));
    }
  });
  await wait(page, 600);
  check('with every clue found, the mystery suspect is the goose', (await page.$$eval('.suspect-name', (n) => n.map((x) => x.textContent))).includes('The goose'));
  await page.click('.suspect >> text=The goose');
  await wait(page, 500);
  await page.click('.case-accuse');
  await speak();
  check('naming the goose ends in a guilty stamp', await page.isVisible('.scene-end .stamp.is-guilty'));
  await page.click('.scene-end .big-btn');
  await wait(page, 3600);
  check('the reveal cuts to the dining room and closes the case',
    (await S(page, () => location.hash)) === '#/manor/dining-room' && await page.isVisible('#complete') &&
    (await page.textContent('.complete-kicker')) === 'Case closed' &&
    (await S(page, () => JSON.parse(localStorage.getItem('squares.save.v3')).cases.manor.solved)) === true);
  await page.reload();
  await ready(page);
  await wait(page, 800);
  check('a solved case stays solved', (await page.textContent('#tally-case-count')) === 'Solved' &&
    (await S(page, async () => (await import('/src/maps/manor/style.js')).verdict.solved)) === 0);

  // The Manor was the last place played: the title drifts it behind, so the
  // page is printed on its night from the start, and the title's words in the light ink.
  await page.goto(base + '#/');
  await page.reload();
  const firstPlate = await S(page, () => document.documentElement.dataset.plate);
  await ready(page);
  await wait(page, 600);
  const title = await S(page, () => ({ map: window.__squares.world.id, ink: getComputedStyle(document.getElementById('title-tagline')).color }));
  check('after the Manor, the title is printed on its night, in the light ink', firstPlate === 'night' && title.map === 'manor' && title.ink === 'rgb(251, 246, 234)',
    JSON.stringify({ firstPlate, ...title }));
  await page.close();
}

// ---------- 5. Areas of any shape (the Crossroads, a hidden test bed) ----------
{
  const page = await fresh({ width: 1400, height: 1000 }, () => localStorage.clear());
  await page.goto(base + '#/crossroads');
  await ready(page);
  await wait(page, 1200);
  const plan = await S(page, async () => {
    const { inFront } = await import('/src/engine/world.js');
    const w = window.__squares.world;
    const at = (id) => w.drawOrder.map((c, i) => (c.zone.id === id ? i : -1)).filter((i) => i >= 0);
    const street = at('street');
    return {
      pieces: street.length,
      rooms: ['north', 'east', 'west', 'south'].map((id) => at(id).length),
      behind: Math.max(...at('north')) < Math.min(...street),
      front: Math.min(...at('south')) > Math.max(...street),
      // (pieces of pavement beside the rooms can come before them; the ones in front can't)
      pave: w.drawOrder.every((c, i) => c.zone.id !== 'pavement' || !inFront(w.zones.find((z) => z.id === 'south'), c) || i > Math.max(...at('south'))),
    };
  });
  check('a street of any shape is drawn in pieces, a room in one', plan.pieces === 6 && plan.rooms.every((n) => n === 1), JSON.stringify(plan));
  check('its pieces sort in behind the rooms at the back and before the room in front', plan.behind && plan.front && plan.pave, JSON.stringify(plan));
  // A tap on the street between the rooms lands on the street, and one in a room on the room.
  const tapAt = (x, y) => S(page, ([x, y]) => {
    const s = window.__squares, [X, Y] = [x - y, (x + y) / 2];
    return s.world.zones[s.world.zoneAt(X, Y)]?.id;
  }, [x, y]);
  check('taps find the street where it runs, and the rooms beside it', (await tapAt(19, 30)) === 'street' && (await tapAt(8, 19)) === 'street' &&
    (await tapAt(27, 27)) === 'south' && (await tapAt(8, 8)) === 'north' && (await tapAt(40, 20)) === 'pavement');
  const walk = await S(page, () => {
    const w = window.__squares.world, pat = w.walkers.find((k) => k.id === 'pat');
    const seen = [];
    for (let t = 0; t < 120; t += 0.5) {
      const p = pat.at(t), zs = w.zones.filter((z) => w.zoneAtPoint(p.x, p.y, p.z) === z);
      const id = zs[0]?.id || 'nowhere';
      if (seen[seen.length - 1] !== id) seen.push(id);
    }
    return seen.join(' > ');
  });
  check('someone walks out of one room, down the street and into another', walk.startsWith('north > street > south > street > north'), walk);
  await S(page, () => window.__squares.play.enterZone('street', { dur: 0.01 }));
  await wait(page, 1500);
  const cached = await S(page, () => window.__squares.play.focus.chunks.map((c) => !!(c.bd && c.stills)));
  check('on the street, every piece of it is cached', cached.length === 6 && cached.every(Boolean), JSON.stringify(cached));
  await S(page, () => { document.getElementById('story').hidden = true; });
  const [gx, gy] = await findOnScreen(page, 'street', 'goose');
  await page.mouse.click(gx, gy);
  await wait(page, 400);
  check('the goose walking the street can be found wherever it is', await S(page, () => window.__squares.store.isFound('crossroads', 'street:goose')));
  await page.close();
}

check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
await server.close();
console.log(failed ? `\n${failed} failed` : '\nAll good');
process.exit(failed ? 1 : 0);
