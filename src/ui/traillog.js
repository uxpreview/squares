// The trail's log: every sighting so far, who saw it, and where it went next.
// It opens over the map from the Trail button, in the case file's sheet (a
// place has one or the other). The rules are src/game/trail.js; this draws it.

const EASE = 'cubic-bezier(.2, .8, .2, 1)';
const X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';

export function createTrailLog(o) {
  // o: { state(), portrait(ctx, id, w, h, dpr), onClose(), sound(name), reduceMotion }
  const root = document.getElementById('case');
  const sheet = root.querySelector('.case-sheet');
  const body = root.querySelector('.case-body');
  const close = root.querySelector('.case-x');
  let returnFocus = null;
  let mine = false; // the sheet is showing the log (not a case file)

  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  function portrait(id) {
    const cv = el('canvas', 'portrait is-face');
    cv.setAttribute('aria-hidden', 'true');
    const w = 54, h = 64, dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    try { o.portrait(g, id, w, h, dpr); } catch {}
    return cv;
  }

  function log() {
    const st = o.state();
    const frag = document.createDocumentFragment();
    const head = el('header', 'case-head');
    head.append(el('p', 'case-kicker', st.done ? 'Caught' : 'The trail'));
    const h = el('h2', 'case-title', st.title);
    h.id = 'case-title';
    h.tabIndex = -1;
    head.append(h, el('p', 'case-intro', st.intro));
    const meta = el('p', 'case-meta');
    meta.append(el('span', 'case-chip is-evidence', `Sightings ${st.step} of ${st.total}`));
    head.append(meta);

    const ol = el('ol', 'sightings');
    st.sightings.forEach((s, i) => {
      const li = el('li', 'sighting' + (s.found ? ' is-found' : s.next ? ' is-next' : ' is-later'));
      const n = el('span', 'sighting-n', String(i + 1));
      n.setAttribute('aria-hidden', 'true');
      if (!s.found && !s.next) {
        li.append(n, el('p', 'sighting-later', 'Not seen yet.'));
        ol.append(li);
        return;
      }
      const where = el('p', 'sighting-where');
      where.append(el('span', 'sighting-zone', s.zone));
      if (s.note) where.append(el('span', 'sighting-note', s.note));
      const p = el('p', 'bubble');
      p.append(el('span', 'bubble-who', s.name), el('span', 'bubble-text', s.says));
      const text = el('div', 'sighting-text');
      text.append(where, p);
      if (s.found && s.seen) text.append(el('p', 'sighting-seen', s.seen));
      if (s.next) text.append(el('p', 'sighting-seen is-next', `Heading here${s.note ? `, at ${s.note}` : ''}. It only shows up at the next sighting, at its time: it's always one step ahead.`));
      li.append(n, portrait(s.who), text);
      if (s.found) li.append(el('span', 'stamp is-cleared', 'Seen'));
      li.setAttribute('aria-label', `Sighting ${i + 1}, ${s.zone}${s.note ? `, ${s.note}` : ''}. ${s.name}: ${s.says}${s.found ? ' Seen.' : ' The next one.'}`);
      ol.append(li);
    });
    frag.append(head, ol, el('p', 'case-foot', st.done
      ? `${st.quarry} is caught. Nobody gets off.`
      : 'The ship\'s clock skips ahead to the next sighting\'s time.'));
    return frag;
  }

  function render() {
    body.replaceChildren(log());
    root.dataset.view = 'trail';
  }

  function open() {
    returnFocus = document.activeElement;
    mine = true;
    root.hidden = false;
    document.body.dataset.case = 'open';
    render();
    body.scrollTop = 0;
    // Scroll the next sighting into view.
    const next = body.querySelector('.sighting.is-next');
    if (next) next.scrollIntoView?.({ block: 'center' });
    if (!o.reduceMotion) sheet.animate([{ opacity: 0, transform: 'translateY(24px) scale(0.98)' }, { opacity: 1, transform: 'none' }], { duration: 340, easing: EASE });
    const h = body.querySelector('#case-title');
    if (h) h.focus({ preventScroll: true });
  }

  function hide() {
    if (root.hidden || !mine) return;
    mine = false;
    root.hidden = true;
    delete document.body.dataset.case;
    o.onClose();
    if (returnFocus && returnFocus.focus) returnFocus.focus({ preventScroll: true });
  }

  // The sheet's close button and the dimmed map round it close the log too
  // (the case file listens for the same; whichever is showing handles it).
  close.addEventListener('click', () => { if (mine) { o.sound('tick'); hide(); } });
  root.addEventListener('click', (e) => { if (e.target === root && mine) hide(); });
  if (!close.innerHTML) close.innerHTML = X;

  return {
    open,
    close: hide,
    back() { if (!mine || root.hidden) return false; hide(); return true; },
    refresh() { if (mine && !root.hidden) render(); },
    get isOpen() { return mine && !root.hidden; },
  };
}
