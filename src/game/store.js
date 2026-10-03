// Saved progress and settings, in the browser's localStorage.
//
// Shape (version 4):
//   {
//     v: 4,
//     found: { [mapId]: ['zoneId:findId', ...] },
//     cases: { [mapId]: { accused: ['suspectId', ...], solved: false } },  // whodunits
//     hints: { [mapId]: { used: 2, on: { 'zoneId:findId': 1 } } },  // hints spent, and how far
//                                                                   // each find's went (1 the line, 2 the ring)
//     finished: { [mapId]: true },                  // places whose card has come
//     oldRules: ['mapId', ...],                     // (from v3) places to check against the old
//                                                   // rule, every goose, once
//     settings: { sound: true },
//     last: { map: 'block', zone: 'laundromat' },   // where you left off
//   }
//
// To change the shape later, bump V, and teach migrate() to upgrade older saves.

import { HINTS } from './rules.js';

// The game was called Squares until session 11: its saves were under
// squares.*, and a v4 save there moves here as it is (same shape, same version).
const KEY = 'goose.save.v4';
const OLD_KEY = 'squares.save.v4';
const V = 4;

function blank() {
  return { v: V, found: {}, cases: {}, hints: {}, finished: {}, settings: { sound: true }, last: null };
}

// Older versions of the game, upgraded in place. The old keys are left alone,
// so going back to an older build still finds its save.
function migrate() {
  const data = blank();
  try {
    // v3 had no hints to count (they were free) and nothing finished: a place
    // was done at its last goose. A place done then stays done.
    const v3 = JSON.parse(localStorage.getItem('squares.save.v3') || 'null');
    if (v3 && v3.v === 3) {
      data.found = v3.found || {};
      data.cases = v3.cases || {};
      data.settings = { ...data.settings, ...v3.settings };
      data.last = v3.last || null;
      // (Checked against each place's geese the first time it's loaded: see progress.)
      data.oldRules = Object.keys(data.found);
      return data;
    }
  } catch {}
  try {
    // v2 had no cases (the first whodunit came with v3); everything else carries over.
    const v2 = JSON.parse(localStorage.getItem('squares.save.v2') || 'null');
    if (v2 && v2.v === 2) {
      data.found = v2.found || {};
      data.settings = { ...data.settings, ...v2.settings };
      data.last = v2.last || null;
      return data;
    }
  } catch {}
  try {
    // v1 kept one list of "roomId:findId" for the only map there was.
    const v1 = JSON.parse(localStorage.getItem('squares.found.v1') || 'null');
    if (Array.isArray(v1) && v1.length) data.found.block = v1;
  } catch {}
  return data;
}

// Places that moved to another id (the Block Party was at blockparty until it
// took over the Block's id): what was found there joins what's found at the
// new id. The shape doesn't change, so the version doesn't either.
const MOVED = { blockparty: 'block' };
function moved(data) {
  for (const [from, to] of Object.entries(MOVED)) {
    if (data.found[from]) {
      data.found[to] = [...new Set([...(data.found[to] || []), ...data.found[from]])];
      delete data.found[from];
    }
    if (data.last && data.last.map === from) data.last = { ...data.last, map: to };
  }
  return data;
}

function load() {
  for (const key of [KEY, OLD_KEY]) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && d.v === V) return moved({ ...blank(), ...d, settings: { ...blank().settings, ...d.settings } });
      }
    } catch {}
  }
  return moved(migrate());
}

export function createStore() {
  const data = load();
  const sets = new Map(); // mapId -> Set of found keys, for fast lookups
  const setFor = (mapId) => {
    let s = sets.get(mapId);
    if (!s) { s = new Set(data.found[mapId] || []); sets.set(mapId, s); }
    return s;
  };
  const save = () => {
    for (const [id, s] of sets) data.found[id] = [...s];
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
  };
  const caseOf = (mapId) => data.cases[mapId] || { accused: [], solved: false };
  const hintsOf = (mapId) => data.hints[mapId] || { used: 0, on: {} };

  return {
    isFound: (mapId, key) => setFor(mapId).has(key),
    markFound(mapId, key) {
      const s = setFor(mapId);
      if (s.has(key)) return false;
      s.add(key);
      save();
      return true;
    },
    // How much of a map is found (needs its world for totals). done: the place's
    // goal is met (every goose and most of its things, the case solved, or
    // the trail's last sighting found), or was when it was finished. all:
    // every find. Places with grouped finds (a whodunit, a trail) also count
    // evidence and curiosities, or sightings. hints: how many are left
    // to spend (see HINTS in rules.js).
    progress(world) {
      const s = setFor(world.id);
      let geese = 0, things = 0, evidence = 0, curios = 0, sightings = 0;
      for (const z of world.zones) {
        for (const f of z.finds) {
          if (!s.has(z.id + ':' + f.id)) continue;
          if (f.goose) geese++; else things++;
          if (f.group === 'evidence') evidence++;
          else if (f.group === 'curiosity') curios++;
          else if (f.group === 'sighting') sightings++;
        }
      }
      if (data.oldRules && data.oldRules.includes(world.id)) {
        data.oldRules = data.oldRules.filter((id) => id !== world.id);
        if (world.goal === 'geese' && world.totalGeese > 0 && geese === world.totalGeese) data.finished[world.id] = true;
        save();
      }
      const met = world.goal === 'case' ? caseOf(world.id).solved
        : world.goal === 'trail' ? sightings === world.sightings.length
        : world.totalGeese > 0 && geese === world.totalGeese && things >= world.need;
      const done = met || !!data.finished[world.id];
      const h = hintsOf(world.id), earned = HINTS.start + Math.floor((geese + things) / HINTS.every);
      return {
        geese, things, evidence, curios, sightings, done, met,
        all: geese === world.totalGeese && things === world.totalThings,
        hints: Math.max(0, earned - h.used), hintsUsed: h.used,
        // finds until the next hint comes
        toHint: HINTS.every - ((geese + things) % HINTS.every),
      };
    },
    // The card has come: the place stays done, whatever the rules become.
    finish(mapId) {
      if (data.finished[mapId]) return false;
      data.finished[mapId] = true;
      save();
      return true;
    },
    // A hint on a find: how far it has gone (0 none, 1 its line, 2 its ring).
    hintStep: (mapId, key) => hintsOf(mapId).on[key] || 0,
    // Take a hint one step further. The line costs a hint; the ring after it
    // is free. Returns the step reached, or 0 if there's no hint to spend.
    useHint(world, key) {
      const h = data.hints[world.id] = hintsOf(world.id);
      const step = h.on[key] || 0;
      if (step >= 2) return 2;
      if (step === 0) {
        if (this.progress(world).hints < 1) return 0;
        h.used++;
      }
      h.on = { ...h.on, [key]: step + 1 };
      save();
      return step + 1;
    },
    // Rough counts without building the map: how many keys are saved, and how many are geese.
    count(mapId) {
      const keys = [...setFor(mapId)];
      return { total: keys.length, geese: keys.filter((k) => k.endsWith(':goose')).length, solved: caseOf(mapId).solved };
    },
    totalGeese: () => [...Object.keys(data.found), ...sets.keys()]
      .filter((id, i, all) => all.indexOf(id) === i)
      .reduce((n, id) => n + [...setFor(id)].filter((k) => k.endsWith(':goose')).length, 0),
    // A whodunit's case: who you've accused, and whether it's solved.
    caseOf: (mapId) => ({ accused: [...caseOf(mapId).accused], solved: caseOf(mapId).solved }),
    accuse(mapId, suspectId) {
      const c = data.cases[mapId] = caseOf(mapId);
      if (c.accused.includes(suspectId)) return false;
      c.accused = [...c.accused, suspectId];
      save();
      return true;
    },
    solve(mapId) {
      const c = data.cases[mapId] = caseOf(mapId);
      if (c.solved) return false;
      c.solved = true;
      save();
      return true;
    },
    resetMap(mapId) {
      sets.set(mapId, new Set());
      delete data.cases[mapId];
      delete data.hints[mapId];
      delete data.finished[mapId];
      save();
    },
    get settings() { return data.settings; },
    setSetting(k, v) { data.settings[k] = v; save(); },
    get last() { return data.last; },
    setLast(map, zone = null) {
      if (data.last && data.last.map === map && data.last.zone === zone) return;
      data.last = { map, zone };
      save();
    },
  };
}
