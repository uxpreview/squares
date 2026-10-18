// Departures: the style sheet. Every area takes its colors and shared props from
// here, so the whole level stays one plate. The inks come from the brief
// (docs/levels/logan.md, "Palette and plate"): a cold harbor plate in late
// November, the airport's own signal colors and Thanksgiving's cranberry. Add
// recurring props (a plane, a sign, a character's look) here once, rather than
// in each area.
import { C, Q, box, rect, alpha, tint, shade } from '../../engine/art.js';
import { tag, block } from '../greybox.js';
import { PLANE } from './plan.js';

export const INK = {
  harbor: '#55819A',
  tarmac: '#5B5F6E',
  concrete: '#CFC8B8',
  signal: '#F2C230',
  safety: '#EE7A31',
  cranberry: '#A8364A',
  snow: '#F3F1EA',
};

// The paper this level is printed on: the harbor (decision 19: one harbor all
// day in the greybox; the day's plate is for the art).
export const PAPER = INK.harbor;
// Water inside an area (the dock's corner, under the pier, along the seawall):
// a shade lighter than the paper, so it reads as the shallows.
export const WATER = tint(INK.harbor, 0.18);

// Greybox floor tones: landside, the terminal's carpet, airside concrete,
// tarmac, so the plan reads at a glance.
export const TONE = {
  curb: tint(INK.concrete, 0.25),
  road: tint(INK.tarmac, 0.35),
  terminal: tint(INK.cranberry, 0.62),
  hall: tint(INK.concrete, 0.4),
  bags: tint(INK.concrete, 0.1),
  apron: tint(INK.concrete, 0.05),
  grass: tint(C.green, 0.45),
  strip: INK.tarmac,
};
export const BLOCK = {
  wall: tint(INK.snow, 0.2),
  desk: tint(INK.cranberry, 0.25),
  belt: shade(INK.tarmac, 0.1),
  machine: tint(INK.harbor, 0.35),
  vehicle: INK.signal,
  safety: INK.safety,
  plane: INK.snow,
  seat: tint(INK.harbor, 0.5),
  sign: INK.signal,
};

// A greybox toy plane (decision 10), nose to the back at (x, nose), tail to
// the front: its pieces as separate things so people sort round it. o: { name,
// z, color }. For a plane that moves, draw it with drawPlane.
export function plane(R, x, nose, o = {}) {
  const { len, span, body } = PLANE;
  const z = o.z ?? 0, c = o.color || BLOCK.plane;
  // Nose and cabin, the wings, the tail and its fin.
  R.thing(x, nose + 3, (ctx) => box(ctx, x - body / 2, nose, z + 0.6, body, 6, body, c, { flat: true }));
  R.thing(x, nose + 7.5, (ctx) => {
    box(ctx, x - span / 2, nose + 6, z + 1.1, span, 3, 0.35, shade(c, 0.06), { flat: true });
    box(ctx, x - body / 2, nose + 6, z + 0.6, body, 3, body, c, { flat: true });
  });
  R.thing(x, nose + len - 1.5, (ctx) => {
    box(ctx, x - body / 2, nose + 9, z + 0.6, body, len - 9, body * 0.85, c, { flat: true });
    box(ctx, x - 0.2, nose + len - 2.2, z + 0.6 + body * 0.85, 0.4, 2, 2.6, INK.cranberry, { flat: true });
    box(ctx, x - 3, nose + len - 1.6, z + 1.6, 6, 1.2, 0.25, shade(c, 0.06), { flat: true });
    if (o.name && Q.detail) tag(ctx, x, nose + 4, z + 4.2, o.name);
  });
}

// The same plane in one piece, for one that moves (along x on the runway, or
// across the apron). dir: 'x' (nose to -x, a takeoff to the left) or 'y'
// (nose to -y, parked at a gate).
export function drawPlane(ctx, x, y, z, dir = 'y', o = {}) {
  const { len, span, body } = PLANE;
  const c = o.color || BLOCK.plane;
  if (dir === 'y') {
    box(ctx, x - body / 2, y, z + 0.6, body, len, body, c, { flat: true });
    box(ctx, x - span / 2, y + 6, z + 1.1, span, 3, 0.35, shade(c, 0.06), { flat: true });
    box(ctx, x - 0.2, y + len - 2.2, z + 0.6 + body, 0.4, 2, 2.6, INK.cranberry, { flat: true });
  } else {
    box(ctx, x, y - body / 2, z + 0.6, len, body, body, c, { flat: true });
    box(ctx, x + 6, y - span / 2, z + 1.1, 3, span, 0.35, shade(c, 0.06), { flat: true });
    box(ctx, x + len - 2.2, y - 0.2, z + 0.6 + body, 2, 0.4, 2.6, INK.cranberry, { flat: true });
  }
  if (o.name && Q.detail) tag(ctx, x + (dir === 'y' ? 0 : 4), y + (dir === 'y' ? 4 : 0), z + 4.4, o.name);
}

// A long block (a counter, a low wall, a row of seats, a belt) in short
// pieces along its long side, so each sorts on its own and nobody standing
// beside it is painted over (QA's covered check). Same arguments as the
// greybox's block; the name goes on the first piece.
export function run(R, x, y, w, d, h, color, name, o = {}) {
  const along = w >= d, len = along ? w : d, n = Math.max(1, Math.ceil(len / (o.step || 3)));
  for (let i = 0; i < n; i++) {
    const a = (len * i) / n, b = (len * (i + 1)) / n;
    if (along) block(R, x + a, y, b - a, d, h, color, i ? null : name, o);
    else block(R, x, y + a, w, b - a, h, color, i ? null : name, o);
  }
}

// Painted lines on the ground (taxiway yellow, a rope maze, a lane), flat.
export function line(ctx, x, y, w, d, color = INK.signal) {
  rect(ctx, x, y, w, d, 0.01, color, { stroke: false });
}

// A patch of water inside an area: the harbor, a shade lighter.
export function water(ctx, x, y, w, d) {
  rect(ctx, x, y, w, d, 0, WATER, { stroke: false });
  rect(ctx, x, y, w, d, 0.005, alpha(C.white, 0.08), { stroke: false });
}
