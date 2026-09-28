// A day on the Block: the whole block runs dawn to dawn in LOOP seconds (six
// minutes), and everyone on it walks the streets on that one clock (like the
// Manor's evening, src/maps/manor/evening.js). The engine draws each person
// in whichever area they're standing in.
//
// The hours, in seconds into the loop (an hour is 15 seconds):
//     0  5am, dawn. The bakery's rush. The Courier starts at the front corner.
//    52  8:30am. Inspector Pidge arrives, one place behind the goose as usual;
//        at 1pm he arrests a pigeon.
//   105  noon. The pool's hour. The laundromat regulars carry out the sheet.
//   140  the band carries its amps to the stage; the sound check starts, and
//        so does the librarian, coming out to shush it
//   165  4pm. The baker carries the cake down Main Street.
//   180  the snowman judge is wheeled out to score the party
//   210  7pm, sunset: the Block Party, everyone at the stage
//   255  10pm, night. The windows light up. Gary looks up and misses it.
//   345  4am, and round again
//
// npm run qa checks every walk: along the streets, in and out through doors,
// never through walls.
import { C, Q, folk, person, speech, box, alpha, mix } from '../../engine/art.js';
import { schedule } from '../../engine/actors.js';
import { tag } from '../greybox.js';
import { LOOP, DOOR, LANES, MID, route } from './plan.js';
import { PAPER } from './style.js';

// ---------- The clock ----------
export const HOUR = LOOP / 24; // seconds in an hour: 15
const DAWN = 5; // the loop starts at 5am
export const hour = (t) => (DAWN + ((((t % LOOP) + LOOP) % LOOP) / HOUR)) % 24;
// The loop time at a given hour (the first one after dawn).
export const at = (h) => ((((h - DAWN) % 24) + 24) % 24) * HOUR;

// How dark it is outside: 0 by day, 1 at night.
export function nightK(t) {
  const h = hour(t);
  if (h >= 22 || h < 4) return 1;
  if (h >= 19.5) return (h - 19.5) / 2.5;
  if (h < 5.5) return 1 - (h - 4) / 1.5;
  return 0;
}

// The paper, blended between the hours in the style sheet.
export function paperAt(t) {
  const h = hour(t);
  for (let i = 1; i < PAPER.length; i++) {
    const [h0, c0] = PAPER[i - 1], [h1, c1] = PAPER[i];
    if (h <= h1) return mix(c0, c1, (h - h0) / (h1 - h0));
  }
  return PAPER[0][1];
}

// The plate: the paper, and whether the page's loose text is printed in the
// light ink (after dark).
export const plate = {
  at: (t) => ({ paper: paperAt(t), kind: nightK(t) > 0.5 ? 'night' : '' }),
};

// Night on an area: the area darkens, its lights come on. Rooms glow warm
// from inside (their windows); streets get their lamp posts (the areas draw
// those). Added to every room by map.js.
export function nightfall(R, o = {}) {
  R.dark((t) => nightK(t) * (o.dark ?? 0.6), { color: C.night });
  if (o.glow !== false) {
    R.light({ at: [R.W * 0.45, R.D * 0.45, 3], r: 7, color: C.butter, k: (t) => nightK(t) * 0.8 });
  }
}

// ---------- Walking ----------
const WALK = 1.3, HURRY = 2.6, RUN = 3;

// A walk builder: start somewhere, then walk the lanes, in and out of doors.
function from(x, y) {
  const steps = [[x, y]];
  let pos = [x, y];
  const b = {
    steps,
    to(nx, ny) {
      steps.push([nx, ny]);
      pos = [nx, ny];
      return b;
    },
    // Along the lanes to a point on one.
    go(p) {
      for (const q of route(pos, p)) b.to(...q);
      return b;
    },
    // To a door from the street, and in.
    enter(id) { return b.go(DOOR[id].out).to(...DOOR[id].in); },
    // Out through the door, onto the street.
    leave(id) { return b.to(...DOOR[id].in).to(...DOOR[id].out); },
    // To a door, and wait there: knock, knock.
    knock(id, wait, extra = {}) {
      b.go(DOOR[id].out);
      steps.push({ wait, ...extra });
      return b;
    },
    // At home, in a room: out of sight just inside the door until t.
    home(t) { return b.until(t, { hide: true }); },
    until(t, extra = {}) {
      steps.push({ until: t, ...extra });
      return b;
    },
    wait(s, extra = {}) {
      steps.push({ wait: s, ...extra });
      return b;
    },
    speed(v) {
      steps.push({ speed: v });
      return b;
    },
    get at() { return pos; },
  };
  return b;
}

// Round the stage: spots at the party, on the lanes that pass it.
const S0 = LANES[1], S1 = LANES[2]; // 37.6 and 43.4, either side of the stage
const PARTY = [
  [S0, 34], [S1, 34], [S0, 47], [S1, 47], [34, S0], [34, S1], [47, S0], [47, S1],
  [S0, 31], [S1, 31], [31, S0], [31, S1], [S0, 50], [50, S1],
];

// Everyone, by id: their look, name and day. (Greybox: plain folk with name
// tags; the area art dresses them.)
const PEOPLE = {};
const add = (id, name, seed, walk, o = {}) => { PEOPLE[id] = { name, look: folk(seed), walk, ...o }; };

// The Courier: brown uniform, the parcel for "G. Goose, The Block", every door
// on the block, all day, and no door number. He gets there for the party.
{
  const round = ['trains', 'ballpit', 'icerink', 'arcade', 'pool', 'library', 'laundromat', 'band',
    'aquarium', 'bakery', 'disco', 'launchpad', 'observatory', 'greenhouse', 'noodles', 'umbrellas'];
  const w = from(LANES[4], LANES[4]).until(3, { dir: 'l', say: 'G. Goose?' }).speed(HURRY);
  round.forEach((id, i) => w.knock(id, 2.5, { pose: 'carry', say: i === 12 ? 'Is this even a door?' : i % 3 ? null : 'Parcel!' }));
  w.speed(WALK).go([S0, 50]).until(at(20), { pose: 'carry', dir: 'r' }).until(at(22), { pose: 'carry', dir: 'r', say: 'Anyone called Goose?' })
    .go([LANES[4], 50]).go([LANES[4], LANES[4]]).until(LOOP - 1, { dir: 'l' });
  add('courier', 'The Courier', 5, w, { look: { ...folk(5), top: C.brown, bottom: C.brown, hat: 'cap' }, hold: 'parcel' });
}

// The baker: flat out from 5am, and at 4pm the wedding cake goes to the stage.
add('baker', 'The baker', 21, from(...DOOR.bakery.in).home(at(16))
  .leave('bakery').speed(WALK * 0.8).go([S0, 47]).until(at(22), { pose: 'carry', dir: 'r' })
  .speed(WALK).enter('bakery').home(LOOP), { hold: 'cake' });

// The laundromat's regulars, Dot and Mo, carry out the giant sheet: the banner.
add('dot', 'Dot', 33, from(...DOOR.laundromat.in).home(at(12)).leave('laundromat').go([S1, 50])
  .until(at(22.5), { pose: 'cheer' }).enter('laundromat').home(LOOP));
add('mo', 'Mo', 41, from(...DOOR.laundromat.in).home(at(12.1)).leave('laundromat').go([50, S0])
  .until(at(22.5), { pose: 'cheer' }).enter('laundromat').home(LOOP));

// The band (the Honks) and their amps: the sound check from 3pm, the party at 7.
add('drums', 'The drummer', 7, from(...DOOR.band.in).home(at(14.2)).leave('band').go([S1, 34])
  .until(at(19), { pose: 'drum' }).until(at(22), { pose: 'drum', say: 'One, two, HONK' }).enter('band').home(LOOP), { hold: 'amp' });
add('bass', 'The bassist', 13, from(...DOOR.band.in).home(at(14.3)).leave('band').go([S0, 34])
  .until(at(22), { pose: 'dance' }).enter('band').home(LOOP), { hold: 'amp' });

// The librarian comes out to shush the sound check. Three times.
{
  const w = from(...DOOR.library.in).home(at(15));
  for (const h of [15, 16.5, 18]) {
    w.home(at(h)).leave('library').go([S1, 31]).wait(5, { pose: 'point', say: 'Shh!' }).enter('library');
  }
  add('librarian', 'The librarian', 25, w.home(LOOP));
}

// The snowman judge, wheeled out on a trolley from the ice rink to score the
// party, and back before it melts.
add('snowman', 'The snowman judge', 0, from(...DOOR.icerink.in).home(at(17)).speed(0.7).leave('icerink').go([53, S0])
  .until(at(22.5), { dir: 'l' }).speed(1).enter('icerink').home(LOOP), { draw: snowman });

// Inspector Pidge, straight from the Manor, one place behind the goose. He
// arrests a pigeon.
add('pidge', 'Inspector Pidge', 19, from(LANES[4], 30).until(at(8.5)).go([S0, 30]).wait(4, { say: 'A goose, you say?' })
  .go([S0, 20]).until(at(13), { pose: 'point', say: 'You. Pigeon. Nicked.' }).go([S0, 50]).until(at(22), { dir: 'r' })
  .go([LANES[4], 50]).go([LANES[4], 30]).until(LOOP - 1), { look: { ...folk(19), top: C.grey, hat: 'none' } });

// The octopus, escaped from the aquarium again, heads up the alley for the
// noodle bar. The keeper carries it back. It tries again.
const OCT = [LANES[0], 53]; // the alley along the noodle bar's front
{
  const o = from(...DOOR.aquarium.in), k = from(...DOOR.aquarium.in);
  for (const [h0, h1] of [[6, 8], [13, 15], [20, 22]]) {
    o.home(at(h0)).speed(1.1).leave('aquarium').go(OCT).until(at(h1)).speed(WALK).enter('aquarium');
    k.home(at(h1) - 18).speed(RUN * 0.8).leave('aquarium').go(OCT).until(at(h1), { say: 'Not again.' }).speed(WALK).enter('aquarium');
  }
  add('octopus', 'The octopus', 0, o.home(LOOP), { draw: octopus });
  add('keeper', 'The keeper', 29, k.home(LOOP));
}

// Gary the astronomer: out in the street at night, looking up, missing every
// shooting star.
add('gary', 'Gary', 9, from(...DOOR.observatory.in).home(at(22.5)).to(...DOOR.observatory.out).go([LANES[0], 30])
  .until(at(2), { pose: 'point', say: 'Missed it.' }).go(DOOR.observatory.out).to(...DOOR.observatory.in).home(LOOP));

// The Courier's van, and the bin lorry: trying to get down Main Street all
// morning, and the stage in the way.
add('lorry', 'The bin lorry', 0, from(MID, 1).until(at(6)).speed(2.2).to(MID, 29).wait(4, { say: 'HONK' }).speed(1)
  .to(MID, 5).speed(2.2).to(MID, 29).wait(4, { say: 'HOOONK' }).speed(1).to(MID, 1).until(LOOP - 1), { draw: lorry });

// The crowd: out of their doors at sunset, dancing round the stage, home by 10.
['pool', 'arcade', 'disco', 'greenhouse', 'noodles', 'ballpit', 'umbrellas', 'trains'].forEach((id, i) => {
  add('crowd-' + id, null, 50 + i * 7, from(...DOOR[id].in).home(at(17.4 + (i % 4) * 0.2)).leave(id).go(PARTY[6 + i] || PARTY[i])
    .until(at(21.8 + (i % 3) * 0.2), { pose: i % 2 ? 'dance' : 'cheer' }).enter(id).home(LOOP));
});

// ---------- Drawing them ----------
// Names and speech only show once you're close enough to read them.
const readable = () => Q.detail && Q.pxPerUnit >= 12;

function held(ctx, what, p) {
  const [X, Y] = [p.x - p.y, (p.x + p.y) / 2 - (p.z + 1.3) * 1.12];
  const f = p.dir === 'l' ? -1 : 1;
  const w = what === 'cake' ? 0.9 : 0.7;
  ctx.fillStyle = what === 'cake' ? C.white : what === 'amp' ? C.ink : C.woodLight;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.04;
  ctx.beginPath();
  ctx.rect(X + f * 0.35 - w / 2, Y - (what === 'cake' ? 0.9 : 0.5), w, what === 'cake' ? 0.9 : 0.5);
  ctx.fill();
  ctx.stroke();
}

function snowman(ctx, t, p) {
  box(ctx, p.x - 0.7, p.y - 0.5, 0, 1.4, 1, 0.4, C.grey, { flat: true });
  for (const [z, r] of [[0.9, 0.55], [1.7, 0.42], [2.3, 0.3]]) {
    const X = p.x - p.y, Y = (p.x + p.y) / 2 - z * 1.12;
    ctx.beginPath();
    ctx.arc(X, Y, r, 0, Math.PI * 2);
    ctx.fillStyle = C.white;
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.05;
    ctx.stroke();
  }
}

function octopus(ctx, t, p) {
  const X = p.x - p.y, Y = (p.x + p.y) / 2 - 0.5 * 1.12;
  for (let i = 0; i < 6; i++) {
    const a = (i / 5 - 0.5) * 2.2;
    ctx.beginPath();
    ctx.moveTo(X, Y);
    ctx.quadraticCurveTo(X + Math.sin(a) * 0.5, Y + 0.3, X + Math.sin(a + Math.sin(t * 5 + i) * 0.3) * 0.8, Y + 0.45);
    ctx.strokeStyle = C.pink;
    ctx.lineWidth = 0.14;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(X, Y - 0.2, 0.42, 0.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = C.pink;
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.04;
  ctx.stroke();
}

function lorry(ctx, t, p) {
  box(ctx, p.x - 1.2, p.y - 2.2, 0, 2.4, 4.4, 2.6, C.teal, { flat: true });
  box(ctx, p.x - 1.2, p.y + 1.2, 0, 2.4, 1.4, 1.9, C.white, { flat: true });
}

const problems = [];
export const walkers = Object.entries(PEOPLE).map(([id, c], i) => {
  let where;
  try {
    where = schedule(c.walk.steps, { loop: LOOP, speed: WALK, name: c.name || id });
  } catch (e) {
    problems.push(e.message);
    return null;
  }
  const look = c.look;
  return {
    id,
    name: c.name || 'Someone at the party',
    color: [C.coral, C.teal, C.purple, C.mustard, C.navy][i % 5],
    loop: LOOP,
    at: where,
    // A walker's big things (the lorry) sort by their back end.
    bias: c.draw === lorry ? 2 : 0,
    draw(ctx, t, p) {
      if (p.hide) return;
      if (c.draw) c.draw(ctx, t, p);
      else {
        const pose = c.hold && p.pose !== 'drum' && p.pose !== 'cheer' && p.pose !== 'dance' ? 'carry' : p.pose;
        person(ctx, p.x, p.y, p.z, { ...look, pose, dir: p.dir, back: p.back }, t);
        if (c.hold && pose === 'carry' && (c.hold !== 'amp' || p.moving)) held(ctx, c.hold, p);
      }
      if (!readable()) return;
      const top = p.z + (c.draw === lorry ? 3.4 : 2.9);
      if (p.say) speech(ctx, p.x, p.y, top + 0.1, p.say, { size: 0.5 });
      else if (c.name) tag(ctx, p.x, p.y, top, c.name, { size: 0.34, fill: alpha(C.white, 0.9) });
    },
  };
}).filter(Boolean);
if (problems.length) throw new Error('The day does not fit:\n' + problems.join('\n'));

