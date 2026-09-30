// All You Can Eat: the style sheet. Every area takes its colors, the day's
// clock and who's green from here, so the whole ship stays one plate and one
// story. The inks come from the brief (docs/levels/cruise.md, "Palette and plate").
import { C, Q, mix, tint, shade, alpha, person, SKIN, HAIR, paint } from '../../engine/art.js';
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
// Everyone on the day's clock (day.js), their name and look. The look is the
// plain person; COSTUME (below) is what makes them who they are.
export const CAST = {
  pidge: { name: 'Inspector Pidge', color: C.grey, look: { skin: C.grey, hair: C.grey, style: 'bald', hat: 'none', top: C.wood, bottom: C.pink } },
  doreen: { name: 'Doreen', color: INK.flamingo, look: { skin: SKIN[5], hair: HAIR[4], style: 'curly', hat: 'none', top: INK.flamingo, bottom: C.white, shoes: C.white } },
  chad: { name: 'Chad', color: C.coral, look: { skin: SKIN[1], hair: HAIR[3], style: 'short', hat: 'none', top: C.coral, bottom: C.teal, shoes: C.sky } },
  gloria: { name: 'Gloria', color: C.white, look: { skin: SKIN[2], hair: HAIR[0], style: 'bald', hat: 'none', top: C.white, bottom: C.white, shoes: C.blush } },
  captain: { name: 'Captain Stubbs', color: C.white, look: { skin: SKIN[0], hair: HAIR[4], style: 'short', hat: 'none', top: C.white, bottom: C.white } },
  chef: { name: 'Chef Gaston', color: C.white, look: { skin: SKIN[3], hair: HAIR[1], style: 'short', hat: 'none', top: C.white, bottom: C.ink } },
  tyler: { name: 'Tyler', color: C.sky, look: { skin: SKIN[0], hair: HAIR[5], style: 'short', hat: 'none', top: C.sky, bottom: C.navy, shoes: C.coral, scale: 0.7 } },
  brenda: { name: 'Brenda', color: C.purple, look: { skin: SKIN[1], hair: HAIR[2], style: 'long', hat: 'none', top: C.purple, bottom: C.purple, shoes: C.mustard } },
  ray: { name: 'Ray', color: C.mustard, look: { skin: SKIN[0], hair: HAIR[6], style: 'bald', hat: 'none', top: C.mustard, bottom: C.tealLight } },
  kelly: { name: 'Kelly', color: INK.sunYellow, look: { skin: SKIN[4], hair: HAIR[0], style: 'pony', hat: 'none', top: INK.sunYellow, bottom: C.navy } },
  swabb: { name: 'Dr. Swabb', color: C.mint, look: { skin: SKIN[2], hair: HAIR[4], style: 'short', hat: 'none', top: C.white, bottom: C.mint } },
  steward: { name: 'A steward', color: C.white, look: { skin: SKIN[3], hair: HAIR[0], style: 'short', hat: 'none', top: C.white, bottom: C.navy } },
  iguana: { name: 'An iguana', color: INK.queasyGreen, look: {} },
};

// Chad's ride home: from 11am, while he's moving, a steward carries him to
// cabin 12 (day.js has him at the steward's pace); after 3:30 he walks back.
const carried = (p, t) => p.moving && wrap(t) >= at(11) && wrap(t) < at(15.5);
// The steward's arms are full for the same trip, until he's back out of cabin 12.
const carrying = (p, t) => p.moving && wrap(t) >= at(11) && wrap(t) < at(13.6);
// The iguana is on its lounger from when it gets to the pool until 4pm: still,
// and not at the end of the day (it stands by the buffet then).
const lounging = (p, t) => !p.moving && wrap(t) > 1 && wrap(t) <= at(16);

// Everything person() needs to draw someone from the cast, in costume, at t
// (which also decides how green they are). p: where and how, as a walker
// gives it. The case file's portraits use this too.
export function dressed(id, t, p = {}) {
  const c = CAST[id], k = COSTUME[id] || {};
  const look = { ...c.look, ...k };
  const sick = sickness(id, t);
  look.skin = k.tone ? k.tone(c.look.skin, t) : queasy(c.look.skin, sick);
  // (A dress shows skin for legs; nobody should go green from the ankles up.)
  if (sick > 0 && look.dress) { look.dress = false; look.bottom = look.top; }
  // Bare arms and legs go as green as the face does.
  for (const part of k.bare || []) look[part] = look.skin;
  let pose = p.pose || (p.moving ? 'walk' : 'stand');
  if (pose === 'stand' && k.still) pose = k.still;
  const arms = typeof k.arms === 'function' ? k.arms(t) : k.arms;
  return { ...look, arms: arms || undefined, pose, dir: p.dir, back: p.back, scale: look.scale };
}

// Someone from the cast at p (in the zone's own units), their face as green as they are.
export function drawCast(ctx, id, p, t) {
  if (id === 'iguana') {
    if (!lounging(p, t)) return iguana(ctx, p.x, p.y, p.z, p.dir, t, { moving: p.moving });
    // Stretched out on its lounger (the pool's, just behind where it stops),
    // head up by the back rest: sunglasses on, and after the verdict a towel.
    return iguana(ctx, p.x + 0.5, p.y + 0.75, p.z + 0.5, 'r', t, { lounge: true, towel: verdict.solved != null });
  }
  const o = dressed(id, t, p);
  let z = p.z;
  if (id === 'chad' && carried(p, t)) {
    // Carried home flat, still toasting: a second steward under him holds him
    // up overhead (the one on the clock walks just ahead), his middle over
    // the steward's hands, like a crowd-surfer leaving the party.
    const s = dressed('steward', t, p);
    s.arms = [2.95, 2.75];
    s.face = null;
    person(ctx, p.x, p.y, p.z, s, t);
    o.pose = 'lie';
    const X = p.x - p.y, Y = (p.x + p.y) / 2 - p.z * ZK, f = p.dir === 'l' ? -1 : 1;
    ctx.save();
    ctx.translate(X + f * 0.85, Y - 2.05);
    person(ctx, 0, 0, 0, o, t);
    ctx.restore();
    return;
  }
  if (id === 'steward' && carrying(p, t)) {
    o.arms = [1.35, 1.2];
    o.face = (c, hy) => stewardTowel(c, hy, 1.35);
  }
  person(ctx, p.x, p.y, z, o, t);
}

// How high a name tag floats over someone (a child is shorter, a chef's hat taller).
export function headroom(id, p) {
  if (id === 'iguana') return 1;
  const s = CAST[id].look.scale || 1;
  return (p.pose === 'sit' ? 2.3 : 2.9) * s + (id === 'chef' ? 0.6 : 0);
}

// ---------- The iguana ----------
// A proper green iguana, about 1.5 long nose to tail, in profile: crest down
// its back, a dewlap, a banded tail with a curl. It sways as it walks and does
// the head bob when it stops. o: { moving, lounge (sunglasses, lying flat on
// its lounger), shades (sunglasses anyway), towel (a beach towel over it,
// tail and nose out) }.
const IG = { skin: INK.queasyGreen, dark: shade(INK.queasyGreen, 0.35), pale: tint(INK.queasyGreen, 0.45) };

// A tapering tail along a cubic curve, as one filled shape.
function tail(ctx, pts, w0, w1, sw) {
  const [a, b, c, d] = pts;
  const n = 12, L = [], R = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, v = 1 - u;
    const x = v * v * v * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u * u * u * d[0];
    const y = v * v * v * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u * u * u * d[1] + sw * u * u;
    L.push([x, y]);
  }
  for (let i = 0; i <= n; i++) {
    const p0 = L[Math.max(0, i - 1)], p1 = L[Math.min(n, i + 1)];
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], len = Math.hypot(dx, dy) || 1;
    const w = w0 + (w1 - w0) * (i / n);
    R.push([L[i][0] - (dy / len) * w, L[i][1] + (dx / len) * w, L[i][0] + (dy / len) * w, L[i][1] - (dx / len) * w, dx / len, dy / len]);
  }
  ctx.beginPath();
  R.forEach((r, i) => (i ? ctx.lineTo(r[0], r[1]) : ctx.moveTo(r[0], r[1])));
  for (let i = n; i >= 0; i--) ctx.lineTo(R[i][2], R[i][3]);
  ctx.closePath();
  paint(ctx, IG.skin, { lw: 0.035 });
  if (!Q.detail) return;
  // Dark bands down the tail.
  ctx.strokeStyle = IG.dark;
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  for (const i of [3, 5, 7, 9]) { ctx.moveTo(R[i][0], R[i][1]); ctx.lineTo(R[i][2], R[i][3]); }
  ctx.stroke();
}

// A leg: shoulder to a splayed foot, with toes. far legs are darker.
function lizardLeg(ctx, x, y, fx, fy, far) {
  const ex = (x + fx) / 2 + 0.05, ey = Math.min(y, fy) + 0.03;
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.quadraticCurveTo(ex, ey + 0.1, fx, fy);
  ctx.lineCap = 'round';
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.13; ctx.stroke(); }
  ctx.strokeStyle = far ? IG.dark : IG.skin;
  ctx.lineWidth = 0.08;
  ctx.stroke();
  if (!Q.detail) return;
  ctx.beginPath();
  ctx.moveTo(fx, fy); ctx.lineTo(fx + 0.1, fy + 0.01);
  ctx.moveTo(fx, fy); ctx.lineTo(fx + 0.08, fy - 0.05);
  ctx.moveTo(fx, fy); ctx.lineTo(fx - 0.06, fy + 0.02);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.025;
  ctx.stroke();
}

export function iguana(ctx, x, y, z, dir = 'r', t = 0, o = {}) {
  const X = x - y, Y = (x + y) / 2 - z * ZK;
  const walk = !!o.moving, lounge = !!o.lounge;
  const ph = t * 7;
  ctx.save();
  ctx.translate(X, Y);
  // On the lounger it lies along it, head up the slope toward the back rest.
  if (lounge) ctx.rotate(-0.46);
  ctx.scale(dir === 'l' ? -1 : 1, 1);
  if (Q.detail && !lounge) {
    ctx.beginPath();
    ctx.ellipse(-0.15, 0, 0.75, 0.14, 0, 0, Math.PI * 2);
    ctx.fillStyle = alpha(C.ink, 0.16);
    ctx.fill();
  }
  // The walk: legs in diagonal pairs, the body rocking, the tail swinging.
  const sw = walk ? Math.sin(ph) : 0;
  const rock = walk ? sw * 0.035 : 0;
  // The head bob, when it stops: two nods every few seconds.
  const cyc = (t * 0.45) % 1;
  const nod = !walk && !lounge && cyc < 0.2 ? Math.abs(Math.sin((cyc / 0.2) * Math.PI * 2)) * 0.07 : 0;
  const low = lounge ? 0.1 : 0; // lying flat, belly down
  const step = (k) => (walk ? Math.sin(ph + k) * 0.09 : 0);
  const up = (k) => (walk ? Math.max(0, Math.cos(ph + k)) * 0.05 : 0);
  // Far legs, behind the body.
  if (lounge) {
    lizardLeg(ctx, 0.1, -0.12, 0.3, -0.02, true);
    lizardLeg(ctx, -0.26, -0.12, -0.1, -0.02, true);
  } else {
    lizardLeg(ctx, 0.12, -0.15, 0.22 + step(Math.PI), -up(Math.PI), true);
    lizardLeg(ctx, -0.22, -0.16, -0.14 + step(0), -up(0), true);
  }
  ctx.save();
  ctx.translate(0, low);
  ctx.rotate(rock);
  // The tail: long, banded, curling up at the tip (it droops over the end of a lounger).
  const tw = walk ? Math.sin(ph * 0.5) * 0.08 : Math.sin(t * 0.8) * 0.03;
  if (lounge) tail(ctx, [[-0.3, -0.24], [-0.65, -0.2], [-0.95, -0.12], [-1.05, 0.12]], 0.075, 0.012, tw);
  else tail(ctx, [[-0.3, -0.24], [-0.72, -0.04], [-1.12, 0.0], [-1.0, -0.26]], 0.075, 0.012, tw);
  // The body.
  ctx.beginPath();
  ctx.moveTo(0.3, -0.33);
  ctx.bezierCurveTo(0.1, -0.45, -0.24, -0.42, -0.36, -0.27);
  ctx.bezierCurveTo(-0.3, -0.1, 0.05, -0.08, 0.3, -0.15);
  ctx.closePath();
  paint(ctx, IG.skin, { lw: 0.035, dots: shade(IG.skin, 0.4), density: 0.14 });
  if (Q.detail) {
    // A few dark bands across its back.
    ctx.strokeStyle = IG.dark;
    ctx.lineWidth = 0.035;
    ctx.beginPath();
    for (const bx of [-0.2, -0.05, 0.1]) { ctx.moveTo(bx, -0.4); ctx.quadraticCurveTo(bx - 0.03, -0.3, bx + 0.01, -0.2); }
    ctx.stroke();
  }
  // The crest: spikes down the back, biggest at the neck.
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const u = i / 7;
    const bx = 0.3 - u * 0.62, by = -0.4 - Math.sin(u * Math.PI) * 0.035 + u * 0.08;
    const h = 0.1 - u * 0.065;
    ctx.moveTo(bx + 0.04, by + 0.02); ctx.lineTo(bx - 0.01, by - h); ctx.lineTo(bx - 0.045, by + 0.025);
  }
  paint(ctx, IG.dark, { lw: 0.02 });
  // The head, bobbing, and the dewlap under it.
  ctx.save();
  ctx.translate(0, -nod + (lounge ? -0.04 : 0));
  if (lounge) ctx.rotate(-0.08);
  ctx.beginPath();
  ctx.moveTo(0.46, -0.23);
  ctx.quadraticCurveTo(0.43, -0.04 + nod * 0.5, 0.26, -0.13);
  ctx.lineTo(0.32, -0.2);
  ctx.closePath();
  paint(ctx, IG.pale, { lw: 0.025 });
  ctx.beginPath();
  ctx.moveTo(0.24, -0.38);
  ctx.bezierCurveTo(0.36, -0.47, 0.55, -0.43, 0.64, -0.33);
  ctx.bezierCurveTo(0.67, -0.27, 0.61, -0.22, 0.5, -0.22);
  ctx.lineTo(0.28, -0.16);
  ctx.closePath();
  paint(ctx, IG.skin, { lw: 0.035 });
  if (Q.detail) {
    // The big round scale under its ear, a smug mouth, a nostril.
    ctx.beginPath();
    ctx.arc(0.33, -0.27, 0.05, 0, Math.PI * 2);
    paint(ctx, IG.pale, { lw: 0.02 });
    ctx.beginPath();
    ctx.moveTo(0.64, -0.28); ctx.quadraticCurveTo(0.55, -0.25, 0.44, -0.28);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.02;
    ctx.stroke();
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(0.6, -0.34, 0.012, 0, Math.PI * 2);
    ctx.fill();
  }
  if (lounge || o.shades) {
    // Sunglasses: it's on holiday too.
    ctx.beginPath();
    ctx.roundRect(0.4, -0.39, 0.15, 0.08, 0.03);
    ctx.moveTo(0.4, -0.36); ctx.lineTo(0.27, -0.38);
    ctx.fillStyle = C.black;
    ctx.fill();
    ctx.strokeStyle = C.black;
    ctx.lineWidth = 0.025;
    ctx.stroke();
    if (Q.detail) {
      ctx.fillStyle = alpha(C.white, 0.7);
      ctx.fillRect(0.43, -0.38, 0.05, 0.015);
    }
  } else {
    ctx.beginPath();
    ctx.arc(0.46, -0.34, 0.04, 0, Math.PI * 2);
    ctx.fillStyle = C.coral;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0.465, -0.34, 0.022, 0, Math.PI * 2);
    ctx.fillStyle = C.ink;
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
  // Near legs, over the body.
  if (lounge) {
    lizardLeg(ctx, 0.16, -0.1, 0.38, 0.0, false);
    lizardLeg(ctx, -0.2, -0.1, -0.02, 0.0, false);
  } else {
    lizardLeg(ctx, 0.18, -0.15 + rock, 0.28 + step(0), -up(0), false);
    lizardLeg(ctx, -0.16, -0.16 - rock, -0.08 + step(Math.PI), -up(Math.PI), false);
  }
  if (o.towel) {
    // A striped beach towel over all of it but the tail and the nose.
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-0.42, 0.04);
    ctx.bezierCurveTo(-0.46, -0.4, -0.1, -0.56, 0.2, -0.52);
    ctx.bezierCurveTo(0.44, -0.5, 0.56, -0.42, 0.55, -0.2);
    ctx.lineTo(0.5, 0.06);
    ctx.lineTo(0.3, 0.0); ctx.lineTo(0.1, 0.07); ctx.lineTo(-0.1, 0.0); ctx.lineTo(-0.28, 0.07);
    ctx.closePath();
    ctx.fillStyle = INK.sunYellow;
    ctx.fill();
    if (Q.detail) {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = INK.flamingo;
      for (let sx = -0.42; sx < 0.6; sx += 0.2) ctx.fillRect(sx, -0.6, 0.09, 0.7);
      ctx.restore();
    }
    paint(ctx, null, { lw: 0.03 });
    ctx.restore();
  }
  ctx.restore();
}

// The ship's lift, on every deck: its doors on the far wall, with the deck
// number over them. side: 'right' (the far wall).
export const LIFT_COLORS = { plate: C.greyLight, ink: C.ink };

// Names only show when you're close enough to read them.
export const readable = () => Q.detail && Q.pxPerUnit >= 14;

// ---------- Costumes ----------
// What makes the cast who they are, drawn over the plain person. person()
// draws in its own units: feet at 0, hips at -0.8, shoulders at -1.53, the
// head's middle at hy (-1.95), facing +x. wear: over the torso; face: over
// everything (so it's where hand-held things go, over the hand); hold: behind
// the near arm (translated to 0.35, -1.23; HELD undoes that). arms: [near,
// far], radians from straight down, fixed so a held thing stays in the hand.
// still: the pose when they're standing. bare: parts that are skin (and go
// green with the face). tone(skin, t): a face that isn't sickness.
const OUTLINE = { lw: 0.03 };
const SHOULDER = 0.42; // shoulders are this far below hy
const HELD = [-0.35, 1.23];
// Where a hand is, for an arm at angle a (the near arm at x 0.22, the far at -0.22).
const hand = (a, hy, far) => [(far ? -0.22 : 0.22) + Math.sin(a) * 0.72, hy + SHOULDER + Math.cos(a) * 0.72];

// A Green Mermaid: a tall glass of queasy green with a paper umbrella and a
// straw, standing on (x, y).
function mermaid(ctx, x, y) {
  ctx.beginPath();
  ctx.moveTo(x - 0.09, y - 0.4); ctx.lineTo(x - 0.06, y); ctx.lineTo(x + 0.06, y); ctx.lineTo(x + 0.09, y - 0.4);
  ctx.closePath();
  paint(ctx, INK.queasyGreen, { lw: 0.025 });
  if (!Q.detail) return;
  ctx.beginPath();
  ctx.moveTo(x - 0.03, y - 0.38); ctx.lineTo(x - 0.09, y - 0.6);
  ctx.moveTo(x + 0.02, y - 0.38); ctx.lineTo(x + 0.1, y - 0.58);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.02;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 0.04, y - 0.57); ctx.quadraticCurveTo(x + 0.1, y - 0.72, x + 0.24, y - 0.56);
  ctx.closePath();
  paint(ctx, INK.flamingo, { lw: 0.02 });
}

// A little flower for a loud shirt.
function flower(ctx, x, y, r, petal, middle) {
  ctx.fillStyle = petal;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.8, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.fillStyle = middle;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
  ctx.fill();
}

// A cap's dome on the head; the brim goes where it's pointing (+1 front, -1 back).
function cap(ctx, hy, color, way) {
  ctx.beginPath();
  ctx.arc(0.02, hy - 0.08, 0.32, Math.PI, 0);
  ctx.closePath();
  paint(ctx, color, OUTLINE);
  ctx.beginPath();
  if (way > 0) ctx.rect(0.1, hy - 0.11, 0.4, 0.07);
  else ctx.rect(-0.46, hy - 0.11, 0.4, 0.07);
  paint(ctx, shade(color, 0.2), OUTLINE);
}

// Brass buttons down a jacket front.
function buttons(ctx, b, n, x = 0.14, color = MAT.brass) {
  if (b.back || !Q.detail) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    ctx.moveTo(x + 0.035, b.top + 0.18 + i * 0.16);
    ctx.arc(x, b.top + 0.18 + i * 0.16, 0.035, 0, Math.PI * 2);
  }
  ctx.fill();
}

export const COSTUME = {
  // The Manor's pigeon, on holiday: a Hawaiian shirt under the trench coat,
  // the sun hat, and the notebook, taking notes.
  pidge: {
    arms: [0.95, 0.3],
    wear(ctx, b) {
      // The coat's skirt, over the tops of his legs.
      ctx.beginPath();
      ctx.moveTo(-0.29, b.hipY - 0.1); ctx.lineTo(0.29, b.hipY - 0.1); ctx.lineTo(0.36, b.hipY + 0.36); ctx.lineTo(-0.36, b.hipY + 0.36);
      ctx.closePath();
      paint(ctx, C.wood, OUTLINE);
      if (!b.back) {
        // The shirt, loud, showing between the lapels.
        ctx.beginPath();
        ctx.moveTo(-0.08, b.top + 0.04); ctx.lineTo(0.24, b.top + 0.04); ctx.lineTo(0.14, b.hipY - 0.3); ctx.lineTo(0.02, b.hipY - 0.3);
        ctx.closePath();
        paint(ctx, INK.flamingo, OUTLINE);
        if (Q.detail) {
          flower(ctx, 0.1, b.top + 0.2, 0.035, INK.sunYellow, C.white);
          flower(ctx, 0.06, b.top + 0.44, 0.03, INK.sunYellow, C.white);
          flower(ctx, 0.16, b.top + 0.36, 0.025, C.white, INK.sunYellow);
        }
        // Lapels.
        ctx.beginPath();
        ctx.moveTo(-0.08, b.top + 0.04); ctx.lineTo(-0.02, b.top + 0.34); ctx.lineTo(0.04, b.top + 0.12);
        ctx.moveTo(0.24, b.top + 0.04); ctx.lineTo(0.18, b.top + 0.34); ctx.lineTo(0.16, b.top + 0.12);
        paint(ctx, shade(C.wood, 0.15), OUTLINE);
      }
      // A pigeon's shimmering neck, and the coat's belt.
      ctx.beginPath();
      ctx.ellipse(0.02, b.top + 0.02, 0.27, 0.09, 0, 0, Math.PI * 2);
      paint(ctx, C.teal, { ...OUTLINE, dots: C.purple, density: 0.35 });
      ctx.beginPath();
      ctx.rect(-0.28, b.hipY - 0.34, 0.56, 0.07);
      paint(ctx, shade(C.wood, 0.35), { stroke: false });
    },
    face(ctx, hy, back) { // beak, a pigeon's orange eye, the sun hat, the notebook
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
      // The notebook, open in his hand.
      const [hx, hy2] = hand(0.95, hy);
      ctx.beginPath();
      ctx.rect(hx - 0.16, hy2 - 0.3, 0.22, 0.3);
      paint(ctx, C.white, OUTLINE);
      if (Q.detail) {
        ctx.fillStyle = C.coral;
        ctx.fillRect(hx - 0.16, hy2 - 0.32, 0.22, 0.05);
        ctx.fillStyle = C.grey;
        for (let i = 0; i < 3; i++) ctx.fillRect(hx - 0.12, hy2 - 0.2 + i * 0.06, 0.14, 0.015);
      }
    },
  },

  // A retiree in a visor and a cardigan, and a plate she's been building since 7.
  doreen: {
    arms: [1.15, 0.95],
    wear(ctx, b) {
      if (b.back) return;
      // Her blouse, between the cardigan's fronts, and the cardigan's buttons.
      ctx.beginPath();
      ctx.moveTo(0.0, b.top + 0.02); ctx.lineTo(0.2, b.top + 0.02); ctx.lineTo(0.14, b.hipY - 0.05); ctx.lineTo(0.06, b.hipY - 0.05);
      ctx.closePath();
      paint(ctx, C.white, OUTLINE);
      buttons(ctx, b, 4, 0.2, C.butter);
    },
    face(ctx, hy, back, t) {
      // The visor: a band round her curls and a brim out front.
      ctx.fillStyle = C.tealLight;
      ctx.fillRect(-0.3, hy - 0.2, 0.62, 0.07);
      if (!back) {
        ctx.beginPath();
        ctx.moveTo(0.26, hy - 0.2); ctx.quadraticCurveTo(0.5, hy - 0.2, 0.6, hy - 0.1); ctx.lineTo(0.28, hy - 0.12);
        ctx.closePath();
        paint(ctx, C.tealLight, OUTLINE);
      }
      // The plate, piled high, wobbling a little.
      const [hx, hy2] = hand(1.15, hy);
      ctx.save();
      ctx.translate(hx - 0.14, hy2 - 0.05);
      ctx.rotate(Math.sin(t * 2.3) * 0.05);
      const blob = (x, y, rx, ry, color) => {
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        paint(ctx, color, { lw: 0.02 });
      };
      blob(0, 0, 0.4, 0.08, C.white);
      blob(-0.18, -0.1, 0.14, 0.09, C.woodLight); // a roll
      blob(0.14, -0.1, 0.16, 0.1, C.leaf); // salad, for balance
      blob(-0.02, -0.22, 0.2, 0.11, INK.sunYellow); // mac and cheese
      if (Q.detail) {
        ctx.beginPath(); // shrimp
        ctx.arc(0.14, -0.3, 0.06, 0.3, Math.PI + 0.5);
        ctx.moveTo(-0.08, -0.34); ctx.arc(-0.14, -0.33, 0.06, 0.3, Math.PI + 0.5);
        ctx.strokeStyle = C.coral;
        ctx.lineWidth = 0.05;
        ctx.stroke();
      }
      blob(0.0, -0.38, 0.12, 0.08, C.red); // jelly
      blob(0.02, -0.5, 0.07, 0.06, INK.flamingo); // a melon ball on top
      if (Q.detail) { // and a toothpick flag
        ctx.beginPath();
        ctx.moveTo(0.02, -0.52); ctx.lineTo(0.02, -0.72);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02; ctx.stroke();
        ctx.fillStyle = INK.funnelRed;
        ctx.fillRect(0.02, -0.72, 0.1, 0.06);
      }
      ctx.restore();
    },
  },

  // A spring breaker in October: a backwards cap, a vest, a Green Mermaid in
  // each hand (one raised, always).
  chad: {
    bare: ['top', 'bottom'],
    arms: [2.3, -0.55],
    wear(ctx, b, t) {
      // The vest: a coral singlet with a white stripe.
      ctx.beginPath();
      ctx.moveTo(-0.28, b.top + 0.18); ctx.lineTo(-0.18, b.top + 0.02); ctx.lineTo(-0.1, b.top + 0.02);
      ctx.quadraticCurveTo(0.02, b.top + 0.22, 0.14, b.top + 0.02); ctx.lineTo(0.22, b.top + 0.02); ctx.lineTo(0.28, b.top + 0.18);
      ctx.lineTo(0.28, b.hipY); ctx.lineTo(-0.28, b.hipY);
      ctx.closePath();
      paint(ctx, C.coral, OUTLINE);
      if (Q.detail) {
        ctx.fillStyle = C.white;
        ctx.fillRect(-0.28, b.top + 0.4, 0.56, 0.07);
      }
      // Board shorts, baggy, with hibiscus.
      ctx.beginPath();
      ctx.moveTo(-0.3, b.hipY - 0.06); ctx.lineTo(0.3, b.hipY - 0.06); ctx.lineTo(0.33, b.hipY + 0.36); ctx.lineTo(-0.33, b.hipY + 0.36);
      ctx.closePath();
      paint(ctx, C.teal, { ...OUTLINE, dots: INK.flamingo, density: 0.35 });
      // The Green Mermaid in his other hand, behind him.
      const [fx, fy] = hand(-0.55, b.top - 0.3, true);
      mermaid(ctx, fx, fy + 0.16);
    },
    face(ctx, hy, back) {
      cap(ctx, hy, INK.sunYellow, -1);
      // The raised one.
      const [hx, hy2] = hand(2.3, hy);
      mermaid(ctx, hx, hy2 + 0.16);
    },
  },

  // Lives at the spa: a white robe, a towel turban, and until 11am a cucumber
  // mask (after it, very pink).
  gloria: {
    tone: (skin, t) => (wrap(t) < at(11) ? skin : mix(skin, INK.flamingo, 0.55)),
    wear(ctx, b) {
      // The robe, down to her calves, in towelling.
      ctx.beginPath();
      ctx.moveTo(-0.29, b.hipY - 0.12); ctx.lineTo(0.29, b.hipY - 0.12); ctx.lineTo(0.38, b.hipY + 0.55); ctx.lineTo(-0.38, b.hipY + 0.55);
      ctx.closePath();
      paint(ctx, C.white, { ...OUTLINE, dots: C.greyLight, density: 0.3 });
      // The belt, tied, and its ends.
      ctx.fillStyle = C.greyLight;
      ctx.fillRect(-0.28, b.hipY - 0.3, 0.56, 0.07);
      if (!b.back) {
        ctx.beginPath();
        ctx.moveTo(0.14, b.hipY - 0.26); ctx.lineTo(0.2, b.hipY + 0.05);
        ctx.moveTo(0.14, b.hipY - 0.26); ctx.lineTo(0.08, b.hipY + 0.02);
        ctx.strokeStyle = C.greyLight; ctx.lineWidth = 0.05; ctx.stroke();
        // The shawl collar, crossing over.
        ctx.beginPath();
        ctx.moveTo(-0.1, b.top + 0.02); ctx.lineTo(0.14, b.hipY - 0.3); ctx.moveTo(0.24, b.top + 0.04); ctx.lineTo(0.12, b.top + 0.3);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.stroke();
      }
    },
    face(ctx, hy, back, t) {
      if (!back && wrap(t) < at(11)) {
        // The mask, queasy green, and a cucumber slice on each eye.
        ctx.beginPath();
        ctx.moveTo(0.02, hy);
        ctx.arc(0.02, hy, 0.29, -1.7, 2.1);
        ctx.closePath();
        ctx.fillStyle = INK.queasyGreen;
        ctx.fill();
        for (const ex of [0.1, 0.25]) {
          ctx.beginPath();
          ctx.arc(ex, hy + 0.01, 0.07, 0, Math.PI * 2);
          paint(ctx, C.mint, { lw: 0.03, stroke: C.green });
        }
      }
      // The towel turban: three twists, piled up and leaning back.
      for (const [tx, ty, rx, ry, a] of [[0.0, -0.2, 0.37, 0.15, -0.05], [-0.05, -0.36, 0.33, 0.14, -0.18], [-0.12, -0.52, 0.25, 0.12, -0.35]]) {
        ctx.beginPath();
        ctx.ellipse(tx, hy + ty, rx, ry, a, 0, Math.PI * 2);
        paint(ctx, C.mint, OUTLINE);
      }
      if (Q.detail) {
        ctx.beginPath();
        ctx.moveTo(-0.3, hy - 0.2); ctx.quadraticCurveTo(0.0, hy - 0.3, 0.26, hy - 0.4);
        ctx.moveTo(-0.3, hy - 0.4); ctx.quadraticCurveTo(-0.08, hy - 0.46, 0.08, hy - 0.58);
        ctx.strokeStyle = INK.sea; ctx.lineWidth = 0.03; ctx.stroke();
      }
    },
  },

  // White uniform, epaulettes, the peaked cap and a green face. (His bucket
  // stays on the deck by the wheel: it's evidence, and one bucket is enough.)
  captain: {
    arms: [0.25, -0.1],
    wear(ctx, b) {
      buttons(ctx, b, 4, 0.14);
      // Epaulettes, gold, with a fringe.
      ctx.beginPath();
      ctx.ellipse(0.1, b.top + 0.05, 0.17, 0.06, 0, 0, Math.PI * 2);
      paint(ctx, MAT.brass, OUTLINE);
      if (Q.detail) {
        ctx.strokeStyle = MAT.brass;
        ctx.lineWidth = 0.02;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) { ctx.moveTo(-0.02 + i * 0.06, b.top + 0.1); ctx.lineTo(-0.02 + i * 0.06, b.top + 0.18); }
        ctx.stroke();
      }
    },
    face(ctx, hy, back) {
      if (!back) { // a neat grey beard
        ctx.beginPath();
        ctx.moveTo(-0.05, hy + 0.06); ctx.quadraticCurveTo(0.0, hy + 0.36, 0.2, hy + 0.35);
        ctx.quadraticCurveTo(0.34, hy + 0.32, 0.34, hy + 0.14); ctx.quadraticCurveTo(0.2, hy + 0.2, 0.08, hy + 0.12);
        ctx.closePath();
        paint(ctx, C.greyLight, OUTLINE);
      }
      // The white peaked cap with gold braid.
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

  // A tall chef's hat, a curly moustache, and a carving knife, raised.
  chef: {
    arms: [1.9, 0.5],
    wear(ctx, b) {
      if (b.back) return;
      buttons(ctx, b, 3, 0.04, C.ink);
      buttons(ctx, b, 3, 0.18, C.ink);
      // A red neckerchief.
      ctx.beginPath();
      ctx.moveTo(-0.14, b.top + 0.02); ctx.lineTo(0.24, b.top + 0.02); ctx.lineTo(0.08, b.top + 0.2);
      ctx.closePath();
      paint(ctx, INK.funnelRed, OUTLINE);
    },
    face(ctx, hy, back) {
      if (!back) { // the moustache, curled at both ends
        ctx.beginPath();
        ctx.moveTo(0.3, hy + 0.13);
        ctx.quadraticCurveTo(0.46, hy + 0.18, 0.5, hy + 0.06);
        ctx.quadraticCurveTo(0.48, hy + 0.02, 0.45, hy + 0.06);
        ctx.moveTo(0.3, hy + 0.13);
        ctx.quadraticCurveTo(0.14, hy + 0.2, 0.1, hy + 0.08);
        ctx.quadraticCurveTo(0.12, hy + 0.04, 0.15, hy + 0.08);
        ctx.strokeStyle = HAIR[1];
        ctx.lineWidth = 0.06;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      // The toque: tall, pleated, puffed on top.
      ctx.beginPath();
      ctx.moveTo(-0.24, hy - 0.2); ctx.lineTo(-0.28, hy - 0.9); ctx.lineTo(0.32, hy - 0.9); ctx.lineTo(0.28, hy - 0.2);
      ctx.closePath();
      paint(ctx, C.white, OUTLINE);
      ctx.beginPath();
      ctx.arc(-0.16, hy - 0.95, 0.18, 0, Math.PI * 2);
      ctx.moveTo(0.4, hy - 0.97);
      ctx.arc(0.2, hy - 0.97, 0.2, 0, Math.PI * 2);
      ctx.moveTo(0.2, hy - 1.1);
      ctx.arc(0.02, hy - 1.1, 0.2, 0, Math.PI * 2);
      paint(ctx, C.white, OUTLINE);
      if (Q.detail) {
        ctx.beginPath();
        for (const px of [-0.12, 0.02, 0.16]) { ctx.moveTo(px, hy - 0.3); ctx.lineTo(px, hy - 0.8); }
        ctx.strokeStyle = C.greyLight; ctx.lineWidth = 0.02; ctx.stroke();
      }
      ctx.fillStyle = C.greyLight;
      ctx.fillRect(-0.25, hy - 0.3, 0.54, 0.08);
      // The carving knife.
      const [hx, hy2] = hand(1.9, hy);
      ctx.save();
      ctx.translate(hx, hy2);
      ctx.rotate(0.3);
      ctx.beginPath();
      ctx.rect(-0.04, -0.08, 0.08, 0.22);
      paint(ctx, MAT.teakDark, { lw: 0.02 });
      ctx.beginPath();
      ctx.moveTo(-0.045, -0.1); ctx.lineTo(-0.05, -0.62); ctx.quadraticCurveTo(0.02, -0.72, 0.07, -0.64); ctx.lineTo(0.05, -0.1);
      ctx.closePath();
      paint(ctx, MAT.chrome, { lw: 0.02 });
      ctx.restore();
    },
  },

  // Eight, loose, in a propeller cap. From 10am his hands are slime, held out
  // in front of him so everyone can see.
  tyler: {
    arms: (t) => (wrap(t) >= at(10) ? [1.45, 1.3] : null),
    face(ctx, hy, back, t) {
      // The cap, in three colors, and the propeller going round.
      ctx.beginPath();
      ctx.arc(0.02, hy - 0.08, 0.32, Math.PI, 0);
      ctx.closePath();
      paint(ctx, INK.funnelRed, OUTLINE);
      ctx.beginPath();
      ctx.moveTo(0.02, hy - 0.08); ctx.arc(0.02, hy - 0.08, 0.32, Math.PI * 1.35, Math.PI * 1.65);
      ctx.closePath();
      ctx.fillStyle = INK.sunYellow;
      ctx.fill();
      ctx.beginPath();
      ctx.rect(back ? -0.46 : 0.1, hy - 0.11, 0.38, 0.07);
      paint(ctx, C.sky, OUTLINE);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 0.03;
      ctx.beginPath();
      ctx.moveTo(0.02, hy - 0.4); ctx.lineTo(0.02, hy - 0.52);
      ctx.stroke();
      const spin = Math.cos(t * 17) * 0.3;
      ctx.beginPath();
      ctx.ellipse(0.02 + spin / 2, hy - 0.54, Math.abs(spin) / 2 + 0.02, 0.04, 0, 0, Math.PI * 2);
      ctx.ellipse(0.02 - spin / 2, hy - 0.54, Math.abs(spin) / 2 + 0.02, 0.04, 0, 0, Math.PI * 2);
      paint(ctx, C.sky, { lw: 0.02 });
      if (wrap(t) < at(10)) return;
      // Slime, dripping.
      for (const [a, far] of [[1.45, false], [1.3, true]]) {
        const [hx, hy2] = hand(a, hy, far);
        ctx.beginPath();
        ctx.ellipse(hx, hy2, 0.13, 0.1, 0.4, 0, Math.PI * 2);
        const drip = 0.1 + 0.12 * ((t * 0.7 + (far ? 0.5 : 0)) % 1);
        ctx.moveTo(hx + 0.03, hy2);
        ctx.lineTo(hx + 0.01, hy2 + drip);
        ctx.arc(hx + 0.02, hy2 + drip, 0.03, 0, Math.PI * 2);
        paint(ctx, INK.queasyGreen, { lw: 0.025 });
      }
    },
  },

  // Cabin 7's divorce. Brenda: a sun hat, a kaftan, pointing (at Ray).
  brenda: {
    still: 'point',
    wear(ctx, b) {
      // The kaftan, flowing to her ankles.
      ctx.beginPath();
      ctx.moveTo(-0.27, b.top + 0.02); ctx.lineTo(0.27, b.top + 0.02); ctx.lineTo(0.47, b.hipY + 0.72); ctx.lineTo(-0.47, b.hipY + 0.72);
      ctx.closePath();
      paint(ctx, C.purple, { ...OUTLINE, dots: INK.sunYellow, density: 0.3 });
      if (!Q.detail) return;
      ctx.fillStyle = INK.sunYellow;
      ctx.fillRect(-0.46, b.hipY + 0.62, 0.92, 0.06);
      if (b.back) return;
      ctx.beginPath();
      ctx.moveTo(-0.02, b.top + 0.02); ctx.lineTo(0.09, b.top + 0.26); ctx.lineTo(0.2, b.top + 0.02);
      ctx.strokeStyle = INK.sunYellow; ctx.lineWidth = 0.05; ctx.stroke();
    },
    face(ctx, hy, back) {
      if (!back) { // big cat-eye sunglasses
        ctx.beginPath();
        ctx.moveTo(0.04, hy - 0.04); ctx.lineTo(0.36, hy - 0.06); ctx.lineTo(0.32, hy + 0.07); ctx.lineTo(0.06, hy + 0.07);
        ctx.closePath();
        ctx.fillStyle = C.black;
        ctx.fill();
      }
      // The floppy sun hat, a band and a big flower.
      ctx.beginPath();
      ctx.ellipse(0.02, hy - 0.18, 0.66, 0.13, 0.06, 0, Math.PI * 2);
      paint(ctx, C.white, OUTLINE);
      ctx.beginPath();
      ctx.ellipse(0.02, hy - 0.26, 0.28, 0.17, 0, Math.PI, 0);
      ctx.closePath();
      paint(ctx, C.white, OUTLINE);
      ctx.fillStyle = C.purple;
      ctx.fillRect(-0.25, hy - 0.28, 0.54, 0.07);
      if (Q.detail) flower(ctx, -0.2, hy - 0.28, 0.05, INK.funnelRed, INK.sunYellow);
    },
  },

  // Ray: a loud golf shirt, a comb-over, and the lamp she threw out after him.
  ray: {
    arms: [1.2, 1.0],
    wear(ctx, b) {
      if (Q.detail) {
        // Argyle, loud.
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(-0.28, b.top, 0.56, 0.93, 0.18);
        ctx.clip();
        ctx.beginPath();
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 3; c++) {
            const cx = -0.2 + c * 0.2 + (r % 2) * 0.1, cy = b.top + 0.12 + r * 0.2;
            ctx.moveTo(cx, cy - 0.1); ctx.lineTo(cx + 0.07, cy); ctx.lineTo(cx, cy + 0.1); ctx.lineTo(cx - 0.07, cy);
            ctx.closePath();
          }
        }
        ctx.fillStyle = C.teal;
        ctx.fill();
        ctx.restore();
      }
      if (b.back) return;
      // The collar, turned up.
      ctx.beginPath();
      ctx.moveTo(-0.14, b.top); ctx.lineTo(0.06, b.top + 0.12); ctx.lineTo(0.26, b.top);
      ctx.lineTo(0.18, b.top - 0.05); ctx.lineTo(-0.08, b.top - 0.05);
      ctx.closePath();
      paint(ctx, C.white, OUTLINE);
    },
    hold(ctx) { // the lamp, hugged
      ctx.save();
      ctx.translate(...HELD);
      const x = 0.62;
      ctx.beginPath();
      ctx.ellipse(x, -0.95, 0.17, 0.06, 0, 0, Math.PI * 2);
      paint(ctx, MAT.brass, OUTLINE);
      ctx.beginPath();
      ctx.rect(x - 0.03, -1.6, 0.06, 0.64);
      paint(ctx, MAT.brass, OUTLINE);
      ctx.beginPath();
      ctx.moveTo(x - 0.15, -2.0); ctx.lineTo(x + 0.15, -2.0); ctx.lineTo(x + 0.27, -1.58); ctx.lineTo(x - 0.27, -1.58);
      ctx.closePath();
      paint(ctx, C.butter, { ...OUTLINE, dots: INK.flamingo, density: 0.3 });
      if (Q.detail) {
        ctx.fillStyle = INK.flamingo;
        for (let i = 0; i < 7; i++) ctx.fillRect(x - 0.26 + i * 0.08, -1.58, 0.03, 0.06);
      }
      ctx.restore();
    },
    face(ctx, hy, back) { // a comb-over, fooling nobody
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        ctx.moveTo(-0.26, hy - 0.08 + i * 0.03);
        ctx.quadraticCurveTo(0.0, hy - 0.4 + i * 0.05, 0.28, hy - 0.2 + i * 0.04);
      }
      ctx.strokeStyle = C.grey;
      ctx.lineWidth = 0.03;
      ctx.stroke();
      if (back || !Q.detail) return;
      ctx.beginPath(); // glum
      ctx.moveTo(0.2, hy + 0.2); ctx.quadraticCurveTo(0.26, hy + 0.15, 0.32, hy + 0.2);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02; ctx.stroke();
    },
  },

  // The cruise director: a headset, a lanyard, and the megaphone at her mouth.
  kelly: {
    arms: [2.0, 0.3],
    wear(ctx, b) {
      if (b.back || !Q.detail) return;
      ctx.beginPath();
      ctx.moveTo(-0.08, b.top + 0.02); ctx.lineTo(0.08, b.top + 0.42); ctx.lineTo(0.2, b.top + 0.02);
      ctx.strokeStyle = INK.funnelRed; ctx.lineWidth = 0.03; ctx.stroke();
      ctx.beginPath();
      ctx.rect(0.0, b.top + 0.42, 0.16, 0.2);
      paint(ctx, C.white, { lw: 0.02 });
      ctx.fillStyle = INK.sea;
      ctx.fillRect(0.0, b.top + 0.42, 0.16, 0.05);
    },
    face(ctx, hy, back) {
      // The headset: a band over the top, an ear cup, a mic at her mouth.
      ctx.beginPath();
      ctx.arc(0.02, hy, 0.36, Math.PI * 1.05, Math.PI * 1.95);
      ctx.strokeStyle = MAT.steel;
      ctx.lineWidth = 0.06;
      ctx.stroke();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 0.035;
      ctx.beginPath();
      ctx.ellipse(-0.02, hy + 0.02, 0.07, 0.1, 0, 0, Math.PI * 2);
      paint(ctx, C.ink, { stroke: false });
      if (!back) {
        ctx.beginPath();
        ctx.moveTo(-0.02, hy + 0.08); ctx.quadraticCurveTo(0.05, hy + 0.24, 0.26, hy + 0.2);
        ctx.stroke();
      }
      // The megaphone, pointing up and out.
      const [hx, hy2] = hand(2.0, hy);
      ctx.beginPath();
      ctx.moveTo(hx, hy2 - 0.08); ctx.lineTo(hx, hy2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(hx - 0.35, hy2 - 0.14); ctx.lineTo(hx + 0.3, hy2 - 0.34); ctx.lineTo(hx + 0.3, hy2 + 0.04); ctx.lineTo(hx - 0.35, hy2 - 0.06);
      ctx.closePath();
      paint(ctx, C.white, OUTLINE);
      ctx.beginPath();
      ctx.ellipse(hx + 0.3, hy2 - 0.15, 0.06, 0.19, 0, 0, Math.PI * 2);
      paint(ctx, INK.funnelRed, OUTLINE);
    },
  },

  // The ship's doctor: white coat, stethoscope, a head mirror, a clipboard.
  swabb: {
    arms: [0.7, 0.1],
    wear(ctx, b) {
      // The coat's tails.
      ctx.beginPath();
      ctx.moveTo(-0.29, b.hipY - 0.1); ctx.lineTo(0.29, b.hipY - 0.1); ctx.lineTo(0.34, b.hipY + 0.42); ctx.lineTo(-0.34, b.hipY + 0.42);
      ctx.closePath();
      paint(ctx, C.white, OUTLINE);
      if (b.back) return;
      // Scrubs showing down the front, pens in the pocket.
      ctx.beginPath();
      ctx.moveTo(0.02, b.top + 0.02); ctx.lineTo(0.2, b.top + 0.02); ctx.lineTo(0.13, b.top + 0.32);
      ctx.closePath();
      paint(ctx, C.mint, OUTLINE);
      if (!Q.detail) return;
      ctx.fillStyle = INK.funnelRed;
      ctx.fillRect(-0.18, b.top + 0.3, 0.03, 0.12);
      ctx.fillStyle = C.navy;
      ctx.fillRect(-0.13, b.top + 0.28, 0.03, 0.14);
      ctx.beginPath();
      ctx.moveTo(-0.14, b.top + 0.03);
      ctx.quadraticCurveTo(-0.08, b.top + 0.5, 0.12, b.top + 0.5);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 0.035;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0.14, b.top + 0.52, 0.05, 0, Math.PI * 2);
      paint(ctx, MAT.chrome, OUTLINE);
    },
    face(ctx, hy, back) {
      if (!back) { // spectacles
        ctx.beginPath();
        ctx.arc(0.1, hy + 0.02, 0.07, 0, Math.PI * 2);
        ctx.moveTo(0.315, hy + 0.02);
        ctx.arc(0.245, hy + 0.02, 0.07, 0, Math.PI * 2);
        ctx.moveTo(0.03, hy + 0.01); ctx.lineTo(-0.14, hy - 0.03);
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 0.028;
        ctx.stroke();
      }
      // The head mirror, on its band.
      ctx.beginPath();
      ctx.moveTo(-0.3, hy - 0.08); ctx.lineTo(0.3, hy - 0.2);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 0.04;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0.26, hy - 0.26, 0.07, 0.11, 0.2, 0, Math.PI * 2);
      paint(ctx, MAT.chrome, OUTLINE);
      // The clipboard.
      const [hx, hy2] = hand(0.7, hy);
      ctx.beginPath();
      ctx.rect(hx - 0.2, hy2 - 0.42, 0.3, 0.42);
      paint(ctx, MAT.teakDark, OUTLINE);
      ctx.fillStyle = C.white;
      ctx.fillRect(hx - 0.17, hy2 - 0.36, 0.24, 0.33);
      ctx.fillStyle = MAT.chrome;
      ctx.fillRect(hx - 0.1, hy2 - 0.45, 0.1, 0.06);
      if (!Q.detail) return;
      ctx.fillStyle = C.grey;
      for (let i = 0; i < 4; i++) ctx.fillRect(hx - 0.14, hy2 - 0.3 + i * 0.07, 0.18, 0.015);
    },
  },

  // A white jacket with brass buttons, a towel over one arm.
  steward: {
    arms: [1.0, 0.15],
    wear(ctx, b) {
      buttons(ctx, b, 4, 0.16);
      if (b.back) return;
      ctx.beginPath(); // a black bow tie
      ctx.moveTo(0.1, b.top + 0.06); ctx.lineTo(0.0, b.top + 0.01); ctx.lineTo(0.0, b.top + 0.11);
      ctx.moveTo(0.1, b.top + 0.06); ctx.lineTo(0.2, b.top + 0.01); ctx.lineTo(0.2, b.top + 0.11);
      ctx.fillStyle = C.ink;
      ctx.fill();
    },
    face(ctx, hy) { stewardTowel(ctx, hy, 1.0); },
  },
};

// The steward's towel, folded over his forearm (arm at angle a).
function stewardTowel(ctx, hy, a) {
  const sy = hy + SHOULDER;
  const mx = 0.22 + Math.sin(a) * 0.46, my = sy + Math.cos(a) * 0.46;
  // Hung over the arm: a fold on top, both ends hanging, one longer.
  ctx.beginPath();
  ctx.moveTo(mx - 0.17, my + 0.02);
  ctx.quadraticCurveTo(mx, my - 0.12, mx + 0.17, my - 0.02);
  ctx.lineTo(mx + 0.15, my + 0.44); ctx.lineTo(mx, my + 0.4); ctx.lineTo(mx - 0.14, my + 0.6);
  ctx.closePath();
  paint(ctx, C.white, OUTLINE);
  ctx.fillStyle = INK.sea;
  ctx.fillRect(mx - 0.15, my + 0.44, 0.13, 0.05);
  ctx.fillRect(mx + 0.02, my + 0.3, 0.13, 0.05);
}
