// Playing a map: moving between the whole map and one zone, tapping to find
// things, hints, the tallies, the room bar, the story, and what happens when
// you find everything. One play controller serves every map; load() swaps maps.
//
// Screen modes (body[data-mode]):
//   overview - the whole map, with its name and a hint line
//   zone     - one zone framed, with the room bar and the find list (tray)

import { isoX, isoY } from '../engine/iso.js';
import { C, alpha } from '../engine/art.js';
import { findPos } from '../engine/zone.js';
import { createTray } from '../ui/tray.js';
import { play as sound } from './audio.js';

const keyOf = (zone, f) => zone.id + ':' + f.id;

export function createPlay({ camera, store, reduceMotion, on }) {
  // on: { exit(), complete(world), place(mapId, zoneId|null) }
  const { cam, view } = camera;
  const $ = (id) => document.getElementById(id);
  const ui = {
    hud: $('hud'), place: $('place'), placeName: $('place-name'), placeTag: $('place-tagline'),
    hint: $('hint'), toast: $('toast'), geese: $('tally-geese'), things: $('tally-things'),
    roombar: $('roombar'), all: $('all'), prev: $('prev'), next: $('next'),
    pill: $('room-pill'), unit: $('room-unit'), name: $('room-name'), story: $('story'), storyText: $('story-text'),
    places: $('to-places'),
  };

  let world = null;
  let mode = 'overview';
  let current = -1;
  let active = false; // false while the title or picker is up (the map idles behind)
  let attractInsets = null;
  let parade = 0; // when the all-geese victory lap started
  const pops = []; // tap ripples, ink bursts and honks
  const hints = []; // pulsing "look around here" rings
  const foundAt = new Map(); // when each find was circled this visit, so the pen can draw it on
  const seenStory = new Set();

  const isFound = (zone, f) => store.isFound(world.id, keyOf(zone, f));
  const words = () => ({ zone: 'room', hint: '', whole: 'The whole map', complete: 'Every goose, found.', ...world.map.words });

  // ---------- Framing ----------
  // The screen area the map gets, after the UI chrome around it.
  function insets() {
    if (!active && attractInsets) return attractInsets();
    const { vw, vh } = view;
    const wide = vw >= 900;
    let top = 72;
    // In the overview the place name is big on phones; frame the map below it.
    if (mode !== 'zone' && !wide && vh > vw) top = Math.max(top, ui.place.offsetTop + ui.place.offsetHeight + 12);
    let bottom = 76, left = 16, right = 16;
    if (mode === 'zone' && !ui.roombar.hidden) {
      // Frame the zone around the tray as it rests (peek or hidden). The open
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

  const overviewView = () => camera.fit(world.overviewBox(view.vw < view.vh), insets());
  const zoneView = (i) => camera.fit(world.zoneBox(world.zones[i]), insets(), 0.5);
  const zoneModeZ = () => zoneView(current >= 0 ? current : world.order[0]).z * 0.55;
  function clampZoom(z) {
    const lo = overviewView().z * 0.6, hi = zoneView(world.order[0]).z * 3.5;
    return Math.max(lo, Math.min(hi, z));
  }

  // ---------- Modes ----------
  function showZoneUI(i) {
    const changed = current !== i || mode !== 'zone';
    current = i;
    mode = 'zone';
    document.body.dataset.mode = 'zone';
    ui.hint.hidden = true;
    ui.roombar.hidden = false;
    tray.show(true);
    renderRoomBar();
    tray.render(i);
    layoutVars();
    if (changed) {
      const zone = world.zones[i];
      on.place(world.id, zone.id);
      // The story shows the first time you arrive, then lives behind the zone name.
      if (!seenStory.has(zone.id)) { seenStory.add(zone.id); showStory(true, 5200); }
      else showStory(false);
    }
  }

  function showOverviewUI() {
    const changed = mode !== 'overview';
    mode = 'overview';
    current = -1;
    document.body.dataset.mode = 'overview';
    ui.hint.hidden = false;
    ui.roombar.hidden = true;
    tray.show(false);
    showStory(false);
    layoutVars();
    if (changed && active) on.place(world.id, null);
  }

  function enterZone(i, o = {}) {
    showZoneUI(i);
    camera.flyTo(zoneView(i), o.dur ?? 1.5); // zoneView measures the tray and room bar, which are laid out now
  }

  function toOverview(o = {}) {
    showOverviewUI();
    camera.flyTo(overviewView(), o.dur ?? 1.5);
  }

  // ---------- Room bar + story ----------
  function renderRoomBar() {
    const zone = world.zones[current];
    if (!zone) return;
    ui.unit.textContent = zone.tag;
    ui.name.textContent = zone.name;
    ui.storyText.textContent = zone.def.blurb;
    ui.pill.setAttribute('aria-label', `${zone.name}${zone.tag ? ', ' + zone.tag.toLowerCase() : ''}. Show the story`);
  }

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
    reduceMotion,
    isFound: (zone, f) => isFound(zone, f),
    foundAge: (zone, f) => { const at = foundAt.get(world.id + '/' + keyOf(zone, f)); return at ? performance.now() - at : Infinity; },
    label: (zone, f) => (f.goose ? 'The goose' : f.label),
    onHint: (zone, f) => {
      // On a phone the open sheet would cover the nudge; drop it back to the chips.
      if (tray.dock() === 'bottom' && tray.state === 'open') tray.setState('peek');
      showHint(zone, f);
    },
    onGoRoom: (i) => {
      userAct();
      if (tray.dock() === 'bottom' && tray.state === 'open') tray.setState('peek');
      enterZone(i, { dur: 1.3 });
    },
    onStateChange: (prev, next) => {
      layoutVars();
      if (next === 'open' && tray.dock() === 'bottom') showStory(false);
      const moved = prev === next || (prev === 'hidden') !== (next === 'hidden');
      if (moved && mode === 'zone' && current >= 0) camera.flyTo(zoneView(current), 0.55);
    },
  });

  // The side panel pushes the tallies over; CSS reads its width from here.
  function layoutVars() {
    const w = mode === 'zone' && tray.dock() === 'right' ? tray.rectFor(tray.state === 'hidden' ? 'hidden' : 'peek').width : 0;
    document.body.style.setProperty('--tray-w', Math.round(w) + 'px');
  }

  function renderTally() {
    const p = store.progress(world);
    bumpText(ui.geese, `${p.geese}/${world.totalGeese}`);
    bumpText(ui.things, `${p.things}/${world.totalThings}`);
    return p;
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

  function showHint(zone, f) {
    const i = zone.index;
    if (current !== i || mode !== 'zone') enterZone(i);
    // A ring near the thing, offset a bit so it's a nudge rather than the answer.
    const seed = (f.id.length * 31) % 7;
    hints.push({ zone, f, t0: performance.now(), dx: (seed - 3) * 0.35, dy: ((seed * 3) % 5 - 2) * 0.35 });
  }

  function markFound(zone, f) {
    if (!store.markFound(world.id, keyOf(zone, f))) return;
    const now = performance.now();
    foundAt.set(world.id + '/' + keyOf(zone, f), now);
    pops.push({ zone, f, t0: now, kind: 'burst' });
    try { navigator.vibrate && navigator.vibrate(f.goose ? [18, 40, 18] : 12); } catch {}
    const p = renderTally();
    if (mode === 'zone' && current >= 0) tray.render(current);
    const zoneDone = zone.finds.every((x) => isFound(zone, x));
    const allGeese = p.geese === world.totalGeese;
    if (f.goose) {
      pops.push({ zone, f, t0: now, kind: 'honk' });
      sound('honk');
      if (allGeese) {
        parade = now;
        // Let the last honk land, pull back to the whole place, then say so.
        // Skip it if the player has already left this place.
        const w = world;
        const still = () => active && world === w;
        setTimeout(() => {
          if (!still()) return;
          sound('fanfare');
          toOverview({ dur: 2.5 });
          setTimeout(() => { if (still()) on.complete(w); }, 2600);
        }, 1800);
      }
      toast(allGeese ? words().complete : `HONK. Goose ${p.geese} of ${world.totalGeese}.${zoneDone ? ` ${zone.name}, all found.` : ''}`);
    } else {
      sound('pen');
      toast(zoneDone ? `${zone.name}, all found.` : `Found: ${f.label.toLowerCase()} (${p.things}/${world.totalThings})`);
    }
  }

  // ---------- Drawing on top of the map ----------
  // Coral pen loops around everything found, plus hint rings. Called per zone,
  // with ctx at the zone's corner.
  function drawMarks(ctx, zone, t, now) {
    if (!active) return;
    const lw = 2.4 / cam.z;
    for (const f of zone.finds) {
      if (!isFound(zone, f)) continue;
      const [x, y, z] = findPos(f, t);
      const r = Math.max(f.r * 1.05, 16 / cam.z);
      const at = foundAt.get(world.id + '/' + keyOf(zone, f));
      const k = at && !reduceMotion ? Math.min(1, (now - at) / 520) : 1;
      penLoop(ctx, isoX(x, y), isoY(x, y, z), r, lw, f.id.length, C.coral, 1 - Math.pow(1 - k, 3));
    }
    for (let i = hints.length - 1; i >= 0; i--) {
      const h = hints[i];
      if (h.zone !== zone) continue;
      const age = (now - h.t0) / 1000;
      if (age > 3.2 || isFound(zone, h.f)) { hints.splice(i, 1); continue; }
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

  // Ink bursts, honks and tap ripples, in world space over everything.
  function drawPops(ctx, t, now) {
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i];
      const age = (now - p.t0) / 1000;
      if (age > (p.kind === 'honk' ? 1.6 : p.kind === 'burst' ? 0.7 : 0.5)) { pops.splice(i, 1); continue; }
      if (p.kind === 'burst') {
        // A splash of ink flecks, in screen-sized units so it reads at any zoom.
        const [ax, ay] = p.zone.anchor;
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
      } else if (p.kind === 'honk') {
        const [ax, ay] = p.zone.anchor;
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

  // ---------- Tapping ----------
  const lifted = (z) => z.veil > 0.5;

  // For taps, a faded floor above is fair game (tap it to go up). For settling
  // after a pan, only zones that are really there count.
  function zoneAtScreen(sx, sy, skipLifted = false) {
    const [X, Y] = camera.toWorld(sx, sy);
    return world.zoneAt(X, Y, skipLifted ? lifted : null);
  }

  function findAtScreen(sx, sy, t) {
    let best = null, bestD = Infinity;
    for (const zone of world.zones) {
      if (lifted(zone)) continue;
      const [ax, ay] = zone.anchor;
      for (const f of zone.finds) {
        if (isFound(zone, f)) continue;
        const [x, y, z] = findPos(f, t);
        const [px, py] = camera.toScreen(ax + isoX(x, y), ay + isoY(x, y, z));
        const d = Math.hypot(px - sx, py - sy);
        const r = Math.max(f.r * cam.z, 22);
        if (d < r && d < bestD) { best = { zone, f }; bestD = d; }
      }
    }
    return best;
  }

  function tap(sx, sy) {
    if (!active) return;
    const t = performance.now() / 1000;
    const zoomedIn = cam.z >= zoneModeZ();
    if (zoomedIn) {
      const hit = findAtScreen(sx, sy, t);
      if (hit) {
        markFound(hit.zone, hit.f);
        if (hit.zone.index !== current || mode !== 'zone') showZoneUI(hit.zone.index);
        return;
      }
    }
    const i = zoneAtScreen(sx, sy);
    if (i >= 0 && (!zoomedIn || i !== current)) {
      enterZone(i);
      return;
    }
    pops.push({ kind: 'ripple', t0: performance.now(), at: camera.toWorld(sx, sy) });
  }

  // After free panning/zooming, decide whether we're in a zone or looking at the whole map.
  function settle() {
    if (!active) return;
    if (cam.z < zoneModeZ()) {
      if (mode !== 'overview') showOverviewUI();
      return;
    }
    const i = zoneAtScreen(view.vw / 2, view.vh / 2, true);
    if (i >= 0 && i !== current) showZoneUI(i);
  }

  function userAct() {
    camera.stop();
  }

  // ---------- Buttons + keys ----------
  const step = (d) => {
    userAct();
    const order = world.order;
    const at = order.indexOf(current);
    const i = current < 0 ? order[0] : order[(at + d + order.length) % order.length];
    enterZone(i, { dur: 1.3 });
  };
  ui.prev.addEventListener('click', () => step(-1));
  ui.next.addEventListener('click', () => step(1));
  ui.all.addEventListener('click', () => { userAct(); toOverview(); });
  ui.places.addEventListener('click', () => on.exit());
  window.addEventListener('keydown', (e) => {
    if (!active || (e.target.closest && e.target.closest('input, textarea'))) return;
    if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'Escape') {
      if (!ui.story.hidden) showStory(false);
      else if (mode === 'zone' && tray.state === 'open' && tray.dock() === 'bottom') tray.setState('peek');
      else if (mode === 'zone') { userAct(); toOverview(); }
      else on.exit();
    }
  });

  // ---------- Loading maps, starting and stopping ----------
  function setPlaceTitle(name, tagline) {
    // One span per letter so they can drop in like the title.
    ui.placeName.setAttribute('aria-label', name);
    ui.placeName.replaceChildren(...[...name].map((ch, i) => {
      const s = document.createElement('span');
      s.setAttribute('aria-hidden', 'true');
      s.textContent = ch;
      s.style.setProperty('--i', i);
      if (ch === ' ') s.className = 'sp';
      return s;
    }));
    ui.placeTag.textContent = tagline;
  }

  function load(w) {
    if (world === w) return;
    world = w;
    mode = 'overview';
    current = -1;
    hints.length = 0;
    pops.length = 0;
    seenStory.clear();
    tray.use({ rooms: world.zones, order: world.order });
    setPlaceTitle(world.map.name, world.map.tagline);
    ui.hint.textContent = words().hint;
    ui.all.setAttribute('aria-label', words().whole);
    ui.geese.dataset.set = '';
    ui.things.dataset.set = '';
    const p = renderTally();
    parade = p.geese === world.totalGeese && world.totalGeese > 0 ? performance.now() : 0;
  }

  // Start playing the loaded map, at its overview or straight into a zone.
  // o.fresh: the map just dropped in, so start from its overview.
  // o.jump: land in the zone without a flight (a link straight to a room).
  function start(zoneId, o = {}) {
    active = true;
    ui.hud.hidden = false;
    const i = zoneId ? world.indexOf(zoneId) : -1;
    showOverviewUI();
    if (o.fresh) camera.jumpTo(overviewView());
    if (i >= 0) {
      enterZone(i, { dur: o.jump ? 0.01 : 1.5 });
      if (o.jump) camera.jumpTo(zoneView(i));
    } else {
      on.place(world.id, null);
      if (!o.fresh) camera.flyTo(overviewView(), 1.2);
    }
  }

  // Idle the map behind the title screen or picker: no HUD, a slow drift.
  // o.fresh: the map just dropped in, so start the drift from its overview.
  function attract(getInsets, o = {}) {
    active = false;
    attractInsets = getInsets || null;
    ui.hud.hidden = true;
    showStory(false);
    tray.show(false);
    mode = 'overview';
    current = -1;
    document.body.dataset.mode = 'overview';
    layoutVars();
    if (!world) return;
    if (o.fresh) camera.jumpTo(overviewView());
    camera.startDrift(overviewView());
  }

  function resize() {
    layoutVars();
    if (!world) return;
    if (!active) { camera.startDrift(overviewView()); return; }
    if (camera.flying) return;
    camera.jumpTo(mode === 'zone' && current >= 0 ? zoneView(current) : overviewView());
  }

  return {
    load,
    start,
    attract,
    resize,
    tap,
    settle,
    clampZoom: (z) => (world ? clampZoom(z) : z),
    down() {
      if (!ui.story.hidden) showStory(false);
      userAct();
    },
    markFound,
    enterZone: (i, o) => enterZone(typeof i === 'string' ? world.indexOf(i) : i, o),
    toOverview,
    drawMarks,
    drawPops,
    get world() { return world; },
    get focus() { return active && mode === 'zone' && current >= 0 ? world.zones[current] : null; },
    get active() { return active; },
    fx: (now) => ({ parade: parade ? (now - parade) / 1000 : 0 }),
  };
}
