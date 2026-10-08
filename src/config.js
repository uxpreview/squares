// Game-wide switches. Change these without touching any other code.

export default {
  name: 'Goose at Large',
  // The title screen's wordmark, a line each.
  wordmark: ['Goose', 'at Large'],
  tagline: 'A hidden-object picture book. Have you seen this goose?',

  // The link back to the portfolio on the title screen. Set to null once
  // the game lives on its own address.
  backLink: { href: 'https://ryankm.com/lab', label: 'Lab' },

  // false: every place is open from the start.
  // true: a place opens once you've found enough geese in total (each map's
  // `unlock.geese` in src/maps/index.js).
  lockMaps: false,

  // Show a "more places on the way" card at the end of the picker.
  teaseMore: true,
};
