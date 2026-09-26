// Game-wide switches. Change these without touching any other code.

export default {
  name: 'Squares',
  tagline: 'A hidden-object picture book. Every place has a loose goose.',

  // The link back to the portfolio on the title screen. Set to null once
  // Squares lives on its own.
  backLink: { href: 'https://ryankm.com/lab', label: 'Lab' },

  // false: every place is open from the start.
  // true: a place opens once you've found enough geese in total (each map's
  // `unlock.geese` in src/maps/index.js).
  lockMaps: false,

  // Show a "more places on the way" card at the end of the picker.
  teaseMore: true,
};
