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
  //      onGoRoom(i), onStateChange(prev, next), reduceMotion }
  // A "room" here is any zone of the current map.
  const $ = (id) => document.getElementById(id);
  const el = {
    tray: $('tray'), head: document.querySelector('.tray-head'), chips: $('tray-chips'), full: $('tray-full'),
    count: $('tray-count'), hint: $('tray-hint'), hide: $('tray-hide'), more: $('tray-more'), grip: $('tray-grip'),
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
  function mark(f, found) {
    const m = document.createElement('span');
    m.className = 'find-mark' + (f.goose ? ' is-goose' : '') + (found ? ' is-found' : '');
    m.setAttribute('aria-hidden', 'true');
    return m;
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
    if (found) {
      b.disabled = true;
      b.setAttribute('aria-label', o.label(room, f) + ', found');
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
    li.append(mark(f, found), t);
    if (found) {
      const s = document.createElement('span');
      s.className = 'sr-only';
      s.textContent = ' (found)';
      li.append(s);
    } else {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'row-hint';
      b.innerHTML = '<span class="hint-long">Hint</span><span class="hint-short" aria-hidden="true">?</span>';
      b.setAttribute('aria-label', 'Hint for ' + o.label(room, f));
      b.addEventListener('click', () => o.onHint(room, f));
      li.append(b);
    }
    return li;
  }

  const sortFinds = (room) => room.finds.slice().sort((a, b) => (b.goose ? 1 : 0) - (a.goose ? 1 : 0));

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
    el.count.textContent = `${got} of ${finds.length} found`;
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
    const left = finds.filter((f) => !o.isFound(room, f));
    const done = finds.filter((f) => o.isFound(room, f));
    el.chips.replaceChildren(...left.concat(done).map((f) => chip(room, f)));

    const picked = left.find((f) => key(room, f) === sel);
    if (!picked && sel && sel.startsWith(room.id + ':')) sel = null;
    el.hint.hidden = !picked;
    if (picked) el.hint.setAttribute('aria-label', 'Hint for ' + o.label(room, picked));

    // The whole list: this zone first, then the rest in the map's order.
    const others = o.order.filter((i) => i !== ci);
    el.full.replaceChildren(group(ci, true), ...others.map((i) => group(i, false)));

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
    const f = room && room.finds.find((x) => key(room, x) === sel);
    if (f) o.onHint(room, f);
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
    if (!o.reduceMotion && !el.tray.hidden) {
      if (dock() === 'right') {
        el.tray.animate([{ width: r0.width + 'px' }, { width: r1.width + 'px' }], { duration: 340, easing: EASE });
      } else if (prev === 'hidden' || next === 'hidden') {
        el.tray.animate([{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: EASE });
      } else {
        el.tray.animate([{ height: r0.height + 'px' }, { height: r1.height + 'px' }], { duration: 340, easing: EASE });
      }
    }
    o.onStateChange(prev, next);
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

  // Swipe the tray's top row (or the pill) up for more, down for less.
  for (const target of [el.head, el.pill]) {
    let sw = null;
    target.addEventListener('pointerdown', (e) => {
      if (dock() !== 'bottom' || e.target.closest('.tray-head button:not(.tray-grip)')) return;
      sw = { x: e.clientX, y: e.clientY, id: e.pointerId };
    });
    target.addEventListener('pointerup', (e) => {
      if (!sw || e.pointerId !== sw.id) return;
      const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
      sw = null;
      if (Math.abs(dy) > 24 && Math.abs(dy) > Math.abs(dx)) {
        lastSwipe = performance.now();
        if (dy < 0) up(); else down();
      }
    });
    target.addEventListener('pointercancel', () => { sw = null; });
  }

  // The tray's box in a given state, measured without showing it.
  function rectFor(s) {
    const cur = el.tray.dataset.state;
    el.tray.dataset.state = s;
    const r = el.tray.getBoundingClientRect();
    el.tray.dataset.state = cur;
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
      sel = null;
    },
    render,
    setState,
    rectFor,
    dock,
    get state() { return state; },
    get shown() { return shown; },
    show(v) { el.tray.hidden = !v; },
  };
}
