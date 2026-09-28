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
import { C, Q, SKIN, folk, person, speech, label, note, paint, box, alpha, mix, shade, tint } from '../../engine/art.js';
import { ZK } from '../../engine/iso.js';
import { schedule } from '../../engine/actors.js';
import { tag } from '../greybox.js';
import { LOOP, DOOR, LANES, MID, STAGE, STAGE_Z, route } from './plan.js';
import { hour, at, nightK } from './clock.js';
import { finale } from './finale.js';
import { PAPER } from './style.js';

// ---------- The clock ----------
// (clock.js: the hour, each room's hours.)
export { HOUR, hour, at, nightK } from './clock.js';

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

// Night on a room: the streets and the sky take the dark, the rooms stay lit
// (block.md, decision 14). A room only dims a touch after dark, and its lamps
// glow warm, so every find reads at any hour. Added to every room by map.js.
export function nightfall(R) {
  R.dark((t) => nightK(t) * 0.1, { color: C.night });
  R.light({ at: [R.W * 0.45, R.D * 0.45, 3], r: 7, color: C.butter, k: (t) => nightK(t) * 0.35 });
}

// ---------- Walking ----------
const WALK = 1.3, HURRY = 2.6, RUN = 3;

// A walk builder: start somewhere, then walk the lanes, in and out of doors.
function from(x, y) {
  const steps = [[x, y]];
  let pos = [x, y];
  const b = {
    steps,
    to(nx, ny, nz = 0) {
      steps.push([nx, ny, nz]);
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
const S0 = LANES[1], S1 = LANES[2]; // 36.9 and 44.1, either side of the stage
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
  add('courier', 'The Courier', 5, w, { look: { ...folk(5), top: C.brown, bottom: C.brown, dress: false, hat: 'none' }, hold: 'parcel' });
}

// The baker: flat out from 5am, and at 4pm the wedding cake goes to the stage.
add('baker', 'The baker', 21, from(...DOOR.bakery.in).home(at(16))
  .leave('bakery').speed(WALK * 0.8).go([S0, 47]).until(at(22), { pose: 'carry', dir: 'r' })
  .speed(WALK).enter('bakery').home(LOOP), { look: { ...folk(21), top: C.white, bottom: C.grey, dress: false, style: 'short' }, hold: 'cake' });

// The laundromat's regulars, Dot and Mo, carry out the giant sheet: the banner.
add('dot', 'Dot', 33, from(...DOOR.laundromat.in).home(at(12)).leave('laundromat').go([S1, 50])
  .until(at(22.5), { pose: 'cheer' }).enter('laundromat').home(LOOP), { look: { ...folk(33), top: C.pink, dress: true }, hold: 'sheet' });
add('mo', 'Mo', 41, from(...DOOR.laundromat.in).home(at(12.1)).leave('laundromat').go([50, S0])
  .until(at(22.5), { pose: 'cheer' }).enter('laundromat').home(LOOP), { look: { ...folk(41), top: C.teal, bottom: C.brown, dress: false, style: 'bald' }, hold: 'sheet' });

// The band (the Honks) and their amps: out at 2pm, the sound check on the
// stage from 3, the party at 7. They hop up onto the deck from the lane on its
// right and play in front of the backdrop.
// Up on the deck they sort with its front edge, not their feet (the deck is
// one standing thing, sorted by its middle).
const ON_DECK = 6.5;
const DECK = (u, v) => [STAGE[0] + u, STAGE[1] + v, STAGE_Z]; // a spot on the stage, from its back corner
const upOn = (w, spot) => w.go([S1, STAGE[1] + 1.4]).to(S1 - 0.6, STAGE[1] + 1.4, STAGE_Z).to(...spot);
{
  const d = from(...DOOR.band.in).home(at(14.2)).leave('band');
  upOn(d, DECK(1.6, 1.8)).until(at(19), { pose: 'drum', dir: 'r', ahead: ON_DECK }).until(at(22), { pose: 'drum', dir: 'r', ahead: ON_DECK, say: 'One, two, HONK' })
    .to(S1 - 0.6, STAGE[1] + 1.4, STAGE_Z).to(S1, STAGE[1] + 1.4, 0).enter('band').home(LOOP);
  add('drums', 'The drummer', 7, d, { look: { ...folk(7), top: C.ink, bottom: C.navy, dress: false, style: 'curly' }, hold: 'amp' });
  const b = from(...DOOR.band.in).home(at(14.3)).leave('band');
  upOn(b, DECK(4.4, 1.5)).until(at(22), { pose: 'dance', dir: 'l', ahead: ON_DECK })
    .to(S1 - 0.6, STAGE[1] + 1.4, STAGE_Z).to(S1, STAGE[1] + 1.4, 0).enter('band').home(LOOP);
  add('bass', 'The bassist', 13, b, { look: { ...folk(13), top: C.ink, bottom: C.ink, dress: false, style: 'long', hair: C.purple }, hold: 'amp' });
  const v = from(...DOOR.band.in).home(at(18.2)).leave('band');
  upOn(v, DECK(3.6, 4.2)).until(at(22), { pose: 'cheer', dir: 'r', ahead: ON_DECK })
    .to(S1 - 0.6, STAGE[1] + 1.4, STAGE_Z).to(S1, STAGE[1] + 1.4, 0).enter('band').home(LOOP);
  add('singer', 'The singer', 17, v, { look: { ...folk(17), top: C.ink, bottom: C.coral, dress: false, style: 'long', hair: C.pink } });
}

// The librarian comes out to shush the sound check. Three times.
{
  const w = from(...DOOR.library.in).home(at(15));
  for (const h of [15, 16.5, 18]) {
    w.home(at(h)).leave('library').go([S1, 31]).wait(5, { pose: 'point', say: 'Shh!' }).enter('library');
  }
  add('librarian', 'The librarian', 25, w.home(LOOP), { look: { ...folk(25), top: C.mustard, bottom: C.navy, dress: false, style: 'bun', hair: C.grey } });
}

// The snowman judge, wheeled out on a trolley from the ice rink to score the
// party, and back before it melts.
add('snowman', 'The snowman judge', 0, from(...DOOR.icerink.in).home(at(17)).speed(0.7).leave('icerink').go([53, S0])
  .until(at(22.5), { dir: 'l' }).speed(1).enter('icerink').home(LOOP), { draw: snowman });

// Inspector Pidge, straight from the Manor, one place behind the goose. He
// arrests a pigeon.
add('pidge', 'Inspector Pidge', 19, from(LANES[4], 30).until(at(8.5)).go([S0, 30]).wait(4, { say: 'A goose, you say?' })
  .go([S0, 20]).until(at(13), { pose: 'point', say: 'You. Pigeon. Nicked.' }).go([S0, 50]).until(at(22), { dir: 'r' })
  .go([LANES[4], 50]).go([LANES[4], 30]).until(LOOP - 1), { look: { ...folk(19), top: mix(C.wood, C.greyLight, 0.45), bottom: C.brown, dress: false, style: 'short', hat: 'none' } });

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
  add('keeper', 'The keeper', 29, k.home(LOOP), { look: { ...folk(29), top: C.white, bottom: C.teal, shoes: C.mustard, dress: false, style: 'short' } });
}

// Gary the astronomer: out in the street at night, looking up, missing every
// shooting star.
add('gary', 'Gary', 9, from(...DOOR.observatory.in).home(at(22.5)).to(...DOOR.observatory.out).go([LANES[0], 30])
  .until(at(2), { pose: 'point', say: 'Missed it.' }).go(DOOR.observatory.out).to(...DOOR.observatory.in).home(LOOP),
  { look: { ...folk(9), top: C.green, bottom: C.navy, dress: false, style: 'short' } });

// The Courier's van, and the bin lorry: trying to get down Main Street all
// morning, and the stage in the way.
add('lorry', 'The bin lorry', 0, from(MID, 1).until(at(6)).speed(2.2).to(MID, 29).wait(4, { say: 'HONK' }).speed(1)
  .to(MID, 5).speed(2.2).to(MID, 29).wait(4, { say: 'HOOONK' }).speed(1).to(MID, 1).until(LOOP - 1), { draw: lorry });

// The crowd: out of their doors at sunset, dancing round the stage, home by 10.
['pool', 'arcade', 'disco', 'greenhouse', 'noodles', 'ballpit', 'umbrellas', 'trains'].forEach((id, i) => {
  add('crowd-' + id, null, 50 + i * 7, from(...DOOR[id].in).home(at(17.4 + (i % 4) * 0.2)).leave(id).go(PARTY[6 + i] || PARTY[i])
    .until(at(21.8 + (i % 3) * 0.2), { pose: i % 2 ? 'dance' : 'cheer' }).enter(id).home(LOOP),
  // Party hats, mostly; the ball pit's is a kid
  { look: { ...folk(50 + i * 7), hat: ['party', 'beanie', 'party', 'sun', 'party', 'party', 'none', 'party'][i], scale: i === 5 ? 0.72 : 1 } });
});

// ---------- Drawing them ----------
// Names and speech only show once you're close enough to read them.
const readable = () => Q.detail && Q.pxPerUnit >= 12;
const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// Everyone is drawn every frame, so each costume is a few flat shapes, with
// the small stuff only when Q.detail. Costumes draw in a person's own units
// (person() in art.js): facing right, feet at 0, shoulders at SH, the head's
// center at HY. hand(a) is where an arm swung to angle a ends (0 hangs down,
// PI points up); far is the arm behind the body.
const SH = -1.53, HY = -1.95;
const hand = (a, far) => [(far ? -0.22 : 0.22) + Math.sin(a) * 0.72, SH + Math.cos(a) * 0.72];
const sway = (look, t) => Math.sin((look.phase || 0) + t * 7); // the engine's walk cycle

// Fill and outline the current path.
function ink(ctx, fill, lw = 0.04) {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (Q.lines) {
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}
// A stroke with an ink edge, like the engine's limbs.
function limb(ctx, pts, color, w) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (Q.lines) {
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = w + 0.09;
    ctx.stroke();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
}
// Small upright text in local units, never mirrored (f: which way the person faces).
function print(ctx, text, x, y, size, color = C.ink, f = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(f / 40, 1 / 40);
  ctx.font = `${size * 40}px "Bagel Fat One", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
// A little goose, s units tall-ish, standing at (x, y): the cake topper and
// the Honks' logo.
function wee(ctx, x, y, s, t = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.ellipse(-0.05, -0.2, 0.3, 0.18, 0, 0, TAU);
  ink(ctx, C.white, 0.06);
  limb(ctx, [[0.14, -0.28], [0.2, -0.62]], C.white, 0.12);
  ctx.beginPath();
  ctx.arc(0.22, -0.66, 0.1, 0, TAU);
  ink(ctx, C.white, 0.06);
  ctx.beginPath();
  ctx.moveTo(0.3, -0.7);
  ctx.lineTo(0.46, -0.64);
  ctx.lineTo(0.3, -0.6);
  ctx.fillStyle = C.coral;
  ctx.fill();
  ctx.restore();
}

// ---------- Things people carry (drawn from the hands' height, in front) ----------
// The origin is the engine's hold point; carrying hands sit at about (0.55, 0).
function parcel(ctx, f) {
  ctx.beginPath();
  ctx.moveTo(0.02, -0.44); ctx.lineTo(0.16, -0.56); ctx.lineTo(0.9, -0.56); ctx.lineTo(0.76, -0.44);
  ctx.closePath();
  ink(ctx, tint(C.woodLight, 0.25));
  ctx.beginPath();
  ctx.moveTo(0.76, -0.44); ctx.lineTo(0.9, -0.56); ctx.lineTo(0.9, -0.02); ctx.lineTo(0.76, 0.1);
  ctx.closePath();
  ink(ctx, shade(C.woodLight, 0.2));
  ctx.beginPath();
  ctx.rect(0.02, -0.44, 0.74, 0.54);
  ink(ctx, C.woodLight);
  if (!Q.detail) return;
  // String, and the label: "G. Goose, The Block" (no number)
  ctx.beginPath();
  ctx.moveTo(0.62, -0.44); ctx.lineTo(0.62, 0.1);
  ctx.moveTo(0.02, -0.02); ctx.lineTo(0.76, -0.02);
  ctx.strokeStyle = C.coral;
  ctx.lineWidth = 0.05;
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(0.06, -0.38, 0.52, 0.3);
  ink(ctx, C.white, 0.03);
  if (Q.pxPerUnit >= 30) {
    print(ctx, 'G. GOOSE', 0.32, -0.29, 0.09, C.ink, f);
    print(ctx, 'THE BLOCK', 0.32, -0.16, 0.08, C.ink, f);
  } else {
    ctx.beginPath();
    ctx.moveTo(0.12, -0.29); ctx.lineTo(0.5, -0.29);
    ctx.moveTo(0.12, -0.17); ctx.lineTo(0.42, -0.17);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.035;
    ctx.stroke();
  }
}

// The wedding cake: three tiers and a goose on top.
function cake(ctx, t) {
  ctx.beginPath();
  ctx.ellipse(0.45, 0.06, 0.52, 0.1, 0, 0, TAU);
  ink(ctx, C.greyLight);
  let y = 0.05;
  [[0.84, 0.28], [0.62, 0.25], [0.42, 0.22]].forEach(([w, h], i) => {
    ctx.beginPath();
    ctx.rect(0.45 - w / 2, y - h, w, h);
    ink(ctx, C.white);
    // Pink icing along each tier's top, dripping
    ctx.beginPath();
    ctx.moveTo(0.45 - w / 2, y - h + 0.02);
    for (let k = 0; k <= 4; k++) {
      const x = 0.45 - w / 2 + (w * k) / 4;
      ctx.quadraticCurveTo(x - w / 8, y - h + 0.12, x, y - h + 0.03);
    }
    ctx.strokeStyle = C.pink;
    ctx.lineWidth = 0.06;
    ctx.stroke();
    if (Q.detail && i === 0) {
      for (const x of [0.18, 0.45, 0.72]) {
        ctx.beginPath();
        ctx.arc(x, y - 0.12, 0.035, 0, TAU);
        ctx.fillStyle = C.coral;
        ctx.fill();
      }
    }
    y -= h;
  });
  wee(ctx, 0.43, y, 0.5, t);
}

// An amp: a black box with a grille, for the Honks.
function amp(ctx) {
  ctx.beginPath();
  ctx.moveTo(0, -0.5); ctx.lineTo(0.12, -0.6); ctx.lineTo(0.9, -0.6); ctx.lineTo(0.78, -0.5);
  ctx.closePath();
  ink(ctx, C.navy);
  ctx.beginPath();
  ctx.moveTo(0.78, -0.5); ctx.lineTo(0.9, -0.6); ctx.lineTo(0.9, 0); ctx.lineTo(0.78, 0.1);
  ctx.closePath();
  ink(ctx, C.black);
  ctx.beginPath();
  ctx.rect(0, -0.5, 0.78, 0.6);
  ink(ctx, C.ink);
  ctx.beginPath();
  ctx.rect(0.07, -0.3, 0.64, 0.33);
  ctx.fillStyle = C.navy;
  ctx.fill();
  if (!Q.detail) return;
  ctx.fillStyle = C.ink;
  for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) {
    ctx.beginPath();
    ctx.arc(0.14 + i * 0.125, -0.23 + j * 0.1, 0.03, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = C.mustard;
  ctx.fillRect(0.07, -0.44, 0.3, 0.06);
  ctx.fillStyle = C.white;
  for (const x of [0.48, 0.58, 0.68]) {
    ctx.beginPath();
    ctx.arc(x, -0.41, 0.03, 0, TAU);
    ctx.fill();
  }
}

// The laundromat's giant sheet, folded up, one corner escaping.
function sheet(ctx, t) {
  const w = Math.sin(t * 6) * 0.08;
  ctx.beginPath();
  ctx.moveTo(0.8, 0.12);
  ctx.quadraticCurveTo(1.2, 0.3, 1.12 + w, 0.7);
  ctx.lineTo(0.6, 0.16);
  ctx.closePath();
  ink(ctx, C.white);
  ctx.beginPath();
  ctx.roundRect(-0.45, -0.8, 1.55, 1.0, 0.22);
  ink(ctx, C.white);
  ctx.fillStyle = C.sky;
  ctx.fillRect(-0.4, -0.56, 1.45, 0.11);
  ctx.fillRect(-0.4, -0.08, 1.45, 0.11);
  if (!Q.detail) return;
  ctx.beginPath();
  ctx.moveTo(-0.33, -0.26); ctx.quadraticCurveTo(0.3, -0.2, 0.98, -0.26);
  ctx.moveTo(-0.3, 0.1); ctx.quadraticCurveTo(0.3, 0.16, 0.95, 0.1);
  ctx.strokeStyle = C.greyLight;
  ctx.lineWidth = 0.04;
  ctx.stroke();
  // Somebody has already been at it with paint
  ctx.beginPath();
  ctx.arc(0.1, -0.16, 0.06, 0, TAU);
  ctx.arc(0.3, -0.13, 0.04, 0, TAU);
  ctx.fillStyle = C.coral;
  ctx.fill();
}

// The bass, slung low, the neck up in front.
function bass(ctx) {
  limb(ctx, [[0.1, 0.24], [0.44, -0.64]], C.woodLight, 0.08);
  ctx.beginPath();
  ctx.rect(0.38, -0.8, 0.12, 0.2);
  ink(ctx, C.ink, 0.03);
  ctx.beginPath();
  ctx.ellipse(0.02, 0.36, 0.3, 0.2, -0.5, 0, TAU);
  ink(ctx, C.coral);
  if (!Q.detail) return;
  ctx.beginPath();
  ctx.ellipse(0.06, 0.32, 0.12, 0.07, -0.5, 0, TAU);
  ctx.fillStyle = C.white;
  ctx.fill();
  ctx.fillStyle = C.ink;
  ctx.fillRect(-0.12, 0.42, 0.16, 0.05);
}

// The octopus, as carried by the keeper: arms full of wriggling.
function armful(ctx, t) {
  for (let i = 0; i < 6; i++) {
    const a = (i / 5 - 0.5) * 2.4;
    const k = Math.sin(t * 7 + i * 1.7) * 0.25;
    limb(ctx, [[0.4 + Math.sin(a) * 0.15, -0.15], [0.4 + Math.sin(a + k) * 0.55, 0.25 + Math.cos(a) * 0.25], [0.4 + Math.sin(a + k * 2) * 0.75, 0.5]], C.pink, 0.09);
  }
  ctx.beginPath();
  ctx.ellipse(0.42, -0.42, 0.32, 0.38, 0.3, 0, TAU);
  ink(ctx, C.pink);
  if (!Q.detail) return;
  for (const x of [0.36, 0.56]) {
    ctx.beginPath();
    ctx.arc(x, -0.3, 0.08, 0, TAU);
    ink(ctx, C.white, 0.03);
    ctx.beginPath();
    ctx.arc(x - 0.03, -0.32, 0.035, 0, TAU);
    ctx.fillStyle = C.ink;
    ctx.fill();
  }
}

// The keeper's net, for running after octopuses.
function net(ctx) {
  limb(ctx, [[0.3, 0.3], [0.62, -1.2]], C.woodLight, 0.06);
  ctx.beginPath();
  ctx.ellipse(0.7, -1.42, 0.24, 0.17, 0.3, 0, TAU);
  ctx.fillStyle = alpha(C.white, 0.5);
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.05;
  ctx.stroke();
}

// A pigeon, in custody. peck: on the ground, pecking.
function pigeon(ctx, x, y, t, peck) {
  const bob = peck ? Math.max(0, Math.sin(t * 5)) * 0.1 : Math.sin(t * 4) * 0.02;
  ctx.beginPath();
  ctx.ellipse(x, y, 0.22, 0.13, peck ? 0.15 : -0.1, 0, TAU);
  ink(ctx, C.grey, 0.035);
  ctx.beginPath();
  ctx.arc(x + 0.2, y - 0.14 + bob, 0.09, 0, TAU);
  ink(ctx, mix(C.grey, C.purple, 0.35), 0.035);
  ctx.beginPath();
  ctx.moveTo(x + 0.28, y - 0.15 + bob); ctx.lineTo(x + 0.36, y - 0.12 + bob); ctx.lineTo(x + 0.28, y - 0.1 + bob);
  ctx.fillStyle = C.mustard;
  ctx.fill();
  if (!Q.detail) return;
  ctx.beginPath();
  ctx.arc(x + 0.22, y - 0.16 + bob, 0.025, 0, TAU);
  ctx.fillStyle = C.coral;
  ctx.fill();
  ctx.fillStyle = C.teal;
  ctx.fillRect(x + 0.1, y - 0.08, 0.08, 0.05);
}

// ---------- Costumes ----------
// Each returns the extras for person(): arms, wear (over the torso), hold
// (in front of the body), face (over the head); dx/dy nudge where they're
// drawn; after(ctx, t, p) draws in the area's units, over them.
const CAP = shade(C.brown, 0.25);
const TEE = C.ink; // the Honks' band tees
const COAT = mix(C.wood, C.greyLight, 0.45); // Pidge's trench coat
const ORANGE = mix(C.coral, C.mustard, 0.45); // the lorry's light, the carrot

const teeLogo = (ctx, b) => {
  if (Q.detail && !b.back) wee(ctx, -0.02, b.shoulderY + 0.52, 0.42);
};
const shades = (ctx, hy, back) => {
  if (back) return;
  ctx.fillStyle = C.black;
  ctx.fillRect(0.04, hy - 0.04, 0.26, 0.1);
};

const KIT = {
  // Brown uniform, cap and satchel, the parcel held out in both hands. He
  // gets more flustered as the day goes: sweat after noon, cap askew by evening.
  courier(t, p) {
    const h = hour(t);
    const evening = h >= 17 || h < 5;
    const tilt = evening ? 0.4 : h >= 14 ? ((h - 14) / 3) * 0.4 : 0;
    const f = p.dir === 'l' ? -1 : 1;
    // At a door: knock, knock (the parcel in the other hand)
    const rap = !p.moving && p.pose === 'carry' && h < 18.4 && t % 2.5 < 1.5;
    return {
      arms: rap ? [2 + Math.sin(t * 18) * 0.3, 1.25] : [1.25, 1.12],
      wear(ctx, b) {
        ctx.beginPath();
        ctx.roundRect(-0.48, b.hipY - 0.26, 0.36, 0.34, 0.06);
        ink(ctx, shade(C.brown, 0.4));
        if (!Q.detail) return;
        ctx.beginPath();
        ctx.moveTo(0.2, b.shoulderY - 0.04);
        ctx.lineTo(-0.26, b.hipY - 0.2);
        ctx.strokeStyle = shade(C.brown, 0.55);
        ctx.lineWidth = 0.08;
        ctx.stroke();
        ctx.fillStyle = C.mustard;
        ctx.fillRect(-0.48, b.hipY - 0.2, 0.36, 0.06);
      },
      hold: (ctx) => parcel(ctx, f),
      face(ctx, hy, back) {
        ctx.save();
        ctx.translate(0.02, hy);
        ctx.rotate(-tilt);
        ctx.beginPath();
        ctx.arc(0, -0.08, 0.33, Math.PI, 0);
        ctx.closePath();
        ink(ctx, CAP, 0.05);
        if (!back) {
          ctx.beginPath();
          ctx.rect(0.08, -0.13, 0.42, 0.08);
          ink(ctx, shade(CAP, 0.3), 0.04);
        }
        ctx.fillStyle = C.mustard;
        ctx.fillRect(-0.06, -0.3, 0.12, 0.09);
        ctx.restore();
        // Sweat, after noon: two drops by the evening
        if (!Q.detail || !(h >= 12 || h < 5)) return;
        for (let i = 0; i < (h >= 16 || h < 5 ? 2 : 1); i++) {
          const k = (t * 0.9 + i * 0.5) % 1;
          const x = -0.32 - i * 0.12 + k * 0.05, y = hy - 0.1 + k * 0.5;
          ctx.beginPath();
          ctx.moveTo(x, y - 0.12);
          ctx.quadraticCurveTo(x + 0.08, y, x, y + 0.03);
          ctx.quadraticCurveTo(x - 0.08, y, x, y - 0.12);
          ctx.fillStyle = alpha(C.sky, 1 - k * 0.7);
          ctx.fill();
        }
      },
    };
  },

  // Whites, apron and a tall hat, and the wedding cake.
  baker(t) {
    return {
      arms: [1.2, 1.08],
      wear(ctx, b) {
        ctx.beginPath();
        ctx.moveTo(-0.2, b.shoulderY + 0.2);
        ctx.lineTo(0.24, b.shoulderY + 0.2);
        ctx.lineTo(0.3, b.hipY + 0.4);
        ctx.lineTo(-0.26, b.hipY + 0.4);
        ctx.closePath();
        ink(ctx, C.white, 0.035);
        ctx.beginPath();
        ctx.moveTo(-0.12, b.top); ctx.lineTo(0.16, b.top); ctx.lineTo(0.02, b.top + 0.2);
        ctx.closePath();
        ink(ctx, C.coral, 0.03);
      },
      hold: (ctx) => cake(ctx, t),
      face(ctx, hy, back) {
        ctx.beginPath();
        ctx.rect(-0.24, hy - 0.72, 0.52, 0.5);
        ink(ctx, C.white, 0.05);
        ctx.beginPath();
        ctx.arc(-0.12, hy - 0.78, 0.2, 0, TAU);
        ctx.arc(0.16, hy - 0.8, 0.2, 0, TAU);
        ctx.arc(0.02, hy - 0.9, 0.2, 0, TAU);
        ink(ctx, C.white, 0.05);
        ctx.beginPath();
        ctx.rect(-0.26, hy - 0.3, 0.56, 0.12);
        ink(ctx, C.white, 0.05);
        if (!back && Q.detail) {
          ctx.beginPath();
          ctx.arc(0.26, hy + 0.14, 0.06, 0, TAU);
          ctx.fillStyle = alpha(C.white, 0.8);
          ctx.fill();
        }
      },
    };
  },

  // Dot and Mo: the giant sheet in their arms on the way out.
  dot(t, p) {
    return {
      ...(p.moving && { arms: [1.3, 1.15], hold: (ctx) => sheet(ctx, t) }),
      face(ctx, hy, back) {
        // A headscarf, knotted on top
        ctx.beginPath();
        ctx.arc(0.02, hy - 0.02, 0.35, Math.PI * 0.95, Math.PI * 2.05);
        ctx.closePath();
        paint(ctx, C.mustard, { dots: C.coral, density: 0.35, lw: 0.05 });
        ctx.beginPath();
        ctx.ellipse(-0.1, hy - 0.4, 0.1, 0.06, -0.6, 0, TAU);
        ctx.ellipse(0.1, hy - 0.4, 0.1, 0.06, 0.6, 0, TAU);
        ink(ctx, C.mustard, 0.04);
      },
    };
  },
  mo(t, p) {
    return {
      ...(p.moving && { arms: [1.3, 1.15], hold: (ctx) => sheet(ctx, t + 1) }),
      face(ctx, hy, back) {
        ctx.beginPath();
        ctx.moveTo(-0.32, hy - 0.06);
        ctx.quadraticCurveTo(-0.2, hy - 0.4, 0.2, hy - 0.3);
        ctx.lineTo(0.46, hy - 0.12);
        ctx.lineTo(-0.32, hy - 0.06);
        ink(ctx, C.navy, 0.05);
        if (back || !Q.detail) return;
        ctx.beginPath();
        ctx.ellipse(0.2, hy + 0.13, 0.13, 0.05, 0, 0, TAU);
        ctx.fillStyle = C.greyLight;
        ctx.fill();
      },
    };
  },

  // The Honks. The drummer: a headband, and sticks going like the clappers.
  drums(t, p, look) {
    const play = p.pose === 'drum';
    const s = Math.sin(t * 15);
    const arms = play ? [1.3 + s * 0.45, 1.3 - s * 0.45] : null;
    return {
      arms: arms || (p.moving ? [1.2, 1.2] : null),
      back: play ? false : undefined, // playing to the crowd
      wear: teeLogo,
      hold: !play && p.moving ? amp : null,
      face(ctx, hy, back) {
        ctx.fillStyle = C.coral;
        ctx.fillRect(-0.3, hy - 0.2, 0.62, 0.1);
        if (!play) return;
        for (const [a, far] of [[arms[0], false], [arms[1], true]]) {
          const [x, y] = hand(a, far);
          limb(ctx, [[x - 0.05, y + 0.04], [x + 0.46, y + 0.2]], C.woodLight, 0.05);
          if (Q.detail && Math.cos(a) > 0.1) {
            ctx.beginPath();
            ctx.arc(x + 0.5, y + 0.22, 0.14, -2.2, -1.2);
            ctx.strokeStyle = C.ink;
            ctx.lineWidth = 0.035;
            ctx.stroke();
          }
        }
      },
    };
  },
  // The bassist: strumming, the neck up, bobbing.
  bass(t, p) {
    const play = !p.moving && p.pose === 'dance';
    return {
      arms: play ? [0.3 + Math.sin(t * 12) * 0.14, 1.35] : p.moving ? [1.2, 1.2] : null,
      back: play ? false : undefined,
      wear: teeLogo,
      hold: play ? bass : p.moving ? amp : null,
      face: shades,
    };
  },
  // The singer: the mic in one hand, the other up.
  singer(t, p) {
    const play = !p.moving && p.pose === 'cheer';
    const arms = play ? [2.35, -2.5 - Math.sin(t * 4) * 0.35] : null;
    return {
      arms,
      back: play ? false : undefined,
      wear: teeLogo,
      face(ctx, hy, back) {
        shades(ctx, hy, back);
        if (!play) return;
        const [x, y] = hand(arms[0]);
        limb(ctx, [[x, y + 0.02], [x - 0.3, y + 0.1]], C.ink, 0.06);
        ctx.beginPath();
        ctx.arc(x - 0.36, y + 0.1, 0.08, 0, TAU);
        ink(ctx, C.grey, 0.04);
      },
      after(ctx, t, p) {
        const h = hour(t);
        if (!play || h < 15 || h >= 22 || !Q.detail) return;
        for (let i = 0; i < 3; i++) {
          const k = (t * 0.45 + i / 3) % 1;
          const f = p.dir === 'l' ? -1 : 1;
          note(ctx, p.x + f * (0.3 + k * 0.5) + Math.sin(k * 6 + i) * 0.2, p.y - f * (0.3 + k * 0.5), p.z + 2.6 + k * 1.5, alpha(C.ink, 1 - k), 0.9);
        }
      },
    };
  },

  // Cardigan, glasses, bun. "Shh!", finger to her lips, with force.
  librarian(t, p) {
    const shh = !p.moving && p.say;
    return {
      arms: shh ? [0.08, 0] : null,
      back: shh ? false : undefined, // she turns to face the noise
      wear(ctx, b) {
        ctx.beginPath();
        ctx.moveTo(-0.34, b.hipY - 0.05);
        ctx.lineTo(0.34, b.hipY - 0.05);
        ctx.lineTo(0.42, b.hipY + 0.28);
        ctx.lineTo(-0.42, b.hipY + 0.28);
        ctx.closePath();
        ink(ctx, C.navy, 0.04);
        ctx.beginPath();
        ctx.moveTo(-0.08, b.top); ctx.lineTo(0.12, b.top); ctx.lineTo(0.02, b.top + 0.3);
        ctx.closePath();
        ink(ctx, C.white, 0.03);
      },
      face(ctx, hy, back) {
        if (!back) {
          ctx.beginPath();
          ctx.arc(0.1, hy + 0.02, 0.075, 0, TAU);
          ctx.moveTo(0.315, hy + 0.02);
          ctx.arc(0.24, hy + 0.02, 0.075, 0, TAU);
          ctx.strokeStyle = C.ink;
          ctx.lineWidth = 0.04;
          ctx.stroke();
        }
        if (!shh) return;
        limb(ctx, [[0.06, SH + 0.08], [0.42, SH + 0.36], [0.32, hy + 0.24]], C.mustard, 0.17);
        limb(ctx, [[0.32, hy + 0.2], [0.32, hy + 0.02]], C.blush, 0.05);
        // The shush: waves of it
        for (let i = 0; i < 3; i++) {
          const k = (t * 1.8 + i / 3) % 1;
          ctx.beginPath();
          ctx.arc(0.36, hy + 0.14, 0.3 + k * 1.1, -0.75, 0.75);
          ctx.strokeStyle = alpha(C.ink, 1 - k);
          ctx.lineWidth = 0.09 * (1 - k * 0.5);
          ctx.stroke();
        }
      },
    };
  },

  // Trench coat, deerstalker, magnifying glass. After 1pm, a pigeon, arrested.
  pidge(t, p, look) {
    const h = hour(t);
    const nick = p.say === 'You. Pigeon. Nicked.';
    const nicked = h >= 13 || h < 5;
    const arms = nick ? [0.95, 0.2] : [2.0, nicked ? 0.55 : p.moving ? sway(look, t) * 0.5 : -0.2];
    return {
      arms,
      wear(ctx, b) {
        ctx.beginPath();
        ctx.moveTo(-0.3, b.hipY - 0.12);
        ctx.lineTo(0.3, b.hipY - 0.12);
        ctx.lineTo(0.4, b.hipY + 0.46);
        ctx.lineTo(-0.4, b.hipY + 0.46);
        ctx.closePath();
        ink(ctx, COAT, 0.04);
        ctx.fillStyle = shade(COAT, 0.45);
        ctx.fillRect(-0.29, b.hipY - 0.16, 0.58, 0.08);
        if (Q.detail) {
          ctx.beginPath();
          ctx.moveTo(-0.1, b.top); ctx.lineTo(0.04, b.top + 0.36); ctx.lineTo(0.18, b.top);
          ctx.strokeStyle = shade(COAT, 0.5);
          ctx.lineWidth = 0.04;
          ctx.stroke();
        }
        if (nicked && !nick) pigeon(ctx, -0.02, b.shoulderY + 0.42, t, false);
      },
      face(ctx, hy, back) {
        // The deerstalker: a check crown, peaks front and back, flaps tied on top
        const check = mix(C.greyLight, C.brown, 0.45);
        for (const s of [1, -1]) {
          ctx.beginPath();
          ctx.moveTo(0.02 + s * 0.26, hy - 0.14);
          ctx.quadraticCurveTo(0.02 + s * 0.5, hy - 0.12, 0.02 + s * 0.58, hy + 0.04);
          ctx.lineTo(0.02 + s * 0.24, hy - 0.04);
          ctx.closePath();
          paint(ctx, shade(check, 0.15), { lw: 0.04 });
        }
        ctx.beginPath();
        ctx.arc(0.02, hy - 0.06, 0.33, Math.PI, 0);
        ctx.closePath();
        paint(ctx, check, { dots: Q.detail ? C.ink : null, density: 0.3, lw: 0.05 });
        ctx.beginPath();
        ctx.ellipse(-0.07, hy - 0.42, 0.09, 0.05, 0.5, 0, TAU);
        ctx.ellipse(0.11, hy - 0.42, 0.09, 0.05, -0.5, 0, TAU);
        ink(ctx, check, 0.035);
        if (!back && Q.detail) {
          ctx.fillStyle = C.brown;
          ctx.fillRect(0.12, hy + 0.1, 0.18, 0.05);
        }
        if (nick) {
          pigeon(ctx, 1.05, -0.12, t, true);
          return;
        }
        // The magnifying glass, up at the ready
        const [x, y] = hand(arms[0]);
        limb(ctx, [[x, y], [x + 0.06, y - 0.2]], C.brown, 0.06);
        ctx.beginPath();
        ctx.arc(x + 0.08, y - 0.36, 0.17, 0, TAU);
        ctx.fillStyle = alpha(C.sky, 0.6);
        ctx.fill();
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 0.06;
        ctx.stroke();
      },
    };
  },

  // Aquarium overalls and yellow wellies; a net on the way out, the octopus
  // in his arms on the way back.
  keeper(t, p) {
    const back = p.moving && p.speed < 2; // carrying it home
    return {
      ...(back && { arms: [1.3, 1.15], hold: (ctx) => armful(ctx, t) }),
      ...(p.moving && !back && { hold: net }),
      // Waiting by the octopus, not on it
      dx: p.moving ? 0 : 0.9,
      wear(ctx, b) {
        ctx.beginPath();
        ctx.rect(-0.22, b.shoulderY + 0.22, 0.46, b.hipY - b.shoulderY - 0.1);
        ink(ctx, C.teal, 0.035);
        if (!Q.detail) return;
        ctx.beginPath();
        ctx.moveTo(-0.2, b.shoulderY + 0.24); ctx.lineTo(-0.22, b.top);
        ctx.moveTo(0.22, b.shoulderY + 0.24); ctx.lineTo(0.2, b.top);
        ctx.strokeStyle = C.teal;
        ctx.lineWidth = 0.07;
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0.02, b.shoulderY + 0.42, 0.1, 0.06, 0, 0, TAU);
        ctx.fillStyle = C.mustard;
        ctx.fill();
      },
      face(ctx, hy) {
        ctx.beginPath();
        ctx.arc(0.02, hy - 0.08, 0.34, Math.PI, 0);
        ctx.lineTo(0.42, hy - 0.04);
        ctx.lineTo(-0.38, hy - 0.04);
        ctx.closePath();
        ink(ctx, C.tealLight, 0.05);
      },
    };
  },

  // Gary: anorak, binoculars, a beard, and pointing at where the star was.
  gary(t, p) {
    const up = !p.moving && p.pose === 'point';
    return {
      arms: up ? [2.8 + Math.sin(t * 2) * 0.08, -0.1] : null,
      wear(ctx, b) {
        if (!Q.detail || b.back) return;
        ctx.beginPath();
        ctx.moveTo(-0.14, b.top); ctx.lineTo(0.02, b.shoulderY + 0.4); ctx.lineTo(0.18, b.top);
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 0.03;
        ctx.stroke();
        ctx.fillStyle = C.ink;
        ctx.fillRect(-0.1, b.shoulderY + 0.36, 0.1, 0.2);
        ctx.fillRect(0.04, b.shoulderY + 0.36, 0.1, 0.2);
      },
      face(ctx, hy, back) {
        ctx.beginPath();
        ctx.arc(0.02, hy, 0.37, Math.PI * 0.55, Math.PI * 1.7);
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 0.16;
        ctx.stroke();
        ctx.strokeStyle = C.green;
        ctx.lineWidth = 0.1;
        ctx.stroke();
        if (back) return;
        ctx.beginPath();
        ctx.arc(0.1, hy + 0.08, 0.22, 0.1, Math.PI * 0.9);
        ctx.closePath();
        ctx.fillStyle = C.brown;
        ctx.fill();
      },
      after(ctx, t, p) {
        // A shooting star, just behind him, every eight seconds
        const k = (t % 8) / 0.7;
        if (!up || k > 1) return;
        const f = p.dir === 'l' ? -1 : 1;
        const X = p.x - p.y - f * (1.4 + k * 2), Y = (p.x + p.y) / 2 - (p.z + 5.6 - k * 0.8) * ZK;
        ctx.beginPath();
        ctx.moveTo(X, Y);
        ctx.lineTo(X + f * 1.1, Y - 0.45);
        ctx.strokeStyle = alpha(C.butter, 1 - k * 0.6);
        ctx.lineWidth = 0.08;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(X, Y, 0.1, 0, TAU);
        ctx.fillStyle = C.butter;
        ctx.fill();
      },
    };
  },
};

// The crowd: party hats (on their looks), and one thing each to wave.
const CROWD = {
  pool: { balloon: C.coral },
  arcade: { finger: C.mustard },
  disco: { balloon: C.teal },
  greenhouse: { finger: C.leaf },
  noodles: { flag: true },
  ballpit: { balloon: C.purple },
  umbrellas: { brolly: C.teal },
  trains: { finger: C.coral },
};
function crowd(t, p, look, id) {
  const it = CROWD[id.slice(6)] || {};
  const i = look.phase || 0;
  const s = sway(look, t);
  const far = p.moving ? s * 0.5 : p.pose === 'dance' ? -Math.PI * (s > 0 ? 0.55 : 0.9) : -Math.PI + 0.45 - s * 0.15;
  const near = it.finger ? (p.moving ? 2.3 : 2.75 + Math.sin(t * 6 + i) * 0.3)
    : it.balloon ? 2.5 + Math.sin(t * 2 + i) * 0.12
      : it.flag || it.brolly ? 2.6 + (p.moving ? 0 : Math.sin(t * 4 + i) * 0.25) : null;
  if (near == null) return {};
  return {
    arms: [near, far],
    face(ctx) {
      const [x, y] = hand(near);
      if (it.balloon) {
        const bx = x + 0.15 + Math.sin(t * 1.3 + i) * 0.08, by = y - 1.0;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x - 0.1, y - 0.5, bx, by + 0.36);
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 0.025;
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(bx, by, 0.28, 0.35, 0.1, 0, TAU);
        ink(ctx, it.balloon, 0.04);
        if (Q.detail) {
          ctx.beginPath();
          ctx.ellipse(bx - 0.1, by - 0.12, 0.05, 0.1, 0.4, 0, TAU);
          ctx.fillStyle = alpha(C.white, 0.7);
          ctx.fill();
        }
      } else if (it.finger) {
        ctx.beginPath();
        ctx.roundRect(x - 0.18, y - 0.34, 0.36, 0.4, 0.1);
        ctx.roundRect(x - 0.02, y - 0.78, 0.16, 0.5, 0.08);
        ink(ctx, it.finger, 0.045);
        if (Q.detail) print(ctx, '#1', x, y - 0.14, 0.18, C.ink, p.dir === 'l' ? -1 : 1);
      } else if (it.flag) {
        limb(ctx, [[x, y + 0.1], [x, y - 0.9]], C.woodLight, 0.04);
        const w = Math.sin(t * 7 + i) * 0.06;
        ctx.beginPath();
        ctx.moveTo(x, y - 0.9); ctx.lineTo(x + 0.6, y - 0.75 + w); ctx.lineTo(x, y - 0.55);
        ctx.closePath();
        ink(ctx, C.coral, 0.04);
      } else if (it.brolly) {
        limb(ctx, [[x, y + 0.1], [x, y - 0.75]], C.ink, 0.04);
        ctx.beginPath();
        ctx.arc(x, y - 0.72, 0.6, Math.PI, 0);
        ctx.quadraticCurveTo(x + 0.3, y - 0.84, x, y - 0.72);
        ctx.quadraticCurveTo(x - 0.3, y - 0.84, x - 0.6, y - 0.72);
        paint(ctx, it.brolly, { dots: C.white, density: 0.3, lw: 0.045 });
      }
    },
  };
}

// Where the walks put two people on one spot (the Courier, Pidge and one of
// the crowd all wait at [S0, 50] for the party), they stand a step apart.
const NUDGE = { pidge: [1.2, 0], 'crowd-umbrellas': [0, 1.3] };

// A person, dressed.
function dress(ctx, t, p, id, look) {
  const kit = KIT[id] || (id.startsWith('crowd-') ? crowd : null);
  const o = kit ? kit(t, p, look, id) : {};
  const [nx, ny] = !p.moving && !p.say && NUDGE[id] || [0, 0];
  person(ctx, p.x + (o.dx || 0) + nx, p.y + (o.dy || 0) + ny, p.z, {
    ...look, pose: p.pose, dir: p.dir, back: o.back ?? p.back, arms: o.arms || undefined, wear: o.wear, face: o.face, hold: o.hold || undefined,
  }, t);
  if (o.after) o.after(ctx, t, p);
}

// ---------- The snowman judge ----------
// A proper snowman on a trolley, scoring the party from 7pm with cards that
// change every few seconds, and melting a little by the end of the evening.
// He's fresh again the next day.
const SCORES = ['9', '10', '8', '10', '7', '10', '9', '11', '10', '6', '10', '10'];
function snowman(ctx, t, p) {
  const h = hour(t);
  const melt = h >= 19.5 ? clamp01((h - 19.5) / 3) : 0;
  const scoring = !p.moving && h >= 19 && h < 22.5;
  const f = p.dir === 'l' ? -1 : 1;
  const X = p.x - p.y, Y = (p.x + p.y) / 2 - p.z * ZK;
  // The puddle, growing
  if (melt > 0.05) {
    ctx.beginPath();
    ctx.ellipse(X, Y + 0.05, 1.1 + melt * 0.7, 0.55 + melt * 0.35, 0, 0, TAU);
    ctx.fillStyle = alpha(C.sky, 0.6);
    ctx.fill();
    ctx.strokeStyle = alpha(C.ink, 0.35);
    ctx.lineWidth = 0.035;
    ctx.stroke();
  }
  // The trolley: wheels, deck, a handle at the back
  for (const [dx, dy] of [[-0.55, -0.42], [0.55, -0.42], [-0.55, 0.42], [0.55, 0.42]]) {
    const wx = X + dx - dy, wy = Y + (dx + dy) / 2 - 0.14 * ZK;
    ctx.beginPath();
    ctx.arc(wx, wy, 0.14, 0, TAU);
    ink(ctx, C.ink, 0.03);
    if (Q.detail && p.moving) {
      const a = t * 8;
      ctx.beginPath();
      ctx.moveTo(wx + Math.cos(a) * 0.1, wy + Math.sin(a) * 0.1);
      ctx.lineTo(wx - Math.cos(a) * 0.1, wy - Math.sin(a) * 0.1);
      ctx.strokeStyle = C.grey;
      ctx.lineWidth = 0.03;
      ctx.stroke();
    }
  }
  const hx = p.x - 0.62;
  ctx.beginPath();
  for (const dy of [-0.45, 0.45]) {
    ctx.moveTo(hx - p.y - dy, (hx + p.y + dy) / 2 - 0.4 * ZK);
    ctx.lineTo(hx - p.y - dy, (hx + p.y + dy) / 2 - 1.5 * ZK);
  }
  ctx.moveTo(hx - p.y + 0.45, (hx + p.y - 0.45) / 2 - 1.5 * ZK);
  ctx.lineTo(hx - p.y - 0.45, (hx + p.y + 0.45) / 2 - 1.5 * ZK);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.08;
  ctx.stroke();
  box(ctx, p.x - 0.7, p.y - 0.55, 0.24, 1.4, 1.1, 0.18, C.grey, { flat: true });
  if (Q.detail) print(ctx, 'JUDGE', X + 0.35, Y - 0.24 * ZK + 0.14, 0.16, C.white);
  // The snowman: three balls, squashing as he goes
  const deck = Y - 0.42 * ZK;
  const balls = [[0.58, 0.54], [0.44, 0.42], [0.31, 0.31]].map(([rx, ry], i) => [rx * (1 + melt * (0.28 - i * 0.08)), ry * (1 - melt * (0.3 - i * 0.08))]);
  const lean = -f * melt * 0.14;
  let y = deck;
  const at = balls.map(([rx, ry], i) => {
    const c = [X + lean * i * i * 0.5, y - ry];
    y -= ry * 1.75;
    return c;
  });
  // Twig arms (the far one first), one holding up tonight's score
  const [mx, my] = at[1];
  const card = scoring ? [mx + f * 0.95, my - 1.05] : [mx + f * 0.8, my + 0.2];
  limb(ctx, [[mx - f * 0.35, my], [mx - f * 0.8, my - 0.3 + (scoring ? Math.sin(t * 3) * 0.1 : 0.4)]], C.brown, 0.05);
  balls.forEach(([rx, ry], i) => {
    ctx.beginPath();
    ctx.ellipse(at[i][0], at[i][1], rx, ry, 0, 0, TAU);
    paint(ctx, C.white, { dots: Q.detail ? C.sky : null, density: 0.12, lw: 0.05 });
  });
  const [cx, cy] = at[2];
  // Coal buttons, the scarf, the face, the wig
  if (Q.detail) {
    ctx.fillStyle = C.ink;
    for (const k of [-0.15, 0.1]) {
      ctx.beginPath();
      ctx.arc(mx + f * 0.1, my + k, 0.05, 0, TAU);
      ctx.fill();
    }
  }
  ctx.beginPath();
  ctx.ellipse((mx + cx) / 2, cy + balls[2][1] * 0.9, 0.34, 0.1, 0, 0, TAU);
  ink(ctx, C.coral, 0.04);
  const w = Math.sin(t * 3) * 0.05;
  ctx.beginPath();
  ctx.moveTo(cx - f * 0.2, cy + balls[2][1] * 0.9);
  ctx.lineTo(cx - f * 0.36 + w, cy + balls[2][1] + 0.5);
  ctx.lineTo(cx - f * 0.18 + w, cy + balls[2][1] + 0.52);
  ctx.lineTo(cx - f * 0.06, cy + balls[2][1] * 0.9);
  ctx.closePath();
  ink(ctx, C.coral, 0.04);
  ctx.fillStyle = C.ink;
  for (const k of [0.02, 0.16]) {
    ctx.beginPath();
    ctx.arc(cx + f * k, cy - 0.06 + melt * 0.04, 0.045, 0, TAU);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(cx + f * 0.12, cy + 0.02);
  ctx.lineTo(cx + f * 0.55, cy + 0.07 + melt * 0.2);
  ctx.lineTo(cx + f * 0.12, cy + 0.12);
  ctx.closePath();
  ink(ctx, ORANGE, 0.03);
  // A judge's wig: curls down both sides
  ctx.beginPath();
  ctx.arc(cx, cy - 0.06, 0.33, Math.PI * 1.05, Math.PI * 1.95);
  ctx.closePath();
  ink(ctx, C.greyLight, 0.04);
  if (Q.detail) {
    for (const s of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.arc(cx + s * 0.32, cy - 0.04 + k * 0.14, 0.08, 0, TAU);
        ink(ctx, C.greyLight, 0.03);
      }
    }
  }
  // The near arm and the card: tonight's score, a new one every few seconds
  limb(ctx, [[mx + f * 0.35, my], [card[0] - f * 0.05, card[1] + 0.25]], C.brown, 0.05);
  const flip = scoring ? clamp01(((t % 3) / 3) * 12) : 1;
  ctx.beginPath();
  ctx.rect(card[0] - 0.32 * flip, card[1] - 0.26, 0.64 * flip, 0.5);
  ink(ctx, C.white, 0.045);
  if (scoring && flip > 0.6) print(ctx, SCORES[Math.floor(t / 3) % SCORES.length], card[0], card[1], 0.4, C.coral);
  // Drips off the trolley as he goes
  if (melt > 0.05 && Q.detail) {
    for (let i = 0; i < 2; i++) {
      const k = (t * 0.8 + i * 0.5) % 1;
      ctx.beginPath();
      ctx.arc(X - 0.5 + i * 0.9, deck + 0.2 + k * 0.35, 0.05, 0, TAU);
      ctx.fillStyle = alpha(C.sky, 1 - k);
      ctx.fill();
    }
  }
}

// ---------- The octopus ----------
// Pink, suckers, and eyes only for the noodle bar. On the way home it's in
// the keeper's arms (he draws it).
function octopus(ctx, t, p) {
  if (p.moving && p.speed > 1.2) return;
  const f = p.dir === 'l' ? -1 : 1;
  const X = p.x - p.y + (p.moving ? 0 : -0.3), Y = (p.x + p.y) / 2 - p.z * ZK + (p.moving ? 0 : -0.15);
  if (Q.detail) {
    ctx.beginPath();
    ctx.ellipse(X, Y, 0.7, 0.3, 0, 0, TAU);
    ctx.fillStyle = alpha(C.ink, 0.18);
    ctx.fill();
  }
  const pace = p.moving ? 9 : 2.5;
  for (let i = 0; i < 8; i++) {
    const a = (i / 7 - 0.5) * 2.8;
    const k = Math.sin(t * pace + i * 1.3) * 0.3;
    const x0 = X + Math.sin(a) * 0.25, x1 = X + Math.sin(a + k) * 0.6, x2 = X + Math.sin(a + k * 1.6) * 0.9;
    const y2 = Y - 0.05 + Math.cos(a) * 0.12;
    limb(ctx, [[x0, Y - 0.45], [x1, Y - 0.08], [x2, y2], [x2 + Math.sign(Math.sin(a) || 1) * 0.12, y2 - 0.12]], C.pink, 0.13);
    if (Q.detail && i % 2) {
      ctx.beginPath();
      ctx.arc(x1, Y - 0.08, 0.035, 0, TAU);
      ctx.arc(x2, y2, 0.03, 0, TAU);
      ctx.fillStyle = C.blush;
      ctx.fill();
    }
  }
  ctx.beginPath();
  ctx.ellipse(X - f * 0.05, Y - 0.9, 0.46, 0.56, -f * 0.25, 0, TAU);
  paint(ctx, C.pink, { dots: Q.detail ? shade(C.pink, 0.3) : null, density: 0.14, lw: 0.05 });
  // The eyes: on the noodle bar when it waits (up the alley), else where it's going
  const [gx, gy] = p.moving ? [f * 0.05, 0.01] : [-0.05, -0.03];
  for (const dx of [-0.17, 0.17]) {
    ctx.beginPath();
    ctx.arc(X + dx, Y - 0.62, 0.12, 0, TAU);
    ink(ctx, C.white, 0.04);
    ctx.beginPath();
    ctx.arc(X + dx + gx, Y - 0.62 + gy, 0.055, 0, TAU);
    ctx.fillStyle = C.ink;
    ctx.fill();
  }
  // Waiting, besotted: a little heart now and then
  if (!p.moving && Q.detail) {
    const k = (t % 3) / 1.5;
    if (k < 1) {
      const hx = X - 0.5 - k * 0.3, hy = Y - 1.5 - k * 0.6;
      ctx.beginPath();
      ctx.moveTo(hx, hy + 0.12);
      ctx.bezierCurveTo(hx - 0.2, hy - 0.02, hx - 0.08, hy - 0.16, hx, hy - 0.05);
      ctx.bezierCurveTo(hx + 0.08, hy - 0.16, hx + 0.2, hy - 0.02, hx, hy + 0.12);
      ctx.fillStyle = alpha(C.coral, 1 - k);
      ctx.fill();
    }
  }
}

// ---------- The bin lorry ----------
// Cab at the front (+y, the way it first drives), the body behind, the lift
// at the back with a bin on it, and an orange light going round on the roof.
// Upright text and wheels are drawn in a side's own plane.
function plane(ctx, x, y, z, side) {
  const X = x - y, Y = (x + y) / 2 - z * ZK;
  ctx.save();
  // side 'x': the face looking +x, u running toward -y (left to right on screen)
  // side 'y': the face looking +y, u running along +x
  if (side === 'x') ctx.transform(1, -0.5, 0, ZK, X, Y);
  else ctx.transform(1, 0.5, 0, ZK, X, Y);
}
function lorry(ctx, t, p) {
  const x0 = p.x - 1.2, x1 = p.x + 1.2, y0 = p.y - 2.2, y1 = p.y + 2.2;
  const h = hour(t);
  const parked = !p.moving;
  // The lift, on the back corner we can see: when it's stopped, up goes a
  // bin and over
  const k = parked && h < 11 ? (t % 6) / 6 : 0;
  const up = k < 0.3 ? k / 0.3 : k < 0.6 ? 1 : k < 0.9 ? 1 - (k - 0.6) / 0.3 : 0;
  const binZ = 0.15 + up * 2.2;
  const bin = () => {
    box(ctx, x1 - 0.25, y0 - 0.75, binZ, 0.75, 0.65, 1.0, C.navy, { flat: true });
    if (up > 0.95 && Q.detail) {
      for (let i = 0; i < 3; i++) {
        const q = ((t * 1.5 + i / 3) % 1);
        const [bx, by] = [x1 - 0.05 + i * 0.2, y0 - 0.2 + q * 0.6];
        ctx.beginPath();
        ctx.rect(bx - by - 0.08, (bx + by) / 2 - (binZ + 1.1 - q * 0.8) * ZK, 0.16, 0.12);
        ctx.fillStyle = [C.leaf, C.coral, C.white][i];
        ctx.fill();
      }
    }
  };
  if (binZ < 2) bin();
  // Lift arms
  ctx.beginPath();
  for (const dx of [-0.15, 0.35]) {
    const ax = x1 + dx, ay = y0 - 0.15;
    ctx.moveTo(ax - ay, (ax + ay) / 2 - 0.4 * ZK);
    ctx.lineTo(ax - ay, (ax + ay) / 2 - (binZ + 0.6) * ZK);
  }
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.1;
  ctx.stroke();
  // Chassis, body and cab
  box(ctx, x0 + 0.15, y0 + 0.2, 0.35, 2.1, 4.0, 0.25, C.ink, { flat: true });
  box(ctx, x0, y0, 0.55, 2.4, 3.1, 2.05, C.green, { flat: true });
  box(ctx, x0 + 0.05, y0 + 3.15, 0.55, 2.3, 1.05, 1.75, C.white, { flat: true });
  // The side of the body: a stripe and the council's motto
  plane(ctx, x1, y0 + 3.1, 0, 'x');
  ctx.fillStyle = C.mustard;
  ctx.fillRect(0, -1.05, 3.1, 0.14);
  if (Q.detail) {
    for (const [s, y] of [['BIN THERE,', -1.95], ['DONE THAT', -1.6]]) {
      ctx.save();
      ctx.scale(1 / 40, 1 / 40);
      ctx.font = '11px "Bagel Fat One", "Arial Black", sans-serif';
      ctx.fillStyle = C.white;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s, 1.55 * 40, y * 40);
      ctx.restore();
    }
  }
  // The cab's side window
  ctx.beginPath();
  ctx.rect(-0.95 + 0.1, -2.15, 0.7, 0.6);
  ctx.fillStyle = C.sky;
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.04;
  ctx.stroke();
  // Wheels
  for (const u of [-0.6, 1.4, 2.4]) {
    ctx.beginPath();
    ctx.arc(u, -0.45, 0.45, 0, TAU);
    ctx.fillStyle = C.ink;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(u, -0.45, 0.18, 0, TAU);
    ctx.fillStyle = C.grey;
    ctx.fill();
  }
  ctx.restore();
  // The front: windscreen, the driver, headlights
  plane(ctx, x0 + 0.05, y1, 0, 'y');
  ctx.beginPath();
  ctx.rect(0.25, -2.12, 1.8, 0.7);
  ctx.fillStyle = C.sky;
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.04;
  ctx.stroke();
  // The driver, in hi-vis, cap on
  ctx.fillStyle = C.mustard;
  ctx.fillRect(1.15, -1.55, 0.6, 0.14);
  ctx.beginPath();
  ctx.arc(1.45, -1.72, 0.19, 0, TAU);
  ctx.fillStyle = SKIN[2];
  ctx.fill();
  ctx.fillStyle = C.coral;
  ctx.fillRect(1.25, -1.93, 0.4, 0.1);
  ctx.fillStyle = C.ink;
  ctx.fillRect(1.36, -1.72, 0.05, 0.05);
  ctx.fillRect(1.5, -1.72, 0.05, 0.05);
  ctx.fillStyle = C.butter;
  ctx.fillRect(0.2, -0.95, 0.35, 0.18);
  ctx.fillRect(1.75, -0.95, 0.35, 0.18);
  ctx.fillStyle = C.ink;
  for (let i = 0; i < 4; i++) ctx.fillRect(0.75, -1.1 + i * 0.1, 0.8, 0.04);
  ctx.restore();
  if (binZ >= 2) bin();
  // The light on the roof, going round
  const on = (t * 2.5) % 1 < 0.5;
  box(ctx, p.x - 0.2, y0 + 3.55, 2.3, 0.4, 0.3, 0.22, on ? ORANGE : shade(ORANGE, 0.35), { flat: true });
  if (on) {
    const [lx, ly] = [p.x - (y0 + 3.7), (p.x + y0 + 3.7) / 2 - 2.45 * ZK];
    ctx.beginPath();
    ctx.arc(lx, ly, 0.55, 0, TAU);
    ctx.fillStyle = alpha(C.mustard, 0.35);
    ctx.fill();
  }
  // Parked for the day by late morning, the driver has given up
  if (parked && h >= 11 && h < 20 && Q.detail) {
    const q = (t * 0.6) % 1;
    label(ctx, p.x + 0.4 - q * 0.3, y1 - q * 0.3, 2.4 + q * 1.1, 'z', 0.4 + q * 0.3, alpha(C.ink, 1 - q));
  }
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
      if (id === 'courier' && finale.since) return; // he's on the stage, with the parcel (finale.js)
      if (c.draw) c.draw(ctx, t, p);
      else dress(ctx, t, p, id, look);
      if (!readable()) return;
      const top = p.z + (c.draw === lorry ? 3.4 : c.draw === snowman ? 3.3 : 2.9);
      if (p.say) speech(ctx, p.x, p.y, top + 0.1, p.say, { size: 0.5 });
      else if (c.name) tag(ctx, p.x, p.y, top, c.name, { size: 0.34, fill: alpha(C.white, 0.9) });
    },
  };
}).filter(Boolean);
if (problems.length) throw new Error('The day does not fit:\n' + problems.join('\n'));
