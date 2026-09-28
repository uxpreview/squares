// The Block Party: the style sheet. Every street, and every room's street
// front, takes its colors and shared props from here. The Block's plate is the
// game's own: the cream paper and the six inks in C (src/engine/art.js),
// halftone dots, the registration marks. The streets add a grey-lilac road ink
// with cream kerbs, and the bunting is in the six inks. The brief:
// docs/levels/block.md.
//
// A day on the Block changes the plate itself: warm at dawn, full at noon, a
// pink sunset at the party, navy at night. At night the streets are printed
// in their night inks (STREET_NIGHT) while the rooms stay lit, so every find
// reads at any hour (block.md, decision 14).
import { C, Q, mix, tint, shade, box, rect, face, paint, paintText } from '../../engine/art.js';
import { ZK } from '../../engine/iso.js';
import { nightK } from './clock.js';

// ---------- The streets, by day and by night ----------
export const STREET = {
  road: mix(C.grey, C.lilac, 0.35),
  roadDots: shade(mix(C.grey, C.lilac, 0.35), 0.25),
  line: C.white,
  kerb: C.white,
  alley: mix(C.greyLight, C.brown, 0.18),
  cobble: shade(mix(C.greyLight, C.brown, 0.18), 0.12),
  pavement: tint(C.greyLight, 0.25),
  paving: shade(tint(C.greyLight, 0.25), 0.1), // the joints between slabs
  slab: C.grey,
  drain: shade(C.grey, 0.4),
};
// The same, in night inks: navy and lilac, printed dark, so the lit rooms and
// the lamps glow against them. The same keys as STREET.
export const STREET_NIGHT = {
  road: mix(C.navy, C.purple, 0.3),
  roadDots: mix(C.night, C.purple, 0.2),
  line: mix(C.butter, C.lilac, 0.45),
  kerb: mix(C.lilac, C.navy, 0.35),
  // a step darker than the road, a step lighter than the night paper
  alley: mix(mix(C.navy, C.brown, 0.2), C.lilac, 0.14),
  cobble: mix(C.night, C.purple, 0.3),
  pavement: mix(C.navy, C.lilac, 0.38),
  paving: mix(C.navy, C.lilac, 0.22),
  slab: mix(C.night, C.purple, 0.35),
  drain: C.night,
};

// Print something flat on a street twice: in the day inks (a still layer,
// drawn once), and in the night inks over it, fading in with the dark (cached
// too, and only stamped while it shows). draw(ctx, inks) gets STREET or
// STREET_NIGHT. layer: 'floor' or 'rug'.
export function printed(R, draw, layer = 'rug') {
  R[layer]((ctx) => draw(ctx, STREET));
  R[layer]((ctx) => draw(ctx, STREET_NIGHT), { fade: nightK });
}

// The streets take no R.dark on top of their night inks: the engine only
// darkens a street's ground, which the night inks already print, and doing it
// twice sank the alleys into the night paper. The night is printed, not dimmed.

// ---------- The party ----------
// The stage at the crossing: the hero, seen from the whole block.
export const STAGE_INK = {
  deck: C.coral,
  skirt: C.red, // the front of the deck
  boards: shade(C.coral, 0.2),
  backdrop: C.purple, // the tall flat behind the band
  backdropDots: shade(C.purple, 0.35),
  sign: C.butter, // "BLOCK PARTY" on the backdrop
  truss: C.ink, // the lighting rig
  lights: [C.pink, C.butter, C.tealLight, C.coralLight],
  banner: C.white, // the laundromat's sheet
};
// The party's own light at sunset: pink, not amber (block.md, decision 16).
export const PARTY_LIGHT = C.pink;

// The six inks, for bunting.
export const BUNTING = [C.coral, C.mustard, C.teal, C.navy, C.blush, C.purple];

// ---------- The day's plate ----------
// The paper through the day, by the hour. day.js blends between them.
export const PAPER = [
  [0, C.night],
  [4, C.night],
  [5.5, mix(C.paper, C.blush, 0.55)], // dawn
  [8, C.paper],
  [17, C.paper],
  [19, mix(C.paper, C.pink, 0.38)], // the party, a pink sunset
  [20, mix(C.paper, C.pink, 0.5)], // still pink for the party's first hour
  [21, mix(C.pink, C.purple, 0.62)], // dusk
  [22, C.night],
  [24, C.night],
];

// ---------- The rooms' street fronts ----------
// Each room shows the street who it is: a sign on a post or a canopy by its
// door (the walls drop to waist height on the overview, so nothing painted
// high on them shows from outside). Its colors, from its own walls: the
// canopy's two stripes, the sign's board and its lettering.
export const FRONT = {
  observatory: { stripes: [C.navy, C.butter], board: C.navy, ink: C.butter },
  launchpad: { stripes: [C.coral, C.white], board: C.white, ink: C.coral },
  pool: { stripes: [C.teal, C.white], board: C.tealLight, ink: C.white }, // the Lido
  arcade: { stripes: [C.purple, C.pink], board: C.navy, ink: C.pink },
  greenhouse: { stripes: [C.green, C.white], board: C.green, ink: C.white },
  disco: { stripes: [C.pink, C.purple], board: C.night, ink: C.pink },
  library: { stripes: [C.brown, C.butter], board: C.brown, ink: C.butter },
  icerink: { stripes: [C.sky, C.white], board: C.white, ink: C.navy },
  noodles: { stripes: [C.red, C.butter], board: C.red, ink: C.butter },
  bakery: { stripes: [C.blush, C.white], board: C.white, ink: C.coral },
  laundromat: { stripes: [C.teal, C.mint], board: C.mint, ink: C.teal },
  ballpit: { stripes: [C.mustard, C.coral], board: C.mustard, ink: C.navy },
  umbrellas: { stripes: [C.lilac, C.mint], board: C.lilac, ink: C.navy },
  aquarium: { stripes: [C.water, C.navy], board: C.navy, ink: C.tealLight },
  band: { stripes: [C.mustard, C.ink], board: C.ink, ink: C.mustard },
  trains: { stripes: [C.red, C.green], board: C.green, ink: C.butter },
};
// A lit window, doorway or lamp at night.
export const LIT = C.butter;

// ---------- Shared props ----------
const P = (x, y, z) => [x - y, (x + y) / 2 - z * ZK];

// A lamp post: a pole and a lamp, lit at night. (x, y) in the area's own units.
// Draw it with lit = 0 as a still thing, and its glow with R.light.
// (As slim as the fronts' sign posts, so the streets and the fronts are one hand.)
export function lampPost(ctx, x, y, lit = 0) {
  box(ctx, x - 0.11, y - 0.11, 0, 0.22, 0.22, 4.4, C.navy, { flat: true });
  lampHead(ctx, x, y, lit > 0.5 ? LIT : C.white);
}
function lampHead(ctx, x, y, color) {
  box(ctx, x - 0.32, y - 0.32, 4.4, 0.64, 0.64, 0.4, color, { flat: true });
  box(ctx, x - 0.38, y - 0.38, 4.8, 0.76, 0.76, 0.08, C.navy, { flat: true });
}
// A whole street lamp on an area: the post (with a goose poster on it, if
// asked), its lamp lit from dusk, and its glow. Every street's lamps are
// these, so they all light up together. All still: only the glow is drawn
// each frame, and only at night.
export function streetLamp(R, x, y, withPoster = false) {
  R.thing(x, y, (ctx) => { lampPost(ctx, x, y); if (withPoster) poster(ctx, x + 0.16, y + 0.16, 2.35); });
  R.thing(x + 0.01, y + 0.01, (ctx) => lampHead(ctx, x, y, LIT), { on: (t) => nightK(t) >= 0.3 });
  R.light({ at: [x, y, 4.6], r: 3, color: LIT, k: nightK });
}

// A "Have you seen this goose?" poster, facing the viewer, on a post at height z.
export function poster(ctx, x, y, z) {
  if (!Q.detail) return;
  const X = x - y, Y = (x + y) / 2 - z * ZK;
  ctx.beginPath();
  ctx.rect(X - 0.45, Y - 0.6, 0.9, 1.1);
  paint(ctx, C.white, { lw: 0.04 });
  ctx.beginPath();
  ctx.ellipse(X, Y - 0.05, 0.22, 0.16, 0, 0, Math.PI * 2);
  ctx.fillStyle = C.ink;
  ctx.fill();
}

// The laundromat's lost sock, flat to the viewer at screen (X, Y), s across:
// white, two coral stripes, a teal toe. The same sock the Courier hands over
// at the end (finale.js draws its own copy; it could use this one).
export function lostSock(ctx, X, Y, s = 1) {
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(-0.15, -0.7);
  ctx.lineTo(0.15, -0.7);
  ctx.lineTo(0.15, -0.05);
  ctx.quadraticCurveTo(0.2, 0.18, 0.5, 0.15);
  ctx.quadraticCurveTo(0.62, 0.3, 0.45, 0.35);
  ctx.lineTo(-0.05, 0.35);
  ctx.quadraticCurveTo(-0.2, 0.3, -0.15, 0.05);
  ctx.closePath();
  ctx.fillStyle = C.white;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = C.coral;
  for (const v of [-0.55, -0.3]) ctx.fillRect(-0.3, v, 0.6, 0.1);
  ctx.fillStyle = C.teal;
  ctx.fillRect(0.1, 0.05, 0.6, 0.4);
  ctx.restore();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.05 / s;
  ctx.stroke();
  ctx.restore();
}

// A string of bunting from a to b (world or area units, [x, y, z]), sagging.
export function bunting(ctx, a, b, t = 0, n = 14) {
  const at = (k) => {
    const sag = Math.sin(k * Math.PI) * 0.9;
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k - sag];
  };
  ctx.beginPath();
  for (let i = 0; i <= 20; i++) {
    const [X, Y] = P(...at(i / 20));
    i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
  }
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.05;
  ctx.stroke();
  for (let i = 1; i < n; i++) {
    const [X, Y] = P(...at(i / n));
    const sway = Math.sin(t * 2 + i) * 0.05;
    ctx.beginPath();
    ctx.moveTo(X - 0.28, Y);
    ctx.lineTo(X + 0.28, Y);
    ctx.lineTo(X + sway, Y + 0.6);
    ctx.closePath();
    paint(ctx, BUNTING[i % BUNTING.length], { lw: 0.03 });
  }
}

// Lettering painted on an upright face: along 'x' (the face runs along x at
// y, looking to the viewer's lower left) or 'y' (along y at x, looking to the
// lower right), centred on the spot along it, z up. Only close enough to read.
export function words(ctx, along, x, y, z, text, size, ink, font) {
  if (!Q.detail) return;
  ctx.save();
  const [dx, dy] = along === 'x' ? P(0, y, 0) : P(x, 0, 0);
  ctx.translate(dx, dy);
  paintText(ctx, along === 'x' ? 'right' : 'left', along === 'x' ? x : y, z, text, size, ink, font);
  ctx.restore();
}

// Draw flat in the floor's plane, in world units, from (x, y), turned by a
// (a card dropped on the pavement, a print in the alley).
export function onFloor(ctx, x, y, a, draw) {
  ctx.save();
  ctx.transform(1, 0.5, -1, 0.5, x - y, (x + y) / 2);
  ctx.rotate(a);
  draw();
  ctx.restore();
}

// A traffic cone, h tall, standing at (x, y). The same cone on every street.
export function cone(ctx, x, y, h = 0.85) {
  box(ctx, x - 0.3, y - 0.3, 0, 0.6, 0.6, 0.08, C.coral, { flat: true, lw: 0.03 });
  const [X, Y] = P(x, y, 0.08), [, T] = P(x, y, h);
  ctx.beginPath();
  ctx.moveTo(X - 0.3, Y); ctx.lineTo(X - 0.05, T); ctx.lineTo(X + 0.05, T); ctx.lineTo(X + 0.3, Y);
  ctx.closePath();
  paint(ctx, C.coral, { lw: 0.03 });
  ctx.fillStyle = C.white;
  ctx.fillRect(X - 0.18, (Y + T) / 2 - 0.06, 0.36, 0.12);
}

// A board with lettering on it, upright, in the plane along x ('x': it faces
// the viewer's lower left) or along y ('y': the lower right), centred on
// (x, y, z), w wide and h tall. o: { board, ink, size, font, edge }
export function board(ctx, along, x, y, z, w, h, text, o = {}) {
  const pts = along === 'x'
    ? [[x - w / 2, y, z - h / 2], [x + w / 2, y, z - h / 2], [x + w / 2, y, z + h / 2], [x - w / 2, y, z + h / 2]]
    : [[x, y - w / 2, z - h / 2], [x, y + w / 2, z - h / 2], [x, y + w / 2, z + h / 2], [x, y - w / 2, z + h / 2]];
  face(ctx, pts, o.board || C.white, { lw: o.edge ?? 0.05 });
  if (!text || !Q.detail) return;
  ctx.save();
  // paintText draws on the planes through the corner; move there.
  const [dx, dy] = along === 'x' ? P(0, y, 0) : P(x, 0, 0);
  ctx.translate(dx, dy);
  paintText(ctx, along === 'x' ? 'right' : 'left', along === 'x' ? x : y, z, text, o.size || h * 0.55, o.ink || C.ink, o.font);
  ctx.restore();
}

// A step and a mat outside a door, on the street side. side, at, w: as canopy.
export function doorstep(ctx, side, at, w, mat = C.brown) {
  const L = side === 'left';
  const pt = (u, v) => (L ? [-v, u] : [u, -v]);
  const [x0, y0] = pt(at - w / 2 - 0.1, 0.55), [x1, y1] = pt(at + w / 2 + 0.1, 0);
  box(ctx, Math.min(x0, x1), Math.min(y0, y1), 0, Math.abs(x1 - x0), Math.abs(y1 - y0), 0.12, C.greyLight, { flat: true });
  const [m0, n0] = pt(at - w / 2 + 0.25, 1.35), [m1, n1] = pt(at + w / 2 - 0.25, 0.6);
  rect(ctx, Math.min(m0, m1), Math.min(n0, n1), Math.abs(m1 - m0), Math.abs(n1 - n0), 0.01, mat, { lw: 0.03 });
}
