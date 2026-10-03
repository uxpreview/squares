// The Crew Bar: the crew's own party under the buffet, below the waterline.
// Fairy lights, a karaoke stage, laundry carts for seats, the galley's back
// stores along the hull, the crew mess, the notice board and a Gander Cola
// fridge. Nobody down here goes green: the crew don't eat the buffet.
//
// The running gag, the better party: a few at 7am (the barman, the bouncer,
// breakfast in the mess, someone asleep on the towels), more every hour, and
// at 3pm the off-shift crew pour in through the door in a conga line and it
// goes off (dancing on the laundry carts, a duet, bubbles). Every so often a
// waiter comes in, drops his customer smile, dances, puts the smile back on
// and goes back up. Before three the front is getting ready: laundry cart
// time trials with a chequered flag, and a steward blowing up the balloons.
//
// The chase (sighting 6, the crew party): the iguana hides in the parked race
// cart's towels, the only cart nobody's dancing on; its crest, head and tail
// show. Its lookalike is a pickle in a party hat on the bar. Things that
// answer a tap: the karaoke machine (the teach), the two lidded crates
// (KETCHUP, and DISPLAY ONLY with the plastic shrimp), the fridge, the
// balloons, the pickle.
//
// Units are the area's own: x from the stern end (0) to the bow end (32), y
// from the hull (0) to the cut side (16). The engine cuts the area in two at
// x 16, so nothing wide stands across it (the stores come in pieces). People
// on the ship's clock walk the corridor by the hull (y 3 to 5.5), from the
// Engine Room's door (x 0, y 3.2) to the Sick Bay's (x 32, y 3.2), so it's
// kept clear.
import {
  C, Q, box, rect, disc, cylinder, face, paint, person, folk, shade, tint, mix, alpha,
  label, paintText, onLeft, onRight, P, note, speech,
} from '../../../engine/art.js';
import { particles, clamp, pulse } from '../../../engine/actors.js';
import { deck } from '../ship.js';
import { INK, MAT, at, wrap, readable, iguana } from '../style.js';
import { porthole, lettering, board, lifebuoy, towelAnimal, CREW_LOOK, shape, sighting } from '../kit.js';

const STEEL = MAT.steel, CHROME = MAT.chrome;
const PARTY = at(15); // 3pm: the off-shift crew arrive
const DOOR_Y = 3.2; // the Engine Room's door, on the left wall
// The dance floor, and the loop the conga goes round it.
const FLOOR = [10, 6, 19, 11.2];
const RING = { x: 14.5, y: 8.6, rx: 4.4, ry: 2.3 };
const BULBS = [C.mustard, C.pink, C.sky, C.coral, C.butter, INK.flamingo, C.lilac];

// How the party's going, 0 at 7am to 1 from 3pm.
const partyK = (t) => clamp((wrap(t) - at(7)) / (PARTY - at(7)));
const partying = (t) => wrap(t) >= PARTY;

// ---------- Walking ----------
// A path through points: its length, and where you are d along it (facing
// the way you're going).
function path(points) {
  const segs = [];
  let L = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i], [bx, by] = points[i + 1];
    const len = Math.hypot(bx - ax, by - ay);
    segs.push({ ax, ay, bx, by, d0: L, len });
    L += len;
  }
  return {
    L,
    at(d) {
      const s = segs.find((g) => d <= g.d0 + g.len) || segs[segs.length - 1];
      const k = s.len ? clamp((d - s.d0) / s.len) : 0;
      const dx = s.bx - s.ax, dy = s.by - s.ay;
      return { x: s.ax + dx * k, y: s.ay + dy * k, dir: dx - dy >= 0 ? 'r' : 'l', back: dx + dy < 0 };
    },
  };
}
const IN = [[-0.6, DOOR_Y], [1.3, DOOR_Y]];

// Someone who comes in through the door at tIn (seconds into the day), walks
// to their spot by way of via, and stays till the day starts again.
function arrive(tIn, via, stay, speed = 1.6) {
  const p = path([...IN, ...via, [stay.x, stay.y]]);
  return (t) => {
    const s = wrap(t);
    if (s < tIn) return { hide: true, x: -5, y: DOOR_Y };
    const d = (s - tIn) * speed;
    if (d >= p.L) return stay;
    const w = p.at(d);
    const up = stay.z > 0.5 && w.x > 24 && w.x < 28 && w.y > 9 && w.y < 12; // onto the stage
    return { ...w, pose: 'walk', moving: true, z: up ? stay.z : 0, hide: w.x < 0 };
  };
}

// ---------- Faces ----------
// Over the plain face (facing right, the head's middle at (0.02, hy)).
function mouth(ctx, hy, kind, skin) {
  ctx.lineCap = 'round';
  if (kind === 'smile') {
    // the customer smile: all the teeth
    ctx.beginPath();
    ctx.moveTo(0.04, hy + 0.1);
    ctx.quadraticCurveTo(0.2, hy + 0.34, 0.33, hy + 0.08);
    ctx.closePath();
    paint(ctx, C.white, { lw: 0.025 });
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02;
    ctx.beginPath(); ctx.moveTo(0.07, hy - 0.1); ctx.lineTo(0.14, hy - 0.13); ctx.moveTo(0.2, hy - 0.13); ctx.lineTo(0.28, hy - 0.1); ctx.stroke();
  } else if (kind === 'flat') {
    // the smile off: heavy lids, a straight line
    ctx.fillStyle = skin;
    for (const ex of [0.1, 0.24]) { ctx.beginPath(); ctx.arc(ex, hy + 0.02, 0.045, Math.PI, 0); ctx.fill(); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025;
    ctx.beginPath(); ctx.moveTo(0.05, hy - 0.005); ctx.lineTo(0.15, hy + 0.0); ctx.moveTo(0.19, hy + 0.0); ctx.lineTo(0.29, hy - 0.005); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0.1, hy + 0.18); ctx.lineTo(0.27, hy + 0.17); ctx.stroke();
  } else if (kind === 'happy') {
    // eyes shut, really enjoying it
    ctx.fillStyle = skin;
    for (const ex of [0.1, 0.24]) { ctx.beginPath(); ctx.arc(ex, hy + 0.02, 0.05, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025;
    ctx.beginPath();
    for (const ex of [0.1, 0.24]) { ctx.moveTo(ex - 0.045, hy + 0.04); ctx.quadraticCurveTo(ex, hy - 0.03, ex + 0.045, hy + 0.04); }
    ctx.stroke();
    ctx.beginPath(); ctx.arc(0.2, hy + 0.13, 0.07, 0.1, Math.PI - 0.1); ctx.stroke();
  }
}
const faceOf = (kind, skin) => (ctx, hy, back) => { if (!back && Q.detail) mouth(ctx, hy, kind, skin); };

// A bow tie, for the waiters and the barman.
const bowTie = (ctx, b) => {
  if (b.back) return;
  const y = b.top + 0.1;
  ctx.beginPath();
  ctx.moveTo(0.14, y); ctx.lineTo(0.02, y - 0.06); ctx.lineTo(0.02, y + 0.06); ctx.closePath();
  ctx.moveTo(0.14, y); ctx.lineTo(0.26, y - 0.06); ctx.lineTo(0.26, y + 0.06); ctx.closePath();
  paint(ctx, C.black, { lw: 0.015 });
};
// Overalls' bib and straps, for the engineers and deckhands.
const bib = (ctx, b) => {
  ctx.beginPath(); ctx.rect(-0.2, b.top + 0.3, 0.4, 0.5);
  paint(ctx, MAT.crewBlue, { lw: 0.02 });
  ctx.strokeStyle = MAT.crewBlue; ctx.lineWidth = 0.06;
  ctx.beginPath(); ctx.moveTo(-0.16, b.top + 0.32); ctx.lineTo(-0.16, b.top + 0.02); ctx.moveTo(0.16, b.top + 0.32); ctx.lineTo(0.16, b.top + 0.02); ctx.stroke();
};

// Where a hand is, from its arm's angle, in a held thing's own units (the
// held thing is drawn from a spot near the near shoulder).
const hand = (a) => [Math.sin(a) * 0.72 - 0.13, Math.cos(a) * 0.72 - 0.3];

// ---------- People ----------
// Crew, never green. look: over a folk look. pos(t) gives
// { x, y, z, pose, dir, back, arms, hold, face, wear, hide, say, ahead }.
function crew(R, seed, look, pos, o = {}) {
  const base = { ...folk(seed), ...look };
  R.mover(pos, (ctx, t, p) => {
    if (p.hide) return;
    person(ctx, p.x, p.y, p.z || 0, {
      ...base, pose: p.pose || 'stand', dir: p.dir || 'r', back: p.back, scale: o.scale,
      arms: typeof p.arms === 'function' ? p.arms(t) : p.arms, hold: p.hold || o.hold,
      face: p.face || o.face, wear: o.wear, speed: p.speed || o.speed,
    }, t);
    if (p.say && readable()) speech(ctx, p.x, p.y, (p.z || 0) + 2.9, p.say, { size: 0.45 });
  }, { bias: o.bias || 0 });
}
const still = (p) => () => p;
const WHITES = { ...CREW_LOOK, dress: false };
const NAVY = { top: MAT.crewBlue, bottom: MAT.crewBlue, hat: 'none', dress: false };
const GALLEY = { top: C.white, bottom: C.ink, hat: 'chef', dress: false };

// ---------- The stores ----------
// Shelves along the hull, x 14 to 23, in pieces that never cross x 16. Each
// shelf's things, left to right; crates carry a label and what pokes out.
const SHELF_Y0 = 0.3, SHELF_Y1 = 1.4;
const BOARDS = [0.1, 0.85, 1.5, 2.3, 3.0];
const PIECES = [[14, 16], [16, 18.4], [18.4, 20.7], [20.7, 23]];

function tins(ctx, x0, x1, z, color, band) {
  for (let x = x0 + 0.16; x < x1 - 0.1; x += 0.3) {
    for (const y of [0.65, 1.05]) {
      cylinder(ctx, x, y, z, 0.12, 0.3, color, { flat: true, lw: 0.02 });
      if (Q.detail && y > 1) { const [X, Y] = P(x, y, z + 0.15); ctx.fillStyle = band; ctx.fillRect(X - 0.17, Y - 0.04, 0.34, 0.08); }
    }
  }
}
function bottles(ctx, x0, x1, z, color, cap) {
  for (let x = x0 + 0.14; x < x1 - 0.08; x += 0.22) {
    const [X, Y] = P(x, 1.0, z);
    ctx.beginPath();
    ctx.moveTo(X - 0.08, Y); ctx.lineTo(X - 0.08, Y - 0.32); ctx.lineTo(X - 0.03, Y - 0.44); ctx.lineTo(X + 0.03, Y - 0.44); ctx.lineTo(X + 0.08, Y - 0.32); ctx.lineTo(X + 0.08, Y);
    ctx.closePath();
    paint(ctx, color, { lw: 0.02 });
    ctx.fillStyle = cap; ctx.fillRect(X - 0.035, Y - 0.5, 0.07, 0.07);
  }
}
// A crate on a shelf: slatted, a label on its front, something poking out.
function crate(ctx, x, z, name, poke, o = {}) {
  const w = o.w || 0.62, y0 = 0.7, y1 = 1.32, h = 0.36;
  box(ctx, x, y0, z, w, y1 - y0, h, C.woodLight, { flat: true, lw: 0.025, top: shade(C.wood, 0.3) });
  if (Q.detail) {
    ctx.strokeStyle = shade(C.wood, 0.35); ctx.lineWidth = 0.012;
    ctx.beginPath();
    for (const dz of [0.12, 0.24]) { const [A, B] = P(x, y1, z + dz), [E, F] = P(x + w, y1, z + dz); ctx.moveTo(A, B); ctx.lineTo(E, F); }
    ctx.stroke();
  }
  if (poke) poke(ctx, x, y0, y1, z + h, w);
  if (name) {
    face(ctx, [[x + 0.08, y1 + 0.005, z + 0.1], [x + w - 0.08, y1 + 0.005, z + 0.1], [x + w - 0.08, y1 + 0.005, z + 0.27], [x + 0.08, y1 + 0.005, z + 0.27]], o.label || C.white, { lw: 0.012 });
    lettering(ctx, 'x', x + w / 2, y1 + 0.01, z + 0.185, name, 0.07, o.ink || C.ink);
  }
}
// What pokes out of the crates.
const lumps = (color, n = 5) => (ctx, x, y0, y1, z, w) => {
  for (let i = 0; i < n; i++) {
    const [X, Y] = P(x + 0.12 + (i % 3) * (w - 0.24) / 2, y0 + 0.15 + Math.floor(i / 3) * 0.28, z + 0.02);
    ctx.beginPath(); ctx.ellipse(X, Y - 0.04, 0.1, 0.07, 0, 0, Math.PI * 2); paint(ctx, color, { lw: 0.015 });
  }
};
const napkins = (color) => (ctx, x, y0, y1, z, w) => {
  for (let i = 0; i < 3; i++) shape(ctx, [[x + 0.1 + i * 0.16, y0 + 0.2, z], [x + 0.2 + i * 0.16, y0 + 0.3, z + 0.18], [x + 0.26 + i * 0.16, y1 - 0.12, z + 0.02]], color, { lw: 0.015 });
};
const crackers = (ctx, x, y0, y1, z, w) => {
  for (let i = 0; i < 4; i++) {
    const [X, Y] = P(x + 0.15 + i * 0.12, y0 + 0.3 + (i % 2) * 0.12, z + 0.05);
    ctx.beginPath(); ctx.ellipse(X, Y, 0.1, 0.05, 0.4 * (i % 2 ? 1 : -1), 0, Math.PI * 2); paint(ctx, C.butter, { lw: 0.012 });
  }
};
// The plastic shrimp: glossy, too pink, one curled over the front lip.
function plasticShrimp(ctx, X, Y, a, s = 1) {
  ctx.save();
  ctx.translate(X, Y);
  ctx.rotate(a);
  ctx.beginPath();
  ctx.arc(0, 0, 0.1 * s, Math.PI * 0.05, Math.PI * 1.25);
  ctx.lineCap = 'round';
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.12 * s; ctx.stroke(); }
  ctx.strokeStyle = C.pink; ctx.lineWidth = 0.08 * s; ctx.stroke();
  if (Q.detail) {
    ctx.beginPath(); ctx.arc(0, 0, 0.1 * s, Math.PI * 0.6, Math.PI * 0.95);
    ctx.strokeStyle = alpha(C.white, 0.85); ctx.lineWidth = 0.022 * s; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0.09 * s, 0.05 * s); ctx.lineTo(0.18 * s, 0.11 * s); ctx.lineTo(0.11 * s, 0.15 * s); ctx.closePath();
    paint(ctx, C.pink, { lw: 0.012 });
  }
  ctx.restore();
}
// Each piece's shelves, bottom to top: what's on them.
function stock(ctx, a, b, i) {
  if (i === 0) {
    // sacks of rice, tins, napkins, ketchup
    for (let k = 0; k < 3; k++) {
      const [X, Y] = P(a + 0.4 + k * 0.6, 0.95, BOARDS[0] + 0.06);
      ctx.beginPath(); ctx.moveTo(X - 0.26, Y); ctx.quadraticCurveTo(X - 0.3, Y - 0.5, X - 0.1, Y - 0.6); ctx.lineTo(X + 0.1, Y - 0.6); ctx.quadraticCurveTo(X + 0.3, Y - 0.5, X + 0.26, Y); ctx.closePath();
      paint(ctx, C.paper, { lw: 0.02, dots: C.paperDeep, density: 0.3 });
      if (Q.detail) label(ctx, a + 0.4 + k * 0.6, 0.95, BOARDS[0] + 0.3, 'RICE', 0.09, C.ink, 'Rethink Sans');
    }
    tins(ctx, a, b, BOARDS[1] + 0.06, C.red, C.white);
    crate(ctx, a + 0.2, BOARDS[2] + 0.06, 'NAPKINS', napkins(C.white));
    crate(ctx, a + 1.0, BOARDS[2] + 0.06, 'LEMONS', lumps(C.mustard));
    bottles(ctx, a, b, BOARDS[3] + 0.06, C.red, C.white);
  } else if (i === 1) {
    // Gander Cola by the case, beans, pink napkins, the spoons (gone)
    for (let k = 0; k < 3; k++) box(ctx, a + 0.15 + k * 0.72, 0.5, BOARDS[0] + 0.06, 0.66, 0.8, 0.5, INK.funnelRed, { flat: true, lw: 0.02, top: shade(INK.funnelRed, 0.1) });
    for (let k = 0; k < 3; k++) lettering(ctx, 'x', a + 0.48 + k * 0.72, 1.31, BOARDS[0] + 0.3, 'GANDER', 0.1, C.white);
    tins(ctx, a, b, BOARDS[1] + 0.06, C.coral, C.butter);
    crate(ctx, a + 0.15, BOARDS[2] + 0.06, 'PINK NAPKINS', napkins(C.pink));
    crate(ctx, a + 0.9, BOARDS[2] + 0.06, 'SPOONS', null);
    crate(ctx, a + 1.65, BOARDS[2] + 0.06, 'TINS', lumps(C.greyLight, 4));
    bottles(ctx, a, b, BOARDS[3] + 0.06, C.mustard, C.red);
  } else if (i === 2) {
    // flour, peas, crackers, the pickles
    for (let k = 0; k < 2; k++) box(ctx, a + 0.2 + k * 1.05, 0.55, BOARDS[0] + 0.06, 0.9, 0.75, 0.55, C.white, { flat: true, lw: 0.02 });
    for (let k = 0; k < 2; k++) lettering(ctx, 'x', a + 0.65 + k * 1.05, 1.31, BOARDS[0] + 0.33, 'FLOUR', 0.12, C.ink);
    tins(ctx, a, b, BOARDS[1] + 0.06, C.leaf, C.white);
    crate(ctx, a + 0.2, BOARDS[2] + 0.06, 'PRAWN CRACKERS', crackers, { w: 0.9 });
    crate(ctx, a + 1.25, BOARDS[2] + 0.06, 'NAPKINS', napkins(C.white));
    for (let k = 0; k < 4; k++) cylinder(ctx, a + 0.3 + k * 0.5, 0.9, BOARDS[3] + 0.06, 0.18, 0.42, alpha(MAT.glass, 0.8), { flat: true, lw: 0.02, top: C.brown });
  } else {
    // mustard, ketchup, the crate of display shrimp, olive oil
    for (let k = 0; k < 2; k++) cylinder(ctx, a + 0.55 + k * 1.1, 0.9, BOARDS[0] + 0.06, 0.38, 0.62, STEEL, { lw: 0.02 });
    lettering(ctx, 'x', a + 0.55, 1.31, BOARDS[0] + 0.3, 'OIL', 0.1, C.ink);
    tins(ctx, a, b, BOARDS[1] + 0.06, C.mustard, C.brown);
    // (KETCHUP and DISPLAY ONLY, lids nailed on, are drawn on their own: they open.)
    crate(ctx, a + 1.52, BOARDS[2] + 0.06, 'TINS', lumps(C.greyLight, 4));
    bottles(ctx, a, b, BOARDS[3] + 0.06, C.butter, C.ink);
  }
}
function shelfPiece(ctx, a, b, i) {
  // the back, then board by board with its things, then the uprights
  face(ctx, [[a, SHELF_Y0, 0], [b, SHELF_Y0, 0], [b, SHELF_Y0, 3.06], [a, SHELF_Y0, 3.06]], shade(STEEL, 0.25), { lw: 0.03 });
  for (let k = 0; k < BOARDS.length; k++) {
    box(ctx, a, SHELF_Y0, BOARDS[k], b - a, SHELF_Y1 - SHELF_Y0, 0.06, STEEL, { flat: true, lw: 0.03, top: CHROME });
  }
  stock(ctx, a, b, i);
  for (const x of [a, b - 0.08]) box(ctx, x, SHELF_Y1 - 0.08, 0, 0.08, 0.08, 3.06, shade(STEEL, 0.2), { flat: true, lw: 0.02 });
}

// ---------- The two crates with lids ----------
// On the bottom right shelf, KETCHUP and the chef's DISPLAY ONLY have their
// lids nailed on, and a front that drops open when tapped (k: 0 shut, 1 open).
// One pink tail is caught under the DISPLAY ONLY lid: the tell.
const LID = { y0: 0.7, y1: 1.32, h: 0.36, w: 0.62, z: BOARDS[2] + 0.06 };
const KETCHUP_X = 20.78, SHRIMP_X = 21.5;
function lidCrate(ctx, x, k, name, ink, inside, tell) {
  const { y0, y1, h, w, z } = LID;
  box(ctx, x, y0, z, w, y1 - y0, h, C.woodLight, { flat: true, lw: 0.025, top: shade(C.wood, 0.15) });
  if (Q.detail) {
    // the lid's planks
    ctx.strokeStyle = shade(C.wood, 0.35); ctx.lineWidth = 0.012;
    ctx.beginPath();
    for (const u of [0.21, 0.42]) { const [A, B] = P(x, y0 + u, z + h), [E, F] = P(x + w, y0 + u, z + h); ctx.moveTo(A, B); ctx.lineTo(E, F); }
    ctx.stroke();
  }
  if (k < 0.02) {
    if (Q.detail) {
      ctx.strokeStyle = shade(C.wood, 0.35); ctx.lineWidth = 0.012;
      ctx.beginPath();
      for (const dz of [0.12, 0.24]) { const [A, B] = P(x, y1, z + dz), [E, F] = P(x + w, y1, z + dz); ctx.moveTo(A, B); ctx.lineTo(E, F); }
      ctx.stroke();
    }
    face(ctx, [[x + 0.08, y1 + 0.005, z + 0.1], [x + w - 0.08, y1 + 0.005, z + 0.1], [x + w - 0.08, y1 + 0.005, z + 0.27], [x + 0.08, y1 + 0.005, z + 0.27]], C.white, { lw: 0.012 });
    lettering(ctx, 'x', x + w / 2, y1 + 0.01, z + 0.185, name, 0.07, ink);
    if (tell) tell(ctx, x, z + h);
    return;
  }
  // Open: the dark inside, what's in it, and the front lying out over the shelf's edge.
  face(ctx, [[x + 0.03, y1, z + 0.02], [x + w - 0.03, y1, z + 0.02], [x + w - 0.03, y1, z + h - 0.03], [x + 0.03, y1, z + h - 0.03]], shade(C.wood, 0.6), { lw: 0.015 });
  inside(ctx, x, z);
  const a = k * Math.PI * 0.5, hy = h * Math.sin(a), hz = h * Math.cos(a);
  face(ctx, [[x, y1, z], [x + w, y1, z], [x + w, y1 + hy, z + hz], [x, y1 + hy, z + hz]], C.woodLight, { lw: 0.02 });
  if (k > 0.6) face(ctx, [[x + 0.08, y1 + hy * 0.28, z + hz * 0.28], [x + w - 0.08, y1 + hy * 0.28, z + hz * 0.28], [x + w - 0.08, y1 + hy * 0.75, z + hz * 0.75], [x + 0.08, y1 + hy * 0.75, z + hz * 0.75]], C.white, { lw: 0.012 });
}
// What's in them, seen through the open front.
function shrimpInside(ctx, x, z) {
  for (let i = 0; i < 5; i++) {
    const [X, Y] = P(x + 0.12 + i * 0.095, LID.y1 - 0.06, z + 0.09 + (i % 2) * 0.1);
    plasticShrimp(ctx, X, Y, 0.4 + i * 1.1, 0.8);
  }
}
function ketchupInside(ctx, x, z) {
  for (let i = 0; i < 4; i++) {
    const [X, Y] = P(x + 0.13 + i * 0.12, LID.y1 - 0.06, z + 0.03);
    ctx.beginPath(); ctx.roundRect(X - 0.045, Y - 0.24, 0.09, 0.24, 0.03); paint(ctx, C.red, { lw: 0.012 });
    ctx.fillStyle = C.white; ctx.fillRect(X - 0.025, Y - 0.29, 0.05, 0.05);
  }
}
// The tell: one pink tail curled out from under the lid, over its side.
function shrimpTell(ctx, x, z) {
  const [X, Y] = P(x + LID.w + 0.01, LID.y0 + 0.4, z - 0.02);
  plasticShrimp(ctx, X + 0.04, Y + 0.02, 1.2, 0.85);
}

// ---------- The disco ball ----------
// Spoons, dozens of them, bowls out, turning. Faster once the party starts.
function spoonBall(ctx, t) {
  const cx = 14, cy = 7, cz = 5, r = 0.56;
  const [X, Y] = P(cx, cy, cz);
  // its string to the deckhead
  const [, TY] = P(cx, cy, 6.6);
  ctx.beginPath(); ctx.moveTo(X, TY); ctx.lineTo(X, Y - r);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
  ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2);
  paint(ctx, STEEL, { lw: 0.04, dots: shade(STEEL, 0.4), density: 0.3 });
  const spin = partying(t) ? t * 1.6 : t * 0.5;
  for (let lat = -2; lat <= 2; lat++) {
    const la = lat * 0.55;
    const n = lat === 0 ? 11 : Math.abs(lat) === 1 ? 9 : 5;
    for (let j = 0; j < n; j++) {
      const lo = (j / n) * Math.PI * 2 + spin + lat * 0.3;
      const depth = Math.cos(lo) * Math.cos(la);
      if (depth < 0.2) continue;
      const sx = Math.sin(lo) * Math.cos(la) * r * 0.82, sy = -Math.sin(la) * r * 0.82;
      // the spoon's bowl, facing out, foreshortened toward the edge; its
      // handle running in toward the middle
      ctx.save();
      ctx.translate(X + sx, Y + sy);
      ctx.rotate(Math.atan2(sy, sx || 0.001));
      ctx.beginPath(); ctx.moveTo(-0.04 * depth, 0); ctx.lineTo(-0.16 * depth, 0);
      ctx.strokeStyle = CHROME; ctx.lineWidth = 0.03; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0.02, 0, 0.075 * depth + 0.02, 0.058, 0, 0, Math.PI * 2);
      const shine = (Math.sin(lo * 3 + t * 4) + 1) / 2;
      paint(ctx, mix(CHROME, C.white, shine * depth), { lw: 0.014 });
      ctx.restore();
    }
  }
  // a glint now and then
  if (Q.detail && pulse(t, 1.3) < 0.2) {
    const a = t * 2.3;
    const gx = X + Math.cos(a) * r * 0.5, gy = Y - r * 0.4;
    ctx.strokeStyle = C.white; ctx.lineWidth = 0.035;
    ctx.beginPath(); ctx.moveTo(gx - 0.2, gy); ctx.lineTo(gx + 0.2, gy); ctx.moveTo(gx, gy - 0.2); ctx.lineTo(gx, gy + 0.2); ctx.stroke();
  }
}

// ---------- Fairy lights ----------
// A string from one point to another, sagging, with bulbs along it.
function sag(a, b, drop, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    pts.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k - Math.sin(k * Math.PI) * drop]);
  }
  return pts;
}
// Every string in the bar: swags along the hull and the bulkhead, and a few
// from the disco ball's hook out to the walls.
const STRINGS = (() => {
  const s = [];
  for (let x = 0.3; x < 31; x += 3.4) s.push(sag([x, 0.02, 5.8], [Math.min(x + 3.4, 31.7), 0.02, 5.8], 0.45, 7));
  for (let y = 0.3; y < 15; y += 3.1) s.push(sag([0.02, y, 5.8], [0.02, Math.min(y + 3.1, 15.6), 5.8], 0.4, 6));
  for (const end of [[0.02, 7, 5.8], [0.02, 12.5, 5.8], [4, 0.02, 5.8], [9, 0.02, 5.8], [15.5, 0.02, 5.8]]) s.push(sag([14, 7, 6.5], end, 0.5, 8));
  return s;
})();
function fairyLights(ctx, t) {
  ctx.lineWidth = 0.025;
  ctx.strokeStyle = C.ink;
  for (const pts of STRINGS) {
    ctx.beginPath();
    pts.forEach((p, i) => { const [X, Y] = P(...p); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    ctx.stroke();
  }
  if (!Q.detail) return;
  const fast = partying(t) ? 5 : 2;
  let n = 0;
  for (const pts of STRINGS) {
    for (let i = 1; i < pts.length; i++, n++) {
      const [X, Y] = P(pts[i][0], pts[i][1], pts[i][2] - 0.06);
      const on = Math.sin(t * fast + n * 1.7) > -0.3;
      ctx.beginPath(); ctx.arc(X, Y, 0.075, 0, Math.PI * 2);
      ctx.fillStyle = on ? BULBS[n % BULBS.length] : shade(BULBS[n % BULBS.length], 0.45);
      ctx.fill();
    }
  }
}

// ---------- The karaoke ----------
// Made-up words for the screen, a line every six seconds.
const LYRICS = [
  'WE LIVE BELOW THE WATERLINE',
  'WHERE NOBODY IS GREEN',
  'FISH FINGERS EVERY DAY',
  'NOT THE BUFFET (NO NO)',
  'TIPS ARE NOT INCLUDED',
  'OUR SHIFT ENDS NEVER',
];
function stage(ctx) {
  // the stage, a banner on poles behind it, the speakers
  box(ctx, 24, 9, 0, 4, 3, 0.6, INK.flamingo, { dotsL: shade(INK.flamingo, 0.45) });
  if (Q.detail) {
    ctx.fillStyle = C.butter;
    for (let i = 0; i < 9; i++) { const [X, Y] = P(24.2 + i * 0.45, 12.02, 0.3); ctx.beginPath(); ctx.arc(X, Y, 0.05, 0, Math.PI * 2); ctx.fill(); }
  }
  for (const x of [24.1, 27.9]) box(ctx, x - 0.05, 9.0, 0.6, 0.1, 0.1, 3.1, C.ink, { flat: true, stroke: false });
  face(ctx, [[24.1, 9.05, 2.8], [27.9, 9.05, 2.8], [27.9, 9.05, 3.6], [24.1, 9.05, 3.6]], MAT.crewBlue, { lw: 0.04 });
  lettering(ctx, 'x', 26, 9.07, 3.25, 'KARAOKE', 0.4, INK.sunYellow);
  lettering(ctx, 'x', 26, 9.07, 2.93, 'TONIGHT, EVERY NIGHT AND THIS MORNING', 0.1, C.white);
  for (const x of [24.2, 27.2]) {
    box(ctx, x, 9.2, 0.6, 0.6, 0.55, 1.25, C.black, { flat: true, lw: 0.03 });
    for (const z of [1.05, 1.55]) {
      const [X, Y] = P(x + 0.3, 9.76, z);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.16, 0.18, 0, 0, Math.PI * 2); paint(ctx, shade(STEEL, 0.4), { lw: 0.02 });
    }
  }
  // steps up at the front corner
  box(ctx, 28, 11.2, 0, 0.5, 0.8, 0.3, shade(INK.flamingo, 0.15), { flat: true, lw: 0.03 });
}
function screen(ctx, t, song) {
  // the screen on its stand, off stage right
  box(ctx, 28.95, 9.55, 0, 0.1, 0.1, 1.6, C.ink, { flat: true, stroke: false });
  face(ctx, [[28.1, 9.7, 1.5], [29.9, 9.7, 1.5], [29.9, 9.7, 2.6], [28.1, 9.7, 2.6]], C.black, { lw: 0.05 });
  face(ctx, [[28.2, 9.72, 1.6], [29.8, 9.72, 1.6], [29.8, 9.72, 2.5], [28.2, 9.72, 2.5]], MAT.crewBlue, { stroke: false });
  if (!Q.detail) return;
  if (song) {
    // the machine's just been tapped: what's on next
    lettering(ctx, 'x', 29, 9.74, 2.25, 'NOW PLAYING', 0.1, INK.sunYellow);
    lettering(ctx, 'x', 29, 9.74, 1.95, song, 0.09, C.white);
    return;
  }
  const i = Math.floor(wrap(t) / 6) % LYRICS.length;
  const k = (wrap(t) % 6) / 6;
  lettering(ctx, 'x', 29, 9.74, 2.15, LYRICS[i], 0.085, C.white);
  lettering(ctx, 'x', 29, 9.74, 1.85, LYRICS[(i + 1) % LYRICS.length], 0.085, alpha(C.white, 0.5));
  // the bouncing ball over the words
  const [X, Y] = P(28.3 + k * 1.4, 9.74, 2.3 + Math.abs(Math.sin(k * Math.PI * 6)) * 0.12);
  ctx.beginPath(); ctx.arc(X, Y, 0.05, 0, Math.PI * 2); ctx.fillStyle = INK.sunYellow; ctx.fill();
}
const mic = (a) => (ctx) => {
  const [hx, hy] = hand(a);
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - 0.02, hy - 0.2);
  ctx.strokeStyle = C.black; ctx.lineWidth = 0.06; ctx.stroke();
  ctx.beginPath(); ctx.arc(hx - 0.03, hy - 0.24, 0.07, 0, Math.PI * 2); paint(ctx, STEEL, { lw: 0.02 });
};

// The karaoke machine, on the stage's front corner: a black box with a
// speaker, two knobs and a song book. Tapped, it lights up and plays the
// next song (the screen says which).
const SONGS = ['MY HEART WILL GO ON', 'ROCK THE BOAT', 'SLOOP JOHN B', 'FISH FINGERS (REMIX)'];
const KARAOKE = { x: 24.3, y: 11.05, z: 0.6, w: 0.75, d: 0.7, h: 0.62 };
function machine(ctx, t, k) {
  const { x, y, z, w, d, h } = KARAOKE;
  box(ctx, x, y, z, w, d, h, C.black, { lw: 0.03, top: shade(STEEL, 0.45) });
  // the speaker on its front, pumping when it plays
  const [X, Y] = P(x + w / 2, y + d + 0.01, z + h * 0.42);
  const pump = k > 0 ? 1 + Math.abs(Math.sin(t * 14)) * 0.12 * k : 1;
  ctx.beginPath(); ctx.ellipse(X, Y, 0.2 * pump, 0.2 * pump, 0, 0, Math.PI * 2); paint(ctx, shade(STEEL, 0.35), { lw: 0.02 });
  ctx.beginPath(); ctx.arc(X, Y, 0.07, 0, Math.PI * 2); paint(ctx, C.black, { lw: 0.015 });
  lettering(ctx, 'x', x + w / 2, y + d + 0.01, z + h * 0.88, 'SING-O-MATIC', 0.07, INK.sunYellow);
  // on top: two knobs, the slot for the songs, a song book
  for (const u of [0.18, 0.36]) disc(ctx, x + u, y + 0.2, z + h, 0.06, C.white, { lw: 0.015 });
  box(ctx, x + 0.45, y + 0.12, z + h, 0.22, 0.42, 0.06, INK.flamingo, { flat: true, lw: 0.015 });
  // its lamps: off, or chasing round when it plays
  if (!Q.detail) return;
  for (let i = 0; i < 4; i++) {
    const on = k > 0.5 && Math.floor(t * 8 + i) % 2 === 0;
    const [LX, LY] = P(x + 0.1 + i * 0.18, y + d + 0.01, z + h * 0.08);
    ctx.beginPath(); ctx.arc(LX, LY, 0.035, 0, Math.PI * 2);
    ctx.fillStyle = on ? BULBS[i] : shade(BULBS[i], 0.5); ctx.fill();
  }
}

// ---------- The time trials ----------
// Before the party the front of the bar is a racetrack: a deckhand pushes a
// laundry cart, a steward rides it, and a cook with a chequered flag at the
// finish times them. A run every 30 seconds from 7am (on your marks, the
// dash, the flag, the walk back) until half past two; at three the cart's
// parked at the start, its towels piled up, and the team goes dancing. It
// all keeps right of x 16, where the area is cut in two.
const LANE = { x0: 18.6, x1: 25, y: 14.4 };
const LAP = 30, LAST = at(14.5);
function race(t) {
  const s = wrap(t), n = Math.floor(s / LAP);
  if (s >= LAST) return { x: LANE.x0, phase: s >= PARTY ? 'party' : 'parked', n, c: s - LAST };
  const c = s % LAP;
  if (c < 4) return { x: LANE.x0, phase: 'set', n, c };
  if (c < 7.5) { const f = (c - 4) / 3.5; return { x: LANE.x0 + (LANE.x1 - LANE.x0) * f * f * (3 - 2 * f), phase: 'dash', n, c }; }
  if (c < 11) return { x: LANE.x1, phase: 'won', n, c };
  if (c < 23) return { x: LANE.x1 - (LANE.x1 - LANE.x0) * ((c - 11) / 12), phase: 'back', n, c };
  return { x: LANE.x0, phase: 'set', n, c };
}
const RACE_TOWELS = [C.sky, C.white, C.sky];
// A pennant on the cart's handle: it's a race car now.
function pennant(ctx, x, t, fast) {
  const [X, Y] = P(x - 0.05, LANE.y + 0.25, 1.53);
  ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X, Y - 0.7);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
  const fl = Math.sin(t * (fast ? 18 : 3)) * 0.04;
  ctx.beginPath(); ctx.moveTo(X, Y - 0.7); ctx.lineTo(X - 0.42, Y - 0.6 + fl); ctx.lineTo(X, Y - 0.48);
  ctx.closePath(); paint(ctx, INK.funnelRed, { lw: 0.015 });
  if (Q.detail) lettering(ctx, 'x', x - 0.25, LANE.y + 0.25, 1.53 + 0.52, '1', 0.08, C.white);
}
// The cook's flag, chequered, from the hand.
const flag = (a) => (ctx) => {
  const [hx, hy] = hand(a);
  ctx.beginPath(); ctx.moveTo(hx, hy + 0.05); ctx.lineTo(hx, hy - 0.7);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.035; ctx.stroke();
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    ctx.fillStyle = (i + j) % 2 ? C.white : C.black;
    ctx.fillRect(hx + i * 0.13, hy - 0.7 + j * 0.13, 0.13, 0.13);
  }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.015; ctx.strokeRect(hx, hy - 0.7, 0.39, 0.26);
};

// ---------- The balloons ----------
// A steward on a crate, blowing up balloons for the party, one every 16
// seconds from 7am, tied to the bunch beside him: two at breakfast, twelve
// by three. From three he stops and dances.
const BLOWER = { x: 30.8, y: 13.1 };
const BUNCH = { x: 31.6, y: 12.4 };
const BLOW = 16;
const balloons = (t) => 2 + Math.min(10, Math.floor((Math.min(wrap(t), PARTY) + 4) / BLOW));
// Where each balloon floats (seeded), and its colour.
const BALLOON = Array.from({ length: 12 }, (_, i) => ({
  dx: Math.sin(i * 2.4) * 0.45, dy: Math.cos(i * 1.7) * 0.35, z: 2.3 + (i % 4) * 0.28 + (i % 3) * 0.1, c: BULBS[(i * 3) % BULBS.length],
}));
function bunch(ctx, t, popped) {
  const n = balloons(t);
  const [AX, AY] = P(BUNCH.x, BUNCH.y, 0.42);
  // the weight: a tin of tomatoes
  cylinder(ctx, BUNCH.x, BUNCH.y, 0, 0.16, 0.42, C.red, { lw: 0.02, top: C.white });
  for (let i = 0; i < n; i++) {
    const b = BALLOON[i], sway = Math.sin(t * 1.2 + i) * 0.05;
    const [X, Y] = P(BUNCH.x + b.dx, BUNCH.y + b.dy, b.z);
    const bx = X + sway;
    ctx.beginPath(); ctx.moveTo(AX, AY); ctx.quadraticCurveTo((AX + bx) / 2 + 0.05, (AY + Y) / 2, bx, Y + 0.24);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.012; ctx.stroke();
    if (popped && i === n - 1) {
      // the one that's just been popped: a bang and a scrap
      if (!Q.detail) continue;
      ctx.strokeStyle = b.c; ctx.lineWidth = 0.04;
      ctx.beginPath();
      for (let r = 0; r < 6; r++) { const a = r * 1.05; ctx.moveTo(bx + Math.cos(a) * 0.1, Y + Math.sin(a) * 0.1); ctx.lineTo(bx + Math.cos(a) * 0.3, Y + Math.sin(a) * 0.3); }
      ctx.stroke();
      continue;
    }
    ctx.beginPath(); ctx.ellipse(bx, Y, 0.2, 0.24, sway, 0, Math.PI * 2); paint(ctx, b.c, { lw: 0.02 });
    ctx.beginPath(); ctx.moveTo(bx - 0.04, Y + 0.27); ctx.lineTo(bx + 0.04, Y + 0.27); ctx.lineTo(bx, Y + 0.22); ctx.closePath(); paint(ctx, b.c, { lw: 0.01 });
    if (Q.detail) { ctx.fillStyle = alpha(C.white, 0.6); ctx.beginPath(); ctx.ellipse(bx - 0.07, Y - 0.08, 0.04, 0.07, 0.4, 0, Math.PI * 2); ctx.fill(); }
  }
}
// The balloon at his mouth, growing (drawn over his face, facing right).
const blowing = (t) => (ctx, hy, back) => {
  if (back) return;
  const c = Math.min(wrap(t), PARTY + 1) % BLOW;
  if (wrap(t) >= PARTY || c >= 12) return;
  const r = 0.05 + Math.min(1, c / 10) * 0.24;
  const col = BALLOON[Math.min(11, balloons(t))].c;
  ctx.beginPath(); ctx.ellipse(0.36 + r, hy + 0.14 - r * 0.3, r, r * 1.1, 0, 0, Math.PI * 2); paint(ctx, col, { lw: 0.02 });
  // puffed cheeks
  ctx.beginPath(); ctx.arc(0.22, hy + 0.12, 0.07 + Math.sin(t * 5) * 0.01, 0, Math.PI * 2); ctx.fillStyle = alpha(C.coral, 0.6); ctx.fill();
};

// ---------- The pickle ----------
// On the bar, on a saucer: a big green pickle in a party hat. Not an iguana.
const PICKLE = [4.3, 9.9, 1.2];
function pickle(ctx) {
  const [x, y, z] = PICKLE;
  disc(ctx, x, y, z, 0.28, C.white, { lw: 0.02 });
  const [X, Y] = P(x, y, z + 0.02);
  ctx.save(); ctx.translate(X, Y - 0.1); ctx.rotate(-0.15);
  // the pickle: knobbly, darker underneath
  ctx.beginPath(); ctx.ellipse(0, 0, 0.3, 0.12, 0, 0, Math.PI * 2);
  paint(ctx, INK.queasyGreen, { lw: 0.025, dots: shade(INK.queasyGreen, 0.4), density: 0.3 });
  if (Q.detail) {
    ctx.fillStyle = shade(INK.queasyGreen, 0.3);
    for (const [u, v] of [[-0.18, -0.03], [-0.05, -0.07], [0.08, -0.04], [0.2, -0.06], [-0.1, 0.04], [0.12, 0.05]]) { ctx.beginPath(); ctx.arc(u, v, 0.018, 0, Math.PI * 2); ctx.fill(); }
    // a face, drawn on by somebody at the bar
    ctx.fillStyle = C.ink;
    ctx.beginPath(); ctx.arc(0.17, -0.03, 0.017, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0.17, 0.02, 0.04, 0.2, Math.PI - 0.2); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.012; ctx.stroke();
  }
  // the party hat, and its bobble
  ctx.beginPath(); ctx.moveTo(0.04, -0.1); ctx.lineTo(0.12, -0.42); ctx.lineTo(0.24, -0.08); ctx.closePath();
  paint(ctx, C.pink, { lw: 0.02, dots: C.mustard, density: 0.4 });
  ctx.beginPath(); ctx.arc(0.12, -0.43, 0.035, 0, Math.PI * 2); paint(ctx, INK.sunYellow, { lw: 0.012 });
  ctx.restore();
}

// ---------- The iguana's tail ----------
// A tapering, banded tail through screen points (smoothed): the iguana's own
// drawing in style.js keeps its tail to itself, and a hiding one needs its
// tail out somewhere else.
const IGUANA = { skin: INK.queasyGreen, dark: shade(INK.queasyGreen, 0.35) };
function lizardTail(ctx, pts, w0 = 0.075, w1 = 0.014) {
  const L = [], n = pts.length - 1;
  for (let i = 0; i < n; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)];
    for (let s = 0; s < 6; s++) {
      const u = s / 6, u2 = u * u, u3 = u2 * u;
      const f = (a, b, c, d) => 0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (3 * b - a - 3 * c + d) * u3);
      L.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  L.push(pts[n]);
  const m = L.length - 1, A = [], B = [];
  L.forEach((p, i) => {
    const q0 = L[Math.max(0, i - 1)], q1 = L[Math.min(m, i + 1)];
    const dx = q1[0] - q0[0], dy = q1[1] - q0[1], len = Math.hypot(dx, dy) || 1, w = w0 + (w1 - w0) * (i / m);
    A.push([p[0] - (dy / len) * w, p[1] + (dx / len) * w]);
    B.push([p[0] + (dy / len) * w, p[1] - (dx / len) * w]);
  });
  ctx.beginPath();
  A.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  for (let i = m; i >= 0; i--) ctx.lineTo(B[i][0], B[i][1]);
  ctx.closePath();
  paint(ctx, IGUANA.skin, { lw: 0.035 });
  if (!Q.detail) return;
  ctx.strokeStyle = IGUANA.dark; ctx.lineWidth = 0.05;
  ctx.beginPath();
  for (const k of [0.22, 0.4, 0.58, 0.76]) { const i = Math.round(k * m); ctx.moveTo(A[i][0], A[i][1]); ctx.lineTo(B[i][0], B[i][1]); }
  ctx.stroke();
}

// ---------- The bar ----------
function bar(ctx) {
  box(ctx, 3, 9, 0, 6, 1.4, 1.1, INK.teak, { dotsL: shade(INK.teak, 0.5), dens: 0.18 });
  // panels down its front
  if (Q.detail) {
    for (let x = 3.5; x < 9; x += 1) face(ctx, [[x, 10.41, 0.15], [x + 0.75, 10.41, 0.15], [x + 0.75, 10.41, 0.95], [x, 10.41, 0.95]], null, { lw: 0.02, stroke: shade(INK.teak, 0.4) });
  }
  box(ctx, 2.9, 8.95, 1.1, 6.2, 1.55, 0.1, MAT.teakDark, { flat: true, lw: 0.04 });
  // the brass foot rail
  face(ctx, [[3, 10.65, 0.25], [9, 10.65, 0.25]], null, { lw: 0.08, stroke: C.ink });
  face(ctx, [[3, 10.65, 0.25], [9, 10.65, 0.25]], null, { lw: 0.05, stroke: MAT.brass });
  lettering(ctx, 'x', 6, 10.42, 0.55, 'WHAT HAPPENS BELOW DECK', 0.15, C.butter);
  // on top: the taps, glasses, a tip jar, cans
  for (let k = 0; k < 3; k++) {
    box(ctx, 4.1 + k * 0.35, 9.3, 1.2, 0.08, 0.08, 0.55, CHROME, { flat: true, lw: 0.02 });
    box(ctx, 4.04 + k * 0.35, 9.24, 1.75, 0.2, 0.2, 0.22, [INK.funnelRed, C.mustard, C.white][k], { flat: true, lw: 0.02 });
  }
  for (let k = 0; k < 4; k++) cylinder(ctx, 6.0 + k * 0.28, 9.8, 1.2, 0.1, 0.26, alpha(MAT.glass, 0.8), { flat: true, lw: 0.02, top: C.butter });
  cylinder(ctx, 8.3, 9.7, 1.2, 0.2, 0.4, alpha(MAT.glass, 0.7), { flat: true, lw: 0.02 });
  if (Q.detail) {
    ctx.fillStyle = C.leaf;
    for (let k = 0; k < 3; k++) { const [X, Y] = P(8.25 + k * 0.05, 9.7, 1.3 + k * 0.05); ctx.fillRect(X - 0.08, Y, 0.16, 0.06); }
  }
  lettering(ctx, 'x', 8.3, 9.91, 1.35, 'TIPS', 0.08, C.ink);
  for (const x of [5.1, 7.5]) cylinder(ctx, x, 9.6, 1.2, 0.07, 0.2, INK.funnelRed, { flat: true, lw: 0.02 });
}
function backBar(ctx) {
  // a cabinet of bottles behind the barman, and the mirror over it
  box(ctx, 3, 6.6, 0, 6, 0.6, 1.05, MAT.teakDark, { dotsL: shade(MAT.teakDark, 0.5) });
  face(ctx, [[3.1, 6.62, 1.05], [8.9, 6.62, 1.05], [8.9, 6.62, 2.3], [3.1, 6.62, 2.3]], alpha(MAT.glass, 0.7), { lw: 0.04 });
  box(ctx, 3, 6.6, 1.55, 6, 0.6, 0.06, INK.teak, { flat: true, lw: 0.02 });
  box(ctx, 3, 6.6, 2.3, 6, 0.6, 0.08, INK.teak, { flat: true, lw: 0.03 });
  const cols = [C.brown, C.green, C.mustard, C.red, C.white, C.purple, C.coral, C.sky];
  for (const [z, off] of [[1.05, 0], [1.61, 3]]) {
    for (let k = 0; k < 17; k++) {
      const x = 3.25 + k * 0.33;
      const [X, Y] = P(x, 7.0, z);
      const c = cols[(k + off) % cols.length];
      ctx.beginPath();
      ctx.moveTo(X - 0.08, Y); ctx.lineTo(X - 0.08, Y - 0.3); ctx.lineTo(X - 0.03, Y - 0.42); ctx.lineTo(X + 0.03, Y - 0.42); ctx.lineTo(X + 0.08, Y - 0.3); ctx.lineTo(X + 0.08, Y);
      ctx.closePath();
      paint(ctx, c, { lw: 0.018 });
    }
  }
  lettering(ctx, 'x', 6, 7.21, 0.6, 'STAFF DISCOUNT: 100%', 0.13, C.butter);
}
function stool(ctx, x, y) {
  box(ctx, x - 0.04, y - 0.04, 0, 0.08, 0.08, 0.85, C.ink, { flat: true, stroke: false });
  disc(ctx, x, y, 0.05, 0.25, C.ink, { stroke: false });
  cylinder(ctx, x, y, 0.85, 0.28, 0.1, INK.funnelRed, { lw: 0.025 });
}

// ---------- Laundry carts ----------
function cart(ctx, x, y, towels, fancy) {
  // A canvas bin slung in a steel frame, on castors, with a push handle at the
  // stern end, heaped with towels. (Pinched in, a plain box read as greybox.)
  const x2 = x + 2, y2 = y + 1.4;
  // castors: a fork and a wheel under each corner
  for (const [cx, cy] of [[x + 0.15, y + 0.15], [x2 - 0.15, y + 0.15], [x + 0.15, y2 - 0.15], [x2 - 0.15, y2 - 0.15]]) {
    box(ctx, cx - 0.04, cy - 0.04, 0.08, 0.08, 0.08, 0.1, STEEL, { flat: true, lw: 0.015 });
    const [X, Y] = P(cx, cy, 0.07);
    ctx.beginPath(); ctx.ellipse(X, Y, 0.06, 0.08, 0, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
  }
  // the frame's bottom rail, then the canvas bin
  box(ctx, x - 0.04, y - 0.04, 0.16, 2.08, 1.48, 0.05, STEEL, { flat: true, lw: 0.02 });
  box(ctx, x + 0.04, y + 0.04, 0.21, 1.92, 1.32, 0.84, MAT.canvas, { dotsL: shade(MAT.canvas, 0.35), dens: 0.2 });
  if (Q.detail) {
    // seams down the canvas
    ctx.strokeStyle = shade(MAT.canvas, 0.3); ctx.lineWidth = 0.015;
    ctx.beginPath();
    for (const u of [0.5, 1.5]) { const [A, B] = P(x + u, y2 - 0.04, 0.25), [E, F] = P(x + u, y2 - 0.04, 1.0); ctx.moveTo(A, B); ctx.lineTo(E, F); }
    ctx.stroke();
  }
  lettering(ctx, 'x', x + 0.95, y2 - 0.03, 0.66, 'LAUNDRY', 0.18, MAT.crewBlue);
  lettering(ctx, 'x', x + 0.95, y2 - 0.03, 0.42, 'NOT A SEAT', 0.1, INK.funnelRed);
  // the frame: corner posts and the top rim
  for (const [px, py] of [[x - 0.04, y2 - 0.04], [x2 - 0.04, y2 - 0.04], [x2 - 0.04, y - 0.04]]) box(ctx, px, py, 0.16, 0.08, 0.08, 0.95, STEEL, { flat: true, lw: 0.015 });
  box(ctx, x - 0.04, y - 0.04, 1.05, 2.08, 1.48, 0.06, STEEL, { flat: true, lw: 0.03 });
  // the towels, heaped over the rim, and one hanging down the front
  for (let k = 0; k < 7; k++) {
    const [X, Y] = P(x + 0.3 + (k % 3) * 0.7 + (k > 4 ? 0.35 : 0), y + 0.3 + Math.floor(k / 3) * 0.42, 1.08 + (k > 2 && k < 5 ? 0.08 : 0));
    ctx.beginPath(); ctx.ellipse(X, Y - 0.05, 0.42, 0.22, 0.2 * (k % 2 ? 1 : -1), Math.PI, 0); ctx.closePath();
    paint(ctx, towels[k % towels.length], { lw: 0.02 });
  }
  const hang = towels[1];
  face(ctx, [[x + 1.5, y2 + 0.01, 1.1], [x + 1.86, y2 + 0.01, 1.1], [x + 1.86, y2 + 0.01, 0.72], [x + 1.5, y2 + 0.01, 0.76]], hang, { lw: 0.02 });
  if (Q.detail) face(ctx, [[x + 1.5, y2 + 0.015, 0.86], [x + 1.86, y2 + 0.015, 0.84]], null, { lw: 0.03, stroke: shade(hang, 0.25) });
  // the push handle, up off the stern end (the sleeper's head is at the other)
  for (const py of [y + 0.2, y2 - 0.2]) box(ctx, x - 0.08, py - 0.03, 1.08, 0.06, 0.06, 0.45, STEEL, { flat: true, lw: 0.015 });
  face(ctx, [[x - 0.05, y + 0.2, 1.53], [x - 0.05, y2 - 0.2, 1.53]], null, { lw: 0.1, stroke: C.ink });
  face(ctx, [[x - 0.05, y + 0.2, 1.53], [x - 0.05, y2 - 0.2, 1.53]], null, { lw: 0.06, stroke: CHROME });
  if (fancy) {
    // the towel animals nobody upstairs wanted
    towelAnimal(ctx, x + 0.5, y + 0.6, 1.15, 'swan');
    towelAnimal(ctx, x + 1.3, y + 0.5, 1.15, 'elephant');
    towelAnimal(ctx, x + 1.0, y + 1.0, 1.15, 'monkey');
  }
}

// ---------- The mess ----------
function messBench(ctx) {
  box(ctx, 26.5, 0.35, 0, 5, 0.45, 0.5, MAT.teakDark, { flat: true, lw: 0.03 });
}
function messTable(ctx) {
  for (const x of [26.8, 31.1]) box(ctx, x, 1.4, 0, 0.12, 0.6, 0.78, C.ink, { flat: true, stroke: false });
  box(ctx, 26.5, 1.1, 0.78, 5, 1.1, 0.1, C.white, { flat: true, lw: 0.04 });
  // trays of fish fingers, peas, a jug of squash
  for (const [x, food] of [[27.3, C.mustard], [28.9, C.leaf], [30.5, C.mustard]]) {
    rect(ctx, x - 0.4, 1.3, 0.8, 0.55, 0.89, STEEL, { lw: 0.02 });
    if (Q.detail) {
      ctx.fillStyle = food;
      for (let k = 0; k < 5; k++) {
        const [X, Y] = P(x - 0.25 + (k % 3) * 0.2, 1.45 + Math.floor(k / 3) * 0.2, 0.91);
        if (food === C.leaf) { ctx.beginPath(); ctx.arc(X, Y, 0.04, 0, Math.PI * 2); ctx.fill(); } else ctx.fillRect(X - 0.1, Y - 0.03, 0.2, 0.06);
      }
    }
  }
  cylinder(ctx, 29.7, 1.9, 0.88, 0.12, 0.35, alpha(C.coral, 0.85), { flat: true, lw: 0.02 });
  // a tray of lasagne, labelled
  rect(ctx, 26.7, 1.55, 0.35, 0.5, 0.89, C.coral, { lw: 0.02 });
}

// ---------- The walls ----------
function walls(ctx) {
  // the hull's pipes, under the deckhead
  for (const [z, c] of [[5.1, STEEL], [4.85, INK.funnelRed]]) {
    face(ctx, [[0, 0.02, z], [32, 0.02, z]], null, { lw: 0.2, stroke: C.ink });
    face(ctx, [[0, 0.02, z], [32, 0.02, z]], null, { lw: 0.13, stroke: c });
  }
  // portholes onto the deep
  for (const x of [1.6, 8.6, 11.6]) porthole(ctx, x, 3.6, 0.42, shade(INK.sea, 0.35));
  for (const x of [16.2, 19.6]) porthole(ctx, x, 4.0, 0.36, shade(INK.sea, 0.35));
  lifebuoy(ctx, 13.1, 2.4, 0.38);
  // the notice board
  onRight(ctx, 3, 1.5, 4.6, 2.6, C.brown, { lw: 0.05 });
  onRight(ctx, 3.12, 1.62, 4.36, 2.36, C.woodLight, { dots: C.wood, density: 0.3 });
  paintText(ctx, 'right', 5.3, 4.35, 'CREW NOTICES', 0.3, C.ink, 'Rethink Sans');
  // Have you seen this goose?
  onRight(ctx, 3.3, 2.1, 1.2, 1.6, C.white, { lw: 0.02 });
  paintText(ctx, 'right', 3.9, 3.5, 'HAVE YOU SEEN', 0.1, C.ink, 'Rethink Sans');
  paintText(ctx, 'right', 3.9, 3.35, 'THIS GOOSE?', 0.12, C.ink, 'Rethink Sans');
  {
    const [X, Y] = P(3.9, 0, 2.75);
    ctx.save(); ctx.translate(X, Y); ctx.transform(1, 0.5, 0, 1, 0, 0);
    ctx.beginPath(); ctx.ellipse(0, 0.08, 0.26, 0.16, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.02 });
    ctx.beginPath(); ctx.moveTo(0.15, 0); ctx.quadraticCurveTo(0.25, -0.25, 0.2, -0.32); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.08; ctx.stroke();
    ctx.strokeStyle = C.white; ctx.lineWidth = 0.05; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0.22, -0.34); ctx.lineTo(0.36, -0.3); ctx.lineTo(0.22, -0.28); paint(ctx, C.coral, { lw: 0.01 });
    ctx.restore();
  }
  paintText(ctx, 'right', 3.9, 2.25, 'Last seen: everywhere', 0.07, C.ink, 'Rethink Sans');
  // the rota
  onRight(ctx, 4.7, 2.0, 1.3, 1.9, C.white, { lw: 0.02 });
  paintText(ctx, 'right', 5.35, 3.7, 'ROTA', 0.15, C.ink, 'Rethink Sans');
  for (let k = 0; k < 6; k++) face(ctx, [[4.8, 0, 3.5 - k * 0.22], [5.9, 0, 3.5 - k * 0.22]], null, { lw: 0.012, stroke: C.grey });
  paintText(ctx, 'right', 5.35, 2.15, 'Everyone: working', 0.07, INK.funnelRed, 'Rethink Sans');
  // the party flyer, and the karaoke sign-up
  onRight(ctx, 6.2, 2.9, 1.2, 1.0, INK.sunYellow, { lw: 0.02 });
  paintText(ctx, 'right', 6.8, 3.6, 'PARTY 3PM', 0.14, C.ink, 'Rethink Sans');
  paintText(ctx, 'right', 6.8, 3.3, 'bring a laundry cart', 0.07, C.ink, 'Rethink Sans');
  onRight(ctx, 6.2, 1.75, 1.2, 1.0, C.pink, { lw: 0.02 });
  paintText(ctx, 'right', 6.8, 2.45, 'LOST', 0.14, C.ink, 'Rethink Sans');
  paintText(ctx, 'right', 6.8, 2.15, 'one smile. waiter.', 0.07, C.ink, 'Rethink Sans');
  // over the stores
  onRight(ctx, 14.4, 3.3, 3.6, 0.55, C.white, { lw: 0.03 });
  paintText(ctx, 'right', 16.2, 3.57, 'GALLEY STORES: TAKE NOTHING', 0.17, C.ink, 'Rethink Sans');
  // the crew mess: the sign, the menu
  onRight(ctx, 26.3, 3.8, 5.4, 1.0, INK.funnelRed, { lw: 0.04 });
  paintText(ctx, 'right', 29, 4.4, 'CREW DO NOT EAT THE BUFFET', 0.3, C.white, 'Rethink Sans');
  paintText(ctx, 'right', 29, 4.02, '(we have seen it)', 0.15, INK.sunYellow, 'Rethink Sans');
  onRight(ctx, 26.8, 1.6, 1.8, 1.8, C.black, { lw: 0.04 });
  paintText(ctx, 'right', 27.7, 3.1, 'CREW MESS', 0.17, C.white, 'Rethink Sans');
  paintText(ctx, 'right', 27.7, 2.7, 'TODAY: FISH FINGERS', 0.09, C.white, 'Rethink Sans');
  paintText(ctx, 'right', 27.7, 2.4, 'TOMORROW: FISH FINGERS', 0.09, C.white, 'Rethink Sans');
  paintText(ctx, 'right', 27.7, 2.0, 'Nobody sick since 1987', 0.08, INK.sunYellow, 'Rethink Sans');
  onRight(ctx, 29.4, 1.9, 1.5, 1.1, C.white, { lw: 0.02 });
  paintText(ctx, 'right', 30.15, 2.6, 'DAYS WITHOUT', 0.1, C.ink, 'Rethink Sans');
  paintText(ctx, 'right', 30.15, 2.4, 'A PARTY', 0.1, C.ink, 'Rethink Sans');
  paintText(ctx, 'right', 30.15, 2.12, '0', 0.24, INK.funnelRed);

  // The bulkhead (the Engine Room's side): over the door, the smile rule
  onLeft(ctx, 2.0, 3.85, 2.4, 0.5, INK.sunYellow, { lw: 0.03 });
  paintText(ctx, 'left', 3.2, 4.1, 'SMILES ON PAST THIS DOOR', 0.14, C.ink, 'Rethink Sans');
  for (let k = 0; k < 6; k++) onLeft(ctx, 1.95 + k * 0.42, 4.4, 0.21, 0.12, C.ink, { stroke: false });
  onLeft(ctx, 4.7, 1.3, 1.1, 1.4, C.white, { lw: 0.03 });
  paintText(ctx, 'left', 5.25, 2.4, 'CREW ONLY', 0.13, C.ink, 'Rethink Sans');
  paintText(ctx, 'left', 5.25, 2.1, 'yes, even', 0.1, C.ink, 'Rethink Sans');
  paintText(ctx, 'left', 5.25, 1.85, 'you, Doreen', 0.1, INK.funnelRed, 'Rethink Sans');
  // the bar's neon (lit below), the dartboard and its scores
  onLeft(ctx, 6.4, 3.7, 3.8, 1.2, C.black, { lw: 0.04 });
  onLeft(ctx, 11.6, 1.2, 1.4, 1.4, C.black, { lw: 0.03 });
  paintText(ctx, 'left', 12.3, 2.3, 'DARTS', 0.16, C.white, 'Rethink Sans');
  paintText(ctx, 'left', 12.3, 1.95, 'DECK 0: 14', 0.1, C.white, 'Rethink Sans');
  paintText(ctx, 'left', 12.3, 1.7, 'GALLEY: 301', 0.1, C.white, 'Rethink Sans');
  paintText(ctx, 'left', 12.3, 1.45, 'THE WALL: 9', 0.1, INK.sunYellow, 'Rethink Sans');
  {
    const [X, Y] = P(0, 13.8, 3.0);
    ctx.save(); ctx.translate(X, Y); ctx.transform(1, -0.5, 0, 1, 0, 0);
    // the board, pinned over the cruise director's poster
    ctx.beginPath(); ctx.rect(-0.7, -0.95, 1.4, 1.9); paint(ctx, INK.sunYellow, { lw: 0.02 });
    for (const [r, c] of [[0.55, C.black], [0.45, C.white], [0.3, C.red], [0.18, C.white], [0.07, C.red]]) {
      ctx.beginPath(); ctx.arc(0, 0.05, r, 0, Math.PI * 2); paint(ctx, c, { lw: 0.015 });
    }
    ctx.restore();
    paintText(ctx, 'left', 13.8, 3.85, 'SUNSHINES!', 0.12, C.ink, 'Rethink Sans');
  }
}

export default {
  id: 'crew-bar',
  name: 'The Crew Bar',
  blurb: 'Below the waterline, the crew are having a much better party. None of them eat at the buffet.',

  build(R) {
    deck(R, 'crew-bar', 'crew', { grid: false, name: false });

    // ---------- The floor ----------
    R.floor((ctx) => {
      // lino, checked, a warmer patch under the bar
      if (Q.detail) {
        for (let x = 0; x < 32; x++) for (let y = 0; y < 16; y++) {
          if ((x + y) % 2) rect(ctx, x, y, 1, 1, 0.002, alpha(C.white, 0.18), { stroke: false });
        }
      }
      rect(ctx, 1.8, 8.4, 8.2, 4.4, 0.003, tint(MAT.carpetRed, 0.1), { stroke: false, dots: shade(MAT.carpetRed, 0.4), density: 0.15 });
      // the dance floor's squares, unlit
      for (let x = FLOOR[0]; x < FLOOR[2]; x++) for (let y = FLOOR[1]; y < FLOOR[3] - 0.1; y += 1.3) {
        rect(ctx, x + 0.04, y + 0.04, 0.92, 1.22, 0.004, shade(MAT.crewBlue, 0.35), { lw: 0.02 });
      }
      // hazard stripes at the door
      for (let k = 0; k < 6; k++) {
        face(ctx, [[0.05, 2.1 + k * 0.4, 0.005], [0.5, 2.1 + k * 0.4, 0.005], [0.5, 2.3 + k * 0.4, 0.005], [0.05, 2.3 + k * 0.4, 0.005]], INK.sunYellow, { stroke: false });
      }
    });
    R.rug((ctx) => {
      // the mat: WELCOME BELOW
      rect(ctx, 0.6, 2.4, 1.3, 1.6, 0.01, MAT.crewBlue, { lw: 0.02 });
      paintText(ctx, 'floor', 1.25, 3.2, 'WELCOME BELOW', 0.14, C.white, 'Rethink Sans');
      // popcorn and a bottle cap, where the party was last night
      if (Q.detail) {
        ctx.fillStyle = C.butter;
        for (const [x, y] of [[21.3, 9.4], [21.6, 9.7], [9.8, 12.9], [20.2, 11.5], [8.7, 13.4]]) { const [X, Y] = P(x, y, 0.02); ctx.beginPath(); ctx.arc(X, Y, 0.06, 0, Math.PI * 2); ctx.fill(); }
        disc(ctx, 22.4, 7.2, 0.02, 0.08, INK.funnelRed, { lw: 0.01 });
      }
      // the drain
      disc(ctx, 22, 6.2, 0.01, 0.3, STEEL, { lw: 0.02 });
    });
    // The dance floor lights up: dim in the morning, busier by the hour.
    R.rug((ctx, t) => {
      const k = partyK(t);
      const beat = Math.floor(t * (partying(t) ? 4 : 1.5));
      for (let x = FLOOR[0], i = 0; x < FLOOR[2]; x++) {
        for (let y = FLOOR[1]; y < FLOOR[3] - 0.1; y += 1.3, i++) {
          const h = ((i * 7 + beat * 5) % 11) / 11;
          if (h > 0.25 + 0.55 * k) continue;
          rect(ctx, x + 0.08, y + 0.08, 0.84, 1.14, 0.006, alpha(BULBS[(i + beat) % BULBS.length], 0.35 + 0.45 * k), { stroke: false });
        }
      }
    }, { anim: true });

    // ---------- The walls ----------
    R.decor(walls);

    // ---------- The stores ----------
    PIECES.forEach(([a, b], i) => R.thing(b - 0.1, SHELF_Y1, (ctx) => shelfPiece(ctx, a, b, i), { depth: (a + b) / 2 + SHELF_Y1 }));
    // The two crates with lids, sorted just after their shelf.
    const ketchup = R.poke({ id: 'ketchup', at: [KETCHUP_X + LID.w / 2, 1.0, LID.z + 0.2], r: 0.55, sound: 'clunk', say: ['Just ketchup.', 'Still ketchup.'] });
    const shrimpBox = R.poke({ id: 'display', at: [SHRIMP_X + LID.w / 2, 1.0, LID.z + 0.2], r: 0.55, sound: 'clunk', say: ['DISPLAY ONLY. Do not eat.', 'Since 2009.'] });
    R.thing(KETCHUP_X + LID.w, LID.y1, (ctx) => lidCrate(ctx, KETCHUP_X, ketchup.k(), 'KETCHUP', C.ink, ketchupInside), { anim: true, depth: 23.3 });
    R.thing(SHRIMP_X + LID.w, LID.y1, (ctx) => lidCrate(ctx, SHRIMP_X, shrimpBox.k(), 'DISPLAY ONLY', INK.funnelRed, shrimpInside, shrimpTell), { anim: true, depth: 23.31 });

    // ---------- The Gander Cola fridge ----------
    R.thing(24.7, 1.5, (ctx) => {
      box(ctx, 23.6, 0.3, 0, 2.2, 1.15, 3.2, INK.funnelRed, { dotsL: shade(INK.funnelRed, 0.5) });
      face(ctx, [[23.75, 1.46, 0.4], [25.65, 1.46, 0.4], [25.65, 1.46, 2.6], [23.75, 1.46, 2.6]], alpha(MAT.glass, 0.85), { lw: 0.04 });
      for (let s = 0; s < 4; s++) for (let i = 0; i < 6; i++) {
        if (s === 0 && i > 1) continue; // the crew got here first
        cylinder(ctx, 24.0 + i * 0.28, 1.3, 0.5 + s * 0.52, 0.08, 0.22, INK.funnelRed, { flat: true, lw: 0.02 });
      }
      lettering(ctx, 'x', 24.7, 1.46, 2.9, 'GANDER COLA', 0.28, C.white);
      lettering(ctx, 'x', 24.7, 1.46, 0.2, 'Take a gander.', 0.14, C.white);
      face(ctx, [[25.0, 1.47, 1.6], [25.5, 1.47, 1.6], [25.5, 1.47, 2.0], [25.0, 1.47, 2.0]], C.butter, { lw: 0.015 });
      lettering(ctx, 'x', 25.25, 1.48, 1.85, 'NOT FOR', 0.06, C.ink);
      lettering(ctx, 'x', 25.25, 1.48, 1.72, 'PASSENGERS', 0.06, C.ink);
    });

    R.poke({ id: 'fridge', at: [24.7, 1.46, 1.6], r: 0.9, sound: 'clunk', say: ['NOT FOR PASSENGERS.', 'You look like a passenger.'] });

    // ---------- The mess ----------
    R.thing(29, 0.8, messBench, { depth: 20 });
    // (Sorted after the bench and everyone on it: at 31 the end eater was drawn over the table.)
    R.thing(29, 2.2, messTable, { depth: 33 });

    // ---------- The bar ----------
    R.thing(6, 7.2, backBar);
    R.thing(6, 10.4, bar);
    for (const x of [4.1, 5.6, 7.2, 8.6]) R.thing(x, 11.2, (ctx) => stool(ctx, x, 11.2));
    // The pickle in a party hat, on the bar: the iguana's lookalike down here.
    R.thing(PICKLE[0] + 0.3, PICKLE[1] + 0.3, pickle, { depth: 6 + 10.4 + 0.05 });
    R.decoy({ id: 'pickle', at: [PICKLE[0], PICKLE[1], PICKLE[2] + 0.2], r: 0.6, say: ['A pickle. In a hat. Not an iguana.', 'Still a pickle.'] });
    // The neon over it, buzzing (and now and then not).
    R.light({
      at: [0.1, 8.3, 4.3], r: 3.2, color: C.pink,
      k: (t) => (pulse(t, 13) > 0.96 ? 0.2 : 0.75),
      draw(ctx, t, k) {
        if (!Q.detail) return;
        paintText(ctx, 'left', 8.3, 4.5, 'CREW BAR', 0.62, k > 0.5 ? C.pink : shade(C.pink, 0.4));
        paintText(ctx, 'left', 8.3, 3.95, 'open when the passengers are asleep', 0.13, k > 0.5 ? C.butter : shade(C.butter, 0.4), 'Rethink Sans');
      },
    });

    // ---------- The stage ----------
    R.thing(26, 10.5, stage, { depth: 33 });
    // The karaoke machine: the thing a first visit is nudged to tap.
    const karaoke = R.poke({
      id: 'karaoke', at: [KARAOKE.x + KARAOKE.w / 2, KARAOKE.y + KARAOKE.d / 2, KARAOKE.z + 0.4], r: 0.9, teach: true, hold: 4, sound: 'ding',
      say: ['Now playing: My Heart Will Go On.', 'Now playing: Rock the Boat.', 'Now playing: Sloop John B.', 'Now playing: Fish Fingers (Remix).'],
    });
    const song = () => (karaoke.k() > 0.5 ? SONGS[(karaoke.taps + SONGS.length - 1) % SONGS.length] : null);
    R.thing(KARAOKE.x + KARAOKE.w, KARAOKE.y + KARAOKE.d, (ctx, t) => machine(ctx, t, karaoke.k()), { anim: true, depth: 37 });
    R.thing(29, 9.7, (ctx, t) => screen(ctx, t, song()), { anim: true });
    R.light({ at: [26, 10.5, 3], r: 3.5, color: C.butter, k: (t) => (wrap(t) > at(9) ? 0.55 + 0.25 * partyK(t) : 0.15) });
    R.light({ at: [14.5, 8.6, 0.5], r: 5, color: C.lilac, k: (t) => 0.2 + 0.4 * partyK(t) + (partying(t) ? 0.15 * Math.sin(t * 8) : 0) });

    // ---------- The laundry carts ----------
    R.thing(13, 13.4, (ctx) => cart(ctx, 12, 12, [C.white, C.sky, C.white], false));
    R.thing(17.5, 13.9, (ctx) => cart(ctx, 16.5, 12.5, [C.white, INK.flamingo, C.white], true));

    // ---------- Overhead ----------
    R.air(fairyLights);
    R.air(spoonBall);
    // The disco ball's specks, round the floor, from noon.
    R.air((ctx, t) => {
      if (!Q.detail || wrap(t) < at(12)) return;
      const spin = partying(t) ? t * 0.9 : t * 0.35;
      ctx.fillStyle = alpha(C.white, partying(t) ? 0.75 : 0.45);
      for (let i = 0; i < 16; i++) {
        const a = spin + i * 2.4, d = 1.5 + (i % 5) * 1.1;
        const [X, Y] = P(14.5 + Math.cos(a) * d * 1.3, 8.6 + Math.sin(a) * d * 0.8, 0.02);
        ctx.beginPath(); ctx.ellipse(X, Y, 0.1, 0.05, 0, 0, Math.PI * 2); ctx.fill();
      }
    });
    // Fish going past the portholes.
    R.air((ctx, t) => {
      if (!Q.detail) return;
      [[1.6, 3.6, 0.42, 11, 0], [8.6, 3.6, 0.42, 9, 3], [11.6, 3.6, 0.42, 9, 5.5], [16.2, 4.0, 0.36, 14, 2], [19.6, 4.0, 0.36, 14, 9]].forEach(([x, z, r, per, off], i) => {
        const k = pulse(t, per, off);
        if (k > 0.35) return;
        const [X, Y] = P(x, 0, z);
        ctx.save();
        ctx.translate(X, Y); ctx.transform(1, 0.5, 0, 1, 0, 0);
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
        const fx = -0.8 + (k / 0.35) * 1.6, fy = Math.sin(t * 3 + i) * 0.08;
        const col = [C.mustard, C.coral, C.sky, C.butter, C.pink][i];
        ctx.beginPath(); ctx.ellipse(fx, fy, 0.2, 0.1, 0, 0, Math.PI * 2);
        ctx.moveTo(fx - 0.18, fy); ctx.lineTo(fx - 0.32, fy - 0.1); ctx.lineTo(fx - 0.32, fy + 0.1); ctx.closePath();
        paint(ctx, col, { lw: 0.02 });
        ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(fx + 0.1, fy - 0.02, 0.025, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
    });
    // Notes off the speakers once someone's singing; bubbles from 3pm.
    R.air((ctx, t) => {
      if (!Q.detail || wrap(t) < at(9)) return;
      particles(t, 5, 2.4, (k, r) => {
        const x = 24.5 + r() * 3, y = 9.5;
        note(ctx, x + k * 0.6, y, 2.0 + k * 2.2, alpha(C.ink, 1 - k), 0.8);
      }, 21);
      if (!partying(t)) return;
      particles(t, 14, 4, (k, r) => {
        const x = 24.3 + r() * 1.5 - k * 5 * r(), y = 11.6 + r() * 0.5 - k * 3;
        const [X, Y] = P(x, y, 1 + k * 3.5 + Math.sin(k * 9 + r() * 6) * 0.2);
        ctx.beginPath(); ctx.arc(X, Y, 0.08 + r() * 0.08, 0, Math.PI * 2);
        ctx.strokeStyle = alpha(C.white, 0.9 * (1 - k)); ctx.lineWidth = 0.025; ctx.stroke();
      }, 22);
    });
    // Darts, one every few seconds, from nine.
    R.air((ctx, t) => {
      if (!Q.detail || wrap(t) < at(9) + 3) return;
      const k = pulse(t, 2.6);
      if (k < 0.55 || k > 0.68) return;
      const f = (k - 0.55) / 0.13;
      const [X, Y] = P(3.0 - f * 2.95, 13.7, 2.4 + f * 0.65 + Math.sin(f * Math.PI) * 0.3);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.04;
      ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + 0.2, Y - 0.1); ctx.stroke();
    });
    // The darts in the board, and the ones in the wall.
    R.decor((ctx) => {
      if (!Q.detail) return;
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.035;
      for (const [y, z] of [[13.7, 3.1], [13.95, 2.95], [12.9, 3.8], [14.9, 2.3], [13.2, 4.1]]) {
        const [X, Y] = P(0.02, y, z);
        ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + 0.18, Y + 0.05); ctx.stroke();
      }
    });

    // ---------- The crew ----------
    // The barman, shaking something all day. (Not a Green Mermaid.)
    const shake = (t) => [2.7 + Math.sin(t * 16) * 0.2, 2.5 - Math.sin(t * 16) * 0.2];
    crew(R, 201, { ...WHITES, style: 'short' }, (t) => ({ x: 6, y: 8.3, dir: 'l', arms: shake(t), hold: shaker(t) }), { wear: bowTie });
    // The bouncer by the door: arms folded, a clipboard, opinions.
    crew(R, 202, { ...NAVY, style: 'bald' }, (t) => {
      const s = wrap(t);
      const p = { x: 1.2, y: 1.2, dir: 'l', arms: [1.4, 1.35] };
      if ((s > 133 && s < 137) || (s > 205 && s < 209)) return { ...p, dir: 'l', pose: 'point', arms: null, say: s < 150 ? 'Crew only, madam.' : 'Still crew only.' };
      if (s > 146 && s < 149.5) return { ...p, dir: 'r', say: 'Chef.' };
      if (s > 91 && s < 94) return { ...p, say: 'Doc.' };
      return p;
    }, { scale: 1.08 });
    // Breakfast in the mess, then lunch, then more fish fingers.
    const eat = (off) => (t) => [0.9 + Math.max(0, Math.sin(t * 2.4 + off)) * 1.3, 0.4];
    crew(R, 203, { ...WHITES }, (t) => ({ x: 27.6, y: 0.75, z: -0.2, pose: 'sit', dir: 'l', arms: eat(0)(t) }));
    crew(R, 204, { ...GALLEY }, (t) => ({ x: 30.3, y: 0.75, z: -0.2, pose: 'sit', dir: 'l', arms: eat(2)(t) }));
    crew(R, 205, { ...NAVY, style: 'pony' }, (t) => {
      const s = wrap(t);
      if (s < at(12)) return { hide: true, x: 29, y: 0.75 };
      return { x: 29, y: 0.75, z: -0.2, pose: 'sit', dir: 'l', arms: eat(4)(t) };
    }, { wear: bib });
    // On the first laundry cart: asleep on the towels (night shift), up at
    // eleven with a paperback, dancing on it at three.
    crew(R, 206, { ...WHITES, style: 'curly' }, (t) => {
      const s = wrap(t);
      if (s < at(11)) return { x: 13, y: 12.6, z: 1.15, pose: 'sleep', dir: 'l', ahead: 1 };
      if (s < PARTY + 2) return { x: 13, y: 12.9, z: 0.45, pose: 'sit', dir: 'l', ahead: 1, arms: [1.0, 0.9], hold: book };
      return { x: 13, y: 12.8, z: 1.1, pose: 'dance', dir: 'l', ahead: 1 };
    });
    // On the second: sits from half past eleven, dances on it from three.
    crew(R, 207, { ...NAVY }, (t) => {
      const s = wrap(t);
      if (s < at(11.5)) return { hide: true, x: 17.4, y: 13.2 };
      if (s < PARTY + 3) return { x: 17.3, y: 13.3, z: 0.45, pose: 'sit', dir: 'r', ahead: 1, arms: [0.6 + Math.max(0, Math.sin(t * 2)) * 1.2, 0.5], hold: canHold };
      return { x: 17.4, y: 13.1, z: 1.1, pose: 'cheer', dir: 'r', ahead: 1 };
    }, { wear: bib });
    // Darts, from nine, a throw every 2.6 seconds.
    crew(R, 208, { ...NAVY, style: 'short' }, arrive(at(9), [[2.2, 12.2]], {
      x: 3.1, y: 13.7, dir: 'l', back: true, arms: (t) => { const k = pulse(t, 2.6); return k < 0.4 ? [2.4 + k, 0.2] : k < 0.58 ? [1.4, 0.2] : [0.6, 0.2]; },
    }), { wear: bib });
    // Two at the bar: from half past nine, and eleven.
    crew(R, 209, { ...WHITES, style: 'long' }, arrive(at(9.5), [[2.2, 11.8], [4.1, 11.9]], { x: 4.1, y: 11.2, z: 0.25, pose: 'sit', dir: 'r', back: true, ahead: 0.05 }));
    crew(R, 210, { ...GALLEY }, arrive(at(11), [[2.2, 11.8], [7.2, 11.9]], { x: 7.2, y: 11.2, z: 0.25, pose: 'sit', dir: 'l', back: true, arms: [1.6, 0.3], hold: canHold, ahead: 0.05 }));
    // The karaoke: one singer from nine, a duet from three.
    const SING = (t) => [2.4, Math.PI - 0.6 + Math.sin(t * 3) * 0.5];
    crew(R, 211, { ...WHITES, style: 'bun' }, arrive(at(9), [[9.8, 5.8], [22, 8], [28.2, 12.3], [27, 10.6]], {
      x: 25.6, y: 10.4, z: 0.6, pose: 'dance', dir: 'l', ahead: 2, arms: SING, hold: mic(2.4),
    }), { speed: 4 });
    crew(R, 212, { ...NAVY, style: 'short' }, arrive(PARTY + 6, [[9.8, 5.8], [22, 8], [28.2, 12.3], [27.4, 11]], {
      x: 27.0, y: 10.9, z: 0.6, pose: 'dance', dir: 'l', ahead: 2, arms: SING, hold: mic(2.4),
    }), { wear: bib, speed: 5 });
    // On the dance floor: one from ten, two more from noon.
    crew(R, 213, { ...WHITES, style: 'pony' }, arrive(at(10), [[9.8, 5.8]], { x: 11.8, y: 7.4, pose: 'dance', dir: 'r' }));
    crew(R, 214, { ...GALLEY }, arrive(at(12), [[9.8, 5.8]], { x: 15.4, y: 9.4, pose: 'dance', dir: 'l' }), { speed: 9 });
    crew(R, 215, { ...NAVY, style: 'curly' }, arrive(at(12.5), [[9.8, 5.8]], { x: 16.6, y: 7.5, pose: 'dance', dir: 'l' }), { wear: bib, speed: 5 });
    // Cards on a cable drum, for fish fingers, from ten.
    R.thing(7.5, 14.4, (ctx) => {
      cylinder(ctx, 7.5, 14.2, 0, 0.75, 0.75, C.wood, { lw: 0.03, top: C.woodLight });
      disc(ctx, 7.5, 14.2, 0.76, 0.25, shade(C.wood, 0.2), { lw: 0.02 });
      lettering(ctx, 'x', 7.5, 14.95, 0.4, 'HIGH STAKES', 0.1, C.ink);
      // the pot: fish fingers
      for (let k = 0; k < 5; k++) box(ctx, 7.2 + (k % 3) * 0.15, 13.95 + Math.floor(k / 3) * 0.2, 0.77 + Math.floor(k / 3) * 0.04, 0.3, 0.08, 0.05, C.mustard, { flat: true, lw: 0.012 });
      for (const [x, y] of [[7.9, 14.4], [7.7, 14.6]]) rect(ctx, x, y, 0.16, 0.24, 0.77, C.white, { lw: 0.012 });
    });
    for (const [x, y] of [[6.3, 14.2], [8.7, 14.4], [8.2, 15.2]]) R.thing(x, y + 0.2, (ctx) => box(ctx, x - 0.3, y - 0.25, 0, 0.6, 0.5, 0.45, C.woodLight, { flat: true, lw: 0.02, top: shade(C.wood, 0.2) }), { depth: x + y - 0.3 });
    const cards = (ctx) => {
      for (let k = 0; k < 4; k++) {
        ctx.save(); ctx.translate(0.3, -0.3); ctx.rotate(-0.5 + k * 0.3);
        ctx.beginPath(); ctx.rect(-0.05, -0.2, 0.1, 0.16); paint(ctx, C.white, { lw: 0.01 });
        ctx.restore();
      }
    };
    crew(R, 216, { ...NAVY, style: 'short' }, arrive(at(10), [[2.5, 12.8], [5.6, 13.3]], { x: 6.3, y: 14.2, z: -0.2, pose: 'sit', dir: 'r', hold: cards, arms: [1.2, 0.8] }), { wear: bib });
    crew(R, 217, { ...WHITES, style: 'bald' }, arrive(at(10.5), [[2.5, 12.8], [9.4, 13.3]], { x: 8.7, y: 14.4, z: -0.2, pose: 'sit', dir: 'l', hold: cards, arms: [1.2, 0.8] }));
    crew(R, 218, { ...GALLEY }, arrive(at(13), [[2.5, 12.8], [5.6, 15.8]], { x: 8.2, y: 15.2, z: -0.2, pose: 'sit', dir: 'r', back: true, arms: (t) => [1.1 + Math.max(0, Math.sin(t * 1.3)) * 0.6, 0.6] }));

    // Ping pong, from noon: a table, a net, a ball going back and forth.
    R.thing(22.5, 14.2, (ctx) => {
      for (const [x, y] of [[21.2, 12.7], [23.8, 12.7], [21.2, 13.9], [23.8, 13.9]]) box(ctx, x - 0.04, y - 0.04, 0, 0.08, 0.08, 0.72, C.ink, { flat: true, stroke: false });
      box(ctx, 21, 12.5, 0.72, 3, 1.6, 0.06, MAT.crewBlue, { flat: true, lw: 0.03 });
      face(ctx, [[21.05, 13.3, 0.79], [23.95, 13.3, 0.79]], null, { lw: 0.02, stroke: C.white });
      face(ctx, [[22.5, 12.5, 0.78], [22.5, 14.1, 0.78], [22.5, 14.1, 0.98], [22.5, 12.5, 0.98]], alpha(C.white, 0.6), { lw: 0.02 });
    });
    R.thing(22.5, 13.6, (ctx, t) => {
      if (wrap(t) < at(12) + 6) return;
      const k = pulse(t, 1.6);
      const f = k < 0.5 ? k * 2 : 2 - k * 2;
      const x = 21.1 + f * 2.8, y = 13.3 + Math.sin(t * 1.9) * 0.3;
      const hop = Math.abs(Math.sin(f * Math.PI * 2)) * 0.5;
      const [X, Y] = P(x, y, 0.82 + hop);
      ctx.beginPath(); ctx.arc(X, Y, 0.06, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.015 });
    }, { anim: true, depth: 22.5 + 14.2 + 0.1 });
    const bat = (ctx) => { ctx.beginPath(); ctx.ellipse(0.55, -0.05, 0.11, 0.14, 0, 0, Math.PI * 2); paint(ctx, C.red, { lw: 0.015 }); };
    const swing = (off) => (t) => { const k = pulse(t, 1.6, off); return [1.1 + (k < 0.12 ? Math.sin((k / 0.12) * Math.PI) * 0.8 : 0), 0.3]; };
    crew(R, 219, { ...WHITES, style: 'pony' }, arrive(at(12), [[9.8, 5.8], [19.8, 11.8]], { x: 20.3, y: 13.3, dir: 'r', arms: swing(0), hold: bat }));
    crew(R, 220, { ...NAVY }, arrive(at(12), [[9.8, 5.8], [20, 11.6], [25, 12.4]], { x: 24.7, y: 13.3, dir: 'l', arms: swing(0.8), hold: bat }, 1.9), { wear: bib });

    // The sofa, made of old life jackets. Feet up from one.
    R.thing(29.2, 15.1, (ctx) => {
      box(ctx, 27.6, 14.1, 0, 3.2, 1.0, 0.5, INK.sunYellow, { dotsL: shade(INK.sunYellow, 0.4) });
      box(ctx, 27.6, 14.1, 0.5, 3.2, 0.25, 0.9, INK.funnelRed, { dotsL: shade(INK.funnelRed, 0.4) });
      for (let k = 0; k < 3; k++) box(ctx, 27.7 + k * 1.05, 14.38, 0.5, 0.95, 0.68, 0.18, INK.sunYellow, { flat: true, lw: 0.025, top: tint(INK.sunYellow, 0.2) });
      if (Q.detail) for (let k = 0; k < 3; k++) lettering(ctx, 'x', 28.15 + k * 1.05, 14.91, 0.28, 'LIFE JACKET', 0.07, C.ink);
    }, { depth: 29.2 + 14.3 });
    crew(R, 221, { style: 'long', dress: false, hat: 'none' }, arrive(at(13), [[9.8, 5.8], [26.8, 13.4]], { x: 28.4, y: 14.7, z: -0.1, pose: 'sit', dir: 'l', arms: [1.3, 0.5], hold: canHold, ahead: 0.6 }));
    crew(R, 222, { ...WHITES }, arrive(at(14.2), [[9.8, 5.8], [26.8, 13.4], [29.9, 13.5]], { x: 29.9, y: 14.7, z: 0.7, pose: 'sleep', dir: 'l', ahead: 0.6 }));

    // Three o'clock: the off-shift crew, a conga, straight in through the door.
    conga(R);
    // The waiter.
    waiter(R);
    // Before three: the laundry cart time trials along the front, and the balloons.
    timeTrials(R);
    balloonMan(R);

    // ---------- The finds ----------
    // The chase, sighting 6 (the crew party): in the parked race cart, in the
    // towels. Its crest and eye show over them, and its tail hangs down the
    // front of the cart. Three carts, and nobody's dancing on this one.
    sighting(R, 5, {
      at: [LANE.x0 + 1.0, LANE.y + 0.55, 1.0], kind: 'hard', bias: 1.2,
      hint: 'Three laundry carts. Nobody is dancing on one of them.',
      draw(ctx, t, p) {
        // its tail first, out from under the towels and down the front
        const [A, B] = P(LANE.x0 + 0.4, LANE.y + 1.42, 1.12), sw = Math.sin(t * 1.1) * 0.03;
        lizardTail(ctx, [[A, B - 0.06], [A - 0.04, B + 0.2], [A + 0.02 + sw, B + 0.45], [A + 0.16 + sw, B + 0.52], [A + 0.2 + sw, B + 0.4]], 0.07, 0.014);
        // it, standing in the towels, bobbing its head to the music
        iguana(ctx, p.x, p.y, p.z, 'r', t, {});
        // and the towels piled back over its legs and belly
        // (in screen units from its feet: up to just under its crest, and
        // under its chin, so the spikes and the head show over the towels)
        const [FX, FY] = P(p.x, p.y, p.z);
        for (const [dx, dy, rx, ry, c] of [[-0.85, 0.02, 0.36, 0.2, C.sky], [-0.38, -0.08, 0.36, 0.29, C.white], [0.06, -0.06, 0.3, 0.3, C.sky], [0.48, 0.0, 0.3, 0.16, C.white], [-0.15, 0.1, 0.42, 0.22, C.white]]) {
          ctx.beginPath(); ctx.ellipse(FX + dx, FY + dy, rx, ry, 0, Math.PI, 0); ctx.closePath();
          paint(ctx, c, { lw: 0.02 });
          if (Q.detail) { ctx.beginPath(); ctx.ellipse(FX + dx + 0.04, FY + dy - ry * 0.35, rx * 0.55, ry * 0.4, 0, Math.PI * 1.1, Math.PI * 1.7); ctx.strokeStyle = shade(c, 0.2); ctx.lineWidth = 0.015; ctx.stroke(); }
        }
      },
      // the getaway: out of the cart, across the dance floor, out the door to the Engine Room
      run: [[LANE.x0 + 1.2, LANE.y - 0.35, 0], [19.7, 11.6, 0], [9.8, 5.8, 0], [1.3, DOOR_Y, 0], [0.3, DOOR_Y, 0]],
    });
    R.find({ id: 'plastic-shrimp', label: 'A box of plastic shrimp', kind: 'poke', inside: shrimpBox, at: [SHRIMP_X + LID.w / 2, 1.0, LID.z + 0.2], r: 0.8, hint: "Chef Gaston's tower needs spares. The stores have them, if you can get the lid off." });
    R.find({ id: 'spoon-ball', label: 'A disco ball made of spoons', kind: 'spot', at: [14, 7, 5], r: 0.75 });
  },
};

// Held things, from a spot by the near shoulder.
function shaker(t) {
  return (ctx) => {
    const [hx, hy] = hand(2.7 + Math.sin(t * 16) * 0.2);
    ctx.beginPath(); ctx.moveTo(hx - 0.09, hy + 0.05); ctx.lineTo(hx - 0.06, hy - 0.35); ctx.lineTo(hx + 0.06, hy - 0.35); ctx.lineTo(hx + 0.09, hy + 0.05); ctx.closePath();
    paint(ctx, CHROME, { lw: 0.02 });
  };
}
function book(ctx) {
  ctx.beginPath(); ctx.rect(0.1, -0.35, 0.34, 0.26); paint(ctx, C.coral, { lw: 0.02 });
}
function canHold(ctx) {
  ctx.beginPath(); ctx.rect(0.28, -0.72, 0.12, 0.2); paint(ctx, INK.funnelRed, { lw: 0.015 });
}

// ---------- The conga ----------
// In through the door at 3pm, four times round the dance floor, and out
// again just before seven. Hands on the shoulders of the one in front.
function conga(R) {
  const loop = [];
  const a0 = Math.atan2((6.4 - RING.y) / RING.ry, (9.6 - RING.x) / RING.rx);
  const laps = 4, n = 16;
  for (let i = 0; i <= laps * n; i++) {
    const a = a0 - (i / n) * Math.PI * 2;
    loop.push([RING.x + Math.cos(a) * RING.rx, RING.y + Math.sin(a) * RING.ry]);
  }
  const p = path([...IN, [5, 4.6], [9.6, 6.4], ...loop, [9.6, 6.4], [5, 4.6], [1.3, DOOR_Y], [-0.8, DOOR_Y]]);
  const t0 = PARTY, t1 = at(18.9);
  const v = p.L / (t1 - t0);
  // Off shift, so in their own clothes (and party hats), still never green.
  const LOOKS = [
    [{ hat: 'party' }, null], [{ hat: 'party' }, null], [{ ...GALLEY }, null], [{ hat: 'party', dress: false }, null],
    [{ ...NAVY, hat: 'party' }, bib], [{ hat: 'party', dress: false }, null],
  ];
  LOOKS.forEach(([look, wear], i) => {
    crew(R, 230 + i, look, (t) => {
      const s = wrap(t);
      const d = (s - t0) * v - i * 1.15;
      if (s < t0 || d < 0 || d > p.L) return { hide: true, x: -5, y: DOOR_Y };
      const w = p.at(d);
      if (w.x < 0) return { hide: true, x: w.x, y: w.y };
      // the leader waves everyone on; the rest hold on and kick
      const kick = Math.sin(t * 6 + i) > 0.7;
      return { ...w, pose: i === 0 ? 'cheer' : 'walk', moving: true, arms: i === 0 ? null : [1.45, 1.35], speed: kick ? 12 : 7 };
    }, { wear });
  });
}

// ---------- The waiter ----------
// Every 50 seconds: in through the door with a tray and the customer smile,
// the smile drops, he dances with his eyes shut, the smile goes back on (all
// the teeth), and he goes back up.
function waiter(R) {
  const skin = folk(240).skin;
  const inPath = path([...IN, [9.8, 5.8], [13.2, 9.6]]);
  const outPath = path([[13.2, 9.6], [9.8, 5.8], [1.3, DOOR_Y], [-0.8, DOOR_Y]]);
  const V = 2.2, T_IN = inPath.L / V, T_OUT = outPath.L / V;
  const tray = (ctx) => {
    ctx.beginPath(); ctx.ellipse(0.1, -0.02, 0.36, 0.1, 0.1, 0, Math.PI * 2);
    paint(ctx, CHROME, { lw: 0.025 });
  };
  crew(R, 240, { ...WHITES, style: 'short' }, (t) => {
    const s = pulse(t, 50, 12) * 50;
    const t1 = T_IN, t2 = t1 + 1.6, t3 = t2 + 11, t4 = t3 + 1.2, t5 = t4 + 0.9, t6 = t5 + T_OUT;
    if (s < t1) {
      const w = inPath.at(s * V);
      return { ...w, pose: 'walk', moving: true, face: faceOf('smile', skin), hold: tray, arms: [0.9, 0.3], hide: w.x < 0 };
    }
    const spot = { x: 13.2, y: 9.6 };
    if (s < t2) return { ...spot, dir: 'l', face: faceOf('flat', skin), hold: tray, arms: [0.05, -0.05] };
    if (s < t3) return { ...spot, dir: 'l', pose: 'dance', face: faceOf('happy', skin), speed: 8 };
    if (s < t4) return { ...spot, dir: 'l', face: faceOf('flat', skin), hold: tray, arms: [0.9, 0.3] };
    if (s < t5) return { ...spot, dir: 'l', face: faceOf('smile', skin), hold: tray, arms: [0.9, 0.3], say: 'Welcome aboard!' };
    if (s < t6) {
      const w = outPath.at((s - t5) * V);
      return { ...w, pose: 'walk', moving: true, face: faceOf('smile', skin), hold: tray, arms: [0.9, 0.3], hide: w.x < 0 };
    }
    return { hide: true, x: -5, y: DOOR_Y };
  }, { wear: bowTie });
}

// ---------- The time trials ----------
// The cart (its rider sorted just after it), the deckhand pushing, and the
// cook at the finish with the flag. race() is the clock.
function timeTrials(R) {
  R.mover((t) => { const r = race(t); return { x: r.x + 1, y: LANE.y + 0.7, r }; }, (ctx, t, p) => {
    const { r } = p, x = r.x;
    cart(ctx, x, LANE.y, RACE_TOWELS, false);
    pennant(ctx, x, t, r.phase === 'dash');
    if (r.phase === 'dash' && Q.detail) {
      // speed lines off the back
      ctx.strokeStyle = alpha(C.ink, 0.5); ctx.lineWidth = 0.03;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const [A, B] = P(x - 0.7 - (i % 2) * 0.4, LANE.y + 0.3 + i * 0.3, 0.3 + (i % 3) * 0.3);
        ctx.moveTo(A, B); ctx.lineTo(A - 0.6, B - 0.3);
      }
      ctx.stroke();
    }
  }, { bias: 0.7 });

  // The rider: up on the towels, arms up for the dash; off at three, to dance.
  const toDance = path([[LANE.x0 + 1.2, LANE.y - 0.3], [19.8, 11.9], [19.6, 11.4]]);
  crew(R, 250, { ...WHITES, style: 'pony' }, (t) => {
    const r = race(t);
    if (r.phase === 'party') {
      const d = r.c * 1.6;
      if (d < toDance.L) return { ...toDance.at(d), pose: 'walk', moving: true };
      return { x: 19.6, y: 11.4, pose: 'dance', dir: 'l' };
    }
    const seat = { x: r.x + 1.1, y: LANE.y + 0.75, z: 0.5, pose: 'sit', dir: 'r', ahead: 0.7 };
    if (r.phase === 'dash') return { ...seat, arms: [2.8 + Math.sin(t * 9) * 0.1, 2.6] };
    if (r.phase === 'won') return { ...seat, arms: [2.9, 2.9], say: r.c < 9.5 ? (r.n % 2 ? 'Faster!' : 'Again!') : null };
    if (r.phase === 'back') return { ...seat, dir: 'l', arms: [0.9, 0.7] };
    return { ...seat, arms: [0.9, 0.7] };
  });

  // The pusher, behind the handle. At three he parks it and goes to dance.
  const pushDance = path([[LANE.x0 - 0.55, LANE.y + 0.7], [LANE.x0 - 0.6, 14.15], [16.2, 14.1], [15.6, 12.0], [15.3, 11.7]]);
  crew(R, 251, { ...NAVY, style: 'curly' }, (t) => {
    const r = race(t);
    if (r.phase === 'party') {
      const d = r.c * 1.6;
      if (d < pushDance.L) return { ...pushDance.at(d), pose: 'walk', moving: true };
      return { x: 15.3, y: 11.7, pose: 'dance', dir: 'r' };
    }
    const at0 = { x: r.x - 0.55, y: LANE.y + 0.7, dir: 'r', arms: [1.5, 1.4] };
    if (r.phase === 'dash') return { ...at0, pose: 'run', moving: true, speed: 14 };
    if (r.phase === 'back') return { ...at0, pose: 'walk', moving: true, dir: 'l', back: true };
    if (r.phase === 'won') return { ...at0, pose: 'cheer', arms: null };
    // On your marks: stretching, one arm then the other.
    return { ...at0, arms: Math.sin(t * 2) > 0 ? [Math.PI - 0.2, 0.2] : [0.2, Math.PI - 0.2] };
  }, { wear: bib });

  // The cook with the flag, and opinions.
  const verdict = ['New record!', 'Disqualified.', 'Photo finish!', 'Wheel fell off. Allowed.'];
  crew(R, 252, { ...GALLEY }, (t) => {
    const r = race(t);
    const p = { x: 27.2, y: 13.1, dir: 'l' };
    if (r.phase === 'party') return { ...p, pose: 'dance', hold: flag(2.6) };
    if (r.phase === 'dash' && r.c > 6.5) { const a = 2.4 + Math.sin(t * 20) * 0.4; return { ...p, arms: [a, 0.3], hold: flag(a) }; }
    if (r.phase === 'won') return { ...p, arms: [2.5, 0.3], hold: flag(2.5), say: r.c < 10 ? verdict[r.n % verdict.length] : null };
    return { ...p, arms: [0.8, 0.3], hold: flag(0.8) };
  });
}

// ---------- The balloon man ----------
function balloonMan(R) {
  // his crate, and the bunch on its tin (tap it: one pops)
  R.thing(BLOWER.x + 0.3, BLOWER.y + 0.3, (ctx) => box(ctx, BLOWER.x - 0.3, BLOWER.y - 0.3, 0, 0.6, 0.6, 0.45, C.woodLight, { lw: 0.025, top: shade(C.wood, 0.15) }));
  const pop = R.poke({ id: 'balloons', at: [BUNCH.x, BUNCH.y, 2.6], r: 0.9, hold: 1.5, say: ['POP.', "That one was the captain's.", 'Stop popping the party.'] });
  R.thing(BUNCH.x + 0.2, BUNCH.y + 0.2, (ctx, t) => bunch(ctx, t, pop.k() > 0.3), { anim: true });
  crew(R, 253, { ...WHITES, style: 'bald' }, (t) => {
    if (wrap(t) >= PARTY) return { x: BLOWER.x, y: BLOWER.y + 0.5, pose: 'dance', dir: 'r' };
    const c = wrap(t) % BLOW;
    return { x: BLOWER.x, y: BLOWER.y, z: -0.15, pose: 'sit', dir: 'r', face: blowing(t), arms: c < 12 ? [1.9, 1.7] : [0.5 + (c - 12) * 0.3, 0.4] };
  });
}
