// The evening: everyone at the manor on one clock, walking from room to room
// through the doors and stairs in plan.js. The engine draws each person in
// whichever room they're standing in (see walkers in src/engine/world.js).
//
// The beats, in seconds into the loop:
//     0  dinner. The Brigadier starts his war story.
//    28  people drift off: Crane upstairs, Philippa to the conservatory,
//        Rupert to the billiard room, Jenkins down to the cellar
//    75  Crane and the Brigadier creep past each other in the upstairs corridor
//    78  the lights flicker, and go out at 82
//    95  the maid screams in the library; the lights come back; everyone runs there
//   148  everyone drifts back to the dining room for the second trifle
//
// npm run qa checks every walk: through doors, never through walls.
import { schedule } from '../../engine/actors.js';
import { Q, person, speech } from '../../engine/art.js';
import { tag } from '../greybox.js';
import { DOOR, STAIRS, LOOP } from './plan.js';
import { CAST } from './style.js';

const WALK = 1.3, RUN = 3;

// A little walk builder: start somewhere, then go to points and through doors.
function from(x, y, z = 0) {
  const steps = [[x, y, z]];
  let at = [x, y, z];
  const b = {
    steps,
    to(nx, ny, nz = at[2]) {
      steps.push([nx, ny, nz]);
      at = [nx, ny, nz];
      return b;
    },
    // Through a door: line up just in front of it, and come out just beyond.
    door(id) {
      const d = DOOR[id];
      const s = (d.axis === 'x' ? at[0] : at[1]) >= d.plane ? 1 : -1;
      if (d.axis === 'x') return b.to(d.plane + s * 1.3, d.y, d.z).to(d.plane - s * 1.3, d.y, d.z);
      return b.to(d.x, d.plane + s * 1.3, d.z).to(d.x, d.plane - s * 1.3, d.z);
    },
    upstairs: () => b.to(...STAIRS.grand.bottom).to(...STAIRS.grand.top),
    downstairs: () => b.to(...STAIRS.grand.top).to(...STAIRS.grand.bottom),
    toCellar: () => b.to(STAIRS.cellar.top[0], STAIRS.cellar.top[1] + 1, 0).to(...STAIRS.cellar.top).to(...STAIRS.cellar.bottom),
    fromCellar: () => b.to(...STAIRS.cellar.bottom).to(...STAIRS.cellar.top).to(STAIRS.cellar.top[0], STAIRS.cellar.top[1] + 1, 0),
    until(t, extra = {}) {
      steps.push({ until: t, ...extra });
      return b;
    },
    speed(v) {
      steps.push({ speed: v });
      return b;
    },
  };
  return b;
}

// Seats at dinner (world units). Back row faces the viewer; front row has its back to us.
const SEAT = {
  philippa: [23, 5.2], rupert: [25.5, 5.2],
  brigadier: [20.5, 10.2], crane: [23, 10.2],
};
const backRow = { pose: 'sit', dir: 'l' };
const frontRow = { pose: 'sit', dir: 'r', back: true };

const DAYS = {
  philippa: from(...SEAT.philippa).until(34, backRow)
    .to(23, 3.2).to(30.9, 3.2).to(30.9, 12.6).door('hall-dining').to(28, 21).door('conservatory-hall').to(40, 27.8)
    .until(96, { dir: 'r' })
    .speed(RUN).door('conservatory-hall').to(17.3, 24).door('hall-billiard').door('billiard-library').to(11.5, 12.5)
    .until(157).speed(WALK)
    .door('dining-library').to(18.4, 5.2).to(...SEAT.philippa).until(LOOP, backRow),

  rupert: from(...SEAT.rupert).until(44, backRow)
    .to(30.9, 5.2).to(30.9, 12.6).door('hall-dining').to(28, 21).door('hall-billiard').to(9.8, 27.8)
    .until(80, { pose: 'sit', dir: 'r' }).until(88, { pose: 'sit', dir: 'r', say: 'I bet the house!' }).until(97, { pose: 'sit', dir: 'r' })
    .speed(RUN).to(10.8, 25).door('billiard-library').to(12.5, 12.8)
    .until(150).speed(WALK)
    .door('dining-library').to(18.4, 5.2).to(...SEAT.rupert).until(LOOP, backRow),

  brigadier: from(...SEAT.brigadier).until(28, frontRow).until(50, { ...frontRow, say: 'In 1974...' })
    .to(28.8, 11.2).door('hall-dining').upstairs().to(17.2, 19.4).to(18.4, 20.5).to(28, 20.5).to(28, 24).to(27.5, 28)
    .until(97, { dir: 'r', back: true })
    .speed(RUN).to(28, 24).to(28, 20.5).to(18.4, 20.5).to(17.2, 19.4).downstairs().door('hall-dining').to(17.3, 10.6).door('dining-library').to(7.5, 12.5)
    .until(162).speed(WALK)
    .door('dining-library').to(...SEAT.brigadier).until(LOOP, frontRow),

  crane: from(...SEAT.crane).until(28, frontRow)
    .to(28.8, 11.2).door('hall-dining').upstairs().to(17.2, 19.4).to(18.4, 20.5).to(28, 20.5).to(28, 24).to(27, 27.5)
    .until(64, { dir: 'r', back: true })
    .to(28, 24).to(28, 20.5).to(20, 20.5).to(20, 24).to(19.5, 28)
    .until(97, { dir: 'l', back: true })
    .speed(RUN).to(20, 24).to(20, 20.5).to(18.4, 20.5).to(17.2, 19.4).downstairs().door('hall-dining').to(17.3, 10.6).door('dining-library').to(9.5, 11.5)
    .until(158).speed(WALK)
    .door('dining-library').to(...SEAT.crane).until(LOOP, frontRow),

  jenkins: from(31, 11.5).until(30, { dir: 'l' })
    .door('kitchen-dining').toCellar().to(39.5, 8.5)
    .until(58).until(66, { say: 'Nobody pays me anyway' }).until(96)
    .speed(RUN).fromCellar().door('kitchen-dining').to(17.3, 10.6).door('dining-library').to(13, 6.5)
    .until(161).speed(WALK)
    .door('dining-library').to(18.5, 11.8).to(31, 11.8).to(31, 11.5).until(LOOP, { dir: 'l' }),

  hatchett: from(40, 10.3).until(40, { dir: 'r', back: true }).until(48, { dir: 'r', back: true, say: 'Out of respect' }).until(97, { dir: 'r', back: true })
    .speed(RUN).door('conservatory-kitchen').door('conservatory-hall').to(17.3, 24).door('hall-billiard').door('billiard-library').to(13.5, 14)
    .until(148).speed(WALK)
    .door('dining-library').door('kitchen-dining').to(40, 10.3).until(LOOP, { dir: 'r', back: true }),

  maid: from(30.5, 3.2).until(18, { dir: 'l' })
    .to(17.8, 3).door('dining-library').to(13, 5)
    .until(48).door('billiard-library').to(13, 21).door('hall-billiard').to(23, 26)
    .until(72).door('hall-billiard').door('billiard-library').to(11.2, 10)
    .until(95).until(101, { pose: 'cheer', say: 'AAAAH!' }).until(150)
    .door('dining-library').to(17.8, 3).to(30.5, 3.2).until(LOOP, { dir: 'l' }),

  pidge: from(5.8, 12.8).until(8, { dir: 'l', back: true }).until(16, { dir: 'l', back: true, say: 'Where were you at midnight?' }).until(22, { dir: 'l', back: true })
    .to(10.4, 9.8).until(30, { dir: 'l', back: true }).until(36, { dir: 'l', back: true, say: 'Hmm. Six feet.' }).until(40, { dir: 'l', back: true })
    .door('billiard-library').to(13, 21).door('hall-billiard').to(24, 28).door('front-door').to(25.8, 38.2)
    .until(70, { dir: 'r', back: true }).until(76, { dir: 'r', back: true, say: 'Still stuck.' }).until(84, { dir: 'r', back: true })
    .door('front-door').to(17.3, 24).door('hall-billiard').to(13, 21).door('billiard-library').to(5.8, 12.8)
    .until(120, { dir: 'l', back: true }).until(128, { dir: 'l', back: true, say: 'Nobody leaves!' })
    .until(140, { dir: 'l', back: true }).until(148, { dir: 'l', back: true, say: 'You. Bear. Talk.' }).until(LOOP, { dir: 'l', back: true }),

  gardener: from(19.5, 43).until(10, { dir: 'l' }).until(18, { dir: 'l', say: 'Left? Or left?' }).until(28, { dir: 'l' })
    .to(21.5, 40.5).to(23, 36).door('front-door').door('conservatory-hall').to(41.3, 27.8)
    .until(100, { dir: 'l' })
    .door('conservatory-hall').door('front-door').to(23, 36).to(21.5, 40.5).to(19.5, 43).until(LOOP, { dir: 'l' }),
};

// Names and speech only show once you're close enough to read them.
const readable = () => Q.detail && Q.pxPerUnit >= 14;

// Every walk that doesn't fit is reported at once, so they can all be fixed together.
const problems = [];
export const walkers = Object.entries(DAYS).map(([id, b]) => {
  const c = CAST[id];
  let at;
  try {
    at = schedule(b.steps, { loop: LOOP, speed: WALK, name: c.name });
  } catch (e) {
    problems.push(e.message);
    return null;
  }
  return {
    id,
    name: c.name,
    color: c.color,
    loop: LOOP,
    at,
    draw(ctx, t, p) {
      person(ctx, p.x, p.y, p.z, { ...c.look, pose: p.pose, dir: p.dir, back: p.back }, t);
      if (!readable()) return;
      const top = p.z + (p.pose === 'sit' ? 2.3 : 2.9);
      if (p.say) speech(ctx, p.x, p.y, top + 0.1, p.say, { size: 0.5 });
      else tag(ctx, p.x, p.y, top, c.name, { size: 0.34 });
    },
  };
}).filter(Boolean);
if (problems.length) throw new Error('The evening does not fit:\n' + problems.join('\n'));
