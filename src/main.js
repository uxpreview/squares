// Camera, input, tour and UI for the whole block.

import { GRID, PITCH, S, WALL, ZK, SLAB, ROOM_BOUNDS, isoX, isoY, unproject } from './iso.js';
import { C, Q, setScreen, alpha } from './art.js';
import { buildRoom, roomAnchor, drawRoomVector, snapshotRoom, drawSnapshot, findPos, bakeBackdrop, drawBackdrop as drawRoomBackdrop, dropBackdrop, dropSnapshot } from './scene.js';
import { drawBackdrop, drawSky, EXTENT } from './ambient.js';
import ROOMS from './rooms/index.js';
import { createTray } from './tray.js';

const canvas = document.getElementById('map');
// alpha: true on purpose. iOS 26 Safari clips an opaque full-screen layer at its
// status bar and toolbar and paints a flat color there instead; a non-opaque
// layer is composited normally, so the plate shows through behind the glass.
const ctx = canvas.getContext('2d', { alpha: true });
const $ = (id) => document.getElementById(id);
const ui = {
  tour: $('tour'), hint: $('hint'), toast: $('toast'),
  geese: $('tally-geese'), things: $('tally-things'),
  brand: document.querySelector('.brand'),
  roombar: $('roombar'), all: $('all'), prev: $('prev'), next: $('next'), tourRoom: $('tour-room'),
  pill: $('room-pill'), unit: $('room-unit'), name: $('room-name'), story: $('story'), storyText: $('story-text'),
};
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- World ----------
const rooms = ROOMS.map((def, i) => buildRoom(def, i % GRID, Math.floor(i / GRID)));
for (const r of rooms) r.anim = r.items.filter((it) => it.anim);
const drawOrder = rooms.slice().sort((a, b) => a.col + a.row - (b.col + b.row) || a.col - b.col);
// Snake through the block for the tour: along each diagonal band.
const tourOrder = rooms.map((r, i) => i).sort((a, b) => {
  const A = rooms[a], B = rooms[b];
  const da = A.col + A.row, db = B.col + B.row;
  return da - db || (da % 2 ? A.col - B.col : B.col - A.col);
});

// ---------- Found state ----------
const STORE = 'squares.found.v1';
let found = new Set();
try { found = new Set(JSON.parse(localStorage.getItem(STORE) || '[]')); } catch {}
const saveFound = () => { try { localStorage.setItem(STORE, JSON.stringify([...found])); } catch {} };
const keyOf = (room, f) => room.id + ':' + f.id;
const foundAt = new Map(); // when each find was circled this visit, so the pen can draw it on
const TOTAL_THINGS = rooms.reduce((n, r) => n + r.finds.filter((f) => !f.goose).length, 0);
const TOTAL_GEESE = rooms.filter((r) => r.finds.some((f) => f.goose)).length;

// ---------- Viewport + camera ----------
// vw/vh: the visible viewport (what the camera frames).
// box: where the canvas actually sits, which can bleed past the viewport on iOS.
let vw = 0, vh = 0, dpr = 1;
const box = { x: 0, y: 0, w: 0, h: 0 };
// Draw at the screen's real density (3x on recent iPhones). If frames get slow
// on a weaker phone, drop to 2x once rather than stutter.
let dprCap = 3;
const cam = { x: 0, y: EXTENT / 2, z: 4 };
let flight = null;
let tour = null;
let mode = 'overview';
let current = -1;
let lastInput = performance.now();
const pops = []; // tap ripples and honk bubbles
let parade = 0; // time the all-geese victory lap started
const hints = []; // pulsing "look around here" rings

function sizeCanvas() {
  dpr = Math.min(window.devicePixelRatio || 1, dprCap);
  vw = window.innerWidth;
  vh = window.innerHeight;
  const r = canvas.getBoundingClientRect();
  box.x = r.left; box.y = r.top; box.w = r.width; box.h = r.height;
  canvas.width = Math.round(box.w * dpr);
  canvas.height = Math.round(box.h * dpr);
}

function resize() {
  sizeCanvas();
  const ov = overviewView();
  if (!flight) {
    const v = mode === 'room' && current >= 0 ? roomView(current) : ov;
    Object.assign(cam, v);
  }
}

function insets() {
  const wide = vw >= 900;
  let top = 72;
  // In the overview the title is big on phones; frame the plate below it.
  if (mode !== 'room' && !wide && vh > vw) top = Math.max(top, ui.brand.offsetTop + ui.brand.offsetHeight + 12);
  let bottom = 76, left = 16, right = 16;
  if (mode === 'room' && !ui.roombar.hidden) {
    // Frame the room around the tray as it rests (peek or hidden). The open
    // sheet is for reading and sits over the scene without moving the camera.
    const r = tray.rectFor(tray.state === 'hidden' ? 'hidden' : 'peek');
    const bar = ui.roombar;
    if (tray.dock() === 'right') {
      right = vw - r.left + 16;
      bottom = vh - bar.offsetTop + 10;
    } else {
      top = bar.offsetTop + bar.offsetHeight + 10;
      bottom = vh - r.top + 12;
    }
  }
  return { top, bottom, left, right };
}

function fit(X0, X1, Y0, Y1, pad = 0) {
  const s = insets();
  const aw = vw - s.left - s.right, ah = vh - s.top - s.bottom;
  const z = Math.min(aw / (X1 - X0 + pad * 2), ah / (Y1 - Y0 + pad * 2));
  const cx = (X0 + X1) / 2, cy = (Y0 + Y1) / 2;
  // shift so the content centers inside the free area, not the whole screen
  const offX = (s.left - s.right) / 2, offY = (s.top - s.bottom) / 2;
  return { x: cx - offX / z, y: cy - offY / z, z };
}

function overviewView() {
  // Portrait phones are width-bound: let the print marks fall off the sides so
  // the rooms themselves get the extra size.
  const pad = vw < vh ? 1.5 : 8;
  return fit(-EXTENT - pad, EXTENT + pad, -WALL * ZK - 9, EXTENT + SLAB * ZK + 7);
}

function roomView(i) {
  const [ax, ay] = roomAnchor(rooms[i]);
  return fit(ax - S - 0.5, ax + S + 0.5, ay - WALL * ZK - 1.5, ay + S + SLAB * ZK + 0.5, 0.5);
}

const ROOM_MODE_Z = () => roomView(0).z * 0.55;

const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

function flyTo(to, dur = 1.6, then) {
  if (reduceMotion) dur = 0.01;
  const from = { ...cam };
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  // Pull back a little mid-flight on long hops, like a camera on a crane.
  const arc = Math.min(0.55, (dist * Math.min(from.z, to.z)) / (vw * 3));
  flight = { from, to, t0: performance.now(), dur: dur * 1000, arc, then };
}

function stepFlight(now) {
  if (!flight) return;
  const k = Math.min(1, (now - flight.t0) / flight.dur);
  const e = easeInOut(k);
  const { from, to, arc } = flight;
  cam.x = from.x + (to.x - from.x) * e;
  cam.y = from.y + (to.y - from.y) * e;
  const lz = Math.log(from.z) + (Math.log(to.z) - Math.log(from.z)) * e;
  cam.z = Math.exp(lz - arc * Math.sin(Math.PI * e));
  if (k >= 1) {
    const then = flight.then;
    flight = null;
    if (then) then();
  }
}

// ---------- Modes ----------
// What's on screen in each mode: the room bar and tray inside a room; the
// hint line and the tour button over the whole block.
function showRoomUI(i) {
  const changed = current !== i || mode !== 'room';
  current = i;
  mode = 'room';
  document.body.dataset.mode = 'room';
  ui.hint.hidden = true;
  ui.roombar.hidden = false;
  tray.show(true);
  renderRoomBar();
  tray.render(i);
  layoutVars();
  if (changed) {
    const room = rooms[i];
    // The story shows the first time you arrive (and on every stop of the tour),
    // then lives behind the room name.
    if (tour || !seenStory.has(room.id)) { seenStory.add(room.id); showStory(true, tour ? 7000 : 5200); }
    else showStory(false);
  }
}

function showOverviewUI() {
  mode = 'overview';
  current = -1;
  document.body.dataset.mode = 'overview';
  ui.hint.hidden = false;
  ui.roombar.hidden = true;
  tray.show(false);
  showStory(false);
  layoutVars();
}

function enterRoom(i, o = {}) {
  showRoomUI(i);
  flyTo(roomView(i), o.dur ?? 1.5); // roomView measures the tray and room bar, which are laid out now
}

function toOverview(o = {}) {
  showOverviewUI();
  flyTo(overviewView(), o.dur ?? 1.5);
}

function setTourButtons(on) {
  ui.tour.setAttribute('aria-pressed', String(on));
  ui.tour.textContent = on ? 'Stop tour' : 'Play tour';
  ui.tourRoom.setAttribute('aria-pressed', String(on));
  ui.tourRoom.setAttribute('aria-label', on ? 'Stop tour' : 'Play tour');
}
function startTour() {
  tour = { i: 0, next: 0, dwell: false };
  setTourButtons(true);
}
function stopTour() {
  if (!tour) return;
  tour = null;
  setTourButtons(false);
}

let lastT = 0;
function stepTour(t, dt) {
  if (!tour) return;
  if (tour.dwell && !flight) {
    // slow drift across the room while we linger
    cam.x += dt * 0.35;
    cam.y -= dt * 0.08;
  }
  if (flight || t < tour.next) return;
  if (tour.i >= tourOrder.length) {
    tour.dwell = false;
    toOverview({ dur: 3 });
    tour.i = 0;
    tour.next = t + 3 + 4.5;
    return;
  }
  const i = tourOrder[tour.i++];
  tour.dwell = false;
  enterRoom(i, { dur: 2.2 });
  setTimeout(() => { if (tour) tour.dwell = true; }, 2300);
  tour.next = t + 2.2 + 5.5;
}

// ---------- Room bar + story ----------
function renderRoomBar() {
  const room = rooms[current];
  if (!room) return;
  ui.unit.textContent = `Unit ${room.col + 1}${'ABCD'[room.row]}`;
  ui.name.textContent = room.def.name;
  ui.storyText.textContent = room.def.blurb;
  ui.pill.setAttribute('aria-label', `${room.def.name}, unit ${room.col + 1}${'ABCD'[room.row]}. Show the story`);
}

const seenStory = new Set();
let storyTimer = 0;
function showStory(v, ms = 0) {
  clearTimeout(storyTimer);
  const was = !ui.story.hidden;
  ui.story.hidden = !v;
  ui.pill.setAttribute('aria-expanded', String(v));
  if (v && !was && !reduceMotion) {
    ui.story.animate([{ opacity: 0, transform: 'translateY(-6px) scale(0.97)' }, { opacity: 1, transform: 'none' }],
      { duration: 280, easing: 'cubic-bezier(.2, 1.2, .4, 1)' });
  }
  if (v && ms) storyTimer = setTimeout(() => showStory(false), ms);
}
ui.pill.addEventListener('click', () => showStory(ui.story.hidden));

// ---------- The find list ----------
const tray = createTray({
  rooms,
  order: tourOrder,
  reduceMotion,
  isFound: (room, f) => found.has(keyOf(room, f)),
  foundAge: (room, f) => { const at = foundAt.get(keyOf(room, f)); return at ? performance.now() - at : Infinity; },
  label: (room, f) => (f.goose ? 'The goose' : f.label),
  onHint: (room, f) => {
    // On a phone the open sheet would cover the nudge; drop it back to the chips.
    if (tray.dock() === 'bottom' && tray.state === 'open') tray.setState('peek');
    showHint(room, f);
  },
  onGoRoom: (i) => {
    userAct();
    if (tray.dock() === 'bottom' && tray.state === 'open') tray.setState('peek');
    enterRoom(i, { dur: 1.3 });
  },
  onStateChange: (prev, next) => {
    layoutVars();
    if (next === 'open' && tray.dock() === 'bottom') showStory(false);
    const moved = prev === next || (prev === 'hidden') !== (next === 'hidden');
    if (moved && mode === 'room' && current >= 0 && !tour) flyTo(roomView(current), 0.55);
  },
});

// The side panel pushes the tallies over; CSS reads its width from here.
function layoutVars() {
  const w = mode === 'room' && tray.dock() === 'right' ? tray.rectFor(tray.state === 'hidden' ? 'hidden' : 'peek').width : 0;
  document.body.style.setProperty('--tray-w', Math.round(w) + 'px');
}

function renderTally() {
  let g = 0, n = 0;
  for (const r of rooms) for (const f of r.finds) if (found.has(keyOf(r, f))) f.goose ? g++ : n++;
  bumpText(ui.geese, `${g}/${TOTAL_GEESE}`);
  bumpText(ui.things, `${n}/${TOTAL_THINGS}`);
  return { g, n };
}

// Swap a counter's text and give its pill a little bounce when the number moves.
function bumpText(el, text) {
  if (el.textContent === text) return;
  const first = !el.dataset.set;
  el.textContent = text;
  el.dataset.set = '1';
  if (first || reduceMotion) return;
  const pill = el.closest('.tally-item');
  pill.classList.remove('bump');
  void pill.offsetWidth;
  pill.classList.add('bump');
}

let toastTimer = 0;
function toast(msg) {
  ui.toast.textContent = msg;
  ui.toast.hidden = false;
  ui.toast.classList.remove('show');
  void ui.toast.offsetWidth;
  ui.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { ui.toast.hidden = true; }, 2600);
}

function showHint(room, f) {
  stopTour();
  const i = rooms.indexOf(room);
  if (current !== i || mode !== 'room') enterRoom(i);
  // A ring near the thing, offset a bit so it's a nudge rather than the answer.
  const seed = (f.id.length * 31) % 7;
  hints.push({ room, f, t0: performance.now(), dx: (seed - 3) * 0.35, dy: ((seed * 3) % 5 - 2) * 0.35 });
}

function markFound(room, f) {
  const k = keyOf(room, f);
  if (found.has(k)) return;
  found.add(k);
  foundAt.set(k, performance.now());
  saveFound();
  pops.push({ room, f, t0: performance.now(), kind: 'burst' });
  try { navigator.vibrate && navigator.vibrate(f.goose ? [18, 40, 18] : 12); } catch {}
  const { g, n } = renderTally();
  if (mode === 'room' && current >= 0) tray.render(current);
  if (f.goose) {
    pops.push({ room, f, t0: performance.now(), kind: 'honk' });
    honk();
    if (g === TOTAL_GEESE) { parade = performance.now(); setTimeout(() => { honk(); toOverview({ dur: 2.5 }); }, 1800); }
    toast(g === TOTAL_GEESE ? 'Every goose, found. The block thanks you.' : `HONK. Goose ${g} of ${TOTAL_GEESE}.`);
  } else {
    toast(`Found: ${f.label.toLowerCase()} (${n}/${TOTAL_THINGS})`);
  }
}

// ---------- Sound ----------
// A synthesized honk: two detuned buzzy oscillators through a nasal band-pass.
let audio = null;
function honk() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = audio.currentTime;
    for (const at of [0, 0.3]) {
      const t = t0 + at;
      const f = audio.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1150;
      f.Q.value = 2.2;
      const g = audio.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
      f.connect(g);
      g.connect(audio.destination);
      for (const [type, hz] of [['sawtooth', 430], ['square', 436]]) {
        const o = audio.createOscillator();
        o.type = type;
        o.frequency.setValueAtTime(hz, t);
        o.frequency.exponentialRampToValueAtTime(hz * 0.7, t + 0.24);
        o.connect(f);
        o.start(t);
        o.stop(t + 0.28);
      }
    }
  } catch {}
}

// ---------- Rendering ----------
function worldToScreen(X, Y) {
  return [(X - cam.x) * cam.z + vw / 2, (Y - cam.y) * cam.z + vh / 2];
}
function screenToWorld(sx, sy) {
  return [(sx - vw / 2) / cam.z + cam.x, (sy - vh / 2) / cam.z + cam.y];
}

// ---------- Snapshots ----------
// Only the room you're in is drawn live every frame. Every other visible room is
// a snapshot bitmap, and snapshots are re-rendered a few per frame (oldest first)
// within a small time budget, so the whole block keeps moving without the cost.
const SNAP_STEPS = [4, 5, 6, 7, 8, 10, 12, 14, 17, 20, 24, 28, 32];
const SNAP_CAP = 32;
const SNAP_BUDGET_MS = 6;
// Pick the smallest step at or above the screen's scale. A bitmap drawn a bit
// smaller than it was rendered stays crisp; one stretched larger goes soft,
// which is what made the block look blurry on phones.
function snapScaleFor(k) {
  const need = Math.min(SNAP_CAP, k * 0.95);
  for (const v of SNAP_STEPS) if (v >= need) return v;
  return SNAP_CAP;
}
// Each frame earns SNAP_BUDGET_MS of credit; a snapshot spends what it actually
// took. Expensive snapshots (big, zoomed in) therefore happen less often.
let snapCredit = 0;
function refreshSnapshots(list, t, k) {
  const want = snapScaleFor(k);
  // Catch up faster when neighbors are still at a much lower resolution than the view.
  const blurry = list.some((r) => r.snapScale && r.snapScale < want * 0.5);
  const budget = blurry ? SNAP_BUDGET_MS * 2.5 : SNAP_BUDGET_MS;
  snapCredit = Math.min(snapCredit + budget, budget * 3);
  const order = list.slice().sort((a, b) =>
    (a.snap ? 1 : 0) - (b.snap ? 1 : 0) ||
    (a.snapScale === want ? 1 : 0) - (b.snapScale === want ? 1 : 0) ||
    a.snapT - b.snapT);
  for (const r of order) {
    if (r.snap && snapCredit <= 0) break;
    const s0 = performance.now();
    // A room with no picture yet always gets one now, but a cheap one if we're
    // out of time this frame; it sharpens up on a later frame.
    snapshotRoom(r, r.snap || snapCredit > 0 ? want : Math.min(want, 8), t, dpr);
    snapCredit -= performance.now() - s0;
  }
}

const perf = { ms: 0, snap: 0, focus: 0, gap: 16 };
// Drop from 3x to 2x if frames stay slow (under ~35 fps) for a couple of seconds.
let slowFrames = 0;
function watchFrameRate(gap) {
  if (!(gap > 0) || gap > 0.25 || document.hidden) return; // tab switches, first frame
  perf.gap = perf.gap * 0.95 + gap * 1000 * 0.05;
  if (dpr <= 2 || performance.now() < 4000) return;
  slowFrames = perf.gap > 28 ? slowFrames + 1 : 0;
  if (slowFrames > 90) {
    dprCap = 2;
    slowFrames = 0;
    sizeCanvas();
    for (const r of rooms) dropBackdrop(r);
  }
}
function frame(now) {
  const f0 = performance.now();
  const t = now / 1000;
  const dt = Math.min(0.05, t - lastT || 0);
  watchFrameRate(t - lastT);
  lastT = t;
  stepFlight(now);
  stepTour(t, dt);
  stepInertia(dt);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const k = cam.z * dpr;
  ctx.setTransform(k, 0, 0, k, dpr * (vw / 2 - cam.x * cam.z - box.x), dpr * (vh / 2 - cam.y * cam.z - box.y));
  setScreen(k, dpr);
  Q.lines = true;
  Q.detail = true;
  drawBackdrop(ctx, t);

  // Cutaway: when you're inside a room, rooms in front of it are cut away
  // around its silhouette so their walls never hide it.
  const focus = mode === 'room' && current >= 0 ? rooms[current] : null;
  for (const r of rooms) if (r !== focus && r.backdrop) dropBackdrop(r);
  let cut = null;
  if (focus) {
    const [fx, fy] = roomAnchor(focus);
    const H = WALL + 0.3;
    const t0 = -0.45; // wall thickness
    const sil = [[t0, S, H], [t0, t0, H], [S, t0, H], [S, t0, -SLAB], [S, S, -SLAB], [t0, S, -SLAB]];
    const [w0x, w0y] = screenToWorld(box.x - 10, box.y - 10);
    const [w1x, w1y] = screenToWorld(box.x + box.w + 10, box.y + box.h + 10);
    cut = new Path2D();
    cut.rect(w0x, w0y, w1x - w0x, w1y - w0y);
    sil.forEach(([x, y, z], i) => {
      const X = fx + isoX(x, y);
      const Y = fy + isoY(x, y, z);
      i ? cut.lineTo(X, Y) : cut.moveTo(X, Y);
    });
    cut.closePath();
  }

  const b = ROOM_BOUNDS;
  const visible = drawOrder.filter((room) => {
    const [ax, ay] = roomAnchor(room);
    const [sx0, sy0] = worldToScreen(ax + b.x0, ay + b.y0);
    const [sx1, sy1] = worldToScreen(ax + b.x1, ay + b.y1);
    return !(sx1 < box.x || sx0 > box.x + box.w || sy1 < box.y || sy0 > box.y + box.h);
  });
  // Let go of big pictures of rooms that have been off screen for a while.
  for (const r of rooms) if (r.snap && r.snapScale >= 17 && t - r.snapT > 6 && !visible.includes(r)) dropSnapshot(r);
  const p0 = performance.now();
  refreshSnapshots(visible.filter((r) => r !== focus), t, k);
  perf.snap = perf.snap * 0.9 + (performance.now() - p0) * 0.1;
  setScreen(k, dpr);

  for (const room of visible) {
    const [ax, ay] = roomAnchor(room);
    const drop = introDrop(room, now);
    if (drop && drop.a <= 0) continue;
    ctx.save();
    if (cut && room !== focus && room.col + room.row > focus.col + focus.row) ctx.clip(cut, 'evenodd');
    ctx.translate(ax, ay);
    if (drop) { ctx.translate(0, drop.dy); ctx.globalAlpha = drop.a; }
    if (room === focus) {
      const q0 = performance.now();
      Q.lines = k > 6;
      Q.detail = k > 4.5;
      // Cache the backdrop once the camera settles; redraw it live while it moves.
      const still = !flight && !pinch && !inertia;
      if (still && room.backdropScale !== k) { bakeBackdrop(room, k, dpr); setScreen(k, dpr); }
      if (still && room.backdrop) {
        drawRoomBackdrop(ctx, room);
        drawRoomVector(ctx, room, t, true);
      } else {
        drawRoomVector(ctx, room, t);
      }
      perf.focus = perf.focus * 0.9 + (performance.now() - q0) * 0.1;
    } else if (!room.snap) {
      Q.lines = k > 6;
      Q.detail = k > 4.5;
      drawRoomVector(ctx, room, t);
    } else {
      drawSnapshot(ctx, room);
    }
    Q.lines = true;
    Q.detail = true;
    drawMarks(ctx, room, t, now);
    ctx.restore();
  }
  Q.detail = k > 4.5;
  drawSky(ctx, t, cam.z, parade ? (now - parade) / 1000 : 0);
  Q.detail = true;
  drawPops(ctx, now, t);
  perf.ms = perf.ms * 0.9 + (performance.now() - f0) * 0.1;
  requestAnimationFrame(frame);
}

// Opening: the rooms drop onto the plate one diagonal at a time, back to front.
let introT0 = 0;
function introDrop(room, now) {
  if (!introT0) return null;
  if (now - introT0 > 2500) { introT0 = 0; return null; }
  const delay = (room.col + room.row) * 95 + ((room.col * 53 + room.row * 29) % 60);
  const k = (now - introT0 - delay) / 780;
  if (k >= 1) return null;
  if (k <= 0) return { dy: -12, a: 0 };
  const c = 1.9; // ease-out-back: overshoot a touch, then settle
  const e = 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
  return { dy: -12 * (1 - e), a: Math.min(1, k * 2.5) };
}

// Coral pen loops around everything found, plus hint rings.
function drawMarks(ctx, room, t, now) {
  const lw = 2.4 / cam.z;
  for (const f of room.finds) {
    if (!found.has(keyOf(room, f))) continue;
    const [x, y, z] = findPos(f, t);
    const r = Math.max(f.r * 1.05, 16 / cam.z);
    const at = foundAt.get(keyOf(room, f));
    const k = at && !reduceMotion ? Math.min(1, (now - at) / 520) : 1;
    penLoop(ctx, isoX(x, y), isoY(x, y, z), r, lw, f.id.length, C.coral, 1 - Math.pow(1 - k, 3));
  }
  for (let i = hints.length - 1; i >= 0; i--) {
    const h = hints[i];
    if (h.room !== room) continue;
    const age = (now - h.t0) / 1000;
    if (age > 3.2 || found.has(keyOf(room, h.f))) { hints.splice(i, 1); continue; }
    const [x, y, z] = findPos(h.f, t);
    const X = isoX(x + h.dx, y + h.dy), Y = isoY(x + h.dx, y + h.dy, z);
    const pulse = (age * 1.4) % 1;
    ctx.beginPath();
    ctx.arc(X, Y, 2.2 + pulse * 1.6, 0, Math.PI * 2);
    ctx.strokeStyle = alpha(C.mustard, 1 - pulse);
    ctx.lineWidth = 4 / cam.z;
    ctx.stroke();
  }
}

// A hand-drawn loop. `k` (0..1) is how much of it the pen has drawn so far.
function penLoop(ctx, X, Y, r, lw, seed, color, k = 1) {
  if (k <= 0) return;
  ctx.beginPath();
  const n = 42;
  const end = Math.max(1, Math.round(n * k));
  for (let i = 0; i <= end; i++) {
    const a = -0.6 + (i / n) * (Math.PI * 2 + 0.9);
    const w = 1 + Math.sin(a * 3 + seed) * 0.05 + (i / n) * 0.08;
    const px = X + Math.cos(a) * r * 1.25 * w;
    const py = Y + Math.sin(a) * r * 0.85 * w;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function drawPops(ctx, now, t) {
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i];
    const age = (now - p.t0) / 1000;
    if (age > (p.kind === 'honk' ? 1.6 : p.kind === 'burst' ? 0.7 : 0.5)) { pops.splice(i, 1); continue; }
    if (p.kind === 'burst') {
      // A splash of ink flecks, in screen-sized units so it reads at any zoom.
      const [ax, ay] = roomAnchor(p.room);
      const [x, y, z] = findPos(p.f, t);
      const X = ax + isoX(x, y), Y = ay + isoY(x, y, z);
      const e = 1 - Math.pow(1 - age / 0.7, 3);
      const inks = [C.coral, C.mustard, C.teal, C.coral, C.pink, C.mustard, C.coral, C.teal];
      for (let j = 0; j < 8; j++) {
        const a = (j / 8) * Math.PI * 2 + p.f.id.length;
        const d = (18 + 26 * e + (j % 3) * 6) / cam.z;
        const rr = (3.2 * (1 - e) + 0.6) / cam.z;
        ctx.beginPath();
        ctx.arc(X + Math.cos(a) * d, Y + Math.sin(a) * d * 0.8, rr, 0, Math.PI * 2);
        ctx.fillStyle = inks[j];
        ctx.fill();
      }
      continue;
    }
    if (p.kind === 'honk') {
      const [ax, ay] = roomAnchor(p.room);
      const [x, y, z] = findPos(p.f, t);
      const X = ax + isoX(x, y), Y = ay + isoY(x, y, z + 1.3);
      const s = Math.min(1, age * 6) * (1 / Math.max(0.6, cam.z / 14));
      ctx.save();
      ctx.translate(X, Y);
      ctx.scale(s, s);
      ctx.font = `1.4px "Bagel Fat One", "Arial Black", sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 0.35;
      ctx.strokeStyle = C.paper;
      ctx.strokeText('HONK!', 0, -age * 1.2);
      ctx.fillStyle = C.coral;
      ctx.fillText('HONK!', 0, -age * 1.2);
      ctx.restore();
    } else {
      const [X, Y] = p.at;
      ctx.beginPath();
      ctx.arc(X, Y, (6 + age * 40) / cam.z, 0, Math.PI * 2);
      ctx.strokeStyle = alpha(C.ink, 0.5 * (1 - age / 0.5));
      ctx.lineWidth = 1.5 / cam.z;
      ctx.stroke();
    }
  }
}

// ---------- Hit testing ----------
function roomAtScreen(sx, sy) {
  const [X, Y] = screenToWorld(sx, sy);
  // Test the floor first, then a few heights so taps on walls and tall things count.
  const cands = [];
  for (const z of [0, 2, 4, 6]) {
    const [wx, wy] = unproject(X, Y + z * ZK);
    const col = Math.floor(wx / PITCH), row = Math.floor(wy / PITCH);
    if (col < 0 || row < 0 || col >= GRID || row >= GRID) continue;
    const lx = wx - col * PITCH, ly = wy - row * PITCH;
    if (lx < -0.5 || ly < -0.5 || lx > S || ly > S) continue;
    if (z > 0 && lx > 1.2 && ly > 1.2) continue; // above the floor only near the back walls
    cands.push(row * GRID + col);
  }
  if (!cands.length) return -1;
  // front-most wins
  cands.sort((a, b) => (rooms[b].col + rooms[b].row) - (rooms[a].col + rooms[a].row));
  return cands[0];
}

function findAtScreen(sx, sy, t) {
  let best = null, bestD = Infinity;
  for (const room of rooms) {
    const [ax, ay] = roomAnchor(room);
    for (const f of room.finds) {
      if (found.has(keyOf(room, f))) continue;
      const [x, y, z] = findPos(f, t);
      const [px, py] = worldToScreen(ax + isoX(x, y), ay + isoY(x, y, z));
      const d = Math.hypot(px - sx, py - sy);
      const r = Math.max(f.r * cam.z, 22);
      if (d < r && d < bestD) { best = { room, f }; bestD = d; }
    }
  }
  return best;
}

function tap(sx, sy) {
  const t = performance.now() / 1000;
  const zoomedIn = cam.z >= ROOM_MODE_Z();
  if (zoomedIn) {
    const hit = findAtScreen(sx, sy, t);
    if (hit) {
      markFound(hit.room, hit.f);
      const i = rooms.indexOf(hit.room);
      if (i !== current || mode !== 'room') showRoomUI(i);
      return;
    }
  }
  const i = roomAtScreen(sx, sy);
  if (i >= 0 && (!zoomedIn || i !== current)) {
    enterRoom(i);
    return;
  }
  pops.push({ kind: 'ripple', t0: performance.now(), at: screenToWorld(sx, sy) });
}

// ---------- Input ----------
const pointers = new Map();
let drag = null, pinch = null, vel = { x: 0, y: 0 }, inertia = false;

function userAct() {
  lastInput = performance.now();
  stopTour();
  flight = null;
  inertia = false;
}

canvas.addEventListener('pointerdown', (e) => {
  if (!ui.story.hidden) showStory(false);
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  userAct();
  if (pointers.size === 1) {
    drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, t: performance.now() };
    vel = { x: 0, y: 0 };
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: cam.z, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
    if (drag) drag.moved = true;
  }
});

canvas.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId)) return;
  const p = pointers.get(e.pointerId);
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX;
  p.y = e.clientY;
  if (pointers.size === 1 && drag) {
    if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) drag.moved = true;
    if (drag.moved) {
      cam.x -= dx / cam.z;
      cam.y -= dy / cam.z;
      const now = performance.now();
      const ddt = Math.max(1, now - drag.t);
      vel = { x: (-dx / cam.z) / ddt * 16, y: (-dy / cam.z) / ddt * 16 };
      drag.t = now;
    }
  } else if (pointers.size === 2 && pinch) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const [wx, wy] = screenToWorld(pinch.mx, pinch.my);
    cam.z = clampZoom(pinch.z * (d / pinch.d));
    cam.x = wx - (mx - vw / 2) / cam.z;
    cam.y = wy - (my - vh / 2) / cam.z;
    pinch.mx = mx;
    pinch.my = my;
    pinch.z = cam.z;
    pinch.d = d;
  }
});

function endPointer(e) {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  if (pointers.size === 0) {
    if (drag && !drag.moved && e.type === 'pointerup') tap(e.clientX, e.clientY);
    else if (drag && drag.moved) inertia = performance.now() - drag.t < 80;
    drag = null;
    pinch = null;
    // A tap may have started a flight into a room; let it land before judging the zoom.
    if (!flight) settleMode();
  } else if (pointers.size === 1) {
    pinch = null;
    const [p] = [...pointers.values()];
    drag = { x: p.x, y: p.y, sx: p.x, sy: p.y, moved: true, t: performance.now() };
  }
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  userAct();
  const f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
  const [wx, wy] = screenToWorld(e.clientX, e.clientY);
  cam.z = clampZoom(cam.z * f);
  cam.x = wx - (e.clientX - vw / 2) / cam.z;
  cam.y = wy - (e.clientY - vh / 2) / cam.z;
  clearTimeout(wheelTimer);
  wheelTimer = setTimeout(settleMode, 250);
}, { passive: false });
let wheelTimer = 0;

function clampZoom(z) {
  const lo = overviewView().z * 0.6, hi = roomView(0).z * 3.5;
  return Math.max(lo, Math.min(hi, z));
}

function stepInertia(dt) {
  if (!inertia) return;
  cam.x += vel.x * dt * 60;
  cam.y += vel.y * dt * 60;
  vel.x *= 0.92;
  vel.y *= 0.92;
  if (Math.hypot(vel.x, vel.y) * cam.z < 0.05) inertia = false;
}

// After free panning/zooming, decide whether we're "in" a room or looking at the block.
function settleMode() {
  if (cam.z < ROOM_MODE_Z()) {
    if (mode !== 'overview') showOverviewUI();
    return;
  }
  const i = roomAtScreen(vw / 2, vh / 2);
  if (i >= 0 && i !== current) showRoomUI(i);
}

// ---------- Buttons + keys ----------
const step = (d) => {
  userAct();
  const at = tourOrder.indexOf(current < 0 ? tourOrder[0] : current);
  const i = current < 0 ? tourOrder[0] : tourOrder[(at + d + tourOrder.length) % tourOrder.length];
  enterRoom(i, { dur: 1.3 });
};
ui.prev.addEventListener('click', () => step(-1));
ui.next.addEventListener('click', () => step(1));
ui.all.addEventListener('click', () => { userAct(); toOverview(); });
for (const b of [ui.tour, ui.tourRoom]) {
  b.addEventListener('click', () => {
    if (tour) { stopTour(); return; }
    userAct();
    startTour();
  });
}
window.addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('input, textarea')) return;
  if (e.key === 'ArrowRight') step(1);
  else if (e.key === 'ArrowLeft') step(-1);
  else if (e.key === 'Escape') {
    if (!ui.story.hidden) showStory(false);
    else if (mode === 'room' && tray.state === 'open' && tray.dock() === 'bottom') tray.setState('peek');
    else { userAct(); toOverview(); }
  }
});

window.addEventListener('resize', () => {
  resize();
  layoutVars();
  if (mode === 'room' && current >= 0) Object.assign(cam, roomView(current));
});

// ---------- Boot ----------
async function boot() {
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('20px "Bagel Fat One"'),
        document.fonts.load('20px "Rethink Sans"'),
      ]),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
  } catch {}
  document.body.dataset.mode = 'overview';
  document.body.dataset.ready = '1';
  showOverviewUI();
  resize();
  if (renderTally().g === TOTAL_GEESE && TOTAL_GEESE > 0) parade = performance.now();
  const start = location.hash.slice(1);
  const si = rooms.findIndex((r) => r.id === start);
  if (si >= 0) {
    enterRoom(si, { dur: 0.01 });
  } else {
    Object.assign(cam, overviewView());
    if (!reduceMotion) introT0 = performance.now() + 150;
    // Open with the tour, like a camera drifting across the plate. Any touch stops it.
    if (!reduceMotion && !window.__noAutoTour) setTimeout(() => { if (performance.now() - lastInput > 3000 && mode === 'overview') startTour(); }, 3500);
  }
  requestAnimationFrame(frame);
  // Come back to the tour after a long idle in overview.
  setInterval(() => {
    if (!tour && !reduceMotion && !window.__noAutoTour && mode === 'overview' && performance.now() - lastInput > 25000) startTour();
  }, 5000);
}
boot();

// Test hook for screenshots.
window.__squares = { perf, rooms, enterRoom, toOverview, cam, stopTour, startTour, markFound };
