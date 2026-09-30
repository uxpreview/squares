// All You Can Eat: the style sheet. Every area takes its colors, the day's
// clock and who's green from here, so the whole ship stays one plate and one
// story. The inks come from the brief (docs/levels/cruise.md, "Palette and plate").
import { C, Q, mix, tint, shade, person, SKIN, HAIR, paint } from '../../engine/art.js';
import { ZK } from '../../engine/iso.js';
import { LOOP, HOUR } from './plan.js';

export const INK = {
  sea: '#2A93A8',
  hullWhite: '#F4EEE2',
  funnelRed: '#D6473A',
  sunYellow: '#F2BF4A',
  flamingo: '#EE8C98',
  teak: '#B97A4A',
  queasyGreen: '#A7C23C',
  // The sea through the day, and the sunset it docks in.
  seaDawn: '#3AA3B0',
  seaNoon: '#2A93A8',
  seaGold: '#C98E4F',
  seaPink: '#B3657A',
};

// The paper this level is printed on: the sea at noon.
export const PAPER = INK.sea;

// The ship's materials: every area draws from these (and C), so the decks
// are one plate. The art keeps the greybox's deck tones (DECKS) as its base.
export const MAT = {
  brass: '#C9A24A',
  chrome: '#C9CDD3',
  glass: '#BFE3E6',
  pool: '#5CC2CC',
  teakDark: '#8E5B36',
  carpetRed: '#B8453C',
  carpetGold: '#E0B04F',
  felt: '#2F7D5B', // the casino's tables
  steel: '#8C939E',
  steelDark: '#5D6570',
  crewBlue: '#3E5C8A',
  canvas: '#EFE6D2', // awnings, loungers
  hullRed: '#B83A31', // the hull's bottom, below the waterline
};

// Each deck's own materials: its floor, its walls (inside the hull), and the
// hull's plating on the cut side. The greybox uses these tones; the art keeps them.
export const DECKS = {
  sun: { floor: INK.teak, wall: INK.hullWhite, name: 'SUN DECK' },
  cabins: { floor: tint(INK.flamingo, 0.35), wall: tint(INK.sunYellow, 0.75), name: 'CABINS' },
  promenade: { floor: tint(INK.funnelRed, 0.45), wall: tint(INK.sunYellow, 0.6), name: 'PROMENADE' },
  crew: { floor: C.greyLight, wall: C.grey, name: 'CREW ONLY' },
};

// Greybox floor tones, one per area in turn, so the plan reads at a glance.
const inks = [INK.sea, INK.hullWhite, INK.funnelRed, INK.sunYellow, INK.flamingo, INK.teak];
export const TONE = inks.map((c) => tint(c, 0.55)).concat(inks.map((c) => tint(c, 0.3)));
export const BLOCK = inks.map((c) => shade(c, 0.05));

// ---------- The day ----------
// 180 seconds, 7am to 7pm, 15 seconds an hour. at(h) is the moment of an hour
// of the day (at(13.5) is 1:30pm); hourOf(t) the other way.
export const at = (h) => (h - 7) * HOUR;
export const wrap = (t) => ((t % LOOP) + LOOP) % LOOP;
export const hourOf = (t) => 7 + wrap(t) / HOUR;
export function clockLabel(t) {
  const h = hourOf(t);
  let hh = Math.floor(h), mm = Math.floor((h - hh) * 6) * 10;
  const pm = hh >= 12;
  hh = hh > 12 ? hh - 12 : hh;
  return `${hh}:${String(mm).padStart(2, '0')} ${pm ? 'PM' : 'AM'}`;
}

// The day's moments (the dial skips to them; the sound cues from them).
export const MOMENTS = [
  { at: at(7), label: 'breakfast', say: '7am. The buffet opens. Doreen is number 2.' },
  { at: at(10), label: 'the drill', say: '10am. The lifeboat drill. Only one passenger is listening.' },
  { at: at(12), label: 'noon', say: 'Noon. The limbo. Half the ship is green.' },
  { at: at(15), label: 'bingo', say: '3pm. Bingo in the theater, a party below the waterline.' },
  { at: at(18), label: 'docking', say: '6pm. The port. Nobody is getting off.' },
];

// The sea, through the day: turquoise at breakfast, bright by noon, gold at
// five, pink as it docks, and back.
export function seaAt(t) {
  const h = hourOf(t);
  if (h < 9) return mix(INK.seaDawn, INK.seaNoon, (h - 7) / 2);
  if (h < 16) return INK.seaNoon;
  if (h < 17.5) return mix(INK.seaNoon, INK.seaGold, (h - 16) / 1.5);
  if (h < 18.5) return mix(INK.seaGold, INK.seaPink, h - 17.5);
  return mix(INK.seaPink, INK.seaDawn, (h - 18.5) / 0.5);
}

// ---------- Going green ----------
// Who turns green, and when (seconds into the day). It spreads from the
// buffet's breakfast, deck by deck, over the day. The crew never turn: they
// don't eat at the buffet. Areas use the same table for their own extras.
export const SICK = {
  doreen: at(10), brenda: at(11), tyler: null, pidge: at(16), swabb: at(15.5), chef: null,
  kelly: null, ray: null, steward: null,
};
// How green someone is at t (0 to 1): they turn over four seconds and stay
// green until the day starts again.
export const green = (t, when) => (when == null ? 0 : Math.max(0, Math.min(1, (wrap(t) - when) / 4)));
// The red herrings, green for their own reasons.
export const HERRING = {
  captain: () => 0.85, // seasick since 1996
  gloria: (t) => (wrap(t) < at(11) ? 1 : 0), // a cucumber mask until 11am
  chad: (t) => Math.max(0, Math.min(1, (wrap(t) - at(8)) / 30)), // Green Mermaids since breakfast
};
export const sickness = (id, t) => Math.max(green(t, SICK[id]), HERRING[id] ? HERRING[id](t) : 0);
// A face at that much green.
export const queasy = (skin, k) => (k > 0 ? mix(skin, INK.queasyGreen, 0.75 * k) : skin);

// What the case file tells the art: when it was solved (the reveal at the
// pool puts a towel over the iguana from then on), or null.
export const verdict = { solved: null };

// ---------- The cast ----------
// Everyone on the day's clock (day.js), their name and look.
export const CAST = {
  pidge: { name: 'Inspector Pidge', color: C.grey, look: { skin: C.grey, hair: C.grey, style: 'bald', hat: 'none', top: INK.flamingo, bottom: C.mustard } },
  doreen: { name: 'Doreen', color: INK.flamingo, look: { skin: SKIN[5], hair: HAIR[4], style: 'curly', hat: 'none', top: INK.flamingo, bottom: C.white } },
  chad: { name: 'Chad', color: C.coral, look: { skin: SKIN[1], hair: HAIR[3], style: 'short', hat: 'cap', top: C.coral, bottom: C.teal } },
  gloria: { name: 'Gloria', color: C.white, look: { skin: SKIN[2], hair: HAIR[0], style: 'bun', hat: 'none', top: C.white, dress: true } },
  captain: { name: 'Captain Stubbs', color: C.white, look: { skin: SKIN[0], hair: HAIR[4], style: 'short', hat: 'none', top: C.white, bottom: C.white } },
  chef: { name: 'Chef Gaston', color: C.white, look: { skin: SKIN[3], hair: HAIR[1], style: 'short', hat: 'chef', top: C.white, bottom: C.ink } },
  tyler: { name: 'Tyler', color: C.sky, look: { skin: SKIN[0], hair: HAIR[5], style: 'short', hat: 'cap', top: C.sky, bottom: C.navy, scale: 0.7 } },
  brenda: { name: 'Brenda', color: C.purple, look: { skin: SKIN[1], hair: HAIR[2], style: 'long', hat: 'none', top: C.purple, dress: true } },
  ray: { name: 'Ray', color: C.mustard, look: { skin: SKIN[0], hair: HAIR[6], style: 'bald', hat: 'none', top: C.mustard, bottom: C.navy } },
  kelly: { name: 'Kelly', color: INK.sunYellow, look: { skin: SKIN[4], hair: HAIR[0], style: 'pony', hat: 'none', top: INK.sunYellow, bottom: C.navy } },
  swabb: { name: 'Dr. Swabb', color: C.mint, look: { skin: SKIN[2], hair: HAIR[4], style: 'short', hat: 'none', top: C.mint, bottom: C.mint } },
  steward: { name: 'A steward', color: C.white, look: { skin: SKIN[3], hair: HAIR[0], style: 'short', hat: 'none', top: C.white, bottom: C.navy } },
  iguana: { name: 'An iguana', color: INK.queasyGreen, look: {} },
};

// Someone from the cast at p (in the zone's own units), their face as green as they are.
export function drawCast(ctx, id, p, t) {
  if (id === 'iguana') return iguana(ctx, p.x, p.y, p.z, p.dir, t);
  const c = CAST[id];
  const look = { ...c.look, ...(COSTUME[id] || {}) };
  const k = sickness(id, t);
  // (A dress shows skin for legs; nobody should go green from the ankles up.)
  if (k > 0 && look.dress) { look.dress = false; look.bottom = look.top; }
  look.skin = queasy(look.skin, k);
  person(ctx, p.x, p.y, p.z, { ...look, pose: p.pose || (p.moving ? 'walk' : 'stand'), dir: p.dir, back: p.back, scale: look.scale }, t);
}

// The iguana: long, low, green, with a tail. (A greybox sketch; the art redraws it.)
export function iguana(ctx, x, y, z, dir = 'r', t = 0) {
  const X = x - y, Y = (x + y) / 2 - z * ZK;
  const s = dir === 'l' ? -1 : 1;
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(s, 1);
  ctx.beginPath();
  ctx.ellipse(0, -0.25, 0.55, 0.2, 0, 0, Math.PI * 2);
  paint(ctx, INK.queasyGreen, { lw: 0.05 });
  ctx.beginPath();
  ctx.ellipse(0.62, -0.32, 0.2, 0.13, 0, 0, Math.PI * 2);
  paint(ctx, INK.queasyGreen, { lw: 0.05 });
  const wag = Math.sin(t * 2) * 0.15;
  ctx.beginPath();
  ctx.moveTo(-0.5, -0.25);
  ctx.quadraticCurveTo(-0.95, -0.2 + wag, -1.3, -0.05);
  ctx.lineWidth = 0.1;
  ctx.strokeStyle = shade(INK.queasyGreen, 0.2);
  ctx.stroke();
  ctx.restore();
}

// The ship's lift, on every deck: its doors on the far wall, with the deck
// number over them. side: 'right' (the far wall).
export const LIFT_COLORS = { plate: C.greyLight, ink: C.ink };

// Names only show when you're close enough to read them.
export const readable = () => Q.detail && Q.pxPerUnit >= 14;

// ---------- Costumes ----------
// What makes the cast who they are, drawn over the plain person (wear: over
// the torso; face: over the head). Pidge is the Manor's Pidge, on holiday.
const OUTLINE = { lw: 0.03 };
export const COSTUME = {
  pidge: {
    wear(ctx, b) { // a pigeon's shimmering neck, and the trench coat's belt
      ctx.beginPath();
      ctx.ellipse(0.02, b.top + 0.02, 0.27, 0.09, 0, 0, Math.PI * 2);
      paint(ctx, C.teal, { ...OUTLINE, dots: C.purple, density: 0.35 });
      ctx.beginPath();
      ctx.rect(-0.28, b.hipY - 0.34, 0.56, 0.07);
      paint(ctx, shade(C.wood, 0.35), { stroke: false });
    },
    face(ctx, hy, back) { // beak, a pigeon's orange eye, and a sun hat
      if (!back) {
        ctx.beginPath();
        ctx.arc(0.24, hy + 0.02, 0.055, 0, Math.PI * 2);
        ctx.fillStyle = C.coral;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0.245, hy + 0.02, 0.028, 0, Math.PI * 2);
        ctx.fillStyle = C.ink;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0.3, hy + 0.0); ctx.lineTo(0.54, hy + 0.08); ctx.lineTo(0.3, hy + 0.13);
        ctx.closePath();
        paint(ctx, shade(C.grey, 0.55), OUTLINE);
      }
      ctx.beginPath();
      ctx.ellipse(0.02, hy - 0.2, 0.5, 0.1, 0, 0, Math.PI * 2);
      paint(ctx, C.butter, OUTLINE);
      ctx.beginPath();
      ctx.ellipse(0.02, hy - 0.3, 0.24, 0.14, 0, Math.PI, 0);
      paint(ctx, C.butter, OUTLINE);
      ctx.fillStyle = INK.flamingo;
      ctx.fillRect(-0.22, hy - 0.28, 0.48, 0.06);
    },
  },
  captain: {
    face(ctx, hy) { // a white peaked cap with gold braid
      ctx.beginPath();
      ctx.ellipse(0.02, hy - 0.24, 0.32, 0.12, 0, 0, Math.PI * 2);
      paint(ctx, C.white, OUTLINE);
      ctx.beginPath();
      ctx.ellipse(0.28, hy - 0.16, 0.16, 0.045, 0.2, 0, Math.PI * 2);
      paint(ctx, C.black, OUTLINE);
      ctx.fillStyle = MAT.brass;
      ctx.fillRect(-0.2, hy - 0.2, 0.44, 0.05);
    },
  },
};
