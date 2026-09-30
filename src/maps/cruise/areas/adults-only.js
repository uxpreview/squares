// Adults Only: the quiet deck at the bow end of the Cabins, tapering to the
// point. The spa (two massage tables, a seaweed wrap, the sauna door, cucumber
// slices on everything), a hot tub with a couple in it who haven't moved in
// four days, loungers, a zen garden, the SERENITY sign, and the loudest people
// on the ship. Every hour the attendant marches over to someone new and
// shushes them, and her SHHH! is the biggest thing on the deck. Whoever she
// shushed keeps it down for an hour and a half, then starts up again.
// Gloria (on the day's clock) sits on her spa lounger at (18, 8), in her
// cucumber mask until 11am.
// Keep the id: it's in links and saves.
import {
  C, Q, box, rect, disc, cylinder, face, poly, paint, person, folk, planks, tiles, plant, speech, label,
  onLeft, paintText, alpha, shade, tint, mix, SKIN, HAIR,
} from '../../../engine/art.js';
import { route, particles, pulse, clamp, ease } from '../../../engine/actors.js';
import { ZK } from '../../../engine/iso.js';
import { deck, outline } from '../ship.js';
import { LOOP } from '../plan.js';
import { INK, MAT, at, wrap, green, queasy } from '../style.js';
import { P, lettering, board, porthole, lounger, cocktail, bucket, gull, CREW_LOOK } from '../kit.js';

// ---------- Little drawing helpers (in this area's own units) ----------

// The deck's half width at x: straight to x 16, then in to the point at 32.
const half = (x) => (x <= 16 ? 8 : 8 * (1 - (x - 16) / 16));
const farY = (x) => 8 - half(x);

// A face at k green, in tenths (so the colour mixes stay few).
const qz = (skin, k) => queasy(skin, Math.round(k * 10) / 10);

// Draw flat on an upright plane facing the viewer's lower left (y fixed):
// the origin is the top left corner at (x, y, z), u runs along +x, v down.
function onY(ctx, x, y, z, draw) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.transform(1, 0.5, 0, ZK, X, Y);
  draw(ctx);
  ctx.restore();
}
// The same on the far wall where it angles in to the bow (x past 16): u runs
// along the wall, one unit for each unit of x.
function onBow(ctx, x, z, draw) {
  const [X, Y] = P(x, farY(x) + 0.03, z);
  ctx.save();
  ctx.transform(0.5, 0.75, 0, ZK, X, Y);
  draw(ctx);
  ctx.restore();
}
// Words in whatever units the context is in, centred on (u, v).
function words(ctx, s, u, v, size, color = C.ink, align = 'center', weight = 700) {
  if (!Q.detail) return;
  ctx.save();
  ctx.translate(u, v);
  ctx.scale(1 / 40, 1 / 40);
  ctx.font = `${weight} ${size * 40}px "Rethink Sans", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(s, 0, 0);
  ctx.restore();
}
// A line in screen units, inked (an outline under a colored stroke).
function inked(ctx, pts, color, w) {
  ctx.beginPath();
  pts.forEach(([X, Y], i) => (i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y)));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = w + 0.06; ctx.stroke(); }
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
}
// A cucumber slice, lying flat or stuck on something (screen units, r across).
function slice(ctx, X, Y, r = 0.1, flat = true) {
  ctx.beginPath();
  ctx.ellipse(X, Y, r, flat ? r * 0.55 : r, 0, 0, Math.PI * 2);
  paint(ctx, C.leaf, { lw: 0.015 });
  if (!Q.detail) return;
  ctx.beginPath();
  ctx.ellipse(X, Y, r * 0.72, (flat ? r * 0.55 : r) * 0.72, 0, 0, Math.PI * 2);
  ctx.fillStyle = tint(C.leaf, 0.6);
  ctx.fill();
  ctx.fillStyle = shade(C.leaf, 0.2);
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    ctx.fillRect(X + Math.cos(a) * r * 0.35 - 0.01, Y + Math.sin(a) * r * 0.2 - 0.01, 0.02, 0.02);
  }
}
// Somebody's comic noise, bold and wobbly, rising a little over life k (0..1).
function noise(ctx, x, y, z, text, k, size = 0.36, color = C.ink) {
  if (!Q.detail) return;
  const [X, Y] = P(x, y, z + k * 0.5);
  ctx.save();
  ctx.globalAlpha = clamp(Math.min(k * 5, (1 - k) * 3));
  ctx.translate(X, Y);
  ctx.rotate(Math.sin(k * 20) * 0.06);
  ctx.scale(1 / 40, 1 / 40);
  ctx.font = `${size * 40}px "Bagel Fat One", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 0.1 * 40;
  ctx.strokeStyle = C.white;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// ---------- The shushing ----------
// Every hour the attendant walks to someone new and shushes them. Whoever
// she shushed keeps it down for QUIET seconds (an hour and a half), then
// starts up again. The order goes round the deck, so her walks stay short,
// and puts Gloria at 11, right after her "Ahh. Pink again."
// at: where the attendant stands; dir/back: which way she faces; via: a
// corner on the way there, round the furniture; delay: seconds into the hour.
const TARGETS = [
  { id: 'sauna', at: [1.8, 12.2], dir: 'l', via: [[5.8, 10.8]] }, // 7am
  { id: 'tub', at: [11.4, 11.3], dir: 'l', via: [[6.4, 9.6], [11.4, 9.6]] }, // 8am
  { id: 'snorer', at: [16.9, 11.5], dir: 'l' }, // 9am
  { id: 'chips', at: [19.9, 11.7], dir: 'l' }, // 10am
  { id: 'gloria', at: [20.3, 9.3], dir: 'l', delay: 8.8 }, // 11am
  { id: 'bowl', at: [22.8, 11.3], dir: 'r' }, // noon
  { id: 'phone', at: [21.0, 6.9], dir: 'r', via: [[21.6, 10.6]] }, // 1pm
  { id: 'gull', at: [13.2, 2.3], dir: 'r', back: true, via: [[20.4, 5.2], [17.2, 5.9], [12.4, 5.9]] }, // 2pm
  { id: 'speaker', at: [9.3, 2.3], dir: 'r', back: true }, // 3pm
  { id: 'kids', at: [4.0, 5.0], dir: 'l' }, // 4pm
  { id: 'seaweed', at: [5.9, 5.5], dir: 'l' }, // 5pm
  { id: 'massage', at: [6.2, 9.4], dir: 'l' }, // 6pm
];
const HOURLEN = LOOP / 12, BRISK = 1.9, SHUSH = 3.6, QUIET = 30;
// Each hour's walk (from the last target to this one) and when the SHHH comes.
const LEGS = TARGETS.map((tg, i) => {
  const prev = TARGETS[(i + 11) % 12];
  const pts = [prev.at, ...(tg.via || []), tg.at];
  const lens = [];
  for (let j = 1; j < pts.length; j++) lens.push(Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]));
  const walk = lens.reduce((a, b) => a + b, 0) / BRISK;
  const t0 = i * HOURLEN;
  return { pts, lens, walk, t0, shush: t0 + Math.max(walk + 0.6, tg.delay || 0), prevDir: prev.dir };
});
const SHUSH_AT = Object.fromEntries(TARGETS.map((tg, i) => [tg.id, LEGS[i].shush]));
// Seconds since that one was last shushed (round the loop).
const since = (id, t) => wrap(t - SHUSH_AT[id]);
// Keeping it down right now?
const hushed = (id, t) => since(id, t) < QUIET;

// Where the attendant is at t: { x, y, dir, back, moving, shush (0..1 or -1) }.
function attendantAt(t) {
  const tt = wrap(t);
  const i = Math.min(11, Math.floor(tt / HOURLEN));
  const L = LEGS[i], tg = TARGETS[i];
  const s = tt - L.t0;
  if (s < L.walk) {
    let d = s * BRISK;
    for (let j = 0; j < L.lens.length; j++) {
      if (d <= L.lens[j] || j === L.lens.length - 1) {
        const [ax, ay] = L.pts[j], [bx, by] = L.pts[j + 1];
        const k = clamp(d / L.lens[j]);
        const dX = (bx - ax) - (by - ay), dY = (bx - ax) + (by - ay);
        return { x: ax + (bx - ax) * k, y: ay + (by - ay) * k, dir: dX >= 0 ? 'r' : 'l', back: dY < -0.01, moving: true, shush: -1, phase: tt * 9 };
      }
      d -= L.lens[j];
    }
  }
  const k = (tt - L.shush) / SHUSH;
  return { x: tg.at[0], y: tg.at[1], dir: tg.dir, back: !!tg.back, moving: false, shush: k >= 0 && k < 1 ? k : -1 };
}

// ---------- The people who stay here ----------

// Someone who stays on this deck, drawn every frame. o.pose(t) returns the
// person's changing options; o.after(ctx, t, e) draws what goes with them.
function body(R, x, y, look, o = {}) {
  R.thing(x, y, (ctx, t) => {
    const e = o.pose ? o.pose(t) : {};
    const k = green(t, o.sick);
    const skin = qz(look.skin, k);
    person(ctx, x, y, o.z || 0, { pose: 'stand', dir: 'r', ...look, skin, ...(look.top === look.skin ? { top: skin } : {}), ...e }, t);
    if (o.after) o.after(ctx, t, e, k);
  }, { anim: true, ...(o.depth != null ? { depth: o.depth } : {}) });
}

// The attendant: white tunic, a name badge that says SERENITY, a bun.
const ATTENDANT = {
  ...folk(71), ...CREW_LOOK, skin: SKIN[3], hair: HAIR[1], style: 'bun',
  wear(ctx, b) {
    if (b.back) return;
    ctx.beginPath(); ctx.rect(0.04, b.top + 0.2, 0.2, 0.09);
    paint(ctx, INK.flamingo, { lw: 0.015 });
  },
};
// Cucumber slices on someone's eyes (a person's face; hy is the head's middle).
function cucumberEyes(ctx, hy, back) {
  if (back) return;
  slice(ctx, 0.1, hy + 0.01, 0.075, false);
  slice(ctx, 0.25, hy + 0.01, 0.075, false);
}
// A towel turban.
function turban(ctx, hy) {
  ctx.beginPath();
  ctx.ellipse(-0.02, hy - 0.26, 0.34, 0.2, -0.15, 0, Math.PI * 2);
  paint(ctx, C.white, { lw: 0.025 });
  ctx.beginPath();
  ctx.ellipse(-0.18, hy - 0.4, 0.14, 0.1, -0.5, 0, Math.PI * 2);
  paint(ctx, C.white, { lw: 0.025 });
}

// Two kids in a trench coat, pretending to be 18. (One's the legs.)
const TRENCH = {
  skin: SKIN[0], hair: HAIR[3], style: 'short', hat: 'none', top: C.brown, dress: true, scale: 1.12,
  wear(ctx, b) { // the belt, the buttons, and a pair of eyes where the buttons part
    ctx.fillStyle = shade(C.brown, 0.35);
    ctx.fillRect(-0.3, b.hipY - 0.3, 0.6, 0.07);
    if (!Q.detail || b.back) return;
    ctx.fillStyle = C.ink;
    for (const v of [0.18, 0.36]) { ctx.beginPath(); ctx.arc(0.1, b.top + v, 0.03, 0, Math.PI * 2); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(0.08, b.hipY - 0.12, 0.14, 0.06, 0, 0, Math.PI * 2);
    ctx.fillStyle = C.ink; ctx.fill();
    ctx.fillStyle = C.white;
    for (const u of [0.03, 0.14]) { ctx.beginPath(); ctx.arc(u, b.hipY - 0.12, 0.028, 0, Math.PI * 2); ctx.fill(); }
  },
  face(ctx, hy, back) { // a fedora, and a mustache drawn on in marker
    ctx.beginPath(); ctx.ellipse(0.02, hy - 0.2, 0.44, 0.09, 0, 0, Math.PI * 2);
    paint(ctx, shade(C.brown, 0.3), { lw: 0.025 });
    ctx.beginPath(); ctx.rect(-0.22, hy - 0.5, 0.48, 0.3);
    paint(ctx, shade(C.brown, 0.3), { lw: 0.025 });
    ctx.fillStyle = C.ink; ctx.fillRect(-0.22, hy - 0.28, 0.48, 0.06);
    if (back) return;
    ctx.beginPath(); ctx.moveTo(0.06, hy + 0.13); ctx.quadraticCurveTo(0.18, hy + 0.06, 0.3, hy + 0.13);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05; ctx.lineCap = 'round'; ctx.stroke();
  },
};

// ---------- The furniture ----------

// A massage table: a padded top on a steel frame, a face hole at the head.
function massageTable(ctx, x, y) {
  for (const [dx, dy] of [[0.15, 0.1], [1.95, 0.1], [0.15, 0.8], [1.95, 0.8]]) box(ctx, x + dx, y + dy, 0, 0.1, 0.1, 0.72, MAT.chrome, { flat: true, lw: 0.02 });
  box(ctx, x + 0.1, y + 0.4, 0.3, 2.0, 0.2, 0.05, MAT.chrome, { flat: true, lw: 0.02 });
  box(ctx, x, y, 0.72, 2.2, 1.0, 0.18, C.white, { top: tint(INK.flamingo, 0.55) });
  // A folded towel at the foot, and the face hole's ring at the head.
  box(ctx, x + 1.75, y + 0.2, 0.9, 0.35, 0.6, 0.08, C.white, { flat: true, lw: 0.02 });
}

// ---------- The zone ----------

export default {
  id: 'adults-only',
  name: 'Adults Only',
  blurb: 'The Serenity deck is the loudest place on the ship. The attendant shushing everyone is the loudest of all.',

  build(R) {
    deck(R, 'adults-only', 'cabins', { grid: false, name: false });
    const pts = outline(R);

    // ---------- The floor ----------
    // Teak planks for the lounge, pale tiles for the spa end by the door.
    R.floor((ctx) => {
      ctx.save();
      poly(ctx, pts.map(([x, y]) => [x, y, 0]));
      ctx.clip();
      planks(ctx, tint(INK.teak, 0.2), 0.8, 0, 0, R.W, R.D);
      rect(ctx, 0, 0, 11.4, 16, 0, tint(MAT.canvas, 0.3), { stroke: false });
      tiles(ctx, 1, alpha(C.ink, 0.1), 0.025, 0, 0, 11.4, 16);
      ctx.restore();
      face(ctx, [[11.4, 0, 0], [11.4, 16, 0]], null, { lw: 0.05 });
      poly(ctx, pts.map(([x, y]) => [x, y, 0]));
      ctx.lineWidth = 0.06; ctx.strokeStyle = C.ink; ctx.stroke();
    });
    R.rug((ctx) => {
      // The runner in from the door, with the rule painted on it.
      rect(ctx, 0, 2.4, 11.2, 1.6, 0.005, C.lilac, { dots: shade(C.lilac, 0.3), density: 0.12, lw: 0.03 });
      rect(ctx, 0, 2.55, 11.2, 1.3, 0.006, null, { lw: 0.02, stroke: C.white });
      if (Q.detail) paintText(ctx, 'floor', 6.6, 3.2, 'QUIET ZONE', 0.55, alpha(C.white, 0.85));
      // The loungers' rug, and a soft one under the spa tables.
      rect(ctx, 11.8, 11.8, 7.6, 3.0, 0.005, tint(INK.flamingo, 0.45), { dots: INK.flamingo, density: 0.1, lw: 0.03 });
      rect(ctx, 2.4, 5.4, 3.4, 5.4, 0.005, tint(C.mint, 0.2), { lw: 0.03 });
      // The zen garden: raked sand round three stones (the stones stand up).
      rect(ctx, 22.4, 8.0, 4.0, 2.8, 0.01, C.butter, { dots: shade(C.butter, 0.25), density: 0.12, lw: 0.04 });
      if (Q.detail) {
        ctx.save();
        poly(ctx, [[22.4, 8, 0.01], [26.4, 8, 0.01], [26.4, 10.8, 0.01], [22.4, 10.8, 0.01]]);
        ctx.clip();
        ctx.strokeStyle = shade(C.butter, 0.3); ctx.lineWidth = 0.025;
        for (let j = 0.3; j < 2.8; j += 0.3) {
          ctx.beginPath();
          for (let i = 0; i <= 20; i++) {
            const x = 22.4 + (i / 20) * 4, y = 8 + j + Math.sin(i * 0.6) * 0.08;
            const [X, Y] = P(x, y, 0.01);
            i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
          }
          ctx.stroke();
        }
        for (const [x, y, r] of [[23.4, 9.0, 0.7], [25.4, 9.9, 0.55]]) {
          for (let q = 1; q <= 2; q++) disc(ctx, x, y, 0.012, r * (0.6 + q * 0.3), null, { lw: 0.022, stroke: shade(C.butter, 0.35) });
        }
        ctx.restore();
      }
      // The meditation cushion's shadow.
      disc(ctx, 24.5, 9.5, 0.01, 0.55, alpha(C.ink, 0.12), { stroke: false });
    });

    // ---------- The walls ----------
    // By the door (the left wall): the rules, the robes and the sauna.
    R.decor((ctx) => {
      // ADULTS ONLY 18+
      onLeft(ctx, 5.0, 2.2, 2.6, 1.5, INK.flamingo, { lw: 0.05 });
      onLeft(ctx, 5.1, 2.3, 2.4, 1.3, null, { lw: 0.02, stroke: C.white });
      if (Q.detail) {
        paintText(ctx, 'left', 6.3, 3.3, 'ADULTS ONLY', 0.36, C.white);
        paintText(ctx, 'left', 6.3, 2.8, '18+', 0.42, C.ink);
        paintText(ctx, 'left', 6.3, 1.9, 'NO KIDS. NO PHONES. NO FUN.', 0.15, C.ink, 'Rethink Sans');
      }
      // Robe hooks, each with a robe that says so.
      for (let i = 0; i < 3; i++) {
        const y = 8.1 + i * 0.8;
        onLeft(ctx, y + 0.1, 1.2, 0.5, 1.6, C.white, { lw: 0.03, dots: C.greyLight, density: 0.2 });
        onLeft(ctx, y + 0.3, 2.75, 0.1, 0.1, MAT.brass, { lw: 0.015 });
        onLeft(ctx, y + 0.12, 1.9, 0.46, 0.06, INK.flamingo, { stroke: false });
      }
      // The sauna: a pine door with a little steamed-up window, and its sign.
      onLeft(ctx, 11.0, 0, 2.2, 3.3, MAT.teakDark, { lw: 0.05 });
      onLeft(ctx, 11.15, 0, 1.9, 3.15, INK.teak, { dots: shade(INK.teak, 0.35), density: 0.1, lw: 0.03 });
      for (let i = 1; i < 6; i++) face(ctx, [[0, 11.15 + i * 0.32, 0.02], [0, 11.15 + i * 0.32, 3.15]], null, { lw: 0.015, stroke: shade(INK.teak, 0.4) });
      onLeft(ctx, 11.6, 2.0, 1.0, 0.8, tint(C.greyLight, 0.4), { lw: 0.03 });
      onLeft(ctx, 12.6, 1.4, 0.12, 0.35, MAT.brass, { lw: 0.015 });
      onLeft(ctx, 11.2, 3.5, 1.8, 0.6, C.ink, { lw: 0.03 });
      if (Q.detail) {
        paintText(ctx, 'left', 12.1, 3.8, 'SAUNA 90°', 0.3, INK.sunYellow);
        paintText(ctx, 'left', 14.0, 2.6, 'PHONES', 0.14, C.ink, 'Rethink Sans');
        paintText(ctx, 'left', 14.0, 2.4, 'MELT', 0.14, INK.funnelRed, 'Rethink Sans');
      }
      onLeft(ctx, 13.6, 2.1, 0.8, 0.7, null, { lw: 0.02 });
      // Its thermometer, well into the red.
      onLeft(ctx, 13.55, 0.8, 0.14, 1.1, C.white, { lw: 0.02 });
      onLeft(ctx, 13.58, 0.85, 0.08, 0.9, INK.funnelRed, { stroke: false });
    });

    // The far wall (the ship draws it as a standing piece here, since it angles
    // in to the bow, so what hangs on it stands just in front of it).
    const FAR = -0.9;
    R.thing(8, 0.2, (ctx) => {
      porthole(ctx, 1.9, 4.4, 0.42);
      porthole(ctx, 7.2, 4.2, 0.42);
      // The spa menu.
      onY(ctx, 3.6, 0.02, 4.3, (g) => {
        g.beginPath(); g.rect(0, 0, 2.2, 2.7); paint(g, C.white, { lw: 0.04 });
        g.beginPath(); g.rect(0, 0, 2.2, 0.5); paint(g, INK.flamingo, { lw: 0.04 });
        words(g, 'SPA MENU', 1.1, 0.26, 0.26, C.white, 'center', 900);
        const menu = [['CUCUMBER FACIAL', '90'], ['HOT STONES', '140'], ['SEAWEED WRAP', '120'], ['JUST A CUCUMBER', '40'], ['SILENCE', '400']];
        menu.forEach(([a, b], i) => {
          words(g, a, 0.15, 0.78 + i * 0.36, 0.13, C.ink, 'left', 700);
          words(g, b, 2.05, 0.78 + i * 0.36, 0.13, C.ink, 'right', 800);
        });
        slice(g, 1.95, 0.25, 0.14, false);
      });
      // The SERENITY sign: the biggest word on the deck, until the attendant speaks.
      onY(ctx, 10.6, 0.02, 4.9, (g) => {
        g.beginPath(); g.roundRect(0, 0, 5.2, 1.9, 0.2);
        paint(g, INK.sunYellow, { lw: 0.06, dots: shade(INK.sunYellow, 0.25), density: 0.1 });
        g.beginPath(); g.roundRect(0.12, 0.12, 4.96, 1.66, 0.14);
        paint(g, null, { lw: 0.025, stroke: C.white });
        words(g, 'SERENITY', 2.6, 0.82, 0.95, C.ink, 'center', 900);
        words(g, 'PLEASE KEEP YOUR VOICE DOWN', 2.6, 1.5, 0.2, shade(INK.funnelRed, 0.1), 'center', 800);
        slice(g, 4.7, 0.35, 0.16, false); // someone stuck one on it
      });
      // WHISPER. A little sign by the cucumber water.
      onY(ctx, 6.1, 0.02, 2.6, (g) => {
        g.beginPath(); g.rect(0, 0, 1.6, 0.9); paint(g, C.white, { lw: 0.03 });
        words(g, 'CUCUMBER WATER', 0.8, 0.28, 0.14, C.ink, 'center', 900);
        words(g, 'NOT FROM THE BUFFET.', 0.8, 0.52, 0.1, INK.funnelRed, 'center', 800);
        words(g, 'PROMISE.', 0.8, 0.7, 0.1, INK.funnelRed, 'center', 800);
      });
      // The speaker that plays the Sounds of the Ocean, on a ship, at sea.
      box(ctx, 8.8, 0, 4.1, 1.0, 0.4, 0.7, C.ink, { flat: true });
      onY(ctx, 8.8, 0.4, 4.8, (g) => {
        for (const u of [0.28, 0.72]) { g.beginPath(); g.arc(u, 0.35, 0.18, 0, Math.PI * 2); paint(g, shade(C.grey, 0.4), { lw: 0.02 }); }
      });
      onY(ctx, 8.4, 0.02, 3.9, (g) => {
        words(g, 'SOUNDS OF THE OCEAN', 0.9, 0, 0.1, C.ink, 'center', 800);
      });
    }, { depth: FAR });
    // On the bow's angled wall: portholes, the lifebuoy and the phone rule.
    R.thing(24, 4, (ctx) => {
      for (const x of [17.4, 26.5]) {
        onBow(ctx, x, 4.3, (g) => {
          g.beginPath(); g.arc(0, 0, 0.55, 0, Math.PI * 2); paint(g, MAT.brass, { lw: 0.04 });
          g.beginPath(); g.arc(0, 0, 0.42, 0, Math.PI * 2); paint(g, INK.sea, { lw: 0.03 });
          g.beginPath(); g.arc(-0.12, -0.12, 0.1, 0, Math.PI * 2); g.fillStyle = alpha(C.white, 0.5); g.fill();
        });
      }
      onBow(ctx, 20.2, 4.6, (g) => {
        g.beginPath(); g.rect(0, 0, 2.6, 1.3); paint(g, C.white, { lw: 0.04 });
        g.beginPath(); g.rect(0, 0, 2.6, 0.42); paint(g, INK.funnelRed, { lw: 0.04 });
        words(g, 'NO PHONES', 1.3, 0.22, 0.24, C.white, 'center', 900);
        words(g, 'ON THE SERENITY DECK', 1.3, 0.66, 0.14, C.ink, 'center', 800);
        words(g, 'THIS MEANS YOU, DALE', 1.3, 1.0, 0.13, INK.funnelRed, 'center', 800);
      });
      onBow(ctx, 23.5, 2.6, (g) => {
        for (let i = 0; i < 4; i++) {
          g.beginPath(); g.arc(0, 0, 0.5, (i * Math.PI) / 2, ((i + 1) * Math.PI) / 2); g.arc(0, 0, 0.28, ((i + 1) * Math.PI) / 2, (i * Math.PI) / 2, true); g.closePath();
          paint(g, i % 2 ? C.white : INK.funnelRed, { lw: 0.03 });
        }
      });
      onBow(ctx, 28.8, 2.2, (g) => {
        g.beginPath(); g.rect(0, 0, 1.3, 0.8); paint(g, C.white, { lw: 0.03 });
        words(g, 'ICEBERG', 0.65, 0.22, 0.14, C.ink, 'center', 900);
        words(g, 'VIEWING', 0.65, 0.42, 0.14, C.ink, 'center', 900);
        words(g, '(NONE TODAY)', 0.65, 0.62, 0.09, INK.funnelRed, 'center', 800);
      });
    }, { depth: FAR });

    // ---------- The spa, by the door ----------
    // The towel cubby, rolled towels in every hole.
    R.thing(1.9, 0.9, (ctx) => {
      box(ctx, 0.6, 0.1, 0, 2.6, 0.8, 2.7, INK.hullWhite, { top: INK.hullWhite });
      onY(ctx, 0.6, 0.9, 2.7, (g) => {
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
            const u = 0.35 + c * 0.63, v = 0.36 + r * 0.64;
            g.beginPath(); g.rect(u - 0.28, v - 0.28, 0.56, 0.56); paint(g, shade(INK.hullWhite, 0.25), { lw: 0.02 });
            if (r === 3 && c === 2) continue; // one missing
            g.beginPath(); g.arc(u, v + 0.02, 0.22, 0, Math.PI * 2);
            paint(g, (r + c) % 3 === 0 ? INK.flamingo : C.white, { lw: 0.02 });
            g.beginPath(); g.arc(u, v + 0.02, 0.1, 0, Math.PI * 2); paint(g, null, { lw: 0.015 });
          }
        }
      });
    });
    // The cucumber water, on its counter, with a bowl of spare slices.
    R.thing(6.9, 1.1, (ctx) => {
      box(ctx, 6.0, 0.2, 0, 1.8, 0.9, 1.05, INK.hullWhite, { top: tint(INK.teak, 0.2) });
      disc(ctx, 7.35, 0.55, 1.06, 0.3, C.white, { lw: 0.025 });
      if (Q.detail) {
        for (const [dx, dy] of [[-0.08, 0], [0.08, 0.05], [0, -0.08], [0.1, -0.1]]) {
          const [X, Y] = P(7.35 + dx, 0.55 + dy, 1.12);
          slice(ctx, X, Y, 0.09);
        }
        for (let i = 0; i < 4; i++) cylinder(ctx, 7.35 + (i % 2) * 0.1, 0.95, 1.05 + i * 0.1, 0.1, 0.1, C.white, { flat: true, lw: 0.015 });
      }
    });
    // The jug, and the slices going round in it.
    R.thing(6.5, 0.9, (ctx, t) => {
      const [X, Yb] = P(6.5, 0.6, 1.05), Yt = Yb - 1.0 * ZK;
      ctx.beginPath(); ctx.rect(X - 0.32, Yt, 0.64, Yb - Yt);
      paint(ctx, alpha(MAT.glass, 0.8), { lw: 0.03 });
      if (Q.detail) {
        for (let i = 0; i < 3; i++) {
          const a = t * 0.8 + i * 2.1;
          slice(ctx, X + Math.cos(a) * 0.18, Yt + 0.35 + i * 0.22 + Math.sin(a * 1.3) * 0.05, 0.09, false);
        }
      }
      ctx.beginPath(); ctx.rect(X - 0.1, Yb - 0.2, 0.2, 0.12); paint(ctx, MAT.chrome, { lw: 0.02 });
      ctx.beginPath(); ctx.ellipse(X, Yt, 0.32, 0.1, 0, 0, Math.PI * 2); paint(ctx, alpha(MAT.glass, 0.6), { lw: 0.02 });
    }, { anim: true });
    // A palm under the speaker (C.leaf, not the clue's green).
    R.thing(9.6, 1.0, (ctx, t) => plant(ctx, 9.6, 1.0, 0, t, { kind: 'palm', scale: 1.2, potColor: INK.hullWhite, leaf: C.leaf }), { anim: true });
    // The speaker's notes (quiet once she's been over).
    R.air((ctx, t) => {
      if (!Q.detail || hushed('speaker', t)) return;
      particles(t, 3, 3, (k, r) => {
        ctx.globalAlpha = clamp(Math.min(k * 4, (1 - k) * 2));
        label(ctx, 9.3 + Math.sin(k * 6 + r() * 3) * 0.4, 0.6 + k * 0.8, 4.4 + k * 1.3, r() < 0.5 ? '♪' : '~', 0.4, C.ink, 'Rethink Sans');
        ctx.globalAlpha = 1;
      }, 11);
    });

    // Massage table one: the seaweed wrap, asleep, snoring.
    R.thing(4.1, 7.0, (ctx) => {
      massageTable(ctx, 3.0, 6.0);
    });
    body(R, 5.0, 6.45, { skin: SKIN[5], hair: HAIR[2], style: 'short', top: C.green, bottom: C.green, face: (ctx, hy, back) => { turban(ctx, hy); cucumberEyes(ctx, hy, back); } }, {
      z: 0.9, depth: 11.7,
      pose: () => ({ pose: 'lie', dir: 'r', arms: [0, 0] }),
      after(ctx) { // the wrap: seaweed ribbons round her
        if (!Q.detail) return;
        for (let i = 0; i < 4; i++) {
          const [X, Y] = P(4.1 + i * 0.32, 6.45 + i * 0.12, 1.2);
          ctx.beginPath(); ctx.ellipse(X - 0.3, Y + 0.1, 0.08, 0.26, 0.2, 0, Math.PI * 2);
          paint(ctx, shade(C.green, 0.25), { lw: 0.015 });
        }
      },
    });
    R.air((ctx, t) => {
      if (hushed('seaweed', t)) return;
      const k = pulse(t, 2.6);
      noise(ctx, 3.4 - k * 0.3, 6.0, 1.9, k < 0.5 ? 'Z' : 'ZZZ', k, 0.5 + k * 0.3);
    });
    // A stool with candles and hot stones between the tables.
    R.thing(2.4, 8.5, (ctx) => {
      cylinder(ctx, 2.4, 8.3, 0, 0.35, 0.7, INK.teak);
      for (const [dx, dy] of [[-0.12, -0.05], [0.1, 0.08], [0.02, -0.15]]) cylinder(ctx, 2.4 + dx, 8.3 + dy, 0.7, 0.07, 0.18 + dy, C.white, { flat: true, lw: 0.015 });
    });
    R.thing(2.4, 8.55, (ctx, t) => {
      for (const [i, [dx, dy]] of [[-0.12, -0.05], [0.1, 0.08], [0.02, -0.15]].entries()) {
        const [X, Y] = P(2.4 + dx, 8.3 + dy, 0.9 + dy);
        const f = 0.06 + Math.sin(t * 9 + i * 2) * 0.015;
        ctx.beginPath(); ctx.ellipse(X, Y - f, 0.035, f, 0, 0, Math.PI * 2);
        ctx.fillStyle = INK.sunYellow; ctx.fill();
      }
    }, { anim: true });

    // Massage table two: someone having their back done, loudly.
    R.thing(4.1, 10.0, (ctx) => massageTable(ctx, 3.0, 9.0));
    const CLIENT = { ...folk(73), style: 'bald', skin: SKIN[1], dress: false };
    CLIENT.top = CLIENT.skin; CLIENT.bottom = C.white;
    body(R, 5.0, 9.45, CLIENT, {
      z: 0.9, depth: 14.7, sick: at(10.5),
      pose: () => ({ pose: 'lie', dir: 'r', back: true, arms: [0, 0] }),
      after(ctx) { // hot stones down his back
        for (let i = 0; i < 4; i++) {
          const [X, Y] = P(4.05 + i * 0.28, 9.4 + i * 0.05, 1.25);
          ctx.beginPath(); ctx.ellipse(X - 0.2, Y - 0.1, 0.1, 0.06, 0, 0, Math.PI * 2);
          paint(ctx, C.ink, { lw: 0.015 });
        }
      },
    });
    // The masseuse, kneading, behind the table.
    body(R, 4.2, 8.55, { ...folk(74), ...CREW_LOOK, style: 'pony', skin: SKIN[4] }, {
      depth: 12.6, pose: () => ({ pose: 'drum', dir: 'l' }),
    });
    R.air((ctx, t) => {
      if (hushed('massage', t)) return;
      const k = pulse(t, 5, 1.3);
      if (k < 0.45) noise(ctx, 4.0, 9.6, 2.0, k < 0.2 ? 'OHHH' : 'OHHH YES', k / 0.45, 0.55);
    });

    // The sauna singer: out every half minute for air, lobster red, a towel.
    const SAUNA = (t) => {
      const s = pulse(t, 30, 6) * 30;
      if (s > 11) return { x: 0.2, y: 12.2, out: 0 };
      const k = s < 2 ? s / 2 : s < 9 ? 1 : 1 - (s - 9) / 2;
      return { x: 0.3 + k * 1.4, y: 12.3 + k * 0.4, out: k, moving: s < 2 || s > 9, dir: s > 9 ? 'l' : 'r', back: s > 9 };
    };
    const RED = mix(SKIN[0], C.coral, 0.55);
    R.mover(SAUNA, (ctx, t, p) => {
      if (p.out <= 0.02) return;
      ctx.save();
      ctx.globalAlpha = clamp(p.out * 3);
      person(ctx, p.x, p.y, 0, { skin: RED, hair: HAIR[4], style: 'bald', top: RED, bottom: C.white, pose: p.moving ? 'walk' : 'wave', dir: p.dir, back: p.back }, t);
      ctx.restore();
    });
    R.air((ctx, t) => {
      if (!Q.detail) return;
      // Steam out of the door, every time.
      const s = pulse(t, 30, 6) * 30;
      if (s < 3) {
        particles(s, 5, 3, (k, r) => {
          const [X, Y] = P(0.4 + k * 1.2, 11.8 + r() * 1.2, 1 + r() * 2 + k * 1.4);
          ctx.beginPath(); ctx.arc(X, Y, 0.2 + k * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = alpha(C.white, 0.5 * (1 - k)); ctx.fill();
        }, 5);
      }
      // And the singing through it, until she's been over.
      if (!hushed('sauna', t)) {
        const k = pulse(t, 4);
        noise(ctx, 0.6, 12.2, 3.6, k < 0.5 ? 'LA LA LAAA' : 'O SOLE MIO', k, 0.5, INK.funnelRed);
      }
    });

    // The two kids in a trench coat: at the door from 2pm, shushed out at 4.
    const kidsStart = at(14);
    R.mover((t) => {
      const tt = wrap(t), s = SHUSH_AT.kids;
      if (tt < kidsStart || tt > s + 5) return { x: 0.3, y: 3.2, gone: true };
      if (tt < kidsStart + 1.6) { const k = (tt - kidsStart) / 1.6; return { x: 0.4 + k * 1.8, y: 3.4 + k * 1.1, moving: true, dir: 'r', a: clamp(k * 3) }; }
      if (tt < s + 2.6) return { x: 2.2, y: 4.5, dir: 'r', a: 1, stand: true };
      const k = clamp((tt - s - 2.6) / 1.4);
      return { x: 2.2 - k * 1.9, y: 4.5 - k * 1.3, moving: true, run: true, dir: 'l', back: true, a: clamp((1 - k) * 3) };
    }, (ctx, t, p) => {
      if (p.gone) return;
      ctx.save();
      ctx.globalAlpha = p.a;
      person(ctx, p.x, p.y, 0, { ...TRENCH, pose: p.run ? 'run' : p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back, arms: p.stand ? [0.5, 0.4] : undefined }, t);
      ctx.restore();
      if (p.stand && pulse(t, 6) < 0.35) speech(ctx, p.x, p.y, 3.1, 'We are 18.', { size: 0.34 });
    });

    // ---------- The hot tub ----------
    // Two people who got in on day one. It says 15 minutes on the sign.
    const TUB = { x: 6.5, y: 10, w: 4, d: 4, h: 0.8, water: 0.72 };
    R.thing(10.5, 14, (ctx) => {
      box(ctx, TUB.x, TUB.y, 0, TUB.w, TUB.d, TUB.h, INK.teak, { top: tint(INK.teak, 0.25), dens: 0.2 });
      rect(ctx, TUB.x + 0.3, TUB.y + 0.3, TUB.w - 0.6, TUB.d - 0.6, TUB.water, MAT.pool, { dots: tint(MAT.pool, 0.45), density: 0.15, lw: 0.03 });
      // The rim: four newspapers, one a day, and a champagne bucket.
      for (let i = 0; i < 4; i++) box(ctx, 6.6, 10.1 + i * 0.05, 0.8 + i * 0.05, 0.6, 0.45, 0.04, i === 3 ? C.white : C.greyLight, { flat: true, lw: 0.015 });
      if (Q.detail) lettering(ctx, 'x', 6.9, 10.6, 1.05, 'DAY 4', 0.1);
      cylinder(ctx, 10.1, 10.2, 0.8, 0.18, 0.35, MAT.chrome);
      const [X, Y] = P(10.1, 10.2, 1.15);
      inked(ctx, [[X, Y], [X + 0.12, Y - 0.35]], C.green, 0.07);
      // Scratched into the rim, prisoner style.
      if (Q.detail) lettering(ctx, 'x', 8.5, 14.01, 0.4, 'IIII', 0.3, shade(INK.teak, 0.5));
    });
    // The sign they never read.
    R.thing(6.2, 14.4, (ctx) => {
      face(ctx, [[6.2, 14.3, 0], [6.2, 14.3, 1.5]], null, { lw: 0.07, stroke: MAT.steelDark });
      board(ctx, 'x', 6.2, 14.35, 1.75, 1.3, 0.7, '', { board: C.white });
      lettering(ctx, 'x', 6.2, 14.36, 1.9, 'HOT TUB', 0.16, C.ink);
      lettering(ctx, 'x', 6.2, 14.36, 1.66, 'MAX 15 MINUTES', 0.12, INK.funnelRed);
    });
    const COUPLE = [
      { x: 7.7, y: 11.1, look: { ...folk(81), skin: SKIN[0], hair: HAIR[4], style: 'bald', top: SKIN[0] }, dir: 'r' },
      { x: 9.3, y: 11.3, look: { ...folk(82), skin: SKIN[1], hair: HAIR[7], style: 'bun', top: INK.funnelRed }, dir: 'l' },
    ];
    R.thing(10.5, 14, (ctx, t) => {
      const jets = !hushed('tub', t);
      // The bubbles (off for an hour and a half once she's been).
      if (jets && Q.detail) {
        particles(t, 12, 1.4, (k, r) => {
          const x = TUB.x + 0.6 + r() * 2.8, y = TUB.y + 0.6 + r() * 2.8;
          const [X, Y] = P(x, y, TUB.water + 0.02);
          ctx.beginPath(); ctx.arc(X, Y - k * 0.1, 0.05 + k * 0.08, 0, Math.PI * 2);
          ctx.strokeStyle = alpha(C.white, 0.9 * (1 - k)); ctx.lineWidth = 0.025; ctx.stroke();
        }, 3);
      }
      // A cucumber slice going round.
      const a = t * (jets ? 0.9 : 0.15);
      const [cx, cy] = P(8.5 + Math.cos(a) * 1.2, 12.4 + Math.sin(a) * 1.0, TUB.water + 0.01);
      slice(ctx, cx, cy, 0.12);
      // The couple, up to their shoulders, not moving. Never green: they
      // haven't been to the buffet in four days.
      for (const c of COUPLE) {
        const [, Yw] = P(c.x, c.y, TUB.water);
        const [Xp] = P(c.x, c.y, 0);
        ctx.save();
        ctx.beginPath(); ctx.rect(Xp - 1.5, Yw - 4, 3, 4); ctx.clip();
        person(ctx, c.x, c.y, TUB.water - 1.25, { ...c.look, pose: 'stand', dir: c.dir, arms: [0.9, -0.9] }, 0);
        ctx.restore();
        ctx.beginPath(); ctx.ellipse(Xp - 0.02, Yw + 0.02, 0.42, 0.14, 0, 0, Math.PI * 2);
        ctx.strokeStyle = alpha(C.white, 0.8); ctx.lineWidth = 0.03; ctx.stroke();
      }
      if (!Q.detail) return;
      // Her glass, and a cobweb from his head to the rim.
      const [gx, gy] = P(9.3, 11.3, TUB.water + 0.9);
      ctx.beginPath(); ctx.moveTo(gx - 0.34, gy - 0.25); ctx.lineTo(gx - 0.3, gy + 0.1); ctx.lineTo(gx - 0.22, gy + 0.1); ctx.lineTo(gx - 0.18, gy - 0.25); ctx.closePath();
      paint(ctx, alpha(MAT.glass, 0.9), { lw: 0.015 });
      const [hx, hy] = P(7.7, 11.1, TUB.water + 1.3), [rx, ry] = P(6.7, 10.4, TUB.h);
      ctx.strokeStyle = alpha(C.white, 0.9); ctx.lineWidth = 0.012;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(hx - 0.1, hy + i * 0.05); ctx.quadraticCurveTo((hx + rx) / 2, (hy + ry) / 2 + 0.1, rx, ry - i * 0.06); ctx.stroke(); }
    }, { anim: true, depth: 24.55 });
    // The step up, its handrail, and the sign hung on it.
    R.thing(10.9, 13.9, (ctx) => {
      box(ctx, 10.5, 12.6, 0, 0.5, 1.2, 0.4, tint(INK.teak, 0.1), { top: tint(INK.teak, 0.3), flat: true });
      for (const y of [12.7, 13.8]) face(ctx, [[10.75, y, 0.4], [10.75, y, 1.45]], null, { lw: 0.07, stroke: MAT.chrome });
      const [a, b] = P(10.75, 12.7, 1.45), [c, d] = P(10.75, 13.8, 1.45), [e, f] = P(10.4, 13.8, 0.85);
      inked(ctx, [[a, b], [c, d], [e, f]], MAT.chrome, 0.06);
      // DO NOT DISTURB, on a door hanger, on a hot tub.
      const [hX, hY] = P(10.8, 13.55, 1.45);
      ctx.beginPath(); ctx.ellipse(hX, hY + 0.02, 0.07, 0.04, 0, 0, Math.PI * 2); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.025; ctx.stroke();
      onY(ctx, 10.62, 13.64, 1.36, (g) => {
        g.save(); g.transform(1, -1, 0, 1, 0, 0); // turned to hang along the rail
        g.beginPath(); g.roundRect(0, 0, 0.42, 0.78, 0.05);
        paint(g, INK.funnelRed, { lw: 0.025 });
        g.beginPath(); g.arc(0.21, 0.1, 0.06, 0, Math.PI * 2); g.fillStyle = C.ink; g.fill();
        words(g, 'DO', 0.21, 0.3, 0.1, C.white, 'center', 900);
        words(g, 'NOT', 0.21, 0.43, 0.1, C.white, 'center', 900);
        words(g, 'DISTURB', 0.21, 0.56, 0.075, C.white, 'center', 900);
        g.restore();
      });
    }, { depth: 24.7 });

    // ---------- The loungers ----------
    const LOUNGE_Y = 12.2;
    // The reader: cucumbers on her eyes, reading anyway.
    // The snorer, asleep since breakfast.
    // The man with the crinkliest bag of chips on the ship.
    const LOUNGERS = [
      { x: 12, seed: 91, sick: null, look: { dress: false, top: C.purple, bottom: C.white, face: (ctx, hy, back) => { turban(ctx, hy); cucumberEyes(ctx, hy, back); } } },
      { x: 15, seed: 92, sick: at(12.2), look: { style: 'bald', top: C.sky, bottom: C.navy, dress: false } },
      { x: 18, seed: 93, sick: at(11.8), look: { top: C.coral, bottom: C.teal, dress: false, style: 'short' } },
    ];
    for (const L of LOUNGERS) {
      R.thing(L.x + 0.5, LOUNGE_Y + 2.2, (ctx) => lounger(ctx, L.x, LOUNGE_Y, 0, { color: INK.hullWhite, towel: L.x === 15 ? C.sky : INK.flamingo }));
    }
    // Side tables between them: drinks, a paperback, suncream.
    for (const [x, items] of [[13.5, 'book'], [16.5, 'drinks']]) {
      R.thing(x + 0.3, 13.7, (ctx) => {
        cylinder(ctx, x + 0.25, 13.3, 0, 0.08, 0.6, MAT.steelDark);
        cylinder(ctx, x + 0.25, 13.3, 0.6, 0.38, 0.05, C.white);
        if (items === 'book') {
          box(ctx, x + 0.05, 13.1, 0.66, 0.4, 0.3, 0.06, INK.flamingo, { flat: true, lw: 0.015 });
          cylinder(ctx, x + 0.45, 13.45, 0.65, 0.07, 0.3, INK.sunYellow, { flat: true, lw: 0.015 });
        } else {
          cocktail(ctx, x + 0.12, 13.25, 0.66);
          cocktail(ctx, x + 0.4, 13.4, 0.66, { umbrella: INK.sunYellow });
        }
      });
    }
    // The reader.
    body(R, 12.5, 13.4, { ...folk(91), ...LOUNGERS[0].look, skin: SKIN[3], hair: HAIR[0] }, {
      z: -0.28, depth: 26.0,
      pose: () => ({ pose: 'sit', dir: 'l', arms: [1.3, 1.1] }),
      after(ctx) { // the book, upside down
        const [X, Y] = P(12.5, 13.4, -0.28);
        ctx.save(); ctx.translate(X - 0.62, Y - 1.35); ctx.rotate(0.3);
        ctx.beginPath(); ctx.rect(-0.2, -0.28, 0.4, 0.5); paint(ctx, INK.funnelRed, { lw: 0.02 });
        if (Q.detail) { ctx.rotate(Math.PI); words(ctx, 'SHADES', 0, 0.02, 0.07, C.white, 'center', 900); words(ctx, 'OF BEIGE', 0, 0.12, 0.06, C.white, 'center', 800); }
        ctx.restore();
      },
    });
    // The snorer.
    body(R, 15.5, 13.4, { ...folk(92), ...LOUNGERS[1].look }, {
      z: -0.28, depth: 29.0, sick: LOUNGERS[1].sick,
      pose: () => ({ pose: 'sit', dir: 'l', arms: [0.2, 0.1] }),
    });
    R.air((ctx, t) => {
      if (hushed('snorer', t)) return;
      const k = pulse(t, 3.2, 0.7);
      noise(ctx, 15.0 - k * 0.4, 13.0, 2.6, k < 0.4 ? 'SNRRK' : 'ZZZ', k, 0.5 + k * 0.15);
    });
    // The chips man, and his bucket once he's green (he's fine, he says).
    body(R, 18.5, 13.4, { ...folk(93), ...LOUNGERS[2].look }, {
      z: -0.28, depth: 32.0, sick: LOUNGERS[2].sick,
      pose: (t) => ({ pose: 'sit', dir: 'l', arms: [1.3 + (hushed('chips', t) ? 0 : Math.sin(t * 7) * 0.25), 1.0] }),
      after(ctx, t, e, k) {
        const [X, Y] = P(18.5, 13.4, -0.28);
        const wig = hushed('chips', t) ? 0 : Math.sin(t * 7) * 0.05;
        ctx.save(); ctx.translate(X - 0.72, Y - 1.42 + wig); ctx.rotate(-0.2);
        ctx.beginPath(); ctx.moveTo(-0.18, -0.26); ctx.lineTo(0.18, -0.26); ctx.lineTo(0.16, 0.2); ctx.lineTo(-0.16, 0.2); ctx.closePath();
        paint(ctx, INK.sunYellow, { lw: 0.02 });
        if (Q.detail) words(ctx, 'CHIPS', 0, -0.03, 0.08, INK.funnelRed, 'center', 900);
        ctx.restore();
        if (k > 0.5) bucket(ctx, 19.5, 14.0, 0, { name: 'MINE' });
      },
    });
    R.air((ctx, t) => {
      if (hushed('chips', t)) return;
      const k = pulse(t, 2.2, 0.3);
      noise(ctx, 17.8, 13.4, 2.8, 'CRNKL', k, 0.48);
    });

    // ---------- Gloria's lounger ----------
    // Hers since day one. Her robe's folded on it until she's back (at 8, on
    // the day's clock); she sits on it till half past twelve.
    R.thing(19.1, 8.5, (ctx) => {
      lounger(ctx, 16.9, 7.5, 0, { along: 'x', color: C.white, towel: INK.flamingo });
      if (Q.detail) lettering(ctx, 'x', 18.1, 8.51, 0.33, 'GLORIA', 0.12, INK.funnelRed);
    }, { depth: 25.5 });
    // Her side table: magazines, cucumber water, her robe belt, and a pile of
    // appointment cards. Hers is the one with the cucumber on it.
    R.thing(20.2, 7.0, (ctx) => {
      cylinder(ctx, 19.7, 6.5, 0, 0.1, 0.62, MAT.steelDark);
      cylinder(ctx, 19.7, 6.5, 0.62, 0.62, 0.05, C.white);
      const z = 0.68;
      // The jug of cucumber water, at the back.
      cylinder(ctx, 20.05, 6.05, z, 0.13, 0.4, alpha(MAT.glass, 0.9), { flat: true, lw: 0.02 });
      const [jX, jY] = P(20.05, 6.05, z + 0.25);
      slice(ctx, jX, jY, 0.07, false);
      // Two magazines.
      face(ctx, [[19.15, 6.0, z], [19.55, 5.95, z], [19.6, 6.4, z], [19.2, 6.45, z]], INK.funnelRed, { lw: 0.015 });
      face(ctx, [[19.22, 6.05, z + 0.01], [19.6, 6.0, z + 0.01], [19.66, 6.42, z + 0.01], [19.28, 6.47, z + 0.01]], C.sky, { lw: 0.015 });
      // The robe belt, trailing off the front.
      ctx.beginPath();
      const b = [[19.9, 6.95], [20.15, 6.85], [20.3, 6.95], [20.45, 6.85]].map(([x, y]) => P(x, y, z));
      b.push(P(20.5, 6.9, z - 0.3));
      b.forEach(([X, Y], i) => (i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y)));
      ctx.lineCap = 'round';
      if (Q.lines) { ctx.strokeStyle = C.ink; ctx.lineWidth = 0.1; ctx.stroke(); }
      ctx.strokeStyle = C.white; ctx.lineWidth = 0.06; ctx.stroke();
      // The appointment cards: all the same card stock, all the spa's.
      const card = (x, y, rot, lines, doodle) => {
        const c = Math.cos(rot) * 0.2, s = Math.sin(rot) * 0.2, c2 = -Math.sin(rot) * 0.13, s2 = Math.cos(rot) * 0.13;
        face(ctx, [[x - c - c2, y - s - s2, z + 0.02], [x + c - c2, y + s - s2, z + 0.02], [x + c + c2, y + s + s2, z + 0.02], [x - c + c2, y - s + s2, z + 0.02]], C.white, { lw: 0.015 });
        if (!Q.detail) return;
        const [X, Y] = P(x, y, z + 0.02);
        ctx.save();
        ctx.transform(1, 0.5, -1, 0.5, X, Y); // flat on the table top
        ctx.rotate(rot);
        ctx.fillStyle = INK.flamingo; ctx.fillRect(-0.2, -0.13, 0.4, 0.05);
        lines.forEach((l, i) => words(ctx, l, -0.17, -0.03 + i * 0.07, 0.045, C.ink, 'left', 800));
        if (doodle) { // a little cucumber
          ctx.beginPath(); ctx.ellipse(0.12, 0.05, 0.055, 0.025, -0.4, 0, Math.PI * 2);
          paint(ctx, C.leaf, { lw: 0.01 });
        }
        ctx.restore();
      };
      card(19.98, 6.5, 0.4, ['HOT STONES', '2 TO 3'], false);
      card(19.85, 6.85, -0.3, ['SEAWEED', '4 TO 5'], false);
      card(19.38, 6.78, 0.5, ['MANICURE', '3 TO 4'], false);
      card(19.6, 6.4, 0.1, ['CUCUMBER MASK', '6 TO 11'], true);
    });
    R.find({ id: 'spa-card', label: "Gloria's spa card", at: [19.6, 6.4, 0.7], r: 0.8 });

    // ---------- The loud end ----------
    // The man on the phone, pacing under the NO PHONES sign. After she's been
    // over he whispers, for a bit.
    const LINES = ['BUY! BUY!', 'CAN YOU HEAR ME?', "I'M ON A BOAT!", 'NO, YOU HANG UP!', "I'M FINE. I'M FINE.", "TELL KAREN IT'S A YACHT"];
    const pace = route([[20.8, 4.8, 1.5], [23.4, 5.6, 1.0]], { speed: 1.1, loop: false });
    const DALE = { ...folk(95), skin: SKIN[1], hair: HAIR[1], style: 'short', top: C.white, bottom: C.coral, dress: false };
    R.mover(pace, (ctx, t, p) => {
      const k = green(t, at(11.2));
      const loud = !hushed('phone', t);
      person(ctx, p.x, p.y, 0, { ...DALE, skin: qz(DALE.skin, k), pose: p.moving ? 'walk' : 'stand', dir: p.dir, back: false, arms: [2.75, loud ? 0.9 + Math.sin(t * 5) * 0.5 : 0.2], phase: p.phase }, t);
      // The phone at his ear.
      const f = p.dir === 'l' ? -1 : 1, [X, Y] = P(p.x, p.y, 0);
      ctx.beginPath(); ctx.roundRect(X + f * 0.18 - 0.07, Y - 2.08, 0.14, 0.26, 0.03);
      paint(ctx, C.ink, { lw: 0.015 });
    });
    R.air((ctx, t) => {
      const p = pace(t);
      if (hushed('phone', t)) {
        if (since('phone', t) > SHUSH && pulse(t, 5) < 0.5) speech(ctx, p.x, p.y, 2.7, '(buy buy)', { size: 0.26 });
        return;
      }
      const i = Math.floor(t / 4) % LINES.length;
      if (pulse(t, 4) < 0.75) speech(ctx, p.x, p.y, 2.8, LINES[i], { size: 0.42 });
    });

    // The zen garden: three stones, a little rake, a man with a singing bowl
    // he hits every eight seconds.
    R.thing(23.4, 9.1, (ctx) => {
      for (const [x, y, r, h] of [[23.4, 9.0, 0.38, 0.45], [25.4, 9.9, 0.3, 0.35], [23.0, 10.3, 0.2, 0.22]]) {
        cylinder(ctx, x, y, 0, r, h, C.grey, { top: tint(C.grey, 0.2) });
      }
      board(ctx, 'x', 22.8, 10.85, 0.75, 1.3, 0.5, '', { board: C.white });
      lettering(ctx, 'x', 22.8, 10.86, 0.84, 'PLEASE DO NOT RAKE', 0.1, C.ink);
      lettering(ctx, 'x', 22.8, 10.86, 0.66, "YOU'RE DOING IT WRONG", 0.08, INK.funnelRed);
    });
    R.thing(24.5, 9.6, (ctx) => {
      cylinder(ctx, 24.5, 9.5, 0, 0.5, 0.3, INK.flamingo, { top: tint(INK.flamingo, 0.3) });
    });
    const MONK = { ...folk(96), skin: SKIN[2], hair: HAIR[4], style: 'bald', top: INK.sunYellow, bottom: INK.sunYellow, dress: false };
    body(R, 24.5, 9.5, MONK, {
      z: -0.4, depth: 34.2, sick: at(12.4),
      pose: (t) => {
        const strike = !hushed('bowl', t) && pulse(t, 8) < 0.1;
        return { pose: 'sit', dir: 'l', arms: [strike ? 1.8 : 1.1, 1.0] };
      },
      after(ctx, t) {
        const [X, Y] = P(23.9, 9.9, 0.05);
        ctx.beginPath(); ctx.ellipse(X, Y - 0.12, 0.22, 0.1, 0, 0, Math.PI); ctx.lineTo(X - 0.22, Y - 0.12);
        paint(ctx, MAT.brass, { lw: 0.02 });
        if (hushed('bowl', t) || !Q.detail) return;
        const k = pulse(t, 8);
        if (k < 0.5) {
          for (let i = 0; i < 3; i++) {
            const q = k * 2 - i * 0.15;
            if (q <= 0 || q >= 1) continue;
            ctx.beginPath(); ctx.ellipse(X, Y - 0.2, 0.3 + q * 1.4, 0.15 + q * 0.7, 0, 0, Math.PI * 2);
            ctx.strokeStyle = alpha(MAT.brass, 1 - q); ctx.lineWidth = 0.04; ctx.stroke();
          }
        }
      },
    });
    R.air((ctx, t) => {
      if (hushed('bowl', t)) return;
      const k = pulse(t, 8);
      if (k < 0.3) noise(ctx, 24.0, 10.2, 1.8, 'BONNNNG', k / 0.3, 0.6, shade(MAT.brass, 0.25));
    });
    // A palm at the very point, facing the sea like it paid for it.
    R.thing(29.6, 8.0, (ctx, t) => plant(ctx, 29.6, 8.0, 0, t, { kind: 'palm', scale: 1.1, potColor: INK.flamingo, leaf: C.leaf }), { anim: true });

    // The gull on the SERENITY sign: SKRAAW all day, till she gets to it at 2.
    // Then it flies out over the sea for an hour and a half, and comes back.
    const GULL = { x: 13.8, y: 0.0, z: 5.0 };
    R.mover((t) => {
      const s = since('gull', t);
      if (s < SHUSH || s > QUIET) return { x: GULL.x, y: GULL.y + 0.2, z: GULL.z, perch: true };
      const k = s < QUIET / 2 ? clamp((s - SHUSH) / 3) : clamp((QUIET - s) / 3);
      return { x: GULL.x + k * 6, y: GULL.y + 0.2 + k * 17, z: GULL.z - k * 1.5, fly: true, k };
    }, (ctx, t, p) => {
      if (p.fly && (p.k >= 1)) return;
      if (p.perch) {
        const scream = !hushed('gull', t) && pulse(t, 5, 2) < 0.2;
        gull(ctx, p.x, p.y, p.z, t, { dir: 'l', peck: !scream, phase: 1 });
        if (scream) noise(ctx, p.x - 0.8, p.y, p.z + 1.1, 'SKRAAW', pulse(t, 5, 2) / 0.2, 0.5);
        return;
      }
      gull(ctx, p.x, p.y, p.z, t, { fly: true, dir: 'r' });
    }, { depth: (t) => (since('gull', t) < SHUSH || since('gull', t) > QUIET ? -0.5 : 40) });

    // The waiter, round the deck with a tray of Green Mermaids and a Gander
    // Cola, all day. Crew: never green.
    const waiter = route([[1.6, 3.6, 2], [10.8, 4.6], [13.6, 11.0, 3], [17.8, 10.6], [20.8, 9.8, 3], [21.3, 6.6], [19.6, 3.0], [10, 2.9]], { speed: 1.3 });
    R.mover(waiter, (ctx, t, p) => {
      const look = { ...folk(97), ...CREW_LOOK, skin: SKIN[4], hair: HAIR[6], style: 'short' };
      person(ctx, p.x, p.y, 0, { ...look, pose: p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back, arms: [1.55, -0.1], phase: p.phase }, t);
      if (!Q.detail) return;
      // The tray, level in his hand.
      const f = p.dir === 'l' ? -1 : 1, [X, Y] = P(p.x, p.y, 0);
      const tx = X + f * 0.95, ty = Y - 1.55;
      ctx.beginPath(); ctx.ellipse(tx, ty, 0.42, 0.12, 0, 0, Math.PI * 2); paint(ctx, MAT.chrome, { lw: 0.02 });
      for (const dx of [-0.2, 0.05]) {
        ctx.beginPath(); ctx.moveTo(tx + dx - 0.07, ty - 0.34); ctx.lineTo(tx + dx - 0.05, ty); ctx.lineTo(tx + dx + 0.05, ty); ctx.lineTo(tx + dx + 0.07, ty - 0.34); ctx.closePath();
        paint(ctx, INK.queasyGreen, { lw: 0.015 });
      }
      ctx.beginPath(); ctx.rect(tx + 0.18, ty - 0.26, 0.12, 0.26); paint(ctx, INK.funnelRed, { lw: 0.015 });
    });

    // ---------- More guests ----------
    // Silent yoga by the SERENITY sign: three on mats, one of them wobbling
    // (and over, every fifteen seconds), the teacher facing them.
    R.rug((ctx) => {
      for (const [x, y, c] of [[13.4, 4.2, C.lilac], [15.0, 4.4, INK.sea], [16.6, 4.6, INK.flamingo]]) {
        rect(ctx, x - 0.45, y - 1.1, 0.9, 1.9, 0.01, c, { lw: 0.03, dots: shade(c, 0.3), density: 0.1 });
      }
      rect(ctx, 14.4, 6.1, 0.9, 1.4, 0.01, C.butter, { lw: 0.03 });
    });
    const YOGA = (t) => {
      const s = pulse(t, 15) * 15;
      return s < 6 ? [Math.PI - 0.25, -(Math.PI - 0.25)] : s < 11 ? [1.57, -1.57] : [0.3, -2.6];
    };
    const yogi = (x, y, seed, o = {}) => body(R, x, y, { ...folk(seed), dress: false, ...(o.look || {}) }, {
      sick: o.sick, depth: o.depth,
      pose: (t) => ({ pose: 'stand', dir: o.dir || 'l', back: o.back, arms: YOGA(t) }),
    });
    yogi(13.4, 4.2, 101, { look: { top: C.lilac, bottom: C.navy } });
    yogi(15.0, 4.4, 102, { sick: at(12), look: { top: C.teal, bottom: C.ink } });
    // The wobbler.
    R.thing(16.6, 4.6, (ctx, t) => {
      const s = pulse(t, 15, 3) * 15;
      const look = { ...folk(103), dress: false, top: INK.flamingo, bottom: C.navy, style: 'curly' };
      if (s > 12.4) { // over
        person(ctx, 16.9, 4.6, 0, { ...look, pose: 'lie', dir: 'l' }, t);
        if (s < 13.2) noise(ctx, 16.4, 4.4, 1.2, 'THUD', (s - 12.4) / 0.8, 0.5);
        return;
      }
      const [X, Y] = P(16.6, 4.6, 0), a = Math.sin(s * 3) * 0.06 * (1 + s / 3);
      ctx.save(); ctx.translate(X, Y); ctx.rotate(a); ctx.translate(-X, -Y);
      person(ctx, 16.6, 4.6, 0, { ...look, pose: 'stand', dir: 'l', arms: YOGA(t) }, t);
      ctx.restore();
    }, { anim: true });
    yogi(14.85, 6.8, 104, { dir: 'r', back: true, look: { ...CREW_LOOK, top: C.white, bottom: C.white, style: 'pony', hair: HAIR[7] } });

    // The silent disco, for one: the only quiet guest on the deck. She has
    // never once had to shush him.
    const DISCO = { ...folk(105), skin: SKIN[4], hair: HAIR[6], style: 'curly', top: C.purple, bottom: INK.sunYellow, dress: false,
      face(ctx, hy) {
        ctx.beginPath(); ctx.arc(0.02, hy - 0.05, 0.38, Math.PI * 1.05, Math.PI * 1.95);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.07; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(-0.1, hy + 0.02, 0.09, 0.15, 0, 0, Math.PI * 2);
        paint(ctx, INK.funnelRed, { lw: 0.02 });
      },
    };
    body(R, 27.0, 7.4, DISCO, {
      pose: (t) => ({ pose: 'dance', dir: pulse(t, 4) < 0.5 ? 'l' : 'r', speed: 5 }),
      after(ctx, t) {
        if (!Q.detail || pulse(t, 7) > 0.3) return;
        noise(ctx, 27.3, 7.4, 3.0, '(silence)', pulse(t, 7) / 0.3, 0.3, shade(C.purple, 0.2));
      },
    });

    // The towel lady by the tub: towels in, swans out.
    R.thing(2.6, 15.5, (ctx) => {
      box(ctx, 1.6, 14.6, 0.25, 1.9, 0.9, 0.85, C.white, { top: C.white, dens: 0.15 });
      for (const [dx, dy] of [[0.3, 0.15], [1.4, 0.15], [0.3, 0.75], [1.4, 0.75]]) disc(ctx, 1.6 + dx, 14.6 + dy, 0.1, 0.12, C.ink);
      for (let i = 0; i < 3; i++) box(ctx, 1.75, 14.7, 1.1 + i * 0.12, 0.7, 0.7, 0.11, i % 2 ? INK.flamingo : C.white, { flat: true, lw: 0.015 });
      lettering(ctx, 'x', 2.55, 15.51, 0.7, 'TOWELS', 0.2, INK.funnelRed);
    });
    R.thing(2.9, 15.0, (ctx, t) => {
      // Her swans, lined up on the cart: one more every twenty seconds.
      const n = 1 + (Math.floor(wrap(t) / 20) % 4);
      for (let i = 0; i < n; i++) {
        const [X, Y] = P(2.6 + i * 0.25, 15.0, 1.1);
        ctx.save(); ctx.translate(X, Y); ctx.scale(0.7, 0.7);
        ctx.beginPath(); ctx.ellipse(0, -0.14, 0.28, 0.14, 0, 0, Math.PI * 2); paint(ctx, C.white, { lw: 0.03 });
        ctx.beginPath(); ctx.moveTo(0.14, -0.2); ctx.quadraticCurveTo(0.34, -0.5, 0.18, -0.58); ctx.quadraticCurveTo(0.26, -0.44, 0.1, -0.26);
        paint(ctx, C.white, { lw: 0.03 });
        ctx.restore();
      }
    }, { anim: true, depth: 18.2 });
    body(R, 2.6, 13.9, { ...folk(106), ...CREW_LOOK, skin: SKIN[2], hair: HAIR[0], style: 'bun' }, {
      depth: 16.4, pose: (t) => ({ pose: 'stand', dir: 'l', arms: [1.3 + Math.sin(t * 3) * 0.3, 1.1 - Math.sin(t * 3) * 0.3] }),
    });

    // A stack of spa buckets by the towels, just in case.
    R.thing(3.9, 1.3, (ctx) => {
      for (let i = 0; i < 4; i++) bucket(ctx, 3.9, 1.0, i * 0.2, { color: INK.hullWhite, name: i === 3 ? 'SPA' : '' });
    });

    // ---------- The attendant ----------
    R.mover(attendantAt, (ctx, t, p) => {
      const shh = p.shush >= 0;
      const fold = !p.moving && !shh;
      person(ctx, p.x, p.y, 0, {
        ...ATTENDANT, pose: p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back, phase: p.phase,
        arms: shh ? [2.7, 0.3] : fold ? [1.1, 1.0] : undefined,
      }, t);
      // The finger, up.
      if (shh && !p.back) {
        const f = p.dir === 'l' ? -1 : 1, [X, Y] = P(p.x, p.y, 0);
        const hx = X + f * (0.22 + Math.sin(2.7) * 0.72), hy = Y - 1.53 + Math.cos(2.7) * 0.72;
        inked(ctx, [[hx, hy], [hx - f * 0.02, hy - 0.2]], ATTENDANT.skin, 0.07);
      }
    });
    // The SHHH!: the biggest thing on the deck. It pops, shakes, and fades.
    R.air((ctx, t) => {
      const p = attendantAt(t);
      if (p.shush < 0) {
        // Last thing at night, the verdict.
        const tt = wrap(t);
        if (tt > LEGS[11].shush + SHUSH + 2 && tt < LOOP - 6) speech(ctx, p.x, p.y, 2.8, 'Ahh. Serenity.', { size: 0.34 });
        return;
      }
      const k = p.shush;
      const pop = k < 0.12 ? ease(k / 0.12) * 1.15 : k < 0.2 ? 1.15 - ((k - 0.12) / 0.08) * 0.15 : 1;
      const [X, Y] = P(p.x, p.y, 2.7);
      ctx.save();
      ctx.globalAlpha = clamp((1 - k) * 5);
      ctx.translate(X, Y);
      ctx.scale(pop, pop);
      ctx.translate(Math.sin(t * 60) * 0.05, 0);
      speech(ctx, 0, 0, 0, 'SHHH!', { size: 1.25, fill: C.white, color: INK.funnelRed, dx: p.dir === 'l' ? 1.1 : -1.1 });
      // Shock lines round it.
      if (Q.detail) {
        ctx.strokeStyle = C.ink; ctx.lineWidth = 0.06; ctx.lineCap = 'round';
        for (let i = 0; i < 6; i++) {
          const a = -Math.PI * (0.1 + i * 0.16);
          const r0 = 2.9, r1 = 3.4 + (i % 2) * 0.3;
          const ox = p.dir === 'l' ? 1.1 : -1.1;
          ctx.beginPath(); ctx.moveTo(ox + Math.cos(a) * r0, -1.7 + Math.sin(a) * r0 * 0.55); ctx.lineTo(ox + Math.cos(a) * r1, -1.7 + Math.sin(a) * r1 * 0.55); ctx.stroke();
        }
      }
      ctx.restore();
    });

    R.find({ id: 'dnd-sign', label: 'A sign hung on a hot tub', at: [10.7, 13.6, 1.0], r: 0.8 });
  },
};
