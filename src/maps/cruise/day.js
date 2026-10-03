// The day: everyone on the ship on one clock, 7am to 7pm, walking through the
// doors in plan.js and riding the lift between decks. The engine draws each
// person in whichever area they're standing in (walkers in engine/world.js).
//
// The beats (seconds into the loop; 20 seconds an hour):
//     0  7am. The buffet opens. Doreen first through the doors (she's number 2),
//        Pidge questioning the butter swan
//    40  9am. Ray thrown out of cabin 7 (later, to the roulette wheel)
//    60  10am. The lifeboat drill on the Sun Deck; the kids' show in the theater
//    80  11am. Chad carried from the pool bar to his cabin by a steward
//   100  noon. The limbo at the pool
//   120  1pm. Dr. Swabb tapes off the salad bar
//   160  3pm. Bingo in the theater
//   220  6pm. The port; nobody gets off
//
// Who's green, and when, is in style.js (SICK, HERRING).
// npm run qa checks every walk: through doors, never through walls.
import { schedule } from '../../engine/actors.js';
import { speech } from '../../engine/art.js';
import { tag } from '../greybox.js';
import { DOOR, LIFT, LOOP, DECK } from './plan.js';
import { CAST, drawCast, readable, at, headroom } from './style.js';

const WALK = 1.6, RIDE = 7;
const P = DECK.promenade, CB = DECK.cabins, SUN = DECK.sun, CREW = DECK.crew;

// A little walk builder: start somewhere, then go to points, through doors
// and up and down in the lift.
function from(x, y, z = 0) {
  const steps = [[x, y, z]];
  let here = [x, y, z], pace = WALK;
  const b = {
    steps,
    to(nx, ny, nz = here[2]) {
      steps.push([nx, ny, nz]);
      here = [nx, ny, nz];
      return b;
    },
    // Through a door: line up just in front of it, and come out just beyond.
    door(id) {
      const d = DOOR[id];
      const z = d.z;
      const s = (d.axis === 'x' ? here[0] : here[1]) >= d.plane ? 1 : -1;
      if (d.axis === 'x') return b.to(d.plane + s * 1.3, d.y, z).to(d.plane - s * 1.3, d.y, z);
      return b.to(d.x, d.plane + s * 1.3, z).to(d.x, d.plane - s * 1.3, z);
    },
    // The lift: into its doors, up or down to deck z, and out.
    lift(z) {
      b.to(LIFT.x, LIFT.y + 1.6).to(LIFT.x, LIFT.y);
      steps.push({ speed: RIDE });
      b.to(LIFT.x, LIFT.y, z);
      steps.push({ speed: pace });
      return b.to(LIFT.x, LIFT.y + 1.6, z);
    },
    until(t, extra = {}) {
      steps.push({ until: t, ...extra });
      return b;
    },
    say(t0, t1, line, extra = {}) {
      return b.until(t0, extra).until(t1, { ...extra, say: line });
    },
    speed(v) {
      pace = v;
      steps.push({ speed: v });
      return b;
    },
  };
  return b;
}

const SIT = { pose: 'sit' };

const DAYS = {
  // First through the doors at 7am, every morning since 1987.
  doreen: from(18.5, 12.5, P).say(0, 4, 'Number 2!')
    .to(22.8, 9).to(23.2, 7).to(30, 6.5).until(at(7.7), { dir: 'r', back: true })
    .to(23.2, 7).to(22.8, 9).to(23.2, 10.7).to(28, 11).until(34, SIT)
    .door('theater-buffet-2').to(12, 6).lift(CB).to(12, 12)
    .until(at(10.2), SIT).say(at(10.2), at(10.6), 'I feel funny.', SIT).until(at(13), SIT)
    .to(12, 6).lift(CREW).door('engine-crew').to(42, 5).door('crew-sick').to(59.5, 6.5)
    .until(at(16.8), { dir: 'r', back: true })
    .door('crew-sick').door('engine-crew').to(12, 6).lift(P).to(14.5, 12).door('theater-buffet-2')
    .to(18.5, 12.5).until(LOOP, { dir: 'r', back: true }),

  // At the pool bar since last night, until the stewards carry him home at 11.
  // (On the Sun Deck everyone keeps to the back of the pool, y 4, or its
  // front, y 11.8: the water is world x 28 to 40, y 5 to 11.)
  chad: from(38, 4, SUN).until(at(8), { dir: 'r' }).say(at(8), at(8.5), 'Another Green Mermaid!', { dir: 'r' }).until(at(11), { dir: 'r' })
    .speed(1.4).to(22, 4).door('slide-pool').to(12, 5).lift(CB).to(45, 6).to(45, 12.5)
    // On his bed (cabin 12's is x 44.6 to 47.4, its top at 0.75), as Harold lies on his.
    .to(46.6, 14, CB + 0.75).until(at(15.5), { pose: 'sleep', dir: 'r', ahead: 0.6 }).speed(WALK)
    .to(45, 12.5, CB).to(45, 6).to(12, 5).lift(SUN).to(14, 6).door('slide-pool').to(22, 4).to(38, 4).until(LOOP, { dir: 'r' }),

  // Carries Chad home, then does the towel animals.
  steward: from(30, 4, CB).until(at(9.2), { dir: 'l' })
    .to(12, 5).lift(SUN).to(14, 6).door('slide-pool').to(22, 4.4).to(36.5, 4.4).until(at(11), { dir: 'l' })
    .speed(1.4).to(22, 4.8).door('slide-pool').to(12, 6.2).lift(CB).to(44, 7).to(46.6, 11.8).until(at(13.6)).speed(WALK)
    .to(36, 5).until(at(15), { dir: 'l' }).to(6, 5).until(at(17), { dir: 'r' }).to(30, 4).until(LOOP, { dir: 'l' }),

  // In the spa in her cucumber mask, except for the eggs at 7am.
  gloria: from(32, 4.5, P).until(at(7.5), { dir: 'r', back: true })
    .door('theater-buffet').to(12, 4).lift(CB).to(46, 3.2).door('cabins-adults').to(66, 8)
    .until(at(11), SIT).say(at(11), at(11.4), 'Ahh. Pink again.', SIT).until(at(12.5), SIT)
    .to(52, 3.2).door('cabins-adults').to(12, 4).lift(SUN).to(14, 5).door('slide-pool').to(22, 11.8).to(29.5, 11.8).to(29.5, 13.4)
    .until(at(17), SIT)
    .to(29.5, 11.8).to(22, 11.8).door('slide-pool').to(12, 4).lift(P).to(14, 3.2).door('theater-buffet').to(18, 4.2).to(32, 4.5).until(LOOP, { dir: 'r', back: true }),

  // Hasn't left the wheel in four days.
  captain: from(66, 5.5, SUN).until(at(9), { dir: 'r' }).say(at(9), at(9.4), "I'm fine.", { dir: 'r' })
    .until(at(14), { dir: 'r' }).say(at(14), at(14.4), 'Steady as she goes.', { dir: 'r' })
    .until(at(17.5), { dir: 'r' }).say(at(17.5), at(18), 'Land ho. Nobody gets off.', { dir: 'r' }).until(LOOP, { dir: 'r' }),

  // At the carving station, and down to the stores for more shrimp at 1.
  chef: from(41, 4.5, P).until(at(8.5), { dir: 'l' }).say(at(8.5), at(8.9), 'Shrimp, madame?', { dir: 'l' }).until(at(13), { dir: 'l' })
    .door('theater-buffet').to(12, 4).lift(CREW).door('engine-crew').to(36, 4).until(at(15), { dir: 'r', back: true })
    .door('engine-crew').to(12, 4).lift(P).to(14, 3.2).door('theater-buffet').to(18, 4.2).to(41, 4.5).until(LOOP, { dir: 'l' }),

  // Doreen's grandson, eight, loose.
  tyler: from(20.5, 13.5, P).until(at(8), { dir: 'r', back: true })
    .door('theater-buffet-2').to(10, 10).until(at(11), SIT)
    .to(14, 12).door('theater-buffet-2').to(19, 11.5).to(36, 11.5).to(39.5, 9.5).to(44.2, 7.2).to(44.2, 4.9).door('buffet-casino').to(62, 9).until(at(13), { dir: 'r', back: true })
    .door('buffet-casino').to(44.2, 4.4).to(39, 4.4).to(33.5, 6.2).to(18.5, 6.2).door('theater-buffet').to(12, 5).lift(SUN).to(14, 7).door('slide-pool').to(22, 12).until(at(17), { dir: 'l' })
    .to(18, 8).door('slide-pool').to(12, 5).lift(P).to(14, 12).door('theater-buffet-2').to(20.5, 13.5).until(LOOP, { dir: 'r', back: true }),

  // Cabin 7: Brenda inside, Ray in the corridor, all day.
  brenda: from(27, 12, CB).until(at(9), { dir: 'r', back: true }).say(at(9), at(9.4), 'And take your lamp!', { dir: 'r', back: true })
    .until(at(13), { dir: 'r', back: true }).say(at(13), at(13.4), 'The salad, Ray!', { dir: 'r', back: true }).until(LOOP, { dir: 'r', back: true }),

  ray: from(27, 5, CB).until(at(9), { dir: 'l' }).say(at(9.4), at(9.8), 'It was a gift!', { dir: 'l' })
    .to(12, 5).lift(P).to(14, 3.2).door('theater-buffet').to(18, 4.2).to(44, 4.2).door('buffet-casino').to(64, 12).until(at(16), SIT)
    .to(60.5, 10).to(60.5, 5).door('buffet-casino').to(44, 4.2).to(18, 4.2).door('theater-buffet').to(12, 5).lift(CB).to(27, 5).until(LOOP, { dir: 'l' }),

  // The cruise director: the drill at 10, the limbo at noon, bingo at 3.
  kelly: from(22, 5, SUN).say(0, 5, 'Good morning, sunshines!')
    .to(34, 2.6).until(at(10), { dir: 'l' }).say(at(10), at(10.6), 'Muster stations, please!', { dir: 'l' }).until(at(11.5), { dir: 'l' })
    .to(27, 3.5).to(27, 5.4).until(at(12), { dir: 'l' }).say(at(12), at(12.3), 'How low can you go?', { dir: 'l' }).until(at(13.5), { dir: 'l' })
    .to(23, 4.6).to(18, 6).door('slide-pool').to(12, 5).lift(P).to(11, 4).until(at(15), { dir: 'r', back: false }).say(at(15), at(15.5), 'B four! Before...', { dir: 'r' })
    .until(at(16.5), { dir: 'r' })
    .to(12, 5).lift(SUN).to(14, 6).door('slide-pool').to(22, 5).until(LOOP, { dir: 'r' }),

  // The ship's doctor. Up to tape off the salad bar at 1.
  swabb: from(64, 6, CREW).until(at(11), { dir: 'l' })
    .door('crew-sick').door('engine-crew').to(12, 5).lift(P).to(14, 3.2).door('theater-buffet').to(18, 4.2).to(30, 5)
    .until(at(13.6), { dir: 'r', back: true }).say(at(13.6), at(14), 'Salad bar closed!', { dir: 'r', back: true })
    .door('theater-buffet').to(12, 5).lift(CREW).door('engine-crew').door('crew-sick').to(64, 6)
    .until(at(16.5), { dir: 'l' }).say(at(16.5), at(17), "It's fine. It's fine.", { dir: 'l' }).until(LOOP, { dir: 'l' }),

  // On holiday. Interviewing the wrong things all day.
  pidge: from(26.5, 9.5, P).say(0, 8, 'You. Swan. Talk.', { dir: 'l' }).until(at(8), { dir: 'l' })
    .to(25.8, 10.9).to(19, 11.3).door('theater-buffet-2').to(10, 7).say(at(9), at(9.6), 'Nothing up his sleeve? Search the hat.', { dir: 'l', back: true })
    .to(12, 5).lift(SUN).to(14, 7).door('slide-pool').to(26.2, 9.7).until(at(12), { dir: 'r' }).until(at(12.3), { pose: 'lie' }).say(at(12.3), at(12.8), 'For the investigation.', { pose: 'lie' }).to(27, 11.8).to(44, 11.8).door('pool-bridge').to(62, 7).say(at(14.1), at(14.7), 'Captain. Why are you green?', { dir: 'r' })
    .door('pool-bridge').to(44, 11.8).to(22, 11.8).to(18, 8).door('slide-pool').to(12, 5).lift(P).to(14, 12).door('theater-buffet-2').to(19, 11.3).to(25.8, 10.9).to(26.5, 9.5)
    .until(at(17.4), { dir: 'l' }).say(at(17.4), at(18), 'I feel fine. Is it hot in here?', { dir: 'l' }).until(LOOP, { dir: 'l' }),
  // (The iguana isn't on the clock: it's wherever the chase has got to, and
  // each area draws its own sighting; kit.js's sighting().)
};

// In the lift shaft between decks, nobody's drawn (they're behind its doors).
const decks = Object.values(DECK);
const inLift = (p) => Math.abs(p.x - LIFT.x) < 0.3 && Math.abs(p.y - LIFT.y) < 0.3 && decks.every((z) => Math.abs(p.z - z) > 0.05);

// Every walk that doesn't fit is reported at once, so they can all be fixed together.
const problems = [];
export const walkers = Object.entries(DAYS).map(([id, b]) => {
  const c = CAST[id];
  let atT;
  try {
    atT = schedule(b.steps, { loop: LOOP, speed: WALK, name: c.name });
  } catch (e) {
    problems.push(e.message);
    return null;
  }
  return {
    id,
    name: c.name,
    color: c.color,
    loop: LOOP,
    at: atT,
    draw(ctx, t, p) {
      if (inLift(atT(t))) return;
      drawCast(ctx, id, p, t);
      if (!readable()) return;
      const top = p.z + headroom(id, p);
      // Lying down, the body runs off to the side of the feet: over its middle.
      const mid = p.pose === 'sleep' || p.pose === 'lie' ? 0.4 * (p.dir === 'l' ? -1 : 1) : 0;
      const x = p.x - mid, y = p.y + mid;
      if (p.say) speech(ctx, x, y, top + 0.1, p.say, { size: 0.5 });
      else tag(ctx, x, y, top, c.name, { size: 0.34 });
    },
  };
}).filter(Boolean);
if (problems.length) throw new Error('The day does not fit:\n' + problems.join('\n'));
