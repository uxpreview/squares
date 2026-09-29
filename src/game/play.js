// Playing a map: moving between the whole map and one zone, tapping to find
// things, hints, the tallies, the room bar, the story, the lift, and what
// happens when you find everything. One play controller serves every map;
// load() swaps maps.
//
// Screen modes (body[data-mode]):
//   overview - the whole map, with its name (and, on a first visit, an
//              invitation pinned to a room: where to start)
//   zone     - one zone framed, with the room bar and the find list (tray)
//
// Maps with named storeys (map.storeys) show one storey at a time in the
// overview, with the ones above lifted away; a lift panel changes floors.
//
// A whodunit (a map with a case file, see src/game/case.js) swaps the things
// tally for a Case button, calls its finds evidence or curiosities, and ends
// when you accuse the right suspect: a flash of lightning, and the camera cuts
// to the reveal.
//
// A place whose clock matters (the tide at Plum Island, where some finds only
// show at low or high water) has a dial (map.dial): it says what the clock
// says now, and a tap skips ahead to the next turn, the scene running fast
// for a second or two. A find can be there only some of the time (f.when).

import { isoX, isoY } from '../engine/iso.js';
import { C, alpha } from '../engine/art.js';
import { findPos } from '../engine/zone.js';
import { createTray } from '../ui/tray.js';
import { createCasefile } from '../ui/casefile.js';
import { play as sound, bed, wake } from './audio.js';
import { caseState, accuse as accuseIn } from './case.js';

const keyOf = (zone, f) => zone.id + ':' + f.id;

export function createPlay({ camera, store, reduceMotion, clock, setClock, on }) {
  // on: { exit(), complete(world), place(mapId, zoneId|null), refresh() (every area's picture, now) }
  // clock(): the scene's time in seconds, the same t the renderer draws with.
  // setClock(t): move the scene to another moment (the reveal goes back to dinner).
  const { cam, view } = camera;
  const $ = (id) => document.getElementById(id);
  const ui = {
    hud: $('hud'), place: $('place'), placeName: $('place-name'), placeTag: $('place-tagline'),
    invite: $('invite'), inviteTitle: $('invite-title'), inviteText: $('invite-text'), ring: $('invite-ring'), safe: $('safe'),
    toast: $('toast'), geese: $('tally-geese'), things: $('tally-things'),
    roombar: $('roombar'), prev: $('prev'), next: $('next'),
    pill: $('room-pill'), unit: $('room-unit'), name: $('room-name'), story: $('story'), storyText: $('story-text'),
    places: $('to-places'), placesLabel: $('to-places-label'), floors: $('floors'),
    thingsPill: $('tally-things-pill'), caseBtn: $('tally-case'), caseCount: $('tally-case-count'), flash: $('flash'),
    dial: $('dial'), dialLabel: $('dial-label'), dialNext: $('dial-next'),
  };

  const themeColor = document.querySelector('meta[name="theme-color"]');
  const themeDefault = themeColor ? themeColor.content : '';

  let world = null;
  let mode = 'overview';
  let current = -1;
  let storey = 0; // the storey the overview shows (index into world.storeys)
  let entered = false; // stepped into a room of this place yet (this visit)
  let active = false; // false while the title or picker is up (the map idles behind)
  let attractInsets = null;
  let parade = 0; // when the all-geese victory lap started
  const pops = []; // tap ripples, ink bursts and honks
  const hints = []; // pulsing "look around here" rings
  const foundAt = new Map(); // when each find was circled this visit, so the pen can draw it on
  const seenStory = new Set();
  const debug = { finds: false, calls: 0 }; // QA: ring every find that's still hidden; tests: honks so far
  const hasStoreys = () => !!(world && world.map.storeys && world.storeys.length > 1);

  const isFound = (zone, f) => store.isFound(world.id, keyOf(zone, f));
  // Is a find there to be found at t? (Some only show at low tide.)
  const here = (f, t) => !f.when || f.when(t);
  const words = () => ({ zone: 'room', invite: '', hint: '', whole: 'The whole map', complete: 'Every goose, found.', ...world.map.words });
  const isCase = () => !!(world && world.goal === 'case');
  const theCase = () => caseState(world, (key) => store.isFound(world.id, key), store.caseOf(world.id));

  // ---------- Framing ----------
  // The phone's home bar, in px (it only changes with the screen's size).
  let safeFor = '', safeNow = 0;
  function safeBottom() {
    const key = view.vw + 'x' + view.vh;
    if (key !== safeFor) { safeFor = key; safeNow = ui.safe.offsetHeight; }
    return safeNow;
  }

  // The screen area the map gets, after the UI chrome around it.
  function insets() {
    if (!active && attractInsets) return attractInsets();
    const { vw, vh } = view;
    const wide = vw >= 900;
    let top = 72, bottom = 76, left = 16, right = 16;
    if (mode !== 'zone') {
      // On a phone the overview frames the map under the place name (measured,
      // so it's snug whatever the name), with a strip at the bottom that
      // browsers float their bars over. The lift sits in a corner, over the
      // edge of the picture, and doesn't push it.
      const shown = (el) => el.getClientRects().length > 0;
      if (!wide && shown(ui.place)) top = Math.max(56, ui.place.offsetTop + ui.place.offsetHeight + 12);
      bottom = safeBottom() + (vh < 500 ? 32 : 48);
    }
    // The dial sits under the tallies, over the top of the picture.
    if (!ui.dial.hidden && mode === 'zone') top = Math.max(top, ui.dial.offsetTop + ui.dial.offsetHeight + 10);
    if (mode === 'zone' && !ui.roombar.hidden) {
      // Frame the zone around the tray as it rests (peek or hidden). The open
      // sheet is for reading and sits over the scene without moving the camera.
      const r = tray.rectFor(tray.state === 'hidden' ? 'hidden' : 'peek');
      const bar = ui.roombar;
      if (tray.dock() === 'right') {
        right = vw - r.left + 16;
        bottom = vh - bar.offsetTop + 10;
      } else {
        // Phones: the top row above; below, the room bar sitting on the list.
        top = ui.places.getBoundingClientRect().bottom + 12;
        bottom = vh - r.top + 10 + (bar.offsetHeight || 44) + 10;
      }
    }
    return { top, bottom, left, right };
  }

  // The screen area left clear of the completion card, for a finale that
  // plays on behind it: above the card where there's room (a phone held
  // upright, a big screen), beside it where there isn't (a phone on its side,
  // where the card steps to the right).
  function clearOfCard() {
    const base = insets(), { vw, vh } = view;
    const card = document.getElementById('complete');
    if (!card) return base;
    const was = card.hidden;
    card.style.visibility = 'hidden';
    card.hidden = false;
    const r = card.getBoundingClientRect();
    card.hidden = was;
    card.style.visibility = '';
    const above = r.top - base.top - 12, left = r.left - base.left - 12, right = vw - r.right - base.right - 12;
    if (above >= 160 || above >= Math.max(left, right)) return { ...base, bottom: Math.max(base.bottom, vh - r.top + 12) };
    return left >= right ? { ...base, right: Math.max(base.right, vw - r.left + 12) } : { ...base, left: Math.max(base.left, r.right + 12) };
  }

  // The whole map: every zone, and what the overview frames on any screen.
  // The camera keeps it on screen (soft edges), so panning can't lose it.
  let boxFor = null, box = null;
  function mapBox() {
    const key = world.id + '/' + storey;
    if (boxFor === key) return box;
    const id = world.storeys[storey]?.id;
    const all = [world.overviewBox(true, id, false), world.overviewBox(false, id, false), world.overviewBox(false, id, true),
      ...world.zones.map((z) => world.zoneBox(z))];
    box = [Math.min(...all.map((b) => b[0])), Math.max(...all.map((b) => b[1])), Math.min(...all.map((b) => b[2])), Math.max(...all.map((b) => b[3]))];
    boxFor = key;
    return box;
  }
  // The screen area it's framed in, remembered until the UI around the map
  // changes: the edges ask on every frame of a drag, and measuring isn't free.
  let insetsKey = '', insetsNow = null;
  function edgeInsets() {
    const key = [world.id, mode, current, storey, tray.state, tray.dock(), view.vw, view.vh, ui.roombar.hidden, ui.dial.hidden].join();
    if (key !== insetsKey) { insetsKey = key; insetsNow = insets(); }
    return insetsNow;
  }
  camera.setBounds(() => (active && world ? { box: mapBox(), insets: edgeInsets() } : null));

  // About how close a room is framed on this screen (no measuring, so it's
  // cheap enough for every frame): what the pen marks are sized against.
  const roomZ = () => camera.fit(world.zoneBox(world.zones[world.order[0]]), { top: 72, bottom: 190, left: 16, right: 16 }, 0.5).z;

  // Framings land inside the map's edges, so the camera never has to spring back.
  const overviewView = () => camera.clamp(camera.fit(world.overviewBox(view.vw < view.vh, world.storeys[storey]?.id, view.vh < 500), insets()));
  // A long area is framed around a spot (see zoneBox in world.js): the one
  // you tapped, kept while you're there so a resize frames the same spot.
  let near = null;
  const zoneView = (i, at = i === current ? near : null) => camera.clamp(camera.fit(world.zoneBox(world.zones[i], at), insets(), 0.5));
  // Zoomed in this far, a tap looks for finds (and panning lands you in a
  // room). A phone's overview fills the screen, so it sits above that; a
  // room's own framing is always past it.
  function zoneModeZ() {
    const room = zoneView(current >= 0 ? current : world.order[0]).z;
    return Math.min(room * 0.9, Math.max(room * 0.55, overviewView().z * 1.25));
  }
  function clampZoom(z) {
    // Out: until the whole map fits. In: well into a room.
    const lo = Math.min(overviewView().z, camera.fit(mapBox(), insets()).z), hi = zoneView(world.order[0]).z * 3.5;
    return Math.max(lo, Math.min(hi, z));
  }

  // ---------- Modes ----------
  function showZoneUI(i) {
    const changed = current !== i || mode !== 'zone';
    current = i;
    mode = 'zone';
    entered = true;
    // Stepping into a room takes you to its floor (outdoors keeps the one you had).
    if (!world.zones[i].fixed) storey = world.zones[i].storey;
    document.body.dataset.mode = 'zone';
    renderFloors();
    renderBack();
    renderInvite();
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
      closer();
    }
  }

  // Finds are small. A new player who has sat in a room for a while without
  // finding anything, or zooming in, hears that they can look closer. Once.
  const coarse = matchMedia('(pointer: coarse)');
  let closerTimer = 0, closerSaid = false;
  function closer() {
    clearTimeout(closerTimer);
    const none = () => { const p = store.progress(world); return p.geese + p.things === 0; };
    if (closerSaid || !none()) return;
    const w = world, i = current;
    closerTimer = setTimeout(() => {
      if (!active || world !== w || mode !== 'zone' || current !== i || !none() || camera.flying) return;
      if (cam.z > zoneView(i).z * 1.15) return; // already looking closer
      closerSaid = true;
      toast(coarse.matches ? 'Things are small. Pinch to look closer.' : 'Things are small. Scroll to look closer.');
    }, 12000);
  }

  function showOverviewUI() {
    const changed = mode !== 'overview';
    mode = 'overview';
    current = -1;
    document.body.dataset.mode = 'overview';
    ui.roombar.hidden = true;
    tray.show(false);
    renderFloors();
    renderBack();
    renderInvite();
    showStory(false);
    layoutVars();
    if (changed && active) on.place(world.id, null);
  }

  // o.near: a world point [x, y] to frame a long area around.
  function enterZone(i, o = {}) {
    showZoneUI(i);
    near = o.near || null;
    camera.flyTo(zoneView(i), o.dur ?? 1.5); // zoneView measures the tray and room bar, which are laid out now
  }

  function toOverview(o = {}) {
    showOverviewUI();
    camera.flyTo(overviewView(), o.dur ?? 1.5);
  }

  // ---------- Floors: the lift ----------
  // A lift panel in the corner, in thumb reach: every floor, the top one at
  // the top, the one you're on lit. One press goes to any floor (with a ding)
  // and the floors above lift away. It stays put rather than riding on the
  // picture, so it never covers the house and always says where you are.
  // Tapping a faded floor above still goes up, and PageUp and PageDown work.
  let liftFor = null;
  function buildLift() {
    liftFor = world;
    const rows = world.storeys.map((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lift-floor';
      b.dataset.storey = s.id;
      const name = document.createElement('span');
      name.className = 'lift-name';
      name.textContent = s.short || s.name;
      const lamp = document.createElement('span');
      lamp.className = 'lift-btn';
      lamp.setAttribute('aria-hidden', 'true');
      b.append(name, lamp);
      b.addEventListener('click', () => { userAct(); setStorey(i); });
      return b;
    });
    ui.floors.replaceChildren(...rows.reverse());
  }

  function renderFloors() {
    const show = active && hasStoreys() && mode !== 'zone';
    ui.floors.hidden = !show;
    if (!show) return;
    if (liftFor !== world) buildLift();
    for (const b of ui.floors.children) {
      const i = world.storeys.findIndex((s) => s.id === b.dataset.storey), here = i === storey;
      if (here) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
      b.setAttribute('aria-label', world.storeys[i].name + (here ? ', where you are' : ''));
    }
  }

  // ---------- The invitation ----------
  // A first visit to a place (nothing found yet, no room stepped into) gets a
  // card pinned to a room on the map: where to start, and what a tap does,
  // with a ring pinging where to tap. It rides along with the picture
  // (placeInvite, every frame) and goes once you step into a room. A map says
  // what it says (words.invite, words.hint) and where (invite: the zone, the
  // spot the ring marks, and the pin the card points at, which by default is
  // the same spot), in its map.js; invite.phone, if it has one, says where on
  // a phone (a screen under 900px wide).
  function inviteSpot() {
    const all = world.map.invite || {};
    const inv = all.phone && view.vw < 900 ? all.phone : all;
    const i = inv.zone ? world.indexOf(inv.zone) : world.order[0];
    const zone = world.zones[i];
    if (!zone) return null;
    const at = inv.at || [zone.w / 2, zone.d / 2, 0];
    return { zone, at, pin: inv.pin || at };
  }

  function renderInvite() {
    const p = world && store.progress(world);
    const show = !!(active && mode === 'overview' && !entered && words().invite && p && p.geese + p.things === 0);
    if (show) {
      ui.inviteTitle.textContent = words().invite;
      ui.inviteText.textContent = words().hint;
      ui.invite.setAttribute('aria-label', `${words().invite}. ${words().hint}`);
    }
    ui.invite.hidden = !show;
    ui.ring.hidden = !show;
    placeInvite();
  }

  function placeInvite() {
    if (ui.invite.hidden) return;
    const spot = inviteSpot();
    // Its room on another floor (lifted away, or under the one showing):
    // nothing to point at until you're back on its floor.
    const away = !spot || lifted(spot.zone) || (hasStoreys() && !spot.zone.fixed && spot.zone.storey !== storey);
    ui.invite.style.visibility = ui.ring.style.visibility = away ? 'hidden' : '';
    if (away) return;
    const { zone } = spot;
    const screen = ([x, y, z]) => camera.toScreen(zone.anchor[0] + isoX(x, y), zone.anchor[1] - (zone.lift || 0) + isoY(x, y, z));
    const [rx, ry] = screen(spot.at), [px, py] = screen(spot.pin);
    const w = ui.invite.offsetWidth, h = ui.invite.offsetHeight, { vw } = view;
    const left = Math.max(12, Math.min(vw - 12 - w, px - w / 2));
    // (translate, not transform: the card bobs on its transform)
    ui.invite.style.translate = `${Math.round(left)}px ${Math.round(py - h - (spot.pin === spot.at ? 22 : 12))}px`;
    ui.invite.style.setProperty('--tip', Math.round(Math.max(22, Math.min(w - 22, px - left))) + 'px');
    ui.ring.style.translate = `${Math.round(rx)}px ${Math.round(ry)}px`;
  }
  ui.invite.addEventListener('click', () => {
    const spot = inviteSpot();
    if (!spot || !active) return;
    userAct();
    enterZone(spot.zone.index);
  });

  // Back goes up one level: from a room out to the whole place, from there to
  // the places.
  function renderBack() {
    const inRoom = mode === 'zone';
    ui.placesLabel.textContent = inRoom ? world.map.short || world.map.name : 'Places';
    ui.places.setAttribute('aria-label', inRoom ? `Back to ${words().whole.toLowerCase()}` : 'Back to the places');
  }

  function setStorey(i) {
    if (!hasStoreys() || i < 0 || i >= world.storeys.length) return;
    const same = i === storey;
    // The lift arriving: one ding going up, two going down.
    if (!same) sound('ding', { down: i < storey });
    storey = i;
    renderFloors();
    if (mode === 'zone') toOverview({ dur: 1.2 });
    else if (!same) camera.flyTo(overviewView(), 0.9);
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
    keepRoombar();
    document.body.dataset.tray = tray.state;
  }

  // On a phone the room bar sits on the list as it rests (peek or tucked
  // away), 10px above it, and steps out of the way while the whole list is
  // open. --tray-rest is how far the list's top is from the bottom of the box
  // fixed things are placed in (the #safe probe marks that bottom; iOS Safari
  // doesn't always agree with innerHeight about it). tick() checks it every
  // frame, so nothing settling late can leave the two overlapping.
  let restNow = null;
  function keepRoombar() {
    const on = mode === 'zone' && tray.dock() === 'bottom';
    const rest = on ? ui.safe.offsetTop + ui.safe.offsetHeight - tray.rectFor(tray.state === 'hidden' ? 'hidden' : 'peek').top : 0;
    if (rest === restNow) return;
    restNow = rest;
    document.body.style.setProperty('--tray-rest', rest + 'px');
  }

  function renderTally() {
    const p = store.progress(world);
    bumpText(ui.geese, `${p.geese}/${world.totalGeese}`);
    // A whodunit counts its evidence on the Case button instead of things.
    ui.thingsPill.hidden = isCase();
    ui.caseBtn.hidden = !isCase();
    if (isCase()) {
      const solved = store.caseOf(world.id).solved;
      bumpText(ui.caseCount, solved ? 'Solved' : `${p.evidence}/${world.totals.evidence}`);
      ui.caseBtn.classList.toggle('is-solved', solved);
      ui.caseBtn.setAttribute('aria-label', solved ? 'The case file. Case closed.' : `The case file: ${p.evidence} of ${world.totals.evidence} pieces of evidence found. Accuse someone.`);
    } else bumpText(ui.things, `${p.things}/${world.totalThings}`);
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
    if (!pill) return;
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
    // Not there right now (under the tide): say when, and where to skip.
    if (!here(f, clock())) {
      const d = world.map.dial;
      toast(`${f.label} only shows at ${f.note || 'another time'}.${d ? ` Tap ${d.name || 'the dial'} to skip there.` : ''}`);
      nudge(ui.dial);
    }
    // A ring near the thing, offset a bit so it's a nudge rather than the answer.
    const seed = (f.id.length * 31) % 7;
    hints.push({ zone, f, t0: performance.now(), dx: (seed - 3) * 0.35, dy: ((seed * 3) % 5 - 2) * 0.35 });
  }

  function markFound(zone, f) {
    const before = isCase() ? theCase() : null;
    if (!store.markFound(world.id, keyOf(zone, f))) return;
    const now = performance.now();
    foundAt.set(world.id + '/' + keyOf(zone, f), now);
    pops.push({ zone, f, t0: now, kind: 'burst' });
    try { navigator.vibrate && navigator.vibrate(f.goose ? [18, 40, 18] : 12); } catch {}
    const p = renderTally();
    renderInvite();
    if (mode === 'zone' && current >= 0) tray.render(current);
    const zoneDone = zone.finds.every((x) => isFound(zone, x));
    if (isCase()) { caseFound(zone, f, before, p, zoneDone); return; }
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
          // A place with a finale jumps its clock there (the Block Party's
          // party) and frames where it plays for a while before the card.
          const fin = w.map.finale;
          // (A skip on the dial still running gives way to it.)
          if (fin && fin.at != null) { skipping = null; ui.dial.classList.remove('is-skipping'); setClock(fin.at); }
          const fz = fin && fin.zone ? w.indexOf(fin.zone) : -1;
          if (fz >= 0) {
            showOverviewUI();
            camera.flyTo(camera.clamp(camera.fit(w.zoneBox(w.zones[fz], fin.near), clearOfCard(), 0.5)), 2.5);
          } else toOverview({ dur: 2.5 });
          setTimeout(() => { if (still()) on.complete(w); }, fz >= 0 ? (fin.hold || 8) * 1000 : 2600);
        }, 1800);
      }
      toast(allGeese ? words().complete : `HONK. Goose ${p.geese} of ${world.totalGeese}.${zoneDone ? ` ${zone.name}, all found.` : ''}`);
    } else {
      sound('pen');
      toast(zoneDone ? `${zone.name}, all found.` : `Found: ${f.label.toLowerCase()} (${p.things}/${world.totalThings})`);
    }
  }

  // ---------- Whodunits ----------
  // A find in a whodunit: say what it means for the case.
  function caseFound(zone, f, before, p, zoneDone) {
    const after = theCase();
    const was = (id) => before.suspects.find((s) => s.id === id);
    const newSuspect = after.suspects.find((s) => s.culprit && s.ready && !was(s.id).ready);
    const cleared = after.suspects.find((s) => s.cleared && !was(s.id).cleared);
    if (f.goose) {
      pops.push({ zone, f, t0: performance.now(), kind: 'honk' });
      sound('honk');
    } else sound('pen');
    // Your first piece of evidence says what the Case button is for.
    const first = f.group === 'evidence' && p.evidence === 1;
    let msg;
    if (newSuspect) msg = `That's all ${newSuspect.clues} clues. The case file has a new suspect.`;
    else if (cleared) msg = `Evidence: ${cleared.name}'s alibi checks out.`;
    else if (f.goose) msg = 'HONK. You found the goose. It looks very innocent.';
    else if (first) msg = 'Evidence! Tap Case to see who it points at.';
    else if (f.group === 'evidence') msg = `Evidence: ${lower(f.label)} (${p.evidence}/${world.totals.evidence})`;
    else msg = zoneDone ? `${zone.name}, all found.` : `Found: ${lower(f.label)}`;
    toast(msg);
    if (f.group === 'evidence' || newSuspect) nudgeCase(!!newSuspect || first);
    casefile.refresh();
  }
  const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);

  // A button wiggles to say "this one".
  function nudge(el) {
    if (reduceMotion || el.hidden) return;
    el.classList.remove('nudge');
    void el.offsetWidth;
    el.classList.add('nudge');
  }

  // The Case button wiggles when there's news in the case file.
  function nudgeCase(big) {
    if (reduceMotion || !big) return;
    ui.caseBtn.classList.remove('nudge');
    void ui.caseBtn.offsetWidth;
    ui.caseBtn.classList.add('nudge');
  }

  const casefile = createCasefile({
    reduceMotion,
    state: () => theCase(),
    sound,
    nameOf: (id) => (world.map.case.names && world.map.case.names[id]) || id,
    portrait: (ctx, id, w, h, dpr) => world.map.case.portrait(ctx, id, w, h, clock(), dpr),
    accuse: (id) => {
      const out = accuseIn(world, theCase(), id);
      if (out && out.kind === 'wrong') store.accuse(world.id, id);
      renderTally();
      return out;
    },
    onSolved: () => reveal(),
    onClose: () => {},
  });
  ui.caseBtn.addEventListener('click', () => {
    if (!active || !isCase()) return;
    userAct();
    sound('tick');
    casefile.open();
  });

  // The case is closed: a flash of lightning, and in it the camera cuts to
  // the reveal (the goose in the Lord's chair, at dinner), then the card.
  function reveal() {
    const w = world, c = w.map.case;
    const still = () => active && world === w;
    store.solve(w.id);
    casefile.close();
    sound('sting');
    renderTally();
    const cut = () => {
      if (!still()) return;
      setClock(c.reveal.at);
      c.onSolved(clock());
      const i = w.indexOf(c.reveal.zone);
      if (i >= 0) {
        seenStory.add(c.reveal.zone);
        showZoneUI(i);
        camera.jumpTo(zoneView(i));
      }
      sound('thunder', { big: true });
    };
    if (reduceMotion) cut();
    else {
      ui.flash.hidden = false;
      const a = ui.flash.animate([{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }], { duration: 1400, easing: 'ease-out' });
      setTimeout(cut, 300);
      a.onfinish = () => { ui.flash.hidden = true; };
    }
    setTimeout(() => { if (still()) { sound('honk'); on.complete(w); } }, reduceMotion ? 600 : 3000);
  }

  // ---------- The dial: a place's own clock ----------
  // What the place's clock says now (the tide: "Low tide", with its level in
  // the little gauge), and a tap skips ahead to the next turn: the scene
  // runs fast for a moment and lands there, so nobody waits minutes for low
  // water. map.dial: { name, label(t), level(t) 0..1,
  // next(t) => { at, label, say } } (at: the moment to land on, label: what
  // that is, say: a line for when you get there).
  let dialText = '', dialLevel = -1, skipping = null;
  function renderDial(t) {
    const d = active && world && world.map.dial;
    if (ui.dial.hidden === !!d) ui.dial.hidden = !d;
    if (!d) return;
    const label = d.label(t), level = Math.round(d.level(t) * 100) / 100;
    if (label !== dialText) {
      dialText = label;
      const n = d.next(t);
      ui.dialLabel.textContent = label;
      ui.dialNext.textContent = `Skip to ${n.label}`;
      ui.dial.setAttribute('aria-label', `${label}. Skip ahead to ${n.label}.`);
    }
    if (level !== dialLevel) { dialLevel = level; ui.dial.style.setProperty('--level', level); }
  }
  function skipAhead() {
    if (!active || !world || !world.map.dial || skipping) return;
    userAct();
    const from = clock(), n = world.map.dial.next(from);
    sound('tide');
    if (reduceMotion) { setClock(n.at); landed(n); return; }
    skipping = { from, to: n.at, start: performance.now(), dur: 1800, n };
    ui.dial.classList.add('is-skipping');
  }
  ui.dial.addEventListener('click', skipAhead);
  function skipStep() {
    if (!skipping) return;
    const k = Math.min(1, (performance.now() - skipping.start) / skipping.dur);
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    setClock(skipping.from + (skipping.to - skipping.from) * e);
    if (k < 1) return;
    const n = skipping.n;
    skipping = null;
    ui.dial.classList.remove('is-skipping');
    landed(n);
  }
  function landed(n) {
    dialText = '';
    if (n.say) toast(n.say);
    // Every other area's picture, at the moment you landed on.
    if (on.refresh) on.refresh();
  }

  // ---------- Geese calling ----------
  // On the whole map, now and then a room that still hides its goose honks:
  // where to look, without a word, and quiet once you've found it. Not in a
  // whodunit, where the goose's room is a secret.
  const CALL_EVERY = [3.2, 5.6]; // seconds between honks, at random in this range
  let nextCall = 0, lastCaller = null;
  function call(now) {
    if (!active || !world || mode !== 'overview' || isCase() || reduceMotion || camera.flying) return;
    if (now < nextCall) return;
    const first = !nextCall;
    nextCall = now + (CALL_EVERY[0] + Math.random() * (CALL_EVERY[1] - CALL_EVERY[0])) * 1000;
    if (first) return; // the place is still inking in
    const s = edgeInsets(), { vw, vh } = view;
    const seen = (z) => {
      const [sx, sy] = camera.toScreen(...callAt(z));
      return sx > s.left + 20 && sx < vw - s.right - 20 && sy > s.top + 30 && sy < vh - s.bottom;
    };
    // Never on the invitation card (or its ring): the bubble would sit on it.
    const card = !ui.invite.hidden && ui.invite.style.visibility !== 'hidden' ? ui.invite.getBoundingClientRect() : null;
    const clear = (z) => {
      if (!card) return true;
      const [sx, sy] = camera.toScreen(...callAt(z));
      // The bubble is about 80 x 40 px, above its point.
      return sx + 45 < card.left - 8 || sx - 45 > card.right + 8 || sy < card.top - 8 || sy - 45 > card.bottom + 30;
    };
    const left = world.zones.filter((z) => z !== lastCaller && !lifted(z) && z.finds.some((f) => f.goose && !isFound(z, f)) && seen(z) && clear(z));
    if (!left.length) return;
    lastCaller = left[Math.floor(Math.random() * left.length)];
    pops.push({ kind: 'call', zone: lastCaller, t0: now });
    debug.calls++;
  }
  // Over the middle of the room (its first box, for an area of any shape),
  // about head height, on its ground if it has one.
  const callAt = (z) => {
    const [x0, y0, x1, y1] = z.rects[0], x = (x0 + x1) / 2, y = (y0 + y1) / 2;
    const g = z.ground ? Math.max(z.ground(x, y), 0) : 0;
    return [z.anchor[0] + isoX(x, y), z.anchor[1] - (z.lift || 0) + isoY(x, y, g + Math.min(z.h, 6) * 0.6)];
  };

  // A little "HONK!" in a speech bubble, like the signs in the rooms, sized in
  // screen pixels so it reads at any zoom.
  function callBubble(ctx, X, Y, age) {
    const u = 1 / cam.z;
    const grow = reduceMotion ? 1 : 1 - Math.pow(1 - Math.min(1, age / 0.22), 3);
    const fade = Math.min(1, (1.5 - age) / 0.35);
    ctx.save();
    ctx.globalAlpha = Math.max(0, fade);
    ctx.translate(X, Y - age * 10 * u);
    ctx.scale(grow, grow);
    ctx.font = `${14 * u}px "Bagel Fat One", "Arial Black", sans-serif`;
    const text = 'HONK!';
    const w = ctx.measureText(text).width + 18 * u, h = 26 * u, by = -h - 9 * u;
    ctx.beginPath();
    ctx.roundRect(-w / 2, by, w, h, h / 2);
    ctx.moveTo(-5 * u, by + h);
    ctx.lineTo(0, 0);
    ctx.lineTo(6 * u, by + h);
    ctx.fillStyle = C.white;
    ctx.fill();
    ctx.lineWidth = 2 * u;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    ctx.fillStyle = C.coral;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, by + h / 2 + 1 * u);
    ctx.restore();
  }

  // Sounds on the place's clock (thunder after lightning), heard between one
  // frame and the next. A jump in the clock (a tool, the reveal) plays nothing.
  let lastTick = null;
  function tick(t) {
    skipStep();
    renderDial(t);
    placeInvite();
    if (world && world.map.plate && world.map.plate.at && Math.abs(t - plateAtT) > 0.4) printPlate(t);
    // (The open list is measured as it would rest; that's a style change, so
    // it's left to layoutVars rather than done every frame.)
    if (active && mode === 'zone' && tray.state !== 'open') keepRoombar();
    call(performance.now());
    const cues = active && world && world.map.sound && world.map.sound.cues;
    if (!cues) { lastTick = null; return; }
    const loop = world.map.loop || 180;
    const prev = lastTick;
    lastTick = t;
    if (prev == null || t <= prev || t - prev > 1) return;
    const a = ((prev % loop) + loop) % loop, b = ((t % loop) + loop) % loop;
    for (const q of cues) {
      const at = q.at % loop;
      if (a <= b ? at > a && at <= b : at > a || at <= b) sound(q.name, q);
    }
  }

  // ---------- Drawing on top of the map ----------
  // Coral pen loops around everything found, plus hint rings. Called per zone,
  // with ctx at the zone's corner.
  function drawMarks(ctx, zone, t, now) {
    if (!active) return;
    // The pen marks are a readable size in a room. Zoomed out past a room's
    // framing they shrink with the picture, like ink on the page, so the whole
    // map shows small circles rather than loops the size of a table.
    const out = Math.min(1, cam.z / roomZ());
    const lw = Math.max(1.3, 2.4 * out) / cam.z;
    if (debug.finds) {
      // QA overlay: a dashed ring the size of each hidden find's tap area.
      ctx.save();
      ctx.setLineDash([5 / cam.z, 4 / cam.z]);
      for (const f of zone.finds) {
        if (isFound(zone, f) || !here(f, t)) continue;
        const [x, y, z] = findPos(f, t);
        ctx.beginPath();
        ctx.arc(isoX(x, y), isoY(x, y, z), Math.max(f.r, 22 / cam.z), 0, Math.PI * 2);
        ctx.strokeStyle = f.goose ? C.mustard : C.coral;
        ctx.lineWidth = 2 / cam.z;
        ctx.stroke();
      }
      ctx.restore();
    }
    for (const f of zone.finds) {
      // (A find that's gone for now, under the tide, takes its loop with it.)
      if (!isFound(zone, f) || !here(f, t)) continue;
      const [x, y, z] = findPos(f, t);
      const r = Math.max(f.r * 1.05, (16 * out) / cam.z, 5 / cam.z);
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
      if (age > (p.kind === 'honk' ? 1.6 : p.kind === 'call' ? 1.5 : p.kind === 'burst' ? 0.7 : 0.5)) { pops.splice(i, 1); continue; }
      if (p.kind === 'call') {
        // (Gone if you've stepped into a room or left the place meanwhile.)
        if (active && mode === 'overview' && !lifted(p.zone)) callBubble(ctx, ...callAt(p.zone), age);
      } else if (p.kind === 'burst') {
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

  // For taps, a faded floor above is fair game (tap it to go up). In a house
  // with named storeys the lifted floors hover right over the one you're
  // looking at, so there what's really there wins first. For settling after a
  // pan, only zones that are really there count.
  function zoneAtScreen(sx, sy, skipLifted = false) {
    const [X, Y] = camera.toWorld(sx, sy);
    if (skipLifted) return world.zoneAt(X, Y, lifted);
    if (hasStoreys()) {
      const i = world.zoneAt(X, Y, lifted);
      if (i >= 0) return i;
    }
    return world.zoneAt(X, Y);
  }

  // The world point on a zone's floor (or its ground) under a screen point.
  function floorAt(zone, sx, sy) {
    const [X, Y] = camera.toWorld(sx, sy);
    const [lx, ly] = world.floorUnder(zone, X, Y);
    return [zone.ox + lx, zone.oy + ly];
  }

  function findAtScreen(sx, sy, t) {
    let best = null, bestD = Infinity;
    for (const zone of world.zones) {
      if (lifted(zone)) continue;
      const [ax, ay] = zone.anchor;
      for (const f of zone.finds) {
        if (isFound(zone, f) || !here(f, t)) continue;
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
    const t = clock();
    const zoomedIn = cam.z >= zoneModeZ();
    if (zoomedIn) {
      const hit = findAtScreen(sx, sy, t);
      if (hit) {
        markFound(hit.zone, hit.f);
        if (hit.zone.index !== current || mode !== 'zone') {
          showZoneUI(hit.zone.index);
          near = world.long(hit.zone) ? floorAt(hit.zone, sx, sy) : null;
        }
        return;
      }
    }
    const i = zoneAtScreen(sx, sy);
    if (i >= 0 && (!zoomedIn || i !== current)) {
      enterZone(i, { near: world.long(world.zones[i]) ? floorAt(world.zones[i], sx, sy) : null });
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
    // Panned along a long area: that's the spot it's framed around now.
    if (i >= 0 && i === current && world.long(world.zones[i])) near = floorAt(world.zones[i], view.vw / 2, view.vh / 2);
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
  ui.places.addEventListener('click', () => {
    if (mode === 'zone') { userAct(); toOverview(); } else on.exit();
  });
  window.addEventListener('keydown', (e) => {
    if (!active || (e.target.closest && e.target.closest('input, textarea'))) return;
    if (casefile.isOpen && e.key !== 'Escape') return; // the case file has the keys while it's open
    if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'PageUp' && hasStoreys()) { e.preventDefault(); setStorey(storey + 1); }
    else if (e.key === 'PageDown' && hasStoreys()) { e.preventDefault(); setStorey(storey - 1); }
    else if (e.key === 'Escape') {
      if (casefile.back()) return;
      if (!ui.story.hidden) showStory(false);
      else if (mode === 'zone' && tray.state === 'open' && tray.dock() === 'bottom') tray.setState('peek');
      else if (mode === 'zone') { userAct(); toOverview(); }
      else on.exit();
    }
  });

  // ---------- Loading maps, starting and stopping ----------
  function setPlaceTitle(name, tagline) {
    // One span per letter so they can drop in like the title, grouped by word
    // so a long name wraps between words, never inside one.
    ui.placeName.setAttribute('aria-label', name);
    let i = 0;
    const parts = [];
    name.split(' ').forEach((word, w) => {
      if (w) {
        const sp = document.createElement('span');
        sp.className = 'sp';
        sp.setAttribute('aria-hidden', 'true');
        sp.textContent = ' ';
        sp.style.setProperty('--i', i++);
        parts.push(sp);
      }
      const wd = document.createElement('span');
      wd.className = 'word';
      wd.setAttribute('aria-hidden', 'true');
      for (const ch of word) {
        const s = document.createElement('span');
        s.textContent = ch;
        s.style.setProperty('--i', i++);
        wd.append(s);
      }
      parts.push(wd);
    });
    ui.placeName.replaceChildren(...parts);
    ui.placeTag.textContent = tagline;
  }

  // A place printed on a dark plate (a night) prints its loose text, and the
  // title's, in the light ink. (On <html>, so index.html can set it first.)
  // The page and the browser's bars take the place's paper, so a night has
  // no strip of daylight at the top of a phone. A plate that changes with the
  // clock (a day: plate.at(t)) is followed a couple of times a second.
  let platePrinted = null, plateAtT = -1;
  function printPlate(t) {
    const plate = world.map.plate;
    const now = plate && plate.at ? plate.at(t) : plate || {};
    const key = (now.paper || '') + '|' + (now.kind || '');
    plateAtT = t;
    if (key === platePrinted) return;
    platePrinted = key;
    document.documentElement.dataset.plate = now.kind || '';
    if (now.paper) document.documentElement.style.setProperty('--plate', now.paper);
    else document.documentElement.style.removeProperty('--plate');
    if (themeColor) themeColor.content = now.paper || themeDefault;
  }

  function load(w) {
    if (world === w) return;
    world = w;
    mode = 'overview';
    current = -1;
    entered = false;
    hints.length = 0;
    pops.length = 0;
    seenStory.clear();
    storey = world.defaultStorey;
    nextCall = 0;
    lastCaller = null;
    dialText = '';
    dialLevel = -1;
    skipping = null;
    platePrinted = null;
    printPlate(clock());
    // The lift can be the place's own (brass, at the Manor): map.lift.
    const lift = world.map.lift || {};
    for (const k of ['plate', 'ink', 'lamp']) {
      if (lift[k]) document.body.style.setProperty('--lift-' + k, lift[k]);
      else document.body.style.removeProperty('--lift-' + k);
    }
    tray.use({ rooms: world.zones, order: world.order });
    setPlaceTitle(world.map.name, world.map.tagline);
    ui.geese.dataset.set = '';
    ui.things.dataset.set = '';
    ui.caseCount.dataset.set = '';
    // A whodunit's art needs to know if the case was solved on an earlier visit.
    if (isCase()) {
      if (store.caseOf(world.id).solved) world.map.case.onSolved(0);
      else world.map.case.onOpen();
      if (world.map.case.ink) document.body.style.setProperty('--case-ink', world.map.case.ink);
    }
    const p = renderTally();
    parade = !isCase() && p.geese === world.totalGeese && world.totalGeese > 0 ? performance.now() : 0;
  }

  // Start playing the loaded map, at its overview or straight into a zone.
  // o.fresh: the map just dropped in, so start from its overview.
  // o.jump: land in the zone without a flight (a link straight to a room).
  function start(zoneId, o = {}) {
    active = true;
    ui.hud.hidden = false;
    bed(world.map.sound && world.map.sound.bed);
    const i = zoneId ? world.indexOf(zoneId) : -1;
    renderFloors();
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
    bed(null);
    casefile.close();
    showStory(false);
    tray.show(false);
    renderFloors();
    renderInvite();
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

  const focusZone = () => (active && mode === 'zone' && current >= 0 ? world.zones[current] : null);

  // The storey being looked at, for the renderer: zones above it lift away.
  // In a room it's the room's floor; outdoors nothing lifts.
  function level() {
    if (!world) return 0;
    const f = focusZone();
    if (f) return f.fixed ? world.top : f.storey;
    return hasStoreys() ? storey : world.top;
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
      wake();
    },
    tick,
    casefile,
    // Reset the loaded place's progress (QA and tests), including its case.
    reset() {
      store.resetMap(world.id);
      if (isCase()) world.map.case.onOpen();
      renderTally();
      if (mode === 'zone' && current >= 0) tray.render(current);
    },
    markFound,
    skipAhead,
    get skipping() { return !!skipping; },
    enterZone: (i, o) => enterZone(typeof i === 'string' ? world.indexOf(i) : i, o),
    toOverview,
    // Show a storey by id or index (the lift does this).
    setStorey: (s) => setStorey(typeof s === 'string' ? world.storeys.findIndex((x) => x.id === s) : s),
    drawMarks,
    drawPops,
    debug,
    get world() { return world; },
    get focus() { return focusZone(); },
    get level() { return level(); },
    get storey() { return world ? world.storeys[storey] : null; },
    get mode() { return mode; },
    get active() { return active; },
    fx: (now) => ({ parade: parade ? (now - parade) / 1000 : 0 }),
  };
}
