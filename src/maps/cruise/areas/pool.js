// The Pool. The middle of the Sun Deck, open air: the pool, a row of loungers
// saved with towels since 5am and nobody on them, the Bottomless Bar against
// the far rail, the hot tub, the lifeboats. At 10 the lifeboat drill (only the
// goose is listening), at noon the limbo. The iguana has a lounger, and a
// drink. Keep the id: it's in links and saves.
import {
  C, Q, box, rect, disc, cylinder, face, poly, paint, person, folk, speech, label, note,
  shade, tint, mix, alpha, dots, SKIN, HAIR,
} from '../../../engine/art.js';
import { route, orbit, particles, pulse, clamp } from '../../../engine/actors.js';
import { deck, outline, lifeboat } from '../ship.js';
import { lounger, cocktail, bucket, towelAnimal, lifebuoy, board, lettering, gull, P, CREW_LOOK } from '../kit.js';
import { INK, MAT, green, queasy, verdict, wrap } from '../style.js';

// The pool (the hero), sunk in the deck: its edges, the water, its floor.
const PX0 = 12, PY0 = 5, PX1 = 24, PY1 = 11, WZ = -0.3, BED = -1.4;
// The hot tub: raised on a little teak platform.
const TUB = { x: 28.5, y: 5.5, r: 1.5, base: 0.3, rim: 0.85, water: 0.72 };
// The loungers along the cut side: x of each, all at y 12.6 but the iguana's.
const LOUNGERS = [2, 5.2, 8.4, 11.6, 14.4, 17.4, 20.6, 27.2, 30.4];
const IGUANA_LOUNGER = [24, 12];
// The limbo: two stands at x 8.5, y 7 and 9, and its rounds at noon.
const LIMBO = { x: 8.5, y0: 7, y1: 9, lane: 7.6 };
const ROUNDS = [102, 109, 116, 123]; // each round is 7 seconds
const HEIGHTS = [1.8, 1.4, 1.0, 0.65];
const JACKET = mix(C.coral, C.mustard, 0.3);

// A face at k green, in tenths (so the colour mixes stay few).
const qz = (skin, k) => queasy(skin, Math.round(k * 10) / 10);

// A life jacket, drawn over someone's torso (person's wear).
function jacket(ctx, b) {
  const h = b.hipY - b.top;
  ctx.beginPath();
  ctx.roundRect(-0.34, b.top - 0.05, 0.68, h - 0.02, 0.14);
  paint(ctx, JACKET, { lw: 0.03, dots: shade(JACKET, 0.4), density: 0.14 });
  ctx.beginPath();
  ctx.ellipse(0.02, b.top - 0.04, 0.3, 0.1, 0, 0, Math.PI * 2);
  paint(ctx, JACKET, { lw: 0.03 });
  if (!Q.detail) return;
  ctx.fillStyle = C.white;
  ctx.fillRect(-0.34, b.top + h * 0.55, 0.68, 0.05);
}

// Someone leaning back by a (radians), pivoting on their feet: the limbo.
function leaning(ctx, x, y, z, a, draw) {
  const [X, Y] = P(x, y, z);
  ctx.save();
  ctx.translate(X, Y);
  ctx.rotate(-a);
  ctx.translate(-X, -Y);
  draw();
  ctx.restore();
}

// A person at the zone's open ends fades in and out, so the drill's passers-by
// drift in from the waterslide and out to the bridge.
const edgeFade = (x) => clamp(Math.min(x + 0.8, 32.8 - x) / 1.2);

// A parasol: a pole and a striped canopy.
function parasol(ctx, x, y, a, b) {
  box(ctx, x - 0.05, y - 0.05, 0, 0.1, 0.1, 3.0, C.ink, { flat: true, stroke: false });
  const n = 10, r = 1.3, z = 2.9;
  const [ax, ay] = P(x, y, z + 0.65);
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    const [x0, y0] = P(x + Math.cos(a0) * r, y + Math.sin(a0) * r, z);
    const [x1, y1] = P(x + Math.cos(a1) * r, y + Math.sin(a1) * r, z);
    ctx.beginPath();
    ctx.moveTo(ax, ay); ctx.lineTo(x0, y0); ctx.lineTo(x1, y1); ctx.closePath();
    paint(ctx, i % 2 ? a : b, { lw: 0.035 });
  }
}

// A point on a lounger's back rest (u across it, v up it), for notes.
const rest = (x, y, u, v) => [x + u, y + 0.1 + 0.4 * v, 0.42 + 0.68 * v];

// A paper note on a lounger's back rest, with a word or two on it.
function restNote(ctx, x, y, text, paper = C.white) {
  face(ctx, [rest(x, y, 0.2, 0.3), rest(x, y, 0.8, 0.3), rest(x, y, 0.8, 0.85), rest(x, y, 0.2, 0.85)], paper, { lw: 0.02 });
  if (!Q.detail) return;
  const [cx, cy, cz] = rest(x, y, 0.5, 0.58);
  label(ctx, cx, cy, cz, text, 0.11, C.ink, 'Rethink Sans');
}

// A lounger, saved: towel, and whatever's been left to prove it.
function saved(ctx, x, y, o) {
  lounger(ctx, x, y, 0, { towel: o.towel, color: o.frame || C.white });
  if (Q.detail && o.stripe) {
    for (const k of [0.7, 1.5]) rect(ctx, x + 0.08, y + k, 0.84, 0.12, 0.475, o.stripe, { stroke: false });
  }
  if (o.book) {
    box(ctx, x + 0.25, y + 1.25, 0.47, 0.45, 0.32, 0.07, o.book, { flat: true, lw: 0.02 });
    if (Q.detail) rect(ctx, x + 0.25, y + 1.25, 0.45, 0.06, 0.545, C.white, { stroke: false });
  }
  if (o.hat) {
    disc(ctx, x + 0.5, y + 0.95, 0.5, 0.33, o.hat, { lw: 0.02 });
    const [X, Y] = P(x + 0.5, y + 0.95, 0.5);
    ctx.beginPath();
    ctx.ellipse(X, Y - 0.08, 0.2, 0.12, 0, Math.PI, 0);
    paint(ctx, o.hat, { lw: 0.02 });
    ctx.fillStyle = INK.flamingo;
    ctx.fillRect(X - 0.2, Y - 0.1, 0.4, 0.04);
  }
  if (o.animal) towelAnimal(ctx, x + 0.5, y + 1.4, 0.47, o.animal, o.animalColor || C.white);
  if (o.flops && Q.detail) {
    disc(ctx, x + 1.3, y + 1.4, 0.02, 0.14, o.flops, { lw: 0.02 });
    disc(ctx, x + 1.35, y + 1.75, 0.02, 0.14, o.flops, { lw: 0.02 });
  }
  if (o.note) restNote(ctx, x, y, o.note, o.paper);
}

// Chad's bar tab: a very long receipt on the bar, over its edge and down the
// front, a column of little green glasses printed on it, curled at the end.
function barTab(ctx) {
  const x0 = 22.36, x1 = 22.64, top = 1.23, edge = 2.93;
  face(ctx, [[x0, 1.95, top], [x1, 1.95, top], [x1, edge, top], [x0, edge, top]], C.white, { lw: 0.02 });
  // Down the front, with a little wave in it.
  ctx.beginPath();
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const z = top - i * 0.11, w = Math.sin(i * 0.9) * 0.03;
    pts.push([w, z]);
  }
  pts.forEach(([w, z], i) => { const [X, Y] = P(x0 + w, edge + 0.02, z); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
  for (let i = pts.length - 1; i >= 0; i--) { const [w, z] = pts[i]; const [X, Y] = P(x1 + w, edge + 0.02, z); ctx.lineTo(X, Y); }
  ctx.closePath();
  paint(ctx, C.white, { lw: 0.02 });
  // The curl at the bottom.
  const [cx, cy] = P((x0 + x1) / 2, edge + 0.08, top - 0.92);
  ctx.beginPath();
  ctx.ellipse(cx, cy, 0.17, 0.1, 0, 0, Math.PI * 2);
  paint(ctx, C.white, { lw: 0.02 });
  if (!Q.detail) return;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 0.08, 0.045, 0, 0, Math.PI * 2);
  ctx.strokeStyle = C.grey; ctx.lineWidth = 0.015; ctx.stroke();
  // The printing: a column of green glasses, one per Mermaid, and a total.
  const glass = (X, Y) => {
    ctx.beginPath();
    ctx.moveTo(X - 0.035, Y - 0.07); ctx.lineTo(X + 0.035, Y - 0.07); ctx.lineTo(X + 0.02, Y); ctx.lineTo(X - 0.02, Y);
    ctx.closePath();
    ctx.fillStyle = INK.queasyGreen; ctx.fill();
  };
  for (let i = 0; i < 4; i++) { const [X, Y] = P(22.46, 2.1 + i * 0.22, top); glass(X, Y); }
  for (let i = 0; i < 7; i++) { const [X, Y] = P(22.46 + Math.sin(i * 0.9) * 0.03, edge + 0.02, top - 0.08 - i * 0.11); glass(X, Y); }
  ctx.fillStyle = C.grey;
  for (let i = 0; i < 4; i++) { const [X, Y] = P(22.56, 2.1 + i * 0.22, top); ctx.fillRect(X, Y - 0.05, 0.07, 0.02); }
}

// An ordinary short receipt, and the rest of what sits on a bar.
function receipt(ctx, x, y, n = 1) {
  rect(ctx, x, y, 0.22, 0.34, 1.23, C.white, { lw: 0.02 });
  if (!Q.detail) return;
  for (let i = 0; i < n; i++) {
    const [X, Y] = P(x + 0.07, y + 0.1 + i * 0.1, 1.23);
    ctx.fillStyle = INK.queasyGreen;
    ctx.fillRect(X - 0.03, Y - 0.06, 0.05, 0.06);
  }
  const [X, Y] = P(x + 0.15, y + 0.2, 1.23);
  ctx.fillStyle = C.grey;
  ctx.fillRect(X, Y - 0.04, 0.06, 0.02);
}
function coaster(ctx, x, y, color) { disc(ctx, x, y, 1.23, 0.14, color, { lw: 0.02 }); }
function napkins(ctx, x, y) { box(ctx, x, y, 1.22, 0.3, 0.3, 0.09, C.white, { flat: true, lw: 0.02 }); }
function menuTent(ctx, x, y) {
  face(ctx, [[x, y, 1.22], [x + 0.36, y, 1.22], [x + 0.36, y + 0.1, 1.55], [x, y + 0.1, 1.55]], INK.sunYellow, { lw: 0.02 });
  face(ctx, [[x, y + 0.2, 1.22], [x + 0.36, y + 0.2, 1.22], [x + 0.36, y + 0.1, 1.55], [x, y + 0.1, 1.55]], tint(INK.sunYellow, 0.3), { lw: 0.02 });
  if (Q.detail) { const [X, Y] = P(x + 0.18, y + 0.15, 1.38); ctx.fillStyle = INK.queasyGreen; ctx.fillRect(X - 0.05, Y - 0.06, 0.1, 0.1); }
}

export default {
  id: 'pool',
  name: 'The Pool',
  blurb: 'Every lounger has had a towel on it since 5am and nobody on it. At the lifeboat drill, only one passenger is listening.',

  build(R) {
    const [ox, oy, oz] = R.origin;
    deck(R, 'pool', 'sun', { rails: true, grid: false, name: false });

    // ---------- The deck ----------
    // Teak planks along the ship, a shuffleboard court, the muster station's
    // box, and the non-slip round the pool.
    R.floor((ctx) => {
      ctx.save();
      poly(ctx, outline(R).map(([x, y]) => [x, y, 0]));
      ctx.clip();
      if (Q.detail) {
        ctx.beginPath();
        for (let j = 0.8; j < R.D; j += 0.8) {
          const a = P(0, j), b = P(R.W, j);
          ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
          const off = ((j * 7.3) % 4) + 0.5;
          for (let k = off; k < R.W; k += 4) {
            const c = P(k, j - 0.8), e = P(k, j);
            ctx.moveTo(c[0], c[1]); ctx.lineTo(e[0], e[1]);
          }
        }
        ctx.strokeStyle = MAT.teakDark;
        ctx.lineWidth = 0.03;
        ctx.stroke();
        poly(ctx, [[0, 0, 0], [R.W, 0, 0], [R.W, R.D, 0], [0, R.D, 0]]);
        ctx.fillStyle = dots(shade(INK.teak, 0.3), 0.08);
        ctx.fill();
      }
      ctx.restore();
    });
    R.rug((ctx) => {
      // Non-slip matting round the pool, the coping on its edge.
      rect(ctx, PX0 - 1.1, PY0 - 0.9, PX1 - PX0 + 2.2, PY1 - PY0 + 1.8, 0.005, tint(MAT.pool, 0.55), { stroke: false, dots: MAT.pool, density: 0.12 });
      rect(ctx, PX0 - 0.45, PY0 - 0.45, PX1 - PX0 + 0.9, PY1 - PY0 + 0.9, 0.01, C.white, { lw: 0.04 });
      if (Q.detail) {
        for (let x = PX0 - 0.45; x < PX1 + 0.4; x += 0.9) {
          face(ctx, [[x, PY0 - 0.45, 0.01], [x, PY0, 0.01]], null, { lw: 0.02, stroke: C.greyLight });
          face(ctx, [[x, PY1, 0.01], [x, PY1 + 0.45, 0.01]], null, { lw: 0.02, stroke: C.greyLight });
        }
        // Painted on the coping: the depths.
        textFloor(ctx, PX0 + 1.4, PY1 + 0.23, '3 FT', 0.26);
        textFloor(ctx, PX1 - 1.8, PY1 + 0.23, 'ALSO 3 FT', 0.26);
        textFloor(ctx, (PX0 + PX1) / 2, PY0 - 0.23, 'NO DIVING. NO BOMBS. NO BUFFET PLATES.', 0.2);
      }
      // The pool's inside: its two far walls and its floor.
      face(ctx, [[PX0, PY0, 0], [PX0, PY1, 0], [PX0, PY1, BED], [PX0, PY0, BED]], tint(MAT.pool, 0.25), { dots: shade(MAT.pool, 0.25), density: 0.25 });
      face(ctx, [[PX0, PY0, 0], [PX1, PY0, 0], [PX1, PY0, BED], [PX0, PY0, BED]], tint(MAT.pool, 0.1), { dots: shade(MAT.pool, 0.25), density: 0.2 });
      rect(ctx, PX0, PY0, PX1 - PX0, PY1 - PY0, BED, MAT.pool, { stroke: false });
      for (const ly of [6.5, 8, 9.5]) face(ctx, [[PX0 + 0.8, ly, BED], [PX1 - 0.8, ly, BED]], null, { lw: 0.16, stroke: alpha(C.navy, 0.35) });

      // Shuffleboard, half worn off.
      if (Q.detail) {
        face(ctx, [[1.5, 9.9, 0.005], [6, 9.9, 0.005], [6, 11.3, 0.005], [1.5, 11.3, 0.005]], null, { lw: 0.05, stroke: alpha(C.white, 0.7) });
        face(ctx, [[2, 10.1, 0.005], [3.4, 10.6, 0.005], [2, 11.1, 0.005]], null, { lw: 0.04, stroke: alpha(C.white, 0.7) });
        for (const [x, y, c] of [[3.6, 10.4, INK.funnelRed], [4.4, 10.9, INK.sunYellow], [2.4, 10.7, INK.funnelRed]]) disc(ctx, x, y, 0.02, 0.17, c, { lw: 0.02 });
      }

      // The muster station's box, where you stand when the ship sinks.
      face(ctx, [[13.6, 1.8, 0.005], [19.4, 1.8, 0.005], [19.4, 3.7, 0.005], [13.6, 3.7, 0.005]], alpha(INK.sunYellow, 0.35), { lw: 0.06, stroke: INK.sunYellow });
      if (Q.detail) {
        ctx.save();
        poly(ctx, [[13.6, 1.8, 0], [19.4, 1.8, 0], [19.4, 3.7, 0], [13.6, 3.7, 0]]);
        ctx.clip();
        ctx.beginPath();
        for (let k = 13.6; k < 19.6; k += 0.5) { const a = P(k, 3.7), b = P(k + 1.9, 1.8); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
        ctx.strokeStyle = alpha(INK.sunYellow, 0.8); ctx.lineWidth = 0.05; ctx.stroke();
        ctx.restore();
        textFloor(ctx, 14.5, 3.2, 'B', 0.6, C.ink);
      }

      // The sunbather's towel, on the floor: no loungers left.
      rect(ctx, 2.2, 2.75, 2.5, 0.9, 0.01, INK.flamingo, { lw: 0.02, dots: C.white, density: 0.3 });
    });

    // The water: ripples drifting over it, and a pool noodle nobody claims.
    R.rug((ctx, t) => {
      poly(ctx, [[PX0, PY0, WZ], [PX1, PY0, WZ], [PX1, PY1, WZ], [PX0, PY1, WZ]]);
      ctx.fillStyle = alpha(C.water, 0.78);
      ctx.fill();
      if (!Q.detail) return;
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = alpha(C.white, 0.75);
      ctx.lineWidth = 0.07;
      ctx.lineCap = 'round';
      for (let i = 0; i < 14; i++) {
        const y = PY0 + 0.4 + (i % 7) * 0.8 + (i > 6 ? 0.4 : 0);
        const x = PX0 + ((i * 2.9 + t * 0.35 * (i % 2 ? 1 : -0.7)) % (PX1 - PX0) + (PX1 - PX0)) % (PX1 - PX0);
        ctx.beginPath();
        for (let k = 0; k <= 5; k++) {
          const [X, Y] = P(x + k * 0.24, y + Math.sin(t * 2 + k + i) * 0.08, WZ);
          k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
        }
        ctx.stroke();
      }
      ctx.restore();
      // The noodle, drifting along the deep end (also 3 ft).
      const nx = 15.5 + Math.sin(t * 0.13) * 1.2, ny = 10.2 + Math.sin(t * 0.21) * 0.25;
      const [a, b] = P(nx - 0.9, ny + 0.2, WZ + 0.05), [c, d] = P(nx + 0.9, ny - 0.2, WZ + 0.05);
      ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d);
      ctx.lineCap = 'round';
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.28; ctx.stroke();
      ctx.strokeStyle = INK.flamingo; ctx.lineWidth = 0.2; ctx.stroke();
    }, { anim: true });

    // ---------- The far rail ----------
    R.decor((ctx) => {
      for (const x of [8, 11, 31]) lifebuoy(ctx, x, 0.65, 0.38);
      // The muster station's sign, up on two posts.
      face(ctx, [[14, 0.05, 0.9], [14, 0.05, 2.6]], null, { lw: 0.08 });
      face(ctx, [[17.8, 0.05, 0.9], [17.8, 0.05, 2.6]], null, { lw: 0.08 });
      face(ctx, [[13.8, 0.05, 1.45], [18, 0.05, 1.45], [18, 0.05, 2.65], [13.8, 0.05, 2.65]], INK.sunYellow, { lw: 0.05 });
      lettering(ctx, 'x', 15.9, 0.05, 2.28, 'MUSTER STATION B', 0.34);
      lettering(ctx, 'x', 15.9, 0.05, 1.88, 'In an emergency, walk calmly.', 0.17);
      lettering(ctx, 'x', 15.9, 0.05, 1.64, 'Do not stop at the buffet.', 0.17);
    });

    // Two flagpoles at the corners, and signal flags strung between them.
    for (const x of [0.6, 31.4]) {
      R.thing(x, 0.45, (ctx) => {
        box(ctx, x - 0.06, 0.34, 0, 0.12, 0.12, 6.2, C.white, { flat: true, lw: 0.03 });
        disc(ctx, x, 0.4, 6.25, 0.12, MAT.brass, { lw: 0.03 });
      });
    }
    const FLAGS = [INK.funnelRed, INK.sunYellow, C.navy, C.white, INK.flamingo, C.sky, INK.sunYellow, INK.funnelRed];
    R.air((ctx, t) => {
      if (!Q.detail) return;
      const a = [0.6, 0.4, 6], b = [31.4, 0.4, 6], n = 22;
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const k = i / n;
        pts.push([a[0] + (b[0] - a[0]) * k, 0.4, 6 - Math.sin(k * Math.PI) * 1.1]);
      }
      ctx.beginPath();
      pts.forEach((p, i) => { const [X, Y] = P(...p); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.035; ctx.stroke();
      for (let i = 1; i < n; i++) {
        const [X, Y] = P(...pts[i]);
        const sw = Math.sin(t * 4 + i * 0.7) * 0.1;
        ctx.beginPath();
        if (i % 3) { ctx.moveTo(X - 0.25, Y); ctx.lineTo(X + 0.25, Y); ctx.lineTo(X + sw, Y + 0.6); }
        else ctx.rect(X - 0.22 + sw * 0.3, Y, 0.44, 0.44);
        ctx.closePath();
        paint(ctx, FLAGS[i % FLAGS.length], { lw: 0.025 });
      }
    });

    // The lifeboats, hanging from their davits over the far rail.
    for (const [x, name] of [[2, 'BOTTOMLESS 3'], [26, 'BOTTOMLESS 4']]) {
      R.thing(x + 2.2, 1.3, (ctx) => {
        for (const dx of [0.5, 4]) {
          const [A, B] = P(x + dx, 0.05, 0), [E, F] = P(x + dx, 0.05, 4.2), [G, H] = P(x + dx, 0.7, 4.3);
          ctx.beginPath(); ctx.moveTo(A, B); ctx.lineTo(E, F); ctx.quadraticCurveTo(E + 0.1, F - 0.5, G, H);
          ctx.lineCap = 'round';
          ctx.strokeStyle = C.ink; ctx.lineWidth = 0.2; ctx.stroke();
          ctx.strokeStyle = C.white; ctx.lineWidth = 0.12; ctx.stroke();
          const [I, J] = P(x + dx, 0.7, 3.45);
          ctx.beginPath(); ctx.moveTo(G, H); ctx.lineTo(I, J); ctx.strokeStyle = C.ink; ctx.lineWidth = 0.03; ctx.stroke();
        }
        lifeboat(ctx, x, 0.1, 2.2, 4.5);
        lettering(ctx, 'x', x + 2.25, 1.3, 2.6, name, 0.26);
        lettering(ctx, 'x', x + 2.25, 1.3, 2.35, 'CAPACITY 40 (35 AFTER BUFFET)', 0.12);
      });
    }
    // A gull on the second lifeboat, keeping watch.
    R.thing(28.4, 1.2, (ctx, t) => gull(ctx, 28.4, 0.7, 3.45, t, { peck: true, dir: 'l', phase: 2 }), { anim: true });

    // The life jacket locker by the muster station: one left, goose-sized.
    R.thing(12.3, 1.1, (ctx) => {
      box(ctx, 11.2, 0.15, 0, 2.2, 0.9, 1.5, C.white, { flat: true });
      face(ctx, [[11.3, 1.05, 0.1], [12.2, 1.05, 0.1], [12.2, 1.05, 1.4], [11.3, 1.05, 1.4]], shade(C.white, 0.35), { lw: 0.03 });
      face(ctx, [[11.3, 1.05, 0.1], [11.3, 1.9, 0.1], [11.3, 1.9, 1.4], [11.3, 1.05, 1.4]], C.white, { lw: 0.03 });
      box(ctx, 11.5, 0.5, 0.15, 0.5, 0.35, 0.3, JACKET, { flat: true, lw: 0.02 });
      lettering(ctx, 'x', 12.8, 1.05, 1.1, 'LIFE', 0.2);
      lettering(ctx, 'x', 12.8, 1.05, 0.85, 'JACKETS', 0.2);
      lettering(ctx, 'x', 12.8, 1.05, 0.5, '(1 LEFT)', 0.13);
    });
    // The drill's beacon, on the muster sign: it flashes from 10 till 11.
    R.thing(18, 0.4, (ctx, t) => {
      const w = wrap(t);
      const on = w > 58 && w < 92 && pulse(w, 0.8) < 0.5;
      box(ctx, 17.85, 0.15, 2.6, 0.3, 0.3, 0.12, C.grey, { flat: true, lw: 0.02 });
      cylinder(ctx, 18, 0.3, 2.72, 0.14, 0.24, on ? INK.sunYellow : shade(JACKET, 0.2), { flat: true });
      if (on && Q.detail) {
        const [X, Y] = P(18, 0.3, 2.85);
        ctx.strokeStyle = alpha(INK.sunYellow, 0.9); ctx.lineWidth = 0.05;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          ctx.beginPath(); ctx.moveTo(X + Math.cos(a) * 0.3, Y + Math.sin(a) * 0.3); ctx.lineTo(X + Math.cos(a) * 0.55, Y + Math.sin(a) * 0.55); ctx.stroke();
        }
      }
    }, { anim: true });

    // ---------- The Bottomless Bar ----------
    // The back bar against the rail: bottles, the name, the menu.
    R.thing(22, 0.55, (ctx) => {
      box(ctx, 19.2, 0.1, 0, 5.6, 0.45, 1.8, MAT.teakDark);
      for (const [z, n] of [[0.95, 12], [1.45, 11]]) {
        for (let i = 0; i < n; i++) {
          const x = 19.45 + i * 0.44 + (z > 1 ? 0.2 : 0);
          const c = [C.green, MAT.brass, C.white, INK.funnelRed, C.leaf, C.sky][(i * 5 + n) % 6];
          cylinder(ctx, x, 0.4, z, 0.08, 0.34, c, { flat: true });
        }
        box(ctx, 19.25, 0.1, z - 0.04, 5.5, 0.5, 0.04, INK.teak, { flat: true, lw: 0.02 });
      }
      for (const x of [19.25, 24.75]) box(ctx, x - 0.08, 0.2, 0, 0.16, 0.16, 3.6, INK.teak, { flat: true });
      board(ctx, 'x', 22, 0.35, 3.15, 5.4, 0.7, 'BOTTOMLESS BAR', { board: INK.flamingo, size: 0.42 });
      board(ctx, 'x', 21, 0.5, 2.3, 3.2, 0.9, '', { board: C.ink });
      lettering(ctx, 'x', 21, 0.5, 2.55, 'GREEN MERMAID  $14', 0.2, INK.sunYellow);
      lettering(ctx, 'x', 21, 0.5, 2.3, 'TWO FOR  $30', 0.2, C.white);
      lettering(ctx, 'x', 21, 0.5, 2.05, 'GANDER COLA  $6', 0.2, C.white);
    });
    // Gander Cola's cooler, at the end of the bar.
    R.thing(26, 1.1, (ctx) => {
      box(ctx, 25.4, 0.15, 0, 1.2, 0.9, 1.1, INK.funnelRed, { top: tint(INK.funnelRed, 0.2) });
      lettering(ctx, 'x', 26, 1.05, 0.72, 'GANDER', 0.22, C.white);
      lettering(ctx, 'x', 26, 1.05, 0.46, 'Take a gander.', 0.13, C.white);
      for (let i = 0; i < 3; i++) cylinder(ctx, 25.7 + i * 0.3, 0.6, 1.1, 0.1, 0.22, INK.funnelRed, { flat: true, top: MAT.chrome });
    });
    // Complimentary buckets, stacked by the cooler.
    R.thing(26.4, 2.4, (ctx) => {
      for (let i = 0; i < 3; i++) bucket(ctx, 26.4, 2.2, i * 0.18);
      board(ctx, 'y', 26.95, 2.2, 1.0, 0.8, 0.28, 'FREE', { board: C.white, size: 0.16 });
    });

    // The bar counter, in four lengths so people sort in front of it, and
    // everything on it.
    const top = (ctx, x0, x1) => {
      box(ctx, x0, 1.45, 0, x1 - x0, 1.3, 1.1, MAT.teakDark, { dens: 0.18 });
      if (Q.detail) {
        for (let x = x0 + 0.375; x < x1; x += 0.75) face(ctx, [[x, 2.75, 0.15], [x, 2.75, 0.95]], null, { lw: 0.03, stroke: shade(MAT.teakDark, 0.3) });
      }
      box(ctx, x0, 1.25, 1.1, x1 - x0, 1.68, 0.12, tint(INK.teak, 0.3), { flat: true, lw: 0.03 });
    };
    R.thing(19.75, 2.9, (ctx) => {
      top(ctx, 19, 20.5);
      if (!Q.detail) return;
      coaster(ctx, 19.5, 2.2, INK.flamingo);
      cocktail(ctx, 19.5, 2.2, 1.23);
      napkins(ctx, 19.9, 1.45);
      receipt(ctx, 20.1, 2.3, 1);
    });
    R.thing(21.25, 2.9, (ctx) => {
      top(ctx, 20.5, 22);
      if (!Q.detail) return;
      coaster(ctx, 20.9, 2.3, C.white);
      cocktail(ctx, 20.9, 2.3, 1.23);
      menuTent(ctx, 21.1, 1.4);
      receipt(ctx, 21.55, 2.15, 2);
      coaster(ctx, 21.7, 2.7, INK.sunYellow);
    });
    R.thing(22.75, 2.9, (ctx) => {
      top(ctx, 22, 23.5);
      barTab(ctx);
      if (!Q.detail) return;
      coaster(ctx, 22.1, 2.55, INK.flamingo);
      cocktail(ctx, 22.1, 2.55, 1.23);
      coaster(ctx, 23.1, 2.5, C.white);
      cocktail(ctx, 23.1, 2.5, 1.23, { umbrella: INK.sunYellow });
      receipt(ctx, 22.9, 1.55, 1);
      napkins(ctx, 23.05, 1.4);
    });
    R.thing(24.25, 2.9, (ctx) => {
      top(ctx, 23.5, 25);
      if (!Q.detail) return;
      menuTent(ctx, 23.7, 1.45);
      receipt(ctx, 23.8, 2.3, 0);
      // A tip jar for the doctor, and a bowl of limes.
      cylinder(ctx, 24.35, 1.75, 1.22, 0.14, 0.3, alpha(MAT.glass, 0.8), { flat: true });
      label(ctx, 24.35 - 0, 1.75, 1.36, 'TIPS', 0.09, C.ink, 'Rethink Sans');
      disc(ctx, 24.4, 2.55, 1.24, 0.2, C.white, { lw: 0.02 });
      for (const [dx, dy] of [[-0.06, 0], [0.07, 0.04], [0, -0.07]]) disc(ctx, 24.4 + dx, 2.55 + dy, 1.28, 0.07, C.leaf, { lw: 0.015 });
    });
    // Bar stools, one with a sun hat on it (saved).
    for (const x of [19.8, 20.9, 24.3]) {
      R.thing(x, 3.4, (ctx) => {
        cylinder(ctx, x, 3.35, 0, 0.06, 0.9, C.grey, { flat: true });
        cylinder(ctx, x, 3.35, 0.88, 0.26, 0.08, INK.flamingo, { flat: true });
        if (x > 24) {
          disc(ctx, x, 3.35, 0.97, 0.3, C.butter, { lw: 0.02 });
          const [X, Y] = P(x, 3.35, 0.97);
          ctx.beginPath(); ctx.ellipse(X, Y - 0.06, 0.18, 0.1, 0, Math.PI, 0); paint(ctx, C.butter, { lw: 0.02 });
        }
      });
    }
    // The barman: a Green Mermaid a minute, shaken, not stirred.
    R.thing(24.2, 0.85, (ctx, t) => {
      const shake = Math.sin(t * 14) * 0.25;
      person(ctx, 24.2, 0.85, 0, {
        ...folk(31), ...CREW_LOOK, skin: SKIN[3], hair: HAIR[6], style: 'short', dir: 'l',
        arms: [2.6 + shake, 2.4 - shake],
        wear(c, b) { c.fillStyle = C.ink; c.beginPath(); c.moveTo(-0.1, b.top + 0.02); c.lineTo(0.14, b.top + 0.1); c.lineTo(0.14, b.top + 0.02); c.lineTo(-0.1, b.top + 0.1); c.fill(); },
      }, t);
      // The shaker, over his head.
      const [X, Y] = P(24.2, 0.85, 2.75 + shake * 0.2);
      ctx.beginPath(); ctx.roundRect(X - 0.12, Y - 0.2, 0.24, 0.42, 0.08); paint(ctx, MAT.chrome, { lw: 0.025 });
    }, { anim: true });
    // A gull on the end of the bar, working through someone's chips.
    R.thing(24.8, 2.95, (ctx, t) => {
      disc(ctx, 24.55, 2.35, 1.24, 0.2, C.white, { lw: 0.02 });
      if (Q.detail) for (let i = 0; i < 5; i++) rect(ctx, 24.45 + (i % 3) * 0.07, 2.25 + i * 0.04, 0.05, 0.15, 1.26, C.butter, { stroke: false });
      gull(ctx, 24.75, 2.2, 1.23, t, { peck: true, dir: 'l', scale: 0.85 });
    }, { anim: true });

    // The couple at the bar, their backs to us, since breakfast.
    const barFolk = [
      { x: 19.8, seed: 44, sick: 100, look: { hat: 'sun' } },
      { x: 20.9, seed: 52, sick: 116, look: { dress: true } },
    ];
    for (const b of barFolk) {
      const look = { ...folk(b.seed), ...b.look };
      R.thing(b.x, 3.36, (ctx, t) => {
        const k = green(t, b.sick);
        person(ctx, b.x, 3.36, 0.24, { ...look, skin: qz(look.skin, k), pose: 'sit', dir: 'r', back: true }, t);
      }, { anim: true });
    }
    // Then a bucket turns up between them.
    R.thing(20.35, 3.9, (ctx, t) => { if (wrap(t) > 118) bucket(ctx, 20.35, 3.8, 0); }, { anim: true });

    // ---------- The loungers ----------
    const TOWELS = [
      null,
      { towel: INK.flamingo, stripe: C.white, book: C.navy, note: 'SAVED' },
      { towel: C.sky, stripe: C.white, hat: C.butter, flops: INK.sunYellow },
      { towel: INK.sunYellow, stripe: INK.funnelRed, note: 'MINE', animal: 'swan' },
      { towel: C.white, stripe: C.sky, book: INK.funnelRed, flops: C.coral },
      { towel: INK.flamingo, stripe: INK.sunYellow, note: 'RESERVED 5AM', hat: C.white },
      { towel: C.sky, stripe: INK.sunYellow, animal: 'elephant', animalColor: C.white, book: C.teal },
      { towel: INK.sunYellow, stripe: C.white, note: 'BACK IN 5', flops: C.navy },
      { towel: C.white, stripe: INK.flamingo, hat: C.butter, book: C.purple },
    ];
    LOUNGERS.forEach((x, i) => {
      if (!i) return;
      R.thing(x + 1, 14.8, (ctx) => saved(ctx, x, 12.6, TOWELS[i]));
    });
    // The end one, reserved since the ship left: a faded towel, a paper sign,
    // cobwebs, and a drink that dried up on day two.
    R.thing(3, 14.8, (ctx) => {
      const x = 2, y = 12.6;
      const faded = tint(C.sky, 0.45);
      lounger(ctx, x, y, 0, { towel: faded, color: tint(C.greyLight, 0.3) });
      if (Q.detail) {
        poly(ctx, [[x + 0.08, y + 0.4, 0.475], [x + 0.92, y + 0.4, 0.475], [x + 0.92, y + 2, 0.475], [x + 0.08, y + 2, 0.475]]);
        ctx.fillStyle = dots(C.grey, 0.35);
        ctx.fill();
        for (const k of [0.7, 1.5]) rect(ctx, x + 0.08, y + k, 0.84, 0.12, 0.475, tint(C.white, 0.2), { stroke: false });
      }
      restNote(ctx, x, y, 'RESERVED DAY 1', tint(C.butter, 0.4));
      if (Q.detail) {
        // Cobwebs, from the back rest to the frame.
        ctx.strokeStyle = alpha(C.white, 0.9);
        ctx.lineWidth = 0.015;
        for (const [a, b] of [[rest(x, y, 0, 1), [x + 0.1, y + 0.9, 0.42]], [rest(x, y, 1, 1), [x + 0.9, y + 0.9, 0.42]], [rest(x, y, 0, 0.6), [x + 0.1, y + 1.2, 0.42]]]) {
          for (let k = 0; k < 3; k++) {
            const [A, B] = P(...a), [E, F] = P(...b);
            ctx.beginPath(); ctx.moveTo(A, B + k * 0.05); ctx.quadraticCurveTo((A + E) / 2, (B + F) / 2 + 0.15, E, F - k * 0.05); ctx.stroke();
          }
        }
        // A spider, minding it.
        const [SX, SY] = P(...rest(x, y, 0.92, 0.95));
        ctx.fillStyle = C.ink;
        ctx.beginPath(); ctx.arc(SX, SY + 0.12, 0.035, 0, Math.PI * 2); ctx.fill();
      }
      // The dried-up drink, on the deck beside it.
      cocktail(ctx, x + 1.3, y + 1.6, 0, { color: mix(C.greyLight, INK.queasyGreen, 0.3), umbrella: tint(INK.flamingo, 0.5) });
      if (Q.detail) {
        const [X, Y] = P(x + 1.3, y + 1.6, 0);
        ctx.fillStyle = alpha(C.greyLight, 0.9); ctx.fillRect(X - 0.08, Y - 0.4, 0.16, 0.26);
      }
    });
    R.find({ id: 'towel', label: 'A lounger reserved since day one', at: [2.5, 13.8, 0.6], r: 0.8 });

    // The iguana's lounger (it's on the clock: the engine draws it lying
    // here all day), with a Green Mermaid on the side table.
    R.thing(IGUANA_LOUNGER[0], IGUANA_LOUNGER[1], (ctx) => {
      const [x, y] = IGUANA_LOUNGER;
      saved(ctx, x, y, { towel: C.white, stripe: INK.funnelRed });
    });
    R.thing(24.4, 11.5, (ctx) => {
      cylinder(ctx, 24.4, 11.5, 0, 0.05, 0.6, C.ink, { flat: true, stroke: false });
      disc(ctx, 24.4, 11.5, 0.6, 0.32, C.white, { lw: 0.03 });
      cocktail(ctx, 24.35, 11.5, 0.62);
    });
    // Its sunglasses, and at the reveal, the towel over it.
    const ig = R.walkers.find((w) => w.id === 'iguana');
    if (ig) {
      R.mover((t) => {
        const p = ig.at(t);
        return { x: p.x - ox, y: p.y - oy, z: (p.z || 0) - oz, dir: p.dir, moving: p.moving };
      }, (ctx, t, p) => {
        if (p.x < 0 || p.x > R.W || p.y < 0 || p.y > R.D || Math.abs(p.z) > 0.5) return;
        const [X, Y] = P(p.x, p.y, p.z);
        const s = p.dir === 'l' ? -1 : 1;
        ctx.save();
        ctx.translate(X, Y);
        ctx.scale(s, 1);
        ctx.fillStyle = C.ink;
        ctx.beginPath();
        ctx.ellipse(0.62, -0.37, 0.07, 0.05, 0, 0, Math.PI * 2);
        ctx.ellipse(0.76, -0.36, 0.07, 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(0.5, -0.39, 0.3, 0.02);
        if (verdict.solved != null && !p.moving) {
          // A beach towel, over everything but the tail.
          ctx.beginPath();
          ctx.moveTo(-0.62, -0.1); ctx.quadraticCurveTo(-0.5, -0.62, 0.2, -0.6);
          ctx.quadraticCurveTo(0.9, -0.62, 0.95, -0.12); ctx.lineTo(0.7, -0.02); ctx.lineTo(0.3, -0.12); ctx.lineTo(-0.1, -0.02); ctx.lineTo(-0.4, -0.12);
          ctx.closePath();
          paint(ctx, INK.flamingo, { lw: 0.03, dots: C.white, density: 0.35 });
        }
        ctx.restore();
      }, { bias: 0.05 });
    }

    // Parasols between the loungers.
    for (const [x, a, b] of [[4.1, INK.flamingo, C.white], [7.3, INK.sunYellow, C.white], [29.3, INK.funnelRed, C.white]]) {
      R.thing(x, 12.3, (ctx) => parasol(ctx, x, 12.3, a, b));
    }
    // The sign that everyone read, and then saved a lounger anyway.
    R.thing(1, 12.1, (ctx) => {
      box(ctx, 0.95, 11.95, 0, 0.1, 0.1, 1.5, C.ink, { flat: true, stroke: false });
      board(ctx, 'y', 1.05, 12, 1.9, 1.9, 0.8, '', { board: C.white });
      lettering(ctx, 'y', 1.06, 12, 2.1, 'LOUNGERS MAY NOT', 0.18);
      lettering(ctx, 'y', 1.06, 12, 1.85, 'BE RESERVED', 0.18);
      lettering(ctx, 'y', 1.06, 12, 1.63, 'The Management', 0.12);
    });
    // Gloria's canvas chair for the afternoon (she's on the clock).
    R.thing(13.8, 11.7, (ctx) => {
      for (const [lx, ly] of [[13.5, 11.6], [14.4, 11.6], [13.5, 12.4], [14.4, 12.4]]) box(ctx, lx, ly, 0, 0.07, 0.07, 0.55, MAT.teakDark, { flat: true, stroke: false });
      face(ctx, [[13.5, 11.6, 0.55], [14.5, 11.6, 0.55], [14.5, 12.45, 0.5], [13.5, 12.45, 0.5]], MAT.canvas, { lw: 0.03 });
      face(ctx, [[13.5, 11.55, 0.55], [14.5, 11.55, 0.55], [14.5, 11.45, 1.4], [13.5, 11.45, 1.4]], INK.flamingo, { lw: 0.03 });
    });

    // ---------- The hot tub ----------
    R.thing(TUB.x, TUB.y + 1.4, (ctx) => {
      box(ctx, 26.8, 3.8, 0, 3.4, 3.4, TUB.base, MAT.teakDark, { top: INK.teak });
      box(ctx, 27.9, 7.2, 0, 1.2, 0.35, 0.15, INK.teak, { flat: true });
      cylinder(ctx, TUB.x, TUB.y, TUB.base, TUB.r + 0.1, TUB.rim - TUB.base, C.white, { top: C.white });
      disc(ctx, TUB.x, TUB.y, TUB.water, TUB.r - 0.02, MAT.pool, { lw: 0.03, dots: C.white, density: 0.2 });
    });
    // The soakers, the bubbles, and the steam. One of them came in his life
    // jacket for the drill and fell asleep.
    const SOAK = [
      { x: 27.7, y: 4.8, seed: 61, dir: 'r', sick: 106, look: { hat: 'sun' } },
      { x: 29.5, y: 5.2, seed: 67, dir: 'l', sick: 124 },
      { x: 28.3, y: 6.3, seed: 73, dir: 'r', sick: null, drill: true, look: { style: 'bald' } },
    ];
    R.thing(TUB.x + 0.3, TUB.y + 1.6, (ctx, t) => {
      const w = wrap(t);
      const [X, Y] = P(TUB.x, TUB.y, TUB.water);
      const rx = TUB.r * Math.SQRT2, ry = rx / 2;
      if (Q.detail) {
        particles(t, 10, 1.6, (k, r) => {
          const a = r() * Math.PI * 2, d = r() * TUB.r * 0.8;
          const [bx, by] = P(TUB.x + Math.cos(a) * d, TUB.y + Math.sin(a) * d, TUB.water + k * 0.12);
          ctx.beginPath(); ctx.arc(bx, by, 0.05 + k * 0.05, 0, Math.PI * 2);
          ctx.strokeStyle = alpha(C.white, 1 - k); ctx.lineWidth = 0.025; ctx.stroke();
        }, 7);
      }
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(X, Y, rx, ry, 0, 0, Math.PI * 2);
      ctx.rect(X - rx, Y - 6, rx * 2, 6);
      ctx.clip();
      for (const s of SOAK) {
        const look = { ...folk(s.seed), ...(s.look || {}) };
        const asleep = s.drill && w > 58 && w < 94;
        person(ctx, s.x, s.y, TUB.water - 0.78, { ...look, skin: qz(look.skin, green(t, s.sick)), pose: 'swim', dir: s.dir, arms: [0.9, 0.7], wear: asleep ? jacket : undefined }, t);
        if (asleep && Q.detail) {
          const k = (t * 0.6) % 1;
          label(ctx, s.x - 0.4 * k, s.y - 0.4 * k, 2.2 + k, 'z', 0.4 + k * 0.2, alpha(C.ink, 1 - k));
        }
      }
      ctx.restore();
      if (Q.detail) {
        particles(t, 5, 3, (k, r) => {
          const [sx, sy] = P(TUB.x - 0.8 + r() * 1.6, TUB.y - 0.6 + r() * 1.2, TUB.water + 0.3 + k * 2.2);
          ctx.beginPath(); ctx.arc(sx + Math.sin(k * 5) * 0.15, sy, 0.2 + k * 0.3, 0, Math.PI * 2);
          ctx.fillStyle = alpha(C.white, 0.35 * (1 - k)); ctx.fill();
        }, 9);
      }
    }, { anim: true });
    R.thing(31, 3.4, (ctx) => {
      box(ctx, 30.95, 3.35, 0, 0.1, 0.1, 1.4, C.ink, { flat: true, stroke: false });
      board(ctx, 'y', 31.05, 3.4, 1.75, 1.6, 0.75, '', { board: C.white });
      lettering(ctx, 'y', 31.06, 3.4, 1.95, 'HOT TUB. MAX 6.', 0.17);
      lettering(ctx, 'y', 31.06, 3.4, 1.7, 'PLEASE DO NOT', 0.15);
      lettering(ctx, 'y', 31.06, 3.4, 1.5, 'SIMMER.', 0.15);
    });

    // The lifeguard, up on his chair, with one rule nobody keeps.
    R.thing(29.5, 10.7, (ctx) => {
      for (const [lx, ly] of [[29.1, 9.9], [29.8, 9.9], [29.1, 10.6], [29.8, 10.6]]) box(ctx, lx, ly, 0, 0.1, 0.1, 2.2, C.white, { flat: true, lw: 0.03 });
      for (const z of [0.7, 1.4]) face(ctx, [[29.85, 9.9, z], [29.85, 10.7, z]], null, { lw: 0.05 });
      box(ctx, 29.05, 9.85, 2.2, 0.9, 0.9, 0.12, INK.funnelRed);
      box(ctx, 29.05, 9.85, 2.32, 0.12, 0.9, 0.9, INK.funnelRed);
      // His rescue tube, hung on the leg.
      face(ctx, [[29.9, 10.7, 0.2], [29.9, 10.7, 1.6]], null, { lw: 0.16, stroke: INK.funnelRed });
    });
    R.thing(29.7, 10.9, (ctx, t) => {
      const w = wrap(t);
      const shout = pulse(w, 17, 4) > 0.8;
      person(ctx, 29.5, 10.3, 1.6, { skin: SKIN[1], hair: HAIR[3], style: 'short', top: INK.funnelRed, bottom: INK.funnelRed, hat: 'sun', pose: shout ? 'point' : 'sit', dir: 'r' }, t);
      if (shout && Q.detail) speech(ctx, 29.3, 10.1, 4.9, 'Towels are not people!', { size: 0.42 });
    }, { anim: true });

    // ---------- The pool ----------
    // A lap swimmer, a floater on a lifebuoy ring, and a kid in armbands
    // going round and round at the shallow end (also 3 ft).
    const lap = route([[17, 6.2], [23, 6.2]], { speed: 0.9, loop: false });
    R.mover(lap, (ctx, t, p) => {
      const [X, Y] = P(p.x, p.y, WZ);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.7, 0.3, 0, 0, Math.PI * 2);
      ctx.strokeStyle = alpha(C.white, 0.8); ctx.lineWidth = 0.07; ctx.stroke();
      person(ctx, p.x, p.y, WZ - 0.8, { ...folk(81), hat: 'helmet', pose: 'swim', dir: p.dir, speed: 6 }, t);
    });
    const floater = orbit(20, 8.6, 2.4, 1.2, 70, 10);
    R.mover(floater, (ctx, t, p) => {
      const bob = Math.sin(t * 1.4) * 0.04;
      const z = WZ + 0.15 + bob;
      disc(ctx, p.x, p.y, z, 0.8, INK.funnelRed, { lw: 0.04 });
      if (Q.detail) for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        disc(ctx, p.x + Math.cos(a) * 0.6, p.y + Math.sin(a) * 0.6, z + 0.01, 0.16, C.white, { stroke: false });
      }
      disc(ctx, p.x, p.y, z + 0.01, 0.42, alpha(C.water, 1), { lw: 0.03 });
      const look = folk(86, { hat: 'sun', top: INK.sunYellow });
      person(ctx, p.x + 0.1, p.y + 0.1, z - 0.3, { ...look, skin: qz(look.skin, green(t, 118)), pose: 'sit', dir: 'r' }, t);
    });
    const splash = orbit(13.9, 8, 0.8, 1.7, 24, 3);
    R.mover(splash, (ctx, t, p) => {
      const z = WZ + Math.sin(t * 3) * 0.05;
      const [X, Y] = P(p.x, p.y, WZ);
      ctx.beginPath(); ctx.ellipse(X, Y, 0.55, 0.26, 0, 0, Math.PI * 2);
      ctx.strokeStyle = alpha(C.white, 0.8); ctx.lineWidth = 0.06; ctx.stroke();
      person(ctx, p.x, p.y, z - 0.55, {
        ...folk(90), scale: 0.72, hat: 'none', pose: 'swim', dir: p.dir, speed: 10,
        wear(c, b) { c.fillStyle = JACKET; for (const sx of [-0.3, 0.3]) { c.beginPath(); c.ellipse(sx, b.shoulderY + 0.12, 0.12, 0.09, 0, 0, Math.PI * 2); c.fill(); } },
      }, t);
    });
    // The ladder at the far end.
    R.thing(24.1, 8.4, (ctx) => {
      for (const ly of [7.8, 8.6]) face(ctx, [[23.8, ly, BED + 0.4], [23.8, ly, 1.1], [24.2, ly, 1.1]], null, { lw: 0.1, stroke: MAT.chrome });
      for (const z of [-0.2, 0.3]) face(ctx, [[23.8, 7.8, z], [23.8, 8.6, z]], null, { lw: 0.06, stroke: MAT.chrome });
    });

    // ---------- People round the deck ----------
    // The towel warden: patrols the loungers, straightens every towel, never
    // sits down. Not even on the iguana's.
    const warden = route([[17.9, 11.8, 2.5], [21.1, 11.8, 2], [24.6, 11.6, 3], [27.7, 11.8, 2], [30.9, 11.8, 2.5]], { speed: 0.8, loop: false, offset: 4 });
    const WARDEN = { skin: SKIN[5], hair: HAIR[4], style: 'curly', top: INK.flamingo, bottom: C.white, dress: true, hat: 'sun' };
    R.mover(warden, (ctx, t, p) => {
      const k = green(t, 132);
      person(ctx, p.x, p.y, 0, { ...WARDEN, skin: qz(WARDEN.skin, k), pose: p.moving ? 'walk' : 'point', dir: p.dir, back: false, speed: 5 }, t);
      if (!p.moving && Q.detail) speech(ctx, p.x, p.y, 3, Math.abs(p.x - 24.6) < 0.3 ? 'That one is taken.' : 'Taken.', { size: 0.4 });
    });
    // A waiter doing the rounds with a tray of Green Mermaids, the iguana's too.
    const waiter = route([[25.3, 3.8, 2], [25.3, 8.4], [25.1, 11.4, 2.5], [21, 11.7, 1.5], [25.1, 11.7]], { speed: 1.1, offset: 7 });
    R.mover(waiter, (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, {
        ...folk(95), ...CREW_LOOK, skin: SKIN[2], hair: HAIR[1], style: 'short',
        pose: p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back, arms: [1.5, 0.2], speed: 6,
        hold(c) {
          c.beginPath(); c.ellipse(0.3, -0.1, 0.42, 0.1, 0, 0, Math.PI * 2); paint(c, MAT.chrome, { lw: 0.025 });
          for (const gx of [0.08, 0.34, 0.56]) {
            c.beginPath(); c.moveTo(gx - 0.07, -0.44); c.lineTo(gx - 0.05, -0.12); c.lineTo(gx + 0.05, -0.12); c.lineTo(gx + 0.07, -0.44); c.closePath();
            paint(c, INK.queasyGreen, { lw: 0.02 });
          }
        },
      }, t);
    });
    // A kid in armbands with a water pistol, circling the hot tub.
    const kid = orbit(TUB.x, TUB.y, 2.6, 2.6, 11, 0);
    R.mover(kid, (ctx, t, p) => {
      person(ctx, p.x, p.y, 0, {
        ...folk(12), scale: 0.7, top: C.sky, bottom: C.coral, hat: 'cap', pose: 'run', dir: p.dir, back: p.back, speed: 12,
        wear(c, b) { c.fillStyle = JACKET; for (const sx of [-0.3, 0.3]) { c.beginPath(); c.ellipse(sx, b.shoulderY + 0.14, 0.12, 0.09, 0, 0, Math.PI * 2); c.fill(); } },
        hold(c) { c.fillStyle = INK.sunYellow; c.fillRect(0, -0.1, 0.3, 0.12); c.fillRect(0, 0, 0.08, 0.14); },
      }, t);
      // Squirts, at the soakers.
      if (!Q.detail || pulse(t, 2.2) > 0.35) return;
      const k = pulse(t, 2.2) / 0.35;
      const [A, B] = P(p.x, p.y, 1.1), [E, F] = P(TUB.x, TUB.y, 1.3);
      ctx.strokeStyle = alpha(C.white, 0.9); ctx.lineWidth = 0.06; ctx.setLineDash([0.12, 0.1]);
      ctx.beginPath(); ctx.moveTo(A, B); ctx.quadraticCurveTo((A + E) / 2, Math.min(B, F) - 0.8, A + (E - A) * k, B + (F - B) * k); ctx.stroke();
      ctx.setLineDash([]);
    }, { bias: 0.1 });
    // The sunbather who came up at 6 and found every lounger taken: on the
    // deck, on a towel, going pinker by the hour.
    R.thing(3.4, 3.4, (ctx, t) => {
      const k = clamp(wrap(t) / 200);
      const skin = mix(SKIN[5], C.coral, Math.round(k * 12) / 20);
      person(ctx, 3.4, 3.2, 0.05, { skin, hair: HAIR[3], style: 'long', top: C.teal, bottom: C.teal, pose: 'lie', dir: 'r', arms: [2.8, 0.3] }, t);
      if (Q.detail) {
        const [X, Y] = P(4.1, 3.3, 0.35);
        ctx.fillStyle = C.ink; ctx.fillRect(X - 0.1, Y - 0.06, 0.2, 0.06);
      }
    }, { anim: true });

    // A deckhand mopping the same stretch of deck all day, round a wet floor
    // sign, with a bucket that is only for mopping. Probably.
    R.thing(5.6, 5.5, (ctx) => {
      face(ctx, [[5.3, 5.3, 0], [5.9, 5.3, 0], [5.6, 5.4, 0.9]], INK.sunYellow, { lw: 0.03 });
      face(ctx, [[5.3, 5.5, 0], [5.9, 5.5, 0], [5.6, 5.4, 0.9]], shade(INK.sunYellow, 0.1), { lw: 0.03 });
      lettering(ctx, 'x', 5.6, 5.52, 0.35, 'WET', 0.13);
      bucket(ctx, 1.6, 5.9, 0, { color: C.sky });
    });
    const mop = route([[2.4, 6.1, 1.5], [9.4, 6.1, 1]], { speed: 0.6, loop: false, offset: 11 });
    R.mover(mop, (ctx, t, p) => {
      const sw = p.moving ? Math.sin(t * 5) * 0.35 : 0;
      person(ctx, p.x, p.y, 0, {
        ...folk(157), ...CREW_LOOK, skin: SKIN[4], hair: HAIR[6], style: 'short', hat: 'cap',
        pose: p.moving ? 'walk' : 'stand', dir: p.dir, back: p.back, arms: [0.9 + sw * 0.4, 0.7], speed: 4,
        hold(c) {
          c.beginPath(); c.moveTo(0, -0.4); c.lineTo(0.35 + sw, 1.05);
          c.strokeStyle = C.ink; c.lineWidth = 0.1; c.stroke();
          c.strokeStyle = MAT.teakDark; c.lineWidth = 0.05; c.stroke();
          c.beginPath(); c.ellipse(0.4 + sw, 1.1, 0.28, 0.1, 0, 0, Math.PI * 2); paint(c, C.greyLight, { lw: 0.025 });
        },
      }, t);
    });

    // ---------- The drill, 10am ----------
    // Passengers in life jackets drifting past Kelly, not listening: one
    // reading, one with a plate from the buffet, one with headphones on, and
    // one asleep on the deck in his.
    const drift = (t0, x0, x1, y, speed) => (t) => {
      const w = wrap(t), s = w - t0, len = Math.abs(x1 - x0);
      if (s < 0 || s > len / speed) return { x: x0, y, hidden: true };
      const x = x0 + Math.sign(x1 - x0) * s * speed;
      return { x, y, dir: x1 > x0 ? 'r' : 'l', a: edgeFade(x) };
    };
    const drill = [
      { at: drift(56, -0.6, 32.6, 4.7, 1.0), seed: 101, pose: 'read', look: { hat: 'sun' } },
      { at: drift(60, 32.6, -0.6, 12.05, 1.1), seed: 107, pose: 'walk', plate: true },
      { at: drift(70, 32.6, -0.6, 4.2, 1.1), seed: 113, pose: 'dance', look: { style: 'pony' }, phones: true },
    ];
    for (const d of drill) {
      const look = { ...folk(d.seed), ...(d.look || {}) };
      R.mover(d.at, (ctx, t, p) => {
        if (p.hidden) return;
        ctx.save();
        ctx.globalAlpha *= p.a;
        person(ctx, p.x, p.y, 0, {
          ...look, pose: d.pose === 'walk' ? 'walk' : d.pose, dir: p.dir, speed: d.pose === 'dance' ? 5 : 6, wear: jacket,
          arms: d.plate ? [1.3, 0.2] : undefined,
          hold: d.plate ? (c) => {
            c.beginPath(); c.ellipse(0.3, -0.12, 0.38, 0.1, 0, 0, Math.PI * 2); paint(c, C.white, { lw: 0.02 });
            c.beginPath(); c.ellipse(0.3, -0.24, 0.26, 0.16, 0, Math.PI, 0); paint(c, C.mustard, { lw: 0.02, dots: C.coral, density: 0.4 });
          } : undefined,
          face: d.phones ? (c, hy) => { c.beginPath(); c.arc(0.02, hy, 0.36, Math.PI * 1.1, Math.PI * 1.9); c.strokeStyle = C.ink; c.lineWidth = 0.06; c.stroke(); c.fillStyle = INK.funnelRed; c.fillRect(-0.08, hy - 0.08, 0.14, 0.2); } : undefined,
        }, t);
        ctx.restore();
      });
    }
    const sleeper = (t) => {
      const w = wrap(t);
      if (w < 50 || w > 101) return { x: 0, y: 4.4, hidden: true };
      if (w < 58) { const x = -0.6 + (w - 50) * 1.3; return { x, y: 4.4, dir: 'r', pose: 'walk', a: edgeFade(x) }; }
      if (w < 93) return { x: 9.8, y: 4.4, dir: 'r', pose: 'sleep', a: 1 };
      const x = 9.8 - (w - 93) * 1.3;
      return { x, y: 4.4, dir: 'l', pose: 'walk', a: edgeFade(x) };
    };
    const SLEEPY = folk(119, { top: C.purple, style: 'bald' });
    R.mover(sleeper, (ctx, t, p) => {
      if (p.hidden) return;
      ctx.save();
      ctx.globalAlpha *= p.a;
      person(ctx, p.x, p.y, 0.05, { ...SLEEPY, pose: p.pose, dir: p.dir, wear: jacket }, t);
      ctx.restore();
    });

    // The goose, at its muster station in its own little life jacket, facing
    // Kelly, the only passenger listening. It honks back when she calls.
    const gooseAt = (t) => {
      const w = wrap(t);
      const drillOn = w > 60 && w < 90;
      return { x: 15.5, y: 2.6, z: 0, dir: 'r', pose: drillOn && pulse(w, 5) < 0.14 ? 'honk' : 'stand' };
    };
    R.goose(gooseAt, { dir: 'r' });
    R.mover(gooseAt, (ctx, t, p) => {
      const [X, Y] = P(p.x, p.y, p.z);
      ctx.save();
      ctx.translate(X, Y);
      const by = -0.45;
      ctx.beginPath();
      ctx.ellipse(0.06, by + 0.02, 0.28, 0.21, -0.12, 0, Math.PI * 2);
      paint(ctx, JACKET, { lw: 0.03, dots: shade(JACKET, 0.4), density: 0.15 });
      ctx.beginPath();
      ctx.ellipse(0.25, by - 0.16, 0.12, 0.08, -0.7, 0, Math.PI * 2);
      paint(ctx, JACKET, { lw: 0.03 });
      if (Q.detail) {
        ctx.fillStyle = C.white;
        ctx.fillRect(-0.02, by - 0.17, 0.05, 0.38);
        ctx.fillRect(-0.2, by + 0.04, 0.5, 0.04);
      }
      ctx.restore();
    }, { bias: 0.02 });

    // ---------- The limbo, noon ----------
    // Two stands, a bar, and a boombox. The bar drops every round; four try,
    // one gets under, three knock it off, and at the end a gull walks under.
    R.thing(LIMBO.x, LIMBO.y0 + 0.1, (ctx) => limboStand(ctx, LIMBO.x, LIMBO.y0));
    R.thing(LIMBO.x, LIMBO.y1 + 0.1, (ctx) => limboStand(ctx, LIMBO.x, LIMBO.y1));
    const barAt = (w) => {
      // Which round, how far in, and whether the bar is down.
      for (let k = ROUNDS.length - 1; k >= 0; k--) {
        const s = w - ROUNDS[k];
        if (s >= 0) {
          if (k === ROUNDS.length - 1 && s >= 7) return w < 136 ? { h: 0.4 } : { h: HEIGHTS[0] };
          if (k > 0 && s >= 2.6 && s < 6.3) return { h: HEIGHTS[k], fall: clamp((s - 2.6) / 0.35) };
          return { h: HEIGHTS[k] };
        }
      }
      return { h: HEIGHTS[0] };
    };
    R.thing(LIMBO.x + 0.2, LIMBO.y1, (ctx, t) => {
      const b = barAt(wrap(t));
      const hA = b.h, hB = b.fall ? b.h * (1 - b.fall) + 0.05 * b.fall : b.h;
      const [A, B] = P(LIMBO.x, LIMBO.y0, hA), [E, F] = P(LIMBO.x, LIMBO.y1, hB);
      ctx.beginPath(); ctx.moveTo(A, B); ctx.lineTo(E, F);
      ctx.lineCap = 'round';
      ctx.strokeStyle = C.ink; ctx.lineWidth = 0.16; ctx.stroke();
      ctx.strokeStyle = INK.sunYellow; ctx.lineWidth = 0.1; ctx.stroke();
      if (Q.detail) {
        ctx.setLineDash([0.18, 0.18]);
        ctx.strokeStyle = INK.funnelRed; ctx.stroke();
        ctx.setLineDash([]);
      }
    }, { anim: true });
    // The boombox and its notes, at noon.
    R.thing(10.4, 10.4, (ctx, t) => {
      box(ctx, 9.9, 10.1, 0, 0.9, 0.35, 0.5, C.navy, { flat: true, lw: 0.03 });
      for (const dx of [0.2, 0.7]) {
        const [X, Y] = P(9.9 + dx, 10.45, 0.25);
        ctx.beginPath(); ctx.ellipse(X, Y, 0.14, 0.14, 0, 0, Math.PI * 2); paint(ctx, C.ink, { lw: 0.02 });
      }
      const w = wrap(t);
      if (w < 96 || w > 134 || !Q.detail) return;
      particles(t, 3, 2.2, (k, r) => note(ctx, 10.3 + k * 0.6 - r() * 0.5, 10.3 - k * 0.8, 0.8 + k * 1.6, alpha(C.ink, 1 - k), 0.8), 3);
    }, { anim: true });
    // The chalkboard, and the prize.
    R.thing(3.6, 6.7, (ctx) => {
      face(ctx, [[3.5, 5.6, 0], [3.5, 5.6, 1.6], [3.5, 6.6, 1.6], [3.5, 6.6, 0]], C.ink, { lw: 0.05 });
      face(ctx, [[3.52, 5.7, 0.5], [3.52, 5.7, 1.5], [3.52, 6.5, 1.5], [3.52, 6.5, 0.5]], C.navy, { stroke: false });
      lettering(ctx, 'y', 3.54, 6.1, 1.28, 'LIMBO AT NOON', 0.13, C.white);
      lettering(ctx, 'y', 3.54, 6.1, 1.05, 'PRIZE:', 0.12, INK.sunYellow);
      lettering(ctx, 'y', 3.54, 6.1, 0.85, 'A LOUNGER', 0.13, INK.sunYellow);
    });
    // The contestants: in from the waterslide, queue, lean, fail, watch.
    const LIMBOS = [
      { seed: 131, sick: null, look: { top: INK.sunYellow } },
      { seed: 137, sick: 110, look: { hat: 'party' } },
      { seed: 139, sick: 96, look: { dress: true, style: 'long' } },
      { seed: 149, sick: null, look: { top: C.coral, style: 'bald' } },
    ];
    LIMBOS.forEach((c, i) => {
      const look = { ...folk(c.seed), ...c.look };
      const spot = [10.8, 4.8 + i * 0.9];
      const q = (idx) => 6.6 - 1.1 * idx;
      const pos = (t) => {
        const w = wrap(t);
        if (w < 96 + i * 0.8 || w > 140) return { hidden: true, x: 0, y: LIMBO.lane };
        const S = ROUNDS[i];
        if (w < S) {
          // Walking in, then shuffling up the queue as each round starts.
          const walkIn = -0.6 + (w - 96 - i * 0.8) * 1.4;
          let done = 0;
          for (let k = 0; k < i; k++) if (w >= ROUNDS[k]) done = k + 1;
          let x = q(i - done);
          if (done > 0) x = q(i - done + 1) + (q(i - done) - q(i - done + 1)) * clamp((w - ROUNDS[done - 1]) / 0.8);
          const moving = walkIn < x || (done > 0 && w - ROUNDS[done - 1] < 0.8);
          return { x: Math.min(walkIn, x), y: LIMBO.lane, dir: 'r', pose: moving ? 'walk' : 'stand', a: edgeFade(Math.min(walkIn, x)) };
        }
        const s = w - S;
        const made = i === 0;
        if (s < 0.8) return { x: q(0) + (7.4 - q(0)) * (s / 0.8), y: LIMBO.lane, dir: 'r', pose: 'walk', lean: 0.3 * (s / 0.8) };
        if (s < 2.8) { const k = (s - 0.8) / 2; return { x: 7.4 + 1.2 * k, y: LIMBO.lane, dir: 'r', pose: 'walk', lean: 0.3 + (made ? 0.55 : 0.8) * k, slow: true }; }
        if (made && s < 4.2) { const k = (s - 2.8) / 1.4; return { x: 8.6 + 1.1 * k, y: LIMBO.lane, dir: 'r', pose: 'walk', lean: 0.85 * (1 - k), slow: true }; }
        if (!made && s < 5.2) return { x: 8.9, y: LIMBO.lane + 0.2, dir: 'r', pose: 'lie' };
        // To the spectators, then back out at 1pm.
        const from = made ? [9.7, LIMBO.lane] : [8.9, LIMBO.lane + 0.2];
        const t0 = S + (made ? 4.2 : 5.2);
        const k = clamp((w - t0) / 1.6);
        if (w < 133) return { x: from[0] + (spot[0] - from[0]) * k, y: from[1] + (spot[1] - from[1]) * k, dir: k < 1 ? 'r' : 'l', pose: k < 1 ? 'walk' : (made ? 'cheer' : 'stand') };
        const x = spot[0] - (w - 133) * 1.8;
        return { x, y: spot[1], dir: 'l', pose: 'walk', a: edgeFade(x) };
      };
      R.mover(pos, (ctx, t, p) => {
        if (p.hidden) return;
        const o = { ...look, skin: qz(look.skin, green(t, c.sick)), pose: p.pose, dir: p.dir, speed: p.slow ? 3 : 7 };
        ctx.save();
        if (p.a != null) ctx.globalAlpha *= p.a;
        if (p.lean) leaning(ctx, p.x, p.y, 0, p.lean, () => person(ctx, p.x, p.y, 0, { ...o, arms: [2.2, -2.2] }, t));
        else person(ctx, p.x, p.y, 0, o, t);
        ctx.restore();
      });
    });
    // The last round: the bar at knee height, and a gull strolls under it.
    R.mover((t) => {
      const w = wrap(t), k = (w - 130) / 4;
      return k < 0 || k > 1 ? { hidden: true, x: 7, y: 8.2 } : { x: 7 + k * 3.2, y: 8.2 };
    }, (ctx, t, p) => { if (!p.hidden) gull(ctx, p.x, p.y, 0, t, { dir: 'r', scale: 0.9 }); });

    // A gull overhead, circling the pool for chips.
    R.air((ctx, t) => {
      const p = orbit(18, 8, 7, 3.5, 23, 0)(t);
      gull(ctx, p.x, p.y, 7.5 + Math.sin(t * 0.8) * 0.4, t, { fly: true, dir: p.dir, phase: 1 });
    });

    // Chad's bar tab (it clears him): the long one, curled over the bar's edge.
    R.find({ id: 'bar-tab', label: "Chad's bar tab", at: [22.5, 2.6, 1.1], r: 0.8 });
  },
};

// Text painted flat on the deck, centred on (x, y).
function textFloor(ctx, x, y, text, size, color = alpha(C.navy, 0.75)) {
  if (!Q.detail) return;
  ctx.save();
  ctx.transform(1, 0.5, -1, 0.5, x - y, (x + y) / 2);
  const k = 40;
  ctx.scale(1 / k, 1 / k);
  ctx.font = `${size * k}px "Rethink Sans", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// A limbo stand: a weighted foot and a striped pole with pegs.
function limboStand(ctx, x, y) {
  disc(ctx, x, y, 0, 0.3, C.ink, { stroke: false });
  cylinder(ctx, x, y, 0, 0.06, 2.2, INK.funnelRed, { flat: true, top: C.white });
  if (!Q.detail) return;
  for (const z of [0.4, 0.8, 1.2, 1.6, 2]) {
    const [X, Y] = P(x, y, z);
    ctx.fillStyle = C.white; ctx.fillRect(X - 0.09, Y - 0.1, 0.18, 0.1);
  }
}
