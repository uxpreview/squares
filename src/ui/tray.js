// The find list, called the tray. One component, two docks:
//   bottom (phones held upright): hidden = a small pill, peek = a row of chips,
//                                 open = the whole list as a sheet
//   right (wide screens, landscape): hidden = a slim rail, peek/open = a side
//                                 panel with the whole list
// It draws the list and remembers its state. src/game/play.js decides what a
// hint or a jump to another zone actually does. use() points it at a map.

const RIGHT_DOCK = matchMedia('(min-width: 900px), (orientation: landscape) and (min-width: 600px)');
const STORE = 'squares.tray.v1';
const STATES = ['hidden', 'peek', 'open'];
const EASE = 'cubic-bezier(.2, .8, .2, 1)';

export function createTray(o) {
  // o: { isFound(room, f), foundAge(room, f), label(room, f), onHint(room, f),
  //      hintStep(room, f) 0..2, hintLine(room, f), placeLine(), hintsLeft(),
  //      onNoPick(), onGoRoom(i), onStateChange(prev, next), reduceMotion,
  //      shows(room, f): false to leave a find off the list for now (a trail's later sightings) }
  // A hint goes in two steps (see rules.js): its line shows on the list, by
  // the thing it's for (the note over the chips, and under its row); the
  // next press rings it in the room.
  // A "room" here is any zone of the current map.
  const $ = (id) => document.getElementById(id);
  const el = {
    tray: $('tray'), head: document.querySelector('.tray-head'), chips: $('tray-chips'), full: $('tray-full'),
    count: $('tray-count'), place: $('tray-place'), hint: $('tray-hint'), hintCount: $('tray-hint-count'),
    note: $('tray-note'), noteText: $('tray-note-text'), noteBtn: $('tray-note-btn'), hide: $('tray-hide'), more: $('tray-more'), grip: $('tray-grip'),
    pill: $('tray-pill'), pips: $('tray-pips'), left: $('tray-left'), frac: $('tray-frac'),
  };

  let state = 'peek';
  try {
    // The old room card remembered "collapsed"; carry that choice over.
    state = localStorage.getItem(STORE) || (localStorage.getItem('squares.card.collapsed') === '1' ? 'hidden' : 'peek');
  } catch {}
  if (!STATES.includes(state)) state = 'peek';

  let shown = -1; // the room the tray is showing
  let sel = null; // the chip picked for a hint, as "room:find"
  let lastHint = null; // the last find a hint was asked for, as "room:find"
  const dock = () => (RIGHT_DOCK.matches ? 'right' : 'bottom');
  const key = (room, f) => room.id + ':' + f.id;

  function apply() {
    el.tray.dataset.state = state;
    el.tray.dataset.dock = dock();
    document.body.dataset.dock = dock();
    el.more.setAttribute('aria-expanded', String(state === 'open'));
    el.more.setAttribute('aria-label', state === 'open' ? 'Show fewer' : 'Show the whole list');
  }

  // ---------- Drawing ----------
  // Finds can come in groups (a whodunit's evidence and curiosities): evidence
  // gets a magnifying glass for a mark, and comes first.
  function mark(f, found) {
    const m = document.createElement('span');
    m.className = 'find-mark' + (f.goose ? ' is-goose' : '') + (f.group === 'evidence' || f.group === 'sighting' ? ' is-evidence' : '') + (found ? ' is-found' : '');
    m.setAttribute('aria-hidden', 'true');
    return m;
  }
  const grouped = () => o.rooms.some((r) => r.finds.some((f) => f.group));
  const said = (f) => o.label(null, f) + (f.group === 'evidence' ? ' (evidence)' : f.group === 'sighting' ? ' (a sighting)' : '') + (f.note ? ` (at ${f.note})` : '');
  // A find that only shows some of the time (at low tide) says when, small, after its name.
  function noteOf(f) {
    const n = document.createElement('span');
    n.className = 'find-note';
    n.textContent = f.note;
    n.setAttribute('aria-hidden', 'true');
    return n;
  }

  function chip(room, f) {
    const found = o.isFound(room, f);
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    const k = key(room, f);
    b.className = 'chip' + (found ? ' is-found' : '') + (sel === k && !found ? ' is-selected' : '') +
      (o.foundAge(room, f) < 1200 ? ' just-found' : '');
    b.setAttribute('aria-pressed', String(sel === k && !found));
    const t = document.createElement('span');
    t.className = 'chip-label';
    t.textContent = o.label(room, f);
    b.append(mark(f, found), t);
    if (f.note && !found) b.append(noteOf(f));
    if (f.group || f.note) b.setAttribute('aria-label', said(f));
    if (found) {
      b.disabled = true;
      b.setAttribute('aria-label', said(f) + ', found');
    } else {
      b.addEventListener('click', () => { sel = sel === k ? null : k; render(shown); });
    }
    li.append(b);
    return li;
  }

  function row(room, f) {
    const found = o.isFound(room, f);
    const li = document.createElement('li');
    li.className = 'row' + (found ? ' is-found' : '') + (o.foundAge(room, f) < 1200 ? ' just-found' : '');
    const t = document.createElement('span');
    t.className = 'row-label';
    t.textContent = o.label(room, f);
    // A hard find's riddle, or a hint's line once you've had it, under its name.
    const sub = !found && lineOf(room, f);
    if (sub) {
      const u = document.createElement('span');
      u.className = 'row-sub' + (o.hintStep(room, f) ? ' is-hint' : '');
      u.textContent = sub;
      t.append(u);
    }
    li.append(mark(f, found), t);
    if (f.note && !found) {
      li.append(noteOf(f));
      const e = document.createElement('span');
      e.className = 'sr-only';
      e.textContent = ` (at ${f.note})`;
      li.append(e);
    }
    if (f.group === 'evidence') {
      const e = document.createElement('span');
      e.className = 'sr-only';
      e.textContent = ' (evidence)';
      li.append(e);
    }
    if (found) {
      const s = document.createElement('span');
      s.className = 'sr-only';
      s.textContent = ' (found)';
      li.append(s);
    } else {
      const b = document.createElement('button');
      b.type = 'button';
      const step = o.hintStep(room, f);
      b.className = 'row-hint' + (step ? ' is-ring' : '');
      b.innerHTML = step ? '<span class="hint-long">Show me</span><span class="hint-short" aria-hidden="true">◎</span>'
        : '<span class="hint-long">Hint</span><span class="hint-short" aria-hidden="true">?</span>';
      b.setAttribute('aria-label', (step ? 'Show where, for ' : 'Hint for ') + o.label(room, f));
      b.addEventListener('click', () => o.onHint(room, f));
      li.append(b);
    }
    return li;
  }

  // What shows under a find's name: its hint's line once asked for, else a
  // hard find's riddle.
  const lineOf = (room, f) => (o.hintStep(room, f) ? o.hintLine(room, f) : f.riddle || '');

  const rank = (f) => (f.group === 'sighting' ? -1 : f.goose ? 0 : f.group === 'evidence' ? 1 : 2);
  const shows = (room, f) => !o.shows || o.shows(room, f);
  const sortFinds = (room) => room.finds.filter((f) => shows(room, f)).sort((a, b) => rank(a) - rank(b));

  function group(i, here) {
    const room = o.rooms[i];
    const finds = sortFinds(room);
    const got = finds.filter((f) => o.isFound(room, f)).length;
    const sec = document.createElement('section');
    sec.className = 'group' + (here ? ' is-here' : '') + (got === finds.length ? ' is-complete' : '');
    const head = document.createElement(here ? 'div' : 'button');
    head.className = 'group-head';
    if (!here) {
      head.type = 'button';
      head.setAttribute('aria-label', `Go to ${room.name}, ${got} of ${finds.length} found`);
      head.addEventListener('click', () => o.onGoRoom(i));
    }
    const unit = document.createElement('span');
    unit.className = 'group-unit';
    unit.textContent = here ? 'You are here' : room.tag;
    const name = document.createElement('span');
    name.className = 'group-name';
    name.textContent = room.name;
    const frac = document.createElement('span');
    frac.className = 'group-frac';
    frac.textContent = `${got}/${finds.length}`;
    head.append(unit, name, frac);
    const ul = document.createElement('ul');
    ul.className = 'rows';
    for (const f of finds) ul.append(row(room, f));
    sec.append(head, ul);
    return sec;
  }

  function render(ci) {
    const room = o.rooms[ci];
    if (!room) return;
    const swapped = shown !== ci;
    shown = ci;
    const finds = sortFinds(room);
    const got = finds.filter((f) => o.isFound(room, f)).length;
    const all = got === finds.length;
    el.count.textContent = `${got} of ${finds.length} found here`;
    el.place.textContent = o.placeLine();
    const left = o.hintsLeft();
    el.hintCount.textContent = String(left);
    el.hint.classList.toggle('is-empty', left < 1);
    el.left.textContent = all ? 'All found here' : `${finds.length - got} left to find`;
    el.frac.textContent = `${got}/${finds.length}`;
    el.pill.setAttribute('aria-label', `Show the list, ${got} of ${finds.length} found`);
    el.tray.classList.toggle('is-complete', all);

    el.pips.replaceChildren(...finds.map((f) => {
      const p = document.createElement('span');
      p.className = 'pip' + (f.goose ? ' is-goose' : '') + (o.isFound(room, f) ? ' is-found' : '');
      return p;
    }));

    // Chips: what's left first (the goose leads), found ones at the end.
    const open = finds.filter((f) => !o.isFound(room, f));
    const done = finds.filter((f) => o.isFound(room, f));
    el.chips.replaceChildren(...open.concat(done).map((f) => chip(room, f)));
    // The picked chip in view (a hint can pick one off the end of the row).
    const on = el.chips.querySelector('.is-selected');
    if (on && !swapped) {
      const li = on.parentElement, w = el.chips.clientWidth;
      if (li.offsetLeft < el.chips.scrollLeft || li.offsetLeft + li.offsetWidth > el.chips.scrollLeft + w - 28) el.chips.scrollLeft = li.offsetLeft - 16;
    }

    const picked = open.find((f) => key(room, f) === sel);
    if (!picked && sel && sel.startsWith(room.id + ':')) sel = null;
    const step = picked ? o.hintStep(room, picked) : 0;
    el.hint.setAttribute('aria-label', picked
      ? `${step ? 'Show where, for' : 'Hint for'} ${o.label(room, picked)}. ${left} ${left === 1 ? 'hint' : 'hints'} left.`
      : `Hint. ${left} ${left === 1 ? 'hint' : 'hints'} left. Pick something on the list first.`);

    // The note over the chips: the picked find's line (its hint, or its
    // riddle), else the last one you asked a hint for.
    const noteFor = picked || open.find((f) => key(room, f) === lastHint);
    const line = noteFor && lineOf(room, noteFor);
    el.note.hidden = !line;
    if (line) {
      el.noteText.textContent = line;
      const st = o.hintStep(room, noteFor);
      el.noteBtn.hidden = !st;
      el.noteBtn.onclick = () => o.onHint(room, noteFor);
      el.noteBtn.setAttribute('aria-label', 'Show where, for ' + o.label(room, noteFor));
    }

    // The whole list: this zone first, then the rest in the map's order. A
    // place with grouped finds says what the marks mean.
    const others = o.order.filter((i) => i !== ci);
    const legend = [];
    if (grouped()) {
      const p = document.createElement('p');
      p.className = 'tray-legend';
      const trail = o.rooms.some((r) => r.finds.some((f) => f.group === 'sighting'));
      for (const [cls, text] of trail ? [['is-evidence', 'Sightings, one at a time'], ['', 'Things to find']] : [['is-evidence', 'Evidence for the case'], ['', 'Curiosities, for fun']]) {
        const sp = document.createElement('span');
        const m = document.createElement('span');
        m.className = 'find-mark ' + cls;
        m.setAttribute('aria-hidden', 'true');
        sp.append(m, text);
        p.append(sp);
      }
      legend.push(p);
    }
    el.full.replaceChildren(...legend, group(ci, true), ...others.map((i) => group(i, false)));

    if (swapped) {
      el.full.scrollTop = 0;
      el.chips.scrollLeft = 0;
      if (!o.reduceMotion) {
        el.chips.animate([{ opacity: 0, transform: 'translateX(18px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: EASE });
      }
    }
  }

  el.hint.addEventListener('click', () => {
    const room = o.rooms[shown];
    const f = room && room.finds.find((x) => key(room, x) === sel && !o.isFound(room, x) && shows(room, x));
    if (f) o.onHint(room, f);
    else {
      o.onNoPick();
      if (!o.reduceMotion) el.chips.animate([{ transform: 'none' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 420, easing: EASE });
    }
  });

  // ---------- States ----------
  function setState(next) {
    if (next === state || !STATES.includes(next)) return;
    const prev = state;
    const r0 = el.tray.getBoundingClientRect();
    state = next;
    try { localStorage.setItem(STORE, state); } catch {}
    apply();
    const r1 = el.tray.getBoundingClientRect();
    // The game measures where the tray rests before it starts sliding there.
    o.onStateChange(prev, next);
    if (!o.reduceMotion && !el.tray.hidden) {
      if (dock() === 'right') {
        el.tray.animate([{ width: r0.width + 'px' }, { width: r1.width + 'px' }], { duration: 340, easing: EASE });
      } else if (prev === 'hidden' || next === 'hidden') {
        el.tray.animate([{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: EASE });
      } else {
        el.tray.animate([{ height: r0.height + 'px' }, { height: r1.height + 'px' }], { duration: 340, easing: EASE });
      }
    }
  }
  const up = () => setState(state === 'hidden' ? 'peek' : 'open');
  const down = () => setState(state === 'open' && dock() === 'bottom' ? 'peek' : 'hidden');

  el.hide.addEventListener('click', () => setState('hidden'));
  el.more.addEventListener('click', () => setState(state === 'open' ? 'peek' : 'open'));
  el.pill.addEventListener('click', () => setState('peek'));
  let lastSwipe = 0;
  el.grip.addEventListener('click', () => {
    if (performance.now() - lastSwipe < 400) return;
    setState(state === 'open' ? 'peek' : 'open');
  });

  // Swipe the tray's top row (or the pill) up for more, down for less. (The
  // lift is heard anywhere: a mouse that drags off the row lets go elsewhere.)
  for (const target of [el.head, el.pill]) {
    let sw = null;
    target.addEventListener('pointerdown', (e) => {
      if (dock() !== 'bottom' || e.target.closest('.tray-head button:not(.tray-grip)')) return;
      sw = { x: e.clientX, y: e.clientY, id: e.pointerId };
    });
    window.addEventListener('pointerup', (e) => {
      if (!sw || e.pointerId !== sw.id) return;
      const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
      sw = null;
      if (Math.abs(dy) > 24 && Math.abs(dy) > Math.abs(dx)) {
        lastSwipe = performance.now();
        if (dy < 0) up(); else down();
      }
    });
    window.addEventListener('pointercancel', (e) => { if (sw && e.pointerId === sw.id) sw = null; });
  }

  // The tray's box in a given state, measured without showing it. Its layout
  // box, not getBoundingClientRect: that includes the slide it does between
  // states, and the room bar once rested 8px into the list because of it.
  function rectFor(s) {
    const cur = el.tray.dataset.state, t = el.tray;
    if (cur !== s) t.dataset.state = s;
    const r = { left: t.offsetLeft, top: t.offsetTop, width: t.offsetWidth, height: t.offsetHeight };
    if (cur !== s) t.dataset.state = cur;
    return r;
  }

  RIGHT_DOCK.addEventListener('change', () => { apply(); o.onStateChange(state, state); });
  apply();

  return {
    // Point the tray at a map: its zones and the order to list them in.
    use({ rooms, order }) {
      o.rooms = rooms;
      o.order = order;
      shown = -1;
      sel = lastHint = null;
    },
    render,
    // Pick a find (a hint was asked for it): its chip lit, its line in the note.
    pick(room, f) { sel = lastHint = key(room, f); },
    setState,
    rectFor,
    dock,
    get state() { return state; },
    get shown() { return shown; },
    show(v) { el.tray.hidden = !v; },
  };
}
