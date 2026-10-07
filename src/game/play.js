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
// A trail (a map with map.trail, see src/game/trail.js) swaps it for a Trail
// button and its log: something is loose, and only the next sighting of it
// can be found (the list hides the ones after). Each one found says where it
// went; the last ends the place, with the map's finale.
//
// Finding is the game's rules (rules.js): finds come in kinds (spot, poke,
// hard); some sit inside things that open on a tap (a poke), and some
// things only look like the goose (a decoy, which answers back). Hints are
// earned and go in two steps, a line and then a ring. A place is finished
// at every goose and most of its things.
//
// A place whose clock matters (the tide at Plum Island, where some finds only
// show at low or high water) has a dial (map.dial): it says what the clock
// says now, and a tap skips ahead to the next turn, the scene running fast
// for a second or two. A find can be there only some of the time (f.when).
// A dial can flip instead (map.dial.flip, Moving Day's before and after):
// the clock jumps to the matching moment on the other side, and the old
// picture melts away over the new one, so what changed jumps out.

import { isoX, isoY } from '../engine/iso.js';
import { C, Q, alpha } from '../engine/art.js';
import { findPos } from '../engine/zone.js';
import { createTray } from '../ui/tray.js';
import { createCasefile } from '../ui/casefile.js';
import { createTrailLog } from '../ui/traillog.js';
import { play as sound, mix, wake } from './audio.js';
import { caseState, accuse as accuseIn } from './case.js';
import { trailState, trailStep } from './trail.js';
import { whereIs } from './rules.js';

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
    toast: $('toast'), geese: $('tally-geese'), hintsLeft: $('tally-hints'), hintsPill: $('tally-hints-pill'),
    roombar: $('roombar'), prev: $('prev'), next: $('next'),
    pill: $('room-pill'), unit: $('room-unit'), name: $('room-name'), story: $('story'), storyText: $('story-text'),
    places: $('to-places'), placesLabel: $('to-places-label'), floors: $('floors'),
    geesePill: $('tally-geese-pill'), caseBtn: $('tally-case'), caseCount: $('tally-case-count'), flash: $('flash'),
    caseLabel: document.querySelector('.tally-case-label'),
    dial: $('dial'), dialLabel: $('dial-label'), dialNext: $('dial-next'), dialBadge: $('dial-badge'),
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
  // Teaching the first verb: a new player who's sat in a room a few seconds
  // without tapping anything that answers back gets a tap ripple on one thing
  // that does (the zone's teach poke). Gone after their first poke.
  const TEACH = { after: 5000, found: 3 };
  let poked = false; // tapped something that answers back, this visit
  let zoneSince = 0; // when we arrived in the room we're in
  const foundAt = new Map(); // when each find was circled this visit, so the pen can draw it on
  const seenStory = new Set();
  const debug = { finds: false, calls: 0, pokes: 0, decoys: 0, step: null }; // QA: ring every find that's still hidden; tests: honks, pokes and decoys so far; step: hold a trail at a sighting
  const hasStoreys = () => !!(world && world.map.storeys && world.storeys.length > 1);

  const isFound = (zone, f) => store.isFound(world.id, keyOf(zone, f));
  // Is a find there to be found at t? (Some only show at low tide.)
  const here = (f, t) => !f.when || f.when(t);
  // Can it be tapped at t? There, and if it's inside something, that's open.
  // (A trail's sighting only once it's the next one.)
  const reach = (f, t) => here(f, t) && (!f.inside || f.inside.k() > 0.6) && (f.step == null || f.step === stepNow());
  const words = () => ({ zone: 'room', invite: '', hint: '', whole: 'The whole map', complete: 'Every goose, found.', ...world.map.words });
  const isCase = () => !!(world && world.goal === 'case');
  const theCase = () => caseState(world, (key) => store.isFound(world.id, key), store.caseOf(world.id));
  const isTrail = () => !!(world && world.goal === 'trail');
  const theTrail = () => trailState(world, (key) => store.isFound(world.id, key));
  // The sighting a trail is on (tools can hold it at one: debug.step).
  const stepNow = () => (debug.step != null ? debug.step : trailStep(world, (key) => store.isFound(world.id, key)));
  // Tell the trail's art where it's got to (and when each was found, for the
  // quarry's getaway).
  const sightedAt = new Map();
  function tellTrail() {
    if (!isTrail() || !world.map.trail.onStep) return;
    world.map.trail.onStep(stepNow(), world.sightings.map((s) => sightedAt.get(world.id + '/' + s.find) ?? null));
    dialText = ''; // (the dial's next skip can follow the trail: say it again)
  }

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
      zoneSince = performance.now();
      // The first time you step into an area with something that's away
      // (under the tide), the dial gives a little jump: it can bring it back.
      if (world.map.dial && !tideNudged.has(zone.id) && zone.finds.some((f) => f.when && !isFound(zone, f) && (f.step == null || f.step <= stepNow()) && !here(f, clock()))) {
        tideNudged.add(zone.id);
        setTimeout(() => nudge(ui.dial), 900);
      }
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
    renderInvite(); // (first: the lift's evidence tags wait for it to go)
    renderFloors();
    renderBack();
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
      const clues = document.createElement('span');
      clues.className = 'lift-clues';
      clues.setAttribute('aria-hidden', 'true');
      clues.hidden = true;
      clues.innerHTML = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="5" cy="5" r="3.3"/><path d="M7.5 7.5 10.5 10.5"/></svg><span></span>';
      b.append(name, clues, lamp);
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
      // Evidence still on that floor, in a whodunit.
      const n = casesOpen() && ui.invite.hidden ? world.zones.filter((z) => z.storey === i).reduce((a, z) => a + cluesLeft(z), 0) : 0;
      const tag = b.querySelector('.lift-clues');
      tag.hidden = !n;
      tag.lastChild.textContent = n ? String(n) : '';
      b.setAttribute('aria-label', world.storeys[i].name + (here ? ', where you are' : '') + (n ? `, ${n} ${n === 1 ? 'piece' : 'pieces'} of evidence left` : ''));
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
    // A trail's sightings after the next one aren't on the list yet.
    shows: (zone, f) => f.step == null || f.step <= stepNow(),
    isFound: (zone, f) => isFound(zone, f),
    foundAge: (zone, f) => { const at = foundAt.get(world.id + '/' + keyOf(zone, f)); return at ? performance.now() - at : Infinity; },
    label: (zone, f) => (f.goose ? 'The goose' : f.label),
    hintStep: (zone, f) => store.hintStep(world.id, keyOf(zone, f)),
    hintLine: (zone, f) => hintLine(zone, f),
    hintsLeft: () => store.progress(world).hints,
    // How the whole place is going, toward finishing it.
    placeLine: () => {
      const p = store.progress(world);
      if (isCase()) return `${p.evidence} of ${world.totals.evidence} pieces of evidence`;
      if (isTrail()) return p.met ? `Caught. ${world.totalThings - p.things} things still out there.` : `Sighting ${p.sightings + 1} of ${world.sightings.length} next`;
      if (p.done) return p.all ? 'Every last thing, found.' : `Finished. ${world.totalThings - p.things} things still out there.`;
      const geese = world.totalGeese - p.geese, things = Math.max(0, world.need - p.things);
      const g = geese ? `${geese} ${geese === 1 ? 'goose' : 'geese'}` : '', t = things ? `${things} ${things === 1 ? 'thing' : 'things'}` : '';
      return `${[g, t].filter(Boolean).join(', ')} to finish`;
    },
    onHint: (zone, f) => {
      // On a phone the open sheet would cover the ring; drop it back to the chips.
      if (tray.dock() === 'bottom' && tray.state === 'open' && store.hintStep(world.id, keyOf(zone, f)) >= 1) tray.setState('peek');
      showHint(zone, f);
    },
    onNoPick: () => toast('Pick something on the list for a hint.'),
    // A find that only shows some of the time (at low tide) and isn't here
    // now: the list says so, and offers the skip to when it's back (free:
    // it says when, never where).
    away: (zone, f) => !!f.when && !isFound(zone, f) && !here(f, clock()),
    skipFor: (zone, f) => { const n = skipFor(f); return n && n.label; },
    skipVerb: () => (world && world.map.dial ? verbOf(world.map.dial) : 'Skip to'),
    onSkip: (zone, f) => skipTo(skipFor(f)),
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
    // Hints left to spend; the things count lives on the list, toward finishing.
    bumpText(ui.hintsLeft, String(p.hints));
    ui.hintsPill.classList.toggle('is-empty', p.hints < 1);
    ui.hintsPill.setAttribute('aria-label', `${p.hints} ${p.hints === 1 ? 'hint' : 'hints'} left. Find ${p.toHint} more for another.`);
    ui.hintsPill.title = `Hints left. Find ${p.toHint} more for another.`;
    // A whodunit's geese aren't the point: the Case button takes their place.
    ui.geesePill.hidden = isCase() || isTrail();
    ui.caseBtn.hidden = !isCase() && !isTrail();
    ui.caseLabel.textContent = isTrail() ? 'Trail' : 'Case';
    if (isTrail()) {
      bumpText(ui.caseCount, p.met ? 'Caught' : `${p.sightings}/${world.sightings.length}`);
      ui.caseBtn.classList.toggle('is-solved', p.met);
      ui.caseBtn.setAttribute('aria-label', p.met ? 'The trail. Caught.' : `The trail: ${p.sightings} of ${world.sightings.length} sightings. Where it went next.`);
    }
    if (isCase()) {
      const solved = store.caseOf(world.id).solved;
      bumpText(ui.caseCount, solved ? 'Solved' : `${p.evidence}/${world.totals.evidence}`);
      ui.caseBtn.classList.toggle('is-solved', solved);
      ui.caseBtn.setAttribute('aria-label', solved ? 'The case file. Case closed.' : `The case file: ${p.evidence} of ${world.totals.evidence} pieces of evidence found. Accuse someone.`);
    }
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
  function toast(msg, ms = 2600) {
    ui.toast.textContent = msg;
    ui.toast.classList.toggle('is-long', msg.length > 60);
    // Under the dial when it's up top, never over it (Moving Day's noon
    // message covered the lease clock).
    const d = !ui.dial.hidden && ui.dial.getBoundingClientRect();
    ui.toast.style.top = d && d.top < innerHeight / 2 ? `${Math.round(d.bottom + 10)}px` : '';
    ui.toast.hidden = false;
    ui.toast.classList.remove('show');
    void ui.toast.offsetWidth;
    ui.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { ui.toast.hidden = true; }, ms);
  }

  // A hint's first step: a line that points. A find's own (hint in R.find),
  // or where it is in the room, roughly.
  function hintLine(zone, f) {
    if (f.hint) return f.hint;
    const t = clock();
    return whereIs(zone, f, findPos(f, t));
  }

  // A hint, a step at a time: the line first (it costs a hint), then a ring
  // near the thing (free once you've had the line), as often as you like.
  function showHint(zone, f) {
    const i = zone.index;
    if (isFound(zone, f)) return;
    const key = keyOf(zone, f);
    const had = store.hintStep(world.id, key);
    const step = store.useHint(world, key);
    if (!step) {
      const p = store.progress(world);
      toast(`No hints left. Find ${p.toHint} more ${p.toHint === 1 ? 'thing' : 'things'} to earn one.`);
      nudge(ui.hintsPill);
      sound('nope');
      return;
    }
    if (current !== i || mode !== 'zone') enterZone(i);
    renderTally();
    tray.pick(zone, f);
    tray.render(i);
    sound('hint');
    if (step === 1 && had === 0) {
      // The line shows on the list, by the thing it's for.
      if (tray.state === 'hidden') tray.setState('peek');
      return;
    }
    // Not there right now (under the tide): say when, and where to skip.
    if (!here(f, clock())) {
      const d = world.map.dial;
      toast(`${f.label} only shows at ${f.note || 'another time'}.${d ? ` Tap ${d.name || 'the dial'} to ${d.flip ? 'flip' : 'skip'} there.` : ''}`);
      nudge(ui.dial);
    }
    // A small ring near the thing, off to one side: close, not the answer.
    const seed = (f.id.length * 31 + f.id.charCodeAt(0)) % 8;
    const a = (seed / 8) * Math.PI * 2;
    hints.push({ zone, f, t0: performance.now(), dx: Math.cos(a) * 0.9, dy: Math.sin(a) * 0.9 });
  }

  function markFound(zone, f) {
    const before = isCase() ? theCase() : null;
    const was = store.progress(world);
    if (!store.markFound(world.id, keyOf(zone, f))) return;
    const now = performance.now();
    foundAt.set(world.id + '/' + keyOf(zone, f), now);
    pops.push({ zone, f, t0: now, kind: 'burst' });
    // Whatever it was inside stays open now.
    if (f.inside) f.inside.pinned = true;
    try { navigator.vibrate && navigator.vibrate(f.goose ? [18, 40, 18] : 12); } catch {}
    const p = renderTally();
    renderInvite();
    if (mode === 'zone' && current >= 0) tray.render(current);
    const zoneDone = zone.finds.every((x) => isFound(zone, x) || (x.step != null && x.step > stepNow()));
    // Every few finds earns a hint.
    const earned = p.hints > was.hints ? ' A hint earned.' : '';
    if (earned) nudge(ui.hintsPill);
    if (isCase()) { caseFound(zone, f, before, p, zoneDone, earned); return; }
    if (isTrail()) { trailFound(zone, f, was, p, zoneDone, earned); return; }
    // Finished: every goose and most of the things (see rules.js).
    const finished = !was.done && p.met;
    if (finished) finish();
    const allGeese = p.geese === world.totalGeese;
    const short = world.need - p.things;
    if (f.goose) {
      pops.push({ zone, f, t0: now, kind: 'honk' });
      sound('honk');
      toast(finished ? words().complete
        : allGeese && short > 0 ? `HONK. That's every goose! ${short} more ${short === 1 ? 'thing' : 'things'} to finish.`
        : `HONK. Goose ${p.geese} of ${world.totalGeese}.${zoneDone ? ` ${zone.name}, all found.` : ''}${earned}`);
    } else {
      sound('pen');
      toast(finished ? words().complete
        : zoneDone ? `${zone.name}, all found.${earned}`
        : `Found: ${lower(f.label)}.${earned}`);
    }
  }

  // A patch of a zone, about span units round a world point on its floor: a
  // finale that plays at one spot (the ship's gangway desk) frames it close,
  // where a room's worth would be wider than a phone's overview.
  function patchBox(zone, near, span) {
    const lx = near[0] - zone.ox, ly = near[1] - zone.oy;
    const X = zone.anchor[0] + isoX(lx, ly), Y = zone.anchor[1] + isoY(lx, ly, 0);
    return [X - span * 1.6, X + span * 1.6, Y - span * 1.4, Y + span * 0.9];
  }

  // The place is finished: let the last find land, pull back to the whole
  // place (or its finale), then the card. Skipped if the player has left.
  function finish() {
    const w = world;
    store.finish(w.id);
    parade = performance.now();
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
        // On a place with floors, the lift goes to the ending's floor first,
        // or it would play under the floors lifted off above it.
        const fzone = w.zones[fz];
        if (hasStoreys() && !fzone.fixed && fzone.storey !== storey) { storey = fzone.storey; renderFloors(); }
        showOverviewUI();
        camera.flyTo(camera.clamp(camera.fit(fin.span ? patchBox(fzone, fin.near, fin.span) : w.zoneBox(fzone, fin.near), clearOfCard(), 0.5)), 2.5);
      } else toOverview({ dur: 2.5 });
      setTimeout(() => { if (still()) on.complete(w); }, fz >= 0 ? (fin.hold || 8) * 1000 : 2600);
    }, 1800);
  }

  // ---------- Pokes and decoys ----------
  // Something that answers a tap: it opens (or shuts), and maybe says a line.
  // A decoy (a swan, say) only answers back.
  function poke(zone, pk) {
    // (Its lines can follow the clock: say(t), someone different by afternoon.)
    const said = typeof pk.say === 'function' ? pk.say(clock()) : pk.say;
    const lines = said ? [].concat(said) : [];
    const line = lines.length ? lines[pk.taps % lines.length] : '';
    pk.taps++;
    poked = true;
    if (pk.decoy) debug.decoys++;
    else {
      debug.pokes++;
      // A find inside keeps it open once found; otherwise a tap opens it, and
      // the next shuts it (unless it shuts on its own: hold).
      if (!pk.pinned) pk.set(pk.hold ? true : !pk.open);
    }
    if (pk.sound) sound(pk.sound);
    try { navigator.vibrate && navigator.vibrate(pk.decoy ? [8, 30, 8] : 8); } catch {}
    if (line) {
      // (One bubble per thing at a time.)
      for (let i = pops.length - 1; i >= 0; i--) if (pops[i].kind === 'say' && pops[i].poke === pk) pops.splice(i, 1);
      pops.push({ kind: 'say', zone, poke: pk, text: line, t0: performance.now() });
    }
  }

  // The thing a new player is nudged to tap in this zone: the one marked
  // teach, else the first that isn't a decoy and has nothing inside it (so the
  // lesson is "things answer back", and no find is given away).
  function teachPoke(zone) {
    // (Only one that's there now: a teach poke can come and go with the clock.)
    const t = clock(), now = (pk) => !pk.when || pk.when(t);
    return zone.pokes.find((pk) => pk.teach && now(pk)) || zone.pokes.find((pk) => !pk.decoy && now(pk) && !zone.finds.some((f) => f.inside === pk)) || null;
  }
  // Is the nudge showing in this zone now?
  function teaching(zone, now) {
    if (poked || mode !== 'zone' || zone.index !== current || now - zoneSince < TEACH.after) return null;
    const p = store.progress(world);
    if (p.geese + p.things >= TEACH.found) return null;
    return teachPoke(zone);
  }

  // After loading a place: whatever holds a find already found stays open.
  function pinPokes() {
    for (const z of world.zones) {
      for (const pk of z.pokes) { pk.pinned = false; pk.open = false; pk.since = -1e9; pk.taps = 0; }
      for (const f of z.finds) if (f.inside && isFound(z, f)) f.inside.pinned = true;
    }
  }

  // ---------- Whodunits ----------
  // A find in a whodunit: say what it means for the case.
  function caseFound(zone, f, before, p, zoneDone, earned = '') {
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
    toast(msg + (newSuspect || cleared || first ? '' : earned));
    if (f.group === 'evidence' || newSuspect) nudgeCase(!!newSuspect || first);
    casefile.refresh();
  }
  const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);

  // ---------- Trails ----------
  // A find on a trail: a sighting says where it went next (the next
  // witness's line); the last one corners it and finishes the place.
  function trailFound(zone, f, was, p, zoneDone, earned = '') {
    if (f.group === 'sighting') {
      sightedAt.set(world.id + '/' + keyOf(zone, f), performance.now());
      tellTrail();
      sound('honk');
      const next = world.sightings[f.step + 1];
      if (!was.done && p.met) {
        toast(words().complete, 7000);
        finish();
      } else if (next) {
        // Where it went (the next witness) and when to look.
        const tr = world.map.trail, who = (tr.names && tr.names[next.who]) || next.who;
        toast(`${f.step + 1} of ${world.sightings.length}! It got away.${next.f.note ? ` Next, at ${next.f.note}.` : ''} ${who}: "${next.says}"`, 6000);
        nudgeCase(true);
      }
      if (mode === 'zone' && current >= 0) tray.render(current);
      traillog.refresh();
      return;
    }
    if (f.goose) {
      pops.push({ zone, f, t0: performance.now(), kind: 'honk' });
      sound('honk');
    } else sound('pen');
    toast(f.goose ? 'HONK. You found the goose. It is at its muster station.' + earned
      : zoneDone ? `${zone.name}, all found.${earned}` : `Found: ${lower(f.label)}.${earned}`);
  }

  const traillog = createTrailLog({
    reduceMotion,
    state: () => theTrail(),
    sound,
    portrait: (ctx, id, w, h, dpr) => world.map.trail.portrait(ctx, id, w, h, clock(), dpr),
    onClose: () => {},
  });

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
    if (!active || (!isCase() && !isTrail())) return;
    userAct();
    sound('tick');
    ui.toast.hidden = true; // (it would sit over the sheet's top)
    if (isTrail()) traillog.open();
    else casefile.open();
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
  const tideNudged = new Set(); // areas whose first visit nudged the dial
  function renderDial(t) {
    const d = active && world && world.map.dial;
    if (ui.dial.hidden === !!d) ui.dial.hidden = !d;
    if (!d) return;
    const label = d.label(t), level = Math.round(d.level(t) * 100) / 100;
    if (label !== dialText) {
      dialText = label;
      const n = d.next(t);
      ui.dialLabel.textContent = label;
      ui.dialNext.textContent = `${verbOf(d)} ${n.label}`;
      ui.dial.setAttribute('aria-label', `${label}. ${verbOf(d)} ${n.label}.`);
      ui.dial.dataset.waiting = ''; // (the badge says its part again)
      waitAt = -1;
    }
    if (level !== dialLevel) { dialLevel = level; ui.dial.style.setProperty('--level', level); }
    renderWaiting(t);
  }
  // How many things the next skip brings back, here (or on the whole place,
  // from the overview), on a badge on the dial; and the list redrawn when a
  // find comes or goes with the tide, so its "now" stays true. Twice a second.
  let waitAt = -1, waitSig = '';
  // Things to find that are away at t and back at then: here, or on the whole
  // place from the overview.
  function comingBack(t, then) {
    let n = 0;
    for (const z of world.zones) {
      if (mode === 'zone' && z.index !== current) continue;
      for (const f of z.finds) if (f.when && !isFound(z, f) && (f.step == null || f.step <= stepNow()) && !here(f, t) && f.when(then)) n++;
    }
    return n;
  }
  function renderWaiting(t) {
    const now = performance.now();
    if (now - waitAt < 500) return;
    waitAt = now;
    const d = world.map.dial, n = d.next(t);
    const back = comingBack(t, n.at);
    let sig = '';
    for (const z of world.zones) {
      for (const f of z.finds) {
        if (!f.when || isFound(z, f) || (f.step != null && f.step > stepNow())) continue;
        sig += here(f, t) ? '1' : '0';
      }
    }
    if (ui.dial.dataset.waiting !== String(back)) {
      ui.dial.dataset.waiting = String(back);
      ui.dialBadge.textContent = back;
      ui.dialBadge.hidden = !back;
      ui.dial.setAttribute('aria-label', `${dialText}. ${verbOf(d)} ${n.label}${back ? `: ${back} ${back === 1 ? 'thing' : 'things'} to find come back` : ''}.`);
    }
    if (sig !== waitSig) {
      const first = !waitSig;
      waitSig = sig;
      if (!first && mode === 'zone' && current >= 0) tray.render(current);
    }
  }
  // What a tap on the dial does, in words ("Skip to low tide", "Flip to after").
  const verbOf = (d) => d.verb || (d.flip ? 'Flip to' : 'Skip to');
  function skipAhead() {
    if (!active || !world || !world.map.dial) return;
    skipTo(world.map.dial.next(clock()));
  }
  // Where to skip so a find that's away is back: the dial's next stop that
  // has it (noon for low tide), else the moment its window opens, a few
  // seconds in. Null on a place without a dial.
  function skipFor(f) {
    const d = world && world.map.dial;
    if (!d || !f.when) return null;
    let t = clock();
    for (let k = 0; k < 4; k++) {
      const n = d.next(t);
      if (f.when(n.at)) return n;
      t = n.at;
    }
    const loop = world.loop || 360;
    for (let s = clock() + 1; s < clock() + loop; s += 0.5) {
      if (!f.when(s)) continue;
      let e = s;
      while (e < s + 6 && f.when(e + 0.5)) e += 0.5;
      return { at: e, label: f.note || 'then', say: `${f.note ? f.note[0].toUpperCase() + f.note.slice(1) : 'There'}. Have a look.` };
    }
    return null;
  }
  function skipTo(n) {
    if (!active || !world || !n || skipping) return;
    userAct();
    const from = clock();
    n = { ...n, back: comingBack(from, n.at) };
    if (world.map.dial && world.map.dial.flip) { flip(n); return; }
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
  // A flip: the picture as it is now is copied onto a sheet over the map, the
  // clock jumps, and the sheet holds a beat and fades, so the eye catches
  // whatever's different (an astronomer's blink comparator, in a second).
  function flip(n) {
    sound('flip');
    const cv = document.getElementById('map');
    if (!reduceMotion && cv && cv.width) {
      document.querySelectorAll('.flip-ghost').forEach((g) => g.remove());
      const g = document.createElement('canvas');
      g.className = 'flip-ghost';
      g.width = cv.width;
      g.height = cv.height;
      g.getContext('2d').drawImage(cv, 0, 0);
      g.setAttribute('aria-hidden', 'true');
      cv.after(g);
      requestAnimationFrame(() => requestAnimationFrame(() => g.classList.add('is-gone')));
      setTimeout(() => g.remove(), 1600);
    }
    setClock(n.at);
    landed(n);
  }
  function landed(n) {
    dialText = '';
    // Say what the skip brought back (the dial's badge counted them), so
    // the number means something.
    const back = n.back || 0;
    const more = back ? ` ${back === 1 ? 'One thing to find is' : `${back} things to find are`} back${mode === 'zone' ? ' here' : ''}.` : '';
    if (n.say || more) toast((n.say || '') + more);
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
    if (!active || !world || mode !== 'overview' || world.goal !== 'geese' || reduceMotion || camera.flying) return;
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
  // Over the middle of the room, about head height, on its ground if it has
  // one. A long area (a street, a park, an island) honks from over its goose,
  // wherever that is, not from the middle of its box (which can be water).
  const callAt = (z) => {
    let [x0, y0, x1, y1] = z.rects[0], x = (x0 + x1) / 2, y = (y0 + y1) / 2;
    const gf = world.long(z) && z.finds.find((f) => f.goose);
    if (gf) [x, y] = findPos(gf, clock());
    const g = z.ground ? Math.max(z.ground(x, y), 0) : 0;
    return [z.anchor[0] + isoX(x, y), z.anchor[1] - (z.lift || 0) + isoY(x, y, g + Math.min(z.h, 6) * 0.6)];
  };

  // A little "HONK!" in a speech bubble, like the signs in the rooms, sized in
  // screen pixels so it reads at any zoom.
  function callBubble(ctx, X, Y, age, text = 'HONK!', size = 14) {
    const u = 1 / cam.z;
    const grow = reduceMotion ? 1 : 1 - Math.pow(1 - Math.min(1, age / 0.22), 3);
    const fade = Math.min(1, (1.5 - age) / 0.35);
    ctx.save();
    ctx.globalAlpha = Math.max(0, fade);
    ctx.translate(X, Y - age * 10 * u);
    ctx.scale(grow, grow);
    ctx.font = `${size * u}px "Bagel Fat One", "Arial Black", sans-serif`;
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

  // ---------- Evidence still out there ----------
  // In a whodunit, the whole house shows which rooms still hold evidence: a
  // small tag over each one, a magnifying glass and how many are left, gone
  // once its last clue is found (and all of them once the case is closed).
  // The lift says the same for each floor. Not while the invitation is up:
  // the first thing to do is go and see the body.
  function cluesLeft(z) {
    let n = 0;
    for (const f of z.finds) if (f.group === 'evidence' && !isFound(z, f)) n++;
    return n;
  }
  const casesOpen = () => world && world.goal === 'case' && !store.caseOf(world.id).solved;
  function drawClues(ctx) {
    if (!active || mode !== 'overview' || !casesOpen() || !ui.invite.hidden) return;
    const u = 1 / cam.z;
    for (const z of world.zones) {
      if (lifted(z) || (hasStoreys() && !z.fixed && z.storey !== storey)) continue;
      const n = cluesLeft(z);
      if (n) clueTag(ctx, ...callAt(z), n, u);
    }
  }
  // A luggage tag on a string: a glass and a number, in the case's ink.
  function clueTag(ctx, X, Y, n, u) {
    const ink = world.map.case.ink || C.coral;
    const text = String(n), h = 20 * u;
    ctx.save();
    ctx.translate(X, Y);
    ctx.font = `${13 * u}px "Bagel Fat One", "Arial Black", sans-serif`;
    const w = ctx.measureText(text).width + 32 * u, by = -h - 8 * u;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, by + h);
    ctx.lineWidth = 1.5 * u;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(-w / 2, by, w, h, 5 * u);
    ctx.fillStyle = C.paper;
    ctx.fill();
    ctx.lineWidth = 2 * u;
    ctx.lineJoin = 'round';
    ctx.stroke();
    // The glass: a ring and a handle.
    const gx = -w / 2 + 12 * u, gy = by + h / 2 - 1 * u;
    ctx.beginPath();
    ctx.arc(gx, gy, 4.5 * u, 0, Math.PI * 2);
    ctx.moveTo(gx + 3.3 * u, gy + 3.3 * u);
    ctx.lineTo(gx + 7 * u, gy + 7 * u);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.2 * u;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, gx + (w - 12 * u) / 2 + 2 * u, by + h / 2 + 1 * u);
    ctx.restore();
  }

  // Sounds on the place's clock (thunder after lightning), heard between one
  // frame and the next. A jump in the clock (a tool, the reveal) plays nothing.
  let lastTick = null;
  // Speech bubbles keep clear of the buttons over the top of the picture
  // (see speech() in art.js): their boxes, in the canvas's own pixels.
  const mapCanvas = document.getElementById('map');
  function keepBubblesClear() {
    if (!active || !mapCanvas) { Q.keepClear = null; return; }
    const r = mapCanvas.getBoundingClientRect();
    if (!r.height) return;
    const k = mapCanvas.height / r.height, rects = [];
    for (const el of [ui.places, ui.dial, document.querySelector('.tally')]) {
      if (!el || el.hidden || !el.getClientRects().length) continue;
      const b = el.getBoundingClientRect();
      if (b.top < r.top + r.height / 3) rects.push([(b.left - r.left) * k, (b.top - r.top) * k, (b.right - r.left) * k, (b.bottom - r.top) * k]);
    }
    Q.keepClear = { w: mapCanvas.width, h: mapCanvas.height, rects };
  }

  function tick(t) {
    skipStep();
    renderDial(t);
    keepBubblesClear();
    placeInvite();
    if (world && world.map.plate && world.map.plate.at && Math.abs(t - plateAtT) > 0.4) printPlate(t);
    // (The open list is measured as it would rest; that's a style change, so
    // it's left to layoutVars rather than done every frame.)
    if (active && mode === 'zone' && tray.state !== 'open') keepRoombar();
    call(performance.now());
    mixBeds(t);
    const cues = active && world && world.map.sound && world.map.sound.cues;
    if (!cues) { lastTick = null; return; }
    const loop = world.map.loop || 180;
    const prev = lastTick;
    lastTick = t;
    if (prev == null || t <= prev || t - prev > 1) return;
    const a = ((prev % loop) + loop) % loop, b = ((t % loop) + loop) % loop;
    for (const q of cues) {
      const at = q.at % loop;
      if (!(a <= b ? at > a && at <= b : at > a || at <= b)) continue;
      const c = cueLevel(q, t), level = (q.level == null ? 1 : q.level) * (c.level == null ? 1 : c.level);
      sound(q.name, { ...q, level: level < 1 ? level : null, muffle: c.muffle || 0 });
    }
  }

  // ---------- Sound ----------
  // Where you are, for the place's sound: the area you're in (or null on the
  // overview) and the floor the overview shows.
  function hearing() {
    return {
      zone: active && mode === 'zone' && current >= 0 ? world.zones[current].id : null,
      storey: world.storeys && world.storeys[storey] ? world.storeys[storey].id : null,
    };
  }
  // The beds under the place: its sound.bed, one bed's name or a mix worked
  // out from the clock and where you are (audio.js mix()), a few times a second.
  let mixedAt = -1, mixed = {};
  function mixBeds(t) {
    const now = performance.now();
    if (now - mixedAt < 250) return;
    mixedAt = now;
    const b = active && world && world.map.sound && world.map.sound.bed;
    mixed = !b ? {} : typeof b === 'function' ? b(t, hearing()) || {} : { [b]: 1 };
    mix(mixed);
  }
  // How near a cue is: a place can say (sound.cue(q, t, here) gives a level
  // and a muffle), and by default a cue with a zone is quieter and muffled
  // from anywhere but that zone and the overview, and the outdoors' cues are
  // as muffled as the beds are while you're inside. (A cue can have its own
  // level too: q.level, 0 to 1.)
  function cueLevel(q, t) {
    const here = hearing(), s = world.map.sound;
    if (s.cue) return s.cue(q, t, here) || {};
    if (q.zone && here.zone && q.zone !== here.zone) return { level: 0.35, muffle: 0.6 };
    if (!q.zone && mixed.muffle) return { muffle: mixed.muffle };
    return {};
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
      // Pokes in teal, decoys in ink.
      for (const pk of zone.pokes) {
        if (pk.when && !pk.when(t)) continue;
        const [x, y, z] = findPos(pk, t);
        ctx.beginPath();
        ctx.arc(isoX(x, y), isoY(x, y, z), Math.max(pk.r, 22 / cam.z), 0, Math.PI * 2);
        ctx.strokeStyle = pk.decoy ? C.ink : C.teal;
        ctx.lineWidth = 1.5 / cam.z;
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
    // The first verb: a tap ripple on something that answers back, twice
    // every couple of seconds, like a finger tapping it (still, for reduced motion).
    const tp = teaching(zone, now);
    if (tp) {
      const [x, y, z] = findPos(tp, t);
      const X = isoX(x, y), Y = isoY(x, y, z);
      const age = reduceMotion ? 0.35 : ((now - zoneSince - TEACH.after) / 1000) % 2.4;
      for (const d of [0, 0.35]) {
        const k = (age - d) / 0.9;
        if (k < 0 || k > 1) continue;
        // (A paper edge under the ink, so it reads on the busiest art.)
        ctx.beginPath();
        ctx.arc(X, Y, (10 + k * 28) / cam.z, 0, Math.PI * 2);
        ctx.strokeStyle = alpha(C.paper, 0.9 * (1 - k));
        ctx.lineWidth = 6 / cam.z;
        ctx.stroke();
        ctx.strokeStyle = alpha(C.coral, 1 - k);
        ctx.lineWidth = 3 / cam.z;
        ctx.stroke();
      }
      if (age < 0.9) {
        ctx.beginPath();
        ctx.arc(X, Y, 8 / cam.z, 0, Math.PI * 2);
        ctx.fillStyle = alpha(C.coral, 0.6 * (1 - age / 0.9));
        ctx.fill();
      }
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
      ctx.arc(X, Y, 1.5 + pulse * 0.5, 0, Math.PI * 2);
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
    drawClues(ctx);
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i];
      const age = (now - p.t0) / 1000;
      if (age > (p.kind === 'honk' ? 1.6 : p.kind === 'call' ? 1.5 : p.kind === 'say' ? 2.6 : p.kind === 'burst' ? 0.7 : 0.5)) { pops.splice(i, 1); continue; }
      if (p.kind === 'say') {
        // What a poke or a decoy says, over it.
        const [ax, ay] = p.zone.anchor;
        const [x, y, z] = findPos(p.poke, t);
        if (!lifted(p.zone)) callBubble(ctx, ax + isoX(x, y), ay + isoY(x, y, z + 0.6), age * (1.5 / 2.6), p.text, 13);
      } else if (p.kind === 'call') {
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
    // In a room, whatever's in front of it is cut away round it, so a tap
    // there is the room's (the house in front's upper floors, on a street of houses).
    if (mode === 'zone' && current >= 0 && world.cutaway.front && !world.zones[current].open && world.zoneAt(X, Y, (z) => z.index !== current) === current) return current;
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
      // (A closed building's finds are inside it, out of reach, bar any on its porch.)
      const shut = zone.shelled && zone.shellK > 0.5;
      for (const f of zone.finds) {
        if (isFound(zone, f) || !reach(f, t) || (shut && !f.out)) continue;
        const d = screenGap(zone, f, sx, sy, t);
        const r = Math.max(f.r * cam.z, 22);
        if (d < r && d < bestD) { best = { zone, f }; bestD = d; }
      }
    }
    return best;
  }

  // How far a find or a poke is from a screen point, in px.
  function screenGap(zone, o, sx, sy, t) {
    const [x, y, z] = findPos(o, t);
    const [px, py] = camera.toScreen(zone.anchor[0] + isoX(x, y), zone.anchor[1] + isoY(x, y, z));
    return Math.hypot(px - sx, py - sy);
  }

  // The poke (or decoy) under a screen point, if any: the nearest, in the
  // room you're in or one you can see into.
  function pokeAtScreen(sx, sy, t, decoys = false) {
    let best = null, bestD = Infinity;
    for (const zone of world.zones) {
      if (lifted(zone) || !zone.pokes.length || (zone.shelled && zone.shellK > 0.5)) continue;
      for (const pk of zone.pokes) {
        if ((decoys && !pk.decoy) || (pk.when && !pk.when(t))) continue;
        const d = screenGap(zone, pk, sx, sy, t);
        if (d < Math.max(pk.r * cam.z, 22) && d < bestD) { best = { zone, pk }; bestD = d; }
      }
    }
    return best;
  }

  // The staircase under a screen point, if any (map.stairs): on the whole
  // house, one on the floor you're looking at; in a room, the room's own.
  function stairAtScreen(sx, sy, inRoom) {
    if (!world.map.stairs || (inRoom && mode !== 'zone')) return null;
    let best = null, bestD = Infinity;
    for (const s of world.map.stairs) {
      const i = world.indexOf(s.zone), to = world.indexOf(s.goes), zone = world.zones[i];
      if (!zone || to < 0 || lifted(zone)) continue;
      if (inRoom ? i !== current : hasStoreys() && zone.storey !== storey) continue;
      const [a, b] = s.run;
      for (let k = 0; k <= 6; k++) {
        const u = k / 6, p = { at: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u] };
        const d = screenGap(zone, p, sx, sy, 0);
        if (d < Math.max((s.r || 1) * cam.z, 16) && d < bestD) { best = { zone, to }; bestD = d; }
      }
    }
    return best;
  }

  // Returns true when the tap did something (so a quick second tap there is
  // another tap, not half a double tap).
  function tap(sx, sy) {
    if (!active) return false;
    const t = clock();
    const zoomedIn = cam.z >= zoneModeZ();
    if (zoomedIn) {
      let hit = findAtScreen(sx, sy, t);
      // (A find wins over the thing it's in, or next to. Not over a decoy,
      // which never holds anything: a tap nearer the lookalike than the real
      // thing is the lookalike's, or a decoy beside its goose gives it away.)
      const dk = hit && pokeAtScreen(sx, sy, t, true);
      if (dk && screenGap(dk.zone, dk.pk, sx, sy, t) < screenGap(hit.zone, hit.f, sx, sy, t)) hit = null;
      const pk = hit ? null : dk || pokeAtScreen(sx, sy, t);
      const at = hit || pk;
      if (at) {
        if (hit) markFound(hit.zone, hit.f);
        else poke(pk.zone, pk.pk);
        if (at.zone.index !== current || mode !== 'zone') {
          showZoneUI(at.zone.index);
          near = world.long(at.zone) ? floorAt(at.zone, sx, sy) : null;
        }
        return true;
      }
    }
    // A staircase: on the whole house it changes floors, in a room it goes
    // up or down to the room at the other end.
    const st = stairAtScreen(sx, sy, zoomedIn);
    if (st) {
      const to = world.zones[st.to];
      if (zoomedIn) {
        sound('ding', { down: to.storey < st.zone.storey });
        enterZone(st.to, { dur: 1.3 });
      } else setStorey(to.storey); // (which dings)
      return true;
    }
    const i = zoneAtScreen(sx, sy);
    if (i >= 0 && (!zoomedIn || i !== current)) {
      enterZone(i, { near: world.long(world.zones[i]) ? floorAt(world.zones[i], sx, sy) : null });
      return true;
    }
    pops.push({ kind: 'ripple', t0: performance.now(), at: camera.toWorld(sx, sy) });
    return false;
  }

  // After free panning/zooming, decide whether we're in a zone or looking at the whole map.
  function settle() {
    if (!active) return;
    if (cam.z < zoneModeZ()) {
      if (mode !== 'overview') showOverviewUI();
      return;
    }
    // (A room you're in stays yours while the middle of the screen is still
    // inside its framing: on a phone the list takes the bottom of the screen,
    // so the middle can sit below a shallow room, over the house in front.)
    if (mode === 'zone' && current >= 0 && !world.long(world.zones[current])) {
      const [X, Y] = camera.toWorld(view.vw / 2, view.vh / 2);
      const [X0, X1, Y0, Y1] = world.zoneBox(world.zones[current]);
      if (X >= X0 && X <= X1 && Y >= Y0 && Y <= Y1) return;
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
    if ((casefile.isOpen || traillog.isOpen) && e.key !== 'Escape') return; // the case file has the keys while it's open
    if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'PageUp' && hasStoreys()) { e.preventDefault(); setStorey(storey + 1); }
    else if (e.key === 'PageDown' && hasStoreys()) { e.preventDefault(); setStorey(storey - 1); }
    else if (e.key === 'Escape') {
      if (casefile.back() || traillog.back()) return;
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
    poked = false;
    hints.length = 0;
    pops.length = 0;
    seenStory.clear();
    storey = world.defaultStorey;
    nextCall = 0;
    lastCaller = null;
    dialText = '';
    dialLevel = -1;
    skipping = null;
    tideNudged.clear();
    waitSig = '';
    waitAt = -1;
    ui.dial.dataset.waiting = '';
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
    ui.hintsLeft.dataset.set = '';
    ui.caseCount.dataset.set = '';
    // A whodunit's art needs to know if the case was solved on an earlier visit.
    if (isCase()) {
      if (store.caseOf(world.id).solved) world.map.case.onSolved(0);
      else world.map.case.onOpen();
      if (world.map.case.ink) document.body.style.setProperty('--case-ink', world.map.case.ink);
    }
    if (isTrail()) {
      sightedAt.clear();
      tellTrail();
      if (world.map.trail.ink) document.body.style.setProperty('--case-ink', world.map.trail.ink);
    }
    pinPokes();
    const p = renderTally();
    parade = !isCase() && p.done ? performance.now() : 0;
  }

  // Start playing the loaded map, at its overview or straight into a zone.
  // o.fresh: the map just dropped in, so start from its overview.
  // o.jump: land in the zone without a flight (a link straight to a room).
  function start(zoneId, o = {}) {
    active = true;
    ui.hud.hidden = false;
    mixedAt = -1;
    const i = zoneId ? world.indexOf(zoneId) : -1;
    renderFloors();
    showOverviewUI();
    if (o.fresh) camera.jumpTo(overviewView());
    if (i >= 0) {
      enterZone(i, { dur: o.jump ? 0.01 : 1.5 });
      if (o.jump) camera.jumpTo(zoneView(i));
    } else {
      on.place(world.id, null);
      // (From its picker card, the place only grows: no pull back on the way.)
      if (!o.fresh) camera.flyTo(overviewView(), o.grow ? 1.1 : 1.2, null, { straight: !!o.grow });
    }
  }

  // Idle the map behind the title screen or picker: no HUD, a slow drift.
  // o.fresh: the map just dropped in, so start the drift from its overview.
  function attract(getInsets, o = {}) {
    active = false;
    attractInsets = getInsets || null;
    ui.hud.hidden = true;
    mix({});
    mixed = {};
    casefile.close();
    traillog.close();
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
    traillog,
    // Hold a trail at a sighting (QA and tests), or let it follow the save (null).
    trailTo(n) { debug.step = n; tellTrail(); if (mode === 'zone' && current >= 0) tray.render(current); },
    // Reset the loaded place's progress (QA and tests), including its case.
    reset() {
      store.resetMap(world.id);
      if (isCase()) world.map.case.onOpen();
      sightedAt.clear();
      tellTrail();
      pinPokes();
      renderTally();
      if (mode === 'zone' && current >= 0) tray.render(current);
    },
    markFound,
    // Tap a poke or a decoy by its ids, or ask for a hint (tests).
    poke: (zoneId, id) => { const z = world.zones[world.indexOf(zoneId)]; const pk = z && z.pokes.find((q) => q.id === id); if (pk) poke(z, pk); return pk; },
    // The thing a new player is being nudged to tap right now, if any (tests).
    teaching: () => { const z = current >= 0 && world.zones[current]; const pk = z && teaching(z, performance.now()); return pk ? pk.id : null; },
    hint: (zoneId, id) => { const z = world.zones[world.indexOf(zoneId)]; const f = z && z.finds.find((q) => q.id === id); if (f) showHint(z, f); },
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
    // The area a place's ending plays in, for its first minute: drawn live
    // every frame, not as a picture refreshed when there's time (the camera
    // frames it from outside, so it isn't the room you're in).
    live(now) {
      const fin = world && world.map.finale;
      if (!parade || !fin || !fin.zone || (now - parade) / 1000 > 60) return null;
      return world.zones[world.indexOf(fin.zone)] || null;
    },
  };
}
