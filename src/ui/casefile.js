// The case file: a whodunit's suspects, the evidence, and the accusation. It
// opens over the map from the Case button, as one sheet with three views:
//   board     every suspect's portrait, and who's been cleared
//   suspect   one suspect: motive, what points at them, their alibi, Accuse
//   scene     an accusation playing out line by line, then a stamp
// What an accusation does is src/game/play.js's business (and the rules are
// src/game/case.js); this draws it.

const EASE = 'cubic-bezier(.2, .8, .2, 1)';
const X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
const BACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function createCasefile(o) {
  // o: { state(), accuse(id) -> { kind, lines } | null, portrait(ctx, id, w, h, dpr),
  //      nameOf(id), onSolved(), onClose(), sound(name), reduceMotion }
  const root = document.getElementById('case');
  const sheet = root.querySelector('.case-sheet');
  const body = root.querySelector('.case-body');
  const close = root.querySelector('.case-x');
  let view = 'board';
  let current = null; // the suspect id being looked at
  let timers = [];
  let returnFocus = null;

  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const clearTimers = () => { for (const t of timers) clearTimeout(t); timers = []; };
  const later = (fn, ms) => timers.push(setTimeout(fn, o.reduceMotion ? 0 : ms));

  // A portrait canvas, painted once it's laid out (size: [w, h] in CSS pixels
  // when it's known up front, as for the faces in a conversation, which start hidden).
  function portrait(id, cls, size) {
    const cv = el('canvas', 'portrait ' + (cls || ''));
    cv.setAttribute('aria-hidden', 'true');
    const paint = (w, h) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      const g = cv.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      try { o.portrait(g, id, w, h, dpr); } catch {}
    };
    if (size) paint(size[0], size[1]);
    else {
      requestAnimationFrame(() => {
        const r = cv.getBoundingClientRect();
        if (r.width) paint(r.width, r.height);
      });
    }
    return cv;
  }
  // "Accuse the goose", not "Accuse The goose".
  const inSentence = (name) => name.replace(/^The /, 'the ');

  function stamp(s, big) {
    if (!s.cleared && !s.guilty) return null;
    return el('span', 'stamp' + (s.guilty ? ' is-guilty' : ' is-cleared') + (big ? ' is-big' : ''), s.guilty ? 'Guilty' : 'Cleared');
  }

  // ---------- Board ----------
  function board() {
    const st = o.state();
    const frag = document.createDocumentFragment();
    const head = el('header', 'case-head');
    head.append(el('p', 'case-kicker', st.solved ? 'Case closed' : 'The case'));
    const h = el('h2', 'case-title', st.title);
    h.id = 'case-title';
    h.tabIndex = -1;
    head.append(h, el('p', 'case-intro', st.intro));
    const meta = el('p', 'case-meta');
    meta.append(el('span', 'case-chip is-evidence', `Evidence ${st.evidence.found} of ${st.evidence.total}`));
    if (st.wrong) meta.append(el('span', 'case-chip', `Innocent people arrested: ${st.wrong}`));
    head.append(meta);
    const ul = el('ul', 'suspects');
    for (const s of st.suspects) {
      const li = el('li');
      const b = el('button', 'suspect' + (s.hidden ? ' is-hidden' : '') + (s.cleared ? ' is-cleared' : '') + (s.guilty ? ' is-guilty' : '') + (s.culprit && s.ready && !s.guilty ? ' is-ready' : ''));
      b.type = 'button';
      b.append(portrait(s.hidden ? 'someone' : s.id), el('span', 'suspect-name', s.shown.name), el('span', 'suspect-role', s.shown.role));
      const sp = stamp(s);
      if (sp) b.append(sp);
      if (s.hidden) b.append(el('span', 'suspect-clues', `Clues ${s.cluesFound} of ${s.clues}`));
      b.setAttribute('aria-label', `${s.shown.name}, ${s.shown.role}.${s.cleared ? ' Cleared.' : ''}${s.guilty ? ' Guilty.' : ''}${s.hidden ? ` ${s.cluesFound} of ${s.clues} clues found.` : ''}`);
      b.addEventListener('click', () => { o.sound('tick'); show('suspect', s.id); });
      li.append(b);
      ul.append(li);
    }
    frag.append(head, ul, el('p', 'case-foot', st.solved ? 'The goose is in custody. Well, in the Lord\'s chair.' : 'Tap anyone to see the evidence, or to accuse them. Accusing the wrong person costs nothing but their dignity.'));
    return frag;
  }

  // ---------- One suspect ----------
  function suspect(id) {
    const st = o.state();
    const s = st.suspects.find((x) => x.id === id);
    const frag = document.createDocumentFragment();
    frag.append(backButton());
    const top = el('div', 'suspect-top');
    const who = el('div', 'suspect-who');
    who.append(el('p', 'case-kicker', s.hidden ? 'A mystery' : 'Suspect'));
    const h = el('h2', 'case-title', s.shown.name);
    h.id = 'case-title';
    h.tabIndex = -1;
    who.append(h, el('p', 'suspect-role', s.shown.role));
    const sp = stamp(s, true);
    if (sp) who.append(sp);
    top.append(portrait(s.hidden ? 'someone' : s.id, 'is-big'), who);
    frag.append(top);

    const dl = el('dl', 'clues');
    const row = (label, items) => {
      dl.append(el('dt', null, label));
      const dd = el('dd');
      if (typeof items === 'string') dd.textContent = items;
      else {
        const ul = el('ul');
        for (const c of items) ul.append(el('li', c.found ? 'is-found' : 'is-missing', c.found ? c.says : `Not found yet. It's in ${/^the /i.test(c.zone) ? c.zone.replace(/^The /, 'the ') : 'the ' + c.zone}.`));
        dd.append(ul);
      }
      dl.append(dd);
    };
    if (!s.hidden) row('Motive', s.motive);
    if (s.against.length) row(s.hidden ? 'Clues' : 'Looks guilty', s.against);
    if (s.alibi.length) {
      // A wrong accusation gets their alibi out of them, found or not.
      row('Alibi', s.accused ? s.alibi.map((c) => ({ ...c, found: true })) : s.alibi);
    }
    if (s.cleared && s.line) row('Verdict', s.line);
    frag.append(dl);

    const act = el('div', 'case-actions');
    if (!st.solved || !s.culprit) {
      const b = el('button', 'big-btn case-accuse', s.hidden ? 'Accuse someone else' : `Accuse ${inSentence(s.shown.name)}`);
      b.type = 'button';
      b.addEventListener('click', () => accuse(s.id));
      act.append(b);
      if (s.hidden) act.append(el('p', 'case-note', `Find all ${s.clues} clues to name them.`));
      else if (s.cleared) act.append(el('p', 'case-note', 'Already cleared. You can accuse them again, for fun.'));
    } else act.append(el('p', 'case-note', 'Case closed.'));
    frag.append(act);
    return frag;
  }

  // ---------- The accusation, played out ----------
  function scene(id, outcome) {
    const frag = document.createDocumentFragment();
    const st = o.state();
    const s = st.suspects.find((x) => x.id === id);
    const head = el('header', 'case-head');
    head.append(el('p', 'case-kicker', outcome.kind === 'solved' ? 'The accusation' : outcome.kind === 'not-yet' ? 'Not yet' : 'The accusation'));
    const h = el('h2', 'case-title', outcome.kind === 'not-yet' ? 'Inspector Pidge needs more' : `"${s.shown.name}, you're under arrest!"`);
    h.id = 'case-title';
    h.tabIndex = -1;
    head.append(h);
    const ol = el('ol', 'lines');
    ol.setAttribute('aria-live', 'polite');
    const lines = outcome.lines.map(([who, text]) => {
      const li = el('li', 'line' + (who === 'pidge' ? ' is-pidge' : ''));
      li.append(portrait(who, 'is-face', [54, 64]));
      const p = el('p', 'bubble');
      p.append(el('span', 'bubble-who', o.nameOf(who)), el('span', 'bubble-text', text));
      li.append(p);
      li.hidden = true;
      ol.append(li);
      return li;
    });
    const end = el('div', 'scene-end');
    end.hidden = true;
    const st2 = el('span', 'stamp is-big ' + (outcome.kind === 'solved' ? 'is-guilty' : 'is-cleared'), outcome.kind === 'solved' ? 'Guilty' : 'Cleared');
    if (outcome.kind !== 'not-yet') end.append(st2);
    const b = el('button', 'big-btn', outcome.kind === 'solved' ? 'Case closed' : 'Back to the case');
    b.type = 'button';
    b.addEventListener('click', () => {
      o.sound('tick');
      if (outcome.kind === 'solved') o.onSolved();
      else show('board');
    });
    end.append(b);
    const skip = el('p', 'case-note scene-skip', 'Tap for the next line');
    frag.append(head, ol, skip, end);

    // One line at a time; a tap anywhere shows the next one now.
    let i = 0;
    const next = () => {
      clearTimers();
      if (i < lines.length) {
        const li = lines[i++];
        li.hidden = false;
        if (!o.reduceMotion) li.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: EASE });
        li.scrollIntoView?.({ block: 'nearest', behavior: o.reduceMotion ? 'auto' : 'smooth' });
        later(next, 1500 + Math.min(1600, li.textContent.length * 22));
      } else if (end.hidden) {
        end.hidden = false;
        skip.hidden = true;
        if (outcome.kind !== 'not-yet') {
          o.sound('stamp');
          if (!o.reduceMotion) st2.animate([{ transform: 'rotate(-8deg) scale(2.2)', opacity: 0 }, { transform: 'rotate(-8deg) scale(1)', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.3, 1.6, .5, 1)' });
        }
        end.scrollIntoView?.({ block: 'nearest', behavior: o.reduceMotion ? 'auto' : 'smooth' });
        b.focus({ preventScroll: true });
      }
    };
    ol.addEventListener('click', next);
    later(next, 150);
    if (o.reduceMotion) { while (i < lines.length) next(); next(); }
    return frag;
  }

  function backButton() {
    const b = el('button', 'case-back');
    b.type = 'button';
    b.innerHTML = BACK + '<span>All suspects</span>';
    b.addEventListener('click', () => { o.sound('tick'); show('board'); });
    return b;
  }

  function accuse(id) {
    o.sound('tick');
    const outcome = o.accuse(id);
    if (!outcome) return;
    show('scene', id, outcome);
  }

  // ---------- Views ----------
  function show(v, id = current, outcome = null) {
    clearTimers();
    view = v;
    current = id;
    root.dataset.view = v;
    const content = v === 'board' ? board() : v === 'suspect' ? suspect(id) : scene(id, outcome);
    body.replaceChildren(content);
    body.scrollTop = 0;
    if (!o.reduceMotion) body.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: EASE });
    const h = body.querySelector('#case-title');
    if (h) h.focus({ preventScroll: true });
  }

  function open() {
    returnFocus = document.activeElement;
    root.hidden = false;
    document.body.dataset.case = 'open';
    show('board');
    if (!o.reduceMotion) sheet.animate([{ opacity: 0, transform: 'translateY(24px) scale(0.98)' }, { opacity: 1, transform: 'none' }], { duration: 340, easing: EASE });
  }

  function hide() {
    if (root.hidden) return;
    clearTimers();
    root.hidden = true;
    delete document.body.dataset.case;
    o.onClose();
    if (returnFocus && returnFocus.focus) returnFocus.focus({ preventScroll: true });
  }

  close.innerHTML = X;
  // (The same sheet shows a trail's log, ui/traillog.js, which closes itself.)
  const theirs = () => root.dataset.view === 'trail';
  close.addEventListener('click', () => { if (theirs()) return; o.sound('tick'); hide(); });
  // Keep Tab inside the case file while it's open (it's a modal).
  root.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const all = [...sheet.querySelectorAll('button:not([disabled]), [tabindex="0"]')].filter((x) => x.offsetParent !== null);
    if (!all.length) return;
    const first = all[0], last = all[all.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (!sheet.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  });
  // A click on the dimmed map around the sheet closes it too.
  root.addEventListener('click', (e) => { if (e.target === root && !theirs()) hide(); });

  return {
    open,
    close: hide,
    // Escape: step back a view, then close.
    back() {
      if (root.hidden || theirs()) return false;
      if (view === 'board') hide();
      else show('board');
      return true;
    },
    // Redraw what's showing (after a find, say).
    refresh() { if (!root.hidden && view === 'board') show('board'); },
    get isOpen() { return !root.hidden && !theirs(); },
    get view() { return view; },
  };
}
