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
  alley: mix(C.night, C.brown, 0.28),
  cobble: mix(C.night, C.purple, 0.25),
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

// How much the lamps and the things standing on a street dim at night: a
// little (they're lit by the lamps and the rooms), never to black.
export const NIGHT_DIM = 0.28;

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

// Greybox blocks on the streets: one color per kind of thing. (For anything
// still being laid out.)
export const BLOCK = {
  party: C.coral, // the stage and everything for the party
  street: C.navy, // lamp posts, bins, signs
  stall: C.mustard, // carts and stands
  green: C.green,
};

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
  [20.5, mix(C.pink, C.purple, 0.62)], // dusk
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
// A lit window or doorway at night, and a closed one.
export const LIT = C.butter;
export const DIM = mix(C.navy, C.lilac, 0.25);

// ---------- Shared props ----------
const P = (x, y, z) => [x - y, (x + y) / 2 - z * ZK];

// A lamp post: a pole and a lamp, lit at night. (x, y) in the area's own units.
// Draw it with lit = 0 as a still thing, and its glow with R.light.
export function lampPost(ctx, x, y, lit = 0) {
  box(ctx, x - 0.15, y - 0.15, 0, 0.3, 0.3, 4.4, C.navy, { flat: true });
  box(ctx, x - 0.4, y - 0.4, 4.4, 0.8, 0.8, 0.45, lit > 0.5 ? C.butter : C.white, { flat: true });
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

// A canopy over a door on a back wall, on four thin poles, striped in the
// room's two colors, standing on the street outside (so it still shows when
// the wall drops to waist height). side: 'left' (the wall at x = 0, so the
// street is at x < 0) or 'right' (y = 0). at: the middle of the door along
// the wall; w: how wide; out: how far it reaches into the street.
export function canopy(ctx, side, at, w, out, stripes, z = 3.4) {
  const L = side === 'left';
  const pt = (u, v, zz) => (L ? [-v, u, zz] : [u, -v, zz]); // u along the wall, v out from it
  const a = at - w / 2, b = at + w / 2;
  for (const [u, v] of [[a, out], [b, out]]) {
    const [x, y] = pt(u, v, 0);
    box(ctx, x - 0.06, y - 0.06, 0, 0.12, 0.12, z, C.ink, { flat: true, stroke: false });
  }
  const n = Math.max(3, Math.round(w / 0.5));
  for (let i = 0; i < n; i++) {
    const u0 = a + (i / n) * w, u1 = a + ((i + 1) / n) * w;
    face(ctx, [pt(u0, 0, z + 0.6), pt(u1, 0, z + 0.6), pt(u1, out, z), pt(u0, out, z)], stripes[i % 2], { lw: 0.03 });
  }
  // The valance: a scalloped front edge.
  for (let i = 0; i < n; i++) {
    const u0 = a + (i / n) * w, u1 = a + ((i + 1) / n) * w;
    face(ctx, [pt(u0, out, z), pt(u1, out, z), pt(u1, out, z - 0.35), pt(u0, out, z - 0.35)], stripes[i % 2], { lw: 0.03 });
  }
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
