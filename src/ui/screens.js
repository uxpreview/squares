// The screens around play: the title, the place picker, and the card that
// shows when you finish a place. Plain DOM over the canvas; the map keeps
// drifting behind them.
//
// Body attribute: data-screen = title | places | play

import { play as sound } from '../game/audio.js';

export function createScreens({ config, maps, store, getWorld, renderer, reduceMotion, on }) {
  // on: { go(hash), soundChanged(on) }
  const $ = (id) => document.getElementById(id);
  const el = {
    title: $('title'), titleTop: document.querySelector('.title-top'), actions: document.querySelector('.title-actions'),
    wordmark: $('wordmark'), tagline: $('title-tagline'),
    playBtn: $('title-play'), playLabel: $('title-play-label'), playSub: $('title-play-sub'),
    placesBtn: $('title-places'), progress: $('title-progress'), back: $('back-link'),
    places: $('places'), placesBack: $('places-back'), list: $('places-list'), total: $('places-total'),
    complete: $('complete'), completeKicker: document.querySelector('.complete-kicker'), completeTitle: $('complete-title'), completeText: $('complete-text'),
    completeNext: $('complete-next'), completeStay: $('complete-stay'),
  };
  const soundBtns = [...document.querySelectorAll('.sound-btn')];
  const thumbs = new Map(); // mapId -> rendered canvas

  // ---------- Title ----------
  el.wordmark.setAttribute('aria-label', config.name);
  el.wordmark.replaceChildren(...[...config.name].map((ch, i) => {
    const s = document.createElement('span');
    s.setAttribute('aria-hidden', 'true');
    s.textContent = ch;
    s.style.setProperty('--i', i);
    return s;
  }));
  el.tagline.textContent = config.tagline;
  if (config.backLink) {
    el.back.href = config.backLink.href;
    el.back.textContent = '← ' + config.backLink.label;
  } else {
    el.back.remove();
  }

  const unlocked = (m) => !config.lockMaps || !m.unlock || store.totalGeese() >= (m.unlock.geese || 0);

  function renderTitle() {
    const last = store.last && maps.find((m) => m.id === store.last.map && !m.hidden && unlocked(m));
    const geese = store.totalGeese();
    if (last) {
      el.playLabel.textContent = 'Continue';
      el.playSub.textContent = last.name;
      el.playSub.hidden = false;
    } else {
      el.playLabel.textContent = 'Play';
      el.playSub.hidden = true;
    }
    el.placesBtn.hidden = !last;
    el.progress.textContent = geese ? `${geese} ${geese === 1 ? 'goose' : 'geese'} found so far` : '';
    el.progress.hidden = !geese;
  }

  el.playBtn.addEventListener('click', () => {
    sound('tick');
    const last = store.last && maps.find((m) => m.id === store.last.map && !m.hidden && unlocked(m));
    on.go(last ? `#/${last.id}${store.last.zone ? '/' + store.last.zone : ''}` : '#/maps');
  });
  el.placesBtn.addEventListener('click', () => { sound('tick'); on.go('#/maps'); });

  // ---------- Places ----------
  function card(m) {
    const li = document.createElement('li');
    const open = unlocked(m);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'place-card' + (open ? '' : ' is-locked');
    b.style.setProperty('--card-ink', m.ink || 'var(--coral)');
    b.disabled = !open;

    const pic = document.createElement('div');
    pic.className = 'place-pic';
    const c = store.count(m.id);

    const body = document.createElement('div');
    body.className = 'place-body';
    const name = document.createElement('h3');
    name.className = 'place-card-name';
    name.textContent = m.name;
    const tag = document.createElement('p');
    tag.className = 'place-card-tag';
    tag.textContent = m.tagline;
    const meta = document.createElement('p');
    meta.className = 'place-card-meta';
    const badge = document.createElement('span');
    badge.className = 'place-badge';
    const stat = document.createElement('span');
    stat.className = 'place-stat';
    meta.append(badge, stat);
    body.append(name, tag, meta);
    b.append(pic, body);
    li.append(b);

    if (!open) {
      badge.textContent = 'Locked';
      const need = m.unlock.geese - store.totalGeese();
      stat.textContent = `Find ${need} more ${need === 1 ? 'goose' : 'geese'} to open`;
      b.setAttribute('aria-label', `${m.name}, locked. ${stat.textContent}`);
    } else {
      badge.textContent = c.total ? 'In progress' : 'New';
      badge.dataset.kind = c.total ? 'progress' : 'new';
      stat.textContent = c.geese ? `${c.geese} ${c.geese === 1 ? 'goose' : 'geese'} found` : '';
      b.addEventListener('click', () => { sound('tick'); on.go('#/' + m.id); });
      // Load the map to draw its picture and exact counts.
      getWorld(m.id).then((w) => {
        const p = store.progress(w);
        // A whodunit shows its case; everywhere else counts geese and things.
        stat.textContent = w.goal === 'case'
          ? (p.done ? `Case closed · ${p.curios}/${w.totals.curiosity} curiosities` : `Case open · ${p.evidence}/${w.totals.evidence} evidence`)
          : `${p.geese}/${w.totalGeese} geese · ${p.things}/${w.totalThings} things`;
        if (p.done) { badge.textContent = w.goal === 'case' ? 'Solved' : 'Complete'; badge.dataset.kind = 'done'; }
        b.setAttribute('aria-label', `${m.name}. ${m.tagline} ${badge.textContent}, ${stat.textContent}.`);
        drawThumb(pic, m.id, w);
      }).catch(() => {});
    }
    return li;
  }

  function drawThumb(pic, id, w) {
    const place = () => {
      const r = pic.getBoundingClientRect();
      if (!r.width) return;
      let cv = thumbs.get(id);
      if (!cv || cv.dataset.w !== String(Math.round(r.width))) {
        cv = renderer.thumbnail(w, r.width, r.height);
        cv.dataset.w = String(Math.round(r.width));
        thumbs.set(id, cv);
      }
      const img = cv.cloneNode(false);
      img.getContext('2d').drawImage(cv, 0, 0);
      img.setAttribute('aria-hidden', 'true');
      pic.replaceChildren(img);
      if (!reduceMotion) img.animate([{ opacity: 0, transform: 'scale(0.96)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2, .8, .2, 1)' });
    };
    // Wait a frame so the card has its size, and so drawing doesn't block the transition.
    requestAnimationFrame(() => setTimeout(place, 30));
  }

  function renderPlaces() {
    const items = maps.filter((m) => !m.hidden).map(card);
    if (config.teaseMore) {
      const li = document.createElement('li');
      li.className = 'place-tease';
      li.innerHTML = '<p class="place-tease-title">More places on the way</p><p class="place-tease-text">New maps land here. The goose is already packing.</p>';
      items.push(li);
    }
    el.list.replaceChildren(...items);
    const g = store.totalGeese();
    el.total.textContent = g ? `${g} ${g === 1 ? 'goose' : 'geese'} found across every place` : 'Every place hides a goose. Most hide several things.';
  }
  el.placesBack.addEventListener('click', () => on.go('#/'));

  // ---------- Complete ----------
  function showComplete(world) {
    const p = store.progress(world);
    el.completeTitle.textContent = world.map.name;
    el.completeKicker.textContent = world.goal === 'case' ? 'Case closed' : 'Place complete';
    const left = world.totalThings - p.things + (world.totalGeese - p.geese);
    if (world.goal === 'case') {
      const all = world.totalThings + world.totalGeese;
      el.completeText.textContent = `${world.map.case.reveal.text} ${left > 0
        ? `You found ${all - left} of the ${all} things in the house.`
        : 'You found everything, too.'}`;
    } else {
      el.completeText.textContent = left > 0
        ? `Every goose, found. ${left} hidden ${left === 1 ? 'thing is' : 'things are'} still out there if you want the full set.`
        : 'Every goose and every hidden thing. Nothing left but the view.';
    }
    el.complete.hidden = false;
    if (!reduceMotion) el.complete.animate([{ opacity: 0, transform: 'translate(-50%, 16px) scale(0.96)' }, { opacity: 1, transform: 'translate(-50%, 0)' }], { duration: 420, easing: 'cubic-bezier(.2, 1.3, .4, 1)' });
    el.completeNext.focus({ preventScroll: true });
  }
  const closeComplete = () => { el.complete.hidden = true; };
  el.completeNext.addEventListener('click', () => { closeComplete(); on.go('#/maps'); });
  el.completeStay.addEventListener('click', closeComplete);

  // ---------- Sound ----------
  function renderSound() {
    const on = store.settings.sound;
    for (const b of soundBtns) {
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', on ? 'Sound on' : 'Sound off');
    }
  }
  for (const b of soundBtns) {
    b.addEventListener('click', () => {
      on.soundChanged(!store.settings.sound);
      renderSound();
      sound('tick');
    });
  }
  renderSound();

  // ---------- Switching ----------
  function show(screen) {
    document.body.dataset.screen = screen;
    el.title.hidden = screen !== 'title';
    el.places.hidden = screen !== 'places';
    if (screen !== 'play') closeComplete();
    if (screen === 'title') renderTitle();
    if (screen === 'places') {
      renderPlaces();
      el.list.scrollTo?.({ left: 0, top: 0 });
      requestAnimationFrame(() => $('places-title').focus({ preventScroll: true }));
    }
  }

  // Where the drifting map should sit behind each screen (px of chrome on each side).
  function insets() {
    const vw = window.innerWidth, vh = window.innerHeight;
    if (document.body.dataset.screen === 'title') {
      const top = el.titleTop.getBoundingClientRect();
      const act = el.actions.getBoundingClientRect();
      if (vw >= 900 && vw > vh) return { top: 24, bottom: 24, left: Math.max(top.right, act.right) + 24, right: 16 };
      return { top: top.bottom + 8, bottom: vh - act.top + 8, left: 8, right: 8 };
    }
    return { top: 24, bottom: 24, left: 16, right: 16 };
  }

  return { show, showComplete, insets };
}
