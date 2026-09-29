// The Greenhouse's front. Its door is in the right wall at x 12.5, onto the
// alley between rows A and B (the street is y < 0; people walk 2 out, so
// anything on the ground stays within 1.2 of the wall). A trellis arch round
// the door with a vine gone over the top, a pot either side, and a giant seed
// packet on a stake past the door (the wall's own sign is inside, on the left
// wall). Open 6am to 6pm; from 7am to 10am it's the morning watering: a queue
// at the tap, and someone watering the snoozer by mistake.
import { C, Q, P, box, cylinder, face, paint, person, folk, plant, speech, shade, alpha, mix } from '../../../engine/art.js';
import { FRONT, board, doorstep, LIT } from '../style.js';
import { open, nightK } from '../clock.js';
import { extras, openCard } from './kit.js';

const ID = 'greenhouse';
const INK = FRONT[ID];
const TERRA = mix(C.coral, C.brown, 0.35); // the room's terracotta
const A = 11.25, B = 13.75; // the arch's posts, either side of the door (x 11.4 to 13.6)
const V = 0.2; // just out from the glass
const TOP = 3.3;
const SX = 15.2, SV = 0.35; // the seed packet's stake

// A watering can, held out in front (a person's hold, in their own units).
// pour: the water running out of the spout, as a dashed arc to the ground.
function can(c, t, pour, color = C.green) {
  c.beginPath();
  c.roundRect(-0.05, -0.28, 0.42, 0.34, 0.05);
  paint(c, color, { lw: 0.035 });
  c.beginPath();
  c.moveTo(0.34, -0.05); c.lineTo(0.72, -0.34);
  c.strokeStyle = C.ink; c.lineWidth = 0.09; c.stroke();
  c.strokeStyle = color; c.lineWidth = 0.05; c.stroke();
  c.beginPath(); c.arc(0.14, -0.32, 0.13, Math.PI, 0);
  c.strokeStyle = C.ink; c.lineWidth = 0.04; c.stroke();
  if (!pour || !Q.detail) return;
  c.beginPath();
  for (let i = 0; i < 6; i++) {
    const k = ((t * 1.6 + i / 6) % 1);
    const x = 0.75 + k * 0.45, y = -0.3 + k * k * 1.5;
    c.moveTo(x, y); c.lineTo(x + 0.05, y + 0.14);
  }
  c.strokeStyle = alpha(C.water, 0.9); c.lineWidth = 0.05; c.stroke();
}

export default function (R) {
  const pt = (u, v, z) => [u, -v, z]; // u along the wall, v out into the alley

  // A step and a green mat.
  R.thing(12.5, -0.05, (ctx) => doorstep(ctx, 'right', 12.5, 2.2, C.green));

  // The trellis: two posts, a curved top, and the vine that has taken it over.
  const post = (ctx, u) => box(ctx, u - 0.08, -V - 0.08, 0, 0.16, 0.16, TOP, C.white, { flat: true, lw: 0.03 });
  R.thing(A, -V, (ctx) => post(ctx, A));
  R.thing(B, -V + 0.02, (ctx) => {
    post(ctx, B);
    // the arch, lattice on the flat
    const arc = [];
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI;
      arc.push(pt((A + B) / 2 - Math.cos(a) * (B - A) / 2, V, TOP + Math.sin(a) * 0.7));
    }
    face(ctx, arc, null, { lw: 0.16, stroke: C.ink });
    face(ctx, arc, null, { lw: 0.09, stroke: C.white });
    // the vine: up the far post, over the top, halfway down the near one
    const vine = [];
    for (let i = 0; i <= 30; i++) {
      const k = i / 30;
      let u, z;
      if (k < 0.3) { u = A + Math.sin(k * 30) * 0.08; z = (k / 0.3) * TOP; }
      else if (k < 0.8) { const a = ((k - 0.3) / 0.5) * Math.PI; u = (A + B) / 2 - Math.cos(a) * (B - A) / 2; z = TOP + Math.sin(a) * 0.7; }
      else { u = B + Math.sin(k * 30) * 0.08; z = TOP - ((k - 0.8) / 0.2) * 1.6; }
      vine.push([u, z]);
    }
    ctx.beginPath();
    vine.forEach(([u, z], i) => { const [X, Y] = P(...pt(u, V + 0.05, z)); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    ctx.strokeStyle = C.green; ctx.lineWidth = 0.07; ctx.stroke();
    vine.forEach(([u, z], i) => {
      if (i % 2) return;
      const [X, Y] = P(...pt(u, V + 0.06, z));
      ctx.beginPath(); ctx.ellipse(X + (i % 4 ? 0.12 : -0.12), Y - 0.04, 0.16, 0.09, i % 4 ? -0.6 : 0.6, 0, Math.PI * 2);
      paint(ctx, i % 3 ? C.leaf : C.green, { lw: 0.025 });
      if (i % 6 === 0 && Q.detail) {
        ctx.beginPath(); ctx.arc(X, Y - 0.12, 0.08, 0, Math.PI * 2); paint(ctx, i % 12 ? C.pink : C.butter, { lw: 0.02 });
      }
    });
  });
  // OPEN or CLOSED, hung on the far post.
  openCard(R, ID, 'x', A, -V - 0.1, 1.7, [A + 0.01, -V + 0.01]);

  // A pot either side of the door: a bush past it (under the seed packet),
  // and a sunflower before it that has grown as tall as the door.
  R.thing(14.4, -0.45, (ctx) => plant(ctx, 14.4, -0.45, 0, 0, { kind: 'bush', scale: 0.9, potColor: TERRA, leaf: C.leaf }));
  R.thing(10.4, -0.45, (ctx) => {
    const x = 10.4, y = -0.45, top = 3.2;
    cylinder(ctx, x, y, 0, 0.35, 0.55, TERRA, { top: C.brown });
    face(ctx, [[x, y, 0.55], [x + 0.05, y, top - 0.2]], null, { lw: 0.08, stroke: C.green });
    for (const [z, s] of [[1.2, 1], [1.9, -1], [2.5, 1]]) {
      const [X, Y] = P(x, y, z);
      ctx.beginPath(); ctx.ellipse(X + s * 0.22, Y, 0.24, 0.1, s * -0.5, 0, Math.PI * 2); paint(ctx, C.leaf, { lw: 0.025 });
    }
    const [X, Y] = P(x + 0.05, y, top);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath(); ctx.ellipse(X + Math.cos(a) * 0.3, Y + Math.sin(a) * 0.3, 0.17, 0.08, a, 0, Math.PI * 2);
      paint(ctx, C.mustard, { lw: 0.02 });
    }
    ctx.beginPath(); ctx.arc(X, Y, 0.2, 0, Math.PI * 2); paint(ctx, C.brown, { lw: 0.03, dots: C.ink, density: 0.4 });
  });

  // The seed packet on its stake: PLANTS, from the far end of the alley; up
  // close, the small print.
  R.thing(SX, -SV, (ctx) => {
    box(ctx, SX - 0.07, -SV - 0.07, 0, 0.14, 0.14, 2.4, C.brown, { flat: true, lw: 0.03 });
    const x0 = SX - 1.05, x1 = SX + 0.75, z0 = 2.2, z1 = 4.7, y = -SV - 0.1;
    // the packet: a white body, a green band with the name, a flower on it
    face(ctx, [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], C.white, { lw: 0.05 });
    face(ctx, [[x0, y, z1 - 0.95], [x1, y, z1 - 0.95], [x1, y, z1], [x0, y, z1]], INK.board, { lw: 0.04, dots: shade(INK.board, 0.35), density: 0.12 });
    // the crimped top
    if (Q.detail) {
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const [X, Y] = P(x0 + ((x1 - x0) * i) / 12, y, z1 + (i % 2 ? 0.12 : 0));
        i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      }
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.04; ctx.stroke();
    }
    board(ctx, 'x', (x0 + x1) / 2, y - 0.01, z1 - 0.47, x1 - x0 - 0.1, 0.8, 'PLANTS', { board: INK.board, ink: INK.ink, size: 0.56, edge: 0 });
    // a flower
    const [X, Y] = P(x0 + 0.5, y - 0.01, z0 + 0.8);
    face(ctx, [[x0 + 0.5, y - 0.01, z0 + 0.1], [x0 + 0.5, y - 0.01, z0 + 0.7]], null, { lw: 0.06, stroke: C.green });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath(); ctx.arc(X + Math.cos(a) * 0.17, Y + Math.sin(a) * 0.17, 0.13, 0, Math.PI * 2); paint(ctx, C.pink, { lw: 0.025 });
    }
    ctx.beginPath(); ctx.arc(X, Y, 0.1, 0, Math.PI * 2); paint(ctx, C.butter, { lw: 0.025 });
    // the small print
    board(ctx, 'x', x0 + 1.15, y - 0.01, z0 + 0.95, 1.1, 0.3, 'ALL FOR SALE', { board: C.white, ink: C.ink, size: 0.17, edge: 0, font: 'Rethink Sans' });
    board(ctx, 'x', x0 + 1.15, y - 0.01, z0 + 0.6, 1.1, 0.3, 'EXCEPT THE', { board: C.white, ink: C.coral, size: 0.15, edge: 0, font: 'Rethink Sans' });
    board(ctx, 'x', x0 + 1.15, y - 0.01, z0 + 0.33, 1.1, 0.3, 'PUMPKIN', { board: C.white, ink: C.coral, size: 0.2, edge: 0 });
  });

  // The doorway glows at night while it's open (only at dawn, really).
  R.light({ at: [12.5, 0.4, 1.6], r: 2.6, color: LIT, k: (t) => nightK(t) * open(ID, t) });

  // ---------- The morning watering, 7am to 10am ----------
  // In through the door: two queue for the tap with empty cans, one waters the
  // tomatoes, and one waters the snoozer in the deck chair (he doesn't notice).
  const IN = [[12.5, 0.1], [13.6, 1.0]];
  const waterer = (seed, top, pour, color, dir, back, hat, say) => ({
    draw: (ctx, t, p) => {
      const w = p.walk;
      const pouring = !w && pour;
      person(ctx, p.x, p.y, 0, folk(seed, {
        pose: w ? 'walk' : 'stand', dir: w ? p.dir : dir, back: w ? p.back : back, top, hat,
        arms: w ? undefined : pouring ? [1.9, 1.2] : [1.2, 0.9],
        hold: (c) => can(c, t, pouring, color),
      }), t);
      if (!w && say && Q.detail) { const s = say(t); if (s) speech(ctx, p.x, p.y, 2.7, s, { size: 0.4 }); }
    },
  });
  extras(R, ID, [
    { path: [...IN, [14.35, 1.25]], ...waterer(701, C.mustard, false, C.teal, 'r', true, 'sun') },
    { path: [...IN, [14.0, 2.35]], delay: 0.15, ...waterer(702, C.lilac, false, C.coral, 'r', true, 'none', (t) => (Math.sin(t * 0.8) > 0.75 ? 'IS IT ON?' : null)) },
    { path: [...IN, [13.6, 4.5], [12.7, 6.2], [12.9, 7.3]], delay: 0.05, ...waterer(703, C.coral, true, C.green, 'r', true, 'cap', (t) => (Math.sin(t * 0.6 + 1) > 0.8 ? 'LOOKING DRY' : null)) },
    { path: [...IN, [13.6, 4.5], [12.7, 6.2], [12.9, 8.3], [13.2, 9.3]], delay: 0.25, ...waterer(704, C.sky, true, C.teal, 'r', false, 'sun') },
  ]);
}
