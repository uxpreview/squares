// The trail: a level format beside the whodunit (case.js). Something is loose,
// and you follow it: a chain of sightings, each one a find in the place,
// that come in order. Only the next sighting can be found; finding it says
// where it went (a witness's line), which points to the one after. The last
// sighting corners it, and that's the ending. All-You-Can-Eat's iguana is the
// first; the goose's trail from place to place reuses it later.
//
// The ending is the map's finale (map.finale: the clock jumps, the camera
// flies to where it's cornered, the card waits), as at the Block Party.
//
// A sighting is an ordinary find (R.find in its zone), so saves need nothing
// new: how far along the trail you are is how many sightings are found. The
// art draws the quarry only at the sighting you're on (the map's onStep tells
// it), so every one you see is the one to tap.
//
// A trail:
//   {
//     title, intro, ink,                   // the log's heading, a line under it, its accent color
//     quarry: 'The iguana',                // what's loose, for the copy
//     sightings: [{
//       find: 'zone:find',                 // the find this sighting is
//       who, says,                         // the witness line that points to it (who: a cast id)
//       seen,                              // once found, what the log says about it
//     }],
//     names: { [who]: 'Name' },            // everyone who speaks
//     portrait(ctx, id, w, h, t, dpr),     // draws a witness, framed
//     onStep(step, found),                 // tell the map's art which sighting is next
//                                          //   (step: its index; found: when each was found, page time)
//   }

const keyOf = (zone, f) => zone.id + ':' + f.id;

// Check a trail against its place, and mark its finds (f.group 'sighting',
// f.step its place in the chain). Called from case.js's setUp.
export function setUpTrail(world) {
  const tr = world.map.trail;
  world.goal = 'trail';
  const byKey = new Map();
  for (const z of world.zones) for (const f of z.finds) byKey.set(keyOf(z, f), { zone: z, f });
  const missing = tr.sightings.filter((s) => !byKey.has(s.find)).map((s) => s.find);
  if (missing.length) throw new Error('The trail names finds that aren\'t in the place:\n' + missing.join('\n'));
  world.sightings = tr.sightings.map((s, i) => {
    const { zone, f } = byKey.get(s.find);
    f.group = 'sighting';
    f.step = i;
    // Under its name on the list: who saw it go there.
    if (!f.riddle) f.riddle = `${(tr.names && tr.names[s.who]) || s.who}: "${s.says}"`;
    return { ...s, zone, f };
  });
  return world;
}

// How far along the trail you are: the first sighting not yet found.
export function trailStep(world, isFound) {
  let i = 0;
  while (i < world.sightings.length && isFound(world.sightings[i].find)) i++;
  return i;
}

// Everything the log needs to show.
export function trailState(world, isFound) {
  const tr = world.map.trail;
  const step = trailStep(world, isFound);
  return {
    title: tr.title,
    intro: tr.intro,
    ink: tr.ink,
    quarry: tr.quarry,
    step,
    total: world.sightings.length,
    done: step >= world.sightings.length,
    sightings: world.sightings.map((s, i) => ({
      who: s.who,
      name: (tr.names && tr.names[s.who]) || s.who,
      says: s.says,
      seen: s.seen,
      zone: s.zone.name,
      note: s.f.note || '',
      found: i < step,
      next: i === step,
    })),
  };
}
