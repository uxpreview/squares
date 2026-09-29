// Saved progress and settings, in the browser's localStorage.
//
// Shape (version 3):
//   {
//     v: 3,
//     found: { [mapId]: ['zoneId:findId', ...] },
//     cases: { [mapId]: { accused: ['suspectId', ...], solved: false } },  // whodunits
//     settings: { sound: true },
//     last: { map: 'block', zone: 'laundromat' },   // where you left off
//   }
//
// To change the shape later, bump V, and teach migrate() to upgrade older saves.

const KEY = 'squares.save.v3';
const V = 3;

function blank() {
  return { v: V, found: {}, cases: {}, settings: { sound: true }, last: null };
}

// Older versions of the game, upgraded in place. The old keys are left alone,
// so going back to an older build still finds its save.
function migrate() {
  const data = blank();
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
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && d.v === V) return moved({ ...blank(), ...d, settings: { ...blank().settings, ...d.settings } });
    }
  } catch {}
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
    // goal is met (every goose, or the case solved). all: that, and every find.
    // Places with grouped finds (a whodunit) also count evidence and curiosities.
    progress(world) {
      const s = setFor(world.id);
      let geese = 0, things = 0, evidence = 0, curios = 0;
      for (const z of world.zones) {
        for (const f of z.finds) {
          if (!s.has(z.id + ':' + f.id)) continue;
          if (f.goose) geese++; else things++;
          if (f.group === 'evidence') evidence++;
          else if (f.group === 'curiosity') curios++;
        }
      }
      const done = world.goal === 'case' ? caseOf(world.id).solved : world.totalGeese > 0 && geese === world.totalGeese;
      return { geese, things, evidence, curios, done, all: done && things === world.totalThings && geese === world.totalGeese };
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
