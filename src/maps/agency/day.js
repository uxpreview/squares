// Pitch Day: everyone on the clock (clock.js) who goes from one area to
// another. The engine draws each of them in whichever area they're in; the
// areas draw everyone who stays put (and the people at desks, who run to the
// windows at bear o'clock: kit.js, worker).
//
//   8:35am  Dana, the CEO (purple, a lanyard, a coffee), walks the floor to
//           Dev's stand-up, back at 11:30; at 2pm out to Creative and on to
//           the pitch room, where she presents with a clicker till 5
//   8:50am  the Courier (mustard, a cap), with a parcel for "G. Goose, c/o
//           Creative", up the stair to reception, where the sign says BACK
//           IN 5 MINUTES; it sits on his knees all day; at 5pm he signs for
//           it himself and goes
//   all day Kayleigh from Marketing (pink), filming Take 47 on her phone,
//           and filming her coffee runs too
//   3:50pm  the Gander Cola clients, three in red with the brand's tote, up
//           to the pitch room; at bear o'clock they go to the window with
//           everyone else
//   7:55pm  a pizza for Dev, up the stair; on his way out at ten the bear
//           comes up the lot, and he's gone
//   the end the seven geese, out of the front door and into the woods
//           (finale.js), while the clients watch from the window
//
// Between floors (the stair inside the building) nobody's drawn: they're on
// floors that aren't on the map, and so is anyone at the roadside (away).
import { C, Q, folk, person, speech, alpha, shade, tint } from '../../engine/art.js';
import { schedule } from '../../engine/actors.js';
import { LOOP, at, ceo } from './clock.js';
import { BD, FLOOR, SPINE, AISLE, DOOR, TOWER, PITCH, D, SILL } from './plan.js';
import { BRAND } from './style.js';
import { finale, ending, AT_GLASS, GEESE, gooseAt, drawGoose, SAY } from './finale.js';

// The top of the stair, out of the tower's door, and the way down inside.
const TOP = [TOWER.x, TOWER.y + TOWER.r + 0.9, FLOOR];
const INSIDE = [DOOR[0], BD - 6, 3.2];
const FOOT = [DOOR[0], BD + 0.7, 0];
const ROADSIDE = (x) => [x, D + 6, 0];

const courier = schedule([
  ROADSIDE(52),
  { until: at(8.8) },
  [52, AISLE, 0], [DOOR[0], AISLE, 0], FOOT, INSIDE, TOP,
  [TOP[0] - 4, SPINE, FLOOR], [34.9, 15.6, FLOOR],
  { until: at(17.0), pose: 'sit' },
  [TOP[0] - 4, SPINE, FLOOR], [35.6, 9.8, FLOOR], { wait: 4, pose: 'stand', say: 'Signed for it myself.' },
  [TOP[0] - 4, SPINE, FLOOR], TOP, INSIDE, FOOT, [DOOR[0], AISLE, 0], [52, AISLE, 0],
], { loop: LOOP, name: 'The Courier' });

// Kayleigh's coffee runs: Marketing to the kitchen and back.
const MUG = [24.5, SPINE + 2.6, FLOOR], MACHINE = [52.4, 2.6, FLOOR];
const coffee = schedule([
  MUG,
  { speed: 1.6 },
  { until: at(9.0), pose: 'film' },
  [24.5, SPINE, FLOOR], [50, SPINE, FLOOR], MACHINE, { wait: 3, pose: 'stand' }, [50, SPINE, FLOOR], [24.5, SPINE, FLOOR], MUG,
  { until: at(11.6), pose: 'film' },
  [24.5, SPINE, FLOOR], [50, SPINE, FLOOR], MACHINE, { wait: 3, pose: 'stand' }, [50, SPINE, FLOOR], [24.5, SPINE, FLOOR], MUG,
  { until: at(13.9), pose: 'film' },
  [24.5, SPINE, FLOOR], [50, SPINE, FLOOR], MACHINE, { wait: 3, pose: 'stand' }, [50, SPINE, FLOOR], [24.5, SPINE, FLOOR], MUG,
  { until: at(17.05), pose: 'film' },
  [24.5, SPINE, FLOOR], [TOP[0], SPINE, FLOOR], TOP, INSIDE,
  { until: LOOP - 16 },
], { loop: LOOP, name: 'Kayleigh' });

// The clients: up to the pitch room at 3:50, seats along the table's back,
// to the window at bear o'clock (4:25), and down again after. In the ending
// they stay at the glass, watching the geese go.
const glassAt = (i) => [PITCH[0] + 4 + i * 1.8, SILL, FLOOR];
// Through the pitch room's door (on its back wall, front.js), never its glass.
const PITCH_DOOR = 47.7;
const clients = [0, 1, 2].map((i) => {
  const seat = [PITCH[0] + 4.6 + i * 2.2, PITCH[1] + 2.2, FLOOR];
  const glass = glassAt(i);
  const day = schedule([
    ROADSIDE(50 + i),
    { speed: 2 },
    { until: at(14.2) + i * 0.6 },
    [50 + i, AISLE, 0], [DOOR[0], AISLE, 0], FOOT, INSIDE, TOP,
    [TOP[0] + 1 + i, SPINE, FLOOR], [PITCH_DOOR, SPINE, FLOOR], [PITCH_DOOR, PITCH[1] + 1, FLOOR], [seat[0], PITCH[1] + 1, FLOOR], seat,
    { until: at(16.42) + i * 0.6, pose: 'sit' },
    glass, { until: at(17.05), pose: 'point' },
    seat, { until: at(17.25), pose: 'stand', say: i === 1 ? 'We love the goose.' : null },
    [seat[0], PITCH[1] + 1, FLOOR], [PITCH_DOOR, PITCH[1] + 1, FLOOR], [PITCH_DOOR, SPINE, FLOOR], [TOP[0] + 1 + i, SPINE, FLOOR], TOP, INSIDE, FOOT, [DOOR[0], AISLE, 0], [50 + i, AISLE, 0],
  ], { loop: LOOP, name: `Client ${i + 1}` });
  const still = { x: glass[0], y: glass[1], z: glass[2], dir: 'l', back: false, moving: false };
  return (t) => {
    if (!ending(t) || finale.since > AT_GLASS) return day(t);
    const s = finale.since, talk = i === 1 && s > SAY.from && s < SAY.to;
    return { ...still, pose: talk ? 'wave' : 'point', say: talk ? SAY.text : null };
  };
});

// A pizza for Dev, at eight: up the stair, along the spine, and back. On the
// way out he meets the bear coming up the lot (clock.js, the bear's night
// walk), freezes, and runs for the road.
const PIZZA_AT = 214, NOPE = 300.5;
const pizza = schedule([
  ROADSIDE(54),
  { until: PIZZA_AT },
  { speed: 2.4 },
  [54, AISLE, 0], [DOOR[0], AISLE, 0], FOOT, INSIDE, TOP,
  [TOP[0] + 4, SPINE, FLOOR], [96, SPINE, FLOOR],
  { until: at(20.2), pose: 'stand', say: 'Pizza for Dev?' },
  [TOP[0] + 4, SPINE, FLOOR], TOP, INSIDE, FOOT, [DOOR[0], AISLE, 0],
  { until: NOPE, pose: 'stand', say: 'Nope.' },
  { speed: 3.4 },
  [DOOR[0] + 0.4, AISLE + 1.5, 0], ROADSIDE(DOOR[0] + 0.4),
  { speed: 2.4 },
], { loop: LOOP, name: 'The pizza' });

// ---------- Drawing them ----------
// Where the near hand is for an arm at angle a, from where person() hangs
// what's held (o.hold), so a prop sits in the hand.
const HAND = (a) => [-0.13 + 0.72 * Math.sin(a), -0.3 + 0.72 * Math.cos(a)];
const ink = (ctx, w) => { if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.stroke(); } };
const fill = (ctx, c, w = 0.03) => { ctx.fillStyle = c; ctx.fill(); ink(ctx, w); };

// Someone on the clock: arm is the near arm's angle when they're holding
// something (item draws it, given the hand), or null for their own pose.
function body(ctx, t, p, look, arm, item) {
  const pose = p.pose === 'film' ? 'stand' : p.pose;
  const o = { ...look, pose, dir: p.dir, back: p.back };
  if (arm != null) {
    const sn = Math.sin((look.phase || 0) + t * 7);
    const far = pose === 'walk' ? sn * 0.5 : pose === 'run' ? sn * 1.1 + 0.4 : pose === 'sit' ? 0.5 : -0.15;
    o.arms = [arm, far];
    o.hold = (c, tt) => item(c, HAND(arm), tt, pose);
  }
  person(ctx, p.x, p.y, p.z + (pose === 'sit' ? 0.15 : 0), o, t);
}
// A line over someone's head, close up only (and only while they stand).
function say(ctx, p, text, size = 0.42) {
  if (!text || p.moving || !Q.detail || Q.pxPerUnit < 10) return;
  speech(ctx, p.x, p.y, p.z + (p.pose === 'sit' ? 2.6 : 3), text, { size });
}

// Props, drawn in the hand (person-local units, facing right).
function cup(ctx, [hx, hy]) {
  ctx.beginPath();
  ctx.moveTo(hx - 0.1, hy - 0.22); ctx.lineTo(hx + 0.1, hy - 0.22); ctx.lineTo(hx + 0.08, hy + 0.08); ctx.lineTo(hx - 0.08, hy + 0.08); ctx.closePath();
  fill(ctx, C.white);
  ctx.fillStyle = C.brown; ctx.fillRect(hx - 0.095, hy - 0.12, 0.185, 0.1);
  ctx.beginPath(); ctx.rect(hx - 0.12, hy - 0.28, 0.24, 0.06); fill(ctx, shade(C.white, 0.15), 0.02);
}
function clicker(ctx, [hx, hy]) {
  ctx.beginPath(); ctx.rect(hx - 0.02, hy - 0.06, 0.2, 0.09); fill(ctx, C.black, 0.02);
  ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(hx + 0.15, hy - 0.015, 0.025, 0, Math.PI * 2); ctx.fill();
}
// The parcel: a brown box with a label, G. GOOSE on it when you're close.
function parcel(ctx, [hx, hy], t, pose) {
  const sit = pose === 'sit';
  const x = sit ? hx - 0.35 : hx - 0.42, y = sit ? hy - 0.42 : hy - 0.3, w = 0.68, h = 0.46;
  ctx.beginPath(); ctx.rect(x, y, w, h); fill(ctx, C.woodLight, 0.035);
  ctx.fillStyle = alpha(C.brown, 0.55); ctx.fillRect(x + w * 0.44, y, w * 0.12, h);
  ctx.beginPath(); ctx.rect(x + 0.06, y + 0.1, 0.36, 0.2); fill(ctx, C.white, 0.015);
  if (Q.detail && Q.pxPerUnit > 28) {
    ctx.save();
    ctx.translate(x + 0.24, y + 0.2);
    ctx.scale(1 / 40, 1 / 40);
    ctx.font = '700 3.6px "Rethink Sans", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = C.ink;
    ctx.fillText('G. GOOSE', 0, 0);
    ctx.restore();
  }
}
// Kayleigh's phone on a gimbal, recording (a red dot that blinks).
function gimbal(ctx, [hx, hy], t) {
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + 0.08, hy - 0.42);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.07; ctx.lineCap = 'round'; ctx.stroke();
  ctx.beginPath(); ctx.rect(hx - 0.02, hy - 0.62, 0.2, 0.3); fill(ctx, C.black, 0.025);
  if (Math.sin(t * 5) > 0) { ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(hx + 0.08, hy - 0.56, 0.03, 0, Math.PI * 2); ctx.fill(); }
}
// The clients' tote, white with the brand in red, hanging from the hand.
function tote(ctx, [hx, hy]) {
  ctx.beginPath(); ctx.moveTo(hx - 0.12, hy + 0.18); ctx.lineTo(hx, hy); ctx.lineTo(hx + 0.12, hy + 0.18);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.04; ctx.stroke();
  ctx.beginPath(); ctx.rect(hx - 0.22, hy + 0.16, 0.44, 0.44); fill(ctx, C.white, 0.03);
  ctx.fillStyle = BRAND.can; ctx.beginPath(); ctx.arc(hx, hy + 0.38, 0.11, 0, Math.PI * 2); ctx.fill();
}
// Two pizza boxes on the flat of both hands.
function pizzas(ctx, [hx, hy]) {
  for (let k = 0; k < 2; k++) {
    ctx.beginPath(); ctx.rect(hx - 0.55, hy - 0.16 - k * 0.15, 0.7, 0.14); fill(ctx, tint(C.wood, 0.55), 0.03);
    ctx.fillStyle = C.red; ctx.fillRect(hx - 0.3, hy - 0.12 - k * 0.15, 0.2, 0.06);
  }
}
// Dana's lanyard and pass.
const lanyard = (ctx, b) => {
  if (b.back) return;
  ctx.beginPath(); ctx.moveTo(-0.13, b.top + 0.04); ctx.lineTo(0.03, b.top + 0.42); ctx.lineTo(0.17, b.top + 0.04);
  ctx.strokeStyle = C.teal; ctx.lineWidth = 0.05; ctx.stroke();
  ctx.beginPath(); ctx.rect(-0.05, b.top + 0.4, 0.16, 0.2); fill(ctx, C.white, 0.02);
};

const LOOK = {
  ceo: folk(400, { top: C.purple, bottom: C.ink, hair: C.ink, style: 'bun', wear: lanyard }),
  courier: folk(300, { top: C.mustard, bottom: C.brown, hat: 'cap', hatColor: C.brown }),
  kayleigh: folk(410, { top: C.pink, bottom: C.navy, style: 'pony' }),
  client: (i) => folk(420 + i, { top: C.red, bottom: C.ink, dress: false }),
  pizza: folk(430, { top: C.green, bottom: C.ink, hat: 'cap', hatColor: C.red }),
};

// The geese of the ending, one walker each so each sorts with the cars round
// it. While the ending isn't playing they wait, unseen, inside the door.
const geese = Array.from({ length: GEESE }, (_, i) => ({
  id: `goose-${i + 1}`,
  name: `Goose ${i + 1}`,
  ghost: true,
  loop: LOOP,
  at: (t) => (ending(t) ? gooseAt(i, finale.since) : { x: DOOR[0], y: BD + 0.45, z: 0, a: 0 }),
  draw(ctx, t, p) { drawGoose(ctx, t, i, p); },
}));

export const walkers = [
  {
    id: 'ceo',
    name: 'Dana, the CEO',
    color: C.purple,
    loop: LOOP,
    at: ceo,
    draw(ctx, t, p) {
      // A coffee on her walks; the clicker while she rehearses and pitches.
      const pitching = p.pose === 'point' && !p.moving;
      body(ctx, t, p, LOOK.ceo, pitching ? 1.5 : 1.15, pitching ? clicker : cup);
      // "Love the energy!", now and then, at the stand-up.
      if (p.say && t % 14 < 4) say(ctx, p, p.say);
    },
  },
  {
    id: 'courier',
    name: 'The Courier',
    color: C.mustard,
    loop: LOOP,
    at: courier,
    away: true,
    draw(ctx, t, p) {
      body(ctx, t, p, LOOK.courier, p.pose === 'sit' ? 0.6 : 1.2, parcel);
      say(ctx, p, p.say);
    },
  },
  {
    id: 'kayleigh',
    name: 'Kayleigh',
    color: C.pink,
    loop: LOOP,
    at: coffee,
    away: true,
    draw(ctx, t, p) { body(ctx, t, p, LOOK.kayleigh, p.pose === 'film' ? 1.5 : 1.25, gimbal); },
  },
  ...clients.map((at, i) => ({
    id: `client-${i + 1}`,
    name: `Client ${i + 1}`,
    color: C.red,
    loop: LOOP,
    at,
    away: true,
    draw(ctx, t, p) {
      const free = p.pose !== 'point' && p.pose !== 'sit' && p.pose !== 'wave';
      body(ctx, t, p, LOOK.client(i), free ? 0.08 : null, tote);
      say(ctx, p, p.say, 0.5);
    },
  })),
  {
    id: 'pizza',
    name: 'The pizza',
    color: C.green,
    loop: LOOP,
    at: pizza,
    away: true,
    draw(ctx, t, p) {
      body(ctx, t, p, LOOK.pizza, 1.25, pizzas);
      say(ctx, p, p.say);
    },
  },
  ...geese,
];
