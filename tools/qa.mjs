// QA for a level: everything a machine can check before a person looks at it.
//
//   npm run qa -- <level>            everything, and a contact sheet
//   npm run qa -- <level> --quick    skip the slow parts (speed, the desktop pass)
//   npm run qa -- <level> --no-sheet skip the contact sheet
//
// It checks, in order:
//   copy     names 1 to 3 words, blurbs 1 or 2 sentences, find labels in sentence
//            case and unique across the level, no em dashes, no TODOs left
//   colors   area files take their colors from C or the level's style sheet
//   finds    how many per area and how many geese (the map's qa rules)
//   errors   nothing breaks loading the level, or drawing any area (walls up
//            and down) at 48 moments across its loop
//   walkers  people on the map's timeline go through doors, never walls, and
//            never faster than a run
//   case     (whodunits) every clue in the case file is a find in the place,
//            every suspect has an accusation scene, the lines are short
//   screen   on a phone and a desktop, each area framed as a player sees it:
//            every find on screen, clear of the find list and buttons, big
//            enough to tap and not crowding another; then actually tapped
//   speed    each area's frame time with the CPU slowed 4x (a mid-range phone),
//            against a budget set by The Block
//   sheet    a contact sheet: the whole place (every floor, key moments),
//            every area on desktop and phone with every find ringed, and for a
//            whodunit its case file, an accusation and the reveal
//
// Everything lands in qa-out/<level>/: contact.jpg, report.md and every shot.
// Exits with an error if anything failed. Warnings are worth a look but pass.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const exe = fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {};

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const level = args.find((a) => !a.startsWith('--'));
const quick = args.includes('--quick');
const sheet = !args.includes('--no-sheet');
if (!level) {
  console.log('Usage: npm run qa -- <level> [--quick] [--no-sheet]   (for example: npm run qa -- manor)');
  process.exit(1);
}
const mapDir = path.join(root, 'src/maps', level);
if (!fs.existsSync(path.join(mapDir, 'map.js'))) {
  console.log(`No level called "${level}": there's no src/maps/${level}/map.js.`);
  process.exit(1);
}

// Frame budget in ms per render, CPU slowed 4x, phone at 3x pixels, GPU canvas.
// Calibrated on The Block (its slowest rooms render in about 50 ms there).
const BUDGET = { warn: 40, fail: 60 };
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1400, height: 1000 };

const out = path.join(root, 'qa-out', level);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'shots'), { recursive: true });

const results = [];
const note = (status, check, text) => results.push({ status, check, text });
const pass = (check, text) => note('pass', check, text);
const warn = (check, text) => note('warn', check, text);
const fail = (check, text) => note('fail', check, text);
const rel = (f) => path.relative(root, f);
const step = (s) => console.log('· ' + s);

// ---------- Files: em dashes and colors ----------
step('Reading the level files');
const files = walk(mapDir).filter((f) => f.endsWith('.js'));
const brief = path.join(root, 'docs/levels', level + '.md');
let dashes = 0;
for (const f of files.concat(fs.existsSync(brief) ? [brief] : [])) {
  fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
    if (line.includes('—')) { dashes++; fail('copy', `Em dash in ${rel(f)}, line ${i + 1}. Use a comma, a period or "and".`); }
  });
}
if (!dashes) pass('copy', 'No em dashes in the level\'s files or its brief.');
// Places made before style sheets existed (no style.js) only get a warning.
const areaFiles = files.filter((f) => path.dirname(f) !== mapDir);
const styled = fs.existsSync(path.join(mapDir, 'style.js'));
let hexes = 0;
for (const f of areaFiles) {
  fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, '');
    const m = code.match(/['"`]#[0-9a-fA-F]{3,8}['"`]/);
    if (m) { hexes++; note(styled ? 'fail' : 'warn', 'colors', `${rel(f)}, line ${i + 1}: ${m[0]} is a raw color. Use C (engine/art.js) or the level's style sheet.`); }
  });
}
if (!hexes) pass('colors', `All ${areaFiles.length} area files take their colors from C or the style sheet.`);

// ---------- The browser ----------
const server = await createServer({ root, logLevel: 'error', server: { port: 0, hmr: false } });
await server.listen();
const base = `http://localhost:${server.httpServer.address().port}/`;
const browser = await chromium.launch(exe);
const pageErrors = [];

async function open(viewport, o = {}) {
  const b = o.browser || browser;
  const ctx = await b.newContext({ viewport, deviceScaleFactor: o.dsf || 1 });
  await ctx.addInitScript(() => { try { localStorage.clear(); } catch {} });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) pageErrors.push(m.text()); });
  await page.goto(base + '#/' + level);
  await page.waitForFunction(() => window.__squares && window.__squares.world, null, { timeout: 30000 });
  await page.waitForTimeout(600);
  return { ctx, page };
}

try {
  step('Loading the level');
  const main = await open(DESKTOP);
  const page = main.page;
  const info = await page.evaluate(() => {
    const w = window.__squares.world, m = w.map;
    return {
      id: w.id, name: m.name, tagline: m.tagline || '', words: m.words || {}, invite: m.invite || null, qa: m.qa || {},
      loop: m.loop || (w.walkers[0] && w.walkers[0].loop) || 60,
      storeys: m.storeys ? w.storeys.map((s) => ({ id: s.id, name: s.name })).reverse() : [], // top floor first
      defaultStorey: w.storeys[w.defaultStorey] ? w.storeys[w.defaultStorey].id : null,
      order: w.order.map((i) => w.zones[i].id),
      walkers: w.walkers.filter((k) => !k.ghost).map((k) => k.name || k.id), // ghosts (echoes, apparitions) aren't people
      zones: w.zones.map((z) => ({
        id: z.id, name: z.name, tag: z.tag, blurb: z.def.blurb || '',
        finds: z.finds.map((f) => {
          // Moving: its spot changes over the loop (a goose's spot is always a function).
          const spots = [0, 7.3, 19.1, 41.7].map((t) => String(typeof f.at === 'function' ? f.at(t) : f.at));
          return { id: f.id, label: f.label, goose: !!f.goose, r: f.r, moving: new Set(spots).size > 1, group: f.group || null };
        }),
      })),
      // A whodunit's case file (src/game/case.js): its suspects and their lines.
      case: m.case ? {
        culprit: m.case.culprit,
        totals: w.totals,
        suspects: m.case.suspects.map((c) => ({
          id: c.id, name: c.name, hidden: !!c.hidden,
          clues: [...(c.against || []), ...(c.alibi || [])].map((x) => x.find).filter(Boolean),
          lines: (c.scene || []).map(([who, text]) => [who, text]),
        })),
        reveal: m.case.reveal.lines.map(([who, text]) => [who, text]),
        names: m.case.names || {},
      } : null,
    };
  });
  if (info.id !== level) throw new Error(`#/${level} didn't open. Either it failed to build (the page error below says why) or it isn't listed in src/maps/index.js.`);
  const byId = new Map(info.zones.map((z) => [z.id, z]));
  const order = info.order;

  // ---------- Copy ----------
  step('Checking the words');
  const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
  // Sentence ends, not counting "Dr." or an initial like "G.".
  const sentences = (s) => (s.replace(/\b(Dr|Mrs|Mr|Ms|St|No|vs|etc)\./g, '$1').replace(/\b[A-Z]\./g, 'X').match(/[.!?]+(\s|$)/g) || []).length;
  let copyOk = true;
  const bad = (msg) => { copyOk = false; fail('copy', msg); };
  if (words(info.name) < 1 || words(info.name) > 3) bad(`The place's name "${info.name}" should be 1 to 3 words.`);
  if (info.tagline.length > 90) warn('copy', `The tagline is ${info.tagline.length} characters; under 90 reads better on a phone.`);
  // The invitation a first visit gets (words.invite, and words.hint under it): short enough for its card.
  if (!info.words.invite || !info.words.hint) warn('copy', 'The map has no invitation for a first visit (words.invite and words.hint).');
  else if (info.words.invite.length > 26 || info.words.hint.length > 40) warn('copy', `The invitation ("${info.words.invite}" / "${info.words.hint}") is long for its card on a phone: aim for under 26 and 40 characters.`);
  if (info.invite && info.invite.zone && !info.zones.some((z) => z.id === info.invite.zone)) bad(`The invitation points into "${info.invite.zone}", which isn't one of the areas.`);
  const seen = new Map();
  for (const z of info.zones) {
    if (words(z.name) < 1 || words(z.name) > 3) bad(`${z.id}: the name "${z.name}" should be 1 to 3 words.`);
    const n = sentences(z.blurb);
    if (!z.blurb) bad(`${z.name}: no blurb.`);
    else if (n < 1 || n > 2) bad(`${z.name}: the blurb is ${n} sentences; keep it to one or two.`);
    if (z.blurb.length > 170) warn('copy', `${z.name}: the blurb is ${z.blurb.length} characters; short reads better on a phone.`);
    if (/TODO|placeholder/i.test(z.blurb)) bad(`${z.name}: the blurb is still a placeholder.`);
    for (const f of z.finds) {
      if (f.goose) continue;
      const l = f.label || '';
      if (!l) { bad(`${z.name}: the find "${f.id}" has no label.`); continue; }
      if (/TODO|placeholder/i.test(l)) bad(`${z.name}: "${l}" is a placeholder label.`);
      if (l[0] !== l[0].toUpperCase()) bad(`${z.name}: "${l}" should start with a capital (sentence case).`);
      if (/\.$/.test(l)) bad(`${z.name}: "${l}" shouldn't end with a period.`);
      const rest = l.split(/\s+/).slice(1).filter((w) => /[a-z]/i.test(w));
      if (rest.length >= 3 && rest.filter((w) => /^[A-Z][a-z]/.test(w)).length / rest.length >= 0.6) warn('copy', `${z.name}: "${l}" looks like Title Case; labels are sentence case ("A lost mitten").`);
      if (l.length > 36) warn('copy', `${z.name}: "${l}" is ${l.length} characters; a chip reads best under 36.`);
      const key = l.toLowerCase();
      if (seen.has(key)) bad(`"${l}" is in both ${seen.get(key)} and ${z.name}. Labels must be unique across the level.`);
      seen.set(key, z.name);
    }
    const ids = z.finds.map((f) => f.id);
    if (new Set(ids).size !== ids.length) bad(`${z.name}: two finds share an id.`);
  }
  if (copyOk) pass('copy', `${info.zones.length} areas: names, blurbs and ${seen.size} find labels follow the rules.`);

  // ---------- Finds ----------
  const rules = { goosePerZone: true, geese: null, things: [3, 3], ...info.qa };
  let findsOk = true;
  const geese = info.zones.reduce((n, z) => n + z.finds.filter((f) => f.goose).length, 0);
  if (rules.goosePerZone) {
    for (const z of info.zones) {
      const g = z.finds.filter((f) => f.goose).length;
      if (g !== 1) { findsOk = false; fail('finds', `${z.name} has ${g} geese; every area needs exactly one.`); }
    }
  } else if (geese !== (rules.geese ?? 1)) { findsOk = false; fail('finds', `The level has ${geese} geese; its rules say ${rules.geese ?? 1}.`); }
  for (const z of info.zones) {
    const n = z.finds.filter((f) => !f.goose).length;
    if (n < rules.things[0] || n > rules.things[1]) { findsOk = false; fail('finds', `${z.name} hides ${n} things; the rules say ${rules.things[0]} to ${rules.things[1]}.`); }
    for (const f of z.finds) if (f.r < 0.5 || f.r > 1.3) warn('finds', `${z.name}: "${f.label}" has a tap radius of ${f.r}; 0.6 to 1.0 is usual.`);
  }
  const things = info.zones.reduce((n, z) => n + z.finds.filter((f) => !f.goose).length, 0);
  if (findsOk) pass('finds', `${things} things and ${geese} ${geese === 1 ? 'goose' : 'geese'} across ${info.zones.length} areas.`);

  // ---------- The case (whodunits) ----------
  if (info.case) {
    let caseOk = true;
    const c = info.case;
    const zoneOf = new Map(info.zones.flatMap((z) => z.finds.map((f) => [`${z.id}:${f.id}`, z.name])));
    for (const sus of c.suspects) {
      for (const key of sus.clues) if (!zoneOf.has(key)) { caseOk = false; fail('case', `${sus.name}: the clue "${key}" isn't a find in this place.`); }
      if (sus.id !== c.culprit && !sus.lines.length) { caseOk = false; fail('case', `${sus.name} has no accusation scene (what they say when accused).`); }
    }
    for (const [who, text] of [...c.suspects.flatMap((x) => x.lines), ...c.reveal]) {
      if (!c.names[who]) { caseOk = false; fail('case', `A line is said by "${who}", who has no name in the case file.`); }
      if (text.length > 110) warn('case', `"${text.slice(0, 40)}..." is ${text.length} characters; a line reads best under 110.`);
    }
    const culprit = c.suspects.find((x) => x.id === c.culprit);
    const rooms = new Set(culprit.clues.map((k) => zoneOf.get(k)));
    if (caseOk) pass('case', `The case: ${c.suspects.length} suspects, ${c.totals.evidence} pieces of evidence and ${c.totals.curiosity} curiosities. Naming the culprit takes ${culprit.clues.length} clues across ${rooms.size} areas (${[...rooms].join(', ')}).`);
  }

  // ---------- Sound: every cue and the bed exist and build ----------
  const sound = await page.evaluate(async () => {
    const m = window.__squares.world.map;
    if (!m.sound) return null;
    const { check } = await import('/src/game/audio.js');
    const names = [...new Set([...(m.sound.cues || []).map((q) => q.name), ...(m.sound.bed ? [m.sound.bed] : [])])];
    const out = [];
    for (const n of names) { const err = await check(n, { big: true }); if (err) out.push(`${n}: ${err}`); }
    return { names, problems: out, cues: (m.sound.cues || []).length };
  });
  if (sound) {
    for (const p of sound.problems) fail('sound', p);
    if (!sound.problems.length) pass('sound', `${sound.cues} cues on the clock and the bed (${sound.names.join(', ')}) all play.`);
  }

  // ---------- Errors: draw everything at every moment ----------
  step('Drawing every area across the loop');
  const sweep = await page.evaluate(async ({ n, loop }) => {
    const { drawZoneVector } = await import('/src/engine/zone.js');
    const { setScreen, Q } = await import('/src/engine/art.js');
    const w = window.__squares.world;
    const cv = document.createElement('canvas');
    cv.width = cv.height = 900;
    const g = cv.getContext('2d');
    const problems = [];
    const slowest = {};
    for (const z of w.zones) {
      const saved = z.wallK;
      let worst = 0;
      for (let i = 0; i < n; i++) {
        const t = (i / n) * loop + 0.37;
        for (const k of z.low != null ? [0, 1] : [z.wallK]) {
          z.wallK = k;
          g.setTransform(18, 0, 0, 18, 450, 520);
          setScreen(18, 1);
          Q.detail = true; Q.lines = true;
          const t0 = performance.now();
          try { drawZoneVector(g, z, t); } catch (e) { if (problems.length < 20) problems.push(`${z.name}, ${t.toFixed(1)}s in: ${e.message}`); }
          worst = Math.max(worst, performance.now() - t0);
        }
      }
      z.wallK = saved;
      slowest[z.id] = worst;
    }
    const fx = { view: [-120, -120, 120, 120], level: w.top };
    for (let i = 0; i < n; i++) {
      const t = (i / n) * loop + 0.37;
      g.setTransform(4, 0, 0, 4, 450, 450);
      try { if (w.map.backdrop) w.map.backdrop(g, t, w, fx); if (w.map.sky) w.map.sky(g, t, w, fx); }
      catch (e) { if (problems.length < 20) problems.push(`The backdrop or sky, ${t.toFixed(1)}s in: ${e.message}`); }
    }
    return { problems, slowest };
  }, { n: 48, loop: info.loop });
  for (const p of sweep.problems) fail('errors', p);
  if (!sweep.problems.length) pass('errors', `Every area, walls up and down, and the backdrop and sky drew without an error at 48 moments across the ${info.loop}s loop.`);

  // ---------- Walkers ----------
  if (info.walkers.length) {
    step('Walking everyone through the evening');
    const walk = await page.evaluate((loop) => {
      const w = window.__squares.world;
      const out = [];
      for (const k of w.walkers) {
        const who = k.name || k.id;
        let prev = k.at(0), fastest = 0, outside = 0;
        const dt = 0.05;
        for (let t = dt; t <= loop + 1e-6; t += dt) {
          const p = k.at(t);
          const hit = w.blocked(prev, p);
          if (hit) out.push({ kind: 'wall', who, t, ...hit });
          fastest = Math.max(fastest, Math.hypot(p.x - prev.x, p.y - prev.y) / dt);
          if (!w.zoneAtPoint(p.x, p.y, p.z || 0)) outside++;
          prev = p;
        }
        out.push({ kind: 'sum', who, fastest, outside: outside * dt });
      }
      return out;
    }, info.loop);
    let walkOk = true;
    for (const r of walk) {
      if (r.kind === 'wall') { walkOk = false; fail('walkers', `${r.who} walks through the ${r.side} wall of ${byId.get(r.zone).name} at ${r.t.toFixed(1)}s (x ${r.x.toFixed(1)}, y ${r.y.toFixed(1)}), not through a door.`); }
      else {
        if (r.fastest > 3.6) { walkOk = false; fail('walkers', `${r.who} moves at ${r.fastest.toFixed(1)} units a second somewhere; a run is 3.`); }
        if (r.outside > 0.2) warn('walkers', `${r.who} spends ${r.outside.toFixed(1)}s outside every area, where nobody draws them.`);
      }
    }
    if (walkOk) pass('walkers', `${info.walkers.length} people walk the ${info.loop}s evening through doors, never walls, never faster than a run.`);
  }

  // ---------- On screen and tappable ----------
  const screens = quick ? [['phone', PHONE]] : [['phone', PHONE], ['desktop', DESKTOP]];
  for (const [kind, viewport] of screens) {
    step(`Framing every area and tapping every find (${kind})`);
    const { ctx, page: p } = kind === 'desktop' ? main : await open(viewport);
    let screenOk = true;
    const geeseLeft = [];
    for (const id of order) {
      const zone = byId.get(id);
      await frameZone(p, id);
      const seen = await p.evaluate(({ id, loop }) => {
        const s = window.__squares, cam = s.cam, w = s.world;
        const z = w.zones.find((x) => x.id === id);
        const vw = innerWidth, vh = innerHeight;
        const chrome = ['tray', 'roombar', 'to-places', 'floors'].map((i) => document.getElementById(i))
          .concat([document.querySelector('.tally')])
          .filter((el) => el && !el.hidden && el.getClientRects().length)
          .map((el) => { const r = el.getBoundingClientRect(); return { name: el.id || el.className, l: r.left, t: r.top, r: r.right, b: r.bottom }; });
        const at = (f, t) => {
          const [x, y, h] = typeof f.at === 'function' ? f.at(t) : f.at;
          return s.camera.toScreen(z.anchor[0] + x - y, z.anchor[1] - z.lift + (x + y) / 2 - h * 1.12);
        };
        const now = s.clock.now();
        return z.finds.map((f) => {
          const moments = typeof f.at === 'function' && !f.goose ? Array.from({ length: 24 }, (_, i) => now + (i / 24) * loop) : [now];
          let off = 0, under = null;
          for (const t of moments) {
            const [sx, sy] = at(f, t);
            const out = sx < 6 || sy < 6 || sx > vw - 6 || sy > vh - 6;
            const c = chrome.find((r) => sx >= r.l - 2 && sx <= r.r + 2 && sy >= r.t - 2 && sy <= r.b + 2);
            if (out || c) { off++; if (c && !under) under = c.name; }
          }
          const [sx, sy] = at(f, now);
          return { id: f.id, label: f.goose ? 'The goose' : f.label, goose: !!f.goose, moving: moments.length > 1, share: off / moments.length, under, px: f.r * cam.z, sx, sy };
        });
      }, { id, loop: info.loop });
      for (const f of seen) {
        const where = `${zone.name} (${kind})`;
        if (f.share > 0) {
          const why = f.under ? `under the ${f.under}` : 'off the edge of the screen';
          const msg = f.moving ? `${where}: "${f.label}" is ${why} ${Math.round(f.share * 100)}% of the time.` : `${where}: "${f.label}" is ${why}.`;
          if (!f.moving || f.share > 0.25) { screenOk = false; fail('screen', msg); } else warn('screen', msg);
        }
        // Taps get a 44px target whatever the size; this is about seeing it. About 15px across is usual on a phone.
        if (f.px < 6) warn('screen', `${where}: "${f.label}" is tiny on screen (about ${Math.round(f.px * 2)}px across).`);
        for (const g of seen) {
          if (g === f || g.id < f.id || g.moving || f.moving) continue;
          if (Math.hypot(g.sx - f.sx, g.sy - f.sy) < 26) warn('screen', `${where}: "${f.label}" and "${g.label}" are within ${Math.round(Math.hypot(g.sx - f.sx, g.sy - f.sy))}px of each other.`);
        }
      }
      // Tap every thing here (geese at the very end: the last one finishes the place).
      for (const f of zone.finds) {
        if (f.goose) { geeseLeft.push([id, f]); continue; }
        const r = await tapFind(p, id, f.id);
        if (!r.ok) { screenOk = false; fail('screen', `${zone.name} (${kind}): tapping "${f.label}" didn't find it${r.other ? ` (it found "${r.other}" instead)` : ''}.`); }
      }
      await p.evaluate(() => { const s = window.__squares; s.store.resetMap(s.world.id); });
    }
    for (const [id, f] of geeseLeft) {
      await frameZone(p, id);
      const r = await tapFind(p, id, f.id);
      if (!r.ok) { screenOk = false; fail('screen', `${byId.get(id).name} (${kind}): tapping the goose didn't find it.`); }
    }
    if (screenOk) pass('screen', `${kind}: every find is on screen with its area framed, clear of the buttons, and a tap finds it.`);
    if (kind !== 'desktop') await ctx.close();
  }

  // ---------- Speed ----------
  if (!quick) {
    step('Timing every area with the CPU slowed 4x');
    const gpu = await chromium.launch({ ...exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
    const { ctx, page: p } = await open(PHONE, { browser: gpu, dsf: 3 });
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const times = [];
    // Each view on its own frames: let it settle, reset the counters, then wait
    // for a dozen frames (or 20 seconds) and take their average.
    const measure = async (label) => {
      await p.waitForTimeout(1500);
      await p.evaluate(() => { const f = window.__squares.perf; f.n = 0; f.total = 0; f.worst = 0; });
      await p.waitForFunction(() => window.__squares.perf.n >= 12, null, { timeout: 20000 }).catch(() => {});
      times.push([label, await p.evaluate(() => { const f = window.__squares.perf; return f.n ? f.total / f.n : f.ms; })]);
    };
    for (const s of info.storeys.length ? info.storeys : [{ id: null, name: 'The whole place' }]) {
      if (s.id) await p.evaluate((i) => window.__squares.play.setStorey(i), s.id);
      await measure(`${s.name} (overview)`);
    }
    for (const id of order) {
      await p.evaluate((i) => window.__squares.play.enterZone(i, { dur: 0.01 }), id);
      await measure(byId.get(id).name);
    }
    let speedOk = true;
    for (const [label, ms] of times) {
      if (ms > BUDGET.fail) { speedOk = false; fail('speed', `${label}: ${ms.toFixed(0)} ms a frame, over the ${BUDGET.fail} ms budget.`); }
      else if (ms > BUDGET.warn) warn('speed', `${label}: ${ms.toFixed(0)} ms a frame, close to the budget.`);
    }
    const worst = times.slice().sort((a, b) => b[1] - a[1])[0];
    if (speedOk) pass('speed', `Every view renders within budget (slowest: ${worst[0]}, ${worst[1].toFixed(0)} ms at 4x slowdown; The Block's slowest is about 50).`);
    fs.writeFileSync(path.join(out, 'speed.txt'), times.map(([l, ms]) => `${ms.toFixed(1).padStart(6)} ms  ${l}`).join('\n') + '\n');
    await gpu.close();
  }

  // ---------- Contact sheet ----------
  let sheetFile = null;
  if (sheet) {
    step('Taking the contact sheet');
    const shots = { whole: [], areas: new Map() };
    // Fresh pages: the tapping above found everything, and that shows.
    const desk = await open(DESKTOP);
    const phone = await open(PHONE);
    const pages = { desktop: desk.page, phone: phone.page };
    const at0 = rules.at ?? 20;
    const shot = async (kind, name, prep) => {
      const p = pages[kind];
      await prep(p);
      await p.evaluate(() => { const st = document.getElementById('story'); if (st) st.hidden = true; });
      const buf = await p.screenshot({ type: 'jpeg', quality: 82 });
      fs.writeFileSync(path.join(out, 'shots', `${name}-${kind}.jpg`), buf);
      return 'data:image/jpeg;base64,' + buf.toString('base64');
    };
    const overview = (storey, t) => async (p) => {
      await p.evaluate(({ s, t }) => {
        const q = window.__squares;
        q.play.debug.finds = false;
        q.play.toOverview({ dur: 0.01 });
        if (s) q.play.setStorey(s);
        q.clock.set(t - 1.6);
      }, { s: storey, t });
      await p.waitForTimeout(1600);
    };
    for (const s of info.storeys.length ? info.storeys : [{ id: null, name: 'The whole place' }]) {
      const d = await shot('desktop', `overview-${s.id || 'all'}`, overview(s.id, at0));
      const ph = await shot('phone', `overview-${s.id || 'all'}`, overview(s.id, at0));
      shots.whole.push({ label: s.id ? s.name : 'The whole place', desktop: d, phone: ph });
    }
    for (const m of rules.moments || []) {
      const d = await shot('desktop', `moment-${m.at}`, overview(info.defaultStorey, m.at));
      shots.whole.push({ label: `${m.label} (${fmt(m.at)})`, desktop: d });
    }
    const thumb = await desk.page.evaluate(() => {
      const s = window.__squares;
      return s.renderer.thumbnail(s.world, 480, 300).toDataURL('image/png');
    });
    for (const id of order) {
      const t = (rules.zoneAt && rules.zoneAt[id]) ?? at0;
      const prep = async (p) => {
        await p.evaluate(({ id, t }) => {
          const q = window.__squares;
          q.play.debug.finds = true;
          q.play.enterZone(id, { dur: 0.01 });
          q.clock.set(t - 1.6);
        }, { id, t });
        await p.waitForTimeout(1600);
      };
      shots.areas.set(id, { t, desktop: await shot('desktop', id, prep), phone: await shot('phone', id, prep) });
    }
    if (info.case) {
      step('Opening the case file');
      const casePrep = (fn) => async (p) => { await p.evaluate(() => { const q = window.__squares; q.play.debug.finds = false; q.play.toOverview({ dur: 0.01 }); }); await fn(p); };
      shots.case = [];
      const open = async (p) => { await p.click('#tally-case'); await p.waitForTimeout(900); };
      const speak = async (p) => {
        for (let i = 0; i < 14 && !(await p.isVisible('.scene-end')); i++) { await p.click('.lines'); await p.waitForTimeout(140); }
        await p.waitForTimeout(500);
      };
      const board = { desktop: await shot('desktop', 'case-board', casePrep(open)), phone: await shot('phone', 'case-board', casePrep(open)) };
      shots.case.push({ label: 'The case file', ...board });
      const wrong = c0 => async (p) => {
        await p.click(`.suspect >> text=${c0}`);
        await p.waitForTimeout(500);
        await p.click('.case-accuse');
        await speak(p);
      };
      const someone = info.case.suspects.find((x) => x.id !== info.case.culprit);
      shots.case.push({ label: `Accusing ${someone.name}`, desktop: await shot('desktop', 'case-wrong', wrong(someone.name)), phone: await shot('phone', 'case-wrong', wrong(someone.name)) });
      // Find every clue against the culprit, name them, and watch the reveal.
      const solve = async (p) => {
        await p.evaluate((keys) => {
          const s = window.__squares, w = s.world;
          for (const key of keys) {
            const [zid, fid] = key.split(':');
            const z = w.zones.find((x) => x.id === zid);
            s.play.markFound(z, z.finds.find((f) => f.id === fid));
          }
        }, info.case.suspects.find((x) => x.id === info.case.culprit).clues);
        await p.evaluate(() => window.__squares.play.casefile.close());
        await open(p);
        const culprit = info.case.suspects.find((x) => x.id === info.case.culprit);
        await p.click(`.suspect >> text=${culprit.name}`);
        await p.waitForTimeout(500);
        await p.click('.case-accuse');
        await speak(p);
      };
      shots.case.push({ label: 'Naming the culprit', desktop: await shot('desktop', 'case-right', solve), phone: await shot('phone', 'case-right', solve) });
      const reveal = async (p) => { await p.click('.scene-end .big-btn'); await p.waitForTimeout(4200); };
      shots.case.push({ label: 'The reveal', desktop: await shot('desktop', 'case-reveal', reveal), phone: await shot('phone', 'case-reveal', reveal) });
      const after = async (p) => { await p.click('#complete-stay'); await p.waitForTimeout(1200); };
      shots.case.push({ label: 'Case closed', desktop: await shot('desktop', 'case-closed', after), phone: await shot('phone', 'case-closed', after) });
    }
    await phone.ctx.close();
    await desk.ctx.close();
    checkPageErrors();
    sheetFile = path.join(out, 'contact.jpg');
    await contactSheet(info, shots, thumb, sheetFile);
  } else checkPageErrors();
  report(info, sheetFile);
} catch (e) {
  fail('errors', 'QA stopped: ' + (e && e.message ? e.message : e));
  checkPageErrors();
  report(null, null);
} finally {
  await browser.close();
  await server.close();
}

const failed = results.filter((r) => r.status === 'fail').length;
process.exit(failed ? 1 : 0);

// ---------- Helpers ----------
function checkPageErrors() {
  if (pageErrors.length) for (const e of [...new Set(pageErrors)].slice(0, 10)) fail('errors', `In the page: ${e}`);
  else pass('errors', 'No errors in the page the whole time.');
}

// Fly into an area as a player would, and let it settle: walls up, story away.
async function frameZone(p, id) {
  await p.evaluate((i) => { window.__squares.play.debug.finds = false; window.__squares.play.enterZone(i, { dur: 0.01 }); }, id);
  await p.waitForTimeout(900);
  await p.evaluate(() => { const st = document.getElementById('story'); if (st) st.hidden = true; });
}

// Tap a find where it is right now, the way a finger would.
async function tapFind(p, zoneId, findId) {
  const [sx, sy] = await p.evaluate(({ zoneId, findId }) => {
    const s = window.__squares, z = s.world.zones.find((x) => x.id === zoneId), f = z.finds.find((x) => x.id === findId);
    const [x, y, h] = typeof f.at === 'function' ? f.at(s.clock.now() + 0.05) : f.at;
    return s.camera.toScreen(z.anchor[0] + x - y, z.anchor[1] - z.lift + (x + y) / 2 - h * 1.12);
  }, { zoneId, findId });
  await p.mouse.click(sx, sy);
  await p.waitForTimeout(60);
  return p.evaluate(({ zoneId, findId }) => {
    const s = window.__squares, w = s.world, z = w.zones.find((x) => x.id === zoneId);
    if (s.store.isFound(w.id, zoneId + ':' + findId)) return { ok: true };
    const other = z.finds.find((f) => s.store.isFound(w.id, zoneId + ':' + f.id));
    return { ok: false, other: other && (other.goose ? 'The goose' : other.label) };
  }, { zoneId, findId });
}

function fmt(t) {
  const m = Math.floor(t / 60), s = Math.round(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// The contact sheet: a page of every shot, laid out and photographed.
async function contactSheet(info, shots, thumb, file) {
  const counts = ['pass', 'warn', 'fail'].map((s) => results.filter((r) => r.status === s).length);
  let commit = '';
  try { commit = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim(); } catch {}
  const whole = shots.whole.map((s) => `
    <figure class="whole">
      <div class="pair"><img class="d" src="${s.desktop}">${s.phone ? `<img class="p" src="${s.phone}">` : ''}</div>
      <figcaption>${esc(s.label)}</figcaption>
    </figure>`).join('');
  const areas = info.order.map((id) => {
    const z = info.zones.find((x) => x.id === id);
    const s = shots.areas.get(id);
    let n = 0;
    const finds = z.finds.map((f) => `<li class="${f.goose ? 'goose' : ''}">${f.goose ? '<b>The goose</b>' : `<span>${++n}</span> ${esc(f.label)}`}${f.moving ? ' <em>(moves)</em>' : ''}</li>`).join('');
    return `
    <article>
      <header><small>${esc(z.tag || '')}</small><h3>${esc(z.name)}</h3><time>${fmt(s.t)}</time></header>
      <p class="blurb">${esc(z.blurb)}</p>
      <div class="pair"><img class="d" src="${s.desktop}"><img class="p" src="${s.phone}"></div>
      <ol>${finds}</ol>
    </article>`;
  }).join('');
  const issues = results.filter((r) => r.status !== 'pass').map((r) => `<li class="${r.status}"><b>${r.status.toUpperCase()}</b> ${esc(r.check)}: ${esc(r.text)}</li>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body { margin: 0; padding: 40px; width: 1840px; background: #E9DCC4; color: #252D52; font: 15px/1.4 system-ui, sans-serif; }
    h1 { margin: 0; font-size: 40px; } h2 { margin: 36px 0 14px; font-size: 22px; text-transform: uppercase; letter-spacing: .12em; }
    .meta { margin: 6px 0 0; color: #4A5280; font-weight: 600; }
    .sum b { margin-right: 14px; } .sum .f { color: #C8413A; } .sum .w { color: #B7791F; } .sum .p { color: #2E8B84; }
    .row { display: flex; flex-wrap: wrap; gap: 22px; align-items: flex-start; }
    figure { margin: 0; } figcaption { margin-top: 6px; font-weight: 700; }
    .pair { display: flex; gap: 10px; align-items: flex-start; }
    img { display: block; border: 2px solid #252D52; border-radius: 6px; background: #fff; }
    .whole img.d { width: 560px; } .whole img.p { width: 180px; } .thumb img { width: 420px; }
    .areas { display: grid; grid-template-columns: 1fr 1fr; gap: 26px; }
    article { background: #FBF6EA; border: 2px solid #252D52; border-radius: 14px; padding: 16px; }
    article header { display: flex; align-items: baseline; gap: 10px; }
    article small { color: #E3603F; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
    article h3 { margin: 0; font-size: 22px; } article time { margin-left: auto; color: #4A5280; font-weight: 700; }
    .blurb { margin: 4px 0 10px; color: #4A5280; }
    article img.d { width: 660px; } article img.p { width: 200px; }
    ol { margin: 10px 0 0; padding: 0; list-style: none; columns: 2; font-weight: 600; }
    li span { display: inline-block; min-width: 20px; height: 20px; border-radius: 10px; background: #E3603F; color: #fff; text-align: center; font-size: 12px; line-height: 20px; }
    li.goose b { background: #EDB53B; padding: 0 6px; border-radius: 4px; }
    ul.issues { padding-left: 18px; } ul.issues li.fail b { color: #C8413A; } ul.issues li.warn b { color: #B7791F; }
  </style></head><body>
    <h1>${esc(info.name)}: contact sheet</h1>
    <p class="meta">${esc(level)} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC${commit ? ' · ' + commit : ''} · ${info.zones.length} areas, ${info.walkers.length} people on the clock</p>
    <p class="meta sum"><b class="p">${counts[0]} passed</b><b class="w">${counts[1]} warnings</b><b class="f">${counts[2]} failed</b></p>
    <h2>The whole place</h2>
    <div class="row">${whole}
      <figure class="thumb"><img src="${thumb}"><figcaption>In the place picker</figcaption></figure>
    </div>
    <h2>Every area, desktop and phone</h2>
    <div class="areas">${areas}</div>
    ${shots.case ? `<h2>The case</h2><div class="row">${shots.case.map((s) => `
    <figure class="whole">
      <div class="pair"><img class="d" src="${s.desktop}"><img class="p" src="${s.phone}"></div>
      <figcaption>${esc(s.label)}</figcaption>
    </figure>`).join('')}</div>` : ''}
    ${issues ? `<h2>For a look</h2><ul class="issues">${issues}</ul>` : ''}
  </body></html>`;
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1200 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.setContent(html, { waitUntil: 'load' });
  await p.screenshot({ path: file, type: 'jpeg', quality: 86, fullPage: true });
  await ctx.close();
}

function report(info, sheetFile) {
  const icon = { pass: 'PASS', warn: 'WARN', fail: 'FAIL' };
  const order = ['copy', 'colors', 'finds', 'case', 'sound', 'errors', 'walkers', 'screen', 'speed'];
  const sorted = results.slice().sort((a, b) => order.indexOf(a.check) - order.indexOf(b.check) || ['fail', 'warn', 'pass'].indexOf(a.status) - ['fail', 'warn', 'pass'].indexOf(b.status));
  console.log('');
  for (const r of sorted) console.log(`${icon[r.status]}  ${r.check.padEnd(8)} ${r.text}`);
  const counts = ['pass', 'warn', 'fail'].map((s) => results.filter((r) => r.status === s).length);
  const md = [
    `# QA: ${info ? info.name : level}`,
    '',
    `${counts[0]} passed, ${counts[1]} warnings, ${counts[2]} failed.${sheetFile ? ` Contact sheet: \`${rel(sheetFile)}\`.` : ''}`,
    '',
    ...sorted.map((r) => `- **${icon[r.status]}** ${r.check}: ${r.text}`),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(out, 'report.md'), md);
  console.log(`\n${counts[0]} passed, ${counts[1]} warnings, ${counts[2]} failed.`);
  if (sheetFile) console.log(`Contact sheet: ${rel(sheetFile)}`);
  console.log(`Report and shots: ${rel(out)}/`);
}
