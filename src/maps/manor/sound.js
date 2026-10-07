// The Manor's sound: rain all night and the wind round the house, loudest on
// the grounds, muffled indoors (barely, under the conservatory's glass, and
// most of all in the cellar). Inside, each room has its own: a fire in the
// grate (the library, the dining room, the billiard room, the bedroom and
// the kitchen's range), the grandfather clock ticking in the hall, water
// dripping in the cellar. And on the clock: thunder after every strike
// (sooner and louder for the big ones), someone at the organ, the lights
// going out, the grandfather clock striking midnight in the hall. Every bed
// and cue sits under a honk (node tools/sound.mjs manor).
import { storm, MIDNIGHT } from './style.js';

const cues = [
  // (A big strike is meant to make you jump: loud, louder than a honk.)
  ...storm.strikes.map((s) => ({ at: s.t + (s.big ? 0.3 : 1.1), name: 'thunder', big: s.big, loud: s.big })),
  { at: 57, name: 'organ' },
  { at: 82, name: 'clunk' },
  { at: MIDNIGHT, name: 'bell', zone: 'grand-hall' },
  { at: MIDNIGHT + 1.7, name: 'bell', zone: 'grand-hall' },
  { at: MIDNIGHT + 3.4, name: 'bell', zone: 'grand-hall' },
];

// Each room: what you hear inside, and how muffled the storm is.
const ROOMS = {
  library: { fire: 1, clock: 0.2 },
  'dining-room': { fire: 0.8 },
  kitchen: { fire: 0.6, oven: 0.4 },
  'billiard-room': { fire: 0.7 },
  'grand-hall': { clock: 1, muffle: 0.5 },
  conservatory: { muffle: 0.15, wind: 0.6 },
  'master-bedroom': { fire: 0.6, clock: 0.3 },
  'taxidermy-room': { clock: 0.4, wind: 0.8 },
  'guest-rooms': { clock: 0.3 },
  cellar: { drip: 1, rain: 0.5, wind: 0, muffle: 0.9 },
};

function bed(t, here) {
  if (here.zone === 'grounds') return { rain: 1, wind: 1 };
  const room = ROOMS[here.zone];
  if (!room) return { rain: 0.9, wind: 0.6, muffle: 0.2 }; // the whole house, cut open
  return { rain: 0.9, wind: 0.4, muffle: 0.6, ...room };
}

export const sound = { bed, cues };
