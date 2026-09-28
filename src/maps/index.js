// Every place in the game, in picker order.
//
// Each map loads only when it's needed, so adding places doesn't slow down the
// first visit. The fields here are what the picker shows before a map loads.
//
// To add a place: make a folder next to block/ with a map.js (copy the shape of
// tower/map.js), then add a line here. See README "Adding a place".
//
// hidden: true keeps a place out of the picker and "continue" (it still opens
// from a direct link, for testing). Use it for retired or unfinished places.

export default [
  {
    id: 'block',
    name: 'The Block',
    tagline: 'Sixteen rooms. One loose goose in each.',
    ink: '#E3603F',
    load: () => import('./block/map.js'),
  },
  {
    id: 'tower',
    name: 'The Walk-Up',
    tagline: 'Four floors of neighbors, pulled apart so you can see in.',
    ink: '#2E8B84',
    unlock: { geese: 8 }, // only used when config.lockMaps is on
    // Retired from the picker: too close to The Block. Kept because it's the
    // test bed for stacked floors (the "above" cutaway). See docs/LEVELS.md.
    hidden: true,
    load: () => import('./tower/map.js'),
  },
  {
    id: 'manor',
    name: 'Gooseworth Manor',
    tagline: 'A stormy night, a body in the trifle, six suspects and a goose.',
    ink: '#8E2F3A',
    load: () => import('./manor/map.js'),
  },
  {
    id: 'crossroads',
    name: 'The Crossroads',
    tagline: 'A test bed: areas of any shape, and people walking between them.',
    ink: '#6A5A9C',
    // Not a level: the test bed for areas of any shape (ROADMAP E5), kept for
    // checking engine changes. Opens from #/crossroads.
    hidden: true,
    load: () => import('./crossroads/map.js'),
  },
  {
    id: 'blockparty',
    name: 'The Block Party',
    tagline: 'Sixteen rooms, one street party, a goose in every room.',
    ink: '#E3603F',
    // The Block, connected (docs/levels/block.md), at its greybox. Opens from
    // #/blockparty; when it ships it takes over The Block's id.
    hidden: true,
    load: () => import('./blockparty/map.js'),
  },
];
