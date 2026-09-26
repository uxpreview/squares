// Every place in the game, in picker order.
//
// Each map loads only when it's needed, so adding places doesn't slow down the
// first visit. The fields here are what the picker shows before a map loads.
//
// To add a place: make a folder next to block/ with a map.js (copy the shape of
// tower/map.js), then add a line here. See README "Adding a place".

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
    load: () => import('./tower/map.js'),
  },
];
