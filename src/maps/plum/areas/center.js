// The Center: where the turnpike lands (docs/levels/plum.md). Plum Island
// Boulevard, the residents-only lot (a parking officer on a slow loop,
// writing), the $20 lot across the beach path (a hand-painted sign whose
// price moves with the day, and a man waving a flag at cars), the bait
// shop with today's tides chalked on its board, the ice cream window and its
// line (and two bins, one with the goose in it), warnings nobody reads, the beach path
// over the dunes, the little jetty, and the Center's beach, where there's no
// lifeguard. The greenhead man's swarm finds him in the lot at ten (swarm.js)
// and he runs down the path and back up it at noon: everyone he passes
// leaps aside, swatting. At sunset everyone turns to face the marsh; after
// dark the shops, the lamps and the houses light up, and a couple come down
// the path to photograph the king tide.
//
// World units, like land.js. Speed: whatever only changes with the hour is a
// still picture shown in its hours (on); only what really moves is anim.
import { sunbatherPoke } from '../day.js';
import { C, Q, P, box, disc, face, poly, paint, paintText, person, folk, speech, label, glow, tint, shade, mix, alpha } from '../../../engine/art.js';
import { drawLand } from '../../../engine/terrain.js';
import { ZK } from '../../../engine/iso.js';
import { route, schedule, particles, clamp } from '../../../engine/actors.js';
import { land, h, PIKE, LOTS } from '../land.js';
import { LOOP, hour, level, nightK, sunsetWatch, lowTide } from '../tide.js';
import { EVENING, INK, HOUSE, CARS, LIT, BRAND, lightsOn } from '../style.js';
import { who, house, car, umbrella, board, nightGlow, gull, printed } from '../kit.js';
import { aside } from '../swarm.js';

const PATH = PIKE; // the beach path, over the dunes from between the lots
// Shown from hour a to hour b (b < a runs past midnight).
const during = (a, b) => (t) => {
  const hr = hour(t);
  return a <= b ? hr >= a && hr < b : hr >= a || hr < b;
};
const busy = during(9, 18.8);
const watching = sunsetWatch;
const notWatching = (f) => (t) => f(t) && !sunsetWatch(t);
const both = (f, g) => (t) => f(t) && g(t);
const dryAt = (x, y, m = 0.08) => (t) => level(t) < h(x, y) - m;
// The night, in eight steps (so the mixes stay few).
const nq = (t) => Math.round(nightK(t) * 8) / 8;
// The ground under a spot, just over it (for paint on the road).
const gz = (x, y) => h(x, y) + 0.01;
const z0 = (p) => h(p[0], p[1]);

// Cars that stay put: the one with the ticket (a surfer, out all day and
// all night), the greenhead man's (he gets out of it at ten), a resident's,
// and, in the $20 lot, the wagon that has been there since 1998.
const TICKET_CAR = [55.9, 35.2];
const GH_CAR = [58.6, 35.2];
const OLD_CAR = [67.6, 35.2];
// The jetty's rocks, out from the beach.
const JETTY = Array.from({ length: 7 }, (_, i) => ({ x: 56.6 + i * 0.22, y: 43.4 + i * 1.2, top: 1.35 - i * 0.14, w: 1.2 - (i % 2) * 0.12 }));
// The beach's umbrellas.
const SPOTS = [[51, 45], [54, 44.6], [59.8, 45.4], [65, 44.8], [67.6, 45.8]];

// A flat shape through world points, filled and outlined.
function shape(ctx, pts, fill, o) {
  poly(ctx, pts);
  paint(ctx, fill, o);
}
// A line through world points.
function line(ctx, pts, color, lw = 0.05) {
  ctx.beginPath();
  pts.forEach((p, i) => { const [X, Y] = P(...p); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.stroke();
}
// A board with several lines of lettering: lines are [text, size, color?].
function plate(ctx, along, x, y, z, w, hh, lines, o = {}) {
  board(ctx, along, x, y, z, w, hh, null, o);
  if (!Q.detail) return;
  ctx.save();
  const [dx, dy] = along === 'x' ? P(0, y + 0.01, 0) : P(x + 0.01, 0, 0);
  ctx.translate(dx, dy);
  const gap = o.gap || 1.25;
  const total = lines.reduce((s, l) => s + l[1] * gap, 0);
  let v = z + total / 2;
  for (const [text, size, ink] of lines) {
    v -= (size * gap) / 2;
    paintText(ctx, along === 'x' ? 'right' : 'left', along === 'x' ? x : y, v, text, size, ink || o.ink || C.ink, o.font || 'Rethink Sans');
    v -= (size * gap) / 2;
  }
  ctx.restore();
}
// A sign on one or two posts with several lines on it.
function notice(R, x, y, lines, o = {}) {
  const along = o.along || 'x', w = o.w || 1.6, bh = o.h || 0.8, post = o.post || 1.3, z = o.z ?? h(x, y);
  R.thing(x + 0.1, y + 0.1, (ctx) => {
    const n = o.posts || (w > 1.8 ? 2 : 1);
    for (let k = 0; k < n; k++) {
      const off = n === 1 ? 0 : (k ? 1 : -1) * (w / 2 - 0.2);
      const [px, py] = along === 'x' ? [x + off, y] : [x, y + off];
      box(ctx, px - 0.05, py - 0.05, z, 0.1, 0.1, post + bh / 2, o.postColor || C.wood, { flat: true, lw: 0.03 });
    }
    plate(ctx, along, x + (along === 'y' ? 0.06 : 0), y + (along === 'x' ? 0.06 : 0), z + post, w, bh, lines, o);
    if (o.more) o.more(ctx, z);
  }, o.on ? { on: o.on } : {});
}
// Dune grass: a tuft of blades.
function tuft(ctx, x, y, z, s = 1) {
  const [X, Y] = P(x, y, z);
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -0.6 + i * 0.3;
    ctx.moveTo(X + (i - 2) * 0.05 * s, Y);
    ctx.quadraticCurveTo(X + a * 0.2 * s, Y - 0.3 * s, X + a * 0.45 * s, Y - (0.55 - Math.abs(a) * 0.2) * s);
  }
  ctx.strokeStyle = shade(INK.marsh, 0.25);
  ctx.lineWidth = 0.05;
  ctx.lineCap = 'round';
  ctx.stroke();
}
// Where the sea meets the sand at x, right now.
function shoreY(x, L) {
  let a = 43.5, b = 57;
  for (let i = 0; i < 12; i++) { const m = (a + b) / 2; if (h(x, m) > L) a = m; else b = m; }
  return (a + b) / 2;
}
// Someone who stays put: steps aside as the greenhead man runs past (and
// swats), and turns to face the marsh at sunset. o: { when, pose, dir,
// back, swarm (how near he comes before they move), scale, z, hold, more }
function local(R, x, y, look, o = {}) {
  const when = o.when || (() => true);
  R.mover((t) => {
    if (!when(t)) return { x, y, off: true };
    const a = o.swarm ? aside(x, y, t, o.swarm) : { dx: 0, dy: 0, k: 0 };
    return { x: x + a.dx, y: y + a.dy, k: a.k };
  }, (ctx, t, p) => {
    if (p.off) return;
    let pose = typeof o.pose === 'function' ? o.pose(t) : o.pose || 'stand';
    let dir = typeof o.dir === 'function' ? o.dir(t) : o.dir || 'r', back = !!o.back;
    if (o.watch !== false && sunsetWatch(t)) { pose = 'stand'; dir = 'r'; back = true; }
    let z = h(p.x, p.y) + (o.z || 0);
    if (p.k > 0.5) { pose = 'wave'; z += Math.abs(Math.sin(t * 8)) * 0.3 * p.k; }
    who(ctx, p.x, p.y, z, { ...look, hold: pose === 'wave' ? null : look.hold }, null, { pose, dir, back, scale: o.scale }, t);
    if (o.more) o.more(ctx, t, p, z, pose);
  }, { bias: o.bias || 0 });
}
// Someone still (a still picture in their hours), and the same person turned
// round to the marsh at sunset.
function still(R, x, y, look, o = {}) {
  const z = (o.z || 0) + h(x, y);
  const draw = (ctx, turned) => {
    person(ctx, x, y, z, { ...look, pose: turned ? 'stand' : o.pose || 'stand', dir: turned ? 'r' : o.dir || 'r', back: turned ? true : !!o.back, scale: o.scale || 1 }, 0);
  };
  const depth = x + y + (o.bias || 0);
  R.thing(x, y, (ctx) => { draw(ctx, false); if (o.more) o.more(ctx, z); }, { on: notWatching(o.when || (() => true)), depth });
  // (Turned round only for the sunset: live then, not another cached picture.)
  if (o.watch !== false) R.thing(x, y, (ctx) => draw(ctx, true), { anim: true, on: both(watching, o.watchWhen || o.when || (() => true)), depth });
}
// Things people carry.
const cone = (flavor) => (ctx) => {
  ctx.beginPath(); ctx.moveTo(0.02, 0.12); ctx.lineTo(-0.09, -0.16); ctx.lineTo(0.13, -0.16); ctx.closePath();
  paint(ctx, C.woodLight, { lw: 0.03 });
  ctx.beginPath(); ctx.arc(0.02, -0.24, 0.12, 0, Math.PI * 2);
  paint(ctx, flavor, { lw: 0.03 });
};
const phone = (ctx) => { ctx.fillStyle = C.ink; ctx.fillRect(-0.02, -0.2, 0.12, 0.2); };
const boogie = (color) => (ctx) => {
  ctx.beginPath(); ctx.roundRect(-0.15, -0.55, 0.3, 0.95, 0.12);
  paint(ctx, color, { lw: 0.03 });
};
const pad = (ctx) => { ctx.fillStyle = C.white; ctx.fillRect(-0.05, -0.18, 0.2, 0.26); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.strokeRect(-0.05, -0.18, 0.2, 0.26); };

export default {
  id: 'center',
  name: 'The Center',
  blurb: 'Where the turnpike lands. Two lots, one ice cream window, a tide board chalked up fresh this morning, and not one person reading it.',
  home: [60, 36],
  build(R) {
    drawLand(R, land, { fade: nightK, inks: EVENING, surf: true });

    // ---------- Paint on the road ----------
    // Printed live over the ground (the evening's inks fade in over it) and
    // dimmed with the night, so each piece only reaches the chunks it's in.
    const paintInk = (t) => mix(C.white, C.night, 0.5 * nq(t));
    R.floor((ctx, t) => {
      const ink = paintInk(t);
      for (let x = 48.4; x < 69.8; x += 1.6) {
        if (x > 60 && x < 64) continue;
        shape(ctx, [[x, 30.93, gz(x, 31)], [x + 0.8, 30.93, gz(x + 0.8, 31)], [x + 0.8, 31.07, gz(x + 0.8, 31)], [x, 31.07, gz(x, 31)]], ink, { stroke: false });
      }
      // The crossing from the ice cream window to the $20 lot.
      for (let x = 64.3; x < 66.4; x += 0.55) shape(ctx, [[x, 30.05, gz(x, 30)], [x + 0.3, 30.05, gz(x, 30)], [x + 0.3, 31.95, gz(x, 32)], [x, 31.95, gz(x, 32)]], ink, { stroke: false });
    }, { anim: true }).area = [48, 29.5, 70, 32.5];
    R.floor((ctx, t) => {
      const ink = paintInk(t);
      for (const x of [55.25, 56.55, 57.9, 59.25, 60.55, 63.85, 65.4, 66.9, 68.25]) line(ctx, [[x, 33.9, gz(x, 33.9)], [x, 35.3, gz(x, 35.3)], [x, 36.1, gz(x, 36.1)], [x, 36.7, gz(x, 36.7)]], ink, 0.08);
      if (Q.detail) {
        for (const [x, text] of [[58.1, 'RESIDENTS'], [65.9, 'CASH ONLY']]) {
          ctx.save();
          ctx.translate(0, -gz(x, 36.9) * ZK);
          paintText(ctx, 'floor', x, 36.9, text, 0.42, ink, 'Rethink Sans');
          ctx.restore();
        }
      }
    }, { anim: true }).area = [55, 33.5, 69, 37.5];

    // ---------- Street furniture ----------
    // The street signs at the corner, and under Sunset Drive's, the refuge.
    const blade = (x, y, text, sub) => R.thing(x + 0.1, y + 0.1, (ctx) => {
      const z = h(x, y);
      box(ctx, x - 0.05, y - 0.05, z, 0.1, 0.1, 2.9, shade(INK.shingle, 0.2), { flat: true, lw: 0.03 });
      board(ctx, 'x', x, y + 0.06, z + 2.75, text.length * 0.2 + 0.3, 0.34, text, { board: C.green, ink: C.white, size: 0.22, edge: 0.04, font: 'Rethink Sans' });
      if (sub) plate(ctx, 'x', x, y + 0.06, z + 2.1, 1.3, 0.6, sub, { board: C.white, edge: 0.04 });
    });
    blade(57.2, 29.4, 'PLUM ISLAND BLVD', null);
    blade(50.6, 29.4, 'SUNSET DR', [['REFUGE 0.5 MI', 0.18], ['(FULL)', 0.2, C.red]]);
    // Streetlamps along the boulevard: on at dusk, a glow each.
    for (const [x, y] of [[57.8, 32.7], [63.2, 32.7]]) {
      const z = h(x, y);
      R.thing(x + 0.1, y + 0.1, (ctx) => {
        box(ctx, x - 0.07, y - 0.07, z, 0.14, 0.14, 4.1, shade(INK.shingle, 0.3), { flat: true, lw: 0.03 });
        box(ctx, x - 0.04, y - 1.0, z + 4.0, 0.08, 1.0, 0.08, shade(INK.shingle, 0.3), { flat: true, lw: 0.02 });
        box(ctx, x - 0.18, y - 1.25, z + 3.84, 0.36, 0.5, 0.18, shade(INK.shingle, 0.1), { flat: true, lw: 0.03 });
      });
      R.thing(x + 0.11, y + 0.11, (ctx) => {
        shape(ctx, [[x - 0.14, y - 1.21, z + 3.83], [x + 0.14, y - 1.21, z + 3.83], [x + 0.14, y - 0.79, z + 3.83], [x - 0.14, y - 0.79, z + 3.83]], LIT, { lw: 0.02 });
      }, { on: lightsOn });
      nightGlow(R, x, y - 1, z + 3.4, 3.2, LIT, 0.8);
    }

    // ---------- Houses ----------
    // Behind the boulevard, and between the lots and the dunes.
    [[49.2, 27.7], [53.4, 27.6]].forEach(([x, y], i) => house(R, x, y, 2.4, 1.8, i + 2, { h: 1.8, ridge: 'x' }));
    [[48.6, 36.2], [51.6, 36.6], [65.4, 38.8]].forEach(([x, y], i) => house(R, x, y, 2.4, 2.2, i + 4, { ridge: i % 2 ? 'x' : 'y' }));
    // The dune house's flag, and its neighbour's washing, in the sea breeze.
    R.thing(65.2, 38.6, (ctx, t) => {
      const x = 65.15, y = 38.55, z = h(x, y);
      box(ctx, x - 0.04, y - 0.04, z, 0.08, 0.08, 4, C.white, { flat: true, lw: 0.025 });
      if (!Q.detail) return;
      const pts = [];
      for (let i = 0; i <= 6; i++) pts.push([x, y - i * 0.18, z + 3.9 + Math.sin(t * 5 - i * 0.9) * 0.06 * i / 6]);
      const low = pts.map(([a, b, c]) => [a, b, c - 0.55]).reverse();
      shape(ctx, [...pts, ...low], C.coral, { lw: 0.03 });
      shape(ctx, [...pts.map(([a, b, c]) => [a, b, c - 0.18]), ...pts.map(([a, b, c]) => [a, b, c - 0.3]).reverse()], C.white, { stroke: false });
    }, { anim: true });
    R.thing(51.2, 39.8, (ctx, t) => {
      const z = h(49, 39.6);
      box(ctx, 48.9, 39.5, z, 0.08, 0.08, 1.8, C.wood, { flat: true, lw: 0.025 });
      box(ctx, 51.1, 39.7, h(51.1, 39.7), 0.08, 0.08, 1.8, C.wood, { flat: true, lw: 0.025 });
      line(ctx, [[48.95, 39.55, z + 1.75], [51.15, 39.75, h(51.1, 39.7) + 1.75]], C.ink, 0.025);
      if (!Q.detail) return;
      [[49.3, C.teal], [49.9, C.mustard], [50.5, C.coral]].forEach(([x, col], i) => {
        const y = 39.55 + (x - 48.95) * 0.09, zz = z + 1.72, sw = Math.sin(t * 3 + i) * 0.12;
        shape(ctx, [[x, y, zz], [x + 0.45, y + 0.04, zz], [x + 0.45 + sw, y + 0.04 + sw, zz - 0.7], [x + sw, y + sw, zz - 0.7]], col, { lw: 0.03 });
        shape(ctx, [[x, y, zz - 0.15], [x + 0.45, y + 0.04, zz - 0.15], [x + 0.45 + sw * 0.3, y + 0.04 + sw * 0.3, zz - 0.25], [x + sw * 0.3, y + sw * 0.3, zz - 0.25]], C.white, { stroke: false });
      });
    }, { anim: true });
    // ---------- The bait shop ----------
    // Clapboard, a teal roof, a lit window after dark (house() does its own),
    // a sign on the ridge and today's tides on the board by the door.
    house(R, 51.6, 32.8, 3, 2.2, C.white, { roof: C.teal, h: 2.1, door: C.coral, ridge: 'x' });
    R.thing(54.62, 35.02, (ctx) => {
      const z = h(53, 34);
      // Painted on its side, and a sign up on the ridge.
      ctx.save();
      ctx.translate(...P(0, 35.01, 0));
      if (Q.detail) paintText(ctx, 'right', 53.1, z + 1.72, 'LIVE BAIT', 0.34, C.teal);
      ctx.restore();
      plate(ctx, 'x', 53.1, 33.9, z + 3.55, 2.6, 0.62, [['BAIT · ICE · ADVICE', 0.26, C.white], ['THE ADVICE IS FREE', 0.13, C.butter]], { board: C.navy, edge: 0.04 });
      for (const dx of [-1, 1]) box(ctx, 53.1 + dx - 0.04, 33.86, z + 3.05, 0.08, 0.08, 0.3, C.ink, { flat: true, stroke: false });
      // Rods leaning on the wall, and the worm fridge.
      if (Q.detail) for (const [dx, col] of [[0, C.coral], [0.18, C.mustard], [0.34, C.teal]]) line(ctx, [[54.65, 33.0 + dx, z], [54.65, 32.6 + dx, z + 2.4]], col, 0.04);
      box(ctx, 51.8, 35.1, z, 0.8, 0.55, 1.1, C.white, { flat: true, lw: 0.04 });
      if (Q.detail) plate(ctx, 'x', 52.2, 35.66, z + 0.7, 0.72, 0.3, [['CRAWLERS', 0.14]], { board: C.white, edge: 0.02 });
    });
    // The tide board by the door, chalked up this morning, with its lamp.
    // (On the corner by the sidewalk, facing everyone who walks past it.)
    const TB = [55.75, 32.55];
    R.thing(TB[0] + 0.8, TB[1] + 0.35, (ctx) => {
      const z = h(...TB);
      // An A-frame: the legs, then the board facing the street.
      for (const dx of [-0.72, 0.72]) line(ctx, [[TB[0] + dx, TB[1] + 0.3, z], [TB[0] + dx, TB[1], z + 1.9]], C.wood, 0.07);
      plate(ctx, 'x', TB[0], TB[1] + 0.12, z + 1.12, 1.5, 1.45, [
        ["TODAY'S TIDES", 0.14, C.butter],
        ['LOW 12PM', 0.2, C.white],
        ['KING TIDE', 0.2, C.white],
        ['12:15AM', 0.24, C.coral],
        ['(YES TONIGHT)', 0.12, C.butter],
      ], { board: mix(C.green, C.ink, 0.55), edge: 0.06, gap: 1.2 });
      // Its lamp, on a crook over the top.
      box(ctx, TB[0] - 0.03, TB[1] - 0.03, z + 1.84, 0.06, 0.06, 0.35, C.ink, { flat: true, stroke: false });
      box(ctx, TB[0] - 0.03, TB[1] - 0.03, z + 2.16, 0.06, 0.4, 0.05, C.ink, { flat: true, stroke: false });
      shape(ctx, [[TB[0] - 0.15, TB[1] + 0.3, z + 2.18], [TB[0] + 0.15, TB[1] + 0.3, z + 2.18], [TB[0] + 0.1, TB[1] + 0.5, z + 2.0], [TB[0] - 0.1, TB[1] + 0.5, z + 2.0]], C.teal, { lw: 0.03 });
    });
    // On the end of the bait shop's ridge, a weathervane: a white wooden goose
    // over the arrow, swinging round with the sea breeze. (A decoy.)
    const WV = [54.45, 33.9], wvz = h(53, 34) + 3.09;
    R.thing(WV[0], WV[1], (ctx, t) => {
      const [bx, by] = P(WV[0], WV[1], wvz), top = by - 1.15 * ZK;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, top + 0.1);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
      // The compass arms, then the goose and its arrow turning over them.
      if (Q.detail) {
        ctx.beginPath(); ctx.moveTo(bx - 0.3, by - 0.55 + 0.08); ctx.lineTo(bx + 0.3, by - 0.55 - 0.08); ctx.moveTo(bx - 0.3, by - 0.55 - 0.08); ctx.lineTo(bx + 0.3, by - 0.55 + 0.08);
        ctx.lineWidth = 0.03; ctx.stroke();
      }
      const a = Math.sin(t * 0.25) * 1.3 + Math.sin(t * 1.7) * 0.12, sx = Math.cos(a);
      ctx.save(); ctx.translate(bx, top); ctx.scale(sx < 0 ? Math.min(-0.25, sx) : Math.max(0.25, sx), 1);
      ctx.beginPath(); ctx.moveTo(-0.6, 0.12); ctx.lineTo(0.6, 0.12); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0.6, 0.12); ctx.lineTo(0.45, 0.04); ctx.lineTo(0.45, 0.2); ctx.closePath(); paint(ctx, C.ink, { stroke: false });
      ctx.beginPath(); ctx.moveTo(-0.6, 0.12); ctx.lineTo(-0.75, 0.0); ctx.lineTo(-0.66, 0.12); ctx.lineTo(-0.75, 0.24); ctx.closePath(); paint(ctx, C.ink, { stroke: false });
      ctx.restore();
      ctx.save(); ctx.translate(bx, top + 0.1); ctx.scale(sx < 0 ? -0.75 : 0.75, 0.75);
      ctx.beginPath(); ctx.ellipse(0, -0.25, 0.42, 0.22, -0.1, 0, Math.PI * 2); ctx.moveTo(-0.3, -0.3); ctx.lineTo(-0.55, -0.45); ctx.lineTo(-0.38, -0.18);
      paint(ctx, C.white, { lw: 0.04 });
      ctx.beginPath(); ctx.ellipse(-0.05, -0.27, 0.22, 0.1, -0.2, 0, Math.PI * 2); paint(ctx, C.greyLight, { lw: 0.03 });
      ctx.beginPath(); ctx.moveTo(0.22, -0.35); ctx.quadraticCurveTo(0.35, -0.55, 0.28, -0.85);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.2; ctx.lineCap = 'round'; ctx.stroke(); ctx.strokeStyle = C.white; ctx.lineWidth = 0.13; ctx.stroke();
      ctx.beginPath(); ctx.arc(0.28, -0.87, 0.12, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.035 });
      ctx.beginPath(); ctx.moveTo(0.36, -0.92); ctx.lineTo(0.58, -0.86); ctx.lineTo(0.36, -0.81); ctx.closePath(); paint(ctx, C.coral, { lw: 0.025 });
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0.31, -0.9, 0.03, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }, { anim: true, depth: 54.62 + 35.02 + 0.1 });
    R.decoy({ id: 'weathervane', at: [WV[0], WV[1], wvz + 1.4], r: 0.8, say: ['A weathervane. Wind from the goose.', 'Still a weathervane.', 'It says east. It always says east.'] });
    R.thing(TB[0] + 0.81, TB[1] + 0.36, (ctx) => {
      const z = h(...TB);
      disc(ctx, TB[0], TB[1] + 0.43, z + 2.0, 0.1, LIT, { lw: 0.02 });
    }, { on: lightsOn });
    nightGlow(R, TB[0], TB[1] + 0.5, z0(TB) + 1.4, 1.6, LIT, 0.7);
    // The Gander Cola cooler out front, and the bench, where the owner mends
    // a net all day and a couple sit under the lamp after dark.
    R.thing(55.0, 36.1, (ctx) => {
      const z = h(54.4, 35.6);
      box(ctx, 54.0, 35.3, z, 0.9, 0.6, 0.7, BRAND.can, { flat: true, lw: 0.04, top: tint(BRAND.can, 0.2) });
      if (Q.detail) {
        plate(ctx, 'x', 54.45, 35.91, z + 0.42, 0.8, 0.34, [[BRAND.name, 0.12, BRAND.ink], [BRAND.line, 0.07, BRAND.ink]], { board: BRAND.can, edge: 0.001, gap: 1.3 });
      }
      box(ctx, 52.2, 35.4, z + 0.4, 1.3, 0.45, 0.1, C.wood, { flat: true, lw: 0.03 });
      for (const dx of [0.08, 1.12]) box(ctx, 52.2 + dx, 35.75, z, 0.1, 0.1, 0.4, shade(C.wood, 0.3), { flat: true, lw: 0.02 });
    });
    const owner = folk(301, { top: C.navy, bottom: C.brown, hat: 'cap', style: 'bald' });
    R.mover(() => ({ x: 52.6, y: 35.62 }), (ctx, t) => {
      if (!during(5.5, 20.9)(t)) return;
      const z = h(52.6, 35.6) + 0.1;
      if (sunsetWatch(t)) { person(ctx, 52.6, 36.2, z - 0.1, { ...owner, pose: 'stand', dir: 'r', back: true }, t); return; }
      person(ctx, 52.6, 35.62, z, { ...owner, pose: 'sit', dir: 'r', arms: [1.0 + Math.sin(t * 3) * 0.3, 0.9] }, t);
      if (!Q.detail) return;
      // The net, over his knees and down to the ground.
      ctx.strokeStyle = alpha(C.ink, 0.6);
      ctx.lineWidth = 0.025;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const [a, b] = P(52.9 + i * 0.12, 35.9, z + 0.75), [c, d] = P(53.1 + i * 0.16, 36.3, h(53, 36.3));
        ctx.moveTo(a, b); ctx.lineTo(c, d);
      }
      for (let j = 0; j < 3; j++) {
        const k = j / 3, [a, b] = P(52.9 + k * 0.2, 35.9 + k * 0.4, z + 0.75 - k * 0.75), [c, d] = P(53.4 + k * 0.3, 35.9 + k * 0.4, z + 0.75 - k * 0.75);
        ctx.moveTo(a, b); ctx.lineTo(c, d);
      }
      ctx.stroke();
    }, { bias: 2 });
    still(R, 52.45, 35.62, folk(302, { top: C.pink }), { pose: 'sit', dir: 'r', z: 0.1, when: during(20.9, 23.6), watch: false, bias: 2 });
    still(R, 53.15, 35.62, folk(303, { top: C.sky, hat: 'cap' }), { pose: 'sit', dir: 'l', z: 0.1, when: during(20.9, 23.6), watch: false, bias: 2 });
    // The shop cat, asleep on the step all day.
    R.thing(54.9, 33.5, (ctx, t) => {
      const [X, Y] = P(54.8, 33.4, h(54.8, 33.4));
      ctx.beginPath();
      ctx.ellipse(X, Y - 0.12, 0.26, 0.13, 0, 0, Math.PI * 2);
      ctx.arc(X + 0.22, Y - 0.2, 0.1, 0, Math.PI * 2);
      paint(ctx, C.mustard, { lw: 0.03, dots: Q.detail ? C.brown : null, density: 0.3 });
      if (Q.detail) label(ctx, 55.2, 33.2, h(54.8, 33.4) + 0.7 + (t * 0.5 % 1) * 0.5, 'z', 0.3, alpha(C.ink, 1 - (t * 0.5 % 1)));
    }, { anim: true });
    // People walking past the board, never once looking at it.
    const passer = route([[50.4, 32.3], [55.1, 32.3], [55.1, 37.2], [54.4, 38.9]], { speed: 1.1, loop: false, offset: 3 });
    const passer2 = route([[48.8, 32.25], [55.15, 32.25], [55.15, 36.8]], { speed: 1.25, loop: false, offset: 17 });
    [[passer, folk(311, { top: C.mustard, hold: phone, hat: 'sun' })], [passer2, folk(312, { top: C.teal, hold: boogie(C.coral) })]].forEach(([fn, look]) => {
      R.mover((t) => fn(t), (ctx, t, p) => {
        if (!busy(t) || sunsetWatch(t)) return;
        who(ctx, p.x, p.y, h(p.x, p.y), look, null, { pose: 'walk', dir: p.dir, back: p.back }, t);
      });
    });

    // ---------- The ice cream window ----------
    // Open late: a striped awning, a giant cone on the roof, bulbs along the
    // awning that come on at dusk, and a menu nobody finishes reading.
    const IX = 64.8, IY = 28.2, IW = 2.6, ID = 1.6, IZ = h(66, 29);
    printed(R, IX + IW, IY + ID, (ctx, ink) => {
      const z = IZ;
      box(ctx, IX, IY, z, IW, ID, 2.0, ink(C.white), { dotsL: ink(shade(C.pink, 0.4)), dens: 0.1, lw: 0.05 });
      // The serving window, and the dark inside.
      face(ctx, [[IX + 0.3, IY + ID, z + 0.95], [IX + 1.6, IY + ID, z + 0.95], [IX + 1.6, IY + ID, z + 1.75], [IX + 0.3, IY + ID, z + 1.75]], shade(C.pink, 0.55), { lw: 0.04 });
      box(ctx, IX - 0.12, IY - 0.12, z + 2.0, IW + 0.24, ID + 0.24, 0.2, ink(C.pink), { flat: true, lw: 0.04 });
      // The menu, on the side.
      plate(ctx, 'y', IX + IW + 0.01, IY + 0.8, z + 1.15, 1.25, 1.25, [
        ['SOFT SERVE', 0.17, C.coral], ['VANILLA', 0.12], ['PLUM', 0.12], ['LOW TIDE MUD', 0.12], ['GREENHEAD', 0.12], ['CRUNCH*', 0.12], ['*RAISINS', 0.09, C.grey],
      ], { board: ink(C.white), edge: 0.03, gap: 1.2 });
      // The cone on the roof.
      const [cx, cy] = P(IX + IW / 2, IY + ID / 2, z + 2.2);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - 0.42, cy - 1.3); ctx.lineTo(cx + 0.42, cy - 1.3); ctx.closePath();
      paint(ctx, ink(C.woodLight), { dots: Q.detail ? ink(C.wood) : null, density: 0.35, lw: 0.04 });
      ctx.beginPath(); ctx.arc(cx, cy - 1.55, 0.5, 0, Math.PI * 2);
      paint(ctx, ink(C.pink), { lw: 0.04 });
      ctx.beginPath(); ctx.arc(cx + 0.05, cy - 1.95, 0.35, 0, Math.PI * 2);
      paint(ctx, ink(tint(C.pink, 0.55)), { lw: 0.04 });
      disc(ctx, IX + IW / 2 + 0.1, IY + ID / 2 - 0.1, z + 2.2 + 2.25, 0.06, C.red, { lw: 0.02 });
      // The awning over the window.
      const a0 = IX + 0.15, a1 = IX + 1.75, n = 6;
      for (let i = 0; i < n; i++) {
        const u0 = a0 + ((a1 - a0) * i) / n, u1 = a0 + ((a1 - a0) * (i + 1)) / n;
        shape(ctx, [[u0, IY + ID, z + 1.95], [u1, IY + ID, z + 1.95], [u1, IY + ID + 0.6, z + 1.62], [u0, IY + ID + 0.6, z + 1.62]], ink(i % 2 ? C.white : C.pink), { lw: 0.03 });
      }
    }, { depth: IX + IY + ID - 0.2, veil: (ctx, v) => v([[IX, IY, IZ, IW, ID, 2.0], [IX - 0.12, IY - 0.12, IZ + 2.0, IW + 0.24, ID + 0.24, 0.2]], [[[IX + 0.15, IY + ID, IZ + 1.95], [IX + 1.75, IY + ID, IZ + 1.95], [IX + 1.75, IY + ID + 0.6, IZ + 1.62], [IX + 0.15, IY + ID + 0.6, IZ + 1.62]]]) });
    R.thing(IX + IW + 0.02, IY + ID + 0.62, (ctx) => {
      for (let i = 0; i <= 6; i++) disc(ctx, IX + 0.15 + (1.6 * i) / 6, IY + ID + 0.62, IZ + 1.56 - Math.sin((i / 6) * Math.PI) * 0.08, 0.06, LIT, { lw: 0.015 });
      face(ctx, [[IX + 0.3, IY + ID + 0.01, IZ + 0.95], [IX + 1.6, IY + ID + 0.01, IZ + 0.95], [IX + 1.6, IY + ID + 0.01, IZ + 1.75], [IX + 0.3, IY + ID + 0.01, IZ + 1.75]], alpha(LIT, 0.55), { stroke: false });
    }, { on: lightsOn, depth: IX + IY + ID + 0.2 });
    nightGlow(R, IX + 1, IY + ID + 0.6, IZ + 1.3, 3, LIT, 0.8);
    // Whoever's serving, scooping, in the window (and the counter over their
    // legs).
    const server = folk(321, { top: C.pink, hat: 'cap', style: 'pony' });
    R.mover(() => ({ x: IX + 0.95, y: IY + ID - 0.3 }), (ctx, t) => {
      const open = during(10.5, 22)(t);
      if (!open) return;
      const x = IX + 0.95, y = IY + ID - 0.3;
      person(ctx, x, y, IZ - 0.1, { ...server, pose: 'stand', dir: 'l', arms: [1.3 + Math.sin(t * 5) * 0.4, 0.4] }, t);
      face(ctx, [[IX + 0.3, IY + ID, IZ + 0.6], [IX + 1.6, IY + ID, IZ + 0.6], [IX + 1.6, IY + ID, IZ + 0.95], [IX + 0.3, IY + ID, IZ + 0.95]], C.white, { lw: 0.03 });
      box(ctx, IX + 0.25, IY + ID, IZ + 0.93, 1.4, 0.18, 0.06, C.pink, { flat: true, lw: 0.025 });
    }, { bias: 0.02 });
    // The line, the goose at the back of it. They leap out of the greenhead
    // man's way as he comes up from the beach, and turn round at sunset.
    const FLAVORS = [C.pink, C.butter, C.brown];
    const honking = (t) => Math.sin(t / 2) > 0.8;
    [[65.6, 30.3, 331], [66.8, 30.3, 333], [68.0, 30.2, 335]].forEach(([x, y, s], i) => {
      const look = folk(s, i === 1 ? { hold: phone } : {});
      local(R, x, y, look, {
        when: (t) => { const hr = hour(t); return hr >= 11 + i * 0.4 && hr < 21.8; },
        pose: i === 0 ? 'point' : i === 1 ? 'read' : 'stand',
        dir: i === 0 ? 'r' : (t) => (i === 2 && honking(t) ? 'r' : 'l'),
        back: i !== 2,
        swarm: 5,
        more: i === 2 ? (ctx, t, p, z) => { if (honking(t) && Q.detail && !sunsetWatch(t)) speech(ctx, p.x, p.y, z + 2.7, '?', { size: 0.4 }); } : null,
      });
    });
    // Someone who got theirs, off to the beach across the crossing.
    const coneWalk = route([[66.1, 30.7], [65.0, 30.9], [65.0, 32.6], [62.9, 33.4], [62.4, 37.3], [62.1, 38.6]], { speed: 1.05, loop: false });
    R.mover(coneWalk, (ctx, t, p) => {
      if (!during(11.2, 19.8)(t)) return;
      const a = aside(p.x, p.y, t, 3);
      who(ctx, p.x + a.dx, p.y + a.dy, h(p.x, p.y), folk(341, { hold: a.k > 0.5 ? null : cone(FLAVORS[Math.floor(t / 20) % 3]) }), null, { pose: a.k > 0.5 ? 'wave' : 'walk', dir: p.dir, back: p.back, scale: 0.75 }, t);
    });

    // Two bins by the ice cream window, for everybody's dropped cones. The
    // goose has climbed into the one at the back of the line and is working
    // through them: its lid won't sit flat, and a tail tip sticks out under
    // it. Tap a bin and the lid flips up; the other is just napkins.
    const BIN_A = [69.3, 29.75], BIN_B = [63.95, 29.45];
    const binA = R.poke({ id: 'bin', at: [BIN_A[0], BIN_A[1], z0(BIN_A) + 0.75], r: 0.7, sound: 'clunk', say: 'HONK?' });
    const binB = R.poke({ id: 'bin2', at: [BIN_B[0], BIN_B[1], z0(BIN_B) + 0.75], r: 0.7, hold: 2.2, sound: 'clunk', say: ['Napkins. Sticky ones.', 'Still napkins.', 'A cone. Already licked.'] });
    // A bin in two passes, so whatever's in it sits between them: the back
    // (the whole bin, its dark mouth, the lid when it's up) and the front (the
    // near side again, over anything inside, and the lid when it's down).
    const BIN = mix(C.teal, C.ink, 0.25), BH = 0.95 * ZK, BR = 0.42;
    const binSide = (ctx, X, Y) => {
      const Yt = Y - BH;
      ctx.beginPath(); ctx.moveTo(X - BR, Yt); ctx.lineTo(X - BR, Y); ctx.ellipse(X, Y, BR, BR / 2, 0, Math.PI, 0, true);
      ctx.lineTo(X + BR, Yt); ctx.ellipse(X, Yt, BR, BR / 2, 0, 0, Math.PI, false); ctx.closePath();
      paint(ctx, BIN, { lw: 0.04, dots: Q.detail ? shade(BIN, 0.5) : null, density: 0.18 });
      if (!Q.detail) return;
      ctx.beginPath(); ctx.ellipse(X, Y - BH * 0.55, BR, BR / 2, 0, 0, Math.PI); ctx.lineTo(X - BR, Y - BH * 0.75); ctx.ellipse(X, Y - BH * 0.75, BR, BR / 2, 0, Math.PI, 0, true); ctx.closePath();
      paint(ctx, C.white, { lw: 0.025 });
    };
    const binLid = (ctx, X, Y, k, crooked) => {
      const Yt = Y - BH;
      ctx.beginPath();
      if (k > 0.05) ctx.ellipse(X + 0.22 * k, Yt - 0.06 - 0.42 * k, BR + 0.04, (BR / 2 + 0.02) * (1 - 0.75 * k), -0.15 - 0.5 * k, 0, Math.PI * 2);
      else ctx.ellipse(X + (crooked ? 0.04 : 0), Yt - (crooked ? 0.1 : 0.03), BR + 0.04, BR / 2 + 0.02, crooked ? -0.2 : 0, 0, Math.PI * 2);
      paint(ctx, shade(BIN, 0.15), { lw: 0.035 });
      if (k < 0.05) { const [hx, hy] = [X + (crooked ? 0.04 : 0), Yt - (crooked ? 0.17 : 0.1)]; ctx.beginPath(); ctx.ellipse(hx, hy, 0.12, 0.05, crooked ? -0.2 : 0, 0, Math.PI * 2); paint(ctx, shade(BIN, 0.35), { lw: 0.025 }); }
    };
    const binBack = (bin, poke, inside) => R.thing(bin[0], bin[1], (ctx) => {
      const [X, Y] = P(bin[0], bin[1], z0(bin)), k = poke.k();
      binSide(ctx, X, Y);
      ctx.beginPath(); ctx.ellipse(X, Y - BH, BR, BR / 2, 0, 0, Math.PI * 2); paint(ctx, mix(BIN, C.ink, 0.6), { lw: 0.035 });
      if (k > 0.3 && inside) inside(ctx, X, Y - BH);
      if (k >= 0.05) binLid(ctx, X, Y, k, false);
    }, { anim: true, depth: bin[0] + bin[1] - 0.3 });
    const binFront = (bin, poke, crooked, tell) => R.thing(bin[0], bin[1], (ctx) => {
      const [X, Y] = P(bin[0], bin[1], z0(bin)), k = poke.k();
      binSide(ctx, X, Y);
      if (k < 0.05) { binLid(ctx, X, Y, 0, crooked); if (tell) tell(ctx, X, Y - BH); }
    }, { anim: true, depth: bin[0] + bin[1] + 0.3 });
    binBack(BIN_A, binA);
    binFront(BIN_A, binA, true, (ctx, X, Yt) => {
      // The tell: a white tail tip out from under the back of the lid.
      ctx.beginPath(); ctx.moveTo(X + 0.12, Yt - 0.12); ctx.quadraticCurveTo(X + 0.34, Yt - 0.2, X + 0.52, Yt - 0.42); ctx.quadraticCurveTo(X + 0.46, Yt - 0.12, X + 0.28, Yt - 0.02); ctx.closePath();
      paint(ctx, C.white, { lw: 0.035 });
    });
    binBack(BIN_B, binB, (ctx, X, Yt) => {
      for (const [dx, dy] of [[-0.15, 0], [0.05, -0.04], [0.18, 0.03], [-0.02, 0.07]]) { ctx.beginPath(); ctx.arc(X + dx, Yt + dy, 0.08, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.02 }); }
    });
    binFront(BIN_B, binB, false);
    // The goose, in the bin with the cones, up and honking once it's found out.
    sunbatherPoke(R); // the sunbather on his towel (day.js draws him)
    R.goose((t) => {
      const k = binA.k();
      return { x: BIN_A[0], y: BIN_A[1], z: z0(BIN_A) + 0.42 + 0.3 * k, dir: 'l', hidden: k < 0.3, pose: k > 0.6 && honking(t) ? 'honk' : 'sit' };
    }, { kind: 'poke', inside: binA, hint: 'Somebody is finishing everyone\'s dropped cones. Two bins, and one lid won\'t sit flat.' });

    // ---------- The fly swatter stand ----------
    // A kid at the corner selling swatters all day. When the greenhead man
    // runs past, a sales opportunity.
    R.thing(60.3, 29.5, (ctx) => {
      const z = h(59.6, 29);
      box(ctx, 59.0, 28.85, z + 0.75, 1.3, 0.6, 0.08, C.white, { flat: true, lw: 0.03 });
      for (const [dx, dy] of [[0.05, 0.05], [1.15, 0.05], [0.05, 0.45], [1.15, 0.45]]) box(ctx, 59.0 + dx, 28.85 + dy, z, 0.08, 0.08, 0.75, C.wood, { flat: true, lw: 0.02 });
      plate(ctx, 'x', 59.65, 29.46, z + 0.5, 1.3, 0.5, [['FLY SWATTERS', 0.15, C.red], ['$5', 0.2]], { board: C.butter, edge: 0.03 });
      if (Q.detail) for (let k = 0; k < 4; k++) {
        const x = 59.2 + k * 0.28;
        line(ctx, [[x, 29.05, z + 0.84], [x + 0.05, 29.35, z + 0.84]], C.ink, 0.03);
        shape(ctx, [[x + 0.02, 28.9, z + 0.84], [x + 0.14, 28.9, z + 0.84], [x + 0.14, 29.08, z + 0.84], [x + 0.02, 29.08, z + 0.84]], [C.coral, C.teal, C.mustard, C.purple][k], { lw: 0.02 });
      }
    });
    local(R, 59.7, 28.4, folk(351, { top: C.green, hat: 'cap', hold: (ctx) => { ctx.fillStyle = C.coral; ctx.fillRect(-0.02, -0.5, 0.04, 0.4); ctx.fillRect(-0.1, -0.62, 0.2, 0.16); } }), {
      when: during(9, 20.9), pose: (t) => (Math.sin(t * 0.7) > 0.6 ? 'wave' : 'stand'), dir: 'l', swarm: 3.2, scale: 0.72,
      more: (ctx, t, p, z) => { if (p.k > 0.3 && Q.detail) speech(ctx, p.x, p.y, z + 2.1, 'SWATTER? $5!', { size: 0.34 }); },
    });

    // ---------- The lots ----------
    // Residents only, and everyone else gets a ticket.
    notice(R, 60.9, 33.0, [['RESIDENTS ONLY', 0.24, C.white], ['EVERYONE ELSE: TICKETED,', 0.12, C.white], ['TOWED AND JUDGED', 0.12, C.white]], { w: 2.0, h: 0.8, board: C.red, post: 1.35 });
    R.thing(TICKET_CAR[0] + 0.5, TICKET_CAR[1] + 1, (ctx) => car(ctx, ...TICKET_CAR, h(...TICKET_CAR), CARS[0], 'y', null, 0, null, { board: C.butter }));
    // (The third space is beach traffic's, day.js: in at 8:20am, out by six.)
    R.thing(GH_CAR[0] + 0.5, GH_CAR[1] + 1, (ctx) => car(ctx, ...GH_CAR, h(...GH_CAR), CARS[6], 'y'), { on: during(9.4, 22) });
    // The ticket, under the wiper, flapping.
    const tz = h(...TICKET_CAR);
    R.thing(TICKET_CAR[0] + 0.52, TICKET_CAR[1] + 1.02, (ctx, t) => {
      const x = TICKET_CAR[0], y = TICKET_CAR[1] + 0.44, f = Q.detail ? Math.sin(t * 7) * 0.06 + 0.05 : 0.05;
      shape(ctx, [[x - 0.32, y, tz + 0.66], [x + 0.28, y, tz + 0.66], [x + 0.28, y + f, tz + 1.02], [x - 0.32, y + f, tz + 1.02]], C.white, { lw: 0.03 });
      shape(ctx, [[x - 0.32, y + f * 0.8, tz + 0.93], [x + 0.28, y + f * 0.8, tz + 0.93], [x + 0.28, y + f, tz + 1.02], [x - 0.32, y + f, tz + 1.02]], C.mustard, { stroke: false });
      if (Q.detail) for (const zz of [0.74, 0.8, 0.86]) line(ctx, [[x - 0.2, y + f * ((zz - 0.66) / 0.34), tz + zz], [x + 0.1, y + f * ((zz - 0.66) / 0.34), tz + zz]], C.grey, 0.02);
      line(ctx, [[x - 0.34, y + 0.02, tz + 0.7], [x + 0.28, y + 0.02, tz + 0.66]], C.ink, 0.04);
    }, { anim: true });
    R.find({ id: 'ticket', label: 'A parking ticket', at: [TICKET_CAR[0], TICKET_CAR[1] + 0.46, tz + 0.83], r: 0.8 });
    // The parking officer, on a slow loop behind the cars, writing, writing.
    const officerLook = folk(361, { top: C.navy, bottom: C.navy, hat: 'cap', hold: pad });
    const beat = route([[55.3, 33.25], [55.9, 33.25, 7], [57.2, 33.25, 5], [58.6, 33.25, 6], [59.9, 33.25, 2], [60.5, 33.25], [60.5, 37.3, 3]], { speed: 0.55, loop: false });
    R.mover((t) => {
      const p = beat(t), a = aside(p.x, p.y, t, 3.4);
      return { ...p, x: p.x + a.dx, y: p.y + a.dy, k: a.k };
    }, (ctx, t, p) => {
      if (!during(8.3, 18.2)(t)) return;
      const pose = p.k > 0.5 ? 'wave' : p.moving ? 'walk' : 'read';
      who(ctx, p.x, p.y, h(p.x, p.y), officerLook, null, { pose, dir: p.moving ? p.dir : 'r', back: p.moving ? p.back : true }, t);
      if (!p.moving && Q.detail && p.k < 0.2 && Math.sin(t * 0.9) > 0.5) speech(ctx, p.x, p.y, h(p.x, p.y) + 2.6, 'Resident?', { size: 0.34 });
    });

    // The $20 lot: a hand-painted sign whose price follows the day, and the
    // man waving his flag at every car that comes over the bridge.
    const PRICE = [
      [during(5, 17), ['PARKING', '$20', 'ALL DAY']],
      [during(17, 21), ['PARKING', '$10', 'SUNSET SPECIAL']],
      [during(21, 5), ['PARKING', '$40', 'KING TIDE VIEWING']],
    ];
    for (const [on, [a, b, c]] of PRICE) {
      notice(R, 68.2, 32.8, [[a, 0.17], [b, 0.4, C.red], [c, 0.14]], { w: 1.5, h: 1.15, board: tint(C.wood, 0.5), post: 0.95, font: 'Bagel Fat One', on });
    }
    const waver = folk(371, { top: C.coral, bottom: C.navy, hat: 'sun' });
    R.mover(() => ({ x: 69.5, y: 32.7 }), (ctx, t) => {
      if (!during(7.5, 23)(t)) return;
      const x = 69.5, y = 32.7, z = h(x, y), hr = hour(t);
      if (sunsetWatch(t)) { person(ctx, x, y, z, { ...waver, pose: 'stand', dir: 'r', back: true }, t); return; }
      if (hr >= 17 && hr < 19.8 || hr >= 20.9) {
        // Counting the day's cash on the cooler.
        box(ctx, x - 0.35, y - 0.25, z, 0.7, 0.5, 0.5, C.white, { flat: true, lw: 0.03 });
        person(ctx, x, y, z + 0.1, { ...waver, pose: 'sit', dir: 'l', arms: [1.1, 1.1 + Math.sin(t * 6) * 0.2] }, t);
        return;
      }
      const s = Math.sin(t * 4);
      person(ctx, x, y, z, { ...waver, pose: 'stand', dir: 'l', arms: [Math.PI - 0.6 + s * 0.5, -0.2] }, t);
      if (!Q.detail) return;
      // The flag: a stick and a cloth out of the raised hand.
      const [hx, hy] = P(x, y, z + 1.55);
      const ax = hx - Math.sin(Math.PI - 0.6 + s * 0.5) * 0.7, ay = hy - 0.6 - Math.cos(Math.PI - 0.6 + s * 0.5) * 0.35;
      ctx.beginPath(); ctx.moveTo(hx - 0.2, hy - 0.3); ctx.lineTo(ax - 0.3, ay - 0.9);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ax - 0.3, ay - 0.9); ctx.lineTo(ax - 0.95, ay - 0.75 + s * 0.12); ctx.lineTo(ax - 0.9, ay - 0.35 + s * 0.12); ctx.lineTo(ax - 0.27, ay - 0.5); ctx.closePath();
      paint(ctx, C.mustard, { lw: 0.03 });
    });
    // The wagon that has been in the $20 lot since 1998: faded, wood panels,
    // sand in the wheel arches, the grass growing up round it.
    const oz = h(...OLD_CAR);
    R.thing(OLD_CAR[0] + 0.5, OLD_CAR[1] + 1, (ctx) => {
      const [x, y] = OLD_CAR, body = mix(C.teal, INK.sand, 0.5);
      car(ctx, x, y, oz, body, 'y', null, 0, null, { rack: true });
      // Wood panels down its side.
      shape(ctx, [[x + 0.5, y - 0.9, oz + 0.24], [x + 0.5, y + 0.9, oz + 0.24], [x + 0.5, y + 0.9, oz + 0.5], [x + 0.5, y - 0.9, oz + 0.5]], C.wood, { lw: 0.03, dots: Q.detail ? C.brown : null, density: 0.25 });
      // Folding chairs on the roof rack, and a bumper.
      box(ctx, x - 0.45, y + 0.98, oz + 0.14, 0.9, 0.06, 0.1, C.greyLight, { flat: true, lw: 0.02 });
      if (Q.detail) {
        box(ctx, x - 0.3, y - 0.45, oz + 1.12, 0.6, 0.9, 0.08, tint(C.coral, 0.4), { flat: true, lw: 0.02 });
        for (const [dx, dy, s] of [[0.62, -0.7, 0.8], [0.64, 0.75, 0.7], [-0.4, 1.2, 0.8]]) tuft(ctx, x + dx, y + dy, oz, s);
      }
      // The sticker: faded to nearly nothing, peeling at a corner.
      const sy = y + 1.045, s0 = x - 0.36, s1 = x + 0.36, z0 = oz + 0.27, z1 = oz + 0.52;
      shape(ctx, [[s0, sy, z0], [s1, sy, z0], [s1, sy, z1], [s0, sy, z1]], tint(C.sky, 0.55), { lw: 0.025, stroke: shade(C.sky, 0.25) });
      shape(ctx, [[s1 - 0.12, sy, z1], [s1, sy, z1], [s1, sy, z1 - 0.1]], body, { stroke: false });
      shape(ctx, [[s1 - 0.12, sy + 0.02, z1], [s1, sy + 0.05, z1 - 0.1], [s1 - 0.1, sy + 0.05, z1 - 0.12]], C.white, { lw: 0.015 });
      if (Q.detail) {
        ctx.save();
        ctx.translate(...P(0, sy + 0.005, 0));
        paintText(ctx, 'right', x - 0.04, oz + 0.43, 'PLUM ISLAND', 0.1, tint(C.navy, 0.45), 'Rethink Sans');
        paintText(ctx, 'right', x - 0.04, oz + 0.33, "BEACH '98", 0.09, tint(C.coral, 0.4), 'Rethink Sans');
        ctx.restore();
      }
    });
    // A beach towel drying over the wagon's tailgate, hiding the proof: tap
    // it and it rolls up onto the rack. (A thin blue edge of the sticker
    // shows under it all along.)
    const towel = R.poke({ id: 'towel', at: [OLD_CAR[0], OLD_CAR[1] + 1.07, oz + 0.62], r: 0.7, sound: 'pop' });
    R.thing(OLD_CAR[0] + 0.52, OLD_CAR[1] + 1.02, (ctx, t) => {
      const k = towel.k(), [x, y] = OLD_CAR, ty = y + 1.075, x0 = x - 0.42, x1 = x + 0.42;
      const zt = oz + 1.12, zb = oz + 0.33 + 0.62 * k, sway = Q.detail ? Math.sin(t * 2.2) * 0.02 * (1 - k) : 0;
      shape(ctx, [[x0, ty, zt], [x1, ty, zt], [x1, ty + sway, zb], [x0, ty + sway, zb]], C.pink, { lw: 0.03 });
      if (Q.detail) for (const zz of [0.25, 0.6]) {
        const a = zt - (zt - zb) * zz;
        shape(ctx, [[x0, ty + sway * zz, a], [x1, ty + sway * zz, a], [x1, ty + sway * zz, a - 0.07], [x0, ty + sway * zz, a - 0.07]], C.white, { stroke: false });
      }
      if (k > 0.1) line(ctx, [[x0, ty + 0.03, zb], [x1, ty + 0.03, zb]], shade(C.pink, 0.2), 0.12 * k);
    }, { anim: true });
    R.find({ id: 'sticker', label: 'A beach sticker from 1998', kind: 'poke', inside: towel, at: [OLD_CAR[0], OLD_CAR[1] + 1.05, oz + 0.4], r: 0.7, hint: 'The oldest car in the $20 lot can prove it. Something is drying over the proof.' });

    // ---------- The warnings ----------
    // The town's message board by the path, blinking its news at nobody.
    const VX = 60.3, VY = 38.5, VZ = h(VX, VY);
    R.thing(VX + 0.9, VY + 0.4, (ctx) => {
      box(ctx, VX - 0.8, VY - 0.35, VZ + 0.3, 1.6, 0.7, 0.35, C.mustard, { flat: true, lw: 0.04 });
      for (const dx of [-0.6, 0.45]) box(ctx, VX + dx, VY + 0.25, VZ, 0.18, 0.12, 0.42, C.ink, { flat: true, lw: 0.02 });
      box(ctx, VX - 0.06, VY - 0.06, VZ + 0.65, 0.12, 0.12, 1.1, C.mustard, { flat: true, lw: 0.03 });
      face(ctx, [[VX - 0.8, VY + 0.08, VZ + 1.6], [VX + 0.8, VY + 0.08, VZ + 1.6], [VX + 0.8, VY + 0.08, VZ + 2.45], [VX - 0.8, VY + 0.08, VZ + 2.45]], C.black, { lw: 0.06 });
    });
    const MSG = ['KING TIDE', 'TONIGHT', '12:15 AM', 'NO REALLY', 'TONIGHT'];
    // Tap it, and for once it has someone to talk to.
    const sign = R.poke({ id: 'board', teach: true, at: [VX + 0.3, VY + 0.15, VZ + 1.3], r: 1.0, hold: 2.5, sound: 'tick', say: ['It says KING TIDE. It means it.', 'Still tonight.', 'You read it! Tell the others.'] });
    R.thing(VX + 0.91, VY + 0.41, (ctx, t) => {
      const told = sign.k() > 0.5;
      const k = Math.floor(t / 1.8) % MSG.length;
      if (!told && (t % 1.8) > 1.62) return;
      ctx.save();
      ctx.translate(...P(0, VY + 0.09, 0));
      paintText(ctx, 'right', VX, VZ + 2.02, told ? 'HI THERE' : MSG[k], 0.27, told ? C.coral : C.mustard, 'Rethink Sans');
      ctx.restore();
    }, { anim: true });
    // Leaning on it, reading his phone.
    local(R, 61.0, 39.1, folk(381, { top: C.purple, hold: phone }), { when: busy, pose: 'read', dir: 'l', swarm: 3 });

    // 2030 came early: the town's sign, with somebody's towel drying on it.
    notice(R, 57.5, 42.3, [['2030 CAME EARLY', 0.22, C.white], ['EXPECT THIS ROAD UNDER', 0.11, C.white], ['AT EVERY KING TIDE', 0.11, C.white]], {
      w: 2.4, h: 0.85, board: C.navy, post: 1.2,
      more: (ctx, z) => {
        // Over the left post, under the board.
        shape(ctx, [[56.3, 42.4, z + 1.0], [56.75, 42.4, z + 1.0], [56.75, 42.45, z + 0.25], [56.3, 42.45, z + 0.25]], C.teal, { lw: 0.03 });
        if (Q.detail) shape(ctx, [[56.45, 42.42, z + 1.0], [56.55, 42.42, z + 1.0], [56.55, 42.46, z + 0.25], [56.45, 42.46, z + 0.25]], C.white, { stroke: false });
      },
    });
    // No lifeguard on duty, and a gull on top of the sign who disagrees.
    notice(R, 60.1, 43.3, [['NO LIFEGUARD', 0.22, C.red], ['ON DUTY', 0.22, C.red], ['SWIM AT YOUR OWN RISK', 0.1]], { w: 1.9, h: 0.9, board: C.white, post: 1.1 });
    R.thing(60.3, 43.5, (ctx) => gull(ctx, 60.1 + 0.3, 43.36, h(60.1, 43.3) + 1.1 + 0.45, 0, { dir: -1 }));

    // ---------- The beach path ----------
    // Boards over the dune, rope rails on posts, and a leash tied to one of
    // them. (The dog is down by the water, having the day of its life.)
    // (The boards are flat: one picture, sorted at the top of the path, so
    // everyone walking on them is drawn over them.)
    R.thing(PATH + 0.7, 38.4, (ctx) => {
      for (let y = 37.4; y < 43.9; y += 1) {
        const z = Math.max(h(PATH, y), h(PATH, y + 1)) + 0.1;
        box(ctx, PATH - 0.6, y, z, 1.2, 1, 0.12, tint(C.wood, 0.25), { flat: true, lw: 0.035 });
        if (Q.detail) for (let k = 1; k < 4; k++) line(ctx, [[PATH - 0.6, y + k * 0.25, z + 0.12], [PATH + 0.6, y + k * 0.25, z + 0.12]], shade(C.wood, 0.2), 0.02);
      }
    });
    for (const side of [-0.72, 0.72]) {
      const x = PATH + side;
      for (let y = 37.6; y < 44; y += 1.6) {
        const y1 = Math.min(y + 1.6, 43.8), z0 = h(x, y), z1 = h(x, y1);
        R.thing(x + 0.06, y1 + 0.06, (ctx) => {
          box(ctx, x - 0.05, y1 - 0.05, z1, 0.1, 0.1, 0.9, shade(C.wood, 0.2), { flat: true, lw: 0.025 });
          if (y === 37.6) box(ctx, x - 0.05, y - 0.05, z0, 0.1, 0.1, 0.9, shade(C.wood, 0.2), { flat: true, lw: 0.025 });
          line(ctx, [[x, y, z0 + 0.85], [x, (y + y1) / 2, (z0 + z1) / 2 + 0.72], [x, y1, z1 + 0.85]], C.woodLight, 0.05);
        });
      }
    }
    const LX = PATH + 0.72, LY = 40.8, lz = h(LX, LY);
    R.thing(LX + 0.6, LY + 0.6, (ctx) => {
      // Tied round the post, down to the sand, and the collar lying empty.
      line(ctx, [[LX, LY - 0.06, lz + 0.72], [LX + 0.07, LY + 0.02, lz + 0.66], [LX, LY + 0.08, lz + 0.6]], C.red, 0.07);
      line(ctx, [[LX + 0.02, LY + 0.06, lz + 0.62], [LX + 0.2, LY + 0.2, lz + 0.35], [LX + 0.35, LY + 0.3, lz + 0.08], [LX + 0.5, LY + 0.36, h(LX + 0.5, LY + 0.36) + 0.03]], C.red, 0.09);
      const cz = h(LX + 0.6, LY + 0.4);
      disc(ctx, LX + 0.62, LY + 0.42, cz + 0.02, 0.2, null, { lw: 0.1, stroke: C.teal });
      disc(ctx, LX + 0.66, LY + 0.58, cz + 0.02, 0.05, C.mustard, { lw: 0.02 });
    });
    R.find({ id: 'leash', label: 'A leash with no dog', at: [LX + 0.3, LY + 0.25, lz + 0.35], r: 0.75 });
    // Sand fence along the dune's foot, and the grass.
    const fence = (x0, x1, y0, y1) => R.thing(x1, y1, (ctx) => {
      const n = Math.round(Math.hypot(x1 - x0, y1 - y0) / 0.3);
      for (let i = 0; i <= n; i++) {
        const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n, z = h(x, y);
        line(ctx, [[x, y, z], [x, y, z + (i % 5 ? 0.75 : 0.95)]], i % 5 ? mix(C.wood, INK.shingle, 0.5) : shade(C.wood, 0.3), i % 5 ? 0.06 : 0.09);
      }
      if (Q.detail) for (const zz of [0.2, 0.6]) line(ctx, [[x0, y0, h(x0, y0) + zz], [x1, y1, h(x1, y1) + zz]], alpha(C.ink, 0.5), 0.02);
    });
    fence(48.6, 52.6, 42.4, 42.2);
    fence(52.6, 55.8, 42.2, 42.6);
    fence(63.5, 63.95, 42.9, 42.7);
    fence(64.3, 67.4, 42.7, 42.4);
    fence(67.4, 69.6, 42.4, 42.8);
    const TUFTS = [[49.6, 40.8], [50.8, 39.8], [53.2, 40.3], [54.9, 39.6], [56.4, 40.6], [58.3, 39.5], [59.4, 41.2], [63.8, 39.2], [64.9, 41.6], [69.1, 39.4], [55.3, 37.9], [57.1, 41.6], [63.4, 37.9], [68.8, 42]];
    // (Low grass, one picture a chunk: a quicker cache than fourteen.)
    for (const side of [0, 1]) {
      const mine = TUFTS.map((p, i) => [...p, i]).filter(([x]) => (x < 64) === !side);
      if (!mine.length) continue;
      const [fx, fy] = mine.reduce((m, [x, y]) => (x + y < m[0] + m[1] ? [x, y] : m), [1e9, 1e9]);
      R.thing(fx + 0.4, fy + 0.4, (ctx) => {
        for (const [x, y, i] of mine) for (let k = 0; k < 4; k++) tuft(ctx, x + ((k * 37) % 7) * 0.12 - 0.3, y + ((k * 53) % 5) * 0.12 - 0.2, h(x, y), 0.8 + ((i + k) % 3) * 0.15);
      });
    }

    // People up and down the path all day, out of the way of the greenhead
    // man, and back.
    const loopers = [
      [route([[PATH - 0.25, 37.0], [PATH - 0.25, 44.2], [61.3, 46.8]], { speed: 1.0, loop: false, offset: 0 }), folk(391, { top: C.teal, hold: boogie(C.mustard) }), 1],
      [route([[PATH + 0.25, 44.6], [PATH + 0.25, 37.2], [60.2, 36.9]], { speed: 0.9, loop: false, offset: 9 }), folk(392, { top: C.white, bottom: C.coral, hat: 'sun' }), 1],
    ];
    loopers.forEach(([fn, look, s]) => {
      R.mover((t) => {
        const p = fn(t), a = aside(p.x, p.y, t, 2.6);
        return { ...p, x: p.x + a.dx, y: p.y + a.dy, k: a.k };
      }, (ctx, t, p) => {
        if (!busy(t) || sunsetWatch(t)) return;
        const z = p.x > PATH - 0.7 && p.x < PATH + 0.7 && p.y < 43.9 ? Math.max(h(PATH, Math.floor(p.y - 0.4) + 0.4), h(PATH, Math.floor(p.y - 0.4) + 1.4)) + 0.22 : h(p.x, p.y);
        who(ctx, p.x, p.y, z + (p.k > 0.5 ? Math.abs(Math.sin(t * 8)) * 0.3 : 0), { ...look, hold: p.k > 0.5 ? null : look.hold }, null, { pose: p.k > 0.5 ? 'wave' : 'walk', dir: p.dir, back: p.back, scale: s }, t);
      });
    });
    // The family with everything, down the path just as the greenhead man
    // comes through at ten, and back up it just as he comes back at noon.
    const fam = schedule([
      [59.6, 36.9], { until: 73.5 },
      [PATH - 0.1, 37.3], [PATH - 0.1, 43.9], [61.0, 46.2], { until: 104, say: 'Forgot the sunscreen.' },
      [PATH - 0.1, 43.9], [PATH - 0.1, 37.3], [59.6, 36.9], { until: LOOP },
    ], { loop: LOOP, speed: 1.2, name: 'The family' });
    const famLooks = [folk(401, { top: C.mustard, bottom: C.navy, hat: 'sun' }), folk(402, { top: C.pink, dress: true }), folk(403, { top: C.sky })];
    const famHold = [
      (ctx) => { ctx.beginPath(); ctx.rect(-0.1, -0.2, 0.5, 0.3); paint(ctx, C.coral, { lw: 0.03 }); },
      (ctx) => { ctx.strokeStyle = C.white; ctx.lineWidth = 0.08; ctx.beginPath(); ctx.moveTo(0, 0.1); ctx.lineTo(0.1, -1.3); ctx.stroke(); },
      (ctx) => { ctx.beginPath(); ctx.moveTo(-0.08, -0.1); ctx.lineTo(0.12, -0.1); ctx.lineTo(0.09, 0.12); ctx.lineTo(-0.05, 0.12); ctx.closePath(); paint(ctx, C.mustard, { lw: 0.03 }); },
    ];
    famLooks.forEach((look, i) => {
      R.mover((t) => {
        const p = fam(t - i * 0.85);
        const bx = p.moving ? 0 : i * 0.75;
        const a = aside(p.x + bx, p.y, t, 2.4);
        return { ...p, x: p.x + bx + a.dx, y: p.y + a.dy, k: a.k };
      }, (ctx, t, p) => {
        if (t % LOOP < 73.5 + i * 0.85 || t % LOOP > 114.5 + i * 0.85) return;
        const onPath = p.x > PATH - 0.9 && p.x < PATH + 0.7 && p.y < 43.9 && p.y > 37.2;
        const z = onPath ? Math.max(h(PATH, p.y), h(PATH, p.y + 0.8)) + 0.2 : h(p.x, p.y);
        const k = p.k > 0.5;
        who(ctx, p.x, p.y, z + (k ? Math.abs(Math.sin(t * 8)) * 0.3 : 0), { ...look, hold: k ? null : famHold[i] }, null, { pose: k ? 'wave' : p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back, scale: i === 2 ? 0.7 : 1 }, t);
        if (!Q.detail || i) return;
        const s = t % LOOP;
        if (p.say && s > 95) speech(ctx, p.x, p.y, z + 2.8, p.say, { size: 0.34 });
        else if (k && s > 100) speech(ctx, p.x, p.y, z + 2.8, 'Not again!', { size: 0.34 });
        else if (k) speech(ctx, p.x, p.y, z + 2.8, 'Whoa!', { size: 0.34 });
      });
    });

    // ---------- The little jetty ----------
    // Granite, the far rocks under at high water (only what's above it is
    // drawn), weed where the tide reaches.
    JETTY.forEach((r) => {
      R.thing(r.x + 0.6, r.y + 0.6, (ctx, t) => {
        const L = level(t), z0 = Math.max(h(r.x, r.y) - 0.3, L - 0.02);
        if (z0 >= r.top) return;
        const w = r.w, col = mix(INK.shingle, C.brown, 0.15);
        box(ctx, r.x - w / 2, r.y - 0.58, z0, w, 1.16, r.top - z0, col, { dotsL: shade(col, 0.5), dens: 0.18, lw: 0.04, top: tint(col, 0.15) });
        const weed = Math.min(r.top, 0.45);
        if (weed > z0 + 0.05 && Q.detail) face(ctx, [[r.x - w / 2, r.y + 0.58, z0], [r.x + w / 2, r.y + 0.58, z0], [r.x + w / 2, r.y + 0.58, weed], [r.x - w / 2, r.y + 0.58, weed]], alpha(C.green, 0.55), { stroke: false });
      }, { anim: true });
    });
    // A starfish on the end rock's seaward face, low down where it's always
    // wet: only out of the water when the tide is all the way out.
    const SF = [JETTY[6].x - 0.15, JETTY[6].y + 0.59, -0.52];
    R.thing(JETTY[6].x + 0.62, JETTY[6].y + 0.62, (ctx) => {
      const [X, Y] = P(...SF);
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 0.07 : 0.19;
        const px = X + Math.cos(a) * r, py = Y + Math.sin(a) * r * 0.9;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      paint(ctx, C.coral, { lw: 0.025, dots: Q.detail ? shade(C.coral, 0.4) : null, density: 0.3 });
    }, { on: lowTide });
    R.find({ id: 'starfish', label: 'A starfish', kind: 'hard', when: lowTide, note: 'low tide', at: SF, r: 0.6, riddle: 'Hanging on until the water comes back.', hint: 'When the sea is all the way out, look low on the rocks that are usually under it.' });
    // A cormorant on the end rock, drying its wings, until the tide has it.
    const end = JETTY[6];
    R.thing(end.x + 0.61, end.y + 0.61, (ctx, t) => {
      if (level(t) > end.top - 0.05) return;
      const [X, Y] = P(end.x, end.y, end.top);
      const spread = Math.sin(t * 0.5) > 0 ? 1 : 0.35, f = Math.sin(t * 6) * 0.05 * spread;
      ctx.beginPath();
      ctx.ellipse(X, Y - 0.35, 0.12, 0.3, 0, 0, Math.PI * 2);
      paint(ctx, C.black, { lw: 0.03 });
      ctx.beginPath();
      ctx.moveTo(X - 0.05, Y - 0.5); ctx.lineTo(X - 0.55 * spread, Y - 0.62 - f); ctx.lineTo(X - 0.45 * spread, Y - 0.3);
      ctx.moveTo(X + 0.05, Y - 0.5); ctx.lineTo(X + 0.55 * spread, Y - 0.62 - f); ctx.lineTo(X + 0.45 * spread, Y - 0.3);
      paint(ctx, C.black, { lw: 0.03 });
      ctx.beginPath(); ctx.arc(X + 0.03, Y - 0.72, 0.08, 0, Math.PI * 2);
      paint(ctx, C.black, { lw: 0.02 });
      ctx.fillStyle = C.mustard; ctx.fillRect(X + 0.08, Y - 0.74, 0.13, 0.03);
    }, { anim: true });
    // ---------- The Center's beach ----------
    // Umbrellas while the day's on, towels, a cooler. The two nearest the
    // path are in the greenhead man's way; the rest just read.
    SPOTS.forEach(([x, y], i) => {
      R.thing(x, y + 0.6, (ctx) => {
        umbrella(ctx, x, y, h(x, y), [C.coral, C.mustard, C.teal, C.pink, C.coral][i]);
      }, { on: both(busy, dryAt(x, y)) });
      const look = folk(420 + i, { hold: i === 0 ? phone : null });
      const px = x + 0.9, py = y + 0.5;
      if (i >= 3) {
        local(R, px, py, look, { when: both(during(9, 20.9), dryAt(px, py)), pose: i === 3 ? 'sit' : 'read', dir: i % 2 ? 'l' : 'r', swarm: 3 });
      } else {
        still(R, px, py, look, { pose: i % 2 ? 'sit' : 'read', dir: i % 2 ? 'l' : 'r', when: both(busy, dryAt(px, py)), watchWhen: dryAt(px, py) });
      }
    });
    // A kid digging to China, all day. By six only the hat shows.
    const DG = [59.4, 47.8];
    R.mover(() => ({ x: DG[0], y: DG[1] }), (ctx, t) => {
      if (!during(9, 18.8)(t) || level(t) > h(...DG) - 0.1) return;
      const hr = hour(t), deep = clamp((hr - 9) / 9), z = h(...DG);
      const [X, Y] = P(DG[0], DG[1], z);
      // The pile, growing, with the sign in it.
      disc(ctx, DG[0] - 0.9, DG[1] - 0.2, z, 0.3 + deep * 0.45, shade(INK.sand, 0.12), { lw: 0.03 });
      ctx.beginPath(); ctx.ellipse(X, Y, 0.62, 0.31, 0, 0, Math.PI * 2);
      paint(ctx, shade(INK.sand, 0.45), { lw: 0.04 });
      if (Q.detail) plate(ctx, 'x', DG[0] - 1.0, DG[1] - 0.2, z + 0.6 + deep * 0.3, 0.9, 0.3, [['CHINA  7,000 MI', 0.1]], { board: C.white, edge: 0.02 });
      // The kid, cut off at the hole's lip, going down all day.
      ctx.save();
      ctx.beginPath(); ctx.rect(X - 3, Y - 6, 6, 6 - 0.02); ctx.clip();
      person(ctx, DG[0], DG[1] + 0.05, z - 0.3 - deep * 1.4, folk(431, { top: C.coral, hat: 'sun', pose: 'drum', dir: 'r', scale: 0.7 }), t);
      ctx.restore();
      if (!Q.detail) return;
      particles(t, 6, 0.9, (k, r) => {
        const s = r() * 0.6 + 0.4;
        disc(ctx, DG[0] - k * 0.9 * s, DG[1] - k * 0.2, z + 0.4 + Math.sin(k * Math.PI) * 0.9, 0.05, shade(INK.sand, 0.2), { stroke: false });
      }, 3);
    });
    // The dog, far off down the waterline, having the best day anyone has
    // ever had. (Biscuit, on the Sound, is the one who chases gulls.)
    const dogAt = (t) => {
      const L = level(t), u = (t % 16) / 16, run = u < 0.5 ? u * 2 : 2 - u * 2;
      const x = 65.2 + run * 4.4, y = shoreY(x, L) - 0.4 + Math.sin(t * 2.3) * 0.5;
      return { x, y, dir: u < 0.5 ? 1 : -1 };
    };
    R.mover(dogAt, (ctx, t, p) => {
      if (!during(7, 20)(t)) return;
      const z = h(p.x, p.y), [X, Y] = P(p.x, p.y, Math.max(z, level(t)));
      const b = Math.abs(Math.sin(t * 12)) * 0.08, f = p.dir;
      ctx.save(); ctx.translate(X, Y - b); ctx.scale(f, 1);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.06; ctx.lineCap = 'round';
      ctx.beginPath();
      for (const [lx, s] of [[-0.2, 1], [0.2, -1]]) { ctx.moveTo(lx, -0.22); ctx.lineTo(lx + Math.sin(t * 12) * 0.12 * s, 0); }
      ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, -0.3, 0.32, 0.14, 0, 0, Math.PI * 2);
      paint(ctx, C.wood, { lw: 0.03 });
      ctx.beginPath(); ctx.arc(0.33, -0.45, 0.12, 0, Math.PI * 2);
      paint(ctx, C.wood, { lw: 0.03 });
      ctx.beginPath(); ctx.moveTo(-0.3, -0.35); ctx.lineTo(-0.5, -0.55 + Math.sin(t * 18) * 0.08);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.stroke();
      ctx.fillStyle = C.brown; ctx.fillRect(0.28, -0.56, 0.08, 0.14);
      ctx.restore();
    });
    // Asleep on a float, drifting out on the afternoon and brought back in
    // by the tide, still asleep. No lifeguard, as the sign says.
    const FX = 53.4;
    R.mover((t) => {
      const hr = hour(t), L = level(t);
      const d = hr < 18 ? 1.2 + 3.6 * Math.sin((Math.PI * clamp((hr - 10.5) / 7.5))) : -0.7;
      return { x: FX + (hr - 10.5) * 0.12, y: shoreY(FX, L) + d };
    }, (ctx, t, p) => {
      if (!during(10.5, 19.8)(t)) return;
      const L = level(t), z = Math.max(h(p.x, p.y), L) + 0.03 * Math.sin(t * 1.5);
      // An airbed under him, head to toe.
      const [X, Y] = P(p.x, p.y, z + 0.08);
      ctx.beginPath(); ctx.roundRect(X - 2.45, Y - 0.3, 2.75, 0.5, 0.25);
      paint(ctx, C.pink, { lw: 0.04 });
      if (Q.detail) for (let k = 1; k < 5; k++) { ctx.beginPath(); ctx.moveTo(X - 2.45 + k * 0.55, Y - 0.28); ctx.lineTo(X - 2.45 + k * 0.55, Y + 0.18); ctx.strokeStyle = shade(C.pink, 0.25); ctx.lineWidth = 0.03; ctx.stroke(); }
      person(ctx, p.x, p.y, z + 0.28, folk(451, { pose: 'sleep', top: C.teal, style: 'bald' }), t);
    });
    // Sunset: up on the dune, watching the sun go down over the marsh.
    [[54.2, 39.9, 461], [55.1, 40.2, 462], [66.6, 42.3, 463], [58.9, 40.6, 464]].forEach(([x, y, s]) => {
      R.thing(x, y, (ctx) => person(ctx, x, y, h(x, y), folk(s, { pose: 'stand', dir: 'r', back: true }), 0), { anim: true, on: watching });
    });
    // The king tide, after dark: two people come down the path to photograph
    // it, flash, flash, as it comes up the beach to meet them.
    [[PATH - 0.35, 43.6, 471], [PATH + 0.45, 43.9, 472]].forEach(([x, y, s], i) => {
      const look = folk(s, { hold: phone });
      R.mover(() => ({ x, y }), (ctx, t) => {
        if (!during(22.3, 0.9)(t)) return;
        who(ctx, x, y, h(x, y), look, null, { pose: 'point', dir: i ? 'l' : 'r' }, t);
        if (((t + i * 1.3) % 2.6) < 0.18) {
          const [X, Y] = P(x, y, h(x, y) + 1.55);
          glow(ctx, x + (i ? -0.5 : 0.5), y + 0.2, h(x, y) + 1.5, 1.2, C.white, 0.9);
          ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(X + (i ? -0.55 : 0.55), Y, 0.1, 0, Math.PI * 2); ctx.fill();
        }
      });
    });
  },
};
