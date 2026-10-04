// Marine Park (docs/levels/southie.md): across Farragut Road from the row,
// south of East Broadway, down to Pleasure Bay. The Farragut statue on its
// circle at the end of East Broadway, lawns rolling a little, Day Boulevard
// running through (a crosswalk, a bus stop), the playground, the picnic
// shelter, Marine Park's bath house on Pleasure Bay Beach, the beach down
// into the bay, the start of the Head Island causeway, the harbor in front.
//
// The running gag, the audience: across the road from the row, the
// neighbors bring lawn chairs from seven, facing the houses, and score each
// move on cards on sticks (the truck gets a two). The chairs fill up all
// morning; umbrellas out in the rain; at 3pm, when the truck gets out, they
// stand up and cheer and every card says 10. A couch from somebody's curb
// is carried onto the lawn at 1pm and three of them sit on it till the small
// hours, with a cooler (the old fridge, on ice), a radio and a lantern. The
// goose is one of the judges, in a yellow poncho like the kid's beside it.
//
// Also: the kid whose kite is stuck in a tree (and the dad whose frisbee joins
// it at four), the playground (empty in the rain, puddles, then back), the
// shelter reserved for a 4pm birthday and squatted all through the rain by a
// family's boxes, an L Street Brownie swimming in the rain, walkers on the
// Sugar Bowl loop, a metal detector on the beach, the empty lifeguard chair,
// gulls, and pigeons on the Admiral.
//
// World units, like plan.js and land.js (this area sits at the map's corner).
import { C, Q, box, face, disc, paint, person, folk, speech, mix, tint, shade, alpha, cylinder, note, paintText, goose, P } from '../../../engine/art.js';
import { ZK } from '../../../engine/iso.js';
import { route } from '../../../engine/actors.js';
import { drawLand, wade } from '../../../engine/terrain.js';
import { land, h } from '../land.js';
import { CIRCLE, BATH_HOUSE, PLAYGROUND, SHELTER, DAY_BLVD } from '../plan.js';
import { hour, between, nightK, rainK, wetK } from '../clock.js';
import { dusk, carton, lawnChair, lettering, car, umbrella, streetlight, LAMP_H, bench as kitBench, pigeon as kitPigeon, gullStand, cupHeld, line3 as line } from '../kit.js';
import { INK, CUP, LIT, EVENING, BRAND } from '../style.js';

// ---------- Small helpers ----------
const P3 = (x, y, z) => [x - y, (x + y) / 2 - z * ZK];
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (k) => { k = clamp01(k); return k * k * (3 - 2 * k); };
const frac = (v) => v - Math.floor(v);
// The hour, running past midnight (1am is 25) so the evening stays in order.
const hh = (t) => { const x = hour(t); return x < 5 ? x + 24 : x; };
// Between two hours on that running clock (a to b, b up to 29).
const within = (a, b) => (t) => { const x = hh(t); return x >= a && x < b; };
const raining = (t) => rainK(t) > 0.12;
const q8 = (k) => Math.round(k * 8) / 8;
const q16 = (k) => Math.round(k * 16) / 16;
const byNight = { fade: (t) => q8(nightK(t)), step: (t) => q8(nightK(t)) };
const HIDE = { x: -1e4, y: -1e4, hide: true };
const every = (period, on, off = 0) => (t) => frac(t / period + off) < on / period;
const day = (c) => c;
const gz = (x, y) => h(x, y);

// The truck on Farragut Road is stuck 8:36 to 3:12 (the road's clock), and
// the audience cheers it out.
const stuck = within(8.6, 15.2);
const CHEER = within(15.2, 15.65);
// Kids at the playground: before the rain, and after it.
const KIDS = (t) => within(7.5, 9.6)(t) || within(15.7, 18.8)(t);

// Inks, from the plate's.
const BRONZE = mix(C.green, C.ink, 0.5); // the Admiral, gone green
const GRANITE = mix(C.greyLight, C.grey, 0.4);
const STUCCO = mix(C.butter, INK.paper, 0.55);
const BRICK = INK.brick;
const TILE = mix(C.red, C.brown, 0.3);
const SHELTER_ROOF = mix(C.green, C.ink, 0.3);
const CHIPS = mix(C.woodLight, C.brown, 0.3);
const COUCH_INK = mix(C.green, C.mustard, 0.4); // somebody's curb, 1987
const PUDDLE = alpha(tint(C.sky, 0.35), 0.6);
const SAND = mix(C.butter, INK.paper, 0.35);


const pole = (ctx, x, y, z, hgt, color = C.greyLight, r = 0.06) => box(ctx, x - r, y - r, z, r * 2, r * 2, hgt, color, { flat: true, lw: 0.03 });
// A flat panel facing the lower left (along x, at y) or lower right (along y, at x).
function panel(ctx, along, x, y, z, w, hgt, fill, o = {}) {
  const pts = along === 'x'
    ? [[x - w / 2, y, z - hgt / 2], [x + w / 2, y, z - hgt / 2], [x + w / 2, y, z + hgt / 2], [x - w / 2, y, z + hgt / 2]]
    : [[x, y - w / 2, z - hgt / 2], [x, y + w / 2, z - hgt / 2], [x, y + w / 2, z + hgt / 2], [x, y - w / 2, z + hgt / 2]];
  face(ctx, pts, fill, { lw: o.lw ?? 0.03 });
}
// A sign of a few lines on a board facing the lower right, at (x, y), its
// middle at height z. lines: [[text, size, ink?, font?], ...]
function board(ctx, x, y, z, w, hgt, fill, lines) {
  panel(ctx, 'y', x, y, z, w, hgt, fill, { lw: 0.03 });
  const gap = hgt / (lines.length + 1);
  lines.forEach(([text, size, ink, font], i) => lettering(ctx, 'y', x + 0.01, y, z + hgt / 2 - gap * (i + 1), text, size, ink || C.ink, font || 'Bagel Fat One'));
}
// A park tree, like the ones along Farragut Road.
function tree(ctx, x, y, z, s = 1, ink = day, leaf = C.green) {
  const [X, Y] = P3(x, y, z);
  ctx.save(); ctx.translate(X, Y); ctx.scale(s, s);
  ctx.beginPath(); ctx.ellipse(0, 0, 1.2, 0.5, 0, 0, Math.PI * 2); ctx.fillStyle = alpha(C.ink, 0.15); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-0.15, 0); ctx.lineTo(-0.09, -2.4); ctx.lineTo(0.09, -2.4); ctx.lineTo(0.15, 0); paint(ctx, ink(C.brown));
  for (const [bx, by, br] of [[0, -3.4, 1.15], [-0.75, -2.8, 0.75], [0.75, -2.9, 0.8], [0.1, -4.2, 0.8]]) {
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2);
    paint(ctx, ink(leaf), { dots: ink(shade(leaf, 0.45)), density: 0.28 });
  }
  ctx.restore();
}
// A park bench along y, facing +x (the lower right).
const bench = (ctx, x, y, z) => kitBench(ctx, x, y, z, { along: 'y' });
function barrel(ctx, x, y, z, color) {
  box(ctx, x - 0.3, y - 0.3, z, 0.6, 0.6, 1.0, color, { lw: 0.03, dens: 0.14 });
  box(ctx, x - 0.34, y - 0.34, z + 1.0, 0.68, 0.68, 0.08, shade(color, 0.12), { flat: true, lw: 0.025 });
}
// Critters (a gull standing is the kit's).
function gullFly(ctx, x, y, z, t) {
  const [X, Y] = P3(x, y, z);
  const f = Math.sin(t * 7) * 0.22;
  ctx.beginPath();
  ctx.moveTo(X - 0.55, Y - 0.1 - f); ctx.quadraticCurveTo(X - 0.25, Y - 0.3 - f, X, Y);
  ctx.quadraticCurveTo(X + 0.25, Y - 0.3 - f, X + 0.55, Y - 0.1 - f);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.lineCap = 'round'; ctx.stroke();
  ctx.strokeStyle = C.white; ctx.lineWidth = 0.05; ctx.stroke();
}
const pigeon = (ctx, x, y, z, t, ph = 0, dir = 1) => kitPigeon(ctx, x, y, z, t, { phase: ph, dir: dir < 0 ? 'l' : 'r' });
// A dog, trotting; in a raincoat when it rains.
function dog(ctx, x, y, z, t, dir, coat, fur = C.wood) {
  const [X, Y] = P3(x, y, z);
  const f = dir === 'l' ? -1 : 1, s = Math.sin(t * 12) * 0.08;
  ctx.save(); ctx.translate(X, Y); ctx.scale(f, 1);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.07; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-0.22, -0.25); ctx.lineTo(-0.22 + s, 0); ctx.moveTo(0.2, -0.25); ctx.lineTo(0.2 - s, 0); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -0.32, 0.34, 0.15, 0, 0, Math.PI * 2); paint(ctx, coat ? C.red : fur, { lw: 0.03 });
  ctx.beginPath(); ctx.ellipse(0.36, -0.46, 0.14, 0.11, 0, 0, Math.PI * 2); paint(ctx, fur, { lw: 0.03 });
  ctx.beginPath(); ctx.moveTo(-0.32, -0.36); ctx.lineTo(-0.46, -0.5 + s); ctx.strokeStyle = fur; ctx.lineWidth = 0.06; ctx.stroke();
  ctx.restore();
}

// ---------- Things people hold (in the person's own units) ----------

const chairHeld = (color) => (ctx) => { ctx.beginPath(); ctx.rect(-0.08, -0.5, 0.16, 0.9); paint(ctx, color, { lw: 0.03 }); };
function sandwichHeld(ctx) {
  ctx.beginPath(); ctx.moveTo(-0.18, 0); ctx.lineTo(0.18, 0); ctx.lineTo(0, -0.22); ctx.closePath(); paint(ctx, C.woodLight, { lw: 0.025 });
  ctx.fillStyle = C.green; ctx.fillRect(-0.12, -0.04, 0.24, 0.04);
}
function detectorHeld(ctx, t) {
  const a = Math.sin(t * 2.2) * 0.35;
  ctx.save(); ctx.rotate(a);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0.55, 0.9); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0.6, 0.95, 0.24, 0.08, 0, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.03 });
  ctx.restore();
}
function frisbeeHeld(ctx) { ctx.beginPath(); ctx.ellipse(0.1, -0.1, 0.22, 0.08, -0.3, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.025 }); }
function towelHeld(ctx) { ctx.beginPath(); ctx.rect(-0.3, -0.2, 0.6, 0.7); paint(ctx, C.coral, { lw: 0.03, dots: C.white, density: 0.3 }); }

// ---------- Placing people ----------
// Someone who holds still in their hours: a cached picture (and a second
// one under an umbrella while it rains). o: { z, pose, dir, back, hold, arms,
// hours, umb, under(ctx), over(ctx), depth, anim }
function stay(R, x, y, look, o = {}) {
  const z = o.z ?? gz(x, y);
  const hours = o.hours || (() => true);
  const pose = { ...look, pose: o.pose || 'stand', dir: o.dir || 'r', back: !!o.back, ...(o.hold ? { hold: o.hold } : {}), ...(o.arms ? { arms: o.arms } : {}) };
  const opt = { ...(o.depth != null ? { depth: o.depth } : {}), ...(o.anim ? { anim: true } : {}) };
  const draw = (umb) => (ctx, t) => { if (o.under) o.under(ctx); person(ctx, x, y, z, pose, o.anim ? t : 0); if (umb) umbrella(ctx, x, y, z, umb); if (o.over) o.over(ctx); };
  if (!o.umb) { R.thing(x, y, draw(null), { on: hours, ...opt }); return; }
  R.thing(x, y, draw(null), { on: (t) => hours(t) && !raining(t), ...opt });
  R.thing(x, y, draw(o.umb), { on: (t) => hours(t) && raining(t), ...opt });
}
// A speech bubble now and then: say(t) returns the words, or null.
function talk(R, x, y, z, say, o = {}) {
  R.thing(x, y, (ctx, t) => { const s = say(t); if (s && Q.detail) speech(ctx, x, y, z, s, { size: o.size || 0.44 }); }, { anim: true, depth: x + y + 6, on: (t) => !!say(t) });
}
// Lines taking turns: one every `period` seconds, shown for `on`.
const lines = (list, period = 16, on = 3.2, off = 0) => (t) => {
  const k = t / period + off;
  return frac(k) < on / period ? list[Math.floor(k) % list.length] : null;
};
// A walk on the day's clock: [hour, x, y, extra] keyframes, straight lines
// between (the road's, standing on the park's ground).
function timeline(frames) {
  return (t) => {
    const hr = hh(t);
    if (hr < frames[0][0] || hr > frames[frames.length - 1][0]) return null;
    for (let i = 0; i < frames.length - 1; i++) {
      const a = frames[i], b = frames[i + 1];
      if (hr > b[0]) continue;
      const k = (hr - a[0]) / Math.max(1e-6, b[0] - a[0]);
      const dx = b[1] - a[1], dy = b[2] - a[2];
      const x = a[1] + dx * k, y = a[2] + dy * k;
      const extra = a[3] || {};
      if (Math.abs(dx) + Math.abs(dy) > 1e-6) {
        const dX = dx - dy, dY = dx + dy;
        return { ...extra, x, y, moving: true, pose: 'walk', dir: dX >= 0 ? 'r' : 'l', back: dY < -0.01 };
      }
      return { dir: 'r', back: false, pose: 'stand', ...extra, x, y, moving: false };
    }
    return null;
  };
}
function walker(R, frames, look, o = {}) {
  const at = timeline(frames);
  R.mover((t) => at(t) || HIDE, (ctx, t, p) => {
    if (p.hide) return;
    const z = gz(p.x, p.y);
    const draw = (c) => person(c, p.x, p.y, z, { ...look, pose: p.pose, dir: p.dir, back: p.back, ...(p.arms ? { arms: p.arms } : {}), ...(o.hold || p.hold ? { hold: p.hold || o.hold } : {}) }, t);
    if (z < 0) wade(ctx, p.x, p.y, z, 0, draw); else draw(ctx);
    if (o.umb && raining(t)) umbrella(ctx, p.x, p.y, z, o.umb, p.moving ? Math.sin(t * 7) * 0.04 : 0);
    if (p.say && Q.detail) speech(ctx, p.x, p.y, z + 3.1, p.say, { size: 0.44 });
  });
}
// A still thing printed by day, and again in dusk inks after dark.
function twice(R, x, y, draw) {
  R.thing(x, y, (ctx) => draw(ctx, day));
  R.thing(x + 0.001, y + 0.001, (ctx) => draw(ctx, dusk), byNight);
}

// ---------- The lawn chairs ----------
// The kit's lawn chair, facing the row (-x): we see its back. Whoever sits
// in it goes between the chair and the back's webbing, drawn again in front.
function chairBack(ctx, x, y, z, color) {
  box(ctx, x + 0.29, y - 0.35, z + 0.46, 0.06, 0.7, 0.75, tint(color, 0.3), { flat: true, lw: 0.03 });
  if (!Q.detail) return;
  for (let i = 0; i < 4; i++) {
    const zz = z + 0.52 + i * 0.17;
    face(ctx, [[x + 0.352, y - 0.35, zz], [x + 0.352, y + 0.35, zz], [x + 0.352, y + 0.35, zz + 0.07], [x + 0.352, y - 0.35, zz + 0.07]], shade(color, 0.2), { stroke: false });
  }
}
// A scorecard on a paint stirrer, held up over the head, facing us.
// (big: the goose's HONK card, bigger than the rest so it reads on a phone.)
function scoreCard(ctx, x, y, z, text, red = false, big = 1) {
  line(ctx, [[x + 0.06, y + 0.1, z + 1.45], [x + 0.06, y + 0.1, z + 2.35]], C.wood, 0.07);
  const cz = z + 2.7 + (big - 1) * 0.3;
  panel(ctx, 'y', x + 0.08, y + 0.1, cz, 0.8 * big, 0.62 * big, C.white, { lw: 0.035 });
  lettering(ctx, 'y', x + 0.09, y + 0.1, cz - 0.02, text, (text.length > 2 ? 0.3 : 0.46) * big, red ? C.red : C.ink, 'Bagel Fat One');
}
// A jar of pickles: green glass, three pickles standing in it, a gold lid.
function pickleJar(ctx, x, y, z) {
  const r = 0.2, h = 0.6;
  cylinder(ctx, x, y, z, r, h, mix(C.mint, C.leaf, 0.4), { side: alpha(mix(C.mint, C.leaf, 0.55), 0.95), flat: true });
  if (Q.detail) {
    const [X, Y] = P3(x, y, z);
    for (const [dx, tall] of [[-0.14, 0.62], [0.02, 0.7], [0.16, 0.56]]) {
      ctx.beginPath(); ctx.ellipse(X + dx, Y - tall * ZK * 0.55, 0.085, tall * ZK * 0.44, 0, 0, Math.PI * 2);
      paint(ctx, shade(C.green, 0.2), { lw: 0.02, dots: shade(C.green, 0.5), density: 0.25 });
    }
  }
  cylinder(ctx, x, y, z + h, r + 0.02, 0.1, C.mustard, { flat: true });
}

// A yellow rain poncho, hood up, over someone seen from behind (in the
// person's own units, at their feet): the goose's twin wears one all day.
const PONCHO = C.mustard;
function poncho(ctx, x, y, z, s = 1) {
  const [X, Y] = P3(x, y, z);
  ctx.save(); ctx.translate(X, Y); ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(-0.2, -1.66); ctx.quadraticCurveTo(-0.42, -1.5, -0.5, -0.72); ctx.lineTo(0.5, -0.72); ctx.quadraticCurveTo(0.42, -1.5, 0.2, -1.66); ctx.closePath();
  paint(ctx, PONCHO, { lw: 0.035, dots: Q.detail ? shade(PONCHO, 0.35) : null, density: 0.14 });
  ctx.beginPath(); ctx.arc(0, -1.97, 0.33, 0, Math.PI * 2); paint(ctx, PONCHO, { lw: 0.035 });
  if (Q.detail) { ctx.strokeStyle = shade(PONCHO, 0.3); ctx.lineWidth = 0.025; ctx.beginPath(); ctx.moveTo(0, -2.28); ctx.lineTo(0, -1.66); ctx.stroke(); }
  ctx.restore();
}
// The goose in the same poncho, sitting, facing the row with everyone else:
// the hood's up, but its beak and its orange feet stick out (its tell, in
// any still). Its own art, since the engine's goose is tucked away (hidden).
function ponchoGoose(ctx, x, y, z) {
  goose(ctx, x, y, z, 0, { pose: 'sit', dir: 'l' });
  const [X, Y] = P3(x, y, z);
  ctx.save(); ctx.translate(X, Y); ctx.scale(-1, 1);
  // Feet, dangling off the seat's front edge.
  ctx.fillStyle = C.coral; ctx.strokeStyle = C.ink; ctx.lineWidth = 0.02;
  for (const dx of [0.12, 0.3]) { ctx.beginPath(); ctx.moveTo(dx, -0.02); ctx.lineTo(dx + 0.16, 0.1); ctx.lineTo(dx - 0.02, 0.12); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  // The cape, over the body and up the neck.
  ctx.beginPath();
  ctx.moveTo(-0.55, 0.02); ctx.quadraticCurveTo(-0.5, -0.42, -0.05, -0.5); ctx.lineTo(0.12, -0.72); ctx.lineTo(0.36, -0.62); ctx.quadraticCurveTo(0.5, -0.25, 0.5, 0.02); ctx.closePath();
  paint(ctx, PONCHO, { lw: 0.035, dots: Q.detail ? shade(PONCHO, 0.35) : null, density: 0.14 });
  // The hood, round the back of the head; its face and beak out the front.
  ctx.beginPath(); ctx.moveTo(0.27, -0.84); ctx.arc(0.25, -0.84, 0.22, 0.95, Math.PI * 2 - 0.95, false); ctx.closePath();
  paint(ctx, PONCHO, { lw: 0.035 });
  // Its white face and a big orange beak out of the hood, drawn over the
  // engine's (too small to read at phone size under all that yellow).
  ctx.beginPath(); ctx.arc(0.36, -0.84, 0.13, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.025 });
  ctx.beginPath(); ctx.moveTo(0.44, -0.93); ctx.lineTo(0.8, -0.83); ctx.lineTo(0.44, -0.74); ctx.closePath();
  paint(ctx, C.coral, { lw: 0.03 });
  ctx.beginPath(); ctx.arc(0.37, -0.88, 0.035, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
  ctx.restore();
}
// A real Canada goose (the decoy): brown, a black stocking on its neck and
// head, a white chinstrap, grazing now and then.
function canadaGoose(ctx, x, y, z, t) {
  const [X, Y] = P3(x, y, z);
  const down = frac(t / 5) < 0.55;
  ctx.save(); ctx.translate(X, Y);
  if (Q.detail) { ctx.beginPath(); ctx.ellipse(0, 0, 0.42, 0.15, 0, 0, Math.PI * 2); ctx.fillStyle = alpha(C.ink, 0.18); ctx.fill(); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.07; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0.02, -0.3); ctx.lineTo(0.0, 0); ctx.moveTo(0.14, -0.3); ctx.lineTo(0.16, 0); ctx.stroke();
  const body = mix(C.brown, C.grey, 0.35);
  ctx.beginPath(); ctx.ellipse(0, -0.45, 0.44, 0.24, -0.08, 0, Math.PI * 2); paint(ctx, body, { dots: Q.detail ? shade(body, 0.4) : null, density: 0.18 });
  ctx.beginPath(); ctx.ellipse(0.2, -0.4, 0.2, 0.15, 0, 0, Math.PI * 2); paint(ctx, tint(body, 0.45), { stroke: false });
  ctx.beginPath(); ctx.moveTo(-0.36, -0.5); ctx.lineTo(-0.58, -0.6); ctx.lineTo(-0.4, -0.36); ctx.closePath(); paint(ctx, C.ink, { lw: 0.02 });
  ctx.beginPath(); ctx.ellipse(-0.3, -0.33, 0.1, 0.05, 0, 0, Math.PI * 2); ctx.fillStyle = C.white; ctx.fill();
  ctx.beginPath(); ctx.ellipse(-0.06, -0.52, 0.24, 0.11, -0.2, 0, Math.PI * 2); paint(ctx, shade(body, 0.2), { lw: 0.02 });
  // The neck, up, or down to the grass.
  const hx = down ? 0.55 : 0.36, hy = down ? -0.12 : -1.05;
  ctx.beginPath(); ctx.moveTo(0.3, -0.55); ctx.quadraticCurveTo(down ? 0.5 : 0.38, down ? -0.5 : -0.8, hx, hy);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.18; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(hx + 0.04, hy, 0.13, 0.1, 0, 0, Math.PI * 2); paint(ctx, C.ink, { stroke: false });
  ctx.beginPath(); ctx.ellipse(hx, hy + 0.04, 0.07, 0.04, 0.3, 0, Math.PI * 2); ctx.fillStyle = C.white; ctx.fill();
  ctx.beginPath(); ctx.moveTo(hx + 0.14, hy - 0.03); ctx.lineTo(hx + 0.28, hy + 0.01); ctx.lineTo(hx + 0.14, hy + 0.05); ctx.closePath(); ctx.fillStyle = C.ink; ctx.fill();
  ctx.restore();
}

// The audience: [x, y] of the chair, its color, who, when they come and go,
// what they score, their umbrella. The front row nearest the road.
const FX = 29.7, BX = 31.3;
const AUD = [
  { x: FX, y: 24.0, chair: C.teal, look: folk(601, { hair: C.greyLight, style: 'bun', top: C.lilac, dress: true }), a: 7.0, l: 19.4, cards: ['8', '9', '7'], umb: C.pink },
  { x: FX, y: 25.4, chair: C.coral, look: folk(602, { top: C.green, bottom: C.navy, hat: 'cap', style: 'short' }), a: 7.35, l: 18.7, cards: ['4', '6', '5'], umb: C.navy, hold: cupHeld, truck: true },
  { x: FX, y: 26.8, chair: C.mustard, look: folk(603, { top: C.red, style: 'bald', hair: C.grey }), a: 7.9, l: 20.3, cards: ['7', '3', '9'], umb: C.teal },
  { x: FX, y: 28.2, chair: C.pink, look: folk(604, { top: C.mustard, style: 'pony' }), scale: 0.72, poncho: true, a: 8.3, l: 17.6, cards: ['10', '11', '10'], umb: C.coral },
  { x: FX, y: 30.7, chair: C.purple, look: folk(605, { top: C.teal, style: 'long' }), a: 9.2, l: 19.1, cards: ['6', '5.5', '8'], umb: C.mustard },
  { x: BX, y: 24.7, chair: C.green, look: folk(606, { top: C.navy, hat: 'beanie' }), a: 8.8, l: 19.9, cards: ['9', '7', '8'], umb: C.purple, hold: cupHeld },
  { x: BX, y: 26.1, chair: tint(C.sky, 0.1), look: folk(607, { top: C.pink, style: 'curly' }), a: 10.1, l: 18.0, cards: ['5', '8', '6'], umb: C.coral },
  { x: BX, y: 30.9, chair: C.red, look: folk(608, { top: C.white, style: 'pony' }), a: 11.0, l: 19.6, cards: ['3', '7', '4'], umb: C.teal },
  { x: 30.5, y: 22.5, chair: C.teal, look: folk(609, { top: C.coral, hair: C.greyLight, style: 'short' }), a: 12.3, l: 20.2, cards: ['9', '9', '8'], umb: C.navy },
];
// Every so often each of them holds a card up (all at once, all 10s, when
// the truck gets out; the truck's own fan holds up a 2 while it's stuck).
const raised = (i) => (t) => CHEER(t) || frac(t / 19 + i * 0.29) < 0.2;
const cardFor = (m, i, t) => {
  if (CHEER(t)) return '10';
  if (m.truck && stuck(t)) return '2';
  return m.cards[Math.floor(t / 19 + i * 0.29) % m.cards.length];
};

// ---------- The couch on the lawn ----------
// Somebody's curb couch, carried over at 1pm, facing the row (its back to us).
const CO = { x: 30.2, y: 33.3, w: 1.4, d: 2.4 };
const COUCH_IN = 13.15, COUCH_AT = 13.7;
const TRIO = [
  folk(621, { top: C.coral, hat: 'cap', bottom: C.ink }),
  folk(622, { top: C.navy, style: 'long', bottom: C.grey }),
  folk(623, { top: C.mustard, style: 'bald', hair: C.greyLight, bottom: C.brown }),
];
function couch(ctx, x, y, z, color, people) {
  const { w, d } = CO;
  for (const [lx, ly] of [[x + 0.15, y + 0.15], [x + w - 0.3, y + 0.15], [x + 0.15, y + d - 0.3], [x + w - 0.3, y + d - 0.3]]) box(ctx, lx, ly, z, 0.15, 0.15, 0.22, C.brown, { flat: true, lw: 0.02 });
  box(ctx, x, y, z + 0.22, w, d, 0.42, color, { lw: 0.04, dens: 0.18 });
  box(ctx, x, y, z + 0.64, w - 0.45, 0.35, 0.45, color, { lw: 0.04 });
  if (Q.detail) for (let i = 0; i < 3; i++) box(ctx, x + 0.05, y + 0.35 + i * 0.57, z + 0.64, w - 0.55, 0.55, 0.12, tint(color, 0.12), { flat: true, lw: 0.025 });
  if (people) people(ctx);
  box(ctx, x, y + d - 0.35, z + 0.64, w - 0.45, 0.35, 0.45, color, { lw: 0.04 });
  box(ctx, x + w - 0.45, y, z + 0.64, 0.45, d, 0.8, shade(color, 0.05), { lw: 0.04, dens: 0.16 });
  // Plaid, on the back we see.
  if (Q.detail) {
    ctx.save(); ctx.globalAlpha *= 0.55;
    const bx = x + w + 0.002;
    for (let u = y + 0.3; u < y + d; u += 0.6) face(ctx, [[bx, u, z + 0.64], [bx, u + 0.08, z + 0.64], [bx, u + 0.08, z + 1.44], [bx, u, z + 1.44]], C.coral, { stroke: false });
    for (const zz of [z + 0.85, z + 1.2]) face(ctx, [[bx, y, zz], [bx, y + d, zz], [bx, y + d, zz + 0.06], [bx, y, zz + 0.06]], C.mustard, { stroke: false });
    ctx.restore();
  }
}

// ---------- The Farragut statue ----------
// Admiral Farragut (1893): bronze on a granite pedestal on the circle at
// East Broadway's end, looking out to sea, binoculars in hand, a naval cap.
function admiral(ctx, ink) {
  const [cx, cy] = CIRCLE, z = gz(cx, cy);
  const g = ink(GRANITE);
  box(ctx, cx - 1.05, cy - 1.05, z - 0.1, 2.1, 2.1, 0.4, g, { lw: 0.035, dens: 0.14 });
  box(ctx, cx - 0.85, cy - 0.85, z + 0.3, 1.7, 1.7, 0.28, ink(tint(GRANITE, 0.12)), { flat: true, lw: 0.03 });
  box(ctx, cx - 0.65, cy - 0.65, z + 0.58, 1.3, 1.3, 1.65, g, { lw: 0.035, dens: 0.12 });
  box(ctx, cx - 0.8, cy - 0.8, z + 2.23, 1.6, 1.6, 0.24, ink(tint(GRANITE, 0.15)), { flat: true, lw: 0.03 });
  // His name, and the bronze plaque below it, on the side toward the sea.
  lettering(ctx, 'x', cx, cy + 0.651, z + 1.95, 'FARRAGUT', 0.2, ink(C.ink), 'Bagel Fat One');
  panel(ctx, 'x', cx, cy + 0.652, z + 1.2, 0.8, 0.55, ink(BRONZE), { lw: 0.03 });
  if (Q.detail) for (let i = 0; i < 3; i++) panel(ctx, 'x', cx, cy + 0.655, z + 1.34 - i * 0.13, 0.55, 0.035, ink(tint(BRONZE, 0.3)), { lw: 0 });
  lettering(ctx, 'y', cx + 0.651, cy, z + 1.95, '1893', 0.16, ink(C.ink), 'Bagel Fat One');
  const b = ink(BRONZE), bd = ink(shade(BRONZE, 0.3));
  const cap = (c, hy) => {
    c.beginPath(); c.ellipse(0.02, hy - 0.2, 0.33, 0.16, 0, Math.PI, 0); c.lineTo(0.35, hy - 0.2); paint(c, bd, { lw: 0.03 });
    c.beginPath(); c.rect(0.05, hy - 0.22, 0.42, 0.07); paint(c, bd, { lw: 0.03 });
  };
  const bino = (c) => { c.beginPath(); c.rect(-0.08, 0.05, 0.2, 0.3); paint(c, bd, { lw: 0.03 }); };
  person(ctx, cx, cy, z + 2.47, { skin: b, hair: bd, top: b, bottom: b, shoes: bd, style: 'short', pose: 'stand', dir: 'l', scale: 1.2, face: cap, hold: bino, arms: [0.25, -0.35] }, 0);
}

// ---------- The bath house ----------
// Marine Park's own, on Pleasure Bay Beach: a low brick-and-stucco pavilion,
// its doors onto the beach (the +x side), a hipped tile roof.
const BH = { x0: BATH_HOUSE[0], y0: BATH_HOUSE[1], x1: BATH_HOUSE[0] + 5, y1: BATH_HOUSE[1] + 3.6 };
function arch(ctx, plane, at, uc, z0, w, hgt, fill) {
  const q = (u, zz) => (plane === 'x' ? [at, u, zz] : [u, at, zz]);
  const pts = [q(uc - w / 2, z0), q(uc + w / 2, z0)];
  for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI; pts.push(q(uc + Math.cos(a) * w / 2, z0 + hgt + Math.sin(a) * w * 0.45)); }
  face(ctx, pts, fill, { lw: 0.03 });
}
function bathHouse(ctx, ink) {
  const { x0, y0, x1, y1 } = BH, z = gz((x0 + x1) / 2, (y0 + y1) / 2) - 0.1;
  const w = x1 - x0, d = y1 - y0, cy = (y0 + y1) / 2;
  box(ctx, x0, y0, z - 0.2, w, d, 1.1, ink(BRICK), { lw: 0.04, dens: 0.2 });
  // A brick band between (under the stucco, so only its lip shows), and brick courses (faint).
  box(ctx, x0 - 0.05, y0 - 0.05, z + 0.8, w + 0.1, d + 0.1, 0.12, ink(shade(BRICK, 0.1)), { flat: true, lw: 0.025 });
  box(ctx, x0, y0, z + 0.92, w, d, 2.1, ink(STUCCO), { lw: 0.04, dens: 0.1 });
  if (Q.detail) {
    ctx.save(); ctx.globalAlpha *= 0.25;
    for (let zz = z; zz < z + 0.85; zz += 0.22) {
      face(ctx, [[x1 + 0.002, y0, zz], [x1 + 0.002, y1, zz], [x1 + 0.002, y1, zz + 0.03], [x1 + 0.002, y0, zz + 0.03]], ink(C.white), { stroke: false });
      face(ctx, [[x0, y1 + 0.002, zz], [x1, y1 + 0.002, zz], [x1, y1 + 0.002, zz + 0.03], [x0, y1 + 0.002, zz + 0.03]], ink(C.white), { stroke: false });
    }
    ctx.restore();
  }
  // The beach side: two arched doorways, and the name over them.
  const dark = ink(shade(BRICK, 0.6));
  for (const [u, word] of [[y0 + 0.9, 'MEN'], [y1 - 0.9, 'WOMEN']]) {
    arch(ctx, 'x', x1 + 0.005, u, z - 0.05, 0.9, 1.5, ink(STUCCO));
    arch(ctx, 'x', x1 + 0.01, u, z - 0.05, 0.72, 1.4, dark);
    lettering(ctx, 'y', x1 + 0.02, u, z + 2.06, word, 0.13, ink(C.ink));
  }
  lettering(ctx, 'y', x1 + 0.02, cy, z + 2.55, 'MARINE PARK', 0.32, ink(C.ink), 'Bagel Fat One');
  // A notice between the doors: the season's over.
  panel(ctx, 'y', x1 + 0.015, cy, z + 1.3, 1.0, 0.8, ink(C.white), { lw: 0.03 });
  panel(ctx, 'y', x1 + 0.02, cy, z + 1.58, 0.94, 0.18, ink(C.red), { lw: 0 });
  lettering(ctx, 'y', x1 + 0.025, cy, z + 1.58, 'NO LIFEGUARD', 0.1, ink(C.white), 'Bagel Fat One');
  lettering(ctx, 'y', x1 + 0.025, cy, z + 1.36, 'SWIM AT YOUR', 0.09, ink(C.ink));
  lettering(ctx, 'y', x1 + 0.025, cy, z + 1.22, 'OWN RISK', 0.09, ink(C.ink));
  lettering(ctx, 'y', x1 + 0.025, cy, z + 1.04, 'SEE YOU IN JUNE', 0.08, ink(C.ink));
  // The park side: arched windows, with grilles.
  for (const u of [x0 + 0.9, x0 + 2.1, x0 + 3.3]) {
    arch(ctx, 'y', y1 + 0.005, u, z + 1.2, 0.8, 0.7, ink(STUCCO));
    arch(ctx, 'y', y1 + 0.01, u, z + 1.25, 0.62, 0.6, ink(tint(C.sky, 0.3)));
    if (Q.detail) line(ctx, [[u, y1 + 0.02, z + 1.25], [u, y1 + 0.02, z + 2.1]], ink(C.ink), 0.03);
  }
  lettering(ctx, 'x', x0 + 4.35, y1 + 0.02, z + 1.55, 'BATH', 0.14, ink(C.ink), 'Bagel Fat One');
  lettering(ctx, 'x', x0 + 4.35, y1 + 0.02, z + 1.35, 'HOUSE', 0.14, ink(C.ink), 'Bagel Fat One');
  // The hipped roof.
  const e = z + 3.02, rz = z + 3.95, o = 0.35;
  const E = [x0 - o, y0 - o, x1 + o, y1 + o], r0 = x0 + 1.6, r1 = x1 - 1.6;
  box(ctx, E[0], E[1], e - 0.14, E[2] - E[0], E[3] - E[1], 0.14, ink(C.white), { flat: true, lw: 0.03 });
  const roof = ink(TILE), roofD = ink(shade(TILE, 0.18));
  face(ctx, [[E[0], E[1], e], [E[2], E[1], e], [r1, cy, rz], [r0, cy, rz]], roofD, { lw: 0.035 });
  face(ctx, [[E[0], E[1], e], [E[0], E[3], e], [r0, cy, rz]], roofD, { lw: 0.035 });
  face(ctx, [[E[0], E[3], e], [E[2], E[3], e], [r1, cy, rz], [r0, cy, rz]], roof, { lw: 0.035, dots: ink(shade(TILE, 0.5)), density: 0.18 });
  face(ctx, [[E[2], E[1], e], [E[2], E[3], e], [r1, cy, rz]], ink(tint(TILE, 0.08)), { lw: 0.035, dots: ink(shade(TILE, 0.5)), density: 0.12 });
  // A lamp over the doors.
  box(ctx, x1 + 0.02, cy - 0.12, z + 2.1, 0.18, 0.24, 0.2, ink(tint(C.sky, 0.4)), { flat: true, lw: 0.025 });
}

// ---------- The picnic shelter ----------
const SH = { x0: SHELTER[0], y0: SHELTER[1], x1: SHELTER[0] + 3.6, y1: SHELTER[1] + 3 };
function shelterBase(ctx, ink) {
  const { x0, y0, x1, y1 } = SH, z = gz(x0 + 1.8, y0 + 1.5);
  box(ctx, x0 - 0.2, y0 - 0.2, z - 0.15, 4.0, 3.4, 0.2, ink(mix(C.greyLight, INK.paper, 0.3)), { flat: true, lw: 0.03 });
  // The picnic table and its benches.
  const tx = x0 + 0.9, ty = y0 + 1.0;
  for (const [lx, ly] of [[tx + 0.2, ty + 0.1], [tx + 1.6, ty + 0.1], [tx + 0.2, ty + 0.8], [tx + 1.6, ty + 0.8]]) box(ctx, lx, ly, z + 0.05, 0.1, 0.1, 0.75, ink(C.wood), { flat: true, lw: 0.02 });
  box(ctx, tx, ty - 0.55, z + 0.45, 1.9, 0.3, 0.08, ink(C.wood), { flat: true, lw: 0.025 });
  box(ctx, tx, ty, z + 0.8, 1.9, 1.0, 0.1, ink(C.woodLight), { flat: true, lw: 0.03 });
  box(ctx, tx, ty + 1.25, z + 0.45, 1.9, 0.3, 0.08, ink(C.wood), { flat: true, lw: 0.025 });
  // The posts at the back.
  for (const [px, py] of [[x0 + 0.1, y0 + 0.1], [x1 - 0.3, y0 + 0.1], [x0 + 0.1, y1 - 0.3]]) box(ctx, px, py, z, 0.2, 0.2, 2.6, ink(C.wood), { flat: true, lw: 0.03 });
}
function shelterRoof(ctx, ink) {
  const { x0, y0, x1, y1 } = SH, z = gz(x0 + 1.8, y0 + 1.5), cy = (y0 + y1) / 2;
  box(ctx, x1 - 0.3, y1 - 0.3, z, 0.2, 0.2, 2.6, ink(C.wood), { flat: true, lw: 0.03 });
  const e = z + 2.6, rz = z + 3.45, o = 0.35;
  const E = [x0 - o, y0 - o, x1 + o, y1 + o];
  const roof = ink(SHELTER_ROOF);
  face(ctx, [[E[0], E[1], e], [E[2], E[1], e], [E[2], cy, rz], [E[0], cy, rz]], ink(shade(SHELTER_ROOF, 0.15)), { lw: 0.035 });
  face(ctx, [[E[2], E[1], e], [E[2], E[3], e], [E[2], cy, rz]], ink(C.woodLight), { lw: 0.035 });
  face(ctx, [[E[0], E[3], e], [E[2], E[3], e], [E[2], cy, rz], [E[0], cy, rz]], roof, { lw: 0.035, dots: ink(shade(SHELTER_ROOF, 0.5)), density: 0.2 });
  if (Q.detail) lettering(ctx, 'y', E[2] + 0.01, cy, e + 0.3, 'PICNIC', 0.16, ink(C.brown), 'Bagel Fat One');
}

// ---------- The playground ----------
// Nudged 2.5 east of the greybox's, off Day Boulevard's pavement.
const PG = [PLAYGROUND[0] + 2.5, PLAYGROUND[1] - 0.3];
const SW = { x: PG[0] + 1.0, y0: PG[1] + 0.5, y1: PG[1] + 2.7, top: 2.5, len: 2.0, seats: [PG[1] + 1.1, PG[1] + 2.1] };
const SL = { x: PG[0] + 2.6, y: PG[1] + 3.1, top: 1.6, end: PG[0] + 4.6 };
const SAW = { x: PG[0] + 1.5, y: PG[1] + 4.1 };
const SANDBOX = [PG[0] + 2.4, PG[1] + 0.3, 1.4, 1.3];
const CANADA = [39.0, 31.4]; // the decoy's patch of lawn
const swingAngle =(i, t) => (KIDS(t) ? 0.6 * Math.sin(t * 2.1 + i * 1.7) : 0.05 * Math.sin(t * 0.8 + i * 2));

export default {
  id: 'marine-park',
  name: 'Marine Park',
  blurb: 'Across the road, the neighbors score the moves from lawn chairs, and the truck is getting a two. Flip the clock: by evening a couch has joined the judges.',
  home: [40, 30],
  build(R) {
    drawLand(R, land, { fade: nightK, inks: EVENING });

    // ---------- Paint and puddles ----------
    R.rug((ctx) => {
      // The crosswalk over Day Boulevard, from the audience to the bath house.
      for (let x = 32.8; x < 36.0; x += 0.72) face(ctx, [[x, 28.9, 0.62], [x + 0.36, 28.9, 0.62], [x + 0.36, 30.2, 0.62], [x, 30.2, 0.62]], alpha(C.white, 0.85), { stroke: false });
      // The Admiral's flower bed: mums, it's September.
      const [cx, cy] = CIRCLE, z = gz(cx, cy) + 0.02;
      disc(ctx, cx, cy, z, 1.75, mix(C.brown, INK.paper, 0.2), { lw: 0.03 });
      if (Q.detail) for (let i = 0; i < 22; i++) {
        const a = i * 2.39, r = 1.25 + (i % 3) * 0.14;
        disc(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r, z + 0.01, 0.13, [C.mustard, C.coral, C.pink][i % 3], { lw: 0.015 });
      }
      // The playground's wood chips.
      const pz = gz(PG[0] + 2, PG[1] + 2.2) + 0.02;
      face(ctx, [[PG[0], PG[1], pz], [PG[0] + 4.9, PG[1], pz], [PG[0] + 4.9, PG[1] + 4.9, pz], [PG[0], PG[1] + 4.9, pz]], CHIPS, { lw: 0.04, dots: shade(CHIPS, 0.4), density: 0.3 });
      // Footprints to the water: one bare foot, one flip-flop. (They stop
      // short of it: a trail right up to it made a hard find easy.)
      if (Q.detail) for (let i = 0; i < 4; i++) {
        const x = 44.2 + i * 0.52, y = 35.6 + i * 0.36 + (i % 2) * 0.28;
        disc(ctx, x, y, gz(x, y) + 0.01, i % 2 ? 0.11 : 0.13, alpha(shade(SAND, 0.35), 0.8), { stroke: false });
      }
    });
    const PUDDLES = [[SW.x, SW.seats[0] + 0.5, 0.85], [PG[0] + 2.1, PG[1] + 5.4, 0.7], [37.0, 21.9, 0.6], [44.1, 25.3, 0.55], [34.9, 15.1, 0.6], [33.4, 48.5, 0.7]];
    R.rug((ctx) => {
      for (const [x, y, r] of PUDDLES) {
        const z = gz(x, y) + 0.03;
        disc(ctx, x, y, z, r, PUDDLE, { stroke: alpha(C.ink, 0.35), lw: 0.03 });
        disc(ctx, x + r * 0.5, y - r * 0.3, z + 0.001, r * 0.6, PUDDLE, { stroke: false });
      }
    }, { fade: (t) => q16(wetK(t)), step: (t) => q16(wetK(t)) });
    R.rug((ctx, t) => {
      if (!Q.detail) return;
      PUDDLES.forEach(([x, y, r], j) => {
        const k = frac(t * 0.8 + j * 0.37);
        ctx.save(); ctx.globalAlpha *= (1 - k) * rainK(t);
        disc(ctx, x, y, gz(x, y) + 0.04, 0.1 + k * r * 0.5, null, { stroke: C.white, lw: 0.03 });
        ctx.restore();
      });
    }, { anim: true, on: raining });

    // ---------- Trees ----------
    // (The kite's tree is two units east of the greybox's, off Day Boulevard.)
    const KT = [40.4, 11.6];
    for (const [x, y, s] of [[30.6, 5.6, 0.95], [KT[0], KT[1], 1.05], [38.3, 17.8, 0.9], [37.4, 30.4, 0.85], [30.6, 42.6, 0.9], [29.8, 50.4, 0.95], [38.4, 50.6, 1.0]]) {
      twice(R, x, y, (ctx, ink) => tree(ctx, x, y, gz(x, y), s, ink));
    }

    // ---------- The Farragut statue ----------
    twice(R, CIRCLE[0] + 1.05, CIRCLE[1] + 1.05, admiral);
    // Pigeons: one on his cap, two on the cornice, one that comes and goes.
    {
      const [cx, cy] = CIRCLE, z = gz(cx, cy);
      R.thing(cx + 1.1, cy + 1.1, (ctx, t) => {
        pigeon(ctx, cx - 0.05, cy + 0.05, z + 4.95, t, 0, -1);
        pigeon(ctx, cx + 0.55, cy + 0.6, z + 2.47, t, 1.4, 1);
        pigeon(ctx, cx - 0.55, cy + 0.65, z + 2.47, t, 2.9, -1);
        // The fourth: out over the circle and back to the Admiral's shoulder.
        const k = frac(t / 23);
        if (k < 0.55) pigeon(ctx, cx + 0.3, cy + 0.1, z + 4.2, t, 4, 1);
        else { const a = (k - 0.55) / 0.45 * Math.PI * 2; gullFly(ctx, cx + Math.cos(a) * 2.6, cy + Math.sin(a) * 2.2, z + 4.6 + Math.sin(a * 2) * 0.5, t * 1.6); }
      }, { anim: true });
      // Someone reading the plaque, before the rain and after.
      stay(R, cx + 0.2, cy + 2.3, folk(640, { top: C.sky, hat: 'sun', bottom: C.brown }), { dir: 'r', back: true, pose: 'read', hours: (t) => within(7.2, 9.5)(t) || within(16, 19)(t) });
      talk(R, cx + 0.2, cy + 2.3, gz(cx, cy) + 2.9, (t) => ((within(7.2, 9.5)(t) || within(16, 19)(t)) && every(21, 3, 0.3)(t) ? 'Says here he damned the torpedoes.' : null), { size: 0.38 });
    }

    // ---------- Lamps along Day Boulevard and the causeway ----------
    const LAMPS = [[37.0, 14.4], [32.6, 19.2], [36.4, 26.6], [35.8, 46.8], [34.4, 55.4], [46.2, 54.6], [53.4, 54.6]];
    for (const [x, y] of LAMPS) {
      const z = gz(x, y);
      R.thing(x, y, (ctx) => streetlight(ctx, x, y, z));
      R.thing(x + 0.001, y + 0.001, (ctx) => streetlight(ctx, x, y, z, true), byNight);
      R.light({ at: [x, y, z + LAMP_H + 0.3], r: 3.2, color: LIT, k: nightK });
    }

    // ---------- The bus stop ----------
    {
      const x = 37.4, y = 17.9, z = gz(x, y);
      R.thing(x + 0.2, y + 0.2, (ctx) => {
        pole(ctx, x, y, z, 2.7, C.greyLight, 0.05);
        panel(ctx, 'y', x + 0.07, y, z + 2.45, 0.5, 0.42, C.white);
        disc(ctx, x, y, z + 2.72, 0.01, null);
        lettering(ctx, 'y', x + 0.08, y, z + 2.52, 'BUS', 0.14, C.navy, 'Bagel Fat One');
        lettering(ctx, 'y', x + 0.08, y, z + 2.35, 'STOP', 0.12, C.navy, 'Bagel Fat One');
      });
      R.thing(x + 0.7, y + 2.4, (ctx) => bench(ctx, x + 0.2, y + 0.6, gz(x, y + 1.4)));
      // Moving by bus: a box, a plant, and a floor lamp.
      R.thing(x + 1.2, y + 1.9, (ctx) => {
        carton(ctx, x + 0.4, y + 2.35, gz(x, y + 2.6), 0.6, 0.5, 0.45, 'MISC');
        const [X, Y] = P3(x + 0.9, y + 2.6, gz(x, y + 2.6));
        ctx.beginPath(); ctx.moveTo(X - 0.18, Y); ctx.lineTo(X - 0.22, Y - 0.35); ctx.lineTo(X + 0.22, Y - 0.35); ctx.lineTo(X + 0.18, Y); ctx.closePath(); paint(ctx, C.coral, { lw: 0.03 });
        for (const [dx, dy, r] of [[0, -0.6, 0.25], [-0.2, -0.45, 0.18], [0.2, -0.5, 0.2]]) { ctx.beginPath(); ctx.arc(X + dx, Y + dy, r, 0, Math.PI * 2); paint(ctx, C.leaf, { lw: 0.025 }); }
      }, { on: between(7, 18.5) });
      R.thing(x + 1.2, y + 3.5, (ctx) => {
        const lx = x + 1.0, ly = y + 3.3, lz = gz(lx, ly);
        disc(ctx, lx, ly, lz + 0.02, 0.2, C.ink, { lw: 0.02 });
        line(ctx, [[lx, ly, lz], [lx, ly, lz + 2.4]], C.ink, 0.05);
        const [X, Y] = P3(lx, ly, lz + 2.4);
        ctx.beginPath(); ctx.moveTo(X - 0.3, Y + 0.1); ctx.lineTo(X + 0.3, Y + 0.1); ctx.lineTo(X + 0.2, Y - 0.35); ctx.lineTo(X - 0.2, Y - 0.35); ctx.closePath(); paint(ctx, C.butter, { lw: 0.03, dots: C.mustard, density: 0.2 });
      }, { on: between(7, 18.5) });
      const rider = folk(641, { top: C.purple, style: 'bun', bottom: C.ink });
      stay(R, x + 0.55, y + 1.2, rider, { z: gz(x, y + 1.2) + 0.53 - 0.71, pose: 'sit', dir: 'r', hours: between(7, 18.5), umb: C.teal, depth: x + y + 3.11 });
      talk(R, x + 0.55, y + 1.2, z + 2.6, (t) => (between(7, 18.5)(t) ? lines(['It said four minutes.', 'Still four minutes.', 'The lamp gets the window seat.'], 18, 3.2, 0.5)(t) : null), { size: 0.38 });
    }

    // ---------- The audience ----------
    // A sign on a stake, and the scoreboard on an easel.
    {
      const x = 29.0, y = 21.4, z = gz(x, y);
      R.thing(x, y, (ctx) => {
        line(ctx, [[x, y, z], [x, y, z + 1.4]], C.wood, 0.08);
        board(ctx, x + 0.05, y, z + 1.55, 1.3, 0.7, C.woodLight, [['MOVING DAY', 0.14, C.ink], ['JUDGES', 0.18, C.red], ['NO BRIBES (COFFEE OK)', 0.07, C.ink, 'Rethink Sans']]);
      });
    }
    {
      const x = 32.3, y = 21.1, z = gz(x, y);
      const easel = (truck) => (ctx) => {
        for (const dy of [-0.55, 0.55]) line(ctx, [[x + 0.1, y + dy, z], [x, y + dy * 0.8, z + 2.3]], C.wood, 0.07);
        line(ctx, [[x - 0.5, y, z], [x, y, z + 2.2]], C.wood, 0.06);
        board(ctx, x + 0.06, y, z + 1.65, 1.5, 1.15, mix(C.green, C.ink, 0.6), [
          ["TODAY'S SCORES", 0.13, C.white],
          ['ROPE COUCH  9', 0.11, C.butter],
          ['FUTON  4', 0.11, C.butter],
          ['THE BIKE (x3)  6', 0.11, C.butter],
          [truck ? 'TRUCK  10!' : 'TRUCK  2', 0.13, truck ? C.mustard : C.coral],
        ]);
      };
      R.thing(x + 0.1, y + 0.6, easel(false), { on: (t) => hh(t) < 15.3 });
      R.thing(x + 0.1, y + 0.6, easel(true), { on: (t) => hh(t) >= 15.3 });
    }
    AUD.forEach((m, i) => {
      const z = gz(m.x, m.y), s = m.scale || 1;
      const seated = within(m.a + 0.22, m.l);
      const look = { ...m.look, ...(m.scale ? { scale: m.scale } : {}) };
      const sit = (wet) => (ctx) => {
        lawnChair(ctx, m.x, m.y, z, m.chair, { face: -1 });
        person(ctx, m.x - 0.02, m.y, z + 0.46 - 0.71 * s, { ...look, pose: 'sit', dir: 'l', back: true, ...(m.hold ? { hold: m.hold } : {}) }, 0);
        if (m.poncho) poncho(ctx, m.x - 0.02, m.y, z + 0.46 - 0.71 * s, s);
        chairBack(ctx, m.x, m.y, z, m.chair);
        if (wet) umbrella(ctx, m.x - 0.05, m.y, z - 0.25 * s, m.umb);
      };
      const d = m.x + m.y + 0.35;
      R.thing(m.x, m.y, sit(false), { depth: d, on: (t) => seated(t) && !raining(t) && !CHEER(t) });
      R.thing(m.x, m.y, sit(true), { depth: d, on: (t) => seated(t) && raining(t) && !CHEER(t) });
      // 3pm: on their feet.
      R.thing(m.x, m.y, (ctx, t) => {
        person(ctx, m.x - 0.75, m.y, gz(m.x - 0.75, m.y), { ...look, pose: 'cheer', dir: 'l', back: true }, t);
        lawnChair(ctx, m.x, m.y, z, m.chair, { face: -1 });
      }, { depth: d, anim: true, on: (t) => seated(t) && CHEER(t) });
      // The card, held up now and then.
      R.thing(m.x, m.y, (ctx, t) => {
        const up = CHEER(t) ? 0.7 : 0;
        scoreCard(ctx, m.x - (CHEER(t) ? 0.75 : 0), m.y, (CHEER(t) ? gz(m.x - 0.75, m.y) - 0.3 : z - 0.35 * s) + up, cardFor(m, i, t), m.truck && stuck(t));
      }, { depth: d + 0.05, anim: true, on: (t) => seated(t) && raised(i)(t) && (!raining(t) || m.truck || i % 3 === 0) });
      // Walking in with a folded chair, and out again.
      R.mover((t) => {
        const hr = hh(t);
        let k = null, out = false;
        if (hr >= m.a && hr < m.a + 0.22) k = (hr - m.a) / 0.22;
        else if (hr >= m.l && hr < m.l + 0.22) { k = 1 - (hr - m.l) / 0.22; out = true; }
        if (k == null) return HIDE;
        const sx = 28.8, sy = m.y + 1.4;
        return { x: sx + (m.x - 0.6 - sx) * k, y: sy + (m.y - sy) * k, dir: out ? 'l' : 'r', back: out };
      }, (ctx, t, p) => {
        if (p.hide) return;
        const zz = gz(p.x, p.y);
        person(ctx, p.x, p.y, zz, { ...look, pose: 'walk', dir: p.dir, back: p.back, hold: chairHeld(m.chair) }, t);
        if (raining(t)) umbrella(ctx, p.x, p.y, zz, m.umb, Math.sin(t * 7) * 0.04);
      });
    });
    // What they say.
    const A = (i) => AUD[i];
    talk(R, A(1).x, A(1).y, gz(A(1).x, A(1).y) + 2.3, (t) => (stuck(t) ? lines(['The truck gets a two.', 'Still a two.', 'Generous, honestly.'], 17, 3.4, 0.1)(t) : null));
    talk(R, A(0).x, A(0).y, gz(A(0).x, A(0).y) + 2.3, (t) => (within(7.2, 19.3)(t) && !CHEER(t) ? lines(['Lift with your legs!', 'Not the good lamp!', 'Nine for the rope work.'], 23, 3, 0.55)(t) : null));
    talk(R, A(2).x, A(2).y, gz(A(2).x, A(2).y) + 2.3, (t) => (within(8.1, 20.2)(t) && !CHEER(t) ? lines(['Pivot! PIVOT!', 'That will never fit.', 'Ooh, a futon.'], 29, 3, 0.8)(t) : null));
    talk(R, A(3).x, A(3).y, gz(A(3).x, A(3).y) + 1.9, (t) => (within(8.5, 17.5)(t) && !CHEER(t) ? lines(['Ten! Ten!', 'Everything is a ten.'], 31, 2.6, 0.2)(t) : null));
    talk(R, A(8).x, A(8).y, gz(A(8).x, A(8).y) + 2.3, (t) => (within(12.5, 13.1)(t) && every(12, 3)(t) ? 'Here come the keys.' : null));
    talk(R, 30.8, 27.4, gz(30.8, 27.4) + 3.3, (t) => (CHEER(t) ? (frac(t / 4) < 0.6 ? 'YAAAY!' : 'TEN! TEN! TEN!') : null), { size: 0.55 });

    // ---------- The goose, a judge in a yellow poncho ----------
    // In the front row between the kid in the matching poncho (its twin) and
    // the purple chair, all day and all night, its card up: HONK.
    const GC = [FX, 29.45], gcz = gz(GC[0], GC[1]);
    R.thing(GC[0], GC[1], (ctx) => {
      lawnChair(ctx, GC[0], GC[1], gcz, C.coral, { face: -1 });
      ponchoGoose(ctx, GC[0] - 0.05, GC[1], gcz + 0.46);
      chairBack(ctx, GC[0], GC[1], gcz, C.coral);
      scoreCard(ctx, GC[0] - 0.05, GC[1] - 0.1, gcz - 0.75, 'HONK', true, 1.5);
    }, { depth: GC[0] + GC[1] + 0.35 });
    R.goose([GC[0] - 0.05, GC[1], gcz + 0.4], { kind: 'hard', hidden: true, hint: 'Two judges in yellow ponchos. One has a beak, and scores everything HONK.' });
    talk(R, GC[0], GC[1], gcz + 3.6, (t) => (CHEER(t) ? 'HONK!' : null), { size: 0.5 });

    // ---------- The couch ----------
    // Carried over from somebody's curb at 1pm, the cooler behind it.
    R.mover((t) => {
      const hr = hh(t);
      if (hr < COUCH_IN || hr >= COUCH_AT) return HIDE;
      const k = (hr - COUCH_IN) / (COUCH_AT - COUCH_IN);
      // Up from the south end of the road, past the chairs' end.
      const sx = 28.8, sy = 45.5;
      return { x: sx + (CO.x - sx) * k, y: sy + (CO.y - sy) * k };
    }, (ctx, t, p) => {
      if (p.hide) return;
      const z = gz(p.x + 0.7, p.y + 1.2), bob = Math.abs(Math.sin(t * 7)) * 0.05;
      const who = (j, dy, hold) => person(ctx, p.x + 0.7, p.y + dy, gz(p.x + 0.7, p.y + dy), { ...TRIO[j], pose: 'walk', dir: 'r', back: true, ...(hold ? { hold } : { arms: [1.3, 1.3] }) }, t + j);
      // The back carrier a step clear of the couch's end, or its tall back
      // hides his head and he's a pair of legs under a sofa.
      who(0, -0.5, null);
      couch(ctx, p.x, p.y, z + 0.75 + bob, COUCH_INK, null);
      who(1, CO.d + 0.1, null);
      who(2, CO.d + 1.6, (c) => { c.beginPath(); c.rect(-0.1, -0.1, 0.7, 0.45); paint(c, C.white, { lw: 0.03 }); c.fillStyle = C.teal; c.fillRect(-0.1, -0.1, 0.7, 0.12); });
      if (Q.detail && frac(t / 6) < 0.5) speech(ctx, p.x + 0.7, p.y + 1.2, z + 3.2, frac(t / 12) < 0.5 ? 'It was free!' : 'Front row!', { size: 0.42 });
    });
    {
      const z = gz(CO.x + 0.7, CO.y + 1.2);
      const sitX = CO.x + 0.55, seatZ = z + 0.64;
      const ys = [CO.y + 0.62, CO.y + 1.2, CO.y + 1.78];
      const trio = (pose, zz, t) => (ctx) => ys.forEach((y, j) => person(ctx, sitX, y, zz, { ...TRIO[j], pose, dir: 'l', back: true, ...(j === 1 && pose === 'sit' ? { hold: cupHeld } : {}) }, t + j));
      const on = within(COUCH_AT, 29);
      R.thing(CO.x + CO.w, CO.y + CO.d / 2, (ctx) => couch(ctx, CO.x, CO.y, z, COUCH_INK, trio('sit', seatZ - 0.71, 0)), { on: (t) => on(t) && !raining(t) && !CHEER(t) });
      R.thing(CO.x + CO.w, CO.y + CO.d / 2, (ctx) => {
        couch(ctx, CO.x, CO.y, z, COUCH_INK, trio('sit', seatZ - 0.71, 0));
        umbrella(ctx, sitX, ys[1], z - 0.1, C.coral, 0, 1.35, 3.0);
      }, { on: (t) => on(t) && raining(t) && !CHEER(t) });
      R.thing(CO.x + CO.w, CO.y + CO.d / 2, (ctx, t) => couch(ctx, CO.x, CO.y, z, COUCH_INK, trio('cheer', seatZ, t)), { anim: true, on: (t) => on(t) && CHEER(t) });
      // Cooler (a can of Gander Cola on its lid), radio, and a lantern for later.
      const cx = 30.0, cy = 36.4, cz = gz(cx, cy);
      R.thing(cx + 0.4, cy + 0.3, (ctx) => {
        box(ctx, cx - 0.4, cy - 0.28, cz, 0.8, 0.56, 0.45, C.white, { flat: true, lw: 0.035 });
        // Its inside (ice), seen when the lid's up.
        face(ctx, [[cx - 0.36, cy - 0.22, cz + 0.44], [cx + 0.36, cy - 0.22, cz + 0.44], [cx + 0.36, cy + 0.22, cz + 0.44], [cx - 0.36, cy + 0.22, cz + 0.44]], tint(C.sky, 0.55), { lw: 0.02 });
        // A can of Gander Cola on the grass by it.
        cylinder(ctx, cx + 0.62, cy + 0.2, cz, 0.09, 0.26, BRAND.can);
        if (Q.detail) { const [X, Y] = P3(cx + 0.62, cy + 0.2, cz + 0.13); ctx.fillStyle = BRAND.ink; ctx.fillRect(X - 0.12, Y - 0.03, 0.24, 0.06); }
        // The radio, on the grass.
        const rx = 29.5, ry = 37.1, rz = gz(rx, ry);
        box(ctx, rx - 0.35, ry - 0.15, rz, 0.7, 0.3, 0.42, C.grey, { flat: true, lw: 0.03 });
        for (const dx of [-0.18, 0.18]) { const [X, Y] = P3(rx + dx, ry + 0.151, rz + 0.2); ctx.beginPath(); ctx.ellipse(X, Y, 0.13, 0.13, 0, 0, Math.PI * 2); paint(ctx, C.ink, { lw: 0.02 }); }
        line(ctx, [[rx + 0.25, ry, rz + 0.42], [rx + 0.5, ry - 0.2, rz + 1.1]], C.ink, 0.025);
      }, { on: within(COUCH_AT, 29) });
      // The lid: a tap swings it up. Inside, the fridge they moved out of,
      // on ice: ketchup, a lemon, and a jar of pickles (a find).
      const cooler = R.poke({ id: 'cooler', at: [cx, cy, cz + 0.5], r: 0.8, sound: 'clunk', say: ['The whole fridge, on ice.', 'Shut the lid, the ice!', 'Moved: one fridge. Sort of.'] });
      R.thing(cx + 0.42, cy + 0.32, (ctx) => {
        const k = cooler.k(), a = k * 1.75, hx = cx - 0.42, top = cz + 0.45;
        if (k > 0.05) {
          // A big green glass jar standing up out of the ice, the pickles
          // showing through it, a gold lid (a red lid read as a soda can).
          pickleJar(ctx, cx + 0.14, cy + 0.02, top - 0.12);
          if (Q.detail) { box(ctx, cx - 0.25, cy - 0.15, top - 0.1, 0.12, 0.12, 0.28, C.red, { flat: true, lw: 0.02 }); disc(ctx, cx - 0.2, cy + 0.12, top, 0.08, C.butter, { lw: 0.015 }); }
        }
        // Shut, it won't quite: the jar is too tall, so the lid rides up on its
        // gold top, which shows in the gap, and a pickle hangs over the rim.
        if (k < 0.05) {
          disc(ctx, cx + 0.14, cy + 0.02, top + 0.02, 0.15, C.mustard, { lw: 0.02 });
          if (Q.detail) {
            const [X, Y] = P(cx + 0.42, cy + 0.1, top - 0.02);
            ctx.beginPath(); ctx.ellipse(X, Y + 0.09, 0.05, 0.13, 0.15, 0, Math.PI * 2); paint(ctx, mix(C.green, C.ink, 0.25), { lw: 0.018 });
          }
        }
        // The lid, hinged at its back edge (shut, propped open a crack on the jar).
        const L = 0.84, ux = Math.cos(a) * L, uz = Math.sin(a) * L + (k < 0.05 ? 0.16 : 0);
        face(ctx, [[hx, cy - 0.3, top], [hx, cy + 0.3, top], [hx + ux, cy + 0.3, top + uz], [hx + ux, cy - 0.3, top + uz]], C.teal, { lw: 0.03 });
        face(ctx, [[hx + ux, cy - 0.3, top + uz], [hx + ux, cy + 0.3, top + uz], [hx + ux, cy + 0.3, top + uz + 0.1], [hx + ux, cy - 0.3, top + uz + 0.1]], shade(C.teal, 0.15), { lw: 0.025 });
        face(ctx, [[hx, cy + 0.3, top], [hx + ux, cy + 0.3, top + uz], [hx + ux, cy + 0.3, top + uz + 0.1], [hx, cy + 0.3, top + 0.1]], shade(C.teal, 0.25), { lw: 0.025 });
        if (k < 0.05 && Q.detail) line(ctx, [[cx + 0.2, cy + 0.3, top + 0.02], [cx + 0.32, cy + 0.55, top + 0.08]], C.greyLight, 0.04);
      }, { anim: true, on: within(COUCH_AT, 29) });
      R.find({ id: 'pickles', label: 'A jar of pickles', kind: 'poke', inside: cooler, when: within(COUCH_AT, 29), note: 'after 2pm', at: [cx + 0.12, cy, cz + 0.6], r: 0.8, hint: 'The couch crowd brought their old fridge along, in something with a lid.' });
      R.thing(cx + 0.41, cy + 0.31, (ctx, t) => {
        for (let i = 0; i < 3; i++) { const k = frac(t * 0.5 + i / 3); ctx.save(); ctx.globalAlpha *= 1 - k; note(ctx, 29.5 + k * 0.4, 37.1 - k * 0.2, gz(29.5, 37.1) + 0.6 + k * 1.3, nightK(t) > 0.5 ? C.butter : C.ink, 0.7); ctx.restore(); }
      }, { anim: true, on: within(16, 26) });
      R.thing(cx - 0.19, cy - 0.14, (ctx) => box(ctx, cx - 0.17, cy - 0.12, cz + 0.58, 0.16, 0.16, 0.22, LIT, { flat: true, lw: 0.02 }), { on: (t) => within(COUCH_AT, 29)(t) && nightK(t) > 0.3 });
      R.light({ at: [cx - 0.1, cy - 0.05, cz + 0.8], r: 2.4, color: LIT, k: (t) => (within(19.5, 29)(t) ? nightK(t) : 0) });
      talk(R, sitX, ys[1], z + 2.6, (t) => (within(21, 28.5)(t) ? lines(['Best Moving Day yet.', 'Same time next year?', 'Who brought the couch?', 'It was free.'], 19, 3.4, 0.4)(t) : within(COUCH_AT, 15.1)(t) || within(15.7, 19)(t) ? lines(['Comfier than the chairs.', 'It has a smell.', 'A nine for the couch.'], 23, 3, 0.6)(t) : null), { size: 0.42 });
    }

    // ---------- The scorecard (a find): a 2, dropped in the grass ----------
    {
      const [x, y] = [31.6, 29.4], z = gz(x, y) + 0.03;
      R.rug((ctx) => {
        // Bigger than the judges' cards held up, so it reads as one lying
        // in the grass at phone size: a fat red 2 on white, its stirrer out.
        face(ctx, [[x - 0.66, y - 0.52, z], [x + 0.68, y - 0.42, z], [x + 0.62, y + 0.56, z], [x - 0.72, y + 0.46, z]], C.white, { lw: 0.045 });
        line(ctx, [[x + 0.15, y + 0.5, z + 0.01], [x + 1.25, y + 1.2, z + 0.01]], C.wood, 0.1);
        if (Q.detail) { ctx.save(); ctx.translate(0, -z * ZK); paintText(ctx, 'floor', x, y, '2', 0.9, C.red); ctx.restore(); }
      });
      R.find({ id: 'scorecard', label: 'A scorecard in the grass', at: [x, y, z + 0.05], r: 1.0 });
    }

    // ---------- The kite in the tree (a find), and whose it is ----------
    {
      const kz = gz(KT[0], KT[1]);
      const KITE = [KT[0] + 0.5, KT[1] - 0.45, kz + 2.75];
      R.thing(KT[0] + 0.3, KT[1] + 0.3, (ctx, t) => {
        const [X, Y] = P3(...KITE);
        ctx.save(); ctx.translate(X, Y); ctx.rotate(0.35);
        // The tail, hanging down through the branches, with its bows.
        ctx.beginPath(); ctx.moveTo(0, 0.5);
        const pts = [];
        for (let i = 1; i <= 6; i++) { const px = Math.sin(t * 2.4 + i * 0.9) * 0.08 * i * 0.4, py = 0.5 + i * 0.28; pts.push([px, py]); ctx.lineTo(px, py); }
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
        if (Q.detail) for (const [i, [px, py]] of pts.entries()) if (i % 2) { ctx.beginPath(); ctx.moveTo(px - 0.1, py - 0.06); ctx.lineTo(px + 0.1, py + 0.06); ctx.lineTo(px + 0.1, py - 0.06); ctx.lineTo(px - 0.1, py + 0.06); ctx.closePath(); paint(ctx, [C.coral, C.teal, C.mustard][i % 3], { lw: 0.02 }); }
        // The kite: two halves, crossed sticks.
        ctx.beginPath(); ctx.moveTo(0, -0.5); ctx.lineTo(0.34, -0.05); ctx.lineTo(0, 0.5); ctx.closePath(); paint(ctx, C.coral, { lw: 0.035 });
        ctx.beginPath(); ctx.moveTo(0, -0.5); ctx.lineTo(-0.34, -0.05); ctx.lineTo(0, 0.5); ctx.closePath(); paint(ctx, C.mustard, { lw: 0.035 });
        ctx.strokeStyle = C.brown; ctx.lineWidth = 0.035; ctx.beginPath(); ctx.moveTo(0, -0.5); ctx.lineTo(0, 0.5); ctx.moveTo(-0.34, -0.05); ctx.lineTo(0.34, -0.05); ctx.stroke();
        ctx.restore();
        // Its string, down to a low branch.
        if (Q.detail) line(ctx, [KITE, [KT[0] + 0.2, KT[1] - 0.1, kz + 1.6]], alpha(C.ink, 0.6), 0.015);
      }, { anim: true, depth: KT[0] + KT[1] + 0.3 });
      R.find({ id: 'kite', label: 'A kite in a tree', at: KITE, r: 0.9 });
      // The dad's frisbee, up there too from four o'clock.
      const FRIS = [KT[0] - 0.4, KT[1] + 0.5, kz + 3.2];
      R.thing(KT[0] + 0.31, KT[1] + 0.31, (ctx) => { const [X, Y] = P3(...FRIS); ctx.beginPath(); ctx.ellipse(X, Y, 0.26, 0.1, 0.4, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.03 }); }, { on: within(16.1, 29), depth: KT[0] + KT[1] + 0.31 });
      // The kid: jumping for it in the morning, under Dad's umbrella in the
      // rain, Dad's big idea at four, on his shoulders after.
      const kid = folk(650, { top: C.red, style: 'curly', scale: 0.72 });
      const dad = folk(651, { top: C.navy, bottom: C.grey, hat: 'cap' });
      const K = [KT[0] + 1.1, KT[1] + 1.0], D = [KT[0] + 1.9, KT[1] + 1.6];
      R.thing(K[0], K[1], (ctx, t) => person(ctx, K[0], K[1], gz(...K), { ...kid, pose: 'jump', dir: 'r', back: true }, t), { anim: true, on: within(7, 9.6) });
      talk(R, K[0], K[1], gz(...K) + 2.3, (t) => (within(7, 9.6)(t) ? lines(['So close!', 'Come DOWN!'], 11, 2.6)(t) : null), { size: 0.4 });
      stay(R, D[0], D[1], dad, { dir: 'r', back: true, hold: cupHeld, hours: within(7, 9.6) });
      // The rain: both under his umbrella, looking up at it.
      stay(R, K[0], K[1], kid, { dir: 'r', back: true, hours: within(9.6, 15.4) });
      stay(R, K[0] + 0.5, K[1] + 0.4, dad, { dir: 'r', back: true, hours: within(9.6, 15.4), over: (ctx) => umbrella(ctx, K[0] + 0.3, K[1] + 0.2, gz(...K), C.mustard) });
      // Four o'clock: the frisbee.
      stay(R, K[0], K[1], kid, { dir: 'r', back: true, hours: within(15.4, 16.6) });
      R.mover((t) => (within(15.4, 16.6)(t) ? { x: D[0], y: D[1] } : HIDE), (ctx, t, p) => {
        if (p.hide) return;
        const hr = hh(t), wind = hr < 16.0 ? Math.sin(t * 3) * 0.5 : 0;
        person(ctx, D[0], D[1], gz(...D), { ...dad, pose: 'stand', dir: 'r', back: true, arms: hr < 16.0 ? [2.2 + wind, -0.2] : [2.9, -0.2], ...(hr < 16.0 ? { hold: frisbeeHeld } : {}) }, t);
        if (hr >= 16.0 && hr < 16.1) {
          const k = (hr - 16.0) / 0.1, a = P3(D[0], D[1], gz(...D) + 2.3), b = P3(...FRIS);
          ctx.beginPath(); ctx.ellipse(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k - Math.sin(k * Math.PI) * 0.8, 0.26, 0.1, t * 9, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.03 });
        }
        if (Q.detail && hr < 16.0) speech(ctx, D[0], D[1], gz(...D) + 3, 'Stand back.', { size: 0.4 });
        if (Q.detail && hr >= 16.15 && hr < 16.45) speech(ctx, K[0], K[1], gz(...K) + 2.2, 'DAD.', { size: 0.46 });
      });
      // Then: the kid on his shoulders, reaching.
      stay(R, D[0] - 0.4, D[1] - 0.3, dad, { dir: 'r', back: true, arms: [1.0, -1.0], hours: within(16.6, 18.6), over: (ctx) => person(ctx, D[0] - 0.4, D[1] - 0.29, gz(D[0], D[1]) + 1.55, { ...kid, pose: 'stand', dir: 'r', back: true, arms: [Math.PI - 0.3, -Math.PI + 0.5] }, 0) });
      talk(R, D[0] - 0.4, D[1] - 0.3, gz(...D) + 4.2, (t) => (within(16.6, 18.6)(t) ? lines(['Little higher.', 'Got the frisbee!', 'Not the kite.'], 13, 3)(t) : null), { size: 0.4 });
    }

    // ---------- The bath house ----------
    twice(R, BH.x1 + 0.35, BH.y1 + 0.35, bathHouse);
    R.light({ at: [BH.x1 + 0.3, (BH.y0 + BH.y1) / 2, gz(BH.x1, BH.y1) + 2.4], r: 2.6, color: LIT, k: nightK });
    // A gull on the ridge, the barrel, the outdoor shower.
    R.thing(BH.x1 + 0.4, BH.y1 + 0.4, (ctx, t) => gullStand(ctx, BH.x1 - 1.5, (BH.y0 + BH.y1) / 2, gz(BH.x1, BH.y1) + 3.85, t, false, Math.sin(t * 0.4) > 0 ? 1 : -1), { anim: true, depth: BH.x1 + BH.y1 + 0.5 });
    {
      const x = 37.9, y = 28.0, z = gz(x, y);
      R.thing(x, y, (ctx) => barrel(ctx, x, y, z, mix(C.green, C.ink, 0.35)));
      R.thing(x, y + 0.01, (ctx, t) => gullStand(ctx, x + 0.05, y, z + 1.08, t, true, -1), { anim: true, on: (t) => !raining(t) });
      const sx = 44.1, sy = 24.2, sz = gz(sx, sy);
      R.thing(sx, sy, (ctx) => {
        pole(ctx, sx, sy, sz, 2.4, C.greyLight, 0.07);
        line(ctx, [[sx, sy, sz + 2.35], [sx + 0.45, sy, sz + 2.35]], C.greyLight, 0.1);
        disc(ctx, sx + 0.5, sy, sz + 2.28, 0.14, C.grey, { lw: 0.02 });
      });
      R.thing(sx + 0.51, sy + 0.01, (ctx, t) => {
        for (let i = 0; i < 6; i++) { const k = frac(t * 1.6 + i / 6); disc(ctx, sx + 0.5 + Math.sin(i * 2.1) * 0.12, sy + Math.cos(i * 2.1) * 0.12, sz + 2.2 - k * 2.1, 0.03, alpha(C.sky, 1 - k * 0.5), { stroke: false }); }
      }, { anim: true, on: within(16.3, 17.8) });
      stay(R, sx + 0.5, sy + 0.1, folk(652, { top: C.sky, style: 'long', scale: 0.72 }), { scale: 0.72, dir: 'l', hours: within(16.3, 17.8), arms: [2.6, -2.6] });
    }

    // ---------- The lifeguard chair (empty in September) ----------
    {
      const x = 45.3, y = 31.2, z = gz(x, y);
      R.thing(x + 0.6, y + 0.6, (ctx) => {
        for (const [dx, dy] of [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]]) line(ctx, [[x + dx, y + dy, z], [x + dx * 0.5, y + dy * 0.6, z + 2.2]], C.white, 0.12);
        for (let i = 1; i < 4; i++) line(ctx, [[x + 0.5, y - 0.5 + 0.02, z + i * 0.55], [x + 0.5, y + 0.5, z + i * 0.55]], C.white, 0.07);
        box(ctx, x - 0.35, y - 0.4, z + 2.2, 0.7, 0.8, 0.1, C.white, { flat: true, lw: 0.03 });
        box(ctx, x - 0.4, y - 0.4, z + 2.3, 0.1, 0.8, 0.8, C.white, { flat: true, lw: 0.03 });
        board(ctx, x + 0.3, y, z + 1.55, 0.9, 0.55, C.red, [['OFF', 0.16, C.white], ['DUTY', 0.16, C.white]]);
      });
      R.thing(x + 0.61, y + 0.61, (ctx, t) => gullStand(ctx, x - 0.35, y, z + 3.1, t, false, frac(t / 17) < 0.5 ? 1 : -1), { anim: true });
      R.poke({ id: 'lifeguard', at: [x, y, z + 2.0], r: 0.9, sound: 'tick', say: ['Off duty. Back in June.', 'The gull is in charge now.', 'Swim at your own risk.'] });
    }

    // ---------- The beach ----------
    // The lost flip-flop (a find), toe to the water.
    {
      const [x, y] = [47, 38.5], z = gz(x, y) + 0.03;
      R.rug((ctx) => {
        const u = [0.8, 0.45], v = [-0.3, 0.55];
        const pt = (a, b, zz = z) => [x + u[0] * a + v[0] * b, y + u[1] * a + v[1] * b, zz];
        ctx.beginPath();
        for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI * 2; const r = Math.sin(a) > 0 ? 0.3 : 0.26; const [X, Y] = P3(...pt(Math.cos(a) * 0.5, Math.sin(a) * r)); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
        ctx.closePath(); paint(ctx, C.pink, { lw: 0.035, dots: shade(C.pink, 0.4), density: 0.12 });
        line(ctx, [pt(0.3, -0.24, z + 0.1), pt(0.35, 0, z + 0.02)], C.teal, 0.07);
        line(ctx, [pt(0.3, 0.24, z + 0.1), pt(0.35, 0, z + 0.02)], C.teal, 0.07);
        line(ctx, [pt(0.3, -0.24, z + 0.1), pt(-0.05, -0.28, z + 0.01)], C.teal, 0.07);
        line(ctx, [pt(0.3, 0.24, z + 0.1), pt(-0.05, 0.28, z + 0.01)], C.teal, 0.07);
      });
      R.find({ id: 'flipflop', label: 'A lost flip-flop', kind: 'hard', at: [x, y, z + 0.1], r: 0.9, riddle: 'One foot went home bare.', hint: 'Follow the footprints across the sand toward the water.' });
    }
    // A sandcastle with a flag; the rain gets it.
    {
      const x = 45.3, y = 43.0, z = gz(x, y);
      const castle = (melted) => (ctx) => {
        if (!melted) {
          box(ctx, x - 0.5, y - 0.5, z, 1.0, 1.0, 0.35, SAND, { lw: 0.03, dens: 0.2 });
          for (const [dx, dy] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) cylinder(ctx, x + dx, y + dy, z + 0.3, 0.16, 0.3, SAND);
          cylinder(ctx, x, y, z + 0.35, 0.22, 0.45, SAND);
        } else {
          const [X, Y] = P3(x, y, z);
          ctx.beginPath(); ctx.ellipse(X, Y - 0.1, 0.8, 0.35, 0, Math.PI, 0); ctx.closePath(); paint(ctx, SAND, { lw: 0.03, dots: shade(SAND, 0.35), density: 0.2 });
        }
        const top = z + (melted ? 0.35 : 0.8);
        line(ctx, [[x, y, top], [x, y, top + 0.55]], C.ink, 0.03);
        face(ctx, [[x, y, top + 0.55], [x + 0.001, y + 0.35, top + 0.45], [x, y, top + 0.35]], C.coral, { lw: 0.02 });
        disc(ctx, x + 0.9, y - 0.2, z + 0.02, 0.18, C.teal, { lw: 0.025 });
      };
      R.thing(x + 0.5, y + 0.5, castle(false), { on: (t) => hh(t) < 10.5 });
      R.thing(x + 0.5, y + 0.5, castle(true), { on: (t) => hh(t) >= 10.5 });
    }
    // A real Canada goose, grazing the lawn all day (the decoy).
    {
      const [x, y] = CANADA, z = gz(x, y);
      R.thing(x, y, (ctx, t) => canadaGoose(ctx, x, y, z, t), { anim: true });
      R.decoy({ id: 'canada', at: [x, y, z + 0.5], r: 0.8, say: ["Wrong goose. That one's Canadian.", 'Still Canadian.', 'Sorry. Very sorry. Honk.'] });
    }
    // Gulls at the water's edge, and one working the beach from the air.
    R.thing(48.2, 22.3, (ctx, t) => { gullStand(ctx, 47.8, 21.2, gz(47.8, 21.2), t, true, 1); gullStand(ctx, 48.3, 22.4, gz(48.3, 22.4), t, false, -1); gullStand(ctx, 46.9, 45.3, gz(46.9, 45.3), t, true, -1); }, { anim: true });
    R.mover((t) => { const a = t / 9; return { x: 46 + Math.cos(a) * 3, y: 30 + Math.sin(a) * 9 }; }, (ctx, t, p) => gullFly(ctx, p.x, p.y, 5.5 + Math.sin(t * 0.7), t), { bias: 4 });
    // The sunbather, before the rain and after it, under a striped umbrella.
    {
      const x = 44.6, y = 17.6, z = gz(x, y);
      const here = (t) => within(7.6, 9.7)(t) || within(15.9, 18.3)(t);
      R.thing(x + 0.4, y + 0.9, (ctx) => {
        face(ctx, [[x - 0.5, y - 1.0, z + 0.02], [x + 0.5, y - 1.0, z + 0.02], [x + 0.5, y + 1.0, z + 0.02], [x - 0.5, y + 1.0, z + 0.02]], C.teal, { lw: 0.03, dots: C.white, density: 0.3 });
        person(ctx, x, y + 0.3, z - 0.3, { ...folk(653, { top: C.coral, style: 'long' }), pose: 'lie', dir: 'r' }, 0);
        line(ctx, [[x - 0.6, y - 0.9, z], [x - 0.6, y - 0.9, z + 2.3]], C.ink, 0.05);
        umbrella(ctx, x - 0.6, y - 0.9, z - 0.3, C.pink, 0, 1.1, 2.7);
      }, { on: here });
    }
    // The metal detector, up and down the beach all day.
    {
      const look = folk(654, { top: C.green, bottom: C.brown, hat: 'sun', hair: C.greyLight });
      const w = route([[45.8, 12], [46.2, 26, 3], [45.9, 47, 2]], { speed: 0.35, loop: false });
      R.mover((t) => (within(7, 19.2)(t) ? w(t) : HIDE), (ctx, t, p) => {
        if (p.hide) return;
        const z = gz(p.x, p.y);
        person(ctx, p.x, p.y, z, { ...look, pose: p.moving ? 'walk' : 'stand', speed: 3, dir: p.dir, back: p.back, hold: detectorHeld }, t);
        if (raining(t)) umbrella(ctx, p.x, p.y, z, C.green);
        if (Q.detail && !p.moving) speech(ctx, p.x, p.y, z + 3, frac(t / 40) < 0.5 ? 'BEEP. A bottle cap.' : 'BEEP. Another key.', { size: 0.38 });
      });
    }

    // ---------- An L Street Brownie, swimming in the rain ----------
    {
      const look = folk(655, { top: C.coral, bottom: C.coral, style: 'bald', hair: C.greyLight, hat: 'beanie' });
      const TOWEL = [46.6, 34.2];
      R.thing(TOWEL[0] + 0.5, TOWEL[1] + 0.5, (ctx) => {
        const z = gz(...TOWEL) + 0.02;
        face(ctx, [[TOWEL[0] - 0.4, TOWEL[1] - 0.6, z], [TOWEL[0] + 0.4, TOWEL[1] - 0.6, z], [TOWEL[0] + 0.4, TOWEL[1] + 0.6, z], [TOWEL[0] - 0.4, TOWEL[1] + 0.6, z]], C.coral, { lw: 0.03, dots: C.white, density: 0.3 });
        box(ctx, TOWEL[0] - 0.2, TOWEL[1] - 0.45, z, 0.4, 0.35, 0.3, C.navy, { flat: true, lw: 0.025 });
      });
      // In the bay all day, rain or shine (out at seven, to his towel), and
      // on his towel all night, waiting for the dawn swim: the park's teach
      // poke, so he's always somewhere to tap.
      const swimming = within(6.5, 19);
      const swimAt = (t) => { const k = frac(t / 70), u = k < 0.5 ? k * 2 : 2 - k * 2; return { x: 51.4 + Math.sin(t / 9) * 0.6, y: 22 + 14 * u, dir: k < 0.5 ? 'l' : 'r' }; };
      const onTowel = (t) => !swimming(t) && !within(19, 19.35)(t);
      R.mover((t) => (swimming(t) ? swimAt(t) : HIDE), (ctx, t, p) => {
        if (p.hide) return;
        wade(ctx, p.x, p.y, -1.15, 0, (c) => person(c, p.x, p.y, -1.15, { ...look, pose: 'swim', dir: p.dir }, t));
        if (Q.detail) { const s = lines(['Lovely out!', 'Sixty-one degrees!', 'Come on in!', 'Balmy!'], 14, 3.2)(t); if (s) speech(ctx, p.x, p.y, 1.4, s, { size: 0.42 }); }
      });
      walker(R, [[19, 49.6, 30.4], [19.35, TOWEL[0] + 0.6, TOWEL[1], { dir: 'l', hold: towelHeld, say: 'Refreshing!' }]], look);
      stay(R, TOWEL[0] + 0.1, TOWEL[1] + 0.2, look, { z: gz(...TOWEL) - 0.55, pose: 'sit', dir: 'r', hold: towelHeld, hours: onTowel, depth: TOWEL[0] + TOWEL[1] + 1.2 });
      R.poke({ id: 'brownie', teach: true, at: (t) => { if (swimming(t)) { const p = swimAt(t); return [p.x, p.y, 0.2]; } return [TOWEL[0] + 0.1, TOWEL[1] + 0.2, gz(...TOWEL) + 0.9]; }, r: 1.1, sound: 'pop', say: ['Sixty-one degrees!', 'Balmy! Come on in!', 'Every day since 1971.'] });
    }

    // ---------- A paddleboarder, after the rain ----------
    R.mover((t) => {
      if (!within(16.2, 19)(t)) return HIDE;
      const k = frac(t / 90), u = k < 0.5 ? k * 2 : 2 - k * 2;
      return { x: 54.5 + Math.sin(t / 11), y: 14 + 16 * u, dir: k < 0.5 ? 'l' : 'r' };
    }, (ctx, t, p) => {
      if (p.hide) return;
      const bob = Math.sin(t * 1.7) * 0.05;
      box(ctx, p.x - 0.3, p.y - 1.2, bob, 0.6, 2.4, 0.1, C.mustard, { flat: true, lw: 0.03 });
      person(ctx, p.x, p.y, bob + 0.1, { ...folk(656, { top: C.teal, style: 'pony' }), pose: 'stand', dir: p.dir, arms: [0.9 + Math.sin(t * 1.5) * 0.4, 0.6] }, t);
      const a = Math.sin(t * 1.5) * 0.4;
      line(ctx, [[p.x + 0.3, p.y, bob + 2.1], [p.x + 0.5 + a, p.y + a, -0.3]], C.ink, 0.05);
    });

    // ---------- Walkers on the Sugar Bowl loop ----------
    // Along the beach and out the Head Island causeway, and back.
    const LOOPWAY = [[43.3, 7.6], [43.1, 30], [43.4, 50.4], [45.4, 53.1], [57.2, 53.3]];
    {
      // Power walkers, a pair, rain or shine (in matching ponchos).
      const w = route(LOOPWAY, { speed: 1.9, loop: false });
      const looks = [folk(660, { top: C.pink, bottom: C.ink, hat: 'cap' }), folk(661, { top: C.purple, bottom: C.ink, style: 'bun' })];
      R.mover((t) => (within(6, 19.5)(t) ? w(t) : HIDE), (ctx, t, p) => {
        if (p.hide) return;
        const wet = raining(t);
        looks.forEach((lk, j) => {
          // Side by side on screen (0.75, 0.4 put one inside the other).
          const x = p.x + j * 0.9, y = p.y - j * 0.3, z = gz(x, y);
          person(ctx, x, y, z, { ...lk, ...(wet ? { top: C.mustard } : {}), pose: 'walk', speed: 11, dir: p.dir, back: p.back, arms: [Math.sin(t * 11 + j) * 1.1 + 0.4, -Math.sin(t * 11 + j) * 1.1 + 0.4] }, t);
        });
        if (Q.detail && frac(t / 25) < 0.12) speech(ctx, p.x, p.y, gz(p.x, p.y) + 3.1, wet ? 'Lap four! Wet lap!' : 'Lap four!', { size: 0.4 });
      });
    }
    {
      // A dog walker with two dogs.
      const w = route(LOOPWAY, { speed: 1.0, loop: false, offset: 60 });
      const lk = folk(662, { top: C.teal, bottom: C.navy, style: 'short' });
      R.mover((t) => (within(6.5, 22.5)(t) ? w(t) : HIDE), (ctx, t, p) => {
        if (p.hide) return;
        const z = gz(p.x, p.y), wet = raining(t);
        const ahead = p.back ? -1.2 : 1.2;
        const dogs = [[p.x + 0.5, p.y + ahead], [p.x - 0.3, p.y + ahead * 0.8]];
        for (const [dx, dy] of dogs) line(ctx, [[p.x, p.y, z + 1.3], [dx, dy, gz(dx, dy) + 0.45]], C.red, 0.03);
        dogs.forEach(([dx, dy], j) => dog(ctx, dx, dy, gz(dx, dy), t + j, p.dir, wet, j ? C.white : C.wood));
        person(ctx, p.x, p.y, z, { ...lk, pose: 'walk', dir: p.dir, back: p.back }, t);
        if (wet) umbrella(ctx, p.x, p.y, z, C.purple, Math.sin(t * 7) * 0.04);
      });
    }
    {
      // A stroller, and a jogger, when it's dry.
      const w = route(LOOPWAY, { speed: 0.9, loop: false, offset: 25 });
      const lk = folk(663, { top: C.mustard, style: 'long' });
      R.mover((t) => (within(8, 9.6)(t) || within(15.6, 19.2)(t) ? w(t) : HIDE), (ctx, t, p) => {
        if (p.hide) return;
        const f = p.back ? -0.9 : 0.9, sx = p.x + 0.2, sy = p.y + f, z = gz(sx, sy);
        const behind = p.back;
        const pram = () => {
          box(ctx, sx - 0.3, sy - 0.4, z + 0.3, 0.6, 0.8, 0.5, C.navy, { flat: true, lw: 0.03 });
          box(ctx, sx - 0.3, sy - 0.4, z + 0.8, 0.6, 0.35, 0.35, C.teal, { flat: true, lw: 0.03 });
          for (const dy of [-0.3, 0.3]) disc(ctx, sx + 0.3, sy + dy, z + 0.15, 0.12, C.ink, { lw: 0.02 });
        };
        if (behind) pram();
        person(ctx, p.x, p.y, gz(p.x, p.y), { ...lk, pose: 'walk', dir: p.dir, back: p.back, arms: [1.2, 1.2] }, t);
        if (!behind) pram();
      });
      const j = route(LOOPWAY, { speed: 3.2, loop: false, offset: 10 });
      const jl = folk(664, { top: C.red, bottom: C.ink, style: 'pony' });
      R.mover((t) => (within(6, 9.5)(t) || within(15.8, 19.5)(t) ? j(t) : HIDE), (ctx, t, p) => { if (!p.hide) person(ctx, p.x, p.y, gz(p.x, p.y), { ...jl, pose: 'run', dir: p.dir, back: p.back }, t); });
    }

    {
      // After dark: two on a slow lap, arm in arm, the harbor lights out past the Sugar Bowl.
      const w = route(LOOPWAY, { speed: 0.6, loop: false, offset: 40 });
      const pair = [folk(665, { top: C.coral, style: 'long' }), folk(666, { top: C.navy, style: 'short' })];
      R.mover((t) => (within(20, 25)(t) ? w(t) : HIDE), (ctx, t, p) => {
        if (p.hide) return;
        pair.forEach((lk, j) => { const x = p.x + j * 0.55, y = p.y - j * 0.1; person(ctx, x, y, gz(x, y), { ...lk, pose: 'walk', speed: 5, dir: p.dir, back: p.back, arms: j ? [0.6, 0] : [0, -0.6] }, t + j * 0.3); });
        if (Q.detail && frac(t / 30) < 0.1) speech(ctx, p.x, p.y, gz(p.x, p.y) + 3, 'Did they get the couch in?', { size: 0.38 });
      });
    }

    // ---------- The picnic shelter ----------
    twice(R, SH.x0 + 0.5, SH.y0 + 0.5, shelterBase);
    twice(R, SH.x1 + 0.35, SH.y1 + 0.35, shelterRoof);
    // Balloons on the front post all day, for the 4pm party; sad in the rain.
    R.thing(SH.x1 - 0.1, SH.y1 + 0.2, (ctx, t) => {
      const px = SH.x1 - 0.2, py = SH.y1 - 0.2, z = gz(px, py);
      const sag = rainK(t) * 0.9;
      [[C.pink, -0.35, 0], [C.mustard, 0.05, 1.3], [C.teal, 0.4, 2.2]].forEach(([c, d, ph]) => {
        // Out past the front eave on their strings: tucked under the roof
        // they were hidden when dry and read as three heads in it when wet.
        const bx = px + 0.7 + d * 1.3 + Math.sin(t * 1.3 + ph) * 0.12, by = py + 1.0 - d * 0.2, bz = z + 3.3 - sag + Math.sin(t * 1.1 + ph) * 0.08;
        line(ctx, [[px, py, z + 1.8], [bx, by, bz - 0.35]], C.ink, 0.02);
        const [X, Y] = P3(bx, by, bz);
        ctx.beginPath(); ctx.ellipse(X, Y, 0.3, 0.37, 0, 0, Math.PI * 2); paint(ctx, c, { lw: 0.03 });
      });
    }, { anim: true, on: within(7, 19.3), depth: SH.x1 + SH.y1 + 1.0 });
    R.thing(SH.x1 - 0.05, SH.y1 + 0.25, (ctx) => {
      const x = SH.x1 - 0.08, y = SH.y1 - 0.2, z = gz(x, y);
      board(ctx, x, y, z + 1.5, 0.55, 0.55, C.white, [['RESERVED', 0.08, C.red], ['4PM', 0.14, C.ink], ['PARTY!', 0.09, C.ink]]);
    }, { depth: SH.x1 + SH.y1 + 0.45 });
    // Moving Day overflow: somebody's boxes, out of the rain, till the truck's free.
    {
      const bx = 39.7, by = 36.5, bz = gz(bx, by);
      R.thing(bx + 1.2, by + 1.3, (ctx) => {
        carton(ctx, bx, by, bz, 0.9, 0.7, 0.6, 'KITCHEN');
        carton(ctx, bx, by + 0.75, bz, 0.9, 0.7, 0.6, 'MISC');
        carton(ctx, bx + 0.05, by + 0.1, bz + 0.6, 0.8, 0.6, 0.5, 'MISC 2');
        carton(ctx, bx + 0.1, by + 0.8, bz + 0.6, 0.7, 0.6, 0.45, 'BOOKS');
        carton(ctx, bx + 0.15, by + 0.4, bz + 1.1, 0.6, 0.55, 0.4, '?');
        carton(ctx, bx + 1.1, by - 0.2, bz, 0.7, 0.6, 0.6);
      }, { on: within(9.7, 15.6) });
      const guard = folk(670, { top: C.teal, bottom: C.navy, hat: 'beanie' });
      stay(R, bx + 1.45, by + 0.1, guard, { z: bz + 0.6 - 0.71, pose: 'sit', dir: 'r', hold: sandwichHeld, hours: within(9.75, 15.6), depth: bx + by + 2.51 });
      talk(R, bx + 1.45, by + 0.1, bz + 2.4, (t) => (within(9.75, 15.4)(t) ? lines(["Truck's stuck.", "They're coming back for these.", 'Probably.'], 21, 3.2, 0.3)(t) : null), { size: 0.4 });
      talk(R, bx + 1.45, by + 0.1, bz + 2.4, (t) => (within(15.4, 15.6)(t) ? 'FREE!' : null), { size: 0.5 });
    }
    // The party, at four: hats, a cake, a parent with the lighter.
    {
      const tz = gz(SH.x0 + 1.8, SH.y0 + 1.5);
      const party = within(16, 19);
      R.thing(SH.x0 + 2.0, SH.y0 + 1.6, (ctx) => {
        const cx = SH.x0 + 1.85, cy = SH.y0 + 1.5;
        cylinder(ctx, cx, cy, tz + 0.9, 0.35, 0.3, C.white, { top: C.pink });
        for (let i = 0; i < 7; i++) line(ctx, [[cx + Math.cos(i) * 0.2, cy + Math.sin(i) * 0.2, tz + 1.2], [cx + Math.cos(i) * 0.2, cy + Math.sin(i) * 0.2, tz + 1.4]], C.teal, 0.03);
        for (let i = 0; i < 3; i++) disc(ctx, cx - 0.7 + i * 0.35, cy + 0.3, tz + 0.91, 0.12, C.white, { lw: 0.02 });
      }, { on: party, depth: SH.x0 + SH.y0 + 3.2 });
      const kids = [[SH.x0 + 1.3, SH.y0 + 0.5, 'l', true], [SH.x0 + 2.3, SH.y0 + 0.5, 'r', true], [SH.x0 + 1.4, SH.y0 + 2.6, 'r', false], [SH.x0 + 2.5, SH.y0 + 2.7, 'l', false]];
      kids.forEach(([x, y, dir, back], i) => stay(R, x, y, folk(680 + i, { hat: 'party', scale: 0.7 }), { scale: 0.7, z: tz, dir, back, pose: i === 2 ? 'cheer' : i === 3 ? 'jump' : 'stand', hours: party, anim: i >= 2 }));
      // The parent stands at the open front: by the gable end their head was
      // up inside the roof.
      stay(R, SH.x0 + 2.9, SH.y1 + 0.15, folk(685, { top: C.coral, style: 'curly' }), { z: tz, dir: 'l', back: true, pose: 'point', hours: party });
      talk(R, SH.x0 + 1.8, SH.y0 + 1.5, tz + 2.6, (t) => (party(t) ? lines(['Happy birthday!', 'Who is Kaylee?', 'Why is it wet?'], 17, 3.2, 0.2)(t) : null), { size: 0.42 });
      // Before the party, a parent tying the balloons.
      stay(R, SH.x1 - 0.2, SH.y1 + 0.4, folk(685, { top: C.coral, style: 'curly' }), { dir: 'r', back: true, arms: [2.6, 2.2], hours: within(7, 8.5) });
    }

    // ---------- The playground ----------
    {
      const sz = gz(SW.x, (SW.y0 + SW.y1) / 2), top = sz + SW.top;
      const aFrame = (y) => (ctx) => {
        line(ctx, [[SW.x - 0.8, y, sz], [SW.x, y, top], [SW.x + 0.8, y, sz]], C.teal, 0.12);
        line(ctx, [[SW.x - 0.45, y, sz + 1.1], [SW.x + 0.45, y, sz + 1.1]], C.teal, 0.06);
      };
      R.thing(SW.x, SW.y0, (ctx) => { aFrame(SW.y0)(ctx); line(ctx, [[SW.x, SW.y0, top], [SW.x, SW.y1, top]], C.teal, 0.1); });
      R.thing(SW.x + 0.8, SW.y1, aFrame(SW.y1));
      // The swings, and two kids on them when it's dry.
      const kids = [folk(690, { top: C.pink, style: 'pony', scale: 0.7 }), folk(691, { top: C.green, scale: 0.7 })];
      SW.seats.forEach((ys, i) => {
        R.thing(SW.x + 0.4, ys, (ctx, t) => {
          const a = swingAngle(i, t), sx = SW.x + Math.sin(a) * SW.len, szz = top - Math.cos(a) * SW.len;
          for (const dy of [-0.2, 0.2]) line(ctx, [[SW.x, ys + dy, top], [sx, ys + dy, szz]], C.grey, 0.025);
          box(ctx, sx - 0.25, ys - 0.22, szz - 0.06, 0.5, 0.44, 0.06, C.coral, { flat: true, lw: 0.025 });
          if (KIDS(t)) person(ctx, sx, ys, szz - 0.5, { ...kids[i], pose: 'sit', dir: 'r' }, 0);
        }, { anim: true });
      });
      talk(R, SW.x + 1, SW.seats[0], sz + 2.8, (t) => (KIDS(t) ? lines(['Higher!', 'Watch me!', 'MOM. WATCH.'], 12, 2.6)(t) : null), { size: 0.4 });
      // The slide, and the kid going round it.
      const lz = gz(SL.x, SL.y);
      R.thing(SL.end, SL.y + 0.4, (ctx) => {
        for (const dy of [-0.3, 0.3]) line(ctx, [[SL.x - 0.5, SL.y + dy, lz], [SL.x, SL.y + dy, lz + SL.top]], C.teal, 0.08);
        for (let i = 1; i < 5; i++) line(ctx, [[SL.x - 0.5 + i * 0.1, SL.y - 0.3, lz + i * 0.32], [SL.x - 0.5 + i * 0.1, SL.y + 0.3, lz + i * 0.32]], C.teal, 0.05);
        for (const [dx, dy] of [[0, -0.3], [0.6, -0.3], [0, 0.3], [0.6, 0.3]]) line(ctx, [[SL.x + dx, SL.y + dy, lz], [SL.x + dx, SL.y + dy, lz + SL.top]], C.teal, 0.08);
        box(ctx, SL.x, SL.y - 0.35, lz + SL.top - 0.1, 0.6, 0.7, 0.1, C.mustard, { flat: true, lw: 0.03 });
        const ez = gz(SL.end, SL.y) + 0.25;
        face(ctx, [[SL.x + 0.6, SL.y - 0.3, lz + SL.top], [SL.end, SL.y - 0.3, ez], [SL.end, SL.y + 0.3, ez], [SL.x + 0.6, SL.y + 0.3, lz + SL.top]], C.mustard, { lw: 0.035 });
        face(ctx, [[SL.x + 0.6, SL.y + 0.3, lz + SL.top], [SL.end, SL.y + 0.3, ez], [SL.end, SL.y + 0.3, ez + 0.2], [SL.x + 0.6, SL.y + 0.3, lz + SL.top + 0.2]], shade(C.mustard, 0.2), { lw: 0.03 });
      });
      const slider = folk(692, { top: C.purple, style: 'curly', scale: 0.7 });
      R.mover((t) => {
        if (!KIDS(t)) return HIDE;
        const k = frac(t / 9) * 9;
        if (k < 2) return { x: SL.x - 0.5 + k * 0.25, y: SL.y, z: lz + (k / 2) * SL.top, pose: 'walk', dir: 'r', back: true };
        if (k < 3) return { x: SL.x + 0.4, y: SL.y, z: lz + SL.top - 0.5, pose: 'sit', dir: 'r' };
        if (k < 4) { const u = k - 3; return { x: SL.x + 0.4 + (SL.end - SL.x - 0.4) * u, y: SL.y, z: lz + SL.top - 0.5 + (gz(SL.end, SL.y) + 0.25 - lz - SL.top) * u, pose: 'sit', dir: 'r', whee: true }; }
        if (k < 5) return { x: SL.end + 0.3, y: SL.y + 0.3, z: gz(SL.end, SL.y), pose: 'cheer', dir: 'r' };
        const u = (k - 5) / 4;
        return { x: SL.end + 0.3 - (SL.end + 0.9 - SL.x) * u, y: SL.y + 0.9 - (u > 0.85 ? (u - 0.85) / 0.15 * 0.9 : 0), z: lz, pose: 'run', dir: 'l', back: true };
      }, (ctx, t, p) => {
        if (p.hide) return;
        person(ctx, p.x, p.y, p.z, { ...slider, pose: p.pose, dir: p.dir, back: p.back }, t);
        if (p.whee && Q.detail) speech(ctx, p.x, p.y, p.z + 2, 'WHEE!', { size: 0.42 });
      }, { bias: 1.3 });
      // The seesaw: a kid on one end, a parent pushing the other.
      const wz = gz(SAW.x, SAW.y);
      const sawKid = folk(693, { top: C.coral, hat: 'cap', scale: 0.7 }), sawDad = folk(694, { top: C.grey, bottom: C.navy });
      R.thing(SAW.x + 1.4, SAW.y + 0.3, (ctx, t) => {
        const on = KIDS(t), b = on ? 0.28 * Math.sin(t * 1.8) : -0.3;
        const L = 1.35, c = Math.cos(b), s = Math.sin(b);
        box(ctx, SAW.x - 0.15, SAW.y - 0.2, wz, 0.3, 0.4, 0.5, C.teal, { flat: true, lw: 0.03 });
        if (on) person(ctx, SAW.x - L * c - 0.3, SAW.y, wz, { ...sawDad, pose: 'stand', dir: 'r', arms: [1.2 - s * 2, 1.0 - s * 2] }, t);
        face(ctx, [[SAW.x - L * c, SAW.y - 0.15, wz + 0.55 - L * s], [SAW.x + L * c, SAW.y - 0.15, wz + 0.55 + L * s], [SAW.x + L * c, SAW.y + 0.15, wz + 0.55 + L * s], [SAW.x - L * c, SAW.y + 0.15, wz + 0.55 - L * s]], C.coral, { lw: 0.035 });
        if (on) person(ctx, SAW.x + (L - 0.2) * c, SAW.y, wz + 0.6 + (L - 0.2) * s - 0.5, { ...sawKid, pose: 'sit', dir: 'l' }, t);
      }, { anim: true });
      // The sandbox, a bucket, a toddler.
      const [bx, by, bw, bd] = SANDBOX, bz = gz(bx + 0.7, by + 0.6);
      R.thing(bx + bw, by + bd, (ctx) => {
        box(ctx, bx, by, bz, bw, bd, 0.2, C.wood, { flat: true, lw: 0.03, top: SAND });
        cylinder(ctx, bx + 1.0, by + 0.35, bz + 0.2, 0.14, 0.24, C.coral);
        line(ctx, [[bx + 0.3, by + 1.0, bz + 0.22], [bx + 0.75, by + 0.85, bz + 0.3]], C.teal, 0.05);
      });
      stay(R, bx + 0.6, by + 0.7, folk(695, { top: C.butter, style: 'short', scale: 0.55 }), { scale: 0.55, z: bz + 0.2 - 0.4, pose: 'sit', dir: 'l', hours: KIDS });
      // The sign.
      {
        const x = PG[0] + 4.6, y = PG[1] + 0.2, z = gz(x, y);
        R.thing(x, y, (ctx) => {
          pole(ctx, x, y, z, 1.4, C.greyLight, 0.05);
          board(ctx, x + 0.06, y, z + 1.75, 1.3, 0.85, C.green, [['PLAYGROUND', 0.13, C.white], ['ADULTS MUST BE', 0.085, C.white, 'Rethink Sans'], ['ACCOMPANIED', 0.085, C.white, 'Rethink Sans'], ['BY A CHILD', 0.085, C.white, 'Rethink Sans']]);
        });
      }
      // The rain-boot kid, straight into the biggest puddle when it stops.
      const [px, py] = [PG[0] + 2.1, PG[1] + 5.4];
      R.thing(px, py + 0.01, (ctx, t) => {
        const pz = gz(px, py);
        person(ctx, px, py, pz, { ...folk(696, { top: C.mustard, style: 'bun', scale: 0.7 }), pose: 'jump', dir: 'l', shoes: C.red }, t);
        if (!Q.detail) return;
        const k = frac(t * 7 / (Math.PI * 2) * 2);
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; disc(ctx, px + Math.cos(a) * (0.3 + k * 0.5), py + Math.sin(a) * (0.3 + k * 0.5), pz + 0.1 + Math.sin(k * Math.PI) * 0.5, 0.05, alpha(tint(C.sky, 0.2), 1 - k), { stroke: false }); }
      }, { anim: true, on: within(15.4, 16.9) });
      talk(R, px, py, gz(px, py) + 2.2, (t) => (within(15.4, 16.9)(t) && every(7, 2.4)(t) ? 'SPLASH!' : null), { size: 0.46 });
      // A bench by the chips, a parent on it, on the phone.
      const nx = PG[0] + 5.2, ny = PG[1] + 3.2, nz = gz(nx, ny);
      R.thing(nx + 0.6, ny + 1.7, (ctx) => bench(ctx, nx, ny, nz));
      stay(R, nx + 0.3, ny + 0.9, folk(697, { top: C.white, style: 'long' }), { z: nz + 0.53 - 0.71, pose: 'sit', dir: 'r', depth: nx + ny + 2.31, hold: (c) => { c.beginPath(); c.rect(-0.02, -0.34, 0.18, 0.28); paint(c, C.black, { lw: 0.02 }); }, hours: KIDS });
    }

    // ---------- Day Boulevard: a car with a mattress on the roof, now and then ----------
    {
      const path = DAY_BLVD.slice(2, 8);
      const segs = [];
      let total = 0;
      for (let i = 1; i < path.length; i++) { const [ax, ay] = path[i - 1], [bx, by] = path[i]; const l = Math.hypot(bx - ax, by - ay); segs.push({ ax, ay, dx: (bx - ax) / l, dy: (by - ay) / l, l, s: total }); total += l; }
      const TRIP = 24, EVERY = 47;
      R.mover((t) => {
        if (!within(6.5, 20.5)(t)) return HIDE;
        const u = frac(t / EVERY) * EVERY;
        if (u > TRIP) return HIDE;
        const s = (u / TRIP) * total;
        const g = segs.find((q) => s <= q.s + q.l) || segs[segs.length - 1];
        const x = g.ax + g.dx * (s - g.s) - g.dy * 0.85, y = g.ay + g.dy * (s - g.s) + g.dx * 0.85;
        const alongX = Math.abs(g.dx) > Math.abs(g.dy);
        return { x: x + (alongX ? 1.4 : 0.75), y: y + (alongX ? 0.75 : 1.4), cx: x, cy: y, alongX, dir: alongX ? Math.sign(g.dx) : Math.sign(g.dy), n: Math.floor(t / EVERY), fade: clamp01(u / 2) * clamp01((TRIP - u) / 2) };
      }, (ctx, t, p) => {
        if (p.hide) return;
        ctx.save(); ctx.globalAlpha *= p.fade;
        const z = 0.4, col = [C.teal, C.coral, C.white, C.purple][p.n % 4];
        car(ctx, p.cx, p.cy, z, col, { along: p.alongX ? 'x' : undefined, dir: p.dir });
        if (p.n % 2 === 0) {
          const [w, d] = p.alongX ? [2.2, 1.5] : [1.5, 2.2];
          box(ctx, p.cx - w / 2, p.cy - d / 2, z + 1.34, w, d, 0.32, C.white, { flat: true, lw: 0.035, left: tint(C.sky, 0.45), right: tint(C.sky, 0.6) });
          if (Q.detail) for (const k of [-0.4, 0.4]) line(ctx, p.alongX ? [[p.cx + k, p.cy - 0.8, z + 1.1], [p.cx + k, p.cy - 0.75, z + 1.68], [p.cx + k, p.cy + 0.75, z + 1.68], [p.cx + k, p.cy + 0.8, z + 1.1]] : [[p.cx - 0.8, p.cy + k, z + 1.1], [p.cx - 0.75, p.cy + k, z + 1.68], [p.cx + 0.75, p.cy + k, z + 1.68], [p.cx + 0.8, p.cy + k, z + 1.1]], C.red, 0.04);
        }
        ctx.restore();
      });
    }

    // ---------- The Head Island causeway: benches, the old couple ----------
    {
      const bx = 50.4, by = 54.3, bz = gz(bx + 0.8, by);
      R.thing(bx + 1.7, by + 0.6, (ctx) => {
        for (const dx of [0.15, 1.45]) box(ctx, bx + dx, by + 0.1, bz, 0.1, 0.5, 0.45, C.ink, { flat: true, lw: 0.02 });
        box(ctx, bx, by, bz + 0.45, 1.7, 0.6, 0.08, C.wood, { flat: true, lw: 0.03 });
        box(ctx, bx, by - 0.05, bz + 0.53, 1.7, 0.08, 0.5, C.wood, { flat: true, lw: 0.03 });
      });
      const couple = [folk(700, { top: C.lilac, hair: C.greyLight, style: 'bun', dress: true }), folk(701, { top: C.brown, hair: C.greyLight, style: 'bald', hat: 'cap' })];
      // (Sorted after the bench they sit on, or its back covers them.)
      couple.forEach((lk, j) => stay(R, bx + 0.5 + j * 0.7, by + 0.3, lk, { z: bz + 0.53 - 0.71, pose: 'sit', dir: j ? 'l' : 'r', hours: within(8, 19.2), umb: j ? null : C.navy, depth: bx + by + 2.31 + j * 0.01 }));
      talk(R, bx + 0.9, by + 0.3, bz + 2.6, (t) => (within(8, 19.2)(t) ? lines(['Forty years we lived on P Street.', 'We moved once. Never again.', 'Here comes another plane.'], 26, 3.4, 0.7)(t) : null), { size: 0.38 });
      R.thing(55.8, 54.9, (ctx) => bench(ctx, 55.2, 54.0, gz(55.5, 54.8)));
    }

    // ---------- The harbor: a sailboat going nowhere in particular ----------
    R.mover((t) => {
      const k = frac(t / 170), u = k < 0.5 ? k * 2 : 2 - k * 2;
      return { x: 36 + 18 * smooth(u), y: 64.5, dir: k < 0.5 ? 1 : -1 };
    }, (ctx, t, p) => {
      const bob = Math.sin(t * 1.4) * 0.06, x = p.x, y = p.y;
      box(ctx, x - 1.1, y - 0.4, bob - 0.1, 2.2, 0.8, 0.4, C.white, { flat: true, lw: 0.035, top: C.woodLight });
      line(ctx, [[x, y, bob + 0.3], [x, y, bob + 3.6]], C.ink, 0.05);
      face(ctx, [[x + 0.05, y, bob + 3.5], [x + 0.05 + 1.2 * p.dir, y, bob + 0.55], [x + 0.05, y, bob + 0.55]], C.white, { lw: 0.03 });
      face(ctx, [[x - 0.05, y, bob + 3.2], [x - 0.05 - 0.9 * p.dir, y, bob + 0.6], [x - 0.05, y, bob + 0.6]], tint(C.coral, 0.3), { lw: 0.03 });
    });
  },
};
