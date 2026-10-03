// The ship's shared pieces: lettering and signs, portholes, loungers, the
// buckets, the Green Mermaid, towel animals, lifebuoys, gulls, and the
// passengers who turn green on the day's clock. Every area draws with these,
// so the ship is one hand. All in the area's own units (standing on its deck
// at z 0), like the rest of an area.
//
// board, lettering and gull are Plum Island's (src/maps/plum/kit.js), copied
// rather than imported so the ship doesn't load the island's land.
import { C, Q, box, face, person, paint, paintText, alpha, shade, folk, cylinder } from '../../engine/art.js';
import { ZK } from '../../engine/iso.js';
import { INK, MAT, queasy, green, chase, chaseOpen, CHASE, iguana } from './style.js';

export const P = (x, y, z = 0) => [x - y, (x + y) / 2 - z * ZK];
// A flat shape through points, filled and outlined.
export function shape(ctx, pts, fill, o) {
  ctx.beginPath();
  pts.forEach((p, i) => { const [X, Y] = P(...p); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
  ctx.closePath();
  paint(ctx, fill, o);
}

// ---------- Drawing flat on a plane ----------
// (The areas each wrote these; now they share one, so the ship's signs and
// lines are drawn by one hand.)
// Flat on an upright plane facing the lower left (y fixed): the origin is the
// top left corner at (x, y, z), u runs along +x, v down.
export function onY(ctx, x, y, z, draw) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.transform(1, 0.5, 0, ZK, X, Y);
  draw(ctx);
  ctx.restore();
}
// The same facing the lower right (x fixed): the origin is the top left
// corner as we see it (the high-y end), and u runs along -y.
export function onX(ctx, x, y, z, draw) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.transform(1, -0.5, 0, ZK, X, Y);
  draw(ctx);
  ctx.restore();
}
// A bow area's far wall (the Bridge, Adults Only, the Casino, the Sick Bay,
// each 32 long): straight to x 16, then angling in to the point at 32.
export const farY = (x) => (x <= 16 ? 0 : (x - 16) / 2);
// Flat on that wall where it angles in (x past 16): u runs along the wall,
// one unit for each unit of x, v down.
export function onBow(ctx, x, z, draw) {
  const [X, Y] = P(x, farY(x) + 0.03, z);
  ctx.save();
  ctx.transform(0.5, 0.75, 0, ZK, X, Y);
  draw(ctx);
  ctx.restore();
}
// Words in whatever units the context is in (onY and the rest), centred on (u, v).
export function words(ctx, s, u, v, size, color = C.ink, align = 'center', weight = 700, font = 'Rethink Sans') {
  if (!Q.detail) return;
  ctx.save();
  ctx.translate(u, v);
  ctx.scale(1 / 40, 1 / 40);
  ctx.font = `${weight} ${size * 40}px "${font}", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(s, 0, 0);
  ctx.restore();
}
// A line through screen points, inked: the ship's one outline (ink 0.06
// wider than the colour) under a coloured stroke.
export function inked(ctx, pts, color, w, cap = 'round') {
  ctx.beginPath();
  pts.forEach(([X, Y], i) => (i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y)));
  ctx.lineCap = cap;
  ctx.lineJoin = 'round';
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = w + 0.06; ctx.stroke(); }
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
}
// Where a person's hand is on screen, given the arm's angle (the engine's
// person: 0 hangs down, PI points up, positive swings toward where they
// face). near: the arm on our side. s: the person's scale.
export function hand(x, y, z, dir, a, near = true, s = 1) {
  const f = dir === 'l' ? -1 : 1;
  const hx = (near ? 0.22 : -0.22) + Math.sin(a) * 0.72, hy = -1.53 + Math.cos(a) * 0.72;
  const [X, Y] = P(x, y, z);
  return [X + f * s * hx, Y + s * hy];
}

// ---------- Words ----------
// Lettering painted on an upright plane: along x (facing the lower left) or
// y (the lower right), centred on (x, y, z).
export function lettering(ctx, along, x, y, z, text, size, ink = C.ink, font = 'Rethink Sans') {
  if (!Q.detail) return;
  ctx.save();
  const [dx, dy] = along === 'x' ? P(0, y, 0) : P(x, 0, 0);
  ctx.translate(dx, dy);
  paintText(ctx, along === 'x' ? 'right' : 'left', along === 'x' ? x : y, z, text, size, ink, font);
  ctx.restore();
}

// A board with lettering on it, upright, along x or y, centred on (x, y, z),
// w wide and h tall. o: { board, ink, size, font, edge }
export function board(ctx, along, x, y, z, w, h, text, o = {}) {
  const pts = along === 'x'
    ? [[x - w / 2, y, z - h / 2], [x + w / 2, y, z - h / 2], [x + w / 2, y, z + h / 2], [x - w / 2, y, z + h / 2]]
    : [[x, y - w / 2, z - h / 2], [x, y + w / 2, z - h / 2], [x, y + w / 2, z + h / 2], [x, y - w / 2, z + h / 2]];
  face(ctx, pts, o.board || C.white, { lw: o.edge ?? 0.05 });
  if (text) lettering(ctx, along, x, y, z, text, o.size || h * 0.5, o.ink || C.ink, o.font || 'Rethink Sans');
}

// ---------- The hull ----------
// A porthole on the far wall (the right wall, y = 0), at x along it, its
// middle at height z. glass: what's outside (the sea's color by default).
export function porthole(ctx, x, z, r = 0.45, glass = INK.sea) {
  const [X, Y] = P(x, 0, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.transform(1, 0.5, 0, 1, 0, 0); // flat on the right wall
  ctx.beginPath();
  ctx.arc(0, 0, r + 0.12, 0, Math.PI * 2);
  paint(ctx, MAT.brass, { lw: 0.04 });
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  paint(ctx, glass, { lw: 0.03 });
  ctx.beginPath();
  ctx.arc(-r * 0.3, -r * 0.3, r * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = alpha(C.white, 0.5);
  ctx.fill();
  ctx.restore();
}

// A rail: posts and a top bar from (x0, y0) to (x1, y1), h tall.
export function rail(ctx, x0, y0, x1, y1, h = 1.1, color = C.white) {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 1.2));
  ctx.lineCap = 'round';
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n;
    const [a, b] = P(x, y, 0), [, d] = P(x, y, h);
    ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(a, d);
    if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.stroke(); }
    ctx.strokeStyle = color; ctx.lineWidth = 0.05; ctx.stroke();
  }
  const [A, B] = P(x0, y0, h), [E, F] = P(x1, y1, h);
  ctx.beginPath(); ctx.moveTo(A, B); ctx.lineTo(E, F);
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.16; ctx.stroke(); }
  ctx.strokeStyle = color; ctx.lineWidth = 0.09; ctx.stroke();
}

// A lifebuoy (a ring, red and white), hung flat on the far wall at x, z.
export function lifebuoy(ctx, x, z, r = 0.45, o = {}) {
  const [X, Y] = P(x, o.y ?? 0, z);
  ctx.save();
  ctx.translate(X, Y);
  if (!o.flat) ctx.transform(1, 0.5, 0, 1, 0, 0);
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(0, 0, r, (i * Math.PI) / 2, ((i + 1) * Math.PI) / 2);
    ctx.arc(0, 0, r * 0.55, ((i + 1) * Math.PI) / 2, (i * Math.PI) / 2, true);
    ctx.closePath();
    paint(ctx, i % 2 ? C.white : INK.funnelRed, { lw: 0.03 });
  }
  ctx.restore();
}

// ---------- Deck furniture ----------
// A sun lounger, 1 wide and 2.2 long along y (or x), its back up at the far
// end. o: { along ('y' default), color, towel (a color, or false) }
export function lounger(ctx, x, y, z = 0, o = {}) {
  const along = o.along || 'y', color = o.color || C.white;
  const [w, d] = along === 'y' ? [1, 2.2] : [2.2, 1];
  box(ctx, x, y, z + 0.3, w, d, 0.12, color, { flat: true, lw: 0.03 });
  for (const [lx, ly] of [[x + 0.1, y + 0.1], [x + w - 0.2, y + 0.1], [x + 0.1, y + d - 0.2], [x + w - 0.2, y + d - 0.2]]) box(ctx, lx, ly, z, 0.1, 0.1, 0.3, shade(color, 0.3), { flat: true, lw: 0.02 });
  // The back rest, at the low end of x or y (the far end).
  if (along === 'y') shape(ctx, [[x, y + 0.1, z + 0.42], [x + w, y + 0.1, z + 0.42], [x + w, y + 0.5, z + 1.1], [x, y + 0.5, z + 1.1]], color, { lw: 0.03 });
  else shape(ctx, [[x + 0.1, y, z + 0.42], [x + 0.1, y + d, z + 0.42], [x + 0.5, y + d, z + 1.1], [x + 0.5, y, z + 1.1]], color, { lw: 0.03 });
  if (o.towel) box(ctx, x + 0.08, y + 0.4, z + 0.43, w - 0.16, d - 0.6, 0.04, o.towel, { flat: true, lw: 0.02 });
}

// A bucket, the ship's other emblem. o: { color, name (a label on it) }
export function bucket(ctx, x, y, z = 0, o = {}) {
  const color = o.color || C.grey;
  cylinder(ctx, x, y, z, 0.28, 0.42, color, { lw: 0.03 });
  const [X, Y] = P(x, y, z + 0.42);
  ctx.beginPath();
  ctx.ellipse(X, Y, 0.28 * 1.41, 0.28 * 0.7, 0, Math.PI, 0);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
  if (o.name && Q.detail) {
    ctx.save();
    ctx.font = '700 0.13px "Rethink Sans", sans-serif';
    ctx.fillStyle = C.ink; ctx.textAlign = 'center';
    ctx.fillText(o.name, X, Y + 0.28);
    ctx.restore();
  }
}

// A Green Mermaid: a tall glass of something queasy green, a paper umbrella.
export function cocktail(ctx, x, y, z, o = {}) {
  const [X, Y] = P(x, y, z);
  const drink = o.color || INK.queasyGreen;
  ctx.beginPath();
  ctx.moveTo(X - 0.09, Y - 0.42); ctx.lineTo(X - 0.06, Y); ctx.lineTo(X + 0.06, Y); ctx.lineTo(X + 0.09, Y - 0.42);
  ctx.closePath();
  paint(ctx, drink, { lw: 0.02 });
  if (!Q.detail) return;
  ctx.beginPath();
  ctx.moveTo(X + 0.02, Y - 0.4); ctx.lineTo(X + 0.12, Y - 0.62);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.015; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(X - 0.02, Y - 0.6); ctx.quadraticCurveTo(X + 0.12, Y - 0.72, X + 0.26, Y - 0.6); ctx.closePath();
  paint(ctx, o.umbrella || INK.flamingo, { lw: 0.015 });
}

// A towel animal on a bed or a shelf: 'swan', 'elephant' or 'monkey'.
export function towelAnimal(ctx, x, y, z, kind = 'swan', color = C.white) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.beginPath();
  ctx.ellipse(0, -0.14, 0.28, 0.14, 0, 0, Math.PI * 2);
  paint(ctx, color, { lw: 0.025 });
  ctx.beginPath();
  if (kind === 'swan') {
    ctx.moveTo(0.14, -0.2); ctx.quadraticCurveTo(0.34, -0.5, 0.18, -0.58); ctx.quadraticCurveTo(0.26, -0.44, 0.1, -0.26);
  } else if (kind === 'elephant') {
    ctx.ellipse(0.26, -0.3, 0.13, 0.12, 0, 0, Math.PI * 2);
    ctx.moveTo(0.36, -0.28); ctx.quadraticCurveTo(0.46, -0.16, 0.42, -0.06); ctx.lineTo(0.36, -0.08); ctx.quadraticCurveTo(0.38, -0.18, 0.3, -0.24);
  } else {
    ctx.arc(0.22, -0.34, 0.12, 0, Math.PI * 2);
    ctx.moveTo(-0.2, -0.2); ctx.quadraticCurveTo(-0.44, -0.06, -0.34, 0.08); ctx.lineTo(-0.3, 0.06); ctx.quadraticCurveTo(-0.36, -0.06, -0.16, -0.16);
  }
  paint(ctx, color, { lw: 0.025 });
  ctx.restore();
}

// ---------- Birds ----------
// A gull: standing (pecking now and then) or flapping past, facing dir.
// o: { fly, dir, peck, scale, phase }
export function gull(ctx, x, y, z, t, o = {}) {
  const [X, Y] = P(x, y, z), f = (o.dir === 'l' || o.dir === -1) ? -1 : 1, s = o.scale || 1;
  ctx.save(); ctx.translate(X, Y); ctx.scale(f * s, s);
  if (o.fly) {
    const w = Math.sin(t * 11 + (o.phase || 0)) * 0.22;
    ctx.beginPath(); ctx.ellipse(0, -0.05, 0.2, 0.08, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.03 });
    ctx.beginPath();
    ctx.moveTo(-0.5, -0.12 - w); ctx.quadraticCurveTo(-0.22, -0.3, -0.02, -0.06);
    ctx.moveTo(0.5, -0.12 - w); ctx.quadraticCurveTo(0.22, -0.3, 0.02, -0.06);
    ctx.lineCap = 'round';
    if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.stroke(); }
    ctx.strokeStyle = C.greyLight; ctx.lineWidth = 0.06; ctx.stroke();
  } else {
    const peck = o.peck && Math.sin(t * 4 + (o.phase || 0)) > 0.6;
    ctx.strokeStyle = C.coral; ctx.lineWidth = 0.035; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-0.03, 0); ctx.lineTo(-0.03, -0.16); ctx.moveTo(0.05, 0); ctx.lineTo(0.05, -0.16); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -0.26, 0.24, 0.12, -0.1, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.035 });
    ctx.beginPath(); ctx.ellipse(-0.06, -0.29, 0.16, 0.065, -0.15, 0, Math.PI * 2); paint(ctx, C.grey, { stroke: false });
    const hx = peck ? 0.26 : 0.18, hy = peck ? -0.2 : -0.42;
    ctx.beginPath(); ctx.arc(hx, hy, 0.08, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.03 });
    ctx.beginPath(); ctx.moveTo(hx + 0.06, hy - 0.02); ctx.lineTo(hx + 0.2, hy + 0.01); ctx.lineTo(hx + 0.06, hy + 0.03); paint(ctx, C.mustard, { lw: 0.02 });
  }
  ctx.restore();
}

// ---------- People ----------
// A passenger who stays in this area: a folk look (seed), a pose, and the
// time they go green (sick: seconds into the day, from at(h); none if they
// don't). Their face goes queasy over four seconds, like everyone's.
// o: { z, pose, dir, back, scale, sick, look (overrides), hold(ctx) }
export function passenger(R, x, y, seed, o = {}) {
  const look = { ...folk(seed), ...(o.look || {}) };
  R.thing(x, y, (ctx, t) => {
    const k = green(t, o.sick);
    // (A dress shows skin for legs, so someone going green wears trousers.)
    const dress = look.dress && o.sick == null;
    person(ctx, x, y, o.z || 0, { ...look, dress, bottom: look.dress && !dress ? look.top : look.bottom, skin: queasy(look.skin, k), pose: o.pose || 'stand', dir: o.dir || 'r', back: o.back, scale: o.scale, hold: o.hold }, t);
  }, { anim: true });
}

// Crew: white uniforms, and never green (they eat in the crew mess).
export const CREW_LOOK = { top: C.white, bottom: C.navy, hat: 'none' };
export function crew(R, x, y, seed, o = {}) {
  passenger(R, x, y, seed, { ...o, sick: null, look: { ...CREW_LOOK, ...(o.look || {}) } });
}

// ---------- The chase ----------
// A sighting of the iguana (style.js, CHASE; the format is src/game/trail.js):
// its find, and the iguana drawn at its hiding place while it's the sighting
// the player is on, in that sighting's hours. Found, it runs off along run
// for a second and a half, and it's gone. n: which sighting (0 to 7).
// o: { at: [x, y, z] where it hides (its tap lands a little above),
//      r, kind ('poke', 'hard' or 'spot'), hint, inside (a poke it's in),
//      draw(ctx, t, p): draws it hiding (default: the iguana standing at p,
//        facing p.dir); it must show a tell in a still (a tail, an eye),
//      dir, run: [[x, y, z], ...] its getaway, in the area's units (default
//        four units toward the far wall), depth, bias: as R.mover }
const RUN_MS = 1500;
export function sighting(R, n, o) {
  const [hx, hy, hz] = o.at;
  const run = [o.at, ...(o.run || [[hx, Math.max(0.5, hy - 4), hz]])];
  // Lengths along the getaway, so it runs at one speed.
  const legs = run.slice(1).map((q, i) => Math.hypot(q[0] - run[i][0], q[1] - run[i][1], q[2] - run[i][2]));
  const total = legs.reduce((a, b) => a + b, 0) || 1;
  const pos = (t) => {
    if (chase.step === n && chaseOpen(n, t)) return { x: hx, y: hy, z: hz, dir: o.dir || 'r', mode: 'hide' };
    const f = chase.found[n];
    const k = f == null ? 1 : (performance.now() - f) / RUN_MS;
    if (k >= 1) return { x: hx, y: hy, z: hz, mode: 'gone' };
    let d = k * total, i = 0;
    while (i < legs.length - 1 && d > legs[i]) d -= legs[i++];
    const a = run[i], b = run[i + 1], u = Math.min(1, d / (legs[i] || 1));
    const dx = (b[0] - a[0]) - (b[1] - a[1]);
    return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, z: a[2] + (b[2] - a[2]) * u, dir: dx < 0 ? 'l' : 'r', moving: true, mode: 'run' };
  };
  R.mover(pos, (ctx, t, p) => {
    if (p.mode === 'gone') return;
    if (p.mode === 'hide' && o.draw) return o.draw(ctx, t, p);
    iguana(ctx, p.x, p.y, p.z, p.dir, t, { moving: !!p.moving });
  }, { bias: o.bias || 0, ...(o.depth != null ? { depth: o.depth } : {}) });
  R.find({
    id: 'iguana', label: 'The iguana', at: [hx, hy, hz + 0.3], r: o.r ?? 0.9, kind: o.kind || 'hard',
    when: (t) => chaseOpen(n, t), note: CHASE[n].note, ...(o.hint ? { hint: o.hint } : {}), ...(o.inside ? { inside: o.inside } : {}),
  });
}
