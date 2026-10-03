// Level formats: what a place's goal is, and how its finds are grouped.
//
// Most places are a hunt: the goal is every goose, and everything else is a
// thing to find. A place with a case file (map.case) is a whodunit instead:
// its goal is solving the case, and its finds come in two groups, evidence
// (every find the case file mentions) and curiosities (the rest). You can
// accuse anyone, any time: a wrong accusation plays that suspect's alibi (and
// a joke), and naming the culprit works once you've found every clue against
// them. The Manor is the first (src/maps/manor/case.js); later mysteries reuse it.
//
// A case file:
//   {
//     title, intro, ink,                   // the sheet's heading, a line under it, its accent color
//     culprit: 'goose',                    // who did it (a suspect id)
//     suspects: [{
//       id, name, role, motive,
//       against: [{ find: 'zone:find', says }],  // what makes them look guilty (a clue
//                                                // with no find is always known)
//       alibi:   [{ find: 'zone:find', says }],  // what clears them
//       scene:   [[who, line], ...],             // a wrong accusation, played out
//       cleared: 'one line for their card once they're cleared',
//       hidden: { name, role },                  // (the culprit) shown as a mystery
//     }],                                        //   until every clue is found
//     notYet(have, need): [[who, line], ...],    // naming the culprit too early
//     reveal: { lines: [[who, line], ...], zone, at, text },  // naming them right
//     portrait(ctx, id, w, h, t),                // draws anyone in the case, framed
//     onSolved(at), onOpen(),                    // tell the map's art (the goose takes the chair)
//   }

import { need } from './rules.js';
import { setUpTrail } from './trail.js';

const keyOf = (zone, f) => zone.id + ':' + f.id;

// Work out a world's format once it's built: its goal, and each find's group.
// (A place with a trail instead of a case is set up in trail.js.)
export function setUp(world) {
  const c = world.map.case;
  world.goal = c ? 'case' : 'geese';
  world.totals = { evidence: 0, curiosity: 0 };
  // The things that finish it, with every goose (a whodunit finishes at the case).
  world.need = need(world.totalThings);
  // A find inside a poke can name it by id.
  for (const z of world.zones) for (const f of z.finds) {
    if (typeof f.inside === 'string') {
      const p = z.pokes.find((q) => q.id === f.inside);
      if (!p) throw new Error(`${z.id}: the find "${f.id}" is inside "${f.inside}", which isn't one of its pokes.`);
      f.inside = p;
    }
  }
  // A trail (trail.js): follow something loose, sighting by sighting.
  if (world.map.trail) return setUpTrail(world);
  if (!c) return world;
  const byKey = new Map();
  for (const z of world.zones) for (const f of z.finds) byKey.set(keyOf(z, f), { zone: z, f });
  const named = new Set();
  const missing = [];
  for (const s of c.suspects) {
    for (const clue of [...(s.against || []), ...(s.alibi || [])]) {
      if (!clue.find) continue;
      if (byKey.has(clue.find)) named.add(clue.find);
      else missing.push(`${s.name}: ${clue.find}`);
    }
  }
  if (missing.length) throw new Error('The case file names finds that aren\'t in the place:\n' + missing.join('\n'));
  if (!c.suspects.some((s) => s.id === c.culprit)) throw new Error(`The case file's culprit "${c.culprit}" isn't one of its suspects.`);
  for (const [key, { f }] of byKey) {
    if (f.goose) continue;
    f.group = named.has(key) ? 'evidence' : 'curiosity';
    world.totals[f.group]++;
  }
  world.caseFinds = byKey;
  return world;
}

// Everything the case file needs to show, from what's been found and who's
// been accused. isFound(key) says whether 'zone:find' has been found.
export function caseState(world, isFound, saved) {
  const c = world.map.case;
  const accused = new Set(saved.accused);
  const clue = (x) => {
    const hit = x.find ? world.caseFinds.get(x.find) : null;
    return {
      find: x.find || null,
      label: hit ? hit.f.label : null,
      zone: hit ? hit.zone.name : null,
      says: x.says,
      found: x.find ? isFound(x.find) : true,
    };
  };
  const suspects = c.suspects.map((s) => {
    const against = (s.against || []).map(clue);
    const alibi = (s.alibi || []).map(clue);
    const culprit = s.id === c.culprit;
    const ready = culprit && against.every((x) => x.found);
    const wasAccused = accused.has(s.id);
    return {
      id: s.id,
      culprit,
      hidden: !!s.hidden && !ready && !saved.solved,
      name: s.name,
      role: s.role,
      motive: s.motive,
      shown: s.hidden && !ready && !saved.solved ? s.hidden : { name: s.name, role: s.role },
      against,
      alibi,
      accused: wasAccused,
      // Cleared: their alibi is all found, or they were accused and gave it.
      cleared: !culprit && (wasAccused || (alibi.length > 0 && alibi.every((x) => x.found))),
      guilty: culprit && saved.solved,
      ready,
      cluesFound: against.filter((x) => x.found).length,
      clues: against.length,
      line: s.cleared,
    };
  });
  let found = 0;
  for (const [key, { f }] of world.caseFinds) if (f.group === 'evidence' && isFound(key)) found++;
  return {
    title: c.title,
    intro: c.intro,
    ink: c.ink,
    solved: !!saved.solved,
    wrong: saved.accused.filter((id) => id !== c.culprit).length,
    evidence: { found, total: world.totals.evidence },
    suspects,
  };
}

// Accusing someone: what happens. Returns { kind: 'wrong' | 'not-yet' | 'solved',
// lines } (and records the accusation through store).
export function accuse(world, state, id) {
  const c = world.map.case;
  const s = state.suspects.find((x) => x.id === id);
  const def = c.suspects.find((x) => x.id === id);
  if (!s || !def) return null;
  if (s.culprit) {
    if (!s.ready) return { kind: 'not-yet', lines: c.notYet(s.cluesFound, s.clues) };
    return { kind: 'solved', lines: c.reveal.lines };
  }
  return { kind: 'wrong', lines: def.scene };
}
