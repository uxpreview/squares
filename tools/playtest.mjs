// A blind playtest, from screenshots only (docs/PROCESS.md, step 7).
//
//   node tools/playtest.mjs <level> prepare
//       Takes a clean shot of every area as a player sees it (no rings, no
//       list open) into qa-out/<level>/playtest/, with labels.json: the find
//       labels per area, and nothing about where they are. A whodunit also
//       gets case/: the case file as a player meets it (the suspects, one
//       suspect up close, a wrong accusation, the mystery suspect half-way,
//       and the reveal), for the second part of the test. A trail gets trail/:
//       a sighting found, the log, the ending and the card. Each area is shot
//       with the trail held at its own sighting, as a player on it sees it.
//
//       A place with finds that are only there some of the time (the tide)
//       starts at its QA moment (map.qa.at), and each find says when it's
//       there ("low tide"). If it has a dial, the tool taps it once, as a
//       player would, and shoots the areas with such finds again (<key>-dial);
//       a find the dial can't reach (sunset) gets a shot later on
//       (<key>-later). The whole place is shot before and after the tap too
//       (place.png, place-dial.png), for questions about the dial.
//
//       Shots are a phone's (390 x 844, at 3x) at each area's own framing,
//       the way most players meet it; --desktop takes them on a laptop's
//       screen. (check needs the same flag as prepare.)
//       A hard find's riddle goes in labels.json with its label, as the list
//       shows it.
//
//   node tools/playtest.mjs <level> check <guesses.json>
//       Scores a playtester's guesses. guesses.json:
//         { "<area id>": { "<label>": [x, y] or null, ... }, ...,
//           "ratings": { "<area id>": { "<label>": 1..5, ... }, ... } }
//       x, y are pixels in that area's shot (the .png as saved); null means
//       "couldn't find it". The goose can take two guesses, [[x, y], [x, y]]:
//       the second counts only if the first landed on a lookalike (a decoy
//       answers back, so a player would keep looking). A guess counts if it lands within the find's tap
//       area, or, for a find inside something that opens on a tap (a poke),
//       on that thing. Each find is scored against its kind's band (the
//       spread, rules.js): spot 1 to 3, poke 2 to 4, hard 3 to 5, from the
//       tester's rating (a miss counts as 5). Off its band, either way, gets
//       fixed. Prints a table and writes score.md next to the shots.
//
// The playtester reads labels.json and looks at the shots; it never needs the
// code. Where the finds really are is kept in answers.json: don't give it to them.
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const [level, mode, guessFile] = process.argv.slice(2);
const dir = path.join(root, 'qa-out', level || '', 'playtest');
const DESKTOP = process.argv.includes('--desktop');
// Pixels in the .png per CSS pixel: a phone's screen is 3x (an iPhone's), a laptop's 2x.
const SCALE = DESKTOP ? 2 : 3;
const VIEW = DESKTOP ? { width: 1400, height: 1000 } : { width: 390, height: 844 };
// How hard each kind of find should feel, 1 (jumped out) to 5 (never found).
const BANDS = { spot: [1, 3], poke: [2, 4], hard: [3, 5] };

if (!level || !['prepare', 'check'].includes(mode)) {
  console.log('Usage: node tools/playtest.mjs <level> prepare\n       node tools/playtest.mjs <level> check <guesses.json>');
  process.exit(1);
}

if (mode === 'prepare') {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const server = await createServer({ root, logLevel: 'error', server: { port: 0, hmr: false } });
  await server.listen();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: SCALE, ...(DESKTOP ? {} : { isMobile: true, hasTouch: true }) });
  // The list tucked away, as a player hunting would have it.
  await ctx.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('squares.tray.v1', 'hidden'); } catch {} });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${server.httpServer.address().port}/#/${level}`);
  await page.waitForFunction(() => window.__squares && window.__squares.world, null, { timeout: 30000 });
  await page.waitForTimeout(800);
  // Start at the place's QA moment, if it has one (a tide's low water).
  const start = await page.evaluate(() => {
    const s = window.__squares, q = s.world.map.qa;
    if (q && q.at != null) s.clock.set(q.at);
    return s.clock.now();
  });
  const zones = await page.evaluate(() => {
    const w = window.__squares.world;
    return w.order.map((i) => ({ id: w.zones[i].id, name: w.zones[i].name, long: w.long(w.zones[i]), finds: w.zones[i].finds.map((f) => f.id), windowed: w.zones[i].finds.filter((f) => f.when).map((f) => f.id) }));
  });
  const labels = {}, answers = {};
  // One shot of an area, framed as a player would (a long area, a street,
  // around a spot on it), with the finds that are on screen in it.
  // only: shoot just these finds (the ones a dial or a later moment brings
  // back); extra: more to say about the shot in labels.json.
  const shoot = async (z, key, near, skip, only = null, extra = {}) => {
    await page.evaluate(({ id, near }) => {
      const s = window.__squares, zone = s.world.zones.find((x) => x.id === id);
      // A trail's sighting shows only while it's the one a player is on: hold
      // the trail at this area's, as if the ones before were found.
      const sighting = zone.finds.find((x) => x.step != null);
      if (s.world.goal === 'trail') s.play.trailTo(sighting ? sighting.step : null);
      const f = near && zone.finds.find((x) => x.id === near);
      const at = f && (typeof f.at === 'function' ? f.at(s.clock.now()) : f.at);
      s.play.enterZone(id, { dur: 0.01, near: at ? [zone.ox + at[0], zone.oy + at[1]] : null });
    }, { id: z.id, near });
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
    // Freeze the moment: stop the clock, note where everything is, then take
    // the shot (a headless browser can take a second or more to paint, and a
    // find that moves, like a book on a cart, would have moved on).
    const found = await page.evaluate(({ id, skip, only }) => {
      const s = window.__squares;
      const st = document.getElementById('story');
      if (st) st.hidden = true;
      const zone = s.world.zones.find((x) => x.id === id);
      const t = s.clock.now();
      s.clock.freeze(t);
      const dial = document.getElementById('dial');
      // The game's buttons and bars: a find under one isn't in the shot.
      const chrome = ['tray', 'roombar', 'to-places', 'floors', 'dial'].map((i) => document.getElementById(i))
        .concat([document.querySelector('.tally')])
        .filter((el) => el && !el.hidden && el.getClientRects().length)
        .map((el) => el.getBoundingClientRect());
      const under = (x, y) => chrome.some((r) => x > r.left - 8 && x < r.right + 8 && y > r.top - 8 && y < r.bottom + 8);
      return zone.finds.filter((f) => !skip.includes(f.id) && (!only || only.includes(f.id))).map((f) => {
        const [x, y, h] = typeof f.at === 'function' ? f.at(t) : f.at;
        const [sx, sy] = s.camera.toScreen(zone.anchor[0] + x - y, zone.anchor[1] - zone.lift + (x + y) / 2 - h * 1.12);
        // A find inside something: where that is, and its tap area (a tap there opens it).
        let poke = null;
        if (f.inside) {
          const [px, py, ph] = typeof f.inside.at === 'function' ? f.inside.at(t) : f.inside.at;
          const [qx, qy] = s.camera.toScreen(zone.anchor[0] + px - py, zone.anchor[1] - zone.lift + (px + py) / 2 - ph * 1.12);
          poke = { sx: qx, sy: qy, r: Math.max(f.inside.r * s.cam.z, 22) };
        }
        // The goose: where its lookalikes are, so a tap on one can be followed
        // by a second guess, as a player hears "not a goose" and looks again.
        const decoys = f.goose ? zone.pokes.filter((p) => p.decoy && (!p.when || p.when(t))).map((p) => {
          const [px, py, ph] = typeof p.at === 'function' ? p.at(t) : p.at;
          const [qx, qy] = s.camera.toScreen(zone.anchor[0] + px - py, zone.anchor[1] - zone.lift + (px + py) / 2 - ph * 1.12);
          return { sx: qx, sy: qy, r: Math.max(p.r * s.cam.z, 22) };
        }) : null;
        return { id: f.id, ...(decoys && decoys.length ? { decoys } : {}), label: f.goose ? 'The goose' : f.label, kind: f.kind || 'spot', riddle: f.riddle || null, poke, note: f.note || null, here: !f.when || !!f.when(t), dial: dial && !dial.hidden ? dial.innerText.replace(/\s+/g, ' ').trim() : null, sx, sy, r: Math.max(f.r * s.cam.z, 22), seen: sx > 0 && sx < innerWidth && sy > 0 && sy < innerHeight && !under(sx, sy) };
      });
    }, { id: z.id, skip, only });
    await page.evaluate((() => new Promise((r) => { window.__squares.renderer.refreshAll(); requestAnimationFrame(() => requestAnimationFrame(r)); }))); // every room's picture at this moment
    await page.screenshot({ path: path.join(dir, `${key}.png`) });
    await page.evaluate(() => window.__squares.clock.set(window.__squares.clock.now()));
    const mine = near ? found.filter((f) => f.seen) : found;
    const notes = Object.fromEntries(mine.filter((f) => f.note).map((f) => [f.label, f.note]));
    const riddles = Object.fromEntries(mine.filter((f) => f.riddle).map((f) => [f.label, f.riddle]));
    labels[key] = { name: z.name, shot: `${key}.png`, find: mine.map((f) => f.label), ...(Object.keys(riddles).length ? { riddle: riddles } : {}), ...(Object.keys(notes).length ? { when: notes } : {}), ...(found[0] && found[0].dial ? { dial: found[0].dial } : {}), ...extra };
    // Only what's there right now can be found in this shot.
    answers[key] = mine.filter((f) => f.here).map(({ id, seen, here, note, dial, riddle, ...f }) => f);
    return mine.map((f) => f.id);
  };
  const keys = {}; // each area's shot keys, and the finds framed in each
  for (const z of zones) {
    keys[z.id] = [];
    if (!z.long) { keys[z.id].push([z.id, await shoot(z, z.id, null, []), null]); continue; }
    // A street: framed round each find not yet in a shot, as a player
    // panning along it would come across them.
    const done = [];
    let n = 0;
    for (const f of z.finds) {
      if (done.includes(f)) continue;
      const got = await shoot(z, `${z.id}-${++n}`, f, done);
      keys[z.id].push([`${z.id}-${n}`, got, f]);
      done.push(...got);
    }
  }
  // Finds that are away at the start: tap the dial once, as a player would,
  // and look again; whatever the dial can't reach, look later, in the middle
  // of its window.
  const away = async (at) => page.evaluate((t) => {
    const s = window.__squares, out = {};
    for (const z of s.world.zones) out[z.id] = z.finds.filter((f) => f.when && !f.when(t)).map((f) => f.id);
    return out;
  }, at);
  const missing = await away(start);
  const hasDial = await page.evaluate(() => !!window.__squares.world.map.dial);
  const overview = async (name) => {
    await page.evaluate(() => { const st = document.getElementById('story'); if (st) st.hidden = true; window.__squares.play.toOverview({ dur: 0.01 }); });
    await page.waitForTimeout(1500);
    await page.evaluate((() => new Promise((r) => { window.__squares.renderer.refreshAll(); requestAnimationFrame(() => requestAnimationFrame(r)); })));
    await page.screenshot({ path: path.join(dir, name) });
  };
  const again = async (suffix, extra, back) => {
    const t = await page.evaluate(() => window.__squares.clock.now());
    const still = await away(t);
    for (const z of zones) {
      const want = (back[z.id] || []).filter((id) => !still[z.id].includes(id));
      if (!want.length) continue;
      for (const [key, framed, near] of keys[z.id]) {
        const these = want.filter((id) => framed.includes(id));
        if (these.length) await shoot(z, `${key}-${suffix}`, near, [], these, extra);
      }
      back[z.id] = back[z.id].filter((id) => !want.includes(id));
    }
  };
  const left = JSON.parse(JSON.stringify(missing));
  if (hasDial && Object.values(missing).some((l) => l.length)) {
    await overview('place.png');
    await page.evaluate(() => window.__squares.clock.set(window.__squares.clock.now()));
    await page.click('#dial');
    await page.waitForTimeout(2600);
    await overview('place-dial.png');
    await again('dial', { after: 'the same view after tapping the dial once' }, left);
  }
  for (const [zid, ids] of Object.entries(left)) {
    for (const id of ids) {
      // The middle of its window, the first one after the start.
      const t = await page.evaluate(({ zid, id, start }) => {
        const s = window.__squares, f = s.world.zones.find((z) => z.id === zid).finds.find((x) => x.id === id);
        const L = s.world.map.loop || 360;
        let a = null;
        for (let k = 0; k < L; k += 0.5) {
          const on = f.when(start + k);
          if (on && a == null) a = k;
          if (!on && a != null) return start + (a + k) / 2;
        }
        return start + (a || 0);
      }, { zid, id, start });
      await page.evaluate((t) => window.__squares.clock.set(t), t);
      const z = zones.find((x) => x.id === zid);
      const one = { [zid]: [id] };
      await again('later', { after: 'the same view later in the day, if you wait' }, one);
    }
  }
  fs.writeFileSync(path.join(dir, 'labels.json'), JSON.stringify(labels, null, 2));
  fs.writeFileSync(path.join(dir, 'answers.json'), JSON.stringify(answers, null, 2));

  // A trail: the log partway along, and the ending.
  if (await page.evaluate(() => window.__squares.world.goal === 'trail')) {
    const tdir = path.join(dir, 'trail');
    fs.mkdirSync(tdir, { recursive: true });
    const snap = async (name, ms = 700) => { await page.waitForTimeout(ms); await page.screenshot({ path: path.join(tdir, name + '.png') }); };
    await page.evaluate(() => { const s = window.__squares; s.play.trailTo(null); s.play.reset(); s.play.toOverview({ dur: 0.01 }); });
    await page.evaluate(() => { const s = window.__squares; for (const x of s.world.sightings.slice(0, 3)) s.play.markFound(x.zone, x.f); });
    await snap('1-a-sighting-found');
    await page.click('#tally-case');
    await snap('2-the-log');
    await page.evaluate(() => { const s = window.__squares; s.play.traillog.close(); for (const x of s.world.sightings.slice(3)) s.play.markFound(x.zone, x.f); });
    await snap('3-caught', 4600);
    await snap('4-the-card', 6000);
  }

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
const ratings = guesses.ratings || {};
const rows = [];
let hits = 0, total = 0, off = 0;
// Only the areas the tester was asked about, if their guesses name some.
const asked = Object.keys(guesses).filter((k) => k !== 'ratings');
const tested = (id) => !asked.length || asked.some((a) => id === a || id.startsWith(a + '-'));
for (const [id, finds] of Object.entries(answers)) {
  if (!tested(id)) continue;
  for (const f of finds) {
    total++;
    let g = guesses[id] && guesses[id][f.label];
    let result = 'not found', hit = false, second = '';
    // Two guesses for the goose ([[x, y], [x, y]]): the second counts only
    // when the first was on one of its lookalikes, which answers back.
    if (Array.isArray(g) && Array.isArray(g[0])) {
      const [a, b] = g;
      const onDecoy = (q) => q && (f.decoys || []).some((d) => Math.hypot(q[0] / SCALE - d.sx, q[1] / SCALE - d.sy) <= d.r);
      if (b && onDecoy(a)) { g = b; second = ' (second guess, after a lookalike)'; } else { g = a; if (onDecoy(a)) second = ' (on a lookalike)'; }
    }
    if (Array.isArray(g) && g.length) {
      const gx = g[0] / SCALE, gy = g[1] / SCALE;
      const d = Math.hypot(gx - f.sx, gy - f.sy);
      // (Tapping the thing it's inside opens it: that's finding it.)
      const dp = f.poke ? Math.hypot(gx - f.poke.sx, gy - f.poke.sy) : Infinity;
      hit = d <= f.r || (f.poke && dp <= f.poke.r);
      result = hit ? (d <= f.r ? 'found' : 'found (by opening it)') : `missed by ${Math.round(Math.min(d - f.r, f.poke ? dp - f.poke.r : Infinity))}px`;
      if (hit) hits++;
      result += second;
    }
    // Its rating against its kind's band (a miss is a 5).
    const kind = f.kind || 'spot', band = BANDS[kind] || BANDS.spot;
    const rated = hit ? (ratings[id] && ratings[id][f.label]) : 5;
    let fit = '';
    if (rated == null) fit = 'no rating';
    else if (rated < band[0]) { fit = 'too easy'; off++; }
    else if (rated > band[1]) { fit = 'too hard'; off++; }
    else fit = 'on its band';
    rows.push([id, f.label, kind, result, rated ?? '', fit]);
  }
}
const md = [`# Playtest score: ${level}`, '', `${hits} of ${total} found. ${off} off their band (spot 1 to 3, poke 2 to 4, hard 3 to 5): fix those, either way.`, '',
  '| Area | Find | Kind | Result | Rating | Band |', '| --- | --- | --- | --- | --- | --- |',
  ...rows.map((r) => `| ${r.join(' | ')} |`), ''].join('\n');
fs.writeFileSync(path.join(dir, 'score.md'), md);
for (const r of rows) console.log(`${r[3].startsWith('found') ? 'FOUND ' : 'MISSED'}  ${r[0].padEnd(16)} ${r[1].padEnd(30)} ${r[2].padEnd(5)} ${String(r[4]).padStart(2)}  ${r[5]}${r[3].startsWith('found') ? '' : '  (' + r[3] + ')'}`);
console.log(`\n${hits} of ${total} found, ${off} off their band. Written to ${path.relative(root, path.join(dir, 'score.md'))}`);
