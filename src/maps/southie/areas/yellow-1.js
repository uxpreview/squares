// The Family: the Yellow House's first floor. Before noon a family moving
// out to the suburbs: boxes everywhere, two kids hiding in them, a mom with a
// label maker who labels everything (the goose too), and a height chart
// pencilled by the kitchen door. After noon a retired couple moving in from
// the suburbs ("We sold the house in Braintree."): a recliner, a crossword,
// and reading glasses nobody can find.
// The hamster is loose all morning, in a different box every time a lid
// pops. After noon the couple find it and keep it (it has a label now).
//
// The whole house is one hand: the helpers the other two floors use (an
// open carton with a peeker, a label-maker tape, a crayon line, a window on
// the back wall with the day's weather in it) are exported from here.
import {
  C, Q, box, rect, disc, face, paint, person, folk, speech, shade, tint, mix, alpha,
  onLeft, P, paintText, chair, table, label,
} from '../../../engine/art.js';
import { route, particles, clamp } from '../../../engine/actors.js';
import { apartment, carton, lettering } from '../kit.js';
import { SIDING, TRIM, ROOM, BRAND, lightsOn } from '../style.js';
import { BEFORE, AFTER, hour, outK, inK, rainK, nightK } from '../clock.js';

// ---------- Shared by the Yellow House's three floors ----------
// The two sides of the day: the old tenants' (dawn to noon) and the new
// ones' (1pm to dawn). Noon to one is the handover: nobody's things.
export const oldSide = (t) => { const h = hour(t); return h >= 5 && h < 12; };
export const newSide = (t) => { const h = hour(t); return h >= 13 || h < 5; };
// Whether it's past hour h today (the night after midnight counts).
export const past = (h) => (t) => { const x = hour(t); return x >= h || x < 5; };

// A moving box whose flaps open (k: 0 shut, 1 wide open), with whoever's
// hiding in it drawn by inside(ctx), cut off at the box's rim so only what's
// above it shows. (x, y) its back corner on the floor.
export function openCarton(ctx, x, y, w, d, h, k, inside, o = {}) {
  const col = o.color || C.woodLight;
  const open = k > 0.03;
  box(ctx, x, y, 0, w, d, h, col, { flat: true, lw: 0.035, top: open ? shade(col, 0.6) : tint(col, 0.12) });
  if (o.word && Q.detail) lettering(ctx, 'x', x + w / 2, y + d + 0.01, h * 0.45, o.word, Math.min(0.26, (w / o.word.length) * 1.5), C.ink);
  if (!open) {
    if (Q.detail) face(ctx, [[x, y + d / 2 - 0.06, h + 0.002], [x + w, y + d / 2 - 0.06, h + 0.002], [x + w, y + d / 2 + 0.06, h + 0.002], [x, y + d / 2 + 0.06, h + 0.002]], tint(C.butter, 0.3), { stroke: false });
    return;
  }
  const a = k * 2.2, hw = w / 2, c = Math.cos(a), s = Math.sin(a);
  // The back flap, then who's inside, then the front flap.
  face(ctx, [[x, y, h], [x, y + d, h], [x + hw * c, y + d, h + hw * s], [x + hw * c, y, h + hw * s]], tint(col, 0.08), { lw: 0.03 });
  if (inside) {
    const l = P(x, y + d, h), b = P(x + w, y + d, h), r = P(x + w, y, h);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(...l); ctx.lineTo(...b); ctx.lineTo(...r); ctx.lineTo(r[0], r[1] - 20); ctx.lineTo(l[0], l[1] - 20);
    ctx.closePath();
    ctx.clip();
    inside(ctx);
    ctx.restore();
  }
  face(ctx, [[x + w, y, h], [x + w, y + d, h], [x + w - hw * c, y + d, h + hw * s], [x + w - hw * c, y, h + hw * s]], shade(col, 0.06), { lw: 0.03 });
}

// How far a lid is open through a peek that runs from t0 for len seconds:
// it pops, stays, and shuts.
export function peekK(p, len) {
  if (p < 0 || p > len) return 0;
  return clamp(Math.min(p / 0.35, (len - p) / 0.5));
}

// A label-maker tape stuck on a face that runs along x (facing the lower
// left) or along y (facing the lower right), centred at (x, y, z).
export function tapeLabel(ctx, along, x, y, z, text, s = 0.2) {
  if (!Q.detail) return;
  const w = text.length * s * 0.66 + 0.16, hh = s * 0.62;
  const q = along === 'x' ? (u, v) => [x + u, y, z + v] : (u, v) => [x, y + u, z + v];
  face(ctx, [q(-w / 2, -hh), q(w / 2, -hh), q(w / 2, hh), q(-w / 2, hh)], C.white, { lw: 0.015 });
  lettering(ctx, along, along === 'x' ? x : x + 0.005, along === 'x' ? y + 0.005 : y, z, text, s, C.ink);
}

// A crayon line on the back wall (x = 0): pts are [y, z].
export function crayon(ctx, pts, color, lw = 0.07) {
  ctx.beginPath();
  pts.forEach(([u, v], i) => { const [X, Y] = P(0, u, v); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.stroke();
}

// The sky through a back window, by the day: pale morning, rain grey, the
// pink evening, navy night. Stepped, so it's baked now and then.
export const skyStep = (t) => Math.round(nightK(t) * 4) * 10 + Math.round(rainK(t) * 3) + (hour(t) > 17.8 && hour(t) < 21 ? 100 : 0);
export function skyAt(t) {
  const n = Math.round(nightK(t) * 4) / 4, r = Math.round(rainK(t) * 3) / 3, h = hour(t);
  let c = mix(tint(C.sky, 0.25), C.grey, r * 0.8);
  if (h > 17.8 && h < 21) c = mix(c, C.pink, 0.45);
  return mix(c, C.night, n);
}
// A window in the back wall (x = 0) from y to y + w, z to z + h: the frame,
// the day's sky in the glass (a back yard's fence and a roof beyond), and
// rain running down it while it rains.
export function backWindow(R, y, z, w, h) {
  R.decor((ctx) => {
    onLeft(ctx, y - 0.2, z - 0.2, w + 0.4, h + 0.4, C.white, { lw: 0.04 });
    onLeft(ctx, y - 0.35, z - 0.34, w + 0.7, 0.16, C.white, { lw: 0.03 });
  });
  R.decor((ctx, t) => {
    const sky = skyAt(t), n = nightK(t);
    onLeft(ctx, y, z, w, h, sky, { lw: 0.03 });
    // The next house over, and a lit window in it after dark.
    onLeft(ctx, y, z, w * 0.55, h * 0.45, mix(tint(C.grey, 0.2), C.night, n * 0.55), { stroke: false });
    if (n > 0.3) onLeft(ctx, y + w * 0.15, z + h * 0.12, w * 0.18, h * 0.18, C.butter, { stroke: false });
    face(ctx, [[0, y + w / 2, z], [0, y + w / 2, z + h]], null, { lw: 0.08, stroke: C.white });
    face(ctx, [[0, y, z + h / 2], [0, y + w, z + h / 2]], null, { lw: 0.08, stroke: C.white });
  }, { anim: true, step: skyStep });
  // The rain on the glass (a thing just off the wall, so it doesn't stop the
  // room's flat layers being cached).
  R.thing(0.02, y + w, (ctx, t) => {
    const k = rainK(t);
    if (k < 0.05 || !Q.detail) return;
    ctx.strokeStyle = alpha(C.white, 0.7); ctx.lineWidth = 0.035; ctx.lineCap = 'round';
    particles(t, Math.round(6 * k) + 2, 1.4, (a, r) => {
      const u = y + 0.1 + r() * (w - 0.2), v = z + h - 0.1 - a * (h - 0.2);
      const [X0, Y0] = P(0.01, u, v), [X1, Y1] = P(0.01, u, v - 0.22);
      ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1); ctx.stroke();
    }, Math.round(y * 10));
  }, { anim: true });
}

// A little talk bubble that comes and goes: lines said in turn, each for
// `on` seconds out of every `every`.
export function says(ctx, x, y, z, t, lines, every = 7, on = 3.2, off = 0) {
  const tt = t + off, i = Math.floor(tt / every), p = tt - i * every;
  if (p > on || !Q.detail) return;
  speech(ctx, x, y, z, lines[i % lines.length], { size: 0.4 });
}

// A hamster, about 0.45 long, at (x, y, z). o: { dir, look (0..1 turned to
// the other side), cheeks (stuffed) }.
const FUR = mix(C.mustard, C.wood, 0.45);
export function hamster(ctx, x, y, z, t, o = {}) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(o.dir === 'l' ? -1 : 1, 1);
  const s = o.scale || 1;
  ctx.scale(s, s);
  const twitch = Math.sin(t * 22) > 0.6 ? 0.012 : 0;
  ctx.beginPath(); ctx.ellipse(0, -0.2, 0.27, 0.2, 0, 0, Math.PI * 2);
  paint(ctx, FUR, { lw: 0.035 });
  ctx.beginPath(); ctx.ellipse(0.08, -0.14, 0.14, 0.1, 0, 0, Math.PI * 2);
  ctx.fillStyle = C.white; ctx.fill();
  // Ears, eye, nose, cheeks.
  for (const ex of [-0.02, 0.12]) { ctx.beginPath(); ctx.arc(ex, -0.37, 0.065, 0, Math.PI * 2); paint(ctx, C.pink, { lw: 0.025 }); }
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0.15, -0.25, 0.03, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.pink; ctx.beginPath(); ctx.arc(0.27, -0.21 + twitch, 0.028, 0, Math.PI * 2); ctx.fill();
  if (o.cheeks) { ctx.beginPath(); ctx.arc(0.17, -0.13, 0.08, 0, Math.PI * 2); paint(ctx, tint(FUR, 0.3), { lw: 0.02 }); }
  if (Q.detail) {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.012;
    ctx.beginPath();
    ctx.moveTo(0.25, -0.2 + twitch); ctx.lineTo(0.4, -0.25);
    ctx.moveTo(0.25, -0.19 + twitch); ctx.lineTo(0.41, -0.17);
    ctx.stroke();
  }
  ctx.restore();
}

// A small dog (a beagle, more or less), at (x, y, z), facing dir. o: { sniff,
// wag }.
export function dog(ctx, x, y, z, t, o = {}) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(o.dir === 'l' ? -1 : 1, 1);
  if (Q.detail) { ctx.beginPath(); ctx.ellipse(0, 0, 0.45, 0.14, 0, 0, Math.PI * 2); ctx.fillStyle = alpha(C.ink, 0.15); ctx.fill(); }
  const run = o.run ? Math.sin(t * 16) * 0.12 : 0;
  ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.lineCap = 'round';
  ctx.beginPath();
  for (const [lx, sw] of [[-0.25, run], [-0.15, -run], [0.2, -run], [0.3, run]]) { ctx.moveTo(lx, -0.3); ctx.lineTo(lx + sw, 0); }
  ctx.stroke();
  const wag = Math.sin(t * (o.wag ? 18 : 3)) * 0.25;
  ctx.beginPath(); ctx.moveTo(-0.34, -0.42); ctx.lineTo(-0.52 + wag * 0.3, -0.72 + Math.abs(wag) * 0.2);
  ctx.lineWidth = 0.08; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -0.42, 0.4, 0.17, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.035 });
  ctx.beginPath(); ctx.ellipse(-0.1, -0.5, 0.2, 0.1, 0, 0, Math.PI * 2); ctx.fillStyle = C.brown; ctx.fill();
  const dip = o.sniff ? 0.22 + Math.sin(t * 9) * 0.03 : 0;
  ctx.beginPath(); ctx.arc(0.4, -0.62 + dip, 0.16, 0, Math.PI * 2); paint(ctx, C.wood, { lw: 0.035 });
  ctx.beginPath(); ctx.ellipse(0.56, -0.58 + dip, 0.1, 0.07, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.025 });
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0.65, -0.6 + dip, 0.035, 0, Math.PI * 2); ctx.arc(0.45, -0.66 + dip, 0.025, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0.32, -0.55 + dip, 0.07, 0.15, 0.2, 0, Math.PI * 2); paint(ctx, C.brown, { lw: 0.025 });
  ctx.restore();
}

// A sofa, its back along y (against the hall side) and facing +y, from
// (x, y), w long along x.
export function sofa(ctx, x, y, w, color, o = {}) {
  const d = o.d || 1.2;
  box(ctx, x, y, 0, w, d, 0.5, shade(color, 0.12), { lw: 0.04 });
  box(ctx, x + 0.25, y + 0.3, 0.5, w - 0.5, d - 0.3, 0.22, tint(color, 0.08), { lw: 0.03 });
  if (Q.detail) face(ctx, [[x + w / 2, y + 0.3, 0.721], [x + w / 2, y + d, 0.721]], null, { lw: 0.03, stroke: shade(color, 0.35) });
  box(ctx, x, y, 0.5, w, 0.32, 0.75, color, { lw: 0.04 });
  box(ctx, x, y + 0.3, 0.5, 0.26, d - 0.3, 0.4, color, { lw: 0.035 });
  box(ctx, x + w - 0.26, y + 0.3, 0.5, 0.26, d - 0.3, 0.4, color, { lw: 0.035 });
}

// A clear plastic cover over a lampshade or a chair (the suburbs' finest).
export function plastic(ctx, pts) {
  face(ctx, pts, alpha(C.white, 0.35), { lw: 0.02, stroke: alpha(C.ink, 0.5) });
}

// ---------- The Family ----------
// The hamster's four boxes (their back corners), a different one every twenty
// seconds. One is nudged a unit back from the greybox's, off the spot where
// the movers on the clock stop in the middle room.
const BOXES = [[4.6, 2.6], [6.8, 5.2], [2.2, 6.6], [9.6, 6.4]];
const HAM = 20; // seconds in each box
const hamster0 = (t) => { const [x, y] = BOXES[Math.floor(t / HAM) % BOXES.length]; return [x + 0.5, y + 0.5, 1.1]; };
// A lid pops, the hamster looks out, ducks, the lid shuts; it's in the next
// box by the time that one pops.
const lidK = (t) => peekK((t % HAM) - 0.6, 15);
const upK = (t) => clamp(Math.min(((t % HAM) - 0.9) / 0.4, (15.1 - (t % HAM)) / 0.4));

// The kids' boxes: [x, y, size, when their peek starts in a 17s or 23s round].
const KIDS = [
  { x: 5.1, y: 6.9, w: 1.25, h: 1.15, every: 17, off: 3, look: folk(44, { style: 'pony', hair: C.red, top: C.pink, scale: 0.68 }), word: 'TOYS' },
  { x: 11.0, y: 3.3, w: 1.25, h: 1.15, every: 23, off: 11, look: folk(46, { style: 'short', top: C.green, hat: 'cap', scale: 0.66 }), word: 'BOOKS' },
];

export default {
  id: 'yellow-1',
  name: 'The Family',
  blurb: 'Moving out to the suburbs, moving in from the suburbs. The hamster has not decided.',
  size: [15, 9],
  build(R) {
    const W = ROOM['yellow-1'];
    apartment(R, { floor: 0, walls: W, floorInk: W.floor, siding: SIDING.yellow, trim: TRIM.yellow, label: 'Yellow House' });
    const old = oldSide, neu = newSide;

    // ---------- The floor and the walls ----------
    R.floor((ctx) => {
      if (!Q.detail) return;
      // Floorboards, and the lino in the kitchen.
      ctx.save(); ctx.globalAlpha *= 0.25;
      for (let y = 2.6; y < 9; y += 0.6) face(ctx, [[4.2, y, 0.004], [12.5, y, 0.004], [12.5, y + 0.03, 0.004], [4.2, y + 0.03, 0.004]], C.brown, { stroke: false });
      ctx.restore();
      rect(ctx, 0.02, 2.02, 4.1, 6.96, 0.005, tint(C.butter, 0.55), { stroke: false });
      for (let i = 0; i < 6; i++) for (let j = 0; j < 10; j++) if ((i + j) % 2) rect(ctx, 0.02 + i * 0.68, 2.02 + j * 0.696, 0.68, 0.696, 0.006, tint(C.coral, 0.55), { stroke: false });
      // Paler squares where the old rugs and the piano sat for twenty years.
    });
    R.rug((ctx) => {
      rect(ctx, 8.9, 4.9, 3.1, 1.2, 0.008, alpha(tint(C.wood, 0.4), 0.8), { stroke: false });
    }, { on: (t) => !old(t) || outK(t) > 0.6 });

    R.decor((ctx) => {
      // A picture rail, and the ghosts of the family photos (the photos are
      // packed; the nails are still up).
      onLeft(ctx, 0, 3.7, 9, 0.1, tint(C.white, 0.2), { stroke: false });
      if (!Q.detail) return;
      ctx.save(); ctx.globalAlpha *= 0.3;
      onLeft(ctx, 2.4, 1.7, 0.7, 0.9, tint(C.white, 0.5), { stroke: false });
      ctx.restore();
    });

    // The crayon drawing of the house, taped over the sink: the yellow house,
    // three porches, the family of four and the hamster, a big sun. It stays
    // up all day (the retired couple leave it where it is).
    R.decor((ctx) => {
      const y0 = 4.08, z0 = 1.62, w = 1.08, h = 0.82;
      onLeft(ctx, y0, z0, w, h, C.white, { lw: 0.03 });
      if (!Q.detail) return;
      // The house.
      onLeft(ctx, y0 + 0.28, z0 + 0.14, 0.42, 0.58, alpha(C.mustard, 0.9), { stroke: false });
      crayon(ctx, [[y0 + 0.28, z0 + 0.14], [y0 + 0.28, z0 + 0.72], [y0 + 0.7, z0 + 0.72], [y0 + 0.7, z0 + 0.14]], C.brown, 0.03);
      for (const zz of [0.3, 0.47, 0.62]) {
        crayon(ctx, [[y0 + 0.35, z0 + zz], [y0 + 0.44, z0 + zz]], C.sky, 0.05);
        crayon(ctx, [[y0 + 0.54, z0 + zz], [y0 + 0.63, z0 + zz]], C.sky, 0.05);
      }
      crayon(ctx, [[y0 + 0.44, z0 + 0.14], [y0 + 0.44, z0 + 0.24], [y0 + 0.52, z0 + 0.24], [y0 + 0.52, z0 + 0.14]], C.red, 0.04);
      // The sun, the grass, the family (and the hamster).
      crayon(ctx, [[y0 + 0.9, z0 + 0.66], [y0 + 0.9, z0 + 0.67]], C.mustard, 0.16);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; crayon(ctx, [[y0 + 0.9 + Math.cos(a) * 0.1, z0 + 0.66 + Math.sin(a) * 0.1], [y0 + 0.9 + Math.cos(a) * 0.16, z0 + 0.66 + Math.sin(a) * 0.16]], C.mustard, 0.025); }
      crayon(ctx, [[y0 + 0.05, z0 + 0.12], [y0 + 0.3, z0 + 0.15], [y0 + 0.6, z0 + 0.1], [y0 + 1.02, z0 + 0.13]], C.green, 0.05);
      [[0.1, 0.24, C.teal], [0.18, 0.2, C.coral], [0.8, 0.17, C.pink], [0.92, 0.16, C.green]].forEach(([u, hh, col]) => {
        crayon(ctx, [[y0 + u, z0 + 0.13], [y0 + u, z0 + 0.13 + hh]], col, 0.03);
        crayon(ctx, [[y0 + u, z0 + 0.17 + hh], [y0 + u, z0 + 0.18 + hh]], C.ink, 0.07);
      });
      crayon(ctx, [[y0 + 1.0, z0 + 0.14], [y0 + 1.02, z0 + 0.14]], FUR, 0.07);
      // Four bits of tape at the corners.
      for (const [u, v] of [[0, 0], [w, 0], [0, h], [w, h]]) onLeft(ctx, y0 + u - 0.07, z0 + v - 0.05, 0.14, 0.1, alpha(tint(C.butter, 0.5), 0.9), { stroke: false });
    });

    // The back door, and the height chart pencilled on its frame: two kids
    // climbing it, year by year, and one hopeful mark for Dad.
    R.decor((ctx) => {
      onLeft(ctx, 6.95, 0, 1.4, 3.3, C.white, { lw: 0.035 });
      onLeft(ctx, 7.1, 0, 1.1, 3.15, shade(C.teal, 0.1), { lw: 0.035 });
      if (Q.detail) {
        onLeft(ctx, 7.25, 1.7, 0.8, 1.2, tint(C.sky, 0.3), { lw: 0.025 });
        onLeft(ctx, 7.25, 0.3, 0.8, 1.1, shade(C.teal, 0.2), { lw: 0.02 });
        const [kx, ky] = P(0, 8.05, 1.55); ctx.beginPath(); ctx.arc(kx, ky, 0.07, 0, Math.PI * 2); paint(ctx, C.mustard, { lw: 0.02 });
      }
      if (!Q.detail) return;
      const pencil = alpha(C.ink, 0.75);
      const marks = [['LEO 2', 1.02], ['MIA 3', 1.28], ['LEO 4', 1.44], ['MIA 5', 1.62], ['LEO 6', 1.78], ['MIA 7', 1.98], ['MIA 8!', 2.12], ['DAD?', 3.0]];
      for (const [name, z] of marks) {
        crayon(ctx, [[8.28, z], [8.5, z]], pencil, 0.025);
        paintText(ctx, 'left', 8.74, z + 0.02, name, 0.13, pencil, 'Rethink Sans');
      }
    });
    // After noon: a new mark at the very bottom.
    R.thing(0.01, 8.6, (ctx) => {
      if (!Q.detail) return;
      crayon(ctx, [[8.28, 0.28], [8.46, 0.28]], alpha(C.coral, 0.9), 0.03);
      paintText(ctx, 'left', 8.72, 0.3, 'PEANUT', 0.12, C.coral, 'Rethink Sans');
    }, { on: neu });

    // ---------- The kitchen (along the back wall) ----------
    // The fridge, covered in magnets (and, before noon, a label).
    R.thing(1.2, 3.3, (ctx) => {
      box(ctx, 0.05, 2.15, 0, 1.15, 1.15, 3.0, tint(C.butter, 0.5), { lw: 0.045 });
      face(ctx, [[1.2, 2.2, 1.9], [1.2, 3.3, 1.9]], null, { lw: 0.04 });
      box(ctx, 1.2, 3.1, 1.2, 0.08, 0.1, 0.6, C.greyLight, { flat: true, lw: 0.02 });
      box(ctx, 1.2, 3.1, 2.1, 0.08, 0.1, 0.5, C.greyLight, { flat: true, lw: 0.02 });
      if (Q.detail) for (const [u, v, c] of [[2.4, 2.6, C.coral], [2.7, 2.3, C.teal], [2.5, 1.4, C.mustard], [2.9, 0.9, C.pink]]) {
        face(ctx, [[1.21, u, v], [1.21, u + 0.14, v], [1.21, u + 0.14, v + 0.12], [1.21, u, v + 0.12]], c, { lw: 0.015 });
      }
    });
    R.thing(1.3, 3.3, (ctx) => tapeLabel(ctx, 'y', 1.21, 2.72, 2.72, 'FRIDGE'), { on: old });
    // A decoy on the fridge: a dinosaur, also in crayon.
    R.thing(1.25, 3.1, (ctx) => {
      if (!Q.detail) return;
      face(ctx, [[1.215, 2.35, 0.55], [1.215, 3.05, 0.55], [1.215, 3.05, 1.05], [1.215, 2.35, 1.05]], C.white, { lw: 0.02 });
      const q = (u, v) => P(1.22, 2.35 + u, 0.55 + v);
      ctx.beginPath(); ctx.moveTo(...q(0.08, 0.1)); ctx.lineTo(...q(0.2, 0.28)); ctx.lineTo(...q(0.45, 0.3)); ctx.lineTo(...q(0.55, 0.42)); ctx.lineTo(...q(0.62, 0.38)); ctx.lineTo(...q(0.5, 0.22)); ctx.lineTo(...q(0.42, 0.1));
      ctx.strokeStyle = C.green; ctx.lineWidth = 0.05; ctx.stroke();
    }, { on: old });
    // The counter and the sink; the stove.
    R.thing(1.1, 5.9, (ctx) => {
      box(ctx, 0, 3.3, 0, 1.1, 2.6, 1.15, C.white, { lw: 0.04, top: tint(C.teal, 0.55) });
      if (Q.detail) {
        for (const u of [3.95, 4.9]) face(ctx, [[1.1, u, 0.15], [1.1, u, 1.0]], null, { lw: 0.025 });
        for (const u of [3.62, 4.5, 5.5]) box(ctx, 1.1, u, 0.85, 0.04, 0.2, 0.06, C.ink, { flat: true, stroke: false });
      }
      rect(ctx, 0.2, 4.25, 0.7, 0.8, 1.151, shade(C.greyLight, 0.15), { lw: 0.025 });
      rect(ctx, 0.28, 4.33, 0.54, 0.64, 1.152, shade(C.grey, 0.2), { stroke: false });
      box(ctx, 0.05, 4.6, 1.15, 0.12, 0.08, 0.5, C.greyLight, { flat: true, lw: 0.02 });
      box(ctx, 0.05, 4.6, 1.6, 0.4, 0.08, 0.08, C.greyLight, { flat: true, lw: 0.02 });
    });
    R.thing(1.1, 7.0, (ctx) => {
      box(ctx, 0, 5.9, 0, 1.1, 1.05, 1.15, C.white, { lw: 0.04, top: shade(C.white, 0.08) });
      if (Q.detail) {
        for (const [u, v] of [[6.15, 0.3], [6.65, 0.3], [6.15, 0.75], [6.65, 0.75]]) disc(ctx, v + 0.05, u, 1.152, 0.17, C.ink, { stroke: false });
        face(ctx, [[1.1, 6.05, 0.2], [1.1, 6.8, 0.2], [1.1, 6.8, 0.8], [1.1, 6.05, 0.8]], shade(C.greyLight, 0.1), { lw: 0.025 });
      }
      box(ctx, 0, 5.9, 1.15, 0.12, 1.05, 0.25, C.white, { flat: true, lw: 0.03 });
    });
    backWindow(R, 5.95, 1.95, 0.95, 1.3);
    // The family's last things on the counter (before noon), the couple's
    // kettle and their pills organizer (after).
    R.thing(0.9, 5.7, (ctx) => {
      box(ctx, 0.2, 5.25, 1.15, 0.5, 0.35, 0.32, C.red, { flat: true, lw: 0.025 });
      if (Q.detail) lettering(ctx, 'x', 0.45, 5.61, 1.3, 'GANDER', 0.1, BRAND.ink);
      box(ctx, 0.3, 3.6, 1.15, 0.28, 0.28, 0.3, C.coral, { flat: true, lw: 0.025 });
    }, { on: old });
    R.thing(0.9, 5.7, (ctx) => {
      box(ctx, 0.25, 3.5, 1.15, 0.45, 0.45, 0.4, C.greyLight, { flat: true, lw: 0.025, top: C.grey });
      box(ctx, 0.3, 5.2, 1.15, 0.7, 0.25, 0.08, C.purple, { flat: true, lw: 0.02 });
      if (Q.detail) lettering(ctx, 'x', 0.65, 5.46, 1.19, 'S M T W T F S', 0.06, C.white);
    }, { on: neu });

    // ---------- Before noon: boxes everywhere ----------
    // Stacks that the movers take down a bit at a time through the morning.
    const stack = (x, y, words, gone, color) => R.thing(x + 0.95, y + 0.75, (ctx) => {
      let z = 0;
      words.forEach((w, i) => {
        const bw = 0.95 - (i % 2) * 0.08, bh = 0.62;
        carton(ctx, x + (i % 2) * 0.04, y, z, bw, 0.75, bh, w);
        if (color && i === 0) box(ctx, x + bw - 0.3, y + 0.75, z + 0.1, 0.25, 0.01, 0.12, color, { flat: true, stroke: false });
        z += bh;
      });
    }, { on: (t) => old(t) && outK(t) < gone });
    stack(3.0, 3.0, ['KITCHEN', 'KITCHEN?', 'PANS'], 0.8);
    stack(8.6, 4.3, ['MIA', 'LEO', 'MISC'], 0.97);
    stack(11.4, 5.1, ['LIVING', 'MORE LIVING'], 0.9);
    stack(8.2, 7.9, ['SHOES'], 1.01);
    stack(3.3, 7.6, ['DISHES', 'DISHES'], 0.85);
    // The family's labels, on everything.
    R.thing(1.12, 4.6, (ctx) => tapeLabel(ctx, 'y', 1.105, 4.6, 0.55, 'SINK'), { on: old });
    R.thing(0.02, 2.1, (ctx) => tapeLabel(ctx, 'x', 1.6, 0.01, 2.6, 'WALL'), { on: old });
    // A rolled-up rug, and the kids' scooter waiting on the porch.
    R.thing(12.2, 7.2, (ctx) => {
      box(ctx, 9.6, 7.8, 0, 2.4, 0.5, 0.5, C.coral, { flat: true, lw: 0.035, top: tint(C.coral, 0.2) });
      if (Q.detail) for (const u of [10.2, 11.4]) box(ctx, u, 7.78, 0, 0.08, 0.54, 0.52, C.ink, { flat: true, stroke: false });
    }, { on: (t) => old(t) && outK(t) < 0.92 });
    R.thing(14.2, 3.4, (ctx) => {
      box(ctx, 13.2, 3.1, 0.15, 1.2, 0.18, 0.06, C.pink, { flat: true, lw: 0.025 });
      box(ctx, 14.3, 3.12, 0.15, 0.06, 0.12, 1.05, C.ink, { flat: true, stroke: false });
      box(ctx, 14.1, 2.9, 1.15, 0.06, 0.55, 0.06, C.ink, { flat: true, stroke: false });
      for (const u of [13.3, 14.3]) disc(ctx, u, 3.19, 0.08, 0.12, C.ink, { stroke: false });
    }, { on: old });

    // The hamster's boxes, each popping open in turn.
    BOXES.forEach(([x, y], i) => {
      R.thing(x + 1, y + 1, (ctx, t) => {
        const mine = Math.floor(t / HAM) % BOXES.length === i;
        const k = mine ? lidK(t) : 0;
        openCarton(ctx, x, y, 1, 1, 1, k, (c) => {
          const u = upK(t), look = Math.floor((t % HAM) / 2.2) % 2;
          hamster(c, x + 0.55, y + 0.5, 0.52 + u * 0.4, t, { dir: look ? 'l' : 'r', cheeks: (t % HAM) > 9 });
        }, { word: ['CRAFTS', 'LEGO', 'BATH', 'TOYS 2'][i] });
      }, { anim: true, on: old });
    });
    // The kids: hiding in boxes, popping up to shout, ducking back down.
    for (const kid of KIDS) {
      R.thing(kid.x + kid.w, kid.y + kid.w, (ctx, t) => {
        const p = (t + kid.off) % kid.every;
        const k = peekK(p - 1, 6);
        openCarton(ctx, kid.x, kid.y, kid.w, kid.w, kid.h, k, (c) => {
          const u = clamp(Math.min((p - 1.3) / 0.3, (6.5 - p) / 0.3));
          const cheer = p > 2.2 && p < 3.6;
          person(c, kid.x + kid.w / 2, kid.y + kid.w / 2, kid.h - 1.45 + u * (cheer ? 0.85 : 0.45), { ...kid.look, pose: cheer ? 'cheer' : 'stand', dir: 'r' }, t);
          if (cheer) speech(c, kid.x + kid.w / 2, kid.y + kid.w / 2, kid.h + 1.4, 'BOO!', { size: 0.4 });
        }, { word: kid.word });
      }, { anim: true, on: old });
    }

    // The dog, who always knows which box the hamster's in: nose to it while
    // the lid's open, off to the next one before it pops.
    const SNIFF = [[5.2, 4.15], [7.3, 6.75], [3.65, 7.15], [11.05, 6.95]];
    R.mover((t) => {
      if (!old(t)) return { x: -99, y: -99 };
      const i = Math.floor(t / HAM) % 4, p = t % HAM, [ax, ay] = SNIFF[i], [bx, by] = SNIFF[(i + 1) % 4];
      if (p < 16) return { x: ax, y: ay, dir: 'l', sniff: p > 1, wag: p > 1 && p < 15, bark: p > 1.2 && p < 3 };
      const k = (p - 16) / 4;
      return { x: ax + (bx - ax) * k, y: ay + (by - ay) * k, dir: (bx - ax) - (by - ay) >= 0 ? 'r' : 'l', run: true };
    }, (ctx, t, p) => {
      if (p.x < -50) return;
      dog(ctx, p.x, p.y, 0, t, p);
      if (p.bark && Q.detail) speech(ctx, p.x, p.y, 1.5, 'Woof!', { size: 0.34 });
    });
    // Mom and the label maker. She labels everything, in turn.
    const LABELS = ['KITCHEN', 'BOX', 'FRAGILE?', 'HAMSTER?', 'KIDS (2)', 'GOOSE', 'DAD'];
    const momAt = route([[2.3, 4.6, 5], [3.6, 6.2, 4], [7.4, 7.3, 5], [8.1, 6.4, 4], [5.0, 5.2, 3]], { speed: 1.1 });
    const mom = folk(43, { style: 'bun', hair: HAIR_BROWN, top: C.teal, bottom: C.navy, dress: false });
    R.mover((t) => (old(t) ? momAt(t) : { x: -99, y: -99 }), (ctx, t, p) => {
      if (p.x < -50) return;
      const printing = !p.moving;
      person(ctx, p.x, p.y, 0, {
        ...mom, pose: p.moving ? 'walk' : 'point', dir: p.dir, back: p.back, phase: p.phase,
        hold: (c) => {
          c.beginPath(); c.roundRect(-0.06, -0.14, 0.3, 0.2, 0.05); paint(c, C.coral, { lw: 0.025 });
          if (printing) { const n = ((t * 0.8) % 1) * 0.35; c.fillStyle = C.white; c.fillRect(0.24, -0.08, n, 0.07); }
        },
      }, t);
      if (printing) says(ctx, p.x, p.y, 2.6, t, LABELS, 4.5, 2.4);
    });
    // The friend who said he'd help: on a box, on his third slice.
    R.thing(10.9, 8.5, (ctx) => carton(ctx, 10.2, 7.95, 0, 0.9, 0.6, 0.55, 'MISC'), { on: old });
    R.mover((t) => (old(t) ? { x: 10.65, y: 8.25 } : { x: -99, y: -99 }), (ctx, t, p) => {
      if (p.x < -50) return;
      const bite = Math.sin(t * 1.3) > 0.4;
      person(ctx, p.x, p.y, -0.12, {
        ...folk(48, { style: 'short', top: C.red, hat: 'cap' }), pose: 'sit', dir: 'r',
        arms: [bite ? 2.6 : 1.1, 0.5],
        hold: (c) => { if (!bite) return; c.beginPath(); c.moveTo(0, 0); c.lineTo(0.35, -0.12); c.lineTo(0.3, 0.1); c.closePath(); paint(c, C.mustard, { lw: 0.02 }); },
      }, t);
      says(ctx, p.x, p.y, 2.4, t, ['I\'m helping.', 'Is there more pizza?'], 11, 3, 5);
    }, { bias: 0.4 });
    R.thing(11.6, 8.6, (ctx) => {
      box(ctx, 11.2, 8.2, 0, 1.05, 1.05, 0.12, C.white, { flat: true, lw: 0.03 });
      if (Q.detail) lettering(ctx, 'x', 11.72, 9.26, 0.06, 'PIZZA', 0.1, C.red);
    }, { on: old });

    // ---------- Noon: empty (the hamster has the place to itself) ----------
    R.mover((t) => {
      const h = hour(t);
      if (h < 12 || h >= 13) return { x: -99, y: -99 };
      const k = (h - 12) * 4;
      return { x: 6 + Math.sin(k * 2.3) * 2.2, y: 5.6 + Math.cos(k * 1.7) * 1.6, dir: Math.cos(k * 2.3) > 0 ? 'r' : 'l' };
    }, (ctx, t, p) => { if (p.x > -50) hamster(ctx, p.x, p.y, 0, t, { dir: p.dir }); });
    R.thing(3.9, 8.8, (ctx) => {
      box(ctx, 3.9, 8.6, 0, 0.06, 0.06, 2.6, C.wood, { flat: true, stroke: false });
      box(ctx, 3.7, 8.45, 0, 0.5, 0.35, 0.35, C.mustard, { flat: true, lw: 0.025 });
    }, { on: (t) => { const h = hour(t); return h >= 12 && h < 14.5; } });

    // ---------- After noon: the retired couple ----------
    // Their boxes, arriving and then unpacked a few at a time.
    const theirs = (x, y, words, until) => R.thing(x + 0.9, y + 0.7, (ctx) => {
      let z = 0;
      for (const w of words) { carton(ctx, x, y, z, 0.9, 0.7, 0.6, w); z += 0.6; }
    }, { on: (t) => neu(t) && inK(t) < until });
    theirs(5.0, 6.8, ['BRAINTREE', 'BRAINTREE'], 0.55);
    theirs(3.2, 7.7, ['TUPPERWARE', '(ALL OF IT)'], 0.85);
    theirs(8.4, 7.9, ['FRAGILE'], 0.4);
    // The kitchen table, the hamster's new cage on it (with a label), the
    // teapot, a dish of peppermints.
    R.thing(3.4, 6.2, (ctx) => {
      chair(ctx, 1.35, 5.0, 0, C.wood, 'r');
      table(ctx, 1.85, 4.55, 1.5, 1.5, 1.15, C.woodLight);
      chair(ctx, 2.2, 6.1, 0, C.wood, 'l');
    }, { on: neu });
    R.thing(3.5, 6.3, (ctx) => {
      disc(ctx, 3.0, 5.7, 1.16, 0.2, C.coral, { lw: 0.02 });
      if (Q.detail) for (const [u, v] of [[2.95, 5.65], [3.05, 5.72], [3.0, 5.62]]) disc(ctx, u, v, 1.2, 0.05, C.red, { lw: 0.012, stroke: C.white });
    }, { on: neu });
    R.thing(3.6, 6.4, (ctx, t) => {
      // The cage, its wheel going round.
      const x = 1.95, y = 4.65, w = 1.0, d = 0.7, h = 0.65, z = 1.15;
      box(ctx, x, y, z, w, d, 0.12, C.teal, { flat: true, lw: 0.025 });
      if (Q.detail) {
        const [cx, cy] = P(x + 0.35, y + 0.35, z + 0.4);
        ctx.beginPath(); ctx.arc(cx, cy, 0.3, 0, Math.PI * 2); ctx.strokeStyle = C.coral; ctx.lineWidth = 0.05; ctx.stroke();
        const a = t * 5;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) { const b = a + (i * Math.PI) / 2; ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(b) * 0.3, cy + Math.sin(b) * 0.3); }
        ctx.lineWidth = 0.02; ctx.stroke();
        hamster(ctx, x + 0.4, y + 0.4, z + 0.12, t, { dir: 'r', scale: 0.7 });
        ctx.strokeStyle = alpha(C.ink, 0.6); ctx.lineWidth = 0.015; ctx.beginPath();
        for (let u = 0; u <= w; u += 0.1) { const [a0, b0] = P(x + u, y + d, z + 0.12), [a1, b1] = P(x + u, y + d, z + h); ctx.moveTo(a0, b0); ctx.lineTo(a1, b1); }
        for (let u = 0; u <= d; u += 0.1) { const [a0, b0] = P(x + w, y + u, z + 0.12), [a1, b1] = P(x + w, y + u, z + h); ctx.moveTo(a0, b0); ctx.lineTo(a1, b1); }
        ctx.stroke();
      }
      face(ctx, [[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], alpha(C.teal, 0.25), { lw: 0.025 });
      tapeLabel(ctx, 'x', x + w / 2, y + d + 0.005, z + 0.07, 'PEANUT', 0.1);
    }, { anim: true, on: neu });
    // The teapot, steaming.
    R.thing(3.6, 6.35, (ctx, t) => {
      const [X, Y] = P(2.35, 5.75, 1.15);
      ctx.beginPath(); ctx.ellipse(X, Y - 0.22, 0.22, 0.2, 0, 0, Math.PI * 2); paint(ctx, C.pink, { lw: 0.025 });
      if (!Q.detail) return;
      ctx.fillStyle = alpha(C.white, 0.7);
      particles(t, 4, 2.2, (k, r) => {
        ctx.beginPath(); ctx.arc(X + 0.25 + Math.sin(k * 5 + r() * 6) * 0.08, Y - 0.4 - k * 0.9, 0.05 + k * 0.08, 0, Math.PI * 2);
        ctx.globalAlpha = 1 - k; ctx.fill(); ctx.globalAlpha = 1;
      }, 5);
    }, { anim: true, on: neu });

    // The sofa (the glasses are on it), the recliner, a lamp with the
    // plastic still on its shade, a doily.
    R.thing(11.6, 4.2, (ctx) => {
      sofa(ctx, 9.2, 3.0, 2.4, C.teal);
      if (Q.detail) for (const u of [9.3, 11.35]) rect(ctx, u, 3.35, 0.2, 0.8, 0.905, C.white, { lw: 0.015 });
    }, { on: neu });
    // The reading glasses, alone on the seat's left end: two round lenses,
    // a bridge, the arms folded, in tortoiseshell.
    const GLX = 9.78, GLY = 3.75, GLZ = 0.735;
    R.thing(11.7, 4.3, (ctx) => {
      const z = GLZ, frame = (w) => {
        ctx.strokeStyle = C.brown; ctx.lineWidth = w; ctx.stroke();
        if (Q.detail) { ctx.save(); ctx.setLineDash([0.035, 0.05]); ctx.strokeStyle = shade(C.brown, 0.5); ctx.stroke(); ctx.restore(); }
      };
      // The folded arms, behind the lenses.
      for (const u of [GLX - 0.26, GLX + 0.26]) { const [e, f] = P(u, GLY - 0.02, z + 0.02), [g, h] = P(u + 0.02, GLY - 0.34, z + 0.05); ctx.beginPath(); ctx.moveTo(e, f); ctx.lineTo(g, h); frame(0.05); }
      for (const u of [GLX - 0.22, GLX + 0.22]) {
        const [X, Y] = P(u, GLY, z);
        ctx.beginPath(); ctx.ellipse(X, Y, 0.21, 0.17, 0, 0, Math.PI * 2);
        ctx.fillStyle = alpha(tint(C.sky, 0.55), 0.85); ctx.fill();
        frame(0.065);
        if (Q.detail) { ctx.beginPath(); ctx.arc(X - 0.07, Y - 0.06, 0.04, 0, Math.PI * 2); ctx.fillStyle = C.white; ctx.fill(); }
      }
      const [a, b] = P(GLX - 0.05, GLY, z + 0.03), [c, d] = P(GLX + 0.05, GLY, z + 0.03);
      ctx.beginPath(); ctx.moveTo(a, b); ctx.quadraticCurveTo((a + c) / 2, (b + d) / 2 - 0.06, c, d); frame(0.05);
    }, { on: neu });
    const recliner = (ctx) => {
      const x = 10.0, y = 6.3, col = C.brown;
      box(ctx, x, y, 0, 1.3, 1.25, 0.5, shade(col, 0.1), { lw: 0.04 });
      box(ctx, x + 1.3, y + 0.2, 0.25, 0.8, 0.85, 0.22, col, { lw: 0.035 });
      box(ctx, x + 0.3, y + 0.2, 0.5, 1.0, 0.85, 0.2, tint(col, 0.15), { lw: 0.03 });
      box(ctx, x, y, 0.5, 0.35, 1.25, 1.4, col, { lw: 0.04 });
      box(ctx, x + 0.3, y, 0.5, 1.0, 0.22, 0.55, col, { lw: 0.035 });
      box(ctx, x + 0.3, y + 1.03, 0.5, 1.0, 0.22, 0.55, col, { lw: 0.035 });
    };
    R.thing(11.4, 7.55, recliner, { on: neu });
    R.thing(9.85, 6.55, (ctx) => {
      box(ctx, 9.3, 5.95, 0, 0.5, 0.5, 0.08, C.ink, { flat: true, stroke: false });
      box(ctx, 9.52, 6.17, 0.08, 0.06, 0.06, 2.3, C.ink, { flat: true, stroke: false });
      const [X, Y] = P(9.55, 6.2, 2.4);
      ctx.beginPath(); ctx.moveTo(X - 0.32, Y - 0.35); ctx.lineTo(X + 0.32, Y - 0.35); ctx.lineTo(X + 0.48, Y + 0.25); ctx.lineTo(X - 0.48, Y + 0.25); ctx.closePath();
      paint(ctx, tint(C.pink, 0.4), { lw: 0.035 });
      ctx.beginPath(); ctx.moveTo(X - 0.38, Y - 0.42); ctx.lineTo(X + 0.38, Y - 0.42); ctx.lineTo(X + 0.56, Y + 0.3); ctx.lineTo(X - 0.56, Y + 0.3); ctx.closePath();
      paint(ctx, alpha(C.white, 0.3), { lw: 0.02, stroke: alpha(C.ink, 0.5) });
    }, { on: neu });
    R.light({ at: [9.55, 6.2, 2.3], r: 3.2, color: C.butter, k: (t) => (neu(t) && lightsOn(t) ? 0.75 : 0) });
    // A framed photo of the house they sold (with its SOLD sign), on the
    // wall by the stairs.
    R.thing(0.02, 1.6, (ctx) => {
      onLeft(ctx, 0.6, 1.9, 1.0, 0.8, C.brown, { lw: 0.03 });
      onLeft(ctx, 0.68, 1.97, 0.84, 0.66, tint(C.sky, 0.4), { stroke: false });
      if (!Q.detail) return;
      onLeft(ctx, 0.8, 2.02, 0.5, 0.32, C.white, { lw: 0.015 });
      crayon(ctx, [[0.78, 2.34], [1.05, 2.5], [1.32, 2.34]], C.red, 0.04);
      onLeft(ctx, 1.33, 2.02, 0.14, 0.12, C.red, { stroke: false });
    }, { on: neu });

    // The wife in the recliner by day with the crossword (squinting); at
    // night she's on the sofa and he's asleep in the recliner.
    const wife = folk(81, { style: 'curly', hair: C.greyLight, top: C.lilac, bottom: C.navy, skin: SKIN_FAIR });
    const walt = folk(82, { style: 'bald', top: tint(C.sky, 0.2), bottom: C.brown, hair: C.greyLight });
    // No glasses on her (the only pair in the room is on the couch): she squints.
    const squint = (c, hy) => {
      c.strokeStyle = C.ink; c.lineWidth = 0.03;
      c.beginPath(); c.moveTo(0.06, hy + 0.02); c.lineTo(0.15, hy + 0.04); c.moveTo(0.21, hy + 0.04); c.lineTo(0.3, hy + 0.02); c.stroke();
    };
    const late = (t) => { const h = hour(t); return h >= 20.5 || h < 5; };
    R.mover((t) => (neu(t) ? (late(t) ? { x: 11.2, y: 3.9, z: 0.05, dir: 'l' } : { x: 10.8, y: 6.9, z: 0.05, dir: 'r' }) : { x: -99, y: -99 }), (ctx, t, p) => {
      if (p.x < -50) return;
      person(ctx, p.x, p.y, p.z, {
        ...wife, pose: 'sit', dir: p.dir, arms: late(t) ? [0.55, 0.45] : [1.1, 1.0], face: squint,
        hold: (c) => { c.beginPath(); c.rect(-0.05, -0.28, 0.3, 0.36); paint(c, C.white, { lw: 0.02 }); if (Q.detail) { c.strokeStyle = alpha(C.ink, 0.6); c.lineWidth = 0.01; c.beginPath(); for (let i = 1; i < 4; i++) { c.moveTo(-0.05 + i * 0.075, -0.28); c.lineTo(-0.05 + i * 0.075, 0.08); c.moveTo(-0.05, -0.28 + i * 0.09); c.lineTo(0.25, -0.28 + i * 0.09); } c.stroke(); } },
      }, t);
      if (!late(t)) says(ctx, p.x, p.y, 2.3, t, ['Seven letters: "misplaced".', 'Couch.', 'Walt. The couch.'], 9, 3.4, 4);
    }, { bias: 1.6 });
    // Walt, looking for his glasses everywhere but the couch; asleep in
    // the recliner by ten.
    const waltAt = route([[1.6, 4.4, 3], [2.9, 7.2, 3], [6.8, 6.2, 3], [8.6, 5.4, 3], [6.6, 3.6, 2]], { speed: 0.9 });
    R.mover((t) => (neu(t) ? (late(t) ? { x: 10.8, y: 6.9, z: 0.05, sleep: true } : waltAt(t)) : { x: -99, y: -99 }), (ctx, t, p) => {
      if (p.x < -50) return;
      if (p.sleep) {
        person(ctx, p.x, p.y, p.z, { ...walt, pose: 'sit', dir: 'r', arms: [0.4, 0.3], face: (c, hy) => { c.strokeStyle = C.ink; c.lineWidth = 0.03; c.beginPath(); c.moveTo(0.06, hy + 0.03); c.lineTo(0.14, hy + 0.03); c.moveTo(0.2, hy + 0.03); c.lineTo(0.28, hy + 0.03); c.stroke(); } }, t);
        if (Q.detail) particles(t, 3, 3, (k) => { ctx.globalAlpha = 1 - k; paintZ(ctx, p.x - k * 0.6, p.y - k * 0.6, 2.4 + k * 1.2, 0.45 + k * 0.3); ctx.globalAlpha = 1; }, 9);
        return;
      }
      person(ctx, p.x, p.y, 0, { ...walt, pose: p.moving ? 'walk' : 'read', dir: p.dir, back: p.back, phase: p.phase, speed: 5 }, t);
      if (!p.moving) says(ctx, p.x, p.y, 2.6, t, ['Seen my glasses?', 'We sold the house in Braintree.', 'Is this the thermostat?', 'They were right here.'], 6, 3);
    }, { bias: 1.6 });

    // A rocking chair and a pot of mums on the porch, after noon.
    R.thing(14.3, 3.6, (ctx) => {
      box(ctx, 13.3, 2.7, 0.3, 0.9, 0.9, 0.12, C.white, { flat: true, lw: 0.03 });
      box(ctx, 13.25, 2.7, 0.42, 0.12, 0.9, 1.1, C.white, { flat: true, lw: 0.03 });
      for (const u of [2.72, 3.5]) { const [a, b] = P(13.1, u + 0.05, 0.05), [c, d] = P(14.35, u + 0.05, 0.05); ctx.beginPath(); ctx.moveTo(a, b); ctx.quadraticCurveTo((a + c) / 2, (b + d) / 2 + 0.2, c, d); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.06; ctx.stroke(); }
    }, { on: neu });
    R.thing(14.5, 4.2, (ctx) => {
      box(ctx, 14.0, 3.7, 0, 0.45, 0.45, 0.4, C.coral, { flat: true, lw: 0.025 });
      const [X, Y] = P(14.22, 3.92, 0.6);
      ctx.beginPath(); ctx.arc(X, Y, 0.33, 0, Math.PI * 2); paint(ctx, C.mustard, { dots: C.coral, density: 0.4, lw: 0.025 });
    }, { on: neu });

    // ---------- The goose ----------
    // Before noon, sitting in a box the mom has labeled GOOSE. After, on
    // top of the fridge, where nobody over five foot looks.
    R.thing(7.35, 8.55, (ctx) => {
      openCarton(ctx, 6.55, 7.85, 0.8, 0.7, 0.5, 1, null);
      tapeLabel(ctx, 'x', 6.95, 8.555, 0.28, 'GOOSE', 0.15);
    }, { on: old });
    R.goose((t) => (old(t) ? { x: 6.95, y: 8.2, z: 0.3, pose: 'sit', dir: 'r' } : { x: 0.65, y: 2.75, z: 3.0, pose: Math.sin(t * 0.7) > 0.8 ? 'honk' : 'sit', dir: 'r' }), { bias: 1.2 });

    // ---------- The finds ----------
    R.find({ id: 'hamster', label: 'A runaway hamster', at: hamster0, r: 0.88, ...BEFORE });
    R.find({ id: 'drawing', label: 'A crayon drawing of the house', at: [0, 4.6, 2], r: 0.88 });
    R.find({ id: 'glasses', label: 'A pair of reading glasses', at: [GLX, GLY, GLZ + 0.05], r: 0.88, ...AFTER });
  },
};

const paintZ = (ctx, x, y, z, s) => label(ctx, x, y, z, 'z', s, C.ink);
const HAIR_BROWN = mix(C.brown, C.ink, 0.3);
const SKIN_FAIR = mix(C.blush, C.white, 0.5);
