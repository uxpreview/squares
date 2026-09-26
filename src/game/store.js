// Saved progress and settings, in the browser's localStorage.
//
// Shape (version 2):
//   {
//     v: 2,
//     found: { [mapId]: ['zoneId:findId', ...] },
//     settings: { sound: true },
//     last: { map: 'block', zone: 'laundromat' },   // where you left off
//   }
//
// To change the shape later, bump V, and teach migrate() to upgrade older saves.

const KEY = 'squares.save.v2';
const V = 2;

function blank() {
  return { v: V, found: {}, settings: { sound: true }, last: null };
}

// Older versions of the game, upgraded in place.
function migrate() {
  const data = blank();
  try {
    // v1 kept one list of "roomId:findId" for the only map there was.
    const v1 = JSON.parse(localStorage.getItem('squares.found.v1') || 'null');
    if (Array.isArray(v1) && v1.length) data.found.block = v1;
  } catch {}
  return data;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && d.v === V) return { ...blank(), ...d, settings: { ...blank().settings, ...d.settings } };
    }
  } catch {}
  return migrate();
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

  return {
    isFound: (mapId, key) => setFor(mapId).has(key),
    markFound(mapId, key) {
      const s = setFor(mapId);
      if (s.has(key)) return false;
      s.add(key);
      save();
      return true;
    },
    // How many geese and things are found on a map (needs its world for totals).
    // done: every goose found (the goal). all: every goose and every thing.
    progress(world) {
      const s = setFor(world.id);
      let geese = 0, things = 0;
      for (const z of world.zones) for (const f of z.finds) if (s.has(z.id + ':' + f.id)) f.goose ? geese++ : things++;
      const done = world.totalGeese > 0 && geese === world.totalGeese;
      return { geese, things, done, all: done && things === world.totalThings };
    },
    // Rough counts without building the map: how many keys are saved, and how many are geese.
    count(mapId) {
      const keys = [...setFor(mapId)];
      return { total: keys.length, geese: keys.filter((k) => k.endsWith(':goose')).length };
    },
    totalGeese: () => [...Object.keys(data.found), ...sets.keys()]
      .filter((id, i, all) => all.indexOf(id) === i)
      .reduce((n, id) => n + [...setFor(id)].filter((k) => k.endsWith(':goose')).length, 0),
    resetMap(mapId) {
      sets.set(mapId, new Set());
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
