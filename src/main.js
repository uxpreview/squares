// Boots the game: the canvas and camera, the screens, and the address bar.
//
// Addresses (the part after #):
//   #/                   title screen
//   #/maps               pick a place
//   #/block              play The Block Party, whole map
//   #/block/laundromat   play The Block Party, inside the laundromat
//   #laundromat          old links from before there were maps still work
//   #/blockparty         the Block Party's address before it shipped: goes to #/block

// Fonts ship with the game (no Google Fonts call), Latin letters only.
import '@fontsource/bagel-fat-one/latin-400.css';
import '@fontsource/rethink-sans/latin-400.css';
import '@fontsource/rethink-sans/latin-600.css';
import '@fontsource/rethink-sans/latin-700.css';
import config from './config.js';
import MAPS from './maps/index.js';
import { createCamera } from './engine/camera.js';
import { createRenderer } from './engine/renderer.js';
import { attachInput } from './engine/input.js';
import { buildWorld } from './engine/world.js';
import { createStore } from './game/store.js';
import { createPlay } from './game/play.js';
import { setUp } from './game/case.js';
import { setMuted } from './game/audio.js';
import { createScreens } from './ui/screens.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('map');
const camera = createCamera(canvas, { reduceMotion });
const renderer = createRenderer(canvas, camera, { reduceMotion });
const store = createStore();
setMuted(!store.settings.sound);

// The scene's clock, in seconds. Everything drawn is a pure function of it, and
// taps are checked against the same time. set(t) jumps to any moment (the
// screenshot and QA tools use it to see a place at, say, 90 seconds in);
// freeze(t) stops it there (for catching a flash of lightning), and set()
// starts it again.
const clock = {
  shift: 0,
  frozen: null,
  now: () => clock.frozen ?? performance.now() / 1000 + clock.shift,
  set: (t) => { clock.frozen = null; clock.shift = t - performance.now() / 1000; },
  freeze: (t = clock.now()) => { clock.frozen = t; },
};

// ---------- Maps ----------
// Built once, on first use. Building is cheap; drawing is what costs.
const worlds = new Map();
function getWorld(id) {
  if (!worlds.has(id)) {
    const meta = MAPS.find((m) => m.id === id);
    if (!meta) return Promise.reject(new Error('No map ' + id));
    // Build it, then work out its format (its goal, how its finds group).
    worlds.set(id, meta.load().then((mod) => setUp(buildWorld(mod.default))));
  }
  return worlds.get(id);
}

// Put a map on the canvas. A different map inks in fresh (or, grown out of
// its picker card, is simply there).
function show(world, intro = true) {
  if (play.world === world) return false;
  renderer.dispose(play.world);
  play.load(world);
  renderer.startIntro(world, !intro);
  return true;
}

// Where the camera sits so the place lies exactly over its picker card's
// picture (framed as renderer.thumbnail frames it), to grow from there.
function cardView(world, r) {
  const [X0, X1, Y0, Y1] = world.overviewBox(false);
  const z = Math.min(r.width / (X1 - X0), r.height / (Y1 - Y0)) * 1.12;
  const v = camera.view;
  return { x: (X0 + X1) / 2 - (r.left + r.width / 2 - v.vw / 2) / z, y: (Y0 + Y1) / 2 - (r.top + r.height / 2 - v.vh / 2) / z, z };
}

// ---------- Game ----------
const play = createPlay({
  camera,
  store,
  reduceMotion,
  clock: clock.now,
  setClock: clock.set,
  on: {
    exit: () => go('#/maps'),
    complete: (world) => screens.showComplete(world),
    refresh: () => renderer.refreshAll(),
    // Keep the address bar and "continue" in step with where you are.
    place: (mapId, zoneId) => {
      store.setLast(mapId, zoneId);
      const hash = `#/${mapId}${zoneId ? '/' + zoneId : ''}`;
      if (location.hash !== hash) history.replaceState(null, '', hash);
    },
  },
});

// Safari's own pinch gesture on the page, stopped for the same reason as
// touch-action in styles.css (older iPhones ignore touch-action for it).
for (const g of ['gesturestart', 'gesturechange']) document.addEventListener(g, (e) => e.preventDefault(), { passive: false });

const input = attachInput(canvas, camera, {
  down: () => play.down(),
  tap: (x, y) => play.tap(x, y),
  settle: () => play.settle(),
  clampZoom: (z) => play.clampZoom(z),
});

const screens = createScreens({
  config,
  maps: MAPS,
  store,
  getWorld,
  renderer,
  reduceMotion,
  on: {
    go,
    soundChanged: (on) => { store.setSetting('sound', on); setMuted(!on); },
  },
});

// ---------- Routes ----------
function go(hash) {
  if (location.hash === hash) route();
  else location.hash = hash;
}

// Places that moved to another id: the old address goes to the new one.
const MOVED = { blockparty: 'block' };

function parse(hash) {
  const h = hash.replace(/^#\/?/, '');
  if (!h) return { screen: 'title' };
  if (h === 'maps') return { screen: 'places' };
  const [map, zone] = h.split('/');
  if (MOVED[map]) return { screen: 'moved', hash: `#/${MOVED[map]}${zone ? '/' + zone : ''}` };
  if (MAPS.some((m) => m.id === map)) return { screen: 'play', map, zone };
  // An old link straight to a room on the block.
  return { screen: 'play', map: 'block', zone: map };
}

let first = true;
let routing = 0;
async function route() {
  const r = parse(location.hash);
  // (Swapped in place, so back doesn't return to the old address.)
  if (r.screen === 'moved') { history.replaceState(null, '', r.hash); route(); return; }
  const n = ++routing;
  const was = first;
  first = false;
  if (r.screen === 'play') {
    let world;
    try { world = await getWorld(r.map); } catch (e) {
      // A place that fails to build says why (in the console), then you're back at the picker.
      console.error(`Couldn't open ${r.map}:`, e);
      go('#/maps');
      return;
    }
    if (n !== routing) return; // a newer route won
    const zone = r.zone && world.indexOf(r.zone) >= 0 ? r.zone : null;
    // Picked from the picker: the place grows out of its card, in one motion.
    const card = !zone && !reduceMotion ? screens.takeLaunch(r.map) : null;
    const fresh = show(world, !card);
    screens.show('play', { fade: !!card });
    input.setEnabled(true);
    if (card) camera.jumpTo(cardView(world, card));
    // A link straight into a room lands there; otherwise the camera flies.
    play.start(zone, { fresh: fresh && !card, jump: was && !!zone, grow: !!card });
    return;
  }
  // Title or picker: idle the map you were last on (or the first one) behind it.
  input.setEnabled(false);
  screens.show(r.screen);
  const id = (store.last && MAPS.some((m) => m.id === store.last.map && !m.hidden) && store.last.map) || MAPS[0].id;
  const world = await getWorld(id);
  if (n !== routing) return;
  play.attract(screens.insets, { fresh: show(world) });
  warm();
}

// Once the title's map is up, fetch every other place's code while nobody's
// waiting on it, one at a time, so the picker's pictures and the first tap on
// a card don't wait on the connection (the biggest is about 200 KB zipped).
let warmed = false;
function warm() {
  if (warmed) return;
  warmed = true;
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 200));
  const next = (list) => {
    if (!list.length) return;
    idle(() => list[0].load().catch(() => {}).then(() => next(list.slice(1))), { timeout: 2000 });
  };
  next(MAPS.filter((m) => !m.hidden));
}
window.addEventListener('hashchange', route);

// ---------- Frame loop ----------
let lastT = 0;
function frame(now) {
  const t = clock.frozen ?? now / 1000 + clock.shift;
  const dt = Math.min(0.05, now / 1000 - lastT || 0);
  lastT = now / 1000;
  camera.step(now);
  input.step(dt);
  play.tick(t);
  renderer.render(play.world, {
    t,
    now,
    focus: play.focus,
    live: play.live(now),
    level: play.level,
    still: !camera.flying && !camera.drifting && !input.busy,
    fx: play.fx(now),
    marks: play.drawMarks,
    top: play.drawPops,
  });
  requestAnimationFrame(frame);
}

function resized() {
  camera.measure();
  play.resize();
}
window.addEventListener('resize', resized);
// iOS Safari can settle its toolbars after the first measure without a resize
// event, and the picture came out stretched (seen on an iPhone). Watch the
// canvas and the visible viewport too, and re-measure once a frame at most.
let resizing = 0;
const settle = () => {
  if (resizing) return;
  resizing = requestAnimationFrame(() => {
    resizing = 0;
    const v = camera.view, r = canvas.getBoundingClientRect();
    if (v.vw !== window.innerWidth || v.vh !== window.innerHeight || v.box.w !== r.width || v.box.h !== r.height || v.box.y !== r.top) resized();
  });
};
new ResizeObserver(settle).observe(canvas);
if (window.visualViewport) window.visualViewport.addEventListener('resize', settle);

// ---------- Boot ----------
async function boot() {
  const fonts = [
    document.fonts.load('20px "Bagel Fat One"'),
    document.fonts.load('20px "Rethink Sans"'),
    document.fonts.load('600 20px "Rethink Sans"'),
    document.fonts.load('700 20px "Rethink Sans"'),
  ];
  // In play, every weight the HUD uses: the map is framed around the text,
  // so it shouldn't change size after the camera has settled. The title and
  // the picker wait only for the wordmark's font, to be up sooner on a slow
  // connection (their smaller text fades in after it); the drifting map is
  // framed again once the rest are in.
  const playing = parse(location.hash).screen === 'play';
  try {
    await Promise.race([
      Promise.all(playing ? fonts : fonts.slice(0, 1)),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
  } catch {}
  if (!playing) Promise.all(fonts).then(() => { if (!play.active) resized(); }, () => {});
  document.body.dataset.ready = '1';
  camera.measure();
  await route();
  requestAnimationFrame(frame);
}
boot();

// Test hook for screenshots (tools/shoot.mjs).
window.__squares = {
  perf: renderer.perf,
  cam: camera.cam,
  camera,
  renderer,
  play,
  store,
  clock,
  go,
  get world() { return play.world; },
  get rooms() { return play.world ? play.world.zones : []; },
};
