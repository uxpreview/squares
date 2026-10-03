// Smoke test: clicks through the game the way a player would and checks that
// each step worked. Run it after any change to the engine, the screens or the
// save format:
//
//   npm run smoke
//
// Prints PASS / FAIL per step and exits non-zero if anything failed.
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const server = await createServer({ root, logLevel: 'error', server: { port: 0, hmr: false } });
await server.listen();
const base = `http://localhost:${server.httpServer.address().port}/`;
const browser = await chromium.launch();

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

// The things tally (it lives on the find list now): "found/total" for the place.
const things = (page) => S(page, () => { const s = window.__squares, p = s.store.progress(s.world); return `${p.things}/${s.world.totalThings}`; });

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
  check('tallies count the old save, on the Block Party', (await page.textContent('#tally-geese')) === '1/16' && (await things(page)) === '1/60');

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
  check('tapping a hidden thing circles it', (await things(page)) === '2/60');

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

  // Touch: a pinch zooms; a finger whose lift was never reported doesn't
  // turn the next drag into a pinch (the map got stuck on a phone).
  const touch = (type, id, x, y, primary) => S(page, ([type, id, x, y, primary]) => {
    document.getElementById('map').dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, isPrimary: primary, pointerType: 'touch', bubbles: true }));
  }, [type, id, x, y, primary]);
  const camNow = () => S(page, () => ({ ...window.__squares.cam }));
  let c0 = await camNow();
  await touch('pointerdown', 11, 500, 300, true);
  await touch('pointerdown', 12, 700, 300, false);
  await touch('pointermove', 12, 800, 300, false);
  await touch('pointerup', 12, 800, 300, false);
  await touch('pointerup', 11, 500, 300, true);
  let c1 = await camNow();
  check('a pinch zooms the map', c1.z > c0.z * 1.05, `${c0.z.toFixed(2)} to ${c1.z.toFixed(2)}`);
  await touch('pointerdown', 21, 400, 300, true); // its lift never comes
  await touch('pointerdown', 22, 600, 400, true); // a new touch, on its own
  await touch('pointermove', 22, 520, 400, true);
  await touch('pointermove', 22, 440, 400, true);
  await touch('pointerup', 22, 440, 400, true);
  const c2 = await camNow();
  check("a lost finger doesn't turn the next drag into a pinch", Math.abs(c2.z - c1.z) < 1e-6 && Math.abs(c2.x - c1.x) > 0.5, `zoom ${c1.z.toFixed(2)} to ${c2.z.toFixed(2)}, moved ${(c2.x - c1.x).toFixed(2)}`);
  check('a pinch on the page never zooms the page', await S(page, () => getComputedStyle(document.body).touchAction.includes('pan')));
  await wait(page, 600);

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

  const saved = await S(page, () => JSON.parse(localStorage.getItem('squares.save.v4')));
  check('progress saved in the v4 format', saved && saved.v === 4 && saved.found.block.includes('laundromat:coin') && saved.hints && saved.finished);

  await page.click('.title .sound-btn');
  check('sound toggle remembers', (await S(page, () => JSON.parse(localStorage.getItem('squares.save.v4')).settings.sound)) === false);
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

// ---------- 1c. A returning v3 player with Block finds, and finds from the Block Party's preview ----------
// The Block Party took over the Block's id: the old finds keep their names, and
// anything found at #/blockparty before it shipped joins them.
{
  const page = await fresh({ width: 1400, height: 1000 }, () => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.clear();
      localStorage.setItem('squares.save.v3', JSON.stringify({ v: 3, found: { block: ['pool:goose', 'aquarium:octopus'], blockparty: ['bakery:goose', 'main-street:lunch', 'pool:goose'] },
        cases: {}, settings: { sound: false }, last: { map: 'blockparty', zone: 'bakery' } }));
      sessionStorage.setItem('seeded', '1');
    }
  });
  await page.goto(base);
  await ready(page);
  await wait(page, 400);
  const title = await S(page, () => ({ map: window.__squares.world.id, found: window.__squares.store.progress(window.__squares.world) }));
  check('a v3 save keeps its Block finds, and the preview\'s join them', (await page.textContent('#title-progress')).includes('2 geese') &&
    (await page.textContent('#title-play-label')) === 'Continue' && title.map === 'block', JSON.stringify(title));
  await page.click('#title-play');
  await wait(page, 2000);
  check('continue lands where the preview was left, on the Block Party', (await S(page, () => location.hash)) === '#/block/bakery' &&
    (await page.textContent('#tally-geese')) === '2/16' && (await things(page)) === '2/60');
  await page.goto(base + '#/blockparty/pool');
  await ready(page);
  await wait(page, 1200);
  check('the preview\'s address goes to the Block Party', (await S(page, () => location.hash)) === '#/block/pool');
  const saved = await S(page, () => JSON.parse(localStorage.getItem('squares.save.v4')));
  check('the merged save is written under block, once', !saved.found.blockparty && saved.found.block.length === 4, JSON.stringify(saved.found));
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
  // (On a phone the list tucks away with a swipe down its head.)
  const head = await page.$eval('.tray-head', (el) => { const r = el.getBoundingClientRect(); return [r.x + 40, r.y + 20]; });
  await page.mouse.move(head[0], head[1]);
  await page.mouse.down();
  await page.mouse.move(head[0], head[1] + 60, { steps: 4 });
  await page.mouse.up();
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

  // Find everything in the building.
  await S(page, () => {
    const s = window.__squares;
    for (const z of s.world.zones) for (const f of z.finds) s.play.markFound(z, f);
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

  // A first visit: a card pinned to a room says where to start, with a ring on
  // the room (on a phone, the Observatory, by the back corner).
  check('a first visit invites you into a room', await page.isVisible('#invite') && await page.isVisible('#invite-ring'));
  const ring = await S(page, () => {
    const s = window.__squares, r = document.getElementById('invite-ring').getBoundingClientRect();
    const [X, Y] = s.camera.toWorld(r.x + r.width / 2, r.y + r.height / 2);
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, zone: s.world.zones[s.world.zoneAt(X, Y)]?.id };
  });
  check('its ring is on screen, on the room it names', ring.x > 0 && ring.x < 390 && ring.y > 0 && ring.y < 844 && ring.zone === 'observatory', JSON.stringify(ring));
  await page.click('#invite');
  await wait(page, 1800);
  check('tapping the invitation steps into its room', (await S(page, () => location.hash)) === '#/block/observatory');
  // The first verb: sit a few seconds without tapping and something that
  // answers back gets a tap ripple; tap it and the ripple's gone.
  const taught = await page.waitForFunction(() => window.__squares.play.teaching(), null, { timeout: 8000 }).then((h) => h.jsonValue(), () => null);
  const teachable = await S(page, (id) => { const z = window.__squares.world.zones.find((q) => q.id === 'observatory'); const pk = z.pokes.find((q) => q.id === id); return !!pk && !pk.decoy && !z.finds.some((f) => f.inside === pk); }, taught);
  check('a new player is nudged to tap something that answers back', !!taught && teachable, String(taught));
  await S(page, (id) => window.__squares.play.poke('observatory', id), taught);
  check('the nudge goes once they poke something', (await S(page, () => window.__squares.play.teaching())) === null);
  await page.click('#to-places');
  await wait(page, 1800);
  check('once you have been in a room, the invitation is gone', !(await page.isVisible('#invite')) && (await S(page, () => location.hash)) === '#/block');
  // Rooms that still hide a goose honk now and then.
  const honked = await page.waitForFunction(() => window.__squares.play.debug.calls > 0, null, { timeout: 9000 }).then(() => true, () => false);
  check('on the whole map, rooms still hiding a goose honk', honked);

  // On a phone the map fills the screen: the block runs off the sides, a swipe away.
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
  // Every goose isn't the end: a place finishes at every goose and most of its things.
  await S(page, () => {
    const s = window.__squares;
    for (const z of s.world.zones) { const g = z.finds.find((f) => f.goose); if (g) s.play.markFound(z, g); }
  });
  await wait(page, 2600);
  check('every goose but too few things: not finished yet, and it says how many to go', !(await page.isVisible('#complete')) &&
    /more things? to finish/.test(await page.textContent('#toast')), await page.textContent('#toast'));
  // Most of the things (rules.js), short of all of them, finishes it.
  const most = await S(page, () => {
    const s = window.__squares, w = s.world;
    let n = s.store.progress(w).things;
    for (const z of w.zones) for (const f of z.finds) if (!f.goose && n < w.need && !s.store.isFound(w.id, z.id + ':' + f.id)) { s.play.markFound(z, f); n++; }
    const p = s.store.progress(w);
    return { things: p.things, need: w.need, total: w.totalThings, done: p.done, all: p.all };
  });
  check('most of the things (not all) finishes the place', most.done && !most.all && most.things === most.need && most.need < most.total, JSON.stringify(most));
  // (The party plays for a while before the card: the finale.)
  await page.waitForSelector('#complete:not([hidden])', { timeout: 20000 }).catch(() => {});
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
  check('a whodunit shows a Case button instead of the geese tally',
    await page.isVisible('#tally-case') && !(await page.isVisible('#tally-geese-pill')) && (await page.textContent('#tally-case-count')) === '0/17');
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
    (await S(page, () => JSON.parse(localStorage.getItem('squares.save.v4')).cases.manor.accused)).includes('jenkins'));
  await page.click('.scene-end .big-btn');
  await wait(page, 500);
  await page.click('.suspect >> text=Someone else?');
  await wait(page, 500);
  await page.click('.case-accuse');
  await speak();
  check("the culprit can't be named without the clues", (await page.$$('.scene-end .stamp')).length === 0 && !(await S(page, () => JSON.parse(localStorage.getItem('squares.save.v4')).cases.manor.solved)));
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
    (await S(page, () => JSON.parse(localStorage.getItem('squares.save.v4')).cases.manor.solved)) === true);
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
  // (A long area is framed around a spot: here, where the goose is walking.)
  await S(page, () => {
    const s = window.__squares, z = s.world.zones.find((x) => x.id === 'street'), g = z.finds.find((f) => f.goose).at(s.clock.now() + 1.5);
    s.play.enterZone('street', { dur: 0.01, near: [g[0], g[1]] });
  });
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

// ---------- 6. The Block Party (the Block, connected: streets, walls down, a day) ----------
{
  const page = await fresh({ width: 390, height: 844 }, () => localStorage.clear());
  await page.goto(base + '#/block');
  await ready(page);
  await wait(page, 1200);
  const walls = await S(page, () => {
    const w = window.__squares.world, h = (id, side) => Math.round(w.wallHeight(w.zones.find((z) => z.id === id), side) * 10) / 10;
    return { laundromat: h('laundromat', 'left'), observatory: [h('observatory', 'left'), h('observatory', 'right')], pool: h('pool', 'left') };
  });
  // On a phone the invitation pins by the back corner (on the Observatory),
  // clear of the stage, and under the place's name.
  const inv = await S(page, () => {
    const s = window.__squares, r = document.getElementById('invite-ring').getBoundingClientRect();
    const card = document.getElementById('invite').getBoundingClientRect(), name = document.getElementById('place').getBoundingClientRect();
    const [X, Y] = s.camera.toWorld(r.x + r.width / 2, r.y + r.height / 2);
    return { zone: s.world.zones[s.world.zoneAt(X, Y)]?.id, cardTop: Math.round(card.top), nameBottom: Math.round(name.bottom), ringY: Math.round(r.y) };
  });
  check('on a phone, the invitation pins by the back corner, clear of the name', inv.zone === 'observatory' && inv.cardTop >= inv.nameBottom && inv.ringY < 844, JSON.stringify(inv));
  check('on the connected block, walls facing a street drop; the outside ones and fences stay',
    walls.laundromat === 1.2 && walls.observatory[0] === 6 && walls.observatory[1] === 6 && walls.pool === 1, JSON.stringify(walls));
  // Tap Main Street far from the stage: it's framed around the tap, about as close as a room.
  const spot = [40.5, 70];
  const [sx, sy] = await S(page, ([x, y]) => window.__squares.camera.toScreen(x - y, (x + y) / 2), spot);
  await page.mouse.click(sx, sy);
  await wait(page, 1900);
  const framed = await S(page, ([x, y]) => {
    const s = window.__squares, [cx, cy] = s.camera.toScreen(x - y, (x + y) / 2);
    const room = s.camera.fit(s.world.zoneBox(s.world.zones.find((z) => z.id === 'bakery')), { top: 72, bottom: 190, left: 16, right: 16 }, 0.5).z;
    return { hash: location.hash, z: s.cam.z / room, cx: Math.round(cx), cy: Math.round(cy) };
  }, spot);
  check('a long street is framed around where you tapped it, about as close as a room',
    framed.hash === '#/block/main-street' && framed.z > 0.6 && framed.z < 1.6 && framed.cx > 0 && framed.cx < 390 && framed.cy > 60 && framed.cy < 700, JSON.stringify(framed));
  // The day: noon on paper, night on navy, and the page follows.
  const plate = async (h) => {
    await S(page, (t) => window.__squares.clock.set(t), (h - 5) * 15);
    await wait(page, 700);
    return S(page, () => ({ kind: document.documentElement.dataset.plate, paper: getComputedStyle(document.documentElement).getPropertyValue('--plate').trim() }));
  };
  const noon = await plate(12), night = await plate(23);
  check('the day changes the plate: paper at noon, night after dark', noon.kind === '' && night.kind === 'night' && noon.paper !== night.paper, JSON.stringify({ noon, night }));
  const people = await S(page, () => {
    const w = window.__squares.world, c = w.walkers.find((k) => k.id === 'courier'), doors = new Set();
    for (let t = 0; t < 360; t += 0.5) {
      const p = c.at(t);
      if (!p.moving) for (const d of w.doors) if (Math.hypot(p.x - (d.axis === 'x' ? d.plane : d.x), p.y - (d.axis === 'x' ? d.y : d.plane)) < 2.7) doors.add(d.zone);
    }
    return doors.size;
  });
  check('the Courier knocks on every door on the block', people === 15, people + ' doors');
  // The ending: finishing the place (every goose and most things) starts the
  // party (the clock jumps to it) and the geese conga down Main Street.
  await S(page, () => { const s = window.__squares; s.clock.set(30); for (const z of s.world.zones) for (const f of z.finds) s.play.markFound(z, f); });
  await wait(page, 2600);
  const party = await S(page, () => { const s = window.__squares, h = (5 + (s.clock.now() % 360) / 15) % 24; return { h: Math.round(h * 10) / 10, parade: s.play.fx(performance.now()).parade > 0 }; });
  check('finishing the place starts the party: the clock jumps to it and the geese conga', party.h >= 19.5 && party.h < 21 && party.parade, JSON.stringify(party));
  await page.close();
}

// ---------- 6b. The Block Party's invitation on a big screen ----------
// Pinned beside the stage, over Main Street's back arm, with its ring on the
// stage and the BLOCK PARTY backdrop left in view.
{
  const page = await fresh({ width: 1440, height: 900 }, () => localStorage.clear());
  await page.goto(base + '#/block');
  await ready(page);
  await wait(page, 1600);
  const inv = await S(page, () => {
    const s = window.__squares, r = document.getElementById('invite-ring').getBoundingClientRect(), c = document.getElementById('invite').getBoundingClientRect();
    const [X, Y] = s.camera.toWorld(r.x + r.width / 2, r.y + r.height / 2);
    // The middle of the backdrop's lettering: the stage's back corner, 5 up.
    const [bx, by] = s.camera.toScreen(0, 37.4 - 5 * 1.12);
    return { zone: s.world.zones[s.world.zoneAt(X, Y)]?.id, clear: bx < c.left || bx > c.right || by < c.top || by > c.bottom };
  });
  check('on a big screen the invitation sits beside the stage, its ring on it, the backdrop in view', inv.zone === 'main-street' && inv.clear, JSON.stringify(inv));
  await page.close();
}

// ---------- 7. Ground and water (Plum Island) ----------
// Terrain (engine/terrain.js), the tide on the clock, finds that only show at
// low tide, the dial that skips ahead, and the king tide at the end.
{
  const page = await fresh({ width: 1400, height: 1000 }, () => localStorage.clear());
  // Opened from the picker while another place idles behind it: it sits still,
  // framed on itself (the title's drift used to carry on round the old one).
  await page.goto(base + '#/maps');
  await ready(page);
  await wait(page, 800);
  await S(page, () => { location.hash = '#/plum'; });
  await page.waitForFunction(() => window.__squares.world && window.__squares.world.id === 'plum', null, { timeout: 20000 });
  await wait(page, 1500);
  check('a place opened from the picker stands still, framed on itself', await S(page, () => !window.__squares.camera.drifting));
  const ground = await S(page, async () => {
    const { land } = await import('/src/maps/plum/land.js');
    const { level, at } = await import('/src/maps/plum/tide.js');
    const s = window.__squares, w = s.world;
    // Where a tap on a point of the ground lands: the area standing there.
    const tap = (x, y) => { const z = land.h(x, y); return w.zones[w.zoneAt(x - y, (x + y) / 2 - z * 1.12)]?.id; };
    return {
      dune: land.h(20, 39.8), beach: land.h(20, 46.5), sea: land.h(20, 57),
      taps: [tap(20, 36), tap(20, 14), tap(58, 40), tap(82, 47), tap(56, 8), tap(104, 31)],
      flat: [land.h(12.4, 22.2) > level(at(12)), land.h(12.4, 22.2) > level(312)],
    };
  });
  check('the ground has height: dunes over the beach over the sea bed', ground.dune > 2 && ground.beach < 0.5 && ground.sea < -2, JSON.stringify(ground));
  check('taps land on the area whose ground they hit', ground.taps.join() === 'refuge-dunes,sound,center,town-beach,turnpike,north-point', ground.taps.join());
  check('the tide uncovers the flats at noon and covers them at the king tide', ground.flat[0] && !ground.flat[1], JSON.stringify(ground.flat));
  // A low-tide find: not there at high water (a tap finds nothing), there after the dial skips to low tide.
  await S(page, () => { const s = window.__squares; s.clock.set(262); s.play.enterZone('sound', { dur: 0.01, near: [12.4, 22.2] }); });
  await wait(page, 900);
  await S(page, () => { document.getElementById('story').hidden = true; });
  const note = await S(page, () => [...document.querySelectorAll('#tray .find-note')].map((n) => n.textContent));
  check('the list says when a tide-only find is there', note.includes('low tide') && note.includes('high tide'), note.join());
  let [bx, by] = await findOnScreen(page, 'sound', 'boot');
  await page.mouse.click(bx, by);
  await wait(page, 300);
  check('a low-tide find can\'t be found at high water', !(await S(page, () => window.__squares.store.isFound('plum', 'sound:boot'))));
  const before = await S(page, () => document.getElementById('dial-label').textContent);
  await page.click('#dial');
  await wait(page, 2600);
  const after = await S(page, async () => {
    const { hour } = await import('/src/maps/plum/tide.js');
    return { label: document.getElementById('dial-label').textContent, hour: hour(window.__squares.clock.now()), toast: document.getElementById('toast').textContent };
  });
  check('the dial skips ahead to the next turn of the tide', before !== after.label && after.label === 'Low tide' && Math.abs(after.hour - 12) < 0.3 && /Low tide/.test(after.toast), JSON.stringify({ before, ...after }));
  await S(page, () => window.__squares.play.enterZone('sound', { dur: 0.01, near: [12.4, 22.2] }));
  await wait(page, 900);
  [bx, by] = await findOnScreen(page, 'sound', 'boot');
  await page.mouse.click(bx, by);
  await wait(page, 300);
  check('and at low tide it\'s there to find', await S(page, () => window.__squares.store.isFound('plum', 'sound:boot')));
  // From low water the dial stops at sunset (the Pink House's window) before high tide.
  const dialTo = async () => {
    await page.click('#dial');
    await wait(page, 2600);
    return S(page, async () => {
      const { hour } = await import('/src/maps/plum/tide.js');
      return { hour: Math.round(hour(window.__squares.clock.now()) * 100) / 100, next: document.getElementById('dial-next').textContent };
    });
  };
  const dusk = await dialTo(), high = await dialTo();
  check('from low tide the dial stops at sunset, then high tide', Math.abs(dusk.hour - 19.83) < 0.3 && Math.abs(high.hour - 23) < 0.3 && /low tide/.test(high.next), JSON.stringify({ dusk, high }));
  const cached = await S(page, () => window.__squares.play.focus.chunks.map((c) => !!(c.bd && c.stills)));
  check('in an area with ground, every piece of it is cached', cached.length > 1 && cached.every(Boolean), JSON.stringify(cached));
  // The ending: the place finished, the clock jumps to the king tide, and the
  // Courier's van is out on the turnpike, under water to its wheels.
  await S(page, () => { const s = window.__squares; for (const z of s.world.zones) for (const f of z.finds) s.play.markFound(z, f); });
  await wait(page, 3200);
  const end = await S(page, async () => {
    const { level, hour } = await import('/src/maps/plum/tide.js');
    const s = window.__squares, t = s.clock.now(), van = s.world.walkers.find((k) => k.id === 'van').at(t);
    return { hour: Math.round(hour(t) * 10) / 10, under: level(t) > van.z, x: Math.round(van.x), y: Math.round(van.y), parade: s.play.fx(performance.now()).parade > 0 };
  });
  check('finishing the place brings in the king tide after midnight, with the Courier\'s van stuck in it', end.hour < 1 && end.under && end.parade && end.y > 12 && end.y < 19, JSON.stringify(end));
  await page.close();
}

// ---------- 7. Buildings you step into (Moving Day, E11) ----------
{
  const page = await fresh({ width: 1400, height: 1000 }, () => localStorage.clear());
  await page.goto(base + '#/southie');
  await ready(page);
  await wait(page, 1500);
  const houses = () => S(page, () => Object.fromEntries(window.__squares.world.zones.filter((z) => z.shelled).map((z) => [z.id, [Math.round(z.shellK * 100) / 100, Math.round(z.veil * 100) / 100]])));
  const shut = await houses();
  check('on the overview every house is closed', Object.values(shut).length === 9 && Object.values(shut).every(([k, v]) => k === 1 && v === 0), JSON.stringify(shut));
  // Zoomed in close on the Green House without stepping in, its first floor's
  // keys can't be tapped through its front; the tap opens the house instead.
  await S(page, () => { const s = window.__squares, z = s.world.zones.find((x) => x.id === 'green-1'); s.camera.jumpTo({ x: z.anchor[0] + 6, y: z.anchor[1] + 2, z: s.cam.z * 3.5 }); });
  await wait(page, 200);
  let [kx, ky] = await findOnScreen(page, 'green-1', 'keys');
  await page.mouse.click(kx, ky);
  await wait(page, 1600);
  check("a find inside a closed house can't be tapped through its front", !(await S(page, () => window.__squares.store.isFound('southie', 'green-1:keys'))));
  await page.goto(base + '#/southie');
  await ready(page);
  await wait(page, 1500);
  // A tap on the Yellow House's second-floor front opens that floor.
  const [fx, fy] = await S(page, () => {
    const s = window.__squares, z = s.world.zones.find((x) => x.id === 'yellow-2');
    const [x, y, h] = [12.5, 6.8, 2.2];
    return s.camera.toScreen(z.anchor[0] + (x - y), z.anchor[1] + (x + y) / 2 - h * 1.12);
  });
  await page.mouse.click(fx, fy);
  await wait(page, 2500);
  const inside = await S(page, () => window.__squares.play.focus?.id);
  const open = await houses();
  check("a tap on a closed house's second-floor front opens its second floor", inside === 'yellow-2', inside);
  check('its front is gone and only the floor above it, in that house, lifts', open['yellow-2'][0] === 0 && open['yellow-3'][1] === 1 &&
    open['yellow-1'][1] === 0 && open['green-3'][1] === 0 && open['grey-3'][1] === 0 && open['green-2'][0] === 1, JSON.stringify(open));
  // Out on the street, nothing lifts.
  await S(page, () => window.__squares.play.enterZone('farragut-road', { dur: 0.01 }));
  await wait(page, 2500);
  const street = await houses();
  // (The one you just left may still be closing.)
  check('out on the street, every house stays closed and nothing lifts', Object.values(street).every(([k, v]) => k > 0.9 && v < 0.1), JSON.stringify(street));
  const floors = await S(page, () => { const ids = window.__squares.world.drawOrder.map((c) => c.zone.id); return ['green', 'yellow', 'grey'].every((h) => ids.indexOf(h + '-1') < ids.indexOf(h + '-2') && ids.indexOf(h + '-2') < ids.indexOf(h + '-3')); });
  check('every house is drawn floor by floor, bottom up', floors);
  await page.close();
}

// ---------- All-You-Can-Eat: a whodunit on four decks (docs/levels/cruise.md) ----------
{
  const page = await fresh({ width: 1400, height: 1000 }, () => localStorage.clear());
  await page.goto(base + '#/cruise');
  await page.waitForFunction(() => window.__squares.world && window.__squares.world.id === 'cruise', null, { timeout: 20000 });
  await wait(page, 1200);
  const ship = await S(page, () => {
    const w = window.__squares.world;
    return { storeys: w.storeys.length, on: window.__squares.play.storey && window.__squares.play.storey.id, goal: w.goal, evidence: w.totals.evidence, dial: document.getElementById('dial-label').textContent };
  });
  check('the cruise ship opens on the Promenade, four decks, a case with 17 pieces of evidence, the ship\'s clock on the dial',
    ship.storeys === 4 && ship.on === 'promenade' && ship.goal === 'case' && ship.evidence === 17 && /AM|PM/.test(ship.dial), JSON.stringify(ship));
  await S(page, () => window.__squares.play.setStorey('sun'));
  await wait(page, 600);
  check('the lift takes it to the Sun Deck', (await S(page, () => window.__squares.play.storey.id)) === 'sun');
  await page.close();
}
{
  // On a phone the lift and the dial both want the bottom corner.
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    const page = await fresh(viewport, () => localStorage.clear());
    await page.goto(base + '#/cruise');
    await page.waitForFunction(() => window.__squares.world && window.__squares.world.id === 'cruise', null, { timeout: 20000 });
    await wait(page, 1200);
    const r = await S(page, () => ['dial', 'floors'].map((id) => document.getElementById(id).getBoundingClientRect()).map((b) => [b.left, b.top, b.right, b.bottom]));
    const [d, l] = r, apart = d[2] <= l[0] || l[2] <= d[0] || d[3] <= l[1] || l[3] <= d[1];
    check(`on a ${viewport.width} x ${viewport.height} phone the ship's clock and its lift don't overlap`, apart && d[2] > d[0], JSON.stringify(r));
    await page.close();
  }
}

// ---------- 6. The rules of finding: pokes, decoys, earned hints (phone) ----------
{
  const page = await fresh({ width: 390, height: 844 }, () => localStorage.clear());
  await page.goto(base + '#/block/laundromat');
  await ready(page);
  await wait(page, 1600);
  await S(page, () => { document.getElementById('story').hidden = true; });
  const tapAt = async (zoneId, kind, id, dz = 0) => {
    const [x, y] = await S(page, ([z, kind, id, dz]) => {
      const s = window.__squares, zone = s.world.zones.find((q) => q.id === z);
      const o = (kind === 'find' ? zone.finds : zone.pokes).find((q) => q.id === id);
      const [a, b, h] = typeof o.at === 'function' ? o.at(performance.now() / 1000) : o.at;
      return s.camera.toScreen(zone.anchor[0] + (a - b), zone.anchor[1] + (a + b) / 2 - (h + dz) * 1.12);
    }, [zoneId, kind, id, dz]);
    await page.mouse.click(x, y);
    await wait(page, 380);
  };
  const isFound = (key) => S(page, (k) => window.__squares.store.isFound('block', k), key);
  // The goose is under the laundry: tapping where it is opens the heap, it isn't found yet.
  await tapAt('laundromat', 'find', 'goose');
  check('a find inside something can\'t be tapped until it opens; the tap opens it',
    !(await isFound('laundromat:goose')) && (await S(page, () => window.__squares.world.zones.find((z) => z.id === 'laundromat').pokes.find((p) => p.id === 'heap').open)));
  await tapAt('laundromat', 'find', 'goose');
  check('open, the find inside is there to tap', await isFound('laundromat:goose'));
  // A decoy answers back and counts as nothing.
  const before = await S(page, () => window.__squares.store.progress(window.__squares.world).things);
  await S(page, () => window.__squares.play.poke('laundromat', 'float'));
  const dec = await S(page, () => ({ n: window.__squares.play.debug.decoys, things: window.__squares.store.progress(window.__squares.world).things }));
  check('a decoy answers back, and finds nothing', dec.n === 1 && dec.things === before, JSON.stringify(dec));
  // Hints: three to start, a line first (it costs one), then a ring (free).
  const left = () => S(page, () => window.__squares.store.progress(window.__squares.world).hints);
  check('a place starts with three hints', (await left()) === 3 && (await page.textContent('#tally-hints')) === '3');
  await page.click('#tray-hint');
  await wait(page, 200);
  check('Hint with nothing picked asks you to pick', (await page.textContent('#toast')).includes('Pick something') && (await left()) === 3);
  await page.click('#tray-chips .chip >> text=A teddy bear');
  await page.click('#tray-hint');
  await wait(page, 300);
  check('the first step of a hint is its line, on the list, for one hint', (await left()) === 2 && await page.isVisible('#tray-note') &&
    (await page.textContent('#tray-note-text')).includes('teddy'), await page.textContent('#tray-note-text'));
  await page.click('#tray-note-btn');
  await wait(page, 200);
  check('the second step rings it, free', (await left()) === 2 && (await S(page, () => JSON.parse(localStorage.getItem('squares.save.v4')).hints.block.on['laundromat:teddy'])) === 2);
  // Spend the rest, and find things to earn another.
  await S(page, () => { window.__squares.play.hint('laundromat', 'cat'); window.__squares.play.hint('laundromat', 'sock'); });
  check('hints run out', (await left()) === 0 && (await page.textContent('#tally-hints')) === '0');
  await S(page, () => window.__squares.play.hint('laundromat', 'coin'));
  check('with none left, a hint says how to earn one', /No hints left/.test(await page.textContent('#toast')) && (await left()) === 0);
  await S(page, () => {
    const s = window.__squares, z = s.world.zones.find((q) => q.id === 'laundromat');
    for (const id of ['cat', 'sock']) s.play.markFound(z, z.finds.find((f) => f.id === id));
  });
  check('every three finds earns a hint', (await left()) === 1 && (await page.textContent('#toast')).includes('hint earned'), await page.textContent('#toast'));
  await page.close();
}

check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
await server.close();
console.log(failed ? `\n${failed} failed` : '\nAll good');
process.exit(failed ? 1 : 0);
